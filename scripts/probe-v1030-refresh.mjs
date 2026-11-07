// probe-v1030-refresh — 市场已装列表刷新二分探针（触发面 vs 渲染面；一次性诊断）
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await page.goto('http://127.0.0.1:8100/index.html?nolock=1', { waitUntil: 'load', timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500));
await page.evaluate(() => window.__shareSheet.openAppById('appstore'));
await new Promise((r) => setTimeout(r, 1500));
const d = await page.evaluate(async () => {
  const out = {};
  let fired = 0;
  const probeListener = () => { fired++; };
  window.addEventListener('pkg-installer-refresh', probeListener);
  await window.__asAcquire('com.demo.hello');
  await new Promise((r) => setTimeout(r, 2500));
  out.eventFired = fired;
  out.stored = (await window.__pkgInstallerAPI.listInstalled()).length;
  out.rowsBefore = document.querySelectorAll('[data-test="as-app-row"]').length;
  await window.__asRefresh();
  await new Promise((r) => setTimeout(r, 700));
  out.rowsAfterManual = document.querySelectorAll('[data-test="as-app-row"]').length;
  out.emptyStill = !!document.querySelector('[data-test="as-installed-empty"]');
  out.installedLen = (document.getElementById('as-installed') || {}).innerHTML?.length;
  return out;
});
console.log(JSON.stringify(d, null, 2));
await browser.close();
