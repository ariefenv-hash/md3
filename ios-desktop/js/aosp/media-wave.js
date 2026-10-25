// ==================== aosp/media-wave.js — remedia SeekBarTrack 波浪进度条 ====================
// 移植自 AOSP android-17.0.0_r1 SystemUI remedia 管线：
//   packages/SystemUI/src/com/android/systemui/media/remedia/ui/compose/Media.kt
//   SeekBarTrack / SeekBarThumb（波浪进度条 = 播放态的 "squiggly" 波形）
//
// 规格锚点（Media.kt 形参逐字）：
//   - waveLength=20dp、amplitude=3dp、waveSpeedDpPerSec=8dp → 一个波长 2500ms
//     （tween LinearEasing 无限左移；LaunchedEffect(isSquiggly) 每次播放重启 snapTo(0)）
//   - 路径：每半波长一段 relativeQuadraticTo（控制点 ±amp 峰谷交替，段端点在轨道中线）
//   - 振幅包络（以 thumb 为界）：posDiff = 段中心 − thumbX；
//     posDiff ≤ 0 → 全振幅；< waveLength → 线性衰减 1→0（过渡带恰 1 个波长）；else → 0
//   - 双色同路径：active 色（White）裁剪到 thumb 左侧（clipRect）；
//     thumb 右侧 = 平线 inactive 色（White@30%，StrokeCap.Round）
//   - 振幅动画：animateDpAsState(isSquiggly ? 3dp : 0)（spring NoBouncy/StiffnessMediumLow
//     → k400 ζ1.0）；暂停平复为直线，恢复重新起振
//   - thumb（SeekBarThumb）：4×16dp 胶囊 RoundedCornerShape(16dp)，White

const WAVE_LENGTH = 20;   // dp→px（1dp=1px 网格）
const AMPLITUDE = 3;
const WAVE_SPEED = 8;     // dp/s
const WAVE_PERIOD_MS = 1000 * (WAVE_LENGTH / WAVE_SPEED); // 2500ms
const STROKE = 2;
/** 画布高：振幅×2 + 描边 + 余量 */
const TRACK_H = AMPLITUDE * 2 + STROKE + 4; // 12
const MID_Y = TRACK_H / 2;
const STIFFNESS_MEDIUM_LOW = 400; // compose Spring.StiffnessMediumLow

/**
 * 在既有进度轨道容器内构建 remedia 波浪进度条（保留容器供点击 seek 兼容）。
 * v8.25 #46：可选颜色参数 —— 通知卡/QS 卡深底白浪（默认值，既有单参调用零回归）；
 * 音乐应用随主题传 on-surface 系色（同参数同观感：同一引擎同一几何，仅换色相）。
 * @param {HTMLElement} trackEl 进度轨道容器（position:relative 由调用方保证）
 * @param {{ activeColor?: string, inactiveColor?: string, thumbColor?: string }} [opts]
 *        颜色任选，缺省回退白色系（Media.kt active=White / inactive=White@30%）
 * @returns {{ setProgress:(p01:number)=>void, setPlaying:(on:boolean)=>void,
 *             setColors:(c:{activeColor?:string, inactiveColor?:string, thumbColor?:string})=>void,
 *             el:HTMLElement, destroy:()=>void }}
 */
export function createMediaWave(trackEl, opts = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  // v8.25 #46 颜色域（默认白色系 = Media.kt 规格原值；浅色主题侧由调用方 resolve 传入）
  const colors = {
    active: opts.activeColor || 'rgba(255,255,255,1)',
    inactive: opts.inactiveColor || 'rgba(255,255,255,0.3)',
    thumb: opts.thumbColor || 'rgba(255,255,255,1)',
  };
  const el = document.createElement('div');
  el.className = 'aosp-media-wave';
  el.style.cssText = 'position:absolute;left:0;right:0;top:50%;height:' + TRACK_H + 'px;' +
    'transform:translateY(-50%);pointer-events:none;';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', String(TRACK_H));
  // 域超出画布（振幅 ±3px 越过容器 4px 高度）→ overflow visible 保持有机形态
  svg.style.cssText = 'display:block;overflow:visible;width:100%;height:100%;';

  const inactiveLine = document.createElementNS(NS, 'line');
  inactiveLine.setAttribute('stroke', colors.inactive);
  inactiveLine.setAttribute('stroke-width', String(STROKE));
  inactiveLine.setAttribute('stroke-linecap', 'round');

  const clip = document.createElementNS(NS, 'clipPath');
  clip.id = 'aosp-wave-clip-' + Math.random().toString(36).slice(2, 8);
  const clipRect = document.createElementNS(NS, 'rect');
  clipRect.setAttribute('y', '0');
  clipRect.setAttribute('height', String(TRACK_H));
  clip.appendChild(clipRect);

  const defs = document.createElementNS(NS, 'defs');
  defs.appendChild(clip);
  const wavePath = document.createElementNS(NS, 'path');
  wavePath.setAttribute('fill', 'none');
  wavePath.setAttribute('stroke', colors.active);
  wavePath.setAttribute('stroke-width', String(STROKE));
  wavePath.setAttribute('stroke-linecap', 'round');
  wavePath.setAttribute('clip-path', `url(#${clip.id})`);

  svg.append(defs, inactiveLine, wavePath);

  const thumb = document.createElement('div');
  thumb.style.cssText = 'position:absolute;top:50%;width:4px;height:16px;border-radius:16px;' +
    'background:' + colors.thumb + ';transform:translateY(-50%);';
  el.append(svg, thumb);
  trackEl.appendChild(el);

  let progress = 0;
  let playing = false;
  let waveOffset = 0;
  let amp = 0;             // 当前振幅（spring 驱动）
  let ampTarget = 0;
  let rafId = 0;
  let lastT = 0;
  let lastPlayingEdge = false;
  // v8.16 #40 进度外推：setProgress 低频真值锚点 + rate（每秒进度增量）在 rAF 内
  // 连续外推 progressView——thumb/clip 60fps 连续推进，根治 timeupdate ~4Hz 离散
  // 跳变停顿感（AOSP compose 侧进度同为连续动画帧推进）。
  let progressView = 0;    // 视觉进度（外推），锚点 progress 本身不被污染
  let rate = 0;            // p01/s；播放中 = 1/duration，暂停/未知 = 0
  let anchorT = 0;         // progress 锚定时刻（ms，performance.now 域）

  function draw() {
    const width = trackEl.clientWidth;
    if (!width) return;
    const thumbPx = width * progressView;

    // 半波长 quadratic 段（Media.kt repeat(halfWaveCount + 3)，整体左移 waveOffset）
    const half = WAVE_LENGTH / 2;
    const totalW = width + WAVE_LENGTH;
    const segCount = Math.floor(totalW / half) + 3;
    let d = '';
    let cx = -waveOffset;
    for (let i = 0; i < segCount; i++) {
      const centerX = cx + half / 2;
      const posDiff = centerX - thumbPx;
      const ratio = posDiff <= 0 ? 1 : posDiff < WAVE_LENGTH ? 1 - posDiff / WAVE_LENGTH : 0;
      const a = amp * ratio;
      const dy = i % 2 === 0 ? -a : a;
      d += ` Q ${(cx + half / 2).toFixed(2)} ${(MID_Y + dy).toFixed(2)} ${(cx + half).toFixed(2)} ${MID_Y}`;
      cx += half;
    }
    wavePath.setAttribute('d', `M ${(-waveOffset).toFixed(2)} ${MID_Y}${d}`);
    // active 裁剪：世界坐标 0..thumbPx（clipRect(offset..thumb+offset) 等价）
    clipRect.setAttribute('x', '0');
    clipRect.setAttribute('width', thumbPx.toFixed(2));
    // thumb 右侧平线（isThumbEnabled：drawLine(thumbPx..width, inactiveTrackColor)）
    inactiveLine.setAttribute('x1', thumbPx.toFixed(2));
    inactiveLine.setAttribute('x2', String(width));
    inactiveLine.setAttribute('y1', String(MID_Y));
    inactiveLine.setAttribute('y2', String(MID_Y));
    thumb.style.left = `${(thumbPx - 2).toFixed(2)}px`;
  }

  function loop(t) {
    const dt = Math.min(100, t - lastT);
    lastT = t;
    if (playing) {
      // 播放态：波形左移 + 振幅 spring 收敛至 3
      waveOffset = (waveOffset + (dt / WAVE_PERIOD_MS) * WAVE_LENGTH) % WAVE_LENGTH;
    }
    // v8.16 #40：进度外推（与波形同一时间轴同一循环——thumb 随帧连续推进）。
    // 仅播放且有速率时外推；seek/暂停/切歌经 setProgress/setRate 重锚瞬时落位。
    if (playing && rate > 0) {
      progressView = Math.min(1, progress + ((t - anchorT) / 1000) * rate);
    } else {
      progressView = progress;
    }
    // 振幅 spring（NoBouncy ζ=1 k400：临界阻尼一阶收敛，Media.kt animateDpAsState 等价）
    const omega = Math.sqrt(STIFFNESS_MEDIUM_LOW);
    amp += (ampTarget - amp) * Math.min(1, omega * (dt / 1000));
    draw();
    if (playing || Math.abs(amp - ampTarget) > 0.01) {
      rafId = requestAnimationFrame(loop);
    } else {
      amp = ampTarget;
      draw();
      rafId = 0;
    }
  }

  function ensureLoop() {
    if (!rafId) {
      lastT = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  return {
    el,
    /** v8.25 #46 主题切换时刷新三色（通知卡/QS 卡不调用，音乐应用随宿主主题联动） */
    setColors(c = {}) {
      if (c.activeColor) wavePath.setAttribute('stroke', c.activeColor);
      if (c.inactiveColor) inactiveLine.setAttribute('stroke', c.inactiveColor);
      if (c.thumbColor) thumb.style.background = c.thumbColor;
    },
    /** @param {number} p01 0..1（真值锚点：低频 notify/seek 时瞬时落位并重锚外推起点） */
    setProgress(p01) {
      progress = Math.min(1, Math.max(0, p01 || 0));
      progressView = progress;
      anchorT = performance.now();
      draw();
    },
    /** v8.16 #40 @param {number} p01PerSec 播放中每秒进度增量（1/duration）；0=暂停/未知不外推 */
    setRate(p01PerSec) {
      const r = Number(p01PerSec);
      rate = Number.isFinite(r) && r > 0 ? r : 0;
      anchorT = performance.now();
      progressView = progress;
      if (rate > 0 && playing) ensureLoop();
      else draw();
    },
    /** @param {boolean} on 播放态：起振（重启相位）/暂停平复（Media.kt LaunchedEffect(isSquiggly)） */
    setPlaying(on) {
      if (on && !lastPlayingEdge) waveOffset = 0; // snapTo(0f)：每次播放重启
      lastPlayingEdge = on;
      playing = on;
      ampTarget = on ? AMPLITUDE : 0;
      ensureLoop();
    },
    destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      el.remove();
    },
  };
}
