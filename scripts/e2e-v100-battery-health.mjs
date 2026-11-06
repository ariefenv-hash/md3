// e2e-v100-battery-health.mjs — v10.23 #100 电池健康模拟模型 + 充电上限闸 E2E 核验
// ① 设置›电池 子页健康卡渲染：容量 100% / 状态「良好」/ 循环行 / 模拟数据明示标注
// ② 充电吞吐累计：__batterySim 接入充电器 + forceSteps 快进 → 累计充电 % 增长 / 建议卡（限充建议）出现
// ③ 充电上限闸 hold：开关开启 → 电量降至 <80 → 充电快进 → **冻结在 80%**（A14+ BatteryChargeLimit 语义）
//    + isChargeHoldReached 观测面 true
// ④ 限充解除释放：开关关闭 → 快进越过 80（83±自然拍容差）
// ⑤ 建议卡随限充开关联动（开→隐藏，关闭限充且非充电→隐藏）
// ⑥ 零 pageerror + 截图两张落盘 docs/v100/
//
// 用法：MD3_BASE=http://127.0.0.1:8081/ios-desktop/index.html?nolock=1 node scripts/e2e-v100-battery-health.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/md3-repo/docs/v100';
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

// 无头 Chromium 实测暴露 stub navigator.getBattery（charging=true/level=100 幻影）——
// 本用例需确定性虚拟电池节律：注入删 getBattery → battery-service 走模拟引擎路径
// （真实 API 路径的幻影吞吐防护已由 v10.23 首拍闸覆盖，单测锚在 v100 测试文件）
await page.addInitScript(() => {
  try { delete Navigator.prototype.getBattery; } catch (e) {}
  try { delete navigator.getBattery; } catch (e) {}
});

await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await sleep(2500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(1200);

// ① 打开设置 → 电池行 → 页 2
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(2000);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="battery"]').click());
await sleep(1200);

const simActive = await page.evaluate(() => !!(window.__batterySim && window.__batterySim.active()));
check('模拟电池引擎在跑（无 Battery API 环境降级）', simActive);

// ② 健康卡权威结构
const h0 = await page.evaluate(() => {
  const card = document.querySelector('[data-test="battery-health"]');
  const vis = !!card && card.offsetParent !== null;
  const pct = (document.getElementById('settingsBatteryHealthPct') || {}).textContent || '';
  const status = (document.getElementById('settingsBatteryHealthStatus') || {}).textContent || '';
  const cyc = (document.getElementById('settingsBatteryHealthCycles') || {}).textContent || '';
  const note = card ? card.textContent : '';
  const limSw = document.getElementById('settingsBatteryHealthLimitSwitch');
  return { vis, pct, status, cyc, note, hasLimit: !!limSw, limitChecked: !!limSw && limSw.checked,
    sugDisplay: (document.getElementById('settingsBatteryHealthSuggest') || {}).style ? document.getElementById('settingsBatteryHealthSuggest').style.display : 'missing' };
});
check('健康卡可见（data-test=battery-health）', h0.vis);
check('初始容量 100% / 状态良好', h0.pct === '100%' && h0.status === '良好', `pct="${h0.pct}" status="${h0.status}"`);
check('循环行初始（累计充电 0% · 循环 0 次）', h0.cyc === '累计充电 0% · 循环 0 次', `cyc="${h0.cyc}"`);
check('模拟数据明示标注在场（议题规格「明确标注为模拟」）', h0.note.includes('模拟数据：浏览器 Battery API 不提供健康度'));
check('充电上限开关存在（默认关）', h0.hasLimit && !h0.limitChecked);
check('建议卡初始隐藏（非充电态）', h0.sugDisplay === 'none', `display="${h0.sugDisplay}"`);
await page.screenshot({ path: `${OUT}/battery-health.png` });

// ③ 充电吞吐累计 + 限充建议卡出现（充电中未开限充）
const lvl0 = await page.evaluate(() => parseInt((document.getElementById('settingsBatteryPct') || {}).textContent, 10) || 0);
await page.evaluate(() => { window.__batterySim.setCharging(true); window.__batterySim.forceSteps(10, 2000); });
await sleep(300);
const h1 = await page.evaluate(() => {
  const m = ((document.getElementById('settingsBatteryHealthCycles') || {}).textContent || '').match(/累计充电 (\d+)% · 循环 (\d+) 次/);
  const pct = (document.getElementById('settingsBatteryPct') || {}).textContent || '';
  return { total: m ? parseInt(m[1], 10) : -1, cycles: m ? parseInt(m[2], 10) : -1, lvl: parseInt(pct, 10) || 0,
    sugShown: (document.getElementById('settingsBatteryHealthSuggest') || {}).style.display !== 'none',
    sugText: (document.getElementById('settingsBatteryHealthSuggestText') || {}).textContent || '' };
});
check('充电快进 +10 格电量上升', h1.lvl >= lvl0 + 8, `${lvl0}→${h1.lvl}`);
check('充电吞吐累计 ≥8%（等效满充口径）', h1.total >= 8, `total=${h1.total}`);
check('循环数派生正确（<100% 吞吐 → 0 次）', h1.cycles === 0, `cycles=${h1.cycles}`);
check('限充建议卡出现（充电中未开限充）', h1.sugShown, `text="${h1.sugText}"`);
check('建议文案为限充建议', h1.sugText.includes('开启充电上限'));

// ④ 充电上限闸 hold：开限充 → 放电降至 <80 → 充电快进 → 冻结 80%
await page.evaluate(() => {
  const sw = document.getElementById('settingsBatteryHealthLimitSwitch');
  sw.click();
});
await sleep(600);
const h2 = await page.evaluate(() => ({
  limitChecked: document.getElementById('settingsBatteryHealthLimitSwitch').checked,
  sugHidden: document.getElementById('settingsBatteryHealthSuggest').style.display === 'none',
}));
check('限充开关已开启', h2.limitChecked);
check('建议卡随限充开启隐藏（chargingSuggestion → null）', h2.sugHidden);

// 放电降至 80 以下
await page.evaluate(() => { window.__batterySim.setCharging(false); window.__batterySim.forceSteps(20); });
await sleep(200);
const below = await page.evaluate(() => parseInt((document.getElementById('settingsBatteryPct') || {}).textContent, 10) || 0);
check('放电后电量低于 80（限充闸待触发）', below < 80 && below >= 70, `below=${below}`);

// 限充充电快进（30 步 > 到 80 的距离 → 必须冻结在 80）
await page.evaluate(() => { window.__batterySim.setCharging(true); window.__batterySim.forceSteps(30, 2000); });
await sleep(300);
const hold = await page.evaluate(() => {
  const pct = (document.getElementById('settingsBatteryPct') || {}).textContent || '';
  return { lvl: parseInt(pct, 10) || 0 };
});
check('限充闸冻结在 80%（A14+ BatteryChargeLimit hold）', hold.lvl === 80, `lvl=${hold.lvl}`);
await page.screenshot({ path: `${OUT}/limit-hold-80.png` });

// ⑤ 限充解除释放：关限充 → 快进越过 80
await page.evaluate(() => { document.getElementById('settingsBatteryHealthLimitSwitch').click(); });
await sleep(400);
await page.evaluate(() => { window.__batterySim.forceSteps(3); });
await sleep(200);
const after = await page.evaluate(() => parseInt((document.getElementById('settingsBatteryPct') || {}).textContent, 10) || 0);
check('限充关闭后快进越过 80（83±1 自然拍容差）', after > 80 && after <= 85, `after=${after}`);

// ⑥ 充电吞吐冻结期零幽灵累计（hold 分支 level 不变 → 吞吐不增）+ 页面健康
//    预期总量 = 快进累计 10（③步）+ （80-below）（④步限充段）；自然拍容差 ±3
const h3 = await page.evaluate(() => {
  const m = ((document.getElementById('settingsBatteryHealthCycles') || {}).textContent || '').match(/累计充电 (\d+)% · 循环 (\d+) 次/);
  return { total: m ? parseInt(m[1], 10) : -1 };
});
const expectTotal = 10 + (80 - below);
check('冻结期零幽灵累计（hold 不产生吞吐）', h3.total >= expectTotal - 3 && h3.total <= expectTotal + 3, `total=${h3.total} expect≈${expectTotal}`);
check('零 pageerror', pageErrors === 0, `errors=${pageErrors}`);

await browser.close();
log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
