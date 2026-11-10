/* ==================== a11y.js — 键盘可达性自动增强（v11.09 #241） ====================
 *
 * 背景：#241 量化盘点（审计基线 v10.36 报告 docs/audits/2026-11-07-多维度评审
 * 报告.md）——iframe 应用大量 `div onclick` 不可 Tab 聚焦、不可 Enter 触发、
 * 读屏不可见。v11.09 复测（标签级正则，含字符串模板）：
 *   ① HTML 属性形态 `onclick="…"` 104 处（safari 28 / messages 20 / dice 14 /
 *      mail.js 10 / threes 5 / notes 4 / appstore 4 / map 4 / music 3 /
 *      settings 3 / game2048 2 / stocks 2 / facetime 2 / health 1 / wallet 1 /
 *      music.html 1）；
 *   ② JS 赋值形态 `el.onclick = fn` 125 处（calculator 31 / music 27 /
 *      files.js 25 / calendar 19 / photos 16 / reminders 4 / game2048 2 /
 *      notes 1 / threes 1）——IDL 赋值不反射 content attribute，
 *      querySelectorAll('[onclick]') 对其不可见，只能运行时层覆盖。
 * 另 settings.js 已带 role="button" tabindex="0" 的 26 处 onclick 容器
 * 缺 Enter/Space 激活，一并由此收敛。
 *
 * 三层增强（应用代码零改动，head 一行引入即全量覆盖）：
 *   ① attribute 形态：DOMContentLoaded 首扫 + MutationObserver 动态覆盖
 *      （debounce 120ms 合并渲染风暴；happy-dom 与旧浏览器无 observer 时
 *      自动降级，仅首扫）；
 *   ② IDL 赋值形态：HTMLElement.prototype.onclick setter 劫持——赋值瞬间
 *      自动增强该元素（原生元素天然跳过，div/span 自动补齐）；
 *   ③ 显式入口：window.__mdA11y.enhance(root)（应用渲染新列表后可主动调；
 *      测试真跑入口；#242 全局登记面）。
 *
 * 单元素增强规则（_patch）：
 *   - 原生可激活元素（A/BUTTON/INPUT/SELECT/TEXTAREA/LABEL/DETAILS/SUMMARY/
 *     VIDEO/AUDIO）自带 Tab 聚焦与 Enter/Space 激活语义，一律跳过；
 *   - tabindex 缺失或为负 → 置 0（#241 主断言「不可 Tab 聚焦」硬缺口）；
 *   - 无 role 才补 role="button"（settings.js 等已自带 role=button 不覆盖；
 *     可访问名来自元素内文本，不臆造 aria-label）；
 *   - keydown Enter/Space → click()：preventDefault 禁 Space 滚页；
 *     e.target 守卫——焦点在容器内输入框时 Enter 不误触外层容器（对齐
 *     原生 button 行为）；修饰键组合不劫持；
 *   - contenteditable 区内不碰（Enter 语义属编辑器）。
 *
 * 幂等：WeakSet 防重复挂 keydown；扫描重复触发与 setter 双层触发均无副作用。
 * 边界（诚实留点）：SVGElement.prototype.onclick 不在劫持面（svg 交互元素
 * 键盘语义另案）；Escape 关弹层 / 焦点陷阱 / 焦点恢复三件套已随建议 2 落地
 * 为 _shared/dialog-a11y.js（v11.09 单源 __mdDialogA11y，消费方 game2048/
 * dice/threes/stocks/camera/reminders/safari 七应用——R124 窗 Job 2931605
 * 在先交付，Job 2932311 同车道双写让位合流）；棋盘 aria-grid + 方向键走子
 * 已随建议 3 落地（v10.52）；cloneNode 复制的元素若未重新赋 onclick 不会
 * 触发 setter（attribute 形态首扫/observer 兜底）。
 *
 * 消费方：壳层 index.html（js/apps/ 八文件 + folder.js/files.js/main.js 渲染面）
 *        + apps/{safari,messages,dice,threes,notes,game2048,stocks,music,
 *        calculator,calendar,photos,reminders} 十二应用。
 */
(function () {
  'use strict';

  var NATIVE = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|LABEL|DETAILS|SUMMARY|VIDEO|AUDIO)$/i;
  var bound = new WeakSet();

  function patch(el) {
    if (!el || !el.tagName || NATIVE.test(el.tagName)) return;
    if (el.closest && el.closest('[contenteditable="true"]')) return;
    // ① 可 Tab 聚焦：缺失或负值（-1 程序聚焦也不可 Tab 达）一律置 0
    var ti = el.getAttribute('tabindex');
    if (ti === null || Number(ti) < 0) el.setAttribute('tabindex', '0');
    // ② 读屏语义：已有 role 不覆盖（settings.js role=button 形态 / 特殊语义）
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    // ③ 键盘激活：Enter / Space → click（幂等挂载）
    if (!bound.has(el)) {
      bound.add(el);
      el.addEventListener('keydown', function (e) {
        if (e.target !== el) return; // 焦点在容器内 input 时 Enter 不误触
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        if (typeof el.click === 'function') el.click();
      });
    }
  }

  function enhance(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var els = scope.querySelectorAll('[onclick]');
    for (var i = 0; i < els.length; i++) patch(els[i]);
  }

  // ② IDL 赋值形态：setter 劫持（SVGElement 不在面，见头注边界）
  try {
    var desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'onclick');
    if (desc && desc.set) {
      Object.defineProperty(HTMLElement.prototype, 'onclick', {
        get: desc.get,
        set: function (fn) {
          try { if (typeof fn === 'function') patch(this); } catch (err) { /* 增强失败不阻断业务赋值 */ }
          desc.set.call(this, fn);
        },
        configurable: true,
        enumerable: desc.enumerable,
      });
    }
  } catch (err) { /* 极端冻结环境降级为仅扫描层 */ }

  // ① attribute 形态：首扫 + 动态渲染覆盖
  window.__mdA11y = { enhance: enhance };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { enhance(document); });
  } else {
    enhance(document);
  }
  if (typeof MutationObserver !== 'undefined') {
    var t = 0;
    new MutationObserver(function () {
      clearTimeout(t);
      t = setTimeout(function () { enhance(document); }, 120);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
