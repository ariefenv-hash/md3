# #274 二期 · C 档词表命中 52 处逐条定性台账

> 2026-11-14 · 实树 v11.26 · 报告件（**非生成件**，不参与 `audit-innerhtml.mjs --check`）
> 输入：一期生成件 `docs/innerhtml-inventory.md` §三 C 档明细 128 处中「词表命中」**52 处**（用户输入 51 + 网络 1）。
> 方法：脚本按 `路径:行` 抽取每处源码上下文 ±8 行，逐条读真实数据链路后判定，**不凭标识符名猜**。
> 处置口径沿用一期建议②：改 `textContent` / 补 escape / 显式豁免理由。

## 结论速览

| 分类 | 处数 | 处置 |
| --- | --- | --- |
| ① 本批已施工补转义 | **4** | 已落代码，C→B |
| ② 实际已转义·生成器白名单盲点 | **4** | 显式豁免 + 登记口径缺陷 |
| ③ 词表误命中（静态/常量/数值） | **25** | 显式豁免，逐条给证据 |
| ④ builder / 内部页面片段 | **7** | 显式豁免，转义在 builder 内或数据为代码内页面片段 |
| ⑤ 用户或外部可达未转义·待施工 | **12** | 列出精确行 + 建议代码，本批不动 |
| 合计 | **52** | |

**施工后分档**（生成件 `--write` 再生、守恒锚守护）：总数 **271 = A 136 + B 11 + C 124**（原 B 7 / C 128；4 处补 `window.__mdEscape(` 被生成器识别 → C→B，短名单 52 → **48**）。

> 关键结论：52 处「用户输入/网络」命中里**只有 16 处（①4 + ⑤12）存在真实的外部可达插值**，其余 36 处是启发式词表的误命中或已转义点。**词表只能当排查引导，不能当漏洞清单** —— 这是一期头注已声明、本批用实读坐实的口径。

---

## 一、本批施工 4 处（零新增 API，复用 #240 单一真源）

统一用 `window.__mdEscape` —— 主壳 `ios-desktop/index.html:19` 经典脚本先于 main.js 引入 `apps/_shared/sanitize.js`，全局可用；不新建本地 charmap（#240 纪律）。

| 路径:行 | 原插值 | 补后 | 外部可达链路 |
| --- | --- | --- | --- |
| `js/search-service.js:460` | `${r.title}` / `${r.sub}` | `window.__mdEscape(r.title)` / `...(r.sub)` | **本批最高危**：Web 搜索后备 `title = `在 Google 中搜索 “${query}”``，`query` 来自 `#globalSearchInput` 用户输入，直接回显进 innerHTML |
| `js/folder.js:99` | `${folder.name}` | `window.__mdEscape(folder.name)` | `folder.js:239 folder.name = name` 用户重命名 |
| `js/taskbar.js:127` | `data-id="${id}"` / `${name}` | `safeId` / `safeName` | 溢出菜单属性注入面 + 显示名，id/name 来自注册表或安装包清单 |
| `js/at-a-glance.js:55` | `data-city-id="${c.id}"` / `${c.name}` | `window.__mdEscape(c.id)` / `...(c.name)` | 钉选城市由用户选择 |

`tests/innerhtml-escape-regression.test.js`（常青命名，#291 §1）守护 4 处正/负向锚，防回退。

---

## 二、生成器白名单盲点（本批最重要的制度发现）

`scripts/audit-innerhtml.mjs:21`：

```js
export const ESCAPE_HELPERS = ['escapeHtml(', '__mdEscape(', 'sanitizeHtml('];
```

**不认本地 `esc(` 别名**。而 #240 单源化后，多个文件把 `escapeHtml` 收敛为 `function esc(s){ return window.__mdEscape(s); }`。实测 C 档 128 处里 **7 处语句内实际含 `esc(`**，全部被误判为「未见 escape」：

| 路径:行 | 是否在 52 短名单 |
| --- | --- |
| `js/apps/settings-wellbeing.js:146` | ✅ |
| `js/apps/settings-wellbeing.js:183` | ✅ |
| `js/lock-quotes.js:305` | ✅ |
| `js/lock-screen.js:407` | ✅ |
| `js/apps/installer.js:240` / `:245` / `:270` | ❌（内部档，同样误判） |

**本批刻意不改生成器**，理由两条：

1. 加 `'esc('` 会让全库 271 处**重新分档**，而本报告的 52 处短名单是**当前时点**快照 —— 口径会与再生后的生成件错位，制造理解困惑；
2. `stmt.includes('esc(')` 是简单子串匹配，**`desc(` / `rescale(` 等会误命中**，需改成词边界/正则判定并补负向锚，属判定逻辑变更。

→ 建议并入一期「④ 契约」或单开一条小任务：`ESCAPE_HELPERS` 升级为正则/词边界组，补 `esc(` 并新增「`desc(` 不被误判」负向锚，然后 `--write` 全量重新分档。属**制度裁决权**，本侧只给数据。

---

## 三、52 处逐条定性全表

### ① 本批已施工补转义 · 4 处

| # | 路径:行 | 命中词 | 判定 | 证据 / 理由 |
| --- | --- | --- | --- | --- |
| 6 | `js/at-a-glance.js:55` | name text title | 已施工补转义 | c.id 进 data-city-id 属性、c.name 进文本 → window.__mdEscape；钉选城市由用户选择 |
| 10 | `js/folder.js:99` | name | 已施工补转义 | folder.name 由用户重命名产生（folder.js:239 folder.name = name）→ window.__mdEscape |
| 34 | `js/search-service.js:460` | search text title | 已施工补转义·本批最高危 | Web 搜索后备 title = `在 Google 中搜索 “${query}”`，用户 query 直接回显进 innerHTML → r.title/r.sub 补 window.__mdEscape |
| 38 | `js/taskbar.js:127` | name | 已施工补转义 | 溢出菜单 data-id="${id}" 属性 + ${name} 显示名 → safeId/safeName 走 window.__mdEscape |

### ② 实际已转义·生成器白名单盲点 · 4 处

| # | 路径:行 | 命中词 | 判定 | 证据 / 理由 |
| --- | --- | --- | --- | --- |
| 4 | `js/apps/settings-wellbeing.js:146` | name | 已转义·生成器盲点 | 语句内 esc(id) / esc(resolveAppName(id))；#240 本地 esc 委托 window.__mdEscape |
| 5 | `js/apps/settings-wellbeing.js:183` | name | 已转义·生成器盲点 | ids.map 语句内 esc( 调用；限时列表名走 esc 链 |
| 13 | `js/lock-quotes.js:305` | text | 已转义·生成器盲点 | esc(q.t) / esc(q.a) / esc(q.s) 全链转义；头注明写「锁屏内容可能来自在线 API」 |
| 14 | `js/lock-screen.js:407` | body desc title | 已转义·生成器盲点 | esc(view.app) / esc(view.time) 等；且 needsRedaction 脱敏核在前 |

### ③ 词表误命中（静态/常量/数值，显式豁免） · 25 处

| # | 路径:行 | 命中词 | 判定 | 证据 / 理由 |
| --- | --- | --- | --- | --- |
| 7 | `js/at-a-glance.js:244` | note text title | 词表误命中 | dateStr 本地日期拼接；currentWeather.temp = Math.round(网络数值)、condition/icon 走本地 WMO 映射表常量 |
| 15 | `js/lock-screen.js:459` | content label | 词表误命中 | 锁屏根 DOM 静态骨架（lock-wallpaper / lock-dim / ICONS.lock / 静态日期），零插值外部数据 |
| 17 | `js/notifications.js:269` | text | 词表误命中 | 空态纯静态「暂无待处理的新通知」+ ICONS.sound_notifications |
| 18 | `js/notifications.js:590` | search | 词表误命中 | ICONS.song_search || ICONS.media_play —— 标识符含 search 触发词表，实为 SVG 常量 |
| 19 | `js/notifications.js:664` | search | 词表误命中 | 同 18，媒体封面回退图标常量 |
| 23 | `js/quick-settings.js:1447` | note | 词表误命中 | ICONS.music_note || ... 常量；相邻 titleEl/artistEl 走 textContent 兜底 |
| 26 | `js/quick-settings.js:2109` | label | 词表误命中 | GA_ITEM_DEFS 内部常量 + ICONS[def.icon]，零外部数据 |
| 30 | `js/recent-apps.js:2001` | url | 词表误命中 | pendingShot.dataUrl 是本地截屏生成的 dataURL（内部），url 词表误命中；相邻 .ss-app 用 textContent |
| 31 | `js/screenshot-markup.js:169` | label | 词表误命中 | shot.width/height 数值 + PEN_COLORS / PEN_WIDTHS / TOOL_ICONS 内部常量；aria-label 静态 |
| 32 | `js/search-service.js:248` | search title | 词表误命中 | 搜索胶囊纯静态骨架（placeholder 文案 + ICONS.mic_access） |
| 33 | `js/search-service.js:310` | chat input query search text | 词表误命中 | 搜索浮层纯静态骨架（<input> placeholder + ICONS），query 不进此语句 |
| 39 | `js/theme-engine.js:436` | body label title | 词表误命中 | 主题选择器根 DOM 静态骨架 + ICONS.image |
| 40 | `js/theme-engine.js:597` | name | 词表误命中 | PROCEDURAL_PRESETS 内部常量数组（p.id / p.name / 缩略图 dataURL） |
| 41 | `js/theme-engine.js:630` | name | 词表误命中 | PRESET_WALLPAPERS 内部常量数组（w.url / w.name） |
| 42 | `js/theme-engine.js:919` | content label name note text title | 词表误命中 | initWallpaperPage 纯静态 HTML；词表命中的 content/label/note/text/title 全部来自 AOSP 考证注释 |
| 43 | `js/theme-engine.js:1301` | label name title | 词表误命中 | PRESET_COLORS 内部常量（p.hex 经 HCT 生成、p.name 常量） |
| 44 | `js/theme-engine.js:1319` | desc label name title | 词表误命中 | MONET_STYLES 内部常量（s.name / s.desc / s.label） |
| 45 | `js/theme-engine.js:1338` | title | 词表误命中 | ramp 是 blendSeeds 产出的 hex 数值数组 |
| 46 | `js/theme-engine.js:1469` | content name | 词表误命中 | PROCEDURAL_PRESETS 骨架首帧（同 40，idle 缩略图回填路径） |
| 47 | `js/theme-engine.js:1517` | name text | 词表误命中 | PRESET_WALLPAPERS 内部常量（同 41，设置页版本） |
| 48 | `js/volume-dialog.js:552` | label note text | 词表误命中 | 媒体输出对话框纯静态骨架 + ICONS.graphic_eq |
| 49 | `js/widget-board.js:328` | label title | 词表误命中 | 音乐小工具静态骨架；曲名走 data-wb-music-title 元素由 fill* 后续 textContent 填充 |
| 50 | `js/widget-board.js:357` | label | 词表误命中 | 快捷方式小工具 4 个静态按钮 + 静态 aria-label + ICONS |
| 51 | `js/widget-board.js:680` | label | 词表误命中 | 卡片菜单 2 项纯静态 + 静态 aria-label + SVG 常量 |
| 52 | `js/widget-board.js:728` | label title | 词表误命中 | 小工具选择器纯静态骨架 + SVG_WIDGETS / ICONS.close |

### ④ builder / 内部页面片段（显式豁免） · 7 处

| # | 路径:行 | 命中词 | 判定 | 证据 / 理由 |
| --- | --- | --- | --- | --- |
| 1 | `js/all-apps.js:352` | content | builder 返回值·内部 | buildIconContent(app) 返回静态表/安装包矢量；相邻 label.textContent = app.name 已走安全通道 |
| 2 | `js/apps/files.js:936` | body | builder 返回值·内部 | body ← emptyHtml()/gridItemHtml(e)/rowHtml(e)，转义在 builder 函数体内；files.js 已定义本地 esc（#240 委托 __mdEscape） |
| 3 | `js/apps/settings-two-pane.js:501` | content | 内部页面片段 | pages[pageIdx].content 是应用页 HTML 片段（代码内定义），分屏窗格回退注入路径，非用户数据 |
| 20 | `js/page-stack.js:62` | content | 内部页面片段 | page.content 应用页 HTML 片段（page-stack 装配 app.pages） |
| 21 | `js/page-stack.js:121` | content | 内部页面片段 | 同 20，renderPageStack 路径 |
| 36 | `js/split-screen.js:199` | content | 内部页面片段 | page.content（app.pages[0]），分屏挂载路径，非用户数据 |
| 37 | `js/split-screen.js:203` | content | 内部页面片段 | 回退分支静态骨架 + iconHTML（createDynamicIconHTML / getAppIconSVG） |

### ⑤ 用户或外部可达未转义·待施工 · 12 处

| # | 路径:行 | 命中词 | 判定 | 证据 / 理由 |
| --- | --- | --- | --- | --- |
| 8 | `js/context-menu.js:235` | name text title | 待施工·应用名 | ${app.name} 未 esc 进 menu-header-title；应用名来自注册表/安装包清单 |
| 9 | `js/desktop.js:65` | content name | 待施工·应用名+自定义图标 | ${app.name} 与 ${boxContent}=app.customIcon（安装包内联 SVG）均未 esc |
| 11 | `js/folder.js:135` | content name | 待施工·应用名 | ${app.name} 未 esc（文件夹内图标标签） |
| 12 | `js/folder.js:374` | name | 待施工·应用名 | ${app.name} 未 esc（添加应用抽屉项） |
| 16 | `js/mini-window.js:183` | label name title | 待施工·应用名 | ${app.name} 未 esc（mini-title + aria-label 模板） |
| 22 | `js/quick-settings.js:460` | name text title | 待施工·磁贴名 | ${tile.name} / ${subText} 未 esc（QS 磁贴标题/副标题） |
| 24 | `js/quick-settings.js:1830` | name text title | 待施工·磁贴名 | ${tile.name} / ${tile.sub} 未 esc（编辑器磁贴） |
| 25 | `js/quick-settings.js:1882` | name text title | 待施工·磁贴名 | ${tile.name} / ${tile.sub} 未 esc（编辑面板候选磁贴） |
| 27 | `js/recent-apps.js:417` | desc name prompt title | 待施工·应用名 | PINNING_STRINGS 常量安全，但 ${app ? app.name : taskId} 未 esc（屏幕固定提示） |
| 28 | `js/recent-apps.js:729` | content name title | 待施工·应用名 | ${app.name} 未 esc（最近任务卡标题） |
| 29 | `js/recent-apps.js:793` | name title | 待施工·应用名 | ${appA.name} + ${appB.name} 未 esc（分屏组卡标题） |
| 35 | `js/split-screen.js:187` | name title | 待施工·应用名 | ${app.name} 未 esc（分屏窗格标题） |

---

## 四、⑤ 类 12 处待施工清单（本批不动，逐条给建议）

同一根因：**应用/文件夹/磁贴显示名来自注册表或安装包清单，当前为内部受控数据，但一旦接入外部包/用户重命名即成为注入面**。建议统一补 `window.__mdEscape`，与 ① 同款：

| 路径:行 | 插值 |
| --- | --- |
| `js/context-menu.js:235` | `${app.name}` |
| `js/desktop.js:65` | `${app.name}` + `${boxContent}`（customIcon 需单独按 SVG 白名单或 `__mdSanitize` 定性，不能字符转义） |
| `js/folder.js:135` / `:374` | `${app.name}` |
| `js/mini-window.js:183` | `${app.name}`（含 aria-label 模板串） |
| `js/quick-settings.js:460` / `:1830` / `:1882` | `${tile.name}` / `${tile.sub}` / `${subText}` |
| `js/recent-apps.js:417` / `:729` / `:793` | `${app ? app.name : taskId}` / `${app.name}` / `${appA.name} + ${appB.name}` |
| `js/split-screen.js:187` | `${app.name}` |

**本批不一次动这 12 处**：会跨 8 个核心运行时文件，超出「纯审计+小改」范围；且 `customIcon` 需要富文本白名单（`__mdSanitize`）而非字符转义，须单独定性。按「一次一条完整闭环」留作下一批。

---

## 五、#274 关单条件（仍 open）

| 建议 | 状态 |
| --- | --- |
| ① 分级审计表（一期） | ✅ `651b33d7` |
| **② 52 处逐条定性** | ✅ **本批完成**：4 处已施工 + 48 处显式豁免/登记（含 12 处待施工清单） |
| ③ CSP 试点（report-only 范围评估） | ⬜ 未做 |
| ④ 「新增 innerHTML 需注释标注数据来源」纳入 check:comments | ⬜ 未做 |
| 附：生成器 `esc(` 白名单盲点 | ⬜ 已量化登记，待制度裁决 |

**本卡仍 `open` / `P2`。** 本侧不关单 —— ③④ 未做，且 ⑤ 类 12 处虽列为待施工，仍属 ② 的未完成面。

## 诚实边界

- 全部为**静态源码实读 + Node 侧判定**，未做浏览器注入验证；「外部可达」是按数据链路推断，不等价于已复现 XSS。
- 词表启发式命中的 `text/title/name/search/note/label/body/content/desc/prompt/query/chat/input/url` 在大量场景下只是**变量名或注释里的普通词**（尤其 `theme-engine.js:919` 命中 6 个词全部来自 AOSP 考证注释）。
- ② 类 4 处已转义的判定基于「语句内存在 `esc(` 调用且该 esc 委托 `window.__mdEscape`」，未逐个核对每个插值点是否都过 esc —— 若后续修生成器，需再复核。
- ④ 类 builder（`buildIconContent` / `gridItemHtml` / `rowHtml`）只确认函数体内定义了 esc 链，**未逐函数枚举所有插值**；`files.js:936` 的文件名链路建议真做一轮注入验证。
- 本批 4 处补转义后，生成器把 C→B 是因为 `__mdEscape(` 在白名单内；这**不代表**生成器理解了语义，只是命中了字面。

关联：#274 #240 #291 #235 #54 `docs/innerhtml-inventory.md` `scripts/audit-innerhtml.mjs`
