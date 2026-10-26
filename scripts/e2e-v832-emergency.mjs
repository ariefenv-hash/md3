// ==================== e2e-v832-emergency.mjs — #22⑧ 安全和紧急情况页无头回归 ====================
//
// DoD：
//   A. 页 29 = emergency_settings.xml 1:1：标题「安全和紧急情况」+ sub 逐字 +
//      主按钮「打开紧急信息」（ActionPrimaryButton 形态）+ 紧急求救行（emgGesture 图标 +
//      出厂态摘要「已开启」）+ 无线紧急警报静态行
//   B. 主按钮/紧急求救行 toast（Web 等价）；无线紧急警报行无点击（静态行）
//   C. 零 pageerror
//
// 驱动：真实导航（解锁 → settings 图标 → tp-row emergency）。420px 窄栏栈语义。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v832');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);
await page.evaluate(() => window.__themeModeTest.set('dark'));
await sleep(200);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1100);

// ---------- A. 页 29 主形态 ----------
console.log('A. 页 29 主形态（emergency_settings 1:1）');
const pMenu = await page.evaluate(() => ({
  emergencyRow: !!document.querySelector('.tp-row[data-tp-key="emergency"]'),
}));
A('A0 tp-row emergency 在位', pMenu.emergencyRow);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="emergency"]').click());
await sleep(900);
const p29 = await page.evaluate(() => {
  const page29 = [...document.querySelectorAll('.app-page')].find((p) => p.textContent.includes('打开紧急信息'));
  const btn = page29 ? page29.querySelector('button') : null;
  const rows = page29 ? [...page29.querySelectorAll('.md3-list-item')] : [];
  const sos = rows.find((x) => x.textContent.trim().startsWith('紧急求救'));
  const cb = rows.find((x) => x.textContent.includes('无线紧急警报'));
  return {
    title: document.getElementById('appTitle').textContent,
    sub: page29 ? page29.textContent.includes('紧急求救、医疗信息、警报') : false,
    openBtn: btn ? btn.textContent.trim() : '',
    sosRow: !!sos,
    sosIcon: sos ? !!sos.querySelector('svg') : false,
    sosSummary: sos ? sos.textContent.includes('已开启') : false,
    cbRow: !!cb,
    cbNoClick: cb ? !cb.getAttribute('onclick') : false,
  };
});
A('A1 页 29 打开（#appTitle=安全和紧急情况）', p29.title === '安全和紧急情况', `title=${p29.title}`);
A('A2 emergency_dashboard_summary 权威值逐字', p29.sub);
A('A3 主按钮「打开紧急信息」（open_app_button + EmergencyInfo 语义）', p29.openBtn === '打开紧急信息', p29.openBtn);
A('A4 紧急求救行在位（gesture_emergency_summary）', p29.sosRow);
A('A5 紧急求救行 emgGesture 图标在位', p29.sosIcon);
A('A6 出厂态摘要「已开启」（gesture_setting_on）', p29.sosSummary);
A('A7 无线紧急警报行在位（cell_broadcast_settings）', p29.cbRow);
A('A8 无线紧急警报行无 onclick（RestrictedPreference 静态行——页 19 形态一致）', p29.cbNoClick);
await page.screenshot({ path: join(OUT, 'a-emergency-main.png') });

// ---------- B. toast 交互 ----------
console.log('B. toast 交互（主按钮 / 紧急求救行）');
const pToasts = await page.evaluate(async () => {
  const page29 = [...document.querySelectorAll('.app-page')].find((p) => p.textContent.includes('打开紧急信息'));
  const out = [];
  const click = (sel) => {
    const el = sel === 'btn' ? page29.querySelector('button')
      : [...page29.querySelectorAll('.md3-list-item')].find((x) => x.textContent.trim().startsWith('紧急求救'));
    if (el) el.click();
  };
  click('btn');
  await new Promise((r2) => setTimeout(r2, 350));
  let t = document.getElementById('systemGlobalToast');
  out.push(t ? t.textContent : '');
  if (t) t.remove();
  click('sos');
  await new Promise((r2) => setTimeout(r2, 350));
  t = document.getElementById('systemGlobalToast');
  out.push(t ? t.textContent : '');
  return out;
});
A('B1 主按钮 toast（EmergencyInfo Web 等价）', pToasts[0].includes('紧急信息应用后续版本转正'), pToasts[0]);
A('B2 紧急求救行 toast（EmergencyGestureSettings Web 等价）', pToasts[1].includes('紧急求救设置页后续版本转正'), pToasts[1]);

// ---------- C. 弹栈 + 零 pageerror ----------
await page.evaluate(() => window.popSubPage());
await sleep(800);
A('Z1 零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n==== e2e-v832: ${pass} PASS / ${fail} FAIL ====`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
