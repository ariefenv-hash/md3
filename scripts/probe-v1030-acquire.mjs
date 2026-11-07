// probe-v1030-acquire — 市场获取链失败根因探针（一次性诊断，不入库门禁）
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/index.html?nolock=1';
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 400)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500));

await page.evaluate(() => window.__shareSheet.openAppById('appstore'));
await new Promise((r) => setTimeout(r, 1500));

const diag = await page.evaluate(async () => {
  const out = {};
  out.bridge = !!window.__pkgInstallerAPI;
  out.importBlob = !!(window.__pkgInstallerAPI && window.__pkgInstallerAPI.importBlob);
  out.core = !!(window.__asCatalogCore && window.__asCatalogCore.isUsableCatalog);
  out.boot = !!window.__asBoot;
  out.acquireFn = typeof window.__asAcquire;
  out.catState = (document.getElementById('as-cat-state') || {}).getAttribute?.('data-as-mode');
  // 直接探 fetch 与 importBlob
  try {
    const res = await fetch('demo/hello-world.mdapp');
    out.fetchStatus = res.status;
    const blob = await res.blob();
    out.blobSize = blob.size;
    const rec = await window.__pkgInstallerAPI.importBlob(blob, 'hello-world.mdapp');
    out.recKey = rec && rec.key;
    out.recName = rec && rec.name;
  } catch (e) {
    out.chainErr = String(e && e.message || e).slice(0, 300);
    out.chainErrFull = String(e && (e.pkgErrors && e.pkgErrors.join('|') || e.stack || '')).slice(0, 600);
  }
  return out;
});
console.log(JSON.stringify(diag, null, 2));

if (diag.recKey) {
  const inst = await page.evaluate(async () => {
    try {
      await window.__pkgInstallerAPI.installPending(window.__probeKey || (await window.__pkgInstallerAPI.listPending())[0].key);
      return 'installed';
    } catch (e) { return 'installErr: ' + String(e && e.message || e).slice(0, 300); }
  });
  console.log('installPending →', inst);
  await new Promise((r) => setTimeout(r, 1500));
  const desk = await page.evaluate(() => !!document.querySelector('[data-id="com.demo.hello"]'));
  console.log('desktop icon:', desk);
}
await browser.close();
