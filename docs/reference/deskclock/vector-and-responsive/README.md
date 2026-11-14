# Google DeskClock APK 资源考证 · 矢量图/响应式/可变字体 六维供料（R130 窗加餐）

> 来源：#224 附件时钟 APK（7,712,487B，md5 9bdbc8f58ddc03c0116371236f7345a0，com.google.android.deskclock，App Bundle 形态 base.apk + split_config.xxhdpi.apk）。
> 一期（R115）只挖了字体；本二期补齐 **VectorDrawable 体系 / 响应式布局 / bedtime 形态 / 交互规范 / 可变轴预设 / gm3 动效参数**。
> 工具：自研纯标准库解析器（axml-dump.py / arsc-dump.py，见本目录）——AXML 全文 1,610 文件 + resources.arsc 66,303 条 ID 映射。

## 一、矢量图体系（「老一套 CSS 动画」的正解对照）

**总量**：vector 346 个 / animated-vector **39 个** / path 743 / objectAnimator 729 / group 188 / pathInterpolator 71 条去重曲线。

**AOSP 三层架构**（vs md3 现状 = CSS keyframes + SVG 换图）：
1. `<vector>` 持 pathData（贝塞尔路径本体，viewport 24~96）
2. `<animated-vector>` 把 animator 绑到 path/group 的 `name`（AE/ShapeShifter 导出的 `_R_G_L_0_G_D_0_P_0` 图层命名）
3. `<objectAnimator>` 驱动属性动画 + `<pathInterpolator pathData="M 0,0 C …">` 贝塞尔缓动

**objectAnimator 属性分布**（729 条）：fillAlpha 204 / **pathData 163（形变 morph）** / rotation 74 / scaleY 56 / scaleX 51 / translationZ 42 / elevation 32 / translateX 21 / fillColor 7 / trimPathEnd 5。

**代表性资产族**（全文见 avd-bedtime-drawables.txt，405 个 `$$avd_*` 名单）：
- `$$avd_alarm_activity_thumb_dismiss/shake/snooze__*`——闹钟卡片拇指图标三动画组（滑动删除/摇晃/贪睡）
- `$$avd_bedtime_onboarding_graphic__*`——睡眠引导动画（多分镜）
- `$avd_tab_bedtime_transition__1`——tab 切换矢量过渡
- 时钟 tab 图标（`4P.xml` 风速 path、`2J.xml` 电池等，见 axml-all.txt）

**pathInterpolator 曲线库**（最高频 12 条，全部 71 条见 axml-all.txt）：
- `c0.167,0.167,0.833,0.833` ×201（M3 emphasized 通用）
- `c0.001,0,0,1` ×28、`c0.521,0,0.667,1` ×16、`c0.333,0,0.667,1` ×13 …
- 精密物理曲线（如 `c0.459835446521,0 0.552814645922,1`）

## 二、gm3 动效规范参数表（dimen 实数值）

| 参数 | 值 |
|---|---|
| emphasized_accelerate | x1=0.3, x2=0.8, y1=0, y2=0.2 |
| emphasized_decelerate | x1=0.1, x2=0.1, y1=0.7, y2=1 |
| emphasized（复合 pathData） | `M 0,0 C 0.05,0 0.133333,0.06 0.166666,0.4 C 0.208333,0.82 0.25…`（多段 S 形） |
| standard | 0.2,0,0,1；accelerate 0.3,0,1,1；decelerate 0,0,0,1 |
| **expressive_spring（带手柄滑块体系）** | **damping=1, stiffness=1600, spatial_damping=0.8** |

## 三、响应式布局（限定符全景）

layout 段 386 默认布局 + 变体：**h≥600dp ×11 / h≥800dp ×4 / w≥1536dp ×2（多窗格大屏）/ land ×12+2（叠 h600）**；drawable 段 11 个 config 副本。md3 现状：单套 CSS 无断点变体——「排版旧样式」的实证差距。

## 四、bedtime 完整形态（白噪音→睡眠时间「颠覆方案」参照）

- 布局：`ConstraintLayout > include + 6×ImageView + **8×ActivityVisualizerView 连排** + 8×View 分隔 + 3×TextView`（09.xml 全文见 bedtime-layouts.txt）
- **ActivityVisualizerView = 睡眠活动可视化条**（源码侧 com.android.deskclock.bedtime.ActivityVisualizerView，AOSP 原生控件）
- 矢量资产 437 个 bedtime/sleep 命名（含 onboarding 多分镜动画全文）
- md3 现状是「白噪音改良」；源码形态 = **睡眠时间轴 + 活动可视化 + 引导动画**体系

## 五、MaterialSwitch（开关小球「新样式」正源）

10 个布局使用 `com.google.android.material.materialswitch.MaterialSwitch`（12 处实例，全文见 materialswitch-layouts.txt）。**M3 MaterialSwitch 组件自带新 thumb/track 形态**（含按压/拖动态），md3 需按组件级视觉重建而非改旧 CSS 球。布局中 style 走主题引用（style 段为 sparse complex，本工具未完全解出——组件级视觉已足够对齐）。

## 六、可变字体轴预设（「瘦长款」实锤 + 超越方向）

APK 内 fontVariationSettings 字符串（全局池实拉）：
- **大时钟瘦长主档：`'wght' 300, 'ROND' 100, 'wdth' 70`**（副档 `'wght' 450, 'ROND' 100, 'wdth' 70`）
- Material Symbols 图标动态轴阶梯（opsz 11/12/14/16/22/24/28/32/36/45 × wght 400/500，CRSV/FILL/GRAD/HEXP/ROND 全零基准）
- APK 内字体资产仅 clock.ttf（7 字形存根，一期已考证）；真源 Google Sans Flex 走 GMS 动态下发

**超越方案承接（用户裁决）**：
- **时钟应用内**：五轴可调（ROND/opsz/slnt/wdth/wght）调「应用内大时钟」，默认值=源码瘦长档（wght 300/wdth 70/ROND 100）
- **设置应用内**：独立五轴调节面控制「锁屏大时钟」，**两套配置互不干扰**（独立持久化 key）
- CSS 侧落点：`font-variation-settings: "ROND" var(--x), "opsz" …`（MVF 子集 56KB 已在库 #224 二期）

## 工具与原始产物（本目录）

- `axml-dump.py` / `arsc-dump.py`：纯标准库解析器（AXML/arsc，sparse 格式已处理）
- `axml-all.txt`：1,610 文件 XML 全文（1.3MB）
- `arsc-map.tsv`：66,303 条 ID→type/config/name/value
- `draw2path.json`：1,009 条 drawable 名→混淆路径
- `out/avd-bedtime-drawables.txt`：bedtime/sleep 矢量资产全文 437 个（221KB）
- `out/materialswitch-layouts.txt`：MaterialSwitch 布局 10 件
- `out/bedtime-layouts.txt`：bedtime 布局 4 件
- APK 原件不入库（7.4MB，#224 附件可复取）

## 交付纪律
- reference: 前缀提交，不占主会话版本号
- 后续深水候选：`$avd_tab_bedtime_transition` 全分镜、ActivityVisualizerView 的 dex 侧实现（classes.dex 反编译另案）
