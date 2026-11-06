// e2e-v101-watchface-gen.mjs — v10.28 #101 AI 生成锁屏表盘参数化生成器 E2E 核验
// ① 壁纸与样式页：生成面板在场（seed 0 缺省 + reroll 钮 + 5 维度锁定 chip）+ 第 5 脸 custom 卡在网格
// ② 生成链：reroll → seed 变更 + custom 脸自动应用（LOCK_CLOCK_FACE_KEY）+ toast + 网格卡预览跟随
// ③ 锁定链：锁定字重 → chip aria-pressed + 🔒 → 再掷字重保留 / seed 变更
// ④ 锁屏真跑：instantLock + setFace('custom') → 双帧 [data-face="custom"] + [data-test="watchface-custom"] + 内联样式真渲染
// ⑤ 持久化：reload 后 seed / 锁定态 / 表盘选择三域存活
// ⑥ 零 pageerror + 截图落盘 docs/v101/
//
// 用法：MD3_BASE=http://127.0.0.1:8080/ios-desktop/index.html?nolock=1 node scripts/e2e-v101-watchface-gen.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/md3-repo/docs/v101';
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

// ① 打开壁纸与样式（生产真函数 openThemePicker——v187 等价通道）
await page.evaluate(() => window.openThemePicker());
await sleep(2200);
const panelState = await page.evaluate(() => ({
  panel: !!document.getElementById('watchfaceGenPanel'),
  genBtn: !!document.querySelector('[data-test="watchface-gen-btn"]'),
  chips: Array.from(document.querySelectorAll('[data-wfdim]')).map((b) => b.getAttribute('data-wfdim')),
  seedText: (document.querySelector('#watchfaceGenPanel') || {}).textContent || '',
  customCard: !!document.querySelector('[data-test="lockface-custom"]'),
  customPreview: !!document.querySelector('[data-test="lockface-custom"] [data-test="watchface-custom"]'),
}));
check('生成面板 + reroll 钮在场', panelState.panel && panelState.genBtn);
check('5 维度锁定 chip 全渲染（layout/weight/tracking/hueShift/decor）', panelState.chips.length === 5
  && ['layout', 'weight', 'tracking', 'hueShift', 'decor'].every((k) => panelState.chips.includes(k)), JSON.stringify(panelState.chips));
check('缺省 seed 0 展示 + 第 5 脸 custom 卡在网格 + 预览真渲染', panelState.seedText.includes('seed 0')
  && panelState.customCard && panelState.customPreview, panelState.seedText.slice(0, 60));
await page.screenshot({ path: `${OUT}/gen-panel-default.png` });

// ② 生成链：reroll → seed 变更 + custom 自动应用 + toast
await page.evaluate(() => document.querySelector('[data-test="watchface-gen-btn"]').click());
await sleep(400);
const gen1 = await page.evaluate(() => ({
  seedText: (document.querySelector('#watchfaceGenPanel') || {}).textContent || '',
  faceKey: localStorage.getItem('ios-desktop:lock-clock-face-v1'),
  toast: (document.getElementById('systemGlobalToast') || {}).textContent || '',
  cfgStyle: (document.querySelector('[data-test="lockface-custom"] [data-test="watchface-custom"] span') || {}).getAttribute
    ? (document.querySelector('[data-test="lockface-custom"] [data-test="watchface-custom"] span') || {}).getAttribute('style') : '',
}));
check('reroll：seed 变更（非 0）+ seed 可复现展示', /seed [1-9]/.test(gen1.seedText), gen1.seedText.slice(0, 50));
check('生成即应用 custom 脸（LOCK_CLOCK_FACE_KEY = custom——单一状态源）', (gen1.faceKey || '').includes('custom'), gen1.faceKey);
check('生成 toast 在场（已生成新表盘）', gen1.toast.includes('已生成新表盘'), gen1.toast);
check('网格卡预览跟随生成参数（内联 style 含 font-weight）', gen1.cfgStyle.includes('font-weight'), gen1.cfgStyle.slice(0, 80));

// ③ 锁定链：锁定字重 → 再掷字重保留
const w0 = await page.evaluate(() => {
  const chip = document.querySelector('[data-test="watchface-lock-weight"]');
  const m = chip.textContent.match(/字重 (\d+)/);
  return { label: chip.textContent.trim(), aria: chip.getAttribute('aria-pressed'), weight: m ? m[1] : '' };
});
await page.evaluate(() => document.querySelector('[data-test="watchface-lock-weight"]').click());
await sleep(250);
const w1 = await page.evaluate(() => {
  const chip = document.querySelector('[data-test="watchface-lock-weight"]');
  return { aria: chip.getAttribute('aria-pressed'), text: chip.textContent.trim() };
});
await page.evaluate(() => document.querySelector('[data-test="watchface-gen-btn"]').click());
await sleep(300);
const w2 = await page.evaluate(() => {
  const chip = document.querySelector('[data-test="watchface-lock-weight"]');
  const m = chip.textContent.match(/字重 (\d+)/);
  const panel = (document.querySelector('#watchfaceGenPanel') || {}).textContent || '';
  return { weight: m ? m[1] : '', seedText: panel.match(/seed \d+/) ? panel.match(/seed \d+/)[0] : '' };
});
check('锁定 chip：点击 → aria-pressed true + 🔒 标记', w1.aria === 'true' && w1.text.includes('🔒'), `${w0.label} → ${w1.text}`);
check('再掷：锁定字重保留（' + w0.weight + '）+ seed 变更', w2.weight === w0.weight && w2.seedText !== '' && !w2.seedText.includes('seed 0'),
  `weight ${w0.weight}→${w2.weight} | ${w2.seedText}`);
await page.screenshot({ path: `${OUT}/gen-panel-locked.png` });

// ④ 锁屏真跑：custom 脸双帧真渲染
await page.evaluate(() => { window.__lockTest.instantLock(); });
await sleep(400);
await page.evaluate(() => { window.__lockTest.setFace('custom'); });
await sleep(500);
const lockFaces = await page.evaluate(() => ({
  face: window.__lockTest.face(),
  small: !!document.querySelector('.lock-clock [data-face="custom"] [data-test="watchface-custom"]'),
  large: !!document.querySelector('.lock-clock-large [data-face="custom"] [data-test="watchface-custom"]'),
  style: ((document.querySelector('.lock-clock-large [data-test="watchface-custom"] span') || {}).getAttribute('style')) || '',
}));
check('锁屏 custom 脸：双帧真渲染（small+large）+ 注册表身份 custom', lockFaces.face && lockFaces.face.id === 'custom' && lockFaces.small && lockFaces.large, JSON.stringify({ face: lockFaces.face && lockFaces.face.id, small: lockFaces.small, large: lockFaces.large }));
check('锁屏脸内联样式携带生成参数（font-weight + Monet hue 派生零裸色）',
  lockFaces.style.includes('font-weight') && lockFaces.style.includes('var(--md-h,215)'), lockFaces.style.slice(0, 90));
await page.screenshot({ path: `${OUT}/lockscreen-custom.png` });

// ⑤ 持久化：reload 后三域存活
const preReload = await page.evaluate(() => ({
  seed: ((document.querySelector('#watchfaceGenPanel') || {}).textContent || '').match(/seed (\d+)/)
    ? document.querySelector('#watchfaceGenPanel').textContent.match(/seed (\d+)/)[1] : '',
}));
await page.evaluate(() => { window.__lockTest.setFace('double'); }); // 出锁屏态（脸选择改回，生成参数域独立不动）
await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
await sleep(2500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(1200);
await page.evaluate(() => window.openThemePicker());
await sleep(2200);
const post = await page.evaluate(() => ({
  seed: ((document.querySelector('#watchfaceGenPanel') || {}).textContent || '').match(/seed (\d+)/)
    ? document.querySelector('#watchfaceGenPanel').textContent.match(/seed (\d+)/)[1] : '',
  weightLocked: (document.querySelector('[data-test="watchface-lock-weight"]') || {}).getAttribute
    ? document.querySelector('[data-test="watchface-lock-weight"]').getAttribute('aria-pressed') : '',
}));
check('reload 持久化：seed 存活（' + preReload.seed + '）+ 字重锁定态存活',
  preReload.seed !== '' && post.seed === preReload.seed && post.weightLocked === 'true',
  `seed ${preReload.seed}→${post.seed} | lock=${post.weightLocked}`);

check('零 pageerror', pageErrors === 0, `errors=${pageErrors}`);
await browser.close();
log(failures === 0 ? 'ALL PASS' : `FAILED: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
