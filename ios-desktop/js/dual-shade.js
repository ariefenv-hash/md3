// ==================== dual-shade.js — Android 17 Dual Shade 分家模式 ====================
// 源码同构（android17-release @94b4c163）：
//  * ShadeModeInteractor.kt：ShadeMode.Dual（Settings.Secure.DUAL_SHADE 用户开关，
//    config_dualShadeEnabledByDefault=true 默认开启）
//  * OverlayShade.kt：浮动面板宽 = min(shade_panel_width=600dp, 半屏)；QS=TopEnd 右浮、
//    通知=TopStart 左浮；圆角 overlay_shade_panel_shape_radius=46dp（sw600dp=36dp）；
//    VerticalExpandContainerSpec 垂直展开容器变换；scrim 变暗
//  * shade_config.xml：config_invocationGestureSplitRatio=0.75（左75%通知 / 右25% QS）
//  * 视频1（BV1B7rnBdEHh）实锤：设置页 Panels=Separate / Combined (classic)；
//    QS 浮动面板顶行 pencil+gear 左 / 电源符号右

const MODE_KEY = 'android17:shadeMode';
const GESTURE_SPLIT_RATIO = 0.75; // config_invocationGestureSplitRatio

let suppressNextSettingsClick = false;

/** 当前面板模式：'dual'（Separate 分家，AOSP 17 默认）| 'classic'（Combined 经典单面板） */
export function getShadeMode() {
  if (document.body.dataset.shadeMode) return document.body.dataset.shadeMode;
  let m = 'classic'; // 上线默认：回归安全（AOSP 源码默认 dual，经开关/URL ?shadeMode=dual 可达）
  try { m = localStorage.getItem(MODE_KEY) || 'classic'; } catch (e) { /* 忽略 */ }
  if (m !== 'dual' && m !== 'classic') m = 'classic';
  return m;
}

export function setShadeMode(mode) {
  if (mode !== 'dual' && mode !== 'classic') return;
  try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* 忽略 */ }
  applyMode(mode);
  document.dispatchEvent(new CustomEvent('md3-shade-mode-changed', { detail: { mode } }));
}

/* ---------------- DOM 迁移（classic ↔ dual 共享同一批活节点，监听器随节点走） ---------------- */

const moved = []; // { el, parent, next } 还原用

function moveInto(el, container) {
  if (!el || !container) return;
  moved.push({ el, parent: el.parentNode, next: el.nextSibling });
  container.appendChild(el);
}

function restoreAll() {
  while (moved.length) {
    const { el, parent, next } = moved.pop();
    if (parent) parent.insertBefore(el, next);
  }
}

/** 关闭经典面板（懒引用避免启动期循环依赖：pull-down-gesture 不反向依赖本模块） */
let classicCloser = null;
export function registerClassicCloser(fn) { classicCloser = fn; }

function applyMode(mode) {
  const root = document.getElementById('dualShadeRoot');
  if (!root) return;
  try {
    _applyModeInner(mode, root);
  } catch (e) {
    // 防护：迁移链异常绝不中断 main.js 启动序列（E2E 实锤教训）
    console.warn('[dual-shade] applyMode failed:', e);
  }
}

function _applyModeInner(mode, root) {
  const dual = mode === 'dual';
  document.body.dataset.shadeMode = mode;
  root.setAttribute('aria-hidden', dual ? 'false' : 'true');

  if (dual) {
    // 经典面板若开着先收起
    if (classicCloser) { try { classicCloser(); } catch (e) { /* 忽略 */ } }
    // 关闭态复位（迁移后首次展示必须从顶部滑入而非闪现）
    root.querySelectorAll('.dual-panel').forEach((p) => p.classList.remove('open', 'dragging'));
    root.querySelectorAll('.dual-scrim').forEach((s) => s.classList.remove('open'));

    // 通知面板 = CollapsedShadeHeader + 通知滚动区（QQS 留在经典轨道内，dual 下随轨道整体隐藏）
    const np = document.getElementById('dualNotifPanel');
    moveInto(document.getElementById('collapsedShadeHeader'), np);
    moveInto(document.getElementById('notiPanelScroll'), np);
    // QS 面板 = 顶行(编辑/齿轮|电源) + 经典 QS 滚动内容（大钟头部 dual 下 CSS 隐藏）
    const qp = document.getElementById('dualQsPanel');
    let top = qp.querySelector('.dual-qs-top');
    if (!top) {
      // 骨架兜底（理论上 index.html 已内置；E2E 实锤：缺失会中断迁移链）
      top = document.createElement('div');
      top.className = 'dual-qs-top';
      top.innerHTML = '<div class="dqt-left"></div><div class="dqt-right"></div>';
      qp.appendChild(top);
    }
    moveInto(document.getElementById('qsEditBtn'), top.querySelector('.dqt-left'));
    moveInto(document.getElementById('qsSettingsBtn'), top.querySelector('.dqt-left'));
    moveInto(document.getElementById('qsPowerBtn'), top.querySelector('.dqt-right'));
    moveInto(document.getElementById('qsPanelScroll'), qp);
    // 顶行插到滚动内容之前
    qp.insertBefore(top, qp.firstChild);
  } else {
    closePanel('notif', true);
    closePanel('qs', true);
    restoreAll();
  }
  syncPopoverRadios();
}

/* ---------------- 面板开合（VerticalExpandContainerSpec：顶部垂直展开 + 内容纵向 squish） ---------------- */

function panelEl(which) { return document.getElementById(which === 'notif' ? 'dualNotifPanel' : 'dualQsPanel'); }
function scrimEl(which) { return document.getElementById(which === 'notif' ? 'dualScrimNotif' : 'dualScrimQs'); }

export function openDualPanel(which) {
  const p = panelEl(which);
  if (!p || p.classList.contains('open')) return;
  p.classList.add('open');           // CSS: translateY(-105%)→0 + 内容 squish 关键帧
  scrimEl(which)?.classList.add('open');
}

export function closePanel(which, instant = false) {
  const p = panelEl(which);
  if (!p) return;
  if (instant) p.classList.add('no-anim');
  p.classList.remove('open');
  scrimEl(which)?.classList.remove('open');
  if (instant) requestAnimationFrame(() => p.classList.remove('no-anim'));
}

export function toggleDualPanel(which) {
  const p = panelEl(which);
  if (p && p.classList.contains('open')) closePanel(which);
  else openDualPanel(which);
}

export function isDualPanelOpen(which) {
  const p = panelEl(which);
  return !!(p && p.classList.contains('open'));
}

/* ---------------- 手势：顶部分区拖拽（0.75 split） ---------------- */

function bindHit(hit, which) {
  let startY = 0, dragging = false, pid = null, movedPx = 0, downTs = 0;
  const panel = () => panelEl(which);

  hit.addEventListener('pointerdown', (e) => {
    if (document.body.dataset.shadeMode !== 'dual') return;
    e.stopPropagation();
    dragging = true; pid = e.pointerId; startY = e.clientY; movedPx = 0;
    downTs = performance.now();
    const p = panel();
    p.classList.add('dragging'); // 去过渡，跟手
    try { hit.setPointerCapture(pid); } catch (err) { /* 忽略 */ }
  });

  hit.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    const dy = Math.max(0, e.clientY - startY);
    movedPx = Math.max(movedPx, Math.abs(e.clientY - startY));
    const h = panel().offsetHeight || 400;
    const over = dy > h ? h + (dy - h) * 0.2 : dy; // 底部过拉阻尼
    panel().style.transform = `translateY(${(-h + over).toFixed(1)}px)`;
  });

  const finish = (e) => {
    if (!dragging || e.pointerId !== pid) return;
    dragging = false;
    const p = panel();
    const h = p.offsetHeight || 400;
    const dy = Math.max(0, e.clientY - startY);
    p.classList.remove('dragging');
    p.style.transform = '';
    // 仅真实拖拽（>4px）才在此裁决开合；纯点击交给 click 切换（避免开着时点顶区"先关再开"）
    if (movedPx > 4) {
      // 阈值 = 0.25 高度 或 速度 > 0.6 px/ms（跟手快甩即开）
      const vy = (e.clientY - startY) / Math.max(1, performance.now() - downTs);
      if (dy > h * 0.25 || vy > 0.6) openDualPanel(which);
      else closePanel(which, true);
    }
  };
  hit.addEventListener('pointerup', finish);
  hit.addEventListener('pointercancel', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    dragging = false;
    const p = panel();
    p.classList.remove('dragging');
    p.style.transform = '';
  });

  // 纯点击（无拖拽位移）= 切换面板（状态栏右25%/左75% 分区，源码同构）
  hit.addEventListener('click', (e) => {
    if (document.body.dataset.shadeMode !== 'dual') return;
    e.stopPropagation();
    if (movedPx <= 8) toggleDualPanel(which);
  });
}

/* ---------------- Panels 模式弹层（长按 QS 齿轮呼出） ---------------- */

export function openPanelsPopover() {
  const ov = document.getElementById('panelsPopoverOverlay');
  if (!ov) return;
  ov.hidden = false;
  requestAnimationFrame(() => ov.classList.add('active'));
  syncPopoverRadios();
}

export function closePanelsPopover() {
  const ov = document.getElementById('panelsPopoverOverlay');
  if (!ov || ov.hidden) return;
  ov.classList.remove('active');
  setTimeout(() => { ov.hidden = true; }, 180);
}

function syncPopoverRadios() {
  const mode = getShadeMode();
  document.querySelectorAll('#panelsPopoverOverlay .pp-option').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.mode === mode);
  });
}

function initPopover() {
  const ov = document.getElementById('panelsPopoverOverlay');
  if (!ov) return;
  ov.addEventListener('click', (e) => {
    const opt = e.target.closest('.pp-option');
    if (opt) {
      setShadeMode(opt.dataset.mode);
      closePanelsPopover();
      return;
    }
    if (e.target === ov) closePanelsPopover();
  });

  // 长按 QS 齿轮（≥450ms）= 呼出 Panels 弹层；短按仍进设置应用（原逻辑不动）
  const gear = document.getElementById('qsSettingsBtn');
  if (gear) {
    let timer = null;
    gear.addEventListener('pointerdown', () => {
      timer = setTimeout(() => {
        timer = null;
        suppressNextSettingsClick = true;
        openPanelsPopover();
        if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) { /* 忽略 */ } }
      }, 450);
    });
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    gear.addEventListener('pointerup', cancel);
    gear.addEventListener('pointercancel', cancel);
    gear.addEventListener('pointerleave', cancel);
    gear.addEventListener('click', (e) => {
      if (suppressNextSettingsClick) { e.stopImmediatePropagation(); e.preventDefault(); suppressNextSettingsClick = false; }
    }, true);
  }
}

/* ---------------- 初始化 ---------------- */

export function initDualShade() {
  const root = document.getElementById('dualShadeRoot');
  if (!root) return;

  // URL 参数优先（E2E 用）：?shadeMode=classic|dual
  try {
    const q = new URLSearchParams(location.search).get('shadeMode');
    if (q === 'classic' || q === 'dual') { try { localStorage.setItem(MODE_KEY, q); } catch (e) { /* 忽略 */ } document.body.dataset.shadeMode = q; }
  } catch (e) { /* 忽略 */ }

  // 顶部分区命中区：高度 = 状态栏高（面板顶缘在其下，互不遮挡）
  bindHit(document.getElementById('dualHitNotif'), 'notif');
  bindHit(document.getElementById('dualHitQs'), 'qs');
  const zone = document.getElementById('dualInvocationZone');
  const sb = document.getElementById('statusBar');
  const syncZoneH = () => { if (zone && sb) zone.style.height = `${sb.offsetHeight || 30}px`; };
  syncZoneH();
  window.addEventListener('resize', syncZoneH);

  // scrim 点击关闭
  ['dualScrimNotif', 'dualScrimQs'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      closePanel(e.currentTarget.dataset.target);
    });
  });

  initPopover();
  applyMode(getShadeMode());
}
