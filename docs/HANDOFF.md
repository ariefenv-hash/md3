<!-- docs/HANDOFF.md — #234② 结构化交接快照（新实例读 #18 正文 + 本文件即可开窗，不必翻全部评论） -->
<!-- 维护纪律：每轮交付后立即覆写快照（#234 §七，不是槽末统一写）；数据由 scripts/claim-registry.mjs 扫描组装，禁手抄 claims。 -->

# HANDOFF 结构化快照

- **generated**: 2026-11-08T18:30+08:00（R132 窗 · Job 2932311 第 1 定时消息系列 · #299 e2e:dist 网络层防线交付关单 v10.76=0ae68a9b · 覆写）
- **head**: v10.76 = 0ae68a9b（#299 网络层防线；前链 c1ef213d=v10.75 动画修复 · 5de6f676=v10.75 市场目录 · ee7613a3=v10.74 README 对账 · a6a2b421=v10.73 deploy 自证）
- **baseline**: vitest **5607/5607·291** 全绿零 error（=R131 5596·290 + 本方 v299-e2e-net-guard 11 锚·1 文件精确吻合账目闭合；v10.76 终树滚版前后双实跑）
- **slot_version**: v10.76（R132 窗一卡：#299 e2e:dist 网络层防线——同源 response≥400 + requestfailed 双通道收集 + NET_EXEMPT 豁免表机制（空表零豁免起步）+ dist 关键资源清单 8 项（#298/#297 双事故文件永久回归锚）；motion 水位维持 tokens 235/bare 122；本窗零撞号）
- **e2e**: **45/45**（=41 应用+时钟功能级 2+precache 1+关键资源 1 新增；**同源网络失败累计 0**——现行 dist 零缺件新防线零误报实证）pageerror+同源资源错误+同源网络失败累计 0 · shot:diff 20/20 全 match · check:motion PASS · check:version 7/7 · check:comments 317 文件生效失配 0 · check:workflows 3/3 · check:dist 全过 · build __SW_VERSION__→v10.76（precache 180/BUILD_ID mw7oqip9）
## claims（只列 open；status ∈ active/suspicious/alive_confirmed，#234 §七③）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| #281 | job2931605-R132-s3 | R132 | ~35min | active | error-layer（全局错误捕获，勿撞） |
| #241 | job2931605-R123-G | R123 | ~985min | active | keyboard-a11y+shell-focus+chess-grid（TTL 24h 未到） |
| #223 / #18 | md3-C3-R119 | R119 | ~1335min | active | roll-version+vite-config+sw（旧仪式车道） |

- **stale**: 无
- **suspicious**: 无
- **blocked**: 无

## closed_this_slot（R132 · 完成即关 §7.7）

| issue | 交付 | 状态 |
|---|---|---|
| #299 | v10.76 = 0ae68a9b（e2e:dist 网络层防线四件：同源 response≥400 + requestfailed 双通道 / NET_EXEMPT 豁免表 / 关键资源清单 8 项含 #298/#297 回归锚 / 逐应用接线+heal 重挂；tests/v299 11 锚；vitest 5607·291/e2e 45/45 网络失败累计 0/shot 20/20；认领帖 6720161209 · 交付帖 6720373279） | closed（completed，完成即关 §7.7） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#248/#249/#250 等历史留核面维持现状，由用户真机核）

## next_candidates（R133 续点 · 顺序真源 docs/worklog.md 末行）

1. **#262 批 2**（V4 状态层余 24 家分批，2933040 车道在途勿撞）
2. **#301 dist 与源码资产对账门禁**（P2 构建，与本轮④关键资源清单天然成对：脚本扫运行时引用资产逐一对账 dist，demo/docs 排除意图写入 vite.config 注释豁免表）
3. #292 manifest icons 完整性审计（P3 轻量）/ #293 launch.html 定位盘点（P3，launch.html 已入关键资源清单首锚）
4. #215 文件应用重构（重型，R 充足窗评估，一次性大重构）
5. #241 键盘可达性余量批（R123-G 租约 TTL 后对账；#250/#248 needs_review 留核不重做）

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖（403 限流时 GH_TOKEN 换备 Token）
- 视觉准入：`npm run audit:app`（#243）；快照 `docs/visual-admission-baseline.json`（新增组 100% 关单快照）+ 文档 `docs/visual-admission-baseline.md`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json` + 文档 `docs/visual-baseline.md`
- motion 水位：`node scripts/check-motion-tokens.mjs`（报告 / `--check` 防回退 / `--update` 固化；npm run check:motion 自带 --check 前置参数，update 需直调脚本）
- README 数字对账：`npm run check:readme-counts`（#267 v10.74 落地）；workflow lint：`npm run check:workflows`（#266 v10.73 落地）
- **e2e:dist 网络层防线（#299 v10.76 落地）**：同源 4xx/5xx + requestfailed 双通道自动收集，豁免表 NET_EXEMPT 在 scripts/e2e-dist-smoke.mjs 顶部（每项必附理由）；关键资源清单 KEY_RESOURCES 增项即改该数组
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
