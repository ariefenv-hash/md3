// ==================== e2e-v200-chooser-rank.mjs — #200 Chooser 双池/直享/折叠 e2e ====================
//
// Q1 分享完成落档：__shareSheet.open → 点击 msg 目标 → localStorage 直享历史落档（msg 最新）
// Q2 直享区呈现：再开面板 → msg 出现在 share-direct-row 首位（Direct Share 最近使用）
// Q3 直享目标点击分发：直享区 msg 点击 → 总线投递 + 应用打开（同一 runShareTarget 分发）
// Q4 copy action 白名单：payload.action = ACTION_VIEW → toast 拒绝且不落剪贴板
// Q5 滚动扩行（延迟决策）：5 贴直享历史 → 折叠 4 → card 滚动 → 扩至 5/8（护栏通过）
// Q6 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8977;
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

  // Q1 分享完成落档
  await page.evaluate(() => { window.__shareSheet.open({ title: '直享测试', text: 'hello chooser', from: 'notes' }); });
  await sleep(500);
  const q1a = await page.evaluate(() => {
    const root = document.querySelector('.share-sheet-root');
    const grid = root.querySelector('.share-sheet-grid');
    const btns = grid.querySelectorAll('.share-target:not(.share-direct-target)');
    return { open: root.classList.contains('open'), targetCount: btns.length, directRow: !!grid.querySelector('.share-direct-row') };
  });
  await page.evaluate(() => {
    const btn = document.querySelector('.share-sheet-grid .share-target[data-target="msg"]:not(.share-direct-target)');
    if (btn) btn.click();
  });
  await sleep(700);
  const q1b = await page.evaluate(() => JSON.parse(localStorage.getItem('ios-desktop:chooser-direct-share-history') || '[]'));
  A('Q1 分享完成落档：面板开（无直享区，历史为空）→ 点击 msg → 历史落档 [{msg}]',
    // 纯文本 8 目标 - photo（image 专用类型不符）- notes（发起方剔除）= 6
    q1a.open && q1a.targetCount === 6 && q1a.directRow === false && q1b.length === 1 && q1b[0].id === 'msg',
    JSON.stringify({ q1a, q1b }));

  // Q2 直享区呈现
  await page.evaluate(() => { window.__shareSheet.open({ title: '直享测试2', text: 'second share', from: 'notes' }); });
  await sleep(500);
  const q2 = await page.evaluate(() => {
    const grid = document.querySelector('.share-sheet-grid');
    const row = grid.querySelector('.share-direct-row');
    const first = row && row.querySelector('.share-target');
    return {
      hasRow: !!row,
      firstId: first && first.getAttribute('data-target'),
      firstLabel: first && (first.querySelector('.st-label') || {}).textContent,
      directCount: row ? row.querySelectorAll('.share-target').length : 0,
      restFirst: (grid.querySelectorAll('.share-target:not(.share-direct-target)')[0] || {}).getAttribute && grid.querySelectorAll('.share-target:not(.share-direct-target)')[0].getAttribute('data-target'),
    };
  });
  A('Q2 直享区呈现：msg 进 share-direct-row 首位 + rest 无 msg（双池分离）',
    q2.hasRow && q2.firstId === 'msg' && q2.directCount === 1 && q2.restFirst !== 'msg', JSON.stringify(q2));

  // Q3 直享目标点击分发（面板关闭 → 总线投递）
  await page.evaluate(() => {
    const first = document.querySelector('.share-direct-row .share-target[data-target="msg"]');
    if (first) first.click();
  });
  await sleep(700);
  const q3 = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('ios-desktop:chooser-direct-share-history') || '[]');
    const root = document.querySelector('.share-sheet-root');
    return { histLen: raw.length, histFirst: raw[0] && raw[0].id, closed: !root.classList.contains('open') };
  });
  A('Q3 直享点击分发：面板关闭 + 历史更新（去重置顶 msg）',
    q3.closed && q3.histLen >= 1 && q3.histFirst === 'msg', JSON.stringify(q3));

  // Q4 copy action 白名单
  await page.evaluate(() => {
    window.__clipboard && window.__clipboard.clear && window.__clipboard.clear();
    window.__shareSheet.open({ title: '校验', text: 'blocked', action: 'ACTION_VIEW', from: 'notes' });
  });
  await sleep(500);
  await page.evaluate(() => {
    const btn = document.querySelector('.share-sheet-grid .share-target[data-target="clipboard"]:not(.share-direct-target)');
    if (btn) btn.click();
  });
  await sleep(500);
  const q4 = await page.evaluate(() => {
    const toast = document.getElementById('systemGlobalToast');
    const clip = window.__clipboard && window.__clipboard.get ? window.__clipboard.get() : null;
    return { toastShown: !!toast && (toast.textContent || '').includes('不支持拷贝'), clipEmpty: !clip || !clip.text };
  });
  A('Q4 copy action 白名单：ACTION_VIEW → toast 拒绝 + 剪贴板未写入',
    q4.toastShown && q4.clipEmpty, JSON.stringify(q4));

  // Q5 滚动扩行：5 贴历史 → 折叠 4 → 滚动扩行（缩小视口使 card 真实可滚动，
  // scrollTop 否则被钳 0 触发护栏 return——handleScroll 语义要求内容可滚动）
  await page.setViewportSize({ width: 400, height: 360 }); // 78vh≈281px < 内容 330px → 真实可滚动
  await sleep(300);
  await page.evaluate(() => {
    localStorage.setItem('ios-desktop:chooser-direct-share-history', JSON.stringify([
      { id: 'msg', at: Date.now() }, { id: 'notes', at: Date.now() - 1000 },
      { id: 'cal', at: Date.now() - 2000 }, { id: 'reminders', at: Date.now() - 3000 },
      { id: 'translate', at: Date.now() - 4000 },
    ]));
    window.__shareSheet.open({ title: '扩行', text: 'expand test', from: '' });
  });
  await sleep(500);
  const q5a = await page.evaluate(() => {
    const row = document.querySelector('.share-share-direct-row, .share-direct-row');
    return { folded: row ? row.querySelectorAll('.share-target').length : 0 };
  });
  await page.evaluate(() => {
    const card = document.querySelector('.share-sheet-card');
    card.scrollTop = 40;
    card.dispatchEvent(new Event('scroll'));
  });
  await sleep(500);
  const q5b = await page.evaluate(() => {
    const card = document.querySelector('.share-sheet-card');
    const row = document.querySelector('.share-direct-row');
    return {
      expanded: row ? row.querySelectorAll('.share-target').length : 0,
      scrollable: card.scrollHeight + '/' + card.clientHeight + '@' + card.scrollTop,
    };
  });
  A('Q5 滚动扩行延迟决策：折叠 4 → card scroll → 扩至 5（5>4 护栏通过）',
    q5a.folded === 4 && q5b.expanded === 5, JSON.stringify({ q5a, q5b }));

  A('Q6 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 300));
} catch (e) {
  A('e2e 异常中断', false, String(e).slice(0, 300));
}

await browser.close();
server.kill();
const passed = results.filter((r) => r[0]).length;
console.log(`\n===== e2e-v200-chooser-rank: ${passed}/${results.length} =====`);
process.exit(passed === results.length ? 0 : 1);
