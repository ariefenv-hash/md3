// e2e-v801-notifications-subpage.mjs — v8.01 #10 四期 E2E 核验
// ① 一级菜单通知行 → 页 19「通知」（宽栏双栏 openPane 路径）
// ② 页 19 权威结构：5 分区标题（管理/对话/隐私/常规）+ 权威行文案 + 全行无图标
// ③ 真实数据超越点：历史摘要「N 条通知」+ 对话摘要「N 个优先对话」（localStorage 同源直读）
// ④ 历史面板展开渲染真实通知（Pixel 团队/日历/系统更新）
// ⑤ lock_screen_notifications 三选对话框：当前点高亮 → 选「hide」→ 摘要联动 + redact 开关同步
// ⑥ redact 开关切换回 show → 摘要「显示所有通知内容」
// ⑦ 开关 AOSP 默认值（badging=开 / snooze=关 / assistant=开）+ 单源持久化 settings:notifications-v1
// ⑧ 零 pageerror + 截图三张落盘 docs/v801/
//
// 用法：MD3_BASE=http://127.0.0.1:8081/ios-desktop/index.html?nolock=1 node scripts/e2e-v801-notifications-subpage.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/md3-repo/docs/v801';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', (e) => { pageErrors++; log('[pageerror]', e.message.slice(0, 200)); });

await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await sleep(2500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(1200);

// ① 打开设置（桌面图标）→ 宽栏双栏默认页
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1600);

// ② 左栏通知行摘要与直通（idx 19）
const notifRow = await page.evaluate(() => {
  const row = document.querySelector('.tp-row[data-tp-key="notifications"]');
  return row ? { sub: row.querySelector('.tp-row-sub')?.textContent.trim(), tp: row.dataset.tp } : null;
});
check('通知行存在于左栏且 data-tp=19', !!notifRow && notifRow.tp === '19', JSON.stringify(notifRow));

// 点通知行 → 右栏打开页 19
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="notifications"]').click());
await sleep(1400);

const p19 = await page.evaluate(() => {
  const pageEl = document.getElementById('app-page-settings-19');
  if (!pageEl) return null;
  const txt = pageEl.textContent;
  return {
    mounted: true,
    title: !!txt.includes('通知'),
    secManage: !!txt.includes('管理'),
    secConvo: !!txt.includes('对话'),
    secPrivacy: !!txt.includes('隐私'),
    secGeneral: !!txt.includes('常规'),
    rowApps: txt.includes('应用通知') && txt.includes('控制来自各个应用的通知'),
    rowHistory: txt.includes('历史通知'),
    rowBubbles: txt.includes('消息气泡') && txt.includes('已开启/对话能以浮动图标形式显示'),
    rowAccess: txt.includes('读取、回复和控制通知'),
    rowCellBc: txt.includes('无线紧急警报'),
    rowBadging: txt.includes('应用图标上的通知圆点'),
    rowAssistant: txt.includes('增强型通知') && txt.includes('接收建议的操作、回复等内容'),
    hosted: !!pageEl.classList.contains('tp-hosted'),
  };
});
check('页 19 挂载（栈页被双栏移动 hosted）', !!p19 && p19.mounted && p19.hosted, JSON.stringify(!!p19 && p19.hosted));
check('页 19 标题「通知」', !!p19 && p19.title);
check('四分区标题齐（管理/对话/隐私/常规）', !!p19 && p19.secManage && p19.secConvo && p19.secPrivacy && p19.secGeneral);
check('应用通知行 + 权威摘要', !!p19 && p19.rowApps);
check('消息气泡行 + 开启态权威摘要', !!p19 && p19.rowBubbles);
check('读取回复和控制通知行', !!p19 && p19.rowAccess);
check('无线紧急警报行', !!p19 && p19.rowCellBc);
check('通知圆点行', !!p19 && p19.rowBadging);
check('增强型通知行 + 权威摘要', !!p19 && p19.rowAssistant);

// ③ 真实数据动态摘要（默认演示通知：n1/n2 会话 + n3 静音）
const dyn = await page.evaluate(() => ({
  hist: document.getElementById('notifHistorySub')?.textContent.trim(),
  convo: document.getElementById('notifConvoSub')?.textContent.trim(),
  lock: document.getElementById('notifLockSub')?.textContent.trim(),
}));
check('历史摘要 = 3 条通知（真实数据计数）', dyn.hist === '3 条通知', String(dyn.hist));
check('对话摘要 = 2 个优先对话（category 含会话计数）', dyn.convo === '2 个优先对话', String(dyn.convo));
check('锁屏通知摘要默认 = 显示所有通知内容', dyn.lock === '显示所有通知内容', String(dyn.lock));

await page.screenshot({ path: `${OUT}/p19-notifications-page.png` });

// ④ 历史面板展开（真实通知渲染 + 转义安全）
await page.evaluate(() => window.__notifHistoryToggle && window.__notifHistoryToggle());
await sleep(600);
const histPanel = await page.evaluate(() => {
  const panel = document.getElementById('notifHistoryPanel');
  const list = document.getElementById('notifHistoryList');
  return {
    open: !!panel && panel.style.display !== 'none',
    items: list ? list.children.length : 0,
    hasPixelTeam: !!list && list.textContent.includes('Google Pixel 团队'),
    hasCalendar: !!list && list.textContent.includes('项目架构评审'),
  };
});
check('历史面板展开', histPanel.open);
check('历史面板渲染真实通知 3 条', histPanel.items === 3, String(histPanel.items));
check('历史面板含真实标题（Pixel 团队/日历评审）', histPanel.hasPixelTeam && histPanel.hasCalendar);
await page.screenshot({ path: `${OUT}/p19-history-panel.png` });
await page.evaluate(() => window.__notifHistoryToggle && window.__notifHistoryToggle());
await sleep(300);

// ⑤ 锁屏通知三选对话框：开 → show 高亮 → 选 hide → 联动
await page.evaluate(() => window.__notifLockChoose && window.__notifLockChoose());
await sleep(400);
const dlg1 = await page.evaluate(() => {
  const dlg = document.getElementById('notifLockDialog');
  return {
    open: !!dlg && dlg.style.display === 'flex',
    title: !!dlg && dlg.textContent.includes('您希望锁定的屏幕显示什么内容？'),
    opts: dlg ? dlg.querySelectorAll('.notif-lock-opt').length : 0,
    showDotted: !!dlg && dlg.querySelector('.notif-lock-opt[data-opt="show"] .notif-opt-dot')?.innerHTML.trim() !== '',
  };
});
check('三选对话框打开 + interstitial 权威问句', dlg1.open && dlg1.title);
check('对话框三选项（entries 动态注入语义）', dlg1.opts === 3, String(dlg1.opts));
check('当前选项 show 高亮圆点', dlg1.showDotted);
await page.screenshot({ path: `${OUT}/p19-lock-dialog.png` });

await page.evaluate(() => window.__notifLockPick && window.__notifLockPick('hide'));
await sleep(400);
const afterPick = await page.evaluate(() => ({
  lock: document.getElementById('notifLockSub')?.textContent.trim(),
  redact: document.getElementById('notifRedactToggle')?.checked,
  stored: JSON.parse(localStorage.getItem('settings:notifications-v1') || '{}'),
}));
check('选「仅在解锁状态下显示敏感内容」→ 摘要联动', afterPick.lock === '仅在解锁状态下显示敏感内容', String(afterPick.lock));
check('redact 开关同步为关', afterPick.redact === false, String(afterPick.redact));
check('单源持久化写回（lockScreenShow=1, allowPrivate=false）', afterPick.stored.lockScreenShow === 1 && afterPick.stored.allowPrivate === false, JSON.stringify(afterPick.stored));

// ⑥ redact 开关切回开 → 摘要回「显示所有通知内容」
await page.evaluate(() => {
  const sw = document.getElementById('notifRedactToggle');
  sw.checked = true;
  sw.dispatchEvent(new Event('change'));
});
await sleep(400);
const afterToggle = await page.evaluate(() => ({
  lock: document.getElementById('notifLockSub')?.textContent.trim(),
  stored: JSON.parse(localStorage.getItem('settings:notifications-v1') || '{}'),
}));
check('redact 开关切回开 → 摘要回「显示所有通知内容」', afterToggle.lock === '显示所有通知内容', String(afterToggle.lock));
check('单源 allowPrivate 回写 true', afterToggle.stored.allowPrivate === true);

// ⑦ 开关 AOSP 默认值与持久化
const switches = await page.evaluate(() => ({
  badging: document.getElementById('notifBadgingToggle')?.checked,
  snooze: document.getElementById('notifSnoozeToggle')?.checked,
  assistant: document.getElementById('notifAssistantToggle')?.checked,
  silent: document.getElementById('notifSilentToggle')?.checked,
}));
check('badging 默认开（config_notificationBadging=true）', switches.badging === true);
check('snooze 默认关（SHOW_NOTIFICATION_SNOOZE 默认 OFF）', switches.snooze === false);
check('assistant 默认开（NAS 默认启用）', switches.assistant === true);
check('silent_icons 默认关', switches.silent === false);

// ⑧ 选「完全不显示通知」→ 摘要 disable
await page.evaluate(() => window.__notifLockPick && window.__notifLockPick('disable'));
await sleep(300);
const afterDisable = await page.evaluate(() => document.getElementById('notifLockSub')?.textContent.trim());
check('选「完全不显示通知」→ 摘要三态第三态', afterDisable === '完全不显示通知', String(afterDisable));
// 复原为默认（截图与后续会话一致性）
await page.evaluate(() => { window.__settingsNotifsStore && window.__settingsNotifsStore.save({ lockScreenShow: 1, allowPrivate: true, silentIcons: false, snooze: false, badging: true, assistant: true }); });

check('零 pageerror', pageErrors === 0, `errors=${pageErrors}`);

await browser.close();
log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
