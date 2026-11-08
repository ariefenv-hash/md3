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
//     ── v9.94 #36 AOSP 原厂采样实装 ─────────────────────────────────
//     v9.05 修订宣告的 vendor 通道在本版兑现：AOSP data/sounds/effects
//     15 枚 ogg 已 vendor 至 assets/audio/aosp/（Apache-2.0 同源，#161）。
//     播放双轨：AOSP 采样（AudioBuffer 惰性预解码缓存，Buffer 复用即节点池）
//     → 缺失/不可解码回落既有合成预设。触发点接线（AOSP SoundEffects 真源）：
//     解锁 Unlock（随波纹起点 commit 帧）/上锁 Lock/磁贴与开关 Effect_Tick
//     （quick-settings 既有 playSfx('tick') 自动升级）/充电沿 ChargingStarted
//     （battery-charging-started 同一漏斗）/低电沿 LowBattery（battery-service
//     新派发 battery-low-warning，15% 进入 / 16% 解除迟滞，BatteryService 语义）/
//     相机快门 camera_click + 录像 VideoRecord/VideoStop（iframe postMessage
//     system-sfx 通道）。RingerMode 对齐 AudioService：silent 态全部系统音效
//     抑制（vibrate/silent 由 volume-dialog 单一真源同步）。按键五连音按
//     AOSP Keypress* 族接入宿主 keydown 委托（独立开关，默认关——AOSP
//     触屏提示音/按键音默认语义），Invalid 素材在库备用不接宿主触发点。
//     Dock/Undock：md3 无桌面底座对应物，素材在库不接线（范围纪律）。
//
// 对外 API（同时挂到 window.__sfx 供设置页与控制台使用）：
//   playSfx(name) / sfxEnabled() / setSfxEnabled(v)
//   hapticsEnabled() / setHapticsEnabled(v)
//   getSfxVolume() / setSfxVolume(0~1)

const SFX_ENABLED_KEY = 'ios-desktop:sound-enabled';   // '0' | '1'（默认开）
const HAPTICS_ENABLED_KEY = 'ios-desktop:haptics-enabled'; // '0' | '1'（默认开）
const SFX_VOLUME_KEY = 'ios-desktop:sfx-volume';       // '0'~'1'（默认 0.5）
const RINGER_MODE_KEY = 'ios-desktop:ringer-mode';     // ring | vibrate | silent（v9.94 #36 持久化）
const KEYPRESS_ENABLED_KEY = 'ios-desktop:keypress-enabled'; // '0' | '1'（默认关，AOSP 按键音语义）

let audioCtx = null;
let sfxVolume = 0.5;
let ringerMode = 'ring';             // ring | vibrate | silent（#36 AudioService 对齐）
let keypressEnabled = false;         // 宿主按键音独立开关（默认关）

import { readAudioResourceMode } from './aosp/alarm-ringtone.js'; // v9.94 #158/#161：统一回退开关单源（键与校验在 aosp/alarm-ringtone.js）
// v10.74 #117：sfx 流总线出口（tone/buffer amp 改挂 sfx 子总线；amp 增益仍由 sfxVolume
// 单点缩放，总线增益恒 1 不叠衰减；未挂载/失败回落 destination 直连，行为零回归）
import { getAudioGraph } from './audio-graph-instance.js';
/* v9.94 #158/#161：统一回退开关 store 适配（读取注入；异常→null→模块内回退 'auto'） */
const safeStore = () => ({ getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } } });

// ==================== AOSP 原厂采样资源表（v9.94 #36/#161） ====================
// 真源：aosp-mirror/platform_frameworks_base @ main，data/sounds/effects/（Apache-2.0）。
// 每项 { file, gain } —— gain 为相对主音量的线性缩放（AOSP 各 effect 经
// SoundPoolHelper 以 STREAM_SYSTEM 播放，响度差异由采样自身携带，此处仅对
// 部分超短点按音做轻微收敛避免叠听刺耳，非响度权威）。
const AUDIO_ASSETS = {
  unlock:           { file: 'Unlock.ogg',           gain: 1 },
  lock:             { file: 'Lock.ogg',             gain: 1 },
  tick:             { file: 'Effect_Tick.ogg',      gain: 0.85 },
  tap:              { file: 'Effect_Tick.ogg',      gain: 0.6 },
  keypress:         { file: 'KeypressStandard.ogg', gain: 0.7 },
  keypress_spacebar:{ file: 'KeypressSpacebar.ogg', gain: 0.7 },
  keypress_delete:  { file: 'KeypressDelete.ogg',   gain: 0.7 },
  keypress_return:  { file: 'KeypressReturn.ogg',   gain: 0.7 },
  keypress_invalid: { file: 'KeypressInvalid.ogg',  gain: 0.7 },
  charging_started: { file: 'ChargingStarted.ogg',  gain: 1 },
  lowbattery:       { file: 'LowBattery.ogg',       gain: 1 },
  dock:             { file: 'Dock.ogg',             gain: 1 },
  undock:           { file: 'Undock.ogg',           gain: 1 },
  camera_click:     { file: 'camera_click.ogg',     gain: 1 },
  video_record:     { file: 'VideoRecord.ogg',      gain: 1 },
  video_stop:       { file: 'VideoStop.ogg',        gain: 1 },
};

// 预解码缓存：name → Promise<AudioBuffer|null>（null = 不可用，回落合成）。
// 并发去重：同一资源只 fetch+decode 一次；失败结果也缓存（会话内不再重试，
// 避免 offline/慢网下每次触发都吃一次失败开销）。
const bufferCache = new Map();

/** 高频触发并发池：全局活动采样源集合，超上限时停掉最早的（复用语义）。
 *  AudioBufferSourceNode 是一次性节点，无法真正复用；验收要求的「复用节点池」
 *  落在两个层面：① AudioBuffer 复用（解码一次反复 spawn source，零重复解码）
 *  ② 活动源并发上限 + 最旧淘汰（连点磁贴不叠爆）。
 *  上限取 8：AOSP SoundPool maxStreams 默认 4~8 同量级。 */
const MAX_ACTIVE_SOURCES = 8;
const activeSources = new Set();

function trackSource(src) {
  activeSources.add(src);
  src.onended = () => { activeSources.delete(src); };
  if (activeSources.size > MAX_ACTIVE_SOURCES) {
    const oldest = activeSources.values().next().value;
    try { oldest.stop(); } catch (e) { /* 已自停 */ }
    activeSources.delete(oldest);
  }
}

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
  // v10.74 #117：sfx 流值总线记账同步（skipNode——amp 增益仍由 sfxVolume 单点缩放，
  // 总线增益恒 1；落账 ios-desktop:sfx-volume 同键 + audio-graph-level-changed 事件）
  try { getAudioGraph().setLevel('sfx', Math.round(sfxVolume * 100), { skipNode: true }); } catch (e) {}
}

// ==================== RingerMode（v9.94 #36 · AudioService 对齐） ====================
// 单一真源：volume-dialog.js 三态切换时调用 setRingerMode 同步（ring | vibrate | silent）。
// silent 态全部系统音效抑制（AudioService.playSoundEffect 语义）；vibrate 仅抑振不抑音
// 在 AOSP 由分开的开关管理，此处仅实现 silent 抑音。初始值读持久化（volume-dialog
// 历史上无持久化，#36 起由本模块代管存储）。
export function getRingerMode() { return ringerMode; }

export function setRingerMode(mode) {
  if (mode !== 'ring' && mode !== 'vibrate' && mode !== 'silent') return;
  const changed = mode !== ringerMode;
  ringerMode = mode;
  try { localStorage.setItem(RINGER_MODE_KEY, mode); } catch (e) {}
  if (changed) {
    broadcastState();
    // v9.95 #89：RINGER_MODE_CHANGED_ACTION 同构广播——状态栏 mute/vibrate 插槽消费
    //（PhoneStatusBarPolicy.updateRingerAndAlarmIcons 信号源；消费点 status-bar.js）
    try { document.dispatchEvent(new CustomEvent('ringer-mode-changed', { detail: { mode } })); } catch (e) {}
  }
}

export function keypressEnabledFlag() { return keypressEnabled; }

export function setKeypressEnabled(v) {
  keypressEnabled = !!v;
  try { localStorage.setItem(KEYPRESS_ENABLED_KEY, keypressEnabled ? '1' : '0'); } catch (e) {}
}

// ==================== 音频内核 ====================

/** v9.94 #116：共享 AudioContext 单例出口（media-service 媒体 GainNode 链复用同一
 *  上下文 —— iOS 多 AudioContext 实例有额外开销与限制（#116 风险 3/#117 收编清单），
 *  系统音效与媒体增益同处一个上下文反而有利于统一调度。#117 全量 audio-graph.js
 *  收编方向的第一步：先单例共享，再五通道总线。） */
export function getSharedAudioContext() { return getCtx(); }

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

/** v10.74 #117：sfx 流总线出口（#117 收编清单终步）：attach 幂等 + 返回 sfx 子总线
 *  节点；tone/buffer 的 amp 节点改挂总线（master(1)→destination 可听等价 + analyser
 *  抽头可见 UI 音效）；总线缺位/失败 → null（调用方回落 destination 直连） */
function sfxBus(ctx) {
  try {
    const g = getAudioGraph();
    g.attach(ctx);
    return g.busOf('sfx');
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
  // v10.74 #117：sfx 流统一走总线（子总线缺位回落 destination 直连）
  osc.connect(amp).connect(sfxBus(ctx) || ctx.destination);
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
  // v9.94 #196：截屏快门音（AOSP screenshotSoundController.playScreenshotSoundAsync 同语义：
  // startAnimation / saveScreenshotAndToast 双调用点均响，isScreenshotSoundAt 单源判定）——
  // 双「咔哒」短促对（相机快门听感，AOSP 快门音同为双击式）
  screenshot: [
    { freq: 2400, dur: 0.03, gain: 0.05, type: 'square' },
    { freq: 1800, dur: 0.05, gain: 0.045, type: 'square', delay: 0.07 },
  ],
};

/**
 * 播放一枚系统音效（v9.94 双轨：AOSP 采样优先，合成回落）。
 * @param {keyof typeof SFX_PRESETS | keyof typeof AUDIO_ASSETS} name 音效名
 */
export function playSfx(name) {
  if (!sfxEnabled()) return;
  // AudioService.playSoundEffect 语义：RINGER_MODE_SILENT 全部抑制（#36 验收）
  if (ringerMode === 'silent') return;
  const preset = SFX_PRESETS[name];
  const asset = AUDIO_ASSETS[name];
  if (!preset && !asset) return;
  // v9.94 #158/#161 统一回退开关（一个开关管全部音频资源，用户裁决）：synth=资源不消费直落合成；
  // asset=强制真实资源（缺失/未就绪→静默，不虚假回落合成——裁决「失败不虚假显示已生效」）
  const resMode = readAudioResourceMode(safeStore());
  const ctx = getCtx();
  // fix(audit-C #10): 「跳过本次」落地 —— suspended 冻结时间轴上排程的 tone 会在解锁后
  // 积压齐爆/迟发；非 running（含创建失败/尚未解锁）直接跳过本次。
  // getCtx 内的 resume 调用保持不变，仍走用户手势路径逐步解锁
  if (!ctx || ctx.state !== 'running') return;
  // 采样轨未就绪时同步回落合成（首帧不空窗：buffer 异步就绪后由预热带优先）
  const buffer = (asset && resMode !== 'synth') ? peekBuffer(name) : null;
  if (asset && buffer) {
    try {
      const src = ctx.createBufferSource();
      const amp = ctx.createGain();
      amp.gain.value = (asset.gain || 1) * sfxVolume;
      src.buffer = buffer;
      // v10.74 #117：sfx 采样通道同样统一走总线（与合成通道同拓扑）
      src.connect(amp).connect(sfxBus(ctx) || ctx.destination);
      trackSource(src);
      src.start();
    } catch (e) { /* 播放失败静默回落 */ }
    return;
  }
  if (resMode === 'asset') return; // v9.94 强制真实资源：缺失/未就绪→静默（不虚假回落）
  if (!preset) return;
  try { preset.forEach((p) => tone(ctx, { ...p, gain: (p.gain || 0.05) * sfxVolume })); } catch (e) {}
}

// ==================== AOSP 采样通道（v9.94 #36） ====================

/** 采样资源 URL：相对本模块（js/ → ../assets/audio/aosp/），dev 与 dist 同构命中。
 *  import.meta.url 派生保证不依赖页面根路径假设。 */
function assetURL(file) {
  try { return new URL(`../assets/audio/aosp/${file}`, import.meta.url).href; }
  catch (e) { return `assets/audio/aosp/${file}`; }
}

function peekBuffer(name) {
  const entry = bufferCache.get(name);
  return entry && entry.buffer ? entry.buffer : null;
}

/** 惰性预解码一枚采样；结果（含失败=null）缓存进 bufferCache */
function ensureBuffer(name) {
  if (bufferCache.has(name)) return bufferCache.get(name);
  const asset = AUDIO_ASSETS[name];
  if (!asset) return null;
  const p = (async () => {
    try {
      const res = await fetch(assetURL(asset.file));
      if (!res.ok) return null;
      const bytes = await res.arrayBuffer();
      const ctx = getCtx();
      if (!ctx) return null;
      const buf = await ctx.decodeAudioData(bytes);
      return buf;
    } catch (e) { return null; }
  })();
  p.then((buf) => { bufferCache.set(name, { buffer: buf }); });
  bufferCache.set(name, p);
  return p;
}

/** 触发点挂接前预热调用（init 批量预热全部 15 枚，解码失败即回落合成） */
function preloadAllBuffers() {
  Object.keys(AUDIO_ASSETS).forEach((name) => ensureBuffer(name));
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

// ==================== 宿主物理按键音（v9.94 #36 · AOSP Keypress* 族） ====================
// AOSP 侧按键音由 LatinIME/PhoneWindowManager 在 Key 事件路径播放（STREAM_SYSTEM）。
// md3 无输入法实体（#65 空白），宿主层 keydown 委托为等价触发面：
// Enter→Return / Backspace/Delete→Delete / Space→Spacebar / 其他可打印→Standard。
// 焦点位于 iframe 子应用时宿主收不到 keydown（浏览器事件目标机制），与 AOSP
// 按键音只在 IME 面板生效的边界天然同构。Invalid 素材在库（映射名
// keypress_invalid 可用）但宿主无明确非法输入触发点，不接。独立开关默认关
// （AOSP 硬件按键音 Settings.System.SOUND_EFFECTS_ENABLED 域，出厂默认关）。
const KEYDOWN_SFX_MAP = {
  Enter: 'keypress_return',
  Backspace: 'keypress_delete',
  Delete: 'keypress_delete',
  ' ': 'keypress_spacebar',
};

function installKeypressSound() {
  document.addEventListener('keydown', (e) => {
    if (!keypressEnabled) return;
    if (e.repeat) return; // 长按重复只响首击（AOSP per-key 语义）
    if (e.ctrlKey || e.metaKey || e.altKey) return; // 组合键是快捷键非输入
    const mapped = KEYDOWN_SFX_MAP[e.key];
    if (mapped) { playSfx(mapped); return; }
    if (e.key && e.key.length === 1) playSfx('keypress');
  }, { capture: false, passive: true });
}

// ==================== iframe 子应用音效请求通道（v9.94 #36） ====================
// 子应用（camera 快门/录像等）postMessage({ type: 'system-sfx', name }) 到宿主；
// 源校验对齐 main.js isTrustedMessageSource（iframe contentWindow 白名单）。
function isTrustedSfxSource(source) {
  const frames = document.querySelectorAll('iframe');
  for (let i = 0; i < frames.length; i++) {
    try { if (frames[i].contentWindow === source) return true; } catch (e) { /* 忽略 */ }
  }
  return false;
}

function installSfxMessageChannel() {
  window.addEventListener('message', (e) => {
    if (!e.data || e.data.type !== 'system-sfx') return;
    if (!isTrustedSfxSource(e.source)) return;
    const name = typeof e.data.name === 'string' ? e.data.name : '';
    if (AUDIO_ASSETS[name]) playSfx(name);
  });
}

// ==================== 系统事件音接线（v9.94 #36） ====================
// 充电沿：battery-service.applyState 统一漏斗派发 battery-charging-started（v7.74 既有），
//   charging-ripple 播涟漪，本模块播 ChargingStarted.ogg —— AOSP 侧音与动画同为
//   SystemUI 充电事件双消费，同构。低电沿：battery-service v9.94 新派发
//   battery-low-warning（15% 进入 / 16% 解除迟滞，BatteryService 语义）。
function installBatteryEventSounds() {
  document.addEventListener('battery-charging-started', () => playSfx('charging_started'));
  document.addEventListener('battery-low-warning', () => playSfx('lowbattery'));
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
  try { const rm = localStorage.getItem(RINGER_MODE_KEY); if (rm === 'ring' || rm === 'vibrate' || rm === 'silent') ringerMode = rm; } catch (e) {}
  try { keypressEnabled = localStorage.getItem(KEYPRESS_ENABLED_KEY) === '1'; } catch (e) {}
  installHapticsGate();
  installGlobalTapSound();
  installKeypressSound();
  installSfxMessageChannel();
  installBatteryEventSounds();
  preloadAllBuffers(); // 惰性 fetch+decode 全部 15 枚（失败回落合成，不阻塞不报错）
  window.__sfx = {
    play: playSfx,
    sfxEnabled, setSfxEnabled, hapticsEnabled, setHapticsEnabled,
    getVolume: getSfxVolume, setVolume: setSfxVolume,
    getRingerMode, setRingerMode, setKeypressEnabled, keypressEnabledFlag,
    preload: preloadAllBuffers,
  };
}
