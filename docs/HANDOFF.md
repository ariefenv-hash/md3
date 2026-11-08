# HANDOFF 结构化快照

- **generated**: 2026-11-09T04:15+08:00（R136 窗 Job 2933040 第 2 系列覆写十五：#312 V 清单批 7 V1 动态取色 7 家直连+camera 功能色登记 v10.85=ac6f148b 交付关单（三度合流 backup-v1084-312-v1[-m2/-m3] 留档；vitest 5797·309 全绿账目闭合）；前窗：Job 2931605 覆写十四 #215 files 重构 v10.84=607ccc10 + Job 2932311 #296/#279 —— 原文：#215 文件应用二级菜单一次性大重构 v10.84=607ccc10 交付关单（目录操作菜单可达主诉根治+action mode 四键+子页能力对齐+Recents+rail 分类直达；撞号廿六/廿七度合流 backup-v1084-215 留档；vitest 5789·308 全绿账目闭合））
- **head**: ac6f148b（#312 V1 批 7 三轮合流终树；前链 c3bc1135=#215 docs · 607ccc10=#215 v10.84 · f324c40d=#279 docs · bd11d702=#279 vendor v10.85 · dc947358=#296 docs · d75c6a08=#296 v10.84 · dd3ef7b7=#311 docs）
- **baseline**: vitest **5797/5797·309** 全绿零 error（=对侧 5789·308 + v312 8·1 精确吻合；ac6f148b 三轮合流终树实跑）+ e2e:sweep 52/52 + e2e:dist 45/45 + shot:diff 20/20 + docs-index PASS + V 水位 36/5/0（V1 维度 40/2：7 家 true+camera 登记 false）+ 9 项 A 项 7 家同步翻转（quality-baseline 双基线同刷）
- **slot_version**: v10.85（R136 窗四卡：#296 v10.84=d75c6a08（2932311）+ #215 v10.84=607ccc10（2931605）+ #279 vendor v10.85=bd11d702（2932311 加餐）+ #312 V1 批 7 v10.85=ac6f148b（2933040 本卡）——同号多实例共存第七/八例；合流树滚版行 v10.85 为准）

## claims（只列 open；status ∈ active/suspicious/alive_confirmed，#234 §七③）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| #241 | job2931605-R123-G | R123 | ~1255min | active | keyboard-a11y+shell-focus+chess-grid（勿撞，TTL 24h 边界 185min 内，本窗后可对账回收） |
| #223 / #18 | md3-C3-R119 | R119 | ~1605min | stale | roll-version+vite-config+sw（旧仪式车道，>24h TTL 已过——后来者可单方面判定失效，零车道交集） |

- **stale**: #223/#18（md3-C3-R119，~1605min > 1440min TTL）
- **suspicious**: 无
- **blocked**: 无
- **已释放**：#215（files-refactor 交付关单 completed）/ #296（注释契约交付关单 completed）/ #279（vendor 台账交付关单 completed）——本窗三实例全车道释放

## closed_this_slot（R136 · 完成即关 §7.7 · 三实例合并账）

| issue | 交付 | 状态 |
|---|---|---|
| #296 | v10.84 = d75c6a08（用途注释契约：apps-data.js 52 条用途尾注+check:comments 二期四类违约强检；tests/v296 14 锚；2932311） | closed（completed） |
| #215 | v10.84 = 607ccc10（文件应用二级菜单一次性大重构：目录 ⋮ 操作菜单+长按目录多选+目录详情+hasDir 门控+action mode 四键+子页 ⋮ 排序视图+方向翻转+Recents 子页+rail 分类直达；tests/v215 21 锚+e2e-v215 探针 15 项；撞号廿六/廿七度三度合流；2931605 本实例） | closed（completed，交付帖 6726035311） |
| #279 | v10.85 = bd11d702（vendor 供应链台账 11 顶层文件 vendor: 头注；2932311 加餐） | closed（completed） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#249/#250/#248 等历史留核面维持现状，由用户真机核）

## next_candidates（R137 续点 · 顺序真源 docs/worklog.md 末行）

1. **V8 深窄屏 5 家**（camera/clock-app/shortcuts/stocks/weather）/ **V2 字体阶梯 5 家**（chess/clock-app/game2048/terminal/threes）/ **V3 余量 chess 1 家**（#241 TTL 1446min 已过期转 STALE——下窗对账回收后正常认领路径开卡；terminal 已 #309 登记）——V1 已于 #312 批 7 清账（camera 功能色登记 false 维持）
2. **#286**（2932311 覆写十三候选序）
3. 存量 11 偏薄（#229 P2 序 + #177 盘点车道，不混槽）
4. **#241 键盘可达性余量批**（R123-G 租约 TTL 边界 185min 内——**下窗可对账回收**，回收后走正常认领路径 #236 勘误口径）

**纪律新增（R136 实录）**：cherry-pick 合流时滚版行同值/异值均被三方合并自动吸收（同值=零冲突吸收；异值 ours 优先=对侧滚版保留），合流树只需重放功能文件——较 R135 三度重放+dist 二度重汇流流程显著轻量，后续撞号合流可优先 cherry-pick 路径；push 网络劣化（GnuTLS -110 + connect 128s 超时）重试 2~3 次即过勿诊断。

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖
- 视觉准入：`npm run audit:app`（#243）；快照 `docs/visual-admission-baseline.json` + 文档 `docs/visual-admission-baseline.md`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json`
- motion 水位：`node scripts/check-motion-tokens.mjs`（npm run check:motion 自带 --check）
- README 数字对账 / workflow lint / PWA 入口对账：`check:manifest`（#292）/ 源→dist 对账：`check:dist-parity`（#301）/ docs/ 索引一致性：`check:docs-index`（#295）/ 版本真源：`check:version` + `version:sync`
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
