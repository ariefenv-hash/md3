// ==================== recent-apps.js — Android 16 / Pixel 10 MD3 3D堆叠流式多任务后台 ====================
//
// 核心亮点:
//   1. 3D 深度堆叠视差与景深虚化引擎 (3D Stacked Coverflow with continuous parametric interpolation & depth blur)
//   2. 真正的连续流式拖拽 (Continuous fluid touch dragging) — 卡片跟随手指位移连续无级滑动，1:1 像素级跟手
//   3. 动力学惯性滚动与高精度弹簧对齐 (Inertia Momentum & RK4 Spring Snapping)
//   4. 从后台卡片直接几何展开至全屏 (Point-to-Point Card-to-Fullscreen Launch) — 彻底消除跳变，指哪打哪
//   5. 优雅错峰入场与波浪式全部清除顺程 (Staggered Phase Sequences & Wave Clear All)
//   6. 实时比例映射真应用视口 (Proportional Scaled Live App Miniature Viewport without clipping)
//   7. 100% 纯矢量 SVG UI 元素与 MD3 动态动态色彩驱动

import { initialApps } from './apps-data.js';
import { openApp, closeApp, flyAppToCard } from './app-window.js';
import { getAppIconSVG } from './app-icons.js';
import { createDynamicIconHTML } from './dynamic-icons.js';
import { state } from './state.js';
import { clamp } from './utils.js';
import { destroyAppInstance, clearAllAppInstances } from './page-stack.js';
import { ICONS } from './icons.js';
// v7.46 统一动效编排器：弹簧值补间 / 速度倍率时长 / 曲线令牌（retire 手写贝塞尔家族）
import { tweenValue, dur, after, cssEase } from './motion.js';
import { makeSpringParams } from './spring.js';
import { scaleAnimSpeed } from './animation-presets.js';

let recentAppsList = ['msg', 'game2048', 'settings', 'camera', 'photo', 'music', 'weather'];

// ---------- 分屏联动小工具（消除三处重复探测/导入） ----------
function getSplitInfo() {
  return (typeof window !== 'undefined' && window.__splitInfo) ? window.__splitInfo() : { active: false };
}
function exitSplitSilently() {
  // 显式销毁语义（清除全部/销毁卡片组）：不保存组合；浮层多已隐藏 → 即时收尾
  import('./split-screen.js').then((m) => { try { m.exitSplit({ instant: true }); } catch (e) {} }).catch(() => {});
}
function combineSplitSilently() {
  // v7.33：其它应用顶替分屏 → 组合保存（配对不丢失，桌面组合图标可再次展开）
  import('./split-screen.js').then((m) => { try { m.combineExit({ silent: true }); } catch (e) {} }).catch(() => {});
}
function toast(msg, icon) {
  if (window.showSystemToast) window.showSystemToast(msg, icon);
}
function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// 物理与交互状态
let scrollOffset = 0;           // 当前浮点滑动坐标 (0.0 = 第0张卡片居中)
let targetScrollOffset = 0;     // 目标滚动坐标
let isDraggingDeck = false;
let isCardVerticalDismiss = false;
let dismissCardIdx = -1;
let dismissCardEl = null;

let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;
let lastMoveTime = 0;
let velocityX = 0;
let velocityY = 0;
let dragStartScroll = 0;
let cardStartY = 0;

let animationRafId = null;
// v7.46：deck 惯性吸附弹簧（替代 quartic 定时补间 —— 甩出速度不再被丢弃，
// 松手后卡片沿真实物理曲线滑向焦点，中途重定向/拖拽打断均保速度连续）
let deckSettleTween = null;
// 松指水平速度（px/s，由 pointermove 的 velocityX px/ms ×1000 实时写入，吸附弹簧消费一次即清零）
let flingVelocityPx = 0;
const CARD_STEP_PX = 210;      // 水平滑动步长灵敏度 (像素 / 卡片跨度)

/**
 * 卡片度量（单一真源，渲染与逐帧变换共用）：
 * 预览区 = 设备真实视口的等比缩放，宽高比与屏幕 1:1 对应 ——
 * 后台卡片就是整机屏幕的缩小版，与真实设备观感完全一致。
 */
function getCardMetrics() {
  const winW = window.innerWidth || 390;
  const winH = window.innerHeight || 844;
  let previewW, previewH;
  if (winW >= winH) {
    // 横屏：先按宽度预算，高随真实比例
    previewW = clamp(Math.round(winW * 0.42), 220, 360);
    previewH = clamp(Math.round(previewW * (winH / winW)), 150, 320);
  } else {
    // 竖屏：先按高度预算，宽随真实比例
    previewH = clamp(Math.round(winH * 0.44), 250, 470);
    previewW = clamp(Math.round(previewH * (winW / winH)), 150, 340);
  }
  return {
    winW, winH, previewW, previewH,
    baseW: winW, baseH: winH,
    scale: previewW / winW,
    stepPx: Math.round(previewW * 0.86),
    totalH: previewH + 44, // 预览区 + 头部
  };
}

/** 纯矢量 SVG 统一图标库定义 */
const VECTOR_ICONS = {
  close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  screenshot: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
  share: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
  clearAll: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
  splitScreen: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
  emptyDeck: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
    <rect x="25" y="15" width="70" height="90" rx="16" fill="var(--md-primary-container, #006B5A)" opacity="0.3" transform="rotate(-10 60 60)"/>
    <rect x="25" y="15" width="70" height="90" rx="16" fill="var(--md-secondary-container, #3F4C47)" opacity="0.5" transform="rotate(10 60 60)"/>
    <rect x="28" y="15" width="64" height="90" rx="16" fill="var(--md-surface-container-high, #1F2937)" stroke="var(--md-primary, #7DF8DB)" stroke-width="2.5"/>
    <circle cx="60" cy="45" r="14" fill="var(--md-primary, #7DF8DB)"/>
    <rect x="42" y="68" width="36" height="6" rx="3" fill="var(--md-on-surface, #fff)" opacity="0.8"/>
    <rect x="48" y="78" width="24" height="4" rx="2" fill="var(--md-on-surface-variant, #94a3b8)" opacity="0.6"/>
  </svg>`
};

/** 初始化多任务后台 */
export function initRecentApps() {
  createRecentAppsOverlayDOM();
  // v7.9：Esc 关闭桥 —— performance.js 走完整关闭（复位分屏配对/恢复挂起会话/清 rAF），
  // 不再裸删 active class
  window.__closeRecentApps = closeRecentApps;
  // v7.23：打开桥（E2E / 系统侧直连；与 __closeRecentApps 对称）
  window.__openRecentApps = openRecentApps;
}

/** 记录应用打开历史 (推入栈顶并去重) */
export function recordAppOpened(appId) {
  if (!appId) return;
  if (typeof window !== 'undefined') window.__lastRecordedApp = appId; // 测试钩子（v7.5 defer 验证用）
  recentAppsList = recentAppsList.filter(id => id !== appId);
  recentAppsList.unshift(appId);
  if (recentAppsList.length > 10) recentAppsList.pop();
}

/** 获取最近应用列表 */
export function getRecentAppsList() {
  return recentAppsList;
}

/** 创建后台多任务 DOM 骨架 */
function createRecentAppsOverlayDOM() {
  let overlay = document.getElementById('recentAppsOverlay');
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.id = 'recentAppsOverlay';
  overlay.className = 'recent-apps-overlay';
  overlay.innerHTML = `
    <div class="recent-apps-container" id="recentAppsContainer">
      <div class="recent-cards-deck" id="recentCardsDeck"></div>
      <div class="recent-actions-row" id="recentActionsRow">
        <button class="recent-action-pill" id="recentScreenshotBtn">
          ${VECTOR_ICONS.screenshot}
          <span>截屏</span>
        </button>
        <button class="recent-action-pill" id="recentSplitBtn">
          ${VECTOR_ICONS.splitScreen}
          <span>分屏</span>
        </button>
        <button class="recent-action-pill" id="recentShareBtn">
          ${VECTOR_ICONS.share}
          <span>分享</span>
        </button>
        <button class="recent-clear-all-btn" id="recentClearAllBtn">
          ${VECTOR_ICONS.clearAll}
          <span>全部清除</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // 绑定空白区域点击关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === document.getElementById('recentAppsContainer')) {
      closeRecentApps();
    }
  });

  // 绑定全部清除 — 波浪形级联飞出动画顺程
  document.getElementById('recentClearAllBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    executeWaveClearAll();
  });

  // 截屏 / 分屏 / 分享响应
  document.getElementById('recentScreenshotBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.showSystemToast) window.showSystemToast('已截取当前后台任务屏幕', ICONS.photo_camera);
  });

  document.getElementById('recentSplitBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const overlay = document.getElementById('recentAppsOverlay');
    // 已处于配对模式：再次点击取消
    if (overlay.classList.contains('split-picking')) {
      overlay.classList.remove('split-picking');
      import('./split-screen.js').then((m) => m.cancelPickMode()).catch(() => {});
      if (window.showSystemToast) window.showSystemToast('已取消分屏配对', ICONS.picture_in_picture);
      return;
    }
    if (recentAppsList.length < 2) {
      if (window.showSystemToast) window.showSystemToast('分屏需要至少两个后台应用', ICONS.picture_in_picture);
      return;
    }
    // 以当前焦点卡片作为分屏第一个应用，进入点选配对模式
    const focusedId = recentAppsList[clamp(Math.round(scrollOffset), 0, recentAppsList.length - 1)];
    if (!focusedId) {
      if (window.showSystemToast) window.showSystemToast('请先选择一个分屏应用', ICONS.picture_in_picture);
      return;
    }
    overlay.classList.add('split-picking');
    import('./split-screen.js').then((m) => m.enterPickMode(focusedId)).catch(() => {});
    if (navigator.vibrate) navigator.vibrate(15);
    if (window.showSystemToast) window.showSystemToast('已选定第一个应用，点选另一张卡片组成分屏', ICONS.picture_in_picture);
  });

  document.getElementById('recentShareBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.showSystemToast) window.showSystemToast('正在调起 Pixel 快速分享...', ICONS.link);
  });

  // 绑定 Deck 的连续手势引擎
  bindDeckGestureEvents();
}

/** 执行波浪式全部清除顺程 */
function executeWaveClearAll() {
  const cards = Array.from(document.querySelectorAll('.recent-app-card'));
  if (cards.length === 0) {
    closeRecentApps();
    return;
  }

  vibrate([15, 30, 15]);

  // 从当前焦点卡片向两翼波浪式飞出（v7.46：延时随速度倍率缩放）
  const centerIdx = Math.round(scrollOffset);
  cards.forEach((card, i) => {
    const distFromCenter = Math.abs(i - centerIdx);
    const delayMs = distFromCenter * 45;
    after(delayMs, () => {
      card.classList.add('card-dismissing');
      card.style.transform = `translate3d(0, -140%, 0) scale(0.65) rotateZ(${(i % 2 === 0 ? -6 : 6)}deg)`;
      card.style.opacity = '0';
    });
  });

  const totalTime = cards.length * 45 + 260;
  after(totalTime, () => {
    // 分屏会话在场：先静默退出分屏（窗格随波浪清除一并销毁）
    if (getSplitInfo().active) exitSplitSilently();
    recentAppsList = [];
    clearAllAppInstances();
    renderRecentCards();
    after(180, () => {
      closeRecentApps();
      toast('已清除所有后台任务', ICONS.clear_all);
    });
  });
}

/**
 * 冷任务占位：从未打开过的后台卡片不引导启动，
 * 以应用图标 + 名称 + 「未在运行」徽标呈现，零渲染零脚本开销。
 */
function buildColdTaskHTML(app, statusBarHTML, navBarHTML) {
  const iconHTML = app.type ? createDynamicIconHTML(app.type, false) : getAppIconSVG(app.id);
  // 徽标文案不再绑定「智能冻结」模式名（冷任务占位现在覆盖全部后台模式）
  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:linear-gradient(180deg, var(--md-surface,#121418) 0%, var(--md-surface-container,#1a1c20) 100%);">
      ${statusBarHTML}
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;">
        <div style="width:84px;height:84px;opacity:0.94;">${iconHTML}</div>
        <div style="font-size:17px;font-weight:600;color:var(--md-on-surface,#fff);">${app.name}</div>
        <div style="font-size:11px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant,#9a9b9e);background:rgba(255,255,255,0.07);padding:4px 12px;border-radius:999px;">未在运行</div>
      </div>
      ${navBarHTML}
    </div>
  `;
}

/**
 * 提取或生成应用的微缩内容 HTML
 */
function getAppPreviewContentHTML(app, baseW, baseH) {
  if (!app) return '';

  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const statusBarHTML = `
    <div class="recent-preview-status-bar">
      <span>${timeStr}</span>
      <div style="display:flex;gap:6px;align-items:center;font-size:11px;">
        <span>5G</span>
        <span>100%</span>
      </div>
    </div>
  `;
  const navBarHTML = `
    <div class="recent-preview-nav-bar">
      <div class="recent-preview-nav-pill"></div>
    </div>
  `;

  // 1. 检查是否为 iframe 应用
  if (app.pages && app.pages[0] && typeof app.pages[0].content === 'string' && app.pages[0].content.includes('<iframe')) {
    const match = app.pages[0].content.match(/src=["']([^"']+)["']/);
    const iframeSrc = match ? match[1] : '';
    if (iframeSrc) {
      // 优先复用运行中实例的当前画面：同源提取 live iframe 的 DOM，
      // 剥离全部脚本后以 srcdoc 静态呈现 —— 预览与真实应用状态一致，
      // 且不会像“重新加载 src”那样产生第二个实例（状态脱节 + 重复执行副作用）。
      const live = document.getElementById(`app-instance-${app.id}`);
      const liveIframe = live ? live.querySelector('iframe') : null;
      if (liveIframe) {
        try {
          const liveDoc = liveIframe.contentDocument;
          if (liveDoc && liveDoc.documentElement && liveDoc.body && liveDoc.body.childNodes.length > 0) {
            let html = liveDoc.documentElement.outerHTML;
            html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
            // srcdoc 内相对资源以文档自身为基会失效 → 注入 <base> 指向应用源地址
            const baseHref = new URL(iframeSrc, location.href).href;
            const baseTag = `<base href="${baseHref}">`;
            if (/<head[^>]*>/i.test(html)) {
              html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
            } else {
              html = baseTag + html;
            }
            const safeHTML = html.replace(/"/g, '&quot;');
            return `
              <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);">
                ${statusBarHTML}
                <div style="flex:1;position:relative;overflow:hidden;">
                  <iframe srcdoc="${safeHTML}" class="recent-preview-iframe" scrolling="no" tabindex="-1"></iframe>
                </div>
                ${navBarHTML}
              </div>
            `;
          }
        } catch (e) { /* 实例未就绪 → 退回按 src 加载 */ }
      }

      // fix(P2)：冷任务（从未打开过）一律走休眠占位 —— 旧实现仅在智能冻结模式下如此，
      // 「全部实时」模式冷卡片会回退 <iframe src> 完整启动一个游离实例：定时器/网络常驻、
      // 不受冻结策略管辖（__syncIframeApp 只注入 SDK、不登记冻结表），仅为展示初始
      // 画面。未打开过的应用无实时状态可展示，占位卡零开销且语义更真实；
      // 点击卡片仍走 openApp 正常启动。热实例（真实运行中）仍走上方 live DOM 快照路径。
      return buildColdTaskHTML(app, statusBarHTML, navBarHTML);
    }
  }

  // 2. 原生 JS 应用内容：
  //    v7.23 实时页面快照 —— 优先克隆运行中实例的当前页面栈（活动页的 inline
  //    transform/opacity 即当前可见态，与正在缩入卡片的窗口内容严丝合缝）。
  //    取 innerHTML 而非 outerHTML：背景应用的 wrapper 自带 display:none，
  //    克隆体会被连带隐藏；子页面自身的显隐态才是需要保留的部分。
  //    剥离脚本 / 全部 id（防与活实例的 getElementById 串场）/ inline on*
  //    处理器（克隆体纯展示，不可交互触发真实页面栈操作）。
  //    实例不在场（冷任务）回退 pages[0] 静态内容。
  if (app.pages && app.pages[0] && app.pages[0].content) {
    const liveWrapper = document.getElementById(`app-instance-${app.id}`);
    if (liveWrapper && liveWrapper.childElementCount > 0) {
      try {
        let html = liveWrapper.innerHTML;
        html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
        html = html.replace(/\sid="[^"]*"/g, '');                      // 克隆体 id 全剥离
        html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');         // inline 处理器剥离
        return `
          <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);overflow:hidden;">
            ${statusBarHTML}
            <div class="recent-preview-native-body" style="flex:1;overflow:hidden;position:relative;">${html}</div>
            ${navBarHTML}
          </div>
        `;
      } catch (e) { /* 快照失败 → 静态 pages[0] 回退 */ }
    }
    return `
      <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);overflow:hidden;">
        ${statusBarHTML}
        <div class="recent-preview-native-body" style="flex:1;overflow:hidden;">
          <div style="font-size:22px;font-weight:700;margin-bottom:12px;color:var(--md-primary);">${app.name}</div>
          ${app.pages[0].content}
        </div>
        ${navBarHTML}
      </div>
    `;
  }

  // 3. 通用兜底
  const iconHTML = app.type ? createDynamicIconHTML(app.type, false) : getAppIconSVG(app.id);
  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--md-surface,#121418);">
      <div style="width:72px;height:72px;margin-bottom:14px;">${iconHTML}</div>
      <div style="font-size:18px;font-weight:600;color:var(--md-on-surface,#fff);">${app.name}</div>
    </div>
  `;
}

/** 渲染并布局所有 3D 堆叠卡片（keyed 复用：已有卡片不重建，预览 iframe 零白闪） */
export function renderRecentCards() {
  const deck = document.getElementById('recentCardsDeck');
  const actionsRow = document.getElementById('recentActionsRow');
  if (!deck) return;

  if (recentAppsList.length === 0) {
    deck.innerHTML = `
      <div class="recent-empty-state">
        <div class="recent-empty-illustration">${VECTOR_ICONS.emptyDeck}</div>
        <div style="font-size:16px;font-weight:600;letter-spacing:0.2px;">暂无运行中的后台任务</div>
        <!-- v7.47：副标题 opacity 0.65 在深色壁纸/暗化遮罩上几乎不可读（issue #6 img4）
             → 提到 0.82 并显式指定 on-surface 色 -->
        <div style="font-size:13px;opacity:0.82;color:var(--md-on-surface,#fff);margin-top:6px;">打开的应用将在此处以等比微缩视口呈现</div>
      </div>
    `;
    if (actionsRow) actionsRow.style.display = 'none';
    return;
  }

  if (actionsRow) actionsRow.style.display = 'flex';

  const M = getCardMetrics();
  // deck 高度随真实视口卡片自适应（真实尺寸等比缩放后不再固定 440px）
  deck.style.height = `${M.totalH + 26}px`;

  // 清掉可能的空状态占位
  const emptyState = deck.querySelector('.recent-empty-state');
  if (emptyState) emptyState.remove();

  // —— 任务条目：分屏会话激活时把成对应用合并为一张卡片组 ——
  const entries = buildEntries();

  // —— Keyed 复用：同 key 且尺寸档位未变的卡片原样保留（预览 iframe 不重建）——
  const existing = new Map();
  Array.from(deck.querySelectorAll('.recent-app-card')).forEach((c) => existing.set(c.dataset.appId, c));
  const keepSet = new Set();
  entries.forEach((entry) => {
    const key = typeof entry === 'string' ? entry : entry.key;
    const card = existing.get(key);
    if (card && card.dataset.pw === String(M.previewW) && card.dataset.ph === String(M.previewH)) {
      keepSet.add(key);
    }
  });
  // 移除已不在任务条目中的卡片
  existing.forEach((card, key) => {
    if (!entries.some((e) => (typeof e === 'string' ? e : e.key) === key)) card.remove();
  });

  // 仅新建缺失 / 尺寸档位变化的卡片
  entries.forEach((entry, idx) => {
    const key = typeof entry === 'string' ? entry : entry.key;
    if (keepSet.has(key)) {
      existing.get(key).dataset.idx = String(idx);
      return;
    }
    existing.get(key)?.remove(); // 尺寸档位变化 → 旧卡重建

    const div = typeof entry === 'string'
      ? buildAppCard(entry, idx, M)
      : buildSplitGroupCard(entry, idx, M);
    deck.appendChild(div);
  });

  // fix(audit-E): keyed 复用此前只更新 dataset.idx 不重排 DOM —— updateCardsTransform
  // 按 querySelectorAll 的 DOM 枚举序定位（delta = idx - offset），dataset.idx 却是逻辑序，
  // 两者脱钩后焦点卡不居中、点击判定错乱、zoomToCard 量到侧位卡矩形、分屏配对选错应用。
  // 复用命中时按 entries 顺序 insertBefore 重排卡片 DOM：节点原样保留（预览 iframe 不重建、
  // identity 不变），仅在顺序实际变化时移动；此后 DOM 枚举序 ≡ 逻辑序，
  // updateCardsTransform / 点击判定 / settleDeckAfterPrune 的 DOM 枚举重编自然一致。
  {
    const cardByKey = new Map();
    deck.querySelectorAll('.recent-app-card').forEach((c) => cardByKey.set(c.dataset.appId, c));
    let anchor = null;
    entries.forEach((entry) => {
      const key = typeof entry === 'string' ? entry : entry.key;
      const card = cardByKey.get(key);
      if (!card) return;
      const expected = anchor ? anchor.nextElementSibling : deck.firstElementChild;
      if (card !== expected) {
        deck.insertBefore(card, anchor ? anchor.nextSibling : deck.firstChild);
      }
      anchor = card;
    });
  }

  // 绑定卡片关闭按钮（每个卡片元素只绑一次；分屏组走独立关闭链路）
  deck.querySelectorAll('.recent-app-card').forEach(card => {
    if (card.dataset.closeBound === '1') return;
    card.dataset.closeBound = '1';
    const btn = card.querySelector('.recent-card-close');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (card.dataset.splitApps) {
        const [aId, bId] = card.dataset.splitApps.split('|');
        dismissSplitGroup(aId, bId);
      } else {
        dismissSingleCardByAppId(card.dataset.appId);
      }
    });
  });

  // 立即刷新卡片 3D 堆叠物理空间位置
  updateCardsTransform(scrollOffset);
}

/**
 * 构建任务条目列表：分屏会话激活且成对应用都在后台时，
 * 产出一张合并卡片组条目（key = split:aId|bId），其余为普通 appId 字符串。
 */
function buildEntries() {
  const split = (typeof window !== 'undefined' && window.__splitInfo) ? window.__splitInfo() : { active: false };

  // 1. 获取持久化保存的多组分屏记录（Android 16 App Pair 存储中心）
  let savedGroups = [];
  try {
    const raw = JSON.parse(localStorage.getItem('ios-desktop:split-groups') || '[]');
    if (Array.isArray(raw)) savedGroups = raw;
  } catch (e) {}

  // 2. 如果当前有前台活跃分屏，合并确保其置顶且数据最新
  if (split.active) {
    const id = [split.appAId, split.appBId].sort().join('|');
    const existingIdx = savedGroups.findIndex(g => g.id === id);
    const activeGroup = {
      id,
      aId: split.appAId,
      bId: split.appBId,
      axis: split.axis || 'y',
      ratio: split.ratio || 0.5,
      ts: Date.now(),
    };
    if (existingIdx !== -1) savedGroups[existingIdx] = activeGroup;
    else savedGroups.unshift(activeGroup);
  }

  // 3. 构建多组分屏映射与去重
  const appToGroup = new Map();
  savedGroups.forEach((g) => {
    if (g.aId && g.bId && g.aId !== g.bId) {
      appToGroup.set(g.aId, g);
      appToGroup.set(g.bId, g);
    }
  });

  const entries = [];
  const handledGroupIds = new Set();
  const handledAppIds = new Set();

  // 若当前分屏活跃，置于任务流首位
  if (split.active) {
    const activeKey = `split:${split.appAId}|${split.appBId}`;
    const activeId = [split.appAId, split.appBId].sort().join('|');
    handledGroupIds.add(activeId);
    handledAppIds.add(split.appAId);
    handledAppIds.add(split.appBId);
    entries.push({
      key: activeKey,
      aId: split.appAId,
      bId: split.appBId,
      axis: split.axis || 'y',
      ratio: split.ratio || 0.5,
    });
  }

  // 遍历最近任务列表，将成对应用直接合并为分屏组合卡片
  recentAppsList.forEach((appId) => {
    if (handledAppIds.has(appId)) return;
    const group = appToGroup.get(appId);
    if (group) {
      if (!handledGroupIds.has(group.id)) {
        handledGroupIds.add(group.id);
        handledAppIds.add(group.aId);
        handledAppIds.add(group.bId);
        entries.push({
          key: `split:${group.aId}|${group.bId}`,
          aId: group.aId,
          bId: group.bId,
          axis: group.axis || 'y',
          ratio: group.ratio || 0.5,
        });
      }
    } else {
      handledAppIds.add(appId);
      entries.push(appId);
    }
  });

  // 对于 savedGroups 中保存的其他分屏组（若尚未展示），一并呈现于后台卡片池
  savedGroups.forEach((g) => {
    if (!handledGroupIds.has(g.id)) {
      handledGroupIds.add(g.id);
      entries.push({
        key: `split:${g.aId}|${g.bId}`,
        aId: g.aId,
        bId: g.bId,
        axis: g.axis || 'y',
        ratio: g.ratio || 0.5,
      });
    }
  });

  return entries;
}

/** 构建普通应用卡片（真实视口等比缩放预览） */
function buildAppCard(appId, idx, M) {
  const app = initialApps.find(a => a.id === appId) || { id: appId, name: appId };
  const iconHTML = app.type ? createDynamicIconHTML(app.type, false) : getAppIconSVG(app.id || appId);
  const previewContentHTML = getAppPreviewContentHTML(app, M.baseW, M.baseH);

  const div = document.createElement('div');
  div.className = 'recent-app-card';
  div.dataset.appId = appId;
  div.dataset.idx = String(idx);
  div.dataset.pw = String(M.previewW);
  div.dataset.ph = String(M.previewH);
  div.style.width = `${M.previewW}px`;
  div.style.height = `${M.totalH}px`;
  div.innerHTML = `
    <div class="recent-card-header">
      <div class="recent-card-icon">${iconHTML}</div>
      <span class="recent-card-title">${app.name}</span>
      <button class="recent-card-close" data-app-id="${appId}" title="关闭任务">
        ${VECTOR_ICONS.close}
      </button>
    </div>
    <div class="recent-card-preview">
      <div class="recent-viewport-scaler" style="width:${M.baseW}px;height:${M.baseH}px;transform:translate(-50%,-50%) scale(${M.scale.toFixed(4)});">
        ${previewContentHTML}
      </div>
    </div>
  `;
  return div;
}

/**
 * 构建分屏合并卡片组：按当前分屏轴还原真实布局，
 * 两个半屏各展示对应应用的对应区域（上/左露头部，下/右露尾部），
 * 轻点卡片组 = 恢复分屏；关闭按钮 = 整组销毁。
 */
function buildSplitGroupCard(entry, idx, M) {
  const appA = initialApps.find(a => a.id === entry.aId) || { id: entry.aId, name: entry.aId };
  const appB = initialApps.find(a => a.id === entry.bId) || { id: entry.bId, name: entry.bId };
  const iconA = appA.type ? createDynamicIconHTML(appA.type, false) : getAppIconSVG(appA.id);
  const iconB = appB.type ? createDynamicIconHTML(appB.type, false) : getAppIconSVG(appB.id);

  const gap = 6;
  const isX = entry.axis === 'x';
  // v7.47：预览几何重写 —— 旧实现 posA/posB 用 translate(±50%/±100%) 锚定半屏，
  // 但 translate 百分比按「未缩放的 base 盒」解析（如 1088×800），与 scale 叠加后
  // 内容被推到窗格可视区外，两个半屏全部隐形 → 合并卡纯白空白（issue #6 img6）。
  // 新方案：transform-origin 固定 0 0 + 像素偏移，缩放前后左上角钉死，数学精确：
  //   整屏应用按窗格短边 cover 缩放，A 窗格钉 (0,0) 露头部，B 窗格平移 (paneW-scaledW,
  //   paneH-scaledH) 露尾部 —— 与真实分屏的可见区域一一对应。
  const paneW = isX ? (M.previewW - gap) / 2 : M.previewW;
  const paneH = isX ? M.previewH : (M.previewH - gap) / 2;
  const coverScale = isX ? paneH / M.baseH : paneW / M.baseW;
  const scaledW = M.baseW * coverScale;
  const scaledH = M.baseH * coverScale;
  // A 窗格（左/上）：露应用头部；B 窗格（右/下）：露应用尾部
  const offAX = isX ? 0 : (paneW - scaledW) / 2;
  const offAY = isX ? (paneH - scaledH) / 2 : 0;
  const offBX = isX ? paneW - scaledW : (paneW - scaledW) / 2;
  const offBY = isX ? (paneH - scaledH) / 2 : paneH - scaledH;

  const paneHTML = (app, ox, oy) => `
    <div style="flex:1;position:relative;overflow:hidden;background:var(--md-surface,#121418);min-width:0;min-height:0;">
      <div class="recent-viewport-scaler" style="left:${ox.toFixed(2)}px;top:${oy.toFixed(2)}px;transform-origin:0 0;transform:scale(${coverScale.toFixed(4)});width:${M.baseW}px;height:${M.baseH}px;">
        ${getAppPreviewContentHTML(app, M.baseW, M.baseH)}
      </div>
    </div>`;

  const div = document.createElement('div');
  div.className = 'recent-app-card recent-split-card';
  div.dataset.appId = entry.key;
  div.dataset.splitApps = `${entry.aId}|${entry.bId}`;
  div.dataset.idx = String(idx);
  div.dataset.pw = String(M.previewW);
  div.dataset.ph = String(M.previewH);
  div.style.width = `${M.previewW}px`;
  div.style.height = `${M.totalH}px`;
  div.innerHTML = `
    <div class="recent-card-header">
      <div class="recent-card-icon" style="display:flex;align-items:center;">${iconA}</div>
      <div class="recent-card-icon" style="margin-left:-8px;box-shadow:0 0 0 2px var(--md-surface-container,rgba(24,30,36,0.98));">${iconB}</div>
      <span class="recent-card-title">${appA.name} + ${appB.name}</span>
      <button class="recent-card-close" title="关闭分屏组">
        ${VECTOR_ICONS.close}
      </button>
    </div>
    <div class="recent-card-preview" style="display:flex;flex-direction:${isX ? 'row' : 'column'};align-items:stretch;gap:${gap}px;">
      ${paneHTML(appA, offAX, offAY)}
      ${paneHTML(appB, offBX, offBY)}
    </div>
  `;
  return div;
}

/**
 * 核心数学引擎：根据连续浮点 scrollOffset 更新所有卡片的 3D 空间矩阵
 *
 * 闪屏修复（关键）：旧实现每帧无条件重写 filter / boxShadow / zIndex / opacity，
 * 其中 filter（blur↔none 翻转）与 boxShadow 是重绘属性，再叠加 CSS 里的
 * transition: filter/box-shadow —— 每帧重启过渡 + 每帧全卡重绘 = 滑动闪屏。
 * 现在改为「量化 + 差分写入」：只有值真正跨过档位才碰 DOM，
 * transform 是纯合成器属性保持每帧写（跟手），其余全部低频化。
 *
 * @param {number} offset - 当前滚动浮点坐标
 * @param {HTMLElement|null} forceCard - 需要无视 dismissing 标记强制写穿的卡（撤销删除恢复原位用）
 */

// 每卡样式差分缓存（WeakMap：卡片元素重建后缓存自动失效，无泄漏）
const cardStyleCache = new WeakMap();

function updateCardsTransform(offset, forceCard = null, opts = null) {
  const cards = document.querySelectorAll('.recent-app-card');
  if (!cards.length) return;

  // paintMode='compositor'：拖拽/惯性飞行期只写合成器属性（transform/zIndex/opacity/命中域），
  // blur 与 boxShadow 两大重绘属性完全冻结 —— 滑动全程零重绘，松手吸附后一次性补写。
  const paintMode = (opts && opts.paintMode) || 'full';
  const stepPx = getCardMetrics().stepPx;

  cards.forEach((card, idx) => {
    let cache = cardStyleCache.get(card);
    if (!cache) {
      cache = { dismissing: false };
      cardStyleCache.set(card, cache);
    }

    if (card.classList.contains('card-dismissing')) {
      if (card !== forceCard) {
        // 飞出动画由自身内联 transform/opacity 接管，停止跟踪但保留标记，
        // 便于后续恢复原位时强制全量写回
        cache.dismissing = true;
        return;
      }
      // 强制写穿：清空缓存，本轮全量重写（撤销删除 → 卡片动画归位）
      cache = { dismissing: false };
      cardStyleCache.set(card, cache);
    } else if (cache.dismissing) {
      // 从飞出状态恢复：同样清空缓存全量写回
      cache = { dismissing: false };
      cardStyleCache.set(card, cache);
    }

    // 相对中心的浮点偏移量 (0 = 正中央焦点卡片)
    const delta = idx - offset;
    const absDelta = Math.abs(delta);

    // 1. 水平位移 + 缩放 + 3D Y轴透视偏转 —— 合成器属性，每帧写
    const x = delta * stepPx;
    const scale = Math.max(0.74, 1 - 0.11 * absDelta);
    const rotateY = clamp(-delta * 12, -28, 28);
    const transform = `translate3d(${x.toFixed(1)}px, 0px, ${(-absDelta * 40).toFixed(1)}px) scale(${scale.toFixed(3)}) rotateY(${rotateY.toFixed(1)}deg)`;
    if (cache.transform !== transform) {
      card.style.transform = transform;
      cache.transform = transform;
    }

    // 2. Z-Index 深度层级 —— 取整差分
    const zIndex = Math.round(100 - absDelta * 12);
    if (cache.zIndex !== zIndex) {
      card.style.zIndex = zIndex;
      cache.zIndex = zIndex;
    }

    // 3. 不透明度 —— 两位小数量化差分
    const opacity = clamp(1 - 0.2 * absDelta, 0.38, 1.0).toFixed(2);
    if (cache.opacity !== opacity) {
      card.style.opacity = opacity;
      cache.opacity = opacity;
    }

    // 4. 景深虚化 —— 1px 量化桶 + 仅全量绘制期写入；
    //    拖拽飞行期（compositor 模式）完全跳过，杜绝 blur 每帧翻转重绘
    if (paintMode === 'full') {
      const blurPx = Math.max(0, (absDelta - 0.45) * 2.5);
      const blurBucket = Math.round(blurPx);
      if (cache.blur !== blurBucket) {
        card.style.filter = blurBucket > 0.2 ? `blur(${blurBucket}px)` : 'none';
        cache.blur = blurBucket;
      }
    }

    // 5. 阴影与高光 —— 连续值离散为三档（焦点/邻近/远端），
    //    档位切换由 CSS box-shadow 过渡平滑衔接（CSS 侧保留 box-shadow transition）；
    //    拖拽飞行期同样冻结，吸附落定后一次性补写档位
    if (paintMode === 'full') {
      const shadowTier = absDelta < 0.35 ? 'focus' : (absDelta < 1.2 ? 'near' : 'far');
      if (cache.shadowTier !== shadowTier) {
        card.style.boxShadow = shadowTier === 'focus'
          ? `0 24px 60px rgba(0, 0, 0, 0.65), 0 0 0 1.5px var(--md-primary, #7DF8DB)`
          : `0 ${shadowTier === 'near' ? 18 : 14}px ${shadowTier === 'near' ? 48 : 36}px rgba(0, 0, 0, ${shadowTier === 'near' ? '0.42' : '0.22'})`;
        cache.shadowTier = shadowTier;
      }
    }

    // 6. 命中范围 —— 布尔差分
    const pe = absDelta < 1.2;
    if (cache.pe !== pe) {
      card.style.pointerEvents = pe ? 'auto' : 'none';
      cache.pe = pe;
    }
  });
}

/** v7.35：卡片内联样式全量兜底复位 ——
 *  淡出路径（pair 卡点击/卡片启动/配对接管）直写 opacity/transform 绕过了
 *  cardStyleCache 脏检查，keyed 复用下卡片位置不变时永不重写 → 残留永久隐身
 *  （实测：pair 卡恢复后重开多任务，7/7 张卡片全部不可见）。
 *  开屏时统一清内联 + 失效缓存 + 全量重写一轮，任何残留确定性自愈。 */
function resetDeckCardStyles() {
  const cards = document.querySelectorAll('.recent-app-card');
  let hasRestorable = false;
  cards.forEach((c) => {
    if (c.classList.contains('card-dismissing')) return; // 飞出动画自管（cache.dismissing 机制接管恢复）
    c.style.transition = '';
    c.style.opacity = '';
    cardStyleCache.delete(c);
    hasRestorable = true;
  });
  if (hasRestorable) updateCardsTransform(scrollOffset); // 缓存全失效 → 逐卡全量重写
}

// pointermove 高频事件 → 每帧最多一次布局写入（120Hz 触屏设备工作量减半以上）
let pendingDeckRaf = 0;
let pendingDeckOffset = 0;
let pendingDeckDefer = false;

function scheduleDeckUpdate(offset, deferPaint = false) {
  pendingDeckOffset = offset;
  pendingDeckDefer = deferPaint;
  if (pendingDeckRaf) return;
  pendingDeckRaf = requestAnimationFrame(() => {
    pendingDeckRaf = 0;
    updateCardsTransform(pendingDeckOffset, null, { paintMode: pendingDeckDefer ? 'compositor' : 'full' });
  });
}

/** 绑定 Deck 区域的高性能多点触控与惯性滑动 */
function bindDeckGestureEvents() {
  const deck = document.getElementById('recentCardsDeck');
  if (!deck) return;

  deck.addEventListener('pointerdown', (e) => {
    if (recentAppsList.length === 0) return;
    if (e.target.closest('.recent-card-close')) return;

    if (animationRafId) {
      cancelAnimationFrame(animationRafId);
      animationRafId = null;
    }
    // v7.46：拖拽接管吸附弹簧 —— 卡片当前位姿即弹簧被中断的瞬时位姿，
    // 松手后从该位姿+新速度继续（零重启、零跳变）
    if (deckSettleTween) {
      deckSettleTween.cancel();
      deckSettleTween = null;
    }

    const cardEl = e.target.closest ? e.target.closest('.recent-app-card') : null;
    // v7.35 兜底：合成器命中测试对 3D 轮播侧卡（rotateY + translateZ 的组合卡）
    // 在部分渲染管线中间歇性失效 —— 事件目标落到 deck 自身，侧卡轻点聚焦/组合卡
    // 启动全部失灵（实测 pointerdown card=NONE）。以主线程几何命中（elementsFromPoint
    // 正确处理 3D 变换投影）反解卡片；仅命中失效时才走，正常路径零开销。
    dismissCardEl = cardEl || (typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint(e.clientX, e.clientY).find(
          (el) => el.classList && el.classList.contains('recent-app-card')
        ) || null
      : null);
    if (dismissCardEl) {
      const parsedIdx = parseInt(dismissCardEl.dataset.idx, 10);
      dismissCardIdx = Number.isFinite(parsedIdx) ? parsedIdx : -1;
    } else {
      dismissCardIdx = -1;
    }

    isDraggingDeck = true;
    isCardVerticalDismiss = false;
    startX = e.clientX;
    startY = e.clientY;
    lastX = e.clientX;
    lastY = e.clientY;
    lastMoveTime = performance.now();
    velocityX = 0;
    velocityY = 0;
    dragStartScroll = scrollOffset;
    cardStartY = 0;

    // pointer 已释放（如浏览器接管触发 cancel）时 capture 会抛 NotFoundError，
    // 不捕获会中断后续拖拽状态初始化
    try { deck.setPointerCapture(e.pointerId); } catch (err) {}
  });

  deck.addEventListener('pointermove', (e) => {
    if (!isDraggingDeck) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTime);
    velocityX = (e.clientX - lastX) / dt;   // px/ms
    velocityY = (e.clientY - lastY) / dt;
    lastX = e.clientX;
    lastY = e.clientY;
    lastMoveTime = now;
    // v7.46：实时维护松指速度样本（px/s）—— 吸附弹簧初速来源
    flingVelocityPx = velocityX * 1000;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // 判断是卡片上滑移除 还是 整体横向流式切换（分屏组卡不可单卡上滑移除）
    if (!isCardVerticalDismiss && dismissCardEl && dy < -12 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      isCardVerticalDismiss = true;
    }

    if (isCardVerticalDismiss && dismissCardEl) {
      cardStartY = Math.min(0, dy);
      const delta = dismissCardIdx - scrollOffset;
      const x = delta * 215;
      const scale = Math.max(0.74, 1 - 0.11 * Math.abs(delta));
      const rotateY = clamp(-delta * 12, -28, 28);
      const progress = Math.min(1, Math.abs(cardStartY) / 300);
      const opacity = Math.max(0, 1 - progress * 0.8);

      dismissCardEl.style.transform = `translate3d(${x.toFixed(1)}px, ${cardStartY.toFixed(1)}px, 0px) scale(${scale.toFixed(3)}) rotateY(${rotateY.toFixed(1)}deg)`;
      dismissCardEl.style.opacity = opacity.toFixed(2);
      return;
    }

    // 核心：无级流式横向拖拽 —— 手指移动多少，卡片就按比例精准移动多少
    // （写入走 rAF 调度：高频 pointer 事件每帧最多落一次 DOM；
    //   拖拽期 deferPaint=true → 只写合成器属性，blur/阴影吸附后补写）
    const maxOffset = Math.max(0, recentAppsList.length - 1);
    const rawOffset = dragStartScroll - (dx / CARD_STEP_PX);

    if (rawOffset < 0) {
      scrollOffset = rawOffset * 0.35;
    } else if (rawOffset > maxOffset) {
      scrollOffset = maxOffset + (rawOffset - maxOffset) * 0.35;
    } else {
      scrollOffset = rawOffset;
    }

    scheduleDeckUpdate(scrollOffset, true);
  });

  const handlePointerUp = (e) => {
    if (!isDraggingDeck) return;
    isDraggingDeck = false;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const maxOffset = Math.max(0, recentAppsList.length - 1);

    // 1. 处理单卡片上滑飞出清除
    if (isCardVerticalDismiss && dismissCardEl) {
      isCardVerticalDismiss = false;
      const shouldDismiss = cardStartY < -75 || velocityY < -0.32;

      if (shouldDismiss && dismissCardIdx !== -1) {
        vibrate(20);
        if (dismissCardEl.classList.contains('recent-split-card') && dismissCardEl.dataset.splitApps) {
          const [aId, bId] = dismissCardEl.dataset.splitApps.split('|');
          dismissSplitGroup(aId, bId);
        } else {
          const dismissedId = dismissCardEl.dataset.appId;
          flyOutCard(dismissCardEl, () => {
            destroyAppInstance(dismissedId);
            pruneDismissedCard(dismissedId);
          });
        }
        return;
      } else {
        // 恢复卡片原位（强制写穿被 dismissing 跳过的这张卡，动画归位）
        dismissCardEl.classList.add('card-dismissing');
        updateCardsTransform(scrollOffset, dismissCardEl);
        after(250, () => {
          if (dismissCardEl) dismissCardEl.classList.remove('card-dismissing');
        });
        return;
      }
    }

    // 2. 如果只是轻触点击某张卡片，从该卡片实际屏幕坐标直接展开启动应用（指哪打哪）
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dismissCardEl) {
      // —— 分屏合并卡片组：轻点 = 进入/恢复分屏（指哪打哪平滑展开）——
      if (dismissCardEl.classList.contains('recent-split-card')) {
        const parsedClicked = parseInt(dismissCardEl.dataset.idx, 10);
        const clickedIdx = Number.isFinite(parsedClicked) ? parsedClicked : Math.round(scrollOffset);
        const curFocusedIdx = Math.round(scrollOffset);
        if (clickedIdx === curFocusedIdx) {
          if (navigator.vibrate) navigator.vibrate(12);
          const splitCardRect = dismissCardEl.getBoundingClientRect();
          const splitApps = dismissCardEl.dataset.splitApps;
          const [aId, bId] = splitApps ? splitApps.split('|') : [];
          const splitInfo = (typeof window !== 'undefined' && window.__splitInfo) ? window.__splitInfo() : { active: false };

          // 平滑淡退其它卡片，隐藏源卡片无缝衔接分屏展开
          // v7.46：曲线令牌统一 + 速度倍率缩放
          dismissCardEl.style.opacity = '0';
          const otherCards = document.querySelectorAll(`.recent-app-card:not([data-app-id="${dismissCardEl.dataset.appId}"])`);
          otherCards.forEach(c => {
            c.style.transition = `opacity ${dur(220)}ms ${cssEase('emphasized')}, transform ${dur(220)}ms ${cssEase('emphasized')}`;
            c.style.opacity = '0';
            c.style.transform += ' scale(0.92)';
          });

          if (splitInfo.active && ((splitInfo.appAId === aId && splitInfo.appBId === bId) || (splitInfo.appAId === bId && splitInfo.appBId === aId))) {
            closeRecentApps(); // 恢复当前正挂起的分屏
          } else {
            // 从后台卡片位置直接平滑启动进入该分屏组！
            import('./split-screen.js').then((m) => {
              let savedRatio = 0.5;
              try {
                const raw = JSON.parse(localStorage.getItem('ios-desktop:split-groups') || '[]');
                const found = raw.find(g => (g.aId === aId && g.bId === bId) || (g.aId === bId && g.bId === aId));
                if (found && typeof found.ratio === 'number') savedRatio = found.ratio;
              } catch (e) {}
              m.enterSplit({
                appAId: aId,
                appBId: bId,
                rectA: splitCardRect,
                rectB: splitCardRect,
                ratio: savedRatio,
                replaceActive: true, // v7.35：顶替在场/挂起会话（旧对静默组合保存）
              });
              after(280, () => {
                closeRecentApps();
                dismissCardEl.style.opacity = '1';
              });
            }).catch(() => {
              closeRecentApps();
              dismissCardEl.style.opacity = '1';
            });
          }
        } else {
          targetScrollOffset = clickedIdx;
          animateScrollToTarget();
        }
        return;
      }

      const clickedIdx = parseInt(dismissCardEl.dataset.idx, 10);
      const curFocusedIdx = Math.round(scrollOffset);

      // 分屏配对模式：卡片点选用作选择第二个分屏应用（而非启动应用）
      const pickingOverlay = document.getElementById('recentAppsOverlay');
      if (pickingOverlay && pickingOverlay.classList.contains('split-picking')) {
        const pickAppId = dismissCardEl.dataset.appId;
        import('./split-screen.js').then((m) => {
          const payload = m.handleCardPick(pickAppId, dismissCardEl);
          pickingOverlay.classList.remove('split-picking');
          if (payload) {
            // 平滑接管：隐藏底层源卡片，由分屏窗格以完全相同尺寸位置无缝接管，杜绝双层残影
            const cardA = document.querySelector(`.recent-app-card[data-app-id="${payload.appAId}"]`);
            if (cardA) cardA.style.opacity = '0';
            if (dismissCardEl) dismissCardEl.style.opacity = '0';
            closeRecentApps();
            m.enterSplit(payload);
          } else {
            closeRecentApps();
          }
        }).catch(() => {});
        return;
      }

      if (clickedIdx === curFocusedIdx) {
        const appId = dismissCardEl.dataset.appId;
        launchAppDirectFromCard(appId, dismissCardEl);
        return;
      } else {
        // 点击两侧卡片 -> 平滑对齐到该卡片
        targetScrollOffset = clickedIdx;
        animateScrollToTarget();
        return;
      }
    }

    // 3. 动力学惯性滚动 (Inertia Momentum) 与平滑吸附到最近卡片
    const projectedOffset = scrollOffset - (velocityX * 0.0018 * CARD_STEP_PX);
    targetScrollOffset = Math.round(clamp(projectedOffset, 0, maxOffset));
    animateScrollToTarget();
  };

  deck.addEventListener('pointerup', handlePointerUp);
  deck.addEventListener('pointercancel', handlePointerUp);
}

/**
 * v7.46：RK4 弹簧吸附（替代 quartic 定时补间）——
 * 旧实现把甩动速度只用于投影选目标，随后从静止以 `1-(1-p)^4` 重启：
 * 松手瞬间速度断层（先快后突然变慢的「二次加速」感）。
 * 新实现：速度接力 —— 甩出的 px/s 换算为卡片/秒注入弹簧初速，
 * 卡片沿真实物理曲线滑向焦点；中途点击另一张卡 = 保速度重定向。
 */
function animateScrollToTarget(onComplete = null) {
  if (deckSettleTween) deckSettleTween.cancel();

  const from = scrollOffset;
  const to = targetScrollOffset;
  const vCards = clamp(flingVelocityPx / Math.max(CARD_STEP_PX, 1), -8, 8);
  flingVelocityPx = 0; // 消费一次即清零（点击聚焦/入场路径速度为 0 = 纯弹簧落位）

  deckSettleTween = tweenValue({
    from,
    to,
    velocity: vCards,
    params: scaleAnimSpeed(makeSpringParams(0.3, 0.92, 1)),
    onUpdate: (v) => {
      scrollOffset = v;
      // 惯性飞行期同样只写合成器属性（零重绘），落定后一次性补写 blur/阴影档位
      updateCardsTransform(v, null, { paintMode: 'compositor' });
    },
    onComplete: () => {
      scrollOffset = to;
      updateCardsTransform(to); // 全量补写：景深/阴影档位在落定帧一次到位
      deckSettleTween = null;
      if (onComplete) onComplete();
    },
  });
}

/**
 * 从多任务后台点击卡片全屏几何直接展开启动应用 (Point-to-Point Card Launching)
 * 精确以当前 3D 卡片的真实屏幕矩形位置为起点展开为全屏应用！
 */
function launchAppDirectFromCard(appId, cardEl) {
  const appIdx = initialApps.findIndex(a => a.id === appId);
  if (appIdx === -1) return;

  // 分屏会话在场（挂起中）：启动其它应用会替换分屏 —— 组合保存（配对不丢）
  if (getSplitInfo().active) combineSplitSilently();

  // 1. 获取卡片当前在视口中的绝对几何尺寸与中心坐标
  // fix(v7.42)：改用「预览区」矩形（宽高比 ≡ 屏幕，与缩入卡片的目标几何同源）——
  // 整卡矩形含 44px 头部，以它为展开起点，窗口起始位姿与可见快照偏差 22px，
  // 展开瞬间内容跳动。预览区矩形 = 快照所在像素域，展开零起点跳变。
  const previewEl = cardEl.querySelector('.recent-card-preview');
  const cardRect = previewEl ? previewEl.getBoundingClientRect() : cardEl.getBoundingClientRect();

  // 2. 隐藏当前卡片自身，其它卡片与操作栏平滑淡出退散
  // v7.46：曲线令牌统一（retire ease 家族）+ 速度倍率缩放
  cardEl.style.opacity = '0';
  const otherCards = document.querySelectorAll(`.recent-app-card:not([data-app-id="${appId}"])`);
  otherCards.forEach(c => {
    c.style.transition = `opacity ${dur(240)}ms ${cssEase('emphasized')}, transform ${dur(240)}ms ${cssEase('emphasized')}`;
    c.style.opacity = '0';
    c.style.transform += ' scale(0.92)';
  });
  const actionsRow = document.getElementById('recentActionsRow');
  if (actionsRow) {
    actionsRow.style.transition = `opacity ${dur(180)}ms ${cssEase('emphasized')}, transform ${dur(180)}ms ${cssEase('emphasized')}`;
    actionsRow.style.opacity = '0';
    actionsRow.style.transform = 'translateY(16px)';
  }

  if (navigator.vibrate) navigator.vibrate(15);

  // 3. 立即从卡片矩形平滑展开主窗口（不提前强制关闭 recents 浮层）
  openApp(appIdx, null, cardRect, { skipCloseRecents: true });

  const winEl = document.getElementById('appWindow');
  if (winEl) winEl.style.zIndex = '760';
  const mainShadow = document.getElementById('windowShadowLayer');
  if (mainShadow) mainShadow.style.zIndex = '759';

  // 4. 动画接管落地后淡出收起后台 overlay
  after(260, () => {
    closeRecentApps();
    cardEl.style.opacity = '1';
    if (actionsRow) {
      actionsRow.style.transition = '';
      actionsRow.style.opacity = '';
      actionsRow.style.transform = '';
    }
  });
}

/** 卡片飞出动画 + 延迟销毁（单卡上滑/操作磁贴/分屏组共用的收尾动作；v7.46 延时随速度倍率缩放） */
function flyOutCard(cardEl, onRemove, delayMs = 220) {
  if (cardEl) {
    cardEl.classList.add('card-dismissing');
    cardEl.style.transform = 'translate3d(0, -135%, 0) scale(0.68)';
    cardEl.style.opacity = '0';
  }
  after(delayMs, onRemove);
}

/** 卡片移除后就地重排索引并吸附焦点（与全量重建绝缘，防预览白闪） */
function settleDeckAfterPrune() {
  if (recentAppsList.length === 0) {
    renderRecentCards();
    return;
  }
  const deck = document.getElementById('recentCardsDeck');
  deck?.querySelectorAll('.recent-app-card').forEach((card, idx) => {
    card.dataset.idx = String(idx);
  });
  scrollOffset = clamp(scrollOffset, 0, Math.max(0, recentAppsList.length - 1));
  targetScrollOffset = Math.round(scrollOffset);
  updateCardsTransform(scrollOffset);
  animateScrollToTarget();
}

/**
 * 单卡移除后就地修剪：只从 DOM 摘除已飞出的那张卡并重排索引，
 * 绝不 innerHTML 全量重建 —— 重建会把所有预览 iframe 一并销毁再重建，
 * 造成整屏预览白闪（旧版闪屏次要根因）。列表清空时才走全量渲染。
 */
function pruneDismissedCard(appId) {
  recentAppsList = recentAppsList.filter(id => id !== appId);
  const deck = document.getElementById('recentCardsDeck');
  if (!deck) return;

  const cardEl = deck.querySelector(`.recent-app-card[data-app-id="${appId}"]`);
  if (cardEl) cardEl.remove();

  settleDeckAfterPrune();
}

/** 根据应用 ID 移除单张卡片 */
function dismissSingleCardByAppId(appId) {
  const cardEl = document.querySelector(`.recent-app-card[data-app-id="${appId}"]`);
  vibrate(20);
  flyOutCard(cardEl, () => {
    destroyAppInstance(appId);
    pruneDismissedCard(appId);
  });
}

/**
 * 移除分屏合并卡片组：整组飞出后同时退出分屏会话并销毁两应用实例，
 * 随后就地修剪卡片列表（与 pruneDismissedCard 同哲学，绝不全量重建）。
 */
function dismissSplitGroup(aId, bId) {
  const key = `split:${aId}|${bId}`;
  const cardEl = document.querySelector(`.recent-app-card[data-app-id="${key}"]`);
  vibrate(20);
  flyOutCard(cardEl, () => {
    // 退出分屏会话（若挂起中则隐式销毁；会话已退出则安全空操作）
    exitSplitSilently();
    destroyAppInstance(aId);
    destroyAppInstance(bId);

    // 从分屏持久化存储中移除该组合
    import('./split-groups.js').then((m) => {
      const pair = [aId, bId].sort().join('|');
      m.removeSplitGroup(pair);
    }).catch(() => {});

    recentAppsList = recentAppsList.filter((id) => id !== aId && id !== bId);
    if (cardEl && cardEl.parentNode) cardEl.remove();
    settleDeckAfterPrune();
  });
}

/**
 * 打开多任务后台（v7.9-B：有前台应用时走连续缩放入场，取代旧两段式）
 *
 * 旧实现：closeApp(0,-400,-2) genie 收场回图标 + deck 独立淡入 —— 窗口消失与后台
 * 出现两个割裂瞬间（用户实测反馈“应是当前窗口平滑缩放到后台卡片尺寸”）。
 * 新路径：先激活 deck 并在最终位态量取目标卡片矩形，再以 opts.shrinkTo 关闭 ——
 * 窗口全程连续缩放、精确落进卡片，与卡片静态预览交叉衔接；同时窗口临时抬到
 * deck 背景（z 750）之上（z 760），缩放全程清晰可见。
 */
export function openRecentApps(fromAppId = null, gestureVel = null) {
  const overlay = document.getElementById('recentAppsOverlay');
  if (!overlay) return;

  const splitActive = getSplitInfo().active;
  const fromId = fromAppId || (state.isOpen && state.currentApp ? state.currentApp.id : null);
  // fix(v7.42)：窗口在屏守卫 —— 重复触发开后台（快速连点按钮）时窗口可能已缩入
  // 卡片挂起（flyAppToCard 落定已摘 .open，isOpen 仍为 true）：此时再飞只会隐形
  // 重播 440ms。仅在窗口真实在屏时才走连续缩放/关闭分支，否则仅呈现 deck。
  const appWinEl = document.getElementById('appWindow');
  const windowOnScreen = !!(appWinEl && appWinEl.classList.contains('open'));
  const zoomToCard = windowOnScreen && state.isOpen && !splitActive && !!fromId;

  // 若传入了当前应用，将其设为正中央卡片
  if (fromId) {
    recordAppOpened(fromId);
  }
  scrollOffset = 0;
  targetScrollOffset = 0;

  renderRecentCards();
  resetDeckCardStyles(); // v7.35：淡出残留确定性自愈（入场动画之前完成复位）

  // Phase 1: 激活 overlay 背景与景深（连续缩放路径需先在最终位态量取卡片矩形）
  overlay.classList.add('active');

  // 分屏会话在场：同步挂起分屏浮层（会话无损保留），后台以合并卡片组呈现
  // v7.33：挂起动画指哪打哪 —— 实况分屏连续缩进合并卡片组矩形（零硬切）
  if (getSplitInfo().active && window.__splitSuspend) {
    const splitCard = document.querySelector('.recent-app-card.recent-split-card');
    if (splitCard) splitCard.style.opacity = '0';
    window.__splitSuspend(splitCard ? splitCard.getBoundingClientRect() : null, () => {
      if (splitCard) splitCard.style.opacity = '1';
    });
  }

  // v7.9-B 量取目标卡片矩形；v7.23 真连续缩放：
  //   目标卡片自始至终保持可见 —— 纯缩放插值的每个中间态都完整包含卡片矩形，
  //   不透明窗口全程遮挡卡片、settle 瞬时交接（零交叉淡入、零重影）。
  //   旧实现「窗口尾段渐隐 ↔ 卡片 280ms 后才淡入」会在中途透出暗色 deck 背景，
  //   正是「中间断裂」的来源；cardZoom 通道（app-window render）已同步关闭渐隐。
  // fix(v7.42)：瞄准「预览区」而非整卡矩形 —— 窗口是屏幕等比（高 = previewH），
  //   整卡矩形含 44px 头部，居中落位后与预览区存在 22px 垂直偏差，交接瞬刻
  //   内容可见跳动。预览区宽高比 ≡ 屏幕（previewW = previewH·winW/winH），
  //   瞄准此处落位 → 窗口与卡片快照像素级对齐，交接零跳变。
  let shrinkRect = null;
  let targetHeader = null;
  const targetCard = zoomToCard ? document.querySelector(`.recent-app-card[data-app-id="${fromId}"]`) : null;
  if (targetCard) {
    const previewEl = targetCard.querySelector('.recent-card-preview');
    const r = previewEl ? previewEl.getBoundingClientRect() : targetCard.getBoundingClientRect();
    if (r.width > 80 && r.height > 80) shrinkRect = r;
    targetHeader = targetCard.querySelector('.recent-card-header');
  }

  // v7.46：邻卡浮现编排函数 —— 由 flyAppToCard 的物理逼近锚点（onApproach）触发，
  // 替代 v7.42 的 setTimeout(160) 时钟对齐：窗口真实飞到「剩余 42% 距离」
  // 才开始错峰入场，物理与编排同相位，落定迟早不再影响连贯感。
  let otherCards = [];
  const startNeighborWaves = () => {
    otherCards.forEach((c) => {
      const parsedIdx = parseInt(c.dataset.idx, 10) || 0;
      const delay = Math.min(parsedIdx * 45, 180);
      c.style.transition = `transform ${dur(380)}ms ${cssEase('emphasized')} ${dur(delay)}ms, opacity ${dur(300)}ms ${cssEase('emphasized')} ${dur(delay)}ms`;
      c.style.opacity = '1';
      c.style.transform = c.dataset.restingTransform || '';
      after(420 + delay, () => {
        c.style.transition = '';
        delete c.dataset.restingTransform;
      });
    });
    // 操作胶囊同步入场（旧 setTimeout(300) → 同一物理锚点 + 内部短延时）
    if (actionsRow) {
      after(140, () => {
        actionsRow.style.transition = `opacity ${dur(240)}ms ${cssEase('emphasized')}, transform ${dur(240)}ms ${cssEase('emphasized')}`;
        actionsRow.style.opacity = '1';
        actionsRow.style.transform = 'translateY(0)';
        after(260, () => { actionsRow.style.transition = ''; });
      });
    }
  };

  if (zoomToCard) {
    // 隐藏背景卡片初态，准备由近及远、自后向前的连续流动登场
    // （otherCards 提升到函数作用域：startNeighborWaves 物理锚点回调需要访问）
    otherCards = Array.from(document.querySelectorAll('.recent-app-card')).filter(c => c !== targetCard);
    otherCards.forEach((c) => {
      c.dataset.restingTransform = c.style.transform || '';
      c.style.transition = 'none';
      c.style.opacity = '0';
      c.style.transform = (c.dataset.restingTransform || '') + ' translate3d(0, 44px, -140px) scale(0.82)';
    });

    // 关键：隐藏目标卡片，由窗口以单一物理连续变换平滑缩入该位置后再瞬间接管（杜绝任何双层/跳变断裂）
    if (targetCard) targetCard.style.opacity = '0';
    // 头部由落定帧单独渐入（预览区与窗口几何严丝合缝，头部是额外 UI，瞬现会读作弹跳）
    if (targetHeader) {
      targetHeader.style.transition = 'none';
      targetHeader.style.opacity = '0';
    }

    if (shrinkRect) {
      // v7.46：弹簧飞行 + 速度继承 + 物理编排锚点 ——
      // gestureVel（松指真实速度）注入飞行初速：全屏被「掷入」卡片；
      // 邻卡/操作栏由 onApproach 触发；头部渐入落在物理落定帧（onDone）。
      flyAppToCard(shrinkRect, () => {
        if (targetCard) targetCard.style.opacity = '1';
        if (targetHeader) {
          after(40, () => {
            targetHeader.style.transition = `opacity ${dur(160)}ms ${cssEase('emphasized')}`;
            targetHeader.style.opacity = '1';
            after(200, () => {
              targetHeader.style.transition = '';
              targetHeader.style.opacity = '';
            });
          });
        }
      }, {
        velocity: gestureVel,
        onApproach: startNeighborWaves,
      });
    } else {
      closeApp(0, 0, -0.55);
    }
  } else if (windowOnScreen && state.isOpen) {
    closeApp(0, -420, -0.9);
  }
  // else：窗口已挂起在卡片中（重复开后台）—— 仅呈现 deck，不重播窗口动画

  // Phase 2: Deck 进场 3D 浮升微动画（连续缩放路径跳过：窗口飞入即入场动感）
  // v7.46：曲线收敛到 gentle 令牌 + 速度倍率缩放（retire 0.2,0.95,0.25,1.02 家族）
  const deck = document.getElementById('recentCardsDeck');
  if (deck && !zoomToCard) {
    deck.style.opacity = '0';
    deck.style.transform = 'translate3d(0, 30px, -120px) scale(0.92)';
    requestAnimationFrame(() => {
      deck.style.transition = `transform ${dur(320)}ms ${cssEase('gentle')}, opacity ${dur(250)}ms ${cssEase('emphasized')}`;
      deck.style.opacity = '1';
      deck.style.transform = 'translate3d(0, 0, 0) scale(1)';
      after(340, () => {
        deck.style.transition = '';
        // v7.35：入场落定即清内联变换 —— 残留的恒等 transform（translate3d(0,0,0)
        // scale(1)）会让 3D 轮播侧卡（rotateY + translateZ）在合成器命中测试中
        // 不可点（实测 pointerdown 目标落到 deck 自身，侧卡轻点聚焦/组合卡启动
        // 全部失灵）；同时违反「动画落定清内联」纪律
        deck.style.transform = '';
        deck.style.opacity = '';
      });
    });
  }

  // Phase 3 操作胶囊（v7.46）：连续缩放路径已由 startNeighborWaves 的物理锚点接管，
  // 仅非缩放路径（deck 直开）在此处错峰淡入
  const actionsRow = document.getElementById('recentActionsRow');
  if (actionsRow && !zoomToCard) {
    actionsRow.style.opacity = '0';
    actionsRow.style.transform = 'translateY(16px)';
    after(180, () => {
      actionsRow.style.transition = `opacity ${dur(240)}ms ${cssEase('emphasized')}, transform ${dur(240)}ms ${cssEase('emphasized')}`;
      actionsRow.style.opacity = '1';
      actionsRow.style.transform = 'translateY(0)';
      after(260, () => {
        actionsRow.style.transition = '';
      });
    });
  }

  // 入场 3D 惯性吸附
  animateScrollToTarget();
  if (navigator.vibrate) navigator.vibrate([15, 35]);
}

/** 关闭多任务后台 */
export function closeRecentApps() {
  const overlay = document.getElementById('recentAppsOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    // 同步复位分屏配对模式（若处于配对中）
    if (overlay.classList.contains('split-picking')) {
      overlay.classList.remove('split-picking');
      import('./split-screen.js').then((m) => m.cancelPickMode()).catch(() => {});
    }
  }
  // 恢复挂起的分屏会话（若有 —— 轻点合并卡片组/空白关闭后分屏浮出）
  // v7.33：从合并卡片组矩形弹簧飞回全屏（与挂起缩进互逆，零跳变）
  if (window.__splitResume) {
    const splitCard = document.querySelector('.recent-app-card.recent-split-card');
    window.__splitResume(splitCard ? splitCard.getBoundingClientRect() : null);
  }
  if (animationRafId) {
    cancelAnimationFrame(animationRafId);
    animationRafId = null;
  }
  if (pendingDeckRaf) {
    cancelAnimationFrame(pendingDeckRaf);
    pendingDeckRaf = 0;
  }
  // v7.46：关闭后台同时回收吸附弹簧（浮层已卸载，弹簧 onUpdate 不再写表面）
  if (deckSettleTween) {
    deckSettleTween.cancel();
    deckSettleTween = null;
  }
  flingVelocityPx = 0;
}
