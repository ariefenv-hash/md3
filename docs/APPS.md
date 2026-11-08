# APPS.md — 内置应用清单（#285 · 生成件）

> 本文件由 `scripts/generate-apps-md.mjs` 生成，`npm run check:apps-md` 逐字节校验一致性——**禁手改**；
> 数据真源 = `ios-desktop/js/apps-data.js` import 行 + #296 用途尾注（「用途：」切分）+
> 定义文件 `id`/`name`/`iframeAppContent` 实扫 + `ios-desktop/apps/` 目录实数（#267 同口径）；
> 无时间戳，逐字节可重现。用途文案修订须改 apps-data.js 行尾注后 `npm run check:apps-md -- --write` 再生。

## 汇总（与 #267 README 计数对账同源）

| 指标 | 值 |
|---|---|
| 应用定义（apps-data.js import 行） | 52 |
| iframe 应用（apps/ 含 index.html 目录） | 41 |
| native 应用（无 iframe 实体） | 11 |
| 用途尾注覆盖（#296 注释契约联动水位） | 52/52 |

## 清单（apps-data.js import 行序 · 52 应用）

| # | id | 名称 | 定义文件 | 实体 | 用途（#296 尾注原文） |
|---|---|---|---|---|---|
| 1 | msg | 信息 | js/apps/messages.js | apps/messages/ | 即时信息会话——消息收发/表情与回执 |
| 2 | mail | 邮件 | js/apps/mail.js | native | 邮件——收件箱浏览与信件阅读 |
| 3 | photo | 相册 | js/apps/photos.js | apps/photos/ | 相册——图库浏览与大图查看 |
| 4 | settings | 设置 | js/apps/settings.js | native | 系统设置中枢——多分区偏好管控 |
| 5 | clock_app | 时钟 | js/apps/clock.js | apps/clock-app/ | 时钟——闹钟管理与时间工具 |
| 6 | cal_app | 日历 | js/apps/calendar.js | apps/calendar/ | 日历——月历浏览与日程查看 |
| 7 | weather | 天气 | js/apps/weather.js | apps/weather/ | 天气——城市检索与实况预报浏览 |
| 8 | music | 音乐 | js/apps/music.js | apps/music/ | 音乐播放——本地导入/歌词制作与播放控制 |
| 9 | calculator | 计算器 | js/apps/calculator.js | apps/calculator/ | 计算器——算式求值与历史记录 |
| 10 | camera | 相机 | js/apps/camera.js | apps/camera/ | 相机——WebRTC 取景拍摄 |
| 11 | map | 地图 | js/apps/map.js | native | 地图——地图浏览与地点查看 |
| 12 | notes | 备忘录 | js/apps/notes.js | apps/notes/ | 备忘录——速记与笔记管理 |
| 13 | reminders | 提醒 | js/apps/reminders.js | apps/reminders/ | 提醒事项——待办清单管理 |
| 14 | health | Fit | js/apps/health.js | native | 健身记录——活动数据概览 |
| 15 | wallet | Google 钱包 | js/apps/wallet.js | native | 钱包——票卡凭证聚合 |
| 16 | appstore | 应用商店 | js/apps/appstore.js | native | 应用市场——在线目录与应用安装 |
| 17 | stocks | 股票 | js/apps/stocks.js | apps/stocks/ | 股票行情——列表检索与走势浏览 |
| 18 | shortcuts | 快捷指令 | js/apps/shortcuts.js | apps/shortcuts/ | 指令卡片集管理与运行 |
| 19 | threes | 小三传奇 | js/apps/threes.js | apps/threes/ | 数字滑块益智——配对合并 |
| 20 | dice | 掷骰子 | js/apps/dice.js | apps/dice/ | 多骰投掷与投掷历史 |
| 21 | flow11 | Flow 11 | js/apps/flow11.js | apps/flow11/ | 消除棋盘——莫奈莫兰迪配色玩法 |
| 22 | safari | 浏览器 | js/apps/safari.js | apps/safari/ | 浏览器——网页访问与书签管理 |
| 23 | phone | 电话 | js/apps/phone.js | apps/phone/ | 电话——拨号盘与拨号操作 |
| 24 | facetime | Meet | js/apps/facetime.js | native | 视频通话——Meet 会话入口 |
| 25 | contacts | 通讯录 | js/apps/contacts.js | apps/contacts/ | 通讯录——联系人检索与详情 |
| 26 | findmy | 查找我的设备 | js/apps/findmy.js | native | 查找——设备定位视图 |
| 27 | translate | 翻译 | js/apps/translate.js | apps/translate/ | 翻译——多语言互译 |
| 28 | game2048 | 2048 接龙 | js/apps/game2048.js | apps/game2048/ | 滑块拼图——同值合并冲高分 |
| 29 | books | 图书 | js/apps/books.js | apps/books/ | 图书——电子书阅读与书架 |
| 30 | files | 文件 | js/apps/files.js | native | VFS 目录浏览与文件操作 |
| 31 | recorder | 录音机 | js/apps/recorder.js | native | 录音录制与回放管理 |
| 32 | installer | 安装包 | js/apps/installer.js | native | 包导入安装与卸载托管 |
| 33 | reaction | 反应力测试 | js/apps/reaction.js | apps/reaction/ | 响应时长测量与最佳成绩 |
| 34 | word | 每日单词 | js/apps/word.js | apps/word/ | 词库卡片翻转学习 |
| 35 | terminal | 终端 | js/apps/terminal.js | apps/terminal/ | 命令行会话与虚拟文件系统操作 |
| 36 | piano | 电子琴 | js/apps/piano.js | apps/piano/ | 键盘弹奏与录音回放 |
| 37 | bytebeat | ByteBeat | js/apps/bytebeat.js | apps/bytebeat/ | 表达式合成音频 |
| 38 | python | Python | js/apps/python.js | apps/python/ | 浏览器内交互执行 |
| 39 | ping | PING | js/apps/ping.js | apps/ping/ | 连通性探测与计时统计 |
| 40 | code-editor | 代码编辑器 | js/apps/code-editor.js | apps/code-editor/ | 代码编辑与联动运行 |
| 41 | midi-player | MIDI 播放器 | js/apps/midi-player.js | apps/midi-player/ | MIDI 播放与卷帘可视化 |
| 42 | ocr | OCR 文字识别 | js/apps/ocr.js | apps/ocr/ | 离线图片文本提取 |
| 43 | stt | 语音转文字 | js/apps/stt.js | apps/stt/ | 实时听写转写 |
| 44 | radio | 收音机 | js/apps/radio.js | apps/radio/ | 电台检索与直播播放 |
| 45 | driving | 驾考题库 | js/apps/driving.js | apps/driving/ | 科目练习与刷题模式 |
| 46 | gravity | 重力沙盒 | js/apps/gravity.js | apps/gravity/ | 天体轨道物理演算 |
| 47 | drawcircle | 画圆挑战 | js/apps/drawcircle.js | apps/drawcircle/ | 手绘圆精度评分 |
| 48 | typing | 打字练习 | js/apps/typing.js | apps/typing/ | 打字练习与逐字比对 |
| 49 | markdown | Markdown | js/apps/markdown.js | apps/markdown/ | 编辑预览与文档互通 |
| 50 | archive | 压缩解压 | js/apps/archive.js | apps/archive/ | zip 打包与解档 |
| 51 | pdf | PDF 阅读 | js/apps/pdf.js | apps/pdf/ | 文档阅读与全文搜索 |
| 52 | chess | Chess | js/apps/chess.js | apps/chess/ | 规则对弈与 AI 对局 |

> 对账：定义 52 = README 计数门（check-readme-counts.mjs #267）；iframe 41 = apps/ 目录实数；
> native 11 = 52 − 41（无 iframeAppContent 的定义如实登记）；
> 用途 52/52 全覆盖为 #296 注释契约联动水位——新增应用未写用途尾注即红（绝不编造）。
