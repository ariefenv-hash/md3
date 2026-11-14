// ==================== v241 测试 — 键盘可达性自动增强（v11.28 #241 R123 窗） ====================
//
// #241：iframe 应用 74 处（审计基线 v10.36）div onclick 不可 Tab 聚焦、不可
// Enter 触发、读屏不可见；v11.28 标签级复测 HTML 属性形态 104 处 + JS 赋值
// 形态（el.onclick = fn，IDL 不反射 content attribute，querySelectorAll
// 不可见）125 处。本窗交付 _shared/a11y.js 三层自动增强（应用代码零改动）：
//   ① attribute 形态：首扫 + MutationObserver 动态覆盖（debounce 120ms）
//   ② IDL 赋值形态：HTMLElement.prototype.onclick setter 劫持（赋值瞬间增强）
//   ③ 显式入口 window.__mdA11y.enhance(root)
// 引入面：壳层 index.html + 12 应用 + 2 脚手架模板（#240 引入行同律）。
//
// 断言面：
//  A. setter 劫持层（IDL 形态：div 自动补齐 / 原生 button 不误改 / 幂等）
//  B. attribute 扫描层（补齐 + Enter/Space 激活 + role/tabindex 不覆盖 +
//     tabindex=-1 提升 + contenteditable 跳过 + e.target 守卫）
//  C. 动态覆盖（MutationObserver debounce 后自动补齐）
//  D. 引入行全量锚（13 处应用/壳层 + 2 模板 + 有缺口应用必须已引入）
//  E. #242 登记一致性锚（__mdA11y 在册）

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const A11Y_SRC = read('ios-desktop/apps/_shared/a11y.js');

// #241 引入面（运行时消费方全量，采用率只增不减）
const A11Y_APPS = [
  'safari', 'messages', 'dice', 'threes', 'notes', 'game2048',
  'stocks', 'music', 'calculator', 'calendar', 'photos', 'reminders',
];

// ---------- 模块级：happy-dom 真跑 a11y.js（单次执行，setter/observer/入口全就位） ----------
new Function('window', A11Y_SRC)(window);
const enhance = window.__mdA11y.enhance;

function fresh(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}
const key = (el, k) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  el.dispatchEvent(e);
  return e;
};

// ---------- A. setter 劫持层（IDL 赋值形态） ----------
describe('v241 A：onclick setter 劫持（IDL 形态）', () => {
  it('A1 div 赋值 onclick 瞬间自动补 tabindex=0 + role=button', () => {
    const el = document.createElement('div');
    el.onclick = () => {}; // IDL 赋值（querySelectorAll 不可见的形态）
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.getAttribute('role')).toBe('button');
  });

  it('A2 原生 button 赋值 onclick 不被注入 tabindex/role', () => {
    const btn = document.createElement('button');
    btn.onclick = () => {};
    expect(btn.hasAttribute('tabindex')).toBe(false);
    expect(btn.hasAttribute('role')).toBe(false);
  });

  it('A3 IDL 形态键盘激活：Enter 触发 click（赋值形态全链路）', () => {
    const el = document.createElement('div');
    let n = 0;
    el.onclick = () => { n++; };
    expect(key(el, 'Enter').defaultPrevented).toBe(true);
    expect(n).toBe(1);
  });
});

// ---------- B. attribute 扫描层（enhance） ----------
describe('v241 B：attribute 扫描层', () => {
  it('B1 容器扫描：onclick div 补齐三件 + Enter/Space 激活 + 非原生跳过', () => {
    const host = fresh(
      '<div class="menu-item" onclick="void 0">新建标签页</div>' +
      '<button onclick="void 0">原生按钮</button>' +
      '<a href="#" onclick="void 0">链接</a>'
    );
    enhance(host);
    const d = host.children[0];
    expect(d.getAttribute('tabindex')).toBe('0');
    expect(d.getAttribute('role')).toBe('button');
    expect(d.getAttribute('aria-label')).toBe(null); // 不臆造可访问名（文本即 accname）

    let n = 0;
    d.addEventListener('click', () => n++);
    expect(key(d, 'Enter').defaultPrevented).toBe(true);
    expect(n).toBe(1);
    const sp = key(d, ' ');
    expect(sp.defaultPrevented).toBe(true); // Space 滚页禁用
    expect(n).toBe(2);

    const btn = host.children[1];
    expect(btn.hasAttribute('tabindex')).toBe(false); // 原生不误改
    expect(btn.hasAttribute('role')).toBe(false);
  });

  it('B2 settings 形态：已有 role=button + tabindex=0 不覆盖、仅补键盘激活', () => {
    const host = fresh('<div role="button" tabindex="0" onclick="void 0">列表项</div>');
    const d = host.children[0];
    enhance(host);
    expect(d.getAttribute('role')).toBe('button');
    expect(d.getAttribute('tabindex')).toBe('0');
    let n = 0;
    d.addEventListener('click', () => n++);
    key(d, 'Enter');
    expect(n).toBe(1);
  });

  it('B3 tabindex=-1（程序聚焦）提升为 0 可 Tab 达', () => {
    const host = fresh('<div tabindex="-1" onclick="void 0">隐藏卡</div>');
    enhance(host);
    expect(host.children[0].getAttribute('tabindex')).toBe('0');
  });

  it('B4 contenteditable 区内不碰（Enter 语义属编辑器）', () => {
    const host = fresh('<div contenteditable="true"><div onclick="void 0">编辑区内</div></div>');
    enhance(host);
    const inner = host.children[0].children[0];
    expect(inner.hasAttribute('tabindex')).toBe(false);
    expect(inner.hasAttribute('role')).toBe(false);
  });

  it('B5 e.target 守卫：容器内 input 按 Enter 不误触容器 click', () => {
    const host = fresh('<div onclick="void 0"><input placeholder="搜索"></div>');
    const card = host.children[0];
    enhance(host);
    let n = 0;
    card.addEventListener('click', () => n++);
    key(card.querySelector('input'), 'Enter');
    expect(n).toBe(0); // 焦点在 input，keydown 冒泡到容器但不触发
    key(card, 'Enter');
    expect(n).toBe(1); // 焦点在容器自身才触发
  });

  it('B6 幂等：二次 enhance 同元素不重复挂 keydown（click 单次）', () => {
    const host = fresh('<div onclick="void 0">菜单</div>');
    enhance(host);
    enhance(host); // 二次扫描（MutationObserver debounce 场景同型）
    const d = host.children[0];
    let n = 0;
    d.addEventListener('click', () => n++);
    key(d, 'Enter');
    expect(n).toBe(1);
  });
});

// ---------- C. 动态覆盖（MutationObserver + debounce） ----------
describe('v241 C：动态渲染覆盖', () => {
  it('C1 DOMContentLoaded 后插入的 onclick div 由 observer 自动补齐', async () => {
    const el = document.createElement('div');
    el.setAttribute('onclick', 'void 0');
    el.textContent = '动态卡片';
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 250)); // debounce 120ms + observer 微任务
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.getAttribute('role')).toBe('button');
    el.remove();
  }, 5000);
});

// ---------- D. 引入行全量锚（采用率只增不减） ----------
describe('v241 D：引入行全量锚', () => {
  const shell = read('ios-desktop/index.html');

  it('D1 壳层 + 12 应用引入行在位（≥13 只增不减）', () => {
    expect(shell).toContain('_shared/a11y.js');
    let count = 0;
    for (const a of A11Y_APPS) {
      const src = read(`ios-desktop/apps/${a}/index.html`);
      expect(src).toContain('_shared/a11y.js');
      count++;
    }
    expect(count).toBeGreaterThanOrEqual(12);
  });

  it('D2 脚手架模板默认引入（新应用天然达标）', () => {
    expect(read('scripts/app-template.html')).toContain('_shared/a11y.js');
    expect(read('scripts/app-template-multi/index.html')).toContain('_shared/a11y.js');
  });

  it('D3 有 attribute 形态 onclick 缺口的应用必须已引入 a11y（防新缺口游离）', () => {
    // v11.28 标签级实测：有缺口的应用集合必须被引入面覆盖（js/apps/*.js 的 DOM 在壳层）
    const gapApps = new Set();
    const appsDir = join(ROOT, 'ios-desktop/apps');
    for (const app of readdirSync(appsDir)) {
      const p = join(appsDir, app, 'index.html');
      if (!existsSync(p)) continue;
      const src = readFileSync(p, 'utf-8');
      for (const m of src.matchAll(/<(\w+)([^>]*\bonclick=)[^>]*>/g)) {
        if (!m[0].includes('tabindex')) { gapApps.add(app); break; }
      }
    }
    for (const a of gapApps) {
      expect(A11Y_APPS).toContain(a); // 新应用出现缺口必须先补引入行（门禁锚）
    }
  });

  it('D4 a11y.js 头注与三层结构在位（防误删降级）', () => {
    expect(A11Y_SRC).toContain('#241');
    expect(A11Y_SRC).toContain('__mdA11y');
    expect(A11Y_SRC).toContain('MutationObserver');
    expect(A11Y_SRC).toContain('HTMLElement.prototype');
    expect(A11Y_SRC).toContain("querySelectorAll('[onclick]')");
  });
});

// ---------- E. #242 登记一致性锚 ----------
describe('v241 E：__mdA11y 全局登记锚', () => {
  it('E1 __mdA11y 在 docs/globals-registry.json 在册（#242 构建闸一致性）', () => {
    const reg = JSON.parse(read('docs/globals-registry.json'));
    expect(Object.keys(reg.names)).toContain('__mdA11y');
  });
});
