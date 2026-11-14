# 「怠速柄」→「带手柄」统一口径总表

> **本文件是本次勘误的唯一口径入口**。零散结论不再各写各的：`374911b1` 的权威考证在 `README.md`，多层权威链在 `official-spec-chain.md`，**受影响议题的最终处置一律以本表为准**，统一总卡为 **#328**。
>
> 建立时间 2026-11-14 · 关联 #328、#227、#325、#54、#76、#259、#18

## 一、一句话结论

用户语音「**带手柄的样式**」被 ASR 误识别为「**怠速柄的样式**」；权威名是 M3 Slider 的 **Handle（手柄）**。「怠速柄」「idle-handle」在 M3 规范、AOSP 固件源码、官方中文站、Material Web token 中**零命中**，属生造词 + 伪源码锚。

## 二、术语分层（解释 thumb / Handle 为何并存）

| 层 | 官方术语 | 出处 |
| --- | --- | --- |
| 设计规范 | **Handle** | `m3.material.io/components/sliders` Anatomy |
| 令牌 Android / Web | `Handle*` / `--md-slider-handle-*` | `SliderTokens.kt` / `material-web` |
| 平台 View 层 | **thumb** | `android.googlesource.com` `AbsSeekBar.java`（*"a draggable thumb"*、`android:thumb`） |
| Compose 公开 API | Thumb（历史兼容名） | `Slider.kt` `fun Thumb(...)` |
| 官方中文 | 滑块 / 拇指（本身不统一） | `developer.android.com` 中文「滑块」页 |

→ **项目中文一律用「带手柄（M3 Handle）」**；`thumb` 只在描述平台/API 标识符时使用，不得拿来命名设计规范层的样式。

`idle` 在 AOSP 的真实语义是**设备闲置**（Garage Mode、`setRequiresDeviceIdle(true)`），属电源/任务调度域，从不描述 slider 部件。

## 三、权威值（几何对齐目标，归 #227 施工）

| 项 | AOSP M3 | md3 现实现 | 判定 |
| --- | --- | --- | --- |
| HandleWidth / Height | 4dp / 44dp | 6px / 22px | 偏差 |
| HandleShape | `CornerFull` | 3px / 交互 11px | 偏差 |
| TrackHeight | 16dp | 6px | 偏差 |
| 交互态宽度 | **4→2dp 减半变细** | **6→24px 变宽成胶囊** | **方向相反** |
| DisabledHandleOpacity | 0.38 | 0.38 | ✅ 唯一吻合 |

官方规范页独立印证：*"a vertical handle that narrows when pressed"* / *"Slider handle adjusts width upon selection"*；*"M2: Sliders have a circular handle"* → radio 15×15 圆点是 **M2 遗留**，不是 M3。

## 四、受影响议题统一处置表（7 条开放）

| 议题 | 残留形态 | 最终口径 | 本轮动作 |
| --- | --- | --- | --- |
| **#18** 置顶 SOP | **正文 §2.1② 第 1 条钉着「怠速柄」（idle-handle）伪锚** | **活跃真源，必须正名**；这是几十轮反复继承错词的机制性源头 | **原地改正文** + 说明帖 |
| **#328** 勘误总卡 | 正文七章完整、但无 `official-spec-chain.md` 引用、0 评论 | **唯一统一总卡**，收口全部零散结论 | **追加 §八** + 交付帖 |
| **#227** 滑块规格 | 标题已正名；正文保留旧用户原话与旧规格表（史实） | **只承载几何对齐施工**，不做术语真源 | 短指向帖（已有 2 条勘误帖，不重复长文） |
| **#325** 开关一闪而过 | 正文交叉表引用 #227 旧标题；读法 B 已作废 | 回到**读法 A**（switch thumb 的 SnapSpec 可见性），与 slider 完全无关 | 短指向帖 |
| **#228** 准入 lint | 正文「每个 type=range 必须命中统一怠速柄组件」 | 施工要求按 **M3 Handle 组件**理解；组件物理名 `idle-slider.*` 保留 | 短指向帖 |
| **#322** 波浪场设置 | 正文交叉表引用 #227 旧标题 | 与本勘误**无实质关联**，仅引用旧标题 | 短指向帖（一行） |
| **#264** 时钟二次修改 | 正文 2 处「怠速柄滑块」+ 附「gm3 expressive 弹簧参数」 | 术语随正名；**弹簧参数同属待回源核验项**（按 #54 第⑥条），不在本轮正名范围，登记不擅改 | 短指向帖 |

### 已关闭议题（按史实契约保留，不改写）

#179（准入六条）、#230（CI 评分卡）、#259（母卡）等标题/正文中的错词**原地保留** —— 改写史实会让零上下文会话对不上账。它们在本表登记为「可追溯的现场」，不是活跃真源。

## 五、文件层处置（`374911b1` 已落地，本表确认不翻案）

| 面 | 处置 |
| --- | --- |
| 41 个活跃文件 | 怠速柄 → 带手柄；4 处 `idle-handle` 伪锚 → `M3 Handle（SliderTokens.HandleWidth/Height）` |
| 3 条硬断言 | `pdf` / `archive` / `admission-rework` 同步改词，门禁不假红 |
| 2 个组件头注 | 加权威正名块（ASR 误识别、权威名、权威值、物理名保留原因、几何归属） |
| 物理名 `idle-slider.css` / `.js` / `.mdslider` / `window.__idleSlider` | **不重命名**（59 引用 + 生成器台账 + 历史锚），语义正名在头注 |
| `docs/worklog.md`（R62–R66）、`reflection-259-breakdown-r160.md`、`dist/`、历史交付帖 | **保留史实**，随下轮构建自然更新 |

## 六、统一指向（避免多真源）

```
#328（唯一总卡）
 ├─ docs/reference/material3/slider/README.md                源码实拉 + 逐值对照
 ├─ docs/reference/material3/slider/official-spec-chain.md   多层权威链
 ├─ docs/reference/material3/slider/unified-errata.md        本表（议题处置）
 └─ #227（仅承载几何对齐施工）
```

**后续零上下文会话只需读 #328 + 本表**；不要在 #227 / #325 / #54 评论区再写第二份长考证。

## 七、纪律（并入 #54 第 ⑥ 条）

凡出现「AOSP / Expressive / 源码里叫 XX」的写法，须能给出 `docs/reference/` 下的文件路径或实拉出处，否则不得写成源码锚。**术语必须回源核验** —— 这次的根因不是谁打错了字，而是几十轮里没人核对一个被反复引用、甚至进了置顶 SOP 和测试硬断言的「源码术语」是否真的存在。

关联：`374911b1`、`e888a421`、#328、#227、#325、#54、#76、#259、#18
