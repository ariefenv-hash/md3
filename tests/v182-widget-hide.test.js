// ==================== v182-widget-hide.test.js — #182 桌面 widget 逐项显隐（v10.66） ====================
//
// 覆盖（#182 R97 查证帖实施规格五项逐条）：
//   · 纯函数核：hidden 字段持久化往返（saveBoard 压缩六字段 / loadBoard 仅认严格 true，
//     非布尔脏值降级可见；旧板无 hidden 字段向后兼容 false）
//   · 场景 DOM：hide → 卡片消失 + 配置保留（hidden:true 落盘）+ 不占格（隐藏后同槽
//     可放新件）/ restore → first-fit 重新落位 / 全板无空位拒绝并保持隐藏
//   · picker「已隐藏」管理区：区头计数 + 逐项恢复钮（失败行留成功行消——重建闭环）
//   · 卡片长按菜单：隐藏/移除双通道并列 + Esc 收起
//   · 接线锚点：__widgetBoard 钩子扩展 / CSS 类在册（--md-* 令牌）/ 超越项归属注记在源
//
// 布局注记（v10.66 实测三页 4×6）：页0/页1 各 24 图标全满，页2 仅 4 图标——
// 「全板无空位」用例须以合成图标填满全部页空槽（fillBoard 助手），不依赖布局假设。

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bootDesktop } from './scenario-helpers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

// scheduleRender 走 rAF（happy-dom 由定时器驱动）—— DOM 断言前等一帧落定
const tick = () => new Promise((r) => setTimeout(r, 80));

let core;
let W; // 场景 window

beforeAll(async () => {
  // boot 先于模块 import（state.js←main.js 启动链依赖完整引导序，v858 同纪律）
  W = await bootDesktop();
  W.__lockTest.instantUnlock();
  core = await import('../ios-desktop/js/widget-core.js');
});

/** 把全部页的全部空槽（图标 + 可见 widget 之外）用合成图标填满 → 全板确无连续空位 */
function fillBoard(api) {
  const synth = [];
  W.__state.pagesApps.forEach((pg, p) => {
    const occ = new Set(pg.map((a) => a.slot));
    for (const wg of api.list()) {
      if (wg.hidden || wg.page !== p) continue;
      for (let dr = 0; dr < wg.h; dr++) for (let dc = 0; dc < wg.w; dc++) occ.add(wg.slot + dr * 4 + dc);
    }
    for (let k = 0; k < 24; k++) {
      if (!occ.has(k)) {
        const it = { id: `blk-${p}-${k}`, appId: 'blk', slot: k };
        pg.push(it);
        synth.push({ p, it });
      }
    }
  });
  return synth;
}

function unfillBoard(synth) {
  synth.forEach(({ p, it }) => {
    W.__state.pagesApps[p] = W.__state.pagesApps[p].filter((a) => a !== it);
  });
}

/** fresh contextmenu 事件（happy-dom 不接受同一 Event 对象二次 dispatch） */
function rclick(el, x = 120, y = 320) {
  el.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
}

// ==================== A. 纯函数核：hidden 持久化往返 ====================

describe('A. hidden 字段持久化（零新 localStorage 键，复用 widget-board 板）', () => {
  const mkStore = (raw) => {
    let v = raw;
    return {
      getItem: () => v,
      setItem: (_k, val) => { v = val; },
      removeItem: () => { v = null; },
    };
  };

  test('saveBoard 压缩六字段含 hidden 布尔 + loadBoard 往返一致', () => {
    const fake = mkStore(null);
    const board = {
      widgets: [
        { id: 'h1', kind: 'clock', page: 0, slot: 8, w: 4, h: 2, hidden: true },
        { id: 'v1', kind: 'battery', page: 1, slot: 3, w: 1, h: 1, hidden: false },
      ],
    };
    expect(core.saveBoard(fake, board)).toBe(true);
    const loaded = core.loadBoard(fake);
    expect(loaded.widgets).toHaveLength(2);
    expect(loaded.widgets[0]).toEqual({ id: 'h1', kind: 'clock', page: 0, slot: 8, w: 4, h: 2, hidden: true });
    expect(loaded.widgets[1]).toEqual({ id: 'v1', kind: 'battery', page: 1, slot: 3, w: 1, h: 1, hidden: false });
  });

  test('loadBoard 仅认严格 true：非布尔脏值降级可见（清洗不拒收）', () => {
    const raw = JSON.stringify({
      widgets: [
        { id: 'a', kind: 'clock', page: 0, slot: 0, w: 2, h: 2, hidden: 'yes' },
        { id: 'b', kind: 'clock', page: 0, slot: 2, w: 2, h: 2, hidden: 1 },
        { id: 'c', kind: 'clock', page: 0, slot: 4, w: 2, h: 2, hidden: null },
        { id: 'd', kind: 'clock', page: 0, slot: 6, w: 2, h: 2, hidden: true },
      ],
    });
    const loaded = core.loadBoard(mkStore(raw));
    expect(loaded.widgets.map((w) => w.hidden)).toEqual([false, false, false, true]);
  });

  test('旧板无 hidden 字段 → 向后兼容 false（升级零迁移）', () => {
    const raw = JSON.stringify({ widgets: [{ id: 'old', kind: 'weather', page: 0, slot: 0, w: 2, h: 2 }] });
    const loaded = core.loadBoard(mkStore(raw));
    expect(loaded.widgets[0].hidden).toBe(false);
  });
});

// ==================== B. 场景 DOM：hide / restore / 不占格 ====================

describe('B. 场景：隐藏→配置保留不占格→first-fit 恢复链（R97 查证帖规格 1/2）', () => {
  let api;
  beforeAll(() => {
    api = W.__widgetBoard;
    // 页1 取走末 4 图标（slot 20..23）开 2×1 试验窗（页0/页1 基线全满，页2 尾页空旷）
    const pg = W.__state.pagesApps[1];
    const popped = pg.filter((a) => a.slot >= 20 && a.slot <= 23);
    W.__state.pagesApps[1] = pg.filter((a) => a.slot < 20 || a.slot > 23);
    expect(popped.length).toBe(4);
  });

  test('hide：卡片消失 + 配置保留（hidden:true 落盘）+ hiddenList 在册', async () => {
    const placed = api.place('battery', 2, 1);
    expect(placed).toBeTruthy();
    expect(placed.page).toBe(1); // 页0满 → 页1 slot 20（页1 先于页2 扫描）
    expect(placed.slot).toBe(20);
    await tick();
    expect(W.document.querySelector(`.widget-card[data-widget-id="${placed.id}"]`)).toBeTruthy();
    expect(api.hide(placed.id)).toBe(true);
    await tick();
    expect(W.document.querySelector(`.widget-card[data-widget-id="${placed.id}"]`)).toBeFalsy();
    const inList = api.list().find((w) => w.id === placed.id);
    expect(inList).toBeTruthy(); // 配置保留（与 remove 配置销毁分野）
    expect(inList.hidden).toBe(true);
    expect(api.hiddenList().map((w) => w.id)).toEqual([placed.id]);
    const saved = JSON.parse(W.localStorage.getItem('ios-desktop:widget-board'));
    expect(saved.widgets.find((w) => w.id === placed.id).hidden).toBe(true);
    W.__hideA = placed.id;
  });

  test('隐藏件不占格：同槽可放新件（pageOccupancy 剔除 hidden）', () => {
    const b = api.place('battery', 2, 1);
    expect(b).toBeTruthy();
    expect(b.page).toBe(1);
    expect(b.slot).toBe(20); // 隐藏件 A 原槽 20-21，可放 = 不占格实证
    W.__hideB = b.id;
  });

  test('restore：first-fit 重新落位（隐藏语义的自然逆操作）', async () => {
    expect(api.restore(W.__hideA)).toBe(true);
    await tick();
    const a = api.list().find((w) => w.id === W.__hideA);
    expect(a.hidden).toBe(false);
    expect(a.page).toBe(1);
    expect(a.slot).toBe(22); // 空闲区 22-23（B 占 20-21）
    expect(W.document.querySelector(`.widget-card[data-widget-id="${W.__hideA}"]`)).toBeTruthy();
    const saved = JSON.parse(W.localStorage.getItem('ios-desktop:widget-board'));
    expect(saved.widgets.find((w) => w.id === W.__hideA).hidden).toBe(false);
  });

  test('restore 全板无空位 → 拒绝并保持隐藏（合成图标填满全部页）', async () => {
    expect(api.hide(W.__hideA)).toBe(true);
    const d = api.place('battery', 2, 1); // 占 22-23 → 页1 满
    expect(d).toBeTruthy();
    expect(d.slot).toBe(22);
    const synth = fillBoard(api); // 页2 空槽 4-23 等全填 → 全板确无 2 连格
    expect(api.restore(W.__hideA)).toBe(false);
    expect(api.list().find((w) => w.id === W.__hideA).hidden).toBe(true);
    unfillBoard(synth);
    api.remove(d.id); // 腾出 22-23 供 picker 恢复用例
  });

  test('拖垃圾桶删除通道不受影响（remove 语义回归锚）', () => {
    expect(api.remove(W.__hideB)).toBe(true);
    expect(api.list().some((w) => w.id === W.__hideB)).toBe(false); // 配置销毁
  });
});

// ==================== C. picker「已隐藏」管理区 + 卡片长按菜单 ====================

describe('C. 场景：picker 已隐藏管理区 + 卡片长按菜单（R97 查证帖规格 2/3）', () => {
  let api;
  beforeAll(() => { api = W.__widgetBoard; });

  test('管理区：区头计数 + 逐项恢复钮；失败行留，成功行消（重建闭环）', async () => {
    // 现场：A 隐藏（B 用例已删）→ 打开 picker
    expect(api.hiddenList().map((w) => w.id)).toEqual([W.__hideA]);
    api.open();
    const overlay = W.document.getElementById('widgetPickerOverlay');
    expect(overlay.classList.contains('active')).toBe(true);
    const head = overlay.querySelector('.wp-hidden-head');
    expect(head).toBeTruthy();
    expect(head.textContent).toBe('已隐藏（1）');
    const row = overlay.querySelector(`.wp-hidden-row[data-widget-id="${W.__hideA}"]`);
    expect(row).toBeTruthy();
    expect(row.querySelector('.wp-hidden-name').textContent).toContain('电池');
    expect(row.querySelector('.wp-hidden-name').textContent).toContain('2×1');
    // 失败路径：blocker 占 20-21 + 合成图标填满其余页 → 恢复拒绝 → 行留（列表不重建）
    const blocker = api.place('battery', 2, 1);
    expect(blocker.slot).toBe(20);
    const synth = fillBoard(api);
    expect(api.restore(W.__hideA)).toBe(false);
    expect(overlay.querySelector(`.wp-hidden-row[data-widget-id="${W.__hideA}"]`)).toBeTruthy();
    unfillBoard(synth);
    api.remove(blocker.id);
    // 真按钮路径：空位回归 → 点击恢复 → 行消失（pickerActive 重建列表）
    const btn = overlay.querySelector(`.wp-hidden-row[data-widget-id="${W.__hideA}"] .wp-restore-btn`);
    expect(btn).toBeTruthy();
    btn.click();
    await tick();
    expect(overlay.querySelector('.wp-hidden-row')).toBeFalsy();
    expect(overlay.querySelector('.wp-hidden-head')).toBeFalsy(); // 空态不渲染区头
    expect(api.list().find((w) => w.id === W.__hideA).hidden).toBe(false);
    api.close();
  });

  test('卡片长按菜单：隐藏/移除双通道并列 + Esc 收起', async () => {
    // 现场：A 已恢复在页1 slot 20-21 → 空槽 22 起放一件作靶
    const e = api.place('battery', 1, 1);
    expect(e).toBeTruthy();
    expect(e.slot).toBe(22);
    await tick();
    const card = W.document.querySelector(`.widget-card[data-widget-id="${e.id}"]`);
    expect(card).toBeTruthy();
    rclick(card);
    const menu = W.document.getElementById('widgetCardMenu');
    expect(menu).toBeTruthy();
    expect(menu.classList.contains('active')).toBe(true);
    expect(menu.querySelectorAll('.wsm-item').length).toBe(2);
    expect(menu.querySelector('[data-wcm="hide"]')).toBeTruthy();
    expect(menu.querySelector('[data-wcm="remove"]')).toBeTruthy();
    // Esc 收起
    W.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu.classList.contains('active')).toBe(false);
    // 重开 → 点「隐藏」→ 配置保留
    rclick(card, 130, 330);
    expect(menu.classList.contains('active')).toBe(true);
    menu.querySelector('[data-wcm="hide"]').click();
    await tick();
    expect(menu.classList.contains('active')).toBe(false);
    expect(api.list().find((w) => w.id === e.id)?.hidden).toBe(true);
    expect(W.document.querySelector(`.widget-card[data-widget-id="${e.id}"]`)).toBeFalsy();
    W.__hideE = e.id;
  });

  test('卡片长按菜单「移除」：配置销毁（与隐藏分野）', async () => {
    const e = api.list().find((w) => w.id === W.__hideE);
    expect(e?.hidden).toBe(true);
    const f = api.place('battery', 1, 1); // 空槽 22（隐藏件 e 原槽不占格）
    expect(f).toBeTruthy();
    expect(f.slot).toBe(22);
    await tick();
    const card = W.document.querySelector(`.widget-card[data-widget-id="${f.id}"]`);
    rclick(card, 80, 260);
    const menu = W.document.getElementById('widgetCardMenu');
    menu.querySelector('[data-wcm="remove"]').click();
    await tick();
    expect(api.list().some((w) => w.id === f.id)).toBe(false); // splice 出板
    expect(api.list().find((w) => w.id === W.__hideE)?.hidden).toBe(true); // 互不波及
  });

  test('回归锁：右键弹菜单后 up 落在菜单（window 级释放）→ 计时器必清，无自发拖拽', async () => {
    // e2e-v182 实录缺陷：菜单弹在指针处 → up 被菜单吃掉 → 卡片收不到 pointerup
    // → 380ms 计时器到点自发入拖拽+编辑态。修复 = window 级释放监听 + 幂等守卫。
    const g = api.place('battery', 1, 1);
    expect(g).toBeTruthy();
    await tick();
    const card = W.document.querySelector(`.widget-card[data-widget-id="${g.id}"]`);
    card.dispatchEvent(new W.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 40, clientY: 240, pointerId: 7, button: 2 }));
    rclick(card, 40, 240); // contextmenu：菜单在指针处弹出（up 将落在菜单上）
    const menu = W.document.getElementById('widgetCardMenu');
    expect(menu.classList.contains('active')).toBe(true);
    // up 只达 window（真实浏览器里被菜单元素吃掉，卡片监听收不到）
    W.dispatchEvent(new W.MouseEvent('pointerup', { bubbles: true, cancelable: true, clientX: 40, clientY: 240, pointerId: 7, button: 2 }));
    await new Promise((r) => setTimeout(r, 450)); // > LONG_PRESS_MS 380
    expect(W.__state.isEditMode).toBe(false); // 未被拖入编辑态
    expect(W.__state.iconDragState).toBeFalsy(); // 无拖拽上下文
    expect(W.document.querySelector('.widget-ghost')).toBeFalsy(); // 无幽灵克隆
    // 收尾：Esc 关菜单 + 移除靶件
    W.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    api.remove(g.id);
    await tick();
  });
});

// ==================== D. 接线锚点（源码级，v858 同惯例） ====================

describe('D. 接线锚点与超越项归属', () => {
  test('__widgetBoard 钩子扩展：hide/restore/hiddenList 三件在册', () => {
    const api = W.__widgetBoard;
    expect(typeof api.hide).toBe('function');
    expect(typeof api.restore).toBe('function');
    expect(Array.isArray(api.hiddenList())).toBe(true);
  });

  test('widget-board.js：双通道函数 + 菜单 DOM + 管理区在源', () => {
    const wb = src('ios-desktop/js/widget-board.js');
    expect(wb).toContain('function hideWidgetById');
    expect(wb).toContain('function restoreWidgetById');
    expect(wb).toContain("id = 'widgetCardMenu'");
    expect(wb).toContain('data-wcm="hide"');
    expect(wb).toContain('data-wcm="remove"');
    expect(wb).toContain("className = 'wp-hidden-head'");
    expect(wb).toContain("className = 'wp-restore-btn'");
    expect(wb).toContain('if (wg.hidden) continue'); // 自愈跳过隐藏件
    expect(wb).toContain('w.id !== excludeId && !w.hidden'); // pageOccupancy 剔除
    expect(wb).toContain('w.page === pageIdx && !w.hidden'); // 渲染过滤
  });

  test('widget-core.js：hidden 仅认严格 true + saveBoard 布尔压缩', () => {
    const wc = src('ios-desktop/js/widget-core.js');
    expect(wc).toContain('hidden: wg.hidden === true');
    expect(wc).toContain('hidden: !!wg.hidden');
  });

  test('CSS：已隐藏管理区样式在册 + --md-* 令牌优先（#179 准入①）', () => {
    const css = src('ios-desktop/css/widget-board.css');
    expect(css).toContain('.wp-hidden-head');
    expect(css).toContain('.wp-hidden-row');
    expect(css).toContain('.wp-restore-btn');
    expect(css).toContain('var(--md-primary');
    expect(css).toContain('var(--md-on-primary');
  });

  test('超越项归属注记在源：AppWidgetHost 跨进程语义放弃维持（#67 自创范式延续）', () => {
    const wb = src('ios-desktop/js/widget-board.js');
    expect(wb).toContain('AppWidgetHost');
    expect(wb).toContain('自创范式');
    expect(wb).toContain('NightSky');
  });
});
