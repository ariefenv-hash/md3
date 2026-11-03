// ==================== e2e-v198-zen-mode.mjs — #198 ZenMode/ZenPolicy 全规格 e2e ====================
//
// Q1 QS modes 磁贴 toggle → 勿扰开启：body.dnd-mode-active + zenStore.manualActive
//    + localStorage ios-desktop:zen-mode 落盘（version 1，schema 版本化）
// Q2 ZenDeviceEffects overlay：灰度+夜间模式 → #zen-device-effects 在场（backdrop-filter
//    grayscale(1) + 暗罩背景）；效果清零 → overlay 移除（退出即复原）
// Q3 zen 通知裁决：勿扰开 → UNSET 类不弹横幅（既有语义）/ ALLOW 类（zenCategory ALARMS）穿透
// Q4 ScheduleCalendar 规则：到点自动激活（evalRules changed → 磁贴/类同步）+ 过期自动关断
// Q5 刷新持久化 + 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8972;
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
  // Q1 QS modes 磁贴 → 勿扰开启（真实磁贴链路）
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => {
    // 首访 once 卡先关（e2e-probe-panel 同款前置）
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await sleep(400);
  await page.click('#statusBar', { position: { x: 350, y: 14 }, force: true }); // 下拉 QS
  await sleep(1500);
  // modes 磁贴为「点击弹内联面板」型（AOSP 16 语义），开关在面板内：磁贴 → sheet → 勿扰 switch
  await page.evaluate(() => {
    const pill = document.querySelector('.qs-tile-pill[data-tile-id="modes"]');
    if (pill) pill.click();
  });
  await sleep(900);
  await page.evaluate(() => {
    const sw = document.querySelector('#qsSheetOverlay .qs-sheet-row input[type="checkbox"]');
    if (sw) sw.click(); // change → onChange → setDndActive(true)
  });
  await sleep(800);
  const q1 = await page.evaluate(() => {
    const raw = localStorage.getItem('ios-desktop:zen-mode');
    let saved = null;
    try { saved = JSON.parse(raw); } catch (e) {}
    return {
      dnd: document.body.classList.contains('dnd-mode-active'),
      manual: window.__zenDebug && window.__zenDebug.state().manualActive,
      savedVersion: saved && saved.version,
      savedManual: saved && saved.manualActive,
      overlay: !!document.getElementById('zen-device-effects'),
    };
  });
  A('Q1 modes 磁贴→内联面板 switch → dnd 态 + zenStore.manualActive + 存档落盘 version=1（schema 版本化）',
    q1.dnd && q1.manual === true && q1.savedVersion === 1 && q1.savedManual === true,
    JSON.stringify(q1));

  // Q2 ZenDeviceEffects overlay：灰度 + 夜间模式 → 在场；清零 → 移除
  await page.evaluate(() => {
    window.__zenDebug.setDeviceEffects(1 | 8); // GRAYSCALE | NIGHT_MODE
  });
  await sleep(400);
  const q2a = await page.evaluate(() => {
    const el = document.getElementById('zen-device-effects');
    if (!el) return { has: false };
    const cs = getComputedStyle(el);
    return {
      has: true,
      bf: cs.backdropFilter || cs.webkitBackdropFilter || '',
      bg: cs.backgroundColor,
      pe: cs.pointerEvents,
    };
  });
  A('Q2a 灰度+夜间模式 → overlay 在场（backdrop-filter grayscale + 暗罩 + pointer-events none）',
    q2a.has && String(q2a.bf).includes('grayscale(1)') && q2a.pe === 'none',
    JSON.stringify(q2a));
  await page.evaluate(() => { window.__zenDebug.setDeviceEffects(0); });
  await sleep(400);
  const q2b = await page.evaluate(() => ({
    has: !!document.getElementById('zen-device-effects'),
    dnd: document.body.classList.contains('dnd-mode-active'),
  }));
  A('Q2b 效果清零 → overlay 移除（退出即复原）+ 勿扰态不受影响', !q2b.has && q2b.dnd, JSON.stringify(q2b));

  // Q3 zen 通知裁决：先关 sheet（点 overlay 空白）+ Escape 收 shade（isPullPanelsActive 闸放行）
  await page.evaluate(() => {
    const ov = document.getElementById('qsSheetOverlay');
    if (ov && ov.classList.contains('open')) {
      ov.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      // overlay click 判 e.target === overlay；MouseEvent 默认 target 为 ov 本体 ✓
    }
  });
  await sleep(500);
  // shade 收场路径（pull-down-gesture 注释）：拖拽释放/上滑收起/Escape/状态栏点击 —— 状态栏点击最稳
  await page.click('#statusBar', { position: { x: 350, y: 14 }, force: true });
  await sleep(900);
  // Q3 zen 通知裁决：UNSET 不弹 / ALLOW 穿透（NOTIFY 通道：宿主监听 window message，pkg-sdk 同款）
  await page.evaluate(() => {
    window.postMessage({ type: 'NOTIFY', payload: { id: 'zen-unset-1', app: '测试', title: '普通通知', desc: 'UNSET 类' } }, '*');
  });
  await sleep(1000);
  const q3a = await page.evaluate(() => ({
    hun: window.__headsUpDebug ? window.__headsUpDebug.count : -1,
    inFeed: Array.from(document.querySelectorAll('.notif-item, [class*="notif"]')).length >= 0,
    feedHas: (() => {
      const list = window.__headsUpDebug ? null : null;
      // 数据层：经 localStorage 持久化键直查（addSystemNotification persistNotifications）
      try { return (JSON.parse(localStorage.getItem('ios-desktop:notifications') || '[]')).some((n) => n.id === 'zen-unset-1'); } catch (e) { return false; }
    })(),
  }));
  A('Q3a 勿扰开 → UNSET 类横幅禁（数据照常进面板，既有语义保持）',
    q3a.hun === 0 && q3a.feedHas, JSON.stringify(q3a));
  await page.evaluate(() => {
    // ALLOW 类（出厂默认 ALARMS=ALLOW）→ 横幅穿透
    window.postMessage({ type: 'NOTIFY', payload: { id: 'zen-allow-1', app: '时钟', title: '闹钟提醒', desc: 'ALLOW 类穿透', zenCategory: 'ALARMS' } }, '*');
  });
  await sleep(1000);
  const q3b = await page.evaluate(() => ({
    hun: window.__headsUpDebug ? window.__headsUpDebug.count : -1,
    items: window.__headsUpDebug ? window.__headsUpDebug.items() : [],
    panelActive: !!(document.getElementById('pullPanelsOverlay') && document.getElementById('pullPanelsOverlay').classList.contains('active')),
    alarms: window.__zenDebug.state().priorityStates.ALARMS,
    feedHas: (() => { try { return (JSON.parse(localStorage.getItem('ios-desktop:notifications') || '[]')).some((n) => n.id === 'zen-allow-1'); } catch (e) { return false; } })(),
  }));
  A('Q3b ALLOW 类（ALARMS）横幅穿透（ZenPolicy 细粒度放行）',
    q3b.hun >= 1 && q3b.items.includes('zen-allow-1'), JSON.stringify(q3b));
  // 清场：关掉横幅避免干扰 Q4
  await page.evaluate(() => {
    const n = JSON.parse(localStorage.getItem('ios-desktop:notifications') || '[]').filter((n) => n.id !== 'zen-unset-1' && n.id !== 'zen-allow-1');
    localStorage.setItem('ios-desktop:notifications', JSON.stringify(n));
  });

  // Q4 ScheduleCalendar：到点自动接管 + 过期自动关断（Q1 后 manualActive=true，规则接管 → ruleDriven）
  await page.evaluate(() => {
    const now = new Date();
    const minuteOfDay = now.getHours() * 60 + now.getMinutes();
    // 覆盖当前时刻的规则：start = now-2min, end = now+3min，全周
    window.__zenDebug.upsertRule({
      id: 'e2e-rule-1', label: 'e2e 覆盖当前', days: [1, 2, 3, 4, 5, 6, 7],
      startMinute: (minuteOfDay - 2 + 1440) % 1440, endMinute: (minuteOfDay + 3) % 1440,
    });
    const r = window.__zenDebug.evalRules(now.getDay() + 1, now.getHours() * 60 + now.getMinutes());
    window.__e2eActivated = r.changed === true && r.activated === true
      && window.__zenDebug.state().manualActive === true
      && window.__zenDebug.state().ruleDriven === true;
  });
  const q4a = await page.evaluate(() => window.__e2eActivated);
  A('Q4a 规则到点 → evalRules activated + manualActive/ruleDriven（自动接管状态机）', q4a === true);
  // 过期：把规则挪到已过期区间（start=now-10min, end=now-5min）→ eval → 自动关断
  await page.evaluate(() => {
    const now = new Date();
    const minuteOfDay = now.getHours() * 60 + now.getMinutes();
    window.__zenDebug.upsertRule({
      id: 'e2e-rule-1', label: 'e2e 过期', days: [1, 2, 3, 4, 5, 6, 7],
      startMinute: (minuteOfDay - 10 + 1440) % 1440, endMinute: (minuteOfDay - 5 + 1440) % 1440,
    });
    const r = window.__zenDebug.evalRules(now.getDay() + 1, now.getHours() * 60 + now.getMinutes());
    window.__e2eDeactivated = r.deactivated === true && !window.__zenDebug.state().manualActive;
  });
  const q4b = await page.evaluate(() => window.__e2eDeactivated);
  A('Q4b 规则过期 → 自动关断（ruleDriven 态，manual 不被抢关的语义由单测守护）', q4b === true);

  // Q5 刷新持久化 + 零 pageerror
  await page.evaluate(() => {
    // 规则覆盖当前时刻（reload 后 initQuickSettings 首评仍在区间 → 保持开启）
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    window.__zenDebug.upsertRule({
      id: 'e2e-rule-1', label: 'e2e 覆盖当前', days: [1, 2, 3, 4, 5, 6, 7],
      startMinute: (m - 2 + 1440) % 1440, endMinute: (m + 3) % 1440,
    });
    window.__zenDebug.evalRules(now.getDay() + 1, m); // 激活落盘
  });
  await sleep(300);
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  const q5 = await page.evaluate(() => ({
    dnd: document.body.classList.contains('dnd-mode-active'),
    manual: window.__zenDebug && window.__zenDebug.state().manualActive,
  }));
  A('Q5 刷新持久化：manualActive 存档恢复 → dnd 态在场（跨刷新保留）',
    q5.dnd && q5.manual === true, JSON.stringify(q5));
  A('Q6 全程零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
} catch (e) {
  A('e2e 异常中断', false, String(e));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const failed = results.filter(([c]) => !c);
console.log(`\n==== e2e-v198-zen-mode: ${results.length - failed.length}/${results.length} ====${failed.length ? ' FAILED' : ' ALL PASS'}`);
process.exit(failed.length ? 1 : 0);
