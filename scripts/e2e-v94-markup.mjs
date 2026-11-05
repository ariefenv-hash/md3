// ==================== e2e-v94-markup.mjs — #94 二期光栅源 + Markup 浮层 + VFS 出口真跑（v10.05） ====================
// S1 真捕获：capture() → 光栅成功（pending.rastered=true）+ shelf 真缩略图（img dataURL）
// S2 EDIT intent：缩略图点按 → Markup 浮层开（__markupTest.open）
// S3 笔迹会话：pen 三点一笔 → undo → 0 条 → redo 回放 → 1 条（v10.04 快照入账契约真跑）
// S4 工具/色板切换：highlighter + 第二色 → 画 → 2 条笔迹
// S5 橡皮：读首笔中点画布坐标精确换算 CSS 点击位 → hitTest 命中擦除
// S6 裁切：crop 拉框 → setCrop 钳位生效（cropRect 非空且 ≥ MIN_CROP_EDGE）
// S7 保存：浮层关 + VFS PNG 存在 + 伴生 .markup.json 存在 + deserializeMarkup 往返一致 + lastSaved 桥
// S8 超时自动落盘（saveScreenshotAndToast 语义）：capture 后零交互 → 超时 → VFS 第二张
// S9 分享：share-sheet 打开（.share-sheet-root）+ 图像载荷链路
// S10 全局动作解锁：resolveVisibleActions screenshotAvailable:true 含 screenshot（#113 B3 接线兑现）
// S11 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8997;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' : ''}${extra}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
let failed = 0;
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(400);

  // S1 真捕获：光栅源（DOM→SVG→Canvas）→ pending.rastered=true + shelf 真缩略图
  await page.evaluate(() => { window.__screenshot.capture(); });
  await sleep(1600); // 光栅（序列化+SVG 装载）+ 角标入场余量
  const s1 = await page.evaluate(() => {
    const shelf = document.getElementById('screenshotShelf');
    const thumbImg = shelf ? shelf.querySelector('.ss-thumb img') : null;
    return {
      state: window.__screenshot.shelfState(),
      rastered: !!(window.__screenshot.pending() && window.__screenshot.pending().rastered),
      thumbIsImg: !!thumbImg && String(thumbImg.src || '').startsWith('data:image/png;base64,'),
      flashSeen: !!document.getElementById('screenshotFlash'),
    };
  });
  A('S1 真捕获：光栅成功 + shelf 真缩略图（data:image/png）+ 白闪', s1.state === 'shown' && s1.rastered && s1.thumbIsImg && s1.flashSeen, JSON.stringify(s1));

  // S2 EDIT intent：缩略图点按 → Markup 浮层开
  await page.evaluate(() => { document.querySelector('#screenshotShelf .ss-thumb').click(); });
  await sleep(500);
  const s2 = await page.evaluate(() => ({
    open: !!(window.__markupTest && window.__markupTest.open()),
    hasCanvas: !!document.querySelector('#markupLayer .mk-canvas'),
    canvasSize: (() => { const c = document.querySelector('#markupLayer .mk-canvas'); return c ? { w: c.width, h: c.height } : null; })(),
  }));
  A('S2 EDIT intent：缩略图点按 → 浮层开 + 画布 = 视口尺寸', s2.open && s2.hasCanvas && s2.canvasSize && s2.canvasSize.w === 900 && s2.canvasSize.h === 700, JSON.stringify(s2));

  // 画布 CSS 盒与坐标换算（画布内部 900x700）
  const box = await page.locator('#markupLayer .mk-canvas').boundingBox();
  const cssX = (px) => box.x + (px * box.width) / 900;
  const cssY = (py) => box.y + (py * box.height) / 700;
  const drawAt = async (fx, fy) => {
    await page.mouse.move(cssX(900 * fx), cssY(700 * fy));
    await page.mouse.down();
    await page.mouse.move(cssX(900 * (fx + 0.1)), cssY(700 * (fy + 0.06)), { steps: 6 });
    await page.mouse.move(cssX(900 * (fx + 0.2)), cssY(700 * (fy + 0.02)), { steps: 6 });
    await page.mouse.up();
    await sleep(120);
  };

  // S3 pen 三点一笔 → undo → redo（v10.04 快照入账契约真跑）
  await drawAt(0.2, 0.3);
  const s3a = await page.evaluate(() => window.__markupTest.session().strokes.length);
  await page.evaluate(() => { document.querySelector('#markupLayer [data-act="undo"]').click(); });
  await sleep(120);
  const s3b = await page.evaluate(() => window.__markupTest.session().strokes.length);
  await page.evaluate(() => { document.querySelector('#markupLayer [data-act="redo"]').click(); });
  await sleep(120);
  const s3c = await page.evaluate(() => window.__markupTest.session().strokes.length);
  A('S3 笔迹会话：一笔入账 → undo 清零 → redo 快照回放', s3a === 1 && s3b === 0 && s3c === 1, JSON.stringify({ a: s3a, b: s3b, c: s3c }));

  // S4 highlighter + 第二色：工具切换真跑
  await page.evaluate(() => {
    document.querySelector('#markupLayer [data-tool="highlighter"]').click();
    document.querySelector('#markupLayer .mk-dot[data-color="#FFB4AB"]').click();
  });
  await drawAt(0.25, 0.55);
  const s4 = await page.evaluate(() => {
    const st = window.__markupTest.session().strokes;
    return { n: st.length, last: st[st.length - 1] };
  });
  A('S4 工具/色板切换：highlighter 笔迹入账（工具+色+宽消费真源）',
    s4.n === 2 && s4.last.tool === 'highlighter' && s4.last.color === '#FFB4AB', JSON.stringify(s4));

  // S5 橡皮：读首笔中点画布坐标 → 精确换算 CSS 点击位 → hitTest 命中擦除
  const s5pre = await page.evaluate(() => {
    const st = window.__markupTest.session().strokes;
    const s = st[0];
    const p = s.points[Math.floor(s.points.length / 2)];
    return { n: st.length, px: p[0], py: p[1] };
  });
  await page.evaluate(() => { document.querySelector('#markupLayer [data-tool="eraser"]').click(); });
  await page.mouse.move(cssX(s5pre.px), cssY(s5pre.py));
  await page.mouse.down();
  await page.mouse.up();
  await sleep(150);
  const s5 = await page.evaluate(() => window.__markupTest.session().strokes.length);
  A('S5 橡皮：hitTest 命中擦除 → 笔迹 2→1', s5 === s5pre.n - 1, `after=${s5} pre=${s5pre.n} canvas(${s5pre.px},${s5pre.py})`);

  // S6 裁切拉框：crop 工具 → 拖框 → setCrop 钳位生效
  await page.evaluate(() => { document.querySelector('#markupLayer [data-tool="crop"]').click(); });
  await page.mouse.move(cssX(900 * 0.15), cssY(700 * 0.15));
  await page.mouse.down();
  await page.mouse.move(cssX(900 * 0.75), cssY(700 * 0.75), { steps: 8 });
  await page.mouse.up();
  await sleep(150);
  const s6 = await page.evaluate(() => {
    const c = window.__markupTest.crop();
    return c && { ...c, minOk: c.w >= 32 && c.h >= 32 };
  });
  A('S6 裁切：拉框 → setCrop 生效（≥ MIN_CROP_EDGE 32）', s6 && s6.minOk && s6.w > 100, JSON.stringify(s6));

  // S7 保存：VFS PNG + 伴生 markup.json + deserializeMarkup 往返 + lastSaved 桥
  await page.evaluate(() => { document.querySelector('#markupLayer [data-act="save"]').click(); });
  await sleep(1200);
  const s7 = await page.evaluate(async () => {
    const path = window.__screenshot.lastSaved();
    if (!path) return { saved: false };
    const meta = window.__vfs.stat(path); // stat() 直返 entry（桥内 reply({entry: stat(path)}) 同源）
    const pngOk = !!meta && meta.type === 'file';
    const sidecar = path.replace(/\.png$/, '.markup.json');
    const scMeta = window.__vfs.stat(sidecar);
    const sc = !!scMeta && scMeta.type === 'file';
    let roundtrip = null;
    if (sc) {
      const raw = await window.__vfs.readText(sidecar);
      const mod = await import('/ios-desktop/js/aosp/markup-editor.js');
      const d = mod.deserializeMarkup(raw);
      roundtrip = d ? d.session.__debug().strokes.length : null;
    }
    return { saved: true, path, pngOk, sidecarOk: sc, roundtrip, layerGone: !document.getElementById('markupLayer') };
  });
  A('S7 保存：VFS PNG + 伴生 json + codec 往返笔迹数 = 1 + 浮层关闭',
    s7.saved && s7.pngOk && s7.sidecarOk && s7.roundtrip === 1 && s7.layerGone && String(s7.path).startsWith('/Pictures/Screenshots/Screenshot_'),
    JSON.stringify(s7));

  // S8 超时自动落盘（零交互 → saveScreenshotAndToast 语义）
  await page.evaluate(() => { window.__screenshot.capture(); });
  await sleep(1600);
  const rem = await page.evaluate(() => window.__screenshot.shelfRemainingMs());
  await sleep(rem + 900);
  const s8 = await page.evaluate(() => {
    const p = window.__screenshot.pending();
    return { state: window.__screenshot.shelfState(), saved: !!(p && p.saved), path: window.__screenshot.lastSaved() };
  });
  A('S8 超时自动落盘：6s 零交互 → VFS 第二张 + pending.saved=true',
    s8.state === 'idle' && s8.saved && s8.path !== s7.path, JSON.stringify(s8));

  // S9 分享：EDIT → share → share-sheet 打开（图像载荷）
  await page.evaluate(() => { window.__screenshot.openMarkup(); });
  await sleep(400);
  await page.evaluate(() => { document.querySelector('#markupLayer [data-act="share"]').click(); });
  await sleep(600);
  const s9 = await page.evaluate(() => ({
    sheetOpen: !!document.querySelector('.share-sheet-root'),
    layerGone: !document.getElementById('markupLayer'),
  }));
  A('S9 分享：share-sheet 打开（#200 图像载荷链路）+ 浮层结算', s9.sheetOpen && s9.layerGone, JSON.stringify(s9));
  await page.evaluate(() => {
    const b = document.querySelector('.share-sheet-root [data-share-close], .share-sheet-root .close, .share-sheet-root [data-act="close"]');
    if (b) b.click();
    else { const el = document.querySelector('.share-sheet-root'); if (el) el.remove(); }
  });
  await sleep(300);

  // S10 全局动作解锁（#113 B3 接线兑现）
  const s10 = await page.evaluate(() => {
    const ids = window.__globalActions.visible(false).map((a) => a.id);
    return { ids, has: ids.includes('screenshot') };
  });
  A('S10 全局动作：screenshot 入列（screenshotAvailable:true 解锁）', s10.has, JSON.stringify(s10.ids));

  // S11 全程零 pageerror
  A('S11 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 300));
} catch (e) {
  console.log('FATAL', e);
  failed = 1;
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
failed = results.filter((r) => !r[0]).length;
console.log(`\n==== e2e-v94 summary: ${results.length - failed}/${results.length} passed ====`);
process.exit(failed ? 1 : 0);
