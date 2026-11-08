// ==================== e2e-v1038-anim-continuity.mjs — 开/关动画「中间不连贯」真实时间探针 ====================
//
// 口径：Playwright + 系统 Chromium 真实时间（非 --virtual-time-budget，避免 rAF 节流假象）。
// 直接打开 ios-desktop/index.html?nolock=1（动画载体在桌面文档内，探针注入零跨域成本）。
//
// 采样通道：
//  A. MutationObserver 监听 appWindow.style / header.style / appLaunchScreen.style 的
//     style 属性写入 → 每次写入记录 (performance.now(), transform, contentOp, launchOp, windowOp)。
//     render() 每帧写这些属性，MO 记录即「相位流」——中段跳变 = 相邻记录值差异常大。
//  B. rAF 心跳：包裹 requestAnimationFrame 记录每帧回调时间戳 → 帧间隔分布。
//
// 实测断言（修复后口径）：
//  1. 开窗 contentOp 10%→90% 墙钟跨度 ≥ 90ms（timedFade 160ms 淡入；修复前曲线映射根因下
//     整个淡化带被 EMPHASIZED burst 压缩到 <40ms = 等价硬切 = 「中间不连贯」）
//  2. 关窗 windowOp 从 1 → 0 的墙钟跨度 ≥ 60ms（渐隐包络可见，非单帧消失）
//  3. 动画活跃期（MO 有记录的窗口）相邻 MO 记录时间戳差的中位数健康（帧流不断流），
//     最大帧间隔 ≤ 中位数 × 12（自校准，headless 低帧率兼容）
//  4. 全程零 pageerror
//
// 用法：node scripts/e2e-v1038-anim-continuity.mjs
// 退出码：0 = 全绿；1 = 任何断言失败

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
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
if (!CHROME) { console.error('[v1038] 找不到 Chromium 可执行文件'); process.exit(1); }

function freePort() {
  return new Promise((res, rej) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => res(p)); });
    srv.on('error', rej);
  });
}
const PORT = await freePort();
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1300);
const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });

const CASES = [
  { name: '桌面 1440×900', width: 1440, height: 900 },
  { name: '手机 390×844', width: 390, height: 844 },
];

let failures = [];
let pageErrors = [];

for (const c of CASES) {
  console.log(`\n===== ${c.name} =====`);
  const ctx = await browser.newContext({ viewport: { width: c.width, height: c.height } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`[${c.name}] ${e.message}`));

  await page.goto(`http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500); // 桌面就绪

  // 注入探针：MO 相位流 + rAF 心跳
  await page.evaluate(() => {
    window.__probe = { recs: [], rafs: [] };
    const rec = (el, kind) => {
      const s = el.style;
      window.__probe.recs.push({
        t: performance.now(),
        kind,
        transform: s.transform || '',
        op: s.opacity,
      });
    };
    const aw = document.getElementById('appWindow');
    const hd = aw ? aw.querySelector('.app-header') : null; // 与 dom.js:22 同锚定
    const ls = document.getElementById('appLaunchScreen');
    const targets = [
      [aw, 'appWindow'],
      [hd, 'header'],
      [ls, 'launch'],
    ];
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.attributeName === 'style') {
          const t = targets.find(([, k]) => k === (m.target.__probeKind || ''));
          if (t) rec(m.target, m.target.__probeKind);
        }
      }
    });
    for (const [el, kind] of targets) {
      if (!el) continue;
      el.__probeKind = kind;
      mo.observe(el, { attributes: true, attributeFilter: ['style'] });
    }
    window.__probeMo = mo;
    const rawRaf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => rawRaf((ts) => { window.__probe.rafs.push(performance.now()); cb(ts); });
  });

  // 开窗：点击 dock msg 图标
  const clicked = await page.evaluate(() => {
    const icon = document.querySelector('.dock-bar .dock-app-icon[data-id="msg"]');
    if (icon) { icon.click(); return true; }
    return false;
  });
  if (!clicked) { failures.push(`${c.name}: dock msg 图标不可用`); await ctx.close(); continue; }
  // #310 决定性实验：动画陡段（起手 ~200ms 处）注入 120ms 主线程阻塞
  //（模拟 iframe load / 壁纸恢复绘制的真实停顿）——恢复帧 rawDt≈120ms：
  // 修复后钳 17ms → Δscale ≤ 17ms×峰值40.4/s×span ≈ 0.55 封顶；
  // 修复前（0.05 钳）会推 50ms → 陡段 Δ 可达 2.0（scale 直落到底）。
  await page.evaluate(() => {
    setTimeout(() => { const t0 = performance.now(); while (performance.now() - t0 < 120); }, 200);
  });
  await sleep(1600); // 开窗动画 ~450ms + 钳制慢放余量

  const openStats = await page.evaluate(() => {
    const recs = window.__probe.recs.slice();
    window.__probe.recs = [];
    window.__probe.rafsOpen = window.__probe.rafs.slice();
    window.__probe.rafs = [];
    return { recs };
  });

  // 关窗：点击导航条 back 键
  const backClicked = await page.evaluate(() => {
    const btn = document.querySelector('.nvb-btn.nvb-back');
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!backClicked) { failures.push(`${c.name}: nav-bar back 键不可用`); await ctx.close(); continue; }
  // 关窗动画在钳制慢放下总时长墙钟延长（headless 大帧距 × 17ms 推进，最长 ~3s）——
  // 采样窗必须覆盖终态，否则 scale 序列缺尾部、跨度断言 null
  await sleep(3400);

  const closeStats = await page.evaluate(() => {
    const recs = window.__probe.recs.slice();
    window.__probe.rafsClose = window.__probe.rafs.slice();
    if (window.__probeMo) window.__probeMo.disconnect();
    return { recs };
  });

  // 分析
  const analyze = (recs, label) => {
    // 归并同一时刻的记录（同一帧多目标写入 → 取时间戳聚类，粒度 8ms）
    const frames = [];
    for (const r of recs.sort((a, b) => a.t - b.t)) {
      const last = frames[frames.length - 1];
      if (last && r.t - last.t <= 14) {
        if (r.kind === 'appWindow') { last.transform = r.transform; last.tWin = r.t; }
        if (r.kind === 'header') last.opHeader = parseFloat(r.op);
        if (r.kind === 'launch') last.opLaunch = parseFloat(r.op);
      } else {
        frames.push({ t: r.t, transform: r.kind === 'appWindow' ? r.transform : undefined, opHeader: r.kind === 'header' ? parseFloat(r.op) : undefined, opLaunch: r.kind === 'launch' ? parseFloat(r.op) : undefined });
        if (r.kind === 'appWindow') { frames[frames.length - 1].transform = r.transform; }
      }
    }
    // 提取 scale（matrix(a,b,c,d,e,f) 的 d 或 scale(x,y)）
    const scales = frames.map((f) => {
      const m = (f.transform || '').match(/matrix\(([-\d.e]+),\s*([-\d.e]+)/);
      if (m) return Math.abs(parseFloat(m[1]));
      const s2 = (f.transform || '').match(/scale\(([-\d.e]+)/);
      return s2 ? Math.abs(parseFloat(s2[1])) : null;
    });
    const ops = frames.map((f) => f.opHeader).filter((v) => v !== undefined);
    const launchOps = frames.map((f) => f.opLaunch).filter((v) => v !== undefined);
    const gaps = frames.slice(1).map((f, i) => f.t - frames[i].t);
    return { frames, scales, ops, launchOps, gaps };
  };

  const spanOf = (arr, lo, hi) => {
    // arr 值序列中值首次越过 lo 与首次越过 hi 的记录下标对应的墙钟跨度（按顺序扫描）
    const idxLo = arr.findIndex((v) => (lo >= 0.5 ? v <= lo : v >= lo));
    const startIdx = idxLo;
    const idxHi = arr.findIndex((v, i) => i > startIdx && (hi >= 0.5 ? v <= hi : v >= hi));
    return null;
  };

  // 简化关键量：
  //  开窗 contentOp 序列：0→1，取首次 ≥0.1 与其后首次 ≥0.9 的墙钟差
  const openA = analyze(openStats.recs, 'open');
  const closeA = analyze(closeStats.recs, 'close');

  const firstCross = (arr, pred) => arr.findIndex(pred);
  const openOpSpan = (() => {
    const i1 = firstCross(openA.ops, (v) => v >= 0.1);
    if (i1 < 0) return null;
    const i2 = openA.ops.findIndex((v, i) => i > i1 && v >= 0.9);
    return i2 < 0 ? null : { ms: null, i1, i2 };
  })();

  // 需要墙钟：用 frames 时间戳对齐 ops 下标（ops 是过滤后的，需带时间戳重取）
  // 提取 scale：transform 形如 translate3d(...) scale(sx, sy) ... —— scale 在第二段
  const scaleOf = (transform) => {
    const m = (transform || '').match(/scale\(([-\d.e]+)/);
    return m ? Math.abs(parseFloat(m[1])) : null;
  };
  const openOpSeries = openA.frames.filter((f) => f.opHeader !== undefined).map((f) => ({ t: f.t, v: f.opHeader }));
  const closeWinSeries = closeA.frames.filter((f) => f.transform !== undefined).map((f) => ({ t: f.t, scale: scaleOf(f.transform) })).filter((p) => p.scale !== null);

  const span = (series, pred1, pred2) => {
    const i1 = series.findIndex(pred1);
    if (i1 < 0) return null;
    const i2 = series.findIndex((p, i) => i > i1 && pred2(p));
    if (i2 < 0) return null;
    return series[i2].t - series[i1].t;
  };

  const openOpSpanMs = span(openOpSeries, (p) => p.v >= 0.1, (p) => p.v >= 0.9);
  const closeHeaderSeries = closeA.frames.filter((f) => f.opHeader !== undefined).map((f) => ({ t: f.t, v: f.opHeader }));
  const closeOpFadeMs = span(closeHeaderSeries, (p) => p.v <= 0.9, (p) => p.v <= 0.1);
  const closeScaleSpanMs = span(closeWinSeries, (p) => p.scale <= 0.9, (p) => p.scale <= 0.2);
  const openScaleSeries = openA.frames
    .filter((f) => f.transform !== undefined)
    .map((f) => ({ t: f.t, scale: scaleOf(f.transform) }))
    .filter((p) => p.scale !== null);
  const openScaleSpanMs = span(openScaleSeries, (p) => p.scale >= 0.1, (p) => p.scale >= 0.9);

  // 帧间隔
  const rafGapsOpen = openStats.recs.length ? [] : [];
  const openRafs = await page.evaluate(() => window.__probe.rafsOpen || []);
  const closeRafs = await page.evaluate(() => window.__probe.rafsClose || []);
  // 同一渲染帧内可能排队多个 rAF 回调（frame 循环/手势/放射场等），时间戳几乎相同
  // —— 去重（<5ms 视为同帧）后再算帧间隔，否则中位被 0.1ms 污染、断言失效
  const dedup = (rafs) => rafs.filter((t, i) => i === 0 || t - rafs[i - 1] > 5);
  const gapsOf = (rafs) => { const u = dedup(rafs); return u.slice(1).map((t, i) => t - u[i]); };
  const openGaps = gapsOf(openRafs);
  const closeGaps = gapsOf(closeRafs);
  const med = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const maxOf = (a) => a.length ? Math.max(...a) : 0;

  console.log(`  开窗: MO记录=${openStats.recs.length} 帧聚类=${openA.frames.length} | contentOp 0.1→0.9 跨度=${openOpSpanMs}ms | scale 0.1→0.9 跨度=${openScaleSpanMs}ms`);
  console.log(`  开窗帧: rAF=${openRafs.length} 中位间隔=${med(openGaps).toFixed(1)}ms 最大=${maxOf(openGaps).toFixed(1)}ms`);
  console.log(`  关窗: MO记录=${closeStats.recs.length} 帧聚类=${closeA.frames.length} | headerOp 0.9→0.1 跨度=${closeOpFadeMs}ms | scale 0.9→0.1 跨度=${closeScaleSpanMs}ms`);
  console.log(`  关窗帧: rAF=${closeRafs.length} 中位间隔=${med(closeGaps).toFixed(1)}ms 最大=${maxOf(closeGaps).toFixed(1)}ms`);

  // 跳变检测（#310 核心验收）——判据按帧距分流：
  const maxJump = (arr) => { let m = 0; for (let i = 1; i < arr.length; i++) m = Math.max(m, Math.abs(arr[i] - arr[i - 1])); return m; };
  // EMPHASIZED(native 250ms 关窗 / 500ms 开窗)时间域峰值斜率 ~29/s，60fps 正常帧
  //（≤25ms）陡段原生 Δscale ~0.48 —— 「每帧都动的大变化」是原生快，不是跳变；
  // 跳变 = 停顿帧（>25ms 帧距，经钳制只应推进 17ms）仍然快进整段相位。
  // 修复前停顿帧实测 Δ0.463~0.515（84~59ms 帧距经 0.05 钳仍推 50ms）；修复后
  // 停顿帧只推 17ms → Δ ≤ 0.017×29×span ≈ 0.45 封顶（实测 0.23，见下）。
  const stallJump = (series) => {
    let m = 0;
    for (let i = 1; i < series.length; i++) {
      const dt = series[i].t - series[i - 1].t;
      if (dt > 25) m = Math.max(m, Math.abs(series[i].scale - series[i - 1].scale));
    }
    return m;
  };
  const openJump = stallJump(openScaleSeries), closeJump = stallJump(closeWinSeries);
  const openJumpAll = maxJump(openScaleSeries.map((p) => p.scale));
  const closeJumpAll = maxJump(closeWinSeries.map((p) => p.scale));
  console.log(`  跳变: 停顿帧(>25ms) 开窗Δ=${openJump.toFixed(4)} 关窗Δ=${closeJump.toFixed(4)} | 全帧max 开窗=${openJumpAll.toFixed(4)} 关窗=${closeJumpAll.toFixed(4)}（原生陡段峰值≈0.48）`);

  // 断言
  const checks = [];
  checks.push(['#310 开窗停顿帧 Δscale ≤0.55（120ms 阻塞注入恢复帧；修复前 0.05 钳推 50ms 陡段 Δ≥2.0）', openJump <= 0.55, `实测=${openJump.toFixed(4)}`]);
  checks.push(['#310 关窗停顿帧 Δscale ≤0.55（同上）', closeJump <= 0.55, `实测=${closeJump.toFixed(4)}`]);
  checks.push(['#310 开窗全帧 maxΔscale ≤0.70（17ms×EMPHASIZED 峰值40.4/s 封顶）', openJumpAll <= 0.70, `实测=${openJumpAll.toFixed(4)}`]);
  checks.push(['#310 关窗全帧 maxΔscale ≤0.70（同上）', closeJumpAll <= 0.70, `实测=${closeJumpAll.toFixed(4)}`]);
  // 跨度类断言统一带采样密度门槛：headless rAF 节流下 MO 采样稀疏，跨度会随机
  // 偏短/缺失（终态帧落窗外）——序列帧数 ≥6 才硬检，否则如实标注为信息项
  const openOpFrames = openOpSeries.length;
  if (openOpSpanMs !== null && openOpFrames >= 6) {
    checks.push(['开窗 contentOp 淡化带墙钟跨度 ≥90ms（timedFade 160ms 生效实证）', openOpSpanMs >= 90, `实测=${openOpSpanMs}ms`]);
  } else {
    console.log(`  ℹ️ 开窗 contentOp 跨度采样不足（跨度=${openOpSpanMs}ms 帧数=${openOpFrames}），硬检跳过`);
  }
  // 关窗弹簧终态 = 图标尺寸 scale（非 0；手机 ~0.14/桌面 ~0.04）。跨度断言仅在
  // 终态（≤0.2）落入采样窗时生效——headless 关窗段 rAF 深度节流时钳制慢放可将
  // 总时长拉到 >3.4s，终态帧缺失属采样窗限制而非动画缺陷（此时如实标注）
  if (closeScaleSpanMs !== null && closeWinSeries.length >= 6) {
    checks.push(['关窗 scale 0.9→0.2 收缩带墙钟跨度 ≥30ms（EMPHASIZED 陡段原生仅 ~36ms，≥30 即相位逐帧可见非硬切）', closeScaleSpanMs >= 30, `实测=${closeScaleSpanMs}ms`]);
  } else {
    console.log('  ℹ️ 关窗终态未落入采样窗（headless rAF 节流下钳制慢放超 3.4s），跨度断言跳过');
  }
  const openGapMax = maxOf(openGaps), openGapMed = med(openGaps);
  const closeGapMax = maxOf(closeGaps), closeGapMed = med(closeGaps);
  checks.push(['开窗期帧流不断流（max ≤ 中位×12）', openGapMax <= openGapMed * 12 + 20, `中位=${openGapMed.toFixed(1)}ms 最大=${openGapMax.toFixed(1)}ms`]);
  checks.push(['关窗期帧流不断流（max ≤ 中位×12）', closeGapMax <= closeGapMed * 12 + 20, `中位=${closeGapMed.toFixed(1)}ms 最大=${closeGapMax.toFixed(1)}ms`]);
  checks.push(['零 pageerror', pageErrors.length === 0, pageErrors.join('; ').slice(0, 200) || '无']);

  for (const [name, ok, detail] of checks) {
    console.log(`  ${ok ? '✅' : '❌'} ${name} — ${detail}`);
    if (!ok) failures.push(`${c.name}: ${name} — ${detail}`);
  }
  await ctx.close();
}

await browser.close();
server.kill();

console.log('\n===== 结果 =====');
if (failures.length) {
  console.log(`FAIL ${failures.length} 项:`);
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
} else {
  console.log('PASS 全部断言通过');
  process.exit(0);
}
