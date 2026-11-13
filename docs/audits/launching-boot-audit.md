# `L A U N C H I N G` 实证报告：根壳启动屏两层辨析 + P0 当前树补证

> 触发：用户再次贴出站点摘要「安卓16极客 / L A U N C H I N G」。此前若干轮把这一屏与 #225 的「应用窗口启动画面常驻遮挡」混作一处，本轮用**真实 Chromium 三次冷启动采样**把两层钉死，并顺带对四条 P0 做当前树自动化补证。
>
> 环境：本地 `scripts/serve.mjs`（`--no-open`）+ 系统 `/usr/bin/google-chrome`，390×844 视口，`TZ=UTC`，无缓存冷启动。线上 Pages 通道在本沙箱被出口策略 403 拦截（见 §五）。**纯实证、零代码改动**。

## 一、用户所见属实，且是设计行为

摘要工具/用户快速访问时抓到的文本 `安卓16极客 L A U N C H I N G`，就是根壳 `index.html` 的 `.splash`（`z-index:50`，9 个 `.uiv-launch-letter` 逐字母动画 + 品牌绿火箭）。

三次独立冷启动采样（每 200ms 一帧，直到淡出完成后 700ms）：

| 轮次 | splash 开始隐藏 | `visibility:hidden` 完成 | 前段可见文本 |
|---|---|---|---|
| 1 | **3978 ms** | 4806 ms | 安卓16极客 L A U N C H I N G |
| 2 | **3605 ms** | 4405 ms | 同上 |
| 3 | **3143 ms** | 4004 ms | 同上 |

**入库脚本 `scripts/e2e-launching-splash.mjs` 落库后复跑的第四组**（同一源码树、同一浏览器）：splash 隐藏 **3611 / 3757 / 3550 ms**，52 个图标挂载于 3325 / 3481 / 3406 ms，`visibility:hidden` 终态、三轮 `pageerror=0`，与首组同量级、结论一致。两组数据分别留证，不做合并平均（冷启动时序受进程起服影响，逐轮如实登记更有意义）。

即：**LAUNCHING 可见窗口约 3.1 ~ 4.8 秒**。0~2.4 秒的所有采样帧均为 `opacity:1 / visibility:visible`，`pageerror` 各轮全为 0。

结论：这不是「页面卡在启动页」，而是**启动屏正常覆盖桌面加载期**；抓取发生在动画完成之前。

## 二、两层启动屏辨析（本卡最重要的一节）

| | **L1 根壳 splash** | **L2 应用开窗启动画面** |
|---|---|---|
| DOM | `#splash` / `.splash-hide`（`index.html:226`） | `.app-launch-screen` / `state.launchScreenReleased` |
| 所在文档 | 根壳 `index.html` | `ios-desktop/index.html` 内（`app-window.js`） |
| 出现时机 | 页面导航即显示 | 点击应用图标开窗 |
| 释放机制 | `frame.addEventListener('load', hideSplash)` + `setTimeout(hideSplash, 3000)` 兜底 → 加 class → CSS `0.45s` 淡出 | #225 看门狗：`LAUNCH_SCREEN_RELEASE_MS=520` 独立释放 + 稳态强制写 `opacity=0` |
| 关联议题 | **无既有议题**（本卡首次纳入辨析） | **#225**（v10.33 修复） |

**关键纠正**：#225 修的是 **L2**，不是 L1。两者 DOM、层级、释放机制、代码位置全不同。**L1 显示 3~4 秒 ≠ #225 回归**。此前把「LAUNCHING 启动屏」称作「#225 修过的 launchScreen」属层级混淆，本卡以实测更正，后续勿再据此判断 #225 状态。

## 三、为什么 splash 要盖 3~4 秒（不是卡顿）

同一探针同步采样桌面 iframe（`#sim-iframe`）的 `readyState` 与 `.app-icon` 数量：

| 轮次 | `interactive` | 图标 0 → 52 | iframe `complete` | splash 隐藏 |
|---|---|---|---|---|
| 1 | ~1315 ms | **3705 ms** | 3978 ms | 3978 ms |
| 2 | ~1460 ms | **3458 ms** | 3605 ms | 3605 ms |
| 3 | ~1224 ms | **2849 ms** | 3143 ms | 3143 ms |

桌面文档虽在 1.2~1.5 秒就 `interactive`，但 **52 个应用图标直到 2.8~3.7 秒才挂载完成**；iframe 的 `load` 事件与之同帧，splash 在 `complete` 当帧即隐藏。

结论：**splash 精确覆盖了桌面尚未渲染出图标的时间，没有不必要的滞后**。释放由 `frame load` 主导，固定 3s 兜底与之接近（内联脚本实际执行时点使 wall-clock 略晚于 3s，故三轮均未由兜底提前触发）。

## 四、四条 P0 当前树自动化补证

| 议题 | 交付帖留的口子 | 本轮实证 |
|---|---|---|
| **#225** | 「建议保留 open 待用户跨设备真机实测确认」 | 点应用图标后 `.app-window` = **390×844 全屏**、`class="app-window open"`、`launchOpacity=0`、内部文档 **115183 字符**；未复现 44×44 / 启动画面常驻遮挡 |
| **#226** | 五条加载顺序韧性修复 | 直载 `ios-desktop/apps/clock-app/index.html`：`pageerror=[]`、`window.__clockCore` 就绪、5 个 tab + 「早起闹钟 / 工作日闹钟」正常渲染、`#clockCoreErrorMask` 未出现；未复现整图崩塌 |
| **#228** | 三合一制度改造（认领帖在案，无交付帖） | 本轮未做 41 应用评分卡复跑，如实登记未覆盖 |
| **#231** | 「议题可关待用户验收」 | 本轮未做壁纸相位跳变复现（需视频壁纸素材 + 长时间线），如实登记未覆盖 |

**关单口径**：四条交付帖均明确「待用户跨设备真机实测 / 待用户验收」，关单权留用户。本卡**不擅自关闭任何一条**，只提供自动化可覆盖部分的补证基线。

## 五、线上同源确认

- 动态通道：Playwright 直访 `https://ariefenv-hash.github.io/md3/` 返回 `{"title":"Request denied","status":403}` —— 与 `git push` 同属本沙箱出口策略限制，**非站点故障**。
- 静态比对：`GET /repos/ariefenv-hash/md3/contents/index.html?ref=gh-pages` 解码得 **9184 B**，与本地 `dist/index.html` **9184 B 逐字节一致**；压缩后脚本 `e.addEventListener("load",n),window.setTimeout(n,3e3)` 与源码 `index.html:261-262` 的 `frame.addEventListener('load', hideSplash)` + `window.setTimeout(hideSplash, 3000)` 同逻辑。
- `gh-pages` 最后部署 `2026-11-13T15:30:47Z`，已含本批之前全部提交。

即：本地源码服务实测结论**适用于线上**，两层 splash 逻辑同源。

## 六、一处边界风险登记（不擅自改，留维护者裁决）

源码 `index.html:260-262` 注释：「iframe 就绪淡出；兜底：若 onLoad 因缓存等边缘情况未触发，最多 3 秒后也隐藏，绝不卡住」。

但 §三 实测显示**桌面图标挂载需 2.8~3.7 秒**，慢于 3 秒的场景下，兜底会先撤掉 splash，露出尚未渲染完的桌面（约 0~0.7 秒窗口）。本轮三次均由 `frame load` 主导、未触发「提前露出」，但这是**时序竞态而非保证**；不同设备/网络/缓存态下可能翻转。

**不改代码的理由**：「宁可提前露出也不卡死」是既有明确取舍（注释原文），且 §二 已澄清这不是 #225 回归；改动启动态需跨设备真机核，超出本卡实证范围。

**可选改进方向**（若维护者决定处理，另立卡）：把释放条件改为「桌面图标挂载计数 ≥N **或** iframe load」双条件，兜底延长到 6~8 秒并给可见失败面；或首帧就绪即淡出但保留 `pointer-events:none` 半透明覆盖层。

## 七、复现方式

```bash
# 终端 1：起源码服务
node scripts/serve.mjs --no-open --port 8081

# 终端 2：真实浏览器探针（常青命名，无版本前缀）
MD3_CHROME=/usr/bin/google-chrome node scripts/e2e-launching-splash.mjs

# 线上静态同源比对
curl -s -H "Authorization: Bearer $GH_TOKEN" \
  "https://api.github.com/repos/ariefenv-hash/md3/contents/index.html?ref=gh-pages" \
  | jq -r .content | base64 -d | sha256sum
sha256sum dist/index.html
```

探针输出含三轮 `splashHiddenAt`、桌面图标挂载时刻、开窗终值、时钟直载 `pageerror`，退出码 0 = 全绿。

## 八、验收

- [x] 三次真实 Chromium 冷启动采样，给出 splash 可见窗口与淡出完成时点
- [x] L1 / L2 两层启动屏辨析成文，纠正历史层级混淆
- [x] 桌面图标挂载时序实证，判定 splash 无不必要的滞后
- [x] #225 / #226 当前树自动化补证；#228 / #231 未覆盖如实登记
- [x] 线上动态通道限制 + 静态同源比对双通道留证
- [x] 3s 兜底边界风险登记，明确不改代码及理由
- [x] 零运行时代码改动、零滚版、不擅自关闭任何 P0

关联：#225 / #226 / #228 / #231 / #77 / #18 / #291
