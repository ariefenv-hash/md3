# 新增应用视觉准入基线（docs/visual-admission-baseline.md）

> **议题**：#243（建议①清单定义 + ②挂接 CI + ③脚手架新建即达标 + ④存量排期引用）· **交付窗**：R128→R129（2026-11-08 · Job 2932311）· **树**：v10.68（#261 批 1 word + 批 2 chess + 批 3 driving + 批 4 piano/reaction 升档同步更新 · 新增组 100% 关单）
> **真源声明**：判定口径真源 = `scripts/audit-app-quality.mjs`（#229 摸底 → #230 制度化 → #244 建议③ 9 项制）；分组口径真源 = `docs/visual-token-adoption.md`（10-04 bulk 21 = 存量基线 / 10-26 起逐个创建 20 = 新增批次，git 首提日期逐一复核）。**本议题不重写 #228/#230 的 lint 与评分卡实现**，只做清单收口、CI 挂接与准入承诺实证。
> **机器可读快照**：`docs/visual-admission-baseline.json`（audit --json 实跑数据 + 分组合并；分档回退由 `scripts/quality-baseline.json` 门禁守护，本快照不锁死 tier 值）。

## 一、准入口径：新增应用视觉基线九项（机器可核对）

评分卡 9 项（A–I）即准入清单本体，判定语义见 `audit-app-quality.mjs` 头注（本表仅索引，不重复定义）：

| # | 项 | 门槛索引 | 新建应用要求 |
|---|---|---|---|
| A | MD3 色彩密度 | `var(--md-` ≥15 且 ≥4 处/100 行 | 生成即过（模板携带） |
| B | 响应式+平板分栏 | `@media ≥1` 且 760px 块内实质布局差异 | 生成即过（multi 模板 760 分栏示范） |
| C | `__system` SDK 接入 | 真实调用 ≥1（剔除注释） | 生成即过（app.mjs 示范调用） |
| D | 形态语言单源 | range 全命中 `.mdslider` 组件 | 生成即过（硬门禁保护） |
| E | 无障碍锚 | aria-/role=/alt=/tabindex ≥3 | 生成即过 |
| F | 视觉动效 | transition/animation/@keyframes ≥3 | 生成即过 |
| G | 数据持久化 | localStorage/indexedDB/`__system.fs` ≥1 | 生成即过 |
| H | 测试覆盖 | tests/ 正文引用 ≥1 | **随首份测试落盘闭合**（新建固有缺口） |
| I | 视觉令牌接入 | 状态层或（形状≥2 且字体契约） | 生成即过 |

**准入线**：新增应用目标 **9/9 全达标**（严于存量 ≥7 达标线）；脚手架承诺 = **视觉八项 A/B/C/D/E/F/G/I 生成即全部通过**。

**#294 扩展目标线（v10.99）**：新增组在 9/9（A–I）之上叠加 J 项触控命中区证据目标 **10/10**——J 项为报告级并行段（分档曝光不拦截，#243 先例同律），判据与实测横切见 §五；J 不改 9 项制阈值与分数语义，不进 quality-baseline/visual-baseline 两把锁。

**新建即达标实证（v10.62 树 · R128 窗实测）**：
- `node scripts/new-app.mjs admission-probe "准入探针"`（单文件）→ audit **8/9 达标档**，唯一缺口 H（测试覆盖——新建应用固有状态，非视觉缺口）；
- `node scripts/new-app.mjs admission-probe2 "准入探针二" --multi`（多文件）→ audit **8/9 达标档**，唯一缺口同 H；
- 实测后探针已删除，全库恢复 41 应用 tally 24/17/0。
- 双脚手架模板同审长期达标（`app-template` / `app-template-multi` 均 9/9，audit `templates` 字段持续曝光；#244 建议② R124 已补齐模板三面示范）。

## 二、CI 挂接：分档曝光非硬阻断（#235 教训）

- **部署工作流** `.github/workflows/deploy.yml` 的 `test` job 增步骤 **App quality audit (#243)**（vitest 门禁与注释核对之后）：`node scripts/audit-app-quality.mjs`。
- **非硬阻断边界**：分档输出（达标/偏薄/严重）恒 warn 曝光不拦截部署；仅两类**既有**硬门禁保持 fail 面（#227 D 滑块单源门禁 + quality-baseline 基线回退门——任何阶段都硬 fail，属 #230 制度固有强度，非本议题新增）。
- **新增应用自动纳入**：#228 要求⑤ readdir 全量扫描，落盘即受检，零白名单（`checked` 恒等于实际目录数）。
- 本地入口：`npm run audit:app`（package.json 新增 script）。
- 部署成功率：步骤默认 exit 0（当前树 hardFailures=0），不引入新硬门禁，#235「门禁连红→部署全跳过」不复现。

## 三、基线横切快照（v10.62 树实跑 · 可公示数值）

| 组 | 达标 | 偏薄 | 达标率 | 均分 |
|---|---|---|---|---|
| **新增批次（20）** | **15** | 5 | **75%** | 7.90 |
| 存量基线（21） | 9 | 12 | 43% | 6.10 |
| 全体（41） | 24 | 17 | 58.5% | 7.00 |

**v10.64（#261 批 1）更新**：word 6/9 → **9/9** 达标（B 760 双栏 + C emit/notify 双通道 + D pressRipple），新增组 **16/20 = 80%**，全体 25/41 = 61%。
**v10.65（#261 批 2）更新**：chess 6/9 → **9/9** 达标（B 760 grid 第二断点 + D pressRipple 升变行 + I 状态层破零），新增组 **17/20 = 85%**，全体 26/41 = 63.4%。
**v10.66（#261 批 3）更新**：driving 6/9 → **9/9** 达标（C 交卷 notify+emit 双通道 + D pressRipple chips 行 + E 无障碍 4 处真实语义），新增组 **18/20 = 90%**，全体 27/41 = 65.9%。
**v10.68（#261 批 4）更新**：piano 4/9 → **9/9**、reaction 4/9 → **9/9** 双双达标（B 760 真分栏 + C SDK 双通道 + D pressRipple + E 无障碍 + I 状态层五面全补），**新增组 20/20 = 100% 全量达标 · #261 达成关单条件**，全体 **30/41 = 73.2%**（存量 10/21；shortcuts 已随 R128 窗批次升档，存量余量 12→11 家）。

**里程碑曲线**：新增组达标率 **10%（#229 时点）→ 75%（v10.62）→ 80%（v10.64 批 1 word）→ 85%（v10.65 批 2 chess）→ 90%（v10.66 批 3 driving）→ 100%（v10.68 批 4 piano/reaction · 五段收官）**，反超存量 52+ 个百分点——P0 3 家（v10.53）+ P1 13 家（v10.57/v10.58）+ #261 批 1/2/3/4（word/chess/driving/piano/reaction）销号直接入账。严重档全库清零（#229 时点 3）。**新增组准入车道任务全量完成**。

**新增组逐项通过率（v10.68 实跑）**：A 20/20 · B 20/20 · E 20/20 · F 20/20 · G 20/20 · H 20/20 · I 20/20 · C 19/20 · D 18/20——C/D 仅存的两处缺口在新进 20 家之外的早批次（历史成因，归存量车道）；本批 4 五面全补后 piano/reaction 双双 9/9，新增组零缺口收官。

## 四、余量排期（v10.68 实跑 11 偏薄，与新增车道分开）

### 新增组余量（准入车道直营 · #261 承载，按缺口升序）

| 应用 | 分 | 缺口 | 整改指向 | 状态 |
|---|---|---|---|---|
| word | ~~6/9~~ | ~~B C D~~ | ~~760 分栏 + SDK + 形态锚~~ | ✅ **批 1 已完成（v10.64）**：760 网格双栏 + emit/notify 双通道 + pressRipple，9/9 零缺口 |
| chess | ~~6/9~~ | ~~B D I~~ | ~~760 分栏 + 形态锚 + I 令牌~~ | ✅ **批 2 已完成（v10.65）**：760 grid 第二断点（600 分栏保留）+ pressRipple 升变行（工具行 CSS :has 超越项保留）+ 状态层破零，9/9 零缺口 |
| driving | ~~6/9~~ | ~~C D E~~ | ~~SDK + 形态锚 + 无障碍~~ | ✅ **批 3 已完成（v10.66）**：交卷 notify+emit 双通道 + pressRipple chips 行 + aria 4 处真实语义，9/9 零缺口 |
| piano | ~~4/9~~ | ~~B C D E I~~ | ~~五面全补~~ | ✅ **批 4 已完成（v10.68）**：760 grid 双栏（左键盘右曲谱）+ 播完 notify/emit 双通道（stop 迟到序号守卫）+ pressRipple 波形 chips 行 + aria 5 处（role=group×2/label/aria-live）+ 状态层破零，9/9 零缺口 |
| reaction | ~~4/9~~ | ~~B C D E I~~ | ~~五面全补~~ | ✅ **批 4 已完成（v10.68）**：760 rx-content 双栏（左主信息右统计/历史）+ 五轮完成 notify/emit 双通道 + pressRipple 开始按钮 + sr-live 播报 + aria 5 处 + 状态层破零，9/9 零缺口 |

**新增组余量清零（v10.68）**——准入车道直营面收官；#261 达成关单条件（完成即关 §7.7）。

### 存量组余量 11 家（长期打磨面）

`shortcuts` / `phone` / `reminders` / `stocks` / `notes` / `clock-app` / `books` / `messages` / `flow11` / `calendar` / `safari` / `translate` 十二家原列——**shortcuts 已随 R128 窗批次升档（v10.68 实跑 11 家）**——按 **#229 P2 序**推进，归属 **#177 盘点车道**（非本议题范围，勿混槽）；排期续点见 `docs/worklog.md` 末行 R 窗续点。

## 五、#294 触控目标 J 项扩展（v10.99 · R147 窗 · Job 2933040 · 第 2 定时消息系列）

**裁决（认领帖 6745341763 三查先于动工）**：audit-app-quality 评分卡增设 **J 项 = 交互元素有效命中区 ≥44px**（AOSP/Material 48dp 与 iOS HIG 44pt 双口径取 44px CSS 下界），**报告级并行段分档曝光不拦截**（#243 先例同律）——不进 ITEM_KEYS（9 项制阈值与分数语义零变化）、不进 hardFailures；达标线只约束新增组目标 **9/9 → 10/10**，存量渐进；小图标按钮伪元素扩命中区（议题处置 3）本卷不动 UI，登记为后续候补卷。

**判据（真适配不硬造）**：交互锚 = button/a/input/select/textarea/onclick/role=button（排除 type=hidden）；

- **可证达标**：系统组件类（`md3-list-item` ≥52px / `md3-fab` 56×56，md3-theme.css 中心样式实测，证据表 `TOUCH_SYSTEM_EVIDENCE`）或内联 style / 应用 CSS 声明 `height|min-height ≥44px`；
- **可证违规（small）**：显式声明 `height|min-height <44px`——计入 fail；
- **N/A 未证**：未声明尺寸、命中区由运行时布局决定——**曝光不入判**（`na` 计数随 `--json` 逐家曝光，不硬凑数字）；
- 零交互锚天然通过（D 门「无 range 天然通过」先例同律）；`.md3-btn` 计算高 ≈40px（视觉 M3 40dp 达标、命中区 <44）不入证据表——随处置 3 后续卷收口。

**实测横切（v11.00 树实跑 · `node scripts/gen-touch-snapshot.mjs --check` 零漂移；v10.99 初测 26/17 家 99 锚存档在案）**：

| 组 | 证据齐 | 可证违规 | N/A 锚总量 |
|---|---|---|---|
| 全体（41） | **43** | **0** | 575 |
| 模板（2） | 2 | 0 | — |

**v11.00 处置 3 收口卷（R148 窗 · 认领帖 6748397066）**：markdown/piano/word 三家 21 锚「声明 <44px」可证违规 **声明直升 44×44 双轴**（markdown .kbtn 38×34→44×44、piano .pn-octbtn 32×28→44×44 + .pn-btn 38→44、word .wd-speak 42×42→44×44）——伪元素扩区（处置 3 原文形态）静态判据不可证（不改变锚本体声明高度），本卷以真实 44px 命中区落地恰为议题本意，如需视觉紧凑另行卷；三家 small 15/5/1→0，新增组达标线 17/20→**20/20 全清**。

**可证违规 0 家（v11.10 存量收口卷全清；v11.09 时点 14 家 78 锚名单存档：safari(13) music(11) calculator(10) camera(7) game2048(6) photos(6) messages(5) threes(5) dice(4) notes(4) calendar(3) clock-app(2) contacts(1) phone(1)）——逐家明细见快照

**新增组 10/10 目标线现状**：**20/20 全清**（v11.00 处置 3 收口卷后零缺口）；存量组渐进不设线。

**v11.10 存量渐进收口卷（R153 窗 · 认领帖 6758780662 · Job 2933040 第 2 系列）**：14 家 78 锚「声明 <44px」可证违规**全清**——
①修复形态沿 R148 先例=本体声明直升 44×44 双轴：calculator .icon-btn 42×42 / camera .icon-action-btn 32×32 / music .md-btn h40+.md-icon-btn 40×40+.lm-back 34×34 / notes .btn-icon 36×36 / photos .icon-btn 36×36 / messages .action-btn 30×30 / dice .dock-btn 38×38+.step-btn 28×28 / safari .icon-btn 40×40+tab 链 36/36/20→44（tab 圆角 18→22 联调）/ threes 本体 clamp(34px,8.5vw,40px)→44×44 纯数字（判据正则只认纯数字 px、clamp 不可证 N/A 同律）/ clock-app settingsModal 内联 40×40+timer.mjs 列表删除钮 32×32；
②svg 后代误挂类真适配：contacts/phone 本体补显式 44×44+flex 居中、calendar .day-events__add 补 min-height 44（svg 图标 14/17/18/24px 视觉零变化、命中区真实达标——cssMap 尾类近似把 `.icon-btn svg` 图标尺寸误挂按钮类的实测辩护在本卷收口）；
③设计锚尊重：game2048 窄屏紧凑断点 30×30 与 threes 紧凑断点 32×32 **还原保留**（@media ≤400px 收缩语义=@181 批准入②设计意图，batch7/batch12 字面量锚零改动；类级 cssMap 取全文本最大值=主规则 44 判定过）；
④**J 面 43/43 全清里程碑**（证据齐 29→43 / 缺口 14→0 / 违规锚 78→0 · N/A 575 维持）——#294 J 项全库收口，后续仅演进重评不再单列批卡（V 清单同律）。

**再生成器**：`scripts/gen-touch-snapshot.mjs`（向本文件配套 JSON `docs/visual-admission-baseline.json` 增量合并 `apps[].touch` / `templates[].touch` / `touch_summary` / `admission_bar.touch_target`，其余字段逐字节保留；`--check` 逐字节校验零漂移）。

## 六、边界与关联

- **不重写** #228（白名单删除全量扫描）/#230（评分卡与分期）实现；不新建令牌、不改存量视觉、不引入新硬门禁（#235 教训，#244 边界同律）。
- 存量补课不混入本车道（正文建议④）；具体施工逐批认领（每批交付后重算 R，#192 §7 新作业重三查）。
- 快照陈旧不锁死：JSON `apps[].tier` 仅公示，分档回退防护归 `scripts/quality-baseline.json` 门禁（曾经达标项掉线硬 fail）。
- 关联：#243（本议题）/ #294（J 项扩展 · 本卷）/ #229 / #230 / #228 / #227 / #244 / #246 / #239 / #177 / #18 §2.1（准入准则）/ §9 SOP。
