// ==================== e2e-v195-permission-grant.mjs — #195 一期权限组队列无头回归（R54 窗） ====================
//
// DoD（GrantPermissionsActivity.java 组队列 + GrantPermissionsViewHandler.java GRANTED_ONE_TIME 语义）：
//   P0  __permissions 调试面在位（requestPermissions / revokePermission / oneTimeSessions / 常量）
//   P1  组队列：camera+microphone 一次请求 → 两组串行弹框（组间保序）→ 允许/拒绝 → 逐权限结果对账
//   P2  one-time 会话态：once 放行 → granted_one_time → 二次申请免弹框 → app-window-closed 回收 → unset
//   P3  location 双态粗精：DIALOG_WITH_BOTH_LOCATIONS 渲染双选钮 → 选择落 __locationPrecision 元数据
//   P4  AutoRevoke：31 天前 granted 入扫描清单 → revokePermission 回 unset 非 denied
//   P5  既有契约：未知权限放行 / 无 appId 放行
//   P6  全程零 pageerror
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

/** 等待权限对话框出现（轮询 #md3PermissionOverlay） */
async function waitOverlay(page, timeout = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const has = await page.evaluate(() => !!document.querySelector('#md3PermissionOverlay'));
    if (has) return true;
    await sleep(60);
  }
  return false;
}
/** 等待对话框完全退场（退场动画 220ms + removeChild） */
async function waitOverlayGone(page, timeout = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const has = await page.evaluate(() => !!document.querySelector('#md3PermissionOverlay'));
    if (!has) { await sleep(80); return true; }
    await sleep(60);
  }
  return false;
}

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await sleep(1500);
// 关掉锁屏兜底（同 e2e-v146 范式）
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(500);

// ---------- P0：调试面在位 ----------
const surface = await page.evaluate(() => {
  const w = window.__permissions;
  return {
    has: !!w,
    reqP: w && typeof w.requestPermissions === 'function',
    revoke: w && typeof w.revokePermission === 'function',
    ots: w && w.oneTimeSessions && typeof w.oneTimeSessions.grant === 'function',
    auto: w && typeof w.maybeAutoRevoke === 'function',
    groups: w && w.PERMISSION_GROUPS && Object.keys(w.PERMISSION_GROUPS).length === 5,
    consts: w && w.BUTTONS.ALLOW_ONE_TIME === 5 && w.RESULTS.GRANTED_ONE_TIME === 4 && w.MAX_DIALOGS_PER_PKG_TASK === 10 && w.AUTO_REVOKE_DAYS === 30,
  };
});
A('P0 __permissions 调试面在位', surface.has && surface.reqP && surface.revoke && surface.ots && surface.auto && surface.groups && surface.consts,
  JSON.stringify(surface));

// ---------- P1：组队列（camera+microphone 组间串行） ----------
const p1done = page.evaluate(() => {
  window.__p1 = window.__permissions.requestPermissions(['camera', 'microphone'], { appId: 'e2e195', appName: 'E2E195' });
  return true;
});
await p1done;
const g1 = await waitOverlay(page);
const g1title = g1 ? await page.evaluate(() => document.querySelector('#md3PermissionOverlay .power-dialog-card').textContent) : '';
A('P1a 第一组弹框（相机）', g1 && g1title.includes('相机'), g1title.slice(0, 60));
if (g1) {
  await page.evaluate(() => document.querySelector('#md3PermissionOverlay button[data-act="granted"]').click());
  await waitOverlayGone(page);
}
const g2 = await waitOverlay(page);
const g2title = g2 ? await page.evaluate(() => document.querySelector('#md3PermissionOverlay .power-dialog-card').textContent) : '';
A('P1b 第二组弹框（麦克风，组间串行）', g2 && g2title.includes('麦克风'), g2title.slice(0, 60));
if (g2) {
  await page.evaluate(() => document.querySelector('#md3PermissionOverlay button[data-act="denied"]').click());
  await waitOverlayGone(page);
}
const p1res = await page.evaluate(() => window.__p1);
const p1state = await page.evaluate(() => ({
  cam: window.__permissions.getPermissionState('e2e195', 'camera'),
  mic: window.__permissions.getPermissionState('e2e195', 'microphone'),
}));
A('P1c 逐权限结果 [true,false]', Array.isArray(p1res) && p1res[0] === true && p1res[1] === false, JSON.stringify(p1res));
A('P1d 落权对账 cam=granted / mic=denied', p1state.cam === 'granted' && p1state.mic === 'denied', JSON.stringify(p1state));

// ---------- P2：one-time 会话态（notifications） ----------
const p2done = page.evaluate(() => {
  window.__p2 = window.__permissions.requestPermission('notifications', { appId: 'e2e195' });
  return true;
});
await p2done;
await waitOverlay(page);
await page.evaluate(() => document.querySelector('#md3PermissionOverlay button[data-act="once"]').click());
await waitOverlayGone(page);
const p2a = await page.evaluate(() => window.__p2.then((v) => v));
const p2state = await page.evaluate(() => ({
  state: window.__permissions.getPermissionState('e2e195', 'notifications'),
  stored: (window.__permissions.getAllPermissions().e2e195 || {}).notifications,
  ots: window.__permissions.oneTimeSessions.state('e2e195', 'notifications'),
}));
A('P2a once 放行', p2a === true, String(p2a));
A('P2b 会话态 granted_one_time 且不落盘', p2state.state === 'granted_one_time' && p2state.stored === undefined && p2state.ots === 'granted_one_time',
  JSON.stringify(p2state));
// 隐私指示器：notifications 非三类运行时组 → chip 不亮；改用 camera 会话验证点亮
const p2chipOff = await page.evaluate(() => {
  const chip = document.querySelector('.status-left .privacy-chip');
  return !chip || getComputedStyle(chip).display === 'none';
});
A('P2b-2 非指示类会话 chip 不亮（notifications 过滤）', p2chipOff === true);
// 会话内二次申请：免弹框直接放行
const p2b = page.evaluate(() => {
  window.__p2b = window.__permissions.requestPermission('notifications', { appId: 'e2e195' });
  return true;
});
await p2b;
await sleep(500);
const noOverlay = await page.evaluate(() => !document.querySelector('#md3PermissionOverlay'));
const p2bval = await page.evaluate(() => window.__p2b);
A('P2c 会话内二次申请免弹框', noOverlay && p2bval === true);
// 任务移除：app-window-closed 回收
await page.evaluate(() => document.dispatchEvent(new CustomEvent('app-window-closed', { detail: { appId: 'e2e195' } })));
await sleep(120);
const p2after = await page.evaluate(() => ({
  state: window.__permissions.getPermissionState('e2e195', 'notifications'),
  otsLeft: window.__permissions.oneTimeSessions.size,
}));
A('P2d 窗口关闭回收 → unset', p2after.state === 'unset', JSON.stringify(p2after));
// 隐私 chip 点亮/熄灭全链（无头钩子驱动 + PrivacyItem 同构派发）
const p2e = await page.evaluate(() => {
  window.__permissions.oneTimeSessions.grant('e2e195', 'camera');
  window.__permissions.oneTimeSessions.grant('e2e195', 'microphone');
  window.__permissions.notifyPrivacyItems();
  const chip = document.querySelector('.status-left .privacy-chip');
  const lit = chip && getComputedStyle(chip).display !== 'none' && chip.querySelectorAll('.privacy-chip-item').length === 2;
  document.dispatchEvent(new CustomEvent('app-window-closed', { detail: { appId: 'e2e195' } }));
  const chipAfter = document.querySelector('.status-left .privacy-chip');
  const off = !chipAfter || getComputedStyle(chipAfter).display === 'none';
  return { lit: !!lit, off };
});
A('P2e 隐私 chip 会话期点亮（2 图标）+ 回收熄灭', p2e.lit && p2e.off, JSON.stringify(p2e));

// ---------- P3：location 双态粗精 ----------
const p3done = page.evaluate(() => {
  window.__p3 = window.__permissions.requestPermission('location', { appId: 'e2e195', appName: 'E2E195' });
  return true;
});
await p3done;
const g3 = await waitOverlay(page);
const pickerN = g3 ? await page.evaluate(() => document.querySelectorAll('#md3PermissionOverlay [data-role="location-precision"] button[data-precision]').length) : 0;
A('P3a 双态选钮渲染（DIALOG_WITH_BOTH_LOCATIONS）', g3 && pickerN === 2, `pickerN=${pickerN}`);
if (g3) {
  await page.evaluate(() => {
    document.querySelector('#md3PermissionOverlay button[data-precision="coarse"]').click();
    document.querySelector('#md3PermissionOverlay button[data-act="granted"]').click();
  });
  await waitOverlayGone(page);
}
await page.evaluate(() => window.__p3);
const p3state = await page.evaluate(() => {
  const rec = window.__permissions.getAllPermissions().e2e195 || {};
  return { loc: rec.location, precision: rec.__locationPrecision, last: typeof rec.__lastAccess === 'number' };
});
A('P3b 选择落元数据 coarse + granted + __lastAccess 打点', p3state.loc === true && p3state.precision === 'coarse' && p3state.last,
  JSON.stringify(p3state));

// ---------- P4：AutoRevoke 回收动作（阈值扫描已在 vitest B6 真跑；此处锁真实 store 生效） ----------
const p4 = await page.evaluate(() => {
  // 经公开入口授予（内存 store + localStorage 同源），再回收 —— 验证回收 = 回 unset 非 denied
  window.__permissions.setPermission('staleE2E', 'camera', true);
  const before = window.__permissions.getPermissionState('staleE2E', 'camera');
  const scan = window.__permissions.maybeAutoRevoke(Date.now()); // 扫描可调用（清单不含刚授权项）
  const revoked = window.__permissions.revokePermission('staleE2E', 'camera');
  return {
    before,
    scanOk: Array.isArray(scan),
    revoked,
    after: window.__permissions.getPermissionState('staleE2E', 'camera'),
    reAskable: window.__permissions.getAllPermissions().staleE2E === undefined
      || (window.__permissions.getAllPermissions().staleE2E || {}).camera === undefined,
  };
});
A('P4 回收动作真实 store 生效（granted → unset ≠ denied）', p4.before === 'granted' && p4.scanOk && p4.revoked === true && p4.after === 'unset' && p4.reAskable, JSON.stringify(p4));

// ---------- P5：既有契约 ----------
const p5 = await page.evaluate(async () => {
  const unknown = await window.__permissions.requestPermission('nope', { appId: 'e2e195' });
  const noCtx = await window.__permissions.requestPermissions(['camera'], {});
  return { unknown, noCtx };
});
A('P5 未知权限/无上下文放行（既有契约）', p5.unknown === true && Array.isArray(p5.noCtx) && p5.noCtx[0] === true, JSON.stringify(p5));

// ---------- P6：零 pageerror ----------
A('P6 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

await page.screenshot({ path: join(OUT, 'v195-final.png') });
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
