<!-- docs/HANDOFF.md — #234② 结构化交接快照（新实例读 #18 正文 + 本文件即可开窗，不必翻全部评论） -->
<!-- 维护纪律：每轮交付后立即覆写快照（#234 §七，不是槽末统一写）；数据由 scripts/claim-registry.mjs 扫描组装，禁手抄 claims。 -->

# HANDOFF 结构化快照

- **generated**: 2026-11-08T11:4x+08:00（R128 续窗补推合流 · Job 2933040 第 2 定时消息系列 · 覆写）
- **head**: `855242b`（origin/main，REST 回读一致 ✓；v10.64 本方增量提交，合流树基底 v10.67=8848bca8）
- **baseline**: vitest **5489/5489·283** 全绿零 error（十二度合流终树实跑：对方 v10.67 树 5472·282 + 本方 v243-visual-baseline 17 锚·1 文件精确吻合）
- **slot_version**: v10.67（R128 窗本实例 #243 主任务 + #261 批 1/2/3 加餐三段；与 Job 2931605 #245 批 2 同号 v10.66 十度撞号合流重滚在案）
- **e2e**: 42/42 pageerror 0 · shot:diff 20/20 全 match · check:motion 水位 PASS（v10.67 合流终树复跑）

## claims（只列 open；status ∈ active/suspicious/alive_confirmed，#234 §七③）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| #245 | Job 2931605 实例 C | R127-202611080800 | 2026-11-08 08:0x（认领帖 6714969381） | active（批 2 已交付 v10.66=33ed261a，批 3 续作车道仍在途） | 动效密度批 3 续作（分批不关单） |
| #261 | Job 2932311（本系列） | R128-202611081000 | 2026-11-08 10:30（认领帖 6716164462） | active（批 1/2/3 已交付，批 4 = piano/reaction 下窗） | 新增组余量整改（分批不关单，批 4 全清后关） |

- **stale**: 无
- **suspicious**: 无
- **blocked**: 无

## closed_this_slot（R128 · 完成即关 §7.7）

| issue | 交付 | 状态 |
|---|---|---|
| #243 | v10.63 = cf5f4d76（新增应用视觉准入基线收口：清单+CI 挂接+新建即达标实证+机器快照；交付帖 6716133671） | closed（02:23:34Z completed，无 pending-verification 依赖） |
| #261 批 1/2/3（不关单） | v10.64=6044bba7 word / v10.65=4e448056 chess / v10.67=8bd296c2 driving——三家升 9/9，新增组 75%→90% | open（批 4 = piano/reaction 留下窗；分批不关单 #229/#245 先例） |
| #243（本窗 Job 2933040 增量合流） | v10.64=855242b（V 清单 8 项检测段+水位开卡 13/22/6+双模板 8/8+docs/visual-baseline.md 与 admission 分工段；撞号七~十二度连环合流实录在提交信息与 worklog R128 续窗账；补充交付归档帖 6716994272） | 补充交付归档完成：议题已关单不重开不补关（§12.4），V 存量水位核查基建归 #229 补课车道消费 |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247 等历史留核面维持现状，由用户真机核）

## next_candidates（R129 续点 · 顺序真源 docs/worklog.md 末行）

1. **#261 批 4**：piano/reaction 五面全补（B C D E I）→ 新增组 100% 后关单——Job 2932311 本系列租约在途可续
2. #245 批 3——**Job 2931605 在途租约勿撞**
3. #215 文件应用重构（重型，R 充足窗评估）
4. 存量 12 偏薄（#229 P2 序 + #177 盘点车道，不混槽）
5. Enjoy-music #2/#3（境外）

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖
- 视觉准入：`npm run audit:app`（#243 对侧 v10.63）；快照 `docs/visual-admission-baseline.json` + 文档 `docs/visual-admission-baseline.md`
- V 清单水位（本窗 v10.64 增量）：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json` + 文档 `docs/visual-baseline.md`
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
