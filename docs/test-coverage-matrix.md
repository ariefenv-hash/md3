# core 提取范式覆盖矩阵（#286）

> 本文件为**生成件**（单真源 = `scripts/test-coverage-matrix.mjs`，禁手改；check:docs-index / check:version 同律）。
> 再生：`node scripts/test-coverage-matrix.mjs`；校验：`node scripts/test-coverage-matrix.mjs --check`。
> 口径详见脚本头注；全量 window.__ 出口注册表属 #278 车道，本矩阵只取 `window.__xxxCore` 范式。

## 汇总

- 应用定义：**52**（iframe 41 / native 11）
- core 出口（`window.__*Core` 范式）：**29** 个，被 vitest 消费 **29** 个（覆盖率 100%）
- 应用档位：core-full **28** / core-gap **0** / ref-only **24** / zero-touch **0**（其中高频 P0 **0**）
- 测试文件：317 个（tests/*.test.js）

## 应用 × core × 测试触达矩阵

| 应用 | name | 形态 | iframe 目录 | core 出口 | 被消费 | tests 目录引用 | tests id 引用 | 档位 |
|---|---|---|---|---|---|---|---|---|
| messages | 信息 | iframe | messages | `chatbotCore`、`messagesRichCore` | 2/2 | 9 | 29 | core-full |
| mail | 邮件 | native | — | — | — | 0 | 3 | ref-only |
| photos | 相册 | iframe | photos | `photoCore` | 1/1 | 5 | 25 | core-full |
| settings | 设置 | native | — | `settingsCore` | 1/1 | 0 | 116 | core-full |
| clockApp | 时钟 | iframe | clock-app | `clockCore` | 1/1 | 20 | 2 | core-full |
| calendar | 日历 | iframe | calendar | — | — | 5 | 2 | ref-only |
| weather | 天气 | iframe | weather | `weatherCore` | 1/1 | 7 | 22 | core-full |
| music | 音乐 | iframe | music | `lyricCore` | 1/1 | 8 | 39 | core-full |
| calculator | 计算器 | iframe | calculator | `fxCore` | 1/1 | 5 | 19 | core-full |
| camera | 相机 | iframe | camera | — | — | 7 | 28 | ref-only |
| map | 地图 | native | — | — | — | 0 | 119 | ref-only |
| notes | 备忘录 | iframe | notes | — | — | 5 | 27 | ref-only |
| reminders | 提醒 | iframe | reminders | — | — | 5 | 13 | ref-only |
| health | Fit | native | — | — | — | 0 | 4 | ref-only |
| wallet | Google 钱包 | native | — | — | — | 0 | 1 | ref-only |
| appstore | 应用商店 | native | — | `asCatalogCore` | 1/1 | 0 | 4 | core-full |
| stocks | 股票 | iframe | stocks | — | — | 2 | 9 | ref-only |
| shortcuts | 快捷指令 | iframe | shortcuts | — | — | 1 | 13 | ref-only |
| threes | 小三传奇 | iframe | threes | — | — | 3 | 15 | ref-only |
| dice | 掷骰子 | iframe | dice | — | — | 4 | 15 | ref-only |
| flow11 | Flow 11 | iframe | flow11 | — | — | 2 | 12 | ref-only |
| safari | 浏览器 | iframe | safari | `safariCore` | 1/1 | 3 | 20 | core-full |
| phone | 电话 | iframe | phone | — | — | 2 | 29 | ref-only |
| facetime | Meet | native | — | — | — | 0 | 1 | ref-only |
| contacts | 通讯录 | iframe | contacts | — | — | 3 | 13 | ref-only |
| findmy | 查找我的设备 | native | — | — | — | 0 | 1 | ref-only |
| translate | 翻译 | iframe | translate | `translateCore` | 1/1 | 10 | 61 | core-full |
| game2048 | 2048 接龙 | iframe | game2048 | — | — | 3 | 17 | ref-only |
| books | 图书 | iframe | books | — | — | 1 | 11 | ref-only |
| files | 文件 | native | — | `filesCore` | 1/1 | 0 | 46 | core-full |
| recorder | 录音机 | native | — | — | — | 0 | 3 | ref-only |
| installer | 安装包 | native | — | — | — | 0 | 9 | ref-only |
| reaction | 反应力测试 | iframe | reaction | `rxCore` | 1/1 | 2 | 18 | core-full |
| word | 每日单词 | iframe | word | `wordCore` | 1/1 | 3 | 28 | core-full |
| terminal | 终端 | iframe | terminal | `terminalCore` | 1/1 | 9 | 37 | core-full |
| piano | 电子琴 | iframe | piano | `pianoCore` | 1/1 | 3 | 20 | core-full |
| bytebeat | ByteBeat | iframe | bytebeat | `bytebeatCore` | 1/1 | 4 | 17 | core-full |
| python | Python | iframe | python | `pythonCore` | 1/1 | 2 | 14 | core-full |
| ping | PING | iframe | ping | `pingCore` | 1/1 | 3 | 43 | core-full |
| codeEditor | 代码编辑器 | iframe | code-editor | `codeEditorCore` | 1/1 | 4 | 11 | core-full |
| midiPlayer | MIDI 播放器 | iframe | midi-player | `midiPlayerCore` | 1/1 | 6 | 13 | core-full |
| ocr | OCR 文字识别 | iframe | ocr | `ocrCore` | 1/1 | 4 | 24 | core-full |
| stt | 语音转文字 | iframe | stt | `sttCore` | 1/1 | 2 | 22 | core-full |
| radio | 收音机 | iframe | radio | `radioCore` | 1/1 | 3 | 26 | core-full |
| driving | 驾考题库 | iframe | driving | `drivingCore` | 1/1 | 3 | 23 | core-full |
| gravity | 重力沙盒 | iframe | gravity | `gravityCore` | 1/1 | 3 | 22 | core-full |
| drawcircle | 画圆挑战 | iframe | drawcircle | `drawCircleCore` | 1/1 | 2 | 15 | core-full |
| typing | 打字练习 | iframe | typing | `pingCore`、`typingCore`、`wordCore` | 3/3 | 3 | 27 | core-full |
| markdown | Markdown | iframe | markdown | — | — | 2 | 21 | ref-only |
| archive | 压缩解压 | iframe | archive | — | — | 1 | 19 | ref-only |
| pdf | PDF 阅读 | iframe | pdf | — | — | 1 | 18 | ref-only |
| chess | Chess | iframe | chess | `chessCore` | 1/1 | 6 | 33 | core-full |

## 共享层 core（零单应用归属，如实登记）

（无——全部 core 均有应用域归属）

## 零触达应用风险序（zero-touch · 补 core 提取候补）

（无——全部应用至少有 tests 引用或 core 提取）

## core ↔ 测试消费映射

| core | 宿主 | vitest 消费 |
|---|---|---|
| `asCatalogCore` | `ios-desktop/js/apps/appstore.js` | ✓（tests 提及） |
| `bytebeatCore` | `ios-desktop/apps/bytebeat/index.html`、`ios-desktop/js/bytebeat-core.js` | ✓（tests 提及） |
| `chatbotCore` | `ios-desktop/apps/messages/index.html`、`ios-desktop/js/chatbot-core.js` | ✓（tests 提及） |
| `chessCore` | `ios-desktop/apps/chess/index.html`、`ios-desktop/js/chess-core.js` | ✓（tests 提及） |
| `clockCore` | `ios-desktop/apps/clock-app/alarm.mjs`、`ios-desktop/apps/clock-app/app.mjs`、`ios-desktop/apps/clock-app/bedtime.mjs`、`ios-desktop/apps/clock-app/index.html`、`ios-desktop/apps/clock-app/stopwatch.mjs`、`ios-desktop/apps/clock-app/timer.mjs`、`ios-desktop/apps/clock-app/world.mjs`、`ios-desktop/js/clock-core.js`、`ios-desktop/js/clock-core.mjs` | ✓（tests 提及） |
| `codeEditorCore` | `ios-desktop/apps/code-editor/app.mjs`、`ios-desktop/js/code-editor-core.js` | ✓（tests 提及） |
| `drawCircleCore` | `ios-desktop/apps/drawcircle/core.js`、`ios-desktop/apps/drawcircle/index.html` | ✓（tests 提及） |
| `drivingCore` | `ios-desktop/apps/driving/index.html`、`ios-desktop/js/driving-core.js` | ✓（tests 提及） |
| `filesCore` | `ios-desktop/js/apps/files.js`、`ios-desktop/js/files-core.js` | ✓（tests 提及） |
| `fxCore` | `ios-desktop/apps/calculator/index.html`、`ios-desktop/js/fx-core.js` | ✓（tests 提及） |
| `gravityCore` | `ios-desktop/apps/gravity/core.js`、`ios-desktop/apps/gravity/index.html` | ✓（tests 提及） |
| `lyricCore` | `ios-desktop/apps/music/index.html`、`ios-desktop/apps/music/lyric-core.js` | ✓（tests 提及） |
| `messagesRichCore` | `ios-desktop/apps/messages/index.html`、`ios-desktop/js/messages-rich-core.js` | ✓（tests 提及） |
| `midiPlayerCore` | `ios-desktop/apps/midi-player/app.mjs`、`ios-desktop/js/midi-player-core.js` | ✓（tests 提及） |
| `ocrCore` | `ios-desktop/apps/ocr/app.mjs`、`ios-desktop/js/ocr-core.js` | ✓（tests 提及） |
| `photoCore` | `ios-desktop/apps/photos/core.js`、`ios-desktop/apps/photos/index.html` | ✓（tests 提及） |
| `pianoCore` | `ios-desktop/apps/piano/index.html`、`ios-desktop/js/piano-core.js` | ✓（tests 提及） |
| `pingCore` | `ios-desktop/apps/ping/index.html`、`ios-desktop/js/ping-core.js` | ✓（tests 提及） |
| `pythonCore` | `ios-desktop/apps/python/index.html`、`ios-desktop/js/python-core.js` | ✓（tests 提及） |
| `radioCore` | `ios-desktop/apps/radio/index.html`、`ios-desktop/js/radio-core.js` | ✓（tests 提及） |
| `rxCore` | `ios-desktop/apps/reaction/index.html` | ✓（tests 提及） |
| `safariCore` | `ios-desktop/apps/safari/core.js`、`ios-desktop/apps/safari/index.html` | ✓（tests 提及） |
| `settingsCore` | `ios-desktop/js/apps/settings.js`、`ios-desktop/js/settings-core.js` | ✓（tests 提及） |
| `sttCore` | `ios-desktop/apps/stt/index.html`、`ios-desktop/js/stt-core.js` | ✓（tests 提及） |
| `terminalCore` | `ios-desktop/apps/terminal/index.html`、`ios-desktop/js/terminal-core.js` | ✓（tests 提及） |
| `translateCore` | `ios-desktop/apps/translate/core.js`、`ios-desktop/apps/translate/index.html` | ✓（tests 提及） |
| `typingCore` | `ios-desktop/apps/typing/core.js`、`ios-desktop/apps/typing/index.html` | ✓（tests 提及） |
| `weatherCore` | `ios-desktop/apps/weather/core.js`、`ios-desktop/apps/weather/index.html` | ✓（tests 提及） |
| `wordCore` | `ios-desktop/apps/typing/index.html`、`ios-desktop/apps/word/index.html`、`ios-desktop/js/word-core.js` | ✓（tests 提及） |

## 档位口径

- `core-full`：应用域持有 core 出口且全部被 tests 提及（沙箱提取范式触达）；
- `core-gap`：持有 core 但存在零提及 core（触达有缺口）；
- `ref-only`：零 core 出口，但 tests 有 `apps/<dir>/` 或 app id 引用（audit H 项同口径）；
- `zero-touch`：零 core 零引用（audit H 项亦不达）；P0 = 高频集合（music/files/settings/messages，#286 原文口径），P1 = 其余。

