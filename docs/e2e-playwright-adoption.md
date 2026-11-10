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

## §6 批 2 交付卷（渐进批 · R152 窗 · v11.07）

> R152 窗 · 2026-11-10 10:00 槽 · Job 2932311 · 第 1 定时消息系列 · 认领帖 6757125007 先于动工
> §4 批 2 路线兑现 + §2 摘旗交接锚兑现 + §5 纠偏通道启用

### §6.1 A 档前 10 家逐脚本评审批（写面 / 时延 / 断言强度三维实读）

清单序取前 10（`docs/audits/e2e-inventory.json` A 档序），逐脚本实读结论：

| # | 脚本 | 行数 | 写面 | 断言强度 | 时延/依赖形态 | 评审结论 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | e2e-app-sweep.mjs | 384 | --shot 可选+失败截图 | 强（52+ 应用×三通道+基线闸+退出码） | 分钟级；自起服 8097 | **常青真源 → runner-level 接入** |
| 2 | e2e-dist-smoke.mjs | 335 | 无（读 precache） | 强（部署档三防线+precache HTTP+关键资源） | 分钟级；dist 前置 | **常青真源 → runner-level 接入** |
| 3 | e2e-live-v779.mjs | 207 | 截图落绝对路径 | 中（线上实拍断言） | **外网 github.io 依赖 + SW 版本钉扎 geek-v88** | 纠偏 A→B（v7.79 时点一次性取证） |
| 4 | e2e-probe-panel.mjs | 59 | 截图落绝对路径 | **无（console 打印观察）** | 轻量 | 纠偏 A→B（无断言诊断探针） |
| 5 | e2e-probe2.mjs | 57 | 无 | **无（时间线插桩打印）** | 轻量 | 纠偏 A→B（无断言诊断探针） |
| 6 | e2e-sweep-a1-compat.mjs | 238 | sweep 截图目录 | 中（轮次时点断言：-webkit- 22 处等） | 自起服；**ROOT 绝对路径硬编码** | 纠偏 A→B（Standing Sweep 第 4 轮批次取证） |
| 7 | e2e-sweep-a2-compat-r8.mjs | 160 | 无 | 中（R8 修复处断言） | 自起服 8094 轮次硬编码 | 纠偏 A→B（R8 轮次卷） |
| 8 | e2e-sweep-a4-compat-r12.mjs | 183 | 无 | 中（R12 computed 抽证） | 自起服 8100 轮次硬编码 | 纠偏 A→B（R12 轮次卷） |
| 9 | e2e-sweep-a5-compat-r16.mjs | 205 | 无 | 中（R12 复验+R16 增量） | 自起服 8100 轮次硬编码 | 纠偏 A→B（R16 轮次卷） |
| 10 | e2e-sweep-a6-compat-r20.mjs | 245 | 无 | 中（R17/R18/R19 交叉抽证） | 自起服 8100 轮次硬编码 | 纠偏 A→B（R20 轮次卷） |

**评审结论分账**：前 10 家中真常青 2 家（#1/#2，各有 npm+workflows 现役通道）+ 纠偏 8 家
（外网依赖 1 / 无断言探针 2 / 轮次批次取证 5）。纠偏经 `scripts/gen-e2e-inventory.mjs`
`TIER_OVERRIDES` 表化（逐行实读理由随表），清单再生 **A 53→45 / B 177→185 / total 230 不变**；
被纠偏脚本本体零触碰（只读盘点承诺延续）。A 档余 45 家留批 3+ 继续评审（前 10 之外的
sweep compat r 系列按同判据大概率同判，批 3 逐脚本实读后落表）。

### §6.2 首批 spec 接入（两种接入形态）

| spec | 形态 | 等强语义（G6） |
| --- | --- | --- |
| `e2e-specs/shell-lifecycle.spec.js` | **native 原生**：fixtures+expect 重表达 | 断言口径逐字镜像 e2e-app-sweep.mjs（三防线正则/ERROR_TEXT_RE/JS el.click/back-btn 关窗），单应用链路+boot 三防线；与 sweep 直跑通道分层互补零重复 |
| `e2e-specs/app-sweep-regression.spec.js` | **runner-level**：子进程承载断言引擎 | `e2e-app-sweep.mjs` 本体即断言真源，退出码+汇总行等强透传；本体零删除零改写零改名 |
| `e2e-specs/dist-smoke-regression.spec.js` | **runner-level**：子进程承载断言引擎 | `e2e-dist-smoke.mjs` 本体即断言真源，退出码+汇总行等强透传；dist 缺位显式 skip（构建后闸前置条件，不静默假绿；e2e:dist 直跑通道 workflows 侧仍强执） |

**接入形态诚实登记**：runner-level=运行器级整合（retries/report/trace/单命令收益落到
既有引擎上），非断言重表达；native 全量改写（52 应用逐家 spec 化）留批 3+ 逐脚本评审
执行——本批不做 1:1 端口（重负载全量面 spec 化收益低风险高，直跑通道现役全绿）。

### §6.3 摘旗与 config 契约扩展

- npm `e2e:pw`：`playwright test --pass-with-no-tests` → `playwright test`（§2 交接锚兑现；
  `playwright test` 现要求 e2e-specs/ 至少发现并全绿通过首批 4 锚/3 件）；
- config `workers: 1` 顺序纪律新增：app-sweep(8097)/dist-smoke(8088) 固定端口子进程
  并行必撞——顺序执行=端口纪律+确定性内存足迹（批 2 契约，E6 锚钉扎）；
- e2e:pw **仍未入 workflows**：CI 引入前须评估 runner 分钟级时延与并行预算，
  入册时机留批 3+ 评审（本批直跑通道与 e2e:pw 双闸并存，等强由实跑对账保证）。

### §6.4 等强对账实录（本窗门禁）

npm run e2e:sweep（直跑通道）与 app-sweep-regression spec、npm run e2e:dist（直跑通道）
与 dist-smoke-regression spec 同窗各自实跑——四者须同为 0 fail，结论等强由实跑值对账
非声明（数值随 #272 交付帖+#18 窗报登记）。

