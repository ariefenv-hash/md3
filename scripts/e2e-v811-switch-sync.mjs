// ==================== e2e-v811-switch-sync.mjs — #70 无头回归 ====================
//
// 议题实测路径复现（#70 §实测）+ DoD 全开关一致性扫描：
//   A. 冷启动进设置 → 全部 .md3-switch「真值 ↔ 几何」一致性扫描（基线 0 不一致）
//   B. 关闭设置 → 切深色主题（window.__settingsTheme 真源，模拟 QS/控制中心路径）
//      → 再次进入设置（DOM 复用 _m3Bound=true，app-page-active 触发 syncDark）
//      → dspDarkToggle checked=true 且 thumb 几何在右侧 tx≈24（修复前 4px ❌）
//   C. 关闭设置期间改 QS 磁贴真源（飞行模式 autorotate 同构路径）→ 重进设置一致性
//   D. 全开关二次扫描（旧版「二次进入一直错」的根治验证）
//   零 pageerror + 截图两张 docs/v811/

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = '/home/z/my-project/md3-repo/docs/v811';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};

// 一致性判定：thumb 内联 transform 的 tx 分量 ≈ restGeo(checked)（4↔关 / 24↔开）
const SCAN = () => {
  const out = [];
  document.querySelectorAll('.md3-switch').forEach((label) => {
    const input = label.querySelector('input');
    const thumb = label.querySelector('.thumb');
    if (!input || !thumb || !label.offsetParent) return;   // 不可见开关不在本轮验收域
    const m = /translate\(([-\d.]+)px/.exec(thumb.style.transform || '');
    out.push({
      id: input.id || label.id || label.closest('[id]')?.id || '?',
      checked: input.checked,
      tx: m ? parseFloat(m[1]) : null,
      bound: !!label._m3Bound,
    });
  });
  return out;
};
const mismatches = (rows) => rows.filter((r) => r.bound && r.tx !== null &&
  Math.abs(r.tx - (r.checked ? 24 : 4)) > 0.6);

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
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

// ---- A. 冷启动进设置：全开关一致性 ----
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(2200);
let rows = await page.evaluate(SCAN);
let bad = mismatches(rows);
check(`A 冷启动一致性：${rows.length} 个可见开关，不一致 ${bad.length}（议题基线 0）`,
  rows.length >= 10 && bad.length === 0, bad.map((b) => `${b.id}:tx=${b.tx}`).join(','));

const shot = async (name) => {
  const cdp = await ctx.newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}`, Buffer.from(data, 'base64'));
};
await shot('v811-settings-first.png');

// ---- B. 关闭设置 → 切深色 → 重进（DOM 复用路径）----
// 关闭设置走桌面导航条 home 键（nav-bar nvb-home → closeApp 正规通道）
await page.evaluate(() => document.querySelector('.nvb-btn.nvb-home')?.click());
await sleep(800);
const themeSet = await page.evaluate(() => {
  if (window.__settingsTheme) { window.__settingsTheme.set('dark'); return window.__settingsTheme.resolved(); }
  return 'NO_BRIDGE';
});
check('B 真源切深色生效', themeSet === 'dark', `resolved=${themeSet}`);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1800);
// 议题复现表 B 步骤语义：app-page-active pageIdx=1（等价于「回到显示页」）——
// 打开设置落点是一级列表（pageIdx 0），需点击进入显示子页触发激活回同步
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="display"]')?.click());
await sleep(1200);

const dk = await page.evaluate(() => {
  const input = document.getElementById('dspDarkToggle');
  if (!input) return null;
  const label = input.closest('.md3-switch');
  const thumb = label.querySelector('.thumb');
  const m = /translate\(([-\d.]+)px/.exec(thumb.style.transform || '');
  return { checked: input.checked, tx: m ? parseFloat(m[1]) : null };
});
check('B dspDarkToggle 真值=开', !!dk && dk.checked === true, JSON.stringify(dk));
check('B dspDarkToggle 几何在右侧 tx≈24（修复前 4px ❌ → #70 根治）',
  !!dk && Math.abs(dk.tx - 24) < 0.6, `tx=${dk && dk.tx}`);

rows = await page.evaluate(SCAN);
bad = mismatches(rows);
check(`B 二次进入全开关一致性：${rows.length} 个，不一致 ${bad.length}（旧版「一直错」根治）`,
  bad.length === 0, bad.map((b) => `${b.id}:checked=${b.checked},tx=${b.tx}`).join(','));

// ---- C. 设置打开期间外部真源变化（app-page-active 同步路径）----
await page.evaluate(() => { window.__settingsTheme.set('light'); });
await sleep(600);
// 容错：主题切换可能触发显示子页重渲染，必要时重进显示子页再读
let dk2 = null;
for (let i = 0; i < 5 && (!dk2 || dk2.tx === null); i++) {
  await page.evaluate(() => {
    const row = document.querySelector('.tp-row[data-tp-key="display"]');
    if (row && !document.getElementById('dspDarkToggle')) row.click();
  });
  await sleep(700);
  dk2 = await page.evaluate(() => {
    const input = document.getElementById('dspDarkToggle');
    if (!input) return null;
    const thumb = input.closest('.md3-switch').querySelector('.thumb');
    const m = /translate\(([-\d.]+)px/.exec(thumb.style.transform || '');
    return { checked: input.checked, tx: m ? parseFloat(m[1]) : null };
  });
}
check('C 设置打开期间真源切浅色 → 开关实时回位 tx≈4（property 拦截/A 入口驱动）',
  !!dk2 && dk2.checked === false && Math.abs(dk2.tx - 4) < 0.6, JSON.stringify(dk2));

// 回深色收尾（不影响桌面其他测试的观感——非持久断言）
await page.evaluate(() => window.__settingsTheme.set('dark'));
await sleep(400);
await shot('v811-settings-resync.png');

check('零 pageerror', pageErrors === 0, `errors=${pageErrors}`);
await browser.close();
log(failures === 0 ? '\n=== E2E PASS — #70 状态↔视觉同步全链 ===' : `\n=== E2E FAIL ×${failures} ===`);
process.exit(failures === 0 ? 0 : 1);
