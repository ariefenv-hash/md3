// ==================== e2e-v98-screen-pinning.mjs — #98 屏幕固定 e2e ====================
//
// Q1 固定入口：recents 动作区 recentPinBtn 点击 → 确认面板（三 bullets + 双钮）在场
// Q2 确认固定：点「知道了」→ body.dataset.pinned 落位 + 「应用已固定」toast + 应用恢复全屏
// Q3 pinned 主屏拦截：主屏键点击 → 不回桌面 + escape toast（1s 节流窗口内静默后再验证）
// Q4 pinned recents 拦截：recents 键点击 → 多任务不开
// Q5 长按返回退出：按住返回键 ≥400ms → data-pinned 摘除 + 「已取消固定」toast
// Q6 非 pinned 正常开窗：桌面图标点击照常打开 + 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8978;
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
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

// 测试卫生：批量唤醒应用会排队异步弹运行时权限框/heads-up/toast，均可能拦截指针流
const dismissOverlays = async () => {
  for (let i = 0; i < 6; i++) {
    const had = await page.evaluate(() => {
      const ov = document.getElementById('md3PermissionOverlay');
      if (ov) { const b = ov.querySelector('button[data-act="granted"]'); if (b) b.click(); else ov.remove(); return true; }
      const h = document.getElementById('headsUpStack');
      if (h) { h.remove(); return true; }
      const toasts = document.querySelectorAll('.hun-banner, #systemGlobalToast');
      if (toasts.length) { toasts.forEach((e) => e.remove()); return true; }
      return false;
    });
    if (!had) break;
    await sleep(320);
  }
};

const toastText = () => page.evaluate(() => {
  const t = document.getElementById('systemGlobalToast');
  return t && t.style.opacity === '1' ? t.textContent.trim() : '';
});

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await sleep(400);
  await dismissOverlays();

  // 开启三键导航（默认手势导航，三键浮条未渲染）——固定退出交互的载体
  await page.evaluate(() => { window.__navBar && window.__navBar.setEnabled(true); });
  await sleep(600);
  await dismissOverlays();

  // Q1 固定入口 → 确认面板
  await page.click('.nvb-recents');
  await sleep(900);
  const pinBtnVisible = await page.evaluate(() => {
    const b = document.getElementById('recentPinBtn');
    return !!b && b.offsetParent !== null && b.textContent.includes('固定');
  });
  A('Q1a 固定按钮在动作区可见', pinBtnVisible);
  await page.click('#recentPinBtn');
  await sleep(500);
  const panel = await page.evaluate(() => {
    const ov = document.getElementById('spPromptOverlay');
    if (!ov) return null;
    return {
      title: ov.querySelector('.sp-prompt-title')?.textContent || '',
      bullets: [...ov.querySelectorAll('.sp-prompt-desc li')].map((li) => li.textContent.slice(0, 14)),
      btns: [...ov.querySelectorAll('[data-sp]')].map((b) => b.dataset.sp),
      appName: ov.querySelector('.sp-prompt-app span')?.textContent || '',
    };
  });
  A('Q1b 确认面板在场（标题/三 bullets/双钮/应用名）', !!panel
    && panel.title === '应用已固定'
    && panel.bullets.length === 3
    && panel.btns.includes('ok') && panel.btns.includes('cancel')
    && panel.appName.length > 0, JSON.stringify(panel));

  // Q2 确认固定
  await page.click('[data-sp="ok"]');
  await sleep(900);   // openApp 100ms 延时 + 收场动画
  const q2 = await page.evaluate(() => ({
    pinned: document.body.dataset.pinned || '',
    winOpen: !!document.getElementById('appWindow')?.classList.contains('open'),
  }));
  A('Q2a body.dataset.pinned 落位（固定 msg）', q2.pinned === 'msg', JSON.stringify(q2));
  A('Q2b 固定应用恢复全屏（appWindow.open）', q2.winOpen);
  A('Q2c 「应用已固定」toast', (await toastText()).includes('应用已固定'), await toastText());
  await dismissOverlays();

  // Q3 pinned 主屏拦截
  await page.evaluate(() => { const t = document.getElementById('systemGlobalToast'); if (t) t.remove(); });
  await sleep(1200);   // 越过 1s 节流窗（AOSP SHOW_TOAST_MINIMUM_INTERVAL）
  // 合成 click（e.detail===0 路径）：验证 sysHome 拦截+escape toast 语义链（鼠标分发已被 Q1 证明）
  await page.click('.nvb-home');
  await sleep(400);
  const q3 = await page.evaluate(() => ({
    pinned: document.body.dataset.pinned || '',
    winOpen: !!document.getElementById('appWindow')?.classList.contains('open'),
  }));
  A('Q3a 主屏键无效（不回桌面，窗口仍开）', q3.pinned === 'msg' && q3.winOpen, JSON.stringify(q3));
  A('Q3b escape toast（要取消固定，请触摸并按住…）', (await toastText()).includes('取消固定'), await toastText());

  // Q4 pinned recents 拦截
  await page.evaluate(() => { const t = document.getElementById('systemGlobalToast'); if (t) t.remove(); });
  await sleep(1200);
  await page.click('.nvb-recents');
  await sleep(500);
  const recentsActive = await page.evaluate(() => document.getElementById('recentAppsOverlay')?.classList.contains('active') || false);
  A('Q4 recents 键无效（多任务不开）', !recentsActive);
  await page.keyboard.press('Escape');

  // Q5 长按返回退出（400ms = ViewConfiguration.getLongPressTimeout 默认）
  await page.evaluate(() => { const t = document.getElementById('systemGlobalToast'); if (t) t.remove(); });
  await sleep(1200);
  const back = await page.locator('.nvb-back').boundingBox();
  await page.mouse.move(back.x + back.width / 2, back.y + back.height / 2);
  await page.mouse.down();
  await sleep(650);   // > 400ms 长按判定
  const q5a = await page.evaluate(() => ({
    pinned: document.body.dataset.pinned || '',
  }));
  await page.mouse.up();
  A('Q5a 长按 400ms 即退出（data-pinned 摘除，无需等待抬起）', q5a.pinned === '', JSON.stringify(q5a));
  A('Q5b 「已取消固定」toast', (await toastText()).includes('已取消固定'), await toastText());

  // Q6 非 pinned 正常开窗
  await page.evaluate(() => { const t = document.getElementById('systemGlobalToast'); if (t) t.remove(); });
  await page.keyboard.press('Escape');
  await sleep(600);
  const q6 = await page.evaluate(() => {
    // 直接点桌面 notes 图标（.app-icon[data-id] 桌面网格真节点）
    const icons = document.querySelectorAll('.app-icon');
    for (const ic of icons) {
      if (ic.dataset.id === 'notes') { ic.click(); return 'clicked-notes'; }
    }
    return 'icon-not-found:' + [...icons].slice(0, 3).map((i) => i.dataset.id).join(',');
  });
  await sleep(900);
  const q6win = await page.evaluate(() => !!document.getElementById('appWindow')?.classList.contains('open'));
  A('Q6 非 pinned 桌面开窗恢复正常', q6win, q6);

  A('Q7 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 300));
} catch (e) {
  A('e2e 异常中止', false, String(e).slice(0, 300));
} finally {
  const pass = results.filter((r) => r[0]).length;
  console.log(`\n==== ${pass}/${results.length} PASS ====`);
  await browser.close();
  server.kill();
  process.exit(pass === results.length ? 0 : 1);
}
