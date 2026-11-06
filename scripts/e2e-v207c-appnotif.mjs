// e2e-v207c-appnotif.mjs — v10.24 #207 三期 应用通知页 E2E 核验
// ① 渠道注册表 seed（__channelDebug.set 两应用 × 渠道）→ 页 19「应用通知」行 → 页 35
// ② 页 35 权威结构：按应用分组卡片 + 渠道行（名称 + importance 标签 + M3 开关）
// ③ 渠道开关：关 → importance 标签「无」+ __channelDebug.get importance=0；开 → 恢复原值
// ④ 摘要行「N 个渠道 · M 个已开启」联动 + 零 pageerror + 截图 docs/v207c/
//
// 用法：MD3_BASE=http://127.0.0.1:8081/ios-desktop/index.html?nolock=1 node scripts/e2e-v207c-appnotif.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/md3-repo/docs/v207c';
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

// ① seed 渠道（messages × 2 + clock × 1；__channelDebug.set(appId, channelId, importance, name)）
await page.evaluate(() => {
  window.__channelDebug.set('messages', 'dm', 4, '私信');
  window.__channelDebug.set('messages', 'group', 3, '群聊');
  window.__channelDebug.set('clock', 'alarm', 4, '闹钟提醒');
});
await sleep(200);

// ② 打开设置 → 页 19 通知 → 应用通知行
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(2000);
await page.evaluate(() => {
  const row = document.querySelector('.tp-row[data-tp-key="notifications"]') ||
    [...document.querySelectorAll('.tp-row')].find((r) => r.textContent.includes('通知'));
  if (row) row.click();
});
await sleep(1200);
const rowVisible = await page.evaluate(() => !!document.querySelector('[data-test="app-notifications"]'));
check('页 19 应用通知行可见（data-test=app-notifications）', rowVisible);

await page.evaluate(() => document.querySelector('[data-test="app-notifications"]').click());
await sleep(1000);

// ③ 页 35 权威结构
const p35 = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const cards = [...document.querySelectorAll('[data-test="appnotif-app-card"]')];
  const rows = [...document.querySelectorAll('[data-test="appnotif-channel-row"]')];
  return {
    list: !!q('[data-test="appnotif-list"]'),
    emptyHidden: q('[data-test="appnotif-empty"]') ? q('[data-test="appnotif-empty"]').style.display === 'none' : false,
    appCount: cards.length,
    appNames: cards.map((c) => c.querySelector('span span').textContent),
    msgSummary: (cards.find((c) => c.dataset.app === 'messages') || {}).textContent || '',
    rowCount: rows.length,
    impLabels: rows.map((r) => r.querySelector('[data-role="imp"]').textContent),
    switchesOn: rows.filter((r) => r.querySelector('.appnotif-ch-switch').checked).length,
  };
});
check('页 35 清单容器 + 空态隐藏（有注册渠道）', p35.list && p35.emptyHidden);
check('按应用分组：2 张应用卡（messages/clock）', p35.appCount === 2, JSON.stringify(p35.appNames));
check('渠道行 3 条（2+1）', p35.rowCount === 3);
check('importance 标签权威值（默认/高/高，zh 拼音序：群聊<私信）', JSON.stringify(p35.impLabels) === JSON.stringify(['默认', '高', '高']), JSON.stringify(p35.impLabels));
check('开关初始全开（3/3）', p35.switchesOn === 3);
check('应用卡摘要「2 个渠道 · 2 个已开启」', p35.msgSummary.includes('2 个渠道 · 2 个已开启'), p35.msgSummary.slice(0, 60));
await page.screenshot({ path: `${OUT}/appnotif-page.png` });

// ④ 渠道开关：关「私信」→ 标签「无」+ store importance=0
await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-test="appnotif-channel-row"]')]
    .find((r) => r.dataset.app === 'messages' && r.dataset.ch === 'dm');
  row.querySelector('.appnotif-ch-switch').click();
});
await sleep(500);
const off = await page.evaluate(() => ({
  imp: window.__channelDebug.get('messages', 'dm').importance,
  label: [...document.querySelectorAll('[data-test="appnotif-channel-row"]')]
    .find((r) => r.dataset.app === 'messages' && r.dataset.ch === 'dm')
    .querySelector('[data-role="imp"]').textContent,
  summary: [...document.querySelectorAll('[data-test="appnotif-app-card"]')]
    .find((c) => c.dataset.app === 'messages').textContent,
}));
check('渠道关 → store importance=0（NONE 记忆原值）', off.imp === 0, `imp=${off.imp}`);
check('行内标签刷新为「无」', off.label === '无', `label=${off.label}`);
check('应用卡摘要联动「2 个渠道 · 1 个已开启」', off.summary.includes('2 个渠道 · 1 个已开启'));

// ⑤ 开回 → 恢复原值 4
await page.evaluate(() => {
  const row = [...document.querySelectorAll('[data-test="appnotif-channel-row"]')]
    .find((r) => r.dataset.app === 'messages' && r.dataset.ch === 'dm');
  row.querySelector('.appnotif-ch-switch').click();
});
await sleep(500);
const on = await page.evaluate(() => ({
  imp: window.__channelDebug.get('messages', 'dm').importance,
  label: [...document.querySelectorAll('[data-test="appnotif-channel-row"]')]
    .find((r) => r.dataset.app === 'messages' && r.dataset.ch === 'dm')
    .querySelector('[data-role="imp"]').textContent,
}));
check('渠道开 → 恢复原 importance=4', on.imp === 4, `imp=${on.imp}`);
check('行内标签恢复「高」', on.label === '高', `label=${on.label}`);

// ⑥ tombstone 不入清单
await page.evaluate(() => { window.__channelDebug.remove('clock', 'alarm'); });
await sleep(300);
// 重渲染触发：监听在 document（settings-appnotif.js app-page-active 注册点）
await page.evaluate(() => document.dispatchEvent(new CustomEvent('app-page-active', { detail: { appId: 'settings', pageIdx: 35 } })));
await sleep(300);
const afterDel = await page.evaluate(() => document.querySelectorAll('[data-test="appnotif-channel-row"]').length);
check('tombstone 渠道不入清单（3→2）', afterDel === 2, `rows=${afterDel}`);

check('零 pageerror', pageErrors === 0, `errors=${pageErrors}`);

await browser.close();
log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
