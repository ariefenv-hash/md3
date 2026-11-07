// ==================== v109-volume-target-stream.test.js — #109 音量键目标流判定 v10.45 ====================
//
// 覆盖（R85 窗加餐，AudioService.getActiveStreamType 对标）：
//   · aosp/volume-target-stream.js 纯逻辑：四档判定链（call>alarm>music(recent)>ring）、
//     3s 活跃窗口边界（#193 isActive 同口径）、图标分流（music 两态/ring/alarm/call +
//     per-stream mute）、步进钳位
//   · volume-dialog 接线：静默期 show() 重判目标流 → ring 图标 + ring 值显示；
//     音量键 ring 档写真源（settings:sound-v1 同键 + settings-sound-changed 事件）；
//     媒体活跃回 music 档既有守门链；resolveTarget 快照（流注册表心跳聚合）
//   · 源码锚（防回退）
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STREAM_ACTIVE_WINDOW_MS,
  resolveVolumeKeyTargetStream,
  targetStreamIconState,
  clampStreamVolume,
} from '../ios-desktop/js/aosp/volume-target-stream.js';
import { mediaService } from '../ios-desktop/js/media-service.js';
import { ICONS } from '../ios-desktop/js/icons.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const VT = readFileSync(R('js/aosp/volume-target-stream.js'), 'utf8');
const VD = readFileSync(R('js/volume-dialog.js'), 'utf8');
/** 剥注释扫描（R77 同款：防注释字面误伤） */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('v109-A · resolveVolumeKeyTargetStream 四档判定链', () => {
  const T = 1000000;
  it('A1 静默回落 ring（#109 行为差异主档：桌面静默按音量键调铃声流）', () => {
    expect(resolveVolumeKeyTargetStream({ now: T })).toBe('ring');
    expect(resolveVolumeKeyTargetStream({ mediaActiveTs: 0, now: T })).toBe('ring');
    expect(resolveVolumeKeyTargetStream({})).toBe('ring'); // 无 now → Date.now() 兜底
  });

  it('A2 媒体播放中 → music（isPlaying 上报位优先，ts 可缺省）', () => {
    expect(resolveVolumeKeyTargetStream({ mediaPlaying: true, now: T })).toBe('music');
  });

  it('A3 媒体近期活跃（3s 窗口内）→ music；恰好 3000ms → ring（窗口开区间）', () => {
    expect(resolveVolumeKeyTargetStream({ mediaActiveTs: T - 2999, now: T })).toBe('music');
    expect(resolveVolumeKeyTargetStream({ mediaActiveTs: T - 3000, now: T })).toBe('ring');
    expect(resolveVolumeKeyTargetStream({ mediaActiveTs: T - 3001, now: T })).toBe('ring');
    expect(STREAM_ACTIVE_WINDOW_MS).toBe(3000); // #193 isActive 同口径锚
  });

  it('A4 闹钟响铃 → alarm（优先于媒体）；通话 → call（优先级首位）', () => {
    expect(resolveVolumeKeyTargetStream({ alarmRinging: true, mediaPlaying: true, now: T })).toBe('alarm');
    expect(resolveVolumeKeyTargetStream({ callActive: true, alarmRinging: true, mediaPlaying: true, now: T })).toBe('call');
  });

  it('A5 从未发声（ts=0）不构成近期活跃', () => {
    expect(resolveVolumeKeyTargetStream({ mediaActiveTs: 0, now: T })).toBe('ring');
    expect(resolveVolumeKeyTargetStream({ mediaActiveTs: -5, now: T })).toBe('ring');
  });
});

describe('v109-B · targetStreamIconState 分流图标', () => {
  it('B1 music 两态（既有 VolumeDialogSliderIconProvider 语义不回归）', () => {
    expect(targetStreamIconState('music', 40).icon).toBe('volume_media');
    expect(targetStreamIconState('music', 0).icon).toBe('volume_media_mute');
  });

  it('B2 ring 段（#109 新增：ic_ring_volume / 静音 ring_volume_off）', () => {
    expect(targetStreamIconState('ring', 70).icon).toBe('ring_volume');
    expect(targetStreamIconState('ring', 0).icon).toBe('ring_volume_off');
  });

  it('B3 alarm/call 段 + 未知目标回落 music', () => {
    expect(targetStreamIconState('alarm', 30).icon).toBe('alarm');
    expect(targetStreamIconState('call', 30).icon).toBe('volume');
    expect(targetStreamIconState('unknown', 30).stream).toBe('music');
  });
});

describe('v109-C · clampStreamVolume per-stream 钳位', () => {
  it('C1 ±步进钳位 0-100 / NaN 兜底', () => {
    expect(clampStreamVolume(70, 100 / 15)).toBe(77);
    expect(clampStreamVolume(3, -100 / 15)).toBe(0);
    expect(clampStreamVolume(99, 100 / 15)).toBe(100);
    expect(clampStreamVolume(NaN, 5)).toBe(5);
    expect(clampStreamVolume(50, NaN)).toBe(50);
  });
});

describe('v109-D · volume-dialog 接线（happy-dom 真跑）', () => {
  let hooks;
  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="volumeDialog"><div id="vdSlider"></div><div id="vdIcon"></div>
        <div id="vdRingerDrawer"></div><div id="vdSettingsBtn"></div>
        <div id="vdSafety"></div><div id="vdFloatSliders"></div></div>`;
    localStorage.removeItem('settings:sound-v1');
    mediaService.isPlaying = false;
    mediaService.external = null;
    mediaService.streams.get('host-radio').lastActiveTs = 0;
    mediaService.streams.get('external-music').lastActiveTs = 0;
    const mod = await import('../ios-desktop/js/volume-dialog.js');
    mod.initVolumeDialog();
    hooks = mod.__testHooks();
  });
  afterEach(() => {
    localStorage.removeItem('settings:sound-v1');
    document.body.innerHTML = '';
  });

  it('D1 静默期（无媒体心跳）show() → 目标流 ring + 图标 ring_volume + 值显真源默认 70', async () => {
    hooks.stepVolume(0 + 100 / 15);            // 音量键步进（静默 → ring 档）
    expect(hooks.activeTarget).toBe('ring');
    const icon = document.getElementById('vdIcon');
    // innerHTML 经 DOM 序列化 <path/> → <path></path>，比对 ring_volume 特征 path 数据
    expect(icon.innerHTML).toContain('M11,7V2H13V7ZM17.6,9.85');   // ic_ring_volume 形态
    expect(hooks.readRingVolume()).toBe(77);           // DEFAULTS 70 + 步进 6.67 → 77 落真源
  });

  it('D2 ring 档写真源：settings:sound-v1 同键 + settings-sound-changed 事件（设置页双向同步）', () => {
    let evt = null;
    document.addEventListener('settings-sound-changed', (e) => { evt = e.detail; }, { once: true });
    hooks.writeRingVolume(55);
    expect(JSON.parse(localStorage.getItem('settings:sound-v1')).ring).toBe(55);
    expect(evt && evt.key).toBe('ring');
    expect(evt && evt.value).toBe(55);
  });

  it('D3 媒体活跃 → 目标流回 music 档（心跳窗口内）', () => {
    mediaService.streams.get('host-radio').lastActiveTs = Date.now() - 500;
    expect(hooks.resolveTarget()).toBe('music');
  });

  it('D4 external 上报播放位 → music（覆盖层也是媒体会话，#110 仲裁同口径）', () => {
    mediaService.external = { title: 'x', isPlaying: true };
    expect(hooks.resolveTarget()).toBe('music');
  });

  it('D5 ring 真源经总线图状态（v10.45 #117：writeRingVolume → setLevel 落账 + settings:sound-v1 同键落库；非法 JSON 兜底移至图创建时——v117-C6 覆盖）', () => {
    const before = hooks.readRingVolume();
    hooks.writeRingVolume(88);
    expect(hooks.readRingVolume()).toBe(88);                                   // 图状态 = 真源
    expect(JSON.parse(localStorage.getItem('settings:sound-v1')).ring).toBe(88); // 同键落库
    hooks.writeRingVolume(before);                                             // 还原（图单例会话态）
    expect(hooks.readRingVolume()).toBe(before);
  });
});

describe('v109-E · 源码锚（防回退）', () => {
  it('E1 volume-dialog 接线五锚：目标流重判/真源同键/事件同步/路由分流/守门专属', () => {
    expect(VD).toContain('resolveVolumeKeyTargetStream');
    expect(VD).toContain("'settings:sound-v1'");
    expect(VD).toContain('settings-sound-changed');
    expect(VD).toContain('if (activeTarget === \'music\') { requestVolume(value); return; }');
    expect(VD).toContain('activeTarget = resolveTarget()');
  });

  it('E2 纯逻辑纪律：volume-target-stream.js 零 window/零 document/零 setTimeout（剥注释扫描）', () => {
    const code = stripComments(VT);
    expect(code).not.toMatch(/\bwindow\./);
    expect(code).not.toMatch(/\bdocument\./);
    expect(code).not.toMatch(/setTimeout/);
  });
});
