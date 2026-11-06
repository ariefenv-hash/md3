// ==================== e2e-v209-dnd-bridge.mjs — #209 宿主 DND 桥 + 睡眠模式静音+灰度真跑（v10.18 · R106 窗） ====================
// Q1 进窗边沿：bedtime 窗内开机 → 宿主 body.dnd-mode-active + externalSources.bedtime 登记 + dnd-changed 翻转 true
// Q2 灰度：#zen-device-effects overlay 挂载 + computed backdrop-filter 含 grayscale（#198 通道复用零新渲染层）
// Q3 桥面往返：clock iframe __system.dnd.get() → {active:true, sources:['bedtime']}（消息面真跑）
// Q4 手动 override 逃生通道：宿主手动关 → body off + 登记表清空（互不覆盖①：手动关不被悬挂源顶回）
// Q5 手动开 + 睡眠开关关（禁用路径兜底释放）→ 出窗不覆盖手动开启（互不覆盖②：manual 真值存活）
// Q6 出窗边沿自动解除：wakeMin=now+2 窗自然到期 → body off + 登记表空 + manualActive false
// Q7 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8949;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' : ''}${extra}`);
};

// 睡眠时间注入体：bedMin=now-30（窗内），wakeMin=now+offset；days 全周
const STATE_INJECT = (offsetMin) => `(() => {
  const mins = (d) => d.getHours() * 60 + d.getMinutes();
  const now = new Date();
  const bed = new Date(now.getTime() - 30 * 60000);
  const wake = new Date(now.getTime() + ${offsetMin} * 60000);
  localStorage.setItem('android_clock_state', JSON.stringify({
    alarms: [{ id: 1, hour: 9, minute: 0, isPm: 0, active: 1, expanded: false, label: '早起闹钟', days: [0, 6], vibrate: true }],
    masterVolume: .85, globalRingtone: 'platinum', crescendoSeconds: 0, sunriseMinutes: 0,
    bedtime: { enabled: true, bedMin: mins(bed), wakeMin: mins(wake), days: [0,1,2,3,4,5,6], notifyMin: 15 },
  }));
})()`;

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];

async function newHostPage(inject) {
  // 分钟相位对齐：注入秒 >25 则等待下一窗（boot 在注入+~7s，防 wake=now+1 边界在 boot 前已过——Q6a 相位竞态坑在录）
  while (new Date().getSeconds() > 25) await sleep(250);
  const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(inject);
  await page.addInitScript(`(() => {
    window.__dndEvents = [];
    document.addEventListener('dnd-changed', (e) => window.__dndEvents.push(!!(e.detail && e.detail.active)));
  })()`);
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(400);
  await page.evaluate(() => window.__shareSheet.openAppById('clock_app'));
  await sleep(3000); // 应用 boot + 至少 2~3 个 bedtime tick（进窗边沿 1s 内必达）
  return page;
}

const clockFrameOf = (page) => page.frames().find((f) => f.url().indexOf('apps/clock-app') !== -1);

const hostState = (page) => page.evaluate(() => ({
  bodyDnd: document.body.classList.contains('dnd-mode-active'),
  sources: Object.keys(window.__zenDebug.externalSources()),
  overlay: window.__zenDebug.hasOverlay(),
  overlayFilter: (() => { const o = document.getElementById('zen-device-effects'); return o ? getComputedStyle(o).backdropFilter || o.style.backdropFilter || '' : ''; })(),
  manual: window.__zenDebug.state().manualActive,
  events: window.__dndEvents.slice(),
}));

try {
  /* Q1+Q2+Q3：进窗边沿 → 宿主 DND on + 灰度 overlay + 桥面 get 往返 */
  const p1 = await newHostPage(STATE_INJECT(60));
  const q1 = await hostState(p1);
  A('Q1 进窗边沿：body.dnd-mode-active + bedtime 登记 + dnd-changed 翻转 true',
    q1.bodyDnd === true && q1.sources.indexOf('bedtime') !== -1 && q1.events.indexOf(true) !== -1 && q1.manual === false, JSON.stringify(q1));
  A('Q2 灰度 overlay：挂载 + backdrop-filter 含 grayscale(1)（#198 通道复用）',
    q1.overlay === true && q1.overlayFilter.indexOf('grayscale') !== -1, 'filter=' + q1.overlayFilter);
  const clockFrame = clockFrameOf(p1);
  const q3 = await clockFrame.evaluate(() => window.__system.dnd.get());
  A('Q3 桥面往返：iframe __system.dnd.get() → {active:true, sources:[bedtime]}',
    q3.active === true && q3.sources && q3.sources.indexOf('bedtime') !== -1, JSON.stringify(q3));

  /* Q4：手动 override 逃生通道（手动关 → 登记清空，不被悬挂源顶回） */
  await p1.evaluate(() => window.__zenDebug.setDnd(false));
  await sleep(2500); // 覆盖 ≥2 个 tick（窗内无边沿不重登记——manual override 生效语义）
  const q4 = await hostState(p1);
  A('Q4 手动关=escape hatch：body off + 登记表清空（源不顶回）',
    q4.bodyDnd === false && q4.sources.length === 0 && q4.events.indexOf(false) !== -1, JSON.stringify(q4));

  /* Q5：手动开 + 睡眠开关关（禁用路径兜底释放）→ 出窗不覆盖手动开启 */
  await p1.evaluate(() => window.__zenDebug.setDnd(true));
  await sleep(300);
  const frameQ5 = clockFrameOf(p1); // 即时重解析（iframe 重建竞态防御，R60 坑③同源）
  await frameQ5.waitForSelector('#bedtimeModeInput', { state: 'attached', timeout: 8000 }); // m3-switch checkbox 视觉隐藏，attached 即可点
  await frameQ5.evaluate(() => document.getElementById('bedtimeModeInput').click());
  await sleep(2500); // 禁用路径 tick：btInWindow true → 兜底 dndSet(false)
  const q5 = await hostState(p1);
  A('Q5 禁用兜底释放 + 手动存活：body 仍 on（manual true）+ 登记表空',
    q5.bodyDnd === true && q5.sources.length === 0 && q5.manual === true, JSON.stringify(q5));
  await p1.close();

  /* Q6：出窗边沿自动解除（wakeMin=now+1 → 下一分钟边界自然到期，分钟级粒度最多等 ~75s） */
  const p2 = await newHostPage(STATE_INJECT(1));
  const q6a = await hostState(p2);
  A('Q6a 进窗边沿先行：body on + bedtime 登记', q6a.bodyDnd === true && q6a.sources.indexOf('bedtime') !== -1 && q6a.manual === false, JSON.stringify(q6a));
  let q6 = null;
  for (let i = 0; i < 90; i++) {
    await sleep(1000);
    q6 = await hostState(p2);
    if (q6.bodyDnd === false && q6.sources.length === 0) break;
  }
  A('Q6b 出窗边沿自动解除：body off + 登记表空 + manualActive false（无手动污染）',
    q6.bodyDnd === false && q6.sources.length === 0 && q6.manual === false, JSON.stringify(q6));
  await p2.close();

  /* Q7：全程零 pageerror */
  A('Q7 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r[0]).length;
console.log(`\n===== e2e-v209-dnd-bridge: ${results.length - failed}/${results.length} passed =====`);
process.exit(failed ? 1 : 0);
