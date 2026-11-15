// ==================== e2e-v1137-icon-wave.mjs — #322 图标波浪场设置开关 无头验证 ====================
// DoD 实证：
//   ④⑤ 关闭态：开窗采样相邻图标 inline transform 逐帧恒为初值（零波浪场）——不是只查稳态；
//       开启态：同路径出现非初值帧（波浪场在飞）；
//   ③ 持久化：seed 值经刷新保持（gate 读路径生效）；UI 写路径由 vitest 源码锚（icon-wave-toggle.test.js）覆盖；
//   其余开合动画零变化：两态下 #appWindow.open 均成立 + 全程零 pageerror。
// 运行：node scripts/e2e-v1137-icon-wave.mjs（自起 serve.mjs :8941；外域断网纪律同全库 e2e 惯例）
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8941;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const KEY = 'ios-desktop:icon-wave';

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const EXE_CANDIDATES = [process.env.MD3_CHROME, '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'].filter(Boolean);
const exeExists = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const launchOpts = { headless: true };
for (const c of EXE_CANDIDATES) if (exeExists(c)) { launchOpts.executablePath = c; break; }

const browser = await chromium.launch(launchOpts);
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort()); // 外域断网纪律

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runScenario(value, label) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(([k, v]) => { localStorage.setItem(k, v); }, [KEY, value]);
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(1800); // 桌面 boot 稳定（开窗动画队列清空）
  // 相邻图标对：可见 .app-icon[data-id] 前两个——点击第一个、采样第二个
  const pair = await page.evaluate(() => {
    const icons = [...document.querySelectorAll('.app-icon[data-id]')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    return icons.length >= 2 ? [icons[0].dataset.id, icons[1].dataset.id] : null;
  });
  if (!pair) { A(`${label} 桌面可见图标 ≥2`, false); await page.close(); return null; }
  // 采样器：点击后 rAF 逐帧记录第二图标的 inline transform + 计算态 transform（~900ms 窗口）
  const clickAndSample = () => page.evaluate(([src, dst]) => new Promise((resolve) => {
    const srcEl = document.querySelector(`.app-icon[data-id="${src}"]`);
    const dstEl = document.querySelector(`.app-icon[data-id="${dst}"]`);
    const samples = [];
    srcEl.click();
    const t0 = performance.now();
    const tick = () => {
      samples.push({ inline: dstEl.style.transform || '', computed: getComputedStyle(dstEl).transform });
      if (performance.now() - t0 < 900) requestAnimationFrame(tick); else resolve(samples);
    };
    requestAnimationFrame(tick);
  }), pair);
  const samples = await clickAndSample();
  await sleep(700); // 收尾稳定（窗口全开）
  const winOpen = await page.evaluate(() => document.querySelector('#appWindow')?.classList.contains('open') || false);
  const stored = await page.evaluate((k) => localStorage.getItem(k), KEY);
  const nonEmpty = samples.filter((s) => s.inline !== '').length;
  const computedSet = new Set(samples.map((s) => s.computed));
  await page.close();
  return { winOpen, stored, nonEmpty, total: samples.length, computedSetSize: computedSet.size, errors, label };
}

try {
  console.log(`#322 图标波浪场开关 无头验证（${BASE}）`);
  // ---------- A 关闭态：零波浪场（逐帧恒初值） ----------
  const a = await runScenario('0', '关闭态');
  if (a) {
    A('关闭态 · 持久化键读取生效（seed=0 保持）', a.stored === '0', `stored=${a.stored}`);
    A('关闭态 · 开窗流程零变化（#appWindow.open 成立）', a.winOpen === true);
    A(`关闭态 · 相邻图标 inline transform 逐帧恒初值（${a.total} 帧 0 非空）`, a.nonEmpty === 0 && a.total >= 20, `nonEmpty=${a.nonEmpty}/${a.total}`);
    A('关闭态 · 计算态 transform 单一值（无逐帧位移）', a.computedSetSize === 1, `distinct=${a.computedSetSize}`);
    A('关闭态 · 零 pageerror', a.errors.length === 0, a.errors.slice(0, 2).join(' | '));
  }

  // ---------- B 开启态：波浪场在飞（出现非初值帧） ----------
  const b = await runScenario('1', '开启态');
  if (b) {
    A('开启态 · 持久化键读取生效（seed=1 保持）', b.stored === '1', `stored=${b.stored}`);
    A('开启态 · 开窗流程零变化（#appWindow.open 成立）', b.winOpen === true);
    A(`开启态 · 相邻图标出现波浪场在飞帧（${b.nonEmpty}/${b.total} 帧非初值）`, b.nonEmpty >= 3, `nonEmpty=${b.nonEmpty}`);
    A('开启态 · 计算态 transform 出现逐帧位移（多值）', b.computedSetSize >= 2, `distinct=${b.computedSetSize}`);
    A('开启态 · 零 pageerror', b.errors.length === 0, b.errors.slice(0, 2).join(' | '));
  }
} catch (e) {
  fail++;
  console.log(`  FAIL 脚本异常 — ${String(e).slice(0, 200)}`);
} finally {
  browser.close();
  server.kill();
}

console.log(`\n===== e2e-v1137-icon-wave: ${pass} passed, ${fail} failed =====`);
process.exit(fail > 0 ? 1 : 0);
