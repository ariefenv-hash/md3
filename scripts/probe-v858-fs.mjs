import { chromium } from 'playwright';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e)));
await page.goto('http://127.0.0.1:8085/ios-desktop/index.html?nolock=1', { waitUntil: 'load', timeout: 30000 });
await sleep(1800);
await page.evaluate(() => window.__allApps.open('probe'));
await sleep(700);
const info = await page.evaluate(() => {
  const fs = window.__allAppsDebug?.fs;
  const list = document.getElementById('aaList');
  const r = list.getBoundingClientRect();
  return {
    hasFs: !!fs,
    longList: fs?.mLongList,
    range: fs?.mThumbRange,
    offset: fs?.mThumbOffset,
    thumbPos: fs?._thumbPos,
    clientH: list.clientHeight,
    clientW: list.clientWidth,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    enabled: fs?.isEnabled(),
  };
});
console.log(JSON.stringify(info, null, 1));
// try synthetic drag via real mouse at thumb
const lr = info.rect;
await page.mouse.move(lr.x + lr.w - 6, lr.y + 24);
await page.mouse.down();
await page.mouse.move(lr.x + lr.w - 6, lr.y + lr.h * 0.8, { steps: 8 });
await sleep(120);
const after = await page.evaluate(() => {
  const fs = window.__allAppsDebug?.fs;
  return {
    state: fs?.mState,
    pendingDrag: fs?.mPendingDrag,
    thumbPos: fs?._thumbPos,
    scrollTop: document.getElementById('aaList').scrollTop,
    bubble: document.querySelector('.aa-fs-bubble')?.textContent,
    bubbleOp: getComputedStyle(document.querySelector('.aa-fs-bubble')).opacity,
  };
});
console.log('AFTER DRAG:', JSON.stringify(after));
await browser.close();
