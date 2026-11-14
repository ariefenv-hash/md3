// ==================== e2e-v1037-slider-unify.mjs — #227 滑块单源化无头回归 ====================
// 真浏览器（源码服务）验证三件事：
//   S1 radio：.rd-vol.mdslider 接入组件 —— idle-slider.js 载入即同步 --p（初值 90 → 90%），
//      input 事件委托改值 --p 跟随；thumb 视觉由组件提供（本地伪元素为零由 vitest 静态锚背书）。
//   S2 calculator：原 .md-slider 玻璃盒第二套 → 组件接入后 blur-slider 经 JS 改值走 --p 契约。
//   S3 dice：金色主题经组件令牌映射保留（--md-primary: var(--gold) 落在滑条作用域），
//      input 后 --p 同步；全程零 pageerror。
// 用法：node scripts/e2e-v1037-slider-unify.mjs   （自管 serve.mjs 子进程，finally 收尸）
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8937;
const APP = (id) => `http://127.0.0.1:${PORT}/ios-desktop/apps/${id}/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const watchErrors = (page) => {
  const errors = [], consoleErrors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/i.test(m.text())) consoleErrors.push(m.text()); });
  return { errors, consoleErrors };
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const EXE = [process.env.CHROME_EXE, join(process.env.HOME || '', '.cache/ms-playwright/chromium-1200/chrome-linux64/chrome')].find((p) => p && existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath: EXE });
try {
  // ---------- S1 radio ----------
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
    const w = watchErrors(page);
    await page.goto(APP('radio'), { waitUntil: 'load', timeout: 30000 });
    await sleep(1200);
    const s1 = await page.evaluate(() => {
      const el = document.getElementById('rdVol');
      // Chromium 对 range thumb 的 getComputedStyle 伪元素取值不可靠（返回宿主元素值，v10.38 在录），
      // 改从同源样式表规则集直探组件几何
      let comp = '';
      for (const sheet of document.styleSheets) {
        try { for (const r of sheet.cssRules) if (r.cssText && r.cssText.includes('-webkit-slider-thumb')) comp += r.cssText + '\n'; } catch (e) {}
      }
      return {
        cls: el.className, p: el.style.getPropertyValue('--p'),
        helper: !!(window.__idleSlider && window.__idleSlider.sync),
        thumbRule: /width:\s*4px/.test(comp) && /height:\s*44px/.test(comp) && /border-radius:\s*2px/.test(comp) && /margin-top:\s*-14px/.test(comp),
        activeRule: /width:\s*2px/.test(comp) && /border-radius:\s*1px/.test(comp),
        linkOk: !!document.querySelector('link[href*="idle-slider.css"]'),
      };
    });
    A('S1a radio 组件接入（class 含 mdslider + link + helper）', s1.cls.includes('mdslider') && s1.linkOk && s1.helper, JSON.stringify(s1.cls));
    A('S1b 初值 --p 同步（90/100 → 90%）', s1.p === '90.00%', s1.p);
    await page.evaluate(() => { const el = document.getElementById('rdVol'); el.value = 40; el.dispatchEvent(new Event('input', { bubbles: true })); });
    const p40 = await page.evaluate(() => document.getElementById('rdVol').style.getPropertyValue('--p'));
    A('S1c input 委托同步（40/100 → 40%）', p40 === '40.00%', p40);
    A('S1d 带手柄组件规则生效（样式表直探：常态 4×44/2px + 交互 2/1px 减细）', s1.thumbRule && s1.activeRule, `thumbRule=${s1.thumbRule} activeRule=${s1.activeRule}`);
    A('S1e radio 零 pageerror', w.errors.length === 0, w.errors.join('|').slice(0, 120));
    await page.close();
  }
  // ---------- S2 calculator ----------
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
    const w = watchErrors(page);
    await page.goto(APP('calculator'), { waitUntil: 'load', timeout: 30000 });
    await sleep(1500);
    const s2 = await page.evaluate(() => {
      const el = document.getElementById('blur-slider');
      return { has: !!el, cls: el ? el.className : '', p: el ? el.style.getPropertyValue('--p') : '' };
    });
    A('S2a calculator blur-slider 组件类（原 md-slider 第二套已并入）', s2.has && s2.cls.includes('mdslider') && !s2.cls.includes('md-slider '), `cls=${s2.cls}`);
    await page.evaluate(() => { const el = document.getElementById('blur-slider'); el.value = 20; el.dispatchEvent(new Event('input', { bubbles: true })); });
    const p2 = await page.evaluate(() => document.getElementById('blur-slider').style.getPropertyValue('--p'));
    A('S2b --p 契约同步（20/30 ≈ 66.67%）', p2 === '66.67%', p2);
    A('S2c calculator 零 pageerror', w.errors.length === 0, w.errors.join('|').slice(0, 120));
    await page.close();
  }
  // ---------- S3 dice ----------
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
    const w = watchErrors(page);
    await page.goto(APP('dice'), { waitUntil: 'load', timeout: 30000 });
    await sleep(1500);
    const s3 = await page.evaluate(() => {
      const el = document.getElementById('param-gravity');
      // 同 S1：伪元素取值不可靠，样式表规则集直探金色令牌映射（scoped --md-primary: var(--gold)）
      let appCss = '';
      for (const sheet of document.styleSheets) {
        try { for (const r of sheet.cssRules) if (r.cssText && r.cssText.includes('mdslider')) appCss += r.cssText + '\n'; } catch (e) {}
      }
      return {
        cls: el.className, p: el.style.getPropertyValue('--p'),
        goldMap: /--md-primary:\s*var\(--gold\)/.test(appCss),
      };
    });
    A('S3a dice 组件类（custom-slider 死类清除）', s3.cls === 'mdslider', s3.cls);
    A('S3b 金色主题经组件令牌映射保留（滑条作用域 --md-primary: var(--gold)）', s3.goldMap, `goldMap=${s3.goldMap}`);
    await page.evaluate(() => { const el = document.getElementById('param-gravity'); el.value = 100; el.dispatchEvent(new Event('input', { bubbles: true })); });
    const p3 = await page.evaluate(() => document.getElementById('param-gravity').style.getPropertyValue('--p'));
    A('S3c --p 同步（100/100 → 100%）', p3 === '100.00%', p3);
    A('S3d dice 零 pageerror', w.errors.length === 0, w.errors.join('|').slice(0, 120));
    await page.close();
  }
} finally {
  await browser.close().catch(() => {});
  server.kill('SIGKILL');
}
console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'}: ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
