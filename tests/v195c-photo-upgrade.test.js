// ==================== v195c-photo-upgrade.test.js — v9.60 照片升级链（#195 三期） ====================
//
// 权威快照（docs/reference/permission/，lineage-22.2 = AOSP main 同名路径可达镜像）：
//   - GrantPermissionsActivity.java（1293 行）—— SELECT_PHOTOS/SELECT_MORE_PHOTOS 装配 L852-853 /
//     denyButton switch L856-859（DONT_SELECT_MORE → DONT_ALLOW_MORE_SELECTED）/
//     按钮常量 L133-142 / GRANTED_USER_SELECTED→ALLOW_SELECTED 点击映射 L1200-1201 /
//     DENIED_MORE→DONT_ALLOW_MORE_SELECTED 点击映射 L1203-1204 / READ_MEDIA_VISUAL+USER_SELECTED
//     → openPhotoPicker L998-1003
//   - GrantPermissionsViewModel.kt（1500 行）—— Prompt.SELECT_MORE_PHOTOS L1478（注释逐字）/
//     DenyButton.DONT_SELECT_MORE L1498（注释逐字）
//   - GrantPermissionsViewHandler.java（136 行）—— GRANTED_USER_SELECTED=5 / DENIED_MORE=6（L49-50）
//
// 断言分组：
//   A. AOSP 快照锚（升级链五区段逐字）
//   B. 纯逻辑层真跑（photoRequestKind / denyButtonFor / grantButtonsFor 两形态 + 向后兼容）
//   C. permissions.js 消费端接线静态锚（upgrade 显式再请求分支 / denied_more 零变更落点 /
//      kind 透传 / 升级态标题与 picker 预勾选）
//   D. 版本真源 9.60.0

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  BUTTONS, RESULTS,
  photoRequestKind, denyButtonFor, grantButtonsFor,
} from '../ios-desktop/js/aosp/grant-permissions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const read = (p) => readFileSync(join(repoRoot, p), 'utf-8');

describe('v9.60 · A. AOSP 快照锚（SELECT_MORE_PHOTOS 升级链五区段）', () => {
  const act = read('docs/reference/permission/GrantPermissionsActivity.java');
  const vm = read('docs/reference/permission/GrantPermissionsViewModel.kt');

  it('A1 Prompt 枚举两态注释逐字（ViewModel L1477-1478）+ DenyButton.DONT_SELECT_MORE（L1498）', () => {
    expect(vm).toContain('SELECT_PHOTOS, // Select photos/allow all photos/deny');
    expect(vm).toContain("SELECT_MORE_PHOTOS, // Select more photos/allow all photos/don't allow more");
    expect(vm).toContain('DONT_SELECT_MORE, // used in the SELECT_MORE_PHOTOS dialog');
  });

  it('A2 denyButton switch 逐字（L856-859：DENY → 3 / DONT_SELECT_MORE → 13）', () => {
    expect(act).toContain('case DENY -> buttons.add(DENY_BUTTON);');
    expect(act).toContain('case DONT_SELECT_MORE -> buttons.add(DONT_ALLOW_MORE_SELECTED_BUTTON);');
  });

  it('A3 按钮常量逐字（L133-142：ALLOW_ALL=11 / ALLOW_SELECTED=12 / DONT_ALLOW_MORE_SELECTED=13）', () => {
    expect(act).toContain('public static final int ALLOW_ALL_BUTTON = 11; // button for options with a picker, allow all');
    expect(act).toContain('public static final int ALLOW_SELECTED_BUTTON = 12; // allow selected, with picker');
    expect(act).toContain('public static final int DONT_ALLOW_MORE_SELECTED_BUTTON = 13;');
  });

  it('A4 结果点击映射逐字（L1200-1204：GRANTED_USER_SELECTED→12 / DENIED_MORE→13）', () => {
    expect(act).toContain('case GRANTED_USER_SELECTED:');
    expect(act).toContain('clickedButton = 1 << ALLOW_SELECTED_BUTTON;');
    expect(act).toContain('case DENIED_MORE:');
    expect(act).toContain('clickedButton = 1 << DONT_ALLOW_MORE_SELECTED_BUTTON;');
  });

  it('A5 READ_MEDIA_VISUAL + USER_SELECTED → openPhotoPicker（L998-1003）', () => {
    expect(act).toContain('if (Objects.equals(READ_MEDIA_VISUAL, name) && result == GRANTED_USER_SELECTED) {');
    expect(act).toContain('mViewModel.openPhotoPicker(this);');
  });
});

describe('v9.60 · B. 纯逻辑层真跑（photoRequestKind / denyButtonFor / grantButtonsFor）', () => {
  it('B1 photoRequestKind：granted_selected → SELECT_MORE_PHOTOS，其余全态 → SELECT_PHOTOS', () => {
    expect(photoRequestKind('granted_selected')).toBe('SELECT_MORE_PHOTOS');
    expect(photoRequestKind('granted')).toBe('SELECT_PHOTOS');
    expect(photoRequestKind('granted_one_time')).toBe('SELECT_PHOTOS');
    expect(photoRequestKind('denied')).toBe('SELECT_PHOTOS');
    expect(photoRequestKind('unset')).toBe('SELECT_PHOTOS');
    expect(photoRequestKind(null)).toBe('SELECT_PHOTOS');
    expect(photoRequestKind(undefined)).toBe('SELECT_PHOTOS');
  });

  it('B2 denyButtonFor 两态（SELECT_PHOTOS→DENY(3) / SELECT_MORE_PHOTOS→DONT_ALLOW_MORE_SELECTED(13)）', () => {
    const first = denyButtonFor('SELECT_PHOTOS');
    expect(first).toEqual({ act: 'denied', aosp: BUTTONS.DENY, label: '不允许' });
    expect(first.aosp).toBe(3);
    const more = denyButtonFor('SELECT_MORE_PHOTOS');
    expect(more.act).toBe('denied_more');
    expect(more.aosp).toBe(BUTTONS.DONT_ALLOW_MORE_SELECTED);
    expect(more.aosp).toBe(13);
    expect(more.label).toBe('不允许更多照片');
  });

  it('B3 grantButtonsFor photos 缺省形态与二期逐字节兼容（3/12/11 + 原标签）', () => {
    const b = grantButtonsFor('photos');
    expect(b.photoPicker).toBe(true);
    expect(b.locationDialog).toBeNull();
    expect(b.buttons.map((x) => x.act)).toEqual(['denied', 'selected', 'granted']);
    expect(b.buttons.map((x) => x.aosp)).toEqual([3, 12, 11]);
    expect(b.buttons.map((x) => x.label)).toEqual(['不允许', '选择照片', '允许全部']);
    // 显式 SELECT_PHOTOS 请求键同形态（两入口等价）
    const b2 = grantButtonsFor('photos', { kind: 'SELECT_PHOTOS' });
    expect(b2.buttons.map((x) => x.aosp)).toEqual([3, 12, 11]);
    expect(b2.buttons.map((x) => x.label)).toEqual(['不允许', '选择照片', '允许全部']);
  });

  it('B4 grantButtonsFor photos 升级形态（13/12/11 + 选择更多照片标签）', () => {
    const b = grantButtonsFor('photos', { kind: 'SELECT_MORE_PHOTOS' });
    expect(b.photoPicker).toBe(true);
    expect(b.locationDialog).toBeNull();
    expect(b.buttons.map((x) => x.act)).toEqual(['denied_more', 'selected', 'granted']);
    expect(b.buttons.map((x) => x.aosp)).toEqual([13, 12, 11]);
    expect(b.buttons.map((x) => x.label)).toEqual(['不允许更多照片', '选择更多照片', '允许全部']);
  });

  it('B5 非 photos 组不受请求键影响（camera 组常规三键原样）', () => {
    const b = grantButtonsFor('camera', { kind: 'SELECT_MORE_PHOTOS' });
    expect(b.photoPicker).toBe(false);
    expect(b.buttons.map((x) => x.aosp)).toEqual([BUTTONS.DENY, BUTTONS.ALLOW_ONE_TIME, BUTTONS.ALLOW]);
  });
});

describe('v9.60 · C. permissions.js 消费端接线静态锚', () => {
  const src = read('ios-desktop/js/permissions.js');

  it('C1 显式再请求入口：签名 upgrade 形参 + granted_selected upgrade 分支 + default 免询问契约保留', () => {
    expect(src).toContain('export async function requestPermissions(permissions, { appId, appName, upgrade } = {})');
    expect(src).toContain('if (upgrade) return true; // SELECT_MORE_PHOTOS：升级对话框待询问');
    expect(src).toContain('result[list.indexOf(p)] = true; return false;');
    // 二期「免重复询问」注释语义保留（default 无升级意图不弹框）
    expect(src).toContain('photos 应用每次开启都过权限门，不升级会退化为每次开启即弹框');
  });

  it('C2 请求键判定与透传：some(granted_selected) → SELECT_MORE_PHOTOS → enqueueDialog kind', () => {
    expect(src).toContain('grantButtonsFor, photoRequestKind, // #195 三期：请求键判定');
    expect(src).toContain("upgrade && req.permissions.some((p) => getPermissionState(appId, p) === 'granted_selected')");
    expect(src).toContain("? photoRequestKind('granted_selected') // 'SELECT_MORE_PHOTOS'");
    expect(src).toContain('await enqueueDialog({ appId, appName: displayName, group: req.group, permissions: req.permissions, kind })');
  });

  it('C3 DENIED_MORE 零变更落点 + 放行语义（res.act !== \'denied\' → granted_selected 延续）', () => {
    expect(src).toContain("else if (choice === 'denied_more') { /* DENIED_MORE(6)：现状保留，见上 JSDoc */ }");
    expect(src).toContain("req.permissions.forEach((p) => { result[list.indexOf(p)] = res.act !== 'denied'; });");
    expect(src).toContain('denied_more（DENIED_MORE(6)）≠ 拒绝：既有 GRANTED_USER_SELECTED 授权延续');
  });

  it('C4 升级对话框渲染：kind 驱动按钮矩阵 + 标题选择更多 + picker 预勾选 ACL', () => {
    expect(src).toContain('function showPermissionDialog({ appId, appName, group, permissions, kind })');
    expect(src).toContain('const btns = grantButtonsFor(group, kind ? { kind } : {});');
    expect(src).toContain("const isMore = kind === 'SELECT_MORE_PHOTOS';");
    expect(src).toContain('isMore ? `选择更多${meta.label}` : `使用${meta.label}`');
    expect(src).toContain('已共享部分内容，可追加选择或升级为全部；拒绝则维持现有共享集合不变。');
    // picker 预勾选（升级态）+ 确认全量替换
    expect(src).toContain('// #195 三期：升级态预勾选当前 ACL 集合（确认 = 全量替换，取消勾选 = 收回该张共享）');
    expect(src).toContain('const have = new Set(photoAccess.allowed(appId));');
    expect(src).toContain("if (have.has(b.getAttribute('data-name'))) b.checked = true;");
  });

  it('C5 RESULTS.DENIED_MORE 与纯逻辑常量一致（结果域映射完备）', () => {
    expect(RESULTS.DENIED_MORE).toBe(6);
    expect(RESULTS.GRANTED_USER_SELECTED).toBe(5);
    expect(BUTTONS.DONT_ALLOW_MORE_SELECTED).toBe(13);
  });
});

describe('v9.60 · D. 版本真源', () => {
  it('D1 package.json 9.60.0', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.version).toBe('9.60.0');
  });

  it('D2 纯逻辑层头部版本链锚（v9.60 三期在册）', () => {
    const gp = read('ios-desktop/js/aosp/grant-permissions.js');
    expect(gp).toContain('三期照片升级链 v9.60');
  });
});
