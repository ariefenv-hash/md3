// v9.11 = #163 应用抽屉平板态两侧留白（R41 轮）无头回归小判据：
// ①平板视口（768×1024）开抽屉 → data-form=tablet + --aa-side-pad 注入 + sheet computed left/right 相等且 >0
// ②手机视口（390×844）→ 注入值 0px（权威 else 分支：填满）
// ③K 零 pageerror 全程。范式同 e2e-v122/v121：dev 服务器（E2E_BASE 可覆写，默认 8080）。两跑收敛。
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const SHOT = new URL('../docs/v910/allapps-sidepad-tablet.png', import.meta.url).pathname;
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

// A. 平板视口：768×1024 → 两侧留白 84px（used=88×6+8×5+16×2=600 → (768−600)/2=84）
{
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://127.0.0.1:8080/ios-desktop/index.html?nolock=1', { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => window.__allApps.open());
  await sleep(900);
  const r = await page.evaluate(() => {
    const ov = document.querySelector('.all-apps-overlay');
    const sheet = ov.querySelector('.aa-sheet');
    const cs = getComputedStyle(sheet);
    return {
      form: ov.dataset.form,
      active: ov.classList.contains('active'),
      left: parseFloat(cs.left), right: parseFloat(cs.right),
      varVal: ov.style.getPropertyValue('--aa-side-pad'),
    };
  });
  t('A1 平板开抽屉（active + data-form=tablet）', r.active && r.form === 'tablet');
  t('A2 --aa-side-pad 注入 84px（calculateallAppsLeftRightMargin 原值）', r.varVal === '84px', r.varVal);
  t('A3 sheet computed left/right 相等且 = 84', Math.abs(r.left - 84) < 0.5 && Math.abs(r.right - 84) < 0.5,
    `left=${r.left} right=${r.right}`);
  t('A4 零 pageerror（平板段）', errors.length === 0, errors[0] || '');
  try {
    mkdirSync(new URL('../docs/v910/', import.meta.url).pathname, { recursive: true });
    await page.screenshot({ path: SHOT });
  } catch (e) { /* 截图失败不判失败 */ }
  await ctx.close();
}

// B. 手机视口：390×844 → 注入值 0px、sheet 铺满（left/right 0）
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://127.0.0.1:8080/ios-desktop/index.html?nolock=1', { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => window.__allApps.open());
  await sleep(900);
  const r = await page.evaluate(() => {
    const ov = document.querySelector('.all-apps-overlay');
    const sheet = ov.querySelector('.aa-sheet');
    const cs = getComputedStyle(sheet);
    return { form: ov.dataset.form, left: parseFloat(cs.left), right: parseFloat(cs.right) };
  });
  t('B1 手机 form=phone 且 sheet 铺满（left/right 0）', r.form === 'phone' && r.left === 0 && r.right === 0,
    `left=${r.left} right=${r.right}`);
  t('B2 零 pageerror（手机段）', errors.length === 0, errors[0] || '');
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
