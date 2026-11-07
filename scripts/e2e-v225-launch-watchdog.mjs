// ==================== e2e-v225-launch-watchdog.mjs — #225 根壳开窗 P0 真实回归 ====================
//
// 复现口径（#225 决定性实测）：必须走**根壳入口** index.html → #sim-iframe → 桌面，
// 不能只开 ios-desktop/index.html。在桌面文档内把 requestAnimationFrame 替换为
// 6s 延迟（嵌套 iframe rAF 节流/低电量/后台标签的等价形态），使弹簧永不收敛，
// 断言 2s 看门狗强制收敛后：窗口终值全屏（非 44×44）/ 启动画面隐藏 / 冻结锁解锁 /
// 零 pageerror。另设「不节流」对照组，验证正常路径零回归。
//
// 用法：node scripts/e2e-v225-launch-watchdog.mjs
// 退出码：0 = 全绿；1 = 任何断言失败

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
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
if (!CHROME) { console.error('[v225] 找不到 Chromium 可执行文件'); process.exit(1); }

function freePort() {
  return new Promise((res, rej) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => res(p)); });
    srv.on('error', rej);
  });
}
const PORT = await freePort();
const BASE = `http://127.0.0.1:${PORT}/index.html?nolock=1`;
const SHOT_DIR = join(root, 'docs', 'v1033');
mkdirSync(SHOT_DIR, { recursive: true });

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1300);
const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });

const CASES = [
  { name: '手机 390×844 · rAF 节流', width: 390, height: 844, throttle: true, expectForced: true },
  { name: '平板 820×1180 · rAF 节流', width: 820, height: 1180, throttle: true, expectForced: true },
  { name: '桌面 1440×900 · rAF 节流', width: 1440, height: 900, throttle: true, expectForced: true },
  { name: '桌面 1440×900 · 正常路径对照', width: 1440, height: 900, throttle: false, expectForced: false },
];

const failures = [];
for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: { width: c.width, height: c.height } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  try {
    await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
    await sleep(2400); // 根壳 + 桌面启动完成
    const frame = page.frames().find((f) => f.url().includes('ios-desktop/index.html'));
    if (!frame) throw new Error('未找到 #sim-iframe 桌面文档');

    // 清掉开机权限弹层/横幅（不改动产品逻辑，仅排除遮挡）
    await frame.evaluate(() => {
      const b = document.querySelector('.power-dialog-card button[data-act="once"]');
      if (b) b.click();
      ['md3PermissionOverlay', 'headsUpStack'].forEach((id) => {
        const e = document.getElementById(id); if (e) e.remove();
      });
    });

    if (c.throttle) {
      // #225 场景：rAF 近乎停摆（6s 后才回调，远超 2s 看门狗）
      await frame.evaluate(() => {
        window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(performance.now()), 6000);
        window.cancelAnimationFrame = (id) => window.clearTimeout(id);
      });
    }

    const clicked = await frame.evaluate(() => {
      const icon = document.querySelector('.dock-bar .dock-app-icon[data-id="msg"]');
      if (icon) { icon.click(); return 'dock-icon'; }
      if (window.__shareSheet) { window.__shareSheet.openAppById('msg'); return 'shareSheet'; }
      return null;
    });
    if (!clicked) throw new Error('msg 应用入口不可用');

    await sleep(c.throttle ? 2900 : 2200);

    const r = await frame.evaluate(() => {
      const w = document.getElementById('appWindow');
      const ls = document.getElementById('appLaunchScreen');
      const wd = window.__launchWatchdog;
      const ifr = w ? w.querySelector('iframe') : null;
      const rect = w ? w.getBoundingClientRect() : null;
      return {
        winW: rect ? Math.round(rect.width) : null,
        winH: rect ? Math.round(rect.height) : null,
        transform: w ? w.style.transform : null,
        open: w ? w.classList.contains('open') : null,
        launchOpacity: ls ? getComputedStyle(ls).opacity : null,
        launchInline: ls ? ls.style.opacity : null,
        wd: wd ? { forced: wd.state().forced, settled: wd.state().settled, armed: wd.state().armed } : null,
        iframeW: ifr ? Math.round(ifr.getBoundingClientRect().width) : null,
      };
    });

    const checks = [
      ['窗口宽度回到全屏（非 44×44）', r.winW !== null && r.winW >= c.width - 4, `winW=${r.winW} / 期望≥${c.width - 4}`],
      ['窗口高度回到全屏', r.winH !== null && r.winH >= c.height - 4, `winH=${r.winH} / 期望≥${c.height - 4}`],
      ['transform 终值已清空', r.transform === '', `transform=${JSON.stringify(r.transform)}`],
      ['appWindow.open 稳态类在位', r.open === true, `open=${r.open}`],
      ['启动画面已隐藏', Number(r.launchOpacity) < 0.05, `opacity=${r.launchOpacity} inline=${r.launchInline}`],
      ['看门狗状态符合预期', r.wd !== null && r.wd.forced === c.expectForced && r.wd.armed === false, JSON.stringify(r.wd)],
      ['子应用 iframe 可见宽度正常', r.iframeW === null || r.iframeW >= c.width - 4, `iframeW=${r.iframeW}`],
      ['零 pageerror', errors.length === 0, JSON.stringify(errors.slice(0, 3))],
    ];
    const bad = checks.filter((x) => !x[1]);
    console.log(`\n[${c.name}] clicked=${clicked} ${bad.length === 0 ? 'PASS' : 'FAIL'} (${checks.length - bad.length}/${checks.length})`);
    checks.forEach((x) => console.log(`   ${x[1] ? '✓' : '✗'} ${x[0]} — ${x[2]}`));
    bad.forEach((x) => failures.push(`${c.name}: ${x[0]} — ${x[2]}`));

    try { await page.screenshot({ path: join(SHOT_DIR, `v225-${c.name.replace(/[^a-z0-9]+/gi, '-')}.png`) }); } catch (e) {}
  } catch (e) {
    console.log(`\n[${c.name}] EXCEPTION — ${String(e)}`);
    failures.push(`${c.name}: EXCEPTION ${String(e)}`);
  }
  await ctx.close();
}

await browser.close();
server.kill();
console.log(`\n===== #225 无头回归汇总：${failures.length === 0 ? 'ALL PASS' : failures.length + ' FAILED'} =====`);
if (failures.length) { failures.forEach((f) => console.log('  ✗ ' + f)); process.exit(1); }
process.exit(0);
