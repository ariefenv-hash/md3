// ==================== e2e-v841-piano.mjs — #57 电子琴无头回归 ====================
//
// DoD（#57 验收原文逐条）：
//   A. 真钢琴键盘 UI（白 14 + 黑 10 两八度 + 键位标签，非按钮拼凑）
//   B. 物理键位 AWSEDFTGYHUJK + 触点支持（pointer events）双输入路径
//   C. 长按无重复触发（e.repeat 守卫）；同 id 重触发先释放
//   D. 复音支持（和弦 3 声部；滑奏 17 连击封顶 VOICES_MAX=16 无爆音）
//   E. 波形切换（sine/triangle/square/sawtooth）+ 八度切换（±2 钳制）
//   F. 曲谱解析 → audioContext 精确排程（stub 录 osc，非 setTimeout）
//   G. 曲谱持久化 piano_score_v1 跨重载
//   H. 零 pageerror
//
// 驱动：__system.openApp('piano') 深链（每次 evaluate 动态重查 iframe —— v840
//       Frame detached 教训）；AudioContext stub addInitScript 注入（早于应用
//       脚本，所有 frame 生效；录音通道挂 iframe 自己的 window —— v839 教训：
//       init script 逐 frame 求值，读宿主 window 永远空数组）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v841');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8082/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// AudioContext stub：FakeOsc 启动即入 __oscLog（每个 frame 自己的 window 上）
await page.addInitScript(() => {
  class FakeParam {
    constructor(v) { this.value = v; this.log = []; }
    setValueAtTime(v, t) { this.log.push(['set', v, t]); this.value = v; }
    linearRampToValueAtTime(v, t) { this.log.push(['ramp', v, t]); this.value = v; }
    cancelScheduledValues(t) { this.log.push(['cancel', t]); }
  }
  class FakeOsc {
    constructor() { this.type = ''; this.frequency = new FakeParam(440); this.startedAt = null; this.stoppedAt = null; this._connected = null; }
    connect(n) { this._connected = n; return n; }
    disconnect() {}
    start(t) { this.startedAt = t; window.__oscLog.push(this); }
    stop(t) { this.stoppedAt = t; }
  }
  class FakeGain {
    constructor() { this.gain = new FakeParam(1); }
    connect(n) { return n; }
    disconnect() {}
  }
  class FakeAC {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createOscillator() { return new FakeOsc(); }
    createGain() { return new FakeGain(); }
  }
  window.AudioContext = FakeAC;
  window.__oscLog = [];
});

await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);

// 图标直击打开电子琴（第 2 页末位 —— v836/v839 直击先例；__system 仅注入 iframe 不在宿主）
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="piano"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});

let ready = false;
for (let i = 0; i < 30; i++) {
  ready = await page.evaluate(() => {
    const f = document.querySelector('.app-window iframe[src*="apps/piano/index.html"]');
    return !!(f && f.contentDocument && f.contentDocument.getElementById('pnKeyboard') &&
              f.contentDocument.querySelectorAll('.pn-white').length > 0);
  });
  if (ready) break;
  await sleep(200);
}
A('piano iframe 在场（键盘就绪）', ready);

// 动态取 iframe（openApp 触发重挂载后 Frame 对象可能失效 —— 每次 evaluate 重查）
const IN_FRAME = (expr) => page.evaluate((src) => {
  const f = document.querySelector('.app-window iframe[src*="apps/piano/index.html"]');
  if (!f) return null;
  return eval(src);
}, expr);

console.log('A. 真钢琴键盘 UI（#57 执行要点：非按钮拼凑）');
const kb = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  const whites = d.querySelectorAll('.pn-white');
  const blacks = d.querySelectorAll('.pn-black');
  const w0 = whites[0], b0 = blacks[0];
  return {
    whites: whites.length, blacks: blacks.length,
    w0midi: w0.dataset.midi, w0bind: w0.querySelector('.pn-bind')?.textContent,
    b0midi: b0.dataset.midi, b0bind: b0.querySelector('.pn-bind')?.textContent,
    b0left: b0.style.left, wLast: whites[13].dataset.note,
    iconOnDesktop: !!document.querySelector('.app-icon[data-id="piano"]'),
    jello: getComputedStyle(w0).transition.includes('cubic-bezier'),
  };
})()`);
A('白键 14 + 黑键 10（2 组八度）', kb && kb.whites === 14 && kb.blacks === 10, `白${kb?.whites}/黑${kb?.blacks}`);
A('C4 绑 A 键 · C#4 绑 W 键（键位标签）', kb && kb.w0midi === '60' && kb.w0bind === 'A' && kb.b0midi === '61' && kb.b0bind === 'W');
A('黑键定位两白键交界（C#4 ≈ 1/14 处）', kb && Math.abs(parseFloat(kb.b0left) - 100 / 14) < 0.01, `left=${kb?.b0left}`);
A('末白键 B5（第 2 组无键位标签）', kb && kb.wLast === 'B5');
A('桌面 piano 图标在场', kb && kb.iconOnDesktop);
A('白键按压果冻回弹曲线（tile-bounce 同源）', kb && kb.jello);

console.log('B. 物理键位 + 长按防重（#57 验收原文）');
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
})()`);
await sleep(120);
let v = await IN_FRAME(`f.contentWindow.__oscLog.filter((o) => o.stoppedAt === null).length`);
let osc0 = await IN_FRAME(`(() => { const o = f.contentWindow.__oscLog.at(-1); return { type: o.type, freq: o.frequency.value }; })()`);
A("按 A → C4 声部（sine 261.63Hz）", v === 1 && osc0.type === 'sine' && Math.abs(osc0.freq - 261.6256) < 0.001, `voices=${v} freq=${osc0?.freq}`);
// 长按重复 keydown（e.repeat=true）→ 不新增声部
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true, repeat: true }));
  d.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true, repeat: true }));
})()`);
v = await IN_FRAME(`f.contentWindow.__oscLog.filter((o) => o.stoppedAt === null).length`);
A('长按 e.repeat 不重复触发（仍 1 声部）', v === 1, `voices=${v}`);
await IN_FRAME(`(() => {
  f.contentDocument.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));
})()`);
await sleep(60);
v = await IN_FRAME(`f.contentWindow.__oscLog.filter((o) => o.stoppedAt === null).length`);
const rel = await IN_FRAME(`(() => { const o = f.contentWindow.__oscLog[0]; return o.stoppedAt !== null; })()`);
A('keyup 释放（voices 0 + osc 已排 stop）', v === 0 && rel, `voices=${v}`);

console.log('C. 触点支持（pointer events 双输入路径）');
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.querySelector('[data-midi="60"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 11 }));
})()`);
v = await IN_FRAME(`f.contentWindow.__oscLog.filter((o) => o.stoppedAt === null).length`);
A('触点白键 C4 → 声部 1', v === 1, `voices=${v}`);
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.querySelector('[data-midi="60"]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 11 }));
})()`);
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.querySelector('[data-midi="61"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 12 }));
})()`);
let osc1 = await IN_FRAME(`(() => { const o = f.contentWindow.__oscLog.at(-1); return { freq: o.frequency.value }; })()`);
A('触点黑键 C#4 → 277.19Hz', Math.abs(osc1.freq - 277.1826) < 0.001, `freq=${osc1?.freq}`);
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.querySelector('[data-midi="61"]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 12 }));
})()`);
await sleep(40);

console.log('D. 复音与爆音保护（#57 验收：滑奏/和弦无爆音）');
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  ['a', 's', 'd'].forEach((k) => d.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })));
})()`);
v = await IN_FRAME(`f.contentWindow.__oscLog.filter((o) => o.stoppedAt === null).length`);
A('三键和弦 → 3 复音', v === 3, `voices=${v}`);
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  for (let i = 0; i < 17; i++) {
    d.querySelector('[data-midi="' + (60 + i) + '"]')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 100 + i }));
  }
})()`);
const capped = await IN_FRAME(`(() => {
  const w = f.contentWindow;
  const active = w.__oscLog.filter((o) => o.stoppedAt === null).length;
  const released = w.__oscLog.filter((o) => o.stoppedAt !== null && o._connected && o._connected.gain.log.some(([m]) => m === 'cancel')).length;
  return { active, released, total: w.__oscLog.length };
})()`);
A('17 连击滑奏封顶 16 复音（最旧释放带 cancel 防爆音）', capped && capped.active === 16 && capped.released >= 4, `active=${capped?.active} released=${capped?.released}`);
await IN_FRAME(`(() => { f.contentWindow.dispatchEvent(new Event('blur')); })()`); // blur 派发到 iframe 自己的 window（evaluate 的 window 是宿主 —— 作用域教训）
await sleep(40);
const afterBlur = await IN_FRAME(`f.contentWindow.__oscLog.filter((o) => o.stoppedAt === null).length`);
A('失焦全释放（防按键卡死）', afterBlur === 0, `voices=${afterBlur}`);

console.log('E. 波形切换 + 八度切换（oscillator 4 形 · ±2 钳制）');
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.querySelector('[data-wave="square"]').click();
  d.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
})()`);
let osc2 = await IN_FRAME(`(() => { const o = f.contentWindow.__oscLog.at(-1); return { type: o.type, freq: o.frequency.value }; })()`);
A('方波 chip → F4 349.23Hz square', osc2.type === 'square' && Math.abs(osc2.freq - 349.2282) < 0.001, `type=${osc2?.type} freq=${osc2?.freq}`);
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.dispatchEvent(new KeyboardEvent('keyup', { key: 'f', bubbles: true }));
})()`);
const octUp = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.getElementById('pnOctUp').click();
  return d.getElementById('pnOctVal').textContent;
})()`);
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
})()`);
let osc3 = await IN_FRAME(`(() => { const o = f.contentWindow.__oscLog.at(-1); return { freq: o.frequency.value }; })()`);
A('八度 +1 → A 键发 C5 523.25Hz', octUp.includes('C5') && Math.abs(osc3.freq - 523.2511) < 0.001, `显示=${octUp.trim()} freq=${osc3?.freq}`);
await IN_FRAME(`(() => { f.contentDocument.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true })); })()`);
// 越界钳制：连点 + 3 次仍停在 C6
const octCap = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.getElementById('pnOctUp').click();
  d.getElementById('pnOctUp').click();
  d.getElementById('pnOctUp').click();
  return d.getElementById('pnOctVal').textContent;
})()`);
A('八度越界钳 +2（连点 3 次停 C6）', octCap.includes('C6'), `显示=${octCap.trim()}`);
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.getElementById('pnOctDown').click();
  d.getElementById('pnOctDown').click();
  return d.getElementById('pnOctVal').textContent;
})()`); // 回 C4

console.log('F. 曲谱解析 + 精确排程（audioContext 时钟）');
const score = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  const ta = d.getElementById('pnScoreText');
  ta.value = 'C4 D4 E4/2';
  d.getElementById('pnPlay').click();
  const hint = d.getElementById('pnHint').textContent;
  return { hint, oscCount: f.contentWindow.__oscLog.length, freqs: f.contentWindow.__oscLog.slice(-3).map((o) => o.frequency.value) };
})()`);
A('播放 3 音符（C4/D4/E4 排程入列）', score && score.hint === '3 音符' && score.freqs.length === 3 &&
  Math.abs(score.freqs[0] - 261.6256) < 0.001 && Math.abs(score.freqs[2] - 329.6276) < 0.001, `hint=${score?.hint}`);
const stopRes = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.getElementById('pnStop').click();
  return d.getElementById('pnHint').textContent === '';
})()`);
A('停止清空排程与提示', stopRes === true);

console.log('G. 曲谱持久化（piano_score_v1 跨重载）');
await IN_FRAME(`(() => { f.contentDocument.getElementById('pnSave').click(); })()`);
const saved = await page.evaluate(() => localStorage.getItem('piano_score_v1'));
A('保存落盘 piano_score_v1', saved === 'C4 D4 E4/2', `val=${JSON.stringify(saved)}`);

// 重挂载验证回填（关闭窗口再图标直击重开）
await page.evaluate(() => {
  const win = document.querySelector('.app-window iframe[src*="apps/piano/index.html"]')?.closest('.app-window');
  const close = win && win.querySelector('.window-close, [data-act="close"], .win-close');
  if (close) close.click();
});
await page.waitForTimeout(400);
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="piano"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});
await sleep(900);
const reloaded = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  return d.getElementById('pnScoreText') ? d.getElementById('pnScoreText').value : null;
})()`);
A('重开回填曲谱（持久化生效）', reloaded === 'C4 D4 E4/2', `val=${JSON.stringify(reloaded)}`);

console.log('H. 截图 + 零 pageerror');
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.querySelector('[data-midi="60"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 }));
})()`);
await sleep(250);
const pianoFrame = await page.evaluateHandle(() => document.querySelector('.app-window iframe[src*="apps/piano/index.html"]'));
const el = await page.evaluateHandle((f) => f.contentDocument.querySelector('.pn-app'), pianoFrame);
await page.evaluate(() => { const f = document.querySelector('.app-window iframe[src*="apps/piano/index.html"]'); if (f) f.contentDocument.querySelector('[data-midi="60"]')?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 })); });
await page.screenshot({ path: join(OUT, 'piano-app.png') });
A('截图 docs/v841/piano-app.png', true);
await page.evaluate(() => { document.querySelector('.app-window')?.remove(); });
await page.screenshot({ path: join(OUT, 'desktop.png') });
A('截图 docs/v841/desktop.png', true);

A('零 pageerror', errors.length === 0, errors.length ? errors.join(' | ').slice(0, 200) : '');

await browser.close();
console.log('\n==== e2e-v841 结果: ' + pass + ' PASS / ' + fail + ' FAIL ====');
process.exit(fail ? 1 : 0);
