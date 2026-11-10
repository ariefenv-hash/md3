// ==================== v166 测试 — 压缩/解压工具（v9.17 #166 R43） ====================
//
// #166「已付费未使用」系列：jszip.min.js（95.3KB，books epub 解包在用）已 vendor 但无压缩应用。
// 新建 apps/archive/（第 50 号）：多选 VFS 文件压缩 → /archives/、打开 .zip 浏览树、解压写回 VFS。
// 范围纪律：只做 zip（#166 明文不承诺 rar/7z）；zip 炸弹防御（条目 500 / 解压总量 200MB）。
//
// 环境跟随全局 happy-dom；JSZip 纯函数语义用 node_modules 的 jszip 真跑（vendor 同版本）。
//
// 断言面：
//  A. 注册链四处在册（包装器 / apps-data / terminal APPS / app-icons）+ 第 50 号
//  B. vendor 复用纪律（jszip 不重复 vendor）
//  C. zip 闭环真跑（jszip 包）：压缩→读回→解压→内容一致（数据链路语义，非只查源码）
//  D. 准入六条静态门禁（#179）：令牌零裸色 / @media / 平板双栏 / SDK 三接 / 按压联动 / 滑条波浪不适用留痕
//  E. VFS /archives/ 单一真源（无 localStorage 文档孤岛）+ zip 炸弹防御常量
//  F. 版本真源 9.17.0

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const APP_SRC = read('ios-desktop/apps/archive/index.html');
const CORE_SRC = read('ios-desktop/apps/archive/core.js'); // v11.07 #286 续：archiveCore 真身源（演进重锚对账面）
const WRAP_SRC = read('ios-desktop/js/apps/archive.js');
const APPS_DATA = read('ios-desktop/js/apps-data.js');
const TERMINAL = read('ios-desktop/js/terminal-core.js');
const ICONS = read('ios-desktop/js/app-icons.js');
const README = read('README.md');
const PKG = JSON.parse(read('package.json'));

// jszip 无 npm 依赖（vendor UMD 直用，同应用运行时形态）
const VENDOR_SRC = read('ios-desktop/apps/_shared/vendor/jszip.min.js');
const _mod = { exports: {} };
new Function('module', 'exports', VENDOR_SRC)(_mod, _mod.exports);
const JSZip = _mod.exports;

describe('v9.17 #166：zip 闭环真跑（jszip 同版本语义）', () => {
  it('C1 压缩→读回：多文件 DEFLATE 打包后 loadAsync 条目与内容一致', async () => {
    const zip = new JSZip();
    zip.file('a.txt', 'hello archive');
    zip.file('b (2).md', '# 重名防冲突形态');
    const blob = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const back = await JSZip.loadAsync(blob);
    expect(await back.file('a.txt').async('string')).toBe('hello archive');
    expect(await back.file('b (2).md').async('string')).toContain('重名防冲突');
  });

  it('C2 解压语义：包内子目录条目逐条 blob 写回（vfs.write mkdirp 建父目录）', async () => {
    const zip = new JSZip();
    zip.folder('sub');
    zip.file('sub/deep.txt', 'nested');
    const blob = await zip.generateAsync({ type: 'nodebuffer' });
    const back = await JSZip.loadAsync(blob);
    const rels = [];
    back.forEach((rel, f) => rels.push({ rel, dir: !!f.dir }));
    expect(rels.some((r) => r.dir && r.rel === 'sub/')).toBe(true); // 目录条目在册
    expect(await back.file('sub/deep.txt').async('string')).toBe('nested');
  });
});

describe('v9.17 #166：archive 注册链与准入六条', () => {
  it('A1 包装器在册：id=archive / iframeAppContent 指向 apps/archive/index.html', () => {
    expect(WRAP_SRC).toContain("id: 'archive'");
    expect(WRAP_SRC).toContain("iframeAppContent('apps/archive/index.html')");
  });

  it('A2 apps-data：import + 数组成员（第 50 号，注释留痕）', () => {
    expect(APPS_DATA).toContain("import archive from './apps/archive.js'");
    expect(APPS_DATA).toContain('typing, markdown, archive,');
    expect(APPS_DATA).toContain('v9.17 #166：archive 第 50 号');
  });

  it('A3 terminal-core APPS 行 + 别名（zip/压缩/解压/打包）', () => {
    expect(TERMINAL).toContain("['archive', '压缩解压', 'archive', 'zip', '压缩', '解压', '打包']");
  });

  it('A4 app-icons 图标块在册（fixture 273 锚由 app-icons.test.js 守）', () => {
    expect(ICONS).toContain('archive: `<svg viewBox="0 0 100 100"');
  });

  it('A5 README 计数滚动：50 应用 / 39 iframe / v9.17', () => {
    expect(README).toContain('52 个内置应用');
    expect(README).toContain('41 个 iframe 子应用');
    expect(README).toContain('v11.07');
  });

  it('B1 vendor 复用：引用 _shared/vendor/jszip.min.js，未重复 vendor', () => {
    expect(APP_SRC).toContain('src="../_shared/vendor/jszip.min.js"');
    expect(existsSync(join(ROOT, 'ios-desktop/apps/archive/jszip.min.js'))).toBe(false);
    expect(existsSync(join(ROOT, 'ios-desktop/apps/_shared/vendor/jszip.min.js'))).toBe(true);
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

  it('D3 准入③ 平板分栏：左 VFS 选择 | 右包内容真分栏 + 拖宽', () => {
    expect(APP_SRC).toContain('id="splitter"');
    expect(APP_SRC).toContain('cursor: col-resize');
  });

  it('D4 准入④ __system SDK 三接：fs(list/read/write) + notify + clipboard', () => {
    expect(APP_SRC).toContain('__system.fs.list');
    expect(APP_SRC).toContain('__system.fs.read');
    expect(APP_SRC).toContain('__system.fs.write');
    expect(APP_SRC).toContain('r.ok === false'); // 桥返回形状显式拒判（v9.10 教训）
    expect(APP_SRC).toContain('__system.notify');
    expect(APP_SRC).toContain('__system.clipboard');
  });

  it('D5 准入⑤-3 顶栏操作键整排按压联动（距离衰减 scale/圆角/让位）', () => {
    expect(APP_SRC).toContain('pressRipple');
    // v11.07 #286 续演进重锚：按压数学与样式串构造上移 apps/archive/core.js 真身（内联实现退役），委托行留 index.html
    expect(APP_SRC).toContain('window.__archiveCore.rippleStyles(i, originIdx)');
    expect(CORE_SRC).toContain('1 - d * 0.45');
    expect(CORE_SRC).toContain("borderRadius: (12 + (d === 0 ? 5 : 3) * f) + 'px'");
  });

  it('D6 准入⑤-1/2 滑条怠速柄与播放条波浪不适用留痕（无滑条/无播放链路）', () => {
    expect(APP_SRC).toContain('怠速柄');
    expect(APP_SRC).toContain('波浪');
  });

  it('E1 VFS /archives/ 单一真源 + 无 localStorage 孤岛', () => {
    expect(APP_SRC).toContain("'/archives/'");
    expect(APP_SRC).not.toContain('localStorage.setItem');
    expect(APP_SRC).toContain('application/zip');
  });

  it('E2 范围纪律与安全：只做 zip（rar/7z 不承诺）+ zip 炸弹防御常量', () => {
    expect(APP_SRC).toContain('仅 zip');
    expect(APP_SRC).toContain('rar/7z 不在列');
    // v11.07 #286 续演进重锚：防御常量上移 core 真身（内联字面量退役），委托行留 index.html
    expect(CORE_SRC).toContain('ZIP_MAX_ENTRIES = 500');
    expect(CORE_SRC).toContain('ZIP_MAX_TOTAL = 200 * 1048576');
    expect(APP_SRC).toContain('window.__archiveCore.ZIP_MAX_ENTRIES');
  });

  it('F 版本真源 9.17.0（v150 同口径）', () => {
    expect(PKG.version).toBe('11.7.0');
    expect(README).toContain('**当前版本 v11.07**');
  });
});
