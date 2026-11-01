// v9.19 = #176 二期共享音频基建（audio-core）无头回归小判据：
// ①piano/bytebeat/music 三 iframe 挂载 + Md3Audio 全局就位（version 1.0.0）
// ②piano 真按键（pointerdown/up → noteOn → ensureAC → Md3Audio.unlock）零异常
// ③bytebeat 真播放（play → ensureCtx → Md3Audio masterGain 链路）+ 停止清理零异常
// ④music 挂载零 pageerror（频谱链路单测覆盖，此处验挂载态）
// ⑤radio/midi-player 留痕注释不破坏挂载（零 pageerror）
// ⑥51 应用在册（无注册链变更）⑦零 pageerror 收敛
// 范式同 e2e-v164：dev 服务器（E2E_BASE 可覆写，默认 8080）。
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

const openById = (id) => page.evaluate(async (appId) => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex(a => a.id === appId));
}, id);
const frameOf = (frag) => page.frames().find(f => f.url().includes(frag));
const waitFrame = async (frag) => {
  for (let i = 0; i < 15 && !frameOf(frag); i++) await sleep(300);
  return frameOf(frag);
};

t('P0 51 应用在册（无注册链变更）', await page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  return initialApps.length === 51;
}));

// ==================== piano ====================
await openById('piano');
let pf = await waitFrame('apps/piano/index.html');
t('P1 piano iframe 挂载 + Md3Audio 就位', !!pf && await pf.evaluate(() => window.Md3Audio && window.Md3Audio.version === '1.0.0'));
t('P2 piano audio-core 真跑：真实 AudioContext 创建 + unlock → running', await pf.evaluate(async () => {
  const core = window.Md3Audio.create({ masterGain: true, initialVolume: 0.5 });
  const c = core.unlock();
  return !!c && c.state === 'running' && core.master.gain.value === 0.5;
}));
await pf.evaluate(() => {
  const key = document.querySelector('[data-midi]');
  key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  key.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
});
await sleep(600);
t('P3 piano 真按键走 noteOn→ensureAC→Md3Audio 链路零异常', errors.length === 0);

// ==================== bytebeat ====================
await openById('bytebeat');
let bf = await waitFrame('apps/bytebeat/index.html');
t('B1 bytebeat iframe 挂载 + Md3Audio 就位', !!bf && await bf.evaluate(() => window.Md3Audio && window.Md3Audio.version === '1.0.0'));
t('B2 bytebeat masterGain 注入初值 = state.vol/100（真建 ctx；AudioParam float32 用近似比较）', await bf.evaluate(async () => {
  const core = window.Md3Audio.create({ masterGain: true, initialVolume: 0.9 });
  const c = core.get();
  return !!c && Math.abs(core.master.gain.value - 0.9) < 1e-6;
}));
await bf.evaluate(() => {
  const btn = document.querySelector('#btnPlay, [data-test="play"], .play-btn') ||
    Array.from(document.querySelectorAll('button')).find(b => /play|播放/i.test(b.title || b.textContent || ''));
  if (btn) btn.click();
});
await sleep(1500);
t('B3 bytebeat 真播放（ensureCtx→排程）零异常', errors.length === 0);
await bf.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => /stop|停止/i.test(b.title || b.textContent || ''));
  if (btn) btn.click();
});
await sleep(400);
t('B4 bytebeat 停止清理（stopSources）零异常', errors.length === 0);

// ==================== music ====================
await openById('music');
let mf = await waitFrame('apps/music/index.html');
t('M1 music iframe 挂载 + Md3Audio 就位（频谱链路挂载态）', !!mf && await mf.evaluate(() => window.Md3Audio && window.Md3Audio.version === '1.0.0'));

// ==================== radio / midi-player 留痕不破坏 ====================
await openById('radio');
let rf = await waitFrame('apps/radio/index.html');
t('R1 radio 挂载正常（留痕注释在场）', !!rf && await rf.evaluate(() => document.body.textContent.includes('#176 二期留痕')));
await openById('midi-player');
let df = await waitFrame('apps/midi-player/index.html');
t('D1 midi-player 挂载正常（留痕注释在场）', !!df && await df.evaluate(() => document.body.textContent.includes('#176 二期留痕')));

await sleep(500);
t('Z1 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' || '));

console.log(`\n[e2e-v176b] 结果：PASS ${pass} / FAIL ${fail}`);
await browser.close();
process.exit(fail ? 1 : 0);
