// e2e-v804-display-subpage.mjs — v8.04 #23 差距矩阵②回审计 E2E 核验
// ① 一级菜单显示行 → 页 1（宽栏双栏 tp-hosted 路径）
// ② 页 1 权威结构：5 分区 + 渲染 7 行（亮度滑条/锁定的屏幕/自动锁屏/深色主题/显示大小和文字/自动旋转屏幕/屏保）
// ③ 亮度单一真源桥：拖动页 1 滑条 → window.__qsBrightness 值变化 + body.filter 消费链同步（QS 同源）
// ④ 深色主题 PrimarySwitch：开关 ↔ __settingsTheme 真源 + 摘要「一律不自动关闭/永不自动开启」联动
// ⑤ 自动旋转开关 ↔ QS autorotate 磁贴（__qsTileState.get/sync）双向一致
// ⑥ 单源 __settingsDisplayStore（settings:display-v1）注册 + 自动锁屏默认「闲置 1 分钟后」
// ⑦ 零 pageerror + 截图三张落盘 docs/v804/
//
// 用法：MD3_BASE=http://127.0.0.1:8081/ios-desktop/index.html?nolock=1 node scripts/e2e-v804-display-subpage.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/md3-repo/docs/v804';
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

// 清态：确保 display 单源从默认开始
await page.evaluate(() => localStorage.removeItem('settings:display-v1'));

// ① 打开设置 → 宽栏双栏
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1600);

// ② 左栏显示行（idx 1）
const dspRow = await page.evaluate(() => {
  const row = document.querySelector('.tp-row[data-tp-key="display"]');
  return row ? { label: row.querySelector('.tp-row-label, .tp-row-title')?.textContent.trim(), tp: row.dataset.tp } : null;
});
check('显示行存在于左栏且 data-tp=1', !!dspRow && dspRow.tp === '1', JSON.stringify(dspRow));

// 点行 → 右栏打开页 1
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="display"]').click());
await sleep(1400);

const p1 = await page.evaluate(() => {
  const pageEl = document.getElementById('app-page-settings-1');
  if (!pageEl) return null;
  const txt = pageEl.textContent;
  const q = (id) => !!pageEl.querySelector('#' + id);
  const qTest = (t) => !!pageEl.querySelector(`[data-test="${t}"]`);
  return {
    mounted: true,
    hosted: !!pageEl.classList.contains('tp-hosted'),
    title: txt.includes('显示') && txt.includes('亮度、深色主题、自动锁屏（AOSP DisplaySettings）'),
    // 五分区标题
    secBrightness: txt.includes('亮度'),
    secLock: txt.includes('锁定显示屏'),
    secAppearance: txt.includes('外观'),
    secControls: txt.includes('显示控制'),
    // 渲染 7 行
    rBrightness: qTest('dsp-brightness') && q('dspBriSlider'),
    rLockscreen: qTest('dsp-lockscreen') && txt.includes('锁定的屏幕') && txt.includes('显示所有通知内容'),
    rTimeout: qTest('dsp-timeout') && txt.includes('自动锁屏') && q('dspTimeoutSub'),
    rDark: qTest('dsp-dark') && q('dspDarkToggle') && txt.includes('深色主题'),
    rTextReading: qTest('dsp-text-reading') && txt.includes('显示大小和文字'),
    rRotate: qTest('dsp-rotate') && q('dspRotateToggle') && txt.includes('自动旋转屏幕'),
    rScreensaver: qTest('dsp-screensaver') && txt.includes('屏保') && txt.includes('已开启 / 时钟'),
    // 隐藏区不渲染断言（颜色整区隐藏）
    noColorSection: !txt.includes('护眼模式') && !txt.includes('颜色对比度'),
  };
});
check('页 1 挂载（栈页被双栏移动 hosted）', !!p1 && p1.mounted && p1.hosted, String(!!p1 && p1.hosted));
check('页 1 标题「显示」+ 副题', !!p1 && p1.title);
check('五分区渲染（亮度/锁定显示屏/外观/显示控制）', !!p1 && p1.secBrightness && p1.secLock && p1.secAppearance && p1.secControls);
check('渲染 7 行齐（亮度/锁定的屏幕/自动锁屏/深色主题/显示大小和文字/自动旋转屏幕/屏保）',
  !!p1 && p1.rBrightness && p1.rLockscreen && p1.rTimeout && p1.rDark && p1.rTextReading && p1.rRotate && p1.rScreensaver);
check('颜色整区隐藏（护眼模式/颜色对比度不在 DOM）', !!p1 && p1.noColorSection);
await page.screenshot({ path: `${OUT}/p1-display-page.png` });

// ③ 单一真源初值：亮度=QS 桥 80、深色=theme 解析值、旋转=QS 磁贴、锁屏 store 默认 60000
const initVals = await page.evaluate(() => ({
  bri0: window.__qsBrightness ? window.__qsBrightness.get() : null,
  briLabel: document.getElementById('dspBriVal')?.textContent,
  dark0: window.__settingsTheme ? window.__settingsTheme.resolved() : null,
  darkChecked: document.getElementById('dspDarkToggle')?.checked,
  darkSub: document.getElementById('dspDarkSub')?.textContent,
  rotate0: window.__qsTileState ? window.__qsTileState.get('autorotate') : null,
  rotateChecked: document.getElementById('dspRotateToggle')?.checked,
  timeout0: window.__settingsDisplayStore ? window.__settingsDisplayStore.get('timeout') : null,
  timeoutSub: document.getElementById('dspTimeoutSub')?.textContent,
}));
check('亮度初值 = QS 桥真值（80% 同源）', initVals.bri0 === 80 && initVals.briLabel === '80%', JSON.stringify({ bri0: initVals.bri0, label: initVals.briLabel }));
check('深色主题初值 = __settingsTheme 解析值 + 摘要权威值', initVals.darkChecked === (initVals.dark0 === 'dark') && (initVals.darkSub === '永不自动开启' || initVals.darkSub === '一律不自动关闭'), JSON.stringify({ resolved: initVals.dark0, checked: initVals.darkChecked, sub: initVals.darkSub }));
check('自动旋转初值 = QS autorotate 磁贴（默认开）', initVals.rotate0 === true && initVals.rotateChecked === true, JSON.stringify({ rotate0: initVals.rotate0, checked: initVals.rotateChecked }));
check('自动锁屏默认 def_screen_off_timeout=60000 →「闲置 1 分钟后」', initVals.timeout0 === 60000 && initVals.timeoutSub === '闲置 1 分钟后', JSON.stringify({ timeout0: initVals.timeout0, sub: initVals.timeoutSub }));
check('单源 __settingsDisplayStore 注册（settings:display-v1）', !!initVals.timeout0, String(!!initVals.timeout0));

// ④ 亮度真交互：拖动滑条到 ~60% → __qsBrightness.set → body.filter 消费链同步
const briBefore = await page.evaluate(() => ({
  v: window.__qsBrightness.get(),
  filter: document.body.style.filter,
}));
await page.evaluate(() => {
  const slider = document.getElementById('dspBriSlider');
  if (!slider) return;
  const r = slider.getBoundingClientRect();
  const x = r.left + r.width * 0.6, y = r.top + r.height / 2;
  const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1 };
  slider.dispatchEvent(new PointerEvent('pointerdown', opts));
  slider.dispatchEvent(new PointerEvent('pointermove', opts));
  slider.dispatchEvent(new PointerEvent('pointerup', opts));
});
await sleep(500); // rAF 合帧后快照（v8.03 惯例）
const briAfter = await page.evaluate(() => ({
  v: window.__qsBrightness.get(),
  filter: document.body.style.filter,
  label: document.getElementById('dspBriVal')?.textContent,
}));
const briOk = briAfter.v < briBefore.v && Math.abs(briAfter.v - 60) <= 2 &&
  /brightness\(0\.\d+\)/.test(briAfter.filter) &&
  Math.abs(parseFloat(briAfter.filter.match(/brightness\(([\d.]+)\)/)[1]) - (0.35 + briAfter.v / 100 * 0.65)) < 0.005;
check('亮度滑条真交互：60% → QS 桥真值同步 + body.filter 调光消费链联动（0.35+v·0.65 公式核值）', briOk, JSON.stringify({ before: briBefore, after: briAfter }));
await page.screenshot({ path: `${OUT}/p1-brightness-drag-filter.png` });

// ⑤ 深色主题真交互：开 → theme 解析值翻转 + 摘要切换「一律不自动关闭」
await page.evaluate(() => {
  const t = document.getElementById('dspDarkToggle');
  t.click();
});
await sleep(500);
const darkAfter = await page.evaluate(() => ({
  resolved: window.__settingsTheme.resolved(),
  checked: document.getElementById('dspDarkToggle').checked,
  sub: document.getElementById('dspDarkSub')?.textContent,
}));
check('深色主题开关 ↔ __settingsTheme 真源翻转 + 摘要联动', darkAfter.checked && darkAfter.resolved === 'dark' && darkAfter.sub === '一律不自动关闭', JSON.stringify(darkAfter));

// ⑥ 自动旋转真交互：关 → QS 磁贴同步关（Toast 语义「方向已锁定」）
await page.evaluate(() => {
  const t = document.getElementById('dspRotateToggle');
  t.click();
});
await sleep(400);
const rotAfter = await page.evaluate(() => window.__qsTileState.get('autorotate'));
check('自动旋转开关 ↔ QS autorotate 磁贴双向一致', rotAfter === false, String(rotAfter));
// 复位：开回
await page.evaluate(() => document.getElementById('dspRotateToggle').click());
await sleep(300);

// 分区特写（亮度→深色主题→显示大小和文字）
const clip = await page.evaluate(() => {
  const first = document.querySelector('#app-page-settings-1 [data-test="dsp-brightness"]');
  const last = document.querySelector('#app-page-settings-1 [data-test="dsp-text-reading"]');
  if (!first || !last) return null;
  const a = first.getBoundingClientRect(), b = last.getBoundingClientRect();
  return { top: a.top, height: b.bottom - a.top };
});
if (clip) {
  await page.screenshot({ path: `${OUT}/p1-panels-closeup.png`, clip: { x: 640, y: Math.max(0, clip.top - 8), width: 640, height: Math.min(760, clip.height + 16) } });
}

// ⑦ 零 pageerror
check('零 pageerror', pageErrors === 0, String(pageErrors));

await browser.close();
log(`\n${failures === 0 ? 'ALL PASS' : 'FAILURES: ' + failures}`);
process.exit(failures === 0 ? 0 : 1);
