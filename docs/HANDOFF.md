<!-- docs/HANDOFF.md — #234② 结构化交接快照（新实例读 #18 正文 + 本文件即可开窗，不必翻全部评论） -->
<!-- 维护纪律：每轮交付后立即覆写快照（#234 §七，不是槽末统一写）；数据由 scripts/claim-registry.mjs 扫描组装，禁手抄 claims。 -->

# HANDOFF 结构化快照

- **generated**: 2026-11-08T20:55+08:00（R132 窗 Job 2931605 第 3 系列收工覆写三：#281 v10.78=c1214930 + #293 v10.79=4c4f4aaf 双卡交付关单 · 撞号十七/十八/十九度连环合流 backup-v1076-281/v1079-293 留档 · 同号共存链 c1214930=#281 → a7e28ad=#306 → c1e61fc=#307 → 4c4f4aaf=#293 合流段）
- **head**: v10.79 = 4c4f4aaf（#293 launch.html 定位盘点 + 版本锚补滚 230 文件合流段；docs 链 c36ea882 对侧收工账在册）
- **baseline**: vitest **5656/5656·296** 全绿零 error（=对侧 5614·292 + 对侧 v268/v269/v181-batch7 13 锚 + 本方 v281 20·1 + v293 9·1 精确吻合账目闭合；4c4f4aaf 终树实跑）
- **slot_version**: v10.79（R132 窗五卡：#299 v10.76 + #292/#306 v10.78 + #307 v10.79 + #281 v10.78 同号共存 + #293 v10.79 合流段；motion 水位维持 tokens 235/bare 122 令牌化率 65.8%；roll 防呆门⑤ R91 坑④ 合流回退倒挂实锤拦截 + 10.77→10.79 --force 跳步补滚 230 文件全程实录见 worklog R132 段）
- **e2e**: 45/45 pageerror+同源资源错误+同源网络失败累计 0（precache 181 条含 error-hub.js/catalog.json 全 200）· shot:diff 20/20 全 match · check:version 7/7 · check:comments 无新增失配 · check:motion PASS · check:workflows 3/3 · check:manifest 22/22 · check:dist 全过（4c4f4aaf 终树实跑）
## claims（只列 open；status ∈ active/suspicious/alive_confirmed，#234 §七③）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| #241 | job2931605-R123-G | R123 | ~1135min | active | keyboard-a11y+shell-focus+chess-grid（勿撞，TTL 24h 未到） |
| #223 / #18 | md3-C3-R119 | R119 | ~1485min | active | roll-version+vite-config+sw（旧仪式车道） |

- **stale**: 无
- **suspicious**: 无
- **blocked**: 无
- **已释放**：#281（error-layer 交付关单 completed）/ #293（launch-audit 交付关单 completed）——本实例 R132 全车道释放

## closed_this_slot（R132 · 完成即关 §7.7 · 双实例合并账）

| issue | 交付 | 状态 |
|---|---|---|
| #299 | v10.76 = 0ae68a9b（e2e 网络层防线：response>=400+requestfailed 双通道+NET_EXEMPT+关键资源清单 8 项；tests/v299 11 锚；2932311） | closed（completed） |
| #292 | v10.77 = 1e7c3411（PWA 入口完整性对账 check:manifest 22/22 新门禁 + maskable PIL 实证；tests/v292 7 锚；另一实例） | closed（completed） |
| #306 | v10.78 = a7e28ad（V 清单批 2 V4 状态层 21 家 39 面；2933040） | closed（completed） |
| #307 | v10.79 = c1e61fc（批 3 V3 圆角 19 家等值派生；快照 26/15/0 严重档清零；2933040） | closed（completed） |
| #281 | v10.78 = c1214930（全局错误捕获层：error-hub.js 三源汇聚+APP_ERROR 桥+vite 1.6b 根壳通道+__md3ErrorHub 五件套 sdk-facade；tests/v281 20 锚；2931605 本实例） | closed（completed，交付帖 6720741315） |
| #293 | v10.79 = 4c4f4aaf（launch.html 定位盘点：分享落地页头注+badge 版本动态填充反漂移+应用数 41 真源对齐；tests/v293 9 锚；2931605 本实例） | closed（completed，交付帖 6721346243） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#249/#250/#248 等历史留核面维持现状，由用户真机核）

## next_candidates（R133 续点 · 顺序真源 docs/worklog.md 末行）

1. **#301 dist 与源码资产对账门禁**（P2 构建；对侧 #292/#299 同族刚交付，认领前三查防撞）
2. #215 文件应用重构（重型，R 充足窗评估，一次性大重构）
3. 存量 11 偏薄（#229 P2 序 + #177 盘点车道，不混槽）
4. #241 键盘可达性余量批（R123-G 租约 TTL 后对账；#250/#248 needs_review 留核不重做）
5. #262 批 2 已由 2933040 交付（V4 批 2 21 家）；V 清单批 4/批 5 视对侧 R133 窗动向对账

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖
- 视觉准入：`npm run audit:app`（#243）；快照 `docs/visual-admission-baseline.json` + 文档 `docs/visual-admission-baseline.md`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json`
- motion 水位：`node scripts/check-motion-tokens.mjs`（npm run check:motion 自带 --check）
- README 数字对账 / workflow lint / PWA 入口对账：`check:manifest`（#292）/ 版本真源：`check:version` + `version:sync`
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
