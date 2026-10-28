// scripts/probe-v856-dispatch.mjs — 定位 bot 回复不派发问题
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
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(2500);

const frameOf = () => page.frames().find((f) => f.url().includes('apps/messages/index.html'));
await page.evaluate(() => { window.__shareSheet.openAppById('msg'); });
await sleep(900);
let frame = frameOf();
await frame.waitForFunction(() => document.readyState === 'complete' && document.getElementById('botList'), null, { timeout: 9000 }).catch(() => {});
await sleep(400);
frame = frameOf();

console.log('core loaded:', await frame.evaluate(() => !!window.__chatbotCore));
await frame.evaluate(() => document.querySelectorAll('#botList .list-card')[0].click());
await sleep(300);

// 直查：selectBot 是否真的执行 + 调度状态
console.log('state after select:', await frame.evaluate(() => ({
  activeBotId: typeof activeBotId !== 'undefined' ? activeBotId : 'UNDEF',
  currentChatId: typeof currentChatId !== 'undefined' ? currentChatId : 'UNDEF',
  botTurnsKeys: typeof botTurns !== 'undefined' ? Object.keys(botTurns) : 'UNDEF',
  typing: typeof typingBotId !== 'undefined' ? typingBotId : 'UNDEF',
})));

// 直接调用 sendBotMessage（绕过输入框）
await frame.evaluate(() => {
  document.getElementById('messageInput').value = '我想退款';
  sendBotMessage();
});
await sleep(300);
console.log('state after send:', await frame.evaluate(() => ({
  activeBotId,
  turns: JSON.parse(JSON.stringify(botTurns)),
  timers: JSON.parse(JSON.stringify(botTimers)),
  typingBotId,
  store: JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}').chats?.['b-kefu']?.messages?.map(m => ({ s: m.self, r: m.receipt, t: m.text.slice(0, 14) })),
})));
await sleep(3200);
console.log('state after 3.2s:', await frame.evaluate(() => ({
  turns: JSON.parse(JSON.stringify(botTurns)),
  typingBotId,
  store: JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}').chats?.['b-kefu']?.messages?.map(m => ({ s: m.self, t: m.text.slice(0, 20) })),
  domRows: document.querySelectorAll('#messagesList .message-row').length,
})));
console.log('pageerrors:', errors.length, errors.slice(0, 3));
await browser.close();
