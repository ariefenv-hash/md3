// ==================== share-sheet.js — 系统级分享面板 + 应用深链路由（v7.19 应用互联） ====================
//
// 让「任何应用 → 系统分享 → 任何应用」第一次成为统一入口：
//   子应用：__system.share({ title, text, imageDataUrl?, name? })
//           → postMessage SHARE_OPEN → 本模块弹出底部抽屉分享面板
//   目标选定 → 复用 app-bus 定向投递（目标未启动则先排队）+ openApp 深链打开
//
// 深链路由（快捷指令 / 通讯录等「打开即动作」场景）：
//   子应用：__system.openApp(appId, { event, payload })
//           → 先 emitToApp（未启动则进 pending 队列，挂载后由 flushPendingForIframe 补投）
//           → 再 openAppById(appId)（图标位姿起飞动画）
//
// 与 v7.6 首批联动（notes→msg / camera→photo）的关系：总线与排队机制原样复用，
// 本模块只补齐「系统级 UI + 深链语义」，不改变既有事件协议。
//
// srcdoc 模块应用（files/mail 等运行在桌面文档内）不走 postMessage，
// 可直接调用 window.__shareSheet.open(payload) / .openAppById(appId)。

import { emitToApp, inferSenderAppId } from './app-bus.js';
import { openApp } from './app-window.js';
import { initialApps } from './apps-data.js';
import { state } from './state.js';
import { getAppIconSVG, hasAppIcon } from './app-icons.js';
import { showSystemToast } from './quick-settings.js';
import { buildShareTargets, findShareTarget, isShareable, shareKindsOf } from './share-registry.js';

const SHEET_Z = 9000; // 高于应用窗口(540)/下拉面板(750~900)，低于锁屏(98000)

const CLIP_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';

let rootEl = null;      // .share-sheet-root（遮罩 + 抽屉）
let cardEl = null;
let gridEl = null;
let previewEl = null;
let closeTimer = 0;
let currentShare = null; // 面板当前载荷 { title, text, imageDataUrl, name, from }

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 应用深链：按 appId 打开应用；动画源优先取桌面图标 rect（与通知点击同款动画） */
export function openAppById(appId, sourceRect) {
  const idx = initialApps.findIndex((a) => a.id === appId);
  if (idx === -1) return false;
  let rect = sourceRect || null;
  if (!rect) {
    try {
      const icon = document.querySelector(`.app-icon[data-id="${appId}"]`);
      if (icon) {
        const r = icon.getBoundingClientRect();
        if (r.width > 0) rect = r;
      }
    } catch (e) { /* 桌面未渲染时无动画源，退化为默认起点 */ }
  }
  openApp(idx, null, rect);
  return true;
}

// ==================== 分享目标执行器 ====================
// 统一约定：payload 追加 __silent:true —— 深链场景目标应用即将被打开，
// 后台代发横幅与打开动画叠加属于重复打扰（app-bus.deliveryNotification 尊重该标记）。

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function runShareTarget(targetId) {
  const t = findShareTarget(targetId);
  const p = currentShare;
  if (!t || !p) return;
  const from = p.from || '';

  if (t.id === 'msg') {
    emitToApp('msg', 'share/memo',
      { title: p.title || '', text: p.text || '', __silent: true }, from);
    openAppById('msg');
  } else if (t.id === 'notes') {
    emitToApp('notes', 'files/share',
      { name: p.title || '分享文本', text: p.text || '', __silent: true }, from);
    openAppById('notes');
  } else if (t.id === 'cal') {
    // v7.24：分享到日历 —— 转为指定日期（缺省今天）的日历笔记，打开即定位到编辑态
    emitToApp('cal_app', 'calendar/prefill',
      { title: p.title || '', text: p.text || '', date: p.date || '', __silent: true }, from);
    openAppById('cal_app');
  } else if (t.id === 'reminders') {
    // v7.24：分享到提醒事项 —— 转为一条待办任务（标题取正文优先，长文截断）
    const taskTitle = String(p.text || p.title || '').trim().slice(0, 200) || '分享内容';
    emitToApp('reminders', 'reminders/create',
      { title: taskTitle, __silent: true }, from);
    openAppById('reminders');
  } else if (t.id === 'photo') {
    // 复用相机→相册链路：app-bus.emitToApp 自动落盘 VFS /photos + 相册入库
    emitToApp('photo', 'photo/captured',
      { id: 'share' + Date.now(), type: 'image', src: p.imageDataUrl, name: p.name || '', __silent: true }, from);
    openAppById('photo');
  } else if (t.id === 'files') {
    // files 是 srcdoc 模块应用（无 iframe 总线接收能力）→ VFS 数据桥直写 + 打开
    writeSharedToVfs(p, from).then((ok) => {
      if (ok) openAppById('files');
      else showSystemToast('存储到文件失败');
    });
  } else if (t.id === 'translate') {
    emitToApp('translate', 'translate/prefill',
      { text: String(p.text || '').slice(0, 5000), __silent: true }, from);
    openAppById('translate');
  } else if (t.id === 'clipboard') {
    const kinds = shareKindsOf(p);
    const item = kinds.includes('image')
      ? { kind: 'image', dataUrl: p.imageDataUrl, name: p.name || ('share_' + stamp() + '.png') }
      : { kind: 'text', text: String(p.text || '') };
    const r = window.__clipboard ? window.__clipboard.set(item, from) : { ok: false };
    showSystemToast(r && r.ok ? '已拷贝到剪贴板' : '拷贝失败');
  }
}

/** 分享内容 → VFS /Downloads（文本存 .txt，图片存原格式） */
async function writeSharedToVfs(p, from) {
  try {
    const V = window.__vfs;
    if (!V || typeof V.write !== 'function') return false;
    const kinds = shareKindsOf(p);
    if (kinds.includes('image')) {
      const ext = /\.png/i.test(p.imageDataUrl) ? 'png' : 'jpg';
      const path = `/Downloads/分享图片-${stamp()}.${ext}`;
      const r = await V.write(path, p.imageDataUrl, { owner: from || 'share' });
      return !!(r && r.ok);
    }
    const path = `/Downloads/分享文本-${stamp()}.txt`;
    const r = await V.write(path, String(p.text || ''), { owner: from || 'share' });
    return !!(r && r.ok);
  } catch (e) { return false; }
}

// ==================== 面板 UI ====================

function ensureDOM() {
  if (rootEl) return;
  const style = document.createElement('style');
  style.textContent = `
.share-sheet-root{position:fixed;inset:0;z-index:${SHEET_Z};display:none}
.share-sheet-root.open{display:block}
.share-sheet-scrim{position:absolute;inset:0;background:rgba(0,0,0,.45);opacity:0;transition:opacity .24s ease}
.share-sheet-root.open .share-sheet-scrim{opacity:1}
.share-sheet-card{position:absolute;left:50%;bottom:0;transform:translate(-50%,100%);
  width:min(420px,calc(100% - 16px));max-height:78vh;overflow-y:auto;overscroll-behavior:contain;
  background:var(--md-surface-container,hsl(var(--md-h,215) 18% 14%));
  border-radius:28px 28px 0 0;padding:10px 18px 22px;
  box-shadow:0 -8px 40px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06);
  transition:transform .3s cubic-bezier(.2,.9,.25,1.02)}
.share-sheet-root.open .share-sheet-card{transform:translate(-50%,0)}
.share-sheet-handle{width:36px;height:4px;border-radius:2px;background:var(--md-outline-variant,hsl(var(--md-h,215) 10% 40%));margin:4px auto 12px}
.share-sheet-title{font:600 16px/1.4 var(--md-font,sans-serif);color:var(--md-on-surface,#eee);margin-bottom:10px}
.share-sheet-preview{display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.05);
  border:1px solid var(--md-outline-variant,transparent);border-radius:16px;padding:10px 12px;margin-bottom:14px;min-height:0}
.share-sheet-preview .sp-title{font:600 14px/1.35 var(--md-font,sans-serif);color:var(--md-on-surface,#eee);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.share-sheet-preview .sp-text{font:400 12.5px/1.45 var(--md-font,sans-serif);color:var(--md-on-surface-variant,#aaa);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-all}
.share-sheet-preview .sp-img{width:52px;height:52px;border-radius:10px;object-fit:cover;flex-shrink:0}
.share-sheet-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 6px}
.share-target{display:flex;flex-direction:column;align-items:center;gap:7px;background:none;border:none;cursor:pointer;padding:4px 2px;border-radius:14px}
.share-target:active{background:rgba(255,255,255,.08)}
.share-target .st-icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:var(--md-secondary-container,hsl(var(--md-h,215) 22% 18%));color:var(--md-on-secondary-container,#ddd);overflow:hidden}
.share-target .st-icon svg,.share-target .st-icon img{width:30px;height:30px;display:block}
.share-target .st-label{font:500 11.5px/1.3 var(--md-font,sans-serif);color:var(--md-on-surface-variant,#bbb);max-width:100%;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.share-sheet-cancel{display:block;width:100%;margin-top:14px;padding:13px 0;border:none;border-radius:20px;cursor:pointer;
  background:rgba(255,255,255,.07);color:var(--md-on-surface,#eee);font:600 15px var(--md-font,sans-serif)}
.share-sheet-cancel:active{background:rgba(255,255,255,.12)}
@media (prefers-reduced-motion: reduce){
  .share-sheet-card,.share-sheet-scrim{transition:none}
}
  `;
  document.head.appendChild(style);

  rootEl = document.createElement('div');
  rootEl.className = 'share-sheet-root';
  rootEl.setAttribute('role', 'dialog');
  rootEl.setAttribute('aria-label', '系统分享面板');
  rootEl.innerHTML = `
    <div class="share-sheet-scrim"></div>
    <div class="share-sheet-card">
      <div class="share-sheet-handle"></div>
      <div class="share-sheet-title">分享</div>
      <div class="share-sheet-preview"></div>
      <div class="share-sheet-grid"></div>
      <button class="share-sheet-cancel" type="button">取消</button>
    </div>
  `;
  document.body.appendChild(rootEl);
  cardEl = rootEl.querySelector('.share-sheet-card');
  gridEl = rootEl.querySelector('.share-sheet-grid');
  previewEl = rootEl.querySelector('.share-sheet-preview');

  rootEl.querySelector('.share-sheet-scrim').addEventListener('click', closeShareSheet);
  rootEl.querySelector('.share-sheet-cancel').addEventListener('click', closeShareSheet);
  gridEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.share-target');
    if (!btn) return;
    const id = btn.getAttribute('data-target');
    closeShareSheet();
    // 先合面板再执行：目标应用的打开动画无缝衔接，避免面板残留遮挡
    setTimeout(() => runShareTarget(id), 90);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rootEl.classList.contains('open')) closeShareSheet();
  });
}

function renderPreview(p) {
  const kinds = shareKindsOf(p);
  let html = '';
  if (kinds.includes('image')) {
    html += `<img class="sp-img" src="${p.imageDataUrl}" alt="">`;
  }
  const title = String(p.title || '').trim();
  const text = String(p.text || '').trim();
  html += `<div style="min-width:0;flex:1">`;
  if (title) html += `<div class="sp-title">${escapeHtml(title)}</div>`;
  if (text) html += `<div class="sp-text">${escapeHtml(text.slice(0, 200))}</div>`;
  if (!title && !text && kinds.includes('image')) {
    html += `<div class="sp-title">${escapeHtml(p.name || '分享图片')}</div><div class="sp-text">图片 · 将保存到目标应用</div>`;
  }
  html += `</div>`;
  previewEl.innerHTML = html;
}

function renderTargets(p) {
  // v7.24：目标按安装状态动态过滤 —— 已卸载应用（state.removedApps，对象数组）不再展示
  const targets = buildShareTargets(p, p.from || '', state.removedApps || []);
  gridEl.innerHTML = targets.map((t) => {
    const iconInner = t.id === 'clipboard'
      ? CLIP_ICON
      : (hasAppIcon(t.appId) ? getAppIconSVG(t.appId) : CLIP_ICON);
    return `<button class="share-target" type="button" data-target="${t.id}" aria-label="分享到${escapeHtml(t.label)}">
      <span class="st-icon">${iconInner}</span>
      <span class="st-label">${escapeHtml(t.label)}</span>
    </button>`;
  }).join('');
}

/**
 * 打开系统分享面板。
 * @param {object} payload { title?, text?, imageDataUrl?, name?, from? }
 *   from 由路由层自动反查注入，调用方无需传（传了也以路由层为准）。
 */
export function openShareSheet(payload) {
  if (!isShareable(payload)) {
    showSystemToast('没有可分享的内容');
    return false;
  }
  ensureDOM();
  currentShare = Object.assign({}, payload);
  renderPreview(currentShare);
  renderTargets(currentShare);
  rootEl.classList.add('open');
  return true;
}

export function closeShareSheet() {
  if (!rootEl || !rootEl.classList.contains('open')) return;
  rootEl.classList.remove('open');
  clearTimeout(closeTimer);
  // 过渡动画时长后再清引用（面板不可见，无需更强清理）
  closeTimer = setTimeout(() => { currentShare = null; }, 350);
}

export function isShareSheetOpen() {
  return !!(rootEl && rootEl.classList.contains('open'));
}

// ==================== 深链消息路由 ====================

function initShareSheetRoutes() {
  window.addEventListener('message', (e) => {
    // 桌面自身消息（模块应用直调 __shareSheet）不走路由
    if (e.source === window) return;
    const d = e.data;
    if (!d || typeof d !== 'object') return;

    if (d.type === 'SHARE_OPEN' && d.payload) {
      const from = inferSenderAppId(e.source);
      openShareSheet(Object.assign({}, d.payload, { from }));
      return;
    }

    if (d.type === 'OPEN_APP' && d.appId) {
      const from = inferSenderAppId(e.source);
      // 先投递（目标未启动 → 进 pending 队列），再打开：挂载后 flushPendingForIframe 补投，
      // 应用首帧渲染完成后即可消费动作 —— 「打开即动作」的深链语义。
      if (d.event) {
        const payload = Object.assign({}, d.payload || {}, { __silent: true });
        emitToApp(String(d.appId), String(d.event), payload, from);
      }
      openAppById(String(d.appId));
    }
  });
}

/** 初始化（main.js 调用）：注册深链路由 + 暴露桌面侧/调试入口 */
export function initShareSheet() {
  initShareSheetRoutes();
  // 桌面模块应用（srcdoc，如 files）与控制台调试直连入口
  window.__shareSheet = {
    open: openShareSheet,
    close: closeShareSheet,
    isOpen: isShareSheetOpen,
    openAppById,
  };
}
