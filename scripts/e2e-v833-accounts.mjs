// ==================== e2e-v833-accounts.mjs — #22⑨ 密码、通行密钥和账号页无头回归 ====================
//
// DoD：
//   A. 页 30 = accounts_dashboard_settings_credman.xml 1:1：标题「密码、通行密钥和账号」+
//      TopIntro 权威全文 + 首选服务「未选择任何内容」行 + 账号「添加账号」行（devAdd 图标）+
//      自动同步行（title/summary 权威值 + 出厂默认开）
//   B. ConfirmAutoSyncChangeFragment Web 等价全链：点击 → 视觉先翻转 + 关闭分支弹窗
//      （zh title/message 全值）→ 取消回滚 → 确定写真源持久化 → reload 恢复 →
//      开启分支（zh title + 英文 message res-product 留痕）→ 确定 → 真源复位
//   C. 首选服务/添加账号 toast（Web 等价）
//   Z. 零 pageerror
//
// 驱动：真实导航（解锁 → settings 图标 → tp-row accounts）。420px 窄栏栈语义。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v833');
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
await page.evaluate(() => localStorage.removeItem('settings:accounts-v1')); // 出厂态基线
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

// ---------- A. 页 30 主形态 ----------
console.log('A. 页 30 主形态（accounts credman 1:1）');
const pMenu = await page.evaluate(() => ({
  accountsRow: !!document.querySelector('.tp-row[data-tp-key="accounts"]'),
}));
A('A0 tp-row accounts 在位', pMenu.accountsRow);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="accounts"]').click());
await sleep(900);
const p30 = await page.evaluate(() => {
  const pg = [...document.querySelectorAll('.app-page')].find((p) => p.textContent.includes('未选择任何内容'));
  const rows = pg ? [...pg.querySelectorAll('.md3-list-item')] : [];
  const none = rows.find((x) => x.textContent.trim().startsWith('未选择任何内容'));
  const add = rows.find((x) => x.textContent.trim().startsWith('添加账号'));
  const sync = rows.find((x) => x.textContent.includes('自动同步应用数据'));
  return {
    title: document.getElementById('appTitle').textContent,
    intro: pg ? pg.textContent.includes('选择您希望哪项服务来存储用于登录和自动填充建议的数据。如果您希望其他服务也提供建议，请开启相应服务。') : false,
    prefTitle: pg ? pg.textContent.includes('首选服务') : false,
    noneRow: !!none,
    acctTitle: pg ? pg.textContent.includes('账号') : false,
    addRow: !!add,
    addIcon: add ? !!add.querySelector('svg') : false,
    syncRow: !!sync,
    syncSummary: sync ? sync.textContent.includes('让应用自动刷新数据') : false,
    syncOn: sync ? !!sync.querySelector('#acSyncToggle') && sync.querySelector('#acSyncToggle').checked : false,
    dialog: pg ? !!pg.querySelector('#acSyncDialog') : false,
  };
});
A('A1 页 30 打开（#appTitle=密码、通行密钥和账号）', p30.title === '密码、通行密钥和账号', `title=${p30.title}`);
A('A2 TopIntro credman_main_settings_intro_text 权威全文', p30.intro);
A('A3 首选服务分区 title 在位（credman_chosen_app_title）', p30.prefTitle);
A('A4 「未选择任何内容」行（topProvider=null → credman_app_list_preference_none）', p30.noneRow);
A('A5 账号 category title「账号」（account_settings）', p30.acctTitle);
A('A6 添加账号行在位（add_account_label）', p30.addRow);
A('A7 添加账号行 devAdd 图标（ic_add_24dp）', p30.addIcon);
A('A8 自动同步行 title「自动同步应用数据」', p30.syncRow);
A('A9 摘要「让应用自动刷新数据」（auto_sync_account_summary）', p30.syncSummary);
A('A10 出厂默认开（getMasterSyncAutomatically 默认 true）', p30.syncOn);
A('A11 确认弹窗 DOM 在位（acSyncDialog）', p30.dialog);
await page.screenshot({ path: join(OUT, 'a-accounts-main.png') });

// ---------- B. ConfirmAutoSyncChangeFragment 全链 ----------
console.log('B. 确认弹窗全链（视觉先翻转 / 取消回滚 / 确定写真源 / reload 恢复 / 开启分支英文留痕）');
const clickSync = () => page.evaluate(() => {
  const pg = [...document.querySelectorAll('.app-page')].find((p) => p.textContent.includes('未选择任何内容'));
  [...pg.querySelectorAll('.md3-list-item')].find((x) => x.textContent.includes('自动同步应用数据')).click();
});
const snap = () => page.evaluate(() => {
  const pg = [...document.querySelectorAll('.app-page')].find((p) => p.textContent.includes('未选择任何内容'));
  const t = pg.querySelector('#acSyncToggle');
  const dlg = pg.querySelector('#acSyncDialog');
  return {
    checked: !!t && t.checked,
    dlgShown: !!dlg && dlg.style.display === 'flex',
    dlgTitle: dlg ? dlg.querySelector('#acSyncDlgTitle').textContent : '',
    dlgMsg: dlg ? dlg.querySelector('#acSyncDlgMsg').textContent : '',
    ls: localStorage.getItem('settings:accounts-v1'),
  };
});
await clickSync(); await sleep(300);
let st = await snap();
A('B1 点击 → 视觉先翻转（AOSP handlePreferenceTreeClick L46 同构）', st.checked === false && st.dlgShown);
A('B2 关闭分支 title「要关闭自动同步数据功能吗？」', st.dlgTitle === '要关闭自动同步数据功能吗？', st.dlgTitle);
A('B3 关闭分支 message zh 权威全值（off_dialog）', st.dlgMsg.includes('关闭后可以节省数据流量和电池电量') && st.dlgMsg.includes('并且在有更新时不会收到通知。'));
await page.screenshot({ path: join(OUT, 'b-off-dialog.png') });
// 取消 → 回滚
await page.evaluate(() => {
  const pg = [...document.querySelectorAll('.app-page')].find((p) => p.textContent.includes('未选择任何内容'));
  [...pg.querySelectorAll('#acSyncDialog button')].find((b) => b.textContent === '取消').click();
});
await sleep(300);
st = await snap();
A('B4 取消 → 弹窗关 + 开关回滚 true（updateState 重读真源语义）', !st.dlgShown && st.checked === true && st.ls === null);
// 确定 → 写真源
await clickSync(); await sleep(300);
await page.evaluate(() => {
  const pg = [...document.querySelectorAll('.app-page')].find((p) => p.textContent.includes('未选择任何内容'));
  [...pg.querySelectorAll('#acSyncDialog button')].find((b) => b.textContent === '确定').click();
});
await sleep(300);
st = await snap();
A('B5 确定 → 开关 false + localStorage 写入（setMasterSyncAutomatically Web 等价）', st.checked === false && st.ls && JSON.parse(st.ls).autoSync === false);
// reload 恢复
await page.reload({ waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1100);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="accounts"]').click());
await sleep(900);
st = await snap();
A('B6 reload → 状态恢复 false（单一真源持久化）', st.checked === false && st.ls && JSON.parse(st.ls).autoSync === false);
// 开启分支（英文 message 留痕）
await clickSync(); await sleep(300);
st = await snap();
A('B7 开启分支 title「要打开自动同步数据功能吗？」', st.dlgTitle === '要打开自动同步数据功能吗？', st.dlgTitle);
A('B8 开启分支 message 英文权威值（res-product zh MISS 1:1 留痕）', st.dlgMsg.includes('Any changes you make to your accounts on the web will be automatically copied to your tablet.') && st.dlgMsg.includes('A Google Account works this way.'));
await page.screenshot({ path: join(OUT, 'b-on-dialog.png') });
await page.evaluate(() => {
  const pg = [...document.querySelectorAll('.app-page')].find((p) => p.textContent.includes('未选择任何内容'));
  [...pg.querySelectorAll('#acSyncDialog button')].find((b) => b.textContent === '确定').click();
});
await sleep(300);
st = await snap();
A('B9 确定开启 → 真源复位 true（出厂态）', st.checked === true && JSON.parse(st.ls).autoSync === true);

// ---------- C. toast 交互 ----------
console.log('C. toast 交互（首选服务 / 添加账号）');
const pToasts = await page.evaluate(async () => {
  const pg = [...document.querySelectorAll('.app-page')].find((p) => p.textContent.includes('未选择任何内容'));
  const out = [];
  const click = (pred) => {
    const el = [...pg.querySelectorAll('.md3-list-item')].find(pred);
    if (el) el.click();
  };
  click((x) => x.textContent.trim().startsWith('未选择任何内容'));
  await new Promise((r2) => setTimeout(r2, 350));
  let t = document.getElementById('systemGlobalToast');
  out.push(t ? t.textContent : '');
  if (t) t.remove();
  click((x) => x.textContent.trim().startsWith('添加账号'));
  await new Promise((r2) => setTimeout(r2, 350));
  t = document.getElementById('systemGlobalToast');
  out.push(t ? t.textContent : '');
  return out;
});
A('C1 首选服务行 toast（DefaultAutofillPicker Web 等价）', pToasts[0].includes('首选服务选择器后续版本转正'), pToasts[0]);
A('C2 添加账号行 toast（AccountManager Web 等价）', pToasts[1].includes('添加账号需要账号框架支持，后续版本转正'), pToasts[1]);

// ---------- Z. 弹栈 + 零 pageerror ----------
await page.evaluate(() => window.popSubPage());
await sleep(800);
A('Z1 零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n==== e2e-v833: ${pass} PASS / ${fail} FAIL ====`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
