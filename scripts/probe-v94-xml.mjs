// 探针2：foreignObject XML 解析错误精确定位（DOMParser parsererror）
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8995;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);
const r = await page.evaluate(() => {
  const doc = document;
  const clone = doc.documentElement.cloneNode(true);
  clone.querySelectorAll('#screenshotShelf,#screenshotFlash,#markupLayer').forEach((n) => n.remove());
  clone.querySelectorAll('script').forEach((n) => n.remove());
  let css = '';
  for (const sheet of doc.styleSheets) {
    try { if (sheet.cssRules) for (const rule of sheet.cssRules) css += `${rule.cssText}\n`; } catch (e) {}
  }
  const st = doc.createElement('style');
  st.textContent = css;
  const head = clone.querySelector('head') || clone;
  head.appendChild(st);
  const xml = new XMLSerializer().serializeToString(clone).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700"><foreignObject x="0" y="0" width="100%" height="100%">${xml}</foreignObject></svg>`;
  const p = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const err = p.querySelector('parsererror');
  const out = {
    xmlLen: xml.length,
    parseOk: !err,
    errText: err ? err.textContent.replace(/\s+/g, ' ').slice(0, 500) : null,
  };
  if (err) {
    // 抽取错误位置附近片段
    const m = out.errText.match(/at line (\d+) column (\d+)/);
    if (m) {
      const line = Number(m[1]);
      const lines = svg.split('\n');
      out.snippet = (lines[line - 1] || '').slice(Math.max(0, Number(m[2]) - 120), Number(m[2]) + 80);
    }
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
server.kill();
process.exit(0);
