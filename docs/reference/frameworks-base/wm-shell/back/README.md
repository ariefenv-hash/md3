# wm.shell.back — WM Shell 侧预测性返回（#191 差异 2/3 + P2 沉淀）

aosp-mirror/platform_frameworks_base @ main 实拉快照（2026-11-01，R47 轮，Contents API 逐字节落盘）。
SystemUI 侧（pill / EdgePanel / BackPanelController）快照在 `docs/reference/frameworks-base/SystemUI/animation/back/`（v8.21 起六件），本目录补齐 Shell 侧另一半。

## 文件清单

| 文件 | 行数 | 说明 |
|---|---|---|
| `BackAnimationConstants.java` | 24 | 唯一常量 `UPDATE_SYSUI_FLAGS_THRESHOLD = 0.20f`（L23） |
| `ProgressVelocityTracker.kt` | 49 | 进度速度采样：move 的进度值当 x 喂 VelocityTracker，输出 **progress/s** |
| `BackAnimationBackground.java` | 166 | 背景垫层（LAYER=-1）+ 状态栏外观联动（亮度/top 双门 + 边缘触发） |
| `CrossActivityBackAnimation.kt` | 625 | 跨 Activity 返回主实现（ProgressVelocityTracker 消费方） |
| `DefaultCrossActivityBackAnimation.kt` | 113 | 默认实现（post-commit EMPHASIZED + FLING_BOUNCE） |

## BackAnimationController.java（81K，未整存，关键结论在册）

### 状态机（grep 实证）

- 控制器本体 **不引用** ProgressVelocityTracker / FLING 速度判定（`rg "ProgressVelocityTracker|calculateVelocity|FLING"` 零命中）——速度采样与 fling 消费全部在 **CrossActivityBackAnimation.kt**（L126 tracker 实例、L543 commit 消费）。#191 差异 1 的「真正决定松手提交的一层」表述按实际源码修正为：**commit/cancel 分派在 SystemUI 侧（BackPanelController/控制器），progress/s 速度消费在 Shell 侧 CrossActivityBackAnimation**。
- 目录全清单 17 文件（含 BackAnimation.java 5.4K / BackAnimationRunner.java / ShellBackAnimationRegistry.java / StatusBarCustomizer.java 等，体积见 #191 证据清单）。

### CrossActivityBackAnimation 关键行号锚（本轮实拉标注）

| 行 | 内容 |
|---|---|
| L125-126 | `gestureProgress` / `velocityTracker = ProgressVelocityTracker()` |
| L167-173 | `getBackgroundColor()`：customized → letterbox → **enteringTarget.taskDescription.backgroundColor** → 0 |
| L207-216 | `ensureBackground(..., statusbarHeight, crop(浮动任务), cornerRadius)` 于 startAnimation（pre-commit 交互期层已在） |
| L234 | `gestureProgress = progress`（onGestureProgress 每帧） |
| L247 | `background.customizeStatusBarAppearance(currentClosingRect.top)` 每帧调用 |
| L251 | `velocityTracker.addPosition(backEvent.frameTimeMillis, progress)` —— 喂 **gestureInterpolator 插值后**进度 |
| L285-299 | commit 弹簧：`startVelocity = velocity·SPRING_SCALE(100)·(1−MAX_SCALE(0.9))·velocityFactor(横边=2)`；`gestureProgress<0.1` 兜底 DEFAULT_FLING_VELOCITY；钳 `[0, MAX_FLING_VELOCITY]` |
| L305 | post-commit：`if (progress > 1 - UPDATE_SYSUI_FLAGS_THRESHOLD)` → 末 20% 刷新 sysui flags |
| L543 | `onGestureCommitted(velocityTracker.calculateVelocity())`（onBackInvoked） |
| L356-359 | finishAnimation 复位：lastPostCommitFlingScale / gestureProgress=0 / **velocityTracker.resetTracking()** |
| L578-600 | 常量：`MAX_SCALE=0.9f`、`SPRING_SCALE=100f`、`MAX_FLING_VELOCITY=1000f`、`DEFAULT_FLING_VELOCITY=120f`（spring 单位=progress×100）、FlingMode 三枚举（NO_FLING/FLING_SHRINK/FLING_BOUNCE） |

## md3 Web 映射（v9.22，js/aosp/back-animation.js + js/back-pill.js + js/gestures.js）

- 差异 1（P0）：pill 内建 `ProgressVelocityTracker`（100ms 滑窗，#191 建议口径），ACTIVE 段喂 raw fullScreenProgress；根页面松手速度通道 400px/s → `400/(412−16) ≈ 1.01 progress/s`（412dp 阈值屏宽处严格等值，窄视口不再漂移）。
- 差异 2：`UPDATE_SYSUI_FLAGS_THRESHOLD=0.2` 导出并消费于 pre-commit 状态栏外观进度门（议题建议口径；AOSP main 消费位 L305 为 post-commit，映射关系诚实标注）。
- 差异 3：`BackAnimationBackground` 类逐字移植（亮度<0.5 一次性判定 / top>半高边缘触发 / crop 圆角）；层级映射 z-index 0（偏差①）、层可见性延迟到 commit（偏差②）、无 blur（偏差③）——详见 back-animation.js 头部「Web 映射偏差」三条。
