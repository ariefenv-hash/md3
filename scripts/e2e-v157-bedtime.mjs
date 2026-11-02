// ==================== e2e-v157-bedtime.mjs — #157 一期行为真跑（v9.41 · R59 窗） ====================
// Q1 tab 重命名：nav Bedtime/睡眠时间 + tabBedtime 内容区激活切换
// Q2 时间表卡片启动回填：开关关/23:00-07:00 默认回填/7 day-pill/开开关后时长「8 小时 0 分」
// Q3 时长联动：改就寝 23:15 → 「8 小时 15 分」（跨午夜归一真跑 clock-core）
// Q4 下次就寝：启用后 bedtimeNextText 显示「周X HH:MM」非「未启用」
// Q5 核心联动（就寝到点自动播放）：bedMin 注入当前分钟前 1 分 + enabled → 首帧 tick 边沿
//    检测进入窗口 → noiseStatusText=「睡眠时段 · 自动播放」+ noisePlaying 态图标切 pause_circle→
//    反向：起卧同刻（dur=0）恒不自动播
// Q6 草稿持久：开关/时刻变更落 localStorage android_clock_state（bedtime 键）
// Q7 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8938;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/apps/clock-app/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
try {
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2000);

  // Q1 tab 重命名与切换
  const q1 = await page.evaluate(() => {
    const nav = document.querySelector('.nav-item[data-tab="Bedtime"]');
    nav.click();
    const active = document.querySelector('.tab-content.active');
    return {
      title: document.getElementById('pageTitle')?.innerText,
      navText: nav.querySelector('.nav-text')?.innerText,
      contentId: active?.id,
      oldGone: !document.getElementById('tabNoise'),
    };
  });
  A('Q1 nav Bedtime/睡眠时间 + tabBedtime 激活 + tabNoise 绝迹', q1.title === '睡眠时间' && q1.navText === '睡眠时间' && q1.contentId === 'tabBedtime' && q1.oldGone, JSON.stringify(q1));

  // Q2 卡片启动回填（默认 enabled=false → body 隐藏；开开关后 7 chips + 8 小时 0 分）
  const q2a = await page.evaluate(() => ({
    bodyHidden: document.getElementById('bedtimeScheduleBody').style.display === 'none',
    bedVal: document.getElementById('bedtimeBedInput').value,
    wakeVal: document.getElementById('bedtimeWakeInput').value,
    nextText: document.getElementById('bedtimeNextText').innerText,
  }));
  A('Q2a 默认 enabled=false → body 隐藏 + 23:00/07:00 回填 + 「未启用」', q2a.bodyHidden && q2a.bedVal === '23:00' && q2a.wakeVal === '07:00' && q2a.nextText === '未启用', JSON.stringify(q2a));
  await page.evaluate(() => document.getElementById('bedtimeModeInput').click());
  await sleep(300);
  const q2b = await page.evaluate(() => ({
    bodyShown: document.getElementById('bedtimeScheduleBody').style.display !== 'none',
    chips: document.querySelectorAll('#bedtimeDayChips .day-pill').length,
    activeChips: document.querySelectorAll('#bedtimeDayChips .day-pill.active').length,
    duration: document.getElementById('bedtimeDurationText').innerText,
    nextText: document.getElementById('bedtimeNextText').innerText,
  }));
  A('Q2b 启用后 body 显 + 7 chips 全 active + 「8 小时 0 分」+ 下次就寝「周X 23:00」', q2b.bodyShown && q2b.chips === 7 && q2b.activeChips === 7 && q2b.duration === '8 小时 0 分' && /^周. 23:00$/.test(q2b.nextText), JSON.stringify(q2b));

  // Q3 时长联动（改就寝 23:15 → 8 小时 15 分；change 事件走 app.mjs 委派）
  await page.evaluate(() => {
    const el = document.getElementById('bedtimeBedInput');
    el.value = '23:15';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const q3 = await page.evaluate(() => ({
    duration: document.getElementById('bedtimeDurationText').innerText,
    stored: JSON.parse(localStorage.getItem('android_clock_state')).bedtime,
  }));
  A('Q3 就寝 23:15 → 「7 小时 45 分」+ A.bedtime.bedMin=1395 落盘', q3.duration === '7 小时 45 分' && q3.stored.bedMin === 1395 && q3.stored.enabled === true, JSON.stringify({ duration: q3.duration, bedtime: q3.stored }));

  // Q4 重复日 chip 增删（取消周日 → 6 active；下次就寝仍正常）
  await page.evaluate(() => {
    const chips = document.querySelectorAll('#bedtimeDayChips .day-pill');
    chips[0].click(); // 周日
  });
  await sleep(200);
  const q4 = await page.evaluate(() => ({
    active: document.querySelectorAll('#bedtimeDayChips .day-pill.active').length,
    storedDays: JSON.parse(localStorage.getItem('android_clock_state')).bedtime.days,
  }));
  A('Q4 取消周日 → 6 active + days=[1..6] 保序落盘', q4.active === 6 && JSON.stringify(q4.storedDays) === '[1,2,3,4,5,6]', JSON.stringify(q4));

  // Q5 核心联动：bedMin=当前分钟-1（本分种刚进入就寝窗口）→ 下一秒 tick 边沿进窗自动播
  const q5a = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('android_clock_state'));
    st.bedtime.enabled = true;
    st.bedtime.days = [0, 1, 2, 3, 4, 5, 6];
    const n = new Date();
    const cur = n.getHours() * 60 + n.getMinutes();
    st.bedtime.bedMin = (cur - 1 + 1440) % 1440; // 1 分钟前就寝 → 已在窗内
    st.bedtime.wakeMin = (cur + 1 + 1440) % 1440; // 1 分钟后起床（窗口=2 分钟，便于观测出窗停播）
    localStorage.setItem('android_clock_state', JSON.stringify(st));
    return st.bedtime;
  });
  await page.reload({ waitUntil: 'load' });
  await sleep(2600); // 覆盖 ≥2 个 tick（1s 间隔）→ 进窗边沿必触发
  const q5b = await page.evaluate(() => ({
    status: document.getElementById('noiseStatusText')?.innerText,
    stateIcon: document.getElementById('noiseStateIcon')?.innerText,
    enabled: JSON.parse(localStorage.getItem('android_clock_state')).bedtime.enabled,
  }));
  A('Q5a 进窗自动播放：状态文案「睡眠时段 · 自动播放」+ 音效态图标 play_circle', q5b.enabled === true && q5b.status === '睡眠时段 · 自动播放' && q5b.stateIcon === 'play_circle', JSON.stringify(q5b));
  // 反向：起卧同刻（dur=0）→ 恒不自动播
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('android_clock_state'));
    st.bedtime.wakeMin = st.bedtime.bedMin; // dur=0
    localStorage.setItem('android_clock_state', JSON.stringify(st));
  });
  await page.reload({ waitUntil: 'load' });
  await sleep(2600);
  const q5c = await page.evaluate(() => ({
    status: document.getElementById('noiseStatusText')?.innerText,
    stateIcon: document.getElementById('noiseStateIcon')?.innerText,
  }));
  A('Q5b 起卧同刻 dur=0 → 恒不自动播（状态保持默认文案）', q5c.status === '暖调深噪 · 沉静遮噪' && q5c.stateIcon === 'pause_circle', JSON.stringify(q5c));

  // Q7 就寝提醒（v9.42 二期）：addInitScript 预注 __system.notify spy（宿主 main.js 注入条件为
  // if(!window.__system) 不覆盖既有对象；独立 dev 页面无宿主注入，stub 恒有效）→ 下次就寝=now+15min
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('android_clock_state'));
    st.bedtime.enabled = true;
    st.bedtime.days = [0, 1, 2, 3, 4, 5, 6];
    st.bedtime.notifyMin = 15;
    st.bedtime.bedMin = (new Date().getHours() * 60 + new Date().getMinutes() + 15) % 1440; // 15 分钟后就寝
    st.bedtime.wakeMin = (st.bedtime.bedMin + 480) % 1440;
    localStorage.setItem('android_clock_state', JSON.stringify(st));
  });
  await page.addInitScript(() => {
    window.__spy = [];
    window.__system = { notify: (p) => window.__spy.push(p) };
  });
  await page.reload({ waitUntil: 'load' });
  await sleep(2600);
  const q7b = await page.evaluate(() => ({
    calls: window.__spy ? window.__spy.length : -1,
    title: window.__spy && window.__spy[0] && window.__spy[0].title,
    descHas: window.__spy && window.__spy[0] && /15 分钟/.test(window.__spy[0].desc || ''),
  }));
  A('Q7 就寝提醒：notify spy 恰 1 次命中（分钟级去重）+ 标题「就寝提醒」+ desc 含提前量', q7b.calls === 1 && q7b.title === '就寝提醒' && q7b.descHas, JSON.stringify(q7b));

  // Q6 全程零 pageerror
  A('Q6 零 pageerror', errors.length === 0, errors.join(' | '));
} catch (e) {
  A('EXCEPTION', false, String(e));
} finally {
  await browser.close();
  server.kill();
}
const fail = results.filter((r) => !r[0]);
console.log(`\n===== e2e-v157: ${results.length - fail.length}/${results.length} =====`);
process.exit(fail.length ? 1 : 0);
