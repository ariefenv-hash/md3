// ==================== sound-haptics.js — 系统音效与触感反馈引擎 ====================
//
// 批次二「真设置」基座：设置 › 声音与震动 页的真实开关由本模块落地。
//
// 设计要点：
//  1. 音效双轨：优先播放 vendor 的真实音效资源（AOSP 原厂采样，见 #161），
//     资源缺失/不可解码时回落 WebAudio 实时合成（正弦/三角波 + 包络）。
//     ── v9.05 约束修订 ──────────────────────────────────────────────
//     【旧约束】"零音频资源文件，与项目零构建、零外部资源的架构约束一致"。
//     【修订理由】实测证明纯合成无法还原真实音效：闹钟铃声（#158）、系统点按音
//     Effect_Tick、相机快门、按键音等，AOSP 侧均为真实音频采样，合成音在听感上
//     与真机存在系统性差距，且 iOS Safari 对部分音频语义另有约束（#116）。
//     1:1 移植的目标优先于"零资源文件"这一实现手段。
//     【新约束】资源必须**本地 vendor**（ios-desktop/assets/audio/），
//     经构建期复制进 dist 并纳入 SW 预缓存 —— 即保持"零运行时网络请求、
//     零 CDN 依赖、纯静态离线可用"。约束从"零文件"收紧为"零外链 + 全离线"，
//     这一条不变，且与 PWA 定位一致。
//     【兜底纪律】合成音不得删除，始终作为资源不可用时的回落路径。
//  2. AudioContext 惰性创建 —— 浏览器自动播放策略要求必须在用户手势上下文里
//     才能出声，所有 playSfx 调用点（点击磁贴/开关应用/通知横幅）天然位于
//     手势或手势衍生链路中，首帧静默不会报错；
//  3. 触感单点控制：包装 navigator.vibrate 为感知开关的版本 —— 系统里已有
//     十余处直接调用 navigator.vibrate 的历史代码，无需逐一改造即可全部
//     受「触感振动反馈」开关统一管辖；
//  4. 状态变化广播给全部 iframe 子应用（system-sound-state），供子应用自行
//     遵循（如应用内按键音）。
//
// 对外 API（同时挂到 window.__sfx 供设置页与控制台使用）：
//   playSfx(name) / sfxEnabled() / setSfxEnabled(v)
//   hapticsEnabled() / setHapticsEnabled(v)
//   getSfxVolume() / setSfxVolume(0~1)

const SFX_ENABLED_KEY = 'ios-desktop:sound-enabled';   // '0' | '1'（默认开）
const HAPTICS_ENABLED_KEY = 'ios-desktop:haptics-enabled'; // '0' | '1'（默认开）
const SFX_VOLUME_KEY = 'ios-desktop:sfx-volume';       // '0'~'1'（默认 0.5）

let audioCtx = null;
let sfxVolume = 0.5;

// ==================== 开关读写 ====================

function readFlag(key) {
  try { return localStorage.getItem(key) !== '0'; } catch (e) { return true; }
}

export function sfxEnabled() { return readFlag(SFX_ENABLED_KEY); }
export function hapticsEnabled() { return readFlag(HAPTICS_ENABLED_KEY); }

export function setSfxEnabled(v) {
  try { localStorage.setItem(SFX_ENABLED_KEY, v ? '1' : '0'); } catch (e) {}
  broadcastState();
}

export function setHapticsEnabled(v) {
  try { localStorage.setItem(HAPTICS_ENABLED_KEY, v ? '1' : '0'); } catch (e) {}
  broadcastState();
}

export function getSfxVolume() { return sfxVolume; }

export function setSfxVolume(v) {
  sfxVolume = Math.max(0, Math.min(1, Number(v) || 0));
  try { localStorage.setItem(SFX_VOLUME_KEY, String(sfxVolume)); } catch (e) {}
}

// ==================== 音频内核 ====================

/** 惰性获取 AudioContext；被自动播放策略挂起时尝试恢复（多在手势上下文中调用，可成功） */
function getCtx() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch (e) { return null; }
}

/** 单音振荡器：freq 起→end 止（Hz），dur 秒，gain 峰值，type 波形 */
function tone(ctx, { freq = 880, end = null, dur = 0.08, gain = 0.05, type = 'sine', delay = 0 }) {
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (end && end !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(40, end), t0 + dur);
  // 快 attack / 指数 release 包络：听起来像"哒"而不是电流嗡鸣
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** 预设音效表：每个音效由一或多个 tone 叠加构成（音量已按全局音量缩放） */
const SFX_PRESETS = {
  // 通用点按：极短高频 blip
  tap:      [{ freq: 1750, dur: 0.045, gain: 0.05, type: 'sine' }],
  // 磁贴/开关：比 tap 更轻
  tick:     [{ freq: 2100, dur: 0.035, gain: 0.04, type: 'triangle' }],
  // 应用打开：上行滑音（弹簧展开的"起飞感"）
  app_open: [
    { freq: 520, end: 980, dur: 0.16, gain: 0.055, type: 'sine' },
    { freq: 1040, end: 1560, dur: 0.1, gain: 0.02, type: 'sine', delay: 0.05 },
  ],
  // 应用关闭：下行滑音（收拢回图标）
  app_close: [
    { freq: 880, end: 440, dur: 0.15, gain: 0.05, type: 'sine' },
  ],
  // 通知横幅：双音下行（Pixel 通知的经典两连音）
  notify: [
    { freq: 1318, dur: 0.09, gain: 0.06, type: 'sine' },
    { freq: 1046, dur: 0.14, gain: 0.06, type: 'sine', delay: 0.1 },
  ],
  // 锁定：短促低频"扣上"
  lock:  [{ freq: 320, end: 220, dur: 0.09, gain: 0.06, type: 'triangle' }],
  // 解锁：上行双击
  unlock: [
    { freq: 620, dur: 0.05, gain: 0.045, type: 'triangle' },
    { freq: 930, dur: 0.07, gain: 0.045, type: 'triangle', delay: 0.07 },
  ],
  // 模式切换：三连上行琶音
  profile: [
    { freq: 660, dur: 0.07, gain: 0.05 },
    { freq: 880, dur: 0.07, gain: 0.05, delay: 0.08 },
    { freq: 1174, dur: 0.12, gain: 0.05, delay: 0.16 },
  ],
  // v9.71 #196：截屏快门音（AOSP screenshotSoundController.playScreenshotSoundAsync 同语义：
  // startAnimation / saveScreenshotAndToast 双调用点均响，isScreenshotSoundAt 单源判定）——
  // 双「咔哒」短促对（相机快门听感，AOSP 快门音同为双击式）
  screenshot: [
    { freq: 2400, dur: 0.03, gain: 0.05, type: 'square' },
    { freq: 1800, dur: 0.05, gain: 0.045, type: 'square', delay: 0.07 },
  ],
};

/**
 * 播放一枚系统音效。
 * @param {keyof typeof SFX_PRESETS} name 音效名
 */
export function playSfx(name) {
  if (!sfxEnabled()) return;
  const preset = SFX_PRESETS[name];
  if (!preset) return;
  const ctx = getCtx();
  // fix(audit-C #10): 「跳过本次」落地 —— suspended 冻结时间轴上排程的 tone 会在解锁后
  // 积压齐爆/迟发；非 running（含创建失败/尚未解锁）直接跳过本次。
  // getCtx 内的 resume 调用保持不变，仍走用户手势路径逐步解锁
  if (!ctx || ctx.state !== 'running') return;
  try { preset.forEach((p) => tone(ctx, { ...p, gain: (p.gain || 0.05) * sfxVolume })); } catch (e) {}
}

// ==================== 触感单点控制 ====================

/**
 * 用感知开关的包装函数遮蔽 navigator.vibrate：
 * 系统既有代码（磁贴/通知/长按菜单等十余处）无需任何改动即统一受控。
 * Navigator.prototype 上的原始方法被闭包持有，关闭时只拦不放行。
 */
function installHapticsGate() {
  try {
    const original = typeof navigator.vibrate === 'function' ? navigator.vibrate.bind(navigator) : null;
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern) => {
        if (!hapticsEnabled()) return false;
        if (original) return original(pattern);
        return false;
      },
    });
  } catch (e) { /* 个别环境只读，保持原状即可 */ }
}

// ==================== 状态广播 ====================

/** 把开关状态广播给全部 iframe 子应用（子应用可监听 system-sound-state 自行遵循） */
function broadcastState() {
  const payload = { type: 'system-sound-state', sfx: sfxEnabled(), haptics: hapticsEnabled() };
  document.querySelectorAll('iframe').forEach((iframe) => {
    try { iframe.contentWindow.postMessage(payload, '*'); } catch (e) {}
  });
}

// ==================== 全局按键音（委托监听，零侵入） ====================

/** 需要自动播放点按音的交互元素选择器（不含 .app-icon —— 应用开合有专属音效）
 *  fix(P3)：移除 .qs-tile-pill —— 快速设置磁贴的 click 处理器已各自播放专属音效
 *  （tick/profile 等），此处的通用 tap 与之在同一动作上叠加成「一击双声」 */
const TAP_SELECTORS = [
  '.md3-list-item', '.md3-btn', 'button',
  '.menu-item', '.nav-btn', '.dot', '.md3-slider', '.glance-chip',
];

function isTapTarget(el) {
  return !!(el && el.closest && TAP_SELECTORS.some((sel) => { try { return el.closest(sel); } catch (e) { return false; } }));
}

function installGlobalTapSound() {
  document.addEventListener('pointerdown', (e) => {
    if (isTapTarget(e.target)) playSfx('tap');
  }, { capture: true, passive: true });
}

// ==================== 初始化 ====================

export function initSoundHaptics() {
  try { sfxVolume = Math.max(0, Math.min(1, parseFloat(localStorage.getItem(SFX_VOLUME_KEY) || '0.5') || 0.5)); } catch (e) {}
  installHapticsGate();
  installGlobalTapSound();
  window.__sfx = {
    play: playSfx,
    sfxEnabled, setSfxEnabled, hapticsEnabled, setHapticsEnabled,
    getVolume: getSfxVolume, setVolume: setSfxVolume,
  };
}
