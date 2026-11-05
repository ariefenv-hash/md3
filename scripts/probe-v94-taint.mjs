// 探针3：taint 根因二分——逐级摘除子资源类型，找出污染源
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8994;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);
const r = await page.evaluate(async () => {
  const doc = document;
  const baseClone = () => {
    const c = doc.documentElement.cloneNode(true);
    c.querySelectorAll('#screenshotShelf,#screenshotFlash,#markupLayer').forEach((n) => n.remove());
    c.querySelectorAll('script').forEach((n) => n.remove());
    const w = doc.createTreeWalker(c, 128);
    const cs = []; while (w.nextNode()) cs.push(w.currentNode);
    cs.forEach((x) => x.remove());
    return c;
  };
  let css = '';
  for (const sheet of doc.styleSheets) {
    try { if (sheet.cssRules) for (const rule of sheet.cssRules) css += `${rule.cssText}\n`; } catch (e) {}
  }
  const variants = {
    A_asis: () => {},
    B_iframe_media: (c) => c.querySelectorAll('iframe,object,embed,video,audio,canvas').forEach((n) => n.remove()),
    C_img_neutral: (c) => {
      c.querySelectorAll('iframe,object,embed,video,audio,canvas').forEach((n) => n.remove());
      c.querySelectorAll('img').forEach((n) => { const s = n.getAttribute('src') || ''; if (!s.startsWith('data:')) n.removeAttribute('src'); });
    },
    D_all: (c) => {
      c.querySelectorAll('iframe,object,embed,video,audio,canvas,link[rel="stylesheet"]').forEach((n) => n.remove());
      c.querySelectorAll('img').forEach((n) => { const s = n.getAttribute('src') || ''; if (!s.startsWith('data:')) n.removeAttribute('src'); });
      c.querySelectorAll('use').forEach((n) => n.remove());
    },
  };
  const out = {};
  for (const [name, fn] of Object.entries(variants)) {
    const c = baseClone();
    fn(c);
    const st = doc.createElement('style');
    st.textContent = name === 'D_all' ? css.replace(/url\((['"]?)[^)]*\1\)/g, 'none') : css;
    (c.querySelector('head') || c).appendChild(st);
    const xml = new XMLSerializer().serializeToString(c).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700"><foreignObject x="0" y="0" width="100%" height="100%">${xml}</foreignObject></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const p = new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        try {
          const cv = doc.createElement('canvas');
          cv.width = 900; cv.height = 700;
          cv.getContext('2d').drawImage(img, 0, 0, 900, 700);
          const u = cv.toDataURL('image/png');
          URL.revokeObjectURL(url);
          res(`ok len=${u.length}`);
        } catch (e) { URL.revokeObjectURL(url); res(`taint: ${String(e.message).slice(0, 60)}`); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); res('img-error'); };
      img.src = url;
    });
    out[name] = await p;
  }
  // 资源普查：页面里到底有哪些外链形态
  out.census = {
    iframes: [...document.querySelectorAll('iframe')].slice(0, 4).map((f) => (f.getAttribute('src') || f.getAttribute('srcdoc') || 'srcdoc').slice(0, 60)),
    extImgs: [...document.querySelectorAll('img')].map((i) => (i.getAttribute('src') || '').slice(0, 60)).filter((s) => s && !s.startsWith('data:')).slice(0, 4),
    extCss: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href')).slice(0, 4),
  };
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
server.kill();
process.exit(0);
