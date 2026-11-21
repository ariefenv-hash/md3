import{initialApps as q}from"./apps-data.js";import{openApp as p}from"./app-window.js";import{getDockItems as _,addToDock as F,removeFromDock as V}from"./dock.js";import{DOCK_MAX as D}from"./desktop-prefs.js";import{ICONS as l}from"./icons.js";import{getAppIconSVG as W}from"./app-icons.js";import{enterEditMode as U}from"./drag-reorder.js";import{U_TIMINGS as g,SHORTCUT_COLLAPSE_THRESHOLD as N,foldShortcuts as j,openSchedule as B,closeSchedule as X}from"./aosp/popup-timings.js";import{TimedValue as I}from"./animation-presets.js";import{IIOAnimator as O}from"./aosp/interruptible-in-out-animator.js";import{EMPHASIZED_ACCELERATE as $,cubicBezier as G}from"./aosp/interpolators.js";let t=null,K=null,z=null;const P=G(.34,1.56,.64,1),C=e=>e;let i=null,k=0;function Q(){if(!t||!i)return;t.style.opacity=i.fade.progress.toFixed(3);const e=.85+.15*P(i.settle.x);t.style.transform=`scale(${e.toFixed(4)})`,t.style.transformOrigin="top center",i.children.forEach((n,r)=>{const d=i.childEls[r];d&&(d.style.opacity=n.eng.x.toFixed(3))})}function Z(e){if(i)for(const n of i.children)!n.armed&&e>=n.armAt&&(n.armed=!0,n.eng.setTarget(n.target))}function H(e){if(!i)return;const n=performance.now();Z(n);let r=k?(e-k)/1e3:1/120;k=e,r>.25&&(r=.25),i.fade.update(r),i.settle.update(r);for(const o of i.children)o.eng.update(r);if(Q(),i.fade.isSettled()&&i.settle.isSettled()&&i.children.every(o=>!o.armed||o.eng.isSettled())){const o=i.mode;i.raf=null,o==="close"&&(i=null,t&&(t.classList.remove("active"),t.style.opacity="",t.style.transform="",t.style.pointerEvents=""));return}i.raf=requestAnimationFrame(H)}function R(e){if(!t)return;const n=Array.from(t.querySelectorAll(".menu-item")),r=e==="open"?B(!0,n.length):X(!0,n.length),d=performance.now(),o=i;o&&o.raf&&cancelAnimationFrame(o.raf);const x=e==="open"?{durationMs:g.openDuration,interpolator:P}:{durationMs:g.closeDuration,interpolator:$},a=o&&o.fade instanceof O?o.fade:new O({durationMs:g.openFadeDuration,outDurationMs:g.closeDuration,interpolator:C,outInterpolator:$,initialValue:0}),m=o?o.settle:new I({...x,initialValue:0});m.reconfigure(x),e==="open"?a.in():a.out(),m.setTarget(e==="open"?1:0);const S=n.map((L,h)=>{const w=r.children[h]||{delay:0,duration:g.openChildFadeDuration},v=o&&o.children[h]?o.children[h].eng:new I({durationMs:w.duration,interpolator:C,initialValue:o?1:0});return v.reconfigure({durationMs:w.duration,interpolator:C}),{eng:v,armAt:d+w.delay,armed:!1,target:e==="open"?1:0}});i={mode:e,fade:a,settle:m,children:S,childEls:n,raf:null},k=0,i.raf||(i.raf=requestAnimationFrame(H))}const J={msg:[{title:"\u5FEB\u901F\u4F1A\u8BDD",icon:l.chat,action:(e,n)=>p(e,n)},{title:"\u89D2\u8272\u5207\u6362",icon:l.auto_awesome,action:(e,n)=>{p(e,n),setTimeout(()=>{const r=document.querySelector(".page-iframe");r&&r.contentWindow.postMessage({type:"QUICK_SWITCH_ROLE"},"*")},500)}}],camera:[{title:"\u81EA\u62CD\u6A21\u5F0F",icon:l.photo_camera,action:(e,n)=>p(e,n)},{title:"\u5F55\u5236\u89C6\u9891",icon:l.videocam,action:(e,n)=>p(e,n)}],settings:[{title:"\u58C1\u7EB8\u4E0E\u6837\u5F0F",icon:l.palette,action:()=>{window.openThemePicker&&window.openThemePicker()}}],notes:[{title:"\u65B0\u5EFA\u4FBF\u7B7E",icon:l.edit,action:(e,n)=>p(e,n)}],calculator:[{title:"\u5373\u65F6\u8BA1\u7B97",icon:l.calculator,action:(e,n)=>p(e,n)}]};export function initContextMenu(){Y(),window.addEventListener("pointerdown",e=>{t&&t.classList.contains("active")&&!t.contains(e.target)&&closeContextMenu()})}function Y(){t=document.createElement("div"),t.id="appContextMenu",t.className="app-context-menu",document.body.appendChild(t)}export function showContextMenu(e,n,r,d){if(!t||!e)return;K=e,z=n;const o=q.findIndex(s=>s.id===e.id),x=typeof window<"u"&&window.__APP_SHORTCUTS_EXTRA&&window.__APP_SHORTCUTS_EXTRA[e.id]||[],a=[...J[e.id]||[],...x];let m=!1;const S=_().indexOf(e.id)!==-1,L=typeof window<"u"&&typeof window.__miniWindowOpen=="function",h=()=>{const s=j(a,N);return`
      ${(m?a.map((c,f)=>[c,f]):s.visible.map(c=>[c,a.indexOf(c)])).map(([c,f])=>`
        <div class="menu-item shortcut-item" data-shortcut-idx="${f}">
          <span class="menu-item-icon">${c.icon}</span>
          <span class="menu-item-text">${c.title}</span>
        </div>
      `).join("")}
      ${!m&&s.hasFoldRow?`
        <div class="menu-item shortcut-fold-row" role="button" aria-label="\u5C55\u5F00\u66F4\u591A\u5FEB\u6377\u65B9\u5F0F">
          <span class="menu-item-icon">${l.launch}</span>
          <span class="menu-item-text">\u66F4\u591A\u5FEB\u6377\u65B9\u5F0F\uFF08${s.foldedCount}\uFF09</span>
        </div>`:""}
    `};t.innerHTML=`
    <div class="menu-header">
      <div class="menu-header-icon">${W(e.id)}</div>
      <div class="menu-header-title">${e.name}</div>
    </div>

    ${a.length>0?`
      <div class="menu-shortcuts-list">
        ${h()}
      </div>
      <div class="menu-divider"></div>
    `:""}

    <div class="menu-system-actions">
      <div class="menu-item action-open">
        <span class="menu-item-icon">${l.launch}</span>
        <span class="menu-item-text">\u6253\u5F00\u5E94\u7528</span>
      </div>
      ${L?`
      <div class="menu-item action-mini">
        <span class="menu-item-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="15" rx="2.5"/><rect x="12.5" y="11.5" width="8" height="6.5" rx="1.5" fill="currentColor" stroke="none"/></svg>
        </span>
        <span class="menu-item-text">\u4EE5\u5C0F\u7A97\u6253\u5F00</span>
      </div>`:""}
      <div class="menu-item action-dock ${S?"dock-remove":"dock-add"}">
        <span class="menu-item-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="15" width="18" height="6" rx="2"/><rect x="5" y="3" width="4" height="4" rx="1"/><rect x="10" y="3" width="4" height="4" rx="1"/><rect x="15" y="3" width="4" height="4" rx="1"/></svg>
        </span>
        <span class="menu-item-text">${S?"\u4ECE Dock \u79FB\u9664":"\u6DFB\u52A0\u5230 Dock"}</span>
      </div>
      <div class="menu-item action-edit">
        <span class="menu-item-icon">${l.edit}</span>
        <span class="menu-item-text">\u7F16\u8F91\u4E3B\u5C4F\u5E55 (\u91CD\u6392\u56FE\u6807)</span>
      </div>
    </div>
  `;const w=()=>{t.querySelectorAll(".shortcut-item").forEach(u=>{u.addEventListener("click",c=>{c.stopPropagation(),closeContextMenu();const f=parseInt(u.dataset.shortcutIdx,10);a[f]&&a[f].action&&a[f].action(o,n)})});const s=t.querySelector(".shortcut-fold-row");s&&s.addEventListener("click",u=>{u.stopPropagation(),m=!0;const c=t.querySelector(".menu-shortcuts-list");c&&(c.innerHTML=h(),w())})};w(),t.querySelector(".action-open").addEventListener("click",s=>{s.stopPropagation(),closeContextMenu(),p(o,n)});const v=t.querySelector(".action-mini");v&&v.addEventListener("click",s=>{s.stopPropagation(),closeContextMenu();try{window.__miniWindowOpen(e.id,null)}catch{}});const T=t.querySelector(".action-dock");T&&T.addEventListener("click",s=>{s.stopPropagation();const u=T.classList.contains("dock-remove");closeContextMenu(),u?(V(e.id),window.showSystemToast&&window.showSystemToast("\u5DF2\u4ECE Dock \u79FB\u9664\u300C"+e.name+"\u300D")):F(e.id)?window.showSystemToast&&window.showSystemToast("\u5DF2\u6DFB\u52A0\u300C"+e.name+"\u300D\u5230 Dock"):_().length>=D&&window.showSystemToast&&window.showSystemToast("Dock \u5DF2\u6EE1\uFF08\u6700\u591A "+D+" \u4E2A\uFF09\uFF0C\u957F\u6309 Dock \u56FE\u6807\u53EF\u79FB\u9664")}),t.querySelector(".action-edit").addEventListener("click",s=>{s.stopPropagation(),closeContextMenu(),U()}),t.style.visibility="hidden",t.classList.add("active");const E=200,b=t.offsetHeight||180,M=window.innerWidth,ee=window.innerHeight;let y=r-E/2,A=d-b-12;A<60&&(A=d+20),y<16&&(y=16),y+E>M-16&&(y=M-E-16),t.style.left=`${y}px`,t.style.top=`${A}px`,t.style.visibility="visible",t.style.pointerEvents="",t.style.opacity="0",t.style.transform="scale(0.85)",R("open"),navigator.vibrate&&navigator.vibrate([15,30,15])}export function closeContextMenu(){!t||!t.classList.contains("active")||i&&i.mode==="close"||(t.style.pointerEvents="none",R("close"))}
