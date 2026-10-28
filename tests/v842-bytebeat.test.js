// ==================== v842-bytebeat.test.js — #30 ByteBeat 音乐编程守护 ====================
// 三层结构：①core 沙箱直驱（白名单编译/求值/离屏渲染/FFT/分享码）②页面源码锚定
// ③注册链四件套 + 联动锚（apps-data/app-icons/icons/storage-stats/terminal 双文件/fixture）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/bytebeat-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/bytebeat/index.html'), 'utf8');

// 沙箱提取（terminal-core/piano-core 同款：经典 IIFE → new Function 直驱）
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__bytebeatCore;

describe('v8.42 #30 core 沙箱：白名单编译（验收原文：非法标识符编译即拒绝）', () => {
  it('IIFE 挂载 window.__bytebeatCore 且顶层零副作用（无 DOM/存储触碰）', () => {
    expect(core).toBeTruthy();
    expect(core.version).toBe('v8.42');
    expect(CORE_SRC).not.toMatch(/document\s*[.[]/);
    expect(CORE_SRC).not.toMatch(/localStorage\s*[.[]/);
  });

  it('合法公式放行：t 运算 / Math 调用 / 十六进制 / 三元 / 比较运算', () => {
    for (const ok of [
      't * 2', '((t >> 10) & 42) * t', '128 + Math.floor(64 * Math.sin(t / 24))',
      't * (0xCA98 >> (t >> 15 & 7) & 15)', '(t & 64) ? (t >> 4) : -(t >> 6)',
      't <= 255 ? t : 255', 't == 0 ? 128 : 0', 'Math.max(0, Math.min(t, 255))', '1e5 + t',
    ]) {
      const r = core.compileFormula(ok);
      expect(r.ok, ok + ' → ' + (r.error || '')).toBe(true);
    }
  });

  it('非法标识符逐个拒绝且报错含标识符名（document/window/fetch/localStorage/alert/Function/eval/globalThis）', () => {
    for (const bad of ['document.title', 'window.alert(1)', 'fetch("/x")', 'localStorage.getItem("a")',
      'alert(1)', 'Function("return 1")()', 'eval("1")', 'globalThis', 'constructor', 'toString',
      'new Function("return document")()']) {
      const r = core.compileFormula(bad);
      expect(r.ok, bad + ' 竟放行').toBe(false);
      expect(r.error).toContain('白名单');
    }
  });

  it('逃逸通道全堵：t.<属性> / Math.constructor / Math.__proto__ 一律拒绝', () => {
    for (const bad of ['t.constructor("return 1")()', 't.toFixed(2)', 'Math.constructor("return 1")()',
      'Math.__proto__', 'Math.sin.constructor("return 1")()']) {
      const r = core.compileFormula(bad);
      expect(r.ok, bad + ' 竟放行').toBe(false);
    }
  });

  it('不误伤：字符串字面量/注释内的敏感词放行；点号属性 Math.floor/PI/sin 放行', () => {
    expect(core.compileFormula('t * 1 + "document"').ok).toBe(true);
    expect(core.compileFormula('t // 这里写 document window fetch 都只是注释').ok).toBe(true);
    expect(core.compileFormula('Math.floor(t / 2) + Math.PI * 0 + Math.sin(t) * 0').ok).toBe(true);
  });

  it('赋值表达式整体拒绝（纯表达式语言）：= / += / -= 全拒；== <= >= != 放行', () => {
    for (const bad of ['t = 5', 'Math.sin += 1', 't -= 3', 'Math.PI *= 2']) {
      expect(core.compileFormula(bad).ok, bad + ' 竟放行').toBe(false);
    }
    for (const ok of ['t == 5 ? 1 : 0', 't <= 9', 't >= 3', 't != 2']) {
      expect(core.compileFormula(ok).ok, ok).toBe(true);
    }
  });

  it('编译产物求值正确性：常量 / 位运算 / Math / 同 t 幂等', () => {
    expect(core.compileFormula('t*0+7').fn(3, Math)).toBe(7);
    expect(core.compileFormula('5 & 3').fn(0, Math)).toBe(1);
    expect(core.compileFormula('Math.max(t, 10)').fn(4, Math)).toBe(10);
    const f = core.compileFormula('t * (42 & t >> 10)').fn;
    expect(f(123, Math)).toBe(f(123, Math));
    expect(f(12345678, Math)).toBe(12345678 * (42 & (12345678 >> 10)));
  });
});

describe('v8.42 #30 core：离屏渲染 + FFT + 分享码', () => {
  it('sampleNorm byte 模式：0→-1 / 255→1 / 取低 8 位（513≡1）', () => {
    expect(core.sampleNorm(0, 'byte')).toBe(-1);
    expect(core.sampleNorm(255, 'byte')).toBe(1);
    expect(core.sampleNorm(128, 'byte')).toBeCloseTo(128 / 127.5 - 1, 10);
    expect(core.sampleNorm(513, 'byte')).toBe(core.sampleNorm(1, 'byte'));
  });

  it('sampleNorm float 模式：钳制 [-1,1]、NaN/Infinity 静默归零或钳边', () => {
    expect(core.sampleNorm(2.5, 'float')).toBe(1);
    expect(core.sampleNorm(-9, 'float')).toBe(-1);
    expect(core.sampleNorm(0.5, 'float')).toBe(0.5);
    expect(core.sampleNorm(NaN, 'float')).toBe(0);
  });

  it('renderChunk：长度 = sr×秒 / 同参确定性 / 常量公式输出常量 / 抛错样本静默归零', () => {
    const f = core.compileFormula('t * (42 & t >> 10)').fn;
    const d1 = core.renderChunk(f, 0, 8000, 1, 'byte');
    expect(d1.length).toBe(8000);
    const d2 = core.renderChunk(f, 0, 8000, 1, 'byte');
    expect(Array.from(d1)).toEqual(Array.from(d2));
    const cf = core.compileFormula('t * 0 + 42').fn;
    const dc = core.renderChunk(cf, 0, 8000, 0.5, 'byte');
    expect(dc[100]).toBeCloseTo(core.sampleNorm(42, 'byte'), 5); // Float32 存储精度
    const boom = core.compileFormula('Math.max(t, 0) * 1e308 * 1e308').fn; // Infinity → float 钳边 / byte 位运算
    expect(() => core.renderChunk(boom, 0, 8000, 0.1, 'float')).not.toThrow();
  });

  it('fftMagnitudes：非 2 幂返回 null；sine 440Hz@22050/2048 峰值 bin=41；直流 bin0 最大', () => {
    expect(core.fftMagnitudes(new Float64Array(1000))).toBeNull();
    const N = 2048, sr = 22050, fq = 440;
    const sine = new Float64Array(N);
    for (let i = 0; i < N; i++) sine[i] = Math.sin((2 * Math.PI * fq * i) / sr);
    const mags = core.fftMagnitudes(sine);
    expect(mags.length).toBe(N / 2);
    expect(core.peakBin(mags)).toBe(Math.round((fq / sr) * N));
    const dc = new Float64Array(N).fill(1);
    expect(core.peakBin(core.fftMagnitudes(dc))).toBe(0);
  });

  it('hannWindow：端点趋零、中点峰值保持', () => {
    const w = core.hannWindow(new Float64Array([1, 1, 1, 1]));
    expect(w[0]).toBeCloseTo(0, 6);
    expect(Math.abs(w[1])).toBeLessThanOrEqual(1);
  });

  it('分享码往返：ASCII / CJK / 特殊字符 / mode+sr 保持；非法输入静默降级 null', () => {
    const payload = { formula: 't*("42" & t>>10) & "中文<>&\\"\'"', mode: 'float', sr: 32000 };
    const code = core.encodeShare(payload);
    expect(code.startsWith('b1.float.32000.')).toBe(true);
    expect(code).not.toMatch(/[+/=]/); // URL-safe
    const back = core.decodeShare('#' + code);
    expect(back.formula).toBe(payload.formula);
    expect(back.mode).toBe('float');
    expect(back.sr).toBe(32000);
    for (const bad of [null, '', 'b1.byte.999.aaaa', 'x1.byte.22050.aaaa', 'b1.byte.22050.@@@@',
      'b1.byte.22050.a', 'b1.wave.22050.aaaa']) {
      expect(core.decodeShare(bad)).toBeNull();
    }
  });

  it('SR_RATES 恰 5 档 8k~48k；MODES byte/float（验收：采样率可选）', () => {
    expect(core.SR_RATES).toEqual([8000, 11025, 22050, 32000, 48000]);
    expect(core.MODES).toEqual(['byte', 'float']);
  });
});

describe('v8.42 #30 core：内置经典公式库（验收：10+ 条）', () => {
  it('库量 ≥ 12 且名称/公式零重复', () => {
    expect(core.FORMULAS.length).toBeGreaterThanOrEqual(12);
    const srcs = new Set(), names = new Set();
    for (const f of core.FORMULAS) {
      expect(srcs.has(f.src)).toBe(false);
      expect(names.has(f.name)).toBe(false);
      srcs.add(f.src); names.add(f.name);
    }
  });

  it('每条公式通过白名单编译且 1 秒渲染非静音（max|样本| > 0.01）', () => {
    for (const f of core.FORMULAS) {
      const r = core.compileFormula(f.src);
      expect(r.ok, f.name + ' 编译失败：' + (r.error || '')).toBe(true);
      const data = core.renderChunk(r.fn, 1000, 22050, 1, 'byte');
      let mx = 0;
      for (const v of data) mx = Math.max(mx, Math.abs(v));
      expect(mx, f.name + ' 疑似静音 max=' + mx.toFixed(4)).toBeGreaterThan(0.01);
    }
  });
});

describe('v8.42 #30 页面源码锚定（apps/bytebeat/index.html）', () => {
  it('三级引用链：freeze-shim + md3-tokens 共享令牌层 + core 两级上行（v8.38 教训锚）', () => {
    expect(PAGE_SRC).toContain('../freeze-shim.js');
    expect(PAGE_SRC).toContain('../_shared/md3-tokens.css');
    expect(PAGE_SRC).toContain('../../js/bytebeat-core.js');
  });

  it('缺载守卫绝不白屏（core 缺失 → 错误提示 + return）', () => {
    expect(PAGE_SRC).toContain('if (!core)');
    expect(PAGE_SRC).toContain('核心模块缺载');
  });

  it('深链握手：BUS_DELIVER bytebeat/play → 填公式 + 编译 + 自动播放（终端 beat 联动）', () => {
    expect(PAGE_SRC).toContain("d.type !== 'BUS_DELIVER'");
    expect(PAGE_SRC).toContain("d.event !== 'bytebeat/play'");
    expect(PAGE_SRC).toMatch(/BUS_DELIVER[\s\S]{0,220}play\(\)/);
  });

  it('URL 分享：encodeShare → history.replaceState；加载时 decodeShare 恢复', () => {
    expect(PAGE_SRC).toContain('history.replaceState');
    expect(PAGE_SRC).toContain('core.decodeShare(location.hash)');
    expect(PAGE_SRC).toContain('core.encodeShare({ formula: ta.value, mode: state.mode, sr: state.sr })');
  });

  it('持久化：bytebeat_state_v1 + bytebeat_favs_v1 try/catch 静默降级', () => {
    expect(PAGE_SRC).toContain("'bytebeat_state_v1'");
    expect(PAGE_SRC).toContain("'bytebeat_favs_v1'");
    expect(PAGE_SRC).toMatch(/catch \(err\) \{ return fallback/);
  });

  it('双可视化离屏数据驱动：drawWave + drawSpectrum + fftMagnitudes + hannWindow', () => {
    expect(PAGE_SRC).toContain('function drawWave(');
    expect(PAGE_SRC).toContain('function drawSpectrum(');
    expect(PAGE_SRC).toContain('core.fftMagnitudes(win)');
    expect(PAGE_SRC).toContain('core.hannWindow(');
  });

  it('音频引擎：AudioContext 懒单例 + resume + 分块无缝排程 + 停止清理 + 音量 GainNode', () => {
    expect(PAGE_SRC).toMatch(/window\.AudioContext \|\| window\.webkitAudioContext/);
    expect(PAGE_SRC).toContain('createGain');
    expect(PAGE_SRC).toContain('createBufferSource');
    expect(PAGE_SRC).toContain('core.renderChunk(curFn, audio.tOffset, sr, core.CHUNK_SECONDS, state.mode)');
    expect(PAGE_SRC).toContain('setInterval(schedule, 400)');
    expect(PAGE_SRC).toMatch(/function stopSources\(\)/);
  });

  it('工程纪律：无 eval 调用 / 页面零 new Function（编译集中在 core）/ 动态输出全 textContent 零 innerHTML', () => {
    expect(PAGE_SRC).not.toMatch(/(^|[^.\w])eval\s*\(/);
    expect(PAGE_SRC).not.toMatch(/new\s+Function/);
    expect(PAGE_SRC).not.toMatch(/innerHTML\s*=/);
    expect(PAGE_SRC).not.toMatch(/fetch\s*\(/); // 纯离线自研（#30 无网络依赖）
    expect(PAGE_SRC).toContain('textContent');
  });

  it('白名单警示上屏（议题安全模型可视化）+ 果冻动效曲线（tile-bounce 同源）', () => {
    expect(PAGE_SRC).toContain('沙箱白名单编译（仅 t 与 Math）');
    expect(PAGE_SRC).toContain('cubic-bezier(.34,1.56,.64,1)');
  });

  it('收藏交互：收藏按钮 + 删除按钮 + 重名拦截', () => {
    expect(PAGE_SRC).toContain('☆ 收藏');
    expect(PAGE_SRC).toContain('已在收藏中');
    expect(PAGE_SRC).toMatch(/favs\.splice\(idx, 1\)/);
  });
});

describe('v8.42 #30 注册链四件套 + 联动锚', () => {
  it('apps-data.js：import bytebeat + initialApps 在册（v8.50 code-editor 入列末位·40 应用）', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
    expect(src).toContain("import bytebeat   from './apps/bytebeat.js'; // v8.42 #30");
    expect(src).toMatch(/reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio,\s*\n\];/);
  });

  it('apps/bytebeat.js wrapper：id=bytebeat · name=ByteBeat · iframeAppContent', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/apps/bytebeat.js'), 'utf8');
    expect(src).toContain("id: 'bytebeat'");
    expect(src).toContain("name: 'ByteBeat'");
    expect(src).toContain("iframeAppContent('apps/bytebeat/index.html')");
  });

  it('app-icons.js 100×100 bytebeat 图标 + icons.js 24px glyph（outline+filled 双映射）', () => {
    const big = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf8');
    expect(big).toMatch(/bytebeat: `<svg viewBox="0 0 100 100"/);
    expect(big).toContain('方波柱状波形');
    const glyph = readFileSync(join(ROOT, 'ios-desktop/js/icons.js'), 'utf8');
    expect(glyph).toMatch(/bytebeat: `<svg viewBox="0 0 24 24"/);
  });

  it('storage-stats.js：bytebeat_state_v1 + bytebeat_favs_v1 归属登记', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/storage-stats.js'), 'utf8');
    expect(src).toContain("['bytebeat_state_v1', 'bytebeat']");
    expect(src).toContain("['bytebeat_favs_v1', 'bytebeat']");
  });

  it('terminal-core.js：APPS 表入列 bytebeat（41 应用）+ resolveTarget 别名 + beat desc 转正', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf8');
    expect(src).toContain("['bytebeat', 'ByteBeat', 'bytebeat', 'beat', '音乐编程', '音乐']");
    expect(src).toContain('ByteBeat 公式播放（#30 联动·打开即奏）');
    const c2 = { window: {} };
    new Function('window', src)(c2.window);
    const tc = c2.window.__terminalCore;
    expect(tc.APPS.length).toBe(44);
    expect(tc.resolveTarget('bytebeat')).toEqual({ id: 'bytebeat', name: 'ByteBeat' });
    expect(tc.resolveTarget('Beat')).toEqual({ id: 'bytebeat', name: 'ByteBeat' });
    expect(tc.resolveTarget('音乐编程')).toEqual({ id: 'bytebeat', name: 'ByteBeat' });
  });

  it('terminal/index.html：beat 命令真实现（usage 引导 + openApp 深链 + 事件载荷）', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/apps/terminal/index.html'), 'utf8');
    expect(src).toContain("window.__system.openApp('bytebeat'");
    expect(src).toContain("event: 'bytebeat/play'");
    expect(src).toContain('payload: { formula: formula }');
    expect(src).toContain('usage: beat <formula>');
  });

  it('icon fixture：bytebeat 10 处动态色 · 全库总数 236（v8.54 radio +5）', () => {
    const fixture = JSON.parse(readFileSync(join(ROOT, 'tests/icon-dynamic-colors.generated.json'), 'utf-8'));
    expect(fixture.icons.bytebeat.dynamic).toBe(10);
    const total = Object.values(fixture.icons).reduce((s, v) => s + (v.colors || []).length, 0);
    expect(total).toBe(236);
  });

  it('md3-tokens 共享层挂载（iframe 应用第 26 个）', () => {
    expect(PAGE_SRC.indexOf('../_shared/md3-tokens.css')).toBeGreaterThan(-1);
  });
});
