// ==================== e2e-v1144-statusbar-double-render.mjs — #323 状态栏双重渲染逐帧取证 ====================
//
// 卡面（#259-⑥）：快速下拉控制中心/合体模式时「状态栏重叠两次」。首轮探针（10:31Z）两缺口：
//   ① 起手 y=8 未驱动状态机（本轮：真实 CDP 鼠标 y≤55 起手，段一/段二/场景轨完整驱动）；
//   ② 只采了 #statusBar 单选择器（本轮：状态栏 + 面板内第二状态行 collapsedShadeHeader
//      同帧对账 + elementFromPoint 命中面）。
//
// 结构事实（阅读清单锚）：
//   · `pull-down-gesture.js:127-149` statusBarAlphaFromExpansion（expansion 0→1 ⟺ α 1→0）
//     + applyStatusBarShadeFade（拖拽跟手帧）/ tweenStatusBarShadeFade（开合补间）；
//   · `pull-down-gesture.js:636-731` 起手条件 = pointerdown y≤55（未锁屏/非图标拖拽/非编辑态）；
//     段一 dy≤0.38H 面板滑入；段二满开 + 场景轨（合体展开）；
//   · `pull-down-gesture.js:767-789` Shade 场景上滑收起（dy<-5，|dy|>|dx|*0.4）；
//   · `index.html:222` collapsedShadeHeader = 面板内第二条状态行（AOSP CollapsedShadeHeader
//     同构：时钟/日期/电量——正常态下壳状态栏 α 随 expansion 渐隐，头部接管顶带）。
//
// 判定口径（与 DoD 对齐）：
//   · 「双行共存帧」= 壳状态栏可见(α>0.3) ∧ 面板第二状态行占据顶带(rect.top≤60 ∧ 可见)
//     —— 过渡期交叉淡化窗口（AOSP 同构）如实计量；**缺陷判定 = 面板落定后仍共存**
//     （expansion=1 时壳 α 应≤0.05）或收起落定后壳 α 未回 1（停中间值）；
//   · 「双实例帧」= '.status-bar,.app-window-status-bar' 节点数>1 且均可见。
//
// 用法：MD3_CHROME=… node scripts/e2e-v1144-statusbar-double-render.mjs
// 退出码 0 = 全绿；1 = 发现缺陷或断言失败。报告写 docs/audits/ 的输入由交付帖引用本输出。

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res, rej) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  s.on('error', rej);
});
const CHROME = [
  process.env.MD3_CHROME, chromium.executablePath(),
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => p && existsSync(p));
if (!CHROME) { console.error('[v1144-sb] 找不到 Chromium'); process.exit(1); }

let BASE = process.env.BASE;
let server = null;
if (!BASE) {
  const port = await freePort();
  BASE = `http://127.0.0.1:${port}`;
  server = spawn('node', [join(ROOT, 'scripts', 'serve.mjs'), '--no-open', '--port', String(port)], { cwd: ROOT, stdio: 'ignore' });
  await sleep(1200);
}

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.error('  ✗ ' + l); } };
const findings = [];

/** 页内采样器：rAF 逐帧推样本（无头 ~30fps，帧距如实记录） */
async function armSampler(page) {
  await page.evaluate(() => {
    const S = (window.__sbSamples = []);
    window.__pdEv = { moves: 0, upT: 0, downT: 0 };
    window.addEventListener('pointermove', () => { window.__pdEv.moves++; }, true);
    window.addEventListener('pointerdown', () => { window.__pdEv.downT = performance.now(); }, true);
    window.addEventListener('pointerup', () => { window.__pdEv.upT = performance.now(); }, true);
    const sb = () => document.getElementById('statusBar');
    const canvas = () => document.getElementById('pullPanelsCanvas');
    const header = () => document.getElementById('collapsedShadeHeader');
    const tyOf = (el) => {
      if (!el) return null;
      const m = getComputedStyle(el).transform;
      if (!m || m === 'none') return 0;
      const v = m.match(/matrix\(([^)]+)\)/);
      return v ? parseFloat(v[1].split(',')[5]) : 0;
    };
    const step = () => {
      const b = sb(), c = canvas(), h = header();
      // 有效可见性 = 自身×父链 opacity 乘积（关窗态 .app-window-status-bar 自身 op=1
      // 但父容器 .app-window opacity:0 —— 不乘父链会把图标态误判为可见双实例）
      const effOp = (el) => {
        let op = 1;
        for (let n = el; n; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
          op *= parseFloat(cs.opacity || '1');
          if (op <= 0.01) return 0;
        }
        return op;
      };
      const bars = [...document.querySelectorAll('.status-bar, .app-window-status-bar')].map((x) => {
        const r = x.getBoundingClientRect();
        return { cls: x.className, op: getComputedStyle(x).opacity, eff: +effOp(x).toFixed(3), top: Math.round(r.top), w: Math.round(r.width) };
      });
      const hb = h ? h.getBoundingClientRect() : null;
      S.push({
        t: performance.now(),
        sbOp: b ? getComputedStyle(b).opacity : null,
        sbInline: b ? (b.style.opacity || '(css)') : null,
        sbTrans: b ? (b.style.transition || '(css)').slice(0, 26) : null,
        canvasInline: c ? (c.style.transform || '(css)').slice(0, 42) : null,
        moves: window.__pdEv.moves,
        sinceUp: window.__pdEv.upT ? Math.round(performance.now() - window.__pdEv.upT) : null,
        sbCount: bars.filter((x) => x.w >= 120 && x.eff > 0.1).length,
        bars,
        canvasTy: tyOf(c),
        overlay: document.getElementById('pullPanelsOverlay')?.classList.contains('active') || false,
        headerTop: hb ? Math.round(hb.top) : null,
        headerVis: h ? getComputedStyle(h).visibility : null,
        hitTop: (document.elementFromPoint(200, 20) || {}).id || (document.elementFromPoint(200, 20) || {}).className || '',
      });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/** 手势原语（真实 CDP 鼠标） */
async function pull(page, W, H, { to, steps, hold }) {
  await page.mouse.move(W / 2, 10);
  await page.mouse.down();
  const dx = 0;
  for (let i = 1; i <= steps; i++) {
    const y = 10 + (to - 10) * (i / steps);
    await page.mouse.move(W / 2 + dx, y, { steps: 1 });
    if (hold) await sleep(hold / steps);
  }
  await page.mouse.up();
}
async function pushUp(page, W, H, { steps }) {
  await page.mouse.move(W / 2, H * 0.5);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(W / 2, H * 0.5 - (H * 0.5 - 8) * (i / steps), { steps: 1 });
  }
  await page.mouse.up();
}
/** 组间收尾：面板必须关净（防组间状态污染），最多三轮推上收起 */
async function ensureClosed(page) {
  for (let i = 0; i < 3; i++) {
    const open = await page.evaluate(() => document.getElementById('pullPanelsOverlay').classList.contains('active'));
    if (!open) return;
    await pushUp(page, 390, 844, { steps: 8 });
    await sleep(480);
  }
}

/** 组执行 + 缺陷分析 */
async function runGroup(page, W, H, name, fn) {
  const t0 = Date.now();
  await page.evaluate(() => { if (window.__sbSamples) window.__sbSamples.length = 0; }); // 原地清空：rAF 闭包持有同一引用
  await fn();
  await sleep(650); // 落定
  const S = await page.evaluate(() => window.__sbSamples || []);
  ok(S.length > 0, `${name} 采样器捕获 ${S.length} 帧（0 帧 = 手势未驱动状态机，判失败）`);
  const frameMs = S.length > 1 ? (S[S.length - 1].t - S[0].t) / (S.length - 1) : 0;
  // 缺陷 A：双行共存 —— 顶带内窗 [−10, 60]：头部在带内 ∧ 壳状态栏 α>0.3。
  // 「收场前缘」帧（α 回升起点起 350ms 内：closePullPanels/restore 的 α 时长补间与
  // canvas 收场补间并发，而顶带在面板完全离场前恒被覆盖）＝ z 序裁决待决项
  // （status-bar z 900 > pull-panels 850，bar 画在 shade 之上；根治二选一留维护者：
  //  A. bar 入面板下层带 845  B. α 二值跟顶带覆盖）——如实计数，不计 fail。
  const alphaRise = [];
  for (let i = 1; i < S.length; i++) {
    const a = parseFloat(S[i - 1].sbOp || '0'), b = parseFloat(S[i].sbOp || '0');
    if (b > a + 0.02) alphaRise.push(S[i].t);
  }
  const inAdjudication = (t) => alphaRise.some((t0) => t >= t0 && t <= t0 + 350);
  const inStrip = S.filter((f) => f.headerTop !== null && f.headerTop >= -10 && f.headerTop <= 60);
  const doubleRow = inStrip.filter((f) => parseFloat(f.sbOp) > 0.3 && !inAdjudication(f.t));
  const doubleRowAdjudication = inStrip.filter((f) => parseFloat(f.sbOp) > 0.3 && inAdjudication(f.t)).length;
  const arrivedGhost = S.filter((f) => f.canvasTy !== null && f.canvasTy > -8 && f.overlay && parseFloat(f.sbOp) > 0.15 && !inAdjudication(f.t));
  const arrivedMaxOp = Math.max(0, ...S.filter((f) => f.canvasTy !== null && f.canvasTy > -8 && f.overlay).map((f) => parseFloat(f.sbOp) || 0));
  // 缺陷 B：落定后（overlay 关）壳状态栏 α 未回 1（停中间值）
  const closedSettled = S.slice(-12).filter((f) => !f.overlay);
  const stuckAlpha = closedSettled.filter((f) => f.sbOp !== null && parseFloat(f.sbOp) < 0.85);
  // 缺陷 C：双实例 —— 真实可见双状态行（有效透明度乘父链 ≥0.1 ∧ 宽 ≥120px）；
  // 关窗态 app-window 停在图标比例窗、父链 opacity:0，不构成视觉双行
  const multiInstance = S.filter((f) => f.sbCount > 1);
  const rec = {
    group: name, frames: S.length, frameMs: +frameMs.toFixed(1),
    doubleRowFrames: doubleRow.length, doubleRowAdjudication,
    arrivedGhostFrames: arrivedGhost.length,
    arrivedMaxOp: +arrivedMaxOp.toFixed(3),
    stuckAlphaFrames: stuckAlpha.length,
    multiInstanceFrames: multiInstance.length,
    sampleDouble: doubleRow[0] ? { sbOp: doubleRow[0].sbOp, headerTop: doubleRow[0].headerTop, canvasTy: Math.round(doubleRow[0].canvasTy), hitTop: String(doubleRow[0].hitTop).slice(0, 40) } : null,
    sampleStuck: stuckAlpha[0] ? { sbOp: stuckAlpha[0].sbOp, overlay: stuckAlpha[0].overlay } : null,
    ghostWindow: (() => {
      const i = S.findIndex((f) => f.canvasTy !== null && f.canvasTy > -8 && f.overlay && parseFloat(f.sbOp) > 0.15);
      if (i < 0) return null;
      return S.slice(Math.max(0, i - 6), i + 7).map((f) => ({
        t: Math.round(f.t), sbOp: f.sbOp, inl: f.sbInline, tr: f.sbTrans,
        cinl: f.canvasInline, mv: f.moves, up: f.sinceUp,
        ty: Math.round(f.canvasTy ?? -9999), ov: f.overlay,
        hd: f.headerTop, hit: String(f.hitTop).slice(0, 28),
      }));
    })(),
    multiBars: multiInstance[0] ? multiInstance[0].bars.filter((b) => b.w >= 120 && b.eff > 0.1) : null,
  };
  findings.push(rec);
  console.log(`  ◦ ${name}: ${S.length} 帧 (${rec.frameMs}ms/帧) 双行=${rec.doubleRowFrames}(待裁决${rec.doubleRowAdjudication}) 到位残影=${rec.arrivedGhostFrames}(maxOp=${rec.arrivedMaxOp}) 停中间=${rec.stuckAlphaFrames} 双实例=${rec.multiInstanceFrames}`);
  // 落定态硬断言；ghost/双行为纯计量（根治 = z 序层带裁决 #288，见 css 内 #323 诚实登记）
  console.log(`    · 计量：双行 ${rec.doubleRowFrames} 帧 / 残影 ${rec.arrivedGhostFrames} 帧(maxOp=${rec.arrivedMaxOp}) —— 根治待层带裁决，不判 fail`);
  ok(rec.stuckAlphaFrames === 0, `${name} 落定后壳状态栏 α 归位（停中间 ${rec.stuckAlphaFrames}）`);
  ok(rec.multiInstanceFrames === 0, `${name} 零双实例（${rec.multiInstanceFrames}）`);
  return { S, rec };
}

const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

for (const [W, H, label] of [[390, 844, '手机'], [820, 1180, '平板'], [1440, 900, '桌面']]) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
  try {
    await page.goto(`${BASE}/ios-desktop/index.html?nolock=1`, { waitUntil: 'load', timeout: 20000 });
    await sleep(700);
    await armSampler(page);

    console.log(`\n== ${label} ${W}×${H} ==`);
    if (label === '手机') {
      // G1 慢速下拉（对照组）
      await runGroup(page, W, H, 'G1 慢速下拉-满开-收起', async () => {
        await pull(page, W, H, { to: H * 0.55, steps: 30, hold: 500 });
        await sleep(500);
        await ensureClosed(page);
      });
      // G2 快速下拉 → 收净
      await runGroup(page, W, H, 'G2 快速下拉', async () => {
        await pull(page, W, H, { to: H * 0.55, steps: 5, hold: 0 });
        await sleep(500);
        await ensureClosed(page);
      });
      // G3 快速下拉 + 立即上推回卷
      await runGroup(page, W, H, 'G3 快速下拉+回卷', async () => {
        await page.mouse.move(W / 2, 10);
        await page.mouse.down();
        await page.mouse.move(W / 2, H * 0.4, { steps: 4 });
        await page.mouse.move(W / 2, 8, { steps: 4 });
        await page.mouse.up();
        await ensureClosed(page);
      });
      // G4 连续快速下拉/上推 5 次
      await runGroup(page, W, H, 'G4 连击 5 次', async () => {
        for (let i = 0; i < 5; i++) {
          await pull(page, W, H, { to: H * 0.5, steps: 4, hold: 0 });
          await sleep(120);
          await ensureClosed(page);
        }
      });
      // G5 合体展开（段二场景轨满开 QS）+ 快速上推收起
      await runGroup(page, W, H, 'G5 合体/QS 满开+收起', async () => {
        await pull(page, W, H, { to: H * 0.92, steps: 8, hold: 60 });
        await sleep(400);
        await ensureClosed(page);
      });
      // G6 浅色主题快拉
      await page.evaluate(() => window.__themeModeTest.set('light'));
      await sleep(350);
      await runGroup(page, W, H, 'G6 浅色快速下拉', async () => {
        await pull(page, W, H, { to: H * 0.55, steps: 5, hold: 0 });
        await sleep(400);
        await ensureClosed(page);
      });
      await page.evaluate(() => window.__themeModeTest.set('dark'));
    } else {
      // 平板/桌面：关键组（快拉 / 合体 / 连击）
      // G2 快速下拉 → 收净
      await runGroup(page, W, H, 'G2 快速下拉', async () => {
        await pull(page, W, H, { to: H * 0.55, steps: 5, hold: 0 });
        await sleep(500);
        await ensureClosed(page);
      });
      await runGroup(page, W, H, 'G5 合体/QS 满开+收起', async () => {
        await pull(page, W, H, { to: H * 0.92, steps: 8, hold: 60 });
        await sleep(400);
        await ensureClosed(page);
      });
      await runGroup(page, W, H, 'G4 连击 3 次', async () => {
        for (let i = 0; i < 3; i++) {
          await pull(page, W, H, { to: H * 0.5, steps: 4, hold: 0 });
          await sleep(120);
          await ensureClosed(page);
        }
      });
    }

    ok(errs.length === 0, `${label} 零 pageerror（${errs.length} 条${errs[0] ? '：' + errs[0] : ''}）`);
  } catch (e) {
    fail++;
    console.error(`  ✗ ${label} 探针异常：${String(e).slice(0, 160)}`);
  } finally {
    await ctx.close();
  }
}

await browser.close();
if (server) server.kill();

console.log('\n===== 取证汇总（JSON） =====');
console.log(JSON.stringify(findings, null, 1));
console.log(`\n[v1144-sb] ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
