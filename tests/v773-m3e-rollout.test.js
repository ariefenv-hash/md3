// ==================== v773-m3e-rollout.test.js — M3E 组件全系统铺开（「扩展」路线①） ====================
//
// 用户指令「继续，进一步扩展」→ 把 v7.72 只接入 files 一处的 M3E 三组件铺向全系统：
//   A. LoadingIndicator 铺进 4 个真实等待场景：
//      settings 存储统计「正在统计…」/ installer 解析压缩包 snack /
//      翻译 iframe（m3e-mini.js 独立引擎，替换 v7.50 SVG spinner）/ 录音机麦克风检查
//   B. installer 待安装/已安装 tabs → M3E connected ButtonGroup（皮肤退役）
//   C. mail FAB → M3E SplitButton（lead 写邮件 + trail 真实菜单，spin + 内角变形）
//
// 验证策略：
//   • 锚点测试（源码包含性）——与 v7.6x 系列一致的工程惯例
//   • 数学同构测试——m3e-mini 与宿主 m3e.js 七形引擎 r(θ) 逐点相等
//   • 行为测试——mail SplitButton 菜单 helpers 在 happy-dom 真实 DOM 上驱动

import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

const settingsJs = src('ios-desktop/js/apps/settings.js');
const installerJs = src('ios-desktop/js/apps/installer.js');
const installerCss = src('ios-desktop/css/installer-app.css');
const recorderJs = src('ios-desktop/js/apps/recorder.js');
const mailJs = src('ios-desktop/js/apps/mail.js');
const m3eJs = src('ios-desktop/js/m3e.js');
const miniJs = src('ios-desktop/apps/translate/m3e-mini.js');
const translateHtml = src('ios-desktop/apps/translate/index.html');
const swJs = src('sw.js');

// ==================== A. LoadingIndicator 全系统铺开 ====================
describe('v7.73 · A LoadingIndicator 铺进 4 个等待场景', () => {
  test('A1 settings 存储统计：等待态挂 26px 指示器（__m3eLoader 桥）', () => {
    expect(settingsJs).toContain('id="storageStatLoader"');
    expect(settingsJs).toContain("window.__m3eLoader.mount(statLoaderBox, { size: 26 })");
    expect(settingsJs).toContain('正在统计…'); // 文案保留
  });

  test('A2 installer snack：loader 分支（15px + 横排结构 + class 切换）', () => {
    expect(installerJs).toContain('function snack(msg, opts)');
    expect(installerJs).toContain('opts.loader');
    expect(installerJs).toContain('pkg-snack-loader-ic');
    expect(installerJs).toContain('window.__m3eLoader.mount(box, { size: 15 })');
    expect(installerJs).toContain("el.classList.toggle('pkg-snack-load', !!(opts && opts.loader))");
    // 真实接线点：解析压缩包等待态
    expect(installerJs).toContain("snack('正在解析压缩包…', { loader: true })");
    // CSS：横排容器 + 坑位
    expect(installerCss).toContain('.pkg-snack-loader');
    expect(installerCss).toContain('.pkg-snack-loader-ic');
    expect(installerCss).toContain('.pkg-snack.pkg-snack-load');
  });

  test('A3a translate：m3e-mini.js 存在且与宿主 m3e.js 几何管线同构（v7.75 忠实源文件版）', async () => {
    // 宿主纯函数内核（顶点表 + 形变缓冲 + 缩放因子）
    const { M3E_LOADER_SHAPES, M3E_LOADER_MORPHS, M3E_SHAPE_SCALE_FACTOR } = await import(
      join(ROOT, 'ios-desktop/js/m3e.js')
    );
    // 内嵌引擎（classic IIFE → 经 new Function 注入假 window 取出导出）
    const fakeWindow = {};
    new Function('window', miniJs)(fakeWindow);
    const mini = fakeWindow.__m3eMini;
    expect(mini).toBeTruthy();
    // 七形顶点表逐点一致（SoftBurst→Cookie9→Pentagon→Pill→Sunny→Cookie4→Oval）
    expect(mini.shapes).toHaveLength(7);
    for (let i = 0; i < 7; i++) {
      expect(mini.shapes[i].length).toBe(M3E_LOADER_SHAPES[i].length);
      for (let k = 0; k < mini.shapes[i].length; k++) {
        expect(mini.shapes[i][k][0]).toBeCloseTo(M3E_LOADER_SHAPES[i][k][0], 10);
        expect(mini.shapes[i][k][1]).toBeCloseTo(M3E_LOADER_SHAPES[i][k][1], 10);
      }
    }
    // 形变缓冲（resample M=256 + 两级环形对齐）逐点同构（抽样 1/16 步距）
    expect(mini.morphs).toHaveLength(7);
    for (let i = 0; i < 7; i++) {
      expect(mini.morphs[i].a.length).toBe(M3E_LOADER_MORPHS[i].a.length);
      for (let k = 0; k < 512; k += 16) {
        expect(mini.morphs[i].a[k]).toBeCloseTo(M3E_LOADER_MORPHS[i].a[k], 10);
        expect(mini.morphs[i].b[k]).toBeCloseTo(M3E_LOADER_MORPHS[i].b[k], 10);
      }
    }
    // 形状缩放因子（calculateScaleFactor × ActiveIndicatorScale）一致
    expect(mini.ShapeScaleFactor).toBeCloseTo(M3E_SHAPE_SCALE_FACTOR, 10);
  });

  test('A3b translate index.html：SVG spinner 退役，mini 引擎接线（挂/卸）', () => {
    // 头部引入
    expect(translateHtml).toContain('<script src="m3e-mini.js"></script>');
    // 旧 SVG spinner 结构退役
    expect(translateHtml).not.toContain('<svg class="status-spinner"');
    expect(translateHtml).not.toContain('tr-spin');
    // 新容器 + setStatus 挂/卸
    expect(translateHtml).toContain('id="statusSpinnerSlot"');
    expect(translateHtml).toContain("window.__m3eMini.mount(slot, { size: 14 })");
    expect(translateHtml).toContain('slot.__m3eMini.stop()');
    // v7.50 锚点文案注释演进（保留历史脉络）
    expect(translateHtml).toContain('[v7.73] spinner 态挂/卸 M3E 七形指示器');
  });

  test('A4 recorder：麦克风检查期挂 12px 指示器，结果落地恢复脉冲圆点', () => {
    expect(recorderJs).toContain('id="recMicDotWrap"');
    expect(recorderJs).toContain('window.__m3eLoader.mount(micDotWrapEl, { size: 12 })');
    expect(recorderJs).toContain('micDotWrapEl.__m3eInst.stop()');
    expect(recorderJs).toContain("micDotWrapEl.innerHTML = '<span class=\"rec-dot\"></span>'");
    // 检查期隐藏原圆点，结果态恢复
    expect(recorderJs).toContain("dot.style.display = 'none'");
  });
});

// ==================== B. installer tabs → M3E connected ButtonGroup ====================
describe('v7.73 · B installer tabs 换装 M3E connected ButtonGroup', () => {
  test('结构：容器 m3e-btngroup + 段 m3e-bg-seg（data-t 契约保留）', () => {
    expect(installerJs).toContain('class="m3e-btngroup pkg-tabs"');
    expect(installerJs).toContain('class="m3e-bg-seg pkg-tab on" data-t="pending"');
    expect(installerJs).toContain('class="m3e-bg-seg pkg-tab" data-t="installed"');
    expect(installerJs).toContain('pkgNPending');
    expect(installerJs).toContain('pkgNInstalled');
  });

  test('皮肤退役：pkg-tab 自绘底色/圆角规则清零（由 m3e.css 承担）', () => {
    expect(installerCss).not.toMatch(/\.pkg-tab\s*\{[^}]*background/);
    expect(installerCss).not.toMatch(/\.pkg-tab\.on\s*\{/);
    expect(installerCss).toContain('m3e-btngroup/m3e-bg-seg 出自 m3e.css'); // 决策存档注释
    expect(installerCss).toContain('.pkg-tab-n'); // 计数角标保留
  });

  test('m3e.css 提供 connected 语义（激活段 + 按压内角变形）', () => {
    const m3eCss = src('ios-desktop/css/m3e.css');
    expect(m3eCss).toContain('.m3e-btngroup .m3e-bg-seg.on');
    expect(m3eCss).toContain('.m3e-btngroup .m3e-bg-seg:active { border-radius: 15px; }');
  });
});

// ==================== C. mail FAB → M3E SplitButton ====================
describe('v7.73 · C mail FAB 换装 M3E SplitButton', () => {
  test('结构：lead（写邮件）+ trail（菜单）+ 弹出菜单（真实动作）', () => {
    expect(mailJs).toContain('class="m3e-splitbtn"');
    expect(mailJs).toContain('class="m3e-sb-lead"');
    expect(mailJs).toContain('class="m3e-sb-trail"');
    expect(mailJs).toContain('写邮件');
    expect(mailJs).toContain('class="mail-fab-menu"');
    expect(mailJs).toContain("__mailFabAct(this,'search')");
    expect(mailJs).toContain("page.querySelectorAll('.md3-card .mail-unread')");
    expect(mailJs).toContain('class="mail-unread"'); // 未读圆点语义钩子（readall 目标）
    // 菜单开启态：trail spin（m3e-sb-open）
    expect(mailJs).toContain("split.classList.toggle('m3e-sb-open', !open)");
  });

  test('行为：helpers 在真实 DOM 上驱动（聚焦搜索 / 已读置透明 / 开关菜单）', async () => {
    document.body.innerHTML = '';
    await import(join(ROOT, 'ios-desktop/js/apps/mail.js'));
    expect(typeof window.__mailFabMenu).toBe('function');
    expect(typeof window.__mailFabAct).toBe('function');
    expect(typeof window.__mailFabClose).toBe('function');

    // 构造一个最小 mail 页实例（.app-page 作用域）
    const page = document.createElement('div');
    page.className = 'app-page';
    page.innerHTML = `
      <input type="text" placeholder="搜索邮件...">
      <div class="md3-card"><div class="mail-unread" style="width:8px;height:8px;border-radius:50%;background:var(--md-primary);"></div></div>
      <div class="mail-fab-menu" style="display:none;"></div>
      <div class="m3e-splitbtn">
        <button class="m3e-sb-lead"></button>
        <button class="m3e-sb-trail"></button>
      </div>`;
    document.body.appendChild(page);

    // 菜单开 → 关
    const trail = page.querySelector('.m3e-sb-trail');
    window.__mailFabMenu(trail);
    expect(page.querySelector('.mail-fab-menu').style.display).toBe('block');
    expect(page.querySelector('.m3e-splitbtn').classList.contains('m3e-sb-open')).toBe(true);
    window.__mailFabMenu(trail);
    expect(page.querySelector('.mail-fab-menu').style.display).toBe('none');
    expect(page.querySelector('.m3e-splitbtn').classList.contains('m3e-sb-open')).toBe(false);

    // search：聚焦搜索框（toast 全局缺省时不抛错）
    window.__mailFabMenu(trail); // 先再开
    const input = page.querySelector('input');
    let focused = false;
    input.focus = () => { focused = true; };
    window.__mailFabAct(trail, 'search');
    expect(focused).toBe(true);
    expect(page.querySelector('.mail-fab-menu').style.display).toBe('none'); // 动作后收菜单

    // readall：未读圆点置透明（长手 background-color 断言——happy-dom 简写坑，见 mail.js 注释）
    const dot = page.querySelector('.md3-card .mail-unread');
    window.__mailFabAct(trail, 'readall');
    expect(dot.style.backgroundColor).toBe('transparent');
  });
});

// ==================== D. 版本与工程锚点 ====================
describe('v7.73 · D 版本与工程锚点', () => {
  beforeEach(() => {
    // 环境防串扰（本文件行为测试操作了共享 document）
    document.body.innerHTML = '';
  });

  test('sw.js 版本推进 geek-v81 → geek-v97', () => {
    expect(swJs).toContain("const VERSION = 'geek-v97';");
    expect(swJs).not.toContain("geek-v81");
  });

  test('宿主 m3e.js 不回归：七形序列与沙箱桥仍在', () => {
    expect(m3eJs).toContain('M3E_LOADER_SHAPES');
    expect(m3eJs).toContain('initM3eBridge');
  });
});
