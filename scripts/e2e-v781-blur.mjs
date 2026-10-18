// e2e-v781-blur.mjs — v7.81 壁纸实时模糊（全局开关）E2E 核验
// ① 引擎钩子就绪（__blurBakeTest）
// ② 拖拽跟手：pointer 按住下拉途中画布 opacity 即已抬头（实时驱动，非开完才模糊）
// ③ 全开后 opacity ≈ 1；关闭后画布隐藏
// ④ 设置 › 壁纸与动态壁纸 ›「壁纸实时模糊」开关存在、默认开、关闭即时持久化 localStorage
// ⑤ 关闭态下拉开面板画布不亮；重开后恢复
// ⑥ 全程零 pageerror
//
// 用法：MD3_BASE=http://127.0.0.1:8791/md3/ios-desktop/index.html?nolock=1 node scripts/e2e-v781-blur.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'https://ariefenv-hash.github.io/md3/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/e2e-v781';
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

const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', (e) => { pageErrors++; log('[pageerror]', e.message.slice(0, 200)); });

// 线上 GitHub Pages 链路抖动：networkidle 可能永远不静止 → 改 domcontentloaded + 下方就绪轮询兜底
await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
await sleep(2500);

await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(400);

// 冷加载就绪等待（线上首载可达 10s+）
let ready = false;
for (let i = 0; i < 90; i++) {
  ready = await page.evaluate(() => document.querySelectorAll('.qs-tile-pill').length > 0);
  if (ready) break;
  await sleep(500);
}
check('应用就绪（磁贴已渲染）', ready);

// ① 引擎钩子
const hook = await page.evaluate(() => !!window.__blurBakeTest && typeof window.__blurBakeTest.setPanelProgress === 'function');
check('① 模糊引擎钩子就绪（__blurBakeTest）', hook);

// ② 拖拽跟手：按住不放途中断言画布已在模糊（thresholdPx = 915*0.38 ≈ 348）
await page.mouse.move(206, 8);
await page.mouse.down();
for (let y = 40; y <= 180; y += 20) { await page.mouse.move(206, y); await sleep(24); }
const midDrag = await page.evaluate(() => {
  const c = document.getElementById('desktopBlurCanvas');
  return { exists: !!c, active: !!c && c.classList.contains('active'), opacity: c ? parseFloat(c.style.opacity || '0') : 0 };
});
check('② 拖拽途中画布实时模糊（active + opacity > 0.1）', midDrag.exists && midDrag.active && midDrag.opacity > 0.1, JSON.stringify(midDrag));
for (let y = 200; y <= 380; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(700);
await page.screenshot({ path: `${OUT}/qs-open-blur.png` });

// ③ 全开：补间落位 opacity ≈ 1
const opened = await page.evaluate(() => {
  const c = document.getElementById('desktopBlurCanvas');
  const ov = document.getElementById('pullPanelsOverlay');
  return { active: !!c && c.classList.contains('active'), opacity: c ? parseFloat(c.style.opacity || '0') : 0, overlayActive: !!ov && ov.classList.contains('active') };
});
check('③ 面板全开画布全模糊（opacity ≈ 1）', opened.active && Math.abs(opened.opacity - 1) < 0.05 && opened.overlayActive, JSON.stringify(opened));

// ④ 关面板（状态栏点击 → closePullPanels）
await page.click('#statusBar', { position: { x: Math.round(412 * 0.85), y: 14 }, force: true });
await sleep(800);
const closed = await page.evaluate(() => {
  const c = document.getElementById('desktopBlurCanvas');
  const ov = document.getElementById('pullPanelsOverlay');
  return { active: !!c && c.classList.contains('active'), overlayActive: !!ov && ov.classList.contains('active') };
});
check('④ 面板关闭画布归零（active=false）', !closed.active && !closed.overlayActive, JSON.stringify(closed));

// ⑤ 设置页开关：直达壁纸子页
await page.evaluate(() => window.openWallpaperSettings());
let swEl = null;
for (let i = 0; i < 30; i++) {
  swEl = await page.$('#setWallpaperBlurSwitch');
  if (swEl) break;
  await sleep(500);
}
check('⑤ 设置页「壁纸实时模糊」开关存在', !!swEl);
if (swEl) {
  const checked = await page.evaluate(() => document.getElementById('setWallpaperBlurSwitch').checked);
  check('⑤a 默认开启', checked === true, `checked=${checked}`);
  await page.screenshot({ path: `${OUT}/settings-switch-on.png` });

  // ⑥ 关闭 → 引擎热生效 + localStorage 持久化（input 视觉隐藏，M3 开关需 force 点击）
  await page.click('.md3-switch:has(#setWallpaperBlurSwitch)');
  await sleep(300);
  const offState = await page.evaluate(() => ({
    stored: localStorage.getItem('ios-desktop:wallpaper-blur'),
    enabled: window.__blurBakeTest.isEnabled(),
  }));
  check('⑥ 关闭即时生效 + 持久化 0', offState.stored === '0' && offState.enabled === false, JSON.stringify(offState));

  // ⑦ 重开恢复 + localStorage '1'
  await page.click('.md3-switch:has(#setWallpaperBlurSwitch)');
  await sleep(300);
  const onState = await page.evaluate(() => ({
    stored: localStorage.getItem('ios-desktop:wallpaper-blur'),
    enabled: window.__blurBakeTest.isEnabled(),
  }));
  check('⑦ 重开恢复 + 持久化 1', onState.stored === '1' && onState.enabled === true, JSON.stringify(onState));

  // 再次关闭，验证关闭态下面板模糊彻底失效，再从设置页恢复
  await page.click('.md3-switch:has(#setWallpaperBlurSwitch)');
  await sleep(200);
  // 弹出子页回到设置根（应用保持打开 —— 手势导航下无 nav-bar）
  await page.click('#backBtn', { force: true }); await sleep(800);
  // 应用内状态栏拉开面板（app 窗口覆盖桌面，#statusBar 不可达；面板 z850 在应用之上）
  await page.click('.app-window-status-bar', { position: { x: Math.round(412 * 0.85), y: 14 }, force: true });
  await sleep(900);
  const offBlur = await page.evaluate(() => {
    const c = document.getElementById('desktopBlurCanvas');
    return { active: !!c && c.classList.contains('active'), opacity: c ? parseFloat(c.style.opacity || '0') : 0 };
  });
  check('⑧ 关闭态拉开面板画布不亮', !offBlur.active, JSON.stringify(offBlur));
  await page.screenshot({ path: `${OUT}/qs-open-blur-off.png` });
  // 收起面板
  await page.click('.app-window-status-bar', { position: { x: Math.round(412 * 0.85), y: 14 }, force: true });
  await sleep(700);

  // ⑨ 从设置页恢复开关 → 面板模糊复活
  await page.evaluate(() => window.openWallpaperSettings());
  let swEl2 = null;
  for (let i = 0; i < 30; i++) {
    swEl2 = await page.$('#setWallpaperBlurSwitch');
    if (swEl2) break;
    await sleep(500);
  }
  if (swEl2) {
    await page.click('.md3-switch:has(#setWallpaperBlurSwitch)');
    await sleep(200);
    await page.click('#backBtn', { force: true }); await sleep(800);
    await page.click('.app-window-status-bar', { position: { x: Math.round(412 * 0.85), y: 14 }, force: true });
    await sleep(900);
    const reBlur = await page.evaluate(() => {
      const c = document.getElementById('desktopBlurCanvas');
      return { active: !!c && c.classList.contains('active'), opacity: c ? parseFloat(c.style.opacity || '0') : 0 };
    });
    check('⑨ 恢复开关后面板模糊复活', reBlur.active && reBlur.opacity > 0.9, JSON.stringify(reBlur));
    await page.click('.app-window-status-bar', { position: { x: Math.round(412 * 0.85), y: 14 }, force: true });
  } else {
    check('⑨ 恢复开关后面板模糊复活', false, '设置开关未找到');
  }
}

// ⑩ 零 pageerror
check('⑩ 全程零 pageerror', pageErrors === 0, `errors=${pageErrors}`);

await browser.close();
log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURES'}`);
process.exit(failures === 0 ? 0 : 1);
