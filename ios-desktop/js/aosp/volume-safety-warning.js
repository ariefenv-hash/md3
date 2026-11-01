// ==================== aosp/volume-safety-warning.js — 安全音量警告状态机（#193 缺口一） ====================
//
// 权威源（aosp-mirror/platform_frameworks_base @ main 实拉；快照 docs/reference/frameworks-base/
// systemui/volume-dialog/ 五件 —— 触发端 SoundDoseHelper + SystemUI 承接端 Interactor/Model）：
//   - SoundDoseHelper.java（1378 行快照；安全音量逻辑 2024 自 AudioService 重构入此）：
//       L113-114  SAFE_MEDIA_VOLUME_INACTIVE = 2 /* confirmed */
//                 SAFE_MEDIA_VOLUME_ACTIVE   = 3 /* unconfirmed */
//       L666-671  checkSafeMediaVolume_l：ACTIVE 态 && alias==STREAM_MUSIC && 安全设备 &&
//                 index > safeMediaVolumeIndex(device)
//       L672-686  willDisplayWarningAfterCheckVolume：越线 → postDisplaySafeVolumeWarning(flags)
//                 + mPendingVolumeCommand = StreamVolumeCommand(...) 暂存 + return true
//                 （L168-172 注释实锤：新请求音量暂存 pending，仅当 disableSafeMediaVolume()
//                 被调用时才放行）
//       L682-705  disableSafeMediaVolume：状态转 INACTIVE（confirmed）→ 放行 pending → 清空
//       L796-801  invalidatePendingVolumeCommand：仅清 pending，音量保持原值（从未落值）
//   - AudioService.java（blob 实拉，行号锚入快照 README）：
//       L3916     adjustStreamVolume 入口先 invalidatePendingVolumeCommand()
//       L3985-4003 ADJUST_RAISE 越线时 raiseVolumeDisplaySafeMediaVolume(...) 为真 → else-if 链
//                 短路，adjustIndex 不执行 → 音量保持 oldIndex（L4002 Log「safe volume index =
//                 oldIndex」实锤：不预落值、不 clamp 到安全线，保持原值）
//       L5145-5152 set 路径同判：onSetStreamVolume 不执行，index 回读原值
//   - VolumeDialogSafetyWarningInteractor.kt（55 行快照）：
//       L32       VISIBLE_FLAGS = AudioManager.FLAG_SHOW_UI or FLAG_SHOW_UI_WARNINGS
//       L30-45    isShowingSafetyWarning：Visible 且 flags&VISIBLE_FLAGS==0（不含 SHOW_UI）→
//                 须对话框可见才显示（降级）；含 flags → 恒显；Invisible → false
//       L47-49    onSafetyWarningDismissed() → setSafetyWarning(Invisible)
//   - VolumeDialogSafetyWarningModel.kt（27 行快照）：sealed interface
//     Visible(val flags: Int) / data object Invisible
//   - AudioManager.java L535/L614（blob 实拉核验常量真值）：
//       FLAG_SHOW_UI = 1 << 0；FLAG_SHOW_UI_WARNINGS = 1 << 10（javadoc「only dialog warnings
//       and confirmations, no sliders」）
//
// md3 网页映射决策（快照 README 表格全量标注，此处仅要点）：
//   - SAFE_VOLUME_INDEX = 60：#193 建议口径（AOSP 为 config_safe_media_volume_index 设备相关
//     属性值；STREAM_MUSIC 15 级制 ≈ 9/15 = 60%）
//   - 确认记忆 sessionStorage 会话级（#193 口径，比 AOSP 持久化保守：刷新即恢复警告）
//   - 越线音量保持原值不预落（源码实证修正 #193「停在 60%」建议口径，总纲以源码为准）
//
// 纯逻辑模块：零 DOM、零 mediaService 依赖；UI 接线在 js/volume-dialog.js。

/** AudioManager.java L535: public static final int FLAG_SHOW_UI = 1 << 0; */
export const FLAG_SHOW_UI = 1 << 0;
/** AudioManager.java L614: public static final int FLAG_SHOW_UI_WARNINGS = 1 << 10; */
export const FLAG_SHOW_UI_WARNINGS = 1 << 10;
/** VolumeDialogSafetyWarningInteractor.kt L32:
    private const val VISIBLE_FLAGS = AudioManager.FLAG_SHOW_UI or AudioManager.FLAG_SHOW_UI_WARNINGS */
export const VISIBLE_FLAGS = FLAG_SHOW_UI | FLAG_SHOW_UI_WARNINGS;

/** SoundDoseHelper.java L113: SAFE_MEDIA_VOLUME_INACTIVE = 2  // confirmed */
export const SAFE_MEDIA_VOLUME_INACTIVE = 2;
/** SoundDoseHelper.java L114: SAFE_MEDIA_VOLUME_ACTIVE = 3  // unconfirmed */
export const SAFE_MEDIA_VOLUME_ACTIVE = 3;

/** #193 建议口径：安全线 60%（AOSP 为 config_safe_media_volume_index 属性，设备相关；
    STREAM_MUSIC 15 级制 ≈ 9/15）。 */
export const SAFE_VOLUME_INDEX = 60;

/** VolumeDialogSafetyWarningModel.kt: sealed interface 同构。
    data class Visible(val flags: Int) → { kind: 'Visible', flags }
    data object Invisible            → { kind: 'Invisible' } */
export const safetyWarningInvisible = () => ({ kind: 'Invisible' });
export const safetyWarningVisible = (flags) => ({ kind: 'Visible', flags });

/** VolumeDialogSafetyWarningInteractor.kt L30-45 isShowingSafetyWarning 逐字同构
    （Flow map → 纯函数；dialogVisibility.first() is Visible → dialogVisible 参数）：
    - Visible 且 (flags & VISIBLE_FLAGS) === 0：警告仅在对话框可见时显示（降级语义）
    - Visible 且含 flags：恒真（警告独立于对话框显示）
    - Invisible：false */
export function isShowingSafetyWarning(model, dialogVisible) {
  if (model.kind === 'Invisible') return false;
  if ((model.flags & VISIBLE_FLAGS) === 0) return !!dialogVisible;
  return true;
}

/** SoundDoseHelper L110-172 + L657-801 状态机同构（synchronized 锁语义简化为单线程 JS，
    mSafeMediaVolumeState / mSafeMediaVolumeIndex / mPendingVolumeCommand 三状态成员逐字
    同名同构）。 */
export class SafeVolumeState {
  constructor(safeIndex = SAFE_VOLUME_INDEX) {
    /** mSafeMediaVolumeState（L116）：unconfirmed 起步 */
    this.safeMediaVolumeState = SAFE_MEDIA_VOLUME_ACTIVE;
    /** mSafeMediaVolumeIndex（L174 注释：cached value of config_safe_media_volume_index） */
    this.safeMediaVolumeIndex = safeIndex;
    /** L172 mPendingVolumeCommand：越线请求暂存（{ index, flags } | null） */
    this.pendingVolumeCommand = null;
  }

  /** SoundDoseHelper L666-671 checkSafeMediaVolume_l 同构：
      ACTIVE 态 && index > safeMediaVolumeIndex（alias==STREAM_MUSIC && 安全设备在 md3 单流
      单设备语境下恒成立，诚实标注为语境恒真） */
  checkSafeMediaVolume(index) {
    return this.safeMediaVolumeState === SAFE_MEDIA_VOLUME_ACTIVE
      && index > this.safeMediaVolumeIndex;
  }

  /** SoundDoseHelper L672-686 willDisplayWarningAfterCheckVolume 同构：
      越线 → 暂存 pendingVolumeCommand（**不落值**，返回 true 由调用方短路 adjustIndex）；
      未越线 → return false（调用方正常落值）。 */
  willDisplayWarningAfterCheckVolume(index, flags) {
    if (!this.checkSafeMediaVolume(index)) return false;
    this.pendingVolumeCommand = { index, flags };
    return true;
  }

  /** SoundDoseHelper L783-792 raiseVolumeDisplaySafeMediaVolume 同构（adjust 路径：
      check → postDisplaySafeVolumeWarning 由调用方执行，此处只负责判据+暂存） */
  raiseVolumeDisplaySafeMediaVolume(index, flags) {
    return this.willDisplayWarningAfterCheckVolume(index, flags);
  }

  /** SoundDoseHelper L682-705 disableSafeMediaVolume 同构：
      状态转 INACTIVE（confirmed，持久化语义由调用方经 sessionStorage 承接）→
      返回并清空 pending（调用方放行 onSetStreamVolume 同义）。 */
  disableSafeMediaVolume() {
    this.safeMediaVolumeState = SAFE_MEDIA_VOLUME_INACTIVE;
    const cmd = this.pendingVolumeCommand;
    this.pendingVolumeCommand = null;
    return cmd;
  }

  /** SoundDoseHelper L796-801 invalidatePendingVolumeCommand 同构：仅清 pending，
      音量保持原值（从未落值）。 */
  invalidatePendingVolumeCommand() {
    this.pendingVolumeCommand = null;
  }
}
