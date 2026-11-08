// ==================== history-guard-core.js — 浏览器历史导航守卫纯核（v10.82 #218） ====================
//
// 病灶（#218 蓝图 #30）：Windows 触控板系统级横扫手势（前进/后退导航）、
// Safari iOS 边缘侧滑，直接劫持浏览器历史 —— 整个壳页被导航走（GitHub Pages
// 部署面 = 用户瞬间离开应用）。全库零 popstate/pushState 使用（R119 窗实测），
// 页面内亦零 location.hash 路由 —— 哨兵条目方案零冲突面。
//
// 机制（PWA 惯例哨兵重武装）：
//   1. install：replaceState 给当前条目打标（不新增条目）+ pushState 压入一枚哨兵条目
//   2. popstate（触控板后退/前进手势越过哨兵）→ 吞掉并立即重新压入哨兵（重武装）
//      —— 用户停留原地，应用内 AOSP 语义（预测性返回 pill / 页面栈）不受影响
//   3. 代价（诚实标注）：浏览器原生「后退键离开本页」同样被吞 —— 这是 OS 模拟
//      SPA 的有意取舍（Instagram/Twitter Web 同款哨兵模式）；页面无内部历史
//      可回溯，两个方向的系统手势导航对它都是劫持
//
// 注入面（main.js 接线）：桌面文档自身 + iframe 内运行时同源 parent（部署档
// root shell = 触控板手势实际作用的顶层文档）双装；跨域 parent 静默跳过。
//
// 可测性：win / hist 全参数注入 —— 行为测试用极简 fake（零 happy-dom History 依赖）。

const MARK = '__md3NavGuard';

/** 安装守卫。返回 teardown（移除 popstate 监听；哨兵条目留存无副作用）。
 * @param {{addEventListener: Function, removeEventListener: Function, location: {href: string}}} win
 * @param {{replaceState: Function, pushState: Function, state: any}} hist
 */
export function installHistoryGuard(win, hist) {
  let armed = true;
  const arm = () => {
    hist.pushState({ [MARK]: 'sentinel' }, '', win.location.href);
    armed = true;
  };
  const onPop = () => {
    armed = false;
    arm(); // 吞掉本次手势导航 + 重武装（pushState 同时截断 forward 栈）
  };
  try {
    hist.replaceState({ ...(hist.state || {}), [MARK]: 'current' }, '', win.location.href);
  } catch (e) { /* 沙箱化文档 replaceState 被禁：哨兵方案仍可用 */ }
  arm();
  win.addEventListener('popstate', onPop);
  return function teardown() {
    win.removeEventListener('popstate', onPop);
  };
}
