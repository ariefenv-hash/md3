/* ==================== idle-slider.js — 怠速柄滑条 --p 同步助手（#227 单源化配套） ====================
 * 职责唯一：把每个 .mdslider 的 value/min/max 换算为已填充百分比并写入 CSS 变量 --p，
 * 供 idle-slider.css 的 WebKit 轨道双色渐变消费（Firefox 走 -moz-range-progress 原生
 * 填充，不依赖 --p）。轨道、拇指等全部视觉规范在 idle-slider.css，本文件不写任何样式。
 *
 * 三条同步通道：
 *   ① 载入即全量同步（DOMContentLoaded 就绪前后两种时机都覆盖）；
 *   ② document 级 input 事件委托 —— 用户拖动零接线自动同步；
 *   ③ window.__idleSlider.sync(el) —— JS 程序化改 value 的应用（music / pdf /
 *      photos / radio 等）在改值后显式调用，与 #233 lane 声明的最小接线面一致。
 * 经典脚本（非 ESM）：单文件应用 index.html 与多文件应用均可 <script src> 直引。
 * ============================================================ */
(function () {
  'use strict';

  function sync(el) {
    if (!el || el.type !== 'range') return;
    var min = Number(el.min);
    var max = Number(el.max);
    if (Number.isNaN(min)) min = 0;
    if (Number.isNaN(max) || max === min) max = min + 100;
    var v = Number(el.value);
    if (Number.isNaN(v)) v = min;
    var pct = ((v - min) / (max - min)) * 100;
    pct = Math.max(0, Math.min(100, pct));
    el.style.setProperty('--p', pct.toFixed(2) + '%');
  }

  function syncAll(root) {
    var scope = root || document;
    var list = scope.querySelectorAll('input[type="range"].mdslider');
    for (var i = 0; i < list.length; i++) sync(list[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { syncAll(); });
  } else {
    syncAll();
  }

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t && t.tagName === 'INPUT' && t.type === 'range' && t.classList.contains('mdslider')) {
      sync(t);
    }
  });

  window.__idleSlider = { sync: sync, syncAll: syncAll };
})();
