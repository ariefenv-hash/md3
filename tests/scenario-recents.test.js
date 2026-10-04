// ==================== scenario-recents.test.js — 场景：后台多任务 3D 卡片流 ====================
//
// 闪屏修复轮确立的核心契约在这里做无头回归：
//   · 历史栈语义（置顶去重 / 上限 10）
//   · keyed 卡片复用 —— 顺序变化只重排，卡片 DOM 节点原样保留（预览 iframe 零重建）
//   · 单卡上滑删除 —— 就地修剪（prune）而非 innerHTML 全量重建，其余卡 identity 不变
//   · 3D 空间差分量化档位 —— transform 每帧写、blur 0.5px 桶、zIndex/opacity/shadow 跨档才写
//   · 焦点卡点按直接几何展开启动（指哪打哪）
//   · 全部清除波浪顺程收尾归零

import { describe, test, expect, beforeAll, vi } from 'vitest';
import { bootDesktop, sleep } from './scenario-helpers.js';

let W;
let recent;
let deck;

const pe = (el, type, x, y, extra = {}) =>
  el.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY: y, ...extra,
  }));

const cardByAppId = (id) => deck.querySelector(`.recent-app-card[data-app-id="${id}"]`);

beforeAll(async () => {
  W = await bootDesktop();
  recent = await import('../ios-desktop/js/recent-apps.js');
  deck = document.getElementById('recentCardsDeck');
  W.__lockTest.instantUnlock();
  // happy-dom 的 setPointerCapture 对合成 pointerId 可能抛异常 —— 测试层替身
  deck.setPointerCapture = () => {};
});

describe('场景：后台多任务', () => {
  test('历史栈语义：置顶去重 + 上限 10 条（弹出最老项）', () => {
    // 初始列表：['msg','game2048','settings','camera','photo','music','weather']
    recent.recordAppOpened('msg');
    let list = recent.getRecentAppsList();
    expect(list[0]).toBe('msg');
    expect(list.filter((id) => id === 'msg').length).toBe(1); // 去重置顶
    expect(list.length).toBe(7);

    for (const id of ['a1', 'a2', 'a3', 'a4']) recent.recordAppOpened(id);
    list = recent.getRecentAppsList();
    expect(list.length).toBe(10); // 11 → 弹出最老的 'weather'
    expect(list.includes('weather')).toBe(false);

    recent.recordAppOpened('a5'); // 第 11 条 → 弹出当前最老的 'music'
    list = recent.getRecentAppsList();
    expect(list.length).toBe(10);
    expect(list[0]).toBe('a5');
    expect(list.includes('music')).toBe(false);
    expect(list.includes('a1')).toBe(true); // 较新的注入项仍在
  });

  test('openRecentApps：卡片数量/顺序与历史栈一致，操作栏可见，焦点卡居中', async () => {
    recent.openRecentApps();
    await sleep(30); // rAF 入场帧

    const overlay = document.getElementById('recentAppsOverlay');
    expect(overlay.classList.contains('active')).toBe(true);

    const list = recent.getRecentAppsList();
    const cards = Array.from(deck.querySelectorAll('.recent-app-card'));
    expect(cards.length).toBe(list.length);
    cards.forEach((c, i) => {
      expect(c.dataset.appId).toBe(list[i]);
      expect(c.dataset.idx).toBe(String(i));
    });
    expect(document.getElementById('recentActionsRow').style.display).toBe('flex');

    // 焦点卡（scrollOffset=0 → idx0）3D 原点档位
    expect(cards[0].style.transform).toBe('translate3d(0.0px, 0px, 0.0px) scale(1.000) rotateY(0.0deg)');
    expect(cards[0].style.filter).toBe('none');
    expect(cards[0].style.zIndex).toBe('100');
  });

  test('差分量化档位：拖 210px → 真实视口步长精确落位 + blur 1px 桶', async () => {
    const cards = Array.from(deck.querySelectorAll('.recent-app-card'));

    // deck 横向拖拽 210px（CARD_STEP_PX）→ scrollOffset=1；拟人化分帧
    // （帧间隔 60ms → 释放速度 ≈ -1.2px/ms，惯性投影不越卡，纯位移判定）
    pe(cards[0], 'pointerdown', 300, 400);
    await sleep(50);
    pe(cards[0], 'pointermove', 230, 400); // dx=-70
    await sleep(60);
    pe(cards[0], 'pointermove', 160, 400); // dx=-140
    await sleep(60);
    pe(cards[0], 'pointermove', 90, 400);  // dx=-210
    await sleep(80);
    pe(cards[0], 'pointerup', 90, 400);
    await sleep(600); // 惯性吸附动画收敛

    // 吸附后 scrollOffset=1：idx0 卡 delta=-1 → 真实视口等比步长
    // stepPx = round(181 * 0.86) = 156（412×915 视口 → previewW=181）
    const focused = deck.querySelectorAll('.recent-app-card')[0];
    expect(focused.style.transform).toContain('-156.0px');
    // 景深虚化桶：absDelta=1 → blurPx=1.375 → 1px 桶 → 1
    expect(focused.style.filter).toBe('blur(1px)');
    // zIndex 取整差分：100-12=88；opacity 两位小数：0.80
    expect(focused.style.zIndex).toBe('88');
    expect(focused.style.opacity).toBe('0.80');
  });

  test('keyed 复用：历史栈重排后卡片节点原样保留（iframe 零重建契约）', async () => {
    // 重排历史：把列表末项置顶
    const list = recent.getRecentAppsList();
    const moved = list[list.length - 1];
    const nodeBefore = cardByAppId(moved);
    const otherBefore = cardByAppId(list[0]);
    expect(nodeBefore).toBeTruthy();

    recent.recordAppOpened(moved);
    recent.openRecentApps();
    await sleep(30);

    expect(cardByAppId(moved)).toBe(nodeBefore);          // 同一节点 —— 未重建
    expect(cardByAppId(list[0])).toBe(otherBefore);        // 其余卡同样保留
    expect(cardByAppId(moved).dataset.idx).toBe('0');      // 仅重排索引
  });

  test('单卡上滑删除：就地修剪 —— 被删卡摘除，其余卡 identity 不变', async () => {
    recent.openRecentApps();
    await sleep(30);

    const list = recent.getRecentAppsList();
    const victimId = list[list.length - 1];
    const keepIds = list.slice(0, -1);
    const keepNodes = new Map(keepIds.map((id) => [id, cardByAppId(id)]));
    const victim = cardByAppId(victimId);

    // 单卡上滑：pointerdown 在卡上 → 垂直拖 -100px → 释放（cardStartY=-100 < -75 判删）
    pe(victim, 'pointerdown', 206, 400);
    pe(victim, 'pointermove', 206, 360);
    pe(victim, 'pointermove', 206, 300);
    pe(victim, 'pointerup', 206, 300);

    await vi.waitFor(() => {
      expect(cardByAppId(victimId)).toBeNull(); // 220ms 飞出后 prune 摘除
    }, { timeout: 3000, interval: 50 });

    const pruned = recent.getRecentAppsList();
    expect(pruned.includes(victimId)).toBe(false);
    // 其余卡片原节点保留（零重建 —— 预览 iframe 存活）
    for (const [id, node] of keepNodes) {
      expect(cardByAppId(id)).toBe(node);
      expect(node.isConnected).toBe(true);
    }
    // data-idx 重排连续
    Array.from(deck.querySelectorAll('.recent-app-card')).forEach((c, i) => {
      expect(c.dataset.idx).toBe(String(i));
    });
  });

  test('焦点卡点按 → 从卡片几何直接展开启动（指哪打哪），后台自动收起', async () => {
    recent.openRecentApps();
    await sleep(30);
    const focusedAppId = recent.getRecentAppsList()[0];
    const card = cardByAppId(focusedAppId);

    pe(card, 'pointerdown', 206, 400);
    pe(card, 'pointerup', 206, 400); // 轻点（dx=dy=0 → launchAppDirectFromCard）

    await vi.waitFor(() => {
      expect(W.__state.isOpen).toBe(true);
    }, { timeout: 4000, interval: 40 });
    expect(W.__state.currentApp.id).toBe(focusedAppId);

    await vi.waitFor(() => {
      expect(document.getElementById('recentAppsOverlay').classList.contains('active')).toBe(false);
    }, { timeout: 3000, interval: 40 });
  });

  test('全部清除：波浪顺程后历史栈与卡片归零，空状态文案在场', async () => {
    W.__state.isOpen = false; // 直启场景遗留的打开态不参与本场景
    recent.openRecentApps();
    await sleep(30);

    document.getElementById('recentClearAllBtn').dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => {
      expect(recent.getRecentAppsList().length).toBe(0);
    }, { timeout: 5000, interval: 60 });
    await vi.waitFor(() => {
      expect(document.getElementById('recentAppsOverlay').classList.contains('active')).toBe(false);
    }, { timeout: 3000, interval: 60 });
    expect(deck.querySelector('.recent-empty-state')).toBeTruthy();
    expect(document.getElementById('recentActionsRow').style.display).toBe('none');
  });
});
