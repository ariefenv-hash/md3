// ==================== iframe-app.js — 通用 iframe 应用嵌入与 MD3 动态色彩注入 ====================
//
// 将独立的 HTML 应用通过 iframe 嵌入 iOS/Pixel 桌面模拟器。
// 提供:
//   - 统一的 iframe 容器（绝对定位填满 app-body）
//   - 全自动 MD3 Material You 动态色彩令牌注入与实时响应（v7.26 起含外观模式）
//   - 大屏与高分屏适配

import { getCurrentThemeHue, generateMD3CssTokens, generateMD3InjectedStylesheet } from './theme-engine.js';
import { getResolvedTheme } from './theme-mode.js';
// v7.28 预览式返回：iframe 加载/重载后请求子应用回报 PB 状态（canBack 记账修复）
import { requestPBSync } from './iframe-pb.js';

/**
 * 注入/同步当前 MD3 主题色到 iframe 内部文档中
 * v7.26：三通道同步（与 theme-engine.applyThemeHue 的广播循环保持同构）
 *   1. <style#md3-dynamic-injected-theme> 全量令牌（按外观模式取公式）
 *   2. <html> inline 直写 --md-h/--h + data-theme-mode（重载窗口双保险）
 *   3. postMessage set-theme-hue（hue + mode，供应用自绘 canvas/SVG 刷新）
 * @param {HTMLIFrameElement} iframeEl
 */
export function syncIframeTheme(iframeEl) {
  if (!iframeEl) return;
  const hue = getCurrentThemeHue();
  const mode = getResolvedTheme() === 'light' ? 'light' : 'dark';
  try {
    const doc = iframeEl.contentDocument || (iframeEl.contentWindow && iframeEl.contentWindow.document);
    if (doc && doc.head) {
      let styleTag = doc.getElementById('md3-dynamic-injected-theme');
      if (!styleTag) {
        styleTag = doc.createElement('style');
        styleTag.id = 'md3-dynamic-injected-theme';
        doc.head.appendChild(styleTag);
      }
      styleTag.textContent = generateMD3InjectedStylesheet(hue, mode);
    }
    // fix(v7.25)：与 applyThemeHue 同款 inline 直写 —— iframe 重载后 postMessage
    // 可能早于注入 SDK handler 注册而丢失，DOM 直写不受消息时序影响（双保险）
    if (doc && doc.documentElement) {
      doc.documentElement.style.setProperty('--md-h', hue);
      doc.documentElement.style.setProperty('--h', hue);
      // v7.26：外观模式直写 —— 共享令牌层（_shared/md3-tokens.css）按
      // [data-theme-mode="light"] 切换浅色方案，与注入样式同值双保险
      doc.documentElement.dataset.themeMode = mode;
    }
  } catch (e) {
    // 跨域或未就绪时忽略，降级为 postMessage
  }

  try {
    if (iframeEl.contentWindow) {
      iframeEl.contentWindow.postMessage({ type: 'set-theme-hue', hue, mode }, '*');
    }
  } catch (e) {}
}

// 暴露全局同步函数以供 onload 回调使用
if (!window.__syncIframeApp) {
  window.__syncIframeApp = function(iframeEl) {
    syncIframeTheme(iframeEl);
    requestPBSync(iframeEl); // v7.28：PB_SYNC_REQ（子应用就绪后回发 PB_STATE）
  };
}

/**
 * 应用根路径锚定（fix(v7.20) issue #2 白底板根因防御）：
 * 应用 iframe 的 src 原为纯相对路径（apps/<id>/index.html），其解析取决于宿主文档
 * 的 base URL —— 一旦宿主文档被 Service Worker 旧缓存 / 代理 / 书签等放在非预期
 * URL 上（用户手机实证：base 逸出到 / 与 /md3/），全部应用 iframe 集体 404，
 * 窗口内呈现白色错误页，开/关动画期间即「白底板」。
 * 现以本模块自身 URL（…/ios-desktop/js/iframe-app.js）为锚，将 src 解析为
 * 站内绝对路径 —— 无论宿主文档被放在哪个 URL，应用 iframe 永远指向正确位置。
 * 保守策略：仅当模块 URL 符合源码版布局（…/ios-desktop/js/）时锚定；
 * dist 构建中本模块被并入 …/assets/desktop-*.js（布局不匹配）→ 自动回退
 * 原相对路径（dist 自身 base 恒定正确，零行为变化）。锚定前缀取自模块 URL 本身
 * （含部署子路径，如 /md3/），对任意子路径部署均成立。
 * @param {string} src — 相对应用路径，如 'apps/messages/index.html'
 * @returns {string} 绝对或相对的应用路径
 */
function anchorAppSrc(src) {
  try {
    const mu = new URL(import.meta.url);
    const m = mu.pathname.match(/^(.*\/ios-desktop)\/js\/[^/]+$/);
    if (m && !src.startsWith('/') && !src.startsWith('http')) {
      return (m[1] + '/' + src).replace(/\/{2,}/g, '/');
    }
  } catch (e) { /* 非 URL 环境（个别测试桩）→ 保持相对路径 */ }
  return src;
}

/**
 * 生成 iframe 应用的 page content HTML。
 * v7.1 设计回归：应用开启只保留「图标 → 内容」的呈现转换，不再插入加载中间层 ——
 * 应用秒开场景下任何加载态都是多余的性能开销与视觉打断。
 * （原 Uiverse 环形涟漪加载层已移除；onload 仍走 __syncIframeApp 同步 MD3 主题）
 * v7.52：新增 opts.sandbox —— 安装包应用（pkg-）以沙箱 iframe 承载任意第三方网页内容，
 * 不授予 allow-same-origin（opaque origin 隔离宿主存储/DOM）；系统能力由 sw.js 注入的
 * pkg-sdk.js 以 postMessage 桥补齐。不传 opts 时行为与旧版完全一致。
 * @param {string} src — iframe 的 src 路径，如 'apps/messages/index.html'
 * @param {{sandbox?: string, onLoadExtra?: string}} [opts] — sandbox 令牌串（PKG_SANDBOX）；
 *        onLoadExtra 为追加进 onload 属性末尾的 JS 片段（v7.60：安装包 iframe 自愈钩子），
 *        调用方保证片段自身不含双引号（属性以双引号包裹）。
 * @returns {string} HTML 字符串
 */
export function iframeAppContent(src, opts = {}) {
  const sandboxAttr = opts.sandbox ? ` sandbox="${opts.sandbox}"` : '';
  const extraJs = opts.onLoadExtra ? `;${opts.onLoadExtra}` : '';
  return `<div style="position:absolute;inset:0;width:100%;height:100%;overflow:hidden;border-radius:0;background:var(--md-surface,#121316);">
    <iframe src="${anchorAppSrc(src)}"${sandboxAttr}
      style="width:100%;height:100%;border:none;display:block;"
      allow="autoplay; fullscreen; microphone; geolocation; camera; display-capture"
      loading="eager"
      onload="this.dataset.loaded='1';window.__syncIframeApp&&window.__syncIframeApp(this)${extraJs}">
    </iframe>
  </div>`;
}
