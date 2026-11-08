// ==================== v116-media-gain.test.js — #116 媒体 GainNode 音量链 v10.83 ====================
//
// 覆盖（R85 窗主作业，iOS audio.volume 只读恒 1 的 P0 地基）：
//   · aosp/media-gain.js 纯逻辑：isSameOriginMediaSource 门控矩阵（blob:/data:/about:/
//     同源/相对/跨域/协议相对/空值）、resolveGainVolume 钳位、createGainChain 建链
//     （source→gain→destination 接线序 + 初值 1 + 二次接管 InvalidStateError 回落 null）、
//     resumeIfSuspended、nextPlayableIndex 环绕跳过（双向/整池无合格 -1）
//   · mediaService 接线：当前曲 blob 即接管（元素中性化恒 1 防双层衰减 + 增益对齐）、
//     setVolume 双写分流（未接管直写 / 接管后真值走 gain）、当前曲外链不接管、
//     接管态切曲外链跳过（next/prev 方向语义 + 全池不可播停止）、R2 污染守卫
//   · sound-haptics 共享 AudioContext 出口锚（#117 收编方向第一步）
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isSameOriginMediaSource,
  resolveGainVolume,
  createGainChain,
  resumeIfSuspended,
  nextPlayableIndex,
} from '../ios-desktop/js/aosp/media-gain.js';
import { mediaService } from '../ios-desktop/js/media-service.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const MG = readFileSync(R('js/aosp/media-gain.js'), 'utf8');
const MS = readFileSync(R('js/media-service.js'), 'utf8');
const SH = readFileSync(R('js/sound-haptics.js'), 'utf8');

const ORIGIN = 'https://md3.example';

describe('v116-A · isSameOriginMediaSource 同源门控矩阵（R2 真源）', () => {
  it('A1 可信源：blob:/data:/about: 恒真（与 origin 参照无关）', () => {
    expect(isSameOriginMediaSource('blob:https://md3.example/8f2a', ORIGIN)).toBe(true);
    expect(isSameOriginMediaSource('blob:https://other.example/x', ORIGIN)).toBe(true); // blob 同源派生
    expect(isSameOriginMediaSource('data:audio/mpeg;base64,AAAA', ORIGIN)).toBe(true);
    expect(isSameOriginMediaSource('about:blank', ORIGIN)).toBe(true);
  });

  it('A2 同源 http(s)（绝对与相对路径）真；跨域假', () => {
    expect(isSameOriginMediaSource('https://md3.example/assets/a.mp3', ORIGIN)).toBe(true);
    expect(isSameOriginMediaSource('/assets/a.mp3', ORIGIN)).toBe(true);       // 相对路径
    expect(isSameOriginMediaSource('assets/a.mp3', ORIGIN)).toBe(true);        // 相对路径
    expect(isSameOriginMediaSource('https://evil.example/a.mp3', ORIGIN)).toBe(false);
    expect(isSameOriginMediaSource('https://md3.example.evil/a.mp3', ORIGIN)).toBe(false); // 后缀伪装
  });

  it('A3 保守拒绝面：协议相对/空值/非字符串/解析失败', () => {
    expect(isSameOriginMediaSource('//cdn.example/a.mp3', ORIGIN)).toBe(false);
    expect(isSameOriginMediaSource('', ORIGIN)).toBe(false);
    expect(isSameOriginMediaSource(null, ORIGIN)).toBe(false);
    expect(isSameOriginMediaSource(undefined, ORIGIN)).toBe(false);
    expect(isSameOriginMediaSource(123, ORIGIN)).toBe(false);
  });

  it('A4 无 origin 参照（file: opaque）时仅 blob:/data:/about: 可信', () => {
    expect(isSameOriginMediaSource('blob:x', '')).toBe(true);
    expect(isSameOriginMediaSource('data:x', '')).toBe(true);
    expect(isSameOriginMediaSource('/relative/path', '')).toBe(false);
    expect(isSameOriginMediaSource('https://md3.example/a.mp3', '')).toBe(false);
  });

  it('A5 opaque origin（URL.origin === "null"）拒绝', () => {
    // data: 与 file: 派生的 URL 解析 origin 为 null → 不可作为 http 参照
    expect(isSameOriginMediaSource('https://md3.example/a', 'null')).toBe(false);
  });
});

describe('v116-B · resolveGainVolume 钳位', () => {
  it('B1 值域 0~1：超界钳位 / NaN·Infinity→0（失效即静音绝不放大）', () => {
    expect(resolveGainVolume(0)).toBe(0);
    expect(resolveGainVolume(1)).toBe(1);
    expect(resolveGainVolume(0.6)).toBe(0.6);
    expect(resolveGainVolume(-0.5)).toBe(0);
    expect(resolveGainVolume(1.7)).toBe(1);
    expect(resolveGainVolume(NaN)).toBe(0);
    expect(resolveGainVolume(Infinity)).toBe(0);
    expect(resolveGainVolume('0.4')).toBe(0.4); // Number() 宽转
  });
});

describe('v116-C · createGainChain 建链（R1 一次性）', () => {
  /** 最小 AudioContext 桩：接线序记录 + 可选二次接管抛错 */
  function fakeCtx({ throwsOnSecond = true } = {}) {
    let sourceCount = 0;
    const log = [];
    const makeNode = (name) => ({ __name: name, connect(dst) { log.push([name, dst.__name]); return dst; } });
    return {
      destination: makeNode('destination'),
      log,
      createMediaElementSource: vi.fn((el) => {
        sourceCount += 1;
        if (throwsOnSecond && sourceCount > 1) throw new Error('InvalidStateError: source already connected');
        return makeNode('source');
      }),
      createGain: vi.fn(() => ({ gain: { value: 0.42 }, ...makeNode('gain') })),
    };
  }

  it('C1 建链接线序：source→gain→destination，增益初值 1（非构造器内部遗留值）', () => {
    const ctx = fakeCtx();
    const el = { __name: 'el' };
    const chain = createGainChain(ctx, el);
    expect(chain).not.toBeNull();
    expect(ctx.createMediaElementSource).toHaveBeenCalledWith(el);
    expect(chain.gain.gain.value).toBe(1);
    expect(ctx.log).toContainEqual(['source', 'gain']);
    expect(ctx.log).toContainEqual(['gain', 'destination']);
  });

  it('C2 二次接管 InvalidStateError → null（调用方回落直连，绝不抛穿）', () => {
    const ctx = fakeCtx();
    const el = { __name: 'el' };
    expect(createGainChain(ctx, el)).not.toBeNull();
    expect(createGainChain(ctx, el)).toBeNull();
  });

  it('C3 API 缺失/空参 → null', () => {
    expect(createGainChain(null, {})).toBeNull();
    expect(createGainChain({}, {})).toBeNull();
    expect(createGainChain({ createGain: () => ({}) }, null)).toBeNull();
  });
});

describe('v116-D · resumeIfSuspended（R3）', () => {
  it('D1 suspended → resume 调用且 promise rejection 吞掉', async () => {
    const resume = vi.fn(() => Promise.reject(new Error('denied')));
    const ctx = { state: 'suspended', resume };
    expect(() => resumeIfSuspended(ctx)).not.toThrow();
    expect(resume).toHaveBeenCalledTimes(1);
    await Promise.resolve(); // rejection 被内部 catch 吞掉，无 unhandled
  });

  it('D2 running/无 resume/空参 → 零调用零抛错', () => {
    expect(() => resumeIfSuspended({ state: 'running' })).not.toThrow();
    expect(() => resumeIfSuspended({ state: 'suspended' })).not.toThrow();
    expect(() => resumeIfSuspended(null)).not.toThrow();
  });
});

describe('v116-E · nextPlayableIndex 接管态切曲跳过', () => {
  const eligible = (t) => t && t.eligible;
  const pool = [
    { src: 'x', eligible: false },   // 0 外链
    { src: 'x', eligible: true },    // 1 本地
    { src: 'x', eligible: false },   // 2 外链
    { src: 'x', eligible: false },   // 3 外链
    { src: 'x', eligible: true },    // 4 本地
  ];

  it('E1 顺序方向：0→1（最近合格）', () => {
    expect(nextPlayableIndex(pool, 0, 1, eligible)).toBe(1);
  });

  it('E2 逆序方向：2→1（跳过 0 不合格，1 合格）', () => {
    expect(nextPlayableIndex(pool, 2, -1, eligible)).toBe(1);
  });

  it('E3 环绕：4→1（3·2·1 中 1 最近合格，模长回绕）', () => {
    expect(nextPlayableIndex(pool, 4, 1, eligible)).toBe(1);
  });

  it('E4 全池无合格 → -1（调用方停止语义）', () => {
    const allOut = [{ src: 'x', eligible: false }, { src: 'x', eligible: false }];
    expect(nextPlayableIndex(allOut, 0, 1, eligible)).toBe(-1);
  });

  it('E5 防御：空池/非函数判定器 → -1', () => {
    expect(nextPlayableIndex([], 0, 1, eligible)).toBe(-1);
    expect(nextPlayableIndex(pool, 0, 1, null)).toBe(-1);
  });
});

describe('v116-F · mediaService 接线（单例真跑，测试注入口）', () => {
  const savedPlaylist = mediaService.playlist;
  const savedIndex = mediaService.currentIndex;
  const savedHooks = mediaService.__gainHooks;

  afterEach(() => {
    mediaService.playlist = savedPlaylist;
    mediaService.currentIndex = savedIndex;
    mediaService.__gainHooks = savedHooks;
    mediaService.gainChain = null;
    mediaService.gainSessionBlocked = false;
    mediaService.gainNormalize = 'idle';
    if (mediaService.audio) { try { mediaService.audio.pause(); } catch (e) {} }
    mediaService.audio = null;
    mediaService.isPlaying = false;
  });

  /** 本地 blob 单曲池 */
  const localPool = () => [
    { id: 'loc-1', title: '本地一', artist: 't', album: 'a', src: 'blob:https://localhost/1', isLocal: true },
    { id: 'loc-2', title: '本地二', artist: 't', album: 'a', src: 'blob:https://localhost/2', isLocal: true },
  ];

  it('F1 当前曲 blob → play() 即接管：元素中性化恒 1，增益对齐当前音量（防双层衰减）', () => {
    mediaService.playlist = localPool();
    mediaService.currentIndex = 0;
    mediaService.volume = 0.6;
    let gainNode = null;
    mediaService.__gainHooks.ctxFactory = () => ({
      destination: { __name: 'destination' },
      createMediaElementSource: vi.fn((el) => ({ connect: (g) => g })),
      createGain: vi.fn(() => { gainNode = { gain: { value: 0.42 }, connect: (d) => d }; return gainNode; }),
      state: 'running',
    });
    mediaService.play();
    expect(mediaService.gainChain).not.toBeNull();
    expect(mediaService.audio.volume).toBe(1);        // 元素中性化（0.6×0.6 双层衰减防御）
    expect(gainNode.gain.value).toBe(0.6);            // 增益对齐音量真值
    const st = mediaService.__gainState();
    expect(st.attached).toBe(true);
    expect(st.elementVolume).toBe(1);
    expect(st.gainValue).toBe(0.6);
    expect(st.currentEligible).toBe(true);
  });

  it('F2 接管后 setVolume：真值走 GainNode，元素恒 1（双写分流）', () => {
    mediaService.playlist = localPool();
    mediaService.__gainHooks.ctxFactory = () => ({
      destination: {},
      createMediaElementSource: vi.fn(() => ({ connect: (g) => g })),
      createGain: vi.fn(() => ({ gain: { value: 1 }, connect: (d) => d })),
      state: 'running',
    });
    mediaService.play();
    mediaService.setVolume(0.25);
    expect(mediaService.volume).toBe(0.25);
    expect(mediaService.audio.volume).toBe(1);                    // 仍中性
    expect(mediaService.gainChain.gain.gain.value).toBe(0.25);    // 真值在增益
    expect(mediaService.__gainState().gainValue).toBe(0.25);
  });

  it('F3 未接管（无 WebAudio）setVolume：audio.volume 直写路径零变化（桌面兼容面）', () => {
    mediaService.playlist = localPool();
    mediaService.__gainHooks.ctxFactory = () => null;             // 无 AudioContext 环境
    mediaService.play();
    expect(mediaService.gainSessionBlocked).toBe(true);           // 本会话永久直连
    mediaService.setVolume(0.3);
    expect(mediaService.audio.volume).toBe(0.3);                  // 既有直写行为
    expect(mediaService.gainChain).toBeNull();
  });

  it('F4 当前曲外链 → 不接管直连（桌面外链零回归；未接管前不发起归一化）', () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error('offline')));
    mediaService.__gainHooks.fetchImpl = fetchImpl;
    mediaService.play();                                          // 默认池 = pixabay 外链
    expect(mediaService.gainChain).toBeNull();
    expect(mediaService.gainSessionBlocked).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();                      // 外链会话直连，零归一化开销
    expect(mediaService.__gainState().currentEligible).toBe(false);
  });

  it('F4b 当前曲 blob + 池含外链 → 接管并机会性发起归一化（外链恢复可播前提工程）', () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error('offline')));
    mediaService.__gainHooks.fetchImpl = fetchImpl;
    mediaService.playlist = [
      { id: 'loc-0', title: '本地零', src: 'blob:https://localhost/0', isLocal: true },
      { id: 'ext-1', title: '外链一', src: 'https://cdn.example/1.mp3', isLocal: false },
    ];
    mediaService.__gainHooks.ctxFactory = () => ({
      destination: {},
      createMediaElementSource: vi.fn(() => ({ connect: (g) => g })),
      createGain: vi.fn(() => ({ gain: { value: 1 }, connect: (d) => d })),
      state: 'running',
    });
    mediaService.play();
    expect(mediaService.gainChain).not.toBeNull();                 // 当前曲合格即接管（P0 不等全池）
    expect(fetchImpl).toHaveBeenCalledWith('https://cdn.example/1.mp3', { mode: 'cors' });
    expect(mediaService.gainNormalize).toBe('running');
  });

  it('F5 接管态切曲：外链曲目按方向跳过（next 顺序 / prev 逆序）', () => {
    mediaService.playlist = [
      { id: 'loc-0', title: '本地零', src: 'blob:https://localhost/0', isLocal: true },
      { id: 'ext-1', title: '外链一', src: 'https://cdn.example/1.mp3', isLocal: false },
      { id: 'ext-2', title: '外链二', src: 'https://cdn.example/2.mp3', isLocal: false },
      { id: 'loc-3', title: '本地三', src: 'blob:https://localhost/3', isLocal: true },
    ];
    mediaService.__gainHooks.ctxFactory = () => ({
      destination: {},
      createMediaElementSource: vi.fn(() => ({ connect: (g) => g })),
      createGain: vi.fn(() => ({ gain: { value: 1 }, connect: (d) => d })),
      state: 'running',
    });
    mediaService.play();                                          // 本地零 → 接管
    expect(mediaService.gainChain).not.toBeNull();
    mediaService.next();                                          // 1·2 外链 → 跳至 3
    expect(mediaService.currentIndex).toBe(3);
    mediaService.prev();                                          // 2·1 外链 → 跳回 0（逆序环绕）
    expect(mediaService.currentIndex).toBe(0);
  });

  it('F6 接管态全池不可播 → 停止语义（暂停，不切曲不抛错）', () => {
    mediaService.playlist = [
      { id: 'loc-0', title: '本地零', src: 'blob:https://localhost/0', isLocal: true },
      { id: 'ext-1', title: '外链一', src: 'https://cdn.example/1.mp3', isLocal: false },
    ];
    mediaService.__gainHooks.ctxFactory = () => ({
      destination: {},
      createMediaElementSource: vi.fn(() => ({ connect: (g) => g })),
      createGain: vi.fn(() => ({ gain: { value: 1 }, connect: (d) => d })),
      state: 'running',
    });
    mediaService.play();
    mediaService.currentIndex = 0;
    mediaService.playlist = [
      { id: 'ext-1', title: '外链一', src: 'https://cdn.example/1.mp3', isLocal: false },
    ];
    mediaService.currentIndex = 0;
    // 接管态下整池只剩外链 → next 触发停止（audio 保留在场以断言 pause 路径）
    expect(() => mediaService.next()).not.toThrow();
    expect(mediaService.currentIndex).toBe(0);                    // 未切曲
  });

  it('F7 R2 污染守卫：接管态 applyTrackSrc 拒装跨域源（src 保持不变）', () => {
    mediaService.playlist = localPool();
    mediaService.__gainHooks.ctxFactory = () => ({
      destination: {},
      createMediaElementSource: vi.fn(() => ({ connect: (g) => g })),
      createGain: vi.fn(() => ({ gain: { value: 1 }, connect: (d) => d })),
      state: 'running',
    });
    mediaService.play();
    const before = mediaService.audio.src;
    mediaService.applyTrackSrc({ id: 'ext', title: 'x', src: 'https://cdn.example/9.mp3' });
    expect(mediaService.audio.src).toBe(before);                  // 拒绝装载
  });

  it('F8 归一化成功面：外链 fetch→blob 就地替换 src（R2 前提工程）', async () => {
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: vi.fn(() => 'blob:https://localhost/norm') }));
    try {
      mediaService.playlist = [
        { id: 'ext-1', title: '外链', src: 'https://cdn.example/a.mp3', isLocal: false },
      ];
      mediaService.__gainHooks.fetchImpl = vi.fn(() => Promise.resolve({
        ok: true,
        blob: () => Promise.resolve({ size: 1024 }),
      }));
      mediaService._normalizeExternalTracks();
      await new Promise((r) => setTimeout(r, 20));
      expect(mediaService.playlist[0].src).toBe('blob:https://localhost/norm');
      expect(mediaService.gainNormalize).toBe('done');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('F9 归一化失败面：离线 fetch 拒绝 → src 保持外链、状态 done、零抛错', async () => {
    mediaService.playlist = [
      { id: 'ext-1', title: '外链', src: 'https://cdn.example/a.mp3', isLocal: false },
    ];
    mediaService.__gainHooks.fetchImpl = vi.fn(() => Promise.reject(new Error('offline')));
    expect(() => mediaService._normalizeExternalTracks()).not.toThrow();
    await new Promise((r) => setTimeout(r, 20));
    expect(mediaService.playlist[0].src).toBe('https://cdn.example/a.mp3');
    expect(mediaService.gainNormalize).toBe('done');
  });
});

describe('v116-G · 源码锚（防回退 + 纪律）', () => {
  it('G1 media-service 接管链四锚：同源门控/元素中性化/真值增益/污染守卫', () => {
    expect(MS).toContain('isSameOriginMediaSource(track.src, origin)');
    expect(MS).toContain('this.audio.volume = this.gainChain ? 1 : v');
    expect(MS).toContain('resolveGainVolume(this.volume)');
    expect(MS).toContain('R2 taint guard');
  });

  it('G2 sound-haptics 共享 AudioContext 出口（#117 收编方向第一步）', () => {
    expect(SH).toContain('export function getSharedAudioContext()');
    expect(MS).toContain("from './sound-haptics.js'");
  });

  it('G3 纯逻辑纪律：media-gain.js 零 window/零 document/零 Audio 硬依赖（注入同构）', () => {
    expect(MG).not.toMatch(/\bwindow\./);
    expect(MG).not.toMatch(/\bdocument\./);
    expect(MG).not.toMatch(/new Audio\(/);
  });
});
