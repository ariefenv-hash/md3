// ==================== e2e-v201-qs-tile-state.mjs — #201+#202 QS 磁贴状态机 e2e ====================
//
// Q1 飞行模式联动（refreshState 广播）：aeroplane 磁贴 toggle → cast/quick_share/vpn 磁贴
//    unavailable 类 + 副标签「不可用」+ 点击拦截（toast 在场，active 不翻转）；关飞行恢复
// Q2 省电受管（disabledByPolicy 通道）：battery_saver toggle → torch 磁贴 restricted 类 +
//    副标签「受管理」+ 点击拦截提示；省电关恢复
// Q3 长按泛化（handlesLongClick 逐贴位）：internet 磁贴 600ms 长按 → 网络内联面板开启
//    （与尺寸无关，泛化后 wide 贴也响应）
// Q4 误触守卫（isFalseTap）：pointerdown 位移 > 24px 后 click → active 不翻转（拦截）
// Q5 正常点击链路回归：torch 磁贴点击翻转 active + 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8975;
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
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // 外域断网

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await sleep(400);
  await page.click('#statusBar', { position: { x: 350, y: 14 }, force: true }); // 下拉 QS
  await sleep(1500);

  // Q1 飞行模式联动：aeroplane 点击 → cast/quick_share/vpn UNAVAILABLE
  const q1a = await page.evaluate(() => {
    const pill = document.querySelector('.qs-tile-pill[data-tile-id="aeroplane"]');
    if (pill) pill.click();
    return true;
  });
  await sleep(600);
  const q1b = await page.evaluate(() => {
    // cast = wide（有副标签）；quick_share = 1×1 小磁贴（无副标签 DOM，只查类）；
    // vpn 不在出厂激活清单（编辑视图可加，缺失时 refreshState 广播跳过 = 预期）
    const wide = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="cast"]');
    const small = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="quick_share"]');
    return {
      cast: { un: wide.classList.contains('unavailable'), sub: (wide.querySelector('.qs-tile-sub') || {}).textContent || '' },
      qs: { un: small.classList.contains('unavailable') },
    };
  });
  A('Q1a aeroplane toggle → cast unavailable+「不可用」副标签 / quick_share（1×1 无副标签）unavailable 类',
    q1a && q1b.cast.un === true && q1b.cast.sub === '不可用' && q1b.qs.un === true, JSON.stringify(q1b));
  // UNAVAILABLE 点击拦截：cast 点击 → active 不翻转 + toast 在场
  const q1c = await page.evaluate(() => {
    const p = document.querySelector('.qs-tile-pill[data-tile-id="cast"]');
    const before = p.classList.contains('active');
    p.click();
    return { before };
  });
  await sleep(400);
  const q1d = await page.evaluate(() => {
    const p = document.querySelector('.qs-tile-pill[data-tile-id="cast"]');
    const toast = document.getElementById('systemGlobalToast');
    return {
      after: p.classList.contains('active'),
      un: p.classList.contains('unavailable'),
      toastShown: !!toast && (toast.textContent || '').includes('不可用'),
    };
  });
  A('Q1b UNAVAILABLE 点击拦截：cast active 不翻转 + toast「不可用」在场',
    q1c.before === q1d.after && q1d.after === false && q1d.un === true && q1d.toastShown,
    JSON.stringify(q1d));
  // 关飞行恢复
  await page.evaluate(() => {
    const pill = document.querySelector('.qs-tile-pill[data-tile-id="aeroplane"]');
    if (pill) pill.click();
  });
  await sleep(600);
  const q1e = await page.evaluate(() => {
    const p = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="cast"]');
    return { un: p.classList.contains('unavailable'), sub: (p.querySelector('.qs-tile-sub') || {}).textContent || '' };
  });
  A('Q1c 关飞行恢复：cast unavailable 退场 + 副标签回「已关闭」',
    q1e.un === false && q1e.sub === '已关闭', JSON.stringify(q1e));

  // Q2 省电受管：battery_saver 点击 → torch restricted
  await page.evaluate(() => {
    const pill = document.querySelector('.qs-tile-pill[data-tile-id="battery_saver"]');
    if (pill) pill.click();
  });
  await sleep(600);
  const q2a = await page.evaluate(() => {
    const p = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="torch"]');
    return {
      restricted: p.classList.contains('restricted'),
      active: p.classList.contains('active'),
      // torch 为 1×1 小磁贴无副标签 DOM（受管理文案通道仅 wide 磁贴呈现）
      reason: p.dataset.restrictedReason || '',
      ariaDisabled: p.getAttribute('aria-disabled'),
    };
  });
  A('Q2a battery_saver on → torch restricted 类 + active 压制 + reason=battery_saver（1×1 无副标签）',
    q2a.restricted === true && q2a.active === false && q2a.reason === 'battery_saver' && q2a.ariaDisabled === 'false',
    JSON.stringify(q2a));
  // restricted 点击拦截
  const q2b = await page.evaluate(() => {
    const p = document.querySelector('.qs-tile-pill[data-tile-id="torch"]');
    p.click();
    return true;
  });
  await sleep(400);
  const q2c = await page.evaluate(() => {
    const p = document.querySelector('.qs-tile-pill[data-tile-id="torch"]');
    const toast = document.getElementById('systemGlobalToast');
    return {
      active: p.classList.contains('active'),
      toastShown: !!toast && (toast.textContent || '').includes('受管理'),
    };
  });
  A('Q2b restricted 点击拦截：torch active 不翻转 + toast「受管理」在场',
    q2b && q2c.active === false && q2c.toastShown, JSON.stringify(q2c));
  // 省电关恢复
  await page.evaluate(() => {
    const pill = document.querySelector('.qs-tile-pill[data-tile-id="battery_saver"]');
    if (pill) pill.click();
  });
  await sleep(600);
  const q2d = await page.evaluate(() => {
    const p = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="torch"]');
    return { restricted: p.classList.contains('restricted'), reason: p.dataset.restrictedReason || '' };
  });
  A('Q2c 省电关恢复：torch restricted 退场 + reason 清除',
    q2d.restricted === false && q2d.reason === '', JSON.stringify(q2d));

  // Q3 长按泛化：internet wide 磁贴长按 600ms → 网络面板开启（与尺寸无关）
  const netPanel = await page.evaluate(() => {
    // 注意：QQS 区 cloneNode 克隆体仅 click 委托（v7.79 既有边界），长按 listener 挂主 pill
    const pill = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="internet"]');
    if (!pill) return { missing: true };
    const r = pill.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    pill.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy }));
    return { started: true };
  });
  await sleep(600); // > 480ms 阈值
  const q3 = await page.evaluate(() => {
    const pill = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="internet"]');
    pill.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    const overlay = document.getElementById('qsSheetOverlay');
    return { open: !!overlay && overlay.classList.contains('open'), title: (overlay && overlay.querySelector('.qs-sheet-title') || {}).textContent || '' };
  });
  A('Q3 长按泛化：internet wide 磁贴 600ms 长按 → 网络内联面板开启（handlesLongClick 与尺寸无关）',
    netPanel.started && q3.open === true && q3.title === '网络与互联网', JSON.stringify({ netPanel, q3 }));
  // 关面板
  await page.evaluate(() => {
    const overlay = document.getElementById('qsSheetOverlay');
    if (overlay) {
      const btn = overlay.querySelector('[data-act="close"], .qs-sheet-close');
      if (btn) btn.click();
      else overlay.classList.remove('open');
    }
  });
  await sleep(400);

  // Q4 误触守卫：pointerdown 后位移 30px 再 click → active 不翻转
  const q4 = await page.evaluate(() => {
    const pill = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="torch"]');
    const r = pill.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    pill.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy }));
    const ptSet = !!pill.__pt; // __pt 采样 listener 在主 pill（QQS clone 无 listener 为既有边界）
    pill.dispatchEvent(new PointerEvent('click', { bubbles: true, clientX: cx + 30, clientY: cy }));
    const toast = document.getElementById('systemGlobalToast');
    return { active: pill.classList.contains('active'), ptSet, toastShown: !!toast && (toast.textContent || '').includes('已开启') };
  });
  A('Q4 误触守卫：__pt 采样在场 + 位移 30px > 24px 阈值 → 拦截（active 不翻转且无开启 toast）',
    q4.active === false && q4.ptSet === true && q4.toastShown === false, JSON.stringify(q4));

  // Q5 正常点击链路回归：torch 原位点击翻转
  const q5 = await page.evaluate(() => {
    const pill = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="torch"]');
    const r = pill.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    pill.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy }));
    pill.dispatchEvent(new PointerEvent('click', { bubbles: true, clientX: cx, clientY: cy }));
    return true;
  });
  await sleep(400);
  const q5b = await page.evaluate(() => {
    const pill = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="torch"]');
    return { active: pill.classList.contains('active'), restricted: pill.classList.contains('restricted') };
  });
  A('Q5 正常点击回归：torch active 翻转 true（1×1 磁贴无副标签 DOM）',
    q5 && q5b.active === true && q5b.restricted === false, JSON.stringify(q5b));

  A('Q6 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 300));
} catch (e) {
  A('e2e 异常中断', false, String(e).slice(0, 300));
}

await browser.close();
server.kill();
const passed = results.filter((r) => r[0]).length;
console.log(`\n===== e2e-v201-qs-tile-state: ${passed}/${results.length} =====`);
process.exit(passed === results.length ? 0 : 1);
