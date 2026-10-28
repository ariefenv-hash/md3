// ==================== e2e-sweep-c2-ui-detail.mjs — #77 Standing Sweep 第 5 轮 C 类（UI 细节） ====================
// 检查项①：描边+内层绝对定位填充圆角重合全库审计（#78 补偿模式覆盖面，运行时计算样式枚举）
// 检查项②：层级圆角嵌套审计（卡片内磁贴/通知内按钮/弹窗内列表 —— 子角半径 vs 外角-内缩距离）
// 检查项③a：context-menu U+ 编排中间帧采样（v8.64 新代码：单调性/阶梯/落位/打断连续性/零跳变）
// 检查项③b：音量滑杆 --v 中途值几何（fill 94px / thumb 102px / icon 46px 公式 + covered 切换）
// 检查项④：设置子页行几何一致性抽查（display/battery/network 三页行高/图板尺寸方差）
// 环境：Playwright + Chromium headless，420×900，http.server 真实页面
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const ROOT = '/home/z/my-project/md3-repo';
const PORT = 8095;
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const OUT = `${ROOT}/docs/sweep`;
mkdirSync(OUT, { recursive: true });

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', ROOT, '--bind', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' | ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' | ' + extra : ''}`); }
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

await page.goto(`http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await sleep(2300);

// ============ 检查项①②：全库几何审计（枚举 + 候选清单 + 截图留证） ============
console.log('== 检查项① 描边+内层绝对定位填充 ==');
const audit = await page.evaluate(() => {
  const r2 = v => Math.round(v * 100) / 100;
  const bordered = [], nested = [];
  const els = document.querySelectorAll('body *');
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) continue;
    const bw = Math.max(parseFloat(cs.borderTopWidth), parseFloat(cs.borderRightWidth), parseFloat(cs.borderBottomWidth), parseFloat(cs.borderLeftWidth));
    const bR = parseFloat(cs.borderTopLeftRadius) || 0;
    // ① 描边容器 + 绝对定位近满铺子元素：子角半径是否补偿 border（need = 外角 - border）
    if (bw > 0 && bR > 0) {
      for (const c of el.children) {
        const ccs = getComputedStyle(c);
        if (ccs.position !== 'absolute') continue;
        const cr = c.getBoundingClientRect();
        if (cr.width < 4 || cr.height < 4) continue;
        const padW = r.width - bw * 2, padH = r.height - bw * 2;
        if (cr.width * cr.height > padW * padH * 0.8 && cr.width >= padW * 0.9 && cr.height >= padH * 0.9) {
          const cR = parseFloat(ccs.borderTopLeftRadius) || 0;
          const need = bR - bw;
          bordered.push({ sel: `${el.tagName.toLowerCase()}#${el.id || ''}.${String(el.className).split(' ')[0] || ''}`, bw, bR, child: `${c.tagName.toLowerCase()}.${String(c.className).split(' ')[0] || ''}`, cR, need: r2(need), gap: r2(need - cR) });
        }
      }
    }
    // ② 圆角父(≥8px) + 不透明背景后代逼近内容角：need = 外角 - 内缩
    if (bR >= 8) {
      let cnt = 0;
      for (const d of el.querySelectorAll('*')) {
        if (cnt >= 4) break;
        const dcs = getComputedStyle(d);
        if (dcs.display === 'none' || dcs.visibility === 'hidden') continue;
        const m = dcs.backgroundColor && dcs.backgroundColor.match(/rgba?\([\d.]+, [\d.]+, [\d.]+(?:, ([\d.]+))?\)/);
        if (!m || (m[1] !== undefined && parseFloat(m[1]) < 0.85)) continue;
        const dr = d.getBoundingClientRect();
        if (dr.width < 6 || dr.height < 6) continue;
        const iT = dr.top - (r.top + bw), iL = dr.left - (r.left + bw);
        if (iT >= -0.5 && iL >= -0.5 && iT <= 8 && iL <= 8) {
          const need = bR - Math.max(iT, iL);
          const dR = parseFloat(dcs.borderTopLeftRadius) || 0;
          if (dR < need - 2) {
            nested.push({ p: `${el.tagName.toLowerCase()}#${el.id || ''}.${String(el.className).split(' ')[0] || ''}`, bR, d: `${d.tagName.toLowerCase()}.${String(d.className).split(' ')[0] || ''}`, dR, need: r2(need), iT: r2(iT), iL: r2(iL) });
            cnt++;
          }
        }
      }
    }
  }
  return { bordered, nested };
});
console.log(`① 描边+满铺填充候选：${audit.bordered.length} 条`);
for (const b of audit.bordered.slice(0, 12)) console.log('   ', JSON.stringify(b));
console.log(`② 圆角嵌套候选：${audit.nested.length} 条`);
for (const n of audit.nested.slice(0, 12)) console.log('   ', JSON.stringify(n));
ok(true, `①② 枚举完成（候选 ${audit.bordered.length}/${audit.nested.length}，人工判读见下）`);

// ============ 检查项③a：context-menu U+ 中间帧 ============
console.log('== 检查项③a context-menu U+ 中间帧 ==');
await page.evaluate(async () => {
  const m = await import('/ios-desktop/js/context-menu.js');
  m.showContextMenu({ id: 'calculator', name: '计算器' }, document.createElement('div'), 210, 420);
});
await sleep(30);
const openFrames = await page.evaluate(() => new Promise(res => {
  const menu = document.querySelector('.app-context-menu');
  const items = [...menu.querySelectorAll('.menu-item')];
  const out = []; const t0 = performance.now();
  function tick() {
    const cs = getComputedStyle(menu);
    out.push({ t: Math.round(performance.now() - t0), o: parseFloat(cs.opacity), sc: cs.transform.includes('matrix') ? parseFloat(cs.transform.slice(7)) : null, i0: parseFloat(getComputedStyle(items[0]).opacity), i2: items[2] ? parseFloat(getComputedStyle(items[2]).opacity) : 1 });
    if (out.length < 40) requestAnimationFrame(tick); else res(out);
  }
  requestAnimationFrame(tick);
}));
// 单调性（开）：容器 fade 单调不减（LINEAR 83ms）
let openMono = true, maxDrop = 0;
for (let i = 1; i < openFrames.length; i++) { const d = openFrames[i].o - openFrames[i - 1].o; if (d < maxDrop) maxDrop = d; if (openFrames[i - 1].o < 0.999 && d < -0.02) openMono = false; }
ok(openMono, 'A1 开场容器 fade 单调不减（无闪落）', `maxDrop=${maxDrop.toFixed(3)}`);
const endO = openFrames[openFrames.length - 1].o, endSc = openFrames[openFrames.length - 1].sc;
ok(Math.abs(endO - 1) < 0.02, 'A2 开场落位 opacity=1', `end=${endO}`);
ok(endSc !== null && Math.abs(endSc - 1) < 0.03, 'A3 开场落位 scale≈1（Overshoot 收敛）', `end=${endSc}`);
const firstRise = openFrames.find(f => f.i0 > 0.02);
const contOAtRise = firstRise ? openFrames.find(f => f.t >= firstRise.t - 40)?.o ?? 0 : 0;
ok(!!firstRise, 'A4 子项阶梯确有延迟启动', `i0 首次>0 于 ${firstRise ? firstRise.t + 'ms' : 'never'}, 当时容器 o=${contOAtRise.toFixed(2)}`);
// 打断：关场中途重开 → 逐帧差有界
await page.evaluate(() => import('/ios-desktop/js/context-menu.js').then(m => m.closeContextMenu()));
await sleep(60); // 关场约 1/4 处
await page.evaluate(() => import('/ios-desktop/js/context-menu.js').then(m => { const a = document.querySelector('.app-icon[data-id="calculator"]'); m.showContextMenu({ id: 'calculator', name: '计算器' }, a || document.createElement('div'), 210, 420); }));
const reopenFrames = await page.evaluate(() => new Promise(res => {
  const menu = document.querySelector('.app-context-menu');
  const out = []; const t0 = performance.now();
  function tick() {
    out.push({ t: Math.round(performance.now() - t0), o: parseFloat(getComputedStyle(menu).opacity) });
    if (out.length < 36) requestAnimationFrame(tick); else res(out);
  }
  requestAnimationFrame(tick);
}));
let maxJump = 0;
for (let i = 1; i < reopenFrames.length; i++) maxJump = Math.max(maxJump, Math.abs(reopenFrames[i].o - reopenFrames[i - 1].o));
ok(maxJump < 0.25, 'A5 关场中途重开逐帧跳变有界（打断协议）', `maxJump=${maxJump.toFixed(3)}`);
await page.screenshot({ path: `${OUT}/c2-context-menu-open.png` });
const reEnd = reopenFrames[reopenFrames.length - 1].o;
ok(reEnd > 0.9, 'A6 重开后收敛回 1', `end=${reEnd}`);
// 关场采样（干净关闭；display 守卫：基类无 opacity:0，收场后 display:none 态读 opacity 会回落默认值 1 —— 仅在 .active 在场时采样）
await sleep(520);
await page.evaluate(() => import('/ios-desktop/js/context-menu.js').then(m => m.closeContextMenu()));
await sleep(20);
const closeFrames = await page.evaluate(() => new Promise(res => {
  const menu = document.querySelector('.app-context-menu');
  if (!menu) return res([]);
  const out = []; const t0 = performance.now();
  function tick() {
    if (!menu.isConnected || !menu.classList.contains('active')) return res(out);
    out.push({ t: Math.round(performance.now() - t0), o: parseFloat(getComputedStyle(menu).opacity) });
    if (out.length < 36) requestAnimationFrame(tick); else res(out);
  }
  requestAnimationFrame(tick);
}));
let closeMono = true;
for (let i = 1; i < closeFrames.length; i++) if (closeFrames[i].o > closeFrames[i - 1].o + 0.02) closeMono = false;
ok(closeFrames.length >= 6 && closeMono, 'A7 干净关场 fade 单调不减色（无回弹，display 守卫内采样）', `frames=${closeFrames.length} 尾帧=${closeFrames.length ? closeFrames[closeFrames.length - 1].o : '-'} t=${closeFrames.length ? closeFrames[closeFrames.length - 1].t : '-'}ms`);

// ============ 检查项③b：音量滑杆 --v 中途值几何 ============
console.log('== 检查项③b 音量滑杆中途值 ==');
const vd = await page.evaluate(() => {
  const s = document.getElementById('vdSlider');
  if (!s) return null;
  s.style.setProperty('--v', '40');
  const cs = getComputedStyle(s);
  const fill = s.querySelector('.vd-fill'), thumb = s.querySelector('.vd-thumb'), icon = s.querySelector('.vd-icon');
  const fcs = getComputedStyle(fill), tcs = getComputedStyle(thumb);
  return {
    h: s.getBoundingClientRect().height,
    fillH: parseFloat(fcs.height), fillBR: fcs.borderRadius, trackBR: getComputedStyle(s, '::before').borderRadius,
    thumbB: tcs.bottom, iconB: getComputedStyle(icon).bottom,
    fillW: parseFloat(fcs.width), trackW: 40,
  };
});
if (vd) {
  ok(Math.abs(vd.fillH - 94) < 0.6, 'B1 v=40 fill 高=250·t−6=94', `got=${vd.fillH}`);
  ok(Math.abs(parseFloat(vd.thumbB) - 102) < 0.6, 'B2 v=40 thumb bottom=2+250·t=102', `got=${vd.thumbB}`);
  ok(Math.abs(parseFloat(vd.iconB) - 46) < 0.6, 'B3 v=40 icon bottom=250·t−54=46', `got=${vd.iconB}`);
  ok(vd.fillBR.startsWith('2px 2px 12px 12px') && vd.trackBR === '12px', 'B4 fill 底角 12=track 角 12（圆角重合）', `${vd.fillBR} / ${vd.trackBR}`);
  ok(Math.abs(vd.h - 254) < 0.8, 'B5 轨道 254px 原值', `got=${vd.h}`);
} else ok(false, 'B0 #vdSlider 存在', 'not found');
await page.screenshot({ path: `${OUT}/c2-volume-slider-v40.png` });

// ============ 检查项⑤：菜单项级联泄漏修复回归（R5-C 实锤缺陷 → v8.65 修复） ============
// 缺陷：app-window.css 同名 .menu-item 的 background: var(--md-surface-container) 经级联
// 染到长按菜单项（light 主题 = 白药丸 × 深色玻璃容器，半主题化混搭）。
// 修复：pixel-features.css 以 .app-context-menu 前缀提高特异性恢复透明项 + 锁定浅色文字。
console.log('== 检查项⑤ 菜单项级联泄漏修复回归 ==');
await page.evaluate(() => import('/ios-desktop/js/context-menu.js').then(m => m.closeContextMenu()));
await sleep(450);
const leak = await page.evaluate(async () => {
  const m = await import('/ios-desktop/js/context-menu.js');
  m.showContextMenu({ id: 'calculator', name: '计算器' }, document.createElement('div'), 210, 420);
  await new Promise(r => setTimeout(r, 420));
  const item = document.querySelector('#appContextMenu .menu-item');
  const txt = item.querySelector('.menu-item-text');
  const wasLight = document.body.classList.contains('light-theme');
  const light = { bg: getComputedStyle(item).backgroundColor, color: getComputedStyle(txt).color };
  document.body.classList.remove('light-theme');
  const dark = { bg: getComputedStyle(item).backgroundColor, color: getComputedStyle(txt).color };
  if (wasLight) document.body.classList.add('light-theme');
  return { wasLight, light, dark };
});
await page.screenshot({ path: `${OUT}/c2-menu-fixed.png` });
await page.evaluate(() => import('/ios-desktop/js/context-menu.js').then(m => m.closeContextMenu()));
ok(leak.light.bg === 'rgba(0, 0, 0, 0)', 'D1 light 主题菜单项背景透明（级联泄漏已修）', `bg=${leak.light.bg}`);
ok(leak.dark.bg === 'rgba(0, 0, 0, 0)', 'D2 dark 主题菜单项背景透明', `bg=${leak.dark.bg}`);
ok(leak.light.color === 'rgb(226, 232, 240)', 'D3 light 主题文字锁定浅色（theme-mode 深字覆盖被压制）', `color=${leak.light.color}`);
ok(leak.wasLight === true, 'D4 主体场景确为 light-theme（回归前提成立）', `wasLight=${leak.wasLight}`);

// ============ 检查项④：设置子页行几何一致性 ============
// 注：模块直调 openApp(index) 需 initialApps 索引（字符串 id 不挂载内容）——一律走真实图标点击链路
console.log('== 检查项④ 设置子页行几何 ==');
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="settings"]');
  icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});
await sleep(2200);
const pageRows = {};
for (const pg of [['display', 1], ['battery', 2], ['network', 17]]) {
  const [name, idx] = pg;
  const rows = await page.evaluate(async (idx) => {
    if (!window.pushSubPage) return { err: 'no pushSubPage' };
    window.pushSubPage(idx);
    await new Promise(r => setTimeout(r, 800));
    const active = document.getElementById(`app-page-settings-${idx}`);
    if (!active) return { err: `page settings-${idx} not found` };
    const list = [...active.querySelectorAll('.md3-list-item')].map(n => {
      const h = Math.round(n.getBoundingClientRect().height);
      return { h, sw: !!n.querySelector('.m3-switch, input[type=checkbox]'), sl: !!n.querySelector('[class*="slider"], [role="slider"]') };
    }).filter(r => r.h > 24);
    window.popSubPage();
    await new Promise(r => setTimeout(r, 500));
    return { pageId: active.id, rows: list };
  }, idx);
  pageRows[name] = rows;
  if (name === 'display') await page.screenshot({ path: `${OUT}/c2-settings-display-rows.png` });
  await sleep(250);
}
for (const [pg, r] of Object.entries(pageRows)) {
  if (r.err) { ok(false, `C1 ${pg} 子页导航`, r.err); continue; }
  // 行型归因：标准行带 [56,76]（AOSP 64-72dp 等效带）；同结构组内离散 ≤8px；滑杆/卡片行单列归因
  const std = r.rows.filter(x => !x.sl && x.h >= 56 && x.h <= 76);
  const outliers = r.rows.filter(x => x.sl || x.h > 76).map(x => `${x.h}${x.sl ? '(滑杆)' : '(卡)'}`);
  const unders = r.rows.filter(x => x.h < 56);
  let maxSpread = 0, worst = '';
  for (const key of ['0', '1']) {
    const grp = std.filter(x => String(x.sw ? 1 : 0) === key);
    if (grp.length >= 2) {
      const sp = Math.max(...grp.map(g => g.h)) - Math.min(...grp.map(g => g.h));
      if (sp > maxSpread) { maxSpread = sp; worst = `sw=${key}:${grp.map(g => g.h).join(',')}`; }
    }
  }
  ok(r.vis !== false && r.rows.length >= 3 && unders.length === 0 && maxSpread <= 8, `C1 ${pg} 行型归因一致（标准带 56-76，同构组离散≤8）`, `rows=${r.rows.length} std=${std.length} spread=${maxSpread}${worst ? '[' + worst + ']' : ''} 归因外档=${JSON.stringify(outliers)} 破带下限=${unders.length} @${r.pageId}`);
}
// 主页行高锚（v7.98：AOSP homepage_preference 72dp 行高排版 —— 一致性抽查）
const homeHs = await page.evaluate(() => [...document.querySelectorAll('#appWindow .tp-row')].map(n => Math.round(n.getBoundingClientRect().height)));
const homeUniq = [...new Set(homeHs)];
ok(homeHs.length >= 10 && homeUniq.length <= 2, 'C2 主页行高一致', `n=${homeHs.length} uniq=${JSON.stringify(homeUniq)}`);

// ============ 截图留证 + 汇总 ============
await page.screenshot({ path: `${OUT}/c2-desktop-audit.png` });
console.log(`== 汇总：PASS ${pass} / FAIL ${fail} ==`);
console.log(`pageerrors: ${errors.length}${errors.length ? ' → ' + errors.slice(0, 3).join(' || ') : ''}`);
ok(errors.length === 0, 'K1 零 pageerror');

await browser.close().catch(() => {});
srv.kill();
process.exit(fail > 0 ? 1 : 0);
