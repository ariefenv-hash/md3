// ==================== e2e-v110-media-keys.mjs — #110 媒体键行为真跑（v9.86） ====================
// Q0 前置：__mediaKeys 钩子在库（dispatch/state/resolve）
// Q1 MediaPlayPause（真实 keydown）→ 宿主电台开播（仲裁宿主 + togglePlay 原生路径）
// Q2 MediaTrackNext → 宿主切曲（currentIndex 0→1，原生 loadHostTrack 绕过覆盖层守卫）
// Q3 MediaTrackPrevious → 切回（1→0）
// Q4 MediaStop → 暂停 + 归位（KEYCODE_MEDIA_STOP 停止语义 ≠ 纯 pause）
// Q5 缺口修复：宿主播放中 + 覆盖层暂停但有曲目 → MediaPlayPause 仲裁宿主（旧 externalActive() 路由反例）
// Q6 覆盖层播放中 → MediaPlayPause 仲裁 external（MEDIA_COMMAND 到达 iframe，真听消息）
// Q7 锁屏态媒体键生效（AOSP 锁屏媒体卡与媒体键同源语义）
// Q8 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8987;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  // e2e 惯例断网（route.abort）→ 宿主电台 src（外域 CDN）必失败：error 后 paused 回真，
  // hostPlaying 断言被环境噪声污染 —— play/pause 原型补丁（派发真实 play/pause 事件，
  // notify/markStreamActive 心跳链路保真，仅播放结果确定化；铁律 3 无头回归惯例）。
  // paused 为原型 getter（无 setter）→ sloppy 赋值静默失败，必须 defineProperty 写自有属性
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      Object.defineProperty(this, 'paused', { value: false, configurable: true, writable: true });
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      Object.defineProperty(this, 'paused', { value: true, configurable: true, writable: true });
      this.dispatchEvent(new Event('pause'));
    };
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });

  // ---------- Q0 前置 ----------
  const q0 = await page.evaluate(() => !!(window.__mediaKeys && window.__mediaKeys.dispatch && window.__mediaKeys.state && window.__mediaKeys.resolve));
  A('Q0 前置：__mediaKeys 钩子三面在库（dispatch/state/resolve）', q0 === true);

  // ---------- Q1 MediaPlayPause → 宿主开播 ----------
  await page.keyboard.press('MediaPlayPause');
  await sleep(500);
  const q1 = await page.evaluate(() => window.__mediaKeys.state());
  A('Q1 MediaPlayPause → 宿主电台开播（仲裁 host-radio + 原生 togglePlay）', q1.hostPlaying === true && q1.externalActive === false, JSON.stringify(q1));

  // ---------- Q2 MediaTrackNext → 切曲 ----------
  await page.keyboard.press('MediaTrackNext');
  await sleep(400);
  const q2 = await page.evaluate(() => window.__mediaKeys.state());
  A('Q2 MediaTrackNext → currentIndex 0→1（loadHostTrack 原生切曲）', q2.currentIndex === 1, JSON.stringify(q2));

  // ---------- Q3 MediaTrackPrevious → 切回 ----------
  await page.keyboard.press('MediaTrackPrevious');
  await sleep(400);
  const q3 = await page.evaluate(() => window.__mediaKeys.state());
  A('Q3 MediaTrackPrevious → currentIndex 1→0', q3.currentIndex === 0, JSON.stringify(q3));

  // ---------- Q4 MediaStop → 暂停 + 归位 ----------
  // （Playwright 键名表无 MediaStop —— 合成 KeyboardEvent 走同一 window keydown
  // 监听器路径；真键可达性已由 Q1-Q3 三个 Media* 键实证）
  await page.evaluate(() => { window.__mediaKeys.dispatch('play'); });   // 先确保宿主播放中
  await sleep(300);
  await page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaStop' })); });
  await sleep(400);
  const q4 = await page.evaluate(() => window.__mediaKeys.state());
  A('Q4 MediaStop → 宿主暂停（停止语义）', q4.hostPlaying === false, JSON.stringify(q4));

  // ---------- Q5 缺口修复：宿主播放中 + 覆盖层暂停但有曲目 → 仲裁宿主 ----------
  await page.keyboard.press('MediaPlayPause');           // 宿主再开播
  await sleep(400);
  await page.evaluate(() => {
    window.postMessage({ type: 'MEDIA_STATE_SYNC', payload: { title: 'E2E 外部曲目', artist: '仲裁测试', isPlaying: false, currentTime: 5, duration: 180 } }, '*');
  });
  await sleep(400);
  const q5pre = await page.evaluate(() => ({ ...window.__mediaKeys.state(), target: window.__mediaKeys.resolve().target }));
  await page.keyboard.press('MediaPlayPause');           // 关键一击
  await sleep(400);
  const q5post = await page.evaluate(() => window.__mediaKeys.state());
  A('Q5 播放中优先：宿主 playing + 覆盖层 paused → 媒体键落宿主（暂停宿主而非转发覆盖层）',
    q5pre.hostPlaying === true && q5pre.target === 'host-radio' && q5post.hostPlaying === false,
    `pre=${JSON.stringify(q5pre)} post=${JSON.stringify(q5post)}`);

  // ---------- Q6 覆盖层播放中 → 仲裁 external（iframe 真听 MEDIA_COMMAND） ----------
  await page.evaluate(() => {
    window.__shareSheet.openAppById('calculator');   // 产生真实 iframe（dispatchMediaCommand 派发面）
  });
  await sleep(1200);
  await page.evaluate(() => {
    window.postMessage({ type: 'MEDIA_STATE_SYNC', payload: { title: 'E2E 外部曲目', artist: '仲裁测试', isPlaying: true, currentTime: 5, duration: 180 } }, '*');
    // 在首个同源 iframe 内安装 MEDIA_COMMAND 监听（同源可达）
    const f = document.querySelector('iframe');
    if (f && f.contentWindow) {
      f.contentWindow.__e2eCmds = [];
      f.contentWindow.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'MEDIA_COMMAND') f.contentWindow.__e2eCmds.push(e.data.cmd);
      });
    }
  });
  await sleep(400);
  await page.keyboard.press('MediaPlayPause');           // 覆盖层播放中 → toggle 转发
  await sleep(400);
  const q6 = await page.evaluate(() => {
    const f = document.querySelector('iframe');
    return { cmds: (f && f.contentWindow && f.contentWindow.__e2eCmds) || [], target: window.__mediaKeys.resolve().target };
  });
  A('Q6 覆盖层播放中 → 仲裁 external-music（MEDIA_COMMAND toggle 真达 iframe）',
    q6.target === 'external-music' && q6.cmds.includes('toggle'), JSON.stringify(q6));

  // ---------- Q7 锁屏态媒体键生效 ----------
  // 清覆盖层（回落宿主会话语境）→ 电源短按锁屏 → 媒体键 → 宿主翻转
  await page.evaluate(() => {
    window.postMessage({ type: 'MEDIA_STATE_SYNC', payload: { title: '', isPlaying: false } }, '*');
  });
  await sleep(400);
  // 电源短按 → 锁屏（v111 同款：pointerdown 120ms + pointerup）
  const powerBtn = page.locator('#qsPowerBtn');
  if (await powerBtn.count() === 1) {
    await powerBtn.dispatchEvent('pointerdown', { pointerId: 1, bubbles: true, isPrimary: true });
    await sleep(120);
    await powerBtn.dispatchEvent('pointerup', { pointerId: 1, bubbles: true, isPrimary: true });
    await sleep(900);
    const locked = await page.evaluate(() => (window.__lockTest ? window.__lockTest.isLocked() : null));
    await page.keyboard.press('MediaPlayPause');         // 锁屏态媒体键：宿主再开播
    await sleep(500);
    const q7 = await page.evaluate(() => window.__mediaKeys.state());
    A('Q7 锁屏态媒体键生效（宿主 paused→playing 翻转，锁屏同源语义）',
      locked === true && q7.hostPlaying === true, `locked=${locked} st=${JSON.stringify(q7)}`);
    await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
    await sleep(300);
  } else {
    A('Q7 锁屏态媒体键生效', false, 'qsPowerBtn 不在库，跳过失败');
  }

  // ---------- Q8 pageerror ----------
  A('Q8 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 300));
} finally {
  await browser.close();
  server.kill();
}
const fails = results.filter(([c]) => !c);
console.log(`\n=== e2e-v110: ${results.length - fails.length}/${results.length} ===`);
process.exit(fails.length ? 1 : 0);
