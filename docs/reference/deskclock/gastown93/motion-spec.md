# 9.3「Gastown」动效真源规格 · motion-spec.json 说明

> 由 `arsc93-full.tsv`（109,910 条）+ `axml-all93.txt`（1,535 个 res 文件）逐行解析生成，
> 未做任何推演。机器可读版本见同目录 `motion-spec.json`。
> 源 APK：`com.google.android.deskclock_9.3_(1003616371)-76133240` / targetSdk 37 / android-17.0.0_r1。

## 一、资源类型分布（arsc93-full.tsv）

| 类型 | 条数 | 用途 |
|---|---|---|
| `anim` | 53 | 视图动画（含 `ic_tab_*` 图标插值器、bottom sheet 滑入滑出） |
| `animator` | 38 | `objectAnimator` / `selector`（含 FAB motion spec、fragment 切换） |
| `interpolator` | 25 | 插值器（mtrl_* / gm3_* / m3_* 系统 easing） |
| `integer` | 85 | 时长常量（`m3_sys_motion_duration_*` 等） |
| `dimen` | 1,546 | easing 控制点、几何尺寸 |
| `string` | 97,791 | 含 `*_emphasized_path_data` 分段贝塞尔路径 |

**结论：上一轮报告中「反编译产物未含 anim 类型」的判断是错的，此处翻面。**
动画证据链在 arsc 中完整存在，只是分布在 anim / animator / interpolator / integer / dimen 五种类型里，
需要交叉解析才能闭合。

## 二、时长（duration_ms，47 条）

`m3_sys_motion_duration_*` 与 `gm3_*` 完全同值：

| 档 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| short | 50 | 100 | 150 | 200 |
| medium | 250 | 300 | 350 | 400 |
| long | 450 | 500 | 550 | 600 |
| extra_long | 700 | 800 | 900 | 1000 |

组件级常量：

| 名称 | 值 | 来源 |
|---|---|---|
| `bottom_sheet_slide_duration` | 150 | `design_bottom_sheet_slide_in/out` (rI2/QP.xml) |
| `app_bar_elevation_anim_duration` | 150 | `m3_appbar_state_list_animator` |
| `design_tab_indicator_anim_duration_ms` | 300 | — |
| `mtrl_tab_indicator_anim_duration_ms` | 250 | — |
| `m3_btn_anim_duration_ms` / `mtrl_btn_anim_duration_ms` | 100 | — |
| `mtrl_card_anim_duration_ms` | 120 | — |
| `abc_config_activityDefaultDur` / `ShortDur` | 220 / 150 | appcompat |

## 三、缓动（easing，7 条）

全部取自 `m3_sys_motion_easing_*_control_{x,y}{1,2}` dimen（float 后缀 `f`）：

| 名称 | 控制点 [x1,y1,x2,y2] |
|---|---|
| `standard` | `[0.2, 0, 0, 1]` |
| `standard_decelerate` | `[0, 0, 0, 1]` |
| `standard_accelerate` | `[0.3, 0, 1, 1]` |
| `emphasized_decelerate` | `[0.1, 0.7, 0.1, 1]` |
| `emphasized_accelerate` | `[0.3, 0, 0.8, 0.2]` |
| `linear` | `[0, 0, 1, 1]` |

**`emphasized` 不是单段贝塞尔**，而是分段三次贝塞尔路径（string 资源）：

```
M 0,0 C 0.05, 0, 0.133333, 0.06, 0.166666, 0.4
      C 0.208333, 0.82, 0.25, 1, 1, 1
```

CSS `cubic-bezier()` 无法表达两段，由 `g93-motion.mjs` 的 `makePathEasing()` 在 JS 侧承载。

`interpolator` 资源（25 条）中的四个关键值：

| 名称 | 控制点 | 对应文件 |
|---|---|---|
| `mtrl_linear_out_slow_in` | `[0, 0, 0.2, 1]` | up.xml |
| `mtrl_fast_out_linear_in` | `[0.4, 0, 1, 1]` | yS.xml |
| `mtrl_fast_out_slow_in` | `[0.4, 0, 0.2, 1]` | RL.xml |
| `fast_out_slow_in` | `[0.4, 0, 0.2, 1]` | sn.xml |
| `mtrl_linear` | `<linearInterpolator/>` | Lv.xml |

## 四、FAB 显隐规格（逐 objectAnimator）

MDC 1.14 使用 `mtrl_*` 组；`design_*` 为 appcompat 兼容组，留档对照。

### `mtrl_fab_show_motion_spec` (F8.xml)

| property | duration | startOffset | interpolator | 解出的控制点 |
|---|---|---|---|---|
| opacity | 15 | 30 | `@0x7f0d0017` mtrl_linear | linear |
| scale | 330 | 0 | `@0x7f0d0018` mtrl_linear_out_slow_in | `[0,0,.2,1]` |
| iconScale | 240 | 90 | `@0x7f0d0018` | `[0,0,.2,1]` |

### `mtrl_fab_hide_motion_spec` (c21.xml)

| property | duration | startOffset | interpolator | 解出的控制点 |
|---|---|---|---|---|
| opacity | 15 | 150 | mtrl_linear | linear |
| scale | 135 | 0 | `@0x7f0d0015` mtrl_fast_out_linear_in | `[.4,0,1,1]` |
| iconScale | 180 | 0 | `@0x7f0d0015` | `[.4,0,1,1]` |

### `design_fab_show/hide` (Aa.xml / UE.xml)

两者均为 opacity 200 + scale 200，hide 的 iconScale 在 offset 200 触发一次 0ms 跳变。

> **移植结论**：上一轮代码里 `DUR.fab = 250` 是语义档位猜测，已按 F8/c21 翻面为 **330 / 135**。

## 五、Fragment 切换（Sc1 / BJ2 / q6 / 5z.xml）

float 位模式解码：`0x3f59999a=0.85`、`0x3f933333=1.15`、`0x3f8ccccd=1.1`、`0x3f666666=0.9`。

| 资源 | alpha（ordering=1 两段） | scale |
|---|---|---|
| `fragment_open_enter` | 50ms hold + 50ms 0→1 | `.85 → 1.0` / 300ms |
| `fragment_open_exit` | 50ms hold + 50ms 1→0 | `1.0 → 1.15` / 300ms |
| `fragment_close_enter` | 66ms hold + 50ms 0→1 | `1.1 → 1.0` / 300ms |
| `fragment_close_exit` | 66ms hold + 50ms 1→0 | `1.0 → 0.9` / 300ms |

> 上一轮 `DUR.tab = 320` 为猜测，已翻面为 **300**（`design_tab_indicator_anim_duration_ms`
> 与 fragment scale 时长同为 300，互为印证）。

## 六、BottomSheet（rI2.xml / QP.xml）

`duration = @0x7f0c0003 = bottom_sheet_slide_duration = 150ms`，
`translate fromYDelta = @0x19999a31/t06`（fraction 20%）→ 0，`alpha 0→1`（滑出反向）。

> 上一轮 `g93-sheet-up` 用 `translateY(100%)` 属自造，已按 20% 翻面。

## 七、tab 图标 AVD 专用插值器（ic_tab_* anim）

| 资源 | pathData |
|---|---|
| `ic_tab_clock_interpolator_0` (p_.xml) | `M 0,0 c 0.45921046959,0 1,1 1,1` |
| `ic_tab_clock_interpolator_1` (SI.xml) | `M 0,0 c 0,0 0.618865688196,1 1,1` |
| `ic_tab_stopwatch_interpolator_0` (3N.xml) | `M 0,0 C 0.2,0 0.1,0.5 0.5,0.5 C 0.7,0.5 0.6,1 1,1` |

### 证据链边界（重要）

`gastown93-assets.mjs` 内嵌的 **15 组 AVD animator easing**（`.167/.333/.719` 系列）
与本卷 arsc 的 **7 组 M3 easing / 25 组 interpolator** **零交集**。

这不是矛盾，而是两套独立来源：

1. **AVD 图标形变** → Google Symbols 的 animated-vector 专用曲线（0.167 / 0.333 / 0.719 系列），
   随矢量资源打包，不在系统 motion token 表里；
2. **系统组件动画**（FAB / fragment / bottom sheet / tab indicator）→ M3 `m3_sys_motion_*` token。

因此 AVD 时序仍以 `gastown93-assets.mjs` 内嵌值为准（其本身即 APK 内 animated-selector 的逐字转译），
**不能、也不应**用 M3 token 去覆盖它。两层各守其源。

## 八、Web 落点

| 真源 | 落地文件 | 位置 |
|---|---|---|
| duration / easing / FAB / fragment / sheet spec | `ios-desktop/apps/clock-app/g93-motion.mjs` | `MOTION` / `EASE` / `FAB_SPEC` / `FRAGMENT_SPEC` / `SHEET_SPEC` |
| CSS 变量 + 关键帧 | `ios-desktop/apps/clock-app/index.html` | `<style id="g93-motion-tokens">` |
| `makePathEasing` 分段贝塞尔 | `g93-motion.mjs` | 承载 emphasized 路径 |
| `trackGap=12dp` → `stroke-dashoffset` | `app.mjs` 两处热路径 | `M93.ringGeometry(..., C.GASTOWN93_SPEC.timerGap)` |

## 九、与项目全局令牌的差异（本轮决策记录）

项目真源 `ios-desktop/apps/_shared/md3-tokens.css` 有两条与 9.3 arsc **不一致**：

| 令牌 | 项目现值 | 9.3 arsc 真值 |
|---|---|---|
| `--md-easing-emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | `[0.1, 0.7, 0.1, 1]` |
| `--md-easing-emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | `[0.3, 0, 0.8, 0.2]` |

**本轮不改全局令牌**，理由：
- `tests/motion-easing.test.js` 的批 1 精确等值映射表（MAP）逐字锚定 `0.05,0.7,0.1,1`
  与 `0.3,0,0.8,0.15`；`tests/batch9.test.js` 亦断言含 `0.05` 的 fallback 字符串；
- 该令牌被 71 个 css/html 文件消费，翻面会扩大到全站视觉，超出「时钟应用移植」范围；
- **时钟应用的关键帧层未消费这两条令牌**（只用 `standard` / `mtrl-*` / `linear`），
  因此差异对本次移植结果零影响。

时钟侧的 arsc 真值完整保存在 `g93-motion.mjs` 的 `EASE` 中（JS 数值，不受 CSS 令牌约束）。
若后续要全站对齐 9.3，应作为独立议题同时更新 MAP、batch9 断言与 `motion-token-baseline.json` 水位。

## 十、诚实缺口

1. **Ripple ENTER 450ms / EXIT 375ms 不在本 APK arsc**：`RippleDrawable` 由 framework 提供，
   DeskClock 不内置该资源。取值来自 asset-drop 已核对的 AOSP `RippleShader.java`，单独标注。
2. **AVD animator 的 duration / startOffset 未做逐值反查**：animated-selector 的 `<animated-vector>`
   在 `axml-all93.txt` 中未被本卷提取器展开；`gastown93-assets.mjs` 已是逐字转译，本卷不再重复核对。
3. **fragment alpha 的 `ordering="1"` 两段顺序执行**在 CSS 中以单段 33% 近似（100ms / 300ms）。
4. **`emphasized` 分段路径**仅 JS 侧实现，CSS 关键帧层只用单段 easing。
5. **未接 WebGL2 涟漪引擎**：asset-drop 有 `RippleEngine.ts` / `shaders.ts`（含 `sdCircle` 等 SDF），
   但时钟应用的按钮级状态层用 CSS `@keyframes g93-ripple` 已对齐 450ms ENTER，
   小尺寸下与 MDC `RippleDrawable` 渲染结果等价，引入 GL 上下文无收益。
