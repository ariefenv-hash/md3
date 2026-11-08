// scripts/e2e-v215-files-refactor.mjs — #215 文件应用二级菜单重构无头专项探针（R136 窗）
// 口径：真实 UI 路径（browse tab → FAB 建目录 → 目录行 ⋮ → sheet 门控 → 详情 → Recents → 子页 ⋮ 排序视图）
// 断言：目录操作菜单可达 / export-share hasDir 门控 / 目录详情 / Recents 子页 / 子页排序视图 / action mode 四键 DOM / 全程零 pageerror
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const BASE = process.env.MD3_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
let pass = 0, fail = 0; const fails = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; fails.push(name + (extra ? ' :: ' + extra : '')); console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}

// e2e-dist-smoke 同款：playwright 版本漂移兜底，固定可用 chromium 二进制
const EXE_CANDIDATES = [process.env.MD3_CHROME, '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'].filter(Boolean);
const launchOpts = { headless: true };
for (const c of EXE_CANDIDATES) if (existsSync(c)) { launchOpts.executablePath = c; break; }
const browser = await chromium.launch(launchOpts);
const clickEl = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, sel);
const page = await browser.newPage({ viewport: { width: 900, height: 700 } }); // ≥620 平板态 rail 可见
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('[console.error] ' + m.text()); });

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForSelector('.fj-app', { timeout: 20000 }).catch(() => {});
// files 图标真实路径打开（sweep 同款选择器）
const icon = page.locator('.app-icon[data-id="files"]').first();
if (await icon.count()) await icon.click().catch(() => {});
await page.waitForSelector('.fj-app', { timeout: 15000 });
console.log('== T1 应用打开 ==');
check('T1-1 files 应用打开 .fj-app 在场', await page.locator('.fj-app').count() === 1);
check('T1-2 平板态 rail 可见（fj-wide）', await page.locator('.fj-app.fj-wide').count() === 1);
check('T1-3 rail 分类直达区在场', await page.locator('#fjRailCats .fj-rcat').count() >= 7); // 六分类 + 内部存储
check('T1-4 子页顶栏 ⋮ 在场（fjSubTools）', await page.locator('#fjSubTools').count() === 1);
check('T1-5 action mode 四键 DOM 齐备', await page.locator('#fjSelShare,#fjSelCopy,#fjSelMove,#fjSelDel').count() === 4);

console.log('== T2 目录操作菜单（主诉根治） ==');
// 切浏览 tab（平板态 rail 侧栏可见，navbar 隐藏；两选择器兼容）
const browseTab = page.locator('.fj-ritem[data-tab="2"],.fj-nitem[data-tab="2"]').first();
await clickEl('.fj-ritem[data-tab="2"]');
await clickEl('#fjFabLead');
await page.locator('#fjDlgInput').fill('探针目录A');
await clickEl('#fjDlgOk');
await page.waitForSelector('.fj-row[data-path="/探针目录A"]', { timeout: 5000 }).catch(() => {});
check('T2-1 目录创建成功并列出', await page.locator('.fj-row[data-path="/探针目录A"]').count() >= 1);
// 目录行尾 ⋮ → moreSheet
await clickEl('.fj-row[data-path="/探针目录A"] .fj-act[data-act="more"]');
await page.waitForSelector('#fjSheetWrap.on', { timeout: 5000 }).catch(() => {});
const sheetTxt = await page.locator('#fjSheet').innerText().catch(() => '');
check('T2-2 目录 ⋮ 弹出操作菜单', await page.locator('#fjSheetWrap.on').count() === 1);
check('T2-3 目录菜单含 复制到/移动到/重命名/详情/删除', ['复制到…', '移动到…', '重命名', '详情', '删除'].every((k) => sheetTxt.includes(k)));
check('T2-4 目录菜单 hasDir 门控：无 导出到电脑/分享', !sheetTxt.includes('导出到电脑') && !sheetTxt.includes('分享'));
// 目录详情
await clickEl('#fjSheet [data-m="details"]');
const detTxt = await page.locator('#fjSheet').innerText().catch(() => '');
check('T2-5 目录详情：类型=文件夹 + 包含 N 项', detTxt.includes('文件夹') && detTxt.includes('包含'));
await page.locator('.fj-mscrim').click().catch(() => {}); // 关 sheet

console.log('== T3 子页能力对齐 ==');
// 首页「查看全部」→ Recents
await clickEl('.fj-ritem[data-tab="0"]');
await clickEl('[data-open-recent]');
await page.waitForSelector('#fjSub.on', { timeout: 5000 }).catch(() => {});
check('T3-1 Recents 子页打开且标题=最近', (await page.locator('#fjSubTitle').innerText().catch(() => '')) === '最近');
// 子页 ⋮ → 排序与视图 → 切网格
await clickEl('#fjSubTools');
const svTxt = await page.locator('#fjSheet').innerText().catch(() => '');
check('T3-2 子页 ⋮ 弹出排序与视图（方向标注在册）', svTxt.includes('排序与视图') && (svTxt.includes('升序') || svTxt.includes('降序')));
await clickEl('#fjSheet [data-v="grid"]');
check('T3-3 子页网格视图生效（fj-gwrap）', await page.locator('#fjSubBody .fj-gwrap').count() >= 1);
// 返回（预览式返回桥 canBack 语义不受影响）
await clickEl('#fjSubBack');
await page.waitForTimeout(420); // closeSub 290ms 关闭动画摘牌 + 余量
check('T3-4 子页返回桥正常关闭', await page.locator('#fjSub.on').count() === 0);

console.log('== T4 全局 ==');
check('T4-1 全程零 pageerror / console.error', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

await browser.close();
console.log(`\n[e2e-v215] 探针 ${pass + fail} 项：pass=${pass} fail=${fail}`);
if (fail) { console.log('FAILED: ' + fails.join(' ; ')); process.exit(1); }
