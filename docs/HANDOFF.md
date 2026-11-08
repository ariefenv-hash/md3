# HANDOFF 结构化快照

- **generated**: 2026-11-09T06:55+08:00（R138 窗 Job 2931605 第 3 系列覆写十八：#285 APPS.md 应用清单真源生成接线 v10.87=9fba8bf 交付关单——gen-apps-doc.mjs 生成器 + docs/APPS.md/apps-inventory.json 双生成件 + check:apps-doc 新闸 + tests/v285 18 锚 + v286 矩阵随树再生；撞号廿九度 cherry-pick 合流（对侧 #241 同滚 10.87 同号共存第九例）；撞车时序对账：本实例认领帖先于 job2932311 45 秒、后者让位口径已发帖；vitest 5833·311 全绿账目闭合）
- **head**: 9fba8bf（#285 v10.87 合流树；前链 6e5a08e/ed3a440=#241 v10.87 · 63ca1d27/5d179a2=#286 v10.86 · ac6f148b=#312 · 607ccc10=#215）
- **baseline**: vitest **5833/5833·311** 全绿零 error（=对侧 5815·310 + v285 18·1 精确吻合；9fba8bf 合流终树实跑）+ e2e:dist 45/45 + e2e:sweep 52/52 + shot:diff 20/20 + docs-index PASS（顶层 28/递归 430）+ **check:apps-doc PASS（#285 新闸首秀）** + build v10.87/mw8edom9/precache 181
- **slot_version**: v10.87（同槽共号第九例：对侧 #241 与本窗 #285 同滚 10.86→10.87，cherry-pick 版本行同值自动吸收；本窗零独立滚版行冲突）

## claims（只列 open；status ∈ active/suspicious/alive_confirmed）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| （无——本窗全车道释放） | | | | | |

- **stale**: 无（历史三笔 stale 已由对侧 R138 认领帖对账回收；#241/#285 随交付关单）
- **suspicious**: 无
- **blocked**: 无
- **已释放**：#285（APPS.md 真源交付关单 completed，交付帖 6728257838；**撞车时序对账帖 6728273740**：REST 实录本实例认领 22:06:36Z 先于 job2932311-R138 认领 22:07:21Z 共 45 秒，按 §7.6 先认领者优先 + R124 内容 push 先者胜，双写实例请让位退役留档——关单即解锁信号）——本窗车道全释放

## closed_this_slot（R138 · 完成即关 §7.7 · 第 3 系列）

| issue | 交付 | 状态 |
|---|---|---|
| #285 | v10.87 = 9fba8bf（gen-apps-doc.mjs 生成器：#296「用途：」切分点消费+三源对账强检 52=41+11+用途缺失/重复即红+MD3_APPSDATA_PATH 阴性钩子；APPS.md+apps-inventory.json 双生成件：52=41 iframe+11 native+外部站点 11+演示包 1 两口径分列·无时间戳逐字节可重现；check:apps-doc 闸；tests/v285 18 锚 A-H 含 #267 真源函数交叉对账+52 入口 fs 实存；v286 矩阵合流树再生；处置建议①②落地③#267 已落④#228 留点） | closed（completed，交付帖 6728257838） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#249/#250/#248 等历史留核面维持现状，由用户真机核）

## next_candidates（R139 续点 · 顺序真源 docs/worklog.md 末行）

1. **ref-only 27 家补 core 提取**（#286 矩阵候补池 docs/test-coverage-matrix.json；**首批实为 files/settings/messages 3 家**——music 已 core-full 不在池；native 巨石重构属重型 §7.5 边界自查；认领帖 lane 精确到批）
2. **V8 深窄屏 5 家 / V2 字体阶梯 5 家**（对侧 2933040 R139 续点同名候选——**第 3 系列认领明确化：不抢，若本窗加餐只走 ref-only 或 #278 车道**）
3. **#278 全量出口注册表**（window.__* 出口 104 文件面；#286 已收口 *Core 范式 23 个——本卡是超集登记车道）
4. **#247 P0 竞态 / #248·#249·#250 needs_review 组**（pending_verification 白名单面，用户真机核优先）

**纪律新增（R138 第 3 系列实录）**：①**push 对账真源 = `git ls-remote`**——REST /commits/main 有秒级缓存延迟会给出假旧值（本窗实录：push 日志显示成功但 REST 回读旧 sha，ls-remote 权威确认 9fba8bf 在库）；管道退出码假阳性同理（`git push | tail` 的退出码取 tail，GnuTLS 失败被吞）——push 后必须 `timeout 60 git ls-remote origin refs/heads/main` 回读对账；②生成件型交付随树再生纪律（R137 确立/R138 两实例互证有效）；③**认领时序争议以 REST created_at 为准**（秒级实录，本窗 45 秒差一锤定音）；④同槽双滚版本号 = cherry-pick 版本行同值自动吸收零冲突（第九例验证 §7.6① 同槽共号制度红利）。

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖（403 时降级手动三源）
- **覆盖矩阵（#286）**：`node scripts/test-coverage-matrix.mjs`（再生 docs 两生成件）/ `--check`（逐字节校验）；**新增测试文件或 core 出口后必须再生**（v286 B 锚 + test-coverage-matrix --check 双守护；R138 实录：功能批新增锚即触发自暴露）
- **应用清单（#285 新增）**：`node scripts/gen-apps-doc.mjs`（再生 docs/APPS.md+apps-inventory.json）/ `npm run check:apps-doc`（--check 逐字节）；**apps-data.js import 行或用途尾注变更后必须再生**；阴性钩子 MD3_APPSDATA_PATH（仅测试用）
- 视觉准入：`npm run audit:app`（#243，H 项 detail 已含 core 消费比量化）；快照 `docs/visual-admission-baseline.json`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json`
- motion 水位：`node scripts/check-motion-tokens.mjs`（npm run check:motion 自带 --check）

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖（403 时降级手动三源）
- **覆盖矩阵（#286）**：`node scripts/test-coverage-matrix.mjs`（再生 docs 两生成件）/ `--check`（逐字节校验）；**新增测试文件或 core 出口后必须再生**（v286 B 锚 + test-coverage-matrix --check 双守护；R138 实录：功能批新增锚即触发自暴露）
- 视觉准入：`npm run audit:app`（#243，H 项 detail 已含 core 消费比量化）；快照 `docs/visual-admission-baseline.json`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json`
- motion 水位：`node scripts/check-motion-tokens.mjs`（npm run check:motion 自带 --check）
- README 数字对账 / workflow lint / PWA 入口对账：`check:manifest`（#292）/ 源→dist 对账：`check:dist-parity`（#301）/ docs/ 索引一致性：`check:docs-index`（#295）/ 版本真源：`check:version` + `version:sync`
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
