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

## §10 三态分诊批执行记录（R150 窗 · Job 2932311 · 第 1 定时消息系列）

- **executed**: 2026-11-10T06:2x+08:00（认领帖 6752747295 先于动工 · 基线 vitest 6067/6067·319 全绿 221.6s 与覆写四十四精确吻合 · ls-remote=28f5a243 一致）
- **任务来源**：§8 诚实边界②——26 家 missing「留后续独立批三态分诊（评论位/断言位/守卫位）」。本批对清单 `evidence.missing` 全部 36 笔实引（26 文件）逐笔 grep 源码定位（行号实证）+ 30 路径真身 `existsSync` 实查，零硬造。
- **探针语义实读**（`scripts/gen-test-prefix-inventory.mjs` L25-55）：missing 探针 = 从测试文本提取路径形 token → 根相对存在性探测，未命中即落 `missingPaths`。故 **missing ≠ 真缺失**：运行时相对前缀 import 字符串、纯函数单测字面量、OPFS 虚拟路径、token 截断四类语义全部落入。
- **分诊总账（36 笔）**：断言位 **27** / 守卫位 **8** / 评论位 **1**；探针误差正交分类——前缀误差 20 · token 截断 2 · 虚拟路径字面量 6 · 负向守卫真不存在 8。**零真缺失（0/36）**。
- **分诊表（26 家逐笔）**：

| 测试文件 | missing 实引 | 分诊 | 语义判定（真身/落点） |
|---|---|---|---|
| appnotif | aosp/notification-channel.js | 断言位 | L18 import 实引+L68 源码锚；真身 `ios-desktop/js/aosp/…` 存活（前缀误差） |
| appnotif | apps-data | 守卫位 | L79 `not.toContain` 防循环负向锚（L77 it 标题伴生）——设计资产 |
| apps-subpage | recent-apps.js | 断言位 | L165 源码锚（L9 评论伴生）；真身 `ios-desktop/js/…` 存活 |
| appstore-market | demo/hello-world.md | 断言位 | L138 existsSync 正向守卫+L151 断言；真身 `hello-world.**mdapp**`（token 截断 .mdapp→.md） |
| archive | apps/archive/jszip.min.js | 守卫位 | L91 existsSync **false**——vendor 复用防重复锚；真身 `_shared/vendor/…` 存活 |
| battery-health | aosp/battery-health.js | 断言位 | L25 import+L189/L200 源码锚；真身存活 |
| catalog-dist | pkg/pkg-catalog.js | 断言位 | L23 import+L37 真身读取+L69 锚；真身存活 |
| cdn-health | pkg/cdn-health.js | 断言位 | L32 import+L173 锚（L217 标题伴生）；真身存活 |
| chess-grid-a11y | _shared/chess-a11y-core.js | 守卫位 | L55 existsSync **false**——M6 退役不复活锚；真退役事实钉扎 |
| code-editor | _shared/vendor/codemirror-bundle.mjs | 断言位 | L219 真身读取+L227 锚；真身 `ios-desktop/apps/_shared/…`（探针缺 apps 前缀） |
| error-hub | apps/music-player/index.html | 断言位 | L47 `appFromSrc` 纯函数字符串输入——单测字面量，非文件存在性断言 |
| error-hub | ios-desktop/sw.js | 断言位 | L270 `fetch('../sw.js')` 路径锚；真身 sw.js 在仓库根（#260 双态解析实证） |
| fixes-batch-750 | battery-service.js | 断言位 | L242 源码锚；真身存活 |
| fixes-batch-751 | icons-aosp.js | 断言位 | L69 源码锚；真身存活 |
| import-graph | clock-app/alarm/index.js/.mjs | 断言位 | L98-99 `resolveImportCandidates` 期望数组——解析器单测字面量 |
| import-graph | ../js/aosp/alarm-ringtone.js | 断言位 | L38-39/L88 解析器单测（L4/6/17 评论伴生）；真身存活 |
| lyric-merge | lyricmaker 目录+js 两笔 | 守卫位 | L166-167 existsSync **false**×2——#180 并入 music 后不复活锚 |
| markdown | docs/a.md | 断言位 | L63 `__mdSanitize` href 输入字面量——sanitize 单测数据非仓库文件 |
| markdown | apps/markdown/marked.min.js | 守卫位 | L121 existsSync **false**——vendor 复用锚（L120 真身锚伴生） |
| music-a17-sync | ../js/aosp/media-wave.js | 断言位 | L23 真身读取+L172 锚；真身存活 |
| online-catalog | pkg/cdn-health.js | 断言位 | L261 源码锚；真身存活 |
| opfs-files | docs/note.md + docs/2.md | 断言位 | L430/L439 `vfs.write` OPFS 虚拟路径——沙箱内路径非仓库文件 |
| paged-view | aosp/paged-view.js | 断言位 | L14 import+L98/105/113 锚；真身存活 |
| pdf | apps/pdf/pdf.min.js + worker | 守卫位 | L130-131 existsSync **false**——vendor 复用锚（L129/L136 真身锚伴生） |
| ringtones | ../js/aosp/alarm-ringtone.js | 断言位 | L30 import+L222/235/257 锚；真身存活 |
| settings-expressive-plates | icons-aosp.js | 断言位 | L120 源码锚；真身存活 |
| two-pane-back-stack | paged-view/page-stack/app-window | 断言位 | L156/237/238 锚+L106/136/269 真身读取；三真身全存活 |
| v286-matrix | docs/test-coverage-matrix.md/.js | 评论位 | L6/L40 标题文字 token（.md/.json 截断为 md/.js）；真身 .md/.json 双存活+L25-26 真身读取 |
| v316-zerotouch | icons.js | 断言位 | L36 源码锚；真身 `ios-desktop/js/icons.js` 存活 |
| wellbeing-focus | aosp/wellbeing-focus.js | 断言位 | L31 import+L207 锚（L1/4 评论伴生）；真身存活 |

- **裁决（§7 第二条改判）**：§7 原记「26 家部分失效路径引用，改名批应顺手修正旧式引用」——本批逐笔实证**改判为不修正**：所谓 missing 引用全部是①活断言源码锚字符串（修正=破坏断言，违反 §1 底线）②负向守卫（断言「不存在」正是测试目标，修正=拆除守卫）③单测字面量/VFS 虚拟路径（非文件存在性语义）。清单 `missing` 字段语义升格为「探针未解析 token 留证」，非缺陷指标，后续批不再据此施工。
- **施工边界兑现**：零 tests/ 触碰（活断言源码锚不动）、零 js/、零生成器改动（inventory 随树再生零漂移验证）、零滚版（v11.03 维持）；本卷纯 docs（本文档 §10+HANDOFF 覆写四十五+worklog R150 段）。
- **诚实边界**：行号为本树时点快照（28f5a243 树 grep 实证）；真身存在性为 existsSync 实查非推理；守卫位 6 文件 8 笔与断言位伴生注释不计入评论位统计（主分类唯一）。

## §11 增量纪律：R149 改名批之后新建测试怎么办（2026-11-13 补记）

> **本节只追加、不改写上文任何数字**。§3 / §8 / §9 / §10 的「301 evergreen + 17 snapshot」等计数是 R149 / R150 交付时点史实，按 #205「注释即锚」契约保持原样；本节记录的是**那之后**新增测试暴露的三处流程缺口与处置范式。

### 一、暴露了什么

R149 改名机械批把存量测试去了版本前缀，但**新建测试的脚手架/习惯没有跟着改**。随后 V 清单存量补课各批又产出了一批 `vNNN-*.test.js`，其中 11 个既未带 `@snapshot` 头注、也未进 `OVERRIDES` 人工复核层，在 #291 补关核验时被登记为「新违规」。

更隐蔽的一处：**`scripts/gen-test-prefix-inventory.mjs` 的机器 `classify()` 不读 `@snapshot` 头注**。它按「名称信号 token + 内容实引现存资产」判档，而补标记的头注恰恰引用了本文档 §4 → 机器把这批文件判成 evergreen，与头注的「交付时点快照」语义相反。生成器 `method` 字段本就写明「机器推定档位非终审」，`OVERRIDES` 才是终审位——**缺的是回填，不是判定逻辑**。

### 二、三条硬纪律（新增测试时照此办理）

1. **默认常青命名**：新建测试不带 `vNNN-` 版本前缀，除非它确实钉扎某个交付时点。行为闸、契约锚、生成器对账一律常青（本批 `duplicate-inventory.test.js` 即此例）。
2. **确需钉扎时点 → 两步同做，缺一不可**：
   - 第 2 行注入 `@snapshot` 头注，逐文件写明钉扎对象（范式见 §9）；
   - **同步在 `scripts/gen-test-prefix-inventory.mjs` 的 `OVERRIDES` 回填同笔**（写清钉扎对象与所属批次），否则头注与 `docs/audits/test-prefix-inventory.json` 档位必然分叉。
3. **生成件随树再生**：新增/改名/补标记后，至少重跑 `gen-test-prefix-inventory.mjs` 与 `test-coverage-matrix.mjs`，再跑全套生成件 `--check`。改名还要同步 `docs/index.md` 之外的引用面；`docs/HANDOFF.md` / `docs/worklog.md` 里的旧名属史实注记，**不原地改写**，在新头注留一行溯源即可。

### 三、本次销账（#291 补关评论登记项，11 例）

- **10 例交付时点型**：逐文件补 `@snapshot` 头注 + `OVERRIDES` 回填 10 笔 → 生成件档位由机器误判的 evergreen 翻回 snapshot，`reviewed=true`。
- **1 例行为闸型**：`v269-duplicates.test.js` → `duplicate-inventory.test.js`（去前缀常青化，**不标** `@snapshot`）—— 它测的是「新增同内容组即拦截」的活契约，按 §1 属 evergreen。生成器注释与三份生成件随树再生，旧名仅在史实注记中保留。

### 四、诚实边界

- 本节不改 §3 的历史计数，也不改 `OVERRIDES` 里 R148 / R149 的既有条目；新增条目注明所属批次以便回溯。
- 机器分档仍非终审，`review` 与 `retirable-candidate` 的处置一如既往走 §4 登记制，不由脚本自动判定。
