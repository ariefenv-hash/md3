// ==================== e2e-v169-sdk-lifecycle.mjs — #169 SDK 生命周期事件面 e2e（v9.83） ====================
//
// Q1 重开 SDK 完整性（fix(v7.19) per-document 注入真复验）：destroyAppInstance 销毁 → 重开
//    → 新文档 __system 13 键全在（含新增 on/off；fs/clipboard 二段注入同链跑通）
// Q2/Q3/Q4 生命周期三相 relay 真链（同文档生命周期内）：CustomEvent 源（即 bg-freeze/
//    page-stack 的派发物）→ app-bus relay → broadcastSystem → postToApp → BUS_DELIVER
//    → __system.on handler。
//    【架构发现（回帖在录）】切应用时后台 iframe 文档重载是 md3 既有行为（实测 tag 丢失、
//    节点身份稳定）——跨切换的生命周期事件对重载型后台无意义，故三相在同文档内验证。
// Q5 静默性：生命周期广播不代发通知横幅（broadcastSystem 零 deliveryNotification）
// Q6 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8997;
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

const openApp = async (id) => {
  await page.evaluate((appId) => {
    for (const ic of document.querySelectorAll('.app-icon')) { if (ic.dataset.id === appId) { ic.click(); return; } }
  }, id);
  await sleep(1100);
};
/** 销毁应用实例（真链：page-stack.destroyAppInstance，recents 卡片关闭同款） */
const destroyApp = async (id) => {
  await page.evaluate(async (appId) => {
    const m = await import('/ios-desktop/js/page-stack.js');
    m.destroyAppInstance(appId);
  }, id);
  await sleep(800); // APP_CLOSE_GRACE_MS 220ms + 摘除 + 动画余量
};

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);

  // ---------- 热身 + 挂监听（同文档生命周期） ----------
  await openApp('notes');
  await openApp('calculator');
  await openApp('notes'); // 热身（页栈稳定 + fix(v7.19) 重载后 SDK 自动恢复的活样本）
  const hook = await page.evaluate(() => {
    const f = document.querySelector('#app-instance-notes iframe');
    const s = f && f.contentWindow && f.contentWindow.__system;
    if (!s) return { ok: false };
    f.contentWindow.__lcLog = [];
    s.on('system/lifecycle', (p) => f.contentWindow.__lcLog.push(p));
    return { ok: true, hasOn: typeof s.on === 'function', hasOff: typeof s.off === 'function' };
  });
  A('Q0 SDK on/off 订阅 API 在位（注入面完整）', hook.ok && hook.hasOn && hook.hasOff, JSON.stringify(hook));

  // ---------- Q2/Q3 paused/resumed 相（真实 relay 链：CustomEvent 源） ----------
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('app-freeze', { detail: { appId: 'notes' } })));
  await sleep(500);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('app-resume', { detail: { appId: 'notes' } })));
  await sleep(500);
  const q23 = await page.evaluate(() => {
    const f = document.querySelector('#app-instance-notes iframe');
    const log = (f && f.contentWindow && f.contentWindow.__lcLog) || [];
    return {
      paused: log.some((p) => p && p.phase === 'paused' && p.appId === 'notes'),
      resumed: log.some((p) => p && p.phase === 'resumed' && p.appId === 'notes'),
      n: log.length,
    };
  });
  A('Q2/Q3 paused+resumed 相：relay→broadcastSystem→BUS_DELIVER→on() 全链到达',
    q23.paused && q23.resumed, JSON.stringify(q23));

  // ---------- Q1 重开 SDK 完整性（destroy → 重开 = 新文档全注入） ----------
  // 坑在录：destroy 后直接 openApp 同应用走「同应用承接」分支（state.currentApp 未变，
  // 不重建实例）——需先切走 currentApp（open calc）再 open notes 触发新建实例
  await destroyApp('notes');
  await openApp('calculator');
  await openApp('notes');
  const q1 = await page.evaluate(() => {
    const f = document.querySelector('#app-instance-notes iframe');
    if (!f || !f.contentWindow) return { ok: false, missing: ['iframe'] };
    const s = f.contentWindow.__system;
    if (!s) return { ok: false, missing: ['__system'] };
    // fs/clipboard 是对象型能力面（write/read...），其余为函数型——分型检测
    const fns = ['emit', 'broadcast', 'share', 'openApp', 'notify', 'requestPermission', 'on', 'off'];
    const objs = ['fs', 'clipboard'];
    const missing = fns.filter((k) => typeof s[k] !== 'function')
      .concat(objs.filter((k) => !s[k] || typeof s[k] !== 'object'));
    return { ok: missing.length === 0, missing, keyCount: fns.length + objs.length - missing.length };
  });
  A('Q1 重开 SDK 完整性：销毁重建后 10 键全在（emit/broadcast/share/openApp/notify/requestPermission/fs/clipboard/on/off）',
    q1.ok, JSON.stringify(q1));

  // ---------- Q4 closed 相（跨应用订阅：calculator 侧收 notes 的 closed） ----------
  await page.evaluate(() => {
    const f = document.querySelector('#app-instance-calculator iframe');
    const s = f && f.contentWindow && f.contentWindow.__system;
    if (s) {
      f.contentWindow.__lcLog = [];
      s.on('system/lifecycle', (p) => f.contentWindow.__lcLog.push(p));
    }
  });
  await destroyApp('notes'); // destroyAppInstance → broadcastAppClose → app-closed CustomEvent → relay → closed 相
  const q4 = await page.evaluate(() => {
    const f = document.querySelector('#app-instance-calculator iframe');
    const log = (f && f.contentWindow && f.contentWindow.__lcLog) || [];
    return { hasClosed: log.some((p) => p && p.phase === 'closed' && p.appId === 'notes'), log };
  });
  A('Q4 closed 相：notes 销毁 → calculator 侧订阅收到 { phase:closed, appId:notes }',
    q4.hasClosed, JSON.stringify(q4.log));

  // ---------- Q5 静默性 ----------
  const q5 = await page.evaluate(() => {
    const stack = document.getElementById('headsUpStack');
    return { banners: stack ? stack.querySelectorAll('.hun-banner').length : 0 };
  });
  A('Q5 静默性：全程无生命周期误触通知横幅（broadcastSystem 零 deliveryNotification）',
    q5.banners === 0, JSON.stringify(q5));

  // ---------- Q6 零 pageerror ----------
  A('Q6 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));
} catch (e) {
  A('e2e 异常中断', false, String(e).slice(0, 300));
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter(([c]) => !c);
console.log(`\n==== e2e-v169: ${results.length - failed.length}/${results.length} ====`);
process.exit(failed.length ? 1 : 0);
