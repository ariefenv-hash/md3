// ==================== e2e-v206-redaction.mjs — #206 锁屏通知脱敏真浏览器回归（v10.20 · R107） ====================
// Q1 默认态（hide 隐藏敏感）：锁屏 PRIVATE 通知 → 脱敏卡（redacted 类 +「内容已隐藏」+ 应用名，零原文泄露）
// Q2 同设置下 PUBLIC 通知 → 锁屏明文（零 redacted 类 + 原文可见）
// Q3 PRIVATE + publicVersion → 脱敏卡显示概要标题（PublicInflationCallback 语义）
// Q4 SECRET 通知 → 脱敏卡（议题规格①：一律脱敏，AOSP 整条隐藏差异在录）
// Q5 切「显示全部」→ PRIVATE 卡明文（矩阵 show 列）
// Q6 切「不显示」→ 整列「暂无新通知」（lockscreenGate 总闸）
// Q7 Feed 恒明文边界：解锁后通知中心原文可见（脱敏只作用锁屏面 #206 §5）
// Q8 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8952;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' : ''}${extra}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
for (let i = 0; i < 30; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/ios-desktop/index.html`); if (r.ok) break; } catch (e) {} await sleep(500); }
await sleep(800);
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const errors = [];

try {
  const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(300);

  const notify = (p) => page.evaluate((payload) => window.postMessage({ type: 'NOTIFY', payload }, '*'), p);
  const relock = () => page.evaluate(async () => {
    window.__lockTest.instantUnlock();
    await new Promise((r) => setTimeout(r, 120));
    window.__lockTest.lock();
    await new Promise((r) => setTimeout(r, 260));
  });
  const setMode = (obj) => page.evaluate((s) => localStorage.setItem('settings:notifications-v1', JSON.stringify(s)), obj);
  const cards = () => page.evaluate(() => Array.from(document.querySelectorAll('.lock-notifications .lock-noti-card')).map((c) => ({
    redacted: c.classList.contains('lock-noti-card--redacted'),
    title: (c.querySelector('.lock-noti-title') || {}).textContent || '',
    desc: (c.querySelector('.lock-noti-desc') || {}).textContent || '',
    app: (c.querySelector('.lock-noti-app') || {}).textContent || '',
    aria: c.getAttribute('aria-label') || '',
  })));

  /* Q1 默认态 hide：PRIVATE 通知 → 脱敏卡零原文泄露 */
  await notify({ id: 'e2e-rd-pri', appId: 'msg', visibility: 0, title: '机密约会请求', desc: '周五 20:00 老地方见' });
  await sleep(500);
  await relock();
  let cs = await cards();
  const q1 = cs.find((c) => c.app === '信息' || c.title === '内容已隐藏');
  A('Q1 hide 态 PRIVATE → 脱敏卡（redacted 类 +「内容已隐藏」+ aria）', !!q1 && q1.redacted === true
    && q1.title === '内容已隐藏' && q1.aria === '内容已隐藏', JSON.stringify(q1));
  A('Q1b 零原文泄露（锁屏列无原始标题/正文）', !JSON.stringify(cs).includes('机密约会请求') && !JSON.stringify(cs).includes('老地方见'));

  /* Q2 同设置 PUBLIC → 明文 */
  await notify({ id: 'e2e-rd-pub', appId: 'clock', visibility: 1, title: '公开播报通知', desc: '今日天气晴' });
  await sleep(500);
  await relock();
  cs = await cards();
  const q2 = cs.find((c) => !c.redacted && c.title === '公开播报通知');
  A('Q2 hide 态 PUBLIC → 锁屏明文（零 redacted 类 + 原文可见）', !!q2, JSON.stringify(cs));

  /* Q3 PRIVATE + publicVersion → 概要标题 */
  await notify({ id: 'e2e-rd-pv', appId: 'msg', visibility: 0, title: '原始私信标题', desc: '原文正文', publicVersion: { title: '新消息概要' } });
  await sleep(500);
  await relock();
  cs = await cards();
  const q3 = cs.find((c) => c.redacted && c.title === '新消息概要');
  A('Q3 publicVersion 优先：脱敏卡显示概要标题（原题/原正文零泄露）', !!q3 && !JSON.stringify(cs).includes('原始私信标题'), JSON.stringify(q3));

  /* Q4 SECRET → 一律脱敏卡 */
  await notify({ id: 'e2e-rd-sec', appId: 'msg', visibility: -1, title: '绝密验证码 774921', desc: '切勿转发' });
  await sleep(500);
  await relock();
  cs = await cards();
  const q4 = cs.find((c) => c.redacted && c.title === '内容已隐藏');
  A('Q4 hide 态 SECRET → 脱敏卡（验证码零泄露）', !!q4 && !JSON.stringify(cs).includes('774921'), JSON.stringify(cs));

  /* Q5 切「显示全部」→ PRIVATE 卡明文 + SECRET 恒脱敏（矩阵 show 列全验证；锁屏列 MAX=3 截前 3 张） */
  await setMode({ lockScreenShow: 1, allowPrivate: true });
  await relock();
  cs = await cards();
  const q5a = cs.find((c) => !c.redacted && c.title === '原始私信标题'); // PRIVATE show 态明文
  const q5b = cs.find((c) => c.redacted && c.title === '内容已隐藏');    // SECRET show 态恒脱敏（议题规格①）
  A('Q5 show 态：PRIVATE 明文 + SECRET 恒脱敏（矩阵 show 列）', !!q5a && !!q5b && !JSON.stringify(cs).includes('774921'), JSON.stringify(cs));

  /* Q6 切「不显示」→ 整列空 */
  await setMode({ lockScreenShow: 0, allowPrivate: true });
  await relock();
  const q6 = await page.evaluate(() => ({
    cards: document.querySelectorAll('.lock-notifications .lock-noti-card').length,
    empty: (document.querySelector('.lock-notifications .lock-noti-empty') || {}).textContent || '',
  }));
  A('Q6 disable → 整列不渲染（「暂无新通知」空态，锁屏零通知卡）', q6.cards === 0 && q6.empty.includes('暂无新通知'), JSON.stringify(q6));

  /* Q7 Feed 恒明文边界：恢复默认 hide → 解锁态通知中心原文可见 */
  await setMode({ lockScreenShow: 1, allowPrivate: false });
  await page.evaluate(() => { window.__lockTest.instantUnlock(); });
  await sleep(400);
  await page.evaluate(() => { document.querySelector('.statusbar-notifications')?.click(); });
  await sleep(500);
  await page.evaluate(() => { window.dispatchEvent(new Event('notifications-changed')); });
  await sleep(300);
  const q7 = await page.evaluate(() => document.body.innerHTML.includes('机密约会请求'));
  A('Q7 Feed 恒明文边界：解锁后通知中心原文可见（脱敏只作用锁屏面）', q7 === true, String(q7));

  /* Q8 零 pageerror */
  A('Q8 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r[0]).length;
console.log(`\n===== e2e-v206-redaction: ${results.length - failed}/${results.length} passed =====`);
process.exit(failed ? 1 : 0);
