// scripts/probe-v856-burst.mjs — 复刻 e2e 时序：问候到达后发消息+5连发，抓派发现场
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://127.0.0.1:8086/ios-desktop/index.html?nolock=1';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push('console.error: ' + m.text()); });
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(2500);

const frameOf = () => page.frames().find((f) => f.url().includes('apps/messages/index.html'));
await page.evaluate(() => { window.__shareSheet.openAppById('msg'); });
await sleep(900);
let frame = frameOf();
await frame.waitForFunction(() => document.readyState === 'complete' && document.getElementById('botList'), null, { timeout: 9000 }).catch(() => {});
await sleep(400);
frame = frameOf();

// 选 bot → 等问候真正到达（e2e 同款）
await frame.evaluate(() => document.querySelectorAll('#botList .list-card')[0].click());
await frame.waitForFunction(() => document.querySelectorAll('#messagesList .message-bubble').length > 0, null, { timeout: 3500 }).catch(() => {});
console.log('greeting arrived');

// 发 D 消息（fill+press 同 e2e）
await frame.fill('#messageInput', '我想申请退款，怎么操作');
await frame.press('#messageInput', 'Enter');
await sleep(150);
console.log('after D send:', await frame.evaluate(() => ({
  timers: JSON.parse(JSON.stringify(botTimers)),
  turns: JSON.parse(JSON.stringify(botTurns)),
  selfCount: JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => m.self).length,
})));

// 立即 5 连发（e2e 同款，不等 D 回复）
for (const t of ['你好', '在吗', '快一点', '拜托了', '谢谢']) {
  await frame.fill('#messageInput', t);
  await frame.press('#messageInput', 'Enter');
  await sleep(60);
}
console.log('after burst:', await frame.evaluate(() => ({
  timers: JSON.parse(JSON.stringify(botTimers)),
  lastPlan: botTurns['b-kefu'] && botTurns['b-kefu'].planned ? { count: botTurns['b-kefu'].planned.count, delayMs: botTurns['b-kefu'].planned.delayMs } : null,
  selfCount: JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => m.self).length,
})));

await sleep(3000);
console.log('after 3s wait:', await frame.evaluate(() => ({
  timers: JSON.parse(JSON.stringify(botTimers)),
  planned: botTurns['b-kefu'] ? !!botTurns['b-kefu'].planned : null,
  msgs: JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.map(m => (m.self ? 'U:' : 'B:') + m.text.slice(0, 12)),
})));
console.log('errors:', errors.length ? errors : '(none)');
await browser.close();
