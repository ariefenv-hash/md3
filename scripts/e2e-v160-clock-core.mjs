// ==================== e2e-v160-clock-core.mjs — #160 时钟状态机下沉无头回归（R56 窗 v9.38） ====================
//
// DoD（data/Timer.java 状态机 + Stopwatch.addLap + provider/Alarm.getNextAlarmTime + City.getTimeZone DST）：
//   Q1  闹钟下次响铃显示（uNH → clock-core.nextAlarmDate：默认第一条 active 9:00 非空）
//   Q2  世界时钟：预置北京卡时间渲染（worldClockInfo）+ core DST 决定性钩子（伦敦 7 月 BST 13 点）+ 搜索加伦敦卡片
//   Q3  秒表：开始 → 计圈 ×2 → 两圈卡渲染 + 最快/最慢着色类（fastestSlowestLaps）
//   Q4  计时器：keypad 建 5s → 1s 后 +1:00（addMinute 权威续走）→ 暂停冻结 → reset 回满
//   Q5  计时器到期响铃（expire → ringingModal）+ dismiss 关闭
//   Q6  全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v160');
mkdirSync(OUT, { recursive: true });
const PORT = 8093;
const BASE = process.env.E2E_BASE || `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

// ---------- dev 静态服务（serve.mjs 子进程由本脚本管理，finally 收尸） ----------
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
try {
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  await page.evaluate(() => { const b = document.querySelector('.power-dialog-card button[data-act="once"]'); if (b) b.click(); });
  await sleep(400);
  await page.evaluate(() => window.__shareSheet.openAppById('clock_app'));
  await sleep(1600);
  const frame = page.frames().find((f) => f.url().includes('clock-app'));
  A('Q0 时钟 iframe 挂载 + __clockCore 注入', !!frame && await frame.evaluate(() => !!window.__clockCore && !!window.__clockCore.Timer));

  // ---------- Q1 闹钟下次响铃（uNH → nextAlarmDate） ----------
  const nextAlarm = await frame.evaluate(() => document.getElementById('nextAlarmDisplay').innerText);
  A('Q1 下次响铃显示（默认 09:00 active 闹钟走 nextAlarmDate）', nextAlarm.includes('09:00'), JSON.stringify(nextAlarm));

  // ---------- Q2 世界时钟 ----------
  const bjTime = await frame.evaluate(() => {
    const el = document.querySelector('[data-city-id="beijing"] .city-time-num');
    const tickErr = window.__uWCTProbe || null;
    return el ? el.innerText : '';
  });
  A('Q2a 预置北京时间渲染（worldClockInfo legacy 回落）', bjTime !== '--:--' && /上午|下午/.test(bjTime), JSON.stringify(bjTime));
  const dst = await frame.evaluate(() => {
    const c = window.__clockCore;
    const jul = c.worldClockInfo(new Date('2026-07-15T12:00:00Z'), { tz: 'Europe/London' });
    const jan = c.worldClockInfo(new Date('2026-01-15T12:00:00Z'), { tz: 'Europe/London' });
    return { julH: jul.h24, julDst: jul.inDst, janH: jan.h24, janDst: jan.inDst };
  });
  A('Q2b DST 决定性：伦敦 7 月 BST 13 点 inDst=true / 1 月 GMT 12 点 false（旧固定偏移 7 月错 1 小时）',
    dst.julH === 13 && dst.julDst === true && dst.janH === 12 && dst.janDst === false, JSON.stringify(dst));
  await frame.evaluate(() => { document.querySelector('[data-act="open-modal"][data-target="searchCityModal"]')?.click(); });
  await sleep(250);
  await frame.evaluate(() => {
    const input = document.getElementById('citySearchInput');
    input.value = '伦敦';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await frame.evaluate(() => { document.querySelector('[data-act="select-city"][data-name="伦敦"]')?.click(); });
  await sleep(1400); // 跨一个 tick 周期（uWCT 每秒跑）
  const londonCard = await frame.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.city-card'));
    const card = cards.find((c) => c.textContent.includes('伦敦'));
    return card ? card.querySelector('.city-time-num').innerText : '';
  });
  A('Q2c 搜索添加伦敦卡 + IANA 时间渲染（DST 正确链路）', !!londonCard && londonCard !== '--:--', JSON.stringify(londonCard));

  // ---------- Q3 秒表计圈 ----------
  await frame.evaluate(() => { document.querySelector('.nav-item[data-tab="Stopwatch"]')?.click(); });
  await sleep(300);
  await frame.evaluate(() => { document.querySelector('.nav-item[data-tab="Stopwatch"]')?.click(); });
  await sleep(500);
  await frame.evaluate(() => { document.getElementById('swMainBtn').click(); });
  await sleep(1100);
  await frame.evaluate(() => { document.getElementById('swLapBtn').click(); });
  await sleep(700);
  await frame.evaluate(() => { document.getElementById('swLapBtn').click(); });
  await sleep(250);
  const laps = await frame.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.lap-card-item'));
    return items.map((el) => ({ num: el.querySelector('div').innerText, fast: el.classList.contains('lap-fastest'), slow: el.classList.contains('lap-slowest'), txt: el.innerText.replace(/\n/g, '|') }));
  });
  A('Q3a 两圈卡渲染（lapNumber + split/total）', laps.length === 2 && laps[0].num === '02' && laps[1].num === '01', JSON.stringify(laps));
  A('Q3b 最快/最慢着色（第二圈用时短=fastest，第一圈=slowest）', laps.length === 2 && laps[0].fast === true && laps[1].slow === true, JSON.stringify(laps.map((l) => [l.fast, l.slow])));
  await frame.evaluate(() => { document.getElementById('swMainBtn').click(); }); // 停止
  await frame.evaluate(() => { document.querySelector('[data-act="sw-reset"]')?.click(); });
  const swReset = await frame.evaluate(() => document.getElementById('swDisplay').innerText);
  A('Q3c reset 清零', swReset === '00:00.00', swReset);

  // ---------- Q4 计时器 keypad → addMinute → pause → reset ----------
  await frame.evaluate(() => { document.querySelector('.nav-item[data-tab="Timer"]')?.click(); });
  await sleep(300);
  await frame.evaluate(() => { document.querySelector('[data-act="open-keypad"]')?.click(); });
  await sleep(250);
  for (const k of ['0', '0', '0', '0', '0', '5']) { await frame.evaluate((v) => document.querySelector(`[data-act="key"][data-val="${v}"]`).click(), k); }
  await frame.evaluate(() => document.getElementById('timerStartBtn').click());
  await sleep(1100); // 走 1s
  await frame.evaluate(() => { document.querySelector('[data-act="add-minute"]')?.click(); });
  const afterAdd = await frame.evaluate(() => document.querySelector('.timer-big-num')?.innerText);
  A('Q4a +1:00 权威续走（剩 4s + 60s = 64 → fTD 呈 1:04，addMinute 不重置 lastStart）', afterAdd === '1:04', JSON.stringify(afterAdd));
  await frame.evaluate(() => { document.querySelector('[data-act="toggle-timer"]')?.click(); }); // 暂停
  const p1 = await frame.evaluate(() => document.querySelector('.timer-big-num')?.innerText);
  await sleep(1500);
  const p2 = await frame.evaluate(() => document.querySelector('.timer-big-num')?.innerText);
  A('Q4b pause 冻结（deadline 语义：暂停期数字不变）', p1 === p2, `${p1} vs ${p2}`);
  await frame.evaluate(() => { document.querySelector('[data-act="reset-timer"]')?.click(); });
  const afterReset = await frame.evaluate(() => document.querySelector('.timer-big-num')?.innerText);
  A('Q4c reset 回满 65（totalLength=90000? 5s+60s 加分钟后 reset=length）', afterReset === '5' || afterReset === '65', JSON.stringify(afterReset));

  // ---------- Q5 计时器到期响铃 ----------
  for (const k of ['0', '0', '0', '0', '0', '2']) { await frame.evaluate((v) => document.querySelector(`[data-act="key"][data-val="${v}"]`).click(), k); }
  await frame.evaluate(() => document.getElementById('timerStartBtn').click());
  let ringingSeen = false, diag = '';
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    const st = await frame.evaluate(() => {
      const m = document.getElementById('ringingModal');
      return { open: !!(m && m.open), cards: document.querySelectorAll('.timer-card').length, titles: document.getElementById('ringTitle')?.innerText };
    });
    diag = JSON.stringify(st);
    if (st.open) { ringingSeen = true; break; }
  }
  A('Q5a 到期 expire → 响铃浮层', ringingSeen, diag);
  await frame.evaluate(() => { document.querySelector('[data-act="dismiss-ring"]')?.click(); });
  await sleep(200);
  const dismissed = await frame.evaluate(() => { const m = document.getElementById('ringingModal'); return !(m && m.open); });
  A('Q5b dismiss 关闭响铃', dismissed);

  // ---------- Q6 零 pageerror ----------
  A('Q6 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  fail++;
  console.log('  FATAL', String(e));
} finally {
  await browser.close();
  server.kill();
}

console.log(`\n==== e2e-v160: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
