// ==================== sidebubble.js — #253 三段手势侧边栏小窗 ====================
//
// 思路提取：华为智慧多窗侧边栏（专利 WO2026108297A1——机制文本可考、**数值不公开**，
// 见 #213 调研 docs/research-harmony-multiwindow.md 第六节 → #253 施工卡）。
// 自创标注：下方 SB 常量表**全部为自创值**（依据 WO2026108297A1 思路提取，非权威值），
// #170 同律（#18 §7.2b 退级规则）；集中单文件头部便于后续真机调参（#253 §四）。
//
// 三段交互（#253 §一）：
//   ① 一段 · 弧形液滴跟手 —— 右缘按住停顿确认后横向拉出，「液滴」跟手位移，
//      半径随拉出距离小→大渐变，垂直轨迹走弧线（前段贴缘滑、后段追指）；
//   ② 二段 · 预设距离分离小球 —— 拉过 SEPARATE_DIST 阈值后液滴分离为独立小球，
//      图标两态可逆：< 阈值箭头（继续拉）／ ≥ 阈值圆形（可松手）；
//   ③ 三段 · 松手呼出 —— 分离后松手小球吸附停驻右缘 → 呼出侧边栏
//      （最近应用列 = recent-apps.js getRecentAppsList() 单源真实打开记录，非硬编码清单）
//      → 点选应用 enterMiniWindow() 以小窗形态打开（复用 #93 mini-window 层级管理，只读 API）。
//
// 手势仲裁（自创设计）：**停顿消歧** —— 右缘按住 HOLD_CONFIRM_MS 静止才进入待命接管；
// 快速滑动（停顿前已移动超 slop）让位既有 EDGE_RIGHT 返回手势（gestures.js），
// 零抢占零冲突。接管期 gestures.js onMove/onUp 经 isSideBubbleActive() 查询让位
// （与 isPullPanelsActive() 早退同构先例）。停顿 ≤ slop 抖动视为静止。
//
// 场景边界：父文档级 pointer 手势（iframe 应用内部按下不冒泡到父文档）——
// 桌面态 / 模块应用 chrome 区全链路可用；iframe 应用全屏内一期不劫持
// （子应用 PB 通道语义保留），停驻小球常驻可点呼出兜底全场景可用。
//
// 纪律：零新 window.__ 全局（#242 登记表闸门——供测试消费的纯函数全部走本模块 export）；
// Esc 可关（#55 纪律）；reduced-motion 降级；全令牌 var(--md-*)（含 --md-state- 状态层，
// I 断言同口径，见 css/sidebubble.css 与 tests/v253 I 项自检）。

import { state } from './state.js';
import { isReduceMotionActive } from './aosp/a11y-settings.js';
import { pinCtl } from './screen-pinning.js';
import { isPullPanelsActive } from './pull-down-gesture.js';
import { getRecentAppsList } from './recent-apps.js';
import { enterMiniWindow, restoreMiniWindow } from './mini-window.js';
import { getAppIconSVG, hasAppIcon } from './app-icons.js';
import { initialApps } from './apps-data.js';

// ==================== 自创常量区（全部自创 · 依据 WO2026108297A1 思路提取，非权威值） ====================
export const SB = Object.freeze({
  EDGE_ZONE: 36,            // 自创：右缘起始判定带 px（与返回手势共存靠停顿消歧，非触发带宽）
  HOLD_CONFIRM_MS: 240,     // 自创：停顿确认时长 ms（快速滑动让位返回手势的竞速窗口）
  HOLD_MOVE_SLOP: 8,        // 自创：停顿期内允许抖动 px（超即放弃待命，让位返回手势）
  SEPARATE_DIST: 76,        // 自创：二段分离阈值 px（拉出距离 ≥ 此值液滴分离为小球）
  ARC_RANGE: 140,           // 自创：弧形跟随范围 px（拉出前段液滴沿缘滑、后段追指指针 y）
  DROP_R_MIN: 11,           // 自创：液滴起始半径 px（跟手初期）
  DROP_R_MAX: 17,           // 自创：分离后小球半径 px
  REST_PROTRUDE: 10,        // 自创：停驻小球半嵌边缘探出 px（x = 视口右缘 - 探出）
  REST_TOP_MARGIN: 96,      // 自创：停驻 y 上钳制（避让状态栏区）
  REST_BOTTOM_MARGIN: 128,  // 自创：停驻 y 下钳制（避让导航条区）
  SNAP_MS: 180,             // 自创：松手吸附停驻动画时长 ms
  PANEL_W: 264,             // 自创：侧边栏宽 px（手机态 min(视口-32) 响应式钳制；平板态加宽）
  PANEL_MARGIN: 12,         // 自创：侧边栏与缘/球间距 px
  LIST_CAP: 8,              // 最近应用列上限（对齐 recent-apps #68 上限 8，非自创）
  SQUEEZE_REACH: 2,         // 自创：按压整排联动半径（压强扩散到相邻 ±2 项）
  SQUEEZE_MAX_SQUASH: 0.9,  // 自创：中心项按压压扁系数（scaleY）
  SQUEEZE_RADIUS_GAIN: 10,  // 自创：按压时邻项圆角增量上限 px（圆角变换融合）
});

/** 距离平方（停顿抖动判定用，免开方） */
function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

// ==================== 纯函数几何核（零 DOM，v253 测试直测） ====================

/**
 * 弧形轨迹 y（自创几何）：拉出初期液滴贴缘竖直滑移（y 不跟手），
 * 随 pull 增大逐渐追上指针 y —— 合成弧形运动轨迹。
 * @returns 液滴应在的 y
 */
export function arcY(y0, yPtr, pull) {
  const t = clamp(pull / SB.ARC_RANGE, 0, 1);
  return y0 + (yPtr - y0) * t * t; // 平滑二次缓动收尾，轨迹更贴「弧」感
}

/** 液滴半径随拉出渐变（小→大，一段语义；分离后恒 R_MAX） */
export function dropR(pull) {
  return lerp(SB.DROP_R_MIN, SB.DROP_R_MAX, pull / SB.SEPARATE_DIST);
}

/** 两态图标可逆判定：< 阈值箭头（一段）／ ≥ 阈值圆形（二段可松手） */
export function dropIcon(pull) {
  return pull >= SB.SEPARATE_DIST ? 'circle' : 'arrow';
}

/** 二段分离判定 */
export function isDetached(pull) {
  return pull >= SB.SEPARATE_DIST;
}

/** 松手停驻 y 钳制（避让状态栏/导航条） */
export function clampRestY(y, h) {
  return clamp(y, SB.REST_TOP_MARGIN, Math.max(SB.REST_TOP_MARGIN + 1, h - SB.REST_BOTTOM_MARGIN));
}

/**
 * squeeze-row 按压整排联动（自创公式；#253 验收⑤「squeeze-row 范式」）：
 * 按压中心项被压扁（scaleY 降至 SQUEEZE_MAX_SQUASH），压强按距离扩散到相邻项
 * （SQUEEZE_REACH 半径内衰减联动），同时融合圆角变换（邻项圆角按联动力增大）。
 * @param activeIdx 按压项下标；-1 表示无按压（全部复位）
 * @param count 项数
 * @returns [{scale, radius}] 每项形变参数
 */
export function squeezeRow(activeIdx, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    if (activeIdx < 0 || activeIdx >= count) {
      out.push({ scale: 1, radius: 0 });
      continue;
    }
    const d = Math.abs(i - activeIdx);
    if (d > SB.SQUEEZE_REACH) {
      out.push({ scale: 1, radius: 0 });
      continue;
    }
    // 自创：线性衰减 k（中心 1 → reach 处 0），压强扩散 + 圆角变换融合
    const k = 1 - d / (SB.SQUEEZE_REACH + 1);
    out.push({
      scale: 1 - (1 - SB.SQUEEZE_MAX_SQUASH) * k,
      radius: SB.SQUEEZE_RADIUS_GAIN * k,
    });
  }
  return out;
}

// ==================== 三段手势状态机（纯逻辑核，零 DOM） ====================

/**
 * 创建手势状态机实例。
 * phases：'idle'（待命）→ 'pending'（右缘按住停顿确认中）→ 'drip'（一段液滴跟手）
 *        → 'orb'（二段小球跟手）→ 'resting'（松手停驻）→ 'panel'（侧边栏展开）
 * 任意态可 cancel 回 idle；pending 超时未静止 / 抖动超 slop → abort（让位返回手势）。
 */
export function createGesture() {
  return {
    phase: 'idle',
    x0: 0, y0: 0, t0: 0,       // 起始按下点与时刻
    pull: 0,                    // 当前水平拉出量 px
    y: 0,                       // 当前液滴弧线 y
    restY: 0,                   // 松手停驻 y
    pointerId: null,            // 捕获的 pointer
  };
}

/**
 * 按下进入待命：右缘带内才受理（锁屏/固定/拉板/编辑态由接线层先行过滤）。
 * @returns true = 已受理进入 pending；false = 不受理
 */
export function gBegin(g, { x, y, t }, w) {
  if (g.phase !== 'idle') return false;
  if (x < w - SB.EDGE_ZONE) return false; // 不在右缘带内
  g.phase = 'pending';
  g.x0 = x; g.y0 = y; g.t0 = t;
  g.pull = 0; g.y = y;
  return true;
}

/**
 * 停顿确认推进（pending 期逐 move/tick 调用）：
 *   'keep'  —— 继续等待（未满时长且未超抖动）
 *   'armed' —— 停顿确认成功，进入一段跟手（接管）
 *   'abort' —— 停顿前已移动超 slop（用户意图是滑动 → 让位返回手势）
 */
export function gPending(g, { x, y, t }) {
  if (g.phase !== 'pending') return 'idle';
  const moved = dist2(x, y, g.x0, g.y0);
  if (moved > SB.HOLD_MOVE_SLOP * SB.HOLD_MOVE_SLOP) {
    g.phase = 'idle';
    return 'abort';
  }
  if (t - g.t0 >= SB.HOLD_CONFIRM_MS) {
    g.phase = 'drip';
    return 'armed';
  }
  return 'keep';
}

/**
 * 一/二段跟手推进（armed 后逐 move 调用）。
 * pull = 起始 x − 当前 x（向左拉出为正）；液滴 y 走弧线；跨过阈值自动 drip→orb。
 * @returns 渲染参数 { x, y, r, icon, phase }
 */
export function gDrag(g, { x, y }, w, h) {
  if (g.phase !== 'drip' && g.phase !== 'orb') return null;
  g.pull = clamp(g.x0 - x, 0, SB.PANEL_W);
  // 弧线约束只作用于一段液滴期（贴缘滑→追指的弧形轨迹）；
  // 二段分离（含跨阈值当次调用）小球即独立个体，解除弧线约束直接完全跟手
  g.y = isDetached(g.pull) ? clamp(y, 0, h) : clamp(arcY(g.y0, y, g.pull), 0, h);
  const r = dropR(g.pull);
  const wasDetached = g.phase === 'orb';
  g.phase = isDetached(g.pull) ? 'orb' : 'drip';
  return {
    x: w - g.pull - r, // 液滴中心 x（跟手左移）
    y: g.y,
    r,
    icon: dropIcon(g.pull),
    phase: g.phase,
    justDetached: !wasDetached && g.phase === 'orb', // 两态切换沿（供触觉/动画钩子）
  };
}

/**
 * 松手裁决（#253 三段语义）：
 *   orb（二段分离后）→ 小球吸附停驻 + 呼出侧边栏（'panel'）
 *   drip（一段内）   → 液滴回吸消失（'cancel'，不呼出——预设距离未达）
 */
export function gRelease(g, w, h) {
  if (g.phase === 'orb') {
    g.restY = clampRestY(g.y, h);
    g.phase = 'panel';
    return 'panel';
  }
  if (g.phase === 'drip') {
    g.phase = 'idle';
    return 'cancel';
  }
  return 'idle';
}

/** 取消（Esc / pointercancel / 面板外点击收起等）→ 回 idle（停驻球保留与否由接线层定） */
export function gCancel(g) {
  g.phase = 'idle';
  g.pull = 0;
}

/** 停驻小球点击 → 呼出侧边栏（resting → panel） */
export function gRestTap(g) {
  if (g.phase !== 'resting') return false;
  g.phase = 'panel';
  return true;
}

/** 侧边栏收起 → 小球保持停驻（panel → resting，可再次点开） */
export function gCollapse(g) {
  if (g.phase !== 'panel') return false;
  g.phase = 'resting';
  return true;
}

/** 侧边栏收起且清停驻球（resting/panel → idle） */
export function gDismiss(g) {
  if (g.phase !== 'panel' && g.phase !== 'resting') return false;
  g.phase = 'idle';
  g.pull = 0;
  return true;
}

// ==================== 壳层接线（DOM + Pointer 事件 + 侧边栏 UI） ====================

let gesture = null;
let armed = false;          // 本次手势是否已接管（gestures.js 让位判据）
let orbEl = null;           // 液滴/小球/停驻球共用元素
let panelEl = null;         // 侧边栏面板
let listEl = null;          // 最近应用列容器
let hideTimer = null;
let squeezeActive = -1;     // 当前按压项下标（-1 无）

/** gestures.js 让位查询（接管期 true —— onMove/onUp 早退，与 isPullPanelsActive 同构） */
export function isSideBubbleActive() {
  return !!(gesture && armed &&
    (gesture.phase === 'drip' || gesture.phase === 'orb' || gesture.phase === 'panel' || gesture.phase === 'resting'));
}

function appNameOf(appId) {
  const app = initialApps.find((a) => a.id === appId);
  return app ? app.name : (appId || '未知应用');
}

/** 液滴/小球渲染（transform 合帧写入，不 reflow） */
function renderOrb(o) {
  if (!orbEl) return;
  orbEl.classList.add('on');
  orbEl.classList.toggle('orb', o.icon === 'circle');
  orbEl.classList.toggle('resting', gesture && gesture.phase === 'resting');
  orbEl.style.width = o.r * 2 + 'px';
  orbEl.style.height = o.r * 2 + 'px';
  orbEl.style.transform = `translate3d(${Math.round(o.x)}px, ${Math.round(o.y - o.r)}px, 0)`;
}

/** 停驻球落位（吸附右缘半嵌） */
function renderResting() {
  if (!orbEl || !gesture) return;
  const r = SB.DROP_R_MAX;
  const x = window.innerWidth - SB.REST_PROTRUDE;
  orbEl.classList.add('on');
  orbEl.classList.add('orb');
  orbEl.classList.add('resting');
  orbEl.style.width = r * 2 + 'px';
  orbEl.style.height = r * 2 + 'px';
  orbEl.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(gesture.restY - r)}px, 0)`;
}

function orbHide() {
  if (!orbEl) return;
  orbEl.classList.remove('on');
  orbEl.classList.remove('orb');
  orbEl.classList.remove('resting');
}

/* ---------- 侧边栏面板 ---------- */

/** 最近应用列渲染（getRecentAppsList 单源，真实打开记录非硬编码；点过的小窗标记「小窗中」） */
function renderList() {
  if (!listEl) return;
  const ids = getRecentAppsList().slice(0, SB.LIST_CAP);
  listEl.textContent = '';
  if (!ids.length) {
    const empty = document.createElement('div');
    empty.className = 'sb-empty';
    empty.textContent = '暂无最近应用\n先打开一个应用再来';
    listEl.appendChild(empty);
    return;
  }
  ids.forEach((appId) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'sb-item';
    item.dataset.appId = appId;
    const icon = document.createElement('span');
    icon.className = 'sb-item-icon';
    if (hasAppIcon(appId)) icon.innerHTML = getAppIconSVG(appId);
    const name = document.createElement('span');
    name.className = 'sb-item-name';
    name.textContent = appNameOf(appId);
    const tag = document.createElement('span');
    tag.className = 'sb-item-tag';
    tag.textContent = window.__miniWindowAll && window.__miniWindowAll().includes(appId) ? '小窗中' : '小窗';
    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(tag);
    listEl.appendChild(item);
  });
}

/** squeeze-row 应用（按压整排联动：压强扩散 + 圆角变换融合） */
function applySqueeze(idx, count) {
  if (!listEl) return;
  const rows = squeezeRow(idx, count);
  const items = listEl.querySelectorAll('.sb-item');
  items.forEach((el, i) => {
    const p = rows[i] || { scale: 1, radius: 0 };
    el.style.transform = `scaleY(${p.scale.toFixed(3)})`;
    el.style.borderRadius = `var(--md-r-md, 12px)`;
    el.style.setProperty('--sb-squeeze-r', p.radius + 'px');
  });
}

function openPanel() {
  if (!panelEl || !gesture) return;
  clearTimeout(hideTimer);
  renderList();
  panelEl.classList.add('open');
  panelEl.setAttribute('aria-hidden', 'false');
  orbEl && orbEl.classList.remove('resting'); // 面板展开期隐藏停驻球
}

function collapsePanel(keepResting) {
  if (!panelEl) return;
  panelEl.classList.remove('open');
  panelEl.setAttribute('aria-hidden', 'true');
  if (keepResting && gesture) {
    renderResting();
  } else {
    orbHide();
  }
}

function onListPointerDown(e) {
  const item = e.target.closest && e.target.closest('.sb-item');
  if (!item || !listEl) return;
  const items = Array.from(listEl.querySelectorAll('.sb-item'));
  squeezeActive = items.indexOf(item);
  applySqueeze(squeezeActive, items.length);
}

function onListPointerUp() {
  if (squeezeActive < 0) return;
  applySqueeze(-1, 0);
  squeezeActive = -1;
}

function onListClick(e) {
  const item = e.target.closest && e.target.closest('.sb-item');
  if (!item || !gesture) return;
  const appId = item.dataset.appId;
  if (!appId) return;
  // 点选 → 小窗打开（复用 #93 mini-window 层级管理只读 API；fromRect 供展开动画取矩形）
  const rect = item.getBoundingClientRect();
  try {
    const all = (typeof window.__miniWindowAll === 'function') ? window.__miniWindowAll() : [];
    if (all.includes(appId)) restoreMiniWindow(appId); // 已有小窗 → 还原（最小化后回侧边栏语义）
    else enterMiniWindow(appId, { fromRect: rect });
  } catch (err) { /* 层级管理异常不阻塞面板收起 */ }
  gDismiss(gesture);
  armed = false;
  collapsePanel(false);
  orbHide();
}

/* ---------- 右缘三段手势接线 ---------- */

function gestureAllowed() {
  // 与 gestures.onDown 早退链同构：锁屏 / 屏幕固定 / 拉板激活期不受理
  if (document.body.classList.contains('is-locked')) return false;
  if (pinCtl.isPinned()) return false;
  if (isPullPanelsActive()) return false;
  return true;
}

function onPointerDown(e) {
  if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
  if (!gestureAllowed()) return;
  // 侧边栏展开期点面板外 → 收起（保留停驻球）
  if (gesture && gesture.phase === 'panel') {
    if (panelEl && !panelEl.contains(e.target) && e.target !== orbEl) {
      gCollapse(gesture);
      collapsePanel(true);
    }
    return;
  }
  if (gesture && gesture.phase === 'resting' && (e.target === orbEl || (orbEl && orbEl.contains(e.target)))) {
    // 停驻小球点击 → 呼出侧边栏（三段后的复呼路径）
    if (gRestTap(gesture)) { armed = false; openPanel(); }
    return;
  }
  if (!gesture) gesture = createGesture();
  const ok = gBegin(gesture, { x: e.clientX, y: e.clientY, t: performance.now() }, window.innerWidth);
  if (ok) {
    gesture.pointerId = e.pointerId;
    try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
  }
}

function onPointerMove(e) {
  if (!gesture) return;
  if (gesture.pointerId !== null && e.pointerId !== gesture.pointerId) return;
  if (gesture.phase === 'pending') {
    const v = gPending(gesture, { x: e.clientX, y: e.clientY, t: performance.now() });
    if (v === 'abort') { gesture.pointerId = null; }        // 让位返回手势（armed 仍 false）
    else if (v === 'armed') { armed = true; }               // 接管：gestures.js onMove/onUp 让位
    return;
  }
  if (gesture.phase === 'drip' || gesture.phase === 'orb') {
    const o = gDrag(gesture, { x: e.clientX, y: e.clientY }, window.innerWidth, window.innerHeight);
    if (o) {
      renderOrb(o);
      if (o.justDetached && !isReduceMotionActive()) {
        // 分离瞬间小球回弹强调（自创动效：分离沿两帧放大脉动）
        orbEl && orbEl.classList.add('detach-pulse');
        setTimeout(() => orbEl && orbEl.classList.remove('detach-pulse'), 180);
      }
    }
  }
}

function onPointerUp(e) {
  if (!gesture) return;
  if (gesture.pointerId !== null && e.pointerId !== gesture.pointerId) return;
  if (gesture.phase === 'pending') {
    // 停顿确认前松手：未成型手势，静默丢弃（未接管过返回手势，零影响）
    gCancel(gesture);
    gesture.pointerId = null;
    return;
  }
  if (gesture.phase === 'drip' || gesture.phase === 'orb') {
    const v = gRelease(gesture, window.innerWidth, window.innerHeight);
    gesture.pointerId = null;
    armed = false; // 接管结束（面板/停驻期 gestures 正常运行）
    if (v === 'panel') {
      renderResting();
      openPanel();
    } else {
      // 一段内松手：液滴回吸消失
      if (!isReduceMotionActive() && orbEl) {
        orbEl.classList.add('snap-back');
        setTimeout(() => { orbHide(); orbEl && orbEl.classList.remove('snap-back'); }, SB.SNAP_MS);
      } else {
        orbHide();
      }
    }
  }
}

function onPointercancel() {
  if (!gesture) return;
  armed = false;
  if (gesture.phase === 'panel') { gCollapse(gesture); collapsePanel(true); return; }
  gCancel(gesture);
  orbHide();
}

function onKeydown(e) {
  // Esc 可关（#55 纪律）：侧边栏展开期收起（保留停驻球），停驻球无面板时一并清球
  if (e.key !== 'Escape') return;
  if (!gesture) return;
  if (gesture.phase === 'panel') {
    gCollapse(gesture);
    collapsePanel(true);
    e.stopPropagation();
  } else if (gesture.phase === 'resting') {
    gDismiss(gesture);
    orbHide();
  }
}

/** 最近应用列变化 → 面板展开期实时刷新（recordAppOpened 广播 dock-refresh-requested） */
function bindListRefresh() {
  window.addEventListener('dock-refresh-requested', () => {
    if (panelEl && panelEl.classList.contains('open')) renderList();
  });
  // 小窗生命周期 → 「小窗中」标记刷新（#93 层级管理事件，bubbles.js 同款消费）
  window.addEventListener('mini-window-changed', () => {
    if (panelEl && panelEl.classList.contains('open')) renderList();
  });
}

export function initSideBubble() {
  if (orbEl) return; // 幂等
  gesture = createGesture();

  orbEl = document.createElement('div');
  orbEl.id = 'mdSidebubbleOrb';
  orbEl.setAttribute('aria-hidden', 'true');
  const arrow = document.createElement('span');
  arrow.className = 'sb-ico sb-ico-arrow';
  arrow.textContent = '‹'; // 两态之一：箭头（一段拉出中）
  const dot = document.createElement('span');
  dot.className = 'sb-ico sb-ico-circle'; // 两态之二：圆形（二段可松手 / 停驻）
  orbEl.appendChild(arrow);
  orbEl.appendChild(dot);
  document.body.appendChild(orbEl);

  panelEl = document.createElement('aside');
  panelEl.id = 'mdSidebubblePanel';
  panelEl.className = 'md-sidebubble';
  panelEl.setAttribute('aria-hidden', 'true');
  panelEl.setAttribute('role', 'dialog');
  panelEl.setAttribute('aria-label', '侧边栏小窗 · 最近应用');
  const head = document.createElement('div');
  head.className = 'sb-head';
  const title = document.createElement('span');
  title.className = 'sb-title';
  title.textContent = '侧边栏';
  const hint = document.createElement('span');
  hint.className = 'sb-hint';
  hint.textContent = '点按应用以小窗打开';
  head.appendChild(title);
  head.appendChild(hint);
  listEl = document.createElement('div');
  listEl.className = 'sb-list';
  listEl.setAttribute('role', 'listbox');
  panelEl.appendChild(head);
  panelEl.appendChild(listEl);
  document.body.appendChild(panelEl);

  // 事件接线：capture 档（先于桌面页横滑/返回手势消费；停顿消歧保证不误触）
  document.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('pointermove', onPointerMove, true);
  window.addEventListener('pointerup', onPointerUp, true);
  window.addEventListener('pointercancel', onPointercancel, true);
  document.addEventListener('keydown', onKeydown, true);

  listEl.addEventListener('pointerdown', onListPointerDown);
  window.addEventListener('pointerup', onListPointerUp);
  window.addEventListener('pointercancel', onListPointerUp);
  listEl.addEventListener('click', onListClick);

  bindListRefresh();
}
