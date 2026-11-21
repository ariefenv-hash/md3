# M3 Expressive 弹簧参数权威考证：gm3 arsc 六族 ↔ androidx ExpressiveMotionTokens 1:1 全等

> **触发**：`docs/audits/candidate-pool-specification.md` §一/§五 登记的「待回源核验项」——
> Google DeskClock 反编译产物 README §二 的 `expressive_spring damping=1 / stiffness=1600 / spatial_damping=0.8`
> 按 #54 第⑥条须能给出 `docs/reference/` 出处，未核验前不据此施工。2026-11-21 本卷完成回源核验，**登记解除**。
>
> **取证方式**：`api.github.com/repos/androidx/androidx/contents`（raw media type，`ref=androidx-main`）实拉。
> 通道说明：`raw.githubusercontent.com` / 固件站已被墙（R161 复测表，见
> `docs/reference/frameworks-base/android17-shade/README.md` §一），GitHub contents API 为绕墙主通道。
> 文件最新触及 commit `160825094a81`（2026-08-05「Refactor Material3 tokens to inline value classes and getters」，
> 仅 `val`→`const val`，patch 实证 12 个 token 值逐字节不变）。
>
> **本目录内容**：`ExpressiveMotionTokens.kt`（v0_14_0 · GENERATED CODE · 实拉原文）、本 README。

## 一、结论先行

**DeskClock（gm3）打包的 12 条 `gm3_sys_motion_expressive_spring_*` 与 androidx material3 `ExpressiveMotionTokens` 十二个 token 全等**——gm3 是 M3 expressive motion token 的原样封装，两者同源。

| Token | androidx（androidx-main 实拉） | gm3 arsc（DeskClock 反编译） | 判定 |
| --- | --- | --- | --- |
| SpringDefaultSpatialDamping | 0.8f | 0.8 | ✅ |
| SpringDefaultSpatialStiffness | 380.0f | 380 | ✅ |
| SpringDefaultEffectsDamping | 1.0f | 1 | ✅ |
| SpringDefaultEffectsStiffness | 1600.0f | 1600 | ✅ |
| SpringFastSpatialDamping | 0.6f | 0.6 | ✅ |
| SpringFastSpatialStiffness | 800.0f | 800 | ✅ |
| SpringFastEffectsDamping | 1.0f | 1 | ✅ |
| SpringFastEffectsStiffness | 3800.0f | 3800 | ✅ |
| SpringSlowSpatialDamping | 0.8f | 0.8 | ✅ |
| SpringSlowSpatialStiffness | 200.0f | 200 | ✅ |
| SpringSlowEffectsDamping | 1.0f | 1 | ✅ |
| SpringSlowEffectsStiffness | 800.0f | 800 | ✅ |

- androidx 侧出处：`docs/reference/material3/motion/ExpressiveMotionTokens.kt`（本目录实拉件，L22-33）。
- gm3 侧出处：`docs/reference/deskclock/vector-and-responsive/arsc-map.tsv` L2304-2315
  （`0x7f0701b1`–`0x7f0701bc`，dimen 十二条）。
- 权威消费 API：`MotionScheme.expressive()`（`compose/material3` `MotionScheme.kt` L203-235：
  default/fast/slow × spatial/effects 六 spec 全部取自 `ExpressiveMotionTokens`）。

## 二、勘误：旧登记行混轴（#54 第⑥条「连带检查派生诊断」兑现）

DeskClock README §二旧行（按史实契约保留在原文，此处为准读法）：

```
expressive_spring（带手柄滑块体系） = damping=1, stiffness=1600, spatial_damping=0.8   ← 旧行，混轴
```

对照 arsc 全表，这行把**不同轴的三个值**并成了一组：

| 旧行片段 | 实属 token | 正确归属 |
| --- | --- | --- |
| `damping=1` | `SpringDefaultEffectsDamping` | **effects 轴**阻尼（spatial 默认阻尼是 0.8） |
| `stiffness=1600` | `SpringDefaultEffectsStiffness` | **effects 轴**刚度——**不是 spatial 刚度** |
| `spatial_damping=0.8` | `SpringDefaultSpatialDamping` | spatial 默认阻尼 ✓ |

**漏掉的第四值**：`SpringDefaultSpatialStiffness = 380`。故「default expressive spring」的完整权威读法是：

- **spatial（位移/尺寸类）：damping 0.8 / stiffness 380**
- **effects（透明度/颜色类）：damping 1.0 / stiffness 1600**

若按旧行把 1600 当 spatial 刚度使用，运动学后果是位移动画比真源快约 4.2 倍（1600/380）且无过冲（阻尼比 1.0 过阻尼 vs 真源 spatial 0.8 欠阻尼有微弹）——即「快而不弹」错装到「会弹的轴」上。#264/#224 施工面与 #75 双引擎若消费 expressive 参数，一律按本卷第一节全表。

## 三、施工口径（登记解除）

- `candidate-pool-specification.md` §一/§五 三处「待回源核验…不据此施工」登记自本卷起**解除**：参数已有 `docs/reference/` 出处，可据此施工。
- 消费纪律不变：spatial/effects 两轴不得互串；fast/slow/default 三档按场景选档（M3 expressive 语义：fast = 快速直接操纵、default = 常规过渡、slow = 强调性大位移）。
- md3 侧若刻意偏离（如为 Web 手感压缩刚度），按 #54 第②条标注「刻意偏离原值 + 理由」。

## 四、复现命令

```bash
TOKEN=<PAT>; U=https://api.github.com/repos/androidx/androidx/contents
curl -s -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github.raw" \
  "$U/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt?ref=androidx-main"
```

分支核实：`/repos/androidx/androidx` `default_branch=androidx-main`；文件横幅 `// VERSION: v0_14_0` +
`// GENERATED CODE - DO NOT MODIFY BY HAND`。

---
*2026-11-21 回源核验卷；关联 #54 第⑥条、#329 §五（用户实测驱动单条闭环）、candidate-pool-specification.md §一/§五。*
