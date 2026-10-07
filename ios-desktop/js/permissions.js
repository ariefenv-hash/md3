// ==================== permissions.js — 统一权限系统（MD3 运行时权限对话框） ====================
// 对齐真 Android 的权限仪式感（建议文档·第二档 #4）：
//   - 子应用调用敏感 API（相机/麦克风/位置/通知/剪贴板）前，先经桌面弹出 MD3 权限对话框
//   - 用户可选「拒绝 / 仅本次 / 允许」；允许与拒绝持久化到 localStorage，仅本次不持久化
//   - 设置 › 应用权限管理 可随时查看与改判；「重置全部权限」恢复到未询问状态
//   - 拒绝后子应用自行走降级路径（如天气 GPS 被拒 → 自动切 IP 定位）
//
// 通信协议（子应用侧由 main.js 注入的 window.__system.requestPermission 封装）：
//   iframe → 桌面：{ type: 'REQUEST_PERMISSION', requestId, permission }
//   桌面 → iframe：{ type: 'PERMISSION_ACK', requestId }      存在性握手（兼容旧桌面超时兜底）
//   桌面 → iframe：{ type: 'PERMISSION_RESULT', requestId, granted }
//
// 存储结构（localStorage: ios-desktop:permissions）：
//   { <appId>: { __name, __icon, <permission>: true|false } }
//   __name/__icon 为应用展示元数据（设置页渲染用），下划线前缀键不参与权限判定。

import { ICONS } from './icons.js';
import { getAppIconSVG } from './app-icons.js';
import { initialApps } from './apps-data.js';

const STORAGE_KEY = 'ios-desktop:permissions';

/** 五类权限的展示元数据（icon 对应 js/icons.js 的键名） */
export const PERMISSION_META = {
  camera:        { label: '相机',     icon: 'camera_access', desc: '拍摄照片与录制视频' },
  microphone:    { label: '麦克风',   icon: 'mic_access',    desc: '录制音频与环境声音' },
  location:      { label: '位置信息', icon: 'location_on',   desc: '获取设备大致或精确位置' },
  notifications: { label: '通知',     icon: 'bell_off',      desc: '发送提醒与横幅通知' },
  clipboard:     { label: '剪贴板',   icon: 'edit',          desc: '读取与写入复制内容' },
};

let store = loadStore();
const dialogQueue = [];   // 对话框串行队列：多个应用同时请求时依次弹出
let dialogActive = false;

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) {
    return {};
  }
}

function saveStore() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (e) { /* 配额满时静默 */ }
}

/** 'granted' | 'denied' | 'unset' */
export function getPermissionState(appId, permission) {
  const rec = store[appId];
  if (!rec || typeof rec[permission] !== 'boolean') return 'unset';
  return rec[permission] ? 'granted' : 'denied';
}

/** 深拷贝导出（供设置页渲染） */
export function getAllPermissions() {
  return JSON.parse(JSON.stringify(store));
}

/** 设置页改判入口 */
export function setPermission(appId, permission, granted) {
  if (!appId || !permission) return;
  if (!store[appId]) store[appId] = {};
  store[appId][permission] = !!granted;
  saveStore();
}

export function clearAllPermissions() {
  store = {};
  saveStore();
}

/** 记录应用展示元数据（首次申请时反查一次）；图标固定本地 SVG，与桌面同源 */
function rememberAppMeta(appId, appName) {
  if (!store[appId]) store[appId] = {};
  const appDef = initialApps.find((a) => a.id === appId);
  if (!store[appId].__name) store[appId].__name = appName || (appDef && appDef.name) || appId;
  // v7.4：不再存 app.iconUrl 网络图，老记录里的遗留网络 __icon 也会被本次覆写为本地 SVG
  store[appId].__icon = getAppIconSVG(appId);
}

/**
 * v7.52：安装包应用元数据种子 —— 安装完成后预写入 __name/__icon，
 * 让「设置 › 应用权限管理」在包应用首次申请权限前就能展示正确的名称与包图标。
 * 只种元数据、不预授权：运行时申请仍走统一权限对话框。
 */
export function seedAppMeta(appId, appName, iconHTML) {
  if (!appId) return;
  if (!store[appId]) store[appId] = {};
  if (appName && !store[appId].__name) store[appId].__name = String(appName);
  if (typeof iconHTML === 'string' && iconHTML) store[appId].__icon = iconHTML;
  else if (!store[appId].__icon) store[appId].__icon = getAppIconSVG(appId);
  saveStore();
}

/** v7.52：应用级权限记录整体移除（卸载包应用时调用；内置应用卸载走同接口无副作用） */
export function removeAppPermissions(appId) {
  if (!appId || !store[appId]) return;
  delete store[appId];
  saveStore();
}

/**
 * 权限请求入口（父模块也可直接 await 调用）。
 * @returns {Promise<boolean>} 是否放行
 */
export async function requestPermission(permission, { appId, appName } = {}) {
  if (!PERMISSION_META[permission]) return true; // 未知权限类型默认放行，不阻塞子应用
  if (!appId) return true;                       // 无来源上下文（父模块自身）默认放行

  const state = getPermissionState(appId, permission);
  if (state !== 'unset') return state === 'granted';

  rememberAppMeta(appId, appName);
  saveStore();

  // 对话框标题优先用应用定义中的正式名称（如 'camera' → '相机'）
  const displayName = store[appId].__name || appName || appId;
  const choice = await enqueueDialog({ appId, appName: displayName, permission });
  if (choice === 'granted') { setPermission(appId, permission, true); return true; }
  if (choice === 'once') return true;            // 仅本次：放行但不落盘
  setPermission(appId, permission, false);       // 拒绝：持久化，之后不再重复询问
  return false;
}

/** 对话框串行队列 */
function enqueueDialog(opts) {
  return new Promise((resolve) => {
    dialogQueue.push({ opts, resolve });
    pumpDialogQueue();
  });
}

async function pumpDialogQueue() {
  if (dialogActive || !dialogQueue.length) return;
  dialogActive = true;
  const { opts, resolve } = dialogQueue.shift();
  let choice = 'denied';
  try {
    choice = await showPermissionDialog(opts);
  } catch (e) { choice = 'denied'; }
  dialogActive = false;
  resolve(choice);
  pumpDialogQueue();
}

/**
 * MD3 权限对话框 —— 复用电源弹窗的 .power-dialog-overlay / .power-dialog-card
 * 结构类保持视觉一致（模糊遮罩 + 28px 圆角卡片 + 弹性缩放入场），z-index 抬升到
 * 应用窗口层之上（9500，低于系统 Toast 10000）。
 * @returns {Promise<'granted'|'once'|'denied'>}
 */
function showPermissionDialog({ appId, appName, permission }) {
  return new Promise((resolve) => {
    const meta = PERMISSION_META[permission] || { label: permission, icon: 'lock', desc: '' };
    const overlay = document.createElement('div');
    overlay.className = 'power-dialog-overlay';
    overlay.id = 'md3PermissionOverlay';
    overlay.style.zIndex = '9500';
    overlay.innerHTML = `
      <div class="power-dialog-card" role="alertdialog" aria-label="权限请求">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:44px;height:44px;border-radius:50%;background:hsl(var(--md-h,215) 80% 60% / 0.16);color:hsl(var(--md-h,215) 80% 64%);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${ICONS[meta.icon] || ICONS.lock}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:16px;font-weight:600;color:var(--md-on-surface,#e2e2e9);line-height:1.4;">允许「${escapeHtml(appName)}」使用${meta.label}？</div>
            <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;line-height:1.5;">${meta.desc} · 可随时在 设置 › 应用权限管理 中修改</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;">
          <button data-act="denied" style="background:none;border:none;color:var(--md-on-surface-variant,#9a9b9e);font-size:13.5px;font-weight:600;padding:10px 14px;border-radius:20px;cursor:pointer;">拒绝</button>
          <button data-act="once" style="background:none;border:none;color:hsl(var(--md-h,215) 80% 64%);font-size:13.5px;font-weight:600;padding:10px 14px;border-radius:20px;cursor:pointer;">仅本次</button>
          <button data-act="granted" style="background:hsl(var(--md-h,215) 80% 55%);border:none;color:#fff;font-size:13.5px;font-weight:600;padding:10px 20px;border-radius:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.25);">允许</button>
        </div>
      </div>
    `;

    const settle = (choice) => {
      if (overlay.style.visibility === 'hidden') return; // 防重复
      overlay.classList.remove('active');
      setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 220);
      resolve(choice);
    };

    overlay.querySelectorAll('button[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => settle(btn.getAttribute('data-act')));
    });
    // 权限对话框强制显式选择：点击遮罩不关闭（与真 Android 行为一致）

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    if (navigator.vibrate) navigator.vibrate(12);
  });
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * 初始化权限系统：注册 iframe 权限请求路由 + 暴露设置页/调试入口。
 * 注意：e.source 反查 appId 的逻辑与 app-bus.js 同源（避免引入模块环而复制实现）。
 */
export function initPermissions() {
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'REQUEST_PERMISSION' || !d.requestId) return;
    const src = e.source;

    // 1) 立即 ACK：让子应用确认桌面具备权限服务（否则子应用走旧桌面超时兜底放行）
    try { if (src) src.postMessage({ type: 'PERMISSION_ACK', requestId: d.requestId }, '*'); } catch (err) {}

    // 2) 反查来源应用（优先子应用自报，其次按 e.source 扫描实例容器）
    let appId = d.appId || '';
    if (!appId) {
      document.querySelectorAll('.app-instance-wrapper, [data-bus-app-id]').forEach((el) => {
        if (appId) return;
        el.querySelectorAll('iframe').forEach((iframe) => {
          try {
            if (iframe.contentWindow === src) {
              appId = el.getAttribute('data-bus-app-id') || (el.id || '').replace('app-instance-', '');
            }
          } catch (err) {}
        });
      });
    }

    // 3) 走统一权限流程并回执
    requestPermission(d.permission, { appId, appName: d.appName })
      .then((granted) => {
        try { if (src) src.postMessage({ type: 'PERMISSION_RESULT', requestId: d.requestId, granted }, '*'); } catch (err) {}
      });
  });

  window.__permissions = {
    requestPermission,
    getPermissionState,
    getAllPermissions,
    setPermission,
    clearAllPermissions,
    PERMISSION_META,
  };
}
