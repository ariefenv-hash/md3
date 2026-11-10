// ==================== installer-core.js — 安装包应用纯函数核（#286 续 · ref-only 补提取第十三批 · v11.13） ====================
//
// 职责：installer.js（js/apps/installer.js，native 模块渲染型）内联脚本的纯逻辑真身——
//   三档字节格式化 / 回退图标常量 / 图标盒与权限盾形契约串 / 空态块组装（esc 注入参数化）。
//   内联 <script>（page-stack.activatePageScripts 激活期执行，主文档全局作用域）经
//   window.__installerCore 桥消费同一份，与 window.__recorderCore 桥（recorder-core.js
//   第十二批先例）/ window.__filesCore 桥同构；vitest 侧用 new Function 沙箱提取
//   （v286 filesCore A 组先例同范式）——测的即运行真身非孤立副本。
//
// ⚠ 模块形态：**经典脚本 IIFE（无 export）**——installer.js 以副作用导入加载（recorder-core.js
//   先例：加载即自注册 window.__installerCore），零依赖（不 import 任何模块），保证测试侧
//   new Function('window', SRC) 可直接执行提取。
//
// 车道：#286 ref-only 候补池第十三批（R148 窗 · 2026-11-10 02:00 槽 · Job 2933040 第 2 系列 ·
//   认领帖 6747754568 先于动工；三查：#286 全量 39 帖 REST 实查零在途零锁 + HANDOFF 覆写三十九
//   claims 表空 + ls-remote=b9aec4b 基线 6032·318 前台实跑全绿）。零行为变化——内联原实现整体
//   搬移，调用点不变（唯一签名变化=emptyBlock esc 注入参数化，calendarCore isToday now 注入
//   同律，宿主三空态常量调用点等值换算传本域 esc）。
//
// ⚠ 与 recorderCore fmtBytes 契约差异（跨域委托否决依据，裁决=自有轻量核）：
//   - fmtSize：本核 null/undefined → ''（空串，zip 体量占位不渲染）；recorderCore fmtBytes
//     null/undefined → '0 B'（录音时长占位归零语义）——同输入不同输出，两域消费面语义不同，
//     跨域委托将改语义，违反「测的即运行真身 / 原样上移」纪律；
//   - fmtSize 首档无归零钳制（b + ' B' 原值直拼，负数原样 '-5 B'），recorderCore fmtBytes
//     负值归 '0 B'——档界同构（1024/1048576 判界、KB/MB toFixed(1)）但钳制语义域归属各异；
//   - 命名差异本身即域语义（fmtSize=包体量展示 / fmtBytes=录音体量展示），随本核走零耦合。
//
// 宿主保留面（非纯函数域，不入核）：esc（#240 __mdEscape 单源同款实现，宿主域内联保留）/
//   snack（DOM 写+定时器+__m3eLoader 桥）/ onDesktop·syncTabs（DOM 查询）/ render·renderPending·
//   renderInstalled·openSheet·askUninstall（innerHTML 组装+DOM 写，吃 S 运行态）/
//   copyPrompt·fallbackCopy（clipboard IO）/ importFiles·doInstall·doUninstall
//   （__pkgInstallerAPI IO）——emptyBlock 依赖 esc，注入参数化后入核。
//
// 出口（5）：fmtSize / FALLBACK_ICON / iconBox / permIconSVG / emptyBlock

(function () {
  'use strict';

  // ==================== 三档字节格式化（v7.52 原内联实现原样上移，逐字符等值） ====================
  // null/undefined → '' 空串占位；<1024 → 原值直拼 ' B'；<1048576 → KB toFixed(1)；否则 MB toFixed(1)。
  function fmtSize(b) {
    if (b == null) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  // ==================== 回退图标常量（v7.52 原内联实现原样上移，逐字符等值） ====================
  // 包未携带 icon（manifest.icon 缺省回退链 favicon→系统默认图之前的前端占位）时的默认徽标 SVG。
  var FALLBACK_ICON = '<svg viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 8) 40% 46%)"/><path d="M30 40 L50 28 L70 40 L70 62 L50 74 L30 62 Z" fill="#FFFFFF" opacity="0.92"/></svg>';

  // ==================== 图标盒组装（v7.52 原内联实现原样上移，逐字符等值） ====================
  // iconHTML 空值回退 FALLBACK_ICON 的纯串选择函数（|| 短路：''/null/undefined 均回退）。
  function iconBox(iconHTML) {
    return '<div class="pkg-ic">' + (iconHTML || FALLBACK_ICON) + '</div>';
  }

  // ==================== 权限盾形 SVG（v7.52 原内联实现原样上移，逐字符等值） ====================
  // 安装确认单权限行前缀常量契约串（零参数零分支，值恒定）。
  function permIconSVG() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  }

  // ==================== 空态块组装（v7.52 原内联实现原样上移 + esc 注入参数化） ====================
  // escFn 由宿主注入（本域 esc 实现 #240 __mdEscape 同款），核侧零 DOM 零 IO——
  //   calendarCore isToday now 注入 / recorderCore fmtDate now 注入先例同律。
  function emptyBlock(escFn, iconPath, title, sub) {
    return '<div class="pkg-empty"><div class="pkg-empty-ic"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + iconPath + '</svg></div>'
      + '<div class="pkg-empty-t">' + escFn(title) + '</div><div class="pkg-empty-s">' + escFn(sub) + '</div></div>';
  }

  // ==================== 出口（window 桥；Node 沙箱 / 浏览器双域零崩） ====================
  var core = {
    fmtSize: fmtSize,
    FALLBACK_ICON: FALLBACK_ICON,
    iconBox: iconBox,
    permIconSVG: permIconSVG,
    emptyBlock: emptyBlock,
  };
  if (typeof window !== 'undefined') window.__installerCore = core;
})();
