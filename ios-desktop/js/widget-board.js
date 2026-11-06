// ==================== widget-board.js — 桌面 widget 系统板（v8.59 #67） ====================
//
// Launcher3（lineage-24.0 / A17 基线）对标锚点：
//   · Workspace 长按空白 → WiderLayoutOptionsPopup（Widgets/Wallpaper/Settings 三项）
//     → 本模块桌面空白 contextmenu 菜单同构
//   · WidgetPicker（A17 widgetpicker 模块）→ 底部 sheet + 全 span 变体条目（live 预览）
//   · 拖放落位 = #41 图标拖拽基建同构（幽灵克隆 + 格点吸附 + 占位校验 + 磁性回落），
//     手势解耦沿用 #41 生命周期让位（state.iconDragState 武装/解除，touchmove/mousedown
//     的 Live Pager 门卫按真值判断 —— 见 main.js 桌面滑动链）
//   · DeleteDropTarget（拖入垃圾桶删除）→ 编辑模式拖拽期底部垃圾桶条
//
// v10.20 #182 逐项显隐（NightSky PC 版「逐项独立开关」思路提取，超越项）：
//   · 卡片长按菜单「隐藏」＝ 配置保留、桌面消失（与 removeWidgetById 配置销毁
//     并列双通道）；AppWidgetHost 跨进程更新语义不适用网页宿主——#67 自创范式
//     延续，跨进程更新放弃维持
//   · hidden 件不占格（pageOccupancy 剔除），选择器「已隐藏」管理区逐项恢复＝
//     first-fit 重新落位（隐藏语义的自然逆操作）
//
// 数据层：独立存储 ios-desktop:widget-board（widget-core.js），与 state.pagesApps 图标
// 数据零侵入；碰撞自愈避让（图标拖拽/容量重排侵占 widget 格时 first-fit 迁移）。
//
// 模块纪律：动态文本一律 textContent（XSS 杜绝）；动画曲线全部引用 motion tokens
//（CSS 变量），绝无手写贝塞尔（motion.js 三正典）。

import { state } from './state.js';
import { dom } from './dom.js';
import { effGridCols, effGridRows } from './desktop-prefs.js';
import { ICONS } from './icons.js';
import { enterEditMode } from './drag-reorder.js';
import {
  showSystemToast, setDndActive, setBatterySaverActive,
} from './quick-settings.js';
import { setThemeMode, getResolvedTheme } from './theme-mode.js';
import { mediaService } from './media-service.js';
import { getBatteryState, subscribeBattery } from './battery-service.js';
import { readCalendarNotes, calDateKey } from './cal-sync.js';
// v10.20 #114：浮层触摸语义公约（Launcher3 WidgetsFullSheet 遮罩外收起，down 拍判定）
import { OutsideMode, createOutsideDismissMachine, declareTouchableRegions, isInsideTouchable } from './aosp/overlay-touch-policy.js';
import { getGlanceWeather } from './at-a-glance.js';
import {
  WIDGET_CATALOG, STORAGE_KEY, WIDGETS_MAX,
  resolveKind, defaultSpanFor, variantOf, nextSpan, clampSpan,
  cellsOf, canPlaceAt, firstFreeSlot, buildOccupancy,
  loadBoard, saveBoard, newWidgetId, evictRelocate,
} from './widget-core.js';

// ---- 本模块私有矢量图标（icons.js 缺位的四个，context-menu.js 内联 SVG 同惯例）----
const SVG_WIDGETS = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm13.5-1a3.5 3.5 0 0 1 3.5 3.5v.5h-2v-.5a1.5 1.5 0 0 0-3 0V16h-2v-.5A3.5 3.5 0 0 1 17.5 12zM13 17.5a3.5 3.5 0 0 1 3.5-3.5h.5v2h-.5a1.5 1.5 0 0 0 0 3H17v2h-.5A3.5 3.5 0 0 1 13 17.5zM22 17.5v.5h-2v-.5a1.5 1.5 0 0 0-1.5-1.5H18v-2h.5A3.5 3.5 0 0 1 22 17.5zM13 21v-2h2v2h-2z"/></svg>';
const SVG_PLAY = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const SVG_PREV = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 6h2v12H6V6zm12 0v12l-9-6 9-6z" transform="scale(-1,1) translate(-24,0)"/></svg>';
// v10.20 #182 卡片长按菜单图标（icons.js 缺位内联 SVG 同惯例）：visibility_off / delete
const SVG_EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>';
const SVG_TRASH = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';

/** 拖拽时长常量（与 bindIconEvents 同值：非编辑 380ms 长按 / 编辑 60ms 即拖） */
const LONG_PRESS_MS = 380;
const EDIT_PRESS_MS = 60;

let board = { widgets: [] };
let renderQueued = false;
let mo = null;
let pickerEl = null;
let pickerActive = false;
let menuEl = null;
// v10.20 #182：卡片长按菜单（隐藏/移除双通道）单例 + 目标 id
let cardMenuEl = null;
let cardMenuTargetId = null;
// v10.20 #114：微件选择器外部收起状态机（ensurePickerDOM 创建）+ 可触摸区声明
let pickerOutside = null;
const PICKER_TOUCHABLE = declareTouchableRegions(['.wp-sheet']);
let trashEl = null;
let dropOutlineEl = null;
let clockTimer = null;
let scheduleTimer = null;
let dragCtx = null; // 活跃拖拽上下文（widget 放置 / 编辑拖拽共用）

// ==================== 初始化 ====================

export function initWidgetBoard() {
  board = loadBoard();

  ensureMenuDOM();
  ensurePickerDOM();
  ensureTrashDOM();

  // 桌面空白长按菜单（contextmenu = 触屏长按 / 鼠标右键统一入口，与图标菜单同通道）
  if (dom.desktop) {
    dom.desktop.addEventListener('contextmenu', onDesktopContextMenu);
  }

  // 页面网格重建观察（renderDesktopPages 每次重建 .page-grid 子树 → widget 层跟随重挂）
  if (dom.desktopSlider) {
    mo = new MutationObserver(() => scheduleRender());
    mo.observe(dom.desktopSlider, { childList: true });
  }
  window.addEventListener('desktop-prefs-changed', () => scheduleRender());
  window.addEventListener('resize', () => scheduleRender(), { passive: true });

  // 数据源接线（一次性订阅，渲染器按在场卡片刷新）
  wireDataBindings();

  // 首挂渲染
  scheduleRender();

  // 测试/调试 API（e2e 与 vitest 场景钩子，__allApps 同惯例）
  window.__widgetBoard = {
    open: openWidgetPicker,
    close: closeWidgetPicker,
    isPickerOpen: () => pickerActive,
    place: placeWidget,
    remove: removeWidgetById,
    move: moveWidgetTo,
    resize: cycleSpan,
    hide: hideWidgetById,
    restore: restoreWidgetById,
    hiddenList: () => board.widgets.filter((w) => w.hidden).map((w) => ({ ...w })),
    list: () => board.widgets.map((w) => ({ ...w })),
    storageKey: STORAGE_KEY,
  };
}

// ==================== 渲染层 ====================

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderWidgetLayer();
  });
}

function gridMetrics(grid) {
  const cols = effGridCols();
  const rows = effGridRows();
  const rect = grid.getBoundingClientRect();
  const cs = getComputedStyle(grid);
  const padL = parseFloat(cs.paddingLeft) || 0;
  const padR = parseFloat(cs.paddingRight) || 0;
  const padT = parseFloat(cs.paddingTop) || 0;
  const padB = parseFloat(cs.paddingBottom) || 0;
  const gapX = parseFloat(cs.columnGap) || 0;
  const gapY = parseFloat(cs.rowGap) || 0;
  // 内容区几何（.page-grid 有顶部 112px 级安全区 padding —— 槽位数学必须扣掉，
  // 否则行映射整体上移；列同理）。v8.58 教训同源：几何一律实测而非近似。
  const innerW = Math.max(0, rect.width - padL - padR - (cols - 1) * gapX);
  const innerH = Math.max(0, rect.height - padT - padB - (rows - 1) * gapY);
  return {
    cols, rows, rect, padL, padT, gapX, gapY,
    cellW: innerW / cols,
    cellH: innerH / rows,
  };
}

/** 指针 → 页内槽位（不在网格内容区 → -1） */
function slotFromPoint(m, x, y) {
  const col = Math.floor((x - m.rect.left - m.padL) / (m.cellW + m.gapX));
  const row = Math.floor((y - m.rect.top - m.padT) / (m.cellH + m.gapY));
  if (col < 0 || col >= m.cols || row < 0 || row >= m.rows) return -1;
  return row * m.cols + col;
}

/** 指针命中的页索引（视口内可见网格 —— 分页滑动下恒为当前页），无 → -1 */
function pageFromPoint(x, y) {
  const grids = visibleGrids();
  for (let i = 0; i < grids.length; i++) {
    const r = grids[i].getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
  }
  return -1;
}

function visibleGrids() {
  return dom.desktopSlider ? Array.from(dom.desktopSlider.querySelectorAll('.page-grid')) : [];
}

/**
 * 全板渲染：widget 卡直接挂入 .page-grid（与图标同一 grid 坐标系 —— gridArea 跨格
 * 自动对齐，零二次坐标数学）；renderDesktopPages 每次重建网格 → MutationObserver
 * 触发本函数重挂。自愈避让：widget 矩形被图标占用格侵占（图标拖拽/容量重排后）→
 * evictRelocate 迁移；页数收缩后落页越界 → 全网 first-fit；全网无解 → 移除并播报。
 */
function renderWidgetLayer() {
  const grids = visibleGrids();
  const cols = effGridCols();
  const rows = effGridRows();
  if (!grids.length) return;

  // 自愈：先按最新网格规格钳制跨度，再解越界页/图标侵占
  let mutated = false;
  for (const wg of board.widgets) {
    const [w, h] = clampSpan(wg.w, wg.h, cols, rows);
    if (w !== wg.w || h !== wg.h) { wg.w = w; wg.h = h; mutated = true; }
  }
  for (let i = board.widgets.length - 1; i >= 0; i--) {
    const wg = board.widgets[i];
    // v10.20 #182：隐藏件不参与自愈（不可见不受图标侵占，恢复时 first-fit 重落位）
    if (wg.hidden) continue;
    if (wg.page >= grids.length) {
      const pagesOcc = grids.map((_, p) => pageOccupancy(p, cols, rows, wg.id));
      const hit = firstFreeSlot(pagesOcc, wg.w, wg.h, cols, rows);
      if (hit) { wg.page = hit.page; wg.slot = hit.slot; mutated = true; }
      else {
        board.widgets.splice(i, 1);
        mutated = true;
        showSystemToast('「' + (resolveKind(wg.kind)?.name || wg.kind) + '」小工具因无空位已移除');
      }
      continue;
    }
    const icons = iconOccupancy(wg.page, cols, rows);
    const relocated = evictRelocate(icons, grids.map((_, p) => pageOccupancy(p, cols, rows, wg.id)), wg, cols, rows);
    if (relocated) { wg.page = relocated.page; wg.slot = relocated.slot; mutated = true; }
  }
  if (mutated) persistAndBroadcast();

  grids.forEach((grid, pageIdx) => {
    // 陈旧卡清理（网格重建后为空集合；增量重渲染则移除重挂）
    grid.querySelectorAll(':scope > .widget-card').forEach((el) => el.remove());
    const widgets = board.widgets.filter((w) => w.page === pageIdx && !w.hidden);
    for (const wg of widgets) {
      grid.appendChild(createWidgetCard(wg, pageIdx));
    }
  });
}

/** 页面图标占用格（1×1 租户，slot 越容量丢弃） */
function iconOccupancy(pageIdx, cols, rows) {
  const items = (state.pagesApps[pageIdx] || []);
  return buildOccupancy(items, [], cols, rows);
}

/** 页面完整占用（图标 + 除 excludeId 外的 widget span 展开；hidden 件不占格——v10.20 #182） */
function pageOccupancy(pageIdx, cols, rows, excludeId) {
  const items = (state.pagesApps[pageIdx] || []);
  const wgs = board.widgets.filter((w) => w.page === pageIdx && w.id !== excludeId && !w.hidden);
  return buildOccupancy(items, wgs, cols, rows);
}

// ==================== 卡片构建与内容渲染 ====================

function createWidgetCard(wg, pageIdx) {
  const dragging = dragCtx && !dragCtx.pending && dragCtx.id === wg.id;
  const card = document.createElement('div');
  card.className = 'widget-card wb-kind-' + wg.kind
    + (state.isEditMode ? ' jiggling' : '')
    + (dragging ? ' widget-drag-src' : '');
  card.dataset.widgetId = wg.id;
  card.dataset.kind = wg.kind;
  card.dataset.page = pageIdx;
  card.dataset.slot = wg.slot;
  const row = Math.floor(wg.slot / effGridCols()) + 1;
  const col = (wg.slot % effGridCols()) + 1;
  card.style.gridArea = `${row} / ${col} / span ${wg.h} / span ${wg.w}`;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', resolveKind(wg.kind)?.name + '小工具');

  renderCardContent(card, wg);

  if (state.isEditMode) {
    const badge = document.createElement('div');
    badge.className = 'widget-remove-badge';
    badge.textContent = '×';
    badge.title = '移除小工具';
    badge.addEventListener('pointerdown', (e) => e.stopPropagation());
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      removeWidgetById(wg.id);
    });
    card.appendChild(badge);

    const grip = document.createElement('div');
    grip.className = 'widget-resize-grip';
    grip.title = '调整规格';
    grip.innerHTML = SVG_WIDGETS;
    grip.setAttribute('role', 'button');
    grip.setAttribute('aria-label', '调整规格');
    grip.addEventListener('pointerdown', (e) => e.stopPropagation());
    grip.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      cycleSpan(wg.id);
    });
    card.appendChild(grip);
  }

  bindWidgetCardEvents(card, wg);
  return card;
}

/** 内容渲染器（每类一个分支；动态文本全部 textContent） */
function renderCardContent(card, wg) {
  const inner = document.createElement('div');
  inner.className = 'widget-inner';
  switch (wg.kind) {
    case 'clock': {
      inner.innerHTML = `
        <div class="wb-clock">
          <div class="wb-clock-time" data-wb-clock>--:--</div>
          <div class="wb-clock-date" data-wb-date></div>
        </div>`;
      break;
    }
    case 'weather': {
      const w = getGlanceWeather();
      inner.innerHTML = `
        <div class="wb-weather">
          <div class="wb-weather-icon">${w.icon || ICONS.weather_sunny}</div>
          <div class="wb-weather-temp" data-wb-temp>${w.temp}°C</div>
          <div class="wb-weather-cond" data-wb-cond></div>
          <div class="wb-weather-aqi" data-wb-aqi></div>
        </div>`;
      inner.querySelector('[data-wb-cond]').textContent = w.condition || '';
      inner.querySelector('[data-wb-aqi]').textContent = w.aqi || '';
      break;
    }
    case 'schedule': {
      inner.innerHTML = `
        <div class="wb-schedule">
          <div class="wb-schedule-head"><span class="wb-schedule-ic">${ICONS.calendar_month}</span><span data-wb-sched-title>今日日程</span></div>
          <div class="wb-schedule-item" data-wb-sched-item></div>
        </div>`;
      fillSchedule(inner);
      break;
    }
    case 'music': {
      inner.innerHTML = `
        <div class="wb-music">
          <div class="wb-music-info">
            <div class="wb-music-title" data-wb-music-title>未在播放</div>
            <div class="wb-music-artist" data-wb-music-artist></div>
          </div>
          <div class="wb-music-controls">
            <button class="wb-mctrl" data-wb-act="prev" aria-label="上一首">${SVG_PREV}</button>
            <button class="wb-mctrl wb-mctrl-main" data-wb-act="toggle" aria-label="播放或暂停"><span data-wb-music-icon>${SVG_PLAY}</span></button>
            <button class="wb-mctrl" data-wb-act="next" aria-label="下一首">${ICONS.skip_next}</button>
          </div>
        </div>`;
      inner.querySelector('[data-wb-act="prev"]').addEventListener('click', (e) => { e.stopPropagation(); try { mediaService.prev(); } catch (err) {} });
      inner.querySelector('[data-wb-act="toggle"]').addEventListener('click', (e) => { e.stopPropagation(); try { mediaService.togglePlay(); } catch (err) {} });
      inner.querySelector('[data-wb-act="next"]').addEventListener('click', (e) => { e.stopPropagation(); try { mediaService.next(); } catch (err) {} });
      fillMusicCard(inner, mediaService.getState());
      break;
    }
    case 'battery': {
      inner.innerHTML = `
        <div class="wb-battery">
          <span class="wb-battery-bolt" data-wb-bolt>${ICONS.bolt}</span>
          <span class="wb-battery-level" data-wb-level>--%</span>
          <span class="wb-battery-label">电池</span>
        </div>`;
      fillBatteryCard(inner, getBatteryState());
      break;
    }
    case 'shortcuts': {
      inner.innerHTML = `
        <div class="wb-shortcuts">
          <button class="wb-sc" data-wb-sc="torch" aria-label="手电筒">${ICONS.torch}<span>手电筒</span></button>
          <button class="wb-sc" data-wb-sc="dnd" aria-label="勿扰">${ICONS.bedtime}<span>勿扰</span></button>
          <button class="wb-sc" data-wb-sc="dark" aria-label="深色模式">${ICONS.palette}<span>深色</span></button>
          <button class="wb-sc" data-wb-sc="saver" aria-label="省电模式">${ICONS.battery_saver}<span>省电</span></button>
        </div>`;
      inner.querySelector('[data-wb-sc="torch"]').addEventListener('click', (e) => { e.stopPropagation(); toggleTorchViaTile(); });
      inner.querySelector('[data-wb-sc="dnd"]').addEventListener('click', (e) => { e.stopPropagation(); setDndActive(!isDndActive()); });
      inner.querySelector('[data-wb-sc="dark"]').addEventListener('click', (e) => { e.stopPropagation(); setThemeMode(getResolvedTheme() === 'dark' ? 'light' : 'dark'); });
      inner.querySelector('[data-wb-sc="saver"]').addEventListener('click', (e) => { e.stopPropagation(); setBatterySaverActive(!document.body.classList.contains('battery-saver-mode')); });
      break;
    }
    default:
      inner.textContent = resolveKind(wg.kind)?.name || '小工具';
  }
  card.appendChild(inner);
}

// ---- 实时数据填充 ----

function fillSchedule(root) {
  const el = root.querySelector('[data-wb-sched-item]');
  if (!el) return;
  let text = '今天暂无日程';
  try {
    const today = calDateKey(new Date());
    const notes = readCalendarNotes(localStorage)[today] || [];
    if (notes.length) {
      const first = notes[0];
      const rest = notes.length > 1 ? ` 等 ${notes.length} 条` : '';
      const title = (first.content || '').split('\n')[0] || '日程';
      text = title.length > 22 ? title.slice(0, 22) + '…' + rest : title + rest;
    }
  } catch (e) {}
  el.textContent = text;
}

function fillMusicCard(root, ms) {
  const title = root.querySelector('[data-wb-music-title]');
  const artist = root.querySelector('[data-wb-music-artist]');
  const icon = root.querySelector('[data-wb-music-icon]');
  if (!title) return;
  const playing = !!(ms && ms.isPlaying && ms.track);
  title.textContent = playing ? (ms.track.title || '正在播放') : '未在播放';
  if (artist) artist.textContent = playing ? (ms.track.artist || '') : '点击播放键开始';
  if (icon) icon.innerHTML = ms && ms.isPlaying ? ICONS.pause : SVG_PLAY;
}

function fillBatteryCard(root, snap) {
  const level = root.querySelector('[data-wb-level]');
  const bolt = root.querySelector('[data-wb-bolt]');
  if (!level) return;
  const lv = Math.max(0, Math.min(100, Math.round(snap && snap.level != null ? snap.level : 0)));
  level.textContent = lv + '%';
  if (bolt) bolt.classList.toggle('charging', !!(snap && snap.charging));
  const card = root.closest('.widget-card');
  if (card) card.classList.toggle('wb-charging', !!(snap && snap.charging));
}

/** 手电筒：QS 磁贴 pill 是该动作的唯一真源入口（toggleTorch 为 quick-settings 私有），
 *  pill 不在场（shade 未挂载）时播报提示，绝不静默失败 */
function toggleTorchViaTile() {
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="torch"]');
  if (pill) { pill.click(); return; }
  showSystemToast('手电筒磁贴未就绪，请下拉快捷设置后重试', ICONS.torch);
}

function isDndActive() {
  try {
    const tile = window.__qsTileState && window.__qsTileState.tile && window.__qsTileState.tile('modes');
    return !!(tile && tile.active);
  } catch (e) { return false; }
}

// ==================== 数据源订阅（一次性） ====================

function wireDataBindings() {
  // 时钟：1Hz 事件驱动刷新（updateDynamicIcons 同惯例：无卡片时零 DOM 写）
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(() => {
    const nodes = document.querySelectorAll('[data-wb-clock]');
    if (!nodes.length) return;
    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]}${now.getDate()}日`;
    nodes.forEach((n) => { n.textContent = hm; });
    document.querySelectorAll('[data-wb-date]').forEach((n) => { n.textContent = dateStr; });
    // 日程低成本跟随（60s 级：时钟跳秒顺带读一次日历，无独立定时器）
    if (now.getSeconds() === 0) {
      document.querySelectorAll('.widget-card.wb-kind-schedule .widget-inner').forEach((n) => fillSchedule(n));
    }
  }, 1000);

  // 天气：glance 单源投影（initAtAGlance 拉取成功后广播 glance-weather-updated；
  // detail 携带快照时直用 —— 单源投影视图，绝不自拉外网）
  window.addEventListener('glance-weather-updated', (e) => {
    const w = (e && e.detail && typeof e.detail === 'object') ? e.detail : getGlanceWeather();
    document.querySelectorAll('.widget-card.wb-kind-weather').forEach((card) => {
      const icon = card.querySelector('.wb-weather-icon');
      const temp = card.querySelector('[data-wb-temp]');
      const cond = card.querySelector('[data-wb-cond]');
      const aqi = card.querySelector('[data-wb-aqi]');
      if (icon && w.icon) icon.innerHTML = w.icon;
      if (temp) temp.textContent = `${w.temp}°C`;
      if (cond) cond.textContent = w.condition || '';
      if (aqi) aqi.textContent = w.aqi || '';
    });
  });

  // 音乐：mediaService 单源订阅（与桌面媒体卡/锁屏同源 —— #67「与媒体卡同源」验收）
  mediaService.subscribe((ms) => {
    document.querySelectorAll('.widget-card.wb-kind-music').forEach((card) => fillMusicCard(card, ms));
  });

  // 电池：battery-service 订阅（注册即回放当前快照）
  subscribeBattery((snap) => {
    document.querySelectorAll('.widget-card.wb-kind-battery').forEach((card) => fillBatteryCard(card, snap));
  });

  // 日程：日历应用写库无总线事件 → 60s 低频轮询兜底（时钟分钟跳变已覆盖，此为日历回桌即时性补充）
  if (scheduleTimer) clearInterval(scheduleTimer);
  scheduleTimer = setInterval(() => {
    document.querySelectorAll('.widget-card.wb-kind-schedule .widget-inner').forEach((n) => fillSchedule(n));
  }, 60000);
}

// ==================== 持久化 ====================

function persistAndBroadcast() {
  saveBoard(null, board);
  try { window.dispatchEvent(new CustomEvent('widget-board-changed', { detail: { widgets: board.widgets.length } })); } catch (e) {}
}

// ==================== 增删改移 API ====================

/** 添加 widget：first-fit 自动落位（widgetpicker 点选语义） */
function placeWidget(kind, w, h) {
  const def = resolveKind(kind);
  if (!def) return null;
  let span = variantOf(kind, w, h) ? [w, h] : defaultSpanFor(kind);
  if (!span) return null;
  if (board.widgets.length >= WIDGETS_MAX) {
    showSystemToast('小工具已达上限（' + WIDGETS_MAX + ' 个），请先移除一个');
    return null;
  }
  const cols = effGridCols();
  const rows = effGridRows();
  const grids = visibleGrids();
  const pagesOcc = grids.map((_, p) => pageOccupancy(p, cols, rows, null));
  const hit = firstFreeSlot(pagesOcc, span[0], span[1], cols, rows);
  if (!hit) {
    showSystemToast('桌面空间不足，请先腾出 ' + span[0] + '×' + span[1] + ' 连续空位');
    return null;
  }
  const wg = { id: newWidgetId(kind), kind, page: hit.page, slot: hit.slot, w: span[0], h: span[1] };
  board.widgets.push(wg);
  persistAndBroadcast();
  scheduleRender();
  showSystemToast('已添加「' + def.name + '」，长按可移动');
  return { ...wg };
}

function removeWidgetById(id) {
  const idx = board.widgets.findIndex((w) => w.id === id);
  if (idx === -1) return false;
  const gone = board.widgets.splice(idx, 1)[0];
  persistAndBroadcast();
  scheduleRender();
  showSystemToast('已移除「' + (resolveKind(gone.kind)?.name || gone.kind) + '」小工具');
  return true;
}

/**
 * 隐藏 widget（v10.20 #182 · NightSky「逐项独立开关」提取，超越项）：
 * 配置保留、桌面消失——与 removeWidgetById（配置销毁）并列双通道。
 * hidden 件不占格（pageOccupancy 剔除），恢复时 first-fit 重新落位。
 */
function hideWidgetById(id) {
  const wg = board.widgets.find((w) => w.id === id);
  if (!wg || wg.hidden) return false;
  wg.hidden = true;
  persistAndBroadcast();
  scheduleRender();
  showSystemToast('已隐藏「' + (resolveKind(wg.kind)?.name || wg.kind) + '」，可在小工具选择器中恢复');
  return true;
}

/** 恢复隐藏 widget：first-fit 重新落位（全板无空位 → 拒绝并保持隐藏） */
function restoreWidgetById(id) {
  const wg = board.widgets.find((w) => w.id === id);
  if (!wg || !wg.hidden) return false;
  const cols = effGridCols();
  const rows = effGridRows();
  const grids = visibleGrids();
  const pagesOcc = grids.map((_, p) => pageOccupancy(p, cols, rows, null));
  const hit = firstFreeSlot(pagesOcc, wg.w, wg.h, cols, rows);
  if (!hit) {
    showSystemToast('桌面空间不足，无法恢复「' + (resolveKind(wg.kind)?.name || wg.kind) + '」');
    return false;
  }
  wg.hidden = false;
  wg.page = hit.page;
  wg.slot = hit.slot;
  persistAndBroadcast();
  scheduleRender();
  // picker 开着时重建列表（恢复行即时消失，管理区计数同步）
  if (pickerActive) buildPickerList();
  showSystemToast('已恢复「' + (resolveKind(wg.kind)?.name || wg.kind) + '」小工具');
  return true;
}

/** 编辑模式拖拽落位提交（slot 合法性校验，非法返回 false 磁性回落） */
function moveWidgetTo(id, page, slot) {
  const wg = board.widgets.find((w) => w.id === id);
  if (!wg) return false;
  const cols = effGridCols();
  const rows = effGridRows();
  const occ = pageOccupancy(page, cols, rows, id);
  if (!canPlaceAt(occ, slot, wg.w, wg.h, cols, rows)) return false;
  wg.page = page;
  wg.slot = slot;
  persistAndBroadcast();
  scheduleRender();
  return true;
}

/** 规格循环调整（同左上角锚定，放不下播报拒绝） */
function cycleSpan(id) {
  const wg = board.widgets.find((w) => w.id === id);
  if (!wg) return null;
  const ns = nextSpan(wg.kind, wg.w, wg.h);
  if (!ns) {
    showSystemToast('「' + (resolveKind(wg.kind)?.name || '') + '」没有其他规格');
    return null;
  }
  const cols = effGridCols();
  const rows = effGridRows();
  const occ = pageOccupancy(wg.page, cols, rows, wg.id);
  if (!canPlaceAt(occ, wg.slot, ns[0], ns[1], cols, rows)) {
    showSystemToast('该位置放不下 ' + ns[0] + '×' + ns[1] + ' 规格，请先挪出空间');
    return null;
  }
  wg.w = ns[0];
  wg.h = ns[1];
  persistAndBroadcast();
  scheduleRender();
  showSystemToast('已调整为 ' + ns[0] + '×' + ns[1]);
  return { ...wg };
}

// ==================== 桌面空白菜单（长按入口） ====================

function ensureMenuDOM() {
  if (menuEl) return;
  menuEl = document.createElement('div');
  menuEl.id = 'widgetSourceMenu';
  menuEl.className = 'widget-source-menu';
  menuEl.innerHTML = `
    <div class="wsm-item" data-wsm="widgets"><span class="wsm-icon">${SVG_WIDGETS}</span><span>小工具</span></div>
    <div class="wsm-item" data-wsm="edit"><span class="wsm-icon">${ICONS.edit}</span><span>编辑主屏幕</span></div>
    <div class="wsm-item" data-wsm="wallpaper"><span class="wsm-icon">${ICONS.palette}</span><span>壁纸与样式</span></div>
  `;
  menuEl.querySelector('[data-wsm="widgets"]').addEventListener('click', () => {
    hideSourceMenu();
    openWidgetPicker();
  });
  menuEl.querySelector('[data-wsm="edit"]').addEventListener('click', () => {
    hideSourceMenu();
    enterEditMode();
  });
  menuEl.querySelector('[data-wsm="wallpaper"]').addEventListener('click', () => {
    hideSourceMenu();
    if (typeof window.openThemePicker === 'function') window.openThemePicker();
  });
  document.body.appendChild(menuEl);
  window.addEventListener('pointerdown', (e) => {
    if (menuEl.classList.contains('active') && !menuEl.contains(e.target)) hideSourceMenu();
  });
}

function onDesktopContextMenu(e) {
  // 图标/文件夹/widget/概览/搜索胶囊有自己的菜单或交互 —— 空白区才弹桌面菜单
  if (e.target.closest('.app-icon, .app-folder, .widget-card, .pixel-at-a-glance, .desktop-search-pill, .dock, .page-dots, .desktop-blur-canvas')) return;
  e.preventDefault();
  e.stopPropagation();
  if (state.isOpen || state.isDragging) return;
  showSourceMenu(e.clientX, e.clientY);
}

function showSourceMenu(x, y) {
  menuEl.classList.add('active');
  const mw = 190;
  const mh = menuEl.offsetHeight || 140;
  let left = x;
  let top = y;
  if (left + mw > window.innerWidth - 12) left = window.innerWidth - mw - 12;
  if (top + mh > window.innerHeight - 12) top = window.innerHeight - mh - 12;
  menuEl.style.left = `${left}px`;
  menuEl.style.top = `${top}px`;
  if (navigator.vibrate) navigator.vibrate(15);
}

function hideSourceMenu() {
  if (menuEl) menuEl.classList.remove('active');
}

// ==================== 卡片长按菜单（v10.20 #182 隐藏/移除双通道） ====================

function ensureCardMenuDOM() {
  if (cardMenuEl) return;
  cardMenuEl = document.createElement('div');
  cardMenuEl.id = 'widgetCardMenu';
  // 复用 .widget-source-menu 形态（桌面空白菜单同款视觉，零新样式族）
  cardMenuEl.className = 'widget-source-menu';
  cardMenuEl.innerHTML = `
    <div class="wsm-item" data-wcm="hide" role="button" tabindex="0" aria-label="隐藏小工具，配置保留，可在小工具选择器恢复"><span class="wsm-icon">${SVG_EYE_OFF}</span><span>隐藏</span></div>
    <div class="wsm-item" data-wcm="remove" role="button" tabindex="0" aria-label="移除小工具，配置删除"><span class="wsm-icon">${SVG_TRASH}</span><span>移除</span></div>
  `;
  cardMenuEl.querySelector('[data-wcm="hide"]').addEventListener('click', () => {
    if (cardMenuTargetId) hideWidgetById(cardMenuTargetId);
    hideCardMenu();
  });
  cardMenuEl.querySelector('[data-wcm="remove"]').addEventListener('click', () => {
    if (cardMenuTargetId) removeWidgetById(cardMenuTargetId);
    hideCardMenu();
  });
  document.body.appendChild(cardMenuEl);
  window.addEventListener('pointerdown', (e) => {
    if (cardMenuEl.classList.contains('active') && !cardMenuEl.contains(e.target)) hideCardMenu();
  });
}

function showWidgetCardMenu(x, y, id) {
  ensureCardMenuDOM();
  // 拖拽中不弹（触屏长按 380ms 已入拖拽，contextmenu 迟到不叠加）
  if (dragCtx || state.iconDragState) return;
  cardMenuTargetId = id;
  cardMenuEl.classList.add('active');
  const mw = 190;
  const mh = cardMenuEl.offsetHeight || 96;
  let left = x;
  let top = y;
  if (left + mw > window.innerWidth - 12) left = window.innerWidth - mw - 12;
  if (top + mh > window.innerHeight - 12) top = window.innerHeight - mh - 12;
  cardMenuEl.style.left = `${left}px`;
  cardMenuEl.style.top = `${top}px`;
  if (navigator.vibrate) navigator.vibrate(15);
}

function hideCardMenu() {
  if (cardMenuEl) cardMenuEl.classList.remove('active');
  cardMenuTargetId = null;
}

// ==================== widget 选择器（widgetpicker 对标） ====================

function ensurePickerDOM() {
  if (pickerEl) return;
  pickerEl = document.createElement('div');
  pickerEl.id = 'widgetPickerOverlay';
  pickerEl.setAttribute('role', 'dialog');
  pickerEl.setAttribute('aria-label', '小工具选择器');
  pickerEl.innerHTML = `
    <div class="wp-scrim"></div>
    <div class="wp-sheet">
      <header class="wp-header">
        <span class="wp-header-icon">${SVG_WIDGETS}</span>
        <span class="wp-header-title">小工具</span>
        <button class="wp-close" aria-label="关闭">${ICONS.close}</button>
      </header>
      <div class="wp-list"></div>
    </div>
  `;
  pickerEl.querySelector('.wp-close').addEventListener('click', () => closeWidgetPicker());
  pickerEl.querySelector('.wp-scrim').addEventListener('click', () => closeWidgetPicker());
  // v10.20 #114 外部收起主通道（WidgetsFullSheet 遮罩收起同构）：scrim pointerdown 即
  // 收起（ACTION_OUTSIDE down 拍派发；上方 click 保留兜底）。sheet 面 = 可触摸区 consume
  // （卡片点选/拖出照常），遮罩落点 = DISMISS（消费 + 收起）。
  pickerOutside = createOutsideDismissMachine({ mode: OutsideMode.DISMISS, onDismiss: () => closeWidgetPicker() });
  pickerEl.addEventListener('pointerdown', (e) => {
    pickerOutside.feedPointerDown(isInsideTouchable(e.target, PICKER_TOUCHABLE.selector));
  }, true);
  document.body.appendChild(pickerEl);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pickerActive) { closeWidgetPicker(); return; }
    if (e.key === 'Escape' && menuEl && menuEl.classList.contains('active')) hideSourceMenu();
    if (e.key === 'Escape' && cardMenuEl && cardMenuEl.classList.contains('active')) hideCardMenu();
  });
}

function buildPickerList() {
  const list = pickerEl.querySelector('.wp-list');
  list.innerHTML = '';
  for (const def of WIDGET_CATALOG) {
    for (const [w, h] of def.spans) {
      const card = document.createElement('div');
      card.className = 'wp-card';
      card.dataset.kind = def.kind;
      card.dataset.w = w;
      card.dataset.h = h;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${def.name} ${w}乘${h} 小工具`);
      const preview = document.createElement('div');
      preview.className = 'wp-preview wp-preview-' + def.kind;
      preview.style.aspectRatio = `${w} / ${h}`;
      renderCardContent(preview, { kind: def.kind, w, h, id: 'preview', page: 0, slot: 0 });
      // 预览卡里不该有可点的控制键
      preview.querySelectorAll('button').forEach((b) => { b.disabled = true; b.classList.add('wp-preview-dead'); });
      const meta = document.createElement('div');
      meta.className = 'wp-meta';
      const name = document.createElement('span');
      name.className = 'wp-name';
      name.textContent = def.name;
      const span = document.createElement('span');
      span.className = 'wp-span';
      span.textContent = `${w}×${h}`;
      meta.appendChild(name);
      meta.appendChild(span);
      card.appendChild(preview);
      card.appendChild(meta);
      bindPickerCardEvents(card, def.kind, w, h);
      list.appendChild(card);
    }
  }

  // v10.20 #182 「已隐藏」管理区（NightSky 逐项开关提取，超越项）：
  // 逐项恢复 = first-fit 重新落位（隐藏语义的自然逆操作）；空态不渲染区头。
  const hiddenWidgets = board.widgets.filter((w) => w.hidden);
  if (hiddenWidgets.length) {
    const head = document.createElement('div');
    head.className = 'wp-hidden-head';
    head.textContent = '已隐藏（' + hiddenWidgets.length + '）';
    list.appendChild(head);
    for (const wg of hiddenWidgets) {
      const row = document.createElement('div');
      row.className = 'wp-hidden-row';
      row.dataset.widgetId = wg.id;
      const name = document.createElement('span');
      name.className = 'wp-hidden-name';
      name.textContent = (resolveKind(wg.kind)?.name || wg.kind) + ' ' + wg.w + '×' + wg.h;
      const btn = document.createElement('button');
      btn.className = 'wp-restore-btn';
      btn.textContent = '恢复';
      btn.setAttribute('aria-label', '恢复「' + (resolveKind(wg.kind)?.name || wg.kind) + '」小工具');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        restoreWidgetById(wg.id);
      });
      row.appendChild(name);
      row.appendChild(btn);
      list.appendChild(row);
    }
  }
}

function openWidgetPicker() {
  if (!pickerEl) ensurePickerDOM();
  buildPickerList();
  pickerActive = true;
  pickerEl.classList.add('active');
  if (pickerOutside) pickerOutside.open(); // #114 ARM 门开
  hideSourceMenu();
  if (navigator.vibrate) navigator.vibrate([10, 20, 10]);
}

function closeWidgetPicker() {
  if (!pickerEl) return;
  pickerActive = false;
  pickerEl.classList.remove('active');
  if (pickerOutside) pickerOutside.close(); // #114 复位
}

/** 选择器卡片：点选自动落位 / 按住拖出即拖放（两条通道同一落位校验） */
function bindPickerCardEvents(card, kind, w, h) {
  let sx = 0, sy = 0, dragging = false, pid = null;

  card.addEventListener('pointerdown', (e) => {
    if (dragCtx) return;
    sx = e.clientX; sy = e.clientY;
    dragging = false;
    pid = e.pointerId;
  });

  card.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid || dragCtx) return;
    if (!dragging && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) {
      dragging = true;
      closeWidgetPicker();
      startWidgetDrag({ pending: true, kind, w, h }, sx, sy, e);
    }
  });

  card.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pid) return;
    pid = null;
    if (dragging || dragCtx) return;
    // 点选：自动落位
    closeWidgetPicker();
    placeWidget(kind, w, h);
  });

  card.addEventListener('pointercancel', () => { pid = null; });
}

// ==================== 拖拽（#41 基建同构） ====================

/**
 * 拖拽上下文两种来源：
 *   pending=true  —— 选择器拖出（widget 尚未入板，落下即 place）
 *   pending=false —— 编辑模式拖既有 widget（原卡 placeholder 化）
 */
function startWidgetDrag(spec, startX, startY, e) {
  const grids = visibleGrids();
  if (!grids.length) return;
  enterEditMode();
  // 编辑模式套件（抖动/徽标/规格把手）跟随点亮 —— 拖拽既有件时 srcEl 引用在
  // 重渲染后由 renderWidgetLayer 按 dragCtx.id 重挂 .widget-drag-src（占位态不丢）
  scheduleRender();

  const srcEl = spec.pending ? null : document.querySelector(`.widget-card[data-widget-id="${spec.id}"]`);
  // 幽灵尺寸：既有件取源卡实测矩形；选择器拖出按网格单元几何合成（未入板无源可测）
  const cols = effGridCols();
  const rows = effGridRows();
  const m = gridMetrics(grids[0]);
  let ghostW, ghostH, offX, offY;
  if (srcEl) {
    const sr = srcEl.getBoundingClientRect();
    ghostW = sr.width;
    ghostH = sr.height;
    offX = startX - sr.left;
    offY = startY - sr.top;
  } else {
    ghostW = spec.w * m.cellW + (spec.w - 1) * m.gapX;
    ghostH = spec.h * m.cellH + (spec.h - 1) * m.gapY;
    offX = ghostW / 2;
    offY = ghostH / 2;
  }

  let ghost;
  if (spec.pending) {
    ghost = document.createElement('div');
    ghost.className = 'widget-card widget-ghost wb-kind-' + spec.kind;
    renderCardContent(ghost, { kind: spec.kind, w: spec.w, h: spec.h, id: 'ghost', page: 0, slot: 0 });
    ghost.querySelectorAll('button').forEach((b) => b.remove());
  } else {
    ghost = srcEl.cloneNode(true);
    ghost.classList.add('widget-ghost');
    const badge = ghost.querySelector('.widget-remove-badge');
    if (badge) badge.remove();
    const grip = ghost.querySelector('.widget-resize-grip');
    if (grip) grip.remove();
  }

  ghost.style.width = ghostW + 'px';
  ghost.style.height = ghostH + 'px';
  ghost.style.transform = `translate3d(${startX - offX}px, ${startY - offY}px, 0) scale(1.06)`;
  document.body.appendChild(ghost);

  if (!dropOutlineEl) {
    dropOutlineEl = document.createElement('div');
    dropOutlineEl.className = 'widget-drop-outline';
    dropOutlineEl.style.display = 'none';
    document.body.appendChild(dropOutlineEl);
  }

  dragCtx = {
    pending: !!spec.pending,
    kind: spec.kind,
    w: spec.w,
    h: spec.h,
    id: spec.id || null,
    ghost,
    srcEl,
    offX,
    offY,
    targetPage: -1,
    targetSlot: -1,
    valid: false,
  };

  // #41 生命周期让位：iconDragState 武装 → Live Pager/QS 底部区门卫全部让路
  state.iconDragState = { mode: 'widget', dragCtx };
  if (trashEl) trashEl.classList.add('active');

  window.addEventListener('pointermove', onDragPointerMove, { passive: false });
  window.addEventListener('pointerup', onDragPointerUp);
  window.addEventListener('pointercancel', onDragPointerUp);

  // 立即按当前指针校准一次
  onDragPointerMove(e);
}

// dragCtx 挂入模块态供渲染层读取（srcEl 占位态由渲染时判定）

function onDragPointerMove(e) {
  if (!dragCtx) return;
  e.preventDefault();
  const { ghost, offX, offY } = dragCtx;
  const x = e.clientX - offX;
  const y = e.clientY - offY;
  ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.06)`;

  const px = e.clientX;
  const py = e.clientY;

  // 垃圾桶命中态
  if (trashEl) {
    const tr = trashEl.getBoundingClientRect();
    trashEl.classList.toggle('hover', py >= tr.top && py <= tr.bottom && px >= tr.left && px <= tr.right);
  }

  // 落点校验（垃圾桶悬停时不再显示落位框）
  const page = pageFromPoint(px, py);
  const cols = effGridCols();
  const rows = effGridRows();
  let valid = false;
  let slot = -1;
  if (page !== -1 && trashEl && !trashEl.classList.contains('hover')) {
    const m = gridMetrics(grids()[page]);
    slot = slotFromPoint(m, px, py);
    if (slot !== -1) {
      const occ = pageOccupancy(page, cols, rows, dragCtx.id);
      valid = canPlaceAt(occ, slot, dragCtx.w, dragCtx.h, cols, rows);
    }
  }
  dragCtx.targetPage = page;
  dragCtx.targetSlot = slot;
  dragCtx.valid = valid;

  // 落位预览框（贴在目标网格坐标系内 —— rect 差值换算，v8.58 offsetParent 教训）
  if (page !== -1 && slot !== -1 && !trashEl.classList.contains('hover')) {
    const grid = grids()[page];
    const m = gridMetrics(grid);
    const row0 = Math.floor(slot / m.cols);
    const col0 = slot % m.cols;
    dropOutlineEl.style.display = 'block';
    dropOutlineEl.style.left = (m.rect.left + m.padL + col0 * (m.cellW + m.gapX)) + 'px';
    dropOutlineEl.style.top = (m.rect.top + m.padT + row0 * (m.cellH + m.gapY)) + 'px';
    dropOutlineEl.style.width = (dragCtx.w * m.cellW + (dragCtx.w - 1) * m.gapX) + 'px';
    dropOutlineEl.style.height = (dragCtx.h * m.cellH + (dragCtx.h - 1) * m.gapY) + 'px';
    dropOutlineEl.classList.toggle('bad', !valid);
  } else {
    dropOutlineEl.style.display = 'none';
  }
}

function onDragPointerUp() {
  if (!dragCtx) return;
  const ctx = dragCtx;
  dragCtx = null;
  window.removeEventListener('pointermove', onDragPointerMove);
  window.removeEventListener('pointerup', onDragPointerUp);
  window.removeEventListener('pointercancel', onDragPointerUp);

  // 垃圾桶悬停态先读后清（remove 会抹掉判定依据）
  const wasTrashHover = !!(trashEl && trashEl.classList.contains('hover'));
  if (ctx.ghost) ctx.ghost.remove();
  if (dropOutlineEl) dropOutlineEl.style.display = 'none';
  if (trashEl) trashEl.classList.remove('active', 'hover');
  if (ctx.srcEl) ctx.srcEl.classList.remove('widget-drag-src');
  state.iconDragState = null;

  // 1) 拖入垃圾桶 → 删除（编辑拖拽专属；pending 拖出垃圾无意义，等同取消）
  if (!ctx.pending && wasTrashHover) {
    removeWidgetById(ctx.id);
    return;
  }

  // 2) 合法落位 → 入板 / 迁移
  if (ctx.valid && ctx.targetPage !== -1 && ctx.targetSlot !== -1) {
    if (ctx.pending) {
      placeWidgetAt(ctx.kind, ctx.w, ctx.h, ctx.targetPage, ctx.targetSlot);
    } else {
      if (!moveWidgetTo(ctx.id, ctx.targetPage, ctx.targetSlot)) {
        snapBackToast(ctx);
      }
    }
    return;
  }

  // 3) 磁性回落（无效落点）
  snapBackToast(ctx);
}

function snapBackToast(ctx) {
  if (ctx.pending) {
    showSystemToast('已取消放置：该位置放不下 ' + ctx.w + '×' + ctx.h);
  }
  // 非.pending：卡片原位重渲染即回落（srcEl 类已清，无需动画占位）
  scheduleRender();
}

/** 指定槽位直放（拖出选择器落下 / e2e 钩子共用） */
function placeWidgetAt(kind, w, h, page, slot) {
  const def = resolveKind(kind);
  if (!def || !variantOf(kind, w, h)) return null;
  if (board.widgets.length >= WIDGETS_MAX) {
    showSystemToast('小工具已达上限（' + WIDGETS_MAX + ' 个），请先移除一个');
    return null;
  }
  const cols = effGridCols();
  const rows = effGridRows();
  const occ = pageOccupancy(page, cols, rows, null);
  if (!canPlaceAt(occ, slot, w, h, cols, rows)) {
    showSystemToast('该位置放不下 ' + w + '×' + h);
    return null;
  }
  const wg = { id: newWidgetId(kind), kind, page, slot, w, h };
  board.widgets.push(wg);
  persistAndBroadcast();
  scheduleRender();
  showSystemToast('已添加「' + def.name + '」，长按可移动');
  return { ...wg };
}

// ==================== 垃圾桶（DeleteDropTarget 对标） ====================

function ensureTrashDOM() {
  if (trashEl) return;
  trashEl = document.createElement('div');
  trashEl.id = 'widgetTrashZone';
  trashEl.innerHTML = `<span class="wtz-icon">${SVG_WIDGETS}</span><span>拖到此处移除</span>`;
  document.body.appendChild(trashEl);
}

// ==================== 卡片交互绑定（长按即拖 / 键盘） ====================

function bindWidgetCardEvents(card, wg) {
  let startX = 0, startY = 0, hasMovedFar = false, pressTimer = null, pressed = false;

  // 释放监听双通道：card 级 + window 级（v10.20 #182 修复：右键弹菜单后 up 落在
  // 菜单而非卡片 → 计时器不清除 → 380ms 后自发入拖拽；window 级保证释放必达，
  // idempotent 守卫防双触发）
  const release = (e) => {
    if (!pressed) return;
    pressed = false;
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (!state.isEditMode && card.style.transform) card.style.transform = '';
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
  };
  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);

  card.addEventListener('pointerdown', (e) => {
    if ((state.isOpen && !state.isClosing) || state.iconDragState) return;
    // 卡内控制键（音乐控制/徽标/把手）自持交互 —— 长按拖拽不得误触
    if (e.target.closest('button, .widget-remove-badge, .widget-resize-grip')) return;
    startX = e.clientX;
    startY = e.clientY;
    hasMovedFar = false;
    pressed = true;
    // v10.20 #182 修复：window 级释放监听（右键弹菜单后 up 落在菜单而非卡片
    // → 计时器不清除 → 380ms 后自发入拖拽+编辑态；双通道保证释放必达，release 幂等）
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    if (!state.isEditMode) {
      card.style.transform = 'scale(0.96)';
      card.style.transition = 'transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)';
      pressTimer = setTimeout(() => {
        if (!hasMovedFar && !state.iconDragState) {
          card.style.transform = '';
          startWidgetDrag({ id: wg.id, kind: wg.kind, w: wg.w, h: wg.h }, startX, startY, buildFakeMove(e));
        }
      }, LONG_PRESS_MS);
    } else {
      pressTimer = setTimeout(() => {
        if (!state.iconDragState) {
          startWidgetDrag({ id: wg.id, kind: wg.kind, w: wg.w, h: wg.h }, startX, startY, buildFakeMove(e));
        }
      }, EDIT_PRESS_MS);
    }
  });

  card.addEventListener('pointermove', (e) => {
    if (!pressed) return;
    const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (!state.isEditMode) {
      if (dist > 8 && !state.iconDragState) {
        hasMovedFar = true;
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        card.style.transform = '';
      }
    } else if (dist > 4 && !state.iconDragState) {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      startWidgetDrag({ id: wg.id, kind: wg.kind, w: wg.w, h: wg.h }, startX, startY, buildFakeMove(e));
    }
  });

  // 点按 widget 主体 = 无动作（与图标打开应用区分；时钟/天气卡内容自带语义入口后续扩展）
  card.addEventListener('click', (e) => {
    if (state.iconDragState || hasMovedFar) return;
    e.stopPropagation();
  });

  // 卡片长按菜单（contextmenu = 触屏长按/鼠标右键统一入口，与桌面空白菜单同通道；
  // v10.20 #182：隐藏（配置保留）/ 移除（配置销毁）双通道并列）
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showWidgetCardMenu(e.clientX, e.clientY, wg.id);
  });

  card.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && state.isEditMode) {
      e.preventDefault();
      cycleSpan(wg.id);
    }
  });
}

/** pointerdown 事件 → 拖拽起始合成 move（startWidgetDrag 内部按起点立即校准一次） */
function buildFakeMove(e) {
  return { clientX: e.clientX, clientY: e.clientY, preventDefault() {}, pointerId: e.pointerId };
}

// 惯性小工具：grids() 简写
function grids() {
  return visibleGrids();
}
