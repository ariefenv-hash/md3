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

## 使用规则（对齐仓库铁律）
1. **只读参考**：本目录代码一律不直接编译进项目；一切以源码考证为准（铁律 1），这些快照就是「考证原料」
2. **勿手改**：需要标注时在议题评论里引用行号，保持与上游 diff 可对齐
3. **补充协议**：新议题需要新参考文件时，由材料会话按同样方式拉取追加（commit 前缀 `reference:`），主会话可随时在议题里 @ 材料会话要料
4. 上游对应：如需查未入库文件，去 https://github.com/LineageOS/android_packages_apps_Launcher3/tree/lineage-24.0 或 jsDelivr 直链 `https://cdn.jsdelivr.net/gh/LineageOS/android_packages_apps_Launcher3@lineage-24.0/<路径>`

## 体积纪律
当前 1.6MB（59+5 文件）。新增加入前先评估：单文件 >200KB 谨慎、二进制资源不入库（音效/字体走议题内 jsDelivr 直链，由执行议题时拉取）。
