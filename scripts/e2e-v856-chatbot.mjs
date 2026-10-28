// ==================== e2e-v856-chatbot.mjs — #63 聊天室 bot 本地化无头回归 ====================
//
// DoD（#63 验收原文逐条）：
//   A. 骨架：本地联系人 4 卡片（主功能区，先于联机房间）+ 默认系统通知只读
//   B. 选择 bot：标题/画像 tag/头像色/输入框启用
//   C. 问候拟人：打字指示器先行 → 问候延迟到达（非瞬时）
//   D. 规则回复+回执状态机：发送(送达) → bot 输入(已读) → 回复含主题特征
//   E. 连发不乱序：5 连发全数先于 bot 回复 + 单回复合并计数「已合并回复你的 5 条消息」+ 无多余回复
//   F. 未读徽标：会话外收到回复 → 卡片徽标
//   G. 路由互斥：切系统通知/房间 → bot 复位；切回历史仍在
//   H. 清空会话状态干净：confirm → 气泡清空 + 调度槽/上下文重置 + 落盘为空
//   I. 持久化跨重载：APP_CLOSE → reopen → 历史仍在 + 无二次问候
//   J. 深链 msg/bot：BUS_DELIVER 直投选中夜航诗人
//   K. 零 pageerror
//
// 教训沿袭：v850-v855（?nolock=1 跳锁屏 / domcontentloaded + 显式等待 / evaluate 点击 /
// 外域资源一律 abort 隔离沙箱外网波动 / iframe 内操作一律 frame.evaluate）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v856');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8086/ios-desktop/index.html?nolock=1';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });

// 外域资源一律 abort——沙箱外网波动隔离（bot 零网络依赖，恰好也验证离线可用）
await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());

const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('dialog', (d) => d.accept());

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(2500);

const frameOf = () => page.frames().find((f) => f.url().includes('apps/messages/index.html'));
let frame = null;

const evalJs = (expr, arg) => frame.evaluate(expr, arg);

async function waitUntil(exprFn, timeout = 8000, arg) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { const v = await evalJs(exprFn, arg); if (v) return true; } catch (e) {}
    await sleep(200);
  }
  return false;
}

await page.evaluate(() => { window.__shareSheet.openAppById('msg'); });
await sleep(700);
frame = frameOf();
if (frame) await waitUntil(() => document.readyState === 'complete' && !!document.getElementById('botList'), 9000);
await sleep(500);
frame = frameOf();
A('信息应用 iframe 挂载 + botList 就位', !!frame);

const reopen = async () => {
  await page.evaluate(() => { window.__shareSheet.openAppById('msg'); });
  await sleep(700);
  frame = frameOf();
  if (frame) await waitUntil(() => document.readyState === 'complete' && !!document.getElementById('botList'), 9000);
  await sleep(500);
  frame = frameOf();
};


// ---------- A. 骨架 ----------
const botCards = await evalJs(() => document.querySelectorAll('#botList .list-card').length);
A('本地联系人 4 卡片', botCards === 4, `count=${botCards}`);
const botFirst = await evalJs(() => {
  const room = document.getElementById('botList');
  return room && room.closest('.flex-1') && document.getElementById('roomList') &&
    document.querySelector('.flex-1.overflow-y-auto').innerHTML.indexOf('botList') < document.querySelector('.flex-1.overflow-y-auto').innerHTML.indexOf('roomList');
});
A('本地联系人区块先于联机房间（主功能区）', !!botFirst);
const sysReadonly = await evalJs(() => {
  const inp = document.getElementById('messageInput');
  return inp && inp.disabled && document.getElementById('chatTitle').textContent.includes('系统通知');
});
A('默认系统通知只读（输入框禁用）', !!sysReadonly);

// ---------- B. 选择 bot ----------
await evalJs(() => document.querySelectorAll('#botList .list-card')[0].click());
await sleep(300);
const selInfo = await evalJs(() => ({
  title: document.getElementById('chatTitle').textContent,
  status: document.getElementById('chatStatus').textContent,
  inputDisabled: document.getElementById('messageInput').disabled,
  placeholder: document.getElementById('messageInput').placeholder,
  avatarBg: document.getElementById('chatAvatar').style.background,
}));
A('选择客服小夏：标题/画像/输入框启用', selInfo.title.includes('客服小夏') && selInfo.title.includes('本地联系人')
  && selInfo.status.length > 0 && !selInfo.inputDisabled && selInfo.placeholder.includes('客服小夏'),
  JSON.stringify(selInfo).slice(0, 130));

// ---------- C. 问候拟人 ----------
const typingSeen = await evalJs(() => !!document.getElementById('botTypingRow') && document.getElementById('messagesList').textContent.includes('正在输入'));
A('打字指示器先行（对方正在输入…）', !!typingSeen);
let greeted = false;
greeted = await waitUntil(() => document.querySelectorAll('#messagesList .message-bubble').length > 0, 3500);
A('问候延迟到达（≤3.5s 内非瞬时）', greeted);
const greetState = await evalJs(() => {
  const bubbles = document.querySelectorAll('#messagesList .message-bubble');
  const typingGone = !document.getElementById('botTypingRow');
  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}');
  const msgs = store.chats && store.chats['b-kefu'] ? store.chats['b-kefu'].messages : [];
  return { bubbleCount: bubbles.length, typingGone, persisted: msgs.length, firstIsBot: msgs[0] ? !msgs[0].self : false, greetText: msgs[0] ? msgs[0].text : '' };
});
A('问候落盘 + 打字指示器退场', greetState.bubbleCount === 1 && greetState.typingGone && greetState.persisted === 1 && greetState.firstIsBot,
  `greet="${greetState.greetText.slice(0, 24)}"`);

// ---------- D. 规则回复 + 回执状态机 ----------
const sendInput = async (text) => {
  await frame.fill('#messageInput', text);
  await frame.press('#messageInput', 'Enter');
};
await sendInput('我想申请退款，怎么操作');
await sleep(120);
const sentState = await evalJs(() => {
  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}');
  const msgs = store.chats['b-kefu'].messages;
  const last = msgs[msgs.length - 1];
  const receiptEl = document.querySelector('#messagesList .message-row.sent .msg-receipt');
  return { self: last.self, receipt: last.receipt, label: receiptEl ? receiptEl.textContent.trim() : '' };
});
A('发送即落盘 + 送达回执（sent 态，拟人置读前）', sentState.self && sentState.receipt === 'sent' && sentState.label.includes('送达'), `label=${sentState.label}`);
// 等待规则回复（bot 消息数 > 问候，越过问候干扰）
if (!(await waitUntil(() => JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => !m.self).length >= 2, 8000))) throw new Error('D_REPLY_TIMEOUT');
// 已读回执拟人延迟（300~900ms）可能晚于最快回复（800ms）——等待置读完成再断言
if (!(await waitUntil(() => {
  const msgs = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages;
  const myLast = [...msgs].reverse().find(m => m.self);
  return myLast && myLast.receipt === 'read';
}, 4000))) throw new Error('READ_TIMEOUT');
const replyState = await evalJs(() => {
  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}');
  const msgs = store.chats['b-kefu'].messages;
  const myLast = [...msgs].reverse().find(m => m.self);
  const botMsgs = msgs.filter(m => !m.self);
  const botMsg = botMsgs[botMsgs.length - 1];
  const readEl = document.querySelector('#messagesList .message-row.sent .msg-receipt.read');
  const dividerCount = document.querySelectorAll('#messagesList .sys-msg').length;
  return { text: botMsg.text, read: myLast.receipt, readElShown: !!readEl, dividerCount, typingGone: !document.getElementById('botTypingRow') };
});
A('bot 规则回复到达（退款主题特征）', /退款|售后|订单|原路/.test(replyState.text) && replyState.typingGone, `r="${replyState.text.slice(0, 30)}"`);
A('已读回执状态机：bot 输入即整批 read（UI 徽章切换）', replyState.read === 'read' && replyState.readElShown);
A('时间戳气泡组分隔条存在', replyState.dividerCount >= 1, `dividers=${replyState.dividerCount}`);

// ---------- E. 连发不乱序（5 连发合并） ----------
const beforeBotCount = await evalJs(() => JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => !m.self).length);
for (const t of ['你好', '在吗', '快一点', '拜托了', '谢谢']) {
  await sendInput(t);
  await sleep(60);
}
const burstState = await evalJs(() => {
  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages;
  const selfMsgs = store.filter(m => m.self);
  const last5 = selfMsgs.slice(-5);
  return { selfTotal: selfMsgs.length, ordered: last5.map(m => m.text), allSentReceipt: last5.every(m => m.receipt === 'sent') };
});
A('5 连发全数入列且按发送序', burstState.selfTotal >= 5 + 1 && burstState.ordered.join('|') === '你好|在吗|快一点|拜托了|谢谢', burstState.ordered.join(','));
const burstT0 = Date.now();
if (!(await waitUntil((n) => JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => !m.self).length >= n, 8000, beforeBotCount + 1))) {
  const diag = await evalJs(() => ({
    turns: JSON.parse(JSON.stringify(typeof botTurns !== 'undefined' ? botTurns : {})),
    botMsgs: JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => !m.self).length,
    lastSelfTs: (() => { const s = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => m.self); return s.length ? s[s.length - 1].ts : 0; })(),
    lastBotTs: (() => { const s = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages.filter(m => !m.self); return s.length ? s[s.length - 1].ts : 0; })(),
    nowTs: Date.now(),
  })).catch(() => null);
  console.log('BURST_DIAG', JSON.stringify(diag));
  console.log('PAGE_ERRORS', JSON.stringify(errors));
  throw new Error('BURST_TIMEOUT');
}
console.log('burst reply took', Date.now() - burstT0, 'ms after wait start');
await sleep(2800); // 等待可能的第二个回复（应无——单槽合并）
const mergeState = await evalJs(() => {
  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages;
  const botMsgs = store.filter(m => !m.self);
  const last = botMsgs[botMsgs.length - 1];
  const mergeHintEl = [...document.querySelectorAll('#messagesList .message-bubble')].find(b => b.textContent.includes('已合并回复你的'));
  const domRows = [...document.querySelectorAll('#messagesList .message-row')].map(r => r.dataset.id);
  const storeIds = store.map(m => m.id);
  const domOrderMatches = domRows.length === storeIds.length && storeIds.every((id, i) => domRows[i] === id);
  return { botTotal: botMsgs.length, count: last.count, mergeHintShown: !!mergeHintEl, domOrderMatches, allRead: store.filter(m => m.self).every(m => m.receipt === 'read') };
});
const botDelta = mergeState.botTotal - beforeBotCount;
A('连发合并：恰好 1 条回复 + 计数 5 + 合并提示', botDelta === 1 && mergeState.count === 5 && mergeState.mergeHintShown,
  `delta=${botDelta} count=${mergeState.count}`);
A('DOM 序与落盘序完全一致（不乱序硬证据）', mergeState.domOrderMatches);
A('5 连发全部已读（整批置已读）', mergeState.allRead);

// ---------- F. 未读徽标（会话外收到回复） ----------
await evalJs(() => document.querySelectorAll('#botList .list-card')[1].click()); // 切到阿乐
await sleep(200);
await sendInput('在忙什么');
await sleep(200);
await evalJs(() => document.querySelectorAll('#botList .list-card')[0].click()); // 切回客服（阿乐回复会到 → 徽标）
await sleep(200);
await evalJs(() => document.querySelectorAll('#botList .list-card')[2].click()); // 切到极客君让阿乐在会话外回复
const badgeSeen = await waitUntil(() => {
  const card = document.querySelectorAll('#botList .list-card')[1];
  return !!(card && card.querySelector('.room-badge'));
}, 6000);
A('会话外回复 → 未读徽标出现', badgeSeen);

// ---------- G. 路由互斥 ----------
await evalJs(() => document.getElementById('chatList').querySelector('.list-card').click()); // 系统通知
await sleep(200);
const mutexState = await evalJs(() => ({
  inputDisabled: document.getElementById('messageInput').disabled,
  title: document.getElementById('chatTitle').textContent,
}));
A('切系统通知：bot 会话复位（输入框禁用）', mutexState.inputDisabled && mutexState.title.includes('系统通知'));

// ---------- I. 持久化跨重载（先于清空验证） ----------
await evalJs(() => document.querySelectorAll('#botList .list-card')[0].click()); // 回到客服
await sleep(300);
const persistState = await evalJs(() => {
  const bubbles = document.querySelectorAll('#messagesList .message-bubble').length;
  const rows = document.querySelectorAll('#messagesList .message-row').length;
  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'].messages;
  return { bubbles, rows, stored: store.length, noTyping: !document.getElementById('botTypingRow'), noGreetReschedule: store.length > 1 };
});
A('切回客服：历史完整（含问候+规则回复+合并回复）', persistState.rows === persistState.stored && persistState.stored >= 4 && persistState.noTyping,
  `rows=${persistState.rows}`);

// APP_CLOSE 生命周期：向 iframe 直投（清 botTimers）→ reload iframe 验证 restoreBots 恢复
await page.evaluate(() => {
  const target = [...document.querySelectorAll('iframe')].find(f => (f.src || '').includes('apps/messages'));
  if (target && target.contentWindow) target.contentWindow.postMessage({ type: 'APP_CLOSE' }, '*');
});
await sleep(300);
await frame.evaluate(() => location.reload());
await sleep(1200);
frame = frameOf();
if (frame) await waitUntil(() => document.readyState === 'complete' && !!document.getElementById('botList'), 9000);
await sleep(400);
frame = frameOf();
const afterReload = await evalJs(() => {
  const rows = document.querySelectorAll('#messagesList .message-row').length;
  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1')).chats['b-kefu'];
  return { rows, stored: store.messages.length, seen: store.ctx.seen };
});
A('APP_CLOSE 后重开：历史恢复（restoreBots）+ ctx.seen', afterReload.stored >= 4 && afterReload.seen === true, `stored=${afterReload.stored}`);
// 切回 b-kefu 验证 UI 渲染恢复（重开默认选 c-sys）
await evalJs(() => document.querySelectorAll('#botList .list-card')[0].click());
await sleep(300);
const reRender = await evalJs(() => document.querySelectorAll('#messagesList .message-row').length);
A('重开后选中 bot 会话渲染完整', reRender === afterReload.stored, `rows=${reRender}`);

// ---------- J. 深链 msg/bot ----------
await page.evaluate(() => {
  // 通过宿主窗口向 messages iframe 投递 BUS_DELIVER msg/bot（应用总线直投）
  const iframes = [...document.querySelectorAll('iframe')];
  const target = iframes.find(f => (f.src || '').includes('apps/messages'));
  if (target && target.contentWindow) {
    target.contentWindow.postMessage({ type: 'BUS_DELIVER', event: 'msg/bot', payload: { botId: 'b-poet' } }, '*');
  }
});
await sleep(400);
const deepLinkState = await evalJs(() => ({
  title: document.getElementById('chatTitle').textContent,
  status: document.getElementById('chatStatus').textContent,
}));
A('深链 msg/bot 直投选中夜航诗人', deepLinkState.title.includes('夜航诗人') && deepLinkState.status.includes('诗人'), JSON.stringify(deepLinkState));

// ---------- H. 清空会话状态干净 ----------
await sendInput('写首关于雨的诗');
await waitUntil(() => {
  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}');
  return !!(store.chats && store.chats['b-poet'] && store.chats['b-poet'].messages.some(m => !m.self));
}, 6000);
await evalJs(() => document.querySelector('button[title="清空本对话消息"]').click());
await sleep(400);
const clearState = await evalJs(() => {
  const store = JSON.parse(localStorage.getItem('md3_messages_bots_v1') || '{}');
  const poet = store.chats && store.chats['b-poet'] ? store.chats['b-poet'] : { messages: [], ctx: {} };
  return {
    bubbles: document.querySelectorAll('#messagesList .message-row').length,
    typingRow: !!document.getElementById('botTypingRow'),
    stored: poet.messages.length,
    topic: poet.ctx.topic || '',
    introShown: document.getElementById('messagesList').textContent.includes('本地规则引擎'),
  };
});
A('清空会话：气泡清空 + 落盘清空 + 无打字残留 + 状态干净', clearState.bubbles === 0 && clearState.stored === 0 && !clearState.typingRow && clearState.topic === '' && clearState.introShown,
  `bubbles=${clearState.bubbles} stored=${clearState.stored}`);

// ---------- K. 截图 + pageerror ----------
await evalJs(() => document.querySelectorAll('#botList .list-card')[0].click());
await sleep(400);
await page.screenshot({ path: join(OUT, 'chatbot-desktop.png') });
A('零 pageerror', errors.length === 0, errors.length ? errors[0].slice(0, 120) : '');

console.log(`\n===== e2e-v856: ${pass} passed, ${fail} failed =====`);
await browser.close();
process.exit(fail ? 1 : 0);
