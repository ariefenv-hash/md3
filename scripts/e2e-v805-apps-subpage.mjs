// e2e-v805-apps-subpage.mjs — v8.05 #23 差距矩阵③回审计 E2E 核验
// ① 一级菜单应用行 → 页 6（宽栏双栏 tp-hosted 路径）
// ② 页 6 权威结构：最近打开的应用分区（≤4 行 AppPreference）+ see_all_apps 动态复数标题
//    + 默认应用（ListFormatter 摘要）+ 闲置应用（计数摘要）+ 特殊应用权限
// ③ 运行时互斥：recent 区非空 → all_app_infos 隐藏（refreshUi 同构）
// ④ 最近序单一真源：recordAppOpened 真实开窗链（开另一应用 → 回设置页页 6 最近序变化）
// ⑤ 隐藏区零渲染：克隆应用/联系人存储/应用的电池使用情况/宽高比不在 DOM（config 双证）
// ⑥ Web 扩展卡保留（铁律#2）：卸载/恢复卡 + 合法超越徽标
// ⑦ 零 pageerror + 截图三张落盘 docs/v805/
//
// 用法：MD3_BASE=http://127.0.0.1:8081/ios-desktop/index.html?nolock=1 node scripts/e2e-v805-apps-subpage.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/md3-repo/docs/v805';
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

// ① 打开设置 → 宽栏双栏
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(2000); // 覆盖 app-window 650ms defer recordAppOpened（settings 进最近列表）

// ② 左栏应用行（idx 6）
const appsRow = await page.evaluate(() => {
  const row = document.querySelector('.tp-row[data-tp-key="apps"]');
  return row ? { label: row.querySelector('.tp-row-label, .tp-row-title')?.textContent.trim(), tp: row.dataset.tp } : null;
});
check('应用行存在于左栏且 data-tp=6', !!appsRow && appsRow.tp === '6', JSON.stringify(appsRow));

// 点行 → 右栏打开页 6
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="apps"]').click());
await sleep(1400);

// 桌面已安装拍平计数（测试侧独立按同一语义计算，与页内渲染对账）
const expected = await page.evaluate(() => {
  const map = {};
  const st = window.__state;
  st.pagesApps.forEach((pg) => (pg || []).forEach((a) => {
    if (!a || !a.id || map[a.id]) return;
    if (a.type === 'folder') { (a.apps || []).forEach((x) => { if (x && x.id && !map[x.id]) map[x.id] = x; }); return; }
    map[a.id] = a;
  }));
  const ids = Object.keys(map);
  const recent = window.__settingsAppsBridge.recent();
  const recentSet = {};
  recent.forEach((id) => { recentSet[id] = 1; });
  return { count: ids.length, recent, hibernated: ids.filter((id) => !recentSet[id]).length };
});

const p6 = await page.evaluate(() => {
  const pageEl = document.getElementById('app-page-settings-6');
  if (!pageEl) return null;
  const txt = pageEl.textContent;
  const qTest = (t) => !!pageEl.querySelector(`[data-test="${t}"]`);
  const recentRows = [...pageEl.querySelectorAll('[data-test="apps-recent-row"]')];
  return {
    mounted: true,
    hosted: !!pageEl.classList.contains('tp-hosted'),
    title: txt.includes('应用') && txt.includes('最近打开的应用、默认应用、闲置应用（AOSP AppDashboardFragment）'),
    secRecent: txt.includes('最近打开的应用'),
    rRecentRows: recentRows.map((r) => r.dataset.appId),
    rSeeAll: qTest('apps-see-all') && (pageEl.querySelector('#appsSeeAllTitle')?.textContent || ''),
    rAllInfoHidden: (pageEl.querySelector('[data-test="apps-all-info"]')?.style.display || '') === 'none',
    rDefault: qTest('apps-default-apps') && (pageEl.querySelector('#appsDefaultSub')?.textContent || ''),
    rHibernated: qTest('apps-hibernated') && (pageEl.querySelector('#appsUnusedSub')?.textContent || ''),
    rSpecial: qTest('apps-special-access') && txt.includes('特殊应用权限'),
    // 隐藏区零渲染（config 双证项不出现在 DOM 文本）
    noCloned: !txt.includes('克隆应用'),
    noContacts: !txt.includes('联系人存储'),
    noBatteryUsage: !txt.includes('应用的电池使用情况'),
    noAspectRatio: !txt.includes('宽高比'),
    // Web 扩展卡
    mgmt: qTest('apps-mgmt') && !!pageEl.querySelector('#installedAppsList'),
    mgmtBadge: txt.includes('Web 扩展 · 合法超越'),
    mgmtCards: pageEl.querySelectorAll('#installedAppsList .md3-card').length,
  };
});
check('页 6 挂载（栈页被双栏移动 hosted）', !!p6 && p6.mounted && p6.hosted, String(!!p6 && p6.hosted));
check('页 6 标题「应用」+ 副题', !!p6 && p6.title);
check('「最近打开的应用」分区头渲染', !!p6 && p6.secRecent);
check('最近行 ≤4 且 id ⊆ __settingsAppsBridge.recent() 过滤后集合', !!p6 && p6.rRecentRows.length >= 1 && p6.rRecentRows.length <= 4 &&
  p6.rRecentRows.every((id) => expected.recent.includes(id)), JSON.stringify({ rows: p6?.rRecentRows, bridge: expected.recent.slice(0, 6) }));
check('see_all 标题 ICU 复数「查看所有 N 个应用」（N=已安装计数对账）', !!p6 && p6.rSeeAll === '查看所有 ' + expected.count + ' 个应用',
  JSON.stringify({ got: p6?.rSeeAll, want: '查看所有 ' + expected.count + ' 个应用' }));
check('运行时互斥：最近区非空 → all_app_infos 隐藏', !!p6 && p6.rAllInfoHidden);
check('default_apps 摘要 = ListFormatter「浏览器、电话和信息」（RoleManager 三角色）', !!p6 && p6.rDefault === '浏览器、电话和信息', JSON.stringify(p6?.rDefault));
check('hibernated 摘要「N 个闲置应用」（已安装−最近交集对账）', !!p6 && p6.rHibernated === expected.hibernated + ' 个闲置应用', JSON.stringify({ got: p6?.rHibernated }));
check('special_access 恒渲染「特殊应用权限」', !!p6 && p6.rSpecial);
check('隐藏区零渲染（克隆应用/联系人存储/应用的电池使用情况/宽高比）', !!p6 && p6.noCloned && p6.noContacts && p6.noBatteryUsage && p6.noAspectRatio);
check('Web 扩展卡保留 + 徽标 + 卸载卡清单渲染', !!p6 && p6.mgmt && p6.mgmtBadge && p6.mgmtCards > 0, JSON.stringify({ cards: p6?.mgmtCards }));
await page.screenshot({ path: `${OUT}/p6-apps-page.png` });

// ④ 最近序真实验：打开相册 → recordAppOpened（650ms defer）→ 回设置页 6 → 最近序第一应变为 photo
await page.evaluate(() => document.querySelector('.app-icon[data-id="photo"]').click());
await sleep(1800); // 覆盖 650ms defer
await page.evaluate(() => { const b = document.querySelector('.app-icon[data-id="settings"]'); if (b) b.click(); });
await sleep(1600);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="apps"]').click());
await sleep(1200);
const recentTop = await page.evaluate(() => {
  const pageEl = document.getElementById('app-page-settings-6');
  return pageEl ? [...pageEl.querySelectorAll('[data-test="apps-recent-row"]')].map((r) => r.dataset.appId) : null;
});
check('最近序真实验：开相册后回页 6 → photo 从原位 4 升至第 2（settings 重开占据首位=recordAppOpened 单源忠实行为）',
  Array.isArray(recentTop) && recentTop[0] === 'settings' && recentTop[1] === 'photo', JSON.stringify(recentTop));
await page.screenshot({ path: `${OUT}/p6-recent-reorder.png` });

// 分区特写（最近区 → 默认应用 → 闲置应用 → 特殊应用权限）
const clip = await page.evaluate(() => {
  const first = document.querySelector('#app-page-settings-6 [data-test="apps-recent-category"]');
  const last = document.querySelector('#app-page-settings-6 [data-test="apps-special-access"]');
  if (!first || !last) return null;
  last.scrollIntoView({ block: 'center' });
  const a = first.getBoundingClientRect(), b = last.getBoundingClientRect();
  return { top: a.top, height: b.bottom - a.top };
});
await sleep(400);
if (clip && clip.height > 0) {
  await page.screenshot({ path: `${OUT}/p6-panels-closeup.png`, clip: { x: 640, y: Math.max(0, clip.top - 8), width: 640, height: Math.min(780, clip.height + 16) } });
}

// ⑦ 零 pageerror
check('零 pageerror', pageErrors === 0, String(pageErrors));

await browser.close();
log(`\n${failures === 0 ? 'ALL PASS' : 'FAILURES: ' + failures}`);
process.exit(failures === 0 ? 0 : 1);
