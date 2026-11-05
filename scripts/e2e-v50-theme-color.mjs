// ==================== e2e-v50-theme-color.mjs — #50 ColorBlendr 式主题色自定义 e2e（v10.02） ====================
//
// 场景（dist 部署档 + 真渲染路径 __initWallpaperPage）：
//   S1 桌面就绪（零 pageerror）
//   S2 主题色卡渲染：section/开关/预设 8 swatch/风格 10 chips/混色条 7 块/三滑杆+对比度
//   S3 点预设 #B3261E → 配置落库 + --md-primary 变 Monet rgb 链 + 副文案「已应用自定义配色」
//   S4 切 MONOCHROMATIC 风格 → --md-primary 灰化（RGB 通道极差 ≤6）
//   S5 主色饱和滑杆 0 → --md-primary 彩度近零
//   S6 重置为壁纸取色 → cfg 清空 + --md-primary 回 hsl hue 链
//   S7 混色条第 4 块点击 → seed 落库为该块 hex
//   S8 开关关→开 循环（clear/apply 双路径）+ 全程零 pageerror
//
// 用法：npm run build && node scripts/e2e-v50-theme-color.mjs [--port 8091]
// 退出码：0 = 全绿；1 = 任何断言失败

import { chromium } from 'playwright';
import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const PORT = portIdx !== -1 ? Number(args[portIdx + 1]) : 8091;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

if (!existsSync(path.join(distDir, 'index.html'))) {
  console.error('[e2e-v50] dist/ 不存在或未构建 —— 先 npm run build');
  process.exit(1);
}

// ---------- dist 静态服务（零依赖，MIME 与 e2e-dist-smoke.mjs 同表） ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let fp = path.join(distDir, urlPath);
  if (!fp.startsWith(distDir)) { res.writeHead(403); res.end(); return; }
  if (statSync(fp, { throwIfNoEntry: false })?.isDirectory()) fp = path.join(fp, 'index.html');
  try {
    const data = readFileSync(fp);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 ' + urlPath);
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const step = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `（${detail}）` : ''}`);
  if (!ok) failures++;
};

// ---------- 断言辅助 ----------
const parseRgb = (css) => {
  const m = css.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};

try {
  await new Promise((r) => server.listen(PORT, r));
  // 与 e2e-dist-smoke.mjs 同款浏览器定位（沙箱 playwright 缓存为 chromium-1200，
  // 默认 launch 期望 headless_shell-1248 会 miss）
  const fsMod = await import('node:fs');
  const EXE_CANDIDATES = [process.env.MD3_CHROME, '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'].filter(Boolean);
  const launchOpts = { headless: true };
  for (const c of EXE_CANDIDATES) if (fsMod.existsSync(c)) { launchOpts.executablePath = c; break; }
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  // e2e 惯例：外域断网
  await page.route(/^(?!http:\/\/127\.0\.0\.1|http:\/\/localhost)/, (route) => route.abort());

  await page.goto(`http://127.0.0.1:${PORT}/ios-desktop/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);

  // S1 桌面就绪
  const desktopReady = await page.evaluate(() => !!document.querySelector('#desktop'));
  step('S1 桌面就绪', desktopReady);

  // S2 主题色卡渲染（真渲染路径：__initWallpaperPage 挂载）
  const s2 = await page.evaluate(() => {
    const box = document.createElement('div');
    box.id = 'e2eTcBox';
    document.body.appendChild(box);
    if (!window.__initWallpaperPage) return { hook: false };
    window.__initWallpaperPage(box);
    const q = (sel) => box.querySelector(sel);
    return {
      hook: true,
      section: !!q('[data-test="theme-color-section"]'),
      switchEl: !!q('[data-test="theme-color-switch"]'),
      presets: box.querySelectorAll('[data-tc-preset]').length,
      styles: box.querySelectorAll('[data-tc-style]').length,
      ramp: box.querySelectorAll('[data-tc-ramp]').length,
      sliders: box.querySelectorAll('input[type="range"]').length,
      importBtn: !!q('[data-test="theme-color-import-btn"]'),
      resetBtn: !!q('[data-test="theme-color-reset-btn"]'),
      sub: q('[data-test="theme-color-sub"]')?.textContent || '',
    };
  });
  step('S2 主题色卡渲染', s2.hook && s2.section && s2.presets === 8 && s2.styles === 10 && s2.ramp === 7 && s2.sliders === 4 && s2.importBtn && s2.resetBtn,
    `presets=${s2.presets} styles=${s2.styles} ramp=${s2.ramp} sliders=${s2.sliders}`);

  const getPrimary = () => page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--md-primary').trim());

  const primaryBefore = await getPrimary();

  // S3 点预设 #B3261E
  await page.evaluate(() => {
    document.querySelector('#e2eTcBox [data-test="tc-preset-B3261E"]').click();
  });
  await sleep(400);
  const s3 = await page.evaluate(() => {
    const cfg = window.__themeColorTest.cfg;
    return {
      cfgSeed: cfg && cfg.seed, enabled: !!(cfg && cfg.enabled),
      sub: document.querySelector('[data-test="theme-color-sub"]').textContent,
    };
  });
  const primaryAfter = await getPrimary();
  const pa = parseRgb(primaryAfter);
  step('S3 预设红落库 + Monet 链生效', s3.cfgSeed === '#B3261E' && s3.enabled && s3.sub.includes('已应用自定义配色')
    && pa && primaryAfter.startsWith('rgb('),
    `seed=${s3.cfgSeed} primary=${primaryBefore}→${primaryAfter}`);

  // S4 MONOCHROMATIC 灰化
  await page.evaluate(() => {
    document.querySelector('#e2eTcBox [data-test="tc-style-MONOCHROMATIC"]').click();
  });
  await sleep(400);
  const monoCss = await getPrimary();
  const mono = parseRgb(monoCss);
  const monoGray = mono && (Math.max(...mono) - Math.min(...mono)) <= 6;
  step('S4 MONOCHROMATIC 主色灰化', monoGray, `primary=${monoCss}`);

  // S5 主色饱和 0 → 近灰（input 事件）
  await page.evaluate(() => {
    const el = document.querySelector('#e2eTcBox [data-test="tc-slider-accent-sat"]');
    el.value = '0';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(400);
  const sat0 = parseRgb(await getPrimary());
  const sat0Gray = sat0 && (Math.max(...sat0) - Math.min(...sat0)) <= 6;
  step('S5 主色饱和 0 → 近灰', sat0Gray, `primary=${await getPrimary()}`);

  // S6 重置为壁纸取色
  await page.evaluate(() => {
    document.querySelector('#e2eTcBox [data-test="theme-color-reset-btn"]').click();
  });
  await sleep(400);
  const s6 = await page.evaluate(() => ({
    cfg: window.__themeColorTest.cfg,
    sub: document.querySelector('[data-test="theme-color-sub"]').textContent,
  }));
  const primaryReset = await getPrimary();
  step('S6 重置回壁纸取色链', s6.cfg === null && s6.sub.includes('手动配色') && primaryReset.startsWith('hsl('),
    `primary=${primaryReset}`);

  // S7 混色条第 4 块点击
  await page.evaluate(() => {
    const blocks = document.querySelectorAll('#e2eTcBox [data-tc-ramp]');
    blocks[3].click();
  });
  await sleep(400);
  const s7 = await page.evaluate(() => {
    const cfg = window.__themeColorTest.cfg;
    const ramp = document.querySelectorAll('#e2eTcBox [data-tc-ramp]');
    return { seed: cfg && cfg.seed, rampHex: ramp[3] ? ramp[3].getAttribute('data-tc-ramp') : null, enabled: !!(cfg && cfg.enabled) };
  });
  step('S7 混色块点击落库', s7.enabled && s7.seed === s7.rampHex && s7.seed.startsWith('#'),
    `seed=${s7.seed}`);

  // S8 关→开循环
  await page.evaluate(() => {
    document.querySelector('#e2eTcBox [data-test="theme-color-reset-btn"]').click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const sw = document.querySelector('#e2eTcBox [data-test="theme-color-switch"]');
    sw.click(); // 开
  });
  await sleep(400);
  const s8on = await page.evaluate(() => !!(window.__themeColorTest.cfg && window.__themeColorTest.cfg.enabled));
  await page.evaluate(() => {
    const sw = document.querySelector('#e2eTcBox [data-test="theme-color-switch"]');
    sw.click(); // 关
  });
  await sleep(400);
  const s8off = await page.evaluate(() => window.__themeColorTest.cfg === null);
  step('S8 开关开→关循环', s8on && s8off, `on=${s8on} off=${s8off}`);

  // S8b 全程零 pageerror
  step('S8b 零 pageerror', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  await browser.close();
} catch (e) {
  console.error('[e2e-v50] 异常中断：', e);
  failures++;
} finally {
  server.close();
}

console.log(`[e2e-v50] 结果：PASS ${9 - failures} / FAIL ${failures}`);
process.exit(failures ? 1 : 0);
