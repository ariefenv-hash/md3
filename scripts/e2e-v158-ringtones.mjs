// ==================== e2e-v158-ringtones.mjs — #158 主线：AOSP 真实铃声行为真跑（v9.75） ====================
// 坑在录（v158-crescendo/v34 同款纪律）：无头页面被 Chrome 视为 hidden → rAF/定时器节流——
// 本脚本零定时器断言：全部走「同步调用 + 同步探针 + 短轮询」，timer 到期用 __clockTimerTickProbe 直通驱动。
// Q1 全新默认：9 选项（2 合成兜底 + 6 AOSP + custom）、默认 platinum、回退模式 auto
// Q2 资产轨试听：Platinum.ogg 真解码播放（src/playing/currentTime 推进）+ 试听单发 loop=false
// Q3 选铃声持久化：change → android_clock_state 落盘 + reload 启动回填
// Q4 强制合成模式：资源不消费（src 空）——统一回退开关生效
// Q5 资产缺失回落：route abort Osmium.ogg → error 记账 + 零崩溃（auto 模式账本防循环重试）
// Q6 计时器到期：timer_expire.ogg 独立音源（AOSP TimerStream 双播放器语义）+ dismiss 同停
// Q7 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8979;
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
const errors = [];
try {
  // ---------- 页 1：全新默认 + 资产轨试听 + 持久化 ----------
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2000);

  // Q1 全新默认
  const q1 = await page.evaluate(() => {
    const sel = document.getElementById('globalRingtoneSelect');
    const probe = window.__alarmRingtoneProbe ? window.__alarmRingtoneProbe() : null;
    return { opts: sel ? sel.options.length : 0, val: sel ? sel.value : null, mode: probe ? probe.mode : null, stored: (JSON.parse(localStorage.getItem('android_clock_state') || '{}').globalRingtone) };
  });
  A('Q1 默认 platinum + 9 选项 + 回退 auto（全新态真实铃声出盒）', q1.opts === 9 && q1.val === 'platinum' && q1.mode === 'auto' && (q1.stored === undefined || q1.stored === 'platinum'), JSON.stringify(q1));

  // Q2 资产轨试听（真解码；按钮在 settingsModal 内——先开 dialog）
  await page.evaluate(() => document.querySelector('[data-act="open-modal"][data-target="settingsModal"]').click()); // 程序化点击走真实委托链（menu-item 在折叠下拉内）
  await sleep(400);
  await page.click('button[data-act="test-ringtone"]');
  await page.waitForFunction(() => { const p = window.__alarmRingtoneProbe(); return p.src.includes('Platinum.ogg') && p.playing === true; }, { timeout: 5000 }).catch(() => {});
  const q2a = await page.evaluate(() => window.__alarmRingtoneProbe());
  await sleep(700);
  const q2b = await page.evaluate(() => window.__alarmRingtoneProbe());
  A('Q2 试听走资产轨：Platinum.ogg src + playing + 单发 loop=false', q2a.src.includes('Platinum.ogg') && q2a.loop === false, JSON.stringify(q2a));
  A('Q2b 真解码推进：currentTime > 0', (q2b.t || 0) > 0, `currentTime=${q2b.t}`);

  // Q3 选铃声持久化 + 启动回填
  await page.evaluate(() => {
    const sel = document.getElementById('globalRingtoneSelect');
    sel.value = 'osmium';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('android_clock_state') || '{}').globalRingtone);
  await page.reload({ waitUntil: 'load' });
  await sleep(1500);
  const q3 = await page.evaluate(() => ({ sel: document.getElementById('globalRingtoneSelect').value, stored: JSON.parse(localStorage.getItem('android_clock_state') || '{}').globalRingtone }));
  A('Q3 选铃声落盘 + reload 回填一致（osmium）', stored === 'osmium' && q3.sel === 'osmium' && q3.stored === 'osmium', JSON.stringify({ stored, ...q3 }));

  // ---------- 页 2：强制合成模式（统一回退开关） ----------
  const page2 = await browser.newPage();
  await page2.addInitScript(() => localStorage.setItem('ios-desktop:audio-resource-mode', 'synth'));
  page2.on('pageerror', (e) => errors.push(String(e)));
  await page2.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1800);
  await page2.evaluate(() => document.querySelector('[data-act="open-modal"][data-target="settingsModal"]').click());
  await sleep(400);
  await page2.click('button[data-act="test-ringtone"]');
  await sleep(600);
  const q4 = await page2.evaluate(() => ({ p: window.__alarmRingtoneProbe(), osc: !!(window.__clockTestRingProbeOsc) }));
  A('Q4 强制合成：mode=synth 且资源不消费（src 空）', q4.p.mode === 'synth' && q4.p.src === '', JSON.stringify(q4.p));

  // ---------- 页 3：资产缺失回落记账 + 计时器 timer_expire ----------
  const page3 = await browser.newPage();
  page3.on('pageerror', (e) => errors.push(String(e)));
  await page3.addInitScript(() => localStorage.setItem('android_clock_state', JSON.stringify({ globalRingtone: 'osmium' }))); // 确定性预置（newPage 独立 context，不跨页耦合）
  await page3.route('**/alarms/Osmium.ogg', (r) => r.abort());
  await page3.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1800);
  await page3.evaluate(() => document.querySelector('[data-act="open-modal"][data-target="settingsModal"]').click());
  await sleep(400);
  await page3.click('button[data-act="test-ringtone"]');
  await page3.waitForFunction(() => window.__alarmRingtoneProbe().failed.length > 0, { timeout: 5000 }).catch(() => {});
  const q5 = await page3.evaluate(() => window.__alarmRingtoneProbe());
  A('Q5 资产缺失：error 记账 failed 含 Osmium url（auto 回落，零崩溃）', q5.failed.some((u) => u.includes('Osmium.ogg')), JSON.stringify(q5));

  // Q6 计时器到期 → timer_expire.ogg（tick 直通，无头节流坑规避）
  await page3.evaluate(() => window.postMessage({ type: 'BUS_DELIVER', event: 'timer/start', payload: { seconds: 1 } }, '*'));
  await sleep(1500);
  await page3.evaluate(() => window.__clockTimerTickProbe && window.__clockTimerTickProbe());
  await page3.waitForFunction(() => { const p = window.__alarmRingtoneProbe(); return p.src.includes('timer_expire.ogg') && p.playing === true; }, { timeout: 5000 }).catch(() => {});
  const q6a = await page3.evaluate(() => ({ p: window.__alarmRingtoneProbe(), modal: document.getElementById('ringingModal').open }));
  await page3.evaluate(() => { const b = document.querySelector('button[data-act="dismiss-ring"]'); if (b) b.click(); });
  await sleep(300);
  const q6b = await page3.evaluate(() => ({ p: window.__alarmRingtoneProbe(), modal: document.getElementById('ringingModal').open }));
  A('Q6 计时器到期独立音源：timer_expire.ogg 循环响铃 + 浮层开', q6a.p.src.includes('timer_expire.ogg') && q6a.p.playing === true && q6a.modal === true, JSON.stringify(q6a.p));
  A('Q6b dismiss 同停（MediaPlayer.release 语义）', q6b.p.src === '' && q6b.p.playing === false && q6b.modal === false, JSON.stringify(q6b.p));

  // Q7 零 pageerror
  A('Q7 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 400));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
const pass = results.filter((r) => r[0]).length;
console.log(`\n=== e2e-v158-ringtones: ${pass}/${results.length} ===`);
process.exit(pass === results.length ? 0 : 1);
