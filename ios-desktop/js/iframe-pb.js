// ==================== iframe-pb.js — iframe 应用「预览式返回」宿主路由器（v7.28） ====================
//
// 职责（刻意保持最小，与 overlay-registry 同样的注册表哲学）：
//   1. 监听子应用 PBNav 上报的 {type:'PB_STATE', canBack}，按 contentWindow 记账；
//   2. getActivePBTarget()：前台应用实例内查询上报过 PB 状态的 iframe —— 返回
//      {win, canBack}；手势系统与导航栏据此决定「应用内预览返回」还是「原有语义」
//      （根页缩窗关闭 / 模块应用 popSubPage）；
//   3. pbSend()：向子应用投递 PB_GESTURE（边缘手势三段转发）与 PB_TRIGGER_BACK
//      （导航栏返回键）。提交判定阈值与模块应用完全一致（位移 25% 屏宽 / 速度
//      400px/s + 30px），保证全系统返回手感统一。
//
// 生命周期：iframe 常驻内存（多任务），contentWindow 键稳定；应用销毁后 Map 残项
// 不可达（getActivePBTarget 只查当前活动实例的 iframe），无泄漏风险；iframe 重载
// 时 contentWindow 引用变化 → 旧键自然失联（Map 有界：≤ 应用数 × 1）。

import { state } from './state.js';

/** contentWindow -> { canBack: boolean } */
const pbWindows = new Map();

/** main.js 消息监听入口：PB_STATE 记账（其余消息类型原样放行） */
export function handlePBMessage(e) {
  if (!e.data || e.data.type !== 'PB_STATE' || !e.source) return;
  pbWindows.set(e.source, { canBack: !!e.data.canBack });
}

/** iframe 加载/主题同步时请求子应用回报 PB 状态（__syncIframeApp 钩子） */
export function requestPBSync(iframeEl) {
  try {
    if (iframeEl && iframeEl.contentWindow) {
      iframeEl.contentWindow.postMessage({ type: 'PB_SYNC_REQ' }, '*');
    }
  } catch (e) { /* 跨域或上下文已销毁时忽略 */ }
}

/**
 * 前台应用的 PB 目标（无 PB 能力 / 根层 canBack=false 时同样返回记录，调用方分支）。
 * 分屏会话不纳入（手势语义归 split 桥，返回仍走原有关闭路径）。
 * @returns {{win: Window, canBack: boolean} | null}
 */
export function getActivePBTarget() {
  if (!state.isOpen || state.isClosing || !state.currentApp) return null;
  if (typeof window !== 'undefined' && window.__splitInfo && window.__splitInfo().active) return null;
  // 前台应用实例容器（page-stack 命名：app-instance-{id}）—— 只查当前活动应用的
  // iframe，绝不碰其他常驻实例（避免后台应用的 PB 状态串台）
  const wrapper = document.getElementById('app-instance-' + state.currentApp.id);
  const iframes = wrapper ? wrapper.querySelectorAll('iframe') : [];
  for (const f of iframes) {
    if (!f.contentWindow) continue;
    const rec = pbWindows.get(f.contentWindow);
    if (rec) return { win: f.contentWindow, canBack: rec.canBack };
  }
  return null;
}

/** 安全投递 */
export function pbSend(win, msg) {
  try { if (win) win.postMessage(msg, '*'); } catch (e) { /* 已销毁上下文 */ }
}
