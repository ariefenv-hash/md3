// ==================== e2e-v108-volume-touch-insets.mjs — #108 音量面板非模态化真跑（v9.90） ====================
// Q1 音量键唤起面板 → 真实鼠标点击桌面空白 → 面板收起（ACTION_OUTSIDE 主路径）
// Q2 面板显示态再唤起 → 点击面板间隙/背景（胶囊内部非控件区）→ 收起（NOTE bounds 内非控件区同构）
//    ——配合真实 elementFromPoint 断言穿透：胶囊背景落点命中下层桌面（pointer-events 分层真跑）
// Q3 滑条控件面点击 → 面板保持（consume；控件自消费，不误收）
// Q4 铃声抽屉按钮点击 → consume 不收起 + 展开抽屉仍保持（mTopContainer 同构）
// Q5 面板显示期间下方桌面元素可正常接收点击（「下方界面无法触摸」痛点回归面）
// Q6 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8989;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });

  const visible = () => page.evaluate(() => document.getElementById('volumeDialog').classList.contains('visible'));

  // ---------- Q1 外部点击收起（ACTION_OUTSIDE 主路径） ----------
  await page.keyboard.press('AudioVolumeUp');
  await sleep(300);
  A('Q1a 音量键唤起面板 visible', (await visible()) === true);
  // 桌面空白落点（视口左下角——远离右侧面板 60px 胶囊）
  await page.mouse.click(120, 520);
  await sleep(250);
  A('Q1b 桌面空白点击 → 面板收起（DISMISS_REASON_TOUCH_OUTSIDE）', (await visible()) === false);

  // ---------- Q2 胶囊内部非控件区穿透 + 收起（NOTE 同构） ----------
  await page.keyboard.press('AudioVolumeUp');
  await sleep(300);
  // 非控件落点 = 胶囊 60px 宽内滑条 52px 居中的 4px 侧缘带（x = bg.right-2）：
  // .vd-bg 与容器 pointer-events:none → hit-test 穿透落到下层（真跑证明）；
  // 该落点 pointerdown = ACTION_OUTSIDE（bounds 内非控件区）→ 收起 + 下层同收事件
  const probe = await page.evaluate(() => {
    const bg = document.querySelector('#volumeDialog .vd-bg');
    const r = bg.getBoundingClientRect();
    const cx = Math.round(r.right - 2), cy = Math.round(r.top + r.height * 0.4);
    const hit = document.elementFromPoint(cx, cy);
    return { cx, cy, insideDialog: !!(hit && hit.closest && hit.closest('#volumeDialog')), hitDesc: hit ? (hit.className || hit.id || hit.tagName) : 'null' };
  });
  A('Q2a 胶囊侧缘非控件带 hit-test 穿透（elementFromPoint 不落对话框内）', probe.insideDialog === false, `hit=${probe.hitDesc}`);
  await page.mouse.click(probe.cx, probe.cy);
  await sleep(250);
  A('Q2b 胶囊内部非控件区点击 → 面板收起（bounds 内非控件区 ACTION_OUTSIDE）', (await visible()) === false);

  // ---------- Q3 滑条控件面 consume（不误收） ----------
  await page.keyboard.press('AudioVolumeUp');
  await sleep(300);
  const sl = await page.evaluate(() => {
    const r = document.getElementById('vdSlider').getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await page.mouse.click(sl.x, sl.y);
  await sleep(250);
  A('Q3 滑条控件面点击 → 面板保持（consume）', (await visible()) === true);

  // ---------- Q4 铃声抽屉 consume + 展开态保持 ----------
  const rg = await page.evaluate(() => {
    const btn = document.querySelector('#vdRingerDrawer .vd-ringer-btn[data-mode="ring"]');
    const r = btn.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await page.mouse.click(rg.x, rg.y);          // 点现模式钮 → 展开抽屉
  await sleep(250);
  A('Q4a 铃声抽屉点击 → consume 面板保持', (await visible()) === true);
  const expanded = await page.evaluate(() => document.querySelectorAll('#vdRingerDrawer .vd-ringer-btn:not([hidden])').length);
  A('Q4b 抽屉展开三钮全显', expanded === 3, `visible=${expanded}`);
  await page.mouse.click(rg.x, rg.y);          // 展开态再点 → 选定收起抽屉（面板仍在）
  await sleep(250);
  A('Q4c 展开态再点 → 抽屉收起、面板保持', (await visible()) === true);

  // ---------- Q5 显示期间下方桌面元素可交互（用户痛点回归面） ----------
  await page.keyboard.press('AudioVolumeUp');
  await sleep(300);
  const q5 = await page.evaluate(() => {
    // 桌面图标（面板左下方）接收点击：volume-dialog 非模态语义下不挡下层
    const icon = document.querySelector('#desktop .app-icon') || document.querySelector('[data-id]');
    if (!icon) return { ok: false, why: 'no-icon' };
    const r = icon.getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    return { ok: hit !== null && !hit.closest('#volumeDialog'), hitDesc: hit ? (hit.className || hit.id || hit.tagName) : 'null' };
  });
  A('Q5 面板显示时桌面图标 hit-test 直达（无遮罩元凶）', q5.ok === true, `hit=${q5.hitDesc}`);

  // ---------- Q6 零 pageerror ----------
  A('Q6 全程零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
const fails = results.filter((r) => !r[0]).length;
console.log(`\n[e2e-v108] 结果：PASS ${results.length - fails} / FAIL ${fails}`);
process.exit(fails ? 1 : 0);
