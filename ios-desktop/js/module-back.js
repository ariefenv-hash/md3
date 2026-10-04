// ==================== module-back.js — 模块应用「页内返回」消费器注册表（v7.28） ====================
//
// 与 iframe-pb.js（postMessage 协议）对偶：模块渲染型应用（与 settings 同范式，
// 内容直接渲染进宿主文档、无 iframe 边界）的页内返回消费。files 的目录上行等
// 场景注册于此；导航栏返回键与边缘手势据此决定「页内预览返回」还是「原有语义」
// （宿主子页弹出 / 根页缩窗关闭）。
//
// 注册项生命周期：模块应用实例常驻内存（page-stack.js），应用文件顶层注册一次
// 全程有效；canBack() 由调用方同步查询（实时反映页内栈状态），无消息时序问题。
// 应用实例内部通过 window 桥（如 __filesPB）把运行期状态暴露给注册项 —— 实例
// 不存在/未就绪时 canBack() 返回 false，自动退回原有语义，零额外防御成本。
//
// 手势协议与 iframe-pb / overlay-registry def 同构：
//   beginGesture() → progressGesture(dx) → endGesture(commit, vx)
// dx 为「朝返回方向为正」的投影位移（px），vx 同理（px/s）；提交判定阈值由宿主
// 统一把关（位移 25% 屏宽 / 速度 400px/s + 30px），与全系统返回手感一致。

import { state } from './state.js';

/** appId -> def */
const consumers = new Map();

/**
 * 注册模块应用的页内返回消费器（幂等：后注册覆盖先注册）。
 * @param {string} appId 应用 id（与 apps-data 定义一致）
 * @param {{
 *   canBack: () => boolean,
 *   triggerBack: () => void,
 *   beginGesture?: () => void,
 *   progressGesture?: (dx: number) => void,
 *   endGesture?: (commit: boolean, vx: number) => void,
 * }} def
 */
export function registerModuleBack(appId, def) {
  if (!appId || !def || typeof def.canBack !== 'function' || typeof def.triggerBack !== 'function') return;
  consumers.set(appId, def);
}

/**
 * 当前前台模块应用的页内返回消费器。
 * 规则与 iframe-pb.getActivePBTarget 完全一致：
 *   · 应用未开 / 关闭动画中 → null（交还原有语义）
 *   · 分屏会话不纳入（返回仍走原有关闭路径）
 *   · canBack() 为 false（如已在根目录） → null（根页缩窗关闭）
 * @returns {def | null}
 */
export function getActiveModuleBack() {
  if (!state.isOpen || state.isClosing || !state.currentApp) return null;
  if (typeof window !== 'undefined' && window.__splitInfo && window.__splitInfo().active) return null;
  const def = consumers.get(state.currentApp.id);
  if (!def) return null;
  try { if (!def.canBack()) return null; } catch (e) { return null; }
  return def;
}

/** 测试透视：当前注册表快照（只读） */
export function __moduleBackSnapshot() {
  return [...consumers.keys()];
}
