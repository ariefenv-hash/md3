// ==================== qs-paged-layout.js — PagedTileLayout 分页布局 · 纯逻辑层（#203） ====================
//
// 1:1 移植自 AOSP aosp-mirror/platform_frameworks_base main
// packages/SystemUI/src/com/android/systemui/qs/paged/PagedTileLayout.java（775 行）+
// packages/SystemUI/src/com/android/systemui/qs/TileLayout.java（329 行）+
// packages/SystemUI/src/com/android/systemui/qs/PageIndicator.java（307 行）：
//   · 双层结构：PagedTileLayout（ViewPager 容器，mTiles 全量队列 + mPages 页列表）
//     → TileLayout（单页网格，maxTiles() 容量公式）→ PageIndicator（浮点圆点指示器）
//   · maxTiles() L295-300：`return Math.max(mColumns * mRows, 1)` —— 一页装多少磁贴由此
//     唯一决定，至少保底 1（防初始化期 0 容量）
//   · distributeTiles L399-411（核心重分配）：emptyAndInflateOrRemovePages（L412-438 清空
//     重 inflate）→ 按每页 maxTiles() 容量逐页装填，满页即封、溢出进下页；addTile/removeTile
//     L347-358 只入总队列不即时落页，等下一次 distributeTiles 批量合并重排
//     （mDistributeTiles L67 挂起旗标语义——web 落地=渲染函数天然全量重绘，旗标不需要，
//     在录）；updateResources L440-454 行列资源变化入口；forceTilesRedistribution L762-765 兜底
//   · PageIndicator.setLocation L156-173：浮点位置 → 当前 index + 偏移，index1=index、
//     index2=index+1 两点间插值动画（index2 超 mNumPages 时不画过渡点）
//   · PageScrollActionListener L298-304：LEFT/RIGHT 方向翻页回调（ViewPager 键盘/无障碍
//     通道）；onPageSelected L690-697（页选定）/ onPageScrolled L707-708（页滑动浮点）
//   · mPageToRestore L68：重分配后恢复页（越界钳制语义）
//
// web 落地裁决（在录；v11.23 行数勘误）：
//   · md3 QS 主网格 4 列（index.html「InfiniteGridLayout 4 列」同源）× 4 行 = 16 格/页
//     —— 旧 2 行系 v9.94 落地时的低定值；真源 LOS 24.0(A17 基线) res/values/config.xml
//     L62 `quick_settings_paginated_grid_num_rows=4`（#259 P6 用户实测「展开磁贴偏少」
//     实锤回归面，docs/reference/frameworks-base/android17-shade/README.md §3.2）；
//     行列随容器形状派生见 resolveGridShape（sw600dp-port 3 行 / land 2 行 + QQS 行数），
//     maxTiles 保底公式逐字保留
//   · 宽磁贴（2×1 span2）以 tileWeight 权重参与容量计账（AOSP 对应 LargeTile 跨列语义由
//     TileLayout 逐行扫描承担；页尾放不下整块 → 进下页，不切割，单块超页独占一页）
//   · ViewPager 惯性/弹性以 CSS scroll-snap 近似（议题 §4 诚实降级标注；JS 帧动画零引入）
//   · 与 #201（qs-tile-state.js）/ #202（qs-tile-view.js）零 import 交叉——布局层不感知
//     状态/视觉（议题划界原文），三模块正交
//
// 本模块零 DOM / 零 window / 零 Math.random，供 quick-settings.js 渲染层与
// tests/v203-qs-paged-layout.test.js 直接驱动（纯函数守护策略，与 zen-mode.js 同款）。

/** QS 主网格分页容量契约：InfiniteGridLayout 4 列 × TileLayout 4 行。
 *  v11.23 终值锚重锚：LOS 24.0(A17 基线) res/values/config.xml L62
 *  quick_settings_paginated_grid_num_rows=4（手机竖屏；sw600dp-port=3 / land=2
 *  见 resolveGridShape 限定符派生）——#259 P6「展开理应展示更多磁贴」修复。 */
export const QS_PAGE_COLUMNS = 4;
export const QS_PAGE_ROWS = 4;

/** A17 尺寸限定符阈值：WindowSizeClass WIDTH_DP_MEDIUM_LOWER_BOUND = 600dp
 *  （sw600dp-port 覆盖生效界；与 index.html 双栏断点历史值同源） */
export const QS_SW600_DP = 600;

/** A17 网格形状解析（res/values/config.xml L62-68 + values-land + values-sw600dp-port
 *  限定符派生，纯函数）：
 *  · 竖屏（h ≥ w）：w < 600dp → 分页 4 列×4 行 / QQS 2 行（大磁贴 2×2）；
 *    w ≥ 600dp → sw600dp-port：分页 4 列×3 行 / QQS 2 行；
 *  · 横屏（w > h）：land：分页 4 列×2 行 / QQS 1 行（大磁贴 1×2）。
 *  分页列数真源各限定符均未覆盖（恒 4）；无限网格列 4/6/8 属 Dual Shade 通道
 *  （GridLayoutTypeRepository.dualShadeLayoutType=InfiniteGridLayoutType），本模块
 *  分页通道不消费。QQS 行数 × 大磁贴 span2 = QQS 磁贴容量（2 行=4 贴 / 1 行=2 贴）。
 *  @param {number} width 容器宽（px，1px≈1dp@412 视口既有口径）
 *  @param {number} height 容器高
 *  @returns {{columns: number, rows: number, qqsRows: number}} */
export function resolveGridShape(width, height) {
  const w = Number.isFinite(width) && width > 0 ? width : 0;
  const h = Number.isFinite(height) && height > 0 ? height : 0;
  const portrait = h >= w;
  if (!portrait) return { columns: QS_PAGE_COLUMNS, rows: 2, qqsRows: 1 };
  const sw600 = w >= QS_SW600_DP;
  return { columns: QS_PAGE_COLUMNS, rows: sw600 ? 3 : QS_PAGE_ROWS, qqsRows: 2 };
}

/** PageIndicator.PageScrollActionListener 方向常量（ViewPager LEFT/RIGHT 翻页通道） */
export const PAGE_SCROLL_DIRECTION = Object.freeze({
  LEFT: -1,
  RIGHT: 1,
});

/** TileLayout.maxTiles() L295-300 逐字同源：`Math.max(mColumns * mRows, 1)`——
 *  至少保底 1，防初始化期 0 容量。
 *  @param {number} columns 列数
 *  @param {number} rows 行数
 *  @returns {number} 单页磁贴容量（格） */
export function maxTiles(columns, rows) {
  return Math.max(columns * rows, 1);
}

/** PagedTileLayout.distributeTiles L399-411 核心重分配：全量磁贴按页容量逐页装填。
 *  满页即封（maxTiles 契约）、溢出进下页；不足即增页（emptyAndInflateOrRemovePages 语义，
 *  页数按需伸缩）；保底一页（AOSP 无磁贴时仍 inflate 一页）。
 *  @param {Array} tiles 全量磁贴队列（mTiles 语义，顺序即跨页连续序）
 *  @param {object} opts {columns, rows, tileWeight?}
 *    columns/rows 来源：quick-settings.js 消费 resolveGridShape 按容器形状派生（A17
 *    限定符同构）；tileWeight(tile) → number：磁贴占格权重（默认 1；宽磁贴 2 = span2）。
 *    页尾放不下整块 → 进下页（不切割）；单块权重超页容量 → 独占一页（AOSP 磁贴不跨页）。
 *  @returns {Array<Array>} pages 页列表（每页为磁贴子数组，至少一页） */
export function distributeTiles(tiles, opts) {
  const o = opts || {};
  const capacity = maxTiles(o.columns, o.rows);
  const weightOf = o.tileWeight || (() => 1);
  const list = Array.isArray(tiles) ? tiles : [];
  /** @type {Array<Array>} */
  const pages = [[]];
  let page = pages[0];
  let used = 0;
  for (const tile of list) {
    const w = Math.max(1, weightOf(tile) | 0 || 1); // 非法权重按 1（防 0/负格穿页）
    if (used > 0 && used + w > capacity) {
      page = []; // 满页即封：页尾放不下整块，开新页（不切割）
      pages.push(page);
      used = 0;
    }
    page.push(tile);
    used += w; // 单块超容量时独占一页（不切割，AOSP 磁贴不跨页语义）
  }
  return pages;
}

/** PageIndicator.setLocation L156-173：浮点位置 → 当前 index + 偏移（两点插值语义）。
 *  location 钳制到 [0, pageCount-1]；index1 = floor(location)、offset = location - index1、
 *  index2 = index1+1（最后一页时为 null——AOSP index2 超 mNumPages 不画过渡点）。
 *  @param {number} pageCount 总页数（<1 按 1 保底，同 maxTiles 保底精神）
 *  @param {number} location 浮点滚动位置（0..pageCount-1）
 *  @returns {{index1: number, index2: number|null, offset: number, position: number}} */
export function pageIndicatorState(pageCount, location) {
  const numPages = Math.max(1, pageCount | 0 || 1);
  const maxPos = numPages - 1;
  let pos = typeof location === 'number' && Number.isFinite(location) ? location : 0;
  pos = Math.min(Math.max(pos, 0), maxPos); // 钳制（AOSP ViewPager 滑动范围天然封闭）
  const index1 = Math.floor(pos);
  const offset = pos - index1;
  const index2 = index1 + 1 <= maxPos ? index1 + 1 : null;
  return { index1, index2, offset, position: pos };
}

/** ViewPager.onPageSelected L690-697 语义：滑动停止时的整数选定页 = 浮点位置四舍五入。
 *  @param {number} pageCount 总页数
 *  @param {number} location 浮点滚动位置
 *  @returns {number} 选定页 index（已钳制） */
export function selectedPageIndex(pageCount, location) {
  const s = pageIndicatorState(pageCount, location);
  return Math.min(Math.round(s.position), Math.max(1, pageCount | 0 || 1) - 1);
}

/** PageScrollActionListener LEFT/RIGHT 方向翻页（L298-304）：当前页 ± 1，越界钳制。
 *  @param {number} currentPage 当前页 index
 *  @param {number} pageCount 总页数
 *  @param {number} direction PAGE_SCROLL_DIRECTION.LEFT / RIGHT
 *  @returns {number} 目标页 index（越界时钳制边界页） */
export function stepPage(currentPage, pageCount, direction) {
  const numPages = Math.max(1, pageCount | 0 || 1);
  const cur = Math.min(Math.max(currentPage | 0, 0), numPages - 1);
  const step = direction === PAGE_SCROLL_DIRECTION.LEFT ? -1
    : direction === PAGE_SCROLL_DIRECTION.RIGHT ? 1 : 0;
  return Math.min(Math.max(cur + step, 0), numPages - 1);
}

/** PagedTileLayout.mPageToRestore L68 语义：重分配后恢复页钳制——
 *  非法（undefined/负/越界）回退安全页（0 或最后一页）。
 *  @param {number|undefined} pageToRestore 恢复页请求
 *  @param {number} pageCount 重分配后的总页数
 *  @returns {number} 实际恢复页 index */
export function resolveRestorePage(pageToRestore, pageCount) {
  const numPages = Math.max(1, pageCount | 0 || 1);
  if (typeof pageToRestore !== 'number' || !Number.isFinite(pageToRestore)) return 0;
  return Math.min(Math.max(Math.floor(pageToRestore), 0), numPages - 1);
}
