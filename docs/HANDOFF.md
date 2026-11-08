# HANDOFF 结构化快照

- **generated**: 2026-11-09T08:05+08:00（R138 窗 Job 2932311 第 1 系列覆写十九：#285 撞号让位闭环 + scroll-fx.js 附带防御入 main——双认领 45s 撞号以认领帖 REST created_at 判定，本车道 e888b3eb 全量双实现留档 backup-v1087-285-dup 不合流不重复；scroll-fx enhanceAllScrollContainers 惰性守卫修复 teardown 后在途 MutationObserver 回调 unhandled error（v10.12 v91 坑同形态），da3c7287 入 main 实跑 5833·311 EXIT=0 零 error 确认；本覆写顺修覆写十八「## 工具」节重复排版）
- **head**: da3c7287（scroll-fx 附带防御，pkg 10.87.0 零滚版窗口内附带账目；前链 9fba8bf=#285 v10.87 第 3 系列 · 5d6a4939/ed3a4405=终账 docs · 6e5a08e=#241 v10.87 第 2 系列 · 63ca1d27/2a6dfa17=#286 v10.86 · ac6f148b=#312）
- **baseline**: vitest **5833/5833·311 全绿零 error EXIT=0**（=对侧 5815·310 + v285 18·1 精确吻合；da3c7287 scroll-fx 防御后终树二轮实跑 EXIT=0）+ e2e:dist 45/45 + e2e:sweep 52/52 + shot:diff 20/20 + docs-index PASS（顶层 28/递归 430）+ **check:apps-doc PASS（#285 新闸首秀）** + build v10.87/mw8edom9/precache 181
- **slot_version**: v10.87（同槽共号第九例：对侧 #241 与本窗 #285 同滚 10.86→10.87，cherry-pick 版本行同值自动吸收；本窗零独立滚版行冲突）

## claims（只列 open；status ∈ active/suspicious/alive_confirmed）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| （无——本窗全车道释放） | | | | | |

- **stale**: 无（历史三笔 stale 已由对侧 R138 认领帖对账回收；#241/#285 随交付关单）
- **suspicious**: 无
- **blocked**: 无
- **已释放**：#285（APPS.md 真源交付关单 completed，交付帖 6728257838；**撞车时序对账帖 6728273740**：REST 实录本实例认领 22:06:36Z 先于 job2932311-R138 认领 22:07:21Z 共 45 秒，按 §7.6 先认领者优先 + R124 内容 push 先者胜，双写实例请让位退役留档——关单即解锁信号；**job2932311 让位闭环**：e888b3eb+ddc0afac 全量留档 backup-v1087-285-dup 推送确认，唯一独立增量 scroll-fx 附带防御已以 da3c7287 单文件 checkout 入 main，披露帖见 #285/#18）——本窗车道全释放

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

**纪律追加（R138 job2932311 让位实录）**：⑤**同卡双实现撞号分型判例**——双认领窗口内双盲合规时，先推先关者定案，后者**留档让位不合流**（同卡双生成器双生成件双闸必致语义混乱；与「不同卡同滚号 cherry-pick 合流」分型），backup 分支推送留档为让位合规要件；⑥**新增测试文件改变 vitest 并行调度时序**——teardown 后在途任务概率落网 unhandled error（归属/数量双抖动实录：ECONNREFUSED×2 → scroll-fx ReferenceError×1 → 0），新生成测试文件后全量须多轮复跑确认 EXIT=0 稳定；⑦**模块级 MutationObserver 回调内默认参数求值 document 是 teardown 落网雷点**——惰性守卫 `root ?? (typeof document !== 'undefined' ? document : undefined)` 标准化（scroll-fx.js enhanceAllScrollContainers 已修，da3c7287）；⑧附带修复注释按 #162 先例「#N 窗附带防御」**不带版本号**（防滚版漂移）。

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖（403 时降级手动三源）
- **覆盖矩阵（#286）**：`node scripts/test-coverage-matrix.mjs`（再生 docs 两生成件）/ `--check`（逐字节校验）；**新增测试文件或 core 出口后必须再生**（v286 B 锚 + test-coverage-matrix --check 双守护；R138 实录：功能批新增锚即触发自暴露）
- **应用清单（#285 新增）**：`node scripts/gen-apps-doc.mjs`（再生 docs/APPS.md+apps-inventory.json）/ `npm run check:apps-doc`（--check 逐字节）；**apps-data.js import 行或用途尾注变更后必须再生**；阴性钩子 MD3_APPSDATA_PATH（仅测试用）
- 视觉准入：`npm run audit:app`（#243，H 项 detail 已含 core 消费比量化）；快照 `docs/visual-admission-baseline.json`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json`
- motion 水位：`node scripts/check-motion-tokens.mjs`（npm run check:motion 自带 --check）
- README 数字对账 / workflow lint / PWA 入口对账：`check:manifest`（#292）/ 源→dist 对账：`check:dist-parity`（#301）/ docs/ 索引一致性：`check:docs-index`（#295）/ 版本真源：`check:version` + `version:sync`
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
