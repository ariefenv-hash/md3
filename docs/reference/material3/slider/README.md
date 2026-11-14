# M3 Slider 权威考证：「带手柄」不是「怠速柄」

> **触发**：2026-11-14 用户澄清 —— 当初语音输入「**带手柄的样式**」被 ASR 识别成「**怠速柄的样式**」，项目随后几十轮把错词当真源，甚至派生出「A17 Expressive slider `idle-handle`」这个**源码里根本不存在的伪锚**。
>
> **取证方式**：`raw.githubusercontent.com / androidx/androidx / androidx-main` 实拉原文，与 `api.github.com/repos/androidx/androidx/contents/...` 双通道核对（200 / 170630 B 与 5321 B）。按 #54 第四条归档到 `docs/reference/`，后续议题直接复用，不重复爬。
>
> **本目录内容**：`Slider.kt`（3971 行 · 167K）、`SliderTokens.kt`（v2_3_5 · GENERATED CODE）、本 README。

## 一、结论先行

**AOSP / Material 3 里这个组件叫 `Handle`（手柄），全称 `Slider` 带 `Handle`。全文件没有 `idle` 这个词。**

`SliderTokens.kt` 的字段名就是最直接的证据 —— 全部是 `Handle*`：

| Token | 值 |
| --- | --- |
| `HandleWidth` | **4.0.dp** |
| `HandleHeight` | **44.0.dp** |
| `HandleShape` | `ShapeKeyTokens.CornerFull`（全圆角） |
| `HandleColor` | `Primary` |
| `ActiveHandleWidth` / `ActiveHandleHeight` | 4.0.dp / 44.0.dp |
| `HoverHandleWidth` | **4.0.dp**（hover 不变宽） |
| `FocusHandleWidth` | **2.0.dp** |
| `PressedHandleWidth` | **2.0.dp** |
| `DisabledHandleWidth` | 4.0.dp |
| `DisabledHandleOpacity` | **0.38** |
| `ActiveTrackHeight` / `InactiveTrackHeight` | **16.0.dp / 16.0.dp** |
| `ActiveTrackColor` / `InactiveTrackColor` | `Primary` / `SecondaryContainer` |
| `StopIndicatorSize` | 4.0.dp |

`Slider.kt:3377-3384` 把 token 直接绑到组件常量：

```kotlin
internal val TrackHeight
    get() = SliderTokens.InactiveTrackHeight
internal val ThumbWidth
    get() = SliderTokens.HandleWidth
private val ThumbHeight
    get() = SliderTokens.HandleHeight
private val ThumbSize
    get() = DpSize(ThumbWidth, ThumbHeight)
private val VerticalThumbSize
    get() = DpSize(ThumbHeight, ThumbWidth)
```

> 即：Compose 的 API 参数历史名叫 `thumb`，**视觉与尺寸定义全部来自 `Handle*` token**。用户说的「带手柄」= 带 `Handle` 的 Slider，是准确的口语表述。

## 二、交互态：源码是「变细一半」，不是「展开成胶囊」

`Slider.kt:2762-2783`（`SliderDefaults.Thumb` 内部）：

```kotlin
val size =
    if (interactions.isNotEmpty()) {
        if (isVertical) {
            thumbSize.copy(height = thumbSize.height / 2)
        } else {
            thumbSize.copy(width = thumbSize.width / 2)   // ← 交互时宽度减半
        }
    } else {
        thumbSize
    }
Box(
    modifier.size(thumbSize).hoverable(...).pointerHoverIcon(PointerIcon.Hand),
    contentAlignment = Alignment.Center,
) {
    Spacer(
        Modifier.size(size)
            .background(colors.thumbColor(enabled), SliderTokens.HandleShape.value)
    )
}
```

与 tokens 里 `FocusHandleWidth = 2.dp` / `PressedHandleWidth = 2.dp` 完全一致：**4dp → 2dp，更细**。

**源码里没有任何「静止时收起 / idle 消隐 / hover 展开成 24dp 胶囊」的语义。** 「怠速」二字以及由此派生的「交互中柄被 idle 判定收走」「idle 消隐时序过短」全部是错词带出来的虚构诊断。

## 三、md3 现实现 vs 权威

`ios-desktop/apps/_shared/idle-slider.css`（#227 单源化后的唯一组件源）：

| 项 | AOSP M3 (`SliderTokens`) | md3 现实现 | 判定 |
| --- | --- | --- | --- |
| 手柄宽 | 4dp | 常态 **6px** | 偏差 |
| 手柄高 | 44dp | **22px** | 偏差 |
| 形状 | `CornerFull` 全圆角 | 常态 3px / 交互 11px | 偏差 |
| 轨道高 | 16dp | **6px** | 偏差 |
| 交互态宽度 | **4→2dp（减半变细）** | **6→24px（变宽成胶囊）** | **方向相反** |
| 禁用不透明度 | **0.38** | **0.38** | ✅ 唯一吻合 |
| 轨道色 | Primary / SecondaryContainer | primary / surface-container-highest | 近似 |

> ⚠️ **诚实边界**：md3 是 `input[type=range]` 网页原生控件，44dp 手柄会撑破现有 20px 高的 input 容器；且 #227 的原始诉求是「全库 6 种规格统一」，它**已完成统一**，只是统一到了非源码规格上。**几何对齐不是替换几个数字**，涉及容器高度、伪元素定位、15+ 应用与全部相关测试断言的重锚，须独立施工窗口；本报告不擅自改 CSS 数值。

## 四、错词污染面（本轮清点）

| 面 | 规模 | 说明 |
| --- | --- | --- |
| 中文错词「怠速柄」 | **49 文件** | 含 19 个应用 HTML、12 个测试、6 个 e2e 脚本、2 个 `_shared` 组件头注、2 个模板、docs 6 处、`dist/` 2 处 |
| 物理标识 `idle-slider` | **59 文件引用** | 文件名 / 类名 / `window.__idleSlider` / 生成器台账 |
| **伪源码锚 `A17 Expressive slider idle-handle`** | **4 处** | `typing/index.html:112`、`gravity/index.html:109`、`markdown/index.html:66`、`app-template-multi/style.css:111` —— 声称是 A17 源码术语，**源码里不存在** |
| 派生虚构语义 | 多处 | 「细竖条怠速 / hover 胶囊展开」「怠速时拇指收为 4px」「交互中柄被 idle 判定收走」 |
| 硬断言 | 3 处 | `tests/pdf.test.js:175` `toContain('怠速')`、`tests/archive.test.js:131` `toContain('怠速柄')`、`tests/admission-rework.test.js:96` `toMatch(/怠速柄滑条.../)` |

## 五、处置分档（按 #54 第五条「复用已入库资源、按原值」与「注释即锚」史实契约）

1. **术语正名（本轮执行）**：活跃真源里的「怠速柄」→「带手柄」；`idle-handle` 伪锚 → `M3 Handle（SliderTokens.HandleWidth/Height）`；3 条硬断言同步改词，避免门禁假红。
2. **物理标识保留**：`idle-slider.css` / `.js` / `.mdslider` / `window.__idleSlider` **不重命名** —— 59 处引用 + 生成器台账 + 历史锚全绑在上面，改名收益远低于风险。在两个组件文件头加「权威正名 + 保留原因」声明块。
3. **几何对齐归 #227**（不另开议题，避免与既有「滑块规格统一」重合）：在 #227 发勘误评论附本表权威值，由 #227 承载后续施工；本报告不改 CSS 数值。
4. **基于错词的诊断撤销**：#325 的「读法 B · 怠速柄消隐时序」判定作废；`docs/reflection-259-breakdown-r160.md` P11 读法 B 属同一误判，正文属对方产物不改，只在 #325 与本报告注明。
5. **史实不改写**：`docs/worklog.md`（R62–R66 六批交付记录）、已关闭议题、历史交付帖里的错词**原地保留**，只在新开勘误卡里统一说明 —— 改写史实会让后续零上下文会话对不上账。
6. **`dist/` 不手改**：构建产物，随下轮构建自然更新。

## 六、一条流程教训

**术语必须回源核验。** 这次的根因不是「谁打错了字」，而是几十轮里**没人回头核对一个被反复引用的「源码术语」是否真的存在于源码**。当前仓内已有 `docs/reference/` 体系，此后凡出现「AOSP/Expressive/源码里叫 XX」的写法，须能给出 `docs/reference/` 下的文件路径或本目录式实拉出处，否则不得写成源码锚。

关联：#227、#325、#54、#76、#259、`docs/issue-259-breakdown.md`
