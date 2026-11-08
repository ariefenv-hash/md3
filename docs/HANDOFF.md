<!-- docs/HANDOFF.md — #234② 结构化交接快照（新实例读 #18 正文 + 本文件即可开窗，不必翻全部评论） -->
<!-- 维护纪律：每轮交付后立即覆写快照（#234 §七，不是槽末统一写）；数据由 scripts/claim-registry.mjs 扫描组装，禁手抄 claims。 -->

# HANDOFF 结构化快照

- **generated**: 2026-11-08T21:10+08:00（R133 窗 Job 2932311 覆写五：#301 v10.80=936e25f2 交付关单（撞号二十度 backup-v1080-301 留档→reset→零交集重放→重滚 279 文件）+ 加餐 #287 quirk 台账 9be76a60 零滚版交付关单）
- **head**: v10.80 = 936e25f2（#301 对账门禁；docs 加餐 9be76a60=#287 quirk 台账零滚版；前链 4c4f4aaf=v10.79 #293 · c1e61fc=v10.79 #307 · a7e28ad=v10.78 #306 · c1214930=v10.78 #281 · 1e7c3411=v10.77 #292 · 0ae68a9b=v10.76 #299）
- **baseline**: vitest **5664/5664·297** 全绿零 error（=对侧 5656·296 + 本方 v301-dist-parity 8 锚·1 精确吻合账目闭合；v10.80 合流终树实跑）
- **slot_version**: v10.80（R133 窗两卡：主卡 #301 源→dist 四通道对账门禁 check:dist-parity 5/5（build 前后双跑）+ 阴性验证 + EXEMPT_INTENT demo/docs 文档化；motion 水位维持 tokens 235/bare 122 令牌化率 65.8%）
- **e2e**: 45/45 pageerror+同源资源错误+同源网络失败累计 0（precache 181 条含 error-hub.js/catalog.json 全 200）· shot:diff 20/20 全 match · check:version 7/7 · check:comments 无新增失配 · check:motion PASS · check:workflows 3/3 · check:manifest 22/22 · **check:dist-parity 5/5（#301 新门禁，build 前后双跑）** · check:dist 全过 · build __SW_VERSION__→v10.80（BUILD_ID mw7t8xu0；v10.80 合流终树实跑）
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
| #301 | v10.80 = 936e25f2（源→dist 四通道对账门禁：A apps+assets 126 件全就位 / B fetch 白名单 catalog.json #298 族 / C 入口三件 / D EXEMPT_INTENT demo/docs 有意排除文档化；阴性验证在册；tests/v301 8 锚 + check:dist-parity 5/5；撞号二十度 backup-v1080-301 留档→reset 42889e32→零交集重放→重滚 279 文件；vitest 5664·297/e2e 45/45/shot 20/20；认领帖 6721253590 · 交付帖 6721556565；2932311） | closed（completed，完成即关 §7.7） |
| #287 | 9be76a60（浏览器 quirk 台账 docs/ios-quirks.md：iOS 三条全实证+微信一条+Edge 待录指针+e2e 回归锚索引表+new-app.mjs 铁律指路；纯文档零滚版；vitest 5664·297 复跑；2932311） | closed（completed，完成即关 §7.7） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#249/#250/#248 等历史留核面维持现状，由用户真机核）

## next_candidates（R134 续点 · 顺序真源 docs/worklog.md 末行）

1. **#215 文件应用重构**（重型，R 充足窗评估，一次性大重构）
2. 存量 11 偏薄（#229 P2 序 + #177 盘点车道，不混槽）
3. V3 圆角批 4 余量（2933040 车道同域顺延）/ V7 空态批 4（按水位分批立卡）
4. **#300 全应用 sweep 自动化入库**（P2 测试，方法已验证 52/52 通畅）/ **#295 docs/ 归档与索引策略**（docs/ 已 432 文件）
5. #241 键盘可达性余量批（R123-G 租约 TTL 后对账；#250/#248 needs_review 留核不重做）

**纪律新增（R133 实录）**：git push 禁用管道掩码（`git push | tail` 的 EXIT=0 是 tail 的假绿）——必须直查 push 退出码 + REST 回读 HEAD 双确认；撞号被拒按合流协议：backup 分支留档 → reset --hard 对齐 → 车道对账零交集重放 → 重滚防倒挂。

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖
- 视觉准入：`npm run audit:app`（#243）；快照 `docs/visual-admission-baseline.json` + 文档 `docs/visual-admission-baseline.md`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json`
- motion 水位：`node scripts/check-motion-tokens.mjs`（npm run check:motion 自带 --check）
- README 数字对账 / workflow lint / PWA 入口对账：`check:manifest`（#292）/ 源→dist 对账：`check:dist-parity`（#301，四通道+EXEMPT_INTENT 排除意图唯一真源）/ 版本真源：`check:version` + `version:sync`
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
