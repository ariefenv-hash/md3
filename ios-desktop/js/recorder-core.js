// ==================== recorder-core.js — 录音机应用纯函数核（#286 续 · ref-only 补提取第十二批 · v11.27） ====================
//
// 职责：recorder.js（js/apps/recorder.js，native 模块渲染型）内联脚本的纯逻辑真身——
//   字节格式化 / 秒表格式化 / 日期展示 / 路径名与扩展名工具。
//   内联 <script>（实例创建期才执行，主文档全局作用域）经 window.__recorderCore 桥消费同一份，
//   与 window.__filesCore 桥（files-core.js 先例）/ #240 escapeHtml 单源委托同构；
//   vitest 侧用 new Function 沙箱提取（v286 filesCore A 组先例同范式）。
//
// ⚠ 模块形态：**经典脚本 IIFE（无 export）**——recorder.js 以副作用导入加载（files-core.js
//   先例：加载即自注册 window.__recorderCore），零依赖（不 import 任何模块），保证测试侧
//   new Function('window', SRC) 可直接执行提取。
//
// 车道：#286 ref-only 候补池第十二批（R147 窗 · 2026-11-10 00:00 槽 · Job 2931605 第 3 系列 ·
//   认领帖 6744843097 先于动工；flow11 第十一批让位对侧认领 6744747236 在先）。零行为变化——
//   内联原实现整体搬移，调用点不变。
//
// ⚠ 与 filesCore 同名三函数契约差异（跨域委托 vs 自有轻量核裁决依据，裁决=自有轻量核）：
//   - extOf：本核返回**带点且保留大小写**（'song.mp3' → '.mp3'、'IMG.JPG' → '.JPG'、'.bashrc' → ''），
//     filesCore 返回**无点小写**（'IMG.JPG' → 'jpg'）——两域消费面语义不同（recorder 分享/删除
//     对话框展示原始扩展名；files 分类映射吃无点小写形），跨域委托将改语义，违反「测的即运行
//     真身 / 原样上移」纪律；
//   - fmtBytes：本核三档（B/KB/MB，录音文件量级不触及 GB，1073741824 → '1024.00 MB'），
//     filesCore 四档含 GB（同输入 → '1.00 GB'）且首档走 __storageStats 窗口桥——桥依赖与 GB 档
//     均为 files 域专属行为；
//   - baseName：两域逐字符同义（唯一真同义项），随本核走零耦合；
//   - esc 留 host（#240 __mdEscape 单源委托在案，负向锚 tests/v240）；elapsedMs 吃运行态
//     （recElapsedBase/recRunStart）留 host；toast/DOM 桥留 host。
//   - fmtDate 为 now 注入参数化（calendarCore isToday 先例同律）：host 调用点 fmtDate(ts) 不变，
//     ts 缺省回落 Date.now() 语义逐字保留（now 形参仅测试注入用）。

(function () {
  'use strict';

  // ==================== 字节格式化（原 recorder.js 内联实现原样上移，逐字符等值） ====================
  // 三档：B / KB / MB。非法输入（0/负/null/undefined）归 '0 B'。
  function fmtBytes(b) {
    if (!b || b < 0) return '0 B';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }

  // ==================== 秒表格式化（mm:ss 十进制补零；负值归零/小数截断/缺省归零） ====================
  function fmtSec(s) {
    s = Math.max(0, Math.floor(s || 0));
    var m = Math.floor(s / 60), r = s % 60;
    return (m < 10 ? '0' + m : m) + ':' + (r < 10 ? '0' + r : r);
  }

  // ==================== 日期展示（zh-CN 月/日 时:分；now 注入参数化，ts 缺省回落语义保留） ====================
  function fmtDate(ts, now) {
    try { return new Date(ts || now || Date.now()).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  }

  // ==================== 路径名与扩展名（原内联实现原样上移，逐字符等值） ====================
  function baseName(p) { return p.slice(p.lastIndexOf('/') + 1); }
  function extOf(name) {
    var i = name.lastIndexOf('.');
    return i > 0 ? name.slice(i) : '';
  }

  // ==================== 出口（window 桥；Node 沙箱 / 浏览器双域零崩） ====================
  var core = {
    fmtBytes: fmtBytes,
    fmtSec: fmtSec,
    fmtDate: fmtDate,
    baseName: baseName,
    extOf: extOf,
  };
  if (typeof window !== 'undefined') window.__recorderCore = core;
})();
