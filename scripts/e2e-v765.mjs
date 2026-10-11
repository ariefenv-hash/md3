// e2e-v765.mjs — v7.65 真实浏览器逐帧核验
// ① 后台退场全程卡片零模糊（stage 抬升后 overlay backdrop 不再采样卡片）
// ② 经典平铺模式布局正确
// ③ QS 开关挤压态（grow/squeeze）+ 圆角过渡无直角帧
// ④ 包应用通知图标（动态注册 → 状态栏/通知中心）
import { chromium } from 'playwright';

const BASE = 'http://localhost:8095/ios-desktop/index.html?nolock=1';
const OUT = '/home/z/my-project/e2e-v765';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--force-device-scale-factor=2'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 160)); });

await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1200);

// ---------- ① 后台退场：应用 → 卡片，全程卡片 sharp ----------
console.log('--- ① recents flight: card never blurred');
const frameProbe = async () => page.evaluate(() => {
  const st = document.getElementById('stage');
  const ov = document.getElementById('recentAppsOverlay');
  return { stageZ: st ? st.style.zIndex : null, overlayActive: ov ? ov.classList.contains('active') : null };
});
// 直接用真实图标点击打开设置应用（.app-icon[data-id="settings"]）
const appOpened = await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="settings"]');
  if (!icon) return false;
  icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  return true;
});
console.log('app open click:', appOpened);
await page.waitForTimeout(1400);

// 手势上滑唤出后台（用导航栏 Home 附近手势 or __openRecentApps 桥）
await page.evaluate(() => { window.__openRecentApps && window.__openRecentApps(); });
await sleep(30);
const mid1 = await frameProbe();
console.log('mid-flight +30ms:', JSON.stringify(mid1));
// 飞行中逐帧采样：stage 应为 760，卡片 filter 应为空/none
const samples = [];
for (let i = 0; i < 10; i++) {
  const s = await page.evaluate(() => {
    const st = document.getElementById('stage');
    const win = document.getElementById('appWindow');
    const cards = document.querySelectorAll('.recent-app-card');
    return {
      stageZ: st ? st.style.zIndex : null,
      winVisible: win ? win.classList.contains('open') : false,
      winFilter: win ? (win.style.filter || '(empty)') : null,
      anyCardBlur: [...cards].some((c) => c.style.filter && c.style.filter !== 'none'),
      overlayBlur: getComputedStyle(document.getElementById('recentAppsOverlay')).backdropFilter,
    };
  });
  samples.push(s);
  await sleep(55);
}
console.log('flight samples:', JSON.stringify(samples.slice(0, 10), null, 0));
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/1-recents-open.png` });

const afterLand = await frameProbe();
console.log('after land:', JSON.stringify(afterLand));

// ---------- ② 经典平铺 ----------
console.log('--- ② classic tiling');
await page.evaluate(() => { window.__desktopPrefs.set('recentsStyle', 'classic'); });
await page.evaluate(() => { window.__closeRecentApps && window.__closeRecentApps({ resumeSuspended: false }); });
await page.waitForTimeout(500);
await page.evaluate(() => { window.__openRecentApps && window.__openRecentApps(); });
await page.waitForTimeout(900);
const classic = await page.evaluate(() => {
  const deck = document.getElementById('recentCardsDeck');
  const cards = [...document.querySelectorAll('.recent-app-card')];
  return {
    deckClass: deck.className,
    transforms: cards.slice(0, 3).map((c) => c.style.transform),
    opacities: cards.slice(0, 3).map((c) => c.style.opacity),
    anyBlur: cards.some((c) => c.style.filter && c.style.filter !== 'none'),
  };
});
console.log('classic:', JSON.stringify(classic, null, 0));
await page.screenshot({ path: `${OUT}/2-recents-classic.png` });
// 切回轮播（偏好 API 实时切换，不重开面板）
await page.evaluate(() => { window.__desktopPrefs.set('recentsStyle', 'carousel'); });
await page.waitForTimeout(400);
const carousel = await page.evaluate(() => {
  const deck = document.getElementById('recentCardsDeck');
  const cards = [...document.querySelectorAll('.recent-app-card')];
  return { deckClass: deck.className, t0: cards[0] && cards[0].style.transform, anyBlur: cards.some((c) => c.style.filter && c.style.filter !== 'none') };
});
console.log('carousel live-switch:', JSON.stringify(carousel));
await page.evaluate(() => { window.__closeRecentApps && window.__closeRecentApps({ resumeSuspended: false }); });
await page.waitForTimeout(400);

// ---------- ③ QS 开关挤压态 + 圆角 ----------
console.log('--- ③ QS grow/squeeze + radius');
await page.evaluate(async () => {
  const pd = await import('/ios-desktop/js/pull-down-gesture.js');
  pd.openPullPanel(1); // 面板 1 = 快速设置
});
await page.waitForTimeout(700);
const qsProbe = await page.evaluate(() => {
  const container = document.getElementById('qsTilesContainer');
  if (!container) return { found: false };
  const pills = [...container.querySelectorAll('.qs-tile-pill')];
  return { found: true, count: pills.length, activeCount: pills.filter((p) => p.classList.contains('active')).length };
});
console.log('qs panel:', JSON.stringify(qsProbe));
if (qsProbe.found) {
  // 点击一个未激活磁贴（torch）并冻结中帧查 transform/radius
  const torch = await page.$('#qsTilesContainer .qs-tile-pill[data-tile-id="torch"]');
  if (torch) {
    await torch.click();
    await sleep(60); // squish-on 380ms 中段
    const mid = await page.evaluate(() => {
      const p = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="torch"]');
      const cs = getComputedStyle(p);
      return { cls: p.className, transform: cs.transform, radius: cs.borderRadius, anim: cs.animationName };
    });
    console.log('torch mid-squish:', JSON.stringify(mid));
    await sleep(600);
    const settled = await page.evaluate(() => {
      const p = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="torch"]');
      const peers = [...document.querySelectorAll('#qsTilesContainer .qs-tile-pill')].filter((x) => x !== p);
      return {
        cls: p.className,
        radius: getComputedStyle(p).borderRadius,
        growPeers: peers.filter((x) => x.classList.contains('qs-grow')).length,
        squeezePeers: peers.filter((x) => x.classList.contains('qs-squeeze')).length,
        activePeers: peers.filter((x) => x.classList.contains('active')).length,
      };
    });
    console.log('torch settled:', JSON.stringify(settled));
    await page.screenshot({ path: `${OUT}/3-qs-grow-squeeze.png` });
    // 关闭并采样半径（不应出现 0px/直角帧 —— 关键帧有界）；
    // torch 会挂全屏 screenTorchLayer 拦截真点击 → 用 DOM click 直调
    await page.evaluate(() => document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="torch"]').click());
    const rSamples = [];
    for (let i = 0; i < 8; i++) {
      const r = await page.evaluate(() => {
        const p = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="torch"]');
        return getComputedStyle(p).borderRadius;
      });
      rSamples.push(r);
      await sleep(45);
    }
    console.log('off radius samples:', rSamples.join(' | '));
  }
}
await page.keyboard.press('Escape').catch(() => {});
await page.evaluate(() => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
await page.waitForTimeout(400);

// ---------- ④ 包应用通知图标 ----------
console.log('--- ④ pkg app notification icon');
const pkgResult = await page.evaluate(async () => {
  // 注册一个模拟包应用动态图标 → 发通知 → 读状态栏/通知中心渲染
  const m = await import('/ios-desktop/js/app-icons.js');
  const imgHtml = '<svg viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" rx="24" fill="#7c4dff"/><circle cx="50" cy="50" r="22" fill="#fff"/></svg>';
  m.registerAppIcon('pkg-e2e-demo', imgHtml);
  const n = await import('/ios-desktop/js/notifications.js');
  n.addSystemNotification({ id: 'pkg-e2e-n1', app: 'E2E 包应用', appId: 'pkg-e2e-demo', iconSvg: '', title: '包应用通知', desc: '应显示包应用本体图标', time: '刚刚', category: '应用通知 / App Notifications' });
  await new Promise((r) => setTimeout(r, 120));
  const barIcon = document.querySelector('.status-noti-icons .noti-st-icon[data-noti-id="pkg-e2e-n1"]');
  return {
    barIconExists: !!barIcon,
    barIconIsAppIcon: barIcon ? barIcon.innerHTML.indexOf('#7c4dff') !== -1 : false,
    barIconSvgSized: barIcon ? barIcon.querySelector('svg') !== null : false,
  };
});
console.log('pkg noti icon:', JSON.stringify(pkgResult));
await page.screenshot({ path: `${OUT}/4-statusbar-pkg-icon.png` });
// 通知中心面板
await page.evaluate(async () => {
  const n = await import('/ios-desktop/js/notifications.js');
  void n;
  const panel = document.querySelector('.pull-panels-overlay');
  if (panel && !panel.classList.contains('active')) {
    // 打开通知面板（若桥存在）
    if (window.__pullPanelsDebug && window.__pullPanelsDebug.openNoti) window.__pullPanelsDebug.openNoti();
  }
});
await page.waitForTimeout(600);
const centerIcon = await page.evaluate(() => {
  const card = document.querySelector('.noti-card[data-id="pkg-e2e-n1"]');
  if (!card) return { found: false };
  const icon = card.querySelector('.noti-card-icon');
  return { found: true, isAppVariant: icon.classList.contains('noti-card-icon--app'), hasAppFill: icon.innerHTML.indexOf('#7c4dff') !== -1 };
});
console.log('center icon:', JSON.stringify(centerIcon));
await page.screenshot({ path: `${OUT}/5-noti-center-pkg-icon.png` });

await browser.close();
console.log('E2E DONE');
