/**
 * aosp-expressive-ripple.d.ts — JS 模块的类型声明（TS 消费用）。
 * 实现见同名 .js（AOSP RippleShader/RippleAnimationSession 移植）。
 */
export interface RippleSessionGeo {
  maxRadius: number;
  maskRect: [number, number, number, number];
  maskRadius: number;
  color: Float32Array;
  sparkleColor?: Float32Array;
}

export declare class RippleAnimationSession {
  constructor(
    originX: number,
    originY: number,
    touchX: number,
    touchY: number,
    startTime: number,
    geo?: RippleSessionGeo | null,
  );
  progress: number;
  exiting: boolean;
  finished: boolean;
  requestExit(now: number): void;
  update(now: number): void;
}

export declare class ExpressiveRippleSurface {
  constructor(canvas: HTMLCanvasElement, opts?: { color?: number; sparkleColor?: number });
  mSupported: boolean;
  mSessions: RippleAnimationSession[];
  onTouchDown(
    pointerId: number,
    x: number,
    y: number,
    geo?: RippleSessionGeo | null,
    origin?: { x: number; y: number } | null,
  ): void;
  onTouchUp(pointerId: number): void;
  onTouchMove(pointerId: number, x: number, y: number): void;
  resize(widthDev: number, heightDev: number): void;
}

export declare function colorToVec4(argb: number): [number, number, number, number];
