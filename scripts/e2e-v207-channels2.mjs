// ==================== e2e-v207-channels2.mjs — #207 二期渠道清单弹层真浏览器回归（v10.21 · R107 加餐） ====================
// Q1 注册双渠道 + 投递 → 长按通知卡 600ms → 「全部类别」弹层出现且行渲染（名称+importance 标签+开关）
// Q2 tombstone 渠道不渲染弹层（AOSP 删除后不可见）
// Q3 「已删除的渠道无法恢复」提示在场（AOSP "Deleted channels can't be recovered" 同语义）
// Q4 弹层开关关渠道 → importance 落 NONE + 行刷新「· 已关闭」
// Q5 关闭渠道投递 → 整条不进（notifications-changed 零增量）
// Q6 开回渠道 → 恢复记忆原值 + 投递恢复入列
// Q7 快速 click 不触发弹层（长按守卫反向：直达行为保留）
// Q8 零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8953;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' : ''}${extra}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
for (let i = 0; i < 30; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/ios-desktop/index.html`); if (r.ok) break; } catch (e) {} await sleep(500); }
await sleep(800);
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const errors = [];

try {
  const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(300);

  await page.evaluate(() => { window.__chChanged = 0; window.addEventListener('notifications-changed', () => window.__chChanged++); });
  const notify = (p) => page.evaluate((payload) => window.postMessage({ type: 'NOTIFY', payload }, '*'), p);

  /* 注册双渠道（msg::c1 HIGH 4 / msg::c2 LOW 2）+ tombstone 一条 + 投递 */
  await page.evaluate(() => {
    window.__channelDebug.set('msg', 'c1', 4, '即时消息');
    window.__channelDebug.set('msg', 'c2', 2, '静默摘要');
    window.__channelDebug.set('msg', 'gone', 3, '将删渠道');
    window.__channelDebug.remove('msg', 'gone');
  });
  await notify({ id: 'e2e-ch2-main', appId: 'msg', channelId: 'c1', title: '渠道清单测试通知', desc: '长按打开全部类别' });
  await sleep(600);
  const cardBox = await page.evaluate(() => {
    const c = document.querySelector('.noti-card[data-id="e2e-ch2-main"]');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  A('Q0 前置：通知卡在场（渠道 c1 HIGH 投递入列）', !!cardBox, JSON.stringify(cardBox));

  /* Q1-Q3 长按弹层（dispatchEvent 真时序：pointerdown → 650ms → pointerup，面板可见性无关） */
  const lp = await page.evaluate(async () => {
    const card = document.querySelector('.noti-card[data-id="e2e-ch2-main"]');
    if (!card) return false;
    const r = card.getBoundingClientRect();
    card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 1 }));
    await new Promise((res) => setTimeout(res, 650));
    card.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 1 }));
    await new Promise((res) => setTimeout(res, 100));
    return true;
  });
  await sleep(300);
  const dlg = await page.evaluate(() => {
    const d = document.getElementById('channelEditorDialog');
    if (!d || d.style.display === 'none') return null;
    const rows = Array.from(d.querySelectorAll('.ch-editor-sw')).map((sw) => ({
      ch: sw.dataset.ch,
      checked: sw.checked,
      rowText: sw.closest('label').textContent.trim(),
    }));
    return { open: true, title: (d.querySelector('[role="dialog"] > div')?.textContent || '').trim(), rows, hint: d.textContent.includes('已删除的渠道无法恢复') };
  });
  A('Q1 长按 600ms → 弹层出现（「全部类别」标题）', !!dlg && dlg.title === '全部类别', JSON.stringify(dlg && dlg.title));
  const q2 = dlg && dlg.rows.find((r) => r.ch === 'c1');
  const q2b = dlg && dlg.rows.find((r) => r.ch === 'c2');
  A('Q2 双渠道行渲染：c1 HIGH 开关 on + c2 LOW 开关 on + importance 标签在场', !!q2 && q2.checked === true && !!q2b && q2b.checked === true
    && q2.rowText.includes('即时消息') && q2.rowText.includes('高') && q2b.rowText.includes('低'), JSON.stringify(dlg && dlg.rows));
  A('Q3 tombstone 渠道不渲染（gone 行绝迹）', !!dlg && !dlg.rows.some((r) => r.ch === 'gone'));
  A('Q3b 「已删除的渠道无法恢复」提示在场', !!dlg && dlg.hint === true);

  /* Q4 弹层开关关 c1 渠道 */
  await page.evaluate(() => {
    const sw = document.querySelector('#channelEditorDialog .ch-editor-sw[data-ch="c1"]');
    sw.checked = false;
    sw.dispatchEvent(new Event('change'));
  });
  await sleep(300);
  const q4 = await page.evaluate(() => ({
    imp: window.__channelDebug.importance('msg', 'c1'),
    rowText: (document.querySelector('#channelEditorDialog .ch-editor-sw[data-ch="c1"]')?.closest('label')?.textContent || ''),
    swChecked: document.querySelector('#channelEditorDialog .ch-editor-sw[data-ch="c1"]')?.checked,
  }));
  A('Q4 弹层开关关 c1 → importance NONE + 行刷新「· 已关闭」+ 开关 off', q4.imp === 0 && q4.rowText.includes('已关闭') && q4.swChecked === false, JSON.stringify(q4));

  /* Q5 关闭渠道投递 → 整条不进 */
  await page.evaluate(() => { window.__chChanged = 0; });
  await notify({ id: 'e2e-ch2-blocked', appId: 'msg', channelId: 'c1', title: '关闭渠道投递', desc: '应整条不进' });
  await sleep(600);
  const q5 = await page.evaluate(() => window.__chChanged);
  A('Q5 关闭渠道投递整条不进（changed 零增量）', q5 === 0, String(q5));

  /* Q6 弹层开回 c1 → 恢复原值 + 投递恢复 */
  await page.evaluate(() => {
    const sw = document.querySelector('#channelEditorDialog .ch-editor-sw[data-ch="c1"]');
    sw.checked = true;
    sw.dispatchEvent(new Event('change'));
  });
  await sleep(300);
  const q6a = await page.evaluate(() => window.__channelDebug.importance('msg', 'c1'));
  await page.evaluate(() => { window.__chChanged = 0; });
  await notify({ id: 'e2e-ch2-restored', appId: 'msg', channelId: 'c1', title: '恢复渠道投递', desc: '应重新入列' });
  await sleep(600);
  const q6b = await page.evaluate(() => window.__chChanged);
  A('Q6 开回渠道 → importance 恢复 HIGH(4) + 投递重新入列（changed +1）', q6a === 4 && q6b === 1, `imp=${q6a} changed=${q6b}`);

  /* Q7 快速短按不触发弹层（长按守卫反向：60ms < 500ms 阈值） */
  const sp = await page.evaluate(async () => {
    const d = document.getElementById('channelEditorDialog');
    if (d) d.style.display = 'none';
    const card = document.querySelector('.noti-card[data-id="e2e-ch2-restored"]');
    if (!card) return false;
    const r = card.getBoundingClientRect();
    card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 2 }));
    await new Promise((res) => setTimeout(res, 60));
    card.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 2 }));
    await new Promise((res) => setTimeout(res, 550)); // 越过长按阈值后再等一段，确认弹层零触发
    return true;
  });
  const q7 = await page.evaluate(() => {
    const d = document.getElementById('channelEditorDialog');
    return { dlgHidden: !d || d.style.display === 'none' };
  });
  A('Q7 快速短按不触发弹层（长按守卫反向）', sp === true && q7.dlgHidden === true, JSON.stringify(q7));

  /* Q8 零 pageerror */
  A('Q8 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r[0]).length;
console.log(`\n===== e2e-v207-channels2: ${results.length - failed}/${results.length} passed =====`);
process.exit(failed ? 1 : 0);
