// ==================== e2e-v210-lock-pin.mjs — #210 锁屏 PIN 体系 e2e ====================
//
// 全链路真实交互（无 seed 直调替代——设置流/手势/键盘均真实点击）：
//   Q0  未设 PIN 基线：真实上滑 → 直接解锁（零变化承诺回归）
//   Q1  设置流-不一致：1234/9999 → 保存 → 「两次输入不一致」警告，未落库
//   Q2  设置流-落库+弱密码警告不阻断：1234/1234 → 「不安全…（不改也行）」警告在显 + PIN 照设
//       （hasPin=true）+ 摘要「PIN」+ 卡收起
//   Q3  已设 PIN 上滑 → bouncer 唤出（真实手势）：面板在场 + hint「输入 PIN 解锁」+ 锁未解
//   Q4  错 PIN 真实键盘：9999→确认 → 错误文案 + failedAttempts=1 + 锁未解（截图①）
//   Q5  对 PIN 真实键盘：1234→确认 → 解锁（isLocked=false + bouncer 收起）
//   Q6  节流：重入锁屏→bouncer→5 连败真实键盘 → padDisabled + 「错误次数过多，请 N 秒后重试」
//       + throttle.remainingMs>0（Gatekeeper Web 近似 30s 窗；真等 30s 不可在 e2e 内，冷却
//       到期自恢复由单测判定链覆盖）（截图②）
//   Q7  清除链：instantUnlock（测试钩子零 PIN 门）→ 设置页输入当前 PIN → 清除 → 摘要「无」
//       + hasPin=false（截图③设置卡警告形态已在 Q2 前置）
//   Q8  清除后回归：重入锁屏 → 真实上滑 → 直接解锁（bouncer 不再唤出）
//   Q9  全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v210');
mkdirSync(OUT, { recursive: true });
const PORT = 8998;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);

  // Q0 未设 PIN 基线：真实上滑直接解锁
  const lock0 = await page.evaluate(() => window.__lockTest.isLocked());
  A('Q0a 开机锁屏在场（无 ?nolock）', lock0 === true);
  const pin0 = await page.evaluate(() => window.__lockTest.pin());
  A('Q0b bouncer 面板已建（hidden 态）+ 未设 PIN', pin0.panelPresent === true && pin0.hasPin === false && pin0.panelHidden === true, `hidden=${pin0.panelHidden}`);
  await page.mouse.move(210, 700);
  await page.mouse.down();
  for (let y = 700; y >= 200; y -= 50) { await page.mouse.move(210, y); await sleep(10); }
  await page.mouse.up();
  await sleep(1400);
  const unlock0 = await page.evaluate(() => window.__lockTest.isLocked());
  A('Q0c 未设 PIN 真实上滑直接解锁（零变化承诺）', unlock0 === false);

  // 打开设置 → 页 28（tp-row safety 双栏路径，v831 e2e 同款）
  await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
  await sleep(1100);
  await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="safety"]').click());
  await sleep(900);
  const rowState = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.md3-list-item')];
    const row = rows.find((r) => (r.getAttribute('onclick') || '').includes('openPinSetup')); // 确定性锚（防误中「屏幕锁定提示音」同文案行）
    return {
      summary: (document.getElementById('lockMethodSummary') || {}).textContent || '',
      hasRow: !!row,
    };
  });
  A('Q1a 页 28「屏幕锁定」行在场 + 摘要初始「无」', rowState.hasRow && rowState.summary === '无', `summary=${rowState.summary}`);

  // Q1 不一致流
  await page.evaluate(() => [...document.querySelectorAll('.md3-list-item')].find((r) => (r.getAttribute('onclick') || '').includes('openPinSetup')).click());
  await sleep(400);
  const card0 = await page.evaluate(() => !(document.getElementById('lockPinCard') || {}).hidden);
  A('Q1b 行点击 → PIN 设置卡展开（ChooseLockGeneric 转正）', card0 === true);
  await page.fill('#lockPinInput', '1234');
  await page.fill('#lockPinConfirm', '9999');
  await page.click('#lockPinSaveBtn');
  await sleep(400);
  const warn1 = await page.evaluate(() => ({
    w: (document.getElementById('lockPinWarning') || {}).textContent || '',
    shown: (document.getElementById('lockPinWarning') || {}).style ? document.getElementById('lockPinWarning').style.display !== 'none' : false,
    hasPin: window.__lockPin.store.has(),
  }));
  A('Q1c 不一致警告在显 + 未落库', warn1.shown && warn1.w.includes('两次输入不一致') && warn1.hasPin === false, warn1.w);

  // Q2 一致流：弱密码警告不阻断 + 落库
  await page.fill('#lockPinInput', '1234');
  await page.fill('#lockPinConfirm', '1234');
  await page.click('#lockPinSaveBtn');
  await sleep(900); // PBKDF2 100k 迭代落库窗
  const q2 = await page.evaluate(() => ({
    warn: (document.getElementById('lockPinWarning') || {}).textContent || '',
    hasPin: window.__lockPin.store.has(),
    iters: window.__lockPin.store.snapshot().iterations,
    summary: (document.getElementById('lockMethodSummary') || {}).textContent || '',
    cardHidden: (document.getElementById('lockPinCard') || {}).hidden,
  }));
  A('Q2a 弱密码警告在显（1234：纯数字/顺序/长度不足三因）且含「不改也行」',
    q2.warn.includes('不安全') && q2.warn.includes('不改也行'), q2.warn.slice(0, 46) + '…');
  A('Q2b PIN 落库（has=true + 迭代数 100000）+ 摘要「PIN」+ 卡收起',
    q2.hasPin === true && q2.iters === 100000 && q2.summary === 'PIN' && q2.cardHidden === true, `summary=${q2.summary}`);
  await page.screenshot({ path: join(OUT, 'pin-card-warn.png') }); // 截图③：设置卡警告形态

  // Q3 已设 PIN 上滑 → bouncer 唤出（锁屏回锁后真实手势）
  await page.evaluate(() => window.__lockTest.lock());
  await sleep(900);
  await page.mouse.move(210, 700);
  await page.mouse.down();
  for (let y = 700; y >= 200; y -= 50) { await page.mouse.move(210, y); await sleep(10); }
  await page.mouse.up();
  await sleep(900);
  const b1 = await page.evaluate(() => ({ ...window.__lockTest.pin(), locked: window.__lockTest.isLocked() }));
  A('Q3 上滑提交唤出 bouncer（面板在场 + open 类 + hint）+ 锁未解',
    b1.open === true && b1.panelOpenClass === true && b1.locked === true, `open=${b1.open}`);
  const hintTxt = await page.evaluate(() => (document.querySelector('.lock-bouncer-hint') || {}).textContent || '');
  A('Q3b hint 权威文案「输入 PIN 解锁」', hintTxt === '输入 PIN 解锁', hintTxt);

  // Q4 错 PIN 真实键盘 9999
  for (const d of ['9', '9', '9', '9']) { await page.click(`.lock-bouncer-key[data-digit="${d}"]`); await sleep(60); }
  const dots4 = await page.evaluate(() => window.__lockTest.pin().entryLen);
  await page.click('.lock-bouncer-key[data-action="ok"]');
  await sleep(700);
  const b4 = await page.evaluate(() => ({ ...window.__lockTest.pin(), locked: window.__lockTest.isLocked() }));
  A('Q4a 输入面 dots 跟手（4 点）', dots4 === 4, `entryLen=${dots4}`);
  A('Q4b 错 PIN：错误文案 + failedAttempts=1 + 锁未解 + 输入清零',
    b4.msg.includes('PIN 不正确') && b4.failedAttempts === 1 && b4.locked === true && b4.entryLen === 0, b4.msg);
  await page.screenshot({ path: join(OUT, 'bouncer-wrong-pin.png') }); // 截图①

  // Q5 对 PIN 真实键盘 1234 → 解锁
  for (const d of ['1', '2', '3', '4']) { await page.click(`.lock-bouncer-key[data-digit="${d}"]`); await sleep(60); }
  await page.click('.lock-bouncer-key[data-action="ok"]');
  await sleep(1200);
  const b5 = await page.evaluate(() => ({ ...window.__lockTest.pin(), locked: window.__lockTest.isLocked() }));
  A('Q5 对 PIN 解锁：锁解 + bouncer 收起 + 失败计数清零（recordSuccess）',
    b5.locked === false && b5.open === false && b5.failedAttempts === 0, `locked=${b5.locked}`);

  // Q6 节流：重入锁屏 → bouncer → 5 连败
  await page.evaluate(() => window.__lockTest.lock());
  await sleep(800);
  await page.mouse.move(210, 700);
  await page.mouse.down();
  for (let y = 700; y >= 200; y -= 50) { await page.mouse.move(210, y); await sleep(10); }
  await page.mouse.up();
  await sleep(800);
  let b6 = null;
  for (let i = 0; i < 5; i++) {
    for (const d of ['9', '9', '9', '9']) { await page.click(`.lock-bouncer-key[data-digit="${d}"]`); await sleep(40); }
    await page.click('.lock-bouncer-key[data-action="ok"]');
    await sleep(500);
    b6 = await page.evaluate(() => window.__lockTest.pin());
    if (b6.throttle.throttled) break;
  }
  A('Q6a 第 5 败沿节流触发（throttled=true + remainingMs>0）',
    b6.throttle.throttled === true && b6.throttle.remainingMs > 0, `remaining=${b6.throttle.remainingMs}ms`);
  A('Q6b 冷却态键盘禁用 + 倒计时文案（Gatekeeper Web 近似）',
    b6.padDisabled === true && b6.msg.includes('错误次数过多') && /秒后重试/.test(b6.msg), b6.msg);
  const stillLocked6 = await page.evaluate(() => window.__lockTest.isLocked());
  A('Q6c 节流中锁未解', stillLocked6 === true);
  await page.screenshot({ path: join(OUT, 'bouncer-throttle.png') }); // 截图②

  // Q7 清除链（instantUnlock 测试钩子零 PIN 门——确定性纪律）
  await page.evaluate(() => window.__lockTest.instantUnlock());
  await sleep(500);
  await page.evaluate(() => window.__settingsSafetyV831.openPinSetup());
  await sleep(300);
  await page.fill('#lockPinInput', '1234');
  await page.click('#lockPinClearBtn');
  await sleep(700);
  const q7 = await page.evaluate(() => ({
    hasPin: window.__lockPin.store.has(),
    summary: (document.getElementById('lockMethodSummary') || {}).textContent || '',
    attempts: window.__lockPin.store.snapshot().failedAttempts,
  }));
  A('Q7 清除验证链：当前 PIN 验证 → 全字段复位（摘要「无」+ has=false + 计数清零）',
    q7.hasPin === false && q7.summary === '无' && q7.attempts === 0, `summary=${q7.summary}`);

  // Q8 清除后回归：重入锁屏 → 真实上滑直接解锁
  await page.evaluate(() => window.__lockTest.lock());
  await sleep(800);
  await page.mouse.move(210, 700);
  await page.mouse.down();
  for (let y = 700; y >= 200; y -= 50) { await page.mouse.move(210, y); await sleep(10); }
  await page.mouse.up();
  await sleep(1300);
  const b8 = await page.evaluate(() => ({ locked: window.__lockTest.isLocked(), pin: window.__lockTest.pin() }));
  A('Q8 清除后上滑直接解锁（bouncer 不再唤出）',
    b8.locked === false && b8.pin.open === false && b8.pin.hasPin === false);

  // Q9 全程零 pageerror
  A('Q9 全程零 pageerror', errors.length === 0, errors.length ? errors[0].slice(0, 120) : '');
} catch (e) {
  console.log('FATAL', String(e).slice(0, 300));
  results.push([false, 'fatal', String(e).slice(0, 120)]);
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
const pass = results.filter((r) => r[0]).length;
console.log(`\n==== e2e-v210-lock-pin: ${pass}/${results.length} PASS ====`);
process.exit(pass === results.length ? 0 : 1);
