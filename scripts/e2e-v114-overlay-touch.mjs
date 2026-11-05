// ==================== e2e-v114-overlay-touch.mjs — #114 浮层触摸语义公约真跑（v9.98） ====================
// S1 电源菜单：卡片外 pointerdown（down 拍，零 click）→ 整窗收起（GA_CLOSE_TAP_OUTSIDE 同构）
//    S1b 正向对照：卡片面 pointerdown → 保持打开
// S2 分享页：遮罩 pointerdown → 收起；卡片面 pointerdown → 保持
// S3 任务栏溢出面板：面板外 pointerdown → 收起（真跑 document 级公约监听）
// S4 微件选择器：遮罩 pointerdown → 收起；sheet 面 pointerdown → 保持
// S5 音量面板（#108 FALLTHROUGH 样板回归）：面板外落点命中下层元素 + ACTION_OUTSIDE 收起
// S6 全程零 pageerror
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
  await sleep(400);

  // 真实 pointer 派发（Chromium 合成 .click() 不派发 pointerdown——R35 坑①；
  // 本页一律 page.mouse 坐标级或 evaluate 内 Event 派发双通道，坐标级为准）
  const mouseDownUp = async (x, y) => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await sleep(60);
    await page.mouse.up();
  };

  // ---------- S1 电源菜单 ----------
  const openMenu = async () => {
    await page.evaluate(() => {
      const btn = document.getElementById('qsPowerBtn');
      btn.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    });
    await sleep(650);
    await page.evaluate(() => {
      const btn = document.getElementById('qsPowerBtn');
      btn.dispatchEvent(new Event('pointerup', { bubbles: true, cancelable: true }));
    });
    await sleep(500);
  };
  await openMenu();
  const s1open = await page.evaluate(() => document.getElementById('powerDialogOverlay').classList.contains('active'));
  A('S1a 电源菜单长按打开', s1open);
  // 卡片面 pointerdown（正向对照）：保持打开
  await page.evaluate(() => {
    const card = document.querySelector('#powerDialogOverlay .power-dialog-card');
    card.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
  });
  await sleep(120);
  const s1keep = await page.evaluate(() => document.getElementById('powerDialogOverlay').classList.contains('active'));
  A('S1b 卡片面 pointerdown → 保持（consume）', s1keep);
  // 卡片外 pointerdown（down 拍即收，无 click）：整窗收起
  await mouseDownUp(10, 400);
  await sleep(150);
  const s1closed = await page.evaluate(() => !document.getElementById('powerDialogOverlay').classList.contains('active'));
  A('S1c 卡片外 pointerdown（down 拍，零 click）→ 整窗收起', s1closed);

  // ---------- S2 分享页 ----------
  await page.evaluate(() => window.__shareSheet.open({ title: 'e2e-v114', text: '公约真跑' }));
  await sleep(400);
  const s2open = await page.evaluate(() => document.querySelector('.share-sheet-root').classList.contains('open'));
  A('S2a 分享页打开', s2open);
  await page.evaluate(() => {
    const card = document.querySelector('.share-sheet-root .share-sheet-card');
    card.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
  });
  await sleep(100);
  const s2keep = await page.evaluate(() => document.querySelector('.share-sheet-root').classList.contains('open'));
  A('S2b 卡片面 pointerdown → 保持（consume）', s2keep);
  await mouseDownUp(195, 120); // 卡片上方遮罩区
  await sleep(200);
  const s2closed = await page.evaluate(() => !document.querySelector('.share-sheet-root').classList.contains('open'));
  A('S2c 遮罩 pointerdown → 收起', s2closed);

  // ---------- S3 任务栏溢出面板（真跑 document 级公约监听） ----------
  // 平板视口下任务栏在场；溢出面板可能无溢出项（固定+运行未超容量）——直接以
  // 生产 open 路径（closeOverflowPanel 反向即 toggle 分支）同款 DOM 状态 + 真实
  // document pointerdown 监听判定（监听器与 machine 均为生产实体，仅开态注入）。
  const tb = await page.evaluate(() => {
    const panel = document.querySelector('.taskbar-overflow');
    const btn = document.querySelector('.taskbar-overflow-btn');
    return { hasPanel: !!panel, hasBtn: !!btn, taskbar: !!document.querySelector('.taskbar') };
  });
  A('S3a 平板任务栏与溢出面板节点在场', tb.taskbar && tb.hasPanel);
  if (tb.hasPanel) {
    // 开态走生产 toggle 分支（触发把手 click → machine.open() ARM 门开——直接
    // classList 注入会被 ARM 门正确拦截，恰是公约防误触设计的实证）
    await page.evaluate(() => {
      const btn = document.querySelector('.taskbar-overflow-btn');
      btn.click(); // click 不派发 pointerdown（R35 坑①），不触发外部判定
    });
    await sleep(150);
    const s3armed = await page.evaluate(() => {
      const panel = document.querySelector('.taskbar-overflow');
      panel.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true })); // 区内 consume
      return panel.classList.contains('open');
    });
    await sleep(100);
    const s3keep = await page.evaluate(() => document.querySelector('.taskbar-overflow').classList.contains('open'));
    await page.evaluate(() => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true })));
    await sleep(150);
    const s3closed = await page.evaluate(() => !document.querySelector('.taskbar-overflow').classList.contains('open'));
    A('S3b 生产 toggle 开面板 + 区内保持 + 面板外 pointerdown（body 落点）→ 收起', s3armed && s3keep && s3closed,
      `armed=${s3armed} keep=${s3keep} closed=${s3closed}`);
  }

  // ---------- S4 微件选择器 ----------
  await page.evaluate(() => window.__widgetBoard.open());
  await sleep(500);
  const s4open = await page.evaluate(() => document.getElementById('widgetPickerOverlay').classList.contains('active'));
  A('S4a 微件选择器打开', s4open);
  await page.evaluate(() => {
    const sheet = document.querySelector('#widgetPickerOverlay .wp-sheet');
    sheet.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
  });
  await sleep(100);
  const s4keep = await page.evaluate(() => document.getElementById('widgetPickerOverlay').classList.contains('active'));
  await mouseDownUp(195, 100); // sheet 上方遮罩区
  await sleep(200);
  const s4closed = await page.evaluate(() => !document.getElementById('widgetPickerOverlay').classList.contains('active'));
  A('S4b sheet 面 pointerdown 保持 + 遮罩 pointerdown → 收起', s4keep && s4closed, `keep=${s4keep} closed=${s4closed}`);

  // ---------- S5 音量面板 FALLTHROUGH 样板回归（#108 联动 + 公约一致性） ----------
  await page.keyboard.press('AudioVolumeUp');
  await sleep(300);
  const s5 = await page.evaluate(() => {
    const dlg = document.getElementById('volumeDialog');
    const visible = dlg.classList.contains('visible');
    // 面板外落点：hit-test 命中下层元素（穿透——FLAG_NOT_TOUCH_MODAL 同构）
    const hit = document.elementFromPoint(30, 400);
    const fallthrough = !!hit && !(hit.closest && hit.closest('#volumeDialog'));
    return { visible, fallthrough, hitDesc: hit ? (hit.className || hit.id || hit.tagName) : 'null' };
  });
  A('S5a 音量面板可见且面板外落点穿透至下层元素', s5.visible && s5.fallthrough, `hit=${s5.hitDesc}`);
  await page.evaluate(() => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true })));
  await sleep(200);
  const s5closed = await page.evaluate(() => !document.getElementById('volumeDialog').classList.contains('visible'));
  A('S5b 面板外 pointerdown → ACTION_OUTSIDE 收起（穿透 + 收起并行）', s5closed);

  // ---------- S6 零 pageerror ----------
  A('S6 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  console.log('FAIL e2e-v114 异常中断 —', String(e));
  results.push([false, 'e2e-v114 异常中断', String(e)]);
} finally {
  await browser.close().catch(() => {});
  server.kill();
  server.kill('SIGKILL');
}
const pass = results.filter((r) => r[0]).length;
console.log(`\ne2e-v114 result: ${pass}/${results.length}`);
process.exit(pass === results.length ? 0 : 1);
