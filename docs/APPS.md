<!-- docs/APPS.md — 应用清单真源（#285 生成件，scripts/gen-apps-doc.mjs 产物，禁手改） -->

# 应用清单（APPS.md）

> 真源：`ios-desktop/js/apps-data.js` 52 个 import 行尾注「用途：」（#296 清单级用途契约，`check:comments` 强检）——
> 本生成件为 #285「应用清单零真源」处置建议①的落地：应用名/一句话用途/形态/入口路径全量清单化。
> 对账闸：`npm run check:apps-doc`（--check 逐字节，单真源禁手改）；README 数字对账属 #267 车道（`check-readme-counts.mjs`）。

## 汇总对账

- 应用定义（注册表口径）：**52**（apps-data.js `from './apps/'` import 行，#267 同口径）
- 形态分布：iframe **41**（单文件自包含，`apps/<dir>/index.html`）+ native **11**（`js/apps/<file>.js` 定义）
- 三源对账：import 行 52 = 定义解析 52 = 表格行 52；iframeAppContent 引用 41 = apps/ 含 index.html 目录 41（#267 countIframeApps 口径）
- 「用途：」尾注：52 条非空且两两唯一（#296 契约，生成时强检，缺失/重复即红）
- 安装面口径（catalog.json，两口径分开列不混计）：外部站点（externals）**11**（#172 轻量壳）+ 演示安装包（apps）**1**（.mdapp 全链）

## 52 个应用定义（apps-data.js 顺序）

| # | id | 名称 | 用途（尾注） | 形态 | 入口 |
|---|---|---|---|---|---|
| 1 | msg | 信息 | 即时信息会话——消息收发/表情与回执 | iframe | apps/messages/index.html |
| 2 | mail | 邮件 | 邮件——收件箱浏览与信件阅读 | native | js/apps/mail.js |
| 3 | photo | 相册 | 相册——图库浏览与大图查看 | iframe | apps/photos/index.html |
| 4 | settings | 设置 | 系统设置中枢——多分区偏好管控 | native | js/apps/settings.js |
| 5 | clock_app | 时钟 | 时钟——闹钟管理与时间工具 | iframe | apps/clock-app/index.html |
| 6 | cal_app | 日历 | 日历——月历浏览与日程查看 | iframe | apps/calendar/index.html |
| 7 | weather | 天气 | 天气——城市检索与实况预报浏览 | iframe | apps/weather/index.html |
| 8 | music | 音乐 | 音乐播放——本地导入/歌词制作与播放控制 | iframe | apps/music/index.html |
| 9 | calculator | 计算器 | 计算器——算式求值与历史记录 | iframe | apps/calculator/index.html |
| 10 | camera | 相机 | 相机——WebRTC 取景拍摄 | iframe | apps/camera/index.html |
| 11 | map | 地图 | 地图——地图浏览与地点查看 | native | js/apps/map.js |
| 12 | notes | 备忘录 | 备忘录——速记与笔记管理 | iframe | apps/notes/index.html |
| 13 | reminders | 提醒 | 提醒事项——待办清单管理 | iframe | apps/reminders/index.html |
| 14 | health | Fit | 健身记录——活动数据概览 | native | js/apps/health.js |
| 15 | wallet | Google 钱包 | 钱包——票卡凭证聚合 | native | js/apps/wallet.js |
| 16 | appstore | 应用商店 | 应用市场——在线目录与应用安装 | native | js/apps/appstore.js |
| 17 | stocks | 股票 | 股票行情——列表检索与走势浏览 | iframe | apps/stocks/index.html |
| 18 | shortcuts | 快捷指令 | 指令卡片集管理与运行 | iframe | apps/shortcuts/index.html |
| 19 | threes | 小三传奇 | 数字滑块益智——配对合并 | iframe | apps/threes/index.html |
| 20 | dice | 掷骰子 | 多骰投掷与投掷历史 | iframe | apps/dice/index.html |
| 21 | flow11 | Flow 11 | 消除棋盘——莫奈莫兰迪配色玩法 | iframe | apps/flow11/index.html |
| 22 | safari | 浏览器 | 浏览器——网页访问与书签管理 | iframe | apps/safari/index.html |
| 23 | phone | 电话 | 电话——拨号盘与拨号操作 | iframe | apps/phone/index.html |
| 24 | facetime | Meet | 视频通话——Meet 会话入口 | native | js/apps/facetime.js |
| 25 | contacts | 通讯录 | 通讯录——联系人检索与详情 | iframe | apps/contacts/index.html |
| 26 | findmy | 查找我的设备 | 查找——设备定位视图 | native | js/apps/findmy.js |
| 27 | translate | 翻译 | 翻译——多语言互译 | iframe | apps/translate/index.html |
| 28 | game2048 | 2048 接龙 | 滑块拼图——同值合并冲高分 | iframe | apps/game2048/index.html |
| 29 | books | 图书 | 图书——电子书阅读与书架 | iframe | apps/books/index.html |
| 30 | files | 文件 | VFS 目录浏览与文件操作 | native | js/apps/files.js |
| 31 | recorder | 录音机 | 录音录制与回放管理 | native | js/apps/recorder.js |
| 32 | installer | 安装包 | 包导入安装与卸载托管 | native | js/apps/installer.js |
| 33 | reaction | 反应力测试 | 响应时长测量与最佳成绩 | iframe | apps/reaction/index.html |
| 34 | word | 每日单词 | 词库卡片翻转学习 | iframe | apps/word/index.html |
| 35 | terminal | 终端 | 命令行会话与虚拟文件系统操作 | iframe | apps/terminal/index.html |
| 36 | piano | 电子琴 | 键盘弹奏与录音回放 | iframe | apps/piano/index.html |
| 37 | bytebeat | ByteBeat | 表达式合成音频 | iframe | apps/bytebeat/index.html |
| 38 | python | Python | 浏览器内交互执行 | iframe | apps/python/index.html |
| 39 | ping | PING | 连通性探测与计时统计 | iframe | apps/ping/index.html |
| 40 | code-editor | 代码编辑器 | 代码编辑与联动运行 | iframe | apps/code-editor/index.html |
| 41 | midi-player | MIDI 播放器 | MIDI 播放与卷帘可视化 | iframe | apps/midi-player/index.html |
| 42 | ocr | OCR 文字识别 | 离线图片文本提取 | iframe | apps/ocr/index.html |
| 43 | stt | 语音转文字 | 实时听写转写 | iframe | apps/stt/index.html |
| 44 | radio | 收音机 | 电台检索与直播播放 | iframe | apps/radio/index.html |
| 45 | driving | 驾考题库 | 科目练习与刷题模式 | iframe | apps/driving/index.html |
| 46 | gravity | 重力沙盒 | 天体轨道物理演算 | iframe | apps/gravity/index.html |
| 47 | drawcircle | 画圆挑战 | 手绘圆精度评分 | iframe | apps/drawcircle/index.html |
| 48 | typing | 打字练习 | 打字练习与逐字比对 | iframe | apps/typing/index.html |
| 49 | markdown | Markdown | 编辑预览与文档互通 | iframe | apps/markdown/index.html |
| 50 | archive | 压缩解压 | zip 打包与解档 | iframe | apps/archive/index.html |
| 51 | pdf | PDF 阅读 | 文档阅读与全文搜索 | iframe | apps/pdf/index.html |
| 52 | chess | Chess | 规则对弈与 AI 对局 | iframe | apps/chess/index.html |

## 外部站点（catalog.json externals · #172 外部 Pages 项目轻量壳）

| # | id | 名称 | URL | 描述 |
|---|---|---|---|---|
| 1 | retro-player | RETRO PLAYER | https://ariefenv-hash.github.io/retro-music-player/ | 复古音乐播放器：逐字歌词 + Material You 取色（#172 实证 Pages 在线）。 |
| 2 | prism-tower | 棱镜回响 | https://ariefenv-hash.github.io/3d-tower-defense/ | 3D Roguelike 塔防「棱镜回响 · 星墨手卷」（#172 实证 Pages 在线）。 |
| 3 | geometric-traverse | 几何贯穿 | https://ariefenv-hash.github.io/geometric-traverse/ | 几何贯穿 · 视界重力：重力机制闯关（#172 实证 Pages 在线）。 |
| 4 | moyugang | 墨韵战纪 | https://ariefenv-hash.github.io/moyugang/?embed=1&perf=low | 水墨风火柴人武道：主线十章 50 折全通；#189 接入规格 —— 默认携带行云性能档与嵌入态参数。 |
| 5 | ink-martial | 墨痕武道 | https://ariefenv-hash.github.io/stickman-ink-roguelike/ | 水墨火柴人肉鸽动作游戏：#172 表内「用户最想接」之二，R115 窗实证 Pages 上线 HTTP 200 后入库。 |
| 6 | karaoke-lab | 逐字歌词工坊 | https://ariefenv-hash.github.io/Enjoy-music/ | MD3 逐字卡拉OK歌词工坊（R115 窗实证 Pages 在线 HTTP 200）。 |
| 7 | paper-tangram | 纸上几何 | https://ariefenv-hash.github.io/zhishangshenghua/ | 七巧板创意拼图（R115 窗实证 Pages 在线 HTTP 200）。 |
| 8 | gravity-matrix-3d | 几何贯穿 3D | https://ariefenv-hash.github.io/3d/ | 几何贯穿 3D · 引力矩阵：六向重力解谜，视界重力的 3D 变体（R115 窗实证 Pages 在线 HTTP 200）。 |
| 9 | draft-loop | 草稿轮回 | https://ariefenv-hash.github.io/caogaolunhui/ | 草稿轮回 · Draft Loop 火柴人小游戏（R115 窗实证 Pages 在线 HTTP 200）。 |
| 10 | around-world | 环游世界 | https://ariefenv-hash.github.io/kimi-mobile/ | AROUND THE WORLD · Three.js 四场景 3D 互动体验（R115 窗实证 Pages 在线 HTTP 200）。 |
| 11 | clock-pwa | 时钟 PWA | https://ariefenv-hash.github.io/clock-app/ | 闹钟 / 世界时钟 / 秒表 / 计时器轻拟物 PWA：内置 clock 应用近白纸，套娃补位（R115 窗实证 Pages 在线 HTTP 200）。 |

## 演示安装包（catalog.json apps · .mdapp 安装全链）

| # | id | 名称 | 包 | 描述 |
|---|---|---|---|---|
| 1 | com.demo.hello | 你好世界 | demo/hello-world.mdapp | 安装包功能演示：主题跟随 / 系统通知 / 文件持久化。市场「获取」直达全链真实安装（analyzeZipBlob 校验 + 权限确认 + 桌面上桌）。 |
