// ==================== e2e-v195c-photo-upgrade.mjs — #195 三期照片升级链无头回归（R61 窗） ====================
//
// DoD（GrantPermissionsActivity.java L852-859 SELECT_MORE_PHOTOS 装配 + denyButton DONT_SELECT_MORE
//      + ViewHandler DENIED_MORE=6 + ViewModel Prompt.SELECT_MORE_PHOTOS L1478）：
//   Q1  首授链路：photos 对话框三键（3/12/11）→ 选择照片勾 2/3 → 确认 → granted_selected + ACL=2
//   Q2  二期契约保持：granted_selected 无升级意图再请求（default）→ 免弹框直接放行
//   Q3  升级对话框渲染：显式再请求（upgrade:true）→ SELECT_MORE_PHOTOS 三键（13/12/11）
//       + 标题「选择更多照片和视频」+ 无 data-act="denied" 按钮
//   Q4  DENIED_MORE 零变更落点：不允许更多照片 → 状态 granted_selected 保持 + ACL 原样（2 张）
//   Q5  选择更多照片升级：picker 预勾选当前 ACL 2 张 → 勾第 3 张 → 确认 → ACL=3（全量替换语义）
//   Q6  允许全部升级：granted 全量态 + ACL 清空
//   Q7  全程零 pageerror
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v195');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html';
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const APP = 'e2e195c';
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

// ---------- Q1：首授链路（选择照片 2/3 → granted_selected + ACL=2） ----------
await page.evaluate((app) => {
  window.__p = window.__permissions.requestPermissions(['photos'], { appId: app, appName: 'E2E195C' });
}, APP);
A('Q1b photos 首次对话框弹出', await waitOverlay(page));
const q1btns = await page.evaluate(() =>
  [...document.querySelectorAll('#md3PermissionOverlay button[data-act]')].map((b) => b.getAttribute('data-act')));
A('Q1c 首授三键形态（denied/selected/granted，无 denied_more）',
  JSON.stringify(q1btns) === JSON.stringify(['denied', 'selected', 'granted']), JSON.stringify(q1btns));
await page.evaluate(() => {
  document.querySelector('#md3PermissionOverlay button[data-act="selected"]').click();
});
await sleep(600); // picker 视图构建（vfs.list 异步）
const pick1 = await page.evaluate(() => {
  const boxes = [...document.querySelectorAll('#md3PermissionOverlay [data-role="picker-list"] input[type="checkbox"]')];
  boxes.filter((b) => ['a_alpha.png', 'b_beta.png'].includes(b.getAttribute('data-name'))).forEach((b) => { b.checked = true; });
  return boxes.length;
});
A('Q1d picker 清单三张', pick1 === 3, `boxes=${pick1}`);
await page.evaluate(() => document.querySelector('#md3PermissionOverlay [data-picker-confirm]').click());
const r1 = await page.evaluate(async (app) => {
  const res = await window.__p;
  return {
    res,
    state: window.__permissions.getPermissionState(app, 'photos'),
    acl: window.__permissions.getPhotoAccessState(app),
  };
}, APP);
A('Q1e 首授落定 granted_selected + ACL=2',
  r1.res[0] === true && r1.state === 'granted_selected' && r1.acl.mode === 'selected' && r1.acl.selected.length === 2,
  JSON.stringify(r1));
await waitOverlayGone(page); // 同上：确认后先等旧框退场

// ---------- Q2：二期契约保持（无升级意图再请求 → 免弹框放行） ----------
const q2 = await page.evaluate(async (app) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms)); // 浏览器上下文内联等待（Node 侧 sleep 不可见）
  const p = window.__permissions.requestPermissions(['photos'], { appId: app, appName: 'E2E195C' });
  await wait(1000);
  const overlayDuring = !!document.querySelector('#md3PermissionOverlay');
  const res = await p;
  return { overlayDuring, res };
}, APP);
A('Q2 无升级意图再请求免弹框直接放行（二期契约）',
  q2.overlayDuring === false && q2.res[0] === true, JSON.stringify(q2));

// ---------- Q3：升级对话框渲染（upgrade:true → SELECT_MORE_PHOTOS） ----------
await page.evaluate((app) => {
  window.__p2 = window.__permissions.requestPermissions(['photos'], { appId: app, appName: 'E2E195C', upgrade: true });
}, APP);
A('Q3a 升级对话框弹出', await waitOverlay(page));
const q3 = await page.evaluate(() => {
  const ov = document.querySelector('#md3PermissionOverlay');
  const btns = [...ov.querySelectorAll('button[data-act]')].map((b) => ({
    act: b.getAttribute('data-act'),
    label: b.textContent.trim(),
  }));
  const title = ov.querySelector('[data-role="perm-title"]')?.textContent || '';
  return { btns, title, hasPlainDeny: !!ov.querySelector('button[data-act="denied"]') };
});
A('Q3b 升级三键（denied_more/selected/granted = 13/12/11 语义）',
  JSON.stringify(q3.btns.map((b) => b.act)) === JSON.stringify(['denied_more', 'selected', 'granted'])
  && q3.btns.find((b) => b.act === 'denied_more')?.label === '不允许更多照片'
  && q3.btns.find((b) => b.act === 'selected')?.label === '选择更多照片'
  && q3.btns.find((b) => b.act === 'granted')?.label === '允许全部', JSON.stringify(q3.btns));
A('Q3c 标题升级态「选择更多照片和视频」', q3.title.includes('选择更多照片和视频'), q3.title);
A('Q3d 无常规拒绝键（denyButton switch：DONT_SELECT_MORE 替换 DENY）', q3.hasPlainDeny === false);

// ---------- Q4：DENIED_MORE 零变更落点 ----------
await page.evaluate(() => document.querySelector('#md3PermissionOverlay button[data-act="denied_more"]').click());
const q4 = await page.evaluate(async (app) => {
  const res = await window.__p2;
  return {
    res,
    state: window.__permissions.getPermissionState(app, 'photos'),
    acl: window.__permissions.getPhotoAccessState(app),
  };
}, APP);
A('Q4a 不允许更多照片 → 放行 true（DENIED_MORE ≠ 拒绝）',
  q4.res[0] === true && (await waitOverlayGone(page)), JSON.stringify({ res: q4.res }));
A('Q4b 状态与 ACL 原样保留（granted_selected + 2 张不变）',
  q4.state === 'granted_selected' && q4.acl.mode === 'selected' && q4.acl.selected.length === 2,
  JSON.stringify(q4.acl));

// ---------- Q5：选择更多照片升级（预勾选 2 + 新勾 1 → ACL=3） ----------
await page.evaluate((app) => {
  window.__p3 = window.__permissions.requestPermissions(['photos'], { appId: app, appName: 'E2E195C', upgrade: true });
}, APP);
await waitOverlay(page);
await page.evaluate(() => document.querySelector('#md3PermissionOverlay button[data-act="selected"]').click());
await sleep(600);
const q5pre = await page.evaluate(() => {
  const boxes = [...document.querySelectorAll('#md3PermissionOverlay [data-role="picker-list"] input[type="checkbox"]')];
  return boxes.map((b) => ({ name: b.getAttribute('data-name'), checked: b.checked }));
});
A('Q5a picker 预勾选当前 ACL 两张（a_alpha/b_beta）',
  q5pre.length === 3
  && q5pre.find((b) => b.name === 'a_alpha.png')?.checked === true
  && q5pre.find((b) => b.name === 'b_beta.png')?.checked === true
  && q5pre.find((b) => b.name === 'c_gamma.png')?.checked === false, JSON.stringify(q5pre));
await page.evaluate(() => {
  const b = [...document.querySelectorAll('#md3PermissionOverlay [data-role="picker-list"] input[type="checkbox"]')]
    .find((x) => x.getAttribute('data-name') === 'c_gamma.png');
  b.checked = true;
  document.querySelector('#md3PermissionOverlay [data-picker-confirm]').click();
});
const q5 = await page.evaluate(async (app) => {
  const res = await window.__p3;
  return { res, state: window.__permissions.getPermissionState(app, 'photos'), acl: window.__permissions.getPhotoAccessState(app) };
}, APP);
A('Q5b 升级落定 ACL=3（追加新勾选 · 全量替换语义）',
  q5.res[0] === true && q5.state === 'granted_selected' && q5.acl.selected.length === 3
  && ['a_alpha.png', 'b_beta.png', 'c_gamma.png'].every((n) => q5.acl.selected.includes(n)),
  JSON.stringify(q5.acl));
await waitOverlayGone(page); // overlay 220ms 移除窗口期与新弹框 ID 同名，先等旧框退场再开下一轮

// ---------- Q5s：升级态取消勾选 = 收回（全量替换另一半语义） ----------
await page.evaluate((app) => {
  window.__p4 = window.__permissions.requestPermissions(['photos'], { appId: app, appName: 'E2E195C', upgrade: true });
}, APP);
await waitOverlay(page);
await page.evaluate(() => document.querySelector('#md3PermissionOverlay button[data-act="selected"]').click());
await sleep(600);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('#md3PermissionOverlay [data-role="picker-list"] input[type="checkbox"]')]
    .find((x) => x.getAttribute('data-name') === 'b_beta.png');
  b.checked = false;
  document.querySelector('#md3PermissionOverlay [data-picker-confirm]').click();
});
const q5s = await page.evaluate(async (app) => {
  const res = await window.__p4;
  return { res, acl: window.__permissions.getPhotoAccessState(app) };
}, APP);
A('Q5s 取消勾选收回共享（ACL=2，b_beta 移除）',
  q5s.res[0] === true && q5s.acl.selected.length === 2 && !q5s.acl.selected.includes('b_beta.png'),
  JSON.stringify(q5s.acl));
await waitOverlayGone(page);

// ---------- Q6：允许全部升级（granted 全量态 + ACL 清空） ----------
await page.evaluate((app) => {
  window.__p5 = window.__permissions.requestPermissions(['photos'], { appId: app, appName: 'E2E195C', upgrade: true });
}, APP);
await waitOverlay(page);
await page.evaluate(() => document.querySelector('#md3PermissionOverlay button[data-act="granted"]').click());
const q6 = await page.evaluate(async (app) => {
  const res = await window.__p5;
  return { res, state: window.__permissions.getPermissionState(app, 'photos'), acl: window.__permissions.getPhotoAccessState(app) };
}, APP);
A('Q6 允许全部 → granted 全量态 + ACL 清空',
  q6.res[0] === true && q6.state === 'granted' && (q6.acl.mode === 'all' || q6.acl.selected.length === 0),
  JSON.stringify({ state: q6.state, acl: q6.acl }));

// ---------- Q7：全程零 pageerror ----------
A('Q7 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));

console.log(`\n=== e2e-v195c-photo-upgrade: ${pass} passed, ${fail} failed ===`);
await page.screenshot({ path: join(OUT, 'v195c-upgrade-final.png'), fullPage: false });
await browser.close();
process.exit(fail ? 1 : 0);
