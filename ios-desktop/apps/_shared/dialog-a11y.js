/*! md3 dialog-a11y v1 —— #241 建议2 弹层三件套单源（R124 窗 · Job 2931605）
 *  三件套：①Esc 可关（栈式 topmost，后开先关）②焦点陷阱（Tab/Shift+Tab 在层内环循环）
 *  ③焦点恢复（open 簿记 opener，close 还原焦点至打开者）。
 *  设计约束：
 *  - IIFE 零依赖零新增全局外泄面：仅 window.__mdDialogA11y 一个登记面（#242 登记闸口径）；
 *  - 显式 open/close 簿记：跟随各应用既有开合函数接线（open(layer,{onClose}) / close(layer)），
 *    不劫持 DOM 原型、不做全局扫描（与 _shared/a11y.js v10.51 键盘自动增强分层零双写——
 *    本模块只管弹层生命周期，不补 tabindex/role 语义）；
 *  - 幂等：close 对未簿记层零副作用（Esc 已弹出后应用内 close 再调安全）；open 对已簿记层
 *    不重复压栈不覆盖原 opener；
 *  - 消费边界：keydown 捕获阶段仅当栈非空才消费 Escape/Tab——未接线应用（自带 Esc 处理的
 *    messages/translate/calendar 等）栈空零干扰，已开层内 Escape 阻断冒泡防「关弹层+关抽屉」
 *    双路径同帧（v10.93 keyboard-activate.js 交互后代不代触发同律）。
 *  首批接线（#241 建议2，弹层 DOM 在库但零 Escape 处理八家核查后七家实施）：
 *  game2048(#modal) / dice(#stats-screen·#settings-screen) / threes(四 modal) /
 *  stocks(#stockDetailOverlay) / camera(#mediaModal) / reminders(#task-modal·#group-modal) /
 *  safari(#menu)；phone 经复核无弹层 DOM 不适用（诚实留痕，交付帖披露）。
 */
(function () {
  'use strict';
  if (window.__mdDialogA11y) return; // 幂等装载（多脚本/重复引入防双簿记）
  var stack = []; // [{layer, onClose, opener}]，栈顶 = 最后打开

  function entryOf(layer) {
    for (var i = stack.length - 1; i >= 0; i--) {
      if (stack[i].layer === layer) return { entry: stack[i], index: i };
    }
    return null;
  }

  function isFocusable(el) {
    if (!el || el.disabled) return false;
    if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden')) return false;
    if (el.tagName === 'INPUT' && el.type === 'hidden') return false;
    return true;
  }

  /* 焦点候选：原生可聚焦 + 显式 tabindex/role 语义面（与 a11y.js 语义补齐层天然协同：
     其补的 role=button+tabindex=0 元素在本模块同样可入环） */
  function focusables(layer) {
    return Array.prototype.filter.call(
      layer.querySelectorAll(
        'button, [href], input, select, textarea, summary, [tabindex], [role="button"], [role="menuitem"], [role="switch"], [role="option"]'
      ),
      isFocusable
    );
  }

  function focusEl(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }

  /* open(layer, opts)：弹层打开时簿记。opts.onClose = 应用自己的关闭函数（Esc 路径回调）。
     自动聚焦层内首个可聚焦元素（读屏/键盘用户落点；应用显式 focus 在其后调用者自然胜出） */
  function open(layer, opts) {
    opts = opts || {};
    if (!layer || entryOf(layer)) return false; // 已簿记幂等
    var opener = document.activeElement;
    stack.push({
      layer: layer,
      onClose: typeof opts.onClose === 'function' ? opts.onClose : null,
      opener: opener && opener !== document.body ? opener : null
    });
    var f = focusables(layer);
    if (f.length) focusEl(f[0]);
    return true;
  }

  /* close(layer)：簿记出栈 + 焦点还原。不碰 DOM 显隐（应用自己的 classList 路径负责）。
     幂等：未簿记层返回 false 零副作用 */
  function close(layer) {
    var found = entryOf(layer);
    if (!found) return false;
    stack.splice(found.index, 1);
    focusEl(found.entry.opener && found.entry.opener.isConnected ? found.entry.opener : null);
    return true;
  }

  function topmost() { return stack.length ? stack[stack.length - 1] : null; }
  function size() { return stack.length; }

  document.addEventListener('keydown', function (e) {
    var top = topmost();
    if (!top) return; // 栈空零干扰（未接线应用自带 Escape 处理不受影响）
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      e.stopPropagation(); // 捕获阶段消费：防「Esc 关弹层」与壳层/应用其他 Esc 链路双路径同帧
      var entry = stack.pop();
      focusEl(entry.opener && entry.opener.isConnected ? entry.opener : null);
      if (entry.onClose) entry.onClose(); // 应用自己的关闭函数（其内部 close(layer) 幂等）
      return;
    }
    if (e.key === 'Tab') {
      var list = focusables(top.layer);
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      var active = document.activeElement;
      var inside = top.layer.contains(active);
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        focusEl(last);
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        focusEl(first);
      }
    }
  }, true);

  window.__mdDialogA11y = { open: open, close: close, topmost: topmost, size: size, _stack: stack };
})();
