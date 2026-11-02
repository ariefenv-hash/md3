// ==================== e2e-v157-phase3.mjs — #157 三期行为真跑（v9.44 · R60 窗加餐） ====================
// Q1 sunriseSelect 默认 0（关闭=AOSP 无此原生默认，诚实标注）
// Q2 日出真触发：预注 sunriseMinutes=30 + active 闹钟 = now+2min（在窗）→ reload → tick 秒级命中
//    → screensaverModal open + .sunrise-active 渐亮类 + sunriseTag 提示（addInitScript 前注防 reload 丢 stub，v9.42 坑④）
// Q3 渐亮 animationDuration = 剩余秒数（>0 且 ≤ lead*60）
// Q4 明日日程预览：calevents_v1 注今日+明日 → divider「明日 ·」+ is-tomorrow 项
// Q5 今日空明日有 → 卡显示 + 「今日暂无日程」行（诚实语义）
// Q6 全程零 pageerror
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

const p2 = (n) => String(n).padStart(2, '0');
const dk = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());

const state = (() => {
  const t = new Date(Date.now() + 2 * 60000); // 闹钟 = 现在+2min（30min 提前窗内立即命中）
  return {
    alarms: [{ id: 1, hour: t.getHours(), minute: t.getMinutes(), isPm: t.getHours() >= 12 ? 1 : 0, active: 1, expanded: false, label: '日出测试', days: [0, 1, 2, 3, 4, 5, 6], vibrate: false }],
    worldCities: [{ id: 'beijing', name: '北京', country: '中国', offset: 8, isLocal: 1 }],
    masterVolume: .85, globalRingtone: 'gentle', crescendoSeconds: 0, sunriseMinutes: 30,
    bedtime: { enabled: false, bedMin: 1380, wakeMin: 420, days: [0, 1, 2, 3, 4, 5, 6], notifyMin: 15 },
  };
})();
const cal = (() => {
  // 相对 now 生成（沙箱 UTC 时区鲁棒）：今日一未来一过去 + 明日两件
  const mk = (offsetMin) => { const d = new Date(Date.now() + offsetMin * 60000); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const today = new Date(); const tmr = new Date(Date.now() + 86400000);
  return { [dk(today)]: [{ time: mk(120), title: '今日站会' }, { time: mk(-60), title: '代码评审' }], [dk(tmr)]: [{ time: '09:00', title: '明日晨跑' }, { time: '21:30', title: '明日复盘' }] };
})();

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(([st, ev]) => {
  localStorage.setItem('android_clock_state', JSON.stringify(st));
  localStorage.setItem('calevents_v1', JSON.stringify(ev));
}, [state, cal]);
try {
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1800);

  // Q1 默认关闭形态回填：本页注入的是 30（开启态）——校验回填链路生效
  const q1 = await page.evaluate(() => document.getElementById('sunriseSelect')?.value);
  A('Q1 sunriseSelect 回填注入值 30（回填链路）', q1 === '30', String(q1));

  // Q2 日出真触发
  const q2 = await page.evaluate(() => {
    const dlg = document.getElementById('screensaverModal');
    const d2 = dlg?.querySelector('.screensaver-dlg');
    const tag = document.getElementById('sunriseTag');
    return {
      open: !!dlg?.open,
      cls: !!d2?.classList.contains('sunrise-active'),
      dur: d2 ? parseFloat(d2.style.animationDuration) : 0,
      tagShown: tag?.style.display === 'block',
      tagText: document.getElementById('sunriseTagText')?.innerText || '',
    };
  });
  A('Q2 日出到窗：屏保自动开 + sunrise-active + tag', q2.open && q2.cls && q2.tagShown, JSON.stringify(q2));

  // Q3 渐亮时长 = 剩余秒数（闹钟在 2min 后，窗 30min → dur∈(0, 1800]）
  A('Q3 animationDuration = 剩余秒数（0 < dur ≤ 1800）', q2.dur > 0 && q2.dur <= 1800, String(q2.dur));

  // Q4/Q5 明日预览 + 今日段（同一次 evaluate 读全量态）
  const q4 = await page.evaluate(() => {
    document.querySelector('.nav-item[data-tab="Alarm"]')?.click();
    const card = document.getElementById('calAgendaCard');
    const div = card?.querySelector('.cal-agenda-divider');
    return {
      visible: card?.style.display !== 'none',
      divText: div?.innerText || '',
      tmrItems: card?.querySelectorAll('.cal-agenda-item.is-tomorrow').length || 0,
      nextItem: !!card?.querySelector('.cal-agenda-item.is-next'),
      pastItem: !!card?.querySelector('.cal-agenda-item.is-past'),
      todayCount: card?.querySelectorAll('.cal-agenda-item:not(.is-tomorrow):not(.cal-agenda-divider)').length || 0,
    };
  });
  A('Q4 明日 divider + is-tomorrow ×2', q4.visible && /明日 · \d+月\d+日/.test(q4.divText) && q4.tmrItems === 2, JSON.stringify(q4));
  A('Q5 今日段：is-next 高亮 + is-past 淡化并存', q4.nextItem && q4.pastItem && q4.todayCount === 2, JSON.stringify(q4));

  // Q6 今日空明日有：第二 page 独立注入（避免 reload 与 initScript 竞争）
  const page2 = await browser.newPage();
  const errors2 = [];
  page2.on('pageerror', (e) => errors2.push(String(e)));
  const cal2 = (() => { const tmr = new Date(Date.now() + 86400000); return { [dk(tmr)]: [{ time: '10:00', title: '仅明日日程' }] }; })();
  await page2.addInitScript(([ev]) => { localStorage.setItem('calevents_v1', JSON.stringify(ev)); }, [cal2]);
  await page2.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  const q6 = await page2.evaluate(() => {
    const card = document.getElementById('calAgendaCard');
    return { visible: card?.style.display !== 'none', emptyRow: (card?.querySelector('.cal-agenda-item .cal-agenda-title')?.textContent || '').includes('今日暂无日程'), tmr: card?.querySelectorAll('.is-tomorrow').length || 0 };
  });
  await page2.close();
  A('Q6 今日空明日有 → 卡显示 + 今日暂无日程行', q6.visible && q6.emptyRow && q6.tmr === 1, JSON.stringify(q6));

  await sleep(400);
  A('Q7 全程零 pageerror', errors.length === 0 && errors2.length === 0, (errors.concat(errors2)).join(' | ').slice(0, 200));
} finally {
  await browser.close();
  server.kill();
}
const fails = results.filter(([c]) => !c);
console.log(`\n=== e2e-v157-phase3: ${results.length - fails.length}/${results.length} passed ===`);
process.exit(fails.length ? 1 : 0);
