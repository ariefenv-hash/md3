# SystemUI pinning 快照 — #98 屏幕固定权威供料

AOSP main `packages/SystemUI/`（aosp-mirror/platform_frameworks_base，blob/contents API 实拉 2026-11-04，R76 窗）屏幕固定双文件快照 + 文案真源，`#98` 权威供料。

| 文件 | 行数 | 锚点 |
| --- | --- | --- |
| `ScreenPinningNotify.java` | 77 | `SHOW_TOAST_MINIMUM_INTERVAL = 1000`（L33）；`showPinningStartToast/showPinningExitToast` 直通；`showEscapeToast(isGestureNavEnabled, isRecentsButtonVisible)` 三变体 + 1s 节流（L54-69） |
| `ScreenPinningRequest.java` | 429 | `showPrompt(taskId, allowCancel)`（L139-156）；`onClick` ok → `ActivityTaskManager.startSystemLockTaskMode(taskId)` → `clearPrompt`（L188-193）；`RequestWindowView` 全屏背景点击 = 确认（L215 setOnClickListener）；`OFFSET_DP = 96` 上移 300ms DecelerateInterpolator + 背景 1000ms 渐入（L206/L230-256）；描述五变体分派（L307-323）；三 bullets（L334-346）；面板 `TYPE_NAVIGATION_BAR_PANEL`（L174） |

## 文案真源（packages/SystemUI/res/values/strings.xml @ main，screen_pinning_* 15 条）

英文原文逐字（md3 中文映射见 `ios-desktop/js/aosp/screen-pinning.js` `PINNING_STRINGS`，键名同名）：

- `screen_pinning_title` = App is pinned
- `screen_pinning_description` = This keeps it in view until you unpin. Touch & hold Back and Overview to unpin.
- `screen_pinning_description_recents_invisible` = … Touch & hold Back and Home to unpin.
- `screen_pinning_description_gestural` = … Swipe up & hold to unpin.
- `screen_pinning_description_accessible` = … Touch & hold Overview to unpin.
- `screen_pinning_description_recents_invisible_accessible` = … Touch & hold Home to unpin.
- `screen_pinning_exposes_personal_data` = Personal data may be accessible (such as contacts and email content).
- `screen_pinning_can_open_other_apps` = Pinned app may open other apps.
- `screen_pinning_toast` / `_recents_invisible` / `_gesture_nav` = To unpin this app, touch & hold Back and Overview buttons / … Back and Home buttons / swipe up & hold
- `screen_pinning_positive` = Got it / `screen_pinning_negative` = No thanks
- `screen_pinning_start` = App pinned / `screen_pinning_exit` = App unpinned

## md3 落地裁决（详见 ios-desktop/js/aosp/screen-pinning.js 头注）

1. md3 融合导航（三键浮条 + 全局手势共存）pinned 态手势引擎整体冻结，退出收敛为长按返回键单通道（400ms = `ViewConfiguration.getLongPressTimeout()` 框架默认值映射）；escape toast 恒用 `screen_pinning_toast` 变体。
2. 凭据门控（AOSP `LOCK_TO_APP_EXIT_LOCKED` + 锁屏凭据）：`verifyCredential` 通道在状态机全量实现，md3 锁屏无凭据实体故设置面不建（不空转）。
3. system server 侧 `stopLockTaskMode` token 校验 / DeviceOwner lock task 白名单（LockTaskController）为多用户/受管语义，md3 单用户网页语境无对应物，不空转移植。
