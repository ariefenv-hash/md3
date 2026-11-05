// ==================== audio-graph.js — 双层音量架构 Layer2 流总线（#117） ====================
//
// AOSP 真源锚点：
//   - AudioSystem.java L84-109（blob 实拉，volume-sliders.js 同源快照已入库）流常量：
//     STREAM_VOICE_CALL=0 / STREAM_SYSTEM=1 / STREAM_RING=2 / STREAM_MUSIC=3 /
//     STREAM_NOTIFICATION=5 / STREAM_ACCESSIBILITY=10 —— STREAM_ALARM=4 同段在录
//     （volume-sliders 快照未列：彼时 md3 无闹钟流消费面；#117 六流注册表补齐，诚实标注）。
//   - AudioManager.setStreamVolume(index, ...)：per-stream 独立 0~indexMax 档位语义；
//     md3 网页映射 0~100（volume-dialog.js KEY_STEP=100/15 同口径换算）。
//
// #115/#117 裁决路线 A（双层音量）：
//   Layer 1 系统音量 —— OS 硬件键/控制中心，网页不可读不可控（Android/iOS 均然）；
//   Layer 2 应用内音量 —— 本总线，md3 UI 唯一可控面（面板/设置五通道/导航栏键/QS）。
//   合成关系 final = L1 × L2，任一层为 0 即静音。L1 恒未知 → master 增益恒 1 作
//   拓扑占位锚点（不承担任何衰减——衰减唯一真源 = 各流子节点），master 同时挂
//   AnalyserNode 抽头供「实际音频输出」观测（静音提示判定面，见 resolveAudibilityHint）。
//
// md3 映射（诚实标注）：
//   - 六流 = 设置页五通道对齐（apps/settings.js 声音页 sndMedia/Call/Notif/Alarm 滑条 +
//     DEFAULTS { call:50, ring:70, notification:70, alarm:70 }）+ sfx（系统提示音流，
//     sound-haptics sfxVolume 缺省 0.5 同源换算 50）。sfx 流映射 STREAM_SYSTEM(1)
//     （SoundPoolHelper STREAM_SYSTEM 同构）；alarm 流映射 STREAM_ALARM(4)。
//   - media 流节点 = media-service 既有 GainNode 链（#116 createGainChain 产物）经
//     registerNode 注册采纳：拓扑重连 node→master→destination（可听路径等价——
//     master 恒 1），并挂 analyser 抽头；节点增益值仍由 mediaService.setVolume 单点
//     写（防双重真源），graph.setLevel('media') 仅记账+持久化+事件（skipNode 约定）。
//   - sfx 流节点 = sound-haptics tone/buffer 的 amp 节点改挂 sfx 子总线（amp.gain 仍由
//     sfxVolume 单点缩放，子总线增益恒 1 不叠衰减——否则双重衰减；AOSP STREAM_SYSTEM
//     音量由 AudioFlinger 承担，网页等价层为 sfxVolume 单点缩放，拓扑预留不叠增益）。
//   - ring/notification/alarm/call 流：设置页滑条既有持久化（settings:sound-v1）为
//     唯一真源，本总线记账同步（无节点消费面——闹钟引擎在 clock iframe 内宿主不可达，
//     未来铃声/闹钟引擎挂节点即自动生效）。
//
// 认知落差三件套（#117「必须处理的产品问题」建议处理 1/2/3）：
//   ① 静音提示 —— audibilityHint()：播放中 + Layer2 非 0 + 图内路由 + 分析面持续零信号
//     ≥ 阈值 → UI 层提示「若仍无声音，请检查系统音量」。条件式措辞由 UI 层承载：
//     网页无法读取系统音量，只能做「无法确认」的提示，不能断言；跨域直连源不经图
//     （#116 R2 门控）→ 不提示，防误报；安静内容以 2.5s 持续窗抑制。
//   ② 首启引导 —— ONBOARDING_KEY 一次性说明存取（UI 触发面与措辞见 volume-dialog 接线）。
//   ③ 面板文案 —— 「应用音量」标注（index.html .vd-layer-caption，AOSP 流名标签语义位）。
//
// 纯逻辑层：零 DOM 零 window 引用（ctx/node/storage 以参数注入，vitest 伪造 ctx 真跑）；
// 生产单例与 DOM/storage 注入枢纽见 js/audio-graph-instance.js。

import {
  STREAM_VOICE_CALL,
  STREAM_SYSTEM,
  STREAM_RING,
  STREAM_MUSIC,
  STREAM_NOTIFICATION,
} from './volume-sliders.js';

/** AudioSystem.java L84-109：STREAM_ALARM=4（volume-sliders.js 快照未列，#117 补齐） */
export const STREAM_ALARM = 4;

/** 六流注册表（键 = md3 流键；aosp = AudioSystem 流常量；label = 面板/设置文案）。
 *  键序 = 设置页五通道（media/call/ring/notification/alarm）+ sfx 追加（系统流殿后，
 *  与 AOSP 默认响度页 STREAM_SYSTEM 排位惯例一致）。 */
export const AUDIO_STREAMS = [
  { key: 'media',        aosp: STREAM_MUSIC,        aospName: 'STREAM_MUSIC',        label: '媒体音量' },
  { key: 'call',         aosp: STREAM_VOICE_CALL,   aospName: 'STREAM_VOICE_CALL',   label: '通话音量' },
  { key: 'ring',         aosp: STREAM_RING,         aospName: 'STREAM_RING',         label: '铃声和通知音量' },
  { key: 'notification', aosp: STREAM_NOTIFICATION, aospName: 'STREAM_NOTIFICATION', label: '通知音量' },
  { key: 'alarm',        aosp: STREAM_ALARM,        aospName: 'STREAM_ALARM',        label: '闹钟音量' },
  { key: 'sfx',          aosp: STREAM_SYSTEM,       aospName: 'STREAM_SYSTEM',       label: '系统提示音' },
];

/** 键合法性（注册表闭包内判定，防拼写漂移） */
export function isAudioStreamKey(key) {
  return AUDIO_STREAMS.some((d) => d.key === key);
}

/** 缺省流值（0-100 整数）：media 60 = volume-dialog currentVolume 既有缺省同值；
 *  call/ring/notification/alarm = apps/settings.js DEFAULTS 逐值同源；
 *  sfx 50 = sound-haptics sfxVolume 缺省 0.5 同源换算。 */
export const DEFAULT_LEVELS = { media: 60, call: 50, ring: 70, notification: 70, alarm: 70, sfx: 50 };

/** 流值域解析（0-100 整数；NaN/Infinity/非数值 → 0——失效即静音，绝不放大；
 *  与 media-gain.resolveGainVolume 同律） */
export function resolveLevel100(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** 流值 → 增益线性值（0~1） */
export function levelToGain(v100) {
  return resolveLevel100(v100) / 100;
}

/** #109 目标流 → Layer2 流键桥（音量键判定链产出 'call'|'alarm'|'music'|'ring'，
 *  总线键 = 'call'|'alarm'|'media'|'ring'——music 键名差异在此归一） */
export function targetToStream(target) {
  switch (target) {
    case 'call':  return 'call';
    case 'alarm': return 'alarm';
    case 'ring':  return 'ring';
    case 'music':
    default:      return 'media';
  }
}

/** #117 建议处理①：静音提示判定（纯函数；状态由调用方持有 zeroSinceMs 并回传）。
 *  @param {object} p
 *   - playing      媒体播放中（isPlaying 或 external.isPlaying）
 *   - level        Layer2 流值（0-100）
 *   - routed       目标流是否图内路由（media: registerNode 采纳真；跨域直连/未接管 false）
 *   - observable   分析面在位且 ctx running（false = 无法观测 → 不提示，诚实标注）
 *   - peak         本次采样峰值（sampleOutput 产物；null = 不可观测）
 *   - zeroSinceMs  持续零信号起点 ts（0 = 无；由调用方读写）
 *   - now          当前 ts（注入）
 *   - thresholdMs  持续窗阈值（缺省 2500ms——安静内容误报抑制窗）
 *  @returns {'check-system-volume'|null}
 */
export function resolveAudibilityHint({
  playing, level, routed, observable, peak, zeroSinceMs, now, thresholdMs = 2500,
}) {
  const lv = resolveLevel100(level);
  if (!playing || lv <= 0) return null;              // 未播放/Layer2 自静音 → 提示无意义
  if (!routed || !observable || peak == null) return null;  // 无法确认 → 不提示（不能断言）
  if (peak > 1e-4) return null;                      // 有实际输出 → 无落差
  if (!zeroSinceMs) return null;                     // 零信号首帧：记起点（调用方落账）
  return (now - zeroSinceMs) >= thresholdMs ? 'check-system-volume' : null;
}

/** #117 建议处理②：首启引导一次性存取（键与语义；UI 触发面 = mediaService 首播 →
 *  下一帧 toast 说明双层关系——「一次性」以持久化 dismissed 承载，toast 自动消失
 *  即「可关闭」；读取失败视为已读，不骚扰） */
export const ONBOARDING_KEY = 'audio-graph:onboarding-dismissed';
export function resolveOnboardingDismissed(storage) {
  try { return !storage || storage.getItem(ONBOARDING_KEY) === '1'; } catch (e) { return true; }
}
export function dismissOnboarding(storage) {
  try { if (storage) storage.setItem(ONBOARDING_KEY, '1'); } catch (e) { /* 隐私模式仅内存 */ }
}

/** 生产持久化适配器（storage 注入）：
 *  - media/call/ring/notification/alarm → settings:sound-v1 同键 JSON 读写（设置页
 *    五通道单一真源不迁移；未知键保留——settings.js load 的 Object.assign 同律）；
 *  - sfx → 既有 ios-desktop:sfx-volume '0'~'1' 浮点键换算（sound-haptics 真源同键）。 */
export const SOUND_STORE_KEY = 'settings:sound-v1';
export const SFX_VOLUME_KEY = 'ios-desktop:sfx-volume';
export function createSoundStoreAdapter(storage) {
  const st = () => (storage || null);
  return {
    load(key) {
      const s = st(); if (!s || !isAudioStreamKey(key)) return null;
      try {
        if (key === 'sfx') {
          const raw = parseFloat(s.getItem(SFX_VOLUME_KEY) || '');
          return Number.isFinite(raw) ? resolveLevel100(Math.max(0, Math.min(1, raw)) * 100) : null;
        }
        const obj = JSON.parse(s.getItem(SOUND_STORE_KEY) || '{}') || {};
        const v = Number(obj[key]);
        return Number.isFinite(v) ? resolveLevel100(v) : null;
      } catch (e) { return null; }
    },
    save(key, v) {
      const s = st(); if (!s || !isAudioStreamKey(key)) return;
      try {
        const v100 = resolveLevel100(v);
        if (key === 'sfx') { s.setItem(SFX_VOLUME_KEY, String(levelToGain(v100))); return; }
        let obj = {};
        try { obj = JSON.parse(s.getItem(SOUND_STORE_KEY) || '{}') || {}; } catch (e) { obj = {}; }
        obj[key] = v100;
        s.setItem(SOUND_STORE_KEY, JSON.stringify(obj));
      } catch (e) { /* 隐私模式降级仅内存 */ }
    },
  };
}

/**
 * 图工厂（纯逻辑；生产单例经 js/audio-graph-instance.js 注入 storage/onChange）。
 * @param {object} [opts]
 *   - levels      初始流值覆盖（0-100；缺省逐键走 store.load → DEFAULT_LEVELS）
 *   - store       持久化适配器（createSoundStoreAdapter 产物形态 { load, save }；null = 仅内存）
 *   - onChange    (key, v100) => void（setLevel 每次调用派发——与 settings.js store.set
 *                 每写必派发 settings-sound-changed 的既有语义一致）
 *   - thresholdMs 静音提示持续窗（缺省 2500ms）
 */
export function createAudioGraph({ levels = null, store = null, onChange = null, thresholdMs = 2500 } = {}) {
  const state = {
    levels: {},      // key → 0-100 整数（唯一流值真源）
    nodes: {},       // key → GainNode（attach 后未注册流=子总线占位；registerNode 后=外部采纳节点）
    external: {},    // key → true（registerNode 采纳标记——isStreamRouted 判定面）
    master: null,    // 主总线 GainNode（Layer1 占位恒 1 → destination；analyser 抽头）
    ctx: null,
    analyser: null,
    buf: null,       // Float32Array（getFloatTimeDomainData 复用缓冲）
    zeroSince: 0,    // 持续零信号起点（audibilityHint 内部账本）
    thresholdMs: Number(thresholdMs) > 0 ? Number(thresholdMs) : 2500,
  };
  for (const def of AUDIO_STREAMS) {
    const override = levels && def.key in levels ? levels[def.key] : null;
    const persisted = store ? store.load(def.key) : null;
    const base = override != null ? override : (persisted != null ? persisted : DEFAULT_LEVELS[def.key]);
    state.levels[def.key] = resolveLevel100(base);
  }

  const graph = {
    /** 流值快照（防御性拷贝） */
    get levels() { return { ...state.levels }; },
    /** 主总线/上下文挂载态（attach 成功后 true） */
    get attached() { return !!state.ctx; },
    get masterNode() { return state.master; },

    /** 挂载（幂等）：master(1) → ctx.destination + analyser 抽头 + 未注册流子总线占位。
     *  同一会话单上下文纪律（#116 R3/#117 收编清单）：已挂其他 ctx 拒绝（返回 false）。 */
    attach(ctx) {
      if (!ctx || typeof ctx.createGain !== 'function') return false;
      if (state.ctx === ctx) return true;
      if (state.ctx) return false;
      try {
        const master = ctx.createGain();
        master.gain.value = 1;                       // Layer1 占位：不可读不可控，衰减真源=子节点
        if (ctx.destination) master.connect(ctx.destination);
        let analyser = null;
        if (typeof ctx.createAnalyser === 'function') {
          try {
            analyser = ctx.createAnalyser();
            if (analyser && 'fftSize' in analyser) analyser.fftSize = 256;
            master.connect(analyser);                // 抽头：AnalyserNode 不转输出，仅观测
          } catch (e) { analyser = null; }
        }
        state.ctx = ctx;
        state.master = master;
        state.analyser = analyser;
        if (analyser && typeof analyser.getFloatTimeDomainData === 'function' && analyser.fftSize) {
          state.buf = new Float32Array(analyser.fftSize);
        } else { state.analyser = null; }
        // 未注册外部节点的流建子总线占位（sfx 由 sound-haptics 挂入；ring 等 = 拓扑预留）
        for (const def of AUDIO_STREAMS) {
          if (state.nodes[def.key]) continue;
          try {
            const g = ctx.createGain();
            g.gain.value = 1;                        // 子总线不叠增益（见文件头映射注记）
            g.connect(master);
            state.nodes[def.key] = g;
          } catch (e) { /* 子总线缺位 = 该流仅记账 */ }
        }
        return true;
      } catch (e) { return false; }
    },

    /** 流键 → 总线节点（注册采纳节点优先；未 attach → null） */
    busOf(key) {
      if (!isAudioStreamKey(key)) return null;
      return state.nodes[key] || null;
    },

    /** 目标流是否图内路由（外部采纳节点 + 主总线在位——静音提示 routed 判定面；
     *  子总线占位 ≠ 路由：占位无消费面，观测其上有意义的是真实采纳节点） */
    isStreamRouted(key) {
      return !!(isAudioStreamKey(key) && state.external[key] && state.master);
    },

    /** 外部节点注册采纳（media-service 媒体链 / 未来铃声引擎）：
     *  拓扑重连 node→master（ detach 既有直连——createGainChain 的 node→destination
     *  出线由本方法收编，可听路径经 master(1)→destination 等价）；图侧流值从节点现值
     *  同步（采纳语义：节点真值所有者仍是消费模块，图只承接记账/持久化/事件）。
     *  @returns boolean 是否生效 */
    registerNode(key, node) {
      if (!isAudioStreamKey(key) || !node || typeof node.connect !== 'function') return false;
      state.nodes[key] = node;
      state.external[key] = true;
      if (state.master) {
        try { if (typeof node.disconnect === 'function') node.disconnect(); } catch (e) { /* 引擎差异 */ }
        try { node.connect(state.master); } catch (e) { return false; }
      }
      try { state.levels[key] = resolveLevel100((node.gain && node.gain.value) * 100); } catch (e) { /* 记账失败保持原值 */ }
      return true;
    },

    /** 注销（消费模块会话阻断兜底；路由保持现状——可听性由消费模块自行恢复直连） */
    unregisterNode(key) {
      if (!isAudioStreamKey(key)) return;
      delete state.external[key];
      if (state.ctx && !state.external[key]) {
        // 回落：重建子总线占位（拓扑完整；原采纳节点由消费模块接管）
        try {
          const g = state.ctx.createGain();
          g.gain.value = 1;
          g.connect(state.master);
          state.nodes[key] = g;
        } catch (e) { delete state.nodes[key]; }
      }
    },

    getLevel(key) { return isAudioStreamKey(key) ? state.levels[key] : 0; },
    getLevelByTarget(target) { return graph.getLevel(targetToStream(target)); },

    /** 流值落账（单一写入口）：钳位 → 状态 → 持久化 → 节点写（skipNode 可跳）→ 事件。
     *  @returns 实际生效的 0-100 整数 */
    setLevel(key, v100, opts = null) {
      if (!isAudioStreamKey(key)) return 0;
      const v = resolveLevel100(v100);
      state.levels[key] = v;
      if (store) { try { store.save(key, v); } catch (e) { /* 适配器内部已兜底 */ } }
      if (!(opts && opts.skipNode)) {
        const n = state.nodes[key];
        if (n && n.gain) { try { n.gain.value = levelToGain(v); } catch (e) { /* 引擎差异 */ } }
      }
      if (onChange) { try { onChange(key, v); } catch (e) { /* 消费方异常不阻断落账 */ } }
      return v;
    },
    setLevelByTarget(target, v100, opts = null) { return graph.setLevel(targetToStream(target), v100, opts); },

    isMuted(key) { return graph.getLevel(key) === 0; },

    /** 合成关系 final = L1 × L2（任一层 0 即静音）。L1 未知 → value 为 Layer2 分量、
     *  unverifiable 标注「不可确认」（网页不读系统音量，#117 认知落差根因）。 */
    compositeGain(key, { layer1 = null } = {}) {
      const l2 = levelToGain(graph.getLevel(key));
      if (layer1 == null) return { value: l2, unverifiable: true };
      const l1n = Number(layer1);
      const l1 = Number.isFinite(l1n) ? Math.max(0, Math.min(1, l1n)) : 0;
      return { value: l1 * l2, unverifiable: false };
    },

    /** 主总线瞬时输出峰值（静音提示观测面）。不可观测（无 analyser/ctx 挂起）→ null。 */
    sampleOutput() {
      if (!state.analyser || !state.buf || !state.ctx) return null;
      if (state.ctx.state !== 'running') return null;
      try {
        state.analyser.getFloatTimeDomainData(state.buf);
        let peak = 0;
        for (let i = 0; i < state.buf.length; i++) {
          const a = state.buf[i] < 0 ? -state.buf[i] : state.buf[i];
          if (a > peak) peak = a;
        }
        return peak;
      } catch (e) { return null; }
    },

    /** 静音提示状态机（#117 建议处理①；resolveAudibilityHint 的状态承载壳）。
     *  内部账本 zeroSince：峰值归零起点；任何有声/不可观测/未播放帧清零。
     *  @param {string} key 目标流键（面板 media 路径）
     *  @param {object} p { playing, now }（routed/observable 由图内自判 + p.routed 优先） */
    audibilityHint(key, { playing, now, routed = null } = {}) {
      const k = isAudioStreamKey(key) ? key : 'media';
      const level = state.levels[k];
      const routedReal = routed != null ? !!routed : graph.isStreamRouted(k);
      const peak = graph.sampleOutput();
      const verdict = resolveAudibilityHint({
        playing: !!playing,
        level,
        routed: routedReal,
        observable: !!state.analyser,
        peak,
        zeroSinceMs: state.zeroSince,
        now: Number.isFinite(now) ? now : Date.now(),
        thresholdMs: state.thresholdMs,
      });
      // 账本同步（与判定同帧）：有声/不可观测/未播放 → 清零；首帧零信号 → 记起点
      if (!playing || level <= 0 || !routedReal || peak == null || peak > 1e-4) state.zeroSince = 0;
      else if (!state.zeroSince) state.zeroSince = Number.isFinite(now) ? now : Date.now();
      return verdict;
    },

    /** 测试/调试快照（零引用生产面） */
    __debug() {
      return {
        attached: graph.attached,
        levels: graph.levels,
        routed: Object.keys(state.external).filter((k) => state.external[k]),
        thresholdMs: state.thresholdMs,
        observable: !!state.analyser,
      };
    },
  };
  return graph;
}
