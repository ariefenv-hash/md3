// ==================== nav-bar.js — 三键导航传统模式（融合手势共存） ====================
//
// 设计要点：
//   1. 矢量三键（用户设计线稿）：勾角返回 / 悬挑屋顶主屏 / 三横线多任务，
//      stroke 线性语言统一（round cap/join，viewBox 48 网格，stroke-width 5.2）；
//   2. 默认居中；按住主屏键 1 秒进入拖移模式，左右移动整条导航栏，
//      松手吸附到 左 / 中 / 右 三档并持久化（设置 › 系统导航 亦可直接选择）；
//   3. 融合手势：三键开启时手势导航完全不受影响 —— 从导航栏上滑仍会
//      直通全局手势引擎（应用跟手缩小、停顿唤出多任务、快速甩动关闭），
//      纯桌面上滑则直接唤出多任务。轻点才是按钮，拖动即手势，互不误触；
//   4. 手势判定阈值本就调得较高（底部 75px / 边缘 38px，见 config.js），
//      导航栏悬浮其上不会抢走系统手势。

import { state } from './state.js';
import { popSubPage } from './page-stack.js';
import { closeApp } from './app-window.js';
// v7.28 预览式返回：返回键路由（页内返回优先于关闭应用）
import { getActivePBTarget, pbSend } from './iframe-pb.js';
import { getActiveModuleBack } from './module-back.js';
import { openRecentApps, closeRecentApps } from './recent-apps.js';
import { onDown, onMove, onUp, beginQuickSwitch, moveQuickSwitch, endQuickSwitch } from './gestures.js';
import { clamp } from './utils.js';

const ENABLE_KEY = 'ios-desktop:navbar-enabled';
const POS_KEY = 'ios-desktop:navbar-pos';

let barEl = null;
let enabled = false;
let pos = 'center'; // left | center | right

// ---------- 存取 ----------

export function getNavBarEnabled() { return enabled; }

export function setNavBarEnabled(v, opts = {}) {
  enabled = !!v;
  try { localStorage.setItem(ENABLE_KEY, enabled ? '1' : '0'); } catch (e) {}
  if (barEl) {
    const wasHidden = barEl.classList.contains('hidden');
    barEl.classList.toggle('hidden', !enabled);
    // 开启瞬间：三键错峰弹入（仅 transform/opacity 合成器动画，见 nav-bar.css）
    if (enabled && wasHidden) {
      barEl.classList.remove('nvb-pop');
      void barEl.offsetWidth; // 强制回流确保重播（仅开关时执行一次，成本可忽略）
      barEl.classList.add('nvb-pop');
    }
  }
  if (!enabled && opts.toast !== false && typeof window !== 'undefined' && window.showSystemToast) {
    window.showSystemToast('已切换为手势导航（三键已隐藏）');
  }
  if (enabled && opts.toast !== false && typeof window !== 'undefined' && window.showSystemToast) {
    window.showSystemToast('三键导航已开启 · 手势仍然可用 · 长按主屏键可左右移动');
  }
  document.dispatchEvent(new CustomEvent('navbar-changed', { detail: { enabled, pos } }));
}

export function getNavBarPos() { return pos; }

export function setNavBarPos(p, opts = {}) {
  if (!['left', 'center', 'right'].includes(p)) return;
  pos = p;
  try { localStorage.setItem(POS_KEY, p); } catch (e) {}
  if (barEl) {
    barEl.classList.remove('pos-left', 'pos-center', 'pos-right', 'free');
    barEl.classList.add('pos-' + p);
    barEl.style.left = '';
  }
  if (opts.toast && typeof window !== 'undefined' && window.showSystemToast) {
    window.showSystemToast('导航栏位置：' + (p === 'left' ? '居左' : p === 'right' ? '居右' : '居中'));
  }
  document.dispatchEvent(new CustomEvent('navbar-changed', { detail: { enabled, pos } }));
}

function loadPrefs() {
  try {
    const e = localStorage.getItem(ENABLE_KEY);
    enabled = e === '1';
    const p = localStorage.getItem(POS_KEY);
    if (['left', 'center', 'right'].includes(p)) pos = p;
  } catch (e) {}
}

// ---------- 系统动作 ----------

function sysBack() {
  const recentsEl = document.getElementById('recentAppsOverlay');
  if (recentsEl && recentsEl.classList.contains('active')) { closeRecentApps(); return; }
  if (state.isOpen) {
    if (state.navHistory.length > 1) { popSubPage(); return; } // 宿主子页返回
    // v7.28 预览式返回：页内返回优先于关闭（模块应用消费器 > iframe PB，与手势路由同序）
    const mb = getActiveModuleBack();
    if (mb) { mb.triggerBack(); return; }
    const pb = getActivePBTarget();
    if (pb && pb.canBack) { pbSend(pb.win, { type: 'PB_TRIGGER_BACK' }); return; }
    popSubPage(); return; // 根页则关闭应用
  }
}

function sysHome() {
  const recentsEl = document.getElementById('recentAppsOverlay');
  if (recentsEl && recentsEl.classList.contains('active')) closeRecentApps();
  if (state.isOpen) { closeApp(0, 0, 0); return; }
  const split = window.__splitGestures;
  if (split && split.active()) { split.dismiss(); return; }
}

function sysRecents() {
  const recentsEl = document.getElementById('recentAppsOverlay');
  if (recentsEl && recentsEl.classList.contains('active')) { closeRecentApps(); return; }
  openRecentApps(state.currentApp ? state.currentApp.id : null);
}

// ---------- 融合手势（导航栏上的上滑直通系统手势引擎） ----------

const fusion = {
  active: false,       // 指针按下中
  mode: 'idle',        // idle | gesture | desktop-gesture | reposition
  startX: 0, startY: 0, lastY: 0, lastT: 0, vy: 0,
  longPressTimer: null,
  suppressClick: false,
};

function fusionDown(x, y) {
  fusion.active = true;
  fusion.mode = 'idle';
  fusion.startX = x; fusion.startY = y; fusion.lastY = y; fusion.lastT = performance.now();
  fusion.vy = 0;
  fusion.suppressClick = false;
  // 长按主屏键 1s → 进入拖移定位（轻点主屏键不受影响）
  if (fusion.longPressTimer) clearTimeout(fusion.longPressTimer);
  fusion.longPressTimer = setTimeout(() => {
    if (!fusion.active || fusion.mode !== 'idle') return;
    fusion.mode = 'reposition';
    fusion.longPressTimer = null;
    fusion.suppressClick = true;
    if (barEl) {
      barEl.classList.add('repositioning', 'free');
      if (navigator.vibrate) navigator.vibrate([18, 40, 18]);
      if (window.showSystemToast) window.showSystemToast('拖移模式 · 左右移动后松手吸附');
    }
  }, 1000);
}

function fusionMove(x, y) {
  if (!fusion.active) return;
  const dx = x - fusion.startX;
  const dy = y - fusion.startY;

  // 拖移导航栏位置（v7.34 transform 通道：left 一次冻结在拖移起点真实位置，
  // 随后每帧只写 translateX 增量 —— will-change: transform 常驻合成层，全程
  // 零 layout 零 repaint；旧实现逐帧写 left 为逐帧布局。transition 显式关断，
  // 防吸附过渡与拖拽逐帧写入对抗）
  if (fusion.mode === 'reposition') {
    if (barEl) {
      if (!fusion.barW) {
        fusion.barW = barEl.offsetWidth || 200;
        const r0 = barEl.getBoundingClientRect(); // 含吸附飞行中的实时位置（可中途接管）
        fusion.startLeft = r0.left;
        fusion.pendingLeft = r0.left;
        barEl.style.left = r0.left + 'px';
        barEl.style.transition = 'none';
      }
      fusion.pendingLeft = clamp(x - fusion.barW / 2, 6, window.innerWidth - fusion.barW - 6);
      if (!fusion.reposRafId) {
        fusion.reposRafId = requestAnimationFrame(() => {
          fusion.reposRafId = 0;
          if (fusion.mode === 'reposition' && barEl) {
            barEl.style.transform = `translateX(${(fusion.pendingLeft - fusion.startLeft).toFixed(1)}px)`;
          }
        });
      }
    }
    return;
  }

  // v7.23：尚未定型时横向主导 → 底部横滑快速切换（左右轻滑切相邻应用/唤起最近应用）。
  // 与上滑手势互斥：|dx| > |dy|×1.45 才接管，纯竖滑语义不受影响
  if (fusion.mode === 'idle' && Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy) * 1.45) {
    if (fusion.longPressTimer) { clearTimeout(fusion.longPressTimer); fusion.longPressTimer = null; }
    if (beginQuickSwitch(fusion.startX, fusion.startY)) {
      fusion.mode = 'quickswitch';
      fusion.suppressClick = true;
      moveQuickSwitch(x, y);
      return;
    }
  }
  if (fusion.mode === 'quickswitch') {
    moveQuickSwitch(x, y);
    return;
  }

  // 尚未定型：明显上滑 → 转入系统手势
  if (fusion.mode === 'idle' && dy < -12) {
    if (fusion.longPressTimer) { clearTimeout(fusion.longPressTimer); fusion.longPressTimer = null; }
    fusion.mode = state.isOpen ? 'gesture' : 'desktop-gesture';
    fusion.suppressClick = true;
    if (fusion.mode === 'gesture') {
      onDown(x, fusion.startY, 'BOTTOM'); // 从栏位起点开始，跟手缩放全程 1:1
    }
  }

  if (fusion.mode === 'gesture') {
    const now = performance.now();
    const dt = Math.max(1, now - fusion.lastT);
    fusion.vy = 0.7 * fusion.vy + 0.3 * ((y - fusion.lastY) / dt) * 1000; // px/s 平滑
    fusion.lastY = y; fusion.lastT = now;
    onMove(x, y);
  } else if (fusion.mode === 'desktop-gesture') {
    fusion.lastY = y;
  }
}

function fusionUp(x, y) {
  if (!fusion.active) return;
  fusion.active = false;
  if (fusion.longPressTimer) { clearTimeout(fusion.longPressTimer); fusion.longPressTimer = null; }

  if (fusion.mode === 'reposition') {
    // 吸附：先 flush 待落帧的 transform（gBCR 含 transform，吸附档位判定取真实视觉位置）
    if (barEl) {
      // 长按后未发生移动（barW=0 → startLeft 未测量）：就地补测，防飞行 NaN
      if (!fusion.barW) {
        fusion.barW = barEl.offsetWidth || 200;
        fusion.startLeft = barEl.getBoundingClientRect().left;
      }
      if (fusion.reposRafId) {
        cancelAnimationFrame(fusion.reposRafId);
        fusion.reposRafId = 0;
        barEl.style.transform = `translateX(${(fusion.pendingLeft - fusion.startLeft).toFixed(1)}px)`;
      }
      const rect = barEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const third = window.innerWidth / 3;
      const target = cx < third ? 'left' : cx > third * 2 ? 'right' : 'center';
      barEl.classList.remove('repositioning');
      const reduced = typeof matchMedia !== 'undefined' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        setNavBarPos(target, { toast: true });
        barEl.style.transform = '';
        barEl.style.transition = '';
      } else {
        // v7.34 吸附飞行：恢复 0.28s transform 过渡，从释放点平滑滑向目标档位；
        // 落定（transitionend + 兑底双保险）后换 pos 类并清内联 —— 帧级零跳变
        const vw = window.innerWidth;
        const targetLeft = target === 'left' ? 16
          : target === 'right' ? vw - 16 - fusion.barW
          : (vw - fusion.barW) / 2;
        const endDx = targetLeft - fusion.startLeft;
        barEl.style.transition = '';
        requestAnimationFrame(() => {
          if (!barEl || fusion.mode === 'reposition') return; // 已被新拖拽接管
          barEl.style.transform = `translateX(${endDx.toFixed(1)}px)`;
          let settled = false;
          const onEnd = (ev) => { if (ev.target === barEl && ev.propertyName === 'transform') finish(); };
          const finish = () => {
            if (settled) return;
            settled = true;
            barEl.removeEventListener('transitionend', onEnd);
            clearTimeout(fb);
            if (fusion.mode === 'reposition' || !barEl.isConnected) return; // 新拖拽接管
            setNavBarPos(target, { toast: true });
            barEl.style.transform = '';
          };
          const fb = setTimeout(finish, 380);
          barEl.addEventListener('transitionend', onEnd);
        });
      }
      if (navigator.vibrate) navigator.vibrate(14);
    }
    fusion.barW = 0; // 下次拖移重新量宽（期间视口可能变化）
    fusion.mode = 'idle';
    return;
  }

  if (fusion.mode === 'gesture') {
    onUp(); // 全套系统手势收尾（关闭 / 回弹 / 停顿唤出多任务）
    fusion.mode = 'idle';
    return;
  }

  // v7.23：快速切换收尾（提交切换 / 回弹均由 gestures.endQuickSwitch 统一处理）
  if (fusion.mode === 'quickswitch') {
    endQuickSwitch();
    fusion.mode = 'idle';
    return;
  }

  if (fusion.mode === 'desktop-gesture') {
    const dy = fusion.startY - y;
    if (dy > 45) openRecentApps(); // 纯桌面上滑 = 多任务
    fusion.mode = 'idle';
    return;
  }

  // idle → 轻点：交给按钮 click 处理（suppressClick 时不响应）
  fusion.mode = 'idle';
}

// ---------- 初始化 ----------

export function initNavBar() {
  if (barEl) return;
  loadPrefs();

  barEl = document.createElement('div');
  barEl.id = 'sysNavBar';
  barEl.className = 'sys-nav-bar pos-' + pos + (enabled ? '' : ' hidden');
  barEl.setAttribute('role', 'navigation');
  barEl.setAttribute('aria-label', '系统导航栏');
  // 图标：用户矢量线稿（viewBox 48 网格）—— 返回勾角 / 悬挑屋顶 / 三横线；
  // stroke 粗细与端点样式统一由 nav-bar.css 的 .nvb-icon 规则驱动（currentColor 接主题令牌）
  barEl.innerHTML = `
    <button class="nvb-btn nvb-back" data-nvb="back" aria-label="返回">
      <svg class="nvb-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path d="M14 7.5 7.8 13.5H36v23.5H7.8"/>
      </svg>
    </button>
    <button class="nvb-btn nvb-home" data-nvb="home" aria-label="主屏（长按可左右移动导航栏）">
      <svg class="nvb-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <polyline points="6,18 24,7.5 42,18"/>
        <path d="M11 23v12.5a4 4 0 0 0 4 4h18a4 4 0 0 0 4-4V23"/>
      </svg>
    </button>
    <button class="nvb-btn nvb-recents" data-nvb="recents" aria-label="多任务">
      <svg class="nvb-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path d="M8 12h32M8 24h32M8 36h32"/>
      </svg>
    </button>
  `;
  document.body.appendChild(barEl);

  // 按键点击：单监听器委托（data-nvb 分发，事件路径更短、未来增键零改绑定）
  barEl.addEventListener('click', (e) => {
    // fix(P3)：键盘 Enter/Space 触发的 click（e.detail === 0）不走 suppressClick 消费 ——
    // suppressClick 只用于抑制指针手势结束后浏览器补发的合成 click；
    // 而 pointercancel 路径不产生 click，残留的 true 会吞掉下一次键盘点击。
    // 键盘 click 到达时清除残留标记（该场景下合成 click 已不可能再来）。
    if (e.detail === 0) fusion.suppressClick = false;
    else if (fusion.suppressClick) { fusion.suppressClick = false; return; }
    const btn = e.target.closest('.nvb-btn');
    if (!btn) return;
    if (btn.dataset.nvb === 'back') sysBack();
    else if (btn.dataset.nvb === 'home') sysHome();
    else if (btn.dataset.nvb === 'recents') sysRecents();
  });

  // 融合手势 + 长按拖移（pointer 统一处理）
  barEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.nvb-btn:not(.nvb-home)') && e.pointerType !== 'touch') {
      // 鼠标点按钮：不进入手势/长按流程，保持点击干脆
      fusionDown(e.clientX, e.clientY);
      fusion.longPressTimer && clearTimeout(fusion.longPressTimer);
      fusion.longPressTimer = null;
      return;
    }
    try { barEl.setPointerCapture(e.pointerId); } catch (err) {}
    fusionDown(e.clientX, e.clientY);
  });
  barEl.addEventListener('pointermove', (e) => fusionMove(e.clientX, e.clientY));
  barEl.addEventListener('pointerup', (e) => fusionUp(e.clientX, e.clientY));
  barEl.addEventListener('pointercancel', (e) => fusionUp(e.clientX, e.clientY));

  // 设置页桥
  window.__navBar = {
    enabled: getNavBarEnabled,
    pos: getNavBarPos,
    setEnabled: (v) => setNavBarEnabled(v),
    setPos: (p) => setNavBarPos(p, { toast: true }),
  };
}
