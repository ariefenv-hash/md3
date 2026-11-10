# 巨石文件职责边界图与渐进拆分准则（#284 审计卷）

- **卷别**：#284 审计卷（方案裁决卷形态，#291 裁决卷 3ab4b147 先例同律：规则 + 清单零施工）
- **窗别**：R150 窗 · 2026-11-10 06:00 槽 · Job 2933040 · 第 2 定时消息系列 · 认领帖 6752849167
- **数据真源**：`docs/audits/monolith-inventory.json`（生成件单真源）← `node scripts/gen-monolith-inventory.mjs`（再生）/ `--check`（逐字节校验）
- **本卷形态**：纯 docs + scripts 零滚版 v11.03 维持（零 js 运行时面零 tests 增量）；audit K 项接线 + tests 留后续批（§5 实施路线）

## §1 数据速览（v11.03 · 28f5a243 现值）

issue #284 证据表行数为 v10.72 实测口径，本表以 v11.03 现值全量刷新（行数口径 = `split('\n')`；vendor 三巨体 three.module.js 53045 / cannon-es.js 13024 / phosphor style.css 4627 不在本卡范围——#280 另卡在案）：

| 文件 | 行数 | 段落 banner | 顶层/规则块盘点 | >3000 分档 |
| --- | --- | --- | --- | --- |
| ios-desktop/js/apps/settings.js | 5,976 | 12 | 顶层声明 15（const 15：14 个 PAGE_SCRIPT + settingsApp；模板串内缩进函数不计口径见 §6） | **K-存量曝光**（豁免名单在册） |
| ios-desktop/apps/music/index.html | 2,825 | 3 | script 块 12（外链 9/内联 3，内联行首 function 7）；内联主逻辑段 1147–2585（约 1,439 行） | ok（距阈值余量 175 行，逼近红线） |
| ios-desktop/css/pull-panels.css | 2,601 | 18 | 规则块 280 | ok |
| ios-desktop/js/app-window.js | 2,474 | 8 | 顶层声明 33（function 21/const 2/let 10） | ok |
| ios-desktop/js/quick-settings.js | 2,249 | 8 | 顶层声明 52（function 32/const 7/let 13） | ok |
| ios-desktop/js/recent-apps.js | 2,062 | 3 | 顶层声明 75（function 43/const 2/let 30） | ok |

六件合计 18,187 行。对比 issue 证据表（v10.72）：settings 5,988→5,976（−12）、music 2,818→2,825（+7）、pull-panels 2,601→2,601（持平）、app-window 2,314→2,474（**+160，增速最快**）、quick-settings 2,204→2,249（+45）、recent-apps 2,062→2,062（持平）——app-window 与 music 为增长风险位。

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

### 3.1 settings.js（5,976 行 · K-存量曝光 · 12 banner）

**现状结构三段**：①头部工具与状态（1–198）②14 个 `*_PAGE_SCRIPT` 子页内联脚本常量（199–2102，每页一个模板串常量，页间经 `bindDoc('settings', …)` 事件隔离零共享状态）③`settingsApp` 主体（2103–5970，约 3,868 行：pages 声明 HTML 模板串 + 渲染框架/路由/双栏/搜索过滤）。

| 簇（行号） | 现状 | 未来模块 |
| --- | --- | --- |
| NOTIF_PAGE_SCRIPT（199） | 页 通知 | settings-pages/notif.js |
| SOUND_PAGE_SCRIPT（376） | 页 4 提示音和振动（v8.03 sound_settings.xml 1:1） | settings-pages/sound.js |
| DISPLAY_PAGE_SCRIPT（574） | 显示 | settings-pages/display.js |
| A11Y_PAGE_SCRIPT（764） | 无障碍 | settings-pages/a11y.js |
| COLOR_MOTION_PAGE_SCRIPT（844） | 页 32 色彩和动画（v11.03 #105 一期） | settings-pages/color-motion.js |
| DALTONIZER_PAGE_SCRIPT（910） | 页 34 色彩校正（v11.03 #105 一期） | settings-pages/daltonizer.js |
| TEXT_READING_PAGE_SCRIPT（996） | 页 33 显示大小和文字（v11.03 #105 一期） | settings-pages/text-reading.js |
| ABOUT_PAGE_SCRIPT（1127） | 页 21/22/23 关于手机/型号/Android 版本（v8.26 #48） | settings-pages/about.js |
| LOCATION_PAGE_SCRIPT（1426） | 页 24/25/26 位置信息三页（v8.29 #22⑦；已消费 __settingsCore.relTime） | settings-pages/location.js |
| MODES_PAGE_SCRIPT（1520） | 页 27 模式（v8.30 #22③） | settings-pages/modes.js |
| STATUSBAR_PAGE_SCRIPT（1549） | 页 31 状态栏（v9.95 #89） | settings-pages/statusbar.js |
| ACCOUNTS_PAGE_SCRIPT（1663） | 页 30 密码/通行密钥/账号（v8.33 #22⑨） | settings-pages/accounts.js |
| SAFETY_PAGE_SCRIPT（1756） | 页 28 安全和隐私（v8.31 #22⑤⑥；v11.03 #210 PIN 转正） | settings-pages/safety.js |
| APPS_PAGE_SCRIPT（1876） | 页 6 应用（v8.05 #23 apps.xml 1:1） | settings-pages/apps.js |
| settingsApp 主体（2103–5970） | pages 声明 + 框架/路由/双栏/搜索 | settings-shell.js（框架）+ settings-pages/index.js（页注册表） |

**拆分风险注记**：PAGE_SCRIPT 间零共享状态是天然模块边界（收益最大的首选拆分对象）；settingsApp.pages HTML 模板串与 PAGE_SCRIPT 的耦合点是页 id 命名约定（迁移须逐页对照 id）；已提核 `__settingsCore`（isConvo/lockSummary/timeoutSummaryFrom/relTime/fmtAppPermSummary 等）消费链分布在 LOCATION/ACCOUNTS 等页，迁移时委托行随页走（G2 单源桥接）。

### 3.2 music/index.html（2,825 行 · ok · 逼近阈值）

**现状结构**：12 个 script 块 = 外链 9（freeze-shim / a11y / sanitize / **lyric-core.js（#286 先例单源核）** / audio-core / m3e-mini / m3e-pull / stretch / idle-slider）+ 内联 3 段（1147–2585 主逻辑约 1,439 行；2586–2800 module 段；2806–2822 尾段）。

| 簇 | 现状 | 未来模块 |
| --- | --- | --- |
| 歌词制作编辑器 | 内联主逻辑段内（#251 IA 方案卡联动面） | 沿 lyric-core 先例抽 js/ 级核（G1/G2） |
| 歌词滚动渲染 | 内联主逻辑段内（逐秒同步） | 同上，随簇走 |
| 播放器 UI 绑定 + 媒体会话桥 | 内联主逻辑段 + module 段 | 留宿主（DOM/媒体桥不动） |

**风险注记**：与 audio-core/m3e-pull/stretch 共享 DOM 结构约定（data-stretch=".track-list" 等）；阈值余量仅 175 行——若 #251 歌词制作 IA 落地扩容，本文件是下一个跨 3000 行的高概率位（K 项增量拦截首口径）。

### 3.3 pull-panels.css（2,601 行 · ok · 18 banner / 280 规则块）

| 段（行号） | 簇 | 未来模块 |
| --- | --- | --- |
| 1 / 57 / 164 / 209 / 1209 / 1879 | Shade 域（统一 Shade/CollapsedShadeHeader/QQS/通知中心/Dual Shade） | shade.css |
| 293 / 452 / 552 / 580 / 702 / 1493 / 2492 | QS 磁贴域（滑条/网格/禁用受管/可调尺寸/变换面板/编辑界面/分页布局） | qs-tiles.css |
| 1081 | QS 媒体卡 | qs-media.css |
| 1651 | 电源菜单 GlobalActionsDialog（#113） | power-menu.css |
| 2139 | 音量对话框（volume_dialog.xml 1:1） | volume.css |
| 1834 / 2023 | 面板入场编排 + 模式弹层 | panels-motion.css / panels-dialog.css |

**风险注记**：CSS 拆分须保级联顺序与 @media 计数锚（v105-D @media 计数锚先例——拆分后计数变化须重锚）+ check:dist-parity 全过；段落间有共享 token（--md-* 变量），token 层不拆。

### 3.4 app-window.js（2,474 行 · ok · 8 banner · **增速最快 +160 行**）

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

### 3.5 quick-settings.js（2,249 行 · ok · 8 banner）

| 段（行号） | 簇 | 未来模块 |
| --- | --- | --- |
| 52–141 | 默认磁贴表 + 环境依赖磁贴（cast/quick_share/vpn/internet/torch） | qs-tiles.js（表先行，G1 常量簇先行样例） |
| 142–301 | mdTilePalette 磁贴调色板 | qs-tiles.js |
| 302–653 | v9.94 #203 PagedTileLayout 分页联动 | qs-pages.js |
| 654–1012 | v7.82 两态动画 + 磁贴动作 + 手电/录屏/隐私指示/DND | qs-actions.js |
| 1013–1226 | v9.94 #198 ZenDeviceEffects + ScheduleCalendar 规则 eval + 电池节省 | qs-zen.js（eval 纯逻辑簇，#286 范式适配位） |
| 1227–1476 | 亮度滑条 + 媒体卡 | 留宿主（DOM 紧耦合） |
| 1477–1734 | v7.62 磁贴底部面板（设备/网络/模式清单 sheet） | qs-sheets.js |
| 1735–2249 | 磁贴编辑界面 | qs-edit.js |

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
2. **批 2（settings.js 首簇试点，滚版卷）**：按 G1 选最小子页簇（STATUSBAR 1549–1597 或 MODES 1520–1548）抽 settings-pages/statusbar.js + 同名测试迁移 + PAGE_SCRIPT 常量整体搬迁 + settingsApp 页注册表接线——一次一簇，全链门禁等强（G6）。
3. **批 3+（多窗渐进）**：settings.js 逐页迁移（14 页按簇大小降序）；music/pull-panels/app-window/quick-settings/recent-apps 按 §3 边界图逐簇；**#272 e2e playwright 化独立窗**（config 骨架 + 227 脚本三档清单化，与拆分批异槽）。每批完成后刷新本图与生成件（行数/簇面随树演进）。

## §6 诚实边界

- 机械盘点口径如实登记：banner/声明为行首正则捕获（js 行首 `function/const/let/class`、html 内联行首 `function`、css `/* ====` 段含跨行开行）；`const NAME = fn` 箭头函数未计函数数、深缩进嵌套函数未计——盘点为边界图锚定用途，非语义完备统计。
- 行数口径 = `split('\n')`（非 wc -l 换行符口径，无尾换行文件差 1，music/index.html 即其例）。
- §3 边界图为**拆分锚建议**非裁决：issue 处置建议 1 明文不做一次性大重构，逐簇终审权留用户与后续窗对账。
- 本卷零施工：零 js 运行时面/零 tests 增量/零生成件三件（矩阵/globals/keymap）触碰——矩阵 --check 零漂移随卡复验。
