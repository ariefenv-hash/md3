// ==================== bg-freeze.js — 后台运行策略中心（智能冻结 / 全部实时） ====================
//
// 两种后台模式（设置 › 后台与多任务 可切换，默认「智能冻结」）：
//   1. 智能冻结 freeze（默认）：只有「前台应用 / 刚被推到后台的应用 / 分屏对」保持运行，
//      其余后台任务整体冻结 —— 心跳定时器清空、CSS 动画暂停、rAF 断流；
//      正在播放媒体（音频/视频/录音）的应用自动豁免；从未打开过的后台卡片不再引导启动。
//   2. 全部实时 live（经典方案）：所有后台实例照常运行，预览实时，重绘开销更高。
//
// 冻结实现分层：
//   - iframe 子应用：apps/freeze-shim.js（随应用 HTML 注入，先于应用脚本执行）
//     追踪 setTimeout/setInterval/rAF，收到 APP_FREEZE 全部清空 + CSS 冻结；
//     APP_RESUME 重建周期定时器。媒体播放/录音状态经 APP_MEDIA_STATE 上报豁免。
//   - 原生 JS 应用：page-stack.js 激活页面脚本期间拦截 setInterval/setTimeout/rAF
//     登记「初始心跳」，冻结时清空、恢复时重建；同时派发 app-freeze / app-resume DOM 事件。

const MODE_KEY = 'ios-desktop:bg-mode';

/** @type {'freeze'|'live'} */
let mode = 'freeze';
try {
  const saved = localStorage.getItem(MODE_KEY);
  if (saved === 'live' || saved === 'freeze') mode = saved;
} catch (e) { /* 隐私模式等场景静默降级 */ }

// ---------- 运行态 ----------
const liveAppIds = new Set();       // 允许保持运行的应用（前台 / 刚退到后台 / 分屏对）
const mediaActiveApps = new Set();  // 正在播放媒体或录音的应用（冻结豁免，shim 上报）
const nativeReg = new Map();        // appId -> { timeouts:Map, intervals:Map, frozen:boolean }
const nativeTimerOwner = new Map(); // timerId -> { reg, kind } （全局 clear 精准注销用）

// ---------- 原生应用心跳登记 ----------

/** 取得（或创建）某原生应用的心跳登记表（page-stack 激活脚本时调用） */
export function registerNativeApp(appId) {
  let reg = nativeReg.get(appId);
  if (!reg) {
    reg = { timeouts: null, intervals: null, frozen: false };
    // fix(audit-D/E): 登记 Map 改为「受跟踪」版本 —— set() 写入时同步登记进
    // nativeTimerOwner，使 page-stack 激活窗口期的初次登记（reg.timeouts.set 直写）
    // 也纳入全局 clear 跟踪：应用自己 clear 掉的定时器不再于冻结恢复后复活。
    // timeout 登记同时记到期时间戳（rehydrate 按剩余时长重建的依据）。
    reg.timeouts = new TrackedTimerMap(reg, 'to');
    reg.intervals = new TrackedTimerMap(reg, 'iv');
    nativeReg.set(appId, reg);
  }
  return reg;
}

/**
 * fix(audit-D/E): 定时器登记 Map（Map 子类，仅拦截 set）。
 * - set(id, rec)：同步 trackNativeTimer（全局 clear 跟踪）；
 * - timeout 首次登记时补记绝对到期时间戳 rec.expires（rehydrate 复用同一 rec
 *   对象时保留最初期限 → 多轮冻结仍朝同一到期点收敛，不重置倒计时）。
 * 其余 Map 行为（get/delete/clear/forEach/entries）原样继承。
 */
class TrackedTimerMap extends Map {
  constructor(reg, kind) {
    super();
    this._reg = reg;
    this._kind = kind;
  }
  set(id, rec) {
    super.set(id, rec);
    try {
      trackNativeTimer(this._reg, this._kind, id);
      if (this._kind === 'to' && rec && typeof rec === 'object' && typeof rec.expires !== 'number') {
        const d = Number(rec.d);
        rec.expires = Date.now() + (d > 0 ? d : 0);
      }
    } catch (e) { /* 登记异常不影响定时器本体 */ }
    return this;
  }
}

/** 登记「谁拥有这个定时器」，使应用自己调用 clearInterval/clearTimeout 时登记表同步失效 */
function trackNativeTimer(reg, kind, id) {
  nativeTimerOwner.set(id, { reg, kind });
}

// fix(audit-D/E): 模块加载时缓存原生 clearTimeout/clearInterval —— freezeApp 清冻结
// 实例的定时器必须走原生引用。此前 freezeApp 内取 window.clearTimeout.bind(window)
// 拿到的是 installNativeClearTracking 安装的 patched 版本：rehydrate 重建的新 id 已被
// track，patched clear 会连登记表条目一起删 → 第二次冻结时登记表已被清空 → 第二次
// 恢复无表可建 → 心跳永久停摆。本模块加载必然早于首次 activatePageScripts 安装补丁，
// 故此刻引用必为原生（Node 沙箱下回落 globalThis 同名实现）。
function resolveRawClear(name) {
  try {
    const g = typeof window !== 'undefined' ? window : globalThis;
    const fn = g ? g[name] : null;
    return typeof fn === 'function' ? fn.bind(g) : null;
  } catch (e) { return null; }
}
const rawClearTimeout = resolveRawClear('clearTimeout');
const rawClearInterval = resolveRawClear('clearInterval');

let globalClearPatched = false;

/** 全局安装 clear 跟踪（仅一次）：应用主动 clear 掉的定时器不再被冻结/恢复复活 */
export function installNativeClearTracking() {
  if (globalClearPatched) return;
  globalClearPatched = true;
  const _clearTimeout = window.clearTimeout.bind(window);
  const _clearInterval = window.clearInterval.bind(window);
  window.clearTimeout = function (id) {
    const owner = nativeTimerOwner.get(id);
    if (owner) { owner.reg.timeouts.delete(id); nativeTimerOwner.delete(id); }
    return _clearTimeout(id);
  };
  window.clearInterval = function (id) {
    const owner = nativeTimerOwner.get(id);
    if (owner) { owner.reg.intervals.delete(id); nativeTimerOwner.delete(id); }
    return _clearInterval(id);
  };
}

// ---------- 冻结 / 恢复 ----------

/** 实例 DOM 内（含同源 iframe 文档）是否有正在播放的媒体元素 */
function isDomMediaActive(wrapperEl) {
  if (!wrapperEl || !wrapperEl.querySelectorAll) return false;
  const scopes = [wrapperEl];
  wrapperEl.querySelectorAll('iframe').forEach((f) => {
    try { if (f.contentDocument) scopes.push(f.contentDocument); } catch (e) { /* 跨域忽略 */ }
  });
  for (const scope of scopes) {
    const list = scope.querySelectorAll('audio,video');
    for (const m of list) {
      if (!m.paused && !m.ended) return true;
    }
  }
  return false;
}

/** 冻结单个应用实例（心跳清空 + CSS 冻结 + iframe 协议广播）；媒体活跃应用自动跳过 */
export function freezeApp(appId) {
  const el = document.getElementById(`app-instance-${appId}`);
  const reg = nativeReg.get(appId);
  if (el && isDomMediaActive(el)) return; // 媒体豁免：播放中的应用永不冻结
  if (reg && !reg.frozen) {
    reg.frozen = true;
    // fix(audit-D/E): 只停原生定时器、不动登记表 —— 用模块加载时缓存的原生 clear
    // 引用（rawClearTimeout/rawClearInterval），绝不走 patched clear（会连登记表条目
    // 一起删，导致下一次恢复无表可建）。登记表是 resumeApp rehydrate 的唯一数据源。
    reg.timeouts.forEach((_rec, id) => { try { if (rawClearTimeout) rawClearTimeout(id); } catch (e) {} });
    reg.intervals.forEach((_rec, id) => { try { if (rawClearInterval) rawClearInterval(id); } catch (e) {} });
  }
  if (!el || el.dataset.frozen === '1') return;
  el.dataset.frozen = '1';
  el.classList.add('app-frozen');
  el.querySelectorAll('iframe').forEach((f) => {
    try { if (f.contentWindow) f.contentWindow.postMessage({ type: 'APP_FREEZE' }, '*'); } catch (e) {}
  });
  document.dispatchEvent(new CustomEvent('app-freeze', { detail: { appId } }));
}

/** 恢复单个应用实例：重建心跳定时器（登记表同步），解除 CSS 冻结并通知 iframe */
export function resumeApp(appId) {
  const el = document.getElementById(`app-instance-${appId}`);
  const reg = nativeReg.get(appId);
  if (reg && reg.frozen) {
    reg.frozen = false;
    const _st = window.setTimeout.bind(window);
    const _si = window.setInterval.bind(window);
    // fix(audit-D P3): timeout 按登记时记录的绝对到期时间戳计算剩余时长重建 ——
    // 不再用原始 delay 全量重建（每次前后台往返都会重置长延迟定时器，反复切换的
    // 应用提醒/睡眠定时可能永不触发）。已过期的立即触发且不再重建。
    const rehydrate = (map, kind) => {
      const entries = Array.from(map.entries());
      map.clear();
      entries.forEach(([oldId, rec]) => {
        nativeTimerOwner.delete(oldId);
        if (kind === 'iv') {
          const nid = _si(rec.fn, rec.d, ...rec.args);
          map.set(nid, rec);
        } else {
          const expires = typeof rec.expires === 'number' ? rec.expires : null;
          const remain = expires != null ? expires - Date.now() : null;
          if (expires != null && remain <= 0) {
            // 冻结期间已到期：恢复即触发，不再重新登记（复用原回调与参数）
            try { rec.fn.apply(null, rec.args); } catch (e) {}
            return;
          }
          const nid = _st(function () {
            map.delete(nid);
            nativeTimerOwner.delete(nid);
            return rec.fn.apply(null, rec.args);
          }, remain != null ? remain : rec.d, ...rec.args);
          map.set(nid, rec);
        }
      });
    };
    rehydrate(reg.timeouts, 'to');
    rehydrate(reg.intervals, 'iv');
  }
  if (!el || el.dataset.frozen !== '1') return;
  el.dataset.frozen = '0';
  el.classList.remove('app-frozen');
  el.querySelectorAll('iframe').forEach((f) => {
    try { if (f.contentWindow) f.contentWindow.postMessage({ type: 'APP_RESUME' }, '*'); } catch (e) {}
  });
  document.dispatchEvent(new CustomEvent('app-resume', { detail: { appId } }));
}

/** 按当前策略重扫全部实例：live/媒体 → 运行，其余 → 冻结（freeze 模式专用） */
export function applyFreezePolicy() {
  if (mode !== 'freeze') return;
  document.querySelectorAll('.app-instance-wrapper[id^="app-instance-"]').forEach((el) => {
    const appId = el.id.replace('app-instance-', '');
    if (liveAppIds.has(appId) || mediaActiveApps.has(appId)) {
      resumeApp(appId);
    } else {
      freezeApp(appId);
    }
  });
}

function resumeAll() {
  document.querySelectorAll('.app-instance-wrapper[id^="app-instance-"]').forEach((el) => {
    resumeApp(el.id.replace('app-instance-', ''));
  });
}

// ---------- 策略入口 ----------

let animFreezeLock = false;   // 开/关动画期冻结锁（v7.12 帧率）
let pendingLiveIds = [];      // 锁定期被压制的 live 名单（解锁后生效）

/**
 * 重设「保持运行」名单：前台应用 / 刚被推到后台的应用 / 分屏对。
 * freeze 模式下立即按名单重扫；live 模式下全量保活。
 * v7.12：开/关动画期间动画冻结锁生效 —— 名单暂存 pendingLiveIds，
 * 全量冻结（动画帧内 app 内容 DOM 保持静止，杜绝 layout 噪声），
 * 解锁瞬间按最后一次申请的名单恢复。
 * @param {string[]} ids
 */
export function setLiveApps(ids) {
  pendingLiveIds = (ids || []).filter(Boolean);
  if (animFreezeLock) return; // 动画期：压制，不生效
  liveAppIds.clear();
  pendingLiveIds.forEach((id) => { liveAppIds.add(id); });
  pendingLiveIds = [];
  if (mode === 'freeze') {
    applyFreezePolicy();
  } else {
    resumeAll();
  }
}

/**
 * v7.12 帧率：开/关动画期全局内容冻结锁。
 * 上锁（on=true）：全部应用实例进入冻结（timer 暂停 + CSS 冻结 + iframe 协议），
 *   动画期间 app 内容 DOM 零更新 → 渲染管线内 Layout/StyleRecalc 噪声归零
 *   （性能剖析实锤：关闭动画期天气应用 live 更新 city-chip 列表反复增删，
 *   单次触发 5.7ms 全量 Layout，是移动端掉帧主源）。
 * 解锁（on=false）：按锁定期最后一次 setLiveApps 申请恢复名单。
 * 媒体播放中的应用由 freezeApp 的既有豁免自动跳过，动画期间音画不中断。
 * 幂等：状态不变直接返回。
 * @param {boolean} on
 */
export function setAnimFreezeLock(on) {
  if (animFreezeLock === !!on) return;
  animFreezeLock = !!on;
  if (!animFreezeLock) {
    liveAppIds.clear();
    pendingLiveIds.forEach((id) => { liveAppIds.add(id); });
    pendingLiveIds = [];
  }
  if (mode === 'freeze') {
    applyFreezePolicy();
  } else if (!animFreezeLock) {
    resumeAll();
  }
}

/** 应用实例被销毁（多任务关闭/清空）时清理登记，防止僵尸登记复活 */
export function forgetApp(appId) {
  const reg = nativeReg.get(appId);
  if (reg) {
    reg.timeouts.forEach((_r, id) => nativeTimerOwner.delete(id));
    reg.intervals.forEach((_r, id) => nativeTimerOwner.delete(id));
  }
  nativeReg.delete(appId);
  liveAppIds.delete(appId);
  mediaActiveApps.delete(appId);
}

// ---------- 模式存取 ----------

export function getBgMode() { return mode; }
export function isFreezeMode() { return mode === 'freeze'; }
export function bgModeName() { return mode === 'freeze' ? '智能冻结' : '全部实时'; }

/**
 * 切换后台运行模式。
 * @param {'freeze'|'live'} m
 */
export function setBgMode(m) {
  if (m !== 'freeze' && m !== 'live') return;
  mode = m;
  try { localStorage.setItem(MODE_KEY, m); } catch (e) {}
  if (m === 'freeze') applyFreezePolicy(); else resumeAll();
  document.dispatchEvent(new CustomEvent('bg-mode-changed', { detail: { mode: m } }));
}

// ---------- 媒体豁免上报（freeze-shim 经 postMessage 汇报录音/播放状态） ----------

if (typeof window !== 'undefined') {
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'APP_MEDIA_STATE' || typeof d.active !== 'boolean') return;
    // 定位上报来源 iframe 所属的应用实例（分屏窗格不在实例体系内，自动忽略）
    let appId = null;
    document.querySelectorAll('.app-instance-wrapper[id^="app-instance-"] iframe').forEach((f) => {
      if (appId) return;
      try { if (f.contentWindow === e.source) appId = f.closest('.app-instance-wrapper').id.replace('app-instance-', ''); } catch (err) {}
    });
    if (!appId) return;
    if (d.active) mediaActiveApps.add(appId); else mediaActiveApps.delete(appId);
    if (mode === 'freeze') {
      if (d.active) resumeApp(appId);       // 播放中才启动媒体 → 立即解冻
      else applyFreezePolicy();             // 播放结束 → 重新按策略收敛
    }
  });

  // 面向设置页 / 调试的桥
  window.__bgFreeze = {
    mode: getBgMode,
    modeName: bgModeName,
    isFreezeMode,
    setMode: (m) => { setBgMode(m); },
    liveCount: () => liveAppIds.size,
    frozenCount: () => document.querySelectorAll('.app-instance-wrapper[data-frozen="1"]').length,
  };
}
