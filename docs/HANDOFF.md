# HANDOFF 结构化快照

- **generated**: 2026-11-09T04:50+08:00（R137 窗 Job 2931605 第 3 系列覆写十六：#286 core 提取范式覆盖矩阵 + audit H 项量化 v10.86=2a6dfa17+63ca1d27 交付关单（41 iframe 零 zero-touch 实证 + 23 core 100% 消费水位固化 + H 项量化 pass 零变化；撞号廿八度 cherry-pick 合流 backup-v1086-286 留档；vitest 5812·310 全绿账目闭合））
- **head**: 63ca1d27（#286 v10.86 合流树；前链 2a6dfa17=#286 功能 · 64e51359/ac6f148b=对侧 #312 V1 · c3bc1135/607ccc10=#215 files v10.84）
- **baseline**: vitest **5812/5812·310** 全绿零 error（=对侧合流基线 5797·309 + v286 15·1 精确吻合；63ca1d27 合流终树实跑）+ e2e:sweep 52/52 + e2e:dist 45/45 + shot:diff 20/20 + docs-index PASS（顶层 26/递归 428）+ build v10.86/precache 181
- **slot_version**: v10.86（#286 滚版 288 文件 10.85→10.86；对侧 #312 卡标 v10.85 未滚版行=卡标同号共存先例第八例）

## claims（只列 open；status ∈ active/suspicious/alive_confirmed，#234 §七③）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| #241 | job2931605-R123-G | R123 | ~1495min | stale（TTL 过期） | keyboard-a11y+shell-focus+chess-grid——**下窗对账回收**，回收后走正常认领路径 #236 勘误口径 |
| #223 / #18 | md3-C3-R119 | R119 | ~1700min | stale | roll-version+vite-config+sw（旧仪式车道，后来者可单方面判定失效，零车道交集） |

- **stale**: #241（R123-G，TTL 24h 过期转 stale——对侧 #312 交付帖同口径判定互证）/ #223·#18
- **suspicious**: 无
- **blocked**: 无
- **已释放**：#286（覆盖矩阵交付关单 completed，交付帖 6726875510）/ #312（V1 批 7 交付关单，2933040）/ #215 / #296 / #279（历史窗留档）——本窗全车道释放

## closed_this_slot（R137 · 完成即关 §7.7）

| issue | 交付 | 状态 |
|---|---|---|
| #286 | v10.86 = 2a6dfa17+63ca1d27（core 提取范式覆盖矩阵生成器+docs 两生成件+audit H 项量化 coreStatsOf/checkH 三参 pass 零变化+tests/v286 15 锚 D 治理水位 100% 固化；核心实证 41 iframe 零 zero-touch + core 23/23 消费 100% + zero-touch 仅 3 家 native P1 候补；撞号廿八度 cherry-pick 合流；2931605 本实例） | closed（completed，交付帖 6726875510） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#249/#250/#248 等历史留核面维持现状，由用户真机核）

## next_candidates（R138 续点 · 顺序真源 docs/worklog.md 末行）

1. **#241 对账回收**（R123-G 租约 TTL 过期转 stale——回收后走正常认领路径 #236 勘误口径，chess 车道解锁）
2. **V8 深窄屏 5 家**（camera/clock-app/shortcuts/stocks/weather——camera 与 #312 功能色登记文件交集，认领前三查）
3. **V2 字体阶梯 5 家**（chess/clock-app/game2048/terminal/threes——chess 一家待 #241 回收对账）
4. **ref-only 27 家补 core 提取**（#286 矩阵候补池 docs/test-coverage-matrix.json zero_touch 面收窄；首批评估 music/files/settings/messages 高频优先，分批 #229 先例同律）
5. **#285 APPS.md 生成接线**（#296 头注「用途：」切分点在案）

**纪律新增（R137 实录）**：①生成件型交付（生成器+docs 双件）在并行合流后必随合流树**再生**——对侧新增测试文件会使「测试文件数」统计过时（--check 红自暴露），v286 B 锚守护在案；②cherry-pick 合流防线（R136 确立）本窗二次验证：滚版行自动吸收+单冲突按行合并（对侧功能行+我方版本行两全），全流程较整树重放显著轻量；③claim-registry 403 次级限速降级手动三源对账（HANDOFF claims+议题列表+评论区）R135 先例持续有效；④push 网络劣化（GnuTLS -110/connect 超时）重试 2~3 次即过勿诊断。

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖（403 时降级手动三源）
- **覆盖矩阵（#286 新增）**：`node scripts/test-coverage-matrix.mjs`（再生 docs 两生成件）/ `--check`（逐字节校验）；**新增测试文件或 core 出口后必须再生**（v286 B 锚 + test-coverage-matrix --check 双守护）；零触达候补池读 JSON `zero_touch_risk_order`
- 视觉准入：`npm run audit:app`（#243，H 项 detail 已含 core 消费比量化）；快照 `docs/visual-admission-baseline.json`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json`
- motion 水位：`node scripts/check-motion-tokens.mjs`（npm run check:motion 自带 --check）
- README 数字对账 / workflow lint / PWA 入口对账：`check:manifest`（#292）/ 源→dist 对账：`check:dist-parity`（#301）/ docs/ 索引一致性：`check:docs-index`（#295）/ 版本真源：`check:version` + `version:sync`
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
