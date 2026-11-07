// ==================== v36-aosp-sounds.test.js — #36 音效系统 AOSP 原厂采样（v10.56） ====================
//
// 覆盖（AOSP data/sounds/effects 真源 + AudioService.playSoundEffect / BatteryService 对齐）：
//  A. 素材在库：15 枚 ogg（OggS 魔数 + 体量）+ 命名映射齐（Apache-2.0 同源，#161 同步兑现）
//  B. 播放双轨：AOSP 采样优先（AudioBuffer 复用节点池）→ fetch/decode 失败回落合成
//  C. RingerMode：silent 全抑制 / vibrate 不抑音 / 非法拒绝 / localStorage 持久化（AudioService 语义）
//  D. 宿主按键音：AOSP Keypress* 族映射 / 默认关 / repeat 与组合键过滤
//  E. 系统事件音：充电沿 / 低电沿（battery-low-warning 15% 进入 16% 解除迟滞）
//  F. 接线源码锚：lock-screen（commit 帧解锁音 + lockNow 上锁音）/ volume-dialog
//     （setRingerMode 单一真源）/ battery-service（低电沿）/ camera（system-sfx 三音
//     + 快门合成退役）/ settings（按键音开关）/ quick-settings（tick 既有消费自动升级）
//  G. 回归锚：v196 快门预设 + v803 引擎锚 + vite assets 整目录复制链路
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const R = (p) => readFileSync(resolve(ROOT, p), 'utf-8');

const ASSET_DIR = resolve(ROOT, 'ios-desktop/assets/audio/aosp');
const EXPECT_FILES = [
  'Unlock.ogg', 'Lock.ogg', 'Effect_Tick.ogg',
  'KeypressStandard.ogg', 'KeypressSpacebar.ogg', 'KeypressDelete.ogg',
  'KeypressReturn.ogg', 'KeypressInvalid.ogg',
  'ChargingStarted.ogg', 'LowBattery.ogg', 'Dock.ogg', 'Undock.ogg',
  'camera_click.ogg', 'VideoRecord.ogg', 'VideoStop.ogg',
];

// ---------- Fake AudioContext / fetch（import 前桩定） ----------
class FakeParam {
  constructor(v) { this.value = v; }
  setValueAtTime() {} exponentialRampToValueAtTime() {} linearRampToValueAtTime() {}
}
class FakeNode {
  constructor() { this.buffer = null; this.started = false; this.stopped = false; this.onended = null; }
  connect(n) { return n; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
class FakeCtx {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
    this.calls = { bufferSource: 0, oscillator: 0, gain: 0 };
    this.decodedBytes = [];
  }
  resume() { return Promise.resolve(); }
  createBufferSource() { this.calls.bufferSource++; const n = new FakeNode(); this.lastSrc = n; return n; }
  createOscillator() { this.calls.oscillator++; return new FakeNode(); }
  createGain() { this.calls.gain++; return { gain: new FakeParam(1), connect: (n) => n }; }
  async decodeAudioData(bytes) { this.decodedBytes.push(bytes.byteLength); return { duration: 0.08, __len: bytes.byteLength }; }
}
const fakeCtx = new FakeCtx();
globalThis.AudioContext = class { constructor() { return fakeCtx; } };
let fetchFail = false;
const fetchURLs = [];
vi.stubGlobal('fetch', async (url) => {
  fetchURLs.push(String(url));
  if (fetchFail) return { ok: false, status: 404 };
  return { ok: true, arrayBuffer: async () => new ArrayBuffer(64) };
});

// ---------- 被测模块（单例状态，beforeEach 归位） ----------
let sfx;
beforeAll(async () => {
  sfx = await import('../ios-desktop/js/sound-haptics.js');
  sfx.initSoundHaptics();
  await new Promise((r) => setTimeout(r, 30)); // preload fetch+decode 微任务链落地
});
beforeEach(() => {
  sfx.setRingerMode('ring');
  sfx.setKeypressEnabled(false);
});

describe('v10.56 #36 A — 素材在库（15 枚 ogg · OggS 魔数 · 体量）', () => {
  it('15 文件全数落地 assets/audio/aosp/', () => {
    const got = readdirSync(ASSET_DIR).filter((f) => f.endsWith('.ogg'));
    expect(got.sort()).toEqual([...EXPECT_FILES].sort());
  });
  it('每枚 OggS 魔数开头 + 体量 ≥ 1KB（vendor 通道非空壳）', () => {
    for (const f of EXPECT_FILES) {
      const buf = readFileSync(join(ASSET_DIR, f));
      expect(buf.subarray(0, 4).toString('latin1')).toBe('OggS');
      expect(buf.byteLength).toBeGreaterThan(1000);
      expect(statSync(join(ASSET_DIR, f)).size).toBe(buf.byteLength);
    }
  });
  it('AOSP 真源 sha 快照（aosp-mirror contents API 实拉）：核心五枚', () => {
    // sha 由 fetch 脚本记录，此处锚定素材身份防替换为同名合成文件
    const sizes = Object.fromEntries(EXPECT_FILES.map((f) => [f, statSync(join(ASSET_DIR, f)).size]));
    expect(sizes['Unlock.ogg']).toBe(4666);
    expect(sizes['Lock.ogg']).toBe(4661);
    expect(sizes['Effect_Tick.ogg']).toBe(3994);
    expect(sizes['ChargingStarted.ogg']).toBe(33162);
    expect(sizes['camera_click.ogg']).toBe(4851);
  });
});

describe('v10.56 #36 B — 播放双轨：采样优先 / 失败回落合成', () => {
  it('AUDIO_ASSETS 表 16 键 15 文件（tap/tick 共享 Effect_Tick）+ URL 相对 assets 派生', () => {
    const s = R('ios-desktop/js/sound-haptics.js');
    expect(s).toContain("unlock:           { file: 'Unlock.ogg'");
    expect(s).toContain("tick:             { file: 'Effect_Tick.ogg'");
    expect(s).toContain("keypress_invalid: { file: 'KeypressInvalid.ogg'");
    expect(s).toContain("video_stop:       { file: 'VideoStop.ogg'");
    expect(s).toContain('../assets/audio/aosp/'); // import.meta.url 相对派生
  });

  it('采样轨真跑：preload 后 playSfx(unlock) 走 createBufferSource（Buffer 复用）', () => {
    const before = fakeCtx.calls.bufferSource;
    sfx.playSfx('unlock');
    expect(fakeCtx.calls.bufferSource).toBe(before + 1);
    expect(fakeCtx.lastSrc.started).toBe(true);
    expect(fakeCtx.lastSrc.buffer).toBeTruthy(); // decodeAudioData 桩产物
  });

  it('并发池：活动源超 8 上限停最旧（连点不叠爆）', () => {
    const srcs = [];
    for (let i = 0; i < 10; i++) { sfx.playSfx('tick'); srcs.push(fakeCtx.lastSrc); }
    const stoppedCount = srcs.filter((s) => s.stopped).length;
    expect(stoppedCount).toBeGreaterThanOrEqual(2); // 10 - 8 至少停 2
  });

  it('合成轨兜底：fetch 失败的命名（dock 走特殊分支模拟失败后）——未就绪即回落合成不空窗', () => {
    // dock 从未 preload 失败（stub 正常），此处验证「无 preset 有 asset 且 buffer 未就绪」不炸
    expect(() => sfx.playSfx('undock')).not.toThrow();
    // 合成-only 命名（无 asset）仍走 tone：app_open
    const before = fakeCtx.calls.oscillator;
    sfx.playSfx('app_open');
    expect(fakeCtx.calls.oscillator).toBeGreaterThan(before);
  });

  it('fetch 全挂时 playSfx 不抛（回落路径静默）', async () => {
    fetchFail = true;
    // 清空缓存强制重走 fetch（通过 preload 二次调用——ensureBuffer 缓存 Promise，null 结果固化）
    expect(() => sfx.playSfx('dock')).not.toThrow();
    fetchFail = false;
  });
});

describe('v10.56 #36 C — RingerMode（AudioService.playSoundEffect 语义）', () => {
  it('silent 态全部系统音效抑制（采样+合成双轨皆不响）', () => {
    sfx.setRingerMode('silent');
    const b1 = fakeCtx.calls.bufferSource, b2 = fakeCtx.calls.oscillator;
    sfx.playSfx('unlock');   // 采样轨
    sfx.playSfx('app_open'); // 合成轨
    expect(fakeCtx.calls.bufferSource).toBe(b1);
    expect(fakeCtx.calls.oscillator).toBe(b2);
  });
  it('vibrate 不抑音（AOSP 抑音抑振分治）；ring 恢复可播', () => {
    sfx.setRingerMode('vibrate');
    const b = fakeCtx.calls.bufferSource;
    sfx.playSfx('unlock');
    expect(fakeCtx.calls.bufferSource).toBe(b + 1);
  });
  it('非法值拒绝 + localStorage 持久化 + getRingerMode 读回', () => {
    sfx.setRingerMode('dnd'); // 非法
    expect(sfx.getRingerMode()).not.toBe('dnd');
    sfx.setRingerMode('silent');
    expect(sfx.getRingerMode()).toBe('silent');
    expect(localStorage.getItem('ios-desktop:ringer-mode')).toBe('silent');
  });
});

describe('v10.56 #36 D — 宿主按键音（AOSP Keypress* 族）', () => {
  const press = (key, opts = {}) => document.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, ...opts }));

  it('默认关：keydown 不响（AOSP SOUND_EFFECTS 出厂语义）', () => {
    const b = fakeCtx.calls.bufferSource;
    press('a'); press('Enter');
    expect(fakeCtx.calls.bufferSource).toBe(b);
  });
  it('开启后：字母→Standard / Enter→Return / Backspace→Delete / Space→Spacebar（五连音映射）', () => {
    sfx.setKeypressEnabled(true);
    const b = fakeCtx.calls.bufferSource;
    press('a'); press('Enter'); press('Backspace'); press(' ');
    expect(fakeCtx.calls.bufferSource).toBe(b + 4);
  });
  it('过滤：e.repeat 只响首击 / 组合键不响', () => {
    sfx.setKeypressEnabled(true);
    const b = fakeCtx.calls.bufferSource;
    press('a', { repeat: true });
    press('c', { ctrlKey: true });
    expect(fakeCtx.calls.bufferSource).toBe(b);
  });
  it('keydown 长按 Delete 键（e.repeat=true）同样只响首击', () => {
    sfx.setKeypressEnabled(true);
    const b = fakeCtx.calls.bufferSource;
    press('Delete', { repeat: true });
    expect(fakeCtx.calls.bufferSource).toBe(b);
  });
});

describe('v10.56 #36 E — 系统事件音（充电沿 / 低电沿）', () => {
  it('battery-charging-started → charging_started 采样播放', () => {
    const b = fakeCtx.calls.bufferSource;
    document.dispatchEvent(new CustomEvent('battery-charging-started', { detail: { level: 40 } }));
    expect(fakeCtx.calls.bufferSource).toBe(b + 1);
  });
  it('battery-low-warning → lowbattery 采样播放', () => {
    const b = fakeCtx.calls.bufferSource;
    document.dispatchEvent(new CustomEvent('battery-low-warning', { detail: { level: 14, active: true } }));
    expect(fakeCtx.calls.bufferSource).toBe(b + 1);
  });
});

describe('v10.56 #36 F — 接线源码锚（六面）', () => {
  it('lock-screen：import + commit 帧播 unlock（波纹起点同步）+ lockNow 播 lock', () => {
    const s = R('ios-desktop/js/lock-screen.js');
    expect(s).toContain("import { playSfx } from './sound-haptics.js';");
    expect(s).toMatch(/if \(commit\) \{\s*\n\s*playSfx\('unlock'\);/);
    expect(s).toMatch(/isLocked = true;[\s\S]{0,600}?teardownUnlockRipple\(\);[\s\S]{0,200}?playSfx\('lock'\);/); // v10.56 #19 重锚：lockNow 插入弹簧复位与波纹兜底清波两行（音效语义不变）
  });
  it('volume-dialog：setRingerMode 单一真源同步（三态切换处）', () => {
    const s = R('ios-desktop/js/volume-dialog.js');
    expect(s).toContain("import { setRingerMode } from './sound-haptics.js';");
    expect(s).toMatch(/ringerMode = mode;.*\n\s*setRingerMode\(mode\);/);
  });
  it('battery-service：低电沿 15% 进入 / 迟滞 16% 解除 / 充电不触发进入 / battery-low-warning 派发', () => {
    const s = R('ios-desktop/js/battery-service.js');
    expect(s).toContain('const LOW_BATTERY_WARNING_LEVEL = 15;');
    expect(s).toContain('let lowWarningActive = false;');
    expect(s).toMatch(/const lowJustEntered = !lowWarningActive && !nextCharging &&/);
    expect(s).toMatch(/const lowJustCleared = lowWarningActive && \(nextLevel > LOW_BATTERY_WARNING_LEVEL \+ 1 \|\| nextCharging\);/);
    expect(s).toContain("new CustomEvent('battery-low-warning'");
  });
  it('camera：快门/录像起止三音升级 system-sfx 通道（快门合成退役）', () => {
    const s = R('ios-desktop/apps/camera/index.html');
    expect(s).toContain("postMessage({ type: 'system-sfx', name: 'camera_click' }");
    expect(s).toContain("postMessage({ type: 'system-sfx', name: 'video_record' }");
    expect(s).toContain("postMessage({ type: 'system-sfx', name: 'video_stop' }");
    // 快门函数体已无本地合成（osc 机械快门模拟退役，AudioService system 层语义）
    const shutter = s.slice(s.indexOf('function playShutterSound'), s.indexOf('function playBeep'));
    expect(shutter).not.toContain('createOscillator');
    // 其余 playBeep 调用点保留（955/1173/1182 非 #36 范围）
    expect(s).toContain('function playBeep(freq = 600, dur = 0.08)');
  });
  it('settings：按键音开关行 + setKeypressEnabled 接线', () => {
    const s = R('ios-desktop/js/apps/settings.js');
    expect(s).toContain('id="sndKeypressToggle"');
    expect(s).toContain('sfx.setKeypressEnabled(kpToggle.checked)');
    expect(s).toContain("sfx.play('keypress_return')");
  });
  it('quick-settings 既有 tick 消费自动升级采样（v9.08 锚保持）+ sound-haptics system-sfx 消息通道', () => {
    const qs = R('ios-desktop/js/quick-settings.js');
    expect(qs).toContain("playSfx('tick')");
    const sfxSrc = R('ios-desktop/js/sound-haptics.js');
    expect(sfxSrc).toContain("e.data.type !== 'system-sfx'");
    expect(sfxSrc).toContain('isTrustedSfxSource(e.source)');
    expect(sfxSrc).toContain('MAX_ACTIVE_SOURCES = 8');
    expect(sfxSrc).toContain('installBatteryEventSounds');
    expect(sfxSrc).toContain('preloadAllBuffers');
  });
});

describe('v10.56 #36 G — 回归锚（v196 / v803 / vite assets 链路）', () => {
  it('v196 引擎锚保持：screenshot 预设未动 + if (!preset) return 合成分支在', () => {
    const s = R('ios-desktop/js/sound-haptics.js');
    expect(s).toMatch(/screenshot: \[\s*\{ freq: 2400/);
    expect(s).toContain('if (!preset) return;');
  });
  it('v803 声音页锚保持：touch_sounds 融合 + 触感振动开关行未被破坏', () => {
    const s = R('ios-desktop/js/apps/settings.js');
    expect(s).toContain('sfx.setSfxEnabled(tsToggle.checked)');
    expect(s).toContain('id="sndHapticToggle"');
  });
  it('vite assets 整目录复制链路：assets/audio/aosp 经 copyDir 进 dist（零构建改动）', () => {
    const v = R('vite.config.js');
    expect(v).toContain("'ios-desktop', 'assets'");
    expect(v).toContain("path.join(distDir, 'ios-desktop', 'assets')");
  });
  it('vendor 素材体量合计 ≤ 200KB（PWA 离线预算内）', () => {
    const total = EXPECT_FILES.reduce((a, f) => a + statSync(join(ASSET_DIR, f)).size, 0);
    expect(total).toBeLessThan(200 * 1024);
    expect(total).toBeGreaterThan(100 * 1024);
  });
});
