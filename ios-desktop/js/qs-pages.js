// ==================== qs-pages.js — #203 QS 磁贴分页接线簇（#284 批19 单源 · boundary-map §3.5 表第三行） ====================
//
// 自 quick-settings.js 分页簇逐字节搬迁（唯一语义差异 = bindQsPageChrome function → export，
// 宿主委托调用所需）；恢复页模块态 qsRestorePage 单源留本文件——宿主 renderQuickSettingsGrid
// 经 getQsRestorePage()/setQsRestorePage() 访问器读写（批19 新增胶水 2 行）。
// 宿主 quick-settings.js：import 四出口 + 转出口 export { syncQsPagedViewport }
// （pull-down-gesture.js openPullPanel 动态 import('./quick-settings.js') 链零断裂）；
// 容量/重分配/浮点状态纯逻辑单源仍在 js/aosp/qs-paged-layout.js（本文件只做 DOM 接线）。

import {
  PAGE_SCROLL_DIRECTION,
  pageIndicatorState, stepPage, resolveRestorePage,
} from './aosp/qs-paged-layout.js';

let qsRestorePage = 0;
let qsPageChromeBound = false;

/** onPageScrolled L707-708 → PageIndicator.setLocation L156-173 桥：viewport scroll 浮点
 *  位置 → 圆点 active（onPageSelected 四舍五入语义）+ index1/index2 alpha 插值（浮点过渡） */
function syncQsPageIndicator(vp, indicator) {
  if (!vp || !indicator) return;
  const pageW = vp.clientWidth;
  const numPages = vp.children.length;
  if (pageW <= 0 || numPages === 0) return;
  const st = pageIndicatorState(numPages, vp.scrollLeft / pageW);
  const sel = Math.round(st.position);
  Array.from(indicator.children).forEach((dot, i) => {
    dot.classList.toggle('active', i === sel);
    dot.setAttribute('aria-selected', i === sel ? 'true' : 'false');
    // setLocation 两点插值：滚动中 index1→index2 圆点 alpha 随 offset 过渡（浮点联动验收面）
    if (i === st.index1) dot.style.setProperty('--dot-alpha', (1 - st.offset * 0.55).toFixed(3));
    else if (i === st.index2) dot.style.setProperty('--dot-alpha', (0.45 + st.offset * 0.55).toFixed(3));
    else dot.style.removeProperty('--dot-alpha');
  });
}

/** mPageToRestore 落位：重分配后恢复记忆页（auto 不平滑；面板隐藏时仅记号不硬置）。
 *  openPullPanel 展开面板时同样调用（innerHTML 重建在隐藏态发生，scrollLeft 已归零） */
export function syncQsPagedViewport() {
  const vp = document.getElementById('qsTilesContainer');
  const indicator = document.getElementById('qsPageIndicator');
  if (!vp) return;
  if (vp.clientWidth > 0) {
    const target = resolveRestorePage(qsRestorePage, vp.children.length);
    vp.scrollLeft = target * vp.clientWidth;
  }
  syncQsPageIndicator(vp, indicator);
}

/** 滚动/键盘/resize/调试钩子一次绑定（PageScrollActionListener LEFT/RIGHT 同构） */
export function bindQsPageChrome(vp, indicator) {
  if (qsPageChromeBound || !vp || !indicator) return;
  qsPageChromeBound = true;
  vp.addEventListener('scroll', () => {
    const pageW = vp.clientWidth;
    if (pageW > 0) qsRestorePage = Math.round(vp.scrollLeft / pageW);
    syncQsPageIndicator(vp, indicator);
  }, { passive: true });
  // PageScrollActionListener L298-304：键盘 LEFT/RIGHT 方向翻页（无障碍通道）
  vp.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowLeft' ? PAGE_SCROLL_DIRECTION.LEFT : PAGE_SCROLL_DIRECTION.RIGHT;
    const target = stepPage(Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth)), vp.children.length, dir);
    vp.scrollTo({ left: target * vp.clientWidth, behavior: 'smooth' });
  });
  // 行列资源变化入口（updateResources L440-454 语义）：视口宽度变化 → 重新吸附当前页
  window.addEventListener('resize', () => syncQsPagedViewport());
  // e2e/调试钩子（零 import 惯例，同 __monetReroll/__lockClockFaces）
  window.__qsPageState = () => ({
    pageCount: vp.children.length,
    currentPage: vp.clientWidth > 0 ? Math.round(vp.scrollLeft / vp.clientWidth) : qsRestorePage,
    dots: indicator.children.length,
  });
}

// 恢复页状态访问器（批19：宿主 renderQuickSettingsGrid 读写共享态委托——
// 簇体逐字节保真前提下唯一新增胶水面）
export function getQsRestorePage() { return qsRestorePage; }
export function setQsRestorePage(v) { qsRestorePage = v; }
