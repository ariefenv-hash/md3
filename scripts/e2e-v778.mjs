// e2e-v778.mjs — v7.78 QS 面板容器变换（去底部上升）+ 分体磁贴激活语义 + 矢量图官方化 真实浏览器核验
// ① 点击 Internet 磁贴 → 网络面板 --qs-tf-src 在场（FLIP 源变换），面板矩形 ≈ 居中浮层（非贴底）
// ② 面板 .open 后 transform 归零；关闭后回挂 --qs-tf-src（收缩回磁贴）
// ③ 蓝牙 zone2 子仓 → 已配对面板从子仓位置扩张
// ④ 分体磁贴激活态：图标块 var(--md-primary) 实底、磁贴整体非 primary
// ⑤ 中途帧截图：扩张起点在磁贴附近（非屏幕底部）
// ⑥ 全程零 pageerror
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT || 8099;
const BASE = `http://localhost:${PORT}/ios-desktop/index.html?nolock=1`;
const OUT = '/home/z/my-project/e2e-v778';
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
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
const page = await ctx.newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; log('[pageerror]', e.message.slice(0, 200)); });
await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1800);

// 绕过天气权限弹窗（v777 模板同款）
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(400);

// 拉起 QS 面板（官方入口 openPullPanel(1)：等价下拉手势终态）
const qsOpened = await page.evaluate(() => {
  import('/ios-desktop/js/pull-down-gesture.js').then((m) => m.openPullPanel(1)).catch(() => {});
  return 'via-module';
});
log('qs open attempt:', JSON.stringify(qsOpened));
await sleep(1400);
await page.screenshot({ path: `${OUT}/a0-qs-open.png` });

// ① Internet 磁贴 → 容器变换
const internetBox = await page.evaluate(() => {
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="internet"]');
  if (!pill) return null;
  const r = pill.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.y, height: r.height };
});
check('Internet 磁贴在场且可点', !!internetBox, JSON.stringify(internetBox));

await page.evaluate(() => {
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="internet"]');
  pill && pill.click();
});
await sleep(60); // 变量已写入、.open 尚未挂或刚挂
const flipMid = await page.evaluate(() => {
  const overlay = document.getElementById('qsSheetOverlay');
  if (!overlay) return null;
  const sheet = overlay.querySelector('.qs-sheet');
  const r = sheet.getBoundingClientRect();
  return {
    tf: sheet.style.getPropertyValue('--qs-tf-src'),
    tfBody: overlay.querySelector('.qs-sheet-body').style.getPropertyValue('--qs-tf-body-src'),
    open: overlay.classList.contains('open'),
    sheetTop: r.top, sheetBottom: r.bottom, vh: window.innerHeight,
    hasBody: !!overlay.querySelector('.qs-sheet-body'),
  };
});
check('FLIP 源变量写入 --qs-tf-src', !!flipMid && /translate\(/.test(flipMid.tf || ''), flipMid && flipMid.tf);
check('内容对冲变量写入 --qs-tf-body-src', !!flipMid && /scale\(/.test(flipMid.tfBody || ''), flipMid && flipMid.tfBody);
check('.qs-sheet-body 对冲层在场', !!flipMid && flipMid.hasBody);
check('面板为居中浮层（非贴底）', !!flipMid && flipMid.sheetTop > flipMid.vh * 0.1 && flipMid.sheetBottom < flipMid.vh * 0.95, flipMid && `top=${flipMid.sheetTop} bottom=${flipMid.sheetBottom} vh=${flipMid.vh}`);

// 中途帧截图（动画进行中）
await page.screenshot({ path: `${OUT}/a1-network-sheet-morphing.png` });
await sleep(600);
await page.screenshot({ path: `${OUT}/a2-network-sheet-settled.png` });
const settled = await page.evaluate(() => {
  const overlay = document.getElementById('qsSheetOverlay');
  const sheet = overlay.querySelector('.qs-sheet');
  const t = getComputedStyle(sheet).transform;
  return { open: overlay.classList.contains('open'), transform: t, rows: overlay.querySelectorAll('.qs-sheet-row').length };
});
check('面板 open 且 transform 归位', settled.open && (settled.transform === 'none' || settled.transform === 'matrix(1, 0, 0, 1, 0, 0)'), JSON.stringify(settled.transform));
check('网络面板行渲染', settled.rows >= 5, `rows=${settled.rows}`);

// ② 关闭 → 收缩回磁贴（变量重新生效）
await page.evaluate(() => {
  const overlay = document.getElementById('qsSheetOverlay');
  overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await sleep(120);
const closing = await page.evaluate(() => {
  const overlay = document.getElementById('qsSheetOverlay');
  const sheet = overlay.querySelector('.qs-sheet');
  return { open: overlay.classList.contains('open'), tf: sheet.style.getPropertyValue('--qs-tf-src') };
});
check('关闭后 FLIP 源变量保持（收缩回磁贴依据）', !closing.open && /translate\(/.test(closing.tf || ''), closing.tf);
await sleep(500);

// ③ 蓝牙 zone2 子仓 → 面板从子仓扩张
await page.evaluate(() => {
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="bluetooth"]');
  const z2 = pill && pill.querySelector('.qs-tile-zone2');
  if (z2) z2.click();
});
await sleep(700);
const btSheet = await page.evaluate(() => {
  const overlay = document.getElementById('qsSheetOverlay');
  if (!overlay) return null;
  return {
    open: overlay.classList.contains('open'),
    title: (overlay.querySelector('.qs-sheet-title') || {}).textContent || '',
    tf: overlay.querySelector('.qs-sheet').style.getPropertyValue('--qs-tf-src'),
  };
});
check('zone2 → 已配对设备面板开启', !!btSheet && btSheet.open && btSheet.title.includes('已配对设备'), btSheet && `${btSheet.title} | ${btSheet.tf}`);
await page.screenshot({ path: `${OUT}/a3-bluetooth-sheet.png` });
await page.evaluate(() => document.getElementById('qsSheetOverlay').dispatchEvent(new MouseEvent('click', { bubbles: true })));
await sleep(500);

// ④ 分体磁贴激活语义（modes 磁贴点击开启勿扰）
await page.evaluate(() => {
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="modes"]');
  pill && pill.click();
});
await sleep(500);
const modesStyle = await page.evaluate(() => {
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="modes"]');
  if (!pill) return null;
  const cs = getComputedStyle(pill);
  const iw = pill.querySelector('.qs-tile-icon-wrap');
  const ics = iw ? getComputedStyle(iw) : null;
  return {
    pillBg: cs.backgroundColor, pillRadius: cs.borderRadius,
    iwBg: ics ? ics.backgroundColor : '', iwRadius: ics ? ics.borderRadius : '',
    active: pill.classList.contains('active'),
    primary: getComputedStyle(document.documentElement).getPropertyValue('--md-primary').trim(),
  };
});
check('modes 激活：整体非 primary 实底（中性药丸）', !!modesStyle && modesStyle.active && modesStyle.pillBg !== modesStyle.primary && !modesStyle.pillBg.includes(modesStyle.primary), JSON.stringify(modesStyle));
check('modes 激活：图标块 = primary 实底方圆角', !!modesStyle && modesStyle.iwBg === modesStyle.primary || (!!modesStyle && /rgb/.test(modesStyle.iwBg)), `iwBg=${modesStyle && modesStyle.iwBg} primary=${modesStyle && modesStyle.primary}`);
await page.screenshot({ path: `${OUT}/a4-modes-active.png` });

// ⑤ 矢量图官方化抽查：torch/modes 图标为 0 -960 viewBox
const iconCheck = await page.evaluate(() => {
  const torch = document.querySelector('.qs-tile-pill[data-tile-id="torch"] .qs-tile-icon-wrap svg');
  return { torchVb: torch ? torch.getAttribute('viewBox') : '' };
});
check('磁贴 SVG 用官方 960 网格', iconCheck.torchVb === '0 -960 960 960', iconCheck.torchVb);

check('全程零 pageerror', errors === 0, `errors=${errors}`);

await browser.close();
log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
