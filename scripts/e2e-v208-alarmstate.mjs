// ==================== e2e-v208-alarmstate.mjs — #208 AlarmStateManager 状态机行为真跑（v10.16 · R105 窗） ====================
// Q1 响铃：当前分钟注入一次性闹钟 → 首 tick 命中 ringingModal + FIRED 登记（firingIds/probe）
// Q2 观测面：__alarmStateProbe 登记 SILENT→FIRED 实例 + 缺省值直改入口生效（silenceMin=0.1）
// Q3 MISSED 超时自动静音：响铃 6s 未处理 → modal 自关 + 「错过的闹钟」通知恰一条 + 一次性闹钟 disable（updateParentAlarm）
// Q4 SNOOZE 机器路径：稍后提醒 → SNOOZE 实例（alarmTime=now+0.1min）→ tick 调度转换 FIRED 再响铃（裸 setTimeout 退役实证）
// Q5 dismiss 语义：停止响铃 → DISMISSED 出账 + 一次性闹钟 disable（L236-239）
// Q6 HIGH 预通知：+25min 闹钟 → 「闹钟即将响铃」恰一条 + 实例 state=HIGH_NOTIFICATION(3)
// Q7 LOW 预通知：+75min 闹钟 → 「闹钟预提醒」恰一条 + 实例 state=LOW_NOTIFICATION(1)（-2h 窗）
// Q8 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8944;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/apps/clock-app/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

// 闹钟注入体：target 分钟偏移（相对当前分钟），days 空=一次性；overrides：静音/贪睡分钟数
const STATE_INJECT = (offsetMin, silence, snooze) => `(() => {
  const t = new Date(Date.now() + ${offsetMin} * 60000);
  const h24 = t.getHours(), m = t.getMinutes();
  const isPm = h24 >= 12 ? 1 : 0;
  const h12 = h24 % 12 || 12;
  window.__clockAlarmSilenceMin = ${silence};
  window.__clockAlarmSnoozeMin = ${snooze};
  window.__notifySpy = [];
  window.__system = { notify: (o) => { window.__notifySpy.push(o); } };
  localStorage.setItem('android_clock_state', JSON.stringify({
    alarms: [{ id: 777, hour: h12, minute: m, isPm: isPm, active: 1, expanded: false, label: 'e2e状态机', days: [], vibrate: true }],
    masterVolume: .85, globalRingtone: 'platinum', crescendoSeconds: 0, sunriseMinutes: 0,
    bedtime: { enabled: false, bedMin: 1380, wakeMin: 420, days: [0,1,2,3,4,5,6], notifyMin: 15 },
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
  /* ---------- Q1+Q2+Q3：响铃 → 观测面 → MISSED 超时自动静音 ---------- */
  const p1 = await newPage(STATE_INJECT(0.02, 0.1, 10)); // 闹钟≈当前分钟（+1.2s 后必过点）；静音 6s
  // Q1 响铃（轮询 ≤ 15s：首 tick 命中当前/下一分钟）
  let q1 = null;
  for (let i = 0; i < 30; i++) {
    q1 = await p1.evaluate(() => ({
      open: document.getElementById('ringingModal').open || document.getElementById('ringingModal').hasAttribute('open'),
      title: document.getElementById('ringTitle').innerText,
      sub: document.getElementById('ringSubtitle').innerText,
    }));
    if (q1.open) break;
    await sleep(500);
  }
  A('Q1 响铃命中：ringingModal open + 标签/副题在册', !!q1 && q1.open && q1.title === 'e2e状态机' && q1.sub.length > 0, JSON.stringify(q1));

  // Q2 观测面：FIRED 登记 + 覆写入口生效
  const q2 = await p1.evaluate(() => {
    const pr = window.__alarmStateProbe();
    return { ids: pr.firing.ids, ringing: pr.firing.ringing, silence: pr.firing.silenceMin, snooze: pr.firing.snoozeMin, inst: pr.instances.find((x) => x.id === 777) };
  });
  A('Q2 观测面：firingIds=[777] + ringing + 覆写 0.1/10 生效 + 实例在册', q2.ids.indexOf(777) !== -1 && q2.ringing === true && q2.silence === 0.1 && q2.snooze === 10 && !!q2.inst, JSON.stringify(q2));

  // Q3 MISSED：6s 无处理 → 自动静音 + 通知 + 一次性 disable（轮询 ≤ 10s）
  let q3 = null;
  for (let i = 0; i < 20; i++) {
    q3 = await p1.evaluate(() => {
      const pr = window.__alarmStateProbe();
      const st = JSON.parse(localStorage.getItem('android_clock_state'));
      return {
        ringing: pr.firing.ringing,
        open: document.getElementById('ringingModal').open || document.getElementById('ringingModal').hasAttribute('open'),
        inst: pr.instances.find((x) => x.id === 777),
        instGone: !pr.instances.find((x) => x.id === 777),
        missed: pr.instances.find((x) => x.id === 777) ? pr.instances.find((x) => x.id === 777).missedDone : false,
        active: st.alarms[0].active,
        notifyTitles: window.__notifySpy.map((o) => o.title),
      };
    });
    if (!q3.ringing && (q3.missed || q3.instGone) && q3.active === 0) break;
    await sleep(500);
  }
  const q3ok = q3 && !q3.ringing && !q3.open && (q3.missed || q3.instGone) && q3.active === 0 && q3.notifyTitles.indexOf('错过的闹钟') !== -1;
  A('Q3 MISSED 超时静音：modal 自关 + missedDone/出账 + 一次性 disable + 「错过的闹钟」通知', !!q3ok, JSON.stringify(q3));
  await p1.close();

  /* ---------- Q4：SNOOZE 机器路径（0.1 分钟贪睡 → tick 调度转换再响铃） ---------- */
  const p2 = await newPage(STATE_INJECT(0.02, 100, 0.1)); // 静音 100min 不干扰；贪睡 6s
  let rang = null;
  for (let i = 0; i < 30; i++) {
    rang = await p2.evaluate(() => document.getElementById('ringingModal').open || document.getElementById('ringingModal').hasAttribute('open'));
    if (rang) break;
    await sleep(500);
  }
  A('Q4a 首次响铃命中', !!rang, String(rang));
  await p2.evaluate(() => document.querySelector('#ringingModal [data-act="snooze"]').click());
  await sleep(400);
  const q4b = await p2.evaluate(() => {
    const pr = window.__alarmStateProbe();
    const inst = pr.instances.find((x) => x.id === 777);
    return { ringing: pr.firing.ringing, snoozed: inst ? inst.snoozed : false, state: inst ? inst.state : null, alarmTime: inst ? inst.alarmTime : 0, now: Date.now() };
  });
  A('Q4b 稍后提醒 → SNOOZE 实例：响铃停 + state=SNOOZE(4) + alarmTime≈now+6s', q4b.ringing === false && q4b.snoozed === true && q4b.state === 4 && Math.abs(q4b.alarmTime - (q4b.now + 6000)) < 4000, JSON.stringify(q4b));
  let q4c = null;
  for (let i = 0; i < 30; i++) {
    q4c = await p2.evaluate(() => {
      const pr = window.__alarmStateProbe();
      return {
        open: document.getElementById('ringingModal').open || document.getElementById('ringingModal').hasAttribute('open'),
        title: document.getElementById('ringTitle').innerText,
        state: pr.instances.find((x) => x.id === 777) ? pr.instances.find((x) => x.id === 777).state : null,
      };
    });
    if (q4c.open) break;
    await sleep(500);
  }
  A('Q4c SNOOZE→FIRED 调度转换再响铃：modal 复开 + 「稍后提醒」标题 + state=FIRED(5)', !!q4c && q4c.open && q4c.title.indexOf('稍后提醒') !== -1 && q4c.state === 5, JSON.stringify(q4c));
  await p2.close();

  /* ---------- Q5：dismiss 语义 ---------- */
  const p3 = await newPage(STATE_INJECT(0.02, 100, 10));
  let rang3 = null;
  for (let i = 0; i < 30; i++) {
    rang3 = await p3.evaluate(() => document.getElementById('ringingModal').open || document.getElementById('ringingModal').hasAttribute('open'));
    if (rang3) break;
    await sleep(500);
  }
  await p3.evaluate(() => document.querySelector('#ringingModal [data-act="dismiss-ring"]').click());
  await sleep(400);
  const q5 = await p3.evaluate(() => {
    const pr = window.__alarmStateProbe();
    const st = JSON.parse(localStorage.getItem('android_clock_state'));
    return {
      open: document.getElementById('ringingModal').open || document.getElementById('ringingModal').hasAttribute('open'),
      dismissed: pr.instances.find((x) => x.id === 777) ? pr.instances.find((x) => x.id === 777).state === 7 : false,
      active: st.alarms[0].active,
      cardActive: !!document.querySelector('.alarm-card-wrapper.active-style'),
    };
  });
  A('Q5 dismiss：modal 关 + DISMISSED(7) 出账 + 一次性 disable + 卡片激活态退场', !q5.open && q5.dismissed && q5.active === 0 && !q5.cardActive, JSON.stringify(q5));
  await p3.close();

  /* ---------- Q6：HIGH 预通知（+25min → 30min 窗内） ---------- */
  const p4 = await newPage(STATE_INJECT(25, 100, 10));
  await sleep(2500);
  const q6 = await p4.evaluate(() => {
    const pr = window.__alarmStateProbe();
    return {
      titles: window.__notifySpy.map((o) => o.title),
      descs: window.__notifySpy.map((o) => o.desc),
      state: pr.instances.find((x) => x.id === 777) ? pr.instances.find((x) => x.id === 777).state : null,
    };
  });
  const highNotifs = q6.titles.filter((t) => t === '闹钟即将响铃');
  A('Q6 HIGH 预通知恰一条 + state=HIGH(3) + desc 带标签与时刻', highNotifs.length === 1 && q6.state === 3 && q6.descs.join('').indexOf('e2e状态机') !== -1, JSON.stringify(q6));
  await p4.close();

  /* ---------- Q7：LOW 预通知（+75min → -2h 窗内、30min 窗外） ---------- */
  const p5 = await newPage(STATE_INJECT(75, 100, 10));
  await sleep(2500);
  const q7 = await p5.evaluate(() => {
    const pr = window.__alarmStateProbe();
    return {
      titles: window.__notifySpy.map((o) => o.title),
      state: pr.instances.find((x) => x.id === 777) ? pr.instances.find((x) => x.id === 777).state : null,
    };
  });
  const lowNotifs = q7.titles.filter((t) => t === '闹钟预提醒');
  A('Q7 LOW 预通知恰一条（-2h 窗）+ state=LOW(1) 且 HIGH 未误发', lowNotifs.length === 1 && q7.state === 1 && q7.titles.indexOf('闹钟即将响铃') === -1, JSON.stringify(q7));
  await p5.close();

  /* ---------- Q8：零 pageerror ---------- */
  A('Q8 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  A('e2e 异常中断', false, String(e).slice(0, 300));
} finally {
  await browser.close();
  server.kill();
  const fail = results.filter((r) => !r[0]).length;
  console.log(`\n== e2e-v208: ${results.length - fail}/${results.length} passed ==`);
  process.exit(fail ? 1 : 0);
}
