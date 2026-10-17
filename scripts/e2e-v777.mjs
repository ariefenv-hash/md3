// e2e-v777.mjs — v7.77 M3E 主题动态色 + 下拉/拉伸扩场景 真实浏览器核验
// ① weather iframe：m3e-pull 圆形容器 = primary-container（非白底盘）；
//    改 --md-primary-container → 卡片背景实时跟随（参考件 readColors 语义，用户裁决点）
// ② weather iframe：鼠标拖拽下拉 → 指示器卡片渐显 + 刷新触发（扩场景接线端到端）
// ③ settings 宽栏：.tp-left / .tp-right 纳入增强（__scrollFx 在场）；
//    顶缘下拉拉伸 + 底部上拉拉伸（本轮修复点）在可滚容器上生效（按住态采样）；
//    .tp-right 不可滚包装层无幽灵拉伸（OVER_SCROLL_IF_CONTENT_SCROLLS 守卫）
// ④ reminders iframe：.tasks-scroll-area 接入 _shared/stretch.js（__m3eStretch 在场
//    + 可滚时底部上拉形变生效，扩场景端到端）
// ⑤ 全程零 pageerror
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT || 8099;
const BASE = `http://localhost:${PORT}/ios-desktop/index.html?nolock=1`;
const OUT = '/home/z/my-project/e2e-v777';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};
const STRETCH_RE = /scale\(1, 1\.0[1-9]/;   // scale(1, 1.01+) 即拉伸在场

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
const page = await ctx.newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; log('[pageerror]', e.message.slice(0, 200)); });
await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1800);

const openApp = async (id) => {
  await page.evaluate((appId) => {
    const icon = document.querySelector(`.app-icon[data-id="${appId}"]`);
    if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  }, id);
  await sleep(1500);
};
const closeApp = async () => {
  await page.evaluate(() => { if (window.closeApp) window.closeApp(); });
  await sleep(1100);
};

// 合成 touch 拖拽：按下 → 逐步移动 → **保持按住**（不自动松手）。
// AOSP 1:1「拉伸保持」语义下按住态 transform 恒在，此时采样才可靠；
// 松手由 touchRelease 单独执行。
const touchHold = async (frame, selector, fromX, fromY, dx, dy, steps = 14) => {
  await frame.evaluate(({ selector, fromX, fromY, dx, dy, steps }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const mk = (type, y) => new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: fromX, clientY: y })],
      changedTouches: [new Touch({ identifier: 1, target: el, clientX: fromX, clientY: y })],
    });
    el.dispatchEvent(mk('touchstart', fromY));
    let i = 0;
    const step = () => {
      i++;
      const p = i / steps;
      el.dispatchEvent(mk('touchmove', fromY + dy * p));
      if (i < steps) setTimeout(step, 16);
    };
    setTimeout(step, 30);
  }, { selector, fromX, fromY, dx, dy, steps });
  await sleep(steps * 16 + 450);   // 拖完 + 按住余量（拉伸保持中）
};
const touchRelease = async (frame, selector, x, y) => {
  await frame.evaluate(({ selector, x, y }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true, cancelable: true, touches: [],
      changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
    }));
  }, { selector, x, y });
  await sleep(800);                 // 松手回弹落定
};

// ============ ① ② weather：主题动态色 + 下拉扩场景 ============
log('--- ① ② weather iframe：主题动态容器色 + 下拉刷新');
await openApp('weather');
// 天气首启会弹定位权限对话框（宿主层）——点「仅本次」放行并避免遮挡下拉区
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
}).catch(() => {});
await sleep(600);
const wFrame = page.frames().find((f) => f.url().includes('/apps/weather'));
check('weather iframe 打开', !!wFrame, wFrame ? wFrame.url() : '未找到');

if (wFrame) {
  const before = await wFrame.evaluate(() => {
    const vp = document.scrollingElement || document.documentElement;
    const card = vp && vp.__m3ePullActive !== undefined
      ? document.querySelector('div[aria-hidden="true"] > div')
      : null;
    return {
      pullActive: vp ? vp.__m3ePullActive === true : false,
      cardBg: card ? getComputedStyle(card).backgroundColor : '',
      roleVar: getComputedStyle(document.documentElement).getPropertyValue('--md-primary-container').trim(),
    };
  });
  check('weather 下拉组件已接线（__m3ePullActive）', before.pullActive === true, JSON.stringify(before));
  check('圆形容器 = primary-container（非白底盘）',
    before.cardBg && before.cardBg !== 'rgb(255, 255, 255)' && before.cardBg !== 'rgba(0, 0, 0, 0)',
    `bg=${before.cardBg} var=${before.roleVar}`);

  // 主题动态：改 --md-primary-container → 卡片背景实时跟随（rethemeCard）
  await wFrame.evaluate(() => {
    document.documentElement.style.setProperty('--md-primary-container', 'rgb(255, 4, 8)');
  });
  await sleep(300);
  const after = await wFrame.evaluate(() => {
    const card = document.querySelector('div[aria-hidden="true"] > div');
    return card ? getComputedStyle(card).backgroundColor : '';
  });
  check('圆形容器随主题实时重读（readColors 语义）', after === 'rgb(255, 4, 8)', `after=${after}`);
  await wFrame.evaluate(() => document.documentElement.style.removeProperty('--md-primary-container'));
  await sleep(200);

  // 鼠标拖拽下拉 → 卡片渐显（真实 input 穿 iframe）
  const cx = 590, cyTop = 300;
  await wFrame.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 0; });
  await page.mouse.move(cx, cyTop);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) { await page.mouse.move(cx, cyTop + i * 14); await sleep(16); }
  const midPull = await wFrame.evaluate(() => {
    const holder = document.querySelector('div[aria-hidden="true"]');
    return holder ? { opacity: getComputedStyle(holder).opacity, t: holder.style.transform } : null;
  });
  check('下拉中指示器卡片跟手渐显', !!midPull && parseFloat(midPull.opacity) > 0.2,
    midPull ? `opacity=${midPull.opacity} transform=${midPull.t}` : 'holder 缺失');
  await page.mouse.move(cx, cyTop + 240);
  await page.mouse.up();
  await sleep(900);
  await page.screenshot({ path: `${OUT}/w1-weather-pull.png` });
  await closeApp();
} else { check('weather iframe 打开', false, '跳过 ① ②'); }

// ============ ③ settings 宽栏拉伸 ============
log('--- ③ settings 宽栏：左右栏拉伸 + 幽灵拉伸防护');
await openApp('settings');
const wide = await page.evaluate(() => !!document.querySelector('.tp-root.tp-wide'));
check('设置进入宽栏（clientWidth ≥ 620）', wide);
const enhanced = await page.evaluate(() => {
  const l = document.querySelector('.tp-left'), r = document.querySelector('.tp-right');
  return { left: !!(l && l.__scrollFx), right: !!(r && r.__scrollFx) };
});
check('.tp-left 纳入增强（此前整栏无拉伸根因）', enhanced.left, JSON.stringify(enhanced));
check('.tp-right 纳入增强', enhanced.right);

// 顶缘下拉拉伸（touch 管线；宽态打在右栏宿主页上，按住态采样）
const hostSel = '.tp-right .tp-hosted';
await touchHold(page, hostSel, 700, 160, 0, 150);
const topT = await page.evaluate(() => {
  const el = document.querySelector('.tp-right .tp-hosted');
  return el ? el.style.transform : '(缺元素)';
});
check('顶缘下拉拉伸形变在场（按住态 scale(1,>1)）', STRETCH_RE.test(topT), topT);
await page.screenshot({ path: `${OUT}/s1-settings-top-stretch.png` });
await touchRelease(page, hostSel, 700, 310);

// 底部上拉拉伸（本轮修复点）：宿主页滚到底继续上拉（可滚容器）
const hostRange = await page.evaluate(() => {
  const el = document.querySelector('.tp-right .tp-hosted');
  if (!el) return -1;
  return Math.max(0, el.scrollHeight - el.clientHeight);
});
if (hostRange > 40) {
  await page.evaluate(() => {
    const el = document.querySelector('.tp-right .tp-hosted');
    if (el) el.scrollTop = el.scrollHeight;
  });
  await sleep(250);
  await touchHold(page, hostSel, 700, 620, 0, -150);
  const bottomT = await page.evaluate(() => {
    const el = document.querySelector('.tp-right .tp-hosted');
    return el ? el.style.transform : '';
  });
  check('底部上拉拉伸形变在场（此前缺失，本轮修复）', STRETCH_RE.test(bottomT), bottomT);
  await page.screenshot({ path: `${OUT}/s2-settings-bottom-stretch.png` });
  await touchRelease(page, hostSel, 700, 470);
} else {
  log(`SKIP | 宿主页不可滚（range=${hostRange}），底部用例在左栏验证`);
  const leftRange = await page.evaluate(() => {
    const l = document.querySelector('.tp-left');
    return l ? Math.max(0, l.scrollHeight - l.clientHeight) : -1;
  });
  if (leftRange > 40) {
    await page.evaluate(() => {
      const l = document.querySelector('.tp-left');
      if (l) l.scrollTop = l.scrollHeight;
    });
    await sleep(250);
    await touchHold(page, '.tp-left', 300, 620, 0, -150);
    const bottomT = await page.evaluate(() => {
      const l = document.querySelector('.tp-left');
      return l ? l.style.transform : '';
    });
    check('底部上拉拉伸形变在场（左栏，此前缺失本轮修复）', STRETCH_RE.test(bottomT), bottomT);
    await touchRelease(page, '.tp-left', 300, 470);
  } else {
    log(`SKIP | 左栏也不可滚（range=${leftRange}）——AOSP 语义下无边缘属正确行为`);
  }
}

// 幽灵拉伸防护：不可滚 .tp-right 自身不得被写入拉伸 transform
const ghost = await page.evaluate(() => {
  const r = document.querySelector('.tp-right');
  return r ? (r.style.transform || '(空)') : '(缺元素)';
});
check('不可滚 .tp-right 无幽灵拉伸（OVER_SCROLL_IF_CONTENT_SCROLLS）', ghost === '(空)', ghost);
await page.screenshot({ path: `${OUT}/s3-settings-wide.png` });
await closeApp();

// ============ ④ reminders iframe：stretch 扩场景 ============
log('--- ④ reminders iframe：_shared/stretch.js 底部拉伸');
await openApp('reminders');
const rFrame = page.frames().find((f) => f.url().includes('/apps/reminders'));
check('reminders iframe 打开', !!rFrame, rFrame ? rFrame.url() : '未找到');
if (rFrame) {
  const st = await rFrame.evaluate(() => {
    const el = document.querySelector('.tasks-scroll-area');
    return {
      has: !!el, attached: !!(el && el.__m3eStretch),
      range: el ? Math.max(0, el.scrollHeight - el.clientHeight) : -1,
    };
  });
  check('.tasks-scroll-area 接入 __m3eStretch', st.has && st.attached, JSON.stringify(st));
  if (st.range > 40) {
    await rFrame.evaluate(() => {
      const el = document.querySelector('.tasks-scroll-area');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await sleep(250);
    await touchHold(rFrame, '.tasks-scroll-area', 590, 620, 0, -160);
    const rT = await rFrame.evaluate(() => {
      const el = document.querySelector('.tasks-scroll-area');
      return el ? el.style.transform : '';
    });
    check('reminders 底部上拉形变生效（stretch 扩场景）', STRETCH_RE.test(rT), rT);
    await page.screenshot({ path: `${OUT}/r1-reminders-stretch.png` });
    await touchRelease(rFrame, '.tasks-scroll-area', 590, 460);
  } else {
    log(`SKIP | tasks 区不可滚（range=${st.range}）——AOSP 语义下无边缘属正确行为；接线在场已验`);
  }
}

// ============ ⑤ pageerror ============
check('零 pageerror', errors === 0, `errors=${errors}`);

await browser.close();
log(`\n=== e2e-v777 完成：${failures === 0 ? '全部通过' : failures + ' 项失败'} ===`);
process.exit(failures === 0 ? 0 : 1);
