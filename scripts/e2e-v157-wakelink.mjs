// ==================== e2e-v157-wakelink.mjs — #157 留点⑥ 起床闹钟展示联动真跑（v10.17 · R105 加餐） ====================
// Q1 默认 disabled → 派生卡不存在
// Q2 enabled 注入（wakeMin=450 上午/days 工作日）→ 卡首渲染 12h 归一 + 重复标签 + 副题
// Q3 点卡 goto-bedtime → pageTitle=睡眠时间 + tabBedtime 激活 + Bedtime nav-item 导航态
// Q4 下午形态（wakeMin=900）→ 下午 03:00（12h 归一 %12||12）
// Q5 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8947;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/apps/clock-app/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const STATE_INJECT = (enabled, wakeMin, days) => `(() => {
  localStorage.setItem('android_clock_state', JSON.stringify({
    alarms: [{ id: 1, hour: 9, minute: 0, isPm: 0, active: 1, expanded: false, label: '早起闹钟', days: [0, 6], vibrate: true }],
    masterVolume: .85, globalRingtone: 'platinum', crescendoSeconds: 0, sunriseMinutes: 0,
    bedtime: { enabled: ${enabled}, bedMin: 1380, wakeMin: ${wakeMin}, days: [${days.join(',')}], notifyMin: 15 },
  }));
})()`;

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const errors = [];

async function newPage(inject) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(inject);
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  return page;
}

try {
  /* Q1 默认 disabled */
  const p1 = await newPage(STATE_INJECT(false, 420, [0,1,2,3,4,5,6]));
  const q1 = await p1.evaluate(() => ({ card: !!document.getElementById('bedtimeWakeCard'), alarmCards: document.querySelectorAll('#alarmList .alarm-card-wrapper').length }));
  A('Q1 默认 disabled → 派生卡不存在 + 常规卡 1 张', q1.card === false && q1.alarmCards === 1, JSON.stringify(q1));
  await p1.close();

  /* Q2 enabled → 卡首渲染（卡首=第 0 张） */
  const p2 = await newPage(STATE_INJECT(true, 450, [1,2,3,4,5]));
  const q2 = await p2.evaluate(() => {
    const cards = document.querySelectorAll('#alarmList .alarm-card-wrapper');
    const first = cards[0];
    return {
      count: cards.length,
      firstIsWake: first ? first.id === 'bedtimeWakeCard' : false,
      time: first ? first.querySelector('.alarm-time').innerText : '',
      repeat: first ? first.querySelector('.alarm-repeat-label').innerText : '',
      sub: first ? first.querySelector('.sub-txt[style*="margin-top:4px"]').innerText : '',
      label: first ? first.getAttribute('data-act') : '',
    };
  });
  A('Q2 卡首渲染：2 张卡、首张=派生卡、上午 07:30 + 工作日 + 起床闹钟副题 + goto-bedtime', q2.count === 2 && q2.firstIsWake && q2.time.indexOf('上午') !== -1 && q2.time.indexOf('07:30') !== -1 && q2.repeat === '工作日' && q2.sub === '起床闹钟 · 睡眠时间' && q2.label === 'goto-bedtime', JSON.stringify(q2));

  /* Q3 点卡切 tab */
  await p2.evaluate(() => document.getElementById('bedtimeWakeCard').click());
  await sleep(300);
  const q3 = await p2.evaluate(() => ({
    title: document.getElementById('pageTitle').innerText,
    activeTab: document.querySelector('.tab-content.active') ? document.querySelector('.tab-content.active').id : '',
    navActive: !!document.querySelector('.nav-item[data-tab="Bedtime"].active'),
  }));
  A('Q3 点卡 → 睡眠时间 tab：pageTitle + tabBedtime 激活 + Bedtime nav-item 导航态', q3.title === '睡眠时间' && q3.activeTab === 'tabBedtime' && q3.navActive, JSON.stringify(q3));
  await p2.close();

  /* Q4 下午形态 12h 归一 */
  const p3 = await newPage(STATE_INJECT(true, 900, [1,2,3,4,5]));
  const q4 = await p3.evaluate(() => {
    const first = document.querySelector('#alarmList .alarm-card-wrapper');
    return { time: first ? first.querySelector('.alarm-time').innerText : '' };
  });
  A('Q4 下午形态：下午 03:00（900=15:00 → %12||12 归一）', q4.time.indexOf('下午') !== -1 && q4.time.indexOf('03:00') !== -1, JSON.stringify(q4));
  await p3.close();

  /* Q5 零 pageerror */
  A('Q5 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  A('e2e 异常中断', false, String(e).slice(0, 300));
} finally {
  await browser.close();
  server.kill();
  const fail = results.filter((r) => !r[0]).length;
  console.log(`\n== e2e-v157-wakelink: ${results.length - fail}/${results.length} passed ==`);
  process.exit(fail ? 1 : 0);
}
