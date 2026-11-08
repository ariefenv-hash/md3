<!-- docs/HANDOFF.md — #234② 结构化交接快照（新实例读 #18 正文 + 本文件即可开窗，不必翻全部评论） -->
<!-- 维护纪律：每轮交付后立即覆写快照（#234 §七，不是槽末统一写）；数据由 scripts/claim-registry.mjs 扫描组装，禁手抄 claims。 -->

# HANDOFF 结构化快照

- **generated**: 2026-11-08T18:55+08:00（R132 窗 · Job 2932311 第 1 定时消息系列 · #299 v10.76=0ae68a9b + 加餐 #292 v10.77=1e7c3411 · 覆写二）
- **head**: v10.77 = 1e7c3411（#292 PWA 入口对账；前链 0ae68a9b=v10.76 #299 网络层防线 · c1ef213d=v10.75 动画修复 · 5de6f676=v10.75 市场目录 · ee7613a3=v10.74 · a6a2b421=v10.73）
- **baseline**: vitest **5614/5614·292** 全绿零 error（=5607·291 + 本方 v292-manifest-icons 7 锚·1 精确吻合账目闭合；v10.77 终树滚版后实跑）
- **slot_version**: v10.77（R132 窗两卡：主卡 #299 e2e:dist 网络层防线 v10.76 + 加餐 #292 PWA 入口对账 v10.77（审计全维 PASS 零缺陷 + check:manifest 22/22 新门禁 + maskable 安全区 PIL 实证 117.5px≤204.8px）；motion 水位维持 tokens 235/bare 122；本窗零撞号）
- **e2e**: **45/45**（=41 应用+时钟功能级 2+precache 1+关键资源 1；**同源网络失败累计 0**）pageerror+同源资源错误+同源网络失败累计 0 · shot:diff 20/20 全 match · check:motion PASS · check:version 7/7 · check:comments 生效失配 0 · check:workflows 3/3 · **check:manifest 22/22（#292 新门禁）** · check:dist 全过 · build __SW_VERSION__→v10.77（precache 180/BUILD_ID mw7ppfb4）
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
| #292 | v10.77 = 1e7c3411（PWA 入口完整性对账：审计全维 PASS 零缺陷——icons 3 声明实物全对齐/maskable 绿底全出血+白字形 117.5px≤安全区 204.8px/theme_color 三方同源 #00875A/apple-touch 180×180；scripts/audit-manifest-icons.mjs 六维门禁 check:manifest 22/22 + tests/v292 7 锚；附带 v299 锚去版本化防滚版漂移；认领帖 6720407391 · 交付帖 6720611150） | closed（completed，完成即关 §7.7） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#248/#249/#250 等历史留核面维持现状，由用户真机核）

## next_candidates（R133 续点 · 顺序真源 docs/worklog.md 末行）

1. **#262 批 2**（V4 状态层余 24 家分批，2933040 车道在途勿撞）
2. **#301 dist 与源码资产对账门禁**（P2 构建，与 #299 ④关键资源清单 + #292 check:manifest 同族成对：脚本扫运行时引用资产逐一对账 dist，demo/docs 排除意图写入 vite.config 注释豁免表）
3. #293 launch.html 定位盘点（P3，launch.html 已入关键资源清单首锚）
4. #215 文件应用重构（重型，R 充足窗评估，一次性大重构）
5. #241 键盘可达性余量批（R123-G 租约 TTL 后对账；#250/#248 needs_review 留核不重做）

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖（403 限流时 GH_TOKEN 换备 Token）
- 视觉准入：`npm run audit:app`（#243）；快照 `docs/visual-admission-baseline.json`（新增组 100% 关单快照）+ 文档 `docs/visual-admission-baseline.md`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json` + 文档 `docs/visual-baseline.md`
- motion 水位：`node scripts/check-motion-tokens.mjs`（报告 / `--check` 防回退 / `--update` 固化；npm run check:motion 自带 --check 前置参数，update 需直调脚本）
- README 数字对账：`npm run check:readme-counts`（#267 v10.74 落地）；workflow lint：`npm run check:workflows`（#266 v10.73 落地）
- **e2e:dist 网络层防线（#299 v10.76 落地）**：同源 4xx/5xx + requestfailed 双通道自动收集，豁免表 NET_EXEMPT 在 scripts/e2e-dist-smoke.mjs 顶部（每项必附理由）；关键资源清单 KEY_RESOURCES 增项即改该数组。⚠ scripts/ 不在 roll-version.py 扫描集——该文件注释禁版本化（用议题引用形态）
- **PWA 入口对账（#292 v10.77 落地）**：`npm run check:manifest`（六维：icons 存在性+IHDR 实测尺寸+type/purpose+maskable+theme_color 三方+apple-touch-icon）；icons/ 实物被替换时须重跑 PIL 安全区探针（见 tests/v292 文件头注释）
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
