// ==================== v856-chatbot.test.js — 聊天室 bot 本地化（v8.56 #63） ====================
// 验收锚（#63 原文逐条）：bot 联系人 3~5 个（不同性格画像：客服/朋友/极客）；本地规则引擎
// 回复（关键词+上下文+打字延迟模拟）；打字指示器（对方正在输入…）、已读回执、时间戳气泡组；
// 消息流与 messages 现有 UI 一体；bot 回复延迟 800ms~2.5s 随机（拟人）；零网络依赖零 API（纯
// 本地）；连续快发消息 bot 队列不乱序；拟人节奏（不瞬时回）；清空会话状态干净；vitest 锚
// （对话引擎纯逻辑）。headless：e2e 以状态机/调度/回执为锚（scripts/e2e-v856-chatbot.mjs）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/chatbot-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/messages/index.html'), 'utf8');

// ---------- 沙箱提取（经典脚本 IIFE → window.__chatbotCore） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__chatbotCore;

// 确定性随机源（mulberry32 种子——回复挑选/延迟断言可复现）
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const BOT_BLOCK_MARKER = 'v8.56 本地联系人（issue #63：bot 拟人对话，零网络依赖）';
const botBlock = PAGE_SRC.slice(PAGE_SRC.indexOf(BOT_BLOCK_MARKER), PAGE_SRC.indexOf('init();\n    initBots()'));

describe('v8.56 #63 core：性格画像完整性（4 bot）', () => {
  const personas = core.PERSONAS.map(core.normalizePersona);
  it('恰 4 个 bot（议题锚 3~5），id 唯一且全过 normalizePersona', () => {
    expect(core.PERSONAS.length).toBeGreaterThanOrEqual(3);
    expect(core.PERSONAS.length).toBeLessThanOrEqual(5);
    expect(personas.every(Boolean)).toBe(true);
    expect(new Set(personas.map(p => p.id)).size).toBe(core.PERSONAS.length);
  });
  it('性格画像覆盖客服/朋友/极客/诗人四象限，tag/avatar/color 齐备', () => {
    const ids = personas.map(p => p.id);
    expect(ids).toContain('b-kefu');
    expect(ids).toContain('b-friend');
    expect(ids).toContain('b-geek');
    expect(ids).toContain('b-poet');
    personas.forEach(p => {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.avatar.length).toBeGreaterThan(0);
      expect(p.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(p.tag.length).toBeGreaterThan(0);
    });
  });
  it('每 bot 规则 ≥5 条且结构合法（topic/keys/replies 非空）', () => {
    personas.forEach(p => {
      expect(p.rules.length, p.id).toBeGreaterThanOrEqual(5);
      p.rules.forEach(r => {
        expect(r.topic.length, p.id).toBeGreaterThan(0);
        expect(r.keys.length, p.id + '/' + r.topic).toBeGreaterThan(0);
        expect(r.replies.length, p.id + '/' + r.topic).toBeGreaterThan(0);
        r.replies.forEach(s => expect(s.length, p.id).toBeGreaterThan(0));
      });
    });
  });
  it('意图/兜底/追问回复池齐备且池内无重复', () => {
    personas.forEach(p => {
      [p.greetReplies, p.thanksReplies, p.byeReplies, p.praiseReplies, p.questionReplies, p.fallbacks, p.genericFollowups].forEach((pool, i) => {
        expect(pool.length, p.id + '#' + i).toBeGreaterThan(0);
        expect(new Set(pool).size, p.id + '#' + i).toBe(pool.length);
      });
      expect(p.fallbacks.length, p.id).toBeGreaterThanOrEqual(4);
      expect(p.selfAware.length, p.id).toBeGreaterThan(0);
      expect(typeof p.greeting).toBe('string');
      expect(p.greeting.length, p.id).toBeGreaterThan(0);
    });
  });
  it('personaById：合法 id 返回归一对象，非法 id 返回 null', () => {
    expect(core.personaById('b-kefu')).not.toBeNull();
    expect(core.personaById('nope')).toBeNull();
    expect(core.personaById('')).toBeNull();
    expect(core.personaById(undefined)).toBeNull();
  });
  it('畸形 persona 降级：缺 rules / 缺 id / 非 object 一律 null', () => {
    expect(core.normalizePersona(null)).toBeNull();
    expect(core.normalizePersona({ id: 'x' })).toBeNull();
    expect(core.normalizePersona({ id: 'x', name: 'y', rules: [{}] })).toBeNull();
    expect(core.normalizePersona('str')).toBeNull();
  });
});

describe('v8.56 #63 core：本地规则引擎（关键词+意图+上下文）', () => {
  it('客服规则命中：退款/快递/发票/人工 → 对应主题', () => {
    const kefu = core.personaById('b-kefu');
    expect(core.matchRule(kefu, '我想申请退款').rule.topic).toBe('refund');
    expect(core.matchRule(kefu, '快递到哪了').rule.topic).toBe('shipping');
    expect(core.matchRule(kefu, '能开发票吗').rule.topic).toBe('invoice');
    expect(core.matchRule(kefu, '转人工！').rule.topic).toBe('human');
    expect(core.matchRule(kefu, '今天天气不错')).toBeNull();
  });
  it('朋友/极客/诗人规则命中：吃→food、bug→bug、写首诗→poem', () => {
    expect(core.matchRule(core.personaById('b-friend'), '中午吃什么').rule.topic).toBe('food');
    expect(core.matchRule(core.personaById('b-geek'), '这段代码有 bug').rule.topic).toBe('bug');
    expect(core.matchRule(core.personaById('b-poet'), '给我写首诗吧').rule.topic).toBe('poem');
    expect(core.matchRule(core.personaById('b-geek'), '大模型训练').rule.topic).toBe('ai');
  });
  it('ASCII 键词边界：ai 不误中 certain/called，独立词命中', () => {
    const geek = core.personaById('b-geek');
    expect(core.matchRule(geek, 'certainly not')).toBeNull();
    expect(core.matchRule(geek, 'I called him')).toBeNull();
    expect(core.matchRule(geek, '我想学 AI').rule.topic).toBe('ai');
    expect(core.matchRule(geek, 'what is a bug?').rule.topic).toBe('bug');
  });
  it('意图识别：问候/感谢/道别/夸奖/提问/无（？与？与为什么均判提问）', () => {
    expect(core.detectIntent('你好呀')).toBe(core.INTENT.GREET);
    expect(core.detectIntent('在吗')).toBe(core.INTENT.GREET);
    expect(core.detectIntent('谢谢你')).toBe(core.INTENT.THANKS);
    expect(core.detectIntent('拜拜')).toBe(core.INTENT.BYE);
    expect(core.detectIntent('晚安')).toBe(core.INTENT.BYE);
    expect(core.detectIntent('你真厉害')).toBe(core.INTENT.PRAISE);
    expect(core.detectIntent('为什么天空是蓝的？')).toBe(core.INTENT.QUESTION);
    expect(core.detectIntent('这样对吗?')).toBe(core.INTENT.QUESTION);
    expect(core.detectIntent('吃了吗')).toBe(core.INTENT.NONE);
    expect(core.detectIntent('')).toBe(core.INTENT.NONE);
  });
  it('pickReply：规则命中返回 rule kind + 主题，rng 注入可复现', () => {
    const kefu = core.personaById('b-kefu');
    const a = core.pickReply(kefu, '我想退款', core.newCtx(), seeded(7));
    const b = core.pickReply(kefu, '我想退款', core.newCtx(), seeded(7));
    expect(a.kind).toBe('rule');
    expect(a.topic).toBe('refund');
    expect(a.text).toBe(b.text);
    expect(a.text.length).toBeGreaterThan(0);
  });
  it('pickReply：意图路由（问候/感谢/道别/提问 → 对应池）', () => {
    const friend = core.personaById('b-friend');
    expect(core.pickReply(friend, '你好', core.newCtx(), seeded(1)).kind).toBe('greet');
    expect(core.pickReply(friend, '谢谢你啦', core.newCtx(), seeded(1)).kind).toBe('thanks');
    expect(core.pickReply(friend, '再见啦', core.newCtx(), seeded(1)).kind).toBe('bye');
    expect(core.pickReply(friend, '怎样才能睡好？', core.newCtx(), seeded(1)).kind).toBe('question');
  });
  it('上下文追问：topic 记忆下「然后呢/继续」→ followup 且不换主题', () => {
    const kefu = core.personaById('b-kefu');
    const c1 = core.updateCtx(core.newCtx(), { text: 'x', kind: 'rule', topic: 'refund' });
    const r = core.pickReply(kefu, '然后呢', c1, seeded(3));
    expect(r.kind).toBe('followup');
    expect(r.topic).toBe('refund');
    // 无主题时追问落兜底
    const r2 = core.pickReply(kefu, '然后呢', core.newCtx(), seeded(3));
    expect(r2.kind).toBe('fallback');
  });
  it('反重复：recent 命中过的回复不再被选中（池 >1 时）', () => {
    const kefu = core.personaById('b-kefu');
    const rule = kefu.rules.find(r => r.topic === 'refund');
    const ctxRep = core.newCtx();
    const first = rule.replies[0];
    ctxRep.recent = [first];
    const pool = rule.replies;
    for (let i = 0; i < 50; i++) {
      const got = core.pickFresh(pool, ctxRep.recent, seeded(100 + i));
      if (pool.length > 1) expect(got, 'iter' + i).not.toBe(first);
    }
  });
  it('兜底连击：连续 fallback ≥3 触发自省（selfAware），拟人彩蛋', () => {
    const poet = core.personaById('b-poet');
    const c2 = core.updateCtx(core.updateCtx(core.newCtx(), { text: 'a', kind: 'fallback' }), { text: 'b', kind: 'fallback' });
    expect(c2.fallbackStreak).toBe(2);
    const r = core.pickReply(poet, '_xyz未知话题_', c2, seeded(5));
    expect(r.kind).toBe('selfAware');
    expect(r.text).toBe(poet.selfAware);
  });
  it('updateCtx：主题跟随 + recent 环形封顶 3 + seen 置位', () => {
    let c = core.newCtx();
    expect(c.seen).toBe(false);
    c = core.updateCtx(c, { text: 'r1', kind: 'rule', topic: 't1' });
    expect(c.topic).toBe('t1');
    expect(c.seen).toBe(true);
    c = core.updateCtx(c, { text: 'r2', kind: 'rule', topic: 't2' });
    c = core.updateCtx(c, { text: 'r3', kind: 'rule', topic: 't3' });
    c = core.updateCtx(c, { text: 'r4', kind: 'rule', topic: 't4' });
    expect(c.recent).toEqual(['r2', 'r3', 'r4']);
    expect(c.topic).toBe('t4');
    expect(c.fallbackStreak).toBe(0);
  });
});

describe('v8.56 #63 core：拟人节奏（800ms~2.5s 随机延迟）', () => {
  it('延迟区间钳制：rng 两端与随机采样 5000 次均落在 [800, 2500]', () => {
    expect(core.DELAY_MIN).toBe(800);
    expect(core.DELAY_MAX).toBe(2500);
    expect(core.pickDelay(() => 0, '')).toBe(800);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 5000; i++) {
      const d = core.pickDelay(Math.random, 'x'.repeat(60));
      lo = Math.min(lo, d); hi = Math.max(hi, d);
      expect(d).toBeGreaterThanOrEqual(800);
      expect(d).toBeLessThanOrEqual(2500);
    }
    expect(lo).toBeLessThan(hi); // 确有随机分布
  });
  it('长度因子有上限（60 字与 6 字延迟差 ≤300ms），不瞬时（恒 ≥800）', () => {
    const short = core.pickDelay(() => 0, '短');
    const long = core.pickDelay(() => 0, 'x'.repeat(500));
    expect(long - short).toBeLessThanOrEqual(300);
    expect(short).toBeGreaterThanOrEqual(800);
  });
  it('打字指示器先行：计划即显示（页面接线锚）', () => {
    expect(PAGE_SRC).toContain('typing-dots');
    expect(PAGE_SRC).toContain('正在输入…');
    expect(PAGE_SRC).toContain('function showTypingIfActive');
    expect(PAGE_SRC).toContain('typingBotId = botId');
  });
});

describe('v8.56 #63 core：单槽调度（连续快发不乱序的结构性保证）', () => {
  it('连发合并：计数累加、答复对象恒为最后一条', () => {
    let st = core.newTurnState();
    st = core.planOnUserMsg(st, 'b-friend', '你好', core.newCtx(), seeded(11), 1000).state;
    st = core.planOnUserMsg(st, 'b-friend', '在吗', core.newCtx(), seeded(12), 1100).state;
    st = core.planOnUserMsg(st, 'b-friend', '吃了吗', core.newCtx(), seeded(13), 1200).state;
    expect(st.planned.count).toBe(3);
    expect(st.planned.lastText).toBe('吃了吗');
    const d = core.dispatchTurn(st);
    expect(d.turn.count).toBe(3);
    expect(d.state.planned).toBeNull();
  });
  it('在途回复恒 ≤1：派发后槽清空，空槽派发返回 null', () => {
    const empty = core.dispatchTurn(core.newTurnState());
    expect(empty.turn).toBeNull();
    let st = core.planOnUserMsg(core.newTurnState(), 'b-geek', 'hi', core.newCtx(), seeded(2), 1).state;
    expect(st.planned).not.toBeNull();
    st = core.dispatchTurn(st).state;
    expect(st.planned).toBeNull();
  });
  it('每 bot 独立槽：A 的在途计划不被 B 的新计划覆盖', () => {
    const stA = core.planOnUserMsg(core.newTurnState(), 'b-kefu', '退款', core.newCtx(), seeded(21), 1).state;
    const stB = core.planOnUserMsg(core.newTurnState(), 'b-friend', '吃了吗', core.newCtx(), seeded(22), 2).state;
    expect(stA.planned.botId).toBe('b-kefu');
    expect(stB.planned.botId).toBe('b-friend');
    // 页面侧逐 bot 持有 state（botTurns[botId]），互不干扰
    expect(PAGE_SRC).toContain("botTurns[botId] || (botTurns[botId] = core.newTurnState())");
  });
  it('重定计划：同 bot 连发只保留一个 pending（旧计划作废）', () => {
    let st = core.planOnUserMsg(core.newTurnState(), 'b-kefu', '退款', core.newCtx(), seeded(31), 1).state;
    const firstDelay = st.planned.delayMs;
    st = core.planOnUserMsg(st, 'b-kefu', '退货呢', core.newCtx(), seeded(32), 2).state;
    expect(st.planned.count).toBe(2);
    expect(st.planned.lastText).toBe('退货呢');
    expect(st.planned.delayMs).toBeGreaterThanOrEqual(800); // 新延迟重定
    void firstDelay;
  });
  it('未知 bot 计划返回空 plan（防线）', () => {
    const r = core.planOnUserMsg(core.newTurnState(), 'ghost', 'hi', core.newCtx(), seeded(1), 1);
    expect(r.plan).toBeNull();
  });
});

describe('v8.56 #63 core：已读回执（发送→已读两态）', () => {
  it('applyReads：self 且 sent → read；非 self 不动；已读幂等', () => {
    const msgs = [
      { id: '1', self: true, receipt: 'sent' },
      { id: '2', self: false, receipt: 'sent' },
      { id: '3', self: true, receipt: 'read' },
    ];
    const r1 = core.applyReads(msgs);
    expect(r1.changed).toBe(true);
    expect(r1.messages[0].receipt).toBe('read');
    expect(r1.messages[1].receipt).toBe('sent');
    expect(r1.messages[2].receipt).toBe('read');
    expect(msgs[0].receipt).toBe('sent'); // 原数组不可变
    const r2 = core.applyReads(r1.messages);
    expect(r2.changed).toBe(false);
  });
  it('页面接线：发送即 sent，拟人延迟后整批置已读（两态可观察）', () => {
    expect(PAGE_SRC).toContain('receipt: core.RECEIPT.SENT');
    expect(PAGE_SRC).toContain('const ar = core.applyReads(live.messages)');
    expect(PAGE_SRC).toContain('300 + Math.round(Math.random() * 600)');
    expect(PAGE_SRC).toContain("msg-receipt ${read ? 'read' : ''}");
    expect(PAGE_SRC).toContain('已读');
    expect(PAGE_SRC).toContain('送达');
  });
});

describe('v8.56 #63 core：时间戳气泡组', () => {
  const MIN = 60 * 1000;
  it('5 分钟间隔分组：超隔新组、组内保持顺序', () => {
    const msgs = [
      { id: 'a', ts: 0 },
      { id: 'b', ts: 4 * MIN },
      { id: 'c', ts: 10 * MIN },
    ];
    const g = core.groupBubbles(msgs, undefined, 10 * MIN);
    expect(g.length).toBe(2);
    expect(g[0].items.map(m => m.id)).toEqual(['a', 'b']);
    expect(g[1].items.map(m => m.id)).toEqual(['c']);
  });
  it('分组标签四级：当日 HH:mm / 昨天 / 同年 / 往年', () => {
    const now = new Date(2026, 9, 28, 12, 0).getTime(); // 2026-10-28 12:00
    const sameDay = new Date(2026, 9, 28, 9, 5).getTime();
    const yesterday = new Date(2026, 9, 27, 23, 30).getTime();
    const sameYear = new Date(2026, 0, 2, 8, 1).getTime();
    const lastYear = new Date(2024, 11, 31, 22, 0).getTime();
    expect(core.timeDividerLabel(sameDay, now)).toBe('09:05');
    expect(core.timeDividerLabel(yesterday, now)).toBe('昨天 23:30');
    expect(core.timeDividerLabel(sameYear, now)).toBe('1月2日 08:01');
    expect(core.timeDividerLabel(lastYear, now)).toBe('2024年12月31日 22:00');
  });
  it('日界跨越强制分组（间隔再短也分）', () => {
    const before = new Date(2026, 9, 27, 23, 59).getTime();
    const after = new Date(2026, 9, 28, 0, 1).getTime();
    const g = core.groupBubbles([{ id: 'x', ts: before }, { id: 'y', ts: after }], undefined, after);
    expect(g.length).toBe(2);
  });
  it('页面渲染走 groupBubbles + sys-msg 分隔条（复用现有 UI）', () => {
    expect(PAGE_SRC).toContain('core.groupBubbles(msgs, undefined, Date.now())');
    expect(PAGE_SRC).toContain('${escapeHtml(g.label)}');
  });
});

describe('v8.56 #63 core：持久化归一（normalizeBotState）', () => {
  it('畸形消息逐条剔除：缺 id/空 text/非对象；receipt 白名单外归 read', () => {
    const st = core.normalizeBotState({
      chats: {
        'b-kefu': {
          messages: [
            { id: 'a', text: 'hi', self: true, receipt: 'sent', ts: 5 },
            { text: 'no-id', self: true, ts: 6 },
            { id: 'b', text: '', self: false, ts: 7 },
            null,
            { id: 'c', text: 'ok', self: false, receipt: 'weird', ts: 'x' },
          ],
          ctx: { topic: 'refund', recent: ['a', 'b', 'c', 'd'], fallbackStreak: 99, seen: true },
        },
        bad: { messages: 'not-array' },
      },
    });
    expect(Object.keys(st.chats)).toEqual(['b-kefu']);
    const msgs = st.chats['b-kefu'].messages;
    expect(msgs.map(m => m.id)).toEqual(['a', 'c']);
    expect(msgs[0].receipt).toBe('sent');
    expect(msgs[1].receipt).toBe('read');
    expect(msgs[1].ts).toBe(0);
    expect(st.chats['b-kefu'].ctx.recent).toHaveLength(3);
    expect(st.chats['b-kefu'].ctx.fallbackStreak).toBe(9);
  });
  it('容量封顶 200（保留最新）+ 非法输入返回空态', () => {
    const flood = { chats: { 'b-geek': { messages: Array.from({ length: 260 }, (_, i) => ({ id: 'm' + i, text: 't', self: true, ts: i })) } } };
    const st = core.normalizeBotState(flood);
    expect(st.chats['b-geek'].messages).toHaveLength(200);
    expect(st.chats['b-geek'].messages[0].id).toBe('m60');
    expect(core.normalizeBotState(null).chats).toEqual({});
    expect(core.normalizeBotState('str').version).toBe(1);
    expect(core.MSG_CAP).toBe(200);
  });
  it('页面读写键 md3_messages_bots_v1 + normalizeBotState 接线', () => {
    expect(PAGE_SRC).toContain("const BOT_STATE_KEY = 'md3_messages_bots_v1'");
    expect(PAGE_SRC).toContain('window.__chatbotCore.normalizeBotState');
  });
});

describe('v8.56 #63 页面接线（与 messages 现有 UI 一体 + 零网络）', () => {
  it('chatbot-core.js 脚本引入（IIFE + window.__chatbotCore 导出）', () => {
    expect(PAGE_SRC).toContain('<script src="../../js/chatbot-core.js"></script>');
    expect(CORE_SRC).toContain('window.__chatbotCore = core');
    expect(CORE_SRC).toMatch(/\(function \(\) \{\s*\n\s*'use strict';/);
  });
  it('侧栏「本地联系人」区块成为主功能区（置于联机房间之前）', () => {
    expect(PAGE_SRC).toContain('id="botList"');
    expect(PAGE_SRC.indexOf('id="botList"')).toBeLessThan(PAGE_SRC.indexOf('id="roomList"'));
    expect(PAGE_SRC).toContain('本地联系人');
    expect(PAGE_SRC).toContain('function renderBotList');
    expect(PAGE_SRC).toContain('function selectBot');
  });
  it('路由：bot 分支先于 room 分支，v774 锚逐字节保留', () => {
    const botIdx = PAGE_SRC.indexOf("currentChatId.startsWith('bot:')) { sendBotMessage(); return; }");
    const roomIdx = PAGE_SRC.indexOf("currentChatId.startsWith('room:')) { sendRoomMessage(); return; }");
    expect(botIdx).toBeGreaterThan(-1);
    expect(roomIdx).toBeGreaterThan(botIdx);
    expect(PAGE_SRC).toContain("currentChatId.startsWith('room:')) { sendRoomMessage(); return; }");
    expect(PAGE_SRC).toContain('const hash = currentChatId.slice(5);');
  });
  it('清空会话状态干净：取消在途回复 + 重置调度槽 + 重置上下文', () => {
    expect(PAGE_SRC).toContain('function clearBotConversation');
    const fn = PAGE_SRC.slice(PAGE_SRC.indexOf('function clearBotConversation'), PAGE_SRC.indexOf('function initBots'));
    expect(fn).toContain('clearTimeout(botTimers[botId])');
    expect(fn).toContain('window.__chatbotCore.newTurnState()');
    expect(fn).toContain('window.__chatbotCore.newCtx()');
    expect(fn).toContain('persistBots()');
    // 路由入口
    expect(PAGE_SRC.slice(PAGE_SRC.indexOf('function clearCurrentChatMessages'), PAGE_SRC.indexOf("currentChatId.startsWith('room:')"))).toContain("currentChatId.startsWith('bot:')");
  });
  it('拟人节奏：问候延迟到达（非瞬时）+ 回复延迟来自 plan.delayMs', () => {
    expect(PAGE_SRC).toContain('BOT_GREET_DELAY_MIN = 900');
    expect(PAGE_SRC).toContain('setTimeout(() => dispatchBotTurn(botId), r.plan.delayMs)');
  });
  it('连发合并提示 + 未读徽标（会话外收到回复）', () => {
    expect(PAGE_SRC).toContain('已合并回复你的');
    expect(PAGE_SRC).toContain("botUnread[botId] = (botUnread[botId] || 0) + 1");
  });
  it('APP_CLOSE 生命周期：清全部 bot 定时器（iframe 销毁纪律）', () => {
    const fn = PAGE_SRC.slice(PAGE_SRC.indexOf('function initBots'), PAGE_SRC.indexOf('init();\n    initBots()'));
    expect(fn).toContain("e.data.type === 'APP_CLOSE'");
    expect(fn).toContain('Object.keys(botTimers).forEach');
  });
  it('零网络依赖：bot 代码块无 fetch/WebSocket/XMLHttpRequest', () => {
    expect(botBlock).not.toMatch(/\bfetch\s*\(/);
    expect(botBlock).not.toContain('WebSocket');
    expect(botBlock).not.toContain('XMLHttpRequest');
    expect(CORE_SRC).not.toMatch(/\bfetch\s*\(/);
    expect(CORE_SRC).not.toContain('WebSocket');
  });
  it('启动序列：initBots 先于 initRooms（恢复层先行）+ setupEventListeners 修复接线', () => {
    expect(PAGE_SRC).toContain('setupEventListeners();');
    expect(PAGE_SRC.indexOf('initBots();')).toBeLessThan(PAGE_SRC.lastIndexOf('initRooms();'));
  });
  it('BUS 深链 msg/bot：payload.botId 合法即选中会话', () => {
    expect(PAGE_SRC).toContain("e.data.event === 'msg/bot'");
    expect(PAGE_SRC).toContain('payload.botId');
  });
  it('XSS 纪律：bot 渲染路径全部经 escapeHtml（含用户输入文本）', () => {
    expect(PAGE_SRC).toContain("${escapeHtml(msg.text)}");
    expect(PAGE_SRC).toContain('escapeHtml(p.name)');
    expect(PAGE_SRC).toContain("escapeHtml(p.avatar)");
    expect(PAGE_SRC).toContain('escapeHtml(last)');
  });
});
