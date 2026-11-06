// ==================== v91-bubbles.test.js — #91 Bubble 一期（AOSP Bubbles 对标） ====================
//
// 覆盖 v10.12 #91 一期三件套：
//   ① 气泡资格（isBubbleable：会话通知/显式 canBubble + id + appId 三条件）
//   ② 展开期通知条目抑制（isSuppressedFromShade / expandedIds ——
//      BubbleController.isBubbleNotificationSuppressedFromShade 同名语义）
//   ③ 屏缘定位（clampBubbleY / bubbleSlotY / 拖拽 touchSlop / reconcile 槽位重排）
//   ④ DOM 板集成（bootDesktop 真实启动链：真实通知管线 addSystemNotification →
//      notifications-changed → 对账；真实 mini-window 引擎开/收窗；DELETE 链路联动移除气泡）
//   ⑤ 源码锚：main.js 启动序 / notifications.js 抑制过滤与 canBubble 通道 / desktop.css 类组
// 纪律：静态 import 仅叶子纯逻辑模块（aosp/bubbles.js 零依赖）；重模块一律 bootDesktop 后
// 动态 import（state.js 导入环在 main.js 启动序内才可解析，v64/scenario 同款约束）。
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bootDesktop, sleep } from './scenario-helpers.js';

import {
  BUBBLE_SIZE,
  BUBBLE_GAP,
  BUBBLE_DRAG_SLOP,
  isBubbleable,
  isSuppressedFromShade,
  clampBubbleY,
  bubbleSlotY,
  isDragMovement,
  registerBubble,
  removeBubble,
  hasBubble,
  setExpanded,
  isExpanded,
  expandedIds,
  setBubbleY,
  bubbleY,
  reconcilePositions,
  bubbleCount,
  bubbleSnapshot,
  __resetBubbles,
} from '../ios-desktop/js/aosp/bubbles.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ==================== A. 纯逻辑核（aosp/bubbles.js） ====================

describe('#91① 气泡资格 isBubbleable（MessagingStyle+shortcut+允许 的 md3 映射）', () => {
  it('会话通知（canBubble:true + id + appId）合格', () => {
    expect(isBubbleable({ id: 'b1', appId: 'msg', canBubble: true })).toBe(true);
  });
  it('缺 canBubble（普通通知）不合格', () => {
    expect(isBubbleable({ id: 'b2', appId: 'msg' })).toBe(false);
  });
  it('缺 appId（不可路由）不合格', () => {
    expect(isBubbleable({ id: 'b3', canBubble: true })).toBe(false);
  });
  it('缺 id（抑制/移除无路由键）不合格', () => {
    expect(isBubbleable({ appId: 'msg', canBubble: true })).toBe(false);
  });
  it('null/空对象不合格', () => {
    expect(isBubbleable(null)).toBe(false);
    expect(isBubbleable({})).toBe(false);
  });
});

describe('#91② 展开期通知条目抑制 isSuppressedFromShade', () => {
  it('仅「展开中」的气泡抑制其条目（AOSP expanded 语义）', () => {
    const ids = new Set(['b1']);
    expect(isSuppressedFromShade({ id: 'b1' }, ids)).toBe(true);
    expect(isSuppressedFromShade({ id: 'b2' }, ids)).toBe(false);
  });
  it('空集合/null 入参不抑制', () => {
    expect(isSuppressedFromShade({ id: 'b1' }, new Set())).toBe(false);
    expect(isSuppressedFromShade({ id: 'b1' }, null)).toBe(false);
    expect(isSuppressedFromShade(null, new Set(['b1']))).toBe(false);
  });
  it('expandedIds 只含展开成员，且为副本（消费方持有安全）', () => {
    __resetBubbles();
    registerBubble('b1', 'msg', 0);
    registerBubble('b2', 'msg', 0);
    setExpanded('b1', true);
    const ids = expandedIds();
    expect(ids.has('b1')).toBe(true);
    expect(ids.has('b2')).toBe(false);
    ids.add('ghost');
    expect(expandedIds().has('ghost')).toBe(false);
  });
});

describe('#91③ 屏缘定位 clampBubbleY / bubbleSlotY', () => {
  it('上界钳制：y < topInset → topInset', () => {
    expect(clampBubbleY(-40, 800)).toBe(96);
  });
  it('下界钳制：y > vh - size - inset → 底界（48px 气泡 800 视口 → 740）', () => {
    expect(clampBubbleY(5000, 800)).toBe(800 - 48 - 12);
  });
  it('区间内原值返回', () => {
    expect(clampBubbleY(300, 800)).toBe(300);
  });
  it('视口过矮时区间塌缩到 topInset（不产生负区间）', () => {
    expect(clampBubbleY(5000, 60)).toBe(96);
  });
  it('槽位堆叠：第 i 槽 = topInset + i*(size+gap)，溢出钳底', () => {
    expect(bubbleSlotY(0, 800)).toBe(96);
    expect(bubbleSlotY(1, 800)).toBe(96 + BUBBLE_SIZE + BUBBLE_GAP);
    const vh = 300; // 只装得下 ~2.5 槽 → 第 3 槽（y=270）钳底 240
    expect(bubbleSlotY(3, 300)).toBe(300 - BUBBLE_SIZE - 12);
    expect(bubbleSlotY(3, 300)).toBe(clampBubbleY(270, 300));
  });
});

describe('#91③ 拖拽判别 isDragMovement（touchSlop）', () => {
  it('位移 ≤ slop（3,4 → 5）非拖拽', () => {
    expect(isDragMovement(3, 4)).toBe(false);
  });
  it('位移 > slop（4,5 → 6.4）为拖拽', () => {
    expect(isDragMovement(4, 5)).toBe(true);
    expect(BUBBLE_DRAG_SLOP).toBe(6);
  });
});

describe('#91 注册表（一期 Map 语义，二期 BubbleData 扩容点）', () => {
  it('注册幂等：重复注册返回 false 且不覆盖既有态', () => {
    __resetBubbles();
    expect(registerBubble('b1', 'msg', 96)).toBe(true);
    setExpanded('b1', true);
    expect(registerBubble('b1', 'msg', 500)).toBe(false);
    expect(isExpanded('b1')).toBe(true);
    expect(bubbleY('b1')).toBe(96);
  });
  it('未注册 id：setExpanded / setBubbleY / removeBubble 拒绝且不隐式创建', () => {
    __resetBubbles();
    expect(setExpanded('ghost', true)).toBe(false);
    expect(setBubbleY('ghost', 100, 800)).toBe(false);
    expect(removeBubble('ghost')).toBe(false);
    expect(hasBubble('ghost')).toBe(false);
  });
  it('拖拽落位钳制 + dragged 标记；reconcile 保留拖拽位、其余按槽重排', () => {
    __resetBubbles();
    registerBubble('b1', 'msg', 0);
    registerBubble('b2', 'msg', 0);
    registerBubble('b3', 'msg', 0);
    expect(setBubbleY('b2', 5000, 800)).toBe(true); // 超界落位 → 钳到 740
    expect(bubbleY('b2')).toBe(800 - BUBBLE_SIZE - 12);
    reconcilePositions(800);
    expect(bubbleY('b1')).toBe(96);          // 槽 0
    expect(bubbleY('b3')).toBe(96 + BUBBLE_SIZE + BUBBLE_GAP); // 槽 1（b2 已拖拽不占槽）
    expect(bubbleY('b2')).toBe(800 - BUBBLE_SIZE - 12);         // 拖拽位保持
  });
  it('移除后槽位收敛（剩余未拖拽气泡重排补位）', () => {
    __resetBubbles();
    registerBubble('b1', 'msg', 0);
    registerBubble('b2', 'msg', 0);
    removeBubble('b1');
    reconcilePositions(800);
    expect(bubbleY('b2')).toBe(96);
    expect(bubbleCount()).toBe(1);
  });
  it('快照为只读投影', () => {
    __resetBubbles();
    registerBubble('b1', 'msg', 96);
    const snap = bubbleSnapshot();
    expect(snap).toEqual([{ id: 'b1', appId: 'msg', expanded: false, y: 96, dragged: false }]);
  });
});

// ==================== B. DOM 板集成（bootDesktop 真实启动链） ====================

const badge = (id) => document.querySelector(`.bubble-badge[data-noti-id="${id}"]`);
const cardInShade = (id) => document.querySelector(`#notificationsContainer .noti-card[data-id="${id}"]`);
const flush = (ms = 60) => new Promise((r) => setTimeout(r, ms));
/** 真实删除通道（happy-dom 的 postMessage source 恒非 window，故直接派发带 source 的
 *  MessageEvent——isTrustedMessageSource(window) 放行语义与真浏览器 postMessage 同一闸门；
 *  e2e-v91 走真 postMessage 通道交叉验证） */
function deleteFromFeed(id) {
  window.dispatchEvent(new MessageEvent('message', { data: { type: 'DELETE_MESSAGE_NOTIFICATION', payload: { notiId: id } }, source: window }));
}

let notiMod;
let bubblesMod;

beforeAll(async () => {
  const W = await bootDesktop();
  W.__lockTest.instantUnlock();
  notiMod = await import('../ios-desktop/js/notifications.js');
  bubblesMod = await import('../ios-desktop/js/bubbles.js');
});

beforeEach(async () => {
  // Feed 清场（演示通知 + 前测残留逐 id 删，走真实 DELETE 通道）→ 注册表清空 → 对账归零
  notiMod.getNotifications().forEach((n) => { if (n && n.id) deleteFromFeed(n.id); });
  await flush(30);
  __resetBubbles();
  bubblesMod.renderBubbles();
  await flush(20);
});

describe('#91① DOM：会话通知 → 气泡角标（Feed 单源对账）', () => {
  it('canBubble 通知投递 → 气泡入列 + shade 卡片同时在（收起态不抑制）', async () => {
    notiMod.addSystemNotification({ id: 'b1', appId: 'msg', app: '信息', title: 'Ada', desc: '嗨', time: '刚刚', canBubble: true });
    await flush(30);
    expect(bubbleCount()).toBe(1);
    expect(badge('b1')).toBeTruthy();
    expect(badge('b1').dataset.appId).toBe('msg');
    expect(cardInShade('b1')).toBeTruthy(); // 未展开 → 条目照常在 shade
  });

  it('无 canBubble / 无 appId 的通知不产生气泡', async () => {
    notiMod.addSystemNotification({ id: 'n1', appId: 'msg', title: '普通', desc: '', time: '刚刚' });
    notiMod.addSystemNotification({ id: 'n2', title: '无路由', desc: '', time: '刚刚', canBubble: true });
    await flush(30);
    expect(badge('n1')).toBeNull();
    expect(badge('n2')).toBeNull();
  });
});

describe('#91②③ DOM：点击展开小窗 + 展开期通知抑制', () => {
  it('点击气泡 → enterMiniWindow(msg) 真开小窗 + 展开态 + 条目从 shade 抑制', async () => {
    notiMod.addSystemNotification({ id: 'b1', appId: 'msg', app: '信息', title: 'Ada', desc: '嗨', time: '刚刚', canBubble: true });
    await flush(30);
    badge('b1').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1 }));
    badge('b1').dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 })); // 无 move → 点击语义
    await flush(60);
    expect(window.__miniWindowAll().includes('msg')).toBe(true); // 真实小窗引擎接管
    expect(isExpanded('b1')).toBe(true);
    await flush(60); // 抑制重绘走 rAF 合帧
    expect(cardInShade('b1')).toBeNull(); // isBubbleNotificationSuppressedFromShade
    expect(badge('b1').classList.contains('bubble-badge--expanded')).toBe(true);
  });

  it('再次点击 → 小窗收起 + 条目恢复（气泡保留）', async () => {
    notiMod.addSystemNotification({ id: 'b1', appId: 'msg', app: '信息', title: 'Ada', desc: '嗨', time: '刚刚', canBubble: true });
    await flush(30);
    badge('b1').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1 }));
    badge('b1').dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    await flush(60);
    expect(cardInShade('b1')).toBeNull();
    badge('b1').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2 }));
    badge('b1').dispatchEvent(new PointerEvent('pointerup', { pointerId: 2 }));
    await flush(60);
    expect(isExpanded('b1')).toBe(false);
    expect(cardInShade('b1')).toBeTruthy(); // 收起即恢复（避免双显语义对称面）
    expect(badge('b1')).toBeTruthy();
    expect(window.__miniWindowAll().includes('msg')).toBe(true); // 实例保留为恢复芯片
  });

  it('小窗引擎侧收起（mini-window-changed active:false）→ 抑制同步解除', async () => {
    notiMod.addSystemNotification({ id: 'b1', appId: 'msg', app: '信息', title: 'Ada', desc: '嗨', time: '刚刚', canBubble: true });
    await flush(30);
    badge('b1').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1 }));
    badge('b1').dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    await flush(60);
    window.dispatchEvent(new CustomEvent('mini-window-changed', { detail: { appId: 'msg', active: false, minimized: true } }));
    await flush(60);
    expect(isExpanded('b1')).toBe(false);
    expect(cardInShade('b1')).toBeTruthy();
  });

  it('全屏接管（maximized:true）→ 气泡收起但保留', async () => {
    notiMod.addSystemNotification({ id: 'b1', appId: 'msg', app: '信息', title: 'Ada', desc: '嗨', time: '刚刚', canBubble: true });
    await flush(30);
    badge('b1').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1 }));
    badge('b1').dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    await flush(60);
    window.dispatchEvent(new CustomEvent('mini-window-changed', { detail: { appId: 'msg', active: true, maximized: true } }));
    await flush(60);
    expect(isExpanded('b1')).toBe(false);
    expect(badge('b1')).toBeTruthy();
    expect(cardInShade('b1')).toBeTruthy();
  });
});

describe('#91① DOM：Feed 移除联动（远端删除 → 气泡移除）', () => {
  it('DELETE_MESSAGE_NOTIFICATION → 气泡随之移除（notifications-changed 对账）', async () => {
    notiMod.addSystemNotification({ id: 'b1', appId: 'msg', app: '信息', title: 'Ada', desc: '嗨', time: '刚刚', canBubble: true });
    await flush(30);
    expect(bubbleCount()).toBe(1);
    deleteFromFeed('b1');
    await flush(60);
    expect(bubbleCount()).toBe(0);
    expect(badge('b1')).toBeNull();
  });
});

describe('#91③ DOM：纵向拖拽换位（touchSlop 判别 + 钳制）', () => {
  it('拖拽超过 slop → y 跟随钳制落位；手势态清理', async () => {
    notiMod.addSystemNotification({ id: 'b1', appId: 'msg', app: '信息', title: 'Ada', desc: '嗨', time: '刚刚', canBubble: true });
    await flush(30);
    const el = badge('b1');
    const y0 = window.__bubblesDebug.yOf('b1');
    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 380, clientY: y0 + 24, pointerId: 1 }));
    el.dispatchEvent(new PointerEvent('pointermove', { clientX: 380, clientY: y0 + 24 + 200, pointerId: 1 }));
    el.dispatchEvent(new PointerEvent('pointerup', { clientX: 380, clientY: y0 + 24 + 200, pointerId: 1 }));
    await flush(30);
    const y1 = window.__bubblesDebug.yOf('b1');
    expect(y1).toBeGreaterThan(y0);
    expect(y1).toBeLessThanOrEqual(915 - BUBBLE_SIZE - 12); // 钳制（场景视口 412×915）
    expect(el.classList.contains('bubble-badge--dragging')).toBe(false); // 手势结束清除
  });
});

describe('#91⑤ 源码锚（接线完整性静态断言）', () => {
  it('main.js：initBubbles 在 initNotifications 之后', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/main.js'), 'utf-8');
    expect(src.indexOf('initNotifications();')).toBeGreaterThan(-1);
    expect(src.indexOf('initBubbles();')).toBeGreaterThan(src.indexOf('initNotifications();'));
  });
  it('notifications.js：shade 渲染走抑制过滤 + 会话通知默认资格 + canBubble 透传', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/notifications.js'), 'utf-8');
    expect(src).toContain("from './aosp/bubbles.js'");
    expect(src).toContain('isSuppressedFromShade(n, expandedIds())');
    expect(src).toContain('canBubble: true');
    expect(src).toContain('canBubble: p.canBubble');
  });
  it('desktop.css：气泡类组在库（badge/expanded/dragging + reduced-motion 豁免）', () => {
    const css = readFileSync(join(ROOT, 'ios-desktop/css/desktop.css'), 'utf-8');
    expect(css).toContain('.bubble-badge');
    expect(css).toContain('.bubble-badge--expanded');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
