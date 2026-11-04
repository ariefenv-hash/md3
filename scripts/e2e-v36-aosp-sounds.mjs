// ==================== e2e-v36-aosp-sounds.mjs — #36 音效系统 e2e ====================
//
// Q1 资产链路：preload 真跑 —— 15 枚 AOSP ogg 全部经 fetch 命中（performance resource entries）
// Q2 解锁音（commit 帧）：真上滑手势 → 弹簧 commit → Unlock.ogg 采样源启动 + 锁屏离场
// Q3 上锁音：__lockNow() → Lock.ogg 采样源恰好 +1 + is-locked 回归 → 二次上滑恢复
// Q4 磁贴音：QS 下拉 → aeroplane 磁贴点击 → Effect_Tick 采样源 +1（既有 tick 消费自动升级）
// Q5 RingerMode 抑制：silent 态磁贴点击计数零增（AudioService 语义）→ ring 恢复可播
// Q6 iframe system-sfx 通道：notes iframe 内 postMessage camera_click → +1；非 iframe 源 → 拒
// Q7 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8978;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`; // 真锁屏路径（不 nolock）
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--autoplay-policy=no-user-gesture-required'], // headless 音频通道放开（AudioContext running）
});
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

// 采样源计数探针：wrap AudioContext 原型（文档启动前注入，覆盖 main.js 链路创建的 ctx）
await page.addInitScript(() => {
  window.__srcCount = 0;
  const proto = window.AudioContext && window.AudioContext.prototype;
  if (proto && proto.createBufferSource) {
    const orig = proto.createBufferSource;
    proto.createBufferSource = function (...a) { window.__srcCount++; return orig.apply(this, a); };
  }
});

const dismissOverlays = async () => {
  for (let i = 0; i < 6; i++) {
    const had = await page.evaluate(() => {
      const ov = document.getElementById('md3PermissionOverlay');
      if (ov) { const b = ov.querySelector('button[data-act="granted"]'); if (b) b.click(); else ov.remove(); return true; }
      const h = document.getElementById('headsUpStack');
      if (h) { h.remove(); return true; }
      const toasts = document.querySelectorAll('.hun-banner, #systemGlobalToast');
      if (toasts.length) { toasts.forEach((e) => e.remove()); return true; }
      return false;
    });
    if (!had) break;
    await sleep(320);
  }
};

const srcCount = () => page.evaluate(() => window.__srcCount || 0);
const isLocked = () => page.evaluate(() => document.body.classList.contains('is-locked'));
/** 真上滑解锁手势：快速 fling（速度远超 COMMIT_VELOCITY 0.55px/ms） */
const flingUnlock = async () => {
  await page.mouse.move(200, 660);
  await page.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(200, 660 - (600 * i) / steps);
    await sleep(12);
  }
  await page.mouse.up();
};

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await sleep(600);
  await dismissOverlays();

  // Q1 资产链路：15 枚 ogg resource entries（preload 真跑，fetch 相对 URL 命中 serve）
  const assets = await page.evaluate(() => {
    const urls = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.includes('/assets/audio/aosp/'));
    return { count: urls.length, ogg: urls.filter((u) => u.endsWith('.ogg')).length, names: [...new Set(urls.map((u) => u.split('/').pop()))] };
  });
  A('Q1 preload 全量命中 15 枚 AOSP ogg（fetch→decode 链路真跑）', assets.count >= 15 && assets.ogg >= 15, JSON.stringify(assets.names).slice(0, 160));

  // Q2 解锁音（commit 帧）
  const s0 = await srcCount();
  await flingUnlock();
  await sleep(1600);
  await dismissOverlays();
  const unlocked = await isLocked();
  const s1 = await srcCount();
  const unlockRes = await page.evaluate(() => performance.getEntriesByType('resource').some((e) => e.name.endsWith('/Unlock.ogg')));
  A('Q2 上滑解锁 commit + Unlock.ogg 采样源启动', unlocked === false && s1 > s0 && unlockRes, `locked=${unlocked} srcΔ=${s1 - s0}`);

  // Q3 上锁音（lockNow 纯函数路径，无 pointer 干扰 → 恰 +1）
  const s2 = await srcCount();
  await page.evaluate(() => { window.__lockNow && window.__lockNow(); });
  await sleep(700);
  const relocked = await isLocked();
  const s3 = await srcCount();
  A('Q3 lockNow 上锁音恰好 +1 + is-locked 回归', relocked === true && s3 - s2 === 1, `locked=${relocked} srcΔ=${s3 - s2}`);

  // 二次上滑恢复桌面
  await flingUnlock();
  await sleep(1500);
  await dismissOverlays();
  A('Q3b 二次上滑恢复桌面', (await isLocked()) === false);

  // Q4 磁贴音（QS 下拉 → aeroplane 点击 → tick 采样）
  await page.click('#statusBar', { position: { x: 350, y: 14 }, force: true });
  await sleep(1400);
  await dismissOverlays();
  const s4 = await srcCount();
  const q4 = await page.evaluate(() => {
    const pill = document.querySelector('.qs-tile-pill[data-tile-id="aeroplane"]');
    if (!pill) return { ok: false, why: 'pill-missing' };
    const before = pill.classList.contains('active');
    pill.click();
    return { ok: true, before, after: pill.classList.contains('active') };
  });
  await sleep(500);
  const s5 = await srcCount();
  A('Q4 aeroplane 磁贴点击 → Effect_Tick 采样源 +1 + 状态翻转', q4.ok && q4.before !== q4.after && s5 - s4 === 1, `tile=${q4.ok} flip=${q4.before}→${q4.after} srcΔ=${s5 - s4}`);

  // Q5 RingerMode silent 全抑制
  await page.evaluate(() => { window.__sfx && window.__sfx.setRingerMode('silent'); });
  await sleep(200);
  const q5a = await page.evaluate(() => {
    const pill = document.querySelector('.qs-tile-pill[data-tile-id="aeroplane"]');
    if (!pill) return false;
    pill.click();
    return true;
  });
  await sleep(400);
  const s6 = await srcCount();
  await page.evaluate(() => { window.__sfx && window.__sfx.setRingerMode('ring'); });
  A('Q5 silent 态磁贴点击计数零增（AudioService.playSoundEffect 语义）', q5a && s6 - s5 === 0, `srcΔ=${s6 - s5}`);

  // Q6 iframe system-sfx 通道（notes 应用真 iframe）
  await page.keyboard.press('Escape');
  await sleep(500);
  await dismissOverlays();
  await page.evaluate(() => {
    const icons = document.querySelectorAll('.app-icon');
    for (const ic of icons) { if (ic.dataset.id === 'notes') { ic.click(); break; } }
  });
  await sleep(1400);
  await dismissOverlays();
  const s7 = await srcCount();
  // 子应用视角：iframe 内 window.parent.postMessage（与 camera/index.html postMessage 同款方向）
  const notesFrame = page.frames().find((f) => f.url().includes('/apps/notes/'));
  const chan = await notesFrame.evaluate(async () => {
    window.parent.postMessage({ type: 'system-sfx', name: 'camera_click' }, '*');
    await new Promise((r) => setTimeout(r, 250));
    return true;
  });
  await sleep(300);
  const sMid = await srcCount();
  // 反向校验：宿主 window 直发（e.source=window，非 iframe 白名单）→ 源校验拒
  await page.evaluate(async () => {
    window.postMessage({ type: 'system-sfx', name: 'camera_click' }, '*');
    await new Promise((r) => setTimeout(r, 250));
  });
  await sleep(200);
  const s8 = await srcCount();
  A('Q6 iframe 内 system-sfx 摄像快门请求 +1；window 直发被源校验拒', chan && sMid - s7 === 1 && s8 - sMid === 0, `iframeΔ=${sMid - s7} directΔ=${s8 - sMid}`);

  A('Q7 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 300));
} catch (e) {
  A('EXCEPTION', false, String(e).slice(0, 300));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const pass = results.filter((r) => r[0]).length;
console.log(`\n=== ${pass}/${results.length} passed ===`);
process.exit(pass === results.length ? 0 : 1);
