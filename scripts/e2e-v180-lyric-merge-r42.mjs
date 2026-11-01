// v9.13 = #180 lyricmaker 并入 music（R42 轮）无头回归小判据：
// ①music iframe 挂载（lyric-core + 只读桥）②二级界面开合（入口按钮真实点击路径）
// ③演示/粘贴载入 ④打点单调化 ⑤逐字对齐 ⑥卡拉OK定位 ⑦双导出
// ⑧存入曲库 VFS /music/<ti>.lrc（跨 frame 真实 VFS 顶栏复核）⑨草稿 VFS 刷新持久 ⑩K 零 pageerror
// 范式同 e2e-v121/v122：dev 服务器（E2E_BASE 可覆写，默认 8080）。两跑收敛。
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const SHOT = new URL('../docs/v913/lyric-merge-music.png', import.meta.url).pathname;
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

// 打开音乐应用（歌词制作已并入，无独立 lyricmaker 应用）
const openMusic = () => page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex(a => a.id === 'music'));
});
await openMusic();
await sleep(2000);

const mframe = () => page.frames().find(f => f.url().includes('apps/music/index.html'));
t('P1 music iframe 挂载（lyric-core/桥 载入，独立 lyricmaker 应用已不在册）', !!mframe() && await mframe().evaluate(() =>
  !!window.__lyricCore && !!window.__lyricMakerUI));
t('P2 独立应用撤号：apps-data 无 lyricmaker 条目', await page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  return initialApps.every(a => a.id !== 'lyricmaker') && initialApps.length === 48;
}));

// A. 二级界面开合（真实按钮路径：header 入口 → 打开；返回键 → 关闭）
await mframe().evaluate(() => document.getElementById('btnLyricMaker').click());
await sleep(400);
t('A1 入口按钮打开二级界面（lyricMakerView 可见）', await mframe().evaluate(() =>
  document.getElementById('lyricMakerView').style.display === 'block' && window.__lyricMakerUI.isOpen));
await mframe().evaluate(() => document.getElementById('btnLmBack').click());
await sleep(300);
t('A2 返回键关闭（视图复原 empty/workspace 态）', await mframe().evaluate(() =>
  document.getElementById('lyricMakerView').style.display === 'none' && !window.__lyricMakerUI.isOpen));
await mframe().evaluate(() => window.__lyricMakerUI.openPanel());
await sleep(500);

// B. 演示载入 + 行列表渲染
await mframe().evaluate(() => window.__lyricMakerUI.loadDemo());
await sleep(300);
const demoLines = await mframe().evaluate(() => window.__lyricMakerUI.lines);
t('B1 演示 6 行预打轴', demoLines.length === 6 && demoLines.every(l => l.time != null));
t('B2 行列表 DOM 渲染 6 行', await mframe().evaluate(() => document.querySelectorAll('#lmList .lm-lrow').length) === 6);

// C. 粘贴 LRC 回读 + 打点单调化（先重置为纯文本三行）
await mframe().evaluate(() => window.__lyricMakerUI.setSrc('第一句\n第二句\n第三句'));
await mframe().evaluate(() => window.__lyricMakerUI.setTi('星轨'));
await mframe().evaluate(() => window.__lyricMakerUI.loadFromText());
await sleep(250);
await mframe().evaluate(() => { const u = window.__lyricMakerUI; u.markAt(1000); u.markAt(2500); u.markAt(2000); });
await sleep(250);
const marked = await mframe().evaluate(() => window.__lyricMakerUI.lines.map(l => l.time));
t('C1 三行全定时且单调（快打钳 prev+1）', JSON.stringify(marked) === JSON.stringify([1000, 2500, 2501]), marked.join(','));

// D. 逐字对齐 + 卡拉OK定位
await mframe().evaluate(() => window.__lyricMakerUI.genWords());
await sleep(250);
const wordsOk = await mframe().evaluate(() => {
  const ls = window.__lyricMakerUI.lines;
  return ls.every(l => l.words && Array.from(l.text).length === l.words.length &&
    l.words.map(w => w.w).join('') === l.text);
});
t('D1 逐字对齐全行生成（码点一致可回拼）', wordsOk);
const karaoke = await mframe().evaluate(() => {
  const k = window.__lyricCore.karaokeAt(window.__lyricMakerUI.lines, 1500);
  return { idx: k.idx, wi: k.wordIdx, lp: k.lineProgress };
});
t('D2 卡拉OK定位（行 0 命中 + 字推进）', karaoke.idx === 0 && karaoke.wi >= 1 && karaoke.lp > 0 && karaoke.lp < 1,
  `idx=${karaoke.idx} wi=${karaoke.wi}`);

// E. 双格式导出
const lrc = await mframe().evaluate(() => window.__lyricMakerUI.exportLrc());
const json = await mframe().evaluate(() => JSON.parse(window.__lyricMakerUI.exportJsonText()));
t('E1 LRC 导出（[ti:] 头 + 时间标签行）', lrc.startsWith('[ti:星轨]') && lrc.includes('[00:01.00]第一句'));
t('E2 md3-lyric JSON v1 契约', json.format === 'md3-lyric' && json.version === 1 && json.lines.length === 3);

// F. 存入曲库：VFS /music/星轨.lrc（跨 frame 顶栏读同一 VFS 复核）
const savedPath = await mframe().evaluate(() => window.__lyricMakerUI.saveToLibrary());
await sleep(400);
t('F1 存入曲库返回 VFS 路径', savedPath === '/music/星轨.lrc', String(savedPath));
let f2 = null;
for (let i = 0; i < 10 && !(f2 && f2.ok); i++) {
  await sleep(300);
  f2 = await page.evaluate(async (p) => {
    const vfs = window.__vfs || (window.__system && window.__system.fs);
    if (!vfs) return { ok: false, why: 'no-vfs' };
    try {
      const txt = typeof vfs.readText === 'function' ? await vfs.readText(p)
        : await vfs.read(p).then(r => (r && r.text != null) ? r.text : (r && r.blob ? r.blob.text() : null));
      return { ok: !!txt && txt.includes('[ti:星轨]') && txt.includes('[00:01.00]第一句'),
        list: (await vfs.list('/music')).map(e => e.name).join(','), head: txt ? String(txt).slice(0, 24) : 'null' };
    } catch (e) { return { ok: false, why: String(e) }; }
  }, savedPath);
}
t('F2 顶栏同 VFS 读回 .lrc 内容一致', !!(f2 && f2.ok), JSON.stringify(f2));

// G. 草稿 VFS 刷新持久（saveDraftNow → reload → 重开二级界面自动恢复）
const beforeCnt = await mframe().evaluate(() => window.__lyricMakerUI.lines.length);
await mframe().evaluate(() => window.__lyricMakerUI.saveDraftNow());
await sleep(500);
await page.reload({ waitUntil: 'load' });
await sleep(2500);
await openMusic();
await sleep(2000);
await mframe().evaluate(() => window.__lyricMakerUI.openPanel());
await sleep(700);
const afterCnt = await mframe().evaluate(() => window.__lyricMakerUI.lines.length);
t('G1 草稿 VFS 刷新持久（重开应用行数一致，无 localStorage 键）', afterCnt === beforeCnt, `${beforeCnt}→${afterCnt}`);

// H. 关闭复原 + 模拟播放时钟
await mframe().evaluate(() => window.__lyricMakerUI.closePanel());
await sleep(300);
t('H1 关闭后视图复原', await mframe().evaluate(() =>
  document.getElementById('lyricMakerView').style.display === 'none'));
await mframe().evaluate(() => window.__lyricMakerUI.openPanel());
await mframe().evaluate(() => document.getElementById('lmSimBtn').click());
await sleep(700);
const simNow = await mframe().evaluate(() => window.__lyricMakerUI.now());
t('H2 模拟播放时钟推进（now > 0）', simNow > 0, `now=${Math.round(simNow)}ms`);
await mframe().evaluate(() => window.__lyricMakerUI.saveDraftNow());

// K. 全程零 pageerror
t('K1 零 pageerror 全程', errors.length === 0, errors[0] || '');

// 截图留痕
try {
  mkdirSync(new URL('../docs/v913/', import.meta.url).pathname, { recursive: true });
  await page.screenshot({ path: SHOT });
} catch (e) { /* 截图失败不判失败 */ }

await browser.close();
console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
