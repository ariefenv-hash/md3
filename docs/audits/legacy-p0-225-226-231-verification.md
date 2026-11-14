# 三条老 P0 静态复核（#225 / #226 / #231）

> 2026-11-14 · 实树 `2e2b48b0`（v11.26）· 逐条核 commit 祖先链、产物在库、源码锚、相关测试
> 目的：把「交付在库但仍 open」的三条 P0 的**静态面**坐实，把待办从整卡缩到只剩真机确认。
> **不关单**：三条的关单权均在用户（跨设备真机 / 视觉验收），本侧不替代。

## 结论速览

| 议题 | 交付卷 | 祖先链 | 产物 | 测试 | 剩余待办 |
| --- | --- | --- | --- | --- | --- |
| **#225** 开窗 44×44 | `15d961a9` (v10.33) | ahead **294** / behind 0 | ✅ 全在 | ✅ | 用户跨设备真机确认恢复 |
| **#226** 时钟单点依赖 | `ffa50362` (v10.35) | ahead **290** / behind 0 | ✅ 全在 | ✅ | 真机确认「时钟崩了」不再复现 |
| **#231** 壁纸重新播放 | `a17c3fb1` (v10.36) | ahead **289** / behind 0 | ✅ 全在 | ✅ | 用户验收 + **§7 口径裁决** |

相关 vitest 实跑：**8 文件 / 117 用例全绿**（`TZ=UTC`，rc=0）。

---

## #225 · 根壳开窗动画卡在 44×44

**交付卷** `15d961a9` 在 main 祖先链（compare `ahead=294 / behind=0`）。

### 产物逐项在库（当前树实读，非交付帖转述）

| 文件 | 字节 | 作用 |
| --- | --- | --- |
| `ios-desktop/js/aosp/launch-watchdog.js` | 4327 | 纯逻辑看门狗核，`resolveLaunchAction()` + 释放定时器 |
| `scripts/e2e-v225-launch-watchdog.mjs` | 6992 | 无头复现/回归 |
| `tests/launch-watchdog.test.js` | 7924 | 看门狗行为断言 |
| `tests/launch-boot-anim.test.js` | 3234 | 开窗动画契约 |
| `tests/v293-launch-audit.test.js` | 5721 | 启动面审计 |
| `docs/audits/launching-boot-audit.md` | 8067 | **本侧** `fbb737e0` 补的 L1/L2 层级辨析 |
| `docs/v1033/` | 7 文件 | 1440×900 / 390×844 / 820×1180 等跨尺寸 rAF 截图 |

源码锚实读：`launch-watchdog.js:7` 明确写着「窗口停在图标起始帧 **44×44**（子应用 iframe 44×36，内容已渲染但不可见）」—— 与本卡标题逐字对应；`:19` 的 `resolveLaunchAction({settled, forced, elapsedMs, watchdogMs})` 返回 `force-finish | wait`，`:48` 的 `releaseTimer` 取消路径在位。

### 本侧 `fbb737e0` 的补证（已在上一批完成）

真实 Chromium 六组冷启动：`L A U N C H I N G` 可见 3.1~4.8 秒是**根壳 L1 splash**（`index.html:226` 的 `#splash`，iframe load + 3s 兜底 + 0.45s 淡出），52 个桌面图标恰在 2849~3705ms 才挂载完，splash 精确盖住这段后同步撤掉；**L1 ≠ #225 修的 L2 `.app-launch-screen`**。实测 L2 开窗 390×844 全屏、`launchOpacity=0`、内部文档 115183 字符，**未复现 44×44**。

> 一处诚实登记：3s 兜底在桌面加载慢于 3s 时会提前撤 splash 露出未完成桌面（0~0.7s 窗口），六组实测均未触发；「绝不卡住」是源码写明的取舍，改动需真机核，留用户裁决。

**剩余**：用户在 iOS / Android / Windows 跨设备真机确认恢复。

---

## #226 · 时钟单点依赖崩塌

**交付卷** `ffa50362` 在 main 祖先链（`ahead=290 / behind=0`）。

### 最关键的一条：卡面标题那行顶层直读**确已消除**

本卡标题点名 `stopwatch.mjs:11` 的 `let sw = window.__clockCore.Stopwatch.reset()`。当前 `stopwatch.mjs` 实读：

```js
let sw=null,swLaps=[];                       // 求值期不再触碰 core
const swCore=()=>window.__clockCore||null;  // 惰性访问器
const ensureSw=()=>{ if(sw!==null)return sw; const S=swCore()?.Stopwatch;
                     if(!S)return null; sw=S.reset(); ... }
```

模块头注（v11.26 #226 要求①）把原委写得很清楚：顶层硬耦合经典脚本 → 404 / SW 错配 / 冻结延后即 TypeError → **整条 ESM 图崩塌五模块全灭**；现对齐 `alarm.mjs` 的 `instCore` / `bedtime.mjs` 的 `btCore` 惰性访问器范式，core 缺失返回 null 由调用方降级，入口遮罩见 `app.mjs` 的 `ensureClockCore`（要求②）。

全 clock-app 内剩余的 `window.__clockCore` 引用**全部在函数体内**（`alarm.mjs:39/41/42/175/179/181/201/282`、`app.mjs:278` 注释），求值期零触碰 —— 加载顺序契约不再依赖经典脚本先行。

### 产物

| 文件 | 字节 |
| --- | --- |
| `ios-desktop/js/clock-core.js` | 33964（经典 IIFE，唯一出口 `window.__clockCore`） |
| `ios-desktop/js/clock-core.mjs` | 1669（ESM 桥） |
| `tests/clock-resilience.test.js` | 6272 |
| `scripts/e2e-v1033-clock-resilience.mjs` | 7045 |
| `tests/clock-core.test.js` / `clock-faces` / `clock-size` / `clock-m3e` 等 | 在库 |
| `docs/v1033/r116-core-missing-overlay.png`、`r116-retry-recovered.png`、`r116-shell-clock.png` | 3 张（core 缺失遮罩 / 重试恢复 / 壳层时钟） |

本侧 `fbb737e0` 补证：直载 `clock-app` **零 pageerror**、`__clockCore` 就绪、5 个 tab 正常渲染。相关 8 文件 vitest **117/117** 含 `clock-resilience` 与 `clock-core`。

**剩余**：真机确认「时钟崩了」不再复现（尤其弱网 / SW 更新后首开）。

---

## #231 · 回桌面动态壁纸重新播放

**交付卷** `a17c3fb1` 在 main 祖先链（`ahead=289 / behind=0`）。

### 产物

| 文件 | 字节 |
| --- | --- |
| `ios-desktop/js/aosp/wallpaper-phase-clock.js` | 纯逻辑相位时钟（头注即 `#231`） |
| `ios-desktop/js/procedural-wallpaper.js` / `wallpaper.js` / `video-wallpaper.js` | 三通道在库 |
| `scripts/e2e-v231-wallpaper-resume.mjs` | 16307 |
| `tests/wallpaper-phase-clock.test.js` | 7970 |
| `tests/video-wallpaper-resume-guard.test.js` | 8015 |
| `tests/recent-preview-wallpaper.test.js` / `wallpaper-blur.test.js` / `wallpaper-subpage.test.js` | 在库 |
| `docs/v1034/` | 6 张（aurora/starry/sunset/video × 桌面 + 手机/平板 aurora） |

台账登记的交付数据：`e2e-v231` 6/6，jump **2.23~92.33**、恢复 **7~12ms**；本侧上一批 `fbb737e0` 明确写了「本轮未覆盖相位跳变，不据此关单」，本批也**只做静态面**，不跑相位时间线、不冒充验收。

### ⚠️ 一项仍未裁决的口径（本侧不动）

台账 #231 栏记有 **§7 口径裁决**：「动画结束后恢复」vs「同步起手」。这是行为语义选择，不是缺陷；两条路径的观感只能真机判断，属用户裁决权。

**剩余**：① 用户真机验收壁纸回桌面不再重播 ② §7 口径二选一。

---

## 三条共同的处置

- 逐条发**核验帖**（不是交付帖）：写明「静态面已坐实、真机确认项仍留你、不关单」。
- 不改标签、不动里程碑、不刷 #18（按 #80 瘦身）。
- **零运行时代码、零滚版**，本批只新增 1 份核验报告 + 1 份裁决落地文档 + 台账。

## 诚实边界

- 全部为 **commit 祖先链 + 当前树静态实读 + vitest**；无真机、无跨设备、无弱网/SW 更新后首开复现。
- `compare/<sha>...main` 的 `ahead` 是相对该 commit 的后续提交数，只证明「在祖先链、未被 revert 出主线」，不等价于「该文件的每一行都原样保留」；关键行已逐文件实读。
- 相关 vitest 8 文件 117 用例覆盖的是**逻辑核契约**，不是视觉回归；视觉面在 `docs/v1033` / `docs/v1034` 截图与用户真机。
- `#231` §7 口径未裁决前，不能把「6/6 通过」读成整卡完成。

关联：#225 #226 #231 #228 #235 `docs/open-issues-close-ledger.md` `docs/audits/launching-boot-audit.md`
