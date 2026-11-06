// ==================== e2e-v105-a11y.mjs — #105 无障碍基线一期 e2e ====================
//
// Q1 页 20 双入口转真子页：色彩和动画（页 32）/ 显示大小和文字（页 33）打开
// Q2 移除动画开关：html[data-a11y-reduce-motion] 即现 + store 持久化（32 块 CSS 双通道消费前提）
// Q3 重载恢复：boot applier（a11y-apply.js applyA11yPersisted，v8.02 仅开页应用的缺口修复）
// Q4 颜色反转：html.style.filter = invert(1) hue-rotate(180deg)（单写点合成链）
// Q5 色彩校正页 34：primary switch + deuteranomaly radio → url(#a11y-daltonizer-deuteranomaly) saturate(0.7)
//    + defs 幂等注入（#a11yDaltonizerDefs 在场）
// Q6 强度滑条门控：灰度模式 → disabled + daltonizer_saturation_unavailable_summary 权威文案
// Q7 页 33：字体大小 → html 根字号 + 预览字号；显示大小 → --a11y-display-scale + .app-body zoom computed
// Q8 粗体/高对比度：双属性即现（body * 700 + token 极值覆盖消费）
// Q9 重置：全默认恢复（属性摘除 + filter 清空 + 缩放回 100%）
// Q10 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8993;
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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', (e) => { pageErrors++; console.log('[pageerror]', String(e).slice(0, 200)); });
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await sleep(2500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(1200);
await page.evaluate(() => localStorage.removeItem('settings:accessibility-v1'));
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(2200);

// 打开设置 → 页 20
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1600);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="accessibility"]').click());
await sleep(1400);

// Q1a 页 32：色彩和动画入口
await page.evaluate(() => {
  const p20 = document.getElementById('app-page-settings-20');
  const rows = [...p20.querySelectorAll('.md3-list-item[onclick*="__tpNav(this,32)"]')];
  if (rows[0]) rows[0].click();
});
await sleep(1200);
const p32 = await page.evaluate(() => {
  const el = document.getElementById('app-page-settings-32');
  if (!el) return null;
  const txt = el.textContent;
  return {
    mounted: true,
    title: txt.includes('色彩和动画') && txt.includes('色彩校正 · 颜色反转 · 移除动画'),
    rows: ['色彩校正', '颜色反转', '深色主题', '移除动画'].every((k) => txt.includes(k)),
    inversionSummary: txt.includes('将亮屏幕调暗，将暗屏幕调亮'),
    animSummary: txt.includes('减少屏幕动画'),
  };
});
A('Q1a 页 32 打开 + AOSP 渲染序四行 + 权威摘要', !!p32 && p32.title && p32.rows && p32.inversionSummary && p32.animSummary, JSON.stringify(p32));

// Q2 移除动画开关：属性即现 + 持久化
await page.evaluate(() => {
  const sw = document.getElementById('a11yRemoveAnimToggle');
  sw.click();
});
await sleep(600);
const rmOn = await page.evaluate(() => ({
  attr: document.documentElement.hasAttribute('data-a11y-reduce-motion'),
  stored: (JSON.parse(localStorage.getItem('settings:accessibility-v1') || '{}').removeAnimations) === true,
  event: typeof CustomEvent === 'function',
  // 解析级回归锁：属性通道副本必须被浏览器真实解析（裸 `{}` 包裹会让浏览器整块丢弃——
  // migrate-reduce-motion-v1011.py 残留缺陷，fix-bare-brace-v108.py 解包修复，v10.09）
  cssParsed: [...document.styleSheets].some((ss) => { try { return [...ss.cssRules].some((r) => r.selectorText && r.selectorText.includes('data-a11y-reduce-motion')); } catch (e) { return false; } }),
}));
A('Q2 移除动画开关 → html[data-a11y-reduce-motion] 即现 + store 持久化 + CSS 解析级在位', rmOn.attr && rmOn.stored && rmOn.cssParsed, JSON.stringify(rmOn));

// Q3 重载恢复（boot applier）
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(2200);
const rmAfterReload = await page.evaluate(() => document.documentElement.hasAttribute('data-a11y-reduce-motion'));
A('Q3 重载恢复：boot applier 属性通道重现（v8.02 缺口修复）', rmAfterReload === true, `attr=${rmAfterReload}`);

// 重新进设置到页 32
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1400);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="accessibility"]').click());
await sleep(1200);
await page.evaluate(() => {
  const p20 = document.getElementById('app-page-settings-20');
  const rows = [...p20.querySelectorAll('.md3-list-item[onclick*="__tpNav(this,32)"]')];
  if (rows[0]) rows[0].click();
});
await sleep(1000);

// Q4 颜色反转
await page.evaluate(() => document.getElementById('a11yColorInvertToggle').click());
await sleep(500);
const invFilter = await page.evaluate(() => document.documentElement.style.filter);
A('Q4 颜色反转 → filter invert(1) hue-rotate(180deg)', invFilter.includes('invert(1)') && invFilter.includes('hue-rotate(180deg)'), invFilter);

// Q4b 状态隔离：关闭颜色反转（合成链为乘法设计，遗留 invert 会污染 Q6 的精确相等
// 断言——这是测试场景卫生问题非产品缺陷，Q5/Q6 需干净基线）
await page.evaluate(() => document.getElementById('a11yColorInvertToggle').click());
await sleep(400);
const invOff = await page.evaluate(() => document.documentElement.style.filter.trim() === '');
A('Q4b 反转关闭 → filter 归零（Q5/Q6 干净基线）', invOff, `filter=${JSON.stringify(await page.evaluate(() => document.documentElement.style.filter))}`);

// Q5 色彩校正页 34
await page.evaluate(() => {
  const p32 = document.getElementById('app-page-settings-32');
  const row = [...p32.querySelectorAll('.md3-list-item[onclick*="__tpNav(this,34)"]')][0];
  if (row) row.click();
});
await sleep(1000);
const p34a = await page.evaluate(() => {
  const el = document.getElementById('app-page-settings-34');
  if (!el) return null;
  document.getElementById('a11yDaltonizerToggle').click();
  return {
    mounted: true,
    primary: el.textContent.includes('使用色彩校正'),
    modes: ['红绿色盲、绿色弱', '红绿色盲、红色弱', '蓝黄色盲', '灰度模式'].every((k) => el.textContent.includes(k)),
  };
});
await sleep(500);
const p34filter = await page.evaluate(() => ({
  filter: document.documentElement.style.filter,
  defs: !!document.getElementById('a11yDaltonizerDefs'),
  satVal: document.getElementById('a11yDaltonizerSatVal')?.textContent,
}));
const f5 = p34filter.filter.replace(/"/g, ''); // CSSOM 序列化 url() 带引号（url("#…")），归一后断言
A('Q5 色彩校正：primary + 四模式 + filter url(#…deuteranomaly) saturate(0.7) + defs 注入',
  !!p34a && p34a.primary && p34a.modes && f5.includes('url(#a11y-daltonizer-deuteranomaly)') && f5.includes('saturate(0.7)') && p34filter.defs,
  JSON.stringify({ f: p34filter.filter, defs: p34filter.defs, sat: p34filter.satVal }));

// Q6 强度滑条门控：灰度模式 → disabled + 权威不可用文案
await page.evaluate(() => {
  const radio = document.querySelector('input[name="a11yDaltonizerMode"][value="0"]');
  radio.click();
});
await sleep(500);
const p34gray = await page.evaluate(() => ({
  filter: document.documentElement.style.filter,
  disabled: document.getElementById('a11yDaltonizerSat').disabled,
  sub: document.getElementById('a11yDaltonizerSatSub').textContent,
}));
A('Q6 灰度模式 → grayscale(1) + 强度滑条 disabled + 不可用权威文案',
  p34gray.filter.trim() === 'grayscale(1)' && p34gray.disabled && p34gray.sub.includes('不可用'),
  JSON.stringify(p34gray));

// 回页 33（经页 20）：显示大小和文字
await page.evaluate(() => {
  const p34 = document.getElementById('app-page-settings-34');
  // 34 为三级页：经返回链回 20 后再入 33——直接用 __tpNav 从 20 侧栏跳转
});
await page.evaluate(() => { window.__tpNav && window.__tpNav(document.body, 20); });
await sleep(900);
await page.evaluate(() => {
  const p20 = document.getElementById('app-page-settings-20');
  const rows = [...p20.querySelectorAll('.md3-list-item[onclick*="__tpNav(this,33)"]')];
  if (rows[0]) rows[0].click();
});
await sleep(1000);
const p33 = await page.evaluate(() => {
  const el = document.getElementById('app-page-settings-33');
  if (!el) return null;
  return {
    mounted: true,
    title: el.textContent.includes('显示大小和文字'),
    rows: ['字体大小', '显示大小', '粗体文字', '高对比度文字'].every((k) => el.textContent.includes(k)),
    summaries: el.textContent.includes('放大或缩小文字') && el.textContent.includes('放大或缩小所有内容'),
  };
});
A('Q7a 页 33 打开 + 四真实能力行 + 权威摘要', !!p33 && p33.title && p33.rows && p33.summaries, JSON.stringify(p33));

// Q7b 字体大小 120% → html 根字号 19.2px + 预览字号 18px
await page.evaluate(() => {
  const fs = document.getElementById('a11yFontScale');
  fs.value = '120';
  fs.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(400);
const fontApplied = await page.evaluate(() => ({
  htmlFs: document.documentElement.style.fontSize,
  previewFs: document.getElementById('a11yTextPreviewInner').style.fontSize,
}));
A('Q7b 字体大小 120% → html 19.2px + 预览 18px', fontApplied.htmlFs === '19.2px' && fontApplied.previewFs === '18px', JSON.stringify(fontApplied));

// Q7c 显示大小 110% → --a11y-display-scale + .app-body zoom computed
await page.evaluate(() => {
  const ds = document.getElementById('a11yDisplayScale');
  ds.value = '110';
  ds.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(400);
const dispApplied = await page.evaluate(() => {
  const appBody = document.querySelector('.app-body');
  return {
    varSet: document.documentElement.style.getPropertyValue('--a11y-display-scale'),
    zoomComputed: appBody ? getComputedStyle(appBody).zoom : null,
  };
});
A('Q7c 显示大小 110% → 变量 1.1 + .app-body zoom 1.1', dispApplied.varSet === '1.1' && String(dispApplied.zoomComputed) === '1.1', JSON.stringify(dispApplied));

// Q8 粗体 + 高对比度
await page.evaluate(() => document.getElementById('a11yBoldTextToggle').click());
await sleep(300);
await page.evaluate(() => document.getElementById('a11yHighContrastToggle').click());
await sleep(400);
const bc = await page.evaluate(() => ({
  bold: document.documentElement.hasAttribute('data-a11y-bold-text'),
  hc: document.documentElement.hasAttribute('data-a11y-high-contrast'),
  onSurface: getComputedStyle(document.body).getPropertyValue('--md-on-surface').trim(),
}));
A('Q8 粗体/高对比度 → 双属性 + token 极值覆盖', bc.bold && bc.hc && (bc.onSurface === '#000000' || bc.onSurface === '#ffffff'), JSON.stringify(bc));

// Q9 重置 → 全默认
await page.evaluate(() => document.getElementById('a11yTextReadingReset').click());
await sleep(400);
const reset = await page.evaluate(() => ({
  htmlFs: document.documentElement.style.fontSize || '(removed)',
  varSet: document.documentElement.style.getPropertyValue('--a11y-display-scale') || '(removed)',
  bold: document.documentElement.hasAttribute('data-a11y-bold-text'),
  hc: document.documentElement.hasAttribute('data-a11y-high-contrast'),
  stored: JSON.parse(localStorage.getItem('settings:accessibility-v1') || '{}'),
}));
A('Q9 重置 → 字号/显示回默认 + 双属性摘除',
  reset.htmlFs === '(removed)' && reset.varSet === '(removed)' && !reset.bold && !reset.hc && reset.stored.fontScale === 100 && reset.stored.displayScale === 100,
  JSON.stringify(reset));

// Q10 零 pageerror
A('Q10 全程零 pageerror', pageErrors === 0, `errors=${pageErrors}`);

await browser.close();
server.kill();
const fail = results.filter(([c]) => !c).length;
console.log(`\n=== e2e-v105: ${results.length - fail}/${results.length} ${fail ? 'FAIL' : 'ALL PASS'} ===`);
process.exit(fail ? 1 : 0);
