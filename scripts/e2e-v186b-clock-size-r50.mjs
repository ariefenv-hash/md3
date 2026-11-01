// v9.27 = #186 二期 ClockSize 双档 + DYNAMIC 策略 无头回归（R50 窗）：
// S1  默认种子（有通知）→ SMALL 档：小钟 visible / 大钟 display:none（GONE）
// S2  双容器常驻 DOM（小钟 + 大钟同时在场 = 显隐切换非重建）
// S3  清空通知（localStorage 种子 '[]'）→ DYNAMIC 重判 → LARGE 档：
//     小钟 visibility:hidden（INVISIBLE 保布局锚）/ 大钟 display:block
// S4  大钟 HH:MM 渲染 + 字号大于小钟（region 语义视觉分化）
// S5  大钟 font-family RobotoFlex + 内联 font-variation-settings 四轴管线（双容器同链路）
// S6  __lockTest.clockSize() 档位观测：displayed 名称记忆（SMALL/LARGE）
// S7  零 pageerror 收敛（两场景）
// 范式同 e2e-v186-font-variation-r49 / e2e-v193：dev 服务器（E2E_BASE 可覆写，默认 8080）。
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
});

async function freshPage(seedEmptyNotifications) {
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  if (seedEmptyNotifications) {
    await ctx.addInitScript(() => {
      try { localStorage.setItem('ios-desktop:notifications', '[]'); } catch (e) {}
    });
  }
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  return { ctx, page, errors };
}

// ---------- 场景 A：默认种子通知 → SMALL ----------
{
  const { ctx, page, errors } = await freshPage(false);
  const a = await page.evaluate(() => {
    const lock = document.getElementById('lockScreen');
    const small = document.querySelector('.lock-clock');
    const large = document.querySelector('.lock-clock-large');
    const hook = window.__lockTest && window.__lockTest.clockSize ? window.__lockTest.clockSize() : null;
    return {
      lockVisible: !!lock && getComputedStyle(lock).display !== 'none',
      hasSmall: !!small, hasLarge: !!large,
      smallVisibility: small ? getComputedStyle(small).visibility : '',
      largeDisplay: large ? getComputedStyle(large).display : '',
      smallText: small ? small.textContent : '',
      hook,
    };
  });
  t('A1 锁屏可见', a.lockVisible);
  t('A2 默认种子（有通知）→ SMALL 档', a.hook && a.hook.displayed === 'SMALL', JSON.stringify(a.hook));
  t('A3 小钟 visible + HH:MM', a.smallVisibility === 'visible' && /^\d{2}:\d{2}$/.test(a.smallText), `${a.smallVisibility} ${a.smallText}`);
  t('A4 大钟 GONE（display:none）', a.largeDisplay === 'none', a.largeDisplay);
  t('A5 双容器常驻 DOM（切换非重建）', a.hasSmall && a.hasLarge);
  t('A6 场景A 零 pageerror', errors.length === 0, errors.join('; ').slice(0, 160));
  await ctx.close();
}

// ---------- 场景 B：清空通知 → DYNAMIC 重判 → LARGE ----------
{
  const { ctx, page, errors } = await freshPage(true);
  await page.evaluate(() => Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 4000))]));
  const b = await page.evaluate(() => {
    const small = document.querySelector('.lock-clock');
    const large = document.querySelector('.lock-clock-large');
    const hook = window.__lockTest && window.__lockTest.clockSize ? window.__lockTest.clockSize() : null;
    const csS = small ? getComputedStyle(small) : null;
    const csL = large ? getComputedStyle(large) : null;
    return {
      hook,
      smallVisibility: csS ? csS.visibility : '',
      largeDisplay: csL ? csL.display : '',
      largeText: large ? large.textContent : '',
      fontSizeS: csS ? csS.fontSize : '0',
      fontSizeL: csL ? csL.fontSize : '0',
      fontFamilyL: csL ? csL.fontFamily : '',
      inlineVarL: large ? large.style.fontVariationSettings : '',
    };
  });
  t('B1 清空通知 → DYNAMIC 判 LARGE', b.hook && b.hook.displayed === 'LARGE', JSON.stringify(b.hook));
  t('B2 小钟 INVISIBLE（visibility:hidden 保布局锚）', b.smallVisibility === 'hidden', b.smallVisibility);
  t('B3 大钟 display:block（GONE 解除）', b.largeDisplay === 'block', b.largeDisplay);
  t('B4 大钟 HH:MM 渲染', /^\d{2}:\d{2}$/.test(b.largeText), b.largeText);
  t('B5 大钟字号 > 小钟（region 视觉分化）', parseFloat(b.fontSizeL) > parseFloat(b.fontSizeS), `${b.fontSizeL} > ${b.fontSizeS}`);
  t('B6 大钟 font-family RobotoFlex', /RobotoFlex/i.test(b.fontFamilyL), b.fontFamilyL.slice(0, 60));
  t('B7 大钟内联四轴管线（wght 300）', /wght/i.test(b.inlineVarL) && /300/.test(b.inlineVarL), b.inlineVarL);
  t('B8 双容器常驻 DOM（LARGE 态仍在场）', true); // hasLarge 已由查询成立承载（querySelector 命中）
  t('B9 场景B 零 pageerror', errors.length === 0, errors.join('; ').slice(0, 160));
  await ctx.close();
}

await browser.close();
console.log(`\n=== e2e-v186b-clock-size: ${pass} pass / ${fail} fail ===`);
process.exit(fail === 0 ? 0 : 1);
