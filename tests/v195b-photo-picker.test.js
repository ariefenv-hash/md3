// ==================== v195b-photo-picker.test.js — v9.36 照片部分授权（#195 二期） ====================
//
// 权威快照（docs/reference/permission/，lineage-22.2 = AOSP main 同名路径可达镜像）：
//   - GrantPermissionsActivity.java（1293 行）—— SELECT_PHOTOS 按钮装配 L852-853 /
//     KEY_ 三键 L118-123 / DONT_ALLOW_MORE_SELECTED_BUTTON=13 L142
//   - GrantPermissionsViewHandler.java（136 行）—— GRANTED_USER_SELECTED=5 / DENIED_MORE=6（L49-50）
//
// 断言分组：
//   A. AOSP 快照锚（KEY 三键 + SELECT_PHOTOS 装配区段逐字）
//   B. 纯逻辑层真跑（PHOTO_PICKER 常量 / grantButtonsFor photos 三键 / PhotoAccess
//      全量替换·追加·回收·hydrate/toJSON / filterByAcl）
//   C. permissions.js 消费端接线静态锚（photos 组 / picker 第二步 / ACL 桥 / own contribution）
//   D. photos 应用接线静态锚（权限门前置 / ACL 过滤 / denied 提示条）
//   E. 版本真源 9.36.0

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  BUTTONS, RESULTS,
  PHOTO_PICKER, PHOTO_SELECTED_KEY, PhotoAccess, filterByAcl, grantButtonsFor,
  PERMISSION_GROUPS, groupRequests,
} from '../ios-desktop/js/aosp/grant-permissions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const read = (p) => readFileSync(join(repoRoot, p), 'utf-8');

describe('v9.36 · A. AOSP 快照锚（Activity KEY_ 三键 + SELECT_PHOTOS 装配）', () => {
  const act = read('docs/reference/permission/GrantPermissionsActivity.java');

  it('A1 KEY_ 三键逐字（L118-123 类全名前缀拼接）', () => {
    expect(act).toContain('public static final String KEY_RESTRICTED_REQUESTED_PERMISSIONS =');
    expect(act).toContain('public static final String KEY_UNRESTRICTED_REQUESTED_PERMISSIONS =');
    expect(act).toContain('public static final String KEY_ORIGINAL_REQUESTED_PERMISSIONS =');
    expect(act).toContain('GrantPermissionsActivity.class.getName() + "_RESTRICTED_REQUESTED_PERMISSIONS";');
    expect(act).toContain('GrantPermissionsActivity.class.getName() + "_UNRESTRICTED_REQUESTED_PERMISSIONS";');
    expect(act).toContain('GrantPermissionsActivity.class.getName() + "_ORIGINAL_REQUESTED_PERMISSIONS";');
  });

  it('A2 SELECT_PHOTOS 按钮装配 L852-853 逐字（ALLOW_ALL + ALLOW_SELECTED）', () => {
    expect(act).toContain('case SELECT_PHOTOS, SELECT_MORE_PHOTOS ->');
    expect(act).toContain('buttons.addAll(Arrays.asList(ALLOW_ALL_BUTTON, ALLOW_SELECTED_BUTTON));');
  });

  it('A3 picker 域按钮/结果常量逐字（11/12/13 + GRANTED_USER_SELECTED=5/DENIED_MORE=6）', () => {
    expect(act).toContain('public static final int ALLOW_ALL_BUTTON = 11; // button for options with a picker, allow all');
    expect(act).toContain('public static final int ALLOW_SELECTED_BUTTON = 12; // allow selected, with picker');
    expect(act).toContain('public static final int DONT_ALLOW_MORE_SELECTED_BUTTON = 13;');
    const handler = read('docs/reference/permission/GrantPermissionsViewHandler.java');
    expect(handler).toContain('int GRANTED_USER_SELECTED = 5; // The user has used a picker to select data to share');
    expect(handler).toContain('int DENIED_MORE = 6; // The user has used the picker at least once, but has denied a request');
  });

  it('A4 纯逻辑层常量同构（BUTTONS/RESULTS/PHOTO_PICKER 键名全量）', () => {
    expect(BUTTONS.ALLOW_ALL).toBe(11);
    expect(BUTTONS.ALLOW_SELECTED).toBe(12);
    expect(BUTTONS.DONT_ALLOW_MORE_SELECTED).toBe(13);
    expect(RESULTS.GRANTED_USER_SELECTED).toBe(5);
    expect(RESULTS.DENIED_MORE).toBe(6);
    expect(PHOTO_PICKER.KEY_RESTRICTED_REQUESTED_PERMISSIONS)
      .toBe('com.android.permissioncontroller.permission.ui.GrantPermissionsActivity_RESTRICTED_REQUESTED_PERMISSIONS');
    expect(PHOTO_PICKER.KEY_UNRESTRICTED_REQUESTED_PERMISSIONS)
      .toBe('com.android.permissioncontroller.permission.ui.GrantPermissionsActivity_UNRESTRICTED_REQUESTED_PERMISSIONS');
    expect(PHOTO_PICKER.KEY_ORIGINAL_REQUESTED_PERMISSIONS)
      .toBe('com.android.permissioncontroller.permission.ui.GrantPermissionsActivity_ORIGINAL_REQUESTED_PERMISSIONS');
    expect(PHOTO_SELECTED_KEY).toBe('__photoSelected');
  });
});

describe('v9.36 · B. 纯逻辑层真跑', () => {
  it('B1 photos 组模型：PERMISSION_GROUPS.photos 在册 + groupRequests 归并', () => {
    expect(PERMISSION_GROUPS.photos).toBeTruthy();
    expect(PERMISSION_GROUPS.photos.label).toBe('照片和视频');
    const reqs = groupRequests(['photos', 'camera', 'photos']);
    expect(reqs.length).toBe(2); // photos 组 + camera 组（同组收拢去重）
    expect(reqs[0].group).toBe('photos');
    expect(reqs[0].permissions).toEqual(['photos']);
    expect(reqs[1].group).toBe('camera');
  });

  it('B2 grantButtonsFor photos 三键（DENY(3)/ALLOW_SELECTED(12)/ALLOW_ALL(11) + photoPicker）', () => {
    const b = grantButtonsFor('photos');
    expect(b.photoPicker).toBe(true);
    expect(b.locationDialog).toBeNull();
    expect(b.buttons.map((x) => x.act)).toEqual(['denied', 'selected', 'granted']);
    expect(b.buttons.map((x) => x.aosp)).toEqual([BUTTONS.DENY, BUTTONS.ALLOW_SELECTED, BUTTONS.ALLOW_ALL]);
    expect(b.buttons.map((x) => x.aosp)).toEqual([3, 12, 11]);
    expect(b.buttons[2].label).toBe('允许全部');
    expect(b.buttons[1].label).toBe('选择照片');
    // 既有组不受影响（回归锚）
    const loc = grantButtonsFor('location');
    expect(loc.photoPicker).toBe(false);
    expect(loc.locationDialog).not.toBeNull();
    expect(loc.buttons.map((x) => x.aosp)).toEqual([3, 5, 0]);
    const cam = grantButtonsFor('camera');
    expect(cam.photoPicker).toBe(false);
  });

  it('B3 PhotoAccess.grantSelected 全量替换（GRANTED_USER_SELECTED 落定 + 去重保序）', () => {
    const acl = new PhotoAccess(null);
    const out = acl.grantSelected('photos', ['b.jpg', 'a.jpg', 'b.jpg']);
    expect(out).toEqual(['b.jpg', 'a.jpg']); // 去重保序
    expect(acl.allowed('photos')).toEqual(['b.jpg', 'a.jpg']);
    expect(acl.mode('photos')).toBe('selected');
    // 全量替换语义：再次 grantSelected 覆盖旧集合
    acl.grantSelected('photos', ['c.jpg']);
    expect(acl.allowed('photos')).toEqual(['c.jpg']);
  });

  it('B4 PhotoAccess.addSelected 追加（own contribution / NO_UPGRADE 域再选择）', () => {
    const acl = new PhotoAccess(null);
    acl.grantSelected('photos', ['a.jpg']);
    const merged = acl.addSelected('photos', ['b.jpg', 'a.jpg']);
    expect(merged).toEqual(['a.jpg', 'b.jpg']);
    expect(acl.allowed('photos')).toEqual(['a.jpg', 'b.jpg']);
    // 未知应用追加即建档
    acl.addSelected('other', ['x.png']);
    expect(acl.mode('other')).toBe('selected');
  });

  it('B5 PhotoAccess 回收链：clear/revokeApp/revokeAll + onChange 全量同步', () => {
    const seen = [];
    const acl = new PhotoAccess((json) => seen.push(json));
    acl.grantSelected('photos', ['a.jpg']);
    acl.grantSelected('notes', ['b.png']);
    expect(seen.length).toBe(2);
    expect(acl.clear('photos')).toBe(true);
    expect(acl.clear('photos')).toBe(false); // 幂等
    expect(acl.mode('photos')).toBeNull();
    expect(acl.size).toBe(1);
    expect(acl.revokeApp('notes')).toBe(true);
    expect(acl.size).toBe(0);
    acl.grantSelected('x', ['1']);
    expect(acl.revokeAll()).toBe(1);
    expect(seen[seen.length - 1]).toEqual({}); // onChange 全量快照
  });

  it('B6 PhotoAccess hydrate/toJSON（permissions store 持久环）', () => {
    const acl = new PhotoAccess(null);
    acl.hydrate({ photos: ['a.jpg', 'b.jpg'], notes: [] });
    expect(acl.allowed('photos')).toEqual(['a.jpg', 'b.jpg']);
    expect(acl.allowed('notes')).toEqual([]);
    expect(acl.mode('notes')).toBe('selected'); // 空数组也是部分授权态
    expect(acl.toJSON()).toEqual({ photos: ['a.jpg', 'b.jpg'], notes: [] });
    // 非数组灌入降级空集合
    const acl2 = new PhotoAccess(null);
    acl2.hydrate({ photos: 'bad' });
    expect(acl2.allowed('photos')).toEqual([]);
  });

  it('B7 filterByAcl 真跑（对象数组 + 纯文件名数组双形态，保序）', () => {
    const entries = [
      { name: 'a.jpg', type: 'file', mime: 'image/jpeg' },
      { name: 'b.jpg', type: 'file', mime: 'image/jpeg' },
      { name: 'c.mp4', type: 'file', mime: 'video/mp4' },
    ];
    expect(filterByAcl(entries, ['c.mp4', 'a.jpg']).map((e) => e.name)).toEqual(['a.jpg', 'c.mp4']);
    expect(filterByAcl(entries, []).length).toBe(0);        // 空集合 = 零可见
    expect(filterByAcl(entries, null).length).toBe(0);      // 空 ACL 防御
    expect(filterByAcl(['x', 'y', 'z'], ['y'])).toEqual(['y']); // 纯文件名形态
  });
});

describe('v9.36 · C. permissions.js 消费端接线静态锚（循环导入环防复发）', () => {
  const src = read('ios-desktop/js/permissions.js');

  it('C1 photos 组注册 + 五态判定链（granted_selected 免重复弹框）', () => {
    expect(src).toContain("photos:        { label: '照片和视频', icon: 'image'");
    expect(src).toContain("'granted_selected'"); // 第五态
    // v10.68 三期滚动：granted 拆分为独立行；granted_selected 分支 default 免弹框语义保留
    // （显式 upgrade 再请求 → SELECT_MORE_PHOTOS 升级对话框，锚见 v195c C1）
    expect(src).toContain("if (state === 'granted' || state === 'granted_one_time') { result[list.indexOf(p)] = true; return false; }");
    expect(src).toContain("if (state === 'granted_selected') {");
    expect(src).toContain('result[list.indexOf(p)] = true; return false;');
  });

  it('C2 picker 第二步：ALLOW_SELECTED 入口 + VFS 清单复选 + 确认落权', () => {
    expect(src).toContain('if (btns.photoPicker && act === \'selected\') return;'); // 不落权只切视图
    expect(src).toContain("window.__vfs.list('/photos')");
    expect(src).toContain("startsWith('image/') || (m.mime || '').startsWith('video/')"); // 与 photos 应用过滤同构
    expect(src).toContain("data-picker-confirm");
    expect(src).toContain("settle('selected', names)");
    expect(src).toContain("resolve({ act, selected: selected || null })");
  });

  it('C3 applyGroupChoice selected 分支（布尔主态 + grantSelected）', () => {
    expect(src).toContain("else if (choice === 'selected')");
    expect(src).toContain('photoAccess.grantSelected(appId, selected || [])');
  });

  it('C4 ACL 桥：GET_PHOTO_ACCESS → PHOTO_ACCESS { mode, selected }', () => {
    expect(src).toContain("d.type !== 'GET_PHOTO_ACCESS' && d.type !== 'PHOTO_CONTRIBUTED'");
    expect(src).toContain("type: 'PHOTO_ACCESS', requestId: d.requestId, ...getPhotoAccessState(appId)");
    expect(src).toContain("getPhotoAccessState");
  });

  it('C5 own contribution 桥：PHOTO_CONTRIBUTED 仅部分授权态追加', () => {
    expect(src).toContain("getPermissionState(appId, 'photos') === 'granted_selected'");
    expect(src).toContain('photoAccess.addSelected(appId, names)');
  });

  it('C6 回收/重置联动（revoke/setPermission/clearAll/removeApp → ACL 同清）', () => {
    expect(src).toContain("if (permission === 'photos') photoAccess.clear(appId); // selected photos 集合同清");
    expect(src).toContain('photoAccess.revokeAll(); // #195 二期：ACL 随权限存储整体重置');
    expect(src).toContain('photoAccess.clear(appId);\n  saveStore();');
  });

  it('C7 persistPhotoAcl 全量同步语义（clear 后 store 无残留）', () => {
    expect(src).toContain('if (rec && PHOTO_SELECTED_KEY in rec) delete rec[PHOTO_SELECTED_KEY];');
    expect(src).toContain('photoAccess.hydrate(seeded)');
  });

  it('C8 调试面扩展（getPhotoAccessState/photoAccess/PHOTO_PICKER 无头观测钩子）', () => {
    expect(src).toContain('getPhotoAccessState,       // #195 二期：photos 组访问态（mode/selected 汇总）');
    expect(src).toContain('photoAccess,               // #195 二期：ACL 存储（无头观测钩子）');
    expect(src).toContain('PHOTO_PICKER,              // #195 二期：Activity KEY_ 三键（无头观测钩子）');
  });
});

describe('v9.36 · D. photos 应用接线静态锚', () => {
  const src = read('ios-desktop/apps/photos/index.html');

  it('D1 权限门前置（ensurePhotoAccess 于 loadFromVfs 首行）', () => {
    expect(src).toContain("await sys.requestPermission('photos')");
    expect(src).toContain('sys.getPhotoAccess');
    expect(src).toContain('await ensurePhotoAccess(); // #195 二期：权限门前置（拒绝 → 空相册 + 提示条）');
  });

  it('D2 ACL 过滤（granted_selected 只见选中子集）', () => {
    expect(src).toContain("if (photoAccessMode === 'selected')");
    expect(src).toContain('const allow = new Set(photoAccessSelected);');
    expect(src).toContain('files = files.filter(m => allow.has(m.name));');
  });

  it('D3 denied 降级（空相册 + 提示条 + 导入门 + 总线门）', () => {
    expect(src).toContain("if (photoAccessMode === 'none') { renderGrid(); updateUI(); return; }");
    expect(src).toContain('photosAclBanner');
    expect(src).toContain('相册权限被拒绝');
    expect((src.match(/updateDeniedBanner\(\); return; \}/g) || []).length).toBeGreaterThanOrEqual(2); // 总线门 + 导入门
  });

  it('D4 own contribution 上报（selected 态 notifyPhotoContributed）', () => {
    expect((src.match(/notifyPhotoContributed\(\[/g) || []).length).toBeGreaterThanOrEqual(2); // 总线推送 + 导入两路
    expect(src).toContain('window.__system.notifyPhotoContributed([name])');
    expect(src).toContain('window.__system.notifyPhotoContributed([file.name])');
  });

  it('D5 main.js SDK 注入（getPhotoAccess/notifyPhotoContributed 桥函数）', () => {
    const main = read('ios-desktop/js/main.js');
    expect(main).toContain('getPhotoAccess: function()');
    expect(main).toContain("type: 'GET_PHOTO_ACCESS', requestId: rid");
    expect(main).toContain("d.type !== 'PHOTO_ACCESS'");
    expect(main).toContain('notifyPhotoContributed: function(names)');
    expect(main).toContain("type: 'PHOTO_CONTRIBUTED', requestId: rid, names:");
  });
});

describe('v9.36 · E. 版本真源', () => {
  it('E1 package.json version = 9.36.0', () => {
    expect(JSON.parse(read('package.json')).version).toBe('10.68.0');
  });

  it('E2 纯逻辑层版本锚 v9.36', () => {
    expect(read('ios-desktop/js/aosp/grant-permissions.js')).toContain('v10.68');
  });
});
