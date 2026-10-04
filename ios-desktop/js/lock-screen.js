// ==================== lock-screen.js — iOS 风格完整锁屏界面 ====================
// 大时钟 + 日期 + 锁屏通知（复用通知中心数据）+ 手电筒/相机快捷入口
// 上滑解锁：拖拽跟手 + RK4 弹簧物理（提交/回弹共用同一弹簧，中途反转无缝）
// 壁纸层复用当前桌面壁纸（静态/自定义/程序化动态均自动适配）

import { ICONS } from './icons.js';
import { Spring, makeSpringParams } from './spring.js';
import { openApp } from './app-window.js';
import { getNotifications, resolveNotiIcon, isRealAppIcon } from './notifications.js';
import { initialApps } from './apps-data.js';
import { emitToApp } from './app-bus.js'; // v7.25：锁屏通知深链（如动态日历摘要定位日期）
import { getProceduralSnapshotURL } from './procedural-wallpaper.js';
import { isVideoActive, getVideoFrameDataURL } from './video-wallpaper.js';
import { clamp } from './utils.js';

const COMMIT_DIST_RATIO = 0.25;   // 上滑距离超过屏高 25% 提交解锁
const COMMIT_VELOCITY = 0.55;     // 或释放速度 > 0.55 px/ms 提交解锁
const FLING_MIN_DIST_RATIO = 0.10; // 快速轻扫的最小位移门槛

// 解锁飞出弹簧（平滑无回弹）；回弹弹簧（轻微过冲）
const UNLOCK_PARAMS = makeSpringParams(0.52, 0.94, 1);
const RETURN_PARAMS = makeSpringParams(0.42, 0.72, 1);

let lockEl = null;
let isLocked = false;
let rafId = null;
let unlockSpring = null;
let animMode = 'idle'; // 'idle' | 'drag' | 'spring'
let pendingCommit = false; // 本次拖拽已提交解锁（抑制拖拽尾随的误触 click）

/**
 * fix(audit-A): 锁屏通知文本转义 —— 通知 title/desc/app/time 为应用可控文本
 * （任意子应用可经 __system.notify 注入），与通知中心/横幅同源插入 innerHTML 前必须转义。
 */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 生成锁屏内部使用的内联 SVG（1em 随宿主缩放） */
const LOCK_CHEVRON = `<svg viewBox="0 0 24 24" style="width:1.35em;height:1.35em;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round"><path d="M5 14.5 L12 8 L19 14.5"/></svg>`;
const LOCK_FLASHLIGHT = `<svg viewBox="0 0 24 24" style="width:1.3em;height:1.3em;fill:currentColor"><path d="M6 2h12v3l-3 4v11c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2V9L6 5V2zm2 2v.6l3 4V20h2V8.6l3-4V4H8zm3 6h2v3h-2v-3z"/></svg>`;
const LOCK_CAMERA = `<svg viewBox="0 0 24 24" style="width:1.3em;height:1.3em;fill:currentColor"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M9 3 7.2 5H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.2L15 3H9zm3 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>`;

/** 格式化 HH:MM */
function formatTime(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 格式化中文长日期 */
function formatDate(d) {
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${week[d.getDay()]}`;
}

/** 刷新锁屏时钟 */
function refreshClock() {
  if (!lockEl) return;
  const now = new Date();
  const timeEl = lockEl.querySelector('.lock-clock');
  const dateEl = lockEl.querySelector('.lock-date');
  if (timeEl) timeEl.textContent = formatTime(now);
  if (dateEl) dateEl.textContent = formatDate(now);
}

/** 同步锁屏壁纸层：视频壁纸当前帧 > 程序化快照 > 桌面当前背景（含自定义上传） */
function refreshWallpaperLayer() {
  if (!lockEl) return;
  const layer = lockEl.querySelector('.lock-wallpaper');
  if (!layer) return;
  try {
    if (isVideoActive()) {
      const frame = getVideoFrameDataURL();
      if (frame) {
        layer.style.backgroundImage = `url("${frame}")`;
        return;
      }
    }
    const proc = getProceduralSnapshotURL();
    if (proc) {
      layer.style.backgroundImage = `url("${proc}")`;
      return;
    }
    const desktop = document.getElementById('desktop');
    if (desktop) {
      const bg = getComputedStyle(desktop).backgroundImage;
      if (bg && bg !== 'none') {
        layer.style.backgroundImage = bg;
        return;
      }
    }
    layer.style.backgroundImage = '';
  } catch (e) {
    layer.style.backgroundImage = '';
  }
}

/** 渲染锁屏通知列表（复用通知中心数据源，最多展示 4 条） */
function renderLockNotifications() {
  if (!lockEl) return;
  const box = lockEl.querySelector('.lock-notifications');
  if (!box) return;
  const items = getNotifications().slice(0, 4);
  box.innerHTML = '';

  if (items.length === 0) {
    box.innerHTML = `<div class="lock-noti-empty">暂无新通知</div>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'lock-noti-card';
    card.innerHTML = `
      <div class="lock-noti-icon ${isRealAppIcon(item) ? 'lock-noti-icon--app' : ''}">${resolveNotiIcon(item)}</div>
      <div class="lock-noti-body">
        <div class="lock-noti-top">
          <span class="lock-noti-app">${esc(item.app)}</span>
          <span class="lock-noti-time">${esc(item.time)}</span>
        </div>
        <div class="lock-noti-title">${esc(item.title)}</div>
        <div class="lock-noti-desc">${esc(item.desc)}</div>
      </div>
    `;
    // 点击通知：解锁并以该卡片图标位置为动画源打开对应应用（放射动画从点按处起飞）
    card.addEventListener('click', () => {
      if (pendingCommit) return; // 本次手势已提交解锁，忽略拖拽尾随的 click
      const targetAppId = item.appId || 'msg';
      const appIdx = initialApps.findIndex(a => a.id === targetAppId);
      if (appIdx === -1) return;
      const iconBox = card.querySelector('.lock-noti-icon');
      const rect = iconBox ? iconBox.getBoundingClientRect() : null;
      // v7.25：深链通知（日历摘要等）→ 解锁前先总线投递（app-bus 补投保证
      // 目标应用就绪后收到），再走原解锁打开链路
      const dl = item.deepLink;
      if (dl && dl.appId && dl.event) {
        try { emitToApp(dl.appId, dl.event, Object.assign({}, dl.payload || {}, { __silent: true }), 'lockscreen'); } catch (e) {}
      }
      unlockAndOpen(appIdx, rect);
    });
    box.appendChild(card);
  });
}

/**
 * 创建锁屏 DOM（一次性注入 body 顶层）
 * z-index 98000：低于手电筒遮罩(99999)、高于通知横幅(10005)与其余全部界面
 */
function ensureLockDOM() {
  if (lockEl) return;

  lockEl = document.createElement('div');
  lockEl.id = 'lockScreen';
  lockEl.className = 'lock-screen';
  lockEl.innerHTML = `
    <div class="lock-wallpaper"></div>
    <div class="lock-dim"></div>
    <div class="lock-content">
      <div class="lock-top-area">
        <div class="lock-badge">${ICONS.lock}</div>
        <div class="lock-date">1月1日 星期四</div>
        <div class="lock-clock">00:00</div>
      </div>
      <div class="lock-notifications"></div>
      <div class="lock-bottom-area">
        <button class="lock-quick-btn" id="lockTorchBtn" aria-label="手电筒">${LOCK_FLASHLIGHT}</button>
        <div class="lock-unlock-hint">
          <span class="lock-hint-chevron">${LOCK_CHEVRON}</span>
          <span>向上轻扫以解锁</span>
        </div>
        <button class="lock-quick-btn" id="lockCameraBtn" aria-label="相机">${LOCK_CAMERA}</button>
      </div>
    </div>
  `;

  document.body.appendChild(lockEl);

  refreshClock();
  refreshWallpaperLayer();
  renderLockNotifications();
  setInterval(refreshClock, 10000);

  // 手电筒：联动快捷设置磁贴（解耦调用，不导入 quick-settings 模块）
  const torchBtn = lockEl.querySelector('#lockTorchBtn');
  if (torchBtn) {
    torchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tile = document.querySelector('[data-tile-id="torch"]');
      if (tile) tile.click();
      // fix(audit-A): 镜像反转 —— tile.click() 同步应用新状态后读取磁贴当前 active 类
      // （旧实现 !contains('active') 把「点击后已开启」映成了「按钮不点亮」）。
      // 磁贴不可达时（面板未渲染过）回退：按钮态维持原值翻转。
      if (tile) torchBtn.classList.toggle('active', tile.classList.contains('active'));
      else torchBtn.classList.toggle('active');
    });
  }

  // 相机：解锁后直达相机应用
  const cameraBtn = lockEl.querySelector('#lockCameraBtn');
  if (cameraBtn) {
    cameraBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const appIdx = initialApps.findIndex(a => a.id === 'camera');
      if (appIdx === -1) return;
      const btnRect = cameraBtn.getBoundingClientRect();
      unlockAndOpen(appIdx, btnRect);
    });
  }

  initUnlockGesture();

  // fix(audit-B): 锁屏期间通知增删实时刷新 —— 通知中心数据变更时（notifications.js
  // 在增/删/清空/远端删除后派发 notifications-changed），锁屏在场则重渲染锁屏列表
  // （旧实现仅 lockNow 时渲染一次，锁屏期间新增/清除通知不更新）。
  window.addEventListener('notifications-changed', () => {
    if (isLocked) renderLockNotifications();
  });
}

/**
 * 上滑解锁手势（Pointer Events 统一鼠标/触摸）
 * 不使用 setPointerCapture：capture 会把后续 click 重定向到锁屏层自身，
 * 导致锁屏通知卡片与快捷按钮的原生点击失效；改用 window 级 move/up 监听。
 * 拖拽期 1:1 跟手 + 轻微阻尼；释放期同一枚弹簧无缝接管（提交或回弹，反转不瞬移）
 */
function initUnlockGesture() {
  let tracking = false;
  let startY = 0;
  let startT = 0;
  let lastDy = 0;
  let lastT = 0;
  let lastV = 0; // px/ms（向上为正）
  let dragDy = 0;

  // 内容层引用缓存（结构性元素；断链时重查）：拖拽热路径不再逐事件 querySelector
  let contentCache = null;
  const getContent = () => {
    if (!contentCache || !contentCache.isConnected) contentCache = lockEl.querySelector('.lock-content');
    return contentCache;
  };

  // v7.32：拖拽热路径 rAF 帧合并 —— pointermove 事件率（可达 120Hz+）只更新
  // pending 状态，transform/opacity 每帧至多落一次（永远取最新值）；finish 先 flush，
  // 防止弹簧接管后残留帧回写旧位移
  let applyRafId = 0;
  let pendingDy = 0, pendingOp = 0;
  const writeOffset = (dy, opacityProgress) => {
    lockEl.style.transform = `translate3d(0, ${(-dy).toFixed(1)}px, 0)`;
    const content = getContent();
    if (content) {
      const p = Math.max(0, Math.min(1, opacityProgress));
      content.style.opacity = (1 - p).toFixed(3);
      content.style.transform = `translate3d(0, ${(dy * -0.16).toFixed(1)}px, 0)`;
    }
  };
  const applyOffset = (dy, opacityProgress) => {
    pendingDy = dy;
    pendingOp = opacityProgress;
    if (applyRafId) return;
    applyRafId = requestAnimationFrame(() => {
      applyRafId = 0;
      writeOffset(pendingDy, pendingOp);
    });
  };
  const flushOffset = () => {
    if (applyRafId) { cancelAnimationFrame(applyRafId); applyRafId = 0; }
  };

  const screenH = () => window.innerHeight || 820;

  const onMove = (e) => {
    if (!tracking || animMode !== 'drag') return;
    const dy = startY - e.clientY; // 向上为正
    const nowT = performance.now();
    const dt = Math.max(1, nowT - lastT);
    lastV = (dy - lastDy) / dt;
    lastDy = dy;
    lastT = nowT;

    // 向上跟手；向下拖拽施加阻尼（橡皮筋），最多 -34px
    dragDy = dy > 0 ? dy : dy * 0.15;
    const op = Math.max(0, dragDy) / (screenH() * 0.9);
    applyOffset(dragDy, op);
  };

  const finish = (e) => {
    if (!tracking || animMode !== 'drag') return;
    tracking = false;
    flushOffset(); // v7.32：丢弃未落帧，位移真值由 dragDy 交弹簧接力
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', finish);
    window.removeEventListener('pointercancel', finish);

    const dy = dragDy;
    const elapsed = performance.now() - startT;
    const velocity = elapsed < 260 ? lastV : 0; // 只有快速滑动才采信速度
    const h = screenH();

    // 原地轻点（位移/速度均可忽略）：不启动弹簧，让 click 事件直达通知卡片/按钮
    if (Math.abs(dy) < 6 && Math.abs(velocity) < 0.2) {
      animMode = 'idle';
      lockEl.style.transform = 'translate3d(0, 0, 0)';
      return;
    }

    const shouldCommit = dy > h * COMMIT_DIST_RATIO ||
      (velocity > COMMIT_VELOCITY && dy > h * FLING_MIN_DIST_RATIO);
    pendingCommit = shouldCommit;
    startUnlockSpring(shouldCommit, dy, shouldCommit ? Math.max(velocity, 0.6) : velocity);
  };

  lockEl.addEventListener('pointerdown', (e) => {
    if (animMode === 'spring') return; // 弹簧动画期间忽略新按点（与 iOS 一致）
    tracking = true;
    animMode = 'drag';
    startY = e.clientY;
    startT = performance.now();
    lastDy = 0;
    lastT = startT;
    lastV = 0;
    dragDy = 0;
    lockEl.style.transition = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  });
}

/**
 * 释放后由弹簧接管：commit=true 飞出解锁，false 回弹归位
 * 初值 = 当前拖拽位移，初速 = 真实释放速度 → 无缝接力不瞬移
 */
function startUnlockSpring(commit, fromDy, velocity) {
  animMode = 'spring';
  const h = window.innerHeight || 820;
  unlockSpring = new Spring({
    ...UNLOCK_PARAMS,
    initialValue: fromDy,
    initialVelocity: velocity * 1000, // Spring 速度单位为 px/s，手势为 px/ms
  });
  unlockSpring.target = commit ? h * 1.15 : 0;

  // v7.13：提交解锁的瞬间即预启桌面入场动效 —— 布局测量/样式写入/层准备的全部
  // 开销都落在锁屏遮盖之下（用户不可见）；锁屏飞离时图标已在入场途中，与解锁
  // 飞行形成连续一体的运动叙事（iOS 同款衔接感），同时消除入场首帧卡顿。
  if (commit) playUnlockEntrance();

  let lastNow = performance.now();
  const getContent = () => {
    // 弹簧循环逐帧调用：缓存内容层引用，断链时重查
    if (!springContentCache || !springContentCache.isConnected) springContentCache = lockEl.querySelector('.lock-content');
    return springContentCache;
  };
  let springContentCache = null;
  const step = (now) => {
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    unlockSpring.update(dt);

    const x = unlockSpring.x;
    const content = getContent();
    if (commit) {
      const op = Math.max(0, 1 - Math.max(0, x) / (h * 0.9));
      lockEl.style.transform = `translate3d(0, ${(-x).toFixed(1)}px, 0)`;
      lockEl.style.opacity = op.toFixed(3);
      if (content) content.style.opacity = '1';
      if (unlockSpring.isSettled(0.5, 30) || op <= 0.01) {
        completeUnlock();
        return;
      }
    } else {
      lockEl.style.transform = `translate3d(0, ${(-x).toFixed(1)}px, 0)`;
      if (content) {
        const op = Math.max(0, 1 - Math.max(0, x) / (h * 0.9));
        content.style.opacity = op.toFixed(3);
        content.style.transform = `translate3d(0, ${(x * -0.16).toFixed(1)}px, 0)`;
      }
      if (unlockSpring.isSettled(0.5, 30)) {
        lockEl.style.transform = 'translate3d(0, 0, 0)';
        if (content) { content.style.opacity = ''; content.style.transform = ''; }
        animMode = 'idle';
        pendingCommit = false;
        return;
      }
    }
    rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
}

/** 解锁完成：隐藏锁屏、解除全局锁定状态 */
function completeUnlock() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  animMode = 'idle';
  pendingCommit = false;
  isLocked = false;
  lockEl.style.display = 'none';
  lockEl.style.transform = '';
  lockEl.style.opacity = '';
  lockEl.style.transition = '';
  const content = lockEl.querySelector('.lock-content');
  if (content) { content.style.opacity = ''; content.style.transform = ''; }
  document.body.classList.remove('is-locked');
  // v7.13：入场动效已在 startUnlockSpring 提交分支预先启动（锁屏遮盖下完成全部
  // 预备开销，飞离时图标已在入场途中），此处不再补播
}

// ==================== 解锁桌面图标入场动效（v7.13 高保真复刻双风格） ====================
// iOS「整排飞入」：复刻 SpringBoard IconFlyInAnimator —— 图标自屏幕底缘起飞，
//   真实行分组后一整排一整排错峰飞入（底排先行、自下而上），受控过冲后自然落位；
// Android「涟漪扩散」：复刻 Material You 解锁涟漪 —— 以屏幕中心为波源，图标随扩散
//   波前由内向外浮现（缩放 + 内聚位移释放 + 淡入），并伴随可见的涟漪光环扩散。
// 性能：全部动画仅驱动合成器属性（transform/opacity）；预备段（测量/回流/层准备）
//   在锁屏遮盖下执行 —— 起飞开销对用户完全不可见，锁屏飞离时图标已在入场途中。
const UNLOCK_STYLE_KEY = 'ios-desktop:unlock-anim-style';

/** 获取当前解锁入场动效风格：'ios'（整排飞入）或 'android'（中心涟漪辐射） */
export function getUnlockAnimStyle() {
  try {
    const v = localStorage.getItem(UNLOCK_STYLE_KEY);
    return v === 'android' ? 'android' : 'ios';
  } catch (e) {
    return 'ios';
  }
}

/** 设置解锁入场动效风格并广播通知 */
export function setUnlockAnimStyle(style) {
  if (style !== 'ios' && style !== 'android') return;
  try { localStorage.setItem(UNLOCK_STYLE_KEY, style); } catch (e) {}
  document.dispatchEvent(new CustomEvent('unlock-style-changed', { detail: { style } }));
}

// —— 手感参数（集中调校区）——
const IOS_ROW_DELAY = 54;          // iOS：相邻两排的起飞间隔（ms）
const IOS_COL_DELAY = 9;           // iOS：同排内列微错峰（ms）
const IOS_DURATION = 620;          // iOS：单图标飞行总时长（含过冲落位）
const ANDROID_WAVE_SPREAD = 360;   // Android：涟漪波前扫满全屏用时（ms）
const ANDROID_DURATION = 520;      // Android：单图标涟漪出场时长（ms）
const AND_RADIAL_OFFSET = 20;      // Android：初始内聚位移（px，指向波源）
const ENTRANCE_CLEAN_MARGIN = 140; // 清场裕量（等最慢动画结束后回收类名）

let unlockEnterTimer = 0;
let unlockRippleTimer = 0;

/** prefers-reduced-motion 安全读取（异常环境降级为 false） */
function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}

/**
 * 真实行分组：按视觉 top 坐标聚簇（容差 12px），行内按 left 升序。
 * 相比旧版 index/4 假设，正确覆盖 4/6 列响应式网格与文件夹混排场景。
 * @param {HTMLElement[]} icons
 */
function groupIconsByRow(icons) {
  const ROW_EPS = 12;
  const measured = icons.map((el) => {
    const r = el.getBoundingClientRect();
    return { el, top: r.top, left: r.left };
  });
  measured.sort((a, b) => a.top - b.top || a.left - b.left);
  const rows = [];
  for (const m of measured) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(m.top - last.top) <= ROW_EPS) last.items.push(m);
    else rows.push({ top: m.top, items: [m] });
  }
  return rows;
}

/** 入场动效全量清场（图标 + 小部件 + 页点），连续锁/解锁可重触发 */
function clearUnlockEntrance() {
  document.querySelectorAll('.unlock-icon-in, .unlock-icon-in-ios, .unlock-icon-in-android, .unlock-icon-fade').forEach((el) => {
    el.classList.remove('unlock-icon-in', 'unlock-icon-in-ios', 'unlock-icon-in-android', 'unlock-icon-fade');
    el.style.animationDelay = '';
    el.style.removeProperty('--radial-dx');
    el.style.removeProperty('--radial-dy');
  });
  const glance = document.getElementById('pixelAtAGlance');
  if (glance) { glance.classList.remove('unlock-glance-in'); glance.style.animationDelay = ''; }
  const dots = document.getElementById('pageDots');
  if (dots) { dots.classList.remove('unlock-dots-in'); dots.style.animationDelay = ''; }
}

/** Android 涟漪光环：两道错峰扩散环（纯 transform/opacity 合成器动画，播完即移除） */
function spawnUnlockRippleRing(maxDist) {
  const host = document.getElementById('desktop');
  if (!host) return;
  host.querySelectorAll('.unlock-ripple-ring').forEach((el) => el.remove());
  const dia = Math.max(240, Math.ceil(maxDist * 2 + 140));
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 2; i++) {
    const ring = document.createElement('div');
    ring.className = 'unlock-ripple-ring' + (i === 1 ? ' unlock-ripple-ring--second' : '');
    ring.style.width = `${dia}px`;
    ring.style.height = `${dia}px`;
    ring.setAttribute('aria-hidden', 'true');
    frag.appendChild(ring);
  }
  host.appendChild(frag);
  clearTimeout(unlockRippleTimer);
  unlockRippleTimer = setTimeout(() => {
    host.querySelectorAll('.unlock-ripple-ring').forEach((el) => el.remove());
  }, 1000);
}

/**
 * 播放解锁入场动效。由解锁提交弹簧起点调用：全部预备开销
 * （rect 测量 / 单次回流 / 样式写入 / 合成层准备）都在锁屏遮盖下完成。
 * @returns {number} 动效总时长（ms）
 */
function playUnlockEntrance() {
  clearTimeout(unlockEnterTimer);
  const slider = document.getElementById('desktopSlider');
  if (!slider) return 0;
  // 仅当前视口内的桌面页参与（其他页不可见；避免无谓动画与滑页手势打架）
  const page = Array.from(slider.children).find((p) => {
    const r = p.getBoundingClientRect();
    return r.width > 0 && r.right > 0 && r.left < window.innerWidth;
  });
  if (!page) return 0;
  const icons = Array.from(page.querySelectorAll('.app-icon, .app-folder'));
  if (icons.length === 0) return 0;

  const animStyle = getUnlockAnimStyle();
  clearUnlockEntrance();

  // 无动效偏好（prefers-reduced-motion）：一次性温和淡入，不位移不缩放
  if (prefersReducedMotion()) {
    icons.forEach((el) => el.classList.add('unlock-icon-fade'));
    unlockEnterTimer = setTimeout(clearUnlockEntrance, 460);
    return 400;
  }

  void page.offsetWidth; // 单次 reflow：确保连续锁/解锁时动画可重新触发

  const glance = document.getElementById('pixelAtAGlance');
  const dots = document.getElementById('pageDots');
  let totalMs = 0;

  if (animStyle === 'android') {
    // —— Android 涟漪扩散：中心波源 + 距离波前延迟 + 涟漪光环 ——
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const maxDist = Math.hypot(cx, cy) || 1;
    let maxDelay = 0;
    icons.forEach((el) => {
      const r = el.getBoundingClientRect();
      const ix = r.left + r.width / 2;
      const iy = r.top + r.height / 2;
      const dist = Math.hypot(ix - cx, iy - cy);
      const norm = clamp(dist / maxDist, 0, 1);
      const dirX = dist > 0 ? (ix - cx) / dist : 0;
      const dirY = dist > 0 ? (iy - cy) / dist : 0;
      el.style.setProperty('--radial-dx', `${(-dirX * AND_RADIAL_OFFSET).toFixed(1)}px`);
      el.style.setProperty('--radial-dy', `${(-dirY * AND_RADIAL_OFFSET).toFixed(1)}px`);
      const delay = Math.round(Math.pow(norm, 0.9) * ANDROID_WAVE_SPREAD);
      if (delay > maxDelay) maxDelay = delay;
      el.style.animationDelay = `${delay}ms`;
      el.classList.add('unlock-icon-in-android');
    });
    spawnUnlockRippleRing(maxDist);
    if (glance) {
      glance.style.animationDelay = `${Math.round(ANDROID_WAVE_SPREAD * 0.3)}ms`;
      glance.classList.add('unlock-glance-in');
    }
    if (dots) {
      dots.style.animationDelay = `${Math.round(ANDROID_WAVE_SPREAD * 0.75)}ms`;
      dots.classList.add('unlock-dots-in');
    }
    totalMs = maxDelay + ANDROID_DURATION;
  } else {
    // —— iOS 整排飞入：真实行分组，底排先行、自下而上逐排续接 ——
    const rows = groupIconsByRow(icons);
    rows.forEach((row, rowIdx) => {
      const rowDelay = (rows.length - 1 - rowIdx) * IOS_ROW_DELAY; // 底排（视觉最靠下）先行
      row.items.forEach((m, colIdx) => {
        m.el.style.animationDelay = `${rowDelay + colIdx * IOS_COL_DELAY}ms`;
        m.el.classList.add('unlock-icon-in-ios');
      });
    });
    // 小部件随首波后柔和浮现；页点位于屏底，随首排同步淡入
    if (glance) {
      glance.style.animationDelay = `${Math.round(IOS_ROW_DELAY * 1.2)}ms`;
      glance.classList.add('unlock-glance-in');
    }
    if (dots) {
      dots.style.animationDelay = `${Math.round(IOS_ROW_DELAY * 0.6)}ms`;
      dots.classList.add('unlock-dots-in');
    }
    totalMs = Math.max(0, rows.length - 1) * IOS_ROW_DELAY + 2 * IOS_COL_DELAY + IOS_DURATION;
  }

  unlockEnterTimer = setTimeout(clearUnlockEntrance, totalMs + ENTRANCE_CLEAN_MARGIN);
  return totalMs + ENTRANCE_CLEAN_MARGIN;
}

/** 锁屏出现动画：自顶部滑落（CSS transition 驱动，一次性） */
let engageTimer = null;
function playEngageAnimation() {
  lockEl.style.transition = 'none';
  lockEl.style.transform = 'translate3d(0, -100%, 0)';
  lockEl.style.opacity = '0';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      lockEl.style.transition = 'transform 0.55s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease';
      lockEl.style.transform = 'translate3d(0, 0, 0)';
      lockEl.style.opacity = '1';
      // 收尾复位带守卫：解锁/重建后不再对脱链元素写样式（测试 teardown 报错源）
      if (engageTimer) clearTimeout(engageTimer);
      engageTimer = setTimeout(() => {
        engageTimer = null;
        if (!lockEl.isConnected) return;
        lockEl.style.transition = '';
        lockEl.style.opacity = '';
      }, 600);
    });
  });
}

/** 立即锁屏（供快捷设置磁贴 / 测试钩子调用） */
export function lockNow() {
  ensureLockDOM();
  if (isLocked) return;
  isLocked = true;
  document.body.classList.add('is-locked');
  refreshClock();
  refreshWallpaperLayer();
  renderLockNotifications();
  lockEl.style.display = 'flex';
  playEngageAnimation();
}

/** 解锁并打开指定应用（锁屏通知 / 相机快捷键路径） */
function unlockAndOpen(appIdx, sourceRect) {
  ensureLockDOM();
  if (isLocked) {
    // 快速解锁：直接完成（不做完整上滑动画，让位给应用打开动画）
    if (animMode === 'spring' && rafId) cancelAnimationFrame(rafId);
    isLocked = false;
    animMode = 'idle';
    lockEl.style.display = 'none';
    lockEl.style.transform = '';
    lockEl.style.opacity = '';
    lockEl.style.transition = '';
    const content = lockEl.querySelector('.lock-content');
    if (content) { content.style.opacity = ''; content.style.transform = ''; }
    document.body.classList.remove('is-locked');
  }
  const rect = (sourceRect && sourceRect.width > 0 && Number.isFinite(sourceRect.left)) ? sourceRect : null;
  openApp(appIdx, null, rect);
}

// ==================== 测试钩子（无头回归使用） ====================

if (typeof window !== 'undefined') {
  window.__lockTest = {
    isLocked: () => isLocked,
    lock: () => lockNow(),
    /** 无动画瞬间解锁（回归脚本用） */
    instantUnlock: () => {
      if (!lockEl) { isLocked = false; document.body.classList.remove('is-locked'); return; }
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      animMode = 'idle';
      isLocked = false;
      lockEl.style.display = 'none';
      lockEl.style.transform = '';
      lockEl.style.opacity = '';
      lockEl.style.transition = '';
      document.body.classList.remove('is-locked');
    },
    /** 无动画瞬间上锁（回归脚本用） */
    instantLock: () => {
      ensureLockDOM();
      isLocked = true;
      document.body.classList.add('is-locked');
      refreshClock();
      refreshWallpaperLayer();
      renderLockNotifications();
      lockEl.style.transition = 'none';
      lockEl.style.display = 'flex';
      lockEl.style.transform = 'translate3d(0, 0, 0)';
      lockEl.style.opacity = '1';
    },
  };
}

/** 初始化：默认展示锁屏（?nolock=1 时跳过，供调试与部分回归场景） */
export function initLockScreen() {
  const params = new URLSearchParams(window.location.search || '');
  if (params.has('nolock')) {
    document.body.classList.remove('is-locked');
    return;
  }
  lockNow();
}
