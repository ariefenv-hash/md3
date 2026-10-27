// ==================== v8.41 #57 电子琴测试套件 ====================
//
// 三层结构（v838/v839/v840 同款）：
//  1. core 沙箱直驱 —— new Function 提取 window.__pianoCore（IIFE 经典脚本，
//     ESM export 在经典 <script> 下整文件 SyntaxError 教训沿用）
//  2. 源码纪律锚 —— 无 eval / 无 innerHTML（调用级正则，防注释误伤）
//  3. 注册链四件套 —— apps-data/app-icons/icons/storage-stats + open 映射对拍
//     （议题 #57 验收：频率表/键位映射纯逻辑测试、真钢琴键盘、八度切换、
//      ADSR、复音无爆音、键盘+鼠标双输入）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/piano-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/piano/index.html'), 'utf8');

// ---------- core 沙箱提取（IIFE 挂 window.__pianoCore） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__pianoCore;

describe('v8.41 #57 core：十二平均律频率表（A4 = 440 Hz 锚）', () => {
  it('A4 = 440；C4 ≈ 261.6256；C5 ≈ 523.2511（八度精确翻倍）', () => {
    expect(core.noteFrequency(69)).toBeCloseTo(440, 6);
    expect(core.noteFrequency(60)).toBeCloseTo(261.6256, 4);
    expect(core.noteFrequency(72)).toBeCloseTo(523.2511, 4);
    expect(core.noteFrequency(72) / core.noteFrequency(60)).toBeCloseTo(2, 9);
    expect(core.noteFrequency(81) / core.noteFrequency(69)).toBeCloseTo(2, 9); // A5/A4
  });
  it('半音比率恒 2^(1/12)；非法 midi 返回 0（防御位）', () => {
    expect(core.noteFrequency(70) / core.noteFrequency(69)).toBeCloseTo(Math.pow(2, 1 / 12), 9);
    expect(core.noteFrequency(0)).toBeCloseTo(8.1758, 4);
    expect(core.noteFrequency(null)).toBe(0);
    expect(core.noteFrequency('C4')).toBe(0);
    expect(core.noteFrequency(NaN)).toBe(0);
    expect(core.noteFrequency(Infinity)).toBe(0);
  });
  it('音名 ⇄ midi 往返：C4=60 / A4=69 / C#4=61 / B5=83 / C-1=0', () => {
    expect(core.noteToMidi('C4')).toBe(60);
    expect(core.noteToMidi('a4')).toBe(69); // 大小写不敏感
    expect(core.noteToMidi('c#4')).toBe(61);
    expect(core.noteToMidi('B5')).toBe(83);
    expect(core.noteToMidi('C-1')).toBe(0);
    for (let m = 0; m <= 108; m++) {
      expect(core.noteToMidi(core.midiToNote(m)), `midi ${m} 往返`).toBe(m);
    }
    expect(core.midiToNote(61)).toBe('C#4'); // 黑键一律升号记法
    expect(core.midiToNote(70)).toBe('A#4');
    expect(core.noteToMidi('H4')).toBeNull();
    expect(core.noteToMidi('')).toBeNull();
    expect(core.noteToMidi(null)).toBeNull();
    expect(core.noteToMidi(42)).toBeNull();
    expect(core.midiToNote('x')).toBeNull();
  });
});

describe('v8.41 #57 core：键位映射（#57 执行要点原文 AWSEDFTGYHUJK）', () => {
  it('KEY_MAP 恰 13 键，逐个锚定 C4..C5（白 8 + 黑 5）', () => {
    const must = {
      a: 'C4', w: 'C#4', s: 'D4', e: 'D#4', d: 'E4',
      f: 'F4', t: 'F#4', g: 'G4', y: 'G#4', h: 'A4',
      u: 'A#4', j: 'B4', k: 'C5',
    };
    expect(Object.keys(core.KEY_MAP).length).toBe(13);
    Object.keys(must).forEach((k) => expect(core.KEY_MAP[k], `键位 ${k}`).toBe(must[k]));
  });
  it('keyToMidi：大小写不敏感；非法键 null；非法值防御', () => {
    expect(core.keyToMidi('A')).toBe(60);
    expect(core.keyToMidi('K')).toBe(72);
    expect(core.keyToMidi('z')).toBeNull();
    expect(core.keyToMidi('')).toBeNull();
    expect(core.keyToMidi(null)).toBeNull();
    expect(core.keyToMidi(undefined)).toBeNull();
  });
  it('八度移调 shift：+1 → A 键发 C5；±2 端点；越界钳制 [-2,2]', () => {
    expect(core.keyToMidi('a', 1)).toBe(72);   // C4 → C5
    expect(core.keyToMidi('a', -1)).toBe(48);  // C4 → C3
    expect(core.keyToMidi('a', 2)).toBe(84);   // C4 → C6
    expect(core.keyToMidi('a', -2)).toBe(36);  // C4 → C2
    expect(core.keyToMidi('a', 3)).toBe(84);   // 越界钳到 +2
    expect(core.keyToMidi('a', -3)).toBe(36);  // 越界钳到 -2
    expect(core.keyToMidi('a', null)).toBe(60); // 无 shift 归零
    expect(core.keyToMidi('a', 'x')).toBe(60);
  });
});

describe('v8.41 #57 core：键盘布局（真钢琴 UI · 2 组八度）', () => {
  it('buildKeyboard(4,2)：白 14 + 黑 10；黑键贴 C-D/D-E/F-G/G-A/A-B 之间', () => {
    const kb = core.buildKeyboard(4, 2);
    expect(kb.whites).toHaveLength(14);
    expect(kb.blacks).toHaveLength(10);
    expect(kb.whites[0]).toMatchObject({ note: 'C4', midi: 60, bind: 'A' });
    expect(kb.whites[7]).toMatchObject({ note: 'C5', midi: 72, bind: 'K' });
    expect(kb.whites[13]).toMatchObject({ note: 'B5', midi: 83, bind: null }); // 第 2 组无键位
    // 黑键 after 白键下标：C(0) D(1) F(3) G(4) A(5) 每组各 5
    expect(kb.blacks.map((b) => b.after)).toEqual([0, 1, 3, 4, 5, 7, 8, 10, 11, 12]);
    expect(kb.blacks[0]).toMatchObject({ note: 'C#4', midi: 61, bind: 'W' });
    expect(kb.blacks[2]).toMatchObject({ note: 'F#4', midi: 66, bind: 'T' });
  });
  it('buildKeyboard 防御：非法入参回落 C4 起 2 组；1/3 组边界', () => {
    expect(core.buildKeyboard().whites).toHaveLength(14);
    expect(core.buildKeyboard('x', 'y').whites).toHaveLength(14);
    expect(core.buildKeyboard(4, 'y').whites).toHaveLength(14);
    expect(core.buildKeyboard(3, 1).whites).toHaveLength(7);
    expect(core.buildKeyboard(3, 1).blacks).toHaveLength(5);
    expect(core.buildKeyboard(2, 3).whites).toHaveLength(21);
    expect(core.buildKeyboard(4, 9).whites).toHaveLength(21); // 钳 3 组
    expect(core.buildKeyboard(3, 1).whites[0].note).toBe('C3');
  });
});

describe('v8.41 #57 core：ADSR 包络时间线', () => {
  it('常量锚：attack 10ms / decay 220ms / sustain 62% / release 280ms', () => {
    expect(core.ADSR).toEqual({ ATTACK: 0.01, DECAY: 0.22, SUSTAIN: 0.62, RELEASE: 0.28 });
  });
  it('attackTimeline：0.0001 → 1（attack）→ sustain（decay）；t0 归一防御', () => {
    const tl = core.attackTimeline(2);
    expect(tl[0]).toEqual({ t: 2, v: 0.0001 });
    expect(tl[1].t).toBeCloseTo(2.01, 9); expect(tl[1].v).toBe(1);
    expect(tl[2].t).toBeCloseTo(2.23, 9); expect(tl[2].v).toBe(0.62);
    expect(core.attackTimeline(null)[0].t).toBe(0);
    expect(core.attackTimeline('x')[1].t).toBeCloseTo(0.01, 9);
  });
  it('releaseTimeline：sustain → 0.0001（release 坡）；tOff 归一防御', () => {
    const rl = core.releaseTimeline(5);
    expect(rl[0]).toEqual({ t: 5, v: 0.62 });
    expect(rl[1].t).toBeCloseTo(5.28, 9);
    expect(rl[1].v).toBe(0.0001);
    expect(core.releaseTimeline(undefined)[0].t).toBe(0);
  });
  it('复音上限常量：VOICES_MAX = 16（滑奏/和弦无爆音保护 · #57 验收）', () => {
    expect(core.VOICES_MAX).toBe(16);
  });
});

describe('v8.41 #57 core：文本曲谱解析与排程', () => {
  it('parseScore：音名/拍数/延音/休止逐点；非法 token 跳过', () => {
    expect(core.parseScore('C4 D4 E4')).toEqual([
      { midi: 60, beats: 1 }, { midi: 62, beats: 1 }, { midi: 64, beats: 1 },
    ]);
    expect(core.parseScore('C#4/2')).toEqual([{ midi: 61, beats: 2 }]);
    expect(core.parseScore('C4/1.5')).toEqual([{ midi: 60, beats: 1.5 }]);
    expect(core.parseScore('C4 - -')).toEqual([{ midi: 60, beats: 3 }]); // 延音 ×2
    expect(core.parseScore('C4 - R D4')).toEqual([
      { midi: 60, beats: 2 }, { midi: null, beats: 1 }, { midi: 62, beats: 1 },
    ]);
    expect(core.parseScore('r/0.5')).toEqual([{ midi: null, beats: 0.5 }]); // 休止小写
    expect(core.parseScore('C4 X9 @ D4/0')).toEqual([{ midi: 60, beats: 1 }, { midi: 62, beats: 1 }]);
    expect(core.parseScore('')).toEqual([]);
    expect(core.parseScore(null)).toEqual([]);
    expect(core.parseScore(42)).toEqual([]);
  });
  it('parseScore：拍数钳 (0, 8]；非法拍数 token 整体跳过（防笔误）', () => {
    expect(core.parseScore('C4/99')[0].beats).toBe(8);
    expect(core.parseScore('C4/0')[0].beats).toBe(1);
    expect(core.parseScore('C4/-3')).toEqual([]); // /-3 不合拍数文法 → 整 token 跳过
    expect(core.parseScore('C4/x')).toEqual([]); // /x 同上
    expect(core.parseScore('- C4')[0]).toEqual({ midi: 60, beats: 1 }); // 延音无前音跳过
    expect(core.parseScore('R - C4')).toEqual([{ midi: null, beats: 1 }, { midi: 60, beats: 1 }]); // 延音不作用于休止
  });
  it('scoreTimeline：bpm=96 → 一拍 0.625s；顺次累计；休止占位不发声', () => {
    const tl = core.scoreTimeline([{ midi: 60, beats: 1 }, { midi: null, beats: 0.5 }, { midi: 64, beats: 2 }], 96, 10);
    expect(tl).toHaveLength(2);
    expect(tl[0]).toEqual({ midi: 60, start: 10, end: 10.625 });
    // 休止 0.5 拍 = 0.3125s 占位后 E4 起于 10.9375
    expect(tl[1].start).toBeCloseTo(10.9375, 9);
    expect(tl[1].end).toBeCloseTo(12.1875, 9);
    expect(core.scoreTimeline([{ midi: 60, beats: 1 }], 60, 0)[0].end).toBe(1); // bpm=60 → 1s
    expect(core.scoreTimeline([{ midi: 60, beats: 1 }], null, 0)[0].end).toBeCloseTo(2 / 3, 9); // 回落 90
    expect(core.scoreTimeline('x', 96)).toEqual([]);
    expect(core.scoreTimeline(null, 96)).toEqual([]);
    expect(core.scoreTimeline([{ midi: 60 }], 96, 'x')[0].start).toBe(0); // t0 归一
  });
});

describe('v8.41 #57 源码纪律锚（无 eval / 无 innerHTML / 缺载守卫 / 双输入路径）', () => {
  // 调用级正则（v8.39 教训：注释提发会被简单 includes 误伤）
  const EVAL_CALL = /(^|[^.\w])eval\s*\(/;
  const NEWFN_CALL = /new\s+Function\s*\(/;
  it('piano-core.js 零 eval / 零 new Function（纯函数合成，无公式编译）', () => {
    expect(EVAL_CALL.test(CORE_SRC)).toBe(false);
    expect(NEWFN_CALL.test(CORE_SRC)).toBe(false);
  });
  it('piano/index.html 零 eval / 零 innerHTML 赋值（textContent 全链）', () => {
    expect(EVAL_CALL.test(PAGE_SRC)).toBe(false);
    expect(NEWFN_CALL.test(PAGE_SRC)).toBe(false);
    expect(/(^|[^.\w])innerHTML\s*\+?=/.test(PAGE_SRC)).toBe(false);
  });
  it('IIFE 挂 window.__pianoCore；零 ESM 顶层 export（行首正则防注释误伤）', () => {
    expect(CORE_SRC).toContain('window.__pianoCore');
    expect(CORE_SRC).not.toMatch(/^\s*export\s+/m); // ESM 顶层导出形态（注释提发不算）
    expect(CORE_SRC).toContain('(function () {'); // IIFE 开体
    expect(CORE_SRC.trimEnd().endsWith('})();')); // IIFE 闭体
  });
  it('core 缺载守卫（绝不白屏）+ 两级上行引用（iframe 相对基准 apps/）', () => {
    expect(PAGE_SRC).toContain('电子琴加载失败');
    expect(PAGE_SRC).toContain('src="../../js/piano-core.js"');
  });
  it('双输入路径：物理键盘 keydown + 触点 pointerdown（#57 验收原文）', () => {
    expect(PAGE_SRC).toContain("addEventListener('keydown'");
    expect(PAGE_SRC).toContain("addEventListener('keyup'");
    expect(PAGE_SRC).toContain("addEventListener('pointerdown'");
    expect(PAGE_SRC).toContain("addEventListener('pointerup'");
    expect(PAGE_SRC).toContain('setPointerCapture');
  });
  it('长按无重复触发：e.repeat 守卫 + 同 id 重触发先释放', () => {
    expect(PAGE_SRC).toContain('e.repeat');
    expect(PAGE_SRC).toContain('if (activeVoices.has(id)) noteOff(id)');
  });
  it('复音上限释放最旧 + AudioContext 懒单例 resume（autoplay 策略）', () => {
    expect(PAGE_SRC).toContain('core.VOICES_MAX');
    expect(PAGE_SRC).toContain("new AC()");
    expect(PAGE_SRC).toContain('ac.resume()');
    expect(PAGE_SRC).toContain("addEventListener('blur'"); // 失焦全释放
  });
  it('真钢琴键盘：buildKeyboard 驱动 + 白键黑键类 + 果冻按压动效（tile-bounce 同源曲线）', () => {
    expect(PAGE_SRC).toContain('core.buildKeyboard(4, 2)');
    expect(PAGE_SRC).toContain("className = 'pn-white'");
    expect(PAGE_SRC).toContain("className = 'pn-black'");
    expect(PAGE_SRC).toContain('cubic-bezier(.34,1.56,.64,1)');
  });
  it('oscillator 4 波形 + ADSR 精确排程（audioContext 时钟非 setTimeout）', () => {
    ['sine', 'triangle', 'square', 'sawtooth'].forEach((w) => {
      expect(PAGE_SRC).toContain(`data-wave="${w}"`);
    });
    expect(PAGE_SRC).toContain('linearRampToValueAtTime');
    expect(PAGE_SRC).toContain('createOscillator');
    expect(PAGE_SRC).toContain('createGain');
    expect(PAGE_SRC).not.toContain('setTimeout(');
  });
  it('曲谱持久化：piano_score_v1 localStorage + 损坏静默', () => {
    expect(PAGE_SRC).toContain("'piano_score_v1'");
    expect(PAGE_SRC).toContain('store.setItem(SCORE_KEY');
    expect(PAGE_SRC).toMatch(/catch \(e\) \{[^}]*\}/);
  });
});

describe('v8.41 #57 注册链四件套 + 联动锚', () => {
  it('apps-data.js：import piano + initialApps 在册（v8.44 ping 入列末位）', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
    expect(src).toContain("import piano      from './apps/piano.js'");
    expect(src).toMatch(/reaction, word, terminal, piano, bytebeat, python, ping, codeEditor,\s*\n\];/);
  });
  it('apps/piano.js 定义：id=piano · name=电子琴 · iframeAppContent', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/apps/piano.js'), 'utf8');
    expect(src).toContain("id: 'piano'");
    expect(src).toContain("name: '电子琴'");
    expect(src).toContain("iframeAppContent('apps/piano/index.html')");
  });
  it('app-icons.js 100×100 piano 图标 + icons.js 24px glyph', () => {
    const big = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf8');
    expect(big).toMatch(/piano: `<svg viewBox="0 0 100 100"/);
    const glyph = readFileSync(join(ROOT, 'ios-desktop/js/icons.js'), 'utf8');
    expect(glyph).toMatch(/piano: `<svg viewBox="0 0 24 24"/);
  });
  it('storage-stats.js：piano_score_v1 归属登记', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/storage-stats.js'), 'utf8');
    expect(src).toContain("['piano_score_v1', 'piano']");
  });
  it('terminal-core.js APPS 表入列 piano（40 应用 · open 可启动）', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf8');
    expect(src).toContain("['piano', '电子琴', 'piano', 'keyboard', '琴']");
    const ctx2 = { window: {} };
    new Function('window', src)(ctx2.window);
    expect(ctx2.window.__terminalCore.APPS.length).toBe(40);
    expect(ctx2.window.__terminalCore.resolveTarget('电子琴')).toEqual({ id: 'piano', name: '电子琴' });
    expect(ctx2.window.__terminalCore.resolveTarget('Piano')).toEqual({ id: 'piano', name: '电子琴' });
  });
  it('app-icons fixture：piano 条目 6 处动态色（总数 215 · v8.44 ping +7）', () => {
    const fixture = JSON.parse(readFileSync(join(ROOT, 'tests/icon-dynamic-colors.generated.json'), 'utf-8'));
    expect(fixture.icons.piano.dynamic).toBe(6);
    const total = Object.values(fixture.icons).reduce((s, v) => s + (v.colors || []).length, 0);
    expect(total).toBe(220);
  });
});
