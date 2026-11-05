// ==================== e2e-v117-audio-graph.mjs — #117 双层音量架构真跑（v10.03） ====================
// S1 面板打开：.vd-layer-caption「应用音量」标注可见（认知落差建议处理③ 载体）
// S2 总线落账：面板音乐流落值 → localStorage settings:sound-v1 media 键持久化（刷新前影子）
// S3 持久化恢复：seed media=85 → reload → 面板 aria-valuenow=85（媒体音量恢复单一真源）
// S4 ring 真源：目标流 ring 落值 → settings:sound-v1 ring 键 + settings-sound-changed 双发
// S5 首启引导：清 dismissed → mediaService.play() → toast 说明双层关系一次性出现；再播不再现
// S6 静音提示守卫：未播放/未路由态零误报（toast 不出现——条件式提示不能断言）
// S7 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8998;
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
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(400);

  const openPanel = () => page.evaluate(() => {
    const dlg = document.getElementById('volumeDialog');
    if (!dlg) return null;
    // 生产入口 = 音量键步进（stepVolumeBySteps → show()）
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'AudioVolumeUp', bubbles: true }));
    return dlg.classList.contains('visible');
  });
  const caption = () => page.evaluate(() => {
    const el = document.getElementById('vdLayerCaption');
    if (!el) return null;
    const vis = getComputedStyle(el).visibility;
    return { text: el.textContent, visible: vis === 'visible' };
  });

  // S1 面板文案（建议处理③）
  await openPanel();
  await sleep(400);
  const cap1 = await caption();
  A('S1 面板打开 + 「应用音量」标注可见', cap1 && cap1.visible && cap1.text === '应用音量', JSON.stringify(cap1));

  // S2 总线落账（media 键持久化）：external 播放位 → 目标流 music（#109 判定链真跑）；
  // 先写安全音量会话确认（#193 SAFETY_CONFIRMED_KEY——>60 请求被门拦值，既有语义）
  await page.evaluate(() => {
    sessionStorage.setItem('vd.safety.confirmed', '1');
    window.__audioGraphTest.mediaService.external = { isPlaying: true, title: 'e2e' };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'AudioVolumeUp', bubbles: true }));
  });
  await sleep(300);
  const s2 = await page.evaluate(() => JSON.parse(localStorage.getItem('settings:sound-v1') || '{}').media);
  // 期望 84 = S1 ring 步进后的共享 currentVolume 77 + KEY_STEP 6.67（目标流切换共享
  // 面板显值——#109 判定链真跑形态；media 记账经 setVolume→setLevel 落库）
  A('S2 media 流落账持久化（settings:sound-v1 media 键）', s2 === 84, `media=${s2}`);

  // S3 持久化恢复：seed 85 → reload → 图单例恢复 85 + 面板显值（target music 步进 92 = 85+KEY_STEP）
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('settings:sound-v1') || '{}');
    s.media = 85;
    localStorage.setItem('settings:sound-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'load' });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(300);
  const restored = await page.evaluate(() => window.__audioGraphTest.graph().getLevel('media'));
  await page.evaluate(() => {
    sessionStorage.setItem('vd.safety.confirmed', '1');
    window.__audioGraphTest.mediaService.external = { isPlaying: true, title: 'e2e' };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'AudioVolumeUp', bubbles: true }));
  });
  await sleep(300);
  const now3 = await page.evaluate(() => document.getElementById('vdSlider')?.getAttribute('aria-valuenow'));
  A('S3 刷新后媒体音量恢复 85（图单例恢复 + 面板步进 92）', String(restored) === '85' && now3 === '92', `restored=${restored} aria=${now3}`);

  // S4 ring 真源：writeRingVolume → settings:sound-v1 + settings-sound-changed
  // （先清 external 播放位——目标流回落 ring 档，#109 静默回落真跑）
  await page.evaluate(() => { window.__audioGraphTest.mediaService.external = null; });
  const s4 = await page.evaluate(async () => {
    let evt = null;
    document.addEventListener('settings-sound-changed', (e) => { evt = e.detail; }, { once: true });
    const v = await new Promise((resolve) => {
      const check = () => {
        const s = JSON.parse(localStorage.getItem('settings:sound-v1') || '{}');
        if (typeof s.ring === 'number') resolve(s.ring); else setTimeout(check, 80);
      };
      // 生产入口：AudioVolumeMute 切 ring 目标流静音 → 落值 ring=0
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'AudioVolumeMute', bubbles: true }));
      setTimeout(check, 200);
    });
    return { ring: v, evt };
  });
  A('S4 ring 真源同键落库 + 协议事件', s4.ring === 0 && s4.evt && s4.evt.key === 'ring', JSON.stringify(s4));

  // S5 首启引导：清 dismissed → play → toast 一次性
  await page.evaluate(() => {
    localStorage.removeItem('audio-graph:onboarding-dismissed');
    const s = JSON.parse(localStorage.getItem('settings:sound-v1') || '{}');
    s.media = 85; localStorage.setItem('settings:sound-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'load' });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(300);
  const s5 = await page.evaluate(async () => {
    // 首播触发面：host radio play() 生产入口（曲目外链被路由拦截不碍引导派发——
    // _maybeAnnounceDualLayerOnce 先于 audio.play() 执行）
    try { window.__audioGraphTest.mediaService.play(); } catch (e) {}
    await new Promise((r) => setTimeout(r, 1400));
    const toast = document.getElementById('systemGlobalToast');
    return {
      toastShown: !!(toast && toast.textContent.includes('应用音量独立于系统音量')),
      dismissed: localStorage.getItem('audio-graph:onboarding-dismissed') === '1',
    };
  });
  A('S5 首播一次性双层说明 toast + dismissed 落库', s5.toastShown && s5.dismissed, JSON.stringify(s5));

  // S6 静音提示零误报守卫（未播放/未路由 → 面板期内不出现「若仍无声音」toast；
  // 先清 toast 残文案防 S5 引导 toast 撞词误判）
  await page.evaluate(() => { try { window.__audioGraphTest.mediaService.pause(); window.__audioGraphTest.mediaService.external = null; } catch (e) {} });
  await page.evaluate(() => { const t = document.getElementById('systemGlobalToast'); if (t) t.textContent = ''; });
  await openPanel();
  await sleep(3500);
  const s6 = await page.evaluate(() => {
    const toast = document.getElementById('systemGlobalToast');
    return !(toast && toast.textContent.includes('若仍无声音'));
  });
  A('S6 未播放态零误报（条件式提示不断言）', s6, '');

  // S7 零 pageerror
  A('S7 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  A('EXCEPTION', false, String(e).slice(0, 300));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
const pass = results.filter((r) => r[0]).length;
console.log(`\n=== e2e-v117: ${pass}/${results.length} ===`);
process.exit(pass === results.length ? 0 : 1);
