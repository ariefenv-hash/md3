// ==================== e2e-v231-wallpaper-resume.mjs — #231 壁纸「重新播放/相位跳变」P0 真实回归 ====================
//
// 口径（#231 第八节验收）：**真实时间**（非 --virtual-time-budget，避免 rAF 节流假象）。
// 走根壳入口 index.html → #sim-iframe → 桌面（v225 同款 harness）。
//
// 探针两件（R117 窗二版教训：中心 16×16 指纹对 sunset 不敏感 + 迟采样量到的是正常漂移）：
//   ① 绘制直探：包装 CanvasRenderingContext2D.fillRect（三预设背景层都走 fillRect），
//      直接记录恢复后首次绘制调用时刻 —— P2「≤80ms 已恢复绘制」的直接证据；
//   ② 全画布指纹：主画布 → 64×64 降采样 → 逐格亮度加权和（位置权重），三预设全域可感。
//
// 断言面：
//   P1 相位连续：恢复首帧指纹 ↔ 挂起末帧指纹差 ≤ max(自校准 200ms 漂移率×1.5, 2.0)
//      （旧墙钟口径 = 挂起全程 2.6s 相位一次计入 ≈ 漂移率×13，必炸；单元层 B3/B4 已穷举时钟语义）
//   P2 关窗起手 ≤80ms 内壁纸已恢复绘制（fillRect 直探，不等动画终点）
//   P3 三预设全覆盖：aurora / sunset / starry（sunset 指纹天然低敏 → 动画期计数降级为信息项，诚实标注）
//   P4 视频壁纸：挂起即暂停 / 关窗起手 ≤80ms 恢复播放 / 取色采样后位置不回卷（根因C）
//   每例零 pageerror；三视口（手机 390×844 / 平板 820×1180 / 桌面 1440×900）
//
// 用法：node scripts/e2e-v231-wallpaper-resume.mjs
// 退出码：0 = 全绿；1 = 任何断言失败

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import net from 'node:net';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = [
  chromium.executablePath(),
  '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',
  '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
].find((p) => p && existsSync(p));
if (!CHROME) { console.error('[v231] 找不到 Chromium 可执行文件'); process.exit(1); }

const VIDEO_B64 = existsSync('/tmp/wp231-testsrc.webm') ? readFileSync('/tmp/wp231-testsrc.webm').toString('base64') : '';

function freePort() {
  return new Promise((res, rej) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => res(p)); });
    srv.on('error', rej);
  });
}
const PORT = await freePort();
const BASE = `http://127.0.0.1:${PORT}/index.html?nolock=1`;
const SHOT_DIR = join(root, 'docs', 'v1034');
mkdirSync(SHOT_DIR, { recursive: true });

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1300);
const browser = await chromium.launch({
  headless: true, executablePath: CHROME,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

/** 桌面帧内注入指纹采样器（全画布 → 64×64 降采样 → 逐格亮度加权和，三预设全域可感） */
const FP_BOOT = `
window.__wp231 = {
  off: null,
  fp() {
    const cv = document.querySelector('.procedural-wallpaper');
    if (!cv || !cv.width) return -1;
    if (!this.off) { this.off = document.createElement('canvas'); this.off.width = 64; this.off.height = 64; }
    const g = this.off.getContext('2d');
    g.drawImage(cv, 0, 0, 64, 64);
    const d = g.getImageData(0, 0, 64, 64).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) {
      const cell = i >> 2, x = cell & 63, y = cell >> 6;
      s += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) * (1 + ((x * 7 + y * 13) % 31) * 0.01);
    }
    return Math.round(s * 100) / 100;
  },
  video() { return document.querySelector('.video-wallpaper'); },
};
`;

/** 程序化壁纸主流程：seed 预设 → 重载 → 自校准 → 开窗挂起 → 关窗恢复时序 + 相位连续 */
async function proceduralCase(page, c) {
  const out = { name: c.name, checks: [], errors: [] };
  page.on('pageerror', (e) => out.errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2400);
  let frame = page.frames().find((f) => f.url().includes('ios-desktop/index.html'));
  if (!frame) throw new Error('未找到 #sim-iframe 桌面文档');

  // 清开机弹层 + seed 预设 + 重载桌面帧（restoreWallpaper 启动恢复链接管）
  await frame.evaluate((preset) => {
    const b = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (b) b.click();
    ['md3PermissionOverlay', 'headsUpStack'].forEach((id) => {
      const e = document.getElementById(id); if (e) e.remove();
    });
    localStorage.setItem('ios-desktop:procedural-wallpaper', preset);
    location.reload();
  }, c.preset);
  await sleep(2600);
  frame = page.frames().find((f) => f.url().includes('ios-desktop/index.html'));
  await frame.evaluate(FP_BOOT);

  // ---- 阶段0：桌面播放中，自校准（200ms 漂移率 + 40ms 最小可感差） ----
  const base = await frame.evaluate(async () => {
    const { fp } = window.__wp231;
    const t200 = [];
    for (let i = 0; i < 5; i++) { t200.push(fp()); await new Promise((r) => setTimeout(r, 200)); }
    let drift = 0;
    for (let i = 1; i < t200.length; i++) drift += Math.abs(t200[i] - t200[i - 1]);
    drift /= (t200.length - 1);
    const t40 = [];
    for (let i = 0; i < 15; i++) { t40.push(fp()); await new Promise((r) => setTimeout(r, 40)); }
    let minDelta = Infinity;
    for (let i = 1; i < t40.length; i++) {
      const d = Math.abs(t40[i] - t40[i - 1]);
      if (d > 0 && d < minDelta) minDelta = d;
    }
    return { drift, minDelta: minDelta === Infinity ? 0 : minDelta, distinct: new Set(t40).size, active: !!document.querySelector('.procedural-wallpaper') };
  });
  const tol = Math.max(base.drift * 1.5, 2.0); // P1 容差：恢复首帧相位差 ≤ 1-3 帧 ≪ 200ms 漂移；旧口径 ≈ 漂移×13
  out.checks.push(['壁纸激活且播放中（指纹在变）', base.active && base.distinct >= (c.fpSensitive ? 3 : 2), `distinct=${base.distinct} drift200=${base.drift.toFixed(2)} minΔ40=${base.minDelta.toFixed(2)}`]);

  // ---- 阶段1：开窗挂起 2s（挂起期指纹恒定） ----
  await frame.evaluate(() => {
    const icon = document.querySelector('.dock-bar .dock-app-icon[data-id="msg"]');
    if (icon) icon.click();
  });
  await sleep(2000);
  const suspend = await frame.evaluate(() => ({ fp: window.__wp231.fp(), cur: !!document.querySelector('#appWindow.open') }));
  await sleep(600);
  const suspend2 = await frame.evaluate(() => window.__wp231.fp());
  out.checks.push(['应用全屏挂起（窗口开 + 壁纸冻结）', suspend.cur && suspend.fp === suspend2, `fp=${suspend.fp} === ${suspend2}`]);

  // ---- 阶段2：home 关窗 —— fillRect 直探恢复绘制时刻 + 页内 8ms 指纹采样（单 evaluate 免往返抖动） ----
  const resume = await frame.evaluate(() => {
    const { fp } = window.__wp231;
    const cv = document.querySelector('.procedural-wallpaper');
    const frozen = fp(); // 挂起末帧基线（= 开窗前末帧 + 零累积）
    // 绘制直探：三预设背景层均经 fillRect；按 >5ms 间隔去重为「帧」
    const proto = CanvasRenderingContext2D.prototype;
    const origFill = proto.fillRect;
    let lastStamp = -1e9;
    const drawTimes = [];
    proto.fillRect = function (x, y, w, h) {
      if (this.canvas === cv) {
        const t = performance.now();
        if (t - lastStamp > 5) { drawTimes.push(t); lastStamp = t; }
      }
      return origFill.apply(this, arguments);
    };
    const t0 = performance.now();
    document.querySelector('.nvb-home').click();
    return new Promise((resolve) => {
      let firstChange = null, firstFp = null;
      const animSeen = new Set();
      const iv = setInterval(() => {
        const t = performance.now() - t0;
        const f = fp();
        if (f !== frozen && firstChange === null) { firstChange = t; firstFp = f; }
        if (firstChange !== null) animSeen.add(f);
        if (t >= 700) {
          proto.fillRect = origFill; // 还原探针
          clearInterval(iv);
          const firstDraw = drawTimes.length ? drawTimes[0] - t0 : null;
          resolve({ firstDraw, firstChange, firstFp, frozen, animDistinct: animSeen.size });
        }
      }, 8);
    });
  });
  out.checks.push(['P2 关窗起手 ≤80ms 内壁纸已恢复绘制（fillRect 直探）', resume.firstDraw !== null && resume.firstDraw <= 80, `firstDraw=${resume.firstDraw === null ? 'null' : resume.firstDraw.toFixed(0) + 'ms'} firstChange=${resume.firstChange === null ? 'null' : resume.firstChange.toFixed(0) + 'ms'}`]);
  if (c.fpSensitive) {
    out.checks.push(['P2 关窗动画期壁纸持续在动（700ms 窗口内 ≥3 个不同画面）', resume.animDistinct >= 3, `distinct=${resume.animDistinct}`]);
  } else {
    out.checks.push(['（信息项）sunset 指纹低敏：动画期不同画面数', true, `distinct=${resume.animDistinct}（绘制调用已由 fillRect 直探证实）`]);
  }

  // ---- 阶段3：P1 相位连续 —— 恢复首帧（首个可感变化帧）↔ 挂起末帧 ----
  const jump = resume.firstFp === null ? Infinity : Math.abs(resume.firstFp - resume.frozen);
  out.checks.push(['P1 恢复首帧与挂起末帧连续（≤ max(自校准200ms漂移×1.5, 2.0)；旧口径≈漂移×13）', jump <= tol, `jump=${jump === Infinity ? '∞' : jump.toFixed(2)} tol=${tol.toFixed(2)}`]);

  // 回桌面回稳后仍在播放（信息项）
  await sleep(900);
  const late = await frame.evaluate(() => window.__wp231.fp());
  out.checks.push(['（信息项）回稳后壁纸仍在演化', late !== resume.frozen, `late=${late} frozen=${resume.frozen}`]);

  await page.screenshot({ path: join(SHOT_DIR, `${c.shot}.png`) });
  return out;
}

/** 视频壁纸用例：挂起暂停 / ≤80ms 恢复 / 取色后不回卷（根因C） */
async function videoCase(page, c) {
  const out = { name: c.name, checks: [], errors: [] };
  page.on('pageerror', (e) => out.errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2400);
  let frame = page.frames().find((f) => f.url().includes('ios-desktop/index.html'));
  if (!frame) throw new Error('未找到 #sim-iframe 桌面文档');
  await frame.evaluate(() => {
    const b = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (b) b.click();
    ['md3PermissionOverlay', 'headsUpStack'].forEach((id) => {
      const e = document.getElementById(id); if (e) e.remove();
    });
  });
  if (!VIDEO_B64) {
    out.checks.push(['视频用例跳过（无测试源）', true, 'no /tmp/wp231-testsrc.webm']);
    await page.screenshot({ path: join(SHOT_DIR, `${c.shot}.png`) });
    return out;
  }

  // 装载视频壁纸（走 __videoWallpaperApply 真入口，persist=true → 700ms 后取色采样）
  const applied = await frame.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'video/webm' });
    return window.__videoWallpaperApply(blob, { persist: true, showToast: false });
  }, VIDEO_B64);
  await sleep(650);
  const preSample = await frame.evaluate(() => { const v = window.__wp231?.video() || document.querySelector('.video-wallpaper'); return { active: !!v, paused: v ? v.paused : null, ct: v ? v.currentTime : -1 }; });
  out.checks.push(['视频壁纸装载且自动播放', applied === true && preSample.active && preSample.paused === false, `paused=${preSample.paused} ct=${preSample.ct.toFixed(2)}`]);
  const ctPre = preSample.ct;

  await sleep(2300); // 等 700ms 延迟取色 + 5 点 seek 采样 + 位置还原
  const post = await frame.evaluate(async () => {
    const v = document.querySelector('.video-wallpaper');
    const series = [];
    for (let i = 0; i < 12; i++) { series.push(v.currentTime); await new Promise((r) => setTimeout(r, 60)); }
    let maxDrop = 0;
    for (let i = 1; i < series.length; i++) maxDrop = Math.max(maxDrop, series[i - 1] - series[i]);
    return { paused: v.paused, ct: v.currentTime, maxDrop };
  });
  out.checks.push(['P4 取色采样后播放位置不回卷（60ms 采样序列零 >0.4s 回落；旧实现 seek 0 必炸）', post.maxDrop <= 0.4, `maxDrop=${post.maxDrop.toFixed(3)} ct=${post.ct.toFixed(2)} (采样前=${ctPre.toFixed(2)})`]);
  out.checks.push(['P4 采样后播放推进正常（ct 持续前进）', post.paused === false && post.ct > ctPre, `paused=${post.paused}`]);

  // 开窗挂起 → 关窗 ≤80ms 恢复
  await frame.evaluate(() => { const icon = document.querySelector('.dock-bar .dock-app-icon[data-id="msg"]'); if (icon) icon.click(); });
  await sleep(1200);
  const susp = await frame.evaluate(() => { const v = document.querySelector('.video-wallpaper'); return v ? v.paused : null; });
  out.checks.push(['视频壁纸随应用全屏挂起暂停', susp === true, `paused=${susp}`]);
  const resume = await frame.evaluate(() => {
    const v = document.querySelector('.video-wallpaper');
    const t0 = performance.now();
    document.querySelector('.nvb-home').click();
    return new Promise((resolve) => {
      let firstPlay = null;
      const iv = setInterval(() => {
        const t = performance.now() - t0;
        if (v && v.paused === false && firstPlay === null) firstPlay = t;
        if (firstPlay !== null || t >= 1500) { clearInterval(iv); resolve({ firstPlay, stillThere: !!v }); }
      }, 8);
    });
  });
  out.checks.push(['P2 关窗起手 ≤80ms 内视频恢复播放', resume.firstPlay !== null && resume.firstPlay <= 80, `firstPlay=${resume.firstPlay === null ? 'null' : resume.firstPlay.toFixed(0) + 'ms'}`]);
  await sleep(700);
  await page.screenshot({ path: join(SHOT_DIR, `${c.shot}.png`) });
  return out;
}

const CASES = [
  { name: '手机 390×844 · aurora', width: 390, height: 844, preset: 'aurora', shot: 'v231-phone-aurora', kind: 'proc', fpSensitive: true },
  { name: '平板 820×1180 · aurora', width: 820, height: 1180, preset: 'aurora', shot: 'v231-tablet-aurora', kind: 'proc', fpSensitive: true },
  { name: '桌面 1440×900 · aurora', width: 1440, height: 900, preset: 'aurora', shot: 'v231-desktop-aurora', kind: 'proc', fpSensitive: true },
  { name: '桌面 1440×900 · sunset', width: 1440, height: 900, preset: 'sunset', shot: 'v231-desktop-sunset', kind: 'proc', fpSensitive: false },
  { name: '桌面 1440×900 · starry', width: 1440, height: 900, preset: 'starry', shot: 'v231-desktop-starry', kind: 'proc', fpSensitive: true },
  { name: '桌面 1440×900 · video', width: 1440, height: 900, shot: 'v231-desktop-video', kind: 'video' },
];

const failures = [];
let caseNo = 0;
for (const c of CASES) {
  caseNo++;
  const ctx = await browser.newContext({ viewport: { width: c.width, height: c.height } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const page = await ctx.newPage();
  let out;
  try {
    out = c.kind === 'video' ? await videoCase(page, c) : await proceduralCase(page, c);
  } catch (e) {
    out = { name: c.name, checks: [['用例执行', false, String(e)]], errors: [] };
  }
  console.log(`\n===== [${caseNo}/${CASES.length}] ${out.name} =====`);
  for (const [label, ok, detail] of out.checks) {
    console.log(`  ${ok ? '✓' : '✗'} ${label}  (${detail})`);
    if (!ok) failures.push(`${out.name} :: ${label} (${detail})`);
  }
  if (out.errors.length) {
    console.log(`  ✗ pageerror ×${out.errors.length}: ${out.errors[0]}`);
    failures.push(`${out.name} :: pageerror ×${out.errors.length}`);
  } else {
    console.log('  ✓ 零 pageerror');
  }
  await ctx.close();
}

await browser.close();
server.kill();
console.log('\n========================================');
if (failures.length) {
  console.log(`[v231] FAIL ${failures.length} 项：`);
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
} else {
  console.log('[v231] 全部通过');
  process.exit(0);
}
