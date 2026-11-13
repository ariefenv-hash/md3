# 调度退役后的制度适用边界（2026-11-13）

> **为什么需要这一页**：客户端定时任务与并行实例已于 2026-11-13 全部取消，工作改为「用户按需呼起 → 单会话闭环 → 停」（#18 §13）。但仓内 `docs/HANDOFF.md` 与 `docs/worklog.md` 里仍大量出现「认领帖 / 槽位 / R 续点 / 加餐卷 / 取号预告 / 让位」等语汇，机器侧 GitHub Actions 也仍在跑。新会话零上下文接手时，极易把**已失效的并行制度**当成开工前置，或把**仍生效的纪律**误当成旧时代遗产裁掉。
>
> 本文按「实证在库 + 当前形态」把制度分四档，只做状态澄清，**不改任何既有规则、不删任何脚本**。

## 一、仍生效（与定时调度无关，必须继续遵守）

| 制度 | 仓内真源 | 说明 |
|---|---|---|
| 完成即关 / 禁攒批 | #18 §7.7 | 一议题一闭环，逐条交付帖 + 逐条 close，不合并关闭 |
| 动手前阅读清单 | #265 | 簇块全量通读 + 接口面/交叉引用追读，先发阅读清单帖 |
| 加餐规则 | #192 §7.5 | **注意：并未失效**。客户端定时取消后，「单次唤起」实例仍在同窗多卷连做，正文里的「批 8→9→10 / 加餐卷二」即按此规则填槽。判定基准从「距下槽剩余时间」变为「本次唤起内是否还有余力与独立车道」 |
| 驾驶舱瘦身 | `docs/ops-discipline.md` / #80 | #17 恒 1 条机器评论，简报与巡查共用 `<!-- cockpit -->` 原地 PATCH，指纹 diff 静默轮 |
| 测试命名常青 | `docs/test-naming-evergreen.md` / #291 | 测行为 → 去版本前缀常青；测交付时点 → `@snapshot` 显式标记 |
| 移植纪律 | `docs/aosp-porting-discipline.md` / #147 | 筛选判据、源锚必留、复用 `interpolators.js` |
| 移植边界 | #76 | 哪些受真机架构限制、哪些是 md3 应保留的超越，勿互伤 |
| 注释等于代码 | `scripts/check-comment-claims.mjs` / #149 | 数值声明失配门禁，新增移植与新文档须过闸 |
| 常设锚点 / 巡查 | #18 #17 #21 #54 #77 #76 | 依据类、总纲类、巡查类议题豁免「完成即关」，保持 open |

## 二、前提消失（并行专属，终止适用，脚本留库不删）

以下都是为「多个实例同槽并行」设计的。并行实例退役后，**不再是开工前置**；脚本与测试作为历史资产保留，不删除、不改动，避免破坏既有生成件与门禁。

| 制度 | 原真源 | 终止理由 |
|---|---|---|
| 认领租约与 TTL | #233 / `scripts/claim-registry.mjs` | 单会话单实例，无抢占对象 |
| `CLAIM\|` 结构化字段 / 抢占三查 / 让位协议 | 协议 v1 规则 2、5 | 无同槽对侧 |
| lane 正面声明与交集检测 | #234 ③ | 单车道 |
| 同槽共用版本号 / 取号预告 / rebase 重取号 | #234 ① / 协议 v1 规则 3 | 无版本号抢占；`api-commit.mjs` 运行时读远端 HEAD，`force:false` 已天然防撞 |
| 窗报义务 / 槽位报账 | 协议 v1 | 无槽位 |
| worktree 物理隔离 / 幂等发帖 / 槽内基线复用 | #234 ④⑤⑥ | 交付帖自述「留 open 依据」，现因前提消失而终止，不续做 |

> **口径提醒**：`docs/HANDOFF.md` 仍按旧格式追加 `generated / head / baseline / R 续点`，这是**交接快照的内容格式**，不等于并行调度仍在运行。读它取「当前 head、基线、续点候选」即可，不必去凑槽位或发认领帖。

## 三、机器侧仍在跑（不受客户端取消影响）

| 工作流 | 触发 | 当前状态 |
|---|---|---|
| `daily-issue-brief` | 每日北京 01:00 | success |
| `issue-patrol` | 每 6 小时 | success |
| `App Sweep Daily (#300)` | UTC 21:00 / 北京 05:00 | 11-12、11-13 连红两次已定位为关窗判定时序 flaky，修复 `ef24d198` 入 main，本地实跑 52/52 PASS，**定时档复核待次日 05:00** |
| `deploy.yml` | push 触发 | `cancel-in-progress: false` + `gate-alert`（#235 修复已落地） |

客户端定时任务取消**不等于**仓库 Actions 停用；两者是不同层。简报与巡查继续按 #80 瘦身纪律原地更新驾驶舱。

## 四、由用户裁决（本侧不擅自处置）

- **`DELIVERED_NOT_CLOSED` / `NEEDS_REVIEW`**（#233 §九② 定义）：有交付帖且产物在库、但仍 open 的议题，关单权归用户。核验后按用户既定裁决「全部核验后补关」逐条办理。
- **四条 P0 真机核**：#225 / #226 / #228 / #231 —— 需真机验证，不凭源码推演关闭。
- **#247–#250 用户真机核清单**：`docs/HANDOFF.md` 续点里明确列为待用户真机核，保持 open。
- **#284 批 11 在途认领**：11-13 12:38 的 COLOR_MOTION 簇认领未交付，属另一条「单次唤起」线，本侧不接管、不释放、不抢占。

## 五、本侧开工 SOP（单会话闭环）

1. 查远端 HEAD + 最近评论，确认对方车道（避免同议题撞车）
2. 取证（源码实拉 / 仓内实读），写清源锚
3. 实现 → **门禁 `TZ=UTC`**（`check:comments` / `check:docs-index` / `check:version` / `check:workflows` / 生成件 `--check` / vitest）
4. 推送：`git push` 在本侧沙箱稳定 403，走 `api-commit.mjs`（blob→tree→commit→PATCH ref→REST 回读）
5. 逐条交付帖 → 逐条 close → **停**。不设定时、不并行、不攒批、不抢号

### 5.1 生成件 `--check` 全量清单（第 3 步的展开，不许只跑子集）

> **2026-11-14 补记（一次真实的 CI 红）**：本侧上一批新增 `scripts/e2e-launching-splash.mjs` 后，第 3 步只跑了**手写的 6 个生成件** `--check`，漏了 `gen-e2e-inventory.mjs`。`docs/audits/e2e-inventory.json` 未随树再生 → `tests/e2e-playwright-skeleton.test.js` 断言清单守恒失败 → `deploy.yml` 的 `Run vitest` **failure**、`build-and-deploy` **skipped**、`gate-alert` 自动帖报 #18。本地抽样门禁全绿但 CI 红，正是「清单靠手抄」的必然后果。
>
> 与仓内既有教训同族：`docs/worklog.md` 的「新增测试文件后矩阵生成件必须随树再生」（批 5 教训②姊妹例）。**新增 `scripts/e2e-*.mjs` → 必重跑 `gen-e2e-inventory.mjs` 并随卷提交生成件**；新增 tests → 必重跑 `test-coverage-matrix.mjs`。

**A 档 · 支持 `--check` 的生成件 / 审计闸（15 个，逐个 `TZ=UTC node <脚本> --check`）：**

```
scripts/audit-app-quality.mjs          scripts/audit-docs-index.mjs
scripts/audit-manifest-icons.mjs       scripts/audit-version-consumers.mjs
scripts/gen-apps-doc.mjs               scripts/gen-duplicate-inventory.mjs
scripts/gen-e2e-inventory.mjs          scripts/gen-keymap-doc.mjs
scripts/gen-monolith-inventory.mjs     scripts/gen-pm-inventory.mjs
scripts/gen-storage-keys-registry.mjs  scripts/gen-test-prefix-inventory.mjs
scripts/gen-touch-snapshot.mjs         scripts/gen-vendor-audit.mjs
scripts/test-coverage-matrix.mjs
```

可直接用枚举代替手抄（B 档两个会在结果里显式 FAIL，见下）：

```bash
for c in $(ls scripts/gen-*.mjs scripts/audit-*.mjs scripts/*-matrix.mjs | sort -u); do
  TZ=UTC timeout 40 node "$c" --check >/dev/null 2>&1 \
    && echo "OK   $c" || echo "CHECK $c"   # CHECK 需人工判定是否 B 档
done
```

**B 档 · 不适用 `--check`（2 个，见到 FAIL 不要误判为回归）：**

| 脚本 | 原因 |
|---|---|
| `scripts/e2e-sweep-b1-device-matrix.mjs` | 浏览器 e2e 脚本（#77 B 类七档尺寸冒烟），带 `--check` 仍会 `chromium.launch`，缺 Playwright 二进制时报 `browserType.launch` 错。它不是生成件 |
| `scripts/gen-tone-bridge.mjs` | 一次性构建期生成器（v8.51 #56 tone 桥），需要外部输入 `/tmp/tone-keys.json`，不写 `docs/` 生成件、不支持 `--check`；正常调用无参数且须在依赖装好后跑 |

**判读**：A 档任一 FAIL 必须先再生对应生成件（多数生成器无参数即写盘）并随卷提交，再复跑至全 OK；**禁止**靠「抽样几个够了」跳过。CI `Run vitest` 会替本侧兜底，但部署链路已经停摆一次，别把发现权交给 CI。

## 六、验收

- [x] 四档分类逐条给出仓内真源或实证
- [x] 明确「#192 加餐规则仍生效」，纠正「定时取消 = 全部制度作废」的误读
- [x] 明确「HANDOFF 旧格式 ≠ 并行仍在跑」
- [x] 明确机器侧 Actions 与客户端定时是两层
- [x] 零规则改动、零脚本删除、零运行时代码改动
- [x] §5.1 生成件 `--check` 全量清单（A 档 15 / B 档 2）+ 一次真实 CI 红的根因与判读纪律

关联：#18 §13 / #80 / #192 / #233 / #234 / #235 / #265 / #291 / #147 / #76 / #77 / #300
