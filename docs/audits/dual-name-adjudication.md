# #271 裁决 · js/ × js/aosp/ 跨目录同名对对账报告

> 生成件：`docs/audits/dual-name-adjudication.json`（schema 1，`scripts/gen-dual-name-audit.mjs` 逐字节可重现，`--check` 单真源闸）。
> 守卫：`tests/v271-dual-name-guard.test.js`。数据时点：v11.44 卷（ce663de 后）。

## 一、裁决结论（卡面「唯一真源未裁决」的答复）

**三对同名模块不是重复实现，而是「aosp/ 纯逻辑核 + js/ 接线壳」分层范式的三个实例**：

| 对 | 壳（js/） | 核（js/aosp/） | 壳→核 import |
| --- | --- | --- | --- |
| bubbles | 377 行 · Bubble DOM 板（角标/小窗/抑制接线） | 190 行 · AOSP Bubbles 纯逻辑（canBubble/抑制语义） | ✅ `bubbles.js:42` |
| screen-pinning | 27 行 · 会话级单例桥（零 DOM） | 242 行 · AOSP ScreenPinningNotify/Request 1:1 移植 | ✅ `screen-pinning.js:14` |
| one-handed | 201 行 · DOM 面（变换/超时/触摸退出接线） | 245 行 · OneHandedController/State/TimeoutHandler 同构 | ✅ `one-handed.js:33` |

**唯一真源的裁决形式 = 分层契约，而非二选一**：核层（`js/aosp/`）承载 AOSP 1:1 语义（#147 移植总纲），壳层（`js/`）承载 DOM/会话态接线；卡面建议②的「另一侧归档改名或删除」**不适用**——两侧各司其职、缺一不可。防「静默分叉」的机制不是合并，而是：

1. 壳层头注明文声明核位（三对头注均有，见锚 `js/screen-pinning.js:2-4`「纯逻辑核 js/aosp/screen-pinning.js…单例桥」）；
2. 本守卫 `tests/v271-dual-name-guard.test.js`：**登记闸**（新同名对必须先登记）+ **契约闸**（壳必须 import 核）+ **守恒闸**（生成件与现树对账一致）。

## 二、运行时「到底加载谁」的实证答复（卡面诉求①）

- **全仓零 `<script src>` 加载两侧任一文件**（`index.html` / `ios-desktop/index.html` 两入口实查 0 命中，守卫 C1 锚钉扎）→ 纯 ESM import 图，**不存在卡面担心的「script 标签/import 顺序决定生效方」竞态**；
- 每个消费方的 import 路径**显式写明**取核还是取壳：

| 消费方 | 引用面 | 取的是 |
| --- | --- | --- |
| `js/main.js:25/36` | `initBubbles` / `initOneHanded` | 壳（入口接线） |
| `js/sidebubble.js` | pinCtl + bubbles 引用 | 壳 |
| `js/quick-settings.js` | one-handed 壳 | 壳 |
| `js/app-window.js:48` / `gestures.js:31` / `nav-bar.js:33` / `recent-apps.js:35` | `pinCtl` / `pinNotify` / `PINNING_STRINGS` | 壳（单例桥） |
| `js/notifications.js:51` | `isSuppressedFromShade` / `expandedIds` | **核**（纯函数） |
| `js/recent-apps.js:36` | `buildPromptBullets` / `resolveDescriptionVariant` | **核**（纯函数） |
| `js/gestures.js` | aosp/screen-pinning 引用 | **核** |

- 同文件同时取两侧（`recent-apps.js:35-36`）是**有意分工**：单例态走壳、纯函数走核——不是冲突。

## 三、「改了 aosp 侧没生效」风险的对账答复

壳 import 核三对全 ✅ → 改核必经壳的 re-export/桥接生效，或消费方直取核（纯函数即时生效）。**唯一失效面** = 壳层把核语义复制了一份自己的旧版（R3「零逻辑复制」指纹）——由 same-name-facade.test.js 四判据（同目录 js/mjs 对）与 v271 契约闸（跨目录对）联合钉扎。

## 四、卡面三建议核销

| 建议 | 兑现 |
| --- | --- |
| ① 完整 import/引用对账表 | ✅ 本件 + 生成件 JSON（消费方逐文件、两侧行数、import 真值） |
| ② 每对裁决唯一真源 | ✅ 分层契约裁决（核+壳）；改名/删除不适用，理由见 §一 |
| ③ 加守卫禁新增同名 | ✅ `tests/v271-dual-name-guard.test.js` 登记闸（现值 3 对白名单，新增即红） |

## 五、边界与诚实标注

- 消费方计数为**文本级引用扫描**（含注释内提及），非运行时 import 图快照；语义上宁可多计不少计（漏计会让守卫误绿）；
- 同目录 js+mjs 同名对（clock-core）归 `same-name-facade.test.js`（#270 裁决卷 §5.3 明文划界），本卡只管跨目录对；
- `apps/` iframe 全树参与扫描（自包含范式完整性），实态零 import js/ 侧——若将来出现，生成件会如实计数并触发守卫红（先登记后放行）。
