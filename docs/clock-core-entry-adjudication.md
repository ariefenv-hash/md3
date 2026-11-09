# clock-core.js / clock-core.mjs 同名并存入口裁决（#270 · R150 窗加餐）

- **executed**: 2026-11-10T06:5x+08:00（认领帖 6753060186 先于动工 · 纯 docs 零滚版 v11.03 维持 · 基线 vitest 6067/6067·319 全绿 ×2 在账）
- **裁决一句话**：两文件**非新旧版本并存**——`clock-core.js`（635 行）= 唯一**逻辑真源**（经典 IIFE，唯一出口 `window.__clockCore`），`clock-core.mjs`（23 行）= **ESM 双形态门面**（零逻辑复制，v10.35 #226 要求③交付）；裁定**双件共存零迁移零删除**。

## §1 证据面（逐项实查 · 本树 3b00cf79 时点）

| 项 | clock-core.js | clock-core.mjs |
|---|---|---|
| 行数 | 635 | 23 |
| 诞生 | v9.38 `da3eee06`（#160 第一里程碑·AOSP DeskClock 状态机下沉） | v10.35 `ffa50362`（#226 要求③·ESM 双形态门面新增） |
| 形态 | 经典 IIFE，`'use strict'`，顶层零副作用 | 纯 ESM，两 export：`getClockCore` / `ensureClockCore` |
| 出口 | `window.__clockCore`（唯一，L603-604） | import 面（供 ESM 消费者）+ `import.meta.url` 模块相对动态补载经典脚本 |
| 逻辑复制 | 全量（权威锚 LineageOS DeskClock 八件快照） | **零**（头注 L2 自述「逻辑单源=经典 IIFE…本文件只做形态门面，零逻辑复制」） |
| 运行时挂载 | `clock-app/index.html` L17 经典 `<script src="../../js/clock-core.js">` | **零运行时引用**（dist 不搬运，v10.35 交付账） |
| 消费形态 | 六模块惰性访问器 `window.__clockCore`（alarm `instCore()`/stopwatch `swCore`/bedtime `btCore` 同款纪律，v10.35 要求①）+ vitest new Function 沙箱真跑 | app.mjs **不 import**（L284 自包含实现注记实证）；tests 双锚钉扎（clock-core.test.js F7 门面契约 / clock-resilience.test.js T 契约） |

**引用面全景**（grep 实证，dist/node_modules 除外）：`.js` 侧 = 运行时（index.html 挂载 + 五模块惰性访问器）+ 测试 6 件 + e2e 2 件 + docs 4 件；`.mjs` 侧 = 测试 2 件（F7/T 契约锚）+ e2e 头注 1 + docs 生成件 3——**零运行时 import**。

## §2 定性改判

卡面「双版本并存无说明谁是真源」定性**不成立**：本仓同名 js/mjs 并存对**全仓仅此一对**（python 全扫 ios-desktop/** 实证：仅 clock-core 一对；其余 .mjs 均无同名 .js 兄弟），且 `.mjs` 头注第二行起即自述「逻辑单源 = 经典 IIFE clock-core.js…零逻辑复制」+ 两测试锚（F7 断言 `export const getClockCore/ensureClockCore` 在位 + 门面零 `let x=window.__clockCore.` 顶层直读）契约化钉扎——**「逻辑单源+形态门面」共生对**，非竞争实现。

## §3 裁决三条

1. **唯一逻辑真源 = clock-core.js**，维持不动：v160 F5 纪律（本体零 export）、唯一出口 window.__clockCore、经典消费面 byte 不变——三约束继续有效；
2. **双件共存，零迁移零删除**：卡面建议②的两选项（.js 保留+.mjs 归档删除 / 迁移 .mjs 单出口）均**不采纳**——删除 .mjs 即破坏 F7/resilience 双契约锚与 #226 要求③双形态出口语义；迁移单出口则违反 v160 F5「iframe 经典 <script> 下 ESM export 整文件 SyntaxError」的运行环境硬约束（经典挂载面必须保留 IIFE 形态）；
3. **门面纪律**（并存对的合法性判据，一条线）：同名 `.mjs` 只有在**零逻辑复制**（行数 ≪ .js + 头注明文「门面/单源」+ 无业务逻辑 token + 零顶层 `window.__*` 直读）时才可并存——违反即升级为 #270 原问题「双版本并存」，走退役流程。

## §4 卡面三建议对账

| 卡面建议 | 本卷处置 |
|---|---|
| ① 查明 .mjs 引用方与历史来历 | ✅ 兑现：引用面全景表（§1）+ git log 考古（v9.38/v10.35 双首提交意图逐字） |
| ② 裁决唯一真源 | ✅ 兑现且**第三形态裁定**：逻辑真源 .js + 形态门面 .mjs 共存（§3），两选项均不采纳有据 |
| ③ tests 同名并存守卫（或白名单豁免表） | **留施工批**：新增测试文件涉及矩阵/globals/docs-index 三闸联动 + 滚版，不与本卷 docs 车道混装（#291 渐进式先例同律）；守卫形态建议见 §5 |

## §5 施工批建议（后续窗认领，本卷零施工）

1. **js 侧头注互指注记**：clock-core.js 头注补一行「ESM 双形态门面见 clock-core.mjs（#270 裁决）」——可发现性缺口实为 js 侧单向（.mjs→.js 已互指，.js→.mjs 缺），纯注释零运行时风险；
2. **「并存即须门面契约」守卫测试**：扫描 ios-desktop/** 同 stem js+mjs 对 → 断言每对满足 §3 门面纪律四判据（或落入白名单豁免表——现表天然单条目 clock-core）→ 违反即红；同步 docs/index.md 与矩阵随再生；
3. **#271 边界**：js/ 与 js/aosp/ 同名三对系**跨目录**并存（非本卷同目录同名形态），另卡裁决零越界；守卫测试若扩至跨目录形态须先有 #271 裁决再施工。

## §6 诚实边界

- 引用面/行号/挂载行为为本树 3b00cf79 时点快照（grep+实读实证非推理）；dist 不搬运结论引 v10.35 交付账+app.mjs L284 注记，未在本窗重跑 verify-dist 复验（施工批若动守卫应顺手复核）；
- 本卷零代码零 tests 零滚版：裁决不动施工，clock-core 两件本体与全部消费方零触碰；
- 惰性访问器消费形态（instCore/swCore/btCore）系 v10.35 要求①既有纪律的实录，其设计得失不在本卷裁决范围（#226 主卡已关账）。

关联：#270（主卡）· #226（崩塌实例+门面诞生卷）· #160（逻辑真源诞生卷）· #271（跨目录同名对另卡）· #147（模块命名纪律）· #18 §5/§9
