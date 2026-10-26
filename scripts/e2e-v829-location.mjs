// ==================== e2e-v829-location.mjs — #22⑦ 位置信息三页无头回归 ====================
//
// DoD：
//   A. 页 24 = location_settings.xml 1:1：SwitchBar「使用位置信息」（默认开）+ recent 分区
//      MAX_APPS=3（地图/天气/相机 + 相对时间摘要）+ 摘要 plural other + footer 双形态
//   B. 总开关联动链：关 → recent 组隐藏 + 摘要「位置信息服务已关闭」+ footer off 文案 +
//      localStorage settings:location-v1 持久化；再开 → 全部恢复
//   C. 查看全部 → 页 25 全量 6 行（RecentLocationAccessSeeAllFragment 同构）
//   D. 位置信息服务 → 页 26 WLAN/蓝牙扫描双行 + 开关持久化
//   E. reload 后状态恢复（设置态单一真源）+ 零 pageerror
//
// 驱动：真实导航（解锁 → settings 图标 → tp-row location）。420px 窄栏语义，
// 子页跳转 pushSubPage（窄栏栈语义；宽容器三级保宽+右栏托管，#53 v8.28 新语义）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v829');
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
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);
await page.evaluate(() => window.__themeModeTest.set('dark'));
await sleep(200);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1100);

// ---------- A. 页 24 主形态 ----------
console.log('A. 页 24 主形态（location_settings.xml 1:1）');
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="location"]').click());
await sleep(900);

const p24 = await page.evaluate(() => {
  const byId = (id) => document.getElementById(id);
  const sw = byId('locMainSwitch');
  const group = byId('locRecentGroup');
  const rows = group ? [...group.querySelectorAll('.md3-list-item')] : [];
  const names = rows.map((r) => {
    const t = r.querySelector('span span');
    return t ? t.textContent : '';
  }).filter(Boolean);
  return {
    title: (document.querySelector('.app-page') || document.body).textContent.includes('位置信息'),
    swFound: !!sw, swOn: sw ? sw.checked : null,
    swLabel: document.body.textContent.includes('使用位置信息'),
    groupDisplay: group ? getComputedStyle(group).display : null,
    recentNames: names,
    hasSeeAll: document.body.textContent.includes('查看全部'),
    permSum: byId('locAppPermSum') ? byId('locAppPermSum').textContent : '',
    footer: byId('locFooter') ? byId('locFooter').textContent : '',
    recentTime: byId('locRecentMain') ? byId('locRecentMain').textContent : '',
  };
});
A('A1 页 24 打开（标题「位置信息」）', p24.title);
A('A2 SwitchBar「使用位置信息」+ 默认开', p24.swFound && p24.swOn === true && p24.swLabel, `checked=${p24.swOn}`);
A('A3 recent 主列表 MAX_APPS=3：地图/天气/相机', p24.recentNames.length >= 3 &&
  ['地图', '天气', '相机'].every((n) => p24.recentNames.slice(0, 3).includes(n)), p24.recentNames.join(','));
A('A4 recent 行相对时间摘要（分钟前/小时前/天前）', /[0-9]+ 分钟前|[0-9]+ 小时前|[0-9]+ 天前/.test(p24.recentTime));
A('A5 摘要 plural other：「6 个应用（共 32 个应用）有权获取位置信息」',
  p24.permSum === '6 个应用（共 32 个应用）有权获取位置信息', p24.permSum);
A('A6 footer on 文案逐字', p24.footer === '具有附近设备权限的应用可以确定已连接设备的相对位置。');
A('A7 查看全部行在位', p24.hasSeeAll);
await page.screenshot({ path: join(OUT, 'a-location-main.png') });

// ---------- B. 总开关联动链 ----------
console.log('B. 总开关联动链（关 → 三联动 + 持久化；开 → 恢复）');
await page.evaluate(() => document.getElementById('locMainSwitch').click());
await sleep(400);
const pOff = await page.evaluate(() => {
  const group = document.getElementById('locRecentGroup');
  return {
    checked: document.getElementById('locMainSwitch').checked,
    groupDisplay: group ? getComputedStyle(group).display : null,
    permSum: document.getElementById('locAppPermSum').textContent,
    footer: document.getElementById('locFooter').textContent,
    store: JSON.parse(localStorage.getItem('settings:location-v1') || '{}'),
  };
});
A('B1 开关关闭', pOff.checked === false);
A('B2 recent 组隐藏（setVisible(enabled) 同构）', pOff.groupDisplay === 'none', `display=${pOff.groupDisplay}`);
A('B3 摘要切关态「位置信息服务已关闭」', pOff.permSum === '位置信息服务已关闭');
A('B4 footer 切 off 文案（紧急呼叫例外语义逐字）', pOff.footer === '应用和服务的位置信息使用权处于关闭状态。在您拨打紧急电话号码或向该号码发送短信时，系统可能仍会将您的设备位置信息发送给紧急救援人员。');
A('B5 localStorage enabled=false 持久化', pOff.store.enabled === false, JSON.stringify(pOff.store));

await page.evaluate(() => document.getElementById('locMainSwitch').click());
await sleep(400);
const pOn = await page.evaluate(() => ({
  checked: document.getElementById('locMainSwitch').checked,
  groupDisplay: getComputedStyle(document.getElementById('locRecentGroup')).display,
  permSum: document.getElementById('locAppPermSum').textContent,
  store: JSON.parse(localStorage.getItem('settings:location-v1') || '{}'),
}));
A('B6 再开恢复：组显 + 摘要回 on 态 + 持久化', pOn.checked === true && pOn.groupDisplay !== 'none' &&
  pOn.permSum === '6 个应用（共 32 个应用）有权获取位置信息' && pOn.store.enabled === true);

// ---------- C. 查看全部 → 页 25 ----------
console.log('C. 查看全部 → 页 25 全量列表');
// 多容器常驻架构（page-stack 预渲染全 pages，栈显隐）：行 textContent 含 chevron「›」+换行，
// find 须 includes 语义；页面切换证据 = #appTitle 切栈顶页标题（updateNavHeader 同构）
const seeAllRow = await page.evaluate(() => {
  // 限定页 24 容器：全文档预渲染下页 18（已连接的设备）也有「查看全部」行（v8.00 see_all
  // saved/fast_pair 两处），文档序先于页 24 —— 不限定会误点页 18 行
  const page24 = [...document.querySelectorAll('.app-page')].find((p) => p.querySelector('#locRecentGroup'));
  const rows = page24 ? [...page24.querySelectorAll('.md3-list-item')] : [];
  const r = rows.find((x) => x.textContent.includes('查看全部'));
  if (r) r.click();
  return !!r;
});
await sleep(900);
const p25 = await page.evaluate(() => {
  const all = document.getElementById('locRecentAll');
  const rows = all ? [...all.querySelectorAll('.md3-list-item')] : [];
  const names = rows.map((r) => { const t = r.querySelector('span span'); return t ? t.textContent : ''; });
  return { count: rows.length, names, title: document.getElementById('appTitle').textContent };
});
A('C1 查看全部行点击跳转（#appTitle 切栈顶页标题）', seeAllRow && p25.count > 0 && p25.title === '近期位置信息访问', `count=${p25.count} title=${p25.title}`);
A('C2 全量 6 行（无 MAX_APPS 截断）：+ 通讯录/时钟/文件', p25.count === 6 &&
  ['通讯录', '时钟', '文件'].every((n) => p25.names.includes(n)), p25.names.join(','));

// ---------- D. 位置信息服务 → 页 26 ----------
console.log('D. 位置信息服务 → 页 26（location_services.xml 1:1）');
await page.evaluate(() => window.popSubPage());
await sleep(900);
const svcRow = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.md3-list-item')];
  const r = rows.find((x) => x.textContent.replace(/[›\s]/g, '') === '位置信息服务');
  if (r) r.click();
  return !!r;
});
await sleep(900);
const p26 = await page.evaluate(() => ({
  title: document.getElementById('appTitle').textContent,
  wifi: !!document.getElementById('locWifiScan'),
  bt: !!document.getElementById('locBtScan'),
  wifiOn: document.getElementById('locWifiScan') ? document.getElementById('locWifiScan').checked : null,
  wifiLabel: document.body.textContent.includes('WLAN 扫描'),
  btLabel: document.body.textContent.includes('蓝牙扫描'),
}));
A('D1 页 26 打开：WLAN 扫描 + 蓝牙扫描双行（#appTitle 同证）', svcRow && p26.wifi && p26.bt && p26.wifiLabel && p26.btLabel && p26.title === '位置信息服务', `title=${p26.title}`);
A('D2 双开关默认开（AOSP 出厂默认）', p26.wifiOn === true);
await page.evaluate(() => document.getElementById('locWifiScan').click());
await sleep(300);
const p26off = await page.evaluate(() => ({
  checked: document.getElementById('locWifiScan').checked,
  store: JSON.parse(localStorage.getItem('settings:location-v1') || '{}'),
}));
A('D3 WLAN 扫描关闭 + wifiScanning=false 持久化', p26off.checked === false && p26off.store.wifiScanning === false, JSON.stringify(p26off.store));
await page.screenshot({ path: join(OUT, 'b-location-services.png') });

// ---------- E. reload 状态恢复（设置态单一真源） ----------
console.log('E. reload 状态恢复');
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1100);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="location"]').click());
await sleep(900);
const pRe = await page.evaluate(() => ({
  mainOn: document.getElementById('locMainSwitch').checked,
  wifiOn: document.getElementById('locWifiScan') ? document.getElementById('locWifiScan').checked : null,
  groupVisible: getComputedStyle(document.getElementById('locRecentGroup')).display !== 'none',
}));
A('E1 reload 后总开关仍开（enabled=true 持久化）', pRe.mainOn === true && pRe.groupVisible);
A('E2 reload 后 WLAN 扫描仍关（wifiScanning=false 持久化）', pRe.wifiOn === false);

A('Z1 零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n==== e2e-v829: ${pass} PASS / ${fail} FAIL ====`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
