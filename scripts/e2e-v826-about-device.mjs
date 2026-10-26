// ==================== e2e-v826-about-device.mjs — #48 无头回归 ====================
//
// DoD（议题 #48 验收标准）：
//   A. 关于手机页 8+ 项真实数据填充（不同设备打开显示不同——headless 环境即一组真实值）
//   B. 伪装链确定性：同设备数据 build/patch/kernel 恒定（双次刷新一致 + 跨页一致）
//   C. 优雅降级：IP 行 WebRTC 不可用/超时 →「未知」，各 API 缺失 →「未知」，零报错
//   D. AOSP 权威结构：四分区/渲染 8 行/隐藏行不渲染
//   E. Build 号连点链：7 次进开发者模式（show_dev_countdown → show_dev_on → show_dev_already）
//   F. 子页导航：型号→页 22 / Android 版本→页 23（pushSubPage 栈）
//   G. 零 pageerror + 截图 ×2
//
// 驱动：真实导航（解锁 → settings 图标 → about 行）。420px 窄格局（pushSubPage 页栈路径）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v826');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const txt = (page, sel) => page.evaluate((s) => {
  const el = document.getElementById(s);
  return el && el.isConnected ? el.textContent : null;
}, sel);

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
// device_name prompt 处理（DeviceNamePreferenceController dialog 的 Web 等价）
let promptAnswer = '我的测试设备';
page.on('dialog', (d) => { if (d.type() === 'prompt') d.accept(promptAnswer); else d.accept(); });

await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);
await page.evaluate(() => window.__themeModeTest.set('dark'));
await sleep(200);

// 连点链前置：清开发者模式持久化态（幂等）
await page.evaluate(() => { try { localStorage.removeItem('ios-desktop:development-settings-enabled'); } catch (e) {} });

await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1100);

// toast 捕获（替换 showSystemToast 记录序列）
await page.evaluate(() => {
  window.__toastLog = [];
  const orig = window.showSystemToast;
  window.showSystemToast = function (m) { window.__toastLog.push(String(m)); if (orig) try { orig.call(window, m); } catch (e) {} };
});

// ---------- 进入关于手机 ----------
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="about"]').click());
await sleep(900);

// 页栈 pageIdx 21 渲染？
const title21 = await page.evaluate(() => {
  const pages = document.querySelectorAll('.app-page');
  for (const p of pages) {
    if (p.id === 'app-page-settings-21') return p.querySelector('div[style*="font-size:24px"]')?.textContent || null;
  }
  return null;
});
A('T1 页 21 推入 + 标题「关于手机」', title21 === '关于手机', JSON.stringify(title21));

// ---------- A. 四分区 + 渲染 8 行 ----------
console.log('A. 页 21 分区/行结构（AOSP my_device_info）');
const struct21 = await page.evaluate(() => {
  const pg = document.getElementById('app-page-settings-21');
  if (!pg) return null;
  const heads = [];
  pg.querySelectorAll('div[style*="font-size:14px"][style*="font-weight:500"]').forEach((d) => heads.push(d.textContent.trim()));
  const rows = pg.querySelectorAll('.md3-list-item');
  const labels = [];
  rows.forEach((r) => { const el = r.querySelector('span[style*="font-size:15px"]'); if (el) labels.push(el.textContent.trim()); });
  return { heads, rows: rows.length, labels };
});
A('T2 四分区权威序', !!struct21 && JSON.stringify(struct21.heads) === JSON.stringify(['基本信息', '法律法规', '设备详细信息', '设备标识符']), JSON.stringify(struct21 && struct21.heads));
A('T3 渲染行恰 8（隐藏行不渲染）', struct21 && struct21.rows === 8, 'rows=' + (struct21 && struct21.rows));
A('T4 渲染行序 AOSP order', !!struct21 && JSON.stringify(struct21.labels) === JSON.stringify(['设备名称', '法律信息', '型号', 'Android 版本', '电池信息', 'IP 地址', '正常运行时间', 'Build 号']), JSON.stringify(struct21 && struct21.labels));

// ---------- B. 8+ 项真实数据 ----------
console.log('B. 数据填充（8+ 项，非空降级）');
await sleep(3400); // 等 WebRTC 探测 3s 超时窗收敛
const name = await txt(page, 'aboutDeviceName');
const model = await txt(page, 'aboutModelSub');
const os = await txt(page, 'aboutOsSub');
const batt = await txt(page, 'aboutBatterySub');
const ip = await txt(page, 'aboutIpSub');
const up = await txt(page, 'aboutUptimeSub');
const build = await txt(page, 'aboutBuildSub');
A('T5 设备名称非空（默认=型号派生）', !!name && name.length > 0, JSON.stringify(name));
A('T6 型号真实填充', !!model && model !== '', JSON.stringify(model));
A('T7 系统版本表述', !!os && os.length > 0, JSON.stringify(os));
A('T8 电池仪表盘标签（单一真源）', !!batt && /%/.test(batt), JSON.stringify(batt));
A('T9 IP 行优雅降级（IP/mDNS/未知 皆真值）', !!ip && ip.length > 0, JSON.stringify(ip));
A('T10 正常运行时间格式', !!up && /(秒|分钟|小时)/.test(up), JSON.stringify(up));
A('T11 Build 号 AOSP 格式 XXXX.YYMMDD.NNN', !!build && /^[AB]P[34]A\.[0-9]{6}\.[0-9]{3}$/.test(build), JSON.stringify(build));

// ---------- C. 确定性（双次刷新一致） ----------
console.log('C. 伪装链确定性');
await page.evaluate(() => window.__aboutV826 && window.__aboutV826.refresh());
await sleep(600);
const build2 = await txt(page, 'aboutBuildSub');
A('T12 双次刷新 build 恒定', build === build2, `${build} === ${build2}`);

// ---------- F1. 型号子页（页 22） ----------
console.log('F1. 页 22 型号（hardware_info + 浏览器扩展分区）');
await page.evaluate(() => {
  const pg = document.getElementById('app-page-settings-21');
  const rows = pg.querySelectorAll('.md3-list-item');
  for (const r of rows) { if (r.textContent.includes('型号')) { r.click(); break; } }
});
await sleep(900);
const hw = {};
for (const id of ['aboutHwModel', 'aboutHwScreen', 'aboutHwCores', 'aboutHwMemory', 'aboutHwEngine', 'aboutHwLocale', 'aboutHwStorage']) {
  hw[id] = await txt(page, id);
}
A('T13 页 22 六扩展行全部填充', Object.values(hw).every((v) => v && v.length > 0), JSON.stringify(hw));
A('T14 屏幕行含 dpr/色深', /dpr/.test(hw.aboutHwScreen) && /色深/.test(hw.aboutHwScreen), JSON.stringify(hw.aboutHwScreen));
A('T15 处理器核心「N 核」', /[0-9]+ 核|未知/.test(hw.aboutHwCores), JSON.stringify(hw.aboutHwCores));
await popBack(page);

// ---------- F2. Android 版本子页（页 23） ----------
console.log('F2. 页 23 Android 版本（firmware_version）');
await page.evaluate(() => {
  const pg = document.getElementById('app-page-settings-21');
  const rows = pg.querySelectorAll('.md3-list-item');
  for (const r of rows) { if (r.textContent.includes('Android 版本')) { r.click(); break; } }
});
await sleep(900);
const os23 = await txt(page, 'aboutOsVer');
const patch = await txt(page, 'aboutPatch');
const mod = await txt(page, 'aboutModule');
const kern = await txt(page, 'aboutKernel');
const build2p23 = await txt(page, 'aboutBuild2');
A('T16 os_firmware_version 填充', !!os23 && os23.length > 0, JSON.stringify(os23));
A('T17 补丁级别 YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(patch || ''), JSON.stringify(patch));
A('T18 Google Play 系统更新（Chrome 版本映射）', !!mod && /Chrome|Chromium/.test(mod), JSON.stringify(mod));
A('T19 内核版本 AOSP 格式', /^5\.15\.[0-9]+-android[0-9]+-[0-9]+-g[0-9a-f]{12}$/.test(kern || ''), JSON.stringify(kern));
A('T20 Build 跨页一致（seedOf 确定性）', build === build2p23, `${build} === ${build2p23}`);

// ---------- E. 连点链（返回页 21） ----------
await popBack(page);
await sleep(600);
console.log('E. Build 号连点链');
await page.evaluate(() => { window.__toastLog = []; try { localStorage.removeItem('ios-desktop:development-settings-enabled'); } catch (e) {} });
const buildRow = await page.evaluate(() => {
  const pg = document.getElementById('app-page-settings-21');
  const rows = pg.querySelectorAll('.md3-list-item');
  for (const r of rows) { if (r.textContent.includes('Build 号')) { r.click(); return true; } }
  return false;
});
await sleep(300);
await page.evaluate(() => {
  const pg = document.getElementById('app-page-settings-21');
  const rows = pg.querySelectorAll('.md3-list-item');
  for (let k = 0; k < 6; k++) { for (const r of rows) { if (r.textContent.includes('Build 号')) { r.click(); break; } } }
});
await sleep(400);
const toasts = await page.evaluate(() => window.__toastLog);
A('T21 连点 1 次 toast countdown(6)', toasts[0] === '现在只需再执行 6 步操作，即可进入开发者模式。', JSON.stringify(toasts[0]));
A('T22 连点 7 次终态 show_dev_on', toasts[6] === '您现在处于开发者模式！', JSON.stringify(toasts[6]));
const devKey = await page.evaluate(() => localStorage.getItem('ios-desktop:development-settings-enabled'));
A('T23 development_settings_enabled 持久化', devKey === '1');
await page.evaluate(() => {
  const pg = document.getElementById('app-page-settings-21');
  const rows = pg.querySelectorAll('.md3-list-item');
  for (const r of rows) { if (r.textContent.includes('Build 号')) { r.click(); break; } }
});
await sleep(250);
const toasts2 = await page.evaluate(() => window.__toastLog);
A('T24 已解锁态点击 show_dev_already', toasts2[toasts2.length - 1] === '您已处于开发者模式，无需进行此操作。', JSON.stringify(toasts2[toasts2.length - 1]));

// ---------- G. device_name 重命名 ----------
console.log('G. 设备名称重命名（prompt 等价）');
promptAnswer = '我的测试设备';
await page.evaluate(() => {
  const pg = document.getElementById('app-page-settings-21');
  const rows = pg.querySelectorAll('.md3-list-item');
  for (const r of rows) { if (r.textContent.includes('设备名称')) { r.click(); break; } }
});
await sleep(500);
const nameAfter = await txt(page, 'aboutDeviceName');
const nameStored = await page.evaluate(() => localStorage.getItem('ios-desktop:device-name'));
A('T25 prompt 重命名生效', nameAfter === '我的测试设备' && nameStored === '我的测试设备', JSON.stringify(nameAfter));

// ---------- 截图（重新推入：pop 回栈根 → about 行重进 21 截 page21 → 23 截 firmware） ----------
await page.evaluate(() => { window.popSubPage && window.popSubPage(); });
await sleep(900);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="about"]').click());
await sleep(1500);
await page.screenshot({ path: join(OUT, 'about-page21.png') }).catch(() => {});
await page.evaluate(() => {
  const pg = document.getElementById('app-page-settings-21');
  const rows = pg.querySelectorAll('.md3-list-item');
  for (const r of rows) { if (r.textContent.includes('Android 版本')) { r.click(); break; } }
});
await sleep(1500);
await page.screenshot({ path: join(OUT, 'about-firmware.png') }).catch(() => {});

// ---------- 零 pageerror ----------
A('T26 零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log(`\nRESULT: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);

async function popBack(pg) {
  await pg.evaluate(() => window.popSubPage && window.popSubPage());
  await sleep(600);
}
