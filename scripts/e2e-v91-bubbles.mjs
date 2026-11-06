// ==================== e2e-v91-bubbles.mjs — #91 Bubble 一期真浏览器回归（v10.12） ====================
// S1 会话通知投递 → 气泡角标入列（槽位 0 / 右缘 inset）+ shade 卡片同时在
// S2 NOTIFY 显式 canBubble → 第二气泡堆叠（槽位 1）
// S3 NOTIFY 无 canBubble → 不产生气泡（资格三条件）
// S4 点击气泡 → 真实小窗开（__miniWindowAll 含 msg）+ 条目从 shade 抑制 + 展开态高亮
// S5 再点气泡 → 小窗收起 + 条目恢复 + 气泡保留
// S6 纵向拖拽 → y 跟随钳制落位
// S7 DELETE_MESSAGE_NOTIFICATION → 气泡移除（真 postMessage 通道，与单测 dispatchEvent 交叉验证）
// S8 清除后shade/Feed 一致 + 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8995;
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
let failed = 0;
try {
  const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(400);

  // S1 会话通知 → 气泡角标（NEW_MESSAGE_NOTIFICATION 默认资格通道）
  await page.evaluate(() => window.postMessage({ type: 'NEW_MESSAGE_NOTIFICATION', payload: { id: 'b1', title: 'Ada', desc: '嗨，在吗？', time: '刚刚' } }, '*'));
  await sleep(600);
  const s1 = await page.evaluate(() => {
    const el = document.querySelector('.bubble-badge[data-noti-id="b1"]');
    const dbg = window.__bubblesDebug;
    return {
      count: dbg ? dbg.count : -1,
      exists: !!el,
      y: el ? parseInt(el.style.top, 10) : -1,
      right: el ? el.style.right : '',
      appId: el ? el.dataset.appId : '',
      cardInShade: !!document.querySelector('#notificationsContainer .noti-card[data-id="b1"]'),
    };
  });
  A('S1 会话通知 → 气泡入列（槽位0/右缘/appId=msg）+ shade 卡片同时在',
    s1.count === 1 && s1.exists && s1.y === 96 && s1.right === '12px' && s1.appId === 'msg' && s1.cardInShade, JSON.stringify(s1));

  // S2 NOTIFY 显式 canBubble → 第二气泡堆叠
  await page.evaluate(() => window.postMessage({ type: 'NOTIFY', payload: { id: 'b2', appId: 'msg', appName: '信息', title: 'Bob', desc: '第二条', canBubble: true } }, '*'));
  await sleep(600);
  const s2 = await page.evaluate(() => {
    const el = document.querySelector('.bubble-badge[data-noti-id="b2"]');
    return { count: window.__bubblesDebug.count, y: el ? parseInt(el.style.top, 10) : -1 };
  });
  A('S2 显式 canBubble → 第二气泡堆叠（槽位1 = 96+48+10）', s2.count === 2 && s2.y === 154, JSON.stringify(s2));

  // S3 无 canBubble → 不产生气泡
  await page.evaluate(() => window.postMessage({ type: 'NOTIFY', payload: { id: 'n1', appId: 'msg', appName: '信息', title: '普通通知', desc: '无气泡资格' } }, '*'));
  await sleep(600);
  const s3 = await page.evaluate(() => ({
    count: window.__bubblesDebug.count,
    n1: !!document.querySelector('.bubble-badge[data-noti-id="n1"]'),
    n1Card: !!document.querySelector('#notificationsContainer .noti-card[data-id="n1"]'),
  }));
  A('S3 无 canBubble → 不产生气泡（但通知照常进 shade）', s3.count === 2 && !s3.n1 && s3.n1Card, JSON.stringify(s3));

  // S4 点击气泡 → 真实小窗 + shade 条目抑制（isBubbleNotificationSuppressedFromShade）
  await page.click('.bubble-badge[data-noti-id="b1"]');
  await sleep(1200);
  const s4 = await page.evaluate(() => ({
    miniOpen: window.__miniWindowAll().includes('msg'),
    expanded: window.__bubblesDebug.expanded(),
    suppressedCard: !!document.querySelector('#notificationsContainer .noti-card[data-id="b1"]'),
    expandedClass: document.querySelector('.bubble-badge[data-noti-id="b1"]')?.classList.contains('bubble-badge--expanded'),
    miniDom: !!document.querySelector('.mini-window'),
  }));
  A('S4 点击 → 小窗开 + 条目抑制 + 展开态高亮', s4.miniOpen && s4.expanded.includes('b1') && !s4.suppressedCard && s4.expandedClass && s4.miniDom, JSON.stringify(s4));

  // S5 再点 → 收起 + 条目恢复 + 气泡保留
  await page.click('.bubble-badge[data-noti-id="b1"]');
  await sleep(1200);
  const s5 = await page.evaluate(() => ({
    expanded: window.__bubblesDebug.expanded(),
    cardBack: !!document.querySelector('#notificationsContainer .noti-card[data-id="b1"]'),
    bubbleKept: !!document.querySelector('.bubble-badge[data-noti-id="b1"]'),
    miniStill: window.__miniWindowAll().includes('msg'),
  }));
  A('S5 再点 → 收起恢复条目 + 气泡保留（实例留存）', !s5.expanded.includes('b1') && s5.cardBack && s5.bubbleKept && s5.miniStill, JSON.stringify(s5));

  // S6 纵向拖拽 b2（真实鼠标路径：touchSlop 判别 + 钳制）
  const bb2 = await page.locator('.bubble-badge[data-noti-id="b2"]').boundingBox();
  const cy = bb2.y + bb2.height / 2;
  const cx = bb2.x + bb2.width / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + 200, { steps: 8 });
  await page.mouse.up();
  await sleep(500);
  const s6 = await page.evaluate(() => ({
    y: window.__bubblesDebug.yOf('b2'),
    dragged: window.__bubblesDebug.snapshot().find((b) => b.id === 'b2')?.dragged,
  }));
  A('S6 拖拽 → y 跟随落位（154+200=354，界内不触发钳制）', s6.dragged === true && s6.y === 354, JSON.stringify(s6));

  // S7 DELETE → 气泡移除（真 postMessage 通道）
  await page.evaluate(() => window.postMessage({ type: 'DELETE_MESSAGE_NOTIFICATION', payload: { notiId: 'b1' } }, '*'));
  await sleep(800);
  const s7 = await page.evaluate(() => ({
    count: window.__bubblesDebug.count,
    b1: !!document.querySelector('.bubble-badge[data-noti-id="b1"]'),
    b2kept: !!document.querySelector('.bubble-badge[data-noti-id="b2"]'),
  }));
  A('S7 删除通知 → 气泡移除（b2 保留）', s7.count === 1 && !s7.b1 && s7.b2kept, JSON.stringify(s7));

  // S9 二期：长按扇出成行 → Esc 回收（BubbleStackView 选泡隐喻）
  await page.evaluate(() => window.postMessage({ type: 'NOTIFY', payload: { id: 'b3', appId: 'msg', appName: '信息', title: 'Cara', desc: '第三条', canBubble: true } }, '*'));
  await sleep(600);
  const bb = await page.locator('.bubble-badge[data-noti-id="b2"]').boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await sleep(700); // 越过 FANOUT_PRESS_MS=500
  await page.mouse.up();
  await sleep(300);
  const s9a = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.bubble-badge')];
    return {
      fan: window.__bubblesDebug.fan,
      fanCls: els.filter((e) => e.classList.contains('bubble-badge--fan')).length,
      rights: els.map((e) => parseInt(e.style.right, 10)),
      count: window.__bubblesDebug.count,
    };
  });
  A('S9a 长按 → 扇出成行（2 枚 --fan + 横位互异 + fan=true）',
    s9a.fan === true && s9a.fanCls === 2 && new Set(s9a.rights).size === 2 && s9a.count === 2, JSON.stringify(s9a));
  await page.keyboard.press('Escape');
  await sleep(400);
  const s9b = await page.evaluate(() => ({
    fan: window.__bubblesDebug.fan,
    rightBack: parseInt(document.querySelector('.bubble-badge[data-noti-id="b3"]').style.right, 10),
  }));
  A('S9b Esc → 扇出回收（右缘堆叠复位）', s9b.fan === false && s9b.rightBack === 12, JSON.stringify(s9b));

  // S10 二期：拖入底部 dismiss 区 → 气泡移除 + 通知同步取消
  const bb3 = await page.locator('.bubble-badge[data-noti-id="b3"]').boundingBox();
  await page.mouse.move(bb3.x + bb3.width / 2, bb3.y + bb3.height / 2);
  await page.mouse.down();
  await page.mouse.move(240, 830, { steps: 10 }); // 视口 480×860：dismiss 区 y≥764、x∈[144,336]
  const s10a = await page.evaluate(() => ({
    targetCls: document.querySelector('.bubble-badge[data-noti-id="b3"]')?.classList.contains('bubble-badge--dismiss-target'),
    hint: (() => { const h = document.getElementById('bubbleDismissHint'); return !!h && parseFloat(h.style.opacity) > 0.5; })(),
  }));
  await page.mouse.up();
  await sleep(600);
  const s10b = await page.evaluate(() => ({
    count: window.__bubblesDebug.count,
    b3: !!document.querySelector('.bubble-badge[data-noti-id="b3"]'),
    b3Noti: !!document.querySelector('#notificationsContainer .noti-card[data-id="b3"]'),
    b2kept: !!document.querySelector('.bubble-badge[data-noti-id="b2"]'),
  }));
  A('S10 拖入 dismiss 区 → target 高亮 + 提示浮出 + 气泡与通知同步出列（b2 保留）',
    s10a.targetCls && s10a.hint && s10b.count === 1 && !s10b.b3 && !s10b.b3Noti && s10b.b2kept, JSON.stringify({ s10a, s10b }));

  // S8 全程零 pageerror
  A('S8 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));
} catch (e) {
  console.log('FATAL', e);
  failed = 1;
} finally {
  await browser.close();
  server.kill();
}
failed = results.filter((r) => !r[0]).length;
console.log(`\n==== e2e-v91: ${results.length - failed}/${results.length} passed ====`);
process.exit(failed ? 1 : 0);
