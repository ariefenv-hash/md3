// ==================== e2e-v89-status-bar-policy.mjs — #89 状态栏常态图标位真跑（v9.95） ====================
// P1 初始渲染：蓝牙磁贴缺省 active → .sb-policy-icons 内 bluetooth 插槽实渲染
// P2 5G 纯文本退役：.mobile-data-badge 内 SVG text='5G'（MobileIconGroup 徽章）
// P3 ringer 链：setRingerMode silent→mute 插槽 / vibrate→vibrate 插槽 / ring→双隐
// P4 zen 覆盖链：vibrate 态开勿扰 → zen 显 + vibrate 隐（isZenOverridingRinger 双隐）
// P5 蓝牙链：syncTileState 关 → 插槽消失（qs-tiles-changed → 快照重读 → 值差分）
// P6 blocklist 链：setStatusbarBlocklist(['bluetooth']) → 插槽隐 + localStorage 持久化
// P7 全程零 pageerror
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

  /** 桌面状态栏右侧策略插槽名集合 */
  const policySlots = () => page.evaluate(() =>
    [...document.querySelectorAll('.status-bar .sb-policy-icons .sb-slot')].map((el) => el.dataset.sbSlot)
  );
  const badgeText = () => page.evaluate(() => {
    const el = document.querySelector('.status-bar .mobile-data-badge text');
    return el ? el.textContent : null;
  });

  // P1 初始渲染（蓝牙磁贴缺省 active:true → bluetooth_connected 插槽）
  await sleep(600); // refreshPolicySnapshot 动态 import 就绪
  const slots0 = await policySlots();
  A('P1 初始蓝牙插槽实渲染（磁贴真值驱动）', slots0.includes('bluetooth'), `slots=${slots0.join(',') || '(空)'}`);

  // P2 MobileIconGroup 徽章（分级链真值：无头 Chromium effectiveType='4g' → 徽章 4G；
  // 断言语义 = badge 与 resolveMobileIconGroup 解析一致 + 旧纯文本退役，5G 仅缺省分支）
  const badge = await badgeText();
  const oldGone = await page.evaluate(() => ![...document.querySelectorAll('.status-bar .status-right span')].some((el) => el.textContent === '5G' && !el.querySelector('svg')));
  const expectBadge = await page.evaluate(async () => {
    const { resolveMobileIconGroup, MOBILE_ICON_GROUPS } = await import('/ios-desktop/js/aosp/status-bar-policy.js');
    const et = (navigator.connection && navigator.connection.effectiveType) || '';
    return MOBILE_ICON_GROUPS[resolveMobileIconGroup(et)].badge;
  });
  A('P2 MobileIconGroup 徽章（SVG text=分级真值，旧纯文本退役）', badge === expectBadge && oldGone, `badge=${badge} expect=${expectBadge}`);

  // P3 ringer 链
  await page.evaluate(async () => { (await import('/ios-desktop/js/sound-haptics.js')).setRingerMode('silent'); });
  await sleep(300);
  const s3a = await policySlots();
  await page.evaluate(async () => { (await import('/ios-desktop/js/sound-haptics.js')).setRingerMode('vibrate'); });
  await sleep(300);
  const s3b = await policySlots();
  await page.evaluate(async () => { (await import('/ios-desktop/js/sound-haptics.js')).setRingerMode('ring'); });
  await sleep(300);
  const s3c = await policySlots();
  A('P3 ringer 三态插槽链（silent→mute / vibrate→vibrate / ring→双隐）',
    s3a.includes('mute') && !s3a.includes('vibrate') && s3b.includes('vibrate') && !s3b.includes('mute') && !s3c.includes('mute') && !s3c.includes('vibrate'),
    `silent=${s3a.join(',')} vibrate=${s3b.join(',')} ring=${s3c.join(',')}`);

  // P4 zen 覆盖链（先回 vibrate，再开勿扰 → vibrate 让位 zen）
  await page.evaluate(async () => { (await import('/ios-desktop/js/sound-haptics.js')).setRingerMode('vibrate'); });
  await sleep(200);
  await page.evaluate(async () => { (await import('/ios-desktop/js/quick-settings.js')).setDndActive(true, { silent: true }); });
  await sleep(400);
  const s4 = await policySlots();
  await page.evaluate(async () => { (await import('/ios-desktop/js/quick-settings.js')).setDndActive(false, { silent: true }); });
  await sleep(300);
  A('P4 zen 覆盖 ringer（zen 显 + vibrate 隐，双隐语义）', s4.includes('zen') && !s4.includes('vibrate'), `slots=${s4.join(',')}`);
  await page.evaluate(async () => { (await import('/ios-desktop/js/sound-haptics.js')).setRingerMode('ring'); });

  // P5 蓝牙磁贴链（syncTileState 程序化翻转 → 广播 → 快照重读）
  await page.evaluate(async () => { (await import('/ios-desktop/js/quick-settings.js')).syncTileState('bluetooth', { active: false }); });
  await sleep(500);
  const s5a = await policySlots();
  await page.evaluate(async () => { (await import('/ios-desktop/js/quick-settings.js')).syncTileState('bluetooth', { active: true }); });
  await sleep(500);
  const s5b = await policySlots();
  A('P5 蓝牙磁贴翻转链（关→插槽消失 / 开→恢复）', !s5a.includes('bluetooth') && s5b.includes('bluetooth'), `off=${s5a.join(',')} on=${s5b.join(',')}`);

  // P6 blocklist 治理链（setStatusbarBlocklist 持久化 + 事件同步）
  await page.evaluate(async () => { (await import('/ios-desktop/js/status-bar.js')).setStatusbarBlocklist(['bluetooth']); });
  await sleep(300);
  const s6a = await policySlots();
  const stored = await page.evaluate(() => localStorage.getItem('ios-desktop:statusbar-icon-blocklist'));
  await page.evaluate(async () => { (await import('/ios-desktop/js/status-bar.js')).setStatusbarBlocklist([]); });
  await sleep(300);
  const s6b = await policySlots();
  A('P6 blocklist 治理链（排除→隐 + 持久化 + 复位→现）',
    !s6a.includes('bluetooth') && (stored || '').includes('bluetooth') && s6b.includes('bluetooth'),
    `blocked=${s6a.join(',')} store=${stored}`);
} catch (e) {
  A('P0 脚本执行异常', false, String(e).slice(0, 200));
} finally {
  A('P7 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 300));
  await browser.close().catch(() => {});
  server.kill();
  const failed = results.filter(([c]) => !c).length;
  console.log(`\ne2e-v89: ${results.length - failed}/${results.length} 通过`);
  process.exit(failed ? 1 : 0);
}
