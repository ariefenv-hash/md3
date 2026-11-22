// ==================== visual-check.mjs — v11.52 动态图标/开合动画视觉验证 ====================
// 截四帧：①桌面（grid_ 动态图标）②点击时钟后动画中段 ③启动屏（launch_ 动态图标）
// ④设置打开中段（P1 动画先行验证）。低分辨率 JPEG 输出到 /tmp/shots。
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const PORT = 8123;
const root = path.resolve(process.argv[2] || 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg' };

const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(root, p);
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));

const exe = process.env.MD3_CHROME || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
await page.goto(`http://127.0.0.1:${PORT}/ios-desktop/index.html`, { waitUntil: 'load' });
await page.waitForTimeout(2000);
// 解锁：官方回归钩子 instantUnlock（lock-screen.js __lockTest）
await page.evaluate(() => { window.__lockTest && window.__lockTest.instantUnlock && window.__lockTest.instantUnlock(); });
await page.waitForTimeout(1200);
const locked = await page.evaluate(() => window.__lockTest ? window.__lockTest.isLocked() : !document.body.classList.contains('is-locked'));
console.log('LOCKED', locked);

// ① 桌面（时钟图标 grid_ 前缀）
const iconInfo = await page.evaluate(() => {
  const el = document.getElementById('grid_hourHand');
  if (!el) return null;
  const face = document.querySelector('#grid_hourHand')?.closest('.dynamic-clock-icon')?.querySelector('.lc-face');
  return { hour: el.style.transform, src: face ? face.getAttribute('src') : null, complete: face ? face.complete : null };
});
console.log('DESKTOP_ICON', JSON.stringify(iconInfo));
await page.screenshot({ path: '/tmp/shots/1-desktop.jpg', quality: 60, type: 'jpeg' });

// ② 点开时钟 → 动画中段（~120ms）
const clockIdx = await page.evaluate(() => {
  const apps = window.__appsForTest || null;
  // 直接找 clock93 图标元素点击
  const icons = [...document.querySelectorAll('.app-icon')];
  const target = icons.find((i) => i.textContent.includes('时钟 9.3'));
  if (target) { target.click(); return true; }
  return false;
});
console.log('CLICK_CLOCK', clockIdx);
await page.waitForTimeout(140);
await page.screenshot({ path: '/tmp/shots/2-open-mid.jpg', quality: 60, type: 'jpeg' });

// ③ 启动态（launch_ 前缀动态图标 + 指针首帧角度）
const launchInfo = await page.evaluate(() => {
  const el = document.getElementById('launch_hourHand');
  return el ? { hour: el.style.transform, visible: true } : null;
});
console.log('LAUNCH_ICON', JSON.stringify(launchInfo));
await page.waitForTimeout(1600);
await page.screenshot({ path: '/tmp/shots/3-clock-settled.jpg', quality: 60, type: 'jpeg' });

// ④ 关闭 → 回桌面；再开设置（P1 动画先行）
await page.evaluate(() => { const b = document.getElementById('homeBar') || window.__closeAppForTest; if (b) b.click && b.click(); });
await page.waitForTimeout(700);
const setIdx = await page.evaluate(() => {
  const icons = [...document.querySelectorAll('.app-icon')];
  const target = icons.find((i) => i.textContent.includes('设置'));
  if (target) { target.click(); return true; }
  return false;
});
console.log('CLICK_SETTINGS', setIdx);
await page.waitForTimeout(120);
await page.screenshot({ path: '/tmp/shots/4-settings-mid.jpg', quality: 60, type: 'jpeg' });
await page.waitForTimeout(1800);
const setReady = await page.evaluate(() => !!document.getElementById('app-instance-settings'));
console.log('SETTINGS_INSTANCE', setReady);
await page.screenshot({ path: '/tmp/shots/5-settings-settled.jpg', quality: 60, type: 'jpeg' });

const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
console.log('PAGE_ERRORS', errs.length);
await browser.close();
server.close();
process.exit(0);
