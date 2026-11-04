// ==================== e2e-v111-key-dispatcher.mjs — #111 组合键行为真跑（v9.78） ====================
// Q1 电源短按（<500ms 释放）→ 锁屏（AOSP POWER_KEY 短按 sleep）
// Q2 电源长按（≥500ms）→ 电源对话开（GlobalActionsDialog）
// Q3 Ctrl+Shift+S 齐按 → 截图 toast（KEYCODE_SYSRQ 网页等价）
// Q4 音量双键长按 3s → 无障碍 toast（AccessibilityShortcutController）
// Q5 单音量键不触发无障碍（步进音量主链零破坏）
// Q6 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8985;
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
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });

  // toast 文本捕获
  const toasts = [];
  await page.exposeFunction('__e2eToast', (txt) => toasts.push(txt));
  await page.evaluate(() => {
    const orig = window.showSystemToast;
    window.showSystemToast = (txt, icon) => { window.__e2eToast(String(txt)); if (orig) orig(txt, icon); };
  });

  const powerBtn = page.locator('#qsPowerBtn');
  A('Q0 前置：qsPowerBtn 在库', await powerBtn.count() === 1);

  // ---------- Q1 电源短按 → 锁屏 ----------
  await powerBtn.dispatchEvent('pointerdown', { pointerId: 1, bubbles: true, isPrimary: true });
  await sleep(120);
  await powerBtn.dispatchEvent('pointerup', { pointerId: 1, bubbles: true, isPrimary: true });
  await sleep(900);
  const q1 = await page.evaluate(() => ({
    locked: window.__lockTest ? window.__lockTest.isLocked() : null,
  }));
  A('Q1 电源短按 → 锁屏（AOSP 短按 sleep 语义）', q1.locked === true, JSON.stringify(q1));
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(300);

  // ---------- Q2 电源长按 → 电源对话 ----------
  await powerBtn.dispatchEvent('pointerdown', { pointerId: 1, bubbles: true, isPrimary: true });
  await sleep(750); // ≥500ms
  const q2mid = await page.evaluate(() => {
    const ov = document.getElementById('powerDialogOverlay');
    return { dialog: !!(ov && ov.classList.contains('active')) };
  });
  await powerBtn.dispatchEvent('pointerup', { pointerId: 1, bubbles: true, isPrimary: true });
  await sleep(400);
  A('Q2 电源长按 ≥500ms → 电源对话开（GlobalActionsDialog 语义）', q2mid.dialog === true, JSON.stringify(q2mid));
  // 收对话（Esc 或关闭钮——用 Esc 惯例）
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(400);

  // ---------- Q3 Ctrl+Shift+S 齐按 → 截图 toast ----------
  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('s');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
  await sleep(700);
  A('Q3 Ctrl+Shift+S → 截图组合键 toast（KEYCODE_SYSRQ 网页等价）',
    toasts.some((t) => t.includes('截图组合键')), JSON.stringify(toasts.slice(-3)));

  // ---------- Q5 单音量键不触发无障碍 ----------
  await page.keyboard.down('AudioVolumeUp');
  await sleep(400);
  await page.keyboard.up('AudioVolumeUp');
  await sleep(300);
  const a11yCountBefore = toasts.filter((t) => t.includes('无障碍快捷方式')).length;
  A('Q5 单音量键 → 零无障碍触发（步进主链零破坏）', a11yCountBefore === 0, JSON.stringify({ a11yCountBefore }));

  // ---------- Q4 音量双键长按 3s → 无障碍 toast ----------
  await page.keyboard.down('AudioVolumeUp');
  await page.keyboard.down('AudioVolumeDown');
  await sleep(3300); // ≥3s（poll 250ms 步进）
  await page.keyboard.up('AudioVolumeUp');
  await page.keyboard.up('AudioVolumeDown');
  await sleep(500);
  A('Q4 音量双键长按 3s → 无障碍快捷方式 toast',
    toasts.some((t) => t.includes('无障碍快捷方式')), JSON.stringify(toasts.slice(-3)));

  // ---------- Q6 零 pageerror ----------
  A('Q6 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

  const pass = results.filter((r) => r[0]).length;
  console.log(`\n=== e2e-v111: ${pass}/${results.length} ===`);
  process.exitCode = pass === results.length ? 0 : 1;
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
