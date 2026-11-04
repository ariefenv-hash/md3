// ==================== clipboard-overlay.js — 剪贴板预览浮层纯逻辑核（v9.73 #95） ====================
// #95（#21 候选 7）：A12+ Clipboard Overlay 移植 —— 复制后底部浮出圆角卡片（摘要 + 来源标签 +
// 快捷动作），自动收起 + 点击外部收起 + 软键盘避让（visualViewport 首用，#77-B 落点）。
// AOSP 同构（packages/SystemUI/src/com/android/systemui/clipboard/，#95 议题正文实拉语义）：
//   · ClipboardOverlayController.kt —— 复制事件触发浮层、超时自动收起、生命周期管理（本文件 scheduler）
//   · ClipboardOverlayView.kt —— 摘要渲染（文本截断/图片缩略图/文件计数）、来源应用标签、快捷动作行
// 本文件 = 纯函数核（aosp/ 区零 DOM 零 window，时钟注入可测）；DOM 层 js/clipboard-overlay-ui.js 只做接线。
export const CLIPBOARD_OVERLAY_AUTO_DISMISS_MS = 4000;   // 自动收起（AOSP 数秒级自动隐藏隐私语义，与 md3 HUN 驻留节奏同档）
export const CLIPBOARD_SUMMARY_MAX_LEN = 100;            // 文本摘要截断上限（AOSP ClipboardOverlayView 摘要单行语义的 md3 折算）

/**
 * 剪贴板载荷 → 浮层摘要（三类分档渲染语义，AOSP ClipboardOverlayView 对齐）。
 * @param {{kind:'text'|'image'|'files', ...}} item clipboard.js 载荷
 * @returns {{kind, summary, isUrl}|{kind, summary, name}|{kind, summary}}
 */
export function summarizeClipboardItem(item) {
  if (!item || typeof item !== 'object') return { kind: 'text', summary: '' };
  if (item.kind === 'text') {
    // 换行折叠为空格 + 截断（AOSP 摘要单行；URL 检测驱动「打开链接」动作出现）
    const raw = String(item.text == null ? '' : item.text);
    const folded = raw.replace(/\s+/g, ' ').trim();
    const summary = folded.length > CLIPBOARD_SUMMARY_MAX_LEN
      ? folded.slice(0, CLIPBOARD_SUMMARY_MAX_LEN) + '…'
      : folded;
    return { kind: 'text', summary, isUrl: !!firstHttpUrl(folded) };
  }
  if (item.kind === 'image') {
    const name = String(item.name || '图片');
    return { kind: 'image', summary: '图片 · ' + name, name };
  }
  if (item.kind === 'files') {
    const n = Array.isArray(item.paths) ? item.paths.length : 0;
    return { kind: 'files', summary: (item.cut ? '剪切 ' : '拷贝 ') + n + ' 个文件' };
  }
  return { kind: 'text', summary: '' };
}

/** 文本中首个 http(s) URL（「打开链接」动作判定；无则 null） */
export function firstHttpUrl(text) {
  const m = String(text || '').match(/https?:\/\/[^\s，。；、"']+/);
  return m ? m[0] : null;
}

/**
 * 浮层快捷动作解析（AOSP ClipboardOverlayView：依内容类型给「分享/编辑/打开链接」）。
 * @returns {string[]} 动作 id 列表：'share' | 'edit' | 'open'
 */
export function resolveOverlayActions(item) {
  if (!item || typeof item !== 'object') return [];
  if (item.kind === 'text') {
    const acts = ['share', 'edit'];
    if (firstHttpUrl(String(item.text || ''))) acts.push('open');
    return acts;
  }
  if (item.kind === 'image') return ['share'];
  return []; // files：无快捷动作（粘贴语义在文件管理器内闭环）
}

/**
 * 浮层显隐调度器（ClipboardOverlayController 生命周期同构）：
 * show → AUTO_DISMISS 后 expire 收起；show 中再 show（连续复制）重置计时；
 * hide/cancel 即刻收起。时钟注入可测。
 * @returns {{show(), hide(), visible(), remainingMs()}}
 */
export function createOverlayScheduler(opts) {
  // 默认值语义：仅「未传」回退默认；显式传入 0/-1/NaN 属非法配置，必须抛错（不能被 || 吞掉）
  const autoDismissMs = opts && opts.autoDismissMs !== undefined
    ? opts.autoDismissMs
    : CLIPBOARD_OVERLAY_AUTO_DISMISS_MS;
  const now = (opts && opts.now) || (() => Date.now());
  const onExpire = (opts && opts.onExpire) || (() => {});
  if (typeof autoDismissMs !== 'number' || !(autoDismissMs > 0)) throw new RangeError('autoDismissMs must be > 0');
  let shownAt = null;       // null = hidden
  let timer = null;

  function clearTimer() { if (timer !== null) { clearTimeout(timer); timer = null; } }

  return {
    show() {
      clearTimer();
      shownAt = now();
      timer = setTimeout(() => { shownAt = null; timer = null; onExpire(); }, autoDismissMs);
    },
    hide() {
      clearTimer();
      shownAt = null;
    },
    visible() { return shownAt !== null; },
    remainingMs() {
      if (shownAt === null) return 0;
      return Math.max(0, autoDismissMs - (now() - shownAt));
    },
  };
}
