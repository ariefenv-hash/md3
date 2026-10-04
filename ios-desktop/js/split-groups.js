// ==================== split-groups.js — 分屏组合：多组持久化 + 桌面组合图标托盘 ====================
//
// v7.33 新增。设计要点：
//   1. 「向上轻划 / 按 home」退出分屏不再解散 —— 分屏以组合形式向中心缩放退出，
//      成为一枚持久化的「分屏组合」（localStorage ios-desktop:split-groups）。
//      最多 4 组共存，同一配对去重刷新（更新比例/时间戳并置顶），超出上限 LRU 淘汰最旧。
//   2. 桌面底部组合图标托盘（#splitGroupTray，append 到 #desktop）：
//      轻点组合图标 = 对应卡片组从图标位置「指哪打哪」再现（split-screen.enterSplit）；
//      长按 500ms = 移除该组合（缩放飞出 + toast）。
//   3. 依赖方向单向：split-screen.js 静态依赖本模块（保存组合）；本模块仅在用户轻点时
//      动态 import split-screen.js（无静态环）。main.js 启动时 initSplitGroups() 自举渲染。
//   4. 托盘出现时桌面网格让位（.has-split-tray 提升 .page-grid 底部 padding，
//      变化发生在组合动画遮罩之下，用户不可见）。

import { initialApps } from './apps-data.js';
import { getAppIconSVG } from './app-icons.js';
import { createDynamicIconHTML } from './dynamic-icons.js';

const STORAGE_KEY = 'ios-desktop:split-groups';
const MAX_GROUPS = 4;
const LONGPRESS_MS = 500;

let groups = [];   // [{ id, aId, bId, ratio, axis, ts }] — id 为排序后的配对键 'a|b'
let trayEl = null;
let booted = false;

// ---------- 小工具 ----------

function pairKey(aId, bId) {
  return [aId, bId].sort().join('|');
}

function toast(msg) {
  if (typeof window !== 'undefined' && window.showSystemToast) window.showSystemToast(msg);
}

function appIconHTML(app) {
  return app.type ? createDynamicIconHTML(app.type, false) : getAppIconSVG(app.id);
}

function findApp(appId) {
  return initialApps.find((a) => a.id === appId) || null;
}

// ---------- 持久化 ----------

function loadGroups() {
  groups = [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return;
    const seen = new Set();
    for (const g of raw) {
      if (!g || typeof g !== 'object') continue;
      const aId = String(g.aId || ''), bId = String(g.bId || '');
      if (!findApp(aId) || !findApp(bId) || aId === bId) continue; // 应用失效/非法配对 → 丢弃
      const id = pairKey(aId, bId);
      if (seen.has(id)) continue;
      seen.add(id);
      groups.push({
        id,
        aId,
        bId,
        ratio: Math.min(0.76, Math.max(0.24, Number(g.ratio) || 0.5)),
        axis: g.axis === 'x' ? 'x' : 'y',
        ts: Number(g.ts) || Date.now(),
      });
    }
  } catch (e) { groups = []; }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (e) { /* 存储满等异常不阻断交互 */ }
}

// ---------- 组合数据 API ----------

export function listSplitGroups() {
  return groups.slice();
}

export function getSplitGroup(id) {
  return groups.find((g) => g.id === id) || null;
}

/**
 * 保存（或刷新）一个分屏组合。
 * @param {string} aId / bId  两应用 id
 * @param {number} ratio      退出时的分隔比例（恢复时还原）
 * @param {string} axis       退出时的分屏轴
 * @param {Object} opts       { silentRender: true } —— 组合动画期间已由幽灵图标接管入场，
 *                            托盘 chip 静默落位（不播 pop-in）
 * @returns {{ group: Object, evicted: Object|null }} 保存结果（evicted = 被 LRU 淘汰的旧组）
 */
export function saveSplitGroup(aId, bId, ratio = 0.5, axis = 'y', opts = {}) {
  const appA = findApp(aId), appB = findApp(bId);
  let evicted = null;
  if (appA && appB && aId !== bId) {
    const id = pairKey(aId, bId);
    const prev = groups.find((g) => g.id === id);
    if (prev) {
      prev.ratio = Math.min(0.76, Math.max(0.24, Number(ratio) || 0.5));
      prev.axis = axis === 'x' ? 'x' : 'y';
      prev.ts = Date.now();
      // MRU 置顶
      groups = groups.filter((g) => g.id !== id);
      groups.unshift(prev);
    } else {
      if (groups.length >= MAX_GROUPS) {
        evicted = groups.pop(); // 最旧（数组尾）淘汰
      }
      groups.unshift({
        id, aId, bId,
        ratio: Math.min(0.76, Math.max(0.24, Number(ratio) || 0.5)),
        axis: axis === 'x' ? 'x' : 'y',
        ts: Date.now(),
      });
    }
    persist();
    renderTray({ silent: !!opts.silentRender });
  }
  return { group: getSplitGroup(pairKey(aId, bId)), evicted };
}

export function removeSplitGroup(id) {
  const before = groups.length;
  groups = groups.filter((g) => g.id !== id);
  if (groups.length !== before) {
    persist();
    renderTray();
    return true;
  }
  return false;
}

/** 组合图标（两枚应用图标对角叠放）— chip 与组合幽灵共用同一视觉语言 */
export function buildPairIconHTML(aId, bId) {
  const appA = findApp(aId), appB = findApp(bId);
  if (!appA || !appB) return '';
  return `<span class="sgi sgi-a">${appIconHTML(appA)}</span><span class="sgi sgi-b">${appIconHTML(appB)}</span>`;
}

/** 量取托盘中某组合图标的屏幕矩形（恢复动画「指哪打哪」的展开原点） */
export function getChipRect(groupId) {
  const el = trayEl && trayEl.querySelector(`.split-group-chip[data-group="${groupId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? r : null;
}

// ---------- 托盘渲染（keyed 最小量 reconcile） ----------

function buildChipEl(group) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'split-group-chip';
  el.dataset.group = group.id;
  const appA = findApp(group.aId), appB = findApp(group.bId);
  const nameA = appA ? appA.name : group.aId;
  const nameB = appB ? appB.name : group.bId;
  el.setAttribute('aria-label', `分屏组合：${nameA} 与 ${nameB}，轻点展开，长按移除`);
  el.title = `${nameA} + ${nameB}`;
  el.innerHTML = buildPairIconHTML(group.aId, group.bId);
  bindChipEvents(el, group);
  return el;
}

function bindChipEvents(el, group) {
  let lpTimer = 0;
  let longPressed = false;
  let sx = 0, sy = 0;

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    longPressed = false;
    sx = e.clientX; sy = e.clientY;
    clearTimeout(lpTimer);
    lpTimer = setTimeout(() => {
      lpTimer = 0;
      longPressed = true;
      if (navigator.vibrate) navigator.vibrate(18);
      removeWithAnimation(el, group);
    }, LONGPRESS_MS);
  });

  const cancelLp = (e) => {
    if (lpTimer) { clearTimeout(lpTimer); lpTimer = 0; }
    // 位移超阈值视为拖动/滑动，取消本次轻点语义
    if (e && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) longPressed = true;
  };
  el.addEventListener('pointermove', cancelLp);
  el.addEventListener('pointerleave', cancelLp);

  el.addEventListener('pointerup', (e) => {
    cancelLp(e);
    if (longPressed) { longPressed = false; return; }
    if (groupExists(group.id)) restoreGroup(group, el);
  });
  el.addEventListener('pointercancel', () => { clearTimeout(lpTimer); lpTimer = 0; });
  // 触屏长按不弹原生上下文菜单（自定义长按移除语义）
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

function groupExists(id) {
  return groups.some((g) => g.id === id);
}

/** 轻点 → 卡片组从图标位置再现（动态 import 规避静态循环依赖） */
function restoreGroup(group, chipEl) {
  const rect = chipEl.getBoundingClientRect();
  chipEl.classList.add('pressed'); // 按压反馈：图标位置缩一点，展开动画从原矩形起飞
  setTimeout(() => chipEl.classList.remove('pressed'), 260);
  import('./split-screen.js').then((m) => {
    try { m.restoreFromGroup(group, rect); } catch (err) { /* 见 m.restoreFromGroup 内 toast */ }
  }).catch(() => toast('无法恢复分屏组合'));
}

/** 长按 → 飞出移除 */
function removeWithAnimation(el, group) {
  if (!groupExists(group.id)) return;
  el.style.transition = 'transform 0.26s cubic-bezier(0.4, 0, 0.9, 0.4), opacity 0.24s ease';
  el.style.transform = 'scale(0.3) translateY(-26px)';
  el.style.opacity = '0';
  const target = group;
  setTimeout(() => {
    removeSplitGroup(target.id);
    toast('已移除分屏组合');
  }, 240);
}

function syncDesktopClass() {
  const desktop = document.getElementById('desktop');
  if (desktop) desktop.classList.remove('has-split-tray');
}

export function renderTray(opts = {}) {
  // 原生 Android 16 设计纪律：分屏组合直接归拢至多任务后台卡片流中，不在桌面上常驻显示托盘
  const desktop = document.getElementById('desktop');
  if (desktop) {
    desktop.classList.remove('has-split-tray');
    const oldTray = document.getElementById('splitGroupTray');
    if (oldTray) oldTray.remove();
  }
}

// ---------- 自举 ----------
export function initSplitGroups() {
  loadGroups();
  booted = true;
  renderTray();
}

/** 供测试 / E2E 探针 */
export function isSplitGroupsBooted() {
  return booted;
}

if (typeof window !== 'undefined') {
  window.__splitGroups = {
    list: listSplitGroups,
    get: getSplitGroup,
    remove: removeSplitGroup,
  };
}
