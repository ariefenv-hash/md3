// e2e-v802-accessibility-subpage.mjs — v8.02 #10 五期 E2E 核验
// ① 一级菜单无障碍行 → 页 20「无障碍功能」（宽栏双栏 openPane 路径）
// ② 页 20 权威结构：5 渲染分区标题（显示/互动控制/字幕/音频/常规）+ 15 行权威文案
// ③ 徽章图标：13 枚 layer-list 白色前景 SVG + #5F6368/#F50D60 底色（放大功能特例）
// ④ 超越点：极暗开关 → documentElement filter brightness(0.5)（html 层与 body.filter 分层合成）
// ⑤ 单源持久化 settings:accessibility-v1（rbc 写回 + 重载恢复）
// ⑥ 语音描述开关联动 + body.filter 不被 RBC 写冲突
// ⑦ 零 pageerror + 截图三张落盘 docs/v802/
//
// 用法：MD3_BASE=http://127.0.0.1:8081/ios-desktop/index.html?nolock=1 node scripts/e2e-v802-accessibility-subpage.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/md3-repo/docs/v802';
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

// 清态：确保无障碍单源从默认开始
await page.evaluate(() => localStorage.removeItem('settings:accessibility-v1'));

// ① 打开设置（桌面图标）→ 宽栏双栏默认页
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1600);

// ② 左栏无障碍行与直通（idx 20）
const a11yRow = await page.evaluate(() => {
  const row = document.querySelector('.tp-row[data-tp-key="accessibility"]');
  return row ? { sub: row.querySelector('.tp-row-sub')?.textContent.trim(), tp: row.dataset.tp } : null;
});
check('无障碍行存在于左栏且 data-tp=20', !!a11yRow && a11yRow.tp === '20', JSON.stringify(a11yRow));

// 点无障碍行 → 右栏打开页 20
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="accessibility"]').click());
await sleep(1400);

const p20 = await page.evaluate(() => {
  const pageEl = document.getElementById('app-page-settings-20');
  if (!pageEl) return null;
  const txt = pageEl.textContent;
  return {
    mounted: true,
    hosted: !!pageEl.classList.contains('tp-hosted'),
    title: txt.includes('无障碍功能') && txt.includes('显示、互动、音频（AOSP AccessibilitySettings）'),
    secDisplay: !!txt.includes('显示'),
    secInteraction: txt.includes('互动控制'),
    secCaptions: txt.includes('字幕'),
    secAudio: txt.includes('音频'),
    secGeneral: txt.includes('常规'),
    rowTextReading: txt.includes('显示大小和文字'),
    rowColorMotion: txt.includes('色彩和动画'),
    rowDim: txt.includes('极暗'),
    rowMagnify: txt.includes('放大功能') && txt.includes('已关闭/放大屏幕上的内容'),
    rowTap: txt.includes('定时控制'),
    rowSysControls: txt.includes('系统控制'),
    rowVibration: txt.includes('振动和触感反馈') && txt.includes('已开启'),
    rowPointer: txt.includes('指针和触控板无障碍功能') && txt.includes('指针颜色、指针大小等'),
    rowLiveCaption: txt.includes('实时字幕') && txt.includes('自动生成媒体字幕'),
    rowCaptioning: txt.includes('字幕偏好设置'),
    rowAudioDesc: txt.includes('语音描述') && txt.includes('以语音的形式描述当前画面呈现的内容（仅限支持该设置的电影或电视节目）'),
    rowHearingAid: txt.includes('助听装置') && txt.includes('未连接任何助听装置'),
    rowAudioAdjust: txt.includes('音频调整'),
    rowShortcuts: txt.includes('无障碍快捷方式'),
    rowTts: txt.includes('文字转语音输出'),
  };
});
check('页 20 挂载（栈页被双栏移动 hosted）', !!p20 && p20.mounted && p20.hosted, JSON.stringify(!!p20 && p20.hosted));
check('页 20 标题「无障碍功能」+ 副题', !!p20 && p20.title);
check('五渲染分区标题齐（显示/互动控制/字幕/音频/常规）', !!p20 && p20.secDisplay && p20.secInteraction && p20.secCaptions && p20.secAudio && p20.secGeneral);
check('15 行权威文案齐', !!p20 && p20.rowTextReading && p20.rowColorMotion && p20.rowDim && p20.rowMagnify && p20.rowTap && p20.rowSysControls && p20.rowVibration && p20.rowPointer && p20.rowLiveCaption && p20.rowCaptioning && p20.rowAudioDesc && p20.rowHearingAid && p20.rowAudioAdjust && p20.rowShortcuts && p20.rowTts);

// ③ 徽章图标：13 枚白色前景 + 特例色放大功能
const badges = await page.evaluate(() => {
  const pageEl = document.getElementById('app-page-settings-20');
  const svgs = pageEl ? pageEl.querySelectorAll('span[style*="border-radius:27%"] svg') : [];
  const grey = pageEl ? pageEl.querySelectorAll('span[style*="background:#5F6368"]').length : 0;
  const pink = pageEl ? pageEl.querySelectorAll('span[style*="background:#F50D60"]').length : 0;
  let whiteFill = 0;
  svgs.forEach((s) => { if (s.getAttribute('fill') === '#ffffff') whiteFill++; });
  return { count: svgs.length, whiteFill, grey, pink };
});
check('13 枚徽章图标渲染（12 灰 + 1 粉特例）', badges.count === 13 && badges.whiteFill === 13 && badges.grey === 12 && badges.pink === 1, JSON.stringify(badges));
await page.screenshot({ path: `${OUT}/p20-accessibility-page.png` });

// ④ 超越点：极暗 CSS filter 真实现
const before = await page.evaluate(() => ({
  html: document.documentElement.style.filter,
  body: document.body.style.filter,
  sw: document.getElementById('a11yRbcToggle')?.checked,
}));
check('初始：html 无 filter + 极暗开关默认关（REDUCE_BRIGHT_COLORS_ACTIVATED=0）', before.html === '' && before.sw === false, JSON.stringify(before));

await page.evaluate(() => {
  const sw = document.getElementById('a11yRbcToggle');
  sw.checked = true;
  sw.dispatchEvent(new Event('change'));
});
await sleep(500);
const dimOn = await page.evaluate(() => ({
  html: document.documentElement.style.filter,
  body: document.body.style.filter,
  stored: JSON.parse(localStorage.getItem('settings:accessibility-v1') || '{}'),
}));
check('极暗开 → documentElement filter = brightness(0.5)（RBC 滑条默认 50%）', dimOn.html === 'brightness(0.5)', String(dimOn.html));
check('body.filter 未被写（与 QS 亮度链分层合成，零冲突）', dimOn.body === before.body, String(dimOn.body));
check('单源写回 rbc=true（Secure 持久化语义）', dimOn.stored.rbc === true, JSON.stringify(dimOn.stored));
await page.screenshot({ path: `${OUT}/p20-extra-dim-on.png` });

// ⑤ 重载恢复（activated 持久化）
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(2500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(1200);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1600);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="accessibility"]').click());
await sleep(1400);
const restored = await page.evaluate(() => ({
  sw: document.getElementById('a11yRbcToggle')?.checked,
  html: document.documentElement.style.filter,
}));
check('重载恢复：开关仍开 + html filter 仍 brightness(0.5)', restored.sw === true && restored.html === 'brightness(0.5)', JSON.stringify(restored));

// ⑥ 关闭极暗 → filter 清除 + 存储回 false
await page.evaluate(() => {
  const sw = document.getElementById('a11yRbcToggle');
  sw.checked = false;
  sw.dispatchEvent(new Event('change'));
});
await sleep(500);
const dimOff = await page.evaluate(() => ({
  html: document.documentElement.style.filter,
  stored: JSON.parse(localStorage.getItem('settings:accessibility-v1') || '{}'),
}));
check('极暗关 → html filter 清除', dimOff.html === '', String(dimOff.html));
check('单源回写 rbc=false', dimOff.stored.rbc === false, JSON.stringify(dimOff.stored));

// ⑦ 语音描述开关（persistent=false 会话态）
await page.evaluate(() => {
  const sw = document.getElementById('a11yAudioDescToggle');
  sw.checked = true;
  sw.dispatchEvent(new Event('change'));
});
await sleep(300);
const adOn = await page.evaluate(() => JSON.parse(localStorage.getItem('settings:accessibility-v1') || '{}'));
check('语音描述开 → 单源 audioDescription=true', adOn.audioDescription === true, JSON.stringify(adOn));
// 复原默认（会话一致性）
await page.evaluate(() => { window.__settingsA11yStore && window.__settingsA11yStore.save({ rbc: false, audioDescription: false }); });

// ⑧ 互动控制+字幕区特写（徽章行 32dp/前景 18dp 视觉核验）
const clip = await page.evaluate(() => {
  const pageEl = document.getElementById('app-page-settings-20');
  if (!pageEl) return null;
  const heads = [...pageEl.querySelectorAll('div')].filter((d) => d.textContent.trim() === '互动控制');
  return heads.length ? { top: heads[0].getBoundingClientRect().top, pageTop: pageEl.getBoundingClientRect().top } : null;
});
if (clip) {
  await page.screenshot({ path: `${OUT}/p20-interaction-captions-closeup.png`, clip: { x: 640, y: Math.max(0, clip.top - 12), width: 640, height: 480 } });
}

check('零 pageerror', pageErrors === 0, `errors=${pageErrors}`);

await browser.close();
log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
