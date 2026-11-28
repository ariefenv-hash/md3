# Gastown 9.3 原版基线对照（com.google.android.deskclock 9.3 / 1003616371）

来源：`docs/reference/deskclock/gastown93/`（议题 #330 上传 APK 反编译产物，android-17.0.0_r1）
铁律：不自造样式；保证视觉语言；没有的诚实说明。

> **v2 修订（本轮全量移植）**：v1 中「反编译产物未含 anim/ 类型」的判断**错误，已翻面**。
> arsc 实际含 `anim 53` / `animator 38` / `interpolator 25` / `integer 85` 条，
> 动画证据链完整，只是分散在五种资源类型中需交叉解析。
> 详见同目录 `motion-spec.md` 与 `motion-spec.json`。

## 一、计量器（Timer Track）

| 令牌 | 9.3 原值（arsc） | 现源码 clock93-core.mjs | 判定 |
|---|---|---|---|
| timer_track_progress_indicator_size | 340dp | timerTrackDp: 340 | ✅ |
| timer_track_thickness | 12dp | timerTrackThickness: 12 | ✅ |
| timer_track_corner_radius | 6dp | timerTrackCorner: 6 | ✅ |
| timer_track_progress_indicator_gap_size | 12dp | timerGap: 12 | ✅ 已接入 `ringGeometry` |
| timer_label textSize | 16sp | timerLabelSp: 16 | ✅ 本轮补 |
| add_one_min_button_end_guide | 0.68 | timerAddMinGuide: 0.68 | ✅ 本轮补 |
| timer_card_spacer_size | 0.06 | timerCardSpacer: 0.06 | ✅ 本轮补 |

**corner 与 gap 的 Web 映射**（本轮落地）：
- `stroke-linecap: round` 的 cap 半径 = `trackThickness/2 = 6dp`，恰对应 `trackCornerRadius=6`；
- `indicatorTrackGapSize=12dp` 由 indicator 弧两端各内缩 6dp 表达，
  `ringGeometry()` 返回 `offset = -trackGap/2`，`app.mjs` 两处热路径写入 `stroke-dashoffset`。

## 二、FAB

| 令牌 | 9.3 原值 | 现源码 | 判定 |
|---|---|---|---|
| gastown_fab_width / height | 80dp | fabSize: 80 | ✅ |
| gastown_fab_corner_radius | 24dp | fabCorner: 24 | ✅ |
| gastown_fab_margin | 16dp | fabMargin: 16 | ✅ 本轮补 |
| mtrl_fab_show scale | 330ms (F8.xml) | FAB_SPEC.show.scale | ✅ 本轮翻面 |
| mtrl_fab_hide scale | 135ms (c21.xml) | FAB_SPEC.hide.scale | ✅ 本轮翻面 |

> v1 代码里 `DUR.fab = 250` 属语义档位猜测，已作废。

## 三、世界时钟 / 秒表

| 令牌 | 9.3 原值 | 现源码 | 判定 |
|---|---|---|---|
| gastown_city_card_analog_size | 76dp | cityAnalogDp: 76 | ✅ |
| gastown_stopwatch_nav_button_size | 48dp | stopwatchNavDp: 48 | ✅ |
| gastown_stopwatch_nav_button_padding | 12dp | stopwatchNavPadding: 12 | ✅ 本轮补 |
| gastown_stopwatch_lap_view_margin | 12dp | stopwatchLapMargin: 12 | ✅ 本轮补 |

## 四、底栏与动效（9.3 翻面）

- `gastown_nav_bar` 在 9.3 重新挂载（@ref/0x7f0e008f / 0x7f0e00f6），
  v8.49「顶栏胶囊」决策作废。`gastown-nav.mjs` 监听 `.nav-item.active`，方向正确。
- `DUR.tab = 320` → **300**（fragment scale 300ms 与 `design_tab_indicator_anim_duration_ms` 300 互证）。
- `DUR.sheet` → **150**（`bottom_sheet_slide_duration`），`translateY(100%)` → **20%**。
- FAB / fragment / sheet / tab indicator 全部按 `motion-spec.json` 逐值重写。

## 五、全量结构对照（32 个 layout）

按**功能语义**而非 id 字面（Android snake_case ↔ Web kebab/camel）逐项核对，24 项关键结构谓词全部命中：

主时钟 56sp / 城市钟 57sp / 闹钟卡 36sp / 计时器 80sp / 单位 16sp /
模拟钟 240dp / 城市模拟钟 76dp / 预设 25sp / 卡片圆角 24dp / FAB 80·r24·margin16 /
底栏 5 tab / active 药丸 / 三列时分秒 / 12 键键盘 / 预设 5·10·30·45 /
圈速列表 / 圈速箭头 48dp / city_name 24sp / hours_ahead 16sp /
MaterialSwitch / silent·vibrate / timer_track_expired / timer_label 16sp / guide 0.68。

**结论：结构层移植已完整，剩余缺口全在动效与几何细节，本轮已补。**

## 六、证据链边界（诚实说明）

1. **AVD 图标动画与系统组件动画是两条独立来源**：
   `gastown93-assets.mjs` 内嵌 15 组 AVD easing（`.167/.333/.719` 系，Google Symbols 专用曲线）
   与 arsc 的 7 组 M3 easing / 25 组 interpolator **零交集**。各守其源，不可用 M3 token 覆盖 AVD。
2. **Ripple 450/375ms 不在本 APK arsc**：`RippleDrawable` 由 framework 提供，
   取值来自 asset-drop 已核对的 AOSP `RippleShader.java`，已单独标注。
3. **`emphasized` 是分段三次贝塞尔路径**（两段 C），CSS `cubic-bezier()` 无法表达，
   由 `g93-motion.mjs` 的 `makePathEasing()` 在 JS 侧承载。
4. **fragment alpha 的 `ordering="1"` 两段顺序执行**在 CSS 以单段 33% 近似。
5. **未接 WebGL2 涟漪引擎**：asset-drop 有 `RippleEngine.ts` / `shaders.ts`（含 SDF），
   但按钮级状态层用 CSS 已对齐 450ms ENTER，小尺寸下渲染等价，引入 GL 上下文无收益。
6. **FAB margin**：`#g93Fab` 既有 `right:16px` 已对齐 `gastown_fab_margin`；
   `bottom = nav-h + 24px` 属 Web 布局适配。
