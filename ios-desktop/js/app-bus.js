// ==================== app-bus.js — 应用间通信总线（App-to-App Bridge） ====================
// 设计目标：让 29 个应用从"各玩各的"走向系统级联动（建议文档·第一档 #1）。
// 通信拓扑：iframe 子应用 --(BUS_EMIT)--> 桌面总线 --(BUS_DELIVER)--> 目标/全部活跃 iframe
//          桌面父模块也可通过 onBusEvent() 订阅同一份应用事件流。
//
// 子应用侧统一走桌面注入的 window.__system SDK（见 main.js 注入脚本）：
//   __system.emit(event, payload, targetAppId?)       定向投递（不传 target 则广播）
//   __system.notify({ appId, appName, title, desc })  统一通知 API
//   __system.requestPermission('camera')              统一权限（见 permissions.js）
//
// 投递语义（对齐 Android"后台收到消息"的系统直觉）：
//   1. 目标实例存活且可见（前台 / 分屏窗格）→ 静默送达，由应用自行刷新 UI
//   2. 目标实例存活但在后台（display:none 常驻内存）→ 送达 + 桌面代发一条通知横幅
//   3. 目标实例不存在 → 消息进入排队队列，待实例下次挂载（__syncIframeApp 钩子）补投
//
// 已实装的首批联动场景：
//   - notes --share/memo--> msg      便签一键分享为"自我对话与备忘"里的新消息
//   - camera --photo/captured--> photo  相机拍照后相册自动出现新照片

import { addSystemNotification } from './notifications.js';
import { ICONS } from './icons.js';
import { getAppIconSVG, hasAppIcon } from './app-icons.js';
import { initialApps } from './apps-data.js';

const MAX_PENDING_PER_APP = 24; // 每应用排队上限，防止 dataURL 级大消息无限堆积

/** 未启动应用的待投递队列：appId → [{ event, payload, from, at }] */
const pendingDeliveries = new Map();

/** 父窗口模块订阅表：event → Set<handler(payload, { from, target })> */
const parentListeners = new Map();

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function appNameOf(appId) {
  const app = initialApps.find((a) => a.id === appId);
  return app ? app.name : (appId || '未知应用');
}

/** 根据事件源 window 反查所属应用 id（常驻实例容器 + 分屏窗格双向扫描） */
// v7.19 起导出：share-sheet.js 的 SHARE_OPEN / OPEN_APP 深链路由需要同样的来源反查
export function inferSenderAppId(sourceWindow) {
  if (!sourceWindow) return '';
  let found = '';
  document.querySelectorAll('.app-instance-wrapper, [data-bus-app-id]').forEach((el) => {
    if (found) return;
    el.querySelectorAll('iframe').forEach((iframe) => {
      try {
        if (iframe.contentWindow === sourceWindow) {
          found = el.getAttribute('data-bus-app-id') || (el.id || '').replace('app-instance-', '');
        }
      } catch (e) { /* 跨域/上下文销毁时忽略 */ }
    });
  });
  return found;
}

/** 向指定应用的所有 iframe（常驻实例 + 分屏窗格）投递信封；返回 { delivered, visible } */
function postToApp(appId, envelope) {
  let delivered = false;
  let visible = false;

  const deliver = (rootEl) => {
    if (!rootEl || !rootEl.querySelectorAll) return;
    rootEl.querySelectorAll('iframe').forEach((iframe) => {
      try {
        if (!iframe.contentWindow) return;
        // 真实文档尚未加载完成（onload 未触发）：此刻 postMessage 会打进 about:blank
        // 而丢失，视为未送达 → 交由排队机制在加载就绪后补投（见 flushPendingForIframe）
        if (iframe.dataset.loaded !== '1') return;
        iframe.contentWindow.postMessage(envelope, '*');
        delivered = true;
        // 可见性判定：display:none 的后台常驻实例不算"可见"
        if (rootEl.offsetParent !== null) visible = true;
      } catch (e) { /* 上下文已销毁时忽略 */ }
    });
  };

  // 1) 常驻实例容器（page-stack.js 挂载，id 形如 app-instance-msg）
  deliver(document.getElementById(`app-instance-${appId}`));
  // 2) 分屏窗格（split-screen.js 挂载，data-bus-app-id 标记）
  document.querySelectorAll(`[data-bus-app-id="${appId}"]`).forEach((el) => {
    if (el.id === `app-instance-${appId}`) return; // 与 1) 去重
    deliver(el);
  });

  return { delivered, visible };
}

/** 事件 → 后台代发通知（文案优先取发送者在 payload.noti 中自带的内容） */
function deliveryNotification(appId, event, payload, from) {
  // 系统同步类事件（如世界时钟钉选回填）不产生用户通知：payload.__silent = true
  if (payload && payload.__silent) return;
  const noti = (payload && payload.noti) || null;
  const title = (noti && noti.title) || `${appNameOf(from) || '某应用'} 分享到 ${appNameOf(appId)}`;
  let desc = (noti && noti.desc) || '';
  if (!desc) {
    if (event === 'share/memo') desc = String((payload && (payload.title || payload.text)) || '').slice(0, 60) || '收到一条便签分享';
    else if (event === 'photo/captured') desc = '相机拍摄的照片已同步到相册';
    else if (event === 'files/share') desc = '收到一个来自「文件」的分享内容';
    else desc = '收到一条跨应用消息';
  }
  addSystemNotification({
    id: 'bus-' + Date.now() + '-' + Math.floor(Math.random() * 1e4),
    app: appNameOf(appId),
    appId,
    // 通知图标与桌面保持一致：优先取目标应用的真实桌面图标，无则回退系统 info 图标
    iconSvg: hasAppIcon(appId) ? getAppIconSVG(appId) : ICONS.notification_system,
    title: escapeHtml(title),
    desc: escapeHtml(desc),
    time: '刚刚',
    category: '应用联动 / App Link',
  });
}

function queueFor(appId, entry) {
  if (!pendingDeliveries.has(appId)) pendingDeliveries.set(appId, []);
  const list = pendingDeliveries.get(appId);
  list.push(entry);
  if (list.length > MAX_PENDING_PER_APP) list.shift(); // FIFO 淘汰最旧
}

/**
 * 定向投递：目标可见 → 静默送达；存活但在后台 → 送达并代发通知；
 * 实例不存在 → 排队，等实例挂载后由 flushPendingForIframe 补投。
 */
export function emitToApp(appId, event, payload, from) {
  if (!appId || !event) return;
  // v7.6：相机拍照同步落入虚拟文件系统 /photos —— 此前照片只存在相机应用自己的
  // localStorage 相册里，「文件」管理器的 photos 目录永远看不到拍摄产物
  if (event === 'photo/captured' && from === 'camera') persistCapturedPhoto(payload);
  const { delivered, visible } = postToApp(appId, { type: 'BUS_DELIVER', event, payload, from });
  if (delivered && !visible) {
    deliveryNotification(appId, event, payload, from);
  } else if (!delivered) {
    queueFor(appId, { event, payload, from, at: Date.now() });
  }
}

/** 相机照片 → VFS /photos（dataURL 直存；文件名冲突自动追加序号；失败静默不影响总线） */
function persistCapturedPhoto(payload) {
  try {
    const V = window.__vfs;
    if (!V || typeof V.write !== 'function' || typeof V.exists !== 'function') return;
    if (!payload || typeof payload.src !== 'string' || !payload.src.startsWith('data:image')) return;
    let name = String(payload.name || '').trim() || `IMG_${Date.now()}.jpg`;
    if (!/\.[a-z0-9]+$/i.test(name)) name += '.jpg';
    let finalPath = '/photos/' + name;
    let n = 2;
    while (V.exists(finalPath)) {
      const dot = name.lastIndexOf('.');
      finalPath = `/photos/${name.slice(0, dot)} (${n})${name.slice(dot)}`;
      n++;
      if (n > 99) break;
    }
    V.write(finalPath, payload.src, { owner: 'camera' });
  } catch (e) { /* 存储不可用（配额满/IDB 异常）时相机相册仍保有原片 */ }
}

/** 广播给全部"存活"应用（除发送者）；广播不排队——只影响当前活跃实例 */
export function broadcast(event, payload, from, exceptAppId) {
  const seen = new Set();
  document.querySelectorAll('.app-instance-wrapper, [data-bus-app-id]').forEach((el) => {
    const appId = el.getAttribute('data-bus-app-id') || (el.id || '').replace('app-instance-', '');
    if (!appId || appId === exceptAppId || seen.has(appId)) return;
    seen.add(appId);
    const { delivered, visible } = postToApp(appId, { type: 'BUS_DELIVER', event, payload, from });
    if (delivered && !visible) deliveryNotification(appId, event, payload, from);
  });
}

/** 父窗口模块订阅应用事件流（如未来的 At a Glance 微件联动） */
export function onBusEvent(event, handler) {
  if (!parentListeners.has(event)) parentListeners.set(event, new Set());
  parentListeners.get(event).add(handler);
  return () => {
    const set = parentListeners.get(event);
    if (set) set.delete(handler);
  };
}

function notifyParentListeners(event, payload, meta) {
  const set = parentListeners.get(event);
  if (!set) return;
  set.forEach((fn) => { try { fn(payload, meta); } catch (e) { /* 订阅者异常不影响总线 */ } });
}

/**
 * 实例挂载补投递 —— 由 main.js 的 __syncIframeApp 在 iframe 同步时调用。
 * 注意 __syncIframeApp 会在"实例创建时"与"iframe onload 时"各触发一次：
 * 创建时真实文档尚未加载，此处只做轮询等待，直到 iframe.dataset.loaded === '1'
 * （见 iframe-app.js 的 onload 属性）才真正投递 —— 那时子应用自身的
 * message 监听（HTML 解析期注册）必然已就绪。
 */
export function flushPendingForIframe(iframe) {
  if (!iframe || !iframe.closest) return;
  const holder = iframe.closest('.app-instance-wrapper, [data-bus-app-id]');
  if (!holder) return;
  const appId = holder.getAttribute('data-bus-app-id') || (holder.id || '').replace('app-instance-', '');
  if (!appId || !pendingDeliveries.has(appId)) return;

  let tries = 40; // ~4s 上限，防止 iframe 加载失败时空轮询
  const attempt = () => {
    const cur = pendingDeliveries.get(appId);
    if (!cur || !cur.length) return; // 已被其它触发点投递或已清空
    if (iframe.dataset.loaded === '1') {
      pendingDeliveries.set(appId, []);
      setTimeout(() => {
        cur.forEach((entry) => {
          postToApp(appId, { type: 'BUS_DELIVER', event: entry.event, payload: entry.payload, from: entry.from });
        });
      }, 60); // 再留一拍给应用初始化收尾
    } else if (tries-- > 0) {
      setTimeout(attempt, 100);
    }
  };
  attempt();
}

/** 初始化总线：注册全局消息路由 + 暴露父模块/调试入口 */
export function initAppBus() {
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'BUS_EMIT' || !d.event) return;
    const from = inferSenderAppId(e.source);
    if (d.target) {
      emitToApp(d.target, d.event, d.payload, from);
    } else {
      broadcast(d.event, d.payload, from, from);
    }
    notifyParentListeners(d.event, d.payload, { from, target: d.target || null });
  });

  // 父窗口模块与开发者调试入口（控制台可直接 window.__appBus.emit(...)）
  // 对外签名与子应用 SDK 保持一致：emit(event, payload, targetAppId)
  window.__appBus = {
    emit: (event, payload, targetAppId) => emitToApp(targetAppId, event, payload, ''),
    broadcast: (event, payload) => broadcast(event, payload, ''),
    on: onBusEvent,
    flush: flushPendingForIframe,
    pending: () => Object.fromEntries(pendingDeliveries),
  };
}
