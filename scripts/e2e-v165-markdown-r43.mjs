// v9.16 = #165 Markdown 编辑器（R43 轮）无头回归小判据：
// ①markdown iframe 挂载（marked + sanitize 双库就位）②演示文档过闸渲染（h1/table/task）
// ③XSS 注入闸（alert 不执行、script 剥除、javascript: 链接剥除）
// ④工具栏插入（B 粗体包绕选区）⑤保存 → 跨 frame 真实 VFS /documents/ 复核
// ⑥打开抽屉列文档 + 点开回读 ⑦导出 HTML 落 VFS ⑧字号怠速柄滑条联动 --pv-size
// ⑨手机视口 tab 切换 / 平板视口双栏（准入②③）⑩K 零 pageerror
// 范式同 e2e-v180：dev 服务器（E2E_BASE 可覆写，默认 8080）。两跑收敛。
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const SHOT = new URL('../docs/v916/markdown-app.png', import.meta.url).pathname;
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

// ---------- 手机视口（390×844）：主流程 ----------
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

const openMd = () => page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex(a => a.id === 'markdown'));
});
await openMd();
await sleep(2000);

const mframe = () => page.frames().find(f => f.url().includes('apps/markdown/index.html'));
t('P1 markdown iframe 挂载（marked + __mdSanitize 双库就位）', !!mframe() && await mframe().evaluate(() =>
  typeof window.marked !== 'undefined' && typeof window.__mdSanitize === 'function'));
t('P2 第 49 号在册：apps-data 含 markdown，聚合 49 项', await page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  return initialApps.length === 49 && initialApps.some(a => a.id === 'markdown');
}));

// A. 演示文档过闸渲染
const demoHtml = await mframe().evaluate(() => document.getElementById('preview').innerHTML);
t('A1 演示文档渲染：h1 + table + task checkbox', /<h1[^>]*>/.test(demoHtml) && demoHtml.includes('<table>') && demoHtml.includes('type="checkbox"'));
t('A2 XSS 闸：演示里的 <script> 与 javascript: 链接被剥除', !demoHtml.includes('<script') && !demoHtml.toLowerCase().includes('javascript:'));

// B. XSS 主动注入（script 不执行 + DOM 无残留）
await mframe().evaluate(() => {
  const u = window;
  u.__e2eFlag = 0;
  document.getElementById('src').value = '# x\n\n<script>window.__e2eFlag=1</scr' + 'ipt>\n\n[坏链接](javascript:alert(1))\n\n<img src=x onerror="window.__e2eFlag=1">';
  document.getElementById('src').dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(500);
const xssHtml = await mframe().evaluate(() => document.getElementById('preview').innerHTML);
t('B1 注入后 alert 路径零执行（__e2eFlag 恒 0）', await mframe().evaluate(() => window.__e2eFlag === 0));
t('B2 预览 DOM 无 script/无 onerror/无 javascript:', !xssHtml.includes('<script') && !xssHtml.includes('onerror') && !xssHtml.toLowerCase().includes('javascript:'));

// C. 工具栏插入（选中文字 → B 粗体包绕）
await mframe().evaluate(() => {
  const srcEl = document.getElementById('src');
  srcEl.value = 'hello world';
  srcEl.focus();
  srcEl.setSelectionRange(0, 5); // 选中 hello
  document.querySelector('#toolbar .kbtn[data-wrap="**"]').click();
});
t('C1 B 键包绕选区：**hello** world', await mframe().evaluate(() =>
  document.getElementById('src').value.startsWith('**hello**')));

// D. 保存 → 跨 frame 真实 VFS 复核
await mframe().evaluate(() => { document.getElementById('fileName').value = 'e2e165'; });
await mframe().evaluate(() => document.getElementById('btnSave').click());
await sleep(700);
t('D1 保存落 VFS：宿主 __vfs 读回 /documents/e2e165.md 内容一致', await page.evaluate(async () => {
  const text = await window.__vfs.readText('/documents/e2e165.md');
  return typeof text === 'string' && text.startsWith('**hello**');
}));
t('D2 通知桥在册（notify 挂载）', await mframe().evaluate(() =>
  !!(window.__system && typeof window.__system.notify === 'function')));

// E. 打开抽屉列文档 + 点开回读
await mframe().evaluate(() => document.getElementById('btnOpen').click());
await sleep(600);
const docCount = await mframe().evaluate(() => document.querySelectorAll('#docList .doc').length);
t('E1 抽屉列出 /documents/ 下 .md（≥1 含 e2e165）', docCount >= 1 && await mframe().evaluate(() =>
  Array.from(document.querySelectorAll('#docList .doc .nm')).some(n => n.textContent === 'e2e165.md')));
await mframe().evaluate(() => {
  const btn = Array.from(document.querySelectorAll('#docList .doc')).find(b => b.textContent.includes('e2e165.md'));
  btn.click();
});
await sleep(600);
t('E2 点开回读：src 与文件名复位', await mframe().evaluate(() =>
  document.getElementById('src').value.startsWith('**hello**') && document.getElementById('fileName').value === 'e2e165'));

// F. 导出 HTML 落 VFS
await mframe().evaluate(() => document.getElementById('btnExport').click());
await sleep(800);
t('F1 导出 HTML 落 VFS /documents/e2e165.html（宿主读回含 sanitize 后内容）', await page.evaluate(async () => {
  const text = await window.__vfs.readText('/documents/e2e165.html');
  return typeof text === 'string' && text.includes('<strong>hello</strong>') && !text.includes('<script');
}));

// G. 字号怠速柄滑条 → --pv-size 联动
await mframe().evaluate(() => {
  const s = document.getElementById('sizeSlider');
  s.value = '20';
  s.dispatchEvent(new Event('input', { bubbles: true }));
});
t('G1 滑条 20 → 预览 --pv-size 20px + 读数同步', await mframe().evaluate(() =>
  document.documentElement.style.getPropertyValue('--pv-size') === '20px' &&
  document.getElementById('sizeVal').textContent === '20px'));

// H. 手机态 tab 切换
await mframe().evaluate(() => document.getElementById('tabPreview').click());
t('H1 手机态预览 tab：data-tab=preview 且预览窗可见', await mframe().evaluate(() => {
  const pv = document.getElementById('previewPane');
  return document.body.dataset.tab === 'preview' && getComputedStyle(pv).display !== 'none';
}));

// 截图（手机态）
mkdirSync(new URL('../docs/v916/', import.meta.url).pathname, { recursive: true });
await page.screenshot({ path: SHOT });
await ctx.close();

// ---------- 平板视口（1024×768）：双栏分栏 ----------
const ctx2 = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
const page2 = await ctx2.newPage();
page2.on('pageerror', e => errors.push(String(e)));
await page2.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2200);
await page2.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex(a => a.id === 'markdown'));
});
await sleep(1800);
const mframe2 = () => page2.frames().find(f => f.url().includes('apps/markdown/index.html'));
// 等待平板视口下 iframe 真实挂载（openApp → iframe 创建 → 应用页 load）
for (let i = 0; i < 20 && !mframe2(); i++) await sleep(300);
t('I0 平板视口 markdown iframe 挂载', !!mframe2());
t('I1 平板态双栏并排（编辑/预览 pane 同屏可见，非 tab 模式）', await mframe2().evaluate(() => {
  const ep = document.getElementById('editorPane'), pp = document.getElementById('previewPane');
  const s1 = getComputedStyle(ep), s2 = getComputedStyle(pp);
  return s1.display !== 'none' && s2.display !== 'none' &&
    ep.getBoundingClientRect().width > 100 && pp.getBoundingClientRect().width > 100;
}));
t('I2 平板态 tabs 隐藏（分栏取代切换）', await mframe2().evaluate(() =>
  getComputedStyle(document.getElementById('tabs')).display === 'none'));
await page2.screenshot({ path: SHOT.replace('.png', '-tablet.png') });
await ctx2.close();

// K. pageerror
t('K 零 pageerror（两视口累计）', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
console.log(`\n[e2e-v165] 结果：PASS ${pass} / FAIL ${fail}${fail ? '  ←←← 需修复' : ''}`);
process.exit(fail ? 1 : 0);
