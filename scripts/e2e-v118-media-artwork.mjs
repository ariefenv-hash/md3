// ==================== e2e-v118-media-artwork.mjs — #118 胶囊真封面渲染（v9.87） ====================
// Q1 外部上报 coverUrl → #mediaCoverIcon 出现 .noti-media-cover-img 且 src 匹配
// Q2 进度上报缺 coverUrl 字段 → 封面保持（字段缺省不清空）
// Q3 清场（title:''）→ 回落字形图标（svg 回归）
// Q4 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8989;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

// 1x1 红色 PNG data URL
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });

  // ---------- Q1 封面上屏 ----------
  await page.evaluate((png) => {
    window.postMessage({ type: 'MEDIA_STATE_SYNC', payload: { title: '封面曲', artist: 'E2E', isPlaying: true, currentTime: 1, duration: 100, coverUrl: png, coverMime: 'image/png' } }, '*');
  }, PNG);
  await sleep(500);
  const q1 = await page.evaluate(() => {
    const el = document.getElementById('mediaCoverIcon');
    const img = el && el.querySelector('img.noti-media-cover-img');
    return { has: !!img, src: img ? img.src : '' };
  });
  A('Q1 外部上报 coverUrl → 胶囊真封面上屏（img.noti-media-cover-img）', q1.has && q1.src === PNG, JSON.stringify(q1).slice(0, 120));

  // ---------- Q2 字段缺省不清空 ----------
  await page.evaluate(() => {
    window.postMessage({ type: 'MEDIA_STATE_SYNC', payload: { title: '封面曲', artist: 'E2E', isPlaying: true, currentTime: 5 } }, '*');
  });
  await sleep(400);
  const q2 = await page.evaluate(() => {
    const el = document.getElementById('mediaCoverIcon');
    const img = el && el.querySelector('img.noti-media-cover-img');
    return { kept: !!img, title: document.getElementById('mediaTrackTitle') && document.getElementById('mediaTrackTitle').textContent };
  });
  A('Q2 进度上报缺 coverUrl → 封面保持（缺省不清空）', q2.kept === true, JSON.stringify(q2));

  // ---------- Q3 清场回落 ----------
  await page.evaluate(() => {
    window.postMessage({ type: 'MEDIA_STATE_SYNC', payload: { title: '', isPlaying: false } }, '*');
  });
  await sleep(400);
  const q3 = await page.evaluate(() => {
    const el = document.getElementById('mediaCoverIcon');
    return { img: !!el.querySelector('img'), svg: !!el.querySelector('svg') };
  });
  A('Q3 清场 → 回落字形图标（img 移除 svg 回归）', q3.img === false && q3.svg === true, JSON.stringify(q3));

  // ---------- Q4 pageerror ----------
  A('Q4 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));
} finally {
  await browser.close();
  server.kill();
}
const fails = results.filter(([c]) => !c);
console.log(`\n=== e2e-v118: ${results.length - fails.length}/${results.length} ===`);
process.exit(fails.length ? 1 : 0);
