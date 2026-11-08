# HANDOFF 结构化快照

- **generated**: 2026-11-09T07:25+08:00（R138 窗 Job 2933040 第 2 系列覆写十七：#241 长尾余量1 弹层三件套增强批 v10.87=6e5a08e 交付关单——calendar/messages/settings 壳层三应用接线 + weather/typing/music/archive/recorder/photos 无弹层面诚实清账（长尾1 穷尽全清单闭环）+ tests/v241 37 锚 + 覆盖矩阵随树再生；三笔 stale 租约对账回收；vitest 5815·310 全绿账目闭合）
- **head**: 6e5a08e（#241 v10.87；前链 5d179a2/63ca1d27=#286 v10.86 · ac6f148b/#312 V1 · 607ccc10/#215 files）
- **baseline**: vitest **5815/5815·310** 全绿零 error（=基线 5812·310 + v241 3 例精确吻合；6e5a08e 终树实跑）+ e2e:dist 45/45 + e2e:sweep 52/52 + shot:diff 20/20 + docs-index PASS（顶层 26/递归 428）+ build v10.87/mw8e8ig0/precache 181
- **slot_version**: v10.87（#241 滚版 291 文件 10.86→10.87；对侧 #285 job2932311-R138 认领 lane 含滚版——§7.6① 同槽共号，先推者定案 6e5a08e，对侧 rebase 滚版行同值自动吸收）

## claims（只列 open；status ∈ active/suspicious/alive_confirmed）

| issue | instance | slot | at | status | lane |
|---|---|---|---|---|---|
| #285 | job2932311-R138 | R138 | ~06:22+08 | active（对侧在途） | scripts/generate-apps-md.mjs+docs/APPS.md+docs/index.md+package.json+tests/v285+滚版——与本方零文件交集已声明 |

- **stale**: 无（#241/#223/#18 三笔 stale 已于 R138 认领帖对账回收；#241 随交付关单）
- **suspicious**: 无
- **blocked**: 无
- **已释放**：#241（长尾1 穷尽交付关单 completed，交付帖 6728086019）——本窗车道全释放

## closed_this_slot（R138 · 完成即关 §7.7）

| issue | 交付 | 状态 |
|---|---|---|
| #241 | v10.87 = 6e5a08e（calendar 四点+messages 双端+settings.js adrSheet 壳层接线+壳层引入行；weather/typing/music/archive/recorder/photos 逐家无弹层面披露；tests/v241 34→37 锚；主断言+建议1/2/3/4+长尾1 全销号，长尾2/3 另案/留点零遗留） | closed（completed，交付帖 6728086019） |

## pending_verification（不进 claims 活跃池，§7.7 白名单）

- 无新增（#225/#226/#231/#232/#247/#249/#250/#248 等历史留核面维持现状，由用户真机核）

## next_candidates（R139 续点 · 顺序真源 docs/worklog.md 末行）

1. **V8 深窄屏 5 家**（camera/clock-app/shortcuts/stocks/weather——camera 与 #312 功能色登记文件交集，认领前三查）
2. **V2 字体阶梯 5 家**（chess/clock-app/game2048/terminal/threes——#241 关单后 chess 车道自然解锁）
3. **ref-only 27 家补 core 提取**（#286 矩阵候补池 docs/test-coverage-matrix.json；首批 music/files/settings/messages 高频优先，分批 #229 先例同律）
4. **#285 对账**（对侧 job2932311-R138 ACTIVE 在途——R139 先 REST 对账其交付态与 lane 释放态再取候选，勿撞 generate-apps-md/APPS.md/package.json 车道）
5. **#247 P0 竞态 / #248·#249·#250 needs_review 组**（pending_verification 白名单面，用户真机核优先）

**纪律新增（R138 实录）**：①生成件随树再生纪律（R137 确立）本窗首秀自暴露有效——功能批新增测试锚即触发 --check 红，再生后 PASS，v286 B 锚守护零人工记忆负担；②壳层（ios-desktop/index.html + js/apps/）是 R124 弹层八家候选口径的盲区——settings.js adrSheet 实测零 Esc 属漏网面，后续壳层动态弹层（adrSheet 类 createElement 动态 DOM）审计建议并入 #77 Standing Sweep；③stale 租约对账回收三笔同窗完成（#241/#223/#18），claim-registry --all-open 输出即判定依据，认领帖披露在案。

## 工具

- 租约扫描：`node scripts/claim-registry.mjs --all-open`（或 `npm run claim`）；`--issues` 定向；`--json` 供本文件组装；`--template` 生成结构化认领帖（403 时降级手动三源）
- **覆盖矩阵（#286）**：`node scripts/test-coverage-matrix.mjs`（再生 docs 两生成件）/ `--check`（逐字节校验）；**新增测试文件或 core 出口后必须再生**（v286 B 锚 + test-coverage-matrix --check 双守护；R138 实录：功能批新增锚即触发自暴露）
- 视觉准入：`npm run audit:app`（#243，H 项 detail 已含 core 消费比量化）；快照 `docs/visual-admission-baseline.json`
- V 清单水位：`node scripts/audit-app-quality.mjs --write-visual-baseline`；快照 `scripts/visual-baseline.json`
- motion 水位：`node scripts/check-motion-tokens.mjs`（npm run check:motion 自带 --check）
- README 数字对账 / workflow lint / PWA 入口对账：`check:manifest`（#292）/ 源→dist 对账：`check:dist-parity`（#301）/ docs/ 索引一致性：`check:docs-index`（#295）/ 版本真源：`check:version` + `version:sync`
- #233 协议语义守护：`tests/v233-claim-registry.test.js`（24 锚）
