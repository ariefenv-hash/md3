// ==================== v117-audio-graph.test.js — #117 双层音量架构 Layer2 流总线 v10.77 ====================
//
// 覆盖（R94 窗主作业）：
//   · aosp/audio-graph.js 纯逻辑：六流注册表（键序/AOSP AudioSystem 常量对齐 + STREAM_ALARM=4
//     补齐锚）、DEFAULT_LEVELS 五通道同源（settings.js DEFAULTS + sfxVolume 0.5 换算）、
//     resolveLevel100/levelToGain 值域、targetToStream（#109 桥）、compositeGain（final = L1×L2，
//     L1 未知 unverifiable）、resolveAudibilityHint 全分支（条件式提示——不断言系统音量）
//   · createAudioGraph 状态机（伪造 ctx 真跑）：attach 幂等/换 ctx 拒绝/master→destination
//     + analyser 抽头/子总线占位、setLevel 落账四件套（状态/持久化/节点写/事件）+ skipNode、
//     registerNode 采纳（disconnect→connect(master) + 流值从节点现值同步）、unregisterNode
//     回落、isStreamRouted、sampleOutput/audibilityHint 状态机（zeroSince 账本）
//   · createSoundStoreAdapter：settings:sound-v1 同键 JSON 往返（未知键保留）+ 损坏兜底 +
//     sfx 浮点键换算
//   · 接线锚：media-service（attach/registerNode/setLevel skipNode/构造恢复/首播引导派发）、
//     volume-dialog（非媒体流 setLevel 桥/静音提示轮询/面板文案/show 恢复走总线）、
//     sound-haptics（sfx 总线路由×2 + setSfxVolume 记账）、instance（事件出口双派发）、
//     index.html/.vd-layer-caption + CSS
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUDIO_STREAMS,
  DEFAULT_LEVELS,
  STREAM_ALARM,
  isAudioStreamKey,
  resolveLevel100,
  levelToGain,
  targetToStream,
  resolveAudibilityHint,
  resolveOnboardingDismissed,
  dismissOnboarding,
  ONBOARDING_KEY,
  SOUND_STORE_KEY,
  SFX_VOLUME_KEY,
  createSoundStoreAdapter,
  createAudioGraph,
} from '../ios-desktop/js/aosp/audio-graph.js';
import { STREAM_MUSIC, STREAM_VOICE_CALL, STREAM_RING, STREAM_NOTIFICATION, STREAM_SYSTEM } from '../ios-desktop/js/aosp/volume-sliders.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const AG = readFileSync(R('js/aosp/audio-graph.js'), 'utf8');
const AGI = readFileSync(R('js/audio-graph-instance.js'), 'utf8');
const MS = readFileSync(R('js/media-service.js'), 'utf8');
const VD = readFileSync(R('js/volume-dialog.js'), 'utf8');
const SH = readFileSync(R('js/sound-haptics.js'), 'utf8');
const HTML = readFileSync(R('index.html'), 'utf8');
const CSS = readFileSync(R('css/pull-panels.css'), 'utf8');

/** 伪造 AudioContext（createGain 节点记录 connect 目标/disconnect 次数；可选 analyser） */
function fakeCtx({ analyserFill = null } = {}) {
  const ctx = {
    state: 'running',
    destination: { _dest: true },
    createGain() {
      return {
        gain: { value: 1 },
        connects: [],
        disconnects: 0,
        connect(t) { this.connects.push(t); },
        disconnect() { this.disconnects += 1; },
      };
    },
  };
  if (analyserFill !== null) {
    ctx.createAnalyser = function () {
      const self = {
        fftSize: 256,
        fill: analyserFill,
        getFloatTimeDomainData(arr) { arr.fill(self.fill); },
      };
      ctx.__analyser = self;
      return self;
    };
  }
  return ctx;
}

/** 伪造 storage（内存 KV） */
function fakeStorage(seed = {}) {
  const kv = { ...seed };
  return {
    kv,
    getItem: (k) => (k in kv ? kv[k] : null),
    setItem: (k, v) => { kv[k] = String(v); },
  };
}

describe('v117-A · 六流注册表与缺省值（AudioSystem 常量 + 五通道同源对齐）', () => {
  it('A1 六流键序与 AOSP 常量逐项对齐（volume-sliders.js 同源快照 + STREAM_ALARM=4 补齐）', () => {
    expect(AUDIO_STREAMS.map((d) => d.key)).toEqual(['media', 'call', 'ring', 'notification', 'alarm', 'sfx']);
    const byKey = Object.fromEntries(AUDIO_STREAMS.map((d) => [d.key, d]));
    expect(byKey.media.aosp).toBe(STREAM_MUSIC);                 // 3
    expect(byKey.call.aosp).toBe(STREAM_VOICE_CALL);             // 0
    expect(byKey.ring.aosp).toBe(STREAM_RING);                   // 2
    expect(byKey.notification.aosp).toBe(STREAM_NOTIFICATION);   // 5
    expect(byKey.alarm.aosp).toBe(STREAM_ALARM);
    expect(byKey.sfx.aosp).toBe(STREAM_SYSTEM);                  // 1（系统提示音 → STREAM_SYSTEM 同构）
    expect(STREAM_ALARM).toBe(4);
  });

  it('A2 DEFAULT_LEVELS 逐值同源：五通道 = settings.js DEFAULTS；sfx = sfxVolume 0.5 换算', () => {
    expect(DEFAULT_LEVELS).toEqual({ media: 60, call: 50, ring: 70, notification: 70, alarm: 70, sfx: 50 });
    // 源码同源锚：settings.js 声音页 DEFAULTS 行 + sound-haptics sfxVolume 缺省
    const settings = readFileSync(R('js/apps/settings.js'), 'utf8');
    expect(settings).toContain('call: 50, ring: 70, notification: 70, alarm: 70');
    expect(SH).toContain('let sfxVolume = 0.5;');
  });

  it('A3 isAudioStreamKey 键闭包（拼写漂移防护）', () => {
    for (const d of AUDIO_STREAMS) expect(isAudioStreamKey(d.key)).toBe(true);
    expect(isAudioStreamKey('Media')).toBe(false);
    expect(isAudioStreamKey('music')).toBe(false);   // music 是 #109 目标流名，非总线键
    expect(isAudioStreamKey(null)).toBe(false);
  });
});

describe('v117-B · 值域/合成/目标流桥', () => {
  it('B1 resolveLevel100 钳位（失效即 0，绝不放大）', () => {
    expect(resolveLevel100(-5)).toBe(0);
    expect(resolveLevel100(150)).toBe(100);
    expect(resolveLevel100(60.4)).toBe(60);
    expect(resolveLevel100('70')).toBe(70);
    expect(resolveLevel100(NaN)).toBe(0);
    expect(resolveLevel100(Infinity)).toBe(0);
    expect(resolveLevel100(null)).toBe(0);
  });

  it('B2 levelToGain 线性换算', () => {
    expect(levelToGain(100)).toBe(1);
    expect(levelToGain(0)).toBe(0);
    expect(levelToGain(42)).toBe(0.42);
    expect(levelToGain('65')).toBe(0.65);
  });

  it('B3 targetToStream 桥：music→media 四档归一（#109 判定链产物 → 总线键）', () => {
    expect(targetToStream('music')).toBe('media');
    expect(targetToStream('call')).toBe('call');
    expect(targetToStream('alarm')).toBe('alarm');
    expect(targetToStream('ring')).toBe('ring');
    expect(targetToStream('unknown')).toBe('media');   // 缺省回落媒体流
  });

  it('B4 compositeGain 合成关系 final = L1 × L2（任一层 0 即静音；L1 未知 unverifiable）', () => {
    const g = createAudioGraph({ levels: { media: 60, ring: 80 } });
    const unknowable = g.compositeGain('media');
    expect(unknowable).toEqual({ value: 0.6, unverifiable: true });   // L1 占位 1
    expect(g.compositeGain('ring', { layer1: 0.5 })).toEqual({ value: 0.4, unverifiable: false });
    expect(g.compositeGain('ring', { layer1: 0 }).value).toBe(0);      // L1=0 → 整链静音
    expect(g.compositeGain('ring', { layer1: 2 })).toEqual({ value: 0.8, unverifiable: false }); // 钳位 1
    expect(g.compositeGain('ring', { layer1: NaN }).value).toBe(0);    // 非法 L1 → 静音保守
  });
});

describe('v117-C · createAudioGraph 状态机（伪造 ctx 真跑）', () => {
  it('C1 attach：master 恒 1 → destination + analyser 抽头 + 全流子总线占位；幂等/换 ctx 拒绝', () => {
    const ctx = fakeCtx({ analyserFill: 0 });
    const g = createAudioGraph({});
    expect(g.attach(null)).toBe(false);
    expect(g.attach({})).toBe(false);                 // 无 createGain
    expect(g.attach(ctx)).toBe(true);
    expect(g.attached).toBe(true);
    expect(g.attach(ctx)).toBe(true);                 // 同 ctx 幂等
    const ctx2 = fakeCtx({});
    expect(g.attach(ctx2)).toBe(false);               // 换 ctx 拒绝（会话单上下文纪律）
    expect(g.masterNode.gain.value).toBe(1);          // Layer1 占位：不承担衰减
    expect(g.masterNode.connects[0]).toBe(ctx.destination);
    expect(g.masterNode.connects[1]).toBe(ctx.__analyser);   // 抽头（不转输出）
    for (const d of AUDIO_STREAMS) expect(g.busOf(d.key)).not.toBeNull();
  });

  it('C2 setLevel 落账四件套：状态/持久化/节点写/onChange；skipNode 跳节点写不跳落账', () => {
    const st = fakeStorage();
    const events = [];
    const g = createAudioGraph({ store: createSoundStoreAdapter(st), onChange: (k, v) => events.push([k, v]) });
    expect(g.setLevel('ring', 85.6)).toBe(86);
    expect(g.getLevel('ring')).toBe(86);
    expect(JSON.parse(st.kv[SOUND_STORE_KEY]).ring).toBe(86);   // settings:sound-v1 同键落库
    expect(g.busOf('ring')).toBeNull();               // 未 attach：无节点可写（仅记账）
    expect(events).toEqual([['ring', 86]]);
    g.attach(fakeCtx({}));
    const node = g.busOf('ring');
    g.setLevel('ring', 40);
    expect(node.gain.value).toBe(0.4);                // 节点写
    g.setLevel('ring', 70, { skipNode: true });
    expect(node.gain.value).toBe(0.4);                // skipNode：节点不写
    expect(g.getLevel('ring')).toBe(70);              // 落账照常
    expect(g.setLevel('nope', 50)).toBe(0);           // 非法键拒写
  });

  it('C3 registerNode 采纳：disconnect→connect(master) 重连 + 流值从节点现值同步（0.42→42）', () => {
    const ctx = fakeCtx({ analyserFill: 0 });
    const g = createAudioGraph({});
    g.attach(ctx);
    const chainGain = ctx.createGain();
    chainGain.gain.value = 0.42;                      // media-service setVolume 后现值
    expect(g.registerNode('media', chainGain)).toBe(true);
    expect(chainGain.disconnects).toBe(1);            // 收编直连出线
    expect(chainGain.connects).toEqual([g.masterNode]);  // 重连主总线
    expect(g.getLevel('media')).toBe(42);             // 采纳语义：图侧从节点现值同步
    expect(g.isStreamRouted('media')).toBe(true);     // 外部采纳 + master 在位
    expect(g.isStreamRouted('ring')).toBe(false);     // 子总线占位 ≠ 路由
    expect(g.registerNode('media', null)).toBe(false);
    expect(g.registerNode('nope', chainGain)).toBe(false);
  });

  it('C4 registerNode 于 attach 前：先采纳后挂载（节点值同步一次；挂载后 routed 生效）', () => {
    const g = createAudioGraph({});
    const node = { gain: { value: 1 }, connects: [], disconnects: 0, connect(t) { this.connects.push(t); }, disconnect() { this.disconnects += 1; } };
    node.gain.value = 0.3;
    expect(g.registerNode('media', node)).toBe(true);  // 无 master：仅采纳记账
    expect(node.disconnects).toBe(0);                  // 无重连（直连保持，兜底语义）
    expect(g.getLevel('media')).toBe(30);
    expect(g.isStreamRouted('media')).toBe(false);
    const ctx = fakeCtx({});
    g.attach(ctx);
    expect(g.isStreamRouted('media')).toBe(true);      // external 标记 + master 在位
  });

  it('C5 unregisterNode：注销回落子总线占位；external 标记清除', () => {
    const ctx = fakeCtx({});
    const g = createAudioGraph({});
    g.attach(ctx);
    const chainGain = ctx.createGain();
    chainGain.gain.value = 0.55;                       // 采纳前现值（media-service setVolume 后形态）
    g.registerNode('media', chainGain);
    expect(g.isStreamRouted('media')).toBe(true);
    expect(g.getLevel('media')).toBe(55);              // 采纳语义：图侧从节点现值同步
    g.unregisterNode('media');
    expect(g.isStreamRouted('media')).toBe(false);
    expect(g.busOf('media')).not.toBe(chainGain);      // 重建占位
    expect(g.getLevel('media')).toBe(55);              // 值账保持（不因注销重置）
  });

  it('C6 初始值优先级：levels 覆盖 > store 持久化 > DEFAULT；损坏持久化回落 DEFAULT', () => {
    const st = fakeStorage({ [SOUND_STORE_KEY]: JSON.stringify({ ring: 33, preventRinging: true }) });
    const g1 = createAudioGraph({ store: createSoundStoreAdapter(st) });
    expect(g1.getLevel('ring')).toBe(33);              // 持久化
    expect(g1.getLevel('media')).toBe(60);             // 缺省
    const bad = fakeStorage({ [SOUND_STORE_KEY]: '{broken json' });
    const g2 = createAudioGraph({ store: createSoundStoreAdapter(bad) });
    expect(g2.getLevel('ring')).toBe(70);              // 损坏 → DEFAULT
    const g3 = createAudioGraph({ levels: { media: 25 }, store: createSoundStoreAdapter(st) });
    expect(g3.getLevel('media')).toBe(25);             // 显式覆盖最高
  });

  it('C7 levels 快照防御性拷贝（外部改写不渗入状态）', () => {
    const g = createAudioGraph({});
    const snap = g.levels;
    snap.media = 1;
    expect(g.getLevel('media')).toBe(60);
  });
});

describe('v117-D · 静音提示（resolveAudibilityHint 全分支 + audibilityHint 状态机）', () => {
  it('D1 纯函数：未播放/自静音/不可路由/不可观测/有声 → null（不能断言语义）', () => {
    const base = { now: 1000, zeroSinceMs: 0, thresholdMs: 2000 };
    expect(resolveAudibilityHint({ ...base, playing: false, level: 50, routed: true, observable: true, peak: 0 })).toBeNull();
    expect(resolveAudibilityHint({ ...base, playing: true, level: 0, routed: true, observable: true, peak: 0 })).toBeNull();
    expect(resolveAudibilityHint({ ...base, playing: true, level: 50, routed: false, observable: true, peak: 0 })).toBeNull();
    expect(resolveAudibilityHint({ ...base, playing: true, level: 50, routed: true, observable: false, peak: null })).toBeNull();
    expect(resolveAudibilityHint({ ...base, playing: true, level: 50, routed: true, observable: true, peak: 0.5 })).toBeNull();
    expect(resolveAudibilityHint({ ...base, playing: true, level: 50, routed: true, observable: true, peak: 0 })).toBeNull();  // 首帧零：记起点
  });

  it('D2 纯函数：持续零信号 ≥ 阈值 → check-system-volume；阈值边界（恰等触发，-1ms 不触发）', () => {
    const base = { playing: true, level: 50, routed: true, observable: true, peak: 0, thresholdMs: 2000 };
    expect(resolveAudibilityHint({ ...base, zeroSinceMs: 1000, now: 2999 })).toBeNull();
    expect(resolveAudibilityHint({ ...base, zeroSinceMs: 1000, now: 3000 })).toBe('check-system-volume');
  });

  it('D3 状态机：zeroSince 账本同步（首帧记起点/有声清零/不可观测清零/未播放清零）', () => {
    const ctx = fakeCtx({ analyserFill: 0 });
    const g = createAudioGraph({ thresholdMs: 2000 });
    g.attach(ctx);
    const chainGain = ctx.createGain();
    g.registerNode('media', chainGain);
    g.setLevel('media', 50, { skipNode: true });
    const t0 = 1000000;
    expect(g.audibilityHint('media', { playing: true, now: t0 })).toBeNull();            // 首帧记账
    expect(g.audibilityHint('media', { playing: true, now: t0 + 1000 })).toBeNull();
    expect(g.audibilityHint('media', { playing: true, now: t0 + 2000 })).toBe('check-system-volume');
    ctx.__analyser.fill = 0.5;                                                          // 有声
    expect(g.audibilityHint('media', { playing: true, now: t0 + 3000 })).toBeNull();     // 清零
    ctx.__analyser.fill = 0;
    expect(g.audibilityHint('media', { playing: true, now: t0 + 3100 })).toBeNull();     // 重新记账
    expect(g.audibilityHint('media', { playing: true, now: t0 + 5100 })).toBe('check-system-volume');
    expect(g.audibilityHint('media', { playing: false, now: t0 + 5200 })).toBeNull();    // 停播清零
    expect(g.audibilityHint('media', { playing: true, now: t0 + 5300 })).toBeNull();     // 重记
  });

  it('D4 状态机：未路由（跨域直连）不提示 + ctx 挂起不可观测不提示', () => {
    const g = createAudioGraph({ thresholdMs: 2000 });
    const ctx = fakeCtx({ analyserFill: 0 });
    g.attach(ctx);
    g.setLevel('media', 50);
    // 无 registerNode：子总线占位非路由 → 不提示（R2 跨域直连语义面）
    expect(g.audibilityHint('media', { playing: true, now: 1000000 })).toBeNull();
    // 已路由但 ctx 挂起 → sampleOutput null → 不提示
    const chainGain = ctx.createGain();
    g.registerNode('media', chainGain);
    ctx.state = 'suspended';
    expect(g.audibilityHint('media', { playing: true, now: 1000000 + 5000 })).toBeNull();
    ctx.state = 'running';
    expect(g.audibilityHint('media', { playing: true, now: 1000000 + 5100 })).toBeNull();  // 重记
  });

  it('D5 状态机：level 0（Layer2 自静音）不提示 + 非法键回落 media', () => {
    const ctx = fakeCtx({ analyserFill: 0 });
    const g = createAudioGraph({ thresholdMs: 2000 });
    g.attach(ctx);
    g.registerNode('media', ctx.createGain());
    g.setLevel('media', 0);
    expect(g.audibilityHint('media', { playing: true, now: 1000000 })).toBeNull();
    g.setLevel('media', 60);
    expect(g.audibilityHint('bogus-key', { playing: true, now: 1000000 })).toBeNull();   // 回落 media 首帧
  });
});

describe('v117-E · 持久化适配器（settings:sound-v1 同键 + sfx 浮点键）', () => {
  it('E1 五通道同键往返 + 未知键保留（settings.js Object.assign 同律）', () => {
    const st = fakeStorage({ [SOUND_STORE_KEY]: JSON.stringify({ call: 80, preventRinging: true, dtmf: true }) });
    const ad = createSoundStoreAdapter(st);
    expect(ad.load('call')).toBe(80);
    ad.save('ring', 25);
    const obj = JSON.parse(st.kv[SOUND_STORE_KEY]);
    expect(obj.ring).toBe(25);
    expect(obj.call).toBe(80);                        // 既有键保留
    expect(obj.preventRinging).toBe(true);            // 非流键保留
    ad.save('media', 45);                             // 新键（v10.77 起媒体持久化）
    expect(JSON.parse(st.kv[SOUND_STORE_KEY]).media).toBe(45);
  });

  it('E2 值域防御：save 钳位/load 钳位/损坏 JSON/非法键', () => {
    const st = fakeStorage({ [SOUND_STORE_KEY]: '{bad' });
    const ad = createSoundStoreAdapter(st);
    expect(ad.load('ring')).toBeNull();               // 损坏 → null（调用方落 DEFAULT）
    ad.save('ring', 250);                             // 钳 100
    expect(JSON.parse(st.kv[SOUND_STORE_KEY]).ring).toBe(100);
    expect(ad.load('nope')).toBeNull();
    ad.save('nope', 50);                              // 非法键拒写
    expect(JSON.parse(st.kv[SOUND_STORE_KEY]).ring).toBe(100);
  });

  it('E3 sfx 浮点键换算：0.5↔50 同源（sound-haptics SFX_VOLUME_KEY 既有真源）', () => {
    const st = fakeStorage({ [SFX_VOLUME_KEY]: '0.5' });
    const ad = createSoundStoreAdapter(st);
    expect(ad.load('sfx')).toBe(50);
    ad.save('sfx', 75);
    expect(st.kv[SFX_VOLUME_KEY]).toBe('0.75');
    expect(ad.load('sfx')).toBe(75);
    const empty = createSoundStoreAdapter(fakeStorage());
    expect(empty.load('sfx')).toBeNull();             // 未落库 → null（DEFAULT.sfx=50 承接）
  });
});

describe('v117-F · 首启引导存取 + 接线锚（源码指纹）', () => {
  it('F1 onboarding 存取：一次性 dismissed 持久化；读取失败视为已读（不骚扰）', () => {
    const st = fakeStorage();
    expect(resolveOnboardingDismissed(st)).toBe(false);
    dismissOnboarding(st);
    expect(st.kv[ONBOARDING_KEY]).toBe('1');
    expect(resolveOnboardingDismissed(st)).toBe(true);
    expect(resolveOnboardingDismissed(null)).toBe(true);        // 无 storage → 已读
    expect(resolveOnboardingDismissed({ getItem: () => { throw new Error('x'); } })).toBe(true);
  });

  it('F2 media-service 接线：attach + registerNode 采纳 + setLevel skipNode 记账 + 构造恢复 + 首播引导', () => {
    expect(MS).toContain("import { getAudioGraph } from './audio-graph-instance.js';");
    expect(MS).toContain('getAudioGraph().attach(ctx);');
    expect(MS).toContain("getAudioGraph().registerNode('media', chain.gain);");
    expect(MS).toContain("getAudioGraph().setLevel('media', Math.round(v * 100), { skipNode: true })");
    expect(MS).toContain("this.volume = levelToGain(getAudioGraph().getLevel('media'));");  // 持久化恢复
    expect(MS).toContain('_maybeAnnounceDualLayerOnce');          // 首播一次性引导
    expect(MS).toContain('应用音量独立于系统音量');
  });

  it('F3 volume-dialog 接线：非媒体流统一走总线 + show 恢复走总线 + 静音提示轮询 + 面板文案', () => {
    expect(VD).toContain("import { getAudioGraph } from './audio-graph-instance.js';");
    expect(VD).toContain('getAudioGraph().setLevel(targetToStream(activeTarget), next);');   // applyStreamVolume 总线落账
    expect(VD).toContain('const readRingVolume = () => getAudioGraph().getLevel(\'ring\');'); // ring 真源经图（同键同值）
    expect(VD).toContain('getAudioGraph().getLevel(targetToStream(activeTarget));');         // show 流值恢复
    expect(VD).toContain("audibilityHint('media'");               // 静音提示判定消费
    expect(VD).toContain('若仍无声音，请检查系统音量');             // 条件式措辞（建议处理①）
    expect(VD).toContain('startHintPolling');                     // 面板开合联动
    expect(VD).toContain("captionEl.textContent = '应用音量';");   // 面板文案（建议处理③）
  });

  it('F4 sound-haptics 接线：sfx 合成/采样双通道总线出口 + setSfxVolume 记账同步', () => {
    expect(SH).toContain("import { getAudioGraph } from './audio-graph-instance.js';");
    expect(SH.match(/sfxBus\(ctx\) \|\| ctx\.destination/g).length).toBe(2);   // tone + buffer 双通道
    expect(SH).toContain("getAudioGraph().setLevel('sfx', Math.round(sfxVolume * 100), { skipNode: true })");
  });

  it('F5 instance 枢纽：双事件出口（audio-graph-level-changed + settings-sound-changed 五通道协议）', () => {
    expect(AGI).toContain("dispatchEvent(new CustomEvent('audio-graph-level-changed'");
    expect(AGI).toContain("dispatchEvent(new CustomEvent('settings-sound-changed'");
    expect(AGI).toContain('thresholdMs: 2000');                   // 面板 3s 存活期对齐
  });

  it('F6 面板 DOM/CSS：.vd-layer-caption「应用音量」标注（建议处理③ 载体）', () => {
    expect(HTML).toContain('vd-layer-caption');
    expect(HTML).toContain('应用音量');
    expect(HTML).toContain('两层同时生效');
    expect(CSS).toContain('.vd-layer-caption');
    expect(CSS).toContain('.volume-dialog.visible .vd-layer-caption');
  });

  it('F7 纯逻辑纪律：audio-graph.js 零 window/document/localStorage 直引用', () => {
    expect(AG).not.toMatch(/\bwindow\./);
    expect(AG).not.toMatch(/\bdocument\./);
    expect(AG).not.toMatch(/\blocalStorage\b/);
    expect(AG).not.toContain('import.meta');
  });
});

describe('v117-G · happy-dom 真跑（生产适配器 + 单例语义）', () => {
  it('G1 生产 storage 真跑：settings:sound-v1 往返 + onboarding 键', async () => {
    const { createSoundStoreAdapter: adapter } = await import('../ios-desktop/js/aosp/audio-graph.js');
    const ad = adapter(localStorage);
    ad.save('notification', 33);
    expect(ad.load('notification')).toBe(33);
    localStorage.setItem('audio-graph:onboarding-dismissed', '1');
    const { resolveOnboardingDismissed: dismissed } = await import('../ios-desktop/js/aosp/audio-graph.js');
    expect(dismissed(localStorage)).toBe(true);
  });
});
