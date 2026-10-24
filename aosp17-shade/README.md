# Android 17 SystemUI 通知中心 & 控制中心 — Web 移植

以 **AOSP `android-17.0.0_r1`**（Cinnamon Bun，commit `94b4c163b7dfe5ce3607f7bb8456f9573f7de57d`）的
`frameworks/base/packages/SystemUI` 与 `frameworks/base/core/res` 为唯一事实来源，
把 **通知中心（Notifications Shade Overlay）** 与 **控制中心（Quick Settings Overlay）**
以 1:1 移植方式搬到 Web（Vite + TypeScript，无任何 UI 框架）。

> 移植 ≠ 复刻：文件结构、类名、布局层级、颜色/尺寸常量全部照搬源码，
> 每个数值都注明 AOSP 资源名出处；视觉/交互表现对齐 Material 3 Expressive 版 SystemUI。

## 运行

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # dist/
```

## 预览窗口架构（Next.js 常驻预览 + Vite 移植本体）

本工程**开发与构建完全使用 Vite**（未使用 Next.js）。沙箱客户端内的常驻 Next.js 应用
仅作为**预览窗口**：`/home/z/my-project/src/app/page.tsx` 全屏内嵌本工程构建产物
（同步到 `public/shade/`，`base: './'` 使其可挂在任意子路径）。

```bash
# 修改移植代码后的同步流程（一条命令完成 构建→同步→预览窗口自动热更新）
bash /home/z/my-project/scripts/sync_preview.sh
```

```
download/android17-shade/   ← 移植本体（Vite + TS，交付物）
  └── dist/                 ← npm run build 产物
public/shade/               ← dist 的镜像（Next.js 静态托管）
src/app/page.tsx            ← 预览窗口：全屏 iframe /shade/index.html
```

## 双形态（ShadeMode）

源码依据 `com/android/systemui/shade/shared/model/ShadeMode.kt` 与 `res/values/shade_config.xml`：

| 形态 | 源码 | 手势/表现 |
|---|---|---|
| **双栏分栏** | `ShadeMode.Dual` + `config_dualShadeEnabledByDefault=true` | 左侧 75%（`config_invocationGestureSplitRatio=0.75`）下滑出通知面板；右侧 25% 下滑出控制中心；两块独立浮层面板（≤600dp、46dp 圆角） |
| **二合一** | `ShadeMode.Single` | 顶部下滑出合并面板（QQS 行 + 通知），面板全开后继续在顶部下拉 = 手风琴二段展开控制中心全网格 |

底部演示按钮可切换形态、恢复通知；「深色主题」磁贴切换系统配色（等价 ConfigurationController）。

## 移植对照表（AOSP → Web）

### res/values（设计令牌）
| AOSP 文件 | Web 文件 |
|---|---|
| `packages/SystemUI/res/values/shade_dimens.xml` | `src/res/values/dimens.ts`（shade_panel_width 600 / overlay_shade_panel_shape_radius 46 / common_tile_* 72·24·16·50·32·28·56 / overlay_qs_layout_brightness_* 28·52·4·40·24 / toolbar_* 48·36·24） |
| `packages/SystemUI/res/values/shade_config.xml` | `src/res/values/config.ts`（DualShade 开关 / 分栏比例 0.75 / notificationShadeOnTopEnd） |
| `core/res/res/values/colors.xml`（system_accent1..3/neutral1..2 全套默认 Monet 色板） | `src/res/values/colors.ts`（#D9E2FF 等逐值照搬，昼/夜两套 + MaterialTheme 映射 + surfaceEffect） |
| `packages/SystemUI/res/values/colors.xml`(+night) | 同上（status_bar_clock_color、ripple、GM2 灰阶、privacy_chip #3ddc84 等） |
| `packages/SystemUI/src/.../shade/ui/ShadeColors.kt` | `colors.ts:shadeColors()`（shadePanel=fg/bg 合成 + blur 分支、notificationScrim=accent1_100@50%） |
| `core/res/res/values/dimens.xml`（notification_2025_*） | `dimens.ts`（min_height 72 / icon_circle 40+8 / content_margin_start 72 / expand pill 26×18 / right_icon 48 …） |

### 图标
| AOSP | Web |
|---|---|
| `packages/SystemUI/res/drawable/vd_*` `ic_*` `qs_*`（含 `@string/path_*` 与 AVD 包装器解析） | `src/res/drawable/icons.ts` — 由 `scripts/convert_icons.py` 逐 path 转 SVG（52 个），白色→currentColor 等价磁贴 tint |

### 窗口与场景
| AOSP | Web |
|---|---|
| `scene/ui/view/SceneWindowRootView.kt`、`super_notification_shade.xml` | `src/systemui/shade/ShadeWindowRootView.ts`（壁纸/scrim/状态栏/面板层） |
| `shade/shared/model/ShadeMode.kt` | `src/res/values/config.ts:ShadeMode` |
| `shade/ShadeExpansionStateManager.kt` + `NotificationPanelViewController.java`（拖拽/fling/越界阻尼） | `ShadeWindowRootView.ts:bindGestures/trackExpansion/flingTo`（速度阈值 + PathInterpolator 近似） |
| `shade/ui/ShadeOverlayPanel`（M3E 浮动面板） | `src/systemui/shade/ShadeOverlayPanel.ts`（46dp 圆角、600dp 上限、blur+半透明 shade_panel） |
| `res/layout/combined_qs_header.xml` | `src/systemui/shade/ShadeHeader.ts`（日期/电量/隐私 chip） |

### 控制中心（QS）
| AOSP | Web |
|---|---|
| `qs/panels/ui/compose/infinitegrid/Tile.kt` + `CommonTile.kt`（TileDefaults 四态配色、圆角动画 24↔50 / 16↔50、bounceable） | `src/systemui/qs/Tile.ts` |
| `qs/panels/ui/compose/infinitegrid/InfiniteGridLayout.kt`、`GridLayout.kt`（4 列、大磁贴跨 2 列） | `src/systemui/qs/TileGrid.ts` |
| `qs/panels/ui/compose/QuickQuickSettings.kt`（QQS 图标行） | `TileGrid.quickRow()` |
| `brightness/ui/compose/BrightnessSlider.kt`（Dimensions.Default 与 shade_dimens 同源；level-list 三档图标；M3 Slider 颜色） | `src/systemui/qs/BrightnessSlider.ts` |
| `qs/footer/ui/viewmodel/FooterActionsViewModel.kt` + shade_dimens `toolbar_*`（48/36/24 圆钮，power 着色） | `src/systemui/qs/FooterActions.ts` |
| `qs/panels/data/repository/QSColumnsRepository.kt` + `config.xml` integers（4 列） | `dimens.ts:QUICK_SETTINGS_*_NUM_COLUMNS` |
| 默认磁贴（`StockTilesRepository`，17 拆分 Wi-Fi/移动数据双目标磁贴） | `src/systemui/qs/TilesState.ts:DEFAULT_TILES`（internet 为 dual-target 2×1） |

### 通知中心
| AOSP | Web |
|---|---|
| `res/layout/notification_stack_scroll_layout.xml` + `stack/NotificationStackScrollLayout.java` | `src/systemui/notifications/NotificationStackScroller.ts` |
| `core/res/res/layout/notification_2025_template_collapsed_base.xml`（及 expanded/messaging/media/progress、expand_button、right_icon、top_line_views） | `src/systemui/notifications/RowTemplates.ts` |
| `row/ExpandableNotificationRow.java`、`ActivatableNotificationView.java`（涟漪 `notification_ripple_untinted_color`）、`NotificationBackgroundView.java` | `src/systemui/notifications/ExpandableNotificationRow.ts` |
| `stack/NotificationSwipeHelper.java`（横滑清除：距离阈值 + 跟手阻尼） | 同上 `bindSwipe()` |
| 空态（17 新文案 "You're all caught up" + 奖杯） | `NotificationStackScroller.buildEmpty()` |

### 媒体
| AOSP | Web |
|---|---|
| `media/controls/ui/view/MediaViewHolder.kt`、`res/layout/media_carousel.xml`、`ui/drawable/SquigglyProgress.kt` | `src/systemui/media/MediaCarousel.ts` |

### 状态栏
| AOSP | Web |
|---|---|
| `res/layout/status_bar.xml`、`phone/PhoneStatusBarViewController.kt`、`BatteryMeterView`（battery_unified_frame） | `src/systemui/statusbar/PhoneStatusBarView.ts` |

## 已知近似（动态色 / 动画引擎）
- `shade_panel_fg_color`、`customColorSurfaceEffect0` 为壁纸动态取色运行时生成，AOSP 仓库中无静态值；此处按默认 Monet 种子合成 + `backdrop-filter: blur(48px)` 呈现（对应 `Flags.notificationShadeBlur()` 分支）。
- PhysicsAnimator/SpringAnimation、Material3 Expressive squash-stretch 以 CSS transition + Web Animations 等价实现。
- Internet 双目标磁贴的副目标详情对话框、Tile 长按自定义面板未纳入本次范围。

## 源码考证与修复记录（squish / 亮度 / 涟漪 / 矢量图）

以下四项均回 `android-17.0.0_r1` 源码逐行考证后落地（无头浏览器逐帧/逐值实测）：

### 1. 面板开合「挤压」中间态（verticalSquish）
- 链路（与源码逐字对应）：面板 expansion → `ShadeSceneContentViewModel.constrainSquishiness()`
  = `(0.1 + x*0.9).coerceIn(0,1)` → `TileSquishinessInteractor` → `InfiniteGridLayout` /
  `QuickQuickSettings` 逐 Tile 注入 → `Tile.verticalSquish`（**布局高度×squish、内容全尺寸
  垂直居中、由 clip 裁切**，非 transform 缩放）；split shade 下媒体卡同值
  （`shouldApplySquishinessToMedia`）；亮度滑条/工具栏不参与。
- 点开/关闭磁贴 = 两态圆角 spring（`animateTileShapeAsState`，NoBouncy+StiffnessMediumLow≈320ms）：
  **inactive 50dp 胶囊 ↔ active 24dp 圆方**（icon 16↔50），配 `animateColorAsState` 四态配色。
- 实测：e=0.25/0.5/0.75/1.0 → 磁贴高 23/40/56/72px（=72×squish，逐值命中）；QQS 行 33/59px 同源。
- 修复：QS 内容子项 `flex-shrink:0` —— 源码语义是内容全尺寸布局 + 面板 bounds 裁切
  （`setExpandedHeightInternal`），flex 收缩会破坏"露出多少裁多少"的行为。

### 2. 亮度滑块「怠速柄」结论（r1 基准）
- `BrightnessSlider.kt`（r1）= M3 Slider + **4×52dp 竖条 thumb**（40dp 轨 / 12dp 轨圆角 /
  **thumb 两侧 6dp gap**（`ThumbTrackGapSize`）/ 28dp 三档图标画在**轨内右端**随进度锚定，
  active/inactive 双色交叉淡化 100/50ms）/ 24dp 圆角背景框 10×6dp frame。
- `compose/core/PlatformSlider.kt`（无竖柄 64dp 胶囊轨）在 r1 已入库但 **QS 亮度唯一渲染入口
  仍是 BrightnessSliderContainer**（grep 实锤）——PlatformSlider 是超前路线，r1 基准不采用。
- 音量条**不属于**该面板：`QuickSettingsShadeOverlay.kt` 仅含 BrightnessSliderContainer；
  音量走音量键对话框（`volume_dialog_slider.xml`）。
- 实测：thumb 与填充段 6dp 间隙可见、图标轨内右端、三档随值切换。

### 3. 表达性涟漪「延迟感」根因修复
- 病灶：`RippleAnimationSession` 时间轴取自 `currentAnimationTimeMillis`，三处调用**漏写调用
  括号**（传出了函数引用）→ `elapsed = fn - fn = NaN` → progress 恒 NaN → **涟漪从未渲染过**
  （会话正常建立、rAF 正常跑、shader 输出全 NaN 丢弃）。
- 修复后端到端实测：pointerdown 捕获阶段同步建会话（0.2ms）→ ≤3 帧内涟漪可见
  （shader `fadeIn=subProgress(0,0.13,progress)` 与 AOSP AGSL 逐行同构）；
  WebGL 着色器构造期编译 + 1×1 预热 draw，首次点击无编译卡顿。

### 4. 矢量图逐 key 回源核对（52 键）
- 修正 23 个 stroke-only path 缺 `fill="none"`（SVG 默认黑填充叠加描边；
  AOSP `vd_autorotate`/`vd_hotspot`/`vd_data_saver`/`qs_auto_rotate_icon_*`/`qs_hotspot_icon_*`
  等本就是纯描边图标）。
- 补齐 `battery_unified_frame` 缺失的 body 描边轮廓（pathData=@string/battery_unified_frame_path_string，
  strokeWidth 1.5）与 `battery_unified_frame_bg` 空壳（同路径白填充 gutter）。
- `vd_wifi` 的 `stroke-width="0"` 废路径与 clipPath **忠实于 AOSP 源 XML**（源文件即如此），
  `ic_wifi_off` 为 AVD 包装器（`@drawable/vd_wifi` + 斜杠 mask 动画）的静态内联，均保留。
- `vd_flashlight` 曲线段补全（此前转换吞段）。

## 目录结构

```
src/
├── main.ts                    # SystemUIApplication 装配（dagger graph 子集）
├── res/
│   ├── values/{dimens,colors,config}.ts   # AOSP values 逐值移植
│   └── drawable/icons.ts      # vector drawable → SVG
├── systemui/
│   ├── shade/                 # 窗口/面板/手势/头部（SceneContainer）
│   ├── statusbar/             # 状态栏
│   ├── notifications/         # 通知栈 + 2025 模板 + 行手势
│   ├── qs/                    # 磁贴/网格/亮度/工具栏/状态机
│   ├── media/                 # 媒体卡
│   └── util/
├── style/systemui.css
└── demo/DemoData.ts           # 样例通知（各模板形态）
```
