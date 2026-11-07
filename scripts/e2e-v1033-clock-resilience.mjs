// ==================== e2e-v1033-clock-resilience.mjs — #226 时钟加载顺序韧性无头回归（R116 窗；v10.35 交付，套件名沿用 v1033 创建号如 e2e-v1032 先例） ====================
//
// DoD（#226 要求①②④⑤；要求③门面由 vitest v1033 T4 静态锚覆盖）：
//   R0  根壳入口正常链路（#139 教训：不只测源码服务独立页）——时钟 iframe 挂载 + __clockCore
//       注入 + 闹钟条目渲染 + 下次响铃显示 + 零 pageerror
//   R1  独立页注入失败实验（真实 Chromium route.abort 模拟 404/SW 错配）——模块图求值期
//       零 pageerror（原 L11 硬读在此场景必抛 TypeError 的直接回归锚）+ 入口遮罩可见 +
//       秒表显示保持初始态（降级不崩，绝不白屏）
//   R2  重试恢复——解除 abort 后点重试钮：遮罩移除 + core 注入 + 秒表开始/停止可用
//   R3  正常链路 console error 为零（过滤离线沙箱外链字体资源噪声）+ 两页全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v1033');
mkdirSync(OUT, { recursive: true });
const PORT = 8094;
const BASE = process.env.E2E_BASE || `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const CLOCK_PAGE = `http://127.0.0.1:${PORT}/ios-desktop/apps/clock-app/index.html`;
const EXE = [process.env.CHROME_EXE, join(process.env.HOME || '', '.cache/ms-playwright/chromium-1200/chrome-linux64/chrome')].find((p) => p && existsSync(p));
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

// ---------- dev 静态服务（serve.mjs 子进程由本脚本管理，finally 收尸） ----------
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);

const browser = await chromium.launch({ headless: true, executablePath: EXE });
try {
  // ---------- R0 根壳入口正常链路（#226 要求⑤） ----------
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const w0 = watchErrors(page);
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  await page.evaluate(() => { const b = document.querySelector('.power-dialog-card button[data-act="once"]'); if (b) b.click(); });
  await sleep(400);
  await page.evaluate(() => window.__shareSheet.openAppById('clock_app'));
  await sleep(1600);
  const frame = page.frames().find((f) => f.url().includes('clock-app'));
  A('R0a 时钟 iframe 挂载 + __clockCore 注入（根壳入口）', !!frame && await frame.evaluate(() => !!window.__clockCore && !!window.__clockCore.Stopwatch));
  const shellState = await frame.evaluate(() => ({
    next: document.getElementById('nextAlarmDisplay')?.innerText || '',
    alarmText: document.getElementById('alarmList')?.textContent || '',
    sw: document.getElementById('swDisplay')?.innerText || ''
  }));
  A('R0b 闹钟条目渲染（默认「早起闹钟」）+ 下次响铃 09:00', shellState.alarmText.includes('早起闹钟') && shellState.next.includes('09:00'), JSON.stringify(shellState.next));
  A('R0c 根壳链路零 pageerror', w0.errors.length === 0, w0.errors.slice(0, 2).join(' | '));
  await page.screenshot({ path: join(OUT, 'r116-shell-clock.png') });

  // ---------- R1 独立页注入失败实验（route.abort 模拟 404/SW 错配；#226 要求①②④） ----------
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page2 = await ctx2.newPage();
  const w1 = watchErrors(page2);
  await ctx2.route('**/clock-core.js', (r) => r.abort());
  await page2.goto(CLOCK_PAGE, { waitUntil: 'load', timeout: 30000 });
  await sleep(1200);
  const missing = await page2.evaluate(() => ({
    coreAbsent: !window.__clockCore,
    maskVisible: !!document.getElementById('clockCoreErrorMask'),
    btnThere: !!document.getElementById('clockCoreRetryBtn'),
    sw: document.getElementById('swDisplay')?.innerText || '',
    bodyText: (document.body.textContent || '').includes('时钟核心未就绪')
  }));
  A('R1a 注入失败下模块图求值零 pageerror（原 L11 硬读回归锚——修复前此处必抛 TypeError）', w1.errors.length === 0, w1.errors.slice(0, 2).join(' | '));
  A('R1b core 缺失确认 + 可见错误遮罩（非白屏）+ 重试钮在位', missing.coreAbsent && missing.maskVisible && missing.btnThere && missing.bodyText, JSON.stringify(missing));
  A('R1c 秒表显示保持初始 00:00.00（降级不崩）', missing.sw === '00:00.00', JSON.stringify(missing.sw));
  await page2.screenshot({ path: join(OUT, 'r116-core-missing-overlay.png') });

  // ---------- R2 重试恢复（解除 abort → 点重试 → 遮罩移除 + 秒表可用） ----------
  await ctx2.unroute('**/clock-core.js');
  await page2.evaluate(() => document.getElementById('clockCoreRetryBtn').click());
  await sleep(900);
  const recovered = await page2.evaluate(() => ({
    core: !!window.__clockCore && !!window.__clockCore.Stopwatch,
    maskGone: !document.getElementById('clockCoreErrorMask')
  }));
  A('R2a 重试后 core 注入 + 遮罩移除（无需重载页面）', recovered.core && recovered.maskGone, JSON.stringify(recovered));
  await page2.evaluate(() => document.getElementById('swMainBtn').click());
  await sleep(400);
  const swRun = await page2.evaluate(() => document.getElementById('swMainBtn').innerText);
  A('R2b 恢复后秒表开始可用（按钮转「停止」）', swRun === '停止', JSON.stringify(swRun));
  await page2.screenshot({ path: join(OUT, 'r116-retry-recovered.png') });

  // ---------- R3 console error / pageerror 总账 ----------
  A('R3a 正常链路 console error 为零（过滤外链资源噪声）', w0.consoleErrors.length === 0, w0.consoleErrors.slice(0, 2).join(' | '));
  A('R3b 两页全程零 pageerror', w0.errors.length === 0 && w1.errors.length === 0, (w0.errors.concat(w1.errors)).slice(0, 3).join(' | '));

  await ctx2.close();
  await page.close();
} catch (e) {
  fail++;
  console.log('  FATAL', String(e));
} finally {
  await browser.close();
  server.kill();
}

console.log(`\n==== e2e-v1033: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
