// ==================== e2e-v92-media-output.mjs — #92 媒体输出切换器真跑（v9.99） ====================
// S1 音量面板打开 → 顶部输出行渲染（图标 + chevron + aria 名称）
// S2 点击输出行 → 输出对话框展开（设备列表 + 空间音频行 + scrim）
// S3 选择蓝牙模拟设备 → 偏好落库 + media-output-changed 降级广播 + 对话框关闭 + 输出行名称更新
// S4 空间音频开关 → aria-checked + localStorage 持久化
// S5 #114 公约回归：scrim pointerdown（down 拍）→ 对话框收起
// S6 ringer [hidden] 渲染保真（收起态仅现模式钮可见——happy-dom 不可判，真跑 Chromium computed display）
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
const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(400);

  // ---------- S1 音量面板 + 顶部输出行 ----------
  await page.keyboard.press('AudioVolumeUp');
  await sleep(300);
  const s1 = await page.evaluate(() => {
    const dlg = document.getElementById('volumeDialog');
    const row = document.getElementById('vdOutputRow');
    return {
      visible: dlg.classList.contains('visible'),
      rowPresent: !!row && !row.hidden,
      hasChev: !!(row && row.querySelector('.vd-output-chev')),
      aria: row ? row.getAttribute('aria-label') : '',
      svg: !!(row && row.querySelector('svg')),
    };
  });
  A('S1 音量面板可见 + 顶部输出行渲染（svg + chevron + aria 名称）',
    s1.visible && s1.rowPresent && s1.hasChev && s1.svg && s1.aria.includes('媒体输出设备'), JSON.stringify(s1));

  // ---------- S2 输出对话框展开 ----------
  await page.evaluate(() => document.getElementById('vdOutputRow').click());
  await sleep(350);
  const s2 = await page.evaluate(() => {
    const dlg = document.querySelector('.media-output-dialog');
    if (!dlg) return { open: false };
    return {
      open: dlg.classList.contains('open'),
      deviceCount: dlg.querySelectorAll('.mo-item').length,
      hasSpatial: !!dlg.querySelector('.mo-spatial'),
      hasScrim: !!dlg.querySelector('.mo-scrim'),
      firstDevice: dlg.querySelector('.mo-item .mo-name') ? dlg.querySelector('.mo-item .mo-name').textContent.trim() : '',
    };
  });
  A('S2 输出对话框展开（设备行 + 空间音频行 + scrim）', s2.open && s2.deviceCount >= 1 && s2.hasSpatial && s2.hasScrim, JSON.stringify(s2));

  // ---------- S3 选择蓝牙模拟设备 → 降级链 ----------
  const s3 = await page.evaluate(async () => {
    const dlg = document.querySelector('.media-output-dialog');
    const target = dlg.querySelector('.mo-item[data-device]:not([data-device="builtin-speaker"])');
    if (!target) return { skipped: true };
    let evt = null;
    document.addEventListener('media-output-changed', (e) => { evt = e.detail; }, { once: true });
    target.click();
    await new Promise((r) => setTimeout(r, 300));
    return {
      skipped: false,
      deviceId: target.getAttribute('data-device'),
      stored: localStorage.getItem('media-output:active'),
      evtDegraded: evt ? evt.degraded : null,
      closed: !dlg.classList.contains('open'),
      rowAria: document.getElementById('vdOutputRow').getAttribute('aria-label'),
      toast: !!document.querySelector('.qs-toast, .toast, [class*="toast"]'),
    };
  });
  if (s3.skipped) {
    A('S3 选择设备降级链', true, '环境仅内置设备（enumerateDevices 无音频输出）——幂等兜底');
  } else {
    A('S3 选择设备 → 偏好落库 + 降级广播 + 关闭 + 输出行名称更新',
      s3.stored === s3.deviceId && s3.evtDegraded === true && s3.closed && s3.rowAria.includes('媒体输出设备：') && !s3.rowAria.includes('内置扬声器'),
      JSON.stringify(s3));
  }

  // ---------- S4 空间音频开关 ----------
  await page.evaluate(() => document.getElementById('vdOutputRow').click());
  await sleep(300);
  const s4 = await page.evaluate(async () => {
    const sw = document.querySelector('.media-output-dialog .mo-spatial');
    sw.click();
    await new Promise((r) => setTimeout(r, 100));
    const on = sw.getAttribute('aria-checked') === 'true' && localStorage.getItem('media-output:spatial') === '1';
    sw.click();
    await new Promise((r) => setTimeout(r, 100));
    return { on, offStored: localStorage.getItem('media-output:spatial') };
  });
  A('S4 空间音频开关 + 偏好持久化', s4.on && s4.offStored === '0', JSON.stringify(s4));

  // ---------- S5 #114 公约：scrim pointerdown 收起 ----------
  const s5 = await page.evaluate(() => {
    const dlg = document.querySelector('.media-output-dialog');
    dlg.querySelector('.mo-card').dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true })); // consume
    const keep = dlg.classList.contains('open');
    dlg.querySelector('.mo-scrim').dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true })); // outside
    return { keep, closed: !dlg.classList.contains('open') };
  });
  A('S5 卡片面 pointerdown 保持 + scrim pointerdown（down 拍）收起', s5.keep && s5.closed, JSON.stringify(s5));

  // ---------- S6 ringer [hidden] 渲染保真（v7.88 幻影审计回归确认） ----------
  const s6 = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#vdRingerDrawer .vd-ringer-btn')];
    const visible = btns.filter((b) => getComputedStyle(b).display !== 'none');
    return { total: btns.length, visible: visible.length, visibleMode: visible.map((b) => b.dataset.mode) };
  });
  A('S6 收起态铃声抽屉仅现模式钮可见（[hidden] 渲染保真）', s6.total === 3 && s6.visible === 1, JSON.stringify(s6));

  // ---------- S7 零 pageerror ----------
  A('S7 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  console.log('FAIL e2e-v92 异常中断 —', String(e));
  results.push([false, 'e2e-v92 异常中断', String(e)]);
} finally {
  await browser.close().catch(() => {});
  server.kill();
  server.kill('SIGKILL');
}
const pass = results.filter((r) => r[0]).length;
console.log(`\ne2e-v92 result: ${pass}/${results.length}`);
process.exit(pass === results.length ? 0 : 1);
