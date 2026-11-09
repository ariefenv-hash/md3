# HANDOFF 结构化快照

- **generated**: 2026-11-09T12:55+08:00（R141 窗 Job 2933040 第 2 系列覆写二十四：#315 V7 登记面勘定卷交付关单 d50fd80d——八家逐家实读裁决施工 0 家维持登记 9 家（#311 批 6 NA 判定实读确认 sound，逐家 rationale 见 #315 卡 D 段与 v315 锚 A2）+ terminal #314 D1 在录；V7 34/43 定格，**V 清单全维度达成「全 pass 或登记文面在录」终态**；tests/v315 5 锚（实读证据锚九条防误施工）+ 矩阵再生 315 + 零滚版 v10.91 维持（#278 收口锚批先例同律）+ 源码零改动纯 tests 卷；R140 窗主任务 v10.91=635e7d6c 与 docs 终账 f0c65aa 跨槽收尾账目闭合在案）

- **head**: d50fd80d（#315 勘定卷 tests-only，pkg 10.91.0 维持零滚版；前链 f0c65aa=R140 终账 · 635e7d6c=v10.91 #314 · beb78677=R140 第 3 系列终账 · 96f52d20=v10.90 · c1147f75=v10.89）

- **baseline**: vitest **5885/5885·315 全绿零 error EXIT=0**（=5880·314 + v315 5·1 精确吻合）+ e2e:dist 45/45（累计 0）+ e2e:sweep 52/52（错误总量 0）+ shot:diff 20/20 全 match + docs-index PASS + check:apps-doc PASS + check:motion PASS + check:version 7/7 + check:comments 失配 0 + 矩阵 315 --check PASS（dist 零重建：源码零改动纯 tests 卷）


## slot_version

v10.91（撞号合流重滚：本卡初滚 v10.89 让位重编，对侧本窗 v10.89=c1147f75 / v10.90=96f52d20 两卷在先；backup-v1089-314 = 894752c 全量留档）

## claims（只列 open；status ∈ active/suspicious/alive_confirmed）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| #305 | job2932311-R140 | R140 | 2026-11-09T10:14:38+08:00 | active | keymap-doc（第 1 系列在途未交付；R142 先 REST 对账，零交集才动相邻面） |

- - **stale**: 无（#223·#18 R119 时代 roll-version 旧车道两笔已随 #314 认领帖对账回收）
- **suspicious**: 无
- **blocked**: 无
- **已释放**：#286 续车道首批（v10.89=c1147f75）+ 二批（v10.90=96f52d20）随交付关账释放（第 3 系列在途余项见 next_candidates 2）；#314 认领租约随本卡交付关单释放

## closed_this_slot（R141 + R140 跨槽收尾 · 完成即关 §7.7 · 第 2 系列）

| issue | 交付 | 状态 |
|---|---|---|
| #315 | d50fd80d（V7 登记面勘定卷：八家逐家实读裁决施工 0 家维持登记 9 家 + tests/v315 5 锚实读证据 + 零滚版 v10.91 维持；交付帖见 #315 评论区） | closed（completed） |
| #314 | v10.91 = 635e7d6c（V 清单批 9：V3 43/43 全清 + V7 chess 消项 34/43 + camera V1 结构性非缺口登记 + 焦点环打磨；tests/v314 9 锚 + 重锚四笔；撞号合流 backup-v1089-314 留档重滚；交付帖 6732070679） | closed（completed） |

| issue | 交付 | 状态 |
|---|---|---|
| #286（续车道二批·加餐） | v10.90 = 96f52d20（ref-only 第二批 photo 补提取；交付帖见 #286 评论区） | 主卡 #286 续车道第二批 |
| #286（续车道首批） | v10.89 = c1147f75（ref-only 首批 files/settings 补 core 提取；交付帖见 #286 评论区） | 主卡 #286 续车道交付 |
| #313 | v10.88 = 472b0f6（V8 深窄屏 4 家清零 + V2 字体阶梯 4 家直连 + terminal 非缺口登记；交付帖 6729765358） | closed（completed） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#249/#250/#248 等历史留核面维持现状，由用户真机核）

## next_candidates（R142 续点 · 顺序真源 docs/worklog.md 末行）

1. **ref-only 余 24 家补 core 提取**（第 3 系列车道，覆写二十二原样续：高频优先 contacts/translate/camera/notes/safari/phone；contacts 业务面薄需评估提取价值；native 巨石重构属重型 §7.5 边界自查；认领帖 lane 精确到批）
2. **#305 对账**（第 1 系列在途 lane=keymap-doc——R142 先 REST 对账其交付态再取候选，零交集才动相邻面）
3. **#247 P0 竞态 / #248·#249·#250 needs_review 组**（pending_verification 白名单面，用户真机核优先）
4. **#294 触控目标第 J 项 / #291 测试前缀常青化策略**（P3 方案裁决卷候选，立卡先裁决后施工）
5. **V 清单：终态达成定格**（V8 43/43 · V3 43/43 · V2 42/43+登记 · V1 42/43+登记 · V7 34/43+登记九家 · V4/V5/V6 已清——后续仅演进重评：新应用随树入卡、登记面遇功能演进随演进重锚，不再单列批卡）

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖（403 时降级手动三源）
- **覆盖矩阵（#286）**：`node scripts/test-coverage-matrix.mjs`（再生 docs 两生成件）/ `--check`（逐字节校验）；**新增测试文件或 core 出口后必须再生**（v286 B 锚 + test-coverage-matrix --check 双守护；R138 实录：功能批新增锚即触发自暴露）
- **应用清单（#285 新增）**：`node scripts/gen-apps-doc.mjs`（再生 docs/APPS.md+apps-inventory.json）/ `npm run check:apps-doc`（--check 逐字节）；**apps-data.js import 行或用途尾注变更后必须再生**；阴性钩子 MD3_APPSDATA_PATH（仅测试用）
- 视觉准入：`npm run audit:app`（#243，H 项 detail 已含 core 消费比量化）；快照 `docs/visual-admission-baseline.json`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json`
- motion 水位：`node scripts/check-motion-tokens.mjs`（npm run check:motion 自带 --check）
- README 数字对账 / workflow lint / PWA 入口对账：`check:manifest`（#292）/ 源→dist 对账：`check:dist-parity`（#301）/ docs/ 索引一致性：`check:docs-index`（#295）/ 版本真源：`check:version` + `version:sync`
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
