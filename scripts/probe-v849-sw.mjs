// probe: why is #swLapBtn "not stable" during running stopwatch
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ROOT = '/home/z/my-project/md3-repo';
const srv = spawn('python3', ['-m', 'http.server', '8085', '--directory', ROOT, '--bind', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));
const browser = await chromium.launch({ headless: true, executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
await page.goto('http://127.0.0.1:8085/ios-desktop/apps/clock-app/index.html', { waitUntil: 'load' });
await page.waitForTimeout(600);
await page.click('.top-tabs .nav-item[data-tab="Stopwatch"]');
await page.waitForTimeout(400);
await page.click('#swMainBtn');
await page.waitForTimeout(400);
const out = await page.evaluate(() => new Promise((resolve) => {
  const btn = document.getElementById('swLapBtn');
  const disp = document.getElementById('swDisplay');
  const car = document.getElementById('swLapsCarousel');
  const samples = [];
  let n = 0;
  const tick = () => {
    const b = btn.getBoundingClientRect();
    const d = disp.getBoundingClientRect();
    samples.push({ bt: +b.top.toFixed(2), bh: +b.height.toFixed(2), bl: +b.left.toFixed(2), bw: +b.width.toFixed(2), dt: +d.top.toFixed(2), dh: +d.height.toFixed(2), dw: +d.width.toFixed(2), ch: car.getBoundingClientRect().height, txt: disp.textContent });
    if (++n < 30) requestAnimationFrame(tick); else resolve(samples);
  };
  requestAnimationFrame(tick);
}));
const uniq = {};
for (const s of out) { const k = JSON.stringify([s.bt, s.bh, s.bl, s.bw, s.dt, s.dh, s.dw, s.ch]); uniq[k] = (uniq[k] || 0) + 1; }
console.log('distinct frame-boxes:', Object.keys(uniq).length);
console.log(Object.entries(uniq).slice(0, 6).map(([k, v]) => v + 'x ' + k).join('\n'));
console.log('sample texts:', [...new Set(out.map(s => s.txt))].slice(0, 5));
await browser.close(); srv.kill(); process.exit(0);
