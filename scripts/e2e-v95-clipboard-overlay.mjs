// ==================== e2e-v95-clipboard-overlay.mjs — #95 剪贴板预览浮层 e2e（v9.71） ====================
// Q1 复制文本 → 浮层浮现：摘要 + 来源标签 + share/edit 两动作
// Q2 URL 文本 → 动作行出现「打开链接」
// Q3 连续复制重置计时（reShow 语义）
// Q4 点击外部收起（pointerdown 捕获）
// Q5 分享动作真实消费 share-sheet（面板 open）
// Q6 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8993;
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
await page.route(/^(?!http:\/\/127\.0\.0\.1)/, (r) => r.abort());

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await sleep(600);

  // 诊断：clipboard 挂载状态
  const diag = await page.evaluate(() => ({
    clip: typeof window.__clipboard,
    ov: typeof window.__clipboardOverlayTest,
    sheet: typeof window.__shareSheet,
    appWindow: typeof window.appWindow,
    keys: Object.keys(window).filter((k) => k.toLowerCase().includes('clip')),
  }));
  console.log('DIAG', JSON.stringify(diag));
  console.log('ERRS', errors.length, errors.slice(0, 3).join(' || '));

  // Q1 复制文本（桌面直连 __clipboard.set）→ 浮层浮现
  const q1 = await page.evaluate(() => {
    window.__clipboard.set({ kind: 'text', text: '这是第一条剪贴板文本' }, 'notes');
    const T = window.__clipboardOverlayTest;
    return { visible: T.visible(), summary: T.summary(), meta: T.meta(), actions: T.actions() };
  });
  A('Q1 复制后浮层浮现：摘要 + 来源标签 + share/edit 动作',
    q1.visible && q1.summary === '这是第一条剪贴板文本' && q1.meta.includes('备忘录') &&
    q1.actions.includes('share') && q1.actions.includes('edit'),
    `summary=${q1.summary} meta=${q1.meta} actions=${q1.actions.join(',')}`);

  // Q2 URL 文本 → 「打开链接」动作出现
  const q2 = await page.evaluate(() => {
    window.__clipboard.set({ kind: 'text', text: '访问 https://example.com/path?q=1 了解更多' }, 'notes');
    return { visible: window.__clipboardOverlayTest.visible(), actions: window.__clipboardOverlayTest.actions() };
  });
  A('Q2 URL 文本出现「打开链接」动作', q2.visible && q2.actions.includes('open'), `actions=${q2.actions.join(',')}`);

  // Q3 连续复制重置计时：2.2s 后再复制 → remainingMs 回满 ~4000
  await sleep(2200);
  const q3 = await page.evaluate(async () => {
    const T = window.__clipboardOverlayTest;
    const before = T.remainingMs(); // 距下次 expire 已 <1800
    window.__clipboard.set({ kind: 'text', text: '重置计时的第二条' }, 'notes');
    const after = T.remainingMs();
    return { before, after, resetOk: after > before };
  });
  A('Q3 连续复制重置计时（remainingMs 回满）', q3.resetOk && q3.after > 3800, `before=${q3.before} after=${q3.after}`);

  // Q4 点击外部收起
  await page.mouse.click(200, 200); // 桌面空白区（卡在底部）
  await sleep(400);
  const q4 = await page.evaluate(() => window.__clipboardOverlayTest.visible());
  A('Q4 点击外部收起', q4 === false);

  // Q5 分享动作真实消费 share-sheet
  const q5 = await page.evaluate(() => {
    window.__clipboard.set({ kind: 'text', text: '分享到信息/备忘录的文本' }, 'notes');
    return window.__clipboardOverlayTest.visible();
  });
  await sleep(300);
  await page.evaluate(() => {
    document.querySelector('#clipboardOverlay [data-cb-act="share"]').click();
  });
  await sleep(600);
  const q5b = await page.evaluate(() => {
    const sheet = document.querySelector('.share-sheet-root');
    const open = sheet ? (sheet.classList.contains('open') || sheet.classList.contains('show')) : false;
    return { open, hidden: !window.__clipboardOverlayTest.visible() };
  });
  A('Q5 分享动作消费 share-sheet（面板打开 + 浮层收起）', q5 && q5b.open && q5b.hidden,
    `sheetOpen=${q5b.open} overlayHidden=${q5b.hidden}`);

  // Q6 零 pageerror
  A('Q6 全程零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (e) {
  console.log('FATAL', String(e));
  results.push([false, 'e2e 未完成（FATAL）', String(e)]);
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
const pass = results.filter((r) => r[0]).length;
console.log(`\n===== e2e-v95: ${pass}/${results.length} =====`);
process.exit(pass === results.length ? 0 : 1);
