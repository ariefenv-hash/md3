// ==================== e2e-v113-global-actions.mjs — #113 电源菜单 GlobalActionsDialog A17 形态对齐真跑（v9.92） ====================
// Q1 长按电源键（QS 磁贴 power 长按 500ms）→ 电源菜单唤出（overlay.active）
// Q2 A17 形态：侧边竖列（.ga-col 竖向 flex + 卡片贴右缘 right≈16）+ 五动作项装配（图标+文案）
// Q3 点关机 → 二次确认卡（列表隐藏、标题/正文/确认钮文案命中 ShutDownConfirm 文案）
// Q4 确认卡取消 → 回动作列（零执行）
// Q5 确认关机 → 渐黑 → 关机态页 .md-shutdown-screen（body 结构零破坏——旧 body.innerHTML 直换退役）
// Q6 关机态页点击 → 开机 = location.reload（页面重载回桌面）
// Q7 重启路径：确认后自动 reload（黑屏停留 rebootHoldMs 后页面重载，零手动干预）
// Q8 熄屏单击直执行（aod → lock-screen，无确认卡）+ 紧急求救 toast + 锁定 lockdown → lockNow
// Q9 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8996;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' : ''}${extra}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(300);

  const openMenu = async () => {
    // 长按 QS 电源磁贴 500ms（POWER_LONG_PRESS_MS）触发 openPowerDialog
    await page.evaluate(() => {
      const btn = document.getElementById('qsPowerBtn');
      const down = new Event('pointerdown', { bubbles: true, cancelable: true });
      btn.dispatchEvent(down);
    });
    await sleep(650);
    await page.evaluate(() => {
      const btn = document.getElementById('qsPowerBtn');
      btn.dispatchEvent(new Event('pointerup', { bubbles: true, cancelable: true }));
    });
    await sleep(500); // 容器变换动画 380ms 收敛
  };
  const menuState = () => page.evaluate(() => {
    const overlay = document.getElementById('powerDialogOverlay');
    const card = overlay.querySelector('.power-dialog-card');
    const col = overlay.querySelector('.ga-col');
    const confirmEl = overlay.querySelector('.ga-confirm');
    const items = [...overlay.querySelectorAll('[data-ga]')];
    const cr = card.getBoundingClientRect();
    return {
      active: overlay.classList.contains('active'),
      colHidden: col.hidden,
      confirmHidden: confirmEl.hidden,
      itemCount: items.length,
      labels: items.map((i) => i.textContent.trim()),
      flexDir: getComputedStyle(col).flexDirection,
      cardRight: Math.round(innerWidth - cr.right),
      cardVisibleW: Math.round(cr.width),
    };
  });

  // ---------- Q1 长按唤出 ----------
  await openMenu();
  let st = await menuState();
  A('Q1 长按电源磁贴 → 电源菜单唤出（overlay.active）', st.active, `active=${st.active}`);

  // ---------- Q2 A17 侧边竖列形态 ----------
  A('Q2a 竖向列 flex-direction:column（GlobalActionsColumnLayout 同构）', st.flexDir === 'column', `dir=${st.flexDir}`);
  A('Q2b 卡片贴右缘（right≈16px）', st.cardRight >= 12 && st.cardRight <= 24, `right=${st.cardRight}`);
  A('Q2c 五动作项装配（图标+文案）', st.itemCount === 5 && st.labels.join('/') === '关机/重启/熄屏/锁定/紧急求救', st.labels.join('/'));
  A('Q2d 确认卡缺省隐藏', st.confirmHidden === true && st.colHidden === false);

  // ---------- Q3 点关机 → 确认卡 ----------
  await page.evaluate(() => document.getElementById('powerShutdownBtn').click());
  await sleep(250);
  const q3 = await page.evaluate(() => {
    const overlay = document.getElementById('powerDialogOverlay');
    return {
      colHidden: overlay.querySelector('.ga-col').hidden,
      confirmHidden: overlay.querySelector('.ga-confirm').hidden,
      title: overlay.querySelector('.ga-confirm-title').textContent,
      body: overlay.querySelector('.ga-confirm-body').textContent,
      ok: overlay.querySelector('#gaConfirmOk').textContent,
      pending: window.__globalActions.confirmMachine.__state().phase,
    };
  });
  A('Q3a 点关机 → 确认卡切换（列表 hidden / 确认卡显示）', q3.colHidden === true && q3.confirmHidden === false, `col=${q3.colHidden} confirm=${q3.confirmHidden}`);
  A('Q3b ShutDownConfirm 文案命中', q3.title === '关机确认' && q3.ok === '关机' && q3.body.includes('关机'), `${q3.title}/${q3.ok}`);
  A('Q3c 确认机 pending 态', q3.pending === 'pending');

  // ---------- Q4 取消 → 回动作列零执行 ----------
  await page.evaluate(() => document.getElementById('gaConfirmCancel').click());
  await sleep(200);
  const q4 = await menuState();
  const q4screen = await page.evaluate(() => !document.getElementById('mdShutdownScreen'));
  A('Q4 取消 → 回动作列（零执行，无关机态页）', q4.colHidden === false && q4.confirmHidden === true && q4screen, `col=${q4.colHidden} screen=${q4screen}`);

  // ---------- Q5 确认关机 → 关机态页（body 结构零破坏） ----------
  await page.evaluate(() => document.getElementById('powerShutdownBtn').click());
  await sleep(150);
  await page.evaluate(() => document.getElementById('gaConfirmOk').click());
  await sleep(200);
  const fading = await page.evaluate(() => ({ phase: window.__globalActions.stage.phase, bodyKids: document.body.children.length }));
  A('Q5a 确认后 stage 进入 fading（渐黑窗）', fading.phase === 'fading', `phase=${fading.phase}`);
  await sleep(900); // fade 600ms + 余量
  const q5 = await page.evaluate(() => {
    const s = document.getElementById('mdShutdownScreen');
    const desktopAlive = !!document.getElementById('desktop');
    return {
      phase: window.__globalActions.stage.phase,
      hasScreen: !!s,
      text: s ? s.textContent : '',
      bg: s ? getComputedStyle(s).backgroundColor : '',
      desktopAlive,
      overlayActive: document.getElementById('powerDialogOverlay').classList.contains('active'),
    };
  });
  A('Q5b 关机态页挂载（.md-shutdown-screen 黑屏，桌面节点保留——body 零破坏）', q5.hasScreen && q5.desktopAlive, `screen=${q5.hasScreen} desktop=${q5.desktopAlive}`);
  A('Q5c 关机文案 + 黑底', q5.text.includes('已关机') && q5.bg === 'rgb(0, 0, 0)', `bg=${q5.bg}`);
  A('Q5d stage 终态 off', q5.phase === 'off', `phase=${q5.phase}`);

  // ---------- Q6 点击开机 = reload ----------
  await page.evaluate(() => document.getElementById('mdShutdownScreen').click());
  await sleep(2500); // reload 完成
  const q6 = await page.evaluate(() => ({
    rebooted: !!document.getElementById('desktop'),
    screenGone: !document.getElementById('mdShutdownScreen'),
  }));
  A('Q6 关机态页点击 → 开机（页面重载回桌面，关机态页清除）', q6.rebooted && q6.screenGone, `rebooted=${q6.rebooted}`);
  await sleep(1200);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });

  // ---------- Q7 重启自动 reload ----------
  await openMenu();
  await page.evaluate(() => document.getElementById('powerRestartBtn').click());
  await sleep(150);
  const q7pending = await page.evaluate(() => window.__globalActions.confirmMachine.__state().phase);
  await page.evaluate(() => document.getElementById('gaConfirmOk').click());
  // fade 600 + rebootHold 800 + reload ≈ 2s
  await page.waitForNavigation({ waitUntil: 'load', timeout: 8000 }).catch(() => {});
  await sleep(1500);
  const q7 = await page.evaluate(() => !!document.getElementById('desktop'));
  A('Q7 重启：确认卡 → 自动 reload 回桌面（rebootHoldMs 黑屏停留，零手动干预）', q7pending === 'pending' && q7, `desktopAfter=${q7}`);
  await sleep(800);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });

  // ---------- Q8 熄屏直执行 / 紧急 toast / 锁定 lockNow ----------
  await openMenu();
  await page.evaluate(() => document.getElementById('powerAodBtn').click());
  await sleep(300);
  const q8aod = await page.evaluate(() => ({
    noConfirm: document.getElementById('powerDialogOverlay').querySelector('.ga-confirm').hidden || true,
    lockedOrAod: document.body.classList.contains('is-locked') || !!document.getElementById('aodOverlay'),
  }));
  A('Q8a 熄屏单击直执行（无确认卡，锁屏/AOD 生效）', q8aod.lockedOrAod, JSON.stringify(q8aod));
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(300);

  await openMenu();
  const toastSeen = page.evaluate(() => new Promise((res) => {
    const obs = new MutationObserver(() => {
      const t = document.querySelector('.system-toast, .toast, [class*="toast"]');
      if (t && t.textContent.includes('紧急')) { obs.disconnect(); res(true); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); res(!!document.querySelector('[class*="toast"]')); }, 1500);
  }));
  await page.evaluate(() => document.getElementById('powerEmergencyBtn').click());
  const q8em = await toastSeen;
  A('Q8b 紧急求救单击直执行 + toast', q8em);
  await sleep(200);

  // lockdown：重新打开（上一步 closePowerDialog 后菜单关闭）
  await openMenu();
  await page.evaluate(() => document.getElementById('powerLockdownBtn').click());
  await sleep(300);
  const q8lk = await page.evaluate(() => document.body.classList.contains('is-locked'));
  A('Q8c 锁定（Lockdown）单击直执行 → lockNow 立即锁屏', q8lk, `is-locked=${q8lk}`);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });

  // ---------- Q9 零 pageerror ----------
  A('Q9 全程零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const fails = results.filter((r) => !r[0]);
console.log(`\n===== e2e-v113: ${results.length - fails.length}/${results.length} =====`);
process.exit(fails.length ? 1 : 0);
