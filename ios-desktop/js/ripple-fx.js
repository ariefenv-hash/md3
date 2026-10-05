// ==================== ripple-fx.js — M3E 点击涟漪全局集成（Issue #4 附件采纳） ====================
//
// Android 16 / API 36 Expressive Ripple（RippleShader + RippleAnimationSession 的
// JS 1:1 移植，见 aosp/expressive-ripple.js）接入宿主交互组件。
//
// 架构：共享单例渲染层（全屏 fixed canvas，pointer-events:none）+ 文档级事件委托 ——
//   · 全页仅 1 个 WebGL 上下文（浏览器每页上限 ~16 个，逐元素建 surface 会爆）
//   · 每个会话携带独立 origin / touch / maxRadius / 元素圆角矩形遮罩（uHasMask
//     分支，对应 AOSP RippleDrawable 以 View 边界为涟漪遮罩）与配色 uniform
//   · 颜色跟随主题：浅色 = 黑 12%（MD3 state layer 规范），深色 = 白 20%；
//     元素可经 --ripple-color 覆盖（解析 rgba() / #rgb / #rrggbb / #rgba）
//   · prefers-reduced-motion / WebGL 不可用：静默降级为无涟漪（:active 压暗仍在）

import { AnimationUtils } from './aosp/overscroller.js';
import { ExpressiveRippleSurface, RippleAnimationSession, computeTurbulenceUniforms } from './aosp/expressive-ripple.js';

const RIPPLE_SELECTOR = '.md3-list-item, .md3-btn, .qs-tile-pill, [data-ripple]';

let layer = null;
let initialized = false;

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/** 解析 CSS 颜色字符串 → [r,g,b,a] 0..1（不支持则返回 null） */
export function parseColorToVec4(str) {
  if (!str) return null;
  const s = str.trim();
  let m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.every((n) => !Number.isNaN(n))) {
      const a = parts.length > 3 ? clamp01(parts[3]) : 1;
      return [parts[0] / 255, parts[1] / 255, parts[2] / 255, a];
    }
    return null;
  }
  m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let hex = m[1];
    if (hex.length === 3 || hex.length === 4) hex = hex.split('').map((c) => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }
  return null;
}

/** 浅色主题判定（theme-mode.css 约定：body.light-theme） */
function isLightTheme() {
  return !!(document.body && document.body.classList.contains('light-theme'));
}

class SharedRippleLayer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'md-ripple-layer';
    Object.assign(this.canvas.style, {
      position: 'fixed', inset: '0', width: '100vw', height: '100vh',
      zIndex: '2147483000', pointerEvents: 'none',
    });
    document.body.appendChild(this.canvas);

    // ExpressiveRippleSurface 仅作 shader/program 载体（编译+驱动预热）；
    // 会话循环由本层全权驱动（origin/遮罩/配色按会话注入）
    this.surface = null;
    this.surfaceFailed = false;
    this.sessions = [];
    this.pointers = new Map();   // pointerId -> session
    this._running = false;
    this._raf = this._raf.bind(this);

    this._resize = () => this._resizeCanvas();
    window.addEventListener('resize', this._resize, { passive: true });
    this._resizeCanvas();

    this._onDown = (e) => this._handleDown(e);
    this._onMove = (e) => this._handleMove(e);
    this._onUp = (e) => this._handleUp(e);
    document.addEventListener('pointerdown', this._onDown, true);
    window.addEventListener('pointermove', this._onMove, { passive: true });
    window.addEventListener('pointerup', this._onUp, { passive: true });
    window.addEventListener('pointercancel', this._onUp, { passive: true });
  }

  /** 惰性初始化 WebGL surface（首次真实涟漪时，失败即永久降级） */
  _ensureSurface() {
    if (this.surface || this.surfaceFailed) return;
    try {
      const surface = new ExpressiveRippleSurface(this.canvas, {
        color: 0x73FFFFFF, sparkleColor: 0xE6FFFFFF,
      });
      if (!surface.mSupported) { this.surfaceFailed = true; return; }
      this.surface = surface;
      this._syncSurfaceResolution();
    } catch (e) {
      this.surfaceFailed = true;
    }
  }

  _resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
    if (this.surface) this._syncSurfaceResolution();
  }

  _syncSurfaceResolution() {
    const gl = this.surface.mGl;
    if (!gl) return;
    const w = this.canvas.width, h = this.canvas.height;
    gl.uniform2f(this.surface.mU.uResolutionScale, 1 / w, 1 / h);
    gl.uniform2f(this.surface.mU.uNoiseScale, 2.1 / w, 2.1 / h);
    gl.uniform1f(this.surface.mU.uH, h);
  }

  _handleDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const el = e.target && e.target.closest ? e.target.closest(RIPPLE_SELECTOR) : null;
    if (!el) return;
    if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this._ensureSurface();
    if (!this.surface) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // 视口内可视区域与元素 bounds 求交（列表滚动时涟漪不越过滚动口）
    const vw = window.innerWidth, vh = window.innerHeight;
    const cx0 = Math.max(rect.left, 0), cy0 = Math.max(rect.top, 0);
    const cx1 = Math.min(rect.right, vw), cy1 = Math.min(rect.bottom, vh);
    if (cx1 <= cx0 || cy1 <= cy0) return;

    const now = AnimationUtils.currentAnimationTimeMillis();
    const session = new RippleAnimationSession(
      (rect.left + rect.width / 2) * dpr,       // origin = 视图中心（设备像素）
      (rect.top + rect.height / 2) * dpr,
      e.clientX * dpr, e.clientY * dpr,
      now,
    );
    // 会话专属 maxRadius：RippleComponent.getTargetRadius(bounds) = 半对角线，
    // RippleShader.setRadius 内 ×2.3 —— 逐会话注入（共享层不能再用 surface 初值）
    session.maxRadius = Math.hypot(rect.width / 2, rect.height / 2) * 2.3 * dpr;
    // 遮罩（AOSP in_hasMask 分支）：元素圆角矩形 × 可视交集
    session.mask = {
      has: 1,
      rect: [cx0 * dpr, cy0 * dpr, cx1 * dpr, cy1 * dpr],
      radius: parseFloat(getComputedStyle(el).borderRadius) || 0,
    };
    // 配色：--ripple-color 覆盖 > 主题缺省（浅=黑12% / 深=白20%，AOSP colorControlHighlight）
    const cssColor = getComputedStyle(el).getPropertyValue('--ripple-color').trim();
    session.color = parseColorToVec4(cssColor) || (isLightTheme() ? [0, 0, 0, 0.12] : [1, 1, 1, 0.20]);
    session.sparkle = [1, 1, 1, 0.90];

    this.sessions.push(session);
    this.pointers.set(e.pointerId, session);
    this._ensureLoop();
  }

  _handleMove(e) {
    const s = this.pointers.get(e.pointerId);
    if (!s) return;
    const dpr = window.devicePixelRatio || 1;
    s.touchX = e.clientX * dpr;
    s.touchY = e.clientY * dpr;
  }

  _handleUp(e) {
    const s = this.pointers.get(e.pointerId);
    if (!s) return;
    s.requestExit(AnimationUtils.currentAnimationTimeMillis());
    this.pointers.delete(e.pointerId);
  }

  _ensureLoop() {
    if (this._running) return;
    this._running = true;
    requestAnimationFrame(this._raf);
  }

  _raf() {
    const surface = this.surface;
    if (!surface) { this._running = false; return; }
    const gl = surface.mGl;
    const U = surface.mU;
    const now = AnimationUtils.currentAnimationTimeMillis();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.sessions = this.sessions.filter((s) => {
      s.update(now);
      if (s.finished) return false;
      // exit 阶段 noise 已停（AOSP loop animator 同样 cancel）：
      // turbulence uniforms 冻结为退出时的值，避免每帧三角函数
      if (!s.exiting || s.turbCache === undefined) {
        s.turbCache = computeTurbulenceUniforms(s.noisePhase);
      }
      const tu = s.turbCache;
      gl.uniform2f(U.uTouch, s.touchX, s.touchY);
      gl.uniform1f(U.uProgress, s.progress);
      gl.uniform1f(U.uNoisePhase, s.noisePhase * 0.001);
      gl.uniform1f(U.uTurbulencePhase, s.noisePhase);
      gl.uniform2f(U.uTCircle1, tu.tCircle1[0], tu.tCircle1[1]);
      gl.uniform2f(U.uTCircle2, tu.tCircle2[0], tu.tCircle2[1]);
      gl.uniform2f(U.uTCircle3, tu.tCircle3[0], tu.tCircle3[1]);
      gl.uniform2f(U.uTRotation1, tu.tRotation1[0], tu.tRotation1[1]);
      gl.uniform2f(U.uTRotation2, tu.tRotation2[0], tu.tRotation2[1]);
      gl.uniform2f(U.uTRotation3, tu.tRotation3[0], tu.tRotation3[1]);
      gl.uniform1f(U.uMaxRadius, s.maxRadius);
      if (s.mask) {
        gl.uniform1f(U.uHasMask, s.mask.has);
        gl.uniform4f(U.uMaskRect, s.mask.rect[0], s.mask.rect[1], s.mask.rect[2], s.mask.rect[3]);
        gl.uniform1f(U.uMaskRadius, s.mask.radius);
      } else {
        gl.uniform1f(U.uHasMask, 0);
      }
      gl.uniform4f(U.uColor, s.color[0], s.color[1], s.color[2], s.color[3]);
      gl.uniform4f(U.uSparkleColor, s.sparkle[0], s.sparkle[1], s.sparkle[2], s.sparkle[3]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    });
    if (this.sessions.length > 0 || this.pointers.size > 0) {
      requestAnimationFrame(this._raf);
    } else {
      this._running = false;
    }
  }

  destroy() {
    window.removeEventListener('resize', this._resize);
    document.removeEventListener('pointerdown', this._onDown, true);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('pointercancel', this._onUp);
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    layer = null;
  }
}

/** 文档级初始化（幂等；WebGL/环境不支持时静默降级） */
export function initRippleFx() {
  if (initialized) return;
  initialized = true;
  if (typeof document === 'undefined' || !document.body) return;
  try {
    layer = new SharedRippleLayer();
  } catch (e) {
    layer = null;
  }
  // E2E 透视（与 __state / __qsDebug 同惯例）
  if (typeof window !== 'undefined') {
    window.__rippleDebug = __rippleDebug;
  }
}

/** 测试/调试透视 */
export function __rippleDebug() {
  return {
    active: !!layer,
    sessions: layer ? layer.sessions.length : 0,
    pointers: layer ? layer.pointers.size : 0,
    webgl: !!(layer && layer.surface),
  };
}
