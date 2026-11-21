import{getCurrentThemeHue as c,generateMD3InjectedStylesheet as s}from"./theme-engine.js";import{getResolvedTheme as l}from"./theme-mode.js";import{requestPBSync as p}from"./iframe-pb.js";export function syncIframeTheme(e){if(!e)return;const a=c(),o=l()==="light"?"light":"dark";try{const t=e.contentDocument||e.contentWindow&&e.contentWindow.document;if(t&&t.head){let n=t.getElementById("md3-dynamic-injected-theme");n||(n=t.createElement("style"),n.id="md3-dynamic-injected-theme",t.head.appendChild(n)),n.textContent=s(a,o)}t&&t.documentElement&&(t.documentElement.style.setProperty("--md-h",a),t.documentElement.style.setProperty("--h",a),t.documentElement.dataset.themeMode=o)}catch{}try{e.contentWindow&&e.contentWindow.postMessage({type:"set-theme-hue",hue:a,mode:o},"*")}catch{}}window.__syncIframeApp||(window.__syncIframeApp=function(e){syncIframeTheme(e),p(e)});function h(e){try{const o=new URL(import.meta.url).pathname.match(/^(.*\/ios-desktop)\/js\/[^/]+$/);if(o&&!e.startsWith("/")&&!e.startsWith("http"))return(o[1]+"/"+e).replace(/\/{2,}/g,"/")}catch{}return e}const m=e=>window.__mdEscape(e);function x(e){return`<style>
    [data-ext-placeholder]{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px 18px;text-align:center;background:var(--md-surface,#121316);color:var(--md-on-surface,#e3e1ec);}
    [data-ext-placeholder] .ext-ph-icon{font-size:42px;line-height:1;color:var(--md-error,#f2b8b5);}
    [data-ext-placeholder] .ext-ph-title{font-size:15px;font-weight:600;color:var(--md-on-surface,#e3e1ec);}
    [data-ext-placeholder] .ext-ph-name{font-size:13px;color:var(--md-primary,#aac7ff);}
    [data-ext-placeholder] .ext-ph-reason{font-size:12px;color:var(--md-on-surface-variant,#49454f);max-width:420px;line-height:1.5;}
    [data-ext-placeholder] .ext-ph-note{font-size:11px;color:var(--md-on-surface-variant,#49454f);opacity:.8;max-width:420px;line-height:1.5;}
    [data-ext-placeholder] [data-ext-retry]{height:38px;padding:0 22px;border:none;border-radius:20px;background:var(--md-primary,#aac7ff);color:var(--md-on-primary,#062e6f);font-size:13px;font-weight:600;cursor:pointer;}
    @media (min-width:768px){[data-ext-placeholder]{gap:14px;padding:36px 28px;}[data-ext-placeholder] .ext-ph-title{font-size:17px;}[data-ext-placeholder] .ext-ph-reason{font-size:13px;max-width:520px;}}
  </style>
  <div data-ext-placeholder hidden data-test="ext-placeholder">
    <span class="material-symbols-rounded ext-ph-icon" aria-hidden="true">wifi_off</span>
    <div class="ext-ph-title">\u5916\u90E8\u7AD9\u70B9\u6682\u4E0D\u53EF\u8FBE</div>
    <div class="ext-ph-name">${m(e||"\u5916\u90E8\u5E94\u7528")}</div>
    <div class="ext-ph-reason" data-ext-placeholder-reason></div>
    <div class="ext-ph-note">\u5916\u90E8\u7AD9\u70B9\u4E0D\u53D7 md3 \u7BA1\u8F96\uFF1B\u6DF1\u5EA6\u53EF\u7528\u6027\u53D7\u540C\u6E90\u7B56\u7565\u9650\u5236\u4E0D\u53EF\u63A2\u6D4B\uFF0C\u672C\u5224\u5B9A\u4EC5\u7F51\u7EDC\u7EA7\u4FE1\u53F7\uFF08#172 \u8FB9\u754C\uFF09\u3002</div>
    <button type="button" data-ext-retry data-test="ext-retry">\u91CD\u8BD5</button>
  </div>`}export function iframeAppContent(e,a={}){const o=a.sandbox?` sandbox="${a.sandbox}"`:"",t=a.externalShell||null,n=t?' data-ext-guard="1"':"",d=t?";window.__extShellLoad&&window.__extShellLoad(this)":"",r=a.onLoadExtra?`;${a.onLoadExtra}`:"",i=t?x(t.name):"";return`<div style="position:absolute;inset:0;width:100%;height:100%;overflow:hidden;border-radius:0;background:var(--md-surface,#121316);">
    <iframe src="${h(e)}"${o}${n}${u(t)}
      style="width:100%;height:100%;border:none;display:block;"
      allow="autoplay; fullscreen; microphone; geolocation; camera; display-capture"
      loading="eager"
      onload="this.dataset.loaded='1';window.__syncIframeApp&&window.__syncIframeApp(this)${d}${r}">
    </iframe>${i}
  </div>`}function u(e){return!e||!(Number.isFinite(e.timeoutMs)&&e.timeoutMs>0)?"":` data-ext-timeout="${Math.floor(e.timeoutMs)}"`}
