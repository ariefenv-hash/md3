// ==================== e2e-v116-media-gain.mjs — #116 媒体 GainNode 音量链（v9.88） ====================
// Q1 本地导入（blob 同源）→ play → GainNode 接管：attached + 元素中性化恒 1 + 增益对齐音量
// Q2 接管后 setVolume(0.25) → 真值走 gain.gain.value，元素仍恒 1（防双层衰减）
// Q3 外链会话（pixabay 被路由拦截=离线语义）→ 不接管直连（audio.volume 直写路径零回归）
// Q4 本地导入后 isPlaying 真（接管不破坏播放链）+ 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8991;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

/** 最小合法 WAV（16-bit PCM 单声道 8kHz 30s 440Hz 正弦）——真字节可解码；
 *  30s 长度防『ended → next() 切回外链』在断言窗口内触发（0.3s 版首跑实踩） */
function buildWav() {
  const sampleRate = 8000, seconds = 30;
  const numSamples = Math.floor(sampleRate * seconds);
  const dataLen = numSamples * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < numSamples; i++) {
    const v = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 12000);
    buf.writeInt16LE(v, 44 + i * 2);
  }
  return buf;
}

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const errors = [];
try {
  // ---------- 会话一：本地导入接管链 ----------
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort()); // 离线语义：外链全拦
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(300);

  const q1 = await page.evaluate(async (wavB64) => {
    const bytes = Uint8Array.from(atob(wavB64), (c) => c.charCodeAt(0));
    const file = new File([bytes], 'e2e-local.wav', { type: 'audio/wav' });
    const { mediaService } = await import('/ios-desktop/js/media-service.js'); // 同 URL → 同单例
    mediaService.importLocalAudio(file);
    await new Promise((r) => setTimeout(r, 800));
    const st = window.__mediaGain ? window.__mediaGain.state() : null;
    return {
      st,
      isPlaying: mediaService.isPlaying,
      trackTitle: mediaService.getCurrentTrack() ? mediaService.getCurrentTrack().title : '',
    };
  }, buildWav().toString('base64'));
  // 增益值容差断言：真实 AudioParam.value 为 float32 存储（0.6 → 0.6000000238…），
  // 精确相等断言反而误伤——容差比较同时证明链路走的是真 AudioContext 非桩
  const gOk = q1.st && q1.st.gainValue != null && Math.abs(q1.st.gainValue - 0.6) < 1e-3;
  A('Q1 本地导入 → GainNode 接管（attached + 元素中性化 + 增益对齐 0.6±float32）',
    q1.st && q1.st.attached === true && q1.st.elementVolume === 1 && gOk,
    JSON.stringify(q1.st));
  A('Q1b 接管不破坏播放链（isPlaying 真 + 当前曲=导入文件）',
    q1.isPlaying === true && q1.trackTitle === 'e2e-local',
    `isPlaying=${q1.isPlaying} title=${q1.trackTitle}`);

  const q2 = await page.evaluate(() => {
    window.__mediaGain.setVolume(0.25);
    return window.__mediaGain.state();
  });
  A('Q2 setVolume(0.25) → 真值走增益 / 元素仍恒 1（双写分流防双层衰减）',
    q2.volume === 0.25 && q2.gainValue === 0.25 && q2.elementVolume === 1,
    JSON.stringify(q2));

  // ---------- 会话二：外链直连零回归（全新页面，模块态重置） ----------
  const page2 = await browser.newPage();
  page2.on('pageerror', (e) => errors.push('P2:' + String(e)));
  await page2.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page2.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page2.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(300);
  const q3 = await page2.evaluate(async () => {
    const { mediaService } = await import('/ios-desktop/js/media-service.js');
    mediaService.play();                       // 默认池 = pixabay 外链（路由拦截 → 播放失败但链路真跑）
    await new Promise((r) => setTimeout(r, 500));
    const st = window.__mediaGain.state();
    // 桌面直写路径仍可用（未接管 → audio.volume 直写）
    mediaService.setVolume(0.4);
    return { st, directVolume: mediaService.audio ? mediaService.audio.volume : null };
  });
  A('Q3 外链会话不接管（attached=false + 未永久封禁 + 直写路径生效 0.4）',
    q3.st.attached === false && q3.st.blocked === false && q3.directVolume === 0.4,
    JSON.stringify({ st: q3.st, directVolume: q3.directVolume }));

  A('Q4 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));
} finally {
  await browser.close();
  server.kill();
}
const fails = results.filter(([c]) => !c);
console.log(`\n=== e2e-v116: ${results.length - fails.length}/${results.length} ===`);
process.exit(fails.length ? 1 : 0);
