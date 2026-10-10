// ==================== visibility-heal.js — 切后台回前台渲染自愈（v7.57 · issue #8） ====================
//
// 议题 #8 实测故障（截图 2）：应用在前台时退到 Android 后台再回来 ——
// 壁纸四周露白边（桌面层 scale(0.95) 中间态未恢复）+ 桌面图标/页点/ glance 全部不可见
//（launch-hidden 与打开背景态残留）+ 前台应用窗口消失，只剩 Dock；再退出一次或回主页才恢复。
//
// 根因链（移动端 Chrome / WebView 页面生命周期）：
//   1. 开/关窗弹簧动画（或卡片飞行）进行中页面被切后台 → rAF 停转，弹簧钉在中间值；
//   2. 隐藏期间系统冻结页面（Page Lifecycle / 内存压力），恢复可见后 rAF 回调链
//      可能不再续跑（浏览器实现差异）—— 统一渲染循环就此死亡且无人重启；
//   3. 状态机卡死在中间态：窗口缩没（视觉=无窗口）、桌面复位动画未执行
//      （scale(0.95)+blur+launch-hidden 残留）→ 白边 + 只剩 Dock 的「半关闭」故障帧。
//
// v7.48 已修过同族故障（清空全部后桌面残留打开背景态 → restoreDesktopAfterBatchClear），
// 本模块把同一复位纪律扩展到「切后台打断」这条触发路径，并加循环心跳复活机制：
//
//   · 心跳：app-window frame() 每帧写 state._frameHeartbeat；本模块回前台双 rAF 后体检，
//     心跳超时（>600ms）即判定 rAF 链已死 → cancel 旧句柄 + startLoop() 重启 ——
//     弹簧未收敛则继续推进走完动画，已收敛则 settle 吸附 + finishAnim 完整复位（全幂等）。
//   · 残留复位：无窗口态下桌面若残留打开背景态（transform/filter/launch-hidden），
//     直接调用 v7.48 的 restoreDesktopAfterBatchClear() 复位。
//   · 可见性保险：开窗稳态下窗口本体若被系统丢弃可见性（visibility/opacity/open 类），
//     强制恢复稳态（避免「状态 isOpen 但窗口看不见」的幽灵态）。
//   · 视口自适配：回前台后 innerWidth/innerHeight 若变化（地址栏显隐/旋转），
//     派发 resize 让壁纸 canvas 等所有尺寸监听者重排（procedural-wallpaper 自带防抖重绘）。
//
// 设计约束：全部动作幂等且无副作用 —— 正常路径（rAF 链存活）下 heal 等于空操作。

import { state } from './state.js';
import { dom } from './dom.js';
import { startLoop, restoreDesktopAfterBatchClear } from './app-window.js';

/** hidden 前的视口快照（回前台比较用） */
let prevVw = 0;
let prevVh = 0;

export function initVisibilityHeal() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      prevVw = window.innerWidth || 0;
      prevVh = window.innerHeight || 0;
      return;
    }
    // 回前台：双 rAF —— 首帧浏览器可能仍在恢复渲染管线/布局，第二帧起状态才可信
    requestAnimationFrame(() => requestAnimationFrame(heal));
  });
}

/** 回前台体检（幂等：rAF 链健康 + 无残留时零操作） */
function heal() {
  const now = performance.now();

  // ---- ① 统一渲染循环复活（核心修复：白边故障的主根因） ----
  // 开/关窗动画或卡片飞行应进行中，但循环心跳死亡 ⇒ cancel + 重启。
  // 心跳健康（loopAlive）时绝不干预 —— 避免与在途动画帧竞争。
  const heartbeat = state._frameHeartbeat || 0;
  const loopAlive = !!state.rafId && heartbeat > 0 && (now - heartbeat) < 600;
  const loopNeeded = state.isOpen || state.isClosing || state.flightActive;
  if (loopNeeded && !state.isDragging && !loopAlive) {
    if (state.rafId) {
      try { cancelAnimationFrame(state.rafId); } catch (e) { /* 句柄已失效 */ }
      state.rafId = null;
    }
    try { startLoop(); } catch (e) { /* 弹簧系统异常时静默，交给 ②/③ 兜底 */ }
  }

  // ---- ② 无窗口态但桌面残留「应用打开背景态」（v7.48 同族复位纪律） ----
  // 切后台可能打断关闭动画的复位段（scale(0.95)/blur/launch-hidden 残留 = 白边 + 无图标）。
  // v7.63 扩盲（issue #8 复发）：窗口缩入后台卡片挂起的中间态（isOpen 仍真、.open 已摘）
  // 同样纳入残留体检 —— 此前 !state.isOpen 条件对挂起态全盲；recents 浮层在场时跳过
  //（挂起态本属后台语境，关场结算 settleAfterRecentsClose 负责），只在浮层已消失时兜底。
  const recentsOverlayEl = document.getElementById('recentAppsOverlay');
  const recentsActive = !!(recentsOverlayEl && recentsOverlayEl.classList.contains('active'));
  const suspendedStale = !!state.isOpen && !state.isClosing &&
    dom.appWindow && !dom.appWindow.classList.contains('open');
  if (!state.isClosing && dom.desktop && !recentsActive && (!state.isOpen || suspendedStale)) {
    const residue =
      (dom.desktop.style.transform && dom.desktop.style.transform !== '') ||
      (dom.desktop.style.filter && dom.desktop.style.filter !== '') ||
      document.querySelector('.launch-hidden');
    if (residue) {
      try { restoreDesktopAfterBatchClear(); } catch (e) { /* 复位异常不扩散 */ }
    }
  }

  // ---- ③ 开窗稳态但窗口本体可见性被系统丢弃（幽灵态保险） ----
  if (state.isOpen && !state.isClosing && !state.isDragging &&
      state.scaleSpring.target === 1 && typeof state.scaleSpring.isSettled === 'function' &&
      state.scaleSpring.isSettled() && dom.appWindow) {
    const w = dom.appWindow;
    let cs = null;
    try { cs = getComputedStyle(w); } catch (e) { /* 环境兜底 */ }
    if (!w.classList.contains('open') || (cs && cs.visibility === 'hidden') || w.style.opacity === '0') {
      if (!w.classList.contains('open')) w.classList.add('open');
      if (cs && cs.visibility === 'hidden') w.style.visibility = '';
      if (w.style.opacity === '0') w.style.opacity = '1';
    }
  }

  // ---- ④ 视口尺寸自适配（仅在实际变化时派发 resize） ----
  const vw = window.innerWidth || 0;
  const vh = window.innerHeight || 0;
  if (prevVw && prevVh && (vw !== prevVw || vh !== prevVh)) {
    try { window.dispatchEvent(new Event('resize')); } catch (e) { /* 环境兜底 */ }
  }
  prevVw = vw; prevVh = vh;

  try { window.dispatchEvent(new CustomEvent('md3-visibility-heal')); } catch (e) { /* 桥可选 */ }
}
