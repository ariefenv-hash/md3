// ==================== stocks core — #286 续车道 ref-only 第八批补 core 提取（v11.29 · Job 2932311 · 第 1 定时消息系列） ====================
// 范式：photos/core.js 同款经典 IIFE（零依赖零 export，经典脚本先于主内联同步加载）。
// 真源边界：仅收纳纯函数与常量（腾讯行情符号三段映射 / 模拟行情五字段数学核 / 双态色值组 /
// 涨跌徽章类名与符号前缀）；JSONP fetch、localStorage 偏好、DOM 渲染与 CSS 变量写入留
// index.html 内联（host 侧职责）。
// 消费契约：index.html 经 window.__stocksCore.* 委托调用；tests/v286 Q 组沙箱提取真身直连（测的即运行真身非孤立副本）。
(function () {
  'use strict';

  // 腾讯财经行情查询参数组织（id 前缀三段映射：sh/sz → s_<id>；hk/us → s_<前缀><code>；其余 null）
  function getTencentSymbol(s) {
    if (s.id.startsWith('sh') || s.id.startsWith('sz')) {
      return 's_' + s.id;
    } else if (s.id.startsWith('hk')) {
      return 's_hk' + s.code;
    } else if (s.id.startsWith('us')) {
      return 's_us' + s.code;
    }
    return null;
  }

  // 模拟真实自然市场微小浮动（±0.8% 级）五字段行情构造：seed 由调用方给
  // （原实现 seed = Math.sin(now.getTime()/10000 + basePrice) × 0.015，时间源留 host 侧）。
  // price/change/pct 三级 Number+toFixed(2) 与 amount 0.85 折算亿单位、isUp 判定逐语义等价。
  function simQuote(s, seed) {
    var price = Number((s.basePrice * (1 + seed)).toFixed(2));
    var change = Number((price - s.basePrice).toFixed(2));
    var pct = Number(((change / s.basePrice) * 100).toFixed(2));
    return {
      price: price,
      change: change,
      pct: pct,
      amount: (s.basePrice * 0.85).toFixed(1) + '亿',
      isUp: change >= 0
    };
  }

  // 双态色值组（applyColorRule CSS 变量四值对）：红涨绿跌态与绿涨红跌态互换
  var COLOR_RED_UP = { up: '#ef4444', down: '#10b981', upBg: 'rgba(239, 68, 68, 0.15)', downBg: 'rgba(16, 185, 129, 0.15)' };
  var COLOR_GREEN_UP = { up: '#10b981', down: '#ef4444', upBg: 'rgba(16, 185, 129, 0.15)', downBg: 'rgba(239, 68, 68, 0.15)' };

  // 涨跌徽章类名（renderIndices/renderStockList 双消费点）
  function upBadgeClass(isUp) {
    return isUp ? 'price-badge-up' : 'price-badge-down';
  }

  // 涨跌符号前缀（正数显 +，负数自带 - 号）
  function signPrefix(isUp) {
    return isUp ? '+' : '';
  }

  window.__stocksCore = {
    getTencentSymbol: getTencentSymbol,
    simQuote: simQuote,
    COLOR_RED_UP: COLOR_RED_UP,
    COLOR_GREEN_UP: COLOR_GREEN_UP,
    upBadgeClass: upBadgeClass,
    signPrefix: signPrefix,
  };
})();
