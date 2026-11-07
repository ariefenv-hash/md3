// ==================== gesture-bubble-core.js — 三段手势侧边栏小窗 状态机纯核 ====================
// #253（R125 窗 · 2026-11-08 06:00 槽 · Job 2931605）立卡施工第一段（§五 可拆路径）：
// 状态机纯函数核 + 几何/图标/开关纯判定，零 DOM 依赖（范式对齐 window-actor-lease-core.js）。
// 壳层 pointer 接线（pointer events + 跟手渲染）与侧边栏 UI（最近应用列 + 小窗容器）
// 留下一窗实施；本核只做「输入事件 → 状态迁移 → 效果声明」的纯判定。
//
// 三段手势（鸿蒙智慧多窗标志性交互，思路提取非移植）：
//   一段 · 弧形液滴跟手：右缘横向滑出，液滴跟手位移（小→大形态渐变，弧形轨迹贴边）；
//   二段 · 预设距离分离：拖出越过阈值后液滴分离为独立小球（两态图标：箭头/圆形可逆）；
//   三段 · 松手呼出：松手小球停驻边缘 → 呼出侧边栏（最近应用列）→ 点选应用小窗打开。
//
// 消费关系（#253 §二 权界裁决，壳层施工时遵守）：
//   · 与 #93 PIP 独立不合并：侧边栏点选后的小窗打开/拖拽/最小化复用 #93 既有层级管理
//     API，本核只声明 OPEN_MINI_WINDOW 意图，不触碰窗口管理实现；
//   · 最近应用列来自 app-bus 真实打开记录（验收④），本核不硬编码应用清单；
//   · 不引入新全局 window.__（登记表闸门 #242 语义）：本模块纯 ESM export，壳层经
//     import 接线。
//
// ⚠️ 数值纪律（#253 §二 前置裁决 · 退级规则 #18 §7.2b / #170 同律）：下方常量区全部
//    数值为【自创】——华为专利 WO2026108297A1 文本可考机制不公开数值，无公开权威值。
//    自创标注三处以上（本头注 + 常量区逐条 + 测试锚），常量集中本头部单点，方便后续
//    真机调参；壳层与测试不得散写魔法数，一律 import 本区常量。

// ---------- 常量区（全部自创 · WO2026108297A1 思路提取 · 非权威值） ----------

/** 右缘手势捕获区宽度 px：指针按下落点距右缘 ≤ 此值才进入液滴跟踪。【自创】 */
export const EDGE_CAPTURE_WIDTH_PX = 24;

/** 液滴→小球分离阈值 px：跟手拖出位移 ≥ 此值即分离（二段起点）。【自创】 */
export const SEPARATE_DISTANCE_PX = 96;

/** 液滴最小半径 px（起手贴边态）。【自创】 */
export const DROPLET_MIN_RADIUS_PX = 10;

/** 液滴最大半径 px（逼近分离阈值时的形态渐变终点）。【自创】 */
export const DROPLET_MAX_RADIUS_PX = 18;

/** 弧形外凸系数：液滴中心垂直偏移峰值 = ARC_BULGE_RATIO × SEPARATE_DISTANCE_PX × sin(progress·π)，【自创】 */
export const ARC_BULGE_RATIO = 0.35;

/** 拖出位移→液滴半径的缓动指数（>0.5 先快后慢的 ease-out 体感）。【自创】 */
export const RADIUS_EASE_EXP = 0.6;

/** 分离后小球停驻时距屏幕右缘 px（侧边栏呼出前的停驻落点）。【自创】 */
export const BUBBLE_SETTLE_GAP_PX = 12;

/** 未达阈值松手的回弹时长 ms（液滴缩回右缘的过渡窗口，壳层动画用）。【自创】 */
export const REBOUND_MS = 220;

// ---------- 枚举区 ----------

/** 有限状态集合（四态） */
export const BUBBLE_STATE = Object.freeze({
  IDLE: 'idle',           // 待机：无手势在途
  DROPLET: 'droplet',     // 一段：弧形液滴跟手（未达分离阈值）
  SEPARATED: 'separated', // 二段：已分离为独立小球（跟手中）
  SIDEBAR: 'sidebar',     // 三段：侧边栏已呼出，小球停驻边缘
});

/** 输入事件集合（壳层 pointer 事件 + 侧边栏交互转译） */
export const BUBBLE_EVENT = Object.freeze({
  POINTER_DOWN: 'pointerdown',
  POINTER_MOVE: 'pointermove',
  POINTER_UP: 'pointerup',
  POINTER_CANCEL: 'pointercancel',
  SIDEBAR_SELECT: 'sidebar-select',
  SIDEBAR_DISMISS: 'sidebar-dismiss',
});

/** 效果声明集合：状态机只声明意图，副作用由壳层执行（纯核零 DOM） */
export const BUBBLE_EFFECT = Object.freeze({
  RENDER_DROPLET: 'render-droplet',     // 跟手渲染液滴（payload 携带 dropletGeometry 结果）
  RENDER_SEPARATED: 'render-separated', // 渲染分离小球（两态图标 circle）
  REBOUND: 'rebound',                   // 未达阈值松手：液滴缩回右缘（REBOUND_MS 窗口）
  SHOW_SIDEBAR: 'show-sidebar',         // 呼出侧边栏（最近应用列）
  OPEN_MINI_WINDOW: 'open-mini-window', // 点选应用：交 #93 层级管理以小窗打开
  HIDE_BUBBLE: 'hide-bubble',           // 小球收回/清账（侧边栏关闭或系统打断）
});

// ---------- 纯判定函数 ----------

/**
 * 能力开关判定（旗标化模型，对齐 AOSP 16 desktop windowing「总开关 + 宽度门槛」结构）。
 * #253 验收①口径：手机态与平板态全链路均可用 —— 故默认门槛 0（全尺寸可用）；
 * 手机/平板双断点的具体宽度属壳层 CSS/布局职责，本核不管控宽度、只留门槛旗标位，
 * 壳层设置页接总开关时同口径。
 * @param {{enabled: boolean, minWindowPx?: number}} config 开关配置
 * @param {number} windowWidthPx 当前窗口宽 px
 * @returns {boolean}
 */
export function bubbleEnabled(config, windowWidthPx) {
  if (!config || config.enabled !== true) return false;
  const min = Number.isFinite(config.minWindowPx) ? config.minWindowPx : 0;
  return Number.isFinite(windowWidthPx) && windowWidthPx >= min;
}

/**
 * 右缘捕获区判定：落点距右缘 ≤ EDGE_CAPTURE_WIDTH_PX 才允许进入一段。
 * @param {number} x 指针落点 x px
 * @param {number} windowWidthPx 窗口宽 px
 * @param {number} [captureW] 捕获区宽（默认常量，测试可注入）
 * @returns {boolean}
 */
export function isEdgeCapture(x, windowWidthPx, captureW = EDGE_CAPTURE_WIDTH_PX) {
  if (!Number.isFinite(x) || !Number.isFinite(windowWidthPx) || windowWidthPx <= 0) return false;
  const w = Number.isFinite(captureW) ? captureW : EDGE_CAPTURE_WIDTH_PX;
  return x >= windowWidthPx - w && x <= windowWidthPx;
}

/**
 * 两态图标判定（可逆）：拖出位移 < 分离阈值 → 'arrow'（拉出中），≥ 阈值 → 'circle'
 * （已分离小球）；拉回阈值以下自动回到 'arrow'（验收②「两态图标可逆」）。
 * @param {number} pullPx 跟手拖出位移 px（负值按 0 处理）
 * @returns {'arrow'|'circle'}
 */
export function bubbleIconState(pullPx) {
  const pull = Number.isFinite(pullPx) ? Math.max(0, pullPx) : 0;
  return pull >= SEPARATE_DISTANCE_PX ? 'circle' : 'arrow';
}

/**
 * 弧形液滴几何（一段跟手渲染的唯一真源）。
 * 轨迹模型【自创】：液滴中心沿右缘向屏幕内跟手（x 随 pull 线性左移），垂直方向按
 * sin(progress·π) 上拱 —— 起点与分离点贴边（偏移 0）、中段外凸最大，形成「贴边弧形」；
 * 半径随 progress 按 ease 幂（RADIUS_EASE_EXP）从小到大渐变（小→大形态渐变）。
 * @param {number} pullPx 跟手拖出位移 px（负值按 0 处理）
 * @param {number} anchorY 指针按下时的 y px（弧线锚点）
 * @param {number} windowWidthPx 窗口宽 px
 * @returns {{progress:number, x:number, y:number, radius:number, icon:'arrow'|'circle', separated:boolean}}
 */
export function dropletGeometry(pullPx, anchorY, windowWidthPx) {
  const pull = Number.isFinite(pullPx) ? Math.max(0, pullPx) : 0;
  const width = Number.isFinite(windowWidthPx) && windowWidthPx > 0 ? windowWidthPx : 0;
  const progress = Math.min(1, pull / SEPARATE_DISTANCE_PX);
  // x：起手时液滴中心贴右缘（留出停驻间隙位），随 pull 线性向屏幕内移动
  const x = width - BUBBLE_SETTLE_GAP_PX - pull;
  // y：贴边弧形 —— sin(progress·π) 起终为 0、中段峰值，负号 = 向上拱起
  const bulgePx = ARC_BULGE_RATIO * SEPARATE_DISTANCE_PX * Math.sin(progress * Math.PI);
  const y = (Number.isFinite(anchorY) ? anchorY : 0) - bulgePx;
  // radius：ease-out 幂渐变（小→大）
  const radius =
    DROPLET_MIN_RADIUS_PX +
    (DROPLET_MAX_RADIUS_PX - DROPLET_MIN_RADIUS_PX) * Math.pow(progress, RADIUS_EASE_EXP);
  return {
    progress,
    x,
    y,
    radius,
    icon: bubbleIconState(pull),
    separated: pull >= SEPARATE_DISTANCE_PX,
  };
}

// ---------- 有限状态机 ----------

/**
 * 创建三段手势状态机（纯逻辑单例，零 DOM）。
 * 用法：const m = createBubbleMachine(); m.send(EVENT, payload) → { state, effects, payload?, rejected? }
 * 非法事件一律 rejected 且状态不变（拒绝即清白，不静默吞）。
 */
export function createBubbleMachine() {
  let state = BUBBLE_STATE.IDLE;

  const emit = (next, effects, extra) => ({ state: (state = next), effects, ...extra });

  return {
    get state() {
      return state;
    },
    /**
     * @param {string} event BUBBLE_EVENT 之一
     * @param {object} [payload]
     *   POINTER_DOWN: {x, y, windowWidthPx} —— 壳层落点；捕获区判定在本核内做
     *   POINTER_MOVE: {pullPx}
     *   SIDEBAR_SELECT: {appId} —— 透传给 OPEN_MINI_WINDOW 效果
     */
    send(event, payload = {}) {
      const reject = () => ({ state, effects: [], rejected: true });
      switch (event) {
        // —— 进入一段：仅 IDLE 态接受按下，且落点须在右缘捕获区 ——
        case BUBBLE_EVENT.POINTER_DOWN: {
          if (state !== BUBBLE_STATE.IDLE) return reject();
          const { x, y, windowWidthPx } = payload;
          if (!isEdgeCapture(x, windowWidthPx)) return reject();
          const geo = dropletGeometry(0, y, windowWidthPx);
          return emit(BUBBLE_STATE.DROPLET, [BUBBLE_EFFECT.RENDER_DROPLET], { geometry: geo });
        }

        // —— 一段/二段跟手：过阈值升二段，未过阈值维持一段；二段拉回阈值下可逆降回一段 ——
        case BUBBLE_EVENT.POINTER_MOVE: {
          if (state !== BUBBLE_STATE.DROPLET && state !== BUBBLE_STATE.SEPARATED) return reject();
          const geo = dropletGeometry(payload.pullPx, payload.anchorY ?? 0, payload.windowWidthPx ?? 0);
          if (geo.separated) {
            return emit(BUBBLE_STATE.SEPARATED, [BUBBLE_EFFECT.RENDER_SEPARATED], { geometry: geo });
          }
          // 未达阈值：无论自一段还是二段拉回，皆落一段（两态图标回 arrow，可逆）
          return emit(BUBBLE_STATE.DROPLET, [BUBBLE_EFFECT.RENDER_DROPLET], { geometry: geo });
        }

        // —— 松手分流（三段判定）：达阈值呼出侧边栏；未达阈值回弹取消 ——
        case BUBBLE_EVENT.POINTER_UP: {
          if (state === BUBBLE_STATE.DROPLET) return emit(BUBBLE_STATE.IDLE, [BUBBLE_EFFECT.REBOUND]);
          if (state === BUBBLE_STATE.SEPARATED) return emit(BUBBLE_STATE.SIDEBAR, [BUBBLE_EFFECT.SHOW_SIDEBAR]);
          return reject();
        }

        // —— 系统打断清账：任何在途态立即回 IDLE 并收回浮层 ——
        case BUBBLE_EVENT.POINTER_CANCEL: {
          if (state === BUBBLE_STATE.DROPLET || state === BUBBLE_STATE.SEPARATED)
            return emit(BUBBLE_STATE.IDLE, [BUBBLE_EFFECT.HIDE_BUBBLE]);
          return reject();
        }

        // —— 侧边栏交互（三段落点后）——
        case BUBBLE_EVENT.SIDEBAR_SELECT: {
          if (state !== BUBBLE_STATE.SIDEBAR) return reject();
          return emit(BUBBLE_STATE.IDLE, [BUBBLE_EFFECT.OPEN_MINI_WINDOW, BUBBLE_EFFECT.HIDE_BUBBLE], { appId: payload.appId });
        }
        case BUBBLE_EVENT.SIDEBAR_DISMISS: {
          if (state !== BUBBLE_STATE.SIDEBAR) return reject();
          return emit(BUBBLE_STATE.IDLE, [BUBBLE_EFFECT.HIDE_BUBBLE]);
        }

        default:
          return reject();
      }
    },
  };
}
