// ==================== e2e-v19-unlock-ripple.mjs — #19 解锁波纹涟漪真跑（v9.100） ====================
// S1 锁屏在场 + 波纹零残留初始态（machine idle / 无 .unlock-wave）
// S2 上滑手势提交 → 波纹起（wavePresent + expanding + 触点波源 + 三退场块）
// S3 波纹推进（fill scale 增长 → 波前扩散）
// S4 解锁完成（锁屏隐藏 + 波纹层移除 + 机器归位零残留）
// S5 150ms 级连续操作链（解锁→回锁→再解锁）零残留（议题验收判据②）
// S6 reduced-motion 跳过波纹（不 spawn，解锁照常完成）
// S7 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8997;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' : ''}${extra}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);

  // ---------- S1 锁屏在场 + 初始零残留 ----------
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.lock(); });
  await sleep(500);
  const s1 = await page.evaluate(() => {
    const r = window.__lockTest && window.__lockTest.ripple ? window.__lockTest.ripple() : null;
    return {
      locked: window.__lockTest ? window.__lockTest.isLocked() : null,
      lockVisible: !!document.getElementById('lockScreen') && document.getElementById('lockScreen').style.display !== 'none',
      ripple: r,
    };
  });
  A('S1 锁屏在场 + 波纹初始零残留', s1.locked === true && s1.lockVisible && s1.ripple && s1.ripple.state === 'idle' && s1.ripple.wavePresent === false && s1.ripple.retireCount === 0,
    JSON.stringify(s1.ripple));

  // ---------- S2 上滑手势提交 → 波纹起（触点波源） ----------
  await page.mouse.move(195, 700);
  await page.mouse.down();
  for (let y = 700; y >= 200; y -= 50) { await page.mouse.move(195, y); await sleep(12); }
  await page.mouse.up();
  await sleep(60); // 弹簧首帧前 begin 已同步执行；波纹 DURATION 300ms 窗口内
  const s2 = await page.evaluate(() => {
    const r = window.__lockTest.ripple();
    return { locked: window.__lockTest.isLocked(), ...r };
  });
  A('S2 波纹起（expanding + wavePresent + 触点波源(195,700) + 三退场块）',
    s2.state === 'expanding' && s2.wavePresent === true && s2.retireCount === 3 &&
    s2.origin && Math.abs(s2.origin.x - 195) < 2 && Math.abs(s2.origin.y - 700) < 2,
    JSON.stringify({ state: s2.state, wave: s2.wavePresent, n: s2.retireCount, o: s2.origin }));

  // ---------- S3 波纹推进（fill scale 增长） ----------
  const scaleA = parseFloat(String(s2.fillScale).match(/scale\(([\d.]+)\)/)?.[1] || '0');
  await sleep(80);
  const s3 = await page.evaluate(() => {
    const fill = document.querySelector('.unlock-wave-fill');
    const m = fill && fill.style.transform ? fill.style.transform.match(/scale\(([\d.]+)\)/) : null;
    const top = document.querySelector('.lock-top-area');
    return {
      scale: m ? parseFloat(m[1]) : 0,
      topOpacity: top ? parseFloat(top.style.opacity || '1') : null,
    };
  });
  A('S3 波纹推进（scale 增长 + 波前及顶区退场 opacity<1）',
    s3.scale > scaleA && s3.topOpacity !== null && s3.topOpacity < 1,
    `scale ${scaleA.toFixed(3)}→${s3.scale.toFixed(3)}, topOpacity=${s3.topOpacity}`);

  // ---------- S4 解锁完成（波纹层移除 + 机器归位） ----------
  await sleep(1200);
  const s4 = await page.evaluate(() => {
    const r = window.__lockTest.ripple();
    return {
      locked: window.__lockTest.isLocked(),
      ...r,
      desktopTransform: getComputedStyle(document.getElementById('desktop')).transform,
    };
  });
  A('S4 解锁完成（locked=false + wavePresent=false + state=idle + retireCount=0）',
    s4.locked === false && s4.wavePresent === false && s4.state === 'idle' && s4.retireCount === 0,
    JSON.stringify({ locked: s4.locked, wave: s4.wavePresent, state: s4.state }));

  // ---------- S5 150ms 级连续操作链零残留（议题验收判据②） ----------
  await page.evaluate(() => { window.__lockTest.lock(); });
  await sleep(300);
  await page.mouse.move(195, 700);
  await page.mouse.down();
  for (let y = 700; y >= 260; y -= 110) { await page.mouse.move(195, y); await sleep(8); }
  await page.mouse.up();      // 解锁提交（波纹起）
  await sleep(50);
  await page.evaluate(() => { window.__lockTest.lock(); }); // 弹簧飞行中回锁（极端时序）
  await sleep(60);
  await page.mouse.move(195, 760);
  await page.mouse.down();
  for (let y = 760; y >= 180; y -= 80) { await page.mouse.move(195, y); await sleep(6); }
  await page.mouse.up();      // 再解锁（重入顶替）
  await sleep(80);
  const s5mid = await page.evaluate(() => {
    const r = window.__lockTest.ripple();
    const orphan = document.querySelectorAll('.unlock-wave').length;
    const styles = ['.lock-top-area', '.lock-notifications', '.lock-bottom-area'].map((s) => {
      const el = document.querySelector(`#lockScreen ${s}`);
      return el ? (el.style.opacity || el.style.transform || el.style.filter || 'clean') : 'gone';
    });
    return { ...r, orphan, styles, locked: window.__lockTest.isLocked() };
  });
  await sleep(1300);
  const s5end = await page.evaluate(() => {
    const r = window.__lockTest.ripple();
    const styles = ['.lock-top-area', '.lock-notifications', '.lock-bottom-area'].map((s) => {
      const el = document.querySelector(`#lockScreen ${s}`);
      return el ? (el.style.opacity || el.style.transform || el.style.filter || 'clean') : 'gone';
    });
    return { ...r, styles, locked: window.__lockTest.isLocked() };
  });
  A('S5 连续操作链（中途至多一个在飞波纹 + 最终零残留 + 内容样式全复位）',
    s5mid.orphan <= 1 && s5end.wavePresent === false && s5end.state === 'idle' && s5end.retireCount === 0 &&
    s5end.styles.every((v) => v === 'clean' || v === 'gone') && s5end.locked === false,
    `mid: orphan=${s5mid.orphan} state=${s5mid.state} | end: wave=${s5end.wavePresent} state=${s5end.state} styles=${JSON.stringify(s5end.styles)}`);

  // ---------- S6 reduced-motion 跳过波纹 ----------
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => { window.__lockTest.lock(); });
  await sleep(300);
  await page.mouse.move(195, 700);
  await page.mouse.down();
  for (let y = 700; y >= 200; y -= 60) { await page.mouse.move(195, y); await sleep(10); }
  await page.mouse.up();
  const s6early = await page.evaluate(() => {
    const waveEl = document.querySelector('.unlock-wave');
    const hidden = waveEl ? getComputedStyle(waveEl).display === 'none' : true;
    return { waveGoneOrHidden: !waveEl || hidden };
  });
  await sleep(700);
  const s6 = await page.evaluate(() => {
    const r = window.__lockTest.ripple();
    return { locked: window.__lockTest.isLocked(), ...r };
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  A('S6 reduced-motion：波纹跳过（不 spawn/display:none）+ 解锁照常完成',
    s6.locked === false && s6.wavePresent === false && s6early.waveGoneOrHidden && s6.retireCount === 0,
    JSON.stringify({ locked: s6.locked, wave: s6.wavePresent, earlyGone: s6early.waveGoneOrHidden }));

  // ---------- S7 零 pageerror ----------
  A('S7 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter(([ok]) => !ok);
console.log(`\n==== e2e-v19: ${results.length - failed.length}/${results.length} ====`);
process.exit(failed.length ? 1 : 0);
