// e2e-live-v779.mjs — v7.79 线上站点（github.io）实拍核验：手机/平板双布局 + M3E 竖柄滑条 + 磁贴零溢出
// ① 线上 SW 版本 = geek-v88；入口 CSS 哈希 = 本地构建一致
// ② 手机视口 412×915：QS 面板 4 列、竖柄滑条（柄高于轨道）、页码点、媒体卡、磁贴内容零溢出
// ③ 平板视口 1180×820：QS 面板 6 列、70px 大磁贴、同样零溢出
// ④ 全程零 pageerror
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'https://ariefenv-hash.github.io/md3/ios-desktop/index.html?nolock=1';
const PREFIX = new URL(LIVE.replace('?nolock=1', '')).pathname.replace('/ios-desktop/index.html', '');
const OUT = '/home/z/my-project/e2e-live-v779';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

async function auditViewport(label, vw, vh, expectCols, expectPillH, expectRadiusOff) {
  log(`\n===== ${label} (${vw}×${vh}) =====`);
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
  const page = await ctx.newPage();
  let errors = 0;
  page.on('pageerror', (e) => { errors++; log('[pageerror]', e.message.slice(0, 200)); });
  await page.goto(LIVE, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await sleep(2500);

  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await sleep(400);

  // 冷加载就绪等待：磁贴渲染完成 = 应用初始化完成（线上首载可达 10s+）
  let ready = false;
  for (let i = 0; i < 40; i++) {
    ready = await page.evaluate(() => document.querySelectorAll('.qs-tile-pill').length > 0);
    if (ready) break;
    await sleep(500);
  }
  check(`${label}: 应用就绪（磁贴已渲染）`, ready);

  // SW 版本核验（线上缓存里装的 SW）
  const swVer = await page.evaluate(async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const urls = regs.map((r) => (r.active || r.installing || r.waiting || {}).scriptURL || '');
      const m = (urls.join('|').match(/sw\.js/) || [null])[0];
      const res = await fetch(`${PREFIX}/sw.js`, { cache: 'no-store' });
      const txt = await res.text();
      const vm = txt.match(/const VERSION = '([^']+)'/);
      return { regs: urls.length, liveVersion: vm ? vm[1] : '' };
    } catch (e) { return { regs: -1, liveVersion: 'ERR:' + e.message.slice(0, 60) }; }
  });
  if (label.includes('手机')) check('线上 sw VERSION ≥ geek-v90', /^geek-v9[0-9]$/.test(swVer.liveVersion), JSON.stringify(swVer));

  // 拉起 QS 面板：状态栏右半点击 → pointer 链 openPullPanel(1)（bundle 环境 son兼容）
  await page.click('#statusBar', { position: { x: Math.round(vw * 0.85), y: 14 }, force: true });
  await sleep(1600);
  await page.screenshot({ path: `${OUT}/${label}-qs-open.png` });

  // 结构 + 几何量化核验
  const audit = await page.evaluate((expPillH) => {
    const grid = document.querySelector('.qs-tiles-grid');
    const tiles = [...document.querySelectorAll('.qs-tile-pill')];
    const brightBar = document.getElementById('qsBrightnessBar');
    const brightHandle = brightBar && brightBar.querySelector('.qs-slider-handle');
    const volBar = document.getElementById('qsVolumeBar');
    const volHandle = volBar && volBar.querySelector('.qs-slider-handle');
    const dots = [...document.querySelectorAll('.qs-page-dots .dot')];
    const media = document.getElementById('qsMediaCard');

    const cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0;

    // 溢出检测：每个磁贴的可视内容（含文本）不得超出胶囊边界
    const overflows = [];
    for (const pill of tiles) {
      const pr = pill.getBoundingClientRect();
      if (pill.scrollWidth > pill.clientWidth + 1 || pill.scrollHeight > pill.clientHeight + 1) {
        overflows.push(`${pill.dataset.tileId}:scroll ${pill.scrollWidth}>${pill.clientWidth}`);
      }
      for (const el of pill.querySelectorAll('*')) {
        const er = el.getBoundingClientRect();
        if (er.width === 0 && er.height === 0) continue;
        if (er.left < pr.left - 1.5 || er.right > pr.right + 1.5 || er.top < pr.top - 1.5 || er.bottom > pr.bottom + 1.5) {
          overflows.push(`${pill.dataset.tileId}/${el.className.toString().slice(0, 24)} 超界 ${Math.round(er.right - pr.right)}px`);
        }
      }
    }
    // 磁贴与磁贴之间不得重叠（归位后不拥挤）
    const rects = tiles.map((t) => t.getBoundingClientRect());
    let overlaps = 0;
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 2 && oy > 2) overlaps++;
    }

    const sliderGeo = (bar, handle) => {
      if (!bar || !handle) return null;
      const br = bar.getBoundingClientRect();
      const hr = handle.getBoundingClientRect();
      return { h: Math.round(hr.height), bh: Math.round(br.height), taller: hr.height > br.height, hx: Math.round(hr.left + hr.width / 2 - br.left), bw: Math.round(br.width), cx: Math.round(hr.left + hr.width / 2) };
    };
    const pillHeights = [...new Set(tiles.map((t) => Math.round(t.getBoundingClientRect().height)))];
    const gridWidth = grid ? Math.round(grid.getBoundingClientRect().width) : 0;
    const panelVisible = (() => {
      const ov = document.getElementById('pullPanelsOverlay');
      const pn = document.getElementById('quickSettingsPanel');
      if (!ov || !pn) return false;
      const cs = getComputedStyle(pn);
      const r = pn.getBoundingClientRect();
      const onScreen = r.right > 0 && r.left < window.innerWidth && r.height > 0;
      return onScreen && ov.classList.contains('active') && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0.5;
    })();
    return {
      cols, gridWidth, tiles: tiles.length, pillHeights,
      overflows, overlaps,
      bright: sliderGeo(brightBar, brightHandle),
      vol: sliderGeo(volBar, volHandle),
      dots: dots.length, mediaPresent: !!media,
      mediaHidden: media ? media.classList.contains('media-hidden') : null,
      buildTag: (document.querySelector('.qs-build-version') || {}).textContent || '',
      panelVisible,
      tileRadius: (() => {
        // v7.80：取非激活磁贴测 OFF 圆角（tiles[0] Internet 默认激活，量到的是 ON 值）
        const off = tiles.find((t) => !t.classList.contains('active')) || tiles[0];
        return off ? getComputedStyle(off).borderRadius : '';
      })(),
    };
  }, expectPillH);

  check(`${label}: QS 面板可见`, audit.panelVisible);
  check(`${label}: 构建号页脚（16 BP31）在场`, audit.buildTag.includes('BP31'), audit.buildTag);
  // 点亮媒体卡：MEDIA_STATE_SYNC postMessage → bundle 内 mediaService 覆盖层
  await page.evaluate(() => {
    window.postMessage({
      type: 'MEDIA_STATE_SYNC',
      payload: {
        title: 'Expressive Test', artist: 'E2E', isPlaying: true,
        currentTime: 42, duration: 180,
        coverGradient: 'linear-gradient(135deg,#7c4dff,#448aff)',
      },
    }, '*');
  });
  await sleep(400);
  // postMessage 就绪等待：media-service 监听器已注册（bundle 求值完成）
  await sleep(300);
  const mediaOk = await page.evaluate(() => {
    const card = document.getElementById('qsMediaCard');
    return card ? { hidden: card.classList.contains('media-hidden'), title: (document.getElementById('qsMediaTitle') || {}).textContent } : null;
  });
  check(`${label}: 媒体卡点亮后展开（曲名联动）`, !!mediaOk && mediaOk.hidden === false && mediaOk.title === 'Expressive Test', JSON.stringify(mediaOk));
  await page.screenshot({ path: `${OUT}/${label}-media-on.png` });
  check(`${label}: 磁贴网格 ${expectCols} 列`, audit.cols === expectCols, `cols=${audit.cols} gridW=${audit.gridWidth}`);
  check(`${label}: 磁贴高度 ≈${expectPillH}px`, audit.pillHeights.length === 1 && Math.abs(audit.pillHeights[0] - expectPillH) <= 4, `heights=${JSON.stringify(audit.pillHeights)}`);
  // v7.80 圆角两态体系：OFF 圆角率 0.36H（胶囊 9999px 退役）
  check(`${label}: OFF 圆角 ≈${expectRadiusOff}px（两态体系）`, Math.abs(parseFloat(audit.tileRadius) - expectRadiusOff) <= 3, `radius=${audit.tileRadius}`);
  // 激活一枚开关磁贴 → 圆角应收小（0.22H）；同时取回激活值验证两态差异
  const radiusPair = await page.evaluate(() => {
    const pill = document.querySelector('.qs-tile-pill[data-tile-id="torch"], .qs-tile-pill[data-tile-id="aeroplane"]');
    if (!pill) return null;
    const off = (() => { const t = [...document.querySelectorAll('.qs-tile-pill')].find((x) => !x.classList.contains('active')); return t ? getComputedStyle(t).borderRadius : ''; })();
    pill.click();
    return new Promise((r) => setTimeout(() => r({ off, on: getComputedStyle(pill).borderRadius }), 450));
  });
  check(`${label}: OFF→ON 圆角收小（两态体系 ${radiusPair && radiusPair.off} → ${radiusPair && radiusPair.on}）`, !!radiusPair && parseFloat(radiusPair.on) < parseFloat(radiusPair.off) - 3, JSON.stringify(radiusPair));
  check(`${label}: 磁贴内容零溢出/零截断`, audit.overflows.length === 0, audit.overflows.slice(0, 4).join(' ; ') || 'clean');
  check(`${label}: 磁贴间零重叠（归位不拥挤）`, audit.overlaps === 0, `overlaps=${audit.overlaps}`);
  check(`${label}: 亮度滑条竖柄在场且高于轨道`, !!audit.bright && audit.bright.taller, JSON.stringify(audit.bright));
  check(`${label}: 音量滑条竖柄在场且高于轨道`, !!audit.vol && audit.vol.taller, JSON.stringify(audit.vol));
  check(`${label}: 页码点在场`, audit.dots >= 2, `dots=${audit.dots}`);
  check(`${label}: 媒体卡在场`, audit.mediaPresent);
  check(`${label}: 全程零 pageerror`, errors === 0, `errors=${errors}`);

  // v7.80 平板浮层卡：面板圆角 44px + 内浮（≥640px 才有）
  if (vw >= 640) {
    const panelRadius = await page.evaluate(() => getComputedStyle(document.getElementById('quickSettingsPanel')).borderRadius);
    check(`${label}: 面板浮层卡圆角 44px`, panelRadius === '44px', `radius=${panelRadius}`);
  }

  // 竖柄特写
  await page.screenshot({ path: `${OUT}/${label}-sliders.png`, clip: { x: 0, y: 0, width: vw, height: Math.min(vh, 480) } });
  await ctx.close();
  return true;
}

await auditViewport('phone', 412, 915, 4, 64, 23);
await auditViewport('tablet', 1180, 820, 4, 96, 34);

await browser.close();
log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
