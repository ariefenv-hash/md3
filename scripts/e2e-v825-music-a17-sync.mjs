// ==================== e2e-v825-music-a17-sync.mjs — #46 无头回归 ====================
//
// DoD（议题 #46 音乐应用三联动）：
//   A. 暂停初态：按钮 72×48 胶囊 computed + borderRadius 48px + 图标 play 三角端点
//      （M-4.69）+ 波浪元素在位（.aosp-media-wave 挂 seekTrack）
//   B. 点击播放：脉冲 scale 峰值 >1.1（rAF 采样序列）；spring 落定后 borderRadius→16px；
//      图标 morph 至 pause 双杠端点（M-5.06）+ path2 translateX→19.4953
//   C. 播放中波浪：d 属性随帧变化（两次采样不同 = 波形左移）+ thumb 随真音频推进
//      + stroke 色 = 主题 resolve（--c-ink computed）
//   D. 点击暂停：borderRadius 回 48px + 图标回 play 三角
//   E. 快速连点 5 次（80ms）：终态与 audio.paused 一致（morph 不炸不丢帧）、零 pageerror
//   F. seek 转发：slider input 50% → 波浪 thumb 即时落位 ≈50% 宽
// 驱动：真实导航（解锁 → 桌面图标 → 音乐应用）+ ffmpeg 造真 wav（真解码播放）。

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v825');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 造真音频（sine 440Hz 8s，PCM16 wav —— Chromium 原生解码） ----
const WAV = join(OUT, 'e2e-tone.wav');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi',
  '-i', 'sine=frequency=440:duration=8', '-ar', '44100', '-ac', '2',
  '-c:a', 'pcm_s16le', WAV]);
const wavB64 = readFileSync(WAV).toString('base64');

// ---- 静态服务兜底（8081 无响应则自起，退出时关） ----
let serverProc = null;
async function ensureServer() {
  try {
    const r = await fetch('http://127.0.0.1:8081/ios-desktop/index.html', { method: 'HEAD' });
    if (r.ok) return;
  } catch (e) { /* 未起 */ }
  serverProc = spawn('python3', ['-m', 'http.server', '8081',
    '--directory', root], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const r = await fetch('http://127.0.0.1:8081/ios-desktop/index.html', { method: 'HEAD' });
      if (r.ok) return;
    } catch (e) {}
  }
  throw new Error('static server 8081 failed to start');
}
await ensureServer();

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

// 真实坐标点击播放按钮（手势保障 autoplay）。取按钮上半部（top+14）：移动端
// fixed bottom 面板按钮中心（y≈862）落入宿主 gesture-bar-container 抓握区
// （bottom 0 / height 38 / z-index 550，AOSP 手势范式，既有布局非本议题引入）
const btnPoint = () => page.evaluate(() => {
  const ifr = [...document.querySelectorAll('iframe')].find((f) => {
    const p = f.closest('.app-page'); return p && p.offsetParent !== null;
  });
  const btn = ifr.contentDocument.getElementById('btnPlayPause');
  const r = btn.getBoundingClientRect();
  const ir = ifr.getBoundingClientRect();
  return { x: ir.left + r.left + r.width / 2, y: ir.top + r.top + 14 };
});

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);

// 打开音乐应用（真实图标点击）
await page.evaluate(() => document.querySelector('.app-icon[data-id="music"]').click());
await sleep(1100);

const musicIfr = () => page.evaluate(() => {
  const ifr = [...document.querySelectorAll('iframe')].find((f) => {
    const p = f.closest('.app-page'); return p && p.offsetParent !== null;
  });
  return ifr && ifr.contentDocument ? true : false;
});
A('PRE 音乐应用 iframe 就位', await musicIfr());

// File 注入真 wav → 曲库（addExternalTrack 不自动装载 → loadTrack(0,false) 手动装载）
await page.evaluate(async (b64) => {
  const ifr = [...document.querySelectorAll('iframe')].find((f) => {
    const p = f.closest('.app-page'); return p && p.offsetParent !== null;
  });
  const doc = ifr.contentDocument, win = ifr.contentWindow;
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const dt = new win.DataTransfer();
  dt.items.add(new win.File([bytes], 'e2e-tone.wav', { type: 'audio/wav' }));
  const input = doc.getElementById('audioFileInput');
  input.files = dt.files;
  input.dispatchEvent(new win.Event('change', { bubbles: true }));
}, wavB64);
await sleep(800);
await page.evaluate(() => {
  const ifr = [...document.querySelectorAll('iframe')].find((f) => {
    const p = f.closest('.app-page'); return p && p.offsetParent !== null;
  });
  ifr.contentWindow.__cwApp.loadTrack(0, false);
});
await sleep(600);

// ---------- A. 暂停初态 ----------
console.log('A. 暂停初态（胶囊/圆角/play 三角/波浪在位）');
{
  const st = await page.evaluate(() => {
    const ifr = [...document.querySelectorAll('iframe')].find((f) => {
      const p = f.closest('.app-page'); return p && p.offsetParent !== null;
    });
    const doc = ifr.contentDocument, win = ifr.contentWindow;
    const btn = doc.getElementById('btnPlayPause');
    const cs = win.getComputedStyle(btn);
    const paths = btn.querySelectorAll('svg path');
    const track = doc.getElementById('seekTrack');
    const wave = track && track.querySelector('.aosp-media-wave');
    const svg = wave && wave.querySelector('svg');
    const line = svg && svg.querySelector('line');
    return {
      w: cs.width, h: cs.height, radius: cs.borderRadius,
      pathCount: paths.length,
      d1: paths[0] ? paths[0].getAttribute('d') : '',
      d1head: paths[0] ? (paths[0].getAttribute('d') || '').slice(0, 13) : '',
      waveInTrack: !!wave,
      lineStroke: line ? line.getAttribute('stroke') : '',
      tracks: doc.getElementById('trackListContainer').children.length,
      paused: ifr.contentWindow.__cwApp.audio.paused,
      duration: ifr.contentWindow.__cwApp.audio.duration,
    };
  });
  A('A1 曲库+装载（duration>0）', st.tracks >= 1 && st.duration > 0, `tracks=${st.tracks} dur=${st.duration.toFixed(1)}`);
  A('A2 按钮 72×48 胶囊', st.w === '72px' && st.h === '48px', `${st.w}×${st.h}`);
  A('A3 暂停端 borderRadius=48px', st.radius === '48px', st.radius);
  A('A4 图标双 path（morph 引擎接管）', st.pathCount === 2, `n=${st.pathCount}`);
  A('A5 暂停态显示 play 三角端点（p=0 lerpSeq 输出）', st.d1head.startsWith('M-4.690'), st.d1head);
  A('A6 波浪挂载 seekTrack', st.waveInTrack);
  A('A7 波浪 inactive 色 = 主题 resolve（浅色主题→深 ink 30%）',
    /0\.3\)$/.test(st.lineStroke || '') && !/255,\s*255,\s*255/.test(st.lineStroke || ''), st.lineStroke);
}

// ---------- B. 点击播放（脉冲 + 圆角 morph + 图标 morph） ----------
console.log('B. 播放态（脉冲峰值/圆角 16/pause 杠/translateX）');
{
  // rAF 采样 transform 序列（300ms）→ 点击 → 收序列
  const sampler = page.evaluate(() => {
    const ifr = [...document.querySelectorAll('iframe')].find((f) => {
      const p = f.closest('.app-page'); return p && p.offsetParent !== null;
    });
    const doc = ifr.contentDocument, win = ifr.contentWindow;
    const btn = doc.getElementById('btnPlayPause');
    const seq = [];
    const t0 = win.performance.now();
    return new Promise((res) => {
      const tick = (now) => {
        seq.push(btn.style.transform || '');
        if (now - t0 < 400) win.requestAnimationFrame(tick); else res(seq);
      };
      win.requestAnimationFrame(tick);
    });
  });
  // 点击已在顶层 btnPoint（含 gesture-bar 抓握区规避注释）
  const btnBox = await btnPoint();
  const hit = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return el ? (el.tagName + '.' + (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className)) : 'null';
  }, btnBox);
  console.log(`    [debug] click target (${btnBox.x.toFixed(0)},${btnBox.y.toFixed(0)}) → ${hit}`);
  const seqPromise = sampler;
  await page.mouse.click(btnBox.x, btnBox.y);
  const seq = await seqPromise;
  let maxScale = 0;
  for (const s of seq) {
    const m = /scale\(([\d.]+)\)/.exec(s);
    if (m) maxScale = Math.max(maxScale, parseFloat(m[1]));
  }
  A('B1 脉冲峰值 scale>1.1（A17 1.125 tween）', maxScale > 1.1, `max=${maxScale.toFixed(3)} frames=${seq.length}`);

  await sleep(900); // spring/tween 落定
  const st = await page.evaluate(() => {
    const ifr = [...document.querySelectorAll('iframe')].find((f) => {
      const p = f.closest('.app-page'); return p && p.offsetParent !== null;
    });
    const doc = ifr.contentDocument, win = ifr.contentWindow;
    const btn = doc.getElementById('btnPlayPause');
    const cs = win.getComputedStyle(btn);
    const p1 = btn.querySelectorAll('svg path')[0];
    const p2 = btn.querySelectorAll('svg path')[1];
    return {
      radius: cs.borderRadius,
      d1head: (p1.getAttribute('d') || '').slice(0, 13),
      tx: /translate\(([-\d.]+)/.exec(p2.getAttribute('transform') || '')?.[1],
      playing: !!win.__cwApp.isPlaying,
      paused: win.__cwApp.audio.paused,
    };
  });
  A('B2 播放态生效（audio 真解码）', st.playing && !st.paused);
  A('B3 圆角 morph→16px（spring 落定 ±1）', Math.abs(parseFloat(st.radius) - 16) <= 1, st.radius);
  A('B4 图标 morph→pause 双杠端点', st.d1head.startsWith('M-5.060'), st.d1head);
  A('B5 path2 translateX→19.4953（Δ=7.909 与 AVD 一致）', Math.abs(parseFloat(st.tx) - 19.4953) < 0.01, st.tx);
}

// ---------- C. 播放中波浪 ----------
console.log('C. 播放中波浪（d 随帧变化/thumb 推进/进度外推）');
{
  const s1 = await page.evaluate(() => {
    const ifr = [...document.querySelectorAll('iframe')].find((f) => {
      const p = f.closest('.app-page'); return p && p.offsetParent !== null;
    });
    const doc = ifr.contentDocument;
    const wave = doc.querySelector('#seekTrack .aosp-media-wave');
    const path = wave.querySelector('path[clip-path]');
    const thumb = wave.lastElementChild;
    return { d: path.getAttribute('d'), thumbLeft: thumb.style.left, t: performance.now() };
  });
  await sleep(500);
  const s2 = await page.evaluate(() => {
    const ifr = [...document.querySelectorAll('iframe')].find((f) => {
      const p = f.closest('.app-page'); return p && p.offsetParent !== null;
    });
    const doc = ifr.contentDocument;
    const wave = doc.querySelector('#seekTrack .aosp-media-wave');
    const path = wave.querySelector('path[clip-path]');
    const thumb = wave.lastElementChild;
    const app = ifr.contentWindow.__cwApp;
    return { d: path.getAttribute('d'), thumbLeft: thumb.style.left,
      progress: app.audio.currentTime, label: doc.getElementById('currentTimeLabel').textContent };
  });
  A('C1 波形 d 随帧变化（播放左移）', s1.d !== s2.d);
  A('C2 thumb 随真音频推进', parseFloat(s2.thumbLeft) !== parseFloat(s1.thumbLeft), `${s1.thumbLeft} → ${s2.thumbLeft}`);
  A('C3 进度>0 且时间标签刷新', s2.progress > 0 && s2.label !== '00:00', `t=${s2.progress.toFixed(1)}s ${s2.label}`);
  await page.screenshot({ path: join(OUT, 'v825-music-playing.png') });
}

// ---------- D. 暂停回位 ----------
console.log('D. 暂停回位（圆角 48/play 三角）');
{
  const btnBox = await btnPoint();
  await page.mouse.click(btnBox.x, btnBox.y);
  await sleep(900);
  const st = await page.evaluate(() => {
    const ifr = [...document.querySelectorAll('iframe')].find((f) => {
      const p = f.closest('.app-page'); return p && p.offsetParent !== null;
    });
    const doc = ifr.contentDocument, win = ifr.contentWindow;
    const btn = doc.getElementById('btnPlayPause');
    return {
      radius: win.getComputedStyle(btn).borderRadius,
      d1head: (btn.querySelectorAll('svg path')[0].getAttribute('d') || '').slice(0, 13),
      paused: win.__cwApp.audio.paused,
    };
  });
  A('D1 暂停生效', st.paused);
  A('D2 圆角回 48px', Math.abs(parseFloat(st.radius) - 48) <= 1, st.radius);
  A('D3 图标回 play 三角', st.d1head.startsWith('M-4.690'), st.d1head);
}

// ---------- E. 快速连点（morph 不炸） ----------
console.log('E. 快速连点 5 次（80ms 间隔，终态一致性）');
{
  const btnBox = await btnPoint();
  for (let i = 0; i < 5; i++) { await page.mouse.click(btnBox.x, btnBox.y); await sleep(80); }
  await sleep(1000);
  const st = await page.evaluate(() => {
    const ifr = [...document.querySelectorAll('iframe')].find((f) => {
      const p = f.closest('.app-page'); return p && p.offsetParent !== null;
    });
    const doc = ifr.contentDocument, win = ifr.contentWindow;
    const btn = doc.getElementById('btnPlayPause');
    const d1 = (btn.querySelectorAll('svg path')[0].getAttribute('d') || '').slice(0, 12);
    return { paused: win.__cwApp.audio.paused, d1head: d1.slice(0, 13),
      radius: win.getComputedStyle(btn).borderRadius };
  });
  // 奇数次点击（5）相对 D 暂停态 → 播放中 → pause 杠端点
  const expectPauseIcon = !st.paused; // paused=false → 播放中 → 杠
  const iconOk = expectPauseIcon ? st.d1head.startsWith('M-5.060') : st.d1head.startsWith('M-4.690');
  const radiusOk = expectPauseIcon ? Math.abs(parseFloat(st.radius) - 16) <= 1 : Math.abs(parseFloat(st.radius) - 48) <= 1;
  A('E1 终态图标与播放状态一致', iconOk, `paused=${st.paused} d=${st.d1head}`);
  A('E2 终态圆角与播放状态一致', radiusOk, st.radius);
  await page.screenshot({ path: join(OUT, 'v825-music-final.png') });
}

// ---------- F. seek 转发即时跟随 ----------
console.log('F. seek 即时跟随（slider 50% → thumb 落位）');
{
  const r = await page.evaluate(() => {
    const ifr = [...document.querySelectorAll('iframe')].find((f) => {
      const p = f.closest('.app-page'); return p && p.offsetParent !== null;
    });
    const doc = ifr.contentDocument, win = ifr.contentWindow;
    const slider = doc.getElementById('seekSlider');
    slider.value = 50;
    slider.dispatchEvent(new win.Event('input', { bubbles: true }));
    const wave = doc.querySelector('#seekTrack .aosp-media-wave');
    const trackW = doc.getElementById('seekTrack').clientWidth;
    const thumbLeft = parseFloat(wave.lastElementChild.style.left);
    return { thumbLeft, trackW, ratio: thumbLeft / trackW };
  });
  A('F1 thumb 落位 ≈50%±0.05', Math.abs(r.ratio - 0.5) < 0.05, `ratio=${r.ratio.toFixed(3)}`);
}

// ---------- 全局 ----------
A('G1 零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n==== e2e-v825: ${pass} pass / ${fail} fail ====`);
await browser.close();
if (serverProc) serverProc.kill();
process.exit(fail ? 1 : 0);
