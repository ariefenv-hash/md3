// ==================== desktop-tasks-limiter.js — DesktopTasksLimiter.kt 同构（#199） ====================
//
// AOSP 源：libs/WindowManager/Shell/src/com/android/wm/shell/desktopmode/DesktopTasksLimiter.kt
//   （main 分支实拉同构，#199 议题正文实证）
//   · maxTasksLimit 构造注入：`require(maxTasksLimit > 0)` —— 非法参数在构造期即崩，不带病运行
//   · 超限行为 = 自动最小化栈底任务：getTaskIdToMinimize() 取 visibleOrderedTasks.last()
//     （z 序数组，index 0 = 最顶层 = 最近触顶；last() = 栈底 = 最久未触顶 = 最早展示的任务），
//     随 wct.reorder(token, false) 送入最小化 —— **新窗口永不拒绝**（用户操作永不被驳回，
//     代价由最旧的窗口承担：system health 语义，非 LRU 销毁）
//   · 治理响应任务真实出现（onTaskAppeared）—— 判定发生在新任务入场时，一次触发至多送走
//     一个栈底任务（单次 wct.reorder）；若上限被收紧导致存量仍超限，由下一次入场事件继续收敛
//     （不主动批量清理 —— 与 AOSP 事件驱动语义一致，避免一帧内连续 reorder 抖动）
//
// md3 落地（v9.69 #199，裁决在录）：
//   · md3 的「桌面窗口」= mini-window 多开注册表（Freeform 窗口，v7.57 多开）——limiter
//     以回调外置方式与 mini-window.js 接线：admitTask 返回裁决，DOM 动作（最小化动画/芯片）
//     由调用方执行，本模块零 DOM 依赖（js/aosp 纯逻辑层纪律）
//   · z 序由 touchTask(id) 驱动（mini-window bringToFront 调用）——与 AOSP
//     visibleOrderedTasks 的 z-order 语义对齐；order 大 = 最近触顶 = 栈顶
//   · 上限可配置：setMaxTasksLimit 透传 require > 0 语义（#199 验收四）
//
// 零 DOM / 零 window 引用；所有时序值由外部注入（可测性）。

/** 默认并发桌面窗口上限（#199 落点建议值 6；AOSP DesktopTasksLimiter 为构造注入无固定值） */
export const DEFAULT_MAX_TASKS_LIMIT = 6;

/**
 * 创建桌面任务上限治理器（DesktopTasksLimiter.kt 同构）。
 * @param {{ maxTasksLimit?: number }} [opts] 并发可见窗口上限，require > 0
 * @returns {{
 *   admitTask: (id: string) => { admitted: boolean, minimizeTaskId: string|null },
 *   unregisterTask: (id: string) => void,
 *   touchTask: (id: string) => void,
 *   setVisible: (id: string, visible: boolean) => void,
 *   getTaskIdToMinimize: (excludeId?: string) => string|null,
 *   setMaxTasksLimit: (n: number) => void,
 *   maxTasksLimit: () => number,
 *   visibleCount: () => number,
 *   visibleOrderedTasks: () => string[],
 * }}
 */
export function createDesktopTasksLimiter({ maxTasksLimit = DEFAULT_MAX_TASKS_LIMIT } = {}) {
  // AOSP `require(maxTasksLimit > 0)` 同构：构造期非法参数直接抛错，不带病运行
  if (!Number.isFinite(maxTasksLimit) || maxTasksLimit <= 0) {
    throw new RangeError('maxTasksLimit must be a finite number > 0, got: ' + maxTasksLimit);
  }

  /** id -> { order, visible }；order 单调递增，大 = 最近触顶（z 序栈顶） */
  const tasks = new Map();
  let limit = maxTasksLimit;
  let orderSeq = 0;

  /** z 序可见任务（top-first：index 0 = 最近触顶；AOSP visibleOrderedTasks 同向） */
  function visibleOrderedTasks() {
    const out = [];
    tasks.forEach((t, id) => { if (t.visible) out.push({ id, order: t.order }); });
    out.sort((a, b) => b.order - a.order); // 降序：最近触顶在前
    return out.map((e) => e.id);
  }

  /** 栈底任务 = visibleOrderedTasks.last()（AOSP getTaskIdToMinimize 同构）；excludeId 防御性排除 */
  function getTaskIdToMinimize(excludeId = null) {
    const ordered = visibleOrderedTasks();
    for (let i = ordered.length - 1; i >= 0; i--) {
      if (ordered[i] !== excludeId) return ordered[i];
    }
    return null;
  }

  /**
   * 新任务入场裁决（AOSP onTaskAppeared 治理路径同构）：
   * 任务先注册（新窗口永不拒绝），若可见数超出上限则返回栈底任务 id 供调用方最小化。
   * 一次 admit 至多送走一个栈底任务（单次 wct.reorder 同构）；存量超限由后续事件收敛。
   * @param {string} id 新任务 id（若已注册则视为重复入场：仅触顶，不重复计数）
   */
  function admitTask(id) {
    if (!tasks.has(id)) {
      tasks.set(id, { order: ++orderSeq, visible: true });
    } else {
      // 重复入场（md3：同应用重复请求走置顶路径）—— 仅刷新 z 序
      const t = tasks.get(id);
      t.order = ++orderSeq;
      t.visible = true;
    }
    // visibleCount 已含新任务；> limit 时送走栈底（排除自身防御：新任务 order 最大必在栈顶，
    // 但收紧上限 + 全部可见时栈底可能恰为自身 —— AOSP 不存在该路径（limiter 不排除自身），
    // md3 防御性排除以免「新窗开即自最小化」的观感悖论）
    if (visibleOrderedTasks().length > limit) {
      const victim = getTaskIdToMinimize(id);
      return { admitted: true, minimizeTaskId: victim };
    }
    return { admitted: true, minimizeTaskId: null };
  }

  /** 任务离场（关闭/转全屏/销毁）：从注册表摘除 */
  function unregisterTask(id) { tasks.delete(id); }

  /** 触顶（用户点击置顶/新焦点）：刷新 z 序（AOSP z-order 语义） */
  function touchTask(id) {
    const t = tasks.get(id);
    if (t) t.order = ++orderSeq;
  }

  /** 可见性切换（最小化 → false / 恢复 → true）；隐藏任务不计入上限（AOSP 可见判定同构） */
  function setVisible(id, visible) {
    const t = tasks.get(id);
    if (t) t.visible = !!visible;
  }

  /** 上限重配（#199 验收四：可配置，对齐 maxTasksLimit 构造注入语义） */
  function setMaxTasksLimit(n) {
    if (!Number.isFinite(n) || n <= 0) {
      throw new RangeError('maxTasksLimit must be a finite number > 0, got: ' + n);
    }
    limit = n;
  }

  return {
    admitTask,
    unregisterTask,
    touchTask,
    setVisible,
    getTaskIdToMinimize,
    setMaxTasksLimit,
    maxTasksLimit: () => limit,
    visibleCount: () => visibleOrderedTasks().length,
    visibleOrderedTasks,
  };
}
