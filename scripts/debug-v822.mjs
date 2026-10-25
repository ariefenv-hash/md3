// ==================== debug-v822.mjs — B 场景 postMessage 断链定位 ====================
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
page.on('console', (m) => { if (m.text().includes('[dbg]')) console.log('  console>', m.text()); });
page.on('pageerror', (e) => console.log('  pageerror>', String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => document.querySelector('.power-dialog-card button[data-act="once"]')?.click());
await sleep(500);
await page.evaluate(() => document.querySelector('.app-icon[data-id="music"]').click());
await sleep(1000);

const st1 = await page.evaluate(() => {
  const pages = [...document.querySelectorAll('.app-page')];
  return {
    appPageCount: pages.length,
    pagesVisible: pages.map((p, i) => ({ i, vis: p.offsetParent !== null, hasIfr: !!p.querySelector('iframe'), hasInput: !!p.querySelector('#musicFileInput'), hasOv: !!p.querySelector('#musicImportOverlay') })),
    iframes: document.querySelectorAll('iframe').length,
  };
});
console.log('state1:', JSON.stringify(st1, null, 1));

// 在 iframe 内挂 message 日志
await page.evaluate(() => {
  const ifr = [...document.querySelectorAll('iframe')].find((f) => {
    const p = f.closest('.app-page'); return p && p.offsetParent !== null;
  });
  if (!ifr) { console.log('[dbg] no visible iframe'); return; }
  ifr.contentWindow.addEventListener('message', (e) => {
    ifr.contentWindow.console.log('[dbg] iframe got message type=' + (e.data && e.data.type) + ' source-is-parent=' + (e.source === ifr.contentWindow.parent));
  });
  console.log('[dbg] listener armed, iframe src=' + ifr.src.slice(-40));
});

// 注入 + change —— 完全复刻 e2e B 场景路径（dispatchEvent 走内联 onchange）
await page.evaluate(() => {
  const input = [...document.querySelectorAll('#musicFileInput')].find((el) => {
    const p = el.closest('.app-page'); return p && p.offsetParent !== null;
  });
  console.log('[dbg] input found=' + !!input + ' onchange-prop-type=' + typeof input.onchange
    + ' hasCancelProp=' + typeof input.oncancel);
  const dt = new DataTransfer();
  dt.items.add(new File(['e2e-fake-audio'], 'E2E dbg2.mp3', { type: 'audio/mpeg' }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  console.log('[dbg] change dispatched');
});
await sleep(800);

// Escape 后状态探查（E 场景 reopen null 定位）
await page.evaluate(() => {
  const ov = document.querySelector('#musicImportOverlay');
  console.log('[dbg] overlay-in-dom=' + !!ov
    + ' own-display=' + (ov ? getComputedStyle(ov).display : '-')
    + ' page-count=' + document.querySelectorAll('.app-page').length);
  if (ov) {
    const p = ov.closest('.app-page');
    console.log('[dbg] overlay-page=' + !!p + ' page-offsetParent=' + (p ? p.offsetParent : '-'));
  }
});
await page.keyboard.press('Escape');
await sleep(500);
// E1 探针：真实坐标点击命中什么元素 + click 目标日志
await page.evaluate(() => {
  const ov = [...document.querySelectorAll('#musicImportOverlay')].find((el) => {
    const p = el.closest('.app-page'); return p && p.offsetParent !== null;
  });
  if (ov) { ov.style.display = 'flex'; ov.style.opacity = '1'; }
  const pr = ov.getBoundingClientRect();
  const x = pr.x + 14, y = pr.y + pr.height / 2;
  const hit = document.elementFromPoint(x, y);
  console.log('[dbg] E1 probe point=(' + x + ',' + y + ') hit=' + (hit ? hit.tagName + '#' + hit.id + '.' + hit.className : 'null')
    + ' isOverlay=' + (hit === ov));
  window.__clickLog = [];
  document.addEventListener('click', (e) => window.__clickLog.push(e.target.tagName + '#' + e.target.id), true);
});
// overlay 包含块链 rect 全 dump
await page.evaluate(() => {
  const ov = [...document.querySelectorAll('#musicImportOverlay')].find((el) => {
    const p = el.closest('.app-page'); return p && p.offsetParent !== null;
  });
  if (!ov) { console.log('[dbg] no ov for chain dump'); return; }
  let el = ov, depth = 0;
  while (el && depth < 8) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    console.log(`[dbg] chain[${depth}] ${el.tagName}.${String(el.className).slice(0, 30)} rect=(${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)}) pos=${cs.position} tf=${cs.transform.slice(0, 40)}`);
    el = el.offsetParent || el.parentElement; depth++;
  }
});
await page.mouse.click(14, 450);
await sleep(400);
await page.evaluate(() => {
  console.log('[dbg] clickLog=' + JSON.stringify(window.__clickLog));
  const ov = [...document.querySelectorAll('#musicImportOverlay')].find((el) => {
    const p = el.closest('.app-page'); return p && p.offsetParent !== null;
  });
  console.log('[dbg] after-realclick ov-display=' + (ov ? getComputedStyle(ov).display : 'no-ov') + ' pagesAlive=' + [...document.querySelectorAll('.app-page')].some((p) => p.offsetParent !== null));
});

await page.evaluate(() => {
  const ov = [...document.querySelectorAll('#musicImportOverlay')].find((el) => {
    const p = el.closest('.app-page'); return p && p.offsetParent !== null;
  });
  console.log('[dbg] E1-reopen ov=' + !!ov);
  if (ov) {
    ov.style.display = 'flex'; ov.style.opacity = '1';
    ov.click();
    console.log('[dbg] clicked, target-was-overlay=true');
  }
});
await sleep(500);
await page.evaluate(() => {
  const ovs = document.querySelectorAll('#musicImportOverlay');
  const pages = [...document.querySelectorAll('.app-page')];
  console.log('[dbg] after-click overlay-count=' + ovs.length
    + ' pages=' + pages.map((p) => p.offsetParent !== null).join(',')
    + ' desktopVisible=' + (document.getElementById('desktop') ? getComputedStyle(document.getElementById('desktop')).display : '?'));
});

await page.evaluate(() => {
  const ovs = document.querySelectorAll('#musicImportOverlay');
  console.log('[dbg] after-esc overlay-count=' + ovs.length);
  ovs.forEach((ov, i) => {
    const p = ov.closest('.app-page');
    console.log(`[dbg] ov[${i}] own-display=${getComputedStyle(ov).display} page=${!!p} pageVis=${p ? p.offsetParent !== null : '-'}`);
  });
});

const st2 = await page.evaluate(() => {
  const ifr = [...document.querySelectorAll('iframe')].find((f) => {
    const p = f.closest('.app-page'); return p && p.offsetParent !== null;
  });
  const doc = ifr && ifr.contentDocument;
  const list = doc && doc.getElementById('trackListContainer');
  const ws = doc && doc.getElementById('workspaceView');
  return { listN: list ? list.children.length : -1, wsDisplay: ws ? ws.style.display : 'no-elem', ifrSrc: ifr ? ifr.src.slice(-40) : null };
});
console.log('state2:', JSON.stringify(st2));
await browser.close();
