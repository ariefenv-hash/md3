# 信任模型与特权边界（#276 · v11.11 · R153 窗 · Job 2933040 · 第 2 定时消息系列）

> 纯文档卷 · 零 js 运行时面 · 零 tests 增量 · 滚版 v11.11 维持（#291 命名纪律注记：本文件为常青命名，随架构演进维护，非交付时点快照）。
> 数据真源 = `docs/audits/postmessage-inventory.json`（`scripts/gen-pm-inventory.mjs` 机械盘点生成件，行级+注释跳过口径，与 grep 去重口径零差异可复核）。

## 一、信任模型一条线

**内置子应用 = 可信同源全权。** `ios-desktop/index.html` 内 41 个 iframe 子应用全部**无 sandbox 属性**且与宿主同源——这不是疏漏，是当前架构的**显式依赖**：子应用经 `window.__vfs` / `window.__clipboard` 等宿主桥工作（#286 范式：`window.__<app>Core` 出口注册面 + 内联委托等值换算），加 sandbox 会全断。同源意味着子应用可达面包括：

- **宿主 DOM 全权**：读写父文档任意节点、注入样式、拦截事件；
- **localStorage 全权**：跨应用读写全部键（含宿主设置面 `ios-desktop:*` 与其他应用私有键，#283 四套并存现状）；
- **window.__\* 桥全权**：调用全部已注册出口（globals 生成件 264 键水位，v316-E 台账）；
- **同源 fetch/XHR**：以宿主 origin 访问任意同源资源（含 VFS 数据面）。

**外部站点 = 不可信。** 经 external-shell（#265 相关卷）等通道接入的外部内容仅做失联占位，无任何特权桥暴露；外部内容可达面以「零桥、零特权、渲染隔离靠浏览器同源策略」为边界——因其走外域 iframe 跨源加载路径，天然不可达宿主 DOM/localStorage。**本模型的前置断言：不存在「同一 iframe 内先可信后不可信」的混合内容**（应用市场第三方应用属未来课题，见 §四）。

## 二、postMessage 监听点盘点（87 点 · 三态）

全仓运行时面（`ios-desktop/` + 根三件，排除 `js/aosp/` vendor 参考目录）`addEventListener('message')` / `.onmessage =` 共 **87 处**，逐 handler 静态窗（30 行注释跳过）三态：

| 态 | 处数 | 判据 |
|---|---|---|
| origin-guard（origin 校验） | **0** | `e.origin ===/!==` 白名单比对 |
| data-whitelist（e.data 结构白名单） | **72** | `e.data.type/kind/cmd/action/channel` 等字段白名单分支 |
| bare（零校验曝光） | **15** | 直取 `e.data` 使用，无结构白名单无 origin 比对 |

**实锤结论**：全仓 **零 origin 校验**（议题原文「postMessage 通道有无 origin 校验——全部无记载」的盘点答案=0 处）；72 处依赖 e.data 结构白名单（同源架构下可接受的第一道闸），15 处 bare 逐点明细见 `postmessage-inventory.json`（含 file:line 定位，供后续卷渐进收紧，本卷不动运行时面）。

**发送面口径**：`postMessage(` 非注释调用 **101 处**，targetOrigin=`'*'` **73 处**（含 `apps/_shared/vendor/jszip.min.js` 第三方库内 2 处）、具体 origin **28 处**。同源架构下 `'*'` 不扩大跨源暴露面（数据本就同源可达），但接入跨源收件方时需逐点收敛（§四路线）。

**再生成**：`node scripts/gen-pm-inventory.mjs`（零时间戳逐字节可重现，--check 语义随 G6 门禁等强生成件纪律并入后续卷）。

## 三、特权桥与生成件台账关联

- `window.__*` 出口注册面：globals 生成件 264 键（随树再生，v316-E 水位在案）；
- iframe 应用清单：e2e:sweep 52 图标 / audit 41 应用+2 模板双口径（audit 为评分卡面，sweep 为桌面面）；
- 关联议题：#283（localStorage 键名四套——同源全权下的键面治理前置）、#275（CSP——若未来引入 sandbox 隔离，CSP 是第二道闸）、#274（innerHTML 分级——同源信任内的注入面清账）。

## 四、第三方隔离路线预告（#183 应用市场前置件 · 只预告不施工）

真正第三方应用接入时的最小隔离组合（按依赖顺序）：

1. **sandbox 属性白名单化**：`sandbox="allow-scripts"` 起步（禁 same-origin），宿主桥改 **postMessage RPC**（request-id 关联 + 结构化白名单 + 逐 handler origin 校验=§二 origin-guard 态成为硬闸）；
2. **特权桥最小面**：RPC 端点仅暴露 VFS 子目录/clipboard 显式授权面，零 localStorage 直通；
3. **CSP 第二道闸**（#275）：iframe `csp` 属性或宿主 report-only 起步；
4. 本卷 15 处 bare 监听点与 73 处 `'*'` 发送面为路线第 0 步的**现状基线**（渐进收紧不阻塞内置 41 应用）。

## 五、诚实边界

- 盘点为**静态窗口近似**（30 行注释跳过窗），跨行超窗 handler 的校验态以逐点人工复核为准（JSON 内 file:line 供复核）；三态判据是结构性匹配，非语义执行验证；
- 本卷零运行时改动——bare 15 点收紧、origin-guard 引入均属后续卷（议题处置建议①②③的文档化部分本卷收口，清单化渐进行动留后续认领，G1 一次一簇同律）；
- vendor（jszip 等）内调用不改（上游件纪律，#288 z-index 同律）。

关联：#276（本卷）/ #183 / #283 / #275 / #274 / #288 / #265 / #18 §2.1/§5/§9
