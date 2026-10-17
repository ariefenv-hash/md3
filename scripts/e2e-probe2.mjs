// e2e-probe2.mjs — 深度插桩：transform 时间线 + getAnimations + SW 屏蔽对照
import { chromium } from 'playwright';

const BASE = process.env.MD3_BASE || 'http://localhost:8123/md3/ios-desktop/index.html?nolock=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 120)));
page.on('console', (m) => { if (m.text().startsWith('[probe]')) console.log(m.text()); });
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
await sleep(1800);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(300);
for (let i = 0; i < 30; i++) {
  if (await page.evaluate(() => document.querySelectorAll('.qs-tile-pill').length > 0)) break;
  await sleep(400);
}
await page.click('#statusBar', { position: { x: 350, y: 14 }, force: true });
await sleep(1400);

const timeline = await page.evaluate(async () => {
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="internet"]');
  const log = [];
  let overlay = null, sheet = null;
  const sample = (tag) => {
    overlay = overlay || document.getElementById('qsSheetOverlay');
    sheet = sheet || (overlay && overlay.querySelector('.qs-sheet'));
    if (!sheet) { log.push(`${tag} sheet=null`); return; }
    const cs = getComputedStyle(sheet);
    log.push(`${tag} open=${overlay.classList.contains('open')} tf=${cs.transform.slice(0, 60)} anims=${document.getAnimations().length} dur=${cs.transitionDuration}`);
  };
  sample('pre-click');
  pill.click();
  await Promise.resolve(); sample('microtask');
  for (let i = 0; i < 14; i++) {
    await new Promise((r) => setTimeout(r, 30));
    sample(`t+${(i + 1) * 30}ms`);
  }
  const anims = document.getAnimations().map((a) => ({
    type: a.constructor.name, prop: a.transitionProperty || a.animationName || '?',
    state: a.playState, time: Math.round(a.currentTime || 0),
  }));
  return { log, anims };
});
console.log('--- timeline ---');
timeline.log.forEach((l) => console.log(l));
console.log('--- animations ---', JSON.stringify(timeline.anims, null, 1));
await browser.close();
