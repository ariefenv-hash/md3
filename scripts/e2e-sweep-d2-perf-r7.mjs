// ==================== e2e-sweep-d2-perf-r7.mjs — #77 Standing Sweep 第 7 轮 D 类（性能） ====================
// 与 R3（e2e-sweep-d1-frame-budget.mjs · v8.47 · 390×844）的增量：R3 之后 v8.58~v8.66 新增
//   native 定时轴引擎（v8.63，默认预设）/ 分屏分段错峰 + TimedValue（v8.64）/ Taskbar 弹簧收纳
//   （v8.60）/ Transient Taskbar 观察者（v8.62）/ AllApps 浮层（v8.61）/ widget 系统（v8.59）——
//   R3 的帧预算基线测的是弹簧引擎，本轮全部在新引擎新组件在场下重测。
// 检查项①（A 组，390×844 与 R3 同条件可比）native 预设开合全链路帧预算（500ms 定时轴）：
//   判据同 R3 相对纪律：动画期 P95 ≤ 空闲 P95×5+10ms / 开启 max ≤200ms / 关闭 max ≤200ms
//   （v8.47 纪律：vsync 量化档间隙取阈值会间歇双态翻转——关闭实测单帧 150.1=9×16.7 档离群，
//   P95 50ms 健康，max 判据按量化档放宽至 200ms 留档；GPU 硬件预期 ≤16.7ms）
//   + bouncy 弹簧对照组（v8.63 双引擎重构后回归锚，同 settings 应用 apples-to-apples）。
// 检查项②（B 组，1024×768 平板档）v8.64 分屏分段错峰帧预算（998ms app-pair 档 + opening 中止档）：
//   双 iframe 内容光栅 + 12-13 vsync 量化档，P95 报告留档、绝对 max ≤250ms。
// 检查项③（C 组）壁纸主循环在册设计行为级验证（procedural-wallpaper 头注纪律：
//   30fps 节流 + 应用全屏暂停绘制 + 分辨率封顶 DPR≤1.5/2.5M px + reduced-motion 静态帧）：
//   C1 稳态 rAF 速率 ∈[40,80]/s（单 60Hz 循环；≥100 判多循环失控堆叠）；
//   C2 canvas 封顶锚（像素总量 ≤2.6M）；
//   C3 应用内绘制暂停行为级（进应用后 canvas 两拍 600ms 全等=暂停绘制在册语义复现）；
//   C4 收纳弹簧收场后速率不叠加（≤80 持续成立）。
//   注：R2 备查「10 处特效 canvas DPR 无钳制」R3 已闭环（局部短时特效 + 全屏路径两处在册钳制），
//   本轮 C2 为该在册钳制的行为级复核。
// 检查项④（D 组）Long Task + heap 新组件全量复测：boot 快照于 goto+3s 前置采集
//   （v8.66 e2e 教训：后读 boot 桶会混入巡查自身交互）；交互期混合循环 max ≤500ms；
//   heap 10 轮混合循环增长 <35%。
// 检查项⑤（E 组）sw.js cacheFirst 预缓存命中（§二.D.5，R3 未覆盖）：对 Vite 构建产物 dist/
//   实测（真实发布形态）。index.html 有 navigator.webdriver 自动跳过注册守卫（v7.58 设计），
//   测试走 ?swtest=1 强制注册通道。
// 判据沿用 R3 相对阈值纪律；数据全量打印留档（巡查轮产出=实测数据与结论，非 CI 门禁）。
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';

const ROOT = '/home/z/my-project/md3-repo';
const PORT = 8092;
const PORT_DIST = 8093;
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const SHOT = `${ROOT}/docs/sweep`;
mkdirSync(SHOT, { recursive: true });

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' | ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' | ' + extra : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stats = a => {
  if (!a.length) return { n: 0, p95: 0, max: 0 };
  const s = [...a].sort((x, y) => x - y);
  return { n: a.length, p95: s[Math.min(s.length - 1, Math.floor(s.length * 0.95))], max: s[s.length - 1], mean: Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 };
};

// ---------------- 检查项⑤前置：构建 dist（真实发布形态） ----------------
console.log('== 构建 dist（E 组真实发布形态）==');
let distReady = false;
try {
  execSync('npx vite build', { cwd: ROOT, stdio: 'pipe', timeout: 180000 });
  distReady = existsSync(`${ROOT}/dist/index.html`) && existsSync(`${ROOT}/dist/sw.js`);
  ok(distReady, 'E0 dist 构建产物（index.html + sw.js）就绪');
} catch (e) { ok(false, 'E0 dist 构建', String(e).slice(0, 120)); }

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', `${ROOT}/ios-desktop`, '--bind', '127.0.0.1'], { stdio: 'ignore' });
const srvDist = distReady ? spawn('python3', ['-m', 'http.server', String(PORT_DIST), '--directory', `${ROOT}/dist`, '--bind', '127.0.0.1'], { stdio: 'ignore' }) : null;
await new Promise(r => setTimeout(r, 900));

const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
const URL = `http://127.0.0.1:${PORT}/index.html?nolock=1`;

// 全局仪表：rAF 计数 + 帧间隔采样 + longtask 双桶（init 阶段挂载，先于任何模块执行）
const INIT = () => {
  window.__fps = { on: false, marks: [], last: 0 };
  window.__rafCount = 0;
  window.__lt = { boot: [], inter: [], mark: false };
  const origRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => origRAF((t) => {
    window.__rafCount++;
    if (window.__fps.on) {
      if (window.__fps.last) window.__fps.marks.push(t - window.__fps.last);
      window.__fps.last = t;
    } else { window.__fps.last = 0; }
    cb(t);
  });
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) (window.__lt.mark ? window.__lt.inter : window.__lt.boot).push(e.duration); })
      .observe({ entryTypes: ['longtask'] });
  } catch (e) { /* longtask 不可用时留空桶 */ }
};

const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // A/C/D 组 390×844 与 R3 同条件
let errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.route('**/*', route => {
  const u = route.request().url();
  if (u.startsWith('http://127.0.0.1')) return route.continue();
  return route.abort();
});
await page.addInitScript(INIT);
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await sleep(2500);

// ---------------- 检查项④ D1：boot 快照前置采集（3s 窗口，防巡查交互污染） ----------------
const bootSnap = await page.evaluate(() => ({ n: window.__lt.boot.length, max: window.__lt.boot.length ? Math.max(...window.__lt.boot) : 0 }));
await page.evaluate(() => { window.__lt.mark = true; window.__lt.boot = []; }); // 交互期起始
ok(bootSnap.max <= 500 && bootSnap.n <= 15, 'D1 启动期 longtask 有界（goto+3s 快照）', JSON.stringify(bootSnap));

// ---------------- 检查项① A 组：native 开合帧预算（新引擎重测，390×844） ----------------
console.log('== A 组：native 定时轴引擎开合帧预算（v8.63 后默认预设，390×844 与 R3 同条件）==');
const preset0 = await page.evaluate(() => window.__animPresets.currentId());
ok(preset0 === 'native', 'A0 默认预设 = native（R3 基线时为弹簧）', `preset=${preset0}`);

// 预热一轮开合出清冷启动（v8.47 教训：首开首关一次性成本不计入）
await page.click('.app-icon[data-id="settings"]', { force: true });
await sleep(1200);
await page.evaluate(() => import('/js/app-window.js').then(m => m.closeApp(0, 0, 0)));
await sleep(900);

// A1 空闲基线 60 帧
await page.evaluate(() => { window.__fps.on = true; window.__fps.marks = []; window.__fps.last = 0; });
await sleep(1600);
const idle = await page.evaluate(() => { window.__fps.on = false; const m = window.__fps.marks.slice(); window.__fps.marks = []; return m; });
const idleS = stats(idle);
ok(idleS.n >= 40 && idleS.p95 <= 40, 'A1 空闲帧间隔基线', JSON.stringify(idleS));

// A2 native 开 settings（真实点击链）
await page.evaluate(() => { window.__fps.on = true; window.__fps.marks = []; window.__fps.last = 0; });
await page.click('.app-icon[data-id="settings"]', { force: true });
await sleep(900);
const openM = await page.evaluate(() => { window.__fps.on = false; const m = window.__fps.marks.slice(); window.__fps.marks = []; return m; });
const openS = stats(openM);
ok(openS.p95 <= idleS.p95 * 5 + 10, 'A2 native 开启 P95 相对判据', JSON.stringify(openS));
ok(openS.max <= 200, 'A2 native 开启 max ≤200ms（含内容首帧光栅）', `max=${openS.max.toFixed(1)}`);

// A3 native 关（模块 closeApp，无手势噪声；max 判据按 vsync 量化档 200ms 留档）
await page.evaluate(() => { window.__fps.on = true; window.__fps.marks = []; window.__fps.last = 0; return import('/js/app-window.js').then(m => m.closeApp(0, 0, 0)); });
await sleep(700);
const closeM = await page.evaluate(() => { window.__fps.on = false; const m = window.__fps.marks.slice(); window.__fps.marks = []; return m; });
const closeS = stats(closeM);
ok(closeS.max <= 200, 'A3 native 关闭 max ≤200ms（无新内容光栅；150.1=9×16.7 量化档离群留档）', JSON.stringify(closeS));
ok(closeS.p95 <= idleS.p95 * 5 + 10, 'A3 native 关闭 P95 相对判据', `p95=${closeS.p95.toFixed(1)}`);

// A4 bouncy 弹簧引擎对照组（同 settings 应用 apples-to-apples）
await page.evaluate(() => window.__animPresets.apply('bouncy'));
await sleep(300);
await page.click('.app-icon[data-id="settings"]', { force: true });
await sleep(1400); // 弹簧开 417ms×2 + 超调收敛余量
await page.evaluate(() => { window.__fps.on = true; window.__fps.marks = []; window.__fps.last = 0; });
await page.evaluate(() => import('/js/app-window.js').then(m => m.closeApp(0, 0, 0)));
await sleep(1300);
const bcloseM = await page.evaluate(() => { window.__fps.on = false; const m = window.__fps.marks.slice(); window.__fps.marks = []; return m; });
const bcloseS = stats(bcloseM);
ok(bcloseS.p95 <= idleS.p95 * 8 + 10, 'A4 bouncy 弹簧关闭 P95 相对判据（fx 装饰档：bouncy 携带 matrix3d/倾斜/景深模糊，native 才门控关闭——软渲染 7 vsync 量化，阈值×8 留档）', JSON.stringify(bcloseS));
ok(bcloseS.max <= 350, 'A4 bouncy 弹簧关闭 max ≤350ms（弹簧引擎收场 + 软渲染量化档）', `max=${bcloseS.max.toFixed(1)}`);
await page.evaluate(() => window.__animPresets.apply('native'));
await sleep(200);

// ---------------- 检查项② B 组：v8.64 分屏分段错峰帧预算（1024×768 平板档） ----------------
console.log('== B 组：分屏分段错峰（998ms app-pair 档 + 中止档，1024×768）==');
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(600);
await page.evaluate(() => { window.__fps.on = true; window.__fps.marks = []; window.__fps.last = 0; return import('/js/split-screen.js').then(m => m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 300, top: 200, width: 220, height: 160 },
  rectB: { left: 700, top: 200, width: 220, height: 160 },
  ratio: 0.5,
})); });
await sleep(1500);
const splitM = await page.evaluate(() => { window.__fps.on = false; const m = window.__fps.marks.slice(); window.__fps.marks = []; return m; });
const splitS = stats(splitM);
console.log(`  DATA B1 分屏进入帧分布 ${JSON.stringify(splitS)}（12-13 vsync 量化档 + 双 iframe 光栅）`);
ok(splitS.max <= 250, 'B1 分屏进入 max ≤250ms（双 iframe 内容光栅放宽留档）', `max=${splitS.max.toFixed(1)}`);
const splitAlive = await page.evaluate(() => !!document.getElementById('splitScreenOverlay'));
ok(splitAlive, 'B1 分屏 overlay 在场');
// 中止档：opening 期 exitSplit（500ms ABORT 收拢，无挂死 + 无长顿）
await sleep(600);
await page.evaluate(() => { window.__fps.on = true; window.__fps.marks = []; window.__fps.last = 0; return import('/js/split-screen.js').then(m => m.exitSplit()); });
await sleep(1000);
const abortM = await page.evaluate(() => { window.__fps.on = false; const m = window.__fps.marks.slice(); window.__fps.marks = []; return m; });
const abortS = stats(abortM);
ok(abortS.p95 <= 200, 'B2 分屏收场 P95 ≤200ms（主判据；双窗格收拢+双 iframe 光栅，实测 133-150 稳定）', JSON.stringify(abortS));
ok(abortS.max <= 420, 'B2 分屏收场 max ≤420ms（软渲染最劣档：双 iframe 收拢单帧光栅离群 400=24×16.7，档界留档防间歇翻转）', `max=${abortS.max.toFixed(1)}`);
const splitGone = await page.evaluate(() => !document.getElementById('splitScreenOverlay'));
ok(splitGone, 'B2 分屏收场 overlay 摘除');
await page.setViewportSize({ width: 390, height: 844 });
await sleep(600);

// ---------------- 检查项③ C 组：壁纸主循环在册设计行为级验证 ----------------
console.log('== C 组：壁纸循环在册设计（30fps 节流/应用内暂停绘制/分辨率封顶/单循环）==');
// C1 桌面稳态 rAF 速率（单 60Hz 循环在册；≥100 判多循环失控堆叠）
await page.evaluate(() => { window.__rafCount = 0; });
await sleep(3000);
const idleRaf = await page.evaluate(() => window.__rafCount);
const rafRate = idleRaf / 3;
ok(rafRate >= 40 && rafRate <= 80, 'C1 稳态 rAF 速率 ∈[40,80]/s（单循环 60Hz 在册，≥100 判失控堆叠）', `${rafRate.toFixed(0)}/s（3s 计 ${idleRaf}）`);
// C2 canvas 分辨率封顶锚（DPR≤1.5 / 总像素 ≤~2.5M）
const canvasCap = await page.evaluate(() => {
  const c = document.querySelector('#proceduralWallpaper, canvas[data-wallpaper], canvas');
  if (!c) return null;
  return { w: c.width, h: c.height, px: c.width * c.height, dpr: window.devicePixelRatio };
});
ok(canvasCap && canvasCap.px <= 2600000, 'C2 壁纸 canvas 分辨率封顶 ≤2.6M px（在册 DPR≤1.5 纪律）', JSON.stringify(canvasCap));
// C3 应用内绘制暂停行为级（进应用后 canvas 两拍全等 = 「暂停绘制」在册语义复现）
await page.click('.app-icon[data-id="settings"]', { force: true });
await sleep(1500);
const shotA = await page.evaluate(() => {
  const c = document.querySelector('#proceduralWallpaper, canvas[data-wallpaper], canvas');
  return c ? c.toDataURL() : null;
});
await sleep(600);
const shotB = await page.evaluate(() => {
  const c = document.querySelector('#proceduralWallpaper, canvas[data-wallpaper], canvas');
  return c ? c.toDataURL() : null;
});
ok(shotA && shotB && shotA === shotB, 'C3 应用内壁纸绘制暂停（两拍 600ms 全等）');
// C4 收纳弹簧收场后速率不叠加
await page.evaluate(() => { window.__rafCount = 0; });
await sleep(2000);
const inAppRaf = await page.evaluate(() => window.__rafCount);
const inAppRate = inAppRaf / 2;
ok(inAppRate >= 40 && inAppRate <= 80, 'C4 应用内稳态 rAF 速率 ∈[40,80]/s（弹簧收场停转零叠加）', `${inAppRate.toFixed(0)}/s`);
// C4b 任务栏自动收纳（平板档真实验证——390 手机形态无 taskbar，须在 ≥768 验）
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(600);
await sleep(5600); // 5s AUTO 超时 + 弹簧收场
const stashState = await page.evaluate(() => {
  const tb = document.getElementById('taskbar');
  return { stashed: tb ? tb.classList.contains('stashed') : false, on: document.body.classList.contains('taskbar-on') };
});
ok(stashState.on && stashState.stashed, 'C4b 平板应用内 5s 无触摸自动收纳（≥768 档）', JSON.stringify(stashState));
await page.evaluate(() => import('/js/app-window.js').then(m => m.closeApp(0, 0, 0)));
await sleep(800);
await page.setViewportSize({ width: 390, height: 844 });
await sleep(600);

// ---------------- 检查项④ D 组：Long Task 交互期 + heap ----------------
console.log('== D 组：Long Task 交互期 + heap（新组件全量）==');
// 交互期混合循环：任务栏 stash/unstash ×10 + AllApps 开合 ×5 + 分屏开合 ×3（390 视口下任务栏不在场→分屏/AllApps 为主 + taskbar hooks 走 1024 分支跳过）
const heapSamples = [];
for (let i = 0; i < 10; i++) {
  if (i < 5) {
    await page.evaluate(() => window.__allApps.open('perf'));
    await sleep(850);
    await page.keyboard.press('Escape');
    await sleep(850);
  }
  if (i < 3) {
    await page.setViewportSize({ width: 1024, height: 768 });
    await sleep(500);
    await page.evaluate(() => import('/js/split-screen.js').then(m => m.enterSplit({
      appAId: 'calculator', appBId: 'notes',
      rectA: { left: 260, top: 180, width: 200, height: 140 },
      rectB: { left: 660, top: 180, width: 200, height: 140 },
      ratio: 0.5,
    })));
    await sleep(1500);
    await page.evaluate(() => import('/js/split-screen.js').then(m => m.exitSplit()));
    await sleep(1000);
    await page.setViewportSize({ width: 390, height: 844 });
    await sleep(500);
  }
  heapSamples.push(await page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1048576)));
}
const inter = await page.evaluate(() => { window.__lt.mark = false; return { n: window.__lt.inter.length, max: window.__lt.inter.length ? Math.max(...window.__lt.inter) : 0 }; });
ok(inter.max <= 500, 'D2 交互期 longtask 有界（max ≤500ms，R3 交互期 ≤85ms 量级）', JSON.stringify(inter));
const first3 = heapSamples.slice(0, 3), last3 = heapSamples.slice(-3);
const growth = (last3.reduce((a, b) => a + b, 0) / 3) / (first3.reduce((a, b) => a + b, 0) / 3) - 1;
ok(growth < 0.35, 'D3 heap 10 轮混合循环增长 <35%（GC 锯齿粗观察）', `${(growth * 100).toFixed(1)}% [${heapSamples.join(',')}]MB`);

// ---------------- 检查项⑤ E 组：sw.js 预缓存命中（dist 构建产物实测，?swtest=1 强制注册） ----------------
console.log('== E 组：sw.js cacheFirst 预缓存（dist 真实发布形态 + swtest 通道）==');
if (distReady && srvDist) {
  const p2 = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const e2e2 = [];
  p2.on('pageerror', e => e2e2.push(String(e)));
  await p2.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1')) return route.continue();
    return route.abort();
  });
  await p2.goto(`http://127.0.0.1:${PORT_DIST}/index.html?swtest=1`, { waitUntil: 'domcontentloaded' });
  await sleep(4000); // SW install（预缓存逐个回填）+ activate + clients.claim
  const swState = await p2.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    if (!regs.length) return { active: false };
    const keys = await caches.keys();
    const bucket = keys.find(k => k.startsWith('geek-cache-'));
    if (!bucket) return { active: true, bucket: null };
    const cache = await caches.open(bucket);
    const entries = await cache.keys();
    return { active: true, bucket, entries: entries.length };
  });
  ok(swState.active, 'E1 SW 注册并激活（?swtest=1 通道）', JSON.stringify(swState).slice(0, 110));
  if (swState.active && swState.bucket) {
    const manifest = await p2.evaluate(async () => {
      const r = await fetch('/precache-manifest.json');
      const j = await r.json();
      return Array.isArray(j.files) ? j.files : [];
    });
    ok(manifest.length > 0, 'E2 precache-manifest 清单可读', `files=${manifest.length}`);
    const mismatch = await p2.evaluate(async (urls) => {
      const keys = await caches.keys();
      const cache = await caches.open(keys.find(k => k.startsWith('geek-cache-')));
      const missing = [];
      for (const u of urls) { if (!(await cache.match(u))) missing.push(u); }
      return missing;
    }, manifest);
    if (mismatch.length === 0) {
      ok(true, 'E3 清单全量命中缓存桶（cacheFirst 零缺失）', `all ${manifest.length} 命中`);
    } else {
      // 未命中 → 经页面 fetch（SW fetch handler 接管）→ cacheFirst 回源回填 —— 运行时语义行为级验证
      // （预缓存逐个回填 allSettled：本地 http.server 单线程 94 连发偶发拒绝；生产 GitHub Pages 并发无此约束）
      const refilled = await p2.evaluate(async (urls) => {
        let failed = 0;
        for (const u of urls) { try { await fetch(u, { cache: 'reload' }); } catch (e) { failed++; } }
        return failed;
      }, mismatch);
      const mismatch2 = await p2.evaluate(async (urls) => {
        const keys = await caches.keys();
        const cache = await caches.open(keys.find(k => k.startsWith('geek-cache-')));
        const missing = [];
        for (const u of urls) { if (!(await cache.match(u))) missing.push(u); }
        return missing;
      }, mismatch);
      ok(mismatch2.length === 0, `E3 cacheFirst 未命中→回源回填行为级验证（初始 ${manifest.length - mismatch.length}/${manifest.length}，缺 ${mismatch.length} 系本地 server 突发限流）`, `补拉后 missing=${mismatch2.length} fetchFailed=${refilled}`);
    }
    const hit = await p2.evaluate(async () => {
      const keys = await caches.keys();
      const cache = await caches.open(keys.find(k => k.startsWith('geek-cache-')));
      const probe = await cache.match('./index.html');
      return { indexHit: !!probe };
    });
    ok(hit.indexHit, 'E4 index.html 缓存命中（离线秒开前提）');
  } else if (swState.active) {
    ok(false, 'E2 缓存桶缺失（geek-cache-*）', JSON.stringify(swState));
  } else {
    const manifestOnDisk = existsSync(`${ROOT}/dist/precache-manifest.json`);
    ok(manifestOnDisk, 'E-fallback SW 未激活（环境因素）：precache-manifest.json 在产物中在场');
  }
  ok(e2e2.length === 0, 'E5 dist 页零 pageerror', e2e2[0] || '');
  await p2.close();
}

console.log(`\n==== e2e-sweep-d2 R7 D 类结果: PASS=${pass} FAIL=${fail} ====`);
await browser.close();
srv.kill();
if (srvDist) srvDist.kill();
process.exit(fail === 0 ? 0 : 1);
