// ==================== e2e-v812-settings-search.mjs — #71 无头回归 ====================
//
// DoD：输入「电池」→ 仅剩电池行；清空 → 全恢复；无匹配 → 空态提示；命中行可点击进子页；
//      宽屏（双栏 1280）与窄屏（手机 420）过滤行为一致。零 pageerror + 截图。

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = '/home/z/my-project/md3-repo/docs/v812';
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

async function runSearchSuite(width, height, tag) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  let pageErrors = 0;
  page.on('pageerror', (e) => { pageErrors++; log('[pageerror]', e.message.slice(0, 160)); });
  await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(2500);
  await page.evaluate(() => document.querySelector('.power-dialog-card button[data-act="once"]')?.click());
  await sleep(1200);
  await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
  await sleep(2000);

  const type = (kw) => page.evaluate((k) => {
    const input = document.querySelector('.tp-search input');
    input.value = k;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, kw);
  const alive = () => page.evaluate(() =>
    [...document.querySelectorAll('.tp-row:not(.tp-hit-none)')]
      .map((r) => r.dataset.label).filter((_, i, a) => a.indexOf(_) === i));

  const total = (await alive()).length;
  check(`[${tag}] 基线行数 ≥19（${total}）`, total >= 19, `total=${total}`);

  await type('电池');
  await sleep(250);
  let a = await alive();
  check(`[${tag}] 「电池」→ 仅电池行`, a.length === 1 && a[0] === '电池', JSON.stringify(a));
  await page.screenshot({ path: `${OUT}/v812-search-${tag}.png` }).catch(() => {});

  await type('深色');
  await sleep(250);
  a = await alive();
  check(`[${tag}] 二级别名「深色」→ 显示行命中（增强）`, a.includes('显示'), JSON.stringify(a));

  await type('zzz');
  await sleep(250);
  const emptyVisible = await page.evaluate(() => {
    const e = document.querySelector('.tp-search-empty');
    return !!e && e.style.display === 'block' && e.textContent.includes('没有匹配');
  });
  check(`[${tag}] 无匹配 → 空态提示可见`, emptyVisible);

  await type('');
  await sleep(250);
  a = await alive();
  check(`[${tag}] 清空 → 全恢复 ${a.length}`, a.length === total);

  // 命中行点击进子页（DoD：过滤状态点击仍可导航）
  await type('电池');
  await sleep(250);
  await page.evaluate(() => document.querySelector('.tp-row:not(.tp-hit-none)').click());
  await sleep(1500);
  // 判定：电池子页标志性元素可见（v806 锚点 settingsBatterySaverSwitch）
  const entered = await page.evaluate(() => {
    const el = document.getElementById('settingsBatterySaverSwitch');
    return !!el && !!el.offsetParent;
  });
  check(`[${tag}] 点击电池行进子页`, entered);

  check(`[${tag}] 零 pageerror`, pageErrors === 0, `errors=${pageErrors}`);
  await ctx.close();
  return pageErrors;
}

await runSearchSuite(420, 900, 'narrow');
await runSearchSuite(1280, 800, 'wide');

await browser.close();
log(failures === 0 ? '\n=== E2E PASS — #71 搜索过滤全链（宽窄一致）===' : `\n=== E2E FAIL ×${failures} ===`);
process.exit(failures === 0 ? 0 : 1);
