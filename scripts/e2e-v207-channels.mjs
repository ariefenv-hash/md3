// ==================== e2e-v207-channels.mjs — #207 一期渠道投递分流真浏览器回归（v10.19 · R106 加餐） ====================
// Q1 NONE 渠道：注册 importance 0 → NOTIFY → 整条不进（notifications-changed 零增量 + 横幅零新增）
// Q2 LOW 渠道：注册 importance 2 → NOTIFY → 进 Feed（changed +1）不弹横幅（横幅零新增）
// Q3 tombstone：HIGH 渠道删除后 NOTIFY → 静默整条不进（changed 零增量，AOSP 删后投递不复活）
// Q4 DEFAULT 回归 + 旧档零声明零破坏：无 channelId NOTIFY → Feed +1 且横幅出现
// Q5 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8951;
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

const OBS = `(() => {
  window.__chChanged = 0;
  window.addEventListener('notifications-changed', () => window.__chChanged++);
})()`;

try {
  const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(OBS);
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(400);
  await page.evaluate(() => { window.__chChanged = 0; window.__chBanners = () => document.querySelectorAll('.hun-banner').length; });

  const notify = (p) => page.evaluate((payload) => window.postMessage({ type: 'NOTIFY', payload }, '*'), p);
  const gauge = () => page.evaluate(() => ({ changed: window.__chChanged, banners: document.querySelectorAll('.hun-banner').length }));

  /* Q1 NONE 渠道：整条不进 */
  await page.evaluate(() => window.__channelDebug.set('msg', 'mute', 0, '静音渠道'));
  await notify({ id: 'e2e-ch-none', appId: 'msg', channelId: 'mute', title: 'NONE 渠道通知', desc: '应整条不进' });
  await sleep(600);
  const q1 = await gauge();
  A('Q1 NONE 渠道整条不进：changed 零增量 + 横幅零新增', q1.changed === 0 && q1.banners === 0, JSON.stringify(q1));

  /* Q2 LOW 渠道：进 Feed 不弹横幅 */
  await page.evaluate(() => window.__channelDebug.set('msg', 'quiet', 2, '低重要性渠道'));
  await notify({ id: 'e2e-ch-low', appId: 'msg', channelId: 'quiet', title: 'LOW 渠道通知', desc: '应进 Feed 无横幅' });
  await sleep(600);
  const q2 = await gauge();
  A('Q2 LOW 进 Feed 无横幅：changed +1 且横幅零新增', q2.changed === 1 && q2.banners === 0, JSON.stringify(q2));

  /* Q3 tombstone：HIGH 渠道删除后投递静默 */
  await page.evaluate(() => {
    window.__channelDebug.set('msg', 'gone', 4, '将删渠道');
    window.__channelDebug.remove('msg', 'gone');
  });
  await notify({ id: 'e2e-ch-gone', appId: 'msg', channelId: 'gone', title: 'tombstone 投递', desc: '应静默整条不进' });
  await sleep(600);
  const q3 = await gauge();
  A('Q3 tombstone 静默：changed 零增量 + 横幅零新增', q3.changed === 1 && q3.banners === 0, JSON.stringify(q3));

  /* Q4 DEFAULT 回归 + 旧档零声明零破坏：无 channelId → Feed + 横幅 */
  await notify({ id: 'e2e-ch-default', appId: 'msg', title: '旧档零声明通知', desc: '隐式 DEFAULT 渠道' });
  await sleep(900);
  const q4 = await gauge();
  A('Q4 DEFAULT 回归：changed +1 且横幅出现（旧档零声明零破坏）', q4.changed === 2 && q4.banners >= 1, JSON.stringify(q4));

  /* Q5 零 pageerror */
  A('Q5 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r[0]).length;
console.log(`\n===== e2e-v207-channels: ${results.length - failed}/${results.length} passed =====`);
process.exit(failed ? 1 : 0);
