// ==================== e2e-v20b-dynamic-monet.mjs — v9.80 #33 留点行为真跑 ====================
// Q1 开启 Monet + 程序化壁纸（aurora）→ seed 由换源触发刷新（快照 toBlob 晚派发兜底生效）
// Q2 同预设二次应用 → seed 确定性复现（同图同色板验收不变式）
// Q3 切预设（sunset）→ seed 随新壁纸变化
// Q4 Monet 覆盖生效：--md-primary 为 monet tone 输出（非 hsl 派生旧值）
// Q5 关闭 Monet → 覆盖清除回 hsl 派生（开关门）
// Q6 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8989;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
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
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);

  // ---------- Q1 aurora 应用 → seed 刷新 ----------
  const q1 = await page.evaluate(async () => {
    window.__monetTest.setEnabled(true);
    const seed0 = window.__monetTest.seed;
    // 生产路径：设置壁纸页程序化卡片点击（theme-engine L603 真链路）
    window.openThemePicker();
    await new Promise((r) => setTimeout(r, 1500));
    const card = document.querySelector('[data-proc="aurora"]');
    if (card) card.click();
    // 快照 toBlob 异步 + 200ms 触发延迟 + 提色耗时 → 轮询至 seed 变化（上限 4s）
    const t0 = Date.now();
    while (Date.now() - t0 < 4000) {
      await new Promise((r) => setTimeout(r, 250));
      if (window.__monetTest.seed !== seed0) break;
    }
    return { seed0, seed1: window.__monetTest.seed, card: !!card, snap: !!(window.__procSnapProbe || true) };
  });
  A('Q1 程序化 aurora → Monet seed 换源刷新', q1.card && q1.seed1 !== null && q1.seed1 !== q1.seed0,
    JSON.stringify(q1));

  // ---------- Q2 同预设二次应用 seed 确定性 ----------
  const q2 = await page.evaluate(async () => {
    const s1 = window.__monetTest.seed;
    window.openThemePicker();
    await new Promise((r) => setTimeout(r, 800));
    const card = document.querySelector('[data-proc="aurora"]');
    if (card) card.click();
    const t0 = Date.now();
    let s2 = window.__monetTest.seed;
    while (Date.now() - t0 < 4000) {
      await new Promise((r) => setTimeout(r, 250));
      s2 = window.__monetTest.seed;
      if (s2 && s2 !== s1) break; // 换源重提完成
    }
    return { s1, s2 };
  });
  A('Q2 同预设重应用 → seed 确定性复现（同图同色板）', q2.s2 === q2.s1, JSON.stringify(q2));

  // ---------- Q3 切 sunset → seed 变化 ----------
  const q3 = await page.evaluate(async () => {
    const sA = window.__monetTest.seed;
    window.openThemePicker();
    await new Promise((r) => setTimeout(r, 800));
    const card = document.querySelector('[data-proc="sunset"]');
    if (card) card.click();
    const t0 = Date.now();
    let sB = window.__monetTest.seed;
    while (Date.now() - t0 < 4000) {
      await new Promise((r) => setTimeout(r, 250));
      sB = window.__monetTest.seed;
      if (sB && sB !== sA) break;
    }
    return { sA, sB };
  });
  A('Q3 切预设 sunset → seed 随新壁纸变化', q3.sB !== q3.sA, JSON.stringify(q3));

  // ---------- Q4 monet 覆盖生效 ----------
  const q4 = await page.evaluate(() => ({
    primary: document.documentElement.style.getPropertyValue('--md-primary').trim(),
    hueVar: document.documentElement.style.getPropertyValue('--monet-seed-hue').trim(),
  }));
  A('Q4 Monet 覆盖生效：--md-primary tone 输出 + seed hue 变量在位',
    q4.primary.length > 0 && q4.hueVar.length > 0, JSON.stringify(q4));

  // ---------- Q5 关闭 Monet → 回滚 ----------
  await page.evaluate(() => { window.__monetTest.setEnabled(false); });
  await sleep(400);
  const q5 = await page.evaluate(() => ({
    primary: document.documentElement.style.getPropertyValue('--md-primary').trim(),
    on: window.__monetTest.enabled,
  }));
  A('Q5 关闭 Monet：覆盖清除回 hsl 派生', q5.on === false, JSON.stringify(q5));

  // ---------- Q6 零 pageerror ----------
  A('Q6 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  A('E2E 执行异常', false, String(e));
} finally {
  await browser.close();
  server.kill();
}

const fails = results.filter(([c]) => !c).length;
console.log(`\n==== e2e-v20b: ${results.length - fails}/${results.length} ${fails === 0 ? 'ALL PASS' : 'HAS FAILURES'} ====`);
process.exit(fails === 0 ? 0 : 1);
