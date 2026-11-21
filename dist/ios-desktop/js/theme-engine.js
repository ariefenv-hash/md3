import{dom as xe}from"./dom.js";import{ICONS as g}from"./icons.js";import{AOSP_ICONS as Ue}from"./icons-aosp.js";import{triggerWallpaperSelect as we,triggerFontSelect as Ve,clearCustomWallpaper as j,clearSavedPalette as be,clearCustomFont as Ye,getFontName as H,getFontWeights as Ke}from"./wallpaper.js";import{clearVideoWallpaper as U}from"./video-wallpaper.js";import{getThemeModePref as Se,setThemeMode as ke,getResolvedTheme as re}from"./theme-mode.js";import{Spring as ne,Spring2D as Je}from"./spring.js";import{setSwitchChecked as V}from"./m3-controls.js";import{curOpenParams as Xe,curCloseParams as se}from"./animation-presets.js";import{registerOverlayBack as Qe}from"./overlay-registry.js";import{state as ie}from"./state.js";import{initialApps as Ze}from"./apps-data.js";import{openApp as et}from"./app-window.js";import{pushSubPage as Te}from"./page-stack.js";import{CLOCK_FACES as Ee,CLOCK_FONT_SOURCES as Ce,LOCK_CLOCK_FACE_KEY as tt,CLOCK_FONT_KEY as ot,buildFaceHTML as at}from"./aosp/clock-faces.js";import{watchfaceGenStore as E,GEN_DIMENSIONS as rt,dimensionValueLabel as nt}from"./aosp/watchface-generator.js";import{ensureClockFontLoaded as st}from"./clock-font-loader.js";import{PROCEDURAL_PRESETS as W,applyProceduralWallpaper as $e,clearProceduralWallpaper as _e,getActiveProceduralId as C,renderProceduralThumbnail as Le,getProceduralSnapshotURL as Pe}from"./procedural-wallpaper.js";import{createColorScheme as le,schemeToCssVars as Ae,argbToHex as Ie}from"./aosp/monet.js";import{buildCustomScheme as Me,parseCommunityTheme as Be,blendSeeds as We,PRESET_COLORS as it,MONET_STYLES as lt}from"./aosp/theme-color.js";import{isWallpaperBlurEnabled as dt,setWallpaperBlurEnabled as ct}from"./desktop-blur.js";let $=215;try{const e=localStorage.getItem("ios-desktop:theme-hue");e&&($=parseInt(e,10)||215)}catch{}export const PRESET_WALLPAPERS=[{name:"Pixel 10 \u6781\u5149\u6D41\u5149",url:"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",hue:215},{name:"Material You \u62BD\u8C61\u51E0\u4F55",url:"https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80",hue:165},{name:"\u6DF1\u9083\u6697\u591C\u661F\u4E91",url:"https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80",hue:275},{name:"\u8D5B\u535A\u843D\u65E5\u4F59\u6656",url:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",hue:35}];export function getCurrentThemeHue(){return $}export function generateMD3CssTokens(e,t="dark"){return t==="light"?`
    --md-h: ${e};
    --md-primary: hsl(${e}, 78%, 38%);
    --md-on-primary: #ffffff;
    --md-primary-container: hsl(${e}, 88%, 90%);
    --md-on-primary-container: hsl(${e}, 60%, 16%);
    --md-secondary: hsl(${e}, 32%, 38%);
    --md-on-secondary: #ffffff;
    --md-secondary-container: hsl(${e}, 30%, 90%);
    --md-on-secondary-container: hsl(${e}, 30%, 18%);
    --md-tertiary: hsl(${(e+60)%360}, 65%, 40%);
    --md-on-tertiary: #ffffff;
    --md-tertiary-container: hsl(${(e+60)%360}, 55%, 88%);
    --md-on-tertiary-container: hsl(${(e+60)%360}, 50%, 16%);
    --md-surface: hsl(${e}, 40%, 98%);
    --md-surface-dim: hsl(${e}, 18%, 88%);
    --md-surface-bright: hsl(${e}, 40%, 100%);
    --md-surface-container-lowest: hsl(${e}, 40%, 100%);
    --md-surface-container-low: hsl(${e}, 36%, 96%);
    --md-surface-container: hsl(${e}, 32%, 93%);
    --md-surface-container-high: hsl(${e}, 30%, 90%);
    --md-surface-container-highest: hsl(${e}, 28%, 87%);
    --md-on-surface: hsl(${e}, 22%, 12%);
    --md-on-surface-variant: hsl(${e}, 14%, 32%);
    --md-outline: hsl(${e}, 10%, 58%);
    /* #325 \u5F00\u5173\u672A\u9009\u4E2D\u7403\u7EC4\u4EF6\u7EA7 AOSP \u57FA\u7EBF\uFF08\u6D45\uFF09\uFF1ASwitchTokens.UnselectedHandleColor \u5B57\u9762 #74777F\u3002
     * \u6CE8\u5165 iframe \u94FE\u4E0E\u58F3\u5C42 css\uFF08md3-theme.css/theme-mode.css\uFF09\u540C\u952E\u540C\u503C\uFF0C\u56DB\u6E90\u5355\u4EE4\u724C\u3002 */
    --md-switch-unselected-handle: #74777f;
    --md-outline-variant: hsl(${e}, 18%, 82%);
    --md-accent: hsl(${e}, 85%, 40%);
    --md-accent-container: hsl(${e}, 88%, 90%);
  `:`
    --md-h: ${e};
    --md-primary: hsl(${e}, 82%, 36%);
    --md-on-primary: #ffffff;
    --md-primary-container: hsl(${e}, 85%, 22%);
    --md-on-primary-container: hsl(${e}, 92%, 92%);
    --md-secondary: hsl(${e}, 28%, 46%);
    --md-on-secondary: #ffffff;
    --md-secondary-container: hsl(${e}, 24%, 20%);
    --md-on-secondary-container: hsl(${e}, 30%, 90%);
    --md-tertiary: hsl(${(e+60)%360}, 65%, 40%);
    --md-on-tertiary: #ffffff;
    --md-tertiary-container: hsl(${(e+60)%360}, 60%, 20%);
    --md-on-tertiary-container: hsl(${(e+60)%360}, 85%, 92%);
    --md-surface: hsl(${e}, 18%, 8%);
    --md-surface-dim: hsl(${e}, 20%, 6%);
    --md-surface-bright: hsl(${e}, 16%, 14%);
    --md-surface-container-lowest: hsl(${e}, 22%, 5%);
    --md-surface-container-low: hsl(${e}, 18%, 10%);
    --md-surface-container: hsl(${e}, 16%, 14%);
    --md-surface-container-high: hsl(${e}, 14%, 18%);
    --md-surface-container-highest: hsl(${e}, 13%, 24%);
    --md-on-surface: hsl(${e}, 10%, 94%);
    --md-on-surface-variant: hsl(${e}, 12%, 72%);
    --md-outline: hsl(${e}, 10%, 48%);
    /* #325 \u5F00\u5173\u672A\u9009\u4E2D\u7403\u7EC4\u4EF6\u7EA7 AOSP \u57FA\u7EBF\uFF08\u6697\uFF09\uFF1ASwitchTokens.UnselectedHandleColor \u5B57\u9762 #938F99\u3002 */
    --md-switch-unselected-handle: #938f99;
    --md-outline-variant: hsl(${e}, 12%, 24%);
    --md-accent: hsl(${e}, 92%, 68%);
    --md-accent-container: hsl(${e}, 85%, 20%);
  `}export function generateMD3InjectedStylesheet(e,t="dark"){return`
    :root {
      ${generateMD3CssTokens(e,t)}
    }
    .md3-dynamic-accent { color: var(--md-accent) !important; }
    .md3-dynamic-bg { background-color: var(--md-surface) !important; }
    .md3-dynamic-card { background-color: var(--md-surface-container) !important; border-color: var(--md-outline-variant) !important; }
  `}export function initThemeEngine(){ft(),window.openThemePicker=openThemePicker,window.__themeHueTest={get:()=>$,set:e=>applyThemeHue(e,!1)},window.__closeThemePicker=closeThemePicker,window.__closeThemePickerAnimated=qe,ut(),Qe({id:"themePicker",isActive:()=>{const e=_();return!!(e&&e.classList.contains("active")&&!n.dragging&&!n.x)},beginGesture:e=>window.__themePickerGesture.begin(e),progressGesture:e=>window.__themePickerGesture.progress(e),commitGesture:e=>window.__themePickerGesture.commit(e),cancelGesture:e=>window.__themePickerGesture.cancel(e)}),applyThemeHue($,!1),L(!1),window.__monetReroll=()=>L(!1),window.__monetTest={get enabled(){return isMonetEnabled()},get seed(){return getMonetSeed()},apply:e=>applyMonetSeed(e,!1),setEnabled:e=>setMonetEnabled(e,!1)},window.__themeColorTest={get cfg(){return getCustomThemeColor()},apply:e=>applyCustomThemeColor(e,!1),clear:()=>clearCustomThemeColor(!1),scheme:e=>Me(e),parse:e=>Be(e)}}const pt=.35,Y=4e3,n={loop:0,pos2:null,x:null,dragging:!1,dir:1,cleanupTimer:0,closeDone:null};function _(){return document.getElementById("themePickerOverlay")}function S(){return document.getElementById("themePickerCard")}function K(){n.loop&&(cancelAnimationFrame(n.loop),n.loop=0)}function ze(){K(),n.pos2=null,n.x=null,n.dragging=!1,n.closeDone=null;const e=_(),t=S();t&&(t.style.transition="",t.style.willChange="",t.style.transform=""),e&&(e.style.transition="",e.style.willChange="",e.style.opacity="",delete e.dataset.gesturing)}function J(){K();const e=S();if(!e)return;let t=performance.now();const r=s=>{const l=Math.min((s-t)/1e3,.03333333333333333)||.016666666666666666;t=s;let f=!1,u=0,v=0,b=1;n.pos2&&(n.pos2.update(l),u=n.pos2.px,v=n.pos2.py,Math.abs(n.pos2.x.v)<20&&Math.abs(n.pos2.y.v)<20&&Math.abs(u-n.pos2.x.target)<.5&&Math.abs(v-n.pos2.y.target)<.5?n.pos2=null:f=!0);let P=!1;if(n.x&&(n.x.update(l),u=n.x.x,v=0,b=1,P=!0,Math.abs(n.x.v)<20&&Math.abs(u-n.x.target)<.5?(n.x=null,P=!1,u=0):f=!0),n.pos2||P)e.style.transform=`translate3d(${u.toFixed(2)}px, ${v.toFixed(2)}px, 0) scale(${b.toFixed(4)})`;else{e.style.transform="",e.style.willChange="";const x=n.closeDone;n.closeDone=null,x&&x()}n.loop=f||n.closeDone?requestAnimationFrame(r):0};n.loop=requestAnimationFrame(r)}function mt(){const e=S();if(!e)return;const t=window.innerWidth,r=Xe();n.pos2=new Je(r,t+80,0,0,0),n.pos2.setTarget(0,0,0,0),n.x=null,e.style.willChange="transform",e.style.transform=`translate3d(${(t+80).toFixed(2)}px, 0, 0)`,J()}function qe(){const e=_(),t=S();!e||!t||!e.classList.contains("active")||n.dragging||n.x||n.closeDone||(n.pos2&&(K(),n.pos2=null,n.closeDone=null,t.style.transform="",t.style.willChange=""),e.style.transition="opacity 0.22s ease",e.style.opacity="0",n.x=new ne({...se(),initialValue:0}),n.x.setTarget(window.innerWidth+80,null),n.closeDone=()=>{closeThemePicker(),e.style.transition="",e.style.opacity=""},J())}function ut(){window.__themePickerGesture={isActive:()=>{const e=_();return!!(e&&e.classList.contains("active")&&!n.dragging&&!n.x)},begin(e){const t=_(),r=S();!t||!r||!t.classList.contains("active")||(n.pos2&&(K(),n.pos2=null,r.style.transform="",r.style.willChange=""),clearTimeout(n.cleanupTimer),n.dragging=!0,n.dir=e>=0?1:-1,r.style.willChange="transform",t.dataset.gesturing="1",n.cleanupTimer=setTimeout(()=>{delete _()?.dataset.gesturing},1200))},progress(e){if(!n.dragging)return;const t=S();if(!t)return;const r=(e>0?e:e*pt)*n.dir;t.style.transform=`translate3d(${r.toFixed(2)}px, 0, 0)`},commit(e){if(!n.dragging)return;n.dragging=!1;const t=S();if(!t)return;const r=/translate3d\(([-\d.]+)px/.exec(t.style.transform||""),s=r?parseFloat(r[1]):0,l=window.innerWidth;n.x=new ne({...se(),initialValue:s,initialVelocity:Math.max(-Y,Math.min(Y,(e||0)*n.dir))}),n.x.setTarget(n.dir*(l+80),null),n.closeDone=()=>closeThemePicker(),J()},cancel(e){if(!n.dragging)return;n.dragging=!1;const t=S();if(!t)return;const r=/translate3d\(([-\d.]+)px/.exec(t.style.transform||""),s=r?parseFloat(r[1]):0;n.x=new ne({...se(),initialValue:s,initialVelocity:Math.max(-Y,Math.min(Y,(e||0)*n.dir))}),n.x.setTarget(0,null),n.closeDone=()=>{const l=_();l&&delete l.dataset.gesturing},J()}}}function ft(){let e=document.getElementById("themePickerOverlay");if(e)return;e=document.createElement("div"),e.id="themePickerOverlay",e.className="theme-picker-overlay",e.innerHTML=`
    <div class="theme-picker-card" id="themePickerCard">
      <div class="theme-picker-header">
        <div class="theme-picker-title" id="themePickerTitle">${g.image} \u58C1\u7EB8\u4E0E\u52A8\u6001\u58C1\u7EB8</div>
        <span class="theme-picker-header-space"></span>
      </div>

      <!-- \u5355\u5C42\u9875\u9762\uFF1A\u6240\u6709\u8BBE\u7F6E\u4E00\u5C4F\u76F4\u8FBE\uFF1B\u8FD4\u56DE = \u8FB9\u7F18\u6ED1\u51FA\uFF08\u6574\u9875\u8DDF\u624B\uFF0C\u900F\u51FA\u684C\u9762\uFF09\u6216 Esc -->
      <div class="theme-body" id="themeWallpaperView">
        <!-- \u5F53\u524D\u58C1\u7EB8\u72B6\u6001\u884C\uFF08\u5B9E\u65F6\u7F29\u7565\u56FE + \u6458\u8981\uFF0C\u4E0D\u53EF\u70B9\u51FB\uFF09 -->
        <div class="theme-section">
          <div class="theme-nav-row static" id="themeWallpaperNav">
            <div class="theme-nav-preview" id="themeNavWallpaperThumb"></div>
            <div class="theme-nav-texts">
              <div class="theme-nav-title">\u5F53\u524D\u58C1\u7EB8</div>
              <div class="theme-nav-sub" id="themeNavWallpaperSub">\u9759\u6001 / \u52A8\u6001 / \u89C6\u9891</div>
            </div>
          </div>
        </div>

        <!-- \u5916\u89C2\u6A21\u5F0F\uFF1A\u8DDF\u968F\u7CFB\u7EDF / \u6D45\u8272 / \u6DF1\u8272 -->
        <div class="theme-section theme-mode-section">
          <div class="theme-section-label">\u5916\u89C2\u6A21\u5F0F</div>
          <div class="theme-mode-row" id="themeModeRow">
            <div class="theme-mode-opt" data-mode="auto">\u8DDF\u968F\u7CFB\u7EDF</div>
            <div class="theme-mode-opt" data-mode="light">\u6D45\u8272</div>
            <div class="theme-mode-opt" data-mode="dark">\u6DF1\u8272</div>
          </div>
        </div>

        <!-- \u7A0B\u5E8F\u5316\u52A8\u6001\u58C1\u7EB8\uFF08\u5927\u5361\u4F4D\uFF09 -->
        <div class="theme-section">
          <div class="theme-section-label">\u7A0B\u5E8F\u5316\u52A8\u6001\u58C1\u7EB8<span class="theme-live-badge">\u5B9E\u65F6\u6E32\u67D3 \xB7 \u9AD8\u6E05</span></div>
          <div class="proc-grid" id="themeDynamicGrid"></div>
          <div class="theme-section-hint">\u4EE3\u7801\u5B9E\u65F6\u7ED8\u5236\uFF0C\u4E0D\u5360\u5B58\u50A8\u7A7A\u95F4\uFF1B\u52A8\u6001\u58C1\u7EB8\u4E0E\u9759\u6001/\u89C6\u9891\u58C1\u7EB8\u4E8C\u9009\u4E00\uFF0C\u540E\u9009\u8005\u4F18\u5148</div>
        </div>

        <!-- \u9759\u6001\u58C1\u7EB8\u7CBE\u9009\u5E93 -->
        <div class="theme-section">
          <div class="theme-section-label">\u9759\u6001\u58C1\u7EB8 \xB7 \u7CBE\u9009\u5E93</div>
          <div class="theme-wallpapers-grid compact" id="themeWallpapersGrid"></div>
        </div>

        <!-- \u81EA\u5B9A\u4E49\u4E0A\u4F20\uFF08\u9759\u6001/\u52A8\u6001\u81EA\u52A8\u8BC6\u522B\uFF09 -->
        <div class="theme-section">
          <div class="theme-section-label">\u81EA\u5B9A\u4E49\u58C1\u7EB8</div>
          <button class="theme-upload-zone" id="themeUploadAnyBtn">
            ${g.folder}
            <span class="theme-upload-zone-texts">
              <span class="theme-upload-zone-title">\u4E0A\u4F20\u56FE\u7247 / \u89C6\u9891</span>
              <span class="theme-upload-zone-sub">\u81EA\u52A8\u8BC6\u522B\uFF1A\u56FE\u7247 \u2192 \u9759\u6001\u58C1\u7EB8\uFF0C\u89C6\u9891 \u2192 \u52A8\u6001\u58C1\u7EB8</span>
            </span>
          </button>
          <div class="theme-section-hint">\u652F\u6301 JPG / PNG / WebP \u56FE\u7247\u4E0E MP4 / WebM \u89C6\u9891\uFF0C\u89C6\u9891\u4E0A\u9650 200MB\uFF1B\u4E0A\u4F20\u89C6\u9891\u540E\u4F1A\u81EA\u52A8\u63D0\u53D6\u753B\u9762\u4E3B\u9898\u8272\u8054\u52A8\u5168\u5C40\u914D\u8272</div>
        </div>
      </div>
    </div>
  `,e.addEventListener("click",r=>{e.dataset.gesturing==="1"&&(r.stopPropagation(),r.preventDefault())},!0),document.body.appendChild(e),document.getElementById("themeUploadAnyBtn").addEventListener("click",()=>{we(),qe()});const t=document.getElementById("themeModeRow");t&&t.querySelectorAll(".theme-mode-opt").forEach(r=>{r.addEventListener("click",()=>{ke(r.dataset.mode),ce()})}),yt(),xt()}function de(){const e=document.getElementById("themeNavWallpaperSub");if(!e)return;let t="\u9759\u6001 / \u52A8\u6001 / \u89C6\u9891";try{if(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive())t="\u5F53\u524D\u4F7F\u7528\uFF1A\u89C6\u9891\u52A8\u6001\u58C1\u7EB8";else{const r=C();if(r){const s=W.find(l=>l.id===r);t=`\u5F53\u524D\u4F7F\u7528\uFF1A${s?s.name:"\u7A0B\u5E8F\u5316"}\u52A8\u6001\u58C1\u7EB8`}else t=localStorage.getItem("ios-desktop:wallpaper")||""?"\u5F53\u524D\u4F7F\u7528\uFF1A\u81EA\u5B9A\u4E49 / \u9884\u8BBE\u9759\u6001\u58C1\u7EB8":"\u9759\u6001 / \u52A8\u6001 / \u89C6\u9891"}}catch{}e.textContent=t}function ht(){const e=document.getElementById("themeNavWallpaperThumb");if(!e)return;let t="";try{if(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive())t=window.__videoWallpaper.getVideoFrameDataURL()||"";else if(C())t=Pe()||"";else{const s=(document.getElementById("desktop")?.style.backgroundImage||"").match(/url\(["']?(.+?)["']?\)/);t=s?s[1]:""}}catch{}e.style.backgroundImage=t?`url('${t}')`:"none",e.classList.toggle("empty",!t)}function vt(){de(),ht()}function ce(){const e=document.getElementById("themeModeRow");if(!e)return;const t=Se();e.querySelectorAll(".theme-mode-opt").forEach(r=>{r.classList.toggle("active",r.dataset.mode===t)})}function yt(){ce()}function gt(){const e=document.getElementById("themeDynamicGrid");if(!e)return;const t=C();e.innerHTML=W.map((r,s)=>`
    <div class="wallpaper-thumb-card proc-card ${s===0?"proc-hero":""} ${r.id===t?"active":""}" data-proc="${r.id}">
      <div class="wallpaper-thumb-img" style="background-image: url('${Le(r.id)}');"></div>
      <span class="proc-live-badge">LIVE</span>
      <span class="wallpaper-thumb-name">${r.name}</span>
    </div>
  `).join(""),e.querySelectorAll("[data-proc]").forEach(r=>{r.addEventListener("click",()=>{const s=r.dataset.proc,l=W.find(f=>f.id===s);if(l){j(),U();try{localStorage.removeItem("ios-desktop:wallpaper"),sessionStorage.removeItem("ios-desktop:wallpaper")}catch{}$e(s),applyThemeHue(l.hue,!1),de(),e.querySelectorAll("[data-proc]").forEach(f=>f.classList.remove("active")),r.classList.add("active")}})})}function xt(){const e=document.getElementById("themeWallpapersGrid");e&&(e.innerHTML=PRESET_WALLPAPERS.map((t,r)=>`
    <div class="wallpaper-thumb-card" data-idx="${r}">
      <div class="wallpaper-thumb-img" style="background-image: url('${t.url}');"></div>
      <span class="wallpaper-thumb-name">${t.name}</span>
    </div>
  `).join(""),e.querySelectorAll(".wallpaper-thumb-card").forEach(t=>{t.addEventListener("click",()=>{const r=parseInt(t.dataset.idx,10),s=PRESET_WALLPAPERS[r];if(s){j(),_e(),U(),be();try{document.getElementById("themeUploadAnyBtn")?.classList.remove("active"),e.querySelectorAll("[data-proc]").forEach(l=>l.classList.remove("active"))}catch{}xe.desktop.style.backgroundImage=`url('${s.url}')`;try{localStorage.setItem("ios-desktop:wallpaper",s.url)}catch{}applyThemeHue(s.hue,!0),document.querySelectorAll("iframe").forEach(l=>{try{l.contentWindow.postMessage({type:"set-wallpaper",url:s.url},"*")}catch{}}),window.showSystemToast&&window.showSystemToast(`\u5DF2\u5E94\u7528\u58C1\u7EB8\u4E0E\u4E3B\u9898\u8272: ${s.name}`,g.palette),de()}})}))}export function applyThemeHue(e,t=!0){$=e;const r=re()==="light"?"light":"dark",s=r==="light",l=document.documentElement;l.style.setProperty("--md-h",e),l.style.setProperty("--h",e),l.style.setProperty("--md-primary",`hsl(${e}, ${s?"78%, 38%":"82%, 36%"})`),l.style.setProperty("--md-on-primary","#ffffff"),l.style.setProperty("--md-primary-container",`hsl(${e}, ${s?"88%, 90%":"85%, 22%"})`),l.style.setProperty("--md-on-primary-container",s?`hsl(${e}, 60%, 16%)`:`hsl(${e}, 92%, 92%)`),l.style.setProperty("--md-secondary",`hsl(${e}, ${s?"32%, 38%":"28%, 46%"})`),l.style.setProperty("--md-tertiary",`hsl(${(e+60)%360}, 65%, 40%)`),l.style.setProperty("--md-surface",`hsl(${e}, ${s?"40%, 98%":"18%, 8%"})`),l.style.setProperty("--md-surface-container",`hsl(${e}, ${s?"32%, 93%":"16%, 14%"})`),l.style.setProperty("--md-accent",`hsl(${e}, ${s?"85%, 40%":"92%, 68%"})`),l.style.setProperty("--md-outline-variant",`hsl(${e}, ${s?"18%, 82%":"12%, 24%"})`);try{localStorage.setItem("ios-desktop:theme-hue",String(e))}catch{}document.querySelectorAll("iframe").forEach(f=>{try{const u=f.contentDocument||f.contentWindow&&f.contentWindow.document;if(u&&u.head){let v=u.getElementById("md3-dynamic-injected-theme");v||(v=u.createElement("style"),v.id="md3-dynamic-injected-theme",u.head.appendChild(v)),v.textContent=generateMD3InjectedStylesheet(e,r)}u&&u.documentElement&&(u.documentElement.style.setProperty("--md-h",e),u.documentElement.style.setProperty("--h",e)),u&&u.documentElement&&(u.documentElement.dataset.themeMode=r),f.contentWindow&&f.contentWindow.postMessage({type:"set-theme-hue",hue:e,mode:r},"*")}catch{}}),t&&window.showSystemToast&&window.showSystemToast(`\u5DF2\u5E94\u7528 Material You \u4E3B\u9898\u8272 (\u8272\u76F8 ${e}\xB0)`,g.auto_awesome),L(!1)}const Fe="ios-desktop:monet-seed",Oe="ios-desktop:monet-enabled";export function isMonetEnabled(){try{const e=localStorage.getItem(Oe);return e===null?!0:e==="1"}catch{return!0}}export function getMonetSeed(){try{const e=localStorage.getItem(Fe),t=e?parseInt(e,10):NaN;return Number.isFinite(t)?t:null}catch{return null}}function wt(e){try{localStorage.setItem(Fe,String(e))}catch{}}const Ne=["md-primary","md-on-primary","md-primary-container","md-on-primary-container","md-secondary","md-on-secondary","md-secondary-container","md-on-secondary-container","md-tertiary","md-on-tertiary","md-tertiary-container","md-on-tertiary-container","md-surface","md-surface-container","md-surface-container-high","md-on-surface","md-on-surface-variant","md-outline","md-outline-variant","md-accent","monet-seed-hue"];function Re(e){const t=document.documentElement,r=document.body;for(const[s,l]of Object.entries(e))t.style.setProperty(s,l),r&&r.style.setProperty(s,l);document.querySelectorAll("iframe").forEach(s=>{try{const l=s.contentDocument||s.contentWindow&&s.contentWindow.document;if(!l||!l.documentElement)return;for(const[f,u]of Object.entries(e))l.documentElement.style.setProperty(f,u),l.body&&l.body.style.setProperty(f,u);s.contentWindow&&s.contentWindow.postMessage({type:"set-monet-vars",vars:e},"*")}catch{}})}function Ge(){const e=document.documentElement,t=document.body;for(const r of Ne)e.style.removeProperty(`--${r}`),t&&t.style.removeProperty(`--${r}`);document.querySelectorAll("iframe").forEach(r=>{try{const s=r.contentDocument||r.contentWindow&&r.contentWindow.document;if(!s||!s.documentElement)return;for(const l of Ne)s.documentElement.style.removeProperty(`--${l}`),s.body&&s.body.style.removeProperty(`--${l}`)}catch{}})}const pe="ios-desktop:theme-color-custom";export function getCustomThemeColor(){try{const e=localStorage.getItem(pe);if(!e)return null;const t=JSON.parse(e);return t&&typeof t=="object"?t:null}catch{return null}}export function applyCustomThemeColor(e,t=!0){try{localStorage.setItem(pe,JSON.stringify(e))}catch{}L(t)}export function clearCustomThemeColor(e=!0){try{localStorage.removeItem(pe)}catch{}L(e),getMonetSeed()||(Ge(),applyThemeHue($,!1))}function L(e=!1){if(!isMonetEnabled())return;const t=re()==="light"?"light":"dark",r=getCustomThemeColor();if(r&&r.enabled){const f=Me(r);if(f){Re(Ae(f,t)),e&&window.showSystemToast&&window.showSystemToast(`\u81EA\u5B9A\u4E49\u914D\u8272\u5DF2\u5E94\u7528\uFF08${r.seed||""} \xB7 ${f.style}\uFF09`,g.palette);return}}const s=getMonetSeed();if(s==null)return;const l=le(s);Re(Ae(l,t)),e&&window.showSystemToast&&window.showSystemToast(`Material You \u53D6\u8272\u5DF2\u5E94\u7528\uFF08seed ${Ie(s)}\uFF09`,g.auto_awesome)}export function applyMonetSeed(e,t=!1){Number.isFinite(e)&&(wt(e),L(t))}export function setMonetEnabled(e,t=!0){try{localStorage.setItem(Oe,e?"1":"0")}catch{}e?L(t):(Ge(),applyThemeHue($,!1))}export function initWallpaperPage(e){if(!e)return;e.innerHTML=`
    <div style="padding:16px 0;">
      <!-- v8.08 #23 \u5DEE\u8DDD\u77E9\u9635\u2465 AOSP \u6765\u6E90\u533A\uFF1Awallpaper_settings.xml \u4E3A\u7A7A\u58F3 PreferenceScreen
           \uFF08key=wallpaper_type\uFF0Ctitle=wallpaper_settings_fragment_title\u300C\u9009\u62E9\u58C1\u7EB8\u6765\u6E90\u300D\uFF0C\u96F6\u5B50\u9879\uFF09\uFF0C
           WallpaperTypePreferenceController.onStart \u2192 populateWallpaperTypes() \u4EE5
           Intent.ACTION_SET_WALLPAPER \u67E5\u8BE2\uFF08MATCH_DEFAULT_ONLY\uFF09\u52A8\u6001\u586B\u5145\u6D3B\u52A8\u884C
           \uFF08key=packageName / title=\u6D3B\u52A8 label / icon=\u6D3B\u52A8\u56FE\u6807 / \u70B9\u51FB\u8DF3\u51FA\uFF09\u3002
           Web \u4FA7\u89E3\u6790\u547D\u4E2D\u552F\u4E00\u5185\u5EFA\u9009\u62E9\u5668\u300C\u58C1\u7EB8\u548C\u6837\u5F0F\u300D\uFF1BAOSP \u884C\u70B9\u51FB\u8DF3\u51FA Picker \u5E94\u7528\uFF0C
           Web \u884C\u5185\u6EDA\u52A8\u76F4\u8FBE\u4E0B\u65B9\u5185\u5D4C\u9009\u62E9\u5668\uFF08\u94C1\u5F8B#2 \u5408\u6CD5\u8D85\u8D8A\uFF1A\u529F\u80FD\u5185\u5D4C\u4E0D\u8DF3\u5931\uFF09\u3002 -->
      <div class="theme-section" style="margin-bottom:16px;" data-test="wallpaper-source-section">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">\u58C1\u7EB8\u6765\u6E90</div>
        <div style="background:var(--md-surface-container,#232529);border-radius:16px;overflow:hidden;">
          <div class="md3-list-item" id="setWallpaperSourceRow" data-test="wallpaper-source-row" role="button" tabindex="0" style="cursor:pointer;">
            <span class="md3-list-item-text">
              \u58C1\u7EB8\u548C\u6837\u5F0F
              <span style="display:block;font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">
                \u4E3B\u5C4F\u5E55\u3001\u9501\u5B9A\u5C4F\u5E55
              </span>
            </span>
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-on-surface-variant,#9a9b9e);">${Ue.appsChevron||""}</span>
          </div>
        </div>
        <div class="theme-section-hint" data-test="wallpaper-note" style="font-size:11px;color:var(--md-on-surface-variant);margin:6px 4px 0;opacity:0.8;line-height:1.6;">
          AOSP \u6B64\u9875\u4E3A\u7A7A\u58F3\u6E05\u5355\uFF08wallpaper_settings.xml \u96F6\u5B50\u9879\uFF09\uFF0C\u8FD0\u884C\u65F6\u7531 WallpaperTypePreferenceController
          \u679A\u4E3E ACTION_SET_WALLPAPER \u6D3B\u52A8\u52A8\u6001\u586B\u5145\uFF08populateWallpaperTypes / MATCH_DEFAULT_ONLY\uFF09\uFF1B
          \u672C\u673A\u89E3\u6790\u7ED3\u679C\uFF1A\u5185\u5EFA\u300C\u58C1\u7EB8\u548C\u6837\u5F0F\u300D\u9009\u62E9\u5668 1 \u9879\u2014\u2014\u70B9\u51FB\u884C\u5185\u76F4\u8FBE\uFF08\u684C\u9762\u7AEF\u65E0\u5E94\u7528\u8DF3\u8F6C\u8BED\u4E49\uFF0C\u5408\u6CD5\u8D85\u8D8A\uFF09\u3002
        </div>
      </div>

      <!-- \u5F53\u524D\u58C1\u7EB8\u72B6\u6001\u884C -->
      <div class="theme-section" style="margin-bottom:16px;">
        <div class="theme-nav-row static" id="setNavWallpaperRow" style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--md-surface-container,#232529);border-radius:18px;">
          <div class="theme-nav-preview" id="setNavWallpaperThumb" style="width:54px;height:72px;border-radius:10px;background-size:cover;background-position:center;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.12));flex:none;"></div>
          <div class="theme-nav-texts" style="flex:1;">
            <div class="theme-nav-title" style="font-size:15px;font-weight:600;color:var(--md-on-surface);">\u5F53\u524D\u58C1\u7EB8</div>
            <div class="theme-nav-sub" id="setNavWallpaperSub" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;">\u9759\u6001 / \u52A8\u6001 / \u89C6\u9891</div>
          </div>
        </div>
      </div>

      <!-- \u5916\u89C2\u6A21\u5F0F -->
      <div class="theme-section theme-mode-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">\u5916\u89C2\u6A21\u5F0F</div>
        <div class="theme-mode-row" id="setThemeModeRow" style="display:flex;gap:8px;background:var(--md-surface-container,#232529);padding:4px;border-radius:14px;">
          <div class="theme-mode-opt" data-mode="auto" style="flex:1;text-align:center;padding:10px 0;font-size:13px;font-weight:500;border-radius:10px;cursor:pointer;color:var(--md-on-surface-variant);">\u8DDF\u968F\u7CFB\u7EDF</div>
          <div class="theme-mode-opt" data-mode="light" style="flex:1;text-align:center;padding:10px 0;font-size:13px;font-weight:500;border-radius:10px;cursor:pointer;color:var(--md-on-surface-variant);">\u6D45\u8272</div>
          <div class="theme-mode-opt" data-mode="dark" style="flex:1;text-align:center;padding:10px 0;font-size:13px;font-weight:500;border-radius:10px;cursor:pointer;color:var(--md-on-surface-variant);">\u6DF1\u8272</div>
        </div>
      </div>

      <!-- v7.81 \u58C1\u7EB8\u5B9E\u65F6\u6A21\u7CCA\uFF08\u5168\u5C40\u5F00\u5173\uFF09 -->
      <div class="theme-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">\u58C1\u7EB8\u5B9E\u65F6\u6A21\u7CCA</div>
        <div style="background:var(--md-surface-container,#232529);border-radius:16px;overflow:hidden;">
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">
              \u5168\u5C40\u5B9E\u65F6\u6A21\u7CCA
              <span style="display:block;font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">
                \u4E0B\u62C9\u901A\u77E5/\u63A7\u5236\u4E2D\u5FC3\u65F6\u58C1\u7EB8\u8DDF\u624B\u6E10\u8FDB\u6A21\u7CCA\uFF0C\u89C6\u9891\u58C1\u7EB8\u9010\u5E27\u5B9E\u65F6\u8DDF\u968F\uFF1B\u5E94\u7528\u5F00\u5408\u6BDB\u73BB\u7483\u540C\u53D7\u6B64\u5F00\u5173\u63A7\u5236
              </span>
            </span>
            <label class="md3-switch"><input type="checkbox" id="setWallpaperBlurSwitch" aria-label="\u58C1\u7EB8\u5B9E\u65F6\u6A21\u7CCA"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:6px 4px 0;opacity:0.8;">
          \u5173\u95ED\u540E\u5168\u7CFB\u7EDF\u505C\u7528\u58C1\u7EB8\u6A21\u7CCA\uFF08\u5B9E\u65F6\u6A21\u7CCA\u5C42\u4E0D\u518D\u7ED8\u5236\uFF0C\u6027\u80FD\u654F\u611F\u8BBE\u5907\u63A8\u8350\u5173\u95ED\uFF09
        </div>
      </div>

      <!-- v9.94 #33 Monet \u52A8\u6001\u53D6\u8272\uFF08AOSP SystemUI mon\u0435t ColorScheme / Material You\uFF09 -->
      <div class="theme-section" style="margin-bottom:20px;" data-test="monet-section">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">\u52A8\u6001\u53D6\u8272</div>
        <div style="background:var(--md-surface-container,#232529);border-radius:18px;padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">\u58C1\u7EB8\u53D6\u8272\u4E3B\u9898</div>
              <div id="setMonetSub" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;">\u4ECE\u58C1\u7EB8\u63D0\u53D6\u8C03\u8272\u677F\uFF0C\u5168\u7CFB\u7EDF UI \u8DDF\u968F\uFF08Material You\uFF09</div>
            </div>
            <label class="md3-switch"><input type="checkbox" id="setMonetSwitch" data-test="monet-switch" aria-label="Monet \u52A8\u6001\u53D6\u8272"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div id="setMonetSwatches" data-test="monet-swatches" style="display:flex;gap:6px;margin-top:12px;"></div>
          <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:8px 4px 0;opacity:0.8;line-height:1.6;">
            AOSP \u5BF9\u6807 WallpaperColors \u2192 mon\u0435t ColorScheme\uFF08accent1/2/3 + neutral1/2 \u4E94\u8C03\u8272\u677F\uFF09\u2192
            MD3 tone \u6620\u5C04\uFF1BCAM16/HCT \u8272\u5F69\u7A7A\u95F4\u4E0E SystemUI mon\u0435t \u540C\u6784\u3002\u63D0\u8272\u4EC5\u6362\u58C1\u7EB8\u65F6\u8FD0\u884C\uFF08\u786E\u5B9A\u6027\uFF1A\u540C\u56FE\u540C\u8272\u677F\uFF09\u3002
          </div>
        </div>
      </div>

      <!-- v11.50 #50 ColorBlendr \u5F0F\u4E3B\u9898\u8272\u81EA\u5B9A\u4E49\uFF08\u624B\u52A8\u914D\u8272\u8986\u76D6\u5C42\uFF0C\u4F18\u5148\u4E8E\u58C1\u7EB8\u53D6\u8272\uFF09 -->
      <div class="theme-section" style="margin-bottom:20px;" data-test="theme-color-section">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">\u4E3B\u9898\u8272</div>
        <div style="background:var(--md-surface-container,#232529);border-radius:18px;padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">\u81EA\u5B9A\u4E49\u914D\u8272</div>
              <div id="setThemeColorSub" data-test="theme-color-sub" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;">\u624B\u52A8\u914D\u8272\u8986\u76D6 Material You \u53D6\u8272\uFF08ColorBlendr \u5F0F\uFF09</div>
            </div>
            <label class="md3-switch"><input type="checkbox" id="setThemeColorSwitch" data-test="theme-color-switch" aria-label="\u81EA\u5B9A\u4E49\u914D\u8272"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div id="setThemeColorPresets" data-test="theme-color-presets" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;"></div>
          <div id="setThemeColorStyles" data-test="theme-color-styles" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;"></div>
          <div style="margin-top:14px;">
            <div style="font-size:12px;font-weight:600;color:var(--md-on-surface);">\u53CC\u7AEF\u6DF7\u8272</div>
            <div style="display:flex;gap:10px;align-items:center;margin-top:8px;">
              <input type="color" id="setThemeColorBlendA" value="#0B57D0" aria-label="\u7AEF\u8272 A" style="width:36px;height:36px;border:none;border-radius:8px;background:none;cursor:pointer;padding:0;">
              <span style="font-size:12px;color:var(--md-on-surface-variant);">\u2192</span>
              <input type="color" id="setThemeColorBlendB" value="#984061" aria-label="\u7AEF\u8272 B" style="width:36px;height:36px;border:none;border-radius:8px;background:none;cursor:pointer;padding:0;">
              <button id="setThemeColorBlendApply" data-test="theme-color-blend-apply" style="margin-left:auto;padding:7px 14px;border-radius:999px;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.2));background:transparent;color:var(--md-on-surface);font-size:13px;cursor:pointer;">\u7528\u4E2D\u70B9\u8272</button>
            </div>
            <div id="setThemeColorBlendStrip" data-test="theme-color-blend-strip" style="display:flex;height:18px;border-radius:6px;overflow:hidden;margin-top:8px;"></div>
          </div>
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
            <label style="font-size:12px;color:var(--md-on-surface-variant);display:flex;align-items:center;gap:10px;">\u4E3B\u8272\u9971\u548C<input type="range" id="setThemeColorAccentSat" data-test="tc-slider-accent-sat" min="0" max="200" step="1" value="100" style="flex:1;accent-color:var(--md-primary);"></label>
            <label style="font-size:12px;color:var(--md-on-surface-variant);display:flex;align-items:center;gap:10px;">\u80CC\u666F\u9971\u548C<input type="range" id="setThemeColorBgSat" data-test="tc-slider-bg-sat" min="0" max="200" step="1" value="100" style="flex:1;accent-color:var(--md-primary);"></label>
            <label style="font-size:12px;color:var(--md-on-surface-variant);display:flex;align-items:center;gap:10px;">\u80CC\u666F\u660E\u5EA6<input type="range" id="setThemeColorBgLight" data-test="tc-slider-bg-light" min="0" max="200" step="1" value="100" style="flex:1;accent-color:var(--md-primary);"></label>
            <label style="font-size:12px;color:var(--md-on-surface-variant);display:flex;align-items:center;gap:10px;">\u5BF9\u6BD4\u5EA6<input type="range" id="setThemeColorContrast" data-test="tc-slider-contrast" min="-100" max="100" step="1" value="0" style="flex:1;accent-color:var(--md-primary);"></label>
          </div>
          <input type="file" id="setThemeColorImport" accept=".json,application/json" hidden data-test="theme-color-import">
          <div style="display:flex;gap:8px;margin-top:14px;">
            <button id="setThemeColorImportBtn" data-test="theme-color-import-btn" style="flex:1;padding:10px 12px;border-radius:12px;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.2));background:var(--md-surface-container-high,#2f3136);color:var(--md-on-surface);font-size:13px;cursor:pointer;">\u5BFC\u5165\u793E\u533A\u4E3B\u9898 .json</button>
            <button id="setThemeColorResetBtn" data-test="theme-color-reset-btn" style="flex:1;padding:10px 12px;border-radius:12px;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.2));background:transparent;color:var(--md-on-surface);font-size:13px;cursor:pointer;">\u91CD\u7F6E\u4E3A\u58C1\u7EB8\u53D6\u8272</button>
          </div>
          <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:8px 4px 0;opacity:0.8;line-height:1.6;">
            ColorBlendr\uFF08GPL-3.0\uFF09\u8BED\u4E49\u79FB\u690D\uFF1A\u9884\u8BBE\u516B\u8272 / MONET \u5341\u98CE\u683C\uFF08\u2248 \u4E3A web \u8FD1\u4F3C\u6863\uFF09/ \u53CC\u7AEF HCT \u6DF7\u8272 /
            \u4E09\u6ED1\u6746\uFF080-200\uFF0C100 \u539F\u6837\uFF09/ \u5BF9\u6BD4\u5EA6\u3002\u81EA\u5B9A\u4E49\u914D\u8272\u542F\u7528\u65F6\u4F18\u5148\u4E8E\u58C1\u7EB8\u53D6\u8272\uFF1B\u793E\u533A\u4E3B\u9898 .json \u4E25\u683C
            codec \u6821\u9A8C\uFF08\u975E\u6CD5\u8F93\u5165\u62D2\u7EDD\uFF0CschemaVersion 1/2 \u517C\u5BB9\uFF09\u3002
          </div>
        </div>
      </div>

      <!-- \u7A0B\u5E8F\u5316\u52A8\u6001\u58C1\u7EB8 -->
      <div class="theme-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;display:flex;align-items:center;justify-content:space-between;">
          <span>\u7A0B\u5E8F\u5316\u52A8\u6001\u58C1\u7EB8</span>
          <span class="theme-live-badge" style="font-size:10px;padding:2px 6px;border-radius:6px;background:hsl(var(--md-h,215) 80% 55% / 0.18);color:hsl(var(--md-h,215) 85% 65%);">\u5B9E\u65F6\u6E32\u67D3 \xB7 \u9AD8\u6E05</span>
        </div>
        <div class="proc-grid" id="setDynamicGrid" style="display:grid;grid-template-columns:repeat(2, 1fr);gap:10px;"></div>
        <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:6px 4px 0;opacity:0.8;">\u4EE3\u7801\u5B9E\u65F6\u7ED8\u5236\uFF0C\u4E0D\u5360\u5B58\u50A8\u7A7A\u95F4\uFF1B\u52A8\u6001\u58C1\u7EB8\u4E0E\u9759\u6001/\u89C6\u9891\u58C1\u7EB8\u4E8C\u9009\u4E00</div>
      </div>

      <!-- \u9759\u6001\u58C1\u7EB8\u7CBE\u9009\u5E93 -->
      <div class="theme-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">\u9759\u6001\u58C1\u7EB8 \xB7 \u7CBE\u9009\u5E93</div>
        <div class="theme-wallpapers-grid compact" id="setWallpapersGrid" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;"></div>
      </div>

      <!-- \u81EA\u5B9A\u4E49\u58C1\u7EB8 -->
      <div class="theme-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">\u81EA\u5B9A\u4E49\u58C1\u7EB8</div>
        <button class="theme-upload-zone" id="setUploadBtn" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--md-surface-container,#232529);border:1.5px dashed var(--md-outline-variant,rgba(255,255,255,0.2));border-radius:16px;cursor:pointer;color:var(--md-on-surface);text-align:left;">
          ${g.folder}
          <span style="display:flex;flex-direction:column;gap:3px;">
            <span style="font-size:14px;font-weight:600;">\u4E0A\u4F20\u56FE\u7247 / \u89C6\u9891</span>
            <span style="font-size:12px;color:var(--md-on-surface-variant);">\u81EA\u52A8\u8BC6\u522B\uFF1A\u56FE\u7247 \u2192 \u9759\u6001\u58C1\u7EB8\uFF0C\u89C6\u9891 \u2192 \u52A8\u6001\u58C1\u7EB8</span>
          </span>
        </button>
      </div>

      <!-- v9.94 #187 \u81EA\u5B9A\u4E49\u5B57\u4F53\uFF1A\u5355\u6587\u4EF6 + zip \u591A\u5B57\u91CD\u5B57\u4F53\u5305\uFF08JSZip \u590D\u7528\u65E2\u6709 vendor\uFF09 -->
      <div class="theme-section" style="margin-bottom:20px;" data-test="font-section">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">\u5B57\u4F53</div>
        <div style="background:var(--md-surface-container,#232529);border-radius:18px;padding:12px 16px;display:flex;align-items:center;gap:14px;margin-bottom:10px;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">\u5F53\u524D\u5B57\u4F53</div>
            <div id="setFontSub" data-test="font-status" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;">\u7CFB\u7EDF\u9ED8\u8BA4</div>
          </div>
          <button id="setFontClearBtn" data-test="font-clear" style="display:none;flex:none;padding:7px 14px;border-radius:999px;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.2));background:transparent;color:var(--md-on-surface);font-size:13px;cursor:pointer;">\u6062\u590D\u9ED8\u8BA4</button>
        </div>
        <button class="theme-upload-zone" id="setFontUploadBtn" data-test="font-upload" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--md-surface-container,#232529);border:1.5px dashed var(--md-outline-variant,rgba(255,255,255,0.2));border-radius:16px;cursor:pointer;color:var(--md-on-surface);text-align:left;">
          ${g.folder}
          <span style="display:flex;flex-direction:column;gap:3px;">
            <span style="font-size:14px;font-weight:600;">\u5BFC\u5165\u5B57\u4F53 / \u5B57\u4F53\u5305</span>
            <span style="font-size:12px;color:var(--md-on-surface-variant);">.ttf / .otf / .woff / .woff2 \u5355\u6587\u4EF6\uFF0C\u6216 .zip \u591A\u5B57\u91CD\u5B57\u4F53\u5305</span>
          </span>
        </button>
        <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:6px 4px 0;opacity:0.8;line-height:1.6;">
          zip \u5B57\u4F53\u5305\u6309\u5305\u5185 manifest.json \u663E\u5F0F\u58F0\u660E\u6216\u6587\u4EF6\u540D\uFF08Regular / Bold / Light\u2026\uFF09\u63A8\u65AD\u5B57\u91CD\u6863\u4F4D\uFF1B
          \u591A\u5B57\u91CD\u5305\u4E3A font-weight \u79BB\u6563\u9009\u6863\uFF0C\u975E\u53EF\u53D8\u5B57\u4F53\u8FDE\u7EED\u8F74\u63D2\u503C\uFF08\u540E\u8005\u5C5E\u53EF\u53D8\u5B57\u4F53\u8DEF\u7EBF\uFF09
        </div>
      </div>

      <!-- v9.94 #20 \u9501\u5C4F\u8868\u76D8\u7CFB\u7EDF\uFF1A\u65F6\u949F\u6837\u5F0F + \u65F6\u949F\u5B57\u4F53\u53CC\u8282\uFF08Android 13 QPR2\u300C\u58C1\u7EB8\u548C\u6837\u5F0F\u2192\u9501\u5C4F\u300D
           \u8DEF\u5F84\u6620\u5C04\uFF1B\u672C sheet \u5373\u4E8C\u7EA7\u83DC\u5355\u5143\uFF0C\u53CC\u8282\u5185\u70B9\u9009\u5373\u65F6\u5E94\u7528\u3001\u9501\u5B9A\u5C4F\u5B9E\u65F6\u53CD\u6620\uFF09\u3002
           \u5199\u8DEF\u5F84 window.__lockClockFaces\uFF08lock-screen.js \u66B4\u9732\u552F\u4E00\u6301\u4E45\u5316\u5165\u53E3\uFF0C\u96F6 import\uFF09\u3002 -->
      <div class="theme-section" style="margin-bottom:20px;" data-test="lockclock-section">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">\u9501\u5C4F\u65F6\u949F</div>
        <div style="background:var(--md-surface-container,#232529);border-radius:18px;padding:12px 16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">\u65F6\u949F\u6837\u5F0F</div>
          <div id="lockFaceGrid" data-test="lockface-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;"></div>
          <!-- v11.50 #101\uFF1AAI \u751F\u6210\u8868\u76D8\u9762\u677F\uFF08\u751F\u6210\u7ED3\u679C\u843D CLOCK_FACES \u7B2C 5 \u8138 custom\u2014\u2014\u5355\u4E00\u72B6\u6001\u6E90\uFF09 -->
          <div id="watchfaceGenPanel" data-test="watchface-gen-panel" style="margin-top:10px;"></div>
          <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:8px 2px 0;opacity:0.8;line-height:1.6;">
            \u7F29\u7565\u5361\u5B9E\u65F6\u6E32\u67D3\u5F53\u524D\u65F6\u95F4\uFF1BClockSize \u5927\u5C0F\u949F\u6863\u4F4D\uFF08\u901A\u77E5\u538B\u7F29\uFF09\u4E0E\u8868\u76D8\u72EC\u7ACB\u5E76\u5B58\uFF08AOSP \u53CC\u5E27\u57DF\u5206\u79BB\uFF09
          </div>
        </div>
        <div style="background:var(--md-surface-container,#232529);border-radius:18px;padding:12px 16px;margin-top:10px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">\u65F6\u949F\u5B57\u4F53</div>
          <div id="clockFontGrid" data-test="clockfont-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;"></div>
          <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:8px 2px 0;opacity:0.8;line-height:1.6;">
            \u4E0E\u65F6\u949F\u5E94\u7528\u5B57\u4F53\u9009\u62E9\u5171\u7528\u540C\u4E00\u5B58\u50A8\uFF08\u4E00\u5904\u5B9E\u73B0\u4E09\u5904\u5F15\u7528\uFF09\uFF1B\u9884\u89C8 10:08 \u5B9E\u65F6\u6E32\u67D3\uFF0C
            \u5916\u94FE\u5B57\u4F53\u79BB\u7EBF\u65F6\u56DE\u843D\u7CFB\u7EDF\u6808
          </div>
        </div>
      </div>
    </div>
  `;function t(){const o=e.querySelector("#setNavWallpaperThumb"),a=e.querySelector("#setNavWallpaperSub");if(a){let p="\u9759\u6001 / \u52A8\u6001 / \u89C6\u9891";try{if(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive())p="\u5F53\u524D\u4F7F\u7528\uFF1A\u89C6\u9891\u52A8\u6001\u58C1\u7EB8";else{const m=C();if(m){const y=W.find(T=>T.id===m);p=`\u5F53\u524D\u4F7F\u7528\uFF1A${y?y.name:"\u7A0B\u5E8F\u5316"}\u52A8\u6001\u58C1\u7EB8`}else p=localStorage.getItem("ios-desktop:wallpaper")||""?"\u5F53\u524D\u4F7F\u7528\uFF1A\u81EA\u5B9A\u4E49 / \u9884\u8BBE\u9759\u6001\u58C1\u7EB8":"\u9759\u6001 / \u52A8\u6001 / \u89C6\u9891"}}catch{}a.textContent=p}if(o){let p="";try{if(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive())p=window.__videoWallpaper.getVideoFrameDataURL()||"";else if(C())p=Pe()||"";else{const y=(document.getElementById("desktop")?.style.backgroundImage||"").match(/url\(["']?(.+?)["']?\)/);p=y?y[1]:""}}catch{}o.style.backgroundImage=p?`url('${p}')`:"none"}const i=e.querySelector("#setThemeModeRow");if(i){const p=Se();i.querySelectorAll(".theme-mode-opt").forEach(m=>{const y=m.dataset.mode===p;m.style.background=y?"hsl(var(--md-h,215) 80% 55% / 0.25)":"transparent",m.style.color=y?"hsl(var(--md-h,215) 85% 65%)":"var(--md-on-surface-variant)",m.style.fontWeight=y?"600":"500"})}const c=e.querySelector("#setFontSub"),h=e.querySelector("#setFontClearBtn");if(c){const p=H(),m=Ke();c.textContent=p?`\u5F53\u524D\u4F7F\u7528\uFF1A${p}${m&&m.length>1?` \xB7 ${m.length} \u6863\u5B57\u91CD`:m&&m.length===1?` \xB7 ${m[0].weight}`:""}`:"\u7CFB\u7EDF\u9ED8\u8BA4"}h&&(h.style.display=H()?"":"none")}const r=e.querySelector("#setThemeModeRow");r&&r.querySelectorAll(".theme-mode-opt").forEach(o=>{o.addEventListener("click",()=>{ke(o.dataset.mode),t()})});const s=e.querySelector("#setWallpaperBlurSwitch");s&&(V(s,dt()),s.addEventListener("change",()=>{ct(s.checked),window.showSystemToast&&window.showSystemToast(s.checked?"\u58C1\u7EB8\u5B9E\u65F6\u6A21\u7CCA\u5DF2\u5168\u5C40\u5F00\u542F":"\u58C1\u7EB8\u5B9E\u65F6\u6A21\u7CCA\u5DF2\u5168\u5C40\u5173\u95ED",g.colour_correction)}));const l=e.querySelector("#setMonetSwitch"),f=e.querySelector("#setMonetSub"),u=e.querySelector("#setMonetSwatches"),v=()=>{if(l&&V(l,isMonetEnabled()),f){const o=getMonetSeed();f.textContent=isMonetEnabled()?`\u5DF2\u4ECE\u58C1\u7EB8\u53D6\u8272\uFF08seed ${o!=null?Ie(o):"\u9ED8\u8BA4"}\uFF09`:"\u4ECE\u58C1\u7EB8\u63D0\u53D6\u8C03\u8272\u677F\uFF0C\u5168\u7CFB\u7EDF UI \u8DDF\u968F\uFF08Material You\uFF09"}if(u){u.innerHTML="";const o=getMonetSeed(),a=o!=null?le(o):le(4280376800),i=re()==="light"?"light":"dark",c={accent1:80,accent2:80,accent3:80,neutral1:40,neutral2:60};for(const[h,p]of Object.entries(c)){const m=document.createElement("div");m.setAttribute("data-test",`monet-swatch-${h}`),m.style.cssText=`flex:1;height:26px;border-radius:8px;background:${a[h].toCss(p)};border:1px solid var(--md-outline-variant,rgba(255,255,255,0.12));`,u.appendChild(m)}}};l&&(V(l,isMonetEnabled()),l.addEventListener("change",()=>{setMonetEnabled(l.checked,!0),v()}),v());const b=e.querySelector("#setThemeColorSwitch"),P=e.querySelector("#setThemeColorSub"),x=e.querySelector("#setThemeColorPresets"),z=e.querySelector("#setThemeColorStyles"),A=e.querySelector("#setThemeColorBlendA"),I=e.querySelector("#setThemeColorBlendB"),me=e.querySelector("#setThemeColorBlendApply"),F=e.querySelector("#setThemeColorBlendStrip"),X=e.querySelector("#setThemeColorAccentSat"),Q=e.querySelector("#setThemeColorBgSat"),Z=e.querySelector("#setThemeColorBgLight"),M=e.querySelector("#setThemeColorContrast"),B=e.querySelector("#setThemeColorImport"),ue=e.querySelector("#setThemeColorImportBtn"),fe=e.querySelector("#setThemeColorResetBtn"),d=Object.assign({seed:"#0B57D0",style:"TONAL_SPOT",secondary:null,tertiary:null,contrast:0,accentSaturation:100,backgroundSaturation:100,backgroundLightness:100,enabled:!1},getCustomThemeColor()||{}),w=()=>{b&&V(b,!!d.enabled),P&&(P.textContent=d.enabled?`\u5DF2\u5E94\u7528\u81EA\u5B9A\u4E49\u914D\u8272\uFF08${d.seed} \xB7 ${d.style}\uFF09\u2014\u2014\u8986\u76D6\u58C1\u7EB8\u53D6\u8272`:"\u624B\u52A8\u914D\u8272\u8986\u76D6 Material You \u53D6\u8272\uFF08ColorBlendr \u5F0F\uFF09"),x&&x.querySelectorAll("[data-tc-preset]").forEach(o=>{const a=o.dataset.tcPreset===String(d.seed).toUpperCase();o.style.outline=a?"2px solid var(--md-primary)":"none",o.style.outlineOffset="2px"}),z&&z.querySelectorAll("[data-tc-style]").forEach(o=>{const a=o.dataset.tcStyle===d.style;o.style.background=a?"var(--md-primary)":"var(--md-surface-container-high,#2f3136)",o.style.color=a?"var(--md-on-primary,#fff)":"var(--md-on-surface)"}),X&&(X.value=String(d.accentSaturation)),Q&&(Q.value=String(d.backgroundSaturation)),Z&&(Z.value=String(d.backgroundLightness)),M&&(M.value=String(Math.round((d.contrast||0)*100)))};x&&(x.innerHTML=it.map(o=>`
      <div data-tc-preset="${o.hex}" data-test="tc-preset-${o.hex.slice(1)}" role="button" tabindex="0"
        aria-label="\u9884\u8BBE\u4E3B\u9898\u8272 ${o.name}" title="${o.name} ${o.hex}"
        style="width:34px;height:34px;border-radius:50%;background:${o.hex};cursor:pointer;border:2px solid var(--md-outline-variant,rgba(255,255,255,0.15));"></div>
    `).join(""),x.querySelectorAll("[data-tc-preset]").forEach(o=>{const a=()=>{d.seed=o.dataset.tcPreset,d.enabled=!0,applyCustomThemeColor(d,!0),w()};o.addEventListener("click",a),o.addEventListener("keydown",i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),a())})})),z&&(z.innerHTML=lt.map(o=>`
      <button data-tc-style="${o.name}" data-test="tc-style-${o.name}" title="${o.desc}"
        style="padding:5px 10px;border-radius:999px;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.2));background:var(--md-surface-container-high,#2f3136);color:var(--md-on-surface);font-size:11px;cursor:pointer;">${o.label}${o.tier!=="native"?" \u2248":""}</button>
    `).join(""),z.querySelectorAll("[data-tc-style]").forEach(o=>{o.addEventListener("click",()=>{d.style=o.dataset.tcStyle,d.enabled=!0,applyCustomThemeColor(d,!0),w()})}));const ee=()=>{if(!F||!A||!I)return;const o=We(A.value,I.value,7);if(!o){F.innerHTML="";return}F.innerHTML=o.map(a=>`
      <div data-tc-ramp="${a.hex}" title="${a.hex}" style="flex:1;background:${a.hex};cursor:pointer;"></div>
    `).join(""),F.querySelectorAll("[data-tc-ramp]").forEach(a=>{a.addEventListener("click",()=>{d.seed=a.dataset.tcRamp,d.enabled=!0,applyCustomThemeColor(d,!0),w()})})};A&&I&&(ee(),A.addEventListener("input",ee),I.addEventListener("input",ee)),me&&A&&I&&me.addEventListener("click",()=>{const o=We(A.value,I.value,5);o&&(d.seed=o[2].hex,d.enabled=!0,applyCustomThemeColor(d,!0),w())}),[[X,"accentSaturation"],[Q,"backgroundSaturation"],[Z,"backgroundLightness"]].forEach(([o,a])=>{o&&(o.addEventListener("input",()=>{d[a]=parseInt(o.value,10)||100,d.enabled=!0,applyCustomThemeColor(d,!1)}),o.addEventListener("change",()=>w()))}),M&&(M.addEventListener("input",()=>{d.contrast=(parseInt(M.value,10)||0)/100,d.enabled=!0,applyCustomThemeColor(d,!1)}),M.addEventListener("change",()=>w())),ue&&B&&(ue.addEventListener("click",()=>B.click()),B.addEventListener("change",()=>{const o=B.files&&B.files[0];if(!o)return;const a=new FileReader;a.onload=()=>{const i=Be(String(a.result||""));if(!i){window.showSystemToast&&window.showSystemToast("\u5BFC\u5165\u5931\u8D25\uFF1A\u975E ColorBlendr \u793E\u533A\u4E3B\u9898\u683C\u5F0F\u6216\u8F7D\u8377\u975E\u6CD5",g.palette);return}d.seed="#"+(i.seed&16777215).toString(16).padStart(6,"0"),d.secondary=i.secondary?"#"+(i.secondary&16777215).toString(16).padStart(6,"0"):null,d.tertiary=i.tertiary?"#"+(i.tertiary&16777215).toString(16).padStart(6,"0"):null,d.style=i.style,d.accentSaturation=i.accentSaturation,d.backgroundSaturation=i.backgroundSaturation,d.backgroundLightness=i.backgroundLightness,d.enabled=!0,applyCustomThemeColor(d,!0),w(),window.showSystemToast&&window.showSystemToast(`\u793E\u533A\u4E3B\u9898\u5DF2\u5BFC\u5165\uFF1A${i.name}`,g.palette)},a.readAsText(o),B.value=""})),fe&&fe.addEventListener("click",()=>{clearCustomThemeColor(!0),d.enabled=!1,w()}),b&&b.addEventListener("change",()=>{d.enabled=b.checked,d.enabled?applyCustomThemeColor(d,!0):clearCustomThemeColor(!0),w()}),w();const te=e.querySelector("#setWallpaperSourceRow");if(te){const o=()=>{const a=e.querySelector("#setDynamicGrid"),i=a?a.closest(".theme-section")||a:e.querySelector("#setNavWallpaperRow");i&&i.isConnected&&(i.scrollIntoView({behavior:"smooth",block:"start"}),i.style.transition="box-shadow 0.4s ease",i.style.boxShadow="0 0 0 2px hsl(var(--md-h,215) 85% 60%)",setTimeout(()=>{i.isConnected&&(i.style.boxShadow="")},1200))};te.addEventListener("click",o),te.addEventListener("keydown",a=>{(a.key==="Enter"||a.key===" ")&&(a.preventDefault(),o())})}const k=e.querySelector("#setDynamicGrid");if(k){const o=C();k.innerHTML=W.map((p,m)=>`
      <div class="wallpaper-thumb-card proc-card ${m===0?"proc-hero":""} ${p.id===o?"active":""}" data-proc="${p.id}" style="cursor:pointer;position:relative;border-radius:14px;overflow:hidden;border:1.5px solid ${p.id===o?"hsl(var(--md-h,215) 85% 60%)":"transparent"};background:var(--md-surface-container-high,#2f3136);">
        <div data-proc-thumb="${p.id}" style="height:86px;background-color:var(--md-surface-container-high,#2f3136);background-size:cover;background-position:center;"></div>
        <div style="padding:8px 10px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:600;color:var(--md-on-surface);">${p.name}</span>
          <span style="font-size:9px;padding:2px 5px;border-radius:4px;background:hsl(var(--md-h,215) 80% 55% / 0.2);color:hsl(var(--md-h,215) 85% 65%);font-weight:700;">LIVE</span>
        </div>
      </div>
    `).join("");const a=Array.from(k.querySelectorAll("[data-proc-thumb]"));let i=0;const c=()=>{if(i>=a.length)return;const p=a[i++],m=Le(p.dataset.procThumb);p.isConnected&&m&&(p.style.backgroundImage=`url('${m}')`),i<a.length&&h()},h=()=>{typeof requestIdleCallback=="function"?requestIdleCallback(c,{timeout:900}):setTimeout(c,64)};a.length&&h(),k.querySelectorAll("[data-proc]").forEach(p=>{p.addEventListener("click",()=>{const m=p.dataset.proc,y=W.find(T=>T.id===m);if(y){j(),U();try{localStorage.removeItem("ios-desktop:wallpaper"),sessionStorage.removeItem("ios-desktop:wallpaper")}catch{}$e(m),applyThemeHue(y.hue,!1),t(),k.querySelectorAll("[data-proc]").forEach(T=>{const He=T.dataset.proc===m;T.style.borderColor=He?"hsl(var(--md-h,215) 85% 60%)":"transparent"})}})})}const oe=e.querySelector("#setWallpapersGrid");oe&&(oe.innerHTML=PRESET_WALLPAPERS.map((o,a)=>`
      <div class="wallpaper-thumb-card" data-idx="${a}" style="cursor:pointer;border-radius:12px;overflow:hidden;background:var(--md-surface-container-high,#2f3136);border:1.5px solid transparent;">
        <div style="height:90px;background-size:cover;background-position:center;background-image:url('${o.url}');"></div>
        <div style="padding:6px 8px;font-size:11px;font-weight:500;color:var(--md-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.name}</div>
      </div>
    `).join(""),oe.querySelectorAll(".wallpaper-thumb-card").forEach(o=>{o.addEventListener("click",()=>{const a=parseInt(o.dataset.idx,10),i=PRESET_WALLPAPERS[a];if(i){j(),_e(),U(),be(),xe.desktop.style.backgroundImage=`url('${i.url}')`;try{localStorage.setItem("ios-desktop:wallpaper",i.url)}catch{}applyThemeHue(i.hue,!0),document.querySelectorAll("iframe").forEach(c=>{try{c.contentWindow.postMessage({type:"set-wallpaper",url:i.url},"*")}catch{}}),window.showSystemToast&&window.showSystemToast(`\u5DF2\u5E94\u7528\u58C1\u7EB8: ${i.name}`,g.palette),t(),k&&k.querySelectorAll("[data-proc]").forEach(c=>{c.style.borderColor="transparent"})}})}));const he=e.querySelector("#setUploadBtn");he&&he.addEventListener("click",()=>{we()});const ve=e.querySelector("#setFontUploadBtn");ve&&ve.addEventListener("click",()=>{Ve()});const ye=e.querySelector("#setFontClearBtn");ye&&ye.addEventListener("click",async()=>{await Ye(),window.showSystemToast&&window.showSystemToast("\u5DF2\u6062\u590D\u9ED8\u8BA4\u5B57\u4F53",g.folder),t()});const ge=()=>{if(!e.isConnected){window.removeEventListener("font-changed",ge);return}t()};window.addEventListener("font-changed",ge);const je=()=>{if(!e.isConnected)return;const o=e.querySelector("#setDynamicGrid"),a=C();o&&o.querySelectorAll("[data-proc]").forEach(i=>{const c=i.dataset.proc===a&&!(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive());i.style.borderColor=c?"hsl(var(--md-h,215) 85% 60%)":"transparent"}),t()};window.addEventListener("wallpaper-changed",je);const q=e.querySelector("#lockFaceGrid"),O=()=>{if(!q)return;let o="double";try{o=JSON.parse(localStorage.getItem(tt)||"{}").id||"double"}catch{}q.innerHTML=Ee.map(a=>{const i=a.id===o,c=at(a,{date:new Date,size:"small",customConfig:a.id==="custom"?E.getConfig():null});return'<button data-lockface="'+a.id+'" data-test="lockface-'+a.id+'" aria-label="\u9501\u5C4F\u65F6\u949F\u6837\u5F0F '+a.label+'" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px 8px;border-radius:14px;border:2px solid '+(i?"hsl(var(--md-h,215) 85% 60%)":"transparent")+";background:"+(i?"hsl(var(--md-h,215) 80% 55% / 0.12)":"var(--md-surface-container-high,rgba(255,255,255,0.05))")+';cursor:pointer;color:var(--md-on-surface);"><span style="display:flex;align-items:center;justify-content:center;height:52px;width:100%;font-size:19px;line-height:1.1;overflow:hidden;">'+c+'</span><span style="font-size:11px;font-weight:600;">'+a.label+"</span></button>"}).join(""),q.querySelectorAll('[data-face="analog"]').forEach(a=>{a.style.setProperty("--analog-size","44px")})};O(),q&&q.addEventListener("click",o=>{const a=o.target.closest("[data-lockface]");if(!a)return;const i=a.getAttribute("data-lockface");if(window.__lockClockFaces&&window.__lockClockFaces.setFace){window.__lockClockFaces.setFace(i);const c=Ee.find(h=>h.id===i);window.showSystemToast&&c&&window.showSystemToast("\u9501\u5C4F\u65F6\u949F\u6837\u5F0F\uFF1A"+c.label)}O()});const N=e.querySelector("#watchfaceGenPanel"),ae=()=>{if(!N)return;const o=E.getConfig(),a=E.getLocks();N.innerHTML='<div style="border:1px solid var(--md-outline-variant,rgba(255,255,255,0.08));border-radius:14px;padding:10px 12px;"><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:12px;color:var(--md-on-surface-variant);flex:1;min-width:0;">AI \u751F\u6210\u8868\u76D8 \xB7 seed '+o.seed+'\uFF08\u53EF\u590D\u73B0\uFF09</span><button data-wfgen="reroll" data-test="watchface-gen-btn" style="flex:none;padding:6px 14px;border-radius:999px;border:none;background:hsl(var(--md-h,215) 80% 60%);color:#fff;font-size:12px;font-weight:600;cursor:pointer;">\u91CD\u65B0\u751F\u6210</button></div><div style="display:flex;flex-wrap:wrap;gap:6px;padding-top:8px;">'+rt.map(i=>{const c=a[i.key]!==void 0;return'<button data-wfdim="'+i.key+'" data-test="watchface-lock-'+i.key+'" aria-pressed="'+c+'" aria-label="\u9501\u5B9A\u7EF4\u5EA6 '+i.label+'" style="padding:5px 10px;border-radius:999px;border:1px solid '+(c?"hsl(var(--md-h,215) 80% 60%)":"var(--md-outline-variant,rgba(255,255,255,0.14))")+";background:"+(c?"hsl(var(--md-h,215) 80% 55% / 0.16)":"transparent")+';color:var(--md-on-surface);font-size:11px;cursor:pointer;">'+(c?"\u{1F512} ":"")+i.label+"\uFF1A"+nt(i.key,o[i.key])+"</button>"}).join("")+'</div><div style="font-size:10px;color:var(--md-on-surface-variant);opacity:0.75;padding-top:6px;line-height:1.5;">\u70B9\u7EF4\u5EA6\u5361\u9501\u5B9A/\u89E3\u9501\uFF1B\u91CD\u63B7\u4EC5\u968F\u673A\u672A\u9501\u5B9A\u7EF4\u5EA6\uFF1B\u62A4\u680F\u81EA\u52A8\u4FEE\u6B63\u4E0D\u53EF\u8BFB\u7EC4\u5408\u3002\u975E\u771F AI \u6A21\u578B\u2014\u2014\u53C2\u6570\u5316\u751F\u6210\uFF08seed \u53EF\u590D\u73B0\uFF09\u3002</div></div>'};ae(),N&&N.addEventListener("click",o=>{const a=o.target.closest("[data-wfdim]");if(a){const c=a.getAttribute("data-wfdim"),h=E.getLocks()[c]!==void 0;E.toggleLock(c,!h),ae();return}o.target.closest('[data-wfgen="reroll"]')&&(E.reroll(),window.__lockClockFaces&&window.__lockClockFaces.setFace&&window.__lockClockFaces.setFace("custom"),O(),ae(),window.showSystemToast&&window.showSystemToast("\u5DF2\u751F\u6210\u65B0\u8868\u76D8\uFF08seed "+E.getConfig().seed+"\uFF09"))});const R=e.querySelector("#clockFontGrid"),G=()=>{if(!R)return;let o="system";try{o=JSON.parse(localStorage.getItem(ot)||"{}").id||"system"}catch{}R.innerHTML=Ce.map(a=>{const i=a.id===o,c=a.id==="user"?"var(--custom-user-font, inherit)":a.family?"'"+a.family+"','RobotoFlex',monospace":"inherit",h=a.id==="user"?H()?"\u5DF2\u5BFC\u5165\uFF1A"+H():"\u672A\u5BFC\u5165\uFF08\u4E0A\u65B9\u5BFC\u5165\u533A\uFF09":a.note;return'<button data-clockfont="'+a.id+'" data-test="clockfont-'+a.id+'" aria-label="\u65F6\u949F\u5B57\u4F53 '+a.label+'" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px 8px;border-radius:14px;border:2px solid '+(i?"hsl(var(--md-h,215) 85% 60%)":"transparent")+";background:"+(i?"hsl(var(--md-h,215) 80% 55% / 0.12)":"var(--md-surface-container-high,rgba(255,255,255,0.05))")+';cursor:pointer;color:var(--md-on-surface);min-width:0;"><span style="font-family:'+c+';font-size:24px;line-height:1.15;font-variant-numeric:tabular-nums;">10:08</span><span style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">'+a.label+'</span><span style="font-size:9px;color:var(--md-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">'+h+"</span></button>"}).join("")};G(),["aclock","acsolid","clockopia","gsflex"].forEach(o=>{st(o).then(a=>{a&&G()})}),R&&R.addEventListener("click",o=>{const a=o.target.closest("[data-clockfont]");if(!a)return;const i=a.getAttribute("data-clockfont");if(window.__lockClockFaces&&window.__lockClockFaces.setFont){window.__lockClockFaces.setFont(i);const c=Ce.find(h=>h.id===i);window.showSystemToast&&c&&window.showSystemToast("\u65F6\u949F\u5B57\u4F53\uFF1A"+c.label)}G()});const D=()=>{if(!e.isConnected){document.removeEventListener("lock-clock-face-changed",D),document.removeEventListener("clock-font-changed",D);return}O(),G()};document.addEventListener("lock-clock-face-changed",D),document.addEventListener("clock-font-changed",D),t()}window.__initWallpaperPage=initWallpaperPage;const De=13,bt=260;export function openThemePicker(e=null){const t=Ze.findIndex(l=>l.id==="settings");if(t!==-1){!ie.isOpen||!ie.currentApp||ie.currentApp.id!=="settings"?(et(t,e),setTimeout(()=>{Te(De)},bt)):Te(De);return}const r=document.getElementById("themePickerOverlay");if(!r||r.classList.contains("active"))return;ze(),gt(),ce(),vt(),r.classList.add("active");const s=document.getElementById("themeWallpaperView");s&&(s.scrollTop=0),mt()}window.openWallpaperSettings=openThemePicker,window.openThemePicker=openThemePicker,window.__openWallpaperSubView=openThemePicker;export function closeThemePicker(){const e=document.getElementById("themePickerOverlay");e&&(e.classList.remove("active"),clearTimeout(n.cleanupTimer),ze())}
