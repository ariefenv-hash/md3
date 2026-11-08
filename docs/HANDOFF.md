<!-- docs/HANDOFF.md — #234② 结构化交接快照（新实例读 #18 正文 + 本文件即可开窗，不必翻全部评论） -->
<!-- 维护纪律：每轮交付后立即覆写快照（#234 §七，不是槽末统一写）；数据由 scripts/claim-registry.mjs 扫描组装，禁手抄 claims。 -->

# HANDOFF 结构化快照

- **generated**: 2026-11-08T10:26+08:00（R128 窗 · Job 2932311 · 覆写）
- **head**: `cf5f4d76`（origin/main，REST 回读一致；v10.63 = #243 交付关单）
- **baseline**: vitest **5448/5448·281** 全绿零 error（v10.63 终树实跑：5433·280 + v243 15 锚·1 文件精确吻合）
- **slot_version**: v10.63（R128 窗本实例 #243 单号交付；#245 批 2 属 Job 2931605 R127 车道续作，版本互不侵占）
- **e2e**: 42/42 pageerror 0 · shot:diff 20/20 全 match · check:motion 水位 PASS（v10.63 终树复跑）

## claims（只列 open；status ∈ active/suspicious/alive_confirmed，#234 §七③）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| #245 | Job 2931605 实例 C | R127-202611080800 | 2026-11-08 08:0x（认领帖 6714969381） | active（TTL 24h 内） | 动效密度批 2/3 续作（v10.61=b545113c 批 1 已交付，分批不关单） |

- **stale**: 无
- **suspicious**: 无
- **blocked**: 无

## closed_this_slot（R128 · 完成即关 §7.7）

| issue | 交付 | 状态 |
|---|---|---|
| #243 | v10.63 = cf5f4d76（新增应用视觉准入基线收口：清单+CI 挂接+新建即达标实证+机器快照；交付帖 6716133671） | closed（02:23:34Z completed，无 pending-verification 依赖） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247 等历史留核面维持现状，由用户真机核）

## next_candidates（R129 续点 · 顺序真源 docs/worklog.md 末行）

1. **新增组余量同域顺延**（#243 排期表直营）：word/chess/driving（各 6/9 缺口最小）→ piano/reaction（4/9）——立卡承载（#256 立卡即实施先例），每批独立认领
2. #245 批 2——**Job 2931605 在途租约勿撞**
3. #215 文件应用重构（重型，R 充足窗评估）
4. 存量 12 偏薄（#229 P2 序 + #177 盘点车道，不混槽）
5. Enjoy-music #2/#3（境外）

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖
- 视觉准入：`npm run audit:app`（#243 新增）；快照 `docs/visual-admission-baseline.json` + 文档 `docs/visual-admission-baseline.md`
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
