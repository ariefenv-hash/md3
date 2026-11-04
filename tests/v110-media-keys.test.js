// ==================== v110-media-keys.test.js — #110 媒体键 MediaSession 键盘映射 v9.86 ====================
//
// 覆盖（R84 窗主作业）：
//   · aosp/media-keys.js 纯逻辑真跑：android.view.KeyEvent 媒体键 KEYCODE 实值
//     （STOP 86 / NEXT 87 / PREVIOUS 88 / REWIND 89 / FAST_FORWARD 90 / PLAY_PAUSE 126）/
//     UI Events key Values 媒体键段八键全映射 / 未知键值 null 放行
//   · getPriorityList 三级仲裁（MediaSessionStack.java L374-411 逐行同构）：
//     播放中段首游标插入 + 同段保序（LRU 新者先契约）+ 活跃未播放次段 +
//     不活跃段尾（仅 !activeOnly）+ 空表
//   · resolveMediaButtonSession：优先级表首项 / 无受控会话 → null（AOSP 无目标静默）
//   · streamsToSessions 适配：host-radio 常驻系统会话（isActive 恒 true）/
//     external-music 覆盖层门（externalActive）/ LRU lastActiveTs 降序稳定排布
//   · routeMediaAction：null 静默 / external-music MEDIA_COMMAND 命令字 /
//     host-radio 原生控制字（stop/fast_forward/rewind 语义在录）
//   · mediaService.dispatchMediaKey 真跑：**真行为缺口修复矩阵**——「暂停但有曲目」
//     的覆盖层不再抢占「正在播放」的宿主电台（旧 externalActive() 路由违背 AOSP
//     PlaybackState 活跃优先）+ external 播放中仲裁 + 停止/快进/快退语义 + 静默路径
//   · 接线锚：volume-dialog.js keydown 媒体键前置分支（preventDefault + repeat
//     守卫 + 不入 chord 流）/ media-service.js 仲裁消费 / key-dispatcher.js 零触碰
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KEYCODE_MEDIA_STOP, KEYCODE_MEDIA_NEXT, KEYCODE_MEDIA_PREVIOUS,
  KEYCODE_MEDIA_REWIND, KEYCODE_MEDIA_FAST_FORWARD, KEYCODE_MEDIA_PLAY_PAUSE,
  WEB_MEDIA_KEYS, keyToMediaAction,
  getPriorityList, resolveMediaButtonSession, streamsToSessions, routeMediaAction,
} from '../ios-desktop/js/aosp/media-keys.js';
import { mediaService } from '../ios-desktop/js/media-service.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const MK = readFileSync(R('js/aosp/media-keys.js'), 'utf8');
const MS = readFileSync(R('js/media-service.js'), 'utf8');
const VD = readFileSync(R('js/volume-dialog.js'), 'utf8');
const KD = readFileSync(R('js/aosp/key-dispatcher.js'), 'utf8');

describe('#110 AOSP 常量与键值映射', () => {
  it('android.view.KeyEvent 媒体键 KEYCODE 实值', () => {
    expect(KEYCODE_MEDIA_STOP).toBe(86);
    expect(KEYCODE_MEDIA_NEXT).toBe(87);
    expect(KEYCODE_MEDIA_PREVIOUS).toBe(88);
    expect(KEYCODE_MEDIA_REWIND).toBe(89);
    expect(KEYCODE_MEDIA_FAST_FORWARD).toBe(90);
    expect(KEYCODE_MEDIA_PLAY_PAUSE).toBe(126);
  });

  it('UI Events key Values 媒体键段八键全映射（MediaPlay/Pause 锚同一 PLAY_PAUSE）', () => {
    expect(Object.keys(WEB_MEDIA_KEYS).sort()).toEqual(
      ['MediaFastForward', 'MediaPause', 'MediaPlay', 'MediaPlayPause', 'MediaRewind', 'MediaStop', 'MediaTrackNext', 'MediaTrackPrevious'].sort()
    );
    expect(WEB_MEDIA_KEYS.MediaPlayPause).toEqual({ keycode: 126, action: 'play_pause' });
    expect(WEB_MEDIA_KEYS.MediaPlay).toEqual({ keycode: 126, action: 'play' });
    expect(WEB_MEDIA_KEYS.MediaPause).toEqual({ keycode: 126, action: 'pause' });
    expect(WEB_MEDIA_KEYS.MediaTrackNext).toEqual({ keycode: 87, action: 'next' });
    expect(WEB_MEDIA_KEYS.MediaTrackPrevious).toEqual({ keycode: 88, action: 'prev' });
    expect(WEB_MEDIA_KEYS.MediaStop).toEqual({ keycode: 86, action: 'stop' });
    expect(WEB_MEDIA_KEYS.MediaFastForward).toEqual({ keycode: 90, action: 'fast_forward' });
    expect(WEB_MEDIA_KEYS.MediaRewind).toEqual({ keycode: 89, action: 'rewind' });
  });

  it('keyToMediaAction：命中返回新对象（防共享可变） / 未知键值 null 放行主链', () => {
    const a = keyToMediaAction('MediaPlayPause');
    expect(a).toEqual({ keycode: 126, action: 'play_pause' });
    expect(a).not.toBe(WEB_MEDIA_KEYS.MediaPlayPause);
    expect(keyToMediaAction('MediaEject')).toBeNull();
    expect(keyToMediaAction('AudioVolumeUp')).toBeNull();
    expect(keyToMediaAction('')).toBeNull();
    expect(keyToMediaAction(undefined)).toBeNull();
  });
});

describe('#110 getPriorityList 三级仲裁（MediaSessionStack L374-411 同构）', () => {
  const s = (id, isActive, isPlaying, lastActiveTs = 0) => ({ id, isActive, isPlaying, lastActiveTs });

  it('播放中段首插入 + 同段保序（迭代序 = LRU 新者先）', () => {
    // 迭代 A(playing) → B(not) → C(playing)：段① [A,C]（相对序保持），段② [B]
    const list = getPriorityList([s('A', true, true), s('B', true, false), s('C', true, true)]);
    expect(list.map((x) => x.id)).toEqual(['A', 'C', 'B']);
  });

  it('活跃未播放次段 + 不活跃仅 !activeOnly 收录段尾', () => {
    const input = [s('old', false, false), s('idle', true, false), s('live', true, true)];
    expect(getPriorityList(input).map((x) => x.id)).toEqual(['live', 'idle']);           // activeOnly 默认
    expect(getPriorityList(input, { activeOnly: false }).map((x) => x.id)).toEqual(['live', 'idle', 'old']);
  });

  it('全不活跃 + activeOnly → 空表（无受控会话）', () => {
    expect(getPriorityList([s('x', false, false)])).toEqual([]);
  });

  it('resolveMediaButtonSession：表首项 / 空表 null（AOSP 无目标静默语义）', () => {
    expect(resolveMediaButtonSession([s('a', true, false), s('b', true, true)]).id).toBe('b');
    expect(resolveMediaButtonSession([])).toBeNull();
    expect(resolveMediaButtonSession([s('x', false, false)])).toBeNull();
    expect(resolveMediaButtonSession(null)).toBeNull();
  });
});

describe('#110 streamsToSessions md3 流适配', () => {
  const streams = [
    { streamId: 'host-radio', lastActiveTs: 1000 },
    { streamId: 'external-music', lastActiveTs: 0 },
  ];

  it('host-radio 常驻系统会话：isActive 恒 true（媒体键永远有受控兜底目标）', () => {
    const out = streamsToSessions(streams, { externalActive: false, externalPlaying: false, hostPlaying: false });
    const host = out.find((x) => x.id === 'host-radio');
    expect(host.isActive).toBe(true);
    expect(host.isPlaying).toBe(false);
    expect(host.lastActiveTs).toBe(1000);
  });

  it('external-music 覆盖层门：externalActive/isPlaying 直传', () => {
    const out = streamsToSessions(streams, { externalActive: true, externalPlaying: true, hostPlaying: false, externalTs: 5000 });
    const ex = out.find((x) => x.id === 'external-music');
    expect(ex.isActive).toBe(true);
    expect(ex.isPlaying).toBe(true);
    expect(ex.lastActiveTs).toBe(5000);
    const off = streamsToSessions(streams, { externalActive: false, externalPlaying: true, hostPlaying: false, externalTs: 5000 });
    expect(off.find((x) => x.id === 'external-music').isActive).toBe(false);
  });

  it('LRU lastActiveTs 降序稳定排布（同 ts 保注册序）', () => {
    const out = streamsToSessions(streams, { externalActive: true, externalPlaying: false, hostPlaying: false, externalTs: 9000 });
    expect(out.map((x) => x.id)).toEqual(['external-music', 'host-radio']); // 外部活跃心跳更新 → 新者先
    const tie = streamsToSessions(streams, { externalActive: false, externalPlaying: false, hostPlaying: false, externalTs: 0 });
    expect(tie.map((x) => x.id)).toEqual(['host-radio', 'external-music']); // 同 ts(0) → 注册序
  });
});

describe('#110 routeMediaAction 单目标路由', () => {
  it('无受控会话 → target null（静默零副作用）', () => {
    expect(routeMediaAction('play_pause', null)).toEqual({ target: null, cmd: null });
  });

  it('external-music → MEDIA_COMMAND 命令字（iframe 自过滤）', () => {
    expect(routeMediaAction('play_pause', 'external-music')).toEqual({ target: 'external-music', cmd: 'toggle' });
    expect(routeMediaAction('next', 'external-music').cmd).toBe('next');
    expect(routeMediaAction('stop', 'external-music').cmd).toBe('stop');
  });

  it('host-radio → 原生控制字（stop/fast_forward/rewind 语义在录）', () => {
    expect(routeMediaAction('play_pause', 'host-radio')).toEqual({ target: 'host-radio', cmd: 'togglePlay' });
    expect(routeMediaAction('stop', 'host-radio').cmd).toBe('stop');
    expect(routeMediaAction('fast_forward', 'host-radio').cmd).toBe('fast_forward');
    expect(routeMediaAction('rewind', 'host-radio').cmd).toBe('rewind');
  });
});

describe('#110 mediaService.dispatchMediaKey 真跑（含缺口修复矩阵）', () => {
  /** 伪 audio 元素（node 无 HTMLAudioElement；只驱动 dispatchMediaKey 控制面） */
  const fakeAudio = (paused = true) => ({
    paused, src: '', currentTime: 0, duration: 120, volume: 1, playbackRate: 1, preload: '',
    play: vi.fn(async () => {}), pause: vi.fn(),
    addEventListener() {}, removeEventListener() {},
  });

  it('缺口修复：宿主播放中 + 覆盖层暂停但有曲目 → 仲裁宿主（AOSP 播放中优先，旧路由反例）', () => {
    mediaService.audio = fakeAudio(false);           // 宿主播放中
    mediaService.isPlaying = true;                   // 会话上报态（checkPlaybackActiveState 语义）
    mediaService.external = { title: '曲', artist: 'x', isPlaying: false, currentTime: 0, duration: 0, ts: 2000 };
    const r = mediaService.dispatchMediaKey('play_pause');
    expect(r.target).toBe('host-radio');              // 旧 externalActive() 路由会给 external（缺口）
    expect(r.cmd).toBe('togglePlay');
    expect(mediaService.audio.pause).toHaveBeenCalled(); // 宿主被真实暂停
    mediaService.isPlaying = false;
    mediaService.external = null;
    mediaService.audio = null;
  });

  it('覆盖层播放中 → 仲裁 external（MEDIA_COMMAND 转发）', () => {
    const spy = vi.spyOn(mediaService, 'dispatchMediaCommand').mockImplementation(() => {});
    mediaService.external = { title: '曲', artist: 'x', isPlaying: true, currentTime: 1, duration: 10, ts: 9000 };
    const r = mediaService.dispatchMediaKey('next');
    expect(r.target).toBe('external-music');
    expect(r.cmd).toBe('next');
    expect(spy).toHaveBeenCalledWith('next');
    spy.mockRestore();
    mediaService.external = null;
  });

  it('停止语义 = 暂停 + 归位（KEYCODE_MEDIA_STOP ≠ 纯 pause）', () => {
    const a = fakeAudio(false);
    a.currentTime = 42;
    mediaService.audio = a;
    mediaService.dispatchMediaKey('stop');
    expect(a.pause).toHaveBeenCalled();
    expect(a.currentTime).toBe(0);
    mediaService.audio = null;
  });

  it('快进/快退 ±10s 且钳制时长边界（navigator.mediaSession seekOffset 缺省同值）', () => {
    const a = fakeAudio(false);
    a.currentTime = 115;                              // duration 120 → +10 钳到 120
    mediaService.audio = a;
    mediaService.dispatchMediaKey('fast_forward');
    expect(a.currentTime).toBe(120);
    mediaService.dispatchMediaKey('rewind');
    expect(a.currentTime).toBe(110);
    a.currentTime = 3;
    mediaService.dispatchMediaKey('rewind');          // 3-10 钳到 0
    expect(a.currentTime).toBe(0);
    mediaService.audio = null;
  });

  it('流注册表清空 → 无受控会话 → 静默零副作用（AOSP 无目标语义）', () => {
    const host = mediaService.streams.get('host-radio');
    const ext = mediaService.streams.get('external-music');
    mediaService.streams.delete('host-radio');
    mediaService.streams.delete('external-music');
    const r = mediaService.dispatchMediaKey('play_pause');
    expect(r.target).toBeNull();
    expect(r.cmd).toBeNull();
    expect(r.resolved).toBeNull();
    mediaService.streams.set('host-radio', host);
    mediaService.streams.set('external-music', ext);
  });

  it('仲裁快照钩子 __mediaKeys（零 import 惯例）', () => {
    expect(typeof MS).toBe('string');
    expect(MS).toContain("window.__mediaKeys = {");
    expect(MS).toContain('resolve: () => {');
  });
});

describe('#110 接线锚', () => {
  it('volume-dialog.js keydown 媒体键前置分支：preventDefault + repeat 守卫 + 不入 chord 流', () => {
    expect(VD).toContain("import { keyToMediaAction } from './aosp/media-keys.js';");
    expect(VD).toContain('const mediaAct = keyToMediaAction(e.key);');
    expect(VD).toMatch(/if \(mediaAct\) \{\s*\n\s*e\.preventDefault\(\);/);
    expect(VD).toContain('mediaService.dispatchMediaKey(mediaAct.action);');
    // 一次性动作忽略 auto-repeat（play_pause/play/pause）；next/prev/快进快退保留
    expect(VD).toMatch(/e\.repeat && \(mediaAct\.action === 'play_pause' \|\| mediaAct\.action === 'play' \|\| mediaAct\.action === 'pause'\)/);
    expect(VD).toMatch(/if \(mediaAct\) \{[\s\S]*?return;/); // 已消费即 return：不进音量 UI、不喂 chord
  });

  it('media-service.js 仲裁消费三件套 import 在场', () => {
    expect(MS).toContain("from './aosp/media-keys.js'");
    expect(MS).toContain('streamsToSessions(this.streams.values(), snap)');
    expect(MS).toContain('resolveMediaButtonSession(sessions)');
    expect(MS).toContain('routeMediaAction(action, target ? target.id : null)');
  });

  it('key-dispatcher.js 零触碰（#111 chord 与 #110 单键即时动作正交划界）', () => {
    expect(KD).not.toMatch(/MediaPlayPause|dispatchMediaKey|media-keys/);
  });

  it('纯逻辑纪律：aosp/media-keys.js 零 DOM 零 window 零 setTimeout（剥注释锚法，R77 惯例）', () => {
    const MK_CODE = MK.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(MK_CODE).not.toMatch(/document\.|window\.|setTimeout|addEventListener/);
  });
});
