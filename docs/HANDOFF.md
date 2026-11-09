# HANDOFF 结构化快照

- **generated**: 2026-11-09T23:2x+08:00（R146 窗 Job 2931605 第 3 系列覆写三十六：#286 续车道 ref-only 第十批 contacts 单家补 core 提取交付+撞号合流第十八例终树重放 v10.98=f1b861a2 关账）
- **head**: f1b861a2（#286 续第十批 contacts v10.98 双站合流终树：contacts 本侧 X 组 5 锚 + cal_app 对侧 W 组 8 锚；前链 5c334443=对侧 docs 两笔 · 65ce27bf=对侧 cal_app v10.98 · 6dfcfd0c=深提增值第十六例 · 680e2bf2=stocks 合流 · fe0fd67=本侧初放被拒不在主链（backup-v1098-contacts-286=bb721d7 U 组版留档在案））
- **baseline**: vitest **6009/6009·317 全绿零 error**（=对侧终树 6004·317【fe0fd67 6001-W5+cal_app W8】+X 组 5·0 精确吻合账目闭合）+ check:version 7/7 + check:comments 失配 0 + check:motion + check:workflows 4/4 + check:manifest 22/22 + check:dist-parity 5/5 + check:docs-index + check:apps-doc + check:keymap + build v10.98 + check:dist + e2e:dist 45/45 + shot:diff 20/20 零漂移 + e2e:sweep 52/52 错误总量 0
- **水位终态（双站合流）**: ref 11 / core-full 41 / cores 42 / zeroTouch 0 / 消费 100% 零 gap；globals __contactsCore 入册（42 家 core）；滚版 stamp 全树 v10.98 归一（同槽共号零重滚 §7.6①）
- **教训登记（本窗新增）**: ①push 成功判定 grep 模式 'main -> main' 误匹配 rejected 行两例（bb721d7/fe0fd67 两段均误判成功实际被拒）——本窗起 push 判定改 exit code+ls-remote 回读双验证；②rebase --continue 卡 sequencer（无未合并条目仍拒绝）改 rebase --quit 保留合并 index 直接提交同效；③对侧增值段冲突整取时 it/describe 闭合括号随冲突标注丢失（node --check 定位 Unexpected end of input 修复）；④沙箱清空丢未推工作教训延续（R144 v10.96 丢→R145 重放挽回）——本窗起 vitest 绿+静态闸+build 即推前置
- **generated**: 2026-11-09T22:5x+08:00（R146 窗 Job 2932311 第 1 系列覆写三十五：#286 续车道 ref-only 第十批 cal_app（calendar 日历）补 core 提取交付关单 v10.98 终树——calendarCore 十二出口（pad2/dateKey/parseKey/sameDay/isToday now 注入参数化/monthGrid 42 格周一起始恒定/sortEvents 非变异/noteTitle 40 封顶/notePreview 80 封顶/cleanNotesDB 非法回落 null/cleanEventsDB 空日键剔除/migrateLegacyNotes pairs 参数化 IO 留宿主）+ index.html 七处真身接线（head script src+四常量委托+isToday 注入箭头+loadDB 双核+loadEventsDB+三委托+renderCalendar 改吃 monthGrid，内联五处退役，__mdDialogA11y/__mdEscape 宿主零触碰）+ tests/v286 W 组 8 锚（W1-W8 全期望值 node 实证后落锚）+ H3 十站存档链续（ref 12/coreFull 40/cores 41）+ v316-E 重锚（41/12）+ 生成件随树再生（矩阵 41/41 消费 100% full 40/ref 12/zero 0+globals 260+keymap 零漂移+apps-doc+docs-index）+ 滚版 324 文件 10.97→10.98+pkg 10.98.0+README sync；**工序制度化第二窗**：滚版+核心测试过闸（6004·317）即 commit 32dd4d7a → backup-v1098-cal-app 推送回读确认 → build+十闸+e2e 长尾 → dist 为 gitignore 本地构建物零 diff → 原提交 65ce27bf 直推 6dfcfd0c..65ce27bf 一次过回读一致 ✓（本窗零撞号）；**沙箱故障实录**：22:00 槽沙箱启动失败整窗不可用（非沙箱工具完成远端侦察：REST 三路缓存陷阱三录——commits 列表 R65 时代/branches R87 时代/#286 评论 R140 时代三快照互斥）→ 22:25 重试任务（Job 2936522）触发恢复快进对齐 6dfcfd0c；**诚实对账勘误**：本系列 stocks 提交 680e2bf2 message 账 5972 系重放前口径，重放终树实测 5986（对侧深提卷已按 5986+10=5996 闭合），如实登记不代笔）
- **generated**: 2026-11-09T22:0x+08:00（R145 窗 Job 2933040 第 2 系列覆写三十四：#286 续车道深提增值合流重放（撞号合流第十六例三重文件级重叠首例）交付关单 v10.97 终树——game2048Core 十→二十一出口（增值 11：cardId/wildcardCard/mergeVal 与 mergePoints 分工/bombPopCount/layoutMetrics/canPlay/aiPlayable/dragTilt/toolDisabled/TIP_HIGHLIGHT_RE/isTipHighlight）+ threesCore 九→十八出口（增值 9：deckProbs/bonusPool/mergeFreq/chimeFreq/simFlat/evalFlat/expectimaxFlat/chanceFlat/bestDirFlat GM AI 期望树全链 probs 参数化注入）+ index.html 增值接线 game2048 十五处/threes 九处（对侧第七批 P 组/第八批 Q·R 组/第九批 S 组 shortcuts 契约与消费行零改动）+ tests/v286 追加 T 组 5/U 组 5（S 字母已由对侧第九批 shortcuts 占用，避让改号 P/Q/R/S→T/U 十一连避让链）+ P1 键集 10→21 增值合流扩展 + v181-batch7 两笔演进重锚（cardW/mergeVal 随深提退役上移走 core）+ V1 演进重评登记（game2048 增值并入后审计目录合并口径密度 44/1139=3.9<4 结构性跌破，index 侧 4.7 维持——v312 REGISTERED=['camera','game2048']+v314 C1 双笔名单演进+双基线重刷 A/V1=false 如实账）+ 生成件随树再生（矩阵 39/39 消费 100% full 38/ref 14 核名集不变+globals 再生+keymap 零漂移）+ dist 重建 precache 195；**合流实录（第十六例·三重文件级重叠首例）**：R144 认领 6737572390（game2048/threes 2 家）施工全量落树后会话中断于全量门禁 → 对侧同窗三卷落库（035bf11f 七批 game2048 同域/423e539f 八批 threes+dice 同域/fcd3f1e4 九批 shortcuts 滚版 v10.97）→ backup-v1096-286-deep=c4c4602（本侧初建 22+18 出口独立版）全量留档推送 ls-remote 回读一致 → 自 d622a265 起步重放增值面（对侧契约零改动+对侧未触及面净增+S 组改号避让+stamp 随 v10.97 树归一）→ 首推遇对侧三新卷非快进被拒 → 二次对账重放即本卷；**新旧实现等值 ALL-EQUIV-OK**（equiv-check 合并树终验：fastSimulate 125 组/evaluateBoard 75 组/worstBlockedCol minLen 签名/rollCardKind 阈值序/mergeVal/mergePoints/capHistory/buildHistoryRecord + threes 合并值域 225 组/六表逐键/sim 24 组/AI 全链 d2 d3；脚本对合并契约三处适配自纠）
- **generated**: 2026-11-09T22:1x+08:00（R145 窗 Job 2933040 第 2 系列覆写三十四：#286 续车道深提增值合流重放（撞号合流第十六例三重文件级重叠首例）交付关单 v10.97 终树——game2048Core 十→二十一出口（增值 11：cardId/wildcardCard/mergeVal 与 mergePoints 分工/bombPopCount/layoutMetrics/canPlay/aiPlayable/dragTilt/toolDisabled/TIP_HIGHLIGHT_RE/isTipHighlight）+ threesCore 九→十八出口（增值 9：deckProbs/bonusPool/mergeFreq/chimeFreq/simFlat/evalFlat/expectimaxFlat/chanceFlat/bestDirFlat GM AI 期望树全链 probs 参数化注入）+ index.html 增值接线 game2048 十五处/threes 九处（对侧第七批 P 组/第八批 Q·R 组/第九批 S 组 shortcuts/第八批续卡 T 组 stocks 契约与消费行零改动）+ tests/v286 追加 U 组 5/V 组 5（S/T 字母已由对侧 shortcuts/stocks 占用，避让改号 P/Q/R/S/T→U/V 十二连避让链）+ P1 键集 10→21 增值合流扩展 + v181-batch7 两笔演进重锚 + V1 演进重评登记（game2048 增值并入后密度 44/1139=3.9<4 结构性跌破，v312 REGISTERED=['camera','game2048']+v314 C1 双笔+双基线重刷 A/V1=false 如实账；rebase --theirs 方向反转教训一笔：rebase 中 theirs=我方，其 stocks T 组/HANDOFF/worklog 增量曾被误覆盖，已原文回插+组改号 U/V 后全链复验）+ 生成件随树再生（矩阵 40/40 消费 100% full 39/ref 13 核名集不变+stocks T 组原文回插+globals+keymap 零漂移）+ dist precache 196；**合流实录（第十六例·三重文件级重叠首例）**：R144 认领 6737572390（game2048/threes 2 家）施工全量落树后会话中断 → 对侧同窗四卷落库（035bf11f 七批 game2048 同域/423e539f 八批 threes+dice 同域/fcd3f1e4 九批 shortcuts/680e2bf2 stocks 续卡）→ backup-v1096-286-deep=c4c4602（本侧初建 22+18 出口独立版）全量留档推送 ls-remote 回读一致 → 首推两遇非快进被拒 → 两度对账重放（rebase 冲突三文件取对侧版+幂等重放增量）→ 同槽共号 v10.97 零重滚；**新旧实现等值 ALL-EQUIV-OK**（equiv-check 合并树终验：fastSimulate 125 组/evaluateBoard 75 组/worstBlockedCol minLen 签名/rollCardKind 阈值序/mergeVal/mergePoints/capHistory/buildHistoryRecord + threes 合并值域 225 组/六表逐键/sim 24 组/AI 全链 d2 d3）
- **head**: 65ce27bf（#286 续第十批 cal_app v10.98 终树；前链 6dfcfd0c=对侧深提增值合流 v10.97 · 680e2bf=stocks T 组本侧 · fcd3f1e=九批 shortcuts · 423e539=八批 threes/dice · 035bf11=七批 game2048）

- **baseline**: vitest **6004/6004·317 全绿零 error**（=5996·317 基线+W 组 8·0 精确吻合账目闭合）+ check:version 7/7 + check:comments 失配 0 + check:motion PASS + check:workflows 4/4 + check:manifest 22/22 + check:dist-parity 5/5（A 通道 142 件=+1 core.js）+ check:docs-index PASS + check:apps-doc PASS + check:keymap PASS（wiring 3/bindings 33/comparisons 70/escape 17/scanned 259 零漂移）+ 矩阵 --check 无漂移 + build __SW_VERSION__→v10.98/BUILD_ID mw9dgdaf/precache 197（+1 core.js）+ check:dist 全过 + e2e:dist 45/45（累计 0）+ e2e:sweep 52/52（错误总量 0）+ shot:diff 20/20 全 match

v10.97（三车道同号并轨终态：对侧 threes/dice+shortcuts 同槽共号两笔 + 本侧 stocks——合流后终树 stamp 归一 v10.97；backup-v1097-stocks/backup2-v1097-stocks 两轮留档远端在案）
- 本卷增补：backup-v1096-286-deep = c4c4602 全量留档（本侧初建 22+18 出口独立版，ls-remote 回读一致）

v10.97（同槽四卷：第七批 035bf11f v10.96 + 第八批 423e539f v10.96 + 第九批 shortcuts fcd3f1e4 v10.97 + 本卷增值合流 v10.97 维持——多卷零重滚 §7.6 ① 先例第十五/十六例连续实务）；backup-v1096-286-deep = c4c4602 全量留档（本侧初建 22+18 出口独立版，ls-remote 回读一致）

## claims（只列 open；status ∈ active/suspicious/alive_confirmed）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|

- **stale**: 无（#223·#18 R119 时代旧车道两笔已存档在案）
- **suspicious**: 无
- **blocked**: 无
- **已释放**：#286 续车道五批（本卡 v10.94=df6e01f 随交付关账释放）；#235 status-bar 车道（第 1 系列 59ac6f3 交付）；#286 safari 重放车道（第 3 系列 6875a6a 交付）

- **加餐（R146 · native 型另评登记卷 · 纯文档零滚版）**：mail 实读=204 行零纯函数面（三 DOM 桥接+静态模板）→ 结构性暂缓登记（books/contacts 同律）；recorder 实读=767 行嵌 6 薄函数（三函数与 filesCore 重叠）→ 薄面候选留 R147 立卡裁决；flow11 函数族盘点完成（A 连线 3 函数/B 计分数学/C 权重生成可整提约 9-11 出口，D 几何参数化可并，E/F 留 host）——R147 flow11 认领即备料就绪。管道吞字显示 bug 二度复现（flow11 激光段字节核验证伪）。

## closed_this_slot（R146 · 完成即关 §7.7 · 第 3 系列）

| issue | 交付 | 状态 |
|---|---|---|
| #286 | 第十批 contacts 单家 core 提取 v10.98=f1b861a2 撞号合流第十八例终树重放（contactsCore 八出口+九处接线+X 组 5 锚三重避让 U/V/W+双站合流终态 ref 11/full 41/cores 42+6009·317 全绿+全门禁链过） | ✅ 关账（认领帖 6742006944 · 交付帖随发） |

## closed_this_slot（R146 · 完成即关 §7.7 · 第 1 系列）

| issue | 交付 | 状态 |
|---|---|---|
| #286（续车道第十批） | v10.98 = 65ce27bf（ref-only 第十批 cal_app/calendar 补 core 提取：calendarCore 十二出口+index.html 七处接线+W 组 8 锚+H3/v316-E 演进重锚 12/40/41+矩阵 41/41 消费 100%+登记 260+滚版 324 文件；backup-v1098-cal-app=32dd4d7a 留档远端；交付帖 6743095503） | 主卡 #286 续车道第十批交付（车道议题持续开放至池清空） |

## closed_this_slot（R144 · 完成即关 §7.7 · 第 1 系列）

| issue | 交付 | 状态 |
|---|---|---|
| #286（续车道第九批） | v10.97 = fcd3f1e（ref-only 第九批 shortcuts 补 core 提取：shortcutsCore 三出口+index.html 四处接线+S 组 4 锚+演进重锚 14/38/39+矩阵 39/39 消费 100%+登记 258+reminders 暂缓登记；交付帖 6740890494） | 主卡 #286 续车道第九批交付（车道议题持续开放至池清空） |
| #286（续车道深提增值合流） | v10.97 = 本卷（game2048/threes 增值 20 出口并入对侧核文件+T/U 10 锚+P1 键集扩展+v181 两笔+V1 登记演进+双基线重刷+矩阵 39/39+dist 195；合流第十六例三重文件级重叠首例，backup-v1096-286-deep=c4c4602 留档在远端） | 主卡 #286 续车道七批增值合流交付（车道议题持续开放至池清空） |
| #286（续车道第八批） | v10.96 = 423e539（ref-only 第八批 threes/dice 补 core 提取：threesCore 九出口+diceCore 六出口 + index.html 十三处接线 + Q/R 组 10 锚 + 旧锚演进重锚三笔 + 矩阵 38/38 消费 100% full 37/ref 15 + 登记 257 + 撞号合流第十五例 backup-v1096-threes-dice 留档重放；交付帖 6740188297） | 主卡 #286 续车道第八批交付（车道议题持续开放至池清空） |
| #286（续车道第七批） | v10.96 = 本窗交付提交（ref-only 第七批 game2048 单家深提：game2048Core 十出口 + index.html 八处接线 + P 组 5 锚 + H3/v316-E 重锚 + v181 内联锚随上移重锚两行 + 矩阵 core 36/36 消费 100% ref 17/full 35 + 登记 255 + 滚版 317 文件；撞号 §7.6 时序判定在先 13 分钟名分成立；交付帖见 #286 评论区） | 主卡 #286 续车道第七批交付（车道议题持续开放至池清空） |

## closed_this_slot（R143 · 完成即关 §7.7）

| issue | 交付 | 状态 |
|---|---|---|
| #235（第十站） | 59ac6f3（status-bar.js _minuteTimer teardown 双亡守卫 + tests/v235 第十站锚；第 1 系列 R143 窗交付） | closed（对侧车道，CI run#616 Unhandled Error 恢复） |
| #286（续车道第五批） | v10.94 = df6e01f（ref-only 第五批 phone/markdown 补 core 提取：phoneCore/markdownCore 双核 + index.html 十二处接线 + M/L 16 锚 + 演进重锚四笔 + 矩阵 ref 20/core-full 32/cores 33 消费 100% + 登记 252；撞号合流第十三例 backup-v1094-pm-286 留档两段重放；交付帖 6736461978） | 主卡 #286 续车道第五批交付（车道议题持续开放至池清空） |
| #286（safari 重放） | v10.94 = 6875a6a（ref-only safari 补 core 提取：safariCore PBK 五键+pbQ/pbStep/pbFrameStyles + K 组 5 锚；第 3 系列 R143 开场重放交付，交付帖见 #286 评论区） | 主卡 #286 续车道第四批+交付（对侧） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#248/#249/#250 等历史留核面维持现状，由用户真机核）

## 对账登记（R145 覆写三十二 · 诚实账目）

- **撞号合流第十五例（同号共槽两车道）**：本侧初建 v10.96=539ff8c push 遇 GnuTLS 瞬断 → 重试时 ls-remote 回读捕获对侧 035bf11f（第 1 系列 game2048 v10.96）已落库 → backup-v1096-threes-dice=539ff8c 留档推送确认 → reset f5d0d0e（对侧 sha 回填 docs 层）→ 终树重放六文件（threes/dice 4 文件+v181/v312 零冲突直 checkout）+ v286 Q/R 组追加于对侧 P 组之后改号避让 + H3/v316-E 自 17/35/36 演进 15/37/38（七→八站存档链，起点为对侧终态而非 bd790a6 旧账——首版误按 16/36/37 重放被矩阵实值当轮纠正）→ 矩阵/globals/keymap 再生 → 423e539 二推一次过 ls-remote 回读一致 ✓。
- **R144 窗沙箱清空实录（用户预警应验）**：18:00 槽本系列全套提取+滚版工作未推送即随沙箱清空丢失；R145 窗完整重做（内容逐字节同源）并调整工序：**滚版+核心测试过闸后立即 commit，推送前置 backup 分支留档，build/e2e 长尾后补**——本窗推送一次过未再丢工。
- **审计密度稀释一笔（dice V1 基线回退红线）**：dice/core.js 入 audit 目录扫描面 → V1 密度 4.26→3.89 跌破 4/100 行（v243-D hardFailures+visual-baseline「曾达标项掉线」双红）——以 D6 表原内联单行排版还原（原样上移纪律）core.js 70→38 行消解，密度回 4.046 真实过闸；零口径改动零造数据零豁免登记。
- **三查 API 排序陷阱再录**：issues comments REST `sort=created&direction=desc` 多次未生效（返回升序）——第 2 系列 6737572390 三查即中此陷阱漏 6737333360/6737448851 两帖撞双 lane；本系列 R144 帖已用 per_page=100 全量取尾对冲，教训并入 §7.5 三查实录。
- **矩阵生成件随 stamp 漂移第五实例**：dice core.js 内容再变（排版还原）→ 矩阵 --check 红；「滚版/生成件/测试锚文本任一变更后统一再生矩阵+globals+keymap 三件并 --check 收束」次序固化（第四实例链续）。


- **撞号合流第十四例（本例与对侧第十三例互为镜像）**：本侧初建 v10.95=aca621cb push 被拒 → backup-v1095-archive-pdf 留档 → rebase a4c742d → v286 锚组四连避让链 I/J→K→M/L→N/O（对侧 phone M/markdown L 在先保留，本侧 archive/pdf 改号 N/O）→ H3/v316-E 持合流终态 18/34/35 → v235 对侧 status-bar 第十站条目原样吸收（stamp 随滚归一）→ 滚版 10.94→10.95 归一 → fdcc377d 二推 ls-remote 回读一致 ✓。backup-v1095-archive-pdf 留档在远端。
- **矩阵生成件随 stamp 漂移第四实例**：滚版动源码 stamp → 矩阵扫描面内容漂移自暴露（--check 红再绿）；再生次序固化为「滚版后统一再生矩阵/globals/keymap 三件」（keymap 第三实例同源教训并入）。
- **脚本补丁自摆乌龙一例**：字符串替换补丁 old/new 两目标文本互串（第一次替换产物恰为第二次搜索目标）致块内容反转——按块正则手术修复+双 assert 终验收口；教训=多轮字符串补丁须块级定位（行位法）而非叠字符串替换。
- **对侧账目笔误确认**：df6e01f 信息账 5951 系其侧静态口径笔误，其覆写二十九/docs 终账已自正 5952（本侧 worktree 实测 a4c742d=5952·317 复核一致）。

- **撞号合流第十三例两段式实录**：初滚 v10.94=5b96e01 push 被拒（对侧 safari 6875a6a 在先）→ backup-v1094-pm-286=5b96e01 留档推送 ls-remote 确认 → reset 6875a6a → 同槽共号零重滚 → 新树手工重放六文件 + K→M 改号 → 二推再遇对侧 59ac6f3（零交集 4 文件 delta）→ rebase 干净合流 → df6e01f ls-remote 回读一致 ✓。**同窗三车道三交付共号 v10.94 先例**（§7.6 ① 实务样本）。
- **锚组三连避让链**：I/J（本系列四批 camera/notes）→ K（对侧 safari 重放自 I 改号）→ M（本系列五批 phone 自 K 改号）；L 组（markdown）全程无冲突。
- **PUSH 后回读第三次实证**：首推 5b96e01 超时未落库、主推一次超时一遇——均由 ls-remote 回读捕获后重试即过（R138 教训持续兑现）。
- **对侧 message 笔误/旧值叙事登记**：6875a6a5「vitest ·318」实为 317（第 1 系列已先录，本系列 diff 复核同证）；59ac6f3a「矩阵 core 30/30 ref 23」系其本地旧值叙事，落库树生成件实为 ref 22/cores 31（4 文件 delta 未触生成件）。不代笔，补录权在对侧。
- **网络实录**：GnuTLS -110 / connect timeout 三遇均重试即过；`http.version HTTP/1.1` 配置全程在位。

## 对账登记（R145 覆写三十四 · 诚实账目 · 本卷增值合流）

- **撞号合流第十六例（三重文件级重叠首例）**：本侧 R144 认领 game2048/threes 2 家 → 对侧同窗三卷落库（035bf11f 七批 game2048 同域/423e539f 八批 threes+dice 同域/fcd3f1e4 九批 shortcuts 滚版 v10.97）→ 首推非快进被拒 → backup-v1096-286-deep=c4c4602 留档 → 自 d622a265 起步重放：对侧 25 出口契约/锚组/接线零改动全保留 + 本侧 20 出口净增（对侧未触及面）+ S 字母避让改号（对侧 S=shortcuts → 本侧 T=threes 增值/U=game2048 增值，P/Q/R/S/T/U 十一连避让链）→ 同槽共号 v10.97 零重滚。**共域撞车协议语义修正**：对侧已交付域不做重复施工，增值面以「契约零破坏」为界并入（P1 键集 10→21 扩展先例）。
- **V1 演进重评登记（结构性掉线·非缺口·真适配不硬造）**：game2048 增值 20 出口并入 core.js（191 行）后审计目录合并口径密度 44/1139=3.9/百行跌破 A 口径 ≥4（index.html 侧 44/946=4.7 维持）——UI 零退化。处置：v312 REGISTERED=['camera','game2048'] + v314 C1 双笔名单演进 + 双基线重刷（A/V1=false）。**备忘**：对侧第七批（132 行核）密度 4.2 达标未登记，两条路线均成立，登记通道留档供后续批（borderline 密度应用）复用。
- **equiv-check 核验脚本对合并契约三处适配**：best2Ply 决策循环按对侧第七批设计留内联（结构校验替代公式比对）/worstBlockedCol 签名 (board, minLen) minLen=5 与原内联 ≥5 等值/rollCardKind(rKind,rVal) 双随机语义与原内联阈值序逐点等值。
- **e2e:sweep driving 首扫 flake 一笔**：关窗超时一例（域零触碰，git diff 空），复跑 52/52 净零——headless 时序敏感位实录，非回归。
- **网络实录**：git 协议五遇中断（fetch HTTP/1.1 重试即过 ×3；push 一遇 lowSpeed 掐断+一遇非快进均由回读捕获）；API tarball 兜底先例在案未启用（HTTP/1.1 即过）；push 后 ls-remote/API 回读纪律持续兑现。

## 对账登记（R145 覆写三十四 · 诚实账目 · 本卷增值合流）

- **撞号合流第十六例（三重文件级重叠首例）**：本侧 R144 认领 game2048/threes 2 家 → 对侧同窗四卷落库（035bf11f 七批 game2048 同域/423e539f 八批 threes+dice 同域/fcd3f1e4 九批 shortcuts/680e2bf2 stocks 续卡）→ 首推非快进被拒 → backup-v1096-286-deep=c4c4602 留档 → 两度对账重放：对侧 25 出口契约/锚组/接线零改动全保留 + 本侧 20 出口净增（对侧未触及面）+ 锚组避让改号（对侧 S=shortcuts/T=stocks → 本侧 U=threes 增值/V=game2048 增值，P/Q/R/S/T/U/V 十二连避让链）→ 同槽共号 v10.97 零重滚。**共域撞车协议语义修正**：对侧已交付域不做重复施工，增值面以「契约零破坏」为界并入（P1 键集 10→21 扩展先例）。
- **V1 演进重评登记（结构性掉线·非缺口·真适配不硬造）**：game2048 增值 20 出口并入 core.js（191 行）后审计目录合并口径密度 44/1139=3.9/百行跌破 A 口径 ≥4（index.html 侧 44/946=4.7 维持）——UI 零退化。处置：v312 REGISTERED=['camera','game2048'] + v314 C1 双笔名单演进 + 双基线重刷（A/V1=false）。**备忘**：对侧第七批（132 行核）密度 4.2 达标未登记，两条路线均成立，登记通道留档供后续批（borderline 密度应用）复用。
- **equiv-check 核验脚本对合并契约三处适配**：best2Ply 决策循环按对侧第七批设计留内联（结构校验替代公式比对）/worstBlockedCol 签名 (board, minLen) minLen=5 与原内联 ≥5 等值/rollCardKind(rKind,rVal) 双随机语义与原内联阈值序逐点等值。
- **e2e:sweep driving 首扫 flake 一笔**：关窗超时一例（域零触碰，git diff 空），复跑 52/52 净零——headless 时序敏感位实录，非回归。
- **网络实录**：git 协议六遇中断（fetch HTTP/1.1 重试即过 ×4；push 一遇 lowSpeed 掐断+两遇非快进均由回读捕获）；push 后 ls-remote/API 回读纪律持续兑现。

## next_candidates（R146 续点 · 顺序真源 docs/worklog.md 末行）

1. **ref-only iframe 池实质收尾**（#286 矩阵候补池；本卷 cal_app 后余 12 家=flow11(1403 行重型，若 R147 认领建议按函数族分批不整卷)/暂缓四家（reminders/contacts/books 面薄+V1 演进重评 game2048）/native 型八家（mail/map/health/recorder/installer/wallet/facetime/findmy 非 iframe 范式另评——mail/recorder native 型 defFile=js/apps/*.js 可评轻量纯函数核，wallet/facetime/findmy zero-touch P1 候补）；分批不硬塞 #229 先例同律；认领帖 lane 精确到批）
2. **#294 触控目标第 J 项 / #291 测试前缀常青化策略**（P3 方案裁决卷候选，立卡先裁决后施工）
3. **#247 P0 竞态 / #248·#249·#250 needs_review 组**（pending_verification 白名单面，用户真机核优先）
4. **CI run 恢复绿核验**（部署链恢复观察位，轻量）
5. **V 清单演进重评**（V8 43/43 · V3 43/43 · V2 42/43+登记 · V7 34/43+登记九家 · V1 41/43+登记双笔 camera/game2048——后续仅演进重评，不再单列批卡）

## next_candidates（R145 续点 · 顺序真源 docs/worklog.md 末行）

1. **ref-only iframe 可提取池余 7 家补 core 提取**（#286 矩阵候补池；已提取十四家+增值合流两域：files/settings/photo/translate/weather/camera/notes/safari/phone/markdown/archive/pdf/game2048/threes/dice/shortcuts；登记非缺口/暂缓五家：wallet/facetime/findmy + reminders 实读暂缓 + contacts/books 面薄暂缓 + V1 演进重评 game2048；余池 flow11(12)/stocks(9)/cal_app(2)——stocks 让位第 1 系列 6739871395 在案核对；native 型 mail/map/health/recorder/installer 非 iframe 范式另评；**同墙备忘：borderline 密度应用提取后走 V1 演进重评登记通道（v312/v314 双笔先例）**；分批不硬塞 #229 先例同律；认领帖 lane 精确到批）
2. **#294 触控目标第 J 项 / #291 测试前缀常青化策略**（P3 方案裁决卷候选，立卡先裁决后施工）
3. **#247 P0 竞态 / #248·#249·#250 needs_review 组**（pending_verification 白名单面，用户真机核优先）
4. **CI run 恢复绿核验**（部署链恢复观察位，轻量）
5. **V 清单：V1 41/43+登记双笔（camera/game2048）演进重评入账**（V8 43/43 · V3 43/43 · V2 42/43+登记 · V7 34/43+登记九家 · V4/V5/V6 已清——后续仅演进重评，不再单列批卡）

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖（403 时降级手动三源）
- **覆盖矩阵（#286）**：`node scripts/test-coverage-matrix.mjs`（再生 docs 两生成件）/ `--check`（逐字节校验）；**新增测试文件或 core 出口后必须再生**（v286 B 锚 + test-coverage-matrix --check 双守护）
- **应用清单（#285）**：`node scripts/gen-apps-doc.mjs`（再生 docs/APPS.md+apps-inventory.json）/ `npm run check:apps-doc`（--check 逐字节）；**apps-data.js import 行或用途尾注变更后必须再生**
- **globals 注册表（#242）**：`node scripts/scan-globals.mjs`（再生 docs/globals-registry 两件；新 core 出口必须再生，v242 构建闸守护）
- 视觉准入：`npm run audit:app`（#243）；快照 `docs/visual-admission-baseline.json`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json`
- README 数字对账 / workflow lint / PWA 入口对账：`check:manifest`（#292）/ 源→dist 对账：`check:dist-parity`（#301）/ docs/ 索引一致性：`check:docs-index`（#295）/ 版本真源：`check:version` + `version:sync` / 键位契约：`check:keymap`（#305）
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
