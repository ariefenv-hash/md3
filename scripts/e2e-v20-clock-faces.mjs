// ==================== e2e-v20-clock-faces.mjs — #20 锁屏表盘系统行为真跑（v9.79） ====================
// P1 double 默认脸：小钟 textContent HH:MM + 大钟双行堆叠（largeStacked）
// P2 expressive：胶囊结构渲染 + 分钟跳变弹簧类（首渲）
// P3 analog：SVG 双针 + 12 刻度（大小双帧）
// P4 时钟字体 aclock：FontFace 加载 + 脸节点族链生效
// P5 持久化 reload：表盘 + 字体双键恢复（lock-clock-face-v1 / clock-font-v1）
// P6 AOD 表盘联动：覆盖层按所选脸渲染（lock-face--aod 低亮度档）
// P7 AOD analog 变体：SVG 缩档渲染 + 唤醒撤层
// P8 设置侧二级菜单：表盘 4 卡 + 字体 6 卡 + 点选即时持久化
// P9 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8987;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  // 外网隔离（字体外链走离线回落纪律；vendor 字体同源可加载）
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);

  // ---------- P1 double 默认脸 ----------
  await page.evaluate(() => { window.__lockTest.instantLock(); });
  await sleep(300);
  const p1 = await page.evaluate(() => window.__lockTest.face());
  A('P1 double 默认：小钟 HH:MM 文本 + 大钟双行堆叠（largeStacked）',
    p1.id === 'double' && /^\d{2}:\d{2}$/.test(p1.smallText) && p1.largeStacked === true && /^\d{4}$/.test(p1.largeText),
    JSON.stringify(p1));

  // ---------- P2 expressive 胶囊 + 弹簧 ----------
  await page.evaluate(() => { window.__lockTest.setFace('expressive'); });
  await sleep(250);
  const p2 = await page.evaluate(() => {
    const small = document.querySelector('.lock-clock');
    return {
      face: window.__lockTest.face(),
      pill: !!small.querySelector('.lock-face-pill'),
      pop: !!small.querySelector('.lock-face-pop'),
      persisted: localStorage.getItem('ios-desktop:lock-clock-face-v1'),
    };
  });
  A('P2 expressive：胶囊渲染 + 弹簧类（首渲）+ 持久化',
    p2.face.id === 'expressive' && p2.face.smallFace === 'expressive' && p2.pill && p2.pop
    && p2.persisted && p2.persisted.includes('expressive'), JSON.stringify(p2.persisted));

  // ---------- P3 analog SVG ----------
  await page.evaluate(() => { window.__lockTest.setFace('analog'); });
  await sleep(250);
  const p3 = await page.evaluate(() => {
    const small = document.querySelector('.lock-clock');
    const large = document.querySelector('.lock-clock-large');
    return {
      ticks: small.querySelectorAll('.an-tick').length,
      handsH: small.querySelectorAll('.an-hand-h').length,
      handsM: small.querySelectorAll('.an-hand-m').length,
      largeSvg: !!large.querySelector('svg.lock-face-analog'),
      hhRot: small.querySelector('.an-hand-h') ? small.querySelector('.an-hand-h').getAttribute('transform') : '',
    };
  });
  A('P3 analog：12 刻度 + 时分双针 + 大帧 SVG 同构 + transform 旋转',
    p3.ticks === 12 && p3.handsH === 1 && p3.handsM === 1 && p3.largeSvg && /rotate\(/.test(p3.hhRot),
    JSON.stringify(p3));

  // ---------- P4 时钟字体 aclock ----------
  await page.evaluate(() => { window.__lockTest.setFont('aclock'); });
  await sleep(1200);
  const p4 = await page.evaluate(() => ({
    face: window.__lockTest.face(),
    loaded: document.fonts.check('16px "AndroidClockClockV849"'),
    stored: localStorage.getItem('ios-desktop:clock-font-v1'),
  }));
  A('P4 字体 aclock：FontFace 就绪 + 帧级族链生效（setFont 即时路径）',
    p4.loaded && /AndroidClockClockV849/.test(p4.face.fontStack) && p4.stored.includes('aclock'),
    JSON.stringify({ loaded: p4.loaded, frameFont: p4.face.fontStack.slice(0, 50) }));

  // ---------- P5 持久化 reload ----------
  await page.evaluate(() => { window.__lockTest.setFace('minimal'); });
  await sleep(250);
  await page.reload({ waitUntil: 'load' });
  await sleep(2500);
  await page.evaluate(() => { window.__lockTest.instantLock(); });
  await sleep(300);
  const p5 = await page.evaluate(() => ({
    face: window.__lockTest.face(),
    storedFace: localStorage.getItem('ios-desktop:lock-clock-face-v1'),
  }));
  A('P5 reload 恢复：minimal 脸 + aclock 字体双键回放',
    p5.face.id === 'minimal' && p5.face.smallFace === 'minimal' && /AndroidClockClockV849/.test(p5.face.smallNodeFont),
    JSON.stringify({ id: p5.face.id, nodeFont: p5.face.smallNodeFont.slice(0, 40), stored: p5.storedFace }));

  // ---------- P6 AOD 表盘联动（minimal） ----------
  // AOD 默认关（#157 保守初值纪律）——单源 settings:display-v1.aod 开启后 enter
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('settings:display-v1') || '{}');
    s.aod = true;
    localStorage.setItem('settings:display-v1', JSON.stringify(s));
    document.dispatchEvent(new CustomEvent('settings-display-changed', { detail: { key: 'aod' } }));
  });
  await sleep(200);
  await page.evaluate(() => { window.__aodTest.enter(); });
  await sleep(400);
  const p6 = await page.evaluate(() => {
    const el = document.getElementById('aodClock');
    return {
      on: window.__aodTest.overlayOn(),
      aodFace: el.querySelector('.lock-face') ? el.querySelector('.lock-face').dataset.face : '',
      aodDim: !!el.querySelector('.lock-face--aod'),
      text: window.__aodTest.clockText(),
      date: window.__aodTest.dateText(),
    };
  });
  A('P6 AOD：minimal 脸 + doze 低亮度档 + HH:MM 文本锚不变',
    p6.on && p6.aodFace === 'minimal' && p6.aodDim && /^\d{1,2}:\d{2}$/.test(p6.text) && p6.date.length > 3,
    JSON.stringify(p6));
  await page.evaluate(() => { window.__aodTest.wake(); });
  await sleep(200);

  // ---------- P7 AOD analog 变体 ----------
  await page.evaluate(() => { window.__lockTest.setFace('analog'); });
  await sleep(200);
  await page.evaluate(() => { window.__aodTest.enter(); });
  await sleep(400);
  const p7 = await page.evaluate(() => {
    const el = document.getElementById('aodClock');
    const svg = el.querySelector('svg.lock-face-analog');
    return {
      svg: !!svg,
      ticks: el.querySelectorAll('.an-tick').length,
      dim: !!(svg && svg.closest('.lock-face--aod')),
    };
  });
  A('P7 AOD analog：SVG 缩档渲染 + 低亮度档',
    p7.svg && p7.ticks === 12 && p7.dim, JSON.stringify(p7));
  await page.evaluate(() => { window.__aodTest.wake(); });
  await sleep(200);

  // ---------- P8 设置侧二级菜单 ----------
  await page.evaluate(() => { window.openThemePicker(); });
  await sleep(1500);
  const p8a = await page.evaluate(() => ({
    faces: document.querySelectorAll('[data-lockface]').length,
    fonts: document.querySelectorAll('[data-clockfont]').length,
    section: !!document.querySelector('[data-test="lockclock-section"]'),
  }));
  A('P8a 设置：锁屏时钟节 + 表盘 4 卡 + 字体 6 卡',
    p8a.section && p8a.faces === 4 && p8a.fonts === 6, JSON.stringify(p8a));
  await page.evaluate(() => {
    document.querySelector('[data-lockface="expressive"]').click();
  });
  await sleep(300);
  const p8b = await page.evaluate(() => ({
    stored: localStorage.getItem('ios-desktop:lock-clock-face-v1'),
    lockFace: window.__lockTest.face().id,
  }));
  A('P8b 设置点选表盘 → 即时持久化 + 锁屏实时反映（expressive）',
    p8b.stored.includes('expressive') && p8b.lockFace === 'expressive', JSON.stringify(p8b));
  await page.evaluate(() => {
    document.querySelector('[data-clockfont="clockopia"]').click();
  });
  await sleep(400);
  const p8c = await page.evaluate(() => ({
    stored: localStorage.getItem('ios-desktop:clock-font-v1'),
    nodeFont: window.__lockTest.face().smallNodeFont,
    activeCard: !!document.querySelector('[data-clockfont="clockopia"][aria-label]'),
  }));
  A('P8c 设置点选字体 → clock-font-v1 共用键写入 + 锁屏节点族链刷新',
    p8c.stored.includes('clockopia') && /ClockopiaClockV849/.test(p8c.nodeFont), JSON.stringify(p8c));

  // ---------- P9 零 pageerror ----------
  A('P9 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  A('E2E 执行异常', false, String(e));
} finally {
  await browser.close();
  server.kill();
}

const fails = results.filter(([c]) => !c).length;
console.log(`\n==== e2e-v20: ${results.length - fails}/${results.length} ${fails === 0 ? 'ALL PASS' : 'HAS FAILURES'} ====`);
process.exit(fails === 0 ? 0 : 1);
