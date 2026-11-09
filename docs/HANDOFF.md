# HANDOFF 结构化快照

- **generated**: 2026-11-09T16:40+08:00（R143 窗 Job 2932311 第 1 系列覆写二十九终版：#235 第十站补修 v10.94 交付+**撞号合流第十二例本车道侧重放**——对侧第 3 系列 safari v10.94=6875a6a5 在窗内落库同号撞号 → backup-v1094-235-statusbar 留档推送 → reset 6875a6a5 → cherry-pick 版本锚同值自动吸收（仅 3 测试文件冲突：v286/v316 取对侧合流终态真值、v235 取本方新增内容）→ 合流树 dist 重建+矩阵再生（core 31/31 消费 100% ref 22/zero 0 =对侧终态吻合）→ **vitest 5936/5936·317 全绿**（=对侧 5935·317+本方新锚 1·0 精确吻合）；认领帖 6735304266 先于动工）

- **head**: c31da80c（#235 第十站补修 v10.94 合流重放；前链 6875a6a5=对侧 safari v10.94 撞号合流十二例 · 39be8fb=覆写二十八终账 v10.93 · 7db9042=覆写二十七终账 · 049eb60=zero-touch P1 卷 · d7a50d1e=覆写二十五三批终账 · 9b1135cb=#286 续三批 v10.92 · 90fafcc6=#315 终账 · d50fd80d=#315 tests · 635e7d6c=#314 v10.91 · 96f52d20=#286 续 photo v10.90 · c1147f75=#286 续 ref-only v10.89 · 264ed054=#305 keymap v10.89 · 472b0f6=#313 v10.88）

- **baseline**: vitest **5936/5936·317 全绿零 error EXIT=0**（=对侧 safari 合流树 5935·317 + 本方 v235 新锚 1·0 精确吻合账目闭合）+ e2e:dist 45/45（累计 0）+ e2e:sweep 52/52（错误总量 0）+ shot:diff 20/20 全 match + 十闸 PASS + build v10.94/mw8zhzwo/precache 187（守卫行零新资产，重建后与对侧 187 同值）

## slot_version

v10.94（**同槽共号：对侧 safari 6875a6a5 与本卡 23be2ec0 各自独立自 10.93→10.94 滚版，cherry-pick 合流后版本锚同值自动吸收零冲突——同槽共号先例第十/十一例同律；backup-v1094-235-statusbar = 23be2ec0 全量留档远端在案**）

## claims（只列 open；status ∈ active/suspicious/alive_confirmed）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|

- **stale**: 无（#223·#18 R119 时代 roll-version 旧车道两笔已随本卡认领帖对账回收存档）
- **suspicious**: 无
- **blocked**: 无
- **已释放**：#235 第十站补修认领（v10.94 随交付关账释放）+ #286 续车道首批（v10.89）+ 二批（v10.90）+ 三批（v10.92=9b1135cb）+ 四批（v10.93=39be8fb）随交付释放；#305 keymap-doc 租约随 264ed054 交付关单释放（d34dbdb 终账在库）

## closed_this_slot（R143 · 完成即关 §7.7 · 第 1 系列）

| issue | 交付 | 状态 |
|---|---|---|
| #235（第十站补修） | v10.94（CI run#616 实锤 status-bar.js _minuteTimer teardown 守卫：typeof 双亡守卫 + v235 A 组第十站锚 + 头注释十站化；run#616 前 5930 全 pass 但 1 Unhandled 连坐 build-and-deploy skipped，本卷后恢复；交付帖见 #235 评论区） | 主卡 #235 清单外新位点补修（议题本体 11-07 已 closed，回帖在案） |

| issue | 交付 | 状态 |
|---|---|---|
| #305 | v10.89 = 264ed054（全局键位契约零文档收口：gen-keymap-doc.mjs 生成器+双生成件+check:keymap 新闸+tests/v305 18 锚+D 键手势-only 裁决；交付链见 #305 卡） | closed（completed，R140 第 1 系列 d34dbdb 终账） |
| #315 | d50fd80d（V7 登记面勘定卷：施工 0 家维持登记 9 家 + tests/v315 5 锚 + 零滚版 v10.91 维持；交付帖见 #315 评论区） | closed（completed，R141 第 2 系列） |
| #314 | v10.91 = 635e7d6c（V 清单批 9：V3 43/43 全清 + V7 chess 消项 + camera/terminal 登记双笔 + 焦点环打磨；tests/v314 9 锚；撞号合流 backup-v1089-314 留档重滚；交付帖 6732070679） | closed（completed，R140 第 2 系列） |

| issue | 交付 | 状态 |
|---|---|---|
| #286（zero-touch P1 三家） | 049eb60（wallet/facetime/findmy 结构性非缺口登记卷：tests/v316 5 锚 + zeroTouch 3→0；零滚版；交付帖见 #286 评论区） | 主卡 #286 登记卷（R142 第 1 系列加餐） |
| #286（续车道三批） | v10.92 = 9b1135cb（ref-only 第三批 translate/weather 补提取：translateCore/weatherCore 双核 + F/G/H 12 锚 + 矩阵 ref 22/core-full 27/cores 28；交付帖 6733694348） | 主卡 #286 续车道第三批（R141 首建丢失后本窗重建关单） |
| #313 | v10.88 = 472b0f6（V8 深窄屏 4 家清零 + V2 字体阶梯 4 家直连 + terminal 非缺口登记；交付帖 6729765358） | closed（completed） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#249/#250/#248 等历史留核面维持现状，由用户真机核）

## 对账登记（R143 覆写二十九 · 诚实账目）

- **撞号合流第十二例本车道侧重放实录**：推送前探远端发现 9a43a9e7→6875a6a5（对侧第 3 系列 R143 开场 safari v10.94 落库，同号撞号）→ backup-v1094-235-statusbar（=23be2ec0）全量留档推送远端在案 → reset 6875a6a5 → cherry-pick 23be2ec0 → **版本锚 300+ 文件同值自动吸收**（双方各自独立 10.93→10.94 同值滚动，同槽共号先例第十/十一例同律）仅 3 测试文件冲突：v286/v316 取对侧（--ours）合流终态真值（cores 31/refOnly 22 含 safari 演进存档双侧叙事）、v235 取本方（--theirs）stamp 同值+第十站新增内容 → 合流树 dist 重建（precache 187 与对侧同值，守卫行零新资产）+矩阵再生（core 31/31 消费 100% ref 22/zero 0 =对侧终态吻合）。
- **对侧 message 声明与文件面出入登记（不代笔）**：6875a6a5 message 声明 vitest 5935/5935·**318** 文件，`git diff --diff-filter=A/D 9a43a9e7..6875a6a5 -- tests/` 实证零新增零删除（K 组 5 锚入既有 v286），文件面为 317——本车道合流终树实测 317 文件账目闭合，对侧笔误如实登记补录权在对侧。
- **CI run#616 第十站定性（v235 清单外低频 flake 实锤）**：test job = 5930/5930 全 pass 但 1 Unhandled Error（status-bar.js:340←:381 _minuteTimer 回调，B 组双亡窗内触发）——非 node 版本非新代码引入，而是每 61s 才 fire 一次的分钟级链落在 1.3s 双亡窗的 ~2% 级时序竞态，此前 600+ run 未暴露；本窗同树本地复跑 5930·317 零 error 即 flake 性实证。修复口径 = #232 同款 typeof 守卫（v10.38 后第四位新站：main.js×2→v10.93、status-bar.js→v10.94）。
- **撞号合流第十一例两段式实录**：初滚 v10.92=a44c344 push 被拒（对侧 9b1135cb/049eb60 两卷在先）→ backup-v1092-286 留档 → reset 049eb60 → 放弃 cherry-pick（stamp-vs-stamp 10.91→10.92 双方同滚 + v286 F 组编号对侧已用）→ 新树手工重放（camera 六处+notes 六处接线，注释 stamp 直书 v10.93）→ 锚组改号 I/J → 重滚 304 文件 → 二推遇对侧 docs 终账 7db9042（纯文档零车道）→ rebase 干净合流 → ls-remote 回读一致 ✓。
- **escape 宿主保留教训复盘**：重放编辑两次吞行（old_str 含 escape 行而 new_str 未含）即查即补——重放类操作后必须消费点全量 grep 自检（escape/formatTime/桥名三查）。
- **keymap 随 stamp 漂移第二实例**：滚版 10.92→10.93 触发 keymap 生成件再生（wiring 3/bindings 33/comparisons 70/escape 17 计数零漂移；camera/notes core 零键处理面实证——cameraCore/notesCore 均无 keydown 消费）。
- **网络实录**：GnuTLS -110 瞬断三遇均重试即过；`git config http.version HTTP/1.1` 修复一次长推超时（R138 管道退出码假阳性教训同源，push 后 ls-remote 回读纪律全程执行）。

## next_candidates（R144 续点 · 顺序真源 docs/worklog.md 末行）

1. **ref-only 余 23 家补 core 提取**（#286 矩阵候补池 docs/test-coverage-matrix.json；首批 files/settings v10.89 + 二批 photo v10.90 + 三批 translate/weather v10.92 + 四批 camera/notes v10.93 已落地，messages 勘误已 core-full 不在池，contacts 业务面薄评估暂缓在案；余 23 家高频优先 phone(29)/markdown(21)/archive(19)/pdf(18)/safari(18)/game2048(17)，分批不硬塞 #229 先例同律；native 巨石重构属重型 §7.5 边界自查；认领帖 lane 精确到批）
2. **#294 触控目标第 J 项 / #291 测试前缀常青化策略**（P3 方案裁决卷候选，立卡先裁决后施工）
3. **CI 门禁监控位**（本窗 v10.94 后 run#617+ 应恢复绿；若再现 Unhandled 族新位点按 #232/#235 同族纪律补站）
4. **#247 P0 竞态 / #248·#249·#250 needs_review 组**（pending_verification 白名单面，用户真机核优先）
5. **V 清单：终态达成定格**（V8 43/43 · V3 43/43 · V2 42/43+登记 · V1 42/43+登记 · V7 34/43+登记九家 · V4/V5/V6 已清——后续仅演进重评，不再单列批卡）

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖（403 时降级手动三源）
- **覆盖矩阵（#286）**：`node scripts/test-coverage-matrix.mjs`（再生 docs 两生成件）/ `--check`（逐字节校验）；**新增测试文件或 core 出口后必须再生**（v286 B 锚 + test-coverage-matrix --check 双守护；R138 实录：功能批新增锚即触发自暴露）
- **应用清单（#285 新增）**：`node scripts/gen-apps-doc.mjs`（再生 docs/APPS.md+apps-inventory.json）/ `npm run check:apps-doc`（--check 逐字节）；**apps-data.js import 行或用途尾注变更后必须再生**；阴性钩子 MD3_APPSDATA_PATH（仅测试用）
- 视觉准入：`npm run audit:app`（#243，H 项 detail 已含 core 消费比量化）；快照 `docs/visual-admission-baseline.json`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json`
- motion 水位：`node scripts/check-motion-tokens.mjs`（npm run check:motion 自带 --check）
- README 数字对账 / workflow lint / PWA 入口对账：`check:manifest`（#292）/ 源→dist 对账：`check:dist-parity`（#301）/ docs/ 索引一致性：`check:docs-index`（#295）/ 版本真源：`check:version` + `version:sync`
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
