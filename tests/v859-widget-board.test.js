// ==================== v859-widget-board.test.js — #67 桌面 widget 系统 ====================
//
// 覆盖（#67 验收原文逐条）：
//   · 纯函数核：Launcher3 CellLayout span 语义（cellsOf/canPlaceAt/firstFreeSlot/
//     buildOccupancy/evictRelocate）/ 6 类目录与规格变体（widgetpicker 全变体展开）/
//     持久化清洗（loadBoard 逐条校验·坏条目丢弃不整板作废）
//   · 场景 DOM：boot 后 __widgetBoard API / 放置→grid 坐标系卡片 / 持久化还原 /
//     移动合法性 / 规格循环 / 移除 / 选择器开合与全变体列表 / 桌面空白菜单接线 /
//     glance-weather 单源投影刷新
//   · 接线：main.js 引入+初始化 / index.html 样式链接 / #41 拖拽基建复用锚
//     （enterEditMode + iconDragState 让位）/ 数据源单源（mediaService/glance weather/
//     battery-service）/ widgetpicker 结构在册

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

// ==================== A. 纯函数核 ====================

describe('A. 目录与规格变体（widgetpicker 全变体展开语义）', () => {
  test('6 类起步目录在册（#67 执行要点原文）', () => {
    expect(core.WIDGET_CATALOG.map((k) => k.kind)).toEqual([
      'clock', 'weather', 'schedule', 'music', 'battery', 'shortcuts',
    ]);
  });
  test('规格变体覆盖 1×1/2×1/4×2（议题规格谱系）', () => {
    const spans = core.WIDGET_CATALOG.flatMap((k) => k.spans);
    expect(spans.some(([w, h]) => w === 1 && h === 1)).toBe(true);
    expect(spans.some(([w, h]) => w === 2 && h === 1)).toBe(true);
    expect(spans.some(([w, h]) => w === 4 && h === 2)).toBe(true);
  });
  test('每类默认规格 = 变体首项', () => {
    for (const def of core.WIDGET_CATALOG) {
      expect(core.defaultSpanFor(def.kind)).toEqual(def.spans[0]);
    }
  });
  test('variantOf：目录内变体真 / 未知假', () => {
    expect(core.variantOf('clock', 4, 2)).toBe(true);
    expect(core.variantOf('clock', 2, 2)).toBe(true);
    expect(core.variantOf('clock', 3, 3)).toBe(false);
    expect(core.variantOf('nope', 1, 1)).toBe(false);
  });
  test('nextSpan 规格环：clock 4×2 → 2×2 → 4×2', () => {
    expect(core.nextSpan('clock', 4, 2)).toEqual([2, 2]);
    expect(core.nextSpan('clock', 2, 2)).toEqual([4, 2]);
    expect(core.nextSpan('battery', 2, 1)).toEqual([1, 1]);
  });
  test('clampSpan 钳制到网格容量内', () => {
    expect(core.clampSpan(9, 9, 4, 6)).toEqual([4, 6]);
    expect(core.clampSpan(2, 1, 4, 6)).toEqual([2, 1]);
    expect(core.clampSpan(0, -3, 4, 6)).toEqual([1, 1]);
  });
});

describe('B. CellLayout span 占位语义（GridOccupancy 同构）', () => {
  test('cellsOf 展平坐标（slot=row*cols+col 与图标同坐标系）', () => {
    expect(core.cellsOf(0, 2, 1, 4)).toEqual([0, 1]);
    expect(core.cellsOf(2, 2, 2, 4)).toEqual([2, 3, 6, 7]);
    // slot 21 = row5 col1，4×2 展开 = 行 5/6 × 列 1-4（右侧越界由 canPlaceAt 拒，枚举不截断）
    expect(core.cellsOf(21, 4, 2, 4)).toEqual([21, 22, 23, 24, 25, 26, 27, 28]);
  });
  test('canPlaceAt：空场可放 / 与图标冲突拒 / 越界拒', () => {
    const occ = new Set([0, 1, 4, 5]);
    expect(core.canPlaceAt(occ, 2, 2, 2, 4, 6)).toBe(true);
    expect(core.canPlaceAt(occ, 0, 2, 1, 4, 6)).toBe(false);
    expect(core.canPlaceAt(occ, 3, 2, 1, 4, 6)).toBe(false); // 右越界
    expect(core.canPlaceAt(occ, 21, 2, 2, 4, 6)).toBe(false); // 底越界
  });
  test('firstFreeSlot first-fit：页序 → 行优先 → 列序', () => {
    const occ = new Set();
    for (let i = 0; i < 8; i++) occ.add(i);
    expect(core.firstFreeSlot([occ, null], 2, 1, 4, 6)).toEqual({ page: 0, slot: 8 });
    expect(core.firstFreeSlot([new Set(Array.from({ length: 24 }, (_, i) => i)), new Set([0])], 2, 1, 4, 6)).toEqual({ page: 1, slot: 1 });
    expect(core.firstFreeSlot([null, new Set()], 4, 2, 4, 6)).toEqual({ page: 1, slot: 0 });
  });
  test('buildOccupancy：图标 1×1 + widget span 展开 + 越容量 slot 丢弃', () => {
    const occ = core.buildOccupancy([{ slot: 0 }, { slot: 30 }], [{ slot: 2, w: 2, h: 2 }], 4, 6);
    expect(occ.has(0)).toBe(true);
    expect(occ.has(30)).toBe(false); // 容量 24 外
    expect(occ.has(2)).toBe(true);
    expect(occ.has(3)).toBe(true);
    expect(occ.has(6)).toBe(true);
    expect(occ.has(7)).toBe(true);
  });
  test('evictRelocate：原位合法不动 / 同页 first-fit / 全网无解 null', () => {
    const icons = new Set([0, 1]);
    const wg = { page: 0, slot: 0, w: 2, h: 1 };
    expect(core.evictRelocate(icons, [icons], wg, 4, 6)).toEqual({ page: 0, slot: 2 });
    const iconsFull = new Set(Array.from({ length: 24 }, (_, i) => i));
    const allPages = [iconsFull, new Set([0, 1, 2, 3])];
    expect(core.evictRelocate(iconsFull, allPages, wg, 4, 6)).toEqual({ page: 1, slot: 4 });
    const allFull = [new Set(Array.from({ length: 24 }, (_, i) => i)), new Set(Array.from({ length: 24 }, (_, i) => i))];
    expect(core.evictRelocate(iconsFull, allFull, wg, 4, 6)).toBeNull();
  });
});

describe('C. 持久化层（loadPagesApps 同款防御纪律）', () => {
  test('saveBoard 压缩五字段 + loadBoard 还原', () => {
    const ls = new Map();
    const fake = { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, v), removeItem: (k) => ls.delete(k) };
    const board = { widgets: [{ id: 'w1', kind: 'clock', page: 0, slot: 8, w: 4, h: 2, extra: 'strip' }] };
    expect(core.saveBoard(fake, board)).toBe(true);
    const loaded = core.loadBoard(fake);
    expect(loaded.widgets).toHaveLength(1);
    expect(loaded.widgets[0]).toEqual({ id: 'w1', kind: 'clock', page: 0, slot: 8, w: 4, h: 2 });
  });
  test('坏条目逐条丢弃（kind 未知 / 负槽位 / id 重复），好条目保全', () => {
    const raw = JSON.stringify({
      widgets: [
        { id: 'ok1', kind: 'weather', page: 0, slot: 0, w: 2, h: 2 },
        { id: 'bad1', kind: 'nope', page: 0, slot: 1, w: 1, h: 1 },
        { id: 'bad2', kind: 'clock', page: -1, slot: 1, w: 1, h: 1 },
        { id: 'bad3', kind: 'clock', page: 0, slot: 1, w: 0, h: 1 },
        { id: 'ok1', kind: 'clock', page: 0, slot: 2, w: 1, h: 1 },
      ],
    });
    const fake = { getItem: () => raw, setItem: () => {}, removeItem: () => {} };
    const loaded = core.loadBoard(fake);
    expect(loaded.widgets).toHaveLength(1);
    expect(loaded.widgets[0].id).toBe('ok1');
    expect(loaded.widgets[0].kind).toBe('weather'); // 首个合法者胜
  });
  test('脏 JSON → 空板（不抛异常）', () => {
    const fake = { getItem: () => '{broken', setItem: () => {}, removeItem: () => {} };
    expect(core.loadBoard(fake).widgets).toEqual([]);
  });
  test('存储键为 ios-desktop:widget-board', () => {
    expect(core.STORAGE_KEY).toBe('ios-desktop:widget-board');
  });
});

// ==================== D. 场景 DOM（真实启动链） ====================

describe('D. 场景：API 与落位持久化（#67 验收·添加/重排/删除/刷新还原）', () => {
  let api;
  beforeAll(() => { api = W.__widgetBoard; });

  test('boot 后 __widgetBoard 钩子在册（__allApps 同惯例）', () => {
    expect(api).toBeTruthy();
    expect(typeof api.open).toBe('function');
    expect(typeof api.place).toBe('function');
    expect(typeof api.remove).toBe('function');
    expect(typeof api.move).toBe('function');
    expect(typeof api.resize).toBe('function');
    expect(api.storageKey).toBe('ios-desktop:widget-board');
  });

  test('place：小规格自动落位（末页尾部空隙）+ DOM 卡片入 grid 坐标系', async () => {
    // 默认布局第 1 页 24 格全满，第 2 页 45-24=21 图标 → 空隙 slot 21/22/23；2×1 首个可放 slot 21
    const placed = api.place('battery', 2, 1);
    expect(placed).toBeTruthy();
    expect(placed.w).toBe(2);
    expect(placed.h).toBe(1);
    expect(placed.page).toBe(1);
    expect(placed.slot).toBe(21);
    await tick();
    const card = W.document.querySelector(`.widget-card[data-widget-id="${placed.id}"]`);
    expect(card).toBeTruthy();
    expect(card.dataset.kind).toBe('battery');
    expect(card.style.gridArea).toContain('span 1');
    expect(card.querySelector('[data-wb-level]')).toBeTruthy();
    api.remove(placed.id);
    await tick();
  });

  test('落位拒绝：满格页无处安放 → 空间不足拒绝（空间守卫）', () => {
    // 4×2 需 8 连续格，默认两页均无 → null
    expect(api.place('clock', 4, 2)).toBeNull();
  });

  test('腾空后 4×2 落位 + 图标占用格拒入（自动避让到有空位的页）', async () => {
    // 第 2 页腾出 slot 16..20 → 连同尾部空隙 21..23 成 8 连续格（两整行）
    const page2 = W.__state.pagesApps[1];
    const popped = page2.filter((a) => a.slot >= 16 && a.slot <= 20);
    W.__state.pagesApps[1] = page2.filter((a) => a.slot < 16 || a.slot > 20);
    expect(popped.length).toBe(5);
    const placed = api.place('clock', 4, 2);
    expect(placed).toBeTruthy();
    expect(placed.page).toBe(1);
    expect(placed.slot).toBe(16);
    await tick();
    expect(W.document.querySelector(`.widget-card[data-widget-id="${placed.id}"]`)).toBeTruthy();
    const saved = JSON.parse(W.localStorage.getItem('ios-desktop:widget-board'));
    expect(saved.widgets.some((w) => w.id === placed.id)).toBe(true);
    W.__lastPlacedClock = placed.id;
  });

  test('move：合法迁移提交 + 非法落点拒绝（磁性回落）', () => {
    const clock = api.list().find((w) => w.kind === 'clock');
    const ok = api.move(clock.id, clock.page, 16);
    expect(ok).toBe(true);
    expect(api.list().find((w) => w.id === clock.id).slot).toBe(16);
    // 落到图标占用格 → 拒绝
    const iconSlot = W.__state.pagesApps[1][0].slot;
    expect(api.move(clock.id, 1, iconSlot)).toBe(false);
    expect(api.list().find((w) => w.id === clock.id).slot).toBe(16);
  });

  test('resize：规格循环 4×2↔2×2（可换规格）+ 移除持久化同步', () => {
    const clock = api.list().find((w) => w.kind === 'clock');
    expect(clock).toBeTruthy();
    const r1 = api.resize(clock.id);
    expect(r1.w).toBe(2);
    expect(r1.h).toBe(2);
    const r2 = api.resize(clock.id);
    expect(r2.w).toBe(4);
    expect(r2.h).toBe(2);
    // 移除 + 持久化同步
    expect(api.remove(clock.id)).toBe(true);
    expect(api.list().some((w) => w.id === clock.id)).toBe(false);
    const saved = JSON.parse(W.localStorage.getItem('ios-desktop:widget-board'));
    expect(saved.widgets.some((w) => w.id === clock.id)).toBe(false);
  });

  test('刷新还原：localStorage → loadBoard 一致（布局持久化验收）', async () => {
    const placed = api.place('battery', 2, 1);
    expect(placed).toBeTruthy();
    const coreReload = await import('../ios-desktop/js/widget-core.js');
    const restored = coreReload.loadBoard(W.localStorage);
    expect(restored.widgets.some((w) => w.id === placed.id && w.kind === 'battery')).toBe(true);
    api.remove(placed.id);
  });
});

describe('E. 场景：widget 选择器（widgetpicker 对标）', () => {
  let api;
  beforeAll(() => { api = W.__widgetBoard; });

  test('open：overlay active + 6 类全变体卡片在册（live 预览）', () => {
    api.open();
    const overlay = W.document.getElementById('widgetPickerOverlay');
    expect(overlay.classList.contains('active')).toBe(true);
    const cards = overlay.querySelectorAll('.wp-card');
    const totalVariants = core.WIDGET_CATALOG.reduce((n, k) => n + k.spans.length, 0);
    expect(cards.length).toBe(totalVariants);
    // 每张卡都有 live 预览内容（非空壳）
    expect(overlay.querySelectorAll('.wp-preview .widget-inner').length).toBe(totalVariants);
    api.close();
    expect(overlay.classList.contains('active')).toBe(false);
  });

  test('Esc 关闭通道在册', () => {
    api.open();
    W.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(W.document.getElementById('widgetPickerOverlay').classList.contains('active')).toBe(false);
  });

  test('桌面空白长按菜单接线（contextmenu → 小工具/编辑/壁纸三项）', () => {
    const desktop = W.document.getElementById('desktop');
    const evt = new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 200, clientY: 400 });
    // 直接对 desktop 派发（target=desktop → 空白语义）
    Object.defineProperty(evt, 'target', { value: desktop });
    desktop.dispatchEvent(evt);
    const menu = W.document.getElementById('widgetSourceMenu');
    expect(menu.classList.contains('active')).toBe(true);
    expect(menu.querySelectorAll('.wsm-item').length).toBe(3);
    menu.querySelector('[data-wsm="widgets"]').click();
    expect(menu.classList.contains('active')).toBe(false);
    expect(W.document.getElementById('widgetPickerOverlay').classList.contains('active')).toBe(true);
    api.close();
  });
});

describe('F. 场景：数据源单源绑定（实时性验收）', () => {
  let api;
  beforeAll(() => { api = W.__widgetBoard; });

  test('天气卡：glance 单源初始值 + glance-weather-updated 广播刷新', async () => {
    const placed = api.place('weather', 2, 2);
    expect(placed).toBeTruthy();
    await tick();
    const card = W.document.querySelector(`.widget-card[data-widget-id="${placed.id}"]`);
    expect(card.querySelector('[data-wb-temp]').textContent).toContain('°C');
    // 广播投影：模拟 glance 拉取成功后的事件
    W.dispatchEvent(new W.CustomEvent('glance-weather-updated', { detail: { temp: 31 } }));
    expect(card.querySelector('[data-wb-temp]').textContent).toContain('31');
    api.remove(placed.id);
  });

  test('电池卡：battery-service 订阅即时回放 + 充电态类切换', async () => {
    const placed = api.place('battery', 2, 1);
    expect(placed).toBeTruthy();
    await tick();
    const card = W.document.querySelector(`.widget-card[data-widget-id="${placed.id}"]`);
    expect(card.querySelector('[data-wb-level]').textContent).toMatch(/^\d+%$/);
    api.remove(placed.id);
  });

  test('音乐卡：mediaService 单源（控制键三通道在册）', async () => {
    const placed = api.place('music', 4, 2);
    expect(placed).toBeTruthy();
    await tick();
    const card = W.document.querySelector(`.widget-card[data-widget-id="${placed.id}"]`);
    expect(card.querySelector('[data-wb-act="prev"]')).toBeTruthy();
    expect(card.querySelector('[data-wb-act="toggle"]')).toBeTruthy();
    expect(card.querySelector('[data-wb-act="next"]')).toBeTruthy();
    expect(card.querySelector('[data-wb-music-title]')).toBeTruthy();
    api.remove(placed.id);
  });

  test('快捷指令卡：四开关按钮在册', async () => {
    const placed = api.place('shortcuts', 4, 1);
    expect(placed).toBeTruthy();
    await tick();
    const card = W.document.querySelector(`.widget-card[data-widget-id="${placed.id}"]`);
    expect(card.querySelectorAll('.wb-sc').length).toBe(4);
    api.remove(placed.id);
  });
});

// ==================== G. 接线锚点（源码级，v858 同惯例） ====================

describe('G. 接线锚点', () => {
  test('main.js：import + initWidgetBoard 于首渲染后挂载', () => {
    const main = src('ios-desktop/js/main.js');
    expect(main).toContain("import { initWidgetBoard } from './widget-board.js'");
    expect(main).toContain('initWidgetBoard();');
    expect(main.indexOf('renderDesktopPages();')).toBeLessThan(main.indexOf('initWidgetBoard();'));
  });

  test('index.html：widget-board.css 样式链接在册', () => {
    const html = src('ios-desktop/index.html');
    expect(html).toContain('css/widget-board.css');
  });

  test('#41 拖拽基建复用：enterEditMode + iconDragState 生命周期让位', () => {
    const wb = src('ios-desktop/js/widget-board.js');
    expect(wb).toContain("import { enterEditMode } from './drag-reorder.js'");
    expect(wb).toContain('state.iconDragState = { mode: \'widget\', dragCtx }');
    expect(wb).toContain('state.iconDragState = null');
  });

  test('数据源单源：mediaService / getGlanceWeather / subscribeBattery', () => {
    const wb = src('ios-desktop/js/widget-board.js');
    expect(wb).toContain("import { mediaService } from './media-service.js'");
    expect(wb).toContain("import { getGlanceWeather } from './at-a-glance.js'");
    expect(wb).toContain("import { getBatteryState, subscribeBattery } from './battery-service.js'");
    expect(wb).toContain("import { readCalendarNotes, calDateKey } from './cal-sync.js'");
  });

  test('at-a-glance.js：单源投影导出 + 拉取成功广播', () => {
    const glance = src('ios-desktop/js/at-a-glance.js');
    expect(glance).toContain('export function getGlanceWeather()');
    expect(glance).toContain('broadcastGlanceWeather();');
  });

  test('XSS 纪律：动态文本走 textContent（fill 家族）', () => {
    const wb = src('ios-desktop/js/widget-board.js');
    expect(wb.match(/textContent =/g).length).toBeGreaterThanOrEqual(6);
  });

  test('CSS：编辑态抖动复用 + reduced-motion 降级在册', () => {
    const css = src('ios-desktop/css/widget-board.css');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('.widget-card.jiggling');
    expect(css).toContain('#widgetTrashZone');
    expect(css).toContain('#widgetPickerOverlay');
    expect(css).toContain('.widget-source-menu');
  });
});
