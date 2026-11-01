// diag-live-offline-r39.mjs — 本地诊断（不入库）：真实启动器入口 SW/离线验证
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const perr = [];
page.on('pageerror', (e) => perr.push(String(e).slice(0, 200)));

const t0 = Date.now();
await page.goto('https://ariefenv-hash.github.io/md3/?swtest=1', { waitUntil: 'domcontentloaded', timeout: 90000 });
console.log(`[t+${((Date.now()-t0)/1000).toFixed(1)}s] launcher loaded`);

// 等 SW 注册 + iframe 挂载 + 桌面就绪
for (let i = 0; i < 40; i++) {
  const st = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    let cacheInfo = null;
    if (reg?.active) {
      const keys = await caches.keys();
      const cur = keys.find(k => k.startsWith('geek-cache-'));
      if (cur) { const c = await caches.open(cur); cacheInfo = { name: cur, entries: (await c.keys()).length }; }
    }
    const frame = page2 => null; // noop
    return { hasReg: !!reg, active: !!reg?.active, cacheInfo, iframes: document.querySelectorAll('iframe').length };
  }).catch(e => ({ err: String(e).slice(0, 100) }));
  if (i % 4 === 0) console.log(`[t+${((Date.now()-t0)/1000).toFixed(0)}s]`, JSON.stringify(st));
  if (st.hasReg && st.cacheInfo && st.cacheInfo.entries > 90) { console.log('PRECACHE DONE:', JSON.stringify(st), `at t+${((Date.now()-t0)/1000).toFixed(1)}s`); break; }
  await new Promise(r => setTimeout(r, 2000));
}

// iframe 内桌面就绪检查
const frame = page.frames().find(f => f.url().includes('ios-desktop'));
console.log('iframe found:', !!frame, frame?.url().slice(0, 80));
if (frame) {
  await frame.waitForFunction(() => document.querySelectorAll('.qs-tile-pill').length > 0, null, { timeout: 30000 }).catch(() => {});
  console.log('desktop tiles in iframe:', await frame.evaluate(() => document.querySelectorAll('.qs-tile-pill').length).catch(() => 'err'));
}

// ===== 决定性实验：断网重载 =====
await ctx.setOffline(true);
console.log('--- OFFLINE, reloading launcher ---');
perr.length = 0;
const t1 = Date.now();
const reloadOk = await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 }).then(() => true).catch(e => { console.log('reload fail:', String(e).slice(0, 120)); return false; });
await new Promise(r => setTimeout(r, 9000));
const st2 = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker?.getRegistration?.();
  const keys = await caches.keys();
  const cur = keys.find(k => k.startsWith('geek-cache-'));
  let entries = 0; if (cur) { const c = await caches.open(cur); entries = (await c.keys()).length; }
  const f = document.querySelector('iframe');
  return { hasReg: !!reg, active: !!reg?.active, entries, iframeSrc: f?.getAttribute('src')?.slice(0, 60) };
}).catch(e => ({ err: String(e).slice(0, 140) }));
console.log(`offline reload ${reloadOk ? 'OK' : 'FAIL'} in ${((Date.now()-t1)/1000).toFixed(1)}s:`, JSON.stringify(st2));
const frame2 = page.frames().find(f => f.url().includes('ios-desktop'));
let offlineBoot = false;
if (frame2) {
  offlineBoot = await frame2.waitForFunction(() => document.querySelectorAll('.qs-tile-pill').length > 0, null, { timeout: 25000 }).then(() => true).catch(() => false);
  console.log('OFFLINE desktop boot (tiles>0):', offlineBoot);
  if (offlineBoot) {
    const tiles = await frame2.evaluate(() => document.querySelectorAll('.qs-tile-pill').length);
    console.log('offline tiles:', tiles);
  }
}
console.log('offline pageerrors:', perr.length ? perr.slice(0, 5) : 'none');
await page.screenshot({ path: 'docs/diag-r39/offline-boot.png' }).catch(() => {});
await browser.close();
