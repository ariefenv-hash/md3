// ==================== e2e-v90-notification-snooze.mjs — #90 通知 Snooze 真跑（v9.96） ====================
// P1 通知卡延后钮渲染（ellipsis 入口，AOSP 长按 guts 同义面）
// P2 点延后钮 → 档位行展开（四档 [15,30,60,120]，默认档标注）
// P3 选档提交 → 卡片离开主列（snoozeUntil 落库 + notifications-changed 广播）
// P4 getNotifications 过滤延后期（shade/锁屏/状态栏同真源）+ 已延后区渲染
// P5 撤销恢复 → 回主列（undoSnooze 同构）
// P6 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8998;
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
  await sleep(400);

  // 注入测试通知（不走默认演示数据，独立 id 便于断言）
  await page.evaluate(async () => {
    const n = await import('/ios-desktop/js/notifications.js');
    n.addSystemNotification({ id: 'snooze-e2e-1', app: 'E2E snooze', appId: 'settings', category: '测试', title: '延后真跑', desc: 'e2e-v90 P1-P5' });
  });
  await sleep(500);

  // P1 延后钮
  const hasBtn = await page.evaluate(() => {
    const card = document.querySelector('.noti-card[data-id="snooze-e2e-1"]');
    return !!(card && card.querySelector('.noti-snooze-btn'));
  });
  A('P1 通知卡延后钮渲染', hasBtn);

  // P2 展开档位行
  const chips = await page.evaluate(() => {
    const card = document.querySelector('.noti-card[data-id="snooze-e2e-1"]');
    card.querySelector('.noti-snooze-btn').click();
    const row = card.querySelector('.noti-snooze-options');
    return { visible: row.style.display !== 'none', items: [...row.querySelectorAll('.noti-snooze-chip')].map((c) => c.dataset.minutes) };
  });
  A('P2 档位行展开（四档 15/30/60/120）', chips.visible && chips.items.join(',') === '15,30,60,120', `chips=${chips.items.join(',')}`);

  // P3 选档提交（15 分钟）
  const submitted = await page.evaluate(async () => {
    const n = await import('/ios-desktop/js/notifications.js');
    const card = document.querySelector('.noti-card[data-id="snooze-e2e-1"]');
    card.querySelector('.noti-snooze-chip[data-minutes="15"]').click();
    await new Promise((r) => setTimeout(r, 300));
    const inMainList = !!document.querySelector('.noti-card[data-id="snooze-e2e-1"]:not([data-test="noti-snoozed-card"])');
    const filtered = !n.getNotifications().some((x) => x.id === 'snooze-e2e-1');
    const stored = JSON.parse(localStorage.getItem('ios-desktop:notifications') || '[]');
    const rec = stored.find((x) => x.id === 'snooze-e2e-1');
    return { inMainList, filtered, persisted: !!(rec && rec.snoozeUntil), until: rec ? rec.snoozeUntil : 0 };
  });
  A('P3 选档提交（离主列 + 真源过滤 + snoozeUntil 落库）',
    !submitted.inMainList && submitted.filtered && submitted.persisted && submitted.until > Date.now() + 14 * 60000,
    JSON.stringify(submitted));

  // P4 已延后区
  const snoozedSection = await page.evaluate(() => {
    const header = document.querySelector('[data-test="noti-snoozed-header"]');
    const card = document.querySelector('[data-test="noti-snoozed-card"][data-id="snooze-e2e-1"]');
    return { header: !!header, card: !!card, undo: !!(card && card.querySelector('.noti-snooze-undo')) };
  });
  A('P4 已延后区渲染（头 + 卡 + 恢复钮）', snoozedSection.header && snoozedSection.card && snoozedSection.undo, JSON.stringify(snoozedSection));

  // P5 撤销恢复
  const revived = await page.evaluate(async () => {
    const n = await import('/ios-desktop/js/notifications.js');
    document.querySelector('[data-test="noti-snoozed-card"][data-id="snooze-e2e-1"] .noti-snooze-undo').click();
    await new Promise((r) => setTimeout(r, 300));
    const back = !!document.querySelector('.noti-card[data-id="snooze-e2e-1"]');
    const visible = n.getNotifications().some((x) => x.id === 'snooze-e2e-1');
    const stored = JSON.parse(localStorage.getItem('ios-desktop:notifications') || '[]');
    const rec = stored.find((x) => x.id === 'snooze-e2e-1');
    return { back, visible, cleared: rec && !rec.snoozeUntil };
  });
  A('P5 撤销恢复（回主列 + 真源可见 + snoozeUntil 清除）', revived.back && revived.visible && revived.cleared, JSON.stringify(revived));

  // 清理：移除测试通知
  await page.evaluate(async () => {
    const stored = JSON.parse(localStorage.getItem('ios-desktop:notifications') || '[]').filter((x) => x.id !== 'snooze-e2e-1');
    localStorage.setItem('ios-desktop:notifications', JSON.stringify(stored));
  });
} catch (e) {
  A('P0 脚本执行异常', false, String(e).slice(0, 200));
} finally {
  A('P6 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 300));
  await browser.close().catch(() => {});
  server.kill();
  const failed = results.filter(([c]) => !c).length;
  console.log(`\ne2e-v90: ${results.length - failed}/${results.length} 通过`);
  process.exit(failed ? 1 : 0);
}
