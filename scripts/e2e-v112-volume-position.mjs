// ==================== e2e-v112-volume-position.mjs — #112 音量面板定位与形态 e2e ====================
//
// Q1 默认落位（390×844 竖屏）：gravity=21（RIGHT|CENTER_VERTICAL 资源默认）+ 右缘 8px + 垂直居中
// Q2 #77-B 五尺寸清单：360×640 / 390×844 / 768×1024 / 1024×768 / 1280×800
//    全部 gravity=21 且无 tabletop 类（平板横屏不叠 TOP —— #112 议题原表述勘误断言）
// Q3 侧偏好左（seed）：gravity=19 + .vd-side-left + left:8px 镜像落位
// Q4 tabletop（Device Posture mock）：竖屏 folded → gravity=85 + .vd-tabletop-top + top:8px
// Q5 posture API 缺席：无 tabletop 类（AOSP mDevicePostureController == null 分支同构）
// Q6 posture change 可见期收起（onPostureChanged → dismiss(DISMISS_REASON_POSTURE_CHANGED) 同构）
// Q7 volume-side-changed 运行时切换：可见期类即时切换（AOSP 无 overlay 运行时变更语义，md3 超越项）
// Q8 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8992;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });

// 无 mock 页（Q1/Q2/Q3/Q5/Q7/Q8）：posture API 缺席 = 沙箱 Chrome 真实环境
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

// mock 页（Q4/Q6）：Device Posture API 特性检测注入（W3C 形态：type + change 监听面）
const pageMock = await browser.newPage({ viewport: { width: 390, height: 844 } });
pageMock.on('pageerror', (e) => errors.push('mock:' + String(e)));
await pageMock.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await pageMock.addInitScript(() => {
  const handlers = [];
  window.__postureHandlers = handlers;
  try {
    Object.defineProperty(navigator, 'devicePosture', {
      value: {
        type: 'folded',
        addEventListener: (t, f) => { if (t === 'change') handlers.push(f); },
        removeEventListener: () => {},
      },
      configurable: true,
    });
  } catch (e) { window.__postureMockFail = String(e); }
});

const readPanel = () => page.evaluate(() => {
  const el = document.getElementById('volumeDialog');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    visible: el.classList.contains('visible'),
    gravity: el.dataset.gravity || '',
    tabletop: el.dataset.tabletop || '',
    sideLeft: el.classList.contains('vd-side-left'),
    topClass: el.classList.contains('vd-tabletop-top'),
    rightGap: Math.round(innerWidth - r.right),
    leftGap: Math.round(r.left),
    vCenterDelta: Math.abs((r.top + r.height / 2) - innerHeight / 2),
    topGap: Math.round(r.top),
    enterTx: getComputedStyle(el).getPropertyValue('--vd-enter-tx').trim(),
  };
});
const openPanel = (p) => p.evaluate(() => {
  if (window.__lockTest) window.__lockTest.instantUnlock();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'AudioVolumeUp', bubbles: true }));
});

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);

  // Q1 默认落位（390×844 竖屏）
  await openPanel(page);
  await sleep(450);
  const q1 = await readPanel();
  A('Q1 默认落位 gravity=21 + 右缘 8px + 垂直居中',
    q1 && q1.visible && q1.gravity === '21' && !q1.sideLeft && !q1.topClass
      && q1.rightGap === 8 && q1.vCenterDelta <= 2 && q1.enterTx === '16px',
    JSON.stringify(q1));

  // Q2 五尺寸清单（#77-B）：平板横屏不叠 TOP（勘误断言）
  const SIZES = [[360, 640], [390, 844], [768, 1024], [1024, 768], [1280, 800]];
  const sizeRows = [];
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await sleep(150);
    await openPanel(page);
    await sleep(350);
    const s = await readPanel();
    sizeRows.push(`${w}×${h}:g${s.gravity}${s.topClass ? '!' : ''}`);
    if (!s || !s.visible || s.gravity !== '21' || s.sideLeft || s.topClass || s.vCenterDelta > 2) {
      A(`Q2 ${w}×${h} gravity=21 无 tabletop`, false, JSON.stringify(s));
    }
  }
  A('Q2 五尺寸清单全过（360×640/390×844/768×1024/1024×768/1280×800）',
    sizeRows.length === 5, sizeRows.join(' | '));

  // Q3 侧偏好左（seed 重开走 show 重算路径）
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.getElementById('volumeDialog').classList.remove('visible');
    try { localStorage.setItem('ios-desktop:volume-side', 'left'); } catch (e) {}
  });
  await sleep(200);
  await openPanel(page);
  await sleep(450);
  const q3 = await readPanel();
  A('Q3 侧偏好左 gravity=19 + left:8px 镜像',
    q3 && q3.gravity === '19' && q3.sideLeft && q3.leftGap === 8 && q3.enterTx === '-16px',
    JSON.stringify(q3));

  // Q7 volume-side-changed 运行时切换（可见期即时重判）
  await page.evaluate(() => {
    try { localStorage.setItem('ios-desktop:volume-side', 'right'); } catch (e) {}
    window.dispatchEvent(new CustomEvent('volume-side-changed', { detail: { side: 'right' } }));
  });
  await sleep(250);
  const q7 = await readPanel();
  A('Q7 volume-side-changed 可见期即时切换回右侧',
    q7 && q7.visible && q7.gravity === '21' && !q7.sideLeft,
    JSON.stringify(q7));

  // Q4 tabletop mock：竖屏 folded → 靠上避铰链
  await pageMock.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  const mockReady = await pageMock.evaluate(() => ({
    type: (navigator.devicePosture && navigator.devicePosture.type) || '',
    handlers: (window.__postureHandlers || []).length,
    fail: window.__postureMockFail || '',
  }));
  await openPanel(pageMock);
  await sleep(450);
  const q4 = await pageMock.evaluate(() => {
    const el = document.getElementById('volumeDialog');
    return {
      visible: el.classList.contains('visible'),
      gravity: el.dataset.gravity || '',
      topClass: el.classList.contains('vd-tabletop-top'),
      topGap: Math.round(el.getBoundingClientRect().top),
    };
  });
  A('Q4 tabletop mock 竖屏 folded gravity=85 + 贴顶 8px',
    mockReady.type === 'folded' && mockReady.handlers > 0 && !mockReady.fail
      && q4 && q4.visible && q4.gravity === '85' && q4.topClass && q4.topGap === 8,
    `mock=${JSON.stringify(mockReady)} panel=${JSON.stringify(q4)}`);

  // Q6 posture change 可见期收起（onPostureChanged dismiss 同构）
  await pageMock.evaluate(() => { (window.__postureHandlers || []).forEach((f) => { try { f({ type: 'continuous' }); } catch (e) {} }); });
  await sleep(350);
  const q6 = await pageMock.evaluate(() => {
    const el = document.getElementById('volumeDialog');
    return { visible: el.classList.contains('visible'), aria: el.getAttribute('aria-hidden') };
  });
  A('Q6 posture change 可见期收起（DISMISS_REASON_POSTURE_CHANGED 同构）',
    q6 && q6.visible === false && q6.aria === 'true', JSON.stringify(q6));

  // Q8 全程零 pageerror
  A('Q8 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' || '));
} catch (e) {
  A('e2e 执行异常', false, String(e));
} finally {
  await browser.close();
  server.kill();
}

const fails = results.filter(([c]) => !c);
console.log(`\n==== e2e-v112: ${results.length - fails.length}/${results.length} passed ====`);
process.exit(fails.length ? 1 : 0);
