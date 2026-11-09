# HANDOFF 结构化快照

- **generated**: 2026-11-09T14:35+08:00（R142 窗 Job 2931605 第 3 系列覆写二十五：#286 续 ref-only 第三批 translate/weather 补 core 提取交付关单 v10.92=9b1135cb——translateCore（LANGUAGES 21 档+getLangByCode+formatTime）+ weatherCore（WMO_CODES 22 档+CITY_PRESETS 18 城+findNearestCity+createWeatherSVG）双核新建 + index.html 九处真身接线 + F/G/H 组 12 锚 + E6 收敛 + 矩阵 ref 24→22·core-full 27·cores 28·消费 100% + 登记 247；R141 首建版沙箱回收丢失后原车道重建，滚版按认领帖顺延律 v10.92）
- **head**: 9b1135cb（v10.92 = #286 续第三批 translate/weather，pkg 10.92.0 滚版 301 文件；前链 3f3832dc=R141 覆写二十四 · d50fd80=#315 勘定卷 · 635e7d6=v10.91 #314 · beb7867e=R140 第 3 系列终账）
- **baseline**: vitest **5897/5897·315 全绿零 error EXIT=0**（=5885·315 + v286 续 F/G/H 12·0 精确吻合）+ e2e:dist 45/45（累计 0）+ e2e:sweep 52/52（错误总量 0）+ shot:diff 20/20 全 match + docs-index PASS + check:apps-doc PASS + check:motion PASS + check:version 7/7 + check:comments 失配 0 + build v10.92/precache 184（+2 core.js 入列）+ 矩阵 --check PASS

## claims（只列 open；status ∈ active/suspicious/alive_confirmed）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| #305 | job2932311-R140 | R140 | 2026-11-09T10:14:38+08:00 | active | keymap-doc（第 1 系列在途未交付；下窗先 REST 对账，零交集才动相邻面） |

- **stale**: 无
- **suspicious**: 无
- **blocked**: 无
- **已释放**：#286 续车道首批（v10.89）+ 二批（v10.90）+ **三批（本卡 v10.92=9b1135cb 随交付关账释放）**；#314/#315 认领租约随各自交付关单释放

## closed_this_slot（R142 · 完成即关 §7.7 · 第 3 系列）

| issue | 交付 | 状态 |
|---|---|---|
| #286（续车道第三批） | v10.92 = 9b1135cb（ref-only 第三批 translate/weather 补提取：translateCore/weatherCore 双核 + index.html 九处接线 + F/G/H 12 锚 + E6 收敛 + 矩阵 ref 22/core-full 27/cores 28 消费 100% + 登记 247；交付帖 6733694348） | 主卡 #286 续车道第三批交付（R141 首建版沙箱回收丢失后本窗重建关单） |

| issue | 交付 | 状态 |
|---|---|---|
| #315 | d50fd80d（V7 登记面勘定卷：施工 0 家维持登记 9 家 + tests/v315 5 锚 + 零滚版 v10.91 维持；交付帖见 #315 评论区） | closed（completed，R141 第 2 系列） |
| #314 | v10.91 = 635e7d6c（V 清单批 9：V3 43/43 全清 + V7 chess 消项 + camera/terminal 登记双笔 + 焦点环打磨；tests/v314 9 锚；撞号合流 backup-v1089-314 留档重滚；交付帖 6732070679） | closed（completed，R140 第 2 系列） |

| issue | 交付 | 状态 |
|---|---|---|
| #286（续车道二批·加餐） | v10.90 = 96f52d20（ref-only 第二批 photo 补提取；交付帖见 #286 评论区） | 主卡 #286 续车道第二批 |
| #286（续车道首批） | v10.89 = c1147f75（ref-only 首批 files/settings 补 core 提取；交付帖见 #286 评论区） | 主卡 #286 续车道交付 |
| #313 | v10.88 = 472b0f6（V8 深窄屏 4 家清零 + V2 字体阶梯 4 家直连 + terminal 非缺口登记；交付帖 6729765358） | closed（completed） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#249/#250/#248 等历史留核面维持现状，由用户真机核）

## next_candidates（R143 续点 · 顺序真源 docs/worklog.md 末行）

1. **ref-only 余 22 家补 core 提取**（#286 矩阵候补池 docs/test-coverage-matrix.json；首批 files/settings v10.89 + 二批 photo v10.90 + 三批 translate/weather v10.92 已落地，messages 勘误已 core-full 不在池，contacts 业务面薄评估暂缓在案；余 22 家按顺延评估 camera/notes/safari/phone + 池外日历/邮件/地图等次优先，分批不硬塞 #229 先例同律；native 巨石重构属重型 §7.5 边界自查；认领帖 lane 精确到批）
2. **#305 对账**（第 1 系列在途 lane=keymap-doc——下窗先 REST 对账其交付态再取候选，零交集才动相邻面）
3. **#247 P0 竞态 / #248·#249·#250 needs_review 组**（pending_verification 白名单面，用户真机核优先）
4. **#294 触控目标第 J 项 / #291 测试前缀常青化策略**（P3 方案裁决卷候选，立卡先裁决后施工）
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
