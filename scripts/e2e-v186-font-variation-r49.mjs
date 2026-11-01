// v9.26 = #186 一期 + #190 Roboto Flex vendor 落位 无头回归（R49 窗）：
// ①锁屏可见 + .lock-clock HH:MM 渲染（无 ?nolock——nolock 跳过锁屏挂载）
// ②computed font-family 含 RobotoFlex（字体栈生效）
// ③computed font-variation-settings 含 wght 300 / wdth 100 / opsz 96（四轴管线消费）
// ④roboto-flex.css 运行时注入 link 在册（head 内）
// ⑤document.fonts.check RobotoFlex true（woff2 真实加载解码成功）
// ⑥woff2 网络响应 200（vendor 文件被 dev 服务器真实命中）
// ⑦零 pageerror 收敛
// 范式同 e2e-v193：dev 服务器（E2E_BASE 可覆写，默认 8080；本测试必须不带 nolock）。
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
const errors = [];
const fontResponses = [];

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('response', (r) => { if (r.url().includes('roboto-flex')) fontResponses.push({ url: r.url(), status: r.status() }); });

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await sleep(1200);
// 字体链路等待：fonts.ready + 兜底窗
await page.evaluate(() => Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 4000))]));
await sleep(400);

const state = await page.evaluate(() => {
  const lock = document.getElementById('lockScreen');
  const clock = document.querySelector('.lock-clock');
  const cs = clock ? getComputedStyle(clock) : null;
  const link = document.head.querySelector('link[href*="roboto-flex"]');
  return {
    lockVisible: !!lock && getComputedStyle(lock).display !== 'none',
    clockText: clock ? clock.textContent : '',
    fontFamily: cs ? cs.fontFamily : '',
    variation: cs ? cs.fontVariationSettings : '',
    inlineVariation: clock ? clock.style.fontVariationSettings : '',
    linkInjected: !!link,
    linkHref: link ? link.getAttribute('href') : '',
    fontCheck: document.fonts ? document.fonts.check('300 88px RobotoFlex') : false,
    fontsCount: document.fonts ? document.fonts.size : -1,
  };
});

t('S1 锁屏可见', state.lockVisible);
t('S2 .lock-clock HH:MM 渲染', /^\d{2}:\d{2}$/.test(state.clockText), state.clockText);
t('S3 computed font-family 含 RobotoFlex', /RobotoFlex/i.test(state.fontFamily), state.fontFamily.slice(0, 60));
t('S4 内联 font-variation-settings 管线注入（#186 applyClockVariation）', /wght/i.test(state.inlineVariation) && /300/.test(state.inlineVariation), state.inlineVariation);
t('S5 computed font-variation-settings 三轴', /wght/i.test(state.variation) && /300/.test(state.variation) && /100/.test(state.variation) && /96/.test(state.variation), state.variation);
t('S6 roboto-flex.css 注入 link 在册', state.linkInjected, state.linkHref);
t('S7 document.fonts.check RobotoFlex true（woff2 解码成功）', state.fontCheck === true);
t('S8 woff2 网络响应 200', fontResponses.some((r) => r.status === 200), JSON.stringify(fontResponses));
t('S9 零 pageerror', errors.length === 0, errors.join('; ').slice(0, 200));

console.log(`\n=== e2e-v186-font-variation: ${pass} pass / ${fail} fail ===`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
