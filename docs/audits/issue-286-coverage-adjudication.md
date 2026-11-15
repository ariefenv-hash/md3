# #286 对账卷：core 提取范式覆盖率三建议逐条核销 + 独立复核报告

> 2026-11-15 · 实树 v11.37（adcab625）· 报告件（非生成件 · 零代码零滚版）
> 输入：卡面三建议 × 现树实测（`docs/test-coverage-matrix.md/.json` 生成件 + 全库 rg 独立复扫）。
> 方法：不信任生成器自报——独立 rg 实扫 `__\w*Core\s*=`（任意接收者形态）+ tests 消费面统计，与矩阵逐项对差，差额逐个溯源定性。

## 一、独立复核结果（与生成件对差）

| 项 | 矩阵自报 | 独立复扫 | 差额溯源 |
| --- | --- | --- | --- |
| `window.__*Core` 运行时桥出口 | 45 | **45**（首扫 41=漏 `root.__xCore=` 参数别名形态 4 个：diceCore/threesCore/shortcutsCore/contactsCore；复扫 46=多捕 `__quoteCore`） | **零差** |
| 被测试消费 | 45/45（100%） | **45/45（100%）** | **零差** |
| 未消费出口 | — | 空 | — |

**形态学发现（本卷唯一新增审计价值）**：core 提取范式实为**三消费形态**，矩阵口径=第①种：

1. **window 运行时桥**（`window.__xCore = ...` / iframe `window.__xxxCore` 注入 / `root.__xCore = ...` 参数别名多宿主形态——dice/threes/shortcuts/contacts 四核为例）：45 个，**全部被 vitest 沙箱消费（100%）**；
2. **ESM 直连**（`export const __quoteCore = {...}`，lock-quotes.js:265；vitest import 直驱非沙箱）：`__quoteCore` 1 个——命名带 `__` 前缀但走模块导入，矩阵头注「全量 window.__ 出口注册表属 #278 车道，本矩阵只取 window.__xxxCore 范式」如实排除，**非缺口**；
3. 混合（native 应用 settingsCore 等 window 桥 + iframe 内部直读）。

> 复扫教训登记：`root.__xCore =` 参数别名形态是 #286 续车道批次的可移植核惯例（同名核既挂 window 又可被测试以任意宿主提取），**单模式 rg 会漏 4/45（9%）**——审计扫描必须双模式（`window.__` + 任意接收者 `__xCore =`）。

## 二、卡面三建议逐条核销

### 建议① 出覆盖矩阵 —— ✅ 已交付且防腐

- `docs/test-coverage-matrix.md/.json` 生成件在库（单真源 `scripts/test-coverage-matrix.mjs`，禁手改；`--check` 逐字节防腐闸，v286 D3 锚在录）；
- **本窗六度随批再生实证**（v11.35→v11.37 各卷「生成件随树再生」）：应用 52=iframe 41+native 11 / core 45/45 消费 100% / 档位 full 44 / gap 0 / ref 8 / zero 0（P0 0）/ 测试文件 339；
- 应用 × core × 测试触达逐行矩阵在产（含 tests 目录引用数 + tests id 引用数两列）。

### 建议② 零触达应用按风险排序补提取 —— ✅ 已清零

- 矩阵 `zero_touch_risk_order` 字段在产（排序机制在库）；**现值空**（zero-touch **0**，高频 P0 **0**）；
- 清零路径 = #286 续车道**十三批**提取史（2026-11-09 第十三批 installer 轻量核+native 池收口收官，v11.00 `48f65b4`+`b5a4704`）+ 批间零散翻转（filesCore/phoneCore/notesCore/pdfCore/archiveCore 等本窗矩阵可见）；ref-only 8 家为「零函数面/纯静态模板」结构性暂缓（结构性硬提即硬造，mail R146 同律在录），非「未盘点」。

### 建议③ 矩阵纳入评分卡 H 项量化版 —— ✅ 已落地

- 档位计数即量化展示（core-full 44 / core-gap 0 / ref 8 / zero 0 / 消费率 100%）；`tests/v286-refonly-core.test.js` H3 锚定全局水位终态；#243 H 项「新建固有缺口」已被矩阵生成器收编为档位维度（新应用入库即入矩阵，gap/zero 自动曝光）。

## 三、对账结论与关单建议

**卡面三建议全部实质交付**（建议①②③ 证据如上；十三批施工史 + 本窗独立复核零差）。本卡自 v10.72 立卡以来驱动了：覆盖矩阵生成件 + 十三批 core 提取 + ref-only 池收口 + zero-touch 清零——范式价值实证（#226 时钟单点依赖崩塌 → clockCore 提取后 resilience 测试在录）。

**关单建议（终审权留用户，三选一）**：

| 选项 | 内容 |
| --- | --- |
| A 关单 | 三建议已交付且独立复核零差；后续新应用 core 提取由矩阵档位自动曝光（zero/gap 即红面），无本卡不可替代职责 |
| B 转跟踪 | 保留作为「新应用入库 → 矩阵档位核查」的常设车道（与 #77 Standing Sweep 合并考虑） |
| C 维持 | 留给后续 music 歌词簇等巨石拆分关联提取（#284 §3.2 联动面）——注：该联动已由 #284 卡面自载，本卡非必需 |

本卡**保持 open**，裁决权留用户（对账卷不代关）。

## 四、诚实边界

- 独立复扫以字面/AST 简化模式（`__\w*Core\s*=`）为口径，动态注册（`window['__x'+name+'Core']` 形态）不在捕获面——现树无此形态实证，若未来出现须双模式+动态面三扫。
- 「被消费」口径为测试文件内出现 `__<name>` 字面（与矩阵同口径），不代表断言强度；断言强度由各 core 测试文件自身密度承载（v286 各批锚数在录）。
- ref-only 8 家的「结构性暂缓」判定沿用各批交付帖实读结论，本卷未重新逐家复核（零函数面证据链在各批帖与 HANDOFF 卷）。

关联：#286 #228 #243 #226 #278 #77 #284 `docs/test-coverage-matrix.md` `scripts/test-coverage-matrix.mjs`
