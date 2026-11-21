// 9.3 Gastown UI 交互核心实测（headless Chrome，零 pageerror 门禁）
// 用法：cp 到 /tmp/md3/.tmp-clock93-e2e.mjs && cd /tmp/md3 && node .tmp-clock93-e2e.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  try {
    const u = decodeURIComponent((req.url || '/').split('?')[0]);
    const f = path.resolve(ROOT, '.' + (u === '/' ? '/index.html' : u));
    if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    const d = await readFile(f);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(d);
  } catch (e) { res.writeHead(404); res.end('404'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome-stable',
  args: ['--no-sandbox', '--disable-dev-shm-usage'] });

const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, pass: !!cond, detail }); if (!cond) console.log('  ✗', name, detail); };
const pageErrors = [];

async function newPage(viewport) {
  const p = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console: ' + m.text().slice(0, 160)); });
  p.on('response', (r) => { if (r.status() === 404) pageErrors.push('404 ' + r.url()); });
  await p.goto(BASE + '/ios-desktop/apps/clock-app/index.html', { waitUntil: 'load', timeout: 30000 });
  await p.waitForFunction(() => !!window.__clock93, { timeout: 15000 });
  await p.waitForTimeout(250);
  return p;
}

const page = await newPage({ width: 390, height: 844 });

const tabInfo = await page.evaluate(async () => {
  const out = [];
  for (const t of ['World', 'Timer', 'Stopwatch', 'Bedtime', 'Alarm']) {
    window.__clock93.selectTab(t);
    await new Promise((r) => setTimeout(r, 90));
    const active = document.querySelector('.gastown-nav .nav-item.active');
    const ov = document.querySelector('.gastown-nav .nav-item.active .gastown-avd-overlay');
    out.push({ t, active: active?.dataset.tab, overlay: !!ov, avdNodes: ov ? ov.querySelectorAll('[data-avd-name]').length : 0,
      pageShown: !!document.querySelector(`.g93-page[data-page="${t}"].is-active`) });
  }
  return out;
});
ok('五 tab 切换 + 页面显示', tabInfo.every((x) => x.active === x.t && x.pageShown), JSON.stringify(tabInfo.map((x) => x.active)));
ok('9.3 AVD overlay 逐 tab 挂载并构建图层', tabInfo.every((x) => x.overlay && x.avdNodes >= 1), JSON.stringify(tabInfo.map((x) => x.avdNodes)));

const avdMotion = await page.evaluate(async () => {
  window.__clock93.selectTab('Alarm');
  await new Promise((r) => setTimeout(r, 700));
  window.__clock93.selectTab('Timer');
  const ov = document.querySelector('.nav-item[data-tab="Timer"] .gastown-avd-overlay');
  const snap = () => ov ? Array.from(ov.querySelectorAll('[data-avd-name]')).map((n) => n.getAttribute('d') || n.getAttribute('transform')).join('|') : '';
  const frames = [];
  for (let i = 0; i < 6; i++) { frames.push(snap()); await new Promise((r) => setTimeout(r, 120)); }
  return { distinct: new Set(frames).size, nodes: ov ? ov.querySelectorAll('[data-avd-name]').length : 0 };
});
ok('AVD 时间轴逐帧形变（非静态换图）', avdMotion.distinct >= 3 && avdMotion.nodes > 0, JSON.stringify(avdMotion));

const alarms = await page.evaluate(async () => {
  window.__clock93.selectTab('Alarm');
  const initial = document.querySelectorAll('.g93-alarm-card').length;
  const sw = document.querySelector('[data-toggle]');
  sw.checked = false; sw.dispatchEvent(new Event('change', { bubbles: true }));
  const offCount = document.querySelectorAll('.g93-alarm-card .is-paused').length;
  window.__clock93.openAlarmSheet();
  document.getElementById('sheetTime').value = '06:15';
  document.getElementById('sheetLabel').value = '晨跑';
  document.querySelectorAll('#sheetDays .g93-day')[1]?.click();
  document.getElementById('sheetOk').click();
  const afterAdd = document.querySelectorAll('.g93-alarm-card').length;
  const hasLabel = document.body.textContent.includes('晨跑');
  document.querySelector('[data-del]')?.click();
  const afterDel = document.querySelectorAll('.g93-alarm-card').length;
  return { initial, offCount, afterAdd, hasLabel, afterDel };
});
ok('闹钟：初始渲染 / 开关 / 添加 / 删除',
  alarms.initial === 2 && alarms.offCount >= 1 && alarms.afterAdd === 3 && alarms.hasLabel && alarms.afterDel === 2, JSON.stringify(alarms));

const world = await page.evaluate(async () => {
  window.__clock93.selectTab('World');
  const initial = document.querySelectorAll('.g93-city-card').length;
  const clock = document.getElementById('mainClock').textContent;
  const hands = [document.getElementById('handHour').getAttribute('x2'), document.getElementById('handMin').getAttribute('x2')];
  window.__clock93.openCitySheet();
  document.getElementById('sheetOk').click();
  const afterAdd = document.querySelectorAll('.g93-city-card').length;
  document.querySelector('[data-city-del]')?.click();
  return { initial, clock, hands, afterAdd, afterDel: document.querySelectorAll('.g93-city-card').length };
});
ok('世界时钟：城市卡 / 主钟 / 模拟表盘 / 添加删除',
  world.initial === 3 && /^\d{2}:\d{2}$/.test(world.clock) && world.hands.every((x) => Number(x) > 0)
  && world.afterAdd === 4 && world.afterDel === 3, JSON.stringify(world));

const timer = await page.evaluate(async () => {
  window.__clock93.selectTab('Timer');
  for (const k of ['1', '5', '0', '0']) window.__clock93.keypad(k);
  const digits = window.__clock93.state.timer.digits;
  const cols = Array.from(document.querySelectorAll('#timerDisplay .v')).map((x) => x.textContent).join(':');
  document.getElementById('timerStart').click();
  await new Promise((r) => setTimeout(r, 1200));
  const running = window.__clock93.state.timer.running;
  const t1 = document.getElementById('timerText').textContent;
  const dash = document.getElementById('ringIndicator').getAttribute('stroke-dasharray');
  document.getElementById('timerPause').click();
  const paused = !window.__clock93.state.timer.running;
  document.getElementById('timerAddMin').click();
  const added = window.__clock93.state.timer.remainingMs;
  document.getElementById('timerDelete').click();
  return { digits, cols, running, t1, dash, paused, added, setupBack: !document.getElementById('timerSetup').hidden };
});
ok('计时器：键盘 / 三列 / 运行 / 环形进度 / 暂停 / +1 分 / 删除',
  timer.digits === '001500' && timer.cols === '00:15:00' && timer.running && timer.t1 === '14:59'
  && !!timer.dash && timer.paused && timer.added > 0 && timer.setupBack, JSON.stringify(timer));

const sw = await page.evaluate(async () => {
  window.__clock93.selectTab('Stopwatch');
  window.__clock93.swMain();
  await new Promise((r) => setTimeout(r, 260));
  window.__clock93.swLap();
  await new Promise((r) => setTimeout(r, 160));
  window.__clock93.swLap();
  const laps = document.querySelectorAll('#lapList li').length;
  const best = document.querySelectorAll('#lapList li.best').length;
  document.getElementById('lapPrev').click();
  const prev = document.getElementById('lapCurrent').textContent;
  document.getElementById('lapNext').click();
  window.__clock93.swReset();
  return { laps, best, prev, resetTime: document.getElementById('swTime').textContent };
});
ok('秒表：启停 / 计次 / 最佳圈 / 前后圈 / 重置',
  sw.laps === 2 && sw.best === 1 && sw.prev.includes('第 1 圈') && sw.resetTime === '00:00.00', JSON.stringify(sw));

const bed = await page.evaluate(() => {
  window.__clock93.selectTab('Bedtime');
  const bars = document.querySelectorAll('#activityBars span').length;
  document.getElementById('bedEdit').click();
  document.getElementById('sheetBed').value = '23:00';
  document.getElementById('sheetWake').value = '06:30';
  document.getElementById('sheetOk').click();
  return { bars, bed: document.getElementById('bedTime').textContent, duration: document.getElementById('bedDuration').textContent };
});
ok('就寝：8 连排活动条 / 时间调整 / 跨零点时长',
  bed.bars === 8 && bed.bed === '23:00' && bed.duration.includes('7 小时 30 分'), JSON.stringify(bed));

const layouts = [];
for (const [name, vp] of [
  ['h600', { width: 412, height: 700 }], ['h800', { width: 412, height: 915 }],
  ['w1536', { width: 1600, height: 900 }], ['land', { width: 844, height: 390 }],
]) {
  const p = await newPage(vp);
  const s = await p.evaluate(() => {
    window.__clock93.selectTab('World');
    const frame = getComputedStyle(document.getElementById('mainClockFrame'));
    const list = getComputedStyle(document.getElementById('cityList'));
    const world = getComputedStyle(document.querySelector('.g93-world'));
    const nav = getComputedStyle(document.getElementById('g93Nav'));
    return { framePadTop: parseFloat(frame.paddingTop), cityCols: list.display,
      worldDir: world.flexDirection, navDir: nav.flexDirection, navWidth: nav.width };
  });
  layouts.push({ name, ...s });
  await p.close();
}
ok('h≥600 主时钟帧留白放大', layouts[0].framePadTop >= 28, JSON.stringify(layouts[0]));
ok('h≥800 城市两列网格', layouts[1].cityCols === 'grid', JSON.stringify(layouts[1]));
ok('w≥1536 世界时钟横向 52% 分栏', layouts[2].worldDir === 'row', JSON.stringify(layouts[2]));
ok('横屏 80px NavigationRail 侧轨', layouts[3].navDir === 'column' && layouts[3].navWidth === '80px', JSON.stringify(layouts[3]));

const desk = await browser.newPage({ viewport: { width: 390, height: 844 } });
desk.on('pageerror', (e) => pageErrors.push('desktop: ' + String(e).slice(0, 160)));
await desk.goto(BASE + '/ios-desktop/index.html', { waitUntil: 'load', timeout: 30000 });
await desk.waitForSelector('#desktop .app-icon', { timeout: 20000 });
const deskInfo = await desk.evaluate(() => ({
  icon: !!document.querySelector('#desktop .app-icon[data-id="clock93"]'),
  icons: document.querySelectorAll('#desktop .app-icon').length,
}));
ok('桌面注册：clock93 图标上桌', deskInfo.icon, JSON.stringify(deskInfo));
await desk.close();

ok('零 pageerror', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

const passed = results.filter((r) => r.pass).length;
console.log(`\n=== 9.3 UI 交互核心实测：${passed}/${results.length} PASS ===`);
for (const r of results) console.log(`  ${r.pass ? '✓' : '✗'} ${r.name}${r.detail && !r.pass ? ' — ' + r.detail : ''}`);
await browser.close();
server.close();
process.exit(passed === results.length ? 0 : 1);
