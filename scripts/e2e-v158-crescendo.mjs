// ==================== e2e-v158-crescendo.mjs — #158 加分项行为真跑（v9.40 · R58 窗） ====================
// 坑在录：无头页面被 Chrome 视为 hidden → setInterval/setTimeout intensive throttling 批量执行
//（Q2b 窗内 ringInt 与 resolve 同批补跑）——e2e 全部改「同步调用+同步捕获」路径，
// computeVolume 递增曲线在浏览器内直调三点（真跑 clock-core 代码）验证。
// Q1 crescendoSelect 默认 0（AOSP 权威默认逐字）
// Q2 渐强 30s 会话：sR 落 stopTime + 同步首播标量≈0（setRingtoneVolume(0) 语义）+ 浏览器内三点递增
// Q3 in-call 注入：同步标量 = k × IN_CALL_VOLUME(0.125)
// Q4 dismiss 双清零（stop() 语义）
// Q5 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8936;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/apps/clock-app/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
try {
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2000);

  // Q1 默认 0
  const q1 = await page.evaluate(() => ({ v: document.getElementById('crescendoSelect')?.value, stored: Number(JSON.parse(localStorage.getItem('android_clock_state') || '{}').crescendoSeconds ?? 0) }));
  A('Q1 crescendoSelect 默认 0（AOSP 权威默认）', q1.v === '0' && q1.stored === 0, JSON.stringify(q1));

  // Q2 渐强 30s 会话（同步路径）
  await page.evaluate(() => { document.getElementById('crescendoSelect').value = '30'; document.getElementById('crescendoSelect').dispatchEvent(new Event('change', { bubbles: true })); });
  const q2a = await page.evaluate(() => {
    const vols = [];
    window.__clockCrescendoProbeCapture = (v) => vols.push(v);
    window.__clockTestRing('渐强测试', 'e2e');           // 同步首播
    window.__clockCrescendoProbeCapture = null;
    const k = window.__clockRingGainFromVolumes(JSON.parse(localStorage.getItem('android_clock_state')).masterVolume, window.__clockAlarmVolumePct());
    return { probe: window.__clockCrescendoProbe(), ringOpen: document.getElementById('ringingModal')?.open, first: vols[0], k };
  });
  A('Q2a 渐强会话启动落 stopTime + 浮层开', q2a.probe.stopTime > Date.now() && q2a.probe.duration === 30000 && q2a.ringOpen === true, JSON.stringify({ d: q2a.probe.duration, open: q2a.ringOpen }));
  A('Q2b 同步首播标量近零（setRingtoneVolume(0) 起零语义 ×k）', q2a.first !== undefined && q2a.first >= 0 && q2a.first < 0.02 * Math.max(q2a.k, 1) && q2a.first <= q2a.k, JSON.stringify({ first: q2a.first, k: q2a.k }));
  const q2c = await page.evaluate(() => {
    const now = Date.now(), stop = now + 30000, dur = 30000, k = 0.595;
    const v = (t) => window.__clockCore.computeVolume(t, stop, dur) * k;
    return { start: v(now), mid: v(now + 15000), end: v(stop) };   // 浏览器内真跑 clock-core
  });
  A('Q2c computeVolume 浏览器内三点递增（0.006→0.06→0.595 对数曲线）',
    q2c.start < q2c.mid && q2c.mid < q2c.end && Math.abs(q2c.end - 0.595) < 1e-6 && Math.abs(q2c.start - 0.01 * 0.595) < 1e-9, JSON.stringify(q2c));

  // Q3 in-call 注入（同步路径：in-call 分支优先于 crescendo——AsyncRingtonePlayer.startPlayback L332-338）
  const q3 = await page.evaluate(() => {
    const vols = [];
    window.__clockPhoneMode = 'MODE_IN_CALL';
    window.__clockCrescendoProbeCapture = (v) => vols.push(v);
    window.__clockTestRing('in-call 测试', 'e2e');
    window.__clockCrescendoProbeCapture = null;
    window.__clockPhoneMode = '';
    const k = window.__clockRingGainFromVolumes(JSON.parse(localStorage.getItem('android_clock_state')).masterVolume, window.__clockAlarmVolumePct());
    return { vol: vols[0], k };
  });
  A('Q3 in-call 标量 = k × 0.125（IN_CALL_VOLUME 逐字）', q3.vol !== undefined && Math.abs(q3.vol - q3.k * 0.125) < 1e-9, JSON.stringify(q3));

  // Q4 dismiss 双清零
  await page.evaluate(() => { document.querySelector('[data-act="dismiss-ring"]')?.click(); });
  await sleep(200);
  const q4 = await page.evaluate(() => ({ probe: window.__clockCrescendoProbe(), ringOpen: document.getElementById('ringingModal')?.open }));
  A('Q4 dismiss 双清零 + 浮层关（stop() 语义）', q4.probe.stopTime === 0 && q4.probe.duration === 0 && q4.ringOpen === false, JSON.stringify(q4));

  // Q5 零 pageerror
  A('Q5 全程零 pageerror', errors.length === 0, JSON.stringify(errors.slice(0, 2)));
} finally {
  await browser.close();
  server.kill();
}
const pass = results.filter((r) => r[0]).length;
console.log(`\n==== e2e-v158: ${pass} passed, ${results.length - pass} failed ====`);
process.exit(pass === results.length ? 0 : 1);
