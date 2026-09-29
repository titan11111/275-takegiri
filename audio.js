/* 竹斬 — BGM(Summit_at_Dawn) + WebAudio SE。失敗してもゲームは止めない */
(function () {
  'use strict';
  var MUTE_KEY = 'tg.275.mute';
  var AC = null, NB = null, master = null, seGain = null, bgmGain = null;
  var bgmEl = null, bgmSrc = null, started = false, fileOk = false;
  var muted = false, scene = 'title', scoreHint = 0, offT = 0;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}

  var VOL = {
    title: 0.36, slate: 0.28, ready: 0.28, action: 0.07, replay: 0.42, verdict: 0.3
  };

  function live() { return !!(AC && !muted); }
  function targetVol() {
    var v = VOL[scene];
    if (v == null) v = 0.28;
    if (scene === 'verdict' && scoreHint < 50) v *= 0.72;
    return muted ? 0 : v;
  }

  function fadeBgm(to, sec) {
    if (!AC) return;
    var t = AC.currentTime, dest = Math.max(0.0001, to);
    if (bgmGain) {
      var cur = bgmGain.gain.value;
      if (!(cur > 0)) cur = 0.0001;
      bgmGain.gain.cancelScheduledValues(t);
      bgmGain.gain.setValueAtTime(cur, t);
      bgmGain.gain.linearRampToValueAtTime(dest, t + Math.max(0.05, sec));
    } else if (bgmEl) {
      try { bgmEl.volume = Math.min(1, to); } catch (e) {}
    }
  }

  function envG(g, t0, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dec);
  }

  function noise(t0, dur, type, f0, f1, peak, q) {
    if (!AC || !NB) return;
    var s = AC.createBufferSource(); s.buffer = NB;
    var f = AC.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur); f.Q.value = q || 1;
    var g = AC.createGain(); envG(g, t0, Math.min(0.02, dur * 0.3), peak, dur);
    s.connect(f); f.connect(g); g.connect(seGain); s.start(t0); s.stop(t0 + dur + 0.1);
  }

  function tone(t0, type, f0, f1, dur, peak) {
    if (!AC) return;
    var o = AC.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    var g = AC.createGain(); envG(g, t0, 0.005, peak, dur);
    o.connect(g); g.connect(seGain); o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function bgmInit() {
    if (!bgmEl) {
      bgmEl = document.getElementById('bgm');
      if (!bgmEl) return false;
      bgmEl.loop = true;
    }
    if (AC && !bgmGain) {
      try {
        bgmSrc = AC.createMediaElementSource(bgmEl);
        bgmGain = AC.createGain();
        bgmGain.gain.value = 0.0001;
        bgmSrc.connect(bgmGain);
        bgmGain.connect(master);
      } catch (e) {
        bgmSrc = null;
        bgmGain = null;
      }
    }
    return !!bgmEl;
  }

  function bgmStart() {
    if (muted || !bgmInit()) return;
    clearTimeout(offT);
    var p = bgmEl.play();
    if (p && p.then) p.then(function () { fileOk = true; }).catch(function () { fileOk = false; });
    fadeBgm(targetVol(), 1.2);
  }

  function bgmPause() {
    if (!bgmEl) return;
    fadeBgm(0, 0.28);
    clearTimeout(offT);
    offT = setTimeout(function () {
      if (bgmEl && (muted || document.hidden)) {
        try { bgmEl.pause(); } catch (e) {}
      }
    }, 320);
  }

  function applyMaster() {
    if (!master) return;
    master.gain.cancelScheduledValues(AC.currentTime);
    master.gain.setValueAtTime(muted ? 0.0001 : 1, AC.currentTime);
  }

  function syncBtn() {
    var b = document.getElementById('mute');
    if (!b) return;
    b.setAttribute('aria-pressed', muted ? 'true' : 'false');
    b.textContent = muted ? '無音' : '音あり';
  }

  function setMute(on) {
    muted = !!on;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    if (AC) applyMaster();
    if (muted) bgmPause();
    else { unlock(); bgmStart(); }
    syncBtn();
  }

  function unlock() {
    try {
      if (!AC) {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain();
        master.gain.value = muted ? 0.0001 : 1;
        master.connect(AC.destination);
        seGain = AC.createGain();
        seGain.gain.value = 0.9;
        seGain.connect(master);
        var len = AC.sampleRate;
        NB = AC.createBuffer(1, len, AC.sampleRate);
        var d = NB.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (AC.state === 'suspended') AC.resume();
      started = true;
      applyMaster();
      bgmInit();
      if (!muted) bgmStart();
    } catch (e) { AC = null; }
  }

  function setScene(name, score) {
    scene = name || scene;
    if (typeof score === 'number') scoreHint = score;
    if (!started || muted) return;
    fadeBgm(targetVol(), scene === 'action' ? 0.1 : 0.45);
    bgmStart();
  }

  var sfx = {
    whoosh: function (d, r) { if (!live()) return; noise(AC.currentTime, (d + 0.12) / r, 'bandpass', 500 * r, 3200 * r, 0.5, 1.2); },
    shing: function (r) { if (!live()) return; var t = AC.currentTime; tone(t, 'sine', 3100 * r, 2300 * r, 0.5 / r, 0.12); tone(t, 'triangle', 4400 * r, 3900 * r, 0.3 / r, 0.05); noise(t, 0.05 / r, 'highpass', 5000, 3000, 0.35); },
    kon: function (r) { if (!live()) return; var t = AC.currentTime; tone(t, 'triangle', 560 * r, 420 * r, 0.22 / r, 0.26); tone(t, 'sine', 280 * r, 220 * r, 0.3 / r, 0.16); },
    thud: function () { if (!live()) return; var t = AC.currentTime; tone(t, 'sine', 120, 50, 0.22, 0.28); noise(t, 0.08, 'lowpass', 600, 200, 0.18); },
    taiko: function () { if (!live()) return; var t = AC.currentTime; tone(t, 'sine', 90, 48, 0.6, 0.7); noise(t, 0.1, 'lowpass', 400, 120, 0.4); tone(t + 0.28, 'sine', 90, 48, 0.5, 0.45); },
    clap: function () { if (!live()) return; noise(AC.currentTime, 0.04, 'bandpass', 1800, 1400, 0.7, 2); },
    draw: function () {
      if (!live()) return;
      var t = AC.currentTime;
      noise(t, 0.55, 'bandpass', 2400, 5200, 0.13, 4);
      tone(t + 0.5, 'sine', 2900, 2650, 0.7, 0.05);
    },
    click: function (r) {
      if (!live()) return;
      var t = AC.currentTime;
      noise(t, 0.035, 'bandpass', 3600 * r, 3000 * r, 0.55, 3);
      tone(t, 'square', 1800 * r, 1500 * r, 0.04, 0.04);
    },
    kaguya: function (r) { if (!live()) return; var t = AC.currentTime; [1318.5, 1568, 1975.5, 2637].forEach(function (f, i) { tone(t + i * 0.09 / r, 'sine', f * r, f * r * 0.998, 1.2 / r, 0.07); }); noise(t, 0.8 / r, 'highpass', 6000, 9000, 0.05); }
  };
  Object.keys(sfx).forEach(function (k) {
    var f = sfx[k];
    sfx[k] = function () { try { f.apply(null, arguments); } catch (e) {} };
  });

  function bindMute() {
    var b = document.getElementById('mute');
    if (!b) return;
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      try { b.setPointerCapture(e.pointerId); } catch (err) {}
      unlock();
      setMute(!muted);
      try { if (navigator.vibrate) navigator.vibrate(14); } catch (err) {}
    });
    syncBtn();
  }

  document.addEventListener('pointerdown', function () { unlock(); }, { once: true });
  document.addEventListener('keydown', function () { unlock(); }, { once: true });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (AC) try { AC.suspend(); } catch (e) {}
      bgmPause();
    } else if (!muted) {
      if (AC) try { AC.resume(); } catch (e) {}
      bgmStart();
    }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindMute);
  else bindMute();

  window.TakegiriSound = {
    unlock: unlock,
    setMute: setMute,
    isMuted: function () { return muted; },
    setScene: setScene,
    sfx: sfx,
    scene: function () { return scene; },
    fileOk: function () { return fileOk; }
  };
})();
