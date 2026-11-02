// ==================== e2e-v159-nav-symbols.mjs — #159 导航字形化行为真跑（v9.43 · R60 窗） ====================
// Q1 5 字形 span 在位 + textContent = 权威字形名 + fontFamily 为 Material Symbols Outlined
// Q2 字体真加载：document.fonts.check + 连字收敛宽度校验（若连字未收敛，'alarm' 按 fallback
//    文字渲染约 40px+；收敛为单字形 ≈22px —— offsetWidth<=26 即证明字形化渲染而非 tofu/文本）
// Q3 点击 World → animate-click 类 + computedStyle.animationName === 'globeSpin'
// Q4 点击 Bedtime → animationName === 'wavePulse'
// Q5 五 tab 轮切：active 面板正确 + 零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8937;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/apps/clock-app/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
try {
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2000);

  // Q1 字形 span 在位
  const q1 = await page.evaluate(() => {
    const tabs = ['Alarm', 'World', 'Timer', 'Stopwatch', 'Bedtime'];
    const glyphs = ['alarm', 'public', 'timer', 'av_timer', 'bedtime'];
    return tabs.map((t, i) => {
      const el = document.querySelector(`.nav-item[data-tab="${t}"] .nav-msr-icon`);
      if (!el) return { t, ok: false };
      const ff = getComputedStyle(el).fontFamily;
      return { t, text: el.textContent.trim(), ff, ok: el.textContent.trim() === glyphs[i] && /Material Symbols Outlined/.test(ff) };
    });
  });
  A('Q1 五字形 span 在位 + 字形名/fontFamily 正确', q1.every((x) => x.ok), JSON.stringify(q1));

  // Q2 字体真加载 + 连字收敛宽度（字形而非 fallback 文本）
  await page.evaluate(() => document.fonts.ready);
  const q2 = await page.evaluate(() => {
    const checked = document.fonts.check("22px 'Material Symbols Outlined'");
    return {
      checked,
      widths: ['alarm', 'public', 'timer', 'av_timer', 'bedtime'].map((g) => {
        const el = document.querySelector(`.nav-msr-icon`);
        return null;
      }),
      per: Array.from(document.querySelectorAll('.nav-msr-icon')).map((el) => ({ g: el.textContent.trim(), w: el.offsetWidth, h: el.offsetHeight })),
    };
  });
  A('Q2 fonts.check 真 true', q2.checked === true, String(q2.checked));
  A('Q2 连字收敛为单字形宽度（≤26px 非 fallback 文本）', q2.per.every((x) => x.w > 10 && x.w <= 26 && x.h >= 10), JSON.stringify(q2.per));

  // Q3 点击 World → globeSpin
  await page.click('.nav-item[data-tab="World"]');
  const q3 = await page.evaluate(() => {
    const el = document.querySelector('.nav-item[data-tab="World"] .nav-msr-icon');
    return { cls: el.closest('.nav-item').className.includes('animate-click'), anim: getComputedStyle(el).animationName };
  });
  A('Q3 World 点击 → animate-click + animationName globeSpin', q3.cls && q3.anim === 'globeSpin', JSON.stringify(q3));

  // Q4 点击 Bedtime → wavePulse
  await page.click('.nav-item[data-tab="Bedtime"]');
  const q4 = await page.evaluate(() => {
    const el = document.querySelector('.nav-item[data-tab="Bedtime"] .nav-msr-icon');
    return { anim: getComputedStyle(el).animationName };
  });
  A('Q4 Bedtime 点击 → animationName wavePulse', q4.anim === 'wavePulse', JSON.stringify(q4));

  // Q5 五 tab 轮切 active 面板正确
  const q5 = await page.evaluate(() => {
    const seq = ['Alarm', 'World', 'Timer', 'Stopwatch', 'Bedtime', 'Alarm'];
    const out = [];
    for (const t of seq) {
      document.querySelector(`.nav-item[data-tab="${t}"]`).click();
      const panel = document.getElementById('tab' + t);
      out.push([t, panel && panel.classList.contains('active')]);
    }
    return out;
  });
  A('Q5 五 tab 轮切 active 面板全部正确', q5.every(([, ok]) => ok), JSON.stringify(q5));

  await sleep(600);
  A('Q6 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));
} finally {
  await browser.close();
  server.kill();
}
const fails = results.filter(([c]) => !c);
console.log(`\n=== e2e-v159: ${results.length - fails.length}/${results.length} passed ===`);
process.exit(fails.length ? 1 : 0);
