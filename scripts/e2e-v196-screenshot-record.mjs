// ==================== e2e-v196-screenshot-record.mjs — #196 截屏/录屏双域 e2e ====================
//
// Q1 截屏真链路：recents → 截屏按钮 → 白闪 + 角标入场（顶部卡图标占位 + 应用名）+ shown
// Q2 触摸重置（SCREENSHOT_REENTERED）：触摸角标 → 计时重排（5s 触摸 → 再 2s 仍在场）
// Q3 6s 超时自动退场（SCREENSHOT_INTERACTION_TIMEOUT）→ idle + DOM 摘除
// Q4 删除手势退场：删除按钮 → toast「已删除截屏」+ 角标退场
// Q5 录屏倒计时：start → counting（3s 内可取消，cancelled=true 无片段）；再 start → recording
// Q6 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8985;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await sleep(400);

  // Q1 截屏真链路：开 recents（无后台任务时 deck 为空，角标占位回落系统 settings 图标）
  await page.evaluate(() => { window.__openRecentApps(); });
  await sleep(600);
  await page.evaluate(() => {
    const b = document.getElementById('recentScreenshotBtn');
    if (b) b.click();
  });
  await sleep(500);
  const q1 = await page.evaluate(() => {
    const shelf = document.getElementById('screenshotShelf');
    const flash = document.getElementById('screenshotFlash');
    return {
      shelfOn: !!shelf,
      state: window.__screenshot.shelfState(),
      label: shelf ? (shelf.querySelector('.ss-app') || {}).textContent : '',
      flashSeen: !!flash,
      timeout: window.__screenshot.shelfRemainingMs() > 5000,
    };
  });
  A('Q1 截屏真链路：白闪 + 角标入场（shown + 占位标注 + 6s 驻留计时）',
    q1.shelfOn && q1.state === 'shown' && q1.flashSeen && q1.timeout, JSON.stringify(q1));

  // Q2 触摸重置（SCREENSHOT_REENTERED）：驻留 4s → 触摸 → 再 2.5s 仍在场（未触摸本应 6s 退场边缘内，
  // 用「触摸后剩余时间回到接近 6s」判定重置生效）。v10.05 注记：光栅源接入（#94 二期）后
  // shelf 入场延后 ~0.1-0.3s（DOM→SVG→Canvas 装载），before 门由 <1600 放宽到 <2200——
  // 语义不变（剩余接近耗尽 → 触摸 → 回弹至接近 6s），after 门 >5500 未动。
  await sleep(4000); // 累计 4.5s 驻留
  const q2a = await page.evaluate(() => window.__screenshot.shelfRemainingMs());
  await page.evaluate(() => {
    const shelf = document.getElementById('screenshotShelf');
    if (shelf) shelf.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  });
  await sleep(200);
  const q2b = await page.evaluate(() => window.__screenshot.shelfRemainingMs());
  A('Q2 触摸重置（SCREENSHOT_REENTERED）：剩余接近耗尽 → 触摸 → 剩余回弹至 >5.5s',
    q2a < 2200 && q2b > 5500, JSON.stringify({ before: Math.round(q2a), after: Math.round(q2b) }));

  // Q3 6s 超时自动退场：等剩余时间耗尽 → tick 走 INTERACTION_TIMEOUT → idle + DOM 摘除
  const rem = await page.evaluate(() => window.__screenshot.shelfRemainingMs());
  await sleep(rem + 700);
  const q3 = await page.evaluate(() => ({
    state: window.__screenshot.shelfState(),
    domGone: !document.getElementById('screenshotShelf'),
  }));
  A('Q3 6s 超时自动退场（SCREENSHOT_INTERACTION_TIMEOUT）：idle + 角标 DOM 摘除',
    q3.state === 'idle' && q3.domGone, JSON.stringify(q3));

  // Q4 删除手势退场：再截一屏 → 删除按钮 → toast + 退场
  await page.evaluate(() => { window.__screenshot.capture(); });
  await sleep(400);
  await page.evaluate(() => {
    const b = document.querySelector('#screenshotShelf [data-act="delete"]');
    if (b) b.click();
  });
  await sleep(400);
  const q4 = await page.evaluate(() => {
    const toast = document.getElementById('systemGlobalToast');
    return {
      state: window.__screenshot.shelfState(),
      domGone: !document.getElementById('screenshotShelf'),
      toastShown: !!toast && (toast.textContent || '').includes('已删除截屏'),
    };
  });
  A('Q4 删除手势退场：swipe(delete) → toast「已删除截屏」+ 角标退场',
    q4.state === 'idle' && q4.domGone && q4.toastShown, JSON.stringify(q4));

  // Q5 录屏倒计时：start → counting → 中途取消（cancelled=true，无片段）；再 start → recording
  const q5a = await page.evaluate(() => {
    const ok = window.__screenRecord.start({ audioSource: 'MIC', mode: 'SINGLE_APP' });
    const st = window.__screenRecord.state();
    const sess = window.__screenRecord.session();
    const cancelledMid = window.__screenRecord.cancel();
    return { ok, st, sess, cancelledMid, cancelledFlag: window.__screenRecord.cancelled(), stateAfter: window.__screenRecord.state() };
  });
  A('Q5a 录屏准出：start（MIC/单应用）→ counting → 中途取消 → cancelled=true（无片段）',
    q5a.ok && q5a.st === 'counting' && q5a.sess.audioSource === 'MIC' && q5a.cancelledMid && q5a.cancelledFlag && q5a.stateAfter === 'idle',
    JSON.stringify(q5a));
  const q5b = await page.evaluate(async () => {
    const W = window.__screenRecord;
    W.start({ audioSource: 'INTERNAL', mode: 'ENTIRE_SCREEN', showTaps: true });
    await new Promise((r) => setTimeout(r, 3300)); // 3-2-1 走完
    return { state: W.state(), cancelled: W.cancelled(), stopped: W.cancel(), stateEnd: W.state() };
  });
  A('Q5b 录屏倒计时走完：3s 后转 recording（INTERNAL/全屏/显示点按）→ 停止 → cancelled=false',
    q5b.state === 'recording' && !q5b.cancelled && q5b.stopped && q5b.stateEnd === 'idle', JSON.stringify(q5b));

  A('Q6 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 300));
} catch (e) {
  A('e2e 异常中断', false, String(e).slice(0, 300));
}

await browser.close();
server.kill();
const passed = results.filter((r) => r[0]).length;
console.log(`\n===== e2e-v196-screenshot-record: ${passed}/${results.length} =====`);
process.exit(passed === results.length ? 0 : 1);
