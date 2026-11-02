// ==================== e2e-v195b-photo-picker.mjs — #195 二期照片部分授权无头回归（R55 窗） ====================
//
// DoD（GrantPermissionsActivity.java L852-853 SELECT_PHOTOS 装配 + ViewHandler GRANTED_USER_SELECTED=5）：
//   Q0  __permissions 调试面二期扩展在位（getPhotoAccessState / photoAccess / PHOTO_PICKER / 组数 6）
//   Q1  photos 组对话框三键渲染（不允许/选择照片/允许全部）——「选择照片」点击不落权、切 picker 视图
//   Q2  picker 第二步：VFS /photos/ 清单复选 → 勾 2/3 → 确认 → GRANTED_USER_SELECTED 落权
//   Q3  落权对账：granted_selected 第五态 + ACL 快照 + __photoSelected 持久化 + 二次申请免弹框
//   Q4  photos 应用真开（openAppById）：允许全部 → 全量可见（3 张）+ camera 总线推送直进
//   Q5  部分授权金链路：photos 重开 → 选择照片（勾 1/3）→ 相册只见 1 张（ACL 过滤可见化）
//       → 总线推送 own contribution → ACL 自动追加 → 相册出现第 2 张
//   Q6  回收联动：revokePermission photos → 回 unset + ACL 同清
//   Q7  全程零 pageerror
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v195');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

async function waitOverlay(page, timeout = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const has = await page.evaluate(() => !!document.querySelector('#md3PermissionOverlay'));
    if (has) return true;
    await sleep(60);
  }
  return false;
}
async function waitOverlayGone(page, timeout = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const has = await page.evaluate(() => !!document.querySelector('#md3PermissionOverlay'));
    if (!has) { await sleep(80); return true; }
    await sleep(60);
  }
  return false;
}

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await sleep(1500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(500);

// ---------- Q1 前置：VFS 预置三张照片 + 清理权限存量 ----------
const seeded = await page.evaluate(async (png) => {
  try { localStorage.removeItem('ios-desktop:permissions'); } catch (e) {}
  const vfs = window.__vfs;
  await vfs.write('/photos/a_alpha.png', png, { mime: 'image/png' });
  await vfs.write('/photos/b_beta.png', png, { mime: 'image/png' });
  await vfs.write('/photos/c_gamma.png', png, { mime: 'image/png' });
  const entries = await vfs.list('/photos');
  return entries.filter((m) => m.type === 'file').map((m) => m.name).sort();
}, PNG);
A('Q1a VFS 预置三张照片', seeded.length >= 3 && seeded.includes('a_alpha.png') && seeded.includes('b_beta.png') && seeded.includes('c_gamma.png'), JSON.stringify(seeded));

// ---------- Q0：调试面二期扩展 ----------
const surface = await page.evaluate(() => {
  const w = window.__permissions;
  return {
    has: !!w,
    aclState: w && typeof w.getPhotoAccessState === 'function',
    acl: w && w.photoAccess && typeof w.photoAccess.grantSelected === 'function',
    keys: w && w.PHOTO_PICKER && w.PHOTO_PICKER.KEY_RESTRICTED_REQUESTED_PERMISSIONS.includes('_RESTRICTED_REQUESTED_PERMISSIONS'),
    groups: w && w.PERMISSION_GROUPS && Object.keys(w.PERMISSION_GROUPS).length === 6,
    filter: w && typeof w.filterByAclTest === 'function',
  };
});
A('Q0 调试面二期扩展在位', surface.has && surface.aclState && surface.acl && surface.keys && surface.groups && surface.filter, JSON.stringify(surface));

// ---------- Q1：photos 组对话框三键 + 「选择照片」不落权 ----------
const q1req = page.evaluate(() => {
  window.__q1 = window.__permissions.requestPermissions(['photos'], { appId: 'e2e195b', appName: 'E2E195B' });
  return true;
});
await q1req;
const ov1 = await waitOverlay(page);
const q1ui = ov1 ? await page.evaluate(() => {
  const card = document.querySelector('#md3PermissionOverlay .power-dialog-card');
  const btns = [...card.querySelectorAll('button[data-act]')].map((b) => ({ act: b.getAttribute('data-act'), label: b.textContent.trim() }));
  const pickerView = card.querySelector('[data-view="picker"]');
  return { text: card.textContent, btns, pickerHidden: pickerView && pickerView.style.display === 'none' };
}) : null;
A('Q1a 对话框三键渲染（不允许/选择照片/允许全部）',
  q1ui && q1ui.btns.some((b) => b.act === 'denied' && b.label === '不允许')
  && q1ui.btns.some((b) => b.act === 'selected' && b.label === '选择照片')
  && q1ui.btns.some((b) => b.act === 'granted' && b.label === '允许全部'),
  JSON.stringify(q1ui && q1ui.btns));
A('Q1b 文案锚「照片和视频」', q1ui && q1ui.text.includes('照片和视频'));

// 点「选择照片」→ 不落权 + picker 视图出现
await page.evaluate(() => document.querySelector('#md3PermissionOverlay button[data-act="selected"]').click());
await sleep(400);
const q1c = await page.evaluate(() => {
  const card = document.querySelector('#md3PermissionOverlay .power-dialog-card');
  const picker = card.querySelector('[data-view="picker"]');
  const items = [...picker.querySelectorAll('input[type="checkbox"][data-name]')].map((b) => b.getAttribute('data-name'));
  return { visible: picker.style.display !== 'none', items, state: window.__permissions.getPermissionState('e2e195b', 'photos') };
});
A('Q1c picker 视图出现且未落权', q1c.visible && q1c.state === 'unset', `state=${q1c.state}`);
A('Q1d picker 列出 VFS 三文件', q1c.items.length >= 3 && q1c.items.includes('a_alpha.png'), JSON.stringify(q1c.items));

// ---------- Q2：勾选 2/3 → 确认 → GRANTED_USER_SELECTED 落权 ----------
await page.evaluate(() => {
  const card = document.querySelector('#md3PermissionOverlay .power-dialog-card');
  card.querySelectorAll('input[type="checkbox"][data-name]').forEach((b) => {
    if (b.getAttribute('data-name') === 'a_alpha.png' || b.getAttribute('data-name') === 'c_gamma.png') b.checked = true;
  });
  card.querySelector('[data-picker-confirm]').click();
});
await waitOverlayGone(page);
const q1res = await page.evaluate(() => window.__q1);
A('Q2a 授权回执 true', Array.isArray(q1res) && q1res[0] === true, JSON.stringify(q1res));

// ---------- Q3：落权对账（第五态 + ACL + 持久化 + 免重复弹框） ----------
const q3 = await page.evaluate(() => {
  const w = window.__permissions;
  return {
    state: w.getPermissionState('e2e195b', 'photos'),
    aclState: w.getPhotoAccessState('e2e195b'),
    stored: (w.getAllPermissions().e2e195b || {}).__photoSelected,
    allowed: w.photoAccess.allowed('e2e195b'),
  };
});
A('Q3a 第五态 granted_selected', q3.state === 'granted_selected', q3.state);
A('Q3b ACL 快照对账（a+c）', q3.aclState.mode === 'selected' && q3.aclState.selected.includes('a_alpha.png') && q3.aclState.selected.includes('c_gamma.png'), JSON.stringify(q3.aclState));
A('Q3c __photoSelected 持久化', Array.isArray(q3.stored) && q3.stored.length === 2, JSON.stringify(q3.stored));

const q3d = await page.evaluate(() => {
  const before = !!document.querySelector('#md3PermissionOverlay');
  window.__permissions.requestPermission('photos', { appId: 'e2e195b' });
  return before;
});
await sleep(600);
const q3e = await page.evaluate(() => !!document.querySelector('#md3PermissionOverlay'));
A('Q3d 二次申请免弹框（granted_selected 不重复询问）', !q3d && !q3e);

// ---------- Q4：photos 应用真开（允许全部 → 全量可见 + 总线推送直进） ----------
const opened = await page.evaluate(() => {
  try { window.__shareSheet.openAppById('photo'); return true; } catch (e) { return String(e); }
});
await sleep(800);
const ov2 = await waitOverlay(page);
const q4ovTitle = ov2 ? await page.evaluate(() => document.querySelector('#md3PermissionOverlay .power-dialog-card').textContent) : '';
A('Q4a photos 应用自身申请弹框（appId 反查）', opened === true && ov2 && q4ovTitle.includes('照片和视频'), q4ovTitle.slice(0, 50));
if (ov2) {
  await page.evaluate(() => document.querySelector('#md3PermissionOverlay button[data-act="granted"]').click()); // 允许全部
  await waitOverlayGone(page);
}
await sleep(900);
const q4b = await page.evaluate(() => {
  const iframe = document.querySelector('[data-bus-app-id="photo"] iframe, #app-instance-photo iframe');
  if (!iframe) return { found: false };
  const win = iframe.contentWindow;
  const grid = win.document.querySelectorAll('.media-item').length;
  const banner = !!win.document.getElementById('photosAclBanner');
  return { found: true, grid, banner };
});
A('Q4b 允许全部 → 相册全量可见（≥3 张零提示条）', q4b.found && q4b.grid >= 3 && !q4b.banner, JSON.stringify(q4b));

// camera → photos 总线推送（all 态直进）
await page.evaluate(() => {
  const iframe = document.querySelector('[data-bus-app-id="photo"] iframe, #app-instance-photo iframe');
  iframe.contentWindow.postMessage({ type: 'BUS_DELIVER', event: 'photo/captured', payload: { id: 'busD', src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', name: 'd_bus.png' } }, '*');
});
await sleep(600);
const q4c = await page.evaluate(() => {
  const iframe = document.querySelector('[data-bus-app-id="photo"] iframe, #app-instance-photo iframe');
  return { grid: iframe.contentWindow.document.querySelectorAll('.media-item').length };
});
A('Q4c 总线推送直进（all 态 +1）', q4c.grid >= 4, `grid=${q4c.grid}`);

// ---------- Q5：部分授权金链路（重开 photos → 选择照片 1/3 → ACL 可见化 → own contribution） ----------
await page.evaluate(() => {
  // 任务栏主页键（真实用户关闭应用路径 → closeApp → app-window-closed）
  const btn = document.querySelector('.taskbar-nav-btn[data-nav="home"]');
  if (btn) btn.click();
});
await sleep(1200); // 关闭动画收场
const closed = await page.evaluate(() => !document.querySelector('[data-bus-app-id="photo"], #app-instance-photo'));
await page.evaluate(() => {
  window.__permissions.revokePermission('photo', 'photos'); // 回 unset + ACL 同清
});
// v7.63 Home 键 = 挂起实例保留：重开不重跑页面脚本 —— 强制 reload photos iframe
// 触发重新 ensurePhotoAccess（等价真实「应用被系统回收后重启重新申请」路径）
await page.evaluate(() => {
  const iframe = document.querySelector('[data-bus-app-id="photo"] iframe, #app-instance-photo iframe');
  if (iframe && iframe.contentWindow) { try { iframe.contentWindow.location.reload(); } catch (e) {} }
});
await sleep(1200);
const q5reopened = await page.evaluate(() => {
  try { window.__shareSheet.openAppById('photo'); return true; } catch (e) { return String(e); }
});
await sleep(800);
const ov3 = await waitOverlay(page);
if (ov3) {
  // 进入 picker：勾 1/3（a_alpha.png）确认
  await page.evaluate(() => document.querySelector('#md3PermissionOverlay button[data-act="selected"]').click());
  await sleep(400);
  await page.evaluate(() => {
    const card = document.querySelector('#md3PermissionOverlay .power-dialog-card');
    card.querySelectorAll('input[type="checkbox"][data-name]').forEach((b) => {
      if (b.getAttribute('data-name') === 'a_alpha.png') b.checked = true;
    });
    card.querySelector('[data-picker-confirm]').click();
  });
  await waitOverlayGone(page);
}
await sleep(900);
const q5a = await page.evaluate(() => {
  const iframe = document.querySelector('[data-bus-app-id="photo"] iframe, #app-instance-photo iframe');
  if (!iframe) return { found: false };
  const win = iframe.contentWindow;
  const names = [...win.document.querySelectorAll('.media-item')].map((el) => el.getAttribute('data-name') || el.textContent || '');
  return {
    found: true,
    grid: win.document.querySelectorAll('.media-item').length,
    state: window.__permissions.getPermissionState('photo', 'photos'),
    acl: window.__permissions.getPhotoAccessState('photo'),
  };
});
A('Q5a 部分授权落定（photos 应用 granted_selected）', q5a.found && q5a.state === 'granted_selected' && q5a.acl.mode === 'selected', JSON.stringify(q5a));
A('Q5b ACL 过滤可见化（相册只见 1 张）', q5a.grid === 1, `grid=${q5a.grid}`);

// own contribution：总线推送 → ACL 自动追加 → 相册第 2 张
await page.evaluate(() => {
  const iframe = document.querySelector('[data-bus-app-id="photo"] iframe, #app-instance-photo iframe');
  iframe.contentWindow.postMessage({ type: 'BUS_DELIVER', event: 'photo/captured', payload: { id: 'busE', src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', name: 'e_own.png' } }, '*');
});
await sleep(700);
const q5c = await page.evaluate(() => {
  const iframe = document.querySelector('[data-bus-app-id="photo"] iframe, #app-instance-photo iframe');
  return {
    grid: iframe.contentWindow.document.querySelectorAll('.media-item').length,
    acl: window.__permissions.getPhotoAccessState('photo'),
  };
});
A('Q5c own contribution 自动追加（ACL 含 e_own.png + 相册 2 张）',
  q5c.acl.selected.includes('e_own.png') && q5c.grid === 2, JSON.stringify(q5c));

// ---------- Q6：回收联动（回 unset + ACL 同清） ----------
const q6 = await page.evaluate(() => {
  window.__permissions.revokePermission('photo', 'photos');
  return {
    state: window.__permissions.getPermissionState('photo', 'photos'),
    acl: window.__permissions.getPhotoAccessState('photo'),
    stored: (window.__permissions.getAllPermissions().photo || {}).__photoSelected,
  };
});
A('Q6 回收回 unset + ACL 同清', q6.state === 'unset' && q6.acl.mode === 'none' && q6.stored === undefined, JSON.stringify(q6));

// ---------- Q7：零 pageerror ----------
A('Q7 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));

console.log(`\n==== e2e-v195b-photo-picker: ${pass} pass / ${fail} fail ====`);
await page.screenshot({ path: join(OUT, 'v195b-final.png') });
await browser.close();
process.exit(fail ? 1 : 0);
