// 探针4：最小用例矩阵——foreignObject taint 策略定位
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8993;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await sleep(2000);
const r = await page.evaluate(async () => {
  const tryDraw = async (svg, how) => {
    const url = how === 'blob'
      ? URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    return await new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        try {
          const cv = document.createElement('canvas');
          cv.width = 400; cv.height = 300;
          cv.getContext('2d').drawImage(img, 0, 0, 400, 300);
          const u = cv.toDataURL('image/png');
          URL.revokeObjectURL(url);
          res(`ok ${u.length}`);
        } catch (e) { URL.revokeObjectURL(url); res(`taint`); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); res('img-error'); };
      img.src = url;
    });
  };
  const out = {};
  // M1 纯矢量（无 foreignObject）+ blob
  out.M1_plain_blob = await tryDraw('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100" height="100" fill="red"/></svg>', 'blob');
  // M2 foreignObject + 显式 XHTML 包装 div + blob
  out.M2_fo_xhtml_blob = await tryDraw('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:40px;color:blue">Hi</div></foreignObject></svg>', 'blob');
  // M3 同上 + dataURL
  out.M3_fo_xhtml_data = await tryDraw('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:40px;color:blue">Hi</div></foreignObject></svg>', 'data');
  // M4 foreignObject + serializeToString(documentElement) 小 DOM + blob
  const mini = document.implementation.createHTMLDocument();
  mini.body.innerHTML = '<div style="background:#eee;font-size:30px">Mini <b>bold</b></div>';
  const xmlMini = new XMLSerializer().serializeToString(mini.documentElement);
  out.M4_fo_ser_blob = await tryDraw(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><foreignObject width="100%" height="100%">${xmlMini}</foreignObject></svg>`, 'blob');
  out.xmlMiniSample = xmlMini.slice(0, 120);
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
server.kill();
process.exit(0);
