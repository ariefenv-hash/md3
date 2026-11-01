// v9.10 = #121 歌词制作器一期（R41 轮）无头回归小判据：
// ①iframe 应用挂载（core + 只读桥）②演示/粘贴载入行 ③打点单调化（快打防乱序）
// ④逐字对齐生成 ⑤卡拉OK定位（行/字进度）⑥LRC 与 md3-lyric JSON 双导出 ⑦草稿刷新持久 ⑧K 零 pageerror
// 范式同 e2e-v122/v123/v124：dev 服务器（E2E_BASE 可覆写，默认 8080）。两跑收敛。
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const SHOT = new URL('../docs/v910/lyricmaker-app.png', import.meta.url).pathname;
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

// 打开歌词制作器
await page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex(a => a.id === 'lyricmaker'));
});
await sleep(1800);

const lframe = () => page.frames().find(f => f.url().includes('apps/lyricmaker/index.html'));
t('P1 iframe 应用挂载（frame 在册 + core/桥 载入）', !!lframe() && await lframe().evaluate(() =>
  !!window.__lyricCore && !!window.__lyricMakerUI));

// A. 演示载入（6 行预打轴）+ UI 行列表渲染
await lframe().evaluate(() => window.__lyricMakerUI.loadDemo());
await sleep(250);
const demoLines = await lframe().evaluate(() => window.__lyricMakerUI.lines);
t('A1 演示 6 行预打轴', demoLines.length === 6 && demoLines.every(l => l.time != null));
t('A2 行列表 DOM 渲染 6 行', await lframe().evaluate(() => document.querySelectorAll('#list .lrow').length) === 6);

// B. 粘贴 LRC 回读（带标签文本 → parse 路径）
await lframe().evaluate(() => window.__lyricMakerUI.setSrc('[00:05.00]第一句\n[00:12.50]第二句\n无标签句'));
await lframe().evaluate(() => window.__lyricMakerUI.loadFromText());
await sleep(250);
const parsed = await lframe().evaluate(() => window.__lyricMakerUI.lines);
t('B1 LRC 粘贴回读 3 行（未定时行沉底）', parsed.length === 3 && parsed[0].time === 5000 && parsed[2].time == null);

// C. 打点单调化（快打第三下 2000 < 2500 → 钳 2501；先重置为三行未定时纯文本，打点依次分配）
await lframe().evaluate(() => window.__lyricMakerUI.setSrc('第一句\n第二句\n第三句'));
await lframe().evaluate(() => window.__lyricMakerUI.loadFromText());
await sleep(250);
await lframe().evaluate(() => window.__lyricMakerUI.markAt(1000));
await lframe().evaluate(() => window.__lyricMakerUI.markAt(2500));
await lframe().evaluate(() => window.__lyricMakerUI.markAt(2000));
await sleep(250);
const marked = await lframe().evaluate(() => window.__lyricMakerUI.lines.map(l => l.time));
t('C1 三行全定时且单调（快打钳 prev+1）', JSON.stringify(marked) === JSON.stringify([1000, 2500, 2501]),
  marked.join(','));

// D. 逐字对齐生成（码点均分，字数与行文本一致）
await lframe().evaluate(() => window.__lyricMakerUI.genWords());
await sleep(250);
const wordsOk = await lframe().evaluate(() => {
  const ls = window.__lyricMakerUI.lines;
  return ls.every(l => l.words && Array.from(l.text).length === l.words.length &&
    l.words.map(w => w.w).join('') === l.text);
});
t('D1 逐字对齐全行生成（码点一致可回拼）', wordsOk);

// E. 卡拉OK定位（core 直调：1500ms 落行 0 且字进度推进）
const karaoke = await lframe().evaluate(() => {
  const k = window.__lyricCore.karaokeAt(window.__lyricMakerUI.lines, 1500);
  return { idx: k.idx, wi: k.wordIdx, lp: k.lineProgress };
});
t('E1 卡拉OK定位（行 0 命中 + 字推进 + 线性进度）',
  karaoke.idx === 0 && karaoke.wi >= 1 && karaoke.lp > 0 && karaoke.lp < 1,
  `idx=${karaoke.idx} wi=${karaoke.wi} lp=${karaoke.lp.toFixed(2)}`);

// F. 双格式导出（LRC 行级 + md3-lyric JSON 契约）
const lrc = await lframe().evaluate(() => window.__lyricMakerUI.exportLrc());
const json = await lframe().evaluate(() => JSON.parse(window.__lyricMakerUI.exportJsonText()));
t('F1 LRC 导出（[ti:] 头 + 时间标签行）', lrc.startsWith('[ti:') && lrc.includes('[00:01.00]第一句'));
t('F2 md3-lyric JSON v1 契约（format/version/words）', json.format === 'md3-lyric' && json.version === 1 &&
  json.lines.length === 3 && json.lines[0].words.length === Array.from(json.lines[0].text).length);

// G. 草稿刷新持久（saveDraftNow → reload → restore）
const beforeCnt = await lframe().evaluate(() => window.__lyricMakerUI.lines.length);
await lframe().evaluate(() => window.__lyricMakerUI.saveDraftNow());
await sleep(150);
await page.reload({ waitUntil: 'load' });
await sleep(2500);
await page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex(a => a.id === 'lyricmaker'));
});
await sleep(1800);
const afterCnt = await lframe().evaluate(() => window.__lyricMakerUI.lines.length);
t('G1 草稿刷新持久（重开应用行数一致）', afterCnt === beforeCnt, `${beforeCnt}→${afterCnt}`);

// H. 模拟播放 + 空格打点（真实 UI 路径：sim 开启后 now() 推进，Space 走 markAt）
await lframe().evaluate(() => document.getElementById('simBtn').click());
await sleep(700);
const simNow = await lframe().evaluate(() => window.__lyricMakerUI.now());
t('H1 模拟播放时钟推进（now > 0）', simNow > 0, `now=${Math.round(simNow)}ms`);
await lframe().evaluate(() => window.__lyricMakerUI.saveDraftNow());

// K. 全程零 pageerror
t('K1 零 pageerror 全程', errors.length === 0, errors[0] || '');

// 截图留痕
try {
  mkdirSync(new URL('../docs/v910/', import.meta.url).pathname, { recursive: true });
  await page.screenshot({ path: SHOT });
} catch (e) { /* 截图失败不判失败 */ }

await browser.close();
console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
