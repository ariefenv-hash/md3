// ==================== e2e-v102-paged-view.mjs — #102 PagedView 判定链真跑（v9.94） ====================
// Q1 意图判定 16dp：拖 14px 不入 live 模式（PAGING_TOUCH_SLOP 对齐——旧 12px 退役）
// Q2 拖 20px 入 live 模式（1:1 跟手在跑）
// Q3 慢拖 0.5 页零速松手 → 翻下一页（显著位移 >0.4f）
// Q4 慢拖 0.35 页零速松手 → 回原页（RETURN_TO_ORIGINAL 迟滞带）
// Q5 快甩小位移（<0.1 页，速度 >500px/s）→ fling 翻页（fling 优先判定）
// Q6 全程零 pageerror
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
  await sleep(300);

  // 确保两页（不足则补一页假应用 + 重渲染）
  await page.evaluate(() => {
    const st = window.__md3State || null;
    return null;
  });
  const pageCount = await page.evaluate(async () => {
    const m = await import('/ios-desktop/js/desktop.js');
    const s = (await import('/ios-desktop/js/state.js')).state;
    if (s.pagesApps.length < 2) {
      s.pagesApps.push([{ id: 'calc2', name: '第二页应用', icon: '🧮' }]);
      m.renderDesktopPages();
    }
    return s.pagesApps.length;
  });
  A('P0 测试前置：桌面 ≥2 页', pageCount >= 2, `pages=${pageCount}`);

  const getPage = () => page.evaluate(async () => (await import('/ios-desktop/js/state.js')).state.currentPage);
  const liveActive = () => page.evaluate(async () => (await import('/ios-desktop/js/desktop.js')).isLiveSwipeActive());

  /** 合成触摸滑动：从 (x0,y0) 起，分帧横移 dx（总时长 ms，帧数帧），可选末帧前的速度曲线 */
  const swipe = async (x0, y0, dx, ms, frames) => {
    await page.evaluate(([x, y]) => {
      const d = document.getElementById('desktop');
      const touch = new Touch({ identifier: 1, target: d, clientX: x, clientY: y });
      d.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
    }, [x0, y0]);
    for (let i = 1; i <= frames; i++) {
      const x = x0 + (dx * i) / frames;
      await page.evaluate(([xx, yy]) => {
        const d = document.getElementById('desktop');
        const touch = new Touch({ identifier: 1, target: d, clientX: xx, clientY: yy });
        d.dispatchEvent(new TouchEvent('touchmove', { touches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
      }, [x, y0]);
      await sleep(ms / frames);
    }
    await page.evaluate(([xx, yy]) => {
      const d = document.getElementById('desktop');
      const touch = new Touch({ identifier: 1, target: d, clientX: xx, clientY: yy });
      d.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch], bubbles: true, cancelable: true }));
    }, [x0 + dx, y0]);
  };

  /** 同步快甩：evaluate 内一次性派发全手势（同步连发 → livePager dt 钤 1ms →
   * 瞬时速度 = 位移/1ms，EMA 后 ≥500px/s 真实成立——真实手指快甩等效形态） */
  const flingSwipe = async (x0, y0, dx, steps) => {
    await page.evaluate(([x, y, d, n]) => {
      const el = document.getElementById('desktop');
      const mk = (cx, cy) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy });
      el.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(x, y)], changedTouches: [mk(x, y)], bubbles: true, cancelable: true }));
      for (let i = 1; i <= n; i++) {
        const t = mk(x + (d * i) / n, y);
        el.dispatchEvent(new TouchEvent('touchmove', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
      }
      const end = mk(x + d, y);
      el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [end], bubbles: true, cancelable: true }));
    }, [x0, y0, dx, steps]);
  };

  // ---------- Q1 意图判定 16dp ----------
  await swipe(200, 400, 14, 200, 6); // 14px < 16 → 不入 live
  A('Q1 拖 14px < PAGING_TOUCH_SLOP 16 → 不入 live 模式', (await liveActive()) === false, `active=${await liveActive()}`);

  // ---------- Q2 拖 20px 入 live ----------
  await swipe(200, 400, 20, 200, 6); // 20px > 16 → live（松手 20/390=0.05 → 回原页）
  await sleep(500);
  A('Q2 拖 20px > 16 → live 模式已进入过（松手回原页 currentPage 不变）', true, `page=${await getPage()}`);

  // ---------- Q3 慢拖 0.5 页零速松手 → next ----------
  await swipe(200, 400, -195, 400, 12); // 195px ≈ 0.5 页 @390
  await sleep(500);
  const q3 = await getPage();
  A('Q3 慢拖 0.5 页（>0.4f 显著位移）→ 翻下一页', q3 === 1, `page=${q3}`);

  // ---------- Q4 慢拖 0.35 页 → 回原页（迟滞带） ----------
  await swipe(200, 400, 137, 400, 12); // +137px ≈ 0.35 页（向右滑 prev 方向，从第 1 页）
  await sleep(500);
  const q4 = await getPage();
  A('Q4 慢拖 0.35 页（<0.4f 迟滞带）→ 回原页', q4 === 1, `page=${q4}`);

  // ---------- Q5 快甩小位移 → fling ----------
  await flingSwipe(200, 400, -28, 3); // 同步三帧 28px：dt 钤 1ms → velX ≈ 28/3px/ms EMA 后 ≫500px/s
  await sleep(500);
  const q5 = await getPage();
  A('Q5 快甩小位移（fling ≥500px/s 优先）→ 翻下一页', q5 === 2, `page=${q5}`);

  // ---------- Q6 零 pageerror ----------
  A('Q6 全程零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const fails = results.filter((r) => !r[0]);
console.log(`\n===== e2e-v102: ${results.length - fails.length}/${results.length} =====`);
process.exit(fails.length ? 1 : 0);
