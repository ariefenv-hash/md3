// ==================== e2e-v831-safety.mjs — #22⑤⑥ 安全和隐私页无头回归 ====================
//
// DoD：
//   A. 页 28 = security_dashboard_settings.xml 四分区合流 1:1：标题「安全和隐私」+
//      safety_center_summary + 安全状态卡（已受到保护/重新扫描）+ 权限使用行 +
//      设备安全性区（屏幕锁定行）+ 更多安全设置行
//   B. 硬件门控零虚构：页面无指纹/人脸行（isFingerprintHardwareDetected 门控隐藏注记）
//   C. 权限使用行点击 → 页 5「隐私」（#appTitle 切栈顶页标题证据，v8.30 勿扰→页 9 映射同律）
//   D. 重新扫描 → 确定性 toast「扫描完成，未发现安全问题」（#22⑤ 许可）
//   E. 屏幕锁定/更多安全设置 toast（Web 等价提示）
//   F. 一级菜单形态门控：tp-row safety 在位 / tp-row security 不渲染（hidden:true）
//   G. 零 pageerror
//
// 驱动：真实导航（解锁 → settings 图标 → tp-row safety）。420px 窄栏栈语义。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v831');
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

// ---------- F. 一级菜单形态门控（先断言再进页） ----------
console.log('F. 一级菜单形态门控（safety 在位 / security hidden:true 不渲染）');
const pMenu = await page.evaluate(() => ({
  safetyRow: !!document.querySelector('.tp-row[data-tp-key="safety"]'),
  securityRow: !!document.querySelector('.tp-row[data-tp-key="security"]'),
  safetyLabel: (document.querySelector('.tp-row[data-tp-key="safety"]') || {}).textContent || '',
}));
A('F1 tp-row safety 在位', pMenu.safetyRow);
A('F2 security 行不渲染（SafetyCenter 启用 → CONDITIONALLY_UNAVAILABLE 实证）', !pMenu.securityRow);
A('F3 safety 行文案权威（「安全和隐私」+「应用安全性、设备锁定、权限」）',
  pMenu.safetyLabel.includes('安全和隐私') && pMenu.safetyLabel.includes('应用安全性、设备锁定、权限'));

// ---------- A. 页 28 主形态 ----------
console.log('A. 页 28 主形态（security_dashboard_settings 四分区合流 1:1）');
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="safety"]').click());
await sleep(900);
const p28 = await page.evaluate(() => {
  const page28 = [...document.querySelectorAll('.app-page')].find((p) => p.querySelector('#safetyRescanBtn'));
  return {
    title: document.getElementById('appTitle').textContent,
    sum: page28 ? page28.textContent.includes('应用安全性、设备锁定、权限') : false,
    statusTitle: page28 ? page28.textContent.includes('安全状态') : false,
    protect: page28 ? page28.textContent.includes('已受到保护') && page28.textContent.includes('您的设备已通过安全检查') : false,
    rescan: page28 ? !!page28.querySelector('#safetyRescanBtn') : false,
    permRow: page28 ? !![...page28.querySelectorAll('.md3-list-item')].find((x) => x.textContent.includes('权限使用')) : false,
    secTitle: page28 ? page28.textContent.includes('设备安全性') : false,
    lockRow: page28 ? !![...page28.querySelectorAll('.md3-list-item')].find((x) => x.textContent.trim().startsWith('屏幕锁定')) : false,
    advRow: page28 ? !![...page28.querySelectorAll('.md3-list-item')].find((x) => x.textContent.includes('更多安全设置')) : false,
  };
});
A('A1 页 28 打开（#appTitle=安全和隐私）', p28.title === '安全和隐私', `title=${p28.title}`);
A('A2 safety_center_summary 权威值逐字', p28.sum);
A('A3 security_status 分区标题「安全状态」', p28.statusTitle);
A('A4 虚构保护卡「已受到保护」+「您的设备已通过安全检查」（#22⑤ 许可）', p28.protect);
A('A5 重新扫描按钮在位', p28.rescan);
A('A6 权限使用行在位（dashboard_tile_placeholder 合流托管）', p28.permRow);
A('A7 security_category 分区「设备安全性」+ 屏幕锁定行', p28.secTitle && p28.lockRow);
A('A8 更多安全设置行在位（order 100）', p28.advRow);
await page.screenshot({ path: join(OUT, 'a-safety-main.png') });

// ---------- B. 硬件门控零虚构 ----------
console.log('B. 硬件门控零虚构（指纹/人脸行隐藏）');
const pBio = await page.evaluate(() => {
  const page28 = [...document.querySelectorAll('.app-page')].find((p) => p.querySelector('#safetyRescanBtn'));
  const rows = page28 ? [...page28.querySelectorAll('.md3-list-item')].map((x) => x.textContent) : [];
  return { fp: rows.some((t) => t.includes('指纹')), face: rows.some((t) => t.includes('人脸解锁')) };
});
A('B1 无指纹行（isFingerprintHardwareDetected → Web 无硬件隐藏）', !pBio.fp);
A('B2无人脸解锁行（isFaceHardwareDetected → Web 无硬件隐藏）', !pBio.face);

// ---------- C. 权限使用行 → 页 5 ----------
console.log('C. 权限使用行点击 → 页 5「隐私」');
await page.evaluate(() => {
  const page28 = [...document.querySelectorAll('.app-page')].find((p) => p.querySelector('#safetyRescanBtn'));
  const r = [...page28.querySelectorAll('.md3-list-item')].find((x) => x.textContent.includes('权限使用'));
  if (r) r.click();
});
await sleep(900);
const p5 = await page.evaluate(() => ({
  title: document.getElementById('appTitle').textContent,
}));
A('C1 权限使用行跳转页 5（#appTitle=应用权限——页 5 privacy 转正页 v8.05 权威标题）', p5.title === '应用权限', `title=${p5.title}`);
await page.evaluate(() => window.popSubPage()); // 栈对称弹回页 28（v8.30 教训：弹栈对称）
await sleep(900);

// ---------- D. 重新扫描 → 确定性 toast ----------
console.log('D. 重新扫描 → 确定性 toast（#22⑤ 许可）');
await page.evaluate(() => { const t = document.getElementById('systemGlobalToast'); if (t) t.remove(); });
await page.evaluate(() => window.__settingsSafetyV831.rescan());
await sleep(1400);
const pScan = await page.evaluate(() => {
  const t = document.getElementById('systemGlobalToast');
  return t ? t.textContent : '';
});
A('D1 扫描 toast 文案正确（800ms 确定性延迟后）', pScan.includes('扫描完成，未发现安全问题'), pScan);

// ---------- E. 屏幕锁定/更多安全设置 toast ----------
console.log('E. 屏幕锁定 / 更多安全设置 toast（Web 等价）');
const pToasts = await page.evaluate(async () => {
  const page28 = [...document.querySelectorAll('.app-page')].find((p) => p.querySelector('#safetyRescanBtn'));
  const out = [];
  const click = (label) => {
    const r = [...page28.querySelectorAll('.md3-list-item')].find((x) => x.textContent.includes(label));
    if (r) r.click();
  };
  click('屏幕锁定');
  await new Promise((r2) => setTimeout(r2, 350));
  let t = document.getElementById('systemGlobalToast');
  out.push(t ? t.textContent : '');
  if (t) t.remove();
  click('更多安全设置');
  await new Promise((r2) => setTimeout(r2, 350));
  t = document.getElementById('systemGlobalToast');
  out.push(t ? t.textContent : '');
  return out;
});
A('E1 屏幕锁定 toast（ChooseLockGeneric Web 等价）', pToasts[0].includes('屏幕锁定方式选择后续版本转正'), pToasts[0]);
A('E2 更多安全设置 toast（SecurityAdvancedSettings Web 等价）', pToasts[1].includes('更多安全设置页后续版本转正'), pToasts[1]);

// ---------- G. 弹栈回一级 + 零 pageerror ----------
await page.evaluate(() => window.popSubPage()); // 页 28 → 页 0
await sleep(800);
A('Z1 零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n==== e2e-v831: ${pass} PASS / ${fail} FAIL ====`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
