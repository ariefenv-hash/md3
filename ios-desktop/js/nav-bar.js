// ==================== nav-bar.js — 三键导航传统模式（融合手势共存） ====================
//
// 设计要点：
//   1. 矢量三键（v11.08 #88 路线 A 裁决：AOSP ic_sysbar_back/home/recent.xml 权威形态
//      逐字对齐——20dp / viewport 20 / fill 实心，四源文件全文入库
//      docs/reference/frameworks-base/systemui/navbar-icons/；fillColor
//      ?attr/singleToneColor → currentColor 主题令牌映射零裸色；原用户线稿
//      （勾角返回 / 悬挑屋顶主屏 / 三横线多任务，viewBox 48 stroke 5.2）退役在录；
//      back 键 AOSP autoMirrored="true" RTL 镜像锚——md3 无 RTL 布局面，镜像语义
//      不激活，诚实标注不扩范围）；
//   2. 默认居中；按住主屏键 1 秒进入拖移模式，左右移动整条导航栏，
//      松手吸附到 左 / 中 / 右 三档并持久化（设置 › 系统导航 亦可直接选择）；
//      ★ 合法超越标注（#88 建议动作 3 · 铁律 #2）：AOSP 三键位置由
//      config_navBarInteractionMode / overlay 决定，无用户可调三档——md3 pos 三档
//      系自有扩展，保留理由：悬浮导航栏（非系统底栏占位）下的桌面空间自适应需要；
//   3. 融合手势：三键开启时手势导航完全不受影响 —— 从导航栏上滑仍会
//      直通全局手势引擎（应用跟手缩小、停顿唤出多任务、快速甩动关闭），
//      纯桌面上滑则直接唤出多任务。轻点才是按钮，拖动即手势，互不误触；
//   4. 手势判定阈值本就调得较高（底部 75px / 边缘 38px，见 config.js），
//      导航栏悬浮其上不会抢走系统手势。

import { state } from './state.js';
import { isReduceMotionActive } from './aosp/a11y-settings.js';
import { popSubPage } from './page-stack.js';
import { closeApp } from './app-window.js';
// v7.28 预览式返回：返回键路由（页内返回优先于关闭应用）
import { getActivePBTarget, pbSend } from './iframe-pb.js';
import { getActiveModuleBack } from './module-back.js';
import { openRecentApps, closeRecentApps, exitScreenPinning, escapeToastOnce } from './recent-apps.js';
import { onDown, onMove, onUp, beginQuickSwitch, moveQuickSwitch, endQuickSwitch } from './gestures.js';
import { clamp } from './utils.js';
// #98 屏幕固定：pinned 拦截/长按退出（状态机单例 + AOSP ViewConfiguration 长按时长）
import { pinCtl, BACK_LONGPRESS_MS } from './screen-pinning.js';
// v9.94 #107：导航栏附加音量键（超越项，§7.2b 裁决：默认关/移动端可见）
import { stepVolumeBySteps } from './volume-dialog.js';
import {
  VOLUME_KEYS_STORE_KEY,
  normalizeVolumeKeysMode,
  resolveVolumeKeysVisible,
} from './aosp/navbar-volume-keys.js';

const ENABLE_KEY = 'ios-desktop:navbar-enabled';
const POS_KEY = 'ios-desktop:navbar-pos';

let barEl = null;
let enabled = false;
let pos = 'center'; // left | center | right
let vkeysMode = 'default';   // v9.94 #107：default | on | off（aosp/navbar-volume-keys.js 三态）
let volBtns = [];            // v9.94 #107：附加音量键引用（syncVolumeKeys 显隐驱动）
let backLongPressTimer = 0;   // #98：pinned 态长按返回退出计时器（pointerup/pointercancel 取消）

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
    // v9.94 #107：附加音量键三态（非法值归 default——normalize 内置）
    vkeysMode = normalizeVolumeKeysMode(localStorage.getItem(VOLUME_KEYS_STORE_KEY) || 'default');
  } catch (e) {}
}

// ---------- v9.94 #107 附加音量键 ----------

/** 触摸指针检测（纯逻辑 isTouch 注入源）：真触摸设备 = 移动端语义
 *  （§7.2b「移动端默认可见」的判定面；桌面 pointer:fine 且零触点 → 隐藏） */
const isTouchPointer = () => {
  try {
    if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) return true;
  } catch (e) {}
  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
};

/** 附加键显隐同步（resolveVolumeKeysVisible 判定表消费：on 恒显 / off 恒隐 /
    default 触摸可见；hidden 属性驱动——display:none 天然不入 hit-test 与 tab 序） */
function syncVolumeKeys() {
  const visible = resolveVolumeKeysVisible({ mode: vkeysMode, isTouch: isTouchPointer() });
  volBtns.forEach((b) => { b.hidden = !visible; });
}

export function getNavBarVolumeKeys() { return vkeysMode; }

export function setNavBarVolumeKeys(mode, opts = {}) {
  vkeysMode = normalizeVolumeKeysMode(mode);
  try { localStorage.setItem(VOLUME_KEYS_STORE_KEY, vkeysMode); } catch (e) {}
  syncVolumeKeys();
  if (opts.toast && typeof window !== 'undefined' && window.showSystemToast) {
    window.showSystemToast('导航栏附加音量键：' + (vkeysMode === 'on' ? '已开启' : vkeysMode === 'off' ? '已关闭' : '默认（移动端显示）'));
  }
  document.dispatchEvent(new CustomEvent('navbar-changed', { detail: { enabled, pos, volumeKeys: vkeysMode } }));
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
    // #98 屏幕固定：pinned 态根页返回 = 关闭应用被拦（AOSP back 根页语义 + escape toast）；
    // 应用内页返回（上方三分支）不受限（AOSP back-internal 语义保留）
    if (pinCtl.intercept('back-root') === 'blocked') { escapeToastOnce(); return; }
    popSubPage(); return; // 根页则关闭应用
  }
}

function sysHome() {
  // #98 屏幕固定：pinned 态主屏无效（AOSP Home 拦截 + escape toast，1s 节流）
  if (pinCtl.intercept('home') === 'blocked') { escapeToastOnce(); return; }
  const recentsEl = document.getElementById('recentAppsOverlay');
  if (recentsEl && recentsEl.classList.contains('active')) {
    // v7.63：Home 语义 = 回桌面（挂起实例保留在后台列表），关场结算负责复位桌面残留
    closeRecentApps({ resumeSuspended: false });
  }
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
  lastDownBtn: null,   // #98 e2e 实测坑：home 键 touch/mouse 路径走 setPointerCapture，
                       // pointerup 与合成 click 被重定向到 barEl（click target=barEl），
                       // 按钮委托 closest('.nvb-btn') 永远落空 —— down 时记录按钮供委托回落
};

function fusionDown(x, y) {
  fusion.active = true;
  fusion.mode = 'idle';
  fusion.oneHandedFired = false; // v9.94 #204：下拉触发一次性门（move 连续去重）
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
    // v9.94 #204：单手态上滑导航条 = 退出（OneHandedTouchHandler 上滑退出语义；
    // AOSP 单手态上滑导航条先退出单手不进 home 手势——吞掉本次手势链）
    if (window.__oneHanded && window.__oneHanded.isIn()) {
      if (fusion.longPressTimer) { clearTimeout(fusion.longPressTimer); fusion.longPressTimer = null; }
      fusion.mode = 'gesture';
      fusion.suppressClick = true;
      window.__oneHanded.exit();
      return;
    }
    if (fusion.longPressTimer) { clearTimeout(fusion.longPressTimer); fusion.longPressTimer = null; }
    fusion.mode = state.isOpen ? 'gesture' : 'desktop-gesture';
    fusion.suppressClick = true;
    if (fusion.mode === 'gesture') {
      onDown(x, fusion.startY, 'BOTTOM'); // 从栏位起点开始，跟手缩放全程 1:1
    }
  }

  // v9.94 #204：导航条下拉触发单手模式（swipe_down_to_enter 语义；与 pull-down-gesture
  // 的屏幕上缘下拉天然不冲突——两个触发面，#204 表格裁决；纵向意图门 |dx|<24）
  if (fusion.mode === 'idle' && dy > 12 && Math.abs(dx) < 24 && !fusion.oneHandedFired) {
    if (window.__oneHanded && !window.__oneHanded.isIn()) {
      if (fusion.longPressTimer) { clearTimeout(fusion.longPressTimer); fusion.longPressTimer = null; }
      fusion.oneHandedFired = true;
      fusion.suppressClick = true;
      window.__oneHanded.enter();
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
      const reduced = isReduceMotionActive();
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
  // 三键图标：v11.08 #88 路线 A —— AOSP ic_sysbar_*.xml 权威 pathData 逐字
  // （20dp / viewport 20 / fill 实心；源文件入库 docs/reference/frameworks-base/
  //  systemui/navbar-icons/，back 1291B · home 1151B · recent 1172B sha 在录）。
  // fill 语义由 nav-bar.css .nvb-icon path 规则驱动（currentColor 接主题令牌）；
  // .nvb-vol 音量键（#107 超越项）维持 48 网格 stroke 线稿 —— AOSP navbar 无音量键，
  // 无权威可对齐（#88 范围外，诚实标注）。
  barEl.innerHTML = `
    <button class="nvb-btn nvb-back" data-nvb="back" aria-label="返回">
      <svg class="nvb-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M15.5417 1.66669C15.1833 1.66669 14.8417 1.76669 14.5333 1.94169L3.21667 8.74169C2.775 9.00002 2.5 9.48335 2.5 10C2.5 10.5167 2.775 11 3.21667 11.2584L14.5333 18.05C14.8417 18.2334 15.1833 18.325 15.5417 18.325C16.625 18.325 17.5 17.45 17.5 16.3667V3.62502C17.5 2.54169 16.625 1.66669 15.5417 1.66669Z"/>
      </svg>
    </button>
    <button class="nvb-btn nvb-home" data-nvb="home" aria-label="主屏（长按可左右移动导航栏）">
      <svg class="nvb-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M10.0001 18.3334C5.40008 18.3334 1.66675 14.6 1.66675 10C1.66675 5.40002 5.40008 1.66669 10.0001 1.66669C14.6001 1.66669 18.3334 5.40002 18.3334 10C18.3334 14.6 14.6001 18.3334 10.0001 18.3334Z"/>
      </svg>
    </button>
    <button class="nvb-btn nvb-recents" data-nvb="recents" aria-label="多任务">
      <svg class="nvb-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M4.47634 2.5H15.5241C16.6164 2.5 17.5002 3.38382 17.5002 4.4761V15.5239C17.5002 16.6162 16.6164 17.5 15.5241 17.5H4.47634C3.38407 17.5 2.50024 16.6162 2.50024 15.5239V4.4761C2.50024 3.38382 3.38407 2.5 4.47634 2.5Z"/>
      </svg>
    </button>
    <!-- v9.94 #107 附加音量键（超越项）：栏尾成组不扩三键；图标维持 48 网格
         stroke 线稿（5.2 · round）—— #88 后三键已 AOSP fill 权威对齐，音量键无
         AOSP navbar 权威可对齐故线稿保留；扬声器械形 + 加/减号；hidden 初始态由
         syncVolumeKeys 按三态判定回填 -->
    <button class="nvb-btn nvb-vol" data-nvb="volume-down" aria-label="音量减" hidden>
      <svg class="nvb-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path d="M8 19v10h7l9 7V12l-9 7H8z"/>
        <path d="M33 24h9"/>
      </svg>
    </button>
    <button class="nvb-btn nvb-vol" data-nvb="volume-up" aria-label="音量加" hidden>
      <svg class="nvb-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path d="M8 19v10h7l9 7V12l-9 7H8z"/>
        <path d="M33 24h9M37.5 19.5v9"/>
      </svg>
    </button>
  `;
  document.body.appendChild(barEl);
  volBtns = [...barEl.querySelectorAll('.nvb-vol')];
  syncVolumeKeys();

  // 按键点击：单监听器委托（data-nvb 分发，事件路径更短、未来增键零改绑定）
  barEl.addEventListener('click', (e) => {
    // fix(P3)：键盘 Enter/Space 触发的 click（e.detail === 0）不走 suppressClick 消费 ——
    // suppressClick 只用于抑制指针手势结束后浏览器补发的合成 click；
    // 而 pointercancel 路径不产生 click，残留的 true 会吞掉下一次键盘点击。
    // 键盘 click 到达时清除残留标记（该场景下合成 click 已不可能再来）。
    if (e.detail === 0) fusion.suppressClick = false;
    else if (fusion.suppressClick) { fusion.suppressClick = false; fusion.lastDownBtn = null; return; }
    // #98 e2e 实测坑修复：capture 重定向后 click target=barEl，closest 落空 ——
    // 回落到 pointerdown 记录的按钮（仍在 barEl 内校验，防跨容器残留）
    const btn = e.target.closest('.nvb-btn')
      || (fusion.lastDownBtn && barEl.contains(fusion.lastDownBtn) ? fusion.lastDownBtn : null);
    fusion.lastDownBtn = null;
    if (!btn) return;
    if (btn.dataset.nvb === 'back') sysBack();
    else if (btn.dataset.nvb === 'home') sysHome();
    else if (btn.dataset.nvb === 'recents') sysRecents();
    // v9.94 #107：附加音量键（步数语义 ±1×KEY_STEP 单点换算；#109 目标流判定 /
    // #108 非模态面板 / 3s 自动收起全量复用）
    else if (btn.dataset.nvb === 'volume-down') stepVolumeBySteps(-1);
    else if (btn.dataset.nvb === 'volume-up') stepVolumeBySteps(1);
  });

  // 融合手势 + 长按拖移（pointer 统一处理）
  barEl.addEventListener('pointerdown', (e) => {
    // v9.94 #107：附加音量键不进融合手势（长按主屏拖移/上滑关闭/快速切换语义面
    // 全部不适用——纯按压按钮，click 委托直落；否则按住 1s 会误入拖移模式）
    if (e.target.closest('.nvb-vol')) return;
    const downBtn0 = e.target.closest('.nvb-btn');
    if (downBtn0) fusion.lastDownBtn = downBtn0;   // capture 前记录（home 路径 click 会重定向）
    // #98 屏幕固定：pinned 态长按返回键退出（400ms = ViewConfiguration.getLongPressTimeout()
    // 框架默认值；唯一退出通道，触屏/鼠标双路径均生效，先于融合手势分支挂计时）
    const nvbBtn = e.target.closest('.nvb-btn');
    if (nvbBtn && nvbBtn.dataset.nvb === 'back' && pinCtl.isPinned()) {
      if (backLongPressTimer) clearTimeout(backLongPressTimer);
      backLongPressTimer = setTimeout(() => {
        backLongPressTimer = 0;
        fusion.suppressClick = true;   // 长按已消费本次按压：抑制随后合成 click（否则退出后立刻再走一次 sysBack）
        exitScreenPinning();
      }, BACK_LONGPRESS_MS);
      const cancelLP = () => {
        if (backLongPressTimer) { clearTimeout(backLongPressTimer); backLongPressTimer = 0; }
        window.removeEventListener('pointerup', cancelLP);
        window.removeEventListener('pointercancel', cancelLP);
      };
      window.addEventListener('pointerup', cancelLP);
      window.addEventListener('pointercancel', cancelLP);
    }
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
    // v9.94 #107：附加音量键三态（设置页 › 系统导航消费）
    volumeKeys: getNavBarVolumeKeys,
    setVolumeKeys: (m) => setNavBarVolumeKeys(m, { toast: true }),
  };
}
