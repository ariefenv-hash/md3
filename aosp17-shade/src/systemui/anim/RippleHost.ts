/**
 * anim/RippleHost.ts — ExpressiveRippleSurface 的 DOM 接线层。
 *
 * AOSP 语义：
 *  - RippleDrawable 在 state_pressed=true（ACTION_DOWN）即开启动画 —— pointerdown
 *    立即触发，与真机一致（此前移植版无涟漪/仅 click 缩放，是"延迟感"的根源）；
 *  - 涟漪以 View 边界+圆角为遮罩（in_hasMask=1，圆角矩形 SDF）；
 *  - maxRadius = getTargetRadius(bounds) = √(w²+h²)/2，shader 内 ×2.3；
 *  - 波色 = colorControlHighlight（M3 ≈ onSurface/onPrimary 12% 量级）。
 *
 * 实现：单一全屏 WebGL 画布（pointer-events:none），所有 data-ripple 元素共享，
 * 每次按压一个 session（多指多 session），避免每元素建上下文。
 */
import { ExpressiveRippleSurface, colorToVec4 } from './aosp-expressive-ripple';

export interface RippleOptions {
  /** CSS 颜色（rgba()），缺省 #ffffff 12% */
  color?: string;
  /** 遮罩圆角 px；缺省读元素 computed borderRadius；'50%' = 圆 */
  radius?: string;
}

export class RippleHost {
  private static instance: RippleHost | null = null;
  private surface: ExpressiveRippleSurface | null = null;
  private canvas: HTMLCanvasElement;
  private sessions = new Map<number, { el: HTMLElement; opts: RippleOptions }>();

  static get(): RippleHost {
    if (!RippleHost.instance) {
      RippleHost.instance = new RippleHost();
      // 首次真实交互前完成 WebGL 上下文/着色器预热（避免首次点击编译卡顿=延迟）
      RippleHost.instance.ensure();
    }
    return RippleHost.instance;
  }

  private constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'sysui_expressive_ripple';
    this.canvas.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483000;';
    document.body.append(this.canvas);
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointerdown', (e) => this.onDown(e), true); // capture：最早时机
    window.addEventListener('pointerup', (e) => this.onUp(e), true);
    window.addEventListener('pointercancel', (e) => this.onUp(e), true);
  }

  private ensure() {
    if (this.surface) return;
    try {
      this.surface = new ExpressiveRippleSurface(this.canvas);
    } catch {
      this.surface = null; // 无 WebGL：静默降级（无涟漪，不影响交互）
    }
  }

  private resize() {
    this.ensure();
    if (!this.surface) return;
    const dpr = window.devicePixelRatio || 1;
    this.surface.resize(Math.round(window.innerWidth * dpr), Math.round(window.innerHeight * dpr));
  }

  /** 声明式接线：元素加 data-ripple 即生效（可传 data-ripple-color rgba css） */
  static attach(el: HTMLElement, opts: RippleOptions = {}) {
    el.setAttribute('data-ripple', '');
    if (opts.color) el.setAttribute('data-ripple-color', opts.color);
    if (opts.radius) el.setAttribute('data-ripple-radius', opts.radius);
  }

  /** 端到端测试探针：会话状态（pointerdown 后 ≤1 帧内 sessions≥1 = 即时启动） */
  static debug(): { supported: boolean; sessions: number; down: number } {
    const h = RippleHost.instance;
    if (!h || !h.surface) return { supported: false, sessions: 0, down: 0 };
    return {
      supported: h.surface.mSupported,
      sessions: h.surface.mSessions.length,
      down: (h.surface as unknown as { mDownPointers: Map<number, unknown> }).mDownPointers.size,
    };
  }

  private parseColor(css: string): Float32Array {
    const m = /rgba?\(([^)]+)\)/.exec(css);
    if (m) {
      const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
      const [r, g, b] = parts;
      const a = parts.length > 3 ? parts[3] : 1;
      return new Float32Array([r / 255, g / 255, b / 255, a]);
    }
    // argb int（AOSP 色值）
    const n = parseInt(css, 10) || 0x1fffffff;
    return new Float32Array(colorToVec4(n >>> 0));
  }

  private onDown(e: PointerEvent) {
    this.ensure();
    const target = e.target as Element | null;
    const el = target?.closest?.('[data-ripple]') as HTMLElement | null;
    if (!el || !this.surface) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = window.devicePixelRatio || 1;
    const colorCss = el.getAttribute('data-ripple-color') || 'rgba(255,255,255,0.12)';
    const radiusAttr = el.getAttribute('data-ripple-radius');
    let maskRadius: number;
    if (radiusAttr === '50%') {
      maskRadius = Math.min(rect.width, rect.height) / 2;
    } else if (radiusAttr) {
      maskRadius = parseFloat(radiusAttr) || 0;
    } else {
      const br = parseFloat(getComputedStyle(el).borderRadius || '0');
      maskRadius = isNaN(br) ? 0 : br;
    }
    const geo = {
      maxRadius: (Math.hypot(rect.width / 2, rect.height / 2) * 2.3) * dpr,
      maskRect: [
        rect.left * dpr,
        rect.top * dpr,
        (rect.left + rect.width) * dpr,
        (rect.top + rect.height) * dpr,
      ] as [number, number, number, number],
      maskRadius: maskRadius * dpr,
      color: this.parseColor(colorCss),
    };
    this.sessions.set(e.pointerId, { el, opts: {} });
    this.surface.onTouchDown(
      e.pointerId,
      e.clientX,
      e.clientY,
      geo,
      { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    );
  }

  private onUp(e: PointerEvent) {
    if (!this.surface) return;
    if (this.sessions.has(e.pointerId)) {
      this.surface.onTouchUp(e.pointerId);
      this.sessions.delete(e.pointerId);
    }
  }
}
