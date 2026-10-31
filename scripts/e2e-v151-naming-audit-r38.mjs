// v9.01 = #120 应用层 iOS 遗产命名审计（R38 轮）无头回归小判据：
// ①桌面页 1 图标标签五名在场（Meet/查找我的设备/Google 钱包/Fit/邮件）+ 旧 iOS 名零残留
// ②四应用 openApp 窗口标题对齐新名 ③terminal resolveTarget 新旧双通道 ④应用抽屉分节落位
// ⑤K 零 pageerror 全程
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

// A. 桌面页 1 图标标签（desktop.js `<span>${app.name}</span>` 渲染）
const labels = await page.evaluate(() => {
  const spans = Array.from(document.querySelectorAll('.icon-box ~ span, #appGrid span, .app-icon span'));
  return spans.map(s => (s.textContent || '').trim()).filter(Boolean);
});
const has = (arr, s) => arr.includes(s);
t('A1 桌面标签 Meet 在场', has(labels, 'Meet'));
t('A2 桌面标签 查找我的设备 在场', has(labels, '查找我的设备'));
t('A3 桌面标签 Google 钱包 在场', has(labels, 'Google 钱包'));
t('A4 桌面标签 Fit 在场', has(labels, 'Fit'));
t('A5 桌面标签 邮件 在场（标超越保留）', has(labels, '邮件'));
t('A6 旧 iOS 名 FaceTime 零残留', !labels.includes('FaceTime'));
t('A7 旧 iOS 名 健康/钱包/查找（精确名）零残留', !labels.includes('健康') && !labels.includes('钱包') && !labels.includes('查找'));

// B. 四应用 openApp 窗口标题（closeApp 正式 API 收场，防窗体残留阻抽屉）
const openAndGetHeader = async (id) => {
  return page.evaluate(async (appId) => {
    const { initialApps } = await import('/ios-desktop/js/apps-data.js');
    const { openApp, closeApp } = await import('/ios-desktop/js/app-window.js');
    const idx = initialApps.findIndex(a => a.id === appId);
    if (idx === -1) return { idx, header: '' };
    openApp(idx);
    await new Promise(r => setTimeout(r, 900));
    const win = document.querySelector('.app-window:not([style*="display: none"]) .app-header');
    const header = win ? (win.textContent || '').trim().slice(0, 60) : '';
    closeApp();
    await new Promise(r => setTimeout(r, 700));
    return { idx, header };
  }, id);
};
const ft = await openAndGetHeader('facetime');
t('B1 facetime 窗口标题含 Meet', ft.header.includes('Meet'), ft.header);
const fm = await openAndGetHeader('findmy');
t('B2 findmy 窗口标题含 查找我的设备', fm.header.includes('查找我的设备'), fm.header);
const fmRows = await page.evaluate(() => (document.querySelector('.app-window:not([style*="display: none"])') || {}).textContent || '');
t('B3 设备列表 MacBook Pro → Chromebook Plus', fmRows.includes('Chromebook Plus') && !fmRows.includes('MacBook'), '');
const wl = await openAndGetHeader('wallet');
t('B4 wallet 窗口标题含 Google 钱包', wl.header.includes('Google 钱包'), wl.header);
const hl = await openAndGetHeader('health');
t('B5 health 窗口标题含 Fit', hl.header.includes('Fit'), hl.header);

// C. terminal resolveTarget 新旧双通道（terminal-core 为懒加载经典脚本，注入后挂 __terminalCore）
await page.addScriptTag({ url: '/ios-desktop/js/terminal-core.js' });
const term = await page.evaluate(() => {
  const core = window.__terminalCore;
  if (!core) return null;
  const r = (s) => { try { const x = core.resolveTarget(s); return x ? `${x.id}:${x.name}` : null; } catch { return null; } };
  return {
    meet: r('Meet'), faceLegacy: r('FaceTime'), findNew: r('查找我的设备'), findOld: r('查找'),
    walletNew: r('Google 钱包'), walletOld: r('钱包'), fit: r('Fit'), fitOld: r('健康'),
  };
});
t('C1 resolveTarget(Meet)→facetime', term && term.meet === 'facetime:Meet', String(term && term.meet));
t('C2 旧名 FaceTime 别名兼容', term && term.faceLegacy === 'facetime:Meet', String(term && term.faceLegacy));
t('C3 resolveTarget(查找我的设备)→findmy', term && term.findNew === 'findmy:查找我的设备', String(term && term.findNew));
t('C4 旧名 查找 别名兼容', term && term.findOld === 'findmy:查找我的设备', String(term && term.findOld));
t('C5 resolveTarget(Google 钱包)→wallet', term && term.walletNew === 'wallet:Google 钱包', String(term && term.walletNew));
t('C6 旧名 钱包 别名兼容', term && term.walletOld === 'wallet:Google 钱包', String(term && term.walletOld));
t('C7 resolveTarget(Fit)→health', term && term.fit === 'health:Fit', String(term && term.fit));
t('C8 旧名 健康 别名兼容', term && term.fitOld === 'health:Fit', String(term && term.fitOld));

// D. 应用抽屉条目渲染（sectionizeApps → .aa-item[data-app-id] + .aa-item-label）
await page.evaluate(() => { window.__allApps.open('e2e'); });
await sleep(800);
const items = await page.evaluate(() =>
  Array.from(document.querySelectorAll('#allAppsOverlay .aa-item')).map(el => ({
    id: el.dataset.appId,
    label: (el.querySelector('.aa-item-label') || el).textContent.trim(),
  }))
);
const itemOf = (id) => items.find(x => x.id === id);
t('D1 health → Fit', itemOf('health') && itemOf('health').label === 'Fit', String(itemOf('health') && itemOf('health').label));
t('D2 facetime → Meet', itemOf('facetime') && itemOf('facetime').label === 'Meet', String(itemOf('facetime') && itemOf('facetime').label));
t('D3 wallet → Google 钱包', itemOf('wallet') && itemOf('wallet').label === 'Google 钱包', String(itemOf('wallet') && itemOf('wallet').label));
t('D4 findmy → 查找我的设备', itemOf('findmy') && itemOf('findmy').label === '查找我的设备', String(itemOf('findmy') && itemOf('findmy').label));
t('D5 条目总数 45', items.length === 45, String(items.length));
await page.evaluate(() => { window.__allApps.close(); });

// K. 零 pageerror 全程
t('K1 全程零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log(`\n${pass}/${pass + fail} PASS`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
