# docs/reference/frameworks-base/systemui/volume-dialog

AOSP main `packages/SystemUI/src/com/android/systemui/volume/dialog/`（Android 15 起新版音量对话框模块）安全警告 + 滑条域快照，`#193` 权威供料。经 `aosp-mirror/platform_frameworks_base` main 分支 blob 实拉（2026-11-02）。

## 文件清单

| 文件 | 行数 | 作用 |
|---|---|---|
| `domain/interactor/VolumeDialogSafetyWarningInteractor.kt` | 55 | 安全警告显示判定（VISIBLE_FLAGS + 对话框可见降级 + onSafetyWarningDismissed） |
| `shared/model/VolumeDialogSafetyWarningModel.kt` | 27 | `Visible(flags)` / `Invisible` 双态模型（sealed interface） |
| `sliders/domain/interactor/VolumeDialogSlidersInteractor.kt` | 147 | 主滑条+浮动滑条模型、shouldShowSliders 判据、StreamsSorter 八级优先谓词（#193 缺口二期供料） |
| `sliders/ui/viewmodel/VolumeDialogSlidersViewModel.kt` | 57 | `VolumeDialogSliderUiModel(sliderComponent, floatingSliderComponent)`（二期供料） |
| `SoundDoseHelper.java` | 1378 | 触发端状态机全量快照：`services/core/java/com/android/server/audio/SoundDoseHelper.java`（安全音量逻辑 2024 自 AudioService 重构入此） |

## 触发→放行→丢弃 权威链（行号锚）

1. **越线判据** `checkSafeMediaVolume_l`（SoundDoseHelper L666-671）：
   `mSafeMediaVolumeState == SAFE_MEDIA_VOLUME_ACTIVE && alias==STREAM_MUSIC && safeDevicesContains(device) && index > safeMediaVolumeIndex(device)`。
   状态常量 L113-114：`SAFE_MEDIA_VOLUME_INACTIVE = 2 /* confirmed */`、`SAFE_MEDIA_VOLUME_ACTIVE = 3 /* unconfirmed */`。
2. **警告显示 + pending 暂存** `willDisplayWarningAfterCheckVolume`（L672-686）：越线 →
   `mVolumeController.postDisplaySafeVolumeWarning(flags)` + `mPendingVolumeCommand = StreamVolumeCommand(...)` + `return true`。
   L168-172 注释实锤：「the new requested volume, stream type and device are stored in mPendingVolumeCommand and used later when/if disableSafeMediaVolume() is called」。
3. **音量不预落（保持原值）**：
   - adjust 路径 AudioService L3985-4003：`(direction == ADJUST_RAISE) && mSoundDoseHelper.raiseVolumeDisplaySafeMediaVolume(...)` 为真时 else-if 链短路，`streamState.adjustIndex(...)` **不执行**，音量保持 `oldIndex`（L4002 Log 实锤 `safe volume index = oldIndex`）；
   - set 路径 AudioService L5145-5152：`willDisplayWarningAfterCheckVolume` 为真时 `onSetStreamVolume` 不执行，`index = getVssForStreamOrDefault(...).getIndex(device)` 回读原值。
   - 每次 adjust 入口先 `invalidatePendingVolumeCommand()`（AudioService L3916）。
4. **确认放行** `disableSafeMediaVolume`（L682-705）：`setSafeMediaVolumeEnabled(false)`（状态转 INACTIVE=confirmed，`MSG_PERSIST_SAFE_VOLUME_STATE` 持久化 Settings.Global.AUDIO_SAFE_VOLUME_STATE L1049/L1174）→
   若 `mPendingVolumeCommand != null` 则 `mAudioService.onSetStreamVolume(pending...)` 放行 → `mPendingVolumeCommand = null`。
5. **取消丢弃** `invalidatePendingVolumeCommand`（L796-801）：仅清 pending，音量保持原值（从未落值，无需回落）。
6. **SystemUI 显示判定** Interactor L30-45：`Visible` 且 `flags and VISIBLE_FLAGS == 0` → 须 `dialogVisibility.first() is Visible` 才显示（降级：警告仅在对话框可见时显示）；含 flags → 恒显；`Invisible → false`。
   `VISIBLE_FLAGS = AudioManager.FLAG_SHOW_UI or FLAG_SHOW_UI_WARNINGS`（Interactor L32）。
7. **flag 常量真值** `media/java/android/media/AudioManager.java` main 分支：`FLAG_SHOW_UI = 1 << 0`（L535）、`FLAG_SHOW_UI_WARNINGS = 1 << 10`（L614，javadoc「only dialog warnings and confirmations, no sliders」）。

## md3 网页映射决策（诚实标注）

| AOSP | md3 | 标注 |
|---|---|---|
| `safeMediaVolumeIndex(device)` = `config_safe_media_volume_index` 属性（设备相关） | `SAFE_VOLUME_INDEX = 60`（STREAM_MUSIC 15 级制 ≈ 9/15） | #193 建议口径；非 AOSP 数值直译 |
| 确认后 confirmed 状态持久化（Settings.Global）跨重启 | `sessionStorage` 会话记忆，重载重置 | #193 建议口径；比 AOSP 保守（刷新即恢复警告），避免网页端「永久关闭」听力保护 |
| 音量保持原值（不预落、不 clamp 到安全线） | 同构：`applyVolume` 不执行，滑条停在越线前值 | **修正 #193 建议口径**（「警告可见时音量停在 60% 不预落值」）——源码实证是保持原值，非 clamp 至 60；按 c828dcf 总纲以源码为准 |
| `disableSafeMediaVolume()`（确认+持久关闭警告） | `confirmSafety()`：确认本会话内不再拦截 + 放行 pending | 确认动作语义同源，作用域差异见表上行 2 |
| `invalidatePendingVolumeCommand()` | `dismissSafety()`（onSafetyWarningDismissed 同义） | 取消丢弃 pending，音量保持原值 |
| flags 由调用方传入（音量键 = FLAG_SHOW_UI\|FLAG_SHOW_UI_WARNINGS） | 音量键/拖拽两入口均传 `FLAG_SHOW_UI \| FLAG_SHOW_UI_WARNINGS` | md3 两入口均为显式 UI 交互；flags 不含 SHOW_UI 的降级分支在模块纯函数中保真保留（Interactor L33-36 同构） |
| SafetyWarningDialog 由用户操作关闭（无自动超时） | 警告层无自动超时；对话框 MAX_DIALOG_SHOW_TIME(3s) 在警告可见期间冻结，关闭后恢复 | 冻结决策诚实标注：否则 3s 收起后警告层悬空，违背 Interactor 降级语义 |
