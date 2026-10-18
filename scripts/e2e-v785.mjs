// e2e-v785.mjs — v7.85 E2E 核验：AOSP 官方三图标重绘 + Dual Shade 分家模式 + 电源菜单容器变换 + 竖柄截断修复
// ① 图标：亮度右端等级图标（960 正向网格）/ 电池加号 evenOdd 镂空 / 电源符号（无插头）
// ② 竖柄：QS 场景下亮度竖柄完整（不被滚动容器顶缘裁切）
// ③ 电源菜单：从电源按钮位置容器变换放大到屏幕中央（--pw-ox/--pw-oy 注入）
// ④ Dual Shade（?shadeMode=dual）：左 75% 命中区开通知面板 / 右 25% 开 QS 面板；
//    双面板可同开；scrim 点击关闭；QS 浮动面板宽 min(600px,50vw)、右缝 16px、圆角 46px
// ⑤ Panels 弹层：长按齿轮呼出，Separate/Combined 切换 + DOM 迁移可逆
// ⑥ 双模式零 pageerror
//
// 用法：MD3_BASE=http://127.0.0.1:8791/md3/ios-desktop/index.html node scripts/e2e-v785.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.MD3_BASE || 'https://ariefenv-hash.github.io/md3/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/e2e-v785';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

const boot = async (url) => {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await ctx.newPage();
  let pageErrors = 0;
  page.on('pageerror', (e) => { pageErrors++; log('[pageerror]', e.message.slice(0, 160)); });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
  await sleep(2200);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await sleep(400);
  for (let i = 0; i < 90; i++) {
    if (await page.evaluate(() => document.querySelectorAll('.qs-tile-pill').length > 0)) break;
    await sleep(500);
  }
  return { ctx, page, errs: () => pageErrors };
};

// ==================== A 段：classic 默认页（图标 + 竖柄 + 电源菜单 + 模式弹层） ====================
{
  const { ctx, page, errs } = await boot(BASE);
  await page.evaluate(() => { try { localStorage.removeItem('android17:shadeMode'); } catch (e) {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await sleep(400);
  for (let i = 0; i < 90; i++) {
    if (await page.evaluate(() => document.querySelectorAll('.qs-tile-pill').length > 0)) break;
    await sleep(500);
  }

  // A1 亮度图标右置 + AOSP 矢量
  const a1 = await page.evaluate(() => {
    const el = document.getElementById('qsBrightnessIcon');
    if (!el) return { ok: false, why: 'no icon el' };
    const svg = el.querySelector('svg');
    return {
      ok: el.classList.contains('bs-level-icon') && el.classList.contains('right') &&
          svg && svg.getAttribute('viewBox') === '0 0 960 960' &&
          svg.getAttribute('fill-rule') === 'evenodd',
      why: el.className,
    };
  });
  check('A1 亮度图标右端 + AOSP ic_brightness_full 960 网格 evenodd', a1.ok, a1.why);

  // A2 电源符号（无插头）
  const a2 = await page.evaluate(() => {
    const svg = document.querySelector('#qsPowerBtn svg');
    const d = svg ? svg.querySelector('path')?.getAttribute('d') || '' : '';
    return { ok: d.startsWith('M480,914'), why: d.slice(0, 24) };
  });
  check('A2 电源键 = ic_qs_footer_power 电源符号', a2.ok, a2.why);

  // A3 电池加号 evenOdd 镂空（AOSP vd_battery_saver）
  const a3 = await page.evaluate(() => {
    const svg = document.querySelector('.qs-tile-pill[data-tile-id="battery_saver"] svg');
    if (!svg) return { ok: false, why: 'no battery svg' };
    const p = svg.querySelector('path[fill-rule="evenodd"]');
    const g = svg.querySelector('g[transform*="scale(0.79)"]');
    return { ok: !!(p && g && (p.getAttribute('d') || '').startsWith('M44 28.25')), why: p ? 'path ok' : 'no evenodd path' };
  });
  check('A3 电池省电 = vd_battery_saver 横置电池+镂空加号', a3.ok, a3.why);

  // A4 拉开 QS 场景 → 竖柄完整（不被顶缘裁切）
  await page.mouse.move(206, 8);
  await page.mouse.down();
  for (let y = 40; y <= 640; y += 30) { await page.mouse.move(206, y); await sleep(22); }
  await page.mouse.up();
  await sleep(900);
  const a4 = await page.evaluate(() => {
    const h = document.getElementById('qsBrightnessHandle');
    const sc = document.getElementById('qsInnerScroll');
    if (!h || !sc) return { ok: false, why: 'missing els' };
    const hr = h.getBoundingClientRect();
    const sr = sc.getBoundingClientRect();
    const bar = document.getElementById('qsBrightnessBar').getBoundingClientRect();
    return {
      ok: hr.top >= sr.top - 0.6 && hr.bottom <= sr.bottom + 0.6 &&
          hr.top < bar.top && hr.bottom > bar.bottom, // 柄仍上下出头于轨道（未矫枉过正）
      why: `handle ${hr.top.toFixed(1)}~${hr.bottom.toFixed(1)} scroll ${sr.top.toFixed(1)}~${sr.bottom.toFixed(1)}`,
    };
  });
  check('A4 亮度竖柄 52px 上下出头完整（scroll 顶缘 8dp 顶隔后不裁切）', a4.ok, a4.why);

  // A5 电源菜单：从按钮位置放大到屏幕中央
  await page.click('#qsPowerBtn');
  await sleep(120); // 中途帧：卡片应仍带原点偏移
  const a5mid = await page.evaluate(() => {
    const card = document.querySelector('.power-dialog-card');
    return {
      active: document.getElementById('powerDialogOverlay').classList.contains('active'),
      ox: card.style.getPropertyValue('--pw-ox'),
      oy: card.style.getPropertyValue('--pw-oy'),
    };
  });
  await page.screenshot({ path: `${OUT}/phone-power-dialog.png` });
  await sleep(600);
  const a5end = await page.evaluate(() => {
    const card = document.querySelector('.power-dialog-card');
    const cr = card.getBoundingClientRect();
    return {
      transform: getComputedStyle(card).transform,
      cx: cr.left + cr.width / 2,
      cy: cr.top + cr.height / 2,
      vw: innerWidth, vh: innerHeight,
    };
  });
  check('A5a 电源菜单注入按钮原点偏移', a5mid.active && a5mid.ox.length > 0 && a5mid.oy.length > 0,
        `ox=${a5mid.ox} oy=${a5mid.oy}`);
  check('A5b 动画结束后卡片回屏幕中央 scale(1)',
        Math.abs(a5end.cx - a5end.vw / 2) < 8 && Math.abs(a5end.cy - a5end.vh / 2) < 8 &&
        a5end.transform.includes('matrix(1, 0, 0, 1, 0, 0)'),
        `center=(${a5end.cx.toFixed(0)},${a5end.cy.toFixed(0)})`);
  await page.evaluate(() => document.getElementById('powerDialogOverlay').click());
  await sleep(400);
  // 注：勿用 Escape 键收面板（会连带关闭 QS 场景，齿轮出屏）

  // A6 Panels 弹层：长按齿轮 600ms 呼出 → 切 Separate → body dataset=dual
  const gear = await page.locator('#qsSettingsBtn').boundingBox();
  await page.mouse.move(gear.x + gear.width / 2, gear.y + gear.height / 2);
  await page.mouse.down();
  await sleep(650);
  await page.mouse.up();
  await sleep(500);
  const a6a = await page.evaluate(() => {
    const ov = document.getElementById('panelsPopoverOverlay');
    return ov && !ov.hidden && ov.classList.contains('active') &&
      !!document.getElementById('ppModeSeparate') && !!document.getElementById('ppModeCombined');
  });
  check('A6a 长按齿轮呼出 Panels 弹层（Separate/Combined 两选项）', a6a);
  await page.click('#ppModeSeparate');
  await sleep(500);
  const a6b = await page.evaluate(() => ({
    mode: document.body.dataset.shadeMode,
    rootVisible: getComputedStyle(document.getElementById('dualShadeRoot')).display !== 'none',
    trackHidden: getComputedStyle(document.getElementById('pullPanelsTrack')).display === 'none',
  }));
  check('A6b 选 Separate → dataset=dual，浮动面板根可见 + 经典轨道隐藏',
        a6b.mode === 'dual' && a6b.rootVisible && a6b.trackHidden, JSON.stringify(a6b));
  check('A段零 pageerror', errs() === 0, `errors=${errs()}`);
  await page.screenshot({ path: `${OUT}/phone-dual-initial.png` });
  await ctx.close();
}

// ==================== B 段：?shadeMode=dual 直启（双面板 + 手势分区 + 可逆切换） ====================
{
  const sep = BASE.includes('?') ? '&' : '?';
  const { ctx, page, errs } = await boot(`${BASE}${sep}shadeMode=dual`);
  const b1 = await page.evaluate(() => {
    const root = document.getElementById('dualShadeRoot');
    const np = document.getElementById('dualNotifPanel');
    const qp = document.getElementById('dualQsPanel');
    const zone = document.getElementById('dualInvocationZone');
    return {
      ok: document.body.dataset.shadeMode === 'dual' &&
          getComputedStyle(root).display !== 'none' &&
          !!np.querySelector('.collapsed-shade-header') &&
          !!np.querySelector('#notificationsContainer') &&
          !!qp.querySelector('#qsInnerScroll') &&
          !!qp.querySelector('.dual-qs-top #qsPowerBtn') &&
          getComputedStyle(zone).pointerEvents !== 'none',
      panelW: qp.offsetWidth,
      radius: getComputedStyle(qp).borderRadius,
      rightGap: innerWidth - qp.getBoundingClientRect().right,
    };
  });
  check('B1 dual 直启：通知面板收到头部+通知，QS 面板收到滚动内容+顶行电源键',
        b1.ok, `w=${b1.panelW} r=${b1.radius}`);
  check('B1b QS 浮动面板几何：宽 min(600px,50vw-16)=190、右缝 16、圆角 46',
        Math.abs(b1.panelW - 190) < 3 && Math.abs(b1.rightGap - 16) < 2 && b1.radius.startsWith('46'),
        `w=${b1.panelW} gap=${b1.rightGap} r=${b1.radius}`);

  // B2 左 75% 命中区点击 → 通知面板
  await page.mouse.click(103, 12); // 25% of 412
  await sleep(700);
  const b2 = await page.evaluate(() => {
    const np = document.getElementById('dualNotifPanel');
    return { open: np.classList.contains('open'), tr: getComputedStyle(np).transform };
  });
  check('B2 左 75% 分区点击 → 通知面板展开', b2.open, b2.tr);
  await page.screenshot({ path: `${OUT}/phone-dual-notif.png` });

  // B3 右 25% 分区点击 → QS 面板；两面板同开
  await page.mouse.click(395, 12);
  await sleep(700);
  const b3 = await page.evaluate(() => ({
    notif: document.getElementById('dualNotifPanel').classList.contains('open'),
    qs: document.getElementById('dualQsPanel').classList.contains('open'),
  }));
  check('B3 右 25% 分区点击 → QS 面板展开，通知面板保持（可同开）', b3.notif && b3.qs, JSON.stringify(b3));
  await page.screenshot({ path: `${OUT}/phone-dual-both.png` });

  // B4 QS 面板顶行电源键 = 电源符号 + 亮度图标在场
  const b4 = await page.evaluate(() => {
    const d = document.querySelector('.dual-qs-top #qsPowerBtn svg path')?.getAttribute('d') || '';
    const bi = !!document.querySelector('#dualQsPanel #qsBrightnessIcon svg');
    return { ok: d.startsWith('M480,914') && bi, why: bi ? 'icon ok' : 'no icon' };
  });
  check('B4 dual QS 面板顶行电源符号 + 亮度图标在场', b4.ok, b4.why);

  // B5 scrim 点击关闭（AOSP 叠层 scrim 语义：两 scrim 同 z 层按 DOM 序堆叠，
  // 顶层 QS scrim 先吃点击 → 一次关 QS，再点关通知面板）
  const b5hit = await page.evaluate(() => {
    const el = document.elementFromPoint(10, 500);
    return el ? (el.id || el.className || el.tagName) : 'null';
  });
  await page.mouse.click(10, 500);
  await sleep(600);
  const b5a = await page.evaluate(() => ({
    notif: document.getElementById('dualNotifPanel').classList.contains('open'),
    qs: document.getElementById('dualQsPanel').classList.contains('open'),
  }));
  await page.mouse.click(10, 500);
  await sleep(600);
  const b5b = await page.evaluate(() => !document.getElementById('dualNotifPanel').classList.contains('open'));
  check('B5 scrim 逐层关闭：首次点击关顶层 QS，二次点击关通知面板',
        b5hit === 'dualScrimQs' && !b5a.qs && b5a.notif && b5b, `hit=${b5hit} step1=${JSON.stringify(b5a)}`);

  // B6 切回 classic：轨道恢复 + 活节点归位（evaluate 派发长按，不依赖坐标）
  await page.evaluate(() => {
    const gear = document.querySelector('.dual-qs-top #qsSettingsBtn');
    gear.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9 }));
  });
  await sleep(650);
  await page.evaluate(() => {
    document.querySelector('.dual-qs-top #qsSettingsBtn')
      .dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 9 }));
  });
  await sleep(500);
  await page.click('#ppModeCombined');
  await sleep(600);
  const b6 = await page.evaluate(() => {
    const header = document.getElementById('collapsedShadeHeader');
    const inTrack = !!document.getElementById('shadeColumn')?.contains(header);
    return {
      mode: document.body.dataset.shadeMode,
      headerInTrack: inTrack,
      trackVisible: getComputedStyle(document.getElementById('pullPanelsTrack')).display !== 'none',
      rootHidden: getComputedStyle(document.getElementById('dualShadeRoot')).display === 'none',
    };
  });
  check('B6 Combined 切回：轨道恢复 + 头部/滚动区归位（迁移可逆）',
        b6.mode === 'classic' && b6.headerInTrack && b6.trackVisible && b6.rootHidden, JSON.stringify(b6));
  check('B段零 pageerror', errs() === 0, `errors=${errs()}`);
  await ctx.close();
}

await browser.close();
log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
