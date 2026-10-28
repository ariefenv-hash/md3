// ==================== all-apps.js — #66 应用抽屉 allapps（Launcher3 对标·Android 桌面灵魂） ====================
//
// AOSP 取值（#54 全局取值纪律：源码能取到值的一律按原值落地）：
//   · config_allAppsOpenDuration = 600ms —— 进出场时长原值（不压缩为 md3 既有 150ms 手感）
//   · REVERT_SWIPE_ALL_APPS_TO_HOME_ANIMATION_DURATION_MS = 200ms —— 手势中途取消回退
//     （AllAppsTransitionController.java:84，docs/reference/launcher3/allapps/ 实测源码）
//   · 曲线：DECELERATE_1.7 族 → motion.js tokens.decel（三正典之一，动效纪律禁手写贝塞尔）
//   · FastScroller：复用 aosp/fast-scroller.js（android.widget.FastScroller 忠实移植，
//     scroll-fx v7.41 同源）——右侧 thumb + 字母气泡预览，sectionIndexer 接 A-Z 分节
//
// 形态（#66 验收原文逐条）：
//   · 入口：桌面上滑手势（与翻页方向判定互斥：|dy| 主导才进入抽屉意图；底部 60px
//     既有上滑=多任务语义保留）+ QS 磁贴 all_apps + window.__allApps.open()
//   · 列表：A-Z 字母分节（sticky 头）+ 4 列图标网格（手机断点）+ 快速滚动条 + 气泡字母
//   · 搜索：顶部搜索框即时过滤（过滤态拍平分节，AOSP 搜索态语义）
//   · 背景：半透明模糊层（与 shade 视觉层级一致：blur(20px) saturate(1.8) 同 pull-panels）
//   · 数据：与桌面同源（initialApps 注册表，45 应用）；长按弹上下文菜单（dock 添加/小窗
//     /应用操作——context-menu.js 同款）。刻意偏离记录：#66 原文「拖出链路复用 #41」在
//     md3「桌面全量平铺、每应用恰一图标」模式下无对应语义场景（拖出=创建重复图标），
//     故以长按菜单承载「添加到 Dock」动作，待桌面支持图标移除后再启用拖出（v8.58 注）。
//
// 双形态分化（#73，v8.61）：容器形状/生命周期/动效/列数/入口可达性按断点二分，
// 纯函数核见 allapps-form.js（AOSP 原值全量标注）。
//   · 手机（<768px）：全屏覆盖层（现状形态），600/300ms，阈值 0.5，常驻 View（persistent）
//   · 平板（≥768px）：浮层 bottom sheet——顶部留白 = 视口高/6、267/267ms、阈值 0.3、
//     开时建关时毁（ephemeral，TaskbarAllAppsController 语义）、z 848（> taskbar 846 /
//     mini-window 590 / 分屏 760，< shade 850）→ **应用内可拉起**（任务栏常驻的效率来源，
//     #73 §三.9），点浮层内应用 = 切换应用（openAppById → openApp 既有切换链）；
//     关闭三路径：下拉超过阈值 0.3 / Esc·返回键 / 点上方露出的桌面区域（scrim）
//
// @ts-check

import { initialApps } from './apps-data.js';
import { getAppIconSVG } from './app-icons.js';
import { createDynamicIconHTML } from './dynamic-icons.js';
import { state } from './state.js';
import { dur, after } from './motion.js';
import { showContextMenu, closeContextMenu } from './context-menu.js';
import { isPullPanelsActive, closePullPanels } from './pull-down-gesture.js';
import { FastScroller } from './aosp/fast-scroller.js';
import { clamp } from './utils.js';
import {
  formFor, lifecycleFor, openMsFor, closeMsFor, successThresholdFor,
  topPaddingFor, allAppsColumnsFor, fitAllAppsGrid, sheetDismissProgress,
} from './allapps-form.js';

// ==================== AOSP 原值常量 ====================

/** config_allAppsOpenDuration 原值（Launcher3 lineage-24.0，#54 纪律帖实证） */
export const ALL_APPS_OPEN_DURATION_MS = 600;
/** AllAppsTransitionController.REVERT_SWIPE_ALL_APPS_TO_HOME_ANIMATION_DURATION_MS 原值 */
export const REVERT_SWIPE_MS = 200;
/** 手机断点网格列数（AOSP allapps 手机 4 列） */
export const GRID_COLUMNS = 4;

// ==================== 拼音分桶（ICU AlphabeticIndex 语义） ====================

let _collator = null;
function collator() {
  if (!_collator) {
    try { _collator = new Intl.Collator('zh-Hans-CN-u-co-pinyin'); }
    catch (e) { try { _collator = new Intl.Collator('zh'); } catch (e2) { _collator = null; } }
  }
  return _collator;
}

/**
 * 拼音锚点表：每字母取一个代表字（拼音首音节 = 该字母），锚点按拼音序升序排列。
 * 汉字桶 = 最后一个 compare(ch, anchor) >= 0 的锚点字母。
 * 无拼音音节的字母（I/U/V）不出现在拼音排序中，故不设锚点。
 * @type {Array<[string, string]>}
 */
export const PINYIN_ANCHORS = [
  ['A', '阿'], ['B', '八'], ['C', '擦'], ['D', '搭'], ['E', '蛾'], ['F', '发'],
  ['G', '噶'], ['H', '哈'], ['J', '击'], ['K', '咔'], ['L', '拉'], ['M', '妈'],
  ['N', '拿'], ['O', '哦'], ['P', '扑'], ['Q', '七'], ['R', '然'], ['S', '撒'],
  ['T', '塌'], ['W', '挖'], ['X', '西'], ['Y', '压'], ['Z', '匝'],
];

/**
 * 应用名 → 分节字母（混合脚本桶，AOSP AlphabeticIndex 语义）：
 *   ASCII 字母开头 → 直接归该字母（ByteBeat→B，与「备忘录」同节）；
 *   汉字开头 → 拼音锚点桶（ICU zh pinyin collation 排序下的区间二分）；
 *   数字/符号/空名 → '#'（恒排最后）。
 * @param {string} name
 * @returns {string}
 */
export function bucketOf(name) {
  const ch = String(name == null ? '' : name).trim().charAt(0);
  if (!ch) return '#';
  if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
  const c = collator();
  if (!c || !/[\u3400-\u9FFF\uF900-\uFAFF]/.test(ch)) return '#';
  let letter = '#';
  for (const [L, anchor] of PINYIN_ANCHORS) {
    if (c.compare(ch, anchor) >= 0) letter = L;
    else break; // 锚点升序：首个比较 < 0 即出界
  }
  return letter;
}

/**
 * A-Z 分节（'#' 恒最后；节内按 zh pinyin collation 排序）。
 * @param {Array<{id:string,name:string}>} apps
 * @returns {Array<{letter:string, apps:Array<Object>}>}
 */
export function sectionizeApps(apps) {
  const c = collator();
  const byLetter = new Map();
  for (const app of apps || []) {
    const L = bucketOf(app && app.name);
    if (!byLetter.has(L)) byLetter.set(L, []);
    byLetter.get(L).push(app);
  }
  const letters = Array.from(byLetter.keys()).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return letters.map((letter) => ({
    letter,
    apps: byLetter.get(letter).sort((x, y) => c ? c.compare(x.name, y.name) : 0),
  }));
}

/**
 * 搜索过滤（名称/id 大小写不敏感子串；q 空 → null 表示不过滤）。
 * @param {Array<{id:string,name:string}>} apps
 * @param {string} q
 * @returns {Array<Object>|null}
 */
export function filterApps(apps, q) {
  const query = String(q == null ? '' : q).trim().toLowerCase();
  if (!query) return null;
  return (apps || []).filter((a) =>
    (a && a.name && String(a.name).toLowerCase().includes(query)) ||
    (a && a.id && String(a.id).toLowerCase().includes(query)));
}

// ==================== 纯函数：网格列数（断点） ====================

/** 手机 4 列（GRID_COLUMNS）；≥768px 平板 6 列（#73 平板形态分化的数据层预留） */
export function gridColumnsFor(viewportW) {
  return viewportW >= 768 ? 6 : GRID_COLUMNS;
}

// ==================== 运行时状态 ====================

const LIST_ITEM_H = 88;   // 网格单元高（icon 52 + label + padding，CSS 同源）
const HEADER_H = 36;      // 分节字母头高

let overlayEl = null;
let listEl = null;
let searchInput = null;
let previewEl = null;
let fastScroller = null;
let sections = [];        // [{letter, apps, startEl, startIndex}]
let sectionLetters = [];  // 活引用：FastScroller.mSections 持此数组，重渲染时原地变更（快照会漂移）
let flatIndexEls = [];    // 全部条目元素（快速滚动宿主几何）
let active = false;
let activeForm = 'phone'; // 当前形态（open 时按视口判定，#73）
let hideTimer = null;     // after() 取消柄
let lpTimer = null;       // 长按定时器
let lpFired = false;      // 长按已触发（抑制后续 click）

/** 抽屉是否激活（测试钩子同款只读面） */
export function isAllAppsActive() { return active; }

/** 当前形态（'phone' | 'tablet'，#73 测试/E2E 观测面） */
export function currentForm() { return activeForm; }

/** Esc 关闭监听（具名持有：平板 ephemeral 销毁时解绑，防残留监听） */
function onGlobalKeydown(e) {
  if (e.key === 'Escape' && active) { e.stopPropagation(); closeAllApps(); }
}

// ==================== DOM 构建 ====================

function buildIconContent(app) {
  // 与 desktop.js 图标链同源：安装包 customIcon → 动态类型 → 静态表
  return app.customIcon ? app.customIcon
    : app.type ? createDynamicIconHTML(app.type, false)
    : getAppIconSVG(app.id);
}

function ensureOverlay(form) {
  if (overlayEl) { overlayEl.dataset.form = form; return; }

  overlayEl = document.createElement('div');
  overlayEl.id = 'allAppsOverlay';
  overlayEl.className = 'all-apps-overlay';
  overlayEl.dataset.form = form; // 'phone'（全屏）/ 'tablet'（浮层 sheet）——CSS 双形态切换
  overlayEl.setAttribute('role', 'dialog');
  overlayEl.setAttribute('aria-modal', 'true');
  overlayEl.setAttribute('aria-label', '所有应用');
  overlayEl.innerHTML = `
    <div class="aa-scrim"></div>
    <div class="aa-sheet">
      <div class="aa-header">
        <input class="aa-search" id="aaSearch" type="text" placeholder="搜索应用"
               autocomplete="off" spellcheck="false" aria-label="搜索应用" />
      </div>
      <div class="aa-list" id="aaList"></div>
    </div>
  `;
  document.body.appendChild(overlayEl);

  listEl = overlayEl.querySelector('#aaList');
  searchInput = overlayEl.querySelector('#aaSearch');

  // FastScroller 悬浮层（scroll-fx v7.49 纪律：sticky top:0 首子元素前，净占位归零）
  const fsOverlay = document.createElement('div');
  fsOverlay.className = 'md-fastscroller';
  Object.assign(fsOverlay.style, {
    position: 'sticky', top: '0', height: '0', zIndex: '6', pointerEvents: 'none',
  });
  const track = document.createElement('div');
  track.className = 'md-fs-track';
  Object.assign(track.style, {
    position: 'absolute', right: '2px', top: '0', width: '4px',
    borderRadius: '2px', background: 'rgba(154,160,166,0.25)', opacity: '0',
  });
  const thumb = document.createElement('div');
  thumb.className = 'md-fs-thumb';
  Object.assign(thumb.style, {
    position: 'absolute', right: '0', top: '0', width: '12px', height: '48px',
    borderRadius: '6px', background: 'rgba(154,160,166,0.7)', opacity: '0',
  });
  previewEl = document.createElement('div');
  previewEl.className = 'aa-fs-bubble';
  Object.assign(previewEl.style, {
    position: 'absolute', right: '26px', top: '0', width: '52px', height: '52px',
    borderRadius: '16px', opacity: '0', pointerEvents: 'none',
  });
  fsOverlay.appendChild(track);
  fsOverlay.appendChild(thumb);
  fsOverlay.appendChild(previewEl);
  listEl.insertBefore(fsOverlay, listEl.firstChild);

  // 空白（scrim/header 段）点击关闭——平板浮层上方露出的桌面区域即 scrim 可见部分
  //（#73 §三.11 关闭路径之三：点上方留白区）
  overlayEl.querySelector('.aa-scrim').addEventListener('click', () => closeAllApps());
  searchInput.addEventListener('input', () => { renderList(searchInput.value); });
  // Esc 关闭（具名监听：平板 ephemeral 销毁时解绑）
  window.addEventListener('keydown', onGlobalKeydown);

  // 平板浮层下拉关闭手势（#73 §三.11 关闭路径之一）：header 区按下下拉，
  // 进度 = 位移/sheet 高 ≥ TABLET_SUCCESS_PROGRESS(0.3) → 关，否则回弹
  const sheetEl = overlayEl.querySelector('.aa-sheet');
  let dragY0 = 0, dragging = false;
  sheetEl.addEventListener('pointerdown', (e) => {
    if (overlayEl.dataset.form !== 'tablet') return;
    if (e.target && e.target.closest && e.target.closest('.aa-item')) return; // 条目长按/点按让位
    dragging = true; dragY0 = e.clientY;
    sheetEl.style.transition = 'none';
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging || !overlayEl || !active) return;
    const dy = Math.max(0, e.clientY - dragY0);
    sheetEl.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  window.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    sheetEl.style.transition = '';
    const dy = Math.max(0, e.clientY - dragY0);
    sheetEl.style.transform = '';
    const h = sheetEl.getBoundingClientRect().height || overlayEl.getBoundingClientRect().height;
    if (sheetDismissProgress(dy, h) >= successThresholdFor('tablet')) closeAllApps('drag');
  }, { passive: true });
  window.addEventListener('pointercancel', () => {
    if (!dragging) return;
    dragging = false;
    sheetEl.style.transition = '';
    sheetEl.style.transform = '';
  });
}

// ==================== 列表渲染（DOM 几何驱动 FastScroller） ====================

/**
 * 渲染列表。q 为空 = 全量分节模式；有值 = 搜索态（拍平无分节头，AOSP 搜索语义）。
 * @param {string} [q]
 */
function renderList(q = '') {
  if (!listEl) return;
  const filtered = filterApps(initialApps, q);
  const apps = filtered || initialApps;
  const searching = !!filtered;
  sections = searching ? [] : sectionizeApps(apps);
  flatIndexEls = [];

  listEl.querySelectorAll('.aa-section, .aa-grid, .aa-empty').forEach((n) => n.remove());

  if (!apps.length) {
    const empty = document.createElement('div');
    empty.className = 'aa-empty';
    empty.textContent = '未找到匹配的应用';
    listEl.appendChild(empty);
    if (fastScroller) {
      fastScroller.layout();
      fastScroller.onItemCountChanged(1, 0); // 空列表：longList 门控归零收 thumb
    }
    return;
  }

  // 列数 + 降级（#73：AllAppsProfile 先压 borderSpace 再压 iconSize）；容器实宽取
  // listEl.clientWidth（已扣 padding，可见后计算——v8.58 时序纪律）
  const vw = window.innerWidth;
  const cols = allAppsColumnsFor(vw);
  const fit = fitAllAppsGrid(listEl.clientWidth || 0, cols, {});
  if (fit.cellWidth > 0) {
    overlayEl.style.setProperty('--aa-icon-size', `${fit.iconSize}px`);
    overlayEl.style.setProperty('--aa-border-space', `${fit.borderSpace}px`);
  }
  let flatIdx = 0;
  sectionLetters.length = 0; // 活引用原地变更（FastScroller 持同数组）
  for (const sec of sections) {
    if (sec.letter) sectionLetters.push(sec.letter);
  }
  for (const sec of sections.length ? sections : [{ letter: '', apps }]) {
    if (sec.letter) {
      const head = document.createElement('div');
      head.className = 'aa-section';
      head.textContent = sec.letter;
      listEl.appendChild(head);
    }
    const grid = document.createElement('div');
    grid.className = 'aa-grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.columnGap = fit.cellWidth > 0 ? `${fit.borderSpace}px` : '8px';
    for (const app of sec.apps) {
      const item = document.createElement('div');
      item.className = 'aa-item';
      item.dataset.appId = app.id;
      item.dataset.flatIdx = String(flatIdx);
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `${app.name}应用`);
      const box = document.createElement('div');
      box.className = 'aa-item-icon';
      const content = buildIconContent(app);
      if (typeof content === 'string') box.innerHTML = content; // 静态表/安装包矢量（项目既定链）
      else if (content) box.appendChild(content);
      const label = document.createElement('span');
      label.className = 'aa-item-label';
      label.textContent = app.name; // 用户可见名走 textContent（XSS 安全）
      item.appendChild(box);
      item.appendChild(label);
      bindItemEvents(item, app);
      grid.appendChild(item);
      flatIndexEls.push(item);
      flatIdx++;
    }
    listEl.appendChild(grid);
    if (sec.letter) {
      sec.startEl = grid;
      sec.startIndex = flatIdx - sec.apps.length;
    }
  }

  ensureFastScroller();
  if (fastScroller) {
    fastScroller.layout();
    // AOSP onItemCountChanged：childCount 变化重估 mLongList（MIN_PAGES 门控）+ thumb 重定位
    const visible = Math.max(1, Math.ceil(listEl.clientHeight / LIST_ITEM_H));
    fastScroller.onItemCountChanged(visible, flatIndexEls.length);
  }
  listEl.scrollTop = 0;
}

/** FastScroller 宿主：真实 DOM 几何（非 ITEM_H 近似——45 应用含分节头，几何即真相） */
function ensureFastScroller() {
  if (fastScroller) return;
  const overlay = listEl.querySelector('.md-fastscroller');
  const track = overlay.querySelector('.md-fs-track');
  const thumb = overlay.querySelector('.md-fs-thumb');

  // rect 相对几何（v8.58 e2e 探针实证：offsetTop 相对 offsetParent 而非滚动容器，
  // 分节头+悬浮层场景漂移 140px 把 thumb 推出轨道——rect 差值是唯一稳基准）
  const itemTop = (i) => {
    const el = flatIndexEls[i];
    if (!el) return 0;
    return el.getBoundingClientRect().top - listEl.getBoundingClientRect().top;
  };

  fastScroller = new FastScroller({
    getCount: () => flatIndexEls.length,
    getChildCount: () => flatIndexEls.length,
    getFirstVisiblePosition: () => fastScrollerHostFirst(),
    getChildAt: (i) => ({ top: itemTop(i), height: LIST_ITEM_H }),
    getHeight: () => listEl.clientHeight,
    getWidth: () => listEl.clientWidth,
    // 内容起点 = sticky 分节头 36px + 列表 padding-top 4px——AOSP incrementalPos 公式
    // (paddingTop - child.top)/child.height 以此对齐首项静止位（否则 pos 恒 -0.02、
    // thumb 顶出轨道、命中区错位——v8.58 探针实证）
    getPaddingTop: () => HEADER_H + 4,
    getPaddingBottom: () => 24,
    getClipToPadding: () => true,
    scrollToPosition: (i) => {
      const idx = clamp(i, 0, flatIndexEls.length - 1);
      const el = flatIndexEls[idx];
      if (!el) return;
      // 滚到该条目所在分节头之下（AOSP：分节头吸附顶缘）——rect 相对位移 + 当前 scrollTop
      const delta = el.getBoundingClientRect().top - listEl.getBoundingClientRect().top;
      listEl.scrollTop = Math.max(0, listEl.scrollTop + delta - HEADER_H);
      updateBubbleForIndex(idx);
    },
    requestDisallowInterceptTouchEvent: () => {},
  }, {
    thumbView: thumb,
    trackView: track,
    previewView: previewEl,
    touchSlop: 8,
    sections: sectionLetters, // 活引用：重渲染原地变更，mSections.length 动态读取
    sectionIndexer: {
      getSectionForPosition: (firstVisibleItem) => {
        // firstVisibleItem ≈ 视口顶第一条目的分节序号
        const idx = clamp(firstVisibleItem, 0, flatIndexEls.length - 1);
        let sec = 0;
        for (let s = 0; s < sections.length; s++) {
          if (sections[s].startIndex <= idx) sec = s;
        }
        return sec;
      },
      getPositionForSection: (section) => {
        const sec = sections[clamp(section, 0, sections.length - 1)];
        return sec ? sec.startIndex : 0;
      },
    },
  });

  // scroll 喂法：AOSP onScroll(first, visibleCount, total)——visible 取实际可容纳行数
  listEl.addEventListener('scroll', () => {
    const visible = Math.max(1, Math.ceil(listEl.clientHeight / LIST_ITEM_H));
    fastScroller.onScroll(fastScrollerHostFirst(), visible, flatIndexEls.length);
  }, { passive: true });

  // ==================== 指针转发管线（scroll-fx 同款：FastScroller 优先消费） ====================
  let fsPointerId = null;
  let fsDrag = false;
  const fsLocal = (e) => {
    const rect = listEl.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };
  const onFsMove = (e) => {
    if (!fsDrag || e.pointerId !== fsPointerId) return;
    const [px, py] = fsLocal(e);
    fastScroller.onTouchEvent('move', px, py);
  };
  const onFsFinish = (e, cancelled) => {
    if (!fsDrag || e.pointerId !== fsPointerId) return;
    fsDrag = false;
    fsPointerId = null;
    window.removeEventListener('pointermove', onFsMove);
    window.removeEventListener('pointerup', onFsUp);
    window.removeEventListener('pointercancel', onFsCancel);
    const [px, py] = fsLocal(e);
    fastScroller.onTouchEvent(cancelled ? 'cancel' : 'up', px, py);
  };
  const onFsUp = (e) => onFsFinish(e, false);
  const onFsCancel = (e) => onFsFinish(e, true);
  listEl.addEventListener('pointerdown', (e) => {
    if (fsPointerId !== null || !active) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const [px, py] = fsLocal(e);
    if (fastScroller.onTouchEvent('down', px, py)) {
      fsDrag = true;
      fsPointerId = e.pointerId;
      clearTimeout(lpTimer); // rail 拖拽消费：同点位条目长按让位
      try { listEl.setPointerCapture(e.pointerId); } catch (err) {}
      window.addEventListener('pointermove', onFsMove, { passive: true });
      window.addEventListener('pointerup', onFsUp, { passive: true });
      window.addEventListener('pointercancel', onFsCancel, { passive: true });
    }
  }, { passive: true });
  // 调试探针（__qsDebug 同款惯例）：e2e/无头诊断 FastScroller 内部几何与状态
  try { (window.__allAppsDebug = window.__allAppsDebug || {}).fs = fastScroller; } catch (e) {}
}

function fastScrollerHostFirst() {
  const listTop = listEl.getBoundingClientRect().top;
  for (let i = 0; i < flatIndexEls.length; i++) {
    const rel = flatIndexEls[i].getBoundingClientRect().top - listTop;
    if (rel + LIST_ITEM_H > 0) return i;
  }
  return Math.max(0, flatIndexEls.length - 1);
}

/** 气泡字母跟随（FastScroller 只管定位，文本由宿主更新——scroll-fx 同分工） */
function updateBubbleForIndex(idx) {
  if (!previewEl || !sections.length) return;
  const idxClamped = clamp(idx, 0, flatIndexEls.length - 1);
  let letter = '#';
  for (const s of sections) {
    if (s.startIndex <= idxClamped) letter = s.letter;
  }
  previewEl.textContent = letter;
}

// ==================== 条目交互 ====================

function bindItemEvents(item, app) {
  // 点按启动：与桌面图标同链路（share-sheet openAppById —— 起飞动画从条目矩形出发）
  item.addEventListener('click', () => {
    if (lpFired) { lpFired = false; return; }
    const rect = item.getBoundingClientRect();
    try { window.__shareSheet.openAppById(app.id, rect); } catch (e) {
      try { window.__shareSheet.openAppById(app.id); } catch (e2) {}
    }
    closeAllApps();
  });
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
  });
  // 长按 → 上下文菜单（context-menu.js 同款：打开/小窗/Dock 添加管理）
  let sx = 0, sy = 0;
  item.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    sx = e.clientX; sy = e.clientY; lpFired = false;
    clearTimeout(lpTimer);
    lpTimer = setTimeout(() => {
      lpFired = true;
      showContextMenu(app, item, sx, sy);
    }, 450);
  });
  const cancelLp = () => clearTimeout(lpTimer);
  item.addEventListener('pointermove', (e) => {
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancelLp();
  });
  item.addEventListener('pointerup', cancelLp);
  item.addEventListener('pointercancel', cancelLp);
  item.addEventListener('pointerleave', cancelLp);
}

// ==================== 开合（AOSP 600ms 原值 + tokens.decel） ====================

/**
 * 打开抽屉（#73 双形态）：
 *   · 形态按当前视口判定（formFor），平板 = 浮层 bottom sheet；手机 = 全屏抽屉
 *   · 守卫：已激活 / 桌面编辑模式 / 锁屏态一律拒绝（#73 DoD「锁屏态两形态均不触发」）；
 *     应用窗口打开时仅平板允许（任务栏常驻 → 应用内可拉起浮层，#73 §三.9；手机是
 *     Launcher 状态机 state，应用内不可达——AOSP 原语义）
 * @param {string} [source]
 */
export function openAllApps(source = '') {
  const form = formFor(window.innerWidth);
  if (active) return false;
  if (state.isEditMode) return false;
  if (document.body.classList.contains('is-locked')) return false; // 锁屏禁触发
  if (state.isOpen && form !== 'tablet') return false; // 手机：应用内不可达
  activeForm = form;
  ensureOverlay(form);
  if (isPullPanelsActive()) closePullPanels(); // 抽屉与 shade 面板互斥（AOSP 状态机 NORMAL↔ALL_APPS 单态）
  closeContextMenu();
  if (hideTimer) { hideTimer(); hideTimer = null; }
  searchInput.value = '';
  // 先可见再渲染：FastScroller.layout() 需要真实 clientHeight（visibility:hidden 时
  // 几何全 0 → mThumbRange=0 → rail 永不可拖——v8.58 e2e 首跑实锤，时序即正确性）
  overlayEl.style.visibility = 'visible';
  void overlayEl.offsetHeight;
  renderList('');
  // 平板浮层：顶部留白 = 视口高/6（BottomSheetProfile.derivedTopPadding，CSS 变量承载）
  if (form === 'tablet') {
    overlayEl.style.setProperty('--aa-top-pad', `${topPaddingFor(window.innerHeight, 'tablet')}px`);
  } else {
    overlayEl.style.removeProperty('--aa-top-pad');
  }
  // 强制重排后再置 active：保证 600ms/267ms 过渡从起始帧起帧
  void overlayEl.offsetHeight;
  overlayEl.classList.add('active');
  active = true;
  window.__allAppsActive = true;
  try {
    window.dispatchEvent(new CustomEvent('all-apps-changed', { detail: { open: true, source, form } }));
  } catch (e) {}
  return true;
}

/**
 * 关闭抽屉（时长按形态取 AOSP 原值：手机 300 / 平板 267）。
 * 平板 ephemeral：动画收尾后**销毁 overlay DOM**（TaskbarAllAppsController
 * 「开时建、关时毁」原语义，v8.61）。
 * @param {string} [source]
 */
export function closeAllApps(source = '') {
  if (!active || !overlayEl) return false;
  const form = activeForm;
  overlayEl.classList.remove('active');
  active = false;
  window.__allAppsActive = false;
  if (hideTimer) hideTimer();
  hideTimer = after(closeMsFor(form), () => {
    hideTimer = null;
    if (active || !overlayEl) return;
    overlayEl.style.visibility = 'hidden';
    // 平板：关时毁（下次 open 重建 DOM + 监听，无残留）
    if (lifecycleFor(form) === 'ephemeral') destroyOverlay();
  });
  try {
    window.dispatchEvent(new CustomEvent('all-apps-changed', { detail: { open: false, source } }));
  } catch (e) {}
  return true;
}

/** 销毁 overlay DOM 与引用（平板 ephemeral 生命周期；手机 persistent 不走此路径） */
function destroyOverlay() {
  if (!overlayEl) return;
  overlayEl.remove();
  overlayEl = null;
  listEl = null;
  searchInput = null;
  previewEl = null;
  fastScroller = null; // FastScroller 监听均绑于 overlay 内部元素，随 DOM 移除失效
  window.removeEventListener('keydown', onGlobalKeydown);
}

// ==================== 初始化 ====================

/**
 * 注册 window 钩子（测试/磁贴/终端深链入口）+ 跨断点 resize 重建（#73 DoD：
 * 视口跨 768px 时旧形态销毁、新形态重建，无残留 DOM 与监听）。
 */
export function initAllApps() {
  window.__allApps = { open: () => openAllApps('api'), close: () => closeAllApps(), isActive: isAllAppsActive };
  window.addEventListener('resize', () => {
    const f = formFor(window.innerWidth);
    // 真相源 = 当前激活形态（activeForm）/ 常驻 DOM 的形态标记（dataset.form），
    // 而非事件序（open 与 resize 可能不同步）——跨断点即销毁重建
    const presentForm = active ? activeForm : (overlayEl ? overlayEl.dataset.form : f);
    if (f === presentForm) return;
    // 跨断点：开着则立即关闭（跳过动画，避免双形态样式混叠），随后销毁 DOM（若 tablet
    // 已走 ephemeral 路径则此处仅清理引用；phone 常驻 DOM 在此销毁，下次 open 重建）
    if (active) {
      active = false;
      window.__allAppsActive = false;
      if (hideTimer) { hideTimer(); hideTimer = null; }
    }
    destroyOverlay();
    try {
      window.dispatchEvent(new CustomEvent('all-apps-form-changed', { detail: { form: f } }));
    } catch (e) {}
  }, { passive: true });
}
