// v9.02 = #64 heads-up 堆叠横幅（R38 轮）无头回归小判据：
// ①150ms×5 连发 ≤3 不卡死不残留（堆叠挤旧）②自动收 5000ms 清场 ③上滑收起（速度接力）
// ④点击路由进应用（calculator 精确路由）⑤下滑展开通知栏（openPullPanel 联动清栈）
// ⑥touch acceptance 700ms 内触摸被拒 ⑦K 零 pageerror 全程
import { chromium } from 'playwright';
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

const send = (id, appId = '') => page.evaluate(([nid, aid]) => {
  const { addSystemNotification } = window.__notiMod || {};
  return addSystemNotification({ id: nid, app: aid ? '计算器' : '系统', appId: aid, title: `通知 ${nid}`, desc: '#64 e2e', time: '刚刚' });
}, [id, appId]);
// notifications.js 无 window 全局导出 → 动态 import 缓存
await page.evaluate(async () => {
  window.__notiMod = await import('/ios-desktop/js/notifications.js');
});
const dbg = () => page.evaluate(() => {
  const d = window.__headsUpDebug;
  return { alive: d.aliveCount, total: d.count, states: d.states(), top: d.items()[0] };
});

// A. 150ms×5 连发压测（#64 验收①：不卡死不重叠残留）
const t0 = Date.now();
for (let i = 0; i < 5; i++) { await send(`v64-burst-${i}`); await sleep(150); }
const burstMs = Date.now() - t0;
const a = await dbg();
t('A1 连发 5 条 alive ≤3（堆叠挤旧）', a.alive <= 3, `alive=${a.alive}`);
t('A2 连发不卡死（750ms 窗口完成，实际 ' + burstMs + 'ms）', burstMs < 2500, `${burstMs}ms`);
t('A3 新条置顶（DOM 首子元素 = 最后投递）', await page.evaluate(() => {
  const st = document.getElementById('headsUpStack');
  return st && st.firstElementChild && st.firstElementChild._entry.item.id === 'v64-burst-4';
}));
t('A4 数据单源：Feed 全量在册', await page.evaluate(() => {
  const { getNotifications } = window.__notiMod;
  return [0, 1, 2, 3, 4].every(i => getNotifications().some(n => n.id === `v64-burst-${i}`));
}));

// B. 自动收 5000ms 清场（AOSP decay）
await sleep(6300);
const b = await dbg();
t('B1 自动收后 alive=0（5000ms decay + exit 弹簧落场）', b.alive === 0, `alive=${b.alive}`);
t('B2 DOM 零残留（.hun-banner 全部移除）', await page.evaluate(() => document.querySelectorAll('.hun-banner').length === 0));

// C. 上滑收起（touch acceptance 过 700ms 后拖拽 -100px 甩出）
await send('v64-swipe-up');
await sleep(900);
const box = await page.evaluate(() => {
  const el = document.querySelector('#headsUpStack .hun-banner');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
t('C1 横幅在屏（可拖）', !!box, JSON.stringify(box));
if (box) {
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.move(box.x, box.y - 60, { steps: 5 });
  await page.mouse.move(box.x, box.y - 120, { steps: 5 });
  await page.mouse.up();
  await sleep(1200);
}
const c = await dbg();
t('C2 上滑收起生效（alive=0）', c.alive === 0, `alive=${c.alive}`);

// D. touch acceptance：700ms 内触摸被拒（横幅不路由不开应用；AOSP 同名常量同语义：
// 触摸下落给 shade —— 状态栏手势区内点击会拉出面板并守卫清栈，属期望链路，
// 故本判据避开手势区（y>55）专测横幅自身拒收）
await send('v64-accept', 'calculator');
await sleep(150); // < 700ms
const dbox = await page.evaluate(() => {
  const el = document.querySelector('#headsUpStack .hun-banner');
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height - 14 }; // 横幅下沿（手势区外）
});
t('D1 手势区外校验（点击点 y>55）', dbox.y > 55, `y=${dbox.y}`);
await page.mouse.click(dbox.x, dbox.y);
await sleep(300);
t('D2 700ms 内点击被拒（横幅仍在，不开应用不出栈）', await page.evaluate(() => ({
  alive: window.__headsUpDebug.aliveCount === 1,
  noApp: !document.querySelector('.app-window:not([style*="display: none"]) .app-header') ||
    !/计算器/.test((document.querySelector('.app-window:not([style*="display: none"])') || {}).textContent || ''),
})).then(r => r.alive && r.noApp));

// E. 点击路由进应用（>700ms 越过 acceptance 窗，calculator 精确路由；点横幅下沿避手势区）
await sleep(650); // 距 spawn 已 >700ms
const ebox = await page.evaluate(() => {
  const el = document.querySelector('#headsUpStack .hun-banner');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height - 14 };
});
if (ebox) {
  await page.mouse.click(ebox.x, ebox.y);
  await sleep(1100);
}
t('E1 点击横幅 → calculator 应用开启', await page.evaluate(() => {
  const win = document.querySelector('.app-window:not([style*="display: none"])');
  return !!win && /计算器|calculator/i.test(win.textContent || '');
}));
await page.evaluate(async () => {
  const { closeApp } = await import('/ios-desktop/js/app-window.js');
  closeApp();
});
await sleep(800);

// F. 下滑展开通知栏（横幅下沿起拖 ≥72px → openPullPanel 联动清栈；数据仍在 Feed）
await send('v64-shade-a');
await sleep(900);
await send('v64-shade-b');
await sleep(900);
const fbox = await page.evaluate(() => {
  const el = document.querySelector('#headsUpStack .hun-banner');
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height - 14 };
});
await page.mouse.move(fbox.x, fbox.y);
await page.mouse.down();
await page.mouse.move(fbox.x, fbox.y + 100, { steps: 6 });
await page.mouse.up();
await sleep(800);
t('F1 下滑 → 通知面板开启（pullPanelsOverlay.active）', await page.evaluate(() => {
  const ov = document.getElementById('pullPanelsOverlay');
  return !!ov && ov.classList.contains('active');
}));
t('F2 下滑 → 横幅即时清栈（数据仍在 Feed）', await page.evaluate(() => ({
  dead: window.__headsUpDebug.aliveCount === 0,
  kept: window.__notiMod.getNotifications().some(n => n.id === 'v64-shade-a'),
})).then(r => r.dead && r.kept));
await page.evaluate(async () => {
  const { closePullPanels } = await import('/ios-desktop/js/pull-down-gesture.js');
  closePullPanels();
});
await sleep(800);

// K. 零 pageerror 全程
t('K1 全程零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log(`\n${pass}/${pass + fail} PASS`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
