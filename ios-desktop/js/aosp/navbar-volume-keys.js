// ==================== navbar-volume-keys.js — 导航栏附加音量键显隐判定（#107 v9.91） ====================
// 超越项锚（铁律#2「源码有提升空间要超越」）：AOSP 三键导航栏无音量键（ic_sysbar_back /
// ic_sysbar_home / ic_sysbar_recent 三键固定，#88 考证在案）；真机音量由物理键经
// PhoneWindowManager 系统层接管（#115 考证：移动端网页不可捕获硬件音量键）——触屏设备
// 必须有屏幕上的音量键等价物，否则音量功能在手机上实际不可达。
// 先例实证：AccessibilityButtonController（AOSP 导航栏允许附加非三键元素）+
// LineageOS navbar 附加键惯例（音量键为常见选项，#107 议题在录）。
// 用户裁决（#18 §7.2b）：可选附加键默认关闭，移动端默认可见。
// 与 #88 划界：不扩三键几何——附加键置于栏尾成组（size 降级视觉次级），主键位图标集
// 对齐路线不受影响；图标语言随现行用户线稿 stroke 规范（round cap/join · 48 网格 · 5.2）。
// 按压语义：直调 volume-dialog stepVolumeBySteps(±1)——#109 目标流判定（媒体活跃调媒体流/
// 静默调铃声流）+ #108 非模态面板 + 3s 自动收起全量复用，零新逻辑。

/** localStorage 持久化键（nav-bar.js ENABLE_KEY/POS_KEY 同族命名）：
 *  值 'default'（缺省）| 'on' | 'off' */
export const VOLUME_KEYS_STORE_KEY = 'ios-desktop:navbar-volume-keys';

/** 三态合法值（非法输入一律归 default——防脏 localStorage 卡死开关） */
export const VOLUME_KEYS_MODES = ['default', 'on', 'off'];

export const normalizeVolumeKeysMode = (v) =>
  VOLUME_KEYS_MODES.includes(v) ? v : 'default';

/** 显隐判定（#107 设计约束 1 + §7.2b 裁决的判定表）：
 *  'on'     → 恒显（显式开启覆盖一切）；
 *  'off'    → 恒隐（显式关闭）；
 *  'default'→ isTouch（移动端可见 / 桌面隐藏——「默认关闭，移动端默认可见」双裁决合并）。
 *  isTouch 由接线层注入（纯逻辑零 DOM）：matchMedia('(pointer: coarse)').matches
 *  或 navigator.maxTouchPoints > 0。 */
export const resolveVolumeKeysVisible = ({ mode = 'default', isTouch = false } = {}) => {
  const m = normalizeVolumeKeysMode(mode);
  if (m === 'on') return true;
  if (m === 'off') return false;
  return !!isTouch;
};
