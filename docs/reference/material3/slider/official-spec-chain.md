# M3 Slider 术语：多层权威链交叉核验（补充考证）

> **定位**：`374911b1` 已把「怠速柄」正名为「带手柄」并实拉 `androidx` 的 `Slider.kt` / `SliderTokens.kt` 归档（见本目录 `README.md`）。**本文件不改那份 README**（史实与他人产物不原地改写），只补它未覆盖的**四层权威源**，把结论从「单一库源码」升级为「设计规范 → 设计令牌 → 平台实现 → 官方中文」全链可引用。
>
> **触发**：2026-11-14 用户「主要是直接去固件站找权威资料」。
> **取证站点**：`m3.material.io`（Material 3 官方规范）、`android.googlesource.com`（AOSP / AndroidX 固件源码站）、`developer.android.com`（含中文站）、`material-components/material-web` 官方 token 源码。
> **纪律**：按 #54 第四条归档 `docs/reference/` 供后续复用；按第 ⑥ 条「术语必须回源核验」。

## 一、五层权威链（这是本次新增的核心）

| 层 | 官方术语 | 权威出处 | 原文/字段 |
| --- | --- | --- | --- |
| **L1 设计规范** | **Handle** | `m3.material.io/components/sliders` | Anatomy 明列 `Value indicator / Stop indicators / Active track / **Handle** / Inactive track / Inset icon` |
| **L2 设计令牌（Android）** | `Handle*` | `androidx/compose/material3/tokens/SliderTokens.kt`（本目录已归档） | `HandleWidth 4.dp` / `HandleHeight 44.dp` / `HandleShape` / `FocusHandleWidth 2.dp` / `PressedHandleWidth 2.dp` |
| **L2 设计令牌（Web）** | `--md-slider-handle-*` | `material-web/tokens/_md-comp-slider.scss` | `--md-slider-handle-color` / `--md-slider-handle-height` / `--md-slider-handle-width`；组件内 `.handleContainer` |
| **L3 平台 View 层** | **thumb** | `android.googlesource.com/platform/frameworks/base/core/java/android/widget/AbsSeekBar.java` | 类注释 *"AbsSeekBar extends the capabilities of ProgressBar by adding a **draggable thumb**"*；XML 属性 `android:thumb` / `android:thumbTint` / `android:thumbOffset` |
| **L3 Compose 公开 API** | **Thumb**（历史兼容名） | `androidx/compose/material3/Slider.kt` | `fun Thumb(...)`、`SliderDefaults.colors(thumbColor=...)`、`@Deprecated(... Use the overload that takes isVertical)` |
| **L4 官方中文** | 滑块 / 拇指（**不统一**） | `developer.android.com` 中文「滑块」页 | 「**滑块**：滑块是滑动条上可拖动的控制元素」／「steps：滑块上**拇指**会吸附到的刻度数」 |

**这张表解释了一个容易吵起来的问题**：为什么有人说叫 `thumb` 也对？—— **层不同**。AOSP 平台 View 体系与 Compose 公开 API 沿用 `thumb`（历史名），而**设计规范与所有设计令牌层一律 `Handle`**。用户口语「带手柄」正好落在 L1/L2，是准确的；`374911b1` 选用「带手柄（M3 Handle）」作为项目中文术语，与权威层一致。

## 二、独立印证：交互态是「变细」，不是「展开成胶囊」

`README.md` 已从 `Slider.kt:2762-2783` 得出 `4dp → 2dp 减半变细`。**M3 官方规范页独立给出同一结论**（两条原文）：

> *"Shape: New shape for slider tracks and **handles**. Slider elements change shape when selected. Motion: **Slider handle adjusts width upon selection**. Slider tracks adjust in shape when sliding to the edge."*（M3 visual refresh）

> *"M3 visual refresh: Sliders have a stop indicator, larger label text, and a **vertical handle that narrows when pressed**."*

以及 M2/M3 差异：

> *"**M2**: Sliders have a **circular handle** and a small label when pressed. **M3**: Sliders have new color mappings and support dynamic color."*

三条推论（与 `374911b1` 结论一致，且补上设计侧依据）：

1. **方向相反**属实：官方「按压变窄」，md3 现实现 `6px → 24px` 变宽成胶囊 —— 不是数值偏差，是方向相反。
2. **radio 的 15×15 圆点 = M2 形态**，不是 M3。#227 当初把它列为「6 种规格之一」是对的，但根因应表述为「M2 遗留未升级到 M3 Handle」。
3. **M3 Expressive（2025-05）更新**是 orientation（水平/垂直）、XS/S/M/L/XL 五档尺寸、inset icon、stops 配置；命名上 `continuous → standard`、`discrete → stops`。**没有任何 `idle` 配置项**。

## 三、「怠速柄」在上述所有站点零命中

| 站点 | 检索结果 |
| --- | --- |
| `m3.material.io` | 无 `idle-handle`／无「怠速」概念；只有 `Handle` |
| `androidx SliderTokens.kt`（本目录实拉） | 字段全为 `Handle*`；`Slider.kt` 全文无 `idle` |
| `android.googlesource.com AbsSeekBar.java` | 只有 `mThumb` / `thumb` / `tickMark` |
| `developer.android.com` 中文 | 「滑块」「拇指」，无「怠速柄」 |
| `material-web` | `--md-slider-handle-*`，无 `idle` |

**`idle` 在 AOSP 里的真实语义**（`source.android.com` Garage Mode）：

> *"To provide periods of **idle time** in vehicles, Garage Mode keeps the system awake so that jobs in JobScheduler constrained with idleness can be executed."* / `JobInfo.Builder.setRequiresDeviceIdle(true)`

即 `idle` = **设备闲置 / 空闲窗口**（60 分钟无交互且息屏），属于电源与任务调度域，**从不用于描述 slider 的任何部件**。

**还原**：用户语音「**带手柄**」（dài shǒu bǐng）→ ASR 误识别为「**怠速柄**」（dài sù bǐng）→ 项目按 `idle` 直译把它固化成 `idle-slider.*` 物理名，并派生出「细竖条怠速／hover 胶囊展开」「交互中柄被 idle 判定收走」「A17 Expressive slider idle-handle」等**源码里不存在的伪锚与虚构诊断**。这与 `374911b1` 的判定完全一致。

## 四、与 `374911b1` 的分工（不重复劳动）

| 已完成（对方） | 本文件补充 |
| --- | --- |
| 实拉 `androidx` 的 `Slider.kt`(3971 行) + `SliderTokens.kt`(166 行) | 补 M3 官方规范页原文、AOSP 固件站 `AbsSeekBar.java`、官方中文译法、Material Web token、`idle` 在 AOSP 的真实语义 |
| 41 个活跃文件正名「怠速柄」→「带手柄」 | 补**术语分层表**（解释 thumb / Handle 为何并存） |
| 撤销 4 处 `idle-handle` 伪锚 + 3 硬断言同步 + 2 组件头注权威声明 | 补**设计侧独立印证**「按压变细」与「M2 圆点」 |
| #227 标题与勘误帖、#325 读法 B 作废、#54 第 ⑥ 条纪律 | 不改上述任何产物，只在 #227 评论区引用本文件 |
| 保留物理名 `idle-slider.*`（59 引用）；worklog / R160 报告 / 已关议题 / `dist/` 按史实保留 | **维持该判断**：物理名重命名收益远低于 59 引用 + 生成器台账 + 历史锚的风险 |

## 五、仍待施工（归 #227，不另开卡）

`README.md` §三 已给权威值对照（`4dp / 44dp / 16dp / 4→2dp` vs md3 `6px / 22px / 6px / 6→24px`，仅禁用透明度 `0.38` 吻合）。本文件**不重复列施工单**，只确认三点：

- 几何对齐不是替换数字，涉及 `input[type=range]` 容器高度、伪元素 `margin-top`、15+ 应用与全部相关断言的重锚，需独立施工窗口
- #227 已完成「全库规格统一」，只是统一到了非源码规格上 —— 这是**规格选型问题**，不是「没统一」
- 按 #54 第 ① 条，源码能取到值一律原值落地；若网页原生控件确实无法承载 44dp，须按第 ② 条标注为**允许偏离**并写明理由，不得默默沿用现数值

## 六、诚实边界

- `m3.material.io/components/sliders/specs` 与 `/overview` 的**直接页面抓取被安全审核拒绝**，L1 的引文来自该站在搜索索引中返回的页面正文（含 Anatomy 表、M3/M2 差异、2023 refresh 与 2025-05 Expressive 更新段落）；**数值一律以本目录实拉的 `SliderTokens.kt` 为准**，不从规范页推测数值。
- L3 `AbsSeekBar.java` 引自 `android.googlesource.com` 源码站正文；官方中文页引自 `developer.android.com` 中文版。
- 本文件零运行时代码改动、零 CSS 数值改动、零议题正文改写、零滚版。

关联：#227、#325、#54、#76、#259、`README.md`（本目录）、`docs/issue-259-breakdown.md`
