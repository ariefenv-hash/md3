// ==================== v195-grant-permissions.test.js — v9.36 权限系统一期（#195） ====================
//
// 权威快照（docs/reference/permission/，lineage-22.2 = AOSP main 同名路径可达镜像，逐字节入库）：
//   - GrantPermissionsActivity.java（1293 行）—— 十六态按钮矩阵 L127-143 / MAX_DIALOGS_PER_PKG_TASK L161
//   - GrantPermissionsViewHandler.java（136 行）—— @Result 结果常量 L38-50
//   - GrantPermissionsViewModel.kt（1500 行）—— addRequiredGroupStates 组归并 L487-527
//   - AutoRevokePermissions.kt（296 行）+ AutoRevokePermissions.proto（51 行，last_time_visible L4）
//   - AutoRevokedPackagesLiveData.kt（167 行）
//
// 断言分组：
//   A. AOSP 快照在册（六件行数 + 关键区段逐字）
//   B. 纯逻辑层真跑（常量矩阵 / 组归并 / 按钮映射 / one-time 会话态 / AutoRevoke 边界）
//   C. permissions.js 消费端接线静态锚（循环导入环防复发；行为真跑见 e2e-v195-permission-grant.mjs）
//   D. 版本真源 9.36.0

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  BUTTONS, RESULTS, MAX_DIALOGS_PER_PKG_TASK,
  PERMISSION_GROUPS, permissionToGroup, groupRequests,
  LOCATION_DIALOG, LOCATION_PRECISION, grantButtonsFor,
  OneTimeSessions, AUTO_REVOKE_DAYS, maybeAutoRevoke,
  PRIVACY_TYPES, privacyItemsFromSessions,
} from '../ios-desktop/js/aosp/grant-permissions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const permDir = join(repoRoot, 'docs/reference/permission');
const read = (p) => readFileSync(join(repoRoot, p), 'utf-8');

describe('v9.36 · A. AOSP 快照在册（六件逐字）', () => {
  it('A1 GrantPermissionsActivity.java 1293 行 + 十六态常量 L127-143 逐字', () => {
    const src = readFileSync(join(permDir, 'GrantPermissionsActivity.java'), 'utf-8');
    expect(src.trimEnd().split('\n').length).toBe(1293);
    expect(src).toContain('public static final int ALLOW_BUTTON = 0;');
    expect(src).toContain('public static final int ALLOW_ALWAYS_BUTTON = 1; // Used in auto');
    expect(src).toContain('public static final int ALLOW_FOREGROUND_BUTTON = 2;');
    expect(src).toContain('public static final int DENY_BUTTON = 3;');
    expect(src).toContain('public static final int DENY_AND_DONT_ASK_AGAIN_BUTTON = 4;');
    expect(src).toContain('public static final int ALLOW_ONE_TIME_BUTTON = 5;');
    expect(src).toContain('public static final int NO_UPGRADE_OT_BUTTON = 8; // one-time');
    expect(src).toContain('public static final int LINK_TO_SETTINGS = 10;');
    expect(src).toContain('public static final int ALLOW_ALL_BUTTON = 11; // button for options with a picker, allow all');
    expect(src).toContain('public static final int ALLOW_SELECTED_BUTTON = 12; // allow selected, with picker');
    expect(src).toContain('public static final int NEXT_BUTTON = 15;');
    expect(src).toContain('public static final int MAX_DIALOGS_PER_PKG_TASK = 10;');
  });

  it('A2 GrantPermissionsViewHandler.java 136 行 + @Result 常量 L38-50 逐字', () => {
    const src = readFileSync(join(permDir, 'GrantPermissionsViewHandler.java'), 'utf-8');
    expect(src.trimEnd().split('\n').length).toBe(136);
    expect(src).toContain('int CANCELED = -1;');
    expect(src).toContain('int GRANTED_ALWAYS = 0;');
    expect(src).toContain('int GRANTED_FOREGROUND_ONLY = 1;');
    expect(src).toContain('int DENIED = 2;');
    expect(src).toContain('int DENIED_DO_NOT_ASK_AGAIN = 3;');
    expect(src).toContain('int GRANTED_ONE_TIME = 4;');
    expect(src).toContain('int GRANTED_USER_SELECTED = 5; // The user has used a picker to select data to share');
    expect(src).toContain('int DENIED_MORE = 6; // The user has used the picker at least once, but has denied a request');
  });

  it('A3 GrantPermissionsViewModel.kt 1500 行 + 组归并 addRequiredGroupStates 区段在册', () => {
    const src = readFileSync(join(permDir, 'GrantPermissionsViewModel.kt'), 'utf-8');
    expect(src.trimEnd().split('\n').length).toBe(1500);
    expect(src).toContain('private val groupStates = mutableMapOf<String, GroupState>()');
    expect(src).toContain('internal class GroupState(');
    expect(src).toContain('private fun addRequiredGroupStates(groups: List<LightAppPermGroup>) {');
    expect(src).toContain('private fun setRequestInfosFromGroupStates() {');
  });

  it('A4 AutoRevokePermissions.kt 296 行 + proto last_time_visible 字段在册', () => {
    const kt = readFileSync(join(permDir, 'AutoRevokePermissions.kt'), 'utf-8');
    expect(kt.trimEnd().split('\n').length).toBe(296);
    expect(kt).toContain('suspend fun revokeAppPermissions(');
    const proto = readFileSync(join(permDir, 'AutoRevokePermissions.proto'), 'utf-8');
    expect(proto.trimEnd().split('\n').length).toBe(51);
    expect(proto).toContain('optional int64 last_time_visible = 4;');
    expect(proto).toContain('optional bool is_auto_revoked = 7;');
    const live = readFileSync(join(permDir, 'AutoRevokedPackagesLiveData.kt'), 'utf-8');
    expect(live.trimEnd().split('\n').length).toBe(167);
  });
});

describe('v9.36 · B. 纯逻辑层真跑', () => {
  it('B1 常量矩阵逐字：十六态按钮 + @Result + MAX_DIALOGS_PER_PKG_TASK', () => {
    expect(BUTTONS).toEqual({
      NEXT: 15, ALLOW: 0, ALLOW_ALWAYS: 1, ALLOW_FOREGROUND: 2, DENY: 3,
      DENY_AND_DONT_ASK_AGAIN: 4, ALLOW_ONE_TIME: 5, NO_UPGRADE: 6,
      NO_UPGRADE_AND_DONT_ASK_AGAIN: 7, NO_UPGRADE_OT: 8, NO_UPGRADE_OT_AND_DONT_ASK_AGAIN: 9,
      LINK_TO_SETTINGS: 10, ALLOW_ALL: 11, ALLOW_SELECTED: 12,
      DONT_ALLOW_MORE_SELECTED: 13, LINK_TO_PERMISSION_RATIONALE: 14,
    });
    expect(RESULTS).toEqual({
      LINKED_TO_PERMISSION_RATIONALE: -3, LINKED_TO_SETTINGS: -2, CANCELED: -1,
      GRANTED_ALWAYS: 0, GRANTED_FOREGROUND_ONLY: 1, DENIED: 2,
      DENIED_DO_NOT_ASK_AGAIN: 3, GRANTED_ONE_TIME: 4, GRANTED_USER_SELECTED: 5, DENIED_MORE: 6,
    });
    expect(MAX_DIALOGS_PER_PKG_TASK).toBe(10);
    expect(LOCATION_DIALOG.DIALOG_WITH_BOTH_LOCATIONS).toBe(3);
    expect(LOCATION_DIALOG.FINE_RADIO_BUTTON).toBe(1);
    expect(LOCATION_DIALOG.COARSE_RADIO_BUTTON).toBe(2);
    expect(LOCATION_PRECISION).toEqual({ FINE: 'fine', COARSE: 'coarse' });
  });

  it('B2 组模型：md3 五类映射 AOSP 组名 + permissionToGroup', () => {
    expect(Object.keys(PERMISSION_GROUPS).sort()).toEqual(['camera', 'clipboard', 'location', 'microphone', 'notifications', 'photos']); // #195 二期：photos 组入册
    expect(permissionToGroup('camera')).toBe('camera');
    expect(permissionToGroup('nope')).toBe(null);
  });

  it('B3 组归并：同组收拢 / 组间保序 / 未知剔除 / 空入空出', () => {
    // 同组多权限收拢（AOSP addRequiredGroupStates 语义）
    expect(groupRequests(['camera', 'camera', 'camera'])).toEqual([{ group: 'camera', permissions: ['camera'] }]);
    // 组间保序（首次出现序 = manifest 请求顺序同构）
    expect(groupRequests(['microphone', 'camera', 'clipboard'])).toEqual([
      { group: 'microphone', permissions: ['microphone'] },
      { group: 'camera', permissions: ['camera'] },
      { group: 'clipboard', permissions: ['clipboard'] },
    ]);
    // 未知权限不产生组请求（消费端默认放行契约）
    expect(groupRequests(['camera', 'nope', 'location'])).toEqual([
      { group: 'camera', permissions: ['camera'] },
      { group: 'location', permissions: ['location'] },
    ]);
    expect(groupRequests([])).toEqual([]);
    expect(groupRequests(null)).toEqual([]);
  });

  it('B4 按钮映射：三键 → 十六态（ALLOW=0/ALLOW_ONE_TIME=5/DENY=3）+ location 双态', () => {
    const cam = grantButtonsFor('camera');
    expect(cam.locationDialog).toBe(null);
    expect(cam.buttons.map((b) => b.aosp)).toEqual([BUTTONS.DENY, BUTTONS.ALLOW_ONE_TIME, BUTTONS.ALLOW]);
    expect(cam.buttons.map((b) => b.act)).toEqual(['denied', 'once', 'granted']);
    const loc = grantButtonsFor('location');
    expect(loc.locationDialog).toBe(LOCATION_DIALOG.DIALOG_WITH_BOTH_LOCATIONS);
  });

  it('B5 one-time 会话态：grant/state/revokeApp 按应用回收/revokeAll', () => {
    const s = new OneTimeSessions();
    expect(s.state('cam', 'camera')).toBe(null);
    s.grant('cam', 'camera');
    s.grant('cam', 'microphone');
    s.grant('stt', 'microphone');
    expect(s.size).toBe(3);
    expect(s.state('cam', 'camera')).toBe('granted_one_time');
    // 任务移除：cam 窗口关闭回收 2 条，stt 不受影响
    expect(s.revokeApp('cam')).toBe(2);
    expect(s.state('cam', 'camera')).toBe(null);
    expect(s.state('stt', 'microphone')).toBe('granted_one_time');
    expect(s.revokeAll()).toBe(1);
    expect(s.size).toBe(0);
    expect(s.revokeApp('ghost')).toBe(0);
  });

  it('B7 隐私指示器：PrivacyItem 同构（三类过滤/字典序/字段齐/keys 迭代）', () => {
    expect(PRIVACY_TYPES).toEqual({
      TYPE_CAMERA: 'camera', TYPE_MICROPHONE: 'microphone',
      TYPE_LOCATION: 'location', TYPE_MEDIA_PROJECTION: 'media_projection',
    });
    const s = new OneTimeSessions();
    s.grant('cam', 'camera');
    s.grant('rec', 'microphone');
    s.grant('w', 'location');
    s.grant('x', 'notifications'); // 非三类运行时组 → 不上指示
    s.grant('mp', 'clipboard');    // 同上
    const items = privacyItemsFromSessions(s.keys(), 12345);
    expect(items.map((i) => i.privacyType)).toEqual(['camera', 'location', 'microphone']); // 字典序（ChipBuilder.sorted）
    expect(items[0]).toEqual({ privacyType: 'camera', application: { packageName: 'cam' }, timeStampElapsed: 12345, paused: false }); // PrivacyItem data class 字段齐
    expect(privacyItemsFromSessions([])).toEqual([]);
    expect(privacyItemsFromSessions(null)).toEqual([]);
    expect(typeof s.keys().next).toBe('function'); // keys() 迭代器（notifyPrivacyItems 消费面）
  });

  it('B6 AutoRevoke：30 天边界 / denied 与 unset 不动 / 无 lastAccess 不判定 / 多权限逐条', () => {
    const NOW = 1_800_000_000_000;
    const DAY = 24 * 60 * 60 * 1000;
    const store = {
      // 31 天前使用，granted camera + denied microphone → 只回收 camera
      stale: { __lastAccess: NOW - 31 * DAY, camera: true, microphone: false },
      // 29 天前使用 → 保留
      fresh: { __lastAccess: NOW - 29 * DAY, location: true },
      // 恰好 30 天（边界 = 阈值内保留）
      edge: { __lastAccess: NOW - 30 * DAY, notifications: true },
      // 从未打点（无观测即无判定）→ 不回收
      neverTouched: { camera: true },
      // 只有 denied → 不回收
      onlyDenied: { __lastAccess: NOW - 40 * DAY, clipboard: false },
    };
    const out = maybeAutoRevoke(store, NOW);
    expect(out).toEqual([{ appId: 'stale', permission: 'camera' }]);
    // 自定义阈值：days=45（framework 口径对照）→ stale 31 天仍在阈值内不回收
    expect(maybeAutoRevoke(store, NOW, { days: 45 })).toEqual([]);
    expect(AUTO_REVOKE_DAYS).toBe(30);
    // 多权限逐条回收
    const multi = maybeAutoRevoke({ a: { __lastAccess: NOW - 40 * DAY, camera: true, location: true } }, NOW);
    expect(multi).toEqual([{ appId: 'a', permission: 'camera' }, { appId: 'a', permission: 'location' }]);
  });
});

// ==================== C. permissions.js 消费端接线（静态锚） ====================
// 循环导入环防复发（历史坑）：permissions.js → apps-data.js → 应用模块 → state.js 存在环，
// vitest 真跑会踩环（_initialApps undefined）—— 行为真跑走 e2e-v195-permission-grant.mjs
// （真实浏览器无环问题），vitest 侧以 readFileSync+正则静态锚锁定接线契约。

const permSrc = () => read('ios-desktop/js/permissions.js');

describe('v9.36 · C. permissions.js 消费端接线（静态锚，行为真跑见 e2e-v195）', () => {
  it('C1 纯逻辑层 import + 组队列入口 + 会话态实例 + 回收挂点接线', () => {
    const src = permSrc();
    expect(src).toContain("from './aosp/grant-permissions.js'");
    expect(src).toContain('BUTTONS, RESULTS, MAX_DIALOGS_PER_PKG_TASK,');
    expect(src).toContain('PERMISSION_GROUPS, permissionToGroup, groupRequests,');
    expect(src).toContain('OneTimeSessions, AUTO_REVOKE_DAYS, maybeAutoRevoke,');
    expect(src).toContain('const oneTimeSessions = new OneTimeSessions();');
    expect(src).toContain('export async function requestPermissions(permissions, { appId, appName } = {})');
    expect(src).toContain('const groupReqs = groupRequests(pending);');
    expect(src).toContain("document.addEventListener('app-window-closed'");
    expect(src).toContain('oneTimeSessions.revokeApp(appId)');
  });

  it('C2 one-time 会话态落权 + 判定序：持久态 → granted_one_time → unset', () => {
    const src = permSrc();
    // GRANTED_ONE_TIME 会话内等同放行（判定序注释锚）
    expect(src).toContain("if (oneTimeSessions.state(appId, permission)) return 'granted_one_time';");
    expect(src).toContain("if (state === 'granted' || state === 'granted_one_time' || state === 'granted_selected') { result[list.indexOf(p)] = true; return false; }"); // #195 二期：部分授权免重复弹框
    // once → 会话态授子（不落盘），granted/denied → 持久化
    expect(src).toContain("else if (choice === 'once') oneTimeSessions.grant(appId, p);");
    // 拒绝持久化 + 回收 = 回 unset（AutoRevoke 语义：回收 ≠ 拒绝）
    expect(src).toContain('export function revokePermission(appId, permission) {');
    expect(src).toContain('delete store[appId][permission];');
  });

  it('C3 AutoRevoke 接线：惰性扫描 + __lastAccess 打点（last_time_visible 同构）', () => {
    const src = permSrc();
    expect(src).toContain('for (const { appId, permission } of maybeAutoRevoke(store, now)) {');
    expect(src).toContain('revokePermission(appId, permission);');
    expect(src).toContain('store[appId].__lastAccess = now;');
    expect(src).toContain("if (permission === 'photos' && Array.isArray(rec[PHOTO_SELECTED_KEY])) return 'granted_selected';"); // #195 二期：第五态先于打点
    expect(src).toContain('touchLastAccess(appId); // AppOps lastAccess 语义：运行时校验算使用');
    expect(src).toContain('touchLastAccess(appId);                      // 申请即使用打点（AutoRevoke 时钟）');
  });

  it('C4 组对话框：组感知渲染 + location 双态粗精 + 多权限列表', () => {
    const src = permSrc();
    expect(src).toContain('function showPermissionDialog({ appId, appName, group, permissions }) {');
    expect(src).toContain('const btns = grantButtonsFor(group);');
    expect(src).toContain('const locationPicker = btns.locationDialog != null');
    expect(src).toContain('data-precision="coarse"');
    expect(src).toContain('data-precision="fine"');
    expect(src).toContain('data-role="location-precision"');
    expect(src).toContain('__locationPrecisionPending');
    expect(src).toContain('__locationPrecision = store[appId].__locationPrecisionPending;');
  });

  it('C5 既有契约保留：未知权限放行 / 无 appId 放行 / 强制显式选择 / clipboard 判定', () => {
    const src = permSrc();
    expect(src).toContain("if (!appId) return result;                     // 无来源上下文（父模块自身）默认放行");
    expect(src).toContain('// 未知权限类型默认放行，不阻塞子应用（既有契约）；逐权限标记放行');
    expect(src).toContain('// 权限对话框强制显式选择：点击遮罩不关闭（与真 Android 行为一致）');
    expect(src).toContain("export function getPermissionState(appId, permission) {"); // 导出面不变（clipboard.js 既有消费端契约）
    // iframe 协议扩展：多权限载荷兼容单权限载荷
    expect(src).toContain("Array.isArray(d.permissions) && d.permissions.length ? d.permissions : [d.permission]");
  });

  it('C7 __permissions 调试面扩展锚：组模型/会话态/扫描钩子/常量全量暴露', () => {
    const src = permSrc();
    expect(src).toContain('requestPermissions,        // #195 一期：组队列入口');
    expect(src).toContain('revokePermission,          // #195 一期：回收 = 回 unset（非 denied）');
    expect(src).toContain('PERMISSION_GROUPS,         // #195 一期：组模型（纯逻辑层同源导出）');
    expect(src).toContain('oneTimeSessions,           // #195 一期：会话态（无头观测钩子）');
    expect(src).toContain('maybeAutoRevoke: (now) => maybeAutoRevoke(store, now), // #195 一期：惰性扫描（无头观测钩子）');
    expect(src).toContain('MAX_DIALOGS_PER_PKG_TASK,');
    expect(src).toContain('RESULTS,');
    expect(src).toContain('BUTTONS,');
  });

  it('C8 隐私指示器接线：notifyPrivacyItems 派发 + status-bar chip 消费渲染', () => {
    const perm = permSrc();
    expect(perm).toContain("document.dispatchEvent(new CustomEvent('privacy-items-changed', { detail: { items } }));");
    expect(perm).toContain('notifyPrivacyItems(); // 会话态变化 → 状态栏隐私指示器即时对齐');
    expect(perm).toContain('notifyPrivacyItems(); // 任务移除回收 → 指示器熄灭');
    expect(perm).toContain('privacyItemsFromSessions,  // #195 一期加餐：PrivacyItem 同构（无头观测钩子）');
    const sb = read('ios-desktop/js/status-bar.js');
    expect(sb).toContain("import { PRIVACY_TYPES } from './aosp/grant-permissions.js';");
    expect(sb).toContain('buildPrivacyChipHtml()');
    expect(sb).toContain("document.addEventListener('privacy-items-changed'");
    expect(sb).toContain("PRIVACY_ICONS");
    expect(sb).toContain("camera: 'camera_access'");
    expect(sb).toContain("microphone: 'mic_access'");
    expect(sb).toContain("location: 'location_on'");
  });
});

describe('v9.36 · D. 版本真源', () => {
  it('D1 package.json 9.36.0', () => {
    expect(JSON.parse(read('package.json')).version).toBe('9.40.0');
  });
  it('D2 纯逻辑层文件在位 + permissions.js 接线锚', () => {
    const gp = read('ios-desktop/js/aosp/grant-permissions.js');
    expect(gp).toContain('GrantPermissionsActivity.java L127-143');
    expect(gp).toContain('last_time_visible');
    const perm = read('ios-desktop/js/permissions.js');
    expect(perm).toContain("from './aosp/grant-permissions.js'");
    expect(perm).toContain('app-window-closed');
    expect(perm).toContain('oneTimeSessions.grant');
    expect(perm).toContain('maybeAutoRevoke(store, now)');
  });
});
