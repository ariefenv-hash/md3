// ==================== volume-position.js — 音量面板定位与形态（#112 v10.69） ====================
//
// AOSP 真源锚点（docs/reference/frameworks-base/systemui/volume-dialog/VolumeDialogImpl.java
// 2858 行全文实拉入库，aosp-mirror/platform_frameworks_base main · 2026-11-06）：
//   - R.integer.volume_dialog_gravity = 21（SystemUI res/values/integers.xml 注释原文
//     "Value 21 corresponds to RIGHT|CENTER_VERTICAL"）→ mOriginalGravity 资源默认值
//   - initDialog L543-545：mWindowGravity = Gravity.getAbsoluteGravity(mOriginalGravity,
//     layoutDirection)；lp.gravity = mWindowGravity（窗口 gravity 单点真源）
//   - adjustPositionOnScreen() L419-429（javadoc 原文 "Adjust the dialog location on the
//     screen in order to avoid drawing on the hinge"）：
//       isPortrait  = mOrientation == Configuration.ORIENTATION_PORTRAIT
//       isHalfOpen  = mDevicePosture == DEVICE_POSTURE_HALF_OPENED
//       isTabletop  = isPortrait && isHalfOpen
//       gravity = isTabletop ? (mOriginalGravity | Gravity.TOP) : mOriginalGravity
//   - onStart L2569-2574：super.onStart() → adjustPositionOnScreen()（每次显示重算）
//   - onPostureChanged L2509-2512：dismiss(DISMISS_REASON_POSTURE_CHANGED)——姿态变更即收起
//   - isWindowGravityLeft L734-736：(mWindowGravity & LEFT)==LEFT → 滑入方向 L559/L1648：
//       mDialogView.setTranslationX((isWindowGravityLeft() ? -1 : 1) * width / 2.0f)
//
// 勘误（#112 议题原表述，源码实证在录）：isTabletop ≠ 平板/桌面态——实证为
//   「竖屏 + 折叠半开书本姿态」（DEVICE_POSTURE_HALF_OPENED），目的 = 避开折叠铰链。
//   平板横屏（1024×768 / 1280×800）无 TOP 叠加 → md3 平板态保持默认 gravity，
//   与 AOSP 行为一致；#112 建议 1 的「按视口判定 tabletop」不采纳，按源码落地。
//
// Web 映射（诚实标注）：
//   - isPortrait = 视口竖屏（接线层注入 innerHeight > innerWidth）
//   - isHalfOpen = navigator.devicePosture?.type === 'folded'（W3C Device Posture API
//     特性检测；API 缺席 ≡ AOSP mDevicePostureController == null 分支 L406-412——
//     callback 置 null 不监听姿态，gravity 恒 mOriginalGravity，语义严格同构）
//   - Gravity.getAbsoluteGravity：md3 无 RTL 布局面（#88 R96 裁决在录）→ LTR 下
//     absolute ≡ raw，恒等映射，诚实标注不扩范围
//   - 音量键侧偏好 = mOriginalGravity 的设备 overlay 等价（真机面板跟随音量键所在侧，
//     厂商经 volume_dialog_gravity overlay 决定；md3 无 overlay 通道 → 设置›系统导航页
//     提供左/右用户偏好，默认右 = 资源默认 21，可选附加配置不违反 AOSP 默认形态）
//
// 纯逻辑层：零 DOM 零 window（side/isPortrait/posture 以参数注入，vitest 伪造真跑）；
// DOM 接线、posture 事件监听与可见期收起见 volume-dialog.js。

/** android.view.Gravity 判定面所需常量：LEFT=3 / RIGHT=5 / CENTER_VERTICAL=16 / TOP=64 */
export const GRAVITY_LEFT = 3;
export const GRAVITY_RIGHT = 5;
export const GRAVITY_CENTER_VERTICAL = 16;
export const GRAVITY_TOP = 64;

/** R.integer.volume_dialog_gravity 默认值：21 = RIGHT|CENTER_VERTICAL（integers.xml 实证） */
export const VOLUME_DIALOG_GRAVITY_DEFAULT = 21;

/** 音量键侧合法值（非法输入归 'right'——资源默认 RIGHT，防脏 localStorage 卡死落位） */
export const VOLUME_SIDES = ['right', 'left'];

/** localStorage 持久化键（navbar-volume-keys VOLUME_KEYS_STORE_KEY 同族命名） */
export const VOLUME_SIDE_STORE_KEY = 'ios-desktop:volume-side';

/** 侧偏好归一化（navbar-volume-keys normalizeVolumeKeysMode 同律） */
export const normalizeVolumeSide = (v) => (VOLUME_SIDES.includes(v) ? v : 'right');

/** 侧偏好 → mOriginalGravity 等价整型：left = 19（LEFT|CENTER_VERTICAL）/ right = 21（默认） */
export const sideToGravity = (side) =>
  (normalizeVolumeSide(side) === 'left' ? GRAVITY_LEFT : GRAVITY_RIGHT) + GRAVITY_CENTER_VERTICAL;

/** isTabletop 判定（L421-423 同构）：竖屏 + 折叠半开（posture 'folded'）双条件同时成立。
 *  posture 由接线层注入 navigator.devicePosture?.type；API 缺席传 '' 恒非 tabletop
 *  （≡ AOSP null controller 分支，重力恒原值）。 */
export const isTabletopPosture = ({ isPortrait = false, posture = '' } = {}) =>
  !!isPortrait && posture === 'folded';

/** 面板 gravity 解析（adjustPositionOnScreen L425 同构）：
 *  tabletop → mOriginalGravity | Gravity.TOP（靠上避铰链）；否则原 gravity（垂直居中）。 */
export const resolveVolumeGravity = ({ side = 'right', isPortrait = false, posture = '' } = {}) => {
  const g = sideToGravity(side);
  return isTabletopPosture({ isPortrait, posture }) ? (g | GRAVITY_TOP) : g;
};

/** 面板落位决策表（消费面单源，DOM 层只读不再各自判定）：
 *  gravity             — 解析后整型（等价 lp.gravity）
 *  isTabletop          — tabletop 判定快照
 *  sideClass           — 容器侧类：'vd-side-left'（左）| ''（右 = 资源默认无类）
 *  topClass            — tabletop 变体类：'vd-tabletop-top' | ''
 *  isWindowGravityLeft — L734 判定（左侧真，决定滑入方向符号）
 *  enterTranslateX     — L559/L1648 同构符号：left -1 / right +1（CSS --vd-enter-tx
 *                        承载，16px = 60px 容器半宽 30px 的入场偏移量级——AOSP 用
 *                        实测宽/2，md3 CSS 定长等价，量级对齐非逐值） */
export const resolveVolumePanelPlacement = ({ side = 'right', isPortrait = false, posture = '' } = {}) => {
  const s = normalizeVolumeSide(side);
  const tabletop = isTabletopPosture({ isPortrait, posture });
  return {
    gravity: tabletop ? (sideToGravity(s) | GRAVITY_TOP) : sideToGravity(s),
    isTabletop: tabletop,
    sideClass: s === 'left' ? 'vd-side-left' : '',
    topClass: tabletop ? 'vd-tabletop-top' : '',
    isWindowGravityLeft: s === 'left',
    enterTranslateX: s === 'left' ? -1 : 1,
  };
};
