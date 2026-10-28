// ==================== v851-midi-player.test.js — #56 MIDI 播放器（v8.51） ====================
// 验收锚（#56 原文）：导入 .mid/.midi 播放无报错 + 卷帘可视化同步 + 播放/暂停/进度 +
// 切歌/关闭无音频泄漏 + vitest 锚。执行要点：html-midi-player Web Component（npm 打包
// 离线内嵌，magenta shim 跳 tfjs）/ 导入 overlay 取消路径（#55 纪律）/ sound-font 懒加载
// 增强（失败回退）/ 示例曲目公有领域（程序化生成）/ 终端 `open midi` 可达。
import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/midi-player-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/midi-player/index.html'), 'utf8');
const APP_MJS_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/midi-player/app.mjs'), 'utf8');
const SHELL_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps/midi-player.js'), 'utf8');
const APPSDATA_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
const ICONS_SRC = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf8');
const TCORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf8');
const FIXTURE = JSON.parse(readFileSync(join(ROOT, 'tests/icon-dynamic-colors.generated.json'), 'utf-8'));

// ---------- 沙箱提取（经典脚本 IIFE → window.__midiPlayerCore） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__midiPlayerCore;

// ---------- 真实样例字节（gen-sample-midis.py 产物，双端锚定） ----------
const ODE = readFileSync(join(ROOT, 'ios-desktop/apps/midi-player/assets/ode-to-joy.mid'));
const TWINKLE = readFileSync(join(ROOT, 'ios-desktop/apps/midi-player/assets/twinkle.mid'));

// ---------- 工艺 MIDI 字节构造器（非法文件矩阵） ----------
function craftBytes(opts = {}) {
  const parts = [];
  const magic = opts.magic === false ? Buffer.from('XXXX') : Buffer.from('MThd');
  const hlen = opts.headerLen ?? 6;
  const fmt = opts.format ?? 0;
  const ntrks = opts.ntrks ?? 1;
  const div = opts.division ?? 480;
  const head = Buffer.alloc(4);
  head.writeUInt32BE(hlen, 0);
  const body = Buffer.alloc(6);
  body.writeUInt16BE(fmt, 0);
  body.writeUInt16BE(ntrks, 2);
  body.writeUInt16BE(div, 4);
  parts.push(magic, head, body);
  if (opts.withTrack !== false) {
    const trk = Buffer.from([0x00, 0xc0, 0x00, 0x00, 0xff, 0x2f, 0x00]); // program change + EOT
    const th = Buffer.from('MTrk');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(trk.length, 0);
    parts.push(th, len, trk);
  }
  let buf = Buffer.concat(parts);
  if (opts.truncate != null) buf = buf.subarray(0, opts.truncate);
  return buf;
}

describe('v8.51 #56 core：MIDI 头解析（parseMidiHeader）', () => {
  it('欢乐颂样例：ok / format 0 / 1 轨 / 480 TPQ / 562B', () => {
    const h = core.parseMidiHeader(ODE);
    expect(h.ok).toBe(true);
    expect(h.format).toBe(0);
    expect(h.ntrks).toBe(1);
    expect(h.tpq).toBe(480);
    expect(h.smpte).toBe(false);
    expect(h.size).toBe(562);
  });
  it('小星星样例：ok / format 0 / 414B', () => {
    const h = core.parseMidiHeader(TWINKLE);
    expect(h.ok).toBe(true);
    expect(h.format).toBe(0);
    expect(h.size).toBe(414);
  });
  it('非法矩阵：空 / 过小 / 非 MThd 魔数 / MThd 长度 <6 / format 3 / 轨道 0 / division 0 全拒', () => {
    expect(core.parseMidiHeader(new Uint8Array(0)).ok).toBe(false);
    const small = core.parseMidiHeader(craftBytes({ truncate: 10 }));
    expect(small.ok).toBe(false);
    expect(small.error).toMatch(/文件过小/);
    const badMagic = core.parseMidiHeader(craftBytes({ magic: false }));
    expect(badMagic.ok).toBe(false);
    expect(badMagic.error).toMatch(/MThd/);
    expect(core.parseMidiHeader(craftBytes({ headerLen: 4 })).ok).toBe(false);
    const fmt3 = core.parseMidiHeader(craftBytes({ format: 3 }));
    expect(fmt3.ok).toBe(false);
    expect(fmt3.error).toMatch(/格式 3/);
    expect(core.parseMidiHeader(craftBytes({ ntrks: 0 })).ok).toBe(false);
    expect(core.parseMidiHeader(craftBytes({ division: 0 })).ok).toBe(false);
  });
  it('任何输入不抛错：null / undefined / 空对象', () => {
    expect(() => core.parseMidiHeader(null)).not.toThrow();
    expect(() => core.parseMidiHeader(undefined)).not.toThrow();
    expect(() => core.parseMidiHeader({})).not.toThrow();
    expect(core.parseMidiHeader(null).ok).toBe(false);
  });
});

describe('v8.51 #56 core：音符计数（scanNoteCount，信息栏锚）', () => {
  it('欢乐颂 = 62 音符（30 旋律 + 32 伴奏，gen 脚本同口径）', () => {
    expect(core.scanNoteCount(ODE)).toBe(62);
  });
  it('小星星 = 42 音符', () => {
    expect(core.scanNoteCount(TWINKLE)).toBe(42);
  });
  it('非法输入 → -1（不抛错）', () => {
    expect(core.scanNoteCount(new Uint8Array(0))).toBe(-1);
    expect(core.scanNoteCount(craftBytes({ magic: false }))).toBe(-1);
    expect(() => core.scanNoteCount(null)).not.toThrow();
  });
});

describe('v8.51 #56 core：文件名 / VFS 过滤 / 展示格式', () => {
  it('isMidiName：.mid/.midi 不分大小写；隐藏文件与多重点也按末段扩展名', () => {
    expect(core.isMidiName('song.mid')).toBe(true);
    expect(core.isMidiName('SONG.MID')).toBe(true);
    expect(core.isMidiName('a.b.midi')).toBe(true);
    expect(core.isMidiName('.mid')).toBe(false);      // 隐藏文件不算扩展名
    expect(core.isMidiName('song.mid3')).toBe(false);
    expect(core.isMidiName('song.txt')).toBe(false);
    expect(core.isMidiName('')).toBe(false);
    expect(core.isMidiName(null)).toBe(false);
  });
  it('filterMidiEntries：仅留 .mid/.midi 行（目录/文本剔除）+ path 排序 + 缺字段容错', () => {
    const rows = core.filterMidiEntries([
      { type: 'file', path: '/music/b.mid', name: 'b.mid', size: 10 },
      { type: 'dir', path: '/music/sub', name: 'sub' },
      { type: 'file', path: '/music/a.MIDI', name: 'a.MIDI', size: 20 },
      { type: 'file', path: '/music/c.txt', name: 'c.txt', size: 5 },
      null,
      { type: 'file', path: '/music/noext', name: 'noext' },
    ]);
    expect(rows.map((r) => r.path)).toEqual(['/music/a.MIDI', '/music/b.mid']);
  });
  it('filterMidiEntries：非数组 → []（不抛错）', () => {
    expect(core.filterMidiEntries(null)).toEqual([]);
    expect(core.filterMidiEntries('x')).toEqual([]);
  });
  it('fmtBytes 三档 + 异常回落 —', () => {
    expect(core.fmtBytes(562)).toBe('562 B');
    expect(core.fmtBytes(545083)).toBe('532.3 KB');
    expect(core.fmtBytes(2 * 1024 * 1024)).toBe('2.0 MB');
    expect(core.fmtBytes(-1)).toBe('—');
    expect(core.fmtBytes(NaN)).toBe('—');
  });
  it('formatTime m:ss（tabular-nums 纪律）', () => {
    expect(core.formatTime(0)).toBe('0:00');
    expect(core.formatTime(16.5)).toBe('0:16');
    expect(core.formatTime(61)).toBe('1:01');
    expect(core.formatTime(-3)).toBe('0:00');
  });
});

describe('v8.51 #56 core：深链 / 状态规范化', () => {
  it('parseDeepLink：合法 path 通过；控制字符 / 超长 / 缺参 / 非字符串拒绝', () => {
    expect(core.parseDeepLink({ path: '/music/a.mid' })).toEqual({ path: '/music/a.mid' });
    expect(core.parseDeepLink({ path: '  /music/a.mid  ' })).toEqual({ path: '/music/a.mid' });
    expect(core.parseDeepLink({ path: 'a\nb' })).toBeNull();
    expect(core.parseDeepLink({ path: 'x'.repeat(513) })).toBeNull();
    expect(core.parseDeepLink({})).toBeNull();
    expect(core.parseDeepLink(null)).toBeNull();
  });
  it('normalizeState：损坏输入安全 + soundfont 布尔 + last 白名单形态', () => {
    expect(core.normalizeState(null)).toEqual({ soundfont: false, last: null });
    expect(core.normalizeState({ soundfont: true, last: { type: 'sample', id: 'ode' } }))
      .toEqual({ soundfont: true, last: { type: 'sample', id: 'ode' } });
    expect(core.normalizeState({ last: { type: 'vfs', path: '/music/a.mid' } }).last)
      .toEqual({ type: 'vfs', path: '/music/a.mid' });
    expect(core.normalizeState({ soundfont: 'yes' }).soundfont).toBe(false);
    expect(core.normalizeState({ last: { type: 'hack', id: 'x' } }).last).toBeNull();
    expect(core.normalizeState({ last: { type: 'sample', id: 'x'.repeat(65) } }).last).toBeNull();
    expect(core.normalizeState({ last: { type: 'vfs', path: 'y'.repeat(513) } }).last).toBeNull();
  });
  it('STATE_KEY 专用键 + SAMPLES 公有领域双曲目（字节/音符双端锚）', () => {
    expect(core.STATE_KEY).toBe('ios-desktop:midi-last-v1');
    expect(core.SAMPLES).toHaveLength(2);
    expect(core.SAMPLES.map((s) => s.id)).toEqual(['ode', 'twinkle']);
    const ode = core.SAMPLES[0], tw = core.SAMPLES[1];
    expect(ode.bytes).toBe(562); expect(ode.notes).toBe(62);
    expect(tw.bytes).toBe(414); expect(tw.notes).toBe(42);
    expect(ode.file).toBe('assets/ode-to-joy.mid');
    expect(tw.file).toBe('assets/twinkle.mid');
  });
});

describe('v8.51 #56 注册链：五件套', () => {
  it('apps-data.js：import midiPlayer + initialApps 末位（41 应用）', () => {
    expect(APPSDATA_SRC).toContain("import midiPlayer from './apps/midi-player.js'");
    expect(APPSDATA_SRC).toMatch(/reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio, driving,\s*\n\];/);
  });
  it('apps/midi-player.js：id=midi-player · name=MIDI 播放器 · iframeAppContent', () => {
    expect(SHELL_SRC).toContain("id: 'midi-player'");
    expect(SHELL_SRC).toContain("name: 'MIDI 播放器'");
    expect(SHELL_SRC).toContain("iframeAppContent('apps/midi-player/index.html')");
  });
  it('terminal-core.js：APPS 表入列 midi-player（41 应用）+ resolveTarget 别名（midi/mid/卷帘）', () => {
    expect(TCORE_SRC).toContain("['midi-player', 'MIDI 播放器', 'midi', 'mid', '卷帘']");
    const c2 = { window: {} };
    new Function('window', TCORE_SRC)(c2.window);
    const tc = c2.window.__terminalCore;
    expect(tc.APPS.length).toBe(45);
    expect(tc.resolveTarget('midi')).toEqual({ id: 'midi-player', name: 'MIDI 播放器' });
    expect(tc.resolveTarget('MID')).toEqual({ id: 'midi-player', name: 'MIDI 播放器' });
    expect(tc.resolveTarget('卷帘')).toEqual({ id: 'midi-player', name: 'MIDI 播放器' });
  });
  it('app-icons：midi-player 图标 5 处动态声明 + viewBox/自闭合纪律', () => {
    const m = ICONS_SRC.match(/'midi-player': `<svg viewBox="0 0 100 100" width="100%" height="100%">([\s\S]*?)<\/svg>`/);
    expect(m).toBeTruthy();
    const svg = m[0];
    expect(svg).not.toContain('Gradient');
    expect(svg).not.toContain('url(');
    const decls = svg.match(/style="[^"]*"/g) || [];
    expect(decls.length).toBe(5);
    for (const d of decls) {
      expect(d).toMatch(/hsl\((calc\(var\(--md-h,215\)\s*[+-]\s*[\d.]+\)|var\(--md-h,215\))\s+[\d.]+%\s+[\d.]+%\)/);
    }
    // 属性字面值只许 hex/none
    const attrs = svg.match(/\s(fill|stroke)="([^"]*)"/g) || [];
    for (const a of attrs) {
      const v = a.match(/="([^"]*)"/)[1];
      expect(v === 'none' || /^#[0-9a-fA-F]{6}$/.test(v)).toBe(true);
    }
  });
  it('icon fixture：midi-player 条目 5 处动态色（全库 241 · v8.55 driving +5）', () => {
    expect(FIXTURE.icons['midi-player']).toBeTruthy();
    expect(FIXTURE.icons['midi-player'].dynamic).toBe(5);
    expect(FIXTURE.icons['midi-player'].colors).toHaveLength(5);
    const total = Object.values(FIXTURE.icons).reduce((s, v) => s + (v.colors || []).length, 0);
    expect(total).toBe(241);
  });
});

describe('v8.51 #56 页面接线（index.html + app.mjs）', () => {
  it('index.html：freeze-shim 最先 + md3-tokens.css + core 脚本挂载', () => {
    expect(PAGE_SRC.indexOf('../freeze-shim.js')).toBeGreaterThan(-1);
    expect(PAGE_SRC.indexOf('../freeze-shim.js')).toBeLessThan(PAGE_SRC.indexOf('../../js/midi-player-core.js'));
    expect(PAGE_SRC).toContain('../_shared/md3-tokens.css');
    expect(PAGE_SRC).toContain('<script src="../../js/midi-player-core.js"></script>');
  });
  it('index.html：元件骨架 midi-player(visualizer 绑定) + midi-visualizer(piano-roll)', () => {
    expect(PAGE_SRC).toContain('<midi-player id="mpPlayer" data-test="mp-player" visualizer="#mpViz"></midi-player>');
    expect(PAGE_SRC).toContain('<midi-visualizer id="mpViz" data-test="mp-viz" type="piano-roll"></midi-visualizer>');
  });
  it('index.html：深链 inline 缓冲（HTML 解析期注册，module defer 先手纪律）', () => {
    expect(PAGE_SRC).toContain('window.__mpDeepLink');
    expect(PAGE_SRC).toContain("d.event !== 'midi-player/open'");
    expect(PAGE_SRC.indexOf('__mpDeepLink')).toBeLessThan(PAGE_SRC.indexOf('src="./app.mjs"'));
  });
  it('index.html：导入 sheet 骨架（本地文件/VFS 列表/取消按钮/file input）', () => {
    expect(PAGE_SRC).toContain('id="mpMask"');
    expect(PAGE_SRC).toContain('id="mpVfsList"');
    expect(PAGE_SRC).toContain('id="mpSheetCancel"');
    expect(PAGE_SRC).toContain('accept=".mid,.midi,audio/midi,audio/x-midi"');
  });
  it('app.mjs：vendor bundle 导入（离线内嵌零 CDN）+ core 守卫', () => {
    expect(APP_MJS_SRC).toContain("import '../_shared/vendor/midi-player-bundle.mjs'");
    expect(APP_MJS_SRC).toContain('window.__midiPlayerCore');
    expect(APP_MJS_SRC).toMatch(/if \(!core\) return;/);
  });
  it('app.mjs：载入统一走 parseMidiHeader + scanNoteCount + blob URL（OPFS 二进制纪律）', () => {
    expect(APP_MJS_SRC).toContain('core.parseMidiHeader(buf)');
    expect(APP_MJS_SRC).toContain('core.scanNoteCount(buf)');
    expect(APP_MJS_SRC).toContain('createObjectURL');
    expect(APP_MJS_SRC).toContain("type: 'audio/midi'");
    expect(APP_MJS_SRC).toContain('revokeObjectURL');       // URL 泄漏纪律
  });
  it('app.mjs：空曲目拒绝（0 音符 → magenta 可视化 totalTime 定尺 throw 的整类防御）', () => {
    expect(APP_MJS_SRC).toContain('notes === 0');
    expect(APP_MJS_SRC).toContain('空曲目（0 音符），无法播放');
    // 拒绝发生在 blob URL 创建之前（零资源泄漏）
    const lb = APP_MJS_SRC.slice(APP_MJS_SRC.indexOf('function loadBytes'), APP_MJS_SRC.indexOf('function loadSample'));
    expect(lb.indexOf('空曲目')).toBeGreaterThan(-1);
    expect(lb.indexOf('空曲目')).toBeLessThan(lb.indexOf('createObjectURL'));
  });
  it('app.mjs：未播先渲 + 静态卷帘（totalTime>0 守卫）+ 元件就绪后重锚可视化绑定', () => {
    expect(APP_MJS_SRC).toContain('ns.totalTime > 0) viz.noteSequence = ns');
    expect(APP_MJS_SRC).toContain("player.setVisualizerSelector('#mpViz')");
    // 重锚注释须说明 define 顺序根因（midi-player 先于 midi-visualizer upgrade）
    expect(APP_MJS_SRC).toContain("customElements.define('midi-player') 先于 define('midi-visualizer')");
  });
  it('app.mjs：切歌先 stop 旧播放（无音频泄漏纪律）', () => {
    expect(APP_MJS_SRC).toContain('function stopPlayback()');
    expect(APP_MJS_SRC).toContain('player.stop()');
    // loadBytes 内先 stop/release 再换 src
    const lb = APP_MJS_SRC.slice(APP_MJS_SRC.indexOf('function loadBytes'), APP_MJS_SRC.indexOf('function loadSample'));
    expect(lb.indexOf('stopPlayback()')).toBeGreaterThan(-1);
    expect(lb.indexOf('releaseBlobUrl()')).toBeGreaterThan(-1);
    expect(lb.indexOf('stopPlayback()')).toBeLessThan(lb.indexOf('player.src'));
  });
  it('app.mjs：生命周期三路停播（APP_FREEZE 消息 / app-freeze DOM / pagehide·beforeunload）', () => {
    expect(APP_MJS_SRC).toContain("e.data.type === 'APP_FREEZE'");
    expect(APP_MJS_SRC).toContain("addEventListener('app-freeze'");
    expect(APP_MJS_SRC).toContain("addEventListener('pagehide', stopPlayback)");
    expect(APP_MJS_SRC).toContain("addEventListener('beforeunload', stopPlayback)");
  });
  it('app.mjs：导入 overlay 取消路径四件套（#55 纪律：cancel/onchange 分支外关闭/Escape 消费/背景点击）', () => {
    expect(APP_MJS_SRC).toContain("fileInput.addEventListener('cancel', function () { closeSheet(); })");
    expect(APP_MJS_SRC).toContain('closeSheet();                            // 选中/取消都收起');
    expect(APP_MJS_SRC).toContain('ev.stopImmediatePropagation()');
    expect(APP_MJS_SRC).toContain('if (ev.target === mask) closeSheet()');
    expect(APP_MJS_SRC).toContain("fileInput.value = ''");   // 复位支持同文件重选
  });
  it('app.mjs：sound-font 懒加载增强 + 失败自动回退（error 态观察）', () => {
    expect(APP_MJS_SRC).toContain("player.setAttribute('sound-font', '')");
    expect(APP_MJS_SRC).toContain('player.removeAttribute');
    expect(APP_MJS_SRC).toContain("classList.contains('error')");
    expect(APP_MJS_SRC).toContain('已回退内置合成');
  });
  it('app.mjs：VFS 扫描走 FS 桥 list(path) + filterMidiEntries + 去重', () => {
    expect(APP_MJS_SRC).toContain("fsCall('list', { path: dir })");
    expect(APP_MJS_SRC).toContain('core.filterMidiEntries');
    expect(APP_MJS_SRC).toContain('/music');
    expect(APP_MJS_SRC).toContain('/documents');
  });
  it('app.mjs：零 innerHTML（纯 DOM API 纪律）+ 示例 chips 从 core.SAMPLES 渲染', () => {
    expect(APP_MJS_SRC).not.toMatch(/\.innerHTML\s*=/);
    expect(APP_MJS_SRC).toContain('core.SAMPLES.forEach');
    expect(APP_MJS_SRC).toContain("mp-sample-' + s.id");
  });
  it('app.mjs：启动恢复上次来源（不自动播放）', () => {
    expect(APP_MJS_SRC).toContain('core.loadState()');
    expect(APP_MJS_SRC).toContain("state.last.type === 'sample'");
    expect(APP_MJS_SRC).toContain("state.last.type === 'vfs'");
  });
});

describe('v8.51 #56 vendor bundle 与资产', () => {
  const BUNDLE = join(ROOT, 'ios-desktop/apps/_shared/vendor/midi-player-bundle.mjs');
  it('bundle 在库且体积受控（100KB–700KB）', () => {
    const st = statSync(BUNDLE);
    expect(st.size).toBeGreaterThan(100 * 1024);
    expect(st.size).toBeLessThan(700 * 1024);
  });
  it('bundle 零 tfjs 残留 + 双 custom element 注册（漏一个符号=全 module 哑火的反例锚）', () => {
    const src = readFileSync(BUNDLE, 'utf8');
    expect(src).not.toContain('setBackend');
    expect(src).not.toContain('@tensorflow');
    expect((src.match(/customElements\.define/g) || []).length).toBe(2);
  });
  it('样例 MIDI 资产落库且头字节合法（MThd 魔数）', () => {
    for (const [f, size] of [['ode-to-joy.mid', 562], ['twinkle.mid', 414]]) {
      const st = statSync(join(ROOT, 'ios-desktop/apps/midi-player/assets', f));
      expect(st.size).toBe(size);
      const buf = readFileSync(join(ROOT, 'ios-desktop/apps/midi-player/assets', f));
      expect([buf[0], buf[1], buf[2], buf[3]]).toEqual([0x4D, 0x54, 0x68, 0x64]);
    }
  });
  it('生成脚本在库（可复现纪律）', () => {
    const gen = readFileSync(join(ROOT, 'scripts/gen-sample-midis.py'), 'utf8');
    expect(gen).toContain('ode-to-joy.mid');
    expect(gen).toContain('twinkle.mid');
    expect(gen).toContain('公有领域');
  });
});
