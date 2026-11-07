<!-- docs/HANDOFF.md — #234② 结构化交接快照（新实例读 #18 正文 + 本文件即可开窗，不必翻全部评论） -->
<!-- 维护纪律：每轮交付后立即覆写快照（#234 §七，不是槽末统一写）；数据由 scripts/claim-registry.mjs 扫描组装，禁手抄 claims。 -->

# HANDOFF 结构化快照

- **generated**: 2026-11-08T07:00+08:00（R125 窗 · Job 2932311 · 首版种子）
- **head**: `d3bdc523`（origin/main，REST 回读一致；v10.56 = 17b6c623）
- **baseline**: vitest **5335/5335·275** 全绿零 error（合流终树实测：Job 2931605 v253 29 锚 + 本实例 v232 3 锚）
- **slot_version**: v10.56（§7.6① 同槽共号：Job 2931605 #253 状态机核 + Job 2932311 #232 CI 修复 同号零冲突实证）
- **open_gate_alert**: run 491/502 双红根因已修（#232 交付 17b6c623 pending-verification），验收③「main 连续 5 绿」待后续 run 重新累计

## claims（只列 open；status ∈ active/suspicious/alive_confirmed，#234 §七③）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| #229 | Job-2931605 | R125-202611080600 | 2026-11-08T06:50+08:00（帖 6713818593 实发 06:23） | active | P1 首批 4 家 CSS 令牌（gravity/typing/stt/radio + adoption.md + quality-baseline.json，零 vite.config.js 零 #253 交集） |
| #253 | Job 2932476 | R125/R126 | 2026-11-08 ~06:20（帖在 #253） | active | multiwindow-sidebubble（三段手势壳层接线+侧边栏 UI） |

- **stale**: 无（#228 R118 实例 B 认领已由交付帖释放，见其议题）
- **suspicious**: 无
- **blocked**: 无

## closed_this_slot（R125 · 完成即关 §7.7）

| issue | 交付 | 状态 |
|---|---|---|
| #232 | v10.56 = 17b6c623（run 491/502 第三位点根治 + v235 3 锚） | closed=NO(pending-verification)——验收③ 连续 5 绿待 CI 累计，车道已释放 |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- **#232**（待核项：修复后 CI run 连续 5 次 test+deploy 双 success；核法：Actions 逐 run 核；由谁核：下一窗执行侧顺带核）

## next_candidates（R126 续点 · 顺序真源 docs/worklog.md 末行）

1. #229 P1 清单销号——**Job 2931605 在途租约（gravity/typing/stt/radio 四家）勿撞**，余量 batch（flow11/midi-player/ocr/ping/python/archive 等）其首批交付后可认领
2. #253 壳层接线——**Job 2932476 在途租约勿撞**
3. #242 整改路线图（implicit-coupling 220 子集惰性化）
4. #246 建议③ 截图 diff 基建
5. #245 动效密度（重型评估）/ #215 重型（五延让位注记）
6. Enjoy-music #2/#3（R 充足窗评估）
7. A 车道 #251 等用户确认勿动工

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues 229,253` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚，验收①⑤⑥⑦⑧⑨ 逐条在案）
