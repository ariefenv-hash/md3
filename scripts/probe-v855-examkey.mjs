// 探针：EXAM_KEY 在 reload 前后的生命周期（定位 H/I 段失败根因）
import { chromium } from 'playwright';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8085/ios-desktop/index.html?nolock=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text().slice(0, 200)); });

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(2500);
const frameOf = () => page.frames().find((f) => f.url().includes('apps/driving/index.html'));
await page.evaluate(() => { window.__shareSheet.openAppById('driving'); });
await sleep(1200);
let frame = frameOf();
console.log('frame found:', !!frame);

// 开考
await frame.evaluate(() => document.getElementById('dvModeExam').click());
await sleep(300);
await frame.evaluate(() => document.getElementById('dvStart').click());
await sleep(500);
await frame.evaluate(() => { document.querySelectorAll('[data-test="dv-opt"]')[1].click(); });
await sleep(300);
console.log('before reload EXAM_KEY:', await frame.evaluate(() => localStorage.getItem('ios-desktop:driving-exam-v1')?.slice(0, 80)));
console.log('before reload STATE_KEY:', await frame.evaluate(() => localStorage.getItem('ios-desktop:driving-state-v1')));

// 监听 beforeunload 触发标记
await frame.evaluate(() => {
  window.__byeFired = false;
  window.addEventListener('beforeunload', () => { window.__byeFired = true; });
});

await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(2000);
console.log('after reload (before reopen) EXAM_KEY:', await page.evaluate(() => localStorage.getItem('ios-desktop:driving-exam-v1')?.slice(0, 80)));
console.log('after reload STATE_KEY:', await page.evaluate(() => localStorage.getItem('ios-desktop:driving-state-v1')));

await page.evaluate(() => { window.__shareSheet.openAppById('driving'); });
await sleep(1200);
frame = frameOf();
console.log('frame after reopen:', !!frame);
if (frame) {
  console.log('badge:', await frame.evaluate(() => document.getElementById('dvBadge')?.textContent));
  console.log('after reopen EXAM_KEY:', await frame.evaluate(() => localStorage.getItem('ios-desktop:driving-exam-v1')?.slice(0, 80)));
  console.log('examBar shown:', await frame.evaluate(() => document.getElementById('dvExamBar').classList.contains('show')));
  await frame.evaluate(() => document.getElementById('dvModeExam').click());
  await sleep(400);
  console.log('after chip click examBar:', await frame.evaluate(() => document.getElementById('dvExamBar').classList.contains('show')));
  console.log('eprog:', await frame.evaluate(() => document.getElementById('dvEprog')?.textContent));
}
await browser.close();
