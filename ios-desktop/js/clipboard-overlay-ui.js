// ==================== clipboard-overlay-ui.js — 剪贴板预览浮层 DOM 接线（v9.76 #95） ====================
// 消费 js/aosp/clipboard-overlay.js 纯逻辑核 + clipboard.js subscribe 广播（数据层零触碰）。
// 行为（AOSP ClipboardOverlay 同构语义）：
//   · 复制成功 → 底部浮出圆角卡：摘要（文本截断/图片名/文件计数）+ 来源应用标签 + 快捷动作行
//   · 动作：分享（真实消费 #200 share-sheet __shareSheet.open）/ 编辑（share-sheet notes 目标）/
//     打开链接（URL 检测 → safari；URL 预填另案不在本议题）
//   · 自动 4s 收起（连续复制重置计时）+ 点击外部收起（document pointerdown 捕获，卡内点击豁免）
//   · 软键盘避让：visualViewport resize 上移（全库首用，#77-B 落点）
import { subscribe } from './clipboard.js';
import { initialApps } from './apps-data.js';
import {
  summarizeClipboardItem, resolveOverlayActions, firstHttpUrl, createOverlayScheduler,
} from './aosp/clipboard-overlay.js';

let rootEl = null;
let scheduler = null;

const ACTION_LABEL = { share: '分享', edit: '编辑', open: '打开链接' };

function appName(id) {
  if (!id) return '系统';
  const a = initialApps.find((x) => x.id === id);
  return (a && a.name) || id;
}

function ensureDOM() {
  if (rootEl && document.documentElement.contains(rootEl)) return;
  rootEl = document.createElement('div');
  rootEl.id = 'clipboardOverlay';
  rootEl.setAttribute('aria-live', 'polite');
  // z=9100：系统浮层域（HUN 10005 之下、应用层之上——AOSP overlay 与 HUN 的层级关系同构）
  rootEl.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:16px', 'transform:translateX(-50%) translateY(24px)',
    'width:calc(100% - 32px)', 'max-width:420px', 'z-index:9100',
    'background:var(--md-surface-container-high, var(--md-surface))',
    'color:var(--md-on-surface)', 'border:1px solid var(--md-outline-variant)',
    'border-radius:20px', 'padding:12px 14px', 'display:none',
    'box-shadow:0 8px 28px rgba(0,0,0,.28)', 'opacity:0',
    'transition:opacity .18s ease, transform .18s cubic-bezier(.2,.8,.2,1), bottom .12s ease',
    'pointer-events:auto', 'font-family:inherit',
  ].join(';');
  rootEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <span id="cbOvIcon" style="flex:none;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--md-primary-container);color:var(--md-on-primary-container);font-size:17px;">⧉</span>
      <div style="flex:1;min-width:0;">
        <div id="cbOvSummary" style="font-size:13px;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--md-on-surface);"></div>
        <div id="cbOvMeta" style="font-size:11px;margin-top:2px;color:var(--md-on-surface-variant);"></div>
      </div>
      <div id="cbOvActions" style="display:flex;gap:6px;flex:none;"></div>
    </div>`;
  document.body.appendChild(rootEl);

  // 点击外部收起（捕获阶段；卡内交互豁免）
  document.addEventListener('pointerdown', (e) => {
    if (!scheduler || !scheduler.visible()) return;
    if (rootEl.contains(e.target)) return;
    hideNow();
  }, true);

  // 软键盘避让（visualViewport 全库首用，#77-B）：键盘顶起时卡随可视底部上移
  if (window.visualViewport) {
    const vv = window.visualViewport;
    const avoid = () => {
      if (!rootEl || !scheduler || !scheduler.visible()) return;
      const overlap = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      rootEl.style.bottom = (16 + overlap) + 'px';
    };
    vv.addEventListener('resize', avoid);
    vv.addEventListener('scroll', avoid);
  }
}

function hideNow() {
  if (!rootEl || !scheduler) return;
  scheduler.hide();
  rootEl.style.opacity = '0';
  rootEl.style.transform = 'translateX(-50%) translateY(24px)';
  setTimeout(() => {
    if (rootEl && !scheduler.visible()) rootEl.style.display = 'none';
  }, 200);
}

function runAction(act, item) {
  try {
    if (act === 'share') {
      const payload = item.kind === 'image'
        ? { imageDataUrl: item.dataUrl, title: item.name || '剪贴板图片' }
        : { text: item.text || '', title: appName(item.from) + ' 的剪贴板内容' };
      if (window.__shareSheet && typeof window.__shareSheet.open === 'function') {
        window.__shareSheet.open(payload);
      }
      hideNow();
    } else if (act === 'edit') {
      if (window.__shareSheet && typeof window.__shareSheet.open === 'function') {
        window.__shareSheet.open({ text: item.text || '', title: '编辑剪贴板文本' });
      }
      hideNow();
    } else if (act === 'open') {
      const url = firstHttpUrl(item.text || '');
      if (url) {
        import('./app-bus.js').then(({ emitToApp }) => {
          try { emitToApp('safari', 'navigate', { url, __silent: true }); } catch (e) { /* 深链未就绪静默 */ }
        }).catch(() => {});
      }
      hideNow();
    }
  } catch (e) { /* 动作失败静默：浮层语义不阻塞主链路 */ }
}

function showOverlay(item) {
  ensureDOM();
  const info = summarizeClipboardItem(item);
  const actions = resolveOverlayActions(item);
  const summaryEl = rootEl.querySelector('#cbOvSummary');
  const metaEl = rootEl.querySelector('#cbOvMeta');
  const iconEl = rootEl.querySelector('#cbOvIcon');
  const actEl = rootEl.querySelector('#cbOvActions');
  if (!summaryEl || !metaEl || !actEl) return;
  summaryEl.textContent = info.summary || '（空）';
  summaryEl.title = item.kind === 'text' ? String(item.text || '') : info.summary;
  metaEl.textContent = '已复制 · 来自 ' + appName(item.from);
  iconEl.textContent = item.kind === 'image' ? '🖼' : item.kind === 'files' ? '🗂' : '⧉';
  while (actEl.firstChild) actEl.removeChild(actEl.firstChild);
  actions.forEach((act) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = ACTION_LABEL[act] || act;
    b.dataset.cbAct = act;
    b.style.cssText = [
      'border:1px solid var(--md-outline-variant)', 'background:var(--md-surface-container)',
      'color:var(--md-primary)', 'border-radius:999px', 'padding:5px 10px', 'font-size:12px', 'cursor:pointer',
    ].join(';');
    b.addEventListener('click', () => runAction(act, item));
    actEl.appendChild(b);
  });
  rootEl.style.display = 'block';
  requestAnimationFrame(() => {
    rootEl.style.opacity = '1';
    rootEl.style.transform = 'translateX(-50%) translateY(0)';
  });
  scheduler.show(); // 连续复制重置计时（连续 show 语义）
}

/** 初始化（main.js 调用）：剪贴板每次成功写入 → 浮层浮现 */
export function initClipboardOverlay() {
  ensureDOM();
  scheduler = createOverlayScheduler({ onExpire: () => hideNow() });
  // 数据层零触碰：只消费 subscribe 广播（set() 内部成功路径才 notifyChange，失败不广播）
  subscribe((item) => {
    if (item && item.kind) showOverlay(item);
  });
  // 无头观测钩子（__sttTest 先例：e2e 驱动/断言）
  window.__clipboardOverlayTest = {
    visible: () => !!(scheduler && scheduler.visible() && rootEl && rootEl.style.display === 'block'),
    summary: () => (rootEl ? rootEl.querySelector('#cbOvSummary').textContent : ''),
    actions: () => Array.from(rootEl ? rootEl.querySelectorAll('#cbOvActions [data-cb-act]') : []).map((b) => b.dataset.cbAct),
    meta: () => (rootEl ? rootEl.querySelector('#cbOvMeta').textContent : ''),
    remainingMs: () => (scheduler ? scheduler.remainingMs() : 0),
    hide: () => hideNow(),
  };
}
