// ==================== v176 二期测试 — 共享音频基建 audio-core（v9.19 R45） ====================
//
// #176 [数据孤岛][音频] 二期「抽取共享音频模块」（归属：重构·工程内聚，非超越，保留各应用形态）。
// 懒创建 / 手势解锁 / 主音量路由三件套下沉 apps/_shared/audio-core.js（Md3Audio）；
// music（频谱链路 source→analyser→master）/ piano（ac 别名透传）/ bytebeat（master 承接 gain）接入；
// radio（<audio> 直驱）/ midi-player（magenta bundle 自管）不适用留痕（v9.16 范式：不适用必须说明）。
//
// 环境跟随全局 happy-dom；audio-core 语义用注入 fake AudioContext 真跑（IIFE 直执行，同 v166 UMD 范式）。
//
// 断言面：
//  A. audio-core 真跑语义：懒单例 / 手势解锁 / masterGain 音量路由 / setVolume / 无 AC 优雅降级
//  B. 接入与留痕：三应用 script+Md3Audio.create、页内零自建 AudioContext、radio/midi 留痕
//  C. 版本真源 9.19.0

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const CORE_SRC = read('ios-desktop/apps/_shared/audio-core.js');
const MUSIC_SRC = read('ios-desktop/apps/music/index.html');
const PIANO_SRC = read('ios-desktop/apps/piano/index.html');
const BYTEBEAT_SRC = read('ios-desktop/apps/bytebeat/index.html');
const RADIO_SRC = read('ios-desktop/apps/radio/index.html');
const MIDI_SRC = read('ios-desktop/apps/midi-player/index.html');
const PKG = JSON.parse(read('package.json'));

// ---------- fake AudioContext（记录创建/恢复/连接，真跑语义） ----------
function makeFakeAC() {
  const calls = { created: 0, resumed: 0, masterConnectedTo: null };
  class FakeAC {
    constructor() {
      calls.created++;
      this.state = 'suspended';
      this.destination = { id: 'fake-destination' };
    }
    resume() { calls.resumed++; this.state = 'running'; }
    createGain() {
      const node = { gain: { value: 0 }, connect: (dest) => { calls.masterConnectedTo = dest; } };
      return node;
    }
  }
  return { klass: FakeAC, calls };
}

// 加载 audio-core：注入受控 window（IIFE 取参数 window），隔离测试间全局态
function loadCore(withAC) {
  const win = {};
  if (withAC) {
    win.AudioContext = withAC.klass;
    win.webkitAudioContext = withAC.klass;
  }
  new Function('window', 'globalThis', CORE_SRC)(win, {});
  return { Md3Audio: win.Md3Audio, calls: withAC ? withAC.calls : null };
}

describe('v9.19 #176 二期：audio-core 真跑语义（fake AudioContext 注入）', () => {
  it('A1 懒单例：create 不实例化，首次 get() 才建，重复 get 复用', () => {
    const env = makeFakeAC();
    const { Md3Audio } = loadCore(env);
    const core = Md3Audio.create();
    expect(core.isCreated()).toBe(false);
    expect(env.calls.created).toBe(0); // 惰性：创建期零实例
    const ctx = core.get();
    expect(ctx).toBeTruthy();
    expect(env.calls.created).toBe(1);
    expect(core.get()).toBe(ctx); // 同一实例（懒单例）
    expect(core.isCreated()).toBe(true);
  });

  it('A2 手势解锁：suspended → resume → running；已 running 不重复 resume', () => {
    const env = makeFakeAC();
    const { Md3Audio } = loadCore(env);
    const core = Md3Audio.create();
    const ctx = core.unlock();
    expect(env.calls.resumed).toBe(1);
    expect(ctx.state).toBe('running');
    core.unlock();
    expect(env.calls.resumed).toBe(1); // 不重复
  });

  it('A3 masterGain 路由：initialVolume 生效且 connect 到 ctx.destination', () => {
    const env = makeFakeAC();
    const { Md3Audio } = loadCore(env);
    const core = Md3Audio.create({ masterGain: true, initialVolume: 0.5 });
    const ctx = core.get();
    expect(core.master).toBeTruthy();
    expect(core.master.gain.value).toBe(0.5);
    expect(env.calls.masterConnectedTo).toBe(ctx.destination);
  });

  it('A4 setVolume：master 存在时改 gain 返回 true；无 master 时返回 false', () => {
    const env = makeFakeAC();
    const { Md3Audio } = loadCore(env);
    const core = Md3Audio.create({ masterGain: true });
    core.get();
    expect(core.setVolume(0.3)).toBe(true);
    expect(core.master.gain.value).toBe(0.3);
    const bare = Md3Audio.create();
    bare.get();
    expect(bare.setVolume(0.3)).toBe(false); // 未开 masterGain：无路由可改
  });

  it('A5 无 WebAudio 环境优雅降级：get/unlock 返回 null 不抛异常（music 静默降级语义）', () => {
    const { Md3Audio } = loadCore(null);
    const core = Md3Audio.create({ masterGain: true });
    expect(core.get()).toBe(null);
    expect(core.unlock()).toBe(null);
    expect(core.isCreated()).toBe(false);
  });

  it('A6 版本戳：Md3Audio.version = 1.0.0', () => {
    const { Md3Audio } = loadCore(makeFakeAC());
    expect(Md3Audio.version).toBe('1.0.0');
  });
});

describe('v9.19 #176 二期：三应用接入 + 两应用留痕（重构非超越，形态不变）', () => {
  it('B1 music/piano/bytebeat 均挂 audio-core 脚本并经 Md3Audio.create 接入', () => {
    for (const [name, src] of [['music', MUSIC_SRC], ['piano', PIANO_SRC], ['bytebeat', BYTEBEAT_SRC]]) {
      expect(src, name).toContain('../_shared/audio-core.js');
      expect(src, name).toContain('Md3Audio.create(');
    }
  });

  it('B2 三应用页内零自建 AudioContext（基建下沉唯一真源）', () => {
    for (const [name, src] of [['music', MUSIC_SRC], ['piano', PIANO_SRC], ['bytebeat', BYTEBEAT_SRC]]) {
      expect(src, name).not.toMatch(/new\s+AudioContext/);
      expect(src, name).not.toMatch(/webkitAudioContext/);
    }
  });

  it('B3 music 频谱链路改经 master（source→analyser→core.master，听感不变）', () => {
    expect(MUSIC_SRC).toContain('Md3Audio.create({ masterGain: true })');
    expect(MUSIC_SRC).toContain('this.analyser.connect(this.audioCore.master);');
  });

  it('B4 piano 持 ac 别名透传（ensureAC 语义不变），bytebeat master 承接 gain', () => {
    expect(PIANO_SRC).toContain('var pianoAudio = Md3Audio.create();');
    expect(PIANO_SRC).toContain('ac = pianoAudio.unlock();');
    expect(BYTEBEAT_SRC).toContain('audio.gain = audio.core.master;');
  });

  it('B5 radio/midi-player 不适用留痕（不许静默跳过，v9.16 范式）', () => {
    expect(RADIO_SRC).toContain('#176 二期留痕');
    expect(RADIO_SRC).toContain('<audio> 元素直驱');
    expect(MIDI_SRC).toContain('#176 二期留痕');
    expect(MIDI_SRC).toContain('magenta bundle');
  });
});

describe('v9.19 #176 二期：版本真源', () => {
  it('C1 package.json 9.26.0（v150 同口径）', () => {
    expect(PKG.version).toBe('9.50.0');
  });
});
