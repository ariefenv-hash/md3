// ==================== status-bar-policy.js — 状态栏常态图标位策略（PhoneStatusBarPolicy 同构 · 零 DOM） ====================
// v9.95 #89：AOSP SystemUI PhoneStatusBarPolicy 常态图标位移植（aosp-mirror main 实源核对，
// 42KB 全文提测定表；议题 #89 三条建议 = 图标位补齐 + 5G 矢量分级 + 显隐治理）。
//
// 判定规则逐条实证（PhoneStatusBarPolicy.java）：
// ① bluetooth：updateBluetooth() —— isBluetoothConnected() && (audioActive || !audioProfileOnly)
//    时可见（md3 口径：QS bluetooth 磁贴 active = 已连接 Pixel Buds Pro 语义，v7.79 面板同源）
// ② zen：updateZenIcon() —— zen != ZEN_MODE_OFF 可见（DndTile.isCombinedIcon 前提，md3 modes
//    磁贴恒在 = combined 语义恒真）
// ③ mute/vibrate：updateRingerAndAlarmIcons() —— !isZenOverridingRinger(zen, policy) 时
//    ringer==SILENT→mute / ringer==VIBRATE→vibrate；zen 覆盖时双隐（md3 口径：zen 活动即
//    覆盖——manualRule 直控 ringer，AOSP 为 consolidated policy 判定，简化差异在录）
// ④ alarm_clock：updateAlarm() —— alarm != null && triggerTime > 0 可见；ZEN_MODE_NO_INTERRUPTIONS
//    时 stat_sys_alarm_dim 变体（md3 无 dim 素材，同形同键诚实标注）
// ⑤ cast：updateCast() —— casting && !mRecordingController.isRecording()（screen record 有
//    自有图标，cast 让位）+ 隐藏 3s 延迟（md3 值差分渲染无延迟语义，直接隐藏）
// ⑥ vpn/hotspot/data_saver/headset：已迁出 PhoneStatusBarPolicy（Controller 回调面）——
//    vpn → QS vpn 磁贴实接；hotspot/data_saver/headset md3 无信号源，占位 false 诚实标注
//    （v9.92 screenshot 占位同款先例）
// ⑦ location：LocationBarController.isLocationActive()（应用正使用定位）→ md3 privacyItems
//    location 类型（v9.36 #195 隐私指示器同源信号，非「位置服务开关」）
// ⑧ screen_record：ScreenRecordController 录制期可见 → md3 QS screen_record 磁贴 active
//
// 图标位注册序（SB_SLOT_ORDER）：statusIcons 容器内按注册序排布（StatusBarIconController
// DEFAULT_ICON_LIST 语义——android 版本间注册序有差异，镜像 main 无该文件可核对，
// 本序取 alarm→zen→ringer→设备→网络增强的 Pixel 实测惯例，差异在录 #85 巡检同类）。

/** 图标位注册序单一真源（statusIcons 容器内左→右；wifi/cellular/badge/battery 信号簇右邻） */
export const SB_SLOT_ORDER = Object.freeze([
  'alarm_clock',
  'zen',
  'mute',
  'vibrate',
  'headset',
  'bluetooth',
  'hotspot',
  'cast',
  'vpn',
  'location',
  'screen_record',
  'data_saver',
]);

/** 插槽 → icons.js 矢量键（全表键名在库实证；bluetooth 可见即已连接态图标） */
export const SB_SLOT_ICONS = Object.freeze({
  alarm_clock: 'alarm',
  zen: 'modes',
  mute: 'volume_mute',
  vibrate: 'ringer_vibrate',
  headset: 'headphones',
  bluetooth: 'bluetooth_connected',
  hotspot: 'hotspot',
  cast: 'cast',
  vpn: 'vpn',
  location: 'location_on',
  screen_record: 'screen_record',
  data_saver: 'data_saver', // icons.js 无此键——占位插槽不渲染，ICONS 兜底空串
});

/**
 * 判定表：状态快照 → 可见插槽序列（SB_SLOT_ORDER 序；值差分消费方零 DOM）
 * @param {Object} snapshot 状态快照：
 *   alarmSet        下一闹钟已设（QS alarm 磁贴 active，AOSP AlarmManager.getNextAlarmClock 对应面）
 *   zenActive       勿扰活动（QS modes 磁贴 / setDndActive 单一真源）
 *   ringerMode      'ring' | 'vibrate' | 'silent'（sound-haptics #36 单一真源）
 *   headsetConnected 有线/无线耳机接入（md3 无信号源，恒 false 占位）
 *   bluetoothConnected 蓝牙已连接（QS bluetooth 磁贴 active）
 *   hotspotOn       热点开启（md3 无热点磁贴，恒 false 占位）
 *   castActive      投屏中（QS cast 磁贴）
 *   vpnActive       VPN 活动（QS vpn 磁贴）
 *   locationActive  定位使用中（privacyItems location 类型）
 *   recording       屏幕录制中（QS screen_record 磁贴）
 *   dataSaverOn     流量节省开启（md3 无信号源，恒 false 占位）
 * @returns {Array<{slot:string, iconKey:string}>}
 */
export function resolveVisibleSlots(snapshot) {
  const s = snapshot || {};
  const zenActive = !!s.zenActive;
  const recording = !!s.recording;
  // updateRingerAndAlarmIcons：zen 覆盖 ringer 时 mute/vibrate 双隐
  const ringerOverridden = zenActive;
  const ringer = s.ringerMode || 'ring';
  const states = {
    alarm_clock: !!s.alarmSet,
    zen: zenActive,
    mute: !ringerOverridden && ringer === 'silent',
    vibrate: !ringerOverridden && ringer === 'vibrate',
    headset: !!s.headsetConnected,
    bluetooth: !!s.bluetoothConnected,
    hotspot: !!s.hotspotOn,
    // updateCast：screen record 有自有图标，录制期 cast 让位
    cast: !!s.castActive && !recording,
    vpn: !!s.vpnActive,
    location: !!s.locationActive,
    screen_record: recording,
    data_saver: !!s.dataSaverOn,
  };
  return SB_SLOT_ORDER
    .filter((slot) => states[slot])
    .map((slot) => ({ slot, iconKey: SB_SLOT_ICONS[slot] }));
}

/**
 * 图标显隐治理（IconManager / config_statusBarIconsToExclude 同构）：
 * blocklist 内插槽永不渲染——设置 › 系统 › 状态栏 开关组持久化消费
 * @param {Array<{slot:string,iconKey:string}>} slots resolveVisibleSlots 产出
 * @param {string[]} blocklist 被排除插槽名数组
 * @returns {Array<{slot:string,iconKey:string}>}
 */
export function applyBlocklist(slots, blocklist) {
  const blocked = Array.isArray(blocklist) ? new Set(blocklist) : new Set();
  return (slots || []).filter((entry) => !blocked.has(entry.slot));
}

/** MobileIconGroup 分级注册表（AOSP MobileIconGroup 语义：2G/3G/4G/4G+/5G/5G+ 徽章） */
export const MOBILE_ICON_GROUPS = Object.freeze({
  none: { badge: '' },
  '2g': { badge: '2G' },
  '3g': { badge: '3G' },
  '4g': { badge: '4G' },
  '4g_plus': { badge: '4G+' },
  '5g': { badge: '5G' },
  '5g_plus': { badge: '5G+' },
});

/**
 * 移动数据分级解析（Network Information API effectiveType → MobileIconGroup 键）。
 * AOSP 数据分级真源为 ServiceState/dataNetworkType（telephony），md3 无 telephony 实体——
 * navigator.connection.effectiveType 仅 2g/3g/4g，5G 缺省承接现状真值（原状态栏硬编码
 * "5G" 文本；slow-2g → 2g 同级归并，占位链诚实标注）。
 * @param {string} [effectiveType] 'slow-2g'|'2g'|'3g'|'4g'|undefined
 * @returns {string} MOBILE_ICON_GROUPS 键名
 */
export function resolveMobileIconGroup(effectiveType) {
  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return '2g';
    case '3g':
      return '3g';
    case '4g':
      return '4g';
    case 'none':
      return 'none';
    default:
      return '5g';
  }
}
