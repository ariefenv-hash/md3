// ==================== e2e-v107-navbar-volume-keys.mjs — #107 导航栏附加音量键真跑（v9.91） ====================
// Q1 桌面缺省：附加键隐藏（default 桌面隐藏——§7.2b 裁决面）
// Q2 显式开启（runtime 桥 setVolumeKeys('on')）→ 双键可见（栏尾成组，recents 之后）
// Q3 点音量加 → 音量面板唤起 + 15 级步进真值（60→67，#109 目标流 + 3s 收起全链复用）
// Q4 点音量减 → 回步（77→70）
// Q5 显式关闭 → 双键隐藏（display:none 不入 hit-test）
// Q6 按住音量加 1.2s → 不误入拖移模式（repositioning 类零出现——融合手势排除真跑）
// Q7 持久化：setVolumeKeys 后 reload 仍生效（localStorage 真源）
// Q8 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8991;
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
  // 手机视口（<600px → navButtonHost floating）：三键独立浮条宿主（平板 taskbar
  // 宿主下键画在任务栏内部、浮条 display:none = #162 三期形态分派正确语义，
  // 附加键随栏隐藏——e2e 须在浮条宿主面验证）
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => { try { localStorage.setItem('ios-desktop:navbar-enabled', '1'); } catch (e) {} });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });

  const volBtns = () => page.evaluate(() => {
    const btns = [...document.querySelectorAll('#sysNavBar .nvb-vol')];
    return { count: btns.length, visible: btns.filter((b) => !b.hidden).length };
  });
  const clickVol = async (dir) => page.evaluate((d) => {
    const b = document.querySelector(`#sysNavBar .nvb-vol[data-nvb="volume-${d}"]`);
    const r = b.getBoundingClientRect();
    b.click();
    return { x: Math.round(r.left), y: Math.round(r.top) };
  }, dir);
  const dialogState = () => page.evaluate(() => {
    const d = document.getElementById('volumeDialog');
    return { visible: d.classList.contains('visible'), val: document.getElementById('vdSlider').getAttribute('aria-valuenow') };
  });

  // ---------- Q1 桌面缺省隐藏 ----------
  const q1 = await volBtns();
  A('Q1 桌面缺省：附加键 hidden（default 桌面隐藏裁决）', q1.count === 2 && q1.visible === 0, `count=${q1.count} visible=${q1.visible}`);

  // ---------- Q2 显式开启 ----------
  await page.evaluate(() => window.__navBar.setVolumeKeys('on'));
  await sleep(200);
  const q2 = await volBtns();
  A('Q2 setVolumeKeys(on) → 双键可见', q2.visible === 2, `visible=${q2.visible}`);
  const order = await page.evaluate(() => {
    const kids = [...document.querySelectorAll('#sysNavBar .nvb-btn')].map((b) => b.dataset.nvb);
    return kids;
  });
  A('Q2b 栏尾成组：recents 之后 down→up（不扩三键几何）', JSON.stringify(order) === JSON.stringify(['back', 'home', 'recents', 'volume-down', 'volume-up']), order.join(','));

  // ---------- Q3 音量加 → 面板 + 15 级步进 ----------
  await clickVol('up');
  await sleep(300);
  let st = await dialogState();
  A('Q3a 点音量加 → 面板唤起', st.visible === true);
  A('Q3b 静默回落 ring 档 15 级步进 70→77（#109 判定链真跑，KEY_STEP=100/15）', st.val === '77', `val=${st.val}`);
  const ringStore = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('settings:sound-v1') || '{}').ring; } catch (e) { return null; }
  });
  A('Q3c ring 真源同键落值 77（settings:sound-v1，设置页双向同步）', ringStore === 77, `ring=${ringStore}`);

  // ---------- Q4 音量减回步 ----------
  await clickVol('down');
  await sleep(300);
  st = await dialogState();
  A('Q4 点音量减 → 回步 77→70', st.val === '70', `val=${st.val}`);

  // ---------- Q5 显式关闭 ----------
  await page.evaluate(() => window.__navBar.setVolumeKeys('off'));
  await sleep(200);
  const q5 = await volBtns();
  A('Q5 setVolumeKeys(off) → 双键隐藏', q5.visible === 0);

  // ---------- Q6 按住不误入拖移模式 ----------
  await page.evaluate(() => window.__navBar.setVolumeKeys('on'));
  await sleep(200);
  const box = await page.evaluate(() => {
    const b = document.querySelector('#sysNavBar .nvb-vol[data-nvb="volume-up"]');
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await sleep(1200);                      // 越过 1s 长按拖移阈值
  const repos = await page.evaluate(() => !!document.getElementById('sysNavBar').classList.contains('repositioning'));
  await page.mouse.up();
  await sleep(250);
  A('Q6 按住 1.2s 不入拖移模式（融合手势排除）', repos === false);
  st = await dialogState();
  A('Q6b 释放后 click 正常消费（面板步进唤起 70→77）', st.visible === true && st.val === '77', `val=${st.val}`);

  // ---------- Q7 持久化（reload 后 on 仍生效） ----------
  await page.reload({ waitUntil: 'load' });
  await sleep(2200);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  const q7 = await volBtns();
  A('Q7 reload 后持久化生效（localStorage 真源）', q7.visible === 2, `visible=${q7.visible}`);

  // ---------- Q8 零 pageerror ----------
  A('Q8 全程零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
const fails = results.filter((r) => !r[0]).length;
console.log(`\n[e2e-v107] 结果：PASS ${results.length - fails} / FAIL ${fails}`);
process.exit(fails ? 1 : 0);
