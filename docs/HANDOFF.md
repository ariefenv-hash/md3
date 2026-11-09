# HANDOFF 结构化快照

- **generated**: 2026-11-09T20:4x+08:00（R145 窗 Job 2933040 第 2 系列覆写三十一：#286 续车道 ref-only 第七批 game2048/threes 补 core 提取交付关单 2e006716——game2048Core 22 出口（VALS 11 档概率表+specialKind 阈值映射 0.04/0.08+cardId/wildcardCard 构造+mergeVal/mergePts 合并数学+bombPopCount+layoutMetrics 布局数学+canPlay/aiPlayable+AI_NULL_EV+fastSimulate/evaluateBoard/best2Ply/worstBlockedCol 2-Ply AI 引擎全纯核+dragTilt+toolDisabled+capInPlace+historyRecord+TIP_HIGHLIGHT_RE/isTipHighlight）+ threesCore 18 出口（FACES/PALETTE/TEXT_COLS 三表+DIRS/AI_LINES/SNAKE_MATS AI 表+getScore 幂指计分+canCombine/getMergedVal+deckProbs/bonusPool+mergeFreq/chimeFreq+simFlat/evalFlat/expectimaxFlat/chanceFlat/bestDirFlat GM AI 核 probs 参数化注入）+ index.html 接线 game2048 十八处 threes 十四处（head 同步加载时序+委托等值换算；随机源/LS/VFS/notify/DOM/AudioContext/canvas 留 host）+ tests/v286 P 组 8/Q 组 7 十五锚（真身直连阴性锚 game2048 十八处桥消费/threes 十四处桥消费）+ H3/v316-E 演进重锚 ref 16/coreFull 36/cores 37 七站存档链 + 旧锚演进重锚六笔（v181-batch7 布局/合并/AI 三笔+v181-batch12 合并/蛇形两笔+v312 B2 threes 白合计口径一笔）+ V1 演进重评登记（game2048 密度结构性跌破 v312 REGISTERED 双笔+v314 C1 名单演进+双基线重刷）+ 生成件随树再生（矩阵 37/37 消费 100%+globals 256+keymap 零漂移）+ 滚版 317 文件 10.95→10.96；**跨窗续作实录**：R144 窗 18:12 认领 6737572390 先于动工、施工全量落树后会话中断于全量 vitest 门禁处（19:45 弃单时限被中断突破，如实登记以交付为准），R145 窗 20:00 恢复——沙箱 327 文件改动完好零丢失+API 对账远端仍 bd790a64 零新卷零新认领车道独占延续；**新旧实现等值实证 ALL-EQUIV-OK**（equiv-check 脚本：game2048 fastSimulate 125 组/evaluateBoard 75 组/best2Ply 双模式 + threes 合并值域 225 组/六表逐键/sim 24 组/AI 全链；核验脚本三次构造笔误自纠——旧类闭包 AI_LINES/SNAKE_MATS 依赖注入/Int32Array 复用突变/chance 期望值笔误，core 本体零改动）

- **head**: 2e006716（#286 续七批 v10.96 终树；前链 bd790a6=覆写三十 docs · fdcc377d=#286 六批 archive/pdf v10.95 · a4c742d=覆写二十九 docs · df6e01f=#286 五批 phone/markdown v10.94）

- **baseline**: vitest **5977/5977·317 全绿零 error EXIT=0**（=bd790a6 树 5962·317 实测基线 + 本侧 P/Q 组 15·0 精确吻合账目闭合）+ check:version 7/7 + version:sync + check:comments 失配 0 + check:motion PASS + check:workflows 4/4 + check:manifest 22/22 + check:dist-parity 5/5（A 通道 138 件=136+2 core）+ check:docs-index PASS + check:apps-doc PASS + check:keymap PASS（wiring 3/bindings 33/comparisons 70/escape 17/scanned 259 零漂移）+ build __SW_VERSION__→v10.96/precache 193 + check:dist 全过 + e2e:dist 45/45（累计 0）+ shot:diff 20/20 全 match 零漂移 + e2e:sweep 52/52 错误总量 0 + 矩阵 --check 逐字节 PASS

## slot_version

v10.96（本窗唯一车道卷 2e006716；R144/R145 跨窗续作同属第 2 系列认领车道，无共号场景）

## claims（只列 open；status ∈ active/suspicious/alive_confirmed）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|

- **stale**: 无
- **suspicious**: 无
- **blocked**: 无
- **已释放**：#286 续车道七批（本卡 v10.96=2e006716 随交付关账释放）；#286 六批 archive/pdf（第 3 系列 fdcc377d 已交付）；#235 status-bar（第 1 系列 59ac6f3 已交付）

## closed_this_slot（R145 · 完成即关 §7.7）

| issue | 交付 | 状态 |
|---|---|---|
| #286（续车道第七批） | v10.96 = 2e006716（ref-only 第七批 game2048/threes 补 core 提取：game2048Core 22 出口+threesCore 18 出口+index.html 接线 32 处+P/Q 15 锚+演进重锚六笔+V1 演进重评登记+矩阵 ref 16/core-full 36/cores 37 消费 100%+globals 256；跨窗续作 R144 落树 R145 关单；交付帖见 #286 评论区） | 主卡 #286 续车道第七批交付（车道议题持续开放至池清空） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#248/#249/#250 等历史留核面维持现状，由用户真机核）

## 对账登记（R145 覆写三十一 · 诚实账目）

- **V1 演进重评登记（结构性掉线·非缺口·不硬造）**：game2048 AI 推演引擎上移 core.js（218 行纯数学零令牌面）后，审计目录合并口径密度 44/1130=3.9/百行跌破 A 口径 ≥4（index.html 侧 44/911=4.8 维持）——UI 零退化，纯提取车道结构性产物。处置：按 camera V1/terminal V2 非缺口登记先例 + V 清单终态定格「后续仅演进重评」条款，入 v312 REGISTERED=['camera','game2048']（三笔锚改）+ v314 C1 V1 余量名单演进（camera→camera+game2048）+ quality-baseline/visual-baseline 双刷（A/V1=false 如实登记）。**备忘**：ref-only 后续批（dice/reminders/shortcuts 等 borderline 密度应用）恐复现同墙——登记机制可复用，勿硬凑密度勿删文档凑行。
- **旧锚演进重锚六笔**：v181-batch7（布局数学/合并数学/AI 引擎 evaluateBoard 本体三断言上移 core+host 委托双锚）/v181-batch12（canCombine/getMergedVal/SNAKE_MATS 上移 core）/v312 B2（threes 白 #fff host 3+core 7 合计口径≥7 维持）——内联实现锚上移 core.js 真身（R142 v175/v181 先例同律），断言语义保持零放松。
- **跨窗续作与弃单时限披露**：认领帖声明「19:45+08 前未推送即弃单」，实际因会话中断（全量 vitest 门禁运行中被回收）顺延至 R145 窗 20:4x 关单——沙箱落树零丢失、远端零新卷、车道独占无竞争损害；时限纪律后续窗改为「认领帖只声明落树+推送双检查点，不留硬弃单时刻」。
- **矩阵生成件随 stamp/锚漂移第五实例**：锚编辑晚于矩阵再生 → D3 --check 红（测试文件消费映射漂移）——再生次序固化补一笔「锚编辑完成后统一再生矩阵」（与滚版后再生三件并列为次序纪律）。
- **锚组避让链**：I/J（四批 camera/notes）→ K（对侧 safari）→ M/L（五批 phone/markdown）→ N/O（对侧 archive/pdf）→ **P/Q（本卷七批 game2048/threes）**——五连避让链零冲突，后续批顺延 R 组起。

## next_candidates（R145 续点 · 顺序真源 docs/worklog.md 末行）

1. **ref-only 可提取池余 12 家补 core 提取**（#286 矩阵候补池 docs/test-coverage-matrix.json；已提取十三家：files/settings/messages/photo/translate/weather/camera/notes/safari/phone/markdown/archive/pdf + 本卷 game2048/threes；已登记非缺口五家：wallet/facetime/findmy + V1 演进重评 game2048（有核仍有 22 出口）/V 清单 camera；余池高频 dice(15)/reminders(13)/shortcuts(13)/flow11(12)/books(11)/stocks(9)/installer(9)/health(4)/mail(3)/recorder(3)/cal_app(2)/map(native 子串噪声低优先)，contacts 业务面薄暂缓在案；**同墙备忘：borderline 密度应用提取后走 V1 演进重评登记通道**；分批不硬塞 #229 先例同律；认领帖 lane 精确到批）
2. **#294 触控目标第 J 项 / #291 测试前缀常青化策略**（P3 方案裁决卷候选，立卡先裁决后施工）
3. **#247 P0 竞态 / #248·#249·#250 needs_review 组**（pending_verification 白名单面，用户真机核优先）
4. **CI run#617+ 恢复绿核验**（#235 第十站修复后部署链恢复，轻量观察位）
5. **V 清单：V1 41/43+登记双笔（camera/game2048）演进重评入账**（V8 43/43 · V3 43/43 · V2 42/43+登记 · V7 34/43+登记九家 · V4/V5/V6 已清——后续仅演进重评，不再单列批卡）

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖（403 时降级手动三源）
- **覆盖矩阵（#286）**：`node scripts/test-coverage-matrix.mjs`（再生 docs 两生成件）/ `--check`（逐字节校验）；**新增测试文件或 core 出口后必须再生（锚编辑完成后亦须再生——第五实例教训）**（v286 B 锚 + test-coverage-matrix --check 双守护）
- **应用清单（#285）**：`node scripts/gen-apps-doc.mjs`（再生 docs/APPS.md+apps-inventory.json）/ `npm run check:apps-doc`（--check 逐字节）；**apps-data.js import 行或用途尾注变更后必须再生**
- **globals 注册表（#242）**：`node scripts/scan-globals.mjs`（再生 docs/globals-registry 两件；新 core 出口必须再生，v242 构建闸守护）
- 视觉准入：`npm run audit:app`（#243；`--write-baseline`/`--write-visual-baseline` 开卡/登记重刷）；快照 `scripts/quality-baseline.json` + `scripts/visual-baseline.json`
- V 清单水位：同上 audit 双基线；快照随树再生
- README 数字对账 / workflow lint / PWA 入口对账：`check:manifest`（#292）/ 源→dist 对账：`check:dist-parity`（#301）/ docs/ 索引一致性：`check:docs-index`（#295）/ 版本真源：`check:version` + `version:sync` / 键位契约：`check:keymap`（#305）
- 滚版：`python3 scripts/roll-version.py <旧> <新>`（三形态 317 文件；滚版后统一再生矩阵/globals/keymap 三件）
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
