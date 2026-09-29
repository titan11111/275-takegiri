# LEARNINGS — 275-takegiri

## 2026-09-28 音楽実装

- 置いてあった `Summit_at_Dawn.mp3`（192k・4.1MB・3分）を BGM にした。HTMLAudioElement でループし、WebAudio の gain で音量だけ握る（4MB級を decodeAudioData しない。237-iai-samurai と同じ経路）。
- 公開用は `audio/Summit_at_Dawn.m4a`（HE-AAC 64k・1.4MB）を本命、`audio/Summit_at_Dawn.mp3`（96k・2.1MB）をフォールバック。ルートの 192k 原盤は削除。
- 場面でダックする。タイトル 0.36／構え 0.28／斬り 0.07／リプレイ 0.42／判定 0.30（低得点はさらに下げる）。斬りの瞬間は効果音が主。
- ミュートは右上「音あり／無音」。`localStorage['tg.275.mute']`。自己ベストキー `takegiri-best` は未変更。
- 初回タップで unlock。裏に回ったら AudioContext.suspend と BGM pause、復帰で resume。音が作れなくてもゲームは止めない。
- three.js のフォールバックを `document.write` から script 要素＋待ちに替えた。
