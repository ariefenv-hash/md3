<!-- docs/HANDOFF.md — #234② 结构化交接快照（新实例读 #18 正文 + 本文件即可开窗，不必翻全部评论） -->
<!-- 维护纪律：每轮交付后立即覆写快照（#234 §七，不是槽末统一写）；数据由 scripts/claim-registry.mjs 扫描组装，禁手抄 claims。 -->

# HANDOFF 结构化快照

- **generated**: 2026-11-08T17:15+08:00（R131 窗主任务：#266 deploy.yml 触发分支损坏修复 + 部署分支自证 + workflow lint 门禁 v10.73 · Job 2931605 第 3 定时消息系列 · 覆写）
- **head**: v10.73（#266 交付：branches [main] 根治 + Assert deploy branch 步骤 + workflow-lint-core 纯核 + check:workflows + tests/v266 18 锚；滚版 272 文件）
- **baseline**: vitest **5560/5560·287** 全绿零 error（=v10.72 树 5542·286 + v266 18 锚·0 精确吻合）
- **slot_version**: v10.73（R131 窗：#266 关单交付；motion 水位维持 tokens 235/bare 122；本窗环境实录：工作树 MultiEdit 页缓存污染 → index 真源组装范式，见 worklog R131）
- **e2e**: 44/44 pageerror+同源资源错误累计 0 · shot:diff 20/20 全 match · check:motion 水位 PASS · check:version 7/7 · check:comments 豁免 210 生效 0 · check:dist 全过（precache 179/BUILD_ID mw7lav46）· check:workflows 3/3（selftest 8/8）（v10.73 终树实跑）
## claims（只列 open；status ∈ active/suspicious/alive_confirmed，#234 §七③）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| #241 | job2931605-R123-G | R123 | 847min | active | keyboard-a11y+shell-focus+chess-grid（勿撞，TTL 24h 未到） |
| #223 / #18 | md3-C3-R119 | R119 | ~1200min | active | roll-version+vite-config+sw（旧仪式车道） |

- **stale**: 无
- **suspicious**: 无
- **blocked**: 无

## closed_this_slot（R131 · 完成即关 §7.7）

| issue | 交付 | 状态 |
|---|---|---|
| #266 | v10.73（branches [main] 根治 + Assert deploy branch 自证步 + workflow-lint-core/check-workflows 门禁 + tests/v266 18 锚；滚版 272 文件；vitest 5560·287/e2e 44/44/shot 20/20/check:workflows 3/3 全绿；交付帖见 #266） | closed（completed，完成即关 §7.7） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#249/#250/#248 等历史留核面维持现状，由用户真机核）

## next_candidates（R131 续点 · 顺序真源 docs/worklog.md 末行）

1. **#262 批 2**（V4 状态层余 24 家分批，2933040 车道在途勿撞）
2. **#267** README 数字对账 + scripts/check-readme-counts.mjs 门禁（P1 轻量，0 评论零租约）
3. #215 文件应用重构（重型，R 充足窗评估，一次性大重构）
4. 存量 11 偏薄（#229 P2 序 + #177 盘点车道，不混槽）
5. #293 launch.html 定位盘点 / #281 全局错误捕获（P2）
6. #241 键盘可达性余量批（R123-G 租约 TTL 后再对账；#250/#248 needs_review 留核不重做）

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖
- workflow lint：`npm run check:workflows`（#266；selftest `node scripts/check-workflows.mjs --selftest`）
- 视觉准入：`npm run audit:app`（#243）；快照 `docs/visual-admission-baseline.json`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；motion 水位：`npm run check:motion`
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
- **环境注记（R131）**：本地工作树存在页缓存污染读取抖动（deploy.yml 一役实证）——污染文件后续修改一律走 git index 管道（hash-object --stdin + update-index），工作树仅作展示；API 响应可能被沙箱代理缓存（urllib 命中陈旧态），curl 直连 + cache-buster 兜底
