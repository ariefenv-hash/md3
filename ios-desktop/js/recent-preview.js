import{getAppIconSVG as p}from"./app-icons.js";import{createDynamicIconHTML as h}from"./dynamic-icons.js";export function wallpaperBackdropCSS(e){const c=e||(typeof document<"u"?document:null),n=c&&c.getElementById?c.getElementById("desktop"):null;if(!n)return"";const a=n.style||{},s=a.backgroundImage||"";if(s){const t=[`background-image:${s}`];return a.backgroundSize&&t.push(`background-size:${a.backgroundSize}`),a.backgroundPosition&&t.push(`background-position:${a.backgroundPosition}`),a.backgroundColor&&a.backgroundColor!=="rgba(0, 0, 0, 0)"&&t.push(`background-color:${a.backgroundColor}`),t.join(";")}let r="";try{const t=n.querySelector?n.querySelector("video"):null;if(t&&t.readyState>=2&&t.videoWidth){const f=Math.min(t.videoWidth,2160),o=Math.max(1,Math.round(t.videoHeight/t.videoWidth*f)),i=c.createElement("canvas");i.width=f,i.height=o,i.getContext("2d").drawImage(t,0,0,f,o),r=i.toDataURL("image/jpeg",.85)}}catch{r=""}if(!r)try{const t=n.querySelector?n.querySelector("canvas.procedural-wallpaper"):null;t&&t.width&&t.height&&(r=t.toDataURL("image/jpeg",.85))}catch{r=""}return r?`background-image:url(${r});background-size:cover`:""}export function buildColdTaskHTML(e,c,n){const a=e.type?h(e.type,!1):p(e.id);return`
    <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:linear-gradient(180deg, var(--md-surface,#121418) 0%, var(--md-surface-container,#1a1c20) 100%);">
      ${c}
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;">
        <div style="width:84px;height:84px;opacity:0.94;">${a}</div>
        <div style="font-size:17px;font-weight:600;color:var(--md-on-surface,#fff);">${e.name}</div>
        <div style="font-size:11px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant,#9a9b9e);background:rgba(255,255,255,0.07);padding:4px 12px;border-radius:999px;">\u672A\u5728\u8FD0\u884C</div>
      </div>
      ${n}
    </div>
  `}function m(e){const c=document.getElementById(`app-instance-${e}`);if(c&&c.childElementCount>0)return c;try{if(typeof window<"u"&&window.__splitPaneLiveSource){const n=window.__splitPaneLiveSource(e);if(n&&n.childElementCount>0)return n}}catch{}return null}export function getAppPreviewContentHTML(e,c,n){if(!e)return"";const s=`
    <div class="recent-preview-status-bar">
      <span>${new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:!1})}</span>
      <div style="display:flex;gap:6px;align-items:center;font-size:11px;">
        <span>5G</span>
        <span>100%</span>
      </div>
    </div>
  `,r=`
    <div class="recent-preview-nav-bar">
      <div class="recent-preview-nav-pill"></div>
    </div>
  `,t="background:var(--md-surface,#121418)";if(e.pages&&e.pages[0]&&typeof e.pages[0].content=="string"&&e.pages[0].content.includes("<iframe")){const o=e.pages[0].content.match(/src=["']([^"']+)["']/),i=o?o[1]:"";if(i){const u=m(e.id),v=u?u.querySelector("iframe"):null;if(v)try{const l=v.contentDocument;if(l&&l.documentElement&&l.body&&l.body.childNodes.length>0){let d=l.documentElement.outerHTML;d=d.replace(/<script\b[\s\S]*?<\/script>/gi,"");const g=`<base href="${new URL(i,location.href).href}">`;/<head[^>]*>/i.test(d)?d=d.replace(/<head([^>]*)>/i,`<head$1>${g}`):d=g+d;const y=d.replace(/"/g,"&quot;");return`
              <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;${t}">
                ${s}
                <div style="flex:1;position:relative;overflow:hidden;">
                  <iframe srcdoc="${y}" class="recent-preview-iframe" scrolling="no" tabindex="-1"></iframe>
                </div>
                ${r}
              </div>
            `}}catch{}return buildColdTaskHTML(e,s,r)}}if(e.pages&&e.pages[0]&&e.pages[0].content){let o=m(e.id);if(o&&o.querySelector&&o.querySelector(".split-pane-page")&&(o=o.querySelector(".split-pane-page")),o&&o.childElementCount>0)try{let i=o.innerHTML;return i=i.replace(/<script\b[\s\S]*?<\/script>/gi,""),i=i.replace(/\sid="[^"]*"/g,""),i=i.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi,""),`
          <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;${t};overflow:hidden;">
            ${s}
            <div class="recent-preview-native-body" style="flex:1;overflow:hidden;position:relative;">${i}</div>
            ${r}
          </div>
        `}catch{}return`
      <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);overflow:hidden;">
        ${s}
        <div class="recent-preview-native-body" style="flex:1;overflow:hidden;">
          <div style="font-size:22px;font-weight:700;margin-bottom:12px;color:var(--md-primary);">${e.name}</div>
          ${e.pages[0].content}
        </div>
        ${r}
      </div>
    `}return`
    <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--md-surface,#121418);">
      <div style="width:72px;height:72px;margin-bottom:14px;">${e.type?h(e.type,!1):p(e.id)}</div>
      <div style="font-size:18px;font-weight:600;color:var(--md-on-surface,#fff);">${e.name}</div>
    </div>
  `}
