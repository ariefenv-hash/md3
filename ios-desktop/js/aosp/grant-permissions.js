// ==================== grant-permissions.js — AOSP 权限授权纯逻辑层（#195 一期 v9.35 / 二期照片部分授权 v9.36 / 三期照片升级链 v10.53 / v10.53 版本链滚动锚） ====================
// 权威源码：platform/packages/modules/Permission @ lineage-22.2（AOSP main 同名路径的可达镜像，
// 快照六件落 docs/reference/permission/，逐字节入库）：
//   - GrantPermissionsActivity.java（1293 行）—— 十六态按钮矩阵 L127-143、组队列、MAX_DIALOGS_PER_PKG_TASK
//   - GrantPermissionsViewHandler.java（136 行）—— 授权结果常量 @Result L38-50
//   - GrantPermissionsViewModel.kt（1500 行）—— addRequiredGroupStates 组归并 L487-527
//   - AutoRevokePermissions.kt（296 行）+ AutoRevokePermissions.proto —— 闲置回收与存储字段
//
// 本文件是纯逻辑层：不触 DOM、不触 localStorage，供 permissions.js（消费端）与测试共同引用。
// 移植纪律（v9.06 总纲）：逐字译常量与判定结构；Web 无对应物处诚实标注，不冒充锚。

// ---------------------------------------------------------------------------
// 一、十六态按钮矩阵 —— GrantPermissionsActivity.java L127-143 逐字
// ---------------------------------------------------------------------------

/** 十六态按钮常量（Activity L127-143 逐值，注释保留原文语义） */
export const BUTTONS = {
  NEXT: 15,
  ALLOW: 0,
  ALLOW_ALWAYS: 1,               // Used in auto
  ALLOW_FOREGROUND: 2,
  DENY: 3,
  DENY_AND_DONT_ASK_AGAIN: 4,
  ALLOW_ONE_TIME: 5,
  NO_UPGRADE: 6,
  NO_UPGRADE_AND_DONT_ASK_AGAIN: 7,
  NO_UPGRADE_OT: 8,              // one-time
  NO_UPGRADE_OT_AND_DONT_ASK_AGAIN: 9, // one-time
  LINK_TO_SETTINGS: 10,
  ALLOW_ALL: 11,                 // button for options with a picker, allow all
  ALLOW_SELECTED: 12,            // allow selected, with picker
  DONT_ALLOW_MORE_SELECTED: 13,  // button to cancel a request for more data with a picker
  LINK_TO_PERMISSION_RATIONALE: 14,
};

/** 同包同任务允许同时弹出的对话框上限（Activity L161 逐字） */
export const MAX_DIALOGS_PER_PKG_TASK = 10;

// ---------------------------------------------------------------------------
// 二、授权结果常量 —— GrantPermissionsViewHandler.java L38-50 逐字
// ---------------------------------------------------------------------------

/** @Result 结果常量（ViewHandler L41-50 逐值） */
export const RESULTS = {
  LINKED_TO_PERMISSION_RATIONALE: -3,
  LINKED_TO_SETTINGS: -2,
  CANCELED: -1,
  GRANTED_ALWAYS: 0,
  GRANTED_FOREGROUND_ONLY: 1,
  DENIED: 2,
  DENIED_DO_NOT_ASK_AGAIN: 3,
  GRANTED_ONE_TIME: 4,
  GRANTED_USER_SELECTED: 5, // The user has used a picker to select data to share
  DENIED_MORE: 6,           // The user has used the picker at least once, but has denied a request
};

// ---------------------------------------------------------------------------
// 三、权限组模型 —— Manifest.permission_group 同构 × md3 五类映射
// ---------------------------------------------------------------------------
// AOSP 按 permission_group 归组授权（GrantPermissionsActivity 请求队列以组为单位；
// ViewModel.addRequiredGroupStates L487-527：逐组建 GroupState、组间按请求顺序入队）。
// md3 五类权限各自映射到 AOSP 组：location（含粗/精双态，见 LOCATION_PRECISION）/
// camera / microphone / notifications / clipboard。

export const PERMISSION_GROUPS = {
  location:      { label: '位置信息', icon: 'location_on', desc: '获取设备大致或精确位置' },
  camera:        { label: '相机',     icon: 'camera_access', desc: '拍摄照片与录制视频' },
  microphone:    { label: '麦克风',   icon: 'mic_access',    desc: '录制音频与环境声音' },
  notifications: { label: '通知',     icon: 'bell_off',      desc: '发送提醒与横幅通知' },
  clipboard:     { label: '剪贴板',   icon: 'edit',          desc: '读取与写入复制内容' },
  // #195 二期：照片组（AOSP READ_MEDIA_VISUAL_USER_SELECTED / photo picker 路径，
  // SELECT_PHOTOS 按钮装配 L852-853；md3 映射 VFS /photos/ 目录访问）
  photos:        { label: '照片和视频', icon: 'image',       desc: '访问相册中的照片与视频' },
};

/** 权限名 → 组名（md3 中权限名与组名同名；AOSP 中 CAMERA 组含 CAMERA 权限同构） */
export function permissionToGroup(permission) {
  return PERMISSION_GROUPS[permission] ? permission : null;
}

/**
 * 组归并 —— GrantPermissionsViewModel.addRequiredGroupStates（L487-527）语义同构：
 * 请求列表按 permission_group 归并，同组多权限收拢为一个组请求单元；
 * 组间保持首次出现顺序（AOSP 按 manifest 请求顺序入队）。
 * @param {string[]} permissions 请求的权限名列表（允许重复与乱序）
 * @returns {Array<{group: string, permissions: string[]}>} 组请求队列（保序去重）
 */
export function groupRequests(permissions) {
  const order = [];
  const byGroup = new Map();
  for (const perm of permissions || []) {
    const group = permissionToGroup(perm);
    if (!group) continue; // 未知权限不产生组请求（消费端默认放行，同 requestPermission 契约）
    if (!byGroup.has(group)) { byGroup.set(group, new Set()); order.push(group); }
    byGroup.get(group).add(perm);
  }
  return order.map((group) => ({ group, permissions: [...byGroup.get(group)] }));
}

// ---------------------------------------------------------------------------
// 四、位置双态粗精 —— Activity L156-165 位置对话框常量 + PERMISSION_TO_BIT_SHIFT
// ---------------------------------------------------------------------------
// AOSP 位置组对话框按精度分态：DIALOG_WITH_BOTH_LOCATIONS(3) 展示精细/大致单选；
// PERMISSION_TO_BIT_SHIFT（L163-166）：ACCESS_COARSE_LOCATION→bit0、ACCESS_FINE_LOCATION→bit1。
// md3 无 coarse/fine 权限分体（单 location 权限），双态落元数据记录（__locationPrecision），
// 不参与布尔判定 —— 诚实标注：选择值仅影响展示文案与存储元数据。

export const LOCATION_DIALOG = {
  NEXT_LOCATION_DIALOG: 6,
  LOCATION_ACCURACY_LAYOUT: 0,
  FINE_RADIO_BUTTON: 1,
  COARSE_RADIO_BUTTON: 2,
  DIALOG_WITH_BOTH_LOCATIONS: 3,
  DIALOG_WITH_FINE_LOCATION_ONLY: 4,
  DIALOG_WITH_COARSE_LOCATION_ONLY: 5,
};

export const LOCATION_PRECISION = { FINE: 'fine', COARSE: 'coarse' };

/**
 * photos 组请求键判定 —— ViewModel Prompt.SELECT_PHOTOS / SELECT_MORE_PHOTOS（L1477-1478 逐字）同构：
 *   SELECT_PHOTOS，     // Select photos/allow all photos/deny
 *   SELECT_MORE_PHOTOS, // Select more photos/allow all photos/don't allow more
 * 判定源（ViewModel 以 READ_MEDIA_VISUAL_USER_SELECTED 在册与否计算 Prompt；md3 同构）：
 * getPermissionState 第五态 granted_selected（__photoSelected 数组在册）→ SELECT_MORE_PHOTOS。
 * 两态允许侧按钮同构（Activity L852-853 同一 case 分支装配 11+12），差异全在 denyButton。
 * @param {('granted'|'denied'|'unset'|'granted_one_time'|'granted_selected'|null)} state 现权态
 * @returns {'SELECT_PHOTOS'|'SELECT_MORE_PHOTOS'}
 */
export function photoRequestKind(state) {
  return state === 'granted_selected' ? 'SELECT_MORE_PHOTOS' : 'SELECT_PHOTOS';
}

/**
 * photos 组拒绝侧按钮 —— Activity denyButton switch（L856-859）同构：
 *   case DENY -> buttons.add(DENY_BUTTON)；
 *   case DONT_SELECT_MORE -> buttons.add(DONT_ALLOW_MORE_SELECTED_BUTTON)；（DenyButton L1498：
 *   DONT_SELECT_MORE, // used in the SELECT_MORE_PHOTOS dialog）
 * DENIED_MORE(6) 结果语义（ViewHandler L50 + Activity L1203-1204 点击映射）：
 * 用户拒绝追加授权 ≠ 撤权 —— 既有 GRANTED_USER_SELECTED 状态与 ACL 原样保留。
 * @param {'SELECT_PHOTOS'|'SELECT_MORE_PHOTOS'} kind 请求键
 */
export function denyButtonFor(kind) {
  return kind === 'SELECT_MORE_PHOTOS'
    ? { act: 'denied_more', aosp: BUTTONS.DONT_ALLOW_MORE_SELECTED, label: '不允许更多照片' }
    : { act: 'denied',      aosp: BUTTONS.DENY,                     label: '不允许' };
}

/**
 * 组对话框按钮序列 —— Activity L845-867 按钮装配语义同构：
 *   grant buttons switch：SELECT_PHOTOS, SELECT_MORE_PHOTOS ->
 *       buttons.addAll(Arrays.asList(ALLOW_ALL_BUTTON, ALLOW_SELECTED_BUTTON));（L852-853）
 *   denyButton switch：DENY -> DENY_BUTTON / DONT_SELECT_MORE -> DONT_ALLOW_MORE_SELECTED_BUTTON。
 * md3 按钮映射裁决（十六态 → 三键 UI）：
 *   「允许」= ALLOW(0)（GRANTED_ALWAYS=0 结果）；「仅本次」= ALLOW_ONE_TIME(5)（GRANTED_ONE_TIME=4）；
 *   「拒绝」= DENY(3)，md3 拒绝即持久化 → 等价 DENY_AND_DONT_ASK_AGAIN(4) 语义（映射表在列）。
 *   AOSP ALLOW_FOREGROUND(2)（前台/后台分态授权）md3 无后台运行时概念，不冒充锚 —— 诚实标注。
 * location 组额外携带粗/精双态（DIALOG_WITH_BOTH_LOCATIONS=3）。
 * photos 组（#195 二期）：AOSP 照片组走 photo picker 路径 ——
 *   「允许全部」= ALLOW_ALL(11)、「选择照片」= ALLOW_SELECTED(12)（SELECT_PHOTOS 装配序，
 *   L853 逐字）、「不允许」= DENY(3)；GRANTED_USER_SELECTED(5) 结果（ViewHandler L49）。
 * photos 组（#195 三期）：opts.kind='SELECT_MORE_PHOTOS' → 升级对话框 —— 允许侧同构
 *   （11+12 不变，AOSP 两 Prompt 共用 L852-853 同一装配），「选择照片」标签升级态更名
 *   「选择更多照片」（AOSP Select more photos 语义），拒绝侧换 DONT_SELECT_MORE →
 *   DONT_ALLOW_MORE_SELECTED(13)「不允许更多照片」。
 * @param {string} group 组名
 * @param {{kind?:('SELECT_PHOTOS'|'SELECT_MORE_PHOTOS')}} [opts] photos 组请求键（缺省 SELECT_PHOTOS）
 * @returns {{buttons: Array<{act:string,aosp:number,label:string}>, locationDialog: (number|null), photoPicker: boolean}}
 */
export function grantButtonsFor(group, opts = {}) {
  if (group === 'photos') {
    return {
      buttons: [
        denyButtonFor(opts.kind || 'SELECT_PHOTOS'),
        { act: 'selected', aosp: BUTTONS.ALLOW_SELECTED, label: opts.kind === 'SELECT_MORE_PHOTOS' ? '选择更多照片' : '选择照片' },
        { act: 'granted',  aosp: BUTTONS.ALLOW_ALL,      label: '允许全部' },
      ],
      locationDialog: null,
      photoPicker: true,
    };
  }
  const buttons = [
    { act: 'denied',  aosp: BUTTONS.DENY,           label: '拒绝' },
    { act: 'once',    aosp: BUTTONS.ALLOW_ONE_TIME, label: '仅本次' },
    { act: 'granted', aosp: BUTTONS.ALLOW,          label: '允许' },
  ];
  const locationDialog = group === 'location' ? LOCATION_DIALOG.DIALOG_WITH_BOTH_LOCATIONS : null;
  return { buttons, locationDialog, photoPicker: false };
}

// ---------------------------------------------------------------------------
// 五、one-time 会话态 —— GRANTED_ONE_TIME(ViewHandler L48) 生命周期
// ---------------------------------------------------------------------------
// AOSP one-time = 会话态授权：任务存续期内持续有效，任务移除即回收（框架侧过期广播 +
// GRANTED_ONE_TIME 结果常量）。md3 同构裁决：
//   - 会话态存内存 Map（不落盘 —— 与「仅本次不持久化」既有契约一致）；
//   - 回收锚 = 应用窗口关闭（任务移除）：permissions.js 监听 document 'app-window-closed'
//     （app-window.js:838 既有事件）调 revokeApp(appId)；
//   - AppOps 侧「退后台 N 分钟过期计时」无对应物，未同构 —— 诚实标注。
// getPermissionState 判定序：持久态 → 会话态（granted_one_time → granted）→ unset。

export class OneTimeSessions {
  constructor() { this.map = new Map(); }

  static key(appId, permission) { return `${appId}:${permission}`; }

  /** 授予 one-time 会话权（对应 GRANTED_ONE_TIME=4 结果落定） */
  grant(appId, permission) { this.map.set(OneTimeSessions.key(appId, permission), Date.now()); }

  /** 会话态查询：'granted_one_time' | null */
  state(appId, permission) {
    return this.map.has(OneTimeSessions.key(appId, permission)) ? 'granted_one_time' : null;
  }

  /** 任务移除回收：该应用全部 one-time 失效（返回回收数量） */
  revokeApp(appId) {
    let n = 0;
    for (const key of this.map.keys()) {
      if (key.startsWith(`${appId}:`)) { this.map.delete(key); n++; }
    }
    return n;
  }

  /** 兜底全回收（返回回收数量） */
  revokeAll() { const n = this.map.size; this.map.clear(); return n; }

  /** 会话键迭代器（隐私指示器消费：PrivacyItem 同构源） */
  keys() { return this.map.keys(); }

  get size() { return this.map.size; }
}

// ---------------------------------------------------------------------------
// 六、AutoRevoke 闲置回收 —— AutoRevokePermissions.kt + proto 字段语义
// ---------------------------------------------------------------------------
// 权威：AutoRevokePermissions.kt（296 行）revokeAppPermissions L65 —— 「Revoke granted app
// permissions for apps that should be auto-revoked」；逐 revocable group 回收其全部权限（L189）。
// 闲置判定时钟 = proto PackageProto.last_time_visible（L4 字段语义，使用权观测时间戳）。
// 阈值裁决：framework 侧默认 45 天（PermissionManagerService，R49 评论实证），md3 网页语境
// 采用 30 天（#195 协作建议口径，诚实标注非照搬）。
// 回收语义：granted → unset（回收 ≠ 拒绝、可再询问）；denied/unset 不动。

export const AUTO_REVOKE_DAYS = 30;

// ---------------------------------------------------------------------------
// 七、隐私使用指示器 —— SystemUI/privacy/PrivacyItem.kt + PrivacyChipBuilder.kt 同构
// ---------------------------------------------------------------------------
// 权威：PrivacyItem.kt（70 行，aosp-mirror main 实拉在库 docs/reference/privacy/）——
//   PrivacyType 枚举：TYPE_CAMERA / TYPE_MICROPHONE / TYPE_LOCATION / TYPE_MEDIA_PROJECTION
//   （指示器只显示 camera/microphone/location 三类运行时组 + 投屏；permGroupName 对应）；
//   PrivacyItem data class：{ privacyType, application, timeStampElapsed, paused }。
//   PrivacyChipBuilder.generateIcons：types = items.map(privacyType).distinct().sorted()。
// 「使用中」信号源裁决：AOSP = AppOps active 事件流（AppOpsPrivacyItemMonitor.kt 255 行，
//   NOTE_OP_ 稼动回调）；md3 无实时 AppOps 事件流 —— 最贴近「正在使用」的锚 = one-time
//   会话期（GRANTED_ONE_TIME 任务存续期 = 应用实际运行窗），持久 granted 不显示
//   （无实时使用信号，诚实标注：非 AppOps 稼动等价物，是任务存续期映射）。

/** PrivacyType 枚举同构（permGroupName 语义 → md3 权限组名；media_projection 无对应物保留常量） */
export const PRIVACY_TYPES = {
  TYPE_CAMERA: 'camera',
  TYPE_MICROPHONE: 'microphone',
  TYPE_LOCATION: 'location',
  TYPE_MEDIA_PROJECTION: 'media_projection',
};

/** 指示器消费的三类运行时组（TYPE_MEDIA_PROJECTION md3 无投屏应用，不进映射） */
const INDICATOR_TYPES = ['camera', 'microphone', 'location'];

/**
 * 会话键（'appId:perm'）→ PrivacyItem 同构列表（PrivacyItem.kt data class 字段齐）。
 * @param {Iterable<string>} sessionKeys one-time 会话键集合
 * @param {number} [nowMs] 时间戳（timeStampElapsed）
 * @returns {Array<{privacyType:string, application:{packageName:string}, timeStampElapsed:number, paused:boolean}>}
 */
export function privacyItemsFromSessions(sessionKeys, nowMs = Date.now()) {
  const items = [];
  for (const key of sessionKeys || []) {
    const idx = String(key).lastIndexOf(':');
    if (idx <= 0) continue;
    const appId = String(key).slice(0, idx);
    const perm = String(key).slice(idx + 1);
    if (!INDICATOR_TYPES.includes(perm)) continue; // 仅三类运行时组上指示（AOSP 同域）
    items.push({
      privacyType: perm,
      application: { packageName: appId },
      timeStampElapsed: nowMs,
      paused: false,
    });
  }
  // ChipBuilder.init 排序语义：types = items.map(privacyType).distinct().sorted()
  return items.sort((a, b) => (a.privacyType < b.privacyType ? -1 : 1));
}

/**
 * 惰性扫描：找出应被自动回收的权限清单（不落盘，由消费端执行回收动作）。
 * @param {Object} store 权限存储（{ <appId>: { __lastAccess: ms, <perm>: true|false } }）
 * @param {number} nowMs 当前时间戳
 * @param {Object} [opts] { days } 覆盖阈值（默认 AUTO_REVOKE_DAYS）
 * @returns {Array<{appId:string, permission:string}>} 待回收清单（仅 granted 且闲置超阈）
 */
export function maybeAutoRevoke(store, nowMs, opts = {}) {
  const days = opts.days != null ? opts.days : AUTO_REVOKE_DAYS;
  const threshold = days * 24 * 60 * 60 * 1000;
  const out = [];
  for (const appId of Object.keys(store || {})) {
    const rec = store[appId] || {};
    // proto PackageProto.last_time_visible 语义：__lastAccess 由消费端在权限实际使用时打点
    const last = rec.__lastAccess;
    if (typeof last !== 'number' || last <= 0) continue; // 从未使用过的不回收（无观测即无判定）
    if (nowMs - last <= threshold) continue;             // 阈值内保留
    for (const perm of Object.keys(rec)) {
      if (perm.startsWith('__')) continue;               // 元数据键不参与判定（同既有存储契约）
      if (rec[perm] === true) out.push({ appId, permission: perm });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 八、照片部分授权 —— Activity KEY_ 三键 + photo picker（SELECT_PHOTOS L852-853）
// ---------------------------------------------------------------------------
// AOSP Android 14+ 照片组授权走 photo picker 路径（Activity 快照逐字锚）：
//   - 按钮装配（L852-853）：case SELECT_PHOTOS, SELECT_MORE_PHOTOS ->
//     buttons.addAll(Arrays.asList(ALLOW_ALL_BUTTON, ALLOW_SELECTED_BUTTON))；
//     denyButton switch 单列：DENY -> DENY_BUTTON / DONT_SELECT_MORE -> DONT_ALLOW_MORE_SELECTED。
//   - 结果态（ViewHandler L49-50）：GRANTED_USER_SELECTED=5（用户已用 picker 选择数据）/
//     DENIED_MORE=6（用户曾用 picker 但拒绝再授权）。
//   - 请求键（Activity L118-123 逐字）：KEY_RESTRICTED_REQUESTED_PERMISSIONS /
//     KEY_UNRESTRICTED_REQUESTED_PERMISSIONS / KEY_ORIGINAL_REQUESTED_PERMISSIONS ——
//     全量前缀 = GrantPermissionsActivity 类全名（com.android.permissioncontroller.
//     permission.ui.GrantPermissionsActivity），restricted = 用户选择可见的媒体子集键。
// 部分授权为持久态（selected photos persisted）：md3 同构落 __photoSelected（permissions
// store 元数据键，随权限存储落盘、随 clearAllPermissions/revokePermission 联动清除）。
// md3 photos 应用既是写入者又是查看器：AOSP「应用自产媒体对自身恒可见」（own contribution
// 语义）同构为「应用写入 VFS /photos/ 的文件自动追加进 ACL」—— 诚实标注。

/** Activity L118-123 逐字（类全名前缀 + 后缀拼接，无对应 Intent extras 消费面，键名同构） */
export const PHOTO_PICKER = {
  KEY_SESSION_ID: 'com.android.permissioncontroller.permission.ui.GrantPermissionsActivity_REQUEST_ID',
  KEY_RESTRICTED_REQUESTED_PERMISSIONS:
    'com.android.permissioncontroller.permission.ui.GrantPermissionsActivity_RESTRICTED_REQUESTED_PERMISSIONS',
  KEY_UNRESTRICTED_REQUESTED_PERMISSIONS:
    'com.android.permissioncontroller.permission.ui.GrantPermissionsActivity_UNRESTRICTED_REQUESTED_PERMISSIONS',
  KEY_ORIGINAL_REQUESTED_PERMISSIONS:
    'com.android.permissioncontroller.permission.ui.GrantPermissionsActivity_ORIGINAL_REQUESTED_PERMISSIONS',
};

/** photos 组存储元数据键（permissions store 内，下划线前缀不参与布尔判定与 AutoRevoke） */
export const PHOTO_SELECTED_KEY = '__photoSelected';

/**
 * 照片 ACL（访问控制列表）—— AOSP selected photos persisted 语义同构。
 * 内存 Map<appId, string[]>，持久化由消费端接管（onChange → permissions store）。
 * 语义：grantSelected = GRANTED_USER_SELECTED(5) 全量替换；addSelected = 追加
 * （own contribution 自动可见 + NO_UPGRADE 域再选择）；clear/revoke = 回 unset。
 */
export class PhotoAccess {
  constructor(onChange) {
    this.map = new Map();
    this.onChange = onChange || null;
  }

  /** 全量替换选中集合（GRANTED_USER_SELECTED=5 落定；去重保序） */
  grantSelected(appId, paths) {
    const list = [...new Set((paths || []).map(String))];
    this.map.set(String(appId), list);
    this._emit();
    return list;
  }

  /** 追加选中集合（应用自产媒体自动可见 / NO_UPGRADE 域再选择；去重保序） */
  addSelected(appId, paths) {
    const key = String(appId);
    const cur = this.map.get(key) || [];
    const merged = [...new Set([...cur, ...(paths || []).map(String)])];
    this.map.set(key, merged);
    this._emit();
    return merged;
  }

  /** ACL 查询：选中文件名集合（快照副本） */
  allowed(appId) { return (this.map.get(String(appId)) || []).slice(); }

  /** 部分授权态查询：有记录即 'selected'（全量态由消费端布尔 granted 判定，不在此混判） */
  mode(appId) { return this.map.has(String(appId)) ? 'selected' : null; }

  /** 清除单应用 ACL（回收 = 回 unset；返回是否存在） */
  clear(appId) { const had = this.map.delete(String(appId)); if (had) this._emit(); return had; }

  /** 任务移除级回收（与 OneTimeSessions.revokeApp 同形） */
  revokeApp(appId) { return this.clear(appId); }

  /** 兜底全回收（返回回收数量） */
  revokeAll() { const n = this.map.size; this.map.clear(); if (n) this._emit(); return n; }

  /** 持久态灌入（消费端启动时从 permissions store 恢复） */
  hydrate(obj) {
    for (const [k, v] of Object.entries(obj || {})) {
      this.map.set(String(k), Array.isArray(v) ? v.map(String) : []);
    }
  }

  /** 持久态导出（消费端落 __photoSelected） */
  toJSON() { return Object.fromEntries(this.map); }

  _emit() { if (this.onChange) { try { this.onChange(this.toJSON()); } catch (e) { /* 落盘失败不阻断 */ } } }

  get size() { return this.map.size; }
}

/**
 * ACL 过滤 —— 部分授权下可见集合判定（photos 应用 loadFromVfs 消费）。
 * @param {Array<{name:string}|string>} entries VFS 目录项（对象含 name，或纯文件名）
 * @param {string[]} selected ACL 选中文件名集合
 * @returns {Array} 命中子集（保序）
 */
export function filterByAcl(entries, selected) {
  const allow = new Set((selected || []).map(String));
  return (entries || []).filter((e) => {
    const name = e == null ? '' : (typeof e === 'string' ? e : String(e.name));
    return allow.has(name);
  });
}
