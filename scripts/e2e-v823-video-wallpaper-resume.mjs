// ==================== e2e-v823-video-wallpaper-resume.mjs — #69 无头回归 ====================
//
// DoD（议题 #69 验收标准）：
//   A. 视频壁纸装载 + 播放（headless chromium 真 video 解码）
//   B. 应用全屏 → 壁纸暂停（看门狗挂起语义）
//   C. 平台重置模拟（挂起中 currentTime 被丢回 0 —— Android Chrome 媒体栈 #69 实机行为）
//      → 回桌面 resume 后位置恢复锚点（核心断言：不从头重播）
//   D. 10× 开合连续性循环（验收标准原文：连续开合 10 次位置连续）——交替注入重置
//   E. 实时模糊关闭路径同样守卫（全局开关 off → 旧滤镜路径 → 守卫仍生效）
//   F. 取色采样链不回归（applyVideoWallpaper persist=false 不触发采样； 真 persist 链
//      由 vitest 锚守护 samplingActive 让位）
//   G. 模糊效果开合前后一致（blur 画布 active 态）+ 零 pageerror
//
// 驱动：真实导航（解锁 → settings 图标 → 导航栏 home 键 closeApp）。
// 视频：ffmpeg testsrc 6s/320x180/VP8（docs/v823/wall6s.webm，已在脚本前置生成）。

import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v823');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

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

// ---------- 装载视频壁纸（Blob 注入，persist=false 免 IDB） ----------
console.log('A. 视频壁纸装载与播放');
const videoBlob = readFileSync(join(OUT, 'wall6s.webm'));
const applied = await page.evaluate(async (b64) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'video/webm' });
  return window.__videoWallpaperApply(blob, { persist: false, showToast: false });
}, videoBlob.toString('base64'));
A('A1 applyVideoWallpaper 受理', applied === true, String(applied));
await sleep(1600);
const st1 = await page.evaluate(() => {
  const v = window.__videoWallpaper.getVideoEl();
  return v ? { active: window.__videoWallpaper.isVideoActive(), paused: v.paused, t: v.currentTime, dur: v.duration, rs: v.readyState } : null;
});
A('A2 壁纸激活 + 播放中', !!st1 && st1.active && !st1.paused, JSON.stringify(st1));
A('A3 时长 ≈ 6s 且位置已前进', !!st1 && Math.abs(st1.dur - 6) < 0.3 && st1.t > 0.5, `t=${st1 && st1.t.toFixed(2)} dur=${st1 && st1.dur}`);
await page.screenshot({ path: join(OUT, 'a-wallpaper.png') });

// ---------- B. 应用全屏 → 挂起；C. 平台重置模拟 + 恢复守卫（核心） ----------
console.log('B/C. 应用全屏挂起 → 平台重置模拟 → 回桌面恢复（核心断言）');
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1100);
const st2 = await page.evaluate(() => {
  const v = window.__videoWallpaper.getVideoEl();
  return { paused: v.paused, t: v.currentTime };
});
A('B1 应用全屏后壁纸挂起', st2.paused, JSON.stringify(st2));
A('B2 挂起锚点位置有效（> 0.8s）', st2.t > 0.8, `t=${st2.t.toFixed(2)}`);
const anchor = st2.t;

// 平台重置模拟：Android Chrome 媒体栈丢弃挂起视频位置（#69 实机行为的确定性复现）
await page.evaluate(() => { window.__videoWallpaper.getVideoEl().currentTime = 0; });
const st2b = await page.evaluate(() => window.__videoWallpaper.getVideoEl().currentTime);
A('C1 挂起中位置已被模拟重置为 0', st2b < 0.05, `t=${st2b}`);

// 回桌面：导航栏 home 键（真实 closeApp 路径）
await page.evaluate(() => document.querySelector('.nvb-home')?.click());
await sleep(1600); // 关窗动画 + 看门狗 500ms tick + play
const st3 = await page.evaluate(() => {
  const v = window.__videoWallpaper.getVideoEl();
  return { paused: v.paused, t: v.currentTime };
});
console.log(`  [trace] anchor=${anchor.toFixed(2)} after-resume=${st3.t.toFixed(2)} paused=${st3.paused}`);
A('C2 回桌面后恢复播放', !st3.paused, JSON.stringify(st3));
A('C3 位置连续（恢复锚点续播，非从头重播）— 核心断言',
  st3.t >= anchor - 0.6 && st3.t > 0.8, `t=${st3.t.toFixed(2)} vs anchor=${anchor.toFixed(2)}`);
await page.screenshot({ path: join(OUT, 'c-resumed.png') });

// ---------- D. 10× 开合连续性（验收标准原文；交替注入重置） ----------
console.log('D. 10× 开合连续性循环');
let continuityBroken = 0;
const samples = [];
for (let i = 0; i < 10; i++) {
  await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
  await sleep(950);
  const tp = await page.evaluate(() => {
    const v = window.__videoWallpaper.getVideoEl();
    return { paused: v.paused, t: v.currentTime };
  });
  if (i % 2 === 0) {
    // 偶数轮注入平台重置（挂起中位置被丢）
    await page.evaluate(() => { window.__videoWallpaper.getVideoEl().currentTime = 0; });
  }
  await page.evaluate(() => document.querySelector('.nvb-home')?.click());
  await sleep(1500);
  const tr = await page.evaluate(() => {
    const v = window.__videoWallpaper.getVideoEl();
    return { paused: v.paused, t: v.currentTime };
  });
  // 连续性判定：resume 后位置 ≥ 挂起锚点 - 0.6（守卫恢复后续播 ~0.9s）；
  // 合法 loop 回卷例外：锚点近片尾（> 4.8）且回卷后位置 < 2.0
  const wrapped = tp.t > 4.8 && tr.t < 2.0;
  const okResume = !tr.paused && (tr.t >= tp.t - 0.6 || wrapped);
  if (!okResume) continuityBroken++;
  samples.push(`#${i} anchor=${tp.t.toFixed(1)} resume=${tr.t.toFixed(1)}${wrapped ? '(wrap)' : ''}${okResume ? '' : ' BROKEN'}`);
}
console.log('  ' + samples.join('\n  '));
A('D1 10× 开合（含 5 次重置注入）播放位置全部连续', continuityBroken === 0, `broken=${continuityBroken}`);

// ---------- E. 实时模糊关闭路径守卫 ----------
console.log('E. 模糊关闭（旧滤镜路径）守卫');
await page.evaluate(() => window.__blurBakeTest.setEnabled(false));
await sleep(200);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(950);
const te = await page.evaluate(() => {
  const v = window.__videoWallpaper.getVideoEl();
  return { paused: v.paused, t: v.currentTime, blurEnabled: window.__blurBakeTest.isEnabled() };
});
A('E1 模糊关 + 挂起在位', !te.blurEnabled && te.paused, JSON.stringify(te));
await page.evaluate(() => { window.__videoWallpaper.getVideoEl().currentTime = 0; });
await page.evaluate(() => document.querySelector('.nvb-home')?.click());
await sleep(1500);
const te2 = await page.evaluate(() => {
  const v = window.__videoWallpaper.getVideoEl();
  return { paused: v.paused, t: v.currentTime };
});
A('E2 模糊关路径位置同样连续',
  !te2.paused && (te2.t >= te.t - 0.6 || (te.t > 4.8 && te2.t < 2.0)),
  `t=${te2.t.toFixed(2)} vs anchor=${te.t.toFixed(2)}`);
await page.evaluate(() => window.__blurBakeTest.setEnabled(true));
await sleep(200);

// ---------- F. 模糊快照层开合一致性（验收：模糊效果前后一致） ----------
console.log('F. 模糊快照层一致性');
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(950);
const blurOn = await page.evaluate(() => ({
  ready: window.__blurBakeTest.isReady(),
  progress: window.__blurBakeTest.progress(),
  canvasActive: !!document.getElementById('desktopBlurCanvas')?.classList.contains('active'),
}));
await page.evaluate(() => document.querySelector('.nvb-home')?.click());
await sleep(1500);
const blurOff = await page.evaluate(() => ({
  ready: window.__blurBakeTest.isReady(),
  progress: window.__blurBakeTest.progress(),
  canvasActive: !!document.getElementById('desktopBlurCanvas')?.classList.contains('active'),
}));
A('F1 应用全屏：快照就绪 + app 通道 1 + 画布 active',
  blurOn.ready && blurOn.progress === 1 && blurOn.canvasActive, JSON.stringify(blurOn));
A('F2 回桌面：app 通道归零 + 画布收起',
  blurOff.progress === 0 && !blurOff.canvasActive, JSON.stringify(blurOff));

// ---------- G. 壁纸播放位置终态 sanity + 零 pageerror ----------
const stFinal = await page.evaluate(() => window.__videoWallpaper.getVideoEl().currentTime);
A('G1 终态播放位置在时间轴内', stFinal >= 0 && stFinal < 6.5, `t=${stFinal.toFixed(2)}`);
A('G2 零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));

console.log(`\n===== e2e-v823: ${pass} passed, ${fail} failed =====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
