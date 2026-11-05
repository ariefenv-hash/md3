// ==================== v164 测试 — PDF 阅读应用（v9.18 #164 R44） ====================
//
// #164「已付费未使用」系列第 1 项：pdf.min.js（312KB）+ pdf.worker.min.js（1061KB）合计 1.37MB
// 已 vendor 却只被 books 内部使用，无独立 PDF 应用。新建 apps/pdf/（第 51 号）：
// VFS 打开 .pdf、翻页、缩放、目录跳转（getOutline）、文本选择（renderTextLayer）、全文搜索。
// SW 预缓存（#164 ⚠️）：复用 _shared/vendor 同一 URL，按 URL 一次性缓存，多应用复用不重复。
// 范围纪律：批注涂鸦不做（#164 明文单列——另一套坐标体系）。
//
// 环境跟随全局 happy-dom；pdf.js 真跑：主库 UMD 加载 + worker UMD 注入 globalThis.pdfjsWorker
// （3.11 fake worker loader 首查 _mainThreadWorkerMessageHandler，零网络零 Worker 构造器），
// 手工构造最小单页 PDF（精确 xref 偏移）走 getDocument → getPage → getTextContent 闭环。
//
// 断言面：
//  A. 注册链四处在册（包装器 / apps-data / terminal APPS / app-icons）+ 第 51 号
//  B. vendor 复用纪律（pdf.js 不重复 vendor；workerSrc 指向 _shared/vendor 同源）
//  C. PDF 闭环真跑（pdf.js 3.11.174 同版本语义）：文档解析 / 文本提取 / 视口 / 大纲
//  D. 准入六条静态门禁（#179）：令牌零裸色 / @media / 平板双栏 / SDK 三接 / 按压联动 / 怠速柄+波浪留痕
//  E. 能力面：renderTextLayer 文本层 / 全文搜索防御 / 复制本页文本 / 键盘翻页 / 大纲扁平化
//  F. 版本真源 9.26.0

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const APP_SRC = read('ios-desktop/apps/pdf/index.html');
const WRAP_SRC = read('ios-desktop/js/apps/pdf.js');
const APPS_DATA = read('ios-desktop/js/apps-data.js');
const TERMINAL = read('ios-desktop/js/terminal-core.js');
const ICONS = read('ios-desktop/js/app-icons.js');
const README = read('README.md');
const PKG = JSON.parse(read('package.json'));

// ==================== C 面：pdf.js 真跑环境（vendor UMD + worker 注入） ====================
const MAIN_SRC = read('ios-desktop/apps/_shared/vendor/pdf.min.js');
const WORKER_SRC = read('ios-desktop/apps/_shared/vendor/pdf.worker.min.js');
const _main = { exports: {} };
new Function('module', 'exports', MAIN_SRC)(_main, _main.exports);
const pdfjs = _main.exports;
// worker UMD 注入主线程（3.11 fake worker loader 首查 _mainThreadWorkerMessageHandler）
if (!globalThis.pdfjsWorker) {
  const _w = { exports: {} };
  new Function('module', 'exports', WORKER_SRC)(_w, _w.exports);
  globalThis.pdfjsWorker = _w.exports;
}

// 手工构造最小单页 PDF（精确 xref 偏移，不依赖 recovery 模式）
function buildMinimalPdf(text) {
  const objs = [];
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  objs.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  const stream = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`;
  objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { out += String(o).padStart(10, '0') + ' 00000 n \n'; });
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return new TextEncoder().encode(out).buffer;
}

describe('v9.18 #164：PDF 闭环真跑（pdf.js 3.11.174 同版本语义）', () => {
  it('C1 UMD 加载 + fake worker 注入：version 3.11.174 / WorkerMessageHandler 在册', () => {
    expect(pdfjs.version).toBe('3.11.174');
    expect(typeof pdfjs.getDocument).toBe('function');
    expect(typeof pdfjs.renderTextLayer).toBe('function'); // 文本层 API 在册（#164 能力 4）
    expect(typeof globalThis.pdfjsWorker.WorkerMessageHandler).toBe('function');
  });

  it('C2 getDocument 闭环：最小 PDF 解析 → numPages=1 → 文本提取 → 视口 612×792', async () => {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buildMinimalPdf('Hello PDF v164')) }).promise;
    expect(doc.numPages).toBe(1);
    const page = await doc.getPage(1);
    const tc = await page.getTextContent();
    const text = tc.items.map((i) => i.str).join('');
    expect(text).toContain('Hello PDF v164'); // 搜索/复制能力的数据源语义成立
    const vp = page.getViewport({ scale: 1 });
    expect(vp.width).toBe(612);
    expect(vp.height).toBe(792);
    const vp2 = page.getViewport({ scale: 2 });
    expect(vp2.width).toBe(1224); // 缩放视口线性响应（#164 能力 2）
  });

  it('C3 getOutline 语义：无书签文档返回 null（应用层渲染「本文档无目录大纲」）', async () => {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buildMinimalPdf('no outline')) }).promise;
    const outline = await doc.getOutline();
    expect(outline).toBe(null);
    expect(APP_SRC).toContain('本文档无目录大纲');
  });
});

describe('v9.18 #164：pdf 注册链与准入六条', () => {
  it('A1 包装器在册：id=pdf / iframeAppContent 指向 apps/pdf/index.html', () => {
    expect(WRAP_SRC).toContain("id: 'pdf'");
    expect(WRAP_SRC).toContain("iframeAppContent('apps/pdf/index.html')");
  });

  it('A2 apps-data：import + 数组成员（第 51 号，注释留痕）', () => {
    expect(APPS_DATA).toContain("import pdf from './apps/pdf.js'");
    expect(APPS_DATA).toContain('typing, markdown, archive, pdf,');
    expect(APPS_DATA).toContain('v9.18 #164：pdf 第 51 号');
  });

  it('A3 terminal-core APPS 行 + 别名（pdf/阅读/文档/reader）', () => {
    expect(TERMINAL).toContain("['pdf', 'PDF 阅读', 'pdf', 'pdf', '阅读', '文档', 'reader']");
  });

  it('A4 app-icons 图标块在册（fixture 278 锚由 app-icons.test.js 守）', () => {
    expect(ICONS).toContain('pdf: `<svg viewBox="0 0 100 100"');
  });

  it('A5 README 计数滚动：52 应用 / 41 iframe / v9.19', () => {
    expect(README).toContain('52 个内置应用');
    expect(README).toContain('41 个 iframe 子应用');
    expect(README).toContain('**当前版本 v10.00**');
  });

  it('B1 vendor 复用：引用 _shared/vendor/pdf.min.js，未重复 vendor', () => {
    expect(APP_SRC).toContain('src="../_shared/vendor/pdf.min.js"');
    expect(existsSync(join(ROOT, 'ios-desktop/apps/pdf/pdf.min.js'))).toBe(false);
    expect(existsSync(join(ROOT, 'ios-desktop/apps/pdf/pdf.worker.min.js'))).toBe(false);
    expect(existsSync(join(ROOT, 'ios-desktop/apps/_shared/vendor/pdf.min.js'))).toBe(true);
  });

  it('B2 SW 预缓存不重复（#164 ⚠️）：workerSrc 指向 _shared/vendor 同源 URL', () => {
    expect(APP_SRC).toContain("workerSrc = '../_shared/vendor/pdf.worker.min.js'");
    expect(APP_SRC).toContain('按 URL 缓存一次'); // 应用内留痕说明
  });

  it('D1 准入① MD3 色彩：UI 区 hex 全部为 var(--md-*, fallback) 形态', () => {
    const uiPart = APP_SRC.slice(0, APP_SRC.indexOf('<script>\n(function ()'));
    const allHex = (uiPart.match(/[:(,]\s*#[0-9a-fA-F]{3,8}\b/g) || []).length;
    const fallbackHex = (uiPart.match(/var\(--md-[\w-]+,\s*#[0-9a-fA-F]{3,8}\)/g) || []).length;
    expect(allHex).toBeGreaterThan(0);
    expect(allHex).toBe(fallbackHex); // 零裸色
  });

  it('D2 准入② 响应式：760px 两断点（手机 tab / 平板分栏）', () => {
    expect(APP_SRC).toContain('@media (max-width: 759.98px)');
    expect(APP_SRC).toContain('@media (min-width: 760px)');
  });

  it('D3 准入③ 平板分栏：左文件/目录/搜索 | 右阅读区真分栏 + 拖宽', () => {
    expect(APP_SRC).toContain('id="splitter"');
    expect(APP_SRC).toContain('cursor: col-resize');
  });

  it('D4 准入④ __system SDK 三接：fs(list/read) + notify + clipboard + ok===false 系防御', () => {
    expect(APP_SRC).toContain('__system.fs.list');
    expect(APP_SRC).toContain('__system.fs.read');
    expect(APP_SRC).toContain('__system.notify');
    expect(APP_SRC).toContain('__system.clipboard');
    expect(APP_SRC).toContain('VFS 桥不可用'); // 无宿主显式拒判（fsOK 双闸）
  });

  it('D5 准入⑤-3 顶栏操作键整排按压联动（距离衰减 scale/圆角/让位）', () => {
    expect(APP_SRC).toContain('pressRipple');
    expect(APP_SRC).toContain('1 - d * 0.45');
    expect(APP_SRC).toContain("k.style.borderRadius = (12 + (d === 0 ? 5 : 3) * f) + 'px'");
  });

  it('D6 准入⑤-1/2 滑条怠速柄在册 + 播放条波浪不适用留痕（无播放链路）', () => {
    expect(APP_SRC).toContain('怠速');       // 页码滑条怠速柄形态（⑤-1）
    expect(APP_SRC).toContain('波浪');       // ⑤-2 不适用留痕
    expect(APP_SRC).toContain('id="pageSlider"');
  });

  it('E1 能力面：renderTextLayer 文本层 + 全文搜索（500 页防御）+ 复制本页文本', () => {
    expect(APP_SRC).toContain('renderTextLayer({');
    expect(APP_SRC).toContain('PDF_MAX_PAGES = 500'); // 全文缓存防御（#166 炸弹防御同精神）
    expect(APP_SRC).toContain('复制本页文本');
    expect(APP_SRC).toContain('__system.clipboard.write');
  });

  it('E2 能力面：大纲扁平化跳页（getOutline/getDestination/getPageIndex）+ 键盘翻页', () => {
    expect(APP_SRC).toContain('getOutline');
    expect(APP_SRC).toContain('getDestination');
    expect(APP_SRC).toContain('getPageIndex');
    expect(APP_SRC).toContain("e.key === 'ArrowLeft'");
    expect(APP_SRC).toContain("e.key === 'ArrowRight'");
  });

  it('E3 范围纪律：批注涂鸦不做（#164 明文单列）', () => {
    expect(WRAP_SRC).toContain('批注（涂鸦引擎）不做');
  });

  it('F 版本真源 9.26.0（v150 同口径）', () => {
    expect(PKG.version).toBe('10.0.0');
    expect(README).toContain('**当前版本 v10.00**');
  });
});
