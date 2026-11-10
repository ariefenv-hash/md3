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


## §7 批 3 交付卷（A 档收官评审 + e2e:pw 入 workflows 裁决 · R153 窗 · v11.10）

> R153 窗 · 2026-11-10 12:00 槽 · Job 2932311 · 第 1 定时消息系列 · 认领帖 6758742827 先于动工
> §4 批 3+ 路线兑现：A 档余 43 家逐脚本实读收官 + §6.3 e2e:pw 入册裁决留置项兑现

### §7.1 A 档余 43 家逐脚本评审批（头注逐家实读 · 禁机械判改）

43 家分五族实读结论（每家头注 `head -2` 实读，纠偏理由串含轮次/版本钉扎实据随 TIER_OVERRIDES 表）：

| 族 | 家数 | 实读证据形态 | 评审结论 |
| --- | --- | --- | --- |
| A 类 r 系列（a7/a8/a9） | 3 | 「R24/R28/R32=A 类…口径原样复验+新增面交叉抽证」轮次传承链 | 纠偏 A→B |
| B 类设备适配（b1–b9） | 9 | b1=「#77 Standing Sweep 第二轮·七档尺寸冒烟矩阵」+ b2–b9「R6–R33 轮次·折叠序列硬断言」 | 纠偏 A→B |
| C 类 UI 细节（c1–c8,c10） | 9 | c1=「第一轮检查项③·.m3-switch v7.39 规格钉扎」+ c2「第 5 轮·#78 全库审计」+ c3–c10「R10–R34 轮次判据」 | 纠偏 A→B |
| D 类性能（d1–d8,d10） | 9 | d1=「第三轮检查项①②③·帧预算 rAF 分布」+ d2–d10「R7–R35 轮次判据」 | 纠偏 A→B |
| R35 会话补收（u11） | 1 | 「R35 会话补收（v8.96=#85-F1/F3）小判据」 | 纠偏 A→B |
| **v 裸数族（v765–v785）** | 12 | 「v7.NN 真实浏览器核验」版本钉扎一次性卷；**机械正则缺口**——`e2e-vNNN.mjs` 无行为后缀缀点，V_PREFIX_RE（锚定 dash）不命中 | 纠偏 A→B（#291 命名纪律延伸批留改名通道，本批不扩权） |

**评审结论分账**：43 家全部纠偏 A→B——A 档自 45 收束至 **2 家真常青**（e2e-app-sweep / e2e-dist-smoke，
均已 runner-level 接入+直跑通道现役）。清单再生 **A 45→2 / B 185→228 / total 230 不变**；
43 家本体零触碰（只读盘点承诺延续）。A 档语义自此=「已评审常青真源注册表」：新脚本入库
要么真常青（A）要么 v 前缀（B），回归 A 档通道=升格批（改名+头注登记，§4.2 裁决纪律）。
v 裸数族机械缺口如实登记：V_PREFIX_RE 语义不动（锚定 dash 防 e2e-live-v779 类中段误判，
B2 锚钉扎），缺口经评审批纠偏通道闭合——机械判据与人工评审双轨各守其界。

### §7.2 e2e:pw 入 workflows 裁决（§6.3 留置项兑现）

**裁决：暂缓入册**（三维评估实录）：

| 维度 | 实据 | 结论 |
| --- | --- | --- |
| 时延 | e2e:pw 合流终树实录 7.1m（wrapper 4.6m+2.3m+native 11s）—— workflows 单 job 预算内但居首 | 可承受非阻断项 |
| 冗余 | wrapper 断言引擎=e2e:sweep/e2e:dist 本体——两引擎已在 workflows 直跑（referencedByWorkflows=true 双锚）+ App Sweep Daily 定时 run 现役（run 42748472371 success 实录） | **同面双跑纯冗余** |
| 并行预算 | wrapper 固定端口（8097/8088）+ workers=1 顺序纪律——CI 并行矩阵下与直跑 job 端口冲突面需隔离设计 | 需专项设计非顺手入册 |

**结论**：e2e:pw 维持本地/会话级验证通道（npm run e2e:pw 单命令等强复跑价值已兑现），
CI 面由直跑通道+定时 sweep run 覆盖同面。**复评触发条件**（任一命中即重开）：①直跑通道
退出 workflows；②native 全量面 spec 化落地（wrapper 冗余度下降）；③CI 分钟预算扩容专项批。

### §7.3 批 3 诚实边界

- 43 家纠偏系「轮次证据形态」判读——各家断言本体未逐条执行验证（只读评审：头注+写面+引用面
  三维），「轮次卷不可复跑绿」非实测结论，属形态判断（其判据钉扎 v7.x/v8.x 时点 UI 规格，
  与现树漂移为高概率事件；如实登记不硬造实测）；
- A 档收束为 2 家后，`counts.A` 锚（E4 算术闭合）继续有效；批 4+ 若升格 B→A（改名+头注），
  E2 锚 51 随评审卷演进重锚；
- C 档仍规则性 0（逐脚本功能对账批未立，禁机械判删红线维持）。


## §8 批 4 收官对账卷（卡面三建议全兑现对账 + 交接锚收束 · R155 窗 16:00 槽抢救重放交付 · v11.15）

> R154 窗 · 2026-11-10 14:00 槽 · Job 2932311 · 第 1 定时消息系列 · 认领帖 6760544132 先于动工
> 卡面「处置建议」三项逐项对账全兑现 → 收官 close（#72/#73/#74 收官先例同律）；
> 升格批 / native spec 化 / e2e:pw 入册三条按需通道在录可复开——收官非通道删除。

### §8.1 卡面三建议逐项兑现对账表

| 卡面建议 | 兑现卷 | 兑现证据 | 对账结论 |
| --- | --- | --- | --- |
| ① 引入 playwright.config：retries=2、失败 trace+截图 on-retain、reporter=list/html | 批 1 `v11.06=11a798d2` | 五契约锚 A1–A5（retries=2 / trace retain-on-failure / screenshot only-on-failure / reporter list+html(open:never) / testDir e2e-specs）+ npm e2e:pw 入册（A6 批 2 摘旗后裸命令） | **全兑现** |
| ② 227（现值 230）脚本分三档登记：常青回归 / 一次性取证 / 已覆盖删除 | 批 1 清单化 `v11.06` + 批 2 前十评审 `v11.09` + 批 3 收官评审 `v11.10` | gen-e2e-inventory.mjs 三档生成器 + e2e-inventory.json 230 家逐 file:line + TIER_OVERRIDES 51 行逐行实读理由（§6.1 十行表 + §7.1 五族表双评审卷）；终态 **A=2 / B=228 / C=0（规则性）** | **全兑现**（C=0 系规则性登记，删除须逐脚本功能对账卷背书——红线维持） |
| ③ 不一次迁完：先 config 骨架 + 前 10 常青接入，其余渐进 | 批 1 骨架空跑零行为变更 + 批 2 首批 spec 三件 + 摘旗 `v11.09` | §6.2 三件（shell-lifecycle native / app-sweep / dist-smoke runner-level）+ `playwright test` 现要求 4 锚/3 件全绿（E5/E6/E7 钉扎） | **全兑现**（渐进剩余=按需升格通道，非卡面欠账） |

### §8.2 卡面「问题」两点对账

1. **retries/sharding/report/trace 全缺位** → retries=2 + trace retain-on-failure +
   screenshot only-on-failure + reporter list/html 已落 config；**sharding 有意未引入=
   契约选择非缺位**：workers=1 顺序纪律是现行契约（app-sweep 8097 / dist-smoke 8088
   固定端口子进程并行必撞，E6 钉扎）——CI 并行矩阵端口隔离留专项批设计，先行并行分片
   与本契约冲突；统一 report 面=html reporter + 失败 trace/截图归档（e2e:pw 本地/会话级
   通道现役，CI 面直跑通道维持批 3 §7.2 裁决）。
2. **命名/入口无清单** → e2e-inventory.json 230 家逐行 file:line + 档位 + tierOverride
   理由，常青/一次性取证一眼可查；与配套议题 #291 联动面（v 裸数族 e2e-v765…v785 改名）
   留 #291 命名纪律延伸批（批 3 §7.1 登记，本卷不扩权）。

### §8.3 收官终态与按需通道（交接锚收束）

- **终态**：A=2（e2e-app-sweep / e2e-dist-smoke 双真源，runner-level 接入 + 直跑通道
  现役）/ B=228（一次性取证标记归档，可运行保留零删除）/ C=0（规则性登记）；e2e:pw
  本地闸 4/4 全绿现役；workflows 面由直跑通道 + App Sweep Daily 定时 run 覆盖同面
  （批 3 §7.2 三维裁决维持）。
- **按需通道三件**（收官后在录，非欠账）：①**升格批** B→A（改名+头注登记，§4.2 裁决
  纪律，E2 锚随评审卷演进重锚）；②**native 全量面 spec 化**（批 2 诚实登记=重负载全量
  面收益低风险高，逐脚本评审通道在）；③**e2e:pw 入 workflows**（复评触发条件三选一：
  直跑通道退出 workflows / native 全量面 spec 化落地 / CI 分钟预算扩容专项批——任一
  命中重开）。
- **C 档开启前置**：逐脚本功能对账卷先立（禁机械判删红线，批 1 §5 登记延续）。

### §8.4 批 4 诚实边界

- 收官=**卡面三建议对账闭合**，非「230 家全量 spec 化完成」——230 家本体零删除零改写
  零改名承诺自批 1 起四批一贯（C6 锚维持）；
- 本卷零 runtime/js 面、零 spec 行为变更：仅 adoption 收官节 + tests 收官锚组 + 滚版
  stamp + 生成件随再生；
- close 后若按需通道命中复开（升格批/native 复评触发），按 #18 §7.6 惯例直接开新批
  评论续卷，历史锚面零回改。
