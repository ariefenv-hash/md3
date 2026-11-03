// ==================== permissions.js — 统一权限系统（MD3 运行时权限对话框） ====================
// 对齐真 Android 的权限仪式感（建议文档·第二档 #4）：
//   - 子应用调用敏感 API（相机/麦克风/位置/通知/剪贴板）前，先经桌面弹出 MD3 权限对话框
//   - 用户可选「拒绝 / 仅本次 / 允许」；允许与拒绝持久化到 localStorage，仅本次不持久化
//   - 设置 › 应用权限管理 可随时查看与改判；「重置全部权限」恢复到未询问状态
//   - 拒绝后子应用自行走降级路径（如天气 GPS 被拒 → 自动切 IP 定位）
//
// v9.36（#195 一期）AOSP 授权语义增强 —— 纯逻辑层 js/aosp/grant-permissions.js：
//   - 组归并队列：请求按 permission_group 归组（GrantPermissionsViewModel.addRequiredGroupStates
//     L487-527 语义），组间串行入队（dialogQueue 既有机制复用）；
//   - 十六态按钮矩阵映射：允许=ALLOW(0) / 仅本次=ALLOW_ONE_TIME(5) / 拒绝=DENY(3)
//     （md3 拒绝即持久化 → 等价 DENY_AND_DONT_ASK_AGAIN(4)，映射表见纯逻辑层 grantButtonsFor）；
//   - one-time 会话态：GRANTED_ONE_TIME(ViewHandler L48) —— 任务存续期内持续有效，
//     应用窗口关闭（任务移除，app-window-closed 事件）即回收；不落盘；
//   - AutoRevoke 闲置回收：权限使用打点（__lastAccess，proto PackageProto.last_time_visible
//     字段语义）+ 惰性扫描 30 天未使用 granted → unset（回收 ≠ 拒绝、可再询问）；
//   - 位置双态粗精：location 组对话框 DIALOG_WITH_BOTH_LOCATIONS(3)，选择值落
//     __locationPrecision 元数据（不参与布尔判定）。
// v9.36（#195 二期）照片部分授权 —— photo picker + VFS 目录 ACL：
//   - photos 组三键：允许全部=ALLOW_ALL(11) / 选择照片=ALLOW_SELECTED(12)（SELECT_PHOTOS
//     装配序 L852-853）/ 不允许=DENY(3)；结果态 GRANTED_USER_SELECTED(5)；
//   - 选择照片 → 内嵌 picker 第二步（列出 VFS /photos/ 文件勾选）→ 确认落 ACL
//     （__photoSelected 元数据键，selected photos persisted 语义）；
//   - getPermissionState 第五态 'granted_selected'（既有消费端 !== 'denied' 判定兼容）；
//   - ACL 查询桥：GET_PHOTO_ACCESS → PHOTO_ACCESS { mode, selected }（photos 应用过滤）；
//   - own contribution：应用写入 VFS /photos/ 的文件自动追加 ACL（PHOTO_CONTRIBUTED）。
// v9.54（#195 三期）照片升级链 —— SELECT_MORE_PHOTOS 再请求升级对话框：
//   - granted_selected 再请求 → SELECT_MORE_PHOTOS（ViewModel Prompt L1477-1478）：允许侧
//     同构（11+12，两 Prompt 共用 Activity L852-853 同一装配），拒绝侧换 DONT_SELECT_MORE →
//     DONT_ALLOW_MORE_SELECTED(13)「不允许更多照片」（denyButton switch L856-859）；
//   - DENIED_MORE(6)（ViewHandler L50）：拒绝追加授权 ≠ 撤权 —— 既有状态与 ACL 原样保留；
//   - 升级入口 = requestPermissions(…, { upgrade: true }) 显式再请求：md3 photos 应用每次
//     开启都过权限门（ensurePhotoAccess），default 无升级意图维持二期「免重复询问」契约，
//     弹框会退化为每次开启即弹 —— 显式再请求才是 AOSP「应用主动 re-request」同构（诚实标注）；
//   - 升级态 picker 预勾选当前 ACL 集合，确认 = grantSelected 全量替换（取消勾选 = 收回，
//     与 AOSP photo picker 选择集持久化同语义）。
//
// 通信协议（子应用侧由 main.js 注入的 window.__system.requestPermission 封装）：
//   iframe → 桌面：{ type: 'REQUEST_PERMISSION', requestId, permission }
//   桌面 → iframe：{ type: 'PERMISSION_ACK', requestId }      存在性握手（兼容旧桌面超时兜底）
//   桌面 → iframe：{ type: 'PERMISSION_RESULT', requestId, granted }
//
// 存储结构（localStorage: ios-desktop:permissions）：
//   { <appId>: { __name, __icon, <permission>: true|false } }
//   __name/__icon 为应用展示元数据（设置页渲染用），下划线前缀键不参与权限判定。

import { ICONS } from './icons.js';
import { getAppIconSVG } from './app-icons.js';
import { initialApps } from './apps-data.js';
import {
  BUTTONS, RESULTS, MAX_DIALOGS_PER_PKG_TASK,
  PERMISSION_GROUPS, permissionToGroup, groupRequests,
  LOCATION_DIALOG, LOCATION_PRECISION, grantButtonsFor, photoRequestKind, // #195 三期：请求键判定
  OneTimeSessions, AUTO_REVOKE_DAYS, maybeAutoRevoke,
  privacyItemsFromSessions,
  PHOTO_PICKER, PHOTO_SELECTED_KEY, PhotoAccess, filterByAcl, // #195 二期：照片部分授权
} from './aosp/grant-permissions.js';

const STORAGE_KEY = 'ios-desktop:permissions';
/** __lastAccess 落盘节流：权限使用打点每 appId 最小间隔（热路径防抖） */
const LAST_ACCESS_TOUCH_INTERVAL = 60 * 1000;

/** 五类权限的展示元数据（icon 对应 js/icons.js 的键名） */
export const PERMISSION_META = {
  camera:        { label: '相机',     icon: 'camera_access', desc: '拍摄照片与录制视频' },
  microphone:    { label: '麦克风',   icon: 'mic_access',    desc: '录制音频与环境声音' },
  location:      { label: '位置信息', icon: 'location_on',   desc: '获取设备大致或精确位置' },
  notifications: { label: '通知',     icon: 'bell_off',      desc: '发送提醒与横幅通知' },
  clipboard:     { label: '剪贴板',   icon: 'edit',          desc: '读取与写入复制内容' },
  photos:        { label: '照片和视频', icon: 'image',       desc: '访问相册中的照片与视频' }, // #195 二期
};

let store = loadStore();
const dialogQueue = [];   // 对话框串行队列：多个应用同时请求时依次弹出
let dialogActive = false;
/** one-time 会话态（#195 一期）：内存 Map，任务移除（窗口关闭）即回收，不落盘 */
const oneTimeSessions = new OneTimeSessions();
/** __lastAccess 打点节流缓存：appId → 上次实际落盘时刻 */
const lastAccessTouchedAt = new Map();
/**
 * 照片 ACL（#195 二期）：AOSP selected photos persisted 语义 —— 持久态，随 permissions
 * store 落盘（onChange → __photoSelected 元数据键）。启动时从存量 store 灌入。
 * 全量同步语义：每次 onChange 先清 store 内全部 __photoSelected 残留，再写入当前 ACL
 * 快照 —— 保证 PhotoAccess.clear 后 store 无残留（避免 getPermissionState 误判 granted_selected）。
 */
function persistPhotoAcl(aclJson) {
  try {
    for (const rec of Object.values(store)) {
      if (rec && PHOTO_SELECTED_KEY in rec) delete rec[PHOTO_SELECTED_KEY];
    }
    for (const [appId, list] of Object.entries(aclJson || {})) {
      if (!store[appId]) store[appId] = {};
      store[appId][PHOTO_SELECTED_KEY] = list; // 数组持久化（下划线前缀元数据键）
    }
    saveStore();
  } catch (e) { /* 落盘失败不阻断授权链路 */ }
}
const photoAccess = new PhotoAccess(persistPhotoAcl);
try {
  const seeded = {};
  for (const [appId, rec] of Object.entries(store)) {
    if (rec && Array.isArray(rec[PHOTO_SELECTED_KEY])) seeded[appId] = rec[PHOTO_SELECTED_KEY];
  }
  photoAccess.hydrate(seeded);
} catch (e) { /* 灌入失败保持空 ACL */ }

/**
 * 权限使用打点（#195 AutoRevoke 时钟）：__lastAccess 对齐 proto PackageProto.last_time_visible
 * 字段语义 —— 记录权限最近一次实际使用时刻（申请/运行时校验均算使用，AOSP AppOps lastAccess
 * 同语义）。节流落盘；下划线前缀键不参与权限判定（既有存储契约）。
 */
function touchLastAccess(appId) {
  if (!appId || !store[appId]) return;
  const now = Date.now();
  const last = lastAccessTouchedAt.get(appId) || 0;
  if (now - last < LAST_ACCESS_TOUCH_INTERVAL) return;
  lastAccessTouchedAt.set(appId, now);
  store[appId].__lastAccess = now;
  saveStore();
}

/**
 * 隐私使用指示器派发（#195 一期加餐）：one-time 会话变化时广播 PrivacyItem 同构列表
 * （SystemUI/privacy/PrivacyItem.kt 同构；状态栏 status-bar.js 消费渲染 chip）。
 * 「使用中」信号源 = 会话期（任务存续期映射，非 AppOps 稼动等价物，诚实标注）。
 */
function notifyPrivacyItems() {
  try {
    const items = privacyItemsFromSessions(oneTimeSessions.keys());
    document.dispatchEvent(new CustomEvent('privacy-items-changed', { detail: { items } }));
  } catch (e) { /* 指示器失败不影响授权链路 */ }
}

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) {
    return {};
  }
}

function saveStore() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (e) { /* 配额满时静默 */ }
}

/**
 * 'granted' | 'denied' | 'unset' | 'granted_one_time' | 'granted_selected'
 * 判定序：持久态 → one-time 会话态（#195：GRANTED_ONE_TIME 会话内等同放行）→ unset。
 * #195 二期：photos 组布尔 true 且存在 __photoSelected 数组 → 'granted_selected'
 * （GRANTED_USER_SELECTED(5) 部分授权态；既有消费端 !== 'denied' 判定兼容，均放行）。
 * 消费端契约：!== 'denied' 即放行（clipboard.js 既有判定不变）；
 * requestPermission 对 granted / granted_one_time / granted_selected 均直接放行不再弹框。
 */
export function getPermissionState(appId, permission) {
  const rec = store[appId];
  if (!rec || typeof rec[permission] !== 'boolean') {
    // 持久态 unset → 查 one-time 会话态
    if (oneTimeSessions.state(appId, permission)) return 'granted_one_time';
    return 'unset';
  }
  const state = rec[permission] ? 'granted' : 'denied';
  if (state === 'granted') {
    // #195 二期：部分授权态判定（GRANTED_USER_SELECTED —— 数组存在即部分授权，
    // 空数组也是部分授权态：用户在 picker 中一个都没选）
    if (permission === 'photos' && Array.isArray(rec[PHOTO_SELECTED_KEY])) return 'granted_selected';
    touchLastAccess(appId); // AppOps lastAccess 语义：运行时校验算使用
  }
  return state;
}

/** #195：回收单条权限 —— 回 unset 而非 denied（AutoRevokePermissions.kt 语义：回收 ≠ 拒绝、可再询问）
 *  #195 二期：photos 回收联动清 ACL（部分授权集合随布尔主态一同回 unset）*/
export function revokePermission(appId, permission) {
  if (!appId || !store[appId]) return false;
  if (typeof store[appId][permission] !== 'boolean') return false;
  delete store[appId][permission];
  if (permission === 'photos') photoAccess.clear(appId); // selected photos 集合同清
  saveStore();
  return true;
}

/** 深拷贝导出（供设置页渲染） */
export function getAllPermissions() {
  return JSON.parse(JSON.stringify(store));
}

/** 设置页改判入口（#195 二期：photos 改判语义为全量授权/拒绝，联动清 ACL —— 与 applyGroupChoice 一致） */
export function setPermission(appId, permission, granted) {
  if (!appId || !permission) return;
  if (!store[appId]) store[appId] = {};
  store[appId][permission] = !!granted;
  if (permission === 'photos') photoAccess.clear(appId); // 全量/拒绝均清 ACL（改判走设置页无 picker 步骤）
  saveStore();
}

export function clearAllPermissions() {
  store = {};
  photoAccess.revokeAll(); // #195 二期：ACL 随权限存储整体重置
  saveStore();
}

/** 记录应用展示元数据（首次申请时反查一次）；图标固定本地 SVG，与桌面同源 */
function rememberAppMeta(appId, appName) {
  if (!store[appId]) store[appId] = {};
  const appDef = initialApps.find((a) => a.id === appId);
  if (!store[appId].__name) store[appId].__name = appName || (appDef && appDef.name) || appId;
  // v7.4：不再存 app.iconUrl 网络图，老记录里的遗留网络 __icon 也会被本次覆写为本地 SVG
  store[appId].__icon = getAppIconSVG(appId);
}

/**
 * v7.52：安装包应用元数据种子 —— 安装完成后预写入 __name/__icon，
 * 让「设置 › 应用权限管理」在包应用首次申请权限前就能展示正确的名称与包图标。
 * 只种元数据、不预授权：运行时申请仍走统一权限对话框。
 */
export function seedAppMeta(appId, appName, iconHTML) {
  if (!appId) return;
  if (!store[appId]) store[appId] = {};
  if (appName && !store[appId].__name) store[appId].__name = String(appName);
  if (typeof iconHTML === 'string' && iconHTML) store[appId].__icon = iconHTML;
  else if (!store[appId].__icon) store[appId].__icon = getAppIconSVG(appId);
  saveStore();
}

/** v7.52：应用级权限记录整体移除（卸载包应用时调用；内置应用卸载走同接口无副作用；#195 二期 ACL 同清） */
export function removeAppPermissions(appId) {
  if (!appId || !store[appId]) return;
  delete store[appId];
  photoAccess.clear(appId);
  saveStore();
}

/**
 * 权限请求入口（父模块也可直接 await 调用）。
 * @returns {Promise<boolean>} 是否放行
 */
export async function requestPermission(permission, { appId, appName } = {}) {
  if (!PERMISSION_META[permission]) return true; // 未知权限类型默认放行，不阻塞子应用
  if (!appId) return true;                       // 无来源上下文（父模块自身）默认放行

  const [granted] = await requestPermissions([permission], { appId, appName });
  return granted;
}

/**
 * #195 一期：组队列授权入口 —— 请求按 permission_group 归并后组间串行弹框
 * （GrantPermissionsViewModel.addRequiredGroupStates L487-527 语义；组间顺序 = 首次出现序）。
 * 单权限 requestPermission 内部亦走此路径（组内=单权限），行为兼容既有契约。
 * @param {string[]} permissions 请求的权限名列表
 * @param {{appId?:string, appName?:string}} [opts]
 * @returns {Promise<boolean[]>} 与 permissions 顺序对齐的放行结果
 */
export async function requestPermissions(permissions, { appId, appName, upgrade } = {}) {
  const list = (permissions || []).filter(Boolean);
  const result = new Array(list.length).fill(true);
  if (!appId) return result;                     // 无来源上下文（父模块自身）默认放行

  // 未知权限类型默认放行，不阻塞子应用（既有契约）；逐权限标记放行
  const unknown = list.map((p, i) => (PERMISSION_GROUPS[p] ? null : i)).filter((i) => i !== null);
  for (const i of unknown) result[i] = true;
  const knownPerms = list.filter((p) => PERMISSION_GROUPS[p]);
  if (!knownPerms.length) return result;

  // 会话态/持久态判定前置：已放行的权限不再弹框（GRANTED_ONE_TIME 会话内免重复询问；
  // GRANTED_USER_SELECTED 部分授权态同样免重复询问 —— 升级走设置页改判或 NO_UPGRADE 域，
  // 既有对话框不重复弹）。
  // #195 三期：granted_selected + 显式再请求（upgrade=true）→ SELECT_MORE_PHOTOS 升级对话框
  // （AOSP「应用主动 re-request READ_MEDIA_VISUAL」同构；default 无升级意图维持二期免询问契约 ——
  // photos 应用每次开启都过权限门，不升级会退化为每次开启即弹框）
  const pending = knownPerms.filter((p) => {
    const state = getPermissionState(appId, p);
    if (state === 'granted' || state === 'granted_one_time') { result[list.indexOf(p)] = true; return false; }
    if (state === 'granted_selected') {
      if (upgrade) return true; // SELECT_MORE_PHOTOS：升级对话框待询问
      result[list.indexOf(p)] = true; return false;
    }
    if (state === 'denied') { result[list.indexOf(p)] = false; return false; }
    return true; // unset → 待询问
  });
  if (!pending.length) return result;

  rememberAppMeta(appId, appName);
  saveStore();

  // 组归并（组间保序）→ 逐组弹框（enqueueDialog 串行队列复用）
  const groupReqs = groupRequests(pending);
  const displayName = store[appId].__name || appName || appId;
  for (const req of groupReqs) {
    touchLastAccess(appId);                      // 申请即使用打点（AutoRevoke 时钟）
    // #195 三期：显式再请求 + 组内 granted_selected → SELECT_MORE_PHOTOS 请求键
    // （ViewModel Prompt 以 READ_MEDIA_VISUAL_USER_SELECTED 在册与否计算，L1477-1478）
    const kind = upgrade && req.permissions.some((p) => getPermissionState(appId, p) === 'granted_selected')
      ? photoRequestKind('granted_selected') // 'SELECT_MORE_PHOTOS'
      : undefined;
    const res = await enqueueDialog({ appId, appName: displayName, group: req.group, permissions: req.permissions, kind });
    applyGroupChoice(appId, req.group, req.permissions, res.act, res.selected); // #195 二期：photos 组携带 selected
    // denied_more（DENIED_MORE(6)）≠ 拒绝：既有 GRANTED_USER_SELECTED 授权延续 → 放行 true
    req.permissions.forEach((p) => { result[list.indexOf(p)] = res.act !== 'denied'; });
  }
  return result;
}

/**
 * 组选择落权：granted → 逐权限持久授予；once → one-time 会话态（不落盘）；
 * denied → 逐权限持久拒绝；location 粗/精选择落 __locationPrecision 元数据。
 * #195 二期：photos 组 choice='selected'（ALLOW_SELECTED(12)）→ 布尔主态 true +
 * photoAccess.grantSelected（GRANTED_USER_SELECTED(5)，ACL 落 __photoSelected）；
 * choice='granted'（ALLOW_ALL(11)）→ 全量态，photoAccess.clear（无 ACL）。
 * #195 三期：choice='denied_more'（DONT_ALLOW_MORE_SELECTED(13)）→ 零变更落点 ——
 * DENIED_MORE(6) 语义：拒绝追加授权但既有 GRANTED_USER_SELECTED 与 ACL 原样保留
 * （Activity L1203-1204 点击映射；不撤权、不落 ACL、不改布尔主态）。
 */
function applyGroupChoice(appId, group, perms, choice, selected) {
  for (const p of perms) {
    if (choice === 'granted') setPermission(appId, p, true);
    else if (choice === 'once') oneTimeSessions.grant(appId, p); // GRANTED_ONE_TIME(4)：会话态
    else if (choice === 'selected') {
      // photos 组专用：布尔主态直写（不走 setPermission，避免其 clear 联动先于 grantSelected）
      if (!store[appId]) store[appId] = {};
      store[appId][p] = true;
      photoAccess.grantSelected(appId, selected || []); // _emit → persistPhotoAcl 全量同步落盘
    }
    else if (choice === 'denied_more') { /* DENIED_MORE(6)：现状保留，见上 JSDoc */ }
    else setPermission(appId, p, false);                          // 拒绝：持久化，之后不再重复询问
  }
  if (group === 'location' && store[appId] && store[appId].__locationPrecisionPending) {
    store[appId].__locationPrecision = store[appId].__locationPrecisionPending;
    delete store[appId].__locationPrecisionPending;
    saveStore();
  }
  notifyPrivacyItems(); // 会话态变化 → 状态栏隐私指示器即时对齐
}

/** 对话框串行队列 */
function enqueueDialog(opts) {
  return new Promise((resolve) => {
    dialogQueue.push({ opts, resolve });
    pumpDialogQueue();
  });
}

async function pumpDialogQueue() {
  if (dialogActive || !dialogQueue.length) return;
  dialogActive = true;
  const { opts, resolve } = dialogQueue.shift();
  let res = { act: 'denied', selected: null };
  try {
    res = await showPermissionDialog(opts);
  } catch (e) { res = { act: 'denied', selected: null }; }
  dialogActive = false;
  resolve(res);
  pumpDialogQueue();
}

/**
 * MD3 权限对话框（#195 一期：组感知）—— 复用电源弹窗的 .power-dialog-overlay /
 * .power-dialog-card 结构类保持视觉一致（模糊遮罩 + 28px 圆角卡片 + 弹性缩放入场），
 * z-index 抬升到应用窗口层之上（9500，低于系统 Toast 10000）。
 * 按钮序列按组映射十六态矩阵（纯逻辑层 grantButtonsFor 驱动，#195 二期起按钮循环渲染）；
 * location 组额外渲染粗/精双态单选（DIALOG_WITH_BOTH_LOCATIONS=3），选择值落
 * __locationPrecisionPending 由 applyGroupChoice 转正（用户点确认才落，取消/拒绝不记）。
 * #195 二期：photos 组（photoPicker=true）「选择照片」（ALLOW_SELECTED(12)）→ 同 overlay
 * 内嵌 picker 第二步：列出 VFS /photos/ 文件复选，确认落 ACL（GRANTED_USER_SELECTED(5)）。
 * #195 三期：kind='SELECT_MORE_PHOTOS' → 升级对话框 —— 按钮序列由 grantButtonsFor(group,{kind})
 * 驱动（拒绝侧 DONT_ALLOW_MORE_SELECTED(13)），标题升级态改为「选择更多」，picker 第二步
 * 预勾选当前 ACL 集合（确认 = grantSelected 全量替换：追加新勾选、收回取消勾选，
 * 与 AOSP photo picker 选择集持久化同语义）。
 * @returns {Promise<{act:'granted'|'once'|'denied'|'denied_more'|'selected', selected:(string[]|null)}>}
 */
function showPermissionDialog({ appId, appName, group, permissions, kind }) {
  return new Promise((resolve) => {
    const perms = permissions && permissions.length ? permissions : [group];
    const meta = PERMISSION_GROUPS[group] || PERMISSION_META[group] || { label: group, icon: 'lock', desc: '' };
    const btns = grantButtonsFor(group, kind ? { kind } : {}); // #195 三期：请求键驱动按钮矩阵
    const isMore = kind === 'SELECT_MORE_PHOTOS'; // #195 三期：SELECT_MORE_PHOTOS 升级对话框
    // 组内多权限列表（同组归并语义可见化）；单权限不展示列表（与既有单权限形态一致）
    const permList = perms.length > 1
      ? `<div style="margin:10px 0 0;padding:10px 12px;border-radius:12px;background:var(--md-surface-variant,hsl(var(--md-h,215) 20% 25% / 0.35));font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;">${perms.map((p) => `· ${escapeHtml((PERMISSION_GROUPS[p] || PERMISSION_META[p] || {}).label || p)}`).join('<br>')}</div>`
      : '';
    // location 双态粗精（DIALOG_WITH_BOTH_LOCATIONS=3）：md3 无粗/精权限分体，
    // 选择值仅落元数据 __locationPrecision —— 诚实标注，不冒充锚
    const locationPicker = btns.locationDialog != null
      ? `<div data-role="location-precision" style="margin:10px 0 0;display:flex;gap:6px;">
          <button data-precision="coarse" style="flex:1;padding:8px 10px;border-radius:14px;border:1.5px solid var(--md-outline,hsl(var(--md-h,215) 30% 55% / 0.5));background:none;color:var(--md-on-surface-variant,#9a9b9e);font-size:12.5px;font-weight:600;cursor:pointer;">大致位置</button>
          <button data-precision="fine" style="flex:1;padding:8px 10px;border-radius:14px;border:1.5px solid var(--md-outline,hsl(var(--md-h,215) 30% 55% / 0.5));background:none;color:var(--md-on-surface-variant,#9a9b9e);font-size:12.5px;font-weight:600;cursor:pointer;">精确位置</button>
        </div>`
      : '';
    // #195 二期：按钮序列由 grantButtonsFor 驱动（主按钮=允许/允许全部实底，其余文本钮）
    const btnStyle = (act) => act === 'granted'
      ? 'background:hsl(var(--md-h,215) 80% 55%);border:none;color:#fff;font-size:13.5px;font-weight:600;padding:10px 20px;border-radius:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.25);'
      : 'background:none;border:none;color:hsl(var(--md-h,215) 80% 64%);font-size:13.5px;font-weight:600;padding:10px 14px;border-radius:20px;cursor:pointer;';
    const actionButtons = btns.buttons
      .map((b) => `<button data-act="${b.act}" style="${btnStyle(b.act)}">${b.label}</button>`)
      .join('\n          ');
    const overlay = document.createElement('div');
    overlay.className = 'power-dialog-overlay';
    overlay.id = 'md3PermissionOverlay';
    overlay.style.zIndex = '9500';
    overlay.innerHTML = `
      <div class="power-dialog-card" role="alertdialog" aria-label="权限请求">
        <div data-view="main" style="display:flex;align-items:center;gap:14px;">
          <div style="width:44px;height:44px;border-radius:50%;background:hsl(var(--md-h,215) 80% 60% / 0.16);color:hsl(var(--md-h,215) 80% 64%);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${ICONS[meta.icon] || ICONS.lock}
          </div>
          <div style="flex:1;min-width:0;">
            <div data-role="perm-title" style="font-size:16px;font-weight:600;color:var(--md-on-surface,#e2e2e9);line-height:1.4;">允许「${escapeHtml(appName)}」${isMore ? `选择更多${meta.label}` : `使用${meta.label}`}？</div>
            <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;line-height:1.5;">${isMore ? '已共享部分内容，可追加选择或升级为全部；拒绝则维持现有共享集合不变。' : ''}${meta.desc} · 可随时在 设置 › 应用权限管理 中修改</div>
            ${permList}
            ${locationPicker}
          </div>
        </div>
        <div data-view="main" style="display:flex;gap:8px;justify-content:flex-end;align-items:center;">
          ${actionButtons}
        </div>
        <div data-view="picker" style="display:none;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface,#e2e2e9);margin-bottom:8px;">${isMore ? '选择更多要共享的照片和视频（已勾选为当前共享集合）' : '选择要共享的照片和视频'}</div>
          <div data-role="picker-list" style="max-height:260px;overflow-y:auto;border-radius:12px;background:var(--md-surface-variant,hsl(var(--md-h,215) 20% 25% / 0.35));padding:8px;font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);">加载中…</div>
          <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:10px;">
            <button data-picker-back style="background:none;border:none;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;font-weight:600;padding:8px 12px;border-radius:20px;cursor:pointer;">返回</button>
            <div style="display:flex;gap:8px;align-items:center;">
              <button data-picker-all style="background:none;border:none;color:hsl(var(--md-h,215) 80% 64%);font-size:13px;font-weight:600;padding:8px 12px;border-radius:20px;cursor:pointer;">全选</button>
              <button data-picker-confirm style="background:hsl(var(--md-h,215) 80% 55%);border:none;color:#fff;font-size:13.5px;font-weight:600;padding:10px 18px;border-radius:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.25);">确认选择（<span data-role="picker-count">0</span>）</button>
            </div>
          </div>
        </div>
      </div>
    `;

    let precision = null; // location 粗/精选择（未选则不落）
    if (btns.locationDialog != null) {
      overlay.querySelectorAll('button[data-precision]').forEach((btn) => {
        btn.addEventListener('click', () => {
          precision = btn.getAttribute('data-precision');
          overlay.querySelectorAll('button[data-precision]').forEach((b) => {
            const on = b === btn;
            b.style.background = on ? 'hsl(var(--md-h,215) 80% 55% / 0.18)' : 'none';
            b.style.borderColor = on ? 'hsl(var(--md-h,215) 80% 60%)' : 'var(--md-outline,hsl(var(--md-h,215) 30% 55% / 0.5))';
            b.style.color = on ? 'hsl(var(--md-h,215) 80% 70%)' : 'var(--md-on-surface-variant,#9a9b9e)';
          });
        });
      });
    }

    // #195 二期：photos picker 第二步 —— VFS /photos/ 文件清单复选（桌面主上下文直调
    // window.__vfs，与 photos 应用 list 过滤同构：type=file 且 mime image/|video/）
    function switchView(view) {
      overlay.querySelectorAll('[data-view]').forEach((el) => {
        el.style.display = el.getAttribute('data-view') === view ? '' : 'none';
      });
    }
    async function openPicker() {
      switchView('picker');
      const listBox = overlay.querySelector('[data-role="picker-list"]');
      const countEl = overlay.querySelector('[data-role="picker-count"]');
      let names = [];
      try {
        const entries = (window.__vfs && typeof window.__vfs.list === 'function')
          ? await window.__vfs.list('/photos') : [];
        names = (entries || [])
          .filter((m) => m && m.type === 'file' && ((m.mime || '').startsWith('image/') || (m.mime || '').startsWith('video/')))
          .map((m) => m.name);
      } catch (e) { names = []; }
      if (!names.length) {
        listBox.innerHTML = '<div style="padding:14px;text-align:center;">相册暂无可共享的照片或视频</div>';
      } else {
        listBox.innerHTML = names.map((n) => `
          <label data-picker-item style="display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;cursor:pointer;">
            <input type="checkbox" data-name="${escapeHtml(n)}" style="accent-color:hsl(var(--md-h,215) 80% 55%);width:16px;height:16px;">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(n)}</span>
          </label>`).join('');
      }
      // #195 三期：升级态预勾选当前 ACL 集合（确认 = 全量替换，取消勾选 = 收回该张共享）
      if (isMore) {
        const have = new Set(photoAccess.allowed(appId));
        listBox.querySelectorAll('input[type="checkbox"]').forEach((b) => {
          if (have.has(b.getAttribute('data-name'))) b.checked = true;
        });
      }
      const syncCount = () => {
        countEl.textContent = listBox.querySelectorAll('input[type="checkbox"]:checked').length;
      };
      listBox.addEventListener('change', syncCount);
      overlay.querySelectorAll('[data-picker-all]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const boxes = listBox.querySelectorAll('input[type="checkbox"]');
          const allOn = boxes.length && [...boxes].every((b) => b.checked);
          boxes.forEach((b) => { b.checked = !allOn; });
          syncCount();
        });
      });
    }
    if (btns.photoPicker) {
      overlay.querySelectorAll('button[data-act="selected"]').forEach((btn) => {
        btn.addEventListener('click', () => { openPicker(); });
      });
    }

    const settle = (act, selected) => {
      if (overlay.style.visibility === 'hidden') return; // 防重复
      if (precision && store[appId]) { store[appId].__locationPrecisionPending = precision; }
      overlay.classList.remove('active');
      setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 220);
      resolve({ act, selected: selected || null });
    };

    overlay.querySelectorAll('button[data-act]').forEach((btn) => {
      const act = btn.getAttribute('data-act');
      if (btns.photoPicker && act === 'selected') return; // picker 入口由 photoPicker 绑定接管（openPicker 切视图，不落权）
      btn.addEventListener('click', () => settle(act));
    });
    overlay.querySelectorAll('[data-picker-back]').forEach((btn) => {
      btn.addEventListener('click', () => switchView('main'));
    });
    overlay.querySelectorAll('[data-picker-confirm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const names = [...overlay.querySelectorAll('[data-role="picker-list"] input[type="checkbox"]:checked')]
          .map((b) => b.getAttribute('data-name'));
        settle('selected', names);
      });
    });
    // 权限对话框强制显式选择：点击遮罩不关闭（与真 Android 行为一致）

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    if (navigator.vibrate) navigator.vibrate(12);
  });
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * #195 二期：photos 组访问态汇总（GET_PHOTO_ACCESS 回执载荷）。
 * mode：'all'（布尔 granted）/ 'selected'（GRANTED_USER_SELECTED 部分授权）/
 * 'all'（granted_one_time 会话态，会话内等同全量）/ 'none'（denied/unset）。
 * selected 仅 mode='selected' 时非空（ACL 快照）。
 */
export function getPhotoAccessState(appId) {
  const state = getPermissionState(appId, 'photos');
  if (state === 'granted') return { mode: 'all', selected: [] };
  if (state === 'granted_one_time') return { mode: 'all', selected: [] };
  if (state === 'granted_selected') return { mode: 'selected', selected: photoAccess.allowed(appId) };
  return { mode: 'none', selected: [] };
}

/**
 * 初始化权限系统：注册 iframe 权限请求路由 + 暴露设置页/调试入口。
 * 注意：e.source 反查 appId 的逻辑与 app-bus.js 同源（避免引入模块环而复制实现）。
 */
export function initPermissions() {
  // #195 一期：one-time 会话态回收挂点 —— 应用窗口关闭（任务移除）即回收该应用全部 one-time
  // （GRANTED_ONE_TIME 生命周期语义；app-window.js:838 既有 app-window-closed 事件，零新耦合）
  document.addEventListener('app-window-closed', (e) => {
    const appId = e.detail && e.detail.appId;
    if (appId && oneTimeSessions.size) {
      oneTimeSessions.revokeApp(appId);
      notifyPrivacyItems(); // 任务移除回收 → 指示器熄灭
    }
  });

  // #195 一期：AutoRevoke 惰性扫描（启动时 setTimeout 延后，不阻塞首屏）——
  // 30 天未使用的 granted 回 unset（回收 ≠ 拒绝；AutoRevokePermissions.kt revokeAppPermissions
  // L65 语义，md3 网页语境 30 天为协作建议口径，非照搬 framework 45 天）
  setTimeout(() => {
    try {
      const now = Date.now();
      for (const { appId, permission } of maybeAutoRevoke(store, now)) {
        revokePermission(appId, permission);
      }
    } catch (err) { /* 回收失败静默，不影响桌面启动 */ }
  }, 0);

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || !d.requestId) return;
    if (d.type !== 'REQUEST_PERMISSION' && d.type !== 'GET_PHOTO_ACCESS' && d.type !== 'PHOTO_CONTRIBUTED') return;
    const src = e.source;

    // 1) 立即 ACK：让子应用确认桌面具备权限服务（否则子应用走旧桌面超时兜底放行）
    if (d.type === 'REQUEST_PERMISSION') {
      try { if (src) src.postMessage({ type: 'PERMISSION_ACK', requestId: d.requestId }, '*'); } catch (err) {}
    }

    // 2) 反查来源应用（优先子应用自报，其次按 e.source 扫描实例容器）
    let appId = d.appId || '';
    if (!appId) {
      document.querySelectorAll('.app-instance-wrapper, [data-bus-app-id]').forEach((el) => {
        if (appId) return;
        el.querySelectorAll('iframe').forEach((iframe) => {
          try {
            if (iframe.contentWindow === src) {
              appId = el.getAttribute('data-bus-app-id') || (el.id || '').replace('app-instance-', '');
            }
          } catch (err) {}
        });
      });
    }

    // 3) #195 二期：照片 ACL 查询桥（photos 应用 loadFromVfs 后按 mode/selected 过滤）
    if (d.type === 'GET_PHOTO_ACCESS') {
      try { if (src) src.postMessage({ type: 'PHOTO_ACCESS', requestId: d.requestId, ...getPhotoAccessState(appId) }, '*'); } catch (err) {}
      return;
    }

    // 4) #195 二期：own contribution —— 应用写入 VFS /photos/ 的文件自动追加进 ACL
    //    （AOSP「应用自产媒体对自身恒可见」同构；仅部分授权态追加，全量/拒绝态忽略）
    if (d.type === 'PHOTO_CONTRIBUTED') {
      const names = Array.isArray(d.names) ? d.names : [];
      if (appId && names.length && getPermissionState(appId, 'photos') === 'granted_selected') {
        photoAccess.addSelected(appId, names);
      }
      try { if (src) src.postMessage({ type: 'PHOTO_CONTRIBUTED_ACK', requestId: d.requestId }, '*'); } catch (err) {}
      return;
    }

    // 5) 走统一权限流程并回执（#195 一期：多权限组队列 —— REQUEST_PERMISSION 载荷可带
    //    permissions 数组；单权限载荷保持既有协议不变）
    const perms = Array.isArray(d.permissions) && d.permissions.length ? d.permissions : [d.permission];
    requestPermissions(perms, { appId, appName: d.appName })
      .then((results) => {
        const granted = results.every(Boolean); // 多权限回执：全放行才 granted（组队列全链对齐 AOSP 逐权限回执的保守聚合）
        try { if (src) src.postMessage({ type: 'PERMISSION_RESULT', requestId: d.requestId, granted }, '*'); } catch (err) {}
      });
  });

  window.__permissions = {
    requestPermission,
    requestPermissions,        // #195 一期：组队列入口
    getPermissionState,
    getPhotoAccessState,       // #195 二期：photos 组访问态（mode/selected 汇总）
    photoAccess,               // #195 二期：ACL 存储（无头观测钩子）
    filterByAclTest: filterByAcl, // #195 二期：ACL 过滤（无头观测钩子，与 photos 应用同构消费）
    getAllPermissions,
    setPermission,
    revokePermission,          // #195 一期：回收 = 回 unset（非 denied）
    clearAllPermissions,
    PERMISSION_META,
    PERMISSION_GROUPS,         // #195 一期：组模型（纯逻辑层同源导出）
    oneTimeSessions,           // #195 一期：会话态（无头观测钩子）
    privacyItemsFromSessions,  // #195 一期加餐：PrivacyItem 同构（无头观测钩子）
    notifyPrivacyItems,        // #195 一期加餐：指示器手动重播（无头观测钩子）
    maybeAutoRevoke: (now) => maybeAutoRevoke(store, now), // #195 一期：惰性扫描（无头观测钩子）
    AUTO_REVOKE_DAYS,
    MAX_DIALOGS_PER_PKG_TASK,
    RESULTS,
    BUTTONS,
    PHOTO_PICKER,              // #195 二期：Activity KEY_ 三键（无头观测钩子）
  };
}
