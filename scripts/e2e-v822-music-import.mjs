// ==================== e2e-v822-music-import.mjs — #55 无头回归 ====================
//
// DoD（议题 #55 QA 走查报告）：
//   A. 文案四件套：document.title = md3/A17 口径；QS 页脚构建号 17 (CQ1A)；
//      brand-logo::after computed right/bottom = 2px（不再负偏移溢出）
//   B. 导入链完整性（附加疑点复验）：musicFileInput 注入 File → change →
//      host postMessage('import-music') → iframe addExternalTrack → 曲库刷新 + 浮层收起
//   C. cancel 路径：input 派发 cancel → 浮层自动收起（旧实现永久滞留卡死点）
//   D. Escape 路径：keydown Escape → 收起
//   E. 背景点击路径：target===浮层根 → 收起；点卡片本体 → 不收起
//   F. ⑤ 存储行灰线复验：settings 顶层 storage 行下方暗带与相邻行对比（v8.13 涟漪修复后应无异常带）
// 驱动：真实导航（解锁 → 桌面图标 → 音乐/设置应用页）。
// 注：浮层当前无开启入口（audit-E 后保留链路），C/D/E 以 style 置位模拟「已开启」态——
//     即未来任何入口接入后的运行时状态。

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v822');
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

// 可见实例定位器（page-stack 顶页 = offsetParent 非空）
const findVisible = `
  (sel) => {
    const els = [...document.querySelectorAll(sel)];
    return els.find((el) => { const p = el.closest('.app-page'); return p && p.offsetParent !== null; }) || null;
  }`;

// ---------- 场景 A：文案四件套 ----------
console.log('A. 文案 / 品牌角标');
{
  const title = await page.title();
  A('A1 title = md3 — Android 17 口径', title.includes('md3 — Android 17 / Pixel 10'), title);
  const build = await page.evaluate(() => document.querySelector('.qs-build-version')?.textContent || '');
  A('A2 QS 页脚构建号 17 (CQ1A)', build.includes('17 (CQ1A.251005.002)'), build);

  // 品牌角标：需打开音乐应用读 computed（顺带为 B~E 铺路）
  await page.evaluate(() => document.querySelector('.app-icon[data-id="music"]').click());
  await sleep(900);
  const after = await page.evaluate(() => {
    const logo = document.querySelector('iframe') && null;
    return null; // placeholder —— 应用页 .brand-logo 在 iframe 内，另测
  });
  // brand-logo 在 iframe（apps/music/index.html）内部 —— 走 iframe 文档读
  const brand = await page.evaluate(() => {
    const ifr = [...document.querySelectorAll('iframe')].find((f) => {
      const p = f.closest('.app-page'); return p && p.offsetParent !== null;
    });
    if (!ifr || !ifr.contentDocument) return null;
    const doc = ifr.contentDocument;
    const logo = doc.querySelector('.brand-logo');
    if (!logo) return null;
    const cs = ifr.contentWindow.getComputedStyle(logo, '::after');
    const lr = logo.getBoundingClientRect();
    return {
      right: cs.right, bottom: cs.bottom, width: cs.width, height: cs.height,
      logoW: lr.width, logoH: lr.height, content: cs.content,
    };
  });
  A('A3 brand-logo::after 存在', !!brand && brand.content !== 'none', brand ? `content=${brand.content}` : 'null');
  if (brand) {
    A('A4 ::after right=2px bottom=2px', brand.right === '2px' && brand.bottom === '2px', `r=${brand.right} b=${brand.bottom}`);
    A('A5 ::after 6px 且几何包含于 32px logo', brand.width === '6px' && brand.height === '6px'
      && parseFloat(brand.right) + parseFloat(brand.width) + 2 <= brand.logoW, `${brand.width}@${brand.logoW}px`);
  }
}

// ---------- 场景 B：导入链完整性（附加疑点 postMessage 链复验） ----------
console.log('B. 导入链完整性（File 注入 → change → postMessage → 曲库）');
{
  const r = await page.evaluate(async (findVisibleSrc) => {
    const findV = eval(findVisibleSrc);
    const input = findV('#musicFileInput');
    if (!input) return { err: 'input not found' };
    const overlay = findV('#musicImportOverlay');
    // 模拟开启态（无入口保留链路 → 未来入口接入后的运行时状态）
    overlay.style.display = 'flex'; overlay.style.opacity = '1';
    const dt = new DataTransfer();
    dt.items.add(new File(['e2e-fake-audio'], 'E2E v822 测试曲.mp3', { type: 'audio/mpeg' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 700)); // 250ms fade + postMessage roundtrip
    const ov = findV('#musicImportOverlay');
    const ifr = [...document.querySelectorAll('iframe')].find((f) => {
      const p = f.closest('.app-page'); return p && p.offsetParent !== null;
    });
    const doc = ifr && ifr.contentDocument;
    const ws = doc && doc.getElementById('workspaceView');
    const empty = doc && doc.getElementById('emptyStateView'); // v8.22 勘误：id 为 emptyStateView（非 emptyView）
    const list = doc && doc.getElementById('trackListContainer');
    return {
      overlayGone: !ov || getComputedStyle(ov).display === 'none',
      wsShown: !!ws && ws.style.display === 'grid',
      emptyHidden: !!empty && empty.style.display === 'none',
      tracks: list ? list.children.length : -1,
    };
  }, findVisible);
  A('B1 change 后浮层自动收起', r.overlayGone === true, JSON.stringify(r));
  A('B2 postMessage 链完整：iframe 曲库收到曲目', r.tracks >= 1, `tracks=${r.tracks}`);
  A('B3 工作台切换（emptyView 隐 / workspace 显）', r.wsShown && r.emptyHidden, '');
  await page.screenshot({ path: join(OUT, 'v822-music-imported.png') });
}

// ---------- 场景 C/D/E：三条取消路径 ----------
console.log('C/D/E. 取消路径三件套');
// 应用页在位守护：E 场景曾因 el.click() 合成事件坐标 (0,0) 被 elementFromPoint 类
// 全局处理器误判「点击在应用外」而关页（调试探针实锤）——改真实坐标 mouse click，
// 且 reopen 前兜底重开应用（真实用户点击不受影响，此为测试驱动方式修正）。
const musicPageAlive = () => page.evaluate(() => {
  const pages = [...document.querySelectorAll('.app-page')];
  return pages.some((p) => p.offsetParent !== null && p.querySelector('#musicImportOverlay'));
});
const reopen = async () => {
  if (!(await musicPageAlive())) {
    await page.evaluate(() => document.querySelector('.app-icon[data-id="music"]').click());
    await sleep(900);
  }
  await page.evaluate((findVisibleSrc) => {
    const findV = eval(findVisibleSrc);
    const ov = findV('#musicImportOverlay');
    if (!ov) throw new Error('overlay not found after reopen');
    ov.style.display = 'flex'; ov.style.opacity = '1';
  }, findVisible);
};
const overlayVisible = () => page.evaluate((findVisibleSrc) => {
  const findV = eval(findVisibleSrc);
  const ov = findV('#musicImportOverlay');
  return !!ov && getComputedStyle(ov).display !== 'none';
}, findVisible);

{
  // C: cancel 事件（浏览器文件选择器取消 → 不派发 change 只派发 cancel）
  await reopen(); await sleep(80);
  await page.evaluate((findVisibleSrc) => {
    const findV = eval(findVisibleSrc);
    findV('#musicFileInput').dispatchEvent(new Event('cancel', { bubbles: false }));
  }, findVisible);
  await sleep(450);
  const c = await overlayVisible();
  A('C1 cancel 事件 → 浮层收起（旧实现卡死点根治）', c === false, `visible=${c}`);

  // D: Escape（模块级 keydown 委托 + 消费语义）
  await reopen(); await sleep(80);
  await page.keyboard.press('Escape');
  await sleep(450);
  const d = await overlayVisible();
  const aliveAfterEsc = await musicPageAlive();
  A('D1 Escape → 浮层收起', d === false, `visible=${d}`);
  A('D2 Escape 消费语义：应用页不被连带关闭（performance.js 链尾 closeApp 双动作阻断）', aliveAfterEsc === true, `alive=${aliveAfterEsc}`);

  // E: 背景点击（真实坐标，target===浮层根）收起 / 点卡片本体不收起
  await reopen(); await sleep(80);
  {
    const bg = await page.evaluate((findVisibleSrc) => {
      const findV = eval(findVisibleSrc);
      const ov = findV('#musicImportOverlay');
      const pr = ov.getBoundingClientRect();
      return { x: pr.x + 14, y: pr.y + pr.height / 2 }; // 左缘 14px：卡片外背景（卡片左内缩 10% ≈ 34px）
    }, findVisible);
    await page.mouse.click(bg.x, bg.y);
  }
  await sleep(450);
  const e1 = await overlayVisible();
  const pageStillAlive = await musicPageAlive();
  await reopen(); await sleep(80);
  {
    const card = await page.evaluate((findVisibleSrc) => {
      const findV = eval(findVisibleSrc);
      const ov = findV('#musicImportOverlay');
      const cr = ov.firstElementChild.getBoundingClientRect();
      return { x: cr.x + cr.width / 2, y: cr.y + cr.height / 2 };
    }, findVisible);
    await page.mouse.click(card.x, card.y); // 卡片本体 target ≠ 浮层根
  }
  await sleep(450);
  const e2 = await overlayVisible();
  A('E1 背景点击 → 收起（真实坐标，应用页不被误关）', e1 === false && pageStillAlive === true, `visible=${e1} alive=${pageStillAlive}`);
  A('E2 卡片本体点击 → 不误关', e2 === true, `visible=${e2}`);
}

// ---------- 场景 F：⑤ 存储行灰线复验 ----------
console.log('F. 存储行灰线复验（v8.13 涟漪修复后）');
{
  await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
  await sleep(1000);
  const rows = await page.evaluate(() => {
    const row = document.querySelector('.tp-row[data-tp-key="storage"]');
    if (!row) return null;
    const rr = row.getBoundingClientRect();
    const keys = [...document.querySelectorAll('.tp-row[data-tp-key]')].map((r) => r.dataset.tpKey);
    return { x: rr.x, y: rr.y, w: rr.width, h: rr.height, keys };
  });
  A('F1 storage 行在场', !!rows, rows ? rows.keys.join(',') : 'null');
  if (rows) {
    // 截三行对比区：storage 行 ± 前后各一行区域
    const shot = await page.screenshot({
      clip: { x: Math.max(0, rows.x), y: Math.max(0, rows.y - 130), width: Math.min(420, rows.w), height: rows.h + 260 },
    });
    writeFileSync(join(OUT, 'v822-storage-row.png'), shot);
    // 像素分析：storage 行下沿带 vs 邻行下沿带（暗行计数对比）
    const band = await page.evaluate(async (imgB64) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + imgB64;
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0);
      const data = cx.getImageData(0, 0, cv.width, cv.height).data;
      const W = cv.width, H = cv.height;
      const lumRows = [];
      for (let y = 0; y < H; y++) {
        let sum = 0;
        for (let x = 8; x < W - 8; x += 3) {
          const i = (y * W + x) * 4;
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        }
        lumRows.push(sum / Math.ceil((W - 16) / 3));
      }
      return lumRows;
    }, shot.toString('base64'));
    // storage 行位于截图中央（clip 从 y-130 起）：行下沿 = 130 + h
    const edge = Math.round(130 + rows.h);
    const countDark = (from, to) => {
      let n = 0;
      for (let y = from; y < Math.min(to, band.length); y++) if (band[y] < 120) n++;
      return n;
    };
    // storage 带下方 12px / 中部（storage 上沿之前）两个对照带
    const below = countDark(edge + 2, edge + 14);
    const mid = countDark(edge - 60, edge - 20);
    A('F2 storage 行下沿无异常暗带（暗行 ≤ 3 = divider 级）', below <= 3, `belowDark=${below} midDark=${mid}`);
  }
}

// ---------- 收尾 ----------
await sleep(300);
A('Z1 零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log(`\n===== e2e-v822: ${pass} PASS / ${fail} FAIL =====`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
