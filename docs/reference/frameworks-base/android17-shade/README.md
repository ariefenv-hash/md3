# Android 17 shade / QS 权威参考（LineageOS 24.0 实拉）

> **性质**：#259 拆卡执行（R161 窗）的取证底座——「双栏样式自造」「单栏磁贴展开不对劲」两条用户反馈的权威对照物。
> **来源**：LineageOS 24.0（Android 17 基线类原生，2026-10-12 正式发布）`frameworks/base` 分支 `lineage-24.0`，经 `api.github.com` contents API（raw media type）逐文件实拉，非凭记忆转述。
> **关联**：#259 P6（磁贴展开）/ P14（双栏裁决）；R160 拆解报告 `docs/reflection-259-breakdown-r160.md`。

## 一、网络可达性复测（2026-11-14 R161 窗，沙箱 curl 实测）

| 站点 | 状态 | 结论 |
| --- | --- | --- |
| `android.googlesource.com` | **000 不通** | AOSP 官方源码站被墙（上轮结论复现） |
| `source.android.com` | **000 不通** | 同上 |
| `developer.android.com` | **000 不通** | 官方文档站同被墙 |
| `raw.githubusercontent.com` | **000 不通** | raw 直链被墙 |
| `crdroid.net` / `get.crdroid.net` | **000 不通** | 类原生发布站被墙 |
| `xdaforums.com` / `samfw.com` / `androidauthority.com` | 403 | 反爬拒绝（等效不可用） |
| `api.github.com` | **200 可达** | **绕墙主通道**：contents API raw 取源码 |
| `download.lineageos.org` | **200 可达** | LOS 官网可达 |
| 后端搜索通道（WebSearch） | **可达** | 新闻/发布信息面可用 |

**裁决**：固件站确实被墙（用户上轮观察属实）；以 **LineageOS 24.0 = Android 17 基线**为权威参考（用户明示「以安卓17为底的类原生也行」许可），GitHub API 通道稳定可复现。AOSP `android17-release @94b4c163`（R158 前考证链引用）的直连通道本轮未复现成功，后续引用统一锚定 LOS 24.0 可复核路径。

## 二、入库源码清单（`packages/SystemUI` @ `lineage-24.0`）

| 文件 | 路径 | 取证点 |
| --- | --- | --- |
| `shade_dimens.xml` | `res/values/` | 面板/磁贴/亮度条/工具栏权威几何 |
| `shade_dimens-sw600dp.xml` | `res/values-sw600dp/` | 大屏覆盖值（全部带 `desktop_sizing` featureFlag 门） |
| `shade_config.xml` | `res/values/` | 三态开关 + 手势分区 0.75 |
| `config.xml`（L62-68） | `res/values/` | **分页网格行列数权威值（手机竖屏）** |
| `config-land.xml` | `res/values-land/` | 横屏覆盖值 |
| `config-sw600dp-port.xml` | `res/values-sw600dp-port/` | 平板竖屏覆盖值 |
| `ShadeMode.kt` | `shade/shared/model/` | **三态语义 + Split 废弃实证** |
| `ShadeModeInteractor.kt` | `shade/domain/interactor/` | 模式解析链（DualShadeFlag → 用户设置 → config 默认） |
| `OverlayShade.kt` | `compose/features/.../shade/ui/composable/` | Dual 浮板几何（TopEnd/TopStart、半屏上限） |
| `SingleShadeNestedScrollLayout.kt` | 同上 | Single 手风琴嵌套滚动（QQS+Media 可折叠头部） |
| `ShadeScene.kt` | 同上 | Single 场景组合（statusBarHeader / mediaAndQqsHeader / 通知栈） |
| `QSColumnsRepository.kt` | `qs/panels/data/repository/` | 列数仓库（per-config 读取） |
| `GridLayoutTypeRepository.kt` | 同上 | **Single=Paginated / Dual=Infinite 网格分派** |
| `PaginatedGridLayout.kt` `TileGrid.kt` `InfiniteGridLayout.kt` | `qs/panels/ui/compose/` | 网格实现 |
| `LargeTileSpanRepository.kt` | 同上 | `DEFAULT_LARGE_TILE_WIDTH = 2` |

## 三、权威值速查（复刻对照的唯一依据）

### 3.1 模式语义（ShadeMode.kt 逐字）

- **Single**：「accordion」——QS 与通知**纵向堆叠**，上下滑展开/收起切换两部。scene container 下可用。
- **Split**：「side-by-side 且单面板联动开合」——**@Deprecated**，注释明示「scene container 启用时只有 Single 与 Dual」。
- **Dual**：QS 与通知各持**独立开合面板**；大屏分居两侧、小屏「sharing a space」（同一顶部空间，靠 0.75 手势分区呼起）。
- 解析链（ShadeModeInteractor.kt）：`DualShadeFlag` 开 → `Settings.Secure.DUAL_SHADE` 用户设置 → 无设置取 `config_dualShadeEnabledByDefault`。**A17 出厂默认 Dual = true**（`shade_config.xml`）。
- 其余默认值：`config_isFullWidthShade=true`（全宽布局：面板最宽 = `shade_panel_width`；浮层布局才用半屏上限 + TopEnd/TopStart 对齐）、`config_notificationShadeOnTopEnd=false`、`config_invocationGestureSplitRatio=0.75`。

### 3.2 网格形态（GridLayoutTypeRepository.kt + res/values/config.xml L62-68 + land/sw600dp-port 覆盖）

| 限定符 | 分页网格列 | 分页网格行 | QQS 行 | 无限网格列 |
| --- | --- | --- | --- | --- |
| 手机竖屏（values 默认） | 4 | **4** | 2 | 4 |
| 平板竖屏（sw600dp-port） | 4（列未覆盖，同基础） | 3 | 2 | 6 |
| 横屏（land） | 4（列未覆盖，同基础） | 2 | 1 | 8 |

- **Single 模式 = PaginatedGridLayoutType（分页网格）**；**Dual 模式 = InfiniteGridLayoutType（无限网格）**（GridLayoutTypeRepository.kt 逐字）。
- 大磁贴跨度 `DEFAULT_LARGE_TILE_WIDTH = 2`（LargeTileSpanRepository.kt）→ 手机竖屏 QQS = 2×2 大磁贴、展开页 = 4 列 × 4 行容量 16（大磁贴占 2 列）。

### 3.3 几何常量（shade_dimens.xml）

| 项 | 值 | 项 | 值 |
| --- | --- | --- | --- |
| 面板最大宽 `shade_panel_width` | 600dp | 面板圆角 | 46dp（sw600dp+desktop_sizing=36dp） |
| 磁贴高 `common_tile_default_tile_height` | 72dp | 激活圆角 | 24dp |
| 非激活圆角 | 50dp（pill） | 激活图标圆角 | 16dp |
| 磁贴图标 | 32dp（大磁贴 28dp） | toggle 目标 | 56dp |
| 亮度轨道高 | 40dp | 亮度 thumb | **4dp 宽 × 52dp 高竖柄** |
| 亮度圆角 | 24dp | 亮度图标 | 28dp |
| 工具栏高 | 48dp | 按钮/图标 | 48dp/24dp（彩底 36dp） |
| 面板内容 padding | 16dp × 16dp | 面板水平外边距 | 0dp（仅 compact <600dp） |

### 3.4 Single 阴影组合（ShadeScene.kt / SingleShadeNestedScrollLayout.kt）

- `statusBarHeader` = CollapsedShadeHeader（52dp 级单行）；`mediaAndQqsHeader` = **Media + QQS 可折叠头部**（手风琴上层）；下层 = 通知栈。
- 展开/收起 = 头部与通知栈的嵌套滚动（scrim offset 语义：静止态 QQS+Media 完全可见）。
- **媒体卡在 Single 模式属「Media+QQS 头部」域**——媒体控件单实例（MediaCarouselController reparent 语义），任何时刻只出现一处。

## 四、对本仓现树的裁决（采纳决策表）

| # | 现树形态 | 真源对照 | 裁决 |
| --- | --- | --- | --- |
| D1 | `QS_PAGE_ROWS = 2`（每页 8 贴） | 手机竖屏分页行数 = 4（每页 16 贴） | **修**：2→4，终值锚重锚（#259 P6） |
| D2 | 宽屏 ≥600px「QS 列 \| 通知列」双栏 grid | Split 形态 A17 已 @Deprecated；真机宽屏 = Single 全宽手风琴 / Dual 双浮板 | **退役**：宽屏回归 Single 全宽手风琴，QQS 不再隐藏（#259 P14 裁决落地） |
| D3 | QQS 2×2 大磁贴、gap 8、margin-top 16、磁贴 72dp/50-24 圆角、图标底座 56dp | 与真源一致 | **维持**（base 已对齐；sw600dp 覆盖带 desktop_sizing 门，非桌面不生效，现树注记正确） |
| D4 | Dual 双浮板（dual-shade.js） | OverlayShade 语义一致（分板独立开合、0.75 手势分区、46dp 圆角面） | **维持**；本轮不动其几何 |
| D5 | 媒体宿主 `classic + 宽 = qs 单源` | Single 模式媒体属 Media+QQS 头部域、单实例单呈现 | **修**：classic 全宽 → `both`（与窄屏场景轨同律） |
| D6 | 亮度条拇指形态 | 真源 = 4×52dp 竖柄 | 本轮不动（#34 域既有实现，另案复核） |

## 五、复现通道（下窗可循）

```bash
TOK=<PAT>; U=https://api.github.com/repos/LineageOS/android_frameworks_base/contents
curl -s -H "Authorization: Bearer $TOK" -H "Accept: application/vnd.github.raw" \
  "$U/packages/SystemUI/res/values/config.xml?ref=lineage-24.0"
```

分支核实：`/branches` 含 `lineage-24.0`；LOS 24.0 = Android 17 基线（LOS 官方 Changelog 32「Slick Seventeen」，2026-10-11）。
