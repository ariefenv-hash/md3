// ==================== e2e-v197-headsup-timing.mjs — #197 heads-up 全规格行为真跑（v9.53） ====================
// 桌面页真开（?nolock=1 绕启动锁屏）+ 动态 import notifications.js（__notiMod 先例）+ __headsUpDebug 观测：
// Q1 Avalanche 排队：连发 6 条 → 槽内 ≤3 + waiting=3（等待而非挤掉）→ decay 排水后放行新条（错峰逐条出）
// Q2 minimum_time 防闪没：1.0s 时上滑收起 → 钳制至 2000ms 才真收（存活横幅仍在）→ 2.2s 后销毁
// Q3 snooze：自动 decay 收起后重发同 id 同内容仍弹（无记账）；上滑划掉后重发同 id 同内容静默（60s）；
//    改 desc 重发 → 真更新解除静默正常弹
// Q4 sticky 常驻：sticky:true 通知 5.5s 后仍在（普通 decay 5s 早已收）+ 后续普通条排队不顶掉
// Q5 锁屏图标上限：__lockTest.lock() + 5 条通知 → 锁屏通知卡 ≤3（AOSP max_notif_icons_on_lockscreen）
// Q6 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8958;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // 外域断网（e2e 惯例）

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2000);
  // 动态 import 缓存（e2e-v64 先例：notifications.js 无 window 全局导出）
  await page.evaluate(async () => { window.__notiMod = await import('/ios-desktop/js/notifications.js'); });
  const send = (item) => page.evaluate((it) => window.__notiMod.addSystemNotification(it), item);
  const dbg = () => page.evaluate(() => {
    const d = window.__headsUpDebug;
    return { count: d.count, alive: d.aliveCount, items: d.items(), states: d.states(), queue: d.queue() };
  });
  /** 上滑手势（e2e-v64 先例：mouse 序列位移 >56px 触发 dismiss+snooze 记账）；
   *  起点取横幅下部 85%（v9.53 实测：起点 y≤55 会命中桌面下拉手势区
   *  pull-down-gesture.js「clientY <= 55」→ 面板开 → 守卫清栈，手势被劫持） */
  const swipeUpTopBanner = async () => {
    const box = await page.evaluate(() => {
      const el = document.querySelector('#headsUpStack .hun-banner');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height * 0.85 };
    });
    if (!box) return false;
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x, box.y - 60, { steps: 5 });
    await page.mouse.move(box.x, box.y - 130, { steps: 5 });
    await page.mouse.up();
    return true;
  };

  // ---- Q1 Avalanche 排队（等待而非挤掉 + 错峰放行） ----
  for (let i = 1; i <= 6; i++) {
    await send({ id: `q1-n${i}`, app: 'Q1应用', title: `风暴 ${i}`, desc: '#197 avalanche', time: '刚刚' });
    await sleep(120);
  }
  await sleep(400); // 弹簧入槽稳定
  const q1 = await dbg();
  const q1Cap = q1.alive <= 3 && q1.queue.showing.length === 3 && q1.queue.waiting.length === 3;
  A('Q1a 连发 6 条：槽内 ≤3（showing=3）+ waiting=3（等待而非挤掉）', q1Cap,
    `alive=${q1.alive} showing=[${q1.queue.showing}] waiting=[${q1.queue.waiting}]`);
  // 排水：等首批 decay 5s + 弹簧退场 → 放行队首（错峰）
  await sleep(5600);
  const q1b = await dbg();
  const q1bOk = q1b.queue.waiting.length < 3 && q1b.queue.showing.some((id) => id && id.startsWith('q1-n4'));
  A('Q1b 首批 decay 退场 → FIFO 放行队首 q1-n4（错峰逐条出）', q1bOk,
    `showing=[${q1b.queue.showing}] waiting=${q1b.queue.waiting.length}`);
  // 清场：等全部排水（Q2 前基线干净）
  await sleep(12000);

  // ---- Q2 minimum_time 防闪没（存活不足 2000ms 收起延迟补足） ----
  await send({ id: 'q2-n1', app: 'Q2应用', title: '防闪没', desc: '#197 minimum_time', time: '刚刚' });
  await sleep(1000); // 存活 1.0s（≥touch_acceptance 700 可拖拽，<2000 触发钳制）
  const q2a = await dbg();
  await swipeUpTopBanner();
  await sleep(150);  // 收起请求已发，钳制生效：2000ms 前不销毁
  const q2b = await dbg();
  const q2bOk = q2b.items.includes('q2-n1'); // 不足 2s：横幅仍在（延迟补足）
  await sleep(1300); // 至 birth+~2.45s：钳制到期真收
  const q2c = await dbg();
  A('Q2 1.0s 上滑收起被 minimum_time 钳制（2s 前不销毁，补足后销毁）',
    q2a.alive === 1 && q2bOk && !q2c.items.includes('q2-n1'),
    `1.0s alive=${q2a.alive} / 钳制期仍在=${q2bOk} / 2.45s 已收=${!q2c.items.includes('q2-n1')}`);

  // ---- Q3 snooze（划掉 60s 静默 / 内容变真更新 / 自动收无记账） ----
  await send({ id: 'q3-n1', app: 'Q3应用', title: 'snooze 探针', desc: '同内容', time: '刚刚' });
  await sleep(5600); // 自动 decay 收起（无 snooze 记账）
  const q3a = await dbg();
  await send({ id: 'q3-n1', app: 'Q3应用', title: 'snooze 探针', desc: '同内容', time: '刚刚' }); // 自动收后重发同 id 同内容
  await sleep(300);
  const q3b = await dbg();
  const q3bOk = q3b.items.includes('q3-n1'); // 自动收不记账 → 重发仍弹
  await sleep(1000);
  const swOk = await swipeUpTopBanner();     // 上滑划掉（记账 snooze 60s）
  await sleep(700);  // minimum_time 钳制补足后销毁（1.0s+0.7s ≈ birth+1.7s <2s → 钳到 2s 收）
  await sleep(600);
  const q3c = await dbg();
  const q3cSnoozed = await page.evaluate((id) => window.__headsUpDebug.snoozed(id), 'q3-n1');
  await send({ id: 'q3-n1', app: 'Q3应用', title: 'snooze 探针', desc: '同内容', time: '刚刚' }); // 静默期内重发
  await sleep(300);
  const q3d = await dbg();
  const q3dOk = !q3d.items.includes('q3-n1'); // snooze 静默：横幅不弹
  await send({ id: 'q3-n1', app: 'Q3应用', title: 'snooze 探针', desc: '内容升级 v2', time: '刚刚' }); // 内容变
  await sleep(300);
  const q3e = await dbg();
  const q3eOk = q3e.items.includes('q3-n1'); // 真更新解除静默
  A('Q3 snooze 全链：自动收不记账→重发仍弹 / 划掉记账→60s 内重发静默 / 内容变解除静默',
    q3bOk && swOk && q3cSnoozed && q3dOk && q3eOk,
    `自动收重发弹=${q3bOk} snoozed=${q3cSnoozed} 静默重发弹=${!q3dOk === false} 更新弹=${q3eOk}`);
  // 清场
  await sleep(5600);

  // ---- Q4 sticky 常驻（60s，不被 decay 收、不被后续条顶掉） ----
  await send({ id: 'q4-sticky', app: 'Q4闹钟', title: 'sticky 常驻', desc: '#197 sticky 60s', time: '刚刚', sticky: true });
  await sleep(200);
  await send({ id: 'q4-normal', app: 'Q4应用', title: '普通条', desc: 'decay 5s', time: '刚刚' });
  await sleep(6200); // 普通 decay 5s 已收（含 ~0.4s 弹簧退场余量）
  const q4 = await dbg();
  const q4Ok = q4.items.includes('q4-sticky') && !q4.items.includes('q4-normal');
  A('Q4 sticky 5.5s 后仍驻留 + 同期普通条已按 5s decay 收', q4Ok,
    `items=[${q4.items}]`);
  // 清场：sticky 还在（60s）——用下滑展开面板清栈路径？面板开清栈经守卫。直接派发 destroy 不可达；
  // 等 decay 不现实（60s）——重载页清场（Q5 新页态）
  await page.reload({ waitUntil: 'load' });
  await sleep(1500);

  // ---- Q5 锁屏图标上限（max_notif_icons_on_lockscreen=3） ----
  await page.evaluate(async () => { window.__notiMod = await import('/ios-desktop/js/notifications.js'); });
  for (let i = 1; i <= 5; i++) {
    await page.evaluate((n) => {
      window.__notiMod.addSystemNotification({ id: `q5-n${n}`, app: 'Q5应用', title: `锁屏 ${n}`, desc: '#197 lockscreen cap', time: '刚刚' });
    }, i);
  }
  await page.evaluate(() => window.__lockTest.lock());
  await sleep(600);
  const q5 = await page.evaluate(() => ({
    cards: document.querySelectorAll('.lock-notifications .lock-noti-card').length,
    rows: document.querySelectorAll('.lock-notifications > *').length,
  }));
  A('Q5 锁屏通知卡 ≤3（原工程自定 4 退役，AOSP max_notif_icons_on_lockscreen=3）',
    q5.cards > 0 && q5.cards <= 3, `cards=${q5.cards} rows=${q5.rows}`);

  // ---- Q6 全程零 pageerror ----
  A('Q6 全程零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
} catch (e) {
  A('e2e 异常中断', false, String(e));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const failed = results.filter(([c]) => !c);
console.log(`\n==== e2e-v197-headsup-timing: ${results.length - failed.length}/${results.length} ====${failed.length ? ' FAILED' : ' ALL PASS'}`);
process.exit(failed.length ? 1 : 0);
