// debug-v821：定位 pill 收尾（commit/cancel）是否被手势管线触发
import { chromium } from 'playwright';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.text().startsWith('[v821]')) console.log('  console:', m.text()); });
await page.goto('http://127.0.0.1:8081/ios-desktop/index.html?nolock=1', { waitUntil: 'load' });
await sleep(1300);
await page.evaluate(() => { document.querySelector('.power-dialog-card button[data-act="once"]')?.click(); });
await sleep(400);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]')?.click());
await sleep(800);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="battery"]')?.click());
await sleep(700);

// 注入事件探针
await page.evaluate(() => {
  window.__log = [];
  for (const ev of ['pointerdown', 'pointermove', 'pointerup']) {
    window.addEventListener(ev, (e) => {
      if (ev !== 'pointermove' || window.__log.length < 3 || e.clientX > 100) {
        window.__log.push(`${ev}@${Math.round(e.clientX)}${ev === 'pointermove' ? '+' : ''}`);
      }
    }, true);
  }
});

await page.mouse.move(4, 400);
await page.mouse.down();
for (let x = 14; x <= 640; x += 24) { await page.mouse.move(x, 400); await sleep(10); }
await sleep(120);

const preUp = await page.evaluate(() => ({
  log: window.__log,
  appWin: document.getElementById('appWindow')?.className,
  pillOp: parseFloat(getComputedStyle(document.getElementById('backPill')).opacity),
}));
console.log('preUp:', JSON.stringify(preUp));

await page.mouse.up();
for (let i = 0; i < 8; i++) {
  await sleep(60);
  const s = await page.evaluate(() => ({
    op: parseFloat(getComputedStyle(document.getElementById('backPill')).opacity),
    w: document.getElementById('backPill').getBoundingClientRect().width,
    vis: getComputedStyle(document.getElementById('backPill')).visibility,
    appWin: document.getElementById('appWindow')?.className.slice(0, 60),
    sub: !!document.querySelector('.app-page-active'),
  }));
  console.log(`t+${(i + 1) * 60}ms:`, JSON.stringify(s));
}
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
