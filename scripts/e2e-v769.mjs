// e2e-v769.mjs — v7.69 OPFS 存储引擎 + 文件应用全面增强 真实浏览器核验
// ① 引擎上场：__vfs.engine().opfs === true；写读回环落真 OPFS（geek-vfs 目录枚举实证）
// ② 存储卡：引擎徽章 OPFS 高亮 + 配额条填充 + 持久存储三态（徽章/按钮二选一可见）
// ③ 面包屑：browse→目录行→子页 crumbs（内部存储 › docs › nested），点根段回跳
// ④ 目录行元信息「N 项 · 体积」+ 网格目录计数徽标 gcnt
// ⑤ tab 共享轴：fj-nitem 切换后目标 screen 挂 fj-ax-l
// ⑥ 文本预览复制全文（clipboard-write 授权 → snack 已复制全文）
// ⑦ 备份导出含 opfs 段（download 拦截 → JSON 实证 data.opfs.files）
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const PORT = process.env.PORT || 8095;
const BASE = `http://localhost:${PORT}/ios-desktop/index.html?nolock=1`;
const OUT = '/home/z/my-project/e2e-v769';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({ args: ['--force-device-scale-factor=2'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://localhost:${PORT}` });
const page = await ctx.newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; log('[pageerror]', e.message.slice(0, 200)); });
// 预置权限：weather 定位 denied（v7.68 踩坑防弹窗）
await page.addInitScript(() => {
  try {
    const store = JSON.parse(localStorage.getItem('ios-desktop:permissions') || '{}');
    store.weather = Object.assign({ __name: '天气' }, store.weather, { location: false });
    localStorage.setItem('ios-desktop:permissions', JSON.stringify(store));
  } catch (e) {}
});

await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1400);

// ---------- ① 引擎上场 + 真 OPFS 落盘 ----------
log('--- ① OPFS engine engaged');
const eng1 = await page.evaluate(async () => {
  const V = window.__vfs;
  if (!V || !V.engine) return { vfs: false };
  await V.ready.catch(() => {});
  const eng = V.engine();
  const r = await V.write('/documents/opfs-e2e.txt', 'hello opfs v769', { owner: 'e2e' });
  const back = await V.readText('/documents/opfs-e2e.txt');
  // 真 OPFS 枚举（不经 vfs 封装，直读浏览器文件系统）
  let realNames = [];
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('geek-vfs');
    for await (const [name, h] of dir.entries()) if (h.kind === 'file') realNames.push(name);
  } catch (e) { realNames = ['ERR:' + e.message]; }
  const metaInIdb = !!window.indexedDB;
  return { vfs: true, eng, writeOk: r.ok, back, realNames, metaInIdb };
});
check('engine.opfs === true', eng1.vfs && eng1.eng && eng1.eng.opfs === true, JSON.stringify(eng1.eng || eng1));
check('write→readText 回环', eng1.writeOk === true && eng1.back === 'hello opfs v769', String(eng1.back));
check('真 OPFS geek-vfs 目录含扁平编码文件名', Array.isArray(eng1.realNames) && eng1.realNames.includes('%2Fdocuments%2Fopfs-e2e.txt'), (eng1.realNames || []).join(','));

// ---------- ② 打开文件应用：存储卡 ----------
log('--- ② files app storage card');
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="files"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});
await sleep(1600);
const card1 = await page.evaluate(async () => {
  await new Promise((r) => setTimeout(r, 500));
  const host = document.getElementById('fjHome');
  const badge = host && host.querySelector('.fj-engbadge');
  const fill = host && host.querySelector('.fj-quotafill');
  const qtext = host && host.querySelector('.fj-quotatext');
  const pBadge = host && host.querySelector('.fj-persistbadge');
  const pBtn = host && host.querySelector('.fj-persistbtn');
  return {
    badge: badge && badge.textContent,
    badgeOn: badge && badge.classList.contains('on'),
    fillW: fill ? fill.style.width : null,
    qtext: qtext && qtext.textContent,
    persistBadgeShown: pBadge && pBadge.style.display !== 'none',
    persistBtnShown: pBtn && pBtn.style.display !== 'none',
  };
});
check('引擎徽章 = OPFS 引擎 且高亮', card1.badge === 'OPFS 引擎' && card1.badgeOn === true, JSON.stringify(card1));
check('配额条已填充 + 中文摘要含「配额」', !!card1.fillW && parseFloat(card1.fillW) > 0 && /配额/.test(card1.qtext || ''), `w=${card1.fillW} ${card1.qtext}`);
check('持久存储三态（徽章 XOR 按钮）', card1.persistBadgeShown !== card1.persistBtnShown, `badge=${card1.persistBadgeShown} btn=${card1.persistBtnShown}`);
await page.screenshot({ path: `${OUT}/1-home-opfs-card.png` });

// ---------- ③ 面包屑 + 目录行元信息 ----------
log('--- ③ breadcrumbs + dir meta');
await page.evaluate(async () => {
  const V = window.__vfs;
  await V.mkdir('/docs/nested/structure').catch(() => {});
  await V.write('/docs/nested/structure/deep.txt', 'deep file', { owner: 'e2e' });
  await V.write('/docs/notes.txt', 'doc note', { owner: 'e2e' });
});
await sleep(400);
// 切浏览 tab（共享轴）
const axClass = await page.evaluate(() => {
  const b = document.querySelector('.fj-nitem[data-tab="2"]');
  if (!b) return null;
  b.click();
  const sc = document.getElementById('fjBrowse');
  return sc ? sc.className : null;
});
check('共享轴类挂上（fj-ax-l）', /fj-ax-l/.test(axClass || ''), String(axClass));
await sleep(700);
const browse1 = await page.evaluate(() => {
  const host = document.getElementById('fjBrowseList');
  const dirRow = host && host.querySelector('.fj-row[data-type="dir"]');
  return { found: !!dirRow, path: dirRow && dirRow.dataset.path, meta: dirRow && dirRow.querySelector('.s') && dirRow.querySelector('.s').textContent };
});
check('目录行元信息「N 项」', browse1.found && /项/.test(browse1.meta || ''), `${browse1.path} → ${browse1.meta}`);
// 点 docs 目录行下钻
await page.evaluate(() => {
  const row = [...document.querySelectorAll('#fjBrowseList .fj-row[data-type="dir"]')].find((r) => r.dataset.path === '/docs');
  if (row) row.click();
});
await sleep(600);
const crumb1 = await page.evaluate(() => {
  const sub = document.getElementById('fjSub');
  const crumbs = [...(sub ? sub.querySelectorAll('.fj-crumb') : [])].map((c) => ({ t: c.textContent, dir: c.dataset.crumb, cur: c.classList.contains('cur') }));
  return { on: sub && sub.classList.contains('on'), crumbs, title: document.getElementById('fjSubTitle') && document.getElementById('fjSubTitle').textContent };
});
check('一级面包屑（内部存储 + docs）', crumb1.on && crumb1.crumbs.length === 2 && crumb1.crumbs[0].t === '内部存储' && crumb1.crumbs[1].t === 'docs', JSON.stringify(crumb1.crumbs));
check('当前段 cur 高亮', crumb1.crumbs.length && crumb1.crumbs[crumb1.crumbs.length - 1].cur === true);
// 再下钻 nested → structure 三级
await page.evaluate(() => {
  const row = [...document.querySelectorAll('#fjSubBody .fj-row[data-type="dir"]')].find((r) => r.dataset.path === '/docs/nested');
  if (row) row.click();
});
await sleep(500);
await page.evaluate(() => {
  const row = [...document.querySelectorAll('#fjSubBody .fj-row[data-type="dir"]')].find((r) => r.dataset.path === '/docs/nested/structure');
  if (row) row.click();
});
await sleep(600);
const crumb3 = await page.evaluate(() => {
  const crumbs = [...document.querySelectorAll('#fjSubBody .fj-crumb')].map((c) => ({ t: c.textContent, dir: c.dataset.crumb }));
  const deepRow = [...document.querySelectorAll('#fjSubBody .fj-row')].some((r) => r.dataset.path === '/docs/nested/structure/deep.txt');
  return { crumbs, deepRow };
});
check('三级面包屑 4 段', crumb3.crumbs.length === 4 && crumb3.crumbs[3].t === 'structure' && crumb3.crumbs[3].dir === '/docs/nested/structure', JSON.stringify(crumb3.crumbs));
check('深层文件在列', crumb3.deepRow === true);
await page.screenshot({ path: `${OUT}/2-sub-crumbs-nested.png` });
// 点根段回跳
await page.evaluate(() => {
  const root = document.querySelector('#fjSubBody .fj-crumb[data-crumb="/"]');
  if (root) root.click();
});
await sleep(500);
const backRoot = await page.evaluate(() => ({
  title: document.getElementById('fjSubTitle') && document.getElementById('fjSubTitle').textContent,
  crumbs: document.querySelectorAll('#fjSubBody .fj-crumb').length,
}));
check('点根段回跳内部存储', backRoot.title === '内部存储' && backRoot.crumbs === 1, JSON.stringify(backRoot));

// ---------- ④ 网格目录徽标 ----------
log('--- ④ grid dir badge');
await page.evaluate(() => {
  const b = document.querySelector('#fjBrowseList .fj-chip[data-view="grid"]');
  if (b) b.click();
});
await sleep(500);
const gridBadge = await page.evaluate(() => {
  const g = document.querySelector('#fjBrowseList .fj-gitem[data-type="dir"] .gcnt');
  return g ? g.textContent : null;
});
check('网格目录计数徽标在场', gridBadge !== null && /^\d+$/.test(gridBadge || ''), String(gridBadge));
await page.screenshot({ path: `${OUT}/3-browse-grid-badge.png` });

// ---------- ⑤ 文本预览复制全文 ----------
log('--- ⑤ text preview copy');
await page.evaluate(() => {
  // 回列表视图，从浏览根进 documents 再点 opfs-e2e.txt
  const b = document.querySelector('#fjBrowseList .fj-chip[data-view="list"]');
  if (b) b.click();
});
await sleep(400);
await page.evaluate(() => {
  const row = [...document.querySelectorAll('#fjBrowseList .fj-row[data-type="dir"]')].find((r) => r.dataset.path === '/documents');
  if (row) row.click();
});
await sleep(500);
await page.evaluate(() => {
  const row = [...document.querySelectorAll('#fjSubBody .fj-row[data-type="file"]')].find((r) => r.dataset.path === '/documents/opfs-e2e.txt');
  if (row) row.click();
});
await sleep(700);
const copyProbe = await page.evaluate(async () => {
  const btn = document.getElementById('fjCopyText');
  if (!btn) return { btn: false };
  btn.click();
  await new Promise((r) => setTimeout(r, 400));
  const snack = document.getElementById('fjSnack');
  let clip = '';
  try { clip = await navigator.clipboard.readText(); } catch (e) {}
  return { btn: true, snack: snack && snack.textContent, clip };
});
check('复制全文：按钮在场 + snack 反馈 + 剪贴板内容一致', copyProbe.btn === true && /已复制全文/.test(copyProbe.snack || '') && copyProbe.clip === 'hello opfs v769', `snack=${copyProbe.snack} clip=${JSON.stringify(copyProbe.clip)}`);
await page.screenshot({ path: `${OUT}/4-text-preview-copy.png` });

// ---------- ⑥ 备份导出含 opfs 段 ----------
log('--- ⑥ backup export opfs section');
await page.keyboard.press('Escape');
await sleep(900);
let backupOk = false, backupDetail = '';
try {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.evaluate(() => window.__dataBackup && window.__dataBackup.exportBackup()),
  ]);
  const tmp = join(tmpdir(), 'geek-backup-v769.json');
  await download.saveAs(tmp);
  const data = JSON.parse(readFileSync(tmp, 'utf8'));
  const opfsFiles = data.opfs && data.opfs.files ? Object.keys(data.opfs.files) : [];
  const hasE2e = opfsFiles.includes('/documents/opfs-e2e.txt');
  const hasMeta = !!(data.indexedDB && data.indexedDB['ios-desktop-files'] && data.indexedDB['ios-desktop-files'].kv.some((it) => String(it.key).startsWith('vfs-meta:')));
  backupOk = data.opfs && data.opfs.dir === 'geek-vfs' && hasE2e && hasMeta;
  backupDetail = `opfs=${opfsFiles.length} e2e=${hasE2e} meta=${hasMeta}`;
} catch (e) {
  backupDetail = 'ERR:' + e.message.slice(0, 120);
}
check('备份导出含 opfs 段 + meta 段完整', backupOk, backupDetail);

// ---------- 收尾 ----------
log(`--- pageerror count: ${errors}`);
check('页面零报错', errors === 0);
log(failures === 0 ? 'ALL PASS ✅' : `FAILURES: ${failures} ❌`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
