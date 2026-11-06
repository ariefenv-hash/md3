// ==================== v165 测试 — Markdown 编辑器（v9.16 #165 R43） ====================
//
// #165「已付费未使用」系列：marked.min.js 已 vendor（calendar 专用）但无独立 Markdown 应用。
// 新建 apps/markdown/（第 49 号）+ _shared/sanitize.js XSS 白名单闸 + calendar 审计修复。
// 环境跟随全局 happy-dom（DOMParser/document/window 齐备，sanitize 语义真跑）。
//
// 断言面：
//  A. 注册链四处在册（包装器 / apps-data / terminal APPS / app-icons）+ iframe 计数 38
//  B. vendor 复用纪律（marked 不重复 vendor；sanitize.js 在 _shared）
//  C. XSS 白名单闸纯函数语义（script 剥除 / on* 剥除 / javascript: 剥除 / data:image 放行 /
//     GFM 结构保留 / code class 仅 language-*）
//  D. 准入六条静态门禁（#179）：--md-* 令牌 / @media 断点 / 平板双栏 / __system SDK（VFS/notify/clipboard）/
//     怠速柄滑条 / 工具栏整排按压联动
//  E. VFS /documents/ 单一真源（无 localStorage 文档孤岛）
//  F. calendar 审计修复（renderPreview 过闸）
//  G. 版本真源 9.16.0

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const APP_SRC = read('ios-desktop/apps/markdown/index.html');
const SAN_SRC = read('ios-desktop/apps/_shared/sanitize.js');
const WRAP_SRC = read('ios-desktop/js/apps/markdown.js');
const APPS_DATA = read('ios-desktop/js/apps-data.js');
const TERMINAL = read('ios-desktop/js/terminal-core.js');
const ICONS = read('ios-desktop/js/app-icons.js');
const CALENDAR = read('ios-desktop/apps/calendar/index.html');
const README = read('README.md');
const PKG = JSON.parse(read('package.json'));

// ---------- B. XSS 白名单闸纯函数语义（jsdom 真跑 sanitize.js） ----------
describe('v9.16 #165：__mdSanitize 白名单闸语义', () => {
  // jsdom 环境下加载 sanitize.js（IIFE 挂 window.__mdSanitize）
  new Function('window', SAN_SRC)(window);

  it('script/style/iframe 等整体移除，未知标签 unwrap 保文本', () => {
    const s = window.__mdSanitize('<p>前</p><script>alert(1)</script><style>.x{}</style><iframe src="x"></iframe><div><span>段</span></div>');
    expect(s).not.toContain('script');
    expect(s).not.toContain('style');
    expect(s).not.toContain('iframe');
    expect(s).toContain('前');
    expect(s).toContain('段');
  });

  it('on* 事件属性一律剥除', () => {
    const s = window.__mdSanitize('<p onclick="alert(1)" onmouseover="x()">hi</p><img src="a.png" onerror="alert(1)">');
    expect(s).not.toContain('onclick');
    expect(s).not.toContain('onmouseover');
    expect(s).not.toContain('onerror');
    expect(s).toContain('hi');
  });

  it('javascript:/data:text/html 链接剥除；http/https/相对/锚点放行', () => {
    expect(window.__mdSanitize('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
    expect(window.__mdSanitize('<a href="JaVaScRiPt:alert(1)">x</a>')).not.toContain('alert');
    expect(window.__mdSanitize('<a href="data:text/html,<b>x</b>">x</a>')).not.toContain('data:');
    expect(window.__mdSanitize('<a href="vbscript:x">x</a>')).not.toContain('vbscript:');
    expect(window.__mdSanitize('<a href="https://a.b/c">x</a>')).toContain('https://a.b/c');
    expect(window.__mdSanitize('<a href="/docs/a.md">x</a>')).toContain('/docs/a.md');
    expect(window.__mdSanitize('<a href="#sec">x</a>')).toContain('#sec');
  });

  it('img src 放行 data:image/*（base64 图），拒绝其他 data:', () => {
    expect(window.__mdSanitize('<img src="data:image/png;base64,iVBOR">')).toContain('data:image/png');
    expect(window.__mdSanitize('<img src="data:text/html,x">')).not.toContain('data:text');
  });

  it('GFM 常用结构保留：表格/任务列表/代码块语言类/引用', () => {
    const s = window.__mdSanitize('<table><thead><tr><th colspan="2">A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>');
    expect(s).toContain('<table>'); expect(s).toContain('colspan="2"');
    const t = window.__mdSanitize('<input type="checkbox" checked="">task');
    expect(t).toContain('type="checkbox"'); expect(t).toContain('disabled');
    const c = window.__mdSanitize('<pre><code class="language-js x-evil alert(1)">let a=1;</code></pre>');
    expect(c).toContain('language-js'); expect(c).not.toContain('x-evil');
    expect(c).not.toContain('alert');
    const q = window.__mdSanitize('<blockquote><p>q</p></blockquote><ul><li>i</li></ul>');
    expect(q).toContain('<blockquote>'); expect(q).toContain('<li>');
  });

  it('svg/math 等外来命名空间标签 unwrap，事件残留不外泄', () => {
    const s = window.__mdSanitize('<svg onload="alert(1)"><circle r="1"></circle></svg>');
    expect(s).not.toContain('svg'); expect(s).not.toContain('onload');
  });
});

// ---------- A/C/D/E/F/G. 静态门禁 ----------
describe('v9.16 #165：Markdown 应用注册链与准入六条', () => {
  it('A1 包装器在册：id/name/iframeAppContent 指向 apps/markdown/index.html', () => {
    expect(WRAP_SRC).toContain("id: 'markdown'");
    expect(WRAP_SRC).toContain("iframeAppContent('apps/markdown/index.html')");
  });

  it('A2 apps-data：import + 数组成员（第 49 号，注释留痕）', () => {
    expect(APPS_DATA).toContain("import markdown from './apps/markdown.js'");
    expect(APPS_DATA).toContain('typing, markdown, archive,');
    expect(APPS_DATA).toContain('v9.16 #165：markdown 第 49 号');
  });

  it('A3 terminal-core APPS 行 + 别名（md/笔记/文档）', () => {
    expect(TERMINAL).toContain("['markdown', 'Markdown', 'markdown', 'md', '笔记', '文档', '编辑器']");
  });

  it('A4 app-icons 图标块在册（fixture 268 锚由 app-icons.test.js 守）', () => {
    expect(ICONS).toContain('markdown: `<svg viewBox="0 0 100 100"');
  });

  it('A5 README 计数滚动：52 应用 / 41 iframe / 版本块随 pkg 展示版（版本无关化——R60 坑①，硬编码版本号每轮 roll 失配）', () => {
    expect(README).toContain('52 个内置应用');
    expect(README).toContain('41 个 iframe 子应用');
    const displayVer = 'v' + PKG.version.split('.').slice(0, 2)
      .map((n, i) => (i === 1 ? String(n).padStart(2, '0') : n)).join('.');
    expect(README).toContain(`**当前版本 ${displayVer}**`);
  });

  it('B1 vendor 复用：引用 _shared/vendor/marked.min.js，未重复 vendor（vendor 目录仅一份）', () => {
    expect(APP_SRC).toContain('src="../_shared/vendor/marked.min.js"');
    expect(existsSync(join(ROOT, 'ios-desktop/apps/markdown/marked.min.js'))).toBe(false);
    expect(existsSync(join(ROOT, 'ios-desktop/apps/_shared/vendor/marked.min.js'))).toBe(true);
  });

  it('B2 sanitize.js 在 _shared 且被 markdown 与 calendar 双消费', () => {
    expect(existsSync(join(ROOT, 'ios-desktop/apps/_shared/sanitize.js'))).toBe(true);
    expect(APP_SRC).toContain('src="../_shared/sanitize.js"');
    expect(CALENDAR).toContain('src="../_shared/sanitize.js"');
  });

  it('C1 渲染闸：marked 输出一律过 __mdSanitize，禁止裸赋值（正则避开注释字面量）', () => {
    expect(APP_SRC).toContain('window.__mdSanitize(marked.parse(text))');
    // 赋值形态（= 后跟 marked.parse 且非 sanitize 包装）全库为零（注释措辞已避开自匹配）
    expect(APP_SRC).not.toMatch(/=\s*marked\.parse/);
  });

  it('C2 兜底路径：库缺失时 esc 纯文本渲染，不裸 innerHTML', () => {
    expect(APP_SRC).toContain("esc(text).replace(/\\n/g, '<br>')");
  });

  it('D1 准入① MD3 色彩：--md-* 令牌引用 ≥ 12 处，UI 区 hex 全部为 var(--md-*, fallback) 形态', () => {
    const tokens = (APP_SRC.match(/var\(--md-[\w-]+/g) || []).length;
    expect(tokens).toBeGreaterThanOrEqual(12); // 对照 #179 基线：lyricmaker 仅 6 处判不达标，本应用 ≥2 倍且零裸色
    // UI 区（导出 HTML 壳是独立文档，不属应用 UI），色位 hex 只允许出现在令牌 fallback 位；
    // 正则锚定 [:(,] 前缀，排除注释里的 #165 议题号等非色位字面量
    const uiPart = APP_SRC.slice(0, APP_SRC.indexOf('<script>\n(function ()'));
    const allHex = (uiPart.match(/[:(,]\s*#[0-9a-fA-F]{3,8}\b/g) || []).length;
    const fallbackHex = (uiPart.match(/var\(--md-[\w-]+,\s*#[0-9a-fA-F]{3,8}\)/g) || []).length;
    expect(allHex).toBeGreaterThan(0);
    expect(allHex).toBe(fallbackHex); // 零裸色：每个色位 hex 都是某令牌的缺失兜底
  });

  it('D2 准入② 响应式：≥1 个 @media 断点（760px 手机/平板两套）', () => {
    expect(APP_SRC).toContain('@media (max-width: 759.98px)');
    expect(APP_SRC).toContain('@media (min-width: 760px)');
  });

  it('D3 准入③ 平板分栏：编辑|预览双栏并排 + 分割条拖宽，非简单放大', () => {
    expect(APP_SRC).toContain('id="splitter"');
    expect(APP_SRC).toContain('flex: 1 1 50%');
    expect(APP_SRC).toContain('cursor: col-resize');
  });

  it('D4 准入④ __system SDK：fs（list/read/write + readText 双引擎兼容）+ notify + clipboard', () => {
    expect(APP_SRC).toContain('__system.fs.list');
    expect(APP_SRC).toContain('__system.fs.write');
    expect(APP_SRC).toContain('typeof window.__system.fs.readText === \'function\''); // #180 双引擎范式
    expect(APP_SRC).toContain('rec.blob.text'); // read→text/blob.text 回落
    expect(APP_SRC).toContain('__system.notify');
    expect(APP_SRC).toContain('__system.clipboard');
  });

  it('D5 准入⑤-1 怠速柄滑条：thumb 竖条怠速态 + hover/active 展开胶囊，非默认圆点', () => {
    expect(APP_SRC).toContain('mdslider::-webkit-slider-thumb');
    expect(APP_SRC).toContain('width: 6px; height: 22px; border-radius: 3px'); // 怠速竖条
    expect(APP_SRC).toContain('width: 24px; border-radius: 11px'); // 展开胶囊
    expect(APP_SRC).toContain('cubic-bezier(.2,0,0,1)');
  });

  it('D6 准入⑤-3 工具栏整排按压联动：距离衰减 scale/圆角形变 + 让位（tile-bounce 数学同构）', () => {
    expect(APP_SRC).toContain('pressRipple');
    expect(APP_SRC).toContain('1 - d * 0.45'); // 距离衰减
    expect(APP_SRC).toContain("k.style.borderRadius = (10 + (d === 0 ? 5 : 3) * f) + 'px'"); // 圆角变换
    expect(APP_SRC).toContain('translateX'); // 邻项让位
  });

  it('D7 准入⑤-2 波浪播放条不适用留痕（无播放链路，注释说明）', () => {
    expect(APP_SRC).toContain('播放条波浪');
  });

  it('E1 VFS 单一真源：/documents/ 落点 + 无 localStorage 文档孤岛', () => {
    expect(APP_SRC).toContain("'/documents/'");
    expect(APP_SRC).not.toContain('localStorage.setItem');
    expect(APP_SRC).toContain('text/markdown');
  });

  it('F calendar 审计修复：renderPreview 过 __mdSanitize 闸（#165 纪律条）', () => {
    expect(CALENDAR).toContain('window.__mdSanitize(marked.parse(c))');
    expect(CALENDAR).not.toMatch(/innerHTML\s*=\s*marked\.parse\(c\)/);
  });

  it('G 版本真源 9.16.0（v150 同口径）', () => {
    expect(PKG.version).toBe('10.25.0');
    expect(README).toContain('**当前版本 v10.25**');
  });
});
