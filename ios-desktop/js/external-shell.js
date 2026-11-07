// ==================== external-shell.js — 外部应用轻量壳失联占位接线（v10.48 #172 余项） ====================
//
// #172 建议形态④「加载失败占位」+ 外部依赖风险段「健康检查与降级标记」的 DOM 接线层：
// 外部应用（ext- 前缀，pkg-registry.buildExternalAppDef → iframeAppContent）iframe 直载
// 远程 Pages 站点；对方仓库删除 / 改路径 / 关 Pages / 用户离线 → 窗口内呈现白板或
// 浏览器错误页，用户无从分辨 —— 本层给出：看门狗 + 探活 + 失联占位 UI + 重试。
//
// 分工同二期 fetch 链同律（#183 二期）：判定纯核在 pkg-catalog.js（classifyExternalHealth /
// githubPagesRepoFromUrl / externalHealthEndpoint / appendRetryParam），本层只做
// fetch 执行 / 计时器 / DOM 切换，零业务判定逻辑。
//
// 诚实边界三条（#172 硬约束延伸）：
//   ① 跨域 iframe contentDocument 不可读（opaque）——「内容是否渲染成功」深度不可探测，
//     判定只消费网络级信号；load 已发生即按可达处理（不承诺内容可用）。
//   ② api.github.com 整域不可达等歧义态 → 'unknown' 不占位（宁可等也不误伤慢网真站点）；
//   ③ 占位文案标注判定依据，重试可恢复（降级语义 = 可恢复占位，非硬阻断）。
//
// 挂载点：page-stack.js ensureAppInstance / renderPageStack 与 split-screen.js 分屏再注入
// 路径 —— innerHTML 注入后统一调 initExternalShellGuards(container)（幂等：每 iframe
// 一次，dataset 守卫；分屏重建的新 iframe 元素自然重挂）。

import {
  classifyExternalHealth,
  externalHealthEndpoint,
  appendRetryParam,
  EXTERNAL_PROBE_TIMEOUT_MS,
} from './pkg/pkg-catalog.js';

/** 单 iframe 守卫状态注册表（WeakMap：iframe 元素 → 状态；iframe 移除即 GC，零泄漏） */
const guards = new WeakMap();

/** 信号聚合 → 判定 → 占位切换（守卫内部小状态机的一步） */
function evaluate(g) {
  const verdict = classifyExternalHealth({
    probeStatus: g.probeStatus,
    reachable: g.reachable,
    loadFired: g.loadFired,
    loadTimedOut: g.loadTimedOut,
  });
  if (verdict === 'ok') {
    clearTimer(g);
    showPlaceholder(g, false);
    g.done = true;
  } else if (verdict === 'unreachable') {
    clearTimer(g);
    showPlaceholder(g, true, reasonOf(g));
    g.done = true;
  }
  // 'unknown'：保持等待（看门狗 / load / 探活任一后续信号再评）
}

/** 失联原因文案（占位 UI 诚实标注判定依据） */
function reasonOf(g) {
  if (g.probeStatus === 404) return '探活判定：GitHub 仓库或 Pages 已删除（API 404）';
  if (g.reachable === false) return '探活判定：网络级直连失败（离线 / DNS / 连接被拒）';
  if (g.loadTimedOut) return '探活判定：加载看门狗超时（未收到任何载入信号）';
  return '探活判定：站点不可达';
}

function clearTimer(g) {
  if (g.timer != null) { clearTimeout(g.timer); g.timer = null; }
}

function showPlaceholder(g, on, reason) {
  if (!g.placeholder) return;
  g.placeholder.hidden = !on;
  if (on && reason) {
    const r = g.placeholder.querySelector('[data-ext-placeholder-reason]');
    if (r) r.textContent = reason;
  }
}

/**
 * 探活执行（接线层；判定回纯核）—— 双通道并行，信号独立采集互不早退：
 *   ① github.io 条目 → GitHub REST 仓库端点（免认证 CORS；200 在册 / 404 删除权威；
 *     403 限流等非终态按歧义不产信号）；
 *   ② 全部条目 → no-cors 直连探活（resolve = 网络可达；reject = 网络级失联）。
 * v10.48 勘误（e2e T4 实证）：API 单通道早退会在限流等歧义态丢失直连信号 ——
 * Chromium 对 iframe 网络错误页同样 fire load（error page load），直连信号是
 * 网络级失联的第一探测位，不可被 API 通道挤占。两通道 Promise.allSettled 合并。
 * @param {string} url
 * @returns {Promise<{probeStatus: number|null, reachable: boolean|null}>}
 */
async function probeExternal(url) {
  const api = externalHealthEndpoint(url);
  const tasks = [
    fetch(url, { mode: 'no-cors', cache: 'no-store' })
      .then(() => ({ reachable: true }))
      .catch(() => ({ reachable: false })),
  ];
  if (api) {
    tasks.push(
      fetch(api, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' })
        .then((r) => ({ probeStatus: r.status }))
        .catch(() => ({})), /* API 通道失败不产信号（歧义态，直连通道兜底） */
    );
  }
  const settled = await Promise.allSettled(tasks);
  const merged = { probeStatus: null, reachable: null };
  for (const s of settled) {
    if (s.status !== 'fulfilled' || !s.value) continue;
    if (s.value.probeStatus != null) merged.probeStatus = s.value.probeStatus;
    if (s.value.reachable != null) merged.reachable = s.value.reachable;
  }
  return merged;
}

/** 看门狗到点：若 load 未发生且无更高优 ok 信号 → 失联占位（判定表规则 5） */
function onWatchdog(g) {
  g.timer = null;
  g.loadTimedOut = true;
  evaluate(g);
}

/** iframe onload 属性链入口（iframeAppContent 生成时注入 onload 尾段） */
function onIframeLoad(g) {
  g.loadFired = true;
  evaluate(g);
}

/** 重试：cache-bust 重赋 src（跨域 contentWindow.location 不可读，src 重赋是唯一通用 reload 通道） */
function onRetry(g) {
  g.retryN = (g.retryN || 0) + 1;
  g.loadFired = false;
  g.loadTimedOut = false;
  g.probeStatus = null;
  g.reachable = null;
  g.done = false;
  showPlaceholder(g, false);
  try { g.iframe.src = appendRetryParam(g.url, g.retryN); } catch (e) { /* 极端桩环境保底 */ }
  startWatchdog(g);
  startProbe(g);
}

function startWatchdog(g) {
  clearTimer(g);
  g.timer = setTimeout(() => onWatchdog(g), g.timeoutMs);
}

function startProbe(g) {
  probeExternal(g.url).then((sig) => {
    if (g.done) return;
    if (sig.probeStatus != null) g.probeStatus = sig.probeStatus;
    if (sig.reachable != null) g.reachable = sig.reachable;
    evaluate(g);
  }).catch(() => { /* 探活异常按 unknown 处理：不占位不报错 */ });
}

/**
 * 为单个外部 iframe 挂守卫（幂等：dataset.extGuardBound 守卫）。
 * @param {HTMLIFrameElement} iframe — 带 data-ext-guard="1"（iframeAppContent externalShell 选项生成）
 */
function attachGuard(iframe) {
  if (!iframe || iframe.dataset.extGuardBound === '1') return;
  const url = iframe.getAttribute('src') || '';
  if (!url) return;
  const container = iframe.parentElement;
  if (!container) return;
  const placeholder = container.querySelector('[data-ext-placeholder]');
  if (!placeholder) return; // 非外部壳 iframe（无占位面）不挂
  iframe.dataset.extGuardBound = '1';
  const timeoutMs = parseInt(iframe.dataset.extTimeout || '', 10);
  const g = {
    iframe,
    url,
    placeholder,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : EXTERNAL_PROBE_TIMEOUT_MS,
    loadFired: false,
    loadTimedOut: false,
    probeStatus: null,
    reachable: null,
    done: false,
    retryN: 0,
    timer: null,
  };
  guards.set(iframe, g);
  const retryBtn = placeholder.querySelector('[data-ext-retry]');
  if (retryBtn) retryBtn.addEventListener('click', () => onRetry(g));
  // iframe onload 属性先于守卫挂载触发（content 注入同步路径）→ 已带 loaded 标记
  if (iframe.dataset.loaded === '1') g.loadFired = true;
  startWatchdog(g);
  startProbe(g);
}

/**
 * 容器内全部外部壳 iframe 挂守卫（幂等；page-stack / split-screen 注入点统一入口）。
 * @param {ParentNode} root — app-instance-wrapper / 分屏容器
 */
export function initExternalShellGuards(root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('iframe[data-ext-guard="1"]').forEach(attachGuard);
}

// iframe onload 属性链入口（iframeAppContent externalShell 选项生成）：
// 守卫已在 → 直评；守卫未在（load 先于挂载的极端时序）→ no-op，
// attachGuard 的 dataset.loaded==='1' 补读路径兜底（同 v7.19 SDK 注入竞态双保险同律）。
if (!window.__extShellLoad) {
  window.__extShellLoad = function(iframeEl) {
    const g = iframeEl && guards.get(iframeEl);
    if (g) onIframeLoad(g);
  };
}
