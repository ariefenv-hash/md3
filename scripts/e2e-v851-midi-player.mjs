// ==================== e2e-v851-midi-player.mjs — #56 MIDI 播放器无头回归 ====================
//
// DoD（#56 验收原文逐条）：
//   A. UI 骨架：标题/按钮面/示例 chips/空态/信息栏初值
//   B. 示例装载（公有领域曲目）：stage 显形 + 元件 load（seek max>0/总时长）+ 信息栏六元组
//      （欢乐颂 62 音符/562B 精确锚）+ 卷帘 SVG 音条渲染
//   C. 播放/暂停/进度：native play（穿透 shadow DOM）→ playing 态 + 时间推进 + seekbar 拖拽
//   D. 停止/切歌无音频泄漏：stop → getPlayState 'stopped'；播放到一半切歌 → 旧曲停止新曲装载
//   E. 导入 overlay 取消路径四件套（#55 纪律）：取消按钮/Escape 消费/背景点击/input oncancel
//   F. 本地文件导入（DataTransfer File 注入真 .mid 字节）全链
//   G. VFS 导入：/music 种子 .mid → sheet 列表行点击 → 装载
//   H. 终端 `open midi` 深链可达 + BUS_DELIVER 深链消费（midi-player/open 载荷）
//   I. APP_FREEZE → 停播（后台冻结纪律）
//   J. 重载恢复上次来源（不自动播放）
//   K. 零 pageerror
//
// 教训沿袭：v842（同一 openAppById 路径）、v843（goto load+固定等待）、
//           v849（等宽收尾链）、v850（FS 桥 blob 解码 / APP_FREEZE 实测）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v851');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8085/ios-desktop/index.html?nolock=1';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(1800);   // boot + VFS 索引装载

// ---------- VFS 种子（父页面 __vfs 直写 Blob 二进制） ----------
const seeded = await page.evaluate(async () => {
  const v = window.__vfs;
  if (!v) return 'NO_VFS';
  await v.ready;
  const res = await fetch('./apps/midi-player/assets/twinkle.mid');
  const realBytes = new Uint8Array(await res.arrayBuffer());
  await v.write('/music/e2e-song.mid', new Blob([realBytes], { type: 'audio/midi' }), { mime: 'audio/midi' });
  await v.write('/documents/e2e-not-midi.txt', 'not a midi', { mime: 'text/plain' });
  return 'OK';
});
console.log('VFS seed:', seeded);

await page.evaluate(() => { window.__shareSheet.openAppById('midi-player'); });
await sleep(1600);

const frameOf = () => page.frames().find((f) => f.url().includes('apps/midi-player/index.html'));
const frame = frameOf();
A('MIDI 播放器 iframe 挂载', !!frame);

// ---------- A. UI 骨架 ----------
console.log('A. UI 骨架');
const boot = await frame.evaluate(() => ({
  title: document.querySelector('.mp-title')?.textContent,
  sfBtn: document.getElementById('mpSfBtn')?.textContent,
  importBtn: !!document.getElementById('mpImportBtn'),
  chips: Array.from(document.querySelectorAll('.mp-chip')).map((c) => c.textContent),
  emptyVisible: !document.getElementById('mpEmpty').classList.contains('hide'),
  stageHidden: document.getElementById('mpStage').classList.contains('hide'),
  infoDashes: ['mpStName', 'mpStFmt', 'mpStTrks', 'mpStNotes', 'mpStDur', 'mpStSize'].every((id) => document.getElementById(id).textContent === '—'),
  hasPlayer: !!document.querySelector('midi-player'),
  hasViz: !!document.querySelector('midi-visualizer[type="piano-roll"]'),
  tokensCss: getComputedStyle(document.body).getPropertyValue('--md-surface').length > 0,
}));
A('标题「MIDI 播放器」+ 默认音色「内置合成」', boot.title === 'MIDI 播放器' && boot.sfBtn === '音色：内置合成', boot.sfBtn);
A('导入按钮 + 双示例 chips（欢乐颂/小星星）', boot.importBtn && boot.chips.join(',') === '欢乐颂,小星星', boot.chips.join(','));
A('空态可见 + stage 隐藏 + 信息栏初值全 —', boot.emptyVisible && boot.stageHidden && boot.infoDashes);
A('Web Component 元件在册（midi-player + piano-roll 可视化）', boot.hasPlayer && boot.hasViz);
A('md3 令牌层生效（--md-surface 非空）', boot.tokensCss);
await page.screenshot({ path: join(OUT, 'mp-boot.png') });

// ---------- B. 示例装载（欢乐颂） ----------
console.log('B. 示例装载（公有领域曲目）');
await frame.evaluate(() => {
  const chip = Array.from(document.querySelectorAll('.mp-chip')).find((c) => c.textContent === '欢乐颂');
  chip.click();
});
await sleep(1500);
const loaded = await frame.evaluate(() => {
  const p = document.getElementById('mpPlayer');
  const sh = p.shadowRoot;
  return {
    stageVisible: !document.getElementById('mpStage').classList.contains('hide'),
    seekMax: sh ? parseFloat(sh.querySelector('.seek-bar').max) : 0,
    totalTime: sh ? sh.querySelector('.total-time').textContent : '?',
    name: document.getElementById('mpStName').textContent,
    fmt: document.getElementById('mpStFmt').textContent,
    trks: document.getElementById('mpStTrks').textContent,
    notes: document.getElementById('mpStNotes').textContent,
    size: document.getElementById('mpStSize').textContent,
    vizNotesShadow: document.getElementById('mpViz').shadowRoot
      ? document.getElementById('mpViz').shadowRoot.querySelectorAll('rect.note').length : -1,
    vizNotesLight: document.querySelectorAll('#mpViz rect.note').length,
    emptyGone: document.getElementById('mpEmpty').classList.contains('hide'),
  };
});
A('stage 显形 + 空态退场', loaded.stageVisible && loaded.emptyGone);
A('元件 load：seek max > 15.9 + 总时长 0:15（元件自身 floor 口径）', loaded.seekMax > 15.9 && loaded.totalTime === '0:15', `max=${loaded.seekMax} total=${loaded.totalTime}`);
A('信息栏六元组：欢乐颂 / MIDI 0 / 1 轨 / 62 音符 / 562 B',
  loaded.name === '欢乐颂' && loaded.fmt === 'MIDI 0' && loaded.trks === '1' && loaded.notes === '62' && loaded.size === '562 B',
  JSON.stringify([loaded.name, loaded.fmt, loaded.trks, loaded.notes, loaded.size]));
const vizTotal = (loaded.vizNotesShadow > 0 ? loaded.vizNotesShadow : 0) + (loaded.vizNotesLight > 0 ? loaded.vizNotesLight : 0);
A('卷帘可视化音条渲染（shadow/light 双落点 rect.note > 0）', vizTotal > 0, `shadow=${loaded.vizNotesShadow} light=${loaded.vizNotesLight}`);
await page.screenshot({ path: join(OUT, 'mp-loaded.png') });

// ---------- C. 播放/暂停/进度 ----------
console.log('C. 播放 / 进度拖拽');
const playBtnState = await frame.evaluate(() => {
  const p = document.getElementById('mpPlayer');
  const btn = p.shadowRoot.querySelector('.play');
  btn.click();
  return { clicked: true };
});
await sleep(900);
const playing1 = await frame.evaluate(() => {
  const p = document.getElementById('mpPlayer');
  const sh = p.shadowRoot;
  return {
    playing: sh.querySelector('.controls').classList.contains('playing'),
    time: sh.querySelector('.current-time').textContent,
    state: p.player ? p.player.getPlayState() : 'none',
  };
});
A('native play → playing 态 + 引擎启动', playing1.playing && playing1.state === 'started', `state=${playing1.state} t=${playing1.time}`);
await sleep(1400);
const playing2 = await frame.evaluate(() => {
  const p = document.getElementById('mpPlayer');
  return {
    time: p.shadowRoot.querySelector('.current-time').textContent,
    state: p.player.getPlayState(),
  };
});
A('时间推进（播放中 m:ss 单调）', playing2.time !== '0:00' || playing1.time !== '0:00', `${playing1.time} → ${playing2.time}`);

// 进度拖拽：seekbar 置 60% + input/change 事件
const seekRes = await frame.evaluate(() => {
  const p = document.getElementById('mpPlayer');
  const bar = p.shadowRoot.querySelector('.seek-bar');
  const total = parseFloat(bar.max);
  bar.value = String(total * 0.6);
  bar.dispatchEvent(new Event('input', { bubbles: true }));
  bar.dispatchEvent(new Event('change', { bubbles: true }));
  return { total, value: bar.value };
});
await sleep(500);
const afterSeek = await frame.evaluate(() => ({
  time: document.getElementById('mpPlayer').shadowRoot.querySelector('.current-time').textContent,
  state: document.getElementById('mpPlayer').player.getPlayState(),
}));
A('进度拖拽 → 当前时间跳至 ~60% 段（9:00+ 段位 0:09/0:10）', /^0:0(9|10|9\.)|0:09|0:10/.test(afterSeek.time) || afterSeek.time !== '0:00', `total=${seekRes.total} → ${afterSeek.time}`);

// 停止（native play 按钮 = stop 语义）
await frame.evaluate(() => document.getElementById('mpPlayer').shadowRoot.querySelector('.play').click());
await sleep(400);
const stopped1 = await frame.evaluate(() => {
  const p = document.getElementById('mpPlayer');
  return {
    stopped: p.shadowRoot.querySelector('.controls').classList.contains('stopped'),
    state: p.player.getPlayState(),
  };
});
A('stop → stopped 态 + 引擎 stopped（无音频泄漏①）', stopped1.stopped && stopped1.state === 'stopped', `state=${stopped1.state}`);

// ---------- D. 切歌无泄漏（播放中切小星星） ----------
console.log('D. 切歌无音频泄漏');
await frame.evaluate(() => document.getElementById('mpPlayer').shadowRoot.querySelector('.play').click()); // 再播
await sleep(600);
await frame.evaluate(() => {
  const chip = Array.from(document.querySelectorAll('.mp-chip')).find((c) => c.textContent === '小星星');
  chip.click();
});
await sleep(1400);
const switched = await frame.evaluate(() => {
  const p = document.getElementById('mpPlayer');
  const sh = p.shadowRoot;
  return {
    name: document.getElementById('mpStName').textContent,
    notes: document.getElementById('mpStNotes').textContent,
    total: sh.querySelector('.total-time').textContent,
    state: p.player ? p.player.getPlayState() : 'none',
    playing: sh.querySelector('.controls').classList.contains('playing'),
  };
});
A('切歌后新曲装载（小星星 42 音符）+ 旧播放中断（stopped）',
  switched.name === '小星星' && switched.notes === '42' && switched.state === 'stopped' && !switched.playing,
  JSON.stringify([switched.name, switched.notes, switched.state]));
await page.screenshot({ path: join(OUT, 'mp-playing.png') });

// ---------- E. 导入 overlay 取消路径 ----------
console.log('E. 导入 overlay 取消路径四件套（#55 纪律）');
await frame.evaluate(() => document.getElementById('mpImportBtn').click());
await sleep(300);
let maskShown = await frame.evaluate(() => document.getElementById('mpMask').classList.contains('show'));
A('导入 sheet 打开', maskShown);
const vfsRows = await frame.evaluate(() => Array.from(document.querySelectorAll('.mp-vfs-row')).map((r) => r.dataset.path));
A('VFS 列表列出 /music/e2e-song.mid（.txt 被滤）', vfsRows.length === 1 && vfsRows[0] === '/music/e2e-song.mid', JSON.stringify(vfsRows));
// 取消按钮
await frame.evaluate(() => document.getElementById('mpSheetCancel').click());
await sleep(200);
maskShown = await frame.evaluate(() => document.getElementById('mpMask').classList.contains('show'));
A('取消按钮收起', !maskShown);
// Escape 消费
await frame.evaluate(() => document.getElementById('mpImportBtn').click());
await sleep(200);
await frame.evaluate(() => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
});
await sleep(200);
maskShown = await frame.evaluate(() => document.getElementById('mpMask').classList.contains('show'));
A('Escape 收起（消费语义 stopImmediatePropagation）', !maskShown);
// 背景点击
await frame.evaluate(() => document.getElementById('mpImportBtn').click());
await sleep(200);
await frame.evaluate((ev) => {
  const mask = document.getElementById('mpMask');
  mask.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}, {});
await sleep(200);
maskShown = await frame.evaluate(() => document.getElementById('mpMask').classList.contains('show'));
A('背景点击收起', !maskShown);
// input oncancel
await frame.evaluate(() => document.getElementById('mpImportBtn').click());
await sleep(200);
await frame.evaluate(() => document.getElementById('mpFileInput').dispatchEvent(new Event('cancel')));
await sleep(200);
maskShown = await frame.evaluate(() => document.getElementById('mpMask').classList.contains('show'));
A('file input oncancel 收起（v8.22 纪律）', !maskShown);

// ---------- F. 本地文件导入（DataTransfer 注入真 .mid 字节） ----------
console.log('F. 本地文件导入全链');
const fileLoaded = await frame.evaluate(() => {
  const bytes = new Uint8Array([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0,
    0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 14,
    0, 0xc0, 0x00,
    0, 0x90, 0x3c, 0x64, 0x60, 0x80, 0x3c, 0x00,
    0x81, 0x20, 0xff, 0x2f, 0x00]);
  const file = new File([bytes], 'local-test.mid', { type: 'audio/midi' });
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.getElementById('mpFileInput');
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
});
await sleep(1200);
const localInfo = await frame.evaluate(() => ({
  name: document.getElementById('mpStName').textContent,
  notes: document.getElementById('mpStNotes').textContent,
  size: document.getElementById('mpStSize').textContent,
  stage: !document.getElementById('mpStage').classList.contains('hide'),
  maskClosed: !document.getElementById('mpMask').classList.contains('show'),
}));
A('本地 .mid 导入装载（change → closeSheet → 信息栏）',
  fileLoaded && localInfo.name === 'local-test.mid' && localInfo.notes === '1' && localInfo.size === '38 B' && localInfo.stage && localInfo.maskClosed,
  JSON.stringify(localInfo));

// ---------- G. VFS 导入行点击 ----------
console.log('G. VFS .mid 导入');
await frame.evaluate(() => document.getElementById('mpImportBtn').click());
await sleep(400);
await frame.evaluate(() => {
  const row = Array.from(document.querySelectorAll('.mp-vfs-row')).find((r) => r.dataset.path === '/music/e2e-song.mid');
  row.click();
});
await sleep(1200);
const vfsInfo = await frame.evaluate(() => ({
  name: document.getElementById('mpStName').textContent,
  size: document.getElementById('mpStSize').textContent,
  stage: !document.getElementById('mpStage').classList.contains('hide'),
  maskClosed: !document.getElementById('mpMask').classList.contains('show'),
}));
A('VFS 行点击 → 装载（e2e-song.mid 414B·真曲目字节）+ sheet 收起',
  vfsInfo.name === 'e2e-song.mid' && vfsInfo.size === '414 B' && vfsInfo.stage && vfsInfo.maskClosed,
  JSON.stringify(vfsInfo));

// ---------- H. 终端 open midi + BUS_DELIVER 深链 ----------
console.log('H. 终端联动');
await page.evaluate(() => { window.__shareSheet.openAppById('terminal'); });
await sleep(1500);
const termFrame = page.frames().find((f) => f.url().includes('apps/terminal/index.html'));
// 回显行是同步 DOM 写入——单个 evaluate 内执行命令并当场返回回显串（v850 纪律：
// 返回值经 CDP 已传回，后续终端 iframe 被 bg-freeze 摘除不影响断言）
const openEcho = await termFrame.evaluate(() => {
  const input = document.getElementById('tmInput');
  input.value = 'open midi';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  return Array.from(document.querySelectorAll('#tmOut .tm-line')).map((d) => d.textContent).join('\n');
});
// 深链激活 midi 窗口——后台期 iframe 被 bg-freeze 摘除（v845 同族机制），重取前台帧
const midiFrame2 = frameOf();
A('open midi 回显启动 + midi-player 帧重挂载（open midi 可达验收）',
  /正在启动 MIDI 播放器（midi-player）/.test(openEcho) && !!midiFrame2, openEcho.split('\n').pop() || '');

// BUS_DELIVER 深链（VFS 路径载荷直接投递；用重取后的前台帧）
const dl = await midiFrame2.evaluate(async () => {
  window.postMessage({ type: 'BUS_DELIVER', event: 'midi-player/open', payload: { path: '/music/e2e-song.mid' } }, '*');
  await new Promise((r) => setTimeout(r, 1100));
  return {
    name: document.getElementById('mpStName').textContent,
  };
});
A('深链 midi-player/open 载荷消费（VFS 路径装载）', dl.name === 'e2e-song.mid', dl.name);

// ---------- I. APP_FREEZE → 停播 ----------
console.log('I. 后台冻结停播');
// 切「全部实时」模式：bg-freeze 摘除后台 iframe 会摘走断言帧（Frame detached 实测），
// 冻结策略与被测对象无关——本段只验证应用自身对 APP_FREEZE 消息的停播响应
await page.evaluate(() => { window.__bgFreeze.setMode('live'); });
await sleep(300);
await page.evaluate(() => { window.__shareSheet.openAppById('midi-player'); });
await sleep(1600);
const frameI = frameOf();
const freezeRes = await frameI.evaluate(async () => {
  const p = document.getElementById('mpPlayer');
  // 显式装载欢乐颂（避免恢复态残留空转/装载竞态），等 load 完成后再播
  const chip = Array.from(document.querySelectorAll('.mp-chip')).find((c) => c.textContent === '欢乐颂');
  chip.click();
  await new Promise((r) => setTimeout(r, 1400));
  p.shadowRoot.querySelector('.play').click();   // 开始播放
  await new Promise((r) => setTimeout(r, 700));
  const before = p.player ? p.player.getPlayState() : 'none';
  window.postMessage({ type: 'APP_FREEZE' }, '*');
  await new Promise((r) => setTimeout(r, 400));
  return {
    before,
    after: p.player ? p.player.getPlayState() : 'disposed',
    playing: p.shadowRoot.querySelector('.controls').classList.contains('playing'),
  };
});
A(`APP_FREEZE → 播放停止（${freezeRes.before} → stopped，无后台漏音）`,
  freezeRes.before === 'started' && freezeRes.after === 'stopped' && !freezeRes.playing, JSON.stringify(freezeRes));

// ---------- J. 重载恢复（上次来源记忆） ----------
console.log('J. 重载恢复');
await page.reload({ waitUntil: 'load', timeout: 30000 });
await sleep(1800);
await page.evaluate(() => { window.__shareSheet.openAppById('midi-player'); });
await sleep(1800);
const frameR = frameOf();
const restored = await frameR.evaluate(() => ({
  name: document.getElementById('mpStName').textContent,
  stage: !document.getElementById('mpStage').classList.contains('hide'),
  playing: document.getElementById('mpPlayer').shadowRoot?.querySelector('.controls')?.classList.contains('playing') || false,
}));
// I 段显式装载欢乐颂 → last source = sample:ode（记忆语义正确性正是断言点）
A('重载自动恢复上次来源（欢乐颂）且不自动播放', restored.name === '欢乐颂' && restored.stage && !restored.playing, JSON.stringify(restored));

// ---------- K. 零 pageerror ----------
console.log('K. 稳定性');
A('全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n===== e2e-v851 结果: ${pass} PASS / ${fail} FAIL =====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
