(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function i(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(a){if(a.ep)return;a.ep=!0;const r=i(a);fetch(a.href,r)}})();const Gu="modulepreload",Xu=function(e,t){return new URL(e,t).href},ml={},ce=function(t,i,n){let a=Promise.resolve();if(i&&i.length>0){let d=function(u){return Promise.all(u.map(f=>Promise.resolve(f).then(m=>({status:"fulfilled",value:m}),m=>({status:"rejected",reason:m}))))};const o=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),c=l?.nonce||l?.getAttribute("nonce");a=d(i.map(u=>{if(u=Xu(u,n),u in ml)return;ml[u]=!0;const f=u.endsWith(".css"),m=f?'[rel="stylesheet"]':"";if(n)for(let v=o.length-1;v>=0;v--){const y=o[v];if(y.href===u&&(!f||y.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${u}"]${m}`))return;const h=document.createElement("link");if(h.rel=f?"stylesheet":Gu,f||(h.as="script"),h.crossOrigin="",h.href=u,c&&h.setAttribute("nonce",c),document.head.appendChild(h),f)return new Promise((v,y)=>{h.addEventListener("load",v),h.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${u}`)))})}))}function r(o){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=o,window.dispatchEvent(l),!l.defaultPrevented)throw o}return a.then(o=>{for(const l of o||[])l.status==="rejected"&&r(l.reason);return t().catch(r)})},p={};function ju(){p.desktopSlider=document.getElementById("desktopSlider"),p.pageDots=document.getElementById("pageDots"),p.appWindow=document.getElementById("appWindow"),p.windowShadowLayer=document.getElementById("windowShadowLayer"),p.windowGlowLayer=document.getElementById("windowGlowLayer"),p.appLaunchScreen=document.getElementById("appLaunchScreen"),p.launchIconContainer=document.getElementById("launchIconContainer"),p.appTitle=document.getElementById("appTitle"),p.pageStack=document.getElementById("pageStack"),p.desktop=document.getElementById("desktop"),p.stage=document.getElementById("stage"),p.header=p.appWindow?p.appWindow.querySelector(".app-header"):null,p.gesture=p.appWindow?p.appWindow.querySelector(".gesture-bar"):null,p.gestureBarContainer=document.getElementById("gestureBarContainer"),p.backBtn=document.getElementById("backBtn"),p.clock=document.getElementById("clock"),p.statusBar=document.getElementById("statusBar"),p.appWindowStatusBar=document.getElementById("appWindowStatusBar"),p.triggerZone=document.getElementById("triggerZone"),p.edgeLeft=document.getElementById("edgeLeft"),p.edgeRight=document.getElementById("edgeRight"),p.wallpaperInput=document.getElementById("wallpaperInput"),p.fontInput=document.getElementById("fontInput"),p.folderOverlay=document.getElementById("folderOverlay"),p.folderTitle=document.getElementById("folderTitle"),p.folderGrid=document.getElementById("folderGrid"),p.pullPanelsOverlay=document.getElementById("pullPanelsOverlay"),p.pullPanelsSlider=document.getElementById("pullPanelsSlider")}function ht(e,t,i=1){const n=i*Math.pow(2*Math.PI/e,2),a=2*t*Math.sqrt(n*i);return{mass:i,stiffness:n,damping:a}}const hl=ht(.38,.8,1);class Ge{constructor({mass:t,stiffness:i,damping:n,initialValue:a=0,initialVelocity:r=0}){this.mass=t,this.stiffness=i,this.damping=n,this.x=a,this.v=r,this.target=a}setTarget(t,i=null){this.target=t,i!==null&&(this.v=i)}reconfigure({mass:t,stiffness:i,damping:n}){this.mass=t,this.stiffness=i,this.damping=n}update(t){const i=this.mass,n=this.stiffness,a=this.damping,r=(v,y)=>{const x=v-this.target;return(-n*x-a*y)/i},o=r(this.x,this.v),l=this.v,c=r(this.x+.5*t*l,this.v+.5*t*o),d=this.v+.5*t*o,u=r(this.x+.5*t*d,this.v+.5*t*c),f=this.v+.5*t*c,m=r(this.x+t*f,this.v+t*u),h=this.v+t*u;this.v+=t/6*(o+2*c+2*u+m),this.x+=t/6*(l+2*d+2*f+h)}isSettled(t=.005,i=.5){return Math.abs(this.x-this.target)<t&&Math.abs(this.v)<i}}class Sr{constructor(t,i=0,n=0,a=0,r=0){this.x=new Ge({...t,initialValue:i,initialVelocity:a}),this.y=new Ge({...t,initialValue:n,initialVelocity:r})}setTarget(t,i,n=null,a=null){this.x.setTarget(t,n),this.y.setTarget(i,a)}reconfigure(t){this.x.reconfigure(t),this.y.reconfigure(t)}update(t){this.x.update(t),this.y.update(t)}get px(){return this.x.x}get py(){return this.y.x}get vx(){return this.x.v}get vy(){return this.y.v}isSettled(t=.005,i=.5){return this.x.isSettled(t,i)&&this.y.isSettled(t,i)}}const zn=[{id:"snappy",name:"利落",emoji:"⚡",desc:"快速收敛一步到位 · 效率优先不拖泥带水",open:ht(.24,.98,1),close:ht(.22,1.04,1)},{id:"bouncy",name:"果冻",emoji:"🍮",desc:"液态玻璃柔性微弹 · macOS 神奇收束扭曲",open:ht(.38,.79,1),close:ht(.32,.88,1)}],Lc="ios-desktop:anim-preset",Ac="ios-desktop:anim-speed",Bc=.25,Fc=3;function kr(){try{const e=parseFloat(localStorage.getItem(Ac));return Number.isFinite(e)&&e>=Bc&&e<=Fc?e:1}catch{return 1}}function Pc(e){const t=Number(e);if(!Number.isFinite(t))return kr();const i=Math.min(Fc,Math.max(Bc,t));try{localStorage.setItem(Ac,String(i))}catch{}if(typeof window<"u"&&window.__animPresets&&typeof window.__animPresets.apply=="function")try{window.__animPresets.apply(vo())}catch{}return i}function Xn(e){const t=kr();return!Number.isFinite(t)||t===1||t<=0?e:{mass:e.mass,stiffness:e.stiffness*t*t,damping:e.damping*t}}function vo(){try{const e=localStorage.getItem(Lc);return zn.some(t=>t.id===e)?e:"bouncy"}catch{return"bouncy"}}function yo(){return zn.find(e=>e.id===vo())||zn[0]}function Yu(e){if(zn.some(t=>t.id===e))try{localStorage.setItem(Lc,e)}catch{}}function Te(){return Xn(yo().open)}function Kt(){return Xn(yo().close)}typeof window<"u"&&(window.__animPresets={list:zn,currentId:vo,currentName:()=>yo().name,getSpeed:kr,setSpeed:Pc,apply:null});const g={wifi:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4zm0 3.32c3.78 0 7.23 1.48 9.79 3.9L12 18.91 2.21 11.22C4.77 8.8 8.22 7.32 12 7.32z"/></svg>',wifi_off:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M2.28 3L1 4.27l2.06 2.06C1.72 7.02.58 7.84 0 8.43L12 20.45l4.89-4.89 4.84 4.84 1.27-1.27L2.28 3zM12 16.59L4.47 9.06c.72-.45 1.76-.92 3.12-1.24l7.15 7.15-2.74 1.62zM24 8.43C20.93 5.35 16.69 3.45 12 3.45c-1.89 0-3.69.34-5.36.96l2.12 2.12C10.01 6.2 10.98 6.09 12 6.09c3.78 0 7.23 1.48 9.79 3.9L24 8.43z"/></svg>',cellular:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2 22h20V2L2 22zm18-2H6.83L20 6.83V20z"/></svg>',bluetooth:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/></svg>',bluetooth_off:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M13 5.83l1.88 1.88-1.6 1.6 1.41 1.41 3.02-3.02L12 2h-1v5.03l2 2v-3.2zM5.41 4L4 5.41 9.59 11 5 16.59 6.41 18 11 13.41V22h1l4.29-4.29 2.3 2.29 1.41-1.41L5.41 4zM13 18.17v-3.76l1.88 1.88L13 18.17z"/></svg>',aeroplane:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',hotspot:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 2c0-3.31-2.69-6-6-6s-6 2.69-6 6c0 2.22 1.21 4.15 3 5.19l1-1.74c-1.19-.7-2-1.97-2-3.45 0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.48-.81 2.75-2 3.45l1 1.74c1.79-1.04 3-2.97 3-5.19zM12 3C6.48 3 2 7.48 2 13c0 3.7 2.01 6.92 4.99 8.65l1-1.73C5.61 18.33 4 15.86 4 13c0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.86-1.61 5.33-3.99 6.92l1 1.73C20 19.92 22 16.7 22 13c0-5.52-4.48-10-10-10z"/></svg>',quick_share:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>',vpn:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>',darktheme:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>',torch:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 2h12v3l-3 4v11c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2V9L6 5V2zm2 2v.6l3 4V20h2V8.6l3-4V4H8zm3 6h2v3h-2v-3z"/></svg>',autorotate:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 5.84 18.29 1.99 12 2c-.65 0-1.29.05-1.91.15l2.45 2.45 1.41-1.42 2.53-.66zM7.52 21.48C4.25 19.93 1.91 16.76 1.55 13H.05C.56 18.16 5.71 22.01 12 22c.65 0 1.29-.05 1.91-.15l-2.45-2.45-1.41 1.42-2.53.66zM10.29 8.71L8.71 10.29l5 5 1.58-1.58-5-5z"/></svg>',brightness:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/></svg>',volume:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',volume_mute:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M7 9v6h4l5 5V4L11 9H7z"/></svg>',night_light:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M11.01 3.05C6.51 3.54 3 7.36 3 12a9 9 0 0 0 9 9c4.63 0 8.46-3.51 8.95-8.01C14.73 13.9 10.1 9.27 11.01 3.05z"/></svg>',modes:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>',alarm:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM12.5 8H11v6l4.75 2.85.75-1.23-4-2.37V8zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>',battery_saver:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4zM13 14h-2v3H9v-3H7v-2h2v-3h2v3h2v2z"/></svg>',qrcode:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-5 0h3v2h-3v-2zm0 3h2v3h-2v-3zm3 0h3v2h-3v-2zm0 3h3v2h-3v-2zm2-3h2v5h-2v-5z"/></svg>',wallet:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',cast:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/></svg>',screen_record:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>',mic_access:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>',camera_access:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4 4h3V2H4C2.9 2 2 2.9 2 4v3h2V4zm16-2h-3v2h3v3h2V4c0-1.1-.9-2-2-2zm0 18h-3v2h3c1.1 0 2-.9 2-2v-3h-2v3zM4 17H2v3c0 1.1.9 2 2 2h3v-2H4v-3zm8-9a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm5.5-7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>',google_lens:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M6 3.5C4.62 3.5 3.5 4.62 3.5 6V7.5H5.5V6C5.5 5.17 6.17 4.5 7 4.5H8.5V2.5H7C6.66 2.5 6.33 2.54 6 2.6V3.5Z" fill="#EA4335"/><path d="M18 3.5C19.38 3.5 20.5 4.62 20.5 6V7.5H18.5V6C18.5 5.17 17.83 4.5 17 4.5H15.5V2.5H17C17.34 2.5 17.67 2.54 18 2.6V3.5Z" fill="#4285F4"/><path d="M20.5 18C20.5 19.38 19.38 20.5 18 20.5H17V18.5H18C18.83 18.5 19.5 17.83 19.5 17V15.5H21.5V17C21.5 17.34 21.46 17.67 21.4 18H20.5Z" fill="#FBBC05"/><path d="M3.5 18C3.5 19.38 4.62 20.5 6 20.5H7.5V18.5H6C5.17 18.5 4.5 17.83 4.5 17V15.5H2.5V17C2.5 17.34 2.54 17.67 2.6 18H3.5Z" fill="#34A853"/><circle cx="12" cy="12" r="3.5" fill="#4285F4"/><circle cx="16.5" cy="7.5" r="1.2" fill="#34A853"/></svg>',colour_correction:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.79-1.79C9.13 19.66 10.51 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>',colour_inversion:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18v-8c-4.41 0-8 3.59-8 8s3.59 8 8 8z"/></svg>',hearing_devices:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17 20c-.29 0-.56-.06-.76-.15-.71-.37-1.21-1.07-1.24-1.85-.04-1.21.73-2.22 1.84-2.45.69-.14 1.34.07 1.82.52.47.46.74 1.1.74 1.77 0 1.19-.94 2.16-2.4 2.16zm-7.5-9C8.67 11 8 10.33 8 9.5S8.67 8 9.5 8s1.5.67 1.5 1.5S10.33 11 9.5 11zM18 4.23c-4.43 0-8 3.57-8 8 0 1.15.25 2.25.68 3.25L9.12 17C8.4 15.58 8 13.97 8 12.23c0-5.52 4.48-10 10-10 .74 0 1.45.1 2.14.26l-1.52 1.52c-.2-.01-.41-.01-.62-.01z"/></svg>',one_handed:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-4.2-3.8l2.2-2.2-1.4-1.4-2.2 2.2V11h-2v4.2z"/></svg>',calculator:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 2h5v3h-5V5zm-6 0h4v3H7V5zm0 5h4v3H7v-3zm0 5h4v3H7v-3zm11 3h-5v-3h5v3zm0-5h-5v-3h5v3z"/></svg>',focus_mode:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>',live_caption:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/></svg>',live_transcribe:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',recorder:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>',song_search:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',sound_notifications:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>',storage:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z"/></svg>',podcasts:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 1a9 9 0 0 0-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7a9 9 0 0 0-9-9zM12 12c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2s2-.9 2-2v-3c0-1.1-.9-2-2-2z"/></svg>',music_note:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',upload_file:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>',speed:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.28-10.43zM10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"/></svg>',playlist:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/></svg>',settings:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',edit:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',power:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>',restart:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>',emergency:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',undo:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>',back:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>',clear_all:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M5 13h14v-2H5v2zm-2 4h14v-2H3v2zM7 7v2h14V7H7z"/></svg>',history:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>',play:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',pause:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',skip_next:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',skip_prev:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',notification_chat:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>',notification_calendar:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/></svg>',notification_system:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',battery_charging:'<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4zM11 20v-5.5H9L13 7v5.5h2L11 20z"/></svg>',close:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',search:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',menu:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>',delete_forever:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',content_copy:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"/></svg>',chat:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',mic:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>',videocam:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>',call:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.21c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',link:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',person:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',folder:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',language:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>',smartphone:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z"/></svg>',laptop:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>',headphones:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z"/></svg>',credit_card:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>',assignment:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',add_circle:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>',paid:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>',coffee:'<svg viewBox="0 0 24 24" class="ic" fill="none"><path d="M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z" stroke="currentColor" stroke-width="2"/><path d="M16 9h2.2a2.4 2.4 0 0 1 0 4.8H16" stroke="currentColor" stroke-width="2"/><path d="M8.2 2.8c0 .9-.9 1.4-.9 2.4M12.2 2.8c0 .9-.9 1.4-.9 2.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',metro:'<svg viewBox="0 0 24 24" class="ic" fill="none"><path d="M7 3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" stroke="currentColor" stroke-width="2"/><path d="M7.2 6.4h9.6v3.8H7.2z" fill="currentColor"/><path d="M8 21l1.6-3M16 21l-1.6-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',directions_car:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>',directions_walk:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z"/></svg>',directions_bike:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="5.5" cy="17.5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="18.5" cy="17.5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="13" cy="4.3" r="1.9"/><path d="M12 8.3l-2.6 4.1 3.1 2.6v5h1.8v-6l-2.3-2 2.3-3.5 1.7 3h3.2v-1.8h-2.2L15.5 6l-3.5 2.3z"/></svg>',home:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',work:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>',location_on:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',explore:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"/></svg>',favorite:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',local_fire_department:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>',bedtime:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12.34 2.02C6.59 1.82 2 6.42 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02-7.51-.25-12.09-8.43-8.32-14.96z"/></svg>',bar_chart:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z"/></svg>',water_drop:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>',auto_awesome:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/></svg>',palette:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',launch:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>',bolt:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M13 2 4.5 13.5H11L9.5 22 19.5 9.5H12.5L13 2z"/></svg>',star:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',crown:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M2.5 18.5h19L23 9l-5.5 3.7L12 5l-5.5 7.7L1 9l1.5 9.5z"/></svg>',gem:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2.5 21 9l-9 12.5L3 9l9-6.5z"/></svg>',bomb:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="10" cy="14.5" r="6.2"/><rect x="12.9" y="5.6" width="5" height="3" rx="1" transform="rotate(-45 15.4 7.1)"/><path d="M18.6 3.2l1.3-1.3M20.6 5.6l1.7-.4M19.9 4.3l1.1 1.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',target:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.8"/></svg>',burst:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2l2.2 5.6L20 5.5l-2.6 5.3L23 12l-5.6 1.2L20 18.5l-5.8-2.1L12 22l-2.2-5.6L4 18.5l2.6-5.3L1 12l5.6-1.2L4 5.5l5.8 2.1L12 2z"/></svg>',dice:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.2" cy="8.2" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="15.8" cy="15.8" r="1.7"/></svg>',cyclone:'<svg viewBox="0 0 24 24" class="ic" fill="none"><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 5h11a3 3 0 1 0-3-3"/><path d="M20 10H8a3 3 0 1 1 3 3"/><path d="M5 15h10a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 20h9"/></g></svg>',sync:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 5.74C4.46 6.97 4 8.43 4 10c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>',radio:'<svg viewBox="0 0 24 24" class="ic" fill="none"><rect x="3" y="8" width="18" height="12" rx="2.5" stroke="currentColor" stroke-width="2"/><circle cx="16.2" cy="14" r="2.4" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 12.5h5M6.5 15.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 8V5.6A2.6 2.6 0 0 1 10.6 3H18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',piano:'<svg viewBox="0 0 24 24" class="ic" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7.5 4v10.5M12 4v10.5M16.5 4v10.5" stroke="currentColor" stroke-width="2"/></svg>',download:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',stop_record:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',record_dot:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>',block:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/></svg>',bell_off:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/><path d="M3.4 2.6 2 4l18.6 18.6 1.4-1.4L3.4 2.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',lock:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',photo_camera:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="12" cy="12" r="3.2"/><path d="M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>',picture_in_picture:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 7h-8v6h8V7zm4-4H1v18h22V3zm-2 16H3V5h18v14z"/></svg>',image:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',code:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',schedule:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>',calendar_month:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>',music_note:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',corner_down_left:'<svg viewBox="0 0 24 24" class="ic" fill="none"><g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l-7 7 7 7"/><path d="M2 12h13a5 5 0 0 0 5-5V3"/></g></svg>',weather_sunny:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/></svg>',weather_partly:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="7.5" cy="7.5" r="3.2"/><path d="M19.35 12.04C18.67 8.59 15.64 6 12 6c-2.89 0-5.4 1.64-6.65 4.04C2.34 10.36 0 12.91 0 16c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" transform="translate(0 -2.5)"/></svg>',weather_cloudy:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>',weather_fog:'<svg viewBox="0 0 24 24" class="ic" fill="none"><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8.5h13M6 12.5h15M3 16.5h13"/></g></svg>',weather_rain:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><g transform="translate(.9 .3) scale(.92)"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></g><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7.5 19.6l-1 2.9M12.5 19.6l-1 2.9M17.5 19.6l-1 2.9"/></g></svg>',weather_snow:'<svg viewBox="0 0 24 24" class="ic" fill="none"><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M3.34 7l17.32 10M20.66 7 3.34 17"/></g></svg>',weather_thunder:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><g transform="translate(.9 0) scale(.92)"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></g><path d="M12.5 13 8.5 19.5h3L10 24l5.5-7h-3.2L14 13z"/></svg>',weather_drizzle:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><g transform="translate(.9 -.4) scale(.92)"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></g><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 19.5l-.6 1.8M12.5 19.5l-.6 1.8M17 19.5l-.6 1.8"/></g></svg>',air:'<svg viewBox="0 0 24 24" class="ic" fill="none"><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 12h14a3 3 0 1 1-3 3"/><path d="M3 16h7"/></g></svg>',visibility:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',sunrise:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="12" cy="13.5" r="4"/><path d="M12 3.5v3M5.1 6.6l2.1 2.1M18.9 6.6l-2.1 2.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="2" y="19" width="20" height="2.2" rx="1.1"/></svg>',check:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',forest:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2 6 10h3l-4 6h5v6h4v-6h5l-4-6h3L12 2z"/></svg>',push_pin:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>',vibration:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M8 2h8c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm.5 2a.5.5 0 0 0-.5.5v15a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-15a.5.5 0 0 0-.5-.5h-7zM3 7h1.5v10H3V7zm17.5 0H22v10h-1.5V7z"/></svg>',memory:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z"/></svg>',restart_alt:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>',content_paste:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg>',description:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',insert_drive_file:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6z"/></svg>',create_new_folder:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z"/></svg>'},Uu="ios-desktop-files",Ku=1,Se="kv";let Zr=null;function Gi(){return typeof indexedDB>"u"||!indexedDB?Promise.resolve(null):(Zr||(Zr=new Promise(e=>{let t;try{t=indexedDB.open(Uu,Ku)}catch{e(null);return}t.onupgradeneeded=()=>{try{t.result.objectStoreNames.contains(Se)||t.result.createObjectStore(Se)}catch{}},t.onsuccess=()=>{const i=t.result;i.onversionchange=()=>{try{i.close()}catch{}},e(i)},t.onerror=()=>e(null),t.onblocked=()=>e(null)}).catch(()=>null)),Zr)}function me(){return typeof indexedDB<"u"&&!!indexedDB}async function ke(e,t){const i=await Gi();return i?new Promise(n=>{try{const a=i.transaction(Se,"readwrite");a.objectStore(Se).put(t,e),a.oncomplete=()=>n(!0),a.onerror=()=>n(!1),a.onabort=()=>n(!1)}catch{n(!1)}}):!1}async function Qt(e){const t=await Gi();return t?new Promise(i=>{try{const a=t.transaction(Se,"readonly").objectStore(Se).get(e);a.onsuccess=()=>i(a.result??null),a.onerror=()=>i(null)}catch{i(null)}}):null}async function yt(e){const t=await Gi();return t?new Promise(i=>{try{const n=t.transaction(Se,"readwrite");n.objectStore(Se).delete(e),n.oncomplete=()=>i(!0),n.onerror=()=>i(!1),n.onabort=()=>i(!1)}catch{i(!1)}}):!1}async function Jt(){const e=await Gi();return e?new Promise(t=>{try{const i=e.transaction(Se,"readonly"),n=i.objectStore(Se).openCursor(),a=[];n.onsuccess=()=>{const r=n.result;if(!r){t(a);return}a.push({key:r.key,value:r.value});try{r.continue()}catch{t(a)}},n.onerror=()=>t(a.length?a:[]),i.onerror=()=>t(a.length?a:[]),i.onabort=()=>t(a.length?a:[])}catch{t([])}}):[]}async function wo(e){const t=await Gi();return!t||!Array.isArray(e)?!1:new Promise(i=>{try{const n=t.transaction(Se,"readwrite"),a=n.objectStore(Se);for(const r of e)if(!(!r||typeof r.key>"u"||r.key===null))try{a.put(r.value,r.key)}catch{i(!1);return}n.oncomplete=()=>i(!0),n.onerror=()=>i(!1),n.onabort=()=>i(!1)}catch{i(!1)}})}async function xo(){const e=await Gi();return e?new Promise(t=>{try{const i=e.transaction(Se,"readwrite");i.objectStore(Se).clear(),i.oncomplete=()=>t(!0),i.onerror=()=>t(!1),i.onabort=()=>t(!1)}catch{t(!1)}}):!1}const Qu=Object.freeze(Object.defineProperty({__proto__:null,idbAvailable:me,idbBulkPut:wo,idbClearStore:xo,idbDel:yt,idbGet:Qt,idbGetAllEntries:Jt,idbSet:ke},Symbol.toStringTag,{value:"Module"}));let pe=null,St=null,Ht=!1,gl="",Et=0,Ju=0,es=0;const ts=.25,Zu=12,ef=.84,ua=new Map;function zc(){if(pe)return!0;const e=document.getElementById("desktop");return e?(pe=document.createElement("canvas"),pe.id="desktopBlurCanvas",pe.className="desktop-blur-canvas",St=pe.getContext("2d"),e.appendChild(pe),window.addEventListener("resize",()=>{clearTimeout(es),es=setTimeout(()=>{es=0,ri(!0)},180)},{passive:!0}),!0):!1}function tf(){let e=null;try{e=window.__videoWallpaper}catch{}if(e&&e.isVideoActive()&&e.getVideoEl())return{kind:"video",el:e.getVideoEl(),key:`video:${++Ju}`};try{const n=document.querySelector(".procedural-wallpaper");if(n&&document.getElementById("desktop").classList.contains("procedural-active")&&n.width>2)return{kind:"canvas",el:n,key:"procedural"}}catch{}const i=(document.getElementById("desktop")?.style.backgroundImage||"").match(/url\(["']?([^"')]+)["']?\)/);return i&&i[1]?{kind:"image",url:i[1],key:i[1]}:null}function nf(e){return new Promise(t=>{const i=ua.get(e);if(i&&i.complete&&i.naturalWidth>0){t(i);return}const n=new Image;/^https?:/i.test(e)&&(n.crossOrigin="anonymous"),n.onload=()=>{ua.size>8&&ua.clear(),ua.set(e,n),t(n)},n.onerror=()=>t(null),n.src=e})}function ri(e=!1){if(!zc())return;const t=tf();if(!t){Ht=!1;return}if(!e&&t.key===gl&&Ht)return;const i=Math.max(2,Math.round(window.innerWidth*ts)),n=Math.max(2,Math.round(window.innerHeight*ts));pe.width=i,pe.height=n;const a=(r,o,l)=>{if(!St||!r){Ht=!1;return}const c=Math.max(i/o,n/l),d=o*c,u=l*c,f=(i-d)/2,m=(n-u)/2;St.clearRect(0,0,i,n);try{St.filter=`blur(${(Zu*ts).toFixed(1)}px)`}catch{}St.drawImage(r,f,m,d,u),St.filter="none",St.fillStyle=`rgba(0, 0, 0, ${(1-ef).toFixed(2)})`,St.fillRect(0,0,i,n),gl=t.key,Ht=!0,Et>.001&&So(Et)};if(t.kind==="video"){const r=t.el;r.readyState>=2&&r.videoWidth>0?a(r,r.videoWidth,r.videoHeight):Ht=!1;return}if(t.kind==="canvas"){a(t.el,t.el.width,t.el.height);return}nf(t.url).then(r=>{r?a(r,r.naturalWidth,r.naturalHeight):Ht=!1})}function bo(){return Ht&&!!pe}function So(e){if(zc()){if(Et=Math.max(0,Math.min(1,e)),Et<=.001){pe.classList.remove("active"),pe.style.opacity="";return}pe.classList.add("active"),pe.style.opacity=(Et*Et).toFixed(4)}}function $c(){Et=0,pe&&(pe.classList.remove("active"),pe.style.opacity="")}typeof window<"u"&&(window.__blurBakeTest={isReady:()=>bo(),refresh:()=>ri(!0),progress:()=>Et});const ko="ios-desktop:procedural-wallpaper",Xt=[{id:"aurora",name:"极光流体",hue:215,seed:11},{id:"sunset",name:"落日波纹",hue:25,seed:23},{id:"starry",name:"粒子星野",hue:275,seed:37}],af=1e3/30,rf=1.5,vl=25e5;let R=null,pn=null,At=null,jt=0,Dc=0,Cs=0,lt=null,_t="",Oc=!1;try{Oc=window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{}function sf(e){let t=e>>>0;return function(){t|=0,t=t+1831565813|0;let i=Math.imul(t^t>>>15,1|t);return i=i+Math.imul(i^i>>>7,61|i)^i,((i^i>>>14)>>>0)/4294967296}}function Ct(){return At}function jn(){return _t}function Er(e){return Xt.find(t=>t.id===e)||null}function of(){if(R){if(!R.isConnected){const t=document.getElementById("desktop");t&&t.insertBefore(R,t.firstChild)}return!0}R=document.createElement("canvas"),R.className="procedural-wallpaper",pn=R.getContext("2d");const e=document.getElementById("desktop");e.insertBefore(R,e.firstChild),window.addEventListener("resize",lf)}let is=0;function lf(){clearTimeout(is),is=setTimeout(()=>{is=0,Rc()},180)}function Rc(){if(!R)return;const e=Math.max(1,R.clientWidth),t=Math.max(1,R.clientHeight);let i=Math.min(window.devicePixelRatio||1,rf);e*t*i*i>vl&&(i=Math.max(.5,Math.sqrt(vl/(e*t))));const n=Math.max(1,Math.round(e*i)),a=Math.max(1,Math.round(t*i));(R.width!==n||R.height!==a)&&(R.width=n,R.height=a,At&&lt&&(Eo(Er(At)),Gc(),_o()))}function Hc(e){const t=sf(e.seed);return e.id==="aurora"?{kind:"aurora",blobs:Array.from({length:5},(i,n)=>({bx:.15+t()*.7,by:.15+t()*.7,r:.3+t()*.24,hueOff:(n-2)*26+(t()-.5)*18,ax:.05+t()*.08,ay:.04+t()*.07,sx:.045+t()*.055,sy:.035+t()*.05,px:t()*Math.PI*2,py:t()*Math.PI*2}))}:e.id==="starry"?{kind:"starry",stars:Array.from({length:110},()=>({x:t(),y:t(),r:.4+t()*1.6,tw:t()*Math.PI*2,tws:.35+t()*1.1,vx:.002+t()*.006,vy:-(.001+t()*.004)})),nebulae:Array.from({length:2},(i,n)=>({bx:.25+n*.5+(t()-.5)*.2,by:.3+t()*.4,r:.45+t()*.2,hueOff:n*40-10,phase:t()*Math.PI*2}))}:{kind:"sunset",waves:Array.from({length:4},(i,n)=>({yBase:.6+n*.1,amp:.03-n*.004,speed:(.1+n*.045)*(n%2?-1:1),hueShift:n*7,freq:1.6+n*.7}))}}function Nc(e,t,i,n,a,r){const o=e.createLinearGradient(0,0,0,i);o.addColorStop(0,"#0b1026"),o.addColorStop(1,"#141b3c"),e.fillStyle=o,e.fillRect(0,0,t,i),e.globalCompositeOperation="lighter";const l=Math.min(t,i);for(const c of r.blobs){const d=(c.bx+c.ax*Math.sin(n*c.sx*Math.PI*2+c.px))*t,u=(c.by+c.ay*Math.cos(n*c.sy*Math.PI*2+c.py))*i,f=c.r*l,m=a+c.hueOff+10*Math.sin(n*.15+c.px),h=e.createRadialGradient(d,u,0,d,u,f);h.addColorStop(0,`hsla(${m}, 72%, 58%, 0.50)`),h.addColorStop(.55,`hsla(${m}, 68%, 46%, 0.22)`),h.addColorStop(1,"hsla(0, 0%, 0%, 0)"),e.fillStyle=h,e.beginPath(),e.arc(d,u,f,0,Math.PI*2),e.fill()}e.globalCompositeOperation="source-over"}function qc(e,t,i,n,a,r){const o=e.createLinearGradient(0,0,0,i);o.addColorStop(0,"#1a1030"),o.addColorStop(.45,`hsl(${a+15}, 78%, 34%)`),o.addColorStop(.72,`hsl(${a+5}, 92%, 55%)`),o.addColorStop(1,`hsl(${Math.max(0,a-8)}, 95%, 62%)`),e.fillStyle=o,e.fillRect(0,0,t,i);const l=i*(.5+.012*Math.sin(n*.35)),c=Math.min(t,i)*.13,d=e.createRadialGradient(t*.5,l,0,t*.5,l,c*3.2);d.addColorStop(0,"hsla(45, 100%, 80%, 0.85)"),d.addColorStop(.28,`hsla(${a+30}, 100%, 68%, 0.40)`),d.addColorStop(1,"hsla(0, 0%, 0%, 0)"),e.fillStyle=d,e.fillRect(0,0,t,i),e.fillStyle="hsl(48, 100%, 84%)",e.beginPath(),e.arc(t*.5,l,c,0,Math.PI*2),e.fill();for(const u of r.waves){e.beginPath(),e.moveTo(0,i);const f=Math.max(4,Math.floor(t/48));for(let m=0;m<=t+f;m+=f){const h=i*(u.yBase+u.amp*Math.sin(m/t*Math.PI*2*u.freq+n*u.speed));e.lineTo(m,h)}e.lineTo(t,i),e.closePath(),e.fillStyle=`hsla(${(a+255+u.hueShift*6)%360}, 48%, ${13+u.hueShift*3}%, 0.95)`,e.fill()}}function Vc(e,t,i,n,a,r){const o=e.createLinearGradient(0,0,0,i);o.addColorStop(0,`hsl(${a}, 55%, 7%)`),o.addColorStop(.6,`hsl(${a+12}, 48%, 12%)`),o.addColorStop(1,`hsl(${a+25}, 40%, 17%)`),e.fillStyle=o,e.fillRect(0,0,t,i);const l=Math.min(t,i);e.globalCompositeOperation="lighter";for(const c of r.nebulae){const d=(c.bx+.02*Math.sin(n*.06+c.phase))*t,u=(c.by+.02*Math.cos(n*.05+c.phase))*i,f=.1+.05*(.5+.5*Math.sin(n*.12+c.phase)),m=e.createRadialGradient(d,u,0,d,u,c.r*l);m.addColorStop(0,`hsla(${a+c.hueOff}, 70%, 55%, ${f})`),m.addColorStop(1,"hsla(0, 0%, 0%, 0)"),e.fillStyle=m,e.beginPath(),e.arc(d,u,c.r*l,0,Math.PI*2),e.fill()}e.globalCompositeOperation="source-over";for(const c of r.stars){const d=((c.x+c.vx*n)%1+1)%1*t,u=((c.y+c.vy*n)%1+1)%1*i,f=.35+.6*(.5+.5*Math.sin(n*c.tws*2+c.tw));e.fillStyle=`hsla(${a+40}, 30%, 92%, ${f.toFixed(3)})`,e.beginPath(),e.arc(d,u,Math.max(.4,c.r*l*.004),0,Math.PI*2),e.fill()}}function Eo(e){if(!pn||!lt||R.width<2)return;const t=(performance.now()-Dc)/1e3;lt.kind==="aurora"?Nc(pn,R.width,R.height,t,e.hue,lt):lt.kind==="sunset"?qc(pn,R.width,R.height,t,e.hue,lt):Vc(pn,R.width,R.height,t,e.hue,lt)}function Wc(e){if(!At){jt=0;return}jt=requestAnimationFrame(Wc),!s.currentApp&&(Oc||e-Cs<af||(Cs=e,Eo(Er(At))))}let fa="";function Gc(){if(!R||R.width<2){_t="";return}try{const e=Math.min(R.width,1440),t=Math.max(1,Math.round(R.height/R.width*e)),i=document.createElement("canvas");i.width=e,i.height=t,i.getContext("2d").drawImage(R,0,0,e,t),i.toBlob(n=>{if(!n){_t="";return}if(fa)try{URL.revokeObjectURL(fa)}catch{}fa=URL.createObjectURL(n),_t=fa,_o()},"image/jpeg",.92)}catch{_t=""}}function _o(){_t&&document.querySelectorAll("iframe").forEach(e=>{try{e.contentWindow.postMessage({type:"set-wallpaper",url:_t},"*")}catch{}})}function $n(e,t={}){const i=Er(e);if(!i)return!1;const{persist:n=!0,showToast:a=!0}=t;try{const r=document.querySelector(".video-wallpaper");r&&r.remove(),document.getElementById("desktop")?.classList.remove("video-wallpaper-active"),localStorage.removeItem("ios-desktop:video-wallpaper"),me()&&yt("wallpaper-video-blob")}catch{}if(si(),of(),At=i.id,lt=Hc(i),R.parentElement.classList.add("procedural-active"),document.getElementById("desktop").style.backgroundImage="none",Rc(),Dc=performance.now(),Cs=0,jt||(jt=requestAnimationFrame(Wc)),Eo(i),Gc(),_o(),n)try{localStorage.setItem(ko,i.id)}catch{}return ri(!0),a&&window.showSystemToast&&window.showSystemToast(`动态壁纸已应用: ${i.name}`,g.image),cf(i.id),!0}function Yn(){try{localStorage.removeItem(ko)}catch{}At&&(At=null,lt=null,_t="",jt&&(cancelAnimationFrame(jt),jt=0),R&&R.parentElement&&R.parentElement.classList.remove("procedural-active"))}function cf(e){const t=document.getElementById("themeDynamicGrid");if(!t)return;const i=document.getElementById("themeUploadAnyBtn");i&&i.classList.remove("active"),t.querySelectorAll("[data-proc]").forEach(n=>{n.classList.toggle("active",n.dataset.proc===e)})}const tn=new Map,df=24;function Xc(e,t=160,i=100){const n=`${e}|${t}x${i}`;if(tn.has(n))return tn.get(n);const a=Er(e);if(!a)return"";try{const r=document.createElement("canvas");r.width=t,r.height=i;const o=r.getContext("2d"),l=Hc(a),c=1.2;l.kind==="aurora"?Nc(o,t,i,c,a.hue,l):l.kind==="sunset"?qc(o,t,i,c,a.hue,l):Vc(o,t,i,c,a.hue,l);const d=r.toDataURL("image/png");return tn.size>=df&&tn.clear(),tn.set(n,d),d}catch{return""}}const Mo="wallpaper-video-blob",Io="ios-desktop:video-wallpaper";let z=null,ct="",Li=!1,wn=null,yl=0,jc=!1;try{jc=window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{}function Un(){return Li}function pf(){return z}async function uf(){me()&&await yt("wallpaper-blob");try{localStorage.removeItem("ios-desktop:wallpaper"),sessionStorage.removeItem("ios-desktop:wallpaper")}catch{}}function ff(){const e=document.getElementById("desktop");return z?(!z.isConnected&&e&&e.insertBefore(z,e.firstChild),z):e?(z=document.createElement("video"),z.className="video-wallpaper",z.muted=!0,z.loop=!0,z.autoplay=!0,z.setAttribute("playsinline",""),z.setAttribute("webkit-playsinline",""),z.disablePictureInPicture=!0,z.preload="auto",e.insertBefore(z,e.firstChild),z):null}function _r(){if(!z||z.readyState<2||!z.videoWidth)return"";try{const e=Math.min(z.videoWidth,2160),t=Math.max(1,Math.round(z.videoHeight/z.videoWidth*e)),i=document.createElement("canvas");return i.width=e,i.height=t,i.getContext("2d").drawImage(z,0,0,e,t),i.toDataURL("image/jpeg",.88)}catch{return""}}function mf(){const e=_r();e&&document.querySelectorAll("iframe").forEach(t=>{try{t.contentWindow.postMessage({type:"set-wallpaper",url:e},"*")}catch{}})}const Ze=36;function hf(e,t,i){e/=255,t/=255,i/=255;const n=Math.max(e,t,i),a=Math.min(e,t,i),r=(n+a)/2;if(n===a)return[0,0,r];const o=n-a,l=r>.5?o/(2-n-a):o/(n+a);let c;return n===e?c=((t-i)/o+(t<i?6:0))*60:n===t?c=((i-e)/o+2)*60:c=((e-t)/o+4)*60,[c,l,r]}function gf(e,t,i){try{const a=document.createElement("canvas");a.width=a.height=48;const r=a.getContext("2d",{willReadFrequently:!0});r.drawImage(e,0,0,48,48);const o=r.getImageData(0,0,48,48).data;for(let l=0;l<o.length;l+=4){if(o[l+3]<128)continue;const[c,d,u]=hf(o[l],o[l+1],o[l+2]);if(d<.12||u<.06||u>.96)continue;const f=d*d*(1-Math.abs(u-.5)*1.2);if(f<=0)continue;const m=Math.min(Ze-1,Math.floor(c/360*Ze));t[m]+=f,i[m].rs+=o[l],i[m].gs+=o[l+1],i[m].bs+=o[l+2],i[m].ss+=d,i[m].n++}}catch{}}function vf(e,t=2){const i=e.map((o,l)=>e[(l+Ze-1)%Ze]+e[l]*2+e[(l+1)%Ze]),n=i.reduce((o,l)=>o+l,0);if(n<=0)return[];const a=i.map((o,l)=>({v:o,i:l})).sort((o,l)=>l.v-o.v),r=[];for(const{v:o,i:l}of a){if(r.length>=t)break;r.some(c=>{const d=Math.abs(c.bin-l)*(360/Ze);return Math.min(d,360-d)<60})||r.push({bin:l,share:o/n})}return r}const yf=(e,t)=>new Promise(i=>{let n=!1;const a=()=>{n||(n=!0,e.removeEventListener("seeked",a),i())};e.addEventListener("seeked",a);try{e.currentTime=t}catch{a()}setTimeout(a,900)});async function wf(e){if(!e||!e.videoWidth)return null;const t=new Array(Ze).fill(0),i=Array.from({length:Ze},()=>({rs:0,gs:0,bs:0,ss:0,n:0})),n=!e.paused;try{e.pause()}catch{}const a=isFinite(e.duration)&&e.duration>.4?e.duration:0,r=a?[.1,.3,.5,.7,.9].map(m=>m*a):[e.currentTime||.1];for(const m of r)await yf(e,Math.min(Math.max(m,0),Math.max(.05,(a||m)-.05))),gf(e,t,i);try{e.currentTime=0}catch{}if(n)try{e.play().catch(()=>{})}catch{}const o=vf(t);if(!o.length)return null;const l=m=>Math.round(m*(360/Ze)+180/Ze)%360,c=(m,h,v)=>{const y=i[m],x=y.n?Math.round(y.ss/y.n*100):h,E=y.n?y.rs/y.n:128,b=y.n?y.gs/y.n:128,k=y.n?y.bs/y.n:128,M=Math.min(88,Math.max(22,Math.round((.299*E+.587*b+.114*k)/2.55)));return[l(m),Math.max(28,x),M]},d=c(o[0].bin,72),u=o[1]?c(o[1].bin,45):[(d[0]+60)%360,Math.round(d[1]*.55),Math.min(80,d[2]+8)],f=d[0];return{hue:f,primary:d,secondary:u,tertiary:[(f+60)%360,Math.max(30,Math.round(d[1]*.7)),Math.min(82,d[2]+6)],accent:[(f+200)%360,70,58],neutral:[f,10,46]}}function xf(e){if(e){try{localStorage.setItem("ios-desktop:theme-hue",String(e.hue)),localStorage.setItem("ios-desktop:palette",JSON.stringify(e))}catch{}je(e.hue,!1);try{const t=document.documentElement;e.primary&&t.style.setProperty("--md-primary",`hsl(${e.primary[0]} ${e.primary[1]}% ${e.primary[2]}%)`),e.secondary&&t.style.setProperty("--md-secondary",`hsl(${e.secondary[0]} ${e.secondary[1]}% ${e.secondary[2]}%)`)}catch{}document.querySelectorAll("iframe").forEach(t=>{try{t.contentWindow.postMessage({type:"set-palette",palette:e},"*")}catch{}})}}function bf(){wn||(wn=setInterval(()=>{if(!Li||!z){Ls();return}const e=!!s.currentApp||jc;e&&!z.paused?z.pause():!e&&z.paused&&z.play().catch(()=>{})},500))}function Ls(){wn&&(clearInterval(wn),wn=null)}async function Na(e,t={}){const{persist:i=!0,showToast:n=!0}=t;if(!e||!/^video\//.test(e.type||""))return!1;try{const u=document.querySelector(".procedural-wallpaper");u&&u.remove(),document.getElementById("desktop")?.classList.remove("procedural-active"),localStorage.removeItem("ios-desktop:procedural-wallpaper")}catch{}Yn(),await uf(),i&&si();const a=ff();if(!a)return!1;if(ct)try{URL.revokeObjectURL(ct)}catch{}ct=URL.createObjectURL(e);const r=++yl,o=ct;a.src=ct,document.getElementById("desktop").style.backgroundImage="none",document.getElementById("desktop").classList.add("video-wallpaper-active"),Li=!0;const l=()=>Li&&r===yl&&ct===o,c=()=>{l()&&(mf(),ri(!0),i&&((async()=>{let u=!1;if(me()&&(u=await ke(Mo,e)),u)try{localStorage.setItem(Io,"1")}catch{}else console.warn("[video-wallpaper] IndexedDB 不可用，视频壁纸仅本次会话有效")})(),setTimeout(()=>{l()&&wf(a).then(u=>{xf(u)})},700)),window.__blurBakeTest&&window.__blurBakeTest.refresh&&window.__blurBakeTest.refresh(),n&&window.showSystemToast&&window.showSystemToast("视频壁纸已应用",g.image),Sf())},d=async()=>{if(l()){window.showSystemToast&&window.showSystemToast("视频壁纸加载失败，已恢复原壁纸",g.videocam),await Bt();try{Zc()}catch{}}};return a.addEventListener("loadeddata",c,{once:!0}),a.addEventListener("error",d,{once:!0}),a.play().catch(()=>{}),bf(),!0}async function Bt(){try{localStorage.removeItem(Io)}catch{}if(me()&&await yt(Mo),!Li){Ls();return}if(Li=!1,Ls(),z&&(z.pause(),z.removeAttribute("src"),z.load(),z.remove(),z=null),ct){try{URL.revokeObjectURL(ct)}catch{}ct=""}const e=document.getElementById("desktop");e&&e.classList.remove("video-wallpaper-active")}function Sf(){const e=document.getElementById("themeUploadAnyBtn");e&&e.classList.add("active"),document.querySelectorAll("#themeDynamicGrid [data-proc]").forEach(t=>t.classList.remove("active"))}async function kf(){try{if(!localStorage.getItem(Io))return}catch{return}if(!me())return;const e=await Qt(Mo);e&&await Na(e,{persist:!1,showToast:!1})}function Ef(){const e=document.getElementById("videoWallpaperInput");e&&e.addEventListener("change",async t=>{const i=t.target.files[0];if(i){if(t.target.value="",i.size>200*1024*1024){window.showSystemToast&&window.showSystemToast("视频过大（上限 200MB）",g.videocam);return}await Na(i,{persist:!0,showToast:!0})}}),window.__videoWallpaper={isVideoActive:Un,getVideoEl:pf,getVideoFrameDataURL:_r},window.__videoWallpaperApply=Na}const _f=`
    .material-symbols-rounded { font-family: 'Material Symbols Rounded' !important; }
    .material-symbols-outlined { font-family: 'Material Symbols Outlined' !important; }
    .material-icons, .material-icons-rounded, .material-icons-outlined { font-family: 'Material Icons' !important; }
  `,ae={wallpaper:"ios-desktop:wallpaper",font:"ios-desktop:font",fontName:"ios-desktop:font-name",hue:"ios-desktop:theme-hue",palette:"ios-desktop:palette"},et={wallpaper:"wallpaper-blob",font:"font-blob",fontName:"font-name"},Yc="https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/b311240a375e.jpg";let Mr="",To="",dt="",Ir=215,Kn=null,wl=0;const nn=215;let xl="",bl="";function Mf(){try{dt=localStorage.getItem(ae.fontName)||"";const e=localStorage.getItem(ae.hue),t=e?parseInt(e,10):215;Ir=Number.isFinite(t)?t:215;const i=localStorage.getItem(ae.palette);Kn=i?JSON.parse(i):null}catch{}}function Uc(e){try{const t=e.indexOf(",");if(t<0)return null;const i=e.slice(0,t),n=e.slice(t+1),a=i.match(/^data:([^;]+)/),r=a?a[1]:"application/octet-stream",o=atob(n),l=new Uint8Array(o.length);for(let c=0;c<o.length;c++)l[c]=o.charCodeAt(c);return new Blob([l],{type:r})}catch{return null}}function Kc(e){return new Promise(t=>{try{const i=new FileReader;i.onload=n=>t(n.target.result),i.onerror=()=>t(null),i.readAsDataURL(e)}catch{t(null)}})}function Dn(e,t){const i=URL.createObjectURL(e),n=t==="font"?bl:xl;return n&&n!==i&&setTimeout(()=>{try{URL.revokeObjectURL(n)}catch{}},3e4),t==="font"?bl=i:xl=i,i}async function If(e){const t=await Kc(e);if(t){try{localStorage.setItem(ae.wallpaper,t);return}catch{}try{sessionStorage.setItem(ae.wallpaper,t)}catch{console.warn("[wallpaper] 存储空间不足，壁纸仅本次会话有效")}}}async function Tf(e,t){const i=await Kc(e);if(i)try{localStorage.setItem(ae.font,i),localStorage.setItem(ae.fontName,t)}catch{console.warn("[wallpaper] 存储空间不足，字体仅本次会话有效")}}function Cf(e){try{localStorage.setItem(ae.hue,String(e))}catch{}}function Lf(e){try{localStorage.setItem(ae.palette,JSON.stringify(e))}catch{}}function si(){Kn=null;try{localStorage.removeItem(ae.palette)}catch{}}function Af(){return Mr}function Bf(){return To}function Ff(){return dt}function Pf(){return Ir}function zf(){return Kn}function $f(e,t){const i=new Image;/^https?:/i.test(e)&&(i.crossOrigin="anonymous"),i.onload=()=>{const n=document.createElement("canvas"),a=n.getContext("2d"),r=60;n.width=n.height=r,a.drawImage(i,0,0,r,r);const o=a.getImageData(0,0,r,r).data,l=[];for(let h=0;h<o.length;h+=4)o[h+3]>128&&l.push([o[h],o[h+1],o[h+2]]);if(l.length===0){t({hue:215});return}let c=[l[Math.floor(Math.random()*l.length)],l[Math.floor(Math.random()*l.length)],l[Math.floor(Math.random()*l.length)],l[Math.floor(Math.random()*l.length)],l[Math.floor(Math.random()*l.length)]];for(let h=0;h<3;h++){const v=[[],[],[],[],[]];for(const y of l){let x=1/0,E=0;for(let b=0;b<c.length;b++){const k=(y[0]-c[b][0])**2+(y[1]-c[b][1])**2+(y[2]-c[b][2])**2;k<x&&(x=k,E=b)}v[E].push(y)}for(let y=0;y<c.length;y++){if(v[y].length===0)continue;let x=0,E=0,b=0;for(const M of v[y])x+=M[0],E+=M[1],b+=M[2];const k=v[y].length;c[y]=[x/k,E/k,b/k]}}const d=c.map((h,v)=>({r:Math.round(h[0]),g:Math.round(h[1]),b:Math.round(h[2]),size:l.length,idx:v})).sort((h,v)=>v.size-h.size);for(let h=0;h<1;h++){const v=[0,0,0,0,0];for(const y of l){let x=1/0,E=0;for(let b=0;b<c.length;b++){const k=(y[0]-c[b][0])**2+(y[1]-c[b][1])**2+(y[2]-c[b][2])**2;k<x&&(x=k,E=b)}v[E]++}d.forEach((y,x)=>{y.size=v[y.idx]}),d.sort((y,x)=>x.size-y.size)}const u=(h,v,y)=>{h/=255,v/=255,y/=255;const x=Math.max(h,v,y),E=Math.min(h,v,y);let b=0,k=0,M=(x+E)/2;if(x!==E){const L=x-E;switch(k=M>.5?L/(2-x-E):L/(x+E),x){case h:b=((v-y)/L+(v<y?6:0))*60;break;case v:b=((y-h)/L+2)*60;break;case y:b=((h-v)/L+4)*60;break}}return[Math.round(b),Math.round(k*100),Math.round(M*100)]},f=(h,v,y,x)=>{const[E,b,k]=h;return[b<8?nn:E,Math.max(v,b),Math.min(x,Math.max(y,k))]},m={primary:d[0]?f(u(d[0].r,d[0].g,d[0].b),28,22,88):[nn,80,25],secondary:d[1]?f(u(d[1].r,d[1].g,d[1].b),18,25,80):[nn,15,40],tertiary:d[2]?f(u(d[2].r,d[2].g,d[2].b),24,25,82):[nn,50,50],accent:d[3]?f(u(d[3].r,d[3].g,d[3].b),45,40,78):[0,70,50],neutral:d[4]?u(d[4].r,d[4].g,d[4].b):[nn,10,50],hue:0};m.hue=m.primary[0],t(m)},i.onerror=()=>t({hue:215,primary:[215,80,25]}),i.src=e}function Qc(e){if(!e)return;const t=document.documentElement;if(t.style.setProperty("--md-h",e.hue),e.primary){const[i,n,a]=e.primary;t.style.setProperty("--md-primary",`hsl(${i} ${n}% ${a}%)`)}if(e.secondary){const[i,n,a]=e.secondary;t.style.setProperty("--md-secondary",`hsl(${i} ${n}% ${a}%)`)}if(e.tertiary){const[i,n,a]=e.tertiary;t.style.setProperty("--md-tertiary",`hsl(${i} ${n}% ${a}%)`)}}function Jc(e,t){let i=document.getElementById("custom-font-style");i||(i=document.createElement("style"),i.id="custom-font-style",document.head.appendChild(i)),i.textContent=`
    @font-face {
      font-family: '${t}';
      src: url('${e}') format('woff2'), url('${e}') format('woff'), url('${e}') format('truetype');
      font-display: swap;
    }
    :root {
      --custom-user-font: '${t}', -apple-system, BlinkMacSystemFont, "Google Sans", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif;
    }
    body, input, textarea, select, button, .app-icon > span, .widget-title, .at-a-glance-title, .glance-date, .md3-list-item-text, .md3-card, .menu-item-text {
      font-family: var(--custom-user-font) !important;
    }
    /* 严格保护状态栏、时钟电量、图标矢量、系统符号与 Emoji 免受自定义字体破坏 */
    .status-bar, .app-window-status-bar, .status-time, .status-icon, .battery-pill, .battery-pct, .battery-level, .page-dots, .dot, .app-badge, .remove-badge, .nav-btn, .back-btn, .recent-card-close, .recent-action-pill, svg, svg *, [class*="icon"], [class*="symbol"], [class*="emoji"], [data-icon], [data-symbol], .material-symbols, .glance-weather-icon, .glance-chip-icon, .menu-header-icon, .menu-item-icon {
      font-family: -apple-system, BlinkMacSystemFont, "Google Sans", "Segoe UI", system-ui, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif !important;
    }
    /* 连字图标字体例外：恢复其自家字体家族，否则图标名（如 bar_chart）会以文本形式裸露 */
    ${_f}
  `}function Df(){try{document.getElementById("themeUploadAnyBtn")?.classList.remove("active"),document.querySelectorAll("#themeDynamicGrid [data-proc]").forEach(e=>e.classList.remove("active"))}catch{}}async function Of(e,t){const i=e&&e.type||"",n=e&&e.name||"",a=n.includes(".")?n.split(".").pop().toLowerCase():"",r=["mp4","webm","mov","m4v","ogv","mkv","avi"];if(/^video\//.test(i)||!i&&r.includes(a)){if(e.size>200*1024*1024){window.showSystemToast&&window.showSystemToast("视频过大（上限 200MB）",g.videocam);return}!await Na(e,{persist:t,showToast:!0})&&window.showSystemToast&&window.showSystemToast("不支持的视频格式",g.videocam);return}await Rf(e)}async function Rf(e,t){Yn(),await Bt(),Df(),si();const i=Dn(e,"wallpaper");Ta(i);{let r=!1;if(me()&&(r=await ke(et.wallpaper,e)),r)try{localStorage.removeItem(ae.wallpaper),sessionStorage.removeItem(ae.wallpaper)}catch{}else await If(e)}const n=++wl,a=()=>{if(n!==wl||Un()||Ct()||i!==Mr)return!1;try{return(p.desktop.style.backgroundImage||"").includes(i)}catch{return!1}};$f(i,r=>{a()&&(Ir=r.hue,Kn=r,Cf(r.hue),Lf(r),je(r.hue,!1),Qc(r),document.querySelectorAll("iframe").forEach(o=>{try{o.contentWindow.postMessage({type:"set-palette",palette:r},"*")}catch{}}))})}async function Hf(e,t,i){const n=Dn(e,"font");To=n,dt=t,Jc(n,t),ed("set-font",n,{name:t});{let a=!1;if(me()){const r=await ke(et.font,e),o=await ke(et.fontName,t);a=r&&o}a||await Tf(e,t);try{localStorage.setItem(ae.fontName,t)}catch{}}}function Ta(e){Mr=e,/^https?:/i.test(e)&&si(),p.desktop.style.backgroundImage=`url(${e})`,ed("set-wallpaper",e),ri(!0)}function di(){je(Ir,!1),Qc(Kn)}function Zc(){return(async()=>{if(await kf(),Un()){di();return}let e="";try{e=localStorage.getItem(ko)||""}catch{}if(e&&$n(e,{persist:!1,showToast:!1})){di();return}if(me()){const i=await Qt(et.wallpaper);if(i){Ta(Dn(i,"wallpaper")),di();return}}let t="";try{t=(localStorage.getItem(ae.wallpaper)||sessionStorage.getItem(ae.wallpaper)||"").trim()}catch{}if(t.startsWith("data:")){const i=Uc(t);if(i){Ta(Dn(i,"wallpaper")),di(),me()&&await ke(et.wallpaper,i);try{localStorage.removeItem(ae.wallpaper),sessionStorage.removeItem(ae.wallpaper)}catch{}return}}if(t){Ta(t),di();return}if($n("aurora",{persist:!1,showToast:!1})){di();return}si(),p.desktop.style.backgroundImage=`url(${Yc})`})()}function Nf(){return(async()=>{let e=null;if(me()&&(e=await Qt(et.font),e&&!dt)){const t=await Qt(et.fontName);t&&(dt=t)}if(!e){let t="";try{t=(localStorage.getItem(ae.font)||"").trim()}catch{}if(t.startsWith("data:")){const i=Uc(t);if(i){e=i,me()&&(await ke(et.font,e),dt&&await ke(et.fontName,dt));try{localStorage.removeItem(ae.font)}catch{}}}}if(e&&dt){const t=Dn(e,"font");To=t,Jc(t,dt)}})()}async function Ai(){me()&&await yt(et.wallpaper)}function ed(e,t,i={}){document.querySelectorAll("iframe").forEach(n=>{try{n.contentWindow.postMessage({type:e,url:t,...i},"*")}catch{}})}function qf(){if(Un()){const e=_r();if(e)return e}return Mr||""}function Co(){p.wallpaperInput.click()}function Vf(){p.fontInput&&p.fontInput.click()}function Wf(){Mf(),p.wallpaperInput.addEventListener("change",async e=>{const t=e.target.files[0];t&&(e.target.value="",await Of(t,!0))}),p.fontInput&&p.fontInput.addEventListener("change",async e=>{const t=e.target.files[0];if(!t)return;e.target.value="";const i=t.name.replace(/\.[^.]+$/,"");await Hf(t,i)})}const td="ios-desktop:theme-mode";let Zt="auto",gi=null;try{gi=window.matchMedia("(prefers-color-scheme: dark)")}catch{}function Gf(){try{const e=localStorage.getItem(td);(e==="light"||e==="dark"||e==="auto")&&(Zt=e)}catch{}}function nt(){if(Zt==="auto")try{return gi&&gi.matches?"dark":"light"}catch{return"dark"}return Zt}function Lo(){return Zt}function As(){const e=nt()==="light";document.body.classList.toggle("light-theme",e),typeof window.__onThemeModeChanged=="function"&&window.__onThemeModeChanged(e)}function Xi(e){if(["auto","light","dark"].includes(e)){Zt=e;try{localStorage.setItem(td,e)}catch{}As()}}function Xf(){Gf(),As(),gi&&gi.addEventListener&&gi.addEventListener("change",()=>{Zt==="auto"&&As()}),window.__themeModeTest={pref:()=>Zt,resolved:()=>nt(),set:e=>Xi(e)}}const Bs=new Set;function jf(e){return Bs.add(e),()=>Bs.delete(e)}function Yf(){for(const e of Bs)try{if(e.isActive())return e}catch{}return null}function re(e,t,i){return e=Math.max(0,Math.min(1,(e-t)/(i-t))),e*e*(3-2*e)}function I(e,t,i){return Math.max(t,Math.min(i,e))}function ei(){const e=window.innerWidth||400,t=window.innerHeight||800;return e>=768||t<=520&&e>t?6:4}function Fs(e){const t={left:window.innerWidth/2-29,top:window.innerHeight/2-29,width:58,height:58};if(!e||typeof e.querySelector!="function")return t;const i=e.querySelector(".icon-box")||e.querySelector(".folder-icon")||e,n=document.getElementById("desktop"),a=document.getElementById("desktopSlider"),r=e.closest(".page-grid");if(r&&r.dataset.page!==void 0&&a){const f=parseInt(r.dataset.page,10);if(!isNaN(f)&&s.currentPage!==f){s.currentPage=f,a.style.transition="none",a.style.transform=`translate3d(${-f*100}vw, 0, 0)`;const m=document.getElementById("pageDots");m&&Array.from(m.children).forEach((h,v)=>{h.classList.toggle("active",v===f)})}}const o=n?n.style.transform:"",l=n?n.style.transition:"";n&&(n.style.transform||n.style.transition)&&(n.style.setProperty("transform","none","important"),n.style.setProperty("transition","none","important"));const c=e.style.transform,d=e.style.transition;e.style.setProperty("transform","none","important"),e.style.setProperty("transition","none","important");const u=i.getBoundingClientRect();return e.style.transform=c,e.style.transition=d,n&&(n.style.transform=o,n.style.transition=l),u.width===0||u.height===0?t:{left:u.left,top:u.top,width:u.width||58,height:u.height||58}}function Ee(e,t=!1){const i=t?"launch_":"grid_";if(e==="clock")return`
      <div class="dynamic-clock-icon">
        <div class="clock-face">
          <div class="clock-tick tick-12"></div>
          <div class="clock-tick tick-3"></div>
          <div class="clock-tick tick-6"></div>
          <div class="clock-tick tick-9"></div>
          <div class="clock-hand hour-hand" id="${i}hourHand"></div>
          <div class="clock-hand minute-hand" id="${i}minuteHand"></div>
          <div class="clock-hand second-hand" id="${i}secondHand"></div>
          <div class="clock-center-dot"></div>
        </div>
      </div>`;if(e==="calendar"){const n=new Date;return`
      <div class="dynamic-calendar-icon">
        <div class="cal-header" id="${i}calHeader">${["周日","周一","周二","周三","周四","周五","周六"][n.getDay()]}</div>
        <div class="cal-body" id="${i}calBody">${n.getDate()}</div>
      </div>`}return""}const Sl=new Map;function id(e){let t=Sl.get(e);return(!t||!t.isConnected)&&(t=document.getElementById(e),t&&Sl.set(e,t)),t}let an=null;function Uf(){return(!an||!an.isConnected)&&(an=document.getElementById("recentAppsOverlay")),!!(an&&an.classList.contains("active"))}const qa=new Map;function ns(e,t){const i=id(e);if(!i)return;const n=qa.get(e);n&&n.el===i&&n.value===t||(qa.set(e,{el:i,value:t}),i.style.transform=t)}function kl(e,t){const i=id(e);if(!i)return;const n=qa.get(e);n&&n.el===i&&n.value===t||(qa.set(e,{el:i,value:t}),i.textContent=t)}let Ca=0;function Kf(){if(Ca)return;const e=1e3-Date.now()%1e3+30;Ca=setTimeout(()=>{Ca=0,Ao()},Math.max(250,e))}typeof document<"u"&&document.addEventListener("visibilitychange",()=>{!document.hidden&&!Ca&&Ao()});function Ao(){if(!(document.hidden||document.body.classList.contains("is-locked")||Uf())){const t=new Date,n=["周日","周一","周二","周三","周四","周五","周六"][t.getDay()],a=String(t.getDate()),r=t.getHours()%12,o=t.getMinutes(),l=t.getSeconds(),c=t.getMilliseconds(),d=`rotate(${Math.floor((l+c/1e3)*6)}deg)`,u=`rotate(${((o+l/60)*6).toFixed(2)}deg)`,f=`rotate(${((r+o/60)*30).toFixed(2)}deg)`;["grid_","launch_"].forEach(m=>{ns(m+"hourHand",f),ns(m+"minuteHand",u),ns(m+"secondHand",d),kl(m+"calHeader",n),kl(m+"calBody",a)})}Kf()}const he={msg:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 55) 100% 26.47%)"/>
    <!-- 主体圆形对话气泡 -->
    <path d="M 50 18 C 32 18 18 31 18 47 C 18 56 23 64 30 69 L 26 82 L 40 76 C 43 77 47 78 50 78 C 68 78 82 65 82 47 C 82 31 68 18 50 18 Z" fill="#FFFFFF"/>
    <!-- 3 颗内部纯色几何实心圆 -->
    <circle cx="36" cy="48" r="5" style="fill:hsl(calc(var(--md-h,215) - 55) 100% 26.47%)"/>
    <circle cx="50" cy="48" r="5" style="fill:hsl(calc(var(--md-h,215) - 55) 100% 26.47%)"/>
    <circle cx="64" cy="48" r="5" style="fill:hsl(calc(var(--md-h,215) - 55) 100% 26.47%)"/>
  </svg>`,mail:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 0.92) 81.75% 50.59%)"/>
    <!-- 信封白色主体方块 -->
    <rect x="18" y="26" width="64" height="48" rx="8" fill="#FFFFFF"/>
    <!-- 纯色几何折叠折痕 (纯色灰蓝) -->
    <path d="M 18 32 L 50 56 L 82 32 L 82 26 L 18 26 Z" style="fill:hsl(calc(var(--md-h,215) + 3.18) 91.67% 95.29%)"/>
    <path d="M 18 74 L 40 50" style="stroke:hsl(calc(var(--md-h,215) - 2.27) 26.83% 83.92%)" stroke-width="4" stroke-linecap="round"/>
    <path d="M 82 74 L 60 50" style="stroke:hsl(calc(var(--md-h,215) - 2.27) 26.83% 83.92%)" stroke-width="4" stroke-linecap="round"/>
    <!-- 封口红印圆形色块 -->
    <circle cx="50" cy="54" r="9" style="fill:hsl(calc(var(--md-h,215) - 210.36) 81.17% 56.27%)"/>
    <circle cx="50" cy="54" r="4" fill="#FFFFFF"/>
  </svg>`,photos:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#FFFFFF"/>
    <rect width="98" height="98" x="1" y="1" rx="23" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 顶部红色圆形花瓣 -->
    <circle cx="50" cy="32" r="16" style="fill:hsl(calc(var(--md-h,215) - 210.36) 81.17% 56.27%)"/>
    <!-- 右侧黄色圆形花瓣 -->
    <circle cx="68" cy="50" r="16" style="fill:hsl(calc(var(--md-h,215) - 170.37) 96.85% 50.2%)"/>
    <!-- 底部绿色圆形花瓣 -->
    <circle cx="50" cy="68" r="16" style="fill:hsl(calc(var(--md-h,215) - 78.97) 52.73% 43.14%)"/>
    <!-- 左侧蓝色圆形花瓣 -->
    <circle cx="32" cy="50" r="16" style="fill:hsl(calc(var(--md-h,215) + 2.42) 89% 60.78%)"/>
    <!-- 中心纯白方形圆角遮罩核 -->
    <rect x="38" y="38" width="24" height="24" rx="8" fill="#FFFFFF"/>
    <circle cx="50" cy="50" r="6" style="fill:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)"/>
  </svg>`,settings:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 0.29) 25% 26.67%)"/>
    <!-- 8 方位几何十字齿轮 (方圆组合) -->
    <rect x="42" y="16" width="16" height="68" rx="5" style="fill:hsl(calc(var(--md-h,215) - 5) 40% 98.04%)"/>
    <rect x="16" y="42" width="68" height="16" rx="5" style="fill:hsl(calc(var(--md-h,215) - 5) 40% 98.04%)"/>
    <rect x="42" y="16" width="16" height="68" rx="5" style="fill:hsl(calc(var(--md-h,215) - 5) 40% 98.04%)" transform="rotate(45 50 50)"/>
    <rect x="16" y="42" width="68" height="16" rx="5" style="fill:hsl(calc(var(--md-h,215) - 5) 40% 98.04%)" transform="rotate(45 50 50)"/>
    <!-- 外部白色主圆 -->
    <circle cx="50" cy="50" r="26" style="fill:hsl(calc(var(--md-h,215) - 5) 40% 98.04%)"/>
    <!-- 中间纯色深灰圆环 -->
    <circle cx="50" cy="50" r="16" style="fill:hsl(calc(var(--md-h,215) + 0.29) 25% 26.67%)"/>
    <!-- 核心翡翠绿圆形指示点 -->
    <circle cx="50" cy="50" r="9" style="fill:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)"/>
  </svg>`,clock:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#18181B"/>
    <!-- 白色纯圆表盘 -->
    <circle cx="50" cy="50" r="38" fill="#FFFFFF"/>
    <!-- 4 方位方形刻度 -->
    <rect x="48" y="18" width="4" height="8" rx="2" fill="#71717A"/>
    <rect x="48" y="74" width="4" height="8" rx="2" fill="#71717A"/>
    <rect x="18" y="48" width="8" height="4" rx="2" fill="#71717A"/>
    <rect x="74" y="48" width="8" height="4" rx="2" fill="#71717A"/>
    <!-- 纯色时针与分针 -->
    <rect x="47.5" y="30" width="5" height="24" rx="2.5" fill="#18181B"/>
    <rect x="48" y="48" width="22" height="4" rx="2" fill="#18181B"/>
    <!-- 纯色亮橙秒针 -->
    <circle cx="50" cy="50" r="5" style="fill:hsl(calc(var(--md-h,215) - 190.42) 94.98% 53.14%)"/>
    <circle cx="50" cy="50" r="2.5" fill="#FFFFFF"/>
  </svg>`,calendar:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#FFFFFF"/>
    <rect width="98" height="98" x="1" y="1" rx="23" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 顶部猩红纯色块 -->
    <path d="M 0 24 C 0 10.7 10.7 0 24 0 L 76 0 C 89.3 0 100 10.7 100 24 L 100 32 L 0 32 Z" style="fill:hsl(calc(var(--md-h,215) - 215) 72.22% 50.59%)"/>
    <!-- 两个白色纯圆挂扣 -->
    <circle cx="30" cy="16" r="4" fill="#FFFFFF"/>
    <circle cx="70" cy="16" r="4" fill="#FFFFFF"/>
    <!-- 底部日期数字方形与圆形布局 -->
    <text x="50" y="74" font-size="38" font-family="-apple-system, Roboto, sans-serif" font-weight="800" text-anchor="middle" style="fill:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)">16</text>
  </svg>`,weather:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 14.59) 98.01% 39.41%)"/>
    <!-- 金黄太阳实心圆 -->
    <circle cx="64" cy="38" r="18" style="fill:hsl(calc(var(--md-h,215) - 177.31) 92.13% 50.2%)"/>
    <!-- 纯白几何云朵 (由三个实心圆与底座圆角矩形组合) -->
    <circle cx="34" cy="62" r="14" fill="#FFFFFF"/>
    <circle cx="52" cy="52" r="18" fill="#FFFFFF"/>
    <circle cx="70" cy="62" r="12" fill="#FFFFFF"/>
    <rect x="34" y="60" width="36" height="16" fill="#FFFFFF"/>
  </svg>`,music:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 14.59) 98.01% 39.41%)"/>
    <!-- 纯白黑胶圆形大底 -->
    <circle cx="50" cy="50" r="34" fill="#FFFFFF"/>
    <!-- 内部深青双音符 (双实心圆 + 矩形连接梁) -->
    <circle cx="40" cy="60" r="7" style="fill:hsl(calc(var(--md-h,215) - 13.73) 96.34% 32.16%)"/>
    <circle cx="60" cy="52" r="7" style="fill:hsl(calc(var(--md-h,215) - 13.73) 96.34% 32.16%)"/>
    <rect x="44" y="34" width="4" height="26" style="fill:hsl(calc(var(--md-h,215) - 13.73) 96.34% 32.16%)"/>
    <rect x="64" y="26" width="4" height="26" style="fill:hsl(calc(var(--md-h,215) - 13.73) 96.34% 32.16%)"/>
    <polygon points="44,34 68,26 68,34 44,42" style="fill:hsl(calc(var(--md-h,215) - 13.73) 96.34% 32.16%)"/>
    <!-- CyanWave 品牌青绿角标（brand-logo ::after 同源） -->
    <rect x="73" y="73" width="13" height="13" rx="3" style="fill:hsl(calc(var(--md-h,215) - 40.33) 83.85% 31.57%)"/>
  </svg>`,calc:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)"/>
    <!-- 4 个纯色圆形计算符号色块 -->
    <!-- 1. 加号 (琥珀橙圆) -->
    <circle cx="34" cy="34" r="14" style="fill:hsl(calc(var(--md-h,215) - 177.31) 92.13% 50.2%)"/>
    <rect x="32" y="26" width="4" height="16" rx="2" fill="#FFFFFF"/>
    <rect x="26" y="32" width="16" height="4" rx="2" fill="#FFFFFF"/>

    <!-- 2. 减号 (靛蓝圆) -->
    <circle cx="66" cy="34" r="14" style="fill:hsl(calc(var(--md-h,215) + 23.73) 83.53% 66.67%)"/>
    <rect x="58" y="32" width="16" height="4" rx="2" fill="#FFFFFF"/>

    <!-- 3. 乘号 (天蓝圆) -->
    <circle cx="34" cy="66" r="14" style="fill:hsl(calc(var(--md-h,215) - 16.37) 88.66% 48.43%)"/>
    <rect x="32" y="58" width="4" height="16" rx="2" fill="#FFFFFF" transform="rotate(45 34 66)"/>
    <rect x="26" y="64" width="16" height="4" rx="2" fill="#FFFFFF" transform="rotate(45 34 66)"/>

    <!-- 4. 等号 (薄荷绿圆) -->
    <circle cx="66" cy="66" r="14" style="fill:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)"/>
    <rect x="58" y="61" width="16" height="3.5" rx="1.5" fill="#FFFFFF"/>
    <rect x="58" y="68" width="16" height="3.5" rx="1.5" fill="#FFFFFF"/>
  </svg>`,camera:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#1E2022"/>
    <!-- 顶部闪光灯与快门方形 -->
    <rect x="28" y="18" width="18" height="8" rx="3" fill="#4B5563"/>
    <circle cx="72" cy="28" r="5" style="fill:hsl(calc(var(--md-h,215) - 171.74) 96.41% 56.27%)"/>
    <!-- 镜头外圈 (中性灰圆) -->
    <circle cx="50" cy="54" r="28" style="fill:hsl(calc(var(--md-h,215) + 1.92) 19.12% 26.67%)"/>
    <!-- 镜头中圈 (皇家蓝纯圆) -->
    <circle cx="50" cy="54" r="20" style="fill:hsl(calc(var(--md-h,215) + 9.28) 76.33% 48.04%)"/>
    <!-- 镜头瞳孔 (黑曜深蓝圆) -->
    <circle cx="50" cy="54" r="12" style="fill:hsl(calc(var(--md-h,215) + 7.22) 47.37% 11.18%)"/>
    <!-- 纯白圆形反光高光点 -->
    <circle cx="45" cy="49" r="4" fill="#FFFFFF"/>
  </svg>`,map:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#FFFFFF"/>
    <rect width="98" height="98" x="1" y="1" rx="23" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 绿色几何公园色块 -->
    <path d="M 0 24 C 0 10.7 10.7 0 24 0 L 52 0 L 32 48 L 0 38 Z" style="fill:hsl(calc(var(--md-h,215) - 73.29) 76.64% 73.14%)"/>
    <!-- 蓝色几何水系色块 -->
    <path d="M 68 0 L 100 0 L 100 48 L 84 54 Z" style="fill:hsl(calc(var(--md-h,215) - 3.3) 96.36% 78.43%)"/>
    <!-- 黄色道路纵贯线 -->
    <polygon points="20,100 80,0 92,0 32,100" style="fill:hsl(calc(var(--md-h,215) - 164.56) 97.85% 63.53%)"/>
    <!-- 纯红地图定位标记 (圆+三角) -->
    <path d="M 50 26 C 40 26 32 34 32 44 C 32 58 50 78 50 78 C 50 78 68 58 68 44 C 68 34 60 26 50 26 Z" style="fill:hsl(calc(var(--md-h,215) - 215) 84.24% 60.2%)"/>
    <!-- 中心纯白圆形空腔 -->
    <circle cx="50" cy="44" r="7" fill="#FFFFFF"/>
  </svg>`,notes:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 182.87) 94.62% 43.73%)"/>
    <!-- 奶黄方形便签主体 (带折角) -->
    <path d="M 22 20 L 78 20 L 78 62 L 62 78 L 22 78 Z" style="fill:hsl(calc(var(--md-h,215) - 167) 96.49% 88.82%)"/>
    <!-- 折角三角形纯色块 -->
    <polygon points="62,62 78,62 62,78" style="fill:hsl(calc(var(--md-h,215) - 167) 96.64% 76.67%)"/>
    <!-- 顶部固定圆图钉 -->
    <circle cx="50" cy="28" r="5" style="fill:hsl(calc(var(--md-h,215) - 189.04) 90.48% 37.06%)"/>
    <!-- 3 条纯色横线 -->
    <rect x="30" y="40" width="40" height="4" rx="2" style="fill:hsl(calc(var(--md-h,215) - 182.87) 94.62% 43.73%)"/>
    <rect x="30" y="50" width="40" height="4" rx="2" style="fill:hsl(calc(var(--md-h,215) - 182.87) 94.62% 43.73%)"/>
    <rect x="30" y="60" width="24" height="4" rx="2" style="fill:hsl(calc(var(--md-h,215) - 182.87) 94.62% 43.73%)"/>
  </svg>`,reminders:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#FFFFFF"/>
    <rect width="98" height="98" x="1" y="1" rx="23" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 第 1 条 (蓝色圆) -->
    <circle cx="28" cy="30" r="8" style="fill:hsl(calc(var(--md-h,215) + 2.22) 91.22% 59.8%)"/>
    <rect x="42" y="26" width="38" height="8" rx="4" style="fill:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)"/>
    <!-- 第 2 条 (红色圆) -->
    <circle cx="28" cy="50" r="8" style="fill:hsl(calc(var(--md-h,215) - 215) 84.24% 60.2%)"/>
    <rect x="42" y="46" width="44" height="8" rx="4" style="fill:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)"/>
    <!-- 第 3 条 (琥珀圆) -->
    <circle cx="28" cy="70" r="8" style="fill:hsl(calc(var(--md-h,215) - 177.31) 92.13% 50.2%)"/>
    <rect x="42" y="66" width="30" height="8" rx="4" style="fill:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)"/>
  </svg>`,health:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#FFFFFF"/>
    <rect width="98" height="98" x="1" y="1" rx="23" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 外部翡翠绿圆形运动环 -->
    <circle cx="50" cy="50" r="32" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)" stroke-width="8"/>
    <!-- 内部纯红几何爱心 (圆角与方形融合) -->
    <path d="M 50 64 L 33 47 C 27 41 27 31 34 25 C 41 19 50 23 50 29 C 50 23 59 19 66 25 C 73 31 73 41 67 47 Z" style="fill:hsl(calc(var(--md-h,215) + 134.72) 89.16% 60.2%)"/>
  </svg>`,wallet:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 28.75) 47.06% 20%)"/>
    <!-- 顶部插卡 1 (蓝绿纯色矩形) -->
    <rect x="24" y="20" width="52" height="24" rx="6" style="fill:hsl(calc(var(--md-h,215) - 40.33) 83.85% 31.57%)"/>
    <!-- 顶部插卡 2 (金黄纯色矩形) -->
    <rect x="28" y="28" width="44" height="24" rx="6" style="fill:hsl(calc(var(--md-h,215) - 177.31) 92.13% 50.2%)"/>
    <!-- 钱包白色主体 -->
    <rect x="18" y="38" width="64" height="42" rx="10" fill="#FFFFFF"/>
    <!-- 钱包翻盖横条与金圆扣 -->
    <rect x="18" y="38" width="64" height="18" rx="6" style="fill:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)"/>
    <circle cx="50" cy="58" r="8" style="fill:hsl(calc(var(--md-h,215) - 177.31) 92.13% 50.2%)"/>
    <circle cx="50" cy="58" r="4" fill="#FFFFFF"/>
  </svg>`,appstore:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 14.59) 98.01% 39.41%)"/>
    <!-- Google Play 经典 4 纯色几何切片 (纯色无渐变) -->
    <polygon points="26,20 26,80 56,50" style="fill:hsl(calc(var(--md-h,215) + 2.22) 91.22% 59.8%)"/>
    <polygon points="26,20 56,50 68,38 38,14" style="fill:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)"/>
    <polygon points="26,80 56,50 68,62 38,86" style="fill:hsl(calc(var(--md-h,215) - 215) 84.24% 60.2%)"/>
    <polygon points="56,50 68,38 82,46 82,54 68,62" style="fill:hsl(calc(var(--md-h,215) - 177.31) 92.13% 50.2%)"/>
  </svg>`,safari:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#FFFFFF"/>
    <rect width="98" height="98" x="1" y="1" rx="23" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 3 色纯圆扇区环 (红、黄、绿) -->
    <!-- 红色扇形区 -->
    <path d="M 50 18 A 32 32 0 0 1 77.7 34 L 50 50 Z" style="fill:hsl(calc(var(--md-h,215) - 210.36) 81.17% 56.27%)"/>
    <!-- 黄色扇形区 -->
    <path d="M 77.7 34 A 32 32 0 0 1 77.7 66 L 50 50 Z" style="fill:hsl(calc(var(--md-h,215) - 170.37) 96.85% 50.2%)"/>
    <!-- 绿色扇形区 -->
    <path d="M 77.7 66 A 32 32 0 0 1 22.3 66 L 50 50 Z" style="fill:hsl(calc(var(--md-h,215) - 78.97) 52.73% 43.14%)"/>
    <!-- 蓝色扇形区 -->
    <path d="M 22.3 66 A 32 32 0 0 1 50 18 L 50 50 Z" style="fill:hsl(calc(var(--md-h,215) + 2.42) 89% 60.78%)"/>
    <!-- 隔离白色圆环 -->
    <circle cx="50" cy="50" r="20" fill="#FFFFFF"/>
    <!-- 核心皇家蓝纯圆 -->
    <circle cx="50" cy="50" r="14" style="fill:hsl(calc(var(--md-h,215) - 0.92) 81.75% 50.59%)"/>
  </svg>`,phone:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 72.87) 76.22% 36.27%)"/>
    <!-- 纯白几何听筒 -->
    <g transform="rotate(45 50 50)">
      <circle cx="36" cy="36" r="10" fill="#FFFFFF"/>
      <circle cx="64" cy="64" r="10" fill="#FFFFFF"/>
      <path d="M 36 26 C 58 26 74 42 74 64 L 64 64 C 64 48 52 36 36 36 Z" fill="#FFFFFF"/>
    </g>
  </svg>`,facetime:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 53.62) 93.55% 30.39%)"/>
    <!-- 白色录像机机身方形 -->
    <rect x="20" y="30" width="42" height="40" rx="10" fill="#FFFFFF"/>
    <!-- 右侧投影镜头纯白三角形 -->
    <polygon points="66,42 84,30 84,70 66,58" fill="#FFFFFF"/>
    <!-- 机身内部指示圆点 -->
    <circle cx="32" cy="42" r="4" style="fill:hsl(calc(var(--md-h,215) - 53.62) 93.55% 30.39%)"/>
  </svg>`,contacts:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 9.28) 76.33% 48.04%)"/>
    <!-- 右侧 3 个纯色索引方块 -->
    <rect x="80" y="24" width="8" height="12" rx="3" style="fill:hsl(calc(var(--md-h,215) - 3.3) 96.36% 78.43%)"/>
    <rect x="80" y="44" width="8" height="12" rx="3" style="fill:hsl(calc(var(--md-h,215) - 3.3) 96.36% 78.43%)"/>
    <rect x="80" y="64" width="8" height="12" rx="3" style="fill:hsl(calc(var(--md-h,215) - 3.3) 96.36% 78.43%)"/>
    <!-- 纯白人物头像 (实心圆 + 弧形半身) -->
    <circle cx="46" cy="38" r="14" fill="#FFFFFF"/>
    <path d="M 22 74 C 22 58 70 58 70 74 Z" fill="#FFFFFF"/>
  </svg>`,findmy:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 50.83) 85.71% 16.47%)"/>
    <!-- 外层雷达圆环 -->
    <circle cx="50" cy="50" r="34" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 52.07) 93.55% 24.31%)" stroke-width="4"/>
    <!-- 中层雷达圆环 -->
    <circle cx="50" cy="50" r="22" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)" stroke-width="4"/>
    <!-- 雷达扫描纯色 90度 扇区 -->
    <path d="M 50 50 L 50 16 A 34 34 0 0 1 84 50 Z" style="fill:hsl(calc(var(--md-h,215) - 53.62) 93.55% 30.39%)" opacity="0.6"/>
    <!-- 核心定位白点圆 -->
    <circle cx="50" cy="50" r="8" style="fill:hsl(calc(var(--md-h,215) - 56.89) 64.37% 51.57%)"/>
    <circle cx="50" cy="50" r="4" fill="#FFFFFF"/>
  </svg>`,translate:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 6.21) 83.19% 53.33%)"/>
    <!-- 左上白色对话方块 (带英文 A) -->
    <rect x="18" y="20" width="40" height="40" rx="10" fill="#FFFFFF"/>
    <text x="38" y="48" font-size="24" font-family="-apple-system, sans-serif" font-weight="900" text-anchor="middle" style="fill:hsl(calc(var(--md-h,215) + 10.93) 70.73% 40.2%)">A</text>
    <!-- 右下深蓝对话方块 (带汉字 文) -->
    <rect x="42" y="40" width="40" height="40" rx="10" style="fill:hsl(calc(var(--md-h,215) + 9.44) 64.29% 32.94%)"/>
    <text x="62" y="68" font-size="22" font-family="-apple-system, sans-serif" font-weight="900" text-anchor="middle" fill="#FFFFFF">文</text>
  </svg>`,game2048:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 19.66) 100% 34.51%)"/>
    <!-- 左侧浅青翼卡牌 2（-12° 倾斜） -->
    <g transform="rotate(-12 27 45)">
      <rect x="12" y="24" width="30" height="42" rx="7" style="fill:hsl(calc(var(--md-h,215) - 22.37) 64.04% 82.55%)"/>
      <text x="27" y="51" font-size="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" style="fill:hsl(calc(var(--md-h,215) - 14.23) 59.09% 17.25%)">2</text>
    </g>
    <!-- 右侧中青翼卡牌 4（+12° 倾斜） -->
    <g transform="rotate(12 73 45)">
      <rect x="58" y="24" width="30" height="42" rx="7" style="fill:hsl(calc(var(--md-h,215) - 21.89) 61.13% 51.57%)"/>
      <text x="73" y="51" font-size="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" fill="#FFFFFF">4</text>
    </g>
    <!-- 前中纯白主卡牌 2048 -->
    <rect x="29" y="30" width="42" height="52" rx="9" fill="#FFFFFF"/>
    <text x="50" y="61" font-size="14" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" style="fill:hsl(calc(var(--md-h,215) - 16.54) 78.79% 12.94%)">2048</text>
    <!-- 顶部极光青万能星徽章（游戏万能牌图腾） -->
    <circle cx="68" cy="27" r="9" style="fill:hsl(calc(var(--md-h,215) - 28.88) 100% 50%)"/>
    <polygon points="68,22 69.55,25.13 73,26.64 70.5,29.07 71.09,32.51 68,32.89 64.91,32.51 65.5,29.07 63,26.64 66.46,25.13" style="fill:hsl(calc(var(--md-h,215) - 16.54) 78.79% 12.94%)"/>
  </svg>`,books:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 194.46) 90.24% 48.24%)"/>
    <!-- 白色双翼展开书页 (方圆结合) -->
    <path d="M 20 34 C 20 34 32 30 50 36 L 50 76 C 32 70 20 74 20 74 Z" fill="#FFFFFF"/>
    <path d="M 80 34 C 80 34 68 30 50 36 L 50 76 C 68 70 80 74 80 74 Z" fill="#FFFFFF"/>
    <!-- 书脊中心分隔 -->
    <line x1="50" y1="36" x2="50" y2="76" style="stroke:hsl(calc(var(--md-h,215) - 197.53) 88.35% 40.39%)" stroke-width="2"/>
    <!-- 顶部金黄阅读圆章 -->
    <circle cx="50" cy="24" r="6" style="fill:hsl(calc(var(--md-h,215) - 171.74) 96.41% 56.27%)"/>
  </svg>`,stocks:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#18181B"/>
    <!-- 绿色趋势折线底色块 (方圆剪裁) -->
    <polygon points="18,72 38,52 58,62 82,30 82,82 18,82" style="fill:hsl(calc(var(--md-h,215) - 50.83) 85.71% 16.47%)" opacity="0.6"/>
    <!-- 绿色趋势实心折线 -->
    <polyline points="18,72 38,52 58,62 82,30" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- 趋势折点纯色实心圆 -->
    <circle cx="18" cy="72" r="5" style="fill:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)"/>
    <circle cx="38" cy="52" r="5" style="fill:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)"/>
    <circle cx="58" cy="62" r="5" style="fill:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)"/>
    <circle cx="82" cy="30" r="6" style="fill:hsl(calc(var(--md-h,215) - 56.89) 64.37% 51.57%)"/>
    <circle cx="82" cy="30" r="3" fill="#FFFFFF"/>
  </svg>`,shortcuts:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 7.22) 47.37% 11.18%)"/>
    <!-- 右下天蓝圆角菱形 -->
    <rect x="36" y="36" width="34" height="34" rx="10" style="fill:hsl(calc(var(--md-h,215) - 26.26) 94.5% 42.75%)" transform="rotate(45 53 53)"/>
    <!-- 左上洋红圆角菱形 -->
    <rect x="30" y="30" width="34" height="34" rx="10" style="fill:hsl(calc(var(--md-h,215) + 115.37) 81.19% 60.39%)" transform="rotate(45 47 47)"/>
    <!-- 中间交叠纯色圆 -->
    <circle cx="50" cy="50" r="7" fill="#FFFFFF"/>
  </svg>`,threes:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#1C1B1F"/>
    <!-- 左侧蓝色卡牌 1 -->
    <rect x="12" y="24" width="22" height="36" rx="6" style="fill:hsl(calc(var(--md-h,215) + 2.22) 91.22% 59.8%)"/>
    <text x="23" y="49" font-size="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" fill="#FFFFFF">1</text>
    <!-- 右侧红色卡牌 2 -->
    <rect x="66" y="24" width="22" height="36" rx="6" style="fill:hsl(calc(var(--md-h,215) - 215) 84.24% 60.2%)"/>
    <text x="77" y="49" font-size="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" fill="#FFFFFF">2</text>
    <!-- 中间主角卡牌 3 (白底纯净卡牌，清晰上下二段式结构：上方颜文字表情，下方数字3) -->
    <rect x="27" y="32" width="46" height="56" rx="10" fill="#FFFFFF"/>
    <rect x="27" y="32" width="46" height="56" rx="10" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 上方：颜文字表情 (Kaomoji) -->
    <circle cx="43" cy="46.5" r="2.2" style="fill:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)"/>
    <circle cx="57" cy="46.5" r="2.2" style="fill:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)"/>
    <circle cx="37.5" cy="49" r="1.5" style="fill:hsl(calc(var(--md-h,215) + 137.58) 95.7% 81.76%)" opacity="0.85"/>
    <circle cx="62.5" cy="49" r="1.5" style="fill:hsl(calc(var(--md-h,215) + 137.58) 95.7% 81.76%)" opacity="0.85"/>
    <path d="M 46.5 51 Q 50 54.5 53.5 51" fill="none" style="stroke:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)" stroke-width="2" stroke-linecap="round"/>
    <!-- 下方：数字 3 (明显分离，间距通透不拥挤) -->
    <text x="50" y="78" font-size="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" style="fill:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)">3</text>
  </svg>`,dice:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 48.33) 64.29% 10.98%)"/>
    <!-- 骰子主体外框 (金光六边形透视) -->
    <polygon points="50,18 80,35 80,68 50,85 20,68 20,35" style="fill:hsl(calc(var(--md-h,215) - 49.4) 53.19% 18.43%);stroke:hsl(calc(var(--md-h,215) - 169.14) 64.61% 52.35%)" stroke-width="3" stroke-linejoin="round"/>
    <!-- 顶部面 (浅翡翠) -->
    <polygon points="50,18 80,35 50,52 20,35" style="fill:hsl(calc(var(--md-h,215) - 48.55) 50.82% 23.92%);stroke:hsl(calc(var(--md-h,215) - 169.14) 64.61% 52.35%)" stroke-width="1.5"/>
    <circle cx="50" cy="35" r="4.5" style="fill:hsl(calc(var(--md-h,215) - 169.14) 64.61% 52.35%)"/>
    <!-- 左侧面 (中翡翠) -->
    <polygon points="20,35 50,52 50,85 20,68" style="fill:hsl(calc(var(--md-h,215) - 48.85) 53.42% 14.31%);stroke:hsl(calc(var(--md-h,215) - 169.14) 64.61% 52.35%)" stroke-width="1.5"/>
    <circle cx="31" cy="49" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 53) 33.33% 94.12%)"/>
    <circle cx="39" cy="69" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 53) 33.33% 94.12%)"/>
    <!-- 右侧面 (深翡翠) -->
    <polygon points="50,52 80,35 80,68 50,85" style="fill:hsl(calc(var(--md-h,215) - 48.55) 54.39% 11.18%);stroke:hsl(calc(var(--md-h,215) - 169.14) 64.61% 52.35%)" stroke-width="1.5"/>
    <circle cx="61" cy="69" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 204.67) 60.64% 48.82%)"/>
    <circle cx="69" cy="49" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 204.67) 60.64% 48.82%)"/>
    <circle cx="65" cy="59" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 204.67) 60.64% 48.82%)"/>
    <!-- 闪耀金星点缀 -->
    <circle cx="78" cy="22" r="3" style="fill:hsl(calc(var(--md-h,215) - 166.67) 75% 81.18%)"/>
  </svg>`,flow11:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 10.29) 15.6% 21.37%)"/>
    <!-- 纯色几何交叉流光圆环与色块 -->
    <circle cx="36" cy="40" r="24" style="fill:hsl(calc(var(--md-h,215) - 52.37) 16.52% 54.9%)"/>
    <circle cx="64" cy="60" r="22" style="fill:hsl(calc(var(--md-h,215) - 215) 53.37% 68.04%)"/>
    <circle cx="62" cy="36" r="15" style="fill:hsl(calc(var(--md-h,215) - 176.18) 76.58% 56.47%)"/>
    <circle cx="38" cy="64" r="14" style="fill:hsl(calc(var(--md-h,215) + 2.22) 91.22% 59.8%)"/>
    <!-- 中心纯白双立柱 11 符号与切角光斑 -->
    <rect x="38" y="28" width="8" height="44" rx="4" fill="#FFFFFF"/>
    <rect x="54" y="28" width="8" height="44" rx="4" fill="#FFFFFF"/>
    <circle cx="42" cy="22" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 164.56) 97.85% 63.53%)"/>
    <circle cx="58" cy="22" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 164.56) 97.85% 63.53%)"/>
  </svg>`,files:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 3.62) 92.55% 63.14%)"/>
    <!-- 内层深蓝文件夹背板（拉开层次） -->
    <path d="M 24 34 C 24 30 27 27 31 27 L 43 27 L 48 33 L 69 33 C 73 33 76 36 76 40 L 76 66 C 76 70 73 73 69 73 L 31 73 C 27 73 24 70 24 66 Z" style="fill:hsl(calc(var(--md-h,215) - 1.88) 74.76% 40.39%)"/>
    <!-- 纯白文件夹前板 -->
    <path d="M 24 44 C 24 40 27 37 31 37 L 45 37 L 51 44 L 69 44 C 73 44 76 47 76 51 L 76 66 C 76 70 73 73 69 73 L 31 73 C 27 73 24 70 24 66 Z" fill="#FFFFFF"/>
    <!-- 前板内淡蓝描边层次 -->
    <path d="M 31 41 L 44 41 L 50 48 L 69 48 C 71 48 72 49 72 51" style="stroke:hsl(calc(var(--md-h,215) - 5.91) 89.19% 85.49%)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </svg>`,recorder:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 143.09) 75.12% 59.02%)"/>
    <!-- 麦克风网罩 -->
    <rect x="41" y="22" width="18" height="32" rx="9" fill="#FFFFFF"/>
    <!-- 支架弧线 -->
    <path d="M 32 46 C 32 56 39 63 50 63 C 61 63 68 56 68 46" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- 麦克风杆 -->
    <rect x="47" y="62" width="6" height="10" rx="3" fill="#FFFFFF"/>
    <rect x="38" y="72" width="24" height="6" rx="3" fill="#FFFFFF"/>
    <!-- 录音指示点 -->
    <circle cx="72" cy="26" r="6" style="fill:hsl(calc(var(--md-h,215) - 164.56) 97.85% 63.53%)"/>
  </svg>`};he.messages=he.msg;he.calculator=he.calc;he.clock_app=he.clock;he.cal_app=he.calendar;he.photo=he.photos;function Tr(e){return!!he[e]}function Z(e){return he[e]?he[e]:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 0.29) 19.32% 34.51%)"/>
    <circle cx="50" cy="50" r="22" fill="#FFFFFF"/>
    <circle cx="50" cy="50" r="10" style="fill:hsl(calc(var(--md-h,215) - 16.37) 88.66% 48.43%)"/>
  </svg>`}const nd="ios-desktop:bg-mode";let xt="freeze";try{const e=localStorage.getItem(nd);(e==="live"||e==="freeze")&&(xt=e)}catch{}const ti=new Set,Va=new Set,Bi=new Map,gt=new Map;function Qf(e){let t=Bi.get(e);return t||(t={timeouts:null,intervals:null,frozen:!1},t.timeouts=new El(t,"to"),t.intervals=new El(t,"iv"),Bi.set(e,t)),t}class El extends Map{constructor(t,i){super(),this._reg=t,this._kind=i}set(t,i){super.set(t,i);try{if(Jf(this._reg,this._kind,t),this._kind==="to"&&i&&typeof i=="object"&&typeof i.expires!="number"){const n=Number(i.d);i.expires=Date.now()+(n>0?n:0)}}catch{}return this}}function Jf(e,t,i){gt.set(i,{reg:e,kind:t})}function ad(e){try{const t=typeof window<"u"?window:globalThis,i=t?t[e]:null;return typeof i=="function"?i.bind(t):null}catch{return null}}const _l=ad("clearTimeout"),Ml=ad("clearInterval");let Il=!1;function Zf(){if(Il)return;Il=!0;const e=window.clearTimeout.bind(window),t=window.clearInterval.bind(window);window.clearTimeout=function(i){const n=gt.get(i);return n&&(n.reg.timeouts.delete(i),gt.delete(i)),e(i)},window.clearInterval=function(i){const n=gt.get(i);return n&&(n.reg.intervals.delete(i),gt.delete(i)),t(i)}}function em(e){if(!e||!e.querySelectorAll)return!1;const t=[e];e.querySelectorAll("iframe").forEach(i=>{try{i.contentDocument&&t.push(i.contentDocument)}catch{}});for(const i of t){const n=i.querySelectorAll("audio,video");for(const a of n)if(!a.paused&&!a.ended)return!0}return!1}function tm(e){const t=document.getElementById(`app-instance-${e}`),i=Bi.get(e);t&&em(t)||(i&&!i.frozen&&(i.frozen=!0,i.timeouts.forEach((n,a)=>{try{_l&&_l(a)}catch{}}),i.intervals.forEach((n,a)=>{try{Ml&&Ml(a)}catch{}})),!(!t||t.dataset.frozen==="1")&&(t.dataset.frozen="1",t.classList.add("app-frozen"),t.querySelectorAll("iframe").forEach(n=>{try{n.contentWindow&&n.contentWindow.postMessage({type:"APP_FREEZE"},"*")}catch{}}),document.dispatchEvent(new CustomEvent("app-freeze",{detail:{appId:e}}))))}function Bo(e){const t=document.getElementById(`app-instance-${e}`),i=Bi.get(e);if(i&&i.frozen){i.frozen=!1;const n=window.setTimeout.bind(window),a=window.setInterval.bind(window),r=(o,l)=>{const c=Array.from(o.entries());o.clear(),c.forEach(([d,u])=>{if(gt.delete(d),l==="iv"){const f=a(u.fn,u.d,...u.args);o.set(f,u)}else{const f=typeof u.expires=="number"?u.expires:null,m=f!=null?f-Date.now():null;if(f!=null&&m<=0){try{u.fn.apply(null,u.args)}catch{}return}const h=n(function(){return o.delete(h),gt.delete(h),u.fn.apply(null,u.args)},m??u.d,...u.args);o.set(h,u)}})};r(i.timeouts,"to"),r(i.intervals,"iv")}!t||t.dataset.frozen!=="1"||(t.dataset.frozen="0",t.classList.remove("app-frozen"),t.querySelectorAll("iframe").forEach(n=>{try{n.contentWindow&&n.contentWindow.postMessage({type:"APP_RESUME"},"*")}catch{}}),document.dispatchEvent(new CustomEvent("app-resume",{detail:{appId:e}})))}function Cr(){xt==="freeze"&&document.querySelectorAll('.app-instance-wrapper[id^="app-instance-"]').forEach(e=>{const t=e.id.replace("app-instance-","");ti.has(t)||Va.has(t)?Bo(t):tm(t)})}function Fo(){document.querySelectorAll('.app-instance-wrapper[id^="app-instance-"]').forEach(e=>{Bo(e.id.replace("app-instance-",""))})}let un=!1,xn=[];function rd(e){xn=(e||[]).filter(Boolean),!un&&(ti.clear(),xn.forEach(t=>{ti.add(t)}),xn=[],xt==="freeze"?Cr():Fo())}function Po(e){un!==!!e&&(un=!!e,un||(ti.clear(),xn.forEach(t=>{ti.add(t)}),xn=[]),xt==="freeze"?Cr():un||Fo())}function sd(e){const t=Bi.get(e);t&&(t.timeouts.forEach((i,n)=>gt.delete(n)),t.intervals.forEach((i,n)=>gt.delete(n))),Bi.delete(e),ti.delete(e),Va.delete(e)}function im(){return xt}function nm(){return xt==="freeze"}function am(){return xt==="freeze"?"智能冻结":"全部实时"}function rm(e){if(!(e!=="freeze"&&e!=="live")){xt=e;try{localStorage.setItem(nd,e)}catch{}e==="freeze"?Cr():Fo(),document.dispatchEvent(new CustomEvent("bg-mode-changed",{detail:{mode:e}}))}}typeof window<"u"&&(window.addEventListener("message",e=>{const t=e.data;if(!t||t.type!=="APP_MEDIA_STATE"||typeof t.active!="boolean")return;let i=null;document.querySelectorAll('.app-instance-wrapper[id^="app-instance-"] iframe').forEach(n=>{if(!i)try{n.contentWindow===e.source&&(i=n.closest(".app-instance-wrapper").id.replace("app-instance-",""))}catch{}}),i&&(t.active?Va.add(i):Va.delete(i),xt==="freeze"&&(t.active?Bo(i):Cr()))}),window.__bgFreeze={mode:im,modeName:am,isFreezeMode:nm,setMode:e=>{rm(e)},liveCount:()=>ti.size,frozenCount:()=>document.querySelectorAll('.app-instance-wrapper[data-frozen="1"]').length});const Ne=new Map;function La(e){const t=Ne.get(e);if(!t)return!1;const i=t.querySelectorAll("iframe");for(const n of i)if(!n.dataset||n.dataset.loaded!=="1")return!1;return!0}function Fi(){if(!s.currentApp){Ne.forEach(r=>{r.__actorHosted||(r.style.display="none")});return}const e=s.currentApp.id;Ne.forEach((r,o)=>{o!==e&&!r.__actorHosted&&(r.style.display="none")});let t=Ne.get(e);t||(t=document.createElement("div"),t.className="app-instance-wrapper",t.id=`app-instance-${e}`,t.style.width="100%",t.style.height="100%",t.style.position="absolute",t.style.inset="0",s.currentApp.pages.forEach((o,l)=>{const c=document.createElement("div");c.className="app-page",c.id=`app-page-${e}-${l}`,c.innerHTML=o.content,t.appendChild(c)}),sm(t,e),p.pageStack.appendChild(t),Ne.set(e,t),t.querySelectorAll("iframe").forEach(o=>{window.__syncIframeApp&&window.__syncIframeApp(o)})),t.style.display="block";const i=t.querySelectorAll(".app-page"),n=s.navHistory[s.navHistory.length-1],a=s.navHistory.length>1?s.navHistory[s.navHistory.length-2]:-1;i.forEach((r,o)=>{o===n?(r.style.transform="translate3d(0, 0, 0) scale(1)",r.style.opacity="1",r.style.filter="",r.style.borderRadius="0",r.style.boxShadow="",r.style.zIndex="2",r.style.pointerEvents="auto"):o===a?(r.style.transform="translate3d(0, 0, 0) scale(1)",r.style.opacity="1",r.style.filter="brightness(0.65)",r.style.borderRadius="0",r.style.boxShadow="",r.style.zIndex="1",r.style.pointerEvents="none"):(r.style.transform="translate3d(100%, 0, 0)",r.style.opacity="0",r.style.filter="",r.style.borderRadius="0",r.style.boxShadow="",r.style.zIndex="3",r.style.pointerEvents="none")}),s.navHistory.length>1&&s.currentApp.pages[n]?(p.backBtn.style.display="flex",p.appTitle.textContent=s.currentApp.pages[n].title):(p.backBtn.style.display="none",p.appTitle.textContent=s.currentApp.name),i[n]&&document.dispatchEvent(new CustomEvent("app-page-active",{detail:{appId:e,pageIdx:n}}));try{rd([e])}catch{}}function sm(e,t){Zf();const i=Qf(t),n=window.setTimeout,a=window.setInterval,r=window.requestAnimationFrame;window.setTimeout=function(o,l,...c){if(typeof o!="function")return n(o,l,...c);const d=n(o,l,...c);return i.timeouts.set(d,{fn:o,d:l,args:c}),d},window.setInterval=function(o,l,...c){if(typeof o!="function")return a(o,l,...c);const d=a(o,l,...c);return i.intervals.set(d,{fn:o,d:l,args:c}),d},window.requestAnimationFrame=function(o){return r.call(window,l=>{if(!i.frozen)return o(l)})};try{om(e)}finally{window.setTimeout=n,window.setInterval=a,window.requestAnimationFrame=r}}function om(e){e.querySelectorAll("script").forEach(t=>{const i=document.createElement("script");i.textContent=t.textContent,t.type&&(i.type=t.type),t.parentNode.replaceChild(i,t)})}function lm(e=0){const t=s.navHistory.length-e;if(t>1&&s.currentApp){const i=s.navHistory[t-1];p.backBtn.style.display="flex",p.appTitle.textContent=s.currentApp.pages[i]?s.currentApp.pages[i].title:s.currentApp.name}else p.backBtn.style.display="none",s.currentApp&&(p.appTitle.textContent=s.currentApp.name)}const cm=220,Wa=new Map,Ga=new Map;function od(e,t={}){if(t.onlyIfNoInstance&&Ne.has(e))return;const i=Wa.get(e);i&&(Wa.delete(e),i.forEach(({type:a,fn:r,opts:o})=>{try{document.removeEventListener(a,r,o)}catch{}}));const n=Ga.get(e);n&&(Ga.delete(e),n.forEach(a=>{try{a()}catch{}}))}typeof window<"u"&&(window.__bindAppDocListener=function(e,t,i,n){typeof i!="function"&&typeof n=="function"&&(t=i,i=n,n=void 0),document.addEventListener(t,i,n);let a=Wa.get(e);a||(a=[],Wa.set(e,a)),a.push({type:t,fn:i,opts:n})},window.__addAppCleanup=function(e,t){if(typeof t!="function")return;let i=Ga.get(e);i||(i=[],Ga.set(e,i)),i.push(t)});function ld(e){!e||!e.querySelectorAll||e.querySelectorAll("iframe").forEach(t=>{try{t.contentWindow&&t.contentWindow.postMessage({type:"APP_CLOSE"},"*")}catch{}})}function cd(e){e.style.display="none",e.removeAttribute("id"),setTimeout(()=>{e&&e.parentNode&&e.parentNode.removeChild(e)},cm)}function Xa(e){if(Ne.has(e)){const t=Ne.get(e);Ne.delete(e);try{sd(e)}catch{}ld(t),cd(t)}od(e),document.dispatchEvent(new CustomEvent("app-instance-destroyed",{detail:{appId:e}}))}function dm(){const e=Array.from(Ne.entries());Ne.clear(),e.forEach(([t,i])=>{try{sd(t)}catch{}ld(i),cd(i),od(t)}),e.forEach(([t])=>{document.dispatchEvent(new CustomEvent("app-instance-destroyed",{detail:{appId:t}}))})}function Ps(e){if(!s.currentApp||e>=s.currentApp.pages.length)return;if(s.navHistory[s.navHistory.length-1]===e){s.popInProgress=!1,s.subpageSpring.target!==1&&(s.subpageSpring.setTarget(1),Be());return}const t=Xn(ht(.26,1,1));s.subpageSpring.reconfigure(t),s.popInProgress?(s.popInProgress=!1,s.navHistory.push(e),Fi(),s.subpageSpring.setTarget(1)):(s.navHistory.push(e),Fi(),s.subpageSpring.x=0,s.subpageSpring.v=0,s.subpageSpring.setTarget(1,0)),Lr(!0),Be()}function On(e=0){if(s.currentApp)if(s.navHistory.length>1){if(s.popInProgress)return;s.popInProgress=!0;const t=Xn(ht(.24,1,1));s.subpageSpring.reconfigure(t),s.subpageSpring.setTarget(0,e),lm(1),Be()}else wt(0,0,0)}function st(){p.desktopSlider.innerHTML="",p.pageDots.innerHTML="",s.pagesApps.forEach((e,t)=>{const i=document.createElement("div");i.className="page-grid",i.dataset.page=t,e.forEach((a,r)=>{if($i(a)){const f=md(a,t,r);s.isEditMode&&f.classList.add("jiggling"),i.appendChild(f);return}const o=document.createElement("div");o.className="app-icon"+(s.isEditMode?" jiggling":""),o.dataset.page=t,o.dataset.index=r,o.dataset.id=a.id,o.dataset.slot=a.slot??0,o.setAttribute("role","button"),o.setAttribute("tabindex","0"),o.setAttribute("aria-label",`${a.name}应用`);const l=ei(),c=Math.floor((a.slot??0)/l)+1,d=(a.slot??0)%l+1;o.style.gridArea=`${c} / ${d}`;const u=a.type?Ee(a.type,!1):Z(a.id);o.innerHTML=`
        <div class="icon-box">
          ${u}
        </div>
        <span>${a.name}</span>
        <div class="remove-badge" data-id="${a.id}" data-page="${t}">×</div>
      `,dd(o,a),o.addEventListener("keydown",f=>{(f.key==="Enter"||f.key===" ")&&(f.preventDefault(),!s.isEditMode&&!s.isOpen&&um(t,r,o))}),i.appendChild(o)}),p.desktopSlider.appendChild(i);const n=document.createElement("div");n.className="dot"+(t===s.currentPage?" active":""),p.pageDots.appendChild(n)}),p.pageDots.setAttribute("aria-hidden","true"),Xe(s.currentPage,!1)}function Xe(e,t=!0){s.currentPage=I(e,0,s.pagesApps.length-1),t||(p.desktopSlider.style.transition="none",requestAnimationFrame(()=>requestAnimationFrame(()=>{p.desktopSlider.style.transition=""}))),p.desktopSlider.style.transform=`translate3d(${-s.currentPage*100}vw, 0, 0)`,Array.from(p.pageDots.children).forEach((i,n)=>{i.classList.toggle("active",n===s.currentPage)})}const q={active:!1,basePageF:0,pageF:0,startX:0,lastX:0,lastT:0,velX:0,winW:0,seeded:!1};function pm(){const e=getComputedStyle(p.desktopSlider).transform;if(!e||e==="none")return 0;const t=e.match(/matrix(?:3d)?\(([^)]+)\)/);if(!t)return 0;const i=t[1].split(",").map(parseFloat);return i.length>=16?i[12]:i.length>=6?i[4]:0}function ja(e){const t=window.innerWidth||1,i=pm();q.active=!0,q.winW=t,q.basePageF=-i/t,q.pageF=q.basePageF,q.startX=e,q.lastX=e,q.lastT=performance.now(),q.velX=0,q.seeded=!1,p.desktopSlider.style.transition="none"}function Pi(e){if(!q.active)return;const t=performance.now(),i=Math.max(1,t-q.lastT);if(q.seeded){const r=(e-q.lastX)/i;q.velX=q.velX*.65+r*.35}q.seeded=!0,q.lastX=e,q.lastT=t;const n=Math.max(0,s.pagesApps.length-1);let a=q.basePageF-(e-q.startX)/q.winW;a<0?a*=.35:a>n&&(a=n+(a-n)*.35),q.pageF=a,p.desktopSlider.style.transform=`translate3d(${(-a*q.winW).toFixed(1)}px, 0, 0)`}function vi(){if(!q.active)return;q.active=!1;const e=q.winW,t=Math.max(0,s.pagesApps.length-1),i=q.pageF-q.velX*140/e,n=Math.round(I(i,0,t));s.currentPage=I(n,0,t),p.desktopSlider.style.transition="",Xe(s.currentPage,!0)}function as(){for(let e=s.pagesApps.length-1;e>0&&s.pagesApps[e].length===0;e--)s.pagesApps.splice(e,1);s.currentPage>=s.pagesApps.length&&(s.currentPage=s.pagesApps.length-1),st()}function um(e,t,i){const n=s.pagesApps[e][t];if(!n)return;const a=F.findIndex(r=>r.id===n.id);a!==-1&&H(a,i)}function fm(){let e=ei(),t=null;const i=()=>{t=null;const n=ei();n!==e&&(e=n,st())};window.addEventListener("resize",()=>{t&&clearTimeout(t),t=setTimeout(i,220)},{passive:!0})}const Tl=500;function zs(e){const t=ei(),i=24/t,n=e.getBoundingClientRect();return{cols:t,rows:i,cellW:n.width/t,cellH:n.height/i}}let ve=null,bn=null,Aa=null;function zo(){s.isEditMode=!0,document.querySelectorAll(".app-icon, .app-folder").forEach(e=>{e.classList.add("jiggling")}),navigator.vibrate&&navigator.vibrate(40)}function mm(){s.isEditMode=!1,s.iconDragState=null,document.querySelectorAll(".app-icon, .app-folder").forEach(e=>{e.classList.remove("jiggling")}),st()}function dd(e,t){let i=0,n=0,a=!1,r=!1;const o=e.querySelector(".remove-badge");o&&(o.addEventListener("click",h=>{h.stopPropagation(),h.preventDefault();const v=parseInt(o.dataset.page,10);fd(v,t.id)}),o.addEventListener("pointerdown",h=>{h.stopPropagation()}));let l=0;const c=()=>{const h=performance.now();if(h-l<300)return;l=h;const v=F.findIndex(y=>y.id===t.id);v!==-1&&H(v,e)};e.addEventListener("click",h=>{s.iconDragState||a||$i(t)||s.isEditMode||(h.stopPropagation(),c())});let d=0;const u=h=>{s.isOpen&&!s.isClosing||s.iconDragState||h.target.closest(".remove-badge")||(i=h.clientX,n=h.clientY,d=performance.now(),a=!1,r=!1,s.isEditMode||(e.style.transform="scale(0.92)",e.style.transition="transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)"),s.isEditMode?s.longPressTimer=setTimeout(()=>{s.iconDragState||(r=!0,rs(e,t,i,n))},60):s.longPressTimer=setTimeout(()=>{!a&&!s.iconDragState&&(zo(),r=!0,rs(e,t,i,n))},380))},f=h=>{const v=Math.hypot(h.clientX-i,h.clientY-n);s.isEditMode?v>4&&!r&&!s.iconDragState&&(s.longPressTimer&&(clearTimeout(s.longPressTimer),s.longPressTimer=null),r=!0,rs(e,t,h.clientX,h.clientY)):v>8&&(a=!0,!r&&s.longPressTimer&&(clearTimeout(s.longPressTimer),s.longPressTimer=null),e.style.transform&&(e.style.transform=""))},m=h=>{const v=performance.now()-d;s.longPressTimer&&(clearTimeout(s.longPressTimer),s.longPressTimer=null),!s.isEditMode&&e.style.transform&&(e.style.transform=""),!s.isEditMode&&!a&&!r&&!s.iconDragState&&!$i(t)&&v<350&&(s.isClosing||s.isOpen&&s.scaleSpring.x<.96)&&c()};e.addEventListener("pointerdown",u),e.addEventListener("pointermove",f),e.addEventListener("pointerup",m),e.addEventListener("pointercancel",m),e.addEventListener("contextmenu",h=>{h.preventDefault(),h.stopPropagation(),s.isEditMode||ce(()=>Promise.resolve().then(()=>g0),void 0,import.meta.url).then(v=>v.showContextMenu(t,e,h.clientX,h.clientY))})}function hm(e,t,i){let n=0,a=0,r=!1,o=!1,l=0;const c=()=>{const h=performance.now();if(h-l<300)return;l=h;const v=F.findIndex(y=>y.id===t.id);v!==-1&&H(v,e)};e.addEventListener("click",h=>{s.iconDragState||r||s.isEditMode||(h.stopPropagation(),c())});let d=0;const u=h=>{s.isOpen&&!s.isClosing||s.iconDragState||(n=h.clientX,a=h.clientY,d=performance.now(),r=!1,o=!1,s.isEditMode||(e.style.transform="scale(0.92)",e.style.transition="transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)"),s.isEditMode?s.longPressTimer=setTimeout(()=>{s.iconDragState||(o=!0,ss(e,t,i,n,a))},60):s.longPressTimer=setTimeout(()=>{!r&&!s.iconDragState&&(zo(),o=!0,ss(e,t,i,n,a))},380))},f=h=>{const v=Math.hypot(h.clientX-n,h.clientY-a);s.isEditMode?v>4&&!o&&!s.iconDragState&&(s.longPressTimer&&(clearTimeout(s.longPressTimer),s.longPressTimer=null),o=!0,ss(e,t,i,h.clientX,h.clientY)):v>8&&(r=!0,!o&&s.longPressTimer&&(clearTimeout(s.longPressTimer),s.longPressTimer=null),e.style.transform&&(e.style.transform=""))},m=()=>{const h=performance.now()-d;s.longPressTimer&&(clearTimeout(s.longPressTimer),s.longPressTimer=null),!s.isEditMode&&e.style.transform&&(e.style.transform=""),!s.isEditMode&&!r&&!o&&!s.iconDragState&&h<350&&(s.isClosing||s.isOpen&&s.scaleSpring.x<.96)&&c()};e.addEventListener("pointerdown",u),e.addEventListener("pointermove",f),e.addEventListener("pointerup",m),e.addEventListener("pointercancel",m)}function rs(e,t,i,n){const a=e.getBoundingClientRect();if(a.width===0||a.height===0)return;const r=parseInt(e.dataset.page,10)||0,o=parseInt(e.dataset.slot,10)||0,l=e.cloneNode(!0);l.classList.add("dragging-active");const c=l.querySelector(".remove-badge");c&&c.remove(),l.style.width=`${a.width}px`,l.style.height=`${a.height}px`,l.style.left="0px",l.style.top="0px",l.style.transform=`translate3d(${a.left}px, ${a.top}px, 0) scale(1.15)`,document.body.appendChild(l),e.classList.add("placeholder"),s.iconDragState={mode:"desktop",source:"desktop",originalPage:r,originalSlot:o,targetPage:r,targetSlot:o,app:t,element:l,placeholderEl:e,offsetX:i-a.left,offsetY:n-a.top,lastX:i,lastY:n,prevMoveX:i,prevMoveY:n,smoothVx:0,smoothVy:0,isAddToFolder:!1,targetFolder:null,isCreateFolder:!1,targetApp:null},window.addEventListener("pointermove",$o,{passive:!1}),window.addEventListener("pointerup",zi),window.addEventListener("pointercancel",zi)}function ss(e,t,i,n,a){const r=e.getBoundingClientRect();if(r.width===0||r.height===0)return;const o=parseInt(e.dataset.folderIdx,10)||0,l=e.cloneNode(!0);l.classList.add("dragging-active"),l.style.width=`${r.width}px`,l.style.height=`${r.height}px`,l.style.left="0px",l.style.top="0px",l.style.transform=`translate3d(${r.left}px, ${r.top}px, 0) scale(1.15)`,document.body.appendChild(l),e.classList.add("placeholder"),s.iconDragState={mode:"folder",source:"folder",folder:i,folderIdx:o,targetFolderIdx:o,originalPage:s.currentPage,targetPage:s.currentPage,targetSlot:i.slot??0,app:t,element:l,placeholderEl:e,offsetX:n-r.left,offsetY:a-r.top,lastX:n,lastY:a,prevMoveX:n,prevMoveY:a,smoothVx:0,smoothVy:0,isAddToFolder:!1,targetFolder:null,isCreateFolder:!1,targetApp:null},window.addEventListener("pointermove",$o,{passive:!1}),window.addEventListener("pointerup",zi),window.addEventListener("pointercancel",zi)}let yi=0;function gm(){yi||(yi=requestAnimationFrame(()=>{yi=0;const e=s.iconDragState;e&&e.pendingCheckX!=null&&e.pendingCheckY!=null&&pd(e.pendingCheckX,e.pendingCheckY,e)}))}function vm(){yi&&(cancelAnimationFrame(yi),yi=0);const e=s.iconDragState;e&&e.pendingCheckX!=null&&e.pendingCheckY!=null&&pd(e.pendingCheckX,e.pendingCheckY,e)}function $o(e){if(!s.iconDragState)return;e.cancelable&&e.preventDefault();const t=e.clientX,i=e.clientY,n=s.iconDragState,a=t-n.prevMoveX,r=i-n.prevMoveY;n.prevMoveX=t,n.prevMoveY=i,n.smoothVx=n.smoothVx*.6+a*.4,n.smoothVy=n.smoothVy*.6+r*.4;const o=I(n.smoothVx*.4,-14,14),l=I(-n.smoothVy*.35,-12,12),c=I(n.smoothVx*.35,-12,12);n.lastX=t,n.lastY=i;const d=t-n.offsetX,u=i-n.offsetY;n.element.style.transform=`translate3d(${d.toFixed(1)}px, ${u.toFixed(1)}px, 0) scale(1.15) rotateZ(${o.toFixed(1)}deg) rotateX(${l.toFixed(1)}deg) rotateY(${c.toFixed(1)}deg)`,n.pendingCheckX=t,n.pendingCheckY=i,gm()}function pd(e,t,i){if(i.mode==="folder"){const a=p.folderOverlay.querySelector(".folder-panel");if(a){const r=a.getBoundingClientRect(),o=12;if(e<r.left-o||e>r.right+o||t<r.top-o||t>r.bottom+o){navigator.vibrate&&navigator.vibrate(30),i.mode="desktop",ud(),vd();const c=p.desktopSlider.children[s.currentPage];if(c){const d=c.getBoundingClientRect(),u=zs(c),f=I(Math.floor((e-d.left)/u.cellW),0,u.cols-1),m=I(Math.floor((t-d.top)/u.cellH),0,u.rows-1);i.targetSlot=I(m*u.cols+f,0,23),Os(c,i.targetSlot),$s(c,i)}return}ym(e,t,i);return}}const n=p.desktopSlider.children[s.currentPage];if(n){const a=n.getBoundingClientRect(),r=zs(n),o=I(Math.floor((e-a.left)/r.cellW),0,r.cols-1),l=I(Math.floor((t-a.top)/r.cellH),0,r.rows-1),c=I(l*r.cols+o,0,23),d=i.targetSlot,u=i.targetPage;i.targetPage=s.currentPage,i.targetSlot=c,(d!==c||u!==s.currentPage)&&(Os(n,c),$s(n,i))}bm(e,t)}function ym(e,t,i){const n=p.folderGrid;if(!n||!i.folder||!i.folder.apps)return;const a=Array.from(n.querySelectorAll(".app-icon"));if(a.length===0)return;let r=0,o=1/0;a.forEach((c,d)=>{const u=c.getBoundingClientRect(),f=u.left+u.width/2,m=u.top+u.height/2,h=Math.hypot(e-f,t-m);h<o&&(o=h,r=d)});const l=I(r,0,i.folder.apps.length-1);i.targetFolderIdx!==l&&(i.targetFolderIdx=l,wm(n,i.folderIdx,l))}function wm(e,t,i){const n=Array.from(e.querySelectorAll(".app-icon"));n.length!==0&&n.forEach(a=>{if(a.classList.contains("placeholder"))return;const r=parseInt(a.dataset.folderIdx,10);let o=r;t<i?r>t&&r<=i&&(o=r-1):t>i&&r>=i&&r<t&&(o=r+1);const l=n[r],c=n[o];if(l&&c&&r!==o){const d=c.offsetLeft-l.offsetLeft,u=c.offsetTop-l.offsetTop;a.style.transform=`translate3d(${d.toFixed(1)}px, ${u.toFixed(1)}px, 0)`}else a.style.transform=""})}function ud(){p.folderGrid&&p.folderGrid.querySelectorAll(".app-icon").forEach(e=>{e.style.transform=""})}function $s(e,t){Do(),t.isAddToFolder=!1,t.targetFolder=null,t.isCreateFolder=!1,t.targetApp=null;const n=(s.pagesApps[t.targetPage]||[]).find(a=>a.slot===t.targetSlot&&a.id!==t.app.id);n&&!$i(t.app)&&($i(n)?bn=setTimeout(()=>{s.iconDragState&&s.iconDragState.targetSlot===t.targetSlot&&s.iconDragState.targetPage===t.targetPage&&(t.isAddToFolder=!0,t.targetFolder=n,Cl(e,n.id))},Tl):bn=setTimeout(()=>{s.iconDragState&&s.iconDragState.targetSlot===t.targetSlot&&s.iconDragState.targetPage===t.targetPage&&(t.isCreateFolder=!0,t.targetApp=n,Cl(e,n.id))},Tl)),xm(e,t)}function xm(e,t){const i=ei(),n=e.clientWidth/i,a=e.clientHeight/(24/i),r=t.source==="desktop"&&t.originalPage===t.targetPage;for(const o of e.children){if(!o.dataset||!o.dataset.id||o.classList.contains("placeholder")||o===ve||o.dataset.id===t.app.id)continue;const c=parseInt(o.dataset.slot,10);let d=c;if(t.isAddToFolder||t.isCreateFolder){o.style.transform="";continue}if(r){const E=t.originalSlot,b=t.targetSlot;E<b?c>E&&c<=b&&(d=c-1):E>b&&c>=b&&c<E&&(d=c+1)}else c>=t.targetSlot&&(d=c+1);const u=ei(),f=c%u,m=Math.floor(c/u),h=d%u,v=Math.floor(d/u),y=(h-f)*n,x=(v-m)*a;y!==0||x!==0?o.style.transform=`translate3d(${y.toFixed(1)}px, ${x.toFixed(1)}px, 0)`:o.style.transform=""}}function Ds(){const e=p.desktopSlider.children[s.currentPage];if(e)for(const t of e.children)t.style&&(t.style.transform="")}function Cl(e,t){Do();for(const i of e.children)if(i.dataset&&i.dataset.id===t){i.classList.add("folder-candidate"),Aa=i,navigator.vibrate&&navigator.vibrate(25);break}}function Do(){bn&&(clearTimeout(bn),bn=null),Aa&&(Aa.classList.remove("folder-candidate"),Aa=null)}function Os(e,t){ve||(ve=document.createElement("div"),ve.className="drop-indicator"),ve.parentNode!==e&&(ve.parentNode&&ve.parentNode.removeChild(ve),e.appendChild(ve));const i=ei(),n=Math.floor(t/i)+1,a=t%i+1;ve.style.gridArea=`${n} / ${a}`}function Rs(){ve&&ve.parentNode&&ve.parentNode.removeChild(ve)}function bm(e,t){const n=window.innerWidth;e<48&&s.currentPage>0?(p.edgeLeft.classList.add("active"),s.edgePagingTimer||(s.edgePagingTimer=setTimeout(()=>{Ds(),Rs(),Xe(s.currentPage-1),s.edgePagingTimer=null,Ll(e,t)},300))):e>n-48?(p.edgeRight.classList.add("active"),s.edgePagingTimer||(s.edgePagingTimer=setTimeout(()=>{Ds(),Rs(),s.currentPage===s.pagesApps.length-1&&s.pagesApps.push([]),Xe(s.currentPage+1),s.edgePagingTimer=null,Ll(e,t)},300))):(p.edgeLeft.classList.remove("active"),p.edgeRight.classList.remove("active"),s.edgePagingTimer&&(clearTimeout(s.edgePagingTimer),s.edgePagingTimer=null))}function Ll(e,t){if(!s.iconDragState)return;p.edgeLeft.classList.remove("active"),p.edgeRight.classList.remove("active"),s.iconDragState.targetPage=s.currentPage;const i=p.desktopSlider.children[s.currentPage];if(i){const n=i.getBoundingClientRect(),a=zs(i),r=I(Math.floor((e-n.left)/a.cellW),0,a.cols-1),o=I(Math.floor((t-n.top)/a.cellH),0,a.rows-1);s.iconDragState.targetSlot=I(o*a.cols+r,0,23),Os(i,s.iconDragState.targetSlot),$s(i,s.iconDragState)}}function Sm(){const e=s.iconDragState;if(e.mode==="folder"){const{folder:f,folderIdx:m,targetFolderIdx:h}=e;if(m!==h){const v=f.apps.splice(m,1)[0];f.apps.splice(h,0,v),f.apps.forEach((y,x)=>y.slot=x),Ae()}return}if(e.source==="folder"&&e.mode==="desktop"){const{folder:f,app:m,targetPage:h,targetSlot:v,isAddToFolder:y,targetFolder:x,isCreateFolder:E,targetApp:b}=e,k=f.apps.findIndex(M=>M.id===m.id);if(k!==-1&&f.apps.splice(k,1),f.apps.forEach((M,L)=>M.slot=L),y&&x)m.slot=x.apps.length,x.apps.push(m);else if(E&&b){const M=s.pagesApps[h],L=M.findIndex(P=>P.id===b.id);if(L!==-1){const P=Hs(v);P.apps.push({...b,slot:0}),P.apps.push({...m,slot:1}),M.splice(L,1),M.push(P)}}else{const M=s.pagesApps[h];if(M.findIndex(P=>P.slot===v)!==-1)for(const P of M)P.slot>=v&&(P.slot+=1);m.slot=v,M.push(m)}Ro(f),Ae();return}const{originalPage:t,originalSlot:i,targetPage:n,targetSlot:a,app:r,isAddToFolder:o,targetFolder:l,isCreateFolder:c,targetApp:d}=e,u=s.pagesApps[t].findIndex(f=>f.id===r.id);if(u!==-1){if(o&&l){s.pagesApps[t].splice(u,1),r.slot=l.apps.length,l.apps.push(r),Ae();return}if(c&&d){const f=s.pagesApps[n],m=f.findIndex(h=>h.id===d.id);if(m!==-1){const h=Hs(a);h.apps.push({...d,slot:0}),h.apps.push({...r,slot:1}),f.splice(m,1);const v=s.pagesApps[t].findIndex(y=>y.id===r.id);v!==-1&&s.pagesApps[t].splice(v,1),f.push(h),Ae();return}}if(!(t===n&&i===a)){if(t===n){const f=s.pagesApps[n];if(f.findIndex(h=>h.slot===a&&h.id!==r.id)!==-1)if(i<a)for(const h of f)h.id!==r.id&&h.slot>i&&h.slot<=a&&(h.slot-=1);else for(const h of f)h.id!==r.id&&h.slot>=a&&h.slot<i&&(h.slot+=1);r.slot=a}else{const f=s.pagesApps[n];if(f.findIndex(h=>h.slot===a)!==-1)for(const h of f)h.slot>=a&&(h.slot+=1);s.pagesApps[t].splice(u,1),r.slot=a,f.push(r)}Ae()}}}function zi(){if(!s.iconDragState)return;vm(),s.edgePagingTimer&&(clearTimeout(s.edgePagingTimer),s.edgePagingTimer=null);const e=s.iconDragState,t=e.element,i=e.isAddToFolder,n=e.isCreateFolder,a=e.targetFolder?e.targetFolder.id:null,r=e.mode==="folder";if(Do(),Ds(),ud(),p.edgeLeft.classList.remove("active"),p.edgeRight.classList.remove("active"),window.removeEventListener("pointermove",$o),window.removeEventListener("pointerup",zi),window.removeEventListener("pointercancel",zi),Sm(),Rs(),r){Oo(e.folder);const c=p.folderGrid.children[e.targetFolderIdx];if(c){const d=c.getBoundingClientRect();t.style.transition="transform 0.24s cubic-bezier(0.2, 0.95, 0.25, 1.05)",t.style.transform=`translate3d(${d.left.toFixed(1)}px, ${d.top.toFixed(1)}px, 0) scale(1)`,setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t),s.iconDragState=null},240);return}t.parentNode&&t.parentNode.removeChild(t),s.iconDragState=null;return}if(st(),i||n){const c=a?document.querySelector(`[data-id="${a}"]`):document.querySelector(`[data-slot="${e.targetSlot}"]`);if(c){const d=c.getBoundingClientRect();t.style.transition="transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease",t.style.transform=`translate3d(${d.left.toFixed(1)}px, ${d.top.toFixed(1)}px, 0) scale(0.3)`,t.style.opacity="0"}else t.style.transition="opacity 0.2s ease",t.style.opacity="0";setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t),as(),s.iconDragState=null},240);return}const o=p.desktopSlider.children[e.targetPage];let l=null;if(o){for(const c of o.children)if(c.dataset&&c.dataset.id===e.app.id){l=c;break}}if(l){const c=l.getBoundingClientRect();l.style.visibility="hidden",t.style.transition="transform 0.26s cubic-bezier(0.2, 0.95, 0.25, 1.05)",t.style.transform=`translate3d(${c.left.toFixed(1)}px, ${c.top.toFixed(1)}px, 0) scale(1) rotate(0deg)`,setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t),l.style.visibility="",l.classList.add("landing-settle"),navigator.vibrate&&navigator.vibrate(15),setTimeout(()=>l.classList.remove("landing-settle"),300),as(),s.iconDragState=null},260)}else t.parentNode&&t.parentNode.removeChild(t),as(),s.iconDragState=null}function fd(e,t){const i=s.pagesApps[e];if(!i)return;const n=i.findIndex(r=>r.id===t);if(n===-1)return;const a=i.splice(n,1)[0];s.removedApps||(s.removedApps=[]),s.removedApps.push(a);try{localStorage.setItem("ios-desktop:removed-apps",JSON.stringify(s.removedApps))}catch{}Ae(),st()}function km(e){if(!s.removedApps)return;const t=s.removedApps.findIndex(o=>o.id===e);if(t===-1)return;const i=s.removedApps.splice(t,1)[0];let n=s.pagesApps[s.pagesApps.length-1];const a=new Set(n.map(o=>o.slot??0));let r=0;for(;r<24&&a.has(r);)r++;r>=24&&(n=[],s.pagesApps.push(n),r=0),i.slot=r,n.push(i);try{localStorage.setItem("ios-desktop:removed-apps",JSON.stringify(s.removedApps))}catch{}Ae(),st()}let Al=0,ye=null,Mt=null,It=null;function Hs(e){return Al++,{id:`folder_${Date.now()}_${Al}`,name:"文件夹",type:"folder",apps:[],slot:e}}function $i(e){return e&&e.type==="folder"}function md(e,t,i){const n=document.createElement("div");n.className="app-folder"+(s.isEditMode?" jiggling":""),n.dataset.page=t,n.dataset.index=i,n.dataset.id=e.id,n.dataset.slot=e.slot??0;const a=Math.floor((e.slot??0)/4)+1,r=(e.slot??0)%4+1;n.style.gridArea=`${a} / ${r}`;const o=e.apps.slice(0,9);let l="";for(let c=0;c<9;c++)if(c<o.length){const d=o[c];d.type==="clock"?l+=`<div class="folder-thumb">${Ee("clock",!1)}</div>`:d.type==="calendar"?l+=`<div class="folder-thumb">${Ee("calendar",!1)}</div>`:l+=`<div class="folder-thumb">${Z(d.id)}</div>`}else l+='<div class="folder-thumb empty"></div>';return n.innerHTML=`
    <div class="folder-icon">${l}</div>
    <span>${e.name}</span>
  `,n.addEventListener("click",c=>{s.iconDragState||s.isDragging||(c.stopPropagation(),Oo(e,n))}),dd(n,e),n}function hd(e){p.folderGrid.innerHTML="",e.apps.forEach((t,i)=>{const n=document.createElement("div");n.className="app-icon"+(s.isEditMode?" jiggling":""),n.dataset.folderIdx=i,n.dataset.appId=t.id,n.dataset.id=t.id;let a="";t.type==="clock"||t.type==="calendar"?a=Ee(t.type,!1):a=Z(t.id),n.innerHTML=`
      <div class="icon-box">${a}</div>
      <span>${t.name}</span>
    `,hm(n,t,e),p.folderGrid.appendChild(n)})}function Oo(e,t=null){s.currentApp&&(s.isOpen||s.isClosing)&&Hn(),ye=e;const i=t||document.querySelector(`[data-id="${e.id}"]`);Mt=i;const n=i?i.getBoundingClientRect():null;It=n,p.folderTitle.textContent=e.name,p.folderTitle.dataset.folderId=e.id,p.folderTitle.style.cursor="pointer",p.folderTitle.onclick=()=>gd(e),hd(e),p.folderOverlay.style.background="",p.folderOverlay.style.backdropFilter="",p.folderOverlay.style.webkitBackdropFilter="",p.folderOverlay.style.pointerEvents="auto",p.folderOverlay.style.opacity="",p.folderOverlay.style.transition="";const a=p.folderOverlay.querySelector(".folder-panel");if(a&&n&&n.width>0){const r=window.innerWidth/2,o=window.innerHeight/2,l=n.left+n.width/2,c=n.top+n.height/2,d=l-r,u=c-o,f=.2;a.style.transition="none",a.style.transform=`translate3d(${d.toFixed(1)}px, ${u.toFixed(1)}px, 0) scale(${f.toFixed(3)})`,a.style.opacity="0",a.style.borderRadius="36px",p.folderOverlay.classList.add("active"),requestAnimationFrame(()=>{requestAnimationFrame(()=>{a.style.transition="transform 0.32s cubic-bezier(0.2, 0.95, 0.25, 1.05), opacity 0.22s ease, border-radius 0.3s ease",a.style.transform="translate3d(0, 0, 0) scale(1)",a.style.opacity="1",a.style.borderRadius="28px"})})}else p.folderOverlay.classList.add("active")}function gd(e){const t=prompt("文件夹名称",e.name);t&&t.trim()&&(e.name=t.trim(),Ae(),p.folderTitle.textContent=e.name,st())}function vd(e=null){if(!p.folderOverlay.classList.contains("active"))return;const t=p.folderOverlay.querySelector(".folder-panel"),i=Mt||(ye?document.querySelector(`[data-id="${ye.id}"]`):null),n=i?i.getBoundingClientRect():It;if(p.folderOverlay.style.background="transparent",p.folderOverlay.style.backdropFilter="none",p.folderOverlay.style.webkitBackdropFilter="none",p.folderOverlay.style.pointerEvents="none",t&&n&&n.width>0){const a=window.innerWidth/2,r=window.innerHeight/2,o=n.left+n.width/2,l=n.top+n.height/2,c=o-a,d=l-r,u=.2;t.style.transition="transform 0.24s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease, border-radius 0.22s ease",t.style.transform=`translate3d(${c.toFixed(1)}px, ${d.toFixed(1)}px, 0) scale(${u.toFixed(3)})`,t.style.opacity="0",t.style.borderRadius="36px",setTimeout(()=>{p.folderOverlay.classList.remove("active"),p.folderOverlay.style.background="",p.folderOverlay.style.backdropFilter="",p.folderOverlay.style.webkitBackdropFilter="",p.folderOverlay.style.pointerEvents="auto",t.style.transition="",t.style.transform="",t.style.opacity="",e&&e()},240)}else p.folderOverlay.classList.remove("active"),e&&e()}function Ya(e=!1){if(!p.folderOverlay.classList.contains("active"))return;const t=p.folderOverlay.querySelector(".folder-panel"),i=Mt||(ye?document.querySelector(`[data-id="${ye.id}"]`):null),n=i?i.getBoundingClientRect():It;if(e){p.folderOverlay.classList.remove("active"),p.folderOverlay.style.background="",p.folderOverlay.style.backdropFilter="",p.folderOverlay.style.webkitBackdropFilter="",p.folderOverlay.style.pointerEvents="auto",t&&(t.style.transition="",t.style.transform="",t.style.opacity=""),ye=null,Mt=null,It=null;return}if(t&&n&&n.width>0){const a=window.innerWidth/2,r=window.innerHeight/2,o=n.left+n.width/2,l=n.top+n.height/2,c=o-a,d=l-r,u=.2;t.style.transition="transform 0.26s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease, border-radius 0.24s ease",t.style.transform=`translate3d(${c.toFixed(1)}px, ${d.toFixed(1)}px, 0) scale(${u.toFixed(3)})`,t.style.opacity="0",t.style.borderRadius="36px",p.folderOverlay.style.transition="opacity 0.24s ease",p.folderOverlay.style.opacity="0",setTimeout(()=>{p.folderOverlay.classList.remove("active"),p.folderOverlay.style.opacity="",p.folderOverlay.style.transition="",p.folderOverlay.style.background="",p.folderOverlay.style.backdropFilter="",p.folderOverlay.style.webkitBackdropFilter="",p.folderOverlay.style.pointerEvents="auto",t.style.transition="",t.style.transform="",t.style.opacity="",ye=null,Mt=null,It=null},260)}else p.folderOverlay.classList.remove("active"),ye=null,Mt=null,It=null}function yd(e,t=null){ye=e;const i=document.querySelector(`.app-folder[data-id="${e.id}"]`);Mt=i,It=i?i.getBoundingClientRect():null,p.folderTitle.textContent=e.name,p.folderTitle.dataset.folderId=e.id,p.folderTitle.style.cursor="pointer",p.folderTitle.onclick=()=>gd(e),hd(e),p.folderOverlay.classList.add("active"),p.folderOverlay.style.background="",p.folderOverlay.style.backdropFilter="",p.folderOverlay.style.webkitBackdropFilter="",p.folderOverlay.style.transition="none",p.folderOverlay.style.pointerEvents="none";const n=p.folderOverlay.querySelector(".folder-panel");if(n&&(n.style.transition="none",n.style.transform="scale(1)",n.style.opacity="1"),t){const a=p.folderGrid.querySelector(`.app-icon[data-id="${t}"]`);a&&a.scrollIntoView&&a.scrollIntoView({block:"nearest"})}}function Ro(e){if(!e||!e.apps)return!1;if(e.apps.length===1){const t=e.apps[0],i=s.pagesApps.findIndex(n=>n.some(a=>a.id===e.id));if(i!==-1){const n=e.slot??0;return t.slot=n,s.pagesApps[i]=s.pagesApps[i].map(a=>a.id===e.id?t:a),ye&&ye.id===e.id&&Ya(!0),Ae(),!0}}else if(e.apps.length===0){const t=s.pagesApps.findIndex(i=>i.some(n=>n.id===e.id));if(t!==-1)return s.pagesApps[t]=s.pagesApps[t].filter(i=>i.id!==e.id),ye&&ye.id===e.id&&Ya(!0),Ae(),!0}return!1}function wd(){p.folderOverlay.addEventListener("click",e=>{e.target===p.folderOverlay&&Ya()})}const Em=Object.freeze(Object.defineProperty({__proto__:null,closeFolder:Ya,createFolder:Hs,createFolderElement:md,get currentOpenedFolder(){return ye},get currentOpenedFolderEl(){return Mt},dissolveFolderIfSingle:Ro,initFolder:wd,isFolder:$i,openFolder:Oo,get originFolderRect(){return It},reopenFolderForReturn:yd,shrinkFolderToDesktop:vd},Symbol.toStringTag,{value:"Module"})),xd="ios-desktop:sound-enabled",bd="ios-desktop:haptics-enabled",Sd="ios-desktop:sfx-volume";let rn=null,Rn=.5;function kd(e){try{return localStorage.getItem(e)!=="0"}catch{return!0}}function Ho(){return kd(xd)}function No(){return kd(bd)}function _m(e){try{localStorage.setItem(xd,e?"1":"0")}catch{}Ed()}function Mm(e){try{localStorage.setItem(bd,e?"1":"0")}catch{}Ed()}function Im(){return Rn}function Tm(e){Rn=Math.max(0,Math.min(1,Number(e)||0));try{localStorage.setItem(Sd,String(Rn))}catch{}}function Cm(){try{if(!rn){const e=window.AudioContext||window.webkitAudioContext;if(!e)return null;rn=new e}return rn.state==="suspended"&&rn.resume().catch(()=>{}),rn}catch{return null}}function Lm(e,{freq:t=880,end:i=null,dur:n=.08,gain:a=.05,type:r="sine",delay:o=0}){const l=e.currentTime+o,c=e.createOscillator(),d=e.createGain();c.type=r,c.frequency.setValueAtTime(t,l),i&&i!==t&&c.frequency.exponentialRampToValueAtTime(Math.max(40,i),l+n),d.gain.setValueAtTime(1e-4,l),d.gain.exponentialRampToValueAtTime(Math.max(2e-4,a),l+.012),d.gain.exponentialRampToValueAtTime(1e-4,l+n),c.connect(d).connect(e.destination),c.start(l),c.stop(l+n+.02)}const Am={tap:[{freq:1750,dur:.045,gain:.05,type:"sine"}],tick:[{freq:2100,dur:.035,gain:.04,type:"triangle"}],app_open:[{freq:520,end:980,dur:.16,gain:.055,type:"sine"},{freq:1040,end:1560,dur:.1,gain:.02,type:"sine",delay:.05}],app_close:[{freq:880,end:440,dur:.15,gain:.05,type:"sine"}],notify:[{freq:1318,dur:.09,gain:.06,type:"sine"},{freq:1046,dur:.14,gain:.06,type:"sine",delay:.1}],lock:[{freq:320,end:220,dur:.09,gain:.06,type:"triangle"}],unlock:[{freq:620,dur:.05,gain:.045,type:"triangle"},{freq:930,dur:.07,gain:.045,type:"triangle",delay:.07}],profile:[{freq:660,dur:.07,gain:.05},{freq:880,dur:.07,gain:.05,delay:.08},{freq:1174,dur:.12,gain:.05,delay:.16}]};function We(e){if(!Ho())return;const t=Am[e];if(!t)return;const i=Cm();if(!(!i||i.state!=="running"))try{t.forEach(n=>Lm(i,{...n,gain:(n.gain||.05)*Rn}))}catch{}}function Bm(){try{const e=typeof navigator.vibrate=="function"?navigator.vibrate.bind(navigator):null;Object.defineProperty(navigator,"vibrate",{configurable:!0,value:t=>No()&&e?e(t):!1})}catch{}}function Ed(){const e={type:"system-sound-state",sfx:Ho(),haptics:No()};document.querySelectorAll("iframe").forEach(t=>{try{t.contentWindow.postMessage(e,"*")}catch{}})}const Fm=[".md3-list-item",".md3-btn","button",".qs-tile-pill",".menu-item",".nav-btn",".dot",".md3-slider",".glance-chip"];function Pm(e){return!!(e&&e.closest&&Fm.some(t=>{try{return e.closest(t)}catch{return!1}}))}function zm(){document.addEventListener("pointerdown",e=>{Pm(e.target)&&We("tap")},{capture:!0,passive:!0})}function $m(){try{Rn=Math.max(0,Math.min(1,parseFloat(localStorage.getItem(Sd)||"0.5")||.5))}catch{}Bm(),zm(),window.__sfx={play:We,sfxEnabled:Ho,setSfxEnabled:_m,hapticsEnabled:No,setHapticsEnabled:Mm,getVolume:Im,setVolume:Tm}}const D={items:[],context:"none",originCX:0,originCY:0,isIdle:!1},Dm=ht(.34,.78,1),Om=130,ie={closeSuction:.62,closeFar:1.1,closeEngage:.92,closeFull:.14,openSuction:.74,openFar:1.06,openRelease:.62,openLift:.68,blurPeak:6,blurEngageHi:.55,blurEngageLo:.12,axisFadePx:160},_d=(typeof navigator<"u"&&(navigator.hardwareConcurrency||8))<6?Math.ceil(ie.blurPeak/2):ie.blurPeak;function Md(e,t,i,n,a,r,o){if(!(e>.004))return"";const l=Math.hypot(n,a),c=I(l/ie.axisFadePx,0,1);if(l<.001||c<=.004)return"";n/=l,a/=l,e*=c;const d=1+(t-1)*e,u=1+(i-1)*e,f=(u-d)/(u+d),m=2*d*u/(d+u),h=Math.abs(n)*r+Math.abs(a)*o,v=f/Math.max(h,1),y=m.toFixed(4);return` matrix3d(${y},0,0,${(v*n).toFixed(5)},0,${y},0,${(v*a).toFixed(5)},0,0,${y},0,0,0,0,1)`}let Ua=!1;try{if(typeof matchMedia=="function"){const e=matchMedia("(prefers-reduced-motion: reduce)");Ua=!!e.matches;const t=()=>{Ua=!!e.matches};e.addEventListener?e.addEventListener("change",t):e.addListener&&e.addListener(t)}}catch{}const ue=[],Bl=new Map;function ma(e){let t=Bl.get(e);return(!t||!t.isConnected)&&(t=document.getElementById(e),t&&Bl.set(e,t)),t}function Ba(e,t=0){const i=new Map;for(const l of D.items)l.el&&l.el.isConnected&&Number.isFinite(l.lastS)&&i.set(l.el,I(l.lastS,0,1));qo(),D.originCX=s.iconCX,D.originCY=s.iconCY;let n=null;if(p.folderOverlay&&p.folderOverlay.classList.contains("active")&&e&&p.folderGrid.contains(e))D.context="folder",n=p.folderGrid.querySelectorAll(".app-icon");else{D.context="desktop";const l=p.desktopSlider?p.desktopSlider.children[s.currentPage]:null;n=l?l.querySelectorAll(".app-icon, .app-folder"):null}if(!n||n.length===0)return;let a=1;const r=[];if(n.forEach(l=>{if(l===e)return;const c=l.getBoundingClientRect();if(c.width<=0||c.height<=0)return;const d=c.left+c.width/2,u=c.top+c.height/2,f=Math.hypot(d-D.originCX,u-D.originCY);r.push({el:l,cx:d,cy:u,dist:f}),f>a&&(a=f)}),r.length===0)return;const o=performance.now();D.items=r.map(l=>{const c=Math.max(1,l.dist),d=i.get(l.el);let u=0;if(l.el.classList.contains("unlock-icon-in")||l.el.classList.contains("unlock-icon-in-ios")||l.el.classList.contains("unlock-icon-in-android")){let f=0;try{const m=l.el.getAnimations?l.el.getAnimations():[];for(const h of m){const v=h.effect&&h.effect.getComputedTiming?h.effect.getComputedTiming():null;v&&Number.isFinite(v.endTime)&&(f=Math.max(f,v.endTime-(h.currentTime||0)))}}catch{}u=Math.max(f,0)+60,f<=0&&(u=(parseFloat(l.el.style.animationDelay)||0)+700)}else l.el.classList.contains("icon-receive-pop")?u=280:l.el.classList.contains("icon-receive-fade")&&(u=200);return{el:l.el,dirX:(l.cx-D.originCX)/c,dirY:(l.cy-D.originCY)/c,push:40+20*Math.min(c/350,1.2),startAt:o+l.dist/a*Om+u,spring:new Ge({...Xn(Dm),initialValue:d!==void 0?d:t,initialVelocity:0})}}),D.items.forEach(l=>{l.el.style.willChange="transform, opacity",l.spring.x>5e-4&&Vo(l,I(l.spring.x,0,1.2))})}function qo(){D.items.forEach(e=>{e.el.style.transform="",e.el.style.opacity="",e.el.style.willChange=""}),D.items=[],D.context==="folder"&&Rm(),D.context="none",D.isIdle=!1}function Rm(){if(!p.folderOverlay)return;const e=p.folderOverlay.querySelector(".folder-panel");e&&(e.style.transform="",e.style.opacity="")}function Di(e){D.items.forEach(t=>t.spring.setTarget(e)),D.isIdle=!1}function Vo(e,t){if(e.lastS=t,t>5e-4){const i=e.dirX*e.push*t,n=e.dirY*e.push*t,a=Math.max(.78,1-.22*t),r=Math.max(0,1-1.15*t),o=Math.round(i*2)/2,l=Math.round(n*2)/2,c=Math.round(a*1e3)/1e3,d=Math.round(r*32)/32;(e.lastTxQ!==o||e.lastTyQ!==l||e.lastScQ!==c)&&(e.lastTxQ=o,e.lastTyQ=l,e.lastScQ=c,e.el.style.transform=`translate3d(${o.toFixed(1)}px, ${l.toFixed(1)}px, 0) scale(${c.toFixed(3)})`),e.lastOpQ!==d&&(e.lastOpQ=d,e.el.style.opacity=d.toFixed(3))}else e.lastTxQ!==0&&(e.lastTxQ=0,e.lastTyQ=0,e.lastScQ=1,e.lastOpQ=1,e.el.style.transform="",e.el.style.opacity="")}function Hm(e,t){if(D.items.length===0)return;const i=s.isOpen&&!s.isClosing?1:0;if(D.isIdle){let a=!0;for(const r of D.items)if(r.spring.target!==i){a=!1;break}if(a)return;D.isIdle=!1}let n=!0;for(const a of D.items){a.spring.target!==i&&a.spring.setTarget(i),t>=a.startAt&&a.spring.update(e);const r=I(a.spring.x,-.1,1.2);a.spring.isSettled(.004,.4)||(n=!1),Vo(a,r)}n&&(i===0?qo():D.isIdle=!0)}function Id(e){if(D.items.length===0)return;const t=I(e,0,1);D.items.forEach(i=>{i.spring.x=t,i.spring.v=0,i.spring.target=t,Vo(i,t)})}function Td(){return ue.length>0||D.items.length>0&&!D.isIdle}function Nm(e){const t=1-.16*e,i=1-.05*e;if(e>.001){if(p.desktop.style.transform=`scale(${i.toFixed(4)})`,bo())p.desktop.style.filter="",So(e);else{const r=12*(e*e);p.desktop.style.filter=`blur(${r.toFixed(1)}px) brightness(${t.toFixed(3)})`}p.pageDots&&(p.pageDots.style.opacity=Math.max(0,1-e*2).toFixed(3),p.pageDots.style.transform=`translate3d(0, ${(16*e).toFixed(1)}px, 0)`);const n=ma("pixelAtAGlance");n&&(n.style.transition="none",n.style.opacity=Math.max(0,1-e*2.5).toFixed(3),n.style.transform=`translate3d(0, ${(-16*e).toFixed(1)}px, 0)`);const a=ma("desktopSearchWidget");a&&(a.style.transition="none",a.style.opacity=Math.max(0,1-e*2.5).toFixed(3),a.style.transform=`translateX(-50%) translate3d(0, ${(20*e).toFixed(1)}px, 0)`)}else{p.desktop.style.filter="",p.desktop.style.transform="",$c(),p.pageDots&&(p.pageDots.style.opacity="",p.pageDots.style.transform="");const n=ma("pixelAtAGlance");n&&(n.style.opacity="",n.style.transform="",n.style.transition="");const a=ma("desktopSearchWidget");a&&(a.style.opacity="",a.style.transform="",a.style.transition="")}if(D.context==="folder"&&p.folderOverlay){const n=p.folderOverlay.querySelector(".folder-panel");if(n){const a=1+.12*e,r=Math.max(0,1-e*1.5);n.style.transform=`scale(${a.toFixed(3)})`,n.style.opacity=r.toFixed(3)}p.folderOverlay.style.opacity=Math.max(0,1-e*1.6).toFixed(3)}}function Wo(e,t){if(!e||!e.classList)return;const i=!!(t&&t.silent);if(!(e.classList.contains("launch-hidden")||e.classList.contains("icon-receive-pop")||e.classList.contains("icon-receive-fade")||e.style.opacity!==""||e.style.transform!==""||e.style.visibility!=="")||(e.classList.remove("launch-hidden","icon-receive-pop"),delete e.dataset.iconFadePending,e.style.opacity="",e.style.transform="",e.style.visibility="",e.style.willChange="",i))return;e.classList.add("icon-receive-fade"),e.dataset.iconFadePending="1";let a=!1;const r=()=>{a||(a=!0,e.classList.remove("icon-receive-fade"),delete e.dataset.iconFadePending,e.removeEventListener("animationend",r))};e.addEventListener("animationend",r),setTimeout(r,400)}let Ka=null,Qa=null,Ja=null,Za=null;function Oi(e,t,i){const n=I(e,0,1),a=window.innerWidth||document.documentElement.clientWidth,r=window.innerHeight||document.documentElement.clientHeight,o=s.isClosing&&s.shrinkToCard,l=s.iconW||58,c=s.iconH||58,d=I(e,0,1.06),u=l/a,f=c/r,m=u+(1-u)*d,h=f+(1-f)*d,v=!Ua&&!o,y=t-a/2,x=i-r/2,E=a/2,b=r/2,k=E>0?(s.iconCX-E)/E:0,M=b>0?(s.iconCY-b)/b:0,L=v?I(Math.abs(s.scaleSpring.v)+Math.hypot(s.posSpring.vx,s.posSpring.vy)/900,0,1):0,P=Math.sin(Math.PI*n)*(.35+.65*L),A=l>120?2.5:5.5,N=v?-M*A*P:0,B=v?k*A*P:0,W=v?I(s.scaleSpring.v,-3.8,3.8):0,Q=v?I(W*.022,-.045,.055):0,Pe=t-s.iconCX,_e=i-s.iconCY,Ye=Math.hypot(Pe,_e)||1,oi=Math.abs(Pe/Ye),li=Math.abs(_e/Ye),jr=1+Q*(oi-.5*li),Yr=1+Q*(li-.5*oi);let Ui=0,Ki=0;v&&(s.isClosing?(Ui=1-re(n,ie.closeFull,ie.closeEngage),Ki=_d*(1-re(n,ie.blurEngageLo,ie.blurEngageHi))):Ui=ie.openLift*(1-re(n,.04,ie.openRelease)));const ia=Md(Ui,s.isClosing?ie.closeSuction:ie.openSuction,s.isClosing?ie.closeFar:ie.openFar,s.iconCX-a/2,s.iconCY-r/2,a/2,r/2),na=Math.sin(Math.PI*n)*(.35+.65*L),aa=l>120?1:2.2,ra=v?-k*M*aa*na:0,sa=v?k*(1-n*.45)*aa*.65*na:0,$t=m*jr,Qi=h*Yr,Ur=l>120?28:16,oa=Ur+(36-Ur)*re(n,0,1),Qr=oa/Math.max($t,.001),Ji=oa/Math.max(Qi,.001),Dt=`translate3d(${y.toFixed(2)}px, ${x.toFixed(2)}px, 0px) scale(${$t.toFixed(5)}, ${Qi.toFixed(5)}) rotateX(${N.toFixed(2)}deg) rotateY(${B.toFixed(2)}deg) skewX(${ra.toFixed(2)}deg) skewY(${sa.toFixed(2)}deg)`+ia;p.appWindow.style.transform=Dt;const ci=Math.round(Qr*2)/2,Zi=Math.round(Ji*2)/2;if(ci!==Ka||Zi!==Qa){const Ke=`${ci.toFixed(1)}px / ${Zi.toFixed(1)}px`;p.appWindow.style.borderRadius=Ke,p.windowShadowLayer&&(p.windowShadowLayer.style.borderRadius=Ke),p.windowGlowLayer&&(p.windowGlowLayer.style.borderRadius=Ke),Ka=ci,Qa=Zi}const en=s.isClosing&&!o?re(n,.002,.12):1,la=Math.round(.85*Math.sin(Math.PI*n)*20)/20;if(p.windowGlowLayer){const Ke=Math.round(la*en*20)/20;Ke!==Ja&&(p.windowGlowLayer.style.opacity=Ke.toFixed(2),Ja=Ke),Ke>.001&&(p.windowGlowLayer.style.transform=Dt)}const Ot=Math.round(Ki/2)*2;Ot!==Za&&(p.appWindow.style.filter=Ot>=2?`blur(${Ot}px)`:"",Za=Ot);const ca=120,da=Math.min(l,58),pa=da/ca+(1-da/ca)*n,Ue=pa/Math.max(m,.001),qu=pa/Math.max(h,.001);p.launchIconContainer.style.transform=`scale(${Ue.toFixed(4)}, ${qu.toFixed(4)})`;const Jr=s.isClosing||s.isDragging||s.scaleSpring.target<1;!s.contentWarm&&!Jr&&s.currentApp&&(s.contentWarm=La(s.currentApp.id));let Rt;Jr?Rt=s.contentWarm?1:re(n,.22,.72):Rt=s.contentWarm?re(n,.02,.26):re(n,.22,.72),p.header.style.opacity=Rt.toFixed(3),p.pageStack.style.opacity=Rt.toFixed(3),p.gesture.style.opacity=(Rt*.25).toFixed(3),p.appWindowStatusBar&&(p.appWindowStatusBar.style.opacity=Rt.toFixed(3)),p.statusBar&&(p.statusBar.style.opacity=(1-re(n,.1,.7)).toFixed(3));const Vu=Jr?s.contentWarm?0:1-re(n,.22,.72):1-Rt;p.appLaunchScreen.style.opacity=Vu.toFixed(3);const Wu=.3*(1-re(n,.85,1));if(p.windowShadowLayer&&(p.windowShadowLayer.style.opacity=(Wu/.3*en).toFixed(3),p.windowShadowLayer.style.transform=Dt),s.isClosing)if(o)p.appWindow.style.opacity!=="1"&&(p.appWindow.style.opacity="1");else{const Ke=re(n,.002,.12);p.appWindow.style.opacity=n<=.12?Ke.toFixed(3):"1",n<.06&&s.currentIconEl&&Wo(s.currentIconEl)}else p.appWindow.style.opacity="1";Nm(n),Lr()}let Sn=null,wi=0;function Cd(e){e.main&&(e.syncRadial&&Id(e.p),Oi(e.p,e.cx,e.cy)),e.forceSub&&Lr(!0)}function Fa(e,t,i,n={}){Sn={p:e,cx:t,cy:i,main:n.main!==!1,syncRadial:!!n.syncRadial,forceSub:!!n.forceSub},!wi&&(wi=requestAnimationFrame(()=>{wi=0;const a=Sn;Sn=null,a&&Cd(a)}))}function Go(){wi&&(cancelAnimationFrame(wi),wi=0);const e=Sn;Sn=null,e&&Cd(e)}const Fl=new WeakMap;function os(e,t,i,n){let a=Fl.get(e);a||(a={},Fl.set(e,a)),a[t]!==i&&(a[t]=i,n(i))}function Lr(e=!1){if(!s.currentApp||s.navHistory.length<2||s.isDragging&&!e)return;const t=I(s.subpageSpring.x,0,1),i=s.navHistory[s.navHistory.length-1],n=s.navHistory[s.navHistory.length-2],a=document.getElementById(`app-page-${s.currentApp.id}-${i}`),r=document.getElementById(`app-page-${s.currentApp.id}-${n}`);if(a&&r){const o=1-t;r.style.transform="translate3d(0, 0, 0) scale(1)",r.style.opacity="1";const l=Math.min(1,.65+Math.round(.35*o/.04)*.04).toFixed(2);os(r,"filter",t<1?`brightness(${l})`:"",h=>{r.style.filter=h}),r.style.borderRadius="0";const c=o*100,d=Math.max(.9,1-.1*o),u=Math.round(o*28/2)*2,f=(Math.round(.45*o/.05)*.05).toFixed(2),m=o>.01?`0 16px 44px rgba(0,0,0,${f}), 0 2px 10px rgba(0,0,0,0.2)`:"";a.style.transform=`translate3d(${c.toFixed(2)}%, 0, 0) scale(${d.toFixed(4)})`,os(a,"radius",`${u}px`,h=>{a.style.borderRadius=h}),os(a,"shadow",m,h=>{a.style.boxShadow=h}),a.style.transformOrigin="center center",a.style.overflow="hidden"}}function Ld(e,t,i,n){const a=I(t,0,1);if(a<.002){e.element.style.opacity!=="0"&&(e.element.style.opacity="0",e.shadowEl&&(e.shadowEl.style.opacity="0"),e.glowEl&&(e.glowEl.style.opacity="0"));return}const r=!Ua,o=window.innerWidth||document.documentElement.clientWidth,l=window.innerHeight||document.documentElement.clientHeight,c=e.iconW||58,d=e.iconH||58,u=c/o,f=d/l,m=u+(1-u)*a,h=f+(1-f)*a,v=i-o/2,y=n-l/2,x=o/2,E=l/2,b=x>0?(e.iconCX-x)/x:0,k=E>0?(e.iconCY-E)/E:0,M=r?I(Math.abs(e.scaleSpring.v)+Math.hypot(e.posSpring.vx,e.posSpring.vy)/900,0,1):0,L=Math.sin(Math.PI*a)*(.35+.65*M),P=r?-k*5.5*L:0,A=r?b*5.5*L:0,N=r?I(e.scaleSpring.v,-3.8,3.8):0,B=r?I(N*.022,-.045,.055):0,W=i-e.iconCX,Q=n-e.iconCY,Pe=Math.hypot(W,Q)||1,_e=Math.abs(W/Pe),Ye=Math.abs(Q/Pe),oi=1+B*(_e-.5*Ye),li=1+B*(Ye-.5*_e),jr=r?1-re(a,ie.closeFull,ie.closeEngage):0,Yr=_d*(1-re(a,ie.blurEngageLo,ie.blurEngageHi)),Ui=Md(jr,ie.closeSuction,ie.closeFar,e.iconCX-o/2,e.iconCY-l/2,o/2,l/2),Ki=Math.sin(Math.PI*a)*(.35+.65*M),ia=e.iconW>120?1:2.2,na=r?-b*k*ia*Ki:0,aa=r?b*(1-a*.45)*ia*.65*Ki:0,ra=m*oi,sa=h*li,$t=Math.round(Yr/2)*2,Qi=e.iconW>120?28:16,Kr=Qi+(36-Qi)*re(a,0,1),oa=Kr/Math.max(ra,.001),Qr=Kr/Math.max(sa,.001);e.element.style.transform=`translate3d(${v.toFixed(2)}px, ${y.toFixed(2)}px, 0px) scale(${ra.toFixed(5)}, ${sa.toFixed(5)}) rotateX(${P.toFixed(2)}deg) rotateY(${A.toFixed(2)}deg) skewX(${na.toFixed(2)}deg) skewY(${aa.toFixed(2)}deg)`+Ui;const Ji=Math.round(oa*2)/2,Dt=Math.round(Qr*2)/2;if(Ji!==e._lastRQx||Dt!==e._lastRQy){const Ue=`${Ji.toFixed(1)}px / ${Dt.toFixed(1)}px`;e.element.style.borderRadius=Ue,e.shadowEl&&(e.shadowEl.style.borderRadius=Ue),e.glowEl&&(e.glowEl.style.borderRadius=Ue),e._lastRQx=Ji,e._lastRQy=Dt}const ci=re(a,.002,.12),Zi=Math.round(.85*Math.sin(Math.PI*a)*20)/20;if(e.glowEl){const Ue=Math.round(Zi*ci*20)/20;Ue!==e._lastGlowQ&&(e.glowEl.style.opacity=Ue.toFixed(2),e._lastGlowQ=Ue),Ue>.001&&(e.glowEl.style.transform=e.element.style.transform)}$t!==e._lastGenieQ&&(e.element.style.filter=$t>=2?`blur(${$t}px)`:"",e._lastGenieQ=$t),e.shadowEl&&(e.shadowEl.style.transform=e.element.style.transform,e.shadowEl.style.opacity=((1-re(a,.85,1))*ci).toFixed(3));const en=120,la=Math.min(c,58),Ot=la/en+(1-la/en)*a,ca=Ot/Math.max(m,.001),da=Ot/Math.max(h,.001);e.launchIconContainer&&(e.launchIconContainer.style.transform=`scale(${ca.toFixed(4)}, ${da.toFixed(4)})`),e.header&&(e.header.style.opacity="1"),e.pageStackEl&&(e.pageStackEl.style.opacity="1"),e.gestureEl&&(e.gestureEl.style.opacity="0.25"),e.windowStatusBar&&(e.windowStatusBar.style.opacity="1"),e.launchScreen&&(e.launchScreen.style.opacity="0");const pa=re(a,.002,.2);e.element.style.opacity=pa.toFixed(3)}function Be(e){if(e&&(s.posSpring.reconfigure(e),s.scaleSpring.reconfigure(e)),s.rafId)return;const t=1/120,i=30;let n=0,a=performance.now();function r(o){let l=(o-a)/1e3;a=o,l>.25&&(l=.25),n+=l;let c=0;for(;n>=t&&c<i;){(s.isOpen||s.isClosing)&&!s.isDragging&&(s.posSpring.update(t),s.scaleSpring.update(t),(s.isClosing||s.scaleSpring.target===0)&&s.scaleSpring.x<=0&&(s.scaleSpring.x=0,s.scaleSpring.v=0),s.subpageSpring.update(t));for(let m=0;m<ue.length;m++){const h=ue[m];h.posSpring.update(t),h.scaleSpring.update(t),h.scaleSpring.target===0&&h.scaleSpring.x<=0&&(h.scaleSpring.x=0,h.scaleSpring.v=0)}n-=t,c++}if(n>=t&&(n=0),Hm(Math.min(l,.05),o),s.isOpen||s.isClosing){const m=s.iconCX+s.posSpring.px,h=s.iconCY+s.posSpring.py;Oi(s.scaleSpring.x,m,h)}for(let m=ue.length-1;m>=0;m--){const h=ue[m],v=h.iconCX+h.posSpring.px,y=h.iconCY+h.posSpring.py;Ld(h,h.scaleSpring.x,v,y);const x=h.scaleSpring.x<=1e-4;h.scaleSpring.isSettled()&&(h.posSpring.isSettled()||x)&&(Ad(h),h.iconEl&&Wo(h.iconEl,{silent:!0}),ue.splice(m,1))}s.popInProgress&&!s.isDragging&&s.subpageSpring.isSettled()&&(s.popInProgress=!1,s.navHistory.length>1&&(s.navHistory.pop(),Fi()));const u=!s.isOpen&&!s.isClosing||s.scaleSpring.isSettled()&&s.posSpring.isSettled()&&s.subpageSpring.isSettled(),f=D.items.length===0||D.isIdle;if(u&&ue.length===0&&f){qm();return}s.rafId=requestAnimationFrame(r)}s.rafId=requestAnimationFrame(r)}function qm(){s.rafId&&(cancelAnimationFrame(s.rafId),s.rafId=null);try{Po(!1)}catch{}if(s.scaleSpring.target===1&&s.isOpen&&!s.isClosing){if(p.appWindow.style.transform="",p.appWindow.style.transition="",s.shrinkToCard=!1,p.appWindow.style.borderRadius="",p.appWindow.style.boxShadow="",p.appWindow.style.visibility="",p.appWindow.style.zIndex="",p.windowShadowLayer&&(p.windowShadowLayer.style.zIndex=""),p.windowShadowLayer&&(p.windowShadowLayer.style.transform="",p.windowShadowLayer.style.borderRadius="",p.windowShadowLayer.style.opacity="0"),p.windowGlowLayer&&(p.windowGlowLayer.style.opacity="0",p.windowGlowLayer.style.transform="",p.windowGlowLayer.style.borderRadius=""),Ka=null,Qa=null,Ja=null,Za=null,p.appWindow.style.opacity="1",p.appWindow.style.filter="",p.launchIconContainer.style.transform="",p.appLaunchScreen.style.opacity="0",p.header.style.opacity="1",p.pageStack.style.opacity="1",p.gesture.style.opacity="0.25",p.appWindowStatusBar&&(p.appWindowStatusBar.style.opacity="1"),p.statusBar&&(p.statusBar.style.opacity="0"),p.desktop.style.transform="scale(0.95)",bo()?(p.desktop.style.filter="",ri(),So(1)):p.desktop.style.filter="blur(12px) brightness(0.84)",p.appWindow.style.pointerEvents="auto",document.querySelectorAll(".launch-hidden").forEach(e=>{e!==s.currentIconEl&&e.classList.remove("launch-hidden")}),p.folderOverlay&&p.folderOverlay.classList.contains("active")){p.folderOverlay.classList.remove("active"),p.folderOverlay.style.background="",p.folderOverlay.style.backdropFilter="",p.folderOverlay.style.webkitBackdropFilter="",p.folderOverlay.style.opacity="",p.folderOverlay.style.transition="",p.folderOverlay.style.pointerEvents="auto";const e=p.folderOverlay.querySelector(".folder-panel");e&&(e.style.transition="",e.style.transform="",e.style.opacity="")}}else if(s.isClosing||s.scaleSpring.target===0){if(Oi(0,s.iconCX,s.iconCY),s.shrinkToCard=!1,p.appWindow.classList.remove("open","closing"),p.appWindow.style.visibility="",p.appWindow.style.transform="",p.appWindow.style.transition="",p.appWindow.style.borderRadius="",p.appWindow.style.boxShadow="",p.appWindow.style.zIndex="",p.windowShadowLayer&&(p.windowShadowLayer.style.zIndex=""),p.windowShadowLayer&&(p.windowShadowLayer.style.transform="",p.windowShadowLayer.style.borderRadius="",p.windowShadowLayer.style.opacity="0"),p.windowGlowLayer&&(p.windowGlowLayer.style.opacity="0",p.windowGlowLayer.style.transform="",p.windowGlowLayer.style.borderRadius=""),Ka=null,Qa=null,Ja=null,Za=null,p.appWindow.style.opacity="",p.appWindow.style.filter="",p.launchIconContainer.style.transform="",p.desktop.style.filter="",p.desktop.style.transform="",$c(),p.folderOverlay)if(s.returnToFolderOnClose){p.folderOverlay.style.background="",p.folderOverlay.style.backdropFilter="",p.folderOverlay.style.webkitBackdropFilter="",p.folderOverlay.style.opacity="",p.folderOverlay.style.transition="",p.folderOverlay.style.pointerEvents="auto";const e=p.folderOverlay.querySelector(".folder-panel");e&&(e.style.transition="",e.style.transform="",e.style.opacity="")}else p.folderOverlay.classList.remove("active"),p.folderOverlay.style.background="",p.folderOverlay.style.backdropFilter="",p.folderOverlay.style.webkitBackdropFilter="",p.folderOverlay.style.opacity="",p.folderOverlay.style.pointerEvents="auto";s.currentIconEl&&Wo(s.currentIconEl),document.querySelectorAll(".launch-hidden").forEach(e=>{e.classList.remove("launch-hidden"),e.style.visibility=""}),p.header.style.opacity="",p.pageStack.style.opacity="",p.gesture.style.opacity="",p.appLaunchScreen.style.opacity="",p.appWindowStatusBar&&(p.appWindowStatusBar.style.opacity=""),p.statusBar&&(p.statusBar.style.opacity="1"),p.appWindow.style.pointerEvents="",qo(),s.isOpen=!1,s.isClosing=!1,s.returnToFolderOnClose=!1,s.currentIconEl=null,s.currentApp=null,s.navHistory=[0];try{Fi()}catch{}}}function Ns(e){const i=!!(p.folderOverlay&&p.folderGrid&&p.folderGrid.contains(e))?p.folderOverlay.querySelector(".folder-panel"):null,n=i?i.style.transform:"",a=i?i.style.transition:"";i&&i.style.setProperty("transform","none","important");const r=Fs(e);return i&&(i.style.transform=n,i.style.transition=a),r}function ha(e,t){return{cx:e.left+e.width/2,cy:e.top+e.height/2,w:e.width||58,h:e.height||58,el:t}}function Ar(e){const t=window.innerWidth/2,i=window.innerHeight/2;if(!e)return{cx:t,cy:i,w:58,h:58,el:null};if(p.folderOverlay&&p.folderOverlay.classList.contains("active")){const r=p.folderGrid.querySelector(`[data-id="${e.id}"]`);if(r)return ha(Ns(r),r)}if(s.currentIconEl&&s.currentIconEl.dataset&&s.currentIconEl.dataset.id===e.id&&s.currentIconEl.isConnected&&s.currentIconEl.getClientRects().length>0){const r=Ns(s.currentIconEl);if(r.width>0&&r.height>0)return ha(r,s.currentIconEl)}const n=document.querySelector(`.page-grid .app-icon[data-id="${e.id}"]`);if(n){const r=Fs(n);if(r.width>0&&r.height>0)return ha(r,n)}const a=document.querySelectorAll(".app-folder");for(let r of a){const o=r.dataset.id;let l=!1;for(let c of s.pagesApps){for(let d of c)if(d.id===o&&d.apps&&d.apps.some(u=>u.id===e.id)){l=!0;break}if(l)break}if(l)return ha(Fs(r),r)}return{cx:s.iconCX||t,cy:s.iconCY||i,w:s.iconW||58,h:s.iconH||58,el:s.currentIconEl||null}}function Vm(e){for(const t of s.pagesApps)for(const i of t)if(i&&i.type==="folder"&&Array.isArray(i.apps)&&i.apps.some(n=>n.id===e))return i;return null}function Wm(e){if(!e||!e.element)return;const t=e.element.querySelector(".page-stack");t&&t.querySelectorAll(".app-instance-wrapper").forEach(i=>{i.__actorHosted&&(i.__actorHosted=null,i.style.display="none",p.pageStack&&p.pageStack!==i.parentNode&&p.pageStack.appendChild(i))})}function Ad(e){Wm(e),e.element&&e.element.parentNode&&e.element.parentNode.removeChild(e.element),e.shadowEl&&e.shadowEl.parentNode&&e.shadowEl.parentNode.removeChild(e.shadowEl),e.glowEl&&e.glowEl.parentNode&&e.glowEl.parentNode.removeChild(e.glowEl)}function Gm(e){return!!e&&typeof e=="object"&&Number.isFinite(e.left)&&Number.isFinite(e.top)&&e.width>0&&e.height>0}function Qn(){const e=p.appWindow;e&&(e.style.transition&&(e.style.transition=""),e.style.transform&&e.classList.contains("open")&&(e.style.transform=""))}function Hn(e=null){if(!s.currentApp||!s.isOpen&&!s.isClosing)return;s.shrinkToCard=!1;const t=s.currentApp,i=s.currentIconEl,n=s.posSpring,a=s.scaleSpring,r=s.iconCX,o=s.iconCY,l=e&&Gm(e.exitTo)?e.exitTo:null,c=e&&Number.isFinite(e.initialOffsetX)?e.initialOffsetX:0,d=e&&Number.isFinite(e.initialOffsetY)?e.initialOffsetY:0;let u,f,m,h,v;if(l)u=l.left+l.width/2,f=l.top+l.height/2,m=l.width,h=l.height,v=null;else{const B=Ar(t);u=B.cx,f=B.cy,m=B.w,h=B.h,v=B.el||i}const y=document.createElement("div");y.className="app-window closing-actor";const x=501+Math.min(ue.length,16)*2,E=document.createElement("div");E.className="window-shadow-layer closing-actor-shadow",E.style.zIndex=`${x}`,y.style.zIndex=`${x+1}`;const b=document.createElement("div");b.className="window-glow-layer closing-actor-glow",b.style.zIndex=`${Math.min(x+2,535)}`;const k=p.windowShadowLayer||p.appWindow;k&&k.parentNode===p.stage?(p.stage.insertBefore(E,k),p.stage.insertBefore(y,k),p.stage.insertBefore(b,k)):(p.stage.appendChild(E),p.stage.appendChild(y),p.stage.appendChild(b)),Array.from(p.appWindow.childNodes).forEach(B=>{if(B.nodeType===1)if(B.classList&&B.classList.contains("app-body")){const W=B.cloneNode(!1),Q=document.createElement("div");Q.className="page-stack",W.appendChild(Q),y.appendChild(W)}else y.appendChild(B.cloneNode(!0))}),y.querySelectorAll("[id]").forEach(B=>B.removeAttribute("id")),y.querySelectorAll("script").forEach(B=>B.remove());const M=y.querySelector(".page-stack"),L=p.pageStack?p.pageStack.querySelector(`.app-instance-wrapper#app-instance-${t.id}`):null;if(M&&L)L.__actorHosted=x,M.appendChild(L);else if(M){const B=s.navHistory[s.navHistory.length-1]||0,W=document.getElementById(`app-page-${t.id}-${B}`);if(W){const Q=document.createElement("div");Q.className="app-instance-wrapper",Q.style.cssText="width:100%;height:100%;position:absolute;inset:0;",Q.appendChild(W.cloneNode(!0)),M.appendChild(Q),y.querySelectorAll("iframe").forEach(Pe=>{const _e=document.createElement("div");_e.className="iframe-ghost-placeholder",_e.style.backgroundColor=t.type==="clock"?"#18181B":t.bgColor||"var(--md-surface, #1a1b1e)";const Ye=t.type?Ee(t.type,!0):`<div class="launch-icon">${Z(t.id)}</div>`;_e.innerHTML=`<div class="launch-icon-container">${Ye}</div>`,Pe.replaceWith(_e)})}}const P=new Sr(Kt(),r+n.px+c-u,o+n.py+d-f,n.vx,n.vy);P.setTarget(0,0);const A=new Ge({...Kt(),initialValue:a.x,initialVelocity:a.v});A.setTarget(0),ue.push({id:`${t.id}_${Date.now()}`,app:t,iconEl:v,element:y,shadowEl:E,glowEl:b,_lastRQx:null,_lastRQy:null,_lastGlowQ:null,_lastGenieQ:null,launchIconContainer:y.querySelector(".launch-icon-container"),launchScreen:y.querySelector(".app-launch-screen"),header:y.querySelector(".app-header"),pageStackEl:y.querySelector(".page-stack"),gestureEl:y.querySelector(".gesture-bar"),windowStatusBar:y.querySelector(".app-window-status-bar"),posSpring:P,scaleSpring:A,iconCX:u,iconCY:f,iconW:m,iconH:h});const N=ue[ue.length-1];N.scaleSpring.x>.002?Ld(N,N.scaleSpring.x,N.iconCX+N.posSpring.px,N.iconCY+N.posSpring.py):(N.element.style.opacity="0",N.shadowEl&&(N.shadowEl.style.opacity="0"),N.glowEl&&(N.glowEl.style.opacity="0")),v&&(Pa(v),v.classList.add("launch-hidden"),v.style.visibility=""),Be(null)}function Bd(e){if(!e||typeof e!="object"||!Number.isFinite(e.left)||!Number.isFinite(e.top)||!(e.width>0)||!(e.height>0))return!1;const t=e.left+e.width/2,i=e.top+e.height/2,n=80;return t>=-n&&t<=window.innerWidth+n&&i>=-n&&i<=window.innerHeight+n}function Pa(e){!e||!e.classList||(e.classList.contains("unlock-icon-in")||e.classList.contains("unlock-icon-in-ios")||e.classList.contains("unlock-icon-in-android"))&&(e.classList.remove("unlock-icon-in","unlock-icon-in-ios","unlock-icon-in-android"),e.style.animationDelay="",e.style.removeProperty("--radial-dx"),e.style.removeProperty("--radial-dy"))}function H(e,t,i=null,n=null){const a=F[e];if(!a)return;s.shrinkToCard=!1,Qn();try{if(!n||!n.skipCloseRecents){const d=document.getElementById("recentAppsOverlay");d&&d.classList.contains("active")&&(typeof window.__closeRecentApps=="function"?window.__closeRecentApps():ce(()=>Promise.resolve().then(()=>io),void 0,import.meta.url).then(u=>{try{u.closeRecentApps()}catch{}}).catch(()=>{}))}if(typeof window<"u"&&window.__splitInfo&&window.__splitInfo().active){const d=window.__splitGestures;d&&typeof d.dismissSilently=="function"?d.dismissSilently():d&&typeof d.dismiss=="function"?d.dismiss():ce(()=>import("./split-screen-DuIsKdlP.js"),[],import.meta.url).then(u=>{try{u.exitSplit({instant:!0})}catch{}}).catch(()=>{})}}catch{}We("app_open"),s.popInProgress=!1,t&&Pa(t);try{Po(!0)}catch{}if(setTimeout(()=>{ce(()=>Promise.resolve().then(()=>io),void 0,import.meta.url).then(d=>d.recordAppOpened(a.id)).catch(()=>{})},650),s.currentApp&&s.currentApp.id===a.id&&(s.isOpen||s.isClosing)){s.isClosing=!1,s.isOpen=!0,s.returnToFolderOnClose=!1,s.contentWarm=La(a.id),p.appWindow.classList.remove("closing"),p.appWindow.classList.add("open"),p.appWindow.style.pointerEvents="auto",t?(s.currentIconEl=t,t.classList.add("launch-hidden"),t.style.visibility=""):s.currentIconEl&&(Pa(s.currentIconEl),s.currentIconEl.classList.add("launch-hidden"),s.currentIconEl.style.visibility="");const d=window.innerWidth/2-s.iconCX,u=window.innerHeight/2-s.iconCY;s.posSpring.reconfigure(Te()),s.scaleSpring.reconfigure(Te()),s.posSpring.setTarget(d,u),s.scaleSpring.setTarget(1),Ba(s.currentIconEl||null,s.scaleSpring.x),Di(1),typeof window<"u"&&(window.__lastOpenSource={cx:s.iconCX,cy:s.iconCY,w:s.iconW,h:s.iconH},window.__lastOpenStack=s.currentApp.id+" <- 承接(本体快速承接) "+(new Error().stack||"").split(`
`).slice(2,4).map(f=>f.trim().slice(0,80)).join(" | ")),Be(Te());return}const r=ue.findIndex(d=>d.app&&d.app.id===a.id);if(r!==-1){const d=ue[r];Ad(d),ue.splice(r,1),s.currentApp&&(s.isOpen||s.isClosing)&&s.currentApp.id!==a.id&&Hn(n&&n.prevExitRect?{exitTo:n.prevExitRect,initialOffsetX:n.prevOffsetX,initialOffsetY:n.prevOffsetY}:null),s.isOpen=!0,s.isClosing=!1,s.returnToFolderOnClose=!1,s.currentApp=a,s.currentIconEl=t||d.iconEl,s.contentWarm=La(a.id),s.currentIconEl&&(Pa(s.currentIconEl),s.currentIconEl.classList.add("launch-hidden"),s.currentIconEl.style.visibility=""),s.iconCX=d.iconCX,s.iconCY=d.iconCY,s.iconW=d.iconW,s.iconH=d.iconH,s.posSpring.x.x=d.posSpring.x.x,s.posSpring.x.v=d.posSpring.x.v,s.posSpring.y.x=d.posSpring.y.x,s.posSpring.y.v=d.posSpring.y.v,s.scaleSpring.x=d.scaleSpring.x,s.scaleSpring.v=d.scaleSpring.v;const u=window.innerWidth/2-s.iconCX,f=window.innerHeight/2-s.iconCY;s.posSpring.reconfigure(Te()),s.scaleSpring.reconfigure(Te()),s.posSpring.setTarget(u,f),s.scaleSpring.setTarget(1),Fi(),Oi(s.scaleSpring.x,s.iconCX+s.posSpring.px,s.iconCY+s.posSpring.py),p.appWindow.classList.remove("closing"),p.appWindow.classList.add("open"),p.appWindow.style.zIndex="540",p.windowShadowLayer&&(p.windowShadowLayer.style.zIndex="539"),p.appWindow.style.pointerEvents="auto",Ba(s.currentIconEl||null,s.scaleSpring.x),Di(1),typeof window<"u"&&(window.__lastOpenSource={cx:s.iconCX,cy:s.iconCY,w:s.iconW,h:s.iconH},window.__lastOpenStack=s.currentApp.id+" <- 承接(Actor唤回) "+(new Error().stack||"").split(`
`).slice(2,4).map(m=>m.trim().slice(0,80)).join(" | ")),Be(Te());return}s.currentApp&&(s.isOpen||s.isClosing)&&Hn(n&&n.prevExitRect?{exitTo:n.prevExitRect,initialOffsetX:n.prevOffsetX,initialOffsetY:n.prevOffsetY}:null),s.isOpen=!0,s.isClosing=!1,s.returnToFolderOnClose=!1,s.currentIconEl=t,s.currentApp=a,s.navHistory=[0],p.appWindow.classList.remove("closing"),p.appWindow.classList.add("open"),p.appWindow.style.zIndex="540",p.windowShadowLayer&&(p.windowShadowLayer.style.zIndex="539"),p.appWindow.style.pointerEvents="auto";let o=Bd(i)?i:null;if(!o&&t&&(o=Ns(t)),!o){const d=Ar(a);o={left:d.cx-d.w/2,top:d.cy-d.h/2,width:d.w,height:d.h}}if(s.iconCX=o.left+o.width/2,s.iconCY=o.top+o.height/2,s.iconW=o.width||58,s.iconH=o.height||58,typeof window<"u"&&(window.__lastOpenSource={cx:s.iconCX,cy:s.iconCY,w:s.iconW,h:s.iconH},window.__lastOpenStack=a.id+" <- "+(new Error().stack||"").split(`
`).slice(2,5).map(d=>d.trim().slice(0,90)).join(" | ")),Ba(t||null),p.folderOverlay&&p.folderOverlay.classList.contains("active"))if(t&&p.folderGrid.contains(t)){p.folderOverlay.style.pointerEvents="none",p.folderOverlay.style.transition="none";const d=p.folderOverlay.querySelector(".folder-panel");d&&(d.style.transition="none")}else p.folderOverlay.classList.remove("active"),p.folderOverlay.style.background="",p.folderOverlay.style.backdropFilter="",p.folderOverlay.style.webkitBackdropFilter="",p.folderOverlay.style.opacity="",p.folderOverlay.style.transition="",p.folderOverlay.style.pointerEvents="auto";Fi(),s.contentWarm=La(a.id),s.currentApp.type?(p.launchIconContainer.innerHTML=Ee(s.currentApp.type,!0),p.appLaunchScreen.style.backgroundColor=s.currentApp.type==="clock"?"#18181B":"#FFFFFF"):(p.launchIconContainer.innerHTML=`<div class="launch-icon">${Z(s.currentApp.id)}</div>`,p.appLaunchScreen.style.backgroundColor=s.currentApp.bgColor||"var(--md-surface, #1a1b1e)");const l=window.innerWidth/2-s.iconCX,c=window.innerHeight/2-s.iconCY;s.posSpring.x.x=0,s.posSpring.x.v=0,s.posSpring.x.target=l,s.posSpring.y.x=0,s.posSpring.y.v=0,s.posSpring.y.target=c,s.scaleSpring.x=0,s.scaleSpring.v=0,s.scaleSpring.target=1,Oi(0,s.iconCX,s.iconCY),t&&(t.classList.add("launch-hidden"),t.style.visibility=""),Be(Te())}function Fd(e,t){if(!p.appWindow||!e){t&&t();return}s.rafId&&(cancelAnimationFrame(s.rafId),s.rafId=null);const i=p.appWindow.getBoundingClientRect(),n=window.innerWidth,a=window.innerHeight,r=I(i.width/Math.max(n,1),.2,1.2),o=i.left+i.width/2,l=i.top+i.height/2,c=o-n/2,d=l-a/2,u=parseFloat(getComputedStyle(p.appWindow).borderRadius)||0,f=e.width/Math.max(n,1),m=e.left+e.width/2-n/2,h=e.top+e.height/2-a/2,v=28;s.iconCX=e.left+e.width/2,s.iconCY=e.top+e.height/2,s.iconW=e.width,s.iconH=e.height;const y=Math.max(e.width/Math.max(n,1),.001),x=(B,W,Q)=>{s.posSpring.x.x=W-s.iconCX,s.posSpring.y.x=Q-s.iconCY,s.posSpring.x.v=0,s.posSpring.y.v=0,s.scaleSpring.x=I((B-y)/(1-y),0,1),s.scaleSpring.v=0};x(r,o,l),p.appWindow.style.zIndex="760",p.appWindow.style.transition="none",p.appWindow.style.opacity="1",p.appWindow.style.filter="",p.windowShadowLayer&&(p.windowShadowLayer.style.opacity="0"),p.windowGlowLayer&&(p.windowGlowLayer.style.opacity="0");const E={stiffness:260,damping:30,mass:1},b=new Ge({...E,initialValue:r,initialVelocity:0});b.target=f;const k=new Sr(E,c,d,0,0);k.setTarget(m,h);const M=1/120,L=30;let P=0,A=performance.now();function N(B){let W=(B-A)/1e3;A=B,W>.25&&(W=.25),P+=W;let Q=0;for(;P>=M&&Q<L;)b.update(M),k.update(M),P-=M,Q++;P>=M&&(P=0);const Pe=b.x,_e=k.x.x,Ye=k.y.x,oi=I((Pe-r)/(f-r||1),0,1),li=u+(v-u)*oi;if(p.appWindow.style.transform=`translate3d(${_e.toFixed(2)}px, ${Ye.toFixed(2)}px, 0px) scale(${Pe.toFixed(5)})`,p.appWindow.style.borderRadius=`${li.toFixed(1)}px`,x(Pe,n/2+_e,a/2+Ye),b.isSettled(.001,.01)&&k.isSettled(.5,4)){p.appWindow.classList.remove("open","closing"),p.appWindow.style.transform="",p.appWindow.style.borderRadius="",p.appWindow.style.zIndex="",p.appWindow.style.transition="",s.isClosing=!1,s.isOpen=!0,s.rafId=null,x(f,n/2+m,a/2+h),t&&t();return}s.rafId=requestAnimationFrame(N)}s.rafId=requestAnimationFrame(N)}function wt(e=0,t=0,i=0,n=null){if(!s.isOpen&&!s.isClosing)return;Qn(),s.isClosing||We("app_close"),s.popInProgress=!1,s.isClosing=!0;try{Po(!0)}catch{}try{window.__closeThemePicker&&window.__closeThemePicker()}catch{}if(s.currentApp)try{rd([s.currentApp.id])}catch{}if(p.appWindow.classList.add("closing"),p.appWindow.style.pointerEvents="none",s.currentApp){const c=Vm(s.currentApp.id);if(c){p.folderOverlay.classList.contains("active")&&p.folderTitle.dataset.folderId===c.id?(p.folderOverlay.style.transition="none",p.folderOverlay.style.pointerEvents="none"):yd(c,s.currentApp.id);const y=p.folderOverlay.querySelector(".folder-panel");y&&(y.style.transition="none"),s.returnToFolderOnClose=!0;const x=p.folderGrid.querySelector(`.app-icon[data-id="${s.currentApp.id}"]`);x&&(s.currentIconEl=x)}const d=Ar(s.currentApp);d.el&&!s.currentIconEl&&(s.currentIconEl=d.el);const u=s.iconCX,f=s.iconCY,m=n&&Bd(n.shrinkTo)?n.shrinkTo:null;m?(s.iconCX=m.left+m.width/2,s.iconCY=m.top+m.height/2,s.iconW=m.width,s.iconH=m.height,p.appWindow.style.zIndex="760",p.windowShadowLayer&&(p.windowShadowLayer.style.zIndex="759"),s.shrinkToCard=!0,s.currentIconEl=null):(s.shrinkToCard=!1,s.iconCX=d.cx,s.iconCY=d.cy,s.iconW=d.w,s.iconH=d.h),s.posSpring.x.x+=u-s.iconCX,s.posSpring.y.x+=f-s.iconCY}(D.context!=="desktop"||D.items.length===0)&&Ba(s.currentIconEl||null,1),Di(0);const r=I(e*.08,-80,80),o=I(t*.08,-80,80),l=I(i*.06,-.6,0);s.posSpring.setTarget(0,0,r,o),s.scaleSpring.setTarget(0,l),Be(Kt())}let Pl=!1;function Pd(){if(Pl)return;Pl=!0;const e=t=>{if(s.isEditMode||s.iconDragState||s.lastGestureMoved&&performance.now()-s.lastGestureEndedAt<500||t.target&&t.target.closest&&t.target.closest("#recentAppsOverlay")||!(s.isClosing||s.isOpen&&s.scaleSpring.x<.96))return;const n=t.clientX??(t.touches&&t.touches[0]?t.touches[0].clientX:t.changedTouches&&t.changedTouches[0]?t.changedTouches[0].clientX:null),a=t.clientY??(t.touches&&t.touches[0]?t.touches[0].clientY:t.changedTouches&&t.changedTouches[0]?t.changedTouches[0].clientY:null);if(n===null||a===null)return;let r=document.elementFromPoint(n,a)||t.target;if(!r)return;let o=r.closest?r.closest(".app-icon"):null,l=r.closest?r.closest(".app-folder"):null;if(!o&&!l&&document.elementsFromPoint){const c=document.elementsFromPoint(n,a);for(const d of c)if(!o&&d.closest&&(o=d.closest(".app-icon")),!l&&d.closest&&(l=d.closest(".app-folder")),o||l)break}if(o&&o.dataset&&o.dataset.id){const c=o.dataset.id,d=F.findIndex(u=>u.id===c);if(d!==-1){t.preventDefault(),t.stopPropagation(),t.stopImmediatePropagation&&t.stopImmediatePropagation(),H(d,o);return}}if(l&&l.dataset&&l.dataset.id){const c=l.dataset.id;let d=null;for(let u of s.pagesApps){for(let f of u)if(f&&f.id===c&&f.type==="folder"){d=f;break}if(d)break}if(d){t.preventDefault(),t.stopPropagation(),t.stopImmediatePropagation&&t.stopImmediatePropagation(),s.currentApp&&(s.isOpen||s.isClosing)&&Hn(),ce(()=>Promise.resolve().then(()=>Em),void 0,import.meta.url).then(u=>u.openFolder(d,l));return}}if(s.isClosing&&s.currentApp){const c=r.closest?r.closest(".app-window"):null;if(c&&!c.classList.contains("closing-actor")){t.preventDefault(),t.stopPropagation(),t.stopImmediatePropagation&&t.stopImmediatePropagation();const d=F.findIndex(u=>u.id===s.currentApp.id);if(d!==-1){H(d,s.currentIconEl);return}}}};window.addEventListener("pointerdown",e,{capture:!0,passive:!1}),window.addEventListener("touchstart",e,{capture:!0,passive:!1}),window.addEventListener("click",e,{capture:!0,passive:!1})}typeof window<"u"&&(Pd(),window.__parallelDebug=()=>({actors:ue.map(e=>({z:parseInt(e.element.style.zIndex,10),iconW:Math.round(e.iconW),iconCX:Math.round(e.iconCX),iconCY:Math.round(e.iconCY),hasContent:!!(e.pageStackEl||e.header),contentChildren:e.element.children.length}))}),window.__findTarget=e=>{const t=F.find(n=>n.id===e)||null,i=Ar(t);return{cx:Math.round(i.cx),cy:Math.round(i.cy),w:Math.round(i.w),el:i.el?i.el.dataset.id||i.el.className:null}},window.__animPresets.apply=e=>{Yu(e);const t=Te(),i=Kt();s.posSpring&&(s.posSpring.reconfigure(t),s.scaleSpring&&s.scaleSpring.reconfigure(t)),ue.forEach(n=>{n.posSpring&&n.posSpring.reconfigure(i),n.scaleSpring&&n.scaleSpring.reconfigure(i)})});const Ny=Object.freeze(Object.defineProperty({__proto__:null,clearPendingSwitchRebound:Qn,closeApp:wt,demoteCurrentAppToClosingActor:Hn,flushGestureRender:Go,flyAppToCard:Fd,initTouchPriorityDispatcher:Pd,isParallelAnimationActive:Td,openApp:H,render:Oi,renderSubPages:Lr,retargetRadialField:Di,scheduleGestureRender:Fa,startLoop:Be,syncRadialFieldToProgress:Id},Symbol.toStringTag,{value:"Module"}));let Nn=215;try{const e=localStorage.getItem("ios-desktop:theme-hue");e&&(Nn=parseInt(e,10)||215)}catch{}const er=[{name:"Pixel 10 极光流光",url:"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",hue:215},{name:"Material You 抽象几何",url:"https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80",hue:165},{name:"深邃暗夜星云",url:"https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80",hue:275},{name:"赛博落日余晖",url:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",hue:35}];function Xo(){return Nn}function Xm(e,t="dark"){return t==="light"?`
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
    --md-outline-variant: hsl(${e}, 12%, 24%);
    --md-accent: hsl(${e}, 92%, 68%);
    --md-accent-container: hsl(${e}, 85%, 20%);
  `}function zd(e,t="dark"){return`
    :root {
      ${Xm(e,t)}
    }
    .md3-dynamic-accent { color: var(--md-accent) !important; }
    .md3-dynamic-bg { background-color: var(--md-surface) !important; }
    .md3-dynamic-card { background-color: var(--md-surface-container) !important; border-color: var(--md-outline-variant) !important; }
  `}function jm(){Qm(),window.openThemePicker=Fr,window.__themeHueTest={get:()=>Nn,set:e=>je(e,!1)},window.__closeThemePicker=Uo,window.__closeThemePickerAnimated=Dd,Km(),jf({id:"themePicker",isActive:()=>{const e=Vt();return!!(e&&e.classList.contains("active")&&!_.dragging&&!_.x)},beginGesture:e=>window.__themePickerGesture.begin(e),progressGesture:e=>window.__themePickerGesture.progress(e),commitGesture:e=>window.__themePickerGesture.commit(e),cancelGesture:e=>window.__themePickerGesture.cancel(e)}),je(Nn,!1)}const Ym=.35,ga=4e3,_={loop:0,pos2:null,x:null,dragging:!1,dir:1,cleanupTimer:0,closeDone:null};function Vt(){return document.getElementById("themePickerOverlay")}function Tt(){return document.getElementById("themePickerCard")}function Br(){_.loop&&(cancelAnimationFrame(_.loop),_.loop=0)}function $d(){Br(),_.pos2=null,_.x=null,_.dragging=!1,_.closeDone=null;const e=Vt(),t=Tt();t&&(t.style.transition="",t.style.willChange="",t.style.transform=""),e&&(e.style.transition="",e.style.willChange="",e.style.opacity="",delete e.dataset.gesturing)}function tr(){Br();const e=Tt();if(!e)return;let t=performance.now();const i=n=>{const a=Math.min((n-t)/1e3,.03333333333333333)||.016666666666666666;t=n;let r=!1,o=0,l=0,c=1;_.pos2&&(_.pos2.update(a),o=_.pos2.px,l=_.pos2.py,Math.abs(_.pos2.x.v)<20&&Math.abs(_.pos2.y.v)<20&&Math.abs(o-_.pos2.x.target)<.5&&Math.abs(l-_.pos2.y.target)<.5?_.pos2=null:r=!0);let d=!1;if(_.x&&(_.x.update(a),o=_.x.x,l=0,c=1,d=!0,Math.abs(_.x.v)<20&&Math.abs(o-_.x.target)<.5?(_.x=null,d=!1,o=0):r=!0),_.pos2||d)e.style.transform=`translate3d(${o.toFixed(2)}px, ${l.toFixed(2)}px, 0) scale(${c.toFixed(4)})`;else{e.style.transform="",e.style.willChange="";const u=_.closeDone;_.closeDone=null,u&&u()}_.loop=r||_.closeDone?requestAnimationFrame(i):0};_.loop=requestAnimationFrame(i)}function Um(){const e=Tt();if(!e)return;const t=window.innerWidth,i=Te();_.pos2=new Sr(i,t+80,0,0,0),_.pos2.setTarget(0,0,0,0),_.x=null,e.style.willChange="transform",e.style.transform=`translate3d(${(t+80).toFixed(2)}px, 0, 0)`,tr()}function Dd(){const e=Vt(),t=Tt();!e||!t||!e.classList.contains("active")||_.dragging||_.x||_.closeDone||(_.pos2&&(Br(),_.pos2=null,_.closeDone=null,t.style.transform="",t.style.willChange=""),e.style.transition="opacity 0.22s ease",e.style.opacity="0",_.x=new Ge({...Kt(),initialValue:0}),_.x.setTarget(window.innerWidth+80,null),_.closeDone=()=>{Uo(),e.style.transition="",e.style.opacity=""},tr())}function Km(){window.__themePickerGesture={isActive:()=>{const e=Vt();return!!(e&&e.classList.contains("active")&&!_.dragging&&!_.x)},begin(e){const t=Vt(),i=Tt();!t||!i||!t.classList.contains("active")||(_.pos2&&(Br(),_.pos2=null,i.style.transform="",i.style.willChange=""),clearTimeout(_.cleanupTimer),_.dragging=!0,_.dir=e>=0?1:-1,i.style.willChange="transform",t.dataset.gesturing="1",_.cleanupTimer=setTimeout(()=>{delete Vt()?.dataset.gesturing},1200))},progress(e){if(!_.dragging)return;const t=Tt();if(!t)return;const i=(e>0?e:e*Ym)*_.dir;t.style.transform=`translate3d(${i.toFixed(2)}px, 0, 0)`},commit(e){if(!_.dragging)return;_.dragging=!1;const t=Tt();if(!t)return;const i=/translate3d\(([-\d.]+)px/.exec(t.style.transform||""),n=i?parseFloat(i[1]):0,a=window.innerWidth;_.x=new Ge({...Kt(),initialValue:n,initialVelocity:Math.max(-ga,Math.min(ga,(e||0)*_.dir))}),_.x.setTarget(_.dir*(a+80),null),_.closeDone=()=>Uo(),tr()},cancel(e){if(!_.dragging)return;_.dragging=!1;const t=Tt();if(!t)return;const i=/translate3d\(([-\d.]+)px/.exec(t.style.transform||""),n=i?parseFloat(i[1]):0;_.x=new Ge({...Kt(),initialValue:n,initialVelocity:Math.max(-ga,Math.min(ga,(e||0)*_.dir))}),_.x.setTarget(0,null),_.closeDone=()=>{const a=Vt();a&&delete a.dataset.gesturing},tr()}}}function Qm(){let e=document.getElementById("themePickerOverlay");if(e)return;e=document.createElement("div"),e.id="themePickerOverlay",e.className="theme-picker-overlay",e.innerHTML=`
    <div class="theme-picker-card" id="themePickerCard">
      <div class="theme-picker-header">
        <div class="theme-picker-title" id="themePickerTitle">${g.image} 壁纸与动态壁纸</div>
        <span class="theme-picker-header-space"></span>
      </div>

      <!-- 单层页面：所有设置一屏直达；返回 = 边缘滑出（整页跟手，透出桌面）或 Esc -->
      <div class="theme-body" id="themeWallpaperView">
        <!-- 当前壁纸状态行（实时缩略图 + 摘要，不可点击） -->
        <div class="theme-section">
          <div class="theme-nav-row static" id="themeWallpaperNav">
            <div class="theme-nav-preview" id="themeNavWallpaperThumb"></div>
            <div class="theme-nav-texts">
              <div class="theme-nav-title">当前壁纸</div>
              <div class="theme-nav-sub" id="themeNavWallpaperSub">静态 / 动态 / 视频</div>
            </div>
          </div>
        </div>

        <!-- 外观模式：跟随系统 / 浅色 / 深色 -->
        <div class="theme-section theme-mode-section">
          <div class="theme-section-label">外观模式</div>
          <div class="theme-mode-row" id="themeModeRow">
            <div class="theme-mode-opt" data-mode="auto">跟随系统</div>
            <div class="theme-mode-opt" data-mode="light">浅色</div>
            <div class="theme-mode-opt" data-mode="dark">深色</div>
          </div>
        </div>

        <!-- 程序化动态壁纸（大卡位） -->
        <div class="theme-section">
          <div class="theme-section-label">程序化动态壁纸<span class="theme-live-badge">实时渲染 · 高清</span></div>
          <div class="proc-grid" id="themeDynamicGrid"></div>
          <div class="theme-section-hint">代码实时绘制，不占存储空间；动态壁纸与静态/视频壁纸二选一，后选者优先</div>
        </div>

        <!-- 静态壁纸精选库 -->
        <div class="theme-section">
          <div class="theme-section-label">静态壁纸 · 精选库</div>
          <div class="theme-wallpapers-grid compact" id="themeWallpapersGrid"></div>
        </div>

        <!-- 自定义上传（静态/动态自动识别） -->
        <div class="theme-section">
          <div class="theme-section-label">自定义壁纸</div>
          <button class="theme-upload-zone" id="themeUploadAnyBtn">
            ${g.folder}
            <span class="theme-upload-zone-texts">
              <span class="theme-upload-zone-title">上传图片 / 视频</span>
              <span class="theme-upload-zone-sub">自动识别：图片 → 静态壁纸，视频 → 动态壁纸</span>
            </span>
          </button>
          <div class="theme-section-hint">支持 JPG / PNG / WebP 图片与 MP4 / WebM 视频，视频上限 200MB；上传视频后会自动提取画面主题色联动全局配色</div>
        </div>
      </div>
    </div>
  `,e.addEventListener("click",i=>{e.dataset.gesturing==="1"&&(i.stopPropagation(),i.preventDefault())},!0),document.body.appendChild(e),document.getElementById("themeUploadAnyBtn").addEventListener("click",()=>{Co(),Dd()});const t=document.getElementById("themeModeRow");t&&t.querySelectorAll(".theme-mode-opt").forEach(i=>{i.addEventListener("click",()=>{Xi(i.dataset.mode),Yo()})}),eh(),ih()}function jo(){const e=document.getElementById("themeNavWallpaperSub");if(!e)return;let t="静态 / 动态 / 视频";try{if(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive())t="当前使用：视频动态壁纸";else{const i=Ct();if(i){const n=Xt.find(a=>a.id===i);t=`当前使用：${n?n.name:"程序化"}动态壁纸`}else t=localStorage.getItem("ios-desktop:wallpaper")||""?"当前使用：自定义 / 预设静态壁纸":"静态 / 动态 / 视频"}}catch{}e.textContent=t}function Jm(){const e=document.getElementById("themeNavWallpaperThumb");if(!e)return;let t="";try{if(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive())t=window.__videoWallpaper.getVideoFrameDataURL()||"";else if(Ct())t=jn()||"";else{const n=(document.getElementById("desktop")?.style.backgroundImage||"").match(/url\(["']?(.+?)["']?\)/);t=n?n[1]:""}}catch{}e.style.backgroundImage=t?`url('${t}')`:"none",e.classList.toggle("empty",!t)}function Zm(){jo(),Jm()}function Yo(){const e=document.getElementById("themeModeRow");if(!e)return;const t=Lo();e.querySelectorAll(".theme-mode-opt").forEach(i=>{i.classList.toggle("active",i.dataset.mode===t)})}function eh(){Yo()}function th(){const e=document.getElementById("themeDynamicGrid");if(!e)return;const t=Ct();e.innerHTML=Xt.map((i,n)=>`
    <div class="wallpaper-thumb-card proc-card ${n===0?"proc-hero":""} ${i.id===t?"active":""}" data-proc="${i.id}">
      <div class="wallpaper-thumb-img" style="background-image: url('${Xc(i.id)}');"></div>
      <span class="proc-live-badge">LIVE</span>
      <span class="wallpaper-thumb-name">${i.name}</span>
    </div>
  `).join(""),e.querySelectorAll("[data-proc]").forEach(i=>{i.addEventListener("click",()=>{const n=i.dataset.proc,a=Xt.find(r=>r.id===n);if(a){Ai(),Bt();try{localStorage.removeItem("ios-desktop:wallpaper"),sessionStorage.removeItem("ios-desktop:wallpaper")}catch{}$n(n),je(a.hue,!1),jo(),e.querySelectorAll("[data-proc]").forEach(r=>r.classList.remove("active")),i.classList.add("active")}})})}function ih(){const e=document.getElementById("themeWallpapersGrid");e&&(e.innerHTML=er.map((t,i)=>`
    <div class="wallpaper-thumb-card" data-idx="${i}">
      <div class="wallpaper-thumb-img" style="background-image: url('${t.url}');"></div>
      <span class="wallpaper-thumb-name">${t.name}</span>
    </div>
  `).join(""),e.querySelectorAll(".wallpaper-thumb-card").forEach(t=>{t.addEventListener("click",()=>{const i=parseInt(t.dataset.idx,10),n=er[i];if(n){Ai(),Yn(),Bt(),si();try{document.getElementById("themeUploadAnyBtn")?.classList.remove("active"),e.querySelectorAll("[data-proc]").forEach(a=>a.classList.remove("active"))}catch{}p.desktop.style.backgroundImage=`url('${n.url}')`;try{localStorage.setItem("ios-desktop:wallpaper",n.url)}catch{}je(n.hue,!0),document.querySelectorAll("iframe").forEach(a=>{try{a.contentWindow.postMessage({type:"set-wallpaper",url:n.url},"*")}catch{}}),window.showSystemToast&&window.showSystemToast(`已应用壁纸与主题色: ${n.name}`,g.palette),jo()}})}))}function je(e,t=!0){Nn=e;const i=nt()==="light"?"light":"dark",n=i==="light",a=document.documentElement;a.style.setProperty("--md-h",e),a.style.setProperty("--h",e),a.style.setProperty("--md-primary",`hsl(${e}, ${n?"78%, 38%":"82%, 36%"})`),a.style.setProperty("--md-on-primary","#ffffff"),a.style.setProperty("--md-primary-container",`hsl(${e}, ${n?"88%, 90%":"85%, 22%"})`),a.style.setProperty("--md-on-primary-container",n?`hsl(${e}, 60%, 16%)`:`hsl(${e}, 92%, 92%)`),a.style.setProperty("--md-secondary",`hsl(${e}, ${n?"32%, 38%":"28%, 46%"})`),a.style.setProperty("--md-tertiary",`hsl(${(e+60)%360}, 65%, 40%)`),a.style.setProperty("--md-surface",`hsl(${e}, ${n?"40%, 98%":"18%, 8%"})`),a.style.setProperty("--md-surface-container",`hsl(${e}, ${n?"32%, 93%":"16%, 14%"})`),a.style.setProperty("--md-accent",`hsl(${e}, ${n?"85%, 40%":"92%, 68%"})`),a.style.setProperty("--md-outline-variant",`hsl(${e}, ${n?"18%, 82%":"12%, 24%"})`);try{localStorage.setItem("ios-desktop:theme-hue",String(e))}catch{}document.querySelectorAll("iframe").forEach(r=>{try{const o=r.contentDocument||r.contentWindow&&r.contentWindow.document;if(o&&o.head){let l=o.getElementById("md3-dynamic-injected-theme");l||(l=o.createElement("style"),l.id="md3-dynamic-injected-theme",o.head.appendChild(l)),l.textContent=zd(e,i)}o&&o.documentElement&&(o.documentElement.style.setProperty("--md-h",e),o.documentElement.style.setProperty("--h",e)),o&&o.documentElement&&(o.documentElement.dataset.themeMode=i),r.contentWindow&&r.contentWindow.postMessage({type:"set-theme-hue",hue:e,mode:i},"*")}catch{}}),t&&window.showSystemToast&&window.showSystemToast(`已应用 Material You 主题色 (色相 ${e}°)`,g.auto_awesome)}function nh(e){if(!e)return;e.innerHTML=`
    <div style="padding:16px 0;">
      <!-- 当前壁纸状态行 -->
      <div class="theme-section" style="margin-bottom:16px;">
        <div class="theme-nav-row static" id="setNavWallpaperRow" style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--md-surface-container,#232529);border-radius:18px;">
          <div class="theme-nav-preview" id="setNavWallpaperThumb" style="width:54px;height:72px;border-radius:10px;background-size:cover;background-position:center;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.12));flex:none;"></div>
          <div class="theme-nav-texts" style="flex:1;">
            <div class="theme-nav-title" style="font-size:15px;font-weight:600;color:var(--md-on-surface);">当前壁纸</div>
            <div class="theme-nav-sub" id="setNavWallpaperSub" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;">静态 / 动态 / 视频</div>
          </div>
        </div>
      </div>

      <!-- 外观模式 -->
      <div class="theme-section theme-mode-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">外观模式</div>
        <div class="theme-mode-row" id="setThemeModeRow" style="display:flex;gap:8px;background:var(--md-surface-container,#232529);padding:4px;border-radius:14px;">
          <div class="theme-mode-opt" data-mode="auto" style="flex:1;text-align:center;padding:10px 0;font-size:13px;font-weight:500;border-radius:10px;cursor:pointer;color:var(--md-on-surface-variant);">跟随系统</div>
          <div class="theme-mode-opt" data-mode="light" style="flex:1;text-align:center;padding:10px 0;font-size:13px;font-weight:500;border-radius:10px;cursor:pointer;color:var(--md-on-surface-variant);">浅色</div>
          <div class="theme-mode-opt" data-mode="dark" style="flex:1;text-align:center;padding:10px 0;font-size:13px;font-weight:500;border-radius:10px;cursor:pointer;color:var(--md-on-surface-variant);">深色</div>
        </div>
      </div>

      <!-- 程序化动态壁纸 -->
      <div class="theme-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;display:flex;align-items:center;justify-content:space-between;">
          <span>程序化动态壁纸</span>
          <span class="theme-live-badge" style="font-size:10px;padding:2px 6px;border-radius:6px;background:hsl(var(--md-h,215) 80% 55% / 0.18);color:hsl(var(--md-h,215) 85% 65%);">实时渲染 · 高清</span>
        </div>
        <div class="proc-grid" id="setDynamicGrid" style="display:grid;grid-template-columns:repeat(2, 1fr);gap:10px;"></div>
        <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:6px 4px 0;opacity:0.8;">代码实时绘制，不占存储空间；动态壁纸与静态/视频壁纸二选一</div>
      </div>

      <!-- 静态壁纸精选库 -->
      <div class="theme-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">静态壁纸 · 精选库</div>
        <div class="theme-wallpapers-grid compact" id="setWallpapersGrid" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;"></div>
      </div>

      <!-- 自定义壁纸 -->
      <div class="theme-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">自定义壁纸</div>
        <button class="theme-upload-zone" id="setUploadBtn" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--md-surface-container,#232529);border:1.5px dashed var(--md-outline-variant,rgba(255,255,255,0.2));border-radius:16px;cursor:pointer;color:var(--md-on-surface);text-align:left;">
          ${g.folder}
          <span style="display:flex;flex-direction:column;gap:3px;">
            <span style="font-size:14px;font-weight:600;">上传图片 / 视频</span>
            <span style="font-size:12px;color:var(--md-on-surface-variant);">自动识别：图片 → 静态壁纸，视频 → 动态壁纸</span>
          </span>
        </button>
      </div>
    </div>
  `;function t(){const o=e.querySelector("#setNavWallpaperThumb"),l=e.querySelector("#setNavWallpaperSub");if(l){let d="静态 / 动态 / 视频";try{if(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive())d="当前使用：视频动态壁纸";else{const u=Ct();if(u){const f=Xt.find(m=>m.id===u);d=`当前使用：${f?f.name:"程序化"}动态壁纸`}else d=localStorage.getItem("ios-desktop:wallpaper")||""?"当前使用：自定义 / 预设静态壁纸":"静态 / 动态 / 视频"}}catch{}l.textContent=d}if(o){let d="";try{if(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive())d=window.__videoWallpaper.getVideoFrameDataURL()||"";else if(Ct())d=jn()||"";else{const f=(document.getElementById("desktop")?.style.backgroundImage||"").match(/url\(["']?(.+?)["']?\)/);d=f?f[1]:""}}catch{}o.style.backgroundImage=d?`url('${d}')`:"none"}const c=e.querySelector("#setThemeModeRow");if(c){const d=Lo();c.querySelectorAll(".theme-mode-opt").forEach(u=>{const f=u.dataset.mode===d;u.style.background=f?"hsl(var(--md-h,215) 80% 55% / 0.25)":"transparent",u.style.color=f?"hsl(var(--md-h,215) 85% 65%)":"var(--md-on-surface-variant)",u.style.fontWeight=f?"600":"500"})}}const i=e.querySelector("#setThemeModeRow");i&&i.querySelectorAll(".theme-mode-opt").forEach(o=>{o.addEventListener("click",()=>{Xi(o.dataset.mode),t()})});const n=e.querySelector("#setDynamicGrid");if(n){const o=Ct();n.innerHTML=Xt.map((f,m)=>`
      <div class="wallpaper-thumb-card proc-card ${m===0?"proc-hero":""} ${f.id===o?"active":""}" data-proc="${f.id}" style="cursor:pointer;position:relative;border-radius:14px;overflow:hidden;border:1.5px solid ${f.id===o?"hsl(var(--md-h,215) 85% 60%)":"transparent"};background:var(--md-surface-container-high,#2f3136);">
        <div data-proc-thumb="${f.id}" style="height:86px;background-color:var(--md-surface-container-high,#2f3136);background-size:cover;background-position:center;"></div>
        <div style="padding:8px 10px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:600;color:var(--md-on-surface);">${f.name}</span>
          <span style="font-size:9px;padding:2px 5px;border-radius:4px;background:hsl(var(--md-h,215) 80% 55% / 0.2);color:hsl(var(--md-h,215) 85% 65%);font-weight:700;">LIVE</span>
        </div>
      </div>
    `).join("");const l=Array.from(n.querySelectorAll("[data-proc-thumb]"));let c=0;const d=()=>{if(c>=l.length)return;const f=l[c++],m=Xc(f.dataset.procThumb);f.isConnected&&m&&(f.style.backgroundImage=`url('${m}')`),c<l.length&&u()},u=()=>{typeof requestIdleCallback=="function"?requestIdleCallback(d,{timeout:900}):setTimeout(d,64)};l.length&&u(),n.querySelectorAll("[data-proc]").forEach(f=>{f.addEventListener("click",()=>{const m=f.dataset.proc,h=Xt.find(v=>v.id===m);if(h){Ai(),Bt();try{localStorage.removeItem("ios-desktop:wallpaper"),sessionStorage.removeItem("ios-desktop:wallpaper")}catch{}$n(m),je(h.hue,!1),t(),n.querySelectorAll("[data-proc]").forEach(v=>{const y=v.dataset.proc===m;v.style.borderColor=y?"hsl(var(--md-h,215) 85% 60%)":"transparent"})}})})}const a=e.querySelector("#setWallpapersGrid");a&&(a.innerHTML=er.map((o,l)=>`
      <div class="wallpaper-thumb-card" data-idx="${l}" style="cursor:pointer;border-radius:12px;overflow:hidden;background:var(--md-surface-container-high,#2f3136);border:1.5px solid transparent;">
        <div style="height:90px;background-size:cover;background-position:center;background-image:url('${o.url}');"></div>
        <div style="padding:6px 8px;font-size:11px;font-weight:500;color:var(--md-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.name}</div>
      </div>
    `).join(""),a.querySelectorAll(".wallpaper-thumb-card").forEach(o=>{o.addEventListener("click",()=>{const l=parseInt(o.dataset.idx,10),c=er[l];if(c){Ai(),Yn(),Bt(),si(),p.desktop.style.backgroundImage=`url('${c.url}')`;try{localStorage.setItem("ios-desktop:wallpaper",c.url)}catch{}je(c.hue,!0),document.querySelectorAll("iframe").forEach(d=>{try{d.contentWindow.postMessage({type:"set-wallpaper",url:c.url},"*")}catch{}}),window.showSystemToast&&window.showSystemToast(`已应用壁纸: ${c.name}`,g.palette),t(),n&&n.querySelectorAll("[data-proc]").forEach(d=>{d.style.borderColor="transparent"})}})}));const r=e.querySelector("#setUploadBtn");r&&r.addEventListener("click",()=>{Co()}),t()}window.__initWallpaperPage=nh;function Fr(e=null){const t=F.findIndex(a=>a.id==="settings");if(t!==-1){!s.isOpen||!s.currentApp||s.currentApp.id!=="settings"?(H(t,e),setTimeout(()=>{Ps(13)},260)):Ps(13);return}const i=document.getElementById("themePickerOverlay");if(!i||i.classList.contains("active"))return;$d(),th(),Yo(),Zm(),i.classList.add("active");const n=document.getElementById("themeWallpaperView");n&&(n.scrollTop=0),Um()}window.openWallpaperSettings=Fr;window.openThemePicker=Fr;window.__openWallpaperSubView=Fr;function Uo(){const e=document.getElementById("themePickerOverlay");e&&(e.classList.remove("active"),clearTimeout(_.cleanupTimer),$d())}const Od=new Map;function ah(e){!e.data||e.data.type!=="PB_STATE"||!e.source||Od.set(e.source,{canBack:!!e.data.canBack})}function rh(e){try{e&&e.contentWindow&&e.contentWindow.postMessage({type:"PB_SYNC_REQ"},"*")}catch{}}function Rd(){if(!s.isOpen||s.isClosing||!s.currentApp||typeof window<"u"&&window.__splitInfo&&window.__splitInfo().active)return null;const e=document.getElementById("app-instance-"+s.currentApp.id),t=e?e.querySelectorAll("iframe"):[];for(const i of t){if(!i.contentWindow)continue;const n=Od.get(i.contentWindow);if(n)return{win:i.contentWindow,canBack:n.canBack}}return null}function qn(e,t){try{e&&e.postMessage(t,"*")}catch{}}function Hd(e){if(!e)return;const t=Xo(),i=nt()==="light"?"light":"dark";try{const n=e.contentDocument||e.contentWindow&&e.contentWindow.document;if(n&&n.head){let a=n.getElementById("md3-dynamic-injected-theme");a||(a=n.createElement("style"),a.id="md3-dynamic-injected-theme",n.head.appendChild(a)),a.textContent=zd(t,i)}n&&n.documentElement&&(n.documentElement.style.setProperty("--md-h",t),n.documentElement.style.setProperty("--h",t),n.documentElement.dataset.themeMode=i)}catch{}try{e.contentWindow&&e.contentWindow.postMessage({type:"set-theme-hue",hue:t,mode:i},"*")}catch{}}window.__syncIframeApp||(window.__syncIframeApp=function(e){Hd(e),rh(e)});function sh(e){try{const i=new URL(import.meta.url).pathname.match(/^(.*\/ios-desktop)\/js\/[^/]+$/);if(i&&!e.startsWith("/")&&!e.startsWith("http"))return(i[1]+"/"+e).replace(/\/{2,}/g,"/")}catch{}return e}function K(e){return`<div style="position:absolute;inset:0;width:100%;height:100%;overflow:hidden;border-radius:0;background:var(--md-surface,#121316);">
    <iframe src="${sh(e)}"
      style="width:100%;height:100%;border:none;display:block;"
      allow="autoplay; fullscreen; microphone; geolocation; camera; display-capture"
      loading="eager"
      onload="this.dataset.loaded='1';window.__syncIframeApp&&window.__syncIframeApp(this)">
    </iframe>
  </div>`}const oh={id:"msg",name:"信息",pages:[{title:"信息",content:K("apps/messages/index.html")}]},lh={id:"mail",name:"邮件",pages:[{title:"收件箱",content:`
        <div style="padding:16px 0;position:relative;min-height:100%;">
          <!-- 搜索栏 MD3 Search Bar -->
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:16px;border:1px solid var(--md-outline-variant);">
            <span style="font-size:18px;color:var(--md-on-surface-variant);">${g.search}</span>
            <input type="text" placeholder="搜索邮件..." style="background:transparent;border:none;outline:none;color:var(--md-on-surface);font-size:14px;width:100%;">
          </div>

          <!-- 邮件列表 MD3 Cards -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div class="md3-card" style="cursor:pointer;padding:14px 16px;" onclick="pushSubPage(1)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:8px;height:8px;border-radius:50%;background:var(--md-primary);"></div>
                  <span style="font-size:15px;font-weight:600;color:var(--md-on-surface);">GitHub</span>
                </div>
                <span style="font-size:12px;color:var(--md-on-surface-variant);">09:24</span>
              </div>
              <div style="font-size:13px;font-weight:500;color:var(--md-primary);margin-bottom:2px;">[PR] Fix spring animation overflow bug — 已合并</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">你的 Pull Request #142 已被批准并合并到 main 分支...</div>
            </div>

            <div class="md3-card" style="cursor:pointer;padding:14px 16px;" onclick="pushSubPage(2)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:8px;height:8px;border-radius:50%;background:transparent;"></div>
                  <span style="font-size:15px;font-weight:600;color:var(--md-on-surface);">Apple / Google Security</span>
                </div>
                <span style="font-size:12px;color:var(--md-on-surface-variant);">昨天</span>
              </div>
              <div style="font-size:13px;font-weight:500;color:var(--md-on-surface);margin-bottom:2px;">您的账号在新设备上登录</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">您的账号于 2026-08-12 14:20 在 MacBook Pro (M3) 上成功登录...</div>
            </div>

            <div class="md3-card" style="cursor:pointer;padding:14px 16px;" onclick="pushSubPage(3)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:8px;height:8px;border-radius:50%;background:transparent;"></div>
                  <span style="font-size:15px;font-weight:600;color:var(--md-on-surface);">团队周报</span>
                </div>
                <span style="font-size:12px;color:var(--md-on-surface-variant);">周一</span>
              </div>
              <div style="font-size:13px;font-weight:500;color:var(--md-on-surface);margin-bottom:2px;">第 32 周工作总结与下周计划</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">1. 桌面模拟器动画引擎重构完成；2. MD3 表达性滑块上线...</div>
            </div>
          </div>

          <!-- 浮动写邮件按钮 MD3 FAB -->
          <div style="position:fixed;bottom:24px;right:24px;z-index:10;">
            <button class="md3-fab" onclick="pushSubPage(4)">
              <span style="font-size:24px;">${g.edit}</span>
            </button>
          </div>
        </div>
      `},{title:"邮件详情",content:`
        <div style="padding:16px 0;">
          <div class="md3-card" style="margin-bottom:16px;">
            <h2 style="font-size:18px;font-weight:600;line-height:1.4;color:var(--md-on-surface);margin-bottom:10px;">[PR] Fix spring animation overflow bug — approved</h2>
            <div style="display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid var(--md-outline-variant);">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--md-secondary-container);display:flex;align-items:center;justify-content:center;font-size:18px;">${g.code}</div>
              <div style="flex:1;">
                <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);">GitHub</div>
                <div style="font-size:12px;color:var(--md-on-surface-variant);">noreply@github.com · 09:24</div>
              </div>
            </div>
            <div style="padding-top:16px;font-size:14px;line-height:1.6;color:var(--md-on-surface);">
              <p>Hi,</p>
              <p style="margin:10px 0;">你的 Pull Request <strong>#142</strong> 已被批准并合并到 <code style="background:var(--md-surface-container-highest);padding:2px 8px;border-radius:6px;font-size:13px;color:var(--md-primary);">main</code> 分支。</p>
              <p style="margin:10px 0;">修改内容：重构物理弹簧引擎，优化文件夹打开/返回动画连续性，全面适配 Material Design 3 表达性设计系统与定制圆角间隙滑块。</p>
              <p style="margin-top:16px;">感谢你的卓越贡献！${g.auto_awesome}</p>
              <p style="color:var(--md-on-surface-variant);font-size:12px;margin-top:20px;">— GitHub Notifications</p>
            </div>
          </div>
        </div>
      `},{title:"Apple ID 通知",content:`
        <div style="padding:16px 0;">
          <div class="md3-card">
            <h2 style="font-size:18px;font-weight:600;line-height:1.4;color:var(--md-on-surface);margin-bottom:12px;">您的账号在新设备上登录</h2>
            <div style="font-size:12px;color:var(--md-on-surface-variant);margin-bottom:16px;">Apple &lt;no_reply@email.apple.com&gt; · 昨天 14:30</div>
            <p style="font-size:14px;line-height:1.6;color:var(--md-on-surface);">尊敬的用户，您的账号已于以下时间在一台新设备上登录：</p>
            <div style="background:var(--md-surface-container-high);border-radius:var(--md-r-md);padding:14px;margin:14px 0;font-size:13px;line-height:1.8;">
              <div><strong>日期：</strong>2026 年 8 月 12 日 14:20</div>
              <div><strong>设备：</strong>MacBook Pro (M3 Max)</div>
              <div><strong>位置：</strong>中国上海 (IP: 218.80.xxx.xxx)</div>
            </div>
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:12px;">管理受信任设备</button>
          </div>
        </div>
      `},{title:"团队周报",content:`
        <div style="padding:16px 0;">
          <div class="md3-card">
            <h2 style="font-size:18px;font-weight:600;color:var(--md-on-surface);margin-bottom:8px;">第 32 周工作总结与下周计划</h2>
            <div style="font-size:12px;color:var(--md-on-surface-variant);margin-bottom:16px;">团队周报 &lt;team@company.com&gt; · 周一 10:00</div>
            <div style="font-size:14px;line-height:1.6;color:var(--md-on-surface);">
              <div style="font-weight:600;color:var(--md-primary);margin-bottom:6px;">本周核心成果：</div>
              <p>1. 桌面模拟器动画引擎重构，实现几何无畸变弹簧回归<br>2. 图标长按拖拽重构，提升 120fps 渲染流畅度<br>3. 文件夹内打开应用保留展开状态并在关闭时准确归位<br>4. Material Design 3 表达性滑块深度适配</p>
            </div>
          </div>
        </div>
      `},{title:"写新邮件",content:`
        <div style="padding:16px 0;">
          <div class="md3-card" style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <span style="font-size:12px;color:var(--md-on-surface-variant);">收件人</span>
              <input type="text" placeholder="example@domain.com" style="width:100%;background:transparent;border:none;border-bottom:1px solid var(--md-outline-variant);padding:6px 0;color:var(--md-on-surface);outline:none;font-size:14px;">
            </div>
            <div>
              <span style="font-size:12px;color:var(--md-on-surface-variant);">主题</span>
              <input type="text" placeholder="邮件主题" style="width:100%;background:transparent;border:none;border-bottom:1px solid var(--md-outline-variant);padding:6px 0;color:var(--md-on-surface);outline:none;font-size:14px;">
            </div>
            <div>
              <span style="font-size:12px;color:var(--md-on-surface-variant);">正文</span>
              <textarea placeholder="在这里撰写邮件内容..." style="width:100%;min-height:160px;background:transparent;border:none;padding:8px 0;color:var(--md-on-surface);outline:none;font-size:14px;resize:none;line-height:1.6;"></textarea>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:16px;">
            <button class="md3-btn md3-btn-filled" style="flex:1;" onclick="alert('邮件已发送！');if (window.popSubPage) window.popSubPage();">发送邮件</button>
            <button class="md3-btn md3-btn-tonal" style="flex:1;">存为草稿</button>
          </div>
        </div>
      `}]},ch={id:"photo",name:"相册",pages:[{title:"相册",content:K("apps/photos/index.html")}]},Nd="android16-geek-backup",dh=["android16-zeekr-backup","ios-desktop-backup"],ph=1,qs="ios-desktop-files",qd="kv",uh=8,Vs="ios-desktop:backup-rollback";function ge(e,t){try{typeof window<"u"&&window.showSystemToast&&window.showSystemToast(e,t)}catch{}}function sn(e){return e<10?"0"+e:""+e}function fh(){const e=new Date;return"android16-geek-backup-"+e.getFullYear()+sn(e.getMonth()+1)+sn(e.getDate())+"-"+sn(e.getHours())+sn(e.getMinutes())+sn(e.getSeconds())+".json"}function mh(e){try{return typeof Blob<"u"&&e instanceof Blob}catch{return!1}}function hh(e){if(mh(e))return new Promise(t=>{let i;try{i=new FileReader}catch{t({__backupType:"json",value:null});return}i.onload=()=>{try{const n=String(i.result||""),a=";base64,",r=n.indexOf(a),o=r>=0?n.slice(r+a.length):n;t({__backupType:"blob",mime:e.type||"",name:e.name||"",base64:o})}catch{t({__backupType:"json",value:null})}},i.onerror=()=>t({__backupType:"json",value:null});try{i.readAsDataURL(e)}catch{t({__backupType:"json",value:null})}});try{return Promise.resolve({__backupType:"json",value:JSON.parse(JSON.stringify(e))})}catch{let i;try{i=String(e)}catch{i=null}return Promise.resolve({__backupType:"json",value:i})}}function gh(e,t){const i=atob(e),n=new Uint8Array(i.length);for(let a=0;a<i.length;a++)n[a]=i.charCodeAt(a);return new Blob([n],{type:t||"application/octet-stream"})}function vh(e){if(!e||typeof e!="object")return e;if(e.__backupType==="blob"&&typeof e.base64=="string")try{return gh(e.base64,e.mime)}catch{return null}return e.__backupType==="json"?e.value:e}async function yh(){try{const e={};try{const y=Object.keys(localStorage);for(const x of y)try{e[x]=localStorage.getItem(x)}catch{}}catch{}const t=await Jt(),i=await Jt(),n=y=>y.map(x=>x&&x.key!=null?String(x.key):"").join("");if(n(t)!==n(i)){ge("导出失败：本地数据读取不稳定，请稍后重试");return}const a=t,r=[];for(const y of a)if(!(!y||typeof y.key>"u"||y.key===null))try{const x=await hh(y.value);r.push({key:y.key,value:x})}catch{}let o=null;try{o=localStorage.getItem("ios-desktop:data-version")||null}catch{}const l={format:Nd,version:ph,exportedAt:new Date().toISOString(),dataVersion:o,localStorage:e,indexedDB:{[qs]:{[qd]:r}}},c=JSON.stringify(l,null,2),d=new Blob([c],{type:"application/json"}),u=URL.createObjectURL(d),f=document.createElement("a");f.href=u,f.download=fh(),f.style.display="none",document.body.appendChild(f),f.click();try{f.remove()}catch{}setTimeout(()=>{try{URL.revokeObjectURL(u)}catch{}},3e3);const m=d.size/1024/1024;let v="备份已导出：共 "+(Object.keys(e).length+r.length)+" 条数据（约 "+m.toFixed(1)+" MB）";m>uh&&(v+="，含视频/字体等大文件，体积较大"),ge(v,g.download)}catch(e){ge("导出失败："+(e&&e.message?e.message:"未知错误"))}}function wh(e){return new Promise((t,i)=>{try{const n=new FileReader;n.onload=()=>t(String(n.result||"")),n.onerror=()=>i(new Error("文件读取失败")),n.readAsText(e)}catch(n){i(n)}})}function xh(e){try{const t=e&&e.indexedDB&&e.indexedDB[qs]&&e.indexedDB[qs][qd];return Array.isArray(t)?t:[]}catch{return[]}}function bh(){try{const e={};for(const t of Object.keys(localStorage))try{const i=localStorage.getItem(t);typeof i=="string"&&(e[t]=i)}catch{}return e}catch{return null}}async function on(e,t,i){let n=!0,a=!0;try{localStorage.clear();for(const r of Object.keys(e))try{localStorage.setItem(r,e[r])}catch{n=!1}}catch{n=!1}if(i)try{await xo()?t&&t.length&&(a=await wo(t)):a=!1}catch{a=!1}try{localStorage.removeItem(Vs)}catch{}return{lsOk:n,idbOk:a}}function Sh(){try{if(typeof document>"u"||!document.body)return;const e=document.createElement("input");e.type="file",e.accept=".json,application/json",e.style.display="none",document.body.appendChild(e);const t=()=>{try{e.remove()}catch{}};e.addEventListener("change",()=>{const i=e.files&&e.files[0];t(),i&&kh(i)}),e.addEventListener("cancel",()=>t()),e.click()}catch(e){ge("无法打开文件选择器："+(e&&e.message?e.message:"未知错误"))}}async function kh(e){let t=null;try{t=JSON.parse(await wh(e))}catch{ge("导入失败：文件不是有效的 JSON 备份");return}if(!t||t.format!==Nd&&!dh.includes(t.format)){ge("导入失败：不是有效的桌面备份文件");return}const i=t.localStorage&&typeof t.localStorage=="object"&&!Array.isArray(t.localStorage)?t.localStorage:{},n=xh(t),a=Object.keys(i).length,r=n.length,o=n.some(m=>m&&m.value&&m.value.__backupType==="blob"),l=["确认从备份恢复全部数据？当前数据将被覆盖，且无法撤销。","","导出时间："+(t.exportedAt||"未知"),"localStorage 条目："+a+" 条","IndexedDB 条目："+r+" 条"];o&&l.push("提示：备份含视频/字体等大文件，恢复可能需要几秒钟。");let c=!1;try{c=confirm(l.join(`
`))}catch{c=!1}if(!c)return;const d=bh();if(d===null){ge("导入失败：无法读取当前数据（建立回滚快照失败），已取消导入");return}let u=[];{let m=[],h=[];try{m=await Jt(),h=await Jt()}catch{}const v=y=>y.map(x=>x&&x.key!=null?String(x.key):"").join("");if(v(m)!==v(h)){ge("导入失败：无法稳定读取当前数据，已取消导入，请稍后重试");return}u=m}let f=!1;try{let m=0,h=!1;try{localStorage.clear()}catch{h=!0}if(!h)for(const b of Object.keys(i))try{localStorage.setItem(b,String(i[b]))}catch{m++}if(h||m>0){const b=await on(d,[],!1);ge(b.lsOk?"导入失败："+(h?"localStorage 无法写入":m+" 条数据写入被拒绝")+"，已恢复原数据":"导入失败，且自动恢复未完全成功，建议立即重新导出备份");return}try{localStorage.setItem(Vs,JSON.stringify({savedAt:new Date().toISOString(),note:"导入进行中的回滚快照（正常情况下导入结束会自动清除，若长期存在说明上次导入被中断）",localStorage:d}))}catch{}let v=!1;try{v=await xo()}catch{v=!1}if(!v){const b=await on(d,u,!1);ge(b.lsOk&&b.idbOk?"导入失败：无法清空本地 IndexedDB 存储，已恢复原数据":"导入失败，且自动恢复未完全成功，建议立即重新导出备份");return}f=!0;let y=0,x=0;if(r>0){const b=[];for(const M of n){if(!M||typeof M.key>"u"||M.key===null)continue;const L=vh(M.value);if(L===null){x++;continue}b.push({key:M.key,value:L})}if(b.length===0){const M=await on(d,u,!0);ge(M.lsOk&&M.idbOk?"导入失败：备份中的 IndexedDB 数据全部无法解码，已恢复原数据":"导入失败，且自动恢复未完全成功，建议立即重新导出备份");return}let k=!1;try{k=await wo(b)}catch{k=!1}if(!k){const M=await on(d,u,f);ge(M.lsOk&&M.idbOk?"导入失败：IndexedDB 数据写回失败，已恢复原数据":"导入失败，且自动恢复未完全成功，建议立即重新导出备份");return}y=b.length}try{localStorage.removeItem(Vs)}catch{}let E="数据导入成功：localStorage "+a+" 条、IndexedDB "+y+" 条，正在刷新…";x>0&&(E+="（跳过无法解码的条目 "+x+" 条）"),ge(E,g.check),setTimeout(()=>{try{location.reload()}catch{}},800)}catch(m){const h=await on(d,u,f);ge(h.lsOk&&h.idbOk?"导入失败："+(m&&m.message?m.message:"未知错误")+"，已恢复原数据":"导入失败，且自动恢复未完全成功，建议立即重新导出备份")}}if(typeof window<"u")try{window.__dataBackup={exportBackup:yh,pickImportFile:Sh}}catch{}const Eh=[{id:"track-1",title:"Pixel Space: Android 16 & MD3",artist:"Google Pixel 开发者电台",album:"Google I/O Special",coverGradient:"linear-gradient(135deg, #a8c7fa 0%, #669df6 100%)",src:"https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",isLocal:!1,durationText:"02:40"},{id:"track-2",title:"Lofi Chill Study & Focus Code",artist:"Lofi Girl • 专注编程频道",album:"Deep Focus Sessions",coverGradient:"linear-gradient(135deg, #d0bcff 0%, #9a82db 100%)",src:"https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3",isLocal:!1,durationText:"02:05"},{id:"track-3",title:"Beethoven: Moonlight Sonata",artist:"经典交响乐团",album:"Classical Masterpieces",coverGradient:"linear-gradient(135deg, #c2e7ff 0%, #7fcfff 100%)",src:"https://cdn.pixabay.com/download/audio/2021/09/06/audio_733568c853.mp3?filename=beethoven-moonlight-sonata-114422.mp3",isLocal:!1,durationText:"05:14"}];class _h{constructor(){this.audio=null,this.playlist=[...Eh],this.currentIndex=0,this.isPlaying=!1,this.currentTime=0,this.duration=0,this.playbackRate=1,this.volume=.6,this.listeners=new Set,this.localUrls=new Map}ensureAudio(){return this.audio?this.audio:(this.audio=new Audio,this.audio.preload="metadata",this.audio.volume=this.volume,this.audio.playbackRate=this.playbackRate,this.setupAudioEvents(),this.audio)}applyTrackSrc(t){t&&(this.audio.src=t.src,this.audio.playbackRate=this.playbackRate,this.currentTime=0,this.duration=0)}ensureLoaded(){this.ensureAudio(),this.audio.src||this.applyTrackSrc(this.playlist[this.currentIndex]||this.playlist[0])}setupAudioEvents(){this.audio.addEventListener("play",()=>{this.isPlaying=!0,this.notify()}),this.audio.addEventListener("pause",()=>{this.isPlaying=!1,this.notify()}),this.audio.addEventListener("timeupdate",()=>{this.currentTime=this.audio.currentTime,this.duration=this.audio.duration||0,this.notify()}),this.audio.addEventListener("loadedmetadata",()=>{this.duration=this.audio.duration||0,this.notify()}),this.audio.addEventListener("ended",()=>{this.next()}),this.audio.addEventListener("error",t=>{console.warn("Audio stream fallback notice:",t)})}loadTrack(t,i=!0){if(t<0||t>=this.playlist.length)return;this.currentIndex=t;const n=this.playlist[t];if(!this.audio){if(!i){this.notify();return}this.ensureAudio()}this.applyTrackSrc(n),i&&this.audio.play().catch(()=>{}),this.notify()}getCurrentTrack(){return this.playlist[this.currentIndex]||this.playlist[0]}play(){this.ensureLoaded(),this.audio.play().catch(()=>{})}pause(){this.audio&&this.audio.pause()}togglePlay(){this.ensureLoaded(),this.audio.paused?this.play():this.pause()}next(){const t=(this.currentIndex+1)%this.playlist.length;this.loadTrack(t,!0)}prev(){if(this.audio&&this.audio.currentTime>3){this.audio.currentTime=0;return}const t=(this.currentIndex-1+this.playlist.length)%this.playlist.length;this.loadTrack(t,!0)}seek(t){if(this.duration>0&&this.audio){const i=Math.max(0,Math.min(100,t))/100*this.duration;this.audio.currentTime=i}}setVolume(t){const i=Math.max(0,Math.min(1,t));this.volume=i,this.audio&&(this.audio.volume=i),this.notify()}setSpeed(t){this.playbackRate=t,this.audio&&(this.audio.playbackRate=t),this.notify()}importLocalAudio(t){if(!t)return;const i=URL.createObjectURL(t),n={id:"local-"+Date.now(),title:t.name.replace(/\.[^/.]+$/,""),artist:"本地音频导入",album:`${(t.size/(1024*1024)).toFixed(1)} MB`,coverGradient:"linear-gradient(135deg, #7df8db 0%, #006b5a 100%)",src:i,isLocal:!0,durationText:"本地音频"};this.localUrls.set(n.id,i),this.playlist.unshift(n);const a=this.playlist.filter(r=>r.isLocal);if(a.length>8){const r=new Set(a.slice(8).map(o=>o.id));this.playlist.forEach(o=>{if(r.has(o.id)){try{URL.revokeObjectURL(o.src)}catch{}this.localUrls.delete(o.id)}}),this.playlist=this.playlist.filter(o=>!r.has(o.id))}this.loadTrack(0,!0)}subscribe(t){return this.listeners.add(t),t(this.getState()),()=>this.listeners.delete(t)}getState(){const t=this.duration>0?this.currentTime/this.duration*100:0;return{track:this.getCurrentTrack(),isPlaying:this.isPlaying,currentTime:this.currentTime,duration:this.duration,progress:t,volume:this.volume,playbackRate:this.playbackRate,playlist:[...this.playlist],currentIndex:this.currentIndex}}notify(){const t=this.getState();this.listeners.forEach(i=>{try{i(t)}catch(n){console.error(n)}})}}const Le=new _h,ir=85,Ws=[8e3,6*36e5],Gs=[4e3,6*36e5],Ri=6;function Mh(e){const t=[],i=[];for(let r=1;r<e.length;r++){const o=e[r-1],l=e[r];if(!o||!l||l.t<=o.t||o.charging!==l.charging)continue;const c=Math.abs(o.level-l.level);if(c<1)continue;const d=(l.t-o.t)/c;o.charging?i.push(d):t.push(d)}const n=t.slice(-Ri),a=i.slice(-Ri);return{dischargeMsPerPct:zl(n,Ws),chargeMsPerPct:zl(a,Gs),dischargeSamples:n.length,chargeSamples:a.length}}function zl(e,t){const i=e.filter(r=>r>=t[0]&&r<=t[1]);if(i.length===0)return null;let n=0,a=0;return i.forEach((r,o)=>{const l=1+o/Math.max(1,i.length-1)*1.4;n+=r*l,a+=l}),Math.round(n/a)}const Vd="ios-desktop:battery-rates",Ih=336*36e5,Wd="ios-desktop:battery-sim-level",Th=3;function Gd(){try{const e=JSON.parse(localStorage.getItem(Vd)||"null");if(!e||typeof e!="object"||!Number.isFinite(e.ts)||Date.now()-e.ts>Ih)return null;const t=Number(e.dischargeMsPerPct),i=Number(e.chargeMsPerPct);return{dischargeMsPerPct:Number.isFinite(t)&&t>=Ws[0]&&t<=Ws[1]?t:null,chargeMsPerPct:Number.isFinite(i)&&i>=Gs[0]&&i<=Gs[1]?i:null,dischargeSamples:Math.max(0,Math.min(Ri,Number(e.dischargeSamples)||0)),chargeSamples:Math.max(0,Math.min(Ri,Number(e.chargeSamples)||0))}}catch{return null}}function Ch(){try{localStorage.setItem(Vd,JSON.stringify({...Y.rates,ts:Date.now()}))}catch{}}const j={level:ir,charging:!1,chargingTime:1/0,dischargingTime:1/0,supported:!1},Y={samples:[],rates:{dischargeMsPerPct:null,chargeMsPerPct:null,dischargeSamples:0,chargeSamples:0},seeded:!1},Xs=new Set;let $l=!1;const za={offset:0};function Lh(e,t){const i=Date.now()+za.offset,n=Y.samples[Y.samples.length-1];if(n&&n.level===e&&n.charging===t)return!1;if(Y.samples.push({t:i,level:e,charging:t}),Y.samples.length>Ri*2+2&&Y.samples.splice(0,Y.samples.length-(Ri*2+2)),Y.rates=Mh(Y.samples),Y.seeded){const a=Gd();a&&(Y.rates.dischargeMsPerPct===null&&a.dischargeMsPerPct!==null&&(Y.rates.dischargeMsPerPct=a.dischargeMsPerPct,Y.rates.dischargeSamples=a.dischargeSamples),Y.rates.chargeMsPerPct===null&&a.chargeMsPerPct!==null&&(Y.rates.chargeMsPerPct=a.chargeMsPerPct,Y.rates.chargeSamples=a.chargeSamples))}return Ch(),!0}function qe(e){const t=Math.min(100,Math.max(0,Math.round(e.level))),i=!!e.charging,n=Number.isFinite(e.chargingTime)?e.chargingTime:1/0,a=Number.isFinite(e.dischargingTime)?e.dischargingTime:1/0,r=t!==j.level||i!==j.charging||n!==j.chargingTime||a!==j.dischargingTime;j.level=t,j.charging=i,j.chargingTime=n,j.dischargingTime=a,typeof e.supported=="boolean"&&(j.supported=e.supported);const o=Lh(t,i);(r||o)&&Ah()}function Ah(){const e={...j,rates:{...Y.rates}};Xs.forEach(t=>{try{t(e)}catch{}})}function ln(e){const t=typeof e.level=="number"&&Number.isFinite(e.level)?e.level:ir/100;qe({level:t*100,charging:e.charging,chargingTime:typeof e.chargingTime=="number"?e.chargingTime:1/0,dischargingTime:typeof e.dischargingTime=="number"?e.dischargingTime:1/0,supported:!0})}const Xd=72e3,Bh=56e3,O={running:!1,charging:!1,timer:0,nextAt:0,tickScale:1,saverOn:!1};function Fh(){try{return document.body.classList.contains("battery-saver-mode")}catch{return!1}}function jd(e,t){let i;return t?i=Bh*(e>=96?2.4:e>=90?1.5:1)*Dl():i=Xd*(O.saverOn||Fh()?1.4:1)*(e<=5?1.15:1)*Dl(),Math.max(1e3,Math.round(i*O.tickScale))}function Dl(){return .88+Math.random()*.24}function Ph(){const e=j.level;O.charging?e<100?qe({level:e+1,charging:!0}):qe({level:100,charging:!0}):e>0?qe({level:e-1,charging:!1}):qe({level:0,charging:!1}),Ko(),Yt()}function Yt(){if(!O.running)return;clearTimeout(O.timer);const e=jd(j.level,O.charging);O.nextAt=Date.now()+e,O.timer=setTimeout(zh,e)}function zh(){if(!O.running)return;const e=Date.now()-O.nextAt,t=jd(j.level,O.charging),i=Math.floor(e/t);if(i>=1){const n=Math.min(i,Th);for(let a=0;a<n;a++){const r=j.level;if(O.charging&&r>=100||!O.charging&&r<=0)break;qe({level:O.charging?r+1:r-1,charging:O.charging})}Ko()}Ph()}function Ko(){try{localStorage.setItem(Wd,JSON.stringify({level:j.level,ts:Date.now()}))}catch{}}function $h(){try{const e=JSON.parse(localStorage.getItem(Wd)||"null");if(!e||!Number.isFinite(e.level))return ir;let t=Math.min(100,Math.max(0,Math.round(e.level)));const i=Date.now()-(Number.isFinite(e.ts)?e.ts:Date.now());if(i>0&&t>0){const n=Math.min(5,Math.floor(i/Xd));t=Math.max(0,t-n)}return t}catch{return ir}}function Ol(){O.running||(O.running=!0,qe({level:$h(),charging:!1,supported:!1}),Yt())}function Dh(){typeof window>"u"||window.__batterySim||(window.__batterySim={active:()=>O.running,setCharging(e){if(!O.running)return!1;const t=!!e;return O.charging===t||(O.charging=t,qe({level:j.level,charging:t}),Yt()),!0},isCharging:()=>O.charging,setTickScale(e){const t=Number(e);return!Number.isFinite(t)||t<=0?!1:(O.tickScale=Math.min(1,t),Yt(),!0)},forceSteps(e,t){if(!O.running)return j.level;const i=Math.max(1,Math.min(60,Math.round(e)||1)),n=Number.isFinite(t)&&t>0?t:0;za.offset=0;for(let a=0;a<i;a++){const r=j.level;if(O.charging){if(r>=100)break;qe({level:r+1,charging:!0})}else{if(r<=0)break;qe({level:r-1,charging:!1})}n&&(za.offset+=n)}return za.offset=0,Ko(),Yt(),j.level}})}function Pr(){if($l)return;$l=!0;const e=Gd();e&&(Y.rates={...e},Y.seeded=!0);let t=!1;typeof navigator<"u"&&typeof navigator.getBattery=="function"&&navigator.getBattery().then(i=>{t=!0,ln(i),i.addEventListener("levelchange",()=>ln(i)),i.addEventListener("chargingchange",()=>ln(i)),i.addEventListener("chargingtimechange",()=>ln(i)),i.addEventListener("dischargingtimechange",()=>ln(i))}).catch(()=>{}),typeof navigator>"u"||typeof navigator.getBattery!="function"?Ol():setTimeout(()=>{t||Ol()},600),Dh()}function Oh(){return Pr(),{...j,rates:{...Y.rates}}}function Qo(e){Pr(),Xs.add(e);try{e({...j,rates:{...Y.rates}})}catch{}return()=>Xs.delete(e)}function Rh(e){if(!e.charging){const t=e.rates||{};if(Number.isFinite(t.dischargeMsPerPct)&&t.dischargeMsPerPct>0)return Math.round(e.level*t.dischargeMsPerPct/1e3);if(Number.isFinite(e.dischargingTime)&&e.dischargingTime>0)return e.dischargingTime}return Math.round(e.level/100*15*3600)}function Hh(e){if(!e.charging)return null;if(e.level>=100)return 0;const t=e.rates||{};return Number.isFinite(t.chargeMsPerPct)&&t.chargeMsPerPct>0?Math.round((100-e.level)*t.chargeMsPerPct/1e3):Number.isFinite(e.chargingTime)&&e.chargingTime>0?e.chargingTime:null}function Rl(e){if(!Number.isFinite(e)||e<=0)return"—";const t=e/1e3;return t<60?`约 ${Math.round(t)} 秒`:`约 ${js(t)}`}function js(e){if(!Number.isFinite(e)||e<=0)return"—";const t=Math.round(e/60),i=Math.floor(t/60),n=t%60;return i<=0?`${n} 分钟`:n===0?`${i} 小时`:`${i} 小时 ${n} 分钟`}typeof document<"u"&&document.addEventListener("battery-saver-changed",e=>{O.saverOn=!!(e.detail&&e.detail.active),O.running&&Yt()});function Nh(){return Pr(),O.running}function qh(){return O.running&&O.charging}function Vh(e){if(Pr(),!O.running)return!1;const t=!!e;return O.charging===t||(O.charging=t,qe({level:j.level,charging:t}),Yt()),!0}typeof window<"u"&&(window.__settingsMedia={setVolume:e=>Le.setVolume(e),getVolume:()=>Le.getState().volume},window.__getAppIconSVG=Z,window.__settingsTheme={resolved:()=>nt(),set:e=>Xi(e)},window.__settingsFolderUninstall=function(e){try{for(const t of s.pagesApps)if(Array.isArray(t))for(const i of t){if(!i||i.type!=="folder"||!Array.isArray(i.apps))continue;const n=i.apps.findIndex(r=>r&&r.id===e);if(n===-1)continue;const a=i.apps.splice(n,1)[0];s.removedApps||(s.removedApps=[]),s.removedApps.push(a);try{localStorage.setItem("ios-desktop:removed-apps",JSON.stringify(s.removedApps))}catch{}return Ro(i),Ae(),st(),!0}}catch{}return!1});const Wh={id:"settings",name:"设置",pages:[{title:"设置",content:`
        <div style="padding:16px 0;">
          <!-- 用户个人资料卡片 MD3 Elevated Card -->
          <div class="md3-card md3-card-elevated" style="margin:4px 0 20px;display:flex;align-items:center;gap:16px;">
            <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,hsl(var(--md-h,215) 80% 40%),hsl(var(--md-h,215) 90% 65%));display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:600;box-shadow:var(--md-shadow-2);">
              A
            </div>
            <div style="display:flex;flex-direction:column;flex:1;">
              <span style="font-size:17px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">Android / MD3 用户</span>
              <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">Google 账号 · 同步与个性化</span>
            </div>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
          </div>

          <!-- 个性化分组 -->
          <div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 12px 8px;letter-spacing:0.3px;">个性化与主题</div>
          <div class="md3-card" style="padding:4px 0;margin-bottom:20px;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(13)">
              <div class="md3-list-item-icon">${g.image}</div>
              <div class="md3-list-item-text">壁纸与动态壁纸</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(9)">
              <div class="md3-list-item-icon">${g.person}</div>
              <div class="md3-list-item-text">多模式（工作 / 个人）</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;margin-right:4px;" id="profileModeHint"></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="triggerFontSelect()">
              <div class="md3-list-item-icon">${g.language}</div>
              <div class="md3-list-item-text">界面排版字体</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(6)">
              <div class="md3-list-item-icon">${g.storage}</div>
              <div class="md3-list-item-text">应用管理</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;margin-right:4px;">卸载 / 恢复</span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${g.bedtime}</div>
              <div class="md3-list-item-text">显示与亮度调节</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(10)">
              <div class="md3-list-item-icon">${g.auto_awesome}</div>
              <div class="md3-list-item-text">动画与动效曲线</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;margin-right:4px;" id="animPresetHint"></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
          </div>

          <!-- 通用分组 -->
          <div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 12px 8px;letter-spacing:0.3px;">系统与设备</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(4)">
              <div class="md3-list-item-icon">${g.volume}</div>
              <div class="md3-list-item-text">声音与震动反馈</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(5)">
              <div class="md3-list-item-icon">${g.lock}</div>
              <div class="md3-list-item-text">应用权限管理</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(7)">
              <div class="md3-list-item-icon">${g.memory}</div>
              <div class="md3-list-item-text">存储空间占用</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(2)">
              <div class="md3-list-item-icon">${g.battery_saver}</div>
              <div class="md3-list-item-text">电池与电源优化</div>
              <span id="settingsMainBatteryPct" style="color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;margin-right:4px;">87%</span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(11)">
              <div class="md3-list-item-icon">${g.picture_in_picture}</div>
              <div class="md3-list-item-text">后台与多任务</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;margin-right:4px;" id="bgModeHint"></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(12)">
              <div class="md3-list-item-icon">${g.explore}</div>
              <div class="md3-list-item-text">系统导航方式</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;margin-right:4px;" id="navModeHint"></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(8)">
              <div class="md3-list-item-icon">${g.code}</div>
              <div class="md3-list-item-text">开发者选项</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
          </div>

          <!-- 备份与恢复分组：localStorage + IndexedDB 全量导出/导入 -->
          <div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:20px 12px 8px;letter-spacing:0.3px;">备份与恢复</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item" onclick="window.__dataBackup&&window.__dataBackup.exportBackup()">
              <div class="md3-list-item-icon">${g.download}</div>
              <div class="md3-list-item-text">导出数据到文件</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="window.__dataBackup&&window.__dataBackup.pickImportFile()">
              <div class="md3-list-item-icon">${g.upload_file}</div>
              <div class="md3-list-item-text">从文件导入数据</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
          </div>
          <script>
            // 主页动态徽标：当前模式名 + 当前动画预设名
            (function() {
              var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
              function refresh() {
                var hint = document.getElementById('profileModeHint');
                if (hint && window.__profiles) hint.innerText = window.__profiles.current() === 'work' ? '工作' : '个人';
                var animHint = document.getElementById('animPresetHint');
                if (animHint && window.__animPresets) animHint.innerText = window.__animPresets.currentName();
                var bgHint = document.getElementById('bgModeHint');
                if (bgHint && window.__bgFreeze) bgHint.innerText = window.__bgFreeze.modeName();
                var navHint = document.getElementById('navModeHint');
                if (navHint && window.__navBar) navHint.innerText = window.__navBar.enabled() ? '三键导航' : '手势导航';
              }
              refresh();
              bindDoc('settings', 'app-page-active', function(e) {
                if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 0) refresh();
              });
            })();
          <\/script>
        </div>
      `},{title:"显示与亮度",content:`<div style="padding:16px 0;">
        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:12px;display:flex;justify-content:space-between;">
            <span>屏幕亮度</span>
            <span id="dispBriVal" style="color:var(--md-on-surface-variant);">75%</span>
          </div>
          <!-- MD3 Expressive Slider -->
          <div class="md3-slider is-continuous" id="dispBriSlider" style="height:36px;">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="dispBriFill" style="width:calc(75% - 6px);"></div>
            <div class="m3-slider-stop-dot"></div>
            <div class="md3-slider-thumb" id="dispBriThumb" style="left:75%;"></div>
          </div>
        </div>

        <div class="md3-card" style="padding:4px 0;overflow:hidden;">
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">护眼夜览模式</span>
            <label class="md3-switch"><input type="checkbox" id="dispNightToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">暗黑色彩方案</span>
            <label class="md3-switch"><input type="checkbox" id="dispDarkToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">自适应光感亮度</span>
            <label class="md3-switch"><input type="checkbox" id="dispAutoBrightToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <script>
          (function() {
            var s = document.getElementById('dispBriSlider');
            var f = document.getElementById('dispBriFill');
            var th = document.getElementById('dispBriThumb');
            var v = document.getElementById('dispBriVal');
            if (!s) return;
            // v7.34 rAF 合帧：pointermove 事件率可达 120Hz+，width/left 直写每事件
            // 都触发 iframe 内 layout+paint；合帧后至多每帧一落（末事件原则）
            var briRaf = 0, briLastE = null;
            var briPaint = function() {
              briRaf = 0;
              var e = briLastE; briLastE = null;
              if (!e) return;
              var r = s.getBoundingClientRect();
              var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
              var w = Math.max(0, p * r.width - 6);
              f.style.width = w + 'px';
              th.style.left = (p * 100) + '%';
              if (v) v.innerText = Math.round(p * 100) + '%';
            };
            var update = function(e) {
              briLastE = e;
              if (!briRaf) briRaf = requestAnimationFrame(briPaint);
            };
            var down = false;
            s.onpointerdown = function(e) { down = true; s.classList.add('is-dragging'); s.setPointerCapture(e.pointerId); update(e); };
            s.onpointermove = function(e) { if (down) update(e); };
            s.onpointerup = s.onpointercancel = function(e) { down = false; s.classList.remove('is-dragging'); try { s.releasePointerCapture(e.pointerId); } catch(err){} if (navigator.vibrate) navigator.vibrate(8); };

            // fix(audit-E): 三个假开关接真 —— 暗黑方案联动 theme-mode 单一真源；
            // 夜览/自适应光感无真实实现，不再预置假 checked 状态，切换时提示「敬请期待」并回弹。
            var darkToggle = document.getElementById('dispDarkToggle');
            var syncDark = function() {
              if (!darkToggle || !window.__settingsTheme) return;
              darkToggle.checked = window.__settingsTheme.resolved() === 'dark';
            };
            syncDark();
            if (darkToggle) {
              darkToggle.addEventListener('change', function() {
                if (!window.__settingsTheme) { darkToggle.checked = false; return; }
                // 与快捷设置深色磁贴同向：开 → 深色，关 → 浅色（auto 档按当前解析值切换）
                window.__settingsTheme.set(darkToggle.checked ? 'dark' : 'light');
                syncDark();
                if (window.showSystemToast) window.showSystemToast(darkToggle.checked ? '已切换到深色方案' : '已切换到浅色方案');
              });
            }
            ['dispNightToggle', 'dispAutoBrightToggle'].forEach(function(id) {
              var t = document.getElementById(id);
              if (!t) return;
              t.addEventListener('change', function() {
                t.checked = false; // 回弹：无真实实现，不保留假状态
                if (window.showSystemToast) window.showSystemToast('敬请期待');
              });
            });
            // 实例常驻内存：重新激活该页时回同步暗黑开关（快捷设置深色磁贴/主题面板可能已改值）
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 1) syncDark();
            });
          })();
        <\/script>
      </div>`},{title:"电池",content:`<div style="padding:16px 0;text-align:center;">
        <div style="position:relative;display:inline-block;">
          <div id="settingsBatteryPct" style="font-size:56px;font-weight:200;color:var(--md-success,#a8f5bb);font-family:var(--md-font-num);transition:color .4s;">87%</div>
          <span id="settingsBatteryChargeBadge" style="display:none;position:absolute;top:2px;right:-34px;font-size:22px;color:var(--md-primary,#7df8db);">${g.battery_charging}</span>
        </div>
        <div id="settingsBatteryEstimate" style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;">预计可用 8 小时 45 分钟</div>

        <div style="max-width:260px;margin:14px auto 0;height:8px;border-radius:99px;background:var(--md-surface-container-high,#353639);overflow:hidden;">
          <div id="settingsBatteryBar" style="width:87%;height:100%;border-radius:99px;background:var(--md-success,#a8f5bb);transition:width .6s cubic-bezier(.2,.8,.2,1),background .4s;"></div>
        </div>
        <div id="settingsBatterySource" style="font-size:11px;color:var(--md-outline,#6a6b6e);margin-top:8px;">数据来源：设备电池（实时）</div>

        <div class="md3-card" style="padding:4px 0;margin-top:24px;overflow:hidden;text-align:left;">
          <div class="md3-list-item" style="cursor:default;">
            <div class="md3-list-item-icon">${g.battery_saver}</div>
            <span class="md3-list-item-text">省电模式</span>
            <label class="md3-switch"><input type="checkbox" id="settingsBatterySaverSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item">
            <div class="md3-list-item-icon">${g.bar_chart}</div>
            <span class="md3-list-item-text">电池最大健康容量</span>
            <span style="color:var(--md-success,#a8f5bb);font-weight:600;font-size:14px;">98%</span>
          </div>
        </div>

        <div class="md3-card" style="padding:4px 0;margin-top:12px;overflow:hidden;text-align:left;">
          <div class="md3-list-item" style="cursor:default;align-items:flex-start;">
            <div class="md3-list-item-icon" style="margin-top:10px;">${g.speed}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;">耗电速率</div>
              <div id="settingsBatteryDrainRate" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 10px;">测量中 · 需观察一格电量变化</div>
            </div>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;align-items:flex-start;">
            <div class="md3-list-item-icon" style="margin-top:10px;">${g.battery_charging}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;">充电速率</div>
              <div id="settingsBatteryChargeRate" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 10px;">接入充电器后开始测量</div>
            </div>
          </div>
        </div>

        <div class="md3-card" id="settingsSimChargerCard" style="padding:4px 0;margin-top:12px;overflow:hidden;text-align:left;display:none;">
          <div class="md3-list-item">
            <div class="md3-list-item-icon">${g.bolt}</div>
            <span class="md3-list-item-text">接入充电器（模拟）</span>
            <label class="md3-switch"><input type="checkbox" id="settingsSimChargerSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <p style="color:var(--md-on-surface-variant,#9a9b9e);font-size:12px;margin-top:16px;text-align:center;">上次充电完成：今天 08:15</p>
      </div>`},{title:"已移除的应用",content:`<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;">从桌面移除的应用可以在此恢复</div>
        <div id="removedAppsList"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var list = document.getElementById('removedAppsList');
            if (!list) return;
            // 本应用由桌面文档 DOM 注入渲染：window 即桌面上下文。
            // 恢复消息必须发给桌面自身（旧实现 window.parent 在壳页 iframe 嵌套时
            // 指向壳页，壳页无监听器，导致"点恢复无反应"）；parent 仅作 iframe
            // 承载形态的兜底（此时 parent 才是桌面）。
            function postRestore(appId) {
              try { window.postMessage({ type: 'restore-app', appId: appId }, '*'); } catch (e) {}
              if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: 'restore-app', appId: appId }, '*'); } catch (e) {}
              }
            }
            function renderList() {
              var removed = [];
              try { removed = JSON.parse(localStorage.getItem('ios-desktop:removed-apps') || '[]'); } catch(e) {}
              list.innerHTML = '';
              if (removed.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:48px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;">暂无已移除的应用</div>';
                return;
              }
              removed.forEach(function(app) {
                var item = document.createElement('div');
                item.className = 'md3-card';
                item.style.cssText = 'display:flex;align-items:center;gap:14px;padding:14px 18px;margin-bottom:12px;';
                // 图标与桌面同源：本地 SVG（app-icons.js），不再读遗留网络图 app.iconUrl
                var iconHTML = '<div style="width:42px;height:42px;border-radius:12px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(app.id) + '</div>';
                item.innerHTML = iconHTML + '<span style="flex:1;font-size:15px;font-weight:500;color:var(--md-on-surface,hsl(var(--md-h,215) 10% 90%));">'+app.name+'</span><button class="md3-btn md3-btn-filled" style="padding:6px 18px;font-size:13px;" data-app-id="'+app.id+'" data-act="restore">恢复</button>';
                item.querySelector('[data-act="restore"]').addEventListener('click', function() {
                  var appId = this.getAttribute('data-app-id');
                  postRestore(appId);
                  setTimeout(function() { if (window.popSubPage) window.popSubPage(); }, 300);
                });
                list.appendChild(item);
              });
            }
            renderList();
            // 应用实例常驻内存：每次该子页重新激活时重建列表，避免展示已恢复过的旧条目
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 3) renderList();
            });
          })();
        <\/script>
      </div>`},{title:"声音与震动",content:`<div style="padding:16px 0;">
        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:12px;display:flex;justify-content:space-between;">
            <span>媒体音量</span>
            <span id="sndVolVal" style="color:var(--md-on-surface-variant);">60%</span>
          </div>
          <div class="md3-slider" id="sndVolSlider" style="height:36px;">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="sndVolFill" style="width:calc(60% - 6px);"></div>
            <div class="md3-slider-thumb" id="sndVolThumb" style="left:60%;"></div>
          </div>
        </div>

        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:12px;display:flex;justify-content:space-between;">
            <span>系统音效音量</span>
            <span id="sfxVolVal" style="color:var(--md-on-surface-variant);">50%</span>
          </div>
          <div class="md3-slider" id="sfxVolSlider" style="height:36px;">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="sfxVolFill" style="width:calc(50% - 6px);"></div>
            <div class="md3-slider-thumb" id="sfxVolThumb" style="left:50%;"></div>
          </div>
        </div>

        <div class="md3-card" style="padding:4px 0;overflow:hidden;">
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">全局音效（点按 / 开合应用 / 通知）</span>
            <label class="md3-switch"><input type="checkbox" id="sndSfxToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">触感振动反馈</span>
            <label class="md3-switch"><input type="checkbox" id="sndHapticToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <p style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;margin-top:14px;padding:0 4px;">
          音效由 WebAudio 实时合成，无任何外部音频文件；触感振动依赖设备的
          navigator.vibrate 能力（部分桌面浏览器无振动马达，调用静默无效）。
          关闭「触感振动反馈」后，系统内所有振动调用点将统一静音。
        </p>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var sfx = window.__sfx;
            function initOnce() {
              if (!sfx) sfx = window.__sfx;
              var sv = document.getElementById('sndVolSlider');
              var svf = document.getElementById('sndVolFill');
              var svt = document.getElementById('sndVolThumb');
              var svv = document.getElementById('sndVolVal');
              var xv = document.getElementById('sfxVolSlider');
              var xvf = document.getElementById('sfxVolFill');
              var xvt = document.getElementById('sfxVolThumb');
              var xvv = document.getElementById('sfxVolVal');
              var bindSlider = function(slider, fill, thumb, label, onPct) {
                if (!slider || slider._bound) return;
                slider._bound = true;
                // v7.34 rAF 合帧：同 dispBri 滑杆（末事件原则，每帧至多一次 width/left 落盘）
                var slRaf = 0, slLastE = null;
                var slPaint = function() {
                  slRaf = 0;
                  var e = slLastE; slLastE = null;
                  if (!e) return;
                  var r = slider.getBoundingClientRect();
                  var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                  fill.style.width = 'calc(' + Math.round(p * 100) + '% - 6px)';
                  thumb.style.left = (p * 100) + '%';
                  if (label) label.innerText = Math.round(p * 100) + '%';
                  onPct(p);
                };
                var update = function(e) {
                  slLastE = e;
                  if (!slRaf) slRaf = requestAnimationFrame(slPaint);
                };
                var down = false;
                slider.onpointerdown = function(e) { down = true; try { slider.setPointerCapture(e.pointerId); } catch (err) {} update(e); };
                slider.onpointermove = function(e) { if (down) update(e); };
                slider.onpointerup = slider.onpointercancel = function(e) { down = false; try { slider.releasePointerCapture(e.pointerId); } catch (err) {} };
              };
              // 媒体音量：真实联动 media-service 的 HTML5 Audio 引擎
              bindSlider(sv, svf, svt, svv, function(p) { if (window.__settingsMedia) window.__settingsMedia.setVolume(p); });
              // 系统音效音量：联动 sound-haptics 引擎
              bindSlider(xv, xvf, xvt, xvv, function(p) { if (sfx) sfx.setVolume(p); });
              // fix(audit-E): 媒体音量滑杆每次激活回同步当前真值（initOnce 在
              // app-page-active(4) 时重跑，此前只回同步了系统音效，媒体音量被
              // 播放器/快捷设置改过后回来仍显示旧值）
              if (window.__settingsMedia && window.__settingsMedia.getVolume) {
                var mv = Math.round(window.__settingsMedia.getVolume() * 100);
                if (svv) svv.innerText = mv + '%';
                if (svf) svf.style.width = 'calc(' + mv + '% - 6px)';
                if (svt) svt.style.left = mv + '%';
              }
              if (sfx && xvv) {
                var cur = Math.round(sfx.getVolume() * 100);
                xvv.innerText = cur + '%';
                xvf.style.width = 'calc(' + cur + '% - 6px)';
                xvt.style.left = cur + '%';
              }
              var sfxToggle = document.getElementById('sndSfxToggle');
              var hapToggle = document.getElementById('sndHapticToggle');
              if (sfx && sfxToggle && !sfxToggle._bound) {
                sfxToggle._bound = true;
                sfxToggle.checked = sfx.sfxEnabled();
                sfxToggle.addEventListener('change', function() {
                  sfx.setSfxEnabled(sfxToggle.checked);
                  if (sfxToggle.checked) sfx.play('tick');
                  if (window.showSystemToast) window.showSystemToast(sfxToggle.checked ? '全局音效已开启' : '全局音效已关闭');
                });
              }
              if (sfx && hapToggle && !hapToggle._bound) {
                hapToggle._bound = true;
                hapToggle.checked = sfx.hapticsEnabled();
                hapToggle.addEventListener('change', function() {
                  sfx.setHapticsEnabled(hapToggle.checked);
                  if (window.showSystemToast) window.showSystemToast(hapToggle.checked ? '触感振动反馈已开启' : '触感振动反馈已关闭');
                  if (hapToggle.checked && navigator.vibrate) navigator.vibrate(30);
                });
              }
            }
            initOnce();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 4) initOnce();
            });
          })();
        <\/script>
      </div>`},{title:"应用权限",content:`<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;line-height:1.6;">应用在首次使用相机、麦克风、位置信息等敏感能力时会向您申请授权，可随时在此查看与改判；关闭后应用调用相关能力时将被拒绝。<br>注意：应用内授权与浏览器层真实权限相互独立——即使此处选择允许，浏览器仍可能弹出自家的原生授权框，需要您在浏览器里再允许一次，属正常行为。</div>
        <div id="permAppsList"></div>
        <div style="text-align:center;margin-top:22px;">
          <button id="permResetBtn" style="background:none;border:1px solid var(--md-outline-variant);color:hsl(var(--md-h,215) 80% 64%);font-size:13.5px;font-weight:600;padding:10px 26px;border-radius:20px;cursor:pointer;">重置全部权限</button>
        </div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var list = document.getElementById('permAppsList');
            if (!list) return;
            // 本应用与桌面同文档运行（原生页面），window.__permissions 由 main.js 初始化 permissions.js 时注册
            function esc(s) {
              return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
            }
            function permLabel(k) {
              var meta = window.__permissions && window.__permissions.PERMISSION_META && window.__permissions.PERMISSION_META[k];
              return meta ? meta.label : k;
            }
            function renderList() {
              var P = window.__permissions;
              list.innerHTML = '';
              if (!P) {
                list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">权限服务尚未就绪</div>';
                return;
              }
              var all = P.getAllPermissions();
              var appIds = Object.keys(all).filter(function(id) {
                var rec = all[id] || {};
                return Object.keys(rec).some(function(k) { return k[0] !== '_'; });
              });
              if (!appIds.length) {
                list.innerHTML = '<div style="text-align:center;padding:48px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;line-height:1.8;">暂无权限申请记录<br><span style="font-size:12px;opacity:0.8;">应用首次使用相机 / 位置等能力时会出现在这里</span></div>';
                return;
              }
              appIds.forEach(function(appId) {
                var rec = all[appId] || {};
                var perms = Object.keys(rec).filter(function(k) { return k[0] !== '_'; });
                if (!perms.length) return;
                var appName = rec.__name || appId;
                // 图标与桌面同源：本地 SVG，不再读 localStorage 遗留网络图 __icon
                var iconHtml = '<div style="width:38px;height:38px;border-radius:11px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(appId) + '</div>';
                var chipRows = perms.map(function(pk) {
                  var checked = rec[pk] ? ' checked' : '';
                  return '<div style="display:flex;align-items:center;gap:8px;width:50%;min-width:150px;padding:5px 0;box-sizing:border-box;">' +
                    '<span style="font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);flex:1;">' + esc(permLabel(pk)) + '</span>' +
                    '<label class="md3-switch" style="transform:scale(0.8);transform-origin:right center;"><input type="checkbox" data-app="' + esc(appId) + '" data-perm="' + esc(pk) + '"' + checked + '><span class="slider"><span class="thumb"></span></span></label>' +
                    '</div>';
                }).join('');
                var card = document.createElement('div');
                card.className = 'md3-card';
                card.style.cssText = 'padding:10px 16px;margin-bottom:12px;';
                card.innerHTML =
                  '<div style="display:flex;align-items:center;gap:12px;padding:4px 0 8px;">' + iconHtml +
                  '<span style="flex:1;font-size:15px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">' + esc(appName) + '</span>' +
                  '<span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">' + perms.length + ' 项权限</span></div>' +
                  '<div style="display:flex;flex-wrap:wrap;gap:0 10px;">' + chipRows + '</div>';
                list.appendChild(card);
              });
              list.querySelectorAll('input[type="checkbox"]').forEach(function(input) {
                input.addEventListener('change', function() {
                  P.setPermission(input.getAttribute('data-app'), input.getAttribute('data-perm'), input.checked);
                  if (window.showSystemToast) window.showSystemToast(input.checked ? '已允许该权限' : '已拒绝该权限，应用下次调用时生效');
                });
              });
            }
            document.getElementById('permResetBtn').addEventListener('click', function() {
              var P = window.__permissions;
              if (!P) return;
              if (confirm('确定重置全部权限记录？\\n所有应用下次使用敏感能力时将重新弹出授权询问。')) {
                P.clearAllPermissions();
                renderList();
                if (window.showSystemToast) window.showSystemToast('已重置全部权限记录');
              }
            });
            renderList();
            // 应用实例常驻内存：每次该子页重新激活时重建列表，反映最新权限状态
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 5) renderList();
            });
          })();
        <\/script>
      </div>`},{title:"应用管理",content:`<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;">卸载将从桌面移除应用（可随时恢复）；系统应用不可卸载</div>
        <div id="installedAppsList"></div>
        <div id="appMgmtRemovedSection"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var installedBox = document.getElementById('installedAppsList');
            var removedBox = document.getElementById('appMgmtRemovedSection');
            if (!installedBox || !removedBox) return;
            function postToDesktop(type, appId) {
              try { window.postMessage({ type: type, appId: appId }, '*'); } catch (e) {}
              if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: type, appId: appId }, '*'); } catch (e) {}
              }
            }
            function esc(s) {
              return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
            }
            function iconHtml(app) {
              // 与桌面同源：本地 SVG（app-icons.js），不再读遗留网络图 app.iconUrl
              return '<div style="width:40px;height:40px;border-radius:11px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(app.id) + '</div>';
            }
            function appCard(app, actionLabel, actionType, danger) {
              var isSystem = app.id === 'settings';
              var btn = isSystem
                ? '<span style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);opacity:.7;">系统应用</span>'
                : '<button class="md3-btn ' + (danger ? 'md3-btn-tonal' : 'md3-btn-filled') + '" style="padding:6px 18px;font-size:13px;' + (danger ? 'color:#ff8a8a;' : '') + '" data-app-id="' + esc(app.id) + '" data-act="' + actionType + '">' + actionLabel + '</button>';
              return '<div class="md3-card" style="display:flex;align-items:center;gap:14px;padding:12px 16px;margin-bottom:10px;">' +
                iconHtml(app) +
                '<div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:500;color:var(--md-on-surface,#e2e2e9);">' + esc(app.name) + '</div>' +
                '<div style="font-size:11.5px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:1px;">' + esc(app.id) + '</div></div>' +
                btn + '</div>';
            }
            function render() {
              var st = window.__state;
              installedBox.innerHTML = '';
              removedBox.innerHTML = '';
              if (!st || !Array.isArray(st.pagesApps)) {
                installedBox.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">桌面状态尚未就绪</div>';
                return;
              }
              // 已安装：拍平 pagesApps，按 id 去重（文件夹内的应用同样纳入）
              // fix(audit-E): 文件夹真实字段为 type:'folder' + apps（app.children 恒
              // undefined）—— 此前文件夹被当普通应用列入可卸载清单（副标题显示内部
              // folder_xxx id），其成员永不出现在清单。改为递归展开：跳过文件夹自身、
              // 其 apps 成员计入清单（嵌套防御：只下钻一层，文件夹不可嵌套放置）。
              var seen = new Set();
              var removedIds = new Set((st.removedApps || []).map(function(a) { return a.id; }));
              var addApp = function(app) {
                if (!app || !app.id || seen.has(app.id) || removedIds.has(app.id)) return;
                seen.add(app.id);
                installedBox.insertAdjacentHTML('beforeend', appCard(app, '卸载', 'uninstall', true));
              };
              st.pagesApps.forEach(function(page) {
                (page || []).forEach(function(app) {
                  if (app && app.type === 'folder') {
                    (app.apps || []).forEach(addApp);
                    return;
                  }
                  addApp(app);
                });
              });
              removedBox.innerHTML = '<div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:18px 4px 10px;">已卸载（点击恢复）</div>';
              if (!(st.removedApps || []).length) {
                removedBox.insertAdjacentHTML('beforeend', '<div style="text-align:center;padding:22px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">没有已卸载的应用</div>');
              } else {
                st.removedApps.forEach(function(app) {
                  removedBox.insertAdjacentHTML('beforeend', appCard(app, '恢复', 'restore', false));
                });
              }
              installedBox.querySelectorAll('[data-act="uninstall"]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  var id = btn.getAttribute('data-app-id');
                  if (confirm('确定卸载该应用？\\n其桌面图标将被移除（应用数据保留），可随时在此恢复。')) {
                    // fix(audit-E): 文件夹成员走文件夹卸载桥（main.js 的 uninstall-app
                    // 只扫 pagesApps 顶层，命中不了 folder.apps 成员）；
                    // 顶层应用维持原有 postMessage 链路不变
                    var viaFolder = window.__settingsFolderUninstall ? window.__settingsFolderUninstall(id) : false;
                    if (!viaFolder) postToDesktop('uninstall-app', id);
                    setTimeout(render, 320);
                  }
                });
              });
              removedBox.querySelectorAll('[data-act="restore"]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  postToDesktop('restore-app', btn.getAttribute('data-app-id'));
                  setTimeout(render, 320);
                });
              });
            }
            render();
            // 实例常驻内存：重新激活子页时重建列表，反映最新安装状态
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 6) render();
            });
          })();
        <\/script>
      </div>`},{title:"存储空间",content:`<div style="padding:16px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);">localStorage 逐键统计 + IndexedDB 实际配额，按应用归属聚合</div>
          <button id="storageRefreshBtn" class="md3-btn md3-btn-tonal" style="padding:6px 16px;font-size:13px;flex-shrink:0;">重新统计</button>
        </div>
        <div id="storageOverview"></div>
        <div id="storageByOwner"></div>
        <div id="storageTopKeys"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var ov = document.getElementById('storageOverview');
            var byOwnerBox = document.getElementById('storageByOwner');
            var topBox = document.getElementById('storageTopKeys');
            if (!ov) return;
            function fmt(b) { return window.__storageStats ? window.__storageStats.formatBytes(b) : (b || 0) + ' B'; }
            function nameOf(owner) { return window.__storageStats ? window.__storageStats.ownerDisplayName(owner) : owner; }
            function bar(pct, hue) {
              var p = Math.max(1.5, Math.min(100, pct || 0));
              return '<div style="height:6px;border-radius:3px;background:var(--md-outline-variant);overflow:hidden;margin-top:8px;"><div style="height:100%;width:' + p + '%;border-radius:3px;background:hsl(' + (hue || 215) + ' 70% 55%);"></div></div>';
            }
            function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
            function render() {
              if (!window.__storageStats) {
                ov.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">统计服务尚未就绪</div>';
                return;
              }
              ov.innerHTML = '<div style="text-align:center;padding:30px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">正在统计…</div>';
              byOwnerBox.innerHTML = '';
              topBox.innerHTML = '';
              window.__storageStats.collect().then(function(s) {
                var idbPct = s.idb.quota ? Math.min(100, (s.idb.usage / s.idb.quota) * 100) : 0;
                ov.innerHTML =
                  '<div class="md3-card" style="padding:16px 18px;margin-bottom:12px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:var(--md-on-surface,#e2e2e9);"><span>localStorage</span><span>' + fmt(s.ls.total) + ' · ' + s.ls.keys + ' 键</span></div>' +
                    bar(s.ls.total / 5242880 * 100, 215) +
                    '<div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:6px;opacity:.8;">约 5MB 配额</div>' +
                  '</div>' +
                  '<div class="md3-card" style="padding:16px 18px;margin-bottom:14px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:var(--md-on-surface,#e2e2e9);"><span>IndexedDB（含壁纸/字体文件）</span><span>' + (s.idb.available ? fmt(s.idb.usage) + (s.idb.quota ? ' / ' + fmt(s.idb.quota) : '') : '不可用') + '</span></div>' +
                    bar(idbPct, 155) +
                    '<div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:6px;opacity:.8;">配额一般为磁盘可用空间的 60%</div>' +
                  '</div>';
                if (!s.byOwner.length) { byOwnerBox.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">暂无数据</div>'; return; }
                var maxB = s.byOwner[0].bytes || 1;
                var rows = s.byOwner.map(function(o, i) {
                  return '<div style="padding:10px 2px 2px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--md-on-surface,#e2e2e9);"><span>' + esc(nameOf(o.owner)) + '</span><span style="color:var(--md-on-surface-variant,#9a9b9e);">' + fmt(o.bytes) + '</span></div>' +
                    bar(o.bytes / maxB * 100, (o.owner === '__system' ? 215 : (o.owner === '__other' ? 35 : 155 + i * 37) % 360)) +
                    '</div>';
                }).join('');
                byOwnerBox.innerHTML = '<div class="md3-card" style="padding:14px 18px 8px;margin-bottom:12px;"><div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin-bottom:4px;">按应用归属</div>' + rows + '</div>';
                var top = s.ls.items.slice(0, 8).map(function(it) {
                  return '<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 2px;border-bottom:1px solid var(--md-outline-variant);font-size:12.5px;">' +
                    '<span style="color:var(--md-on-surface-variant,#9a9b9e);word-break:break-all;">' + esc(it.key) + '</span>' +
                    '<span style="color:var(--md-on-surface,#e2e2e9);flex-shrink:0;">' + fmt(it.bytes) + '</span></div>';
                }).join('');
                topBox.innerHTML = '<div class="md3-card" style="padding:14px 18px;margin-bottom:12px;"><div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin-bottom:2px;">占用最大的 localStorage 键（前 8）</div>' + (top || '<div style="padding:10px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">空</div>') + '</div>';
              }).catch(function() {
                ov.innerHTML = '<div style="text-align:center;padding:30px 0;color:#ff8a8a;font-size:13px;">统计失败，请重试</div>';
              });
            }
            document.getElementById('storageRefreshBtn').addEventListener('click', render);
            render();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 7) render();
            });
          })();
        <\/script>
      </div>`},{title:"开发者选项",content:`<div style="padding:16px 0;">
        <div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:16px;">
          <div class="md3-list-item" style="cursor:default;">
            <div class="md3-list-item-icon">${g.settings}</div>
            <div style="display:flex;flex-direction:column;flex:1;">
              <span class="md3-list-item-text">系统版本</span>
              <span id="sysVerLine" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">读取中…</span>
            </div>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" id="devCheckUpdateBtn">
            <div class="md3-list-item-icon">${g.sync}</div>
            <span class="md3-list-item-text">检查更新</span>
          </div>
        </div>
        <div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:16px;">
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">性能面板（FPS / 帧耗时 / 内存）</span>
            <label class="md3-switch"><input type="checkbox" id="devFpsToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">禁用 CSS 动画与过渡</span>
            <label class="md3-switch"><input type="checkbox" id="devNoAnimToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <!-- v7.18：动画倍率（开发者）—— 慢放逐帧检视 ↔ 极速验收手感 -->
        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:2px;display:flex;justify-content:space-between;">
            <span>动画倍率</span>
            <span id="devAnimSpeedVal" style="color:var(--md-on-surface-variant);font-variant-numeric:tabular-nums;">1×</span>
          </div>
          <div style="font-size:11.5px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.6;margin-bottom:10px;">
            应用开合 / 切换退场 / 子页导航的物理弹簧速度 · 即时生效（运行中的动画热换曲线不跳变）
          </div>
          <div class="md3-slider is-discrete" id="devAnimSpeedSlider" style="height:36px;">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="devAnimSpeedFill" style="width:calc(55.8% - 6px);"></div>
            <div class="m3-slider-ticks">
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot"></span>
              <span class="m3-slider-dot"></span>
              <span class="m3-slider-dot"></span>
            </div>
            <div class="md3-slider-thumb" id="devAnimSpeedThumb" style="left:55.8%;"></div>
          </div>
          <div id="devAnimSpeedChips" style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
            <span data-speed="0.25" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">0.25× 慢放检视</span>
            <span data-speed="0.5" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">0.5×</span>
            <span data-speed="1" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">1× 默认</span>
            <span data-speed="1.5" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">1.5×</span>
            <span data-speed="2" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">2×</span>
            <span data-speed="3" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">3× 极速</span>
          </div>
        </div>
        <div class="md3-card" style="padding:4px 0;overflow:hidden;">
          <div class="md3-list-item" id="devResetLayoutBtn">
            <div class="md3-list-item-icon">${g.restart_alt}</div>
            <span class="md3-list-item-text">重置桌面布局（图标排列与卸载记录）</span>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" id="devWipeDataBtn" style="color:#ff8a8a;">
            <div class="md3-list-item-icon" style="color:#ff8a8a;">${g.delete_forever}</div>
            <span class="md3-list-item-text">清空全部数据（恢复出厂）</span>
          </div>
        </div>
        <p style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;margin-top:14px;padding:0 4px;">
          「禁用动画」仅关闭 CSS transition/animation；Spring2D 物理弹簧为 JS
          transform 驱动，不受影响。「动画倍率」仅缩放弹簧时间轴（曲线形状不变），
          想彻底关闭动效请配合「禁用 CSS 动画」使用。「清空全部数据」会同时清除
          localStorage、IndexedDB（含壁纸/字体文件）、Cache Storage 并注销
          Service Worker，建议先在「备份与恢复」中导出。开关状态刷新后保持。
        </p>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var dev = window.__devOptions;
            // v7.6：系统版本行（读 ../sw.js 的 geek-vN 与构建 ID，与 SW 天然同源同步）
            function fillSysVer() {
              var line = document.getElementById('sysVerLine');
              if (!line || line._filled) return;
              fetch('../sw.js', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
                if (!line) return;
                // 注意：本段代码位于外层模板字符串内，d 必须写成 \\d 否则被转义成字面 d
                var v = (t.match(/geek-v\\d+[-a-zA-Z]*/) || [''])[0];
                var b = (t.match(/BUILD_ID = '([a-z0-9]+)'/) || [])[1];
                if (v) { line.textContent = 'Android16 Geek · ' + v + (b ? ' · build ' + b : ''); line._filled = true; }
                else line.textContent = '版本信息不可用';
              }).catch(function () { if (line) line.textContent = '版本信息不可用'; });
            }
            fillSysVer();
            // v7.6：检查更新 —— 触发 SW 字节对比；有新版本时根壳层会自动浮现「轻点重启」胶囊
            function bindCheckUpdate() {
              var btn = document.getElementById('devCheckUpdateBtn');
              if (!btn || btn._bound) return;
              btn._bound = true;
              btn.addEventListener('click', function () {
                if (window.showSystemToast) window.showSystemToast('正在检查更新…');
                if (!('serviceWorker' in navigator)) {
                  if (window.showSystemToast) window.showSystemToast('当前环境不支持 Service Worker');
                  return;
                }
                navigator.serviceWorker.getRegistration().then(function (reg) {
                  if (!reg) {
                    if (window.showSystemToast) window.showSystemToast('Service Worker 未注册（开发环境）');
                    return;
                  }
                  var found = false;
                  reg.addEventListener('updatefound', function () { found = true; }, { once: true });
                  Promise.resolve(reg.update()).catch(function () {}).then(function () {
                    setTimeout(function () {
                      if (!found && window.showSystemToast) window.showSystemToast('已是最新版本');
                    }, 2500);
                  });
                }).catch(function () {
                  if (window.showSystemToast) window.showSystemToast('检查更新失败');
                });
              });
            }
            bindCheckUpdate();
            function initOnce() {
              dev = window.__devOptions;
              if (!dev) return;
              var fps = document.getElementById('devFpsToggle');
              var na = document.getElementById('devNoAnimToggle');
              if (fps && !fps._bound) {
                fps._bound = true;
                fps.checked = dev.isFpsEnabled();
                fps.addEventListener('change', function() {
                  dev.setFpsEnabled(fps.checked);
                  if (window.showSystemToast) window.showSystemToast(fps.checked ? 'FPS 悬浮层已开启' : 'FPS 悬浮层已关闭');
                });
              }
              if (na && !na._bound) {
                na._bound = true;
                na.checked = dev.isNoAnimEnabled();
                na.addEventListener('change', function() {
                  dev.setNoAnimEnabled(na.checked);
                  if (window.showSystemToast) window.showSystemToast(na.checked ? 'CSS 动画已禁用' : 'CSS 动画已恢复');
                });
              }
              // v7.18：动画倍率滑杆 + 快捷档位（实现于 animation-presets.js，经
              // __devOptions 桥接；对数刻度 0.25x~3x，1x 恰落在滑杆中段）
              var spS = document.getElementById('devAnimSpeedSlider');
              var spF = document.getElementById('devAnimSpeedFill');
              var spT = document.getElementById('devAnimSpeedThumb');
              var spV = document.getElementById('devAnimSpeedVal');
              var chipWrap = document.getElementById('devAnimSpeedChips');
              if (spS && !spS._bound && dev.getAnimSpeed) {
                spS._bound = true;
                var SP_MIN = 0.25, SP_MAX = 3, SP_BASE = 12;
                var toT = function(v) { return Math.log(v / SP_MIN) / Math.log(SP_BASE); };
                var toV = function(t) { return SP_MIN * Math.pow(SP_BASE, t); };
                var fmt = function(v) { return (Math.round(v * 100) / 100) + '\\u00d7'; };
                var paint = function(v) {
                  var t = toT(Math.min(SP_MAX, Math.max(SP_MIN, v)));
                  spF.style.width = 'calc(' + (t * 100).toFixed(2) + '% - 6px)';
                  spT.style.left = (t * 100).toFixed(2) + '%';
                  spV.textContent = fmt(v) + (Math.abs(v - 1) < 0.005 ? ' \\u00b7 默认' : '');
                  if (chipWrap) {
                    var chips = chipWrap.querySelectorAll('[data-speed]');
                    for (var i = 0; i < chips.length; i++) {
                      var on = Math.abs(parseFloat(chips[i].getAttribute('data-speed')) - v) < 0.005;
                      chips[i].style.background = on ? 'var(--md-primary)' : 'transparent';
                      chips[i].style.color = on ? 'var(--md-on-primary, #fff)' : 'var(--md-on-surface)';
                      chips[i].style.borderColor = on ? 'var(--md-primary)' : 'var(--md-outline-variant)';
                    }
                  }
                };
                paint(dev.getAnimSpeed());
                var apply = function(v, quiet) {
                  var nv = dev.setAnimSpeed(v);
                  paint(nv);
                  if (!quiet && window.showSystemToast) window.showSystemToast('动画倍率：' + fmt(nv));
                };
                var down = false;
                // v7.34 rAF 合帧：拖拽期 apply（含 localStorage 写 + 弹簧热更新）
                // 随事件率直调 → 每帧至多一次；末事件原则保证落点不丢
                var spRaf = 0, spLastE = null;
                var spPaint = function() {
                  spRaf = 0;
                  var e = spLastE; spLastE = null;
                  if (!e) return;
                  var r = spS.getBoundingClientRect();
                  var t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                  apply(toV(t), true);
                };
                var update = function(e) {
                  spLastE = e;
                  if (!spRaf) spRaf = requestAnimationFrame(spPaint);
                };
                spS.onpointerdown = function(e) { down = true; spS.setPointerCapture(e.pointerId); update(e); };
                spS.onpointermove = function(e) { if (down) update(e); };
                spS.onpointerup = spS.onpointercancel = function(e) {
                  down = false;
                  try { spS.releasePointerCapture(e.pointerId); } catch (err) {}
                  if (window.showSystemToast) window.showSystemToast('动画倍率：' + fmt(dev.getAnimSpeed()));
                };
                if (chipWrap) {
                  var chips2 = chipWrap.querySelectorAll('[data-speed]');
                  for (var ci = 0; ci < chips2.length; ci++) {
                    (function (chip) {
                      chip.addEventListener('click', function () {
                        apply(parseFloat(chip.getAttribute('data-speed')), false);
                      });
                    })(chips2[ci]);
                  }
                }
              }
              var reset = document.getElementById('devResetLayoutBtn');
              if (reset && !reset._bound) {
                reset._bound = true;
                reset.addEventListener('click', function() {
                  if (confirm('确定重置桌面布局？\\n图标排列与已卸载记录将恢复默认，应用数据不受影响。')) dev.resetDesktopLayout();
                });
              }
              var wipe = document.getElementById('devWipeDataBtn');
              if (wipe && !wipe._bound) {
                wipe._bound = true;
                wipe.addEventListener('click', function() {
                  if (confirm('确定清空全部数据？\\nlocalStorage、IndexedDB、缓存与 Service Worker 将全部清除。')) {
                    if (confirm('最后确认：此操作不可恢复（等于恢复出厂）！\\n建议先到「备份与恢复」导出数据。')) dev.wipeAllData();
                  }
                });
              }
            }
            initOnce();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 8) initOnce();
            });
          })();
        <\/script>
      </div>`},{title:"多模式",content:`<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;line-height:1.7;">为「个人」与「工作」分别记忆一套完整场景：主题色相、外观模式、壁纸、桌面图标排列与勿扰开关。切换时全程伴随连贯动画——壁纸交叉淡入、主题色渐变、图标逐格弹簧重排；快捷设置中的「Modes」磁贴同样可以一键切换。</div>
        <div id="profileCardsBox"></div>
        <p style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;margin-top:14px;padding:0 4px;">
          离开当前模式时会自动保存最新布局、外观与勿扰状态，下次切回原样恢复；自定义上传的壁纸（文件类）不逐模式复制存储，切换时保持当前壁纸不变。配套的「Focus」番茄钟磁贴可在专注期自动开启勿扰、休息期自动恢复。
        </p>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var box = document.getElementById('profileCardsBox');
            if (!box) return;
            function render() {
              var P = window.__profiles;
              if (!box || !P) return;
              var list = P.list();
              box.innerHTML = '';
              list.forEach(function(p) {
                var card = document.createElement('div');
                card.className = 'md3-card';
                card.style.cssText = 'display:flex;align-items:center;gap:14px;padding:16px 18px;margin-bottom:12px;cursor:pointer;' + (p.active ? 'border:1.5px solid hsl(' + (p.hue || 215) + ' 70% 55%);' : '');
                card.innerHTML =
                  '<div style="width:44px;height:44px;border-radius:14px;flex-shrink:0;background:linear-gradient(135deg,hsl(' + (p.hue || 215) + ' 75% 40%),hsl(' + (p.hue || 215) + ' 85% 62%));display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:600;">' + (p.name || '?').charAt(0) + '</div>' +
                  '<div style="flex:1;"><div style="font-size:15px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">' + p.name + '模式</div>' +
                  '<div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">主题色相 ' + (p.hue || 215) + '°</div></div>' +
                  (p.active
                    ? '<span style="font-size:12px;font-weight:600;color:hsl(' + (p.hue || 215) + ' 80% 65%);">当前使用</span>'
                    : '<span style="font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);">点按切换</span>');
                card.addEventListener('click', function() {
                  if (p.active || P.isSwitching && P.isSwitching()) return;
                  P.switchTo(p.id);
                  setTimeout(render, 700);
                });
                box.appendChild(card);
              });
            }
            render();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 9) render();
            });
          })();
        <\/script>
      </div>`},{title:"动画与动效",content:`<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">应用开 / 关动画曲线</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            选择应用从图标展开 / 收回时的弹簧手感（iOS 26 液态玻璃 · macOS 吸入融合风格）。
            切换即时生效：正在播放的动画会无缝换曲线，不会跳变；选择会被记住。
          </div>
        </div>

        <div id="animPresetList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <!-- 锁屏解锁入场动效风格（v7.13 高保真复刻双风格 + 卡内微缩预演） -->
        <div class="md3-card md3-card-elevated" style="margin:20px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">锁屏解锁桌面入场动效</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            复刻两大原生解锁动效：iOS 图标自屏幕底缘一整排一整排错峰飞入；
            Android 以屏幕中心为波源的涟漪式向外扩散淡入。切换即时生效并持久保存，
            点按卡片可查看微缩预演，选好后点下方按钮上滑解锁即可看到完整效果。
          </div>
        </div>

        <div id="unlockAnimList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <button id="unlockTryBtn" type="button" style="width:100%;margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 16px;border:none;border-radius:16px;cursor:pointer;font-size:14px;font-weight:600;color:#fff;background:hsl(var(--md-h,215) 72% 45%);box-shadow:0 2px 12px hsl(var(--md-h,215) 72% 40% / .35);">
          <span class="material-symbols-outlined" style="font-size:19px;">lock</span>
          立即锁屏体验当前效果
        </button>

        <div class="md3-card" style="margin-top:16px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
          <span class="material-symbols-outlined" style="font-size:20px;color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">info</span>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
            分屏窗格展开 / 收回同样跟随当前曲线；3D 倾斜与玻璃边缘高光保持系统级统一。
          </div>
        </div>

        <script>
          // 动画与动效页：预设卡片渲染 + 选择热切换（window.__animPresets 由 app-window.js 桥接）
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var listEl = null;
            var unlockListEl = null;

            var UNLOCK_STYLES = [
              {
                id: 'ios',
                name: 'iOS 整排飞入',
                desc: '复刻 SpringBoard IconFlyIn：图标自屏幕底缘起飞，底排先行、逐排向上续接，受控过冲后自然落位'
              },
              {
                id: 'android',
                name: 'Android 涟漪扩散',
                desc: '复刻 Material You 解锁涟漪：以屏幕中心为波源，光环向外扩散，图标随波前由内向外弹性浮现'
              }
            ];

            function render() {
              listEl = document.getElementById('animPresetList');
              if (listEl && window.__animPresets) {
                var cur = window.__animPresets.currentId();
                listEl.innerHTML = window.__animPresets.list.map(function(p) {
                  var active = p.id === cur;
                  return '<div class="anim-preset-card" data-preset-id="' + p.id + '" role="button" tabindex="0" aria-label="动画曲线 ' + p.name + '"' +
                    ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                    'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                    'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                    '<div style="width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;font-size:22px;' +
                    'background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / .22)' : 'var(--md-surface-container-high,#2f3136)') + ';">' + p.emoji + '</div>' +
                    '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;">' + p.name +
                    (active ? '<span style="font-size:11px;font-weight:600;color:hsl(var(--md-h,215) 85% 65%);background:hsl(var(--md-h,215) 80% 55% / .16);padding:2px 8px;border-radius:999px;">当前</span>' : '') +
                    '</div>' +
                    '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + p.desc + '</div>' +
                    '</div>' +
                    (active ? '<span class="material-symbols-outlined" style="font-size:20px;color:hsl(var(--md-h,215) 85% 60%);">check_circle</span>' : '') +
                    '</div>';
                }).join('');
              }

              unlockListEl = document.getElementById('unlockAnimList');
              if (unlockListEl) {
                var curUnlock = (window.__getUnlockAnimStyle ? window.__getUnlockAnimStyle() : localStorage.getItem('ios-desktop:unlock-anim-style')) || 'ios';
                var prevDots = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
                unlockListEl.innerHTML = UNLOCK_STYLES.map(function(s) {
                  var active = s.id === curUnlock;
                  return '<div class="unlock-style-card" data-style-id="' + s.id + '" role="button" tabindex="0" aria-label="解锁动效 ' + s.name + '"' +
                    ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                    'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                    'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                    '<div class="unlock-prev" aria-hidden="true">' + prevDots + '</div>' +
                    '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;">' + s.name +
                    (active ? '<span style="font-size:11px;font-weight:600;color:hsl(var(--md-h,215) 85% 65%);background:hsl(var(--md-h,215) 80% 55% / .16);padding:2px 8px;border-radius:999px;">当前</span>' : '') +
                    '</div>' +
                    '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + s.desc + '</div>' +
                    '</div>' +
                    (active ? '<span class="material-symbols-outlined" style="font-size:20px;color:hsl(var(--md-h,215) 85% 60%);">check_circle</span>' : '') +
                    '</div>';
                }).join('');
                // v7.13：当前选中卡自动播一次微缩预演，直观展示当前动效模式
                replayUnlockPreview(curUnlock);
              }
            }

            /** v7.13：重播指定风格卡片的微缩预演（类名复位 + 强制 reflow + 重新挂类） */
            function replayUnlockPreview(styleId) {
              if (!unlockListEl) return;
              var prev = unlockListEl.querySelector('.unlock-style-card[data-style-id="' + styleId + '"] .unlock-prev');
              if (!prev) return;
              prev.classList.remove('play-ios', 'play-android');
              void prev.offsetWidth;
              prev.classList.add(styleId === 'android' ? 'play-android' : 'play-ios');
            }

            function pick(id) {
              if (window.__animPresets && typeof window.__animPresets.apply === 'function') {
                window.__animPresets.apply(id);
                if (window.showSystemToast) window.showSystemToast('动画曲线已切换：' + window.__animPresets.currentName());
                render();
              }
            }

            function pickUnlock(styleId) {
              if (window.__setUnlockAnimStyle) {
                window.__setUnlockAnimStyle(styleId);
              } else {
                try { localStorage.setItem('ios-desktop:unlock-anim-style', styleId); } catch (e) {}
              }
              var styleName = styleId === 'android' ? 'Android 涟漪扩散' : 'iOS 整排飞入';
              if (window.showSystemToast) window.showSystemToast('解锁动效已切换：' + styleName);
              render(); // render 内会重播新选中卡的微缩预演
            }

            bindDoc('settings', 'click', function(e) {
              var card = e.target && e.target.closest && e.target.closest('.anim-preset-card');
              if (card && card.isConnected) pick(card.dataset.presetId);
              var uCard = e.target && e.target.closest && e.target.closest('.unlock-style-card');
              if (uCard && uCard.isConnected) pickUnlock(uCard.dataset.styleId);
              // v7.13：立即锁屏体验 —— 回桌面（若在前台应用）后自动上锁
              var tryBtn = e.target && e.target.closest ? e.target.closest('#unlockTryBtn') : null;
              if (tryBtn && tryBtn.isConnected && window.__tryUnlockAnim) window.__tryUnlockAnim();
            });

            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && e.target.closest('.anim-preset-card');
              if (card && card.isConnected) { e.preventDefault(); pick(card.dataset.presetId); }
              var uCard = e.target && e.target.closest && e.target.closest('.unlock-style-card');
              if (uCard && uCard.isConnected) { e.preventDefault(); pickUnlock(uCard.dataset.styleId); }
            });

            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 10) render();
            });
            render();
          })();
        <\/script>
      </div>`},{title:"后台与多任务",content:`<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">后台运行策略</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            决定多任务后台里各应用实例的运行方式。切换即时生效；正在播放媒体（音频 / 视频 / 录音）
            的任务在任何模式下都不会被冻结。
          </div>
        </div>

        <div id="bgModeList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <div class="md3-card" style="margin-top:16px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
          <span class="material-symbols-outlined" style="font-size:20px;color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">info</span>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
            智能冻结模式下，从未打开过的后台卡片将保持休眠占位，不再引导启动；
            左右滑动后台时的重绘量也会显著下降。
          </div>
        </div>

        <script>
          // 后台与多任务页：运行策略卡片渲染 + 热切换（window.__bgFreeze 由 bg-freeze.js 桥接）
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var MODES = [
              { id: 'freeze', name: '智能冻结', emoji: '🧊', badge: '默认 · 推荐',
                desc: '仅前台应用、刚被推到后台的应用与分屏对保持实时运行，其余后台任务整体冻结 —— 心跳定时器、CSS 动画、rAF 全部暂停，直到再次回到前台。' },
              { id: 'live', name: '全部实时', emoji: '🔴', badge: '经典方案',
                desc: '所有后台实例照常运行、预览实时刷新；开销更高，长时间使用建议配合充电使用。' },
            ];
            function render() {
              var listEl = document.getElementById('bgModeList');
              if (!listEl || !window.__bgFreeze) return;
              var cur = window.__bgFreeze.mode();
              listEl.innerHTML = MODES.map(function(m) {
                var active = m.id === cur;
                return '<div class="bg-mode-card" data-mode-id="' + m.id + '" role="button" tabindex="0" aria-label="后台策略 ' + m.name + '"' +
                  ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                  'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                  'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                  '<div style="width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;font-size:22px;' +
                  'background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / .22)' : 'var(--md-surface-container-high,#2f3136)') + ';">' + m.emoji + '</div>' +
                  '<div style="flex:1;min-width:0;">' +
                  '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' + m.name +
                  '<span style="font-size:10px;font-weight:600;color:' + (active ? 'hsl(var(--md-h,215) 85% 65%)' : 'var(--md-on-surface-variant,#9a9b9e)') + ';background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:999px;">' + m.badge + '</span>' +
                  (active ? '<span class="material-symbols-outlined" style="font-size:18px;color:hsl(var(--md-h,215) 85% 60%);">check_circle</span>' : '') +
                  '</div>' +
                  '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + m.desc + '</div>' +
                  '</div>' +
                  '</div>';
              }).join('');
            }
            function pick(id) {
              if (window.__bgFreeze && typeof window.__bgFreeze.setMode === 'function') {
                window.__bgFreeze.setMode(id);
                if (window.showSystemToast) window.showSystemToast('后台策略已切换：' + window.__bgFreeze.modeName());
                render();
              }
            }
            bindDoc('settings', 'click', function(e) {
              var card = e.target && e.target.closest && e.target.closest('.bg-mode-card');
              if (card && card.isConnected) pick(card.dataset.modeId);
            });
            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && e.target.closest('.bg-mode-card');
              if (card && card.isConnected) { e.preventDefault(); pick(card.dataset.modeId); }
            });
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 11) render();
            });
            render();
          })();
        <\/script>
      </div>`},{title:"系统导航",content:`<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">导航方式</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            手势导航为默认方案；开启三键导航后全新矢量三键（勾角返回 · 悬挑屋顶主屏 · 三横线多任务）悬浮于屏幕底部，
            且手势导航仍然保持运作 —— 两套方案融合共存，互不干扰。
          </div>
        </div>

        <div id="navModeList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <div id="navPosSection" style="display:none;margin-top:16px;">
          <div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 12px 8px;letter-spacing:0.3px;">三键栏位置</div>
          <div id="navPosList" style="display:flex;gap:10px;"></div>
          <div class="md3-card" style="margin-top:12px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
            <span class="material-symbols-outlined" style="font-size:20px;color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">gesture</span>
            <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
              也可以在桌面上直接调整：<b>按住主屏键 1 秒</b>后左右拖动，松手自动吸附到左 / 中 / 右。
              从三键栏上滑仍会直通系统手势引擎（跟手缩小、停顿唤出多任务、快速甩动关闭）。
            </div>
          </div>
        </div>

        <script>
          // 系统导航页：方式开关 + 位置三档（window.__navBar 由 nav-bar.js 桥接）
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            /* 矢量图标（与 nav-bar.js 同源线稿，viewBox 48 网格 · stroke 5.2 · round） */
            function navIcon(key, size) {
              var P = {
                back: '<path d="M14 7.5 7.8 13.5H36v23.5H7.8"/>',
                home: '<polyline points="6,18 24,7.5 42,18"/><path d="M11 23v12.5a4 4 0 0 0 4 4h18a4 4 0 0 0 4-4V23"/>',
                recents: '<path d="M8 12h32M8 24h32M8 36h32"/>'
              };
              return '<svg viewBox="0 0 48 48" width="' + size + '" height="' + size + '" aria-hidden="true" style="display:block">' +
                '<g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round">' + P[key] + '</g></svg>';
            }
            var MODES = [
              { id: 'gesture', name: '手势导航', badge: '默认',
                icon: '<svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true" style="display:block">' +
                  '<path d="M24 41V9M13.5 19.5 24 9l10.5 10.5" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                desc: '底部上滑关闭应用 / 唤出多任务、两侧边缘滑动返回；沉浸全屏无按键。' },
              { id: 'three', name: '三键导航', badge: '融合模式',
                icon: '<span style="display:flex;align-items:center;gap:4px;">' +
                  navIcon('back', 14) + navIcon('home', 14) + navIcon('recents', 14) + '</span>',
                desc: '新矢量三键悬浮底部；手势依旧可用 —— 长按主屏键 1 秒可左右拖动整条导航栏。' },
            ];
            var POS = [
              { id: 'left', name: '居左' },
              { id: 'center', name: '居中' },
              { id: 'right', name: '居右' },
            ];
            function render() {
              var listEl = document.getElementById('navModeList');
              var posSection = document.getElementById('navPosSection');
              var posList = document.getElementById('navPosList');
              if (!listEl || !window.__navBar) return;
              var enabled = window.__navBar.enabled();
              listEl.innerHTML = MODES.map(function(m) {
                var active = (m.id === 'three') === enabled;
                return '<div class="nav-mode-card" data-mode-id="' + m.id + '" role="button" tabindex="0" aria-label="导航方式 ' + m.name + '"' +
                  ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                  'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                  'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                  '<div style="width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;' +
                  'color:' + (active ? 'hsl(var(--md-h,215) 85% 72%)' : 'var(--md-on-surface-variant,#9a9b9e)') + ';' +
                  'background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / .22)' : 'var(--md-surface-container-high,#2f3136)') + ';">' + m.icon + '</div>' +
                  '<div style="flex:1;min-width:0;">' +
                  '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' + m.name +
                  '<span style="font-size:10px;font-weight:600;color:' + (active ? 'hsl(var(--md-h,215) 85% 65%)' : 'var(--md-on-surface-variant,#9a9b9e)') + ';background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:999px;">' + m.badge + '</span>' +
                  (active ? '<span class="material-symbols-outlined" style="font-size:18px;color:hsl(var(--md-h,215) 85% 60%);">check_circle</span>' : '') +
                  '</div>' +
                  '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + m.desc + '</div>' +
                  '</div>' +
                  '</div>';
              }).join('');
              if (posSection) posSection.style.display = enabled ? 'block' : 'none';
              if (enabled && posList) {
                var cur = window.__navBar.pos();
                /* Uiverse 缝合：拟物物理单选组（源：uiverse.io/m1her/splendid-rat-12，MIT）
                   改造：类名 uiv-nav-radio- 前缀；选中态用类驱动（不用 :has，兼容性更稳）；
                   色值接 --md-h 动态令牌，明暗双模式样式见 pixel-features.css 末尾 */
                posList.innerHTML = POS.map(function(p) {
                  var active = p.id === cur;
                  return '<label class="uiv-nav-radio-label' + (active ? ' uiv-nav-radio-on' : '') + '" data-pos-id="' + p.id + '" role="button" tabindex="0" aria-label="三键栏位置 ' + p.name + '">' +
                    '<input class="uiv-nav-radio-input" type="radio" name="uiv-nav-pos" value="' + p.id + '"' + (active ? ' checked' : '') + ' />' +
                    '<span class="uiv-nav-radio-text">' + p.name + '</span>' +
                    '</label>';
                }).join('');
              }
            }
            bindDoc('settings', 'click', function(e) {
              var modeCard = e.target && e.target.closest && e.target.closest('.nav-mode-card');
              if (modeCard && modeCard.isConnected && window.__navBar) {
                window.__navBar.setEnabled(modeCard.dataset.modeId === 'three');
                render();
                return;
              }
              var posChip = e.target && e.target.closest && e.target.closest('.uiv-nav-radio-label');
              if (posChip && posChip.isConnected && window.__navBar) {
                window.__navBar.setPos(posChip.dataset.posId);
                render();
              }
            });
            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && (e.target.closest('.nav-mode-card') || e.target.closest('.uiv-nav-radio-label'));
              if (card && card.isConnected) { e.preventDefault(); card.click(); }
            });
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 12) render();
            });
            render();
          })();
        <\/script>
      </div>`},{title:"壁纸与动态壁纸",content:`<div id="settingsWallpaperContainer" style="padding:16px 0;"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var inited = false;
            function init() {
              if (inited) return;
              var box = document.getElementById('settingsWallpaperContainer');
              if (box && window.__initWallpaperPage) {
                inited = true;
                window.__initWallpaperPage(box);
              }
            }
            // fix(v7.37 全量审计)：懒激活 —— page-stack 首开会把全部子页 content 与
            // script 一次性注入执行；旧版 init() 立即跑 __initWallpaperPage → 动态
            // 壁纸缩略图同步串行绘制，取证实锤把「打开设置」拖成 4.8 秒长任务。
            // 现在首开零渲染，用户首次真正推入本页（pageIdx===13）时才初始化。
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 13) init();
            });
          })();
        <\/script>`}]},Yd="ios-desktop:battery-saver";function Hl(e){return e<=20?"var(--md-error, #f2b8b5)":e<=45?"var(--md-tertiary, #efc76b)":"var(--md-success, #a8f5bb)"}function Ud(e){const t=document.getElementById("settingsMainBatteryPct");t&&t.isConnected&&(t.textContent=`${e.level}%`);const i=document.getElementById("settingsBatteryPct");if(!i||!i.isConnected)return;i.textContent=`${e.level}%`,i.style.color=Hl(e.level);const n=document.getElementById("settingsBatteryBar");n&&(n.style.width=`${e.level}%`,n.style.background=Hl(e.level));const a=document.getElementById("settingsBatteryChargeBadge");a&&(a.style.display=e.charging?"inline-flex":"none");const r=e.rates||{},o=document.getElementById("settingsBatteryEstimate");if(o)if(e.charging)if(e.level>=100)o.textContent="已充满";else{const m=Hh(e);o.textContent=m!==null&&Number.isFinite(m)&&m>0?`正在充电 · 预计 ${js(m)}充满`:"正在充电 · 正在测量充电速度…"}else{const m=Number.isFinite(r.dischargeMsPerPct),h=Number.isFinite(e.dischargingTime)&&e.dischargingTime>0;o.textContent=m||h?`预计可用 ${js(Rh(e))}`:"正在测量耗电速度 · 需观察一格电量变化"}const l=document.getElementById("settingsBatteryDrainRate");l&&(l.textContent=Number.isFinite(r.dischargeMsPerPct)?`每格耗电 ${Rl(r.dischargeMsPerPct)} · 已实测 ${r.dischargeSamples} 次`:"测量中 · 需观察一格电量变化");const c=document.getElementById("settingsBatteryChargeRate");c&&(c.textContent=Number.isFinite(r.chargeMsPerPct)?`每格充电 ${Rl(r.chargeMsPerPct)} · 已实测 ${r.chargeSamples} 次`:e.charging?"测量中 · 充满前将持续校准":"接入充电器后开始测量");const d=document.getElementById("settingsSimChargerCard");d&&(d.style.display=Nh()?"":"none");const u=document.getElementById("settingsSimChargerSwitch");u&&(u.checked=qh());const f=document.getElementById("settingsBatterySource");f&&(f.textContent=e.supported?"数据来源：设备电池（耗/充电速率实测）":"数据来源：模拟电池（含耗/充电速率测量）")}Qo(Ud);document.addEventListener("app-page-active",e=>{if(e.detail&&e.detail.appId==="settings"&&(e.detail.pageIdx===0||e.detail.pageIdx===2)){Ud(Oh());const t=document.getElementById("settingsBatterySaverSwitch");t&&(t.checked=typeof localStorage<"u"&&localStorage.getItem(Yd)==="1")}});document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!=="settingsBatterySaverSwitch")return;const i=!!t.checked;typeof localStorage<"u"&&localStorage.setItem(Yd,i?"1":"0"),document.body.classList.toggle("battery-saver-mode",i),ce(()=>Promise.resolve().then(()=>Cp),void 0,import.meta.url).then(n=>{n&&typeof n.setBatterySaverActive=="function"&&n.setBatterySaverActive(i,{silent:!0})}).catch(()=>{})});document.addEventListener("battery-saver-changed",e=>{const t=document.getElementById("settingsBatterySaverSwitch");t&&e.detail&&typeof e.detail.active=="boolean"&&(t.checked=e.detail.active)});document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!=="settingsSimChargerSwitch")return;if(!Vh(!!t.checked)){t.checked=!1,window.showSystemToast&&window.showSystemToast("真实设备上充电状态跟随电源连接");return}window.showSystemToast&&window.showSystemToast(t.checked?"充电器已接入 · 正在测量充电速度":"充电器已拔出")});const Gh={id:"clock_app",name:"时钟",type:"clock",pages:[{title:"时钟",content:K("apps/clock-app/index.html")}]},Xh={id:"cal_app",name:"日历",type:"calendar",pages:[{title:"日历",content:K("apps/calendar/index.html")}]},jh={id:"weather",name:"天气",bgColor:"#0284C7",pages:[{title:"天气",content:K("apps/weather/index.html")}]},Yh={id:"music",name:"音乐",pages:[{title:"音乐",content:`
        ${K("apps/music/index.html")}
        <!-- 本地文件导入浮层 -->
        <div id="musicImportOverlay" style="position:absolute;inset:0;z-index:500;background:rgba(0,0,0,0.7);backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;opacity:0;transition:opacity 0.25s;">
          <div style="background:var(--md-surface-container,hsl(var(--md-h,215) 18% 12%));border-radius:24px;padding:24px;width:80%;max-width:340px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">${g.music_note}</div>
            <div style="font-size:18px;font-weight:600;color:var(--md-on-surface,#e2e2e9);margin-bottom:8px;">导入本地音乐</div>
            <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:20px;">支持 MP3 / WAV / FLAC / M4A 等格式</div>
            <div style="background:var(--md-primary,hsl(var(--md-h,215) 80% 25%));color:var(--md-on-primary,#fff);padding:14px;border-radius:9999px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:12px;" onclick="document.getElementById('musicFileInput').click()">选择音乐文件</div>
            <div style="color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;cursor:pointer;padding:8px;" onclick="document.getElementById('musicImportOverlay').style.display='none';document.getElementById('musicImportOverlay').style.opacity='0';">取消</div>
          </div>
        </div>
        <input type="file" id="musicFileInput" accept="audio/*" multiple style="display:none;" onchange="
          // fix(audit-E): 定向当前音乐实例的 iframe —— 此前 document.querySelector('iframe')
          // 错投全文档第一个 iframe（可能是其它常驻实例/多任务预览）。当前实例的 iframe 与
          // 本输入框同属一个 .app-page（page-stack 实例页与分屏窗格页均有该类名），
          // 从 this 向上就近查找，天然避开其它实例。
          var files = this.files;
          if (files.length > 0) {
            var page = this.closest && this.closest('.app-page');
            var iframe = page ? page.querySelector('iframe') : null;
            if (iframe && iframe.contentWindow) {
              for (var i = 0; i < files.length; i++) {
                var url = URL.createObjectURL(files[i]);
                iframe.contentWindow.postMessage({ type: 'import-music', url: url, name: files[i].name }, '*');
              }
            }
            var overlay = document.getElementById('musicImportOverlay');
            if (overlay) {
              overlay.style.opacity = '0';
              setTimeout(function(){ overlay.style.display = 'none'; }, 250);
            }
          }
        ">
      `}]},Uh={id:"calculator",name:"计算器",pages:[{title:"计算器",content:K("apps/calculator/index.html")}]},Kh={id:"camera",name:"相机",pages:[{title:"相机",content:K("apps/camera/index.html")}]},Qh={id:"map",name:"地图",pages:[{title:"地图",content:`
        <div style="padding:16px 0;">
          <!-- MD3 搜索栏 -->
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:14px;border:1px solid var(--md-outline-variant);">
            <span style="font-size:18px;color:var(--md-primary);">${g.location_on}</span>
            <input type="text" placeholder="搜索地点、路线、周边美食..." style="background:transparent;border:none;outline:none;color:var(--md-on-surface);font-size:14px;width:100%;">
          </div>

          <!-- 地图视窗 MD3 Elevated Card -->
          <div class="md3-card md3-card-elevated" style="height:220px;padding:0;overflow:hidden;position:relative;margin-bottom:18px;background:linear-gradient(135deg,#1b2838,#16212e);border:1px solid var(--md-outline-variant);display:flex;align-items:center;justify-content:center;">
            <!-- 地图网格纹理 -->
            <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);background-size:28px 28px;"></div>
            <!-- 定位脉冲标记 -->
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              <div style="width:36px;height:36px;border-radius:50%;background:hsla(var(--md-h,215),80%,50%,0.25);animation:pulse 2s infinite;"></div>
              <div style="position:absolute;width:14px;height:14px;border-radius:50%;background:var(--md-primary);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>
            </div>
            <div style="position:absolute;bottom:12px;left:14px;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);padding:4px 10px;border-radius:12px;font-size:11px;color:#fff;">上海市 · 实时路况畅通</div>
            <div style="position:absolute;bottom:12px;right:14px;font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">${g.explore}</div>
          </div>

          <!-- 收藏地点 MD3 Cards -->
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">快捷路线与收藏</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${g.home}</div>
              <div class="md3-list-item-text">
                <div>家</div>
                <div class="md3-list-item-subtext">浦东新区 · 12 公里</div>
              </div>
              <span style="color:var(--md-primary);font-weight:600;font-size:13px;margin-right:4px;">32 分钟</span>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(2)">
              <div class="md3-list-item-icon">${g.work}</div>
              <div class="md3-list-item-text">
                <div>公司</div>
                <div class="md3-list-item-subtext">徐汇区 · 3.2 公里</div>
              </div>
              <span style="color:var(--md-primary);font-weight:600;font-size:13px;margin-right:4px;">28 分钟</span>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">›</span>
            </div>
          </div>
        </div>
      `},{title:"回家路线",content:`
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="margin-bottom:16px;">
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:6px;">最佳推荐导航路线</div>
            <div style="font-size:16px;font-weight:600;color:var(--md-on-surface);">${g.work} 公司 → ${g.home} 家</div>
            <div style="font-size:36px;font-weight:700;color:var(--md-primary);font-family:var(--md-font-num);margin:12px 0 4px;">32 <span style="font-size:18px;font-weight:500;">分钟</span></div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);">12 公里 · 畅通无拥堵</div>
          </div>

          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.directions_car}</div>
              <div class="md3-list-item-text">驾车 / 打车</div>
              <span style="color:var(--md-primary);font-weight:600;font-size:14px;">32 分钟</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.metro}</div>
              <div class="md3-list-item-text">公共交通 (地铁 2 号线)</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">45 分钟</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.directions_walk}</div>
              <div class="md3-list-item-text">步行</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">2 小时 18 分</span>
            </div>
          </div>
          <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;">开始导航</button>
        </div>
      `},{title:"到公司路线",content:`
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="margin-bottom:16px;">
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:6px;">晨间通勤建议</div>
            <div style="font-size:16px;font-weight:600;color:var(--md-on-surface);">${g.home} 家 → ${g.work} 公司</div>
            <div style="font-size:36px;font-weight:700;color:var(--md-primary);font-family:var(--md-font-num);margin:12px 0 4px;">28 <span style="font-size:18px;font-weight:500;">分钟</span></div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);">3.2 公里 · 途经延安高架路</div>
          </div>

          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.directions_car}</div>
              <div class="md3-list-item-text">驾车</div>
              <span style="color:var(--md-primary);font-weight:600;font-size:14px;">28 分钟</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.metro}</div>
              <div class="md3-list-item-text">地铁 9 号线</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">35 分钟</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.directions_bike}</div>
              <div class="md3-list-item-text">骑行</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">18 分钟</span>
            </div>
          </div>
          <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;">开始导航</button>
        </div>
      `}]},Jh={id:"notes",name:"备忘录",pages:[{title:"备忘录",content:K("apps/notes/index.html")}]},Zh={id:"reminders",name:"提醒",pages:[{title:"提醒",content:K("apps/reminders/index.html")}]},eg={id:"health",name:"健康",pages:[{title:"健康",content:`
        <div style="padding:16px 0;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <h2 style="font-size:20px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">今日摘要</h2>
            <span style="font-size:12px;font-weight:500;padding:4px 10px;border-radius:12px;background:var(--md-secondary-container);color:var(--md-on-secondary-container);">实时同步</span>
          </div>

          <!-- 2x2 MD3 表达性卡片网格 -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="md3-card" style="padding:16px;text-align:left;position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);font-weight:500;">步数</span>
                <span style="font-size:16px;">${g.directions_walk}</span>
              </div>
              <div style="font-size:28px;font-weight:700;color:var(--md-accent,#ff7597);font-family:var(--md-font-num);margin:8px 0 2px;">8,427</div>
              <div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">目标 10,000 · 84%</div>
              <div style="width:100%;height:4px;background:var(--md-surface-container-highest);border-radius:2px;margin-top:8px;overflow:hidden;">
                <div style="width:84%;height:100%;background:var(--md-accent,#ff7597);border-radius:2px;"></div>
              </div>
            </div>

            <div class="md3-card" style="padding:16px;text-align:left;position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);font-weight:500;">运动距离</span>
                <span style="font-size:16px;">${g.location_on}</span>
              </div>
              <div style="font-size:28px;font-weight:700;color:var(--md-primary,hsl(var(--md-h,215) 85% 70%));font-family:var(--md-font-num);margin:8px 0 2px;">5.6 <span style="font-size:14px;font-weight:500;">km</span></div>
              <div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">较昨日 +1.2 km</div>
              <div style="width:100%;height:4px;background:var(--md-surface-container-highest);border-radius:2px;margin-top:8px;overflow:hidden;">
                <div style="width:70%;height:100%;background:var(--md-primary);border-radius:2px;"></div>
              </div>
            </div>

            <div class="md3-card" style="padding:16px;text-align:left;position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);font-weight:500;">活动千卡</span>
                <span style="font-size:16px;">${g.local_fire_department}</span>
              </div>
              <div style="font-size:28px;font-weight:700;color:#ffb74d;font-family:var(--md-font-num);margin:8px 0 2px;">372 <span style="font-size:14px;font-weight:500;">kcal</span></div>
              <div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">目标 500 kcal</div>
              <div style="width:100%;height:4px;background:var(--md-surface-container-highest);border-radius:2px;margin-top:8px;overflow:hidden;">
                <div style="width:74%;height:100%;background:#ffb74d;border-radius:2px;"></div>
              </div>
            </div>

            <div class="md3-card" style="padding:16px;text-align:left;position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);font-weight:500;">睡眠分析</span>
                <span style="font-size:16px;">${g.bedtime}</span>
              </div>
              <div style="font-size:28px;font-weight:700;color:var(--md-success,#a8f5bb);font-family:var(--md-font-num);margin:8px 0 2px;">7h 22m</div>
              <div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">深睡 2h 10m · 良好</div>
              <div style="width:100%;height:4px;background:var(--md-surface-container-highest);border-radius:2px;margin-top:8px;overflow:hidden;">
                <div style="width:92%;height:100%;background:var(--md-success,#a8f5bb);border-radius:2px;"></div>
              </div>
            </div>
          </div>

          <!-- 生理健康指标列表 MD3 List -->
          <div class="md3-card" style="padding:4px 0;margin-top:20px;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${g.bar_chart}</div>
              <div class="md3-list-item-text">本周步数与运动趋势</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.favorite}</div>
              <div class="md3-list-item-text">静息心率</div>
              <span style="color:var(--md-primary,hsl(var(--md-h,215) 85% 70%));font-weight:600;font-size:14px;margin-right:6px;">72 bpm</span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.water_drop}</div>
              <div class="md3-list-item-text">血液氧气饱和度</div>
              <span style="color:var(--md-success,#a8f5bb);font-weight:600;font-size:14px;margin-right:6px;">98%</span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
          </div>
        </div>
      `},{title:"本周趋势",content:`
        <div style="padding:16px 0;">
          <div class="md3-card">
            <h2 style="font-size:16px;font-weight:600;color:var(--md-on-surface,#e2e2e9);margin-bottom:16px;">本周步数统计</h2>
            <div style="display:flex;align-items:flex-end;justify-content:space-between;height:160px;padding:12px 0;gap:8px;">
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:55%;background:var(--md-primary);border-radius:6px;opacity:0.6;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">周一</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:75%;background:var(--md-primary);border-radius:6px;opacity:0.7;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">周二</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:90%;background:var(--md-accent,#80d8ff);border-radius:6px;box-shadow:0 0 10px rgba(128,216,255,0.4);"></div>
                <span style="font-size:11px;color:var(--md-accent,#80d8ff);font-weight:700;">今日</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:40%;background:var(--md-surface-container-highest);border-radius:6px;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">周四</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:60%;background:var(--md-surface-container-highest);border-radius:6px;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">周五</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:70%;background:var(--md-surface-container-highest);border-radius:6px;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">周六</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:65%;background:var(--md-surface-container-highest);border-radius:6px;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">周日</span>
              </div>
            </div>
            <div style="text-align:center;margin-top:16px;padding-top:12px;border-top:1px solid var(--md-outline-variant);">
              <div style="font-size:32px;font-weight:700;color:var(--md-on-surface,#e2e2e9);font-family:var(--md-font-num);">8,427</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">今日步数 · 目标 10,000</div>
            </div>
          </div>
        </div>
      `}]},tg={id:"wallet",name:"钱包",pages:[{title:"钱包",content:`
        <div style="padding:16px 0;">
          <!-- MD3 卡片展示 (Google Wallet / MD3 Expressive Card) -->
          <div class="md3-card md3-card-elevated" style="aspect-ratio:1.6;max-width:320px;margin:10px auto 16px;border-radius:24px;background:linear-gradient(135deg,#1f2937,#111827);padding:22px;display:flex;flex-direction:column;justify-content:space-between;border:1px solid rgba(255,255,255,0.12);box-shadow:var(--md-shadow-3);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div style="color:#fff;font-size:16px;font-weight:600;letter-spacing:0.5px;">招商银行储蓄卡</div>
                <div style="color:var(--md-on-surface-variant);font-size:11px;margin-top:2px;">Google Pay 默认卡片</div>
              </div>
              <span style="font-size:24px;">${g.credit_card}</span>
            </div>
            <div style="color:#fff;font-size:19px;letter-spacing:3px;font-family:monospace;font-weight:600;">•••• •••• •••• 8842</div>
            <div style="display:flex;justify-content:space-between;color:var(--md-on-surface-variant);font-size:12px;">
              <span>ZHANG SAN</span>
              <span>12/28</span>
            </div>
          </div>

          <div style="text-align:center;margin:12px 0 20px;color:var(--md-on-surface-variant);font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="color:var(--md-primary);">${g.auto_awesome}</span>
            <span>靠近感应区即可完成支付</span>
          </div>

          <!-- 操作与记录 MD3 List -->
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${g.assignment}</div>
              <div class="md3-list-item-text">近期交易记录明细</div>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.add_circle}</div>
              <div class="md3-list-item-text">添加银行卡或交通卡</div>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">›</span>
            </div>
          </div>
        </div>
      `},{title:"交易记录",content:`
        <div style="padding:16px 0;">
          <div style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 8px 10px;">今天</div>
          <div class="md3-card" style="padding:4px 0;margin-bottom:18px;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.coffee}</div>
              <div class="md3-list-item-text">
                <div>星巴克臻选</div>
                <div class="md3-list-item-subtext">09:12 · 静安区门店</div>
              </div>
              <span style="font-size:15px;font-weight:600;color:var(--md-error,#f2b8b5);">-¥38.00</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.metro}</div>
              <div class="md3-list-item-text">
                <div>上海交通卡自动充值</div>
                <div class="md3-list-item-subtext">08:30 · 乘车码</div>
              </div>
              <span style="font-size:15px;font-weight:600;color:var(--md-error,#f2b8b5);">-¥50.00</span>
            </div>
          </div>

          <div style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 8px 10px;">昨天</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.paid}</div>
              <div class="md3-list-item-text">
                <div>工资薪酬发放</div>
                <div class="md3-list-item-subtext">18:00 · 招商银行汇入</div>
              </div>
              <span style="font-size:15px;font-weight:600;color:var(--md-success,#a8f5bb);">+¥15,800.00</span>
            </div>
          </div>
        </div>
      `}]},ig={id:"appstore",name:"应用商店",pages:[{title:"应用商店",content:`
        <div style="padding:16px 0;">
          <!-- MD3 搜索栏 -->
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:18px;border:1px solid var(--md-outline-variant);" onclick="pushSubPage(4)">
            <span style="font-size:18px;color:var(--md-on-surface-variant);">${g.search}</span>
            <span style="font-size:14px;color:var(--md-on-surface-variant);">搜索应用、游戏、专题...</span>
          </div>

          <!-- 精选大卡片 MD3 Elevated Hero Card -->
          <div class="md3-card md3-card-elevated" style="padding:0;overflow:hidden;margin-bottom:20px;cursor:pointer;" onclick="pushSubPage(1)">
            <div style="width:100%;height:160px;background:linear-gradient(135deg,hsl(var(--md-h,215) 75% 35%),hsl(var(--md-h,215) 85% 55%));display:flex;align-items:center;justify-content:center;font-size:52px;">
              ${g.launch}
            </div>
            <div style="padding:18px 20px;">
              <div style="font-size:12px;color:var(--md-primary);font-weight:600;letter-spacing:0.4px;">今日精选专题</div>
              <div style="font-size:19px;font-weight:600;color:var(--md-on-surface);margin-top:4px;">探索 MD3 新生代高效工具</div>
              <div style="font-size:13px;color:var(--md-on-surface-variant);margin-top:4px;">流畅交互，极简美学</div>
            </div>
          </div>

          <!-- 推荐应用 MD3 Card List -->
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:12px;">热门必备应用</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:16px;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;">${g.check}</div>
              <div class="md3-list-item-text">
                <div>Things 3</div>
                <div class="md3-list-item-subtext">效率任务管理 · ¥68.00</div>
              </div>
              <button class="md3-btn md3-btn-filled" style="padding:6px 16px;font-size:12px;">获取</button>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(2)">
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#f093fb,#f5576c);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;">${g.photo_camera}</div>
              <div class="md3-list-item-text">
                <div>Darkroom</div>
                <div class="md3-list-item-subtext">专业图像后期 · 免费</div>
              </div>
              <button class="md3-btn md3-btn-filled" style="padding:6px 16px;font-size:12px;">获取</button>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(3)">
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#43e97b,#38f9d7);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;">${g.forest}</div>
              <div class="md3-list-item-text">
                <div>Forest</div>
                <div class="md3-list-item-subtext">专注森林番茄钟 · ¥12.00</div>
              </div>
              <button class="md3-btn md3-btn-filled" style="padding:6px 16px;font-size:12px;">获取</button>
            </div>
          </div>
        </div>
      `},{title:"Things 3",content:`
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="text-align:center;padding:24px 20px;">
            <div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#667eea,#764ba2);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#fff;box-shadow:var(--md-shadow-2);">${g.check}</div>
            <div style="font-size:20px;font-weight:600;color:var(--md-on-surface);">Things 3</div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-top:2px;">Cultured Code · 效率必备</div>
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;">¥68.00 购买安装</button>
          </div>
          <div class="md3-card" style="margin-top:16px;">
            <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:8px;">应用简介</div>
            <p style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">Things 是屡获殊荣的任务管理器。以优美直观的 Material 表达性语言呈现，让你轻松规划每一天、管理大型项目并专注达成目标。</p>
          </div>
        </div>
      `},{title:"Darkroom",content:`
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="text-align:center;padding:24px 20px;">
            <div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#f093fb,#f5576c);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#fff;box-shadow:var(--md-shadow-2);">${g.photo_camera}</div>
            <div style="font-size:20px;font-weight:600;color:var(--md-on-surface);">Darkroom</div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-top:2px;">Bergen · 摄影与色彩</div>
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;">免费下载</button>
          </div>
        </div>
      `},{title:"Forest",content:`
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="text-align:center;padding:24px 20px;">
            <div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#43e97b,#38f9d7);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#fff;box-shadow:var(--md-shadow-2);">${g.forest}</div>
            <div style="font-size:20px;font-weight:600;color:var(--md-on-surface);">Forest</div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-top:2px;">Seekrtech · 专注森林</div>
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;">¥12.00 购买</button>
          </div>
        </div>
      `},{title:"搜索",content:`
        <div style="padding:16px 0;">
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:18px;border:1px solid var(--md-outline-variant);">
            <span style="font-size:18px;color:var(--md-primary);">${g.search}</span>
            <input type="text" placeholder="搜索应用、游戏..." style="background:transparent;border:none;outline:none;color:var(--md-on-surface);font-size:14px;width:100%;">
          </div>
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">大家都在搜</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <span class="md3-chip">AI 助手</span>
            <span class="md3-chip">Material You 壁纸</span>
            <span class="md3-chip">待办任务</span>
            <span class="md3-chip">白噪音冥想</span>
          </div>
        </div>
      `}]},ng={id:"stocks",name:"股票",pages:[{title:"股票",content:K("apps/stocks/index.html")}]},ag={id:"shortcuts",name:"快捷指令",pages:[{title:"快捷指令",content:K("apps/shortcuts/index.html")}]},rg={id:"threes",name:"小三传奇",pages:[{title:"小三传奇 Pro",content:K("apps/threes/index.html")}]},sg={id:"dice",name:"掷骰子",pages:[{title:"DICE LAB",content:K("apps/dice/index.html")}]},og={id:"flow11",name:"Flow 11",bgColor:"#2E383F",pages:[{title:"Flow 11",content:K("apps/flow11/index.html")}]},lg={id:"safari",name:"浏览器",pages:[{title:"浏览器",content:K("apps/safari/index.html")}]},cg={id:"phone",name:"电话",pages:[{title:"电话",content:K("apps/phone/index.html")}]},dg={id:"facetime",name:"FaceTime",pages:[{title:"FaceTime 通话",content:`
        <div style="padding:16px 0;">
          <!-- 快捷操作按钮组 MD3 Buttons Row -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
            <button class="md3-btn md3-btn-filled" style="padding:14px;border-radius:var(--md-r-lg);">
              <span style="font-size:18px;">${g.videocam}</span>
              <span>发起视频</span>
            </button>
            <button class="md3-btn md3-btn-tonal" style="padding:14px;border-radius:var(--md-r-lg);">
              <span style="font-size:18px;">${g.link}</span>
              <span>创建链接</span>
            </button>
          </div>

          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">最近通话记录</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div style="width:40px;height:40px;border-radius:50%;background:hsl(var(--md-h,215) 60% 40%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;">张</div>
              <div class="md3-list-item-text">
                <div>张明</div>
                <div class="md3-list-item-subtext">${g.videocam} 传入视频 · 18 分钟前</div>
              </div>
              <button class="icon-btn" style="color:var(--md-primary);" aria-label="回拨">${g.call}</button>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div style="width:40px;height:40px;border-radius:50%;background:hsl(calc(var(--md-h,215) + 60) 60% 40%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;">李</div>
              <div class="md3-list-item-text">
                <div>李华</div>
                <div class="md3-list-item-subtext">${g.mic} 语音通话 · 昨天 20:15</div>
              </div>
              <button class="icon-btn" style="color:var(--md-primary);" aria-label="回拨">${g.call}</button>
            </div>
          </div>
        </div>
      `}]},pg={id:"contacts",name:"通讯录",pages:[{title:"通讯录",content:K("apps/contacts/index.html")}]},ug={id:"findmy",name:"查找",pages:[{title:"查找设备",content:`
        <div style="padding:16px 0;">
          <!-- 模拟雷达扫描地图卡片 MD3 Card -->
          <div class="md3-card md3-card-elevated" style="height:180px;padding:0;overflow:hidden;position:relative;margin-bottom:16px;background:linear-gradient(135deg,#0a192f,#020c1b);border:1px solid var(--md-outline-variant);display:flex;align-items:center;justify-content:center;">
            <div style="width:120px;height:120px;border-radius:50%;border:1px solid hsla(var(--md-h,215),80%,60%,0.3);display:flex;align-items:center;justify-content:center;">
              <div style="width:60px;height:60px;border-radius:50%;border:1px solid hsla(var(--md-h,215),80%,60%,0.5);display:flex;align-items:center;justify-content:center;">
                <div style="width:10px;height:10px;border-radius:50%;background:var(--md-accent,#80d8ff);box-shadow:0 0 10px #80d8ff;"></div>
              </div>
            </div>
            <div style="position:absolute;bottom:10px;left:14px;font-size:11px;color:var(--md-on-surface-variant);">定位网络已连接 · 5 台设备在线</div>
          </div>

          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">我的设备</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.smartphone}</div>
              <div class="md3-list-item-text">
                <div>Pixel 9 Pro / 当前设备</div>
                <div class="md3-list-item-subtext" id="findmyThisDeviceBattery">在此设备上 · 电量 87%</div>
              </div>
              <span style="color:var(--md-success);font-size:12px;font-weight:600;">在线</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.laptop}</div>
              <div class="md3-list-item-text">
                <div>MacBook Pro (M3)</div>
                <div class="md3-list-item-subtext">家 · 刚刚活跃</div>
              </div>
              <span style="color:var(--md-success);font-size:12px;font-weight:600;">在线</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${g.headphones}</div>
              <div class="md3-list-item-text">
                <div>Pixel Buds Pro</div>
                <div class="md3-list-item-subtext">随身背包中 · 充电盒 92%</div>
              </div>
              <span style="color:var(--md-on-surface-variant);font-size:12px;">附近</span>
            </div>
          </div>
        </div>
      `}]};Qo(e=>{const t=document.getElementById("findmyThisDeviceBattery");!t||!t.isConnected||(t.textContent=e.charging?`在此设备上 · 电量 ${e.level}%（充电中）`:`在此设备上 · 电量 ${e.level}%`)});const fg={id:"translate",name:"翻译",pages:[{title:"翻译",content:K("apps/translate/index.html")}]},mg={id:"game2048",name:"2048 接龙",pages:[{title:"2048 纸牌接龙",content:K("apps/game2048/index.html")}]},hg={id:"books",name:"图书",pages:[{title:"图书",content:K("apps/books/index.html")}]},gg={id:"files",name:"文件",pages:[{title:"文件",content:`
        <!-- v7.27 filesStage：二级目录推入/推出动画舞台（新层 filesRoot 位移、旧层 ghost 快照覆盖） -->
        <div id="filesStage" style="position:relative;">
        <div id="filesRoot" style="padding:16px 0 32px;position:relative;">
          <style>
            /* 文件应用触控与视觉细节：行内操作钮热区 ≥40px、列表行按压反馈 */
            .files-act { min-width: 40px; min-height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; transition: background .15s; }
            .files-act:active { background: hsl(var(--md-h, 215) 40% 60% / .18); }
            .files-row { min-height: 56px; }
          </style>
          <!-- 存储概览卡（仅根目录显示） -->
          <div class="md3-card md3-card-elevated" id="filesSummary" style="margin:4px 0 16px;padding:16px;display:flex;align-items:center;gap:14px;">
            <div style="width:44px;height:44px;border-radius:14px;background:hsl(var(--md-h,215) 80% 40% / 0.15);display:flex;align-items:center;justify-content:center;color:var(--md-primary,hsl(var(--md-h,215) 80% 45%));">${g.storage}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">内部存储</div>
              <div id="filesSummaryText" style="font-size:13px;color:var(--md-on-surface-variant);margin-top:2px;">统计中…</div>
            </div>
          </div>

          <!-- 操作工具行 -->
          <div style="display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap;">
            <button class="md3-btn md3-btn-tonal" id="filesBtnMkdir" style="flex:1;min-width:110px;min-height:44px;">${g.create_new_folder}<span style="margin-left:6px;">新建文件夹</span></button>
            <button class="md3-btn md3-btn-tonal" id="filesBtnNewTxt" style="flex:1;min-width:110px;min-height:44px;">${g.description}<span style="margin-left:6px;">新建文本</span></button>
            <button class="md3-btn md3-btn-tonal" id="filesBtnImport" style="flex:1;min-width:110px;min-height:44px;">${g.upload_file}<span style="margin-left:6px;">导入</span></button>
            <button class="md3-btn md3-btn-filled" id="filesBtnPaste" style="flex:1;min-width:110px;min-height:44px;display:none;">${g.content_paste}<span style="margin-left:6px;">粘贴</span></button>
          </div>

          <!-- 面包屑 -->
          <div id="filesCrumbs" style="display:flex;align-items:center;gap:2px;flex-wrap:wrap;font-size:13px;color:var(--md-on-surface-variant);margin:0 4px 10px;min-height:24px;"></div>

          <!-- 文件列表 -->
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div id="filesList"></div>
            <div id="filesEmpty" style="display:none;padding:36px 20px;text-align:center;color:var(--md-on-surface-variant);">
              <div style="opacity:.45;margin-bottom:10px;"><span style="display:inline-block;transform:scale(2);">${g.folder}</span></div>
              <div style="font-size:14px;">此目录为空</div>
              <div style="font-size:12px;margin-top:4px;opacity:.8;">用上方按钮新建，或把电脑里的文件「导入」进来</div>
            </div>
          </div>

          <input type="file" id="filesFileInput" multiple style="display:none;" />

          <!-- 预览浮层（覆盖整个应用页面） -->
          <div id="filesPreview" style="display:none;position:absolute;inset:0;z-index:60;background:var(--md-surface,#141418);flex-direction:column;">
            <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--md-outline-variant);">
              <button class="md3-btn md3-btn-tonal" id="filesPreviewClose" style="min-width:0;padding:8px 12px;min-height:40px;">${g.back}<span style="margin-left:4px;">返回</span></button>
              <div id="filesPreviewName" style="flex:1;font-size:14px;font-weight:600;color:var(--md-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div>
              <button class="md3-btn md3-btn-tonal" id="filesPreviewDownload" style="min-width:40px;min-height:40px;padding:8px 10px;" title="导出到电脑">${g.download}</button>
              <button class="md3-btn md3-btn-tonal" id="filesPreviewShare" style="min-width:40px;min-height:40px;padding:8px 10px;" title="分享">${g.quick_share}</button>
            </div>
            <div id="filesPreviewBody" style="flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:16px;"></div>
          </div>

          <!-- 分享目标面板 -->
          <div id="filesShareSheet" style="display:none;position:absolute;inset:0;z-index:70;background:rgba(0,0,0,.45);" >
            <div style="position:absolute;left:0;right:0;bottom:0;background:var(--md-surface-container,#1e1e24);border-radius:24px 24px 0 0;padding:18px 16px 26px;">
              <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin:0 4px 12px;" id="filesShareTitle">分享</div>
              <div id="filesShareTargets"></div>
              <button class="md3-btn md3-btn-tonal" id="filesShareCancel" style="width:100%;min-height:44px;margin-top:6px;">取消</button>
            </div>
          </div>

          <!-- 通用 MD3 对话框（新建 / 重命名 / 删除确认） -->
          <div id="filesDialog" style="display:none;position:absolute;inset:0;z-index:80;background:rgba(0,0,0,.45);align-items:center;justify-content:center;padding:28px;">
            <div class="md3-card md3-card-elevated" style="width:100%;max-width:340px;padding:22px 20px 14px;">
              <div id="filesDialogTitle" style="font-size:17px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;"></div>
              <div id="filesDialogMsg" style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:10px;white-space:pre-wrap;display:none;"></div>
              <input id="filesDialogInput" type="text" style="width:100%;box-sizing:border-box;background:var(--md-surface-container-high,#2a2a32);border:1px solid var(--md-outline-variant);border-radius:12px;color:var(--md-on-surface);font-size:14px;padding:11px 12px;outline:none;display:none;" />
              <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:14px;">
                <button class="md3-btn md3-btn-tonal" id="filesDialogCancel" style="min-height:44px;">取消</button>
                <button class="md3-btn md3-btn-filled" id="filesDialogOk" style="min-height:44px;">确定</button>
              </div>
            </div>
          </div>
        </div>

          <script>
            (function() {
              'use strict';
              var V = window.__vfs || null;
              var CB = function() { return window.__clipboard || null; };
              var $ = function(id) { return document.getElementById(id); };

              var listEl = $('filesList'), emptyEl = $('filesEmpty'), crumbsEl = $('filesCrumbs');
              var summaryEl = $('filesSummary'), summaryTextEl = $('filesSummaryText');
              var pasteBtn = $('filesBtnPaste');
              var previewEl = $('filesPreview'), previewBody = $('filesPreviewBody'), previewName = $('filesPreviewName');
              var shareSheet = $('filesShareSheet'), shareTargets = $('filesShareTargets'), shareTitle = $('filesShareTitle');
              var dlgEl = $('filesDialog'), dlgTitle = $('filesDialogTitle'), dlgMsg = $('filesDialogMsg'), dlgInput = $('filesDialogInput');

              var cwd = '/';
              var visible = false;
              var renderTimer = null;
              var lastDragMoved = false; // 拖拽结束抑制随后的一次 click
              var currentPreviewPath = null;

              // ---------- v7.27 二级目录互动动画（与桌面 folder.js 同曲线语言的推入/推出） ----------
              // 前进（点文件夹行）：新目录层自右侧 44px 弹入（cubic-bezier(0.2,0.95,0.25,1.05)），
              // 旧目录层快照向左视差淡出；返回（点面包屑上级）：镜像反向。
              // 纪律：仅驱动 transform/opacity；ghost 剥离全部 id 防重复；动中再导航即完成旧场。
              var stageEl = $('filesStage'), rootEl = $('filesRoot');
              var navAnimating = false;
              var navCleanup = null;

              function prefersNoMotion() {
                try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
              }
              function depthOf(p) {
                return p === '/' ? 0 : p.split('/').filter(Boolean).length;
              }
              function scrollPageTop() {
                try {
                  var el = stageEl;
                  while (el && el !== document.body) {
                    var st = getComputedStyle(el);
                    if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) { el.scrollTop = 0; return; }
                    el = el.parentElement;
                  }
                } catch (e) {}
              }
              function completeNavAnim() {
                if (navCleanup) { try { navCleanup(); } catch (e) {} navCleanup = null; }
                navAnimating = false;
              }
              function navigate(path) {
                if (path === cwd) return;
                var fwd = depthOf(path) > depthOf(cwd); // 方向基准：导航前的 cwd（面包屑必为回退，行点击必为前进）
                if (navAnimating || prefersNoMotion() || document.hidden || !stageEl || !rootEl) {
                  completeNavAnim();
                  cwd = path;
                  render();
                  scrollPageTop();
                  return;
                }
                navAnimating = true;

                // 旧层快照（克隆全内容，绝对覆盖，剥 id 纯视觉）
                var ghost = rootEl.cloneNode(true);
                ghost.removeAttribute('id');
                var ids = ghost.querySelectorAll('[id]');
                for (var gi = 0; gi < ids.length; gi++) ids[gi].removeAttribute('id');
                ghost.setAttribute('aria-hidden', 'true');
                ghost.style.position = 'absolute';
                ghost.style.inset = '0';
                ghost.style.zIndex = '1';
                ghost.style.pointerEvents = 'none';
                ghost.style.background = 'var(--md-surface,#1a1b1e)';
                ghost.style.margin = '0';
                ghost.style.willChange = 'transform, opacity';
                stageEl.appendChild(ghost);

                // 新层渲染 + 回到顶部
                cwd = path;
                render();
                scrollPageTop();

                var inX = fwd ? '44px' : '-44px';
                var outX = fwd ? '-30px' : '30px';

                rootEl.style.willChange = 'transform';
                rootEl.style.transition = 'none';
                rootEl.style.transform = 'translateX(' + inX + ') scale(0.985)';
                rootEl.style.opacity = '0';
                void rootEl.offsetWidth; // 锁定入场初态

                rootEl.style.transition = 'transform 0.34s cubic-bezier(0.2, 0.95, 0.25, 1.05), opacity 0.22s ease';
                rootEl.style.transform = '';
                rootEl.style.opacity = '';

                ghost.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.26s ease';
                ghost.style.transform = 'translateX(' + outX + ') scale(0.99)';
                ghost.style.opacity = '0';

                navCleanup = function() {
                  if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
                  rootEl.style.willChange = '';
                  rootEl.style.transition = '';
                  rootEl.style.transform = '';
                  rootEl.style.opacity = '';
                };
                setTimeout(function() { if (navCleanup) completeNavAnim(); }, 380);
              }

              function esc(s) {
                return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
              }
              function toast(msg) {
                try { if (window.showSystemToast) window.showSystemToast(msg); } catch (e) {}
              }
              function fmtBytes(b) {
                try { if (window.__storageStats) return window.__storageStats.formatBytes(b); } catch (e) {}
                if (!b || b < 0) return '0 B';
                if (b < 1024) return b + ' B';
                if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
                return (b / 1048576).toFixed(2) + ' MB';
              }
              function fmtTime(ts) {
                try { return new Date(ts || Date.now()).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
              }
              function parentOf(p) { var i = p.lastIndexOf('/'); return i <= 0 ? '/' : p.slice(0, i); }
              function baseName(p) { return p.slice(p.lastIndexOf('/') + 1); }

              function iconFor(entry) {
                if (entry.type === 'dir') return '${g.folder}';
                var m = entry.mime || '';
                if (m.indexOf('image/') === 0) return '${g.image}';
                if (m.indexOf('audio/') === 0) return '${g.music_note}';
                if (m.indexOf('video/') === 0) return '${g.videocam}';
                if (m.indexOf('text/') === 0 || m === 'application/json') return '${g.description}';
                return '${g.insert_drive_file}';
              }
              function iconColor(entry) {
                if (entry.type === 'dir') return 'hsl(45 90% 58%)';
                var m = entry.mime || '';
                if (m.indexOf('image/') === 0) return 'hsl(150 60% 52%)';
                if (m.indexOf('audio/') === 0) return 'hsl(280 60% 66%)';
                if (m.indexOf('video/') === 0) return 'hsl(10 70% 58%)';
                if (m.indexOf('text/') === 0 || m === 'application/json') return 'hsl(210 70% 60%)';
                return 'var(--md-on-surface-variant)';
              }

              // ---------- 渲染 ----------
              function scheduleRender() {
                if (renderTimer) return;
                renderTimer = setTimeout(function() { renderTimer = null; render(); }, 120);
              }

              function renderCrumbs() {
                var html = '<span data-crumb="/" style="cursor:pointer;" >内部存储</span>';
                if (cwd !== '/') {
                  var parts = cwd.split('/').filter(Boolean);
                  var acc = '';
                  for (var i = 0; i < parts.length; i++) {
                    acc += '/' + parts[i];
                    html += ' <span style="opacity:.55;">›</span> <span data-crumb="' + esc(acc) + '" style="cursor:pointer;' + (i === parts.length - 1 ? 'color:var(--md-on-surface);font-weight:600;' : '') + '">' + esc(parts[i]) + '</span>';
                  }
                }
                crumbsEl.innerHTML = html;
              }

              function renderSummary() {
                if (cwd !== '/') { summaryEl.style.display = 'none'; return; }
                summaryEl.style.display = 'flex';
                if (!V) { summaryTextEl.textContent = '虚拟存储未就绪 —— 请关闭应用后重新打开'; return; }
                try {
                  var u = V.usage();
                  var bits = [];
                  for (var i = 0; i < u.byDir.length && i < 3; i++) {
                    bits.push(u.byDir[i].dir.slice(1) + ' ' + fmtBytes(u.byDir[i].bytes));
                  }
                  summaryTextEl.textContent = u.files + ' 个文件 · ' + u.dirs + ' 个目录 · 共 ' + fmtBytes(u.bytes) + (bits.length ? '（' + bits.join('，') + '）' : '');
                } catch (e) {
                  summaryTextEl.textContent = '统计暂不可用（读取异常）';
                }
              }

              function renderPasteBtn() {
                var c = CB();
                var show = !!(c && c.has());
                pasteBtn.style.display = show ? 'inline-flex' : 'none';
                if (show) {
                  var item = c.get();
                  pasteBtn.querySelector('span').textContent = item && item.cut ? '粘贴（移动）' : '粘贴';
                }
              }

              function rowHtml(entry) {
                var meta = entry.type === 'dir' ? (entry.meta && entry.meta.hint) || '' : (fmtBytes(entry.size) + ' · ' + fmtTime(entry.modified));
                return '<div class="files-row md3-list-item" data-path="' + esc(entry.path) + '" data-type="' + entry.type + '" style="cursor:pointer;">'
                  + '<div class="md3-list-item-icon" style="color:' + iconColor(entry) + ';">' + iconFor(entry) + '</div>'
                  + '<div class="md3-list-item-text" style="min-width:0;"><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(entry.name) + '</span><span style="font-size:12px;opacity:.6;">' + esc(meta) + '</span></div>'
                  + (entry.type === 'file'
                    ? '<button class="files-act md3-list-item-icon" data-act="copy" data-path="' + esc(entry.path) + '" title="复制" style="color:var(--md-on-surface-variant);">${g.content_copy}</button>'
                      + '<button class="files-act md3-list-item-icon" data-act="more" data-path="' + esc(entry.path) + '" title="更多" style="color:var(--md-on-surface-variant);">${g.menu}</button>'
                    : '<span style="color:var(--md-on-surface-variant);font-size:18px;">›</span>')
                  + '</div>';
              }

              function render() {
                if (!visible) return;
                if (!V) {
                  // 存储桥未就绪：给出明确兜底，而不是永远停留在「统计中…」
                  renderCrumbs();
                  summaryEl.style.display = 'flex';
                  summaryTextEl.textContent = '虚拟存储未就绪 —— 请关闭应用后重新打开';
                  emptyEl.style.display = 'block';
                  listEl.innerHTML = '';
                  return;
                }
                renderCrumbs();
                renderSummary();
                renderPasteBtn();
                var entries = V.list(cwd);
                emptyEl.style.display = entries.length ? 'none' : 'block';
                listEl.innerHTML = entries.map(rowHtml).join('');
              }

              // ---------- 通用对话框 ----------
              var dlgResolve = null;
              function askDialog(opts) {
                dlgTitle.textContent = opts.title || '';
                if (opts.message) { dlgMsg.style.display = 'block'; dlgMsg.textContent = opts.message; }
                else { dlgMsg.style.display = 'none'; dlgMsg.textContent = ''; }
                if (opts.input !== undefined) {
                  dlgInput.style.display = 'block';
                  dlgInput.value = opts.input || '';
                } else {
                  dlgInput.style.display = 'none';
                  dlgInput.value = '';
                }
                $('filesDialogOk').style.background = opts.danger ? 'var(--md-error,#b3261e)' : '';
                dlgEl.style.display = 'flex';
                setTimeout(function() {
                  if (dlgInput.style.display !== 'none') {
                    dlgInput.focus();
                    var dot = dlgInput.value.lastIndexOf('.');
                    try { dlgInput.setSelectionRange(0, dot > 0 ? dot : dlgInput.value.length); } catch (e) {}
                  }
                }, 30);
                return new Promise(function(resolve) { dlgResolve = resolve; });
              }
              function closeDialog(val) {
                dlgEl.style.display = 'none';
                if (dlgResolve) { dlgResolve(val); dlgResolve = null; }
              }
              $('filesDialogOk').onclick = function() {
                closeDialog(dlgInput.style.display !== 'none' ? dlgInput.value.trim() : true);
              };
              $('filesDialogCancel').onclick = function() { closeDialog(null); };
              dlgEl.addEventListener('click', function(e) { if (e.target === dlgEl) closeDialog(null); });
              dlgInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') closeDialog(dlgInput.value.trim());
              });
              function validName(name) {
                if (!name || name === '.' || name === '..' || name.indexOf('/') !== -1) return null;
                return name;
              }

              // ---------- 列表交互（事件委托；列表与面包屑共用同一处理器） ----------
              function entryOf(path) {
                return V.stat(path);
              }

              function onListClick(e) {
                if (lastDragMoved) { lastDragMoved = false; return; }
                var actBtn = e.target.closest('.files-act');
                if (actBtn) {
                  e.stopPropagation();
                  var p = actBtn.getAttribute('data-path');
                  if (actBtn.getAttribute('data-act') === 'copy') copyToClipboard(p);
                  else openMoreSheet(p);
                  return;
                }
                var crumb = e.target.closest('[data-crumb]');
                if (crumb) { navigate(crumb.getAttribute('data-crumb') || '/'); return; }
                var row = e.target.closest('.files-row');
                if (!row) return;
                var path = row.getAttribute('data-path');
                var type = row.getAttribute('data-type');
                if (type === 'dir') { navigate(path); }
                else openPreview(path);
              }
              listEl.addEventListener('click', onListClick);
              crumbsEl.addEventListener('click', onListClick); // 面包屑在列表容器外，需单独绑定

              function copyToClipboard(path) {
                var c = CB();
                if (!c) { toast('剪贴板不可用'); return; }
                var r = c.set({ kind: 'files', paths: [path], cut: false }, 'files');
                toast(r.ok ? '已复制 1 项' : (r.error || '复制失败'));
              }

              // ---------- 更多操作面板（复用分享面板容器） ----------
              var morePath = null;
              function openMoreSheet(path) {
                morePath = path;
                shareTitle.textContent = baseName(path);
                var isText = (entryOf(path) || {}).mime || '';
                var isImg = isText.indexOf('image/') === 0;
                shareTargets.innerHTML =
                  '<button class="md3-list-item" data-more="cut" style="width:100%;"><div class="md3-list-item-icon">${g.content_copy}</div><div class="md3-list-item-text">剪切</div></button>'
                  + '<button class="md3-list-item" data-more="rename" style="width:100%;"><div class="md3-list-item-icon">${g.edit}</div><div class="md3-list-item-text">重命名</div></button>'
                  + '<button class="md3-list-item" data-more="share" style="width:100%;"><div class="md3-list-item-icon">${g.quick_share}</div><div class="md3-list-item-text">分享</div></button>'
                  + '<button class="md3-list-item" data-more="download" style="width:100%;"><div class="md3-list-item-icon">${g.download}</div><div class="md3-list-item-text">导出到电脑</div></button>'
                  + '<button class="md3-list-item" data-more="del" style="width:100%;"><div class="md3-list-item-icon" style="color:var(--md-error,#f2b8b5);">${g.delete_forever}</div><div class="md3-list-item-text" style="color:var(--md-error,#f2b8b5);">删除</div></button>';
                shareSheet.style.display = 'block';
              }

              shareTargets.addEventListener('click', function(e) {
                var btn = e.target.closest('[data-more]');
                if (!btn) return;
                var act = btn.getAttribute('data-more');
                shareSheet.style.display = 'none';
                var p = morePath; morePath = null;
                if (!p) return;
                if (act === 'cut') {
                  var c = CB();
                  var r = c && c.set({ kind: 'files', paths: [p], cut: true }, 'files');
                  toast(r && r.ok ? '已剪切 1 项' : '剪切失败');
                } else if (act === 'rename') {
                  doRename(p);
                } else if (act === 'share') {
                  openShareSheet(p);
                } else if (act === 'download') {
                  downloadFile(p);
                } else if (act === 'del') {
                  doDelete(p);
                }
              });
              $('filesShareCancel').onclick = function() { shareSheet.style.display = 'none'; morePath = null; };
              shareSheet.addEventListener('click', function(e) { if (e.target === shareSheet) { shareSheet.style.display = 'none'; morePath = null; } });

              async function doRename(p) {
                var old = baseName(p);
                var name = await askDialog({ title: '重命名', input: old });
                if (name === null) return;
                name = validName(name);
                if (!name) { toast('名称不合法'); return; }
                if (name === old) return;
                var r = await V.move(p, parentOf(p) + '/' + name);
                toast(r.ok ? '已重命名' : (r.error || '重命名失败'));
              }

              async function doDelete(p) {
                var ok = await askDialog({ title: '删除', message: '确定删除「' + baseName(p) + '」吗？' + (entryOf(p) && entryOf(p).type === 'dir' ? '\\n目录内的全部内容都会被删除。' : ''), danger: true });
                if (!ok) return;
                var r = await V.del(p);
                toast(r.ok ? '已删除' : (r.error || '删除失败'));
              }

              function downloadFile(p) {
                V.readBlob(p).then(function(blob) {
                  if (!blob) { toast('读取失败'); return; }
                  var a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = baseName(p);
                  a.style.display = 'none';
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(function() { try { a.remove(); URL.revokeObjectURL(a.href); } catch (e) {} }, 3000);
                  toast('已开始导出');
                });
              }

              // ---------- 分享（files/share → 信息；photo/captured → 相册） ----------
              function openShareSheet(path) {
                var entry = entryOf(path) || {};
                var isImg = (entry.mime || '').indexOf('image/') === 0;
                var isText = (entry.mime || '').indexOf('text/') === 0 || entry.mime === 'application/json';
                shareTitle.textContent = '分享「' + baseName(path) + '」';
                var html = '<button class="md3-list-item" data-share="msg" style="width:100%;"><div class="md3-list-item-icon">${g.chat}</div><div class="md3-list-item-text">发送到 信息</div></button>';
                if (isImg) html += '<button class="md3-list-item" data-share="photo" style="width:100%;"><div class="md3-list-item-icon">${g.image}</div><div class="md3-list-item-text">保存到 相册</div></button>';
                if (isText) html += '<button class="md3-list-item" data-share="notes" style="width:100%;"><div class="md3-list-item-icon">${g.assignment}</div><div class="md3-list-item-text">存为 便签</div></button>';
                shareTargets.innerHTML = html;
                shareTargets.setAttribute('data-sharing-path', path);
                shareSheet.style.display = 'block';
              }

              shareTargets.addEventListener('click', function(e) {
                var btn = e.target.closest('[data-share]');
                if (!btn) return;
                var target = btn.getAttribute('data-share');
                var path = shareTargets.getAttribute('data-sharing-path') || '';
                shareSheet.style.display = 'none';
                shareTargets.removeAttribute('data-sharing-path');
                if (!path) return;
                var emit = function(event, payload) {
                  // 模块应用运行在桌面文档内：BUS_EMIT 必须发到总线所在窗口（window 自身）。
                  // 旧实现只发 window.parent —— 桌面被根壳 iframe 包裹时 parent 是外壳，
                  // 总线收不到，分享会静默丢失（直连桌面测试时恰为顶层故未暴露）。
                  var msg = { type: 'BUS_EMIT', event: event, payload: payload, target: target === 'msg' ? 'msg' : (target === 'photo' ? 'photo' : 'notes') };
                  try { window.postMessage(msg, '*'); } catch (err) {}
                  try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (err) {}
                };
                if (target === 'photo') {
                  V.readBlob(path).then(function(blob) {
                    if (!blob) { toast('读取失败'); return; }
                    var fr = new FileReader();
                    fr.onload = function() {
                      emit('photo/captured', { id: 'fs' + Date.now(), type: 'image', src: String(fr.result), name: baseName(path), noti: { title: '文件已保存到相册', desc: baseName(path) } });
                      toast('已发送到相册');
                    };
                    fr.readAsDataURL(blob);
                  });
                } else if (target === 'notes') {
                  V.readText(path).then(function(text) {
                    emit('files/share', { name: baseName(path), text: text || '', noti: { title: '文件分享到便签', desc: baseName(path) } });
                    toast('已发送到便签');
                  });
                } else {
                  var entry = entryOf(path) || {};
                  var isText = (entry.mime || '').indexOf('text/') === 0 || entry.mime === 'application/json';
                  var send = function(textPart) {
                    emit('files/share', { name: baseName(path), text: textPart, noti: { title: '文件分享到信息', desc: baseName(path) } });
                    toast('已发送到信息');
                  };
                  if (isText) V.readText(path).then(send); else send('（文件）' + baseName(path) + ' · ' + fmtBytes(entry.size || 0));
                }
              });

              // ---------- 预览 ----------
              function closePreview() {
                previewEl.style.display = 'none';
                previewBody.innerHTML = '';
                currentPreviewPath = null;
              }
              $('filesPreviewClose').onclick = closePreview;

              async function openPreview(path) {
                var entry = entryOf(path);
                if (!entry) return;
                currentPreviewPath = path;
                previewName.textContent = entry.name;
                var mime = entry.mime || '';
                var html = '';
                if (mime.indexOf('image/') === 0) {
                  var url = await V.readURL(path);
                  html = url ? '<img src="' + url + '" style="max-width:100%;max-height:100%;border-radius:12px;" alt="" />' : '<div style="color:var(--md-on-surface-variant);">图片加载失败</div>';
                } else if (mime.indexOf('audio/') === 0) {
                  var aurl = await V.readURL(path);
                  html = '<div style="width:100%;text-align:center;">'
                    + '<div style="opacity:.5;margin-bottom:18px;"><span style="display:inline-block;transform:scale(2.6);">${g.music_note}</span></div>'
                    + (aurl ? '<audio src="' + aurl + '" controls style="width:100%;max-width:420px;"></audio>' : '<div style="color:var(--md-on-surface-variant);">音频加载失败</div>')
                    + '</div>';
                } else if (mime.indexOf('video/') === 0) {
                  var vurl = await V.readURL(path);
                  html = vurl ? '<video src="' + vurl + '" controls style="max-width:100%;max-height:100%;border-radius:12px;"></video>' : '<div style="color:var(--md-on-surface-variant);">视频加载失败</div>';
                } else if (mime.indexOf('text/') === 0 || mime === 'application/json') {
                  var text = await V.readText(path);
                  html = '<pre style="width:100%;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.7;color:var(--md-on-surface);margin:0;font-family:inherit;">' + esc(text == null ? '（空文件）' : text) + '</pre>';
                } else {
                  html = '<div style="text-align:center;color:var(--md-on-surface-variant);">'
                    + '<div style="opacity:.5;margin-bottom:14px;"><span style="display:inline-block;transform:scale(2.4);">${g.insert_drive_file}</span></div>'
                    + '<div style="font-size:14px;color:var(--md-on-surface);">' + esc(entry.name) + '</div>'
                    + '<div style="font-size:12px;margin-top:4px;">' + esc(mime || '未知类型') + ' · ' + fmtBytes(entry.size) + '</div>'
                    + '<div style="font-size:12px;margin-top:10px;opacity:.8;">此类文件暂不支持预览，可导出到电脑查看</div>'
                    + '</div>';
                }
                previewBody.innerHTML = html;
                previewEl.style.display = 'flex';

                // ---------- v7.24 应用互联：音频「用音乐播放」深链按钮 ----------
                // 装入 CyanWave 音乐应用：BUS_EMIT(music/import) 先入总线（目标未启动自动
                // 排队、挂载补投），再经桌面图标位姿动画打开音乐 —— 打开即选中新曲并尝试播放。
                // objectURL 由 VFS urlCache 持有（删文件才回收），音乐应用跨界面使用安全。
                if (mime.indexOf('audio/') === 0 && aurl) {
                  var playInMusicBtn = document.createElement('button');
                  playInMusicBtn.type = 'button';
                  playInMusicBtn.textContent = '用音乐播放';
                  playInMusicBtn.style.cssText = 'margin:18px auto 4px;display:block;padding:11px 28px;border:none;'
                    + 'border-radius:9999px;cursor:pointer;font:600 13px/1 var(--md-font,sans-serif);'
                    + 'color:#fff;background:var(--md-primary,#4f9cf9)';
                  playInMusicBtn.onclick = function() {
                    var msg = { type: 'BUS_EMIT', event: 'music/import', target: 'music',
                      payload: { url: aurl, name: baseName(path), autoPlay: true, __silent: true } };
                    // srcdoc 与桌面同文档：发自身窗口即入总线；包根壳时再补发 parent 双保险
                    try { window.postMessage(msg, '*'); } catch (err) {}
                    try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (err) {}
                    if (window.__shareSheet && typeof window.__shareSheet.openAppById === 'function') {
                      window.__shareSheet.openAppById('music');
                    } else {
                      toast('已投递到音乐应用（独立打开模式无桌面动画）');
                    }
                    closePreview();
                  };
                  previewBody.appendChild(playInMusicBtn);
                }
              }

              $('filesPreviewDownload').onclick = function() { if (currentPreviewPath) downloadFile(currentPreviewPath); };
              $('filesPreviewShare').onclick = function() {
                if (!currentPreviewPath) return;
                openShareSheet(currentPreviewPath);
              };

              // ---------- 工具行按钮 ----------
              $('filesBtnMkdir').onclick = async function() {
                var name = await askDialog({ title: '新建文件夹', input: '新建文件夹' });
                if (name === null) return;
                name = validName(name);
                if (!name) { toast('名称不合法'); return; }
                var r = await V.mkdir(cwd === '/' ? '/' + name : cwd + '/' + name);
                toast(r.ok ? '文件夹已创建' : (r.error || '创建失败'));
              };

              $('filesBtnNewTxt').onclick = async function() {
                var name = await askDialog({ title: '新建文本文档', input: '新建文本.txt' });
                if (name === null) return;
                name = validName(name);
                if (!name) { toast('名称不合法'); return; }
                var r = await V.write((cwd === '/' ? '' : cwd) + '/' + name, '', { owner: 'files' });
                toast(r.ok ? '文档已创建' : (r.error || '创建失败'));
              };

              $('filesBtnImport').onclick = function() { $('filesFileInput').click(); };
              $('filesFileInput').addEventListener('change', function(e) {
                var files = Array.prototype.slice.call(e.target.files || []);
                e.target.value = '';
                if (!files.length) return;
                var done = 0, fail = 0;
                // fix(audit-E): 导入失败时把 vfs 返回的 r.error（如「目标已存在同名文件」）
                // 如实透出 —— 此前只统计失败个数，用户看不到失败原因
                var lastErr = '';
                var next = function(i) {
                  if (i >= files.length) {
                    toast('导入完成：成功 ' + done + ' 个' + (fail ? '，失败 ' + fail + ' 个' + (lastErr ? '（' + lastErr + '）' : '') : ''));
                    return;
                  }
                  var f = files[i];
                  V.write((cwd === '/' ? '' : cwd) + '/' + f.name, f, { owner: 'files' }).then(function(r) {
                    if (r.ok) done++; else { fail++; lastErr = r.error || ''; }
                    next(i + 1);
                  });
                };
                next(0);
              });

              pasteBtn.onclick = async function() {
                var c = CB();
                var item = c && c.get();
                if (!item) return;
                if (item.kind === 'files') {
                  var moved = 0, fail = 0;
                  for (var i = 0; i < item.paths.length; i++) {
                    var p = item.paths[i];
                    var target = (cwd === '/' ? '' : cwd) + '/' + baseName(p);
                    if (item.cut && (target === p || target.indexOf(p + '/') === 0)) { fail++; continue; }
                    // 同名自动加序号
                    var finalTarget = target, n = 1;
                    while (V.exists(finalTarget)) {
                      var dot = target.lastIndexOf('.');
                      finalTarget = dot > target.lastIndexOf('/') ? target.slice(0, dot) + ' (' + n + ')' + target.slice(dot) : target + ' (' + n + ')';
                      n++;
                    }
                    var r = item.cut ? await V.move(p, finalTarget) : await V.copy(p, finalTarget);
                    if (r.ok) moved++; else fail++;
                  }
                  if (item.cut && c.clear && !fail) c.clear();
                  toast((item.cut ? '已移动 ' : '已粘贴 ') + moved + ' 项' + (fail ? '，失败 ' + fail + ' 项' : ''));
                } else if (item.kind === 'image') {
                  var name = item.name || ('clipboard_' + Date.now() + '.png');
                  var dot2 = name.lastIndexOf('.');
                  var base2 = dot2 > 0 ? name.slice(0, dot2) : name;
                  var ext2 = dot2 > 0 ? name.slice(dot2) : '';
                  var t2 = (cwd === '/' ? '' : cwd) + '/' + base2 + ext2, k = 1;
                  while (V.exists(t2)) { t2 = (cwd === '/' ? '' : cwd) + '/' + base2 + ' (' + k + ')' + ext2; k++; }
                  var r2 = await V.write(t2, item.dataUrl, { owner: 'files' });
                  toast(r2.ok ? '图片已粘贴为 ' + base2 + ext2 : (r2.error || '粘贴失败'));
                } else if (item.kind === 'text') {
                  var tname = '剪贴板_' + new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/[s/:]+/g, '') + '.txt';
                  var r3 = await V.write((cwd === '/' ? '' : cwd) + '/' + tname, item.text, { owner: 'files' });
                  toast(r3.ok ? '文本已粘贴为 ' + tname : (r3.error || '粘贴失败'));
                }
              };

              // ---------- 轻量拖拽：长按文件拖到文件夹行即移动 ----------
              var drag = null; // { path, ghost, started }
              function pageEl() { return listEl.closest('.app-page') || document.body; }
              function dragGhost(entry, x, y) {
                var g = document.createElement('div');
                g.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:14px;background:var(--md-surface-container-high,#2a2a32);box-shadow:0 8px 24px rgba(0,0,0,.4);font-size:13px;color:var(--md-on-surface);max-width:200px;';
                g.innerHTML = '<span style="width:18px;height:18px;display:inline-flex;color:' + iconColor(entry) + ';">' + iconFor(entry) + '</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(entry.name) + '</span>';
                g.style.left = (x + 12) + 'px';
                g.style.top = (y - 10) + 'px';
                return g;
              }
              function clearDragHighlight() {
                listEl.querySelectorAll('.files-row.drag-over').forEach(function(el) { el.style.background = ''; el.classList.remove('drag-over'); });
              }
              listEl.addEventListener('pointerdown', function(e) {
                if (e.button !== undefined && e.button !== 0) return;
                if (e.target.closest('.files-act')) return;
                var row = e.target.closest('.files-row');
                if (!row || row.getAttribute('data-type') !== 'file') return;
                var path = row.getAttribute('data-path');
                var entry = entryOf(path);
                if (!entry) return;
                var startX = e.clientX, startY = e.clientY;
                // fix(audit-E): 起拖只允许长按定时器触发（360ms 内不动）—— 此前「8px
                // 任意方向位移即起拖」与触摸滚动列表手势冲突，手指一滑就误开拖拽。
                // 指针移动超过 10px（容抖动）即取消长按，滚动/滑动不再误起拖。
                var timer = setTimeout(function() { startDrag(entry, e.clientX, e.clientY); }, 360);
                var onMove = function(ev) {
                  if (!drag && (Math.abs(ev.clientX - startX) > 10 || Math.abs(ev.clientY - startY) > 10)) {
                    clearTimeout(timer); // 移动即放弃长按起拖（滚动/惯性路径）
                  }
                  if (drag && drag.started) {
                    drag.ghost.style.left = (ev.clientX + 12) + 'px';
                    drag.ghost.style.top = (ev.clientY - 10) + 'px';
                    clearDragHighlight();
                    var el = document.elementFromPoint(ev.clientX, ev.clientY);
                    var over = el && el.closest ? el.closest('.files-row[data-type="dir"]') : null;
                    if (over && over.getAttribute('data-path') !== drag.path) {
                      over.classList.add('drag-over');
                      over.style.background = 'hsl(var(--md-h,215) 80% 60% / 0.14)';
                    }
                  }
                };
                // fix(audit-E): 补 pointercancel —— 浏览器接管手势（触摸滚动/系统弹窗等）
                // 时 pointerup 永不到来，旧实现的 ghost 与 window 监听全部滞留。
                // cancel 复用 onUp 的清理路径但不执行落点移动（手势被系统取消，无有效落点）。
                var dragFinish = function(ev, performDrop) {
                  clearTimeout(timer);
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                  window.removeEventListener('pointercancel', onCancel);
                  if (drag && drag.started) {
                    if (performDrop) {
                      var el = document.elementFromPoint(ev.clientX, ev.clientY);
                      var over = el && el.closest ? el.closest('.files-row[data-type="dir"]') : null;
                      if (over) {
                        var dstDir = over.getAttribute('data-path');
                        var target = dstDir === '/' ? '/' + baseName(drag.path) : dstDir + '/' + baseName(drag.path);
                        if (target !== drag.path) {
                          V.move(drag.path, target).then(function(r) { toast(r.ok ? '已移动到 ' + baseName(dstDir) : (r.error || '移动失败')); });
                        }
                        lastDragMoved = true;
                        setTimeout(function() { lastDragMoved = false; }, 250);
                      }
                    }
                    try { drag.ghost.remove(); } catch (err) {}
                    clearDragHighlight();
                    drag = null;
                  }
                };
                var onUp = function(ev) { dragFinish(ev, true); };
                var onCancel = function(ev) { dragFinish(ev, false); };
                function startDrag(entry2, x, y) {
                  if (drag && drag.started) return;
                  drag = { path: entry2.path, ghost: dragGhost(entry2, x, y), started: true };
                  pageEl().appendChild(drag.ghost);
                  try { if (navigator.vibrate) navigator.vibrate(8); } catch (err) {}
                }
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
              });

              // ---------- VFS / 剪贴板订阅 + 页面激活 ----------
              // 监听/订阅统一登记：实例销毁时由 page-stack 集中退订（防重建累积泄漏）
              var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
              var addCleanup = window.__addAppCleanup || function() {};
              if (V) {
                var unVfs = V.subscribe('/', scheduleRender);
                addCleanup('files', function() { try { unVfs(); } catch (err) {} });
              }
              if (CB()) {
                var unClip = CB().subscribe(renderPasteBtn);
                addCleanup('files', function() { try { unClip(); } catch (err) {} });
              }

              bindDoc('files', 'app-page-active', function(e) {
                if (!e.detail || e.detail.appId !== 'files') return;
                visible = e.detail.pageIdx === 0;
                if (visible) {
                  if (previewEl.style.display === 'flex' && currentPreviewPath) {
                    // 从分享面板返回预览：恢复预览浮层
                    previewEl.style.display = 'flex';
                  }
                  render();
                }
              });

              // ---------- v7.28 预览式返回：目录上行（导航栏返回键 + 边缘手势卡式跟手） ----------
              // 卡片数学与 PBNav / 宿主 renderSubPages 同源：scale 0.90 / 圆角 28px / 深投影；
              // 手势期当前目录页化为卡片右移，上层目录就位于卡下（预测性揭示）。
              var PB_MIN_SCALE = 0.90, PB_SPAN = 0.10, PB_RADIUS = 28, PB_SHADOW = 0.45, PB_TRACK = 0.85;
              var pbCard = null; // { el, fromPath }

              function pbApplyCard(el, p) {
                var q = 1 - Math.max(0, Math.min(1, p));
                if (q <= 0.001) { el.style.transform = ''; el.style.borderRadius = ''; el.style.boxShadow = ''; el.style.overflow = ''; return; }
                var scale = Math.max(PB_MIN_SCALE, 1 - PB_SPAN * q);
                el.style.transform = 'translate3d(' + (q * 100).toFixed(2) + '%,0,0) scale(' + scale.toFixed(4) + ')';
                el.style.borderRadius = (q * PB_RADIUS).toFixed(1) + 'px';
                el.style.boxShadow = '0 16px 44px rgba(0,0,0,' + (PB_SHADOW * q).toFixed(3) + '), 0 2px 10px rgba(0,0,0,0.2)';
                el.style.overflow = 'hidden';
              }

              function pbMakeCard() {
                completeNavAnim(); // 动中再导航即完成旧场（v7.27 纪律）
                var card = rootEl.cloneNode(true);
                card.removeAttribute('id');
                var ids = card.querySelectorAll('[id]');
                for (var ci = 0; ci < ids.length; ci++) ids[ci].removeAttribute('id');
                card.setAttribute('aria-hidden', 'true');
                card.style.position = 'absolute';
                card.style.inset = '0';
                card.style.zIndex = '3';
                card.style.pointerEvents = 'none';
                card.style.background = 'var(--md-surface,#1a1b1e)';
                card.style.margin = '0';
                card.style.willChange = 'transform, border-radius, box-shadow, opacity';
                stageEl.style.overflow = 'hidden'; // 卡片横移出舞台期间禁止横向溢出滚动
                stageEl.appendChild(card);
                return card;
              }

              function pbRemoveCard(card) {
                if (card && card.parentNode) card.parentNode.removeChild(card);
                if (stageEl) stageEl.style.overflow = '';
              }

              function pbCanBack() {
                return !!(previewEl.style.display === 'flex' || cwd !== '/');
              }

              function pbTriggerBack() {
                if (pbCard) return; // 手势进行中：交给手势收尾
                if (previewEl.style.display === 'flex') { closePreview(); return; }
                if (cwd === '/') return;
                if (prefersNoMotion() || document.hidden || !stageEl || !rootEl) {
                  completeNavAnim(); cwd = parentOf(cwd); render(); scrollPageTop(); return;
                }
                var from = cwd;
                var card = pbMakeCard();
                cwd = parentOf(from); render(); scrollPageTop();
                pbCard = { el: card, fromPath: from };
                pbApplyCard(card, 1);
                void card.offsetWidth;
                card.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.95, 0.25, 1.05), opacity 0.26s ease, border-radius 0.3s ease, box-shadow 0.3s ease';
                pbApplyCard(card, 0);
                card.style.opacity = '0';
                setTimeout(function() { pbRemoveCard(card); if (pbCard && pbCard.el === card) pbCard = null; }, 320);
              }

              function pbBeginGesture() {
                if (pbCard) return;
                if (previewEl.style.display === 'flex') { closePreview(); return; } // 预览浮层：手势起点即收起
                if (cwd === '/') return;
                var card = pbMakeCard();
                var from = cwd;
                cwd = parentOf(from); render(); scrollPageTop(); // 上层目录就位于卡下
                pbCard = { el: card, fromPath: from };
              }

              function pbProgressGesture(dx) {
                if (!pbCard) return;
                var w = Math.max(1, (stageEl && stageEl.clientWidth) || (rootEl && rootEl.clientWidth) || 1);
                var step = Math.max(0, Math.min(1, dx / (w * PB_TRACK)));
                pbApplyCard(pbCard.el, 1 - step);
              }

              function pbEndGesture(commit, vx) {
                if (!pbCard) return;
                var card = pbCard.el, from = pbCard.fromPath;
                pbCard = null;
                card.style.transition = 'transform 0.26s cubic-bezier(0.2, 0.95, 0.25, 1.05), opacity 0.24s ease, border-radius 0.26s ease, box-shadow 0.26s ease';
                if (commit) {
                  card.style.opacity = '0';
                  pbApplyCard(card, 0);
                  setTimeout(function() { pbRemoveCard(card); }, 280);
                } else {
                  pbApplyCard(card, 1); // 回满屏
                  setTimeout(function() {
                    cwd = from; render(); // 卡下换回原目录后再撤卡（零闪烁）
                    pbRemoveCard(card);
                  }, 270);
                }
              }

              window.__filesPB = {
                canBack: pbCanBack,
                triggerBack: pbTriggerBack,
                beginGesture: pbBeginGesture,
                progressGesture: pbProgressGesture,
                endGesture: pbEndGesture,
              };

              // 首次进入（实例创建即激活第 0 页）
              visible = true;
              render();
            })();
          <\/script>
        </div>
      `}]},Kd="ios-desktop:permissions",Jo={camera:{label:"相机",icon:"camera_access",desc:"拍摄照片与录制视频"},microphone:{label:"麦克风",icon:"mic_access",desc:"录制音频与环境声音"},location:{label:"位置信息",icon:"location_on",desc:"获取设备大致或精确位置"},notifications:{label:"通知",icon:"bell_off",desc:"发送提醒与横幅通知"},clipboard:{label:"剪贴板",icon:"edit",desc:"读取与写入复制内容"}};let Me=vg();const Ys=[];let ls=!1;function vg(){try{const e=JSON.parse(localStorage.getItem(Kd)||"{}");return e&&typeof e=="object"?e:{}}catch{return{}}}function Zo(){try{localStorage.setItem(Kd,JSON.stringify(Me))}catch{}}function Qd(e,t){const i=Me[e];return!i||typeof i[t]!="boolean"?"unset":i[t]?"granted":"denied"}function yg(){return JSON.parse(JSON.stringify(Me))}function Us(e,t,i){!e||!t||(Me[e]||(Me[e]={}),Me[e][t]=!!i,Zo())}function wg(){Me={},Zo()}function xg(e,t){Me[e]||(Me[e]={});const i=F.find(n=>n.id===e);Me[e].__name||(Me[e].__name=t||i&&i.name||e),Me[e].__icon=Z(e)}async function Ks(e,{appId:t,appName:i}={}){if(!Jo[e]||!t)return!0;const n=Qd(t,e);if(n!=="unset")return n==="granted";xg(t,i),Zo();const a=Me[t].__name||i||t,r=await bg({appId:t,appName:a,permission:e});return r==="granted"?(Us(t,e,!0),!0):r==="once"?!0:(Us(t,e,!1),!1)}function bg(e){return new Promise(t=>{Ys.push({opts:e,resolve:t}),Jd()})}async function Jd(){if(ls||!Ys.length)return;ls=!0;const{opts:e,resolve:t}=Ys.shift();let i="denied";try{i=await Sg(e)}catch{i="denied"}ls=!1,t(i),Jd()}function Sg({appId:e,appName:t,permission:i}){return new Promise(n=>{const a=Jo[i]||{label:i,icon:"lock",desc:""},r=document.createElement("div");r.className="power-dialog-overlay",r.id="md3PermissionOverlay",r.style.zIndex="9500",r.innerHTML=`
      <div class="power-dialog-card" role="alertdialog" aria-label="权限请求">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:44px;height:44px;border-radius:50%;background:hsl(var(--md-h,215) 80% 60% / 0.16);color:hsl(var(--md-h,215) 80% 64%);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${g[a.icon]||g.lock}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:16px;font-weight:600;color:var(--md-on-surface,#e2e2e9);line-height:1.4;">允许「${kg(t)}」使用${a.label}？</div>
            <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;line-height:1.5;">${a.desc} · 可随时在 设置 › 应用权限管理 中修改</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;">
          <button data-act="denied" style="background:none;border:none;color:var(--md-on-surface-variant,#9a9b9e);font-size:13.5px;font-weight:600;padding:10px 14px;border-radius:20px;cursor:pointer;">拒绝</button>
          <button data-act="once" style="background:none;border:none;color:hsl(var(--md-h,215) 80% 64%);font-size:13.5px;font-weight:600;padding:10px 14px;border-radius:20px;cursor:pointer;">仅本次</button>
          <button data-act="granted" style="background:hsl(var(--md-h,215) 80% 55%);border:none;color:#fff;font-size:13.5px;font-weight:600;padding:10px 20px;border-radius:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.25);">允许</button>
        </div>
      </div>
    `;const o=l=>{r.style.visibility!=="hidden"&&(r.classList.remove("active"),setTimeout(()=>{r.parentNode&&r.parentNode.removeChild(r)},220),n(l))};r.querySelectorAll("button[data-act]").forEach(l=>{l.addEventListener("click",()=>o(l.getAttribute("data-act")))}),document.body.appendChild(r),requestAnimationFrame(()=>r.classList.add("active")),navigator.vibrate&&navigator.vibrate(12)})}function kg(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Eg(){window.addEventListener("message",e=>{const t=e.data;if(!t||t.type!=="REQUEST_PERMISSION"||!t.requestId)return;const i=e.source;try{i&&i.postMessage({type:"PERMISSION_ACK",requestId:t.requestId},"*")}catch{}let n=t.appId||"";n||document.querySelectorAll(".app-instance-wrapper, [data-bus-app-id]").forEach(a=>{n||a.querySelectorAll("iframe").forEach(r=>{try{r.contentWindow===i&&(n=a.getAttribute("data-bus-app-id")||(a.id||"").replace("app-instance-",""))}catch{}})}),Ks(t.permission,{appId:n,appName:t.appName}).then(a=>{try{i&&i.postMessage({type:"PERMISSION_RESULT",requestId:t.requestId,granted:a},"*")}catch{}})}),window.__permissions={requestPermission:Ks,getPermissionState:Qd,getAllPermissions:yg,setPermission:Us,clearAllPermissions:wg,PERMISSION_META:Jo}}let Qe=0,kt=!1,ze=!1,$e=!1,Vn=!1,cn=0,pi=0,ui=0,bt=0,Nl=0,cs=0,va=0,ya=0,ds=!1,wa=null,xa=null,hi=null;function Jn(){return(!wa||!wa.isConnected)&&(wa=document.getElementById("pullPanelsOverlay"),hi=null),wa}function ji(){return(!xa||!xa.isConnected)&&(xa=document.getElementById("pullPanelsSlider"),hi=null),xa}function zr(){const e=ji();return e?((!hi||hi.some(t=>!t.isConnected))&&(hi=Array.from(e.querySelectorAll(".pull-panel"))),hi):[]}let xi=0,kn=null;function Zd(e){const t=Jn();if(!t)return;t.style.opacity=e.overlayOpacity.toFixed(3);const i=zr(),n=e.unit==="%"?`translate3d(0, ${e.offset.toFixed(1)}%, 0)`:`translate3d(0, ${e.offset.toFixed(1)}px, 0)`;i.forEach(a=>{a.style.transform=n,a.style.transition="none"})}function ql(e){kn=e,!xi&&(xi=requestAnimationFrame(()=>{xi=0;const t=kn;kn=null,t&&Zd(t)}))}function Vl(){xi&&(cancelAnimationFrame(xi),xi=0);const e=kn;kn=null,e&&Zd(e)}let bi=0,Qs=0;function _g(){bi&&(cancelAnimationFrame(bi),bi=0);const e=ji();e&&(e.style.transform=`translate3d(${Qs.toFixed(2)}%, 0, 0)`)}function de(){const e=Jn();return!!(kt||$e||ze||Vn||e&&e.classList.contains("active"))}function Mg(){const e=Jn(),t=ji();if(!e||!t)return;e.addEventListener("click",n=>{if($e||ze||kt||Vn||ds)return;n.target.closest(".noti-card, .qs-tile, .qs-slider-bar, .panel-tab-pill-bar, .noti-media-card, .noti-footer-btn, .qs-action-btn, button, input, .edit-tiles-view")||Ie()}),document.querySelectorAll(".tab-btn-noti").forEach(n=>{n.addEventListener("click",a=>{a.stopPropagation(),ba(0)})}),document.querySelectorAll(".tab-btn-qs").forEach(n=>{n.addEventListener("click",a=>{a.stopPropagation(),ba(1)})}),document.querySelectorAll(".status-bar, .app-window-status-bar").forEach(n=>{n.addEventListener("click",a=>{if(de())Ie();else{const o=a.clientX<window.innerWidth/2?0:1;Wl(o)}})}),window.addEventListener("pointerdown",n=>{if(document.body.classList.contains("is-locked")||s.iconDragState)return;const a=document.getElementById("editTilesView");if(a&&a.classList.contains("open"))return;const r=window.innerWidth,o=e.classList.contains("active");if(cn=n.clientX,pi=n.clientY,ui=n.clientX,bt=n.clientY,Nl=performance.now(),cs=Nl,va=0,ya=0,ds=!1,!o&&n.clientY<=55){kt=!0,Qe=cn<r/2?0:1,nr(Qe,0),t.classList.add("dragging"),e.classList.add("active"),e.style.opacity="0",el(Qe);return}if(o){if(n.target.closest(".qs-slider-bar")||n.target.closest("input")||n.target.closest(".media-progress-track"))return;ze=!1,$e=!1}},{passive:!0}),window.addEventListener("pointermove",n=>{if(!kt&&!ze&&!$e&&!e.classList.contains("active"))return;const a=performance.now(),r=Math.max(1,a-cs);va=(n.clientX-ui)/r,ya=(n.clientY-bt)/r,cs=a,ui=n.clientX,bt=n.clientY;const o=window.innerWidth,l=window.innerHeight,c=e.classList.contains("active");if(Math.hypot(ui-cn,bt-pi)>6&&(ds=!0),kt){const u=Math.max(0,bt-pi),f=Math.min(1,u/(l*.38)),m=-100+f*100;ql({overlayOpacity:f,unit:"%",offset:m});return}if(c&&!n.target.closest(".qs-slider-bar")&&!n.target.closest("input")&&!n.target.closest(".media-progress-track")){const u=ui-cn,f=bt-pi;if(!ze&&!$e&&(Math.abs(u)>5&&Math.abs(u)>Math.abs(f)*.6?(ze=!0,t.style.transition="none"):f<-5&&Math.abs(f)>Math.abs(u)*.4&&($e=!0)),ze){const m=-Qe*50,h=u/o*50;let v=m+h;v>0&&(v=v*.25),v<-50&&(v=-50+(v+50)*.25),bi||(bi=requestAnimationFrame(()=>{bi=0,t.style.transform=`translate3d(${Qs.toFixed(2)}%, 0, 0)`})),Qs=v}if($e&&f<0){const m=Math.max(0,1+f/(l*.4));ql({overlayOpacity:m,unit:"px",offset:f*1.08})}}},{passive:!0});const i=n=>{if(kt){kt=!1,t.classList.remove("dragging"),Vl(),bt-pi>50||ya>.35?Wl(Qe):Ie();return}if(ze){ze=!1,_g();const a=ui-cn;t.style.transition="transform 260ms cubic-bezier(0.2, 0.95, 0.25, 1)",Qe===0&&(a<-28||va<-.15)?ba(1):Qe===1&&(a>28||va>.15)?ba(0):nr(Qe,240);return}if($e){$e=!1,Vl();const a=bt-pi,r=-ya;if(a<-60||r>.35||a<-30&&r>.18)Ie();else{const l=zr();l.forEach(c=>{c.style.transition="transform 280ms cubic-bezier(0.18, 0.9, 0.2, 1.02)",c.style.transform="translate3d(0, 0, 0)"}),e.style.transition="opacity 240ms ease",e.style.opacity="1",setTimeout(()=>{l.forEach(c=>{c.style.transition="",c.style.transform=""}),e.style.transition="",e.style.opacity=""},290)}}};window.addEventListener("pointerup",i,{passive:!0}),window.addEventListener("pointercancel",i,{passive:!0}),window.addEventListener("touchcancel",i,{passive:!0})}function Wl(e=0){const t=Jn(),i=ji();if(!t||!i)return;Vn=!1,$e=!1,ze=!1,Qe=e,t.classList.add("active"),t.style.opacity="1",t.style.transition="opacity 280ms ease";const n=zr();n.forEach(a=>{a.style.transform="translate3d(0, 0, 0)",a.style.transition="transform 300ms cubic-bezier(0.18, 0.9, 0.2, 1.02)"}),nr(e,300),el(e),setTimeout(()=>{n.forEach(a=>{a.style.transition=""}),t.style.transition=""},310),navigator.vibrate&&navigator.vibrate(25)}function ba(e){Qe=e,nr(e,280),el(e),navigator.vibrate&&navigator.vibrate(15)}function el(e){document.querySelectorAll(".tab-btn-noti").forEach(t=>t.classList.toggle("active",e===0)),document.querySelectorAll(".tab-btn-qs").forEach(t=>t.classList.toggle("active",e===1))}function Ie(){const e=Jn(),t=ji();if(!e||!t)return;Vn=!0;const i=zr();i.forEach(n=>{n.style.transition="transform 260ms cubic-bezier(0.4, 0, 0.2, 1)",n.style.transform="translate3d(0, -100%, 0)"}),e.style.transition="opacity 250ms ease",e.style.opacity="0",setTimeout(()=>{e.classList.remove("active"),e.style.opacity="",e.style.transition="",i.forEach(n=>{n.style.transform="",n.style.transition=""}),Vn=!1,kt=!1,$e=!1,ze=!1},260)}function nr(e,t=0){const i=ji();i&&(i.style.transition=t>0?`transform ${t}ms cubic-bezier(0.2, 0.95, 0.25, 1)`:"none",i.style.transform=`translate3d(${-e*50}%, 0, 0)`)}const Ig=24,Ut=new Map,fn=new Map;function Gl(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ps(e){const t=F.find(i=>i.id===e);return t?t.name:e||"未知应用"}function Js(e){if(!e)return"";let t="";return document.querySelectorAll(".app-instance-wrapper, [data-bus-app-id]").forEach(i=>{t||i.querySelectorAll("iframe").forEach(n=>{try{n.contentWindow===e&&(t=i.getAttribute("data-bus-app-id")||(i.id||"").replace("app-instance-",""))}catch{}})}),t}function tl(e,t){let i=!1,n=!1;const a=r=>{!r||!r.querySelectorAll||r.querySelectorAll("iframe").forEach(o=>{try{if(!o.contentWindow||o.dataset.loaded!=="1")return;o.contentWindow.postMessage(t,"*"),i=!0,r.offsetParent!==null&&(n=!0)}catch{}})};return a(document.getElementById(`app-instance-${e}`)),document.querySelectorAll(`[data-bus-app-id="${e}"]`).forEach(r=>{r.id!==`app-instance-${e}`&&a(r)}),{delivered:i,visible:n}}function ep(e,t,i,n){if(i&&i.__silent)return;const a=i&&i.noti||null,r=a&&a.title||`${ps(n)||"某应用"} 分享到 ${ps(e)}`;let o=a&&a.desc||"";o||(t==="share/memo"?o=String(i&&(i.title||i.text)||"").slice(0,60)||"收到一条便签分享":t==="photo/captured"?o="相机拍摄的照片已同步到相册":t==="files/share"?o="收到一个来自「文件」的分享内容":o="收到一条跨应用消息"),rr({id:"bus-"+Date.now()+"-"+Math.floor(Math.random()*1e4),app:ps(e),appId:e,iconSvg:Tr(e)?Z(e):g.notification_system,title:Gl(r),desc:Gl(o),time:"刚刚",category:"应用联动 / App Link"})}function Tg(e,t){Ut.has(e)||Ut.set(e,[]);const i=Ut.get(e);i.push(t),i.length>Ig&&i.shift()}function Ce(e,t,i,n){if(!e||!t)return;t==="photo/captured"&&n==="camera"&&Cg(i);const{delivered:a,visible:r}=tl(e,{type:"BUS_DELIVER",event:t,payload:i,from:n});a&&!r?ep(e,t,i,n):a||Tg(e,{event:t,payload:i,from:n,at:Date.now()})}function Cg(e){try{const t=window.__vfs;if(!t||typeof t.write!="function"||typeof t.exists!="function"||!e||typeof e.src!="string"||!e.src.startsWith("data:image"))return;let i=String(e.name||"").trim()||`IMG_${Date.now()}.jpg`;/\.[a-z0-9]+$/i.test(i)||(i+=".jpg");let n="/photos/"+i,a=2;for(;t.exists(n);){const r=i.lastIndexOf(".");if(n=`/photos/${i.slice(0,r)} (${a})${i.slice(r)}`,a++,a>99)break}t.write(n,e.src,{owner:"camera"})}catch{}}function ar(e,t,i,n){const a=new Set;document.querySelectorAll(".app-instance-wrapper, [data-bus-app-id]").forEach(r=>{const o=r.getAttribute("data-bus-app-id")||(r.id||"").replace("app-instance-","");if(!o||o===n||a.has(o))return;a.add(o);const{delivered:l,visible:c}=tl(o,{type:"BUS_DELIVER",event:e,payload:t,from:i});l&&!c&&ep(o,e,t,i)})}function $a(e,t){return fn.has(e)||fn.set(e,new Set),fn.get(e).add(t),()=>{const i=fn.get(e);i&&i.delete(t)}}function Lg(e,t,i){const n=fn.get(e);n&&n.forEach(a=>{try{a(t,i)}catch{}})}function tp(e){if(!e||!e.closest)return;const t=e.closest(".app-instance-wrapper, [data-bus-app-id]");if(!t)return;const i=t.getAttribute("data-bus-app-id")||(t.id||"").replace("app-instance-","");if(!i||!Ut.has(i))return;let n=40;const a=()=>{const r=Ut.get(i);!r||!r.length||(e.dataset.loaded==="1"?(Ut.set(i,[]),setTimeout(()=>{r.forEach(o=>{tl(i,{type:"BUS_DELIVER",event:o.event,payload:o.payload,from:o.from})})},60)):n-- >0&&setTimeout(a,100))};a()}function Ag(){window.addEventListener("message",e=>{const t=e.data;if(!t||t.type!=="BUS_EMIT"||!t.event)return;const i=Js(e.source);t.target?Ce(t.target,t.event,t.payload,i):ar(t.event,t.payload,i,i),Lg(t.event,t.payload,{from:i,target:t.target||null})}),window.__appBus={emit:(e,t,i)=>Ce(i,e,t,""),broadcast:(e,t)=>ar(e,t,""),on:$a,flush:tp,pending:()=>Object.fromEntries(Ut)}}const ip="calnotes_v2",np="note_",$r="n2",ap="ios-desktop:noti-cal-dismissed",Xl=e=>String(e).padStart(2,"0");function Bg(e){return`${e.getFullYear()}-${Xl(e.getMonth()+1)}-${Xl(e.getDate())}`}function Fg(e){const t=e||(typeof localStorage<"u"?localStorage:null);if(!t)return{};const i={};try{const n=JSON.parse(t.getItem(ip)||"null");n&&typeof n=="object"&&Object.keys(n).forEach(a=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(a)||!Array.isArray(n[a]))return;const r=n[a].filter(o=>o&&typeof o.content=="string"&&o.content.trim());r.length&&(i[a]=r.map(o=>({id:o.id,content:o.content,updated:o.updated||o.created||0})))})}catch{}try{for(let n=0;n<t.length;n++){const a=t.key(n);if(!a||a.indexOf(np)!==0)continue;const r=/^note_(\d{4}-\d{2}-\d{2})$/.exec(a);if(!r)continue;const o=(t.getItem(a)||"").trim();!o||i[r[1]]||(i[r[1]]=[{id:"legacy-"+r[1],content:o,updated:0}])}}catch{}return i}function Pg(e){const t=String(e||""),i=t.match(/^#+\s*(.+)/m);return(i?i[1]:t.split(`
`).find(a=>a.trim())||"").trim().slice(0,40)||"无标题"}function zg(e,t){const i=t instanceof Date?t:new Date,n=Object.keys(e||{}).filter(m=>(e[m]||[]).length);if(!n.length)return null;const a=Bg(i);let r=null;if(n.indexOf(a)!==-1)r=a;else{let m=-1;n.forEach(h=>{const v=Math.max.apply(null,e[h].map(y=>y.updated||0));v>m&&(m=v,r=h)})}const o=e[r],l=o.slice().sort((m,h)=>(h.updated||0)-(m.updated||0))[0],c=/^(\d{4})-(\d{2})-(\d{2})$/.exec(r),d=c?new Date(+c[1],+c[2]-1,+c[3]):i,u=r===a?"今天":`${d.getMonth()+1}月${d.getDate()}日`,f=l&&l.updated||0;return{key:r,count:o.length,dateLabel:u,title:`${u} · ${o.length} 篇笔记`,desc:`最新：${Pg(l?l.content:"")}`,latestUpdated:f,digest:$g(r,o.length,f)}}function $g(e,t,i){return`${e}:${t}:${i}`}function Dg(e,t){const i=Number(e)||0;if(!i)return"刚刚";const n=t instanceof Date?t.getTime():Date.now(),a=Math.max(0,n-i);if(a<60*1e3)return"刚刚";if(a<3600*1e3)return`${Math.floor(a/6e4)}分钟前`;if(a<1440*60*1e3)return`${Math.floor(a/36e5)}小时前`;const r=new Date(i);return`${r.getMonth()+1}/${r.getDate()}`}const rp="ios-desktop:notifications",Zs=30;function ft(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function sp(e){return typeof e=="string"&&e.indexOf("<svg")===0&&!/<script/i.test(e)&&!/\son[a-z]+\s*=/i.test(e)}function Og(){try{const e=localStorage.getItem(rp);if(e===null)return null;const t=JSON.parse(e);if(Array.isArray(t))return t.filter(i=>i&&typeof i.title=="string")}catch{}return null}function Yi(){try{localStorage.setItem(rp,JSON.stringify(X.slice(0,Zs)))}catch{}}const op=[{id:"n1",app:"信息 / Messages",appId:"msg",iconSvg:g.notification_chat,title:"Google Pixel 团队",desc:"全新 Material 3 Expressive 设计规范已全量上线，体验更专业的独立双分栏与矢量动效！",time:"2分钟前",category:"Conversations / 会话通知"},{id:"n2",app:"Google 日历",appId:"cal_app",iconSvg:g.notification_calendar,title:"下午 3:00 - 项目架构评审与矢量 UI 验收",desc:"地点: 线上会议室 A | 参会人员: 核心设计团队与系统架构组",time:"25分钟前",category:"Conversations / 会话通知"},{id:"n3",app:"系统更新",appId:"settings",iconSvg:g.notification_system,title:"Android 16 (BP31) 系统体验已更新",desc:"已优化控制中心音量/亮度独立滑块，升级高保真 Material You 色彩流",time:"1小时前",category:"Silent / 静音与系统通知"}],lp=Og();let X=lp??[...op];lp===null&&Yi();let us=null;function Zn(){us||(us=setTimeout(()=>{us=null;try{window.dispatchEvent(new CustomEvent("notifications-changed"))}catch{}},0))}function cp(){return[...X]}function Dr(e){return e&&e.appId&&Tr(e.appId)?Z(e.appId):e&&sp(e.iconSvg)?e.iconSvg:g.notification_system}function il(e){return!!(e&&e.appId&&Tr(e.appId))}function Rg(){jl(),Hi(),Hg(),qg(),window.__notiCalSyncBound||(window.__notiCalSyncBound=!0,window.addEventListener("storage",i=>{i&&i.key&&(i.key===ip||i.key.indexOf(np)===0)&&jl()}));const e=document.getElementById("notiClearAllBtn");e&&(e.innerHTML=`${g.clear_all}<span>清除全部</span>`,e.addEventListener("click",()=>{dp(),X=[],Hi(),Yi(),Zn(),navigator.vibrate&&navigator.vibrate(20)}));const t=document.getElementById("notiHistoryBtn");t&&(t.innerHTML=`${g.history}<span>历史记录</span>`)}function Hi(){const e=document.getElementById("notificationsContainer");if(!e)return;if(X.length===0){e.innerHTML=`
      <div style="text-align:center;padding:50px 20px;opacity:0.6;font-size:14px;display:flex;flex-direction:column;align-items:center;gap:10px;">
        <div style="color:var(--md-primary,#a8c7fa);">${g.sound_notifications}</div>
        <span>暂无待处理的新通知</span>
      </div>
    `;return}e.innerHTML="";const t={};X.forEach(i=>{t[i.category]||(t[i.category]=[]),t[i.category].push(i)}),Object.keys(t).forEach(i=>{const n=document.createElement("div");n.className="noti-section-header",n.innerHTML=`
      <span>${ft(i)}</span>
      <span style="font-size:11px;opacity:0.7;">${t[i].length} 条</span>
    `,e.appendChild(n);const a=document.createElement("div");a.className="noti-card-group",t[i].forEach(r=>{const o=document.createElement("div");o.className="noti-card",o.dataset.id=r.id,o.style.cursor="pointer";const l=il(r);o.innerHTML=`
        <div class="noti-card-icon ${l?"noti-card-icon--app":""}">${Dr(r)}</div>
        <div class="noti-card-content">
          <div class="noti-card-top">
            <span class="noti-card-appname">${ft(r.app)}</span>
            <span class="noti-card-time">${ft(r.time)}</span>
          </div>
          <div class="noti-card-title">${ft(r.title)}</div>
          <div class="noti-card-desc">${ft(r.desc)}</div>
        </div>
      `,o.addEventListener("click",d=>{if(o._isSwiping)return;const u=o.querySelector(".noti-card-icon")?.getBoundingClientRect()||null;if(Ie(),pp(r.deepLink,u))return;const f=r.appId||(r.app.includes("信息")?"msg":r.app.includes("日历")?"calendar":"settings"),m=F.findIndex(h=>h.id===f);m!==-1&&H(m,null,u)});let c=0;o.addEventListener("pointerdown",d=>{d.stopPropagation(),c=d.clientX,o._isSwiping=!1;let u=!1;try{o.setPointerCapture(d.pointerId),u=!0}catch{}const f=h=>{h.stopPropagation();const v=h.clientX-c;Math.abs(v)>6&&(o._isSwiping=!0),o.style.transform=`translate3d(${v}px, 0, 0)`,o.style.opacity=Math.max(0,1-Math.abs(v)/200).toString()},m=h=>{if(h.stopPropagation(),u){try{o.releasePointerCapture(h.pointerId)}catch{}o.removeEventListener("pointermove",f),o.removeEventListener("pointerup",m),o.removeEventListener("pointercancel",m)}else window.removeEventListener("pointermove",f),window.removeEventListener("pointerup",m),window.removeEventListener("pointercancel",m);const v=h.clientX-c;Math.abs(v)>85?(o.style.transition="transform 0.22s ease, opacity 0.22s ease",o.style.transform=`translate3d(${v>0?320:-320}px, 0, 0)`,o.style.opacity="0",r.id===$r&&dp(),setTimeout(()=>{X=X.filter(y=>y.id!==r.id),Hi(),Yi(),Zn()},220)):(o.style.transition="transform 0.2s ease, opacity 0.2s ease",o.style.transform="",o.style.opacity="")};u?(o.addEventListener("pointermove",f),o.addEventListener("pointerup",m),o.addEventListener("pointercancel",m)):(window.addEventListener("pointermove",f),window.addEventListener("pointerup",m),window.addEventListener("pointercancel",m))}),a.appendChild(o)}),e.appendChild(a)})}function Hg(){const e=document.getElementById("pixelMediaCard"),t=document.getElementById("mediaCoverIcon"),i=document.getElementById("mediaPrevBtn"),n=document.getElementById("mediaNextBtn"),a=document.getElementById("mediaPlayPauseBtn"),r=document.getElementById("mediaTrackTitle"),o=document.getElementById("mediaArtistName"),l=document.getElementById("mediaProgressBar"),c=document.querySelector(".media-progress-track");t&&(t.innerHTML=g.song_search),i&&(i.innerHTML=g.skip_prev,i.addEventListener("click",d=>{d.stopPropagation(),Le.prev(),navigator.vibrate&&navigator.vibrate(15)})),n&&(n.innerHTML=g.skip_next,n.addEventListener("click",d=>{d.stopPropagation(),Le.next(),navigator.vibrate&&navigator.vibrate(15)})),a&&a.addEventListener("click",d=>{d.stopPropagation(),Le.togglePlay(),navigator.vibrate&&navigator.vibrate(15)}),e&&e.addEventListener("click",d=>{if(d.target.closest("button")||d.target.closest(".media-progress-track"))return;const u=document.getElementById("mediaCoverIcon")?.getBoundingClientRect()||null;Ie();const f=F.findIndex(m=>m.id==="music");f!==-1&&H(f,null,u)}),c&&c.addEventListener("click",d=>{d.stopPropagation();const u=c.getBoundingClientRect(),f=(d.clientX-u.left)/u.width*100;Le.seek(f)}),Le.subscribe(d=>{e&&(d.isPlaying?(e.classList.remove("media-hidden"),e.classList.add("media-playing")):e.classList.remove("media-playing"),d.track&&d.track.coverGradient&&(e.style.background=d.track.coverGradient)),r&&(r.textContent=d.track.title),o&&(o.textContent=`${d.track.artist} • ${d.track.album||"电台"}`),l&&(l.style.width=`${d.progress.toFixed(1)}%`),a&&(a.innerHTML=d.isPlaying?g.pause:g.play)})}function Ng(e){if(!e)return!1;if(e===window)return!0;const t=document.querySelectorAll("iframe");for(let i=0;i<t.length;i++)try{if(t[i].contentWindow===e)return!0}catch{}return!1}function qg(){window.addEventListener("message",e=>{if(Ng(e.source)&&!(!e.data||!e.data.type)){if(e.data.type==="NEW_MESSAGE_NOTIFICATION"){const t=e.data.payload;rr({id:t.id||"msg-"+Date.now(),app:t.appName||"信息 / Messages",appId:"msg",iconSvg:g.notification_chat,title:t.title,desc:t.desc,time:t.time||"刚刚",category:"Conversations / 会话通知"})}if(e.data.type==="NOTIFY"&&e.data.payload){const t=e.data.payload,i=sp(t.iconSvg)?t.iconSvg:g.notification_system;rr({id:t.id||"notify-"+Date.now(),app:t.appName||"系统服务",appId:t.appId||"",iconSvg:i,title:String(t.title||"通知"),desc:String(t.desc||t.body||""),time:"刚刚",category:t.category||"应用通知 / App Notifications"})}if(e.data.type==="DELETE_MESSAGE_NOTIFICATION"){const t=e.data.payload;t&&(X=X.filter(i=>!(t.notiId&&(i.id===t.notiId||i.id==="msg-"+t.notiId)||t.text&&i.desc&&i.desc.trim()===t.text.trim()||t.chatName&&i.title&&i.title.includes(t.chatName))),Hi(),Yi(),Zn())}if(e.data.type==="SWITCH_PERSONA_NOTIFICATION"){const t=e.data.payload;Gg(`切换身份：${t.name}`)}}})}function Vg(e){return{id:$r,app:"日历",appId:"cal_app",iconSvg:g.notification_calendar,title:e.title,desc:e.desc,time:Dg(e.latestUpdated),category:"应用通知 / App Notifications",deepLink:{appId:"cal_app",event:"calendar/prefill",payload:{date:e.key,view:"day"}},__digest:e.digest}}function jl(){let e=null;try{e=zg(Fg(window.localStorage))}catch{return}const t=e?e.digest:"demo",i=X.findIndex(a=>a.id===$r);let n=!1;if(e){const a=Vg(e);if(i===-1){let r=null;try{r=localStorage.getItem(ap)}catch{}if(r===t)return;X.unshift(a),n=!0}else(X[i].title!==a.title||X[i].desc!==a.desc)&&(X[i]=a,n=!0)}else i!==-1&&X[i].deepLink&&(X[i]={...op[1]},n=!0);n&&(Hi(),Yi(),Zn())}function dp(){const e=X.findIndex(t=>t.id===$r);if(e!==-1)try{localStorage.setItem(ap,X[e].__digest||"demo")}catch{}}function pp(e,t){if(!e||!e.appId||!e.event)return!1;const i=F.findIndex(n=>n.id===e.appId);return i===-1?!1:(Ce(e.appId,e.event,Object.assign({},e.payload||{},{__silent:!0}),"notifications"),H(i,null,t),!0)}function rr(e){if(e&&e.id){const t=X.findIndex(i=>i.id===e.id);t!==-1?X[t]=e:X.unshift(e)}else X.unshift(e);X.length>Zs&&(X.length=Zs),Hi(),Yi(),Zn(),!document.body.classList.contains("dnd-mode-active")&&Wg(e)}function Wg(e){let t=document.getElementById("headsUpBanner");t||(t=document.createElement("div"),t.id="headsUpBanner",t.style.cssText=`
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%) translateY(-100px);
      width: calc(100% - 32px); max-width: 420px; background: rgba(23, 29, 27, 0.94);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      color: #FFFFFF; border-radius: 28px; padding: 14px 18px; z-index: 10005;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 14px;
      cursor: pointer; transition: all 0.3s cubic-bezier(0.2, 0.95, 0.25, 1);
    `,t.addEventListener("click",()=>{t.style.transform="translateX(-50%) translateY(-100px)";const n=t._item;if(!n)return;const a=t.querySelector("div"),r=a?a.getBoundingClientRect():null;if(pp(n.deepLink,r))return;let o=-1;n.appId?o=F.findIndex(l=>l.id===n.appId):o=F.findIndex(l=>l.id==="msg"),o!==-1&&H(o,null,r)}),document.body.appendChild(t));const i=il(e)?"width:38px;height:38px;border-radius:12px;overflow:hidden;flex-shrink:0;":"width:38px;height:38px;border-radius:50%;background:var(--md-primary,#7df8db);color:#000;display:flex;align-items:center;justify-content:center;flex-shrink:0;";t.innerHTML=`
    <div style="${i}">
      ${Dr(e)}
    </div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
        <span style="font-size:12px;font-weight:600;color:var(--md-primary,#7df8db);">${ft(e.app)}</span>
        <span style="font-size:11px;opacity:0.6;">${ft(e.time)}</span>
      </div>
      <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ft(e.title)}</div>
      <div style="font-size:12px;opacity:0.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ft(e.desc)}</div>
    </div>
  `,t._item=e,t.style.transform="translateX(-50%) translateY(0)",We("notify"),navigator.vibrate&&navigator.vibrate([20,50,20]),clearTimeout(t._hideTimer),t._hideTimer=setTimeout(()=>{t.style.transform="translateX(-50%) translateY(-100px)"},4200)}function Gg(e){let t=document.getElementById("headsUpPill");t||(t=document.createElement("div"),t.id="headsUpPill",t.style.cssText=`
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%) translateY(-60px);
      background: rgba(0, 107, 90, 0.9); backdrop-filter: blur(16px);
      color: #FFFFFF; border-radius: 20px; padding: 6px 16px; z-index: 10006;
      font-size: 12px; font-weight: 500; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      transition: all 0.25s cubic-bezier(0.2, 0.9, 0.3, 1); pointer-events: none;
    `,document.body.appendChild(t)),t.textContent=e,t.style.transform="translateX(-50%) translateY(0)",clearTimeout(t._timer),t._timer=setTimeout(()=>{t.style.transform="translateX(-50%) translateY(-60px)"},2e3)}let Wn=85,Si=!1,eo=typeof navigator.onLine=="boolean"?navigator.onLine:!0,to=!1;function Yl(e){return String(e??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function up(){let e=[];try{e=cp()||[]}catch{e=[]}let i=e.slice(0,4).map(n=>{const a=Dr(n);return`<span class="status-icon noti-st-icon" data-noti-id="${Yl(n&&n.id)}" title="${Yl(n&&n.app)}">${a}</span>`}).join("");if(e.length>4){const n=e.length-4;i+=`<span class="noti-st-more" title="还有 ${n} 条通知">+${n>9?"9+":n}</span>`}return i+=`<span class="status-icon noti-music-icon" style="display:${to?"inline-flex":"none"};color:var(--md-primary,#7df8db);">${g.music_note}</span>`,i}function Ul(e=!0){return`
    <div class="status-left">
      <span class="status-time">12:00</span>
      ${e?`
    <span class="status-noti-icons">${up()}</span>`:""}
    </div>
    <div class="status-right">
      <span class="status-icon wifi-icon">${eo?g.wifi:g.wifi_off}</span>
      <span class="status-icon cellular-icon">${g.cellular}</span>
      <span class="status-icon" style="font-size:11px;font-weight:700;letter-spacing:-0.2px;">5G</span>
      <div class="battery-pill ${Si?"is-charging":""}">
        <span class="battery-charging-indicator" style="display:${Si?"inline-flex":"none"};margin-right:2px;color:var(--md-primary,#7df8db);">${g.battery_charging}</span>
        <span class="battery-pct">${Wn}%</span>
        <div class="battery-icon-shape">
          <div class="battery-icon-level" style="width:${Wn}%"></div>
        </div>
      </div>
    </div>
  `}function fp(){const e=`${Wn}%`,t=`${Wn}%`;document.querySelectorAll(".battery-pct").forEach(n=>{n.textContent!==e&&(n.textContent=e)}),document.querySelectorAll(".battery-icon-level").forEach(n=>{n.style.width!==t&&(n.style.width=t)}),document.querySelectorAll(".battery-pill").forEach(n=>{n.classList.contains("is-charging")!==Si&&n.classList.toggle("is-charging",Si)});const i=Si?"inline-flex":"none";document.querySelectorAll(".battery-charging-indicator").forEach(n=>{n.style.display!==i&&(n.style.display=i)})}function mp(){const e=up();document.querySelectorAll(".status-noti-icons").forEach(t=>{t.dataset.notiHtml!==e&&(t.dataset.notiHtml=e,t.innerHTML=e)})}typeof window<"u"&&window.addEventListener("notifications-changed",mp);function fs(e){ce(()=>Promise.resolve().then(()=>Cp),void 0,import.meta.url).then(t=>{try{t.syncTileState("internet",{active:e})}catch{}}).catch(()=>{})}function Xg(){if(typeof window<"u"){window.addEventListener("online",()=>{Da(!0),fs(!0)}),window.addEventListener("offline",()=>{Da(!1),fs(!1)});const e=navigator.connection||navigator.mozConnection||navigator.webkitConnection;e&&e.addEventListener("change",()=>{const t=navigator.onLine!==!1&&e.effectiveType!=="none";Da(t),fs(t)})}}function hp(){const e=new Date,t=e.getHours().toString().padStart(2,"0"),i=e.getMinutes().toString().padStart(2,"0"),n=`${t}:${i}`;document.querySelectorAll(".status-time, #clock").forEach(c=>{c.textContent!==n&&(c.textContent=n)});const a=["周日","周一","周二","周三","周四","周五","周六"],r=["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],l=`${a[e.getDay()]}, ${r[e.getMonth()]}${e.getDate()}日`;document.querySelectorAll(".panel-big-clock").forEach(c=>{c.textContent!==n&&(c.textContent=n)}),document.querySelectorAll(".panel-date").forEach(c=>{c.textContent!==l&&(c.textContent=l)}),fp()}function Da(e){eo=e,document.querySelectorAll(".wifi-icon").forEach(t=>{t.innerHTML=eo?g.wifi:g.wifi_off})}let Kl=0;function gp(){clearTimeout(Kl);const e=Date.now(),t=(Math.floor(e/6e4)+1)*6e4+1e3;Kl=setTimeout(()=>{hp(),gp()},Math.max(1e3,t-Date.now()))}function jg(){const e=document.querySelector(".status-bar");if(e&&(e.innerHTML=Ul(!0)),p.appWindow){let t=p.appWindow.querySelector(".app-window-status-bar");t||(t=document.createElement("div"),t.className="app-window-status-bar",p.appWindow.insertBefore(t,p.appWindow.firstChild)),t.innerHTML=Ul(!1)}Le.subscribe(t=>{to=t.isPlaying,document.querySelectorAll(".noti-music-icon").forEach(i=>{i.style.display=to?"inline-flex":"none"})}),Qo(t=>{Wn=t.level,Si=t.charging,fp()}),Xg(),mp(),hp(),gp()}const Yg=.25,Ug=.55,Kg=.1,Qg=ht(.52,.94,1);let T=null,tt=!1,at=null,fi=null,Re="idle",Or=!1;function Sa(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}const Jg='<svg viewBox="0 0 24 24" style="width:1.35em;height:1.35em;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round"><path d="M5 14.5 L12 8 L19 14.5"/></svg>',Zg='<svg viewBox="0 0 24 24" style="width:1.3em;height:1.3em;fill:currentColor"><path d="M6 2h12v3l-3 4v11c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2V9L6 5V2zm2 2v.6l3 4V20h2V8.6l3-4V4H8zm3 6h2v3h-2v-3z"/></svg>',ev='<svg viewBox="0 0 24 24" style="width:1.3em;height:1.3em;fill:currentColor"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M9 3 7.2 5H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.2L15 3H9zm3 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>';function tv(e){return`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`}function iv(e){const t=["日","一","二","三","四","五","六"];return`${e.getMonth()+1}月${e.getDate()}日 星期${t[e.getDay()]}`}function sr(){if(!T)return;const e=new Date,t=T.querySelector(".lock-clock"),i=T.querySelector(".lock-date");t&&(t.textContent=tv(e)),i&&(i.textContent=iv(e))}function nl(){if(!T)return;const e=T.querySelector(".lock-wallpaper");if(e)try{if(Un()){const n=_r();if(n){e.style.backgroundImage=`url("${n}")`;return}}const t=jn();if(t){e.style.backgroundImage=`url("${t}")`;return}const i=document.getElementById("desktop");if(i){const n=getComputedStyle(i).backgroundImage;if(n&&n!=="none"){e.style.backgroundImage=n;return}}e.style.backgroundImage=""}catch{e.style.backgroundImage=""}}function or(){if(!T)return;const e=T.querySelector(".lock-notifications");if(!e)return;const t=cp().slice(0,4);if(e.innerHTML="",t.length===0){e.innerHTML='<div class="lock-noti-empty">暂无新通知</div>';return}t.forEach(i=>{const n=document.createElement("div");n.className="lock-noti-card",n.innerHTML=`
      <div class="lock-noti-icon ${il(i)?"lock-noti-icon--app":""}">${Dr(i)}</div>
      <div class="lock-noti-body">
        <div class="lock-noti-top">
          <span class="lock-noti-app">${Sa(i.app)}</span>
          <span class="lock-noti-time">${Sa(i.time)}</span>
        </div>
        <div class="lock-noti-title">${Sa(i.title)}</div>
        <div class="lock-noti-desc">${Sa(i.desc)}</div>
      </div>
    `,n.addEventListener("click",()=>{if(Or)return;const a=i.appId||"msg",r=F.findIndex(d=>d.id===a);if(r===-1)return;const o=n.querySelector(".lock-noti-icon"),l=o?o.getBoundingClientRect():null,c=i.deepLink;if(c&&c.appId&&c.event)try{Ce(c.appId,c.event,Object.assign({},c.payload||{},{__silent:!0}),"lockscreen")}catch{}wp(r,l)}),e.appendChild(n)})}function al(){if(T)return;T=document.createElement("div"),T.id="lockScreen",T.className="lock-screen",T.innerHTML=`
    <div class="lock-wallpaper"></div>
    <div class="lock-dim"></div>
    <div class="lock-content">
      <div class="lock-top-area">
        <div class="lock-badge">${g.lock}</div>
        <div class="lock-date">1月1日 星期四</div>
        <div class="lock-clock">00:00</div>
      </div>
      <div class="lock-notifications"></div>
      <div class="lock-bottom-area">
        <button class="lock-quick-btn" id="lockTorchBtn" aria-label="手电筒">${Zg}</button>
        <div class="lock-unlock-hint">
          <span class="lock-hint-chevron">${Jg}</span>
          <span>向上轻扫以解锁</span>
        </div>
        <button class="lock-quick-btn" id="lockCameraBtn" aria-label="相机">${ev}</button>
      </div>
    </div>
  `,document.body.appendChild(T),sr(),nl(),or(),setInterval(sr,1e4);const e=T.querySelector("#lockTorchBtn");e&&e.addEventListener("click",i=>{i.stopPropagation();const n=document.querySelector('[data-tile-id="torch"]');n&&n.click(),n?e.classList.toggle("active",n.classList.contains("active")):e.classList.toggle("active")});const t=T.querySelector("#lockCameraBtn");t&&t.addEventListener("click",i=>{i.stopPropagation();const n=F.findIndex(r=>r.id==="camera");if(n===-1)return;const a=t.getBoundingClientRect();wp(n,a)}),nv(),window.addEventListener("notifications-changed",()=>{tt&&or()})}function nv(){let e=!1,t=0,i=0,n=0,a=0,r=0,o=0,l=null;const c=()=>((!l||!l.isConnected)&&(l=T.querySelector(".lock-content")),l);let d=0,u=0,f=0;const m=(b,k)=>{T.style.transform=`translate3d(0, ${(-b).toFixed(1)}px, 0)`;const M=c();if(M){const L=Math.max(0,Math.min(1,k));M.style.opacity=(1-L).toFixed(3),M.style.transform=`translate3d(0, ${(b*-.16).toFixed(1)}px, 0)`}},h=(b,k)=>{u=b,f=k,!d&&(d=requestAnimationFrame(()=>{d=0,m(u,f)}))},v=()=>{d&&(cancelAnimationFrame(d),d=0)},y=()=>window.innerHeight||820,x=b=>{if(!e||Re!=="drag")return;const k=t-b.clientY,M=performance.now(),L=Math.max(1,M-a);r=(k-n)/L,n=k,a=M,o=k>0?k:k*.15;const P=Math.max(0,o)/(y()*.9);h(o,P)},E=b=>{if(!e||Re!=="drag")return;e=!1,v(),window.removeEventListener("pointermove",x),window.removeEventListener("pointerup",E),window.removeEventListener("pointercancel",E);const k=o,L=performance.now()-i<260?r:0,P=y();if(Math.abs(k)<6&&Math.abs(L)<.2){Re="idle",T.style.transform="translate3d(0, 0, 0)";return}const A=k>P*Yg||L>Ug&&k>P*Kg;Or=A,av(A,k,A?Math.max(L,.6):L)};T.addEventListener("pointerdown",b=>{Re!=="spring"&&(e=!0,Re="drag",t=b.clientY,i=performance.now(),n=0,a=i,r=0,o=0,T.style.transition="none",window.addEventListener("pointermove",x),window.addEventListener("pointerup",E),window.addEventListener("pointercancel",E))})}function av(e,t,i){Re="spring";const n=window.innerHeight||820;fi=new Ge({...Qg,initialValue:t,initialVelocity:i*1e3}),fi.target=e?n*1.15:0,e&&uv();let a=performance.now();const r=()=>((!o||!o.isConnected)&&(o=T.querySelector(".lock-content")),o);let o=null;const l=c=>{const d=Math.min(.05,(c-a)/1e3);a=c,fi.update(d);const u=fi.x,f=r();if(e){const m=Math.max(0,1-Math.max(0,u)/(n*.9));if(T.style.transform=`translate3d(0, ${(-u).toFixed(1)}px, 0)`,T.style.opacity=m.toFixed(3),f&&(f.style.opacity="1"),fi.isSettled(.5,30)||m<=.01){rv();return}}else{if(T.style.transform=`translate3d(0, ${(-u).toFixed(1)}px, 0)`,f){const m=Math.max(0,1-Math.max(0,u)/(n*.9));f.style.opacity=m.toFixed(3),f.style.transform=`translate3d(0, ${(u*-.16).toFixed(1)}px, 0)`}if(fi.isSettled(.5,30)){T.style.transform="translate3d(0, 0, 0)",f&&(f.style.opacity="",f.style.transform=""),Re="idle",Or=!1;return}}at=requestAnimationFrame(l)};at=requestAnimationFrame(l)}function rv(){at&&cancelAnimationFrame(at),at=null,Re="idle",Or=!1,tt=!1,T.style.display="none",T.style.transform="",T.style.opacity="",T.style.transition="";const e=T.querySelector(".lock-content");e&&(e.style.opacity="",e.style.transform=""),document.body.classList.remove("is-locked")}const vp="ios-desktop:unlock-anim-style";function yp(){try{return localStorage.getItem(vp)==="android"?"android":"ios"}catch{return"ios"}}function sv(e){if(!(e!=="ios"&&e!=="android")){try{localStorage.setItem(vp,e)}catch{}document.dispatchEvent(new CustomEvent("unlock-style-changed",{detail:{style:e}}))}}const ka=54,Ql=9,ov=620,ms=360,lv=520,Jl=20,Zl=140;let hs=0,ec=0;function cv(){try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{return!1}}function dv(e){const i=e.map(a=>{const r=a.getBoundingClientRect();return{el:a,top:r.top,left:r.left}});i.sort((a,r)=>a.top-r.top||a.left-r.left);const n=[];for(const a of i){const r=n[n.length-1];r&&Math.abs(a.top-r.top)<=12?r.items.push(a):n.push({top:a.top,items:[a]})}return n}function gs(){document.querySelectorAll(".unlock-icon-in, .unlock-icon-in-ios, .unlock-icon-in-android, .unlock-icon-fade").forEach(i=>{i.classList.remove("unlock-icon-in","unlock-icon-in-ios","unlock-icon-in-android","unlock-icon-fade"),i.style.animationDelay="",i.style.removeProperty("--radial-dx"),i.style.removeProperty("--radial-dy")});const e=document.getElementById("pixelAtAGlance");e&&(e.classList.remove("unlock-glance-in"),e.style.animationDelay="");const t=document.getElementById("pageDots");t&&(t.classList.remove("unlock-dots-in"),t.style.animationDelay="")}function pv(e){const t=document.getElementById("desktop");if(!t)return;t.querySelectorAll(".unlock-ripple-ring").forEach(a=>a.remove());const i=Math.max(240,Math.ceil(e*2+140)),n=document.createDocumentFragment();for(let a=0;a<2;a++){const r=document.createElement("div");r.className="unlock-ripple-ring"+(a===1?" unlock-ripple-ring--second":""),r.style.width=`${i}px`,r.style.height=`${i}px`,r.setAttribute("aria-hidden","true"),n.appendChild(r)}t.appendChild(n),clearTimeout(ec),ec=setTimeout(()=>{t.querySelectorAll(".unlock-ripple-ring").forEach(a=>a.remove())},1e3)}function uv(){clearTimeout(hs);const e=document.getElementById("desktopSlider");if(!e)return 0;const t=Array.from(e.children).find(l=>{const c=l.getBoundingClientRect();return c.width>0&&c.right>0&&c.left<window.innerWidth});if(!t)return 0;const i=Array.from(t.querySelectorAll(".app-icon, .app-folder"));if(i.length===0)return 0;const n=yp();if(gs(),cv())return i.forEach(l=>l.classList.add("unlock-icon-fade")),hs=setTimeout(gs,460),400;t.offsetWidth;const a=document.getElementById("pixelAtAGlance"),r=document.getElementById("pageDots");let o=0;if(n==="android"){const l=window.innerWidth/2,c=window.innerHeight/2,d=Math.hypot(l,c)||1;let u=0;i.forEach(f=>{const m=f.getBoundingClientRect(),h=m.left+m.width/2,v=m.top+m.height/2,y=Math.hypot(h-l,v-c),x=I(y/d,0,1),E=y>0?(h-l)/y:0,b=y>0?(v-c)/y:0;f.style.setProperty("--radial-dx",`${(-E*Jl).toFixed(1)}px`),f.style.setProperty("--radial-dy",`${(-b*Jl).toFixed(1)}px`);const k=Math.round(Math.pow(x,.9)*ms);k>u&&(u=k),f.style.animationDelay=`${k}ms`,f.classList.add("unlock-icon-in-android")}),pv(d),a&&(a.style.animationDelay=`${Math.round(ms*.3)}ms`,a.classList.add("unlock-glance-in")),r&&(r.style.animationDelay=`${Math.round(ms*.75)}ms`,r.classList.add("unlock-dots-in")),o=u+lv}else{const l=dv(i);l.forEach((c,d)=>{const u=(l.length-1-d)*ka;c.items.forEach((f,m)=>{f.el.style.animationDelay=`${u+m*Ql}ms`,f.el.classList.add("unlock-icon-in-ios")})}),a&&(a.style.animationDelay=`${Math.round(ka*1.2)}ms`,a.classList.add("unlock-glance-in")),r&&(r.style.animationDelay=`${Math.round(ka*.6)}ms`,r.classList.add("unlock-dots-in")),o=Math.max(0,l.length-1)*ka+2*Ql+ov}return hs=setTimeout(gs,o+Zl),o+Zl}let Ea=null;function fv(){T.style.transition="none",T.style.transform="translate3d(0, -100%, 0)",T.style.opacity="0",requestAnimationFrame(()=>{requestAnimationFrame(()=>{T.style.transition="transform 0.55s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease",T.style.transform="translate3d(0, 0, 0)",T.style.opacity="1",Ea&&clearTimeout(Ea),Ea=setTimeout(()=>{Ea=null,T.isConnected&&(T.style.transition="",T.style.opacity="")},600)})})}function Ni(){al(),!tt&&(tt=!0,document.body.classList.add("is-locked"),sr(),nl(),or(),T.style.display="flex",fv())}function wp(e,t){if(al(),tt){Re==="spring"&&at&&cancelAnimationFrame(at),tt=!1,Re="idle",T.style.display="none",T.style.transform="",T.style.opacity="",T.style.transition="";const n=T.querySelector(".lock-content");n&&(n.style.opacity="",n.style.transform=""),document.body.classList.remove("is-locked")}const i=t&&t.width>0&&Number.isFinite(t.left)?t:null;H(e,null,i)}typeof window<"u"&&(window.__lockTest={isLocked:()=>tt,lock:()=>Ni(),instantUnlock:()=>{if(!T){tt=!1,document.body.classList.remove("is-locked");return}at&&cancelAnimationFrame(at),at=null,Re="idle",tt=!1,T.style.display="none",T.style.transform="",T.style.opacity="",T.style.transition="",document.body.classList.remove("is-locked")},instantLock:()=>{al(),tt=!0,document.body.classList.add("is-locked"),sr(),nl(),or(),T.style.transition="none",T.style.display="flex",T.style.transform="translate3d(0, 0, 0)",T.style.opacity="1"}});function mv(){if(new URLSearchParams(window.location.search||"").has("nolock")){document.body.classList.remove("is-locked");return}Ni()}const hv=[{id:"internet",name:"Internet",sub:"中国移动 5G Wi-Fi",iconKey:"wifi",active:!0},{id:"bluetooth",name:"Bluetooth",sub:"Pixel Buds Pro",iconKey:"bluetooth",active:!0},{id:"darktheme",name:"Dark theme",sub:"深色模式",iconKey:"darktheme",active:!0},{id:"torch",name:"Torch",sub:"手电筒",iconKey:"torch",active:!1},{id:"modes",name:"Modes",sub:"勿扰模式",iconKey:"modes",active:!1},{id:"focus",name:"Focus",sub:"番茄钟 · 专注",iconKey:"focus_mode",active:!1},{id:"profile",name:"Profile",sub:"个人 / 工作模式",iconKey:"person",active:!1},{id:"autorotate",name:"Auto-rotate",sub:"自动旋转",iconKey:"autorotate",active:!0},{id:"battery_saver",name:"Battery Saver",sub:"省电模式",iconKey:"battery_saver",active:!1},{id:"lock_screen",name:"锁屏",sub:"立即锁定屏幕",iconKey:"lock",active:!1},{id:"qrcode",name:"QR code",sub:"扫一扫",iconKey:"qrcode",active:!1},{id:"screen_record",name:"Screen record",sub:"屏幕录制",iconKey:"screen_record",active:!1},{id:"wallet",name:"Wallet",sub:"谷歌钱包",iconKey:"wallet",active:!1},{id:"mic_access",name:"Mic access",sub:"麦克风权限",iconKey:"mic_access",active:!0},{id:"camera_access",name:"Camera access",sub:"相机权限",iconKey:"camera_access",active:!0},{id:"quick_share",name:"Quick Share",sub:"快传服务",iconKey:"quick_share",active:!0},{id:"cast",name:"Cast",sub:"无线投屏",iconKey:"cast",active:!1},{id:"alarm",name:"Alarm",sub:"未设置闹钟",iconKey:"alarm",active:!1},{id:"aeroplane",name:"Aeroplane",sub:"飞行模式",iconKey:"aeroplane",active:!1}],gv=[{category:"Accessibility / 无障碍辅助",tiles:[{id:"colour_correction",name:"Colour correction",sub:"色彩校正",iconKey:"colour_correction"},{id:"colour_inversion",name:"Colour inversion",sub:"色彩反转",iconKey:"colour_inversion"},{id:"hearing_devices",name:"Hearing devices",sub:"助听设备",iconKey:"hearing_devices"},{id:"one_handed",name:"One-handed mode",sub:"单手模式",iconKey:"one_handed"}]},{category:"From system apps / 系统功能",tiles:[{id:"calculator",name:"Calculator",sub:"计算器",iconKey:"calculator"},{id:"focus_mode",name:"Focus mode",sub:"专注模式",iconKey:"focus_mode"},{id:"live_caption",name:"Live Caption",sub:"实时字幕",iconKey:"live_caption"},{id:"live_transcribe",name:"Live Transcribe",sub:"实时转写",iconKey:"live_transcribe"},{id:"recorder",name:"Recorder",sub:"录音机",iconKey:"recorder"},{id:"song_search",name:"Song search",sub:"听歌识曲",iconKey:"song_search"},{id:"sound_notifications",name:"Sound notifications",sub:"声音通知",iconKey:"sound_notifications"},{id:"storage",name:"Storage",sub:"存储空间",iconKey:"storage"},{id:"vpn",name:"VPN",sub:"虚拟网络",iconKey:"vpn"}]}];let be=[...hv],En=JSON.parse(JSON.stringify(gv)),lr=[],vs=null;function xp(){_p(),zt(),bv(),Sv(),Ev(),vv();const e=document.getElementById("qsEditBtn");e&&(e.innerHTML=g.edit,e.addEventListener("click",n=>{n.stopPropagation(),Mp()}));const t=document.getElementById("qsSettingsBtn");t&&(t.innerHTML=g.settings,t.addEventListener("click",n=>{n.stopPropagation(),Ie();const a=F.findIndex(r=>r.id==="settings");if(a!==-1){const r=document.querySelector('[data-id="settings"]');H(a,r)}}));const i=document.getElementById("qsPowerBtn");i&&(i.innerHTML=g.power,i.addEventListener("click",n=>{n.stopPropagation(),Tp()}))}function vv(){document.querySelectorAll(".panel-carrier-icon").forEach(e=>{e.innerHTML=g.cellular})}function zt(){const e=document.getElementById("qsTilesContainer");e&&(e.innerHTML="",be.forEach(t=>{const i=t.id==="darktheme"?nt()==="dark":t.active,n=document.createElement("div");n.className=`qs-tile-pill ${i?"active":""}`,n.dataset.tileId=t.id;const r=`<div class="qs-tile-icon-wrap">${g[t.iconKey]||g.settings}</div>`;n.innerHTML=`
      ${r}
      <div class="qs-tile-text">
        <span class="qs-tile-title">${t.name}</span>
        <span class="qs-tile-sub">${i?t.sub||"已开启":"已关闭"}</span>
      </div>
    `,n.addEventListener("click",o=>{if(o.stopPropagation(),t._sourceRect=n.getBoundingClientRect(),t.id==="lock_screen"){navigator.vibrate&&navigator.vibrate(20),Ie(),setTimeout(()=>Ni(),120);return}if(t.id==="profile"){navigator.vibrate&&navigator.vibrate(20),We("profile"),Ie(),setTimeout(()=>{window.__profiles&&window.__profiles.toggle()},160);return}if(t.id==="qrcode"||t.id==="wallet"||t.id==="calculator"){navigator.vibrate&&navigator.vibrate(20),We("tick"),tc(t);return}We("tick"),t.active=!t.active,t.id==="darktheme"&&(Xi(nt()==="dark"?"light":"dark"),t.active=nt()==="dark"),navigator.vibrate&&navigator.vibrate(20),yv(t),tc(t)}),e.appendChild(n)}))}function yv(e){const t=document.getElementById("qsTilesContainer"),i=t?t.querySelector(`.qs-tile-pill[data-tile-id="${e.id}"]`):null;if(!i){zt();return}const n=e.id==="darktheme"?nt()==="dark":e.active;i.classList.toggle("active",n);const a=i.querySelector(".qs-tile-sub");a&&(a.textContent=n?e.sub||"已开启":"已关闭")}function tc(e){switch(e.id){case"darktheme":e.active=nt()==="dark",ne(e.active?"已开启深色主题":"已切换为浅色主题",e.active?g.bedtime:g.weather_sunny);break;case"torch":bp(e.active);break;case"internet":Da(e.active),ne(e.active?"已连接至中国移动 5G Wi-Fi":"网络已断开连接",e.active?g.wifi:g.wifi_off);break;case"bluetooth":ne(e.active?"蓝牙已开启，已连接 Pixel Buds Pro":"蓝牙已关闭",e.active?g.headphones:g.block);break;case"modes":ii(e.active);break;case"focus":window.__focus&&window.__focus.onTileToggle(e.active);break;case"battery_saver":Ep(e.active);break;case"screen_record":wv(e.active);break;case"qrcode":Ie();const t=F.findIndex(a=>a.id==="camera");t!==-1&&H(t,null,e._sourceRect||null);break;case"wallet":Ie();const i=F.findIndex(a=>a.id==="wallet");i!==-1&&H(i,null,e._sourceRect||null);break;case"calculator":Ie();const n=F.findIndex(a=>a.id==="calculator");n!==-1&&H(n,null,e._sourceRect||null);break;case"mic_access":case"camera_access":xv(),ne(e.active?`已启用 ${e.name}`:`已禁用 ${e.name}`,e.active?g.record_dot:g.block);break;case"autorotate":ne(e.active?"自动旋转已开启":"方向已锁定",e.active?g.autorotate:g.lock);break;default:ne(`${e.name}: ${e.active?"已开启":"已关闭"}`);break}}function bp(e){let t=document.getElementById("screenTorchLayer");t||(t=document.createElement("div"),t.id="screenTorchLayer",t.style.cssText=`
      position: fixed; inset: 0; background: #FFFFFF; z-index: 99999;
      opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; color: #000; font-family: sans-serif;
    `,t.innerHTML=`
      <div style="font-size:48px;margin-bottom:12px;">${g.torch}</div>
      <div style="font-size:18px;font-weight:600;">屏幕手电筒高亮中</div>
      <div style="font-size:13px;opacity:0.6;margin-top:6px;">点击任意位置退出</div>
    `,t.addEventListener("click",()=>{const i=be.find(n=>n.id==="torch");i&&(i.active=!1),zt(),bp(!1)}),document.body.appendChild(t)),e?(t.style.pointerEvents="auto",t.style.opacity="0.96"):(t.style.opacity="0",t.style.pointerEvents="none")}function wv(e){const t=document.getElementById("statusBar");if(!t)return;let i=document.getElementById("statusRecIndicator");if(e){i||(i=document.createElement("div"),i.id="statusRecIndicator",i.style.cssText=`
        display: flex; align-items: center; gap: 4px; background: rgba(239, 68, 68, 0.2);
        color: #ef4444; font-size: 11px; font-weight: bold; padding: 2px 8px;
        border-radius: 12px; animation: pulse 1.5s infinite;
      `,i.innerHTML='<span style="width:7px;height:7px;background:#ef4444;border-radius:50%;"></span><span id="recTimerText">00:01</span>',(t.querySelector(".status-right")||t).prepend(i));let n=1;clearInterval(vs),vs=setInterval(()=>{n++;const a=Math.floor(n/60),r=n%60,o=document.getElementById("recTimerText");o&&(o.textContent=`${a<10?"0":""}${a}:${r<10?"0":""}${r}`)},1e3),ne("屏幕录制已启动",g.record_dot)}else clearInterval(vs),i&&i.remove(),ne("屏幕录制已停止并已保存",g.stop_record)}function xv(){const e=be.find(r=>r.id==="mic_access"),t=be.find(r=>r.id==="camera_access"),i=e&&e.active||t&&t.active;let n=document.getElementById("statusPrivacyDot");const a=document.getElementById("statusBar");a&&(i?n||(n=document.createElement("div"),n.id="statusPrivacyDot",n.style.cssText=`
        width: 8px; height: 8px; background: #22c55e; border-radius: 50%;
        box-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
      `,(a.querySelector(".status-right")||a).appendChild(n)):n&&n.remove())}function Sp(e){const t=be.find(i=>i.id===e);return t?!!t.active:!1}function ii(e,{silent:t=!1}={}){const i=be.find(n=>n.id==="modes");i&&(i.active=!!e),document.body.classList.toggle("dnd-mode-active",!!e),zt(),t||ne(e?"勿扰模式已开启 (静音新消息横幅)":"勿扰模式已关闭",e?g.bell_off:g.sound_notifications)}const kp="ios-desktop:battery-saver";function Ep(e,{silent:t=!1}={}){const i=be.find(r=>r.id==="battery_saver"),n=i?!!i.active:!1,a=!!e;i&&(i.active=a),document.body.classList.toggle("battery-saver-mode",a);try{localStorage.setItem(kp,a?"1":"0")}catch{}zt(),!t&&n!==a&&ne(a?"省电模式已启动 (降低背景功耗)":"已退出省电模式",a?g.battery_saver:g.bolt),n!==a&&document.dispatchEvent(new CustomEvent("battery-saver-changed",{detail:{active:a}}))}function _p(){let e=!1;try{e=localStorage.getItem(kp)==="1"}catch{}const t=be.find(i=>i.id==="battery_saver");t&&(t.active=e),document.body.classList.toggle("battery-saver-mode",e)}function Rr(e,{active:t,sub:i}={}){const n=be.find(r=>r.id===e);if(!n)return;t!==void 0&&(n.active=!!t),i!==void 0&&(n.sub=i);const a=document.querySelector('.qs-tile-pill[data-tile-id="'+e+'"]');if(a){a.classList.toggle("active",!!n.active);const r=a.querySelector(".qs-tile-sub");r&&(r.textContent=n.active?n.sub||"已开启":"已关闭")}}function ne(e,t){let i=document.getElementById("systemGlobalToast");if(i||(i=document.createElement("div"),i.id="systemGlobalToast",i.style.cssText=`
      position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: rgba(23, 29, 27, 0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      color: #FFFFFF; font-size: 13px; font-weight: 500; padding: 10px 20px; border-radius: 24px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 10000; opacity: 0; pointer-events: none;
      transition: all 0.25s cubic-bezier(0.2, 0.9, 0.3, 1);
    `,document.body.appendChild(i)),t){i.innerHTML=`<span class="toast-icon">${t}</span>`;const n=document.createElement("span");n.className="toast-text",n.textContent=e,i.appendChild(n)}else i.textContent=e;i.style.opacity="1",i.style.transform="translateX(-50%) translateY(0)",clearTimeout(i._timer),i._timer=setTimeout(()=>{i.style.opacity="0",i.style.transform="translateX(-50%) translateY(20px)"},2200)}function bv(){const e=document.getElementById("qsBrightnessPct");document.getElementById("qsBrightnessIcon")&&(document.getElementById("qsBrightnessIcon").innerHTML=g.brightness),ic({bar:document.getElementById("qsBrightnessBar"),fill:document.getElementById("qsBrightnessFill"),pct:e,min:15,onInput:n=>{const a=.35+n/100*.65;document.body.style.filter=`brightness(${a.toFixed(2)})`}});const t=document.getElementById("qsVolumeIcon");t&&(t.innerHTML=g.volume);let i=null;ic({bar:document.getElementById("qsVolumeBar"),fill:document.getElementById("qsVolumeFill"),pct:document.getElementById("qsVolumePct"),min:0,onInput:n=>{Le.setVolume(n/100);const a=n===0;t&&a!==i&&(t.innerHTML=a?g.volume_mute:g.volume,i=a)}})}function ic({bar:e,fill:t,pct:i,min:n=0,onInput:a}){if(!e||!t)return;let r=null,o=0,l=0;const c=u=>{const f=r||e.getBoundingClientRect(),m=Math.max(n,Math.min(100,Math.round((u-f.left)/Math.max(f.width,1)*100)));t.style.width=`${m}%`,i&&(i.textContent=`${m}%`),a(m)},d=u=>{l=u,!o&&(o=requestAnimationFrame(()=>{o=0,c(l)}))};e.addEventListener("pointerdown",u=>{r=e.getBoundingClientRect(),l=u.clientX,e.classList.add("is-dragging"),c(u.clientX);const f=h=>d(h.clientX),m=()=>{e.classList.remove("is-dragging"),window.removeEventListener("pointermove",f),window.removeEventListener("pointerup",m),window.removeEventListener("pointercancel",m),o&&(cancelAnimationFrame(o),o=0),c(l),navigator.vibrate&&navigator.vibrate(8)};window.addEventListener("pointermove",f),window.addEventListener("pointerup",m),window.addEventListener("pointercancel",m)})}function Sv(){const e=document.getElementById("editTilesBackBtn"),t=document.getElementById("editTilesUndoBtn");e&&(e.innerHTML=g.back,e.addEventListener("click",Ip)),t&&(t.innerHTML=`${g.undo} <span>Undo</span>`,t.addEventListener("click",kv))}function Mp(){const e=document.getElementById("editTilesView");e&&(lr=[],cr(),e.classList.add("open"))}function Ip(){const e=document.getElementById("editTilesView");e&&(e.classList.remove("open"),zt())}function kv(){if(lr.length===0)return;const e=lr.pop();be=JSON.parse(JSON.stringify(e.activeTiles)),En=JSON.parse(JSON.stringify(e.availableCategories)),cr(),navigator.vibrate&&navigator.vibrate(25)}function nc(){lr.push({activeTiles:JSON.parse(JSON.stringify(be)),availableCategories:JSON.parse(JSON.stringify(En))})}function cr(){const e=document.getElementById("editActiveTilesGrid");e&&(e.innerHTML="",be.forEach((i,n)=>{const a=document.createElement("div");a.className="qs-tile-pill active",a.style.position="relative";const r=g[i.iconKey]||g.settings;a.innerHTML=`
        <div class="qs-tile-icon-wrap">${r}</div>
        <div class="qs-tile-text">
          <span class="qs-tile-title">${i.name}</span>
          <span class="qs-tile-sub">${i.sub||""}</span>
        </div>
        <div class="edit-badge-remove" data-index="${n}">−</div>
      `,a.querySelector(".edit-badge-remove").addEventListener("click",o=>{o.stopPropagation(),nc();const l=be.splice(n,1)[0],c=En[1]||En[0];c&&c.tiles.push(l),cr()}),e.appendChild(a)}));const t=document.getElementById("editAvailableCategories");t&&(t.innerHTML="",En.forEach(i=>{const n=document.createElement("div");n.className="edit-category-title",n.textContent=i.category,t.appendChild(n);const a=document.createElement("div");a.className="qs-tiles-grid",i.tiles.forEach((r,o)=>{const l=document.createElement("div");l.className="qs-tile-pill",l.style.position="relative";const c=g[r.iconKey]||g.settings;l.innerHTML=`
          <div class="qs-tile-icon-wrap">${c}</div>
          <div class="qs-tile-text">
            <span class="qs-tile-title">${r.name}</span>
            <span class="qs-tile-sub">${r.sub||""}</span>
          </div>
          <div class="edit-badge-add" data-cat="${i.category}" data-index="${o}">+</div>
        `,l.querySelector(".edit-badge-add").addEventListener("click",d=>{d.stopPropagation(),nc();const u=i.tiles.splice(o,1)[0];u.active=!0,be.push(u),cr()}),a.appendChild(l)}),t.appendChild(a)}))}function Ev(){const e=document.getElementById("powerDialogOverlay");if(!e)return;e.addEventListener("click",a=>{a.target===e&&mn()});const t=document.getElementById("powerRestartBtn"),i=document.getElementById("powerShutdownBtn"),n=document.getElementById("powerEmergencyBtn");i&&(i.innerHTML=`${g.power}<span>关机</span>`,i.addEventListener("click",()=>{mn(),document.body.style.opacity="0",document.body.style.transition="opacity 0.6s ease",setTimeout(()=>{document.body.innerHTML='<div style="display:flex;height:100vh;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;font-size:18px;">已关机 (点击屏幕重启)</div>',document.body.style.opacity="1",document.body.onclick=()=>location.reload()},600)})),t&&(t.innerHTML=`${g.restart}<span>重启</span>`,t.addEventListener("click",()=>{mn(),location.reload()})),n&&(n.innerHTML=`${g.emergency}<span>紧急呼叫</span>`,n.addEventListener("click",()=>{mn(),ne("正在拨打紧急电话 110/120/119...",g.call)}))}function Tp(){const e=document.getElementById("powerDialogOverlay");e&&e.classList.add("active")}function mn(){const e=document.getElementById("powerDialogOverlay");e&&e.classList.remove("active")}const Cp=Object.freeze(Object.defineProperty({__proto__:null,closeEditTilesView:Ip,closePowerDialog:mn,getTileActive:Sp,initQuickSettings:xp,openEditTilesView:Mp,openPowerDialog:Tp,renderQuickSettingsGrid:zt,restoreBatterySaverState:_p,setBatterySaverActive:Ep,setDndActive:ii,showSystemToast:ne,syncTileState:Rr},Symbol.toStringTag,{value:"Module"}));typeof window<"u"&&(window.__recorderPerm=function(){try{return Promise.resolve(Ks("microphone",{appId:"recorder",appName:"录音机"})).then(function(e){return e===!0}).catch(function(){return!1})}catch{return Promise.resolve(!1)}},window.__recorderMicGate=function(){try{return Sp("mic_access")!==!1}catch{return!0}});const _v={id:"recorder",name:"录音机",pages:[{title:"录音机",content:`
        <div style="padding:16px 0 32px;position:relative;">
          <style>
            @keyframes recPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
          </style>
          <!-- 录音主卡 -->
          <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:22px 18px 20px;text-align:center;">
            <div id="recStatus" style="font-size:14px;font-weight:600;color:var(--md-on-surface-variant);">就绪</div>
            <div id="recTimer" style="font-size:44px;font-weight:700;color:var(--md-on-surface);font-variant-numeric:tabular-nums;margin:6px 0 10px;">00:00</div>
            <!-- 电平条（录音中由 AnalyserNode 驱动） -->
            <!-- v7.6：显隐改用 opacity 而非 visibility —— visibility:visible 是唯一能击穿
                 祖先 visibility:hidden 的属性，此前关闭应用后音波条会穿透隐藏的窗口悬浮在桌面上 -->
            <div id="recBars" style="display:flex;align-items:flex-end;justify-content:center;gap:5px;height:34px;margin:0 auto 16px;opacity:0;transition:opacity .15s ease;">
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
            </div>
            <button id="recBtn" title="开始录音" style="width:76px;height:76px;border-radius:50%;border:none;cursor:pointer;margin:0 auto;display:flex;align-items:center;justify-content:center;background:hsl(var(--md-h,215) 85% 55%);color:#fff;box-shadow:0 8px 26px hsl(var(--md-h,215) 85% 55% / .45);transition:transform .18s cubic-bezier(.2,0,0,1),background .2s;">
              <span id="recBtnIcon" style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;font-size:30px;">${g.mic}</span>
            </button>
            <div id="recHint" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:12px;opacity:.85;">录音会保存到「文件」应用的 recordings 目录</div>
          </div>

          <!-- 录音列表 -->
          <div class="md3-card" style="padding:0;overflow:hidden;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 16px 9px;">
              <div style="font-size:14px;font-weight:700;color:var(--md-on-surface);">我的录音</div>
              <div id="recCount" style="font-size:12px;color:var(--md-on-surface-variant);"></div>
            </div>
            <div id="recList"></div>
            <div id="recEmpty" style="padding:34px 20px;text-align:center;color:var(--md-on-surface-variant);">
              <div style="opacity:.45;margin-bottom:10px;"><span style="display:inline-block;transform:scale(2);">${g.recorder}</span></div>
              <div style="font-size:14px;">还没有录音</div>
              <div style="font-size:12px;margin-top:4px;opacity:.8;">点上方麦克风按钮开始第一段录音</div>
            </div>
          </div>

          <!-- 分享面板 -->
          <div id="recShareSheet" style="display:none;position:absolute;inset:0;z-index:70;background:rgba(0,0,0,.45);">
            <div style="position:absolute;left:0;right:0;bottom:0;background:var(--md-surface-container,#1e1e24);border-radius:24px 24px 0 0;padding:18px 16px 26px;">
              <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin:0 4px 12px;" id="recShareTitle">分享</div>
              <div id="recShareTargets"></div>
              <button class="md3-btn-tonal" id="recShareCancel" style="width:100%;margin-top:6px;">取消</button>
            </div>
          </div>

          <!-- 通用对话框（重命名 / 删除确认） -->
          <div id="recDialog" style="display:none;position:absolute;inset:0;z-index:80;background:rgba(0,0,0,.45);align-items:center;justify-content:center;padding:28px;">
            <div class="md3-card md3-card-elevated" style="width:100%;max-width:340px;padding:22px 20px 14px;">
              <div id="recDialogTitle" style="font-size:17px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;"></div>
              <div id="recDialogMsg" style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:10px;white-space:pre-wrap;display:none;"></div>
              <input id="recDialogInput" type="text" style="width:100%;box-sizing:border-box;background:var(--md-surface-container-high,#2a2a32);border:1px solid var(--md-outline-variant);border-radius:12px;color:var(--md-on-surface);font-size:14px;padding:11px 12px;outline:none;display:none;" />
              <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:14px;">
                <button class="md3-btn-tonal" id="recDialogCancel">取消</button>
                <button class="md3-btn-filled" id="recDialogOk">确定</button>
              </div>
            </div>
          </div>

          <script>
            (function() {
              'use strict';
              var V = window.__vfs || null;
              var DIR = '/recordings';
              var $ = function(id) { return document.getElementById(id); };

              var statusEl = $('recStatus'), timerEl = $('recTimer'), barsEl = $('recBars'), btn = $('recBtn'), btnIcon = $('recBtnIcon'), hintEl = $('recHint');
              var listEl = $('recList'), emptyEl = $('recEmpty'), countEl = $('recCount');
              var shareSheet = $('recShareSheet'), shareTitle = $('recShareTitle'), shareTargets = $('recShareTargets');
              var dlgEl = $('recDialog'), dlgTitle = $('recDialogTitle'), dlgMsg = $('recDialogMsg'), dlgInput = $('recDialogInput');

              // ---------- 状态 ----------
              var recording = false;
              var rec = null, recStream = null, recMime = '', recChunks = [], recSec = 0, recTimer = null, barsTimer = null, audioCtx = null, analyser = null;
              var audio = null, playPath = null, playingRow = null;
              var visible = true;
              var dlgResolve = null;

              // ---------- 小工具 ----------
              function esc(s) {
                return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\"/g, '&quot;').replace(/'/g, '&#39;');
              }
              function toast(msg) {
                try { if (window.showSystemToast) window.showSystemToast(msg); } catch (e) {}
              }
              function fmtBytes(b) {
                if (!b || b < 0) return '0 B';
                if (b < 1024) return b + ' B';
                if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
                return (b / 1048576).toFixed(2) + ' MB';
              }
              function fmtSec(s) {
                s = Math.max(0, Math.floor(s || 0));
                var m = Math.floor(s / 60), r = s % 60;
                return (m < 10 ? '0' + m : m) + ':' + (r < 10 ? '0' + r : r);
              }
              function fmtDate(ts) {
                try { return new Date(ts || Date.now()).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
              }
              function baseName(p) { return p.slice(p.lastIndexOf('/') + 1); }
              function extOf(name) {
                var i = name.lastIndexOf('.');
                return i > 0 ? name.slice(i) : '';
              }
              function emit(event, payload) {
                // 模块应用运行在桌面文档内：事件必须发给桌面总线所在窗口（window 自身）。
                // parent 仅在桌面被根壳 iframe 包裹时才存在，壳不处理 BUS_EMIT，只作冗余兜底。
                var msg = { type: 'BUS_EMIT', event: event, payload: payload, target: 'msg' };
                try { window.postMessage(msg, '*'); } catch (e) {}
                try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (e) {}
              }

              // ---------- 通用对话框（Promise 风格） ----------
              function dlg(opts) {
                return new Promise(function (resolve) {
                  dlgResolve = resolve;
                  dlgTitle.textContent = opts.title || '';
                  dlgMsg.style.display = opts.msg ? 'block' : 'none';
                  dlgMsg.textContent = opts.msg || '';
                  dlgInput.style.display = opts.input ? 'block' : 'none';
                  dlgInput.value = opts.value || '';
                  dlgEl.style.display = 'flex';
                  if (opts.input) { try { dlgInput.focus(); dlgInput.select(); } catch (e) {} }
                });
              }
              function closeDlg(val) {
                dlgEl.style.display = 'none';
                if (dlgResolve) { var r = dlgResolve; dlgResolve = null; r(val); }
              }
              $('recDialogOk').addEventListener('click', function () {
                closeDlg(dlgInput.style.display !== 'none' ? dlgInput.value : true);
              });
              $('recDialogCancel').addEventListener('click', function () { closeDlg(null); });
              dlgInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); $('recDialogOk').click(); }
              });

              // ---------- 录音主流程 ----------
              function pickMime() {
                var candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
                if (typeof MediaRecorder === 'undefined') return '';
                for (var i = 0; i < candidates.length; i++) {
                  try { if (MediaRecorder.isTypeSupported(candidates[i])) return candidates[i]; } catch (e) {}
                }
                return '';
              }
              function mimeExt(m) {
                if (m.indexOf('mp4') >= 0) return '.m4a';
                if (m.indexOf('ogg') >= 0) return '.ogg';
                return '.webm';
              }
              function setBtnState(isRec) {
                btn.style.background = isRec ? '#E5484D' : 'hsl(var(--md-h,215) 85% 55%)';
                btn.style.boxShadow = isRec ? '0 8px 26px rgba(229,72,77,.45)' : '0 8px 26px hsl(var(--md-h,215) 85% 55% / .45)';
                btn.style.animation = isRec ? 'recPulse 1.4s ease-in-out infinite' : '';
                btnIcon.innerHTML = isRec ? '${g.stop_record}' : '${g.mic}';
                btn.title = isRec ? '停止并保存' : '开始录音';
              }
              function startBars(stream) {
                try {
                  var Ctx = window.AudioContext || window.webkitAudioContext;
                  if (!Ctx) return;
                  audioCtx = new Ctx();
                  var src = audioCtx.createMediaStreamSource(stream);
                  analyser = audioCtx.createAnalyser();
                  analyser.fftSize = 256;
                  src.connect(analyser);
                  var data = new Uint8Array(analyser.frequencyBinCount);
                  barsEl.style.opacity = '1';
                  barsTimer = setInterval(function () {
                    try {
                      analyser.getByteFrequencyData(data);
                      var bars = barsEl.querySelectorAll('.rec-bar');
                      var step = Math.floor(data.length / bars.length) || 1;
                      for (var i = 0; i < bars.length; i++) {
                        var sum = 0;
                        for (var j = 0; j < step; j++) sum += data[i * step + j] || 0;
                        var avg = sum / step;
                        var h = 6 + Math.min(28, (avg / 255) * 34);
                        bars[i].style.height = h.toFixed(0) + 'px';
                      }
                    } catch (e) {}
                  }, 120);
                } catch (e) {}
              }
              function stopBars() {
                if (barsTimer) { clearInterval(barsTimer); barsTimer = null; }
                if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; analyser = null; }
                barsEl.style.opacity = '0';
                var bars = barsEl.querySelectorAll('.rec-bar');
                for (var i = 0; i < bars.length; i++) bars[i].style.height = '6px';
              }
              function uniqueName(dir, base, ext) {
                var name = base + ext, n = 2;
                // V.exists 为同步内存索引查询（vfs.js），不可用时直接用首名
                while (V && V.exists && V.exists(dir + '/' + name)) {
                  name = base + ' (' + n + ')' + ext; n++;
                  if (n > 99) break;
                }
                return name;
              }

              function startRecording() {
                if (!V) { toast('文件系统未就绪，无法保存录音'); return; }
                if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || typeof MediaRecorder === 'undefined') {
                  toast('当前环境不支持录音（缺少 MediaRecorder）');
                  return;
                }
                if (!window.__recorderMicGate || !window.__recorderMicGate()) {
                  toast('快速设置中「Mic access」已关闭，请先开启');
                  return;
                }
                Promise.resolve(window.__recorderPerm ? window.__recorderPerm() : false).then(function (ok) {
                  if (!ok) { toast('需要麦克风权限才能录音（设置 › 应用权限可改判）'); return; }
                  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
                    recMime = pickMime();
                    try { rec = recMime ? new MediaRecorder(stream, { mimeType: recMime }) : new MediaRecorder(stream); }
                    catch (e) { rec = new MediaRecorder(stream); recMime = ''; }
                    if (!recMime) recMime = rec.mimeType || 'audio/webm';
                    recStream = stream;
                    recChunks = []; recSec = 0;
                    rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) recChunks.push(ev.data); };
                    rec.onstop = function () { saveRecording(); };
                    try { rec.start(250); } catch (e) { rec.start(); }
                    recording = true;
                    setBtnState(true);
                    statusEl.textContent = '录音中…';
                    statusEl.style.color = '#E5484D';
                    timerEl.textContent = '00:00';
                    recTimer = setInterval(function () {
                      recSec++;
                      timerEl.textContent = fmtSec(recSec);
                    }, 1000);
                    startBars(stream);
                  }).catch(function (err) {
                    toast('无法访问麦克风：' + (err && err.name ? err.name : '未知错误'));
                  });
                });
              }

              function stopRecording() {
                if (!recording || !rec) return;
                recording = false;
                if (recTimer) { clearInterval(recTimer); recTimer = null; }
                stopBars();
                setBtnState(false);
                statusEl.textContent = '保存中…';
                statusEl.style.color = '';
                try { rec.stop(); } catch (e) { saveRecording(); }
              }

              function saveRecording() {
                var chunks = recChunks; recChunks = [];
                var sec = recSec;
                if (recStream) { try { recStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} recStream = null; }
                if (!chunks.length) {
                  statusEl.textContent = '就绪';
                  toast('没有录到内容');
                  return;
                }
                var blob = new Blob(chunks, { type: recMime || 'audio/webm' });
                var ts = new Date();
                var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
                var base = '录音 ' + pad(ts.getMonth() + 1) + pad(ts.getDate()) + '-' + pad(ts.getHours()) + pad(ts.getMinutes()) + pad(ts.getSeconds());
                var ext = mimeExt(recMime || blob.type || '');
                var name = uniqueName(DIR, base, ext);
                var path = DIR + '/' + name;
                V.write(path, blob, { mime: (blob.type || 'audio/webm').split(';')[0], owner: 'recorder', meta: { duration: sec } })
                  .then(function (res) {
                    if (res && res.ok) { toast('已保存：' + name); statusEl.textContent = '就绪'; timerEl.textContent = '00:00'; }
                    else { statusEl.textContent = '保存失败'; toast('保存失败：' + ((res && res.error) || '未知错误')); }
                  })
                  .catch(function () { statusEl.textContent = '保存失败'; toast('保存失败'); });
              }

              btn.addEventListener('click', function () { recording ? stopRecording() : startRecording(); });

              // ---------- 列表 ----------
              function rowHTML(e) {
                var meta = e.meta || {};
                var dur = meta.duration ? fmtSec(meta.duration) : '';
                var size = fmtBytes(e.size || 0);
                var isActive = playPath === e.path;
                return '<div class="md3-list-item" data-path="' + esc(e.path) + '" style="display:flex;align-items:center;gap:12px;padding:10px 14px;' + (isActive ? 'background:hsl(var(--md-h,215) 80% 50% / .1);' : '') + '">'
                  + '<button class="md3-btn-tonal" data-act="play" title="播放" style="min-width:0;width:40px;height:40px;padding:0;border-radius:50%;flex:none;">' + (isActive && audio && !audio.paused ? '${g.pause}' : '${g.play}') + '</button>'
                  + '<div style="flex:1;min-width:0;">'
                  +   '<div style="font-size:14px;font-weight:600;color:var(--md-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(e.name) + '</div>'
                  +   '<div data-role="meta" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:2px;">' + (dur ? dur + ' · ' : '') + size + ' · ' + fmtDate(e.modified) + '</div>'
                  + '</div>'
                  + '<button class="md3-btn-tonal" data-act="share" title="分享" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${g.quick_share}</button>'
                  + '<button class="md3-btn-tonal" data-act="rename" title="重命名" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${g.edit}</button>'
                  + '<button class="md3-btn-tonal" data-act="del" title="删除" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${g.delete_forever}</button>'
                  + '</div>';
              }

              function render() {
                if (!V || !visible) return;
                Promise.resolve(V.list(DIR)).then(function (entries) {
                  var files = (entries || []).filter(function (e) { return e.type !== 'dir'; });
                  countEl.textContent = files.length ? files.length + ' 段' : '';
                  emptyEl.style.display = files.length ? 'none' : 'block';
                  listEl.innerHTML = files.map(rowHTML).join('');
                }).catch(function () {});
              }

              // 事件委托：列表内所有点击（播放/分享/重命名/删除）
              listEl.addEventListener('click', function (ev) {
                var actBtn = ev.target.closest('[data-act]');
                if (!actBtn) return;
                var row = actBtn.closest('[data-path]');
                if (!row) return;
                var path = row.getAttribute('data-path');
                var act = actBtn.getAttribute('data-act');
                if (act === 'play') togglePlay(path, row);
                else if (act === 'share') openShare(path);
                else if (act === 'rename') doRename(path);
                else if (act === 'del') doDelete(path);
              });

              // ---------- 播放 ----------
              function stopPlayback() {
                if (audio) { try { audio.pause(); } catch (e) {} }
                if (playingRow) {
                  var m = playingRow.querySelector('[data-role="meta"]');
                  if (m && m.getAttribute('data-plain')) m.textContent = m.getAttribute('data-plain');
                  var pb = playingRow.querySelector('[data-act="play"]');
                  if (pb) pb.innerHTML = '${g.play}';
                  playingRow.style.background = '';
                }
                playingRow = null; playPath = null;
              }
              function togglePlay(path, row) {
                if (!V) return;
                if (playPath === path && audio) {
                  if (audio.paused) { try { audio.play(); } catch (e) {} row.querySelector('[data-act="play"]').innerHTML = '${g.pause}'; }
                  else { audio.pause(); row.querySelector('[data-act="play"]').innerHTML = '${g.play}'; }
                  return;
                }
                stopPlayback();
                Promise.resolve(V.readURL(path)).then(function (url) {
                  if (!url) { toast('读取失败'); return; }
                  playPath = path; playingRow = row;
                  row.style.background = 'hsl(var(--md-h,215) 80% 50% / .1)';
                  row.querySelector('[data-act="play"]').innerHTML = '${g.pause}';
                  var metaEl = row.querySelector('[data-role="meta"]');
                  if (metaEl) {
                    metaEl.setAttribute('data-plain', metaEl.textContent);
                    metaEl.textContent = '00:00 播放中…';
                  }
                  audio = audio || new Audio();
                  audio.src = url;
                  audio.onended = function () { stopPlayback(); };
                  audio.ontimeupdate = function () {
                    if (playPath !== path || !metaEl) return;
                    var total = null;
                    try {
                      var e = V.stat && V.stat(path);
                      if (e && e.meta && e.meta.duration) total = e.meta.duration;
                    } catch (err) {}
                    if (total == null && isFinite(audio.duration)) total = audio.duration;
                    metaEl.textContent = fmtSec(audio.currentTime) + (total != null ? ' / ' + fmtSec(total) : '') + ' 播放中…';
                  };
                  audio.play().catch(function () { toast('播放失败'); });
                }).catch(function () { toast('读取失败'); });
              }

              // ---------- 重命名 / 删除 ----------
              function doRename(path) {
                var name = baseName(path);
                var ext = extOf(name);
                dlg({ title: '重命名录音', input: true, value: name.slice(0, name.length - ext.length) })
                  .then(function (val) {
                    if (val == null) return;
                    var nn = String(val).trim();
                    if (!nn) { toast('名称不能为空'); return; }
                    var newPath = DIR + '/' + nn + ext;
                    if (newPath === path) return;
                    Promise.resolve(V.move(path, newPath)).then(function (res) {
                      if (res && res.ok) toast('已重命名');
                      else toast('重命名失败：' + ((res && res.error) || '目标可能已存在'));
                    }).catch(function () { toast('重命名失败'); });
                  });
              }
              function doDelete(path) {
                dlg({ title: '删除录音', msg: '「' + baseName(path) + '」将被删除，且无法恢复。' })
                  .then(function (ok) {
                    if (!ok) return;
                    if (playPath === path) stopPlayback();
                    Promise.resolve(V.del(path)).then(function (res) {
                      if (res && res.ok) toast('已删除');
                      else toast('删除失败');
                    }).catch(function () { toast('删除失败'); });
                  });
              }

              // ---------- 分享 ----------
              function openShare(path) {
                shareTitle.textContent = '分享「' + baseName(path) + '」';
                shareTargets.innerHTML = '<button class="md3-list-item" data-share="msg" style="width:100%;"><div class="md3-list-item-icon">${g.chat}</div><div class="md3-list-item-text">发送到 信息</div></button>';
                shareTargets.setAttribute('data-sharing-path', path);
                shareSheet.style.display = 'block';
              }
              $('recShareCancel').addEventListener('click', function () { shareSheet.style.display = 'none'; });
              shareSheet.addEventListener('click', function (e) { if (e.target === shareSheet) shareSheet.style.display = 'none'; });
              shareTargets.addEventListener('click', function (e) {
                var b = e.target.closest('[data-share]');
                if (!b) return;
                var path = shareTargets.getAttribute('data-sharing-path') || '';
                shareSheet.style.display = 'none';
                if (!path) return;
                var entry = null;
                try { entry = V.stat && V.stat(path); } catch (err) {}
                var dur = entry && entry.meta && entry.meta.duration ? ' · ' + fmtSec(entry.meta.duration) : '';
                emit('files/share', {
                  name: baseName(path),
                  text: '（语音录音）' + baseName(path) + dur,
                  noti: { title: '录音分享到信息', desc: baseName(path) },
                });
                toast('已发送到信息');
              });

              // ---------- 录音会话强制释放（实例销毁兜底） ----------
              // fix(audit-E): 录音中实例被销毁（多任务上滑滑走 / 退出分屏 / 清空后台）时
              // 此前零清理 —— MediaRecorder/MediaStream/recTimer/barsTimer/AudioContext/recChunks
              // 闭包全部存活：麦克风被持续占用、recChunks 无限增长、重开应用停不掉旧会话。
              // 登记进 __addAppCleanup（page-stack 的 releaseAppListeners 集中执行）：
              // 上滑销毁（destroyAppInstance → releaseAppListeners）与分屏退出
              // （split-screen finishClose → releaseAppListeners）两条路径都被覆盖，无需
              // 再监听 app-instance-destroyed（该事件同样派发自 releaseAppListeners 之后）。
              // 幂等设计：重复清理无害（rec/recStream/timers 置空后再入直接短路）。
              function releaseRecSession() {
                recording = false;
                if (recTimer) { try { clearInterval(recTimer); } catch (err) {} recTimer = null; }
                if (barsTimer) { try { clearInterval(barsTimer); } catch (err) {} barsTimer = null; }
                if (audioCtx) { try { audioCtx.close(); } catch (err) {} audioCtx = null; analyser = null; }
                recChunks = [];
                var stream = recStream; recStream = null;
                var r = rec; rec = null;
                if (r && (r.state === 'recording' || r.state === 'paused')) {
                  // 实例已销毁：保存 UI 不在场，onstop 内只释放 stream 轨道（丢弃未保存分片）
                  try {
                    r.onstop = function () {
                      if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (err) {} }
                    };
                    r.stop();
                    return;
                  } catch (err) { /* stop 失败 → 兜底直接停轨道 */ }
                }
                if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (err) {} }
              }

              // ---------- VFS 订阅 + 页面激活 ----------
              // 监听/订阅统一登记：实例销毁时由 page-stack 集中退订（防重建累积泄漏）
              var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
              var addCleanup = window.__addAppCleanup || function() {};
              addCleanup('recorder', releaseRecSession);
              if (V && V.subscribe) {
                var unVfs = V.subscribe(DIR, render);
                addCleanup('recorder', function() { try { unVfs(); } catch (err) {} });
              }
              bindDoc('recorder', 'app-page-active', function (e) {
                if (!e.detail || e.detail.appId !== 'recorder') return;
                visible = e.detail.pageIdx === 0;
                if (visible) render();
              });
              visible = true;
              render();
            })();
          <\/script>
        </div>
      `}]},F=[oh,lh,ch,Wh,Gh,Xh,jh,Yh,Uh,Kh,Qh,Jh,Zh,eg,tg,ig,lg,cg,dg,pg,ug,fg,mg,hg,ng,ag,rg,sg,og,gg,_v],dr=F,ac=dr.slice(0,24).map((e,t)=>({...e,slot:t})),rc=dr.slice(24).map((e,t)=>({...e,slot:t})),sc="v7_2026_08_16_threes_dice_flow11_parallel";function Mv(){try{if(localStorage.getItem("ios-desktop:data-version")!==sc)return localStorage.removeItem("ios-desktop:pages-apps"),localStorage.setItem("ios-desktop:data-version",sc),[ac,rc];const t=localStorage.getItem("ios-desktop:pages-apps");if(t){const i=JSON.parse(t);if(Array.isArray(i)&&i.length>0){for(const d of i){if(!Array.isArray(d))throw new Error("invalid");for(const u of d)if(!u||typeof u.id!="string"||typeof u.slot!="number")throw new Error("invalid")}const n=new Map(dr.map(d=>[d.id,d]));for(const d of i)for(let u=0;u<d.length;u++){const f=n.get(d[u].id);f&&(d[u]={...f,slot:d[u].slot})}let a=[];try{const d=JSON.parse(localStorage.getItem("ios-desktop:removed-apps")||"[]");Array.isArray(d)&&(a=d)}catch{}const r=new Set(a.map(d=>d&&typeof d=="object"?d.id:d).filter(d=>typeof d=="string"&&d)),o=(d,u)=>{for(const f of d)if(!(!f||typeof f.id!="string")&&(u.add(f.id),f.type==="folder"&&Array.isArray(f.apps)))for(const m of f.apps)m&&typeof m.id=="string"&&u.add(m.id)},l=new Set;for(const d of i)o(d,l);const c=dr.filter(d=>!l.has(d.id)&&!r.has(d.id));if(c.length){const d=i[i.length-1],u=c.filter(f=>d.length<24?(d.push({...f,slot:d.length}),!1):!0);u.length&&i.push(u.map((f,m)=>({...f,slot:m})))}return i}}}catch{}return[ac,rc]}function Ae(){try{localStorage.setItem("ios-desktop:pages-apps",JSON.stringify(s.pagesApps))}catch{}}function Iv(){try{const e=localStorage.getItem("ios-desktop:removed-apps");if(e){const t=JSON.parse(e);if(Array.isArray(t))return t}}catch{}return[]}const s={pagesApps:Mv(),currentPage:0,isEditMode:!1,removedApps:Iv(),currentIconEl:null,currentApp:null,isOpen:!1,isClosing:!1,returnToFolderOnClose:!1,contentWarm:!1,isDragging:!1,rafId:null,iconCX:0,iconCY:0,iconW:58,iconH:58,navHistory:[0],popInProgress:!1,posSpring:new Sr(Te(),0,0,0,0),scaleSpring:new Ge({...Te(),initialValue:0,initialVelocity:0}),subpageSpring:new Ge({...Te(),initialValue:0,initialVelocity:0}),gestureType:"NONE",drag:{active:!1,startX:0,startY:0,offsetX:0,offsetY:0,history:[]},shrinkToCard:!1,longPressTimer:null,iconDragState:null,edgePagingTimer:null,mouseDown:!1,lastGestureMoved:!1,lastGestureEndedAt:0};typeof window<"u"&&(window.__state=s);const Tv=120,oc=38,Cv=.75,Lv=.14,Av=380,lc=.0012,Bv=.0012,_a=18;let U=["msg","game2048","settings","camera","photo","music","weather"];function pr(){return typeof window<"u"&&window.__splitInfo?window.__splitInfo():{active:!1}}function Lp(){ce(()=>import("./split-screen-DuIsKdlP.js"),[],import.meta.url).then(e=>{try{e.exitSplit({instant:!0})}catch{}}).catch(()=>{})}function Fv(){ce(()=>import("./split-screen-DuIsKdlP.js"),[],import.meta.url).then(e=>{try{e.combineExit({silent:!0})}catch{}}).catch(()=>{})}function Pv(e,t){window.showSystemToast&&window.showSystemToast(e,t)}function Hr(e){navigator.vibrate&&navigator.vibrate(e)}let G=0,ki=0,Ma=!1,mi=!1,Ia=-1,$=null,ys=0,ws=0,xs=0,bs=0,Ss=0,ks=0,Es=0,cc=0,dn=0,He=null;const dc=210;function Ap(){const e=window.innerWidth||390,t=window.innerHeight||844;let i,n;return e>=t?(i=I(Math.round(e*.42),220,360),n=I(Math.round(i*(t/e)),150,320)):(n=I(Math.round(t*.44),250,470),i=I(Math.round(n*(e/t)),150,340)),{winW:e,winH:t,previewW:i,previewH:n,baseW:e,baseH:t,scale:i/e,stepPx:Math.round(i*.86),totalH:n+44}}const Wt={close:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',screenshot:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',share:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',clearAll:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',splitScreen:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',emptyDeck:`<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
    <rect x="25" y="15" width="70" height="90" rx="16" fill="var(--md-primary-container, #006B5A)" opacity="0.3" transform="rotate(-10 60 60)"/>
    <rect x="25" y="15" width="70" height="90" rx="16" fill="var(--md-secondary-container, #3F4C47)" opacity="0.5" transform="rotate(10 60 60)"/>
    <rect x="28" y="15" width="64" height="90" rx="16" fill="var(--md-surface-container-high, #1F2937)" stroke="var(--md-primary, #7DF8DB)" stroke-width="2.5"/>
    <circle cx="60" cy="45" r="14" fill="var(--md-primary, #7DF8DB)"/>
    <rect x="42" y="68" width="36" height="6" rx="3" fill="var(--md-on-surface, #fff)" opacity="0.8"/>
    <rect x="48" y="78" width="24" height="4" rx="2" fill="var(--md-on-surface-variant, #94a3b8)" opacity="0.6"/>
  </svg>`};function Bp(){zv(),window.__closeRecentApps=we,window.__openRecentApps=rt}function Fp(e){e&&(typeof window<"u"&&(window.__lastRecordedApp=e),U=U.filter(t=>t!==e),U.unshift(e),U.length>10&&U.pop())}function Pp(){return U}function zv(){let e=document.getElementById("recentAppsOverlay");e||(e=document.createElement("div"),e.id="recentAppsOverlay",e.className="recent-apps-overlay",e.innerHTML=`
    <div class="recent-apps-container" id="recentAppsContainer">
      <div class="recent-cards-deck" id="recentCardsDeck"></div>
      <div class="recent-actions-row" id="recentActionsRow">
        <button class="recent-action-pill" id="recentScreenshotBtn">
          ${Wt.screenshot}
          <span>截屏</span>
        </button>
        <button class="recent-action-pill" id="recentSplitBtn">
          ${Wt.splitScreen}
          <span>分屏</span>
        </button>
        <button class="recent-action-pill" id="recentShareBtn">
          ${Wt.share}
          <span>分享</span>
        </button>
        <button class="recent-clear-all-btn" id="recentClearAllBtn">
          ${Wt.clearAll}
          <span>全部清除</span>
        </button>
      </div>
    </div>
  `,document.body.appendChild(e),e.addEventListener("click",t=>{(t.target===e||t.target===document.getElementById("recentAppsContainer"))&&we()}),document.getElementById("recentClearAllBtn").addEventListener("click",t=>{t.stopPropagation(),$v()}),document.getElementById("recentScreenshotBtn").addEventListener("click",t=>{t.stopPropagation(),window.showSystemToast&&window.showSystemToast("已截取当前后台任务屏幕",g.photo_camera)}),document.getElementById("recentSplitBtn").addEventListener("click",t=>{t.stopPropagation();const i=document.getElementById("recentAppsOverlay");if(i.classList.contains("split-picking")){i.classList.remove("split-picking"),ce(()=>import("./split-screen-DuIsKdlP.js"),[],import.meta.url).then(a=>a.cancelPickMode()).catch(()=>{}),window.showSystemToast&&window.showSystemToast("已取消分屏配对",g.picture_in_picture);return}if(U.length<2){window.showSystemToast&&window.showSystemToast("分屏需要至少两个后台应用",g.picture_in_picture);return}const n=U[I(Math.round(G),0,U.length-1)];if(!n){window.showSystemToast&&window.showSystemToast("请先选择一个分屏应用",g.picture_in_picture);return}i.classList.add("split-picking"),ce(()=>import("./split-screen-DuIsKdlP.js"),[],import.meta.url).then(a=>a.enterPickMode(n)).catch(()=>{}),navigator.vibrate&&navigator.vibrate(15),window.showSystemToast&&window.showSystemToast("已选定第一个应用，点选另一张卡片组成分屏",g.picture_in_picture)}),document.getElementById("recentShareBtn").addEventListener("click",t=>{t.stopPropagation(),window.showSystemToast&&window.showSystemToast("正在调起 Pixel 快速分享...",g.link)}),Vv())}function $v(){const e=Array.from(document.querySelectorAll(".recent-app-card"));if(e.length===0){we();return}Hr([15,30,15]);const t=Math.round(G);e.forEach((n,a)=>{const o=Math.abs(a-t)*45;setTimeout(()=>{n.classList.add("card-dismissing"),n.style.transform=`translate3d(0, -140%, 0) scale(0.65) rotateZ(${a%2===0?-6:6}deg)`,n.style.opacity="0"},o)});const i=e.length*45+260;setTimeout(()=>{pr().active&&Lp(),U=[],dm(),Nr(),setTimeout(()=>{we(),Pv("已清除所有后台任务",g.clear_all)},180)},i)}function Dv(e,t,i){const n=e.type?Ee(e.type,!1):Z(e.id);return`
    <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:linear-gradient(180deg, var(--md-surface,#121418) 0%, var(--md-surface-container,#1a1c20) 100%);">
      ${t}
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;">
        <div style="width:84px;height:84px;opacity:0.94;">${n}</div>
        <div style="font-size:17px;font-weight:600;color:var(--md-on-surface,#fff);">${e.name}</div>
        <div style="font-size:11px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant,#9a9b9e);background:rgba(255,255,255,0.07);padding:4px 12px;border-radius:999px;">智能冻结 · 未在运行</div>
      </div>
      ${i}
    </div>
  `}function zp(e,t,i){if(!e)return"";const a=`
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
  `;if(e.pages&&e.pages[0]&&typeof e.pages[0].content=="string"&&e.pages[0].content.includes("<iframe")){const l=e.pages[0].content.match(/src=["']([^"']+)["']/),c=l?l[1]:"";if(c){const d=document.getElementById(`app-instance-${e.id}`),u=d?d.querySelector("iframe"):null;if(u)try{const f=u.contentDocument;if(f&&f.documentElement&&f.body&&f.body.childNodes.length>0){let m=f.documentElement.outerHTML;m=m.replace(/<script\b[\s\S]*?<\/script>/gi,"");const v=`<base href="${new URL(c,location.href).href}">`;/<head[^>]*>/i.test(m)?m=m.replace(/<head([^>]*)>/i,`<head$1>${v}`):m=v+m;const y=m.replace(/"/g,"&quot;");return`
              <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);">
                ${a}
                <div style="flex:1;position:relative;overflow:hidden;">
                  <iframe srcdoc="${y}" class="recent-preview-iframe" scrolling="no" tabindex="-1"></iframe>
                </div>
                ${r}
              </div>
            `}}catch{}return window.__bgFreeze&&window.__bgFreeze.isFreezeMode()?Dv(e,a,r):`
        <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);">
          ${a}
          <div style="flex:1;position:relative;overflow:hidden;">
            <iframe src="${c}" class="recent-preview-iframe" loading="eager" onload="window.__syncIframeApp&&window.__syncIframeApp(this)"></iframe>
          </div>
          ${r}
        </div>
      `}}if(e.pages&&e.pages[0]&&e.pages[0].content){const l=document.getElementById(`app-instance-${e.id}`);if(l&&l.childElementCount>0)try{let c=l.innerHTML;return c=c.replace(/<script\b[\s\S]*?<\/script>/gi,""),c=c.replace(/\sid="[^"]*"/g,""),c=c.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi,""),`
          <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);overflow:hidden;">
            ${a}
            <div class="recent-preview-native-body" style="flex:1;overflow:hidden;position:relative;">${c}</div>
            ${r}
          </div>
        `}catch{}return`
      <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);overflow:hidden;">
        ${a}
        <div class="recent-preview-native-body" style="flex:1;overflow:hidden;">
          <div style="font-size:22px;font-weight:700;margin-bottom:12px;color:var(--md-primary);">${e.name}</div>
          ${e.pages[0].content}
        </div>
        ${r}
      </div>
    `}return`
    <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--md-surface,#121418);">
      <div style="width:72px;height:72px;margin-bottom:14px;">${e.type?Ee(e.type,!1):Z(e.id)}</div>
      <div style="font-size:18px;font-weight:600;color:var(--md-on-surface,#fff);">${e.name}</div>
    </div>
  `}function Nr(){const e=document.getElementById("recentCardsDeck"),t=document.getElementById("recentActionsRow");if(!e)return;if(U.length===0){e.innerHTML=`
      <div class="recent-empty-state">
        <div class="recent-empty-illustration">${Wt.emptyDeck}</div>
        <div style="font-size:16px;font-weight:600;letter-spacing:0.2px;">暂无运行中的后台任务</div>
        <div style="font-size:13px;opacity:0.65;margin-top:6px;">打开的应用将在此处以等比微缩视口呈现</div>
      </div>
    `,t&&(t.style.display="none");return}t&&(t.style.display="flex");const i=Ap();e.style.height=`${i.totalH+26}px`;const n=e.querySelector(".recent-empty-state");n&&n.remove();const a=Ov(),r=new Map;Array.from(e.querySelectorAll(".recent-app-card")).forEach(l=>r.set(l.dataset.appId,l));const o=new Set;a.forEach(l=>{const c=typeof l=="string"?l:l.key,d=r.get(c);d&&d.dataset.pw===String(i.previewW)&&d.dataset.ph===String(i.previewH)&&o.add(c)}),r.forEach((l,c)=>{a.some(d=>(typeof d=="string"?d:d.key)===c)||l.remove()}),a.forEach((l,c)=>{const d=typeof l=="string"?l:l.key;if(o.has(d)){r.get(d).dataset.idx=String(c);return}r.get(d)?.remove();const u=typeof l=="string"?Rv(l,c,i):Hv(l,c,i);e.appendChild(u)});{const l=new Map;e.querySelectorAll(".recent-app-card").forEach(d=>l.set(d.dataset.appId,d));let c=null;a.forEach(d=>{const u=typeof d=="string"?d:d.key,f=l.get(u);if(!f)return;const m=c?c.nextElementSibling:e.firstElementChild;f!==m&&e.insertBefore(f,c?c.nextSibling:e.firstChild),c=f})}e.querySelectorAll(".recent-app-card").forEach(l=>{if(l.dataset.closeBound==="1")return;l.dataset.closeBound="1";const c=l.querySelector(".recent-card-close");c&&c.addEventListener("click",d=>{if(d.stopPropagation(),l.dataset.splitApps){const[u,f]=l.dataset.splitApps.split("|");Op(u,f)}else Gv(l.dataset.appId)})}),ni(G)}function Ov(){const e=typeof window<"u"&&window.__splitInfo?window.__splitInfo():{active:!1};let t=[];try{const o=JSON.parse(localStorage.getItem("ios-desktop:split-groups")||"[]");Array.isArray(o)&&(t=o)}catch{}if(e.active){const o=[e.appAId,e.appBId].sort().join("|"),l=t.findIndex(d=>d.id===o),c={id:o,aId:e.appAId,bId:e.appBId,axis:e.axis||"y",ratio:e.ratio||.5,ts:Date.now()};l!==-1?t[l]=c:t.unshift(c)}const i=new Map;t.forEach(o=>{o.aId&&o.bId&&o.aId!==o.bId&&(i.set(o.aId,o),i.set(o.bId,o))});const n=[],a=new Set,r=new Set;if(e.active){const o=`split:${e.appAId}|${e.appBId}`,l=[e.appAId,e.appBId].sort().join("|");a.add(l),r.add(e.appAId),r.add(e.appBId),n.push({key:o,aId:e.appAId,bId:e.appBId,axis:e.axis||"y",ratio:e.ratio||.5})}return U.forEach(o=>{if(r.has(o))return;const l=i.get(o);l?a.has(l.id)||(a.add(l.id),r.add(l.aId),r.add(l.bId),n.push({key:`split:${l.aId}|${l.bId}`,aId:l.aId,bId:l.bId,axis:l.axis||"y",ratio:l.ratio||.5})):(r.add(o),n.push(o))}),t.forEach(o=>{a.has(o.id)||(a.add(o.id),n.push({key:`split:${o.aId}|${o.bId}`,aId:o.aId,bId:o.bId,axis:o.axis||"y",ratio:o.ratio||.5}))}),n}function Rv(e,t,i){const n=F.find(l=>l.id===e)||{id:e,name:e},a=n.type?Ee(n.type,!1):Z(n.id||e),r=zp(n),o=document.createElement("div");return o.className="recent-app-card",o.dataset.appId=e,o.dataset.idx=String(t),o.dataset.pw=String(i.previewW),o.dataset.ph=String(i.previewH),o.style.width=`${i.previewW}px`,o.style.height=`${i.totalH}px`,o.innerHTML=`
    <div class="recent-card-header">
      <div class="recent-card-icon">${a}</div>
      <span class="recent-card-title">${n.name}</span>
      <button class="recent-card-close" data-app-id="${e}" title="关闭任务">
        ${Wt.close}
      </button>
    </div>
    <div class="recent-card-preview">
      <div class="recent-viewport-scaler" style="width:${i.baseW}px;height:${i.baseH}px;transform:translate(-50%,-50%) scale(${i.scale.toFixed(4)});">
        ${r}
      </div>
    </div>
  `,o}function Hv(e,t,i){const n=F.find(x=>x.id===e.aId)||{id:e.aId,name:e.aId},a=F.find(x=>x.id===e.bId)||{id:e.bId,name:e.bId},r=n.type?Ee(n.type,!1):Z(n.id),o=a.type?Ee(a.type,!1):Z(a.id),l=6,c=e.axis==="x",d=c?(i.previewW-l)/2:i.previewW,u=c?i.previewH:(i.previewH-l)/2,f=Math.max(d/i.baseW,u/i.baseH),m=c?"left:0;top:50%;transform:translate(0,-50%)":"left:50%;top:0;transform:translate(-50%,0)",h=c?"left:100%;top:50%;transform:translate(-100%,-50%)":"left:50%;top:100%;transform:translate(-50%,-100%)",v=(x,E)=>`
    <div style="flex:1;position:relative;overflow:hidden;background:var(--md-surface,#121418);min-width:0;min-height:0;">
      <div class="recent-viewport-scaler" style="${E} scale(${f.toFixed(4)});width:${i.baseW}px;height:${i.baseH}px;">
        ${zp(x)}
      </div>
    </div>`,y=document.createElement("div");return y.className="recent-app-card recent-split-card",y.dataset.appId=e.key,y.dataset.splitApps=`${e.aId}|${e.bId}`,y.dataset.idx=String(t),y.dataset.pw=String(i.previewW),y.dataset.ph=String(i.previewH),y.style.width=`${i.previewW}px`,y.style.height=`${i.totalH}px`,y.innerHTML=`
    <div class="recent-card-header">
      <div class="recent-card-icon" style="display:flex;align-items:center;">${r}</div>
      <div class="recent-card-icon" style="margin-left:-8px;box-shadow:0 0 0 2px var(--md-surface-container,rgba(24,30,36,0.98));">${o}</div>
      <span class="recent-card-title">${n.name} + ${a.name}</span>
      <button class="recent-card-close" title="关闭分屏组">
        ${Wt.close}
      </button>
    </div>
    <div class="recent-card-preview" style="display:flex;flex-direction:${c?"row":"column"};gap:${l}px;">
      ${v(n,m)}
      ${v(a,h)}
    </div>
  `,y}const hn=new WeakMap;function ni(e,t=null,i=null){const n=document.querySelectorAll(".recent-app-card");if(!n.length)return;const a=i&&i.paintMode||"full",r=Ap().stepPx;n.forEach((o,l)=>{let c=hn.get(o);if(c||(c={dismissing:!1},hn.set(o,c)),o.classList.contains("card-dismissing")){if(o!==t){c.dismissing=!0;return}c={dismissing:!1},hn.set(o,c)}else c.dismissing&&(c={dismissing:!1},hn.set(o,c));const d=l-e,u=Math.abs(d),f=d*r,m=Math.max(.74,1-.11*u),h=I(-d*12,-28,28),v=`translate3d(${f.toFixed(1)}px, 0px, ${(-u*40).toFixed(1)}px) scale(${m.toFixed(3)}) rotateY(${h.toFixed(1)}deg)`;c.transform!==v&&(o.style.transform=v,c.transform=v);const y=Math.round(100-u*12);c.zIndex!==y&&(o.style.zIndex=y,c.zIndex=y);const x=I(1-.2*u,.38,1).toFixed(2);if(c.opacity!==x&&(o.style.opacity=x,c.opacity=x),a==="full"){const b=Math.max(0,(u-.45)*2.5),k=Math.round(b);c.blur!==k&&(o.style.filter=k>.2?`blur(${k}px)`:"none",c.blur=k)}if(a==="full"){const b=u<.35?"focus":u<1.2?"near":"far";c.shadowTier!==b&&(o.style.boxShadow=b==="focus"?"0 24px 60px rgba(0, 0, 0, 0.65), 0 0 0 1.5px var(--md-primary, #7DF8DB)":`0 ${b==="near"?18:14}px ${b==="near"?48:36}px rgba(0, 0, 0, ${b==="near"?"0.42":"0.22"})`,c.shadowTier=b)}const E=u<1.2;c.pe!==E&&(o.style.pointerEvents=E?"auto":"none",c.pe=E)})}function Nv(){const e=document.querySelectorAll(".recent-app-card");let t=!1;e.forEach(i=>{i.classList.contains("card-dismissing")||(i.style.transition="",i.style.opacity="",hn.delete(i),t=!0)}),t&&ni(G)}let Ei=0,pc=0,uc=!1;function qv(e,t=!1){pc=e,uc=t,!Ei&&(Ei=requestAnimationFrame(()=>{Ei=0,ni(pc,null,{paintMode:uc?"compositor":"full"})}))}function Vv(){const e=document.getElementById("recentCardsDeck");if(!e)return;e.addEventListener("pointerdown",i=>{if(U.length===0||i.target.closest(".recent-card-close"))return;if(He&&(cancelAnimationFrame(He),He=null),$=(i.target.closest?i.target.closest(".recent-app-card"):null)||typeof document.elementsFromPoint=="function"&&document.elementsFromPoint(i.clientX,i.clientY).find(a=>a.classList&&a.classList.contains("recent-app-card"))||null,$){const a=parseInt($.dataset.idx,10);Ia=Number.isFinite(a)?a:-1}else Ia=-1;Ma=!0,mi=!1,ys=i.clientX,ws=i.clientY,xs=i.clientX,bs=i.clientY,Ss=performance.now(),ks=0,Es=0,cc=G,dn=0;try{e.setPointerCapture(i.pointerId)}catch{}}),e.addEventListener("pointermove",i=>{if(!Ma)return;const n=performance.now(),a=Math.max(1,n-Ss);ks=(i.clientX-xs)/a,Es=(i.clientY-bs)/a,xs=i.clientX,bs=i.clientY,Ss=n;const r=i.clientX-ys,o=i.clientY-ws;if(!mi&&$&&o<-12&&Math.abs(o)>Math.abs(r)*1.2&&(mi=!0),mi&&$){dn=Math.min(0,o);const d=Ia-G,u=d*215,f=Math.max(.74,1-.11*Math.abs(d)),m=I(-d*12,-28,28),h=Math.min(1,Math.abs(dn)/300),v=Math.max(0,1-h*.8);$.style.transform=`translate3d(${u.toFixed(1)}px, ${dn.toFixed(1)}px, 0px) scale(${f.toFixed(3)}) rotateY(${m.toFixed(1)}deg)`,$.style.opacity=v.toFixed(2);return}const l=Math.max(0,U.length-1),c=cc-r/dc;c<0?G=c*.35:c>l?G=l+(c-l)*.35:G=c,qv(G,!0)});const t=i=>{if(!Ma)return;Ma=!1;const n=i.clientX-ys,a=i.clientY-ws,r=Math.max(0,U.length-1);if(mi&&$)if(mi=!1,(dn<-75||Es<-.32)&&Ia!==-1){if(Hr(20),$.classList.contains("recent-split-card")&&$.dataset.splitApps){const[c,d]=$.dataset.splitApps.split("|");Op(c,d)}else{const c=$.dataset.appId;rl($,()=>{Xa(c),Dp(c)})}return}else{$.classList.add("card-dismissing"),ni(G,$),setTimeout(()=>{$&&$.classList.remove("card-dismissing")},250);return}if(Math.abs(n)<8&&Math.abs(a)<8&&$){if($.classList.contains("recent-split-card")){const u=parseInt($.dataset.idx,10),f=Number.isFinite(u)?u:Math.round(G),m=Math.round(G);if(f===m){navigator.vibrate&&navigator.vibrate(12);const h=$.getBoundingClientRect(),v=$.dataset.splitApps,[y,x]=v?v.split("|"):[],E=typeof window<"u"&&window.__splitInfo?window.__splitInfo():{active:!1};$.style.opacity="0",document.querySelectorAll(`.recent-app-card:not([data-app-id="${$.dataset.appId}"])`).forEach(k=>{k.style.transition="opacity 0.22s ease, transform 0.22s ease",k.style.opacity="0",k.style.transform+=" scale(0.92)"}),E.active&&(E.appAId===y&&E.appBId===x||E.appAId===x&&E.appBId===y)?we():ce(()=>import("./split-screen-DuIsKdlP.js"),[],import.meta.url).then(k=>{let M=.5;try{const P=JSON.parse(localStorage.getItem("ios-desktop:split-groups")||"[]").find(A=>A.aId===y&&A.bId===x||A.aId===x&&A.bId===y);P&&typeof P.ratio=="number"&&(M=P.ratio)}catch{}k.enterSplit({appAId:y,appBId:x,rectA:h,rectB:h,ratio:M,replaceActive:!0}),setTimeout(()=>{we(),$.style.opacity="1"},280)}).catch(()=>{we(),$.style.opacity="1"})}else ki=f,_n();return}const l=parseInt($.dataset.idx,10),c=Math.round(G),d=document.getElementById("recentAppsOverlay");if(d&&d.classList.contains("split-picking")){const u=$.dataset.appId;ce(()=>import("./split-screen-DuIsKdlP.js"),[],import.meta.url).then(f=>{const m=f.handleCardPick(u,$);if(d.classList.remove("split-picking"),m){const h=document.querySelector(`.recent-app-card[data-app-id="${m.appAId}"]`);h&&(h.style.opacity="0"),$&&($.style.opacity="0"),we(),f.enterSplit(m)}else we()}).catch(()=>{});return}if(l===c){const u=$.dataset.appId;Wv(u,$);return}else{ki=l,_n();return}}const o=G-ks*.0018*dc;ki=Math.round(I(o,0,r)),_n()};e.addEventListener("pointerup",t),e.addEventListener("pointercancel",t)}function _n(e=null){He&&cancelAnimationFrame(He);const t=performance.now(),i=G,n=ki,a=n-i,r=Math.min(380,Math.max(200,Math.abs(a)*180));function o(l){const c=l-t,d=Math.min(1,c/r),u=1-Math.pow(1-d,4);G=i+a*u,ni(G,null,{paintMode:"compositor"}),d<1?He=requestAnimationFrame(o):(G=n,ni(n),He=null,e&&e())}He=requestAnimationFrame(o)}function Wv(e,t){const i=F.findIndex(c=>c.id===e);if(i===-1)return;pr().active&&Fv();const n=t.getBoundingClientRect();t.style.opacity="0",document.querySelectorAll(`.recent-app-card:not([data-app-id="${e}"])`).forEach(c=>{c.style.transition="opacity 0.24s cubic-bezier(0.2, 0, 0, 1), transform 0.24s cubic-bezier(0.2, 0, 0, 1)",c.style.opacity="0",c.style.transform+=" scale(0.92)"});const r=document.getElementById("recentActionsRow");r&&(r.style.transition="opacity 0.18s ease, transform 0.18s ease",r.style.opacity="0",r.style.transform="translateY(16px)"),navigator.vibrate&&navigator.vibrate(15),H(i,null,n,{skipCloseRecents:!0});const o=document.getElementById("appWindow");o&&(o.style.zIndex="760");const l=document.getElementById("windowShadowLayer");l&&(l.style.zIndex="759"),setTimeout(()=>{we(),t.style.opacity="1",r&&(r.style.transition="",r.style.opacity="",r.style.transform="")},260)}function rl(e,t,i=220){e&&(e.classList.add("card-dismissing"),e.style.transform="translate3d(0, -135%, 0) scale(0.68)",e.style.opacity="0"),setTimeout(t,i)}function $p(){if(U.length===0){Nr();return}document.getElementById("recentCardsDeck")?.querySelectorAll(".recent-app-card").forEach((t,i)=>{t.dataset.idx=String(i)}),G=I(G,0,Math.max(0,U.length-1)),ki=Math.round(G),ni(G),_n()}function Dp(e){U=U.filter(n=>n!==e);const t=document.getElementById("recentCardsDeck");if(!t)return;const i=t.querySelector(`.recent-app-card[data-app-id="${e}"]`);i&&i.remove(),$p()}function Gv(e){const t=document.querySelector(`.recent-app-card[data-app-id="${e}"]`);Hr(20),rl(t,()=>{Xa(e),Dp(e)})}function Op(e,t){const i=`split:${e}|${t}`,n=document.querySelector(`.recent-app-card[data-app-id="${i}"]`);Hr(20),rl(n,()=>{Lp(),Xa(e),Xa(t),ce(()=>Promise.resolve().then(()=>k0),void 0,import.meta.url).then(a=>{const r=[e,t].sort().join("|");a.removeSplitGroup(r)}).catch(()=>{}),U=U.filter(a=>a!==e&&a!==t),n&&n.parentNode&&n.remove(),$p()})}function rt(e=null){const t=document.getElementById("recentAppsOverlay");if(!t)return;const i=pr().active,n=e||(s.isOpen&&s.currentApp?s.currentApp.id:null),a=s.isOpen&&!i&&!!n;if(n&&Fp(n),G=0,ki=0,Nr(),Nv(),t.classList.add("active"),pr().active&&window.__splitSuspend){const d=document.querySelector(".recent-app-card.recent-split-card");d&&(d.style.opacity="0"),window.__splitSuspend(d?d.getBoundingClientRect():null,()=>{d&&(d.style.opacity="1")})}let r=null;const o=a?document.querySelector(`.recent-app-card[data-app-id="${n}"]`):null;if(o){const d=o.getBoundingClientRect();d.width>80&&d.height>80&&(r=d)}if(a){const d=Array.from(document.querySelectorAll(".recent-app-card")).filter(u=>u!==o);d.forEach(u=>{u.dataset.restingTransform=u.style.transform||"",u.style.transition="none",u.style.opacity="0",u.style.transform=(u.style.transform||"")+" scale(0.85) translate3d(0, 32px, -80px)"}),o&&(o.style.opacity="0"),r?Fd(r,()=>{o&&(o.style.opacity="1")}):wt(0,0,-1.4),requestAnimationFrame(()=>{d.forEach((u,f)=>{const m=Math.min(f*45,180);u.style.transition=`transform 0.42s cubic-bezier(0.18, 0.98, 0.28, 1) ${m}ms, opacity 0.35s ease ${m}ms`,u.style.opacity="1",u.style.transform=u.dataset.restingTransform||"",setTimeout(()=>{u.style.transition="",delete u.dataset.restingTransform},460+m)})})}else s.isOpen&&wt(0,-400,-2);const l=document.getElementById("recentCardsDeck");l&&!a&&(l.style.opacity="0",l.style.transform="translate3d(0, 30px, -120px) scale(0.92)",requestAnimationFrame(()=>{l.style.transition="transform 0.32s cubic-bezier(0.2, 0.95, 0.25, 1.02), opacity 0.25s ease",l.style.opacity="1",l.style.transform="translate3d(0, 0, 0) scale(1)",setTimeout(()=>{l.style.transition="",l.style.transform="",l.style.opacity=""},340)}));const c=document.getElementById("recentActionsRow");c&&(c.style.opacity="0",c.style.transform="translateY(16px)",setTimeout(()=>{c.style.transition="opacity 0.26s cubic-bezier(0.2, 0.9, 0.3, 1), transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1)",c.style.opacity="1",c.style.transform="translateY(0)",setTimeout(()=>{c.style.transition=""},280)},120)),_n(),navigator.vibrate&&navigator.vibrate([15,35])}function we(){const e=document.getElementById("recentAppsOverlay");if(e&&(e.classList.remove("active"),e.classList.contains("split-picking")&&(e.classList.remove("split-picking"),ce(()=>import("./split-screen-DuIsKdlP.js"),[],import.meta.url).then(t=>t.cancelPickMode()).catch(()=>{}))),window.__splitResume){const t=document.querySelector(".recent-app-card.recent-split-card");window.__splitResume(t?t.getBoundingClientRect():null)}He&&(cancelAnimationFrame(He),He=null),Ei&&(cancelAnimationFrame(Ei),Ei=0)}const io=Object.freeze(Object.defineProperty({__proto__:null,closeRecentApps:we,getRecentAppsList:Pp,initRecentApps:Bp,openRecentApps:rt,recordAppOpened:Fp,renderRecentCards:Nr},Symbol.toStringTag,{value:"Module"})),Rp=new Map;function Xv(e,t){!t||typeof t.canBack!="function"||typeof t.triggerBack!="function"||Rp.set(e,t)}function Hp(){if(!s.isOpen||s.isClosing||!s.currentApp||typeof window<"u"&&window.__splitInfo&&window.__splitInfo().active)return null;const e=Rp.get(s.currentApp.id);if(!e)return null;try{if(!e.canBack())return null}catch{return null}return e}let no=0,Ve=!1,Gn=!1,Mn=!1,it=null,te=null;const mt={ENGAGE_PX:32,DOMINANCE:1.45,COMMIT_PX:62,COMMIT_VEL:520,DRAG_GAIN:.42,FAR_CROSS:160,FAR_GAIN:.16},w={active:!1,moved:!1,armTimer:0,fromDesktop:!1,fromBottomDrag:!1,dir:1,startX:0,startY:0,lastX:0,lastT:0,vx:0,lastTx:0,hintEl:null,rafId:0,pend:null,lastOpacity:-1,hintDir:0,grabInit:!1,grabOffsetX:0,grabOffsetScale:0};let ur=!1;try{if(typeof matchMedia=="function"){const e=matchMedia("(prefers-reduced-motion: reduce)");ur=!!e.matches,e.addEventListener?.("change",t=>{ur=!!t.matches})}}catch{}function qr(){return!!(p.appWindow&&p.appWindow.classList.contains("open"))}function sl(){if(document.body.classList.contains("is-locked")||de())return!1;const e=document.getElementById("recentAppsOverlay");if(e&&e.classList.contains("active")||typeof window<"u"&&window.__splitInfo&&window.__splitInfo().active||s.isClosing)return!1;const t=s.drag.active&&s.gestureType==="BOTTOM";return!(s.isDragging&&!t||s.isOpen&&qr()&&!t&&Math.abs(s.scaleSpring.x-1)>.02)}function Np(e){const t=Pp();if(!t.length)return null;if(!s.isOpen||!s.currentApp||!qr()){const o=t[0],l=F.findIndex(c=>c.id===o);return l===-1?null:{appId:o,idx:l,entryFromLeft:e>0}}const i=t.indexOf(s.currentApp.id),n=i===-1?0:i,a=e>0?t[n+1]:t[n-1];if(!a)return null;const r=F.findIndex(o=>o.id===a);return r===-1?null:{appId:a,idx:r,entryFromLeft:e>0}}const jv='<svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="color:var(--md-on-surface-variant,#9a9b9e);"><path d="M14 8 30 24 14 40"/></svg>';function Yv(){if(w.hintEl&&w.hintEl.isConnected)return w.hintEl;const e=document.createElement("div");return e.id="quickSwitchHint",e.className="quick-switch-hint",e.setAttribute("aria-hidden","true"),e.innerHTML=`
    <div class="qsh-card">
      <div class="qsh-icon" data-app=""></div>
      <div class="qsh-meta">
        <div class="qsh-label"></div>
        <div class="qsh-name"></div>
      </div>
    </div>
  `,document.body.appendChild(e),w.hintEl=e,e}function Uv(){if(w.dir===w.hintDir&&w.hintEl&&w.hintEl.isConnected)return;w.hintDir=w.dir;const e=Np(w.dir),t=Yv();t.classList.remove("leaving"),t.classList.toggle("from-left",w.dir>0),t.classList.toggle("edge",!e);const i=t.querySelector(".qsh-icon"),n=t.querySelector(".qsh-label"),a=t.querySelector(".qsh-name");if(e){const r=F[e.idx];i.dataset.app!==e.appId&&(i.innerHTML=r.type?Ee(r.type,!1):Z(e.appId),i.dataset.app=e.appId),n.textContent=w.fromDesktop?"最近应用":w.dir>0?"上一应用":"下一应用",a.textContent=r?r.name:e.appId}else i.dataset.app!=="__edge__"&&(i.innerHTML=jv,i.dataset.app="__edge__"),n.textContent="",a.textContent="已到应用列表边缘"}function qp(){const e=w.hintEl;w.hintEl=null,w.hintDir=0,w.lastOpacity=-1,e&&(e.classList.add("leaving"),e.style.opacity="0",setTimeout(()=>{try{e.remove()}catch{}},240))}function Vp(){if(!w.pend)return;const e=w.pend;if(w.pend=null,!w.fromDesktop&&p.appWindow){const t=ur?`translate3d(${e.tx.toFixed(1)}px, 0px, 0px)`:`translate3d(${e.tx.toFixed(1)}px, 0px, 0px) rotateY(${(-w.dir*2.4*e.prog).toFixed(2)}deg) scale(${e.scale.toFixed(3)})`;p.appWindow.style.transform=t}if(w.hintEl){const t=Math.round(e.opacity*100)/100;t!==w.lastOpacity&&(w.hintEl.style.opacity=t.toFixed(2),w.lastOpacity=t)}}function Wp(){w.rafId&&(cancelAnimationFrame(w.rafId),w.rafId=0),w.pend&&Vp()}function ol(e,t){return w.active?!0:sl()?(w.active=!0,w.fromDesktop=!s.isOpen||!qr(),w.fromBottomDrag=s.gestureType==="BOTTOM_SWITCH"||s.drag.active,w.dir=1,w.startX=e,w.startY=t,w.lastX=e,w.lastT=performance.now(),w.vx=0,w.lastTx=0,w.moved=!1,w.grabInit=!1,w.grabOffsetX=0,w.grabOffsetScale=0,w.rafId=0,w.pend=null,w.lastOpacity=-1,w.hintDir=0,Qn(),p.gestureBarContainer&&p.gestureBarContainer.classList.add("switching"),navigator.vibrate&&navigator.vibrate(6),clearTimeout(w.armTimer),w.armTimer=setTimeout(()=>{w.active&&!w.moved&&Gp()},400),!0):!1}function Gp(){w.active&&(w.active=!1,clearTimeout(w.armTimer),Wp(),p.gestureBarContainer&&p.gestureBarContainer.classList.remove("switching"),qp(),p.appWindow&&!w.fromDesktop&&w.lastTx!==0&&(p.appWindow.style.transition="transform 0.3s cubic-bezier(0.22, 1.05, 0.28, 1)",p.appWindow.style.transform="translate3d(0px, 0px, 0px)",setTimeout(()=>{p.appWindow&&p.appWindow.style.transition&&(p.appWindow.style.transition="",w.active||(p.appWindow.style.transform=""))},340)),s.gestureType==="BOTTOM_SWITCH"&&(s.gestureType="BOTTOM"))}function fr(e,t){if(!w.active)return;w.moved||(w.moved=!0,clearTimeout(w.armTimer));const i=e-w.startX,n=t-w.startY;if(Math.abs(n)>28&&Math.abs(n)>Math.abs(i)*1.2){Gp();return}const a=performance.now(),r=Math.max(1,a-w.lastT),o=1-Math.exp(-r/50);w.vx+=o*((e-w.lastX)/r*1e3-w.vx),w.lastX=e,w.lastT=a,w.dir=i>=0?1:-1;const l=Math.abs(i),c=Math.min(l,mt.FAR_CROSS)*mt.DRAG_GAIN,d=Math.max(0,l-mt.FAR_CROSS)*mt.FAR_GAIN;let u=Math.sign(i)*(c+d);const f=I(Math.abs(u)/110,0,1);let m=ur?1:1-.012*f;if(!w.fromDesktop){if(!w.grabInit){w.grabInit=!0;const y=s.iconCX+s.posSpring.px-window.innerWidth/2;w.grabOffsetX=y-u,w.grabOffsetScale=s.scaleSpring.x-m}const v=I(1-Math.max(0,l-mt.ENGAGE_PX)/150,0,1);u+=w.grabOffsetX*v,m=Math.max(.05,m+w.grabOffsetScale*v),w.lastTx=u}const h=I(l/130,0,1);w.pend={tx:u,scale:m,prog:f,opacity:.25+.75*h},w.rafId||(w.rafId=requestAnimationFrame(()=>{w.rafId=0,Vp()})),Uv()}function Xp(){if(!w.active)return;w.active=!1,clearTimeout(w.armTimer),Wp(),p.gestureBarContainer&&p.gestureBarContainer.classList.remove("switching"),qp();const e=w.lastX-w.startX,t=e>=0?1:-1,i=Math.abs(e)>mt.COMMIT_PX||Math.abs(w.vx)>mt.COMMIT_VEL,n=Np(t);if(s.lastGestureMoved=!0,s.lastGestureEndedAt=performance.now(),i&&n){const a=window.innerWidth,r=window.innerHeight,o=Math.round(a*.52),l=Math.round(r*.52),c=Math.round((r-l)/2),d=n.entryFromLeft?{left:-Math.round(a*.3),top:c,width:o,height:l}:{left:Math.round(a*.78),top:c,width:o,height:l},u=n.entryFromLeft?{left:Math.round(a*1.1),top:c,width:o,height:l}:{left:-Math.round(a*.62),top:c,width:o,height:l};navigator.vibrate&&navigator.vibrate(12),H(n.idx,null,d,{prevExitRect:u,prevOffsetX:w.fromDesktop?0:w.lastTx});return}i&&!n&&navigator.vibrate&&navigator.vibrate([8,34]),p.appWindow&&!w.fromDesktop&&w.lastTx!==0?(p.appWindow.style.transition="transform 0.36s cubic-bezier(0.22, 1.05, 0.28, 1)",p.appWindow.style.transform="translate3d(0px, 0px, 0px)",setTimeout(()=>{p.appWindow&&p.appWindow.style.transition&&(p.appWindow.style.transition="",p.appWindow.style.transform="")},400)):p.appWindow&&!w.fromDesktop&&(p.appWindow.style.transition="",p.appWindow.style.transform="")}function Kv(e,t,i){s.drag.history.push({x:e,y:t,t:i}),s.drag.history.length>6&&s.drag.history.shift()}function jp(){const e=s.drag.history;if(e.length<2)return{vx:0,vy:0};let t=0,i=0,n=0;for(let a=e.length-1;a>0;a--){const r=(e[a].t-e[a-1].t)/1e3;r<=0||(t+=(e[a].x-e[a-1].x)/r,i+=(e[a].y-e[a-1].y)/r,n++)}return n?{vx:t/n,vy:i/n}:{vx:0,vy:0}}function fc(e,t){if(Ve)return;const i=performance.now()-no;if(e<=40||e>=t)return;const{vx:n,vy:a}=jp(),r=Math.hypot(n,a);(i>110&&r<450||i>200||e>50&&a>-180)&&(Ve=!0,navigator.vibrate&&navigator.vibrate([15,35]))}function mc(e,t,i,n){const a=window.innerHeight*Lv;return e>a||t>Av||i<-220||n>35&&i<-120||n>90}function qi(e,t,i=null){if(document.body.classList.contains("is-locked")||de())return;if(w.active||Qn(),(i==="BOTTOM"||!i&&t>window.innerHeight-75)&&(!s.isOpen||!qr())&&!s.isClosing&&!s.isDragging){const c=document.getElementById("themePickerOverlay"),d=!!(c&&c.classList.contains("active")),u=!!(typeof window<"u"&&window.__splitInfo&&window.__splitInfo().active);if(!d&&!u&&ol(e,t))return}Mn=!1,it=null;const a=window.innerWidth,r=window.innerHeight;if(!s.isOpen||s.isClosing||s.isDragging){const c=document.getElementById("themePickerOverlay");if(!(!!(c&&c.classList.contains("active"))&&!s.isDragging&&!s.isClosing)){const u=typeof window<"u"?window.__splitGestures:null;if(s.isDragging||s.isClosing||!u||!u.active()||i!=="BOTTOM"&&t<=r-75||Gn)return;Gn=!0,s.gestureType="BOTTOM",no=performance.now(),Ve=!1,s.drag={active:!0,startX:e,startY:t,offsetX:0,offsetY:0,history:[{x:e,y:t,t:performance.now()}]},s.isDragging=!0,navigator.vibrate&&navigator.vibrate(8);return}}if(i)s.gestureType=i;else if(t>r-75)s.gestureType="BOTTOM";else if(e<oc)s.gestureType="EDGE_LEFT";else if(e>a-oc)s.gestureType="EDGE_RIGHT";else if(t>r-Tv)s.gestureType="BOTTOM";else return;if(s.gestureType==="EDGE_LEFT"||s.gestureType==="EDGE_RIGHT"){if(it=Yf(),Mn=!!it,Mn)it.beginGesture(s.gestureType==="EDGE_LEFT"?1:-1);else if(s.navHistory.length<=1){const c=Hp();if(c&&typeof c.beginGesture=="function")te={kind:"module",def:c},c.beginGesture();else{const d=Rd();d&&d.canBack&&(te={kind:"iframe",win:d.win},qn(d.win,{type:"PB_GESTURE",phase:"begin"}))}}}const o=s.iconCX+s.posSpring.px,l=s.iconCY+s.posSpring.py;no=performance.now(),Ve=!1,s.drag={active:!0,startX:e,startY:t,offsetX:o-e,offsetY:l-t,history:[{x:e,y:t,t:performance.now()}],startSubP:s.navHistory.length>1?I(s.subpageSpring.x,0,1):1},s.isDragging=!0,p.appWindow&&p.appWindow.classList.add("dragging"),s.gestureType==="BOTTOM"?p.triggerZone.classList.add("active"):s.gestureType==="EDGE_LEFT"?p.edgeLeft.classList.add("active"):s.gestureType==="EDGE_RIGHT"&&p.edgeRight.classList.add("active"),s.rafId&&!Td()&&(cancelAnimationFrame(s.rafId),s.rafId=null)}function Vr(e,t){if(w.active){fr(e,t);return}if(de()){s.drag.active&&(s.drag.active=!1,s.isDragging=!1,p.triggerZone.classList.remove("active"),p.edgeLeft.classList.remove("active"),p.edgeRight.classList.remove("active"),te&&(te.kind==="iframe"?qn(te.win,{type:"PB_GESTURE",phase:"end",commit:!1,vx:0}):typeof te.def.endGesture=="function"&&te.def.endGesture(!1,0),te=null));return}if(!s.drag.active)return;Kv(e,t,performance.now());const i=window.innerWidth,n=window.innerHeight;if(Gn&&s.gestureType==="BOTTOM"){const a=s.drag.startY-t;fc(a,window.innerHeight*.7),window.__splitGestures&&window.__splitGestures.nudge(a);return}if(s.gestureType==="BOTTOM"){if(!w.active){const f=e-s.drag.startX,m=s.drag.startY-t;if(Math.abs(f)>mt.ENGAGE_PX&&Math.abs(f)>Math.abs(m)*mt.DOMINANCE&&!Ve&&sl()&&(Go(),p.triggerZone.classList.remove("active"),ol(s.drag.startX,s.drag.startY))){s.gestureType="BOTTOM_SWITCH",fr(e,t);return}}const a=e+s.drag.offsetX,r=t+s.drag.offsetY,o=Math.hypot(e-s.drag.startX,t-s.drag.startY),l=s.drag.startY-t,c=n*Cv,d=1-o/c,u=I(d,-.3,1.2);fc(l,n*.7),Ve&&p.triggerZone.classList.add("holding-recents"),s.posSpring.x.x=a-s.iconCX,s.posSpring.x.v=0,s.posSpring.x.target=a-s.iconCX,s.posSpring.y.x=r-s.iconCY,s.posSpring.y.v=0,s.posSpring.y.target=r-s.iconCY,s.scaleSpring.x=u,s.scaleSpring.v=0,s.scaleSpring.target=u,Fa(u,a,r,{syncRadial:!0});return}if(s.gestureType==="EDGE_LEFT"||s.gestureType==="EDGE_RIGHT"){if(Mn&&it){const o=s.gestureType==="EDGE_LEFT"?e-s.drag.startX:s.drag.startX-e;it.progressGesture(o);return}if(te){const o=s.gestureType==="EDGE_LEFT"?e-s.drag.startX:s.drag.startX-e;te.kind==="iframe"?qn(te.win,{type:"PB_GESTURE",phase:"progress",dx:o}):typeof te.def.progressGesture=="function"&&te.def.progressGesture(o);return}const a=s.gestureType==="EDGE_LEFT"?e-s.drag.startX:s.drag.startX-e,r=Math.max(0,a);if(s.navHistory.length>1){const o=I(r/(i*.85),0,1),l=I(s.drag.startSubP-o,0,1);s.popInProgress=!1,s.subpageSpring.x=l,s.subpageSpring.v=0,s.subpageSpring.target=l,Fa(0,0,0,{forceSub:!0,main:!1})}else{const o=r/(i*.5),l=I(1-o*.35,.65,1),c=i/2+(e-s.drag.startX)*.3,d=n/2+(t-s.drag.startY)*.15;s.posSpring.x.x=c-s.iconCX,s.posSpring.y.x=d-s.iconCY,s.scaleSpring.x=l,Fa(l,c,d,{syncRadial:!0})}}}function ea(){if(p.appWindow&&p.appWindow.classList.remove("dragging"),w.active&&Xp(),!s.drag.active)return;s.drag.active=!1,s.isDragging=!1,p.triggerZone.classList.remove("active"),p.edgeLeft.classList.remove("active"),p.edgeRight.classList.remove("active"),s.gestureType!=="BOTTOM_SWITCH"&&Go();const{vx:e,vy:t}=jp(),i=Math.hypot(e,t),n=s.drag.history[s.drag.history.length-1]||{x:0,y:0},a=s.drag.history[0]||n,r=Math.hypot(n.x-a.x,n.y-a.y),o=a.y-n.y;if(s.lastGestureMoved=r>12,s.lastGestureEndedAt=performance.now(),Gn&&s.gestureType==="BOTTOM"){if(Gn=!1,s.gestureType="NONE",Ve){Ve=!1,rt();return}window.__splitGestures&&(mc(r,i,t,o)?window.__splitGestures.dismiss():window.__splitGestures.rebound());return}if(s.gestureType==="BOTTOM_SWITCH"){s.gestureType="NONE";return}if(s.gestureType==="BOTTOM"){if(p.triggerZone.classList.remove("holding-recents"),Ve||s.isOpen&&o>50&&t>-300&&i<520){Ve=!1;const l=s.currentApp?s.currentApp.id:null;rt(l),s.gestureType="NONE";return}if(mc(r,i,t,o)){const l=I(e*lc,-_a,_a),c=I(t*lc,-_a,_a),d=I(-i*Bv,-10,0);wt(l,c,d)}else{const l=window.innerWidth/2-s.iconCX,c=window.innerHeight/2-s.iconCY;s.posSpring.setTarget(l,c,e*.2,t*.2),s.scaleSpring.setTarget(1,i*.002),Di(1),Be(hl)}s.gestureType="NONE";return}if(s.gestureType==="EDGE_LEFT"||s.gestureType==="EDGE_RIGHT"){if(it){Mn=!1;const u=s.gestureType==="EDGE_LEFT"?n.x-a.x:a.x-n.x,f=window.innerWidth,m=u>f*.5||i>400&&u>30,h=s.gestureType==="EDGE_LEFT"?e:-e;m?it.commitGesture(h):it.cancelGesture(h),it=null,s.gestureType="NONE";return}if(te){const u=s.gestureType==="EDGE_LEFT"?n.x-a.x:a.x-n.x,f=window.innerWidth,m=u>f*.25||i>400&&u>30,h=s.gestureType==="EDGE_LEFT"?e:-e;te.kind==="iframe"?qn(te.win,{type:"PB_GESTURE",phase:"end",commit:m,vx:h}):typeof te.def.endGesture=="function"&&te.def.endGesture(m,h),te=null,s.gestureType="NONE";return}const l=s.gestureType==="EDGE_LEFT"?n.x-a.x:a.x-n.x,c=window.innerWidth,d=l>c*.25||i>400&&l>30;if(s.navHistory.length>1){const u=s.gestureType==="EDGE_LEFT"?e:-e,f=I(-u/c,-4,4);d?On(f):(s.popInProgress=!1,s.subpageSpring.setTarget(1,f),Be())}else if(d)wt(e*.2,t*.2,-i*.002);else{const u=window.innerWidth/2-s.iconCX,f=window.innerHeight/2-s.iconCY;s.posSpring.setTarget(u,f,0,0),s.scaleSpring.setTarget(1,0),Di(1),Be(hl)}s.gestureType="NONE"}}function Qv(){const e=p.gestureBarContainer||document.getElementById("gestureBarContainer");e&&(typeof window<"u"&&!window.__qsDebug&&(window.__qsDebug=()=>({active:w.active,eligible:sl(),gestureType:s.gestureType,dragActive:s.drag.active,isDragging:s.isDragging,isClosing:s.isClosing,isOpen:s.isOpen,scale:Number(s.scaleSpring.x.toFixed(4)),recentPause:Ve,pullPanels:de(),recentsActive:!!(document.getElementById("recentAppsOverlay")||{}).classList?.contains?.("active")||!!(document.getElementById("recentAppsOverlay")&&document.getElementById("recentAppsOverlay").classList.contains("active"))})),e.addEventListener("pointerdown",t=>{qi(t.clientX,t.clientY,"BOTTOM")}),e.addEventListener("touchstart",t=>{t.touches&&t.touches[0]&&(t.preventDefault(),t.stopPropagation(),qi(t.touches[0].clientX,t.touches[0].clientY,"BOTTOM"))},{passive:!1}))}let In=[],De=0,fe=[];function Jv(){Zv(),t0(),e0()}function Zv(){In=[],F.forEach((t,i)=>{In.push({type:"app",id:t.id,title:t.name,sub:"系统应用",iconType:t.type,action:n=>{if(n&&n.width>0)H(i,null,n);else{const a=document.querySelector(`[data-id="${t.id}"]`);H(i,a)}},keywords:[t.name,t.id]})}),[{title:"手电筒 / Torch",sub:"开关屏幕照明",iconKey:"torch",action:()=>{const t=document.querySelector('[data-tile-id="torch"]');t&&t.click()},keywords:["手电筒","torch","light","照明","闪光灯"]},{title:"深色模式 / Dark theme",sub:"切换系统色彩主题",iconKey:"darktheme",action:()=>{const t=document.querySelector('[data-tile-id="darktheme"]');t&&t.click()},keywords:["深色模式","暗黑模式","dark","theme","夜间模式"]},{title:"壁纸与样式 / Wallpaper",sub:"自定义 Material You 配色与壁纸",iconKey:"colour_correction",action:()=>{window.openThemePicker&&window.openThemePicker()},keywords:["壁纸","主题","样式","wallpaper","theme","color","颜色"]},{title:"省电模式 / Battery Saver",sub:"降低设备功耗",iconKey:"battery_saver",action:()=>{const t=document.querySelector('[data-tile-id="battery_saver"]');t&&t.click()},keywords:["省电","电池","battery","power"]},{title:"播放/暂停电台音乐",sub:"全局流媒体播放控制",iconKey:"song_search",action:()=>Le.togglePlay(),keywords:["音乐","电台","播放","play","music","radio","audio","暂停"]},{title:"屏幕录制 / Screen Record",sub:"开始/停止屏幕录制",iconKey:"screen_record",action:()=>{const t=document.querySelector('[data-tile-id="screen_record"]');t&&t.click()},keywords:["录屏","录制","screen record","video"]}].forEach(t=>{In.push({type:"action",title:t.title,sub:t.sub,iconKey:t.iconKey,action:t.action,keywords:t.keywords})})}function _s(e){if(!e||e.dataset.swipeAware==="1")return;e.dataset.swipeAware="1";let t=0,i=0,n=!1,a=!1,r=!1;const o=()=>{n=!1,a=!1,r=!1};e.addEventListener("click",c=>{r&&(c.stopImmediatePropagation(),c.preventDefault(),r=!1)},!0),e.addEventListener("mousedown",c=>{t=c.clientX,i=c.clientY,n=!0,a=!1,r=!1}),window.addEventListener("mousemove",c=>{if(!n)return;const d=c.clientX-t,u=c.clientY-i;(Math.abs(d)>8||Math.abs(u)>8)&&(r=!0),!a&&Math.abs(d)>12&&Math.abs(d)>Math.abs(u)*1.15&&(a=!0,ja(t)),a&&Pi(c.clientX)}),window.addEventListener("mouseup",c=>{if(!n)return;if(n=!1,a){a=!1,vi();return}const d=c.clientY-i;i>window.innerHeight-90&&d<-45&&(r=!0,rt())}),e.addEventListener("touchstart",c=>{const d=c.touches[0];d&&(t=d.clientX,i=d.clientY,n=!0,a=!1,r=!1)},{passive:!0}),e.addEventListener("touchmove",c=>{if(!n)return;const d=c.touches[0];if(!d)return;const u=d.clientX-t,f=d.clientY-i;(Math.abs(u)>8||Math.abs(f)>8)&&(r=!0),!a&&Math.abs(u)>12&&Math.abs(u)>Math.abs(f)*1.15&&(a=!0,ja(t)),a&&(Pi(d.clientX),c.cancelable&&c.preventDefault())},{passive:!1});const l=c=>{if(!n)return;if(n=!1,a){a=!1,vi();return}const d=c.changedTouches&&c.changedTouches[0],u=d?d.clientY-i:0;i>window.innerHeight-90&&u<-45&&(r=!0,rt())};e.addEventListener("touchend",l,{passive:!0}),e.addEventListener("touchcancel",()=>{a&&(a=!1,vi()),o()},{passive:!0})}function e0(){const e=document.getElementById("desktopSearchWidget");e&&e.remove();const t=document.createElement("div");t.id="desktopSearchWidget",t.className="desktop-search-pill",t.innerHTML=`
    <div class="search-pill-left">
      <span class="search-g-logo">G</span>
      <span class="search-placeholder">搜索应用、联系人、设置、即时计算...</span>
    </div>
    <div class="search-pill-right">
      <button class="search-icon-btn mic-btn" title="语音助手">${g.mic_access}</button>
      <button class="search-icon-btn lens-btn" title="智慧镜头">${g.google_lens}</button>
    </div>
  `,t.querySelector(".search-pill-left").addEventListener("click",i=>{i.stopPropagation(),gn()}),t.querySelector(".mic-btn").addEventListener("click",i=>{i.stopPropagation(),gn();const n=document.getElementById("globalSearchInput");n&&(n.placeholder="正在聆听语音指令...",setTimeout(()=>{n.placeholder.includes("聆听")&&(n.placeholder="输入应用名称、计算式或功能...")},3e3))}),t.querySelector(".lens-btn").addEventListener("click",i=>{if(i.stopPropagation(),F.find(a=>a.id==="camera")){const a=F.findIndex(o=>o.id==="camera"),r=document.querySelector('[data-id="camera"]');H(a,r)}else gn()}),t.addEventListener("click",()=>{gn()}),_s(t.querySelector(".search-pill-left")),_s(t.querySelector(".mic-btn")),_s(t.querySelector(".lens-btn")),document.body.appendChild(t)}function t0(){let e=document.getElementById("pixelSearchOverlay");if(e)return;e=document.createElement("div"),e.id="pixelSearchOverlay",e.className="pixel-search-overlay",e.innerHTML=`
    <div class="search-modal-card">
      <div class="search-input-box">
        <span class="search-input-icon">${g.search}</span>
        <input type="text" id="globalSearchInput" placeholder="输入应用名称、计算式或功能..." autocomplete="off">
        <button class="search-clear-btn" id="searchClearBtn" style="display:none;">${g.close}</button>
      </div>

      <!-- 快捷标签推荐 -->
      <div class="search-quick-chips" id="searchQuickChips">
        <button class="search-chip" data-query="2048">${g.star} 纸牌接龙</button>
        <button class="search-chip" data-query="信息">${g.chat} 角色消息</button>
        <button class="search-chip" data-query="相机">${g.photo_camera} 拍照录像</button>
        <button class="search-chip" data-query="壁纸">${g.palette} 壁纸样式</button>
        <button class="search-chip" data-query="手电筒">${g.torch} 手电筒</button>
      </div>

      <!-- 搜索结果列表 -->
      <div class="search-results-list" id="searchResultsList"></div>
    </div>
  `,e.addEventListener("click",n=>{n.target===e&&Up()}),document.body.appendChild(e);const t=document.getElementById("globalSearchInput"),i=document.getElementById("searchClearBtn");t.addEventListener("input",n=>{const a=n.target.value.trim();i.style.display=a?"flex":"none",Oa(a)}),i.addEventListener("click",()=>{t.value="",i.style.display="none",t.focus(),Oa("")}),e.querySelectorAll(".search-chip").forEach(n=>{n.addEventListener("click",()=>{const a=n.dataset.query;t.value=a,i.style.display="flex",Oa(a),t.focus()})}),t.addEventListener("keydown",n=>{if(n.key==="ArrowDown")n.preventDefault(),fe.length>0&&(De=(De+1)%fe.length,gc());else if(n.key==="ArrowUp")n.preventDefault(),fe.length>0&&(De=(De-1+fe.length)%fe.length,gc());else if(n.key==="Enter"&&(n.preventDefault(),fe[De])){const r=document.querySelectorAll(".search-result-item")[De],o=r&&r.querySelector(".search-item-icon")?.getBoundingClientRect()||null;Yp(fe[De],o)}})}function Oa(e){if(!document.getElementById("searchResultsList"))return;if(fe=[],De=0,!e){fe=In.slice(0,6),hc(fe,"为你推荐");return}if(/^[\d\s\+\-\*\/\(\)\.\^%]+$/.test(e)&&/[\+\-\*\/\^%]/.test(e))try{const n=e.replace(/\^/g,"**"),a=Function(`'use strict'; return (${n})`)();typeof a=="number"&&!isNaN(a)&&fe.push({type:"calc",title:`${e} = ${a}`,sub:"即时数学计算结果 (按 Enter 复制)",iconText:g.calculator,action:()=>{navigator.clipboard.writeText(String(a)),window.showSystemToast&&window.showSystemToast(`已复制计算结果: ${a}`,g.content_copy)}})}catch{}const i=e.toLowerCase();In.forEach(n=>{(n.keywords.some(r=>r.toLowerCase().includes(i))||n.title.toLowerCase().includes(i))&&fe.push(n)}),fe.push({type:"web",title:`在 Google 中搜索 “${e}”`,sub:"打开网页搜索",iconText:g.language,action:()=>{window.open(`https://www.google.com/search?q=${encodeURIComponent(e)}`,"_blank")}}),hc(fe,`找到 ${fe.length} 个结果`)}function hc(e,t){const i=document.getElementById("searchResultsList");if(i){if(e.length===0){i.innerHTML='<div class="search-empty">未找到相关结果</div>';return}i.innerHTML=`
    <div class="search-section-title">${t}</div>
    <div class="search-items-wrap">
      ${e.map((n,a)=>`
        <div class="search-result-item ${a===De?"selected":""}" data-idx="${a}">
          <div class="search-item-icon">
            ${n.type==="app"?n.iconType?Ee(n.iconType,!1):Z(n.id):n.iconKey?g[n.iconKey]:n.iconText||g.auto_awesome}
          </div>
          <div class="search-item-info">
            <div class="search-item-title">${n.title}</div>
            <div class="search-item-sub">${n.sub}</div>
          </div>
          <span class="search-item-enter">${g.corner_down_left}</span>
        </div>
      `).join("")}
    </div>
  `,i.querySelectorAll(".search-result-item").forEach(n=>{n.addEventListener("click",()=>{const a=parseInt(n.dataset.idx,10);if(e[a]){const r=n.querySelector(".search-item-icon")?.getBoundingClientRect()||null;Yp(e[a],r)}})})}}function gc(){document.querySelectorAll(".search-result-item").forEach((t,i)=>{t.classList.toggle("selected",i===De),i===De&&t.scrollIntoView({block:"nearest"})})}function Yp(e,t=null){Up(),e&&e.action&&setTimeout(()=>e.action(t),50)}function gn(){const e=document.getElementById("pixelSearchOverlay"),t=document.getElementById("globalSearchInput");!e||!t||(e.classList.add("active"),t.value="",document.getElementById("searchClearBtn").style.display="none",Oa(""),setTimeout(()=>t.focus(),80))}function Up(){const e=document.getElementById("pixelSearchOverlay");e&&e.classList.remove("active")}function i0(){document.body.style.textRendering="optimizeLegibility",document.documentElement.style.webkitFontSmoothing="antialiased",window.addEventListener("keydown",e=>{if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"){e.key==="Escape"&&e.target.blur();return}if(e.key==="Escape"){const t=document.getElementById("pixelSearchOverlay");if(t&&t.classList.contains("active")){t.classList.remove("active");return}const i=document.getElementById("themePickerOverlay");if(i&&i.classList.contains("active")){window.__closeThemePickerAnimated?window.__closeThemePickerAnimated():i.classList.remove("active");return}const n=document.getElementById("recentAppsOverlay");if(n&&n.classList.contains("active")){window.__closeRecentApps?window.__closeRecentApps():n.classList.remove("active");return}const a=document.getElementById("pullPanelsOverlay");if(a&&a.classList.contains("active")){Ie();return}const r=document.getElementById("appContextMenu");if(r&&r.classList.contains("active")){r.classList.remove("active");return}if(s.isOpen){wt(0,-600,-2);return}}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"||e.key==="/"){e.preventDefault(),gn();return}if(e.code==="Space"&&!s.isOpen){e.preventDefault(),Le.togglePlay();return}s.isOpen||(e.key==="ArrowLeft"?Xe(s.currentPage-1):e.key==="ArrowRight"&&Xe(s.currentPage+1))}),document.addEventListener("visibilitychange",()=>{const e=document.hidden;document.querySelectorAll("iframe").forEach(t=>{try{t.contentWindow.postMessage({type:"SYSTEM_VISIBILITY_CHANGE",hidden:e},"*")}catch{}})})}const Kp="ios-desktop:pinned-cities";let xe=[],Ms=null;function n0(){try{const e=localStorage.getItem(Kp);if(e){const t=JSON.parse(e);if(Array.isArray(t))return t.filter(i=>i&&typeof i.name=="string"&&typeof i.offset=="number")}}catch{}return[]}function Qp(){try{localStorage.setItem(Kp,JSON.stringify(xe))}catch{}}function a0(e){const t=new Date;return new Date(t.getTime()+t.getTimezoneOffset()*6e4+e*36e5)}function r0(e){const t=e.getHours();return`${t>=12?"下午":"上午"} ${t%12||12}:${String(e.getMinutes()).padStart(2,"0")}`}function ll(){const e=document.getElementById("glanceCitiesRow");if(e){if(!xe.length){e.style.display="none",e.innerHTML="";return}e.style.display="flex",e.innerHTML=xe.map(t=>`
    <div class="glance-chip glance-city-chip" data-city-id="${t.id}" title="点击打开时钟">
      <span class="glance-chip-icon" style="color:var(--md-primary,#a8c7fa);">${g.push_pin}</span>
      <span class="glance-chip-text" data-city-time>${t.name} · --:--</span>
      <span class="glance-city-unpin" data-unpin-id="${t.id}" title="取消钉选" style="opacity:.55;cursor:pointer;">${g.close}</span>
    </div>
  `).join(""),e.querySelectorAll(".glance-city-chip").forEach(t=>{t.addEventListener("click",i=>{i.stopPropagation();const n=i.target.closest("[data-unpin-id]")?.getAttribute("data-unpin-id");if(n){Zp(n,!0);return}vn("clock_app")})}),Jp()}}function Jp(){xe.forEach(e=>{const t=document.querySelector(`.glance-city-chip[data-city-id="${e.id}"] [data-city-time]`);t&&(t.textContent=`${e.name} · ${r0(a0(e.offset))}`)})}function s0(e){if(!(!e||!e.id||xe.some(t=>t.id===e.id))){if(xe.length>=6){window.showSystemToast&&window.showSystemToast("最多钉选 6 个城市，请先取消一个",g.push_pin);return}xe.push({id:e.id,name:e.name,country:e.country||"",offset:e.offset}),Qp(),ll(),ar("clock/pins-changed",{pins:xe,__silent:!0},""),window.showSystemToast&&window.showSystemToast(`已把「${e.name}」钉到桌面`,g.push_pin)}}function Zp(e,t){const i=xe.find(n=>n.id===e);xe=xe.filter(n=>n.id!==e),Qp(),ll(),ar("clock/pins-changed",{pins:xe,__silent:!0},""),t&&i&&window.showSystemToast&&window.showSystemToast(`已取消钉选「${i.name}」`,g.push_pin)}function o0(){xe=n0(),$a("clock/pin-city",e=>s0(e)),$a("clock/unpin-city",e=>Zp(e&&e.id,!1)),$a("clock/request-pins",()=>{Ce("clock_app","clock/pins",{pins:xe,__silent:!0},"")}),ll(),Ms&&clearInterval(Ms),Ms=setInterval(Jp,3e4)}let pt={temp:26,condition:"晴朗",icon:g.weather_sunny,aqi:"优质 32"};const l0={0:{desc:"晴朗",icon:g.weather_sunny},1:{desc:"晴朗",icon:g.weather_partly},2:{desc:"多云",icon:g.weather_partly},3:{desc:"阴天",icon:g.weather_cloudy},45:{desc:"有雾",icon:g.weather_fog},48:{desc:"雾凇",icon:g.weather_fog},51:{desc:"小雨",icon:g.weather_drizzle},61:{desc:"小雨",icon:g.weather_rain},63:{desc:"中雨",icon:g.weather_rain},65:{desc:"大雨",icon:g.weather_rain},71:{desc:"小雪",icon:g.weather_snow},73:{desc:"大雪",icon:g.weather_snow},95:{desc:"雷阵雨",icon:g.weather_thunder}};function c0(){p0(),Le.subscribe(u0),d0(),o0()}async function d0(){try{let e=39.9042,t=116.4074;if(navigator.geolocation)try{const n=await new Promise((a,r)=>{navigator.geolocation.getCurrentPosition(a,r,{timeout:2e3})});n&&n.coords&&(e=n.coords.latitude,t=n.coords.longitude)}catch{}const i=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${e}&longitude=${t}&current=temperature_2m,weather_code&timezone=auto`);if(i.ok){const n=await i.json();if(n&&n.current){const a=n.current.weather_code||0,r=l0[a]||{desc:"多云",icon:g.weather_partly};pt.temp=Math.round(n.current.temperature_2m),pt.condition=r.desc,pt.icon=r.icon;const o=document.getElementById("glanceWeatherBtn");o&&(o.innerHTML=`
            <span class="glance-weather-icon">${pt.icon}</span>
            <span class="glance-weather-temp">${pt.temp}°C</span>
            <span class="glance-weather-cond">${pt.condition}</span>
          `)}}}catch(e){console.log("Glance weather sync:",e)}}function p0(){const e=document.getElementById("pixelAtAGlance");e&&e.remove();const t=document.createElement("div");t.id="pixelAtAGlance",t.className="pixel-at-a-glance";const i=new Date,n=["周日","周一","周二","周三","周四","周五","周六"],a=["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],r=`${n[i.getDay()]}, ${a[i.getMonth()]}${i.getDate()}日`;t.innerHTML=`
    <div class="glance-main-row">
      <div class="glance-date" id="glanceDateText">${r}</div>
      <div class="glance-weather" id="glanceWeatherBtn" title="查看详细天气">
        <span class="glance-weather-icon">${pt.icon}</span>
        <span class="glance-weather-temp">${pt.temp}°C</span>
        <span class="glance-weather-cond">${pt.condition}</span>
      </div>
    </div>
    <div class="glance-sub-row" id="glanceSubRow">
      <div class="glance-chip" id="glanceScheduleChip">
        <span class="glance-chip-icon">${g.calendar_month}</span>
        <span class="glance-chip-text">下午 3:00 - 项目架构与矢量动效评审</span>
      </div>
      <div class="glance-chip music-chip" id="glanceMusicChip" style="display:none;">
        <span class="glance-chip-icon">${g.music_note}</span>
        <span class="glance-chip-text" id="glanceMusicText">正在播放</span>
      </div>
    </div>
    <div class="glance-sub-row" id="glanceCitiesRow" style="display:none;"></div>
  `,t.querySelector("#glanceDateText").addEventListener("click",l=>{l.stopPropagation(),vn("cal_app")}),t.querySelector("#glanceScheduleChip").addEventListener("click",l=>{l.stopPropagation(),vn("cal_app")}),t.querySelector("#glanceWeatherBtn").addEventListener("click",l=>{l.stopPropagation(),vn("weather")}),t.querySelector("#glanceMusicChip").addEventListener("click",l=>{l.stopPropagation(),vn("music")});const o=document.getElementById("desktop");o&&o.insertBefore(t,o.firstChild)}function u0(e){const t=document.getElementById("glanceMusicChip"),i=document.getElementById("glanceMusicText"),n=document.getElementById("glanceScheduleChip");!t||!i||(e.isPlaying&&e.track?(t.style.display="inline-flex",i.textContent=`${e.track.title} • ${e.track.artist}`,n&&(n.style.display="none")):(t.style.display="none",n&&(n.style.display="inline-flex")))}function vn(e){const t=F.findIndex(i=>i.id===e);if(t!==-1){const i=document.querySelector(`[data-id="${e}"]`);H(t,i)}}let J=null;const f0={msg:[{title:"快速会话",icon:g.chat,action:(e,t)=>H(e,t)},{title:"角色切换",icon:g.auto_awesome,action:(e,t)=>{H(e,t),setTimeout(()=>{const i=document.querySelector(".page-iframe");i&&i.contentWindow.postMessage({type:"QUICK_SWITCH_ROLE"},"*")},500)}}],camera:[{title:"自拍模式",icon:g.photo_camera,action:(e,t)=>H(e,t)},{title:"录制视频",icon:g.videocam,action:(e,t)=>H(e,t)}],settings:[{title:"壁纸与样式",icon:g.palette,action:()=>{window.openThemePicker&&window.openThemePicker()}},{title:"电池健康",icon:g.battery_saver,action:(e,t)=>H(e,t)}],notes:[{title:"新建便签",icon:g.edit,action:(e,t)=>H(e,t)}],calculator:[{title:"即时计算",icon:g.calculator,action:(e,t)=>H(e,t)}]};function eu(){m0(),window.addEventListener("pointerdown",e=>{J&&J.classList.contains("active")&&!J.contains(e.target)&&Tn()})}function m0(){J=document.createElement("div"),J.id="appContextMenu",J.className="app-context-menu",document.body.appendChild(J)}function h0(e,t,i,n){if(!J||!e)return;const a=F.findIndex(f=>f.id===e.id),r=f0[e.id]||[];J.innerHTML=`
    <div class="menu-header">
      <div class="menu-header-icon">${Z(e.id)}</div>
      <div class="menu-header-title">${e.name}</div>
    </div>

    ${r.length>0?`
      <div class="menu-shortcuts-list">
        ${r.map((f,m)=>`
          <div class="menu-item shortcut-item" data-shortcut-idx="${m}">
            <span class="menu-item-icon">${f.icon}</span>
            <span class="menu-item-text">${f.title}</span>
          </div>
        `).join("")}
      </div>
      <div class="menu-divider"></div>
    `:""}

    <div class="menu-system-actions">
      <div class="menu-item action-open">
        <span class="menu-item-icon">${g.launch}</span>
        <span class="menu-item-text">打开应用</span>
      </div>
      <div class="menu-item action-edit">
        <span class="menu-item-icon">${g.edit}</span>
        <span class="menu-item-text">编辑主屏幕 (重排图标)</span>
      </div>
    </div>
  `,J.querySelectorAll(".shortcut-item").forEach(f=>{f.addEventListener("click",m=>{m.stopPropagation(),Tn();const h=parseInt(f.dataset.shortcutIdx,10);r[h]&&r[h].action&&r[h].action(a,t)})}),J.querySelector(".action-open").addEventListener("click",f=>{f.stopPropagation(),Tn(),H(a,t)}),J.querySelector(".action-edit").addEventListener("click",f=>{f.stopPropagation(),Tn(),zo()}),J.style.visibility="hidden",J.classList.add("active");const o=200,l=J.offsetHeight||180,c=window.innerWidth;let d=i-o/2,u=n-l-12;u<60&&(u=n+20),d<16&&(d=16),d+o>c-16&&(d=c-o-16),J.style.left=`${d}px`,J.style.top=`${u}px`,J.style.visibility="visible",navigator.vibrate&&navigator.vibrate([15,30,15])}function Tn(){J&&J.classList.remove("active")}const g0=Object.freeze(Object.defineProperty({__proto__:null,closeContextMenu:Tn,initContextMenu:eu,showContextMenu:h0},Symbol.toStringTag,{value:"Module"})),tu="ios-desktop:split-groups",v0=4;let le=[],iu=!1;function ao(e,t){return[e,t].sort().join("|")}function vc(e){return e.type?Ee(e.type,!1):Z(e.id)}function Vi(e){return F.find(t=>t.id===e)||null}function y0(){le=[];try{const e=JSON.parse(localStorage.getItem(tu)||"[]");if(!Array.isArray(e))return;const t=new Set;for(const i of e){if(!i||typeof i!="object")continue;const n=String(i.aId||""),a=String(i.bId||"");if(!Vi(n)||!Vi(a)||n===a)continue;const r=ao(n,a);t.has(r)||(t.add(r),le.push({id:r,aId:n,bId:a,ratio:Math.min(.76,Math.max(.24,Number(i.ratio)||.5)),axis:i.axis==="x"?"x":"y",ts:Number(i.ts)||Date.now()}))}}catch{le=[]}}function nu(){try{localStorage.setItem(tu,JSON.stringify(le))}catch{}}function au(){return le.slice()}function cl(e){return le.find(t=>t.id===e)||null}function w0(e,t,i=.5,n="y",a={}){const r=Vi(e),o=Vi(t);let l=null;if(r&&o&&e!==t){const c=ao(e,t),d=le.find(u=>u.id===c);d?(d.ratio=Math.min(.76,Math.max(.24,Number(i)||.5)),d.axis=n==="x"?"x":"y",d.ts=Date.now(),le=le.filter(u=>u.id!==c),le.unshift(d)):(le.length>=v0&&(l=le.pop()),le.unshift({id:c,aId:e,bId:t,ratio:Math.min(.76,Math.max(.24,Number(i)||.5)),axis:n==="x"?"x":"y",ts:Date.now()})),nu(),Wr({silent:!!a.silentRender})}return{group:cl(ao(e,t)),evicted:l}}function ru(e){const t=le.length;return le=le.filter(i=>i.id!==e),le.length!==t?(nu(),Wr(),!0):!1}function x0(e,t){const i=Vi(e),n=Vi(t);return!i||!n?"":`<span class="sgi sgi-a">${vc(i)}</span><span class="sgi sgi-b">${vc(n)}</span>`}function b0(e){return null}function Wr(e={}){const t=document.getElementById("desktop");if(t){t.classList.remove("has-split-tray");const i=document.getElementById("splitGroupTray");i&&i.remove()}}function su(){y0(),iu=!0,Wr()}function S0(){return iu}typeof window<"u"&&(window.__splitGroups={list:au,get:cl,remove:ru});const k0=Object.freeze(Object.defineProperty({__proto__:null,buildPairIconHTML:x0,getChipRect:b0,getSplitGroup:cl,initSplitGroups:su,isSplitGroupsBooted:S0,listSplitGroups:au,removeSplitGroup:ru,renderTray:Wr,saveSplitGroup:w0},Symbol.toStringTag,{value:"Module"})),ou="ios-desktop:profiles",lu="ios-desktop:active-profile";let Ra=!1;function E0(){const e=Ct();if(e)return{kind:"procedural",id:e};const t=Af();return t?t.startsWith("blob:")||t.startsWith("data:")?{kind:"custom"}:{kind:"preset",url:t}:{kind:"preset",url:Yc}}function ro(){const e=t=>JSON.parse(JSON.stringify(t||[]));return{hue:Pf()||215,themeMode:Lo()||"dark",wallpaper:E0(),pagesApps:e(s.pagesApps),removedApps:e(s.removedApps),dnd:document.body.classList.contains("dnd-mode-active")}}function _0(){try{const e=localStorage.getItem(ou);if(e){const t=JSON.parse(e);if(t&&t.personal&&t.work)return t}}catch{}return null}function cu(e){try{localStorage.setItem(ou,JSON.stringify(e))}catch{}}function M0(){try{return localStorage.getItem(lu)||"personal"}catch{return"personal"}}function du(e){try{localStorage.setItem(lu,e)}catch{}}function I0(){const e={id:"personal",name:"个人",...ro()},t={id:"work",name:"工作",...ro(),hue:155,themeMode:"dark",wallpaper:{kind:"preset",url:"https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80"}},i={personal:e,work:t};return cu(i),du("personal"),i}function T0(e){if(!(!e||e.kind==="custom")){if(e.kind==="procedural"&&e.id){Ai(),Bt();try{localStorage.removeItem("ios-desktop:wallpaper"),sessionStorage.removeItem("ios-desktop:wallpaper")}catch{}$n(e.id,{persist:!0,showToast:!1});return}if(e.kind==="preset"&&e.url){Ai(),Yn(),Bt();try{localStorage.setItem("ios-desktop:wallpaper",e.url)}catch{}document.getElementById("desktop").style.backgroundImage=`url('${e.url}')`,document.querySelectorAll("iframe").forEach(t=>{try{t.contentWindow.postMessage({type:"set-wallpaper",url:e.url},"*")}catch{}})}}}const yc="profile-anim-style";function pu(){if(document.getElementById(yc))return;const e=document.createElement("style");e.id=yc,e.textContent=`
    /* 壁纸交叉淡入层：置于桌面底层，铺新壁纸后淡入，与旧壁纸形成交叉溶解 */
    #profileWpFader {
      position: absolute; inset: 0; z-index: 0; pointer-events: none;
      background-size: cover; background-position: center;
      opacity: 0; transition: opacity 0.55s ease;
    }
    /* 主题色相渐变：过渡期内对颜色类属性做全局补间（不影响 transform 弹簧动画） */
    body.theme-morphing *, body.theme-morphing *::before, body.theme-morphing *::after {
      transition: background-color .5s ease, color .5s ease, border-color .5s ease, fill .5s ease, stroke .5s ease !important;
    }
    /* 图标弹簧重排：逐格错峰入场（delay 由 JS 按 slot 内序号写入） */
    @keyframes profileIconIn {
      from { opacity: 0; transform: scale(.55) translateY(16px); }
      to   { opacity: 1; transform: none; }
    }
    .profile-relayout .app-icon, .profile-relayout .app-folder {
      animation: profileIconIn .42s cubic-bezier(.2, .9, .25, 1.25) both;
    }
  `,document.head.appendChild(e)}function C0(e){const t=document.getElementById("desktop");if(!t||!e)return()=>{};pu();const i=document.createElement("div");return i.id="profileWpFader",i.style.backgroundImage=`url('${e}')`,t.insertBefore(i,t.firstChild),requestAnimationFrame(()=>requestAnimationFrame(()=>{i.style.opacity="1"})),()=>setTimeout(()=>i.remove(),650)}function L0(){const e=document.getElementById("desktopSlider")||document.querySelector(".desktop-slider");e&&(e.classList.add("profile-relayout"),e.querySelectorAll(".app-icon, .app-folder").forEach((t,i)=>{t.style.animationDelay=`${i%24*16}ms`}),setTimeout(()=>{e.classList.remove("profile-relayout"),e.querySelectorAll(".app-icon, .app-folder").forEach(t=>{t.style.animationDelay=""})},1100))}let ut=null,Je="personal";function A0(){ut=_0()||I0(),Je=M0(),ut[Je]||(Je="personal"),pu(),window.__profiles={toggle:()=>wc(Je==="personal"?"work":"personal"),switchTo:e=>wc(e),current:()=>Je,isSwitching:()=>Ra,list:()=>Object.values(ut).map(e=>({id:e.id,name:e.name,hue:e.hue,active:e.id===Je}))}}function wc(e){if(Ra||!ut||!ut[e]||e===Je)return;Ra=!0,ut[Je]={...ut[Je],...ro()},cu(ut);const t=ut[e];Je=e,du(e);const i=t.wallpaper&&t.wallpaper.kind==="preset"?t.wallpaper.url:"",n=i?C0(i):null;document.body.classList.add("theme-morphing"),T0(t.wallpaper),je(t.hue||215,!1),Xi(t.themeMode||"dark"),ii(!!t.dnd,{silent:!0});try{s.pagesApps=JSON.parse(JSON.stringify(t.pagesApps||s.pagesApps)),s.removedApps=JSON.parse(JSON.stringify(t.removedApps||[])),localStorage.setItem("ios-desktop:removed-apps",JSON.stringify(s.removedApps)),Ae(),st(),L0()}catch{}setTimeout(()=>{document.body.classList.remove("theme-morphing"),n&&n(),document.querySelectorAll("iframe").forEach(a=>{try{a.contentWindow.postMessage({type:"system-profile-changed",profile:e},"*")}catch{}}),We("profile"),ne(`已切换到「${t.name}」模式`),Ra=!1},560)}function B0(e){if(!e||e._m3Bound)return;e._m3Bound=!0;const t=e.querySelector('input[type="checkbox"]'),i=e.querySelector(".thumb"),n=e.querySelector(".slider");if(!t||!i||!n)return;let a=!1,r=0,o=0,l=!1,c=0,d=0,u=0,f=0,m=-1,h=-1,v=null;const y=2,E=22-y;function b(){i.style.top="50%",i.style.transform="translateY(-50%)",i.style.width="28px",i.style.height="28px",i.style.transition="none",n.style.transition="none"}function k(A){const N=I(A,0,1),B=y+N*E;Math.abs(B-h)>.05&&(h=B,i.style.left=`${B.toFixed(1)}px`);const W=N>=.5;W!==v&&(v=W,W?(n.style.background="var(--md-primary, #00875A)",n.style.borderColor="var(--md-primary, #00875A)",i.style.background="var(--md-on-primary, #ffffff)"):(n.style.background="var(--md-surface-container-highest, #e2e2e9)",n.style.borderColor="var(--md-outline, #74777f)",i.style.background="var(--md-outline, #74777f)"))}function M(){f&&(cancelAnimationFrame(f),f=0),m>=0&&(k(m),m=-1)}function L(){M(),h=-1,v=null,i.style.left="",i.style.top="",i.style.transform="",i.style.width="",i.style.height="",i.style.background="",i.style.transition="",n.style.background="",n.style.borderColor="",n.style.transition="",e.classList.remove("is-dragging")}e.addEventListener("click",A=>{A.detail>0&&A.target!==t&&A.preventDefault()}),e.addEventListener("pointerdown",A=>{if(!(A.button!==0&&A.button!==void 0)){a=!0,l=!1,r=A.clientX,c=A.clientX,d=performance.now(),u=0,o=t.checked?1:0;try{e.setPointerCapture(A.pointerId)}catch{}}}),e.addEventListener("pointermove",A=>{if(!a)return;const N=performance.now(),B=Math.max(1,N-d);u=.7*u+.3*((A.clientX-c)/B),c=A.clientX,d=N;const W=A.clientX-r;Math.abs(W)>3&&(l||(l=!0,e.classList.add("is-dragging"),b()),m=o+W/E,f||(f=requestAnimationFrame(()=>{f=0,m>=0&&(k(m),m=-1)})))});const P=A=>{if(a){a=!1;try{e.releasePointerCapture(A.pointerId)}catch{}if(l){M();const N=A.clientX-r;let B=o+N/E;u>.3?B=1:u<-.3&&(B=0);const W=B>=.5,Q=t.checked!==W;L(),Q&&(t.checked=W,t.dispatchEvent(new Event("change",{bubbles:!0})),navigator.vibrate&&navigator.vibrate(12))}else L(),t.checked=!t.checked,t.dispatchEvent(new Event("change",{bubbles:!0})),navigator.vibrate&&navigator.vibrate(8)}};e.addEventListener("pointerup",P),e.addEventListener("pointercancel",()=>{a=!1,L()})}function Cn(e=document){if(!e)return;e.querySelectorAll(".md3-switch").forEach(B0)}typeof window<"u"&&(window.__initM3Controls=e=>{Cn(e||document)},document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>Cn()):setTimeout(()=>Cn(),100));if(typeof window<"u"&&typeof MutationObserver<"u"){let e=!1;const t=n=>{for(const a of n)if(a.nodeType===1&&(a.matches&&a.matches(".md3-switch")||a.querySelector&&a.querySelector(".md3-switch")))return!0;return!1},i=new MutationObserver(n=>{for(const a of n)if(a.addedNodes&&a.addedNodes.length&&t(a.addedNodes)){if(e)return;e=!0,setTimeout(()=>{e=!1,Cn(document)},0);return}});document.body?i.observe(document.body,{childList:!0,subtree:!0}):document.addEventListener("DOMContentLoaded",()=>{i.observe(document.body,{childList:!0,subtree:!0})}),document.addEventListener("app-page-active",()=>{Cn(document)})}const mr=25,dl=5;let Ft=null,Pt=0,pl=0,_i=null,Mi=0,so=!1;function xc(e){e=Math.max(0,Math.floor(e));const t=Math.floor(e/60),i=e%60;return(t<10?"0"+t:t)+":"+(i<10?"0"+i:i)}function uu(){return Ft==="focus"?"专注 "+xc(Pt):Ft==="break"?"休息 "+xc(Pt):"番茄钟 · 专注"}function oo(e,t){try{rr({id:"focus-"+Date.now(),app:"番茄钟",appId:"focus",iconSvg:g.focus_mode,title:String(e||""),desc:String(t||""),time:"刚刚"})}catch{}}function lo(e){Ft=e,Pt=(e==="focus"?mr:dl)*60,pl=Date.now()+Pt*1e3,Rr("focus",{active:!0,sub:uu()})}function F0(){Ft==="focus"?(Mi++,ii(!1,{silent:!0}),lo("break"),We("notify"),oo("专注完成，休息一下","已完成 "+Mi+" 轮专注 · 休息 "+dl+" 分钟")):(ii(!0,{silent:!0}),lo("focus"),We("notify"),oo("休息结束，继续专注","第 "+(Mi+1)+" 轮 · "+mr+" 分钟"))}function P0(){if(Pt=Math.max(0,Math.round((pl-Date.now())/1e3)),Pt<=0){F0();return}Rr("focus",{sub:uu()})}function z0(){Ft&&co(!1),Mi=0,so=document.body.classList.contains("dnd-mode-active"),ii(!0,{silent:!0}),lo("focus"),_i&&clearInterval(_i),_i=setInterval(P0,1e3),ne("专注开始："+mr+" 分钟（已自动开启勿扰）",g.focus_mode),oo("专注模式已开启",mr+" 分钟专注 · "+dl+" 分钟休息")}function co(e){_i&&(clearInterval(_i),_i=null);const t=Mi;Ft=null,Pt=0,pl=0,ii(so,{silent:!0}),so=!1,Rr("focus",{active:!1,sub:"番茄钟 · 专注"}),e&&ne(t?"专注已结束，本轮共完成 "+t+" 轮":"专注已结束",g.focus_mode)}function $0(){window.__focus={onTileToggle:e=>{e?z0():co(!0)},isActive:()=>!!Ft,phase:()=>Ft,remaining:()=>Pt,cycles:()=>Mi,stop:()=>co(!1)}}const D0=[["ios-desktop:","__system"],["memos","notes"],["md3_groups","reminders"],["md3_tasks","reminders"],["flow11_best","flow11"],["android_clock_state","clock_app"],["pixel_camera_gallery","camera"],["translationHistory","translate"],["theme","translate"],["visited","translate"],["threes_hi","threes"],["threes_records","threes"],["dice_lab_stats","dice"],["m3-theme","threes"]],O0=[["wallpaper-blob","__system"],["font-blob","__system"],["font-name","__system"],["wallpaper-video-blob","__system"],["ios-desktop:wallpaper","__system"],["ios-desktop:font","__system"],["ios-desktop:font-name","__system"],["vfs:","files"],["vfs-meta:","files"]];function po(e){return(e||"").length*2}function bc(e,t){const i=String(e||"");for(const[n,a]of t)if(i===n||i.startsWith(n))return a;return"__other"}function R0(e){if(e==null)return 0;if(typeof e=="object"&&typeof e.size=="number"&&typeof e.type=="string")return e.size;try{return po(JSON.stringify(e))}catch{return 0}}function H0(e){return!e||e<0?"0 B":e<1024?`${e} B`:e<1024*1024?`${(e/1024).toFixed(1)} KB`:`${(e/1024/1024).toFixed(2)} MB`}async function N0(){const e=[];let t=0;try{for(let c=0;c<localStorage.length;c++){const d=localStorage.key(c);if(d===null)continue;const u=po(d)+po(localStorage.getItem(d));t+=u,e.push({key:d,bytes:u,owner:bc(d,D0)})}}catch{}e.sort((c,d)=>d.bytes-c.bytes);const i=[];let n=0,a=0;try{if(navigator.storage&&navigator.storage.estimate){const c=await navigator.storage.estimate();n=c.usage||0,a=c.quota||0}}catch{}if(me()){const c=await Jt();for(const d of c){const u=R0(d.value);i.push({key:String(d.key),bytes:u,owner:bc(d.key,O0)})}i.sort((d,u)=>u.bytes-d.bytes)}const r=new Map,o=(c,d)=>r.set(c,(r.get(c)||0)+d);e.forEach(c=>o(c.owner,c.bytes)),i.forEach(c=>o(c.owner,c.bytes));const l=Array.from(r.entries()).map(([c,d])=>({owner:c,bytes:d})).sort((c,d)=>d.bytes-c.bytes);return{ls:{total:t,keys:e.length,items:e},idb:{available:me(),usage:n,quota:a,entries:i},byOwner:l}}function q0(e){if(e==="__system")return"系统服务";if(e==="__other")return"其他数据";try{const t=window.__initialAppsRef;if(t&&Array.isArray(t)){const i=t.find(n=>n.id===e);if(i)return i.name}}catch{}return e}function V0(e){try{window.__initialAppsRef=e||null}catch{}window.__storageStats={collect:N0,formatBytes:H0,ownerDisplayName:q0}}const fu="ios-desktop:dev-fps",mu="ios-desktop:dev-no-anim";let se=null,Ii=null;function hu(e){try{return localStorage.getItem(e)==="1"}catch{return!1}}function gu(e,t){try{localStorage.setItem(e,t?"1":"0")}catch{}}const Is=60,W0=32;function vu(){if(Ii)return;if(!se){se=document.createElement("div"),se.id="devFpsOverlay",se.style.cssText=`
      position: fixed; top: 34px; left: 10px; z-index: 10100; pointer-events: none;
      background: rgba(20, 24, 22, 0.9); color: #7df8db;
      /* v7.7：移除 backdrop-filter —— 面板背后是每帧都在变化的动画画面，
         逐帧重算模糊会把自己的测量结果污染出 10~20 次/场的假卡顿 */
      font: 600 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums; padding: 6px 10px 7px; border-radius: 12px;
      border: 1px solid rgba(125, 248, 219, 0.25); box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    `;const d=document.createElement("div"),u=document.createElement("canvas");u.width=96,u.height=26,u.style.cssText="display:block; margin: 3px 0 2px; width:96px; height:26px;";const f=document.createElement("div");f.style.cssText="opacity: 0.85; font-size: 10.5px;",se.append(d,u,f),document.body.appendChild(se),se.__line1=d,se.__line2=f,se.__canvas=u}const e=se.__canvas.getContext("2d"),t=[];let i=0,n=0,a=0,r=performance.now(),o=r;const l=()=>{const d=se.__canvas.width,u=se.__canvas.height;e.clearRect(0,0,d,u);const f=t.length;if(!f)return;const m=d/Is,h=Math.max(1,m-1);for(let v=0;v<f;v++){const y=t[v],x=Math.max(1.5,Math.min(1,y/60)*(u-2));e.fillStyle=y>=55?"rgba(125,248,219,0.9)":y>=40?"rgba(255,196,80,0.9)":"rgba(255,105,97,0.95)",e.fillRect(d-(f-v)*m,u-x,h,x)}},c=d=>{const u=d-o;if(o=d,n++,a+=u,u>W0&&i++,d-r>=1e3){const f=Math.round(n*1e3/(d-r)),m=n?(a/n).toFixed(1):"0";t.push(f),t.length>Is&&t.shift();const h=i;t.length>=Is&&(i=0),se.__line1.textContent=`${f} FPS · ${m}ms/帧`;const v=performance.memory,y=v?` · 堆 ${(v.usedJSHeapSize/1048576).toFixed(1)}/${(v.jsHeapSizeLimit/1048576).toFixed(0)}MB`:"";se.__line2.textContent=`60秒内卡顿 ${h} 次${y}`,l(),n=0,a=0,r=d}Ii=requestAnimationFrame(c)};Ii=requestAnimationFrame(c)}function G0(){Ii&&(cancelAnimationFrame(Ii),Ii=null),se&&(se.remove(),se=null)}function X0(e){gu(fu,e),e?vu():G0()}function Sc(){return hu(fu)}const kc="dev-no-anim-style";function yu(e){let t=document.getElementById(kc);e?(t||(t=document.createElement("style"),t.id=kc,t.textContent=`
        html.no-anim *, html.no-anim *::before, html.no-anim *::after {
          transition: none !important; animation: none !important;
        }`,document.head.appendChild(t)),document.documentElement.classList.add("no-anim")):(document.documentElement.classList.remove("no-anim"),t&&t.remove())}function j0(e){gu(mu,e),yu(e)}function Ec(){return hu(mu)}function Y0(){try{localStorage.removeItem("ios-desktop:pages-apps"),localStorage.removeItem("ios-desktop:removed-apps"),localStorage.removeItem("ios-desktop:folders")}catch{}setTimeout(()=>location.reload(),120)}async function U0(){try{localStorage.clear()}catch{}try{sessionStorage.clear()}catch{}try{const{idbClearStore:e}=await ce(async()=>{const{idbClearStore:t}=await Promise.resolve().then(()=>Qu);return{idbClearStore:t}},void 0,import.meta.url);await e()}catch{}try{const e=await caches.keys();await Promise.all(e.map(t=>caches.delete(t)))}catch{}try{const e=await navigator.serviceWorker?.getRegistrations?.()||[];await Promise.all(e.map(t=>t.unregister()))}catch{}setTimeout(()=>location.reload(),200)}function K0(){yu(Ec()),Sc()&&vu(),window.__devOptions={setFpsEnabled:X0,isFpsEnabled:Sc,setNoAnimEnabled:j0,isNoAnimEnabled:Ec,getAnimSpeed:kr,setAnimSpeed:Pc,resetDesktopLayout:Y0,wipeAllData:U0}}const Lt="vfs:",ai="vfs-meta:",_c="ios-desktop:vfs-seeded",Q0={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp",svg:"image/svg+xml",bmp:"image/bmp",ico:"image/x-icon",mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",mp3:"audio/mpeg",wav:"audio/wav",ogg:"audio/ogg",m4a:"audio/mp4",aac:"audio/aac",flac:"audio/flac",txt:"text/plain",md:"text/markdown",json:"application/json",csv:"text/csv",html:"text/html",htm:"text/html",css:"text/css",js:"text/javascript",pdf:"application/pdf",zip:"application/zip"};function Fe(e){if(typeof e!="string")return null;let t=e.trim();if(!t)return null;t.startsWith("/")||(t="/"+t);const i=[];for(const n of t.split("/"))if(!(!n||n===".")){if(n===".."){i.pop();continue}i.push(n)}return"/"+i.join("/")}function ul(e){const t=e.lastIndexOf("/");return t<=0?"/":e.slice(0,t)}function Gt(e){const t=e.lastIndexOf("/");return t<0?e:e.slice(t+1)}function J0(e){const t=e.lastIndexOf(".");return t>0?e.slice(t+1).toLowerCase():""}function Ha(e){return Q0[J0(e)]||""}function wu(e,t){return e==="/"?!0:t===e||t.startsWith(e+"/")}function uo(e){try{return typeof Blob<"u"&&e instanceof Blob}catch{return!1}}async function Z0(e){try{return await(await fetch(e)).blob()}catch{}try{const t=e.indexOf(","),i=e.slice(0,t),n=e.slice(t+1),a=(/data:([^;,]+)/.exec(i)||[])[1]||"application/octet-stream",r=atob(n),o=new Uint8Array(r.length);for(let l=0;l<r.length;l++)o[l]=r.charCodeAt(l);return new Blob([o],{type:a})}catch{return null}}const V=new Map,Nt=new Map,Ln=new Map;let xu=null;const ey=new Promise(e=>{xu=e});function Gr(e){Nt.forEach((t,i)=>{wu(i,e.path)&&t.forEach(n=>{try{n(e)}catch{}})})}function hr(e){const t=Ln.get(e);if(t){try{URL.revokeObjectURL(t)}catch{}Ln.delete(e)}}async function fl(e){if(!e||e==="/")return!0;const t=e.split("/").filter(Boolean);let i="";for(const n of t){if(i+="/"+n,V.get(i)?.type==="dir")continue;if(V.get(i)?.type==="file")return!1;const a={path:i,name:n,type:"dir",mime:"",size:0,created:Date.now(),modified:Date.now(),owner:"",meta:null};if(!await ke(ai+i,a))return!1;V.set(i,a)}return!0}async function gr(e,t,i={}){if(e=Fe(e),!e||e==="/")return{ok:!1,error:"路径无效"};if(t==null)return{ok:!1,error:"内容为空"};const n=V.get(e);if(n&&n.type==="dir")return{ok:!1,error:"同名目录已存在"};if(!await fl(ul(e)))return{ok:!1,error:"父目录创建失败"};let a=t,r=i.mime||"",o=0;try{if(typeof a=="string"&&/^data:[^,]{0,120},/i.test(a.slice(0,140))){const d=await Z0(a);d&&(a=d)}uo(a)?(r=r||a.type||Ha(Gt(e))||"application/octet-stream",o=a.size):a instanceof ArrayBuffer?(r=r||Ha(Gt(e))||"application/octet-stream",o=a.byteLength,a=new Blob([a],{type:r})):typeof a!="string"&&(a=JSON.stringify(a,null,2)),typeof a=="string"&&(r=r||Ha(Gt(e))||"text/plain",o=a.length)}catch(d){return{ok:!1,error:"内容处理失败："+(d&&d.message?d.message:"未知错误")}}const l={path:e,name:Gt(e),type:"file",mime:r,size:o,created:n&&n.created||Date.now(),modified:Date.now(),owner:i.owner||n&&n.owner||"",meta:i.meta||null};return await ke(Lt+e,a)?(await ke(ai+e,l),hr(e),V.set(e,l),Gr({type:"write",path:e,entry:l}),{ok:!0,entry:l}):{ok:!1,error:"写入失败（IndexedDB 不可用）"}}async function Xr(e){if(e=Fe(e),!e)return null;const t=V.get(e);if(!t||t.type!=="file")return null;const i=await Qt(Lt+e);return i===null?null:typeof i=="string"?{...t,blob:null,text:i}:{...t,blob:i,text:null}}async function ty(e){const t=await Xr(e);if(!t)return null;if(t.text!==null)return t.text;try{return await t.blob.text()}catch{return null}}async function bu(e){const t=await Xr(e);return t?t.blob||new Blob([t.text||""],{type:t.mime||"text/plain"}):null}async function Su(e){if(e=Fe(e),!e)return null;if(Ln.has(e))return Ln.get(e);const t=await bu(e);if(!t)return null;try{const i=URL.createObjectURL(t);return Ln.set(e,i),i}catch{return null}}function ku(e){const t=Fe(e||"/");if(!t)return[];const i=[];return V.forEach(n=>{ul(n.path)===t&&i.push({...n})}),i.sort((n,a)=>n.type!==a.type?n.type==="dir"?-1:1:n.name.localeCompare(a.name,"zh-Hans-CN")),i}async function qt(e){return e=Fe(e),!e||e==="/"?{ok:!1,error:"路径无效"}:V.has(e)?V.get(e).type==="dir"?{ok:!0}:{ok:!1,error:"同名文件已存在"}:await fl(e)?(Gr({type:"write",path:e,entry:V.get(e)}),{ok:!0}):{ok:!1,error:"目录创建失败"}}function Eu(e){const t=Fe(e);return!!t&&V.has(t)}function _u(e){const t=Fe(e),i=t&&V.get(t);return i?{...i}:null}async function Mu(e){if(e=Fe(e),!e||e==="/")return{ok:!1,error:"根目录不可删除"};const t=[];if(V.forEach((n,a)=>{(a===e||a.startsWith(e+"/"))&&t.push(a)}),!t.length)return{ok:!0,removed:0};t.sort((n,a)=>a.length-n.length);let i=0;for(const n of t){const a=V.get(n);a&&a.type==="file"&&await yt(Lt+n),await yt(ai+n),hr(n),V.delete(n),i++}return Gr({type:"delete",path:e}),{ok:!0,removed:i}}async function Iu(e,t,i){if(e=Fe(e),t=Fe(t),!e||!t||e==="/")return{ok:!1,error:"路径无效"};if(t===e)return{ok:!0};if(t.startsWith(e+"/"))return{ok:!1,error:"不能移动/复制到自身内部"};if(!V.has(e))return{ok:!1,error:"源不存在"};let n=t;if((t==="/"||V.get(t)?.type==="dir")&&(n=(t==="/"?"":t)+"/"+Gt(e)),n===e)return{ok:!0,to:e};if(V.get(n)?.type==="file")return{ok:!1,error:"目标已存在同名文件"};if(V.get(n)?.type==="dir"&&V.get(e)?.type==="file")return{ok:!1,error:"目标已存在同名目录"};if(!await fl(ul(n)))return{ok:!1,error:"父目录创建失败"};const a=[];V.forEach((r,o)=>{(o===e||o.startsWith(e+"/"))&&a.push(o)});for(const r of a){const o=n+r.slice(e.length),l=V.get(r);if(!l)continue;if(l.type==="file"){const d=await Qt(Lt+r);d!==null&&await ke(Lt+o,d),i!=="copy"&&d!==null&&await yt(Lt+r),i!=="copy"&&hr(r)}const c={...l,path:o,name:Gt(o),modified:i==="copy"?l.modified:Date.now()};await ke(ai+o,c),i!=="copy"&&(await yt(ai+r),V.delete(r)),hr(o),V.set(o,c)}if(i==="copy")Gr({type:"write",path:n});else{const r=new Set,o=l=>{const c={type:"move",path:l,from:e,to:n};Nt.forEach((d,u)=>{wu(u,l)&&d.forEach(f=>{if(!r.has(f)){r.add(f);try{f(c)}catch{}}})})};o(e),o(n)}return{ok:!0,to:n}}function Tu(e,t){return Iu(e,t,"move")}function Cu(e,t){return Iu(e,t,"copy")}function iy(e,t){const i=Fe(e||"/");return!i||typeof t!="function"?()=>{}:(Nt.has(i)||Nt.set(i,new Set),Nt.get(i).add(t),()=>{const n=Nt.get(i);n&&(n.delete(t),n.size||Nt.delete(i))})}function Lu(){let e=0,t=0,i=0;const n=new Map;return V.forEach(a=>{if(a.type==="dir"){t++;return}e++,i+=a.size||0;const r="/"+(a.path.split("/").filter(Boolean)[0]||""),o=n.get(r)||{dir:r,files:0,bytes:0};o.files++,o.bytes+=a.size||0,n.set(r,o)}),{files:e,dirs:t,bytes:i,byDir:Array.from(n.values()).sort((a,r)=>r.bytes-a.bytes)}}function ny(e,t){let i=String(e??"").replace(/[\/\\]+/g,"_").trim();return(!i||/^\.+$/.test(i))&&(i="IMG_"+Date.now()+"_"+(t+1)+".jpg"),i}async function ay(){try{if(localStorage.getItem(_c))return;await qt("/photos"),await qt("/music"),await qt("/recordings"),await qt("/documents"),await qt("/downloads"),await gr("/documents/欢迎使用文件.txt",`这是安卓16极客的虚拟文件系统（VFS）。

· 所有应用产生的照片、录音、文档都会出现在这里，可浏览、重命名、删除、分享。
· 顶部「导入文件」可以把电脑里的真实文件拖进模拟器；「下载」可以把文件导出回电脑。
· 数据保存在浏览器 IndexedDB，设置 › 备份与恢复 可整棵树导出 / 迁移。

—— 由桌面系统于 `+new Date().toLocaleString("zh-CN")+" 自动创建",{owner:"files"});try{const e=localStorage.getItem("pixel_camera_gallery");if(e){const t=JSON.parse(e);if(Array.isArray(t)){let i=0;for(const n of t){if(i>=10)break;const a=n&&n.src;if(typeof a=="string"&&a.startsWith("data:image")){const r=typeof n.name=="string"&&n.name||"IMG_"+(n.id||Date.now()+i)+".jpg",o=ny(r,i);await gr("/photos/"+o,a,{owner:"camera"}),i++}}}}}catch{}try{localStorage.setItem(_c,"1")}catch{}}catch{}}async function ry(){const e=await Jt(),t=new Map;for(const i of e){const n=String(i.key||"");if(n.startsWith(ai)){const a=i.value;a&&typeof a.path=="string"&&a.type&&V.set(a.path,a)}else n.startsWith(Lt)&&t.set(n.slice(Lt.length),i.value)}for(const[i,n]of t){if(V.has(i))continue;const a=Gt(i),r=uo(n)?n.size:typeof n=="string"?n.length:0,o={path:i,name:a,type:"file",mime:uo(n)&&n.type||Ha(a)||"application/octet-stream",size:r,created:Date.now(),modified:Date.now(),owner:"",meta:{healed:!0}};await ke(ai+i,o),V.set(i,o)}return await ay(),xu(An),An}function sy(e){if(!e)return"";let t="";return document.querySelectorAll(".app-instance-wrapper, [data-bus-app-id]").forEach(i=>{t||i.querySelectorAll("iframe").forEach(n=>{try{n.contentWindow===e&&(t=i.getAttribute("data-bus-app-id")||(i.id||"").replace("app-instance-",""))}catch{}})}),t}function oy(){window.addEventListener("message",e=>{const t=e.data;if(!t||t.type!=="FS_REQUEST"||!t.requestId||typeof t.op!="string"||e.source===window)return;const i=sy(e.source),n=(a,r,o)=>{try{e.source.postMessage({type:"FS_RESULT",requestId:t.requestId,ok:!!a,data:r===void 0?null:r,error:o||null},"*")}catch{}};(async()=>{const a=t.args||{};switch(t.op){case"write":{const r=await gr(a.path,a.data,{mime:a.mime,meta:a.meta,owner:i});n(r.ok,r.entry||null,r.error);break}case"read":{const r=await Xr(a.path);if(!r){n(!1,null,"文件不存在");break}n(!0,{meta:{path:r.path,name:r.name,mime:r.mime,size:r.size,modified:r.modified},blob:r.blob,text:r.text});break}case"url":{n(!0,{url:await Su(a.path)});break}case"list":{n(!0,{entries:ku(a.path)});break}case"mkdir":{const r=await qt(a.path);n(r.ok,null,r.error);break}case"del":{const r=await Mu(a.path);n(r.ok,{removed:r.removed||0},r.error);break}case"move":{const r=await Tu(a.from||a.path,a.to);n(r.ok,{to:r.to||null},r.error);break}case"copy":{const r=await Cu(a.from||a.path,a.to);n(r.ok,{to:r.to||null},r.error);break}case"exists":n(!0,{exists:Eu(a.path)});break;case"stat":n(!0,{entry:_u(a.path)});break;case"usage":n(!0,Lu());break;default:n(!1,null,"未知操作: "+t.op)}})().catch(a=>n(!1,null,a&&a.message||"文件系统错误"))})}const An={write:gr,read:Xr,readText:ty,readBlob:bu,readURL:Su,list:ku,mkdir:qt,exists:Eu,stat:_u,del:Mu,move:Tu,copy:Cu,subscribe:iy,usage:Lu,ready:ey,normalize:Fe};function ly(){if(typeof window>"u")return An;oy(),ry();try{window.__vfs=An}catch{}return An}const cy=512*1024,dy=8*1024*1024;let oe=null;const fo=new Set;function Au(){fo.forEach(e=>{try{e(oe)}catch{}})}function Bu(e,t){if(!e||typeof e!="object"||!e.kind)return{ok:!1,error:"无效的剪贴板内容"};if(e.kind==="text"){const i=String(e.text==null?"":e.text);if(!i)return{ok:!1,error:"内容为空"};if(i.length>cy)return{ok:!1,error:"文本过大（超过 512KB）"};oe={kind:"text",text:i,from:t||"",at:Date.now()};try{navigator.clipboard&&navigator.clipboard.writeText&&navigator.clipboard.writeText(i).catch(()=>{})}catch{}}else if(e.kind==="image"){const i=String(e.dataUrl||"");if(!i.startsWith("data:image"))return{ok:!1,error:"仅支持 dataURL 图片"};if(i.length>dy)return{ok:!1,error:"图片过大（超过 8MB）"};oe={kind:"image",dataUrl:i,name:e.name||"clipboard_"+Date.now()+".png",from:t||"",at:Date.now()}}else if(e.kind==="files"){const i=Array.isArray(e.paths)?e.paths.filter(n=>typeof n=="string"&&n):[];if(!i.length)return{ok:!1,error:"未选择文件"};oe={kind:"files",paths:i,cut:!!e.cut,from:t||"",at:Date.now()}}else return{ok:!1,error:"不支持的剪贴板类型: "+e.kind};return Au(),{ok:!0}}function py(){return oe}function uy(){return!!oe}function fy(){const e=!!oe;return oe=null,e&&Au(),{ok:!0}}function my(e){return typeof e=="function"&&fo.add(e),()=>fo.delete(e)}function hy(e){if(!e)return"";let t="";return document.querySelectorAll(".app-instance-wrapper, [data-bus-app-id]").forEach(i=>{t||i.querySelectorAll("iframe").forEach(n=>{try{n.contentWindow===e&&(t=i.getAttribute("data-bus-app-id")||(i.id||"").replace("app-instance-",""))}catch{}})}),t}function gy(){window.addEventListener("message",e=>{const t=e.data;if(!(!t||e.source===window)){if(t.type==="CLIPBOARD_WRITE"){const i=hy(e.source),n=Bu(t.payload,i);if(n.ok)try{document.querySelectorAll(".app-instance-wrapper iframe, [data-bus-app-id] iframe").forEach(a=>{try{a.dataset.loaded==="1"&&a.contentWindow.postMessage({type:"CLIPBOARD_CHANGED",from:i},"*")}catch{}})}catch{}if(t.requestId)try{e.source.postMessage({type:"CLIPBOARD_RESULT",requestId:t.requestId,ok:n.ok,error:n.error||null},"*")}catch{}return}if(t.type==="CLIPBOARD_READ"&&t.requestId){let i=null;oe&&(oe.kind==="text"?i={kind:"text",text:oe.text}:oe.kind==="image"?i={kind:"image",dataUrl:oe.dataUrl,name:oe.name}:oe.kind==="files"&&(i={kind:"files",paths:oe.paths.slice(),cut:oe.cut}));try{e.source.postMessage({type:"CLIPBOARD_RESULT",requestId:t.requestId,ok:!0,payload:i},"*")}catch{}}}})}function vy(){if(!(typeof window>"u")){gy();try{window.__clipboard={set:Bu,get:py,has:uy,clear:fy,subscribe:my}}catch{}}}const Fu=[{id:"msg",appId:"msg",label:"信息",kinds:["text"]},{id:"notes",appId:"notes",label:"备忘录",kinds:["text"]},{id:"cal",appId:"cal_app",label:"日历",kinds:["text"]},{id:"reminders",appId:"reminders",label:"提醒事项",kinds:["text"]},{id:"photo",appId:"photo",label:"存入相册",kinds:["image"]},{id:"files",appId:"files",label:"存储到文件",kinds:["text","image"]},{id:"translate",appId:"translate",label:"翻译",kinds:["text"]},{id:"clipboard",appId:"clipboard",label:"拷贝",kinds:["text","image"],system:!0}];function yy(e){return typeof e=="string"&&e.startsWith("data:image")}function ta(e){const t=[];return!e||typeof e!="object"||((e.text==null?"":String(e.text)).trim()&&t.push("text"),yy(e.imageDataUrl)&&t.push("image")),t}function wy(e){return ta(e).length>0}function xy(e){const t=new Set;if(!Array.isArray(e))return t;for(const i of e)typeof i=="string"?t.add(i):i&&typeof i=="object"&&typeof i.id=="string"&&t.add(i.id);return t}function by(e,t,i){const n=ta(e);if(!n.length)return[];const a=new Set(n),r=xy(i);return Fu.filter(o=>o.id!==t&&o.appId!==t).filter(o=>o.system||!r.has(o.appId)&&!r.has(o.id)).filter(o=>o.kinds.some(l=>a.has(l)))}function Sy(e){return Fu.find(t=>t.id===e)||null}const ky=9e3,Mc='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';let ee=null,mo=null,Pu=null,Ic=0,Bn=null;function Fn(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ot(e,t){const i=F.findIndex(a=>a.id===e);if(i===-1)return!1;let n=t||null;if(!n)try{const a=document.querySelector(`.app-icon[data-id="${e}"]`);if(a){const r=a.getBoundingClientRect();r.width>0&&(n=r)}}catch{}return H(i,null,n),!0}function ho(){const e=new Date,t=i=>String(i).padStart(2,"0");return`${t(e.getHours())}${t(e.getMinutes())}${t(e.getSeconds())}`}function Ey(e){const t=Sy(e),i=Bn;if(!t||!i)return;const n=i.from||"";if(t.id==="msg")Ce("msg","share/memo",{title:i.title||"",text:i.text||"",__silent:!0},n),ot("msg");else if(t.id==="notes")Ce("notes","files/share",{name:i.title||"分享文本",text:i.text||"",__silent:!0},n),ot("notes");else if(t.id==="cal")Ce("cal_app","calendar/prefill",{title:i.title||"",text:i.text||"",date:i.date||"",__silent:!0},n),ot("cal_app");else if(t.id==="reminders"){const a=String(i.text||i.title||"").trim().slice(0,200)||"分享内容";Ce("reminders","reminders/create",{title:a,__silent:!0},n),ot("reminders")}else if(t.id==="photo")Ce("photo","photo/captured",{id:"share"+Date.now(),type:"image",src:i.imageDataUrl,name:i.name||"",__silent:!0},n),ot("photo");else if(t.id==="files")_y(i,n).then(a=>{a?ot("files"):ne("存储到文件失败")});else if(t.id==="translate")Ce("translate","translate/prefill",{text:String(i.text||"").slice(0,5e3),__silent:!0},n),ot("translate");else if(t.id==="clipboard"){const r=ta(i).includes("image")?{kind:"image",dataUrl:i.imageDataUrl,name:i.name||"share_"+ho()+".png"}:{kind:"text",text:String(i.text||"")},o=window.__clipboard?window.__clipboard.set(r,n):{ok:!1};ne(o&&o.ok?"已拷贝到剪贴板":"拷贝失败")}}async function _y(e,t){try{const i=window.__vfs;if(!i||typeof i.write!="function")return!1;if(ta(e).includes("image")){const o=/\.png/i.test(e.imageDataUrl)?"png":"jpg",l=`/Downloads/分享图片-${ho()}.${o}`,c=await i.write(l,e.imageDataUrl,{owner:t||"share"});return!!(c&&c.ok)}const a=`/Downloads/分享文本-${ho()}.txt`,r=await i.write(a,String(e.text||""),{owner:t||"share"});return!!(r&&r.ok)}catch{return!1}}function My(){if(ee)return;const e=document.createElement("style");e.textContent=`
.share-sheet-root{position:fixed;inset:0;z-index:${ky};display:none}
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
  `,document.head.appendChild(e),ee=document.createElement("div"),ee.className="share-sheet-root",ee.setAttribute("role","dialog"),ee.setAttribute("aria-label","系统分享面板"),ee.innerHTML=`
    <div class="share-sheet-scrim"></div>
    <div class="share-sheet-card">
      <div class="share-sheet-handle"></div>
      <div class="share-sheet-title">分享</div>
      <div class="share-sheet-preview"></div>
      <div class="share-sheet-grid"></div>
      <button class="share-sheet-cancel" type="button">取消</button>
    </div>
  `,document.body.appendChild(ee),ee.querySelector(".share-sheet-card"),mo=ee.querySelector(".share-sheet-grid"),Pu=ee.querySelector(".share-sheet-preview"),ee.querySelector(".share-sheet-scrim").addEventListener("click",yn),ee.querySelector(".share-sheet-cancel").addEventListener("click",yn),mo.addEventListener("click",t=>{const i=t.target.closest(".share-target");if(!i)return;const n=i.getAttribute("data-target");yn(),setTimeout(()=>Ey(n),90)}),document.addEventListener("keydown",t=>{t.key==="Escape"&&ee.classList.contains("open")&&yn()})}function Iy(e){const t=ta(e);let i="";t.includes("image")&&(i+=`<img class="sp-img" src="${e.imageDataUrl}" alt="">`);const n=String(e.title||"").trim(),a=String(e.text||"").trim();i+='<div style="min-width:0;flex:1">',n&&(i+=`<div class="sp-title">${Fn(n)}</div>`),a&&(i+=`<div class="sp-text">${Fn(a.slice(0,200))}</div>`),!n&&!a&&t.includes("image")&&(i+=`<div class="sp-title">${Fn(e.name||"分享图片")}</div><div class="sp-text">图片 · 将保存到目标应用</div>`),i+="</div>",Pu.innerHTML=i}function Ty(e){const t=by(e,e.from||"",s.removedApps||[]);mo.innerHTML=t.map(i=>{const n=i.id==="clipboard"?Mc:Tr(i.appId)?Z(i.appId):Mc;return`<button class="share-target" type="button" data-target="${i.id}" aria-label="分享到${Fn(i.label)}">
      <span class="st-icon">${n}</span>
      <span class="st-label">${Fn(i.label)}</span>
    </button>`}).join("")}function zu(e){return wy(e)?(My(),Bn=Object.assign({},e),Iy(Bn),Ty(Bn),ee.classList.add("open"),!0):(ne("没有可分享的内容"),!1)}function yn(){!ee||!ee.classList.contains("open")||(ee.classList.remove("open"),clearTimeout(Ic),Ic=setTimeout(()=>{Bn=null},350))}function Cy(){return!!(ee&&ee.classList.contains("open"))}function Ly(){window.addEventListener("message",e=>{if(e.source===window)return;const t=e.data;if(!(!t||typeof t!="object")){if(t.type==="SHARE_OPEN"&&t.payload){const i=Js(e.source);zu(Object.assign({},t.payload,{from:i}));return}if(t.type==="OPEN_APP"&&t.appId){const i=Js(e.source);if(t.event){const n=Object.assign({},t.payload||{},{__silent:!0});Ce(String(t.appId),String(t.event),n,i)}ot(String(t.appId))}}})}function Ay(){Ly(),window.__shareSheet={open:zu,close:yn,isOpen:Cy,openAppById:ot}}const $u="ios-desktop:navbar-enabled",Du="ios-desktop:navbar-pos";let C=null,Oe=!1,Wi="center";function By(){return Oe}function Fy(e,t={}){Oe=!!e;try{localStorage.setItem($u,Oe?"1":"0")}catch{}if(C){const i=C.classList.contains("hidden");C.classList.toggle("hidden",!Oe),Oe&&i&&(C.classList.remove("nvb-pop"),C.offsetWidth,C.classList.add("nvb-pop"))}!Oe&&t.toast!==!1&&typeof window<"u"&&window.showSystemToast&&window.showSystemToast("已切换为手势导航（三键已隐藏）"),Oe&&t.toast!==!1&&typeof window<"u"&&window.showSystemToast&&window.showSystemToast("三键导航已开启 · 手势仍然可用 · 长按主屏键可左右移动"),document.dispatchEvent(new CustomEvent("navbar-changed",{detail:{enabled:Oe,pos:Wi}}))}function Py(){return Wi}function go(e,t={}){if(["left","center","right"].includes(e)){Wi=e;try{localStorage.setItem(Du,e)}catch{}C&&(C.classList.remove("pos-left","pos-center","pos-right","free"),C.classList.add("pos-"+e),C.style.left=""),t.toast&&typeof window<"u"&&window.showSystemToast&&window.showSystemToast("导航栏位置："+(e==="left"?"居左":e==="right"?"居右":"居中")),document.dispatchEvent(new CustomEvent("navbar-changed",{detail:{enabled:Oe,pos:Wi}}))}}function zy(){try{Oe=localStorage.getItem($u)==="1";const t=localStorage.getItem(Du);["left","center","right"].includes(t)&&(Wi=t)}catch{}}function $y(){const e=document.getElementById("recentAppsOverlay");if(e&&e.classList.contains("active")){we();return}if(s.isOpen){if(s.navHistory.length>1){On();return}const t=Hp();if(t){t.triggerBack();return}const i=Rd();if(i&&i.canBack){qn(i.win,{type:"PB_TRIGGER_BACK"});return}On();return}}function Dy(){const e=document.getElementById("recentAppsOverlay");if(e&&e.classList.contains("active")&&we(),s.isOpen){wt(0,0,0);return}const t=window.__splitGestures;if(t&&t.active()){t.dismiss();return}}function Oy(){const e=document.getElementById("recentAppsOverlay");if(e&&e.classList.contains("active")){we();return}rt(s.currentApp?s.currentApp.id:null)}const S={active:!1,mode:"idle",startX:0,startY:0,lastY:0,lastT:0,vy:0,longPressTimer:null,suppressClick:!1};function Tc(e,t){S.active=!0,S.mode="idle",S.startX=e,S.startY=t,S.lastY=t,S.lastT=performance.now(),S.vy=0,S.suppressClick=!1,S.longPressTimer&&clearTimeout(S.longPressTimer),S.longPressTimer=setTimeout(()=>{!S.active||S.mode!=="idle"||(S.mode="reposition",S.longPressTimer=null,S.suppressClick=!0,C&&(C.classList.add("repositioning","free"),navigator.vibrate&&navigator.vibrate([18,40,18]),window.showSystemToast&&window.showSystemToast("拖移模式 · 左右移动后松手吸附")))},1e3)}function Ry(e,t){if(!S.active)return;const i=e-S.startX,n=t-S.startY;if(S.mode==="reposition"){if(C){if(!S.barW){S.barW=C.offsetWidth||200;const a=C.getBoundingClientRect();S.startLeft=a.left,S.pendingLeft=a.left,C.style.left=a.left+"px",C.style.transition="none"}S.pendingLeft=I(e-S.barW/2,6,window.innerWidth-S.barW-6),S.reposRafId||(S.reposRafId=requestAnimationFrame(()=>{S.reposRafId=0,S.mode==="reposition"&&C&&(C.style.transform=`translateX(${(S.pendingLeft-S.startLeft).toFixed(1)}px)`)}))}return}if(S.mode==="idle"&&Math.abs(i)>32&&Math.abs(i)>Math.abs(n)*1.45&&(S.longPressTimer&&(clearTimeout(S.longPressTimer),S.longPressTimer=null),ol(S.startX,S.startY))){S.mode="quickswitch",S.suppressClick=!0,fr(e,t);return}if(S.mode==="quickswitch"){fr(e,t);return}if(S.mode==="idle"&&n<-12&&(S.longPressTimer&&(clearTimeout(S.longPressTimer),S.longPressTimer=null),S.mode=s.isOpen?"gesture":"desktop-gesture",S.suppressClick=!0,S.mode==="gesture"&&qi(e,S.startY,"BOTTOM")),S.mode==="gesture"){const a=performance.now(),r=Math.max(1,a-S.lastT);S.vy=.7*S.vy+.3*((t-S.lastY)/r)*1e3,S.lastY=t,S.lastT=a,Vr(e,t)}else S.mode==="desktop-gesture"&&(S.lastY=t)}function Cc(e,t){if(S.active){if(S.active=!1,S.longPressTimer&&(clearTimeout(S.longPressTimer),S.longPressTimer=null),S.mode==="reposition"){if(C){S.barW||(S.barW=C.offsetWidth||200,S.startLeft=C.getBoundingClientRect().left),S.reposRafId&&(cancelAnimationFrame(S.reposRafId),S.reposRafId=0,C.style.transform=`translateX(${(S.pendingLeft-S.startLeft).toFixed(1)}px)`);const i=C.getBoundingClientRect(),n=i.left+i.width/2,a=window.innerWidth/3,r=n<a?"left":n>a*2?"right":"center";if(C.classList.remove("repositioning"),typeof matchMedia<"u"&&matchMedia("(prefers-reduced-motion: reduce)").matches)go(r,{toast:!0}),C.style.transform="",C.style.transition="";else{const l=window.innerWidth,d=(r==="left"?16:r==="right"?l-16-S.barW:(l-S.barW)/2)-S.startLeft;C.style.transition="",requestAnimationFrame(()=>{if(!C||S.mode==="reposition")return;C.style.transform=`translateX(${d.toFixed(1)}px)`;let u=!1;const f=v=>{v.target===C&&v.propertyName==="transform"&&m()},m=()=>{u||(u=!0,C.removeEventListener("transitionend",f),clearTimeout(h),!(S.mode==="reposition"||!C.isConnected)&&(go(r,{toast:!0}),C.style.transform=""))},h=setTimeout(m,380);C.addEventListener("transitionend",f)})}navigator.vibrate&&navigator.vibrate(14)}S.barW=0,S.mode="idle";return}if(S.mode==="gesture"){ea(),S.mode="idle";return}if(S.mode==="quickswitch"){Xp(),S.mode="idle";return}if(S.mode==="desktop-gesture"){S.startY-t>45&&rt(),S.mode="idle";return}S.mode="idle"}}function Hy(){C||(zy(),C=document.createElement("div"),C.id="sysNavBar",C.className="sys-nav-bar pos-"+Wi+(Oe?"":" hidden"),C.setAttribute("role","navigation"),C.setAttribute("aria-label","系统导航栏"),C.innerHTML=`
    <button class="nvb-btn nvb-back" data-nvb="back" aria-label="返回">
      <svg class="nvb-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path d="M14 7.5 7.8 13.5H36v23.5H7.8"/>
      </svg>
    </button>
    <button class="nvb-btn nvb-home" data-nvb="home" aria-label="主屏（长按可左右移动导航栏）">
      <svg class="nvb-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <polyline points="6,18 24,7.5 42,18"/>
        <path d="M11 23v12.5a4 4 0 0 0 4 4h18a4 4 0 0 0 4-4V23"/>
      </svg>
    </button>
    <button class="nvb-btn nvb-recents" data-nvb="recents" aria-label="多任务">
      <svg class="nvb-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path d="M8 12h32M8 24h32M8 36h32"/>
      </svg>
    </button>
  `,document.body.appendChild(C),C.addEventListener("click",e=>{if(S.suppressClick){S.suppressClick=!1;return}const t=e.target.closest(".nvb-btn");t&&(t.dataset.nvb==="back"?$y():t.dataset.nvb==="home"?Dy():t.dataset.nvb==="recents"&&Oy())}),C.addEventListener("pointerdown",e=>{if(e.target.closest(".nvb-btn:not(.nvb-home)")&&e.pointerType!=="touch"){Tc(e.clientX,e.clientY),S.longPressTimer&&clearTimeout(S.longPressTimer),S.longPressTimer=null;return}try{C.setPointerCapture(e.pointerId)}catch{}Tc(e.clientX,e.clientY)}),C.addEventListener("pointermove",e=>Ry(e.clientX,e.clientY)),C.addEventListener("pointerup",e=>Cc(e.clientX,e.clientY)),C.addEventListener("pointercancel",e=>Cc(e.clientX,e.clientY)),window.__navBar={enabled:By,pos:Py,setEnabled:e=>Fy(e),setPos:e=>go(e,{toast:!0})})}Xv("files",{canBack:()=>!!(window.__filesPB&&window.__filesPB.canBack()),triggerBack:()=>{window.__filesPB&&window.__filesPB.triggerBack()},beginGesture:()=>{window.__filesPB&&window.__filesPB.beginGesture()},progressGesture:e=>{window.__filesPB&&window.__filesPB.progressGesture(e)},endGesture:(e,t)=>{window.__filesPB&&window.__filesPB.endGesture(e,t)}});window.addEventListener("contextmenu",e=>{e.preventDefault()},{passive:!1});window.addEventListener("dragstart",e=>{e.preventDefault()},{passive:!1});ju();jg();$m();Xf();Wf();wd();Qv();xp();Ef();Rg();Mg();i0();Jv();c0();eu();jm();Bp();su();Hy();Ag();Eg();Ay();ly();vy();A0();$0();V0(F);K0();window.__onThemeModeChanged=()=>{try{zt()}catch{}try{je(Xo(),!1)}catch{}};window.__appIconProbe={ids:Object.keys(he),svg:e=>he[e]||Z(e)};Zc().then(()=>ri(!0));Nf();fm();mv();window.__getUnlockAnimStyle=yp;window.__setUnlockAnimStyle=sv;window.__lockNow=Ni;window.__tryUnlockAnim=function(){s.isOpen&&!s.isClosing?(wt(0,-600,-2),setTimeout(()=>Ni(),500)):Ni()};setTimeout(()=>{if(window.__lockTest&&window.__lockTest.isLocked()){const e=document.getElementById("lockScreen");if(e){const t=jn(),i=e.querySelector(".lock-wallpaper");if(i)if(t)i.style.backgroundImage=`url("${t}")`;else{const n=document.getElementById("desktop"),a=n?getComputedStyle(n).backgroundImage:"none";a&&a!=="none"&&(i.style.backgroundImage=a)}}}},1200);Ao();st();window.pushSubPage=Ps;window.popSubPage=On;window.triggerWallpaperSelect=Co;window.triggerFontSelect=Vf;window.showSystemToast=ne;function Ou(e,t,i,n){e==="down"?qi(t,i,n||"BOTTOM"):e==="move"?Vr(t,i):e==="up"&&ea()}window.__handleIframeGesture=function(e,t,i,n){Ou(e,t,i,n)};window.__syncIframeApp=function(e){Hd(e);const t=qf();if(t)try{e.contentWindow.postMessage({type:"set-wallpaper",url:t},"*")}catch{}const i=jn();if(i)try{e.contentWindow.postMessage({type:"set-wallpaper",url:i},"*")}catch{}const n=Bf(),a=Ff();if(n&&a)try{e.contentWindow.postMessage({type:"set-font",url:n,name:a},"*")}catch{}const r=Xo();try{e.contentWindow.postMessage({type:"set-theme-hue",hue:r},"*")}catch{}const o=zf();if(o)try{e.contentWindow.postMessage({type:"set-palette",palette:o},"*")}catch{}try{tp(e)}catch{}const l=e.contentDocument||e.contentWindow&&e.contentWindow.document;if(!(!l||l.__md3SdkInjected)){l.__md3SdkInjected=!0;try{const c=l.createElement("script");c.textContent=`
      (function() {
        window.addEventListener('contextmenu', function(e) { e.preventDefault(); }, { passive: false });
        window.addEventListener('dragstart', function(e) { e.preventDefault(); }, { passive: false });

        // ---------- 应用间通信总线 / 系统服务 SDK（由桌面注入，详见 js/app-bus.js） ----------
        // 子应用通过 window.__system 以最小成本接入：跨应用事件、统一通知、统一权限
        if (!window.__system) {
          window.__system = {
            // 定向投递：target 传应用 id（如 'msg'）；不传则广播给全部活跃应用
            emit: function(event, payload, target) {
              try { window.parent.postMessage({ type: 'BUS_EMIT', event: event, payload: payload, target: target }, '*'); } catch (e) {}
            },
            broadcast: function(event, payload) { window.__system.emit(event, payload); },
            // v7.19 系统分享面板：拉起桌面级分享 UI（目标按内容自动过滤，见 share-sheet.js）
            share: function(p) {
              try { window.parent.postMessage({ type: 'SHARE_OPEN', payload: p || {} }, '*'); } catch (e) {}
            },
            // v7.19 应用深链：打开应用并可选携带动作（先排队投递、挂载后补投 → 打开即动作）
            openApp: function(appId, opts) {
              try {
                window.parent.postMessage({
                  type: 'OPEN_APP', appId: appId,
                  event: opts && opts.event, payload: opts && opts.payload
                }, '*');
              } catch (e) {}
            },
            // 统一通知：桌面 notifications.js 渲染 Heads-up 横幅 + 进通知中心
            notify: function(p) {
              try { window.parent.postMessage({ type: 'NOTIFY', payload: p }, '*'); } catch (e) {}
            },
            // 统一权限：桌面 permissions.js 弹出 MD3 对话框，resolve(true/false)
            requestPermission: function(name) {
              return new Promise(function(resolve) {
                var settled = false;
                var acknowledged = false;
                function done(v) {
                  if (settled) return;
                  settled = true;
                  window.removeEventListener('message', onMsg);
                  resolve(!!v);
                }
                var rid = 'perm' + Date.now() + Math.random().toString(36).slice(2, 7);
                function onMsg(e) {
                  var d = e.data;
                  if (!d || d.requestId !== rid) return;
                  if (d.type === 'PERMISSION_ACK') { acknowledged = true; }
                  else if (d.type === 'PERMISSION_RESULT') { done(d.granted); }
                }
                window.addEventListener('message', onMsg);
                try {
                  window.parent.postMessage({ type: 'REQUEST_PERMISSION', requestId: rid, permission: name }, '*');
                } catch (err) { done(true); return; }
                // 兜底：桌面无权限服务（旧版本/独立打开）→ ACK 未至则放行，不阻塞子应用
                setTimeout(function() { if (!acknowledged) done(true); }, 1200);
              });
            }
          };
        }

        // ---------- 批次三：虚拟文件系统 / 全局剪贴板（桌面 vfs.js / clipboard.js 承接） ----------
        // promise 化的请求应答助手：桌面回包 { type:'*_RESULT', requestId, ... }
        function bridgeRequest(msgType, resultType, body, timeoutMs) {
          return new Promise(function(resolve) {
            var settled = false;
            var rid = 'fs' + Date.now() + Math.random().toString(36).slice(2, 8);
            function onMsg(e) {
              var d = e.data;
              if (!d || d.requestId !== rid || d.type !== resultType) return;
              settled = true;
              window.removeEventListener('message', onMsg);
              resolve(d);
            }
            window.addEventListener('message', onMsg);
            try {
              window.parent.postMessage(Object.assign({ type: msgType, requestId: rid }, body), '*');
            } catch (err) { settled = true; window.removeEventListener('message', onMsg); resolve({ ok: false, error: 'postMessage 失败' }); return; }
            setTimeout(function() {
              if (!settled) { settled = true; window.removeEventListener('message', onMsg); resolve({ ok: false, error: '桌面无响应' }); }
            }, timeoutMs || 6000);
          });
        }
        if (window.__system && !window.__system.fs) {
          // 虚拟文件系统：write(path, data) 的 data 支持字符串/dataURL/Blob；read 返回 { meta, blob, text }
          window.__system.fs = {
            write: function(path, data, opts) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'write', args: { path: path, data: data, mime: opts && opts.mime } }).then(function(r) { return r.ok ? r.data : Promise.reject(new Error(r.error || '写入失败')); });
            },
            read: function(path) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'read', args: { path: path } }).then(function(r) { return r.ok ? r.data : null; });
            },
            list: function(path) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'list', args: { path: path } }).then(function(r) { return (r.ok && r.data && r.data.entries) ? r.data.entries : []; });
            },
            del: function(path) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'del', args: { path: path } }).then(function(r) { return r.ok; });
            },
            mkdir: function(path) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'mkdir', args: { path: path } }).then(function(r) { return r.ok; });
            },
            move: function(from, to) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'move', args: { from: from, to: to } }).then(function(r) { return r.ok ? r.data : null; });
            },
            exists: function(path) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'exists', args: { path: path } }).then(function(r) { return !!(r.ok && r.data && r.data.exists); });
            },
            url: function(path) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'url', args: { path: path } }).then(function(r) { return (r.ok && r.data) ? r.data.url : null; });
            }
          };
          // 全局剪贴板：write({ text }) 写入并镜像系统剪贴板；read() 返回内部载荷
          window.__system.clipboard = {
            write: function(payload) {
              return bridgeRequest('CLIPBOARD_WRITE', 'CLIPBOARD_RESULT', { payload: payload }, 3000).then(function(r) { return !!r.ok; });
            },
            read: function() {
              return bridgeRequest('CLIPBOARD_READ', 'CLIPBOARD_RESULT', {}, 3000).then(function(r) { return r.payload || null; });
            }
          };
          // 通知宿主子应用：SDK 就绪（此前启动的应用可监听该事件延迟初始化）
          try { window.dispatchEvent(new Event('__system-ready')); } catch (err) {}
        }

        // ---------- 底部手势敏捷转发 (针对沙箱应用的零延迟穿透) ----------
        var isTrackingBottom = false;
        var startX = 0, startY = 0;

        function forwardGesture(type, x, y, extra) {
          try {
            if (window.parent && window.parent.__handleIframeGesture) {
              window.parent.__handleIframeGesture(type, x, y, extra);
            } else {
              window.parent.postMessage({ type: 'iframe-gesture', gestureType: type, x: x, y: y, extra: extra }, '*');
            }
          } catch (e) {
            try {
              window.parent.postMessage({ type: 'iframe-gesture', gestureType: type, x: x, y: y, extra: extra }, '*');
            } catch (err) {}
          }
        }

        window.addEventListener('touchstart', function(e) {
          if (!e.touches || !e.touches[0]) return;
          var t = e.touches[0];
          var screenH = window.innerHeight;
          var screenW = window.innerWidth;
          // 判定是否触碰到底部 68px 区域或左右边缘 36px 区域
          if (t.clientY > screenH - 68) {
            isTrackingBottom = true;
            startX = t.clientX;
            startY = t.clientY;
            forwardGesture('down', t.clientX, t.clientY, 'BOTTOM');
          } else if (t.clientX < 36) {
            forwardGesture('down', t.clientX, t.clientY, 'EDGE_LEFT');
          } else if (t.clientX > screenW - 36) {
            forwardGesture('down', t.clientX, t.clientY, 'EDGE_RIGHT');
          } else {
            isTrackingBottom = false;
          }
        }, { passive: true });

        window.addEventListener('touchmove', function(e) {
          if (!isTrackingBottom || !e.touches || !e.touches[0]) return;
          var t = e.touches[0];
          var dy = startY - t.clientY;
          if (dy > 6 && e.cancelable) {
            e.preventDefault();
          }
          forwardGesture('move', t.clientX, t.clientY);
        }, { passive: false });

        window.addEventListener('touchend', function(e) {
          if (isTrackingBottom) {
            isTrackingBottom = false;
            forwardGesture('up');
          }
        }, { passive: true });

        window.addEventListener('touchcancel', function(e) {
          if (isTrackingBottom) {
            isTrackingBottom = false;
            forwardGesture('up');
          }
        }, { passive: true });

        // 鼠标在桌面端模拟手势
        window.addEventListener('mousedown', function(e) {
          if (e.clientY > window.innerHeight - 68) {
            isTrackingBottom = true;
            forwardGesture('down', e.clientX, e.clientY, 'BOTTOM');
          }
        });
        window.addEventListener('mousemove', function(e) {
          if (isTrackingBottom) {
            forwardGesture('move', e.clientX, e.clientY);
          }
        });
        window.addEventListener('mouseup', function(e) {
          if (isTrackingBottom) {
            isTrackingBottom = false;
            forwardGesture('up');
          }
        });

        window.addEventListener('message', function(e) {
          var d = e.data;
          if (!d) return;
          // 守卫：iframe 文档销毁间隙（换页/卸载）documentElement 可能短暂为 null
          if (!document.documentElement || !document.body) return;
          // 壁纸同步
          if (d.type === 'set-wallpaper' && d.url) {
            var P = document.getElementById('P');
            if (P) {
              P.style.backgroundImage = 'url(' + d.url + ')';
              P.classList.add('has-wallpaper');
            }
            var targets = document.querySelectorAll('[data-wallpaper-target]');
            for (var i = 0; i < targets.length; i++) {
              targets[i].style.backgroundImage = 'url(' + d.url + ')';
              if (targets[i].classList) targets[i].classList.add('has-wallpaper');
            }
            if (!P && targets.length === 0) {
              document.body.style.backgroundImage = 'url(' + d.url + ')';
              document.body.style.backgroundSize = 'cover';
              document.body.style.backgroundPosition = 'center';
            }
          }
          // 字体同步 (智能字体回退链，保护符号、Emoji 与矢量图标不被破坏)
          if (d.type === 'set-font' && d.url && d.name) {
            var sid = 'ios-desktop-injected-font';
            var existing = document.getElementById(sid);
            if (existing) existing.remove();
            var s = document.createElement('style');
            s.id = sid;
            s.textContent = "@font-face{font-family:'" + d.name + "';src:url('" + d.url + "') format('woff2'),url('" + d.url + "') format('woff'),url('" + d.url + "') format('truetype');font-display:swap;} body,input,textarea,select,button,p,h1,h2,h3,h4,h5,h6{font-family:'" + d.name + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', 'PingFang SC', sans-serif !important;} svg, svg *, [class*='icon'], [class*='symbol'], [class*='emoji'], [data-icon], [data-symbol], .material-symbols{font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif !important;} .material-symbols-rounded{font-family:'Material Symbols Rounded' !important;} .material-symbols-outlined{font-family:'Material Symbols Outlined' !important;} .material-icons,.material-icons-rounded,.material-icons-outlined{font-family:'Material Icons' !important;}";
            document.head.appendChild(s);
          }
          // 主题色同步
          if (d.type === 'set-theme-hue' && typeof d.hue === 'number') {
            document.documentElement.style.setProperty('--md-h', d.hue);
            document.documentElement.style.setProperty('--h', d.hue);
          }
          // 完整配色方案同步
          if (d.type === 'set-palette' && d.palette) {
            var p = d.palette;
            if (p.hue) {
              document.documentElement.style.setProperty('--md-h', p.hue);
              document.documentElement.style.setProperty('--h', p.hue);
            }
            if (p.secondaryHue) {
              document.documentElement.style.setProperty('--md-secondary-hue', p.secondaryHue);
            }
          }
          // 应用内字体覆盖
          if (d.type === 'set-app-font' && d.url && d.name) {
            var sid2 = 'app-local-font';
            var ex2 = document.getElementById(sid2);
            if (ex2) ex2.remove();
            var s2 = document.createElement('style');
            s2.id = sid2;
            s2.textContent = "@font-face{font-family:'" + d.name + "';src:url('" + d.url + "') format('woff2'),url('" + d.url + "') format('woff'),url('" + d.url + "') format('truetype');font-display:swap;} body,input,textarea,select,button,p,h1,h2,h3,h4,h5,h6{font-family:'" + d.name + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;} svg, svg *, [class*='icon'], [class*='symbol'], [class*='emoji'], [data-icon], [data-symbol]{font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif !important;} .material-symbols-rounded{font-family:'Material Symbols Rounded' !important;} .material-symbols-outlined{font-family:'Material Symbols Outlined' !important;} .material-icons,.material-icons-rounded,.material-icons-outlined{font-family:'Material Icons' !important;}";
            document.head.appendChild(s2);
          }
        });
      })();
    `,l.body?l.body.appendChild(c):(l.head||l.documentElement).appendChild(c)}catch{}}};p.desktop.addEventListener("click",e=>{s.isEditMode&&!e.target.closest(".app-icon")&&!e.target.closest(".app-folder")&&mm()});p.backBtn.addEventListener("click",()=>{s.isDragging||On()});window.addEventListener("touchstart",e=>{de()||qi(e.touches[0].clientX,e.touches[0].clientY)},{passive:!0});window.addEventListener("touchmove",e=>{de()||(Vr(e.touches[0].clientX,e.touches[0].clientY),s.isDragging&&e.cancelable&&e.preventDefault())},{passive:!1});window.addEventListener("touchend",e=>{de()||ea()},{passive:!0});window.addEventListener("touchcancel",e=>{de()||ea()},{passive:!0});window.addEventListener("mousedown",e=>{de()||(s.mouseDown=!0,qi(e.clientX,e.clientY))});window.addEventListener("mousemove",e=>{de()||(s.mouseDown||s.isDragging)&&Vr(e.clientX,e.clientY)});window.addEventListener("mouseup",()=>{(s.mouseDown||s.isDragging)&&(s.mouseDown=!1,ea())});window.addEventListener("message",e=>{if(e.data)if(e.data.type==="restore-app"&&e.data.appId)km(e.data.appId);else if(e.data.type==="uninstall-app"&&e.data.appId){const t=s.pagesApps.findIndex(i=>Array.isArray(i)&&i.some(n=>n&&n.id===e.data.appId));t!==-1&&fd(t,e.data.appId)}else if(e.data.type==="iframe-gesture"){const{gestureType:t,x:i,y:n,extra:a}=e.data;Ou(t,i,n,a)}else ah(e)});let vr=0,yr=0,Ti=!1,vt=!1,Ru=null,Hu=0;p.desktop.addEventListener("click",e=>{performance.now()<Hu&&(e.stopPropagation(),e.preventDefault())},!0);function wr(){Hu=performance.now()+350}p.desktop.addEventListener("touchstart",e=>{if(de()||s.isOpen||s.isDragging||s.iconDragState||s.isEditMode)return;const t=e.touches[0];vr=t.clientX,yr=t.clientY,performance.now(),Ti=!0,vt=!1,Ru=t.identifier},{passive:!0});p.desktop.addEventListener("touchmove",e=>{if(!Ti||de())return;const t=e.touches.length===1?e.touches[0]:Array.from(e.touches).find(a=>a.identifier===Ru);if(!t)return;const i=t.clientX-vr,n=t.clientY-yr;vt?Pi(t.clientX):Math.abs(i)>12&&Math.abs(i)>Math.abs(n)*1.15&&(vt=!0,ja(vr),Pi(t.clientX)),vt&&e.cancelable&&e.preventDefault()},{passive:!1});p.desktop.addEventListener("touchend",e=>{if(de()||!Ti||s.isOpen||s.isDragging){Ti=!1,vt=!1;return}const t=vt;Ti=!1,vt=!1;const i=e.changedTouches[0],n=i.clientX-vr,a=i.clientY-yr;if(yr>window.innerHeight-60&&a<-45){rt();return}if(t){wr(),vi();return}Math.abs(n)>50&&Math.abs(n)>Math.abs(a)*1.5&&(wr(),n<0?Xe(s.currentPage+1):Xe(s.currentPage-1))},{passive:!0});p.desktop.addEventListener("touchcancel",()=>{vt&&(vt=!1,vi()),Ti=!1},{passive:!0});let xr=0,br=0,Pn=!1,Ci=!1;p.desktop.addEventListener("mousedown",e=>{de()||s.isOpen||s.isDragging||s.iconDragState||s.isEditMode||e.target.closest(".app-icon")||e.target.closest(".app-folder")||(xr=e.clientX,br=e.clientY,Pn=!0,Ci=!1)});window.addEventListener("mousemove",e=>{if(!Pn||de())return;const t=e.clientX-xr,i=e.clientY-br;Ci?Pi(e.clientX):Math.abs(t)>12&&Math.abs(t)>Math.abs(i)*1.15&&(Ci=!0,ja(xr),Pi(e.clientX))});window.addEventListener("mouseup",e=>{if(!Pn||de()){Pn=!1,Ci=!1;return}const t=Ci;Pn=!1,Ci=!1;const i=e.clientX-xr,n=e.clientY-br;if(br>window.innerHeight-60&&n<-50){rt();return}if(t){wr(),vi();return}Math.abs(i)>80&&Math.abs(i)>Math.abs(n)*1.5&&(wr(),i<0?Xe(s.currentPage+1):Xe(s.currentPage-1))});let Ts=null;function Nu(){Xe(s.currentPage,!1);const e=document.getElementById("recentAppsOverlay");e&&e.classList.contains("active")&&ce(()=>Promise.resolve().then(()=>io),void 0,import.meta.url).then(t=>t.renderRecentCards())}window.addEventListener("resize",()=>{Ts&&clearTimeout(Ts),Ts=setTimeout(Nu,100)},{passive:!0});window.addEventListener("orientationchange",()=>{setTimeout(Nu,200)},{passive:!0});export{Ge as S,ce as _,I as a,Te as b,wt as c,Xa as d,Sr as e,rd as f,Kt as g,b0 as h,F as i,Ee as j,Z as k,re as l,ht as m,ld as n,od as o,w0 as p,Ny as q,om as r,s,io as t};
