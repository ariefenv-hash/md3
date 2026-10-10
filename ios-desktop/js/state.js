// @ts-check
// ==================== state.js — 全局可变状态中心 ====================
//
// 所有跨模块共享的可变状态集中在此对象中，
// 各模块通过 import { state } 读写。
// TS 渐进迁移（批次五）：本文件已开启严格类型检查（@ts-check），
// AppInfo / DeskItem / DesktopState 为全库共享契约类型。

import { Spring, Spring2D } from './spring.js';
import { curOpenParams } from './animation-presets.js';
import { initialApps } from './apps-data.js';

/**
 * @typedef {Object} AppPage
 * @property {string} title    页面标题（导航栈展示）
 * @property {string} content  页面 HTML 内容或 iframe 包装内容
 */

/**
 * 应用/文件夹在桌面数据中的统一形态。
 * @typedef {Object} AppInfo
 * @property {string} id                 唯一标识（initialApps 注册 id 或 folder-xxx）
 * @property {string} name               展示名
 * @property {AppPage[]} [pages]         应用内页面（模块型应用）
 * @property {string} [type]             动态图标类型（clock/calendar/...）或 'folder'
 * @property {number} [slot]             桌面网格槽位（持久化后必有）
 * @property {AppInfo[]} [apps]          文件夹内成员（type==='folder'）
 */

/** 桌面上的一个条目 = 应用/文件夹 + 必有槽位 */
/** @typedef {AppInfo & { slot: number }} DeskItem */

/** @typedef {AppInfo & { type: 'folder', apps: AppInfo[] }} FolderItem */

/**
 * 图标拖拽重排进行中的上下文（drag-reorder.js 维护，桌面/文件夹两模式字段并集）。
 * @typedef {Object} IconDragState
 * @property {'desktop'|'folder'} mode      当前拖拽作用域
 * @property {'desktop'|'folder'} source    拖拽发起处
 * @property {number} originalPage          起始页
 * @property {number} originalSlot          起始槽位
 * @property {number} targetPage            当前悬停页
 * @property {number} targetSlot            当前悬停槽位
 * @property {AppInfo} app                  被拖拽的应用/文件夹
 * @property {HTMLElement} element          拖拽幽灵克隆
 * @property {HTMLElement} placeholderEl    原位置占位元素
 * @property {number} offsetX               指针相对幽灵左上偏移
 * @property {number} offsetY
 * @property {number} lastX                 上一帧指针位置（速度平滑用）
 * @property {number} lastY
 * @property {number} prevMoveX
 * @property {number} prevMoveY
 * @property {number} smoothVx              平滑后速度（px/ms）
 * @property {number} smoothVy
 * @property {boolean} [isAddToFolder]
 * @property {FolderItem | null} [targetFolder]
 * @property {boolean} [isCreateFolder]
 * @property {AppInfo | null} [targetApp]
 * @property {FolderItem} [folder]          source==='folder' 时的宿主文件夹
 * @property {number} [folderIdx]
 * @property {number} [targetFolderIdx]
 */

/**
 * 窗口手势速度采样历史条目。
 * @typedef {{ x: number, y: number, t: number }} GestureHistoryPoint
 */

/**
 * 窗口手势拖拽数据。
 * @typedef {Object} GestureDrag
 * @property {boolean} active
 * @property {number} startX
 * @property {number} startY
 * @property {number} offsetX
 * @property {number} offsetY
 * @property {GestureHistoryPoint[]} history  最近 ≤6 个采样点（算释放速度）
 */

/**
 * 全局状态中心。
 * @typedef {Object} DesktopState
 * @property {DeskItem[][]} pagesApps            桌面分页 → 每页条目
 * @property {number} currentPage
 * @property {boolean} isEditMode
 * @property {string[]} removedApps              已移除应用 id
 * @property {HTMLElement | null} currentIconEl  打开动画起点图标
 * @property {AppInfo | null} currentApp         当前打开的应用定义
 * @property {boolean} isOpen
 * @property {boolean} isClosing
 * @property {boolean} returnToFolderOnClose     关闭时缩回文件夹语义
 * @property {boolean} contentWarm               v7.17 实例温热（内容已就绪，交叉淡入走早曲线）
 * @property {boolean} isDragging
 * @property {number | null} rafId
 * @property {number} iconCX
 * @property {number} iconCY
 * @property {number} iconW
 * @property {number} iconH
 * @property {number[]} navHistory               应用内导航栈（页索引）
 * @property {boolean} popInProgress             子页返回弹簧进行中
 * @property {number} subpageBackDir             v7.41 预测式返回方向（0 规范 / 1 左缘 / -1 右缘）
 * @property {number} subpageBackTy              v7.41 预测式返回手势纵向位移 px
 * @property {Spring2D} posSpring                窗口位置弹簧
 * @property {Spring} scaleSpring                窗口缩放弹簧
 * @property {Spring} subpageSpring              子页推入/弹出弹簧
 * @property {string} gestureType                当前手势类型（模块内字符串约定）
 * @property {boolean} shrinkToCard              v7.23 多任务卡片纯缩放通道（closeApp shrinkTo 置真）
 * @property {GestureDrag} drag
 * @property {number | null} longPressTimer
 * @property {IconDragState | null} iconDragState
 * @property {number | null} edgePagingTimer     编辑模式拖到边缘的自动翻页定时器
 * @property {boolean} mouseDown
 * @property {boolean} lastGestureMoved
 * @property {number} lastGestureEndedAt
 */

// 统一以 AppInfo 契约约束 initialApps（31 个应用定义字面量的结构收口）
const _initialApps = /** @type {AppInfo[]} */ (initialApps);

// 初始化分页：第 1 页 24 个应用，第 2 页放新增应用
const _initialPage1 = _initialApps.slice(0, 24).map((app, i) => ({ ...app, slot: i }));
const _initialPage2 = _initialApps.slice(24).map((app, i) => ({ ...app, slot: i }));

// 数据版本号——结构变更时递增，旧数据自动失效
const DATA_VERSION = 'v7_2026_08_16_threes_dice_flow11_parallel';

// 从 localStorage 加载持久化的图标排列
/**
 * @returns {DeskItem[][]}
 */
function loadPagesApps() {
  try {
    const savedVersion = localStorage.getItem('ios-desktop:data-version');
    if (savedVersion !== DATA_VERSION) {
      localStorage.removeItem('ios-desktop:pages-apps');
      localStorage.setItem('ios-desktop:data-version', DATA_VERSION);
      return [_initialPage1, _initialPage2];
    }
    const saved = localStorage.getItem('ios-desktop:pages-apps');
    if (saved) {
      const parsed = /** @type {any} */ (JSON.parse(saved));
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 验证数据完整性：每个 app 必须有 id 和 slot
        for (const page of parsed) {
          if (!Array.isArray(page)) throw new Error('invalid');
          for (const app of page) {
            if (!app || typeof app.id !== 'string' || typeof app.slot !== 'number') {
              throw new Error('invalid');
            }
          }
        }
        // 用 initialApps 的数据补全可能缺失的 pages 等字段（v7.4 起应用不再携带 iconUrl）
        const appMap = new Map(_initialApps.map(a => [a.id, a]));
        for (const page of parsed) {
          for (let i = 0; i < page.length; i++) {
            const base = appMap.get(page[i].id);
            if (base) {
              page[i] = { ...base, slot: page[i].slot };
            }
          }
        }
        // 无痕升级：版本未变但 saved 里没有的新应用（如后续批次新增）追加到末页，
        // 既让老用户拿到新图标，又不重置已有桌面排列（removedApps 里的视为用户主动卸载，不追加）
        /** @type {any[]} */
        let removedList = [];
        try {
          const r = /** @type {any} */ (JSON.parse(localStorage.getItem('ios-desktop:removed-apps') || '[]'));
          if (Array.isArray(r)) removedList = r;
        } catch (e) {}
        // fix(audit-D/E1): removed-apps 持久化的是完整应用对象（drag-reorder 写入 {id,name,slot,...}），
        // 旧实现 removedList.includes(a.id) 字符串比对对象数组恒 false → 已卸载应用在刷新后
        // 全部复活回桌面（且 removed-apps 清单仍列着它，形成状态分裂/重复条目）。改为按 id 字段比对，
        // 同时兼容历史纯字符串形状。
        const removedIds = new Set(
          removedList
            .map((r) => (r && typeof r === 'object' ? r.id : r))
            .filter((id) => typeof id === 'string' && id)
        );
        // fix(audit-D): savedIds 收集需递归下钻文件夹成员 —— parsed.flat() 深度 1，
        // folder.apps 内成员 id 不进 savedIds，会被误判为「新增应用」追加到末页，
        // 造成同一应用同时存在于文件夹内与桌面（随后任意一次保存固化重复）。
        /** @param {any[]} arr @param {Set<string>} out */
        const collectIds = (arr, out) => {
          for (const item of arr) {
            if (!item || typeof item.id !== 'string') continue;
            out.add(item.id);
            if (item.type === 'folder' && Array.isArray(item.apps)) {
              for (const m of item.apps) {
                if (m && typeof m.id === 'string') out.add(m.id);
              }
            }
          }
        };
        const savedIds = new Set();
        for (const page of parsed) collectIds(page, savedIds);
        const missing = _initialApps.filter((a) => !savedIds.has(a.id) && !removedIds.has(a.id));
        if (missing.length) {
          const lastPage = parsed[parsed.length - 1];
          const overflow = missing.filter((a) => {
            if (lastPage.length < 24) {
              lastPage.push({ ...a, slot: lastPage.length });
              return false;
            }
            return true; // 末页已满 → 落到新页
          });
          if (overflow.length) {
            parsed.push(overflow.map((a, i) => ({ ...a, slot: i })));
          }
        }
        return /** @type {DeskItem[][]} */ (parsed);
      }
    }
  } catch (e) {
    // fix(P3)：损坏存档静默降级无提示 —— 至少留下可诊断的日志（用户视角表现为
    // 桌面布局莫名重置），避免排查时无迹可循
    console.warn('[state] 桌面存档损坏或格式不兼容，已降级为默认布局', e);
  }
  return [_initialPage1, _initialPage2];
}

// 保存图标排列到 localStorage
export function savePagesApps() {
  try {
    localStorage.setItem('ios-desktop:pages-apps', JSON.stringify(state.pagesApps));
  } catch (e) {}
}

// 从 localStorage 加载已移除应用列表
/**
 * @returns {string[]}
 */
function loadRemovedApps() {
  try {
    const saved = localStorage.getItem('ios-desktop:removed-apps');
    if (saved) {
      const parsed = /** @type {any} */ (JSON.parse(saved));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

/** @type {DesktopState} */
export const state = {
  // ---- 桌面数据 ----
  pagesApps: loadPagesApps(),  // 从 localStorage 恢复，或使用默认值
  currentPage: 0,
  isEditMode: false,

  // ---- 已移除应用（从 localStorage 恢复） ----
  removedApps: loadRemovedApps(),

  // ---- 应用窗口 ----
  currentIconEl: null,
  currentApp: null,
  isOpen: false,
  isClosing: false,
  // 归属语义：当前关闭的应用源自某桌面文件夹，关闭动画需缩回该文件夹内部（浮层保持打开）
  returnToFolderOnClose: false,
  // v7.17 实况内容优先：当前应用实例是否「温热」（实例在场且 iframe 全部加载完毕）。
  // warm ⇒ 开窗交叉淡入走早曲线（实况内容几乎立即可见）、关窗内容全程可见；
  // cold（首次 iframe 加载中）保持旧慢曲线，启动屏掩护加载、关闭回落静态卡片。
  contentWarm: false,
  isDragging: false,
  rafId: null,
  // v7.57（issue #8）：渲染循环心跳时间戳（frame() 每帧刷新）——
  // visibility-heal 回前台自愈据此判断 rAF 链是否已被系统冻结丢弃
  //（切后台冻结后移动端 Chrome 可能不再续跑回调链，动画中间态永久钉屏）
  _frameHeartbeat: 0,
  iconCX: 0,
  iconCY: 0,
  iconW: 58,
  iconH: 58,

  // ---- 页面栈 ----
  navHistory: [0],
  // 子页面返回进行中：弹簧收敛后才真正弹出导航栈（杜绝 setTimeout 硬切跳变）
  popInProgress: false,
  // v7.41 预测式返回方向/垂直跟随：dir = 0 规范右滑入场 / 1 左缘右滑 / -1 右缘左滑；
  // ty = 手势期页面纵向位移 px（渲染时 × backProgress，随返回进度出现、落定自动归零）
  subpageBackDir: 0,
  subpageBackTy: 0,

  // ---- 物理弹簧 ----
  // 初始参数取当前动画曲线预设（设置 › 动画与动效 可切换）；
  // 每次开/关动画启动前都会以 curOpenParams()/curCloseParams() 重新校准。
  posSpring:      new Spring2D(curOpenParams(), 0, 0, 0, 0),
  scaleSpring:    new Spring({ ...curOpenParams(), initialValue: 0, initialVelocity: 0 }),
  subpageSpring:  new Spring({ ...curOpenParams(), initialValue: 0, initialVelocity: 0 }),

  // ---- 手势系统 ----
  gestureType: 'NONE',
  drag: { active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, history: [] },
  // v7.23：多任务卡片缩放模式（closeApp 带 shrinkTo 时置真）——
  // render 走「纯几何缩放」通道：关闭漏斗/倾斜/果冻/渐隐，全程不透明落进卡片
  shrinkToCard: false,

  // ---- 拖拽重排 ----
  longPressTimer: null,
  iconDragState: null,
  edgePagingTimer: null,
  mouseDown: false,
  // 最近一次窗口手势是否带位移（供触控分发器区分"拖拽收尾"与"轻点"）
  lastGestureMoved: false,
  lastGestureEndedAt: 0,
};

// 测试/调试暴露口（只读引用，供无头回归检查内部状态）
if (typeof window !== 'undefined') {
  (/** @type {any} */ (window)).__state = state;
}
