// ==================== page-stack.js — 多级页面栈导航与多任务常驻内存管理 ====================

import { state } from './state.js';
import { dom } from './dom.js';
import { closeApp, startLoop, renderSubPages } from './app-window.js';
import { registerNativeApp, installNativeClearTracking, setLiveApps, forgetApp } from './bg-freeze.js';
import { makeSpringParams } from './spring.js';
import { scaleAnimSpeed } from './animation-presets.js';

// 应用实例容器字典：保留每个已启动应用的运行状态与 DOM/iframe 内存
const appInstancesMap = new Map();

/**
 * v7.17 实况内容优先：应用实例是否「温热」。
 * 温热 = 实例在场且其全部 iframe 已完成加载（iframe 的 onload 会标记 dataset.loaded='1'，
 * 元素常驻内存故标记持久）；模块应用（无 iframe、内容同步注入 DOM）恒为温热。
 * —— 供 app-window 开/关动画选择交叉淡入曲线：
 *    warm  开窗实况内容早交叉、关窗内容全程可见（根治「静态截图卡」观感）；
 *    cold（首次 iframe 加载中）保持旧慢曲线，启动屏掩护加载、关闭回落静态卡片。
 * @param {string} appId
 * @returns {boolean}
 */
export function isAppInstanceWarm(appId) {
  const wrapper = appInstancesMap.get(appId);
  if (!wrapper) return false;
  const iframes = wrapper.querySelectorAll('iframe');
  for (const f of iframes) {
    if (!f.dataset || f.dataset.loaded !== '1') return false;
  }
  return true;
}

/** 根据 navHistory 渲染并激活当前应用的页面栈（无损保留在后台的应用实例） */
export function renderPageStack() {
  if (!state.currentApp) {
    appInstancesMap.forEach((el) => {
      // v7.17：被 Closing Actor 托管的活实例不随主窗口隐藏（它正在 Actor 里
      // 播放退场动画，display:none 会让 Actor 内容瞬间空白）
      if (!el.__actorHosted) el.style.display = 'none';
    });
    return;
  }

  const currentAppId = state.currentApp.id;

  // 隐藏其他已实例化的应用容器，保护状态与节省重绘
  appInstancesMap.forEach((el, appId) => {
    // v7.17：Actor 托管中的活实例保持可见（正在退场动画里展示实况内容）
    if (appId !== currentAppId && !el.__actorHosted) {
      el.style.display = 'none';
    }
  });

  let appWrapper = appInstancesMap.get(currentAppId);

  // 首次打开该应用时创建实例
  if (!appWrapper) {
    appWrapper = document.createElement('div');
    appWrapper.className = 'app-instance-wrapper';
    appWrapper.id = `app-instance-${currentAppId}`;
    appWrapper.style.width = '100%';
    appWrapper.style.height = '100%';
    appWrapper.style.position = 'absolute';
    appWrapper.style.inset = '0';

    state.currentApp.pages.forEach((page, idx) => {
      const pageEl = document.createElement('div');
      pageEl.className = 'app-page';
      pageEl.id = `app-page-${currentAppId}-${idx}`;
      pageEl.innerHTML = page.content;
      appWrapper.appendChild(pageEl);
    });

    // innerHTML 注入的 <script> 标签不会被执行；这里重新激活页面脚本。
    // 激活期间拦截 setInterval/setTimeout/rAF，把本应用的初始心跳登记进
    // bg-freeze 冻结中心（冻结时清空、回前台时重建）—— 智能冻结模式的数据面。
    activatePageScripts(appWrapper, currentAppId);

    dom.pageStack.appendChild(appWrapper);
    appInstancesMap.set(currentAppId, appWrapper);

    // 自动向新挂载的 iframe 注入主题与事件同步
    const newIframes = appWrapper.querySelectorAll('iframe');
    newIframes.forEach((iframe) => {
      if (window.__syncIframeApp) {
        window.__syncIframeApp(iframe);
      }
    });
  }

  appWrapper.style.display = 'block';

  // 根据当前 navHistory 更新该应用下所有页面的变换与层级
  const pages = appWrapper.querySelectorAll('.app-page');
  const activeNavIdx = state.navHistory[state.navHistory.length - 1];
  const prevNavIdx = state.navHistory.length > 1 ? state.navHistory[state.navHistory.length - 2] : -1;

  pages.forEach((pageEl, idx) => {
    if (idx === activeNavIdx) {
      pageEl.style.transform = 'translate3d(0, 0, 0) scale(1)';
      pageEl.style.opacity = '1';
      pageEl.style.filter = '';
      pageEl.style.borderRadius = '0';
      pageEl.style.boxShadow = '';
      pageEl.style.zIndex = '2';
      pageEl.style.pointerEvents = 'auto';
    } else if (idx === prevNavIdx) {
      // 一级菜单：保持在原位全尺寸，仅仅压暗
      pageEl.style.transform = 'translate3d(0, 0, 0) scale(1)';
      pageEl.style.opacity = '1';
      pageEl.style.filter = 'brightness(0.65)';
      pageEl.style.borderRadius = '0';
      pageEl.style.boxShadow = '';
      pageEl.style.zIndex = '1';
      pageEl.style.pointerEvents = 'none';
    } else {
      pageEl.style.transform = 'translate3d(100%, 0, 0)';
      pageEl.style.opacity = '0';
      pageEl.style.filter = '';
      pageEl.style.borderRadius = '0';
      pageEl.style.boxShadow = '';
      pageEl.style.zIndex = '3';
      pageEl.style.pointerEvents = 'none';
    }
  });

  if (state.navHistory.length > 1 && state.currentApp.pages[activeNavIdx]) {
    dom.backBtn.style.display = 'flex';
    dom.appTitle.textContent = state.currentApp.pages[activeNavIdx].title;
  } else {
    dom.backBtn.style.display = 'none';
    dom.appTitle.textContent = state.currentApp.name;
  }

  // 通知页面脚本当前页已激活（应用实例常驻内存，页面内容里的脚本只执行一次，
  // 动态数据型页面——如设置"已移除的应用"列表——靠该事件重建内容）
  if (pages[activeNavIdx]) {
    document.dispatchEvent(new CustomEvent('app-page-active', {
      detail: { appId: currentAppId, pageIdx: activeNavIdx },
    }));
  }

  // 智能冻结策略：前台应用保持运行，其余后台实例冻结（bg-freeze.js）
  try { setLiveApps([currentAppId]); } catch (e) {}
}

/**
 * 重新激活页面内嵌脚本（实例创建时调用一次）。
 * 激活窗口期临时接管全局定时器 API：应用脚本同步执行期间注册的
 * setTimeout/setInterval/rAF 全部登记进 bg-freeze 冻结中心，
 * 激活结束立即还原原生 API —— 不影响桌面与其余模块。
 */
function activatePageScripts(appWrapper, appId) {
  installNativeClearTracking();
  const reg = registerNativeApp(appId);
  const _setTimeout = window.setTimeout;
  const _setInterval = window.setInterval;
  const _requestAnimationFrame = window.requestAnimationFrame;

  window.setTimeout = function (fn, d, ...rest) {
    if (typeof fn !== 'function') return _setTimeout(fn, d, ...rest);
    const id = _setTimeout(fn, d, ...rest);
    reg.timeouts.set(id, { fn, d, args: rest });
    return id;
  };
  window.setInterval = function (fn, d, ...rest) {
    if (typeof fn !== 'function') return _setInterval(fn, d, ...rest);
    const id = _setInterval(fn, d, ...rest);
    reg.intervals.set(id, { fn, d, args: rest });
    return id;
  };
  // rAF 链首环套上冻结门卫：冻结期回调被吞，循环链自然断流
  window.requestAnimationFrame = function (cb) {
    return _requestAnimationFrame.call(window, (t) => {
      if (reg.frozen) return undefined;
      return cb(t);
    });
  };

  try {
    reactivateScripts(appWrapper);
  } finally {
    window.setTimeout = _setTimeout;
    window.setInterval = _setInterval;
    window.requestAnimationFrame = _requestAnimationFrame;
  }
}

/**
 * innerHTML 注入的 <script> 标签不会执行：逐个重建以激活。
 * 供 page-stack 与 split-screen 共用（同为 content 模板挂载路径）。
 */
export function reactivateScripts(container) {
  container.querySelectorAll('script').forEach((oldScript) => {
    const newScript = document.createElement('script');
    newScript.textContent = oldScript.textContent;
    if (oldScript.type) newScript.type = oldScript.type;
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}

/**
 * 按有效导航深度刷新返回键与标题。
 * @param {number} popOffset 预扣的待弹出层数（返回动画开始时标题立即切到上级，栈稍后弹出）
 */
function updateNavHeader(popOffset = 0) {
  const depth = state.navHistory.length - popOffset;
  if (depth > 1 && state.currentApp) {
    const topIdx = state.navHistory[depth - 1];
    dom.backBtn.style.display = 'flex';
    dom.appTitle.textContent = state.currentApp.pages[topIdx] ? state.currentApp.pages[topIdx].title : state.currentApp.name;
  } else {
    dom.backBtn.style.display = 'none';
    if (state.currentApp) dom.appTitle.textContent = state.currentApp.name;
  }
}

// ==================== APP_CLOSE 生命周期广播（内存泄漏治理） ====================
// 应用实例常驻内存的设计下，iframe 子应用（如 threes 的 GM AI 推演定时链、stocks 的 10s 轮询、
// clock-app 的主循环）即使页面隐藏也持续持有定时器/监听器。销毁实例前先向每个 iframe 广播
// { type: 'APP_CLOSE' }，让子应用自行清理定时器与事件监听；随后保留短暂宽限期再摘除 DOM ——
// iframe 一旦从文档移除其浏览上下文立即销毁，排队中的 message 任务将永远无法送达。
const APP_CLOSE_GRACE_MS = 220;

// ==================== 内联脚本 document 监听登记（实例销毁自动退订） ====================
// 模块应用（设置/文件/录音机等）实例常驻内存、内联脚本仅执行一次，但实例销毁后
// 重新打开会重建实例并重跑脚本：若脚本直接 document.addEventListener，每次重建
// 都会净增一批全局监听（实测设置应用每轮累积 17 个）。统一改走登记口，销毁时集中退订。
const appDocListenerRegistry = new Map(); // appId -> Array<{ type, fn, opts }>
const appCleanupRegistry = new Map();     // appId -> Array<Function>（自定义清理，如 vfs 退订）

/**
 * 退订某应用登记的全部 document 监听并执行自定义清理。
 * @param {string} appId
 * @param {{onlyIfNoInstance?: boolean}} [opts] 分屏窗格关闭路径传 true：
 *        若同名应用已重建 page-stack 实例（分屏期间全屏重开同一应用），
 *        则保留其登记，避免误删活跃实例的监听。
 */
export function releaseAppListeners(appId, opts = {}) {
  if (opts.onlyIfNoInstance && appInstancesMap.has(appId)) return;
  const docList = appDocListenerRegistry.get(appId);
  if (docList) {
    appDocListenerRegistry.delete(appId);
    docList.forEach(({ type, fn, opts: listenOpts }) => {
      try { document.removeEventListener(type, fn, listenOpts); } catch (e) {}
    });
  }
  const cleanupList = appCleanupRegistry.get(appId);
  if (cleanupList) {
    appCleanupRegistry.delete(appId);
    cleanupList.forEach((fn) => { try { fn(); } catch (e) {} });
  }
}

if (typeof window !== 'undefined') {
  // 模块应用内联脚本专用：document 级监听统一登记，实例销毁时自动退订
  // v7.1 修复：兼容 wrapper 多包一层 appId 的调用形态 (appId, appId, type, realFn)，
  //   否则内联脚本把字符串当 listener 传入 → addEventListener 抛
  //   "parameter 2 is not of type 'Object'" → 子页脚本中断、render() 永不执行。
  window.__bindAppDocListener = function (appId, type, fn, opts) {
    if (typeof fn !== 'function' && typeof opts === 'function') {
      type = fn; fn = opts; opts = undefined;
    }
    document.addEventListener(type, fn, opts);
    let list = appDocListenerRegistry.get(appId);
    if (!list) { list = []; appDocListenerRegistry.set(appId, list); }
    list.push({ type, fn, opts });
  };
  // 自定义清理登记（如 VFS/剪贴板订阅退订函数）
  window.__addAppCleanup = function (appId, fn) {
    if (typeof fn !== 'function') return;
    let list = appCleanupRegistry.get(appId);
    if (!list) { list = []; appCleanupRegistry.set(appId, list); }
    list.push(fn);
  };
}

/** 向应用实例内全部 iframe 广播 APP_CLOSE 生命周期事件 */
export function broadcastAppClose(wrapperEl) {
  if (!wrapperEl || !wrapperEl.querySelectorAll) return;
  wrapperEl.querySelectorAll('iframe').forEach((iframe) => {
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'APP_CLOSE' }, '*');
      }
    } catch (e) { /* 跨域或上下文已销毁时忽略 */ }
  });
}

/** 宽限期后摘除实例 DOM（立即隐藏并摘除 id，防止重复 id 与僵尸节点被查询命中） */
function scheduleInstanceRemoval(wrapperEl) {
  wrapperEl.style.display = 'none';
  wrapperEl.removeAttribute('id');
  setTimeout(() => {
    if (wrapperEl && wrapperEl.parentNode) {
      wrapperEl.parentNode.removeChild(wrapperEl);
    }
  }, APP_CLOSE_GRACE_MS);
}

/** 销毁指定应用的内存与 DOM 实例（多任务关闭时调用） */
export function destroyAppInstance(appId) {
  if (appInstancesMap.has(appId)) {
    const el = appInstancesMap.get(appId);
    appInstancesMap.delete(appId);
    try { forgetApp(appId); } catch (e) {} // 冻结中心登记同步清理
    broadcastAppClose(el);
    scheduleInstanceRemoval(el);
  }
  // 内联脚本登记的 document 监听/订阅集中退订（重建实例前必清，防累积泄漏）
  releaseAppListeners(appId);
  // 无论 Map 中是否存在都广播：其他模块可借此做自身清理
  document.dispatchEvent(new CustomEvent('app-instance-destroyed', { detail: { appId } }));
}

/** 清除所有已实例化的应用内存 */
export function clearAllAppInstances() {
  const all = Array.from(appInstancesMap.entries());
  appInstancesMap.clear();
  all.forEach(([appId, el]) => {
    try { forgetApp(appId); } catch (e) {}
    broadcastAppClose(el);
    scheduleInstanceRemoval(el);
    releaseAppListeners(appId);
  });
  // 同上：逐一广播，其他模块可借此做自身清理
  all.forEach(([appId]) => {
    document.dispatchEvent(new CustomEvent('app-instance-destroyed', { detail: { appId } }));
  });
}

/** 推入子页面（正向导航） */
export function pushSubPage(pageIdx) {
  if (!state.currentApp || pageIdx >= state.currentApp.pages.length) return;

  // 同页幂等守卫：目标页已是栈顶时不再重复压栈（防双击把同一页压两次、
  // 动画中途被拉回最右重新起滑）。返回途中重推同页 = 取消返回继续前进。
  if (state.navHistory[state.navHistory.length - 1] === pageIdx) {
    state.popInProgress = false;
    if (state.subpageSpring.target !== 1) {
      state.subpageSpring.setTarget(1);
      startLoop();
    }
    return;
  }

  // 多级菜单/子页展开：利落从右侧滑出，单步到位无回弹
  // v7.18：经 scaleAnimSpeed 套用开发者「动画倍率」（与开合/切换动画同一时间轴）
  const snappySubpageParams = scaleAnimSpeed(makeSpringParams(0.26, 1.0, 1));
  state.subpageSpring.reconfigure(snappySubpageParams);

  if (state.popInProgress) {
    // 返回途中再次前进：取消待弹栈，继承弹簧当前位置/速度 → 无缝反转
    state.popInProgress = false;
    state.navHistory.push(pageIdx);
    renderPageStack();
    state.subpageSpring.setTarget(1);
  } else {
    state.navHistory.push(pageIdx);
    renderPageStack();
    // 全新推入：进度归零起滑；同步写出第 0 帧位姿，
    // 消除“renderPageStack 先摆到位 → 下一帧又从最右开始滑”的单帧闪现
    state.subpageSpring.x = 0;
    state.subpageSpring.v = 0;
    state.subpageSpring.setTarget(1, 0);
  }
  renderSubPages(true);
  startLoop();
}

/**
 * 弹出子页面（返回上级）—— 统一弹簧物理。
 * 弹簧收敛后由主循环执行真正的 navHistory.pop()，动画到位才交接，
 * 与推入共用同一套弹簧参数，来回物理完全对称；支持继承手势释放速度。
 * @param {number} velocity 弹簧初速（进度单位/秒，边缘拖拽释放时传入）
 */
export function popSubPage(velocity = 0) {
  if (!state.currentApp) return;

  if (state.navHistory.length > 1) {
    if (state.popInProgress) return; // 返回动画进行中忽略连点（与 iOS 一致）
    state.popInProgress = true;
    // v7.18：同上 —— 返回弹簧也套用动画倍率
    const snappySubpageParams = scaleAnimSpeed(makeSpringParams(0.24, 1.0, 1));
    state.subpageSpring.reconfigure(snappySubpageParams);
    state.subpageSpring.setTarget(0, velocity);
    updateNavHeader(1); // 标题/返回键立即切到上级页面
    startLoop();
  } else {
    closeApp(0, 0, 0);
  }
}



