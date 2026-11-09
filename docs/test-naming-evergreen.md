# 测试文件版本前缀常青化：判定规则与全量清单（#291 方案裁决卷）

- **generated**: 2026-11-10T02:2x+08:00（R148 窗 · Job 2932311 · 第 1 定时消息系列 · 认领帖 6747814298@02:14+08 先于动工）
- **基线**: vitest 6032/6032·318 全绿零 error（b9aec4b 树，本卷交付前全量前台复跑）· 纯 docs 零滚版 v10.99 维持
- **清单真源**: `docs/audits/test-prefix-inventory.json`（机器扫描+人工复核双层，逐文件证据在案）
- **边界**: 本卷**不改任何测试文件名**、不动 `scripts/new-app.mjs` 本体、零 UI 代码触碰——规则先立、清单先出、施工留后续批（渐进式，反对大爆炸改名）

## §1 裁决规则（一条线）

测试文件按**测的对象**二分，命名跟对象走，不跟交付时点走：

| 判 | 对象 | 命名 | 维护语义 |
|---|---|---|---|
| 行为回归锚 | 当前活着的行为/契约（模块出口、接线、交互、渲染逻辑） | **常青命名**：`<特性名>-<行为>.test.js`，不带版本号 | 随特性演进原地改；特性重构时测试同步改，永不"过期" |
| 交付时点快照 | 交付当时的计数/基线/形态横切/注册面内容 | 保留 v 前缀 + 文件头显式 `@snapshot` 标记 | 允许随快照失义退役；不随特性演进改（改了就不是快照了） |

一句话判据：**「这个测试改了断言值之后，它测的东西还在不在？」在 → 常青；不在（改的是当时的账）→ 快照。**

## §2 三档判据与证据链

机器扫描（`docs/audits/test-prefix-inventory.json` 内置生成逻辑）证据源四类，逐文件留证：

1. **内容实引**——`import … from '../ios-desktop/…'` / `readFileSync(join(here, '…'))` / 根相对路径字符串，经扩展名（.js→.mjs/.json）与 `ios-desktop/` 前缀变体回退后命中现存资产 → evergreen(high)；
2. **`window.__*Core` 全局核名引用**——核在即行为锚 → evergreen(high)；
3. **名称快照信号 token**（词边界精确匹配，非子串——v833 `accounts` 误命中 `counts` 教训在案）：version/readme/counts/matrix/baseline/precache/manifest/globals/keymap/registry/zero-touch/refonly/dist-parity 等 → snapshot(medium)，**一律列人工复核位**；
4. **零实引 DOM fixture/注入式测试** → review(low) 人工复核位，机器不判快照不判退役。

**人工复核终审**（本卷 8 笔，证据逐条留 JSON `note` 字段）：6 笔 review 位（v152/v188/v216/v239/v930/v931——多参 `join`/`resolve` 拼接逃过探针，主题资产 `launch.html`/`chess/`/`assets/fonts`/`js/motion.js` 均现存，皆行为锚）+ 2 笔信号词误伤回翻（v181-admission-rework、v261-word-admission——`admission` token 误中，内容实引现存资产且为行为断言）→ 全部 evergreen。

## §3 全量清单化结果（318 文件实扫）

| 档位 | 数量 | 占比 | 说明 |
|---|---|---|---|
| **evergreen**（行为回归锚） | **301** | 94.7% | 含 29 个**已是无版本前缀**文件（scenario-*/pb-*/spring/utils 等——常青命名在库内已有先例群体） |
| **snapshot**（交付时点快照/闸门） | **17** | 5.3% | 全部 medium 置信，见下方全列 |
| **retirable**（机器判退役） | **0** | — | 机器永不全自动判退役；退役候选仅从 snapshot 复核位产生（§4） |
| 合计 | 318 | 100% | 版本前缀分布：v19…v1038 共 262 个前缀值 + 29 个无前缀 |

**snapshot 17 家全列**（medium 置信 · 人工复核位 · 均为闸门/基线/注册面内容钉扎语义）：v1037-app-quality-audit · v150-readme-version · v219-app-data-registry · v223-version-single-source · v233-claim-registry · v242-globals-registry · v243-visual-admission · v243-visual-baseline · v246-visual-baseline · v266-workflows · v267-readme-counts · v286-refonly-core · v286-test-coverage-matrix · v292-manifest-icons · v293-launch-audit · v305-keymap-doc · v316-zerotouch-registration

> 复核注记（borderline 如实登记）：v286-refonly-core 兼有核契约面（活）与 ref-only 注册面内容钉扎（快照）双重语义，归 snapshot 但**其核契约断言不随退役失义**——退役前须拆分契约面；v243-visual-admission/v267-readme-counts/v305-keymap-doc 等为生成件/文档一致性锁，快照语义纯。

## §4 退役流程（可退役 ≠ 直接删，走登记制）

1. **候选产生**：仅从 snapshot(medium) 复核位产生（快照失义=所钉对象已不存在或口径已废）；机器扫描结果更新时新增 review 位同入复核；
2. **人工确认**：逐文件核对其钉扎对象现状（本卷 17 家**全部保持在役**——九项制评分卡/双基线/矩阵/globals/keymap/版本单源等闸门均活着，无一失义）；
3. **登记退役**：确认退役者删除前在 `docs/worklog.md` 登记一行（文件名+失义原因+替代覆盖说明）；
4. **生成件随再生**：删除后统一再生矩阵/globals/keymap/docs-index 三件并 `--check` 收束（第四/五实例制度化次序）；
5. **不占批次**：退役不滚版本号、不进 vNNN 交付卷，随最近一批纯 docs 卷搭载。

## §5 实施路线（渐进三批，本卷零施工）

| 批 | 内容 | 触碰面 | 风险 |
|---|---|---|---|
| 本卷（R148） | 规则立卡+全量清单+模板建议文 | docs 两件+生成件 docs-index | 零 |
| 改名机械批（后续窗认领） | 301 家 evergreen `git mv` 去版本号（vNNN- 前缀剥除）+ 测试内 describe 文案同步 + `@snapshot` 头注释注入 17 家 | tests/ 318 文件 + 矩阵/globals/keymap/docs-index 随再生 | 纯机械；改名批撞号面大，须独窗执行不与 core 提取批同槽 |
| 模板注入批（后续窗认领） | `scripts/new-app.mjs` 生成的测试骨架改常青命名 + 议题模板注明"新测试默认常青命名，v 前缀仅限快照" | scripts/new-app.mjs 一处 | 低 |

**执行序约束**：改名批若与 core 提取批（tests/v286 锚组追加）同槽，矩阵/`v267-readme-counts`/`v295-docs-index` 三闸会双向漂移——**必须异槽**；@snapshot 注入批可随时搭载纯 docs 卷。

## §6 模板建议文（裁决 3 · 供后续批执行，本卷不动脚本本体）

- 新测试文件默认**常青命名**：`<特性名>-<行为>.test.js`（例：`game2048-merge-scoring.test.js`），不写版本号；
- 版本前缀 `vNNN-` **仅限**交付时点快照（基线锁/计数锁/横切存档），且文件头第二行起必须含 `@snapshot` 注记与所钉对象说明；
- 测试文件头注释块保留现行范式（背景+议题锚+断言结构说明），常青文件注明"随特性演进维护"，快照文件注明"允许随快照失义退役（§4 流程）"；
- 每批交付若新增测试，本清单 JSON 随树再生（生成器脚本随批入库于 `scripts/`，与矩阵同律）。

## §7 诚实边界

- 机器推定 ≠ 终审：301 家 evergreen 中证据强度为「内容实引现存资产」，个别文件可能兼有快照断言（如对计数基线的附带断言），改名批动工前须逐文件终审并按 §4 登记；
- 26 个文件存在**部分失效路径引用**（`missing` 字段留证：如 `aosp/battery-health.js` 裸路径未带 `ios-desktop/` 前缀的旧式拼接），不影响档位判定（同文件另有实引命中），但改名批动工时应顺手修正这些旧式引用；
- 本清单为 b9aec4b 树时点快照，后续批次落库后随树再生，不作为跨版本长期有效账。

关联：#291（主卡）· #149（注释纪律方法论同源）· #223（目录名 vNNN 语义歧义联动，本文不裁决目录重编号）· #18 §5/§9

## §8 改名机械批执行记录（R149 窗 · Job 2932311 · 第 1 定时消息系列）

- **executed**: 2026-11-10T04:3x+08:00（认领帖 6750310006 先于动工 · 异槽约束核验：#286 池已收口无 core 提取批在途）
- **施工面**: 273 家 `git mv` 去 `vNNN[a-z]?-` 前缀（含 5 家 fixes 撞名消解 `fixes-batch-749/750/751/753/754.test.js`——era 号作束 ID 非版本前缀，`issue5-fixes` 先例同律；v304-sweep-baseline 人工终审翻档 evergreen→`sweep-baseline.test.js`，OVERRIDES 留痕）· 快照 17 家保留并注入 `@snapshot` 头第二行（逐家钉扎对象注记）· 存活引用同步 194 文件（tests/ 自引+14 处跨引 / scripts 3 份 / docs 3 份——v150/v292 快照名按裁决保留不改）· v241-shell-chess-a11y 头部错植他名归正
- **清单终态（319 文件实扫·随批再生）**: 302 evergreen（94.7%）+ 17 snapshot（全部 @snapshot 头已注入）+ 0 review；机器分档与人工翻档双层维持（OVERRIDES 9 笔=8 笔键随新名迁移+v304 翻档新增，复核链留痕）
- **生成件随再生**: test-prefix-inventory / test-coverage-matrix（core 45/45 消费 100% full 44/ref 8/zero 0 零漂移）/ globals（264）/ keymap（261）/ apps-doc / docs-index 六件全绿
- **诚实边界**: ①测试内 describe 文案含 era 演进注记（如「v7.49 → ①…」）系内容非自引用，按「不改断言语义」原则保留；②26 家 missing 旧式路径引用经抽查多为活断言（`toContain("from './…')")` 源码锚）与注释位混处，本批不动、留后续独立批三态分诊（评论位/断言位/守卫位）；③§3 表内数字为裁决时点账（318 文件），现树以 JSON 再生值为准

## §9 模板注入批执行记录（R149 窗 · Job 2932311 · 第 1 定时消息系列）

- **executed**: 2026-11-10T05:0x+08:00（同窗续卷 · #291 改名机械批 v11.02 交付后接力）
- **如实适配**：裁决时点假设 new-app 存在「测试骨架」待改名——实读 new-app.mjs **零测试生成面**（仅 index.html/style.css/app.mjs），本批如实改判为**新增**常青命名测试骨架生成（「骨架改常青命名」的语义等价落地），非改名。
- **施工面**：①`scripts/app-template.test.tpl` 新建（脚手架契约锚模板：A1 入口存在+占位符零残留/A2 标题落位/A3 样式脚本接线双形态兼容；头部第二行起内嵌 #291 §6 命名纪律注记——生成即带常青声明）；②`scripts/new-app.mjs` 接线（双形态模式生成 `tests/<appId>-scaffold.test.js`，TEMPLATE_TEST 缺失/测试重名双防呆，CLI 输出增注记行）；③端到端探针实证：单文件/多文件两形态各生成 zz 探针应用实跑 vitest **3/3·3/3 全过**后即删（探针不落树）；④「议题模板注记」如实适配：仓库无 .github/ISSUE_TEMPLATE 基建，注记落位于生成骨架头注释+CLI 输出两处（§6 文本原样内嵌），议题模板基建留后续批按需立卡。
- **门禁**：v243 双锚（C1 占位符渲染链/C2 模板 audit 双 9/9）+ 全量 vitest + 静态闸随 v11.03 滚版复跑。
