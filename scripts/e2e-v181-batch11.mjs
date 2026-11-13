// ==================== e2e-v181-batch11.mjs — #181 第十一批 camera 行为真跑 ====================
// camera 直开（无桌面注入 → __system 不可用 → SDK 降级路径不炸为验收点）+ 手机/平板双视口
// + Chromium fake 摄像头（--use-fake-device-for-media-stream）走真实 getUserMedia 链路：
// Q1 手机 400px：紧凑断点（快门 70px）+ body flex column 零变化 + 滤镜抽屉关闭态 opacity 0
// Q2 平板 800px：body grid 两列 1fr/300px + 滤镜抽屉升格右列常驻（opacity 1/纵排/col 2）
//                + 取景器右缘 300px 缩进只铺左列
// Q3 pressRipple：mode-chip 按下本体 scale(<1) + 同排近邻联动 → 松手双复位
// Q4 真实拍照链路（fake camera）：快门点击 → 相册 thumb 出图 + toast + localStorage 落档
//    + 无 __system VFS/notify 静默零炸 + /photos/ 直写静默跳过
// Q5 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8968;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/apps`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // 外域断网（fonts/material-symbols 失败不阻塞功能）

try {
  // Q1 手机 400px
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`${BASE}/camera/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2800);   // requestSystemPermission 直开 2s 放行 + fake 流起播
  const q1 = await page.evaluate(() => {
    const body = document.body;
    const shutter = document.querySelector('.shutter-btn-wrapper').getBoundingClientRect();
    const drawer = document.getElementById('filterDrawer');
    const video = document.getElementById('cameraVideo');
    return {
      bodyFlex: getComputedStyle(body).display === 'flex',
      shutterW: Math.round(shutter.width),
      drawerOpacity: getComputedStyle(drawer).opacity,
      drawerPos: getComputedStyle(drawer).position,
      streamLive: !!(video.srcObject && video.srcObject.active),
    };
  });
  A('Q1 手机 400px：flex 零变化 + 快门 70px 紧凑 + 抽屉关闭态 opacity 0 + fake 流已起',
    q1.bodyFlex && q1.shutterW >= 68 && q1.shutterW <= 74 && q1.drawerOpacity === '0' && q1.drawerPos === 'absolute' && q1.streamLive,
    `flex=${q1.bodyFlex} shutter=${q1.shutterW} op=${q1.drawerOpacity} pos=${q1.drawerPos} live=${q1.streamLive}`);

  // Q2 平板 800px
  await page.setViewportSize({ width: 800, height: 900 });
  await sleep(500);
  const q2 = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const drawer = document.getElementById('filterDrawer');
    const dcs = getComputedStyle(drawer);
    const vf = document.querySelector('.viewfinder-wrapper').getBoundingClientRect();
    return {
      display: cs.display,
      cols: cs.gridTemplateColumns,
      drawerOp: dcs.opacity,
      drawerDir: dcs.flexDirection,
      drawerCol: dcs.gridColumnStart,
      drawerPos: dcs.position,
      vfRight: Math.round(vf.right),
      vfLeft: Math.round(vf.left),
    };
  });
  A('Q2 平板 800px：grid 两列 1fr/300px + 抽屉右列常驻纵排（opacity 1/col 2/static）+ 取景器右缘 300px 缩进',
    q2.display === 'grid' && q2.cols.split(' ').length === 2 && q2.cols.includes('300px')
      && q2.drawerOp === '1' && q2.drawerDir === 'column' && q2.drawerCol === '2' && q2.drawerPos === 'static'
      && Math.abs(q2.vfRight - (800 - 300)) <= 2,
    `cols=${q2.cols} drawer=${q2.drawerOp}/${q2.drawerDir}/c${q2.drawerCol}/${q2.drawerPos} vfRight=${q2.vfRight}`);

  // Q3 pressRipple（mode-chip 按压本体/同排近邻联动，松手复位）
  await page.setViewportSize({ width: 400, height: 800 });
  await sleep(400);
  const q3 = await page.evaluate(() => new Promise((resolve) => {
    const chips = Array.from(document.querySelectorAll('.mode-chip'));
    const btn = chips[1];            // 「照片」本体
    const peer = chips[3];           // 「视频」同排近邻
    const r = btn.getBoundingClientRect();
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
    const pressed = btn.style.transform;
    const peerPressed = peer.style.transform;
    requestAnimationFrame(() => {
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      requestAnimationFrame(() => resolve({ pressed, peerPressed, after: btn.style.transform, peerAfter: peer.style.transform }));
    });
  }));
  A('Q3 pressRipple：按压本体 scale(<1) + 同排近邻联动 + 松手双复位',
    q3.pressed.includes('scale(') && parseFloat(q3.pressed.replace('scale(', '')) < 1
      && q3.peerPressed.includes('scale(') && q3.after === '' && q3.peerAfter === '',
    `pressed=${q3.pressed} peer=${q3.peerPressed} after='${q3.after}'`);

  // Q4 真实拍照链路（fake camera → canvas 绘帧 → 相册落档）
  const q4 = await page.evaluate(async () => {
    const out = { toast: '', thumb: false, stored: 0, sys: false, err: '' };
    try {
      out.sys = !!window.__system;   // 直开无桌面注入 → false（SDK 全静默）
      document.getElementById('shutterBtn').click();
      await new Promise((r) => setTimeout(r, 1200));
      out.toast = document.getElementById('cameraToast').textContent;
      out.thumb = document.getElementById('galleryThumbImg').style.display === 'block';
      const g = JSON.parse(localStorage.getItem('ios-desktop:camera-gallery') || '[]'); // v11.17 #283 收编键
      out.stored = g.length;
    } catch (e) { out.err = String(e); }
    return out;
  });
  A('Q4 真实拍照链路：快门 → toast 已保存 + 相册 thumb 出图 + localStorage 落档 1 条 + 无 __system 全静默零炸',
    q4.toast.includes('已保存') && q4.thumb && q4.stored === 1 && q4.sys === false && !q4.err,
    JSON.stringify(q4).slice(0, 180));

  // Q5 全程零 pageerror
  A('Q5 全程零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
} catch (e) {
  A('e2e 异常中断', false, String(e));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const failed = results.filter(([c]) => !c);
console.log(`\n==== e2e-v181-batch11: ${results.length - failed.length}/${results.length} ====${failed.length ? ' FAILED' : ' ALL PASS'}`);
process.exit(failed.length ? 1 : 0);
