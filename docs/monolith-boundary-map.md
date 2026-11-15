# 巨石文件职责边界图与渐进拆分准则（#284 审计卷）

- **卷别**：#284 审计卷（方案裁决卷形态，#291 裁决卷 3ab4b147 先例同律：规则 + 清单零施工）
- **窗别**：R150 窗 · 2026-11-10 06:00 槽 · Job 2933040 · 第 2 定时消息系列 · 认领帖 6752849167
- **数据真源**：`docs/audits/monolith-inventory.json`（生成件单真源）← `node scripts/gen-monolith-inventory.mjs`（再生）/ `--check`（逐字节校验）
- **本卷形态**：纯 docs + scripts 零滚版 v11.03 维持（零 js 运行时面零 tests 增量）；audit K 项接线 + tests 留后续批（§5 实施路线）

## §1 数据速览（v11.42 · #284 批 20 后现值）

issue #284 证据表行数为 v10.72 实测口径，本表以 v11.03 现值全量刷新、v11.07 批 2/v11.08 批 3/v11.10 批 4/v11.13 批 5/v11.14 批 6/v11.19 批 7/v11.20 批 8/v11.21 批 9/v11.22 批 10/v11.27 批 11/v11.28 批 12/v11.29 批 13/v11.30 批 14/v11.31 批 15/v11.38 批 16/v11.39 批 17/v11.40 批 18/v11.41 批 19/v11.42 批 20 后再刷（行数口径 = `split('\n')`；vendor 三巨体 three.module.js 53045 / cannon-es.js 13024 / phosphor style.css 4627 不在本卡范围——#280 另卡在案）：

| 文件 | 行数 | 段落 banner | 顶层/规则块盘点 | >3000 分档 |
| --- | --- | --- | --- | --- |
| ios-desktop/js/apps/settings.js | 4,137 | 1 | 顶层声明 1（const 1：settingsApp；#284 批 2/3/4/5/6/7/8/9/10/11/12/13/14/15 MODES+STATUSBAR+ACCOUNTS+SAFETY+APPS+NOTIF+SOUND+DISPLAY+A11Y+COLOR_MOTION+TEXT_READING+DALTONIZER+ABOUT+LOCATION 已迁出 §3.1——十三簇全迁出、`*_PAGE_SCRIPT` 内联常量清零；模板串内缩进函数不计口径见 §6） | **K-存量曝光**（豁免名单在册；4,137 仍超 3,000，缩行不退出防乒乓） |
| ios-desktop/apps/music/index.html | 2,414 | 5 | script 块 12（外链 9/内联 3，内联行首 function 7）；内联主逻辑段 1147–2161（约 1,015 行）——批 16 歌词双簇迁出至 lyric-views.js（474 行单源，ESM 直连+桥混合形态） | ok（距阈值余量 586 行，批 16 减重 +413） |
| ios-desktop/css/pull-panels.css | 2,576 | 19 | 规则块 280 | ok |
| ios-desktop/js/app-window.js | 2,506 | 8 | 顶层声明 33（function 21/const 2/let 10） | ok |
| ios-desktop/js/quick-settings.js | 1,467 | 4 | 顶层声明 24（function 14/const 2/let 8/class 0，生成件 counts 口径）；批 17 三表 + 批 18 调色板簇迁 qs-tiles.js + 批 19 分页接线簇迁 qs-pages.js + 批 20 磁贴底部面板簇迁 qs-sheets.js + 批 21 zen/电池簇迁 qs-zen.js + 批 22 磁贴编辑界面簇迁 qs-edit.js（§3.5 表第三/五/七/八行新模块） | ok |
| ios-desktop/js/recent-apps.js | 2,062 | 3 | 顶层声明 75（function 43/const 2/let 30） | ok |

六件合计 15,167 行（生成件唯一真源 `monolith-inventory.json totals.lines=15167`；v11.46 #284 批 22 后再刷：批 22 quick-settings −282（磁贴编辑界面簇 289 行迁新模块 js/qs-edit.js，宿主胶水 +5 访问器/import 回接 −editHistory −4 注释+export 两态改写）；批 21 −117（zen/电池簇 121 行迁 js/qs-zen.js）；批 20 −258（磁贴底部面板簇迁 qs-sheets.js）；批 20 quick-settings −258（磁贴底部面板簇迁新模块 js/qs-sheets.js，六件口径不含新模块）；批 19 −64；批 18 −32；批 16 时点本行 15,954 如实留痕）。行数列随本卷全量校正：settings 4,121→4,137 / pull-panels 2,601→2,576 / app-window 2,474→2,506 / quick-settings 2,249→2,211（批 16 随生成件校至 2,259，批 17 磁贴注册表三表迁出后 −48）四行漂移系 v11.32–v11.37 批间演进未随刷（批 3 教训复现：登记面以生成器再生值为准不认脑算），本卷一并如实登记。对比 issue 证据表（v10.72）：settings 5,988→4,137、music 2,818→2,414（批 16 歌词双簇迁出）、pull-panels 2,601→2,576、app-window 2,314→2,506（**+192，增速最快**）、quick-settings 2,204→1,866、recent-apps 2,062→2,062（持平）——app-window 为增长风险位；music 跨阈风险解除（余量 586 行）。

## §2 渐进拆分准则（立卡八条）

issue 处置建议 1 明文**不做一次性大重构**（#215 files 一次性大重构是特例批文），本准则把「每轮顺手抽一个独立子模块」制度化为八条，后续每一拆分卷按此对账：

- **G1 一次一簇**：每窗至多抽离一个独立子模块；常量/纯函数簇先行，DOM 桥/事件监听/渲染循环留宿主——#286 core 提取范式同律（测的即运行真身非孤立副本，随机源/LS/VFS/DOM 留 host）。
- **G2 单源桥接**：抽出的簇经唯一通道消费（iframe 应用 `window.__xxxCore` 范式 / js 层核走 vite bundle），禁止新旧双轨并存——#271「同名三对实现并存」教训在录，双轨即新巨石。
- **G3 同名测试随迁**：抽离簇的既有测试（若有）随迁或演进重锚（退役断言留 APP 侧、实现断言走 core 真身，v286 P1 键集扩展先例）；先前零测试的簇借抽离补真身测试面（installer 第十三批 AA 组先例）。
- **G4 读闸先行**：动工者按 #265「读完再动手」完成目标簇阅读清单与锚点制——巨石拆分的「读完」成本被 G1 限制在单簇范围，不因巨石放大。
- **G5 冲突避让**：同槽多实例不碰同一巨石；认领帖 lane 精确到「文件 + 簇」粒度（#234 并行冲突面实录；§7.6 时序判定兜底）。
- **G6 门禁等强**：拆分后 vitest 全量 + 十静态闸 + 生成件三件（矩阵/globals/keymap）随树再生 `--check` 零漂移 + build/e2e 长尾——拆分卷门禁与 core 提取卷等强，不许降配。
- **G7 密度红线**：抽出的核走 V1 密度复评（game2048/flow11 演进重评先例：结构性跌破走 v312/v314 登记通道如实账，不硬凑密度）。
- **G8 版本滚版**：拆分卷一律滚版（代码面变更，v11.04 起）；同槽共号零重滚 §7.6① 先例适用；与 core 提取批/#291 分诊批异槽（G5 的窗级展开）。

## §3 六文件职责边界图

> 段落行号与簇名取自生成件 JSON（现值）；「未来模块」为拆分锚建议，终审权留用户（issue 处置建议 2）。

### 3.1 settings.js（4,137 行 · K-存量曝光 · 1 banner · #284 批 2/3/4/5/6/7/8/9/10/11/12/13/14/15 后现值；行数列 v11.38 随生成件校正 4,121→4,137，系 v11.32–v11.37 批间演进未随刷；banner 口径沿用勘误后权威口径：monolith-inventory banners.length 批 15 后=1（文件头）——批 14 ABOUT 簇迁出后 3→2，批 15 LOCATION 簇（==== 形态 banner）迁出后 2→1=仅余文件头）

**现状结构两段（批 15 后 PAGE_SCRIPT 内联段清零）**：①头部工具与状态（1–227，含批 7/8/9/10/11/12/13/14/15 import 桥接组二十七行）②`settingsApp` 主体（243–4121，约 3,878 行：pages 声明 HTML 模板串 + 渲染框架/路由/双栏/搜索过滤）——原②「1 个 `*_PAGE_SCRIPT` 子页内联脚本常量」段已随批 15 LOCATION 簇迁出清零（#284 批 2 MODES、批 3 STATUSBAR、批 4 ACCOUNTS、批 5 SAFETY、批 6 APPS、批 7 NOTIF、批 8 SOUND、批 9 DISPLAY、批 10 A11Y、批 11 COLOR_MOTION、批 12 TEXT_READING、批 13 DALTONIZER、批 14 ABOUT、批 15 LOCATION 十三簇全迁出至 settings-pages/ 单源）。

| 簇（行号） | 现状 | 未来模块 |
| --- | --- | --- |
| ~~NOTIF_PAGE_SCRIPT~~（原 214） | 页 19 通知（v8.01 #10 四期） | ✅ **已迁 settings-pages/notif.js**（#284 批 7 v11.19 · 174 行 export 单源真身，同款范式；考证链头注随簇走，簇模板串零 `${` 插值自包含 IIFE 实证，桥接全走 window.* 宿主面迁移零委托行） |
| ~~SOUND_PAGE_SCRIPT~~（原 227） | 页 4 提示音和振动（v8.03 sound_settings.xml 1:1） | ✅ **已迁 settings-pages/sound.js**（#284 批 8 v11.20 · 218 行 export 单源真身（簇块 204=考证链 7+模板串 197），R158 续点候选首位；考证链头注逐字随簇走，簇模板串零 `${` 插值自包含 IIFE 实证，簇体零 __settingsCore./__mdEscape( 委托——A2/A3 壳层基线与 v286 C2 计数零触碰） |
| ~~DISPLAY_PAGE_SCRIPT~~（原 425） | 页 1 显示与亮度（v8.04 #23 差距矩阵②） | ✅ **已迁 settings-pages/display.js**（#284 批 9 v11.21 加餐卷 · 205 行 export 单源真身（簇块 189），R159 续点候选首位；簇模板串零 `${` 插值自包含 IIFE 实证；簇体含 1 处 __settingsCore.timeoutSummaryFrom 委托——v286 C2 读取面三源合计守恒（settings.js+notif.js+display.js） |
| DISPLAY_PAGE_SCRIPT（224，v11.20 现树实测） | 显示 | settings-pages/display.js |
| ~~A11Y_PAGE_SCRIPT~~（原 228） | 无障碍（v8.02 #10 五期） | ✅ **已迁 settings-pages/a11y.js**（#284 批 10 v11.22 加餐卷二 · 96 行 export 单源真身（簇块 82=头注考证链 9+模板串 71），R159 续点候选首位；头注考证链 9 行逐字随簇走（含极暗 CSS filter 超越点注记），零 `${` 插值自包含 IIFE；簇体零 __settingsCore./__mdEscape( 委托——A2/A3/v286 C2 全零触碰；全库测试零簇体独占串引用实证，随迁面=G2 四锚最小卷；v105-F5 DEFAULTS 计数读取面合计守恒） |
| ~~COLOR_MOTION_PAGE_SCRIPT~~（原 229） | 页 32 色彩和动画（v11.07 #105 一期） | ✅ **已迁 settings-pages/color-motion.js**（#284 批 11 v11.27 · 65 行 export 单源真身（簇块 64=考证链 7+const 1+模板串 54+闭合 1），R163 续点候选首位；考证链头注逐字随簇走，簇模板串零 `${` 插值自包含 IIFE 实证；簇体零 __settingsCore./__mdEscape( 委托——A2/A3 壳层基线与 v286 C2 读取面计数零触碰；__settingsA11yStore 幂等守卫双定义之二 definer 随簇走；a11y-settings F5 读取面守恒扩展+G2 四锚最小随迁卷） |
| ~~ABOUT_PAGE_SCRIPT~~（原 512） | 页 21/22/23 关于手机/型号/Android 版本（v8.26 #48） | ✅ **已迁 settings-pages/about.js**（#284 批 14 v11.30 · 308 行 export 单源真身（簇块 307=考证链 47+const 1+模板串 257+闭合 1），§7.5 加餐卷三；考证链 47 行逐字随簇走，零 `${` 插值自包含 IIFE 实证；**簇体含 2 处 __settingsCore.dHash/fmtUptime 委托——v286 C2 读取面 +ABOUT_PAGE_SRC 四源合计守恒**（批 9 同款）；about-device.test.js describe①/②③ 簇体切片三处切源改读单源真身+宿主面零触碰+G2 四锚尾挂） |
| ~~DALTONIZER_PAGE_SCRIPT~~（原 295） | 页 34 色彩校正（v11.07 #105 一期） | ✅ **已迁 settings-pages/daltonizer.js**（#284 批 13 v11.29 · 86 行 export 单源真身（簇块 85=考证链 8+const 1+模板串 74+闭合 1），§7.5 加餐卷二；考证链头注逐字随簇走，簇模板串零 `${` 插值自包含 IIFE 实证；簇体零 __settingsCore./__mdEscape( 委托——A2/A3 壳层基线与 v286 C2 读取面计数零触碰；__settingsA11yStore 幂等守卫双定义之四 definer 随簇走；a11y-settings F5 读取面守恒再扩展+G2 四锚最小随迁卷+F4 混面断言归源分流） |
| ~~TEXT_READING_PAGE_SCRIPT~~（原 320） | 页 33 显示大小和文字（v11.07 #105 一期） | ✅ **已迁 settings-pages/text-reading.js**（#284 批 12 v11.28 · 92 行 export 单源真身（簇块 91=考证链 8+const 1+模板串 80+闭合 1），§7.5 加餐卷；考证链头注逐字随簇走，簇模板串零 `${` 插值自包含 IIFE 实证；簇体零 __settingsCore./__mdEscape( 委托——A2/A3 壳层基线与 v286 C2 读取面计数零触碰；__settingsA11yStore 幂等守卫双定义之三 definer 随簇走；a11y-settings F5 读取面守恒扩展+G2 四锚最小随迁卷） |
| ~~LOCATION_PAGE_SCRIPT~~（原 276=const 行号口径） | 页 24/25/26 位置信息三页（v8.29 #22⑦；已消费 __settingsCore.relTime/fmtAppPermSummary） | ✅ **已迁 settings-pages/location.js**（#284 批 15 v11.31 · 127 行 export 单源真身（簇块 110=banner 1+考证链 38+const 1+模板串 69+闭合 1），settings.js 末簇收官卷；考证链 38 行逐字随簇走，零 `${` 插值自包含 IIFE 实证；**簇体含 2 处 __settingsCore.relTime/fmtAppPermSummary 委托——v286 C2 读取面 +LOCATION_PAGE_SRC 五源合计守恒**（批 9/14 同款）；location-settings.test.js describe①②⑥ 三处切源改读单源真身+宿主面 describe③④⑤ 切片锚零触碰+G2 四锚尾挂） |
| ~~MODES_PAGE_SCRIPT~~（原 1520） | 页 27 模式（v8.30 #22③） | ✅ **已迁 settings-pages/modes.js**（#284 批 2 v11.07 · 55 行 export 单源真身，settings.js import 消费 G2 零双轨） |
| ~~STATUSBAR_PAGE_SCRIPT~~（原 1549） | 页 31 状态栏（v9.95 #89） | ✅ **已迁 settings-pages/statusbar.js**（#284 批 3 v11.08 · 66 行 export 单源真身，同款范式；SB_SLOTS 插槽表/SB_SLOT_ORDER 同源语义随簇保持） |
| ~~ACCOUNTS_PAGE_SCRIPT~~（原 1567） | 页 30 密码/通行密钥/账号（v8.33 #22⑨） | ✅ **已迁 settings-pages/accounts.js**（#284 批 4 v11.10 · 136 行 export 单源真身，同款范式；考证链头注随簇走，簇模板串 __settingsCore 零引用实证） |
| SAFETY_PAGE_SCRIPT（原 1538） | 页 28 安全和隐私（v8.31 #22⑤⑥；v11.03 #210 PIN 转正） | ✅ **已迁 settings-pages/safety.js**（#284 批 5 v11.13 · 147 行 export 单源真身，同款范式；考证链头注随簇走，簇模板串零 `${` 插值自包含 IIFE 实证，幂等守卫 window.__settingsSafetyV831 随簇走） |
| APPS_PAGE_SCRIPT（原 1525） | 页 6 应用（v8.05 #23 apps.xml 1:1） | ✅ **已迁 settings-pages/apps.js**（#284 批 6 v11.14 · 239 行 export 单源真身，同款范式；考证链头注随簇走，簇模板串零 `${` 插值自包含 IIFE 实证，桥接全走 window.* 宿主面迁移零委托行） |
| settingsApp 主体（243–4121） | pages 声明 + 框架/路由/双栏/搜索 | settings-shell.js（框架）+ settings-pages/index.js（页注册表） |

**拆分风险注记**：PAGE_SCRIPT 间零共享状态是天然模块边界（收益最大的首选拆分对象）；settingsApp.pages HTML 模板串与 PAGE_SCRIPT 的耦合点是页 id 命名约定（迁移须逐页对照 id）；已提核 `__settingsCore`（isConvo/lockSummary/timeoutSummaryFrom/relTime/fmtAppPermSummary 等）消费链分布在 LOCATION/ACCOUNTS 等页，迁移时委托行随页走（G2 单源桥接）。

### 3.2 music/index.html（2,414 行 · ok · 批 16 减重后余量 586 行）

**现状结构（v11.38 批 16 后）**：12 个 script 块 = 外链 9（freeze-shim / a11y / sanitize / **lyric-core.js（#286 先例单源核）** / audio-core / m3e-mini / m3e-pull / stretch / idle-slider）+ 内联 3 段（1147–2161 主逻辑约 1,015 行；2162–2389 module 段；2395–2411 尾段）。

| 簇 | 现状 | 未来模块 |
| --- | --- | --- |
| 歌词制作编辑器 | ✅ **已迁 apps/music/lyric-views.js**（#284 批 16 v11.38 · initLyricMaker/openLyricMaker/closeLyricMaker + window.__lyricMakerUI e2e 桥随簇，首参注入 app；#251 IA 方案卡联动面） | 沿 lyric-core 先例抽 js/ 级核（G1/G2）——已兑现 |
| 歌词滚动渲染 | ✅ **已迁 lyric-views.js**（#284 批 16 v11.38 · prepareLyricsUI/toggleLyricsPanel/renderLyrics/updateLyricsHighlight，#173 逐字卡拉OK 消费端） | 同上，随簇走——已兑现 |
| 播放器 UI 绑定 + 媒体会话桥 | ✅ 留宿主（constructor dom map/initEventListeners/boot 消息协议/module 段三桥零触碰） | 留宿主（DOM/媒体桥不动）——维持 |

**批 16 消费形态**：混合形态（#286 三形态学）——宿主 module 块 `import ... from './lyric-views.js'` 挂 `window.__lyricViews` 桥（defer 先于 DOMContentLoaded，构造期必然就绪）+ tests ESM 直连（lyric-views-single-source.test.js 行为锚 + lyric-merge.test.js 归源分流）；宿主委托行 7 条可选链守卫（桥缺位静默降级 = 打轴核缺位防御同律）。宿主全局依赖跨脚本 bare 解析：saveMusicPrefs / fsReadTextSafe（classic 主脚本顶层函数声明 → global object 属性，头注登记在档）。

**风险注记**：与 audio-core/m3e-pull/stretch 共享 DOM 结构约定（data-stretch=".track-list" 等）；批 16 减重后阈值余量 586 行——#251 歌词制作 IA 落地扩容的承接面已预置（新簇沿 lyric-views.js 消费形态追加，宿主不再膨胀）；K 项增量拦截口径转入 app-window（+192 增速）。

### 3.3 pull-panels.css（2,576 行 · ok · 19 banner / 280 规则块）

| 段（行号） | 簇 | 未来模块 |
| --- | --- | --- |
| 1 / 57 / 164 / 209 / 1209 / 1879 | Shade 域（统一 Shade/CollapsedShadeHeader/QQS/通知中心/Dual Shade） | shade.css |
| 293 / 452 / 552 / 580 / 702 / 1493 / 2492 | QS 磁贴域（滑条/网格/禁用受管/可调尺寸/变换面板/编辑界面/分页布局） | qs-tiles.css |
| 1081 | QS 媒体卡 | qs-media.css |
| 1651 | 电源菜单 GlobalActionsDialog（#113） | power-menu.css |
| 2139 | 音量对话框（volume_dialog.xml 1:1） | volume.css |
| 1834 / 2023 | 面板入场编排 + 模式弹层 | panels-motion.css / panels-dialog.css |

**风险注记**：CSS 拆分须保级联顺序与 @media 计数锚（v105-D @media 计数锚先例——拆分后计数变化须重锚）+ check:dist-parity 全过；段落间有共享 token（--md-* 变量），token 层不拆。

### 3.4 app-window.js（2,506 行 · ok · 8 banner · **增速最快 +192 行**；行数列 v11.38 随生成件校正 2,474→2,506）

| 段（行号） | 簇 | 未来模块 |
| --- | --- | --- |
| 62 | 过渡引擎同步（#75 §四.3） | app-window-transitions.js |
| 404 | 手势期渲染合帧（rAF 节流） | 留宿主（渲染循环紧耦合） |
| 540 | 统一多应用物理渲染循环 | app-window-physics.js（弹簧/量化数学，纯逻辑） |
| 749 | #225 P0 根壳开窗动画看门狗 | app-window-watchdog.js |
| 1109 | 「指哪打哪」高精度动态坐标校准 | app-window-calibration.js |
| 1229–2308 | 应用打开/关闭与并发流转（含 actor 租约看门狗） | 留宿主（状态机主体） |
| 2309 | 全局高优先级触控调度分发器 | app-window-dispatcher.js |

**风险注记**：物理/量化簇（quantSubPage/WeakMap 键控）与渲染循环共享类型约定；#225 看门狗已有独立测试面（v225 锚）——按 G3 随迁；e2e 全链（v199 三落点/v225 开窗/v7.57 多开）是拆分回归护栏。

### 3.5 quick-settings.js（1,467 行 · ok · 4 banner；行数列批 20 面板簇迁出后 1,866 / 批 21 zen/电池簇迁出后 1,749 / 批 22 编辑界面簇迁出后 1,467）

| 段（行号） | 簇 | 未来模块 |
| --- | --- | --- |
| 52–141 | 默认磁贴表 + 环境依赖磁贴（cast/quick_share/vpn/internet/torch） | ✅ **已迁 qs-tiles.js**（#284 批 17 v11.39 · DEFAULT_ACTIVE_TILES 19 贴/DEFAULT_AVAILABLE_CATEGORIES 双分类编辑池/ENV_DEPENDENT_TILES 五贴 ≈60 行 const→export 唯一差异逐字节保真；init 浅拷贝/reset 深拷贝/广播循环消费点零改动；TILE_LONG_CLICK_SHEET 宿主函数引用与 mdTilePalette DOM 耦合留宿主异批）——G1 表先行样例兑现 |
| 142–301 | mdTilePalette 磁贴调色板 | ✅ **已迁 qs-tiles.js**（#284 批 18 v11.40 · L92-122 31 行 function→export 唯一差异逐字节保真；消费点 renderQuickSettingsGrid/refreshTilePill 双路径经 import 零改动；argb 依赖随迁 import 且宿主 import 面收窄；DOM 读防御性 try/catch→null 章程注记随迁在录）——表次行兑现 |
| 302–653 | v9.94 #203 PagedTileLayout 分页联动 | ✅ **已迁 qs-pages.js 新模块**（#284 批 19 v11.41 · 簇体 61 行逐字节保真，唯一语义差异 = bindQsPageChrome 加 export；恢复页模块态 qsRestorePage 单源留新文件，宿主 render 读写经 get/setQsRestorePage 访问器委托（胶水 2 行）；宿主转出口 export { syncQsPagedViewport } 保 pull-down-gesture 动态 import 链零断裂；纯逻辑单源仍在 aosp/qs-paged-layout.js 不动）——表第三行兑现 |
| 654–1012 | v7.82 两态动画 + 磁贴动作 + 手电/录屏/隐私指示/DND | qs-actions.js |
| 1013–1226 | v9.94 #198 ZenDeviceEffects + ScheduleCalendar 规则 eval + 电池节省 | ✅ **已迁 qs-zen.js 新模块**（#284 批 21 v11.45 · 簇体 121 行逐字节保真（现树 888–1008：applyZenDeviceEffects/zenEvalRulesTick/__zenDebug 观测桥/DND_SET·DND_GET 宿主消息面/BATTERY_SAVER_KEY+setBatterySaverActive+restoreBatterySaverState），唯一语义差异 = applyZenDeviceEffects/zenEvalRulesTick 加 export；宿主三调用点（init 存档恢复/60s tick 接线/applyDndEffective 生效面）import 回接 + setBatterySaverActive/restoreBatterySaverState 转出口公共面零变化（widget-board import/settings-battery 动态 import 同链）+ applyDndEffective 补 export 桥接面 + 宿主 zen-mode import 面收窄（deviceEffectsOverlayStyle/ZEN_DEVICE_EFFECT 零宿主消费随簇走）；DND 状态机段（setDndActive/setDndExternalSource/applyDndEffective）留宿主待 qs-actions 车道）——表第五行兑现 |
| 1227–1476 | 亮度滑条 + 媒体卡 | 留宿主（DOM 紧耦合） |
| 1477–1734 | v7.62 磁贴底部面板（设备/网络/模式清单 sheet） | ✅ **已迁 qs-sheets.js 新模块**（#284 批 20 v11.42 · 簇体 257 行逐字节保真，唯一语义差异 = open*Sheet 三函数加 export；宿主共享态/函数经 ESM 循环 import 活绑定消费（activeTiles/TILE_LONG_CLICK_SHEET/refreshTilePill/handleTileAction/notifyTilesChanged/setDndActive/showSystemToast 七名宿主补 export 桥接面），qs-sheets 顶层零绑定消费无 TDZ；TILE_LONG_CLICK_SHEET 表与 handleTileAction 分发留宿主（调用点文本零变化）；openQsSheet/quantizeCounterScale/closeQsSheet 三 export 宿主转出口公共面零变化）——表第七行兑现 |
| 1735–2249 | 磁贴编辑界面 | ✅ **已迁 qs-edit.js 新模块**（#284 批 22 v11.46 · 簇体 289 行逐字节保真（banner「磁贴编辑界面」起至 bindResizeHandle 闭合：initEditTilesView/editViewHome+hostEditViewForCurrentMode 双轨跟随/openEditTilesView/closeEditTilesView/undoEditTiles/saveEditHistory/renderEditTilesLists/persistTileOrder/bindTileDrag/bindResizeHandle），语义差异三类如实登记：① initEditTilesView 加 export（宿主 init 回接）②宿主三态重赋值 8 处改经 setQsActiveTiles/setQsAvailableCategories/setQsTileSizes 访问器委托（批19 get/setQsRestorePage 胶水先例同律；读与 splice/push 原位变异仍走 import 活绑定）③editHistory 模块态随簇迁出（消费面 100% 在簇内·批19 qsRestorePage 先例同律）；宿主两态 export let 补桥（availableCategories/tileSizes——批20 activeTiles 同律）+ 三访问器胶水 + init/open 两调用点 import 回接；磁贴模型纯逻辑单源仍在 qs-tiles.js（G2 表不复制））——表第八行兑现 |

**风险注记**：TILE_LONG_CLICK_SHEET 表驱动（110）与磁贴表是单源契约——拆分时表不复制（G2）；ENV_DEPENDENT_TILES 环境联动跨簇消费 qsEnvSnapshot。

### 3.6 recent-apps.js（2,062 行 · ok · 3 banner / 顶层声明 75）

| 簇 | 现状 | 未来模块 |
| --- | --- | --- |
| 3D 堆叠物理（scrollOffset/targetScroll/velocity/deckSettleTween） | 151–171 状态 + 物理段 | recents-physics.js（纯物理，#286 范式适配位） |
| 手势状态机（drag/dismiss/垂直划删） | 手势段 | recents-gestures.js |
| 分屏流转（getSplitInfo/exitSplitSilently/combineSplitSilently） | 132–150 | 留宿主（跨面板状态） |
| 卡片动画与回收 | 动画段 | 随物理/手势簇走 |

**风险注记**：v196 截屏 Shelf / 分享真链路 / 3D 流式拖拽 e2e 是拆分回归护栏；recentsSuspendedFromApp 与 app-window 联动（跨文件状态，拆分时留宿主）。

## §4 「单文件 >3000 行」分档曝光规则设计（K 项）

issue 处置建议 3 落地设计（本卷落规则与数据，audit-app-quality 接线 + tests 留后续批——#291 裁决卷→改名机械批两段式先例同律）：

1. **判据**：ios-desktop/ 手写面（.js/.css/.html，剔除 _shared/vendor/）文件行数 > 3,000（行数口径 = `split('\n')`，与生成件一致）。
2. **存量豁免（只出不进）**：`MONOLITH_EXEMPT = [settings.js]`——本卷盘点时点唯一 >3,000 手写文件；缩行不退出豁免（防「拆到 2,999 行被拦截」乒乓）；名单只收窄不放宽，新增豁免须议题卷对账。
3. **分档**：超阈且豁免 → **K-存量曝光**（报告级曝光，不入判）；超阈且未豁免 → **K-违规**（增量拦截候选：audit hardFailures 进位——**不入 ITEM_KEYS 九项制、不动 quality-baseline A–I 锚与 v294 J6 负向锚**，#294 J 项报告级并行段先例同律）；未超阈 → ok。
4. **数据真源**：`node scripts/gen-monolith-inventory.mjs --check`（生成件逐字节校验，check:docs-index 同律）——后续批接线时以 `exceeds3000/exempt/status` 三字段为唯一判据输入，零硬编码文件名。
5. **本卷快照**：over3000 = 1（settings.js 曝光）· violations = 0（非豁免零超阈）——盘面干净，增量拦截就绪；music（余量 175 行）/app-window（+160 行增速）为下一个跨阈高概率位（§1 对比列）。

## §5 实施路线（渐进三批）

1. **批 1（✅ 已落 · R151 窗 v11.05 · 认领帖 6755010749）**：audit-app-quality.mjs K 项接线（报告级并行段 + 非豁免超阈 hardFailures 进位 + 三字段自洽防腐）+ tests/monolith-gate.test.js 新建（A 分类器 7 锚/B 真源对账 5 锚/C 接线行为 4 锚/E 负向锚 4 锚，共 20 锚）→ 生成件随树再生 → 滚版 v11.05（v11.04 已由 #316 合流消费，顺位防倒挂）。
2. **批 2（✅ 已落 · R152 窗 v11.07 · 认领帖 6756976453）**：按 G1 选最小子页簇 **MODES_PAGE_SCRIPT**（页 27 模式 v8.30 #22③，原 1520–1542，14 簇中最小）抽 `settings-pages/modes.js`（55 行，`export const` 单源真身）+ settings.js `import { MODES_PAGE_SCRIPT }` 消费（G2 单源桥接，页注册表 `<script>` 拼接面逐字节不变）+ 考证链头注随簇走 + settings.js 互指注记（模式页考证链注记改指新文件，行号随簇演进）+ 同名测试随迁（tests/modes-settings.test.js 组①④抽取源迁移 + 新增 #22⑤「G2 单源桥接」组 2 锚含防双轨负向锚）→ 生成件随树再生（keymap scanned 261→262 新文件入扫如实登记）→ 滚版 v11.07（pkg 11.7.0）。
3. **批 3+（多窗渐进）**：settings.js 逐页迁移（12 簇按簇大小降序，MODES/STATUSBAR/ACCOUNTS/SAFETY/APPS 已迁——批 3 ✅ 已落 R152 窗加餐 v11.08 · 认领帖 6757591819 · statusbar.js 66 行单源 + status-bar-policy.test.js v89-H 组随迁+H4 桥接锚；批 4 ✅ 已落 R153 窗 v11.10 · 认领帖 6758802278 · accounts.js 136 行单源 + accounts-settings.test.js G2 桥接组随迁 + 批 3 三处史实注记跨系误滚复位；批 5 ✅ 已落 R154 窗 v11.13 · 认领帖 6760362070 · safety.js 147 行单源 + safety-settings.test.js G2 桥接组随迁；批 6 ✅ 已落 R155 窗 v11.14 · 认领帖 6762678289 · apps.js 239 行单源 + apps-subpage.test.js 簇体断言抽取源随迁 + location/about 切割锚换锚 + G2 桥接组 4 锚；批 7 ✅ 已落 R156 窗 v11.19 · 阅读清单帖 6848442699 · notif.js 174 行单源 + tests 三族随迁（notifications-subpage 归源+G2 四锚/redaction SET 切源/shell-convergence E1 切源+A2 补扫+A3 基线 17→16）+ v286 C2 读取面合计守恒；批 8 ✅ 已落 2026-11-13 按需窗 v11.20 · 认领帖 6850985398 · sound.js 218 行单源（簇块 204）+ tests 四文件随迁（sound-subpage 归源分流+G2 四锚/aosp-sounds 两 it 分流/clock-m3e 三处/audio-graph A2）+ v286 D3 与 monolith B5 生成件随树再生；批 9 ✅ 已落同窗 §7.5 加餐 v11.21 · 认领帖 6851866498 · display.js 205 行单源（簇块 189）+ tests 两文件随迁（display-subpage 归源分流+G2 四锚/aod C5）+ v286 C2 读取面三源合计守恒（settings.js+notif.js+display.js）；批 10 ✅ 已落同窗 §7.5 加餐二 v11.22 · 认领帖 6852456900 · a11y.js 96 行单源（簇块 82）+ G2 四锚最小随迁卷（accessibility-subpage 头注⑦+单一真源 describe 切源/a11y-settings F5 计数守恒）；批 11 ✅ 已落 2026-11-14 网页侧单会话窗 v11.27 · 认领帖 6879173888（前帖 6853142768 认领 24h TTL 失效后合法重认领）· color-motion.js 65 行单源（簇块 64）+ a11y-settings F5 读取面守恒扩展 + G2 四锚最小随迁卷；批 12 ✅ 已落同窗 §7.5 加餐 v11.28 · 认领帖 6879553100 · text-reading.js 92 行单源（簇块 91）+ F5 读取面守恒再扩展 + G2 四锚最小随迁卷；批 13 ✅ 已落同窗 §7.5 加餐二 v11.29 · 认领帖 6879864676 · daltonizer.js 86 行单源（簇块 85）+ F5 守恒再扩展 + G2 四锚 + F4 混面断言归源分流最小随迁卷；批 14 ✅ 已落同窗 §7.5 加餐三 v11.30 · 认领帖 6880494197 · about.js 308 行单源（簇块 307）+ about-device describe①②③ 三处簇体切片切源 + v286 C2 四源合计守恒 + G2 四锚；批 15 ✅ 已落 2026-11-15 网页侧单会话窗 v11.31 · 认领帖 6885437296 · location.js 127 行单源（簇块 110=考证链 38+const 1+模板串 69+闭合 1）+ location-settings describe①②⑥ 三处簇体切片切源 + v286 C2 五源合计守恒 + G2 四锚——**settings.js 十三簇全迁出、`*_PAGE_SCRIPT` 内联常量清零（末簇收官）**）；settings.js 余量=settingsApp 主体（243–4121）待 §3 表「未来模块」另批裁决；music/pull-panels/app-window/quick-settings/recent-apps 按 §3 边界图逐簇；**#272 e2e playwright 化独立窗**（批 1 v11.06 骨架 + 批 2 v11.09 首批 spec 三件接入摘旗，与拆分批异槽）。每批完成后刷新本图与生成件（行数/簇面随树演进）。

## §6 诚实边界

- 机械盘点口径如实登记：banner/声明为行首正则捕获（js 行首 `function/const/let/class`、html 内联行首 `function`、css `/* ====` 段含跨行开行）；`const NAME = fn` 箭头函数未计函数数、深缩进嵌套函数未计——盘点为边界图锚定用途，非语义完备统计。
- 行数口径 = `split('\n')`（非 wc -l 换行符口径，无尾换行文件差 1，music/index.html 即其例）。
- §3 边界图为**拆分锚建议**非裁决：issue 处置建议 1 明文不做一次性大重构，逐簇终审权留用户与后续窗对账。
- 本卷零施工：零 js 运行时面/零 tests 增量/零生成件三件（矩阵/globals/keymap）触碰——矩阵 --check 零漂移随卡复验。
