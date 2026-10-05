// ==================== clipboard.js — 全局剪贴板（批次三 · 数据层） ====================
//
// 桌面级内容中转站：让"复制 → 切应用 → 粘贴"第一次成为跨应用能力。
//
// 三类载荷（v1）：
//   { kind:'text',  text }                       纯文本
//   { kind:'image', dataUrl, name }              图片（dataURL，来自相册/文件管理器）
//   { kind:'files', paths:[], cut:boolean }      文件引用（文件管理器 复制/剪切 → 粘贴）
//
// 行为约定：
//   - 纯文本同步镜像到 navigator.clipboard（真实系统剪贴板，失败静默——
//     浏览器可能因无用户激活拒绝写入，不影响内部剪贴板可用）
//   - 覆盖式写入（一次一份），与 iOS 文件 App 的"拷贝/粘贴"心智一致
//   - 剪切（cut）的文件在粘贴成功后才真正 move，源数据在粘贴前绝不丢失
//
// 桥接：
//   - 子应用经注入 SDK：__system.clipboard.write({ text }) / __system.clipboard.read()
//     （CLIPBOARD_WRITE / CLIPBOARD_READ 消息，见 main.js 注入脚本）
//   - 桌面模块应用直连：window.__clipboard.set / get / clear
//
// 依赖说明：权限系统已有 clipboard（剪贴板）类别。fix(P2)：原实现设置页的剪贴板
// 权限开关是死开关（全仓无消费点）。现接入 permissions.js 门控：仅在用户已显式
// 拒绝（'denied'）时阻断该应用的读写，'unset'/'granted' 保持原有放行行为，
// 默认体验不变（第一方应用均为可信来源，与注释约定的 v1 语义兼容）。

import { getPermissionState } from './permissions.js';

const MAX_TEXT_LEN = 512 * 1024; // 内部剪贴板文本上限 512KB
const MAX_IMAGE_LEN = 8 * 1024 * 1024; // fix(audit-D): 内部剪贴板图片 dataURL 上限 8MB（防数十 MB 常驻内存）

/** 该应用剪贴板权限是否放行（'denied' 阻断，'unset'/'granted' 放行） */
function clipboardAllowed(appId) {
  if (!appId) return true; // 桌面模块应用/无来源上下文：不受逐应用门控
  return getPermissionState(appId, 'clipboard') !== 'denied';
}

let current = null;   // { kind, ..., from, at }
const listeners = new Set();

function notifyChange() {
  listeners.forEach((cb) => { try { cb(current); } catch (e) {} });
}

/**
 * 写入剪贴板（覆盖式）。
 * @param {object} item { kind:'text', text } | { kind:'image', dataUrl, name? }
 *                      | { kind:'files', paths:[], cut? }
 * @param {string} from  来源应用 id（可选，用于提示文案）
 * @returns {{ok:boolean, error?:string}}
 */
function set(item, from) {
  if (!item || typeof item !== 'object' || !item.kind) return { ok: false, error: '无效的剪贴板内容' };
  if (item.kind === 'text') {
    const text = String(item.text == null ? '' : item.text);
    if (!text) return { ok: false, error: '内容为空' };
    if (text.length > MAX_TEXT_LEN) return { ok: false, error: '文本过大（超过 512KB）' };
    current = { kind: 'text', text, from: from || '', at: Date.now() };
    // 镜像到真实系统剪贴板（尽力而为：无用户激活或非安全上下文时会失败，忽略）
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
    } catch (e) {}
  } else if (item.kind === 'image') {
    const dataUrl = String(item.dataUrl || '');
    if (!dataUrl.startsWith('data:image')) return { ok: false, error: '仅支持 dataURL 图片' };
    // fix(audit-D): 图片载荷加大小上限（与文本 512KB 限制对齐；超限拒绝且不覆盖旧剪贴板内容）
    if (dataUrl.length > MAX_IMAGE_LEN) return { ok: false, error: '图片过大（超过 8MB）' };
    current = { kind: 'image', dataUrl, name: item.name || ('clipboard_' + Date.now() + '.png'), from: from || '', at: Date.now() };
  } else if (item.kind === 'files') {
    const paths = Array.isArray(item.paths) ? item.paths.filter((p) => typeof p === 'string' && p) : [];
    if (!paths.length) return { ok: false, error: '未选择文件' };
    current = { kind: 'files', paths, cut: !!item.cut, from: from || '', at: Date.now() };
  } else {
    return { ok: false, error: '不支持的剪贴板类型: ' + item.kind };
  }
  notifyChange();
  return { ok: true };
}

/** 读取当前剪贴板（引用；调用方不得修改返回对象） */
function get() { return current; }

/** 剪贴板是否非空 */
function has() { return !!current; }

function clear() {
  const had = !!current;
  current = null;
  if (had) notifyChange();
  return { ok: true };
}

/** 变更订阅（返回退订函数）——文件管理器靠它点亮/熄灭「粘贴」按钮 */
function subscribe(cb) {
  if (typeof cb === 'function') listeners.add(cb);
  return () => listeners.delete(cb);
}

// ==================== iframe 子应用桥接 ====================

/** 反查消息来源所属应用 id（与 app-bus.js / vfs.js 同款逻辑） */
function inferSenderAppId(sourceWindow) {
  if (!sourceWindow) return '';
  let found = '';
  document.querySelectorAll('.app-instance-wrapper, [data-bus-app-id]').forEach((el) => {
    if (found) return;
    el.querySelectorAll('iframe').forEach((iframe) => {
      try {
        if (iframe.contentWindow === sourceWindow) {
          found = el.getAttribute('data-bus-app-id') || (el.id || '').replace('app-instance-', '');
        }
      } catch (e) { /* 上下文销毁忽略 */ }
    });
  });
  return found;
}

function initClipboardBridge() {
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || e.source === window) return;

    if (d.type === 'CLIPBOARD_WRITE') {
      const from = inferSenderAppId(e.source);
      // fix(P2)：接入剪贴板权限门控（设置›应用权限可改判）
      if (!clipboardAllowed(from)) {
        if (d.requestId) {
          try { e.source.postMessage({ type: 'CLIPBOARD_RESULT', requestId: d.requestId, ok: false, error: '剪贴板权限已被拒绝（设置 › 应用权限）' }, '*'); } catch (err) {}
        }
        return;
      }
      const r = set(d.payload, from);
      // 写入成功时向所有活跃应用广播"剪贴板已更新"（供有粘贴入口的应用刷新 UI）
      if (r.ok) {
        try {
          document.querySelectorAll('.app-instance-wrapper iframe, [data-bus-app-id] iframe').forEach((iframe) => {
            try { if (iframe.dataset.loaded === '1') iframe.contentWindow.postMessage({ type: 'CLIPBOARD_CHANGED', from }, '*'); } catch (err) {}
          });
        } catch (err) {}
      }
      if (d.requestId) {
        try { e.source.postMessage({ type: 'CLIPBOARD_RESULT', requestId: d.requestId, ok: r.ok, error: r.error || null }, '*'); } catch (err) {}
      }
      return;
    }

    if (d.type === 'CLIPBOARD_READ' && d.requestId) {
      const from = inferSenderAppId(e.source);
      // fix(P2)：读取侧同样受剪贴板权限门控
      if (!clipboardAllowed(from)) {
        try { e.source.postMessage({ type: 'CLIPBOARD_RESULT', requestId: d.requestId, ok: false, error: '剪贴板权限已被拒绝（设置 › 应用权限）' }, '*'); } catch (err) {}
        return;
      }
      let payload = null;
      if (current) {
        if (current.kind === 'text') payload = { kind: 'text', text: current.text };
        else if (current.kind === 'image') payload = { kind: 'image', dataUrl: current.dataUrl, name: current.name };
        else if (current.kind === 'files') payload = { kind: 'files', paths: current.paths.slice(), cut: current.cut };
      }
      try { e.source.postMessage({ type: 'CLIPBOARD_RESULT', requestId: d.requestId, ok: true, payload }, '*'); } catch (err) {}
    }
  });
}

/** 由 main.js 调用 */
export function initClipboard() {
  if (typeof window === 'undefined') return;
  initClipboardBridge();
  try {
    window.__clipboard = { set, get, has, clear, subscribe };
  } catch (e) { /* window 只读环境静默 */ }
}
