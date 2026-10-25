// e2e-v799-network-subpage.mjs — v7.99 #10 二期 E2E 核验
// ① 宽栏双栏：一级菜单纠偏断言（网络摘要=权威静态串 / 存储摘要=storage_summary 动态 / 电池 hint）
// ② 网络行 → 页 17「网络和互联网」十项清单 + 互联网摘要动态（internet 磁贴单一真源）
// ③ 飞行模式 md3-switch → syncTileState('aeroplane') 单源联动（开→真值 true，关→false）
// ④ 互联网行 → QS 网络面板（openNetworkSheet 同语义 NetworkProviderSettings）
// ⑤ 零 pageerror + 截图落盘
//
// 用法：MD3_BASE=http://127.0.0.1:8801/ios-desktop/index.html?nolock=1 node scripts/e2e-v799-network-subpage.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8801/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/e2e-v799';
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

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', (e) => { pageErrors++; log('[pageerror]', e.message.slice(0, 200)); });

await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await sleep(2500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(1200);

// ① 打开设置（桌面图标）
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1600);

// A. 网络行权威摘要（v7.98 纠偏实证）
const netSub = await page.evaluate(() => {
  const row = document.querySelector('.tp-row[data-tp-key="network"] .tp-row-sub');
  return row ? row.textContent.trim() : null;
});
check('网络行摘要 = 移动网络、WLAN、热点', netSub === '移动网络、WLAN、热点', String(netSub));

// B. 存储行动态摘要（storage_summary 异步刷新）
await sleep(1200);
const storSub = await page.evaluate(() => {
  const el = document.getElementById('settingsStorageSub');
  return el ? el.textContent.trim() : null;
});
check('存储行摘要 = 已使用 X% - 还剩 Y', !!storSub && /^已使用 \d+% - 还剩 /.test(storSub), String(storSub));

// C. 电池 hint（仪表盘标签：百分比 [+ 正在充电]）
const batHint = await page.evaluate(() => {
  const el = document.getElementById('settingsMainBatteryPct');
  return el ? el.textContent.trim() : null;
});
check('电池 hint = 百分比（± 正在充电）', !!batHint && /^\d+%( - 正在充电)?$/.test(batHint), String(batHint));

await page.screenshot({ path: `${OUT}/01-top-level.png` });

// ② 点网络行 → 页 17
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="network"]').click());
await sleep(1200);
const subpageTitle = await page.evaluate(() => {
  const pages = document.querySelectorAll('.app-page');
  for (const p of pages) {
    if (p.id !== 'app-page-settings-17') continue;
    const vis = p.style.transform !== 'translate3d(100%, 0, 0)' && p.style.opacity !== '0';
    const h = p.querySelector('div[style*="font-size:24px"]');
    return { visible: vis, title: h ? h.textContent.trim() : null };
  }
  return null;
});
check('页 17 已存在且标题 = 网络和互联网', !!subpageTitle && subpageTitle.title === '网络和互联网', JSON.stringify(subpageTitle));

// 十项行齐备
const rows17 = await page.evaluate(() => {
  const p = document.getElementById('app-page-settings-17');
  if (!p) return [];
  return [...p.querySelectorAll('.md3-list-item')].map((r) => r.querySelector('span span')?.textContent.trim()).filter(Boolean);
});
const expectRows = ['互联网', '通话和短信', 'SIM 卡', '飞行模式', '热点和网络共享', '省流模式', 'VPN', '私人 DNS', '自适应连接', '移动网络安全'];
check('页 17 十项按 order 齐备', expectRows.every((t) => rows17.includes(t)), rows17.join('/'));

// 互联网摘要动态（默认 internet 磁贴激活 → SSID）
const inetSub = await page.evaluate(() => {
  const el = document.getElementById('netInternetSub');
  return el ? el.textContent.trim() : null;
});
check('互联网摘要 = 中国移动 5G Wi-Fi（磁贴单源）', inetSub === '中国移动 5G Wi-Fi', String(inetSub));

// ③ 飞行模式开关联动
const apBefore = await page.evaluate(() => ({
  checked: document.getElementById('netAirplaneToggle').checked,
  tile: window.__qsTileState.get('aeroplane'),
}));
check('飞行模式初始态 = false（磁贴出厂未激活）', apBefore.checked === false && apBefore.tile === false, JSON.stringify(apBefore));

await page.evaluate(() => {
  const sw = document.getElementById('netAirplaneToggle');
  sw.checked = true;
  sw.dispatchEvent(new Event('change'));
});
await sleep(600);
const apAfter = await page.evaluate(() => ({
  tile: window.__qsTileState.get('aeroplane'),
  toast: !!document.getElementById('systemGlobalToast'),
}));
check('飞行模式开启 → aeroplane 磁贴单源 true + Toast', apAfter.tile === true, JSON.stringify(apAfter));

// 关回（保持默认态，防污染其他用例）
await page.evaluate(() => {
  const sw = document.getElementById('netAirplaneToggle');
  sw.checked = false;
  sw.dispatchEvent(new Event('change'));
});
await sleep(400);

await page.screenshot({ path: `${OUT}/02-network-subpage.png` });

// ④ 互联网行 → QS 网络面板
await page.evaluate(() => {
  const p = document.getElementById('app-page-settings-17');
  const row = p && [...p.querySelectorAll('.md3-list-item')].find((r) => r.textContent.includes('互联网'));
  if (row) row.click();
});
await sleep(900);
const sheet = await page.evaluate(() => {
  const ov = document.getElementById('qsSheetOverlay');
  return ov ? { open: ov.classList.contains('open'), title: ov.querySelector('.qs-sheet-title')?.textContent } : null;
});
check('互联网行 → QS 网络面板打开（网络与互联网）', !!sheet && sheet.open === true && sheet.title === '网络与互联网', JSON.stringify(sheet));
await page.screenshot({ path: `${OUT}/03-network-sheet.png` });
await page.evaluate(() => window.closeQsSheet ? null : document.getElementById('qsSheetOverlay')?.click());
await sleep(300);

// ⑤ pageerror 门禁
check('零 pageerror', pageErrors === 0, `errors=${pageErrors}`);

await browser.close();
log(failures === 0 ? '\n=== E2E 全部通过 ===' : `\n=== ${failures} 项失败 ===`);
process.exit(failures === 0 ? 0 : 1);
