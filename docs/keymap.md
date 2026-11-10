# 全局键位契约（keymap.md · #305）

> **生成件单真源，禁手改**（check:docs-index / check:apps-doc 同律）：由 `scripts/gen-keymap-doc.mjs` 从
> ios-desktop/js 全树键处理源码扫描生成，无时间戳逐字节可重现；再生成 `node scripts/gen-keymap-doc.mjs`，
> 对账闸 `npm run check:keymap`（--check 逐字节）。绑定注册点即契约：源码增删键面 → 本件随树再生。

## ① 组合键契约（createKeyDispatcher 接线点）

真源：`js/aosp/key-dispatcher.js`（#111 组合键路由：键集精确匹配 + 最短保持时长；任一键提前释放取消；凑齐前混入集合外键破坏取消）。接线点解析：

| 接线点 | chord id | 键集 | holdMs | holdMs 真源 | 触发去向（onTrigger 体字面） |
|---|---|---|---|---|---|
| js/quick-settings.js:245 | power_long_press | power | 500 | POWER_LONG_PRESS_MS | openPowerDialog（GlobalActionsDialog 电源菜单） |
| js/volume-dialog.js:766 | accessibility_shortcut | volume-up + volume-down | 3000 | ACCESSIBILITY_CHORD_HOLD_MS | accessibility shortcut（无障碍快捷键沿） |
| js/volume-dialog.js:766 | screenshot_sysrq | control + shift + s | 0 | literal | screenshot（系统截图沿） |

## ② 键绑定注册表（keydown 注册点 × 消费键面）

扫描集：ios-desktop/js 全树 262 个 .js（含 aosp/ 与 apps/）。target 三类：document / window / element（组件内焦点层）。键面 = 注册块内 `*.key === 'X'` 字面比较（lower-case 比较已归一登记）。

| 注册点 | target | capture | 消费键面 | 注册行前注释尾注（verbatim） |
|---|---|---|---|---|
| js/all-apps.js:245 | window | false | （无键面比较——行为性监听） | Esc 关闭（具名监听：平板 ephemeral 销毁时解绑） |
| js/all-apps.js:513 | element | false | Space | Enter |  |
| js/aod-ui.js:132 | document | true | （无键面比较——行为性监听） |  |
| js/apps/files.js:406 | element | false | （无键面比较——行为性监听） |  |
| js/apps/installer.js:498 | element | false | （无键面比较——行为性监听） |  |
| js/apps/music.js:28 | document | false | （无键面比较——行为性监听） | v8.22 消费语义：浮层实际收起时 stopImmediatePropagation 吞掉本次 Escape——阻断 |
| js/apps/recorder.js:263 | element | false | Enter |  |
| js/apps/settings.js:1811 | element | false | （无键面比较——行为性监听） |  |
| js/apps/settings.js:3258 | element | false | Space | Enter |  |
| js/bubbles.js:109 | element | false | Space | Enter |  |
| js/bubbles.js:352 | window | false | Escape | v11.07 #91 二期：Esc / 点空白回收扇出（BubbleStackView 栈展开的收起路径同构） |
| js/desktop.js:75 | element | false | Space | Enter | 键盘激活（与点按同路径：openAppByData） |
| js/folder.js:155 | element | false | Space | Enter |  |
| js/folder.js:280 | element | false | Enter | Escape |  |
| js/folder.js:383 | element | false | Space | Enter |  |
| js/folder.js:661 | document | false | Escape |  |
| js/keyboard-activate.js:40 | element | false | （无键面比较——行为性监听） |  |
| js/notifications.js:1267 | element | false | （无键面比较——行为性监听） | a11y 基线：键盘激活同点击路由（Enter/Space） |
| js/performance.js:18 | window | false | / | Escape | 2. 键盘全局快捷键 |
| js/quick-settings.js:350 | element | false | ArrowLeft | PageScrollActionListener L298-304：键盘 LEFT/RIGHT 方向翻页（无障碍通道） |
| js/quick-settings.js:875 | window | true | （无键面比较——行为性监听） |  |
| js/screenshot-markup.js:306 | document | false | （无键面比较——行为性监听） |  |
| js/search-service.js:366 | element | false | ArrowDown | ArrowUp | Enter | 键盘导航 |
| js/share-sheet.js:261 | document | false | Escape |  |
| js/sidebubble.js:571 | document | true | （无键面比较——行为性监听） |  |
| js/sound-haptics.js:387 | document | false | （无键面比较——行为性监听） |  |
| js/taskbar.js:393 | document | false | Escape |  |
| js/theme-engine.js:1314 | element | false | （无键面比较——行为性监听） |  |
| js/theme-engine.js:1455 | element | false | Space | Enter |  |
| js/volume-dialog.js:572 | document | false | Escape |  |
| js/volume-dialog.js:806 | window | false | AudioVolumeDown | AudioVolumeMute | AudioVolumeUp | Escape | VolumeDown | VolumeMute | VolumeUp | 音量键（浏览器媒体键：Chrome key = AudioVolumeUp/Down/Mute，Windows 旧版 = VolumeUp/Down） |
| js/widget-board.js:1174 | element | false | Space | Enter |  |
| js/widget-board.js:750 | window | false | Escape |  |

## ③ 消费键面比较点（全树）

全树 70 处 *.key ===/!== 'X' 字面比较点（含具名/移位处理器面与守卫式消费；lower-case 比较归一为大写登记；op=!== 为守卫面「非该键即 return」，与 === 同为键面契约事实）。context = 同文件向上 ≤30 行内最近 keydown 注册点。

| 键面 | op | 比较点 | context 注册点 | context target | context 相位 |
|---|---|---|---|---|---|
| Space | !== | js/apps/installer.js:499 | js/apps/installer.js:498 | element | bubble |
| Space | !== | js/apps/settings.js:3796 | （移位/具名处理器） |  |  |
| Space | !== | js/apps/settings.js:3876 | （移位/具名处理器） |  |  |
| Space | !== | js/apps/settings.js:4074 | （移位/具名处理器） |  |  |
| Space | !== | js/apps/settings.js:4941 | （移位/具名处理器） |  |  |
| Space | !== | js/keyboard-activate.js:30 | （移位/具名处理器） |  |  |
| Space | !== | js/notifications.js:1268 | js/notifications.js:1267 | element | bubble |
| Space | === | js/all-apps.js:514 | js/all-apps.js:513 | element | bubble |
| Space | === | js/apps/settings.js:3259 | js/apps/settings.js:3258 | element | bubble |
| Space | === | js/bubbles.js:110 | js/bubbles.js:109 | element | bubble |
| Space | === | js/desktop.js:76 | js/desktop.js:75 | element | bubble |
| Space | === | js/folder.js:156 | js/folder.js:155 | element | bubble |
| Space | === | js/folder.js:384 | js/folder.js:383 | element | bubble |
| Space | === | js/quick-settings.js:869 | （移位/具名处理器） |  |  |
| Space | === | js/theme-engine.js:1314 | js/theme-engine.js:1314 | element | bubble |
| Space | === | js/theme-engine.js:1456 | js/theme-engine.js:1455 | element | bubble |
| Space | === | js/widget-board.js:1175 | js/widget-board.js:1174 | element | bubble |
| / | === | js/performance.js:66 | （移位/具名处理器） |  |  |
| ArrowDown | === | js/search-service.js:367 | js/search-service.js:366 | element | bubble |
| ArrowLeft | !== | js/quick-settings.js:351 | js/quick-settings.js:350 | element | bubble |
| ArrowLeft | === | js/performance.js:81 | （移位/具名处理器） |  |  |
| ArrowLeft | === | js/quick-settings.js:353 | js/quick-settings.js:350 | element | bubble |
| ArrowRight | !== | js/quick-settings.js:351 | js/quick-settings.js:350 | element | bubble |
| ArrowRight | === | js/performance.js:83 | （移位/具名处理器） |  |  |
| ArrowUp | === | js/search-service.js:373 | js/search-service.js:366 | element | bubble |
| AudioVolumeDown | === | js/volume-dialog.js:824 | js/volume-dialog.js:806 | window | bubble |
| AudioVolumeMute | === | js/volume-dialog.js:827 | js/volume-dialog.js:806 | window | bubble |
| AudioVolumeUp | === | js/volume-dialog.js:821 | js/volume-dialog.js:806 | window | bubble |
| Enter | !== | js/apps/installer.js:499 | js/apps/installer.js:498 | element | bubble |
| Enter | !== | js/apps/settings.js:3796 | （移位/具名处理器） |  |  |
| Enter | !== | js/apps/settings.js:3876 | （移位/具名处理器） |  |  |
| Enter | !== | js/apps/settings.js:4074 | （移位/具名处理器） |  |  |
| Enter | !== | js/apps/settings.js:4941 | （移位/具名处理器） |  |  |
| Enter | !== | js/keyboard-activate.js:30 | （移位/具名处理器） |  |  |
| Enter | !== | js/notifications.js:1268 | js/notifications.js:1267 | element | bubble |
| Enter | === | js/all-apps.js:514 | js/all-apps.js:513 | element | bubble |
| Enter | === | js/apps/files.js:406 | js/apps/files.js:406 | element | bubble |
| Enter | === | js/apps/recorder.js:264 | js/apps/recorder.js:263 | element | bubble |
| Enter | === | js/apps/settings.js:1811 | js/apps/settings.js:1811 | element | bubble |
| Enter | === | js/apps/settings.js:3259 | js/apps/settings.js:3258 | element | bubble |
| Enter | === | js/bubbles.js:110 | js/bubbles.js:109 | element | bubble |
| Enter | === | js/desktop.js:76 | js/desktop.js:75 | element | bubble |
| Enter | === | js/folder.js:156 | js/folder.js:155 | element | bubble |
| Enter | === | js/folder.js:282 | js/folder.js:280 | element | bubble |
| Enter | === | js/folder.js:384 | js/folder.js:383 | element | bubble |
| Enter | === | js/quick-settings.js:869 | （移位/具名处理器） |  |  |
| Enter | === | js/search-service.js:379 | js/search-service.js:366 | element | bubble |
| Enter | === | js/theme-engine.js:1314 | js/theme-engine.js:1314 | element | bubble |
| Enter | === | js/theme-engine.js:1456 | js/theme-engine.js:1455 | element | bubble |
| Enter | === | js/widget-board.js:1175 | js/widget-board.js:1174 | element | bubble |
| Escape | !== | js/apps/music.js:29 | js/apps/music.js:28 | document | bubble |
| Escape | !== | js/sidebubble.js:504 | （移位/具名处理器） |  |  |
| Escape | === | js/all-apps.js:174 | （移位/具名处理器） |  |  |
| Escape | === | js/bubbles.js:353 | js/bubbles.js:352 | window | bubble |
| Escape | === | js/folder.js:285 | js/folder.js:280 | element | bubble |
| Escape | === | js/folder.js:662 | js/folder.js:661 | document | bubble |
| Escape | === | js/performance.js:21 | js/performance.js:18 | window | bubble |
| Escape | === | js/performance.js:28 | js/performance.js:18 | window | bubble |
| Escape | === | js/quick-settings.js:869 | （移位/具名处理器） |  |  |
| Escape | === | js/screenshot-markup.js:305 | （移位/具名处理器） |  |  |
| Escape | === | js/share-sheet.js:262 | js/share-sheet.js:261 | document | bubble |
| Escape | === | js/taskbar.js:394 | js/taskbar.js:393 | document | bubble |
| Escape | === | js/volume-dialog.js:573 | js/volume-dialog.js:572 | document | bubble |
| Escape | === | js/volume-dialog.js:843 | （移位/具名处理器） |  |  |
| Escape | === | js/widget-board.js:751 | js/widget-board.js:750 | window | bubble |
| Escape | === | js/widget-board.js:752 | js/widget-board.js:750 | window | bubble |
| Escape | === | js/widget-board.js:753 | js/widget-board.js:750 | window | bubble |
| VolumeDown | === | js/volume-dialog.js:824 | js/volume-dialog.js:806 | window | bubble |
| VolumeMute | === | js/volume-dialog.js:827 | js/volume-dialog.js:806 | window | bubble |
| VolumeUp | === | js/volume-dialog.js:821 | js/volume-dialog.js:806 | window | bubble |

## ④ Escape 消费与仲裁

仲裁序（源码相位实证）：**capture 相位先于 bubble 相位**，无注册 context（移位/具名处理器）殿后；同相位按比较点字典序（运行时还要叠加 DOM 层叠与 stopPropagation 路径，此处登记注册面事实）。

| 序 | 比较点 | 相位（context 注册点） |
|---|---|---|
| 1 | js/apps/music.js:29（守卫） | bubble（js/apps/music.js:28） |
| 2 | js/bubbles.js:353 | bubble（js/bubbles.js:352） |
| 3 | js/folder.js:285 | bubble（js/folder.js:280） |
| 4 | js/folder.js:662 | bubble（js/folder.js:661） |
| 5 | js/performance.js:21 | bubble（js/performance.js:18） |
| 6 | js/performance.js:28 | bubble（js/performance.js:18） |
| 7 | js/share-sheet.js:262 | bubble（js/share-sheet.js:261） |
| 8 | js/taskbar.js:394 | bubble（js/taskbar.js:393） |
| 9 | js/volume-dialog.js:573 | bubble（js/volume-dialog.js:572） |
| 10 | js/widget-board.js:751 | bubble（js/widget-board.js:750） |
| 11 | js/widget-board.js:752 | bubble（js/widget-board.js:750） |
| 12 | js/widget-board.js:753 | bubble（js/widget-board.js:750） |
| 13 | js/all-apps.js:174 | 移位/具名处理器 |
| 14 | js/quick-settings.js:869 | 移位/具名处理器 |
| 15 | js/screenshot-markup.js:305 | 移位/具名处理器 |
| 16 | js/sidebubble.js:504（守卫） | 移位/具名处理器 |
| 17 | js/volume-dialog.js:843 | 移位/具名处理器 |

## ⑤ 裁决面（源码实证，扫描数据派生）

- **D 键解锁**：成立：全树 0 处 'd'/'D' 键面消费 + lock-screen.js 0 处 keydown 注册 + 解锁唯一沿 = pointerdown 手势/按钮（js/lock-screen.js:675）→ 解锁手势-only，D 键不解锁为设计意图（#305 实测根因闭环）

- **A 键锁屏感**：成立：全树 0 处 'a'/'A' 键面消费；锁屏任意 keydown 仅 activity 标记（js/aod-ui.js:132）→ 实测「A：锁屏感」= 键盘无解锁沿的必然结果，非绑定行为

- **Space 键面**：8 处注册点消费（组件内焦点沿为主，逐行见 ②）。

## ⑥ 边界声明

- 系统契约 v1 面 = ios-desktop/js 全树 keydown 注册点（33 处，target=document/window/element）；
- js/apps/ 应用层 58 个 .js 文件的 element 级焦点键（Enter 提交等）随窗口文档自治，不入系统契约 v1（应用清单口径见 docs/APPS.md，#285 车道）；
- iframe 应用 41 家（#267 countIframeApps 口径）内部键面随各自 index.html 文档自治；
- 锁屏解锁沿唯一性见 ④ D 键裁决（lock-screen.js 零 keydown 注册为本件扫描实证，回归即随树再生暴露）。

