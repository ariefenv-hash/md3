# 源码参考库（docs/reference/）

> 用途：把议题里反复引用的 AOSP 系源码**固化进仓库**，主会话执行议题时零外站依赖、零镜像可达性风险，且考证基准不会因上游 main 分支移动而漂移。
> 拉取日期：2026-10-25 · 由并行材料会话批量拉取入库

## 目录结构

### launcher3/ —— AOSP Launcher3（Android 17 基线）
**来源**：`LineageOS/android_packages_apps_Launcher3` @ `lineage-24.0` 分支（aosp-mirror 的 launcher 镜像 2017 年停更，勿用）
**许可**：Apache-2.0（AOSP 同源）

| 子目录/文件 | 服务议题 | 说明 |
|---|---|---|
| `PagedView.java` | #41 #53 #66 | 分页滚动核心（滑动曲线/阈值/页面跟手） |
| `Workspace.java` + `WorkspaceLayoutManager.java` | #41 #53 | 桌面页管理与布局 |
| `CellLayout.java` | 网格布局 | 图标网格定位 |
| `BubbleTextView.java` | 图标本体 | 应用图标渲染基类 |
| `Hotseat.java` | dock 栏 | |
| `DeviceProfile.java` + `InvariantDeviceProfile.java` | 响应式 | 设备形态/网格规格权威 |
| `Launcher.java` `LauncherState.java` | 状态机 | 主类与状态定义 |
| `InterruptibleInOutAnimator.java` | **#39** | 可中断动画器（磁贴丢动画的直接参考） |
| `dragndrop/`（8 件） | **#41** | DragController/DragLayer/DragDriver/DragView/DragOptions/DraggableView/FlingToDeleteHelper/SpringLoadedDragController |
| `statemanager/`（4 件） | 状态机参考 | StateManager 状态机权威实现 |
| `touch/`（7 件） | #42 #53 | 手势检测（SwipeDetector 家族/长按/点击） |
| `allapps/`（10 件） | **#66** | 应用抽屉全集（容器/快速滚动/过渡/字母索引） |
| `popup/`（8 件） | **#39** | 长按弹窗（ArrowPopup/容器/数据源/圆角箭头绘制） |
| `folder/`（7 件） | 文件夹 | Folder/FolderIcon/动画管理器/预览渲染 |
| `quickstep/RecentsView.java` | **#68** | 最近任务主视图（A17 版） |

### systemui-docs/ —— SystemUI 官方架构文档
**来源**：`aosp-mirror/platform_frameworks_base` @ `main`，路径 `packages/SystemUI/docs/device-entry/`
**服务议题**：#19（解锁波纹）、#20（锁屏表盘）、#35（AOD/doze）、#53（返回层级）

| 文件 | 内容 |
|---|---|
| `keyguard.md` | 锁屏总览：认证路径/Bouncer/AOD/电源键旅程 |
| `bouncer.md` | 解锁凭证流程（PIN/图案） |
| `doze.md` | 息屏与 AOD 唤醒路径 |
| `glossary.md` | SystemUI 术语表 |
| `quickaffordance.md` | 锁屏快捷操作（设备未解锁可用） |

### frameworks-base/ —— SystemUI 动画系源码（2026-11-01 追加，深水移植批）
**来源**：`aosp-mirror/platform_frameworks_base` @ `main`，30 文件 / 460KB
**触发**：#145/#146/#147 深水移植三连（用户「既然能抄 kt，为什么不弄得更彻底」）

| 子目录 | 文件 | 服务议题 |
|---|---|---|
| `SystemUI/animation/`（20 件） | **FontInterpolator.kt**（wght/ital 双轴，锁屏时钟字重过渡）+ FontVariationUtils/TextAnimator/TextInterpolator 配套 | **#145** |
| | **ShadeInterpolation.kt**（39 行纯函数，constrainedMap 映射） | **#144** |
| | TransitionAnimator/ActivityTransitionAnimator/DialogTransitionAnimator + controller 家族 + Expandable/ViewHierarchyAnimator/ViewRootSync | #146（容器变换底层）/#147 待探测批 |
| `SystemUI/animation/back/`（6 件） | BackAnimationSpec/BackAnimationSpecForSysUi/**BackTransformation**/BottomsheetBackAnimationSpec/FlingOnBackAnimationCallback/OnBackAnimationCallbackExtension | **#146**（预测性返回容器变换，pill 之外的另一半） |
| `SystemUI/statusbar/notification/stack/`（4 件） | NotificationRoundnessManager/NotificationStackSizeCalculator/AnimationFilter/AnimationProperties | #147 下一轮探测（通知圆角/尺寸/动画属性批处理） |

**抽验记录**：FontInterpolator.kt 常量与 #145 议题引证逐字一致；ShadeInterpolation.kt 39 行/3 处 constrainedMap 与 #147 表格精确吻合；BackTransformation.kt 为 2023 年新文件（A17 时代容器变换）。

### permission/ —— 权限授权系源码（2026-11-02 追加，R54 窗）
**来源**：`LineageOS/android_packages_modules_Permission` @ `lineage-22.2`（AOSP `platform/packages/modules/Permission` 同名路径可达镜像；aosp-mirror 无此模块镜像、`platform/packages/modules/PermissionController` 空壳仓勿走错——#195 议题排雷在案）
**服务议题**：**#195**（十六态按钮矩阵/组归并/one-time 生命周期/AutoRevoke/照片部分授权二期）

| 文件 | 行数 | 关键锚 |
|---|---|---|
| `GrantPermissionsActivity.java` | 1293 | L127-143 十六态按钮矩阵（ALLOW=0…NEXT=15）+ L161 MAX_DIALOGS_PER_PKG_TASK=10 + PERMISSION_TO_BIT_SHIFT |
| `GrantPermissionsViewModel.kt` | 1500 | addRequiredGroupStates L487-527 组归并（GroupState 逐组入队） |
| `GrantPermissionsViewHandler.java` | 136 | L38-50 @Result 常量（GRANTED_ONE_TIME=4 等） |
| `AutoRevokePermissions.kt` | 296 | L65 revokeAppPermissions（逐 revocable group 回收） |
| `AutoRevokePermissions.proto` | 51 | PackageProto.last_time_visible=4（闲置判定时钟字段） |
| `AutoRevokedPackagesLiveData.kt` | 167 | 回收数据观测层 |

**抽验记录**：十六态常量值与 #195 议题正文逐字一致；AutoRevoke 296 行与 #195 R49 评论逐行补完帖吻合。

### privacy/ —— SystemUI 隐私使用指示器（2026-11-02 追加，R54 窗加餐）
**来源**：`aosp-mirror/platform_frameworks_base` @ `main`
**服务议题**：**#195**（差距清单第 4 点：状态栏 mic/cam/location 使用中指示）

| 文件 | 行数 | 关键锚 |
|---|---|---|
| `PrivacyItem.kt` | 70 | PrivacyType 枚举（camera/microphone/location/media_projection）+ PrivacyItem data class{privacyType,application,timeStampElapsed,paused} |
| `PrivacyChipBuilder.kt` | 51 | generateIcons：types distinct sorted（chip 图标组） |
| `AppOpsPrivacyItemMonitor.kt` | 255 | AppOps 稼动事件流（权威「使用中」信号源；md3 用 one-time 会话期映射，诚实标注） |

**勘误**：PrivacyType.kt 独立文件不存在（404）——枚举内嵌于 PrivacyItem.kt。

## 使用规则（对齐仓库铁律）
1. **只读参考**：本目录代码一律不直接编译进项目；一切以源码考证为准（铁律 1），这些快照就是「考证原料」
2. **勿手改**：需要标注时在议题评论里引用行号，保持与上游 diff 可对齐
3. **补充协议**：新议题需要新参考文件时，由材料会话按同样方式拉取追加（commit 前缀 `reference:`），主会话可随时在议题里 @ 材料会话要料
4. 上游对应：如需查未入库文件，去 https://github.com/LineageOS/android_packages_apps_Launcher3/tree/lineage-24.0 或 jsDelivr 直链 `https://cdn.jsdelivr.net/gh/LineageOS/android_packages_apps_Launcher3@lineage-24.0/<路径>`

## 体积纪律
当前 ~2.1MB（94 源文件 + 5 文档 + 索引：launcher3 59 / frameworks-base 30 / systemui-docs 5）。新增加入前先评估：单文件 >200KB 谨慎、二进制资源不入库（音效/字体走议题内 jsDelivr 直链，由执行议题时拉取）。
