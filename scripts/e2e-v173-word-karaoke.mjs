// ==================== e2e-v173-word-karaoke.mjs — #173 逐字跟随歌词行为真跑（v9.49） ====================
// music 直开（无桌面注入 → __system 不可用 → SDK 降级路径静默）+ 同批散选 .wav+.lrc pairing
// （真实用户路径：audioFileInput → parseTrackMeta → parseEnhancedLrc 统一链路 → 渲染端 span 化）：
// Q1 同批导入 .wav+.lrc → 曲目装载 + 词级歌词生效（btnLyrics 可见）
// Q2 歌词面板 span 化：.wkw 行 + 逐字 .lw + dataset.t（秒）
// Q3 词级真实时戳 vs estimateWords 均分：同曲两行形态并存
// Q4 点击行1 → active 切换 + 已唱「春」/未唱「风起」逐字推进
// Q5 点行2 前进 → 回点行1 回退（toggle 幂等不残留 + 旧行 sung 清理）
// Q6 零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8945;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/apps`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- node 侧生成 2s 440Hz 正弦 WAV（16bit mono 8000Hz） ----------
function makeWav() {
  const rate = 8000, secs = 2, n = rate * secs;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(12000 * Math.sin(2 * Math.PI * 440 * i / rate)), 44 + i * 2);
  return buf;
}
const WAV = makeWav();

// 词级测试 LRC：行1 逐字标注（真实时戳非均匀）/ 行2 纯行级（estimateWords 均分）/ 行3 超时长尾段
const LRC = '[00:00.20]<00:00.20>春<00:00.60>风<00:01.00>起\n[00:01.00]夜色慢\n[03:00.00]尾段';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // 外域断网（e2e 惯例）

const rowState = (idx) => {
  const rows = document.querySelectorAll('#lyricsList li');
  const li = rows[idx];
  if (!li) return null;
  const spans = Array.from(li.querySelectorAll('.lw'));
  return {
    text: li.textContent,
    active: li.classList.contains('active'),
    wkw: li.classList.contains('wkw'),
    ts: spans.map((s) => Number(s.dataset.t)),
    sung: spans.filter((s) => s.classList.contains('sung')).map((s) => s.textContent),
    unsung: spans.filter((s) => !s.classList.contains('sung')).map((s) => s.textContent),
  };
};

try {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto(`${BASE}/music/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1200);

  // Q1 同批散选 .wav + .lrc（basename 配对 pairing → parseTrackMeta → parseEnhancedLrc）
  await page.setInputFiles('#audioFileInput', [
    { name: 'test.wav', mimeType: 'audio/wav', buffer: WAV },
    { name: 'test.lrc', mimeType: 'text/plain', buffer: Buffer.from(LRC, 'utf-8') },
  ]);
  await sleep(2000);   // 元数据懒解析（fetch blob + parseEnhancedLrc）异步完成
  const q1 = await page.evaluate(() => {
    const btn = document.getElementById('btnLyrics');
    const list = document.getElementById('trackListContainer');
    return {
      btnVisible: btn && btn.style.display !== 'none',
      playlistItems: list ? list.children.length : -1,
      title: document.getElementById('nowTitle') ? document.getElementById('nowTitle').textContent : '',
    };
  });
  A('Q1 同批 .wav+.lrc 导入 → 曲目装载 + 词级歌词生效（按钮可见）',
    q1.btnVisible && q1.playlistItems === 1, `pl=${q1.playlistItems} title=${q1.title}`);

  // Q2/Q3 开面板 → span 化 + 双形态并存
  await page.click('#btnLyrics');
  await sleep(600);
  const q23 = await page.evaluate(() => {
    const rows = document.querySelectorAll('#lyricsList li');
    const states = [];
    for (let i = 0; i < Math.min(3, rows.length); i++) {
      const li = rows[i];
      const spans = Array.from(li.querySelectorAll('.lw'));
      states.push({
        text: li.textContent,
        wkw: li.classList.contains('wkw'),
        ts: spans.map((s) => Number(s.dataset.t)),
      });
    }
    return { panelOn: document.getElementById('lyricsPanel').style.display !== 'none', states };
  });
  A('Q2 歌词面板展开 + 三行全部 span 化（.wkw + 逐字 .lw）',
    q23.panelOn && q23.states.length === 3 && q23.states.every(s => s.wkw && s.ts.length >= 2),
    `states=${JSON.stringify(q23.states.map(s => [s.text, s.ts.length]))}`);
  const l1 = q23.states[0].ts, l2 = q23.states[1].ts;
  A('Q3a 行1 词级真实时戳（0.2/0.6/1.0 非均匀）',
    l1.length === 3 && l1[0] === 0.2 && l1[1] === 0.6 && l1[2] === 1.0, JSON.stringify(l1));
  A('Q3b 行2 无词级 → estimateWords 均分（区间 [1,min(3,dur=2)) 三分）',
    l2.length === 3 && Math.abs(l2[0] - 1) < 0.01 && Math.abs(l2[1] - (1 + 1 / 3)) < 0.01 && Math.abs(l2[2] - (1 + 2 / 3)) < 0.01,
    JSON.stringify(l2));

  // Q4 点击行1 → t=0.2 → active + 已唱「春」（0.2 起）/未唱「风起」
  await page.evaluate(() => { document.querySelectorAll('#lyricsList li')[0].click(); });
  await sleep(700);
  const q4 = await page.evaluate(rowState, 0);
  A('Q4 点击行1 跳转 → active + 「春」sung /「风起」unsung（词级推进）',
    q4 && q4.active && q4.text === '春风起' && q4.sung.join('') === '春' && q4.unsung.join('') === '风起',
    `sung=${JSON.stringify(q4 && q4.sung)} unsung=${JSON.stringify(q4 && q4.unsung)}`);

  // Q5 点行2 前进 → 行2 active 全 span 已唱起点；回点行1 → 行1 active 仅「春」（旧行 sung 清理 + toggle 幂等回退）
  await page.evaluate(() => { document.querySelectorAll('#lyricsList li')[1].click(); });
  await sleep(700);
  const q5a = await page.evaluate((i) => {
    const rows = document.querySelectorAll('#lyricsList li');
    const li = rows[i];
    return {
      active: li.classList.contains('active'),
      sung: Array.from(li.querySelectorAll('.lw.sung')).length,
      total: li.querySelectorAll('.lw').length,
    };
  }, 1);
  await page.evaluate(() => { document.querySelectorAll('#lyricsList li')[0].click(); });
  await sleep(700);
  const q5b = await page.evaluate(rowState, 0);
  const q5c = await page.evaluate(rowState, 1);
  A('Q5a 点击行2 → 行2 active（均分行首字起点已唱）',
    q5a.active && q5a.sung >= 1 && q5a.sung <= q5a.total, `sung=${q5a.sung}/${q5a.total}`);
  A('Q5b 回点行1 → 仅「春」sung（回退幂等）+ 行2 已唱态清理',
    q5b.active && q5b.sung.join('') === '春' && q5c.sung.length === 0,
    `r1=${JSON.stringify(q5b.sung)} r2sung=${q5c.sung.length}`);

  // Q6 零 pageerror
  A('Q6 全程零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (e) {
  A('e2e 异常中断', false, String(e).slice(0, 200));
} finally {
  await browser.close();
  server.kill();
}
const fails = results.filter((r) => !r[0]).length;
console.log(`\n=== e2e-v173: ${results.length - fails}/${results.length} ===`);
process.exit(fails ? 1 : 0);
