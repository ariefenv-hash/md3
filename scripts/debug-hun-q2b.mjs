// debug-hun-q2b.mjs — 手势事件流探针
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8962;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage();
page.on('console', (m) => { const t = m.text(); if (t.startsWith('[DBG]')) console.log('  BROWSER:', t); });
page.on('pageerror', (e) => console.log('  PAGEERROR:', String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2000);
await page.evaluate(async () => { window.__notiMod = await import('/ios-desktop/js/notifications.js'); });
await page.evaluate(() => window.__notiMod.addSystemNotification({ id: 'q2-n1', app: 'X', title: 'T', desc: 'D', time: '刚刚' }));
await sleep(1000);
// 探针：banner 三事件 + elementFromPoint + pull 状态
await page.evaluate(() => {
  const el = document.querySelector('#headsUpStack .hun-banner');
  const p = (tag) => (e) => console.log(`[DBG] ${tag} y=${e.clientY} target=${e.target.className || e.target.id || e.target.tagName}`);
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((t) => el.addEventListener(t, p(t), true));
});
const box = await page.evaluate(() => {
  const el = document.querySelector('#headsUpStack .hun-banner');
  const r = el.getBoundingClientRect();
  const cx = r.x + r.width / 2, cy = r.y + r.height * 0.85; // 起点避开桌面下拉手势区（clientY<=55）
  const hit = document.elementFromPoint(cx, cy);
  console.log(`[DBG] rect y=${r.y} h=${r.height} start=${cy} hit=${hit ? (hit.tagName + "|" + (hit.getAttribute("style") || "").slice(0, 60)) : "null"}`);
  return { x: cx, y: cy };
});
await page.mouse.move(box.x, box.y);
await page.mouse.down();
await page.mouse.move(box.x, box.y - 60, { steps: 5 });
await page.mouse.move(box.x, box.y - 130, { steps: 5 });
await page.mouse.up();
await sleep(200);
console.log('after:', JSON.stringify(await page.evaluate(() => {
  const d = window.__headsUpDebug;
  return { count: d.count, items: d.items(), snoozedQ2: d.snoozed('q2-n1') };
})));
await browser.close().catch(() => {});
server.kill();
process.exit(0);
