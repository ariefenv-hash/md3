# e2e playwright 化立卡卷（#272 批 1 · 骨架 + 三档清单化）

> R151 窗 · 2026-11-10 08:00 槽 · Job 2932311 · 第 1 定时消息系列 · 认领帖 6755454144 先于动工
> 交付卷 v11.06（滚版卷：config 骨架 + npm 入册 + tests 增量 + 生成件随树再生）

## §1 背景与卡面建议对账

#272 实测：`scripts/e2e-*.mjs` 均为裸脚本直用 playwright（230 家 `import { chromium } from 'playwright'`
逐字节同形），仓库无 `playwright.config.*`——retries/sharding/report/trace 全缺位。卡面建议三条：

| 卡面建议 | 本批处置 |
| --- | --- |
| ① 引入 playwright.config（retries=2、失败 trace+截图 on-retain、reporter=list/html） | **本批兑现**：`playwright.config.js` 骨架落库 |
| ② 227 脚本分三档登记（常青回归 / 一次性取证 / 已被 smoke 覆盖） | **本批兑现**：`scripts/gen-e2e-inventory.mjs` + `docs/audits/e2e-inventory.json` 生成件 |
| ③ 先 config 骨架 + 前 10 个常青脚本接入，其余渐进 | **留渐进批 2**：本批零 spec 接入（见 §4 路线），落点目录 `e2e-specs/` 已立 |

**账面如实登记**：卡面证据时点 227 家，本批生成时点现值 **230 家**（v10.72 盘点后 sweep 族增量
3 家）——以生成件 `counts.total=230` 为准，卡面数字不回改（证据表时点快照纪律）。

## §2 骨架契约（playwright.config.js）

| 契约项 | 值 | 依据 |
| --- | --- | --- |
| `testDir` | `./e2e-specs` | 本批新建目录，仅 README 占位零 spec——`playwright test` 零发现零执行 |
| `retries` | `2` | 卡面建议①逐字 |
| `use.trace` | `retain-on-failure` | 卡面建议①（失败 trace 保留） |
| `use.screenshot` | `only-on-failure` | 卡面建议①（失败截图保留） |
| `reporter` | `list` + `html(open: never)` | 卡面建议①（CI 可读 + 本地可查，不自动开浏览器） |
| npm `e2e:pw` | `playwright test --pass-with-no-tests` | 空 spec 期显式空跑通过；**首批 spec 接入后摘除该旗标**（渐进批 2 交接锚） |

**零行为变更证明义务**：既有裸脚本三通道全保留——npm `e2e:dist`（dist 部署档冒烟）、
npm `e2e:sweep`（52 应用 sweep + 基线对比闸）、`node scripts/e2e-*.mjs` 直跑；本批对
230 家脚本本体**零删除零改写零改名**（只读盘点承诺，生成件 `read_only_pledge` 字段在案）。

## §3 三档规则与判据（生成器纯逻辑层）

机械判据单一真源 = 生成器导出件（`V_PREFIX_RE` / `classifyTier` / `detectArtifactSignals` /
`buildInventory` / `verifyArtifact`），缺省规则如下：

- **A 常青回归候选**：文件名无 `e2e-vNNN[a-z]?-` 前缀（v\d+[a-z]?- 同族正则，#291 命名纪律同族；
  前缀锚定——`e2e-live-v779.mjs` 类中段引用不算前缀）。本批 53 家。**「候选」非「判定」**：
  接入 config projects 前须逐脚本评审（写面/时延/断言强度），渐进批执行。
- **B 一次性取证**：文件名有 v 前缀（vNNN[a-z]?-）。本批 177 家。处置=标记归档、可运行保留；
  改名属 #291 命名纪律延伸批（v11.02 改名机械批 scope=tests/，scripts/ 未纳入——如实登记不扩权）。
- **C 已被 smoke 覆盖删除候选**：**机械不可判**——「功能被 smoke 覆盖」须逐脚本功能对账
  （断言面 vs e2e:dist/e2e:sweep 覆盖面），本批规则性记 **0** 并禁止机械判删（#291 谳「不修正即
  保全」同律：删除是不可逆处置，须 issue 卷对账批背书）。

登记事实字段（非档位判据）：`lines` / `importsPlaywright`（230/230）/ `writesArtifacts`
（信号集 `--update`/`--write`/`writeFileSync(`/`--snapshot`，本批 15 家——接入评审必查写面行为）/
`referencedByNpm`（2 家：e2e-app-sweep、e2e-dist-smoke）/ `referencedByWorkflows`（同 2 家）。

生成件纪律：内容全派生零时间戳逐字节可重现 + `--check` 逐字节校验（check:docs-index 同律）；
`verifyArtifact` 对账闸=新增/删除脚本而清单未再生必被咬住（tests 负向锚钉扎）。

## §4 渐进路线（本批后）

1. **批 2（渐进批·滚版卷）**：A 档取前 10 家（卡面建议③）逐脚本评审 → 改写为
   `e2e-specs/<特性名>-<行为>.spec.js`（#291 常青命名纪律）→ `npm run e2e:pw` 与裸脚本直跑
   结论等强（G6 同律）→ 摘除 `--pass-with-no-tests`；被接入脚本本体在 spec 门禁等强落地前
   **不删除**（B 档处置同律）。
2. **批 3+（多窗渐进）**：sweep compat 族（A 档 r 系列）逐簇接入；B 档按交付时点价值挑选
   升格常青（升格=改名+头注登记，同 #291 裁决纪律）；C 档开启须先立逐脚本对账卷。
3. **异槽约束**：本车道与 settings.js 拆分批（#284 §5 批 2+）异槽并行——e2e 通道改造期间
   拆分批照常推进，互不占槽（#284 边界图 G8 同律）。

## §5 诚实边界

- C 档 0 家系**规则性登记**非实测结论——「已被 smoke 覆盖」未做任何逐脚本功能对账；
- A 档 53 家含 sweep compat r 系列（r6/r12/r16… 疑似批次证据形态）——机械命名判据如实
  收录为候选，档位纠偏留逐脚本评审批（纠偏=生成器 OVERRIDES 表化，#291 KEEP 先例同律）；
- 卡面 227 vs 现值 230 漂移一笔如实登记（§1）；`--pass-with-no-tests` 旗标摘除责任在渐进批 2；
- 本批零 spec 接入：`playwright test` 现网零发现，不产生任何 CI 门禁新依赖（e2e:pw 未入
  workflows，入册时机留渐进批 2 一并评审）。
