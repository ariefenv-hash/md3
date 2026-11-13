// ==================== settings-core.js — 设置应用纯函数核（#286 续 · ref-only 补提取首批 · v11.22） ====================
//
// 职责：settings.js（js/apps/settings.js，native 巨石 5989 行）各 PAGE_SCRIPT 内联脚本的
//   纯逻辑真身——通知锁屏摘要三态 / 会话判定 / 相对时间（AOSP StringUtil.formatRelativeTime
//   LONG zh 语义）/ 屏幕超时档位（getTimeoutSummary「闲置 %1$s后」语义）/ 运行时长 /
//   位置权限摘要 / 伪装种子哈希（djb2 变体）。
//   内联 <script>（reactivateScripts 主文档全局作用域执行，非 ESM，无法访问模块作用域）
//   经 window.__settingsCore 桥消费同一份——与 __setSwitchChecked / __bindAppDocListener
//   window 桥惯例同构；vitest 侧用 new Function 沙箱提取（fx-core.js 先例同范式）。
//
// ⚠ 模块形态：**经典脚本 IIFE（无 export）**——settings.js 以副作用导入加载（data-backup.js
//   先例），零依赖，保证测试侧 new Function('window', SRC) 可直接执行提取。
//
// 车道：#286 ref-only 候补池首批 settings 域。零行为变化——内联原实现整体搬移，调用方
//   等值换算（依赖闭包的 fmtUptime/fmtAppPermSummary/timeoutSummary 参数化，内联 wrapper
//   原样传参）。native 巨石重构（DashboardFragment 拆分等）不在本车道（§7.5 边界自查）。

(function () {
  'use strict';

  // ==================== 通知页（NOTIF_PAGE_SCRIPT 原实现整体搬移） ====================
  /** 会话通知判定：category 含 conversation/会话（不区分大小写）→ true；空值防御 */
  function isConvo(n) { return !!(n && n.category && /conversation|会话/i.test(n.category)); }
  /** getSummaryResource() 三态语义：!show → disable；allowPrivate → show；else hide */
  function lockSummary(s) {
    return !s.lockScreenShow ? '完全不显示通知'
      : s.allowPrivate ? '显示所有通知内容' : '仅在解锁状态下显示敏感内容';
  }

  // ==================== 显示页（DISPLAY_PAGE_SCRIPT 原实现整体搬移） ====================
  /** 超时档位表（原内联 TIMEOUT_LABELS 原样上移；键为毫秒） */
  var TIMEOUT_LABELS = { 15000: '15 秒', 30000: '30 秒', 60000: '1 分钟', 120000: '2 分钟', 300000: '5 分钟', 600000: '10 分钟', 1800000: '30 分钟' };
  /** getTimeoutSummary 语义：screen_timeout_summary「闲置 %1$s后」；未知档位回落 '1 分钟' */
  function timeoutSummaryFrom(timeout) {
    return '闲置 ' + (TIMEOUT_LABELS[timeout] || '1 分钟') + '后';
  }

  // ==================== 关于页（ABOUT_PAGE_SCRIPT 原实现整体搬移） ====================
  /**
   * 伪装种子哈希：djb2 变体 |0 截断 + Math.abs——同一输入恒同一输出
   * （E2E 双次刷新一致性断言的确定性来源）；null/undefined 强制 String → ''
   */
  function dHash(s) {
    var h = 5381; s = String(s == null ? '' : s);
    for (var i = 0; i < s.length; i++) { h = (((h << 5) + h) + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }
  /** 正常运行时间（参数化 ms；内联 wrapper 传 performance.now()）：≥1h 小时+分钟 / ≥1min 分钟 / 否则秒 */
  function fmtUptime(ms) {
    var min = Math.floor(ms / 60000);
    var h = Math.floor(min / 60);
    if (h >= 1) return h + ' 小时 ' + (min % 60) + ' 分钟';
    if (min >= 1) return min + ' 分钟';
    return Math.floor((ms % 60000) / 1000) + ' 秒';
  }

  // ==================== 位置页（LOCATION_PAGE_SCRIPT 原实现整体搬移） ====================
  /** StringUtil.formatRelativeTime LONG zh 语义映射：<1 刚刚 / <60 分钟 / <1440 小时 / 天 */
  function relTime(mins) {
    if (mins < 1) return '刚刚';
    if (mins < 60) return mins + ' 分钟前';
    if (mins < 1440) return Math.floor(mins / 60) + ' 小时前';
    return Math.floor(mins / 1440) + ' 天前';
  }
  /** 位置权限摘要（参数化：内联 wrapper 传 RECENT.length / TOTAL_APPS）：
   *  disabled → 服务关闭文案；enabled → 「N 个应用（共 M 个应用）有权获取位置信息」 */
  function fmtAppPermSummary(s, recentCount, totalApps) {
    if (!s.enabled) return '位置信息服务已关闭';
    return recentCount + ' 个应用（共 ' + totalApps + ' 个应用）有权获取位置信息';
  }

  // ==================== 出口（window 桥；Node 沙箱 / 浏览器双域零崩） ====================
  var core = {
    isConvo: isConvo,
    lockSummary: lockSummary,
    timeoutSummaryFrom: timeoutSummaryFrom,
    TIMEOUT_LABELS: TIMEOUT_LABELS,
    dHash: dHash,
    fmtUptime: fmtUptime,
    relTime: relTime,
    fmtAppPermSummary: fmtAppPermSummary,
  };
  if (typeof window !== 'undefined') window.__settingsCore = core;
})();
