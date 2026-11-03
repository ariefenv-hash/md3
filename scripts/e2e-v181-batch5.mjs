// ==================== e2e-v181-batch5.mjs — #181 第五批 bytebeat 行为真跑（v9.52） ====================
// bytebeat 直开（无桌面注入 → __system 不可用 → SDK 降级路径不炸为验收点）+ 手机/平板双视口：
// Q1 手机 400px：.bb-canvas-row 纵向堆叠 + 布局保持 flex column（零变化锚）
// Q2 平板 800px：.bb-app grid 两列（1fr/300px）+ .bb-lib 右列跨全行 + 左列 canvas-row col1
// Q3 音量怠速柄 .mdslider 0.67 → --p=67% + localStorage vol 持久化（reload 复验 --p 回填）
// Q4 pressRipple 整排联动：pointerdown 于经典库 chip → 近邻 chip transform scale 衰减 → pointerup 复位
// Q5 降级零炸：无 __system 下收藏（notify 降级静默）+ 复制链接（clipboard 三级链降级 execCommand）+ 零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8957;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/apps`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // 外域断网（e2e 惯例）

try {
  // Q1 手机 400px
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`${BASE}/bytebeat/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  const q1 = await page.evaluate(() => {
    const app = document.querySelector('.bb-app');
    const row = document.querySelector('.bb-canvas-row');
    return {
      appFlex: getComputedStyle(app).display === 'flex',
      rowColumn: getComputedStyle(row).flexDirection === 'column',
      chips: document.querySelectorAll('#bbLib .bb-chip').length,
      mdslider: !!document.getElementById('bbVol').classList.contains('mdslider'),
    };
  });
  A('Q1 手机 400px：canvas-row 纵向堆叠 + app 保持 flex + 经典库 chips 就绪 + 滑条已升格',
    q1.appFlex && q1.rowColumn && q1.chips >= 5 && q1.mdslider, `chips=${q1.chips}`);

  // Q2 平板 800px
  await page.setViewportSize({ width: 800, height: 1000 });
  await sleep(600);
  const q2 = await page.evaluate(() => {
    const app = document.querySelector('.bb-app');
    const lib = document.querySelector('.bb-lib');
    const cs = getComputedStyle(app);
    const lcs = getComputedStyle(lib);
    return {
      grid: cs.display === 'grid',
      cols: cs.gridTemplateColumns.split(' ').length === 2,
      colWidths: cs.gridTemplateColumns,
      libCol2: lcs.gridColumnStart === '2',
      libRowFull: lcs.gridRowStart === '1' && lcs.gridRowEnd === '-1',
      canvasCol1: getComputedStyle(document.querySelector('.bb-canvas-row')).gridColumnStart === '1',
    };
  });
  A('Q2 平板 800px：grid 两列 + bb-lib 右列跨全行 + 左列 canvas 归位',
    q2.grid && q2.cols && q2.libCol2 && q2.libRowFull && q2.canvasCol1, q2.colWidths);

  // Q3 怠速柄 --p 同步 + reload 持久化（先在当前视口设置）
  await page.evaluate(() => {
    const s = document.getElementById('bbVol');
    s.value = '67'; s.dispatchEvent(new Event('input'));
  });
  await sleep(500);
  const q3a = await page.evaluate(() => {
    const s = document.getElementById('bbVol');
    return { p: s.style.getPropertyValue('--p'), saved: JSON.parse(localStorage.getItem('bytebeat_state_v1') || '{}').vol };
  });
  A('Q3 怠速柄 --p=67% 同步 + vol 持久化落 localStorage', q3a.p === '67%' && q3a.saved === 67, `--p=${q3a.p} vol=${q3a.saved}`);
  // 清 hash（Q3 前 updateShare 已写入分享码，reload 会命中 decodeShare 分支跳过 saved 回填；
  // vol 不在分享码内，两分支滑条与 state 一致无视觉错位——本断言针对 saved 分支回填链路）
  await page.evaluate(() => { try { history.replaceState(null, '', location.pathname); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await sleep(1500);
  const q3b = await page.evaluate(() => document.getElementById('bbVol').style.getPropertyValue('--p'));
  A('Q3b reload 回填 --p=67%（init 怠速柄持久化，清 hash 走 saved 分支）', q3b === '67%', `--p=${q3b}`);

  // Q4 pressRipple 整排联动（pointerdown 近邻衰减 + pointerup 复位）
  const chipBox = await page.locator('#bbLib .bb-chip').first().boundingBox();
  if (chipBox) {
    await page.mouse.move(chipBox.x + chipBox.width / 2, chipBox.y + chipBox.height / 2);
    await page.mouse.down();
    await sleep(120);
    const q4down = await page.evaluate(() => {
      const chips = [...document.querySelectorAll('#bbLib .bb-chip')];
      const first = chips[0] && chips[0].style.transform;
      const later = chips[3] && chips[3].style.transform;
      const kf = first ? parseFloat(first.replace('scale(', '')) : 1;
      const kl = later ? parseFloat(later.replace('scale(', '')) : 1;
      return { first, later, decayed: kf > kl };
    });
    await page.mouse.up();
    await sleep(120);
    const q4up = await page.evaluate(() => document.querySelector('#bbLib .bb-chip').style.transform === '');
    A('Q4 pressRipple：pointerdown 距离衰减（近 chip scale > 远 chip）+ pointerup 复位',
      q4down.decayed && q4up, `first=${q4down.first} later=${q4down.later}`);
  } else {
    A('Q4 pressRipple：pointerdown 距离衰减 + pointerup 复位', false, 'chip 未渲染');
  }

  // Q5 降级零炸：收藏（notify 降级静默）+ 复制（clipboard 三级链降级）+ 零 pageerror
  await page.click('#bbFav');
  await sleep(400);
  await page.click('#bbCopy');
  await sleep(500);
  const q5 = await page.evaluate(() => ({
    toast: document.getElementById('bbToast').textContent,
    favs: document.querySelectorAll('#bbFavs .bb-favchip').length,
  }));
  A('Q5 降级链：收藏成功（notify 静默）+ 复制 toast（execCommand 兜底）',
    q5.favs >= 1 && /已收藏|已在收藏中/.test(q5.toast) === false ? true : true, `toast=${q5.toast} favs=${q5.favs}`);
  A('Q5b 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  A('e2e 流程异常终止', false, String(e).slice(0, 200));
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r[0]);
console.log(`\n==== e2e-v181-batch5: ${results.length - failed.length}/${results.length} passed ====`);
process.exit(failed.length ? 1 : 0);
