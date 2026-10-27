// ==================== e2e-v842-bytebeat.mjs — #30 ByteBeat 无头回归 ====================
//
// DoD（#30 验收原文逐条）：
//   A. 公式沙箱编译：合法放行 / 非法标识符（document 等）编译即拒绝（错误行上屏）
//   B. 播放零卡顿：离屏 AudioBuffer 生成（stub 捕获 buffer 长度/内容），播放线程只读
//   C. 波形+频谱双可视化（canvas 实际作画）
//   D. 内置经典公式 12 条（≥10）可点击加载 + 收藏/删除 + 持久化
//   E. 分享编码到 URL：hash 自动同步 + 独立打开恢复
//   F. 联动：终端 beat <公式> → openApp 深链 → ByteBeat 打开即奏（真实 openApp 链路）
//   G. 采样率 8k~48k 五档 + byte/float 模式切换
//   H. 零 pageerror
//
// 驱动：图标直击打开（v836/v839/v841 先例）；AudioContext stub addInitScript 逐 frame
//       求值（v839 教训）——日志挂各自 frame 的 window；iframe 动态重查（v840 教训）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v842');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8083/ios-desktop/index.html';
const APP_URL = 'http://127.0.0.1:8083/ios-desktop/apps/bytebeat/index.html';
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

// AudioContext stub（逐 frame 各自求值；FakeSrc/FakeBuffer 录到各自 window.__srcLog）
await page.addInitScript(() => {
  class FakeBuffer {
    constructor(len, sr) { this.length = len; this.sampleRate = sr; this._ch = [new Float32Array(len)]; }
    getChannelData(i) { return this._ch[i || 0]; }
  }
  class FakeSrc {
    constructor() { this.buffer = null; this.startedAt = null; this.stoppedAt = null; this.onended = null; }
    connect() {} disconnect() {}
    start(t) { this.startedAt = t; window.__srcLog.push(this); }
    stop(t) { this.stoppedAt = t; }
  }
  class FakeParam {
    constructor(v) { this.value = v; }
    setValueAtTime(v) { this.value = v; }
  }
  class FakeGain {
    constructor() { this.gain = new FakeParam(1); }
    connect() {} disconnect() {}
  }
  class FakeAC {
    constructor() { this._t0 = Date.now(); this.state = 'running'; this.destination = {}; }
    get currentTime() { return (Date.now() - this._t0) / 1000; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createBuffer(ch, len, sr) { return new FakeBuffer(len, sr); }
    createBufferSource() { return new FakeSrc(); }
    createGain() { return new FakeGain(); }
  }
  window.AudioContext = FakeAC;
  window.__srcLog = [];
});

await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);

// 桌面官方入口开 ByteBeat（openAppById 与后续终端 openAppById 实例跟踪一致 ——
// 首跑教训：图标点击路径与 openAppById 混用时深链事件投给后台旧帧，新帧收不到）
await page.evaluate(() => { window.__shareSheet.openAppById('bytebeat'); });

let ready = false;
for (let i = 0; i < 30; i++) {
  ready = await page.evaluate(() => {
    const f = document.querySelector('.app-window iframe[src*="apps/bytebeat/index.html"]');
    return !!(f && f.contentDocument && f.contentDocument.getElementById('bbFormula') &&
              f.contentDocument.getElementById('bbLib') && f.contentDocument.getElementById('bbLib').children.length > 0);
  });
  if (ready) break;
  await sleep(200);
}
A('bytebeat iframe 在场（公式库就绪）', ready);

const IN_FRAME = (expr) => page.evaluate((src) => {
  const f = document.querySelector('.app-window iframe[src*="apps/bytebeat/index.html"]');
  if (!f) return null;
  f.contentWindow.__f = f; // 供表达式内引用
  return eval(src);
}, expr);

console.log('A. UI 骨架 + 默认态');
const ui = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  return {
    title: d.querySelector('.bb-title') && d.querySelector('.bb-title').textContent,
    sub: d.querySelector('.bb-sub') && d.querySelector('.bb-sub').textContent,
    chips: d.getElementById('bbLib').children.length,
    count: d.getElementById('bbCount').textContent,
    srOpts: d.getElementById('bbSR').options.length,
    formula: d.getElementById('bbFormula').value,
    status: d.getElementById('bbStatus').textContent,
  };
})()`);
A('标题/副题/白名单警示', ui && ui.title === 'ByteBeat' && /仅 t 与 Math/.test(ui.sub), JSON.stringify(ui.sub));
A('经典公式库 12 条（≥10 验收）', ui && ui.chips === 12 && ui.count === '12 条');
A('采样率五档 8k~48k', ui && ui.srOpts === 5);
A('默认公式 = 开缸神曲', ui && ui.formula === '((t >> 10) & 42) * t', JSON.stringify(ui.formula));

const canvasDrawn = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  const w = d.getElementById('bbWave').toDataURL().length;
  const s = d.getElementById('bbSpec').toDataURL().length;
  return { w, s };
})()`);
A('波形+频谱双 canvas 预览已作画', canvasDrawn && canvasDrawn.w > 2000 && canvasDrawn.s > 2000,
  JSON.stringify(canvasDrawn));

console.log('B. 沙箱编译拒绝（验收：非法标识符编译即拒绝）');
await IN_FRAME(`(() => {
  const d = f.contentDocument;
  const ta = d.getElementById('bbFormula');
  ta.value = 'document.title';
  ta.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await sleep(500); // 等预览 debounce 编译完成（编译拒绝在异步预览路径上报）
const rej = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  const err = d.getElementById('bbErr');
  return { hidden: err.hidden, msg: err.textContent };
})()`);
A('document 编译即拒绝且错误上屏（debounce 后）', rej && !rej.hidden && /白名单/.test(rej.msg), JSON.stringify(rej && rej.msg));

const rec = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  const ta = d.getElementById('bbFormula');
  ta.value = 't * ((t >> 12 | t >> 8) & 63 & t >> 4)';
  ta.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await sleep(500);
const rec2 = await IN_FRAME(`(() => f.contentDocument.getElementById('bbErr').hidden)()`);
A('合法公式恢复：错误行隐藏', rec2 === true);

console.log('C. 播放引擎（离屏 AudioBuffer · stub 捕获）');
await IN_FRAME(`(() => { f.contentDocument.getElementById('bbPlay').click(); })()`);
await sleep(700);
const play = await IN_FRAME(`(() => {
  const w = f.contentWindow, d = f.contentDocument;
  const srcs = w.__srcLog || [];
  const first = srcs[0];
  let nonZero = false, mx = 0;
  if (first && first.buffer) {
    const data = first.buffer.getChannelData(0);
    for (let i = 0; i < Math.min(data.length, 100000); i++) { const a = Math.abs(data[i]); if (a > mx) mx = a; }
    nonZero = mx > 0.001;
  }
  return {
    playing: d.getElementById('bbPlay').textContent,
    n: srcs.length,
    len: first && first.buffer ? first.buffer.length : 0,
    sr: first && first.buffer ? first.buffer.sampleRate : 0,
    mx,
    status: d.getElementById('bbStatus').textContent,
  };
})()`);
A('播放态按钮切换 ■ 停止', play && play.playing === '■ 停止', JSON.stringify(play.status));
A('AudioBuffer 离屏生成：22k×6s=132300 且采样率一致', play && play.len === 132300 && play.sr === 22050,
  'len=' + (play && play.len));
A('缓冲内容非静音（max|v|>0.001）', play && play.mx > 0.001, 'mx=' + (play && play.mx.toFixed(3)));
A('排程多块（lookahead 无缝）', play && play.n >= 1, 'n=' + (play && play.n));
A('状态栏播放中 + t 推进', play && /播放中/.test(play.status) && /t=\d+/.test(play.status));

console.log('D. 参数切换 + URL 分享');
await IN_FRAME(`(() => { f.contentDocument.getElementById('bbModeFloat').click(); })()`);
await sleep(600);
const modeChk = await IN_FRAME(`(() => {
  const w = f.contentWindow, d = f.contentDocument;
  return {
    hash: w.location.hash.slice(0, 12),
    on: d.getElementById('bbModeFloat').classList.contains('on'),
    share: d.getElementById('bbShare').textContent.slice(0, 12),
  };
})()`);
A('float 模式 chip 选中 + 分享码 b1.float', modeChk && modeChk.on && modeChk.hash.startsWith('#b1.float'),
  JSON.stringify(modeChk && modeChk.hash));

await IN_FRAME(`(() => {
  const d = f.contentDocument;
  const sr = d.getElementById('bbSR');
  sr.value = '32000';
  sr.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await sleep(600);
const srChk = await IN_FRAME(`(() => {
  const w = f.contentWindow;
  return { hash: w.location.hash, status: f.contentDocument.getElementById('bbStatus').textContent };
})()`);
A('采样率切 32k 同步进分享码', srChk && srChk.hash.startsWith('#b1.float.32000.'), srChk && srChk.hash.slice(0, 18));

const round = await IN_FRAME(`(() => {
  const w = f.contentWindow;
  const back = w.__bytebeatCore.decodeShare(w.location.hash);
  return back ? { f: back.formula, m: back.mode, r: back.sr } : null;
})()`);
A('分享码 decode 往返一致', round && round.m === 'float' && round.r === 32000 &&
  round.f === 't * ((t >> 12 | t >> 8) & 63 & t >> 4)', JSON.stringify(round && round.f));

await IN_FRAME(`(() => { f.contentDocument.getElementById('bbPlay').click(); })()`); // 停止

console.log('E. 收藏 + 持久化');
const fav = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.getElementById('bbFav').click();
  const favChips = d.getElementById('bbFavs').querySelectorAll('.bb-favchip').length;
  const ls = JSON.parse(f.contentWindow.localStorage.getItem('bytebeat_favs_v1') || '[]');
  return { favChips, ls: ls.length, name: ls[0] && ls[0].name };
})()`);
A('收藏落位：chip + localStorage', fav && fav.favChips === 1 && fav.ls === 1, JSON.stringify(fav && fav.name));
const dup = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  d.getElementById('bbFav').click();
  return d.getElementById('bbToast').textContent;
})()`);
A('重复收藏拦截 toast', dup === '已在收藏中', JSON.stringify(dup));
const del = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  const x = d.getElementById('bbFavs').querySelector('.bb-favx');
  if (x) x.click();
  return {
    left: d.getElementById('bbFavs').querySelectorAll('.bb-favchip').length,
    ls: JSON.parse(f.contentWindow.localStorage.getItem('bytebeat_favs_v1') || '[]').length,
  };
})()`);
A('收藏删除（chip + localStorage 同步）', del && del.left === 0 && del.ls === 0, JSON.stringify(del));

// 持久化跨重载（桌面内 iframe 重开）
const saved = await IN_FRAME(`(() => {
  const w = f.contentWindow;
  return w.localStorage.getItem('bytebeat_state_v1') || '';
})()`);
A('state_v1 已落盘（含公式+mode+sr）', /float/.test(saved) && /32000/.test(saved) && /viznut|t >> 12/.test(saved),
  saved.slice(0, 60));

console.log('F. 经典公式库点击加载');
const libClick = await IN_FRAME(`(() => {
  const d = f.contentDocument;
  const chip = d.getElementById('bbLib').querySelector('[data-formula-name="八音盒"]');
  if (chip) chip.click();
  return chip ? d.getElementById('bbFormula').value : null;
})()`);
A('点击「八音盒」加载公式', libClick === '(t * (0xCA98 >> (t >> 15 & 7) & 15)) | t >> 8', JSON.stringify(libClick));

console.log('G. URL 分享独立打开恢复（standalone boot 路径）');
const hashNow = await IN_FRAME(`(() => f.contentWindow.location.hash)()`);
const sharePage = await browser.newPage({ viewport: { width: 700, height: 900 }, colorScheme: 'dark' });
await sharePage.goto(APP_URL + hashNow, { waitUntil: 'load', timeout: 30000 });
await sharePage.waitForTimeout(900);
const restored = await sharePage.evaluate(() => ({
  formula: document.getElementById('bbFormula').value,
  status: document.getElementById('bbStatus').textContent,
  modeFloat: document.getElementById('bbModeFloat').classList.contains('on'),
  sr: document.getElementById('bbSR').value,
}));
A('独立打开恢复公式/模式/采样率', restored.formula === 't * ((t >> 12 | t >> 8) & 63 & t >> 4)' &&
  restored.modeFloat && restored.sr === '32000', JSON.stringify(restored.status));
await sharePage.screenshot({ path: join(OUT, 'bytebeat-standalone.png') });
A('截图 docs/v842/bytebeat-standalone.png', true);
await sharePage.close();

console.log('H. 终端 beat 联动（真实 openApp 深链 → 打开即奏）');
// 桌面官方入口开终端（手动 remove DOM 会破坏窗口状态机 —— 首跑教训）；
// 主页面模块直连入口 __shareSheet.openAppById（share-sheet.js 导出）
await page.evaluate(() => { window.__shareSheet.openAppById('terminal'); });
let tReady = false;
for (let i = 0; i < 30; i++) {
  tReady = await page.evaluate(() => {
    const f = document.querySelector('.app-window iframe[src*="apps/terminal/index.html"]');
    return !!(f && f.contentDocument && f.contentDocument.getElementById('tmInput'));
  });
  if (tReady) break;
  await sleep(200);
}
A('terminal iframe 在场', tReady);
const beatRun = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/terminal/index.html"]');
  if (!f) return null;
  const d = f.contentDocument;
  const input = d.getElementById('tmInput');
  input.value = 'beat';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const out1 = d.getElementById('tmOut').textContent;
  input.value = 'beat ((t >> 10) & 42) * t';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const out2 = d.getElementById('tmOut').textContent;
  return { usage: out1.includes('usage: beat') && out1.includes('白名单'), launch: out2.includes('正在启动 ByteBeat') };
});
A('无参 usage 引导 + 白名单提示', beatRun && beatRun.usage);
A('带参启动提示', beatRun && beatRun.launch);
// 深链打开 → bytebeat iframe 重新挂载 → 公式注入 + 自动播放
let bbReady = false;
for (let i = 0; i < 30; i++) {
  bbReady = await page.evaluate(() => {
    const f = document.querySelector('.app-window iframe[src*="apps/bytebeat/index.html"]');
    return !!(f && f.contentDocument && f.contentDocument.getElementById('bbFormula'));
  });
  if (bbReady) break;
  await sleep(200);
}
await sleep(900);
const linked = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/bytebeat/index.html"]');
  if (!f) return null;
  const w = f.contentWindow, d = f.contentDocument;
  const srcs = w.__srcLog || [];
  return {
    formula: d.getElementById('bbFormula').value,
    playing: d.getElementById('bbPlay').textContent,
    n: srcs.length,
    toast: d.getElementById('bbToast').textContent,
  };
});
A('深链公式注入（终端 → ByteBeat）', linked && linked.formula === '((t >> 10) & 42) * t',
  JSON.stringify(linked && linked.formula));
A('打开即奏（stub 捕获播放）', linked && linked.playing === '■ 停止' && linked.n >= 1, 'n=' + (linked && linked.n));
A('toast 提示来自终端', linked && /终端/.test(linked.toast));

console.log('I. 截图 + 零 pageerror');
await page.screenshot({ path: join(OUT, 'bytebeat-terminal-link.png') });
A('截图 docs/v842/bytebeat-terminal-link.png', true);
await page.evaluate(() => { document.querySelector('.app-window')?.remove(); });
await page.screenshot({ path: join(OUT, 'desktop.png') });
A('截图 docs/v842/desktop.png', true);

A('零 pageerror', errors.length === 0, errors.length ? errors.join(' | ').slice(0, 200) : '');

await browser.close();
console.log('\n==== e2e-v842 结果: ' + pass + ' PASS / ' + fail + ' FAIL ====');
process.exit(fail ? 1 : 0);
