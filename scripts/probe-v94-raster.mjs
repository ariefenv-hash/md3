// 探针：rasterizeViewport 失败根因（e2e S1 rastered=false）
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8996;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text().slice(0, 300)); });
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);
const r = await page.evaluate(async () => {
  const mod = await import('/ios-desktop/js/screenshot-markup.js');
  try {
    const shot = await mod.rasterizeViewport();
    return { ok: true, len: shot.dataUrl.length, w: shot.width, h: shot.height };
  } catch (e) {
    return { ok: false, err: String(e && e.message || e) };
  }
});
console.log('RASTER:', JSON.stringify(r));
await browser.close();
server.kill();
process.exit(0);
