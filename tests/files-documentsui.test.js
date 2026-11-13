// tests/files-documentsui.test.js — #215 文件应用二级菜单一次性大重构（DocumentsUI/Google Files 对标）
// R136 窗 · Job 2931605 · 第 3 定时消息系列
// 锚定面：目录操作菜单可达（主诉根治）/ 目录详情 / action mode 四键 / 子页排序视图入口 /
//         排序方向翻转 / Recents 子页 / rail 分类直达 / 语义守恒负向锚 / 准入合规 / 既有能力保留
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const filesJs = readFileSync(resolve(ROOT, 'ios-desktop/js/apps/files.js'), 'utf8');
const filesCss = readFileSync(resolve(ROOT, 'ios-desktop/css/files-app.css'), 'utf8');

describe('v215 #215 文件应用 DocumentsUI 二级菜单重构', () => {
  // ============ A. 目录操作菜单可达（主诉「二级菜单问题大」根治） ============
  it('A1 目录行尾 ⋮ 与文件统一（DocumentsUI overflow 同构，目录操作菜单可达）', () => {
    // 目录行不再走箭头分支，统一渲染 data-act="more"
    expect(filesJs).toContain("// v10.84 #215：目录行尾 ⋮ 与文件统一（DocumentsUI overflow 同构）——目录操作菜单可达");
    expect(filesJs).toMatch(/\+ \(S\.selMode\s*\?\s*'<span class="end"><\/span>'\s*\n\s*\/\/ v10\.84 #215[^\n]*\n\s*:\s*'<button class="fj-act" data-act="more"/);
  });

  it('A2 长按目录进入多选（原 row.dataset.type !== "file" 排除已退役）', () => {
    expect(filesJs).toContain("// v10.84 #215：目录长按同样进入多选（DocumentsUI 目录可选语义）");
    expect(filesJs).not.toContain("row.dataset.type !== 'file'") || expect(filesJs).toMatch(/if \(!row \|\| !row\.dataset\.path\) return; \/\/ v10\.84 #215/);
  });

  it('A3 moreSheet 导出/分享按 hasDir 门控（目录无打包/分享语义，如实不渲染不伪装）', () => {
    expect(filesJs).toContain("var hasDir = paths.some(function(p) { try { var e = V().stat(p); return e && e.type === 'dir'; } catch (err) { return false; } });");
    expect(filesJs).toContain("+ (!hasDir ? '<button class=\"fj-sh-item\" data-m=\"export\">'");
    expect(filesJs).toContain("+ (!hasDir ? '<button class=\"fj-sh-item\" data-m=\"share\">'");
    expect(filesJs).toContain("// v10.84 #215：目录项完整语义——导出/分享按 hasDir 门控");
  });

  // ============ B. 目录详情 ============
  it('B1 目录详情：类型=文件夹 + 包含 N 项·字节（dirStatOf 复用）', () => {
    expect(filesJs).toContain("var dst = dirStatOf(paths[0]) || { n: 0, bytes: 0 };");
    expect(filesJs).toContain("['类型', '文件夹'], ['包含', dst.n + ' 项 · ' + fmtBytes(dst.bytes)]");
    expect(filesJs).toContain("// v10.84 #215：目录详情——类型/包含项数·字节（DocumentsUI 目录详情同构）");
  });

  // ============ C. 多选操作条 DocumentsUI action mode 四键 ============
  it('C1 模板四键 id 齐备（分享/复制到/移动到/删除）', () => {
    expect(filesJs).toContain('<!-- v10.84 #215：多选操作条升级 DocumentsUI action mode 四键同构（分享/复制到/移动到/删除） -->');
    expect(filesJs).toContain('<button class="fj-selact" id="fjSelShare">');
    expect(filesJs).toContain('<button class="fj-selact" id="fjSelCopy">');
    expect(filesJs).toContain('<button class="fj-selact" id="fjSelMove">');
    expect(filesJs).toContain('<button class="fj-selact danger" id="fjSelDel">');
    expect(filesJs).not.toContain('id="fjSelDel" style="width:100%;"'); // 旧单键布局退役
  });

  it('C2 四键事件绑定齐备（分享单项直达 / 复制·移动 pickDir / 删除）', () => {
    expect(filesJs).toContain("// v10.84 #215：action mode 四键补全——分享/复制到/移动到直达（DocumentsUI 底部操作栏同构）");
    expect(filesJs).toMatch(/\$\('fjSelShare'\)\.onclick = function\(\) \{\s*\n\s*var ps = Array\.from\(S\.sel\);\s*\n\s*if \(ps\.length !== 1\) return;\s*\n\s*exitSel\(\);\s*\n\s*openShareSheet\(ps\[0\]\);/);
    expect(filesJs).toMatch(/\$\('fjSelCopy'\)\.onclick[\s\S]{0,200}pickDir\('复制到…'[\s\S]{0,120}pasteInto\(dir, false, ps\)/);
    expect(filesJs).toMatch(/\$\('fjSelMove'\)\.onclick[\s\S]{0,200}pickDir\('移动到…'[\s\S]{0,120}pasteInto\(dir, true, ps\)/);
  });

  it('C3 分享键禁用语义：恰好选中一个文件才可用（目录/多项 dim）', () => {
    expect(filesJs).toContain("// v10.84 #215：分享键仅在「恰好选中一个文件」时可用");
    expect(filesJs).toContain("shareOk = !!se && se.type !== 'dir';");
    expect(filesJs).toContain("if (sBtn) sBtn.classList.toggle('dim', !shareOk);");
    expect(filesCss).toContain('.fj-selact.dim { opacity: 0.38; pointer-events: none; }');
  });

  it('C4 CSS：四键横排布局 + 令牌面色零裸色', () => {
    expect(filesCss).toContain('/* v10.84 #215：DocumentsUI action mode 四键同构（分享/复制到/移动到/删除等分横排） */');
    expect(filesCss).toContain('.fj-selbot.on { display: flex; gap: 4px; }');
    expect(filesCss).toContain('.fj-selact {\n  flex: 1 1 0;');
    expect(filesCss).toContain('.fj-selact.danger, .fj-selact.danger svg { color: var(--md-error, #f2b8b5); }');
  });

  // ============ D. 子页能力对齐（下钻不再降级） ============
  it('D1 子页顶栏 ⋮ 排序与视图入口（与浏览页排序按钮共用 sortViewSheet）', () => {
    expect(filesJs).toContain('id="fjSubTools"');
    expect(filesJs).toContain("<!-- v10.84 #215：子页顶栏排序与视图入口（DocumentsUI 子页 ⋮ 同构，能力不再倒挂） -->");
    expect(filesJs).toContain("$('fjBtnSort').onclick = sortViewSheet;");
    expect(filesJs).toContain("$('fjSubTools').onclick = sortViewSheet;");
    expect(filesJs).toContain("function sortViewSheet() {");
  });

  it('D2 排序方向 asc/desc（状态 + sorted 方向化 + chips 同名再点翻转）', () => {
    expect(filesJs).toContain("sortDir: 'desc',       // v10.84 #215：排序方向（DocumentsUI 方向切换语义，默认 desc 保持 v7.51 排序结果）");
    // v11.16 #286 续重锚：sorted 实现参数化上移 js/files-core.js sortEntries（三键×双向），内联 wrapper 读闭包状态等值换算
    expect(filesJs).toContain('function sorted(list) { return __fc.sortEntries(list, S.sort, S.sortDir); }');
    expect(filesJs).toContain("// v10.84 #215：排序方向化（asc/desc，DocumentsUI 方向切换同构；默认 desc 保持 v7.51 排序结果）");
    expect(filesJs).toContain("// v10.84 #215：同名排序键再点翻转方向（DocumentsUI 方向切换语义）");
    expect(filesJs).toMatch(/if \(S\.sort === sk\) S\.sortDir = S\.sortDir === 'asc' \? 'desc' : 'asc';/);
  });

  it('D3 sheet 当前项方向/视图态标注', () => {
    expect(filesJs).toContain("'↑ 升序' : '↓ 降序'");
    expect(filesJs).toContain("'<span class=\"tr\">当前</span>'");
  });

  // ============ E. Recents 完整列表子页 + rail 分类直达 ============
  it('E1 Recents 子页（kind:"recent" + 首页「查看全部」直达）', () => {
    expect(filesJs).toContain("// v10.84 #215：S.sub 扩展 kind:'recent'（DocumentsUI Recents 完整列表页，");
    expect(filesJs).toContain("if (S.sub.kind === 'recent') {");
    expect(filesJs).toContain("subTitle.textContent = '最近';");
    expect(filesJs).toContain("data-open-recent");
    expect(filesJs).toContain("// v10.84 #215：「查看全部」直达 Recents 完整列表子页（原为切浏览页，语义错位）");
    expect(filesJs).toMatch(/var openRecentBtn = target\.closest\('\[data-open-recent\]'\);\s*\n\s*if \(openRecentBtn\) \{ openSub\(\{ kind: 'recent' \}\); return true; \}/);
    expect(filesJs).not.toContain('data-goto-browse style'); // 旧「查看全部→浏览页」渲染点退役
  });

  it('E2 rail 分类直达区（六分类 + 内部存储入口，DocumentsUI root drawer 语义）', () => {
    expect(filesJs).toContain('id="fjRailCats"');
    expect(filesJs).toContain("// v10.84 #215：rail 分类直达区（DocumentsUI root drawer 分类语义同构，平板态可见）");
    expect(filesJs).toContain('data-rail-cat=');
    expect(filesJs).toContain("'<button class=\"fj-rcat fj-rpl\" data-rail-browse=\"1\">'");
    expect(filesJs).toMatch(/var railCat = target\.closest\('\[data-rail-cat\]'\);\s*\n\s*if \(railCat\) \{ openCat\(railCat\.getAttribute\('data-rail-cat'\)\); return true; \}/);
  });

  it('E3 CSS：rail 分类区样式（outline-variant 分隔 + 令牌面色）', () => {
    expect(filesCss).toContain('/* v10.84 #215：rail 分类直达区（DocumentsUI root drawer 分类语义同构；rail 仅平板态可见） */');
    expect(filesCss).toContain('.fj-rail-cats {');
    expect(filesCss).toContain('border-top: 1px solid var(--md-outline-variant);');
    expect(filesCss).toContain('.fj-rcat {');
  });

  // ============ F. 准入合规（#179 六条锚） ============
  it('F1 CSS 令牌面色：新增样式段零裸色（--md-* + fallback 全覆盖，残留裸色即败）', () => {
    // 先剔除 var(--md-xxx, #fallback) 合法写法与注释行（含议题编号 #215 非色值），再查残留十六进制裸色
    var stripSafe = function(block) {
      return block
        .replace(/\/\*[^]*?\*\//g, '')
        .replace(/var\(--md-[a-z-]+,\s*#[0-9a-fA-F]{3,8}\)/g, '');
    };
    var selactBlock = filesCss.slice(filesCss.indexOf('/* v10.84 #215：DocumentsUI action mode'), filesCss.indexOf('@keyframes fjUpIn'));
    expect(selactBlock).toContain('var(--md-on-surface');
    expect(selactBlock).toContain('var(--md-surface-container-highest');
    expect(stripSafe(selactBlock)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    var railBlock = filesCss.slice(filesCss.indexOf('/* v10.84 #215：rail 分类直达区'), filesCss.indexOf('.fj-rail .fj-rail-logo'));
    expect(railBlock).toContain('var(--md-outline-variant)');
    expect(railBlock).toContain('var(--md-surface-container-high');
    expect(stripSafe(railBlock)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('F2 响应式与平板分栏保留（@media ≥1 + fj-wide rail 断点 + 存储卡）', () => {
    expect((filesCss.match(/@media/g) || []).length).toBeGreaterThanOrEqual(1);
    expect(filesCss).toContain('.fj-app.fj-wide .fj-rail { display: flex; }');
    expect(filesJs).toContain('app.classList.toggle(\'fj-wide\', app.clientWidth >= 620)');
  });

  // ============ G. 既有能力保留（v751/v769/v770 锚延续 + #178 孤岛判据） ============
  it('G1 v751 结构锚延续：三屏 + rail + 图标桥', () => {
    expect(filesJs).toContain('id="fjHome"');
    expect(filesJs).toContain('id="fjClean"');
    expect(filesJs).toContain('id="fjBrowse"');
    expect(filesJs).toContain('class="fj-rail"');
    expect(filesJs).toMatch(/var ic = function\(n, st\) \{ return window\.__fjIc\(n, st\); \}/);
  });

  it('G2 #178 孤岛判据延续：主键收编为 ios-desktop:files-clean-freed-total（v11.17 #283），旧键字面仅存迁移回落', () => {
    const hits = filesJs.match(/localStorage\.(get|set|remove)Item\('ios-desktop:files-clean-freed-total'/g) || [];
    expect(hits.length).toBeGreaterThanOrEqual(2); // 收编主键：迁移读 + bumpFreed 写
    const legacy = filesJs.match(/localStorage\.(get|set|remove)Item\('files_clean_freed_total'/g) || [];
    expect(legacy.length).toBeGreaterThanOrEqual(2); // 迁移回落：回落读 + 搬移写/清除
    const all = filesJs.match(/localStorage\./g) || [];
    expect(all.length).toBe(hits.length + legacy.length); // 除主键与回落引用外零其他 localStorage 访问（孤岛判据不回归）
  });

  it('G3 返回桥与转场锚延续：__filesPB / fjSub 动画类不被本次重构触碰', () => {
    expect(filesJs).toContain('window.__filesPB = {');
    expect(filesCss).toContain('.fj-sub.anim-in { animation: fjSubIn 0.34s cubic-bezier(0.2, 0, 0.1, 1); }');
    expect(filesCss).toContain('.fj-sub.anim-out { animation: fjSubOut 0.3s cubic-bezier(0.1, 0.1, 0, 1) forwards; }');
  });

  it('G4 目录行尾旧箭头渲染退役（负向锚）', () => {
    expect(filesJs).not.toContain("'<span class=\"end\">' + ic('back', 'transform:rotate(180deg);width:16px;height:16px;') + '</span>'");
  });

  it('G5 VFS/剪贴板/总线订阅与 SDK 接入保留（#179 准入④）', () => {
    expect(filesJs).toContain('window.__vfs');
    expect(filesJs).toContain('window.__clipboard');
    expect(filesJs).toContain("emit('files/share'");
    expect(filesJs).toContain("emit('photo/captured'");
    expect(filesJs).toContain("'music/import'");
    expect(filesJs).toContain('window.__pkgInstallerAPI');
  });
});
