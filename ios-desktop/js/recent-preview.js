// ==================== recent-preview.js — 多任务卡片预览内容构建（v7.50 自 recent-apps.js 拆分） ====================
//
// 职责（纯 HTML 构建，无手势/无生命周期）：
//   1. buildColdTaskHTML —— 冷任务占位卡（图标 + 名称 + 「未在运行」徽标，零脚本开销）
//   2. getAppPreviewContentHTML —— 预览内容三级来源：
//      iframe 应用 live DOM 快照（剥脚本 + <base> 修源）→ 原生应用实时页面栈克隆
//      （剥脚本/id/inline 处理器）→ pages[0] 静态/图标兜底
//
// 拆分纪律：只依赖 app-icons / dynamic-icons 两个叶子模块；不 import recent-apps.js（防循环）。
// 行为零变化：代码自 recent-apps.js 原样切割（锚点机械切分），仅新增本头与导入/导出。

import { getAppIconSVG } from './app-icons.js';
import { createDynamicIconHTML } from './dynamic-icons.js';

/**
 * 冷任务占位：从未打开过的后台卡片不引导启动，
 * 以应用图标 + 名称 + 「未在运行」徽标呈现，零渲染零脚本开销。
 */
export function buildColdTaskHTML(app, statusBarHTML, navBarHTML) {
  const iconHTML = app.type ? createDynamicIconHTML(app.type, false) : getAppIconSVG(app.id);
  // 徽标文案不再绑定「智能冻结」模式名（冷任务占位现在覆盖全部后台模式）
  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:linear-gradient(180deg, var(--md-surface,#121418) 0%, var(--md-surface-container,#1a1c20) 100%);">
      ${statusBarHTML}
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;">
        <div style="width:84px;height:84px;opacity:0.94;">${iconHTML}</div>
        <div style="font-size:17px;font-weight:600;color:var(--md-on-surface,#fff);">${app.name}</div>
        <div style="font-size:11px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant,#9a9b9e);background:rgba(255,255,255,0.07);padding:4px 12px;border-radius:999px;">未在运行</div>
      </div>
      ${navBarHTML}
    </div>
  `;
}

/**
 * 提取或生成应用的微缩内容 HTML
 */
export function getAppPreviewContentHTML(app, baseW, baseH) {
  if (!app) return '';

  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const statusBarHTML = `
    <div class="recent-preview-status-bar">
      <span>${timeStr}</span>
      <div style="display:flex;gap:6px;align-items:center;font-size:11px;">
        <span>5G</span>
        <span>100%</span>
      </div>
    </div>
  `;
  const navBarHTML = `
    <div class="recent-preview-nav-bar">
      <div class="recent-preview-nav-pill"></div>
    </div>
  `;

  // 1. 检查是否为 iframe 应用
  if (app.pages && app.pages[0] && typeof app.pages[0].content === 'string' && app.pages[0].content.includes('<iframe')) {
    const match = app.pages[0].content.match(/src=["']([^"']+)["']/);
    const iframeSrc = match ? match[1] : '';
    if (iframeSrc) {
      // 优先复用运行中实例的当前画面：同源提取 live iframe 的 DOM，
      // 剥离全部脚本后以 srcdoc 静态呈现 —— 预览与真实应用状态一致，
      // 且不会像“重新加载 src”那样产生第二个实例（状态脱节 + 重复执行副作用）。
      const live = document.getElementById(`app-instance-${app.id}`);
      const liveIframe = live ? live.querySelector('iframe') : null;
      if (liveIframe) {
        try {
          const liveDoc = liveIframe.contentDocument;
          if (liveDoc && liveDoc.documentElement && liveDoc.body && liveDoc.body.childNodes.length > 0) {
            let html = liveDoc.documentElement.outerHTML;
            html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
            // srcdoc 内相对资源以文档自身为基会失效 → 注入 <base> 指向应用源地址
            const baseHref = new URL(iframeSrc, location.href).href;
            const baseTag = `<base href="${baseHref}">`;
            if (/<head[^>]*>/i.test(html)) {
              html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
            } else {
              html = baseTag + html;
            }
            const safeHTML = html.replace(/"/g, '&quot;');
            return `
              <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);">
                ${statusBarHTML}
                <div style="flex:1;position:relative;overflow:hidden;">
                  <iframe srcdoc="${safeHTML}" class="recent-preview-iframe" scrolling="no" tabindex="-1"></iframe>
                </div>
                ${navBarHTML}
              </div>
            `;
          }
        } catch (e) { /* 实例未就绪 → 退回按 src 加载 */ }
      }

      // fix(P2)：冷任务（从未打开过）一律走休眠占位 —— 旧实现仅在智能冻结模式下如此，
      // 「全部实时」模式冷卡片会回退 <iframe src> 完整启动一个游离实例：定时器/网络常驻、
      // 不受冻结策略管辖（__syncIframeApp 只注入 SDK、不登记冻结表），仅为展示初始
      // 画面。未打开过的应用无实时状态可展示，占位卡零开销且语义更真实；
      // 点击卡片仍走 openApp 正常启动。热实例（真实运行中）仍走上方 live DOM 快照路径。
      return buildColdTaskHTML(app, statusBarHTML, navBarHTML);
    }
  }

  // 2. 原生 JS 应用内容：
  //    v7.23 实时页面快照 —— 优先克隆运行中实例的当前页面栈（活动页的 inline
  //    transform/opacity 即当前可见态，与正在缩入卡片的窗口内容严丝合缝）。
  //    取 innerHTML 而非 outerHTML：背景应用的 wrapper 自带 display:none，
  //    克隆体会被连带隐藏；子页面自身的显隐态才是需要保留的部分。
  //    剥离脚本 / 全部 id（防与活实例的 getElementById 串场）/ inline on*
  //    处理器（克隆体纯展示，不可交互触发真实页面栈操作）。
  //    实例不在场（冷任务）回退 pages[0] 静态内容。
  if (app.pages && app.pages[0] && app.pages[0].content) {
    const liveWrapper = document.getElementById(`app-instance-${app.id}`);
    if (liveWrapper && liveWrapper.childElementCount > 0) {
      try {
        let html = liveWrapper.innerHTML;
        html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
        html = html.replace(/\sid="[^"]*"/g, '');                      // 克隆体 id 全剥离
        html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');         // inline 处理器剥离
        return `
          <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);overflow:hidden;">
            ${statusBarHTML}
            <div class="recent-preview-native-body" style="flex:1;overflow:hidden;position:relative;">${html}</div>
            ${navBarHTML}
          </div>
        `;
      } catch (e) { /* 快照失败 → 静态 pages[0] 回退 */ }
    }
    return `
      <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);overflow:hidden;">
        ${statusBarHTML}
        <div class="recent-preview-native-body" style="flex:1;overflow:hidden;">
          <div style="font-size:22px;font-weight:700;margin-bottom:12px;color:var(--md-primary);">${app.name}</div>
          ${app.pages[0].content}
        </div>
        ${navBarHTML}
      </div>
    `;
  }

  // 3. 通用兜底
  const iconHTML = app.type ? createDynamicIconHTML(app.type, false) : getAppIconSVG(app.id);
  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--md-surface,#121418);">
      <div style="width:72px;height:72px;margin-bottom:14px;">${iconHTML}</div>
      <div style="font-size:18px;font-weight:600;color:var(--md-on-surface,#fff);">${app.name}</div>
    </div>
  `;
}
