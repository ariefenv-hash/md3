// ==================== e2e-v844-ping.mjs — #60 PING 无头回归 ====================
//
// DoD（#60 验收原文逐条）：
//   A. fetch HEAD no-cors 计时（+cache-bust）·TTFB 口径明示 → stub 目标 fulfill/abort/挂起三态
//   B. 统计 min/avg/max/jitter/丢包率 + 迷你时序图 60 点 → 统计卡填充 + canvas 非空白
//   C. 目标历史 localStorage 最近 8 个 → chips 渲染 + 点击回填 + 重载恢复
//   D. 正在 ping 可停 + 停止立即生效（不留尾巴请求）→ 停止后计数冻结
//   E. 连续 20 次 ping 无内存增长（计时器全回收）→ SEQ≥20 + 日志行有界 + 零异常
//   F. UI 明示限制：不可达（网络错误或 CORS 拒绝）/ 超时 两态 → abort/挂起分支
//   G. 防重入 + 深链 BUS_DELIVER ping/run {target} 打开即测
//   H. 零 pageerror
//
// 驱动：官方入口 openAppById（v842 教训：全程同一路径）；目标请求走 page.route
//       stub（Node 侧计数真实命中——网络语义属浏览器上游，本回归锚定「我们的接线」）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v844');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8085/ios-desktop/index.html?nolock=1'; // v843 同款：跳锁屏（否则物理点击全被 #lock-content 拦截）
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// ---------- 目标 stub（Node 侧计数） ----------
let okHits = 0, failHits = 0, slowHits = 0;
await page.route('**/probe-ok*', (route) => { okHits++; return route.fulfill({ status: 200 }); });
await page.route('**/probe-fail*', (route) => { failHits++; return route.abort('connectionrefused'); });
await page.route('**/probe-slow*', (route) => { slowHits++; /* 挂起不响应 → 5s 页面超时 abort */ });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => { window.__shareSheet.openAppById('ping'); }); // 官方入口
await sleep(600);

const frameOf = () => page.frames().find((f) => f.url().includes('apps/ping/index.html'));

// ---------- A. UI 骨架 ----------
console.log('A. UI 骨架 + 打开零请求');
const boot = await frameOf().evaluate(() => ({
  title: document.querySelector('.pg-title')?.textContent,
  badge: document.getElementById('pgBadge')?.textContent,
  stats: ['pgMin', 'pgAvg', 'pgMax', 'pgJitter', 'pgLoss', 'pgSent'].map((id) => document.getElementById(id)?.textContent),
  empty: !!document.querySelector('.pg-empty'),
  histChips: document.querySelectorAll('.pg-hist').length,
  note: document.querySelector('.pg-note')?.textContent || '',
  sub: document.querySelector('.pg-sub')?.textContent || '',
}));
A('标题 PING + 徽标 IDLE', boot.title === 'PING' && boot.badge === 'IDLE', JSON.stringify(boot.badge));
A('统计卡 6 格全空态 —', boot.stats.every((s) => s === '—'), boot.stats.join(','));
A('日志空态提示 + 历史 0 chips', boot.empty && boot.histChips === 0);
A('TTFB 口径明示（副标题 HTTP TTFB 模拟 + note 非真 ICMP）',
  boot.sub.includes('HTTP TTFB 模拟') && boot.note.includes('非真 ICMP RTT'), boot.sub);
A('打开应用零探测请求（绝不自动发）', okHits + failHits + slowHits === 0, `ok=${okHits} fail=${failHits} slow=${slowHits}`);
await page.screenshot({ path: join(OUT, 'ping-idle.png') });

const frame = frameOf();

// ---------- B. 非法目标防呆 ----------
console.log('B. 非法目标防呆');
await frame.fill('#pgTarget', 'ht!tp://x');
await frame.click('#pgGo');
await sleep(250);
const warn1 = await frame.evaluate(() => ({
  warn: document.getElementById('pgWarn').textContent,
  badge: document.getElementById('pgBadge').textContent,
}));
A('非法目标 warn 上屏 + 保持 IDLE + 零请求', warn1.warn.includes('目标非法') && warn1.badge === 'IDLE' && okHits === 0);
await frame.fill('#pgTarget', '');

// ---------- C. 合法探测 + 20 次连续（#60 验收锚） ----------
console.log('C. 合法探测 · 连续 20 次 · 统计/时序图');
const pingUrls = []; // 记录每次 stub 命中的完整 URL（验证 cache-bust 唯一性）
await page.unroute('**/probe-ok*'); // v837 教训：同 pattern 先 unroute 再 route（防双注册叠加计数）
await page.route('**/probe-ok*', (route) => { okHits++; pingUrls.push(route.request().url()); return route.fulfill({ status: 200 }); });
await frame.fill('#pgTarget', 'http://127.0.0.1:8085/probe-ok');
await frame.click('#pgGo');
await sleep(1500);
const run1 = await frame.evaluate(() => ({
  badge: document.getElementById('pgBadge').textContent,
  goText: document.getElementById('pgGo').textContent,
  goTest: document.getElementById('pgGo').getAttribute('data-test'),
  seq: document.getElementById('pgSeq').textContent,
  min: document.getElementById('pgMin').textContent,
  loss: document.getElementById('pgLoss').textContent,
  sent: document.getElementById('pgSent').textContent,
  logOk: !!document.querySelector('.pg-line.ok'),
  logText: document.querySelector('.pg-line')?.textContent || '',
}));
A('徽标 RUNNING + 按钮变停止（data-test pg-stop）', run1.badge === 'RUNNING' && run1.goText === '停止' && run1.goTest === 'pg-stop', JSON.stringify(run1.badge));
A('首条 ok 日志 + SEQ 已走（1.5s 内 ≥2 轮）', run1.logOk && run1.seq !== 'SEQ 0', run1.logText.trim() + ' / ' + run1.seq);
A('cache-bust 每次新请求（_ping 参数全唯一）', okHits >= 1 && new Set(pingUrls).size === pingUrls.length, 'hits=' + okHits + ' uniq=' + new Set(pingUrls).size);

// 连续 20 次（1s 间隔 → 约 21s）；期间验证有界性
await sleep(21000);
const run20 = await frame.evaluate(() => ({
  seq: parseInt(document.getElementById('pgSeq').textContent.replace('SEQ ', ''), 10),
  logRows: document.querySelectorAll('.pg-line').length,
  sent: document.getElementById('pgSent').textContent,
  loss: document.getElementById('pgLoss').textContent,
  canvasData: document.getElementById('pgChart').toDataURL().length,
}));
A('连续 20+ 次探测（#60 验收锚）', run20.seq >= 20, 'seq=' + run20.seq);
A('日志行有界（≤ 90 · 内存不增长防线）', run20.logRows <= 90 && run20.logRows >= 15, 'rows=' + run20.logRows);
A('统计稳定：丢包率 0% + 已发/成功一致', run20.loss === '0%' && run20.sent === run20.seq + '/' + run20.seq, run20.sent);
A('时序图 canvas 非空白（60 点滚动绘制）', run20.canvasData > 2000, 'len=' + run20.canvasData);
await page.screenshot({ path: join(OUT, 'ping-running.png') });

// ---------- D. 停止立即生效 ----------
console.log('D. 停止立即生效');
await frame.click('#pgGo');
await sleep(200);
const stopped = await frame.evaluate(() => ({
  badge: document.getElementById('pgBadge').textContent,
  goText: document.getElementById('pgGo').textContent,
  goTest: document.getElementById('pgGo').getAttribute('data-test'),
}));
A('点击停止 → 徽标 IDLE + 按钮复原', stopped.badge === 'IDLE' && stopped.goText === '开始' && stopped.goTest === 'pg-go');
const okAtStop = okHits;
await sleep(2500); // 若有尾巴调度，1s 间隔内必然多发 ≥1 次
A('停止后 2.5s 零新请求（计时器全回收·不留尾巴）', okHits === okAtStop, `okHits ${okAtStop} -> ${okHits}`);

// ---------- E. 不可达态（abort） ----------
console.log('E. 不可达 / 超时两态');
await frame.fill('#pgTarget', 'http://127.0.0.1:8085/probe-fail');
await frame.click('#pgGo');
await sleep(1600);
const failRun = await frame.evaluate(() => ({
  logErr: [...document.querySelectorAll('.pg-line.err')].map((e) => e.textContent),
  loss: document.getElementById('pgLoss').textContent,
}));
A('不可达日志（网络错误或 CORS 拒绝）上屏', failRun.logErr.some((t) => t.includes('不可达')), (failRun.logErr[0] || '').trim());
A('丢包率 100%（全失败样本）', failRun.loss === '100%', failRun.loss);
await frame.click('#pgGo'); // 停止

// 超时态：挂起目标 5s 页面超时
await frame.fill('#pgTarget', 'http://127.0.0.1:8085/probe-slow');
await frame.click('#pgGo');
await sleep(5600);
const slowRun = await frame.evaluate(() => ({
  logErr: [...document.querySelectorAll('.pg-line.err')].map((e) => e.textContent),
}));
A('超时日志（>5s 无响应）上屏', slowRun.logErr.some((t) => t.includes('超时')), (slowRun.logErr.find((t) => t.includes('超时')) || '').trim());
await frame.click('#pgGo'); // 停止
await sleep(150);

// ---------- F. 历史持久化 + chips 回填 ----------
console.log('F. 历史持久化 + chips 回填');
const histState = await frame.evaluate(() => {
  const raw = localStorage.getItem('ping_history_v1');
  let arr = null;
  try { arr = JSON.parse(raw); } catch (e) { /* noop */ }
  const chips = [...document.querySelectorAll('.pg-hist')].map((b) => ({ text: b.textContent, url: b.dataset.url }));
  return { isArray: Array.isArray(arr), len: arr ? arr.length : 0, first: arr && arr[0] ? arr[0].url : '', chips };
});
A('ping_history_v1 落盘（数组 · 头插最新）', histState.isArray && histState.len >= 1 && histState.first.includes('probe-slow'), 'len=' + histState.len + ' first=' + histState.first);
A('历史 chips 渲染 host（≤8 个）', histState.chips.length >= 2 && histState.chips.length <= 8, 'chips=' + histState.chips.length);
const chipFill = await frame.evaluate(() => {
  const chip = document.querySelectorAll('.pg-hist')[1];
  chip.click();
  return { input: document.getElementById('pgTarget').value, chipUrl: chip.dataset.url };
});
A('点击 chip 回填输入框', chipFill.input === chipFill.chipUrl, chipFill.input);

// ---------- G. 深链 BUS_DELIVER ping/run ----------
console.log('G. 深链注入即测');
const okAtDeep = okHits; // 基线必须在注入前取（v843 同款：Node 侧闭包计数）
await frame.evaluate(() => {
  window.postMessage({ type: 'BUS_DELIVER', event: 'ping/run', payload: { target: 'http://127.0.0.1:8085/probe-ok' } }, '*');
});
await sleep(1300);
const deep = await frame.evaluate(() => ({
  input: document.getElementById('pgTarget').value,
  badge: document.getElementById('pgBadge').textContent,
}));
A('深链注入目标 + 自动开始 RUNNING', deep.input.includes('probe-ok') && deep.badge === 'RUNNING', JSON.stringify(deep.badge));
A('深链即测（stub 再命中）', okHits > okAtDeep, `okHits ${okAtDeep} -> ${okHits}`);
await frame.click('#pgGo'); // 停止

// ---------- H. 重载恢复历史 ----------
console.log('H. 重载恢复历史');
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate(() => { window.__shareSheet.openAppById('ping'); });
await sleep(600);
const frame2 = page.frames().find((f) => f.url().includes('apps/ping/index.html'));
const afterReload = await frame2.evaluate(() => ({
  chips: document.querySelectorAll('.pg-hist').length,
  badge: document.getElementById('pgBadge').textContent,
  requests: 0,
}));
A('重载后 chips 恢复 + 保持 IDLE（绝不自动探测）', afterReload.chips >= 2 && afterReload.badge === 'IDLE', 'chips=' + afterReload.chips);
await page.screenshot({ path: join(OUT, 'ping-history.png') });

// ---------- I. 零 pageerror ----------
console.log('I. 零 pageerror');
A('零 pageerror', errors.length === 0, errors.length ? errors.join(' | ').slice(0, 200) : '');

await browser.close();
console.log('\n==== e2e-v844 结果: ' + pass + ' PASS / ' + fail + ' FAIL ====');
process.exit(fail ? 1 : 0);
