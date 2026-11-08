<!-- docs/HANDOFF.md — #234② 结构化交接快照（新实例读 #18 正文 + 本文件即可开窗，不必翻全部评论） -->
<!-- 维护纪律：每轮交付后立即覆写快照（#234 §七，不是槽末统一写）；数据由 scripts/claim-registry.mjs 扫描组装，禁手抄 claims。 -->

# HANDOFF 结构化快照

- **generated**: 2026-11-08T18:00+08:00（R131 窗终账三实例合并：#266 v10.73 + #267 v10.74（2931605）+ #297 结案 + #298 v10.75（2932311）+ 本提交=开/关动画「中间不连贯」四根因修复 v10.75（2933040 并行实例段 · 用户直令车道）· v10.75 同号三实例共存 · 覆写）
- **head**: v10.75（本提交=动画修复；同号共存链 a6a2b421=v10.73 #266 deploy 自证 → ee7613a3=v10.74 #267 README 对账 → 5de6f676=v10.75 #298 市场目录治本 → 本提交=动画修复；docs 链 8885be7a/6285f8a0/75c8736）
- **baseline**: vitest **5596/5596·290** 全绿零 error（=对侧 5578·289（含 v298 7 锚）+ 本侧 v266-anim-continuity 18 锚·1 精确吻合账目闭合；本提交终树实跑）
- **slot_version**: v10.75（R131 窗五卡：#266 v10.73 + #267 v10.74 + #297 结案（零滚版）+ #298 v10.75 + 动画修复 v10.75；motion 水位维持 tokens 235/bare 122 令牌化率 65.8%；撞号十五/十六度双段实录：三方同取 v10.73/v10.75 连环合流，backup-v1073-anim/v1075-anim2 留档 → reset/hunks 重放 → 重滚 10.74→10.75 防倒挂）
- **e2e**: 44/44 pageerror+同源资源错误累计 0（precache 180 条含 catalog.json 全 200）· shot:diff 20/20 全 match · 动画三 e2e 全过（v225 32/32 · v231 6/6 · v863 三跑收敛 23/23）· check:motion PASS · check:version 7/7 · check:comments 无新增失配 · check:workflows 3/3 · check:dist 全过（本提交终树实跑）
## claims（只列 open；status ∈ active/suspicious/alive_confirmed，#234 §七③）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| #241 | job2931605-R123-G | R123 | ~960min | active | keyboard-a11y+shell-focus+chess-grid（勿撞，TTL 24h 未到） |
| #223 / #18 | md3-C3-R119 | R119 | ~1310min | active | roll-version+vite-config+sw（旧仪式车道） |

- **stale**: 无
- **suspicious**: 无
- **blocked**: 无

## closed_this_slot（R131 · 完成即关 §7.7 · 双实例合并账）

| issue | 交付 | 状态 |
|---|---|---|
| #266 | v10.73 = a6a2b421（branches ain] 根治 + Assert deploy branch 自证步 + workflow-lint-core/check-workflows 门禁 + tests/v266 18 锚；vitest 5560·287/e2e 44/44/shot 20/20/check:workflows 3/3 全绿；交付帖 6719504833） | closed（completed，完成即关 §7.7） |
| #267 | v10.74 = ee7613a3（README 52/41 真源对账收敛 + check-readme-counts.mjs 门禁 + tests/v267 11 锚；vitest 5571·288/e2e 44/44/shot 20/20；交付帖 6719662915） | closed（completed，完成即关 §7.7） |
| #297 | 结案（零滚版）：alarm-ringtone.js 404 前提系 #260 v10.69 1.65 import 闭包机制已顺带根治——新鲜构建 dist 在场 + precache 在册 + HTTP 探针 200（对照 catalog 404 属实归 #298）；审计实测系 v10.69 前旧 dist 产物；证据帖 6719403363 | closed（completed，实证复核结案顺手补关 §7.7） |
| #298 | v10.75 = 5de6f676（catalog.json 纳入 dist 拷贝清单 precache 179→180 + 链序翻转同源首选/CDN 兜底 + isCdn 同串判据 + 桥六件套 + tests/v298 7 锚 + v1031/v1030 重锚；vitest 5578·289/e2e 44/44/shot 20/20；交付帖 6719834209；撞号十五度 backup-v1073-298b 留档） | closed（completed，完成即关 §7.7） |
| 开/关动画「中间不连贯」四根因修复（用户直令车道，非议题卡） | v10.75 = 本提交（EMPHASIZED burst 曲线映射量化 + 交叉淡化时间化墙钟锁定 + dt 钳制 0.25→0.05 + 启动屏释放 140ms 过渡淡出 + 曲线起手冻结；tests/v266-anim-continuity 18 锚 + 探针取证；vitest 5596·290/e2e 44/44/shot 20/20/动画三 e2e 全过；撞号十五/十六度 backup-v1073-anim/v1075-anim2 留档） | 交付完成（用户直令无单可关，交付帖回 #18 §9 SOP 流程） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#249/#250/#248 等历史留核面维持现状，由用户真机核）

## next_candidates（R132 续点 · 顺序真源 docs/worklog.md 末行）

1. **#262 批 2**（V4 状态层余 24 家分批，2933040 车道在途勿撞）
2. #215 文件应用重构（重型，R 充足窗评估，一次性大重构；R131 两度评估留窗）
3. 存量 11 偏薄（#229 P2 序 + #177 盘点车道，不混槽）
4. #292 manifest icons 完整性审计（P3 轻量）/ #293 launch.html 定位盘点（P3）/ #281 全局错误捕获（P2 中量）
5. #241 键盘可达性余量批（R123-G 租约 TTL 后对账；#250/#248 needs_review 留核不重做）

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖
- 视觉准入：`npm run audit:app`（#243）；快照 `docs/visual-admission-baseline.json`（新增组 100% 关单快照）+ 文档 `docs/visual-admission-baseline.md`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json` + 文档 `docs/visual-baseline.md`
- motion 水位：`node scripts/check-motion-tokens.mjs`（报告 / `--check` 防回退 / `--update` 固化；npm run check:motion 自带 --check 前置参数，update 需直调脚本）
- README 数字对账：`npm run check:readme-counts`（#267 v10.74 落地）；workflow lint：`npm run check:workflows`（#266 v10.73 落地）
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
