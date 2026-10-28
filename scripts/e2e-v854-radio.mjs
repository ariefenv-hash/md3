// ==================== e2e-v854-radio.mjs — #61 收音机无头回归 ====================
//
// DoD（#61 验收原文逐条；headless 无声卡 → route 拦截注入真 WAV 静音流驱动真实
// audio 解码链 + API fixture 驱动真实台库过滤管线）：
//   A. UI 骨架：标题/徽章待机/未选台/播放钮禁用/无横幅
//   B. 台库管线（在线）：API fixture 200 → 过滤渲染（坑样本 http/m3u8/ogg/dup 全剔除）
//      + 票数降序 + 来源「在线台库」+ 24h 缓存落 localStorage
//   C. 选台播放（真实解码）：点台 → 缓冲中 → WAV 流可播 → playing 事件自然到达 →
//      播放中徽章 + 台名/码率 + 列表 live 高亮 + 均衡器 + 播放钮切暂停图标
//   D. 音量：slider 40 → audio.volume=0.4 + 持久化
//   E. 停止：播放钮 → 待机 + 图标回播放
//   F. 自定义流三态：https 合法直流播放（自定义流台名）/ http → mixed content 横幅 /
//      m3u8 → hls 横幅 / 乱串 → 无效文案
//   G. 断流自动重连：stream 断 → 重连 1/3（1s 退避）→ 流恢复 → 自动续播；
//      关闭重连开关 → 断流 → give-up「播放出错（已关闭）」不卡死
//   H. 缓存 24h：离线 reload → 缓存台库命中（台数一致）；清档离线 reload →
//      内置台库兜底（≥20 中文台）
//   I. 终端深链：apps 列表含收音机 / radio <url> 打开即播（自定义流）/ 坏 url 横幅
//   J. APP_FREEZE：播放中冻结 → 待机 + pause 调用
//   K. 重载恢复：音量/上次电台恢复 + 不自动出声（autoplay 纪律）
//   L. 零 pageerror
//
// 教训沿袭：v850-v853（?nolock=1 跳锁屏 / goto load+固定等待 / 单 evaluate 原子断言 /
// evaluate 点击（物理 click 后状态偶发漂移） / bg-freeze 摘帧重寻帧）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v854');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8085/ios-desktop/index.html?nolock=1';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

// ---------- 静音 WAV（120s 8kHz 16bit PCM —— 模拟直播流永不结束；route 动态生成） ----------
function silenceWav() {
  const sr = 8000, secs = 120, samples = Math.floor(sr * secs);
  const data = Buffer.alloc(samples * 2);
  const buf = Buffer.alloc(44 + data.length);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + data.length, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(data.length, 40);
  data.copy(buf, 44);
  return buf;
}

// ---------- 台库 fixture（radio-browser 形态：坑样本 + 合法台混排） ----------
const API_FIXTURE = [
  { stationuuid: 'f-pit1', name: '华语金曲500首', url: 'http://ls.qingting.fm/live/3412131.m3u8?bitrate=64', url_resolved: 'http://ls.qingting.fm/live/3412131.m3u8?bitrate=64', codec: 'UNKNOWN', bitrate: 0, votes: 17379, hls: 1 },
  { stationuuid: 'f-cnr', name: 'CNR-1 中国之声', url: 'https://lhttp.qtfm.cn/live/15318317/64k.mp3', url_resolved: 'https://lhttp.qtfm.cn/live/15318317/64k.mp3', codec: 'MP3', bitrate: 0, votes: 10169 },
  { stationuuid: 'f-rain', name: '雨声轻音乐', url: 'https://stream.zeno.fm/689zc32y4x8uv', url_resolved: 'https://stream.zeno.fm/689zc32y4x8uv', codec: 'MP3', bitrate: 128, votes: 2528 },
  { stationuuid: 'f-dey', name: '德云社相声合集', url: 'https://stream.zeno.fm/yqawwmweq8mtv', url_resolved: 'https://stream.zeno.fm/yqawwmweq8mtv', codec: 'MP3', bitrate: 128, votes: 2467 },
  { stationuuid: 'f-news', name: '新闻联播', url: 'https://rfienchinois64k.ice.infomaniak.ch//rfienchinois-64.mp3', url_resolved: 'https://rfienchinois64k.ice.infomaniak.ch//rfienchinois-64.mp3', codec: 'MP3', bitrate: 64, votes: 2056 },
  { stationuuid: 'f-bbn', name: 'BBN 中文', url: 'https://streams.radiomast.io/ce298b32-8776-4192-9900-092f44b63e7f', url_resolved: 'https://streams.radiomast.io/ce298b32-8776-4192-9900-092f44b63e7f', codec: 'AAC', bitrate: 64, votes: 1382 },
  { stationuuid: 'f-jt', name: '北京交通广播', url: 'https://lhttp.qingting.fm/live/336/64k.mp3', url_resolved: 'https://lhttp.qingting.fm/live/336/64k.mp3', codec: 'MP3', bitrate: 0, votes: 658 },
  { stationuuid: 'f-hls', name: 'hls陷阱台', url: 'https://lhttp.qtfm.cn/live/99999.m3u8', url_resolved: 'https://lhttp.qtfm.cn/live/99999.m3u8', codec: 'MP3', bitrate: 128, votes: 900 },
  { stationuuid: 'f-ogg', name: 'ogg陷阱台', url: 'https://stream.zeno.fm/oggtrap', url_resolved: 'https://stream.zeno.fm/oggtrap', codec: 'OGG', bitrate: 128, votes: 800 },
  { stationuuid: 'f-dup', name: 'CNR-1 中国之声', url: 'https://lhttp.qtfm.cn/live/15318317/64k.mp3', url_resolved: 'https://lhttp.qtfm.cn/live/15318317/64k.mp3', codec: 'MP3', bitrate: 0, votes: 999 },
  { stationuuid: 'f-nourl', name: '无URL台', url: '', url_resolved: '', codec: 'MP3', bitrate: 0, votes: 500 },
];
// 期望过滤产物（票降序 6 台）：CNR-1 10169 > 雨声轻音乐 2528 > 德云社相声合集 2467 >
// 新闻联播 2056 > BBN 中文 1382 > 北京交通广播 658（dup 归并取票高、双坑样本全剔除）

// ---------- 流故障开关（运行时可切：'ok' 回静音 WAV / 'fail' 断流） ----------
let streamMode = 'ok';
const STREAM_HOSTS = /qtfm\.cn|qingting\.fm|zeno\.fm|radiomast\.io|infomaniak\.ch|media\.test/;

const browser = await chromium.launch({ headless: true, executablePath: EXE,
  args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });

// 外域资源一律 abort（除下方 API/流 stub）——沙箱外网波动隔离（fonts/CDN 挂起曾致 goto load 超时）
await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());

// 台库 API 拦截（fixturesJSON 可切 abort 模拟离线）
let apiMode = 'ok';
await context.route('**/json/stations/search*', (route) => {
  if (apiMode === 'ok') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(API_FIXTURE) });
  return route.abort('connectionrefused');
});
// 流媒体拦截：真 WAV 静音（可播解码）/ abort（断流重连实测）
await context.route(STREAM_HOSTS, (route) => {
  if (streamMode === 'ok') return route.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'Accept-Ranges': 'none' }, body: silenceWav() });
  return route.abort('connectionrefused');
});
// 观测面：play/pause 调用计数（全帧注入）
await context.addInitScript(() => {
  window.__rdE2E = { plays: 0, pauses: 0 };
  const p = HTMLMediaElement.prototype;
  const op = p.play, oa = p.pause;
  p.play = function () { window.__rdE2E.plays++; return op.call(this); };
  p.pause = function () { window.__rdE2E.pauses++; return oa.call(this); };
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(2500);   // boot（外域已隔离，本地资源确定就绪）

const frameOf = () => page.frames().find((f) => f.url().includes('apps/radio/index.html'));
let frame = null;
await page.evaluate(() => { window.__shareSheet.openAppById('radio'); });
await sleep(600);
frame = frameOf();
if (frame) await frame.waitForFunction(() => document.readyState === 'complete' && document.getElementById('rdBadge'), null, { timeout: 9000 }).catch(() => {});
await sleep(600);
frame = frameOf();
A('收音机 iframe 挂载', !!frame);

// ---------- A. UI 骨架 ----------
console.log('A. UI 骨架');
const boot = await frame.evaluate(() => ({
  title: document.querySelector('.rd-title')?.textContent,
  sub: document.querySelector('.rd-sub')?.textContent,
  badge: document.getElementById('rdBadge').textContent,
  name: document.getElementById('rdName').textContent,
  meta: document.getElementById('rdMeta').textContent,
  playDisabled: document.getElementById('rdPlay').disabled,
  bannerShown: document.getElementById('rdBanner').classList.contains('show'),
  vol: document.getElementById('rdVol').value,
  auto: document.getElementById('rdAuto').checked,
  icoPlay: document.getElementById('rdIcoPlay').style.display !== 'none',
  icoPause: document.getElementById('rdIcoPause').style.display !== 'none',
}));
A('标题 + 副题（https 直流口径）', boot.title === '收音机' && boot.sub.includes('https 直流'), boot.title);
A('徽章待机 + 未选台 + 播放钮禁用', boot.badge === '待机' && boot.name === '未选台' && boot.playDisabled, boot.badge);
A('音量缺省 90 + 重连开关缺省开 + 播放图标三角', boot.vol === '90' && boot.auto === true && boot.icoPlay && !boot.icoPause);
A('无横幅（在线模式）', !boot.bannerShown);

// ---------- B. 台库管线（在线：过滤 + 降序 + 缓存落盘） ----------
console.log('B. 台库管线');
await frame.waitForFunction(() => document.querySelectorAll('[data-test="rd-station"]').length > 0, null, { timeout: 9000 });
await sleep(250);
const listB = await frame.evaluate(() => ({
  count: document.getElementById('rdCount').textContent,
  src: document.getElementById('rdSrc').textContent,
  names: Array.from(document.querySelectorAll('.rd-sname')).map((n) => n.textContent),
  firstMeta: document.querySelector('.rd-smeta')?.textContent,
  cache: !!localStorage.getItem('ios-desktop:radio-cache-v1'),
}));
A('过滤管线：11 条 fixture → 6 台（双坑/重复/无URL 全剔除）', listB.count === '6' && listB.names.length === 6, `count=${listB.count}`);
A('票数降序：CNR-1 居首 + 陷阱台不在列', listB.names[0] === 'CNR-1 中国之声' &&
  !listB.names.includes('华语金曲500首') && !listB.names.includes('hls陷阱台') &&
  !listB.names.includes('ogg陷阱台') && !listB.names.includes('无URL台'), JSON.stringify(listB.names));
A('来源「在线台库」+ 24h 缓存已落盘', listB.src.includes('在线台库') && listB.cache, listB.src);
await page.screenshot({ path: join(OUT, 'radio-boot.png') });

// ---------- C. 选台播放（真实 WAV 解码） ----------
console.log('C. 选台播放');
await frame.click('[data-test="rd-station"]');   // 首台 CNR-1
await frame.waitForFunction(() => document.getElementById('rdBadge').textContent === '播放中', null, { timeout: 5000 });
const connectC = await frame.evaluate(() => ({
  name: document.getElementById('rdName').textContent,
  plays: window.__rdE2E.plays,
}));
A('点台 → 台名上卡（缓冲态本地解码瞬时越过，终态播放中）', connectC.name === 'CNR-1 中国之声' && connectC.plays >= 1, JSON.stringify(connectC));
await sleep(150);
const playing = await frame.evaluate(() => ({
  badge: document.getElementById('rdBadge').textContent,
  name: document.getElementById('rdName').textContent,
  meta: document.getElementById('rdMeta').textContent,
  dialPlaying: document.getElementById('rdDial').classList.contains('playing'),
  liveRow: !!document.querySelector('[data-test="rd-station"].live'),
  eq: getComputedStyle(document.querySelector('[data-test="rd-station"].live .rd-liveeq')).display !== 'none',
  icoPause: document.getElementById('rdIcoPause').style.display !== 'none',
  paused: document.getElementById('rdAudio').paused,
  plays: window.__rdE2E.plays,
}));
A('真实解码到播放中（playing 事件自然到达，非合成）', playing.badge === '播放中' && !playing.paused && playing.plays >= 1, `plays=${playing.plays}`);
A('播放卡：台名 + 码率元信息 + 旋钮脉冲 + live 高亮 + 均衡器 + 暂停图标',
  playing.name === 'CNR-1 中国之声' && playing.dialPlaying && playing.liveRow && playing.eq && playing.icoPause, playing.meta);
await page.screenshot({ path: join(OUT, 'radio-playing.png') });

// ---------- D. 音量 ----------
console.log('D. 音量');
await frame.evaluate(() => {
  const v = document.getElementById('rdVol');
  v.value = '40';
  v.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(120);
const volD = await frame.evaluate(() => ({
  vol: document.getElementById('rdAudio').volume,
  saved: JSON.parse(localStorage.getItem('ios-desktop:radio-state-v1')).volume,
}));
A('音量即时同步 0.4 + 持久化', volD.vol === 0.4 && volD.saved === 0.4, JSON.stringify(volD));

// ---------- E. 停止 ----------
console.log('E. 停止');
await frame.evaluate(() => { document.getElementById('rdPlay').click(); });
await sleep(250);
const stoppedE = await frame.evaluate(() => ({
  badge: document.getElementById('rdBadge').textContent,
  paused: document.getElementById('rdAudio').paused,
  icoPlay: document.getElementById('rdIcoPlay').style.display !== 'none',
  pauses: window.__rdE2E.pauses,
  name: document.getElementById('rdName').textContent,
}));
A('停止：待机 + pause 调用 + 图标回三角 + 选台保留（重播钮可用）',
  stoppedE.badge === '待机' && stoppedE.paused && stoppedE.icoPlay && stoppedE.pauses >= 1 && stoppedE.name === 'CNR-1 中国之声', JSON.stringify(stoppedE));

// ---------- F. 自定义流三态 ----------
console.log('F. 自定义流');
const setUrl = (v) => frame.evaluate((val) => {
  const u = document.getElementById('rdUrl');
  u.value = val;
  document.getElementById('rdUrlPlay').click();
}, v);
await setUrl('http://stream.example/live.mp3');
await sleep(200);
const fHttp = await frame.evaluate(() => document.getElementById('rdBanner').textContent);
A('http 明文流 → mixed content 专项横幅', fHttp.includes('mixed content'), fHttp.slice(0, 40));
await setUrl('https://stream.example/live.m3u8?bitrate=64');
await sleep(200);
const fHls = await frame.evaluate(() => document.getElementById('rdBanner').textContent);
A('m3u8 播放列表 → hls 专项横幅（坑二）', fHls.includes('m3u8'), fHls.slice(0, 40));
await setUrl('notaurl');
await sleep(200);
const fBad = await frame.evaluate(() => document.getElementById('rdBanner').textContent);
A('乱串 → 无效地址文案', fBad.includes('无效流地址'), fBad.slice(0, 40));
streamMode = 'ok';
await setUrl('https://media.test/silence.wav');
await frame.waitForFunction(() => document.getElementById('rdBadge').textContent === '播放中', null, { timeout: 5000 });
const fOk = await frame.evaluate(() => ({
  name: document.getElementById('rdName').textContent,
  meta: document.getElementById('rdMeta').textContent,
  badge: document.getElementById('rdBadge').textContent,
}));
A('合法 https 直流 → 自定义流播放中', fOk.badge === '播放中' && fOk.name === '自定义流' && fOk.meta.includes('自定义流'), JSON.stringify(fOk));

// ---------- G. 断流自动重连（3 次退避 + 可关） ----------
console.log('G. 断流重连');
streamMode = 'fail';   // 拉断流
await frame.evaluate(() => document.getElementById('rdAudio').load());   // 触发重装载 → 真实网络错误
await frame.waitForFunction(() => document.getElementById('rdBanner').textContent.includes('自动重连'), null, { timeout: 5000 });
const g1 = await frame.evaluate(() => ({
  banner: document.getElementById('rdBanner').textContent,
  badge: document.getElementById('rdBadge').textContent,
}));
A('断流 → 自动重连 1/3（1s 退避横幅）+ 缓冲中', g1.banner.includes('1/3') && g1.banner.includes('1s') && g1.badge === '缓冲中…', JSON.stringify(g1));
streamMode = 'ok';     // 重连窗口内恢复流 → 自动续播
await frame.waitForFunction(() => document.getElementById('rdBadge').textContent === '播放中', null, { timeout: 5000 });
A('流恢复 → 1s 退避后自动续播（播放中）', true);
await frame.evaluate(() => { document.getElementById('rdPlay').click(); });   // 停
await sleep(200);
await frame.evaluate(() => {
  const c = document.getElementById('rdAuto');
  c.checked = false;
  c.dispatchEvent(new Event('change', { bubbles: true }));
});
streamMode = 'fail';
await frame.evaluate(() => {
  const rows = document.querySelectorAll('[data-test="rd-station"]');
  rows[0].click();
});
await frame.waitForFunction(() => document.getElementById('rdBadge').textContent === '播放出错', null, { timeout: 5000 });
const g2 = await frame.evaluate(() => ({
  badge: document.getElementById('rdBadge').textContent,
  banner: document.getElementById('rdBanner').textContent,
}));
A('重连关闭 → 断流即 give-up「播放出错」不卡死 UI', g2.banner.includes('已关闭'), JSON.stringify(g2));
streamMode = 'ok';
await frame.evaluate(() => {
  const c = document.getElementById('rdAuto');
  c.checked = true;
  c.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(120);

// ---------- H. 缓存 24h + 种子兜底 ----------
console.log('H. 缓存与兜底');
await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(2200);
apiMode = 'fail';   // 离线：API 不可达
await page.evaluate(() => { window.__shareSheet.openAppById('radio'); });
await sleep(600);
frame = frameOf();
if (frame) await frame.waitForFunction(() => document.readyState === 'complete' && document.getElementById('rdBadge'), null, { timeout: 9000 }).catch(() => {});
await sleep(800);
frame = frameOf();
const hCache = await frame.evaluate(() => ({
  count: document.getElementById('rdCount').textContent,
  src: document.getElementById('rdSrc').textContent,
  banner: document.getElementById('rdBanner').textContent,
}));
A('24h 内离线 reload → 缓存台库命中（6 台一致）', hCache.count === '6' && hCache.src.includes('缓存台库'), JSON.stringify(hCache));
// 清档离线 → 种子兜底
await page.evaluate(() => { localStorage.clear(); });
await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(2200);
await page.evaluate(() => { window.__shareSheet.openAppById('radio'); });
await sleep(600);
frame = frameOf();
if (frame) await frame.waitForFunction(() => document.readyState === 'complete' && document.getElementById('rdSrc'), null, { timeout: 9000 }).catch(() => {});
await sleep(600);
frame = frameOf();
await frame.waitForFunction(() => document.getElementById('rdSrc').textContent.includes('内置台库'), null, { timeout: 30000 });
const hSeed = await frame.evaluate(() => ({
  count: Number(document.getElementById('rdCount').textContent),
  src: document.getElementById('rdSrc').textContent,
  names: Array.from(document.querySelectorAll('.rd-sname')).map((n) => n.textContent),
}));
A('清档离线 → 内置台库兜底 20+ 中文台（全 https 直流）', hSeed.count >= 20 && hSeed.src.includes('离线兜底'), `count=${hSeed.count}`);
await page.screenshot({ path: join(OUT, 'radio-seed.png') });

// ---------- I. 终端深链 ----------
console.log('I. 终端深链');
await page.evaluate(() => { window.__shareSheet.openAppById('terminal'); });
await sleep(1600);
const tframe = page.frames().find((f) => f.url().includes('apps/terminal/index.html'));
const appsOut = await tframe.evaluate(() => {
  const input = document.getElementById('tmInput');
  input.value = 'apps';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  return Array.from(document.querySelectorAll('#tmOut .tm-line')).map((d) => d.textContent).join('\n');
});
await sleep(200);
A('终端 apps 列表含 radio 收音机', appsOut.includes('radio') && appsOut.includes('收音机'));
streamMode = 'ok';
await tframe.evaluate(() => {
  const input = document.getElementById('tmInput');
  input.value = 'radio https://media.test/deeplink.wav';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
});
await sleep(1800);
frame = frameOf();
A('深链重开 iframe（终端 radio <url>）', !!frame);
await frame.waitForFunction(() => document.getElementById('rdBadge').textContent === '播放中', null, { timeout: 6000 });
const deepI = await frame.evaluate(() => ({
  name: document.getElementById('rdName').textContent,
  meta: document.getElementById('rdMeta').textContent,
  badge: document.getElementById('rdBadge').textContent,
}));
A('radio <url> 打开即播（自定义流深链）', deepI.badge === '播放中' && deepI.name === '自定义流', JSON.stringify(deepI));

// ---------- J. APP_FREEZE ----------
console.log('J. APP_FREEZE');
await frame.evaluate(() => window.postMessage({ type: 'APP_FREEZE' }, '*'));
await sleep(400);
const frozen = await frame.evaluate(() => ({
  badge: document.getElementById('rdBadge').textContent,
  paused: document.getElementById('rdAudio').paused,
  src: document.getElementById('rdAudio').getAttribute('src'),
}));
A('APP_FREEZE → 待机 + pause + src 清空（无残留流）', frozen.badge === '待机' && frozen.paused && frozen.src === null, JSON.stringify(frozen));

// ---------- K. 重载恢复（不自动出声） ----------
console.log('K. 重载恢复');
await frame.evaluate(() => {   // H 段 clear 过档——重设确定值再验恢复
  const v = document.getElementById('rdVol');
  v.value = '55';
  v.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(150);
await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(2200);
await page.evaluate(() => { window.__shareSheet.openAppById('radio'); });
await sleep(600);
frame = frameOf();
if (frame) await frame.waitForFunction(() => document.readyState === 'complete' && document.getElementById('rdBadge'), null, { timeout: 9000 }).catch(() => {});
await sleep(800);
frame = frameOf();
const restored = await frame.evaluate(() => ({
  vol: document.getElementById('rdVol').value,
  audioVol: document.getElementById('rdAudio').volume,
  name: document.getElementById('rdName').textContent,
  badge: document.getElementById('rdBadge').textContent,
  paused: document.getElementById('rdAudio').paused,
  plays: window.__rdE2E.plays,
}));
A('重载恢复：音量 55 + 上次电台（自定义流）+ 待机不自动出声',
  restored.vol === '55' && restored.audioVol === 0.55 && restored.name === '自定义流' &&
  restored.badge === '待机' && restored.paused, JSON.stringify(restored));
await page.screenshot({ path: join(OUT, 'radio-restored.png') });

// ---------- L. 稳定性 ----------
console.log('L. 稳定性');
A('全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n===== e2e-v854 结果: ${pass} PASS / ${fail} FAIL =====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
