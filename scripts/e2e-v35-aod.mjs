// ==================== e2e-v35-aod.mjs — #35 AOD 息屏常显行为真跑（v9.76） ====================
// 坑在录：无头 rAF/定时器节流——断言全走「同步探针 + 显式等待」；闲置路径用真实 15s 档（timeout
// 单源 settings:display-v1，AOSP def_screen_off_timeout 同族）。电源对话内「熄屏」按钮点击链
// 由 vitest C3 接线锚 + dist-smoke 兜底，e2e 走 __aodTest.enter()（core→lockNow→overlay 全真链）。
// Q1 默认关（覆盖层不存在 + state active）
// Q2 熄屏进入：覆盖层显 + 锁屏兜底（未锁→lockNow）
// Q3 AOD 内容：时钟 HH:MM + 日期 + 通知图标容器 + 呼吸 class
// Q4 唤醒回锁屏：覆盖层撤 + is-locked 保持（AOSP doze→keyguard）
// Q5 解锁回桌面：instantUnlock 后 overlay 保持隐藏
// Q6 快速反复熄/亮 ×3（验收①状态机干净）
// Q7 闲置自动进入（15s 真档）：未锁→锁+AOD
// Q8 活动重排：交互中 17s 不熄屏
// Q9 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8981;
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
  // ---------- 页 1：默认关 ----------
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort()); // 外域断网（e2e 惯例：防字体挂起 load）
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  const q1 = await page.evaluate(() => ({
    t: window.__aodTest ? window.__aodTest.state() : 'no-hook',
    on: window.__aodTest ? window.__aodTest.overlayOn() : null,
    overlayEl: !!document.getElementById('aodOverlay'),
    aodBtn: !!document.getElementById('powerAodBtn'),
  }));
  A('Q1 默认关：state=active + 覆盖层未显 + 熄屏钮在库（覆盖层懒建——首次进入才 ensureDOM）',
    q1.t === 'active' && q1.on === false && q1.overlayEl === false && q1.aodBtn === true, JSON.stringify(q1));

  // 置单源（aod 开 + 15s 档）→ reload 生效
  await page.evaluate(() => localStorage.setItem('settings:display-v1', JSON.stringify({ timeout: 15000, aod: true })));
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => window.__lockTest.instantUnlock());

  // Q2 熄屏进入（未锁 → 锁屏兜底）
  const q2 = await page.evaluate(() => { window.__aodTest.enter(); return { t: window.__aodTest.state(), on: window.__aodTest.overlayOn(), locked: window.__lockTest.isLocked() }; });
  A('Q2 熄屏进入：覆盖层显 + 未锁先锁（AOSP doze 恒在 keyguard 语义）',
    q2.t === 'aod' && q2.on === true && q2.locked === true, JSON.stringify(q2));

  // Q3 AOD 内容
  const q3 = await page.evaluate(() => ({
    clock: window.__aodTest.clockText(),
    date: window.__aodTest.dateText(),
    notifs: window.__aodTest.notifCount(),
    cls: document.getElementById('aodOverlay').className,
  }));
  A('Q3 内容：时钟 HH:MM + 日期非空 + 呼吸 class（aod-on）',
    /^\d{1,2}:\d{2}$/.test(q3.clock) && q3.date.length > 3 && q3.cls.includes('aod-on'), JSON.stringify(q3));

  // Q4 唤醒回锁屏
  await page.click('#aodOverlay');
  await sleep(200);
  const q4 = await page.evaluate(() => ({ on: window.__aodTest.overlayOn(), t: window.__aodTest.state(), locked: window.__lockTest.isLocked() }));
  A('Q4 唤醒回锁屏：覆盖层撤 + 保持锁定（doze→keyguard）', q4.on === false && q4.t === 'active' && q4.locked === true, JSON.stringify(q4));

  // Q5 解锁回桌面
  await page.evaluate(() => window.__lockTest.instantUnlock());
  await sleep(200);
  const q5 = await page.evaluate(() => ({ on: window.__aodTest.overlayOn(), locked: window.__lockTest.isLocked() }));
  A('Q5 解锁回桌面：覆盖层保持隐藏 + 未锁', q5.on === false && q5.locked === false, JSON.stringify(q5));

  // Q6 快速反复熄/亮 ×3（验收①）
  const q6 = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      window.__aodTest.enter();
      out.push([window.__aodTest.state(), window.__aodTest.overlayOn()]);
      window.__aodTest.wake();
      out.push([window.__aodTest.state(), window.__aodTest.overlayOn()]);
    }
    return out;
  });
  const q6ok = q6.every((p, i) => (i % 2 === 0 ? p[0] === 'aod' && p[1] === true : p[0] === 'active' && p[1] === false));
  A('Q6 快速反复熄/亮 ×3 每轮干净复位（无死锁）', q6ok, JSON.stringify(q6));

  // Q7 闲置自动进入（15s 真档；Q6 尾 wake 后 idle 计时已武装）
  await page.waitForFunction(() => window.__aodTest.overlayOn() === true && window.__lockTest.isLocked() === true, null, { timeout: 20000 }).catch(() => {});
  const q7 = await page.evaluate(() => ({ on: window.__aodTest.overlayOn(), t: window.__aodTest.state(), locked: window.__lockTest.isLocked(), idle: window.__aodTest.debug().idleMs }));
  A('Q7 闲置 15s 自动进入：未锁→锁屏兜底+AOD（screen_off_timeout 单源复用）',
    q7.on === true && q7.t === 'aod' && q7.locked === true && q7.idle === 15000, JSON.stringify(q7));

  // Q8 活动重排：唤醒后持续交互 ~17s 不熄屏（逐轮采样定位）
  await page.click('#aodOverlay');
  await page.evaluate(() => { window.__pdCount = 0; document.addEventListener('pointerdown', () => { window.__pdCount++; }, true); });
  const samples = [];
  for (let i = 0; i < 6; i++) {
    // 合成 PointerEvent 驱动真实 document 捕获链（v34 先例：headless mouse 与锁屏 pointer capture
    // 交互下 Playwright 合成鼠标不产生 pointerdown——真机触摸无此坑；断言对象=activity 重排逻辑）
    await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await sleep(2800);
    samples.push(await page.evaluate(() => ({ s: window.__aodTest.state(), pd: window.__pdCount, dbg: window.__aodTest.debug() })));
  }
  const q8 = await page.evaluate(() => ({ on: window.__aodTest.overlayOn(), t: window.__aodTest.state() }));
  A('Q8 活动重排：持续交互 ~17s 不进入 AOD', q8.on === false && q8.t === 'active', JSON.stringify({ q8, samples }));

  // Q9 零 pageerror
  A('Q9 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 400));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
const pass = results.filter((r) => r[0]).length;
console.log(`\n=== e2e-v35-aod: ${pass}/${results.length} ===`);
process.exit(pass === results.length ? 0 : 1);
