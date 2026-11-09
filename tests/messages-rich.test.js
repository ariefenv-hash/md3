// ==================== messages-rich.test.js — 信息应用联机房间富媒体 A 层（v11.02 #214） ====================
// 验收锚（#214 议题逐条）：
//   ①A 小载荷接线：正在输入指示器（节流广播 + TTL 过期）+ 已读回执（防抖合并、仅 self 命中）
//     + 引用回复（截断降级、随包发送、发送即清）——CSS/逻辑在库（bot 侧 v8.56 已有），联机房间侧此前零接线；
//   ② 删除预编联系人/演示种子：Google Pixel 团队假通知不再内嵌，旧存量恢复路径同步过滤；
//   ③ 无网三态横幅：离线/重连中/已恢复（offline/close/reconnect 三事件全部接线，断连不静默）；
//   数据契约复用纯函数核（messages-rich-core.js，chatbot-core v8.56 同构：纯函数核 + 页面接线），
//   入站包白名单+截断（公共 broker 不可信来源，宁可丢包不放大）；B 层（图片/语音/文件）不动工
//   （传输路线须先裁决，议题明示）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/messages-rich-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/messages/index.html'), 'utf8');

// ---------- 沙箱提取（经典脚本 IIFE → window.__messagesRichCore） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__messagesRichCore;
const L = core.LIMITS;

describe('v11.02 #214 core：常量与工具', () => {
  it('LIMITS 数值合法且互恰（TTL > 发送节流；防抖 < TTL；上限非零）', () => {
    expect(L.TYPING_TTL_MS).toBeGreaterThan(L.TYPING_SEND_INTERVAL_MS);
    expect(L.READ_DEBOUNCE_MS).toBeGreaterThan(0);
    expect(L.READ_DEBOUNCE_MS).toBeLessThan(L.TYPING_TTL_MS);
    expect(L.TEXT_MAX).toBe(2000);          // 与页面 handleRoomIncoming 既有截断一致
    expect(L.IDS_MAX).toBeGreaterThanOrEqual(1);
    expect(L.QUOTE_TEXT_MAX).toBeGreaterThan(0);
    expect(L.RESTORED_BANNER_MS).toBeGreaterThan(0);
  });
  it('isRoomRoute：仅 room: 前缀为联机路由（bot:/c-sys 无联机语义）', () => {
    expect(core.isRoomRoute('room:abc')).toBe(true);
    expect(core.isRoomRoute('bot:b-kefu')).toBe(false);
    expect(core.isRoomRoute('c-sys')).toBe(false);
    expect(core.isRoomRoute('')).toBe(false);
    expect(core.isRoomRoute(null)).toBe(false);
  });
});

describe('v11.02 #214 core：正在输入指示器（①A）', () => {
  it('makeTypingPacket：合法构造；缺 room / 空名 → null（宁可不发不发包）', () => {
    const p = core.makeTypingPacket('h1', '小张', 1234);
    expect(p).toEqual({ type: 'typing', room: 'h1', user: { name: '小张' }, ts: 1234 });
    expect(core.makeTypingPacket('', '小张', 1)).toBeNull();
    expect(core.makeTypingPacket('h1', '   ', 1)).toBeNull();
    expect(core.makeTypingPacket(null, '小张', 1)).toBeNull();
    expect(core.makeTypingPacket('h1', undefined, 1)).toBeNull();
  });
  it('昵称截断：超 NAME_MAX 的名字不透传原文', () => {
    const long = 'x'.repeat(64);
    const p = core.makeTypingPacket('h1', long, 1);
    expect(p.user.name.length).toBe(L.NAME_MAX);
  });
  it('shouldSendTyping：首包放行；节流窗内拒绝；窗后放行', () => {
    expect(core.shouldSendTyping(0, 1000)).toBe(true);
    expect(core.shouldSendTyping(1000, 1000 + L.TYPING_SEND_INTERVAL_MS - 1)).toBe(false);
    expect(core.shouldSendTyping(1000, 1000 + L.TYPING_SEND_INTERVAL_MS)).toBe(true);
    expect(core.shouldSendTyping(undefined, 5)).toBe(true);
  });
  it('pruneTyping：过期/非法项丢弃，names 按最近活跃降序', () => {
    const now = 10000;
    const pruned = core.pruneTyping({ 新: now - 100, 旧: now - L.TYPING_TTL_MS - 1, 坏: 'x', 坏2: NaN }, now);
    expect(pruned.names).toEqual(['新']);
    expect(pruned.map).toEqual({ 新: now - 100 });
    expect(core.pruneTyping(null, now).names).toEqual([]);
    expect(core.pruneTyping({}, now).names).toEqual([]);
  });
  it('typingLabel：0 空；1/2 点名；>2 并入「等 N 人」', () => {
    expect(core.typingLabel([])).toBe('');
    expect(core.typingLabel(['小张'])).toBe('小张 正在输入…');
    expect(core.typingLabel(['小张', '小李'])).toBe('小张、小李 正在输入…');
    const many = core.typingLabel(['小张', '小李', '小王', '小赵']);
    expect(many).toContain('小张、小李');
    expect(many).toContain('等 4 人正在输入…');
    expect(core.typingLabel(['  ', ''])).toBe('');
  });
});

describe('v11.02 #214 core：已读回执（①A）', () => {
  it('makeReadPacket：去重 + IDS_MAX 截断；room/name/ids 非法 → null', () => {
    const p = core.makeReadPacket('h1', '小张', ['a', 'b', 'a', 'c'], 1);
    expect(p.ids).toEqual(['a', 'b', 'c']);
    expect(core.makeReadPacket('', 'x', ['a'], 1)).toBeNull();
    expect(core.makeReadPacket('h1', '', ['a'], 1)).toBeNull();
    expect(core.makeReadPacket('h1', 'x', [], 1)).toBeNull();
    expect(core.makeReadPacket('h1', 'x', 'not-array', 1)).toBeNull();
    const many = core.makeReadPacket('h1', 'x', Array.from({ length: 60 }, (_, i) => 'i' + i), 1);
    expect(many.ids.length).toBe(L.IDS_MAX);
  });
  it('applyReads：仅 self 且 id 命中且未读的条目置已读；不可变（原数组不被改写）', () => {
    const list = [
      { id: 'm1', self: true, read: false },
      { id: 'm2', self: false, read: false },
      { id: 'm3', self: true, read: true },
      { id: 'm4', self: true, read: false },
    ];
    const r = core.applyReads(list, ['m1', 'm2', 'm3', 'missing']);
    expect(r.changed).toBe(true);
    expect(r.messages.find(m => m.id === 'm1').read).toBe(true);
    expect(r.messages.find(m => m.id === 'm2').read).toBe(false); // 非 self 不动
    expect(r.messages.find(m => m.id === 'm3').read).toBe(true); // 已读保持
    expect(r.messages.find(m => m.id === 'm4').read).toBe(false); // 未命中不动
    expect(list.find(m => m.id === 'm1').read).toBe(false);       // 原数组未被改写
  });
  it('applyReads：无命中时 changed=false；畸形输入不抛', () => {
    expect(core.applyReads([{ id: 'a', self: true, read: false }], ['x']).changed).toBe(false);
    expect(core.applyReads(null, ['a']).changed).toBe(false);
    expect(core.applyReads([], null).changed).toBe(false);
  });
});

describe('v11.02 #214 core：引用回复（①A）', () => {
  it('makeQuote：构造 + 文本截断 + 空文本拒绝', () => {
    const q = core.makeQuote('m1', '原文'.repeat(100), '小张');
    expect(q.id).toBe('m1');
    expect(q.text.length).toBe(L.QUOTE_TEXT_MAX);
    expect(q.name).toBe('小张');
    expect(core.makeQuote('', 'x', 'y')).toBeNull();
    expect(core.makeQuote('m1', '   ', 'y')).toBeNull();
    expect(core.makeQuote('m1', null, 'y')).toBeNull();
  });
  it('normalizeQuote：接收侧降级——缺文本/非对象丢弃，超限截断', () => {
    expect(core.normalizeQuote({ id: 'm1', text: 'hi', name: '小张' })).toEqual({ id: 'm1', text: 'hi', name: '小张' });
    expect(core.normalizeQuote(null)).toBeNull();
    expect(core.normalizeQuote('str')).toBeNull();
    expect(core.normalizeQuote({ id: 'm1' })).toBeNull();
    const capped = core.normalizeQuote({ id: 'x'.repeat(99), text: 't'.repeat(999), name: 'n'.repeat(99) });
    expect(capped.text.length).toBe(L.QUOTE_TEXT_MAX);
    expect(capped.name.length).toBe(L.NAME_MAX);
  });
});

describe('v11.02 #214 core：入站规范化（公共 broker 不可信来源）', () => {
  it('type 白名单：chat/typing/read/sys 放行，未知类型 → kind=null 整包丢弃', () => {
    expect(core.normalizeRichIncoming({ type: 'chat', room: 'h' }).kind).toBe('chat');
    expect(core.normalizeRichIncoming({ type: 'typing', room: 'h' }).kind).toBe('typing');
    expect(core.normalizeRichIncoming({ type: 'read', room: 'h' }).kind).toBe('read');
    expect(core.normalizeRichIncoming({ type: 'sys', room: 'h' }).kind).toBe('sys');
    expect(core.normalizeRichIncoming({ type: 'hack', room: 'h' }).kind).toBeNull();
    expect(core.normalizeRichIncoming({ type: 'chat' }).kind).toBeNull();        // 缺 room
    expect(core.normalizeRichIncoming(null).kind).toBeNull();
    expect(core.normalizeRichIncoming('str').kind).toBeNull();
  });
  it('chat 包文本截断到 TEXT_MAX；user 仅取 name（不透传对象）', () => {
    const n = core.normalizeRichIncoming({ type: 'chat', room: 'h', text: 'x'.repeat(5000), user: { name: 'n'.repeat(99), evil: {} }, ts: 7 });
    expect(n.text.length).toBe(L.TEXT_MAX);
    expect(n.name.length).toBe(L.NAME_MAX);
    expect(n.ts).toBe(7);
  });
  it('read 包 ids：非字符串过滤 + 去重 + IDS_MAX 截断', () => {
    const n = core.normalizeRichIncoming({ type: 'read', room: 'h', ids: ['a', 3, null, 'a', 'b'] });
    expect(n.ids).toEqual(['a', 'b']);
    const many = core.normalizeRichIncoming({ type: 'read', room: 'h', ids: Array.from({ length: 80 }, (_, i) => 'i' + i) });
    expect(many.ids.length).toBe(L.IDS_MAX);
  });
  it('ts 非法退 0；text 缺失退空串（sys/chat 同规）', () => {
    expect(core.normalizeRichIncoming({ type: 'chat', room: 'h', ts: 'bad' }).ts).toBe(0);
    expect(core.normalizeRichIncoming({ type: 'chat', room: 'h' }).text).toBe('');
  });
});

// ---------- 页面接线锚（bot 侧 CSS 复用 + 页面只接线，v8.56 同构检查法） ----------
describe('v11.02 #214 页面：③ 无网三态横幅', () => {
  it('横幅元素在 DOM（connBanner + aria-live status，断连不静默）', () => {
    expect(PAGE_SRC).toContain('id="connBanner"');
    expect(PAGE_SRC).toContain('aria-live="polite"');
  });
  it('三态文案齐备：离线/重连中/已恢复/连接中', () => {
    expect(PAGE_SRC).toContain('联机离线 · 消息将在恢复连接后自动送达');
    expect(PAGE_SRC).toContain('连接中断 · 正在重连…');
    expect(PAGE_SRC).toContain('连接已恢复');
    expect(PAGE_SRC).toContain('正在连接 MQTT 代理…');
  });
  it('offline/close/reconnect 三事件全部接线（议题点名事件清单）', () => {
    expect(PAGE_SRC).toMatch(/mqttClient\.on\('offline'/);
    expect(PAGE_SRC).toMatch(/mqttClient\.on\('close'/);
    expect(PAGE_SRC).toMatch(/mqttClient\.on\('reconnect'/);
  });
  it('重连恢复才报「已恢复」，首连静默（prev 驱动）', () => {
    expect(PAGE_SRC).toContain("state === 'connected' && prev === 'reconnecting') setConnBanner('restored')");
    expect(PAGE_SRC).toContain("state === 'connected' && prev === 'connecting') setConnBanner(null)");
  });
  it('横幅 CSS 全量 var(--md-*) 令牌（准入①：禁止裸色）', () => {
    const i = PAGE_SRC.indexOf('.conn-banner {');
    const block = PAGE_SRC.slice(i, PAGE_SRC.indexOf('/* ①A 引用回复'));
    expect(block).toContain('var(--md-');
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});

describe('v11.02 #214 页面：①A 接线锚', () => {
  it('纯函数核已挂载（script 标签 + 消费守卫）', () => {
    expect(PAGE_SRC).toContain('js/messages-rich-core.js');
    expect(PAGE_SRC).toContain('window.__messagesRichCore');
  });
  it('正在输入：输入监听（节流广播）+ 入站路由 + TTL 过期重渲染', () => {
    expect(PAGE_SRC).toContain("addEventListener('input'");
    expect(PAGE_SRC).toContain('shouldSendTyping(typingSentAt');
    expect(PAGE_SRC).toContain("msg.type === 'typing'");
    expect(PAGE_SRC).toContain('function handleRoomTyping(');
    expect(PAGE_SRC).toContain('pruneTyping(roomTyping[hash]');
    expect(PAGE_SRC).toContain('typing-row');
  });
  it('已读回执：入站路由 + 可见即回执（防抖）+ self 气泡回执标记渲染', () => {
    expect(PAGE_SRC).toContain("msg.type === 'read'");
    expect(PAGE_SRC).toContain('function handleRoomReadReceipt(');
    expect(PAGE_SRC).toContain('function queueReadReceipt(');
    expect(PAGE_SRC).toContain('makeReadPacket(hash');
    expect(PAGE_SRC).toMatch(/msg-receipt \$\{msg\.read \? 'read'/);
  });
  it('引用回复：菜单项 + 随包发送 + 发送即清 + 气泡引用摘要渲染 + 切换会话清态', () => {
    expect(PAGE_SRC).toContain('id="ctxQuoteItem"');
    expect(PAGE_SRC).toContain('function quoteSelectedMessage(');
    expect(PAGE_SRC).toContain('function cancelQuote(');
    expect(PAGE_SRC).toContain('if (quoteState) packet.quote = { ...quoteState };');
    expect(PAGE_SRC).toContain('quote-chip');
    expect(PAGE_SRC).toContain('cancelQuote(); // v11.02（#214）：切换会话清引用态');
    expect(PAGE_SRC).toContain('quote-chip__name');
  });
  it('房间消息气泡接上下文菜单（引用入口可达：他人消息 onclick showContextMenu）', () => {
    expect(PAGE_SRC).toContain("onclick=\"showContextMenu(event, \\'${msg.id}\\')\"");
  });
  it('状态清理：APP_CLOSE 全量清理 + 清空缓存/退房间清 typing 态', () => {
    expect(PAGE_SRC).toContain('Object.keys(roomTypingTimer).forEach(k => clearTimeout(roomTypingTimer[k]))');
    expect(PAGE_SRC).toContain('delete roomTyping[hash]');
    expect(PAGE_SRC).toContain('setConnBanner(null)');
  });
  it('typing/read 断连静默丢弃（无离线补发语义，chat 包才有）', () => {
    // publishRoomPacket 原逻辑不动：仅 type==='chat' 入离线队列
    expect(PAGE_SRC).toContain("if (packet.type === 'chat') offlineQueue.push({ hash, packet });");
  });
});

describe('v11.02 #214 页面：② 演示种子清理', () => {
  it('Google Pixel 团队假通知不再内嵌（种子 messages 为空数组）', () => {
    expect(PAGE_SRC).not.toContain('Google Pixel 团队');
    expect(PAGE_SRC).not.toContain("id: 'm-sys-1'");
    expect(PAGE_SRC).not.toContain('全新 Material 3 Expressive 设计规范已全量上线');
  });
  it('旧存量恢复路径同步过滤 m-sys-1（老用户不再复现假通知）', () => {
    expect(PAGE_SRC).toContain("m.id !== 'm-sys-1'");
  });
  it('bot 联系人功能不受影响（#63 交付件，PERSONAS 接线在库）', () => {
    expect(PAGE_SRC).toContain('js/chatbot-core.js');
    expect(PAGE_SRC).toContain('renderBotList()');
  });
});
