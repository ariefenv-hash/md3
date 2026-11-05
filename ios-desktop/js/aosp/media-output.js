// ==================== media-output.js — 媒体输出切换器 MediaOutputDialog 纯逻辑层（#92 v10.02） ====================
// 议题 #92：A13+ 输出设备切换（MediaOutputDialog）：设备列表 + 路由切换 + 空间音频入口。
//
// AOSP 锚点（aosp-mirror/platform_frameworks_base main，2026-11-05 实拉快照）：
//   MediaSwitchingController.java（1419 行）：
//     L686-695  buildMediaItems：无 preference route listing 时 naturalOrder 排序 +
//               首建把已连接设备置顶（categorizeMediaItemsLocked 头插语义）；
//               后续重建保持既有列表序（targetMediaDevices 保序增量）。
//     L769-811  categorizeMediaItemsLocked：selectedDevicesIds（含 connected）头插
//               index 0；suggested 设备前插「建议设备」组分隔；非 suggested 前插
//               「扬声器和显示屏」组分隔（两组分隔各自只插一次）。
//     L812-822  attachConnectNewDeviceItemIfNeeded：当前输出非 remote 且单选时
//               尾插「连接新设备」项（TYPE_PAIR_NEW_DEVICE）。
//     L722-733  MediaItemType 三类：TYPE_GROUP_DIVIDER / TYPE_DEVICE /
//               TYPE_PAIR_NEW_DEVICE。
//     L1080     dialog window TYPE_KEYGUARD_DIALOG。
//   MediaOutputBaseDialog.java（611 行）：L101 mDeviceListLayout；L262
//     requireViewById(R.id.device_list)；L443 getColorDialogBackground。
//   VolumeDialogImpl.java（2858 行）：L1244-1251 省略号 → dismissH(DISMISS_REASON_
//     SETTINGS_CLICKED) + mMediaOutputDialogManager 联动 + openVolumePanel——A17
//     volume_dialog.xml（L22-71）实证无顶部 output 行（v8.93 体检基于 A13 形态），
//     md3 按议题建议行置于音量面板顶部，A17 入口差异如实标注（铁律 #1）。
//
// md3 网页等价边界（铁律 #2 / #76 移植边界清单写法）：
//   - 输出路由：AudioContext.setSinkId（Chromium 121+）+ navigator.mediaDevices
//     .enumerateDevices() 枚举音频输出；能力缺失 → #77-A 降级：项目内模拟设备列表
//     （设置›已连接的设备 idx18 蓝牙模拟同语义），选中仍落偏好记忆 + 事件广播，
//     toast 标注「网页环境不支持输出路由」。
//   - 空间音频：Web Audio 无真空间音频 → 开关 + 说明壳（偏好记忆），等价标注在录。

/** MediaItemType 三类字面量（MediaSwitchingController L722-733 同构）。 */
export const MEDIA_ITEM_TYPE = Object.freeze({
  DEVICE: 'device',
  GROUP_DIVIDER: 'group_divider',
  PAIR_NEW_DEVICE: 'pair_new_device',
});

/** 组分隔标题（MediaSwitchingController addSuggestedDeviceGroupDivider /
 *  addSpeakersAndDisplaysGroupDivider 的 strings.xml 语义）。 */
export const GROUP_TITLES = Object.freeze({
  suggested: '建议设备',
  speakersAndDisplays: '扬声器和显示屏',
  pairNew: '连接新设备',
});

/** 设备类别 → 图标键（md3 icons.js 在库键映射；speaker 形态由 volume_media 承载）。 */
export const DEVICE_KIND_ICON = Object.freeze({
  speaker: 'volume_media',
  bluetooth: 'bluetooth_connected',
  wired: 'headphones',
  cast: 'cast',
  phone: 'smartphone',
});

/** 设备行图标键解析（未知 kind 兜底 speaker 形态——内置扬声器缺省语义）。 */
export function deviceIconKey(kind) {
  return DEVICE_KIND_ICON[kind] || DEVICE_KIND_ICON.speaker;
}

/**
 * 设备列表模型（buildMediaItems L686-695 + categorizeMediaItemsLocked L769-811 md3 同构）。
 * @param {object} input
 * @param {Array<{id,name,kind,simulated?}>} input.devices  naturalOrder 输入（调用方按
 *        id 自然序排定，确定性契约——同列表同输出）
 * @param {string} [input.connectedId]  当前已连接（活跃）设备 id
 * @param {boolean} [input.attachPairNew=true]  是否尾插「连接新设备」项（L812-822：
 *        非 remote 且单选时附加；md3 单选恒成立、无 remote 形态 → 默认 true）
 * @returns {Array<{type:'device',device:object}|{type:'group_divider',title:string}|{type:'pair_new_device'}>}
 *   有序 MediaItem 列表：connected 头插 → suggested 组（含组分隔）→ 扬声器和显示屏组
 *   （含组分隔）→ 连接新设备项。md3 模拟面无 suggested 设备真源（无配对历史）→
 *   suggested 组恒不出现（诚实标注），组分隔仅在实际分组存在时产出。
 */
export function buildMediaItems(input) {
  const { devices = [], connectedId = null, attachPairNew = true } = input || {};
  const items = [];
  const rest = [];
  for (const d of devices) {
    if (connectedId && d.id === connectedId) items.push({ type: MEDIA_ITEM_TYPE.DEVICE, device: d });
    else rest.push(d);
  }
  const hasGroups = items.length > 0 && rest.length > 0; // connected 头插后仍有「其余设备」= 两组
  if (hasGroups) items.push({ type: MEDIA_ITEM_TYPE.GROUP_DIVIDER, title: GROUP_TITLES.speakersAndDisplays });
  for (const d of rest) items.push({ type: MEDIA_ITEM_TYPE.DEVICE, device: d });
  if (attachPairNew) items.push({ type: MEDIA_ITEM_TYPE.PAIR_NEW_DEVICE });
  return items;
}

/**
 * 输出面板顶部当前设备行模型（议题建议①：设备图标 + 名称 + 展开箭头）。
 * connected 缺失 → 内置扬声器缺省行（AOSP LocalMediaManager 缺省路由同义）。
 * @returns {{id:string,name:string,iconKey:string,simulated:boolean}|null}
 */
export function currentOutputRow({ devices = [], connectedId = null } = {}) {
  const hit = devices.find((d) => d.id === connectedId) ||
    devices.find((d) => d.kind === 'speaker') || null;
  if (!hit) return null;
  return { id: hit.id, name: hit.name, iconKey: deviceIconKey(hit.kind), simulated: !!hit.simulated };
}

/**
 * 路由解析（md3 网页等价边界判定）。
 * @param {object} input
 * @param {string} input.deviceId  目标设备
 * @param {boolean} input.sinkCapable  setSinkId 能力（wiring 侧特性检测注入）
 * @param {string} [input.activeId]  当前活跃设备
 * @returns {{changed:boolean, routed:boolean, degraded:boolean, reason:string}}
 *   - sinkCapable → routed=true（wiring 侧执行 setSinkId）
 *   - 能力缺失 → degraded=true（#77-A：偏好记忆 + 事件广播照常，toast 标注等价边界）
 *   - 目标即活跃 → changed=false 零操作（AOSP 重复选路幂等同义）
 */
export function resolveRoute(input) {
  const { deviceId, sinkCapable, activeId = null } = input || {};
  if (!deviceId) return { changed: false, routed: false, degraded: false, reason: 'no_device' };
  if (deviceId === activeId) return { changed: false, routed: false, degraded: false, reason: 'already_active' };
  if (sinkCapable) return { changed: true, routed: true, degraded: false, reason: 'sink_id' };
  return { changed: true, routed: false, degraded: true, reason: 'sink_unavailable' };
}

/** 空间音频入口（SpatialAudioDialog 网页等价壳：开关 + 说明，铁律 #2 边界标注）。 */
export const SPATIAL_AUDIO = Object.freeze({
  id: 'spatial-audio',
  label: '空间音频',
  note: '网页等价：Web Audio 无真空间音频，开关仅记忆偏好并标注边界',
  defaultEnabled: false,
});
