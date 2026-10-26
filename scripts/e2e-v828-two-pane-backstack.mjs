// e2e-v828.mjs — #53 two-pane 返回层级规则 + 右栏横滑切换 真实浏览器核验
// ① 宽视口（1180×820 ≥ AOSP cur 720）打开设置：tp-wide + backBtn 隐藏（栈根=嵌入二层）
// ② 点一级「关于手机」行 → 右栏托管页 21（二级直展，backBtn 仍隐藏）
// ③ 页 21 内点「设备详细信息」（pushSubPage(22)）→ **宽栏保持** + 右栏托管页 22（三级）
//    + backBtn 显示（A17 shouldHideNavigateUpButton：三级恒显）
// ④ 点 backBtn → 弹栈收敛 → 右栏重托管页 21 + backBtn 隐藏 + 宽栏保持（SubSettings.finish 等价）
// ⑤ 再推页 22 → 右栏横滑（显著位移 >40% 宽，PagedView SIGNIFICANT_MOVE_THRESHOLD）→ 提交弹栈
// ⑥ 再推页 22 → 右栏快甩（位移小 + 高速度 ≥ fling_threshold_velocity 500px/s）→ 提交弹栈
// ⑦ 横滑反向甩（拖出后向回甩，RETURN_TO_ORIGINAL 语义）→ 回弹不提交
// ⑧ 窄视口（420×900）回归：点行 pushSubPage 窄栏推入 + backBtn 显示 + 返回正常
// ⑨ 全程零 pageerror
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT || 8081;
const BASE = `http://localhost:${PORT}/ios-desktop/index.html?nolock=1`;
const OUT = '/home/z/my-project/md3-repo/docs/v828';
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

const openSettings = async (page) => {
  await page.evaluate(() => {
    const icon = document.querySelector('.app-icon[data-id="settings"]');
    if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  });
  await sleep(1600);
};

const closeSettings = async (page) => {
  await page.evaluate(() => { if (window.closeApp) window.closeApp(); });
  await sleep(1100);
};

// ============ ①-⑦ 宽视口：层级规则 + 横滑切换 ============
{
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  let errors = 0;
  page.on('pageerror', (e) => { errors++; log('[pageerror]', e.message.slice(0, 200)); });
  await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1800);
  await openSettings(page);

  // ① 宽栏 + 根态返回键隐藏
  const rootState = await page.evaluate(() => {
    const root = document.querySelector('.tp-root');
    const backBtn = document.getElementById('backBtn');
    const right = root && root.querySelector('.tp-right');
    return {
      wide: !!(root && root.classList.contains('tp-wide')),
      backHidden: backBtn && backBtn.style.display === 'none',
      hostedIdx: right && right.querySelector('.tp-hosted')
        ? right.querySelector('.tp-hosted').id : null,
    };
  });
  check('① 宽栏建立（1180×820 ≥ AOSP cur 720）', rootState.wide);
  check('① 栈根 backBtn 隐藏（嵌入二层映射）', rootState.backHidden);
  check('① 右栏默认托管（动画与动效 页10）', rootState.hostedIdx === 'app-page-settings-10', rootState.hostedIdx || 'null');

  // ② 点一级「关于手机」→ 右栏托管页 21
  await page.evaluate(() => {
    const row = document.querySelector('.tp-row[data-tp-key="about"]');
    if (row) row.click();
  });
  await sleep(700);
  const hosted21 = await page.evaluate(() => {
    const right = document.querySelector('.tp-right');
    const hosted = right && right.querySelector('.tp-hosted');
    const backBtn = document.getElementById('backBtn');
    return {
      idx: hosted ? hosted.id : null,
      inRight: !!(hosted && hosted.closest('.tp-right')),
      backHidden: backBtn && backBtn.style.display === 'none',
      sel: !!document.querySelector('.tp-row[data-tp-key="about"].tp-sel'),
    };
  });
  check('② 二级直展托管页 21（关于手机）', hosted21.idx === 'app-page-settings-21' && hosted21.inRight, hosted21.idx || 'null');
  check('② 二级直展 backBtn 仍隐藏（shouldHideNavigateUpButton 二层+嵌入）', hosted21.backHidden);
  check('② 左栏行高亮 tp-sel', hosted21.sel);

  await page.screenshot({ path: `${OUT}/second-level-direct.png` });
  log('[shot] docs/v828/second-level-direct.png');

  // ③ 页 21 内点「设备详细信息」（pushSubPage(22)）→ 宽栏保持 + 三级托管 + backBtn 显示
  await page.evaluate(() => {
    const row = document.querySelector('.tp-right .app-page[id="app-page-settings-21"] [onclick*="pushSubPage(22)"]');
    if (row) row.click();
  });
  await sleep(1100);
  const lv3 = await page.evaluate(() => {
    const root = document.querySelector('.tp-root');
    const right = root && root.querySelector('.tp-right');
    const hosted = right && right.querySelector('.tp-hosted');
    const backBtn = document.getElementById('backBtn');
    const title = document.getElementById('appTitle');
    return {
      wideKept: !!(root && root.classList.contains('tp-wide')),
      idx: hosted ? hosted.id : null,
      backShown: backBtn && backBtn.style.display === 'flex',
      title: title ? title.textContent : '',
    };
  });
  check('③ 宽栏保持（A17 嵌入：三级不退窄）', lv3.wideKept);
  check('③ 右栏托管切换三级页 22', lv3.idx === 'app-page-settings-22', lv3.idx || 'null');
  check('③ 三级 backBtn 显示（非二层页恒显）', lv3.backShown);
  check('③ 标题跟随三级页', lv3.title.length > 0, lv3.title);

  // ④ 点 backBtn → 弹栈收敛 → 右栏回托管页 21
  await page.evaluate(() => {
    const btn = document.getElementById('backBtn');
    if (btn) btn.click();
  });
  await sleep(1400);
  const backTo21 = await page.evaluate(() => {
    const root = document.querySelector('.tp-root');
    const right = root && root.querySelector('.tp-right');
    const hosted = right && right.querySelector('.tp-hosted');
    const backBtn = document.getElementById('backBtn');
    return {
      wideKept: !!(root && root.classList.contains('tp-wide')),
      idx: hosted ? hosted.id : null,
      backHidden: backBtn && backBtn.style.display === 'none',
    };
  });
  check('④ 宽栏保持（弹栈不退窄）', backTo21.wideKept);
  check('④ 右栏重托管页 21（SubSettings.onNavigateUp=finish 等价）', backTo21.idx === 'app-page-settings-21', backTo21.idx || 'null');
  check('④ backBtn 回到隐藏（栈根）', backTo21.backHidden);

  // 横滑辅助：真实 mouse 拖拽（pointer 事件流）+ 可调速度
  // 合成 pointer 手势：evaluate 内同步派发（浏览器 input 管线对 CDP 连发 mousemove
  // 做同刻聚合——实测 first.t=last.t 且坐标合终值 → vx 恒 0；合成事件逐条派发
  // 坐标保真，vx 由 samples 窗口对 dt=1ms 钳位自然放大 = 真实 fling 语义）
  const swipe = async (fromX, fromY, dx, stepMs, steps) => {
    await page.evaluate(({ fromX, fromY, dx, steps, stepMs }) => {
      const target = document.elementFromPoint(fromX, fromY) || document.querySelector('.tp-right');
      const mk = (type, cx) => new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse',
        clientX: cx, clientY: fromY, button: 0, isPrimary: true,
      });
      target.dispatchEvent(mk('pointerdown', fromX));
      const step = (i) => {
        if (i > steps) { target.dispatchEvent(mk('pointerup', fromX + dx)); return; }
        target.dispatchEvent(mk('pointermove', fromX + (dx * i) / steps));
        setTimeout(() => step(i + 1), stepMs || 18);
      };
      step(1);
    }, { fromX, fromY, dx, steps, stepMs });
    await sleep(1300);
  };

  // ⑤ 显著位移提交：慢拖 >40% 右栏宽（SIGNIFICANT_MOVE_THRESHOLD=0.4）
  await page.evaluate(() => {
    const row = document.querySelector('.tp-right .app-page[id="app-page-settings-21"] [onclick*="pushSubPage(22)"]');
    if (row) row.click();
  });
  await sleep(1100);
  const geo = await page.evaluate(() => {
    const right = document.querySelector('.tp-right');
    const r = right.getBoundingClientRect();
    // 起点 1/4 处：拖 55% 宽后终点 ≈ 0.8w（不出视口——出界 up 的命中目标不可控）
    return { x: r.left + r.width * 0.25, y: r.top + r.height * 0.5, w: r.width };
  });
  check('⑤ 前置：三级页 22 托管在场', (await page.evaluate(() =>
    (document.querySelector('.tp-right .tp-hosted:not(.tp-borrowed)') || {}).id === 'app-page-settings-22')));
  await swipe(geo.x, geo.y, geo.w * 0.55, 18, 16); // 55% 宽、~288ms
  const swCommit = await page.evaluate(() => {
    const right = document.querySelector('.tp-right');
    const hosted = right && right.querySelector('.tp-hosted');
    const backBtn = document.getElementById('backBtn');
    return {
      idx: hosted ? hosted.id : null,
      backHidden: backBtn && backBtn.style.display === 'none',
      wideKept: !!document.querySelector('.tp-root.tp-wide'),
    };
  });
  check('⑤ 横滑显著位移 → 提交弹栈回页 21', swCommit.idx === 'app-page-settings-21', swCommit.idx || 'null');
  check('⑤ 提交后 backBtn 隐藏 + 宽栏保持', swCommit.backHidden && swCommit.wideKept);

  // ⑥ fling 提交：位移小（~15%）+ 快甩（速度 ≥500px/s，fling_threshold_velocity）
  await page.evaluate(() => {
    const row = document.querySelector('.tp-right .app-page[id="app-page-settings-21"] [onclick*="pushSubPage(22)"]');
    if (row) row.click();
  });
  await sleep(1100);
  await swipe(geo.x, geo.y, geo.w * 0.15, 4, 10); // 15% 宽×4ms 步进 → vx≈0.15w/0.04≈3000px/s ≫ 500（fling_threshold_velocity）
  const flingCommit = await page.evaluate(() =>
    ((document.querySelector('.tp-right .tp-hosted:not(.tp-borrowed)') || {}).id || ''));
  check('⑥ fling 快甩 → 提交弹栈回页 21', flingCommit === 'app-page-settings-21', flingCommit);

  // ⑦ 反向甩回弹：拖出 25% 后向回甩（RETURN_TO_ORIGINAL_PAGE_THRESHOLD 语义）→ 不提交
  await page.evaluate(() => {
    const row = document.querySelector('.tp-right .app-page[id="app-page-settings-21"] [onclick*="pushSubPage(22)"]');
    if (row) row.click();
  });
  await sleep(1100);
  await page.evaluate(({ x, y, w }) => {
    const target = document.elementFromPoint(x, y) || document.querySelector('.tp-right');
    const mk = (type, cx) => new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 8, pointerType: 'mouse',
      clientX: cx, clientY: y, button: 0, isPrimary: true,
    });
    target.dispatchEvent(mk('pointerdown', x));
    let i = 0;
    const step = () => {
      i++;
      if (i <= 12) { // 右拖 25%（14ms 步进 ≈ 手速）
        target.dispatchEvent(mk('pointermove', x + (w * 0.25 * i) / 12));
        setTimeout(step, 14);
      } else if (i <= 22) { // 反向左甩（4ms 步进 ≈ 快甩 fling，RETURN_TO_ORIGINAL 语义）
        target.dispatchEvent(mk('pointermove', x + w * 0.25 - (w * 0.22 * (i - 12)) / 10));
        setTimeout(step, 4);
      } else {
        target.dispatchEvent(mk('pointerup', x + w * 0.25 - w * 0.22));
      }
    };
    step();
  }, { x: geo.x, y: geo.y, w: geo.w });
  await sleep(1300);
  const rebBack = await page.evaluate(() => ({
    // 排除借入标记页（回弹期 right 双 tp-hosted 并存，借入页排前）
    idx: ((document.querySelector('.tp-right .tp-hosted:not(.tp-borrowed)') || {}).id || ''),
    borrowedLeft: !!document.querySelector('.tp-right .tp-borrowed'), // 借入页留驻下层（被托管页盖住）
  }));
  check('⑦ 反向甩 → 回弹不提交（仍托管三级页 22）', rebBack.idx === 'app-page-settings-22', rebBack.idx);

  await page.screenshot({ path: `${OUT}/wide-three-level-hosted.png` });
  log('[shot] docs/v828/wide-three-level-hosted.png');

  // ⑧ 窄视口回归（同 context 缩窗：宽→窄回收路径顺带核验）
  await page.setViewportSize({ width: 420, height: 900 });
  await sleep(1200);
  const narrow = await page.evaluate(() => {
    const root = document.querySelector('.tp-root');
    const backBtn = document.getElementById('backBtn');
    return {
      narrowOff: !!(root && !root.classList.contains('tp-wide')),
      backShown: backBtn && backBtn.style.display === 'flex',
    };
  });
  check('⑧ 宽→窄切换：tp-wide 摘除 + 三级页 backBtn 显示（窄栏页栈语义）', narrow.narrowOff && narrow.backShown);

  // ⑨ pageerror 零容忍
  check('⑨ 宽视口全程零 pageerror', errors === 0, `errors=${errors}`);

  await closeSettings(page);
  await ctx.close();
}

// ============ ⑩ 窄视口独立回归：点行推入正常（420×900 < AOSP sw 600） ============
{
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  let errors = 0;
  page.on('pageerror', (e) => { errors++; log('[pageerror][narrow]', e.message.slice(0, 200)); });
  await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1600);
  await openSettings(page);

  const n0 = await page.evaluate(() => {
    const root = document.querySelector('.tp-root');
    return { narrow: !!(root && !root.classList.contains('tp-wide')) };
  });
  check('⑩ 窄视口不建双栏（420 < sw 600 且 cur 720）', n0.narrow);

  await page.evaluate(() => {
    const row = document.querySelector('.tp-row[data-tp-key="battery"]');
    if (row) row.click();
  });
  await sleep(1200);
  const n1 = await page.evaluate(() => {
    const page2 = document.getElementById('app-page-settings-2');
    const backBtn = document.getElementById('backBtn');
    return {
      pushed: !!(page2 && page2.closest('#pageStack')),
      visible: !!(page2 && page2.style.transform !== 'translate3d(100%, 0, 0)'),
      backShown: backBtn && backBtn.style.display === 'flex',
    };
  });
  check('⑩ 窄栏点行 → 页栈推入二级（电池）', n1.pushed && n1.visible);
  check('⑩ 窄栏二级 backBtn 显示', n1.backShown);

  await page.evaluate(() => { const b = document.getElementById('backBtn'); if (b) b.click(); });
  await sleep(1400);
  const n2 = await page.evaluate(() => {
    const b = document.getElementById('backBtn');
    return { backHidden: b && b.style.display === 'none' };
  });
  check('⑩ 窄栏返回正常（backBtn 回隐藏）', n2.backHidden);
  check('⑩ 窄视口全程零 pageerror', errors === 0, `errors=${errors}`);
  await closeSettings(page);
  await ctx.close();
}

await browser.close();
log(failures === 0 ? 'ALL PASS' : `FAILED: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
