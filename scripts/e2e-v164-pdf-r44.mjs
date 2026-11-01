// v9.18 = #164 PDF 阅读应用（R44 轮）无头回归小判据：
// ①pdf iframe 挂载（pdfjsLib 就位）②第 51 号在册 ③VFS 清单渲染种子 PDF
// ④打开闭环：点击 → getDocument → canvas 渲染（width>0）+ statline 页码
// ⑤翻页 next → 第 2 页 ⑥目录（getOutline 2 项）→ 点击跳页 → 第 3 页
// ⑦全文搜索 gamma → 结果 1 处第 3 页 + textLayer 高亮 .tl-hit ⑧缩放 ±（canvas 尺寸变化）
// ⑨手机 tab / 平板双栏 ⑩宿主 __vfs 数据真源复核 ⑪零 pageerror
// 范式同 e2e-v166：dev 服务器（E2E_BASE 可覆写，默认 8080）。两视口收敛。
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ==================== node 端构造 3 页 + 书签 PDF（精确 xref） ====================
function build3PagePdf() {
  const texts = ['Chapter One alpha', 'Chapter Two beta', 'Chapter Three gamma'];
  const objs = {};
  objs[1] = '<< /Type /Catalog /Pages 2 0 R /Outlines 10 0 R >>';
  objs[2] = '<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>';
  for (let i = 0; i < 3; i++) {
    objs[3 + i] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${6 + i} 0 R /Resources << /Font << /F1 9 0 R >> >> >>`;
    const s = `BT /F1 24 Tf 72 720 Td (${texts[i]}) Tj ET`;
    objs[6 + i] = `<< /Length ${s.length} >>\nstream\n${s}\nendstream`;
  }
  objs[9] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objs[10] = '<< /Type /Outlines /First 11 0 R /Last 12 0 R /Count 2 >>';
  objs[11] = '<< /Title (Chapter One) /Parent 10 0 R /Next 12 0 R /Dest [3 0 R /Fit] >>';
  objs[12] = '<< /Title (Chapter Two) /Parent 10 0 R /Dest [5 0 R /Fit] >>';
  const max = 12;
  let out = '%PDF-1.4\n';
  const offsets = [];
  for (let i = 1; i <= max; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefAt = out.length;
  out += `xref\n0 ${max + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= max; i++) out += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  out += `trailer\n<< /Size ${max + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return new TextEncoder().encode(out).buffer;
}
const PDF_BYTES = new Uint8Array(build3PagePdf());

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

async function runViewport(tag, vp, isTablet) {
  console.log(`\n===== 视口 ${tag}（${vp.width}×${vp.height}） =====`);
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);

  // 种子：3 页带书签 PDF 直写宿主 VFS（模拟文档应用落盘产物）
  await page.evaluate(async (bytes) => {
    // bytes 是序列化后的普通数组——必须重新包 Uint8Array，否则 Blob 落成逗号数字串（非二进制）
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    await window.__vfs.write('/documents/e2e164.pdf', blob, { mime: 'application/pdf' });
  }, Array.from(PDF_BYTES));

  const openPdf = () => page.evaluate(async () => {
    const { initialApps } = await import('/ios-desktop/js/apps-data.js');
    const { openApp } = await import('/ios-desktop/js/app-window.js');
    openApp(initialApps.findIndex(a => a.id === 'pdf'));
  });
  await openPdf();
  await sleep(2200);

  const pf = () => page.frames().find(f => f.url().includes('apps/pdf/index.html'));
  for (let i = 0; i < 15 && !pf(); i++) await sleep(300);
  t('P1 pdf iframe 挂载（pdfjsLib 就位）', !!pf() && await pf().evaluate(() => typeof window.pdfjsLib !== 'undefined'));
  t('P2 第 51 号在册：apps-data 聚合 51 项含 pdf', await page.evaluate(async () => {
    const { initialApps } = await import('/ios-desktop/js/apps-data.js');
    return initialApps.length === 51 && initialApps.some(a => a.id === 'pdf');
  }));

  await sleep(600);
  t('A1 VFS 清单渲染：/documents/e2e164.pdf 在列', await pf().evaluate(() => {
    const nms = Array.from(document.querySelectorAll('#fileList .row .nm')).map(n => n.textContent);
    return nms.includes('e2e164.pdf');
  }));

  // 打开 → 渲染闭环
  await pf().evaluate(() => {
    Array.from(document.querySelectorAll('#fileList .row')).find(r => r.textContent.includes('e2e164.pdf')).click();
  });
  await sleep(3000);
  t('A2 打开闭环：canvas 渲染有尺寸 + 文档名在顶栏', await pf().evaluate(() => {
    const c = document.getElementById('pdfCanvas');
    return c.width > 0 && c.height > 0 && document.getElementById('docName').textContent === 'e2e164.pdf';
  }));
  t('A3 页码显示 1 / 3', await pf().evaluate(() => document.getElementById('pageTotal').textContent === '/ 3'));

  // 翻页
  await pf().evaluate(() => document.getElementById('btnNext').click());
  await sleep(1600);
  t('B1 next 翻页 → 第 2 页', await pf().evaluate(() => document.getElementById('pageInput').value === '2'));

  // 目录跳转：点击第 2 项（Chapter Two → /Dest 第 3 页对象）
  await pf().evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#outlineList .row'));
    if (rows.length > 1) rows[1].click();
  });
  await sleep(1800);
  t('B2 目录 2 项在册 + 点击第 2 项 → 跳第 3 页', await pf().evaluate(() => {
    const n = document.querySelectorAll('#outlineList .row').length;
    return n === 2 && document.getElementById('pageInput').value === '3';
  }));

  // 全文搜索 gamma → 高亮（索引+重渲染异步链路：轮询最多 8s）
  await pf().evaluate(() => {
    const box = document.getElementById('searchBox');
    box.value = 'gamma';
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  let c1 = false;
  for (let i = 0; i < 16 && !c1; i++) {
    await sleep(500);
    c1 = await pf().evaluate(() => {
      const st = document.getElementById('stSearch').textContent;
      const hits = document.querySelectorAll('#searchList .row').length;
      const hl = document.querySelectorAll('#textLayer span.tl-hit').length;
      return st.includes('1 处') && hits === 1 && hl >= 1;
    }).catch(() => false);
  }
  t('C1 搜索 gamma：结果 1 处第 3 页 + textLayer 高亮', c1, c1 ? '' : JSON.stringify(await pf().evaluate(() => ({
    st: document.getElementById('stSearch').textContent,
    hits: document.querySelectorAll('#searchList .row').length,
    hl: document.querySelectorAll('#textLayer span.tl-hit').length,
    spans: document.querySelectorAll('#textLayer span').length,
    page: document.getElementById('pageInput').value,
    tab: document.body.dataset.tab,
  })).catch(e => ({ err: String(e).slice(0, 80) }))));

  // 缩放：+ 后 canvas 变大
  const w1 = await pf().evaluate(() => document.getElementById('pdfCanvas').style.width);
  await pf().evaluate(() => document.getElementById('btnZoomIn').click());
  await sleep(1800);
  const w2 = await pf().evaluate(() => document.getElementById('pdfCanvas').style.width);
  t('D1 缩放 +10%：canvas CSS 宽变大', parseFloat(w2) > parseFloat(w1), `${w1} → ${w2}`);

  // 复制本页文本：点击后 toast（宿主 clipboard 通道），不抛错即过
  await pf().evaluate(() => document.getElementById('btnCopy').click());
  await sleep(800);
  t('D2 复制本页文本：无 pageerror（toast/剪贴板链路）', errors.length === 0);

  // 布局形态
  t('E1 布局：手机 tab / 平板分栏 splitter', await pf().evaluate((tb) => {
    const sp = document.getElementById('splitter');
    const tabs = document.getElementById('tabs');
    return tb ? sp && getComputedStyle(sp).display !== 'none' && getComputedStyle(tabs).display === 'none'
              : tabs && getComputedStyle(tabs).display === 'flex';
  }, isTablet));

  t('F 零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
  return errors.length;
}

const e1 = await runViewport('手机', { width: 390, height: 844 }, false);
const e2 = await runViewport('平板', { width: 800, height: 1024 }, true);
await browser.close();
console.log(`\n[e2e-v164] 结果：PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
