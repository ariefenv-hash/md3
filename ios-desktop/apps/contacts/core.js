/* contacts/core.js — 通讯录纯数据契约与纯函数（#286 续 ref-only 第十批补 core 提取）
 * 范式：photos/core.js 同款经典 IIFE（零依赖、零 export），经 window.__contactsCore 桥自注册；
 * index.html 以 <script src="./core.js"> 同步先于主内联脚本加载，纯函数单源消费。
 * 仅承载无 DOM 副作用的常量与纯函数：localStorage/VFS 备份/深链 openApp/DOM 渲染留 index.html
 * （hueOf 内联双实现退役单源化；cardRipple 承载 tile-bounce 同构按压衰减数学核，索引遍历留 host）。 */
(function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : globalThis;

  // #181 ⑤ 密度滑条量程（与 index.html <input min/max> 属性同源）：--p 同步与 localStorage 回读钳制共用
  var DENSITY_RANGE = { min: 0.85, max: 1.3 };

  // 滑条 --p 几何：值域线性映射到 0..100%（toFixed(1) 字符串化，宿主直接 setProperty）
  function densitySliderPct(v) { return (((v - DENSITY_RANGE.min) / (DENSITY_RANGE.max - DENSITY_RANGE.min)) * 100).toFixed(1) + '%'; }

  // 头像配色：前景恒定深紫，背景 hsl(hue,60%,85%) 的 hue 由姓名码点和单源给出
  var AVATAR_FG = '#21005D';
  function hueOf(name) { return Array.from(name).reduce(function (a, b) { return a + b.charCodeAt(0); }, 0) % 360; }

  // 搜索过滤：trim + 小写归一，姓名与电话双通道 includes（空串全量通过）
  function filterContacts(list, filter) {
    var f = String(filter == null ? '' : filter).trim().toLowerCase();
    return list.filter(function (c) { return c.name.toLowerCase().includes(f) || c.phone.includes(f); });
  }

  // #181 ⑤ 卡片纵向按压联动衰减数学核（tile-bounce 同构轻量版）：d=|i-oi| 距离，dir=±1 方向位
  // 自身 d=0 压缩 0.97/圆角 +8/置顶；邻项按 0.45 步进衰减让位，d≥3（f 封底 0）完全复位
  var RIPPLE_CARD_R = 16;
  function cardRipple(d, dir) {
    var f = d === 0 ? 1 : Math.max(0, 1 - d * 0.45);
    var sc = d === 0 ? 0.97 : 1 - 0.02 * f;
    var shift = d === 0 ? 0 : dir * 2 * f;
    return {
      shift: shift,
      sc: sc,
      radius: d === 0 ? RIPPLE_CARD_R + 8 : RIPPLE_CARD_R - 4 * f,
      z: d === 0 ? '1' : ''
    };
  }

  // 首启种子模板（load 空表回落；id 时间源留 host 补）
  var SEED_CONTACT = { name: '设计指南', phone: '10086', email: 'md3@google.com', note: 'Material Design 3' };

  root.__contactsCore = {
    DENSITY_RANGE: DENSITY_RANGE,
    densitySliderPct: densitySliderPct,
    AVATAR_FG: AVATAR_FG,
    hueOf: hueOf,
    filterContacts: filterContacts,
    RIPPLE_CARD_R: RIPPLE_CARD_R,
    cardRipple: cardRipple,
    SEED_CONTACT: SEED_CONTACT
  };
})();
