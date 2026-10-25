// ==================== e2e-v815-media-card-single-source.mjs — #37 无头回归 ====================
//
// DoD（议题 #37）：
//   A. classic split（≥600px）：播放会话展开面板 → 通知侧媒体卡被单源投影压制，
//      视口内可见音乐卡恰 1 张（QS 侧权威卡）
//   B. classic 窄屏场景轨：shade 场景可见卡 = 1（通知侧紧凑卡）；下拉进 QS 场景后
//      可见卡仍 = 1（磁贴下方宽版卡）——场景轨互斥等价 AOSP reparent
//   C. dual 分家：双浮动面板同时展开 → 通知面板内媒体卡压制，可见卡 = 1；
//      QS 面板内媒体卡与磁贴网格 bounding box 不相交（重合随双显一并消除）
//   D. 状态机：清空媒体会话 → 全部音乐卡 media-hidden，零孤儿卡
// 驱动：动态 import /js/media-service.js 单例 applyExternalState（同 URL 模块缓存 =
// 与 app 内部同一实例）；面板：真实下拉手势 / dual 命中区点击。
// 截图：CDP Page.captureScreenshot（v8.07 惯例）。

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v815');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const shot = async (page, path) => {
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(path, Buffer.from(data, 'base64'));
};

// 页面内工具：可见音乐卡普查（相交视口 + 真实可见 + 高度门槛三重判定）
const census = `
  window.__mediaCardCensus = () => {
    const ids = ['pixelMediaCard', 'qsMediaCard'];
    const out = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      let vis = typeof el.checkVisibility === 'function'
        ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
        : true;
      const inViewport = r.width > 10 && r.height > 10 && r.bottom > 0 && r.top < innerHeight &&
                         r.right > 0 && r.left < innerWidth;
      out.push({ id, vis: !!(vis && inViewport), display: getComputedStyle(el).display,
                 top: Math.round(r.top), h: Math.round(r.height) });
    }
    return out;
  };
`;

async function startMediaSession(page) {
  return page.evaluate(async () => {
    const m = await import('/ios-desktop/js/media-service.js');
    m.mediaService.applyExternalState({
      title: '李奕遐', artist: 'E2E v8.15', isPlaying: true, currentTime: 30, duration: 200,
    });
    return true;
  });
}
async function clearMediaSession(page) {
  return page.evaluate(async () => {
    const m = await import('/ios-desktop/js/media-service.js');
    m.mediaService.applyExternalState({ title: '', isPlaying: false });
    return true;
  });
}

// ---------- 场景 A：classic 宽屏 split（1280×800） ----------
console.log('场景 A：classic split 1280×800 — 单源 QS，通知侧卡压制');
{
  const browser = await chromium.launch({ headless: true, executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1400);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(census);
  await startMediaSession(page);
  await sleep(600);

  // 真实下拉打开面板（宽屏 split 双列常显）
  await page.mouse.move(640, 8);
  await page.mouse.down();
  for (let y = 40; y <= 420; y += 35) { await page.mouse.move(640, y); await sleep(20); }
  await page.mouse.up();
  await sleep(1000);

  const st = await page.evaluate(() => {
    const overlay = document.getElementById('pullPanelsOverlay');
    const host = document.body.dataset.mediaHost;
    const cards = window.__mediaCardCensus();
    const pixel = document.getElementById('pixelMediaCard');
    return {
      overlayActive: overlay?.classList.contains('active'),
      host,
      cards,
      pixelDisplay: pixel ? getComputedStyle(pixel).display : 'missing',
      visibleCount: cards.filter((c) => c.vis).length,
    };
  });
  A('面板已展开', st.overlayActive === true);
  A('宿主裁决 = qs（split ≥600px）', st.host === 'qs', `host=${st.host}`);
  A('通知侧卡结构性压制 display:none', st.pixelDisplay === 'none', st.pixelDisplay);
  A('视口内可见音乐卡恰 1 张', st.visibleCount === 1, JSON.stringify(st.cards));
  A('零 pageerror', errors.length === 0, errors.join(';').slice(0, 120));
  await shot(page, join(OUT, 'v815-split-single-source.png'));
  await browser.close();
}

// ---------- 场景 B：classic 窄屏场景轨（420×900） ----------
console.log('场景 B：classic 窄屏 420×900 — 场景轨互斥，两场景各 1 张');
{
  const browser = await chromium.launch({ headless: true, executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1400);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(census);
  await startMediaSession(page);
  await sleep(600);

  // 段一下拉 → shade 场景
  await page.mouse.move(206, 8);
  await page.mouse.down();
  for (let y = 40; y <= 340; y += 30) { await page.mouse.move(206, y); await sleep(20); }
  await page.mouse.up();
  await sleep(1000);

  const shade = await page.evaluate(() => ({
    host: document.body.dataset.mediaHost,
    cards: window.__mediaCardCensus(),
    visibleCount: window.__mediaCardCensus().filter((c) => c.vis).length,
  }));
  A('宿主裁决 = both（窄屏场景轨）', shade.host === 'both', `host=${shade.host}`);
  A('shade 场景可见卡恰 1 张（通知侧紧凑卡）', shade.visibleCount === 1 &&
    shade.cards.find((c) => c.id === 'pixelMediaCard')?.vis === true, JSON.stringify(shade.cards));

  // 继续下拉 → QS 场景（dy>5 驱动场景轨；起手避开 .noti-media-card 拖拽排除区）
  await page.mouse.move(206, 420);
  await page.mouse.down();
  for (let y = 440; y <= 760; y += 30) { await page.mouse.move(206, y); await sleep(20); }
  await page.mouse.up();
  await sleep(1000);

  const qs = await page.evaluate(() => ({
    cards: window.__mediaCardCensus(),
    visibleCount: window.__mediaCardCensus().filter((c) => c.vis).length,
  }));
  A('QS 场景可见卡仍恰 1 张（磁贴下方宽版卡）', qs.visibleCount === 1 &&
    qs.cards.find((c) => c.id === 'qsMediaCard')?.vis === true, JSON.stringify(qs.cards));
  A('零 pageerror', errors.length === 0, errors.join(';').slice(0, 120));
  await shot(page, join(OUT, 'v815-narrow-qs-scene.png'));

  // D（状态机）：清空媒体会话 → 零孤儿卡
  await clearMediaSession(page);
  await sleep(700);
  const cleared = await page.evaluate(() => {
    const cards = window.__mediaCardCensus();
    const pixel = document.getElementById('pixelMediaCard');
    const qsc = document.getElementById('qsMediaCard');
    return {
      visibleCount: cards.filter((c) => c.vis).length,
      pixelHidden: pixel?.classList.contains('media-hidden'),
      qsHidden: qsc?.classList.contains('media-hidden'),
    };
  });
  A('清空会话后视口内零孤儿卡', cleared.visibleCount === 0, JSON.stringify(cleared));
  A('两卡均回落 media-hidden 门控', cleared.pixelHidden === true && cleared.qsHidden === true);
  await browser.close();
}

// ---------- 场景 C：dual 分家（420×900 双浮动面板） ----------
console.log('场景 C：dual 分家 420×900 — 双面板同开仍单源，重合消除');
{
  const browser = await chromium.launch({ headless: true, executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}?nolock=1&shadeMode=dual`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1400);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(census);
  await startMediaSession(page);
  await sleep(600);

  // 双浮动面板同时展开（命中区 click 切换）
  await page.evaluate(() => {
    document.getElementById('dualHitNotif')?.click();
    document.getElementById('dualHitQs')?.click();
  });
  await sleep(1100);

  const st = await page.evaluate(() => {
    const host = document.body.dataset.mediaHost;
    const mode = document.body.dataset.shadeMode;
    const pixel = document.getElementById('pixelMediaCard');
    const qsCard = document.getElementById('qsMediaCard');
    const tiles = document.getElementById('qsTilesContainer');
    const panelQs = document.getElementById('dualQsPanel');
    const pr = qsCard?.getBoundingClientRect();
    const tr = tiles?.getBoundingClientRect();
    const qpr = panelQs?.getBoundingClientRect();
    return {
      host, mode,
      pixelDisplay: pixel ? getComputedStyle(pixel).display : 'missing',
      qsVis: !!qsCard && qsCard.getBoundingClientRect().height > 10 &&
        (typeof qsCard.checkVisibility === 'function'
          ? qsCard.checkVisibility({ checkOpacity: true }) : true),
      cards: window.__mediaCardCensus().filter((c) => c.vis),
      // 重合断言：QS 面板内媒体卡与磁贴网格垂直不相交（流式布局，卡在磁贴下方）
      noOverlap: pr && tr ? (pr.top >= tr.bottom - 1 || pr.bottom <= tr.top + 1) : null,
      qsPanelOpen: !!(qpr && qpr.height > 100),
    };
  });
  A('shadeMode = dual 已生效', st.mode === 'dual');
  A('宿主裁决 = qs（dual 单源）', st.host === 'qs', `host=${st.host}`);
  A('通知面板内媒体卡压制 display:none', st.pixelDisplay === 'none', st.pixelDisplay);
  A('QS 浮动面板已展开', st.qsPanelOpen === true);
  A('QS 权威卡可见', st.qsVis === true);
  A('视口内可见音乐卡恰 1 张（双面板同开）', st.cards.length === 1, JSON.stringify(st.cards));
  A('媒体卡与磁贴网格 bounding box 不相交（重合消除）', st.noOverlap === true);
  A('零 pageerror', errors.length === 0, errors.join(';').slice(0, 120));
  await shot(page, join(OUT, 'v815-dual-single-source.png'));
  await browser.close();
}

console.log(`\n==== v815 e2e 汇总：PASS ${pass} / FAIL ${fail} ====`);
process.exit(fail > 0 ? 1 : 0);
