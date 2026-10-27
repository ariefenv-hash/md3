// ==================== e2e-v849-clock-m3e.mjs — #11 Google Clock 8.1 M3E 对标升级 无头回归 ====================
//
// A. 高底栏退役：.bottom-nav 零残留 + .top-tabs 5 导航项在场
// B. FAB 方形 M3E：56×56 / 16px 圆角 computed
// C. 整卡高亮：seed 活动卡 active-style / 非活动卡无；卡上开关退役（#alarmList 零 input）
// D. 点卡片上滑 sheet：sheetTime/sheetLabel/sheetDays(7 pills)/vib 回填正确
// E. sheet 天数 pill 即存即刷（storage days 同步 + pill active 数变化）
// F. sheet 振动开关 #81 通道：UI 与 storage 双向一致
// G. sheet 编辑时间 → pickerModal 预填编辑闹钟（sheet→picker 迁移链）
// H. 大时钟字体：5 chips / 选择写入 ios-desktop:clock-font-v1 + --clock-digit-font 上屏 / 重载恢复
// I. 闹钟音量真通道：无 store 回落 70 / stub 35 生效 / ringGain 纯函数钳制三态
// J. 秒表：主按钮 88px/28px 超大文字 + 方形圈速卡（宽≈高）+ 计圈出现
// K. 世界时钟：时间行与日期/闹钟行分离（world-meta-col 双行）
// L. Snooze 10 分钟文案（DeskClock SettingsDAO 默认 "10"）
// M. 零 pageerror
//
// 驱动：clock-app 直开（c1 sweep 同款 python http.server + 直接 goto 应用页——
//       iframe 应用自包含，锁屏无关；字体 CDN 断网容错属设计行为，断言只锚 var/存储层）。

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/home/z/my-project/md3-repo';
const PORT = 8085;
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const OUT = join(ROOT, 'docs/v849');
mkdirSync(OUT, { recursive: true });

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', ROOT, '--bind', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

// seed：仅首导航播种（reload 保留运行期写入——H3 重载恢复断言依赖字体键不被重置）
await page.addInitScript(() => {
  if (!localStorage.getItem('android_clock_state')) {
    localStorage.setItem('android_clock_state', JSON.stringify({
      alarms: [
        { id: 1, hour: 9, minute: 0, isPm: 0, active: 1, expanded: false, label: '早起闹钟', days: [0, 6], vibrate: true },
        { id: 2, hour: 7, minute: 30, isPm: 0, active: 0, expanded: false, label: '工作日闹钟', days: [1, 2, 3, 4, 5], vibrate: false },
      ],
      worldCities: [{ id: 'beijing', name: '北京', country: '中国', offset: 8, isLocal: 1 }],
      masterVolume: 0.85, globalRingtone: 'gentle',
    }));
  }
});

await page.goto(`http://127.0.0.1:${PORT}/ios-desktop/apps/clock-app/index.html`, { waitUntil: 'load', timeout: 20000 });
await page.waitForTimeout(600);

// ---------- A. 底栏退役 + 顶栏 tabs ----------
console.log('A. 底栏退役 + 顶栏胶囊 tabs');
const a = await page.evaluate(() => ({
  bottomNav: document.querySelectorAll('.bottom-nav').length,
  topTabs: document.querySelectorAll('.top-tabs').length,
  navItems: document.querySelectorAll('.top-tabs .nav-item').length,
  firstActive: document.querySelector('.top-tabs .nav-item.active .nav-text')?.textContent,
}));
ok(a.bottomNav === 0 && a.topTabs === 1 && a.navItems === 5 && a.firstActive === '闹钟', 'bottom-nav 零残留 + top-tabs 5 项 active=闹钟', JSON.stringify(a));

// ---------- B. FAB 方形 ----------
const b = await page.evaluate(() => {
  const f = getComputedStyle(document.querySelector('#tabAlarm .fab'));
  return { w: f.width, h: f.height, r: f.borderRadius };
});
ok(b.w === '56px' && b.h === '56px' && b.r === '16px', 'FAB computed 56×56/16px（M3E 方形）', JSON.stringify(b));

// ---------- C. 整卡高亮 + 卡上开关退役 ----------
console.log('C. 整卡高亮 + 卡上开关退役');
const c = await page.evaluate(() => {
  const c1 = document.querySelector('.alarm-card-wrapper[data-alarm-id="1"]');
  const c2 = document.querySelector('.alarm-card-wrapper[data-alarm-id="2"]');
  return {
    c1Active: c1.classList.contains('active-style'),
    c2Active: c2.classList.contains('active-style'),
    cardInputs: document.querySelectorAll('#alarmList input').length,
    expandPanel: document.querySelectorAll('.alarm-expand-panel').length,
    repeat1: c1.querySelector('.alarm-repeat-label')?.textContent,
  };
});
ok(c.c1Active === true && c.c2Active === false, '活动卡高亮 active-style / 非活动卡无', JSON.stringify(c));
ok(c.cardInputs === 0 && c.expandPanel === 0, '卡上开关+内联展开面板全量退役（#alarmList 零 input）', `inputs=${c.cardInputs} panels=${c.expandPanel}`);
ok(c.repeat1 === '日 六', '重复标签 seed 正确（formatDays 单字空格连缀）', c.repeat1);

// ---------- D. 点卡片上滑 sheet ----------
console.log('D. 点卡片上滑 sheet 编辑器');
await page.click('.alarm-card-wrapper[data-alarm-id="1"] .alarm-card-header');
await page.waitForTimeout(550);
const d = await page.evaluate(() => {
  const dlg = document.getElementById('alarmSheet');
  const pills = [...document.querySelectorAll('#sheetDays .day-pill')];
  return {
    open: dlg.open,
    time: document.getElementById('sheetTime').textContent.trim(),
    label: document.getElementById('sheetLabel').textContent,
    pillCount: pills.length,
    pillActive: pills.filter(p => p.classList.contains('active')).length,
    vib: document.querySelector('#alarmSheet input[data-act="toggle-vib"]').checked,
  };
});
ok(d.open === true, 'sheet 打开（dialog open）');
ok(d.time === '上午 09:00' && d.label === '早起闹钟', '时间/标签回填', `${d.time} / ${d.label}`);
ok(d.pillCount === 7 && d.pillActive === 2 && d.vib === true, '7 pills 活 2（日+六）+ 振动开', JSON.stringify(d));

// ---------- E. 天数即存即刷 ----------
await page.click('#sheetDays .day-pill:nth-child(2)'); // 周一
await sleep(200);
const e = await page.evaluate(() => {
  const st = JSON.parse(localStorage.getItem('android_clock_state'));
  const a1 = st.alarms.find(x => x.id === 1);
  const card = document.querySelector('.alarm-card-wrapper[data-alarm-id="1"] .alarm-repeat-label');
  return { days: a1.days, cardRepeat: card?.textContent, nowActive: [...document.querySelectorAll('#sheetDays .day-pill')].filter(p => p.classList.contains('active')).length };
});
ok(JSON.stringify([...e.days].sort()) === '[0,1,6]' && e.cardRepeat === '日 六 一' && e.nowActive === 3, '天数 pill 即存即刷（storage+卡片+sheet 三层同步）', JSON.stringify(e));

// ---------- F. 振动开关 #81 通道 ----------
await page.locator('#alarmSheet .m3-switch:has(input[data-act="toggle-vib"])').click();
await sleep(200);
const f = await page.evaluate(() => {
  const i = document.querySelector('#alarmSheet input[data-act="toggle-vib"]');
  const st = JSON.parse(localStorage.getItem('android_clock_state'));
  return { ui: i.checked, store: st.alarms.find(x => x.id === 1).vibrate };
});
ok(f.ui === false && f.store === false, '振动 toggle UI===storage===false（#81 通道健康）', JSON.stringify(f));
await page.locator('#alarmSheet .m3-switch:has(input[data-act="toggle-vib"])').click(); // 回 true

// ---------- G. sheet → picker 编辑链 ----------
console.log('G. sheet 编辑时间 → picker 预填');
await page.click('#alarmSheet [data-act="edit-alarm"]:has(.material-symbols-outlined)'); // 编辑时间按钮
await sleep(400);
const g = await page.evaluate(() => ({
  sheetClosed: !document.getElementById('alarmSheet').open,
  pickerOpen: document.getElementById('pickerModal').open,
  title: document.getElementById('pickerTitle').textContent,
  hour: document.getElementById('boxHour').textContent,
  label: document.getElementById('alarmLabelInput').value,
}));
ok(g.sheetClosed && g.pickerOpen && g.title === '编辑闹钟' && g.hour === '09' && g.label === '早起闹钟', 'picker 打开并预填 09/标签', JSON.stringify(g));
await page.click('#pickerModal [data-act="close-modal"][data-target="pickerModal"]');
await sleep(250);

// ---------- H. 大时钟字体 ----------
console.log('H. 大时钟字体选择 + 存储 + 上屏 + 恢复');
await page.click('#menuBtn');
await sleep(150);
await page.click('#menuDropdown [data-act="open-modal"][data-target="settingsModal"]');
await sleep(350);
const h1 = await page.evaluate(() => ({
  chips: [...document.querySelectorAll('#clockFontChips .font-chip')].map(c => c.dataset.id),
  name: document.getElementById('clockFontNameDisplay').textContent,
}));
ok(h1.chips.length === 5 && h1.chips[3] === 'acsolid' && h1.name.includes('Quicksand'), '5 chips 全在场 + 默认名显示', JSON.stringify(h1));
await page.click('#clockFontChips .font-chip[data-id="acsolid"]');
await sleep(300);
const h2 = await page.evaluate(() => ({
  stored: localStorage.getItem('ios-desktop:clock-font-v1'),
  cssVar: document.documentElement.style.getPropertyValue('--clock-digit-font').trim(),
  name: document.getElementById('clockFontNameDisplay').textContent,
  activeChip: document.querySelector('#clockFontChips .font-chip.active')?.dataset.id,
}));
ok(h2.stored === '{"id":"acsolid"}' && h2.cssVar === "'AndroidClockSolidV849','Quicksand',ui-monospace,'DejaVu Sans Mono',monospace", '选择写入共用存储键 + --clock-digit-font 完整回落链上屏', JSON.stringify(h2));
ok(h2.name === '当前：AndroidClock 实心' && h2.activeChip === 'acsolid', '名称显示 + chip active 态', `${h2.name} / ${h2.activeChip}`);
await page.screenshot({ path: join(OUT, 'clock-font.png') });
await page.click('#settingsModal [data-act="close-modal"][data-target="settingsModal"]');
await sleep(250);
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(600);
const h3 = await page.evaluate(() => ({
  activeChip: document.querySelector('#clockFontChips .font-chip.active')?.dataset.id,
  cssVar: document.documentElement.style.getPropertyValue('--clock-digit-font').trim(),
}));
ok(h3.activeChip === 'acsolid' && h3.cssVar === "'AndroidClockSolidV849','Quicksand',ui-monospace,'DejaVu Sans Mono',monospace", '重载后字体选择恢复（persist 链）', JSON.stringify(h3));

// ---------- I. 闹钟音量真通道 ----------
console.log('I. 闹钟音量真通道（AOSP STREAM_ALARM 语义）');
const i1 = await page.evaluate(() => ({
  fallback: window.__clockAlarmVolumePct(),
  g70: window.__clockRingGainFromVolumes(0.85, 70),
}));
ok(i1.fallback === 70 && Math.abs(i1.g70 - 0.595) < 1e-9, '无 store 回落 70 + gain=0.85×0.70=0.595', JSON.stringify(i1));
const i2 = await page.evaluate(() => {
  window.__settingsSoundStore = { get: (k) => (k === 'alarm' ? 35 : 0) };
  return {
    stub: window.__clockAlarmVolumePct(),
    g35: window.__clockRingGainFromVolumes(0.85, 35),
    clampHigh: window.__clockRingGainFromVolumes(2, 100),
    clampOver: window.__clockRingGainFromVolumes(0.85, 150),
    clampNeg: window.__clockRingGainFromVolumes(-1, 50),
  };
});
ok(i2.stub === 35 && Math.abs(i2.g35 - 0.2975) < 1e-9, 'stub 35 生效（真通道接线）', JSON.stringify({ stub: i2.stub, g35: i2.g35 }));
ok(i2.clampHigh === 1 && i2.clampOver === 1 && i2.clampNeg === 0, '钳制三态：master=2×pct100→1 / pct150→1 / master 负→0', JSON.stringify(i2));

// ---------- J. 秒表 ----------
console.log('J. 秒表超大文字按钮 + 方形圈速卡');
await page.click('.top-tabs .nav-item[data-tab="Stopwatch"]');
await sleep(400);
const j1 = await page.evaluate(() => {
  const s = getComputedStyle(document.getElementById('swMainBtn'));
  return { fs: s.fontSize, h: s.height };
});
ok(j1.fs === '28px' && j1.h === '88px', '主按钮 computed 28px 字号/88px 高（超大文字）', JSON.stringify(j1));
await page.click('#swMainBtn');
await sleep(300);
await page.click('#swLapBtn');
await sleep(300);
const j2 = await page.evaluate(() => {
  const lap = document.querySelector('.lap-card-item');
  if (!lap) return null;
  const r = lap.getBoundingClientRect();
  const cs = getComputedStyle(lap);
  return { count: document.querySelectorAll('.lap-card-item').length, w: r.width, h: r.height, radius: cs.borderRadius };
});
ok(j2 && j2.count === 1 && Math.abs(j2.w - j2.h) < 1.5 && j2.radius === '12px', '计圈方形卡片（宽≈高 + 12px 圆角）', JSON.stringify(j2));
ok(await page.evaluate(() => document.getElementById('swMainBtn').textContent) === '停止', '主按钮文字态=停止（文字标签替代图标）');
await page.screenshot({ path: join(OUT, 'clock-stopwatch.png') });

// ---------- K. 世界时钟分离排版 ----------
await page.click('.top-tabs .nav-item[data-tab="World"]');
await sleep(400);
const k = await page.evaluate(() => {
  const col = document.querySelector('.world-meta-col');
  return {
    has: !!col,
    dateRow: !!col?.querySelector('.world-date-row#worldClockDate'),
    alarmRow: !!col?.querySelector('.world-alarm-row #worldNextAlarm'),
    time: document.getElementById('worldClockTime').textContent,
  };
});
ok(k.has && k.dateRow && k.alarmRow, '时间行与日期行/闹钟行分离（world-meta-col 双行结构）', `time=${k.time}`);

// ---------- L. Snooze 10 分钟 ----------
const l = await page.evaluate(() => document.querySelector('#ringingModal [data-act="snooze"]')?.textContent);
ok(l === '稍后提醒(10分)', 'Snooze 文案 10 分（DeskClock SettingsDAO 默认 "10"）', l || 'MISSING');

// ---------- M. sheet 截图 + 零 pageerror ----------
await page.click('.top-tabs .nav-item[data-tab="Alarm"]');
await sleep(300);
await page.click('.alarm-card-wrapper[data-alarm-id="1"] .alarm-card-header');
await sleep(550);
await page.screenshot({ path: join(OUT, 'clock-sheet.png') });
ok(errors.length === 0, 'M 零 pageerror', errors.length ? errors[0].slice(0, 150) : '');

await browser.close();
srv.kill();
console.log(`\n==== e2e-v849 结果: ${pass} PASS / ${fail} FAIL ====`);
process.exit(fail ? 1 : 0);
