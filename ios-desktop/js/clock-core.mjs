// ==================== js/clock-core.mjs — ESM 双形态出口（v10.35 · #226 要求③；v10.33 被 #225 占号 15d961a9、v10.34 被 #232 占号 92eec560，rebase 后按协议规则3两次重取号） ====================
// 逻辑单源 = 经典 IIFE clock-core.js（唯一出口 window.__clockCore；v160 F5 纪律：本体零 export
// 不改，经典消费面 index.html L15 与 e2e 注入面 byte 不变）。本文件只做「形态门面」，零逻辑复制：
//   import { getClockCore, ensureClockCore } from '../../js/clock-core.mjs'
// - getClockCore()：同步取单例（可能 null——调用方自降级，stopwatch.mjs ensureSw 同款纪律）
// - ensureClockCore()：缺失时按模块相对路径动态补载经典脚本一次；成功返回单例，失败返回 null
//   （显式失败面交给调用方，不抛出不静默崩——app.mjs 入口遮罩同构语义）
// 模块求值期零顶层 window.__clockCore 直读（#226 同型位点纪律），经典脚本缺载不再毁掉 ESM 图。
const loadClassicCore = () => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = new URL('./clock-core.js', import.meta.url).href;
  s.onload = () => resolve(true);
  s.onerror = () => reject(new Error('clock-core.js 动态补载失败（404/SW 错配/网络）'));
  document.head.appendChild(s);
});

export const getClockCore = () => window.__clockCore || null;

export const ensureClockCore = async () => {
  if (getClockCore()) return getClockCore();
  try { await loadClassicCore(); } catch (e) { /* 失败可见面归调用方（遮罩/降级），此处不抛 */ }
  return getClockCore();
};
