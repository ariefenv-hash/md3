(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function i(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(s){if(s.ep)return;s.ep=!0;const a=i(s);fetch(s.href,a)}})();const Dg="modulepreload",zg=function(e,t){return new URL(e,t).href},Nd={},he=function(t,i,n){let s=Promise.resolve();if(i&&i.length>0){let c=function(p){return Promise.all(p.map(h=>Promise.resolve(h).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};const r=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),d=l?.nonce||l?.getAttribute("nonce");s=c(i.map(p=>{if(p=zg(p,n),p in Nd)return;Nd[p]=!0;const h=p.endsWith(".css"),f=h?'[rel="stylesheet"]':"";if(n)for(let y=r.length-1;y>=0;y--){const g=r[y];if(g.href===p&&(!h||g.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${p}"]${f}`))return;const m=document.createElement("link");if(m.rel=h?"stylesheet":Dg,h||(m.as="script"),m.crossOrigin="",m.href=p,d&&m.setAttribute("nonce",d),document.head.appendChild(m),h)return new Promise((y,g)=>{m.addEventListener("load",y),m.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${p}`)))})}))}function a(r){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=r,window.dispatchEvent(l),!l.defaultPrevented)throw r}return s.then(r=>{for(const l of r||[])l.status==="rejected"&&a(l.reason);return t().catch(a)})},u={};function Rg(){u.desktopSlider=document.getElementById("desktopSlider"),u.pageDots=document.getElementById("pageDots"),u.appWindow=document.getElementById("appWindow"),u.windowShadowLayer=document.getElementById("windowShadowLayer"),u.windowGlowLayer=document.getElementById("windowGlowLayer"),u.appLaunchScreen=document.getElementById("appLaunchScreen"),u.launchIconContainer=document.getElementById("launchIconContainer"),u.appTitle=document.getElementById("appTitle"),u.pageStack=document.getElementById("pageStack"),u.desktop=document.getElementById("desktop"),u.stage=document.getElementById("stage"),u.header=u.appWindow?u.appWindow.querySelector(".app-header"):null,u.gesture=u.appWindow?u.appWindow.querySelector(".gesture-bar"):null,u.gestureBarContainer=document.getElementById("gestureBarContainer"),u.backBtn=document.getElementById("backBtn"),u.miniWindowBtn=document.getElementById("miniWindowBtn"),u.clock=document.getElementById("clock"),u.statusBar=document.getElementById("statusBar"),u.appWindowStatusBar=document.getElementById("appWindowStatusBar"),u.triggerZone=document.getElementById("triggerZone"),u.edgeLeft=document.getElementById("edgeLeft"),u.edgeRight=document.getElementById("edgeRight"),u.wallpaperInput=document.getElementById("wallpaperInput"),u.fontInput=document.getElementById("fontInput"),u.folderOverlay=document.getElementById("folderOverlay"),u.folderTitle=document.getElementById("folderTitle"),u.folderGrid=document.getElementById("folderGrid"),u.pullPanelsOverlay=document.getElementById("pullPanelsOverlay"),u.pullPanelsSlider=document.getElementById("pullPanelsSlider")}function ot(e,t,i=1){const n=i*Math.pow(2*Math.PI/e,2),s=2*t*Math.sqrt(n*i);return{mass:i,stiffness:n,damping:s}}const qd=ot(.38,.8,1);class Ie{constructor({mass:t,stiffness:i,damping:n,initialValue:s=0,initialVelocity:a=0}){this.mass=t,this.stiffness=i,this.damping=n,this.x=s,this.v=a,this.target=s}setTarget(t,i=null){this.target=t,i!==null&&(this.v=i)}reconfigure({mass:t,stiffness:i,damping:n}){this.mass=t,this.stiffness=i,this.damping=n}update(t){const i=this.mass,n=this.stiffness,s=this.damping,a=(y,g)=>{const w=y-this.target;return(-n*w-s*g)/i},r=a(this.x,this.v),l=this.v,d=a(this.x+.5*t*l,this.v+.5*t*r),c=this.v+.5*t*r,p=a(this.x+.5*t*c,this.v+.5*t*d),h=this.v+.5*t*d,f=a(this.x+t*h,this.v+t*p),m=this.v+t*p;this.v+=t/6*(r+2*d+2*p+f),this.x+=t/6*(l+2*c+2*h+m)}isSettled(t=.005,i=.5){return Math.abs(this.x-this.target)<t&&Math.abs(this.v)<i}}class lo{constructor(t,i=0,n=0,s=0,a=0){this.x=new Ie({...t,initialValue:i,initialVelocity:s}),this.y=new Ie({...t,initialValue:n,initialVelocity:a})}setTarget(t,i,n=null,s=null){this.x.setTarget(t,n),this.y.setTarget(i,s)}reconfigure(t){this.x.reconfigure(t),this.y.reconfigure(t)}update(t){this.x.update(t),this.y.update(t)}get px(){return this.x.x}get py(){return this.y.x}get vx(){return this.x.v}get vy(){return this.y.v}isSettled(t=.005,i=.5){return this.x.isSettled(t,i)&&this.y.isSettled(t,i)}}const Qs=[{id:"snappy",name:"利落",emoji:"⚡",desc:"快速收敛一步到位 · 效率优先不拖泥带水",open:ot(.24,.98,1),close:ot(.22,1.04,1)},{id:"bouncy",name:"果冻",emoji:"🍮",desc:"液态玻璃柔性微弹 · macOS 神奇收束扭曲",open:ot(.38,.79,1),close:ot(.32,.88,1)}],Fu="ios-desktop:anim-preset",Du="ios-desktop:anim-speed",zu=.25,Ru=3;function ca(){try{const e=parseFloat(localStorage.getItem(Du));return Number.isFinite(e)&&e>=zu&&e<=Ru?e:1}catch{return 1}}function Ou(e){const t=Number(e);if(!Number.isFinite(t))return ca();const i=Math.min(Ru,Math.max(zu,t));try{localStorage.setItem(Du,String(i))}catch{}if(typeof window<"u"&&window.__animPresets&&typeof window.__animPresets.apply=="function")try{window.__animPresets.apply(Ec())}catch{}return i}function Kn(e){const t=ca();return!Number.isFinite(t)||t===1||t<=0?e:{mass:e.mass,stiffness:e.stiffness*t*t,damping:e.damping*t}}function Ec(){try{const e=localStorage.getItem(Fu);return Qs.some(t=>t.id===e)?e:"bouncy"}catch{return"bouncy"}}function _c(){return Qs.find(e=>e.id===Ec())||Qs[0]}function Og(e){if(Qs.some(t=>t.id===e))try{localStorage.setItem(Fu,e)}catch{}}function Ke(){return Kn(_c().open)}function Pt(){return Kn(_c().close)}typeof window<"u"&&(window.__animPresets={list:Qs,currentId:Ec,currentName:()=>_c().name,getSpeed:ca,setSpeed:Ou,apply:null});const v={wifi:'<svg viewBox="0 -960 960 960" width="22" height="22" fill="currentColor"><path d="M480-120q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm0-440q75 0 142.5 24T745-470q20 15 20.5 39.5T748-388q-17 17-42 17.5T661-384q-38-26-84-41t-97-15q-51 0-97 15t-84 41q-20 14-45 13t-42-18q-17-18-17-42.5t20-39.5q55-42 122.5-65.5T480-560Zm0-240q125 0 235.5 41T914-643q20 17 21 42t-17 43q-17 17-42 17.5T831-556q-72-59-161.5-91.5T480-680q-100 0-189.5 32.5T129-556q-20 16-45 15.5T42-558q-18-18-17-43t21-42q88-75 198.5-116T480-800Z"/></svg>',wifi_off:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M2.28 3L1 4.27l2.06 2.06C1.72 7.02.58 7.84 0 8.43L12 20.45l4.89-4.89 4.84 4.84 1.27-1.27L2.28 3zM12 16.59L4.47 9.06c.72-.45 1.76-.92 3.12-1.24l7.15 7.15-2.74 1.62zM24 8.43C20.93 5.35 16.69 3.45 12 3.45c-1.89 0-3.69.34-5.36.96l2.12 2.12C10.01 6.2 10.98 6.09 12 6.09c3.78 0 7.23 1.48 9.79 3.9L24 8.43z"/></svg>',cellular:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2 22h20V2L2 22zm18-2H6.83L20 6.83V20z"/></svg>',bluetooth:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/></svg>',bluetooth_off:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M13 5.83l1.88 1.88-1.6 1.6 1.41 1.41 3.02-3.02L12 2h-1v5.03l2 2v-3.2zM5.41 4L4 5.41 9.59 11 5 16.59 6.41 18 11 13.41V22h1l4.29-4.29 2.3 2.29 1.41-1.41L5.41 4zM13 18.17v-3.76l1.88 1.88L13 18.17z"/></svg>',aeroplane:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',hotspot:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 2c0-3.31-2.69-6-6-6s-6 2.69-6 6c0 2.22 1.21 4.15 3 5.19l1-1.74c-1.19-.7-2-1.97-2-3.45 0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.48-.81 2.75-2 3.45l1 1.74c1.79-1.04 3-2.97 3-5.19zM12 3C6.48 3 2 7.48 2 13c0 3.7 2.01 6.92 4.99 8.65l1-1.73C5.61 18.33 4 15.86 4 13c0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.86-1.61 5.33-3.99 6.92l1 1.73C20 19.92 22 16.7 22 13c0-5.52-4.48-10-10-10z"/></svg>',quick_share:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>',vpn:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>',darktheme:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>',torch:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 2h12v3l-3 4v11c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2V9L6 5V2zm2 2v.6l3 4V20h2V8.6l3-4V4H8zm3 6h2v3h-2v-3z"/></svg>',autorotate:'<svg viewBox="0 -960 960 960" width="22" height="22" fill="currentColor"><path d="m568.8-866.3 69.35 69.34q11.72 11.72 11.6 29.44-.12 17.72-11.84 29.43-11.71 11.72-29.43 11.72t-29.44-11.72L408.33-908.57q-12.48-12.47-6.86-28.78 5.63-16.31 23.02-19.37 14.31-2.04 27.79-2.66Q465.76-960 480-960q99 0 186.5 37.5t153 103q65.5 65.5 103 153T960-480q0 17.71-11.98 29.69t-29.7 11.98q-17.71 0-29.81-11.98-12.1-11.98-12.1-29.69 0-69.06-22.8-132.28-22.81-63.22-63.51-114.26-40.71-51.05-97.2-87.43-56.49-36.38-124.1-52.33ZM391.2-93.7l-69.35-69.34q-11.72-11.72-11.6-29.44.12-17.72 11.84-29.43 11.71-11.72 29.43-11.72t29.44 11.72L551.67-51.43q12.48 12.47 6.86 29.21-5.62 16.74-23.1 18.98-14.23 2-27.71 2.62Q494.24 0 480 0q-99 0-186.5-37.5t-153-103Q75-206 37.5-293.5T0-480q0-17.81 12.05-29.86t29.86-12.05q17.71 0 29.7 12.05Q83.59-497.81 83.59-480q0 69.06 22.8 132.28 22.81 63.22 63.51 114.26 40.71 51.05 97.2 87.43 56.49 36.38 124.1 52.33Zm100.5-93.08L187.07-491.93q-12.68-12.68-19.4-28.83-6.71-16.15-6.71-33.31 0-17.15 6.71-33.3 6.72-16.15 19.4-28.83L343.8-772.93q12.69-12.68 28.84-19.02 16.14-6.33 33.29-6.33 17.16 0 33.3 6.33 16.15 6.34 28.84 19.02L772.46-468.3q12.67 12.67 19.39 28.82 6.72 16.15 6.72 33.32 0 17.16-6.72 33.18t-19.39 28.7l-156.74 157.5q-12.6 12.67-28.64 19.01-16.04 6.34-33.22 6.34-17.19 0-33.33-6.34-16.15-6.34-28.83-19.01Zm61.89-65.42L707.8-406.41 405.93-708.28 251.72-554.07 553.59-252.2Zm-73.83-228.04ZM378.5-548.35q14.04 0 23.21-9.6 9.18-9.59 9.18-22.79 0-14.04-9.18-23.21-9.17-9.18-23.21-9.18-13.2 0-22.79 9.18-9.6 9.17-9.6 23.21 0 13.2 9.6 22.79 9.59 9.6 22.79 9.6Z"/></svg>',brightness:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/></svg>',volume:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',volume_mute:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M7 9v6h4l5 5V4L11 9H7z"/></svg>',night_light:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M11.01 3.05C6.51 3.54 3 7.36 3 12a9 9 0 0 0 9 9c4.63 0 8.46-3.51 8.95-8.01C14.73 13.9 10.1 9.27 11.01 3.05z"/></svg>',modes:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>',alarm:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM12.5 8H11v6l4.75 2.85.75-1.23-4-2.37V8zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>',battery_saver:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4zM13 9v3h4v2h-4v3h-2v-3H7v-2h4V9h2z"/></svg>',battery_full:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>',qrcode:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-5 0h3v2h-3v-2zm0 3h2v3h-2v-3zm3 0h3v2h-3v-2zm0 3h3v2h-3v-2zm2-3h2v5h-2v-5z"/></svg>',wallet:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',cast:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/></svg>',screen_record:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>',mic_access:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>',camera_access:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4 4h3V2H4C2.9 2 2 2.9 2 4v3h2V4zm16-2h-3v2h3v3h2V4c0-1.1-.9-2-2-2zm0 18h-3v2h3c1.1 0 2-.9 2-2v-3h-2v3zM4 17H2v3c0 1.1.9 2 2 2h3v-2H4v-3zm8-9a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm5.5-7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>',google_lens:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M6 3.5C4.62 3.5 3.5 4.62 3.5 6V7.5H5.5V6C5.5 5.17 6.17 4.5 7 4.5H8.5V2.5H7C6.66 2.5 6.33 2.54 6 2.6V3.5Z" fill="#EA4335"/><path d="M18 3.5C19.38 3.5 20.5 4.62 20.5 6V7.5H18.5V6C18.5 5.17 17.83 4.5 17 4.5H15.5V2.5H17C17.34 2.5 17.67 2.54 18 2.6V3.5Z" fill="#4285F4"/><path d="M20.5 18C20.5 19.38 19.38 20.5 18 20.5H17V18.5H18C18.83 18.5 19.5 17.83 19.5 17V15.5H21.5V17C21.5 17.34 21.46 17.67 21.4 18H20.5Z" fill="#FBBC05"/><path d="M3.5 18C3.5 19.38 4.62 20.5 6 20.5H7.5V18.5H6C5.17 18.5 4.5 17.83 4.5 17V15.5H2.5V17C2.5 17.34 2.54 17.67 2.6 18H3.5Z" fill="#34A853"/><circle cx="12" cy="12" r="3.5" fill="#4285F4"/><circle cx="16.5" cy="7.5" r="1.2" fill="#34A853"/></svg>',colour_correction:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.79-1.79C9.13 19.66 10.51 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>',colour_inversion:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18v-8c-4.41 0-8 3.59-8 8s3.59 8 8 8z"/></svg>',hearing_devices:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17 20c-.29 0-.56-.06-.76-.15-.71-.37-1.21-1.07-1.24-1.85-.04-1.21.73-2.22 1.84-2.45.69-.14 1.34.07 1.82.52.47.46.74 1.1.74 1.77 0 1.19-.94 2.16-2.4 2.16zm-7.5-9C8.67 11 8 10.33 8 9.5S8.67 8 9.5 8s1.5.67 1.5 1.5S10.33 11 9.5 11zM18 4.23c-4.43 0-8 3.57-8 8 0 1.15.25 2.25.68 3.25L9.12 17C8.4 15.58 8 13.97 8 12.23c0-5.52 4.48-10 10-10 .74 0 1.45.1 2.14.26l-1.52 1.52c-.2-.01-.41-.01-.62-.01z"/></svg>',one_handed:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-4.2-3.8l2.2-2.2-1.4-1.4-2.2 2.2V11h-2v4.2z"/></svg>',calculator:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 2h5v3h-5V5zm-6 0h4v3H7V5zm0 5h4v3H7v-3zm0 5h4v3H7v-3zm11 3h-5v-3h5v3zm0-5h-5v-3h5v3z"/></svg>',focus_mode:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>',live_caption:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/></svg>',live_transcribe:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',recorder:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>',song_search:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',sound_notifications:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>',storage:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z"/></svg>',podcasts:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 1a9 9 0 0 0-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7a9 9 0 0 0-9-9zM12 12c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2s2-.9 2-2v-3c0-1.1-.9-2-2-2z"/></svg>',upload_file:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>',speed:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.28-10.43zM10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"/></svg>',playlist:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/></svg>',settings:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',edit:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',power:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>',restart:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>',emergency:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',undo:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>',back:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>',clear_all:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M5 13h14v-2H5v2zm-2 4h14v-2H3v2zM7 7v2h14V7H7z"/></svg>',history:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>',play:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',pause:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',skip_next:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',skip_prev:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',notification_chat:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>',notification_calendar:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/></svg>',notification_system:'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',battery_charging:'<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4zM11 20v-5.5H9L13 7v5.5h2L11 20z"/></svg>',close:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',search:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',menu:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>',delete_forever:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',content_copy:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"/></svg>',chat:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',mic:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>',videocam:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>',call:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.21c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',link:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',person:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',folder:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',language:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>',smartphone:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z"/></svg>',laptop:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>',headphones:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z"/></svg>',credit_card:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>',assignment:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',add_circle:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>',paid:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>',coffee:'<svg viewBox="0 0 24 24" class="ic" fill="none"><path d="M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z" stroke="currentColor" stroke-width="2"/><path d="M16 9h2.2a2.4 2.4 0 0 1 0 4.8H16" stroke="currentColor" stroke-width="2"/><path d="M8.2 2.8c0 .9-.9 1.4-.9 2.4M12.2 2.8c0 .9-.9 1.4-.9 2.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',metro:'<svg viewBox="0 0 24 24" class="ic" fill="none"><path d="M7 3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" stroke="currentColor" stroke-width="2"/><path d="M7.2 6.4h9.6v3.8H7.2z" fill="currentColor"/><path d="M8 21l1.6-3M16 21l-1.6-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',directions_car:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>',directions_walk:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z"/></svg>',directions_bike:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="5.5" cy="17.5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="18.5" cy="17.5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="13" cy="4.3" r="1.9"/><path d="M12 8.3l-2.6 4.1 3.1 2.6v5h1.8v-6l-2.3-2 2.3-3.5 1.7 3h3.2v-1.8h-2.2L15.5 6l-3.5 2.3z"/></svg>',home:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',work:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>',location_on:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',explore:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"/></svg>',favorite:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',local_fire_department:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>',bedtime:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12.34 2.02C6.59 1.82 2 6.42 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02-7.51-.25-12.09-8.43-8.32-14.96z"/></svg>',bar_chart:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z"/></svg>',water_drop:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>',auto_awesome:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/></svg>',palette:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',launch:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>',bolt:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M13 2 4.5 13.5H11L9.5 22 19.5 9.5H12.5L13 2z"/></svg>',star:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',crown:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M2.5 18.5h19L23 9l-5.5 3.7L12 5l-5.5 7.7L1 9l1.5 9.5z"/></svg>',gem:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2.5 21 9l-9 12.5L3 9l9-6.5z"/></svg>',bomb:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="10" cy="14.5" r="6.2"/><rect x="12.9" y="5.6" width="5" height="3" rx="1" transform="rotate(-45 15.4 7.1)"/><path d="M18.6 3.2l1.3-1.3M20.6 5.6l1.7-.4M19.9 4.3l1.1 1.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',target:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.8"/></svg>',burst:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2l2.2 5.6L20 5.5l-2.6 5.3L23 12l-5.6 1.2L20 18.5l-5.8-2.1L12 22l-2.2-5.6L4 18.5l2.6-5.3L1 12l5.6-1.2L4 5.5l5.8 2.1L12 2z"/></svg>',dice:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.2" cy="8.2" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="15.8" cy="15.8" r="1.7"/></svg>',cyclone:'<svg viewBox="0 0 24 24" class="ic" fill="none"><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 5h11a3 3 0 1 0-3-3"/><path d="M20 10H8a3 3 0 1 1 3 3"/><path d="M5 15h10a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 20h9"/></g></svg>',sync:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 5.74C4.46 6.97 4 8.43 4 10c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>',radio:'<svg viewBox="0 0 24 24" class="ic" fill="none"><rect x="3" y="8" width="18" height="12" rx="2.5" stroke="currentColor" stroke-width="2"/><circle cx="16.2" cy="14" r="2.4" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 12.5h5M6.5 15.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 8V5.6A2.6 2.6 0 0 1 10.6 3H18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',piano:'<svg viewBox="0 0 24 24" class="ic" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7.5 4v10.5M12 4v10.5M16.5 4v10.5" stroke="currentColor" stroke-width="2"/></svg>',download:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',stop_record:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',record_dot:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>',block:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/></svg>',bell_off:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/><path d="M3.4 2.6 2 4l18.6 18.6 1.4-1.4L3.4 2.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',lock:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',photo_camera:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="12" cy="12" r="3.2"/><path d="M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>',picture_in_picture:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 7h-8v6h8V7zm4-4H1v18h22V3zm-2 16H3V5h18v14z"/></svg>',image:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',code:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',schedule:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>',calendar_month:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>',music_note:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',corner_down_left:'<svg viewBox="0 0 24 24" class="ic" fill="none"><g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l-7 7 7 7"/><path d="M2 12h13a5 5 0 0 0 5-5V3"/></g></svg>',weather_sunny:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/></svg>',weather_partly:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="7.5" cy="7.5" r="3.2"/><path d="M19.35 12.04C18.67 8.59 15.64 6 12 6c-2.89 0-5.4 1.64-6.65 4.04C2.34 10.36 0 12.91 0 16c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" transform="translate(0 -2.5)"/></svg>',weather_cloudy:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>',weather_fog:'<svg viewBox="0 0 24 24" class="ic" fill="none"><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8.5h13M6 12.5h15M3 16.5h13"/></g></svg>',weather_rain:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><g transform="translate(.9 .3) scale(.92)"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></g><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7.5 19.6l-1 2.9M12.5 19.6l-1 2.9M17.5 19.6l-1 2.9"/></g></svg>',weather_snow:'<svg viewBox="0 0 24 24" class="ic" fill="none"><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M3.34 7l17.32 10M20.66 7 3.34 17"/></g></svg>',weather_thunder:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><g transform="translate(.9 0) scale(.92)"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></g><path d="M12.5 13 8.5 19.5h3L10 24l5.5-7h-3.2L14 13z"/></svg>',weather_drizzle:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><g transform="translate(.9 -.4) scale(.92)"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></g><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 19.5l-.6 1.8M12.5 19.5l-.6 1.8M17 19.5l-.6 1.8"/></g></svg>',air:'<svg viewBox="0 0 24 24" class="ic" fill="none"><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 12h14a3 3 0 1 1-3 3"/><path d="M3 16h7"/></g></svg>',visibility:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',sunrise:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><circle cx="12" cy="13.5" r="4"/><path d="M12 3.5v3M5.1 6.6l2.1 2.1M18.9 6.6l-2.1 2.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="2" y="19" width="20" height="2.2" rx="1.1"/></svg>',check:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',forest:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 2 6 10h3l-4 6h5v6h4v-6h5l-4-6h3L12 2z"/></svg>',push_pin:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>',vibration:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M8 2h8c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm.5 2a.5.5 0 0 0-.5.5v15a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-15a.5.5 0 0 0-.5-.5h-7zM3 7h1.5v10H3V7zm17.5 0H22v10h-1.5V7z"/></svg>',memory:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z"/></svg>',restart_alt:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>',content_paste:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg>',description:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',insert_drive_file:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6z"/></svg>',create_new_folder:'<svg viewBox="0 0 24 24" class="ic" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z"/></svg>'},$g="ios-desktop-files",Hg=1,Ve="kv";let Vo=null;function Qn(){return typeof indexedDB>"u"||!indexedDB?Promise.resolve(null):(Vo||(Vo=new Promise(e=>{let t;try{t=indexedDB.open($g,Hg)}catch{e(null);return}t.onupgradeneeded=()=>{try{t.result.objectStoreNames.contains(Ve)||t.result.createObjectStore(Ve)}catch{}},t.onsuccess=()=>{const i=t.result;i.onversionchange=()=>{try{i.close()}catch{}},e(i)},t.onerror=()=>e(null),t.onblocked=()=>e(null)}).catch(()=>null)),Vo)}function Fe(){return typeof indexedDB<"u"&&!!indexedDB}async function We(e,t){const i=await Qn();return i?new Promise(n=>{try{const s=i.transaction(Ve,"readwrite");s.objectStore(Ve).put(t,e),s.oncomplete=()=>n(!0),s.onerror=()=>n(!1),s.onabort=()=>n(!1)}catch{n(!1)}}):!1}async function Yi(e){const t=await Qn();return t?new Promise(i=>{try{const s=t.transaction(Ve,"readonly").objectStore(Ve).get(e);s.onsuccess=()=>i(s.result??null),s.onerror=()=>i(null)}catch{i(null)}}):null}async function Zt(e){const t=await Qn();return t?new Promise(i=>{try{const n=t.transaction(Ve,"readwrite");n.objectStore(Ve).delete(e),n.oncomplete=()=>i(!0),n.onerror=()=>i(!1),n.onabort=()=>i(!1)}catch{i(!1)}}):!1}async function Gi(){const e=await Qn();return e?new Promise(t=>{try{const i=e.transaction(Ve,"readonly"),n=i.objectStore(Ve).openCursor(),s=[];n.onsuccess=()=>{const a=n.result;if(!a){t(s);return}s.push({key:a.key,value:a.value});try{a.continue()}catch{t(s)}},n.onerror=()=>t(s.length?s:[]),i.onerror=()=>t(s.length?s:[]),i.onabort=()=>t(s.length?s:[])}catch{t([])}}):[]}async function Tc(e){const t=await Qn();return!t||!Array.isArray(e)?!1:new Promise(i=>{try{const n=t.transaction(Ve,"readwrite"),s=n.objectStore(Ve);for(const a of e)if(!(!a||typeof a.key>"u"||a.key===null))try{s.put(a.value,a.key)}catch{i(!1);return}n.oncomplete=()=>i(!0),n.onerror=()=>i(!1),n.onabort=()=>i(!1)}catch{i(!1)}})}async function Mc(){const e=await Qn();return e?new Promise(t=>{try{const i=e.transaction(Ve,"readwrite");i.objectStore(Ve).clear(),i.oncomplete=()=>t(!0),i.onerror=()=>t(!1),i.onabort=()=>t(!1)}catch{t(!1)}}):!1}const Ng=Object.freeze(Object.defineProperty({__proto__:null,idbAvailable:Fe,idbBulkPut:Tc,idbClearStore:Mc,idbDel:Zt,idbGet:Yi,idbGetAllEntries:Gi,idbSet:We},Symbol.toStringTag,{value:"Module"}));let Le=null,oi=null,li=!1,jd="",di=0,qg=0,Wo=0;const Yo=.25,jg=12,Vg=.84;let Ta=null;function Wg(){if(Ta===null)try{const e=document.createElement("canvas").getContext("2d");Ta=!!e&&"filter"in e&&typeof e.filter=="string"}catch{Ta=!1}return Ta}const Ma=new Map;function $u(){if(Le)return!0;const e=document.getElementById("desktop");return e?(Le=document.createElement("canvas"),Le.id="desktopBlurCanvas",Le.className="desktop-blur-canvas",oi=Le.getContext("2d"),e.appendChild(Le),window.addEventListener("resize",()=>{clearTimeout(Wo),Wo=setTimeout(()=>{Wo=0,tn(!0)},180)},{passive:!0}),!0):!1}function Yg(){let e=null;try{e=window.__videoWallpaper}catch{}if(e&&e.isVideoActive()&&e.getVideoEl())return{kind:"video",el:e.getVideoEl(),key:`video:${++qg}`};try{const n=document.querySelector(".procedural-wallpaper");if(n&&document.getElementById("desktop").classList.contains("procedural-active")&&n.width>2)return{kind:"canvas",el:n,key:"procedural"}}catch{}const i=(document.getElementById("desktop")?.style.backgroundImage||"").match(/url\(["']?([^"')]+)["']?\)/);return i&&i[1]?{kind:"image",url:i[1],key:i[1]}:null}function Gg(e){return new Promise(t=>{const i=Ma.get(e);if(i&&i.complete&&i.naturalWidth>0){t(i);return}const n=new Image;/^https?:/i.test(e)&&(n.crossOrigin="anonymous"),n.onload=()=>{Ma.size>8&&Ma.clear(),Ma.set(e,n),t(n)},n.onerror=()=>t(null),n.src=e})}function tn(e=!1){if(!$u())return;const t=Yg();if(!t){li=!1;return}if(!e&&t.key===jd&&li)return;const i=Math.max(2,Math.round(window.innerWidth*Yo)),n=Math.max(2,Math.round(window.innerHeight*Yo));Le.width=i,Le.height=n;const s=(a,r,l)=>{if(!oi||!a){li=!1;return}if(!Wg()){li=!1;return}const d=Math.max(i/r,n/l),c=r*d,p=l*d,h=(i-c)/2,f=(n-p)/2;oi.clearRect(0,0,i,n);try{oi.filter=`blur(${(jg*Yo).toFixed(1)}px)`}catch{}oi.drawImage(a,h,f,c,p),oi.filter="none",oi.fillStyle=`rgba(0, 0, 0, ${(1-Vg).toFixed(2)})`,oi.fillRect(0,0,i,n),jd=t.key,li=!0,di>.001&&Cc(di)};if(t.kind==="video"){const a=t.el;a.readyState>=2&&a.videoWidth>0?s(a,a.videoWidth,a.videoHeight):li=!1;return}if(t.kind==="canvas"){s(t.el,t.el.width,t.el.height);return}Gg(t.url).then(a=>{a?s(a,a.naturalWidth,a.naturalHeight):li=!1})}function Lc(){return li&&!!Le}function Cc(e){if($u()){if(di=Math.max(0,Math.min(1,e)),di<=.001){Le.classList.remove("active"),Le.style.opacity="";return}Le.classList.add("active"),Le.style.opacity=(di*di).toFixed(4)}}function Ic(){di=0,Le&&(Le.classList.remove("active"),Le.style.opacity="")}typeof window<"u"&&(window.__blurBakeTest={isReady:()=>Lc(),refresh:()=>tn(!0),progress:()=>di});const Ac="ios-desktop:procedural-wallpaper",Oi=[{id:"aurora",name:"极光流体",hue:215,seed:11},{id:"sunset",name:"落日波纹",hue:25,seed:23},{id:"starry",name:"粒子星野",hue:275,seed:37}],Xg=1e3/30,Ug=1.5,Vd=25e5;let V=null,Es=null,gi=null,$i=0,Hu=0,_l=0,Rt=null,pi="",Nu=!1;try{Nu=window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{}function Kg(e){let t=e>>>0;return function(){t|=0,t=t+1831565813|0;let i=Math.imul(t^t>>>15,1|t);return i=i+Math.imul(i^i>>>7,61|i)^i,((i^i>>>14)>>>0)/4294967296}}function Yt(){return gi}function da(){return pi}function co(e){return Oi.find(t=>t.id===e)||null}function Qg(){if(V){if(!V.isConnected){const t=document.getElementById("desktop");t&&t.insertBefore(V,t.firstChild)}return!0}V=document.createElement("canvas"),V.className="procedural-wallpaper",Es=V.getContext("2d");const e=document.getElementById("desktop");e.insertBefore(V,e.firstChild),window.addEventListener("resize",Jg)}let Go=0;function Jg(){clearTimeout(Go),Go=setTimeout(()=>{Go=0,qu()},180)}function qu(){if(!V)return;const e=Math.max(1,V.clientWidth),t=Math.max(1,V.clientHeight);let i=Math.min(window.devicePixelRatio||1,Ug);e*t*i*i>Vd&&(i=Math.max(.5,Math.sqrt(Vd/(e*t))));const n=Math.max(1,Math.round(e*i)),s=Math.max(1,Math.round(t*i));(V.width!==n||V.height!==s)&&(V.width=n,V.height=s,gi&&Rt&&(Pc(co(gi)),Xu(),Bc()))}function ju(e){const t=Kg(e.seed);return e.id==="aurora"?{kind:"aurora",blobs:Array.from({length:5},(i,n)=>({bx:.15+t()*.7,by:.15+t()*.7,r:.3+t()*.24,hueOff:(n-2)*26+(t()-.5)*18,ax:.05+t()*.08,ay:.04+t()*.07,sx:.045+t()*.055,sy:.035+t()*.05,px:t()*Math.PI*2,py:t()*Math.PI*2}))}:e.id==="starry"?{kind:"starry",stars:Array.from({length:110},()=>({x:t(),y:t(),r:.4+t()*1.6,tw:t()*Math.PI*2,tws:.35+t()*1.1,vx:.002+t()*.006,vy:-(.001+t()*.004)})),nebulae:Array.from({length:2},(i,n)=>({bx:.25+n*.5+(t()-.5)*.2,by:.3+t()*.4,r:.45+t()*.2,hueOff:n*40-10,phase:t()*Math.PI*2}))}:{kind:"sunset",waves:Array.from({length:4},(i,n)=>({yBase:.6+n*.1,amp:.03-n*.004,speed:(.1+n*.045)*(n%2?-1:1),hueShift:n*7,freq:1.6+n*.7}))}}function Vu(e,t,i,n,s,a){const r=e.createLinearGradient(0,0,0,i);r.addColorStop(0,"#0b1026"),r.addColorStop(1,"#141b3c"),e.fillStyle=r,e.fillRect(0,0,t,i),e.globalCompositeOperation="lighter";const l=Math.min(t,i);for(const d of a.blobs){const c=(d.bx+d.ax*Math.sin(n*d.sx*Math.PI*2+d.px))*t,p=(d.by+d.ay*Math.cos(n*d.sy*Math.PI*2+d.py))*i,h=d.r*l,f=s+d.hueOff+10*Math.sin(n*.15+d.px),m=e.createRadialGradient(c,p,0,c,p,h);m.addColorStop(0,`hsla(${f}, 72%, 58%, 0.50)`),m.addColorStop(.55,`hsla(${f}, 68%, 46%, 0.22)`),m.addColorStop(1,"hsla(0, 0%, 0%, 0)"),e.fillStyle=m,e.beginPath(),e.arc(c,p,h,0,Math.PI*2),e.fill()}e.globalCompositeOperation="source-over"}function Wu(e,t,i,n,s,a){const r=e.createLinearGradient(0,0,0,i);r.addColorStop(0,"#1a1030"),r.addColorStop(.45,`hsl(${s+15}, 78%, 34%)`),r.addColorStop(.72,`hsl(${s+5}, 92%, 55%)`),r.addColorStop(1,`hsl(${Math.max(0,s-8)}, 95%, 62%)`),e.fillStyle=r,e.fillRect(0,0,t,i);const l=i*(.5+.012*Math.sin(n*.35)),d=Math.min(t,i)*.13,c=e.createRadialGradient(t*.5,l,0,t*.5,l,d*3.2);c.addColorStop(0,"hsla(45, 100%, 80%, 0.85)"),c.addColorStop(.28,`hsla(${s+30}, 100%, 68%, 0.40)`),c.addColorStop(1,"hsla(0, 0%, 0%, 0)"),e.fillStyle=c,e.fillRect(0,0,t,i),e.fillStyle="hsl(48, 100%, 84%)",e.beginPath(),e.arc(t*.5,l,d,0,Math.PI*2),e.fill();for(const p of a.waves){e.beginPath(),e.moveTo(0,i);const h=Math.max(4,Math.floor(t/48));for(let f=0;f<=t+h;f+=h){const m=i*(p.yBase+p.amp*Math.sin(f/t*Math.PI*2*p.freq+n*p.speed));e.lineTo(f,m)}e.lineTo(t,i),e.closePath(),e.fillStyle=`hsla(${(s+255+p.hueShift*6)%360}, 48%, ${13+p.hueShift*3}%, 0.95)`,e.fill()}}function Yu(e,t,i,n,s,a){const r=e.createLinearGradient(0,0,0,i);r.addColorStop(0,`hsl(${s}, 55%, 7%)`),r.addColorStop(.6,`hsl(${s+12}, 48%, 12%)`),r.addColorStop(1,`hsl(${s+25}, 40%, 17%)`),e.fillStyle=r,e.fillRect(0,0,t,i);const l=Math.min(t,i);e.globalCompositeOperation="lighter";for(const d of a.nebulae){const c=(d.bx+.02*Math.sin(n*.06+d.phase))*t,p=(d.by+.02*Math.cos(n*.05+d.phase))*i,h=.1+.05*(.5+.5*Math.sin(n*.12+d.phase)),f=e.createRadialGradient(c,p,0,c,p,d.r*l);f.addColorStop(0,`hsla(${s+d.hueOff}, 70%, 55%, ${h})`),f.addColorStop(1,"hsla(0, 0%, 0%, 0)"),e.fillStyle=f,e.beginPath(),e.arc(c,p,d.r*l,0,Math.PI*2),e.fill()}e.globalCompositeOperation="source-over";for(const d of a.stars){const c=((d.x+d.vx*n)%1+1)%1*t,p=((d.y+d.vy*n)%1+1)%1*i,h=.35+.6*(.5+.5*Math.sin(n*d.tws*2+d.tw));e.fillStyle=`hsla(${s+40}, 30%, 92%, ${h.toFixed(3)})`,e.beginPath(),e.arc(c,p,Math.max(.4,d.r*l*.004),0,Math.PI*2),e.fill()}}function Pc(e){if(!Es||!Rt||V.width<2)return;const t=(performance.now()-Hu)/1e3;Rt.kind==="aurora"?Vu(Es,V.width,V.height,t,e.hue,Rt):Rt.kind==="sunset"?Wu(Es,V.width,V.height,t,e.hue,Rt):Yu(Es,V.width,V.height,t,e.hue,Rt)}function Gu(e){if(!gi){$i=0;return}$i=requestAnimationFrame(Gu),!o.currentApp&&(Nu||e-_l<Xg||(_l=e,Pc(co(gi))))}let La="";function Xu(){if(!V||V.width<2){pi="";return}try{const e=Math.min(V.width,1440),t=Math.max(1,Math.round(V.height/V.width*e)),i=document.createElement("canvas");i.width=e,i.height=t,i.getContext("2d").drawImage(V,0,0,e,t),i.toBlob(n=>{if(!n){pi="";return}if(La)try{URL.revokeObjectURL(La)}catch{}La=URL.createObjectURL(n),pi=La,Bc()},"image/jpeg",.92)}catch{pi=""}}function Bc(){pi&&document.querySelectorAll("iframe").forEach(e=>{try{e.contentWindow.postMessage({type:"set-wallpaper",url:pi},"*")}catch{}})}function Pn(e,t={}){const i=co(e);if(!i)return!1;const{persist:n=!0,showToast:s=!0}=t;try{const a=document.querySelector(".video-wallpaper");a&&a.remove(),document.getElementById("desktop")?.classList.remove("video-wallpaper-active"),localStorage.removeItem("ios-desktop:video-wallpaper"),Fe()&&Zt("wallpaper-video-blob")}catch{}if(nn(),Qg(),gi=i.id,Rt=ju(i),V.parentElement.classList.add("procedural-active"),document.getElementById("desktop").style.backgroundImage="none",qu(),Hu=performance.now(),_l=0,$i||($i=requestAnimationFrame(Gu)),Pc(i),Xu(),Bc(),n)try{localStorage.setItem(Ac,i.id)}catch{}return tn(!0),s&&window.showSystemToast&&window.showSystemToast(`动态壁纸已应用: ${i.name}`,v.image),Zg(i.id),!0}function Bn(){try{localStorage.removeItem(Ac)}catch{}gi&&(gi=null,Rt=null,pi="",$i&&(cancelAnimationFrame($i),$i=0),V&&V.parentElement&&V.parentElement.classList.remove("procedural-active"))}function Zg(e){const t=document.getElementById("themeDynamicGrid");if(!t)return;const i=document.getElementById("themeUploadAnyBtn");i&&i.classList.remove("active"),t.querySelectorAll("[data-proc]").forEach(n=>{n.classList.toggle("active",n.dataset.proc===e)});try{window.dispatchEvent(new CustomEvent("wallpaper-changed",{detail:{source:"procedural",id:e}}))}catch{}}const ds=new Map,ev=24;function Uu(e,t=160,i=100){const n=`${e}|${t}x${i}`;if(ds.has(n))return ds.get(n);const s=co(e);if(!s)return"";try{const a=document.createElement("canvas");a.width=t,a.height=i;const r=a.getContext("2d"),l=ju(s),d=1.2;l.kind==="aurora"?Vu(r,t,i,d,s.hue,l):l.kind==="sunset"?Wu(r,t,i,d,s.hue,l):Yu(r,t,i,d,s.hue,l);const c=a.toDataURL("image/png");return ds.size>=ev&&ds.clear(),ds.set(n,c),c}catch{return""}}const Fc="wallpaper-video-blob",Dc="ios-desktop:video-wallpaper";let O=null,Ot="",Fn=!1,Bs=null,Wd=0,Ku=!1;try{Ku=window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{}function pa(){return Fn}function tv(){return O}async function iv(){Fe()&&await Zt("wallpaper-blob");try{localStorage.removeItem("ios-desktop:wallpaper"),sessionStorage.removeItem("ios-desktop:wallpaper")}catch{}}function nv(){const e=document.getElementById("desktop");return O?(!O.isConnected&&e&&e.insertBefore(O,e.firstChild),O):e?(O=document.createElement("video"),O.className="video-wallpaper",O.muted=!0,O.loop=!0,O.autoplay=!0,O.setAttribute("playsinline",""),O.setAttribute("webkit-playsinline",""),O.disablePictureInPicture=!0,O.preload="auto",e.insertBefore(O,e.firstChild),O):null}function po(){if(!O||O.readyState<2||!O.videoWidth)return"";try{const e=Math.min(O.videoWidth,2160),t=Math.max(1,Math.round(O.videoHeight/O.videoWidth*e)),i=document.createElement("canvas");return i.width=e,i.height=t,i.getContext("2d").drawImage(O,0,0,e,t),i.toDataURL("image/jpeg",.88)}catch{return""}}function sv(){const e=po();e&&document.querySelectorAll("iframe").forEach(t=>{try{t.contentWindow.postMessage({type:"set-wallpaper",url:e},"*")}catch{}})}const Et=36;function av(e,t,i){e/=255,t/=255,i/=255;const n=Math.max(e,t,i),s=Math.min(e,t,i),a=(n+s)/2;if(n===s)return[0,0,a];const r=n-s,l=a>.5?r/(2-n-s):r/(n+s);let d;return n===e?d=((t-i)/r+(t<i?6:0))*60:n===t?d=((i-e)/r+2)*60:d=((e-t)/r+4)*60,[d,l,a]}function rv(e,t,i){try{const s=document.createElement("canvas");s.width=s.height=48;const a=s.getContext("2d",{willReadFrequently:!0});a.drawImage(e,0,0,48,48);const r=a.getImageData(0,0,48,48).data;for(let l=0;l<r.length;l+=4){if(r[l+3]<128)continue;const[d,c,p]=av(r[l],r[l+1],r[l+2]);if(c<.12||p<.06||p>.96)continue;const h=c*c*(1-Math.abs(p-.5)*1.2);if(h<=0)continue;const f=Math.min(Et-1,Math.floor(d/360*Et));t[f]+=h,i[f].rs+=r[l],i[f].gs+=r[l+1],i[f].bs+=r[l+2],i[f].ss+=c,i[f].n++}}catch{}}function ov(e,t=2){const i=e.map((r,l)=>e[(l+Et-1)%Et]+e[l]*2+e[(l+1)%Et]),n=i.reduce((r,l)=>r+l,0);if(n<=0)return[];const s=i.map((r,l)=>({v:r,i:l})).sort((r,l)=>l.v-r.v),a=[];for(const{v:r,i:l}of s){if(a.length>=t)break;a.some(d=>{const c=Math.abs(d.bin-l)*(360/Et);return Math.min(c,360-c)<60})||a.push({bin:l,share:r/n})}return a}const lv=(e,t)=>new Promise(i=>{let n=!1;const s=()=>{n||(n=!0,e.removeEventListener("seeked",s),i())};e.addEventListener("seeked",s);try{e.currentTime=t}catch{s()}setTimeout(s,900)});async function cv(e){if(!e||!e.videoWidth)return null;const t=new Array(Et).fill(0),i=Array.from({length:Et},()=>({rs:0,gs:0,bs:0,ss:0,n:0})),n=!e.paused;try{e.pause()}catch{}const s=isFinite(e.duration)&&e.duration>.4?e.duration:0,a=s?[.1,.3,.5,.7,.9].map(f=>f*s):[e.currentTime||.1];for(const f of a)await lv(e,Math.min(Math.max(f,0),Math.max(.05,(s||f)-.05))),rv(e,t,i);try{e.currentTime=0}catch{}if(n)try{e.play().catch(()=>{})}catch{}const r=ov(t);if(!r.length)return null;const l=f=>Math.round(f*(360/Et)+180/Et)%360,d=(f,m,y)=>{const g=i[f],w=g.n?Math.round(g.ss/g.n*100):m,k=g.n?g.rs/g.n:128,S=g.n?g.gs/g.n:128,b=g.n?g.bs/g.n:128,_=Math.min(88,Math.max(22,Math.round((.299*k+.587*S+.114*b)/2.55)));return[l(f),Math.max(28,w),_]},c=d(r[0].bin,72),p=r[1]?d(r[1].bin,45):[(c[0]+60)%360,Math.round(c[1]*.55),Math.min(80,c[2]+8)],h=c[0];return{hue:h,primary:c,secondary:p,tertiary:[(h+60)%360,Math.max(30,Math.round(c[1]*.7)),Math.min(82,c[2]+6)],accent:[(h+200)%360,70,58],neutral:[h,10,46]}}function dv(e){if(e){try{localStorage.setItem("ios-desktop:theme-hue",String(e.hue)),localStorage.setItem("ios-desktop:palette",JSON.stringify(e))}catch{}gt(e.hue,!1);try{const t=document.documentElement;e.primary&&t.style.setProperty("--md-primary",`hsl(${e.primary[0]} ${e.primary[1]}% ${e.primary[2]}%)`),e.secondary&&t.style.setProperty("--md-secondary",`hsl(${e.secondary[0]} ${e.secondary[1]}% ${e.secondary[2]}%)`)}catch{}document.querySelectorAll("iframe").forEach(t=>{try{t.contentWindow.postMessage({type:"set-palette",palette:e},"*")}catch{}})}}function pv(){Bs||(Bs=setInterval(()=>{if(!Fn||!O){Tl();return}const e=!!o.currentApp||Ku;e&&!O.paused?O.pause():!e&&O.paused&&O.play().catch(()=>{})},500))}function Tl(){Bs&&(clearInterval(Bs),Bs=null)}async function ur(e,t={}){const{persist:i=!0,showToast:n=!0}=t;if(!e||!/^video\//.test(e.type||""))return!1;try{const p=document.querySelector(".procedural-wallpaper");p&&p.remove(),document.getElementById("desktop")?.classList.remove("procedural-active"),localStorage.removeItem("ios-desktop:procedural-wallpaper")}catch{}Bn(),await iv(),i&&nn();const s=nv();if(!s)return!1;if(Ot)try{URL.revokeObjectURL(Ot)}catch{}Ot=URL.createObjectURL(e);const a=++Wd,r=Ot;s.src=Ot,document.getElementById("desktop").style.backgroundImage="none",document.getElementById("desktop").classList.add("video-wallpaper-active"),Fn=!0;const l=()=>Fn&&a===Wd&&Ot===r,d=()=>{l()&&(sv(),tn(!0),i&&((async()=>{let p=!1;if(Fe()&&(p=await We(Fc,e)),p)try{localStorage.setItem(Dc,"1")}catch{}else console.warn("[video-wallpaper] IndexedDB 不可用，视频壁纸仅本次会话有效")})(),setTimeout(()=>{l()&&cv(s).then(p=>{dv(p)})},700)),window.__blurBakeTest&&window.__blurBakeTest.refresh&&window.__blurBakeTest.refresh(),n&&window.showSystemToast&&window.showSystemToast("视频壁纸已应用",v.image),uv())},c=async()=>{if(l()){window.showSystemToast&&window.showSystemToast("视频壁纸加载失败，已恢复原壁纸",v.videocam),await Ut();try{nf()}catch{}}};return s.addEventListener("loadeddata",d,{once:!0}),s.addEventListener("error",c,{once:!0}),s.play().catch(()=>{}),pv(),!0}async function Ut(){try{localStorage.removeItem(Dc)}catch{}if(Fe()&&await Zt(Fc),!Fn){Tl();return}if(Fn=!1,Tl(),O&&(O.pause(),O.removeAttribute("src"),O.load(),O.remove(),O=null),Ot){try{URL.revokeObjectURL(Ot)}catch{}Ot=""}const e=document.getElementById("desktop");e&&e.classList.remove("video-wallpaper-active")}function uv(){const e=document.getElementById("themeUploadAnyBtn");e&&e.classList.add("active"),document.querySelectorAll("#themeDynamicGrid [data-proc]").forEach(t=>t.classList.remove("active"));try{window.dispatchEvent(new CustomEvent("wallpaper-changed",{detail:{source:"video"}}))}catch{}}async function fv(){try{if(!localStorage.getItem(Dc))return}catch{return}if(!Fe())return;const e=await Yi(Fc);e&&await ur(e,{persist:!1,showToast:!1})}function hv(){const e=document.getElementById("videoWallpaperInput");e&&e.addEventListener("change",async t=>{const i=t.target.files[0];if(i){if(t.target.value="",i.size>200*1024*1024){window.showSystemToast&&window.showSystemToast("视频过大（上限 200MB）",v.videocam);return}await ur(i,{persist:!0,showToast:!0})}}),window.__videoWallpaper={isVideoActive:pa,getVideoEl:tv,getVideoFrameDataURL:po},window.__videoWallpaperApply=ur}const mv=`
    .material-symbols-rounded { font-family: 'Material Symbols Rounded' !important; }
    .material-symbols-outlined { font-family: 'Material Symbols Outlined' !important; }
    .material-icons, .material-icons-rounded, .material-icons-outlined { font-family: 'Material Icons' !important; }
  `,we={wallpaper:"ios-desktop:wallpaper",font:"ios-desktop:font",fontName:"ios-desktop:font-name",hue:"ios-desktop:theme-hue",palette:"ios-desktop:palette"},_t={wallpaper:"wallpaper-blob",font:"font-blob",fontName:"font-name"},Qu="https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/b311240a375e.jpg";let uo="",zc="",$t="",fo=215,ua=null,Yd=0;const ps=215;let Gd="",Xd="";function gv(){try{$t=localStorage.getItem(we.fontName)||"";const e=localStorage.getItem(we.hue),t=e?parseInt(e,10):215;fo=Number.isFinite(t)?t:215;const i=localStorage.getItem(we.palette);ua=i?JSON.parse(i):null}catch{}}function Ju(e){try{const t=e.indexOf(",");if(t<0)return null;const i=e.slice(0,t),n=e.slice(t+1),s=i.match(/^data:([^;]+)/),a=s?s[1]:"application/octet-stream",r=atob(n),l=new Uint8Array(r.length);for(let d=0;d<r.length;d++)l[d]=r.charCodeAt(d);return new Blob([l],{type:a})}catch{return null}}function Zu(e){return new Promise(t=>{try{const i=new FileReader;i.onload=n=>t(n.target.result),i.onerror=()=>t(null),i.readAsDataURL(e)}catch{t(null)}})}function Js(e,t){const i=URL.createObjectURL(e),n=t==="font"?Xd:Gd;return n&&n!==i&&setTimeout(()=>{try{URL.revokeObjectURL(n)}catch{}},3e4),t==="font"?Xd=i:Gd=i,i}async function vv(e){const t=await Zu(e);if(t){try{localStorage.setItem(we.wallpaper,t);return}catch{}try{sessionStorage.setItem(we.wallpaper,t)}catch{console.warn("[wallpaper] 存储空间不足，壁纸仅本次会话有效")}}}async function yv(e,t){const i=await Zu(e);if(i)try{localStorage.setItem(we.font,i),localStorage.setItem(we.fontName,t)}catch{console.warn("[wallpaper] 存储空间不足，字体仅本次会话有效")}}function wv(e){try{localStorage.setItem(we.hue,String(e))}catch{}}function xv(e){try{localStorage.setItem(we.palette,JSON.stringify(e))}catch{}}function nn(){ua=null;try{localStorage.removeItem(we.palette)}catch{}}function bv(){return uo}function Sv(){return zc}function kv(){return $t}function Ev(){return fo}function _v(){return ua}function Tv(e,t){const i=new Image;/^https?:/i.test(e)&&(i.crossOrigin="anonymous"),i.onload=()=>{const n=document.createElement("canvas"),s=n.getContext("2d"),a=60;n.width=n.height=a,s.drawImage(i,0,0,a,a);const r=s.getImageData(0,0,a,a).data,l=[];for(let m=0;m<r.length;m+=4)r[m+3]>128&&l.push([r[m],r[m+1],r[m+2]]);if(l.length===0){t({hue:215});return}let d=[l[Math.floor(Math.random()*l.length)],l[Math.floor(Math.random()*l.length)],l[Math.floor(Math.random()*l.length)],l[Math.floor(Math.random()*l.length)],l[Math.floor(Math.random()*l.length)]];for(let m=0;m<3;m++){const y=[[],[],[],[],[]];for(const g of l){let w=1/0,k=0;for(let S=0;S<d.length;S++){const b=(g[0]-d[S][0])**2+(g[1]-d[S][1])**2+(g[2]-d[S][2])**2;b<w&&(w=b,k=S)}y[k].push(g)}for(let g=0;g<d.length;g++){if(y[g].length===0)continue;let w=0,k=0,S=0;for(const _ of y[g])w+=_[0],k+=_[1],S+=_[2];const b=y[g].length;d[g]=[w/b,k/b,S/b]}}const c=d.map((m,y)=>({r:Math.round(m[0]),g:Math.round(m[1]),b:Math.round(m[2]),size:l.length,idx:y})).sort((m,y)=>y.size-m.size);for(let m=0;m<1;m++){const y=[0,0,0,0,0];for(const g of l){let w=1/0,k=0;for(let S=0;S<d.length;S++){const b=(g[0]-d[S][0])**2+(g[1]-d[S][1])**2+(g[2]-d[S][2])**2;b<w&&(w=b,k=S)}y[k]++}c.forEach((g,w)=>{g.size=y[g.idx]}),c.sort((g,w)=>w.size-g.size)}const p=(m,y,g)=>{m/=255,y/=255,g/=255;const w=Math.max(m,y,g),k=Math.min(m,y,g);let S=0,b=0,_=(w+k)/2;if(w!==k){const A=w-k;switch(b=_>.5?A/(2-w-k):A/(w+k),w){case m:S=((y-g)/A+(y<g?6:0))*60;break;case y:S=((g-m)/A+2)*60;break;case g:S=((m-y)/A+4)*60;break}}return[Math.round(S),Math.round(b*100),Math.round(_*100)]},h=(m,y,g,w)=>{const[k,S,b]=m;return[S<8?ps:k,Math.max(y,S),Math.min(w,Math.max(g,b))]},f={primary:c[0]?h(p(c[0].r,c[0].g,c[0].b),28,22,88):[ps,80,25],secondary:c[1]?h(p(c[1].r,c[1].g,c[1].b),18,25,80):[ps,15,40],tertiary:c[2]?h(p(c[2].r,c[2].g,c[2].b),24,25,82):[ps,50,50],accent:c[3]?h(p(c[3].r,c[3].g,c[3].b),45,40,78):[0,70,50],neutral:c[4]?p(c[4].r,c[4].g,c[4].b):[ps,10,50],hue:0};f.hue=f.primary[0],t(f)},i.onerror=()=>t({hue:215,primary:[215,80,25]}),i.src=e}function ef(e){if(!e)return;const t=document.documentElement;if(t.style.setProperty("--md-h",e.hue),e.primary){const[i,n,s]=e.primary;t.style.setProperty("--md-primary",`hsl(${i} ${n}% ${s}%)`)}if(e.secondary){const[i,n,s]=e.secondary;t.style.setProperty("--md-secondary",`hsl(${i} ${n}% ${s}%)`)}if(e.tertiary){const[i,n,s]=e.tertiary;t.style.setProperty("--md-tertiary",`hsl(${i} ${n}% ${s}%)`)}}function tf(e,t){let i=document.getElementById("custom-font-style");i||(i=document.createElement("style"),i.id="custom-font-style",document.head.appendChild(i)),i.textContent=`
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
    ${mv}
  `}function Mv(){try{document.getElementById("themeUploadAnyBtn")?.classList.remove("active"),document.querySelectorAll("#themeDynamicGrid [data-proc]").forEach(e=>e.classList.remove("active"))}catch{}try{window.dispatchEvent(new CustomEvent("wallpaper-changed",{detail:{source:"static"}}))}catch{}}async function Lv(e,t){const i=e&&e.type||"",n=e&&e.name||"",s=n.includes(".")?n.split(".").pop().toLowerCase():"",a=["mp4","webm","mov","m4v","ogv","mkv","avi"];if(/^video\//.test(i)||!i&&a.includes(s)){if(e.size>200*1024*1024){window.showSystemToast&&window.showSystemToast("视频过大（上限 200MB）",v.videocam);return}!await ur(e,{persist:t,showToast:!0})&&window.showSystemToast&&window.showSystemToast("不支持的视频格式",v.videocam);return}await Cv(e)}async function Cv(e,t){Bn(),await Ut(),Mv(),nn();const i=Js(e,"wallpaper");Ga(i);{let a=!1;if(Fe()&&(a=await We(_t.wallpaper,e)),a)try{localStorage.removeItem(we.wallpaper),sessionStorage.removeItem(we.wallpaper)}catch{}else await vv(e)}const n=++Yd,s=()=>{if(n!==Yd||pa()||Yt()||i!==uo)return!1;try{return(u.desktop.style.backgroundImage||"").includes(i)}catch{return!1}};Tv(i,a=>{s()&&(fo=a.hue,ua=a,wv(a.hue),xv(a),gt(a.hue,!1),ef(a),document.querySelectorAll("iframe").forEach(r=>{try{r.contentWindow.postMessage({type:"set-palette",palette:a},"*")}catch{}}))})}async function Iv(e,t,i){const n=Js(e,"font");zc=n,$t=t,tf(n,t),sf("set-font",n,{name:t});{let s=!1;if(Fe()){const a=await We(_t.font,e),r=await We(_t.fontName,t);s=a&&r}s||await yv(e,t);try{localStorage.setItem(we.fontName,t)}catch{}}}function Ga(e){uo=e,/^https?:/i.test(e)&&nn(),u.desktop.style.backgroundImage=`url(${e})`,sf("set-wallpaper",e),tn(!0)}function rn(){gt(fo,!1),ef(ua)}function nf(){return(async()=>{if(await fv(),pa()){rn();return}let e="";try{e=localStorage.getItem(Ac)||""}catch{}if(e&&Pn(e,{persist:!1,showToast:!1})){rn();return}if(Fe()){const i=await Yi(_t.wallpaper);if(i){Ga(Js(i,"wallpaper")),rn();return}}let t="";try{t=(localStorage.getItem(we.wallpaper)||sessionStorage.getItem(we.wallpaper)||"").trim()}catch{}if(t.startsWith("data:")){const i=Ju(t);if(i){Ga(Js(i,"wallpaper")),rn(),Fe()&&await We(_t.wallpaper,i);try{localStorage.removeItem(we.wallpaper),sessionStorage.removeItem(we.wallpaper)}catch{}return}}if(t){Ga(t),rn();return}if(Pn("aurora",{persist:!1,showToast:!1})){rn();return}nn(),u.desktop.style.backgroundImage="",u.desktop.style.background="radial-gradient(120% 90% at 20% 10%, #0b3b2e 0%, transparent 55%),radial-gradient(110% 80% at 85% 20%, #123a63 0%, transparent 60%),linear-gradient(160deg, #07130f 0%, #0a1a2f 55%, #050b12 100%)"})()}function Av(){return(async()=>{let e=null;if(Fe()&&(e=await Yi(_t.font),e&&!$t)){const t=await Yi(_t.fontName);t&&($t=t)}if(!e){let t="";try{t=(localStorage.getItem(we.font)||"").trim()}catch{}if(t.startsWith("data:")){const i=Ju(t);if(i){e=i,Fe()&&(await We(_t.font,e),$t&&await We(_t.fontName,$t));try{localStorage.removeItem(we.font)}catch{}}}}if(e&&$t){const t=Js(e,"font");zc=t,tf(t,$t)}})()}async function Hi(){Fe()&&await Zt(_t.wallpaper)}function sf(e,t,i={}){document.querySelectorAll("iframe").forEach(n=>{try{n.contentWindow.postMessage({type:e,url:t,...i},"*")}catch{}})}function Pv(){if(pa()){const e=po();if(e)return e}return uo||""}function Rc(){u.wallpaperInput.click()}function Bv(){u.fontInput&&u.fontInput.click()}function Fv(){gv(),u.wallpaperInput.addEventListener("change",async e=>{const t=e.target.files[0];t&&(e.target.value="",await Lv(t,!0))}),u.fontInput&&u.fontInput.addEventListener("change",async e=>{const t=e.target.files[0];if(!t)return;e.target.value="";const i=t.name.replace(/\.[^.]+$/,"");await Iv(t,i)})}const af="ios-desktop:theme-mode";let Xi="auto",gn=null;try{gn=window.matchMedia("(prefers-color-scheme: dark)")}catch{}function Dv(){try{const e=localStorage.getItem(af);(e==="light"||e==="dark"||e==="auto")&&(Xi=e)}catch{}}function Ct(){if(Xi==="auto")try{return gn&&gn.matches?"dark":"light"}catch{return"dark"}return Xi}function Oc(){return Xi}function Ml(){const e=Ct()==="light";document.body.classList.toggle("light-theme",e),typeof window.__onThemeModeChanged=="function"&&window.__onThemeModeChanged(e)}function Jn(e){if(["auto","light","dark"].includes(e)){Xi=e;try{localStorage.setItem(af,e)}catch{}Ml()}}function zv(){Dv(),Ml(),gn&&gn.addEventListener&&gn.addEventListener("change",()=>{Xi==="auto"&&Ml()}),window.__themeModeTest={pref:()=>Xi,resolved:()=>Ct(),set:e=>Jn(e)}}const Ll=new Set;function Rv(e){return Ll.add(e),()=>Ll.delete(e)}function Ov(){for(const e of Ll)try{if(e.isActive())return e}catch{}return null}function xe(e,t,i){return e=Math.max(0,Math.min(1,(e-t)/(i-t))),e*e*(3-2*e)}function M(e,t,i){return Math.max(t,Math.min(i,e))}function Ui(){try{if(typeof globalThis.__effGridCols=="function")return globalThis.__effGridCols()}catch{}const e=window.innerWidth||400,t=window.innerHeight||800;return e>=768||t<=520&&e>t?6:4}function Xa(e){const t={left:window.innerWidth/2-29,top:window.innerHeight/2-29,width:58,height:58};if(!e||typeof e.querySelector!="function")return t;const i=e.querySelector(".icon-box")||e.querySelector(".dock-icon-box")||e.querySelector(".folder-icon")||e,n=document.getElementById("desktop"),s=document.getElementById("desktopSlider"),a=e.closest(".page-grid");if(a&&a.dataset.page!==void 0&&s){const h=parseInt(a.dataset.page,10);if(!isNaN(h)&&o.currentPage!==h){o.currentPage=h,s.style.transition="none",s.style.transform=`translate3d(${-h*100}vw, 0, 0)`;const f=document.getElementById("pageDots");f&&Array.from(f.children).forEach((m,y)=>{m.classList.toggle("active",y===h)})}}const r=n?n.style.transform:"",l=n?n.style.transition:"";n&&(n.style.transform||n.style.transition)&&(n.style.setProperty("transform","none","important"),n.style.setProperty("transition","none","important"));const d=e.style.transform,c=e.style.transition;e.style.setProperty("transform","none","important"),e.style.setProperty("transition","none","important");const p=i.getBoundingClientRect();return e.style.transform=d,e.style.transition=c,n&&(n.style.transform=r,n.style.transition=l),p.width===0||p.height===0?t:{left:p.left,top:p.top,width:p.width||58,height:p.height||58}}function Ye(e,t=!1){const i=t?"launch_":"grid_";if(e==="clock"){const n=new Date,s=n.getHours()%12,a=n.getMinutes(),r=n.getSeconds(),l=n.getMilliseconds(),d=`rotate(${((s+a/60)*30).toFixed(2)}deg)`,c=`rotate(${((a+r/60)*6).toFixed(2)}deg)`,p=`rotate(${Math.floor((r+l/1e3)*6)}deg)`;return`
      <div class="dynamic-clock-icon">
        <div class="clock-face">
          <div class="clock-tick tick-12"></div>
          <div class="clock-tick tick-3"></div>
          <div class="clock-tick tick-6"></div>
          <div class="clock-tick tick-9"></div>
          <div class="clock-hand hour-hand" id="${i}hourHand" style="transform:${d}"></div>
          <div class="clock-hand minute-hand" id="${i}minuteHand" style="transform:${c}"></div>
          <div class="clock-hand second-hand" id="${i}secondHand" style="transform:${p}"></div>
          <div class="clock-center-dot"></div>
        </div>
      </div>`}if(e==="calendar"){const n=new Date;return`
      <div class="dynamic-calendar-icon">
        <div class="cal-header" id="${i}calHeader">${["周日","周一","周二","周三","周四","周五","周六"][n.getDay()]}</div>
        <div class="cal-body" id="${i}calBody">${n.getDate()}</div>
      </div>`}return""}const Ud=new Map,Xo=new Map,$v=1e3;function rf(e){let t=Ud.get(e);if(t&&t.isConnected)return t;const i=Xo.get(e),n=performance.now();return i!=null&&n-i<$v?null:(t=document.getElementById(e),t?(Ud.set(e,t),Xo.delete(e)):Xo.set(e,n),t)}let us=null;function Hv(){return(!us||!us.isConnected)&&(us=document.getElementById("recentAppsOverlay")),!!(us&&us.classList.contains("active"))}const fr=new Map;function Uo(e,t){const i=rf(e);if(!i)return;const n=fr.get(e);n&&n.el===i&&n.value===t||(fr.set(e,{el:i,value:t}),i.style.transform=t)}function Kd(e,t){const i=rf(e);if(!i)return;const n=fr.get(e);n&&n.el===i&&n.value===t||(fr.set(e,{el:i,value:t}),i.textContent=t)}let Ua=0;function Nv(){if(Ua)return;const e=1e3-Date.now()%1e3+30;Ua=setTimeout(()=>{Ua=0,$c()},Math.max(250,e))}typeof document<"u"&&document.addEventListener("visibilitychange",()=>{!document.hidden&&!Ua&&$c()});function $c(){if(!(document.hidden||document.body.classList.contains("is-locked")||Hv())){const t=new Date,n=["周日","周一","周二","周三","周四","周五","周六"][t.getDay()],s=String(t.getDate()),a=t.getHours()%12,r=t.getMinutes(),l=t.getSeconds(),d=t.getMilliseconds(),c=`rotate(${Math.floor((l+d/1e3)*6)}deg)`,p=`rotate(${((r+l/60)*6).toFixed(2)}deg)`,h=`rotate(${((a+r/60)*30).toFixed(2)}deg)`;["grid_","launch_"].forEach(f=>{Uo(f+"hourHand",h),Uo(f+"minuteHand",p),Uo(f+"secondHand",c),Kd(f+"calHeader",n),Kd(f+"calBody",s)})}Nv()}const De={msg:`<svg viewBox="0 0 100 100" width="100%" height="100%">
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
  </svg>`,installer:`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 43.31) 89.53% 66.27%)"/>
    <!-- 包裹盒：顶面 / 左右侧面三块面拉开立体感 -->
    <path d="M 28 40 L 50 28 L 72 40 L 50 52 Z" fill="#FFFFFF"/>
    <path d="M 28 40 L 50 52 L 50 76 L 28 64 Z" fill="#FFFFFF" opacity="0.82"/>
    <path d="M 72 40 L 50 52 L 50 76 L 72 64 Z" fill="#FFFFFF" opacity="0.66"/>
    <!-- 盒盖中缝（深紫描边） -->
    <path d="M 50 52 L 50 76" style="stroke:hsl(calc(var(--md-h,215) + 48.5) 67.42% 34.9%)" stroke-width="2.5" fill="none"/>
    <!-- 底部落点指示圈（包安装进系统的隐喻） -->
    <circle cx="50" cy="85" r="4" style="fill:hsl(calc(var(--md-h,215) + 35.5) 95.24% 91.76%)"/>
  </svg>`};De.messages=De.msg;De.calculator=De.calc;De.clock_app=De.clock;De.cal_app=De.calendar;De.photo=De.photos;function ho(e){return!!De[e]||Dn.has(e)}const Dn=new Map;function WS(e,t){if(!e||typeof t!="string"||!t){e&&Dn.delete(e);return}Dn.set(e,t)}function YS(e){e&&Dn.delete(e)}function J(e){return De[e]?De[e]:Dn.has(e)?Dn.get(e):`<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 0.29) 19.32% 34.51%)"/>
    <circle cx="50" cy="50" r="22" fill="#FFFFFF"/>
    <circle cx="50" cy="50" r="10" style="fill:hsl(calc(var(--md-h,215) - 16.37) 88.66% 48.43%)"/>
  </svg>`}const of="ios-desktop:bg-mode";let vt="freeze";try{const e=localStorage.getItem(of);(e==="live"||e==="freeze")&&(vt=e)}catch{}const It=new Set,hr=new Set,zn=new Map,Gt=new Map;function qv(e){let t=zn.get(e);return t||(t={timeouts:null,intervals:null,frozen:!1},t.timeouts=new Qd(t,"to"),t.intervals=new Qd(t,"iv"),zn.set(e,t)),t}class Qd extends Map{constructor(t,i){super(),this._reg=t,this._kind=i}set(t,i){super.set(t,i);try{if(jv(this._reg,this._kind,t),this._kind==="to"&&i&&typeof i=="object"&&typeof i.expires!="number"){const n=Number(i.d);i.expires=Date.now()+(n>0?n:0)}}catch{}return this}}function jv(e,t,i){Gt.set(i,{reg:e,kind:t})}function lf(e){try{const t=typeof window<"u"?window:globalThis,i=t?t[e]:null;return typeof i=="function"?i.bind(t):null}catch{return null}}const Jd=lf("clearTimeout"),Zd=lf("clearInterval");let ep=!1;function Vv(){if(ep)return;ep=!0;const e=window.clearTimeout.bind(window),t=window.clearInterval.bind(window);window.clearTimeout=function(i){const n=Gt.get(i);return n&&(n.reg.timeouts.delete(i),Gt.delete(i)),e(i)},window.clearInterval=function(i){const n=Gt.get(i);return n&&(n.reg.intervals.delete(i),Gt.delete(i)),t(i)}}function Wv(e){if(!e||!e.querySelectorAll)return!1;const t=[e];e.querySelectorAll("iframe").forEach(i=>{try{i.contentDocument&&t.push(i.contentDocument)}catch{}});for(const i of t){const n=i.querySelectorAll("audio,video");for(const s of n)if(!s.paused&&!s.ended)return!0}return!1}function Yv(e){const t=document.getElementById(`app-instance-${e}`),i=zn.get(e);t&&Wv(t)||(i&&!i.frozen&&(i.frozen=!0,i.timeouts.forEach((n,s)=>{try{Jd&&Jd(s)}catch{}}),i.intervals.forEach((n,s)=>{try{Zd&&Zd(s)}catch{}})),!(!t||t.dataset.frozen==="1")&&(t.dataset.frozen="1",t.classList.add("app-frozen"),t.querySelectorAll("iframe").forEach(n=>{try{n.contentWindow&&n.contentWindow.postMessage({type:"APP_FREEZE"},"*")}catch{}}),document.dispatchEvent(new CustomEvent("app-freeze",{detail:{appId:e}}))))}function mo(e){const t=document.getElementById(`app-instance-${e}`),i=zn.get(e);if(i&&i.frozen){i.frozen=!1;const n=window.setTimeout.bind(window),s=window.setInterval.bind(window),a=(r,l)=>{const d=Array.from(r.entries());r.clear(),d.forEach(([c,p])=>{if(Gt.delete(c),l==="iv"){const h=s(p.fn,p.d,...p.args);r.set(h,p)}else{const h=typeof p.expires=="number"?p.expires:null,f=h!=null?h-Date.now():null;if(h!=null&&f<=0){try{p.fn.apply(null,p.args)}catch{}return}const m=n(function(){return r.delete(m),Gt.delete(m),p.fn.apply(null,p.args)},f??p.d,...p.args);r.set(m,p)}})};a(i.timeouts,"to"),a(i.intervals,"iv")}!t||t.dataset.frozen!=="1"||(t.dataset.frozen="0",t.classList.remove("app-frozen"),t.querySelectorAll("iframe").forEach(n=>{try{n.contentWindow&&n.contentWindow.postMessage({type:"APP_RESUME"},"*")}catch{}}),document.dispatchEvent(new CustomEvent("app-resume",{detail:{appId:e}})))}function fa(){vt==="freeze"&&document.querySelectorAll('.app-instance-wrapper[id^="app-instance-"]').forEach(e=>{const t=e.id.replace("app-instance-","");It.has(t)||hr.has(t)||Zn.has(t)?mo(t):Yv(t)})}function Hc(){document.querySelectorAll('.app-instance-wrapper[id^="app-instance-"]').forEach(e=>{mo(e.id.replace("app-instance-",""))})}let _s=!1,Fs=[];const Zn=new Set;function cf(e){Fs=(e||[]).filter(Boolean),!_s&&(It.clear(),Fs.forEach(t=>{It.add(t)}),Fs=[],Zn.forEach(t=>{It.add(t)}),vt==="freeze"?fa():Hc())}function Nc(e){_s!==!!e&&(_s=!!e,_s||(It.clear(),Fs.forEach(t=>{It.add(t)}),Fs=[],Zn.forEach(t=>{It.add(t)})),vt==="freeze"?fa():_s||Hc())}function df(e){const t=zn.get(e);t&&(t.timeouts.forEach((i,n)=>Gt.delete(n)),t.intervals.forEach((i,n)=>Gt.delete(n))),zn.delete(e),It.delete(e),hr.delete(e),Zn.delete(e)}function pf(e){e&&(Zn.delete(e),vt==="freeze"&&fa())}function uf(e){e&&(Zn.add(e),It.add(e),vt==="freeze"&&mo(e))}function Gv(){return vt}function Xv(){return vt==="freeze"}function Uv(){return vt==="freeze"?"智能冻结":"全部实时"}function Kv(e){if(!(e!=="freeze"&&e!=="live")){vt=e;try{localStorage.setItem(of,e)}catch{}e==="freeze"?fa():Hc(),document.dispatchEvent(new CustomEvent("bg-mode-changed",{detail:{mode:e}}))}}typeof window<"u"&&(window.addEventListener("message",e=>{const t=e.data;if(!t||t.type!=="APP_MEDIA_STATE"||typeof t.active!="boolean")return;let i=null;document.querySelectorAll('.app-instance-wrapper[id^="app-instance-"] iframe').forEach(n=>{if(!i)try{n.contentWindow===e.source&&(i=n.closest(".app-instance-wrapper").id.replace("app-instance-",""))}catch{}}),i&&(t.active?hr.add(i):hr.delete(i),vt==="freeze"&&(t.active?mo(i):fa()))}),window.__bgFreeze={mode:Gv,modeName:Uv,isFreezeMode:Xv,setMode:e=>{Kv(e)},liveCount:()=>It.size,frozenCount:()=>document.querySelectorAll('.app-instance-wrapper[data-frozen="1"]').length});const Je=new Map;function Ds(e){const t=Je.get(e);if(!t)return!1;const i=t.querySelectorAll("iframe");for(const n of i)if(!n.dataset||n.dataset.loaded!=="1")return!1;return!0}function qc(e){if(!e)return null;const t=Je.get(e);if(t)return t;const i=F.find(s=>s&&s.id===e);if(!i||!Array.isArray(i.pages)||!i.pages.length)return null;const n=document.createElement("div");return n.className="app-instance-wrapper",n.id=`app-instance-${e}`,n.style.width="100%",n.style.height="100%",n.style.position="absolute",n.style.inset="0",i.pages.forEach((s,a)=>{const r=document.createElement("div");r.className="app-page",r.id=`app-page-${e}-${a}`,r.innerHTML=s.content,n.appendChild(r)}),ff(n,e),u.pageStack.appendChild(n),Je.set(e,n),n.querySelectorAll("iframe").forEach(s=>{window.__syncIframeApp&&window.__syncIframeApp(s)}),n}function Ki(){if(!o.currentApp){Je.forEach(a=>{!a.__actorHosted&&!a.__miniHosted&&(a.style.display="none")});return}const e=o.currentApp.id;Je.forEach((a,r)=>{r!==e&&!a.__actorHosted&&!a.__miniHosted&&(a.style.display="none")});let t=Je.get(e);t||(t=document.createElement("div"),t.className="app-instance-wrapper",t.id=`app-instance-${e}`,t.style.width="100%",t.style.height="100%",t.style.position="absolute",t.style.inset="0",o.currentApp.pages.forEach((r,l)=>{const d=document.createElement("div");d.className="app-page",d.id=`app-page-${e}-${l}`,d.innerHTML=r.content,t.appendChild(d)}),ff(t,e),u.pageStack.appendChild(t),Je.set(e,t),t.querySelectorAll("iframe").forEach(r=>{window.__syncIframeApp&&window.__syncIframeApp(r)})),t.style.display="block";const i=t.querySelectorAll(".app-page"),n=o.navHistory[o.navHistory.length-1],s=o.navHistory.length>1?o.navHistory[o.navHistory.length-2]:-1;i.forEach(a=>{if(a.dataset.tpHosted==="1")return;const r=parseInt(a.id.slice(a.id.lastIndexOf("-")+1),10);Number.isNaN(r)||(r===n?(a.style.transform="translate3d(0, 0, 0) scale(1)",a.style.opacity="1",a.style.filter="",a.style.borderRadius="0",a.style.boxShadow="",a.style.overflow="",a.style.zIndex="2",a.style.pointerEvents="auto"):r===s?(a.style.transform="translate3d(0, 0, 0) scale(1)",a.style.opacity="1",a.style.filter="brightness(0.65)",a.style.borderRadius="0",a.style.boxShadow="",a.style.zIndex="1",a.style.pointerEvents="none"):(a.style.transform="translate3d(100%, 0, 0)",a.style.opacity="0",a.style.filter="",a.style.borderRadius="0",a.style.boxShadow="",a.style.zIndex="3",a.style.pointerEvents="none"))}),o.navHistory.length>1&&o.currentApp.pages[n]?(u.backBtn.style.display="flex",u.appTitle.textContent=o.currentApp.pages[n].title):(u.backBtn.style.display="none",u.appTitle.textContent=o.currentApp.name),i[n]&&document.dispatchEvent(new CustomEvent("app-page-active",{detail:{appId:e,pageIdx:n}}));try{cf([e])}catch{}}function ff(e,t){Vv();const i=qv(t),n=window.setTimeout,s=window.setInterval,a=window.requestAnimationFrame;window.setTimeout=function(r,l,...d){if(typeof r!="function")return n(r,l,...d);const c=n(r,l,...d);return i.timeouts.set(c,{fn:r,d:l,args:d}),c},window.setInterval=function(r,l,...d){if(typeof r!="function")return s(r,l,...d);const c=s(r,l,...d);return i.intervals.set(c,{fn:r,d:l,args:d}),c},window.requestAnimationFrame=function(r){return a.call(window,l=>{if(!i.frozen)return r(l)})};try{jc(e)}finally{window.setTimeout=n,window.setInterval=s,window.requestAnimationFrame=a}}function jc(e){e.querySelectorAll("script").forEach(t=>{const i=document.createElement("script");i.textContent=t.textContent,t.type&&(i.type=t.type),t.parentNode.replaceChild(i,t)})}function Qv(e=0){const t=o.navHistory.length-e;if(t>1&&o.currentApp){const i=o.navHistory[t-1];u.backBtn.style.display="flex",u.appTitle.textContent=o.currentApp.pages[i]?o.currentApp.pages[i].title:o.currentApp.name}else u.backBtn.style.display="none",o.currentApp&&(u.appTitle.textContent=o.currentApp.name)}const Jv=220,mr=new Map,gr=new Map;function Vc(e,t={}){if(t.onlyIfNoInstance&&Je.has(e))return;const i=mr.get(e);i&&(mr.delete(e),i.forEach(({type:s,fn:a,opts:r})=>{try{document.removeEventListener(s,a,r)}catch{}}));const n=gr.get(e);n&&(gr.delete(e),n.forEach(s=>{try{s()}catch{}}))}typeof window<"u"&&(window.__bindAppDocListener=function(e,t,i,n){typeof i!="function"&&typeof n=="function"&&(t=i,i=n,n=void 0),document.addEventListener(t,i,n);let s=mr.get(e);s||(s=[],mr.set(e,s)),s.push({type:t,fn:i,opts:n})},window.__addAppCleanup=function(e,t){if(typeof t!="function")return;let i=gr.get(e);i||(i=[],gr.set(e,i)),i.push(t)});function Wc(e){!e||!e.querySelectorAll||e.querySelectorAll("iframe").forEach(t=>{try{t.contentWindow&&t.contentWindow.postMessage({type:"APP_CLOSE"},"*")}catch{}})}function hf(e){e.style.display="none",e.removeAttribute("id"),setTimeout(()=>{e&&e.parentNode&&e.parentNode.removeChild(e)},Jv)}function Rn(e){if(Je.has(e)){const t=Je.get(e);Je.delete(e);try{df(e)}catch{}Wc(t),hf(t)}Vc(e),document.dispatchEvent(new CustomEvent("app-instance-destroyed",{detail:{appId:e}}))}function mf(){const e=Array.from(Je.entries());Je.clear(),e.forEach(([t,i])=>{try{df(t)}catch{}Wc(i),hf(i),Vc(t)}),e.forEach(([t])=>{document.dispatchEvent(new CustomEvent("app-instance-destroyed",{detail:{appId:t}}))})}function vr(e){if(!o.currentApp||e>=o.currentApp.pages.length)return;if(o.navHistory[o.navHistory.length-1]===e){o.popInProgress=!1,o.subpageSpring.target!==1&&(o.subpageSpring.setTarget(1),et());return}const t=Kn(ot(.26,1,1));o.subpageSpring.reconfigure(t),o.subpageBackDir=0,o.subpageBackTy=0,o.popInProgress?(o.popInProgress=!1,o.navHistory.push(e),Ki(),o.subpageSpring.setTarget(1)):(o.navHistory.push(e),Ki(),o.subpageSpring.x=0,o.subpageSpring.v=0,o.subpageSpring.setTarget(1,0)),ha(!0),et()}function On(e=0,t={}){if(o.currentApp)if(o.navHistory.length>1){if(o.popInProgress)return;o.popInProgress=!0;const i=Kn(ot(.24,1,1));o.subpageSpring.reconfigure(i),t.fromGesture||(o.subpageBackDir=0,o.subpageBackTy=0),o.subpageSpring.setTarget(0,e),Qv(1),et()}else Bt(0,0,0)}const Zv=Object.freeze(Object.defineProperty({__proto__:null,broadcastAppClose:Wc,clearAllAppInstances:mf,destroyAppInstance:Rn,ensureAppInstance:qc,isAppInstanceWarm:Ds,popSubPage:On,pushSubPage:vr,reactivateScripts:jc,releaseAppListeners:Vc,renderPageStack:Ki},Symbol.toStringTag,{value:"Module"})),gf="ios-desktop:desktop-prefs",Yc=[4,5,6],Gc=[4,5,6,7],Qi=6,vf=3,e0=768,yr=200,wr=150,yf=1.4,wf=2.8,xf=["carousel","classic","tablet"];function xr(e,t,i){return e=Number(e),Number.isFinite(e)?Math.max(t,Math.min(i,e)):t}function t0(){return{cols:"auto",rows:"auto",dockEnabled:!0,dockCount:4,dockRecents:!0,dockMacEffect:!1,dockMagnify:2.25,recentsStyle:"carousel"}}let pe=bf();function bf(){const e=t0();try{const t=localStorage.getItem(gf);if(!t)return e;const i=JSON.parse(t)||{},n=e;(i.cols==="auto"||Yc.indexOf(i.cols)!==-1)&&(n.cols=i.cols),(i.rows==="auto"||Gc.indexOf(i.rows)!==-1)&&(n.rows=i.rows),typeof i.dockEnabled=="boolean"&&(n.dockEnabled=i.dockEnabled),i.dockCount!=null&&(n.dockCount=xr(Math.round(i.dockCount),1,Qi)),typeof i.dockRecents=="boolean"&&(n.dockRecents=i.dockRecents),typeof i.dockMacEffect=="boolean"&&(n.dockMacEffect=i.dockMacEffect);const s=Number(i.dockMagnify);return Number.isFinite(s)&&(n.dockMagnify=xr(s,yf,wf)),xf.indexOf(i.recentsStyle)!==-1&&(n.recentsStyle=i.recentsStyle),n}catch{return e}}function i0(){try{localStorage.setItem(gf,JSON.stringify(pe))}catch{}}function Si(){return{...pe}}function n0(){const e=window.innerWidth||400,t=window.innerHeight||800;return e>=768||t<=520&&e>t?6:4}function s0(){const e=window.innerWidth||400;if(e>=768)return 4;const t=window.innerHeight||800;return t<=520&&e>t?4:6}function Xc(){return pe.cols==="auto"?n0():pe.cols}function Sf(){return pe.rows==="auto"?s0():pe.rows}function a0(){return Xc()*Sf()}function Uc(){return(window.innerWidth||0)>=e0}function r0(e,t,i={}){let n=!1;switch(e){case"cols":if(t!=="auto"&&Yc.indexOf(t)===-1)return!1;pe.cols!==t&&(pe.cols=t,n=!0);break;case"rows":if(t!=="auto"&&Gc.indexOf(t)===-1)return!1;pe.rows!==t&&(pe.rows=t,n=!0);break;case"dockEnabled":if(typeof t!="boolean")return!1;pe.dockEnabled!==t&&(pe.dockEnabled=t,n=!0);break;case"dockCount":{const s=xr(Math.round(t),1,Qi);pe.dockCount!==s&&(pe.dockCount=s,n=!0);break}case"dockRecents":if(typeof t!="boolean")return!1;pe.dockRecents=t;break;case"dockMacEffect":if(typeof t!="boolean")return!1;pe.dockMacEffect=t;break;case"dockMagnify":{const s=Number(t);if(!Number.isFinite(s))return!1;pe.dockMagnify=xr(s,yf,wf);break}case"recentsStyle":if(xf.indexOf(t)===-1)return!1;pe.recentsStyle!==t&&(pe.recentsStyle=t);break;default:return!1}if(i0(),n&&o0(),!i.silent)try{window.dispatchEvent(new CustomEvent("desktop-prefs-changed",{detail:{key:e,value:t,gridChanged:n}}))}catch{}return!0}function o0(){const e=a0();if(!e||e<1)return!1;const t=[];for(const n of o.pagesApps){const s=n.slice().sort((a,r)=>(a.slot??0)-(r.slot??0));for(const a of s)t.push(a)}const i=[];for(let n=0;n<t.length;n+=e){const s=t.slice(n,n+e).map((a,r)=>({...a,slot:r}));i.push(s)}return i.length||i.push([]),o.pagesApps=i,o.currentPage>=i.length&&(o.currentPage=i.length-1),Qe(),!0}typeof window<"u"&&(window.__desktopPrefsInternal={reload:()=>(pe=bf(),Si())},globalThis.__effGridCols=Xc);function tt(){u.desktopSlider.innerHTML="",u.pageDots.innerHTML="",o.pagesApps.forEach((e,t)=>{const i=document.createElement("div");i.className="page-grid",i.dataset.page=t,i.style.gridTemplateColumns=`repeat(${Xc()}, 1fr)`,i.style.gridTemplateRows=`repeat(${Sf()}, 1fr)`,e.forEach((s,a)=>{if(Hn(s)){const h=If(s,t,a);o.isEditMode&&h.classList.add("jiggling"),i.appendChild(h);return}const r=document.createElement("div");r.className="app-icon"+(o.isEditMode?" jiggling":""),r.dataset.page=t,r.dataset.index=a,r.dataset.id=s.id,r.dataset.slot=s.slot??0,r.setAttribute("role","button"),r.setAttribute("tabindex","0"),r.setAttribute("aria-label",`${s.name}应用`);const l=Ui(),d=Math.floor((s.slot??0)/l)+1,c=(s.slot??0)%l+1;r.style.gridArea=`${d} / ${c}`;const p=s.customIcon?s.customIcon:s.type?Ye(s.type,!1):J(s.id);r.innerHTML=`
        <div class="icon-box">
          ${p}
        </div>
        <span>${s.name}</span>
        <div class="remove-badge" data-id="${s.id}" data-page="${t}">×</div>
      `,_f(r,s),r.addEventListener("keydown",h=>{(h.key==="Enter"||h.key===" ")&&(h.preventDefault(),!o.isEditMode&&!o.isOpen&&kf(t,a,r))}),i.appendChild(r)}),u.desktopSlider.appendChild(i);const n=document.createElement("div");n.className="dot"+(t===o.currentPage?" active":""),u.pageDots.appendChild(n)}),u.pageDots.setAttribute("aria-hidden","true"),ct(o.currentPage,!1)}function ct(e,t=!0){o.currentPage=M(e,0,o.pagesApps.length-1),t||(u.desktopSlider.style.transition="none",requestAnimationFrame(()=>requestAnimationFrame(()=>{u.desktopSlider.style.transition=""}))),u.desktopSlider.style.transform=`translate3d(${-o.currentPage*100}vw, 0, 0)`,Array.from(u.pageDots.children).forEach((i,n)=>{i.classList.toggle("active",n===o.currentPage)})}const Y={active:!1,basePageF:0,pageF:0,startX:0,lastX:0,lastT:0,velX:0,winW:0,seeded:!1};function l0(){const e=getComputedStyle(u.desktopSlider).transform;if(!e||e==="none")return 0;const t=e.match(/matrix(?:3d)?\(([^)]+)\)/);if(!t)return 0;const i=t[1].split(",").map(parseFloat);return i.length>=16?i[12]:i.length>=6?i[4]:0}function Zs(e){const t=window.innerWidth||1,i=l0();Y.active=!0,Y.winW=t,Y.basePageF=-i/t,Y.pageF=Y.basePageF,Y.startX=e,Y.lastX=e,Y.lastT=performance.now(),Y.velX=0,Y.seeded=!1,u.desktopSlider.style.transition="none"}function Ji(e){if(!Y.active)return;const t=performance.now(),i=Math.max(1,t-Y.lastT);if(Y.seeded){const a=(e-Y.lastX)/i;Y.velX=Y.velX*.65+a*.35}Y.seeded=!0,Y.lastX=e,Y.lastT=t;const n=Math.max(0,o.pagesApps.length-1);let s=Y.basePageF-(e-Y.startX)/Y.winW;s<0?s*=.35:s>n&&(s=n+(s-n)*.35),Y.pageF=s,u.desktopSlider.style.transform=`translate3d(${(-s*Y.winW).toFixed(1)}px, 0, 0)`}function Ni(){if(!Y.active)return;Y.active=!1;const e=Y.winW,t=Math.max(0,o.pagesApps.length-1),i=Y.pageF-Y.velX*140/e,n=Math.round(M(i,0,t));o.currentPage=M(n,0,t),u.desktopSlider.style.transition="",ct(o.currentPage,!0)}function c0(){return Y.active}function Ka(){for(let e=o.pagesApps.length-1;e>0&&o.pagesApps[e].length===0;e--)o.pagesApps.splice(e,1);o.currentPage>=o.pagesApps.length&&(o.currentPage=o.pagesApps.length-1),tt()}function kf(e,t,i){const n=o.pagesApps[e][t];if(!n)return;const s=F.findIndex(a=>a.id===n.id);s!==-1&&j(s,i)}function Ef(){let e=Ui(),t=null;const i=()=>{t=null;const n=Ui();n!==e&&(e=n,tt())};window.addEventListener("resize",()=>{t&&clearTimeout(t),t=setTimeout(i,220)},{passive:!0}),window.addEventListener("desktop-prefs-changed",n=>{n&&n.detail&&n.detail.gridChanged&&tt()})}const GS=Object.freeze(Object.defineProperty({__proto__:null,beginLiveSwipe:Zs,cleanupEmptyPages:Ka,initResponsiveGrid:Ef,isLiveSwipeActive:c0,moveLiveSwipe:Ji,openAppByData:kf,renderDesktopPages:tt,settleLiveSwipe:Ni,switchDesktopPage:ct},Symbol.toStringTag,{value:"Module"})),tp=500;function Cl(e){const t=Ui(),i=24/t,n=e.getBoundingClientRect();return{cols:t,rows:i,cellW:n.width/t,cellH:n.height/i}}let Re=null,zs=null,Qa=null;function Kc(){o.isEditMode=!0,document.querySelectorAll(".app-icon, .app-folder").forEach(e=>{e.classList.add("jiggling")}),navigator.vibrate&&navigator.vibrate(40)}function d0(){o.isEditMode=!1,o.iconDragState=null,document.querySelectorAll(".app-icon, .app-folder").forEach(e=>{e.classList.remove("jiggling")}),tt()}function _f(e,t){let i=0,n=0,s=!1,a=!1;const r=e.querySelector(".remove-badge");r&&(r.addEventListener("click",m=>{m.stopPropagation(),m.preventDefault();const y=parseInt(r.dataset.page,10);Lf(y,t.id)}),r.addEventListener("pointerdown",m=>{m.stopPropagation()}));let l=0;const d=()=>{const m=performance.now();if(m-l<300)return;l=m;const y=F.findIndex(g=>g.id===t.id);y!==-1&&j(y,e)};e.addEventListener("click",m=>{o.iconDragState||s||Hn(t)||o.isEditMode||(m.stopPropagation(),d())});let c=0;const p=m=>{o.isOpen&&!o.isClosing||o.iconDragState||m.target.closest(".remove-badge")||(i=m.clientX,n=m.clientY,c=performance.now(),s=!1,a=!1,o.isEditMode||(e.style.transform="scale(0.92)",e.style.transition="transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)"),o.isEditMode?o.longPressTimer=setTimeout(()=>{o.iconDragState||(a=!0,Ko(e,t,i,n))},60):o.longPressTimer=setTimeout(()=>{!s&&!o.iconDragState&&(Kc(),a=!0,Ko(e,t,i,n))},380))},h=m=>{const y=Math.hypot(m.clientX-i,m.clientY-n);o.isEditMode?y>4&&!a&&!o.iconDragState&&(o.longPressTimer&&(clearTimeout(o.longPressTimer),o.longPressTimer=null),a=!0,Ko(e,t,m.clientX,m.clientY)):y>8&&(s=!0,!a&&o.longPressTimer&&(clearTimeout(o.longPressTimer),o.longPressTimer=null),e.style.transform&&(e.style.transform=""))},f=m=>{const y=performance.now()-c;o.longPressTimer&&(clearTimeout(o.longPressTimer),o.longPressTimer=null),!o.isEditMode&&e.style.transform&&(e.style.transform=""),!o.isEditMode&&!s&&!a&&!o.iconDragState&&!Hn(t)&&y<350&&(o.isClosing||o.isOpen&&o.scaleSpring.x<.96)&&d()};e.addEventListener("pointerdown",p),e.addEventListener("pointermove",h),e.addEventListener("pointerup",f),e.addEventListener("pointercancel",f),e.addEventListener("contextmenu",m=>{m.preventDefault(),m.stopPropagation(),o.isEditMode||he(()=>Promise.resolve().then(()=>Zw),void 0,import.meta.url).then(y=>y.showContextMenu(t,e,m.clientX,m.clientY))})}function p0(e,t,i){let n=0,s=0,a=!1,r=!1,l=0;const d=()=>{const m=performance.now();if(m-l<300)return;l=m;const y=F.findIndex(g=>g.id===t.id);y!==-1&&j(y,e)};e.addEventListener("click",m=>{o.iconDragState||a||o.isEditMode||(m.stopPropagation(),d())});let c=0;const p=m=>{o.isOpen&&!o.isClosing||o.iconDragState||(n=m.clientX,s=m.clientY,c=performance.now(),a=!1,r=!1,o.isEditMode||(e.style.transform="scale(0.92)",e.style.transition="transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)"),o.isEditMode?o.longPressTimer=setTimeout(()=>{o.iconDragState||(r=!0,Qo(e,t,i,n,s))},60):o.longPressTimer=setTimeout(()=>{!a&&!o.iconDragState&&(Kc(),r=!0,Qo(e,t,i,n,s))},380))},h=m=>{const y=Math.hypot(m.clientX-n,m.clientY-s);o.isEditMode?y>4&&!r&&!o.iconDragState&&(o.longPressTimer&&(clearTimeout(o.longPressTimer),o.longPressTimer=null),r=!0,Qo(e,t,i,m.clientX,m.clientY)):y>8&&(a=!0,!r&&o.longPressTimer&&(clearTimeout(o.longPressTimer),o.longPressTimer=null),e.style.transform&&(e.style.transform=""))},f=()=>{const m=performance.now()-c;o.longPressTimer&&(clearTimeout(o.longPressTimer),o.longPressTimer=null),!o.isEditMode&&e.style.transform&&(e.style.transform=""),!o.isEditMode&&!a&&!r&&!o.iconDragState&&m<350&&(o.isClosing||o.isOpen&&o.scaleSpring.x<.96)&&d()};e.addEventListener("pointerdown",p),e.addEventListener("pointermove",h),e.addEventListener("pointerup",f),e.addEventListener("pointercancel",f)}function Ko(e,t,i,n){const s=e.getBoundingClientRect();if(s.width===0||s.height===0)return;const a=parseInt(e.dataset.page,10)||0,r=parseInt(e.dataset.slot,10)||0,l=e.cloneNode(!0);l.classList.add("dragging-active");const d=l.querySelector(".remove-badge");d&&d.remove(),l.style.width=`${s.width}px`,l.style.height=`${s.height}px`,l.style.left="0px",l.style.top="0px",l.style.transform=`translate3d(${s.left}px, ${s.top}px, 0) scale(1.15)`,document.body.appendChild(l),e.classList.add("placeholder"),o.iconDragState={mode:"desktop",source:"desktop",originalPage:a,originalSlot:r,targetPage:a,targetSlot:r,app:t,element:l,placeholderEl:e,offsetX:i-s.left,offsetY:n-s.top,lastX:i,lastY:n,prevMoveX:i,prevMoveY:n,smoothVx:0,smoothVy:0,isAddToFolder:!1,targetFolder:null,isCreateFolder:!1,targetApp:null},window.addEventListener("pointermove",Qc,{passive:!1}),window.addEventListener("pointerup",$n),window.addEventListener("pointercancel",$n)}function Qo(e,t,i,n,s){const a=e.getBoundingClientRect();if(a.width===0||a.height===0)return;const r=parseInt(e.dataset.folderIdx,10)||0,l=e.cloneNode(!0);l.classList.add("dragging-active"),l.style.width=`${a.width}px`,l.style.height=`${a.height}px`,l.style.left="0px",l.style.top="0px",l.style.transform=`translate3d(${a.left}px, ${a.top}px, 0) scale(1.15)`,document.body.appendChild(l),e.classList.add("placeholder"),o.iconDragState={mode:"folder",source:"folder",folder:i,folderIdx:r,targetFolderIdx:r,originalPage:o.currentPage,targetPage:o.currentPage,targetSlot:i.slot??0,app:t,element:l,placeholderEl:e,offsetX:n-a.left,offsetY:s-a.top,lastX:n,lastY:s,prevMoveX:n,prevMoveY:s,smoothVx:0,smoothVy:0,isAddToFolder:!1,targetFolder:null,isCreateFolder:!1,targetApp:null},window.addEventListener("pointermove",Qc,{passive:!1}),window.addEventListener("pointerup",$n),window.addEventListener("pointercancel",$n)}let vn=0;function u0(){vn||(vn=requestAnimationFrame(()=>{vn=0;const e=o.iconDragState;e&&e.pendingCheckX!=null&&e.pendingCheckY!=null&&Tf(e.pendingCheckX,e.pendingCheckY,e)}))}function f0(){vn&&(cancelAnimationFrame(vn),vn=0);const e=o.iconDragState;e&&e.pendingCheckX!=null&&e.pendingCheckY!=null&&Tf(e.pendingCheckX,e.pendingCheckY,e)}function Qc(e){if(!o.iconDragState)return;e.cancelable&&e.preventDefault();const t=e.clientX,i=e.clientY,n=o.iconDragState,s=t-n.prevMoveX,a=i-n.prevMoveY;n.prevMoveX=t,n.prevMoveY=i,n.smoothVx=n.smoothVx*.6+s*.4,n.smoothVy=n.smoothVy*.6+a*.4;const r=M(n.smoothVx*.4,-14,14),l=M(-n.smoothVy*.35,-12,12),d=M(n.smoothVx*.35,-12,12);n.lastX=t,n.lastY=i;const c=t-n.offsetX,p=i-n.offsetY;n.element.style.transform=`translate3d(${c.toFixed(1)}px, ${p.toFixed(1)}px, 0) scale(1.15) rotateZ(${r.toFixed(1)}deg) rotateX(${l.toFixed(1)}deg) rotateY(${d.toFixed(1)}deg)`,n.pendingCheckX=t,n.pendingCheckY=i,u0()}function Tf(e,t,i){if(i.mode==="folder"){const s=u.folderOverlay.querySelector(".folder-panel");if(s){const a=s.getBoundingClientRect(),r=12;if(e<a.left-r||e>a.right+r||t<a.top-r||t>a.bottom+r){navigator.vibrate&&navigator.vibrate(30),i.mode="desktop",Mf(),Bf();const d=u.desktopSlider.children[o.currentPage];if(d){const c=d.getBoundingClientRect(),p=Cl(d),h=M(Math.floor((e-c.left)/p.cellW),0,p.cols-1),f=M(Math.floor((t-c.top)/p.cellH),0,p.rows-1);i.targetSlot=M(f*p.cols+h,0,23),Pl(d,i.targetSlot),Il(d,i)}return}h0(e,t,i);return}}const n=u.desktopSlider.children[o.currentPage];if(n){const s=n.getBoundingClientRect(),a=Cl(n),r=M(Math.floor((e-s.left)/a.cellW),0,a.cols-1),l=M(Math.floor((t-s.top)/a.cellH),0,a.rows-1),d=M(l*a.cols+r,0,23),c=i.targetSlot,p=i.targetPage;i.targetPage=o.currentPage,i.targetSlot=d,(c!==d||p!==o.currentPage)&&(Pl(n,d),Il(n,i))}v0(e,t)}function h0(e,t,i){const n=u.folderGrid;if(!n||!i.folder||!i.folder.apps)return;const s=Array.from(n.querySelectorAll(".app-icon"));if(s.length===0)return;let a=0,r=1/0;s.forEach((d,c)=>{const p=d.getBoundingClientRect(),h=p.left+p.width/2,f=p.top+p.height/2,m=Math.hypot(e-h,t-f);m<r&&(r=m,a=c)});const l=M(a,0,i.folder.apps.length-1);i.targetFolderIdx!==l&&(i.targetFolderIdx=l,m0(n,i.folderIdx,l))}function m0(e,t,i){const n=Array.from(e.querySelectorAll(".app-icon"));n.length!==0&&n.forEach(s=>{if(s.classList.contains("placeholder"))return;const a=parseInt(s.dataset.folderIdx,10);let r=a;t<i?a>t&&a<=i&&(r=a-1):t>i&&a>=i&&a<t&&(r=a+1);const l=n[a],d=n[r];if(l&&d&&a!==r){const c=d.offsetLeft-l.offsetLeft,p=d.offsetTop-l.offsetTop;s.style.translate=`${c.toFixed(1)}px ${p.toFixed(1)}px`}else s.style.translate=""})}function Mf(){u.folderGrid&&u.folderGrid.querySelectorAll(".app-icon").forEach(e=>{e.style.translate="",e.style.transform=""})}function Il(e,t){Jc(),t.isAddToFolder=!1,t.targetFolder=null,t.isCreateFolder=!1,t.targetApp=null;const n=(o.pagesApps[t.targetPage]||[]).find(s=>s.slot===t.targetSlot&&s.id!==t.app.id);n&&!Hn(t.app)&&(Hn(n)?zs=setTimeout(()=>{o.iconDragState&&o.iconDragState.targetSlot===t.targetSlot&&o.iconDragState.targetPage===t.targetPage&&(t.isAddToFolder=!0,t.targetFolder=n,ip(e,n.id))},tp):zs=setTimeout(()=>{o.iconDragState&&o.iconDragState.targetSlot===t.targetSlot&&o.iconDragState.targetPage===t.targetPage&&(t.isCreateFolder=!0,t.targetApp=n,ip(e,n.id))},tp)),g0(e,t)}function g0(e,t){const i=Ui(),n=e.clientWidth/i,s=e.clientHeight/(24/i),a=t.source==="desktop"&&t.originalPage===t.targetPage;for(const r of e.children){if(!r.dataset||!r.dataset.id||r.classList.contains("placeholder")||r===Re||r.dataset.id===t.app.id)continue;const d=parseInt(r.dataset.slot,10);let c=d;if(t.isAddToFolder||t.isCreateFolder){r.style.translate="",r.style.transform="";continue}if(a){const k=t.originalSlot,S=t.targetSlot;k<S?d>k&&d<=S&&(c=d-1):k>S&&d>=S&&d<k&&(c=d+1)}else d>=t.targetSlot&&(c=d+1);const p=Ui(),h=d%p,f=Math.floor(d/p),m=c%p,y=Math.floor(c/p),g=(m-h)*n,w=(y-f)*s;g!==0||w!==0?r.style.translate=`${g.toFixed(1)}px ${w.toFixed(1)}px`:r.style.translate=""}}function Al(){const e=u.desktopSlider.children[o.currentPage];if(e)for(const t of e.children)t.style&&(t.style.translate="",t.style.transform="")}function ip(e,t){Jc();for(const i of e.children)if(i.dataset&&i.dataset.id===t){i.classList.add("folder-candidate"),Qa=i,navigator.vibrate&&navigator.vibrate(25);break}}function Jc(){zs&&(clearTimeout(zs),zs=null),Qa&&(Qa.classList.remove("folder-candidate"),Qa=null)}function Pl(e,t){Re||(Re=document.createElement("div"),Re.className="drop-indicator"),Re.parentNode!==e&&(Re.parentNode&&Re.parentNode.removeChild(Re),e.appendChild(Re));const i=Ui(),n=Math.floor(t/i)+1,s=t%i+1;Re.style.gridArea=`${n} / ${s}`}function Bl(){Re&&Re.parentNode&&Re.parentNode.removeChild(Re)}function v0(e,t){const n=window.innerWidth;e<48&&o.currentPage>0?(u.edgeLeft.classList.add("active"),o.edgePagingTimer||(o.edgePagingTimer=setTimeout(()=>{Al(),Bl(),ct(o.currentPage-1),o.edgePagingTimer=null,np(e,t)},300))):e>n-48?(u.edgeRight.classList.add("active"),o.edgePagingTimer||(o.edgePagingTimer=setTimeout(()=>{Al(),Bl(),o.currentPage===o.pagesApps.length-1&&o.pagesApps.push([]),ct(o.currentPage+1),o.edgePagingTimer=null,np(e,t)},300))):(u.edgeLeft.classList.remove("active"),u.edgeRight.classList.remove("active"),o.edgePagingTimer&&(clearTimeout(o.edgePagingTimer),o.edgePagingTimer=null))}function np(e,t){if(!o.iconDragState)return;u.edgeLeft.classList.remove("active"),u.edgeRight.classList.remove("active"),o.iconDragState.targetPage=o.currentPage;const i=u.desktopSlider.children[o.currentPage];if(i){const n=i.getBoundingClientRect(),s=Cl(i),a=M(Math.floor((e-n.left)/s.cellW),0,s.cols-1),r=M(Math.floor((t-n.top)/s.cellH),0,s.rows-1);o.iconDragState.targetSlot=M(r*s.cols+a,0,23),Pl(i,o.iconDragState.targetSlot),Il(i,o.iconDragState)}}function y0(){const e=o.iconDragState;if(e.mode==="folder"){const{folder:h,folderIdx:f,targetFolderIdx:m}=e;if(f!==m){const y=h.apps.splice(f,1)[0];h.apps.splice(m,0,y),h.apps.forEach((g,w)=>g.slot=w),Qe()}return}if(e.source==="folder"&&e.mode==="desktop"){const{folder:h,app:f,targetPage:m,targetSlot:y,isAddToFolder:g,targetFolder:w,isCreateFolder:k,targetApp:S}=e,b=h.apps.findIndex(_=>_.id===f.id);if(b!==-1&&h.apps.splice(b,1),h.apps.forEach((_,A)=>_.slot=A),g&&w)f.slot=w.apps.length,w.apps.push(f);else if(k&&S){const _=o.pagesApps[m],A=_.findIndex(I=>I.id===S.id);if(A!==-1){const I=zl(y);I.apps.push({...S,slot:0}),I.apps.push({...f,slot:1}),_.splice(A,1),_.push(I)}}else{const _=o.pagesApps[m];if(_.findIndex(I=>I.slot===y)!==-1)for(const I of _)I.slot>=y&&(I.slot+=1);f.slot=y,_.push(f)}td(h),Qe();return}const{originalPage:t,originalSlot:i,targetPage:n,targetSlot:s,app:a,isAddToFolder:r,targetFolder:l,isCreateFolder:d,targetApp:c}=e,p=o.pagesApps[t].findIndex(h=>h.id===a.id);if(p!==-1){if(r&&l){o.pagesApps[t].splice(p,1),a.slot=l.apps.length,l.apps.push(a),Qe();return}if(d&&c){const h=o.pagesApps[n],f=h.findIndex(m=>m.id===c.id);if(f!==-1){const m=zl(s);m.apps.push({...c,slot:0}),m.apps.push({...a,slot:1}),h.splice(f,1);const y=o.pagesApps[t].findIndex(g=>g.id===a.id);y!==-1&&o.pagesApps[t].splice(y,1),h.push(m),Qe();return}}if(!(t===n&&i===s)){if(t===n){const h=o.pagesApps[n];if(h.findIndex(m=>m.slot===s&&m.id!==a.id)!==-1)if(i<s)for(const m of h)m.id!==a.id&&m.slot>i&&m.slot<=s&&(m.slot-=1);else for(const m of h)m.id!==a.id&&m.slot>=s&&m.slot<i&&(m.slot+=1);a.slot=s}else{const h=o.pagesApps[n];if(h.findIndex(m=>m.slot===s)!==-1)for(const m of h)m.slot>=s&&(m.slot+=1);o.pagesApps[t].splice(p,1),a.slot=s,h.push(a)}Qe()}}}function $n(){if(!o.iconDragState)return;f0(),o.edgePagingTimer&&(clearTimeout(o.edgePagingTimer),o.edgePagingTimer=null);const e=o.iconDragState,t=e.element,i=e.isAddToFolder,n=e.isCreateFolder,s=e.targetFolder?e.targetFolder.id:null,a=e.mode==="folder";if(Jc(),Al(),Mf(),u.edgeLeft.classList.remove("active"),u.edgeRight.classList.remove("active"),window.removeEventListener("pointermove",Qc),window.removeEventListener("pointerup",$n),window.removeEventListener("pointercancel",$n),y0(),Bl(),a){ed(e.folder);const d=u.folderGrid.children[e.targetFolderIdx];if(d){const c=d.getBoundingClientRect();t.style.transition="transform 0.24s cubic-bezier(0.2, 0.95, 0.25, 1.05)",t.style.transform=`translate3d(${c.left.toFixed(1)}px, ${c.top.toFixed(1)}px, 0) scale(1)`,setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t),o.iconDragState=null},240);return}t.parentNode&&t.parentNode.removeChild(t),o.iconDragState=null;return}if(tt(),i||n){const d=s?document.querySelector(`[data-id="${s}"]`):document.querySelector(`[data-slot="${e.targetSlot}"]`);if(d){const c=d.getBoundingClientRect();t.style.transition="transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease",t.style.transform=`translate3d(${c.left.toFixed(1)}px, ${c.top.toFixed(1)}px, 0) scale(0.3)`,t.style.opacity="0"}else t.style.transition="opacity 0.2s ease",t.style.opacity="0";setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t),Ka(),o.iconDragState=null},240);return}const r=u.desktopSlider.children[e.targetPage];let l=null;if(r){for(const d of r.children)if(d.dataset&&d.dataset.id===e.app.id){l=d;break}}if(l){const d=l.getBoundingClientRect();l.style.visibility="hidden",t.style.transition="transform 0.26s cubic-bezier(0.2, 0.95, 0.25, 1.05)",t.style.transform=`translate3d(${d.left.toFixed(1)}px, ${d.top.toFixed(1)}px, 0) scale(1) rotate(0deg)`,setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t),l.style.visibility="",l.classList.add("landing-settle"),navigator.vibrate&&navigator.vibrate(15),setTimeout(()=>l.classList.remove("landing-settle"),300),Ka(),o.iconDragState=null},260)}else t.parentNode&&t.parentNode.removeChild(t),Ka(),o.iconDragState=null}function Lf(e,t){const i=o.pagesApps[e];if(!i)return;const n=i.findIndex(a=>a.id===t);if(n===-1)return;const s=i.splice(n,1)[0];o.removedApps||(o.removedApps=[]),o.removedApps.push(s);try{localStorage.setItem("ios-desktop:removed-apps",JSON.stringify(o.removedApps))}catch{}Qe(),tt()}function w0(e){if(!o.removedApps)return;const t=o.removedApps.findIndex(r=>r.id===e);if(t===-1)return;const i=o.removedApps.splice(t,1)[0];let n=o.pagesApps[o.pagesApps.length-1];const s=new Set(n.map(r=>r.slot??0));let a=0;for(;a<24&&s.has(a);)a++;a>=24&&(n=[],o.pagesApps.push(n),a=0),i.slot=a,n.push(i);try{localStorage.setItem("ios-desktop:removed-apps",JSON.stringify(o.removedApps))}catch{}Qe(),tt()}const Rs=new Set;let Fl=null,Dl=0;function Cf(e){let t=(e-Dl)/1e3;Dl=e,(!Number.isFinite(t)||t<0)&&(t=0),t>.25&&(t=.25),Array.from(Rs).forEach(i=>{try{i(t,e)}catch{Rs.delete(i)}}),Fl=Rs.size>0?requestAnimationFrame(Cf):null}function x0(e){return Rs.add(e),Fl===null&&(Dl=performance.now(),Fl=requestAnimationFrame(Cf)),()=>{Rs.delete(e)}}const sp={emphasized:[.2,0,0,1],decel:[.05,.7,.1,1],gentle:[.2,.9,.25,1.02]};function ee(e){const t=sp[e]||sp.emphasized;return`cubic-bezier(${t[0]}, ${t[1]}, ${t[2]}, ${t[3]})`}function Q(e){const t=ca();return Math.max(16,Math.round(e/(Number.isFinite(t)&&t>0?t:1)))}function fe(e,t){const i=setTimeout(t,Q(e));return()=>clearTimeout(i)}function Ja(e){const{from:t,to:i,velocity:n=0,params:s,onUpdate:a,onComplete:r=null,onApproach:l=null,approachAt:d=.42,posEps:c=.004,velEps:p=.6}=e,h=new Ie({...s,initialValue:t,initialVelocity:n});h.target=i;const f=i-t,m=Math.abs(f);let y=m<1e-9,g=!1,w=!0;const k=1/120,S=30;let b=0;const _=x0(A=>{if(!w||g)return;b+=A;let I=0;for(;b>=k&&I<S;)h.update(k),b-=k,I++;if(b>=k&&(b=0),a(h.x,h.v),!y&&m>1e-9&&Math.abs(i-h.x)<=m*d){y=!0;try{l()}catch{}}if(h.isSettled(c,p)&&(h.x=i,h.v=0,a(i,0),g=!0,w=!1,_(),r))try{r()}catch{}});return{retarget(A,I=null){w&&h.setTarget(A,I)},cancel(){w=!1,g=!0,_()},isSettled(){return g}}}function Zc(e){const{el:t,from:i,to:n,fromRadius:s=36,params:a,velocity:r=null,onComplete:l=null,onApproach:d=null,approachAt:c=.42}=e,p=r&&typeof r=="object"?r:{x:0,y:0,s:0},h=n.opacity!==void 0||i.opacity!==void 0,f=h&&i.opacity!==void 0?i.opacity:1,m=h&&n.opacity!==void 0?n.opacity:1,y=n.scale-i.scale;let g={tx:i.tx,ty:i.ty,scale:i.scale};function w(){const D=g.scale;if(t.style.transform=`translate3d(${g.tx.toFixed(2)}px, ${g.ty.toFixed(2)}px, 0) scale(${D.toFixed(4)})`,h){const T=y!==0?(D-i.scale)/y:1,G=Math.max(0,Math.min(1,T));t.style.opacity=(f+(m-f)*G).toFixed(3)}if(n.radius!==void 0){const T=y!==0?(D-i.scale)/y:1,G=Math.max(0,Math.min(1,T));t.style.borderRadius=(s+(n.radius-s)*G).toFixed(1)+"px"}}let k=3,S=!1;const b=()=>{if(!(S||k>0)&&(S=!0,l))try{l()}catch{}},_=()=>{k--,b()};let A=!1;const I=()=>{if(!A&&(A=!0,d))try{d()}catch{}},q=[Ja({from:i.tx,to:n.tx,velocity:p.x||0,params:a,onUpdate:D=>{g.tx=D},onComplete:_,onApproach:I,approachAt:c}),Ja({from:i.ty,to:n.ty,velocity:p.y||0,params:a,onUpdate:D=>{g.ty=D},onComplete:_,onApproach:I,approachAt:c}),Ja({from:i.scale,to:n.scale,velocity:p.s||0,params:a,onUpdate:D=>{g.scale=D,w()},onComplete:_,onApproach:I,approachAt:c})];return w(),{retarget(D,T=null){q[0].retarget(D.tx,T?T.x??null:null),q[1].retarget(D.ty,T?T.y??null:null),q[2].retarget(D.scale,T?T.s??null:null),T&&Object.assign(p,{x:T.x||0,y:T.y||0,s:T.s||0})},cancel(){q.forEach(D=>D.cancel())},isSettled(){return S}}}let Kt=null;function go(){Kt&&(Kt.cancel(),Kt=null)}let ap=0,He=null,ui=null,fi=null;function zl(e){return ap++,{id:`folder_${Date.now()}_${ap}`,name:"文件夹",type:"folder",apps:[],slot:e}}function Hn(e){return e&&e.type==="folder"}function If(e,t,i){const n=document.createElement("div");n.className="app-folder"+(o.isEditMode?" jiggling":""),n.dataset.page=t,n.dataset.index=i,n.dataset.id=e.id,n.dataset.slot=e.slot??0;const s=Math.floor((e.slot??0)/4)+1,a=(e.slot??0)%4+1;n.style.gridArea=`${s} / ${a}`;const r=e.apps.slice(0,9);let l="";for(let d=0;d<9;d++)if(d<r.length){const c=r[d];c.type==="clock"?l+=`<div class="folder-thumb">${Ye("clock",!1)}</div>`:c.type==="calendar"?l+=`<div class="folder-thumb">${Ye("calendar",!1)}</div>`:l+=`<div class="folder-thumb">${J(c.id)}</div>`}else l+='<div class="folder-thumb empty"></div>';return n.innerHTML=`
    <div class="folder-icon">${l}</div>
    <span>${e.name}</span>
  `,n.addEventListener("click",d=>{o.iconDragState||o.isDragging||(d.stopPropagation(),ed(e,n))}),_f(n,e),n}function Af(e){u.folderGrid.innerHTML="",e.apps.forEach((t,i)=>{const n=document.createElement("div");n.className="app-icon"+(o.isEditMode?" jiggling":""),n.dataset.folderIdx=i,n.dataset.appId=t.id,n.dataset.id=t.id;let s="";t.type==="clock"||t.type==="calendar"?s=Ye(t.type,!1):s=J(t.id),n.innerHTML=`
      <div class="icon-box">${s}</div>
      <span>${t.name}</span>
    `,p0(n,t,e),u.folderGrid.appendChild(n)})}function ed(e,t=null){o.currentApp&&(o.isOpen||o.isClosing)&&ia(),He=e;const i=t||document.querySelector(`[data-id="${e.id}"]`);ui=i;const n=i?i.getBoundingClientRect():null;fi=n,u.folderTitle.textContent=e.name,u.folderTitle.dataset.folderId=e.id,u.folderTitle.style.cursor="pointer",u.folderTitle.onclick=()=>Pf(e),Af(e),u.folderOverlay.style.background="",u.folderOverlay.style.backdropFilter="",u.folderOverlay.style.webkitBackdropFilter="",u.folderOverlay.style.pointerEvents="auto",u.folderOverlay.style.opacity="",u.folderOverlay.style.transition="";const s=u.folderOverlay.querySelector(".folder-panel");if(s&&n&&n.width>0){const a=window.innerWidth/2,r=window.innerHeight/2,l=n.left+n.width/2,d=n.top+n.height/2,c=l-a,p=d-r,h=.2;s.style.transition="none",s.style.transform=`translate3d(${c.toFixed(1)}px, ${p.toFixed(1)}px, 0) scale(${h.toFixed(3)})`,s.style.opacity="0",s.style.borderRadius="36px",u.folderOverlay.classList.add("active"),go(),Kt=Zc({el:s,from:{tx:c,ty:p,scale:h,opacity:0},to:{tx:0,ty:0,scale:1,opacity:1,radius:28},fromRadius:36,params:Ke(),onComplete:()=>{Kt=null,s.style.transition="",s.style.transform="",s.style.opacity="",s.style.borderRadius=""}})}else u.folderOverlay.classList.add("active")}function Pf(e){const t=prompt("文件夹名称",e.name);t&&t.trim()&&(e.name=t.trim(),Qe(),u.folderTitle.textContent=e.name,tt())}function Bf(e=null){if(!u.folderOverlay.classList.contains("active"))return;const t=u.folderOverlay.querySelector(".folder-panel"),i=ui||(He?document.querySelector(`[data-id="${He.id}"]`):null),n=i?i.getBoundingClientRect():fi;if(u.folderOverlay.style.background="transparent",u.folderOverlay.style.backdropFilter="none",u.folderOverlay.style.webkitBackdropFilter="none",u.folderOverlay.style.pointerEvents="none",t&&n&&n.width>0){const s=window.innerWidth/2,a=window.innerHeight/2,r=n.left+n.width/2,l=n.top+n.height/2,d=r-s,c=l-a,p=.2,h=t.getBoundingClientRect(),f=h.left+h.width/2,m=h.top+h.height/2,y=getComputedStyle(t),g=y.transform.match(/matrix\(([^)]+)\)/);let w=1;if(g){const k=g[1].split(",").map(parseFloat);Number.isFinite(k[0])&&k[0]>.001&&(w=k[0])}go(),Kt=Zc({el:t,from:{tx:f-s,ty:m-a,scale:w,opacity:parseFloat(y.opacity)||1},to:{tx:d,ty:c,scale:p,opacity:0,radius:36},fromRadius:parseFloat(y.borderRadius)||28,params:Pt(),onComplete:()=>{Kt=null,u.folderOverlay.classList.remove("active"),u.folderOverlay.style.background="",u.folderOverlay.style.backdropFilter="",u.folderOverlay.style.webkitBackdropFilter="",u.folderOverlay.style.pointerEvents="auto",t.style.transition="",t.style.transform="",t.style.opacity="",t.style.borderRadius="",e&&e()}})}else u.folderOverlay.classList.remove("active"),e&&e()}function br(e=!1){if(!u.folderOverlay.classList.contains("active"))return;const t=u.folderOverlay.querySelector(".folder-panel"),i=ui||(He?document.querySelector(`[data-id="${He.id}"]`):null),n=i?i.getBoundingClientRect():fi;if(e){u.folderOverlay.classList.remove("active"),u.folderOverlay.style.background="",u.folderOverlay.style.backdropFilter="",u.folderOverlay.style.webkitBackdropFilter="",u.folderOverlay.style.pointerEvents="auto",t&&(t.style.transition="",t.style.transform="",t.style.opacity=""),He=null,ui=null,fi=null;return}if(t&&n&&n.width>0){const s=window.innerWidth/2,a=window.innerHeight/2,r=n.left+n.width/2,l=n.top+n.height/2,d=r-s,c=l-a,p=.2,h=t.getBoundingClientRect(),f=h.left+h.width/2,m=h.top+h.height/2,y=getComputedStyle(t),g=y.transform.match(/matrix\(([^)]+)\)/);let w=1;if(g){const k=g[1].split(",").map(parseFloat);Number.isFinite(k[0])&&k[0]>.001&&(w=k[0])}go(),Kt=Zc({el:t,from:{tx:f-s,ty:m-a,scale:w,opacity:parseFloat(y.opacity)||1},to:{tx:d,ty:c,scale:p,opacity:0,radius:36},fromRadius:parseFloat(y.borderRadius)||28,params:Pt(),onComplete:()=>{Kt=null,u.folderOverlay.classList.remove("active"),u.folderOverlay.style.opacity="",u.folderOverlay.style.transition="",u.folderOverlay.style.background="",u.folderOverlay.style.backdropFilter="",u.folderOverlay.style.webkitBackdropFilter="",u.folderOverlay.style.pointerEvents="auto",t.style.transition="",t.style.transform="",t.style.opacity="",t.style.borderRadius="",He=null,ui=null,fi=null}}),u.folderOverlay.style.transition=`opacity ${Q(240)}ms ${ee("emphasized")}`,u.folderOverlay.style.opacity="0"}else u.folderOverlay.classList.remove("active"),He=null,ui=null,fi=null}function Ff(e,t=null){go(),He=e;const i=document.querySelector(`.app-folder[data-id="${e.id}"]`);ui=i,fi=i?i.getBoundingClientRect():null,u.folderTitle.textContent=e.name,u.folderTitle.dataset.folderId=e.id,u.folderTitle.style.cursor="pointer",u.folderTitle.onclick=()=>Pf(e),Af(e),u.folderOverlay.classList.add("active"),u.folderOverlay.style.background="",u.folderOverlay.style.backdropFilter="",u.folderOverlay.style.webkitBackdropFilter="",u.folderOverlay.style.transition="none",u.folderOverlay.style.pointerEvents="none";const n=u.folderOverlay.querySelector(".folder-panel");if(n&&(n.style.transition="none",n.style.transform="scale(1)",n.style.opacity="1"),t){const s=u.folderGrid.querySelector(`.app-icon[data-id="${t}"]`);s&&s.scrollIntoView&&s.scrollIntoView({block:"nearest"})}}function td(e){if(!e||!e.apps)return!1;if(e.apps.length===1){const t=e.apps[0],i=o.pagesApps.findIndex(n=>n.some(s=>s.id===e.id));if(i!==-1){const n=e.slot??0;return t.slot=n,o.pagesApps[i]=o.pagesApps[i].map(s=>s.id===e.id?t:s),He&&He.id===e.id&&br(!0),Qe(),!0}}else if(e.apps.length===0){const t=o.pagesApps.findIndex(i=>i.some(n=>n.id===e.id));if(t!==-1)return o.pagesApps[t]=o.pagesApps[t].filter(i=>i.id!==e.id),He&&He.id===e.id&&br(!0),Qe(),!0}return!1}function Df(){u.folderOverlay.addEventListener("click",e=>{e.target===u.folderOverlay&&br()})}const b0=Object.freeze(Object.defineProperty({__proto__:null,closeFolder:br,createFolder:zl,createFolderElement:If,get currentOpenedFolder(){return He},get currentOpenedFolderEl(){return ui},dissolveFolderIfSingle:td,initFolder:Df,isFolder:Hn,openFolder:ed,get originFolderRect(){return fi},reopenFolderForReturn:Ff,shrinkFolderToDesktop:Bf},Symbol.toStringTag,{value:"Module"})),zf="ios-desktop:sound-enabled",Rf="ios-desktop:haptics-enabled",Of="ios-desktop:sfx-volume";let fs=null,ea=.5;function $f(e){try{return localStorage.getItem(e)!=="0"}catch{return!0}}function id(){return $f(zf)}function nd(){return $f(Rf)}function S0(e){try{localStorage.setItem(zf,e?"1":"0")}catch{}Hf()}function k0(e){try{localStorage.setItem(Rf,e?"1":"0")}catch{}Hf()}function E0(){return ea}function _0(e){ea=Math.max(0,Math.min(1,Number(e)||0));try{localStorage.setItem(Of,String(ea))}catch{}}function T0(){try{if(!fs){const e=window.AudioContext||window.webkitAudioContext;if(!e)return null;fs=new e}return fs.state==="suspended"&&fs.resume().catch(()=>{}),fs}catch{return null}}function M0(e,{freq:t=880,end:i=null,dur:n=.08,gain:s=.05,type:a="sine",delay:r=0}){const l=e.currentTime+r,d=e.createOscillator(),c=e.createGain();d.type=a,d.frequency.setValueAtTime(t,l),i&&i!==t&&d.frequency.exponentialRampToValueAtTime(Math.max(40,i),l+n),c.gain.setValueAtTime(1e-4,l),c.gain.exponentialRampToValueAtTime(Math.max(2e-4,s),l+.012),c.gain.exponentialRampToValueAtTime(1e-4,l+n),d.connect(c).connect(e.destination),d.start(l),d.stop(l+n+.02)}const L0={tap:[{freq:1750,dur:.045,gain:.05,type:"sine"}],tick:[{freq:2100,dur:.035,gain:.04,type:"triangle"}],app_open:[{freq:520,end:980,dur:.16,gain:.055,type:"sine"},{freq:1040,end:1560,dur:.1,gain:.02,type:"sine",delay:.05}],app_close:[{freq:880,end:440,dur:.15,gain:.05,type:"sine"}],notify:[{freq:1318,dur:.09,gain:.06,type:"sine"},{freq:1046,dur:.14,gain:.06,type:"sine",delay:.1}],lock:[{freq:320,end:220,dur:.09,gain:.06,type:"triangle"}],unlock:[{freq:620,dur:.05,gain:.045,type:"triangle"},{freq:930,dur:.07,gain:.045,type:"triangle",delay:.07}],profile:[{freq:660,dur:.07,gain:.05},{freq:880,dur:.07,gain:.05,delay:.08},{freq:1174,dur:.12,gain:.05,delay:.16}]};function lt(e){if(!id())return;const t=L0[e];if(!t)return;const i=T0();if(!(!i||i.state!=="running"))try{t.forEach(n=>M0(i,{...n,gain:(n.gain||.05)*ea}))}catch{}}function C0(){try{const e=typeof navigator.vibrate=="function"?navigator.vibrate.bind(navigator):null;Object.defineProperty(navigator,"vibrate",{configurable:!0,value:t=>nd()&&e?e(t):!1})}catch{}}function Hf(){const e={type:"system-sound-state",sfx:id(),haptics:nd()};document.querySelectorAll("iframe").forEach(t=>{try{t.contentWindow.postMessage(e,"*")}catch{}})}const I0=[".md3-list-item",".md3-btn","button",".menu-item",".nav-btn",".dot",".md3-slider",".glance-chip"];function A0(e){return!!(e&&e.closest&&I0.some(t=>{try{return e.closest(t)}catch{return!1}}))}function P0(){document.addEventListener("pointerdown",e=>{A0(e.target)&&lt("tap")},{capture:!0,passive:!0})}function B0(){try{ea=Math.max(0,Math.min(1,parseFloat(localStorage.getItem(Of)||"0.5")||.5))}catch{}C0(),P0(),window.__sfx={play:lt,sfxEnabled:id,setSfxEnabled:S0,hapticsEnabled:nd,setHapticsEnabled:k0,getVolume:E0,setVolume:_0}}const H={items:[],context:"none",originCX:0,originCY:0,isIdle:!1},F0=ot(.34,.78,1),D0=130,ye={closeSuction:.62,closeFar:1.1,closeEngage:.92,closeFull:.14,openSuction:.74,openFar:1.06,openRelease:.62,openLift:.68,blurPeak:6,blurEngageHi:.55,blurEngageLo:.12,axisFadePx:160},Nf=(typeof navigator<"u"&&(navigator.hardwareConcurrency||8))<6?Math.ceil(ye.blurPeak/2):ye.blurPeak;function qf(e,t,i,n,s,a,r){if(!(e>.004))return"";const l=Math.hypot(n,s),d=M(l/ye.axisFadePx,0,1);if(l<.001||d<=.004)return"";n/=l,s/=l,e*=d;const c=1+(t-1)*e,p=1+(i-1)*e,h=(p-c)/(p+c),f=2*c*p/(c+p),m=Math.abs(n)*a+Math.abs(s)*r,y=h/Math.max(m,1),g=f.toFixed(4);return` matrix3d(${g},0,0,${(y*n).toFixed(5)},0,${g},0,${(y*s).toFixed(5)},0,0,${g},0,0,0,0,1)`}let Sr=!1;try{if(typeof matchMedia=="function"){const e=matchMedia("(prefers-reduced-motion: reduce)");Sr=!!e.matches;const t=()=>{Sr=!!e.matches};e.addEventListener?e.addEventListener("change",t):e.addListener&&e.addListener(t)}}catch{}const Ce=[],rp=new Map;function un(e){let t=rp.get(e);return(!t||!t.isConnected)&&(t=document.getElementById(e),t&&rp.set(e,t)),t}function Za(e,t=0){const i=new Map;for(const l of H.items)l.el&&l.el.isConnected&&Number.isFinite(l.lastS)&&i.set(l.el,M(l.lastS,0,1));vo(),H.originCX=o.iconCX,H.originCY=o.iconCY;let n=null;if(u.folderOverlay&&u.folderOverlay.classList.contains("active")&&e&&u.folderGrid.contains(e))H.context="folder",n=u.folderGrid.querySelectorAll(".app-icon");else{H.context="desktop";const l=u.desktopSlider?u.desktopSlider.children[o.currentPage]:null;n=l?l.querySelectorAll(".app-icon, .app-folder"):null}if(!n||n.length===0)return;let s=1;const a=[];if(n.forEach(l=>{if(l===e)return;const d=l.getBoundingClientRect();if(d.width<=0||d.height<=0)return;const c=d.left+d.width/2,p=d.top+d.height/2,h=Math.hypot(c-H.originCX,p-H.originCY);a.push({el:l,cx:c,cy:p,dist:h}),h>s&&(s=h)}),a.length===0)return;const r=performance.now();H.items=a.map(l=>{const d=Math.max(1,l.dist),c=i.get(l.el);let p=0;if(l.el.classList.contains("unlock-icon-in")||l.el.classList.contains("unlock-icon-in-ios")||l.el.classList.contains("unlock-icon-in-android")){let h=0;try{const f=l.el.getAnimations?l.el.getAnimations():[];for(const m of f){const y=m.effect&&m.effect.getComputedTiming?m.effect.getComputedTiming():null;y&&Number.isFinite(y.endTime)&&(h=Math.max(h,y.endTime-(m.currentTime||0)))}}catch{}p=Math.max(h,0)+60,h<=0&&(p=(parseFloat(l.el.style.animationDelay)||0)+700)}else l.el.classList.contains("icon-receive-pop")?p=280:l.el.classList.contains("icon-receive-fade")&&(p=200);return{el:l.el,dirX:(l.cx-H.originCX)/d,dirY:(l.cy-H.originCY)/d,push:40+20*Math.min(d/350,1.2),startAt:r+l.dist/s*D0+p,spring:new Ie({...Kn(F0),initialValue:c!==void 0?c:t,initialVelocity:0})}}),H.items.forEach(l=>{l.el.style.willChange="transform, opacity",l.spring.x>5e-4&&sd(l,M(l.spring.x,0,1.2))})}function vo(){H.items.forEach(e=>{e.el.style.transform="",e.el.style.opacity="",e.el.style.willChange=""}),H.items=[],H.context==="folder"&&z0(),H.context="none",H.isIdle=!1}function z0(){if(!u.folderOverlay)return;const e=u.folderOverlay.querySelector(".folder-panel");e&&(e.style.transform="",e.style.opacity="")}function Nn(e){H.items.forEach(t=>t.spring.setTarget(e)),H.isIdle=!1}function sd(e,t){if(e.lastS=t,t>5e-4){const i=e.dirX*e.push*t,n=e.dirY*e.push*t,s=Math.max(.78,1-.22*t),a=Math.max(0,1-1.15*t),r=Math.round(i*2)/2,l=Math.round(n*2)/2,d=Math.round(s*1e3)/1e3,c=Math.round(a*32)/32;(e.lastTxQ!==r||e.lastTyQ!==l||e.lastScQ!==d)&&(e.lastTxQ=r,e.lastTyQ=l,e.lastScQ=d,e.el.style.transform=`translate3d(${r.toFixed(1)}px, ${l.toFixed(1)}px, 0) scale(${d.toFixed(3)})`),e.lastOpQ!==c&&(e.lastOpQ=c,e.el.style.opacity=c.toFixed(3))}else e.lastTxQ!==0&&(e.lastTxQ=0,e.lastTyQ=0,e.lastScQ=1,e.lastOpQ=1,e.el.style.transform="",e.el.style.opacity="")}function R0(e,t){if(H.items.length===0)return;const i=o.isOpen&&!o.isClosing?1:0;if(H.isIdle){let s=!0;for(const a of H.items)if(a.spring.target!==i){s=!1;break}if(s)return;H.isIdle=!1}let n=!0;for(const s of H.items){s.spring.target!==i&&s.spring.setTarget(i),t>=s.startAt&&s.spring.update(e);const a=M(s.spring.x,-.1,1.2);s.spring.isSettled(.004,.4)||(n=!1),sd(s,a)}n&&(i===0?vo():H.isIdle=!0)}function jf(e){if(H.items.length===0)return;const t=M(e,0,1);H.items.forEach(i=>{i.spring.x=t,i.spring.v=0,i.spring.target=t,sd(i,t)})}function Vf(){return Ce.length>0||H.items.length>0&&!H.isIdle}function O0(e){const t=1-.16*e,i=1-.05*e;if(e>.001){if(u.desktop.style.transform=`scale(${i.toFixed(4)})`,Lc())u.desktop.style.filter="",Cc(e);else{const a=12*(e*e);u.desktop.style.filter=`blur(${a.toFixed(1)}px) brightness(${t.toFixed(3)})`}u.pageDots&&(u.pageDots.style.opacity=Math.max(0,1-e*2).toFixed(3),u.pageDots.style.transform=`translate3d(0, ${(16*e).toFixed(1)}px, 0)`);const n=un("pixelAtAGlance");n&&(n.style.transition="none",n.style.opacity=Math.max(0,1-e*2.5).toFixed(3),n.style.transform=`translate3d(0, ${(-16*e).toFixed(1)}px, 0)`);const s=un("desktopSearchWidget");s&&(s.style.transition="none",s.style.opacity=Math.max(0,1-e*2.5).toFixed(3),s.style.transform=`translateX(-50%) translate3d(0, ${(20*e).toFixed(1)}px, 0)`)}else{u.desktop.style.filter="",u.desktop.style.transform="",Ic(),u.pageDots&&(u.pageDots.style.opacity="",u.pageDots.style.transform="");const n=un("pixelAtAGlance");n&&(n.style.opacity="",n.style.transform="",n.style.transition="");const s=un("desktopSearchWidget");s&&(s.style.opacity="",s.style.transform="",s.style.transition="")}if(H.context==="folder"&&u.folderOverlay){const n=u.folderOverlay.querySelector(".folder-panel");if(n){const s=1+.12*e,a=Math.max(0,1-e*1.5);n.style.transform=`scale(${s.toFixed(3)})`,n.style.opacity=a.toFixed(3)}u.folderOverlay.style.opacity=Math.max(0,1-e*1.6).toFixed(3)}}function ad(e,t){if(!e||!e.classList)return;const i=!!(t&&t.silent);if(!(e.classList.contains("launch-hidden")||e.classList.contains("icon-receive-pop")||e.classList.contains("icon-receive-fade")||e.style.opacity!==""||e.style.transform!==""||e.style.visibility!=="")||(e.classList.remove("launch-hidden","icon-receive-pop"),delete e.dataset.iconFadePending,e.style.opacity="",e.style.transform="",e.style.visibility="",e.style.willChange="",i))return;e.classList.add("icon-receive-fade"),e.dataset.iconFadePending="1";let s=!1;const a=()=>{s||(s=!0,e.classList.remove("icon-receive-fade"),delete e.dataset.iconFadePending,e.removeEventListener("animationend",a))};e.addEventListener("animationend",a),setTimeout(a,400)}function Wf(e,t,i,n){const s=M(t,0,1);if(s<.002){e.element.style.opacity!=="0"&&(e.element.style.opacity="0",e.shadowEl&&(e.shadowEl.style.opacity="0"),e.glowEl&&(e.glowEl.style.opacity="0"));return}const a=!Sr,r=window.innerWidth||document.documentElement.clientWidth,l=window.innerHeight||document.documentElement.clientHeight,d=e.iconW||58,c=e.iconH||58,p=d/r,h=c/l,f=p+(1-p)*s,m=h+(1-h)*s,y=i-r/2,g=n-l/2,w=r/2,k=l/2,S=w>0?(e.iconCX-w)/w:0,b=k>0?(e.iconCY-k)/k:0,_=a?M(Math.abs(e.scaleSpring.v)+Math.hypot(e.posSpring.vx,e.posSpring.vy)/900,0,1):0,A=Math.sin(Math.PI*s)*(.35+.65*_),I=a?-b*5.5*A:0,q=a?S*5.5*A:0,D=a?M(e.scaleSpring.v,-3.8,3.8):0,T=a?M(D*.022,-.045,.055):0,G=i-e.iconCX,X=n-e.iconCY,ne=Math.hypot(G,X)||1,be=Math.abs(G/ne),Te=Math.abs(X/ne),Me=1+T*(be-.5*Te),Ae=1+T*(Te-.5*be),ti=a?1-xe(s,ye.closeFull,ye.closeEngage):0,ii=Nf*(1-xe(s,ye.blurEngageLo,ye.blurEngageHi)),yt=qf(ti,ye.closeSuction,ye.closeFar,e.iconCX-r/2,e.iconCY-l/2,r/2,l/2),Dt=Math.sin(Math.PI*s)*(.35+.65*_),sn=e.iconW>120?1:2.2,ss=a?-S*b*sn*Dt:0,ni=a?S*(1-s*.45)*sn*.65*Dt:0,as=f*Me,xa=m*Ae,ki=Math.round(ii/2)*2,rs=e.iconW>120?28:16,No=rs+(36-rs)*xe(s,0,1),ba=No/Math.max(as,.001),qo=No/Math.max(xa,.001);e.element.style.transform=`translate3d(${y.toFixed(2)}px, ${g.toFixed(2)}px, 0px) scale(${as.toFixed(5)}, ${xa.toFixed(5)}) rotateX(${I.toFixed(2)}deg) rotateY(${q.toFixed(2)}deg) skewX(${ss.toFixed(2)}deg) skewY(${ni.toFixed(2)}deg)`+yt;const os=Math.round(ba*2)/2,Ei=Math.round(qo*2)/2;if(os!==e._lastRQx||Ei!==e._lastRQy){const wt=`${os.toFixed(1)}px / ${Ei.toFixed(1)}px`;e.element.style.borderRadius=wt,e.shadowEl&&(e.shadowEl.style.borderRadius=wt),e.glowEl&&(e.glowEl.style.borderRadius=wt),e._lastRQx=os,e._lastRQy=Ei}const an=xe(s,.002,.12),ls=Math.round(.85*Math.sin(Math.PI*s)*20)/20;if(e.glowEl){const wt=Math.round(ls*an*20)/20;wt!==e._lastGlowQ&&(e.glowEl.style.opacity=wt.toFixed(2),e._lastGlowQ=wt),wt>.001&&(e.glowEl.style.transform=e.element.style.transform)}ki!==e._lastGenieQ&&(e.element.style.filter=ki>=2?`blur(${ki}px)`:"",e._lastGenieQ=ki),e.shadowEl&&(e.shadowEl.style.transform=e.element.style.transform,e.shadowEl.style.opacity=((1-xe(s,.85,1))*an).toFixed(3));const cs=120,Sa=Math.min(d,58),_i=Sa/cs+(1-Sa/cs)*s,ka=_i/Math.max(f,.001),Ea=_i/Math.max(m,.001);e.launchIconContainer&&(e.launchIconContainer.style.transform=`scale(${ka.toFixed(4)}, ${Ea.toFixed(4)})`),e.header&&(e.header.style.opacity="1"),e.pageStackEl&&(e.pageStackEl.style.opacity="1"),e.gestureEl&&(e.gestureEl.style.opacity="0.25"),e.windowStatusBar&&(e.windowStatusBar.style.opacity="1"),e.launchScreen&&(e.launchScreen.style.opacity="0");const _a=xe(s,.002,.2);e.element.style.opacity=_a.toFixed(3)}let kr=null,Er=null,_r=null,Tr=null;function qn(e,t,i){const n=M(e,0,1),s=window.innerWidth||document.documentElement.clientWidth,a=window.innerHeight||document.documentElement.clientHeight,r=o.isClosing&&o.shrinkToCard,l=o.iconW||58,d=o.iconH||58,c=M(e,0,1.06),p=l/s,h=d/a,f=p+(1-p)*c,m=h+(1-h)*c,y=!Sr&&!r,g=t-s/2,w=i-a/2,k=s/2,S=a/2,b=k>0?(o.iconCX-k)/k:0,_=S>0?(o.iconCY-S)/S:0,A=y?M(Math.abs(o.scaleSpring.v)+Math.hypot(o.posSpring.vx,o.posSpring.vy)/900,0,1):0,I=Math.sin(Math.PI*n)*(.35+.65*A),q=l>120?2.5:5.5,D=y?-_*q*I:0,T=y?b*q*I:0,G=y?M(o.scaleSpring.v,-3.8,3.8):0,X=y?M(G*.022,-.045,.055):0,ne=t-o.iconCX,be=i-o.iconCY,Te=Math.hypot(ne,be)||1,Me=Math.abs(ne/Te),Ae=Math.abs(be/Te),ti=1+X*(Me-.5*Ae),ii=1+X*(Ae-.5*Me);let yt=0,Dt=0;y&&(o.isClosing?(yt=1-xe(n,ye.closeFull,ye.closeEngage),Dt=Nf*(1-xe(n,ye.blurEngageLo,ye.blurEngageHi))):yt=ye.openLift*(1-xe(n,.04,ye.openRelease)));const sn=qf(yt,o.isClosing?ye.closeSuction:ye.openSuction,o.isClosing?ye.closeFar:ye.openFar,o.iconCX-s/2,o.iconCY-a/2,s/2,a/2),ss=Math.sin(Math.PI*n)*(.35+.65*A),ni=l>120?1:2.2,as=y?-b*_*ni*ss:0,xa=y?b*(1-n*.45)*ni*.65*ss:0,ki=f*ti,rs=m*ii,Ho=l>120?28:16,ba=Ho+(36-Ho)*xe(n,0,1),qo=ba/Math.max(ki,.001),os=ba/Math.max(rs,.001),Ei=`translate3d(${g.toFixed(2)}px, ${w.toFixed(2)}px, 0px) scale(${ki.toFixed(5)}, ${rs.toFixed(5)}) rotateX(${D.toFixed(2)}deg) rotateY(${T.toFixed(2)}deg) skewX(${as.toFixed(2)}deg) skewY(${xa.toFixed(2)}deg)`+sn;u.appWindow.style.transform=Ei;const an=Math.round(qo*2)/2,ls=Math.round(os*2)/2;if(an!==kr||ls!==Er){const xt=`${an.toFixed(1)}px / ${ls.toFixed(1)}px`;u.appWindow.style.borderRadius=xt,u.windowShadowLayer&&(u.windowShadowLayer.style.borderRadius=xt),u.windowGlowLayer&&(u.windowGlowLayer.style.borderRadius=xt),kr=an,Er=ls}const cs=o.isClosing&&!r?xe(n,.002,.12):1,Sa=Math.round(.85*Math.sin(Math.PI*n)*20)/20;if(u.windowGlowLayer){const xt=Math.round(Sa*cs*20)/20;xt!==_r&&(u.windowGlowLayer.style.opacity=xt.toFixed(2),_r=xt),xt>.001&&(u.windowGlowLayer.style.transform=Ei)}const _i=Math.round(Dt/2)*2;_i!==Tr&&(u.appWindow.style.filter=_i>=2?`blur(${_i}px)`:"",Tr=_i);const ka=120,Ea=Math.min(l,58),_a=Ea/ka+(1-Ea/ka)*n,wt=_a/Math.max(f,.001),Pg=_a/Math.max(m,.001);u.launchIconContainer.style.transform=`scale(${wt.toFixed(4)}, ${Pg.toFixed(4)})`;const jo=o.isClosing||o.isDragging||o.scaleSpring.target<1;!o.contentWarm&&!jo&&o.currentApp&&(o.contentWarm=Ds(o.currentApp.id));let Ti;jo?Ti=o.contentWarm?1:xe(n,.22,.72):Ti=o.contentWarm?xe(n,.02,.26):xe(n,.22,.72),u.header.style.opacity=Ti.toFixed(3),u.pageStack.style.opacity=Ti.toFixed(3),u.gesture.style.opacity=(Ti*.25).toFixed(3),u.appWindowStatusBar&&(u.appWindowStatusBar.style.opacity=Ti.toFixed(3)),u.statusBar&&(u.statusBar.style.opacity=(1-xe(n,.1,.7)).toFixed(3));const Bg=jo?o.contentWarm?0:1-xe(n,.22,.72):1-Ti;u.appLaunchScreen.style.opacity=Bg.toFixed(3);const Fg=.3*(1-xe(n,.85,1));if(u.windowShadowLayer&&(u.windowShadowLayer.style.opacity=(Fg/.3*cs).toFixed(3),u.windowShadowLayer.style.transform=Ei),o.isClosing)if(r)u.appWindow.style.opacity!=="1"&&(u.appWindow.style.opacity="1");else{const xt=xe(n,.002,.12);u.appWindow.style.opacity=n<=.12?xt.toFixed(3):"1",n<.06&&o.currentIconEl&&ad(o.currentIconEl)}else u.appWindow.style.opacity="1";O0(n),ha()}let Os=null,yn=0;function Yf(e){e.main&&(e.syncRadial&&jf(e.p),qn(e.p,e.cx,e.cy)),e.forceSub&&ha(!0)}function er(e,t,i,n={}){Os={p:e,cx:t,cy:i,main:n.main!==!1,syncRadial:!!n.syncRadial,forceSub:!!n.forceSub},!yn&&(yn=requestAnimationFrame(()=>{yn=0;const s=Os;Os=null,s&&Yf(s)}))}function rd(){yn&&(cancelAnimationFrame(yn),yn=0);const e=Os;Os=null,e&&Yf(e)}const op=new WeakMap;function Ca(e,t,i,n){let s=op.get(e);s||(s={},op.set(e,s)),s[t]!==i&&(s[t]=i,n(i))}function ha(e=!1){if(!o.currentApp||o.navHistory.length<2||o.isDragging&&!e)return;let t=M(o.subpageSpring.x,0,1);1-t<.005&&(t=1);const i=o.navHistory[o.navHistory.length-1],n=o.navHistory[o.navHistory.length-2],s=document.getElementById(`app-page-${o.currentApp.id}-${i}`),a=document.getElementById(`app-page-${o.currentApp.id}-${n}`);if(s&&a){const r=1-t;a.style.transform="translate3d(0, 0, 0) scale(1)",a.style.opacity="1";const l=Math.min(1,.65+Math.round(.35*r/.04)*.04).toFixed(2);Ca(a,"filter",t<1?`brightness(${l})`:"",g=>{a.style.filter=g}),a.style.borderRadius="0";const c=(o.subpageBackDir===-1?-1:1)*r*100,p=M(o.subpageBackTy||0,-200,200)*r,h=Math.max(.9,1-.1*r),f=Math.round(r*28/2)*2,m=(Math.round(.45*r/.05)*.05).toFixed(2),y=r>.01?`0 16px 44px rgba(0,0,0,${m}), 0 2px 10px rgba(0,0,0,0.2)`:"";s.style.transform=`translate3d(${c.toFixed(2)}%, ${p.toFixed(1)}px, 0) scale(${h.toFixed(4)})`,Ca(s,"radius",`${f}px`,g=>{s.style.borderRadius=g}),Ca(s,"shadow",y,g=>{s.style.boxShadow=g}),s.style.transformOrigin="center center",Ca(s,"overflow",r>.01?"hidden":"",g=>{s.style.overflow=g})}}function et(e){if(e&&(o.posSpring.reconfigure(e),o.scaleSpring.reconfigure(e)),o.flightActive){if(o.flightActive=!1,o.stageRaisedForFlight){o.stageRaisedForFlight=!1;const r=document.getElementById("stage");r&&(r.style.zIndex="")}o.rafId&&(cancelAnimationFrame(o.rafId),o.rafId=null)}if(o.rafId)return;const t=1/120,i=30;let n=0,s=performance.now();function a(r){o._frameHeartbeat=r;let l=(r-s)/1e3;s=r,l>.25&&(l=.25),n+=l;let d=0;for(;n>=t&&d<i;){(o.isOpen||o.isClosing)&&!o.isDragging&&(o.posSpring.update(t),o.scaleSpring.update(t),(o.isClosing||o.scaleSpring.target===0)&&o.scaleSpring.x<=0&&(o.scaleSpring.x=0,o.scaleSpring.v=0),o.subpageSpring.update(t));for(let f=0;f<Ce.length;f++){const m=Ce[f];m.posSpring.update(t),m.scaleSpring.update(t),m.scaleSpring.target===0&&m.scaleSpring.x<=0&&(m.scaleSpring.x=0,m.scaleSpring.v=0)}n-=t,d++}if(n>=t&&(n=0),R0(Math.min(l,.05),r),o.isOpen||o.isClosing){const f=o.iconCX+o.posSpring.px,m=o.iconCY+o.posSpring.py;qn(o.scaleSpring.x,f,m)}for(let f=Ce.length-1;f>=0;f--){const m=Ce[f],y=m.iconCX+m.posSpring.px,g=m.iconCY+m.posSpring.py;Wf(m,m.scaleSpring.x,y,g);const w=m.scaleSpring.x<=1e-4;m.scaleSpring.isSettled()&&(m.posSpring.isSettled()||w)&&(Gf(m),m.iconEl&&ad(m.iconEl,{silent:!0}),Ce.splice(f,1))}o.popInProgress&&!o.isDragging&&o.subpageSpring.isSettled()&&(o.popInProgress=!1,o.navHistory.length>1&&(o.navHistory.pop(),Ki()));const p=!o.isOpen&&!o.isClosing||o.scaleSpring.isSettled()&&o.posSpring.isSettled()&&o.subpageSpring.isSettled(),h=H.items.length===0||H.isIdle;if(p&&Ce.length===0&&h){o.isDragging||([o.posSpring,o.scaleSpring,o.subpageSpring].forEach(f=>{typeof f.isSettled!="function"||!f.isSettled()||(f.x&&typeof f.x=="object"?(f.x.x=f.x.target,f.x.v=0,f.y.x=f.y.target,f.y.v=0):(f.x=f.target,f.v=0))}),ha(!0)),$0();return}o.rafId=requestAnimationFrame(a)}o.rafId=requestAnimationFrame(a)}function $0(){o.rafId&&(cancelAnimationFrame(o.rafId),o.rafId=null),document.querySelectorAll('[id^="app-page-"]').forEach(e=>{e.style.overflow&&(e.style.overflow="")});try{Nc(!1)}catch{}if(o.scaleSpring.target===1&&o.isOpen&&!o.isClosing){if(u.appWindow.style.transform="",u.appWindow.style.transition="",o.shrinkToCard=!1,u.appWindow.style.borderRadius="",u.appWindow.style.boxShadow="",u.appWindow.style.visibility="",u.appWindow.style.zIndex="",u.windowShadowLayer&&(u.windowShadowLayer.style.zIndex=""),u.windowShadowLayer&&(u.windowShadowLayer.style.transform="",u.windowShadowLayer.style.borderRadius="",u.windowShadowLayer.style.opacity="0"),u.windowGlowLayer&&(u.windowGlowLayer.style.opacity="0",u.windowGlowLayer.style.transform="",u.windowGlowLayer.style.borderRadius=""),kr=null,Er=null,_r=null,Tr=null,u.appWindow.style.opacity="1",u.appWindow.style.filter="",u.launchIconContainer.style.transform="",u.appLaunchScreen.style.opacity="0",u.header.style.opacity="1",u.pageStack.style.opacity="1",u.gesture.style.opacity="0.25",u.appWindowStatusBar&&(u.appWindowStatusBar.style.opacity="1"),u.statusBar&&(u.statusBar.style.opacity="0"),u.desktop.style.transform="scale(0.95)",Lc()?(u.desktop.style.filter="",tn(),Cc(1)):u.desktop.style.filter="blur(12px) brightness(0.84)",u.appWindow.style.pointerEvents="auto",document.querySelectorAll(".launch-hidden").forEach(e=>{e!==o.currentIconEl&&e.classList.remove("launch-hidden")}),u.folderOverlay&&u.folderOverlay.classList.contains("active")){u.folderOverlay.classList.remove("active"),u.folderOverlay.style.background="",u.folderOverlay.style.backdropFilter="",u.folderOverlay.style.webkitBackdropFilter="",u.folderOverlay.style.opacity="",u.folderOverlay.style.transition="",u.folderOverlay.style.pointerEvents="auto";const e=u.folderOverlay.querySelector(".folder-panel");e&&(e.style.transition="",e.style.transform="",e.style.opacity="")}}else if(o.isClosing||o.scaleSpring.target===0){qn(0,o.iconCX,o.iconCY),o.shrinkToCard=!1;const e=o.currentApp?o.currentApp.id:null;if(u.appWindow.classList.remove("open","closing"),u.appWindow.style.visibility="",u.appWindow.style.transform="",u.appWindow.style.transition="",u.appWindow.style.borderRadius="",u.appWindow.style.boxShadow="",u.appWindow.style.zIndex="",u.windowShadowLayer&&(u.windowShadowLayer.style.zIndex=""),u.windowShadowLayer&&(u.windowShadowLayer.style.transform="",u.windowShadowLayer.style.borderRadius="",u.windowShadowLayer.style.opacity="0"),u.windowGlowLayer&&(u.windowGlowLayer.style.opacity="0",u.windowGlowLayer.style.transform="",u.windowGlowLayer.style.borderRadius=""),kr=null,Er=null,_r=null,Tr=null,u.appWindow.style.opacity="",u.appWindow.style.filter="",u.launchIconContainer.style.transform="",u.desktop.style.filter="",u.desktop.style.transform="",Ic(),u.folderOverlay)if(o.returnToFolderOnClose){u.folderOverlay.style.background="",u.folderOverlay.style.backdropFilter="",u.folderOverlay.style.webkitBackdropFilter="",u.folderOverlay.style.opacity="",u.folderOverlay.style.transition="",u.folderOverlay.style.pointerEvents="auto";const t=u.folderOverlay.querySelector(".folder-panel");t&&(t.style.transition="",t.style.transform="",t.style.opacity="")}else u.folderOverlay.classList.remove("active"),u.folderOverlay.style.background="",u.folderOverlay.style.backdropFilter="",u.folderOverlay.style.webkitBackdropFilter="",u.folderOverlay.style.opacity="",u.folderOverlay.style.pointerEvents="auto";o.currentIconEl&&ad(o.currentIconEl),document.querySelectorAll(".launch-hidden").forEach(t=>{t.classList.remove("launch-hidden"),t.style.visibility=""}),u.header.style.opacity="",u.pageStack.style.opacity="",u.gesture.style.opacity="",u.appLaunchScreen.style.opacity="",u.appWindowStatusBar&&(u.appWindowStatusBar.style.opacity=""),u.statusBar&&(u.statusBar.style.opacity="1"),u.appWindow.style.pointerEvents="",vo(),o.isOpen=!1,o.isClosing=!1,o.returnToFolderOnClose=!1,o.currentIconEl=null,o.currentApp=null,o.navHistory=[0];try{Ki()}catch{}try{document.dispatchEvent(new CustomEvent("app-window-closed",{detail:{appId:e}}))}catch{}}}function ta(){u.desktop.style.filter="",u.desktop.style.transform="",Ic(),u.pageDots&&(u.pageDots.style.opacity="",u.pageDots.style.transform="");const e=un("pixelAtAGlance");e&&(e.style.opacity="",e.style.transform="",e.style.transition="");const t=un("desktopSearchWidget");t&&(t.style.opacity="",t.style.transform="",t.style.transition=""),document.querySelectorAll(".launch-hidden").forEach(i=>{i.classList.remove("launch-hidden"),i.style.visibility=""}),vo(),u.statusBar&&(u.statusBar.style.opacity="1"),u.gesture&&(u.gesture.style.opacity=""),u.appWindow.classList.remove("open"),u.appWindow.style.pointerEvents="",o.isOpen=!1,o.isClosing=!1,o.currentIconEl=null,o.currentApp=null}function Rl(e){const i=!!(u.folderOverlay&&u.folderGrid&&u.folderGrid.contains(e))?u.folderOverlay.querySelector(".folder-panel"):null,n=i?i.style.transform:"",s=i?i.style.transition:"";i&&i.style.setProperty("transform","none","important");const a=Xa(e);return i&&(i.style.transform=n,i.style.transition=s),a}function hs(e,t){return{cx:e.left+e.width/2,cy:e.top+e.height/2,w:e.width||58,h:e.height||58,el:t}}function yo(e){const t=window.innerWidth/2,i=window.innerHeight/2;if(!e)return{cx:t,cy:i,w:58,h:58,el:null};if(u.folderOverlay&&u.folderOverlay.classList.contains("active")){const a=u.folderGrid.querySelector(`[data-id="${e.id}"]`);if(a)return hs(Rl(a),a)}if(o.currentIconEl&&o.currentIconEl.dataset&&o.currentIconEl.dataset.id===e.id&&o.currentIconEl.isConnected&&o.currentIconEl.getClientRects().length>0){const a=Rl(o.currentIconEl);if(a.width>0&&a.height>0)return hs(a,o.currentIconEl)}if(o.currentIconEl&&o.currentIconEl.classList&&o.currentIconEl.classList.contains("dock-app-icon")){const a=document.querySelector(`.dock-bar .dock-app-icon[data-id="${e.id}"]`);if(a){const r=Xa(a);if(r.width>0&&r.height>0)return o.currentIconEl=a,hs(r,a)}if(o.iconCX!=null&&o.iconCY!=null&&(o.iconW||0)>0&&(o.iconH||0)>0)return{cx:o.iconCX,cy:o.iconCY,w:o.iconW,h:o.iconH,el:null}}const n=document.querySelector(`.page-grid .app-icon[data-id="${e.id}"]`);if(n){const a=Xa(n);if(a.width>0&&a.height>0)return hs(a,n)}const s=document.querySelectorAll(".app-folder");for(let a of s){const r=a.dataset.id;let l=!1;for(let d of o.pagesApps){for(let c of d)if(c.id===r&&c.apps&&c.apps.some(p=>p.id===e.id)){l=!0;break}if(l)break}if(l)return hs(Xa(a),a)}return{cx:o.iconCX||t,cy:o.iconCY||i,w:o.iconW||58,h:o.iconH||58,el:o.currentIconEl||null}}function H0(e){for(const t of o.pagesApps)for(const i of t)if(i&&i.type==="folder"&&Array.isArray(i.apps)&&i.apps.some(n=>n.id===e))return i;return null}function N0(e){if(!e||!e.element)return;const t=e.element.querySelector(".page-stack");t&&t.querySelectorAll(".app-instance-wrapper").forEach(i=>{i.__actorHosted&&(i.__actorHosted=null,i.style.display="none",u.pageStack&&u.pageStack!==i.parentNode&&u.pageStack.appendChild(i))})}function Gf(e){N0(e),e.element&&e.element.parentNode&&e.element.parentNode.removeChild(e.element),e.shadowEl&&e.shadowEl.parentNode&&e.shadowEl.parentNode.removeChild(e.shadowEl),e.glowEl&&e.glowEl.parentNode&&e.glowEl.parentNode.removeChild(e.glowEl)}function q0(e){return!!e&&typeof e=="object"&&Number.isFinite(e.left)&&Number.isFinite(e.top)&&e.width>0&&e.height>0}function ma(){const e=u.appWindow;e&&(e.style.transition&&(e.style.transition=""),e.style.transform&&e.classList.contains("open")&&(e.style.transform=""))}function ia(e=null){if(!o.currentApp||!o.isOpen&&!o.isClosing)return;o.shrinkToCard=!1;const t=o.currentApp,i=o.currentIconEl,n=o.posSpring,s=o.scaleSpring,a=o.iconCX,r=o.iconCY,l=e&&q0(e.exitTo)?e.exitTo:null,d=e&&Number.isFinite(e.initialOffsetX)?e.initialOffsetX:0,c=e&&Number.isFinite(e.initialOffsetY)?e.initialOffsetY:0;let p,h,f,m,y;if(l)p=l.left+l.width/2,h=l.top+l.height/2,f=l.width,m=l.height,y=null;else{const T=yo(t);p=T.cx,h=T.cy,f=T.w,m=T.h,y=T.el||i}const g=document.createElement("div");g.className="app-window closing-actor";const w=501+Math.min(Ce.length,16)*2,k=document.createElement("div");k.className="window-shadow-layer closing-actor-shadow",k.style.zIndex=`${w}`,g.style.zIndex=`${w+1}`;const S=document.createElement("div");S.className="window-glow-layer closing-actor-glow",S.style.zIndex=`${Math.min(w+2,535)}`;const b=u.windowShadowLayer||u.appWindow;b&&b.parentNode===u.stage?(u.stage.insertBefore(k,b),u.stage.insertBefore(g,b),u.stage.insertBefore(S,b)):(u.stage.appendChild(k),u.stage.appendChild(g),u.stage.appendChild(S)),Array.from(u.appWindow.childNodes).forEach(T=>{if(T.nodeType===1)if(T.classList&&T.classList.contains("app-body")){const G=T.cloneNode(!1),X=document.createElement("div");X.className="page-stack",G.appendChild(X),g.appendChild(G)}else g.appendChild(T.cloneNode(!0))}),g.querySelectorAll("[id]").forEach(T=>T.removeAttribute("id")),g.querySelectorAll("script").forEach(T=>T.remove());const _=g.querySelector(".page-stack"),A=u.pageStack?u.pageStack.querySelector(`.app-instance-wrapper#app-instance-${t.id}`):null;if(_&&A)A.__actorHosted=w,_.appendChild(A);else if(_){const T=o.navHistory[o.navHistory.length-1]||0,G=document.getElementById(`app-page-${t.id}-${T}`);if(G){const X=document.createElement("div");X.className="app-instance-wrapper",X.style.cssText="width:100%;height:100%;position:absolute;inset:0;",X.appendChild(G.cloneNode(!0)),_.appendChild(X),g.querySelectorAll("iframe").forEach(ne=>{const be=document.createElement("div");be.className="iframe-ghost-placeholder",be.style.backgroundColor=t.type==="clock"?"#18181B":t.bgColor||"var(--md-surface, #1a1b1e)";const Te=t.type?Ye(t.type,!0):`<div class="launch-icon">${J(t.id)}</div>`;be.innerHTML=`<div class="launch-icon-container">${Te}</div>`,ne.replaceWith(be)})}}const I=new lo(Pt(),a+n.px+d-p,r+n.py+c-h,n.vx,n.vy);I.setTarget(0,0);const q=new Ie({...Pt(),initialValue:s.x,initialVelocity:s.v});q.setTarget(0),Ce.push({id:`${t.id}_${Date.now()}`,app:t,iconEl:y,element:g,shadowEl:k,glowEl:S,_lastRQx:null,_lastRQy:null,_lastGlowQ:null,_lastGenieQ:null,launchIconContainer:g.querySelector(".launch-icon-container"),launchScreen:g.querySelector(".app-launch-screen"),header:g.querySelector(".app-header"),pageStackEl:g.querySelector(".page-stack"),gestureEl:g.querySelector(".gesture-bar"),windowStatusBar:g.querySelector(".app-window-status-bar"),posSpring:I,scaleSpring:q,iconCX:p,iconCY:h,iconW:f,iconH:m});const D=Ce[Ce.length-1];D.scaleSpring.x>.002?Wf(D,D.scaleSpring.x,D.iconCX+D.posSpring.px,D.iconCY+D.posSpring.py):(D.element.style.opacity="0",D.shadowEl&&(D.shadowEl.style.opacity="0"),D.glowEl&&(D.glowEl.style.opacity="0")),y&&(tr(y),y.classList.add("launch-hidden"),y.style.visibility=""),et(null)}function Xf(e){if(!e||typeof e!="object"||!Number.isFinite(e.left)||!Number.isFinite(e.top)||!(e.width>0)||!(e.height>0))return!1;const t=e.left+e.width/2,i=e.top+e.height/2,n=80;return t>=-n&&t<=window.innerWidth+n&&i>=-n&&i<=window.innerHeight+n}function tr(e){!e||!e.classList||(e.classList.contains("unlock-icon-in")||e.classList.contains("unlock-icon-in-ios")||e.classList.contains("unlock-icon-in-android"))&&(e.classList.remove("unlock-icon-in","unlock-icon-in-ios","unlock-icon-in-android"),e.style.animationDelay="",e.style.removeProperty("--radial-dx"),e.style.removeProperty("--radial-dy"))}function j(e,t,i=null,n=null){const s=F[e];if(!s)return;o.shrinkToCard=!1,ma();try{if(!n||!n.skipCloseRecents){const c=document.getElementById("recentAppsOverlay");c&&c.classList.contains("active")&&(typeof window.__closeRecentApps=="function"?window.__closeRecentApps():he(()=>Promise.resolve().then(()=>Wl),void 0,import.meta.url).then(p=>{try{p.closeRecentApps()}catch{}}).catch(()=>{}))}if(typeof window<"u"&&window.__miniWindow&&!(n&&n.skipMiniCheck)){const c=window.__miniWindow(s.id);if(c&&c.appId===s.id){c.expandToFullscreen(i||null);return}}if(typeof window<"u"&&window.__splitInfo&&window.__splitInfo().active){const c=window.__splitGestures;c&&typeof c.dismissSilently=="function"?c.dismissSilently():c&&typeof c.dismiss=="function"?c.dismiss():he(()=>import("./split-screen-HA_hNujw.js"),[],import.meta.url).then(p=>{try{p.exitSplit({instant:!0})}catch{}}).catch(()=>{})}if(typeof window<"u"&&window.__splitRestoreForApp&&!(n&&n.skipSplitRestore)){let c=!1;try{c=!!window.__splitRestoreForApp(s.id,i)}catch{c=!1}if(c)return}}catch{}lt("app_open"),o.popInProgress=!1,t&&tr(t);try{Nc(!0)}catch{}if(setTimeout(()=>{he(()=>Promise.resolve().then(()=>Wl),void 0,import.meta.url).then(c=>c.recordAppOpened(s.id)).catch(()=>{})},650),o.currentApp&&o.currentApp.id===s.id&&(o.isOpen||o.isClosing)){o.isClosing=!1,o.isOpen=!0,o.returnToFolderOnClose=!1,o.contentWarm=Ds(s.id),u.appWindow.classList.remove("closing"),u.appWindow.classList.add("open"),u.appWindow.style.pointerEvents="auto",t?(o.currentIconEl=t,t.classList.add("launch-hidden"),t.style.visibility=""):o.currentIconEl&&(tr(o.currentIconEl),o.currentIconEl.classList.add("launch-hidden"),o.currentIconEl.style.visibility="");const c=window.innerWidth/2-o.iconCX,p=window.innerHeight/2-o.iconCY;o.posSpring.reconfigure(Ke()),o.scaleSpring.reconfigure(Ke()),o.posSpring.setTarget(c,p),o.scaleSpring.setTarget(1),Za(o.currentIconEl||null,o.scaleSpring.x),Nn(1),typeof window<"u"&&(window.__lastOpenSource={cx:o.iconCX,cy:o.iconCY,w:o.iconW,h:o.iconH},window.__lastOpenStack=o.currentApp.id+" <- 承接(本体快速承接) "+(new Error().stack||"").split(`
`).slice(2,4).map(h=>h.trim().slice(0,80)).join(" | ")),et(Ke());return}const a=Ce.findIndex(c=>c.app&&c.app.id===s.id);if(a!==-1){const c=Ce[a];Gf(c),Ce.splice(a,1),o.currentApp&&(o.isOpen||o.isClosing)&&o.currentApp.id!==s.id&&ia(n&&n.prevExitRect?{exitTo:n.prevExitRect,initialOffsetX:n.prevOffsetX,initialOffsetY:n.prevOffsetY}:null),o.isOpen=!0,o.isClosing=!1,o.returnToFolderOnClose=!1,o.currentApp=s,o.currentIconEl=t||c.iconEl,o.contentWarm=Ds(s.id),o.currentIconEl&&(tr(o.currentIconEl),o.currentIconEl.classList.add("launch-hidden"),o.currentIconEl.style.visibility=""),o.iconCX=c.iconCX,o.iconCY=c.iconCY,o.iconW=c.iconW,o.iconH=c.iconH,o.posSpring.x.x=c.posSpring.x.x,o.posSpring.x.v=c.posSpring.x.v,o.posSpring.y.x=c.posSpring.y.x,o.posSpring.y.v=c.posSpring.y.v,o.scaleSpring.x=c.scaleSpring.x,o.scaleSpring.v=c.scaleSpring.v;const p=window.innerWidth/2-o.iconCX,h=window.innerHeight/2-o.iconCY;o.posSpring.reconfigure(Ke()),o.scaleSpring.reconfigure(Ke()),o.posSpring.setTarget(p,h),o.scaleSpring.setTarget(1),Ki(),qn(o.scaleSpring.x,o.iconCX+o.posSpring.px,o.iconCY+o.posSpring.py),u.appWindow.classList.remove("closing"),u.appWindow.classList.add("open"),u.appWindow.style.zIndex="540",u.windowShadowLayer&&(u.windowShadowLayer.style.zIndex="539"),u.appWindow.style.pointerEvents="auto",Za(o.currentIconEl||null,o.scaleSpring.x),Nn(1),typeof window<"u"&&(window.__lastOpenSource={cx:o.iconCX,cy:o.iconCY,w:o.iconW,h:o.iconH},window.__lastOpenStack=o.currentApp.id+" <- 承接(Actor唤回) "+(new Error().stack||"").split(`
`).slice(2,4).map(f=>f.trim().slice(0,80)).join(" | ")),et(Ke());return}o.currentApp&&(o.isOpen||o.isClosing)&&ia(n&&n.prevExitRect?{exitTo:n.prevExitRect,initialOffsetX:n.prevOffsetX,initialOffsetY:n.prevOffsetY}:null),o.isOpen=!0,o.isClosing=!1,o.returnToFolderOnClose=!1,o.currentIconEl=t,o.currentApp=s,o.navHistory=[0],u.appWindow.classList.remove("closing"),u.appWindow.classList.add("open"),u.appWindow.style.zIndex="540",u.windowShadowLayer&&(u.windowShadowLayer.style.zIndex="539"),u.appWindow.style.pointerEvents="auto";let r=Xf(i)?i:null;if(!r&&t&&(r=Rl(t)),!r){const c=yo(s);r={left:c.cx-c.w/2,top:c.cy-c.h/2,width:c.w,height:c.h}}if(o.iconCX=r.left+r.width/2,o.iconCY=r.top+r.height/2,o.iconW=r.width||58,o.iconH=r.height||58,typeof window<"u"&&(window.__lastOpenSource={cx:o.iconCX,cy:o.iconCY,w:o.iconW,h:o.iconH},window.__lastOpenStack=s.id+" <- "+(new Error().stack||"").split(`
`).slice(2,5).map(c=>c.trim().slice(0,90)).join(" | ")),Za(t||null),u.folderOverlay&&u.folderOverlay.classList.contains("active"))if(t&&u.folderGrid.contains(t)){u.folderOverlay.style.pointerEvents="none",u.folderOverlay.style.transition="none";const c=u.folderOverlay.querySelector(".folder-panel");c&&(c.style.transition="none")}else u.folderOverlay.classList.remove("active"),u.folderOverlay.style.background="",u.folderOverlay.style.backdropFilter="",u.folderOverlay.style.webkitBackdropFilter="",u.folderOverlay.style.opacity="",u.folderOverlay.style.transition="",u.folderOverlay.style.pointerEvents="auto";Ki(),o.contentWarm=Ds(s.id),o.currentApp.type?(u.launchIconContainer.innerHTML=Ye(o.currentApp.type,!0),u.appLaunchScreen.style.backgroundColor=o.currentApp.type==="clock"?"#18181B":"#FFFFFF"):(u.launchIconContainer.innerHTML=`<div class="launch-icon">${J(o.currentApp.id)}</div>`,u.appLaunchScreen.style.backgroundColor=o.currentApp.bgColor||"var(--md-surface, #1a1b1e)");const l=window.innerWidth/2-o.iconCX,d=window.innerHeight/2-o.iconCY;o.posSpring.x.x=0,o.posSpring.x.v=0,o.posSpring.x.target=l,o.posSpring.y.x=0,o.posSpring.y.v=0,o.posSpring.y.target=d,o.scaleSpring.x=0,o.scaleSpring.v=0,o.scaleSpring.target=1,qn(0,o.iconCX,o.iconCY),t&&(t.classList.add("launch-hidden"),t.style.visibility=""),et(Ke())}function Uf(e,t,i=null){if(!u.appWindow||!e){t&&t();return}o.rafId&&(cancelAnimationFrame(o.rafId),o.rafId=null),o.flightActive=!0;const n=u.appWindow.getBoundingClientRect(),s=window.innerWidth,a=window.innerHeight,r=M(n.width/Math.max(s,1),.2,1.2),l=n.left+n.width/2,d=n.top+n.height/2,c=l-s/2,p=d-a/2,h=parseFloat(getComputedStyle(u.appWindow).borderRadius)||0,f=e.width/Math.max(s,1),m=e.left+e.width/2-s/2,y=e.top+e.height/2-a/2,g=28;o.iconCX=e.left+e.width/2,o.iconCY=e.top+e.height/2,o.iconW=e.width,o.iconH=e.height;const w=Math.max(e.width/Math.max(s,1),.001),k=(Me,Ae,ti,ii=0,yt=0,Dt=0)=>{o.posSpring.x.x=Ae-o.iconCX,o.posSpring.y.x=ti-o.iconCY,o.posSpring.x.v=ii,o.posSpring.y.v=yt,o.scaleSpring.x=M((Me-w)/(1-w),0,1),o.scaleSpring.v=Dt};k(r,l,d),o.stageRaisedForFlight=!0;const S=document.getElementById("stage");S&&(S.style.zIndex="760"),u.appWindow.style.zIndex="760",u.appWindow.style.transition="none",u.appWindow.style.opacity="1",u.appWindow.style.filter="",u.windowShadowLayer&&(u.windowShadowLayer.style.opacity="0"),u.windowGlowLayer&&(u.windowGlowLayer.style.opacity="0");const b=Pt(),_=i&&i.velocity?i.velocity:null,A=M((r-w)/(1-w),0,1),I={tx:new Ie({...b,initialValue:c,initialVelocity:M(_&&_.vx||0,-2600,2600)}),ty:new Ie({...b,initialValue:p,initialVelocity:M(_&&_.vy||0,-2600,2600)}),p:new Ie({...b,initialValue:A,initialVelocity:M(_&&_.vs||0,-2.4,.6)})};I.tx.target=m,I.ty.target=y,I.p.target=0;const q=Math.max(Math.abs(A-0),1e-6);let D=!1;const T=1/120,G=30;let X=0,ne=performance.now();function be(Me){X+=Me;let Ae=0;for(;X>=T&&Ae<G;)I.tx.update(T),I.ty.update(T),I.p.update(T),X-=T,Ae++;X>=T&&(X=0)}function Te(Me){if(!o.flightActive)return;be(Math.min((Me-ne)/1e3,.25)),ne=Me;const Ae=I.tx.x,ti=I.ty.x,ii=M(I.p.x,-.08,1.12),yt=w+(1-w)*ii,Dt=M((A-ii)/q,0,1),sn=h+(g-h)*Dt;if(u.appWindow.style.transform=`translate3d(${Ae.toFixed(2)}px, ${ti.toFixed(2)}px, 0px) scale(${yt.toFixed(5)})`,u.appWindow.style.borderRadius=`${sn.toFixed(1)}px`,k(yt,s/2+Ae,a/2+ti,I.tx.v,I.ty.v,I.p.v),!D&&i&&typeof i.onApproach=="function"&&Math.abs(0-I.p.x)<=q*(typeof i.approachAt=="number"?i.approachAt:.42)){D=!0;try{i.onApproach()}catch{}}if(I.tx.isSettled(.01,2)&&I.ty.isSettled(.01,2)&&I.p.isSettled(.004,.6)){o.flightActive=!1,o.stageRaisedForFlight=!1;const ni=document.getElementById("stage");ni&&(ni.style.zIndex=""),u.appWindow.classList.remove("open","closing"),u.appWindow.style.transform="",u.appWindow.style.borderRadius="",u.appWindow.style.zIndex="",u.appWindow.style.transition="",o.isClosing=!1,o.isOpen=!0,o.rafId=null,k(f,s/2+m,a/2+y),t&&t();return}o.rafId=requestAnimationFrame(Te)}ne=performance.now(),o.rafId=requestAnimationFrame(Te)}function Bt(e=0,t=0,i=0,n=null){if(!o.isOpen&&!o.isClosing)return;ma(),o.isClosing||lt("app_close"),o.popInProgress=!1,o.isClosing=!0;try{Nc(!0)}catch{}try{window.__closeThemePicker&&window.__closeThemePicker()}catch{}if(o.currentApp)try{cf([o.currentApp.id])}catch{}if(u.appWindow.classList.add("closing"),u.appWindow.style.pointerEvents="none",o.currentApp){const d=H0(o.currentApp.id);if(d){u.folderOverlay.classList.contains("active")&&u.folderTitle.dataset.folderId===d.id?(u.folderOverlay.style.transition="none",u.folderOverlay.style.pointerEvents="none"):Ff(d,o.currentApp.id);const g=u.folderOverlay.querySelector(".folder-panel");g&&(g.style.transition="none"),o.returnToFolderOnClose=!0;const w=u.folderGrid.querySelector(`.app-icon[data-id="${o.currentApp.id}"]`);w&&(o.currentIconEl=w)}const c=yo(o.currentApp);c.el&&!o.currentIconEl&&(o.currentIconEl=c.el);const p=o.iconCX,h=o.iconCY,f=n&&Xf(n.shrinkTo)?n.shrinkTo:null;f?(o.iconCX=f.left+f.width/2,o.iconCY=f.top+f.height/2,o.iconW=f.width,o.iconH=f.height,u.appWindow.style.zIndex="760",u.windowShadowLayer&&(u.windowShadowLayer.style.zIndex="759"),o.shrinkToCard=!0,o.currentIconEl=null):(o.shrinkToCard=!1,o.iconCX=c.cx,o.iconCY=c.cy,o.iconW=c.w,o.iconH=c.h),o.posSpring.x.x+=p-o.iconCX,o.posSpring.y.x+=h-o.iconCY}(H.context!=="desktop"||H.items.length===0)&&Za(o.currentIconEl||null,1),Nn(0);const a=M(e,-2600,2600),r=M(t,-2600,2600),l=M(i,-2.4,.25);o.posSpring.setTarget(0,0,a,r),o.scaleSpring.setTarget(0,l),et(Pt())}let lp=!1;function Kf(){if(lp)return;lp=!0;const e=t=>{if(o.isEditMode||o.iconDragState||o.lastGestureMoved&&performance.now()-o.lastGestureEndedAt<500||t.target&&t.target.closest&&t.target.closest("#recentAppsOverlay")||!(o.isClosing||o.isOpen&&o.scaleSpring.x<.96))return;const n=t.clientX??(t.touches&&t.touches[0]?t.touches[0].clientX:t.changedTouches&&t.changedTouches[0]?t.changedTouches[0].clientX:null),s=t.clientY??(t.touches&&t.touches[0]?t.touches[0].clientY:t.changedTouches&&t.changedTouches[0]?t.changedTouches[0].clientY:null);if(n===null||s===null)return;let a=document.elementFromPoint(n,s)||t.target;if(!a)return;let r=a.closest?a.closest(".app-icon"):null,l=a.closest?a.closest(".app-folder"):null;if(!r&&!l&&document.elementsFromPoint){const d=document.elementsFromPoint(n,s);for(const c of d)if(!r&&c.closest&&(r=c.closest(".app-icon")),!l&&c.closest&&(l=c.closest(".app-folder")),r||l)break}if(r&&r.dataset&&r.dataset.id){const d=r.dataset.id,c=F.findIndex(p=>p.id===d);if(c!==-1){t.preventDefault(),t.stopPropagation(),t.stopImmediatePropagation&&t.stopImmediatePropagation(),j(c,r);return}}if(l&&l.dataset&&l.dataset.id){const d=l.dataset.id;let c=null;for(let p of o.pagesApps){for(let h of p)if(h&&h.id===d&&h.type==="folder"){c=h;break}if(c)break}if(c){t.preventDefault(),t.stopPropagation(),t.stopImmediatePropagation&&t.stopImmediatePropagation(),o.currentApp&&(o.isOpen||o.isClosing)&&ia(),he(()=>Promise.resolve().then(()=>b0),void 0,import.meta.url).then(p=>p.openFolder(c,l));return}}if(o.isClosing&&o.currentApp){const d=a.closest?a.closest(".app-window"):null;if(d&&!d.classList.contains("closing-actor")){t.preventDefault(),t.stopPropagation(),t.stopImmediatePropagation&&t.stopImmediatePropagation();const c=F.findIndex(p=>p.id===o.currentApp.id);if(c!==-1){j(c,o.currentIconEl);return}}}};window.addEventListener("pointerdown",e,{capture:!0,passive:!1}),window.addEventListener("touchstart",e,{capture:!0,passive:!1}),window.addEventListener("click",e,{capture:!0,passive:!1})}typeof window<"u"&&(Kf(),window.__parallelDebug=()=>({actors:Ce.map(e=>({z:parseInt(e.element.style.zIndex,10),iconW:Math.round(e.iconW),iconCX:Math.round(e.iconCX),iconCY:Math.round(e.iconCY),hasContent:!!(e.pageStackEl||e.header),contentChildren:e.element.children.length}))}),window.__findTarget=e=>{const t=F.find(n=>n.id===e)||null,i=yo(t);return{cx:Math.round(i.cx),cy:Math.round(i.cy),w:Math.round(i.w),el:i.el?i.el.dataset.id||i.el.className:null}},window.__animPresets.apply=e=>{Og(e);const t=Ke(),i=Pt();o.posSpring&&(o.posSpring.reconfigure(t),o.scaleSpring&&o.scaleSpring.reconfigure(t)),Ce.forEach(n=>{n.posSpring&&n.posSpring.reconfigure(i),n.scaleSpring&&n.scaleSpring.reconfigure(i)})});const XS=Object.freeze(Object.defineProperty({__proto__:null,clearPendingSwitchRebound:ma,closeApp:Bt,demoteCurrentAppToClosingActor:ia,flushGestureRender:rd,flyAppToCard:Uf,initTouchPriorityDispatcher:Kf,isParallelAnimationActive:Vf,openApp:j,render:qn,renderSubPages:ha,restoreDesktopAfterBatchClear:ta,retargetRadialField:Nn,scheduleGestureRender:er,startLoop:et,syncRadialFieldToProgress:jf},Symbol.toStringTag,{value:"Module"}));let na=215;try{const e=localStorage.getItem("ios-desktop:theme-hue");e&&(na=parseInt(e,10)||215)}catch{}const Mr=[{name:"Pixel 10 极光流光",url:"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",hue:215},{name:"Material You 抽象几何",url:"https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80",hue:165},{name:"深邃暗夜星云",url:"https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80",hue:275},{name:"赛博落日余晖",url:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",hue:35}];function od(){return na}function j0(e,t="dark"){return t==="light"?`
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
  `}function Qf(e,t="dark"){return`
    :root {
      ${j0(e,t)}
    }
    .md3-dynamic-accent { color: var(--md-accent) !important; }
    .md3-dynamic-bg { background-color: var(--md-surface) !important; }
    .md3-dynamic-card { background-color: var(--md-surface-container) !important; border-color: var(--md-outline-variant) !important; }
  `}function V0(){X0(),window.openThemePicker=xo,window.__themeHueTest={get:()=>na,set:e=>gt(e,!1)},window.__closeThemePicker=dd,window.__closeThemePickerAnimated=Zf,G0(),Rv({id:"themePicker",isActive:()=>{const e=Fi();return!!(e&&e.classList.contains("active")&&!C.dragging&&!C.x)},beginGesture:e=>window.__themePickerGesture.begin(e),progressGesture:e=>window.__themePickerGesture.progress(e),commitGesture:e=>window.__themePickerGesture.commit(e),cancelGesture:e=>window.__themePickerGesture.cancel(e)}),gt(na,!1)}const W0=.35,Ia=4e3,C={loop:0,pos2:null,x:null,dragging:!1,dir:1,cleanupTimer:0,closeDone:null};function Fi(){return document.getElementById("themePickerOverlay")}function hi(){return document.getElementById("themePickerCard")}function wo(){C.loop&&(cancelAnimationFrame(C.loop),C.loop=0)}function Jf(){wo(),C.pos2=null,C.x=null,C.dragging=!1,C.closeDone=null;const e=Fi(),t=hi();t&&(t.style.transition="",t.style.willChange="",t.style.transform=""),e&&(e.style.transition="",e.style.willChange="",e.style.opacity="",delete e.dataset.gesturing)}function Lr(){wo();const e=hi();if(!e)return;let t=performance.now();const i=n=>{const s=Math.min((n-t)/1e3,.03333333333333333)||.016666666666666666;t=n;let a=!1,r=0,l=0,d=1;C.pos2&&(C.pos2.update(s),r=C.pos2.px,l=C.pos2.py,Math.abs(C.pos2.x.v)<20&&Math.abs(C.pos2.y.v)<20&&Math.abs(r-C.pos2.x.target)<.5&&Math.abs(l-C.pos2.y.target)<.5?C.pos2=null:a=!0);let c=!1;if(C.x&&(C.x.update(s),r=C.x.x,l=0,d=1,c=!0,Math.abs(C.x.v)<20&&Math.abs(r-C.x.target)<.5?(C.x=null,c=!1,r=0):a=!0),C.pos2||c)e.style.transform=`translate3d(${r.toFixed(2)}px, ${l.toFixed(2)}px, 0) scale(${d.toFixed(4)})`;else{e.style.transform="",e.style.willChange="";const p=C.closeDone;C.closeDone=null,p&&p()}C.loop=a||C.closeDone?requestAnimationFrame(i):0};C.loop=requestAnimationFrame(i)}function Y0(){const e=hi();if(!e)return;const t=window.innerWidth,i=Ke();C.pos2=new lo(i,t+80,0,0,0),C.pos2.setTarget(0,0,0,0),C.x=null,e.style.willChange="transform",e.style.transform=`translate3d(${(t+80).toFixed(2)}px, 0, 0)`,Lr()}function Zf(){const e=Fi(),t=hi();!e||!t||!e.classList.contains("active")||C.dragging||C.x||C.closeDone||(C.pos2&&(wo(),C.pos2=null,C.closeDone=null,t.style.transform="",t.style.willChange=""),e.style.transition="opacity 0.22s ease",e.style.opacity="0",C.x=new Ie({...Pt(),initialValue:0}),C.x.setTarget(window.innerWidth+80,null),C.closeDone=()=>{dd(),e.style.transition="",e.style.opacity=""},Lr())}function G0(){window.__themePickerGesture={isActive:()=>{const e=Fi();return!!(e&&e.classList.contains("active")&&!C.dragging&&!C.x)},begin(e){const t=Fi(),i=hi();!t||!i||!t.classList.contains("active")||(C.pos2&&(wo(),C.pos2=null,i.style.transform="",i.style.willChange=""),clearTimeout(C.cleanupTimer),C.dragging=!0,C.dir=e>=0?1:-1,i.style.willChange="transform",t.dataset.gesturing="1",C.cleanupTimer=setTimeout(()=>{delete Fi()?.dataset.gesturing},1200))},progress(e){if(!C.dragging)return;const t=hi();if(!t)return;const i=(e>0?e:e*W0)*C.dir;t.style.transform=`translate3d(${i.toFixed(2)}px, 0, 0)`},commit(e){if(!C.dragging)return;C.dragging=!1;const t=hi();if(!t)return;const i=/translate3d\(([-\d.]+)px/.exec(t.style.transform||""),n=i?parseFloat(i[1]):0,s=window.innerWidth;C.x=new Ie({...Pt(),initialValue:n,initialVelocity:Math.max(-Ia,Math.min(Ia,(e||0)*C.dir))}),C.x.setTarget(C.dir*(s+80),null),C.closeDone=()=>dd(),Lr()},cancel(e){if(!C.dragging)return;C.dragging=!1;const t=hi();if(!t)return;const i=/translate3d\(([-\d.]+)px/.exec(t.style.transform||""),n=i?parseFloat(i[1]):0;C.x=new Ie({...Pt(),initialValue:n,initialVelocity:Math.max(-Ia,Math.min(Ia,(e||0)*C.dir))}),C.x.setTarget(0,null),C.closeDone=()=>{const s=Fi();s&&delete s.dataset.gesturing},Lr()}}}function X0(){let e=document.getElementById("themePickerOverlay");if(e)return;e=document.createElement("div"),e.id="themePickerOverlay",e.className="theme-picker-overlay",e.innerHTML=`
    <div class="theme-picker-card" id="themePickerCard">
      <div class="theme-picker-header">
        <div class="theme-picker-title" id="themePickerTitle">${v.image} 壁纸与动态壁纸</div>
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
            ${v.folder}
            <span class="theme-upload-zone-texts">
              <span class="theme-upload-zone-title">上传图片 / 视频</span>
              <span class="theme-upload-zone-sub">自动识别：图片 → 静态壁纸，视频 → 动态壁纸</span>
            </span>
          </button>
          <div class="theme-section-hint">支持 JPG / PNG / WebP 图片与 MP4 / WebM 视频，视频上限 200MB；上传视频后会自动提取画面主题色联动全局配色</div>
        </div>
      </div>
    </div>
  `,e.addEventListener("click",i=>{e.dataset.gesturing==="1"&&(i.stopPropagation(),i.preventDefault())},!0),document.body.appendChild(e),document.getElementById("themeUploadAnyBtn").addEventListener("click",()=>{Rc(),Zf()});const t=document.getElementById("themeModeRow");t&&t.querySelectorAll(".theme-mode-opt").forEach(i=>{i.addEventListener("click",()=>{Jn(i.dataset.mode),cd()})}),Q0(),Z0()}function ld(){const e=document.getElementById("themeNavWallpaperSub");if(!e)return;let t="静态 / 动态 / 视频";try{if(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive())t="当前使用：视频动态壁纸";else{const i=Yt();if(i){const n=Oi.find(s=>s.id===i);t=`当前使用：${n?n.name:"程序化"}动态壁纸`}else t=localStorage.getItem("ios-desktop:wallpaper")||""?"当前使用：自定义 / 预设静态壁纸":"静态 / 动态 / 视频"}}catch{}e.textContent=t}function U0(){const e=document.getElementById("themeNavWallpaperThumb");if(!e)return;let t="";try{if(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive())t=window.__videoWallpaper.getVideoFrameDataURL()||"";else if(Yt())t=da()||"";else{const n=(document.getElementById("desktop")?.style.backgroundImage||"").match(/url\(["']?(.+?)["']?\)/);t=n?n[1]:""}}catch{}e.style.backgroundImage=t?`url('${t}')`:"none",e.classList.toggle("empty",!t)}function K0(){ld(),U0()}function cd(){const e=document.getElementById("themeModeRow");if(!e)return;const t=Oc();e.querySelectorAll(".theme-mode-opt").forEach(i=>{i.classList.toggle("active",i.dataset.mode===t)})}function Q0(){cd()}function J0(){const e=document.getElementById("themeDynamicGrid");if(!e)return;const t=Yt();e.innerHTML=Oi.map((i,n)=>`
    <div class="wallpaper-thumb-card proc-card ${n===0?"proc-hero":""} ${i.id===t?"active":""}" data-proc="${i.id}">
      <div class="wallpaper-thumb-img" style="background-image: url('${Uu(i.id)}');"></div>
      <span class="proc-live-badge">LIVE</span>
      <span class="wallpaper-thumb-name">${i.name}</span>
    </div>
  `).join(""),e.querySelectorAll("[data-proc]").forEach(i=>{i.addEventListener("click",()=>{const n=i.dataset.proc,s=Oi.find(a=>a.id===n);if(s){Hi(),Ut();try{localStorage.removeItem("ios-desktop:wallpaper"),sessionStorage.removeItem("ios-desktop:wallpaper")}catch{}Pn(n),gt(s.hue,!1),ld(),e.querySelectorAll("[data-proc]").forEach(a=>a.classList.remove("active")),i.classList.add("active")}})})}function Z0(){const e=document.getElementById("themeWallpapersGrid");e&&(e.innerHTML=Mr.map((t,i)=>`
    <div class="wallpaper-thumb-card" data-idx="${i}">
      <div class="wallpaper-thumb-img" style="background-image: url('${t.url}');"></div>
      <span class="wallpaper-thumb-name">${t.name}</span>
    </div>
  `).join(""),e.querySelectorAll(".wallpaper-thumb-card").forEach(t=>{t.addEventListener("click",()=>{const i=parseInt(t.dataset.idx,10),n=Mr[i];if(n){Hi(),Bn(),Ut(),nn();try{document.getElementById("themeUploadAnyBtn")?.classList.remove("active"),e.querySelectorAll("[data-proc]").forEach(s=>s.classList.remove("active"))}catch{}u.desktop.style.backgroundImage=`url('${n.url}')`;try{localStorage.setItem("ios-desktop:wallpaper",n.url)}catch{}gt(n.hue,!0),document.querySelectorAll("iframe").forEach(s=>{try{s.contentWindow.postMessage({type:"set-wallpaper",url:n.url},"*")}catch{}}),window.showSystemToast&&window.showSystemToast(`已应用壁纸与主题色: ${n.name}`,v.palette),ld()}})}))}function gt(e,t=!0){na=e;const i=Ct()==="light"?"light":"dark",n=i==="light",s=document.documentElement;s.style.setProperty("--md-h",e),s.style.setProperty("--h",e),s.style.setProperty("--md-primary",`hsl(${e}, ${n?"78%, 38%":"82%, 36%"})`),s.style.setProperty("--md-on-primary","#ffffff"),s.style.setProperty("--md-primary-container",`hsl(${e}, ${n?"88%, 90%":"85%, 22%"})`),s.style.setProperty("--md-on-primary-container",n?`hsl(${e}, 60%, 16%)`:`hsl(${e}, 92%, 92%)`),s.style.setProperty("--md-secondary",`hsl(${e}, ${n?"32%, 38%":"28%, 46%"})`),s.style.setProperty("--md-tertiary",`hsl(${(e+60)%360}, 65%, 40%)`),s.style.setProperty("--md-surface",`hsl(${e}, ${n?"40%, 98%":"18%, 8%"})`),s.style.setProperty("--md-surface-container",`hsl(${e}, ${n?"32%, 93%":"16%, 14%"})`),s.style.setProperty("--md-accent",`hsl(${e}, ${n?"85%, 40%":"92%, 68%"})`),s.style.setProperty("--md-outline-variant",`hsl(${e}, ${n?"18%, 82%":"12%, 24%"})`);try{localStorage.setItem("ios-desktop:theme-hue",String(e))}catch{}document.querySelectorAll("iframe").forEach(a=>{try{const r=a.contentDocument||a.contentWindow&&a.contentWindow.document;if(r&&r.head){let l=r.getElementById("md3-dynamic-injected-theme");l||(l=r.createElement("style"),l.id="md3-dynamic-injected-theme",r.head.appendChild(l)),l.textContent=Qf(e,i)}r&&r.documentElement&&(r.documentElement.style.setProperty("--md-h",e),r.documentElement.style.setProperty("--h",e)),r&&r.documentElement&&(r.documentElement.dataset.themeMode=i),a.contentWindow&&a.contentWindow.postMessage({type:"set-theme-hue",hue:e,mode:i},"*")}catch{}}),t&&window.showSystemToast&&window.showSystemToast(`已应用 Material You 主题色 (色相 ${e}°)`,v.auto_awesome)}function e1(e){if(!e)return;e.innerHTML=`
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
          ${v.folder}
          <span style="display:flex;flex-direction:column;gap:3px;">
            <span style="font-size:14px;font-weight:600;">上传图片 / 视频</span>
            <span style="font-size:12px;color:var(--md-on-surface-variant);">自动识别：图片 → 静态壁纸，视频 → 动态壁纸</span>
          </span>
        </button>
      </div>
    </div>
  `;function t(){const l=e.querySelector("#setNavWallpaperThumb"),d=e.querySelector("#setNavWallpaperSub");if(d){let p="静态 / 动态 / 视频";try{if(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive())p="当前使用：视频动态壁纸";else{const h=Yt();if(h){const f=Oi.find(m=>m.id===h);p=`当前使用：${f?f.name:"程序化"}动态壁纸`}else p=localStorage.getItem("ios-desktop:wallpaper")||""?"当前使用：自定义 / 预设静态壁纸":"静态 / 动态 / 视频"}}catch{}d.textContent=p}if(l){let p="";try{if(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive())p=window.__videoWallpaper.getVideoFrameDataURL()||"";else if(Yt())p=da()||"";else{const f=(document.getElementById("desktop")?.style.backgroundImage||"").match(/url\(["']?(.+?)["']?\)/);p=f?f[1]:""}}catch{}l.style.backgroundImage=p?`url('${p}')`:"none"}const c=e.querySelector("#setThemeModeRow");if(c){const p=Oc();c.querySelectorAll(".theme-mode-opt").forEach(h=>{const f=h.dataset.mode===p;h.style.background=f?"hsl(var(--md-h,215) 80% 55% / 0.25)":"transparent",h.style.color=f?"hsl(var(--md-h,215) 85% 65%)":"var(--md-on-surface-variant)",h.style.fontWeight=f?"600":"500"})}}const i=e.querySelector("#setThemeModeRow");i&&i.querySelectorAll(".theme-mode-opt").forEach(l=>{l.addEventListener("click",()=>{Jn(l.dataset.mode),t()})});const n=e.querySelector("#setDynamicGrid");if(n){const l=Yt();n.innerHTML=Oi.map((f,m)=>`
      <div class="wallpaper-thumb-card proc-card ${m===0?"proc-hero":""} ${f.id===l?"active":""}" data-proc="${f.id}" style="cursor:pointer;position:relative;border-radius:14px;overflow:hidden;border:1.5px solid ${f.id===l?"hsl(var(--md-h,215) 85% 60%)":"transparent"};background:var(--md-surface-container-high,#2f3136);">
        <div data-proc-thumb="${f.id}" style="height:86px;background-color:var(--md-surface-container-high,#2f3136);background-size:cover;background-position:center;"></div>
        <div style="padding:8px 10px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:600;color:var(--md-on-surface);">${f.name}</span>
          <span style="font-size:9px;padding:2px 5px;border-radius:4px;background:hsl(var(--md-h,215) 80% 55% / 0.2);color:hsl(var(--md-h,215) 85% 65%);font-weight:700;">LIVE</span>
        </div>
      </div>
    `).join("");const d=Array.from(n.querySelectorAll("[data-proc-thumb]"));let c=0;const p=()=>{if(c>=d.length)return;const f=d[c++],m=Uu(f.dataset.procThumb);f.isConnected&&m&&(f.style.backgroundImage=`url('${m}')`),c<d.length&&h()},h=()=>{typeof requestIdleCallback=="function"?requestIdleCallback(p,{timeout:900}):setTimeout(p,64)};d.length&&h(),n.querySelectorAll("[data-proc]").forEach(f=>{f.addEventListener("click",()=>{const m=f.dataset.proc,y=Oi.find(g=>g.id===m);if(y){Hi(),Ut();try{localStorage.removeItem("ios-desktop:wallpaper"),sessionStorage.removeItem("ios-desktop:wallpaper")}catch{}Pn(m),gt(y.hue,!1),t(),n.querySelectorAll("[data-proc]").forEach(g=>{const w=g.dataset.proc===m;g.style.borderColor=w?"hsl(var(--md-h,215) 85% 60%)":"transparent"})}})})}const s=e.querySelector("#setWallpapersGrid");s&&(s.innerHTML=Mr.map((l,d)=>`
      <div class="wallpaper-thumb-card" data-idx="${d}" style="cursor:pointer;border-radius:12px;overflow:hidden;background:var(--md-surface-container-high,#2f3136);border:1.5px solid transparent;">
        <div style="height:90px;background-size:cover;background-position:center;background-image:url('${l.url}');"></div>
        <div style="padding:6px 8px;font-size:11px;font-weight:500;color:var(--md-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.name}</div>
      </div>
    `).join(""),s.querySelectorAll(".wallpaper-thumb-card").forEach(l=>{l.addEventListener("click",()=>{const d=parseInt(l.dataset.idx,10),c=Mr[d];if(c){Hi(),Bn(),Ut(),nn(),u.desktop.style.backgroundImage=`url('${c.url}')`;try{localStorage.setItem("ios-desktop:wallpaper",c.url)}catch{}gt(c.hue,!0),document.querySelectorAll("iframe").forEach(p=>{try{p.contentWindow.postMessage({type:"set-wallpaper",url:c.url},"*")}catch{}}),window.showSystemToast&&window.showSystemToast(`已应用壁纸: ${c.name}`,v.palette),t(),n&&n.querySelectorAll("[data-proc]").forEach(p=>{p.style.borderColor="transparent"})}})}));const a=e.querySelector("#setUploadBtn");a&&a.addEventListener("click",()=>{Rc()});const r=()=>{if(!e.isConnected)return;const l=e.querySelector("#setDynamicGrid"),d=Yt();l&&l.querySelectorAll("[data-proc]").forEach(c=>{const p=c.dataset.proc===d&&!(window.__videoWallpaper&&window.__videoWallpaper.isVideoActive());c.style.borderColor=p?"hsl(var(--md-h,215) 85% 60%)":"transparent"}),t()};window.addEventListener("wallpaper-changed",r),t()}window.__initWallpaperPage=e1;const cp=13,t1=260;function xo(e=null){const t=F.findIndex(s=>s.id==="settings");if(t!==-1){!o.isOpen||!o.currentApp||o.currentApp.id!=="settings"?(j(t,e),setTimeout(()=>{vr(cp)},t1)):vr(cp);return}const i=document.getElementById("themePickerOverlay");if(!i||i.classList.contains("active"))return;Jf(),J0(),cd(),K0(),i.classList.add("active");const n=document.getElementById("themeWallpaperView");n&&(n.scrollTop=0),Y0()}window.openWallpaperSettings=xo;window.openThemePicker=xo;window.__openWallpaperSubView=xo;function dd(){const e=document.getElementById("themePickerOverlay");e&&(e.classList.remove("active"),clearTimeout(C.cleanupTimer),Jf())}const eh=new Map;function i1(e){!e.data||e.data.type!=="PB_STATE"||!e.source||eh.set(e.source,{canBack:!!e.data.canBack})}function n1(e){try{e&&e.contentWindow&&e.contentWindow.postMessage({type:"PB_SYNC_REQ"},"*")}catch{}}function th(){if(!o.isOpen||o.isClosing||!o.currentApp||typeof window<"u"&&window.__splitInfo&&window.__splitInfo().active)return null;const e=document.getElementById("app-instance-"+o.currentApp.id),t=e?e.querySelectorAll("iframe"):[];for(const i of t){if(!i.contentWindow)continue;const n=eh.get(i.contentWindow);if(n)return{win:i.contentWindow,canBack:n.canBack}}return null}function sa(e,t){try{e&&e.postMessage(t,"*")}catch{}}function ih(e){if(!e)return;const t=od(),i=Ct()==="light"?"light":"dark";try{const n=e.contentDocument||e.contentWindow&&e.contentWindow.document;if(n&&n.head){let s=n.getElementById("md3-dynamic-injected-theme");s||(s=n.createElement("style"),s.id="md3-dynamic-injected-theme",n.head.appendChild(s)),s.textContent=Qf(t,i)}n&&n.documentElement&&(n.documentElement.style.setProperty("--md-h",t),n.documentElement.style.setProperty("--h",t),n.documentElement.dataset.themeMode=i)}catch{}try{e.contentWindow&&e.contentWindow.postMessage({type:"set-theme-hue",hue:t,mode:i},"*")}catch{}}window.__syncIframeApp||(window.__syncIframeApp=function(e){ih(e),n1(e)});function s1(e){try{const i=new URL(import.meta.url).pathname.match(/^(.*\/ios-desktop)\/js\/[^/]+$/);if(i&&!e.startsWith("/")&&!e.startsWith("http"))return(i[1]+"/"+e).replace(/\/{2,}/g,"/")}catch{}return e}function de(e,t={}){const i=t.sandbox?` sandbox="${t.sandbox}"`:"",n=t.onLoadExtra?`;${t.onLoadExtra}`:"";return`<div style="position:absolute;inset:0;width:100%;height:100%;overflow:hidden;border-radius:0;background:var(--md-surface,#121316);">
    <iframe src="${s1(e)}"${i}
      style="width:100%;height:100%;border:none;display:block;"
      allow="autoplay; fullscreen; microphone; geolocation; camera; display-capture"
      loading="eager"
      onload="this.dataset.loaded='1';window.__syncIframeApp&&window.__syncIframeApp(this)${n}">
    </iframe>
  </div>`}const a1={id:"msg",name:"信息",pages:[{title:"信息",content:de("apps/messages/index.html")}]},r1={id:"mail",name:"邮件",pages:[{title:"收件箱",content:`
        <div style="padding:16px 0;position:relative;min-height:100%;">
          <!-- 搜索栏 MD3 Search Bar -->
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:16px;border:1px solid var(--md-outline-variant);">
            <span style="font-size:18px;color:var(--md-on-surface-variant);">${v.search}</span>
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
              <span style="font-size:24px;">${v.edit}</span>
            </button>
          </div>
        </div>
      `},{title:"邮件详情",content:`
        <div style="padding:16px 0;">
          <div class="md3-card" style="margin-bottom:16px;">
            <h2 style="font-size:18px;font-weight:600;line-height:1.4;color:var(--md-on-surface);margin-bottom:10px;">[PR] Fix spring animation overflow bug — approved</h2>
            <div style="display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid var(--md-outline-variant);">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--md-secondary-container);display:flex;align-items:center;justify-content:center;font-size:18px;">${v.code}</div>
              <div style="flex:1;">
                <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);">GitHub</div>
                <div style="font-size:12px;color:var(--md-on-surface-variant);">noreply@github.com · 09:24</div>
              </div>
            </div>
            <div style="padding-top:16px;font-size:14px;line-height:1.6;color:var(--md-on-surface);">
              <p>Hi,</p>
              <p style="margin:10px 0;">你的 Pull Request <strong>#142</strong> 已被批准并合并到 <code style="background:var(--md-surface-container-highest);padding:2px 8px;border-radius:6px;font-size:13px;color:var(--md-primary);">main</code> 分支。</p>
              <p style="margin:10px 0;">修改内容：重构物理弹簧引擎，优化文件夹打开/返回动画连续性，全面适配 Material Design 3 表达性设计系统与定制圆角间隙滑块。</p>
              <p style="margin-top:16px;">感谢你的卓越贡献！${v.auto_awesome}</p>
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
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:12px;" onclick="__demoAction && __demoAction('管理受信任设备')">管理受信任设备</button>
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
            <button class="md3-btn md3-btn-tonal" style="flex:1;" onclick="__demoAction && __demoAction('存为草稿')">存为草稿</button>
          </div>
        </div>
      `}]},o1={id:"photo",name:"相册",pages:[{title:"相册",content:de("apps/photos/index.html")}]},nh="android16-geek-backup",l1=["android16-zeekr-backup","ios-desktop-backup"],c1=1,Ol="ios-desktop-files",sh="kv",d1=8,$l="ios-desktop:backup-rollback";function ze(e,t){try{typeof window<"u"&&window.showSystemToast&&window.showSystemToast(e,t)}catch{}}function ms(e){return e<10?"0"+e:""+e}function p1(){const e=new Date;return"android16-geek-backup-"+e.getFullYear()+ms(e.getMonth()+1)+ms(e.getDate())+"-"+ms(e.getHours())+ms(e.getMinutes())+ms(e.getSeconds())+".json"}function u1(e){try{return typeof Blob<"u"&&e instanceof Blob}catch{return!1}}function f1(e){if(u1(e))return new Promise(t=>{let i;try{i=new FileReader}catch{t({__backupType:"json",value:null});return}i.onload=()=>{try{const n=String(i.result||""),s=";base64,",a=n.indexOf(s),r=a>=0?n.slice(a+s.length):n;t({__backupType:"blob",mime:e.type||"",name:e.name||"",base64:r})}catch{t({__backupType:"json",value:null})}},i.onerror=()=>t({__backupType:"json",value:null});try{i.readAsDataURL(e)}catch{t({__backupType:"json",value:null})}});try{return Promise.resolve({__backupType:"json",value:JSON.parse(JSON.stringify(e))})}catch{let i;try{i=String(e)}catch{i=null}return Promise.resolve({__backupType:"json",value:i})}}function h1(e,t){const i=atob(e),n=new Uint8Array(i.length);for(let s=0;s<i.length;s++)n[s]=i.charCodeAt(s);return new Blob([n],{type:t||"application/octet-stream"})}function m1(e){if(!e||typeof e!="object")return e;if(e.__backupType==="blob"&&typeof e.base64=="string")try{return h1(e.base64,e.mime)}catch{return null}return e.__backupType==="json"?e.value:e}async function g1(){try{const e={};try{const g=Object.keys(localStorage);for(const w of g)try{e[w]=localStorage.getItem(w)}catch{}}catch{}const t=await Gi(),i=await Gi(),n=g=>g.map(w=>w&&w.key!=null?String(w.key):"").join("");if(n(t)!==n(i)){ze("导出失败：本地数据读取不稳定，请稍后重试");return}const s=t,a=[];for(const g of s)if(!(!g||typeof g.key>"u"||g.key===null))try{const w=await f1(g.value);a.push({key:g.key,value:w})}catch{}let r=null;try{r=localStorage.getItem("ios-desktop:data-version")||null}catch{}const l={format:nh,version:c1,exportedAt:new Date().toISOString(),dataVersion:r,localStorage:e,indexedDB:{[Ol]:{[sh]:a}}},d=JSON.stringify(l,null,2),c=new Blob([d],{type:"application/json"}),p=URL.createObjectURL(c),h=document.createElement("a");h.href=p,h.download=p1(),h.style.display="none",document.body.appendChild(h),h.click();try{h.remove()}catch{}setTimeout(()=>{try{URL.revokeObjectURL(p)}catch{}},3e3);const f=c.size/1024/1024;let y="备份已导出：共 "+(Object.keys(e).length+a.length)+" 条数据（约 "+f.toFixed(1)+" MB）";f>d1&&(y+="，含视频/字体等大文件，体积较大"),ze(y,v.download)}catch(e){ze("导出失败："+(e&&e.message?e.message:"未知错误"))}}function v1(e){return new Promise((t,i)=>{try{const n=new FileReader;n.onload=()=>t(String(n.result||"")),n.onerror=()=>i(new Error("文件读取失败")),n.readAsText(e)}catch(n){i(n)}})}function y1(e){try{const t=e&&e.indexedDB&&e.indexedDB[Ol]&&e.indexedDB[Ol][sh];return Array.isArray(t)?t:[]}catch{return[]}}function w1(){try{const e={};for(const t of Object.keys(localStorage))try{const i=localStorage.getItem(t);typeof i=="string"&&(e[t]=i)}catch{}return e}catch{return null}}async function gs(e,t,i){let n=!0,s=!0;try{localStorage.clear();for(const a of Object.keys(e))try{localStorage.setItem(a,e[a])}catch{n=!1}}catch{n=!1}if(i)try{await Mc()?t&&t.length&&(s=await Tc(t)):s=!1}catch{s=!1}try{localStorage.removeItem($l)}catch{}return{lsOk:n,idbOk:s}}function x1(){try{if(typeof document>"u"||!document.body)return;const e=document.createElement("input");e.type="file",e.accept=".json,application/json",e.style.display="none",document.body.appendChild(e);const t=()=>{try{e.remove()}catch{}};e.addEventListener("change",()=>{const i=e.files&&e.files[0];t(),i&&b1(i)}),e.addEventListener("cancel",()=>t()),e.click()}catch(e){ze("无法打开文件选择器："+(e&&e.message?e.message:"未知错误"))}}async function b1(e){let t=null;try{t=JSON.parse(await v1(e))}catch{ze("导入失败：文件不是有效的 JSON 备份");return}if(!t||t.format!==nh&&!l1.includes(t.format)){ze("导入失败：不是有效的桌面备份文件");return}const i=t.localStorage&&typeof t.localStorage=="object"&&!Array.isArray(t.localStorage)?t.localStorage:{},n=y1(t),s=Object.keys(i).length,a=n.length,r=n.some(f=>f&&f.value&&f.value.__backupType==="blob"),l=["确认从备份恢复全部数据？当前数据将被覆盖，且无法撤销。","","导出时间："+(t.exportedAt||"未知"),"localStorage 条目："+s+" 条","IndexedDB 条目："+a+" 条"];r&&l.push("提示：备份含视频/字体等大文件，恢复可能需要几秒钟。");let d=!1;try{d=confirm(l.join(`
`))}catch{d=!1}if(!d)return;const c=w1();if(c===null){ze("导入失败：无法读取当前数据（建立回滚快照失败），已取消导入");return}let p=[];{let f=[],m=[];try{f=await Gi(),m=await Gi()}catch{}const y=g=>g.map(w=>w&&w.key!=null?String(w.key):"").join("");if(y(f)!==y(m)){ze("导入失败：无法稳定读取当前数据，已取消导入，请稍后重试");return}p=f}let h=!1;try{let f=0,m=!1;try{localStorage.clear()}catch{m=!0}if(!m)for(const S of Object.keys(i))try{localStorage.setItem(S,String(i[S]))}catch{f++}if(m||f>0){const S=await gs(c,[],!1);ze(S.lsOk?"导入失败："+(m?"localStorage 无法写入":f+" 条数据写入被拒绝")+"，已恢复原数据":"导入失败，且自动恢复未完全成功，建议立即重新导出备份");return}try{localStorage.setItem($l,JSON.stringify({savedAt:new Date().toISOString(),note:"导入进行中的回滚快照（正常情况下导入结束会自动清除，若长期存在说明上次导入被中断）",localStorage:c}))}catch{}let y=!1;try{y=await Mc()}catch{y=!1}if(!y){const S=await gs(c,p,!1);ze(S.lsOk&&S.idbOk?"导入失败：无法清空本地 IndexedDB 存储，已恢复原数据":"导入失败，且自动恢复未完全成功，建议立即重新导出备份");return}h=!0;let g=0,w=0;if(a>0){const S=[];for(const _ of n){if(!_||typeof _.key>"u"||_.key===null)continue;const A=m1(_.value);if(A===null){w++;continue}S.push({key:_.key,value:A})}if(S.length===0){const _=await gs(c,p,!0);ze(_.lsOk&&_.idbOk?"导入失败：备份中的 IndexedDB 数据全部无法解码，已恢复原数据":"导入失败，且自动恢复未完全成功，建议立即重新导出备份");return}let b=!1;try{b=await Tc(S)}catch{b=!1}if(!b){const _=await gs(c,p,h);ze(_.lsOk&&_.idbOk?"导入失败：IndexedDB 数据写回失败，已恢复原数据":"导入失败，且自动恢复未完全成功，建议立即重新导出备份");return}g=S.length}try{localStorage.removeItem($l)}catch{}let k="数据导入成功：localStorage "+s+" 条、IndexedDB "+g+" 条，正在刷新…";w>0&&(k+="（跳过无法解码的条目 "+w+" 条）"),ze(k,v.check),setTimeout(()=>{try{location.reload()}catch{}},800)}catch(f){const m=await gs(c,p,h);ze(m.lsOk&&m.idbOk?"导入失败："+(f&&f.message?f.message:"未知错误")+"，已恢复原数据":"导入失败，且自动恢复未完全成功，建议立即重新导出备份")}}if(typeof window<"u")try{window.__dataBackup={exportBackup:g1,pickImportFile:x1}}catch{}const S1=[{id:"track-1",title:"Pixel Space: Android 16 & MD3",artist:"Google Pixel 开发者电台",album:"Google I/O Special",coverGradient:"linear-gradient(135deg, #a8c7fa 0%, #669df6 100%)",src:"https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",isLocal:!1,durationText:"02:40"},{id:"track-2",title:"Lofi Chill Study & Focus Code",artist:"Lofi Girl • 专注编程频道",album:"Deep Focus Sessions",coverGradient:"linear-gradient(135deg, #d0bcff 0%, #9a82db 100%)",src:"https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3",isLocal:!1,durationText:"02:05"},{id:"track-3",title:"Beethoven: Moonlight Sonata",artist:"经典交响乐团",album:"Classical Masterpieces",coverGradient:"linear-gradient(135deg, #c2e7ff 0%, #7fcfff 100%)",src:"https://cdn.pixabay.com/download/audio/2021/09/06/audio_733568c853.mp3?filename=beethoven-moonlight-sonata-114422.mp3",isLocal:!1,durationText:"05:14"}];class k1{constructor(){this.audio=null,this.playlist=[...S1],this.currentIndex=0,this.isPlaying=!1,this.currentTime=0,this.duration=0,this.playbackRate=1,this.volume=.6,this.listeners=new Set,this.localUrls=new Map}ensureAudio(){return this.audio?this.audio:(this.audio=new Audio,this.audio.preload="metadata",this.audio.volume=this.volume,this.audio.playbackRate=this.playbackRate,this.setupAudioEvents(),this.audio)}applyTrackSrc(t){t&&(this.audio.src=t.src,this.audio.playbackRate=this.playbackRate,this.currentTime=0,this.duration=0)}ensureLoaded(){this.ensureAudio(),this.audio.src||this.applyTrackSrc(this.playlist[this.currentIndex]||this.playlist[0])}setupAudioEvents(){this.audio.addEventListener("play",()=>{this.isPlaying=!0,this.syncMediaSession(),this.notify()}),this.audio.addEventListener("pause",()=>{this.isPlaying=!1,this.syncMediaSession(),this.notify()}),this.audio.addEventListener("timeupdate",()=>{this.currentTime=this.audio.currentTime,this.duration=this.audio.duration||0,this.syncPositionState(),this.notify()}),this.audio.addEventListener("loadedmetadata",()=>{this.duration=this.audio.duration||0,this.syncMediaSession(),this.notify()}),this.audio.addEventListener("ended",()=>{this.next()}),this.audio.addEventListener("error",t=>{console.warn("Audio stream fallback notice:",t)}),this.setupMediaSessionHandlers()}setupMediaSessionHandlers(){if(!("mediaSession"in navigator))return;const t=navigator.mediaSession,i=(n,s)=>{try{t.setActionHandler(n,s)}catch{}};i("play",()=>this.play()),i("pause",()=>this.pause()),i("previoustrack",()=>this.prev()),i("nexttrack",()=>this.next()),i("seekbackward",n=>{this.audio&&(this.audio.currentTime=Math.max(0,this.audio.currentTime-(n.seekOffset||10)))}),i("seekforward",n=>{this.audio&&(this.audio.currentTime=Math.min(this.duration||this.audio.duration||0,this.audio.currentTime+(n.seekOffset||10)))}),i("seekto",n=>{this.audio&&n.seekTime!=null&&this.duration>0&&(this.audio.currentTime=n.seekTime)}),this.syncMediaSession()}syncMediaSession(){if("mediaSession"in navigator)try{const t=this.getCurrentTrack();navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:t.album}),navigator.mediaSession.playbackState=this.isPlaying?"playing":"paused",this.syncPositionState()}catch{}}syncPositionState(){if(!(!("mediaSession"in navigator)||!navigator.mediaSession.setPositionState))try{this.audio&&this.duration>0&&Number.isFinite(this.duration)&&navigator.mediaSession.setPositionState({duration:this.duration,playbackRate:this.playbackRate||1,position:Math.min(this.audio.currentTime,this.duration)})}catch{}}loadTrack(t,i=!0){if(t<0||t>=this.playlist.length)return;this.currentIndex=t;const n=this.playlist[t];if(!this.audio){if(!i){this.notify();return}this.ensureAudio()}this.applyTrackSrc(n),this.syncMediaSession(),i&&this.audio.play().catch(()=>{}),this.notify()}getCurrentTrack(){return this.playlist[this.currentIndex]||this.playlist[0]}play(){this.ensureLoaded(),this.audio.play().catch(()=>{})}pause(){this.audio&&this.audio.pause()}togglePlay(){this.ensureLoaded(),this.audio.paused?this.play():this.pause()}next(){const t=(this.currentIndex+1)%this.playlist.length;this.loadTrack(t,!0)}prev(){if(this.audio&&this.audio.currentTime>3){this.audio.currentTime=0;return}const t=(this.currentIndex-1+this.playlist.length)%this.playlist.length;this.loadTrack(t,!0)}seek(t){if(this.duration>0&&this.audio){const i=Math.max(0,Math.min(100,t))/100*this.duration;this.audio.currentTime=i}}setVolume(t){const i=Math.max(0,Math.min(1,t));this.volume=i,this.audio&&(this.audio.volume=i),this.notify()}setSpeed(t){this.playbackRate=t,this.audio&&(this.audio.playbackRate=t),this.notify()}importLocalAudio(t){if(!t)return;const i=URL.createObjectURL(t),n={id:"local-"+Date.now(),title:t.name.replace(/\.[^/.]+$/,""),artist:"本地音频导入",album:`${(t.size/(1024*1024)).toFixed(1)} MB`,coverGradient:"linear-gradient(135deg, #7df8db 0%, #006b5a 100%)",src:i,isLocal:!0,durationText:"本地音频"};this.localUrls.set(n.id,i),this.playlist.unshift(n);const s=this.playlist.filter(a=>a.isLocal);if(s.length>8){const a=new Set(s.slice(8).map(r=>r.id));this.playlist.forEach(r=>{if(a.has(r.id)){try{URL.revokeObjectURL(r.src)}catch{}this.localUrls.delete(r.id)}}),this.playlist=this.playlist.filter(r=>!a.has(r.id))}this.loadTrack(0,!0)}subscribe(t){return this.listeners.add(t),t(this.getState()),()=>this.listeners.delete(t)}getState(){const t=this.duration>0?this.currentTime/this.duration*100:0;return{track:this.getCurrentTrack(),isPlaying:this.isPlaying,currentTime:this.currentTime,duration:this.duration,progress:t,volume:this.volume,playbackRate:this.playbackRate,playlist:[...this.playlist],currentIndex:this.currentIndex}}notify(){const t=this.getState();this.listeners.forEach(i=>{try{i(t)}catch(n){console.error(n)}})}}const rt=new k1,Cr=85,Hl=[8e3,6*36e5],Nl=[4e3,6*36e5],jn=6;function E1(e){const t=[],i=[];for(let a=1;a<e.length;a++){const r=e[a-1],l=e[a];if(!r||!l||l.t<=r.t||r.charging!==l.charging)continue;const d=Math.abs(r.level-l.level);if(d<1)continue;const c=(l.t-r.t)/d;r.charging?i.push(c):t.push(c)}const n=t.slice(-jn),s=i.slice(-jn);return{dischargeMsPerPct:dp(n,Hl),chargeMsPerPct:dp(s,Nl),dischargeSamples:n.length,chargeSamples:s.length}}function dp(e,t){const i=e.filter(a=>a>=t[0]&&a<=t[1]);if(i.length===0)return null;let n=0,s=0;return i.forEach((a,r)=>{const l=1+r/Math.max(1,i.length-1)*1.4;n+=a*l,s+=l}),Math.round(n/s)}const ah="ios-desktop:battery-rates",_1=336*36e5,rh="ios-desktop:battery-sim-level",T1=3;function oh(){try{const e=JSON.parse(localStorage.getItem(ah)||"null");if(!e||typeof e!="object"||!Number.isFinite(e.ts)||Date.now()-e.ts>_1)return null;const t=Number(e.dischargeMsPerPct),i=Number(e.chargeMsPerPct);return{dischargeMsPerPct:Number.isFinite(t)&&t>=Hl[0]&&t<=Hl[1]?t:null,chargeMsPerPct:Number.isFinite(i)&&i>=Nl[0]&&i<=Nl[1]?i:null,dischargeSamples:Math.max(0,Math.min(jn,Number(e.dischargeSamples)||0)),chargeSamples:Math.max(0,Math.min(jn,Number(e.chargeSamples)||0))}}catch{return null}}function M1(){try{localStorage.setItem(ah,JSON.stringify({...ce.rates,ts:Date.now()}))}catch{}}const re={level:Cr,charging:!1,chargingTime:1/0,dischargingTime:1/0,supported:!1},ce={samples:[],rates:{dischargeMsPerPct:null,chargeMsPerPct:null,dischargeSamples:0,chargeSamples:0},seeded:!1},ql=new Set;let pp=!1;const ir={offset:0};function L1(e,t){const i=Date.now()+ir.offset,n=ce.samples[ce.samples.length-1];if(n&&n.level===e&&n.charging===t)return!1;if(ce.samples.push({t:i,level:e,charging:t}),ce.samples.length>jn*2+2&&ce.samples.splice(0,ce.samples.length-(jn*2+2)),ce.rates=E1(ce.samples),ce.seeded){const s=oh();s&&(ce.rates.dischargeMsPerPct===null&&s.dischargeMsPerPct!==null&&(ce.rates.dischargeMsPerPct=s.dischargeMsPerPct,ce.rates.dischargeSamples=s.dischargeSamples),ce.rates.chargeMsPerPct===null&&s.chargeMsPerPct!==null&&(ce.rates.chargeMsPerPct=s.chargeMsPerPct,ce.rates.chargeSamples=s.chargeSamples))}return M1(),!0}function ht(e){const t=Math.min(100,Math.max(0,Math.round(e.level))),i=!!e.charging,n=Number.isFinite(e.chargingTime)?e.chargingTime:1/0,s=Number.isFinite(e.dischargingTime)?e.dischargingTime:1/0,a=t!==re.level||i!==re.charging||n!==re.chargingTime||s!==re.dischargingTime;re.level=t,re.charging=i,re.chargingTime=n,re.dischargingTime=s,typeof e.supported=="boolean"&&(re.supported=e.supported);const r=L1(t,i);(a||r)&&C1()}function C1(){const e={...re,rates:{...ce.rates}};ql.forEach(t=>{try{t(e)}catch{}})}function vs(e){const t=typeof e.level=="number"&&Number.isFinite(e.level)?e.level:Cr/100;ht({level:t*100,charging:e.charging,chargingTime:typeof e.chargingTime=="number"?e.chargingTime:1/0,dischargingTime:typeof e.dischargingTime=="number"?e.dischargingTime:1/0,supported:!0})}const lh=72e3,I1=56e3,N={running:!1,charging:!1,timer:0,nextAt:0,tickScale:1,saverOn:!1};function A1(){try{return document.body.classList.contains("battery-saver-mode")}catch{return!1}}function ch(e,t){let i;return t?i=I1*(e>=96?2.4:e>=90?1.5:1)*up():i=lh*(N.saverOn||A1()?1.4:1)*(e<=5?1.15:1)*up(),Math.max(1e3,Math.round(i*N.tickScale))}function up(){return .88+Math.random()*.24}function P1(){const e=re.level;N.charging?e<100?ht({level:e+1,charging:!0}):ht({level:100,charging:!0}):e>0?ht({level:e-1,charging:!1}):ht({level:0,charging:!1}),pd(),qi()}function qi(){if(!N.running)return;clearTimeout(N.timer);const e=ch(re.level,N.charging);N.nextAt=Date.now()+e,N.timer=setTimeout(B1,e)}function B1(){if(!N.running)return;const e=Date.now()-N.nextAt,t=ch(re.level,N.charging),i=Math.floor(e/t);if(i>=1){const n=Math.min(i,T1);for(let s=0;s<n;s++){const a=re.level;if(N.charging&&a>=100||!N.charging&&a<=0)break;ht({level:N.charging?a+1:a-1,charging:N.charging})}pd()}P1()}function pd(){try{localStorage.setItem(rh,JSON.stringify({level:re.level,ts:Date.now()}))}catch{}}function F1(){try{const e=JSON.parse(localStorage.getItem(rh)||"null");if(!e||!Number.isFinite(e.level))return Cr;let t=Math.min(100,Math.max(0,Math.round(e.level)));const i=Date.now()-(Number.isFinite(e.ts)?e.ts:Date.now());if(i>0&&t>0){const n=Math.min(5,Math.floor(i/lh));t=Math.max(0,t-n)}return t}catch{return Cr}}function fp(){N.running||(N.running=!0,ht({level:F1(),charging:!1,supported:!1}),qi())}function D1(){typeof window>"u"||window.__batterySim||(window.__batterySim={active:()=>N.running,setCharging(e){if(!N.running)return!1;const t=!!e;return N.charging===t||(N.charging=t,ht({level:re.level,charging:t}),qi()),!0},isCharging:()=>N.charging,setTickScale(e){const t=Number(e);return!Number.isFinite(t)||t<=0?!1:(N.tickScale=Math.min(1,t),qi(),!0)},forceSteps(e,t){if(!N.running)return re.level;const i=Math.max(1,Math.min(60,Math.round(e)||1)),n=Number.isFinite(t)&&t>0?t:0;ir.offset=0;for(let s=0;s<i;s++){const a=re.level;if(N.charging){if(a>=100)break;ht({level:a+1,charging:!0})}else{if(a<=0)break;ht({level:a-1,charging:!1})}n&&(ir.offset+=n)}return ir.offset=0,pd(),qi(),re.level}})}function bo(){if(pp)return;pp=!0;const e=oh();e&&(ce.rates={...e},ce.seeded=!0);let t=!1;typeof navigator<"u"&&typeof navigator.getBattery=="function"&&navigator.getBattery().then(i=>{t=!0,vs(i),i.addEventListener("levelchange",()=>vs(i)),i.addEventListener("chargingchange",()=>vs(i)),i.addEventListener("chargingtimechange",()=>vs(i)),i.addEventListener("dischargingtimechange",()=>vs(i))}).catch(()=>{}),typeof navigator>"u"||typeof navigator.getBattery!="function"?fp():setTimeout(()=>{t||fp()},600),D1()}function z1(){return bo(),{...re,rates:{...ce.rates}}}function ud(e){bo(),ql.add(e);try{e({...re,rates:{...ce.rates}})}catch{}return()=>ql.delete(e)}function R1(e){if(!e.charging){const t=e.rates||{};if(Number.isFinite(t.dischargeMsPerPct)&&t.dischargeMsPerPct>0)return Math.round(e.level*t.dischargeMsPerPct/1e3);if(Number.isFinite(e.dischargingTime)&&e.dischargingTime>0)return e.dischargingTime}return Math.round(e.level/100*15*3600)}function O1(e){if(!e.charging)return null;if(e.level>=100)return 0;const t=e.rates||{};return Number.isFinite(t.chargeMsPerPct)&&t.chargeMsPerPct>0?Math.round((100-e.level)*t.chargeMsPerPct/1e3):Number.isFinite(e.chargingTime)&&e.chargingTime>0?e.chargingTime:null}function hp(e){if(!Number.isFinite(e)||e<=0)return"—";const t=e/1e3;return t<60?`约 ${Math.round(t)} 秒`:`约 ${jl(t)}`}function jl(e){if(!Number.isFinite(e)||e<=0)return"—";const t=Math.round(e/60),i=Math.floor(t/60),n=t%60;return i<=0?`${n} 分钟`:n===0?`${i} 小时`:`${i} 小时 ${n} 分钟`}typeof document<"u"&&document.addEventListener("battery-saver-changed",e=>{N.saverOn=!!(e.detail&&e.detail.active),N.running&&qi()});function $1(){return bo(),N.running}function H1(){return N.running&&N.charging}function N1(e){if(bo(),!N.running)return!1;const t=!!e;return N.charging===t||(N.charging=t,ht({level:re.level,charging:t}),qi()),!0}const dh="ios-desktop:battery-saver";function mp(e){return e<=20?"var(--md-error, #f2b8b5)":e<=45?"var(--md-tertiary, #efc76b)":"var(--md-success, #a8f5bb)"}function ph(e){const t=document.getElementById("settingsMainBatteryPct");t&&t.isConnected&&(t.textContent=`${e.level}%`);const i=document.getElementById("settingsBatteryPct");if(!i||!i.isConnected)return;i.textContent=`${e.level}%`,i.style.color=mp(e.level);const n=document.getElementById("settingsBatteryBar");n&&(n.style.width=`${e.level}%`,n.style.background=mp(e.level));const s=document.getElementById("settingsBatteryChargeBadge");s&&(s.style.display=e.charging?"inline-flex":"none");const a=e.rates||{},r=document.getElementById("settingsBatteryEstimate");if(r)if(e.charging)if(e.level>=100)r.textContent="已充满";else{const f=O1(e);r.textContent=f!==null&&Number.isFinite(f)&&f>0?`正在充电 · 预计 ${jl(f)}充满`:"正在充电 · 正在测量充电速度…"}else{const f=Number.isFinite(a.dischargeMsPerPct),m=Number.isFinite(e.dischargingTime)&&e.dischargingTime>0;r.textContent=f||m?`预计可用 ${jl(R1(e))}`:"正在测量耗电速度 · 需观察一格电量变化"}const l=document.getElementById("settingsBatteryDrainRate");l&&(l.textContent=Number.isFinite(a.dischargeMsPerPct)?`每格耗电 ${hp(a.dischargeMsPerPct)} · 已实测 ${a.dischargeSamples} 次`:"测量中 · 需观察一格电量变化");const d=document.getElementById("settingsBatteryChargeRate");d&&(d.textContent=Number.isFinite(a.chargeMsPerPct)?`每格充电 ${hp(a.chargeMsPerPct)} · 已实测 ${a.chargeSamples} 次`:e.charging?"测量中 · 充满前将持续校准":"接入充电器后开始测量");const c=document.getElementById("settingsSimChargerCard");c&&(c.style.display=$1()?"":"none");const p=document.getElementById("settingsSimChargerSwitch");p&&(p.checked=H1());const h=document.getElementById("settingsBatterySource");h&&(h.textContent=e.supported?"数据来源：设备电池（耗/充电速率实测）":"数据来源：模拟电池（含耗/充电速率测量）")}ud(ph);document.addEventListener("app-page-active",e=>{if(e.detail&&e.detail.appId==="settings"&&(e.detail.pageIdx===0||e.detail.pageIdx===2)){ph(z1());const t=document.getElementById("settingsBatterySaverSwitch");t&&(t.checked=typeof localStorage<"u"&&localStorage.getItem(dh)==="1")}});document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!=="settingsBatterySaverSwitch")return;const i=!!t.checked;typeof localStorage<"u"&&localStorage.setItem(dh,i?"1":"0"),document.body.classList.toggle("battery-saver-mode",i),he(()=>Promise.resolve().then(()=>Md),void 0,import.meta.url).then(n=>{n&&typeof n.setBatterySaverActive=="function"&&n.setBatterySaverActive(i,{silent:!0})}).catch(()=>{})});document.addEventListener("battery-saver-changed",e=>{const t=document.getElementById("settingsBatterySaverSwitch");t&&e.detail&&typeof e.detail.active=="boolean"&&(t.checked=e.detail.active)});document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!=="settingsSimChargerSwitch")return;if(!N1(!!t.checked)){t.checked=!1,window.showSystemToast&&window.showSystemToast("真实设备上充电状态跟随电源连接");return}window.showSystemToast&&window.showSystemToast(t.checked?"充电器已接入 · 正在测量充电速度":"充电器已拔出")});const q1=10,j1="12px 6px 6px 12px",V1="6px 12px 12px 6px";function W1(e,t,i=q1){const n=Math.min(e,Math.max(0,e-(t-i))),s=Math.min(e,Math.max(0,t+i));return{fill:"inset(0 "+n.toFixed(1)+"px 0 0 round "+j1+")",line:"inset(0 0 0 "+s.toFixed(1)+"px round "+V1+")"}}const Y1=620,gp=10,G1=[{title:"个性化与主题",items:[{idx:13,icon:"image",label:"壁纸与动态壁纸",sub:"壁纸 · 动态效果",accent:"#7e57c2"},{idx:14,icon:"home",label:"桌面与 Dock",sub:"图标网格 · Dock 栏 · 神奇效果",accent:"#8d6e63"},{idx:9,icon:"person",label:"多模式（工作 / 个人）",sub:"资料切换",hintId:"profileModeHint",accent:"#5c6bc0"},{action:"triggerFontSelect()",icon:"language",label:"界面排版字体",sub:"系统字体",accent:"#26a69a"},{idx:6,icon:"storage",label:"应用管理",sub:"卸载 / 恢复",accent:"#66bb6a"},{idx:1,icon:"bedtime",label:"显示与亮度调节",sub:"亮度 · 深色主题",accent:"#42a5f5"},{idx:10,icon:"auto_awesome",label:"动画与动效曲线",sub:"动效速度 · 曲线",hintId:"animPresetHint",accent:"#ec407a"}]},{title:"系统与设备",items:[{idx:4,icon:"volume",label:"声音与震动反馈",sub:"音量 · 触感",accent:"#ff7043"},{idx:5,icon:"lock",label:"应用权限管理",sub:"相机 · 麦克风等",accent:"#ef5350"},{idx:7,icon:"memory",label:"存储空间占用",sub:"空间占用统计",accent:"#26c6da"},{idx:2,icon:"battery_full",label:"电池与电源优化",sub:"电量 · 省电模式",hintId:"settingsMainBatteryPct",accent:"#ffa726"},{idx:11,icon:"picture_in_picture",label:"后台与多任务",sub:"冻结策略",hintId:"bgModeHint",accent:"#78909c"},{idx:12,icon:"explore",label:"系统导航方式",sub:"手势 · 三键",hintId:"navModeHint",accent:"#29b6f6"},{idx:8,icon:"code",label:"开发者选项",sub:"实验特性",accent:"#9575cd"}]},{title:"数据",items:[{action:"window.__dataBackup&&window.__dataBackup.exportBackup()",icon:"download",label:"导出数据到文件",sub:"备份到本地",accent:"#4db6ac"},{action:"window.__dataBackup&&window.__dataBackup.pickImportFile()",icon:"upload_file",label:"从文件恢复数据",sub:"导入备份",accent:"#ffb74d"}]}];function X1(e){const t=e.hintId?`<span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:12px;margin-right:2px;flex:none;" id="${e.hintId}"></span>`:"",i=e.idx!=null?`__tpNav(this,${e.idx})`:e.action;return`
            <div class="md3-list-item tp-row"${e.idx!=null?` data-tp="${e.idx}"`:""} data-label="${e.label}" onclick="${i}" role="button" tabindex="0">
              <div class="tp-plate" style="--plate:${e.accent}">${v[e.icon]||""}</div>
              <div class="tp-row-text">
                <div class="tp-row-label">${e.label}</div>
                <div class="tp-row-sub">${e.sub||""}</div>
              </div>
              ${t}<span class="tp-chev">›</span>
            </div>`}function U1(){return G1.map(e=>`
          <div class="tp-group" data-tp-group>${e.title}</div>
          <div class="tp-card" data-tp-card>
            ${e.items.map(X1).join('<div class="tp-sep"></div>')}
          </div>`).join("")}const Vn=new Map;let K1=0;function Q1(e){["transform","opacity","filter","borderRadius","boxShadow","zIndex","pointerEvents"].forEach(t=>{e.style[t]=""})}function J1(e){e.style.transform="translate3d(100%, 0, 0)",e.style.opacity="0",e.style.filter="",e.style.borderRadius="0",e.style.boxShadow="",e.style.zIndex="3",e.style.pointerEvents="none"}function Vl(e){if(!e.hosted)return;const{el:t,moved:i,idx:n}=e.hosted;t.classList.remove("tp-hosted"),delete t.dataset.tpHosted,i?(J1(t),e.wrapper&&e.wrapper.isConnected&&e.wrapper.appendChild(t)):t.remove(),e.hosted=null;const s=e.root.querySelector(".tp-right");s&&s.classList.remove("tp-has-page");try{u.appTitle&&(u.appTitle.textContent="设置")}catch{}}function nr(e,t){const i=e.pages;if(!i||!i[t]||!e.wide)return;e.selected=t,e.root.querySelectorAll(".tp-row").forEach(r=>{r.classList.toggle("tp-sel",r.dataset.tp===String(t))});const n=e.root.querySelector(`.tp-row[data-tp="${t}"]`);if(n&&n.scrollIntoView)try{n.scrollIntoView({block:"nearest",behavior:"smooth"})}catch{}e.hosted&&e.hosted.idx!==t&&Vl(e);const s=e.root.querySelector(".tp-right");if(!s)return;const a=document.getElementById(`app-page-settings-${t}`);if(a&&e.wrapper&&a.closest(".app-instance-wrapper")===e.wrapper)e.hosted={idx:t,el:a,moved:!0},a.classList.add("tp-hosted"),a.dataset.tpHosted="1",Q1(a),s.appendChild(a);else{e.hosted&&!e.hosted.moved&&e.hosted.el.remove();const r=document.createElement("div");r.className="app-page tp-hosted tp-host-copy",r.innerHTML=i[t].content;try{jc(r)}catch{}s.appendChild(r),e.hosted={idx:t,el:r,moved:!1}}s.classList.add("tp-has-page"),document.dispatchEvent(new CustomEvent("app-page-active",{detail:{appId:"settings",pageIdx:t}}));try{u.appTitle&&i[t].title&&(u.appTitle.textContent=i[t].title)}catch{}}function Z1(e,t){e.searchQ=t;const i=(t||"").trim().toLowerCase();e.root.querySelectorAll(".tp-group").forEach(n=>{const s=n.nextElementSibling;let a=!1;s&&(s.querySelectorAll(".tp-row").forEach(r=>{const l=!i||(r.dataset.label||"").toLowerCase().includes(i);r.classList.toggle("tp-hit-none",!l),l&&(a=!0)}),s.classList.toggle("tp-hit-none",!a)),n.classList.toggle("tp-hit-none",!a)})}function sr(e){const t=e.pageEl||e.root;if(!t||!t.isConnected)return;if(e.isStackCtx&&!(o.currentApp&&o.currentApp.id==="settings"&&o.navHistory.length<=1)){e.wide&&(e.wide=!1,e.root.classList.remove("tp-wide"),e.pageEl&&e.pageEl.classList.remove("tp-host-page"),Vl(e));return}const i=t.clientWidth>=Y1;if(i===e.wide){i&&!e.selected&&e.pages&&nr(e,gp);return}e.wide=i,e.root.classList.toggle("tp-wide",i),e.pageEl&&e.pageEl.classList.toggle("tp-host-page",i),i?e.selected?nr(e,e.selected):nr(e,gp):Vl(e)}function ey(e){if(!e||e.dataset.tpMounted==="1"){if(e){const a=Vn.get(e.dataset.tpSid);a&&sr(a)}return}e.dataset.tpMounted="1";const t=String(++K1);e.dataset.tpSid=t;const i=e.closest(".app-page"),n={sid:t,root:e,pageEl:i,isStackCtx:!!(i&&i.id==="app-page-settings-0"),wrapper:e.closest(".app-instance-wrapper"),wide:!1,hosted:null,selected:null,searchQ:"",pages:uh,ro:null};Vn.set(t,n);const s=e.querySelector(".tp-search input");s&&(s.addEventListener("input",()=>Z1(n,s.value)),s.addEventListener("focus",()=>{try{e.querySelector(".tp-left").scrollTop=0}catch{}})),window.ResizeObserver&&(n.ro=new ResizeObserver(()=>sr(n)),n.ro.observe(n.pageEl||e)),sr(n)}function ty(){Vn.forEach(e=>{if(!e.root.isConnected){e.ro&&e.ro.disconnect(),Vn.delete(e.sid);return}sr(e)})}function iy(e,t){const i=e&&e.closest?e.closest(".tp-root"):null,n=i&&i.dataset.tpSid?Vn.get(i.dataset.tpSid):null;if(n&&n.wide){nr(n,t);return}const s=e.closest?e.closest(".mini-body"):null;if(s){const a=s.closest(".mini-window"),r=a&&a.dataset.appId;if(r&&typeof window.__miniNav=="function"&&window.__miniNav(r,t))return}typeof window.pushSubPage=="function"&&window.pushSubPage(t)}typeof window<"u"&&(window.__tpNav=iy,window.__settingsTwoPaneMount=ey,window.__settingsTwoPaneReEval=ty);let uh=null;function ny(e){uh=e,Vn.forEach(t=>{t.pages=e})}function sy(e,t,i){const n=e.type?Ye(e.type,!1):J(e.id);return`
    <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:linear-gradient(180deg, var(--md-surface,#121418) 0%, var(--md-surface-container,#1a1c20) 100%);">
      ${t}
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;">
        <div style="width:84px;height:84px;opacity:0.94;">${n}</div>
        <div style="font-size:17px;font-weight:600;color:var(--md-on-surface,#fff);">${e.name}</div>
        <div style="font-size:11px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant,#9a9b9e);background:rgba(255,255,255,0.07);padding:4px 12px;border-radius:999px;">未在运行</div>
      </div>
      ${i}
    </div>
  `}function vp(e){const t=document.getElementById(`app-instance-${e}`);if(t&&t.childElementCount>0)return t;try{if(typeof window<"u"&&window.__splitPaneLiveSource){const i=window.__splitPaneLiveSource(e);if(i&&i.childElementCount>0)return i}}catch{}return null}function fh(e,t,i){if(!e)return"";const s=`
    <div class="recent-preview-status-bar">
      <span>${new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:!1})}</span>
      <div style="display:flex;gap:6px;align-items:center;font-size:11px;">
        <span>5G</span>
        <span>100%</span>
      </div>
    </div>
  `,a=`
    <div class="recent-preview-nav-bar">
      <div class="recent-preview-nav-pill"></div>
    </div>
  `;if(e.pages&&e.pages[0]&&typeof e.pages[0].content=="string"&&e.pages[0].content.includes("<iframe")){const l=e.pages[0].content.match(/src=["']([^"']+)["']/),d=l?l[1]:"";if(d){const c=vp(e.id),p=c?c.querySelector("iframe"):null;if(p)try{const h=p.contentDocument;if(h&&h.documentElement&&h.body&&h.body.childNodes.length>0){let f=h.documentElement.outerHTML;f=f.replace(/<script\b[\s\S]*?<\/script>/gi,"");const y=`<base href="${new URL(d,location.href).href}">`;/<head[^>]*>/i.test(f)?f=f.replace(/<head([^>]*)>/i,`<head$1>${y}`):f=y+f;const g=f.replace(/"/g,"&quot;");return`
              <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);">
                ${s}
                <div style="flex:1;position:relative;overflow:hidden;">
                  <iframe srcdoc="${g}" class="recent-preview-iframe" scrolling="no" tabindex="-1"></iframe>
                </div>
                ${a}
              </div>
            `}}catch{}return sy(e,s,a)}}if(e.pages&&e.pages[0]&&e.pages[0].content){let l=vp(e.id);if(l&&l.querySelector&&l.querySelector(".split-pane-page")&&(l=l.querySelector(".split-pane-page")),l&&l.childElementCount>0)try{let d=l.innerHTML;return d=d.replace(/<script\b[\s\S]*?<\/script>/gi,""),d=d.replace(/\sid="[^"]*"/g,""),d=d.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi,""),`
          <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);overflow:hidden;">
            ${s}
            <div class="recent-preview-native-body" style="flex:1;overflow:hidden;position:relative;">${d}</div>
            ${a}
          </div>
        `}catch{}return`
      <div style="width:100%;height:100%;display:flex;flex-direction:column;position:relative;background:var(--md-surface,#121418);overflow:hidden;">
        ${s}
        <div class="recent-preview-native-body" style="flex:1;overflow:hidden;">
          <div style="font-size:22px;font-weight:700;margin-bottom:12px;color:var(--md-primary);">${e.name}</div>
          ${e.pages[0].content}
        </div>
        ${a}
      </div>
    `}return`
    <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--md-surface,#121418);">
      <div style="width:72px;height:72px;margin-bottom:14px;">${e.type?Ye(e.type,!1):J(e.id)}</div>
      <div style="font-size:18px;font-weight:600;color:var(--md-on-surface,#fff);">${e.name}</div>
    </div>
  `}let ie=["msg","game2048","settings","camera","photo","music","weather"];function fd(){try{return Si().recentsStyle==="classic"}catch{return!1}}function Qt(){try{return Si().recentsStyle==="tablet"}catch{return!1}}function hh(){const e=document.getElementById("recentCardsDeck");e&&(e.classList.toggle("deck-classic",fd()),e.classList.toggle("deck-tablet",Qt()))}function Ir(e){const t=document.getElementById("recentActionsRow");if(!t)return;if(!e||!Qt()||ie.length===0){t.style.position="",t.style.top="",t.style.right="",t.style.left="",t.style.margin="";return}const i=document.getElementById("recentCardsDeck"),n=t.offsetParent||document.getElementById("recentAppsContainer");t.style.position="absolute",t.style.top="0px",t.style.right="0px",t.style.left="auto",t.style.margin="0";const s=n?n.getBoundingClientRect():{top:0,right:e.winW},a=i?i.getBoundingClientRect():null,r=(a?a.top:0)+e.deckH/2+e.totalH/2,l=Math.max(20,Math.round(e.winW*.025));t.style.top=`${Math.round(r-s.top+14)}px`,t.style.right=`${Math.round(s.right-(e.winW-l))}px`}typeof window<"u"&&window.addEventListener("desktop-prefs-changed",e=>{!e||!e.detail||e.detail.key!=="recentsStyle"||(hh(),document.getElementById("recentAppsOverlay")?.classList.contains("active")?(vi(Z),Ir(ji())):Ir(null))});let Di=null;function Ar(){return typeof window<"u"&&window.__splitInfo?window.__splitInfo():{active:!1}}function mh(){he(()=>import("./split-screen-HA_hNujw.js"),[],import.meta.url).then(e=>{try{e.exitSplit({instant:!0})}catch{}}).catch(()=>{})}function ay(){he(()=>import("./split-screen-HA_hNujw.js"),[],import.meta.url).then(e=>{try{e.combineExit({silent:!0})}catch{}}).catch(()=>{})}function ry(e,t){window.showSystemToast&&window.showSystemToast(e,t)}function So(e){navigator.vibrate&&navigator.vibrate(e)}let Z=0,wn=0,Aa=!1,on=!1,Pa=-1,$=null,Jo=0,Zo=0,el=0,tl=0,il=0,Ba=0,nl=0,yp=0,ys=0,Tt=null,Pr=0;function ji(){const e=window.innerWidth||390,t=window.innerHeight||844,i=e>=768;let n,s;e>=t?(n=M(Math.round(e*.42),220,i?560:360),s=M(Math.round(n*(t/e)),150,i?480:320)):(s=M(Math.round(t*.44),250,470),n=M(Math.round(s*(e/t)),150,340));const a=fd()||Qt(),r=s+44,l=Qt()?Math.round(t*.86):r+26;return{winW:e,winH:t,previewW:n,previewH:s,baseW:e,baseH:t,scale:n/e,stepPx:a?n+16:Math.round(n*.86),totalH:r,deckH:l}}const zi={close:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',screenshot:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',share:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',clearAll:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',splitScreen:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',emptyDeck:`<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
    <rect x="25" y="15" width="70" height="90" rx="16" fill="var(--md-primary-container, #006B5A)" opacity="0.3" transform="rotate(-10 60 60)"/>
    <rect x="25" y="15" width="70" height="90" rx="16" fill="var(--md-secondary-container, #3F4C47)" opacity="0.5" transform="rotate(10 60 60)"/>
    <rect x="28" y="15" width="64" height="90" rx="16" fill="var(--md-surface-container-high, #1F2937)" stroke="var(--md-primary, #7DF8DB)" stroke-width="2.5"/>
    <circle cx="60" cy="45" r="14" fill="var(--md-primary, #7DF8DB)"/>
    <rect x="42" y="68" width="36" height="6" rx="3" fill="var(--md-on-surface, #fff)" opacity="0.8"/>
    <rect x="48" y="78" width="24" height="4" rx="2" fill="var(--md-on-surface-variant, #94a3b8)" opacity="0.6"/>
  </svg>`};function gh(){oy(),window.__closeRecentApps=Ne,window.__openRecentApps=Ft}function vh(e){if(e){typeof window<"u"&&(window.__lastRecordedApp=e),ie=ie.filter(t=>t!==e),ie.unshift(e),ie.length>10&&ie.pop();try{window.dispatchEvent(new CustomEvent("dock-refresh-requested",{detail:{appId:e}}))}catch{}}}function hd(){return ie}function oy(){let e=document.getElementById("recentAppsOverlay");e||(e=document.createElement("div"),e.id="recentAppsOverlay",e.className="recent-apps-overlay",e.innerHTML=`
    <div class="recent-apps-container" id="recentAppsContainer">
      <div class="recent-cards-deck" id="recentCardsDeck"></div>
      <div class="recent-actions-row" id="recentActionsRow">
        <button class="recent-action-pill" id="recentScreenshotBtn">
          ${zi.screenshot}
          <span>截屏</span>
        </button>
        <button class="recent-action-pill" id="recentSplitBtn">
          ${zi.splitScreen}
          <span>分屏</span>
        </button>
        <button class="recent-action-pill" id="recentShareBtn">
          ${zi.share}
          <span>分享</span>
        </button>
        <button class="recent-clear-all-btn" id="recentClearAllBtn">
          ${zi.clearAll}
          <span>全部清除</span>
        </button>
      </div>
    </div>
  `,document.body.appendChild(e),e.addEventListener("click",t=>{(t.target===e||t.target===document.getElementById("recentAppsContainer"))&&Ne()}),document.getElementById("recentClearAllBtn").addEventListener("click",t=>{t.stopPropagation(),ly()}),document.getElementById("recentScreenshotBtn").addEventListener("click",t=>{t.stopPropagation(),window.showSystemToast&&window.showSystemToast("已截取当前后台任务屏幕",v.photo_camera)}),document.getElementById("recentSplitBtn").addEventListener("click",t=>{t.stopPropagation();const i=document.getElementById("recentAppsOverlay");if(i.classList.contains("split-picking")){i.classList.remove("split-picking"),he(()=>import("./split-screen-HA_hNujw.js"),[],import.meta.url).then(s=>s.cancelPickMode()).catch(()=>{}),window.showSystemToast&&window.showSystemToast("已取消分屏配对",v.picture_in_picture);return}if(ie.length<2){window.showSystemToast&&window.showSystemToast("分屏需要至少两个后台应用",v.picture_in_picture);return}const n=ie[M(Math.round(Z),0,ie.length-1)];if(!n){window.showSystemToast&&window.showSystemToast("请先选择一个分屏应用",v.picture_in_picture);return}i.classList.add("split-picking"),he(()=>import("./split-screen-HA_hNujw.js"),[],import.meta.url).then(s=>s.enterPickMode(n)).catch(()=>{}),navigator.vibrate&&navigator.vibrate(15),window.showSystemToast&&window.showSystemToast("已选定第一个应用，点选另一张卡片组成分屏",v.picture_in_picture)}),document.getElementById("recentShareBtn").addEventListener("click",t=>{t.stopPropagation(),window.showSystemToast&&window.showSystemToast("正在调起 Pixel 快速分享...",v.link)}),hy())}function ly(){const e=Array.from(document.querySelectorAll(".recent-app-card"));if(e.length===0){Ne();return}So([15,30,15]);const t=Math.round(Z);e.forEach((n,s)=>{const r=Math.abs(s-t)*45;fe(r,()=>{n.classList.add("card-dismissing"),n.style.transform=`translate3d(0, -140%, 0) scale(0.65) rotateZ(${s%2===0?-6:6}deg)`,n.style.opacity="0"})});const i=e.length*45+260;fe(i,()=>{Ar().active&&mh();try{window.__splitDestroyParked&&window.__splitDestroyParked()}catch{}Di=null,ie=[],mf(),ko(),fe(180,()=>{Ne();try{ta()}catch{}ry("已清除所有后台任务",v.clear_all)})})}function ko(){const e=document.getElementById("recentCardsDeck"),t=document.getElementById("recentActionsRow");if(!e)return;if(ie.length===0){e.innerHTML=`
      <div class="recent-empty-state">
        <div class="recent-empty-illustration">${zi.emptyDeck}</div>
        <div style="font-size:16px;font-weight:600;letter-spacing:0.2px;">暂无运行中的后台任务</div>
        <!-- v7.47：副标题 opacity 0.65 在深色壁纸/暗化遮罩上几乎不可读（issue #6 img4）
             → 提到 0.82 并显式指定 on-surface 色 -->
        <div style="font-size:13px;opacity:0.82;color:var(--md-on-surface,#fff);margin-top:6px;">打开的应用将在此处以等比微缩视口呈现</div>
      </div>
    `,t&&(t.style.display="none",Ir(null));return}t&&(t.style.display="flex");const i=ji();e.style.height=`${i.deckH}px`,Ir(i);const n=e.querySelector(".recent-empty-state");n&&n.remove();const s=cy(),a=new Map;Array.from(e.querySelectorAll(".recent-app-card")).forEach(l=>a.set(l.dataset.appId,l));const r=new Set;s.forEach(l=>{const d=typeof l=="string"?l:l.key,c=a.get(d);c&&c.dataset.pw===String(i.previewW)&&c.dataset.ph===String(i.previewH)&&r.add(d)}),a.forEach((l,d)=>{s.some(c=>(typeof c=="string"?c:c.key)===d)||l.remove()}),s.forEach((l,d)=>{const c=typeof l=="string"?l:l.key;if(r.has(c)){a.get(c).dataset.idx=String(d);return}a.get(c)?.remove();const p=typeof l=="string"?dy(l,d,i):py(l,d,i);e.appendChild(p)});{const l=new Map;e.querySelectorAll(".recent-app-card").forEach(c=>l.set(c.dataset.appId,c));let d=null;s.forEach(c=>{const p=typeof c=="string"?c:c.key,h=l.get(p);if(!h)return;const f=d?d.nextElementSibling:e.firstElementChild;h!==f&&e.insertBefore(h,d?d.nextSibling:e.firstChild),d=h})}e.querySelectorAll(".recent-app-card").forEach(l=>{if(l.dataset.closeBound==="1")return;l.dataset.closeBound="1";const d=l.querySelector(".recent-card-close");d&&d.addEventListener("click",c=>{if(c.stopPropagation(),l.dataset.splitApps){const[p,h]=l.dataset.splitApps.split("|");Sh(p,h)}else my(l.dataset.appId)})}),vi(Z)}function cy(){const e=typeof window<"u"&&window.__splitInfo?window.__splitInfo():{active:!1};let t=[];try{const r=JSON.parse(localStorage.getItem("ios-desktop:split-groups")||"[]");Array.isArray(r)&&(t=r)}catch{}if(e.active){const r=[e.appAId,e.appBId].sort().join("|"),l=t.findIndex(c=>c.id===r),d={id:r,aId:e.appAId,bId:e.appBId,axis:e.axis||"y",ratio:e.ratio||.5,ts:Date.now()};l!==-1?t[l]=d:t.unshift(d)}const i=new Map;t.forEach(r=>{r.aId&&r.bId&&r.aId!==r.bId&&(i.set(r.aId,r),i.set(r.bId,r))});const n=[],s=new Set,a=new Set;if(e.active){const r=`split:${e.appAId}|${e.appBId}`,l=[e.appAId,e.appBId].sort().join("|");s.add(l),a.add(e.appAId),a.add(e.appBId),n.push({key:r,aId:e.appAId,bId:e.appBId,axis:e.axis||"y",ratio:e.ratio||.5})}return ie.forEach(r=>{if(a.has(r))return;const l=i.get(r);l?s.has(l.id)||(s.add(l.id),a.add(l.aId),a.add(l.bId),n.push({key:`split:${l.aId}|${l.bId}`,aId:l.aId,bId:l.bId,axis:l.axis||"y",ratio:l.ratio||.5})):(a.add(r),n.push(r))}),t.forEach(r=>{s.has(r.id)||(s.add(r.id),n.push({key:`split:${r.aId}|${r.bId}`,aId:r.aId,bId:r.bId,axis:r.axis||"y",ratio:r.ratio||.5}))}),n}function dy(e,t,i){const n=F.find(l=>l.id===e)||{id:e,name:e},s=n.type?Ye(n.type,!1):J(n.id||e),a=fh(n),r=document.createElement("div");return r.className="recent-app-card",r.dataset.appId=e,r.dataset.idx=String(t),r.dataset.pw=String(i.previewW),r.dataset.ph=String(i.previewH),r.style.width=`${i.previewW}px`,r.style.height=`${i.totalH}px`,r.style.marginLeft=`${-i.previewW/2}px`,r.innerHTML=`
    <div class="recent-card-header">
      <div class="recent-card-icon">${s}</div>
      <span class="recent-card-title">${n.name}</span>
      <button class="recent-card-close" data-app-id="${e}" title="关闭任务">
        ${zi.close}
      </button>
    </div>
    <div class="recent-card-preview">
      <div class="recent-viewport-scaler" style="width:${i.baseW}px;height:${i.baseH}px;transform:translate(-50%,-50%) scale(${i.scale.toFixed(4)});">
        ${a}
      </div>
    </div>
  `,r}function py(e,t,i){const n=F.find(_=>_.id===e.aId)||{id:e.aId,name:e.aId},s=F.find(_=>_.id===e.bId)||{id:e.bId,name:e.bId},a=n.type?Ye(n.type,!1):J(n.id),r=s.type?Ye(s.type,!1):J(s.id),l=6,d=e.axis==="x",c=d?(i.previewW-l)/2:i.previewW,p=d?i.previewH:(i.previewH-l)/2,h=d?p/i.baseH:c/i.baseW,f=i.baseW*h,m=i.baseH*h,y=d?0:(c-f)/2,g=d?(p-m)/2:0,w=d?c-f:(c-f)/2,k=d?(p-m)/2:p-m,S=(_,A,I)=>`
    <div style="flex:1;position:relative;overflow:hidden;background:var(--md-surface,#121418);min-width:0;min-height:0;">
      <div class="recent-viewport-scaler" style="left:${A.toFixed(2)}px;top:${I.toFixed(2)}px;transform-origin:0 0;transform:scale(${h.toFixed(4)});width:${i.baseW}px;height:${i.baseH}px;">
        ${fh(_)}
      </div>
    </div>`,b=document.createElement("div");return b.className="recent-app-card recent-split-card",b.dataset.appId=e.key,b.dataset.splitApps=`${e.aId}|${e.bId}`,b.dataset.idx=String(t),b.dataset.pw=String(i.previewW),b.dataset.ph=String(i.previewH),b.style.width=`${i.previewW}px`,b.style.height=`${i.totalH}px`,b.style.marginLeft=`${-i.previewW/2}px`,b.innerHTML=`
    <div class="recent-card-header">
      <div class="recent-card-icon" style="display:flex;align-items:center;">${a}</div>
      <div class="recent-card-icon" style="margin-left:-8px;box-shadow:0 0 0 2px var(--md-surface-container,rgba(24,30,36,0.98));">${r}</div>
      <span class="recent-card-title">${n.name} + ${s.name}</span>
      <button class="recent-card-close" title="关闭分屏组">
        ${zi.close}
      </button>
    </div>
    <div class="recent-card-preview" style="display:flex;flex-direction:${d?"row":"column"};align-items:stretch;gap:${l}px;">
      ${S(n,y,g)}
      ${S(s,w,k)}
    </div>
  `,b}const Ts=new WeakMap;function yh(e,t,i,n){const s=e-t,a=Math.abs(s);if(Qt()){const c=n.winW,p=Math.max(20,Math.round(c*.025)),h=n.previewW,f=n.totalH,y=(n.deckH||n.totalH+26)/2,g=c-p-h/2;if(e===0){const Ae=y-(10+f/2);return{tx:g-c/2,ty:Ae,tz:0,scale:1,rotY:0,zIndex:100,opacity:"1",pe:!0,shadowTier:"focus",transform:`translate3d(${(g-c/2).toFixed(1)}px, ${Ae.toFixed(1)}px, 0px) scale(1)`}}const w=g-h/2-Math.max(16,Math.round(p*.6)),k=Math.max(120,w-p),S=Math.max(0,i-1),b=14;let _=(f-b)/(2*f);const A=Math.max(1,Math.ceil(S/2)),I=(k-(A-1)*b)/(A*h);I<_&&(_=Math.max(.2,I));const q=h*_,D=f*_,T=e-1,G=T%2===0?0:1,X=Math.floor(T/2),ne=G===0?y-(D+b)/2:y+(D+b)/2,Te=w-X*(q+b)-q/2-c/2,Me=ne-(10+n.totalH/2);return{tx:Te,ty:Me,tz:0,scale:_,rotY:0,zIndex:90-T,opacity:"1",pe:!0,shadowTier:"near",transform:`translate3d(${Te.toFixed(1)}px, ${Me.toFixed(1)}px, 0px) scale(${_.toFixed(3)})`}}if(fd()){const c=s*n.stepPx;return{tx:c,ty:0,tz:0,scale:1,rotY:0,zIndex:Math.round(100-a*12),opacity:"1",pe:a<1.2,shadowTier:a<.35?"focus":a<1.2?"near":"far",transform:`translate3d(${c.toFixed(1)}px, 0px, 0px) scale(1)`}}const r=s*n.stepPx,l=Math.max(.74,1-.11*a),d=M(-s*12,-28,28);return{tx:r,ty:0,tz:-a*40,scale:l,rotY:d,zIndex:Math.round(100-a*12),opacity:M(1-.2*a,.38,1).toFixed(2),pe:a<1.2,shadowTier:a<.35?"focus":a<1.2?"near":"far",transform:`translate3d(${r.toFixed(1)}px, 0px, ${(-a*40).toFixed(1)}px) scale(${l.toFixed(3)}) rotateY(${d.toFixed(1)}deg)`}}function vi(e,t=null,i=null){const n=document.querySelectorAll(".recent-app-card");if(!n.length)return;const s=i&&i.paintMode||"full",a=ji(),r=n.length;n.forEach((l,d)=>{let c=Ts.get(l);if(c||(c={dismissing:!1},Ts.set(l,c)),l.classList.contains("card-dismissing")){if(l!==t){c.dismissing=!0;return}c={dismissing:!1},Ts.set(l,c)}else c.dismissing&&(c={dismissing:!1},Ts.set(l,c));const p=yh(d,e,r,a);c.transform!==p.transform&&(l.style.transform=p.transform,c.transform=p.transform),c.zIndex!==p.zIndex&&(l.style.zIndex=p.zIndex,c.zIndex=p.zIndex),c.opacity!==p.opacity&&(l.style.opacity=p.opacity,c.opacity=p.opacity),c.blur!==0&&(l.style.filter="none",c.blur=0),s==="full"&&c.shadowTier!==p.shadowTier&&(l.style.boxShadow=p.shadowTier==="focus"?"0 24px 60px rgba(0, 0, 0, 0.65), 0 0 0 1.5px var(--md-primary, #7DF8DB)":`0 ${p.shadowTier==="near"?18:14}px ${p.shadowTier==="near"?48:36}px rgba(0, 0, 0, ${p.shadowTier==="near"?"0.42":"0.22"})`,c.shadowTier=p.shadowTier),c.pe!==p.pe&&(l.style.pointerEvents=p.pe?"auto":"none",c.pe=p.pe)})}function uy(){const e=document.querySelectorAll(".recent-app-card");let t=!1;e.forEach(i=>{i.classList.contains("card-dismissing")||(i.style.transition="",i.style.opacity="",Ts.delete(i),t=!0)}),t&&vi(Z)}let xn=0,wp=0,xp=!1;function fy(e,t=!1){wp=e,xp=t,!xn&&(xn=requestAnimationFrame(()=>{xn=0,vi(wp,null,{paintMode:xp?"compositor":"full"})}))}function hy(){const e=document.getElementById("recentCardsDeck");if(!e)return;e.addEventListener("pointerdown",i=>{if(ie.length===0||i.target.closest(".recent-card-close"))return;if(Tt&&(Tt.cancel(),Tt=null),$=(i.target.closest?i.target.closest(".recent-app-card"):null)||typeof document.elementsFromPoint=="function"&&document.elementsFromPoint(i.clientX,i.clientY).find(s=>s.classList&&s.classList.contains("recent-app-card"))||null,$){const s=parseInt($.dataset.idx,10);Pa=Number.isFinite(s)?s:-1}else Pa=-1;Aa=!0,on=!1,Jo=i.clientX,Zo=i.clientY,el=i.clientX,tl=i.clientY,il=performance.now(),Ba=0,nl=0,yp=Z,ys=0;try{e.setPointerCapture(i.pointerId)}catch{}}),e.addEventListener("pointermove",i=>{if(!Aa)return;const n=performance.now(),s=Math.max(1,n-il);Ba=(i.clientX-el)/s,nl=(i.clientY-tl)/s,el=i.clientX,tl=i.clientY,il=n,Pr=Ba*1e3;const a=i.clientX-Jo,r=i.clientY-Zo;if(!on&&$&&r<-12&&Math.abs(r)>Math.abs(a)*1.2&&(on=!0),on&&$){ys=Math.min(0,r);const p=ji(),h=yh(Pa,Z,ie.length,p),f=h.rotY?` rotateY(${h.rotY.toFixed(1)}deg)`:"",m=Math.min(1,Math.abs(ys)/300),y=Math.max(0,1-m*.8);$.style.transform=`translate3d(${h.tx.toFixed(1)}px, ${(h.ty+ys).toFixed(1)}px, ${h.tz.toFixed(1)}px) scale(${h.scale.toFixed(3)})${f}`,$.style.opacity=y.toFixed(2);return}const l=Qt()?0:Math.max(0,ie.length-1),d=Math.max(ji().stepPx,1),c=yp-a/d;c<0?Z=c*.35:c>l?Z=l+(c-l)*.35:Z=c,fy(Z,!0)});const t=i=>{if(!Aa)return;Aa=!1;const n=i.clientX-Jo,s=i.clientY-Zo;if(on&&$)if(on=!1,(ys<-75||nl<-.32)&&Pa!==-1){if(So(20),$.classList.contains("recent-split-card")&&$.dataset.splitApps){const[d,c]=$.dataset.splitApps.split("|");Sh(d,c)}else{const d=$.dataset.appId;md($,()=>{Rn(d),bh(d)})}return}else{$.classList.add("card-dismissing"),vi(Z,$),fe(250,()=>{$&&$.classList.remove("card-dismissing")});return}if(Math.abs(n)<8&&Math.abs(s)<8&&$){if($.classList.contains("recent-split-card")){const p=parseInt($.dataset.idx,10),h=Number.isFinite(p)?p:Math.round(Z),f=Math.round(Z);if(h===f||Qt()){navigator.vibrate&&navigator.vibrate(12);const m=$.getBoundingClientRect(),y=$.dataset.splitApps,[g,w]=y?y.split("|"):[],k=typeof window<"u"&&window.__splitInfo?window.__splitInfo():{active:!1};$.style.opacity="0",document.querySelectorAll(`.recent-app-card:not([data-app-id="${$.dataset.appId}"])`).forEach(b=>{b.style.transition=`opacity ${Q(220)}ms ${ee("emphasized")}, transform ${Q(220)}ms ${ee("emphasized")}`,b.style.opacity="0",b.style.transform+=" scale(0.92)"}),k.active&&(k.appAId===g&&k.appBId===w||k.appAId===w&&k.appBId===g)?Ne():he(()=>import("./split-screen-HA_hNujw.js"),[],import.meta.url).then(b=>{let _=.5;try{const I=JSON.parse(localStorage.getItem("ios-desktop:split-groups")||"[]").find(q=>q.aId===g&&q.bId===w||q.aId===w&&q.bId===g);I&&typeof I.ratio=="number"&&(_=I.ratio)}catch{}b.enterSplit({appAId:g,appBId:w,rectA:m,rectB:m,ratio:_,replaceActive:!0}),fe(280,()=>{Ne(),$.style.opacity="1"})}).catch(()=>{Ne(),$.style.opacity="1"})}else wn=h,$s();return}const l=parseInt($.dataset.idx,10),d=Math.round(Z),c=document.getElementById("recentAppsOverlay");if(c&&c.classList.contains("split-picking")){const p=$.dataset.appId;he(()=>import("./split-screen-HA_hNujw.js"),[],import.meta.url).then(h=>{const f=h.handleCardPick(p,$);if(c.classList.remove("split-picking"),f){const m=document.querySelector(`.recent-app-card[data-app-id="${f.appAId}"]`);m&&(m.style.opacity="0"),$&&($.style.opacity="0"),Ne(),h.enterSplit(f)}else Ne()}).catch(()=>{});return}if(l===d||Qt()){const p=$.dataset.appId;wh(p,$);return}else{wn=l,$s();return}}const a=Math.max(ji().stepPx,1),r=Z-Ba*.0018*a;wn=Math.round(M(r,0,Math.max(0,ie.length-1))),$s()};e.addEventListener("pointerup",t),e.addEventListener("pointercancel",t)}function $s(e=null){Tt&&Tt.cancel();const t=Z,i=wn,n=M(Pr/Math.max(ji().stepPx,1),-8,8);Pr=0,Tt=Ja({from:t,to:i,velocity:n,params:Kn(ot(.3,.92,1)),onUpdate:s=>{Z=s,vi(s,null,{paintMode:"compositor"})},onComplete:()=>{Z=i,vi(i),Tt=null,e&&e()}})}function wh(e,t){const i=F.findIndex(p=>p.id===e);if(i===-1)return;Di=null,Ar().active&&ay();const n=t.querySelector(".recent-card-preview"),s=n?n.getBoundingClientRect():t.getBoundingClientRect();t.style.opacity="0",document.querySelectorAll(`.recent-app-card:not([data-app-id="${e}"])`).forEach(p=>{p.style.transition=`opacity ${Q(240)}ms ${ee("emphasized")}, transform ${Q(240)}ms ${ee("emphasized")}`,p.style.opacity="0",p.style.transform+=" scale(0.92)"});const r=document.getElementById("recentActionsRow");r&&(r.style.transition=`opacity ${Q(180)}ms ${ee("emphasized")}, transform ${Q(180)}ms ${ee("emphasized")}`,r.style.opacity="0",r.style.transform="translateY(16px)"),navigator.vibrate&&navigator.vibrate(15),j(i,null,s,{skipCloseRecents:!0,skipSplitRestore:!0});const l=document.getElementById("stage");l&&(l.style.zIndex="760");const d=document.getElementById("appWindow");d&&(d.style.zIndex="760");const c=document.getElementById("windowShadowLayer");c&&(c.style.zIndex="759"),fe(260,()=>{Ne(),t.style.opacity="1",r&&(r.style.transition="",r.style.opacity="",r.style.transform=""),fe(520,()=>{const p=document.getElementById("stage");p&&(p.style.zIndex="")})})}function md(e,t,i=220){e&&(e.classList.add("card-dismissing"),e.style.transform="translate3d(0, -135%, 0) scale(0.68)",e.style.opacity="0"),fe(i,t)}function xh(){if(ie.length===0){ko();return}document.getElementById("recentCardsDeck")?.querySelectorAll(".recent-app-card").forEach((t,i)=>{t.dataset.idx=String(i)}),Z=Qt()?0:M(Z,0,Math.max(0,ie.length-1)),wn=Math.round(Z),vi(Z),$s()}function bh(e){ie=ie.filter(n=>n!==e);const t=document.getElementById("recentCardsDeck");if(!t)return;const i=t.querySelector(`.recent-app-card[data-app-id="${e}"]`);i&&i.remove(),xh()}function my(e){const t=document.querySelector(`.recent-app-card[data-app-id="${e}"]`);So(20),md(t,()=>{Rn(e),bh(e)})}function Sh(e,t){const i=`split:${e}|${t}`,n=document.querySelector(`.recent-app-card[data-app-id="${i}"]`);So(20),md(n,()=>{mh();try{window.__splitDestroyParked&&window.__splitDestroyParked()}catch{}Rn(e),Rn(t),he(()=>Promise.resolve().then(()=>rx),void 0,import.meta.url).then(s=>{const a=[e,t].sort().join("|");s.removeSplitGroup(a)}).catch(()=>{}),ie=ie.filter(s=>s!==e&&s!==t),n&&n.parentNode&&n.remove(),xh()})}function Ft(e=null,t=null){const i=document.getElementById("recentAppsOverlay");if(!i)return;const n=Ar().active,s=e||(o.isOpen&&o.currentApp?o.currentApp.id:null),a=document.getElementById("appWindow"),r=!!(a&&a.classList.contains("open")),l=r&&o.isOpen&&!n&&!!s;if(s&&vh(s),Z=0,wn=0,ko(),hh(),uy(),i.classList.add("active"),Ar().active&&window.__splitSuspend){const g=document.querySelector(".recent-app-card.recent-split-card");g&&(g.style.opacity="0"),window.__splitSuspend(g?g.getBoundingClientRect():null,()=>{g&&(g.style.opacity="1")})}let d=null,c=null;const p=l?document.querySelector(`.recent-app-card[data-app-id="${s}"]`):null;if(p){const g=p.querySelector(".recent-card-preview"),w=g?g.getBoundingClientRect():p.getBoundingClientRect();w.width>80&&w.height>80&&(d=w),c=p.querySelector(".recent-card-header")}let h=[];const f=()=>{h.forEach(g=>{const w=parseInt(g.dataset.idx,10)||0,k=Math.min(w*45,180);g.style.transition=`transform ${Q(380)}ms ${ee("emphasized")} ${Q(k)}ms, opacity ${Q(300)}ms ${ee("emphasized")} ${Q(k)}ms`,g.style.opacity="1",g.style.transform=g.dataset.restingTransform||"",fe(420+k,()=>{g.style.transition="",delete g.dataset.restingTransform})}),y&&fe(140,()=>{y.style.transition=`opacity ${Q(240)}ms ${ee("emphasized")}, transform ${Q(240)}ms ${ee("emphasized")}`,y.style.opacity="1",y.style.transform="translateY(0)",fe(260,()=>{y.style.transition=""})})};l?(h=Array.from(document.querySelectorAll(".recent-app-card")).filter(g=>g!==p),h.forEach(g=>{g.dataset.restingTransform=g.style.transform||"",g.style.transition="none",g.style.opacity="0",g.style.transform=(g.dataset.restingTransform||"")+" translate3d(0, 44px, -140px) scale(0.82)"}),p&&(p.style.opacity="0"),c&&(c.style.transition="none",c.style.opacity="0"),d?(Di=s||null,Uf(d,()=>{p&&(p.style.opacity="1"),c&&fe(40,()=>{c.style.transition=`opacity ${Q(160)}ms ${ee("emphasized")}`,c.style.opacity="1",fe(200,()=>{c.style.transition="",c.style.opacity=""})})},{velocity:t,onApproach:f})):Bt(0,0,-.55)):r&&o.isOpen&&Bt(0,-420,-.9);const m=document.getElementById("recentCardsDeck");m&&!l&&(m.style.opacity="0",m.style.transform="translate3d(0, 30px, -120px) scale(0.92)",requestAnimationFrame(()=>{m.style.transition=`transform ${Q(320)}ms ${ee("gentle")}, opacity ${Q(250)}ms ${ee("emphasized")}`,m.style.opacity="1",m.style.transform="translate3d(0, 0, 0) scale(1)",fe(340,()=>{m.style.transition="",m.style.transform="",m.style.opacity=""})}));const y=document.getElementById("recentActionsRow");y&&!l&&(y.style.opacity="0",y.style.transform="translateY(16px)",fe(180,()=>{y.style.transition=`opacity ${Q(240)}ms ${ee("emphasized")}, transform ${Q(240)}ms ${ee("emphasized")}`,y.style.opacity="1",y.style.transform="translateY(0)",fe(260,()=>{y.style.transition=""})})),$s(),navigator.vibrate&&navigator.vibrate([15,35])}function Ne(e=null){const t=document.getElementById("recentAppsOverlay");if(t&&(t.classList.remove("active"),t.classList.contains("split-picking")&&(t.classList.remove("split-picking"),he(()=>import("./split-screen-HA_hNujw.js"),[],import.meta.url).then(i=>i.cancelPickMode()).catch(()=>{}))),window.__splitResume){const i=document.querySelector(".recent-app-card.recent-split-card");window.__splitResume(i?i.getBoundingClientRect():null)}xn&&(cancelAnimationFrame(xn),xn=0),Tt&&(Tt.cancel(),Tt=null),Pr=0,gy(e)}function gy(e){const t=!(e&&e.resumeSuspended===!1),i=document.getElementById("appWindow"),n=!!(i&&i.classList.contains("open")&&i.getBoundingClientRect().height>=window.innerHeight*.98);if(!!Di&&!!o.isOpen&&!o.isClosing&&!n){const a=Di;if(Di=null,t){const r=document.querySelector(`.recent-app-card[data-app-id="${a}"]`);if(r&&!r.classList.contains("card-dismissing")&&F.findIndex(l=>l.id===a)!==-1){wh(a,r);return}}try{ta()}catch{}return}if(Di=null,!o.isOpen&&!o.isClosing){const a=document.getElementById("desktop");if(a&&(a.style.transform&&a.style.transform!==""||a.style.filter&&a.style.filter!=="")||document.querySelector(".launch-hidden"))try{ta()}catch{}}}const Wl=Object.freeze(Object.defineProperty({__proto__:null,closeRecentApps:Ne,getRecentAppsList:hd,initRecentApps:gh,openRecentApps:Ft,recordAppOpened:vh,renderRecentCards:ko},Symbol.toStringTag,{value:"Module"})),kh="ios-desktop:dock-items",vy=480,yy=["phone","camera","msg","safari"];let Ze=wy(),z=null,$e=null,Yl=!1;function wy(){try{const e=localStorage.getItem(kh);if(e){const t=JSON.parse(e);if(Array.isArray(t)){const i=t.filter(n=>typeof n=="string"&&n).slice(0,Qi);return Array.from(new Set(i))}}}catch{}return yy.slice()}function gd(){try{localStorage.setItem(kh,JSON.stringify(Ze))}catch{}}function Gl(){return Ze.slice()}function Eh(e){return!e||typeof e!="string"||Ze.indexOf(e)!==-1||Ze.length>=Qi?!1:(Ze.push(e),gd(),bn(),!0)}function Eo(e){const t=Ze.indexOf(e);return t===-1?!1:(Ze.splice(t,1),gd(),bn(),!0)}const xy=2.75,_h=2.25;function by(e,t,i=null){const n=((i&&i.range)!=null?i.range:xy)*t,s=(i&&i.maxScale)!=null?i.maxScale:_h;if(!(s>1)||!(e>=0)||e>=n)return 1;const a=Math.cos(e/n*Math.PI);return 1+(s-1)*((1+a)/2)}function Sy(e,t,i){const n=e.length;if(!n)return{dx:[],delta:0,span:0,hovered:-1};const s=f=>i&&i[f]!=null?i[f]:10;let a=0;for(let f=1;f<n;f++)e[f]>e[a]&&(a=f);const r=e.map(f=>t*f),l=new Array(n);l[0]=t/2;for(let f=1;f<n;f++)l[f]=l[f-1]+t+s(f-1);const d=new Array(n);d[a]=l[a];for(let f=a+1;f<n;f++)d[f]=d[f-1]+r[f-1]/2+s(f-1)+r[f]/2;for(let f=a-1;f>=0;f--)d[f]=d[f+1]-r[f+1]/2-s(f)-r[f]/2;const c=d.map((f,m)=>f-l[m]),p=d[0]-r[0]/2,h=d[n-1]+r[n-1]/2-p;return{dx:c,delta:p,span:h,hovered:a}}function fn(e){for(let t=0;t<F.length;t++)if(F[t]&&F[t].id===e)return F[t];return null}function Th(){const e=Si(),t=new Set(Ze),i=hd()||[],n=[];for(const s of i){if(n.length>=vf)break;t.has(s)||o.currentApp&&o.currentApp.id===s||fn(s)&&n.push(s)}return e.dockRecents?n:[]}function bn(){if(!z||!z.isConnected)return;const e=Si(),t=Uc()&&e.dockRecents,i=t?Th():[],n=Ze.slice(0,Math.max(0,e.dockCount|0));let s=n.map(d=>{const c=fn(d);return c?`<button class="dock-app-icon" data-id="${d}" data-name="${c.name}" aria-label="${c.name}" title="${c.name}"><span class="dock-icon-box">${J(d)}</span></button>`:""}).join("");t&&i.length&&(s+='<span class="dock-sep" aria-hidden="true"></span>',s+=i.map(d=>{const c=fn(d);return`<button class="dock-app-icon dock-recent-icon" data-id="${d}" data-name="${c.name}" aria-label="最近：${c.name}" title="${c.name}"><span class="dock-icon-box">${J(d)}</span></button>`}).join("")),s||(s='<span class="dock-empty-hint">长按桌面应用图标可添加到 Dock</span>');const a=o.currentIconEl&&$e.contains(o.currentIconEl)?o.currentIconEl:null,r=a?a.getAttribute("data-id"):null;if($e.innerHTML=s,r){const d=$e.querySelector(`.dock-app-icon[data-id="${r}"]`);d&&(o.currentIconEl=d)}n.filter(d=>fn(d)).length!==Ze.length&&(Ze=Ze.filter(d=>fn(d)),gd()),z.classList.toggle("no-recents",!(t&&i.length)),z.classList.toggle("mac-effect",!!(e.dockMacEffect&&!Yl)),z.classList.contains("mac-effect")||Ul(),_y()}function ky(e){if(o.isEditMode)return;const t=e.getAttribute("data-id"),i=F.findIndex(n=>n.id===t);if(i===-1){Eo(t);return}j(i,e)}function Ey(e){if(o.isEditMode)return;const t=e.getAttribute("data-id"),i=fn(t);i&&(Eo(t),navigator.vibrate&&navigator.vibrate([15,30,15]),window.showSystemToast&&window.showSystemToast("已从 Dock 移除「"+i.name+"」"))}let Vi=0,Xt=!1,nt=0,vd=0,Hs=0,ue=null,Xl=0,yd=null,Br=!1,st=null;function Mh(){!z||!$e||($e.querySelectorAll(".dock-app-icon").forEach(e=>{e.style.transform="";const t=e.querySelector(".dock-icon-box");t&&(t.style.transform="")}),z.style.width="",z.style.maxWidth="",z.style.transform="",z.style.transition="",st&&st.classList.remove("show"))}function _y(){ue=null,(Xt||nt>0)&&_o()}function Ty(){if(!z||!$e)return!1;const e=$e.querySelectorAll(".dock-app-icon");return e.length?(Mh(),ue=[],e.forEach(t=>{const i=t.getBoundingClientRect(),n=i.width||54;ue.push({btn:t,left:i.left,w:n,cx:i.left+n/2})}),Xl=z.offsetWidth||z.getBoundingClientRect().width||0,!0):!1}function _o(){Vi||(Vi=requestAnimationFrame(Ch))}function My(e){!z||!z.classList.contains("mac-effect")||(vd=e.clientX,Xt=!0,ue=null,Hs=0,Br||(Br=!0,document.addEventListener("pointermove",Lh,{passive:!0})),_o())}function Lh(e){if(!z||!z.classList.contains("mac-effect")){Fr();return}const t=yd||z.getBoundingClientRect(),i=e.clientX>=t.left-24&&e.clientX<=t.right+24&&e.clientY>=t.top-150&&e.clientY<=t.bottom+24;vd=e.clientX,i?(Xt=!0,_o()):Fr()}function Fr(){Xt=!1,nt>0&&_o()}function Ch(e){if(Vi=0,!z||!z.classList.contains("mac-effect")){Ul();return}const t=Hs?Math.max(0,Math.min(64,e-Hs)):16.7;Hs=e;const i=Xt?80:170,n=Xt?1:0;if(nt+=(n-nt)*(1-Math.exp(-t/i)),Math.abs(n-nt)<.002&&(nt=n),nt<=0&&!Xt){Ul();return}Ly(),(Xt?nt>=1:nt<=0)||(Vi=requestAnimationFrame(Ch))}function Ly(){if(!ue&&!Ty())return;const e=Si(),t=Math.max(1.2,Math.min(2.8,Number(e.dockMagnify)||_h)),i=ue[0].w||54,n=[];for(let f=1;f<ue.length;f++)n.push(Math.max(0,ue[f].left-ue[f-1].left-ue[f-1].w));const s=ue.map(f=>1+(by(Math.abs(vd-f.cx),i,{maxScale:t})-1)*nt),a=Sy(s,i,n);for(let f=0;f<ue.length;f++){const m=ue[f],y=m.btn.querySelector(".dock-icon-box");y&&(y.style.transform=s[f]>1.0005?`scale(${s[f].toFixed(4)})`:""),m.btn.style.transform=Math.abs(a.dx[f])>.05?`translateX(${a.dx[f].toFixed(2)}px)`:""}const r=12,l=12,d=document.documentElement.clientWidth||window.innerWidth||0;let c=a.span+r+l;d>0&&(c=Math.min(c,Math.max(220,Math.round(d*.96)))),Xl>0&&(c=Math.max(c,Xl));const h=ue[0].left+a.delta-r-d/2+c/2;z.style.transition="none",z.style.width=c.toFixed(2)+"px",z.style.maxWidth=c.toFixed(2)+"px",z.style.transform=`translateX(-50%) translateX(${h.toFixed(2)}px)`,yd=z.getBoundingClientRect(),Cy(a,s)}function Cy(e,t){if(!st)return;const i=e.hovered,n=i>=0?t[i]:1;if(!(i>=0&&n>1.12&&nt>.5&&ue&&ue[i])){st.classList.remove("show");return}const a=ue[i];st.textContent=a.btn.getAttribute("data-name")||a.btn.title||"";const r=ue[0].left+e.delta-12;st.style.left=(a.cx+e.dx[i]-r).toFixed(1)+"px";const l=ue[0].w||54;st.style.bottom=Math.round(10+l*n+8)+"px",st.classList.add("show")}function Ul(){Vi&&(cancelAnimationFrame(Vi),Vi=0),Xt=!1,nt=0,Hs=0,ue=null,yd=null,Br&&(Br=!1,document.removeEventListener("pointermove",Lh)),Mh()}function bp(){try{Yl=window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{Yl=!1}}function Iy(){bp();try{if(window.matchMedia){const n=window.matchMedia("(prefers-reduced-motion: reduce)"),s=()=>bp();n.addEventListener?n.addEventListener("change",s):n.addListener&&n.addListener(s)}}catch{}z=document.createElement("div"),z.className="dock-bar",z.id="dockBar",z.setAttribute("role","toolbar"),z.setAttribute("aria-label","Dock"),z.innerHTML='<div class="dock-items"></div>',$e=z.querySelector(".dock-items"),st=document.createElement("div"),st.className="dock-tip",st.setAttribute("aria-hidden","true"),z.appendChild(st),document.body.appendChild(z);let e=0,t=!1;$e.addEventListener("click",n=>{if(t){t=!1;return}const s=n.target&&n.target.closest?n.target.closest(".dock-app-icon"):null;s&&ky(s)}),$e.addEventListener("pointerdown",n=>{if(n.button!==void 0&&n.button!==0)return;const s=n.target&&n.target.closest?n.target.closest(".dock-app-icon"):null;s&&(t=!1,clearTimeout(e),e=setTimeout(()=>{t=!0,Ey(s)},vy))});const i=()=>{clearTimeout(e)};$e.addEventListener("pointermove",()=>{e&&i()}),$e.addEventListener("pointerup",i),$e.addEventListener("pointercancel",i),$e.addEventListener("pointerleave",i),z.addEventListener("pointerenter",My),z.addEventListener("pointerup",n=>{n.pointerType&&n.pointerType!=="mouse"&&Fr()}),z.addEventListener("pointercancel",()=>Fr()),window.addEventListener("desktop-prefs-changed",()=>{bn(),Kl()}),window.addEventListener("resize",()=>{bn()},{passive:!0}),document.body.classList.add("dock-on"),bn(),Kl()}function Kl(){const e=Si(),t=!!(e.dockEnabled&&z&&z.isConnected);document.body.classList.toggle("dock-on",t);const i=Math.min(Ze.length,e.dockCount),n=t&&Uc()&&e.dockRecents?Th().length:0,s=t&&(i>0||n>0);document.documentElement.style.setProperty("--dock-space",s?"88px":"0px")}typeof window<"u"&&window.addEventListener("dock-refresh-requested",()=>{bn(),Kl()});if(typeof window<"u"){if(window.__settingsMedia={setVolume:e=>rt.setVolume(e),getVolume:()=>rt.getState().volume},window.__getAppIconSVG=J,window.__settingsTheme={resolved:()=>Ct(),set:e=>Jn(e)},!window.__md3SliderSet){var sl=10;window.__md3SliderSet=function(e,t,i,n,s){if(t){var a=e&&e.clientWidth||0;if(!(a<=0)){var r=Math.max(0,Math.min(1,n))*a,l=W1(a,r,sl);t.style.width="",t.style.transform="translateY(-50%)",t.style.clipPath=l.fill;var d=e._md3Line;d===void 0&&(d=e._md3Line=e.querySelector(".md3-slider-line")),d&&(d.style.transform="translateY(-50%)",d.style.clipPath=l.line),i&&(i.style.left="",i.style.transform="translateX("+r.toFixed(1)+"px) translate(-50%,-50%)");var c=e._md3Dots;if(c===void 0&&(c=e._md3Dots=Array.prototype.slice.call(e.querySelectorAll(".m3-slider-dot"))),c.length){for(var p=a-4,h=-1,f=0;f<c.length;f++){var m=2+(c.length===1?p/2:f*p/(c.length-1));Math.abs(m-r)<=sl+3?c[f].classList.add("is-hidden"):(c[f].classList.remove("is-hidden"),m<r&&(h=f))}for(var y=0;y<c.length;y++)c[y].classList.toggle("is-active",y<=h)}var g=e._md3Stop;g===void 0&&(g=e._md3Stop=e.querySelector(".m3-slider-stop-dot")),g&&g.classList.toggle("is-hidden",r>a*.98-sl-4)}}}}!window.__md3SliderWatch&&window.ResizeObserver&&(window.__md3SliderWatch=function(e,t){!e||e._md3SliderWatched||(e._md3SliderWatched=!0,new ResizeObserver(function(){e.isConnected&&e.clientWidth>0&&t()}).observe(e))}),window.__settingsFolderUninstall=function(e){try{for(const t of o.pagesApps)if(Array.isArray(t))for(const i of t){if(!i||i.type!=="folder"||!Array.isArray(i.apps))continue;const n=i.apps.findIndex(a=>a&&a.id===e);if(n===-1)continue;const s=i.apps.splice(n,1)[0];o.removedApps||(o.removedApps=[]),o.removedApps.push(s);try{localStorage.setItem("ios-desktop:removed-apps",JSON.stringify(o.removedApps))}catch{}return td(i),Qe(),tt(),!0}}catch{}return!1}}typeof window<"u"&&(window.__desktopPrefs={get:Si,set:r0,cols:Yc,rows:Gc,dockMax:Qi,recentsMax:vf,tablet:Uc},window.__dockPrefs={items:Gl,add:Eh,remove:Eo,allApps:()=>F.map(e=>({id:e.id,name:e.name}))});const Ih={id:"settings",name:"设置",pages:[{title:"设置",content:`
        <!-- v7.51 issue#7：Android 16 式双栏根（窄容器=单栏旧布局；宽容器由 JS 加 .tp-wide） -->
        <div class="tp-root">
          <div class="tp-left">
          <!-- 用户个人资料卡片 MD3 Elevated Card -->
          <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;display:flex;align-items:center;gap:16px;">
            <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,hsl(var(--md-h,215) 80% 40%),hsl(var(--md-h,215) 90% 65%));display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:600;box-shadow:var(--md-shadow-2);">
              A
            </div>
            <div style="display:flex;flex-direction:column;flex:1;">
              <span style="font-size:17px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">Android / MD3 用户</span>
              <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">Google 账号 · 同步与个性化</span>
            </div>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
          </div>

          <!-- 搜索胶囊（Android 16 双栏左栏同款；实时过滤下方分组） -->
          <div class="tp-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>
            <input type="text" placeholder="搜索设置" aria-label="搜索设置" />
          </div>

          <!-- 设置清单（由 settings-two-pane.js 统一生成：多彩底板 + 副标题 + 双栏导航桥） -->
          ${U1()}
      
          </div><!-- /tp-left -->

          <!-- 右栏详情面板（⑤ 空态引导；宽格局下由双栏模块把栈页移入/注入到此） -->
          <div class="tp-right">
            <div class="tp-empty">
              <div class="tp-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v6.2a2 2 0 0 1-.4 1.2L4.2 16a2.6 2.6 0 0 0 2.1 4.2h11.4a2.6 2.6 0 0 0 2.1-4.2l-4.4-5.6a2 2 0 0 1-.4-1.2V3"/><path d="M7.5 3h9"/></svg>
              </div>
              <div class="tp-empty-t">请打开一个设置项以查看</div>
              <div class="tp-empty-s">从左侧选择一项设置，详情将在这里展示</div>
            </div>
          </div><!-- /tp-right -->
        </div><!-- /tp-root -->

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
              // v7.51 issue#7：挂载双栏分屏（幂等）——首次执行 + 每次页面激活/弹回栈根重估
              var tpRoot = document.querySelector('.tp-root');
              function tpBoot() {
                var root = document.querySelector('.tp-root:not([data-tp-mounted="1"])') || tpRoot;
                if (root && window.__settingsTwoPaneMount) window.__settingsTwoPaneMount(root);
                if (window.__settingsTwoPaneReEval) window.__settingsTwoPaneReEval();
              }
              tpBoot();
              bindDoc('settings', 'app-page-active', function(e) {
                if (e.detail && e.detail.appId === 'settings') tpBoot();
              });
            })();
          <\/script>
      `},{title:"显示与亮度",content:`<div style="padding:16px 0;">
        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:12px;display:flex;justify-content:space-between;">
            <span>屏幕亮度</span>
            <span id="dispBriVal" style="color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">75%</span>
          </div>
          <!-- MD3 Expressive Slider（v7.39 原生厚轨道双段 + 竖柄药丸，高度由类级 64px 接管） -->
          <div class="md3-slider is-continuous" id="dispBriSlider">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="dispBriFill"></div>
            <div class="m3-slider-stop-dot"></div>
            <div class="md3-slider-thumb" id="dispBriThumb"></div>
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
            // v7.34 rAF 合帧（末事件原则）+ v7.38 transform 驱动：
            // width/left 是 layout+paint 属性，快速拖动时 fill 大色块重光栅
            // 滞后于 thumb 小竖条 → 视觉脱节（GitHub issue 实测最大 52px）；
            // 现两者均走合成器属性，零 layout 零重光栅，天然同帧
            var briRaf = 0, briLastE = null, briDown = false, briP = 0.75;
            var briPaint = function() {
              briRaf = 0;
              var e = briLastE; briLastE = null;
              if (!e) return;
              var r = s.getBoundingClientRect();
              var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
              briP = p;
              if (window.__md3SliderSet) window.__md3SliderSet(s, f, th, p, briDown);
              if (v) v.innerText = Math.round(p * 100) + '%';
            };
            var update = function(e) {
              briLastE = e;
              if (!briRaf) briRaf = requestAnimationFrame(briPaint);
            };
            var down = false;
            s.onpointerdown = function(e) { briDown = true; down = true; s.classList.add('is-dragging'); try { s.setPointerCapture(e.pointerId); } catch (err) {} update(e); };
            s.onpointermove = function(e) { if (down) update(e); };
            s.onpointerup = s.onpointercancel = function(e) {
              down = false; briDown = false;
              s.classList.remove('is-dragging');
              if (window.__md3SliderSet) window.__md3SliderSet(s, f, th, briP, false); // v7.39 桥内已无按压 scaleY，纯重绘落定
              try { s.releasePointerCapture(e.pointerId); } catch(err){} if (navigator.vibrate) navigator.vibrate(8); };
            // 初值即时落位（模板不再带内联几何，避免隐藏期零宽错位）
            if (window.__md3SliderSet) window.__md3SliderSet(s, f, th, briP, false);
            if (v) v.innerText = Math.round(briP * 100) + '%';
            if (window.__md3SliderWatch) window.__md3SliderWatch(s, function() {
              if (window.__md3SliderSet) window.__md3SliderSet(s, f, th, briP, false);
            });

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
          <span id="settingsBatteryChargeBadge" style="display:none;position:absolute;top:2px;right:-34px;font-size:22px;color:var(--md-primary,#7df8db);">${v.battery_charging}</span>
        </div>
        <div id="settingsBatteryEstimate" style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;">预计可用 8 小时 45 分钟</div>

        <div style="max-width:260px;margin:14px auto 0;height:8px;border-radius:99px;background:var(--md-surface-container-high,#353639);overflow:hidden;">
          <div id="settingsBatteryBar" style="width:87%;height:100%;border-radius:99px;background:var(--md-success,#a8f5bb);transition:width .6s cubic-bezier(.2,.8,.2,1),background .4s;"></div>
        </div>
        <div id="settingsBatterySource" style="font-size:11px;color:var(--md-outline,#6a6b6e);margin-top:8px;">数据来源：设备电池（实时）</div>

        <div class="md3-card" style="padding:4px 0;margin-top:24px;overflow:hidden;text-align:left;">
          <div class="md3-list-item" style="cursor:default;">
            <div class="md3-list-item-icon">${v.battery_saver}</div>
            <span class="md3-list-item-text">省电模式</span>
            <label class="md3-switch"><input type="checkbox" id="settingsBatterySaverSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <!-- v7.48：移除「电池最大健康容量 98%」行 —— 写死假数据无实际用处（issue 反馈） -->

        <div class="md3-card" style="padding:4px 0;margin-top:12px;overflow:hidden;text-align:left;">
          <div class="md3-list-item" style="cursor:default;align-items:flex-start;">
            <div class="md3-list-item-icon" style="margin-top:10px;">${v.speed}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;">耗电速率</div>
              <div id="settingsBatteryDrainRate" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 10px;">测量中 · 需观察一格电量变化</div>
            </div>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;align-items:flex-start;">
            <div class="md3-list-item-icon" style="margin-top:10px;">${v.battery_charging}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;">充电速率</div>
              <div id="settingsBatteryChargeRate" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 10px;">接入充电器后开始测量</div>
            </div>
          </div>
        </div>

        <div class="md3-card" id="settingsSimChargerCard" style="padding:4px 0;margin-top:12px;overflow:hidden;text-align:left;display:none;">
          <div class="md3-list-item">
            <div class="md3-list-item-icon">${v.bolt}</div>
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
            <span id="sndVolVal" style="color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">60%</span>
          </div>
          <div class="md3-slider" id="sndVolSlider">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="sndVolFill"></div>
            <div class="md3-slider-thumb" id="sndVolThumb"></div>
          </div>
        </div>

        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:12px;display:flex;justify-content:space-between;">
            <span>系统音效音量</span>
            <span id="sfxVolVal" style="color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">50%</span>
          </div>
          <div class="md3-slider" id="sfxVolSlider">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="sfxVolFill"></div>
            <div class="md3-slider-thumb" id="sfxVolThumb"></div>
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
              var bindSlider = function(slider, fill, thumb, label, onPct, getP) {
                if (!slider || slider._bound) return;
                slider._bound = true;
                // v7.34 rAF 合帧（末事件原则）+ v7.38 transform 驱动：
                // fill/thumb 同帧写入却因大色块重光栅滞后视觉脱节（GitHub issue
                // 截图实测最大 52px）；合成器属性零 layout 零重光栅，根治脱节
                var slRaf = 0, slLastE = null, down = false, lastP = 0;
                var slPaint = function() {
                  slRaf = 0;
                  var e = slLastE; slLastE = null;
                  if (!e) return;
                  var r = slider.getBoundingClientRect();
                  var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                  lastP = p;
                  if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, p, down);
                  if (label) label.innerText = Math.round(p * 100) + '%';
                  onPct(p);
                };
                var update = function(e) {
                  slLastE = e;
                  if (!slRaf) slRaf = requestAnimationFrame(slPaint);
                };
                slider.onpointerdown = function(e) { down = true; slider.classList.add('is-dragging'); try { slider.setPointerCapture(e.pointerId); } catch (err) {} update(e); };
                slider.onpointermove = function(e) { if (down) update(e); };
                slider.onpointerup = slider.onpointercancel = function(e) {
                  if (down) {
                    down = false;
                    slider.classList.remove('is-dragging');
                    // v7.39 桥内已无按压 scaleY，落定重绘 + 恢复 CSS 过渡（终值平滑吸附）
                    if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, lastP, false);
                  }
                  try { slider.releasePointerCapture(e.pointerId); } catch (err) {}
                };
                // 尺寸/可见性变化 → 重读权威真值重绘（RO 在 observe 时会立即回调
                // 一次，不能用未初始化的 lastP —— 否则会把正确初值覆盖回 0）
                if (window.__md3SliderWatch) window.__md3SliderWatch(slider, function() {
                  var p = getP ? getP() : lastP;
                  lastP = p;
                  if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, p, false);
                });
              };
              // 媒体音量：真实联动 media-service 的 HTML5 Audio 引擎（watch 重读引擎真值）
              bindSlider(sv, svf, svt, svv, function(p) { if (window.__settingsMedia) window.__settingsMedia.setVolume(p); }, function() { return window.__settingsMedia ? window.__settingsMedia.getVolume() : 0.6; });
              // 系统音效音量：联动 sound-haptics 引擎
              bindSlider(xv, xvf, xvt, xvv, function(p) { if (sfx) sfx.setVolume(p); }, function() { return sfx ? sfx.getVolume() : 0.5; });
              // fix(audit-E): 媒体音量滑杆每次激活回同步当前真值（initOnce 在
              // app-page-active(4) 时重跑，此前只回同步了系统音效，媒体音量被
              // 播放器/快捷设置改过后回来仍显示旧值）
              if (window.__settingsMedia && window.__settingsMedia.getVolume) {
                var mv = Math.round(window.__settingsMedia.getVolume() * 100);
                if (svv) svv.innerText = mv + '%';
                if (window.__md3SliderSet) window.__md3SliderSet(sv, svf, svt, mv / 100, false);
              }
              if (sfx && xvv) {
                var cur = Math.round(sfx.getVolume() * 100);
                xvv.innerText = cur + '%';
                if (window.__md3SliderSet) window.__md3SliderSet(xv, xvf, xvt, cur / 100, false);
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
            <div class="md3-list-item-icon">${v.settings}</div>
            <div style="display:flex;flex-direction:column;flex:1;">
              <span class="md3-list-item-text">系统版本</span>
              <span id="sysVerLine" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">读取中…</span>
            </div>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" id="devCheckUpdateBtn">
            <div class="md3-list-item-icon">${v.sync}</div>
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
            <span id="devAnimSpeedVal" style="color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">1×</span>
          </div>
          <div style="font-size:11.5px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.6;margin-bottom:10px;">
            应用开合 / 切换退场 / 子页导航的物理弹簧速度 · 即时生效（运行中的动画热换曲线不跳变）
          </div>
          <div class="md3-slider is-discrete" id="devAnimSpeedSlider">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="devAnimSpeedFill"></div>
            <div class="m3-slider-ticks">
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot"></span>
              <span class="m3-slider-dot"></span>
              <span class="m3-slider-dot"></span>
            </div>
            <div class="md3-slider-thumb" id="devAnimSpeedThumb"></div>
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
            <div class="md3-list-item-icon">${v.restart_alt}</div>
            <span class="md3-list-item-text">重置桌面布局（图标排列与卸载记录）</span>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" id="devWipeDataBtn" style="color:#ff8a8a;">
            <div class="md3-list-item-icon" style="color:#ff8a8a;">${v.delete_forever}</div>
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
                // fix(v7.45)：旧正则 /geek-vd+[-a-zA-Z]*/ 取「全文首个 geek-v 字样」，既会把
                // 策略名一并吞进（'geek-v53-cacheFirst'，issue #5 img3），也会被任何注释里的
                // 同形字符串命中。现锚定 VERSION 常量赋值行提取，天然免疫注释与策略名。
                var v = (t.match(/const VERSION = '([^']+)'/) || [''])[1];
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
                var down = false;
                var curT = 0;
                var paint = function(v) {
                  var t = toT(Math.min(SP_MAX, Math.max(SP_MIN, v)));
                  curT = t;
                  if (window.__md3SliderSet) window.__md3SliderSet(spS, spF, spT, t, down);
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
                var paintT = function(t, pressed) {
                  curT = t;
                  if (window.__md3SliderSet) window.__md3SliderSet(spS, spF, spT, t, pressed);
                };
                // v7.34 rAF 合帧：拖拽期 apply（含 localStorage 写 + 弹簧热更新）
                // 随事件率直调 → 每帧至多一次；末事件原则保证落点不丢
                // v7.38：transform 驱动；v7.39 桥内统一双段间隙几何 + 刻度点跟随
                var spRaf = 0, spLastE = null;
                var spPaint = function() {
                  spRaf = 0;
                  var e = spLastE; spLastE = null;
                  if (!e) return;
                  var r = spS.getBoundingClientRect();
                  var t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                  paintT(t, down);
                  apply(toV(t), true);
                };
                var update = function(e) {
                  spLastE = e;
                  if (!spRaf) spRaf = requestAnimationFrame(spPaint);
                };
                spS.onpointerdown = function(e) { down = true; spS.classList.add('is-dragging'); try { spS.setPointerCapture(e.pointerId); } catch (err) {} update(e); };
                spS.onpointermove = function(e) { if (down) update(e); };
                spS.onpointerup = spS.onpointercancel = function(e) {
                  if (down) {
                    down = false;
                    spS.classList.remove('is-dragging');
                    paintT(curT, false); // v7.39 落定重绘 + 恢复 CSS 过渡（终值平滑吸附）
                  }
                  try { spS.releasePointerCapture(e.pointerId); } catch (err) {}
                  if (window.showSystemToast) window.showSystemToast('动画倍率：' + fmt(dev.getAnimSpeed()));
                };
                if (window.__md3SliderWatch) window.__md3SliderWatch(spS, function() { paint(dev.getAnimSpeed()); });
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
        <\/script>`},{title:"桌面与 Dock",content:`<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">图标网格</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 14px;">
            调整桌面图标的列数与行数。「自动」跟随设备形态（手机竖屏 4×6，平板/横屏 6×4）。
            缩小网格时超出容量的图标会按顺序顺延到下一页，排列次序保持不变。
          </div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin-bottom:8px;">列数</div>
          <div id="dpColChips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;"></div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin-bottom:8px;">行数</div>
          <div id="dpRowChips" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>

        <div class="md3-card md3-card-elevated" style="margin:0 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">Dock</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 4px;">
            桌面底部的常驻应用栏。数量上限 6 个；平板尺寸下最右侧追加最多 3 个「最近打开应用」位。
            长按 Dock 上的图标可将其移除。
          </div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">启用 Dock</span>
            <label class="md3-switch"><input type="checkbox" id="dpDockEnabled"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">平板显示最近应用（≤3）</span>
            <label class="md3-switch"><input type="checkbox" id="dpDockRecents"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">macOS 神奇效果</span>
            <label class="md3-switch"><input type="checkbox" id="dpMacEffect"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;padding:0 16px 10px;">
            开启后按 Apple 原版曲线 1:1 复刻：悬停图标钉在指针下方放至倍率上限，邻位图标被推开、
            Dock 整体变宽拥抱内容，悬停图标上方浮现应用名气泡；移开后约 1 秒内平滑落定。
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">放大倍率</span>
            <span style="display:flex;align-items:center;gap:10px;">
              <input type="range" id="dpMagnify" min="1.4" max="2.8" step="0.05"
                style="width:130px;accent-color:hsl(var(--md-h,215) 70% 55%);">
              <span id="dpMagnifyVal" style="font-size:13px;font-weight:600;min-width:46px;text-align:right;color:var(--md-on-surface);">2.25×</span>
            </span>
          </div>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;padding:0 16px 10px;">
            与 macOS 系统设置的 Magnification 滑杆同源（默认 2.25×，范围 1.4×–2.8×）。
          </div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin:6px 0 8px;padding:0 16px;">图标数量（1–6）</div>
          <div id="dpCountChips" style="display:flex;gap:8px;flex-wrap:wrap;padding:0 16px;margin-bottom:6px;"></div>
        </div>

        <div class="md3-card md3-card-elevated" style="margin:0 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">后台多任务</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 14px;">
            后台卡片的布局风格。3D 轮播为 Material Expressive 深度堆叠（侧卡后仰、景深错落）；
            经典平铺为传统安卓样式（Android 5–9 同构）：卡片正对镜头平面横向依次排列，全程不做虚化。
          </div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin-bottom:8px;">卡片布局</div>
          <div id="dpRecentsStyleChips" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>

        <div class="md3-card md3-card-elevated" style="margin:0 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">Dock 应用管理</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 12px;">
            当前固定在 Dock 上的应用。点「×」移除；下方点应用图标即可添加（上限 <span id="dpDockMaxHint">6</span> 个）。
          </div>
          <div id="dpDockItems" style="display:flex;gap:12px;flex-wrap:wrap;padding:0 2px 12px;"></div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 2px 12px;"></div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin-bottom:10px;">可添加</div>
          <div id="dpDockPool" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:10px;"></div>
        </div>

        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var P = window.__desktopPrefs;
            var D = window.__dockPrefs;

            function chipHTML(group, val, cur, label) {
              var on = String(val) === String(cur);
              return '<button type="button" class="dp-chip" data-group="' + group + '" data-v="' + val + '"' +
                ' style="padding:8px 16px;border-radius:999px;border:1.5px solid ' + (on ? 'hsl(var(--md-h,215) 85% 60%)' : 'var(--md-outline-variant,transparent)') +
                ';background:' + (on ? 'hsl(var(--md-h,215) 80% 55% / .16)' : 'var(--md-surface-container,#232529)') +
                ';color:' + (on ? 'hsl(var(--md-h,215) 85% 70%)' : 'var(--md-on-surface,#e2e2e9)') +
                ';font-size:13px;font-weight:600;cursor:pointer;">' + label + '</button>';
            }

            function appTile(id, name, removable, iconSvg) {
              return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:64px;">' +
                '<div style="position:relative;width:52px;height:52px;">' +
                '<div style="width:52px;height:52px;border-radius:13px;overflow:hidden;">' + iconSvg + '</div>' +
                (removable ? '<button type="button" class="dp-dock-remove" data-id="' + id + '" aria-label="移除 ' + name + '"' +
                  ' style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:none;cursor:pointer;' +
                  'background:hsl(var(--md-h,215) 70% 55%);color:#fff;font-size:13px;line-height:20px;text-align:center;">×</button>' : '') +
                '</div>' +
                '<span style="font-size:11px;color:var(--md-on-surface-variant);max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + name + '</span>' +
                '</div>';
            }

            function render() {
              if (!P || !D) return;
              var p = P.get();
              var colEl = document.getElementById('dpColChips');
              var rowEl = document.getElementById('dpRowChips');
              if (colEl) {
                var html = chipHTML('cols', 'auto', p.cols, '自动');
                for (var i = 0; i < P.cols.length; i++) html += chipHTML('cols', P.cols[i], p.cols, String(P.cols[i]));
                colEl.innerHTML = html;
              }
              if (rowEl) {
                var html2 = chipHTML('rows', 'auto', p.rows, '自动');
                for (var j = 0; j < P.rows.length; j++) html2 += chipHTML('rows', P.rows[j], p.rows, String(P.rows[j]));
                rowEl.innerHTML = html2;
              }
              var swE = document.getElementById('dpDockEnabled');
              var swR = document.getElementById('dpDockRecents');
              var swM = document.getElementById('dpMacEffect');
              if (swE) swE.checked = !!p.dockEnabled;
              if (swR) swR.checked = !!p.dockRecents;
              if (swM) swM.checked = !!p.dockMacEffect;
              var mgEl = document.getElementById('dpMagnify');
              var mgVal = document.getElementById('dpMagnifyVal');
              if (mgEl) mgEl.value = String(p.dockMagnify);
              if (mgVal) mgVal.innerText = Number(p.dockMagnify).toFixed(2) + '×';

              var countEl = document.getElementById('dpCountChips');
              if (countEl) {
                var html3 = '';
                for (var k = 1; k <= P.dockMax; k++) html3 += chipHTML('dockCount', k, p.dockCount, String(k));
                countEl.innerHTML = html3;
              }
              var styleEl = document.getElementById('dpRecentsStyleChips');
              if (styleEl) {
                styleEl.innerHTML =
                  chipHTML('recentsStyle', 'carousel', p.recentsStyle, '3D 轮播（默认）') +
                  chipHTML('recentsStyle', 'classic', p.recentsStyle, '经典平铺') +
                  chipHTML('recentsStyle', 'tablet', p.recentsStyle, '平板网格');
              }
              var maxHint = document.getElementById('dpDockMaxHint');
              if (maxHint) maxHint.innerText = String(P.dockMax);

              var itemsEl = document.getElementById('dpDockItems');
              var poolEl = document.getElementById('dpDockPool');
              if (itemsEl) {
                var items = D.items();
                if (!items.length) {
                  itemsEl.innerHTML = '<span style="font-size:12px;color:var(--md-on-surface-variant);">Dock 为空 —— 从下方添加，或长按桌面应用图标选择「添加到 Dock」</span>';
                } else {
                  var h4 = '';
                  for (var m = 0; m < items.length; m++) {
                    var a = D.allApps().filter(function(x) { return x.id === items[m]; })[0];
                    if (!a) continue;
                    h4 += appTile(a.id, a.name, true, window.__getAppIconSVG(a.id));
                  }
                  itemsEl.innerHTML = h4;
                }
              }
              if (poolEl) {
                var pool = D.allApps().filter(function(x) { return D.items().indexOf(x.id) === -1; });
                var h5 = '';
                for (var n = 0; n < pool.length; n++) {
                  h5 += appTile(pool[n].id, pool[n].name, false, window.__getAppIconSVG(pool[n].id));
                }
                poolEl.innerHTML = h5 || '<span style="font-size:12px;color:var(--md-on-surface-variant);">全部应用都已在 Dock 上</span>';
              }
            }

            bindDoc('settings', 'click', function(e) {
              var chip = e.target && e.target.closest ? e.target.closest('.dp-chip') : null;
              if (chip && chip.isConnected) {
                var g = chip.getAttribute('data-group');
                var v = chip.getAttribute('data-v');
                var val = (v === 'auto') ? 'auto' : parseInt(v, 10);
                if (g === 'dockCount') val = parseInt(v, 10);
                if (g === 'recentsStyle') val = v; // 字符串档位（carousel/classic）不经 parseInt
                P.set(g, val);
                render();
                return;
              }
              var rm = e.target && e.target.closest ? e.target.closest('.dp-dock-remove') : null;
              if (rm && rm.isConnected) {
                D.remove(rm.getAttribute('data-id'));
                render();
                return;
              }
              // 池点按 = 添加（满员由 addToDock 拒绝并吐司提示）
              var poolTile = e.target && e.target.closest ? e.target.closest('#dpDockPool > div') : null;
              if (poolTile && poolTile.isConnected) {
                var btn = poolTile.querySelector ? null : null;
                var id = null;
                var nameEl = poolTile.querySelector('span');
                var added = false;
                var all = D.allApps();
                for (var i = 0; i < all.length; i++) {
                  if (nameEl && all[i].name === nameEl.innerText) { id = all[i].id; break; }
                }
                if (id) added = D.add(id);
                if (added && window.showSystemToast) window.showSystemToast('已添加到 Dock');
                else if (!added && window.showSystemToast) window.showSystemToast('Dock 已满（最多 ' + P.dockMax + ' 个）');
                render();
              }
            });

            bindDoc('settings', 'change', function(e) {
              var t = e.target;
              if (!t || !t.id) return;
              if (t.id === 'dpDockEnabled') P.set('dockEnabled', !!t.checked);
              else if (t.id === 'dpDockRecents') P.set('dockRecents', !!t.checked);
              else if (t.id === 'dpMacEffect') P.set('dockMacEffect', !!t.checked);
              else if (t.id === 'dpMagnify') P.set('dockMagnify', parseFloat(t.value));
              else return;
            });

            // 拖动中实时反馈（input 事件）：label 即时刷新 + 偏好即时生效
            bindDoc('settings', 'input', function(e) {
              var t = e.target;
              if (!t || t.id !== 'dpMagnify') return;
              var v = parseFloat(t.value);
              var lb = document.getElementById('dpMagnifyVal');
              if (lb) lb.innerText = v.toFixed(2) + '×';
              P.set('dockMagnify', v);
            });

            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 14) render();
            });
            render();
          })();
        <\/script>`}]};ny(Ih.pages);const Ay={id:"clock_app",name:"时钟",type:"clock",pages:[{title:"时钟",content:de("apps/clock-app/index.html")}]},Py={id:"cal_app",name:"日历",type:"calendar",pages:[{title:"日历",content:de("apps/calendar/index.html")}]},By={id:"weather",name:"天气",bgColor:"#0284C7",pages:[{title:"天气",content:de("apps/weather/index.html")}]},Fy={id:"music",name:"音乐",pages:[{title:"音乐",content:`
        ${de("apps/music/index.html")}
        <!-- 本地文件导入浮层 -->
        <div id="musicImportOverlay" style="position:absolute;inset:0;z-index:500;background:rgba(0,0,0,0.7);backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;opacity:0;transition:opacity 0.25s;">
          <div style="background:var(--md-surface-container,hsl(var(--md-h,215) 18% 12%));border-radius:24px;padding:24px;width:80%;max-width:340px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">${v.music_note}</div>
            <div style="font-size:18px;font-weight:600;color:var(--md-on-surface,#e2e2e9);margin-bottom:8px;">导入本地音乐</div>
            <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:20px;">支持 MP3 / WAV / FLAC / M4A，以及 ZIP / TAR 音乐压缩包（含封面·歌词）</div>
            <div style="background:var(--md-primary,hsl(var(--md-h,215) 80% 25%));color:var(--md-on-primary,#fff);padding:14px;border-radius:9999px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:12px;" onclick="document.getElementById('musicFileInput').click()">选择音乐文件</div>
            <div style="color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;cursor:pointer;padding:8px;" onclick="document.getElementById('musicImportOverlay').style.display='none';document.getElementById('musicImportOverlay').style.opacity='0';">取消</div>
          </div>
        </div>
        <input type="file" id="musicFileInput" accept="audio/*,.zip,.tar,.tgz,.lrc,.txt,.jpg,.jpeg,.png,.webp" multiple style="display:none;" onchange="
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
      `}]},Dy={id:"calculator",name:"计算器",pages:[{title:"计算器",content:de("apps/calculator/index.html")}]},zy={id:"camera",name:"相机",pages:[{title:"相机",content:de("apps/camera/index.html")}]},Ry={id:"map",name:"地图",pages:[{title:"地图",content:`
        <div style="padding:16px 0;">
          <!-- MD3 搜索栏 -->
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:14px;border:1px solid var(--md-outline-variant);">
            <span style="font-size:18px;color:var(--md-primary);">${v.location_on}</span>
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
            <div style="position:absolute;bottom:12px;right:14px;font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">${v.explore}</div>
          </div>

          <!-- 收藏地点 MD3 Cards -->
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">快捷路线与收藏</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${v.home}</div>
              <div class="md3-list-item-text">
                <div>家</div>
                <div class="md3-list-item-subtext">浦东新区 · 12 公里</div>
              </div>
              <span style="color:var(--md-primary);font-weight:600;font-size:13px;margin-right:4px;">32 分钟</span>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(2)">
              <div class="md3-list-item-icon">${v.work}</div>
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
            <div style="font-size:16px;font-weight:600;color:var(--md-on-surface);">${v.work} 公司 → ${v.home} 家</div>
            <div style="font-size:36px;font-weight:700;color:var(--md-primary);font-family:var(--md-font-num);margin:12px 0 4px;">32 <span style="font-size:18px;font-weight:500;">分钟</span></div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);">12 公里 · 畅通无拥堵</div>
          </div>

          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.directions_car}</div>
              <div class="md3-list-item-text">驾车 / 打车</div>
              <span style="color:var(--md-primary);font-weight:600;font-size:14px;">32 分钟</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.metro}</div>
              <div class="md3-list-item-text">公共交通 (地铁 2 号线)</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">45 分钟</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.directions_walk}</div>
              <div class="md3-list-item-text">步行</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">2 小时 18 分</span>
            </div>
          </div>
          <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;" onclick="__demoAction && __demoAction('开始导航')">开始导航</button>
        </div>
      `},{title:"到公司路线",content:`
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="margin-bottom:16px;">
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:6px;">晨间通勤建议</div>
            <div style="font-size:16px;font-weight:600;color:var(--md-on-surface);">${v.home} 家 → ${v.work} 公司</div>
            <div style="font-size:36px;font-weight:700;color:var(--md-primary);font-family:var(--md-font-num);margin:12px 0 4px;">28 <span style="font-size:18px;font-weight:500;">分钟</span></div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);">3.2 公里 · 途经延安高架路</div>
          </div>

          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.directions_car}</div>
              <div class="md3-list-item-text">驾车</div>
              <span style="color:var(--md-primary);font-weight:600;font-size:14px;">28 分钟</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.metro}</div>
              <div class="md3-list-item-text">地铁 9 号线</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">35 分钟</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.directions_bike}</div>
              <div class="md3-list-item-text">骑行</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">18 分钟</span>
            </div>
          </div>
          <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;" onclick="__demoAction && __demoAction('开始导航')">开始导航</button>
        </div>
      `}]},Oy={id:"notes",name:"备忘录",pages:[{title:"备忘录",content:de("apps/notes/index.html")}]},$y={id:"reminders",name:"提醒",pages:[{title:"提醒",content:de("apps/reminders/index.html")}]},Hy={id:"health",name:"健康",pages:[{title:"健康",content:`
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
                <span style="font-size:16px;">${v.directions_walk}</span>
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
                <span style="font-size:16px;">${v.location_on}</span>
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
                <span style="font-size:16px;">${v.local_fire_department}</span>
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
                <span style="font-size:16px;">${v.bedtime}</span>
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
              <div class="md3-list-item-icon">${v.bar_chart}</div>
              <div class="md3-list-item-text">本周步数与运动趋势</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.favorite}</div>
              <div class="md3-list-item-text">静息心率</div>
              <span style="color:var(--md-primary,hsl(var(--md-h,215) 85% 70%));font-weight:600;font-size:14px;margin-right:6px;">72 bpm</span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.water_drop}</div>
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
      `}]},Ny={id:"wallet",name:"钱包",pages:[{title:"钱包",content:`
        <div style="padding:16px 0;">
          <!-- MD3 卡片展示 (Google Wallet / MD3 Expressive Card) -->
          <div class="md3-card md3-card-elevated" style="aspect-ratio:1.6;max-width:320px;margin:10px auto 16px;border-radius:24px;background:linear-gradient(135deg,#1f2937,#111827);padding:22px;display:flex;flex-direction:column;justify-content:space-between;border:1px solid rgba(255,255,255,0.12);box-shadow:var(--md-shadow-3);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div style="color:#fff;font-size:16px;font-weight:600;letter-spacing:0.5px;">招商银行储蓄卡</div>
                <div style="color:var(--md-on-surface-variant);font-size:11px;margin-top:2px;">Google Pay 默认卡片</div>
              </div>
              <span style="font-size:24px;">${v.credit_card}</span>
            </div>
            <div style="color:#fff;font-size:19px;letter-spacing:3px;font-family:monospace;font-weight:600;">•••• •••• •••• 8842</div>
            <div style="display:flex;justify-content:space-between;color:var(--md-on-surface-variant);font-size:12px;">
              <span>ZHANG SAN</span>
              <span>12/28</span>
            </div>
          </div>

          <div style="text-align:center;margin:12px 0 20px;color:var(--md-on-surface-variant);font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="color:var(--md-primary);">${v.auto_awesome}</span>
            <span>靠近感应区即可完成支付</span>
          </div>

          <!-- 操作与记录 MD3 List -->
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${v.assignment}</div>
              <div class="md3-list-item-text">近期交易记录明细</div>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.add_circle}</div>
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
              <div class="md3-list-item-icon">${v.coffee}</div>
              <div class="md3-list-item-text">
                <div>星巴克臻选</div>
                <div class="md3-list-item-subtext">09:12 · 静安区门店</div>
              </div>
              <span style="font-size:15px;font-weight:600;color:var(--md-error,#f2b8b5);">-¥38.00</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.metro}</div>
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
              <div class="md3-list-item-icon">${v.paid}</div>
              <div class="md3-list-item-text">
                <div>工资薪酬发放</div>
                <div class="md3-list-item-subtext">18:00 · 招商银行汇入</div>
              </div>
              <span style="font-size:15px;font-weight:600;color:var(--md-success,#a8f5bb);">+¥15,800.00</span>
            </div>
          </div>
        </div>
      `}]},qy={id:"appstore",name:"应用商店",pages:[{title:"应用商店",content:`
        <div style="padding:16px 0;">
          <!-- MD3 搜索栏 -->
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:18px;border:1px solid var(--md-outline-variant);" onclick="pushSubPage(4)">
            <span style="font-size:18px;color:var(--md-on-surface-variant);">${v.search}</span>
            <span style="font-size:14px;color:var(--md-on-surface-variant);">搜索应用、游戏、专题...</span>
          </div>

          <!-- 精选大卡片 MD3 Elevated Hero Card -->
          <div class="md3-card md3-card-elevated" style="padding:0;overflow:hidden;margin-bottom:20px;cursor:pointer;" onclick="pushSubPage(1)">
            <div style="width:100%;height:160px;background:linear-gradient(135deg,hsl(var(--md-h,215) 75% 35%),hsl(var(--md-h,215) 85% 55%));display:flex;align-items:center;justify-content:center;font-size:52px;">
              ${v.launch}
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
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;">${v.check}</div>
              <div class="md3-list-item-text">
                <div>Things 3</div>
                <div class="md3-list-item-subtext">效率任务管理 · ¥68.00</div>
              </div>
              <button class="md3-btn md3-btn-filled" style="padding:6px 16px;font-size:12px;" onclick="__demoAction && __demoAction('获取')">获取</button>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(2)">
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#f093fb,#f5576c);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;">${v.photo_camera}</div>
              <div class="md3-list-item-text">
                <div>Darkroom</div>
                <div class="md3-list-item-subtext">专业图像后期 · 免费</div>
              </div>
              <button class="md3-btn md3-btn-filled" style="padding:6px 16px;font-size:12px;" onclick="__demoAction && __demoAction('获取')">获取</button>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(3)">
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#43e97b,#38f9d7);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;">${v.forest}</div>
              <div class="md3-list-item-text">
                <div>Forest</div>
                <div class="md3-list-item-subtext">专注森林番茄钟 · ¥12.00</div>
              </div>
              <button class="md3-btn md3-btn-filled" style="padding:6px 16px;font-size:12px;" onclick="__demoAction && __demoAction('获取')">获取</button>
            </div>
          </div>
        </div>
      `},{title:"Things 3",content:`
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="text-align:center;padding:24px 20px;">
            <div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#667eea,#764ba2);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#fff;box-shadow:var(--md-shadow-2);">${v.check}</div>
            <div style="font-size:20px;font-weight:600;color:var(--md-on-surface);">Things 3</div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-top:2px;">Cultured Code · 效率必备</div>
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;" onclick="__demoAction && __demoAction('购买安装')">¥68.00 购买安装</button>
          </div>
          <div class="md3-card" style="margin-top:16px;">
            <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:8px;">应用简介</div>
            <p style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">Things 是屡获殊荣的任务管理器。以优美直观的 Material 表达性语言呈现，让你轻松规划每一天、管理大型项目并专注达成目标。</p>
          </div>
        </div>
      `},{title:"Darkroom",content:`
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="text-align:center;padding:24px 20px;">
            <div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#f093fb,#f5576c);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#fff;box-shadow:var(--md-shadow-2);">${v.photo_camera}</div>
            <div style="font-size:20px;font-weight:600;color:var(--md-on-surface);">Darkroom</div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-top:2px;">Bergen · 摄影与色彩</div>
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;" onclick="__demoAction && __demoAction('免费下载')">免费下载</button>
          </div>
        </div>
      `},{title:"Forest",content:`
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="text-align:center;padding:24px 20px;">
            <div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#43e97b,#38f9d7);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#fff;box-shadow:var(--md-shadow-2);">${v.forest}</div>
            <div style="font-size:20px;font-weight:600;color:var(--md-on-surface);">Forest</div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-top:2px;">Seekrtech · 专注森林</div>
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;" onclick="__demoAction && __demoAction('购买')">¥12.00 购买</button>
          </div>
        </div>
      `},{title:"搜索",content:`
        <div style="padding:16px 0;">
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:18px;border:1px solid var(--md-outline-variant);">
            <span style="font-size:18px;color:var(--md-primary);">${v.search}</span>
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
      `}]},jy={id:"stocks",name:"股票",pages:[{title:"股票",content:de("apps/stocks/index.html")}]},Vy={id:"shortcuts",name:"快捷指令",pages:[{title:"快捷指令",content:de("apps/shortcuts/index.html")}]},Wy={id:"threes",name:"小三传奇",pages:[{title:"小三传奇 Pro",content:de("apps/threes/index.html")}]},Yy={id:"dice",name:"掷骰子",pages:[{title:"DICE LAB",content:de("apps/dice/index.html")}]},Gy={id:"flow11",name:"Flow 11",bgColor:"#2E383F",pages:[{title:"Flow 11",content:de("apps/flow11/index.html")}]},Xy={id:"safari",name:"浏览器",pages:[{title:"浏览器",content:de("apps/safari/index.html")}]},Uy={id:"phone",name:"电话",pages:[{title:"电话",content:de("apps/phone/index.html")}]},Ky={id:"facetime",name:"FaceTime",pages:[{title:"FaceTime 通话",content:`
        <div style="padding:16px 0;">
          <!-- 快捷操作按钮组 MD3 Buttons Row -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
            <button class="md3-btn md3-btn-filled" style="padding:14px;border-radius:var(--md-r-lg);" onclick="__demoAction && __demoAction('发起视频')">
              <span style="font-size:18px;">${v.videocam}</span>
              <span>发起视频</span>
            </button>
            <button class="md3-btn md3-btn-tonal" style="padding:14px;border-radius:var(--md-r-lg);" onclick="__demoAction && __demoAction('创建链接')">
              <span style="font-size:18px;">${v.link}</span>
              <span>创建链接</span>
            </button>
          </div>

          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">最近通话记录</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div style="width:40px;height:40px;border-radius:50%;background:hsl(var(--md-h,215) 60% 40%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;">张</div>
              <div class="md3-list-item-text">
                <div>张明</div>
                <div class="md3-list-item-subtext">${v.videocam} 传入视频 · 18 分钟前</div>
              </div>
              <button class="icon-btn" style="color:var(--md-primary);" aria-label="回拨">${v.call}</button>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div style="width:40px;height:40px;border-radius:50%;background:hsl(calc(var(--md-h,215) + 60) 60% 40%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;">李</div>
              <div class="md3-list-item-text">
                <div>李华</div>
                <div class="md3-list-item-subtext">${v.mic} 语音通话 · 昨天 20:15</div>
              </div>
              <button class="icon-btn" style="color:var(--md-primary);" aria-label="回拨">${v.call}</button>
            </div>
          </div>
        </div>
      `}]},Qy={id:"contacts",name:"通讯录",pages:[{title:"通讯录",content:de("apps/contacts/index.html")}]},Jy={id:"findmy",name:"查找",pages:[{title:"查找设备",content:`
        <div style="padding:16px 0;">
          <!-- 模拟雷达扫描地图卡片 MD3 Card -->
          <div class="md3-card md3-card-elevated" style="height:180px;padding:0;overflow:hidden;position:relative;margin-bottom:16px;background:linear-gradient(135deg,#0a192f,#020c1b);border:1px solid var(--md-outline-variant);display:flex;align-items:center;justify-content:center;">
            <div style="width:120px;height:120px;border-radius:50%;border:1px solid hsla(var(--md-h,215),80%,60%,0.3);display:flex;align-items:center;justify-content:center;">
              <div style="width:60px;height:60px;border-radius:50%;border:1px solid hsla(var(--md-h,215),80%,60%,0.5);display:flex;align-items:center;justify-content:center;">
                <div style="width:10px;height:10px;border-radius:50%;background:var(--md-accent,#80d8ff);box-shadow:0 0 10px #80d8ff;"></div>
              </div>
            </div>
            <div style="position:absolute;bottom:10px;left:14px;font-size:11px;color:var(--md-on-surface-variant);">定位网络已连接 · 2 台在线 · 1 台在附近</div>
          </div>

          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">我的设备</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.smartphone}</div>
              <div class="md3-list-item-text">
                <div>Pixel 9 Pro / 当前设备</div>
                <div class="md3-list-item-subtext" id="findmyThisDeviceBattery">在此设备上 · 电量 87%</div>
              </div>
              <span style="color:var(--md-success);font-size:12px;font-weight:600;">在线</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.laptop}</div>
              <div class="md3-list-item-text">
                <div>MacBook Pro (M3)</div>
                <div class="md3-list-item-subtext">家 · 刚刚活跃</div>
              </div>
              <span style="color:var(--md-success);font-size:12px;font-weight:600;">在线</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${v.headphones}</div>
              <div class="md3-list-item-text">
                <div>Pixel Buds Pro</div>
                <div class="md3-list-item-subtext">随身背包中 · 充电盒 92%</div>
              </div>
              <span style="color:var(--md-on-surface-variant);font-size:12px;">附近</span>
            </div>
          </div>
        </div>
      `}]};ud(e=>{const t=document.getElementById("findmyThisDeviceBattery");!t||!t.isConnected||(t.textContent=e.charging?`在此设备上 · 电量 ${e.level}%（充电中）`:`在此设备上 · 电量 ${e.level}%`)});const Zy={id:"translate",name:"翻译",pages:[{title:"翻译",content:de("apps/translate/index.html")}]},e2={id:"game2048",name:"2048 接龙",pages:[{title:"2048 纸牌接龙",content:de("apps/game2048/index.html")}]},t2={id:"books",name:"图书",pages:[{title:"图书",content:de("apps/books/index.html")}]};var i2={home:'<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/>',sparkle:'<path d="M12 4l1.7 4.6L18 10l-4.3 1.4L12 16l-1.7-4.6L6 10l4.3-1.4z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',browse:'<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2.5h6A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17z"/>',folder:'<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2.5h6A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17z"/>',image:'<rect x="4" y="5" width="16" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4.5 17l4.5-4.5 3 3 3.5-3.5 4 4"/>',video:'<rect x="3.5" y="6" width="17" height="12" rx="3"/><path d="M10.5 9.8l4.2 2.2-4.2 2.2z"/>',audio:'<path d="M9 17.5V6.8l9-1.8v10.5"/><circle cx="7" cy="17.5" r="2"/><circle cx="16" cy="15.5" r="2"/>',doc:'<path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5z"/><path d="M14 3.5V8h4"/><path d="M9 12.5h6M9 16h6"/>',zip:'<rect x="5" y="4" width="14" height="16" rx="2.5"/><path d="M12 4v3M12 9v2M12 13v2"/><path d="M10 18.5h4"/>',apk:'<rect x="5" y="6" width="14" height="14" rx="3"/><path d="M12 10v5M9.8 12.2L12 10l2.2 2.2"/><path d="M8.5 6l-1.5-2.5M15.5 6l1.5-2.5"/>',file:'<path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5z"/><path d="M14 3.5V8h4"/>',back:'<path d="M14.5 5.5L8 12l6.5 6.5"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',add:'<path d="M12 5v14M5 12h14"/>',morev:'<circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/>',listv:'<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"/><circle cx="4.5" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="17.5" r="1" fill="currentColor" stroke="none"/>',gridv:'<rect x="4.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="4.5" y="13.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="13.5" width="6" height="6" rx="1.5"/>',sort:'<path d="M7 5v14M7 19l-2.8-2.8M7 19l2.8-2.8"/><path d="M17 19V5M17 5l-2.8 2.8M17 5l2.8 2.8"/>',share:'<circle cx="6.5" cy="12" r="2.2"/><circle cx="17" cy="6" r="2.2"/><circle cx="17" cy="18" r="2.2"/><path d="M8.5 10.9l6.2-3.7M8.5 13.1l6.2 3.7"/>',download:'<path d="M12 4v10M12 14l-3.6-3.6M12 14l3.6-3.6"/><path d="M5 19.5h14"/>',copy:'<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M5.5 14.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/>',move:'<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2.5h6A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17z"/><path d="M10 14h5M13 11.8l2.2 2.2-2.2 2.2"/>',edit:'<path d="M4 20l4.2-.9L19.4 7.9a1.6 1.6 0 0 0 0-2.3l-1-1a1.6 1.6 0 0 0-2.3 0L4.9 15.8z"/><path d="M14.5 6.5l3 3"/>',trash:'<path d="M5 7h14M10 7V5.2A1.2 1.2 0 0 1 11.2 4h1.6A1.2 1.2 0 0 1 14 5.2V7M6.5 7l.8 11.6A1.7 1.7 0 0 0 9 20.2h6a1.7 1.7 0 0 0 1.7-1.6L17.5 7"/><path d="M10.2 11v5.5M13.8 11v5.5"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',selall:'<rect x="4.5" y="4.5" width="15" height="15" rx="3.5"/><path d="M8.5 12.2l2.6 2.6 4.9-5"/>',info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none"/>',search:'<circle cx="11" cy="11" r="6.5"/><path d="M19.5 19.5L15 15"/>'};function me(e,t){return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'+(t?' style="'+t+'"':"")+">"+(i2[e]||"")+"</svg>"}typeof window<"u"&&(window.__fjIc=me);const n2={id:"files",name:"文件",pages:[{title:"文件",content:`
        <div class="fj-app" id="fjApp">
          <!-- 平板模式左侧导航栏 -->
          <aside class="fj-rail">
            <div class="fj-rail-logo"><span class="lg">${me("folder")}</span><span>文件</span></div>
            <button class="fj-ritem" data-tab="0">${me("home")}<span>首页</span></button>
            <button class="fj-ritem" data-tab="1">${me("sparkle")}<span>清理</span></button>
            <button class="fj-ritem" data-tab="2">${me("browse")}<span>浏览</span></button>
            <div class="fj-rail-storage" id="fjRailStorage"></div>
          </aside>

          <div class="fj-main">
            <div class="fj-top">
              <div class="fj-title" id="fjTitle">文件</div>
              <button class="fj-ibtn" id="fjBtnSort" title="排序与视图">${me("sort")}</button>
            </div>

            <div class="fj-screens">
              <section class="fj-screen on" id="fjHome"></section>
              <section class="fj-screen" id="fjClean"></section>
              <section class="fj-screen" id="fjBrowse"></section>

              <!-- 目录/分类下钻子页 -->
              <div class="fj-sub" id="fjSub">
                <div class="fj-subtop">
                  <button class="fj-ibtn" id="fjSubBack">${me("back")}</button>
                  <div class="fj-subtitle" id="fjSubTitle">文件夹</div>
                </div>
                <div class="fj-subbody" id="fjSubBody"></div>
              </div>

              <!-- 多选操作条 -->
              <div class="fj-seltop" id="fjSelTop">
                <button class="fj-ibtn" id="fjSelClose" style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:none;">${me("close")}</button>
                <div class="cnt"><div class="a" id="fjSelCount">已选择 0 项</div><div class="b" id="fjSelHint"></div></div>
                <button class="fj-ibtn" id="fjSelAll" style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:none;">${me("selall")}</button>
                <button class="fj-ibtn" id="fjSelMore" style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:none;">${me("morev")}</button>
              </div>
            </div>

            <button class="fj-fab" id="fjFab" aria-label="新建">${me("add")}</button>

            <nav class="fj-navbar" id="fjNavbar">
              <div id="fjNavPill"></div>
              <button class="fj-nitem on" data-tab="0"><span class="nico">${me("home")}</span><span class="nl">首页</span></button>
              <button class="fj-nitem" data-tab="1"><span class="nico">${me("sparkle")}</span><span class="nl">清理</span></button>
              <button class="fj-nitem" data-tab="2"><span class="nico">${me("browse")}</span><span class="nl">浏览</span></button>
            </nav>

            <div class="fj-selbot" id="fjSelBot">
              <button class="fj-btn danger" id="fjSelDel" style="width:100%;">${me("trash")}删除所选</button>
            </div>
          </div>

          <!-- 底部抽屉 -->
          <div class="fj-sheetwrap" id="fjSheetWrap">
            <div class="fj-mscrim" data-sheet-close></div>
            <div class="fj-sheet" id="fjSheet"></div>
          </div>

          <!-- 对话框 -->
          <div class="fj-dialog" id="fjDialog">
            <div class="fj-dbk" data-dialog-close></div>
            <div class="fj-dbox">
              <div class="fj-dt" id="fjDlgTitle"></div>
              <div class="fj-db" id="fjDlgMsg" style="display:none;"></div>
              <input class="fj-din" id="fjDlgInput" spellcheck="false" style="display:none;" />
              <div class="fj-dact">
                <button class="fj-btn" id="fjDlgCancel">取消</button>
                <button class="fj-btn" id="fjDlgOk">确定</button>
              </div>
            </div>
          </div>

          <!-- 预览 -->
          <div class="fj-preview" id="fjPreview">
            <div class="fj-pvtop">
              <button class="fj-ibtn" id="fjPvClose">${me("back")}</button>
              <div class="fj-pvname" id="fjPvName"></div>
              <button class="fj-ibtn" id="fjPvShare" title="分享">${me("share")}</button>
              <button class="fj-ibtn" id="fjPvDl" title="导出到电脑">${me("download")}</button>
            </div>
            <div class="fj-pvbody" id="fjPvBody"></div>
          </div>

          <!-- Snackbar -->
          <div class="fj-snack" id="fjSnack"></div>

          <input type="file" id="fjFileInput" multiple style="display:none;" />
        </div>

        <script>
          (function() {
            'use strict';
            var V = function() { return window.__vfs || null; };
            var CB = function() { return window.__clipboard || null; };
            var $ = function(id) { return document.getElementById(id); };

            var app = $('fjApp'), homeEl = $('fjHome'), cleanEl = $('fjClean'), browseEl = $('fjBrowse');
            var subEl = $('fjSub'), subBody = $('fjSubBody'), subTitle = $('fjSubTitle');
            var sheetWrap = $('fjSheetWrap'), sheetEl = $('fjSheet');
            var dlgEl = $('fjDialog'), dlgTitle = $('fjDlgTitle'), dlgMsg = $('fjDlgMsg'), dlgInput = $('fjDlgInput');
            var snackEl = $('fjSnack');
            var pvEl = $('fjPreview'), pvBody = $('fjPvBody'), pvName = $('fjPvName');
            var selTop = $('fjSelTop'), selBot = $('fjSelBot');
            var fab = $('fjFab'), navPill = $('fjNavPill'), navbar = $('fjNavbar');
            var fileInput = $('fjFileInput');

            // 文档监听登记（实例销毁自动退订）/ 清理登记 —— 全脚本多处使用，前置定义
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var addCleanup = window.__addAppCleanup || function() {};

            // ==================== 状态 ====================
            var S = {
              tab: 0,
              view: 'list',          // list | grid
              sort: 'date',          // date | name | size
              selMode: false,
              sel: new Set(),        // 选中 path 集合
              sub: null,             // { kind:'dir', dir } | { kind:'cat', key }
              visible: false,
              filter: '',            // v7.66 浏览页实时过滤关键字
              cache: { t: 0, files: null },
            };
            var currentPreviewPath = null;
            var lastErrPath = null;

            // ==================== 基础工具 ====================
            function esc(s) {
              return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            }
            function fmtBytes(b) {
              try { if (window.__storageStats) return window.__storageStats.formatBytes(b); } catch (e) {}
              if (!b || b < 0) return '0 B';
              if (b < 1024) return b + ' B';
              if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
              if (b < 1073741824) return (b / 1048576).toFixed(2) + ' MB';
              return (b / 1073741824).toFixed(2) + ' GB';
            }
            function fmtTime(ts) {
              try { return new Date(ts || Date.now()).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
            }
            function parentOf(p) { var i = p.lastIndexOf('/'); return i <= 0 ? '/' : p.slice(0, i); }
            function baseName(p) { return p.slice(p.lastIndexOf('/') + 1); }
            function validName(name) {
              if (!name || name === '.' || name === '..' || name.indexOf('/') !== -1) return null;
              return name;
            }
            function snack(msg, icn) {
              snackEl.innerHTML = ic(icn || 'check') + '<span>' + esc(msg) + '</span>';
              snackEl.classList.add('on');
              clearTimeout(snackEl._t);
              snackEl._t = setTimeout(function() { snackEl.classList.remove('on'); }, 2600);
            }

            // ==================== VFS 数据层 ====================
            function flatFiles() {
              // 全库扁平文件清单（带 300ms 缓存；VFS 订阅会主动失效）
              var now = Date.now();
              if (S.cache.files && now - S.cache.t < 300) return S.cache.files;
              var out = [];
              function rec(dir) {
                var list;
                try { list = V().list(dir) || []; } catch (e) { return; }
                for (var i = 0; i < list.length; i++) {
                  var e = list[i];
                  if (e.type === 'dir') rec(e.path);
                  else out.push(e);
                }
              }
              if (V()) { try { rec('/'); } catch (e) {} }
              S.cache.t = now;
              S.cache.files = out;
              return out;
            }
            function usageSafe() {
              try { return V().usage(); } catch (e) { return null; }
            }
            var CATS = [
              { key: 'image', label: '图片', exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic'], mime: 'image/', color: '#8ab4f8', icon: 'image' },
              { key: 'video', label: '视频', exts: ['mp4', 'mov', 'webm', 'avi', 'mkv'], mime: 'video/', color: '#f28b82', icon: 'video' },
              { key: 'audio', label: '音频', exts: ['mp3', 'wav', 'ogg', 'flac', 'm4a'], mime: 'audio/', color: '#81c995', icon: 'audio' },
              { key: 'doc', label: '文档', exts: ['txt', 'md', 'json', 'pdf', 'doc', 'docx', 'html', 'csv'], mime: 'text/', color: '#fdd663', icon: 'doc' },
              { key: 'zip', label: '压缩包', exts: ['zip', 'tar', 'gz', 'rar', '7z'], mime: 'application/zip', color: '#b39ddb', icon: 'zip' },
              { key: 'apk', label: '安装包', exts: ['apk'], mime: 'application/vnd.android.package-archive', color: '#5c6bc0', icon: 'apk' },
            ];
            function extOf(name) {
              var dot = name.lastIndexOf('.');
              return dot > -1 ? name.slice(dot + 1).toLowerCase() : '';
            }
            function catOf(entry) {
              var m = entry.mime || '', ext = extOf(entry.name || '');
              for (var i = 0; i < CATS.length; i++) {
                var c = CATS[i];
                if (c.mime && m.indexOf(c.mime) === 0) return c;
                if (c.exts.indexOf(ext) !== -1) return c;
              }
              return null;
            }
            function filesOfCat(key) {
              var cat = null;
              for (var i = 0; i < CATS.length; i++) if (CATS[i].key === key) cat = CATS[i];
              if (!cat) return [];
              return flatFiles().filter(function(e) {
                var m = e.mime || '', ext = extOf(e.name || '');
                return (cat.mime && m.indexOf(cat.mime) === 0) || cat.exts.indexOf(ext) !== -1;
              });
            }
            function sorted(list) {
              var arr = list.slice();
              if (S.sort === 'name') arr.sort(function(a, b) { return (a.name || '').localeCompare(b.name || '', 'zh-CN'); });
              else if (S.sort === 'size') arr.sort(function(a, b) { return (b.size || 0) - (a.size || 0); });
              else arr.sort(function(a, b) { return (b.modified || 0) - (a.modified || 0); });
              return arr;
            }
            function listDir(dir) {
              var entries;
              try { entries = V().list(dir) || []; } catch (e) { entries = []; }
              var dirs = [], files = [];
              for (var i = 0; i < entries.length; i++) (entries[i].type === 'dir' ? dirs : files).push(entries[i]);
              return { dirs: sorted(dirs), files: sorted(files) };
            }

            // ==================== v7.66 清理数据层（真实扫描，无演示数据） ====================
            // 累计已释放字节（清理页删除成功后累加，跨会话持久）
            function freedTotal() { try { return +localStorage.getItem('files_clean_freed_total') || 0; } catch (e) { return 0; } }
            function bumpFreed(n) {
              if (!n || n < 0) return;
              try { localStorage.setItem('files_clean_freed_total', String(freedTotal() + n)); } catch (e) {}
            }
            // 垃圾扫描：① 重复文件（同名同体积分组，保留最新一份，其余计冗余）
            // ② 空文件夹（递归扫描无子项目录，根目录不计） ③ 30 天未动文件
            function scanJunk() {
              var files = flatFiles().filter(function(e) { return e.type === 'file'; });
              var groups = {};
              files.forEach(function(e) {
                var k = (e.name || '') + '|' + (e.size || 0);
                (groups[k] = groups[k] || []).push(e);
              });
              var dupRedundant = [], dupGroups = 0;
              Object.keys(groups).forEach(function(k) {
                var g = groups[k];
                if (g.length < 2) return;
                g.sort(function(a, b) { return (b.modified || 0) - (a.modified || 0); });
                dupGroups++;
                for (var i = 1; i < g.length; i++) dupRedundant.push(g[i]);
              });
              dupRedundant.sort(function(a, b) { return (b.size || 0) - (a.size || 0); });
              var emptyDirs = [];
              (function recEmpty(dir) {
                var list;
                try { list = V().list(dir) || []; } catch (e) { return; }
                if (!list.length) { if (dir !== '/') emptyDirs.push(dir); return; }
                for (var i = 0; i < list.length; i++) if (list[i].type === 'dir') recEmpty(list[i].path);
              })('/');
              var cutoff = Date.now() - 30 * 86400000;
              var stale = files.filter(function(e) { return (e.modified || 0) > 0 && (e.modified || 0) < cutoff; })
                .sort(function(a, b) { return (a.modified || 0) - (b.modified || 0); });
              var reclaim = 0;
              dupRedundant.forEach(function(e) { reclaim += e.size || 0; });
              return { dupRedundant: dupRedundant, dupGroups: dupGroups, emptyDirs: emptyDirs, stale: stale, reclaim: reclaim };
            }

            // 图标集已提升至模块顶层（模板 ${me()} 需在模块求值期渲染）；内联脚本经 window 桥取用
            var ic = function(n, st) { return window.__fjIc(n, st); };
            function iconForEntry(entry) {
              if (entry.type === 'dir') return 'folder';
              var cat = catOf(entry);
              if (cat) return cat.icon;
              return 'file';
            }
            function colorForEntry(entry) {
              if (entry.type === 'dir') return 'hsl(45 90% 58%)';
              var cat = catOf(entry);
              return cat ? cat.color : 'var(--md-on-surface-variant)';
            }

            // ==================== 对话框 / 抽屉 ====================
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
              $('fjDlgOk').className = 'fj-btn' + (opts.danger ? ' danger' : '');
              dlgEl.classList.add('on');
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
              dlgEl.classList.remove('on');
              if (dlgResolve) { dlgResolve(val); dlgResolve = null; }
            }
            $('fjDlgOk').onclick = function() { closeDialog(dlgInput.style.display !== 'none' ? dlgInput.value.trim() : true); };
            $('fjDlgCancel').onclick = function() { closeDialog(null); };
            dlgInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') closeDialog(dlgInput.value.trim()); });

            function openSheet(html) {
              sheetEl.innerHTML = '<div class="grab"></div>' + html;
              sheetWrap.classList.add('on');
            }
            function closeSheet() { sheetWrap.classList.remove('on'); }

            // ==================== Tab 切换 ====================
            var SCREEN_IDS = ['fjHome', 'fjClean', 'fjBrowse'];
            function syncScreens() {
              // v7.66 存量 bug 修复：v7.51 重制以来 switchTab 只切导航高亮（pill/侧栏），
              // 从未切换 .fj-screen.on 显隐 —— 点「清理/浏览」视觉上永远停在首页
              //（用户主诉「只做了首页」的真相）。此处按 S.tab 同步三个 screen。
              app.querySelectorAll('.fj-screen').forEach(function(sc) {
                sc.classList.toggle('on', sc.id === SCREEN_IDS[S.tab]);
              });
            }
            function switchTab(i) {
              if (S.tab === i) return;
              S.tab = i;
              exitSel();
              syncScreens();
              renderTabs();
              renderAll();
            }
            function renderTabs() {
              var w = navbar.clientWidth || 1;
              var itemW = w / 3;
              navPill.style.width = (itemW - 24) + 'px';
              navPill.style.transform = 'translateX(' + (S.tab * itemW + 12) + 'px)';
              navbar.querySelectorAll('.fj-nitem').forEach(function(b) {
                b.classList.toggle('on', +b.dataset.tab === S.tab);
              });
              app.querySelectorAll('.fj-ritem').forEach(function(b) {
                b.classList.toggle('on', +b.dataset.tab === S.tab);
              });
            }

            // ==================== 渲染：行组件 ====================
            function selboxHtml(path) {
              var on = S.sel.has(path);
              return '<span class="fj-selbox' + (on ? ' on' : '') + '" data-selbox="' + esc(path) + '">' + ic('check') + '</span>';
            }
            function rowHtml(entry, opts) {
              opts = opts || {};
              var meta = entry.type === 'dir'
                ? ((entry.meta && entry.meta.hint) || '')
                : (fmtBytes(entry.size) + ' · ' + fmtTime(entry.modified));
              var thumb = '';
              if (entry.type === 'file' && (entry.mime || '').indexOf('image/') === 0) {
                thumb = '<img data-thumb="' + esc(entry.path) + '" alt="" />';
              }
              var selbox = (S.selMode && opts.selectable !== false) ? selboxHtml(entry.path) : '';
              return '<div class="fj-row fj-rpl' + (S.sel.has(entry.path) ? ' seld' : '') + '" data-path="' + esc(entry.path) + '" data-type="' + entry.type + '" role="button" tabindex="0">'
                + selbox
                + '<span class="th" style="color:' + colorForEntry(entry) + ';">' + thumb + ic(iconForEntry(entry)) + '</span>'
                + '<span class="tx"><span class="t">' + esc(entry.name) + '</span><span class="s">' + esc(meta) + '</span></span>'
                + (S.selMode
                  ? '<span class="end"></span>'
                  : (entry.type === 'file'
                    ? '<button class="fj-act" data-act="more" data-path="' + esc(entry.path) + '">' + ic('morev') + '</button>'
                    : '<span class="end">' + ic('back', 'transform:rotate(180deg);width:16px;height:16px;') + '</span>'))
                + '</div>';
            }
            function gridItemHtml(entry) {
              var thumb = '';
              if ((entry.mime || '').indexOf('image/') === 0) thumb = '<img data-thumb="' + esc(entry.path) + '" alt="" />';
              else thumb = '<span class="gi-ic">' + ic(iconForEntry(entry)) + '</span>';
              var selbox = S.selMode ? selboxHtml(entry.path) : '';
              return '<div class="fj-gitem' + (S.sel.has(entry.path) ? ' seld' : '') + '" data-path="' + esc(entry.path) + '" data-type="' + entry.type + '" role="button" tabindex="0">'
                + selbox + thumb
                + '<span class="gl">' + esc(entry.name) + '</span>'
                + '</div>';
            }
            function fillThumbs(scope) {
              // 图片缩略图懒填充（readURL 异步）
              scope.querySelectorAll('img[data-thumb]:not([data-loaded])').forEach(function(img) {
                img.dataset.loaded = '1';
                var p = img.getAttribute('data-thumb');
                V() && V().readURL(p).then(function(url) {
                  if (url && img.isConnected) img.src = url;
                  else if (img.isConnected) img.remove(); // 无缩略图回落到类型图标
                });
              });
            }
            function emptyHtml(iconName, t, s) {
              return '<div class="fj-empty"><div class="ci">' + ic(iconName) + '</div><div class="t">' + esc(t) + '</div><div class="s">' + esc(s) + '</div></div>';
            }

            // ==================== 渲染：三个标签 ====================
            function storageCardHtml() {
              var u = usageSafe();
              var used = u ? u.bytes : 0;
              // 进度条按真实 top-dir 占比分段（VFS usage 无 quota 上限刻度，
              // 不伪造百分比刻度 —— 段宽 = 该目录字节 / 全库已用）
              var segs = '';
              var topBits = '';
              var hues = ['hsl(var(--md-h,215) 80% 60%)', 'hsl(calc(var(--md-h,215) + 40) 70% 58%)', 'hsl(calc(var(--md-h,215) - 40) 70% 55%)', 'hsl(var(--md-h,215) 30% 55%)'];
              if (u && u.byDir && u.byDir.length && used > 0) {
                for (var i = 0; i < u.byDir.length && i < 4; i++) {
                  var w = Math.round(u.byDir[i].bytes / used * 100);
                  if (w <= 0) continue;
                  segs += '<i style="flex:' + w + ' 1 0;background:' + hues[i % hues.length] + ';"></i>';
                  topBits += '<span><span class="dot" style="background:' + hues[i % hues.length] + ';"></span>' + esc(u.byDir[i].dir === '/' ? '根目录' : u.byDir[i].dir.slice(1)) + ' ' + fmtBytes(u.byDir[i].bytes) + '</span>';
                }
              }
              if (!segs) segs = '<i style="flex:1 1 0;opacity:.25;"></i>';
              return '<div class="fj-storecard">'
                + '<div class="fj-stop">' + ic('browse') + '<span><span class="tt">内部存储</span><br/><span class="ss">' + (u ? u.files + ' 个文件 · ' + u.dirs + ' 个目录' : '统计中…') + '</span></span></div>'
                + '<div class="pbar">' + segs + '</div>'
                + '<div class="fj-sbot"><span><span class="dot" style="background:hsl(var(--md-h,215) 80% 60%);"></span>已用 ' + fmtBytes(used) + '</span>' + topBits + '</div>'
                + '</div>';
            }

            function renderHome() {
              var cats = CATS.map(function(c) {
                var files = filesOfCat(c.key);
                var bytes = 0;
                for (var i = 0; i < files.length; i++) bytes += files[i].size || 0;
                return '<button class="fj-ccard fj-rpl" data-cat="' + c.key + '">'
                  + '<span class="ci" style="background:' + c.color + '28;color:' + c.color + ';">' + ic(c.icon) + '</span>'
                  + '<span><span class="tt">' + c.label + '</span><br/><span class="ss">' + files.length + ' 项 · ' + fmtBytes(bytes) + '</span></span>'
                  + '</button>';
              }).join('');
              var recent = sorted(flatFiles()).slice(0, 8);
              var recentHtml = recent.length
                ? '<div class="fj-vlist">' + recent.map(function(e) { return rowHtml(e, { selectable: false }); }).join('') + '</div>'
                : emptyHtml('browse', '还没有文件', '点击右下角 + 新建，或把电脑里的文件导入进来');
              homeEl.innerHTML = storageCardHtml()
                + '<div class="fj-sechead"><span class="h">分类</span></div>'
                + '<div class="fj-cgrid">' + cats + '</div>'
                + '<div class="fj-sechead"><span class="h">最近文件</span><span class="x" data-goto-browse style="cursor:pointer;">查看全部 ›</span></div>'
                + recentHtml;
              fillThumbs(homeEl);
              renderRailStorage();
            }

            function renderRailStorage() {
              var rail = app.querySelector('.fj-rail-storage');
              if (!rail || !rail.isConnected) return;
              var u = usageSafe();
              rail.innerHTML = '<div>内部存储</div><div class="pbar"><i style="flex:1 1 0;opacity:.35;"></i></div><div>' + (u ? fmtBytes(u.bytes) + ' · ' + u.files + ' 个文件' : '—') + '</div>';
            }

            function renderClean() {
              var files = sorted(flatFiles()); // size desc
              var big = files.slice(0, 8);
              var imgs = filesOfCat('image');
              var junk = scanJunk();

              // v7.66 清理页勾选行（data-clean 独立勾选流，同旧大文件卡；checked 预勾选）
              function junkRowHtml(entry, opts) {
                opts = opts || {};
                var sub = opts.sub != null ? opts.sub : (fmtBytes(entry.size) + ' · ' + fmtTime(entry.modified));
                return '<div class="fj-row fj-rpl" data-path="' + esc(entry.path) + '" data-type="' + esc(entry.type || 'file') + '" data-clean="1" role="button" tabindex="0">'
                  + '<span class="fj-selbox' + (opts.checked ? ' on' : '') + '" data-selbox="' + esc(entry.path) + '">' + ic('check') + '</span>'
                  + '<span class="th" style="color:' + colorForEntry(entry) + ';">' + ic(iconForEntry(entry)) + '</span>'
                  + '<span class="tx"><span class="t">' + esc(entry.name || baseName(entry.path)) + '</span><span class="s">' + esc(sub) + '</span></span>'
                  + '<span class="end">' + (entry.type === 'dir' ? '' : fmtBytes(entry.size)) + '</span>'
                  + '</div>';
              }
              function cleanCard(id, title, desc, rowsHtml, emptyTip) {
                return '<div class="fj-kcard"' + (id ? ' id="' + id + '"' : '') + '>'
                  + '<div class="tt">' + title + '</div>'
                  + '<div class="ss">' + desc + '</div>'
                  + (rowsHtml
                    ? '<div class="fj-vlist" style="padding:8px 0 0;">' + rowsHtml + '</div>'
                      + '<div class="act"><button class="fj-btn danger fj-cleanbtn">' + ic('trash') + '删除所选</button></div>'
                    : '<div class="ss" style="margin-top:10px;">' + emptyTip + '</div>')
                  + '</div>';
              }

              // 大文件卡（v7.51 原有）
              var bigRows = big.map(function(e) { return junkRowHtml(e); }).join('');
              // v7.66 重复文件：同名同体积视为同一份内容的多余副本（保留最新，冗余预勾选）
              var dupRows = junk.dupRedundant.slice(0, 30).map(function(e) {
                return junkRowHtml(e, {
                  checked: true,
                  sub: '冗余副本 · ' + (parentOf(e.path) === '/' ? '内部存储' : parentOf(e.path)) + ' · ' + fmtTime(e.modified),
                });
              }).join('');
              // v7.66 空文件夹
              var emptyRows = junk.emptyDirs.slice(0, 30).map(function(d) {
                return junkRowHtml({ path: d, type: 'dir', name: baseName(d), size: 0 }, { sub: '空目录 · ' + (parentOf(d) === '/' ? '内部存储' : parentOf(d)) });
              }).join('');
              // v7.66 久未访问
              var staleRows = junk.stale.slice(0, 30).map(function(e) {
                return junkRowHtml(e, { sub: fmtBytes(e.size) + ' · ' + fmtTime(e.modified) });
              }).join('');
              var imgThumbs = imgs.slice(0, 12).map(function(e) {
                return '<div class="fj-gitem" data-cat-jump="image">' + '<img data-thumb="' + esc(e.path) + '" alt="" />' + '</div>';
              }).join('');

              // v7.66 可释放估算汇总卡（chips 点击滚动到对应卡片）
              var junkChips = [
                ['重复文件', junk.dupRedundant.length, 'fjCardDup', 'copy'],
                ['空文件夹', junk.emptyDirs.length, 'fjCardEmpty', 'folder'],
                ['30 天未动', junk.stale.length, 'fjCardStale', 'info'],
                ['大文件', big.length, 'fjCardBig', 'file'],
              ].map(function(c) {
                return '<button class="fj-chip' + (c[1] ? '' : ' dim') + '" data-jump="' + c[2] + '">' + ic(c[3]) + c[0] + ' · ' + c[1] + '</button>';
              }).join('');
              var sumCard = '<div class="fj-kcard">'
                + '<div class="tt">可释放约 ' + fmtBytes(junk.reclaim) + '</div>'
                + '<div class="ss">按重复文件冗余副本估算；勾选下方卡片中的项目并删除即可释放。累计已释放 ' + fmtBytes(freedTotal()) + '。</div>'
                + '<div class="fj-junkchips">' + junkChips + '</div>'
                + '</div>';

              cleanEl.innerHTML = storageCardHtml()
                + sumCard
                + cleanCard('fjCardBig', '大文件', '全库中占用空间最大的文件，勾选后一次性删除即可释放空间',
                  big.length ? bigRows : '', '文件很少，暂无可清理的大文件')
                + cleanCard('fjCardDup', '重复文件', junk.dupGroups
                  ? junk.dupGroups + ' 组同名同体积副本，已为您预选较旧的冗余份（保留每组最新一份）'
                  : '同名同体积的文件会被视为重复副本',
                  junk.dupRedundant.length ? dupRows : '', '未发现重复文件')
                + cleanCard('fjCardEmpty', '空文件夹', '不含任何文件或子文件夹的目录，可放心删除',
                  junk.emptyDirs.length ? emptyRows : '', '未发现空文件夹')
                + cleanCard('fjCardStale', '30 天未动', '超过 30 天没有修改过的文件，归档或删除前请再次确认',
                  junk.stale.length ? staleRows : '', '近 30 天的文件都很活跃')
                + '<div class="fj-kcard">'
                + '<div class="tt">图片</div>'
                + '<div class="ss">共 ' + imgs.length + ' 张 · ' + fmtBytes(imgs.reduce(function(a, e) { return a + (e.size || 0); }, 0)) + '</div>'
                + (imgThumbs ? '<div class="fj-gwrap" style="padding:12px 0 0;">' + imgThumbs + '</div>'
                  + '<div class="act"><button class="fj-btn" id="fjCleanImgAll">批量管理</button></div>' : '')
                + '</div>';
              fillThumbs(cleanEl);
              // v7.66：每张清理卡独立「删除所选」（按卡收集勾选目标，删除成功累计已释放）
              cleanEl.querySelectorAll('.fj-cleanbtn').forEach(function(btn) {
                btn.onclick = function() { deleteCleanSel(btn.closest('.fj-kcard')); };
              });
              var imgAll = $('fjCleanImgAll');
              if (imgAll) imgAll.onclick = function() { openCat('image'); };
            }

            // v7.66 清理卡按钮计数同步（点击/长按勾选后刷新所属卡的按钮文案）
            function syncCleanCardBtn(card) {
              if (!card) return;
              var n = card.querySelectorAll('.fj-selbox.on').length;
              var b = card.querySelector('.fj-cleanbtn');
              if (b) b.innerHTML = ic('trash') + '删除所选' + (n ? '（' + n + '）' : '');
            }
            // v7.66 清理页删除：按卡收集勾选目标（原 v7.53 collectCleanSel 泛化），
            // 删除成功后按实际释放字节累计 freedTotal 并 snack 反馈
            async function deleteCleanSel(cardEl) {
              var targets = [];
              (cardEl || cleanEl).querySelectorAll('.fj-selbox.on').forEach(function(b) {
                var row = b.closest('[data-path]');
                if (row && row.dataset.path) targets.push(row.dataset.path);
              });
              if (!targets.length) { snack('先勾选要删除的项目', 'info'); return; }
              var sizeMap = {};
              targets.forEach(function(p) { try { var st = V().stat(p); if (st) sizeMap[p] = st.size || 0; } catch (e) {} });
              var ok = await askDialog({ title: '删除', message: '确定删除所选 ' + targets.length + ' 项吗？\\n此操作不可撤销。', danger: true });
              if (!ok) return;
              var done = 0, freed = 0, fail = 0;
              for (var p of targets) {
                var r = await V().del(p);
                if (r && r.ok) { done++; freed += sizeMap[p] || 0; } else fail++;
              }
              bumpFreed(freed);
              refresh();
              if (done) snack('已释放 ' + fmtBytes(freed) + '（' + done + ' 项' + (fail ? '，失败 ' + fail + ' 项' : '') + '）', 'trash');
              else if (fail) snack('删除失败（存储可能不可用）', 'trash');
            }

            function chipsRow() {
              var sorts = [['date', '最近'], ['name', '名称'], ['size', '大小']];
              var chips = sorts.map(function(p) {
                return '<button class="fj-chip' + (S.sort === p[0] ? ' on' : '') + '" data-sort="' + p[0] + '">' + ic('sort') + p[1] + '</button>';
              }).join('');
              return '<div class="fj-chips">' + chips
                + '<button class="fj-chip' + (S.view === 'list' ? ' on' : '') + '" data-view="list">' + ic('listv') + '列表</button>'
                + '<button class="fj-chip' + (S.view === 'grid' ? ' on' : '') + '" data-view="grid">' + ic('gridv') + '网格</button>'
                + '</div>';
            }
            function renderBrowse() {
              // v7.66 浏览页丰富：存储概览 + 分类集合网格 + 实时过滤 + 目录列表。
              // 列表区独立容器（fjBrowseList）——排序/视图切换、过滤输入只重建列表区，
              // 不再整页重渲染（保留输入焦点与滚动位置）。
              if (!V()) {
                browseEl.innerHTML = emptyHtml('browse', '存储未就绪', '虚拟存储初始化失败 —— 请刷新页面重试');
                return;
              }
              var collections = CATS.map(function(c) {
                var fs = filesOfCat(c.key), bytes = 0;
                for (var i = 0; i < fs.length; i++) bytes += fs[i].size || 0;
                return '<button class="fj-ccard fj-rpl" data-cat="' + c.key + '">'
                  + '<span class="ci" style="background:' + c.color + '28;color:' + c.color + ';">' + ic(c.icon) + '</span>'
                  + '<span><span class="tt">' + c.label + '</span><br/><span class="ss">' + fs.length + ' 项 · ' + fmtBytes(bytes) + '</span></span>'
                  + '</button>';
              }).join('');
              browseEl.innerHTML = storageCardHtml()
                + '<div class="fj-sechead"><span class="h">集合</span></div>'
                + '<div class="fj-cgrid">' + collections + '</div>'
                + '<div class="fj-sechead"><span class="h">内部存储</span></div>'
                + '<div class="fj-bsearchbar"><span class="bsi">' + ic('search') + '</span>'
                + '<input id="fjBSearch" type="text" placeholder="搜索当前目录或全库…" value="' + esc(S.filter) + '" />'
                + '<button class="fj-bclear' + (S.filter ? ' on' : '') + '" id="fjBClear" title="清除">' + ic('close') + '</button>'
                + '</div>'
                + '<div id="fjBrowseList"></div>';
              var inp = $('fjBSearch');
              if (inp) {
                inp.addEventListener('input', function() {
                  S.filter = inp.value.trim();
                  var clr = $('fjBClear');
                  if (clr) clr.classList.toggle('on', !!S.filter);
                  renderBrowseList();
                });
              }
              var clrBtn = $('fjBClear');
              if (clrBtn) clrBtn.onclick = function() {
                S.filter = '';
                if (inp) inp.value = '';
                clrBtn.classList.remove('on');
                renderBrowseList();
                if (inp) inp.focus();
              };
              renderBrowseList();
              fillThumbs(browseEl);
            }

            // v7.66 浏览页列表区（排序/视图/过滤变化时局部重建）
            function renderBrowseList() {
              var host = $('fjBrowseList');
              if (!host) return; // 尚未渲染浏览页骨架
              var q = (S.filter || '').toLowerCase();
              var d = listDir('/');
              var entries = d.dirs.concat(d.files);
              var html = '';
              if (!entries.length && !q) {
                host.innerHTML = emptyHtml('folder', '此目录为空', '点击右下角 + 新建文件夹或文本文档，也可导入文件');
                return;
              }
              html += chipsRow();
              var matched = q ? entries.filter(function(e) { return (e.name || '').toLowerCase().indexOf(q) !== -1; }) : entries;
              if (q) {
                html += '<div class="fj-sechead" style="padding-top:6px;"><span class="h">当前目录</span><span class="x">' + matched.length + ' 项匹配</span></div>';
              }
              if (matched.length) {
                html += S.view === 'grid'
                  ? '<div class="fj-gwrap">' + matched.map(gridItemHtml).join('') + '</div>'
                  : '<div class="fj-vlist">' + matched.map(function(e) { return rowHtml(e); }).join('') + '</div>';
              } else {
                html += emptyHtml('search', '当前目录无匹配', '试试在下方全库结果中查找');
              }
              // 全库搜索（关键字 ≥2 字符时）：跨目录文件名匹配，点击直达
              if (q && q.length >= 2) {
                var lib = flatFiles().filter(function(e) { return (e.name || '').toLowerCase().indexOf(q) !== -1 && matched.indexOf(e) === -1; })
                  .slice(0, 20);
                html += '<div class="fj-sechead"><span class="h">全库结果</span><span class="x">' + lib.length + ' 项</span></div>';
                html += lib.length
                  ? '<div class="fj-vlist">' + lib.map(function(e) {
                      return rowHtml(e, { selectable: false }).replace('<span class="s">', '<span class="s">' + esc(parentOf(e.path) === '/' ? '内部存储' : parentOf(e.path)) + ' · ');
                    }).join('') + '</div>'
                  : '<div class="ss" style="padding:0 20px;color:var(--md-on-surface-variant);font-size:12.5px;">全库无更多匹配</div>';
              }
              host.innerHTML = html;
              fillThumbs(host);
            }

            function renderSub() {
              if (!S.sub) return;
              var body = '';
              if (S.sub.kind === 'dir') {
                var d = listDir(S.sub.dir);
                var entries = d.dirs.concat(d.files);
                subTitle.textContent = S.sub.dir === '/' ? '内部存储' : baseName(S.sub.dir);
                body = entries.length
                  ? '<div class="fj-vlist">' + entries.map(function(e) { return rowHtml(e); }).join('') + '</div>'
                  : emptyHtml('folder', '此文件夹为空', '点击右下角 + 添加内容');
                fab.classList.remove('hide');
              } else {
                var cat = null;
                for (var i = 0; i < CATS.length; i++) if (CATS[i].key === S.sub.cat) cat = CATS[i];
                var files = sorted(filesOfCat(S.sub.cat));
                subTitle.textContent = cat ? cat.label : '分类';
                fab.classList.add('hide');
                if (!files.length) body = emptyHtml(cat ? cat.icon : 'file', '暂无此类文件', '导入或创建后自动归类到这里');
                else if (S.view === 'grid') body = '<div class="fj-gwrap">' + files.map(gridItemHtml).join('') + '</div>';
                else body = '<div class="fj-vlist">' + files.map(function(e) { return rowHtml(e); }).join('') + '</div>';
              }
              subBody.innerHTML = body;
              fillThumbs(subBody);
            }

            function renderAll() {
              if (S.tab === 0) renderHome();
              else if (S.tab === 1) renderClean();
              else renderBrowse();
            }
            function refresh() {
              S.cache.t = 0;
              renderAll();
              if (S.sub) renderSub();
              syncSelUI();
            }

            // ==================== 子页（目录下钻 / 分类） ====================
            function openSub(spec) {
              S.sub = spec;
              subEl.classList.remove('anim-out');
              subEl.classList.add('on', 'anim-in');
              setTimeout(function() { subEl.classList.remove('anim-in'); }, 340);
              renderSub();
            }
            function closeSub() {
              if (!S.sub) return;
              S.sub = null;
              exitSel();
              subEl.classList.add('anim-out');
              setTimeout(function() { subEl.classList.remove('on', 'anim-out'); }, 270);
            }
            function openCat(key) { openSub({ kind: 'cat', cat: key }); }

            // ==================== 多选 ====================
            function enterSel(path) {
              S.selMode = true;
              S.sel = new Set(path ? [path] : []);
              app.classList.add('fj-selmode');
              syncSelUI();
              refresh();
              try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
            }
            function exitSel() {
              S.selMode = false;
              S.sel.clear();
              app.classList.remove('fj-selmode');
              syncSelUI();
            }
            function toggleSel(path) {
              if (!path) return;
              if (S.sel.has(path)) S.sel.delete(path); else S.sel.add(path);
              if (!S.sel.size) { exitSel(); return; }
              syncSelUI();
              refresh();
            }
            function syncSelUI() {
              var on = S.selMode && S.sel.size > 0;
              selTop.classList.toggle('on', !!(S.selMode));
              selBot.classList.toggle('on', !!(S.selMode));
              $('fjSelCount').textContent = '已选择 ' + S.sel.size + ' 项';
              var items = selEntries();
              var shown = items.slice(0, 3).map(function(e) { return e.name; }).join('、') + (items.length > 3 ? ' 等' : '');
              $('fjSelHint').textContent = shown;
              var fabHide = S.selMode || !!(S.sub && S.sub.kind === 'cat');
              fab.classList.toggle('hide', fabHide);
            }
            function selEntries() {
              return Array.from(S.sel).map(function(p) {
                try { return V().stat(p); } catch (e) { return null; }
              }).filter(Boolean);
            }
            function collectVisible() {
              var ids = [];
              app.querySelectorAll('.fj-row[data-path],.fj-gitem[data-path]').forEach(function(el) {
                if (el.dataset.path) ids.push(el.dataset.path);
              });
              return ids;
            }

            // ==================== 批量操作 ====================
            // v7.53 修复：单项目录菜单（⋮）与清理页路径此前丢参数调 deleteSelected()，
            // 而本函数只读 S.sel（浏览态恒空）→ 首行早退静默 no-op（用户主诉「删除导入的
            // 文件貌似不生效」）。改为接受显式目标列表 override：多选路径仍传 S.sel 语义，
            // 单项/清理页路径直传目标路径，全链路统一。
            async function deleteSelected(pathsOverride) {
              var targets = (pathsOverride && pathsOverride.length) ? pathsOverride.slice() : Array.from(S.sel);
              var n = targets.length;
              if (!n) return;
              var ok = await askDialog({ title: '删除', message: '确定删除所选 ' + n + ' 项吗？\\n此操作不可撤销。', danger: true });
              if (!ok) return;
              var done = 0, fail = 0;
              for (var p of targets) {
                var r = await V().del(p);
                if (r && r.ok) done++; else fail++;
              }
              exitSel();
              refresh();
              if (done + fail > 0) snack('已删除 ' + done + ' 项' + (fail ? '，失败 ' + fail + ' 项' : '') + (fail && !done ? '（存储可能不可用）' : ''), 'trash');
            }
            // （v7.53 collectCleanSel 已由 v7.66 deleteCleanSel 的按卡收集取代）
            function pickDir(title, cb) {
              // 目录选择器（复制到/移动到）：递归列出全部目录
              var dirs = [];
              function rec(dir, depth) {
                dirs.push({ dir: dir, depth: depth });
                var list;
                try { list = V().list(dir) || []; } catch (e) { return; }
                for (var i = 0; i < list.length; i++) {
                  if (list[i].type === 'dir') rec(list[i].path, depth + 1);
                }
              }
              rec('/', 0);
              openSheet('<div class="fj-sh-t">' + esc(title) + '</div>' + dirs.map(function(d) {
                return '<button class="fj-sh-item" data-pickdir="' + esc(d.dir) + '">'
                  + '<span style="width:' + (12 + d.depth * 16) + 'px;flex:none;"></span>'
                  + ic('folder') + '<span style="flex:1;">' + esc(d.dir === '/' ? '内部存储' : baseName(d.dir)) + '</span></button>';
              }).join(''));
              sheetEl.querySelectorAll('[data-pickdir]').forEach(function(btn) {
                btn.onclick = function() {
                  var dir = btn.getAttribute('data-pickdir');
                  closeSheet();
                  cb(dir);
                };
              });
            }
            // v7.53：接受显式源列表 override —— 单项目录菜单的复制/移动与删除同根因
            // （原实现只读 S.sel，浏览态下静默复制 0 项）
            function pasteInto(dstDir, cut, pathsOverride) {
              var sources = (pathsOverride && pathsOverride.length) ? pathsOverride.slice() : Array.from(S.sel);
              return Promise.all(sources.map(function(p) {
                var target = dstDir === '/' ? '/' + baseName(p) : dstDir + '/' + baseName(p);
                if (target === p || target.indexOf(p + '/') === 0) return Promise.resolve({ ok: false, error: '目标无效' });
                var finalTarget = target, n = 1;
                while (V().exists(finalTarget)) {
                  var dot = target.lastIndexOf('.');
                  finalTarget = dot > target.lastIndexOf('/') ? target.slice(0, dot) + ' (' + n + ')' + target.slice(dot) : target + ' (' + n + ')';
                  n++;
                }
                return cut ? V().move(p, finalTarget) : V().copy(p, finalTarget);
              }));
            }

            // ==================== 更多操作（多选/单项共用） ====================
            function moreSheet(paths) {
              var one = paths.length === 1;
              var head = '<div class="fj-sh-t">' + esc(one ? baseName(paths[0]) : '已选择 ' + paths.length + ' 项') + '</div>';
              var html = head
                + '<button class="fj-sh-item" data-m="copy">' + ic('copy') + '复制到…</button>'
                + '<button class="fj-sh-item" data-m="move">' + ic('move') + '移动到…</button>'
                + (one ? '<button class="fj-sh-item" data-m="rename">' + ic('edit') + '重命名</button>' : '')
                + '<button class="fj-sh-item" data-m="export">' + ic('download') + '导出到电脑</button>'
                + '<button class="fj-sh-item" data-m="share">' + ic('share') + '分享</button>'
                + (one ? '<button class="fj-sh-item" data-m="details">' + ic('info') + '详情</button>' : '')
                + '<button class="fj-sh-item danger" data-m="del">' + ic('trash') + '删除</button>';
              openSheet(html);
              sheetEl.querySelectorAll('[data-m]').forEach(function(btn) {
                btn.onclick = async function() {
                  var m = btn.getAttribute('data-m');
                  // v7.53：单项目录菜单与多选共用 moreSheet(paths)，操作一律以显式 paths
                  // 为准（多选路径 paths 即 Array.from(S.sel)，行为不变；浏览态单项目此修复）
                  if (m === 'del') { closeSheet(); await deleteSelected(paths); return; }
                  if (m === 'copy' || m === 'move') {
                    closeSheet();
                    pickDir(m === 'copy' ? '复制到…' : '移动到…', async function(dir) {
                      var rs = await pasteInto(dir, m === 'move', paths);
                      var ok = rs.filter(function(r) { return r && r.ok; }).length;
                      snack((m === 'copy' ? '已复制 ' : '已移动 ') + ok + ' 项到「' + (dir === '/' ? '内部存储' : baseName(dir)) + '」');
                      exitSel();
                      refresh();
                    });
                    return;
                  }
                  if (m === 'export') { closeSheet(); paths.forEach(downloadFile); return; }
                  if (m === 'share') { closeSheet(); openShareSheet(paths[0]); return; }
                  if (m === 'rename') {
                    closeSheet();
                    var p = paths[0], old = baseName(p);
                    var name = await askDialog({ title: '重命名', input: old });
                    if (name === null) return;
                    name = validName(name);
                    if (!name) { snack('名称不合法'); return; }
                    if (name !== old) {
                      var r = await V().move(p, parentOf(p) + '/' + name);
                      snack(r.ok ? '已重命名' : (r.error || '重命名失败'));
                    }
                    exitSel();
                    refresh();
                    return;
                  }
                  if (m === 'details') {
                    closeSheet();
                    var e = V().stat(paths[0]) || {};
                    openSheet('<div class="fj-sh-t">详情</div>' + [
                      ['名称', e.name], ['类型', (e.mime || '未知')], ['大小', fmtBytes(e.size)],
                      ['位置', parentOf(paths[0]) === '/' ? '内部存储' : parentOf(paths[0])],
                      ['修改时间', fmtTime(e.modified)],
                    ].map(function(row) {
                      return '<div class="fj-sh-item" style="pointer-events:none;"><span style="color:var(--md-on-surface-variant);width:64px;flex:none;">' + row[0] + '</span><span style="flex:1;text-align:right;overflow:hidden;text-overflow:ellipsis;">' + esc(row[1] == null ? '—' : row[1]) + '</span></div>';
                    }).join(''));
                  }
                };
              });
            }

            // ==================== 下载导出 ====================
            function downloadFile(p) {
              V().readBlob(p).then(function(blob) {
                if (!blob) { snack('读取失败'); return; }
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = baseName(p);
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(function() { try { a.remove(); URL.revokeObjectURL(a.href); } catch (e) {} }, 3000);
                snack('已开始导出');
              });
            }

            // ==================== 分享（信息 / 相册 / 便签） ====================
            function openShareSheet(path) {
              var entry = V().stat(path) || {};
              var isImg = (entry.mime || '').indexOf('image/') === 0;
              var isText = (entry.mime || '').indexOf('text/') === 0 || entry.mime === 'application/json';
              openSheet('<div class="fj-sh-t">分享「' + esc(baseName(path)) + '」</div>'
                + '<button class="fj-sh-item" data-share="msg">' + ic('doc') + '发送到 信息</button>'
                + (isImg ? '<button class="fj-sh-item" data-share="photo">' + ic('image') + '保存到 相册</button>' : '')
                + (isText ? '<button class="fj-sh-item" data-share="notes">' + ic('edit') + '存为 便签</button>' : ''));
              sheetEl.querySelectorAll('[data-share]').forEach(function(btn) {
                btn.onclick = function() {
                  var target = btn.getAttribute('data-share');
                  closeSheet();
                  var emit = function(event, payload) {
                    var msg = { type: 'BUS_EMIT', event: event, payload: payload, target: target };
                    try { window.postMessage(msg, '*'); } catch (err) {}
                    try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (err) {}
                  };
                  if (target === 'photo') {
                    V().readBlob(path).then(function(blob) {
                      if (!blob) { snack('读取失败'); return; }
                      var fr = new FileReader();
                      fr.onload = function() {
                        emit('photo/captured', { id: 'fs' + Date.now(), type: 'image', src: String(fr.result), name: baseName(path), noti: { title: '文件已保存到相册', desc: baseName(path) } });
                        snack('已发送到相册');
                      };
                      fr.readAsDataURL(blob);
                    });
                  } else if (target === 'notes') {
                    V().readText(path).then(function(text) {
                      emit('files/share', { name: baseName(path), text: text || '', noti: { title: '文件分享到便签', desc: baseName(path) } });
                      snack('已发送到便签');
                    });
                  } else {
                    var isTxt = (entry.mime || '').indexOf('text/') === 0 || entry.mime === 'application/json';
                    var send = function(textPart) {
                      emit('files/share', { name: baseName(path), text: textPart, noti: { title: '文件分享到信息', desc: baseName(path) } });
                      snack('已发送到信息');
                    };
                    if (isTxt) V().readText(path).then(send); else send('（文件）' + baseName(path) + ' · ' + fmtBytes(entry.size || 0));
                  }
                };
              });
            }

            // ==================== 预览 ====================
            function closePreview() {
              pvEl.classList.remove('on');
              pvBody.innerHTML = '';
              currentPreviewPath = null;
            }
            $('fjPvClose').onclick = closePreview;
            async function openPreview(path) {
              var entry = V().stat(path);
              if (!entry) return;
              currentPreviewPath = path;
              pvName.textContent = entry.name;
              var mime = entry.mime || '';
              var html = '';
              if (mime.indexOf('image/') === 0) {
                var url = await V().readURL(path);
                html = url ? '<img src="' + url + '" style="max-width:100%;max-height:100%;border-radius:12px;" alt="" />' : '<div style="color:var(--md-on-surface-variant);">图片加载失败</div>';
              } else if (mime.indexOf('audio/') === 0) {
                var aurl = await V().readURL(path);
                html = '<div style="width:100%;text-align:center;">'
                  + '<div style="opacity:.5;margin-bottom:18px;">' + ic('audio', 'width:64px;height:64px;') + '</div>'
                  + (aurl ? '<audio src="' + aurl + '" controls style="width:100%;max-width:420px;"></audio>' : '<div style="color:var(--md-on-surface-variant);">音频加载失败</div>')
                  + '</div>';
                if (aurl) attachMusicDeepLink(aurl, path);
              } else if (mime.indexOf('video/') === 0) {
                var vurl = await V().readURL(path);
                html = vurl ? '<video src="' + vurl + '" controls style="max-width:100%;max-height:100%;border-radius:12px;"></video>' : '<div style="color:var(--md-on-surface-variant);">视频加载失败</div>';
              } else if (mime.indexOf('text/') === 0 || mime === 'application/json') {
                var text = await V().readText(path);
                html = '<pre style="width:100%;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.7;color:var(--md-on-surface);margin:0;font-family:inherit;">' + esc(text == null ? '（空文件）' : text) + '</pre>';
              } else {
                html = '<div style="text-align:center;color:var(--md-on-surface-variant);">'
                  + '<div style="opacity:.5;margin-bottom:14px;">' + ic('file', 'width:60px;height:60px;') + '</div>'
                  + '<div style="font-size:14px;color:var(--md-on-surface);">' + esc(entry.name) + '</div>'
                  + '<div style="font-size:12px;margin-top:4px;">' + esc(mime || '未知类型') + ' · ' + fmtBytes(entry.size) + '</div>'
                  + '<div style="font-size:12px;margin-top:10px;opacity:.8;">此类文件暂不支持预览，可导出到电脑查看</div>'
                  + '</div>';
              }
              pvBody.innerHTML = html;
              pvEl.classList.add('on');
            }
            function attachMusicDeepLink(aurl, path) {
              var btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'fj-btn';
              btn.style.cssText = 'margin:18px auto 4px;display:flex;';
              btn.innerHTML = ic('audio') + '用音乐播放';
              btn.onclick = function() {
                var msg = { type: 'BUS_EMIT', event: 'music/import', target: 'music', payload: { url: aurl, name: baseName(path), autoPlay: true, __silent: true } };
                try { window.postMessage(msg, '*'); } catch (err) {}
                try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (err) {}
                if (window.__shareSheet && typeof window.__shareSheet.openAppById === 'function') {
                  window.__shareSheet.openAppById('music');
                } else {
                  snack('已投递到音乐应用');
                }
                closePreview();
              };
              pvBody.appendChild(btn);
            }
            $('fjPvDl').onclick = function() { if (currentPreviewPath) downloadFile(currentPreviewPath); };
            $('fjPvShare').onclick = function() { if (currentPreviewPath) openShareSheet(currentPreviewPath); };

            // ==================== 行交互（事件委托） ====================
            function contextEntries() {
              // 当前视图的“可见条目集合”（多选上下文：全选目标）
              if (S.sub) {
                var sel = [];
                subBody.querySelectorAll('[data-path]').forEach(function(el) { sel.push(el.dataset.path); });
                return sel;
              }
              return collectVisible();
            }
            function handleTap(target) {
              var selbox = target.closest('[data-selbox]');
              if (selbox) {
                if (selbox.closest('[data-clean]')) return; // 清理页勾选由独立路径处理
                toggleSel(selbox.getAttribute('data-selbox'));
                return true;
              }
              var chip = target.closest('[data-sort]');
              if (chip) { S.sort = chip.getAttribute('data-sort'); renderBrowseList(); if (S.sub) renderSub(); return true; }
              var viewBtn = target.closest('[data-view]');
              if (viewBtn) { S.view = viewBtn.getAttribute('data-view'); renderBrowseList(); if (S.sub) renderSub(); return true; }
              // v7.66 清理页汇总 chips → 滚动到对应卡片
              var jump = target.closest('[data-jump]');
              if (jump) {
                var cardEl = document.getElementById(jump.getAttribute('data-jump'));
                if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return true;
              }
              var catCard = target.closest('[data-cat]');
              if (catCard) { openCat(catCard.getAttribute('data-cat')); return true; }
              var imgJump = target.closest('[data-cat-jump]');
              if (imgJump) { openCat(imgJump.getAttribute('data-cat-jump')); return true; }
              var gotoBrowse = target.closest('[data-goto-browse]');
              if (gotoBrowse) { switchTab(2); return true; }
              var moreBtn = target.closest('[data-act="more"]');
              if (moreBtn) { moreSheet([moreBtn.getAttribute('data-path')]); return true; }
              return false;
            }
            function handleRowOpen(row) {
              var path = row.getAttribute('data-path');
              var type = row.getAttribute('data-type');
              if (type === 'dir') {
                openSub({ kind: 'dir', dir: path });
              } else {
                var lowerPath = String(path).toLowerCase();
                if ((lowerPath.endsWith('.zip') || lowerPath.endsWith('.mdapp')) && window.__pkgInstallerAPI) {
                  // v7.52 安装包交接：压缩包交给安装器（导入 → 自动识别 → 打开安装器确认安装）
                  window.__pkgInstallerAPI.openVFSFile(path).then(function (rec) {
                    if (rec && window.showSystemToast) window.showSystemToast('已导入「' + (rec.name || path) + '」，到安装包里确认安装');
                  }).catch(function (err) {
                    if (window.showSystemToast) window.showSystemToast('安装包导入失败：' + ((err && (err.pkgErrors && err.pkgErrors[0] || err.message)) || '未知原因'));
                  });
                  return;
                }
                openPreview(path);
              }
            }
            function bindContainer(container) {
              if (!container) return;
              // 点按（委托）
              container.addEventListener('click', function(e) {
                if (handleTap(e.target)) return;
                var row = e.target.closest('.fj-row,.fj-gitem');
                if (!row || !row.dataset.path) return;
                if (S.selMode) { toggleSel(row.dataset.path); return; }
                if (row.dataset.clean) {
                  // 清理页勾选
                  var box = row.querySelector('.fj-selbox');
                  if (box) box.classList.toggle('on');
                  syncCleanCardBtn(row.closest('.fj-kcard'));
                  return;
                }
                handleRowOpen(row);
              });
              // 长按进入多选
              var lpTimer = null, lpFired = false;
              container.addEventListener('pointerdown', function(e) {
                if (S.selMode) return;
                if (e.target.closest('[data-act],.fj-act,[data-selbox]')) return;
                var row = e.target.closest('.fj-row,.fj-gitem');
                if (!row || !row.dataset.path || row.dataset.type !== 'file') return;
                var path = row.dataset.path;
                var sx = e.clientX, sy = e.clientY;
                lpFired = false;
                lpTimer = setTimeout(function() {
                  lpFired = true;
                  if (row.dataset.clean) {
                    var box = row.querySelector('.fj-selbox');
                    if (box) box.classList.add('on');
                    syncCleanCardBtn(row.closest('.fj-kcard'));
                    return;
                  }
                  enterSel(path);
                }, 480);
                var cancel = function(ev) {
                  if (ev && (Math.abs(ev.clientX - sx) > 10 || Math.abs(ev.clientY - sy) > 10)) clearTimeout(lpTimer);
                };
                var up = function() { clearTimeout(lpTimer); };
                container.addEventListener('pointermove', cancel, { once: true });
                container.addEventListener('pointerup', up, { once: true });
                container.addEventListener('pointercancel', up, { once: true });
                // 长按后吞掉随后的 click
                container.addEventListener('click', function swallow(ev) {
                  if (lpFired) { lpFired = false; ev.stopPropagation(); }
                  container.removeEventListener('click', swallow);
                }, true);
              });
            }
            bindContainer(homeEl);
            bindContainer(cleanEl);
            bindContainer(browseEl);
            bindContainer(subBody);

            // ==================== 多选操作条事件 ====================
            $('fjSelClose').onclick = exitSel;
            $('fjSelAll').onclick = function() {
              var all = contextEntries();
              all.forEach(function(p) { S.sel.add(p); });
              syncSelUI();
              refresh();
            };
            $('fjSelMore').onclick = function() { moreSheet(Array.from(S.sel)); };
            $('fjSelDel').onclick = function() { deleteSelected(); };

            // ==================== 排序按钮 / FAB ====================
            $('fjBtnSort').onclick = function() {
              openSheet('<div class="fj-sh-t">排序与视图</div>'
                + '<button class="fj-sh-item" data-s="date">' + ic('sort') + '按最近修改</button>'
                + '<button class="fj-sh-item" data-s="name">' + ic('sort') + '按名称</button>'
                + '<button class="fj-sh-item" data-s="size">' + ic('sort') + '按大小</button>'
                + '<button class="fj-sh-item" data-v="list">' + ic('listv') + '列表视图</button>'
                + '<button class="fj-sh-item" data-v="grid">' + ic('gridv') + '网格视图</button>');
              sheetEl.querySelectorAll('[data-s]').forEach(function(b) {
                b.onclick = function() { S.sort = b.getAttribute('data-s'); closeSheet(); refresh(); };
              });
              sheetEl.querySelectorAll('[data-v]').forEach(function(b) {
                b.onclick = function() { S.view = b.getAttribute('data-v'); closeSheet(); refresh(); };
              });
            };
            fab.onclick = function() {
              openSheet('<div class="fj-sh-t">新建</div>'
                + '<button class="fj-sh-item" data-n="dir"><span class="ci" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--md-outline-variant);display:grid;place-items:center;color:hsl(var(--md-h,215) 85% 70%);flex:none;">' + ic('folder', 'width:18px;height:18px;') + '</span>新建文件夹</button>'
                + '<button class="fj-sh-item" data-n="txt"><span class="ci" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--md-outline-variant);display:grid;place-items:center;color:hsl(var(--md-h,215) 85% 70%);flex:none;">' + ic('doc', 'width:18px;height:18px;') + '</span>新建文本文档</button>'
                + '<button class="fj-sh-item" data-n="import"><span class="ci" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--md-outline-variant);display:grid;place-items:center;color:hsl(var(--md-h,215) 85% 70%);flex:none;">' + ic('download', 'width:18px;height:18px;transform:rotate(180deg);') + '</span>从电脑导入</button>'
                + '<button class="fj-sh-item" data-n="paste" ' + (CB() && CB().has() ? '' : 'style="opacity:.45;pointer-events:none;"') + '><span class="ci" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--md-outline-variant);display:grid;place-items:center;color:hsl(var(--md-h,215) 85% 70%);flex:none;">' + ic('copy', 'width:18px;height:18px;') + '</span>粘贴剪贴板内容</button>');
              sheetEl.querySelectorAll('[data-n]').forEach(function(b) {
                b.onclick = function() {
                  var n = b.getAttribute('data-n');
                  closeSheet();
                  if (n === 'dir') createDir();
                  else if (n === 'txt') createTxt();
                  else if (n === 'import') fileInput.click();
                  else if (n === 'paste') pasteClipboard();
                };
              });
            };
            function currentDir() {
              if (S.sub && S.sub.kind === 'dir') return S.sub.dir;
              return '/';
            }
            async function createDir() {
              var name = await askDialog({ title: '新建文件夹', input: '新建文件夹' });
              if (name === null) return;
              name = validName(name);
              if (!name) { snack('名称不合法'); return; }
              var r = await V().mkdir(currentDir() === '/' ? '/' + name : currentDir() + '/' + name);
              snack(r.ok ? '文件夹已创建' : (r.error || '创建失败'));
              refresh();
            }
            async function createTxt() {
              var name = await askDialog({ title: '新建文本文档', input: '新建文本.txt' });
              if (name === null) return;
              name = validName(name);
              if (!name) { snack('名称不合法'); return; }
              var r = await V().write((currentDir() === '/' ? '' : currentDir()) + '/' + name, '', { owner: 'files' });
              snack(r.ok ? '文档已创建' : (r.error || '创建失败'));
              refresh();
            }
            async function pasteClipboard() {
              var c = CB();
              var item = c && c.get();
              if (!item) return;
              var dir = currentDir();
              if (item.kind === 'files') {
                var moved = 0, fail = 0;
                for (var i = 0; i < item.paths.length; i++) {
                  var p = item.paths[i];
                  var target = (dir === '/' ? '' : dir) + '/' + baseName(p);
                  if (item.cut && (target === p || target.indexOf(p + '/') === 0)) { fail++; continue; }
                  var finalTarget = target, n = 1;
                  while (V().exists(finalTarget)) {
                    var dot = target.lastIndexOf('.');
                    finalTarget = dot > target.lastIndexOf('/') ? target.slice(0, dot) + ' (' + n + ')' + target.slice(dot) : target + ' (' + n + ')';
                    n++;
                  }
                  var r = item.cut ? await V().move(p, finalTarget) : await V().copy(p, finalTarget);
                  if (r.ok) moved++; else fail++;
                }
                if (item.cut && c.clear && !fail) c.clear();
                snack((item.cut ? '已移动 ' : '已粘贴 ') + moved + ' 项' + (fail ? '，失败 ' + fail + ' 项' : ''));
              } else if (item.kind === 'image') {
                var name = item.name || ('clipboard_' + Date.now() + '.png');
                var dot2 = name.lastIndexOf('.');
                var base2 = dot2 > 0 ? name.slice(0, dot2) : name;
                var ext2 = dot2 > 0 ? name.slice(dot2) : '';
                var t2 = (dir === '/' ? '' : dir) + '/' + base2 + ext2, k = 1;
                while (V().exists(t2)) { t2 = (dir === '/' ? '' : dir) + '/' + base2 + ' (' + k + ')' + ext2; k++; }
                var r2 = await V().write(t2, item.dataUrl, { owner: 'files' });
                snack(r2.ok ? '图片已粘贴为 ' + base2 + ext2 : (r2.error || '粘贴失败'));
              } else if (item.kind === 'text') {
                var tname = '剪贴板_' + new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/[s/:]+/g, '') + '.txt';
                var r3 = await V().write((dir === '/' ? '' : dir) + '/' + tname, item.text, { owner: 'files' });
                snack(r3.ok ? '文本已粘贴为 ' + tname : (r3.error || '粘贴失败'));
              }
              refresh();
            }
            fileInput.addEventListener('change', function(e) {
              var files = Array.prototype.slice.call(e.target.files || []);
              e.target.value = '';
              if (!files.length) return;
              var dir = currentDir();
              var done = 0, fail = 0, lastErr = '';
              var next = function(i) {
                if (i >= files.length) {
                  snack('导入完成：成功 ' + done + ' 个' + (fail ? '，失败 ' + fail + ' 个' + (lastErr ? '（' + lastErr + '）' : '') : ''));
                  refresh();
                  return;
                }
                var f = files[i];
                V().write((dir === '/' ? '' : dir) + '/' + f.name, f, { owner: 'files' }).then(function(r) {
                  if (r.ok) done++; else { fail++; lastErr = r.error || ''; }
                  next(i + 1);
                });
              };
              next(0);
            });

            // ==================== Tab/返回按钮/遮罩事件 ====================
            navbar.querySelectorAll('.fj-nitem').forEach(function(b) {
              b.addEventListener('click', function() { switchTab(+b.dataset.tab); });
            });
            app.querySelectorAll('.fj-ritem').forEach(function(b) {
              b.addEventListener('click', function() { switchTab(+b.dataset.tab); });
            });
            $('fjSubBack').onclick = function() { closeSub(); };
            sheetWrap.addEventListener('click', function(e) { if (e.target.closest('[data-sheet-close]') || e.target === sheetWrap) closeSheet(); });

            // 涟漪：v7.66 起统一走宿主 ripple-fx.js 的 M3E Expressive 粒子涟漪
            // （.fj-rpl / .fj-gitem 已列入 RIPPLE_SELECTOR；.fj-btn/.fj-ibtn 等
            // button 元素经 button 兜底覆盖）—— 旧手写 fj-ink span 波纹退役

            // ==================== 平板模式（宽容器 → 侧栏） ====================
            if (window.ResizeObserver) {
              var ro = new ResizeObserver(function() {
                app.classList.toggle('fj-wide', app.clientWidth >= 620);
                renderTabs();
              });
              ro.observe(app);
            }

            // ==================== v7.28 预览式返回桥（宿主 main.js 注册） ====================
            var pbDrag = null; // { el, startX, dx }
            window.__filesPB = {
              canBack: function() {
                return !!(pvEl.classList.contains('on') || dlgEl.classList.contains('on') || sheetWrap.classList.contains('on') || S.sub);
              },
              triggerBack: function() {
                if (pvEl.classList.contains('on')) { closePreview(); return; }
                if (dlgEl.classList.contains('on')) { closeDialog(null); return; }
                if (sheetWrap.classList.contains('on')) { closeSheet(); return; }
                closeSub();
              },
              beginGesture: function(dir) {
                if (pvEl.classList.contains('on')) { closePreview(); return; }
                if (dlgEl.classList.contains('on')) { closeDialog(null); return; }
                if (sheetWrap.classList.contains('on')) { closeSheet(); return; }
                if (!S.sub) return;
                pbDrag = { el: subEl, dx: 0 };
                subEl.style.transition = 'none';
              },
              progressGesture: function(dx) {
                if (!pbDrag) return;
                pbDrag.dx = Math.max(0, dx || 0);
                pbDrag.el.style.transform = 'translateX(' + pbDrag.dx + 'px)';
                pbDrag.el.style.opacity = String(Math.max(0.4, 1 - pbDrag.dx / 480));
              },
              endGesture: function(commit) {
                if (!pbDrag) return;
                var el = pbDrag.el;
                pbDrag = null;
                el.style.transition = 'transform 0.26s cubic-bezier(0.2, 0, 0.1, 1), opacity 0.24s ease';
                if (commit && (S.sub != null)) {
                  el.style.transform = 'translateX(56%)';
                  el.style.opacity = '0.4';
                  var keepSub = S.sub;
                  S.sub = null;
                  exitSel();
                  setTimeout(function() {
                    el.classList.remove('on');
                    el.style.transform = '';
                    el.style.opacity = '';
                    el.style.transition = '';
                    void keepSub;
                  }, 270);
                } else {
                  el.style.transform = '';
                  el.style.opacity = '';
                  setTimeout(function() { el.style.transition = ''; }, 270);
                }
              },
            };

            // ==================== VFS / 剪贴板订阅 + 页面激活 ====================
            if (V()) {
              var unVfs = V().subscribe('/', function() { S.cache.t = 0; if (S.visible) refresh(); });
              addCleanup('files', function() { try { unVfs(); } catch (err) {} });
            }
            if (CB()) {
              var unClip = CB().subscribe(function() { if (S.visible) refresh(); });
              addCleanup('files', function() { try { unClip(); } catch (err) {} });
            }
            bindDoc('files', 'app-page-active', function(e) {
              if (!e.detail || e.detail.appId !== 'files') return;
              S.visible = e.detail.pageIdx === 0;
              if (S.visible) {
                S.cache.t = 0;
                syncScreens();
                renderTabs();
                renderAll();
                if (S.sub) renderSub();
              }
            });

            // 首次进入
            S.visible = true;
            renderTabs();
            renderAll();
          })();
        <\/script>
      `}]},Ah="ios-desktop:permissions",To={camera:{label:"相机",icon:"camera_access",desc:"拍摄照片与录制视频"},microphone:{label:"麦克风",icon:"mic_access",desc:"录制音频与环境声音"},location:{label:"位置信息",icon:"location_on",desc:"获取设备大致或精确位置"},notifications:{label:"通知",icon:"bell_off",desc:"发送提醒与横幅通知"},clipboard:{label:"剪贴板",icon:"edit",desc:"读取与写入复制内容"}};let oe=s2();const Ql=[];let al=!1;function s2(){try{const e=JSON.parse(localStorage.getItem(Ah)||"{}");return e&&typeof e=="object"?e:{}}catch{return{}}}function ga(){try{localStorage.setItem(Ah,JSON.stringify(oe))}catch{}}function Mo(e,t){const i=oe[e];return!i||typeof i[t]!="boolean"?"unset":i[t]?"granted":"denied"}function Ph(){return JSON.parse(JSON.stringify(oe))}function Dr(e,t,i){!e||!t||(oe[e]||(oe[e]={}),oe[e][t]=!!i,ga())}function Bh(){oe={},ga()}function a2(e,t){oe[e]||(oe[e]={});const i=F.find(n=>n.id===e);oe[e].__name||(oe[e].__name=t||i&&i.name||e),oe[e].__icon=J(e)}function r2(e,t,i){e&&(oe[e]||(oe[e]={}),t&&!oe[e].__name&&(oe[e].__name=String(t)),typeof i=="string"&&i?oe[e].__icon=i:oe[e].__icon||(oe[e].__icon=J(e)),ga())}function o2(e){!e||!oe[e]||(delete oe[e],ga())}async function zr(e,{appId:t,appName:i}={}){if(!To[e]||!t)return!0;const n=Mo(t,e);if(n!=="unset")return n==="granted";a2(t,i),ga();const s=oe[t].__name||i||t,a=await l2({appId:t,appName:s,permission:e});return a==="granted"?(Dr(t,e,!0),!0):a==="once"?!0:(Dr(t,e,!1),!1)}function l2(e){return new Promise(t=>{Ql.push({opts:e,resolve:t}),Fh()})}async function Fh(){if(al||!Ql.length)return;al=!0;const{opts:e,resolve:t}=Ql.shift();let i="denied";try{i=await c2(e)}catch{i="denied"}al=!1,t(i),Fh()}function c2({appId:e,appName:t,permission:i}){return new Promise(n=>{const s=To[i]||{label:i,icon:"lock",desc:""},a=document.createElement("div");a.className="power-dialog-overlay",a.id="md3PermissionOverlay",a.style.zIndex="9500",a.innerHTML=`
      <div class="power-dialog-card" role="alertdialog" aria-label="权限请求">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:44px;height:44px;border-radius:50%;background:hsl(var(--md-h,215) 80% 60% / 0.16);color:hsl(var(--md-h,215) 80% 64%);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${v[s.icon]||v.lock}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:16px;font-weight:600;color:var(--md-on-surface,#e2e2e9);line-height:1.4;">允许「${d2(t)}」使用${s.label}？</div>
            <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;line-height:1.5;">${s.desc} · 可随时在 设置 › 应用权限管理 中修改</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;">
          <button data-act="denied" style="background:none;border:none;color:var(--md-on-surface-variant,#9a9b9e);font-size:13.5px;font-weight:600;padding:10px 14px;border-radius:20px;cursor:pointer;">拒绝</button>
          <button data-act="once" style="background:none;border:none;color:hsl(var(--md-h,215) 80% 64%);font-size:13.5px;font-weight:600;padding:10px 14px;border-radius:20px;cursor:pointer;">仅本次</button>
          <button data-act="granted" style="background:hsl(var(--md-h,215) 80% 55%);border:none;color:#fff;font-size:13.5px;font-weight:600;padding:10px 20px;border-radius:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.25);">允许</button>
        </div>
      </div>
    `;const r=l=>{a.style.visibility!=="hidden"&&(a.classList.remove("active"),setTimeout(()=>{a.parentNode&&a.parentNode.removeChild(a)},220),n(l))};a.querySelectorAll("button[data-act]").forEach(l=>{l.addEventListener("click",()=>r(l.getAttribute("data-act")))}),document.body.appendChild(a),requestAnimationFrame(()=>a.classList.add("active")),navigator.vibrate&&navigator.vibrate(12)})}function d2(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Dh(){window.addEventListener("message",e=>{const t=e.data;if(!t||t.type!=="REQUEST_PERMISSION"||!t.requestId)return;const i=e.source;try{i&&i.postMessage({type:"PERMISSION_ACK",requestId:t.requestId},"*")}catch{}let n=t.appId||"";n||document.querySelectorAll(".app-instance-wrapper, [data-bus-app-id]").forEach(s=>{n||s.querySelectorAll("iframe").forEach(a=>{try{a.contentWindow===i&&(n=s.getAttribute("data-bus-app-id")||(s.id||"").replace("app-instance-",""))}catch{}})}),zr(t.permission,{appId:n,appName:t.appName}).then(s=>{try{i&&i.postMessage({type:"PERMISSION_RESULT",requestId:t.requestId,granted:s},"*")}catch{}})}),window.__permissions={requestPermission:zr,getPermissionState:Mo,getAllPermissions:Ph,setPermission:Dr,clearAllPermissions:Bh,PERMISSION_META:To}}const US=Object.freeze(Object.defineProperty({__proto__:null,PERMISSION_META:To,clearAllPermissions:Bh,getAllPermissions:Ph,getPermissionState:Mo,initPermissions:Dh,removeAppPermissions:o2,requestPermission:zr,seedAppMeta:r2,setPermission:Dr},Symbol.toStringTag,{value:"Module"}));let it=0,bt=!1,Xe=!1,Ue=!1,aa=!1,Sp=0,ws=0,ln=0,cn=0,si=0,kp=0,rl=0,Fa=0,Da=0,za=!1,Ra=null,Oa=null,hn=null;function es(){return(!Ra||!Ra.isConnected)&&(Ra=document.getElementById("pullPanelsOverlay"),hn=null),Ra}function Zi(){return(!Oa||!Oa.isConnected)&&(Oa=document.getElementById("pullPanelsSlider"),hn=null),Oa}function Lo(){const e=Zi();return e?((!hn||hn.some(t=>!t.isConnected))&&(hn=Array.from(e.querySelectorAll(".pull-panel"))),hn):[]}let Sn=0,Ns=null;function zh(e){const t=es();if(!t)return;t.style.opacity=e.overlayOpacity.toFixed(3);const i=Lo(),n=e.unit==="%"?`translate3d(0, ${e.offset.toFixed(1)}%, 0)`:`translate3d(0, ${e.offset.toFixed(1)}px, 0)`;i.forEach(s=>{s.style.transform=n,s.style.transition="none"})}function ol(e){Ns=e,!Sn&&(Sn=requestAnimationFrame(()=>{Sn=0;const t=Ns;Ns=null,t&&zh(t)}))}function $a(){Sn&&(cancelAnimationFrame(Sn),Sn=0);const e=Ns;Ns=null,e&&zh(e)}let kn=0,Jl=0;function Ep(){kn&&(cancelAnimationFrame(kn),kn=0);const e=Zi();e&&(e.style.transform=`translate3d(${Jl.toFixed(2)}%, 0, 0)`)}function p2(e,t){const i=e-t;return i<=0?0:Math.round(48*(1-Math.exp(-i/140))*10)/10}function _e(){const e=es();return!!(bt||Ue||Xe||aa||e&&e.classList.contains("active"))}function u2(){const e=es(),t=Zi();if(!e||!t)return;e.addEventListener("click",n=>{if(Ue||Xe||bt||aa||za)return;n.target.closest(".noti-card, .qs-tile, .qs-slider-bar, .panel-tab-pill-bar, .noti-media-card, .noti-footer-btn, .qs-action-btn, button, input, .edit-tiles-view")||qe()}),document.querySelectorAll(".tab-btn-noti").forEach(n=>{n.addEventListener("click",s=>{s.stopPropagation(),Ha(0)})}),document.querySelectorAll(".tab-btn-qs").forEach(n=>{n.addEventListener("click",s=>{s.stopPropagation(),Ha(1)})}),document.querySelectorAll(".status-bar, .app-window-status-bar").forEach(n=>{n.addEventListener("click",s=>{if(!(performance.now()-Sp<450))if(_e())qe();else{const r=s.clientX<window.innerWidth/2?0:1;ll(r)}})}),window.addEventListener("pointerdown",n=>{if(document.body.classList.contains("is-locked")||o.iconDragState)return;const s=document.getElementById("editTilesView");if(s&&s.classList.contains("open"))return;const a=window.innerWidth,r=e.classList.contains("active");if(ws=n.clientX,ln=n.clientY,cn=n.clientX,si=n.clientY,kp=performance.now(),rl=kp,Fa=0,Da=0,za=!1,!r&&n.clientY<=55){bt=!0,it=ws<a/2?0:1,qs(it,0),t.classList.add("dragging"),e.classList.add("active"),e.style.opacity="0",wd(it);return}if(r){if(n.target.closest(".qs-slider-bar")||n.target.closest("input")||n.target.closest(".media-progress-track"))return;Xe=!1,Ue=!1}},{passive:!0}),window.addEventListener("pointermove",n=>{if(!bt&&!Xe&&!Ue&&!e.classList.contains("active"))return;const s=performance.now(),a=Math.max(1,s-rl);Fa=(n.clientX-cn)/a,Da=(n.clientY-si)/a,rl=s,cn=n.clientX,si=n.clientY;const r=window.innerWidth,l=window.innerHeight,d=e.classList.contains("active");if(Math.hypot(cn-ws,si-ln)>6&&(za=!0),bt){const p=Math.max(0,si-ln),h=l*.38,f=Math.min(1,p/h),m=p2(p,h);if(m>0)ol({overlayOpacity:1,unit:"px",offset:(f-1)*l+m});else{const y=-100+f*100;ol({overlayOpacity:f,unit:"%",offset:y})}return}if(d&&!n.target.closest(".qs-slider-bar")&&!n.target.closest("input")&&!n.target.closest(".media-progress-track")){const p=cn-ws,h=si-ln;if(!Xe&&!Ue&&(Math.abs(p)>5&&Math.abs(p)>Math.abs(h)*.6?(Xe=!0,t.style.transition="none"):h<-5&&Math.abs(h)>Math.abs(p)*.4&&(Ue=!0)),Xe){const f=-it*50,m=p/r*50;let y=f+m;y>0&&(y=y*.25),y<-50&&(y=-50+(y+50)*.25),kn||(kn=requestAnimationFrame(()=>{kn=0,t.style.transform=`translate3d(${Jl.toFixed(2)}%, 0, 0)`})),Jl=y}if(Ue&&h<0){const f=Math.max(0,1+h/(l*.4));ol({overlayOpacity:f,unit:"px",offset:h*1.08})}}},{passive:!0});const i=n=>{if(n&&(n.type==="pointercancel"||n.type==="touchcancel")){if(bt){bt=!1;const s=Zi();s&&s.classList.remove("dragging"),$a(),qe();return}if(Xe){Xe=!1,Ep(),qs(it,240);return}Ue&&(Ue=!1,$a(),_p());return}if(bt){bt=!1,t.classList.remove("dragging"),$a();const s=si-ln;s>50||Da>.35?ll(it):!za&&s<=6?(Sp=performance.now(),ll(it)):qe();return}if(Xe){Xe=!1,Ep();const s=cn-ws;t.style.transition=`transform ${Q(260)}ms ${ee("gentle")}`,it===0&&(s<-28||Fa<-.15)?Ha(1):it===1&&(s>28||Fa>.15)?Ha(0):qs(it,240);return}if(Ue){Ue=!1,$a();const s=si-ln,a=-Da;s<-60||a>.35||s<-30&&a>.18?qe():_p()}};window.addEventListener("pointerup",i,{passive:!0}),window.addEventListener("pointercancel",i,{passive:!0}),window.addEventListener("touchcancel",i,{passive:!0})}function ll(e=0){const t=es(),i=Zi();if(!t||!i)return;aa=!1,Ue=!1,Xe=!1,it=e,t.classList.add("active"),t.style.opacity="1",t.style.transition=`opacity ${Q(280)}ms ${ee("emphasized")}`;const n=Lo();n.forEach(a=>{a.style.transform="translate3d(0, 0, 0)",a.style.transition=`transform ${Q(300)}ms ${ee("gentle")}`}),qs(e,300),wd(e);const s=n[e];if(s&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches&&(s.classList.remove("enter-stagger"),s.offsetWidth,s.classList.add("enter-stagger"),fe(620,()=>s.classList.remove("enter-stagger"))),e===1){const a=document.getElementById("qsTilesContainer");a&&a.children.length===0&&he(()=>Promise.resolve().then(()=>Md),void 0,import.meta.url).then(r=>{document.getElementById("qsTilesContainer")?.children.length===0&&r.renderQuickSettingsGrid()}).catch(()=>{})}fe(310,()=>{n.forEach(a=>{a.style.transition=""}),t.style.transition=""}),navigator.vibrate&&navigator.vibrate(25)}function Ha(e){it=e,qs(e,280),wd(e),navigator.vibrate&&navigator.vibrate(15)}function wd(e){document.querySelectorAll(".tab-btn-noti").forEach(t=>t.classList.toggle("active",e===0)),document.querySelectorAll(".tab-btn-qs").forEach(t=>t.classList.toggle("active",e===1))}function _p(){const e=es(),t=Lo();t.forEach(i=>{i.style.transition=`transform ${Q(280)}ms ${ee("gentle")}`,i.style.transform="translate3d(0, 0, 0)"}),e&&(e.style.transition=`opacity ${Q(240)}ms ${ee("emphasized")}`,e.style.opacity="1"),fe(290,()=>{t.forEach(i=>{i.style.transition="",i.style.transform=""}),e&&(e.style.transition="",e.style.opacity="")})}function qe(){const e=es(),t=Zi();if(!e||!t)return;aa=!0;const i=Lo();i.forEach(n=>{n.style.transition=`transform ${Q(260)}ms ${ee("emphasized")}`,n.style.transform="translate3d(0, -100%, 0)"}),e.style.transition=`opacity ${Q(250)}ms ${ee("emphasized")}`,e.style.opacity="0",fe(260,()=>{e.classList.remove("active"),e.style.opacity="",e.style.transition="",i.forEach(n=>{n.style.transform="",n.style.transition=""}),aa=!1,bt=!1,Ue=!1,Xe=!1})}function qs(e,t=0){const i=Zi();i&&(i.style.transition=t>0?`transform ${Q(t)}ms ${ee("gentle")}`:"none",i.style.transform=`translate3d(${-e*50}%, 0, 0)`)}const f2=24,qt=new Map,Ms=new Map;function Tp(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function cl(e){const t=F.find(i=>i.id===e);return t?t.name:e||"未知应用"}function Zl(e){if(!e)return"";let t="";return document.querySelectorAll(".app-instance-wrapper, [data-bus-app-id]").forEach(i=>{t||i.querySelectorAll("iframe").forEach(n=>{try{n.contentWindow===e&&(t=i.getAttribute("data-bus-app-id")||(i.id||"").replace("app-instance-",""))}catch{}})}),t}function xd(e,t){let i=!1,n=!1;const s=a=>{!a||!a.querySelectorAll||a.querySelectorAll("iframe").forEach(r=>{try{if(!r.contentWindow||r.dataset.loaded!=="1")return;r.contentWindow.postMessage(t,"*"),i=!0,a.offsetParent!==null&&(n=!0)}catch{}})};return s(document.getElementById(`app-instance-${e}`)),document.querySelectorAll(`[data-bus-app-id="${e}"]`).forEach(a=>{a.id!==`app-instance-${e}`&&s(a)}),{delivered:i,visible:n}}function Rh(e,t,i,n){if(i&&i.__silent)return;const s=i&&i.noti||null,a=s&&s.title||`${cl(n)||"某应用"} 分享到 ${cl(e)}`;let r=s&&s.desc||"";r||(t==="share/memo"?r=String(i&&(i.title||i.text)||"").slice(0,60)||"收到一条便签分享":t==="photo/captured"?r="相机拍摄的照片已同步到相册":t==="files/share"?r="收到一个来自「文件」的分享内容":r="收到一条跨应用消息"),Or({id:"bus-"+Date.now()+"-"+Math.floor(Math.random()*1e4),app:cl(e),appId:e,iconSvg:ho(e)?J(e):v.notification_system,title:Tp(a),desc:Tp(r),time:"刚刚",category:"应用联动 / App Link"})}function h2(e,t){qt.has(e)||qt.set(e,[]);const i=qt.get(e);i.push(t),i.length>f2&&i.shift()}function at(e,t,i,n){if(!e||!t)return;t==="photo/captured"&&n==="camera"&&m2(i);const{delivered:s,visible:a}=xd(e,{type:"BUS_DELIVER",event:t,payload:i,from:n});s&&!a?Rh(e,t,i,n):s||h2(e,{event:t,payload:i,from:n,at:Date.now()})}function m2(e){try{const t=window.__vfs;if(!t||typeof t.write!="function"||typeof t.exists!="function"||!e||typeof e.src!="string"||!e.src.startsWith("data:image"))return;let i=String(e.name||"").trim()||`IMG_${Date.now()}.jpg`;/\.[a-z0-9]+$/i.test(i)||(i+=".jpg");let n="/photos/"+i,s=2;for(;t.exists(n);){const a=i.lastIndexOf(".");if(n=`/photos/${i.slice(0,a)} (${s})${i.slice(a)}`,s++,s>99)break}t.write(n,e.src,{owner:"camera"})}catch{}}function Rr(e,t,i,n){const s=new Set;document.querySelectorAll(".app-instance-wrapper, [data-bus-app-id]").forEach(a=>{const r=a.getAttribute("data-bus-app-id")||(a.id||"").replace("app-instance-","");if(!r||r===n||s.has(r))return;s.add(r);const{delivered:l,visible:d}=xd(r,{type:"BUS_DELIVER",event:e,payload:t,from:i});l&&!d&&Rh(r,e,t,i)})}function ar(e,t){return Ms.has(e)||Ms.set(e,new Set),Ms.get(e).add(t),()=>{const i=Ms.get(e);i&&i.delete(t)}}function g2(e,t,i){const n=Ms.get(e);n&&n.forEach(s=>{try{s(t,i)}catch{}})}function Oh(e){if(!e||!e.closest)return;const t=e.closest(".app-instance-wrapper, [data-bus-app-id]");if(!t)return;const i=t.getAttribute("data-bus-app-id")||(t.id||"").replace("app-instance-","");if(!i||!qt.has(i))return;let n=40;const s=()=>{const a=qt.get(i);!a||!a.length||(e.dataset.loaded==="1"?(qt.set(i,[]),setTimeout(()=>{const r=[];if(a.forEach(l=>{const d=xd(i,{type:"BUS_DELIVER",event:l.event,payload:l.payload,from:l.from});(!d||!d.delivered)&&r.push(l)}),r.length){const l=qt.get(i)||[];qt.set(i,r.concat(l))}},60)):n-- >0&&setTimeout(s,100))};s()}function v2(){window.addEventListener("message",e=>{const t=e.data;if(!t||t.type!=="BUS_EMIT"||!t.event)return;const i=Zl(e.source);t.target?at(t.target,t.event,t.payload,i):Rr(t.event,t.payload,i,i),g2(t.event,t.payload,{from:i,target:t.target||null})}),window.__appBus={emit:(e,t,i)=>at(i,e,t,""),broadcast:(e,t)=>Rr(e,t,""),on:ar,flush:Oh,pending:()=>Object.fromEntries(qt)}}const $h="calnotes_v2",Hh="note_",Co="n2",Nh="ios-desktop:noti-cal-dismissed",Mp=e=>String(e).padStart(2,"0");function y2(e){return`${e.getFullYear()}-${Mp(e.getMonth()+1)}-${Mp(e.getDate())}`}function w2(e){const t=e||(typeof localStorage<"u"?localStorage:null);if(!t)return{};const i={};try{const n=JSON.parse(t.getItem($h)||"null");n&&typeof n=="object"&&Object.keys(n).forEach(s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Array.isArray(n[s]))return;const a=n[s].filter(r=>r&&typeof r.content=="string"&&r.content.trim());a.length&&(i[s]=a.map(r=>({id:r.id,content:r.content,updated:r.updated||r.created||0})))})}catch{}try{for(let n=0;n<t.length;n++){const s=t.key(n);if(!s||s.indexOf(Hh)!==0)continue;const a=/^note_(\d{4}-\d{2}-\d{2})$/.exec(s);if(!a)continue;const r=(t.getItem(s)||"").trim();!r||i[a[1]]||(i[a[1]]=[{id:"legacy-"+a[1],content:r,updated:0}])}}catch{}return i}function x2(e){const t=String(e||""),i=t.match(/^#+\s*(.+)/m);return(i?i[1]:t.split(`
`).find(s=>s.trim())||"").trim().slice(0,40)||"无标题"}function b2(e,t){const i=t instanceof Date?t:new Date,n=Object.keys(e||{}).filter(f=>(e[f]||[]).length);if(!n.length)return null;const s=y2(i);let a=null;if(n.indexOf(s)!==-1)a=s;else{let f=-1;n.forEach(m=>{const y=Math.max.apply(null,e[m].map(g=>g.updated||0));y>f&&(f=y,a=m)})}const r=e[a],l=r.slice().sort((f,m)=>(m.updated||0)-(f.updated||0))[0],d=/^(\d{4})-(\d{2})-(\d{2})$/.exec(a),c=d?new Date(+d[1],+d[2]-1,+d[3]):i,p=a===s?"今天":`${c.getMonth()+1}月${c.getDate()}日`,h=l&&l.updated||0;return{key:a,count:r.length,dateLabel:p,title:`${p} · ${r.length} 篇笔记`,desc:`最新：${x2(l?l.content:"")}`,latestUpdated:h,digest:S2(a,r.length,h)}}function S2(e,t,i){return`${e}:${t}:${i}`}function k2(e,t){const i=Number(e)||0;if(!i)return"刚刚";const n=t instanceof Date?t.getTime():Date.now(),s=Math.max(0,n-i);if(s<60*1e3)return"刚刚";if(s<3600*1e3)return`${Math.floor(s/6e4)}分钟前`;if(s<1440*60*1e3)return`${Math.floor(s/36e5)}小时前`;const a=new Date(i);return`${a.getMonth()+1}/${a.getDate()}`}const qh="ios-desktop:notifications",ec=30;function jt(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function jh(e){return typeof e!="string"?!1:e.indexOf("<svg")===0?!/<script/i.test(e)&&!/\son[a-z]+\s*=/i.test(e):e.indexOf("<img")===0?!!e.match(/src\s*=\s*["']data:image\//)&&!/<script/i.test(e)&&!/\son[a-z]+\s*=/i.test(e):!1}function E2(){try{const e=localStorage.getItem(qh);if(e===null)return null;const t=JSON.parse(e);if(Array.isArray(t))return t.filter(i=>i&&typeof i.title=="string")}catch{}return null}function ts(){try{localStorage.setItem(qh,JSON.stringify(te.slice(0,ec)))}catch{}}const Vh=[{id:"n1",app:"信息 / Messages",appId:"msg",iconSvg:v.notification_chat,title:"Google Pixel 团队",desc:"全新 Material 3 Expressive 设计规范已全量上线，体验更专业的独立双分栏与矢量动效！",time:"2分钟前",category:"Conversations / 会话通知"},{id:"n2",app:"Google 日历",appId:"cal_app",iconSvg:v.notification_calendar,title:"下午 3:00 - 项目架构评审与矢量 UI 验收",desc:"地点: 线上会议室 A | 参会人员: 核心设计团队与系统架构组",time:"25分钟前",category:"Conversations / 会话通知"},{id:"n3",app:"系统更新",appId:"settings",iconSvg:v.notification_system,title:"Android 16 (BP31) 系统体验已更新",desc:"已优化控制中心音量/亮度独立滑块，升级高保真 Material You 色彩流",time:"1小时前",category:"Silent / 静音与系统通知"}],Wh=E2();let te=Wh??[...Vh];Wh===null&&ts();let dl=null;function va(){dl||(dl=setTimeout(()=>{dl=null;try{window.dispatchEvent(new CustomEvent("notifications-changed"))}catch{}},0))}function Yh(){return[...te]}function Io(e){return e&&e.appId&&ho(e.appId)?J(e.appId):e&&jh(e.iconSvg)?e.iconSvg:v.notification_system}function bd(e){return!!(e&&e.appId&&ho(e.appId))}function _2(){Lp(),Wn(),T2(),L2(),window.__notiCalSyncBound||(window.__notiCalSyncBound=!0,window.addEventListener("storage",i=>{i&&i.key&&(i.key===$h||i.key.indexOf(Hh)===0)&&Lp()}));const e=document.getElementById("notiClearAllBtn");e&&(e.innerHTML=`${v.clear_all}<span>清除全部</span>`,e.addEventListener("click",()=>{Gh(),te=[],Wn(),ts(),va(),navigator.vibrate&&navigator.vibrate(20)}));const t=document.getElementById("notiHistoryBtn");t&&(t.innerHTML=`${v.history}<span>历史记录</span>`)}function Wn(){const e=document.getElementById("notificationsContainer");if(!e)return;if(te.length===0){e.innerHTML=`
      <div style="text-align:center;padding:50px 20px;opacity:0.6;font-size:14px;display:flex;flex-direction:column;align-items:center;gap:10px;">
        <div style="color:var(--md-primary,#a8c7fa);">${v.sound_notifications}</div>
        <span>暂无待处理的新通知</span>
      </div>
    `;return}e.innerHTML="";const t={};te.forEach(i=>{t[i.category]||(t[i.category]=[]),t[i.category].push(i)}),Object.keys(t).forEach(i=>{const n=document.createElement("div");n.className="noti-section-header",n.innerHTML=`
      <span>${jt(i)}</span>
      <span style="font-size:11px;opacity:0.7;">${t[i].length} 条</span>
    `,e.appendChild(n);const s=document.createElement("div");s.className="noti-card-group",t[i].forEach(a=>{const r=document.createElement("div");r.className="noti-card",r.dataset.id=a.id,r.style.cursor="pointer";const l=bd(a);r.innerHTML=`
        <div class="noti-card-icon ${l?"noti-card-icon--app":""}">${Io(a)}</div>
        <div class="noti-card-content">
          <div class="noti-card-top">
            <span class="noti-card-appname">${jt(a.app)}</span>
            <span class="noti-card-time">${jt(a.time)}</span>
          </div>
          <div class="noti-card-title">${jt(a.title)}</div>
          <div class="noti-card-desc">${jt(a.desc)}</div>
        </div>
      `,r.addEventListener("click",c=>{if(r._isSwiping)return;const p=r.querySelector(".noti-card-icon")?.getBoundingClientRect()||null;if(qe(),Xh(a.deepLink,p))return;const h=a.appId||(a.app.includes("信息")?"msg":a.app.includes("日历")?"calendar":"settings"),f=F.findIndex(m=>m.id===h);f!==-1&&j(f,null,p)});let d=0;r.addEventListener("pointerdown",c=>{c.stopPropagation(),d=c.clientX,r._isSwiping=!1;let p=!1;try{r.setPointerCapture(c.pointerId),p=!0}catch{}const h=m=>{m.stopPropagation();const y=m.clientX-d,g=160+(Math.abs(y)-160)*.35,w=Math.abs(y)<=160?y:Math.sign(y)*g;Math.abs(w)>6&&(r._isSwiping=!0),r.style.transform=`translate3d(${w}px, 0, 0)`,r.style.opacity=Math.max(0,1-Math.abs(w)/200).toString()},f=m=>{if(m.stopPropagation(),p){try{r.releasePointerCapture(m.pointerId)}catch{}r.removeEventListener("pointermove",h),r.removeEventListener("pointerup",f),r.removeEventListener("pointercancel",f)}else window.removeEventListener("pointermove",h),window.removeEventListener("pointerup",f),window.removeEventListener("pointercancel",f);const y=m.clientX-d;Math.abs(y)>85?(r.style.transition="transform 0.22s ease, opacity 0.22s ease",r.style.transform=`translate3d(${y>0?320:-320}px, 0, 0)`,r.style.opacity="0",a.id===Co&&Gh(),setTimeout(()=>{te=te.filter(g=>g.id!==a.id),Wn(),ts(),va()},220)):(r.style.transition="transform 0.2s ease, opacity 0.2s ease",r.style.transform="",r.style.opacity="")};p?(r.addEventListener("pointermove",h),r.addEventListener("pointerup",f),r.addEventListener("pointercancel",f)):(window.addEventListener("pointermove",h),window.addEventListener("pointerup",f),window.addEventListener("pointercancel",f))}),s.appendChild(r)}),e.appendChild(s)})}function T2(){const e=document.getElementById("pixelMediaCard"),t=document.getElementById("mediaCoverIcon"),i=document.getElementById("mediaPrevBtn"),n=document.getElementById("mediaNextBtn"),s=document.getElementById("mediaPlayPauseBtn"),a=document.getElementById("mediaTrackTitle"),r=document.getElementById("mediaArtistName"),l=document.getElementById("mediaProgressBar"),d=document.querySelector(".media-progress-track");t&&(t.innerHTML=v.song_search),i&&(i.innerHTML=v.skip_prev,i.addEventListener("click",c=>{c.stopPropagation(),rt.prev(),navigator.vibrate&&navigator.vibrate(15)})),n&&(n.innerHTML=v.skip_next,n.addEventListener("click",c=>{c.stopPropagation(),rt.next(),navigator.vibrate&&navigator.vibrate(15)})),s&&s.addEventListener("click",c=>{c.stopPropagation(),rt.togglePlay(),navigator.vibrate&&navigator.vibrate(15)}),e&&e.addEventListener("click",c=>{if(c.target.closest("button")||c.target.closest(".media-progress-track"))return;const p=document.getElementById("mediaCoverIcon")?.getBoundingClientRect()||null;qe();const h=F.findIndex(f=>f.id==="music");h!==-1&&j(h,null,p)}),d&&d.addEventListener("click",c=>{c.stopPropagation();const p=d.getBoundingClientRect(),h=(c.clientX-p.left)/p.width*100;rt.seek(h)}),rt.subscribe(c=>{e&&(c.isPlaying?(e.classList.remove("media-hidden"),e.classList.add("media-playing")):e.classList.remove("media-playing"),c.track&&c.track.coverGradient&&(e.style.background=c.track.coverGradient)),a&&(a.textContent=c.track.title),r&&(r.textContent=`${c.track.artist} • ${c.track.album||"电台"}`),l&&(l.style.width=`${c.progress.toFixed(1)}%`),s&&(s.innerHTML=c.isPlaying?v.pause:v.play)})}function M2(e){if(!e)return!1;if(e===window)return!0;const t=document.querySelectorAll("iframe");for(let i=0;i<t.length;i++)try{if(t[i].contentWindow===e)return!0}catch{}return!1}function L2(){window.addEventListener("message",e=>{if(M2(e.source)&&!(!e.data||!e.data.type)){if(e.data.type==="NEW_MESSAGE_NOTIFICATION"){const t=e.data.payload;Or({id:t.id||"msg-"+Date.now(),app:t.appName||"信息 / Messages",appId:"msg",iconSvg:v.notification_chat,title:t.title,desc:t.desc,time:t.time||"刚刚",category:"Conversations / 会话通知"})}if(e.data.type==="NOTIFY"&&e.data.payload){const t=e.data.payload,i=jh(t.iconSvg)?t.iconSvg:v.notification_system;Or({id:t.id||"notify-"+Date.now(),app:t.appName||"系统服务",appId:t.appId||"",iconSvg:i,title:String(t.title||"通知"),desc:String(t.desc||t.body||""),time:"刚刚",category:t.category||"应用通知 / App Notifications"})}if(e.data.type==="DELETE_MESSAGE_NOTIFICATION"){const t=e.data.payload;t&&(te=te.filter(i=>!(t.notiId&&(i.id===t.notiId||i.id==="msg-"+t.notiId)||t.text&&i.desc&&i.desc.trim()===t.text.trim()||t.chatName&&i.title&&i.title.includes(t.chatName))),Wn(),ts(),va())}if(e.data.type==="SWITCH_PERSONA_NOTIFICATION"){const t=e.data.payload;A2(`切换身份：${t.name}`)}}})}function C2(e){return{id:Co,app:"日历",appId:"cal_app",iconSvg:v.notification_calendar,title:e.title,desc:e.desc,time:k2(e.latestUpdated),category:"应用通知 / App Notifications",deepLink:{appId:"cal_app",event:"calendar/prefill",payload:{date:e.key,view:"day"}},__digest:e.digest}}function Lp(){let e=null;try{e=b2(w2(window.localStorage))}catch{return}const t=e?e.digest:"demo",i=te.findIndex(s=>s.id===Co);let n=!1;if(e){const s=C2(e);if(i===-1){let a=null;try{a=localStorage.getItem(Nh)}catch{}if(a===t)return;te.unshift(s),n=!0}else(te[i].title!==s.title||te[i].desc!==s.desc)&&(te[i]=s,n=!0)}else i!==-1&&te[i].deepLink&&(te[i]={...Vh[1]},n=!0);n&&(Wn(),ts(),va())}function Gh(){const e=te.findIndex(t=>t.id===Co);if(e!==-1)try{localStorage.setItem(Nh,te[e].__digest||"demo")}catch{}}function Xh(e,t){if(!e||!e.appId||!e.event)return!1;const i=F.findIndex(n=>n.id===e.appId);return i===-1?!1:(at(e.appId,e.event,Object.assign({},e.payload||{},{__silent:!0}),"notifications"),j(i,null,t),!0)}function Or(e){if(e&&e.id){const t=te.findIndex(i=>i.id===e.id);t!==-1?te[t]=e:te.unshift(e)}else te.unshift(e);te.length>ec&&(te.length=ec),Wn(),ts(),va(),!document.body.classList.contains("dnd-mode-active")&&I2(e)}function I2(e){let t=document.getElementById("headsUpBanner");t||(t=document.createElement("div"),t.id="headsUpBanner",t.style.cssText=`
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%) translateY(-100px);
      width: calc(100% - 32px); max-width: 420px; background: rgba(23, 29, 27, 0.94);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      color: #FFFFFF; border-radius: 28px; padding: 14px 18px; z-index: 10005;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 14px;
      cursor: pointer; transition: all 0.3s cubic-bezier(0.2, 0.95, 0.25, 1);
    `,t.addEventListener("click",()=>{t.style.transform="translateX(-50%) translateY(-100px)";const n=t._item;if(!n)return;const s=t.querySelector("div"),a=s?s.getBoundingClientRect():null;if(Xh(n.deepLink,a))return;let r=-1;n.appId?r=F.findIndex(l=>l.id===n.appId):r=F.findIndex(l=>l.id==="msg"),r!==-1&&j(r,null,a)}),document.body.appendChild(t));const i=bd(e)?"width:38px;height:38px;border-radius:12px;overflow:hidden;flex-shrink:0;":"width:38px;height:38px;border-radius:50%;background:var(--md-primary,#7df8db);color:#000;display:flex;align-items:center;justify-content:center;flex-shrink:0;";t.innerHTML=`
    <div style="${i}">
      ${Io(e)}
    </div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
        <span style="font-size:12px;font-weight:600;color:var(--md-primary,#7df8db);">${jt(e.app)}</span>
        <span style="font-size:11px;opacity:0.6;">${jt(e.time)}</span>
      </div>
      <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${jt(e.title)}</div>
      <div style="font-size:12px;opacity:0.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${jt(e.desc)}</div>
    </div>
  `,t._item=e,t.style.transform="translateX(-50%) translateY(0)",lt("notify"),navigator.vibrate&&navigator.vibrate([20,50,20]),clearTimeout(t._hideTimer),t._hideTimer=setTimeout(()=>{t.style.transform="translateX(-50%) translateY(-100px)"},4200)}function A2(e){let t=document.getElementById("headsUpPill");t||(t=document.createElement("div"),t.id="headsUpPill",t.style.cssText=`
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%) translateY(-60px);
      background: rgba(0, 107, 90, 0.9); backdrop-filter: blur(16px);
      color: #FFFFFF; border-radius: 20px; padding: 6px 16px; z-index: 10006;
      font-size: 12px; font-weight: 500; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      transition: all 0.25s cubic-bezier(0.2, 0.9, 0.3, 1); pointer-events: none;
    `,document.body.appendChild(t)),t.textContent=e,t.style.transform="translateX(-50%) translateY(0)",clearTimeout(t._timer),t._timer=setTimeout(()=>{t.style.transform="translateX(-50%) translateY(-60px)"},2e3)}let ra=85,En=!1,tc=typeof navigator.onLine=="boolean"?navigator.onLine:!0,ic=!1;function Cp(e){return String(e??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Uh(){let e=[];try{e=Yh()||[]}catch{e=[]}let i=e.slice(0,4).map(n=>{const s=Io(n);return`<span class="status-icon noti-st-icon" data-noti-id="${Cp(n&&n.id)}" title="${Cp(n&&n.app)}">${s}</span>`}).join("");if(e.length>4){const n=e.length-4;i+=`<span class="noti-st-more" title="还有 ${n} 条通知">+${n>9?"9+":n}</span>`}return i+=`<span class="status-icon noti-music-icon" style="display:${ic?"inline-flex":"none"};color:var(--md-primary,#7df8db);">${v.music_note}</span>`,i}function Ip(e=!0){return`
    <div class="status-left">
      <span class="status-time">12:00</span>
      ${e?`
    <span class="status-noti-icons">${Uh()}</span>`:""}
    </div>
    <div class="status-right">
      <span class="status-icon wifi-icon">${tc?v.wifi:v.wifi_off}</span>
      <span class="status-icon cellular-icon">${v.cellular}</span>
      <span class="status-icon" style="font-size:11px;font-weight:700;letter-spacing:-0.2px;">5G</span>
      <div class="battery-pill ${En?"is-charging":""}">
        <span class="battery-charging-indicator" style="display:${En?"inline-flex":"none"};margin-right:2px;color:var(--md-primary,#7df8db);">${v.battery_charging}</span>
        <span class="battery-pct">${ra}%</span>
        <div class="battery-icon-shape">
          <div class="battery-icon-level" style="width:${ra}%"></div>
        </div>
      </div>
    </div>
  `}function Kh(){const e=`${ra}%`,t=`${ra}%`;document.querySelectorAll(".battery-pct").forEach(n=>{n.textContent!==e&&(n.textContent=e)}),document.querySelectorAll(".battery-icon-level").forEach(n=>{n.style.width!==t&&(n.style.width=t)}),document.querySelectorAll(".battery-pill").forEach(n=>{n.classList.contains("is-charging")!==En&&n.classList.toggle("is-charging",En)});const i=En?"inline-flex":"none";document.querySelectorAll(".battery-charging-indicator").forEach(n=>{n.style.display!==i&&(n.style.display=i)})}function Qh(){const e=Uh();document.querySelectorAll(".status-noti-icons").forEach(t=>{t.dataset.notiHtml!==e&&(t.dataset.notiHtml=e,t.innerHTML=e)})}typeof window<"u"&&window.addEventListener("notifications-changed",Qh);function pl(e){he(()=>Promise.resolve().then(()=>Md),void 0,import.meta.url).then(t=>{try{t.syncTileState("internet",{active:e})}catch{}}).catch(()=>{})}function P2(){if(typeof window<"u"){window.addEventListener("online",()=>{js(!0),pl(!0)}),window.addEventListener("offline",()=>{js(!1),pl(!1)});const e=navigator.connection||navigator.mozConnection||navigator.webkitConnection;e&&e.addEventListener("change",()=>{const t=navigator.onLine!==!1&&e.effectiveType!=="none";js(t),pl(t)})}}function Jh(){const e=new Date,t=e.getHours().toString().padStart(2,"0"),i=e.getMinutes().toString().padStart(2,"0"),n=`${t}:${i}`;document.querySelectorAll(".status-time, #clock").forEach(d=>{d.textContent!==n&&(d.textContent=n)});const s=["周日","周一","周二","周三","周四","周五","周六"],a=["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],l=`${s[e.getDay()]}, ${a[e.getMonth()]}${e.getDate()}日`;document.querySelectorAll(".panel-big-clock").forEach(d=>{d.textContent!==n&&(d.textContent=n)}),document.querySelectorAll(".panel-date").forEach(d=>{d.textContent!==l&&(d.textContent=l)}),Kh()}function js(e){tc=e,document.querySelectorAll(".wifi-icon").forEach(t=>{t.innerHTML=tc?v.wifi:v.wifi_off})}let Ap=0;function Zh(){clearTimeout(Ap);const e=Date.now(),t=(Math.floor(e/6e4)+1)*6e4+1e3;Ap=setTimeout(()=>{Jh(),Zh()},Math.max(1e3,t-Date.now()))}function B2(){const e=document.querySelector(".status-bar");if(e&&(e.innerHTML=Ip(!0)),u.appWindow){let t=u.appWindow.querySelector(".app-window-status-bar");t||(t=document.createElement("div"),t.className="app-window-status-bar",u.appWindow.insertBefore(t,u.appWindow.firstChild)),t.innerHTML=Ip(!1)}rt.subscribe(t=>{ic=t.isPlaying,document.querySelectorAll(".noti-music-icon").forEach(i=>{i.style.display=ic?"inline-flex":"none"})}),ud(t=>{ra=t.level,En=t.charging,Kh()}),P2(),Qh(),Jh(),Zh()}const F2=.25,D2=.55,z2=.1,R2=ot(.52,.94,1);let P=null,Mt=!1,At=null,dn=null,ft="idle",Ao=!1;function Na(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}const O2='<svg viewBox="0 0 24 24" style="width:1.35em;height:1.35em;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round"><path d="M5 14.5 L12 8 L19 14.5"/></svg>',$2='<svg viewBox="0 0 24 24" style="width:1.3em;height:1.3em;fill:currentColor"><path d="M6 2h12v3l-3 4v11c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2V9L6 5V2zm2 2v.6l3 4V20h2V8.6l3-4V4H8zm3 6h2v3h-2v-3z"/></svg>',H2='<svg viewBox="0 0 24 24" style="width:1.3em;height:1.3em;fill:currentColor"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M9 3 7.2 5H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.2L15 3H9zm3 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>';function N2(e){return`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`}function q2(e){const t=["日","一","二","三","四","五","六"];return`${e.getMonth()+1}月${e.getDate()}日 星期${t[e.getDay()]}`}function $r(){if(!P)return;const e=new Date,t=P.querySelector(".lock-clock"),i=P.querySelector(".lock-date");t&&(t.textContent=N2(e)),i&&(i.textContent=q2(e))}function Sd(){if(!P)return;const e=P.querySelector(".lock-wallpaper");if(e)try{if(pa()){const n=po();if(n){e.style.backgroundImage=`url("${n}")`;return}}const t=da();if(t){e.style.backgroundImage=`url("${t}")`;return}const i=document.getElementById("desktop");if(i){const n=getComputedStyle(i).backgroundImage;if(n&&n!=="none"){e.style.backgroundImage=n;return}}e.style.backgroundImage=""}catch{e.style.backgroundImage=""}}function Hr(){if(!P)return;const e=P.querySelector(".lock-notifications");if(!e)return;const t=Yh().slice(0,4);if(e.innerHTML="",t.length===0){e.innerHTML='<div class="lock-noti-empty">暂无新通知</div>';return}t.forEach(i=>{const n=document.createElement("div");n.className="lock-noti-card",n.innerHTML=`
      <div class="lock-noti-icon ${bd(i)?"lock-noti-icon--app":""}">${Io(i)}</div>
      <div class="lock-noti-body">
        <div class="lock-noti-top">
          <span class="lock-noti-app">${Na(i.app)}</span>
          <span class="lock-noti-time">${Na(i.time)}</span>
        </div>
        <div class="lock-noti-title">${Na(i.title)}</div>
        <div class="lock-noti-desc">${Na(i.desc)}</div>
      </div>
    `,n.addEventListener("click",()=>{if(Ao)return;const s=i.appId||"msg",a=F.findIndex(c=>c.id===s);if(a===-1)return;const r=n.querySelector(".lock-noti-icon"),l=r?r.getBoundingClientRect():null,d=i.deepLink;if(d&&d.appId&&d.event)try{at(d.appId,d.event,Object.assign({},d.payload||{},{__silent:!0}),"lockscreen")}catch{}im(a,l)}),e.appendChild(n)})}function kd(){if(P)return;P=document.createElement("div"),P.id="lockScreen",P.className="lock-screen",P.innerHTML=`
    <div class="lock-wallpaper"></div>
    <div class="lock-dim"></div>
    <div class="lock-content">
      <div class="lock-top-area">
        <div class="lock-badge">${v.lock}</div>
        <div class="lock-date">1月1日 星期四</div>
        <div class="lock-clock">00:00</div>
      </div>
      <div class="lock-notifications"></div>
      <div class="lock-bottom-area">
        <button class="lock-quick-btn" id="lockTorchBtn" aria-label="手电筒">${$2}</button>
        <div class="lock-unlock-hint">
          <span class="lock-hint-chevron">${O2}</span>
          <span>向上轻扫以解锁</span>
        </div>
        <button class="lock-quick-btn" id="lockCameraBtn" aria-label="相机">${H2}</button>
      </div>
    </div>
  `,document.body.appendChild(P),$r(),Sd(),Hr(),setInterval($r,1e4);const e=P.querySelector("#lockTorchBtn");e&&e.addEventListener("click",i=>{i.stopPropagation();const n=document.querySelector('[data-tile-id="torch"]');n&&n.click(),n?e.classList.toggle("active",n.classList.contains("active")):e.classList.toggle("active")});const t=P.querySelector("#lockCameraBtn");t&&t.addEventListener("click",i=>{i.stopPropagation();const n=F.findIndex(a=>a.id==="camera");if(n===-1)return;const s=t.getBoundingClientRect();im(n,s)}),j2(),window.addEventListener("notifications-changed",()=>{Mt&&Hr()})}function j2(){let e=!1,t=0,i=0,n=0,s=0,a=0,r=0,l=null;const d=()=>((!l||!l.isConnected)&&(l=P.querySelector(".lock-content")),l);let c=0,p=0,h=0;const f=(S,b)=>{P.style.transform=`translate3d(0, ${(-S).toFixed(1)}px, 0)`;const _=d();if(_){const A=Math.max(0,Math.min(1,b));_.style.opacity=(1-A).toFixed(3),_.style.transform=`translate3d(0, ${(S*-.16).toFixed(1)}px, 0)`}},m=(S,b)=>{p=S,h=b,!c&&(c=requestAnimationFrame(()=>{c=0,f(p,h)}))},y=()=>{c&&(cancelAnimationFrame(c),c=0)},g=()=>window.innerHeight||820,w=S=>{if(!e||ft!=="drag")return;const b=t-S.clientY,_=performance.now(),A=Math.max(1,_-s);a=(b-n)/A,n=b,s=_,r=b>0?b:b*.15;const I=Math.max(0,r)/(g()*.9);m(r,I)},k=S=>{if(!e||ft!=="drag")return;e=!1,y(),window.removeEventListener("pointermove",w),window.removeEventListener("pointerup",k),window.removeEventListener("pointercancel",k);const b=r,A=performance.now()-i<260?a:0,I=g();if(Math.abs(b)<6&&Math.abs(A)<.2){ft="idle",P.style.transform="translate3d(0, 0, 0)";return}const q=b>I*F2||A>D2&&b>I*z2;Ao=q,V2(q,b,q?Math.max(A,.6):A)};P.addEventListener("pointerdown",S=>{ft!=="spring"&&(e=!0,ft="drag",t=S.clientY,i=performance.now(),n=0,s=i,a=0,r=0,P.style.transition="none",window.addEventListener("pointermove",w),window.addEventListener("pointerup",k),window.addEventListener("pointercancel",k))})}function V2(e,t,i){ft="spring";const n=window.innerHeight||820;dn=new Ie({...R2,initialValue:t,initialVelocity:i*1e3}),dn.target=e?n*1.15:0,e&&J2();let s=performance.now();const a=()=>((!r||!r.isConnected)&&(r=P.querySelector(".lock-content")),r);let r=null;const l=d=>{const c=Math.min(.05,(d-s)/1e3);s=d,dn.update(c);const p=dn.x,h=a();if(e){const f=Math.max(0,1-Math.max(0,p)/(n*.9));if(P.style.transform=`translate3d(0, ${(-p).toFixed(1)}px, 0)`,P.style.opacity=f.toFixed(3),h&&(h.style.opacity="1"),dn.isSettled(.5,30)||f<=.01){W2();return}}else{if(P.style.transform=`translate3d(0, ${(-p).toFixed(1)}px, 0)`,h){const f=Math.max(0,1-Math.max(0,p)/(n*.9));h.style.opacity=f.toFixed(3),h.style.transform=`translate3d(0, ${(p*-.16).toFixed(1)}px, 0)`}if(dn.isSettled(.5,30)){P.style.transform="translate3d(0, 0, 0)",h&&(h.style.opacity="",h.style.transform=""),ft="idle",Ao=!1;return}}At=requestAnimationFrame(l)};At=requestAnimationFrame(l)}function W2(){At&&cancelAnimationFrame(At),At=null,ft="idle",Ao=!1,Mt=!1,P.style.display="none",P.style.transform="",P.style.opacity="",P.style.transition="";const e=P.querySelector(".lock-content");e&&(e.style.opacity="",e.style.transform=""),document.body.classList.remove("is-locked")}const em="ios-desktop:unlock-anim-style";function tm(){try{return localStorage.getItem(em)==="android"?"android":"ios"}catch{return"ios"}}function Y2(e){if(!(e!=="ios"&&e!=="android")){try{localStorage.setItem(em,e)}catch{}document.dispatchEvent(new CustomEvent("unlock-style-changed",{detail:{style:e}}))}}const qa=54,Pp=9,G2=620,ul=360,X2=520,Bp=20,Fp=140;let fl=0,Dp=0;function U2(){try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{return!1}}function K2(e){const i=e.map(s=>{const a=s.getBoundingClientRect();return{el:s,top:a.top,left:a.left}});i.sort((s,a)=>s.top-a.top||s.left-a.left);const n=[];for(const s of i){const a=n[n.length-1];a&&Math.abs(s.top-a.top)<=12?a.items.push(s):n.push({top:s.top,items:[s]})}return n}function hl(){document.querySelectorAll(".unlock-icon-in, .unlock-icon-in-ios, .unlock-icon-in-android, .unlock-icon-fade").forEach(i=>{i.classList.remove("unlock-icon-in","unlock-icon-in-ios","unlock-icon-in-android","unlock-icon-fade"),i.style.animationDelay="",i.style.removeProperty("--radial-dx"),i.style.removeProperty("--radial-dy")});const e=document.getElementById("pixelAtAGlance");e&&(e.classList.remove("unlock-glance-in"),e.style.animationDelay="");const t=document.getElementById("pageDots");t&&(t.classList.remove("unlock-dots-in"),t.style.animationDelay="")}function Q2(e){const t=document.getElementById("desktop");if(!t)return;t.querySelectorAll(".unlock-ripple-ring").forEach(s=>s.remove());const i=Math.max(240,Math.ceil(e*2+140)),n=document.createDocumentFragment();for(let s=0;s<2;s++){const a=document.createElement("div");a.className="unlock-ripple-ring"+(s===1?" unlock-ripple-ring--second":""),a.style.width=`${i}px`,a.style.height=`${i}px`,a.setAttribute("aria-hidden","true"),n.appendChild(a)}t.appendChild(n),clearTimeout(Dp),Dp=setTimeout(()=>{t.querySelectorAll(".unlock-ripple-ring").forEach(s=>s.remove())},1e3)}function J2(){clearTimeout(fl);const e=document.getElementById("desktopSlider");if(!e)return 0;const t=Array.from(e.children).find(l=>{const d=l.getBoundingClientRect();return d.width>0&&d.right>0&&d.left<window.innerWidth});if(!t)return 0;const i=Array.from(t.querySelectorAll(".app-icon, .app-folder"));if(i.length===0)return 0;const n=tm();if(hl(),U2())return i.forEach(l=>l.classList.add("unlock-icon-fade")),fl=setTimeout(hl,460),400;t.offsetWidth;const s=document.getElementById("pixelAtAGlance"),a=document.getElementById("pageDots");let r=0;if(n==="android"){const l=window.innerWidth/2,d=window.innerHeight/2,c=Math.hypot(l,d)||1;let p=0;i.forEach(h=>{const f=h.getBoundingClientRect(),m=f.left+f.width/2,y=f.top+f.height/2,g=Math.hypot(m-l,y-d),w=M(g/c,0,1),k=g>0?(m-l)/g:0,S=g>0?(y-d)/g:0;h.style.setProperty("--radial-dx",`${(-k*Bp).toFixed(1)}px`),h.style.setProperty("--radial-dy",`${(-S*Bp).toFixed(1)}px`);const b=Math.round(Math.pow(w,.9)*ul);b>p&&(p=b),h.style.animationDelay=`${b}ms`,h.classList.add("unlock-icon-in-android")}),Q2(c),s&&(s.style.animationDelay=`${Math.round(ul*.3)}ms`,s.classList.add("unlock-glance-in")),a&&(a.style.animationDelay=`${Math.round(ul*.75)}ms`,a.classList.add("unlock-dots-in")),r=p+X2}else{const l=K2(i);l.forEach((d,c)=>{const p=(l.length-1-c)*qa;d.items.forEach((h,f)=>{h.el.style.animationDelay=`${p+f*Pp}ms`,h.el.classList.add("unlock-icon-in-ios")})}),s&&(s.style.animationDelay=`${Math.round(qa*1.2)}ms`,s.classList.add("unlock-glance-in")),a&&(a.style.animationDelay=`${Math.round(qa*.6)}ms`,a.classList.add("unlock-dots-in")),r=Math.max(0,l.length-1)*qa+2*Pp+G2}return fl=setTimeout(hl,r+Fp),r+Fp}let ja=null;function Z2(){P.style.transition="none",P.style.transform="translate3d(0, -100%, 0)",P.style.opacity="0",requestAnimationFrame(()=>{requestAnimationFrame(()=>{P.style.transition="transform 0.55s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease",P.style.transform="translate3d(0, 0, 0)",P.style.opacity="1",ja&&clearTimeout(ja),ja=setTimeout(()=>{ja=null,P.isConnected&&(P.style.transition="",P.style.opacity="")},600)})})}function Yn(){kd(),!Mt&&(Mt=!0,document.body.classList.add("is-locked"),$r(),Sd(),Hr(),P.style.display="flex",Z2())}function im(e,t){if(kd(),Mt){ft==="spring"&&At&&cancelAnimationFrame(At),Mt=!1,ft="idle",P.style.display="none",P.style.transform="",P.style.opacity="",P.style.transition="";const n=P.querySelector(".lock-content");n&&(n.style.opacity="",n.style.transform=""),document.body.classList.remove("is-locked")}const i=t&&t.width>0&&Number.isFinite(t.left)?t:null;j(e,null,i)}typeof window<"u"&&(window.__lockTest={isLocked:()=>Mt,lock:()=>Yn(),instantUnlock:()=>{if(!P){Mt=!1,document.body.classList.remove("is-locked");return}At&&cancelAnimationFrame(At),At=null,ft="idle",Mt=!1,P.style.display="none",P.style.transform="",P.style.opacity="",P.style.transition="",document.body.classList.remove("is-locked")},instantLock:()=>{kd(),Mt=!0,document.body.classList.add("is-locked"),$r(),Sd(),Hr(),P.style.transition="none",P.style.display="flex",P.style.transform="translate3d(0, 0, 0)",P.style.opacity="1"}});function ew(){if(new URLSearchParams(window.location.search||"").has("nolock")){document.body.classList.remove("is-locked");return}Yn()}const nm="ios-desktop:qs-tile-sizes",Be=Object.freeze({WIDE:"wide",SMALL:"small"}),tw=Object.freeze({internet:Be.WIDE,bluetooth:Be.WIDE,modes:Be.WIDE});function ya(e){return e===Be.SMALL?Be.SMALL:Be.WIDE}function iw(e){try{const t=e&&e.getItem(nm);if(!t)return{};const i=JSON.parse(t);if(!i||typeof i!="object"||Array.isArray(i))return{};const n={};for(const s of Object.keys(i))n[s]=ya(i[s]);return n}catch{return{}}}function Ed(e,t){try{t&&t.setItem(nm,JSON.stringify(e||{}))}catch{}}function _d(e,t){const i=t&&typeof t=="object"?t:{},n={};for(const s of e||[]){const a=Object.prototype.hasOwnProperty.call(i,s.id)?i[s.id]:tw[s.id]||Be.SMALL;s.size=ya(a),n[s.id]=s.size}return n}function nw(e){const t={};for(const i of e||[])t[i.id]=ya(i.size);return t}function sw(e,t,i){return{...e||{},[t]:ya(i)}}function zp(e,t){const i=ya(e);return i===Be.WIDE&&t<=-28?{size:Be.SMALL,changed:!0}:i===Be.SMALL&&t>=28?{size:Be.WIDE,changed:!0}:{size:i,changed:!1}}function aw(e){return Math.max(-44,Math.min(44,e))}const rw='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',sm=[{id:"internet",name:"Internet",sub:"中国移动 5G Wi-Fi",iconKey:"wifi",active:!0},{id:"bluetooth",name:"Bluetooth",sub:"Pixel Buds Pro",iconKey:"bluetooth",active:!0},{id:"darktheme",name:"Dark theme",sub:"深色模式",iconKey:"darktheme",active:!0},{id:"torch",name:"Torch",sub:"手电筒",iconKey:"torch",active:!1},{id:"modes",name:"Modes",sub:"勿扰模式",iconKey:"modes",active:!1},{id:"focus",name:"Focus",sub:"番茄钟 · 专注",iconKey:"focus_mode",active:!1},{id:"profile",name:"Profile",sub:"个人 / 工作模式",iconKey:"person",active:!1},{id:"autorotate",name:"Auto-rotate",sub:"自动旋转",iconKey:"autorotate",active:!0},{id:"battery_saver",name:"Battery Saver",sub:"省电模式",iconKey:"battery_saver",active:!1},{id:"lock_screen",name:"锁屏",sub:"立即锁定屏幕",iconKey:"lock",active:!1},{id:"qrcode",name:"QR code",sub:"扫一扫",iconKey:"qrcode",active:!1},{id:"screen_record",name:"Screen record",sub:"屏幕录制",iconKey:"screen_record",active:!1},{id:"wallet",name:"Wallet",sub:"谷歌钱包",iconKey:"wallet",active:!1},{id:"mic_access",name:"Mic access",sub:"麦克风权限",iconKey:"mic_access",active:!0},{id:"camera_access",name:"Camera access",sub:"相机权限",iconKey:"camera_access",active:!0},{id:"quick_share",name:"Quick Share",sub:"快传服务",iconKey:"quick_share",active:!0},{id:"cast",name:"Cast",sub:"无线投屏",iconKey:"cast",active:!1},{id:"alarm",name:"Alarm",sub:"未设置闹钟",iconKey:"alarm",active:!1},{id:"aeroplane",name:"Aeroplane",sub:"飞行模式",iconKey:"aeroplane",active:!1}],am=[{category:"Accessibility / 无障碍辅助",tiles:[{id:"colour_correction",name:"Colour correction",sub:"色彩校正",iconKey:"colour_correction"},{id:"colour_inversion",name:"Colour inversion",sub:"色彩反转",iconKey:"colour_inversion"},{id:"hearing_devices",name:"Hearing devices",sub:"助听设备",iconKey:"hearing_devices"},{id:"one_handed",name:"One-handed mode",sub:"单手模式",iconKey:"one_handed"}]},{category:"From system apps / 系统功能",tiles:[{id:"calculator",name:"Calculator",sub:"计算器",iconKey:"calculator"},{id:"focus_mode",name:"Focus mode",sub:"专注模式",iconKey:"focus_mode"},{id:"live_caption",name:"Live Caption",sub:"实时字幕",iconKey:"live_caption"},{id:"live_transcribe",name:"Live Transcribe",sub:"实时转写",iconKey:"live_transcribe"},{id:"recorder",name:"Recorder",sub:"录音机",iconKey:"recorder"},{id:"song_search",name:"Song search",sub:"听歌识曲",iconKey:"song_search"},{id:"sound_notifications",name:"Sound notifications",sub:"声音通知",iconKey:"sound_notifications"},{id:"storage",name:"Storage",sub:"存储空间",iconKey:"storage"},{id:"vpn",name:"VPN",sub:"虚拟网络",iconKey:"vpn"}]}];let le=[...sm],mn=JSON.parse(JSON.stringify(am)),Nr=[],Wi=_d(le,iw(typeof localStorage<"u"?localStorage:null)),ml=null;function rm(){fm(),ei(),dw(),hw(),vw(),ow();const e=document.getElementById("qsEditBtn");e&&(e.innerHTML=v.edit,e.addEventListener("click",n=>{n.stopPropagation(),hm()}));const t=document.getElementById("qsSettingsBtn");t&&(t.innerHTML=v.settings,t.addEventListener("click",n=>{n.stopPropagation(),qe();const s=F.findIndex(a=>a.id==="settings");if(s!==-1){const a=document.querySelector('[data-id="settings"]');j(s,a)}}));const i=document.getElementById("qsPowerBtn");i&&(i.innerHTML=v.power,i.addEventListener("click",n=>{n.stopPropagation(),gm()}))}function ow(){document.querySelectorAll(".panel-carrier-icon").forEach(e=>{e.innerHTML=v.cellular})}function ei(){const e=document.getElementById("qsTilesContainer");e&&(e.innerHTML="",le.forEach(t=>{const i=t.id==="darktheme"?Ct()==="dark":t.active,n=t.size===Be.SMALL,s=document.createElement("div");s.className=`qs-tile-pill ${n?"size-small":"size-wide"} ${i?"active":""}`,s.dataset.tileId=t.id;const r=`<div class="qs-tile-icon-wrap">${v[t.iconKey]||v.settings}</div>`,l=!n&&(t.id==="bluetooth"||t.id==="modes")?`<button class="qs-tile-zone2" data-zone2="${t.id}" aria-label="${t.id==="bluetooth"?"已配对设备":"模式清单"}">${rw}</button>`:"";n?s.innerHTML=r:s.innerHTML=`
      ${r}
      <div class="qs-tile-text">
        <span class="qs-tile-title">${t.name}</span>
        <span class="qs-tile-sub">${i?t.sub||"已开启":"已关闭"}</span>
      </div>
      ${l}
    `,s.addEventListener("click",c=>{if(c.stopPropagation(),t._sourceRect=s.getBoundingClientRect(),t.id==="lock_screen"){navigator.vibrate&&navigator.vibrate(20),lt("tick"),qe(),setTimeout(()=>Yn(),120);return}if(t.id==="internet"){navigator.vibrate&&navigator.vibrate(15),uw();return}if(t.id==="profile"){navigator.vibrate&&navigator.vibrate(20),lt("profile"),qe(),setTimeout(()=>{window.__profiles&&window.__profiles.toggle()},160);return}if(t.id==="qrcode"||t.id==="wallet"||t.id==="calculator"){navigator.vibrate&&navigator.vibrate(20),lt("tick"),Rp(t);return}lt("tick");const p=t.active;t.active=!t.active,t.id==="darktheme"&&(Jn(Ct()==="dark"?"light":"dark"),t.active=Ct()==="dark"),navigator.vibrate&&navigator.vibrate(20),t._squishPending=t.active===p?0:t.active?1:-1,lm(t),Rp(t)});const d=s.querySelector(".qs-tile-zone2");if(d&&d.addEventListener("click",c=>{c.stopPropagation(),navigator.vibrate&&navigator.vibrate(15),t.id==="bluetooth"?$p():t.id==="modes"&&fw()}),n&&t.id==="bluetooth"){let c=0,p=null;s.addEventListener("pointerdown",f=>{p={x:f.clientX,y:f.clientY},clearTimeout(c),c=setTimeout(()=>{c=0,navigator.vibrate&&navigator.vibrate(18),$p()},480)});const h=f=>{c&&(clearTimeout(c),c=0)};s.addEventListener("pointerup",h),s.addEventListener("pointercancel",h),s.addEventListener("pointermove",f=>{c&&p&&Math.hypot(f.clientX-p.x,f.clientY-p.y)>10&&(clearTimeout(c),c=0)})}e.appendChild(s)}),om())}const nc={on:380,off:300};function sc(e,t){if(!e||typeof e.classList!="object")return;const i=t?"squish-on":"squish-off",n=t?"squish-off":"squish-on";e.classList.remove(n),e.classList.remove(i),e.offsetWidth,e.classList.add(i);const s=t?nc.on:nc.off;setTimeout(()=>{e.classList.remove(i)},s+60)}function om(){const e=document.getElementById("qsTilesContainer");if(!e)return;const t=Array.from(e.querySelectorAll(".qs-tile-pill"));if(!t.length)return;const i=new Map;t.forEach(n=>{const s=n.offsetTop||0;i.has(s)||i.set(s,[]),i.get(s).push(n)}),i.forEach(n=>{const s=n.some(a=>a.classList.contains("active"));n.forEach(a=>{const r=a.classList.contains("active");a.classList.toggle("qs-grow",r&&s),a.classList.toggle("qs-squeeze",!r&&s)})})}function lm(e){const t=document.getElementById("qsTilesContainer");let i=t?t.querySelector(`.qs-tile-pill[data-tile-id="${e.id}"]`):null;if(!i&&(ei(),i=t?t.querySelector(`.qs-tile-pill[data-tile-id="${e.id}"]`):null,!i)){e._squishPending=0;return}const n=e.id==="darktheme"?Ct()==="dark":e.active,s=e.size===Be.SMALL,a=i.classList.contains("size-small");if(s!==a&&(ei(),i=t?t.querySelector(`.qs-tile-pill[data-tile-id="${e.id}"]`):null,!i)){e._squishPending=0;return}const r=i.classList.contains("active");i.classList.toggle("active",n),e._squishPending?(sc(i,e._squishPending>0),e._squishPending=0):r!==n&&sc(i,n),om();const l=i.querySelector(".qs-tile-sub");l&&(l.textContent=n?e.sub||"已开启":"已关闭")}function Rp(e){switch(e.id){case"darktheme":e.active=Ct()==="dark",W(e.active?"已开启深色主题":"已切换为浅色主题",e.active?v.bedtime:v.weather_sunny);break;case"torch":cm(e.active);break;case"internet":js(e.active),W(e.active?"已连接至中国移动 5G Wi-Fi":"网络已断开连接",e.active?v.wifi:v.wifi_off);break;case"bluetooth":W(e.active?"蓝牙已开启，已连接 Pixel Buds Pro":"蓝牙已关闭",e.active?v.headphones:v.block);break;case"modes":yi(e.active);break;case"focus":window.__focus&&window.__focus.onTileToggle(e.active);break;case"battery_saver":um(e.active);break;case"screen_record":lw(e.active);break;case"qrcode":qe();const t=F.findIndex(s=>s.id==="camera");t!==-1&&j(t,null,e._sourceRect||null);break;case"wallet":qe();const i=F.findIndex(s=>s.id==="wallet");i!==-1&&j(i,null,e._sourceRect||null);break;case"calculator":qe();const n=F.findIndex(s=>s.id==="calculator");n!==-1&&j(n,null,e._sourceRect||null);break;case"mic_access":case"camera_access":cw(),W(e.active?`已启用 ${e.name}`:`已禁用 ${e.name}`,e.active?v.record_dot:v.block);break;case"autorotate":W(e.active?"自动旋转已开启":"方向已锁定",e.active?v.autorotate:v.lock);break;default:W(`${e.name}: ${e.active?"已开启":"已关闭"}`);break}}function cm(e){let t=document.getElementById("screenTorchLayer");t||(t=document.createElement("div"),t.id="screenTorchLayer",t.style.cssText=`
      position: fixed; inset: 0; background: #FFFFFF; z-index: 99999;
      opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; color: #000; font-family: sans-serif;
    `,t.innerHTML=`
      <div style="font-size:48px;margin-bottom:12px;">${v.torch}</div>
      <div style="font-size:18px;font-weight:600;">屏幕手电筒高亮中</div>
      <div style="font-size:13px;opacity:0.6;margin-top:6px;">点击任意位置退出</div>
    `,t.addEventListener("click",()=>{const i=le.find(n=>n.id==="torch");i&&(i.active=!1),ei(),cm(!1)}),document.body.appendChild(t)),e?(t.style.pointerEvents="auto",t.style.opacity="0.96"):(t.style.opacity="0",t.style.pointerEvents="none")}function lw(e){const t=document.getElementById("statusBar");if(!t)return;let i=document.getElementById("statusRecIndicator");if(e){i||(i=document.createElement("div"),i.id="statusRecIndicator",i.style.cssText=`
        display: flex; align-items: center; gap: 4px; background: rgba(239, 68, 68, 0.2);
        color: #ef4444; font-size: 11px; font-weight: bold; padding: 2px 8px;
        border-radius: 12px; animation: pulse 1.5s infinite;
      `,i.innerHTML='<span style="width:7px;height:7px;background:#ef4444;border-radius:50%;"></span><span id="recTimerText">00:01</span>',(t.querySelector(".status-right")||t).prepend(i));let n=1;clearInterval(ml),ml=setInterval(()=>{n++;const s=Math.floor(n/60),a=n%60,r=document.getElementById("recTimerText");r&&(r.textContent=`${s<10?"0":""}${s}:${a<10?"0":""}${a}`)},1e3),W("屏幕录制已启动",v.record_dot)}else clearInterval(ml),i&&i.remove(),W("屏幕录制已停止并已保存",v.stop_record)}function cw(){const e=le.find(a=>a.id==="mic_access"),t=le.find(a=>a.id==="camera_access"),i=e&&e.active||t&&t.active;let n=document.getElementById("statusPrivacyDot");const s=document.getElementById("statusBar");s&&(i?n||(n=document.createElement("div"),n.id="statusPrivacyDot",n.style.cssText=`
        width: 8px; height: 8px; background: #22c55e; border-radius: 50%;
        box-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
      `,(s.querySelector(".status-right")||s).appendChild(n)):n&&n.remove())}function dm(e){const t=le.find(i=>i.id===e);return t?!!t.active:!1}function yi(e,{silent:t=!1}={}){const i=le.find(n=>n.id==="modes");i&&(i.active=!!e),document.body.classList.toggle("dnd-mode-active",!!e),ei(),t||W(e?"勿扰模式已开启 (静音新消息横幅)":"勿扰模式已关闭",e?v.bell_off:v.sound_notifications)}const pm="ios-desktop:battery-saver";function um(e,{silent:t=!1}={}){const i=le.find(a=>a.id==="battery_saver"),n=i?!!i.active:!1,s=!!e;i&&(i.active=s),document.body.classList.toggle("battery-saver-mode",s);try{localStorage.setItem(pm,s?"1":"0")}catch{}ei(),!t&&n!==s&&W(s?"省电模式已启动 (降低背景功耗)":"已退出省电模式",s?v.battery_saver:v.bolt),n!==s&&document.dispatchEvent(new CustomEvent("battery-saver-changed",{detail:{active:s}}))}function fm(){let e=!1;try{e=localStorage.getItem(pm)==="1"}catch{}const t=le.find(i=>i.id==="battery_saver");t&&(t.active=e),document.body.classList.toggle("battery-saver-mode",e)}function Po(e,{active:t,sub:i}={}){const n=le.find(a=>a.id===e);if(!n)return;t!==void 0&&(n.active=!!t),i!==void 0&&(n.sub=i);const s=document.querySelector('.qs-tile-pill[data-tile-id="'+e+'"]');if(s){s.classList.toggle("active",!!n.active);const a=s.querySelector(".qs-tile-sub");a&&(a.textContent=n.active?n.sub||"已开启":"已关闭")}}function W(e,t){let i=document.getElementById("systemGlobalToast");if(i||(i=document.createElement("div"),i.id="systemGlobalToast",i.style.cssText=`
      position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: rgba(23, 29, 27, 0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      color: #FFFFFF; font-size: 13px; font-weight: 500; padding: 10px 20px; border-radius: 24px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 10000; opacity: 0; pointer-events: none;
      transition: all 0.25s cubic-bezier(0.2, 0.9, 0.3, 1);
    `,document.body.appendChild(i)),t){i.innerHTML=`<span class="toast-icon">${t}</span>`;const n=document.createElement("span");n.className="toast-text",n.textContent=e,i.appendChild(n)}else i.textContent=e;i.style.opacity="1",i.style.transform="translateX(-50%) translateY(0)",clearTimeout(i._timer),i._timer=setTimeout(()=>{i.style.opacity="0",i.style.transform="translateX(-50%) translateY(20px)"},2200)}function dw(){const e=document.getElementById("qsBrightnessPct");document.getElementById("qsBrightnessIcon")&&(document.getElementById("qsBrightnessIcon").innerHTML=v.brightness),Op({bar:document.getElementById("qsBrightnessBar"),fill:document.getElementById("qsBrightnessFill"),pct:e,min:15,onInput:n=>{const s=.35+n/100*.65;document.body.style.filter=`brightness(${s.toFixed(2)})`}});const t=document.getElementById("qsVolumeIcon");t&&(t.innerHTML=v.volume);let i=null;Op({bar:document.getElementById("qsVolumeBar"),fill:document.getElementById("qsVolumeFill"),pct:document.getElementById("qsVolumePct"),min:0,onInput:n=>{rt.setVolume(n/100);const s=n===0;t&&s!==i&&(t.innerHTML=s?v.volume_mute:v.volume,i=s)}})}function Op({bar:e,fill:t,pct:i,min:n=0,onInput:s}){if(!e||!t)return;let a=null,r=0,l=0;const d=p=>{const h=a||e.getBoundingClientRect(),f=Math.max(n,Math.min(100,Math.round((p-h.left)/Math.max(h.width,1)*100)));t.style.width=`${f}%`,i&&(i.textContent=`${f}%`),s(f)},c=p=>{l=p,!r&&(r=requestAnimationFrame(()=>{r=0,d(l)}))};e.addEventListener("pointerdown",p=>{a=e.getBoundingClientRect(),l=p.clientX,e.classList.add("is-dragging"),d(p.clientX);const h=m=>c(m.clientX),f=()=>{e.classList.remove("is-dragging"),window.removeEventListener("pointermove",h),window.removeEventListener("pointerup",f),window.removeEventListener("pointercancel",f),r&&(cancelAnimationFrame(r),r=0),d(l),navigator.vibrate&&navigator.vibrate(8)};window.addEventListener("pointermove",h),window.addEventListener("pointerup",f),window.addEventListener("pointercancel",f)})}function pw(){let e=document.getElementById("qsSheetOverlay");return e||(e=document.createElement("div"),e.id="qsSheetOverlay",e.className="qs-sheet-overlay",e.innerHTML='<div class="qs-sheet" role="dialog" aria-modal="true"><div class="qs-sheet-title"></div><div class="qs-sheet-rows"></div></div>',e.addEventListener("click",t=>{t.target===e&&Td()}),document.body.appendChild(e),e)}function Bo(e,t){const i=pw(),n=i.querySelector(".qs-sheet-title"),s=i.querySelector(".qs-sheet-rows");n&&(n.textContent=e||""),s&&(s.innerHTML="",(t||[]).forEach(a=>{const r=document.createElement("div");r.className="qs-sheet-row"+(a.dividerAbove?" divider-above":"");const l=document.createElement("div");l.className="qs-sheet-row-icon",l.innerHTML=a.icon||"",r.appendChild(l);const d=document.createElement("div");d.className="qs-sheet-row-text";const c=document.createElement("span");if(c.className="qs-sheet-row-title",c.textContent=a.title||"",d.appendChild(c),a.sub){const p=document.createElement("span");p.className="qs-sheet-row-sub",p.textContent=a.sub,d.appendChild(p)}if(r.appendChild(d),a.trailing==="check"){const p=document.createElement("span");p.className="qs-sheet-row-check",p.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5.2 5.2L20 6.8"/></svg>',r.appendChild(p)}else if(a.trailing==="switch"){const p=document.createElement("label");p.className="md3-switch";const h=document.createElement("input");h.type="checkbox",h.checked=!!a.checked,h.disabled=!!a.disabled,h.addEventListener("change",()=>{a.onChange&&a.onChange(h.checked)});const f=document.createElement("span");f.className="slider";const m=document.createElement("span");m.className="thumb",f.appendChild(m),p.appendChild(h),p.appendChild(f),r.appendChild(p)}a.onClick&&(r.classList.add("clickable"),r.addEventListener("click",p=>{p.target.closest(".md3-switch")||(navigator.vibrate&&navigator.vibrate(12),a.onClick())})),s.appendChild(r)})),requestAnimationFrame(()=>i.classList.add("open"))}function Td(){const e=document.getElementById("qsSheetOverlay");e&&e.classList.remove("open")}function uw(){const e=le.find(n=>n.id==="internet"),t=le.find(n=>n.id==="aeroplane"),i=e?!!e.active:!1;Bo("网络与互联网",[{icon:v.wifi,title:"Wi-Fi",sub:i?"已开启 · 中国移动 5G Wi-Fi":"已关闭",trailing:"switch",checked:i,onChange:n=>{e&&(e.active=n),js(n),W(n?"已连接至中国移动 5G Wi-Fi":"网络已断开连接",n?v.wifi:v.wifi_off),lm(e||{id:"internet"})}},{icon:v.wifi,title:"中国移动 5G Wi-Fi",sub:i?"已连接":"范围内",trailing:i?"check":null,onClick:()=>{Td(),W("已连接至中国移动 5G Wi-Fi",v.wifi)}},{icon:v.wifi,title:"CoffeeShop_Free",sub:"开放网络",onClick:()=>W("正在加入 CoffeeShop_Free …",v.wifi)},{icon:v.wifi,title:"AndroidAP_5G",sub:"已保存（需验证）",onClick:()=>W("AndroidAP_5G 需要验证",v.wifi),dividerAbove:!0},{icon:v.cellular,title:"移动数据",sub:t&&t.active?"飞行模式已开启，不可用":"中国移动 5G",trailing:"switch",checked:!(t&&t.active),disabled:!!(t&&t.active),onChange:n=>W(n?"移动数据已开启":"移动数据已关闭",v.cellular)}])}function $p(){Bo("已配对设备",[{icon:v.headphones,title:"Pixel Buds Pro",sub:"已连接 · 电量 78%",trailing:"check",onClick:()=>W("Pixel Buds Pro 已连接",v.headphones)},{icon:v.headphones,title:"Pixel Buds A-Series",sub:"上次连接 · 昨天",onClick:()=>W("正在连接 Pixel Buds A-Series …",v.headphones)},{icon:v.watch||v.person,title:"Pixel Watch 4",sub:"可用",onClick:()=>W("正在配对 Pixel Watch 4 …",v.watch||v.person)},{icon:v.bluetooth,title:"配对新设备",sub:"在设置中管理",onClick:()=>W("在「设置 → 已配对设备」中配对新设备",v.bluetooth),dividerAbove:!0}])}function fw(){const e=le.find(t=>t.id==="modes");Bo("模式",[{icon:v.modes,title:"勿扰",sub:e&&e.active?"已开启":"已关闭",trailing:"switch",checked:!!(e&&e.active),onChange:t=>yi(t)},{icon:v.driving||v.cast,title:"驾驶模式",sub:"连接车载蓝牙时自动开启",onClick:()=>W("驾驶模式：已保存偏好",v.cast)},{icon:v.bedtime,title:"睡前模式",sub:"日落至日出静音",onClick:()=>W("睡前模式：已保存偏好",v.bedtime)},{icon:v.work,title:"工作模式",sub:"仅显示工作应用与通知",onClick:()=>W("工作模式：已保存偏好",v.person)}])}function hw(){const e=document.getElementById("editTilesBackBtn"),t=document.getElementById("editTilesUndoBtn");e&&(e.innerHTML=v.back,e.addEventListener("click",mm)),t&&(t.innerHTML=`${v.undo} <span>Undo</span>`,t.addEventListener("click",mw))}function hm(){const e=document.getElementById("editTilesView");e&&(Nr=[],_n(),e.classList.add("open"))}function mm(){const e=document.getElementById("editTilesView");e&&(e.classList.remove("open"),ei())}function mw(){if(Nr.length===0)return;const e=Nr.pop();le=JSON.parse(JSON.stringify(e.activeTiles)),mn=JSON.parse(JSON.stringify(e.availableCategories)),Wi=_d(le,nw(le)),Ed(Wi,typeof localStorage<"u"?localStorage:null),_n(),navigator.vibrate&&navigator.vibrate(25)}function rr(){Nr.push({activeTiles:JSON.parse(JSON.stringify(le)),availableCategories:JSON.parse(JSON.stringify(mn))})}function _n(){const e=document.getElementById("editActiveTilesGrid");e&&(e.innerHTML="",le.forEach((n,s)=>{const a=n.size===Be.SMALL,r=document.createElement("div");r.className=`qs-tile-pill active ${a?"size-small":"size-wide"}`,r.style.position="relative";const l=v[n.iconKey]||v.settings;a?r.innerHTML=`<div class="qs-tile-icon-wrap">${l}</div><div class="edit-resize-handle edit-resize-handle-sm" data-handle-index="${s}" title="拖拽还原 2×1"><span class="edit-resize-grip"></span></div><div class="edit-badge-remove" data-index="${s}">−</div>`:r.innerHTML=`
        <div class="qs-tile-icon-wrap">${l}</div>
        <div class="qs-tile-text">
          <span class="qs-tile-title">${n.name}</span>
          <span class="qs-tile-sub">${n.sub||""}</span>
        </div>
        <div class="edit-resize-handle" data-handle-index="${s}" title="拖拽调整尺寸">
          <span class="edit-resize-grip"></span>
        </div>
        <div class="edit-badge-remove" data-index="${s}">−</div>
      `,r.querySelector(".edit-badge-remove").addEventListener("click",c=>{c.stopPropagation(),rr();const p=le.splice(s,1)[0],h=mn[1]||mn[0];h&&h.tiles.push(p),_n()});const d=r.querySelector(".edit-resize-handle");d&&gw(d,r,n),e.appendChild(r)}));const t=document.getElementById("editAvailableCategories");t&&(t.innerHTML="",mn.forEach(n=>{const s=document.createElement("div");s.className="edit-category-title",s.textContent=n.category,t.appendChild(s);const a=document.createElement("div");a.className="qs-tiles-grid",n.tiles.forEach((r,l)=>{const d=document.createElement("div");d.className="qs-tile-pill",d.style.position="relative";const c=v[r.iconKey]||v.settings;d.innerHTML=`
          <div class="qs-tile-icon-wrap">${c}</div>
          <div class="qs-tile-text">
            <span class="qs-tile-title">${r.name}</span>
            <span class="qs-tile-sub">${r.sub||""}</span>
          </div>
          <div class="edit-badge-add" data-cat="${n.category}" data-index="${l}">+</div>
        `,d.querySelector(".edit-badge-add").addEventListener("click",p=>{p.stopPropagation(),rr();const h=n.tiles.splice(l,1)[0];h.active=!0,h.size=Be.SMALL,le.push(h),_n()}),a.appendChild(d)}),t.appendChild(a)}));const i=document.getElementById("editTilesResetRow");if(i&&i.remove(),t){const n=document.createElement("div");n.className="edit-reset-row",n.id="editTilesResetRow";const s=document.createElement("button");s.className="edit-reset-btn",s.id="editTilesResetBtn",s.type="button",s.textContent="Reset",s.addEventListener("click",()=>{rr(),le=JSON.parse(JSON.stringify(sm)),mn=JSON.parse(JSON.stringify(am)),Wi=_d(le,{}),Ed(Wi,typeof localStorage<"u"?localStorage:null),_n(),navigator.vibrate&&navigator.vibrate(25)}),n.appendChild(s),t.appendChild(n)}}function gw(e,t,i){let n=0,s=!1,a=0;e.addEventListener("pointerdown",l=>{l.preventDefault(),l.stopPropagation(),s=!0,n=l.clientX,a=0;try{e.setPointerCapture(l.pointerId)}catch{}t.classList.add("resize-preview")}),e.addEventListener("pointermove",l=>{if(!s)return;a=aw(l.clientX-n),t.style.transform=a?`translateX(${a}px)`:"";const d=zp(i.size,a);t.classList.toggle("would-change",d.changed)});const r=()=>{if(!s)return;s=!1,t.classList.remove("resize-preview","would-change"),t.style.transform="";const l=zp(i.size,a);l.changed&&(rr(),i.size=l.size,Wi=sw(Wi,i.id,l.size),Ed(Wi,typeof localStorage<"u"?localStorage:null),navigator.vibrate&&navigator.vibrate(18)),_n()};e.addEventListener("pointerup",r),e.addEventListener("pointercancel",r)}function vw(){const e=document.getElementById("powerDialogOverlay");if(!e)return;e.addEventListener("click",s=>{s.target===e&&Ls()});const t=document.getElementById("powerRestartBtn"),i=document.getElementById("powerShutdownBtn"),n=document.getElementById("powerEmergencyBtn");i&&(i.innerHTML=`${v.power}<span>关机</span>`,i.addEventListener("click",()=>{Ls(),document.body.style.opacity="0",document.body.style.transition="opacity 0.6s ease",setTimeout(()=>{document.body.innerHTML='<div style="display:flex;height:100vh;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;font-size:18px;">已关机 (点击屏幕重启)</div>',document.body.style.opacity="1",document.body.onclick=()=>location.reload()},600)})),t&&(t.innerHTML=`${v.restart}<span>重启</span>`,t.addEventListener("click",()=>{Ls(),location.reload()})),n&&(n.innerHTML=`${v.emergency}<span>紧急呼叫</span>`,n.addEventListener("click",()=>{Ls(),W("正在拨打紧急电话 110/120/119...",v.call)}))}function gm(){const e=document.getElementById("powerDialogOverlay");e&&e.classList.add("active")}function Ls(){const e=document.getElementById("powerDialogOverlay");e&&e.classList.remove("active")}const Md=Object.freeze(Object.defineProperty({__proto__:null,QS_SQUISH_MS:nc,closeEditTilesView:mm,closePowerDialog:Ls,closeQsSheet:Td,getTileActive:dm,initQuickSettings:rm,openEditTilesView:hm,openPowerDialog:gm,openQsSheet:Bo,playTileSquish:sc,renderQuickSettingsGrid:ei,restoreBatterySaverState:fm,setBatterySaverActive:um,setDndActive:yi,showSystemToast:W,syncTileState:Po},Symbol.toStringTag,{value:"Module"}));typeof window<"u"&&(window.__recorderPerm=function(){try{return Promise.resolve(zr("microphone",{appId:"recorder",appName:"录音机"})).then(function(e){return e===!0}).catch(function(){return!1})}catch{return Promise.resolve(!1)}},window.__recorderMicGate=function(){try{return dm("mic_access")!==!1}catch{return!0}});const yw={id:"recorder",name:"录音机",pages:[{title:"录音机",content:`
        <div style="padding:16px 0 32px;position:relative;">
          <style>
            @keyframes recPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.055); } }
            /* v7.50 录制钮呼吸涟漪环（仅录音中） */
            .rec-main { position: relative; }
            .rec-main.recording::before,
            .rec-main.recording::after {
              content: ''; position: absolute; inset: -7px; border-radius: 50%;
              border: 2px solid rgba(229,72,77,.5); pointer-events: none;
              animation: recRing 1.7s ease-out infinite;
            }
            .rec-main.recording::after { animation-delay: .85s; }
            @keyframes recRing { 0% { transform: scale(.92); opacity: .75; } 100% { transform: scale(1.45); opacity: 0; } }
            /* v7.50 圆 → 圆角方形形变（M3 expressive 形状语言） */
            .rec-shape {
              width: 84px; height: 84px; border-radius: 50%; border: none; cursor: pointer;
              display: flex; align-items: center; justify-content: center;
              background: hsl(var(--md-h,215) 85% 55%); color: #fff;
              box-shadow: 0 10px 30px hsl(var(--md-h,215) 85% 55% / .45);
              transition: border-radius .3s cubic-bezier(.2,0,0,1), background .22s ease,
                          box-shadow .3s ease, transform .18s cubic-bezier(.2,0,0,1);
            }
            .rec-shape:active { transform: scale(.94); }
            .rec-shape.recording {
              border-radius: 28px; background: #E5484D;
              box-shadow: 0 10px 30px rgba(229,72,77,.45);
              animation: recPulse 1.7s ease-in-out infinite;
            }
            .rec-shape.paused { animation: none; }
            /* 状态芯片 */
            .rec-chip {
              display: inline-flex; align-items: center; gap: 6px;
              padding: 5px 13px; border-radius: 999px;
              background: var(--md-surface-container-high, #2a2b32);
              font-size: 12.5px; font-weight: 600; color: var(--md-on-surface-variant, #9a9ba3);
            }
            .rec-chip .rec-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex: none; }
            .rec-chip.is-rec { color: #E5484D; background: rgba(229,72,77,.12); }
            .rec-chip.is-rec .rec-dot { animation: recBlink 1.1s ease-in-out infinite; }
            .rec-chip.is-paused { color: #E5A54B; background: rgba(229,165,75,.12); }
            .rec-chip.is-ok { color: hsl(var(--md-h,215) 70% 60%); }
            @keyframes recBlink { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
            /* 麦克风诊断芯片 */
            .rec-mic {
              display: inline-flex; align-items: center; gap: 5px;
              font-size: 11.5px; color: var(--md-on-surface-variant, #9a9ba3); opacity: .9;
            }
            .rec-mic .rec-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
            .rec-mic.is-denied { color: #E5484D; opacity: 1; }
            .rec-mic.is-ok { color: hsl(var(--md-h,215) 70% 58%); }
            /* 播放行进度条 */
            .rec-prog {
              position: relative; height: 3px; border-radius: 2px; margin-top: 7px;
              background: var(--md-surface-container-highest, #34353d); overflow: hidden;
            }
            .rec-prog .rec-prog-fill {
              position: absolute; left: 0; top: 0; bottom: 0; width: 0%;
              border-radius: 2px; background: hsl(var(--md-h,215) 80% 60%);
              transition: width .18s linear;
            }
            @media (prefers-reduced-motion: reduce) {
              .rec-main.recording::before, .rec-main.recording::after,
              .rec-shape.recording { animation: none; }
              .rec-chip.is-rec .rec-dot { animation: none; }
            }
          </style>

          <!-- 录音主卡 -->
          <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:24px 18px 22px;text-align:center;background:linear-gradient(165deg, var(--md-surface-container-lowest, #202126), var(--md-surface-container-low, #26272e) 60%, var(--md-surface-container, #2a2b33));">
            <span id="recStatus" class="rec-chip"><span class="rec-dot"></span><span id="recStatusText">就绪</span></span>
            <div id="recTimer" style="font-size:52px;font-weight:700;color:var(--md-on-surface);font-variant-numeric:tabular-nums;letter-spacing:1px;margin:10px 0 6px;line-height:1.05;">00:00<span id="recTenth" style="font-size:24px;font-weight:600;color:var(--md-on-surface-variant);opacity:.8;">.0</span></div>
            <!-- 电平条（录音中由 AnalyserNode 驱动，镜像居中式） -->
            <!-- v7.6：显隐改用 opacity 而非 visibility —— visibility:visible 是唯一能击穿
                 祖先 visibility:hidden 的属性，此前关闭应用后音波条会穿透隐藏的窗口悬浮在桌面上 -->
            <div id="recBars" style="display:flex;align-items:center;justify-content:center;gap:5px;height:52px;margin:2px auto 18px;opacity:0;transition:opacity .18s ease;">
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
            </div>
            <div style="display:flex;align-items:center;justify-content:center;gap:14px;">
              <button id="recPauseBtn" title="暂停" style="display:none;width:46px;height:46px;border-radius:50%;border:none;cursor:pointer;align-items:center;justify-content:center;background:var(--md-surface-container-high,#2a2b32);color:var(--md-on-surface);box-shadow:0 3px 12px rgba(0,0,0,.25);">
                <span id="recPauseIcon" style="display:flex;width:20px;height:20px;font-size:18px;">${v.pause}</span>
              </button>
              <button id="recBtn" class="rec-shape" title="开始录音">
                <span id="recBtnIcon" style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;font-size:32px;">${v.mic}</span>
              </button>
            </div>
            <div id="recHint" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:14px;opacity:.85;">录音会保存到「文件」应用的 recordings 目录</div>
            <div id="recMicState" class="rec-mic" style="margin-top:8px;justify-content:center;">
              <span class="rec-dot"></span><span id="recMicStateText">正在检查麦克风…</span>
            </div>
          </div>

          <!-- 录音列表 -->
          <div class="md3-card" style="padding:0;overflow:hidden;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 16px 9px;">
              <div style="font-size:14px;font-weight:700;color:var(--md-on-surface);">我的录音</div>
              <div id="recCount" style="font-size:12px;color:var(--md-on-surface-variant);"></div>
            </div>
            <div id="recList"></div>
            <div id="recEmpty" style="padding:38px 20px;text-align:center;color:var(--md-on-surface-variant);">
              <div style="width:64px;height:64px;margin:0 auto 12px;border-radius:50%;background:hsl(var(--md-h,215) 80% 50% / .12);display:flex;align-items:center;justify-content:center;color:hsl(var(--md-h,215) 80% 62%);"><span style="display:flex;width:30px;height:30px;font-size:28px;">${v.recorder}</span></div>
              <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);">还没有录音</div>
              <div style="font-size:12px;margin-top:5px;opacity:.8;">点上方麦克风按钮，开始第一段录音</div>
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

          <!-- 通用对话框（重命名 / 删除确认 / 权限诊断引导） -->
          <div id="recDialog" style="display:none;position:absolute;inset:0;z-index:80;background:rgba(0,0,0,.45);align-items:center;justify-content:center;padding:28px;">
            <div class="md3-card md3-card-elevated" style="width:100%;max-width:340px;padding:22px 20px 14px;">
              <div id="recDialogTitle" style="font-size:17px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;"></div>
              <div id="recDialogMsg" style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:10px;white-space:pre-wrap;display:none;line-height:1.6;"></div>
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
              var V = function() { return window.__vfs || null; }; // fix(P3): lazy resolution — module app instance is resident, a one-time capture of null never self-heals
              var DIR = '/recordings';
              var $ = function(id) { return document.getElementById(id); };

              var statusEl = $('recStatus'), statusTextEl = $('recStatusText'), timerEl = $('recTimer'), tenthEl = $('recTenth'),
                  barsEl = $('recBars'), btn = $('recBtn'), btnIcon = $('recBtnIcon'), hintEl = $('recHint'),
                  pauseBtn = $('recPauseBtn'), pauseIcon = $('recPauseIcon'),
                  micStateEl = $('recMicState'), micStateTextEl = $('recMicStateText');
              var listEl = $('recList'), emptyEl = $('recEmpty'), countEl = $('recCount');
              var shareSheet = $('recShareSheet'), shareTitle = $('recShareTitle'), shareTargets = $('recShareTargets');
              var dlgEl = $('recDialog'), dlgTitle = $('recDialogTitle'), dlgMsg = $('recDialogMsg'), dlgInput = $('recDialogInput');

              // ---------- 状态 ----------
              var recording = false;
              var rec = null, recStream = null, recMime = '', recChunks = [], recTimer = null, barsTimer = null, audioCtx = null, analyser = null;
              // v7.50 计时（0.1s 精度，暂停可续）：
              var recElapsedBase = 0;  // 已累计毫秒（暂停前）
              var recRunStart = 0;     // 本次连续运行起点（0 = 暂停/未开始）
              var recPaused = false;
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
              function elapsedMs() { return recElapsedBase + (recRunStart ? (Date.now() - recRunStart) : 0); }
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

              // ---------- v7.50 麦克风分层诊断 ----------
              // 应用内权限（permissions.js）只是第一层；浏览器站点权限（Permissions API）
              // 是第二层。两层都通才可能录上音 —— 此前用户在应用内点了「允许」，但浏览器
              // 层早在历史会话中拒绝过站点，getUserMedia 直接 NotAllowedError 且不再弹窗，
              // 表现即「权限都给了却录不了」。此处把第二层状态显式呈现 + 失败时给出
              // 可操作指引（点地址栏锁形图标 → 麦克风 → 允许）。
              function queryBrowserMic() {
                try {
                  if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve('unsupported');
                  return navigator.permissions.query({ name: 'microphone' })
                    .then(function (st) { return st && st.state ? st.state : 'unsupported'; })
                    .catch(function () { return 'unsupported'; });
                } catch (e) { return Promise.resolve('unsupported'); }
              }
              function setMicState(state) {
                // state: 'granted' | 'prompt' | 'denied' | 'unsupported' | 'insecure'
                micStateEl.classList.remove('is-ok', 'is-denied');
                if (state === 'granted') {
                  micStateEl.classList.add('is-ok');
                  micStateTextEl.textContent = '麦克风已就绪';
                } else if (state === 'denied') {
                  micStateEl.classList.add('is-denied');
                  micStateTextEl.textContent = '浏览器已拒绝麦克风 — 点地址栏锁形图标可恢复';
                } else if (state === 'insecure') {
                  micStateEl.classList.add('is-denied');
                  micStateTextEl.textContent = '当前页面非 HTTPS，浏览器禁止使用麦克风';
                } else if (state === 'prompt') {
                  micStateTextEl.textContent = '首次录音时浏览器会请求麦克风权限';
                } else {
                  micStateTextEl.textContent = '此环境不支持麦克风检测';
                }
              }
              function refreshMicState() {
                if (!window.isSecureContext) { setMicState('insecure'); return; }
                queryBrowserMic().then(setMicState);
              }
              var MIC_GUIDE = '恢复方法：\\n1. 点浏览器地址栏左侧的锁形/调音图标\\n2. 把「麦克风」权限改为「允许」\\n3. 回到这里再点一次录音按钮';
              function explainMicError(err) {
                var name = (err && err.name) || '';
                if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
                  setMicState('denied');
                  dlg({ title: '浏览器拦截了麦克风', msg: MIC_GUIDE });
                } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                  dlg({ title: '没有找到麦克风', msg: '这台设备似乎没有可用的麦克风设备（或已被系统禁用）。\\n接上麦克风后重试。' });
                } else if (name === 'NotReadableError' || name === 'TrackStartError') {
                  dlg({ title: '麦克风被占用', msg: '麦克风正被其他应用使用，请关闭占用麦克风的程序后重试。' });
                } else if (name === 'OverconstrainedError') {
                  toast('麦克风参数不受支持，请重试');
                } else if (name === 'AbortError') {
                  toast('麦克风启动被中断，请重试');
                } else {
                  toast('无法访问麦克风：' + (name || '未知错误'));
                }
              }

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
              function setBtnState(mode) {
                // mode: 'idle' | 'rec' | 'paused'
                btn.classList.toggle('recording', mode === 'rec');
                btn.classList.toggle('paused', mode === 'paused');
                btn.style.background = mode === 'idle' ? '' : '';
                btnIcon.innerHTML = mode === 'idle' ? '${v.mic}' : '${v.stop_record}';
                btn.title = mode === 'idle' ? '开始录音' : '停止并保存';
                pauseBtn.style.display = mode === 'idle' ? 'none' : 'inline-flex';
                pauseIcon.innerHTML = mode === 'paused' ? '${v.play}' : '${v.pause}';
                pauseBtn.title = mode === 'paused' ? '继续' : '暂停';
              }
              function setStatus(text, tone) {
                // tone: '' | 'rec' | 'paused' | 'ok'
                statusEl.classList.remove('is-rec', 'is-paused', 'is-ok');
                if (tone) statusEl.classList.add(tone === 'rec' ? 'is-rec' : (tone === 'paused' ? 'is-paused' : 'is-ok'));
                statusTextEl.textContent = text;
              }
              function renderTimer() {
                var ms = elapsedMs();
                var s = Math.floor(ms / 1000);
                timerEl.firstChild.nodeValue = fmtSec(s);
                tenthEl.textContent = '.' + Math.floor((ms % 1000) / 100);
              }
              function startTimerLoop() {
                if (recTimer) clearInterval(recTimer);
                recTimer = setInterval(renderTimer, 100);
                renderTimer();
              }
              function stopTimerLoop() {
                if (recTimer) { clearInterval(recTimer); recTimer = null; }
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
                        var h = 6 + Math.min(46, (avg / 255) * 52);
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
                // V().exists 为同步内存索引查询（vfs.js），不可用时直接用首名
                var Vv = V();
                while (Vv && Vv.exists && Vv.exists(dir + '/' + name)) {
                  name = base + ' (' + n + ')' + ext; n++;
                  if (n > 99) break;
                }
                return name;
              }

              function startRecording() {
                if (!V()) { toast('文件系统未就绪，无法保存录音'); return; }
                if (!window.isSecureContext || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || typeof MediaRecorder === 'undefined') {
                  dlg({ title: '当前环境不支持录音', msg: '录音需要 HTTPS 安全页面与浏览器 MediaRecorder 支持。\\n请通过 https:// 访问本站后重试。' });
                  return;
                }
                if (!window.__recorderMicGate || !window.__recorderMicGate()) {
                  toast('快速设置中「Mic access」已关闭，请先开启');
                  return;
                }
                Promise.resolve(window.__recorderPerm ? window.__recorderPerm() : false).then(function (ok) {
                  if (!ok) { toast('需要麦克风权限才能录音（设置 › 应用权限可改判）'); return; }
                  // v7.50 第二层预检：浏览器站点权限已明确拒绝 → 直接给指引，不再
                  // 让 getUserMedia 静默失败（用户「权限给了却录不了」的主场景）
                  queryBrowserMic().then(function (state) {
                    if (state === 'denied') { explainMicError({ name: 'NotAllowedError' }); return; }
                    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
                      recMime = pickMime();
                      try { rec = recMime ? new MediaRecorder(stream, { mimeType: recMime }) : new MediaRecorder(stream); }
                      catch (e) { rec = new MediaRecorder(stream); recMime = ''; }
                      if (!recMime) recMime = rec.mimeType || 'audio/webm';
                      recStream = stream;
                      recChunks = [];
                      recElapsedBase = 0; recRunStart = Date.now(); recPaused = false;
                      rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) recChunks.push(ev.data); };
                      rec.onstop = function () { saveRecording(); };
                      // fix(P3)：录制错误处理 —— 设备拔出/流中断时复位假死的录音会话
                      rec.onerror = function (ev) {
                        try { console.warn('MediaRecorder error:', ev && ev.error); } catch (_) {}
                        try { if (recStream) { recStream.getTracks().forEach(function (t) { t.stop(); }); } } catch (_) {}
                        recStream = null;
                        stopTimerLoop();
                        recording = false; recPaused = false;
                        recChunks = [];
                        setBtnState('idle');
                        setStatus('录音失败，请重试', '');
                        refreshMicState();
                      };
                      try { rec.start(250); } catch (e) { rec.start(); }
                      recording = true;
                      setBtnState('rec');
                      setStatus('录音中…', 'rec');
                      timerEl.firstChild.nodeValue = '00:00';
                      tenthEl.textContent = '.0';
                      startTimerLoop();
                      startBars(stream);
                      setMicState('granted');
                    }).catch(function (err) {
                      explainMicError(err);
                    });
                  });
                });
              }

              function togglePause() {
                if (!recording || !rec || recPaused === undefined) return;
                if (!recPaused) {
                  try { rec.pause(); } catch (e) { return; }
                  recPaused = true;
                  recElapsedBase += recRunStart ? (Date.now() - recRunStart) : 0;
                  recRunStart = 0;
                  stopTimerLoop();
                  btn.classList.add('paused');
                  setStatus('已暂停', 'paused');
                  setBtnState('paused');
                  barsEl.style.opacity = '0';
                } else {
                  try { rec.resume(); } catch (e) { return; }
                  recPaused = false;
                  recRunStart = Date.now();
                  startTimerLoop();
                  setStatus('录音中…', 'rec');
                  setBtnState('rec');
                  barsEl.style.opacity = '1';
                }
              }

              function stopRecording() {
                if (!recording || !rec) return;
                recording = false;
                stopTimerLoop();
                stopBars();
                setBtnState('idle');
                setStatus('保存中…', '');
                try { rec.stop(); } catch (e) { saveRecording(); }
              }

              function saveRecording() {
                var chunks = recChunks; recChunks = [];
                var sec = Math.max(1, Math.round(elapsedMs() / 1000));
                recElapsedBase = 0; recRunStart = 0; recPaused = false;
                if (recStream) { try { recStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} recStream = null; }
                if (!chunks.length) {
                  setStatus('就绪', '');
                  tenthEl.textContent = '.0';
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
                V().write(path, blob, { mime: (blob.type || 'audio/webm').split(';')[0], owner: 'recorder', meta: { duration: sec } })
                  .then(function (res) {
                    if (res && res.ok) { toast('已保存：' + name); setStatus('就绪', 'ok'); timerEl.firstChild.nodeValue = '00:00'; tenthEl.textContent = '.0'; }
                    else { setStatus('保存失败', ''); toast('保存失败：' + ((res && res.error) || '未知错误')); }
                  })
                  .catch(function () { setStatus('保存失败', ''); toast('保存失败'); });
              }

              btn.addEventListener('click', function () { recording && !recPaused ? stopRecording() : (recording && recPaused ? stopRecording() : startRecording()); });
              pauseBtn.addEventListener('click', togglePause);

              // ---------- 列表 ----------
              function rowHTML(e) {
                var meta = e.meta || {};
                var dur = meta.duration ? fmtSec(meta.duration) : '';
                var size = fmtBytes(e.size || 0);
                var isActive = playPath === e.path;
                return '<div class="md3-list-item" data-path="' + esc(e.path) + '" style="display:flex;align-items:center;gap:12px;padding:11px 14px;position:relative;' + (isActive ? 'background:hsl(var(--md-h,215) 80% 50% / .1);' : '') + '">'
                  + '<button class="md3-btn-tonal" data-act="play" title="播放" style="min-width:0;width:44px;height:44px;padding:0;border-radius:50%;flex:none;">' + (isActive && audio && !audio.paused ? '${v.pause}' : '${v.play}') + '</button>'
                  + '<div style="flex:1;min-width:0;">'
                  +   '<div style="font-size:14px;font-weight:600;color:var(--md-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(e.name) + '</div>'
                  +   '<div data-role="meta" style="font-size:11.5px;color:var(--md-on-surface-variant);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (dur ? '<span style="font-weight:600;">' + dur + '</span> · ' : '') + size + ' · ' + fmtDate(e.modified) + '</div>'
                  +   '<div class="rec-prog" data-role="prog" style="' + (isActive && audio ? '' : 'visibility:hidden;') + '"><span class="rec-prog-fill" data-role="progfill" style="width:' + (isActive && audio && audio.duration > 0 ? Math.min(100, (audio.currentTime / audio.duration) * 100).toFixed(1) : '0') + '%"></span></div>'
                  + '</div>'
                  + '<button class="md3-btn-tonal" data-act="share" title="分享" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${v.quick_share}</button>'
                  + '<button class="md3-btn-tonal" data-act="rename" title="重命名" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${v.edit}</button>'
                  + '<button class="md3-btn-tonal" data-act="del" title="删除" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${v.delete_forever}</button>'
                  + '</div>';
              }

              function render() {
                if (!V() || !visible) return;
                Promise.resolve(V().list(DIR)).then(function (entries) {
                  var files = (entries || []).filter(function (e) { return e.type !== 'dir'; });
                  var total = 0;
                  for (var i = 0; i < files.length; i++) total += files[i].size || 0;
                  countEl.textContent = files.length ? (files.length + ' 段 · ' + fmtBytes(total)) : '';
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
                  if (pb) pb.innerHTML = '${v.play}';
                  var pr = playingRow.querySelector('[data-role="prog"]');
                  if (pr) pr.style.visibility = 'hidden';
                  var pf = playingRow.querySelector('[data-role="progfill"]');
                  if (pf) pf.style.width = '0%';
                  playingRow.style.background = '';
                }
                playingRow = null; playPath = null;
              }
              function togglePlay(path, row) {
                if (!V()) return;
                if (playPath === path && audio) {
                  if (audio.paused) { try { audio.play(); } catch (e) {} row.querySelector('[data-act="play"]').innerHTML = '${v.pause}'; }
                  else { audio.pause(); row.querySelector('[data-act="play"]').innerHTML = '${v.play}'; }
                  return;
                }
                stopPlayback();
                Promise.resolve(V().readURL(path)).then(function (url) {
                  if (!url) { toast('读取失败'); return; }
                  playPath = path; playingRow = row;
                  row.style.background = 'hsl(var(--md-h,215) 80% 50% / .1)';
                  row.querySelector('[data-act="play"]').innerHTML = '${v.pause}';
                  var metaEl = row.querySelector('[data-role="meta"]');
                  var progEl = row.querySelector('[data-role="prog"]');
                  var fillEl = row.querySelector('[data-role="progfill"]');
                  if (progEl) progEl.style.visibility = 'visible';
                  if (metaEl) {
                    metaEl.setAttribute('data-plain', metaEl.textContent);
                    metaEl.textContent = '00:00 播放中…';
                  }
                  audio = audio || new Audio();
                  audio.src = url;
                  audio.onended = function () { stopPlayback(); };
                  audio.ontimeupdate = function () {
                    if (playPath !== path) return;
                    var total = null;
                    try {
                      var e = V().stat && V().stat(path);
                      if (e && e.meta && e.meta.duration) total = e.meta.duration;
                    } catch (err) {}
                    if (total == null && isFinite(audio.duration) && audio.duration > 0) total = audio.duration;
                    var cur = audio.currentTime || 0;
                    if (metaEl) metaEl.textContent = fmtSec(cur) + (total != null ? ' / ' + fmtSec(total) : '') + ' 播放中…';
                    if (fillEl && total) fillEl.style.width = Math.min(100, (cur / total) * 100).toFixed(1) + '%';
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
                    // fix(P3)：文件名合法性校验 —— 路径分隔符/上跳目录会把 move 目标
                    // 逃出 /recordings；控制字符一并拒绝
                    if (/[\\\\/]/.test(nn) || nn === '..' || nn === '.' || /[\\u0000-\\u001f]/.test(nn)) {
                      toast('名称不能包含 / 、.. 或控制字符');
                      return;
                    }
                    var newPath = DIR + '/' + nn + ext;
                    if (newPath === path) return;
                    Promise.resolve(V().move(path, newPath)).then(function (res) {
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
                    Promise.resolve(V().del(path)).then(function (res) {
                      if (res && res.ok) toast('已删除');
                      else toast('删除失败');
                    }).catch(function () { toast('删除失败'); });
                  });
              }

              // ---------- 分享 ----------
              function openShare(path) {
                shareTitle.textContent = '分享「' + baseName(path) + '」';
                shareTargets.innerHTML = '<button class="md3-list-item" data-share="msg" style="width:100%;"><div class="md3-list-item-icon">${v.chat}</div><div class="md3-list-item-text">发送到 信息</div></button>';
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
                try { entry = V().stat && V().stat(path); } catch (err) {}
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
                recording = false; recPaused = false;
                recElapsedBase = 0; recRunStart = 0;
                stopTimerLoop();
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
              if (V() && V().subscribe) {
                var unVfs = V().subscribe(DIR, render);
                addCleanup('recorder', function() { try { unVfs(); } catch (err) {} });
              }
              bindDoc('recorder', 'app-page-active', function (e) {
                if (!e.detail || e.detail.appId !== 'recorder') return;
                visible = e.detail.pageIdx === 0;
                if (visible) { render(); refreshMicState(); }
              });
              visible = true;
              render();
              refreshMicState();
            })();
          <\/script>
        </div>
      `}]},ww=`
<div class="pkg-app" id="pkgApp">
  <div class="pkg-topbar">
    <div class="pkg-title-row">
      <span class="pkg-title-icon" id="pkgTitleIcon"></span>
      <div class="pkg-title-wrap">
        <h2 class="pkg-title">安装包</h2>
        <div class="pkg-sub" id="pkgSubLine">导入压缩包 · 自动识别图标与名称 · 权限透明安装</div>
      </div>
      <button class="pkg-help-btn" id="pkgHelpBtn" aria-label="配置讲解与 AI 提示词" title="配置讲解与 AI 提示词">?</button>
      <button class="pkg-import-pill" id="pkgImportTop">导入</button>
    </div>
    <div class="pkg-tabs" role="tablist">
      <button class="pkg-tab on" data-t="pending" role="tab">待安装<span class="pkg-tab-n" id="pkgNPending"></span></button>
      <button class="pkg-tab" data-t="installed" role="tab">已安装<span class="pkg-tab-n" id="pkgNInstalled"></span></button>
    </div>
  </div>

  <div class="pkg-body" id="pkgList"></div>

  <button class="pkg-fab" id="pkgImportFab" aria-label="导入压缩包">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/></svg>
    <span>导入压缩包</span>
  </button>

  <input type="file" id="pkgFileInput" multiple accept=".zip,.mdapp,application/zip,application/x-zip-compressed" style="display:none" />

  <div class="pkg-snack" id="pkgSnack" role="status"></div>

  <div class="pkg-sheet-overlay" id="pkgSheetOverlay">
    <div class="pkg-sheet" role="dialog" aria-modal="true" aria-label="安装确认" id="pkgSheet"></div>
  </div>

  <div class="pkg-sheet-overlay" id="pkgConfirmOverlay">
    <div class="pkg-confirm-card" role="alertdialog" aria-modal="true" id="pkgConfirm"></div>
  </div>

  <div class="pkg-sheet-overlay pkg-help-overlay" id="pkgHelpOverlay">
    <div class="pkg-help-card" role="dialog" aria-modal="true" aria-label="安装包配置讲解" id="pkgHelpCard">
      <div class="pkg-help-head">
        <div>
          <div class="pkg-help-title">配置讲解</div>
          <div class="pkg-help-sub">包规范 · 系统能力 · 一键交给 AI</div>
        </div>
        <button class="pkg-btn ghost" data-help-close>关闭</button>
      </div>
      <div class="pkg-help-body">
        <div class="pkg-help-sec">① 这是什么</div>
        <p class="pkg-help-p">本页把网页应用打包成压缩包（.zip / .mdapp）安装进系统：导入后自动识别名称与图标，权限透明可查，安装后图标出现在桌面，沙箱隔离运行，离线可用。</p>

        <div class="pkg-help-sec">② 包结构</div>
        <pre class="pkg-help-pre">myapp.mdapp (zip)
├─ manifest.json   清单（必须，zip 根目录）
├─ index.html      入口（缺省入口名）
├─ icon.svg        图标（manifest.icon 指向）
└─ ...其余资源按相对路径引用</pre>

        <div class="pkg-help-sec">③ manifest.json 字段</div>
        <div class="pkg-help-row"><b>id</b><span>必填 · 小写字母开头，仅 a-z 0-9 . _ -，2～40 位，禁连续点（..）。安装后系统 id 为 pkg-&lt;id&gt;</span></div>
        <div class="pkg-help-row"><b>name</b><span>可选 · ≤24 字符。缺省自动识别：入口页 &lt;title&gt; → 压缩包文件名</span></div>
        <div class="pkg-help-row"><b>version</b><span>可选 · 仅 0-9 A-Z a-z . -，≤20 位。缺省 1.0.0</span></div>
        <div class="pkg-help-row"><b>entry</b><span>可选 · 包内真实存在的相对路径，缺省 index.html。禁绝对路径与 .. 穿越</span></div>
        <div class="pkg-help-row"><b>icon</b><span>可选 · png/jpg/jpeg/gif/webp/avif/ico/bmp/svg，≤512KB。缺省回退 favicon → 系统默认图标</span></div>
        <div class="pkg-help-row"><b>author</b><span>可选 · ≤40 字符</span></div>
        <div class="pkg-help-row"><b>description</b><span>可选 · ≤120 字符</span></div>
        <div class="pkg-help-row"><b>permissions</b><span>可选 · 字符串数组，白名单仅：camera / microphone / location / notifications / clipboard。未知项自动忽略</span></div>

        <div class="pkg-help-sec">④ 体量与文件白名单</div>
        <div class="pkg-help-row"><b>体量</b><span>压缩包 ≤30MB · 解压总量 ≤40MB · 单文件 ≤25MB · 条目 ≤800</span></div>
        <div class="pkg-help-row"><b>扩展名</b><span>html htm css js mjs json txt md xml csv map svg png jpg jpeg gif webp avif ico bmp woff woff2 ttf otf wav mp3 ogg m4a flac mp4 webm mov wasm（白名单之外拒绝安装）</span></div>
        <div class="pkg-help-row"><b>路径安全</b><span>禁绝对路径 / .. 穿越 / NUL / Windows 盘符；反斜杠自动归一</span></div>

        <div class="pkg-help-sec">⑤ 运行环境与系统能力（SDK）</div>
        <p class="pkg-help-p">应用运行在沙箱 iframe（opaque origin）：localStorage 不可用，持久化统一走 <code>window.__system.fs</code>。系统自动注入 SDK，无需自行引入。可用能力：</p>
        <div class="pkg-help-row"><b>事件</b><span>__system.emit(event, payload, target?) / broadcast(event, payload)</span></div>
        <div class="pkg-help-row"><b>跳转</b><span>__system.openApp(appId, { event, payload })</span></div>
        <div class="pkg-help-row"><b>分享</b><span>__system.share({ title, text, url })</span></div>
        <div class="pkg-help-row"><b>通知</b><span>__system.notify({ title, body })</span></div>
        <div class="pkg-help-row"><b>权限</b><span>__system.requestPermission(name) → Promise&lt;boolean&gt;</span></div>
        <div class="pkg-help-row"><b>文件</b><span>__system.fs.write / read / list / del / mkdir / exists / url（全部返回 Promise）</span></div>
        <div class="pkg-help-row"><b>剪贴板</b><span>__system.clipboard.write(payload) / read()</span></div>
        <div class="pkg-help-row"><b>主题</b><span>CSS 变量 --md-h 自动同步主题色，直接写 hsl(var(--md-h, 215) ...) 即可跟随系统</span></div>
        <div class="pkg-help-row"><b>手势</b><span>底部 68px 与左右边缘 36px 归系统手势，勿放关键交互</span></div>

        <div class="pkg-help-sec">⑥ 一键交给 AI 的提示词</div>
        <p class="pkg-help-p">复制下方全部内容发给任意 AI 助手（仅读这一段即可），它就能一次性产出可直接安装的合规安装包：</p>
        <button class="pkg-btn primary pkg-help-copy" id="pkgHelpCopy">复制提示词全文</button>
        <pre class="pkg-help-pre pkg-help-prompt" id="pkgAIPrompt">你是「md3 安装包」构建器。请为 Material Design 3 风格移动端 Web 桌面（md3）生成一个可直接安装的 .zip 安装包（扩展名 .mdapp 亦可）。只输出制作结果，不输出多余解释。

【包结构】
- manifest.json（必须，zip 根目录）
- index.html（入口，zip 根目录；除非 manifest.entry 另指定）
- 其余资源按相对路径引用，全部打进 zip

【manifest.json 规范】
{ "id": "com.example.myapp", "name": "我的应用", "version": "1.0.0", "entry": "index.html", "icon": "icon.svg", "author": "作者名", "description": "一句话简介（≤120字）", "permissions": ["notifications"] }
字段约束：
- id 必填：小写字母开头，仅 a-z 0-9 . _ -，2～40 位，禁止连续点（..）；安装后系统 id 为 pkg-&lt;id&gt;
- name 可选 ≤24 字符；缺省时依次回退：入口页 &lt;title&gt; → zip 文件名
- version 可选，仅 0-9 A-Z a-z . -，≤20 位，缺省 1.0.0
- entry 可选，包内真实存在的相对路径；缺省 index.html；禁止绝对路径与 .. 穿越
- icon 可选：png/jpg/jpeg/gif/webp/avif/ico/bmp/svg，≤512KB；缺省回退 favicon → 系统默认图标；svg 会被净化（剥 script / on* / 外链）
- permissions 可选数组，白名单仅：camera, microphone, location, notifications, clipboard；未知权限自动忽略

【硬限制】
zip ≤30MB；解压总量 ≤40MB；单文件 ≤25MB；条目 ≤800；文件扩展名必须在白名单内：html htm css js mjs json txt md xml csv map svg png jpg jpeg gif webp avif ico bmp woff woff2 ttf otf wav mp3 ogg m4a flac mp4 webm mov wasm

【运行环境（写代码时必须遵守）】
- 页面运行在沙箱 iframe（opaque origin）：禁止依赖 localStorage / sessionStorage（会抛 SecurityError）；持久化统一用 window.__system.fs
- 系统已在页面注入 SDK（pkg-sdk.js），直接使用 window.__system，无需自行引入
- __system 可用 API：
  · emit(event, payload, target?) / broadcast(event, payload)：跨应用事件
  · share({...})：调起系统分享面板
  · openApp(appId, { event, payload })：跳转其他应用
  · notify({ title, body })：系统通知
  · requestPermission(name)：申请 manifest 声明过的权限，返回 Promise&lt;boolean&gt;
  · fs.write(path, data, { mime? }) / fs.read(path) / fs.list(path) / fs.del(path) / fs.mkdir(path) / fs.exists(path) / fs.url(path)：虚拟文件系统，全部返回 Promise
  · clipboard.write(payload) / clipboard.read()：全局剪贴板
- 主题自动同步：CSS 变量 --md-h（主题色 hue）已注入，用 hsl(var(--md-h, 215) ...) 让应用跟随系统主题色
- 底部 68px 与左右 36px 边缘是系统手势区，不要在这些区域放关键交互
- 移动端竖屏优先，Material Design 3 视觉语言（大圆角、tonal 色、动态色）

【质量要求】
- 单页自包含优先：CSS/JS 内联或相对路径引用包内文件；不引用任何外网资源（必须离线可用）
- 所有交互真实可用，不做假按钮；字体 ≥14px，点击目标 ≥44px

【输出要求】
1. 完整列出 zip 内每个文件的最终内容（文件名 + 全文）
2. manifest.json 必须严格符合上述规范
3. 最后给出打包命令（zip -r myapp.mdapp .）与导入安装步骤</pre>
      </div>
    </div>
  </div>
</div>

<script>
(function(){
  'use strict';
  var root = document.getElementById('pkgApp');
  if (!root) return;
  // fix(v7.60)：实例级 boot 守卫 —— 旧实现用 window 级全局 boot 标志：
  // 实例销毁（多任务划掉 / 小窗关闭 / 分屏 / 一键清理）后重开时 DOM 重建、内联脚本
  // 重跑，却被全局标志拦住 → 新 DOM 零监听零渲染，表现为「安装包死掉没反应」，
  // 只有整页刷新才能救回。改为挂在 root 元素上的实例级守卫：每个新 DOM 只引导一次，
  // 重建后正常重跑。
  if (root.__pkgBooted) return;
  root.__pkgBooted = true;

  var api = window.__pkgInstallerAPI || null;

  var S = { tab: 'pending', pending: [], installed: [], busy: false, sheetKey: null };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;');
  }

  function fmtSize(b) {
    if (b == null) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function snack(msg) {
    var el = $('pkgSnack');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(el.__t);
    el.__t = setTimeout(function() { el.classList.remove('on'); }, 2800);
  }

  var FALLBACK_ICON = '<svg viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 8) 40% 46%)"/><path d="M30 40 L50 28 L70 40 L70 62 L50 74 L30 62 Z" fill="#FFFFFF" opacity="0.92"/></svg>';

  function iconBox(iconHTML) {
    return '<div class="pkg-ic">' + (iconHTML || FALLBACK_ICON) + '</div>';
  }

  function permIconSVG() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  }

  function emptyBlock(iconPath, title, sub) {
    return '<div class="pkg-empty"><div class="pkg-empty-ic"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + iconPath + '</svg></div>'
      + '<div class="pkg-empty-t">' + esc(title) + '</div><div class="pkg-empty-s">' + esc(sub) + '</div></div>';
  }

  var EMPTY_PENDING = emptyBlock('<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>', '还没有待安装的压缩包', '点击下方「导入压缩包」，或在文件管理器里点开 zip 安装包');
  var EMPTY_INSTALLED = emptyBlock('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 12l2 2 4-5"/>', '还没有安装任何应用', '在「待安装」里点击压缩包即可安装；安装后图标出现在桌面');
  var EMPTY_NOAPI = emptyBlock('<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>', '系统服务未就绪', '安装服务尚未完成初始化，稍后重开本页再试');

  function render() {
    var ti = $('pkgTitleIcon');
    if (ti && !ti.__done) {
      ti.innerHTML = (window.__appIconProbe && window.__appIconProbe.svg('installer')) || FALLBACK_ICON;
      ti.__done = true;
    }
    var nP = $('pkgNPending'), nI = $('pkgNInstalled');
    if (nP) nP.textContent = S.pending.length ? String(S.pending.length) : '';
    if (nI) nI.textContent = S.installed.length ? String(S.installed.length) : '';
    var list = $('pkgList');
    if (!list) return;
    if (!api) { list.innerHTML = EMPTY_NOAPI; return; }
    if (S.tab === 'pending') renderPending(list); else renderInstalled(list);
  }

  function renderPending(list) {
    if (!S.pending.length) { list.innerHTML = EMPTY_PENDING; return; }
    var h = '';
    for (var i = 0; i < S.pending.length; i++) {
      var p = S.pending[i];
      var pv = p.preview || {};
      var warn = (pv.warnings && pv.warnings.length) ? '<div class="pkg-warn">已自动识别 · ' + esc(pv.warnings[0]) + '</div>' : '';
      h += '<div class="pkg-card" data-key="' + esc(p.key) + '" role="button" tabindex="0" aria-label="安装 ' + esc(pv.name || p.zipName) + '">'
        + iconBox(pv.iconHTML)
        + '<div class="pkg-card-main">'
        + '<div class="pkg-card-name">' + esc(pv.name || p.zipName) + '</div>'
        + '<div class="pkg-card-meta">' + esc(pv.version || '1.0.0') + ' · ' + fmtSize(p.size) + '</div>'
        + '<div class="pkg-card-sub">' + esc(p.zipName) + '</div>'
        + warn
        + '</div>'
        + '<div class="pkg-card-go">安装</div>'
        + '</div>';
    }
    list.innerHTML = h;
  }

  function onDesktop(appId) {
    return !!(window.__pkgDesktopRoot || document).querySelector('.app-icon[data-id="' + appId + '"]');
  }

  function renderInstalled(list) {
    if (!S.installed.length) { list.innerHTML = EMPTY_INSTALLED; return; }
    var h = '';
    for (var i = 0; i < S.installed.length; i++) {
      var r = S.installed[i];
      var desktop = onDesktop(r.appId);
      var permN = (r.permissions && r.permissions.length) ? (r.permissions.length + ' 项权限') : '无敏感权限';
      h += '<div class="pkg-card static" data-appid="' + esc(r.appId) + '">'
        + iconBox(r.iconHTML)
        + '<div class="pkg-card-main">'
        + '<div class="pkg-card-name">' + esc(r.name) + '</div>'
        + '<div class="pkg-card-meta">v' + esc(r.version || '1.0.0') + ' · ' + fmtSize(r.size) + ' · ' + esc(permN) + '</div>'
        + '<div class="pkg-card-sub">' + (desktop ? '已在桌面' : '已从桌面移除') + ' · 安装于 ' + esc(new Date(r.installedAt || Date.now()).toLocaleDateString()) + '</div>'
        + '</div>'
        + '<div class="pkg-card-btns">'
        + (desktop ? '' : '<button class="pkg-btn ghost" data-reattach="' + esc(r.appId) + '">放回桌面</button>')
        + '<button class="pkg-btn ghost" data-open="' + esc(r.appId) + '">打开</button>'
        + '<button class="pkg-btn danger" data-uninstall="' + esc(r.appId) + '">卸载</button>'
        + '</div>'
        + '</div>';
    }
    list.innerHTML = h;
  }

  function refresh() {
    if (!api) { render(); return; }
    Promise.all([api.listPending(), api.listInstalled()]).then(function(rs) {
      S.pending = Array.isArray(rs[0]) ? rs[0] : [];
      S.installed = Array.isArray(rs[1]) ? rs[1] : [];
      render();
    }).catch(function() { render(); });
  }

  function closeSheet() {
    S.sheetKey = null;
    var ov = $('pkgSheetOverlay');
    if (ov) ov.classList.remove('on');
  }

  function openSheet(key) {
    var rec = null;
    for (var i = 0; i < S.pending.length; i++) if (S.pending[i].key === key) rec = S.pending[i];
    if (!rec) return;
    S.sheetKey = key;
    var pv = rec.preview || {};
    var mf = pv.manifest || {};
    var appId = mf.id ? ('pkg-' + mf.id) : '';
    var existing = null;
    for (var j = 0; j < S.installed.length; j++) if (S.installed[j].appId === appId) existing = S.installed[j];

    var meta = (api && api.permissionMeta) || {};
    var perms = pv.permissions || [];
    var permRows = '';
    if (!perms.length) {
      permRows = '<div class="pkg-perm-none">此应用未声明任何敏感权限</div>';
    } else {
      for (var k = 0; k < perms.length; k++) {
        var m = meta[perms[k]];
        permRows += '<div class="pkg-perm-row">' + permIconSVG()
          + '<div class="pkg-perm-txt"><div class="pkg-perm-name">' + esc(m ? m.label : perms[k]) + '</div>'
          + '<div class="pkg-perm-desc">' + esc(m ? m.desc : '自定义权限') + '</div></div></div>';
      }
    }

    var warns = '';
    if (pv.warnings && pv.warnings.length) {
      warns += '<div class="pkg-sheet-warns">';
      for (var w = 0; w < pv.warnings.length; w++) warns += '<div class="pkg-sheet-warn">' + esc(pv.warnings[w]) + '</div>';
      warns += '</div>';
    }

    var infoBits = '';
    if (pv.author) infoBits += '<div class="pkg-info-row"><span>作者</span><b>' + esc(pv.author) + '</b></div>';
    if (pv.description) infoBits += '<div class="pkg-info-row"><span>简介</span><b>' + esc(pv.description) + '</b></div>';
    infoBits += '<div class="pkg-info-row"><span>包体</span><b>' + esc(rec.zipName) + ' · ' + fmtSize(rec.size) + '</b></div>';

    var sheet = $('pkgSheet');
    sheet.innerHTML = '<div class="pkg-sheet-head">' + iconBox(pv.iconHTML)
      + '<div class="pkg-sheet-title"><div class="pkg-sheet-name">' + esc(pv.name || rec.zipName) + '</div>'
      + '<div class="pkg-sheet-ver">v' + esc(pv.version || '1.0.0') + (existing ? ' · 将覆盖已装的 v' + esc(existing.version || '1.0.0') : '') + '</div></div></div>'
      + '<div class="pkg-sheet-body">' + infoBits + warns
      + '<div class="pkg-perm-title">权限声明<span>安装后运行时仍会逐项询问</span></div>'
      + '<div class="pkg-perm-list">' + permRows + '</div></div>'
      + '<div class="pkg-sheet-foot">'
      + '<button class="pkg-btn ghost" data-sheet-cancel>取消</button>'
      + '<button class="pkg-btn primary" data-sheet-install="' + esc(key) + '">' + (existing ? '覆盖安装' : '安装') + '</button>'
      + '</div>';
    $('pkgSheetOverlay').classList.add('on');
  }

  function doInstall(key) {
    if (S.busy || !api) return;
    S.busy = true;
    var btn = document.querySelector('[data-sheet-install]');
    if (btn) { btn.textContent = '安装中…'; btn.setAttribute('disabled', 'true'); }
    api.installPending(key).then(function(r) {
      closeSheet();
      snack('已安装「' + r.name + '」' + (r.upgraded ? '（覆盖升级）' : '') + '，图标已放到桌面');
    }).catch(function(e) {
      snack('安装失败：' + ((e && e.message) || '未知错误'));
    }).then(function() { S.busy = false; refresh(); });
  }

  function askUninstall(appId) {
    var rec = null;
    for (var i = 0; i < S.installed.length; i++) if (S.installed[i].appId === appId) rec = S.installed[i];
    if (!rec) return;
    var box = $('pkgConfirm');
    box.innerHTML = '<div class="pkg-confirm-t">卸载「' + esc(rec.name) + '」？</div>'
      + '<div class="pkg-confirm-s">将同时清除它的权限记录与全部包数据，此操作不可恢复。</div>'
      + '<div class="pkg-confirm-btns"><button class="pkg-btn ghost" data-confirm-cancel>取消</button>'
      + '<button class="pkg-btn danger solid" data-confirm-uninstall="' + esc(appId) + '">卸载</button></div>';
    $('pkgConfirmOverlay').classList.add('on');
  }

  function closeConfirm() { var ov = $('pkgConfirmOverlay'); if (ov) ov.classList.remove('on'); }

  function doUninstall(appId) {
    if (S.busy || !api) return;
    S.busy = true;
    api.uninstallPackage(appId).then(function() {
      closeConfirm();
      snack('已卸载');
    }).catch(function(e) {
      snack('卸载失败：' + ((e && e.message) || '未知错误'));
    }).then(function() { S.busy = false; refresh(); });
  }

  function importFiles(files) {
    if (!api || !files || !files.length) return;
    if (S.busy) return;
    S.busy = true;
    snack('正在解析压缩包…');
    api.importFiles(files).then(function(results) {
      var ok = 0, fail = 0, firstErr = '';
      for (var i = 0; i < results.length; i++) {
        if (results[i].ok) ok++;
        else { fail++; if (!firstErr) firstErr = results[i].name + '：' + results[i].error; }
      }
      if (ok && fail) snack('导入完成：成功 ' + ok + ' 个，失败 ' + fail + ' 个');
      else if (ok) snack('导入完成：' + ok + ' 个压缩包待安装');
      else snack('导入失败：' + firstErr);
      S.tab = 'pending';
      syncTabs();
    }).catch(function(e) {
      snack('导入失败：' + ((e && e.message) || '未知错误'));
    }).then(function() { S.busy = false; refresh(); });
  }

  function syncTabs() {
    var tabs = root.querySelectorAll('.pkg-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].getAttribute('data-t') === S.tab);
  }

  // ---------- v7.57：配置讲解 + AI 提示词（帮助面板） ----------
  function openHelp() {
    var ov = $('pkgHelpOverlay');
    if (ov) ov.classList.add('on');
  }

  function closeHelp() {
    var ov = $('pkgHelpOverlay');
    if (ov) ov.classList.remove('on');
  }

  function copyPrompt(btn) {
    var pre = $('pkgAIPrompt');
    if (!pre) return;
    var text = pre.textContent || '';
    var done = function() {
      if (!btn) return;
      var old = btn.getAttribute('data-old') || btn.textContent;
      btn.setAttribute('data-old', old);
      btn.textContent = '已复制';
      clearTimeout(btn.__t);
      btn.__t = setTimeout(function() { btn.textContent = old; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function() { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text); done();
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (err) {}
    try { document.body.removeChild(ta); } catch (err) {}
  }

  // ---------- 事件（根节点委托，内联脚本只执行一次） ----------
  root.addEventListener('click', function(e) {
    var t = e.target;
    if (t.closest('#pkgImportTop') || t.closest('#pkgImportFab')) { var fi = $('pkgFileInput'); if (fi) fi.click(); return; }
    var tab = t.closest('.pkg-tab');
    if (tab) { S.tab = tab.getAttribute('data-t'); syncTabs(); render(); return; }

    // v7.57：帮助面板（配置讲解 + AI 提示词）
    if (t.closest('#pkgHelpBtn')) { openHelp(); return; }
    if (t.closest('[data-help-close]')) { closeHelp(); return; }
    if (t.closest('#pkgHelpCopy')) { copyPrompt(t.closest('#pkgHelpCopy')); return; }
    if (t.id === 'pkgHelpOverlay') { closeHelp(); return; }

    if (t.closest('[data-sheet-cancel]')) { closeSheet(); return; }
    var inst = t.closest('[data-sheet-install]');
    if (inst) { doInstall(inst.getAttribute('data-sheet-install')); return; }
    if (t.closest('[data-confirm-cancel]')) { closeConfirm(); return; }
    var un2 = t.closest('[data-confirm-uninstall]');
    if (un2) { doUninstall(un2.getAttribute('data-confirm-uninstall')); return; }

    if (t.id === 'pkgSheetOverlay') { closeSheet(); return; }
    if (t.id === 'pkgConfirmOverlay') { closeConfirm(); return; }

    var openBtn = t.closest('[data-open]');
    if (openBtn) { api.openPkgApp(openBtn.getAttribute('data-open')).catch(function(err) { snack((err && err.message) || '打开失败'); }); return; }
    var reBtn = t.closest('[data-reattach]');
    if (reBtn) { api.reattachToDesktop(reBtn.getAttribute('data-reattach')).then(function() { snack('已放回桌面'); refresh(); }).catch(function(err) { snack((err && err.message) || '操作失败'); }); return; }
    var unBtn = t.closest('[data-uninstall]');
    if (unBtn) { askUninstall(unBtn.getAttribute('data-uninstall')); return; }

    var card = t.closest('.pkg-card[data-key]');
    if (card && !t.closest('button')) { openSheet(card.getAttribute('data-key')); return; }
  });

  root.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest ? e.target.closest('.pkg-card[data-key]') : null;
    if (card) { e.preventDefault(); openSheet(card.getAttribute('data-key')); }
  });

  var fileInput = $('pkgFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      var fs = fileInput.files;
      if (fs && fs.length) importFiles(fs);
      fileInput.value = '';
    });
  }

  window.addEventListener('pkg-installer-refresh', refresh);
  // fix(v7.60)：实例销毁时退订 window 级 refresh 监听（page-stack 清理登记口），
  // 防重建实例后旧监听累积（旧监听虽指向 document 级查找仍可用，但每次重建净增）
  if (window.__addAppCleanup) {
    window.__addAppCleanup('installer', function() {
      window.removeEventListener('pkg-installer-refresh', refresh);
    });
  }

  refresh();
})();
<\/script>
`,xw={id:"installer",name:"安装包",isPkgHost:!0,pages:[{title:"安装包",content:ww}]},F=[a1,r1,o1,Ih,Ay,Py,By,Fy,Dy,zy,Ry,Oy,$y,Hy,Ny,qy,Xy,Uy,Ky,Qy,Jy,Zy,e2,t2,jy,Vy,Wy,Yy,Gy,n2,yw,xw],qr=F,Hp=qr.slice(0,24).map((e,t)=>({...e,slot:t})),Np=qr.slice(24).map((e,t)=>({...e,slot:t})),qp="v7_2026_08_16_threes_dice_flow11_parallel";function bw(){try{if(localStorage.getItem("ios-desktop:data-version")!==qp)return localStorage.removeItem("ios-desktop:pages-apps"),localStorage.setItem("ios-desktop:data-version",qp),[Hp,Np];const t=localStorage.getItem("ios-desktop:pages-apps");if(t){const i=JSON.parse(t);if(Array.isArray(i)&&i.length>0){for(const c of i){if(!Array.isArray(c))throw new Error("invalid");for(const p of c)if(!p||typeof p.id!="string"||typeof p.slot!="number")throw new Error("invalid")}const n=new Map(qr.map(c=>[c.id,c]));for(const c of i)for(let p=0;p<c.length;p++){const h=n.get(c[p].id);h&&(c[p]={...h,slot:c[p].slot})}let s=[];try{const c=JSON.parse(localStorage.getItem("ios-desktop:removed-apps")||"[]");Array.isArray(c)&&(s=c)}catch{}const a=new Set(s.map(c=>c&&typeof c=="object"?c.id:c).filter(c=>typeof c=="string"&&c)),r=(c,p)=>{for(const h of c)if(!(!h||typeof h.id!="string")&&(p.add(h.id),h.type==="folder"&&Array.isArray(h.apps)))for(const f of h.apps)f&&typeof f.id=="string"&&p.add(f.id)},l=new Set;for(const c of i)r(c,l);const d=qr.filter(c=>!l.has(c.id)&&!a.has(c.id));if(d.length){const c=i[i.length-1],p=d.filter(h=>c.length<24?(c.push({...h,slot:c.length}),!1):!0);p.length&&i.push(p.map((h,f)=>({...h,slot:f})))}return i}}}catch(e){console.warn("[state] 桌面存档损坏或格式不兼容，已降级为默认布局",e)}return[Hp,Np]}function Qe(){try{localStorage.setItem("ios-desktop:pages-apps",JSON.stringify(o.pagesApps))}catch{}}function Sw(){try{const e=localStorage.getItem("ios-desktop:removed-apps");if(e){const t=JSON.parse(e);if(Array.isArray(t))return t}}catch{}return[]}const o={pagesApps:bw(),currentPage:0,isEditMode:!1,removedApps:Sw(),currentIconEl:null,currentApp:null,isOpen:!1,isClosing:!1,returnToFolderOnClose:!1,contentWarm:!1,isDragging:!1,rafId:null,_frameHeartbeat:0,iconCX:0,iconCY:0,iconW:58,iconH:58,navHistory:[0],popInProgress:!1,subpageBackDir:0,subpageBackTy:0,posSpring:new lo(Ke(),0,0,0,0),scaleSpring:new Ie({...Ke(),initialValue:0,initialVelocity:0}),subpageSpring:new Ie({...Ke(),initialValue:0,initialVelocity:0}),gestureType:"NONE",drag:{active:!1,startX:0,startY:0,offsetX:0,offsetY:0,history:[]},shrinkToCard:!1,longPressTimer:null,iconDragState:null,edgePagingTimer:null,mouseDown:!1,lastGestureMoved:!1,lastGestureEndedAt:0};typeof window<"u"&&(window.__state=o);const kw=120,jp=38,Vp=10,Ew=.75,_w=.14,Tw=380,Wp=.0012,Mw=.18,Yp=72,vm=new Map;function Lw(e,t){!t||typeof t.canBack!="function"||typeof t.triggerBack!="function"||vm.set(e,t)}function ym(){if(!o.isOpen||o.isClosing||!o.currentApp||typeof window<"u"&&window.__splitInfo&&window.__splitInfo().active)return null;const e=vm.get(o.currentApp.id);if(!e)return null;try{if(!e.canBack())return null}catch{return null}return e}let ac=0,mt=!1,oa=!1,la=!1,Lt=null,ve=null,Tn=!1;const Cw='.md3-switch, .m3-slider-root, .md-fs-thumb, input[type="range"]',Vt={ENGAGE_PX:32,DOMINANCE:1.45,COMMIT_PX:62,COMMIT_VEL:520,DRAG_GAIN:.42,FAR_CROSS:160,FAR_GAIN:.16},x={active:!1,moved:!1,armTimer:0,fromDesktop:!1,fromBottomDrag:!1,dir:1,startX:0,startY:0,lastX:0,lastT:0,vx:0,lastTx:0,hintEl:null,rafId:0,pend:null,lastOpacity:-1,hintDir:0,grabInit:!1,grabOffsetX:0,grabOffsetScale:0,hintWatchdog:0,hintWatchdogArms:0};let jr=!1;try{if(typeof matchMedia=="function"){const e=matchMedia("(prefers-reduced-motion: reduce)");jr=!!e.matches,e.addEventListener?.("change",t=>{jr=!!t.matches})}}catch{}function Fo(){return!!(u.appWindow&&u.appWindow.classList.contains("open"))}function Ld(){if(document.body.classList.contains("is-locked")||_e())return!1;const e=document.getElementById("recentAppsOverlay");if(e&&e.classList.contains("active")||typeof window<"u"&&window.__splitInfo&&window.__splitInfo().active||o.isClosing)return!1;const t=o.drag.active&&o.gestureType==="BOTTOM";return!(o.isDragging&&!t||o.isOpen&&Fo()&&!t&&Math.abs(o.scaleSpring.x-1)>.02)}function wm(e){const t=hd();if(!t.length)return null;if(!o.isOpen||!o.currentApp||!Fo()){const r=t[0],l=F.findIndex(d=>d.id===r);return l===-1?null:{appId:r,idx:l,entryFromLeft:e>0}}const i=t.indexOf(o.currentApp.id),n=i===-1?0:i,s=e>0?t[n+1]:t[n-1];if(!s)return null;const a=F.findIndex(r=>r.id===s);return a===-1?null:{appId:s,idx:a,entryFromLeft:e>0}}const Iw='<svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="color:var(--md-on-surface-variant,#9a9b9e);"><path d="M14 8 30 24 14 40"/></svg>';function Aw(){if(x.hintEl&&x.hintEl.isConnected)return x.hintEl;const e=document.createElement("div");return e.id="quickSwitchHint",e.className="quick-switch-hint",e.setAttribute("aria-hidden","true"),e.innerHTML=`
    <div class="qsh-card">
      <div class="qsh-icon" data-app=""></div>
      <div class="qsh-meta">
        <div class="qsh-label"></div>
        <div class="qsh-name"></div>
      </div>
    </div>
  `,document.body.appendChild(e),x.hintEl=e,e}function xm(){x.hintWatchdog&&clearTimeout(x.hintWatchdog),x.hintWatchdog=setTimeout(()=>{x.hintWatchdog=0;const e=x.hintEl;if(!(!e||!e.isConnected)){if(x.active&&x.hintWatchdogArms<4){x.hintWatchdogArms+=1,xm();return}Id()}},2200)}function Pw(){if(x.dir===x.hintDir&&x.hintEl&&x.hintEl.isConnected)return;x.hintDir=x.dir;const e=wm(x.dir),t=Aw();xm(),t.classList.remove("leaving"),t.classList.toggle("from-left",x.dir>0),t.classList.toggle("edge",!e);const i=t.querySelector(".qsh-icon"),n=t.querySelector(".qsh-label"),s=t.querySelector(".qsh-name");if(e){const a=F[e.idx];i.dataset.app!==e.appId&&(i.innerHTML=a.type?Ye(a.type,!1):J(e.appId),i.dataset.app=e.appId),n.textContent=x.fromDesktop?"最近应用":x.dir>0?"上一应用":"下一应用",s.textContent=a?a.name:e.appId}else i.dataset.app!=="__edge__"&&(i.innerHTML=Iw,i.dataset.app="__edge__"),n.textContent="",s.textContent="已到应用列表边缘"}function bm(){const e=x.hintEl;x.hintEl=null,x.hintDir=0,x.lastOpacity=-1,x.hintWatchdog&&(clearTimeout(x.hintWatchdog),x.hintWatchdog=0),x.hintWatchdogArms=0,e&&(e.classList.add("leaving"),e.style.opacity="0",setTimeout(()=>{try{e.remove()}catch{}},240))}function Sm(){if(!x.pend)return;const e=x.pend;if(x.pend=null,!x.fromDesktop&&u.appWindow){const t=jr?`translate3d(${e.tx.toFixed(1)}px, 0px, 0px)`:`translate3d(${e.tx.toFixed(1)}px, 0px, 0px) rotateY(${(-x.dir*2.4*e.prog).toFixed(2)}deg) scale(${e.scale.toFixed(3)})`;u.appWindow.style.transform=t}if(x.hintEl){const t=Math.round(e.opacity*100)/100;t!==x.lastOpacity&&(x.hintEl.style.opacity=t.toFixed(2),x.lastOpacity=t)}}function km(){x.rafId&&(cancelAnimationFrame(x.rafId),x.rafId=0),x.pend&&Sm()}function Cd(e,t){return x.active?!0:Ld()?(x.active=!0,x.fromDesktop=!o.isOpen||!Fo(),x.fromBottomDrag=o.gestureType==="BOTTOM_SWITCH"||o.drag.active,x.dir=1,x.startX=e,x.startY=t,x.lastX=e,x.lastT=performance.now(),x.vx=0,x.lastTx=0,x.moved=!1,x.grabInit=!1,x.grabOffsetX=0,x.grabOffsetScale=0,x.rafId=0,x.pend=null,x.lastOpacity=-1,x.hintDir=0,ma(),u.gestureBarContainer&&u.gestureBarContainer.classList.add("switching"),navigator.vibrate&&navigator.vibrate(6),clearTimeout(x.armTimer),x.armTimer=setTimeout(()=>{x.active&&!x.moved&&Id()},400),!0):!1}function Id(){x.active&&(x.active=!1,clearTimeout(x.armTimer),km(),u.gestureBarContainer&&u.gestureBarContainer.classList.remove("switching"),bm(),u.appWindow&&!x.fromDesktop&&x.lastTx!==0&&(u.appWindow.style.transition="transform 0.3s cubic-bezier(0.22, 1.05, 0.28, 1)",u.appWindow.style.transform="translate3d(0px, 0px, 0px)",setTimeout(()=>{u.appWindow&&u.appWindow.style.transition&&(u.appWindow.style.transition="",x.active||(u.appWindow.style.transform=""))},340)),o.gestureType==="BOTTOM_SWITCH"&&(o.gestureType="BOTTOM"))}function Vr(e,t){if(!x.active)return;x.moved||(x.moved=!0,clearTimeout(x.armTimer));const i=e-x.startX,n=t-x.startY;if(Math.abs(n)>28&&Math.abs(n)>Math.abs(i)*1.2){Id();return}const s=performance.now(),a=Math.max(1,s-x.lastT),r=1-Math.exp(-a/50);x.vx+=r*((e-x.lastX)/a*1e3-x.vx),x.lastX=e,x.lastT=s,x.dir=i>=0?1:-1;const l=Math.abs(i),d=Math.min(l,Vt.FAR_CROSS)*Vt.DRAG_GAIN,c=Math.max(0,l-Vt.FAR_CROSS)*Vt.FAR_GAIN;let p=Math.sign(i)*(d+c);const h=M(Math.abs(p)/110,0,1);let f=jr?1:1-.012*h;if(!x.fromDesktop){if(!x.grabInit){x.grabInit=!0;const g=o.iconCX+o.posSpring.px-window.innerWidth/2;x.grabOffsetX=g-p,x.grabOffsetScale=o.scaleSpring.x-f}const y=M(1-Math.max(0,l-Vt.ENGAGE_PX)/150,0,1);p+=x.grabOffsetX*y,f=Math.max(.05,f+x.grabOffsetScale*y),x.lastTx=p}const m=M(l/130,0,1);x.pend={tx:p,scale:f,prog:h,opacity:.25+.75*m},x.rafId||(x.rafId=requestAnimationFrame(()=>{x.rafId=0,Sm()})),Pw()}function Em(){if(!x.active)return;x.active=!1,clearTimeout(x.armTimer),km(),u.gestureBarContainer&&u.gestureBarContainer.classList.remove("switching"),bm();const e=x.lastX-x.startX,t=e>=0?1:-1,i=Math.abs(e)>Vt.COMMIT_PX||Math.abs(x.vx)>Vt.COMMIT_VEL,n=wm(t);if(o.lastGestureMoved=!0,o.lastGestureEndedAt=performance.now(),i&&n){const s=window.innerWidth,a=window.innerHeight,r=Math.round(s*.52),l=Math.round(a*.52),d=Math.round((a-l)/2),c=n.entryFromLeft?{left:-Math.round(s*.3),top:d,width:r,height:l}:{left:Math.round(s*.78),top:d,width:r,height:l},p=n.entryFromLeft?{left:Math.round(s*1.1),top:d,width:r,height:l}:{left:-Math.round(s*.62),top:d,width:r,height:l};navigator.vibrate&&navigator.vibrate(12),j(n.idx,null,c,{prevExitRect:p,prevOffsetX:x.fromDesktop?0:x.lastTx});return}i&&!n&&navigator.vibrate&&navigator.vibrate([8,34]),u.appWindow&&!x.fromDesktop&&x.lastTx!==0?(u.appWindow.style.transition="transform 0.36s cubic-bezier(0.22, 1.05, 0.28, 1)",u.appWindow.style.transform="translate3d(0px, 0px, 0px)",setTimeout(()=>{u.appWindow&&u.appWindow.style.transition&&(u.appWindow.style.transition="",u.appWindow.style.transform="")},400)):u.appWindow&&!x.fromDesktop&&(u.appWindow.style.transition="",u.appWindow.style.transform="")}function Bw(e,t,i){o.drag.history.push({x:e,y:t,t:i}),o.drag.history.length>6&&o.drag.history.shift()}function rc(){const e=o.drag.history;if(e.length<2)return{vx:0,vy:0};let t=0,i=0,n=0;for(let s=e.length-1;s>0;s--){const a=(e[s].t-e[s-1].t)/1e3;a<=0||(t+=(e[s].x-e[s-1].x)/a,i+=(e[s].y-e[s-1].y)/a,n++)}return n?{vx:t/n,vy:i/n}:{vx:0,vy:0}}function Gp(e,t){if(mt)return;const i=performance.now()-ac;if(e<=40||e>=t)return;const{vx:n,vy:s}=rc(),a=Math.hypot(n,s);(i>110&&a<450||i>200||e>50&&s>-180)&&(mt=!0,navigator.vibrate&&navigator.vibrate([15,35]))}function Xp(e,t,i,n){const s=window.innerHeight*_w;return e>s||t>Tw||i<-220||n>35&&i<-120||n>90}function Gn(e,t,i=null,n=null){if(!i&&n&&n.closest&&n.closest(Cw)||document.body.classList.contains("is-locked")||_e())return;if(x.active||ma(),(i==="BOTTOM"||!i&&t>window.innerHeight-75)&&(!o.isOpen||!Fo())&&!o.isClosing&&!o.isDragging){const c=document.getElementById("themePickerOverlay"),p=!!(c&&c.classList.contains("active")),h=!!(typeof window<"u"&&window.__splitInfo&&window.__splitInfo().active);if(!p&&!h&&Cd(e,t))return}la=!1,Lt=null;const a=window.innerWidth,r=window.innerHeight;if(!o.isOpen||o.isClosing||o.isDragging){const c=document.getElementById("themePickerOverlay");if(!(!!(c&&c.classList.contains("active"))&&!o.isDragging&&!o.isClosing)){const h=typeof window<"u"?window.__splitGestures:null;if(o.isDragging||o.isClosing||!h||!h.active()||i!=="BOTTOM"&&t<=r-75||oa)return;oa=!0,o.gestureType="BOTTOM",ac=performance.now(),mt=!1,o.drag={active:!0,startX:e,startY:t,offsetX:0,offsetY:0,history:[{x:e,y:t,t:performance.now()}]},o.isDragging=!0,navigator.vibrate&&navigator.vibrate(8);return}}if(i)o.gestureType=i;else if(t>r-75)o.gestureType="BOTTOM";else if(e<jp)o.gestureType="EDGE_LEFT";else if(e>a-jp)o.gestureType="EDGE_RIGHT";else if(t>r-kw)o.gestureType="BOTTOM";else return;(o.gestureType==="EDGE_LEFT"||o.gestureType==="EDGE_RIGHT")&&(Tn=!1);const l=o.iconCX+o.posSpring.px,d=o.iconCY+o.posSpring.py;ac=performance.now(),mt=!1,o.drag={active:!0,startX:e,startY:t,offsetX:l-e,offsetY:d-t,history:[{x:e,y:t,t:performance.now()}],startSubP:o.navHistory.length>1?M(o.subpageSpring.x,0,1):1},o.isDragging=!0,u.appWindow&&u.appWindow.classList.add("dragging"),o.gestureType==="BOTTOM"&&u.triggerZone.classList.add("active"),o.rafId&&!Vf()&&(cancelAnimationFrame(o.rafId),o.rafId=null)}function Fw(){const e=o.gestureType==="EDGE_LEFT"?1:-1;if(o.subpageBackDir=e,o.subpageBackTy=0,Lt=Ov(),la=!!Lt,la)Lt.beginGesture(e);else if(o.navHistory.length<=1){const t=ym();if(t&&typeof t.beginGesture=="function")ve={kind:"module",def:t},t.beginGesture(e);else{const i=th();i&&i.canBack&&(ve={kind:"iframe",win:i.win},sa(i.win,{type:"PB_GESTURE",phase:"begin",dir:e}))}}o.gestureType==="EDGE_LEFT"?u.edgeLeft.classList.add("active"):u.edgeRight.classList.add("active")}function Do(e,t){if(x.active){Vr(e,t);return}if(_e()){o.drag.active&&(o.drag.active=!1,o.isDragging=!1,u.triggerZone.classList.remove("active"),u.edgeLeft.classList.remove("active"),u.edgeRight.classList.remove("active"),ve&&(ve.kind==="iframe"?sa(ve.win,{type:"PB_GESTURE",phase:"end",commit:!1,vx:0}):typeof ve.def.endGesture=="function"&&ve.def.endGesture(!1,0),ve=null));return}if(!o.drag.active)return;if(Bw(e,t,performance.now()),(o.gestureType==="EDGE_LEFT"||o.gestureType==="EDGE_RIGHT")&&!Tn){const s=e-o.drag.startX,a=t-o.drag.startY,r=Math.abs(s),l=Math.abs(a);if(r>=Vp&&r>l*1.1)Tn=!0,Fw();else if(l>=Vp&&l>=r){o.gestureType="NONE",o.drag.active=!1,o.isDragging=!1,u.appWindow&&u.appWindow.classList.remove("dragging");return}else return}const i=window.innerWidth,n=window.innerHeight;if(oa&&o.gestureType==="BOTTOM"){const s=o.drag.startY-t;Gp(s,window.innerHeight*.7),window.__splitGestures&&window.__splitGestures.nudge(s);return}if(o.gestureType==="BOTTOM"){if(!x.active){const h=e-o.drag.startX,f=o.drag.startY-t;if(Math.abs(h)>Vt.ENGAGE_PX&&Math.abs(h)>Math.abs(f)*Vt.DOMINANCE&&!mt&&Ld()&&(rd(),u.triggerZone.classList.remove("active"),Cd(o.drag.startX,o.drag.startY))){o.gestureType="BOTTOM_SWITCH",Vr(e,t);return}}const s=e+o.drag.offsetX,a=t+o.drag.offsetY,r=Math.hypot(e-o.drag.startX,t-o.drag.startY),l=o.drag.startY-t,d=n*Ew,c=1-r/d,p=M(c,-.3,1.2);Gp(l,n*.7),mt&&u.triggerZone.classList.add("holding-recents"),o.posSpring.x.x=s-o.iconCX,o.posSpring.x.v=0,o.posSpring.x.target=s-o.iconCX,o.posSpring.y.x=a-o.iconCY,o.posSpring.y.v=0,o.posSpring.y.target=a-o.iconCY,o.scaleSpring.x=p,o.scaleSpring.v=0,o.scaleSpring.target=p,er(p,s,a,{syncRadial:!0});return}if(o.gestureType==="EDGE_LEFT"||o.gestureType==="EDGE_RIGHT"){if(la&&Lt){const r=o.gestureType==="EDGE_LEFT"?e-o.drag.startX:o.drag.startX-e;Lt.progressGesture(r);return}if(ve){const r=o.gestureType==="EDGE_LEFT"?e-o.drag.startX:o.drag.startX-e,l=t-o.drag.startY;ve.kind==="iframe"?sa(ve.win,{type:"PB_GESTURE",phase:"progress",dx:r,dy:l}):typeof ve.def.progressGesture=="function"&&ve.def.progressGesture(r,l);return}const s=o.gestureType==="EDGE_LEFT"?e-o.drag.startX:o.drag.startX-e,a=Math.max(0,s);if(o.navHistory.length>1){const r=M(a/(i*.85),0,1),l=M(o.drag.startSubP-r,0,1);o.popInProgress=!1,o.subpageSpring.x=l,o.subpageSpring.v=0,o.subpageSpring.target=l,o.subpageBackTy=M((t-o.drag.startY)*Mw,-Yp,Yp),er(0,0,0,{forceSub:!0,main:!1})}else{const r=a/(i*.5),l=M(1-r*.35,.65,1),d=i/2+(e-o.drag.startX)*.3,c=n/2+(t-o.drag.startY)*.15;o.posSpring.x.x=d-o.iconCX,o.posSpring.y.x=c-o.iconCY,o.scaleSpring.x=l,er(l,d,c,{syncRadial:!0})}}}function is(){if(u.appWindow&&u.appWindow.classList.remove("dragging"),x.active&&Em(),!o.drag.active)return;o.drag.active=!1,o.isDragging=!1,u.triggerZone.classList.remove("active"),u.edgeLeft.classList.remove("active"),u.edgeRight.classList.remove("active"),o.gestureType!=="BOTTOM_SWITCH"&&rd();const{vx:e,vy:t}=rc(),i=Math.hypot(e,t),n=o.drag.history[o.drag.history.length-1]||{x:0,y:0},s=o.drag.history[0]||n,a=Math.hypot(n.x-s.x,n.y-s.y),r=s.y-n.y;if(o.lastGestureMoved=a>12,o.lastGestureEndedAt=performance.now(),oa&&o.gestureType==="BOTTOM"){if(oa=!1,o.gestureType="NONE",mt){mt=!1,Ft();return}window.__splitGestures&&(Xp(a,i,t,r)?window.__splitGestures.dismiss():window.__splitGestures.rebound());return}if(o.gestureType==="BOTTOM_SWITCH"){o.gestureType="NONE";return}if(o.gestureType==="BOTTOM"){if(u.triggerZone.classList.remove("holding-recents"),mt||o.isOpen&&r>50&&t>-300&&i<520){mt=!1;const l=o.currentApp?o.currentApp.id:null,d=rc();Ft(l,{vx:d.vx,vy:d.vy,vs:0}),o.gestureType="NONE";return}if(Xp(a,i,t,r)){const l=M(-i*Wp,-2.4,0);Bt(e,t,l)}else{const l=window.innerWidth/2-o.iconCX,d=window.innerHeight/2-o.iconCY;o.posSpring.setTarget(l,d,e*.2,t*.2),o.scaleSpring.setTarget(1,i*.002),Nn(1),et(qd)}o.gestureType="NONE";return}if(o.gestureType==="EDGE_LEFT"||o.gestureType==="EDGE_RIGHT"){if(!Tn){Tn=!1,o.gestureType="NONE";return}if(Tn=!1,Lt){la=!1;const p=o.gestureType==="EDGE_LEFT"?n.x-s.x:s.x-n.x,h=window.innerWidth,f=p>h*.5||i>400&&p>30,m=o.gestureType==="EDGE_LEFT"?e:-e;f?Lt.commitGesture(m):Lt.cancelGesture(m),Lt=null,o.gestureType="NONE";return}if(ve){const p=o.gestureType==="EDGE_LEFT"?n.x-s.x:s.x-n.x,h=window.innerWidth,f=p>h*.25||i>400&&p>30,m=o.gestureType==="EDGE_LEFT"?e:-e;ve.kind==="iframe"?sa(ve.win,{type:"PB_GESTURE",phase:"end",commit:f,vx:m}):typeof ve.def.endGesture=="function"&&ve.def.endGesture(f,m),ve=null,o.gestureType="NONE";return}const l=o.gestureType==="EDGE_LEFT"?n.x-s.x:s.x-n.x,d=window.innerWidth,c=l>d*.25||i>400&&l>30;if(o.navHistory.length>1){const p=o.gestureType==="EDGE_LEFT"?e:-e,h=M(-p/d,-4,4);c?On(h,{fromGesture:!0}):(o.popInProgress=!1,o.subpageSpring.setTarget(1,h),et())}else if(c)Bt(e,t,M(-i*Wp,-2.4,0));else{const p=window.innerWidth/2-o.iconCX,h=window.innerHeight/2-o.iconCY;o.posSpring.setTarget(p,h,0,0),o.scaleSpring.setTarget(1,0),Nn(1),et(qd)}o.gestureType="NONE"}}function Dw(){const e=u.gestureBarContainer||document.getElementById("gestureBarContainer");e&&(typeof window<"u"&&!window.__qsDebug&&(window.__qsDebug=()=>({active:x.active,eligible:Ld(),gestureType:o.gestureType,dragActive:o.drag.active,isDragging:o.isDragging,isClosing:o.isClosing,isOpen:o.isOpen,scale:Number(o.scaleSpring.x.toFixed(4)),recentPause:mt,pullPanels:_e(),recentsActive:!!(document.getElementById("recentAppsOverlay")||{}).classList?.contains?.("active")||!!(document.getElementById("recentAppsOverlay")&&document.getElementById("recentAppsOverlay").classList.contains("active"))})),e.addEventListener("pointerdown",t=>{Gn(t.clientX,t.clientY,"BOTTOM")}),e.addEventListener("touchstart",t=>{t.touches&&t.touches[0]&&(t.preventDefault(),t.stopPropagation(),Gn(t.touches[0].clientX,t.touches[0].clientY,"BOTTOM"))},{passive:!1}))}let Vs=[],pt=0,Pe=[];function zw(){_m(),Ow(),Rw()}function oc(){_m()}function _m(){Vs=[];const e=new Set,t=o.removedApps||[];for(const n of t)typeof n=="string"?e.add(n):n&&n.id&&e.add(n.id);F.forEach((n,s)=>{e.has(n.id)||Vs.push({type:"app",id:n.id,title:n.name,sub:"系统应用",iconType:n.type,action:a=>{if(a&&a.width>0)j(s,null,a);else{const r=document.querySelector(`[data-id="${n.id}"]`);j(s,r)}},keywords:[n.name,n.id]})}),[{title:"手电筒 / Torch",sub:"开关屏幕照明",iconKey:"torch",action:()=>{const n=document.querySelector('[data-tile-id="torch"]');n&&n.click()},keywords:["手电筒","torch","light","照明","闪光灯"]},{title:"深色模式 / Dark theme",sub:"切换系统色彩主题",iconKey:"darktheme",action:()=>{const n=document.querySelector('[data-tile-id="darktheme"]');n&&n.click()},keywords:["深色模式","暗黑模式","dark","theme","夜间模式"]},{title:"壁纸与样式 / Wallpaper",sub:"自定义 Material You 配色与壁纸",iconKey:"colour_correction",action:()=>{window.openThemePicker&&window.openThemePicker()},keywords:["壁纸","主题","样式","wallpaper","theme","color","颜色"]},{title:"省电模式 / Battery Saver",sub:"降低设备功耗",iconKey:"battery_saver",action:()=>{const n=document.querySelector('[data-tile-id="battery_saver"]');n&&n.click()},keywords:["省电","电池","battery","power"]},{title:"播放/暂停电台音乐",sub:"全局流媒体播放控制",iconKey:"song_search",action:()=>rt.togglePlay(),keywords:["音乐","电台","播放","play","music","radio","audio","暂停"]},{title:"屏幕录制 / Screen Record",sub:"开始/停止屏幕录制",iconKey:"screen_record",action:()=>{const n=document.querySelector('[data-tile-id="screen_record"]');n&&n.click()},keywords:["录屏","录制","screen record","video"]}].forEach(n=>{Vs.push({type:"action",title:n.title,sub:n.sub,iconKey:n.iconKey,action:n.action,keywords:n.keywords})})}function gl(e){if(!e||e.dataset.swipeAware==="1")return;e.dataset.swipeAware="1";let t=0,i=0,n=!1,s=!1,a=!1;const r=()=>{n=!1,s=!1,a=!1};e.addEventListener("click",d=>{a&&(d.stopImmediatePropagation(),d.preventDefault(),a=!1)},!0),e.addEventListener("mousedown",d=>{t=d.clientX,i=d.clientY,n=!0,s=!1,a=!1}),window.addEventListener("mousemove",d=>{if(!n)return;const c=d.clientX-t,p=d.clientY-i;(Math.abs(c)>8||Math.abs(p)>8)&&(a=!0),!s&&Math.abs(c)>12&&Math.abs(c)>Math.abs(p)*1.15&&(s=!0,Zs(t)),s&&Ji(d.clientX)}),window.addEventListener("mouseup",d=>{if(!n)return;if(n=!1,s){s=!1,Ni();return}const c=d.clientY-i;i>window.innerHeight-90&&c<-45&&(a=!0,Ft())}),e.addEventListener("touchstart",d=>{const c=d.touches[0];c&&(t=c.clientX,i=c.clientY,n=!0,s=!1,a=!1)},{passive:!0}),e.addEventListener("touchmove",d=>{if(!n)return;const c=d.touches[0];if(!c)return;const p=c.clientX-t,h=c.clientY-i;(Math.abs(p)>8||Math.abs(h)>8)&&(a=!0),!s&&Math.abs(p)>12&&Math.abs(p)>Math.abs(h)*1.15&&(s=!0,Zs(t)),s&&(Ji(c.clientX),d.cancelable&&d.preventDefault())},{passive:!1});const l=d=>{if(!n)return;if(n=!1,s){s=!1,Ni();return}const c=d.changedTouches&&d.changedTouches[0],p=c?c.clientY-i:0;i>window.innerHeight-90&&p<-45&&(a=!0,Ft())};e.addEventListener("touchend",l,{passive:!0}),e.addEventListener("touchcancel",()=>{s&&(s=!1,Ni()),r()},{passive:!0})}function Rw(){const e=document.getElementById("desktopSearchWidget");e&&e.remove();const t=document.createElement("div");t.id="desktopSearchWidget",t.className="desktop-search-pill",t.innerHTML=`
    <div class="search-pill-left">
      <span class="search-g-logo">G</span>
      <span class="search-placeholder">搜索应用、联系人、设置、即时计算...</span>
    </div>
    <div class="search-pill-right">
      <button class="search-icon-btn mic-btn" title="语音助手">${v.mic_access}</button>
      <button class="search-icon-btn lens-btn" title="智慧镜头">${v.google_lens}</button>
    </div>
  `,t.querySelector(".search-pill-left").addEventListener("click",i=>{i.stopPropagation(),Cs()}),t.querySelector(".mic-btn").addEventListener("click",i=>{i.stopPropagation(),Cs();const n=document.getElementById("globalSearchInput");n&&(n.placeholder="正在聆听语音指令...",setTimeout(()=>{n.placeholder.includes("聆听")&&(n.placeholder="输入应用名称、计算式或功能...")},3e3))}),t.querySelector(".lens-btn").addEventListener("click",i=>{if(i.stopPropagation(),F.find(s=>s.id==="camera")){const s=F.findIndex(r=>r.id==="camera"),a=document.querySelector('[data-id="camera"]');j(s,a)}else Cs()}),t.addEventListener("click",()=>{Cs()}),gl(t.querySelector(".search-pill-left")),gl(t.querySelector(".mic-btn")),gl(t.querySelector(".lens-btn")),document.body.appendChild(t)}function Ow(){let e=document.getElementById("pixelSearchOverlay");if(e)return;e=document.createElement("div"),e.id="pixelSearchOverlay",e.className="pixel-search-overlay",e.innerHTML=`
    <div class="search-modal-card">
      <div class="search-input-box">
        <span class="search-input-icon">${v.search}</span>
        <input type="text" id="globalSearchInput" placeholder="输入应用名称、计算式或功能..." autocomplete="off">
        <button class="search-clear-btn" id="searchClearBtn" style="display:none;">${v.close}</button>
      </div>

      <!-- 快捷标签推荐 -->
      <div class="search-quick-chips" id="searchQuickChips">
        <button class="search-chip" data-query="2048">${v.star} 纸牌接龙</button>
        <button class="search-chip" data-query="信息">${v.chat} 角色消息</button>
        <button class="search-chip" data-query="相机">${v.photo_camera} 拍照录像</button>
        <button class="search-chip" data-query="壁纸">${v.palette} 壁纸样式</button>
        <button class="search-chip" data-query="手电筒">${v.torch} 手电筒</button>
      </div>

      <!-- 搜索结果列表 -->
      <div class="search-results-list" id="searchResultsList"></div>
    </div>
  `,e.addEventListener("click",n=>{n.target===e&&Mm()}),document.body.appendChild(e);const t=document.getElementById("globalSearchInput"),i=document.getElementById("searchClearBtn");t.addEventListener("input",n=>{const s=n.target.value.trim();i.style.display=s?"flex":"none",or(s)}),i.addEventListener("click",()=>{t.value="",i.style.display="none",t.focus(),or("")}),e.querySelectorAll(".search-chip").forEach(n=>{n.addEventListener("click",()=>{const s=n.dataset.query;t.value=s,i.style.display="flex",or(s),t.focus()})}),t.addEventListener("keydown",n=>{if(n.key==="ArrowDown")n.preventDefault(),Pe.length>0&&(pt=(pt+1)%Pe.length,Kp());else if(n.key==="ArrowUp")n.preventDefault(),Pe.length>0&&(pt=(pt-1+Pe.length)%Pe.length,Kp());else if(n.key==="Enter"&&(n.preventDefault(),Pe[pt])){const a=document.querySelectorAll(".search-result-item")[pt],r=a&&a.querySelector(".search-item-icon")?.getBoundingClientRect()||null;Tm(Pe[pt],r)}})}function or(e){if(!document.getElementById("searchResultsList"))return;if(Pe=[],pt=0,!e){Pe=Vs.slice(0,6),Up(Pe,"为你推荐");return}if(/^[\d\s\+\-\*\/\(\)\.\^%]+$/.test(e)&&/[\+\-\*\/\^%]/.test(e))try{const n=e.replace(/\^/g,"**"),s=Function(`'use strict'; return (${n})`)();typeof s=="number"&&!isNaN(s)&&Pe.push({type:"calc",title:`${e} = ${s}`,sub:"即时数学计算结果 (按 Enter 复制)",iconText:v.calculator,action:()=>{navigator.clipboard.writeText(String(s)),window.showSystemToast&&window.showSystemToast(`已复制计算结果: ${s}`,v.content_copy)}})}catch{}const i=e.toLowerCase();Vs.forEach(n=>{(n.keywords.some(a=>a.toLowerCase().includes(i))||n.title.toLowerCase().includes(i))&&Pe.push(n)}),Pe.push({type:"web",title:`在 Google 中搜索 “${e}”`,sub:"打开网页搜索",iconText:v.language,action:()=>{window.open(`https://www.google.com/search?q=${encodeURIComponent(e)}`,"_blank")}}),Up(Pe,`找到 ${Pe.length} 个结果`)}function Up(e,t){const i=document.getElementById("searchResultsList");if(i){if(e.length===0){i.innerHTML='<div class="search-empty">未找到相关结果</div>';return}i.innerHTML=`
    <div class="search-section-title">${t}</div>
    <div class="search-items-wrap">
      ${e.map((n,s)=>`
        <div class="search-result-item ${s===pt?"selected":""}" data-idx="${s}">
          <div class="search-item-icon">
            ${n.type==="app"?n.iconType?Ye(n.iconType,!1):J(n.id):n.iconKey?v[n.iconKey]:n.iconText||v.auto_awesome}
          </div>
          <div class="search-item-info">
            <div class="search-item-title">${n.title}</div>
            <div class="search-item-sub">${n.sub}</div>
          </div>
          <span class="search-item-enter">${v.corner_down_left}</span>
        </div>
      `).join("")}
    </div>
  `,i.querySelectorAll(".search-result-item").forEach(n=>{n.addEventListener("click",()=>{const s=parseInt(n.dataset.idx,10);if(e[s]){const a=n.querySelector(".search-item-icon")?.getBoundingClientRect()||null;Tm(e[s],a)}})})}}function Kp(){document.querySelectorAll(".search-result-item").forEach((t,i)=>{t.classList.toggle("selected",i===pt),i===pt&&t.scrollIntoView({block:"nearest"})})}function Tm(e,t=null){Mm(),e&&e.action&&setTimeout(()=>e.action(t),50)}function Cs(){const e=document.getElementById("pixelSearchOverlay"),t=document.getElementById("globalSearchInput");!e||!t||(e.classList.add("active"),t.value="",document.getElementById("searchClearBtn").style.display="none",or(""),setTimeout(()=>t.focus(),80))}function Mm(){const e=document.getElementById("pixelSearchOverlay");e&&e.classList.remove("active")}function $w(){document.body.style.textRendering="optimizeLegibility",document.documentElement.style.webkitFontSmoothing="antialiased",window.addEventListener("keydown",e=>{if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"){e.key==="Escape"&&e.target.blur();return}if(e.key==="Escape"){const t=document.getElementById("pixelSearchOverlay");if(t&&t.classList.contains("active")){t.classList.remove("active");return}const i=document.getElementById("themePickerOverlay");if(i&&i.classList.contains("active")){window.__closeThemePickerAnimated?window.__closeThemePickerAnimated():i.classList.remove("active");return}const n=document.getElementById("recentAppsOverlay");if(n&&n.classList.contains("active")){window.__closeRecentApps?window.__closeRecentApps():n.classList.remove("active");return}const s=document.getElementById("pullPanelsOverlay");if(s&&s.classList.contains("active")){qe();return}const a=document.getElementById("appContextMenu");if(a&&a.classList.contains("active")){a.classList.remove("active");return}if(o.isOpen){Bt(0,-600,-2);return}}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"||e.key==="/"){e.preventDefault(),Cs();return}if(e.code==="Space"&&!o.isOpen){e.preventDefault(),rt.togglePlay();return}o.isOpen||(e.key==="ArrowLeft"?ct(o.currentPage-1):e.key==="ArrowRight"&&ct(o.currentPage+1))}),document.addEventListener("visibilitychange",()=>{const e=document.hidden;document.querySelectorAll("iframe").forEach(t=>{try{t.contentWindow.postMessage({type:"SYSTEM_VISIBILITY_CHANGE",hidden:e},"*")}catch{}})})}const Lm="ios-desktop:pinned-cities";let je=[],vl=null;function Hw(){try{const e=localStorage.getItem(Lm);if(e){const t=JSON.parse(e);if(Array.isArray(t))return t.filter(i=>i&&typeof i.name=="string"&&typeof i.offset=="number")}}catch{}return[]}function Cm(){try{localStorage.setItem(Lm,JSON.stringify(je))}catch{}}function Nw(e){const t=new Date;return new Date(t.getTime()+t.getTimezoneOffset()*6e4+e*36e5)}function qw(e){const t=e.getHours();return`${t>=12?"下午":"上午"} ${t%12||12}:${String(e.getMinutes()).padStart(2,"0")}`}function Ad(){const e=document.getElementById("glanceCitiesRow");if(e){if(!je.length){e.style.display="none",e.innerHTML="";return}e.style.display="flex",e.innerHTML=je.map(t=>`
    <div class="glance-chip glance-city-chip" data-city-id="${t.id}" title="点击打开时钟">
      <span class="glance-chip-icon" style="color:var(--md-primary,#a8c7fa);">${v.push_pin}</span>
      <span class="glance-chip-text" data-city-time>${t.name} · --:--</span>
      <span class="glance-city-unpin" data-unpin-id="${t.id}" title="取消钉选" style="opacity:.55;cursor:pointer;">${v.close}</span>
    </div>
  `).join(""),e.querySelectorAll(".glance-city-chip").forEach(t=>{t.addEventListener("click",i=>{i.stopPropagation();const n=i.target.closest("[data-unpin-id]")?.getAttribute("data-unpin-id");if(n){Am(n,!0);return}Is("clock_app")})}),Im()}}function Im(){je.forEach(e=>{const t=document.querySelector(`.glance-city-chip[data-city-id="${e.id}"] [data-city-time]`);t&&(t.textContent=`${e.name} · ${qw(Nw(e.offset))}`)})}function jw(e){if(!(!e||!e.id||je.some(t=>t.id===e.id))){if(je.length>=6){window.showSystemToast&&window.showSystemToast("最多钉选 6 个城市，请先取消一个",v.push_pin);return}je.push({id:e.id,name:e.name,country:e.country||"",offset:e.offset}),Cm(),Ad(),Rr("clock/pins-changed",{pins:je,__silent:!0},""),window.showSystemToast&&window.showSystemToast(`已把「${e.name}」钉到桌面`,v.push_pin)}}function Am(e,t){const i=je.find(n=>n.id===e);je=je.filter(n=>n.id!==e),Cm(),Ad(),Rr("clock/pins-changed",{pins:je,__silent:!0},""),t&&i&&window.showSystemToast&&window.showSystemToast(`已取消钉选「${i.name}」`,v.push_pin)}function Vw(){je=Hw(),ar("clock/pin-city",e=>jw(e)),ar("clock/unpin-city",e=>Am(e&&e.id,!1)),ar("clock/request-pins",()=>{at("clock_app","clock/pins",{pins:je,__silent:!0},"")}),Ad(),vl&&clearInterval(vl),vl=setInterval(Im,3e4)}let Ht={temp:26,condition:"晴朗",icon:v.weather_sunny,aqi:"优质 32"};const Ww={0:{desc:"晴朗",icon:v.weather_sunny},1:{desc:"晴朗",icon:v.weather_partly},2:{desc:"多云",icon:v.weather_partly},3:{desc:"阴天",icon:v.weather_cloudy},45:{desc:"有雾",icon:v.weather_fog},48:{desc:"雾凇",icon:v.weather_fog},51:{desc:"小雨",icon:v.weather_drizzle},61:{desc:"小雨",icon:v.weather_rain},63:{desc:"中雨",icon:v.weather_rain},65:{desc:"大雨",icon:v.weather_rain},71:{desc:"小雪",icon:v.weather_snow},73:{desc:"大雪",icon:v.weather_snow},95:{desc:"雷阵雨",icon:v.weather_thunder}};function Yw(){Xw(),rt.subscribe(Uw),Gw(),Vw()}async function Gw(){const e=new AbortController,t=setTimeout(()=>e.abort(),8e3);try{let i=39.9042,n=116.4074,s=!1;if(navigator.permissions&&navigator.permissions.query&&navigator.geolocation)try{const r=await navigator.permissions.query({name:"geolocation"});if(r&&r.state==="granted"){const l=await new Promise((d,c)=>{navigator.geolocation.getCurrentPosition(d,c,{timeout:4e3,maximumAge:6e5})});l&&l.coords&&(i=l.coords.latitude,n=l.coords.longitude,s=!0)}}catch{}s||(i=39.9042,n=116.4074);const a=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${i}&longitude=${n}&current=temperature_2m,weather_code&timezone=auto`,{signal:e.signal});if(a.ok){const r=await a.json();if(r&&r.current){const l=r.current.weather_code||0,d=Ww[l]||{desc:"多云",icon:v.weather_partly};Ht.temp=Math.round(r.current.temperature_2m),Ht.condition=d.desc,Ht.icon=d.icon;const c=document.getElementById("glanceWeatherBtn");c&&(c.innerHTML=`
            <span class="glance-weather-icon">${Ht.icon}</span>
            <span class="glance-weather-temp">${Ht.temp}°C</span>
            <span class="glance-weather-cond">${Ht.condition}</span>
          `)}}}catch(i){console.log("Glance weather sync:",i&&i.name==="AbortError"?"timeout(8s)":i)}finally{clearTimeout(t)}}function Xw(){const e=document.getElementById("pixelAtAGlance");e&&e.remove();const t=document.createElement("div");t.id="pixelAtAGlance",t.className="pixel-at-a-glance";const i=new Date,n=["周日","周一","周二","周三","周四","周五","周六"],s=["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],a=`${n[i.getDay()]}, ${s[i.getMonth()]}${i.getDate()}日`;t.innerHTML=`
    <div class="glance-main-row">
      <div class="glance-date" id="glanceDateText">${a}</div>
      <div class="glance-weather" id="glanceWeatherBtn" title="查看详细天气">
        <span class="glance-weather-icon">${Ht.icon}</span>
        <span class="glance-weather-temp">${Ht.temp}°C</span>
        <span class="glance-weather-cond">${Ht.condition}</span>
      </div>
    </div>
    <div class="glance-sub-row" id="glanceSubRow">
      <div class="glance-chip" id="glanceScheduleChip">
        <span class="glance-chip-icon">${v.calendar_month}</span>
        <span class="glance-chip-text">下午 3:00 - 项目架构与矢量动效评审</span>
      </div>
      <div class="glance-chip music-chip" id="glanceMusicChip" style="display:none;">
        <span class="glance-chip-icon">${v.music_note}</span>
        <span class="glance-chip-text" id="glanceMusicText">正在播放</span>
      </div>
    </div>
    <div class="glance-sub-row" id="glanceCitiesRow" style="display:none;"></div>
  `,t.querySelector("#glanceDateText").addEventListener("click",l=>{l.stopPropagation(),Is("cal_app")}),t.querySelector("#glanceScheduleChip").addEventListener("click",l=>{l.stopPropagation(),Is("cal_app")}),t.querySelector("#glanceWeatherBtn").addEventListener("click",l=>{l.stopPropagation(),Is("weather")}),t.querySelector("#glanceMusicChip").addEventListener("click",l=>{l.stopPropagation(),Is("music")});const r=document.getElementById("desktop");r&&r.insertBefore(t,r.firstChild)}function Uw(e){const t=document.getElementById("glanceMusicChip"),i=document.getElementById("glanceMusicText"),n=document.getElementById("glanceScheduleChip");!t||!i||(e.isPlaying&&e.track?(t.style.display="inline-flex",i.textContent=`${e.track.title} • ${e.track.artist}`,n&&(n.style.display="none")):(t.style.display="none",n&&(n.style.display="inline-flex")))}function Is(e){const t=F.findIndex(i=>i.id===e);if(t!==-1){const i=document.querySelector(`[data-id="${e}"]`);j(t,i)}}let ae=null;const Kw={msg:[{title:"快速会话",icon:v.chat,action:(e,t)=>j(e,t)},{title:"角色切换",icon:v.auto_awesome,action:(e,t)=>{j(e,t),setTimeout(()=>{const i=document.querySelector(".page-iframe");i&&i.contentWindow.postMessage({type:"QUICK_SWITCH_ROLE"},"*")},500)}}],camera:[{title:"自拍模式",icon:v.photo_camera,action:(e,t)=>j(e,t)},{title:"录制视频",icon:v.videocam,action:(e,t)=>j(e,t)}],settings:[{title:"壁纸与样式",icon:v.palette,action:()=>{window.openThemePicker&&window.openThemePicker()}}],notes:[{title:"新建便签",icon:v.edit,action:(e,t)=>j(e,t)}],calculator:[{title:"即时计算",icon:v.calculator,action:(e,t)=>j(e,t)}]};function Pm(){Qw(),window.addEventListener("pointerdown",e=>{ae&&ae.classList.contains("active")&&!ae.contains(e.target)&&Ai()})}function Qw(){ae=document.createElement("div"),ae.id="appContextMenu",ae.className="app-context-menu",document.body.appendChild(ae)}function Jw(e,t,i,n){if(!ae||!e)return;const s=F.findIndex(g=>g.id===e.id),a=Kw[e.id]||[],r=Gl().indexOf(e.id)!==-1,l=typeof window<"u"&&typeof window.__miniWindowOpen=="function";ae.innerHTML=`
    <div class="menu-header">
      <div class="menu-header-icon">${J(e.id)}</div>
      <div class="menu-header-title">${e.name}</div>
    </div>

    ${a.length>0?`
      <div class="menu-shortcuts-list">
        ${a.map((g,w)=>`
          <div class="menu-item shortcut-item" data-shortcut-idx="${w}">
            <span class="menu-item-icon">${g.icon}</span>
            <span class="menu-item-text">${g.title}</span>
          </div>
        `).join("")}
      </div>
      <div class="menu-divider"></div>
    `:""}

    <div class="menu-system-actions">
      <div class="menu-item action-open">
        <span class="menu-item-icon">${v.launch}</span>
        <span class="menu-item-text">打开应用</span>
      </div>
      ${l?`
      <div class="menu-item action-mini">
        <span class="menu-item-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="15" rx="2.5"/><rect x="12.5" y="11.5" width="8" height="6.5" rx="1.5" fill="currentColor" stroke="none"/></svg>
        </span>
        <span class="menu-item-text">以小窗打开</span>
      </div>`:""}
      <div class="menu-item action-dock ${r?"dock-remove":"dock-add"}">
        <span class="menu-item-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="15" width="18" height="6" rx="2"/><rect x="5" y="3" width="4" height="4" rx="1"/><rect x="10" y="3" width="4" height="4" rx="1"/><rect x="15" y="3" width="4" height="4" rx="1"/></svg>
        </span>
        <span class="menu-item-text">${r?"从 Dock 移除":"添加到 Dock"}</span>
      </div>
      <div class="menu-item action-edit">
        <span class="menu-item-icon">${v.edit}</span>
        <span class="menu-item-text">编辑主屏幕 (重排图标)</span>
      </div>
    </div>
  `,ae.querySelectorAll(".shortcut-item").forEach(g=>{g.addEventListener("click",w=>{w.stopPropagation(),Ai();const k=parseInt(g.dataset.shortcutIdx,10);a[k]&&a[k].action&&a[k].action(s,t)})}),ae.querySelector(".action-open").addEventListener("click",g=>{g.stopPropagation(),Ai(),j(s,t)});const d=ae.querySelector(".action-mini");d&&d.addEventListener("click",g=>{g.stopPropagation(),Ai();try{window.__miniWindowOpen(e.id,null)}catch{}});const c=ae.querySelector(".action-dock");c&&c.addEventListener("click",g=>{g.stopPropagation();const w=c.classList.contains("dock-remove");Ai(),w?(Eo(e.id),window.showSystemToast&&window.showSystemToast("已从 Dock 移除「"+e.name+"」")):Eh(e.id)?window.showSystemToast&&window.showSystemToast("已添加「"+e.name+"」到 Dock"):Gl().length>=Qi&&window.showSystemToast&&window.showSystemToast("Dock 已满（最多 "+Qi+" 个），长按 Dock 图标可移除")}),ae.querySelector(".action-edit").addEventListener("click",g=>{g.stopPropagation(),Ai(),Kc()}),ae.style.visibility="hidden",ae.classList.add("active");const p=200,h=ae.offsetHeight||180,f=window.innerWidth;let m=i-p/2,y=n-h-12;y<60&&(y=n+20),m<16&&(m=16),m+p>f-16&&(m=f-p-16),ae.style.left=`${m}px`,ae.style.top=`${y}px`,ae.style.visibility="visible",navigator.vibrate&&navigator.vibrate([15,30,15])}function Ai(){ae&&ae.classList.remove("active")}const Zw=Object.freeze(Object.defineProperty({__proto__:null,closeContextMenu:Ai,initContextMenu:Pm,showContextMenu:Jw},Symbol.toStringTag,{value:"Module"})),Bm="ios-desktop:split-groups",ex=4;let Ee=[],Fm=!1;function lc(e,t){return[e,t].sort().join("|")}function Qp(e){return e.type?Ye(e.type,!1):J(e.id)}function Xn(e){return F.find(t=>t.id===e)||null}function tx(){Ee=[];try{const e=JSON.parse(localStorage.getItem(Bm)||"[]");if(!Array.isArray(e))return;const t=new Set;for(const i of e){if(!i||typeof i!="object")continue;const n=String(i.aId||""),s=String(i.bId||"");if(!Xn(n)||!Xn(s)||n===s)continue;const a=lc(n,s);t.has(a)||(t.add(a),Ee.push({id:a,aId:n,bId:s,ratio:Math.min(.76,Math.max(.24,Number(i.ratio)||.5)),axis:i.axis==="x"?"x":"y",ts:Number(i.ts)||Date.now()}))}}catch{Ee=[]}}function Dm(){try{localStorage.setItem(Bm,JSON.stringify(Ee))}catch{}}function zm(){return Ee.slice()}function Pd(e){return Ee.find(t=>t.id===e)||null}function ix(e,t,i=.5,n="y",s={}){const a=Xn(e),r=Xn(t);let l=null;if(a&&r&&e!==t){const d=lc(e,t),c=Ee.find(p=>p.id===d);c?(c.ratio=Math.min(.76,Math.max(.24,Number(i)||.5)),c.axis=n==="x"?"x":"y",c.ts=Date.now(),Ee=Ee.filter(p=>p.id!==d),Ee.unshift(c)):(Ee.length>=ex&&(l=Ee.pop()),Ee.unshift({id:d,aId:e,bId:t,ratio:Math.min(.76,Math.max(.24,Number(i)||.5)),axis:n==="x"?"x":"y",ts:Date.now()})),Dm(),zo({silent:!!s.silentRender})}return{group:Pd(lc(e,t)),evicted:l}}function Rm(e){const t=Ee.length;return Ee=Ee.filter(i=>i.id!==e),Ee.length!==t?(Dm(),zo(),!0):!1}function nx(e,t){const i=Xn(e),n=Xn(t);return!i||!n?"":`<span class="sgi sgi-a">${Qp(i)}</span><span class="sgi sgi-b">${Qp(n)}</span>`}function sx(e){return null}function zo(e={}){const t=document.getElementById("desktop");if(t){t.classList.remove("has-split-tray");const i=document.getElementById("splitGroupTray");i&&i.remove()}}function Om(){tx(),Fm=!0,zo()}function ax(){return Fm}typeof window<"u"&&(window.__splitGroups={list:zm,get:Pd,remove:Rm});const rx=Object.freeze(Object.defineProperty({__proto__:null,buildPairIconHTML:nx,getChipRect:sx,getSplitGroup:Pd,initSplitGroups:Om,isSplitGroupsBooted:ax,listSplitGroups:zm,removeSplitGroup:Rm,renderTray:zo,saveSplitGroup:ix},Symbol.toStringTag,{value:"Module"})),$m="ios-desktop:profiles",Hm="ios-desktop:active-profile";let lr=!1;function ox(){const e=Yt();if(e)return{kind:"procedural",id:e};const t=bv();return t?t.startsWith("blob:")||t.startsWith("data:")?{kind:"custom"}:{kind:"preset",url:t}:{kind:"preset",url:Qu}}function cc(){const e=t=>JSON.parse(JSON.stringify(t||[]));return{hue:Ev()||215,themeMode:Oc()||"dark",wallpaper:ox(),pagesApps:e(o.pagesApps),removedApps:e(o.removedApps),dnd:document.body.classList.contains("dnd-mode-active")}}function lx(){try{const e=localStorage.getItem($m);if(e){const t=JSON.parse(e);if(t&&t.personal&&t.work)return t}}catch{}return null}function Nm(e){try{localStorage.setItem($m,JSON.stringify(e))}catch{}}function cx(){try{return localStorage.getItem(Hm)||"personal"}catch{return"personal"}}function qm(e){try{localStorage.setItem(Hm,e)}catch{}}function dx(){const e={id:"personal",name:"个人",...cc()},t={id:"work",name:"工作",...cc(),hue:155,themeMode:"dark",wallpaper:{kind:"preset",url:"https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80"}},i={personal:e,work:t};return Nm(i),qm("personal"),i}function px(e){if(!(!e||e.kind==="custom")){if(e.kind==="procedural"&&e.id){Hi(),Ut();try{localStorage.removeItem("ios-desktop:wallpaper"),sessionStorage.removeItem("ios-desktop:wallpaper")}catch{}Pn(e.id,{persist:!0,showToast:!1});return}if(e.kind==="preset"&&e.url){if(e.url===Qu){Hi(),Bn(),Ut();try{localStorage.removeItem("ios-desktop:wallpaper"),sessionStorage.removeItem("ios-desktop:wallpaper")}catch{}Pn("aurora",{persist:!0,showToast:!1});return}Hi(),Bn(),Ut();try{localStorage.setItem("ios-desktop:wallpaper",e.url)}catch{}document.getElementById("desktop").style.backgroundImage=`url('${e.url}')`,document.querySelectorAll("iframe").forEach(t=>{try{t.contentWindow.postMessage({type:"set-wallpaper",url:e.url},"*")}catch{}})}}}const Jp="profile-anim-style";function jm(){if(document.getElementById(Jp))return;const e=document.createElement("style");e.id=Jp,e.textContent=`
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
  `,document.head.appendChild(e)}function ux(e){const t=document.getElementById("desktop");if(!t||!e)return()=>{};jm();const i=document.createElement("div");return i.id="profileWpFader",i.style.backgroundImage=`url('${e}')`,t.insertBefore(i,t.firstChild),requestAnimationFrame(()=>requestAnimationFrame(()=>{i.style.opacity="1"})),()=>setTimeout(()=>i.remove(),650)}function fx(){const e=document.getElementById("desktopSlider")||document.querySelector(".desktop-slider");e&&(e.classList.add("profile-relayout"),e.querySelectorAll(".app-icon, .app-folder").forEach((t,i)=>{t.style.animationDelay=`${i%24*16}ms`}),setTimeout(()=>{e.classList.remove("profile-relayout"),e.querySelectorAll(".app-icon, .app-folder").forEach(t=>{t.style.animationDelay=""})},1100))}let Nt=null,kt="personal";function hx(){Nt=lx()||dx(),kt=cx(),Nt[kt]||(kt="personal"),jm(),window.__profiles={toggle:()=>Zp(kt==="personal"?"work":"personal"),switchTo:e=>Zp(e),current:()=>kt,isSwitching:()=>lr,list:()=>Object.values(Nt).map(e=>({id:e.id,name:e.name,hue:e.hue,active:e.id===kt}))}}function Zp(e){if(lr||!Nt||!Nt[e]||e===kt)return;lr=!0,Nt[kt]={...Nt[kt],...cc()},Nm(Nt);const t=Nt[e];kt=e,qm(e);const i=t.wallpaper&&t.wallpaper.kind==="preset"?t.wallpaper.url:"",n=i?ux(i):null;document.body.classList.add("theme-morphing"),px(t.wallpaper),gt(t.hue||215,!1),Jn(t.themeMode||"dark"),yi(!!t.dnd,{silent:!0});try{o.pagesApps=JSON.parse(JSON.stringify(t.pagesApps||o.pagesApps)),o.removedApps=JSON.parse(JSON.stringify(t.removedApps||[])),localStorage.setItem("ios-desktop:removed-apps",JSON.stringify(o.removedApps)),Qe(),tt(),fx()}catch{}setTimeout(()=>{document.body.classList.remove("theme-morphing"),n&&n(),document.querySelectorAll("iframe").forEach(s=>{try{s.contentWindow.postMessage({type:"system-profile-changed",profile:e},"*")}catch{}}),lt("profile"),W(`已切换到「${t.name}」模式`),lr=!1},560)}function mx(e){if(!e||e._m3Bound)return;e._m3Bound=!0;const t=e.querySelector('input[type="checkbox"]'),i=e.querySelector(".thumb"),n=e.querySelector(".slider");if(!t||!i||!n)return;let s=!1,a=null,r=0,l=0,d=!1,c=0,p=0,h=0,f=0,m=-1,y=!1,g=-1,w=null;const k=2,b=22-k;function _(){i.style.top="50%",i.style.transform="translateY(-50%)",i.style.width="28px",i.style.height="28px",i.style.transition="none",n.style.transition="none"}function A(T){const G=M(T,0,1),X=k+G*b;Math.abs(X-g)>.05&&(g=X,i.style.left=`${X.toFixed(1)}px`);const ne=G>=.5;ne!==w&&(w=ne,ne?(n.style.background="var(--md-primary, #00875A)",n.style.borderColor="var(--md-primary, #00875A)",i.style.background="var(--md-on-primary, #ffffff)"):(n.style.background="var(--md-surface-container-highest, #e2e2e9)",n.style.borderColor="var(--md-outline, #74777f)",i.style.background="var(--md-outline, #74777f)"))}function I(){f&&(cancelAnimationFrame(f),f=0),y&&(A(m),m=-1,y=!1)}function q(){I(),g=-1,w=null,i.style.left="",i.style.top="",i.style.transform="",i.style.width="",i.style.height="",i.style.background="",i.style.transition="",n.style.background="",n.style.borderColor="",n.style.transition="",e.classList.remove("is-dragging")}e.addEventListener("click",T=>{T.detail>0&&T.target!==t&&T.preventDefault()}),e.addEventListener("pointerdown",T=>{if(!(T.button!==0&&T.button!==void 0)&&!t.disabled&&!s){s=!0,a=T.pointerId,d=!1,r=T.clientX,c=T.clientX,p=performance.now(),h=0,l=t.checked?1:0;try{e.setPointerCapture(T.pointerId)}catch{}}}),e.addEventListener("pointermove",T=>{if(!s||T.pointerId!==a)return;const G=performance.now(),X=Math.max(1,G-p);h=.7*h+.3*((T.clientX-c)/X),c=T.clientX,p=G;const ne=T.clientX-r;Math.abs(ne)>3&&(d||(d=!0,e.classList.add("is-dragging"),_()),m=M(l+ne/b,0,1),y=!0,f||(f=requestAnimationFrame(()=>{f=0,y&&(A(m),m=-1,y=!1)})))});const D=(T,G=!1)=>{if(s&&!(T&&T.pointerId!==void 0&&T.pointerId!==a)){s=!1,a=null;try{e.releasePointerCapture(T.pointerId)}catch{}if(d){I();const ne=(G&&!(T.clientX>0)?c:T.clientX)-r;let be=l+ne/b;h>.3?be=1:h<-.3&&(be=0);const Te=be>=.5,Me=t.checked!==Te;q(),Me&&(t.checked=Te,t.dispatchEvent(new Event("change",{bubbles:!0})),navigator.vibrate&&!G&&navigator.vibrate(12))}else{if(q(),G)return;t.checked=!t.checked,t.dispatchEvent(new Event("change",{bubbles:!0})),navigator.vibrate&&navigator.vibrate(8)}}};e.addEventListener("pointerup",T=>D(T,!1)),e.addEventListener("pointercancel",T=>D(T,!0)),e.addEventListener("lostpointercapture",T=>{s&&D(T,!0)})}function Ws(e=document){if(!e)return;e.querySelectorAll(".md3-switch").forEach(mx)}typeof window<"u"&&(window.__initM3Controls=e=>{Ws(e||document)},document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>Ws()):setTimeout(()=>Ws(),100));if(typeof window<"u"&&typeof MutationObserver<"u"){let e=!1;const t=n=>{for(const s of n)if(s.nodeType===1&&(s.matches&&s.matches(".md3-switch")||s.querySelector&&s.querySelector(".md3-switch")))return!0;return!1},i=new MutationObserver(n=>{for(const s of n)if(s.addedNodes&&s.addedNodes.length&&t(s.addedNodes)){if(e)return;e=!0,setTimeout(()=>{e=!1,Ws(document)},0);return}});document.body?i.observe(document.body,{childList:!0,subtree:!0}):document.addEventListener("DOMContentLoaded",()=>{i.observe(document.body,{childList:!0,subtree:!0})}),document.addEventListener("app-page-active",()=>{Ws(document)})}const Wr=25,Bd=5;let wi=null,xi=0,Fd=0,Mn=null,Ln=0,dc=!1;function eu(e){e=Math.max(0,Math.floor(e));const t=Math.floor(e/60),i=e%60;return(t<10?"0"+t:t)+":"+(i<10?"0"+i:i)}function Vm(){return wi==="focus"?"专注 "+eu(xi):wi==="break"?"休息 "+eu(xi):"番茄钟 · 专注"}function pc(e,t){try{Or({id:"focus-"+Date.now(),app:"番茄钟",appId:"focus",iconSvg:v.focus_mode,title:String(e||""),desc:String(t||""),time:"刚刚"})}catch{}}function uc(e){wi=e,xi=(e==="focus"?Wr:Bd)*60,Fd=Date.now()+xi*1e3,Po("focus",{active:!0,sub:Vm()})}function gx(){wi==="focus"?(Ln++,yi(!1,{silent:!0}),uc("break"),lt("notify"),pc("专注完成，休息一下","已完成 "+Ln+" 轮专注 · 休息 "+Bd+" 分钟")):(yi(!0,{silent:!0}),uc("focus"),lt("notify"),pc("休息结束，继续专注","第 "+(Ln+1)+" 轮 · "+Wr+" 分钟"))}function vx(){if(xi=Math.max(0,Math.round((Fd-Date.now())/1e3)),xi<=0){gx();return}Po("focus",{sub:Vm()})}function yx(){wi&&fc(!1),Ln=0,dc=document.body.classList.contains("dnd-mode-active"),yi(!0,{silent:!0}),uc("focus"),Mn&&clearInterval(Mn),Mn=setInterval(vx,1e3),W("专注开始："+Wr+" 分钟（已自动开启勿扰）",v.focus_mode),pc("专注模式已开启",Wr+" 分钟专注 · "+Bd+" 分钟休息")}function fc(e){Mn&&(clearInterval(Mn),Mn=null);const t=Ln;wi=null,xi=0,Fd=0,yi(dc,{silent:!0}),dc=!1,Po("focus",{active:!1,sub:"番茄钟 · 专注"}),e&&W(t?"专注已结束，本轮共完成 "+t+" 轮":"专注已结束",v.focus_mode)}function wx(){window.__focus={onTileToggle:e=>{e?yx():fc(!0)},isActive:()=>!!wi,phase:()=>wi,remaining:()=>xi,cycles:()=>Ln,stop:()=>fc(!1)}}const xx=[["ios-desktop:","__system"],["memos","notes"],["md3_groups","reminders"],["md3_tasks","reminders"],["flow11_best","flow11"],["android_clock_state","clock_app"],["pixel_camera_gallery","camera"],["translationHistory","translate"],["theme","translate"],["visited","translate"],["threes_hi","threes"],["threes_records","threes"],["dice_lab_stats","dice"],["m3-theme","threes"]],bx=[["wallpaper-blob","__system"],["font-blob","__system"],["font-name","__system"],["wallpaper-video-blob","__system"],["ios-desktop:wallpaper","__system"],["ios-desktop:font","__system"],["ios-desktop:font-name","__system"],["vfs:","files"],["vfs-meta:","files"]];function hc(e){return(e||"").length*2}function tu(e,t){const i=String(e||"");for(const[n,s]of t)if(i===n||i.startsWith(n))return s;return"__other"}function Sx(e){if(e==null)return 0;if(typeof e=="object"&&typeof e.size=="number"&&typeof e.type=="string")return e.size;try{return hc(JSON.stringify(e))}catch{return 0}}function kx(e){return!e||e<0?"0 B":e<1024?`${e} B`:e<1024*1024?`${(e/1024).toFixed(1)} KB`:`${(e/1024/1024).toFixed(2)} MB`}async function Ex(){const e=[];let t=0;try{for(let d=0;d<localStorage.length;d++){const c=localStorage.key(d);if(c===null)continue;const p=hc(c)+hc(localStorage.getItem(c));t+=p,e.push({key:c,bytes:p,owner:tu(c,xx)})}}catch{}e.sort((d,c)=>c.bytes-d.bytes);const i=[];let n=0,s=0;try{if(navigator.storage&&navigator.storage.estimate){const d=await navigator.storage.estimate();n=d.usage||0,s=d.quota||0}}catch{}if(Fe()){const d=await Gi();for(const c of d){const p=Sx(c.value);i.push({key:String(c.key),bytes:p,owner:tu(c.key,bx)})}i.sort((c,p)=>p.bytes-c.bytes)}const a=new Map,r=(d,c)=>a.set(d,(a.get(d)||0)+c);e.forEach(d=>r(d.owner,d.bytes)),i.forEach(d=>r(d.owner,d.bytes));const l=Array.from(a.entries()).map(([d,c])=>({owner:d,bytes:c})).sort((d,c)=>c.bytes-d.bytes);return{ls:{total:t,keys:e.length,items:e},idb:{available:Fe(),usage:n,quota:s,entries:i},byOwner:l}}function _x(e){if(e==="__system")return"系统服务";if(e==="__other")return"其他数据";try{const t=window.__initialAppsRef;if(t&&Array.isArray(t)){const i=t.find(n=>n.id===e);if(i)return i.name}}catch{}return e}function Tx(e){try{window.__initialAppsRef=e||null}catch{}window.__storageStats={collect:Ex,formatBytes:kx,ownerDisplayName:_x}}const Wm="ios-desktop:dev-fps",Ym="ios-desktop:dev-no-anim";let Se=null,Cn=null;function Gm(e){try{return localStorage.getItem(e)==="1"}catch{return!1}}function Xm(e,t){try{localStorage.setItem(e,t?"1":"0")}catch{}}const yl=60,Mx=32;function Um(){if(Cn)return;if(!Se){Se=document.createElement("div"),Se.id="devFpsOverlay",Se.style.cssText=`
      position: fixed; top: 34px; left: 10px; z-index: 10100; pointer-events: none;
      background: rgba(20, 24, 22, 0.9); color: #7df8db;
      /* v7.7：移除 backdrop-filter —— 面板背后是每帧都在变化的动画画面，
         逐帧重算模糊会把自己的测量结果污染出 10~20 次/场的假卡顿 */
      font: 600 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums; padding: 6px 10px 7px; border-radius: 12px;
      border: 1px solid rgba(125, 248, 219, 0.25); box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    `;const c=document.createElement("div"),p=document.createElement("canvas");p.width=96,p.height=26,p.style.cssText="display:block; margin: 3px 0 2px; width:96px; height:26px;";const h=document.createElement("div");h.style.cssText="opacity: 0.85; font-size: 10.5px;",Se.append(c,p,h),document.body.appendChild(Se),Se.__line1=c,Se.__line2=h,Se.__canvas=p}const e=Se.__canvas.getContext("2d"),t=[];let i=0,n=0,s=0,a=performance.now(),r=a;const l=()=>{const c=Se.__canvas.width,p=Se.__canvas.height;e.clearRect(0,0,c,p);const h=t.length;if(!h)return;const f=c/yl,m=Math.max(1,f-1);for(let y=0;y<h;y++){const g=t[y],w=Math.max(1.5,Math.min(1,g/60)*(p-2));e.fillStyle=g>=55?"rgba(125,248,219,0.9)":g>=40?"rgba(255,196,80,0.9)":"rgba(255,105,97,0.95)",e.fillRect(c-(h-y)*f,p-w,m,w)}},d=c=>{const p=c-r;if(r=c,n++,s+=p,p>Mx&&i++,c-a>=1e3){const h=Math.round(n*1e3/(c-a)),f=n?(s/n).toFixed(1):"0";t.push(h),t.length>yl&&t.shift();const m=i;t.length>=yl&&(i=0),Se.__line1.textContent=`${h} FPS · ${f}ms/帧`;const y=performance.memory,g=y?` · 堆 ${(y.usedJSHeapSize/1048576).toFixed(1)}/${(y.jsHeapSizeLimit/1048576).toFixed(0)}MB`:"";Se.__line2.textContent=`60秒内卡顿 ${m} 次${g}`,l(),n=0,s=0,a=c}Cn=requestAnimationFrame(d)};Cn=requestAnimationFrame(d)}function Lx(){Cn&&(cancelAnimationFrame(Cn),Cn=null),Se&&(Se.remove(),Se=null)}function Cx(e){Xm(Wm,e),e?Um():Lx()}function iu(){return Gm(Wm)}const nu="dev-no-anim-style";function Km(e){let t=document.getElementById(nu);e?(t||(t=document.createElement("style"),t.id=nu,t.textContent=`
        html.no-anim *, html.no-anim *::before, html.no-anim *::after {
          transition: none !important; animation: none !important;
        }`,document.head.appendChild(t)),document.documentElement.classList.add("no-anim")):(document.documentElement.classList.remove("no-anim"),t&&t.remove())}function Ix(e){Xm(Ym,e),Km(e)}function su(){return Gm(Ym)}function Ax(){try{localStorage.removeItem("ios-desktop:pages-apps"),localStorage.removeItem("ios-desktop:removed-apps"),localStorage.removeItem("ios-desktop:folders")}catch{}setTimeout(()=>location.reload(),120)}async function Px(){try{localStorage.clear()}catch{}try{sessionStorage.clear()}catch{}try{const{idbClearStore:e}=await he(async()=>{const{idbClearStore:t}=await Promise.resolve().then(()=>Ng);return{idbClearStore:t}},void 0,import.meta.url);await e()}catch{}try{const e=await caches.keys();await Promise.all(e.map(t=>caches.delete(t)))}catch{}try{const e=await navigator.serviceWorker?.getRegistrations?.()||[];await Promise.all(e.map(t=>t.unregister()))}catch{}setTimeout(()=>location.reload(),200)}function Bx(){Km(su()),iu()&&Um(),window.__devOptions={setFpsEnabled:Cx,isFpsEnabled:iu,setNoAnimEnabled:Ix,isNoAnimEnabled:su,getAnimSpeed:ca,setAnimSpeed:Ou,resetDesktopLayout:Ax,wipeAllData:Px}}const mi="vfs:",en="vfs-meta:",au="ios-desktop:vfs-seeded",Fx={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp",svg:"image/svg+xml",bmp:"image/bmp",ico:"image/x-icon",mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",mp3:"audio/mpeg",wav:"audio/wav",ogg:"audio/ogg",m4a:"audio/mp4",aac:"audio/aac",flac:"audio/flac",txt:"text/plain",md:"text/markdown",json:"application/json",csv:"text/csv",html:"text/html",htm:"text/html",css:"text/css",js:"text/javascript",pdf:"application/pdf",zip:"application/zip"};function dt(e){if(typeof e!="string")return null;let t=e.trim();if(!t)return null;t.startsWith("/")||(t="/"+t);const i=[];for(const n of t.split("/"))if(!(!n||n===".")){if(n===".."){i.pop();continue}i.push(n)}return"/"+i.join("/")}function Dd(e){const t=e.lastIndexOf("/");return t<=0?"/":e.slice(0,t)}function Ri(e){const t=e.lastIndexOf("/");return t<0?e:e.slice(t+1)}function Dx(e){const t=e.lastIndexOf(".");return t>0?e.slice(t+1).toLowerCase():""}function cr(e){return Fx[Dx(e)]||""}function Qm(e,t){return e==="/"?!0:t===e||t.startsWith(e+"/")}function mc(e){try{return typeof Blob<"u"&&e instanceof Blob}catch{return!1}}async function zx(e){try{return await(await fetch(e)).blob()}catch{}try{const t=e.indexOf(","),i=e.slice(0,t),n=e.slice(t+1),s=(/data:([^;,]+)/.exec(i)||[])[1]||"application/octet-stream",a=atob(n),r=new Uint8Array(a.length);for(let l=0;l<a.length;l++)r[l]=a.charCodeAt(l);return new Blob([r],{type:s})}catch{return null}}const U=new Map,Pi=new Map,Ys=new Map;let Jm=null;const Rx=new Promise(e=>{Jm=e});function Ro(e){Pi.forEach((t,i)=>{Qm(i,e.path)&&t.forEach(n=>{try{n(e)}catch{}})})}function Yr(e){const t=Ys.get(e);if(t){try{URL.revokeObjectURL(t)}catch{}Ys.delete(e)}}async function zd(e){if(!e||e==="/")return!0;const t=e.split("/").filter(Boolean);let i="";for(const n of t){if(i+="/"+n,U.get(i)?.type==="dir")continue;if(U.get(i)?.type==="file")return!1;const s={path:i,name:n,type:"dir",mime:"",size:0,created:Date.now(),modified:Date.now(),owner:"",meta:null};if(!await We(en+i,s))return!1;U.set(i,s)}return!0}async function Gr(e,t,i={}){if(e=dt(e),!e||e==="/")return{ok:!1,error:"路径无效"};if(t==null)return{ok:!1,error:"内容为空"};const n=U.get(e);if(n&&n.type==="dir")return{ok:!1,error:"同名目录已存在"};if(!await zd(Dd(e)))return{ok:!1,error:"父目录创建失败"};let s=t,a=i.mime||"",r=0;try{if(typeof s=="string"&&/^data:[^,]{0,120},/i.test(s.slice(0,140))){const p=await zx(s);p&&(s=p)}mc(s)?(a=a||s.type||cr(Ri(e))||"application/octet-stream",r=s.size):s instanceof ArrayBuffer?(a=a||cr(Ri(e))||"application/octet-stream",r=s.byteLength,s=new Blob([s],{type:a})):typeof s!="string"&&(s=JSON.stringify(s,null,2)),typeof s=="string"&&(a=a||cr(Ri(e))||"text/plain",r=new TextEncoder().encode(s).byteLength)}catch(p){return{ok:!1,error:"内容处理失败："+(p&&p.message?p.message:"未知错误")}}const l={path:e,name:Ri(e),type:"file",mime:a,size:r,created:n&&n.created||Date.now(),modified:Date.now(),owner:i.owner||n&&n.owner||"",meta:i.meta||null};return await We(mi+e,s)?await We(en+e,l)?(Yr(e),U.set(e,l),Ro({type:"write",path:e,entry:l}),{ok:!0,entry:l}):{ok:!1,error:"写入失败（索引落盘不可用）"}:{ok:!1,error:"写入失败（IndexedDB 不可用）"}}async function Oo(e){if(e=dt(e),!e)return null;const t=U.get(e);if(!t||t.type!=="file")return null;const i=await Yi(mi+e);return i===null?null:typeof i=="string"?{...t,blob:null,text:i}:{...t,blob:i,text:null}}async function Ox(e){const t=await Oo(e);if(!t)return null;if(t.text!==null)return t.text;try{return await t.blob.text()}catch{return null}}async function Zm(e){const t=await Oo(e);return t?t.blob||new Blob([t.text||""],{type:t.mime||"text/plain"}):null}async function eg(e){if(e=dt(e),!e)return null;if(Ys.has(e))return Ys.get(e);const t=await Zm(e);if(!t)return null;try{const i=URL.createObjectURL(t);return Ys.set(e,i),i}catch{return null}}function tg(e){const t=dt(e||"/");if(!t)return[];const i=[];return U.forEach(n=>{Dd(n.path)===t&&i.push({...n})}),i.sort((n,s)=>n.type!==s.type?n.type==="dir"?-1:1:n.name.localeCompare(s.name,"zh-Hans-CN")),i}async function Bi(e){return e=dt(e),!e||e==="/"?{ok:!1,error:"路径无效"}:U.has(e)?U.get(e).type==="dir"?{ok:!0}:{ok:!1,error:"同名文件已存在"}:await zd(e)?(Ro({type:"write",path:e,entry:U.get(e)}),{ok:!0}):{ok:!1,error:"目录创建失败"}}function ig(e){const t=dt(e);return!!t&&U.has(t)}function ng(e){const t=dt(e),i=t&&U.get(t);return i?{...i}:null}async function sg(e){if(e=dt(e),!e||e==="/")return{ok:!1,error:"根目录不可删除"};const t=[];if(U.forEach((n,s)=>{(s===e||s.startsWith(e+"/"))&&t.push(s)}),!t.length)return{ok:!0,removed:0};t.sort((n,s)=>s.length-n.length);let i=0;for(const n of t){const s=U.get(n);s&&s.type==="file"&&!await Zt(mi+n)||!await Zt(en+n)||(Yr(n),U.delete(n),i++)}return Ro({type:"delete",path:e}),i===0?{ok:!1,error:"删除失败（存储不可用或条目受保护）",removed:0}:{ok:!0,removed:i}}async function ag(e,t,i){if(e=dt(e),t=dt(t),!e||!t||e==="/")return{ok:!1,error:"路径无效"};if(t===e)return{ok:!0};if(t.startsWith(e+"/"))return{ok:!1,error:"不能移动/复制到自身内部"};if(!U.has(e))return{ok:!1,error:"源不存在"};let n=t;if((t==="/"||U.get(t)?.type==="dir")&&(n=(t==="/"?"":t)+"/"+Ri(e)),n===e)return{ok:!0,to:e};if(U.get(n)?.type==="file")return{ok:!1,error:"目标已存在同名文件"};if(U.get(n)?.type==="dir"&&U.get(e)?.type==="file")return{ok:!1,error:"目标已存在同名目录"};if(!await zd(Dd(n)))return{ok:!1,error:"父目录创建失败"};const s=[];U.forEach((a,r)=>{(r===e||r.startsWith(e+"/"))&&s.push(r)});for(const a of s){const r=n+a.slice(e.length),l=U.get(a);if(!l)continue;if(l.type==="file"){const c=await Yi(mi+a);c!==null&&await We(mi+r,c),i!=="copy"&&c!==null&&await Zt(mi+a),i!=="copy"&&Yr(a)}const d={...l,path:r,name:Ri(r),modified:i==="copy"?l.modified:Date.now()};await We(en+r,d),i!=="copy"&&(await Zt(en+a),U.delete(a)),Yr(r),U.set(r,d)}if(i==="copy")Ro({type:"write",path:n});else{const a=new Set,r=l=>{const d={type:"move",path:l,from:e,to:n};Pi.forEach((c,p)=>{Qm(p,l)&&c.forEach(h=>{if(!a.has(h)){a.add(h);try{h(d)}catch{}}})})};r(e),r(n)}return{ok:!0,to:n}}function rg(e,t){return ag(e,t,"move")}function og(e,t){return ag(e,t,"copy")}function $x(e,t){const i=dt(e||"/");return!i||typeof t!="function"?()=>{}:(Pi.has(i)||Pi.set(i,new Set),Pi.get(i).add(t),()=>{const n=Pi.get(i);n&&(n.delete(t),n.size||Pi.delete(i))})}function lg(){let e=0,t=0,i=0;const n=new Map;return U.forEach(s=>{if(s.type==="dir"){t++;return}e++,i+=s.size||0;const a="/"+(s.path.split("/").filter(Boolean)[0]||""),r=n.get(a)||{dir:a,files:0,bytes:0};r.files++,r.bytes+=s.size||0,n.set(a,r)}),{files:e,dirs:t,bytes:i,byDir:Array.from(n.values()).sort((s,a)=>a.bytes-s.bytes)}}function Hx(e,t){let i=String(e??"").replace(/[\/\\]+/g,"_").trim();return(!i||/^\.+$/.test(i))&&(i="IMG_"+Date.now()+"_"+(t+1)+".jpg"),i}async function Nx(){try{if(localStorage.getItem(au))return;await Bi("/photos"),await Bi("/music"),await Bi("/recordings"),await Bi("/documents"),await Bi("/downloads"),await Gr("/documents/欢迎使用文件.txt",`这是安卓16极客的虚拟文件系统（VFS）。

· 所有应用产生的照片、录音、文档都会出现在这里，可浏览、重命名、删除、分享。
· 顶部「导入文件」可以把电脑里的真实文件拖进模拟器；「下载」可以把文件导出回电脑。
· 数据保存在浏览器 IndexedDB，设置 › 备份与恢复 可整棵树导出 / 迁移。

—— 由桌面系统于 `+new Date().toLocaleString("zh-CN")+" 自动创建",{owner:"files"});try{const e=localStorage.getItem("pixel_camera_gallery");if(e){const t=JSON.parse(e);if(Array.isArray(t)){let i=0;for(const n of t){if(i>=10)break;const s=n&&n.src;if(typeof s=="string"&&s.startsWith("data:image")){const a=typeof n.name=="string"&&n.name||"IMG_"+(n.id||Date.now()+i)+".jpg",r=Hx(a,i);await Gr("/photos/"+r,s,{owner:"camera"}),i++}}}}}catch{}try{localStorage.setItem(au,"1")}catch{}}catch{}}async function qx(){const e=await Gi(),t=new Map;for(const i of e){const n=String(i.key||"");if(n.startsWith(en)){const s=i.value;s&&typeof s.path=="string"&&s.type&&U.set(s.path,s)}else n.startsWith(mi)&&t.set(n.slice(mi.length),i.value)}for(const[i,n]of t){if(U.has(i))continue;const s=Ri(i),a=mc(n)?n.size:typeof n=="string"?n.length:0,r={path:i,name:s,type:"file",mime:mc(n)&&n.type||cr(s)||"application/octet-stream",size:a,created:Date.now(),modified:Date.now(),owner:"",meta:{healed:!0}};await We(en+i,r),U.set(i,r)}return await Nx(),Jm(Gs),Gs}function jx(e){if(!e)return"";let t="";return document.querySelectorAll(".app-instance-wrapper, [data-bus-app-id]").forEach(i=>{t||i.querySelectorAll("iframe").forEach(n=>{try{n.contentWindow===e&&(t=i.getAttribute("data-bus-app-id")||(i.id||"").replace("app-instance-",""))}catch{}})}),t}function Vx(){window.addEventListener("message",e=>{const t=e.data;if(!t||t.type!=="FS_REQUEST"||!t.requestId||typeof t.op!="string"||e.source===window)return;const i=jx(e.source),n=(s,a,r)=>{try{e.source.postMessage({type:"FS_RESULT",requestId:t.requestId,ok:!!s,data:a===void 0?null:a,error:r||null},"*")}catch{}};if(!i){n(!1,null,"FS 桥拒绝：来源不是已挂载的应用 iframe");return}(async()=>{const s=t.args||{};switch(t.op){case"write":{const a=await Gr(s.path,s.data,{mime:s.mime,meta:s.meta,owner:i});n(a.ok,a.entry||null,a.error);break}case"read":{const a=await Oo(s.path);if(!a){n(!1,null,"文件不存在");break}n(!0,{meta:{path:a.path,name:a.name,mime:a.mime,size:a.size,modified:a.modified},blob:a.blob,text:a.text});break}case"url":{n(!0,{url:await eg(s.path)});break}case"list":{n(!0,{entries:tg(s.path)});break}case"mkdir":{const a=await Bi(s.path);n(a.ok,null,a.error);break}case"del":{const a=await sg(s.path);n(a.ok,{removed:a.removed||0},a.error);break}case"move":{const a=await rg(s.from||s.path,s.to);n(a.ok,{to:a.to||null},a.error);break}case"copy":{const a=await og(s.from||s.path,s.to);n(a.ok,{to:a.to||null},a.error);break}case"exists":n(!0,{exists:ig(s.path)});break;case"stat":n(!0,{entry:ng(s.path)});break;case"usage":n(!0,lg());break;default:n(!1,null,"未知操作: "+t.op)}})().catch(s=>n(!1,null,s&&s.message||"文件系统错误"))})}const Gs={write:Gr,read:Oo,readText:Ox,readBlob:Zm,readURL:eg,list:tg,mkdir:Bi,exists:ig,stat:ng,del:sg,move:rg,copy:og,subscribe:$x,usage:lg,ready:Rx,normalize:dt};function Wx(){if(typeof window>"u")return Gs;Vx(),qx();try{window.__vfs=Gs}catch{}return Gs}const Yx=512*1024,Gx=8*1024*1024;function ru(e){return e?Mo(e,"clipboard")!=="denied":!0}let ke=null;const gc=new Set;function cg(){gc.forEach(e=>{try{e(ke)}catch{}})}function dg(e,t){if(!e||typeof e!="object"||!e.kind)return{ok:!1,error:"无效的剪贴板内容"};if(e.kind==="text"){const i=String(e.text==null?"":e.text);if(!i)return{ok:!1,error:"内容为空"};if(i.length>Yx)return{ok:!1,error:"文本过大（超过 512KB）"};ke={kind:"text",text:i,from:t||"",at:Date.now()};try{navigator.clipboard&&navigator.clipboard.writeText&&navigator.clipboard.writeText(i).catch(()=>{})}catch{}}else if(e.kind==="image"){const i=String(e.dataUrl||"");if(!i.startsWith("data:image"))return{ok:!1,error:"仅支持 dataURL 图片"};if(i.length>Gx)return{ok:!1,error:"图片过大（超过 8MB）"};ke={kind:"image",dataUrl:i,name:e.name||"clipboard_"+Date.now()+".png",from:t||"",at:Date.now()}}else if(e.kind==="files"){const i=Array.isArray(e.paths)?e.paths.filter(n=>typeof n=="string"&&n):[];if(!i.length)return{ok:!1,error:"未选择文件"};ke={kind:"files",paths:i,cut:!!e.cut,from:t||"",at:Date.now()}}else return{ok:!1,error:"不支持的剪贴板类型: "+e.kind};return cg(),{ok:!0}}function Xx(){return ke}function Ux(){return!!ke}function Kx(){const e=!!ke;return ke=null,e&&cg(),{ok:!0}}function Qx(e){return typeof e=="function"&&gc.add(e),()=>gc.delete(e)}function ou(e){if(!e)return"";let t="";return document.querySelectorAll(".app-instance-wrapper, [data-bus-app-id]").forEach(i=>{t||i.querySelectorAll("iframe").forEach(n=>{try{n.contentWindow===e&&(t=i.getAttribute("data-bus-app-id")||(i.id||"").replace("app-instance-",""))}catch{}})}),t}function Jx(){window.addEventListener("message",e=>{const t=e.data;if(!(!t||e.source===window)){if(t.type==="CLIPBOARD_WRITE"){const i=ou(e.source);if(!ru(i)){if(t.requestId)try{e.source.postMessage({type:"CLIPBOARD_RESULT",requestId:t.requestId,ok:!1,error:"剪贴板权限已被拒绝（设置 › 应用权限）"},"*")}catch{}return}const n=dg(t.payload,i);if(n.ok)try{document.querySelectorAll(".app-instance-wrapper iframe, [data-bus-app-id] iframe").forEach(s=>{try{s.dataset.loaded==="1"&&s.contentWindow.postMessage({type:"CLIPBOARD_CHANGED",from:i},"*")}catch{}})}catch{}if(t.requestId)try{e.source.postMessage({type:"CLIPBOARD_RESULT",requestId:t.requestId,ok:n.ok,error:n.error||null},"*")}catch{}return}if(t.type==="CLIPBOARD_READ"&&t.requestId){const i=ou(e.source);if(!ru(i)){try{e.source.postMessage({type:"CLIPBOARD_RESULT",requestId:t.requestId,ok:!1,error:"剪贴板权限已被拒绝（设置 › 应用权限）"},"*")}catch{}return}let n=null;ke&&(ke.kind==="text"?n={kind:"text",text:ke.text}:ke.kind==="image"?n={kind:"image",dataUrl:ke.dataUrl,name:ke.name}:ke.kind==="files"&&(n={kind:"files",paths:ke.paths.slice(),cut:ke.cut}));try{e.source.postMessage({type:"CLIPBOARD_RESULT",requestId:t.requestId,ok:!0,payload:n},"*")}catch{}}}})}function Zx(){if(!(typeof window>"u")){Jx();try{window.__clipboard={set:dg,get:Xx,has:Ux,clear:Kx,subscribe:Qx}}catch{}}}const Rd=ot(.4,1,1),lu=ot(.3,1,1),eb=300,tb=220,ci=8,ib=40,nb=4,sb=590,ab=1,R=new Map,Xr=new Set;let vc=sb,Ur=!1;function yc(){try{Ur=window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{Ur=!1}}function Wt(){const e=window.innerWidth||360,t=window.innerHeight||720;return{minX:ci,minY:ci,maxX:e-ci,maxY:t-ci,maxW:Math.max(yr,e-ci*2),maxH:Math.max(wr,t-ci*2)}}function Kr(e,t,i=.55){return e*t*i/(t+i*Math.abs(e))}function cu(e,t,i){return e<t?t-Kr(t-e,120):e>i?i+Kr(e-i,120):e}function du(e,t,i){return e<t?t-Kr(t-e,60):e>i?i+Kr(e-i,60):e}function bi(e,t,i){return Math.max(t,Math.min(i,e))}function ns(e){e&&(vc+=ab,e.el.style.zIndex=String(vc),R.forEach(t=>{t.el&&t.el.classList.toggle("is-back",t!==e)}))}function Od(){let e=null;return R.forEach(t=>{if(!e){e=t;return}const i=parseInt(t.el&&t.el.style.zIndex||"0",10)||0,n=parseInt(e.el&&e.el.style.zIndex||"0",10)||0;i>=n&&(e=t)}),e}function rb(){const e=R.keys().next();e.done||$o({appId:e.value,destroy:!0})}const ob='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',lb='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H3v6M15 21h6v-6M3 15v6h6M21 9V3h-6"/></svg>',cb='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>';function db(e){const t=document.createElement("div");return t.className="mini-window",t.dataset.appId=e.id,t.setAttribute("role","dialog"),t.setAttribute("aria-label",`${e.name} 小窗`),t.innerHTML=`<div class="mini-header"><button class="mini-btn" data-act="back" aria-label="返回" title="返回" style="display:none"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><span class="mini-badge">${J(e.id)}</span><span class="mini-title">${e.name}</span><button class="mini-btn" data-act="minimize" aria-label="最小化" title="最小化">${cb}</button><button class="mini-btn" data-act="expand" aria-label="展开全屏" title="全屏">${lb}</button><button class="mini-btn" data-act="close" aria-label="关闭小窗" title="关闭">${ob}</button></div><div class="mini-body"></div><div class="mini-grip mini-grip-se" data-dir="se" aria-hidden="true"></div><div class="mini-grip mini-grip-e" data-dir="e" aria-hidden="true"></div><div class="mini-grip mini-grip-s" data-dir="s" aria-hidden="true"></div>`,t.addEventListener("pointerdown",i=>{i.stopPropagation();const n=R.get(e.id);n&&ns(n)}),t.addEventListener("touchstart",i=>i.stopPropagation(),{passive:!0}),t}function pg(e,t){const i=F.find(f=>f&&f.id===e);if(!i)return null;const n=qc(e);if(!n)return null;const s=Wt(),a=R.size%5*24;let r=eb,l=tb,d=0,c=0;t&&t.width>yr*.6&&t.height>wr*.6?(d=Math.round(t.left+t.width/2-r/2+a),c=Math.round(t.top+t.height/2-l/2+a)):(d=s.maxX-r-ci*2+a,c=s.maxY-l-ci*2+a),d=bi(d,s.minX,Math.max(s.minX,s.maxX-r)),c=bi(c,s.minY,Math.max(s.minY,s.maxY-l)),r=Math.min(r,s.maxW),l=Math.min(l,s.maxH);const p=db(i);p.style.width=`${r}px`,p.style.height=`${l}px`,p.style.transform=`translate3d(${d}px, ${c}px, 0)`,p.style.zIndex=String(vc+1),document.body.appendChild(p);const h={appId:e,app:i,wrapper:n,el:p,bodyEl:p.querySelector(".mini-body"),backBtn:p.querySelector('[data-act="back"]'),titleEl:p.querySelector(".mini-title"),navStack:[0],minimized:!1,x:d,y:c,w:r,h:l,posSpring:new lo(Rd,d,c,0,0),wSpring:new Ie({...lu,initialValue:r}),hSpring:new Ie({...lu,initialValue:l}),settled:!0,rafId:0,openedAt:Date.now()};return R.set(e,h),n.__miniHosted=!0,h.bodyEl.appendChild(n),uf(e),pb(h),p.querySelector('[data-act="back"]').addEventListener("click",f=>{f.stopPropagation(),hb(h)}),p.querySelector('[data-act="minimize"]').addEventListener("click",f=>{f.stopPropagation(),xb(h.appId)}),p.querySelector('[data-act="expand"]').addEventListener("click",f=>{f.stopPropagation(),gg(h.appId)}),p.querySelector('[data-act="close"]').addEventListener("click",f=>{f.stopPropagation(),$o({appId:h.appId,destroy:!0})}),kb(h),Eb(h),ns(h),p.classList.add("mini-enter"),requestAnimationFrame(()=>requestAnimationFrame(()=>p.classList.remove("mini-enter"))),h}const Qr=240,ug="cubic-bezier(0.2, 0, 0, 1)";function fg(e){const t=e.id||"",i=parseInt(t.slice(t.lastIndexOf("-")+1),10);return Number.isNaN(i)?-1:i}function pb(e){!e||!e.wrapper||e.wrapper.querySelectorAll(".app-page").forEach(t=>{if(t.dataset.tpHosted==="1"||t.style.transform&&t.style.transform!=="")return;fg(t)===0?(t.style.transform="translate3d(0, 0, 0) scale(1)",t.style.opacity="1",t.style.pointerEvents="auto",t.style.zIndex="2"):(t.style.transform="translate3d(100%, 0, 0)",t.style.opacity="0",t.style.pointerEvents="none",t.style.zIndex="3")})}function ub(e){return e&&e.wrapper?Array.from(e.wrapper.querySelectorAll(".app-page")):[]}function Jr(e,t){return ub(e).find(i=>fg(i)===t)||null}function fb(e,t){if(!e||!e.wrapper)return!1;const i=Jr(e,t);if(!i||i.dataset.tpHosted==="1")return!1;const n=e.navStack[e.navStack.length-1];if(n===t)return!0;const s=Jr(e,n);return i.style.transition="none",i.style.transform="translate3d(100%, 0, 0)",i.style.opacity="1",i.style.zIndex="2",i.style.pointerEvents="auto",i.offsetWidth,i.style.transition=`transform ${Qr}ms ${ug}`,i.style.transform="translate3d(0, 0, 0) scale(1)",s&&(s.style.transition=`filter ${Qr}ms linear`,s.style.transform="translate3d(0, 0, 0) scale(1)",s.style.opacity="1",s.style.filter="brightness(0.65)",s.style.pointerEvents="none",s.style.zIndex="1"),e.navStack.push(t),hg(e),!0}function hb(e){if(!e||!e.navStack||e.navStack.length<=1)return!1;const t=e.navStack.pop(),i=Jr(e,t),n=Jr(e,e.navStack[e.navStack.length-1]);return i&&(i.style.transition=`transform ${Qr}ms ${ug}`,i.style.transform="translate3d(100%, 0, 0)",i.style.opacity="0",i.style.pointerEvents="none",i.style.zIndex="3"),n&&(n.style.transition="none",n.style.transform="translate3d(0, 0, 0) scale(1)",n.style.opacity="1",n.style.zIndex="2",n.style.pointerEvents="auto",n.offsetWidth,n.style.transition=`filter ${Qr}ms linear`,n.style.filter=""),hg(e),!0}function hg(e){if(!e||!e.el)return;const t=e.navStack.length>1;if(e.backBtn&&(e.backBtn.style.display=t?"flex":"none"),e.titleEl&&e.app){const i=e.app.pages&&e.app.pages[e.navStack[e.navStack.length-1]];e.titleEl.textContent=t&&i&&i.title?i.title:e.app.name}}function mb(e,t=null){if(yc(),!e)return!1;const i=R.get(e);if(i)return ns(i),i.el&&(i.el.classList.remove("mini-flash"),i.el.offsetWidth,i.el.classList.add("mini-flash")),!0;R.size>=nb&&rb();const n=t&&t.fromRect;if(!F.find(a=>a&&a.id===e))return!1;if(o.currentApp&&o.currentApp.id===e&&(o.isOpen||o.isClosing)){Xr.add(e),gb(e,n);try{Bt()}catch{Xr.delete(e);const r=qc(e),l=R.get(e);r&&l&&mg(l,r)}return!0}return!!pg(e,n)}function gb(e,t){const i=pg(e,t);if(i&&R.get(e)===i){const n=i.wrapper;try{u.pageStack.appendChild(n)}catch{}n.__miniHosted=!0,i.wrapper=null}return!!i}function mg(e,t){if(!(!e||!t)){t.__miniHosted=!0,t.style.display="block",e.bodyEl.appendChild(t),e.wrapper=t,uf(e.appId);try{vb()}catch{}}}function vb(){he(()=>Promise.resolve().then(()=>Zv),void 0,import.meta.url).then(e=>{try{e.renderPageStack()}catch{}}).catch(()=>{})}const yb=240;function wb(){let e=document.getElementById("miniRestoreDock");return e||(e=document.createElement("div"),e.id="miniRestoreDock",document.body.appendChild(e)),e}function $d(e){const t=document.querySelector(`.mini-restore-chip[data-chip-app-id="${e}"]`);t&&t.remove();const i=document.getElementById("miniRestoreDock");i&&!i.children.length&&i.remove()}function xb(e){const t=R.get(e);if(!t||t.minimized)return!1;t.minimized=!0,t.rafId&&(cancelAnimationFrame(t.rafId),t.rafId=0);const i=t.el;return i.classList.add("mini-minimizing"),navigator.vibrate&&navigator.vibrate(14),setTimeout(()=>{i.style.display="none",i.classList.remove("mini-minimizing");const n=wb();if(!n.querySelector(`.mini-restore-chip[data-chip-app-id="${e}"]`)){const s=document.createElement("button");s.type="button",s.className="mini-restore-chip",s.dataset.chipAppId=e,s.setAttribute("aria-label",`还原 ${t.app.name} 小窗`),s.title=t.app.name||e,s.innerHTML=J(e),s.addEventListener("click",a=>{a.stopPropagation(),bb(e)}),n.appendChild(s)}try{window.dispatchEvent(new CustomEvent("mini-window-changed",{detail:{appId:e,active:!1,minimized:!0}}))}catch{}},yb),!0}function bb(e){const t=R.get(e);if(!t||!t.minimized)return!1;t.minimized=!1,$d(e);const i=t.el;i.style.display="",i.classList.add("mini-enter"),requestAnimationFrame(()=>requestAnimationFrame(()=>i.classList.remove("mini-enter"))),ns(t),navigator.vibrate&&navigator.vibrate(10);try{window.dispatchEvent(new CustomEvent("mini-window-changed",{detail:{appId:e,active:!0,minimized:!1}}))}catch{}return!0}function $o(e=null){const t=!!(e&&e.destroy),i=e&&e.appId;(i?[R.get(i)]:Array.from(R.values())).forEach(s=>{s&&Sb(s,t)})}function Sb(e,t){if(!e||!R.has(e.appId))return;if(R.delete(e.appId),pf(e.appId),$d(e.appId),e.rafId&&(cancelAnimationFrame(e.rafId),e.rafId=0),e.el&&e.el.parentNode){e.el.classList.add("mini-exit");const n=e.el;setTimeout(()=>{try{n.remove()}catch{}},220)}if(t&&e.wrapper){const n=e.wrapper;n.__miniHosted=!1;try{u.pageStack.appendChild(n)}catch{}try{Rn(e.appId)}catch{}}const i=Od();i&&ns(i);try{window.dispatchEvent(new CustomEvent("mini-window-changed",{detail:{appId:e.appId,active:!1}}))}catch{}}function gg(e,t=null){const i=R.get(e);if(!i)return!1;const n=F.findIndex(l=>l&&l.id===e);if(n===-1)return $o({appId:e,destroy:!0}),!1;const s=t&&t.width>0?t:{left:i.x,top:i.y,width:i.w,height:i.h},a=i.wrapper;if(a){a.__miniHosted=!1;try{u.pageStack.appendChild(a)}catch{}}R.delete(e),pf(e),$d(e),i.rafId&&(cancelAnimationFrame(i.rafId),i.rafId=0),i.el&&i.el.remove();const r=Od();r&&ns(r);try{window.dispatchEvent(new CustomEvent("mini-window-changed",{detail:{appId:e,active:!1}}))}catch{}return j(n,null,s,{skipMiniCheck:!0}),!0}function kb(e){const t=e.el.querySelector(".mini-header");let i=null;t.addEventListener("pointerdown",s=>{if(s.target.closest(".mini-btn"))return;const a=R.get(e.appId);if(!(!a||a!==e)){s.preventDefault();try{t.setPointerCapture(s.pointerId)}catch{}i={id:s.pointerId,grabDX:s.clientX-e.x,grabDY:s.clientY-e.y,history:[{x:s.clientX,y:s.clientY,t:performance.now()}]},t.classList.add("dragging")}}),t.addEventListener("pointermove",s=>{if(!i||!e||s.pointerId!==i.id||R.get(e.appId)!==e)return;const a=performance.now();i.history.push({x:s.clientX,y:s.clientY,t:a}),i.history.length>6&&i.history.shift();const r=cu(s.clientX-i.grabDX,Wt().minX-e.w+60,Wt().maxX-60),l=cu(s.clientY-i.grabDY,Wt().minY,Wt().maxY-ib);e.x=r,e.y=l,e.posSpring.reconfigure(Rd),e.posSpring.x.x=r,e.posSpring.y.x=l,e.el.style.transform=`translate3d(${r.toFixed(1)}px, ${l.toFixed(1)}px, 0)`});const n=s=>{if(!i||!e||s.pointerId!==i.id)return;t.classList.remove("dragging");const a=i.history;let r=0,l=0;if(a.length>=2){const h=a[a.length-2],f=a[a.length-1],m=Math.max(1,f.t-h.t);r=(f.x-h.x)/m*1e3,l=(f.y-h.y)/m*1e3}if(i=null,R.get(e.appId)!==e)return;const d=Wt(),c=bi(e.x,d.minX,Math.max(d.minX,d.maxX-e.w)),p=bi(e.y,d.minY,Math.max(d.minY,d.maxY-e.h));vg(e,c,p,r,l)};t.addEventListener("pointerup",n),t.addEventListener("pointercancel",n)}function vg(e,t,i,n,s){if(!e||R.get(e.appId)!==e)return;if(e.settled=!1,e.posSpring.reconfigure(Rd),e.posSpring.x.x=e.x,e.posSpring.y.x=e.y,e.posSpring.setTarget(t,i,n,s),Ur){e.x=t,e.y=i,e.el.style.transform=`translate3d(${t}px, ${i}px, 0)`,e.settled=!0;return}e.rafId&&cancelAnimationFrame(e.rafId);let a=performance.now();const r=l=>{if(!e||R.get(e.appId)!==e||e.settled)return;const d=Math.min(32,l-a)/1e3;a=l,e.posSpring.update(d);const c=e.posSpring.px,p=e.posSpring.py;if(e.x=c,e.y=p,e.el.style.transform=`translate3d(${c.toFixed(1)}px, ${p.toFixed(1)}px, 0)`,e.posSpring.isSettled(.1,4)){e.x=t,e.y=i,e.el.style.transform=`translate3d(${t}px, ${i}px, 0)`,e.settled=!0;return}e.rafId=requestAnimationFrame(r)};e.rafId=requestAnimationFrame(r)}function Eb(e){e.el.querySelectorAll(".mini-grip").forEach(t=>{let i=null;t.addEventListener("pointerdown",s=>{if(R.get(e.appId)===e){s.preventDefault(),s.stopPropagation();try{t.setPointerCapture(s.pointerId)}catch{}i={id:s.pointerId,dir:t.getAttribute("data-dir"),startX:s.clientX,startY:s.clientY,startW:e.w,startH:e.h},t.classList.add("active")}}),t.addEventListener("pointermove",s=>{if(!i||!e||s.pointerId!==i.id||R.get(e.appId)!==e)return;const a=Wt(),r=s.clientX-i.startX,l=s.clientY-i.startY;(i.dir==="se"||i.dir==="e")&&(e.w=du(i.startW+r,yr,a.maxW)),(i.dir==="se"||i.dir==="s")&&(e.h=du(i.startH+l,wr,a.maxH)),As(e)});const n=s=>{if(!i||!e||s.pointerId!==i.id||(t.classList.remove("active"),i=null,R.get(e.appId)!==e))return;const a=Wt(),r=bi(e.w,yr,a.maxW),l=bi(e.h,wr,a.maxH);if(e.wSpring.x=e.w,e.hSpring.x=e.h,e.wSpring.setTarget(r,null),e.hSpring.setTarget(l,null),Ur){e.w=r,e.h=l,As(e);return}e.rafId&&cancelAnimationFrame(e.rafId);let d=performance.now();const c=p=>{if(!e||R.get(e.appId)!==e)return;const h=Math.min(32,p-d)/1e3;if(d=p,e.wSpring.update(h),e.hSpring.update(h),e.w=e.wSpring.x,e.h=e.hSpring.x,As(e),e.wSpring.isSettled(.1,4)&&e.hSpring.isSettled(.1,4)){e.w=r,e.h=l,As(e);return}e.rafId=requestAnimationFrame(c)};e.rafId=requestAnimationFrame(c)};t.addEventListener("pointerup",n),t.addEventListener("pointercancel",n)})}function As(e){!e||!e.el||(e.el.style.width=`${e.w.toFixed(1)}px`,e.el.style.height=`${e.h.toFixed(1)}px`)}function _b(e){const t=e&&e.detail&&e.detail.appId;if(t&&R.has(t)){const i=R.get(t);i.wrapper&&(i.wrapper.__miniHosted=!1),$o({appId:t,destroy:!1})}}function Tb(e){const t=e&&e.detail&&e.detail.appId;if(!t||!Xr.has(t))return;Xr.delete(t);const i=document.getElementById(`app-instance-${t}`),n=R.get(t);i&&n&&mg(n,i)}function Mb(){yc();try{const e=window.matchMedia("(prefers-reduced-motion: reduce)"),t=()=>yc();e.addEventListener?e.addEventListener("change",t):e.addListener&&e.addListener(t)}catch{}document.addEventListener("app-instance-destroyed",_b),document.addEventListener("app-window-closed",Tb),window.__miniWindowOpen=(e,t)=>mb(e,{fromRect:t}),window.__miniWindow=e=>{const t=e?R.get(e):Od();return t?{appId:t.appId,rect:()=>({left:t.x,top:t.y,width:t.w,height:t.h}),expandToFullscreen:i=>gg(t.appId,i||null)}:null},window.__miniWindowAll=()=>Array.from(R.values()).map(e=>e.appId),window.__miniNav=(e,t)=>{const i=R.get(e);return i?fb(i,t):!1},window.addEventListener("resize",()=>{R.size&&R.forEach(e=>{const t=Wt(),i=bi(e.x,t.minX,Math.max(t.minX,t.maxX-e.w)),n=bi(e.y,t.minY,Math.max(t.minY,t.maxY-e.h));e.w=Math.min(e.w,t.maxW),e.h=Math.min(e.h,t.maxH),As(e),vg(e,i,n,0,0)})})}const yg=[{id:"msg",appId:"msg",label:"信息",kinds:["text"]},{id:"notes",appId:"notes",label:"备忘录",kinds:["text"]},{id:"cal",appId:"cal_app",label:"日历",kinds:["text"]},{id:"reminders",appId:"reminders",label:"提醒事项",kinds:["text"]},{id:"photo",appId:"photo",label:"存入相册",kinds:["image"]},{id:"files",appId:"files",label:"存储到文件",kinds:["text","image"]},{id:"translate",appId:"translate",label:"翻译",kinds:["text"]},{id:"clipboard",appId:"clipboard",label:"拷贝",kinds:["text","image"],system:!0}];function Lb(e){return typeof e=="string"&&e.startsWith("data:image")}function wa(e){const t=[];return!e||typeof e!="object"||((e.text==null?"":String(e.text)).trim()&&t.push("text"),Lb(e.imageDataUrl)&&t.push("image")),t}function Cb(e){return wa(e).length>0}function Ib(e){const t=new Set;if(!Array.isArray(e))return t;for(const i of e)typeof i=="string"?t.add(i):i&&typeof i=="object"&&typeof i.id=="string"&&t.add(i.id);return t}function Ab(e,t,i){const n=wa(e);if(!n.length)return[];const s=new Set(n),a=Ib(i);return yg.filter(r=>r.id!==t&&r.appId!==t).filter(r=>r.system||!a.has(r.appId)&&!a.has(r.id)).filter(r=>r.kinds.some(l=>s.has(l)))}function Pb(e){return yg.find(t=>t.id===e)||null}const Bb=9e3,pu='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';let ge=null,wc=null,wg=null,uu=0,Xs=null;function Us(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function zt(e,t){const i=F.findIndex(s=>s.id===e);if(i===-1)return!1;let n=t||null;if(!n)try{const s=document.querySelector(`.app-icon[data-id="${e}"]`);if(s){const a=s.getBoundingClientRect();a.width>0&&(n=a)}}catch{}return j(i,null,n),!0}function xc(){const e=new Date,t=i=>String(i).padStart(2,"0");return`${t(e.getHours())}${t(e.getMinutes())}${t(e.getSeconds())}`}function Fb(e){const t=Pb(e),i=Xs;if(!t||!i)return;const n=i.from||"";if(t.id==="msg")at("msg","share/memo",{title:i.title||"",text:i.text||"",__silent:!0},n),zt("msg");else if(t.id==="notes")at("notes","files/share",{name:i.title||"分享文本",text:i.text||"",__silent:!0},n),zt("notes");else if(t.id==="cal")at("cal_app","calendar/prefill",{title:i.title||"",text:i.text||"",date:i.date||"",__silent:!0},n),zt("cal_app");else if(t.id==="reminders"){const s=String(i.text||i.title||"").trim().slice(0,200)||"分享内容";at("reminders","reminders/create",{title:s,__silent:!0},n),zt("reminders")}else if(t.id==="photo")at("photo","photo/captured",{id:"share"+Date.now(),type:"image",src:i.imageDataUrl,name:i.name||"",__silent:!0},n),zt("photo");else if(t.id==="files")Db(i,n).then(s=>{s?zt("files"):W("存储到文件失败")});else if(t.id==="translate")at("translate","translate/prefill",{text:String(i.text||"").slice(0,5e3),__silent:!0},n),zt("translate");else if(t.id==="clipboard"){const a=wa(i).includes("image")?{kind:"image",dataUrl:i.imageDataUrl,name:i.name||"share_"+xc()+".png"}:{kind:"text",text:String(i.text||"")},r=window.__clipboard?window.__clipboard.set(a,n):{ok:!1};W(r&&r.ok?"已拷贝到剪贴板":"拷贝失败")}}async function Db(e,t){try{const i=window.__vfs;if(!i||typeof i.write!="function")return!1;if(wa(e).includes("image")){const r=/\.png/i.test(e.imageDataUrl)?"png":"jpg",l=`/Downloads/分享图片-${xc()}.${r}`,d=await i.write(l,e.imageDataUrl,{owner:t||"share"});return!!(d&&d.ok)}const s=`/Downloads/分享文本-${xc()}.txt`,a=await i.write(s,String(e.text||""),{owner:t||"share"});return!!(a&&a.ok)}catch{return!1}}function zb(){if(ge)return;const e=document.createElement("style");e.textContent=`
.share-sheet-root{position:fixed;inset:0;z-index:${Bb};display:none}
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
  `,document.head.appendChild(e),ge=document.createElement("div"),ge.className="share-sheet-root",ge.setAttribute("role","dialog"),ge.setAttribute("aria-label","系统分享面板"),ge.innerHTML=`
    <div class="share-sheet-scrim"></div>
    <div class="share-sheet-card">
      <div class="share-sheet-handle"></div>
      <div class="share-sheet-title">分享</div>
      <div class="share-sheet-preview"></div>
      <div class="share-sheet-grid"></div>
      <button class="share-sheet-cancel" type="button">取消</button>
    </div>
  `,document.body.appendChild(ge),ge.querySelector(".share-sheet-card"),wc=ge.querySelector(".share-sheet-grid"),wg=ge.querySelector(".share-sheet-preview"),ge.querySelector(".share-sheet-scrim").addEventListener("click",Ps),ge.querySelector(".share-sheet-cancel").addEventListener("click",Ps),wc.addEventListener("click",t=>{const i=t.target.closest(".share-target");if(!i)return;const n=i.getAttribute("data-target");Ps(),setTimeout(()=>Fb(n),90)}),document.addEventListener("keydown",t=>{t.key==="Escape"&&ge.classList.contains("open")&&Ps()})}function Rb(e){const t=wa(e);let i="";t.includes("image")&&(i+=`<img class="sp-img" src="${e.imageDataUrl}" alt="">`);const n=String(e.title||"").trim(),s=String(e.text||"").trim();i+='<div style="min-width:0;flex:1">',n&&(i+=`<div class="sp-title">${Us(n)}</div>`),s&&(i+=`<div class="sp-text">${Us(s.slice(0,200))}</div>`),!n&&!s&&t.includes("image")&&(i+=`<div class="sp-title">${Us(e.name||"分享图片")}</div><div class="sp-text">图片 · 将保存到目标应用</div>`),i+="</div>",wg.innerHTML=i}function Ob(e){const t=Ab(e,e.from||"",o.removedApps||[]);wc.innerHTML=t.map(i=>{const n=i.id==="clipboard"?pu:ho(i.appId)?J(i.appId):pu;return`<button class="share-target" type="button" data-target="${i.id}" aria-label="分享到${Us(i.label)}">
      <span class="st-icon">${n}</span>
      <span class="st-label">${Us(i.label)}</span>
    </button>`}).join("")}function xg(e){return Cb(e)?(zb(),Xs=Object.assign({},e),Rb(Xs),Ob(Xs),ge.classList.add("open"),!0):(W("没有可分享的内容"),!1)}function Ps(){!ge||!ge.classList.contains("open")||(ge.classList.remove("open"),clearTimeout(uu),uu=setTimeout(()=>{Xs=null},350))}function $b(){return!!(ge&&ge.classList.contains("open"))}function Hb(){window.addEventListener("message",e=>{if(e.source===window)return;const t=e.data;if(!(!t||typeof t!="object")){if(t.type==="SHARE_OPEN"&&t.payload){const i=Zl(e.source);xg(Object.assign({},t.payload,{from:i}));return}if(t.type==="OPEN_APP"&&t.appId){const i=Zl(e.source);if(t.event){const n=Object.assign({},t.payload||{},{__silent:!0});at(String(t.appId),String(t.event),n,i)}zt(String(t.appId))}}})}function Nb(){Hb(),window.__shareSheet={open:xg,close:Ps,isOpen:$b,openAppById:zt}}const bg="ios-desktop:navbar-enabled",Sg="ios-desktop:navbar-pos";let B=null,ut=!1,Un="center";function qb(){return ut}function jb(e,t={}){ut=!!e;try{localStorage.setItem(bg,ut?"1":"0")}catch{}if(B){const i=B.classList.contains("hidden");B.classList.toggle("hidden",!ut),ut&&i&&(B.classList.remove("nvb-pop"),B.offsetWidth,B.classList.add("nvb-pop"))}!ut&&t.toast!==!1&&typeof window<"u"&&window.showSystemToast&&window.showSystemToast("已切换为手势导航（三键已隐藏）"),ut&&t.toast!==!1&&typeof window<"u"&&window.showSystemToast&&window.showSystemToast("三键导航已开启 · 手势仍然可用 · 长按主屏键可左右移动"),document.dispatchEvent(new CustomEvent("navbar-changed",{detail:{enabled:ut,pos:Un}}))}function Vb(){return Un}function bc(e,t={}){if(["left","center","right"].includes(e)){Un=e;try{localStorage.setItem(Sg,e)}catch{}B&&(B.classList.remove("pos-left","pos-center","pos-right","free"),B.classList.add("pos-"+e),B.style.left=""),t.toast&&typeof window<"u"&&window.showSystemToast&&window.showSystemToast("导航栏位置："+(e==="left"?"居左":e==="right"?"居右":"居中")),document.dispatchEvent(new CustomEvent("navbar-changed",{detail:{enabled:ut,pos:Un}}))}}function Wb(){try{ut=localStorage.getItem(bg)==="1";const t=localStorage.getItem(Sg);["left","center","right"].includes(t)&&(Un=t)}catch{}}function Yb(){const e=document.getElementById("recentAppsOverlay");if(e&&e.classList.contains("active")){Ne();return}if(o.isOpen){if(o.navHistory.length>1){On();return}const t=ym();if(t){t.triggerBack();return}const i=th();if(i&&i.canBack){sa(i.win,{type:"PB_TRIGGER_BACK"});return}On();return}}function Gb(){const e=document.getElementById("recentAppsOverlay");if(e&&e.classList.contains("active")&&Ne({resumeSuspended:!1}),o.isOpen){Bt(0,0,0);return}const t=window.__splitGestures;if(t&&t.active()){t.dismiss();return}}function Xb(){const e=document.getElementById("recentAppsOverlay");if(e&&e.classList.contains("active")){Ne();return}Ft(o.currentApp?o.currentApp.id:null)}const E={active:!1,mode:"idle",startX:0,startY:0,lastY:0,lastT:0,vy:0,longPressTimer:null,suppressClick:!1};function fu(e,t){E.active=!0,E.mode="idle",E.startX=e,E.startY=t,E.lastY=t,E.lastT=performance.now(),E.vy=0,E.suppressClick=!1,E.longPressTimer&&clearTimeout(E.longPressTimer),E.longPressTimer=setTimeout(()=>{!E.active||E.mode!=="idle"||(E.mode="reposition",E.longPressTimer=null,E.suppressClick=!0,B&&(B.classList.add("repositioning","free"),navigator.vibrate&&navigator.vibrate([18,40,18]),window.showSystemToast&&window.showSystemToast("拖移模式 · 左右移动后松手吸附")))},1e3)}function Ub(e,t){if(!E.active)return;const i=e-E.startX,n=t-E.startY;if(E.mode==="reposition"){if(B){if(!E.barW){E.barW=B.offsetWidth||200;const s=B.getBoundingClientRect();E.startLeft=s.left,E.pendingLeft=s.left,B.style.left=s.left+"px",B.style.transition="none"}E.pendingLeft=M(e-E.barW/2,6,window.innerWidth-E.barW-6),E.reposRafId||(E.reposRafId=requestAnimationFrame(()=>{E.reposRafId=0,E.mode==="reposition"&&B&&(B.style.transform=`translateX(${(E.pendingLeft-E.startLeft).toFixed(1)}px)`)}))}return}if(E.mode==="idle"&&Math.abs(i)>32&&Math.abs(i)>Math.abs(n)*1.45&&(E.longPressTimer&&(clearTimeout(E.longPressTimer),E.longPressTimer=null),Cd(E.startX,E.startY))){E.mode="quickswitch",E.suppressClick=!0,Vr(e,t);return}if(E.mode==="quickswitch"){Vr(e,t);return}if(E.mode==="idle"&&n<-12&&(E.longPressTimer&&(clearTimeout(E.longPressTimer),E.longPressTimer=null),E.mode=o.isOpen?"gesture":"desktop-gesture",E.suppressClick=!0,E.mode==="gesture"&&Gn(e,E.startY,"BOTTOM")),E.mode==="gesture"){const s=performance.now(),a=Math.max(1,s-E.lastT);E.vy=.7*E.vy+.3*((t-E.lastY)/a)*1e3,E.lastY=t,E.lastT=s,Do(e,t)}else E.mode==="desktop-gesture"&&(E.lastY=t)}function hu(e,t){if(E.active){if(E.active=!1,E.longPressTimer&&(clearTimeout(E.longPressTimer),E.longPressTimer=null),E.mode==="reposition"){if(B){E.barW||(E.barW=B.offsetWidth||200,E.startLeft=B.getBoundingClientRect().left),E.reposRafId&&(cancelAnimationFrame(E.reposRafId),E.reposRafId=0,B.style.transform=`translateX(${(E.pendingLeft-E.startLeft).toFixed(1)}px)`);const i=B.getBoundingClientRect(),n=i.left+i.width/2,s=window.innerWidth/3,a=n<s?"left":n>s*2?"right":"center";if(B.classList.remove("repositioning"),typeof matchMedia<"u"&&matchMedia("(prefers-reduced-motion: reduce)").matches)bc(a,{toast:!0}),B.style.transform="",B.style.transition="";else{const l=window.innerWidth,c=(a==="left"?16:a==="right"?l-16-E.barW:(l-E.barW)/2)-E.startLeft;B.style.transition="",requestAnimationFrame(()=>{if(!B||E.mode==="reposition")return;B.style.transform=`translateX(${c.toFixed(1)}px)`;let p=!1;const h=y=>{y.target===B&&y.propertyName==="transform"&&f()},f=()=>{p||(p=!0,B.removeEventListener("transitionend",h),clearTimeout(m),!(E.mode==="reposition"||!B.isConnected)&&(bc(a,{toast:!0}),B.style.transform=""))},m=setTimeout(f,380);B.addEventListener("transitionend",h)})}navigator.vibrate&&navigator.vibrate(14)}E.barW=0,E.mode="idle";return}if(E.mode==="gesture"){is(),E.mode="idle";return}if(E.mode==="quickswitch"){Em(),E.mode="idle";return}if(E.mode==="desktop-gesture"){E.startY-t>45&&Ft(),E.mode="idle";return}E.mode="idle"}}function Kb(){B||(Wb(),B=document.createElement("div"),B.id="sysNavBar",B.className="sys-nav-bar pos-"+Un+(ut?"":" hidden"),B.setAttribute("role","navigation"),B.setAttribute("aria-label","系统导航栏"),B.innerHTML=`
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
  `,document.body.appendChild(B),B.addEventListener("click",e=>{if(e.detail===0)E.suppressClick=!1;else if(E.suppressClick){E.suppressClick=!1;return}const t=e.target.closest(".nvb-btn");t&&(t.dataset.nvb==="back"?Yb():t.dataset.nvb==="home"?Gb():t.dataset.nvb==="recents"&&Xb())}),B.addEventListener("pointerdown",e=>{if(e.target.closest(".nvb-btn:not(.nvb-home)")&&e.pointerType!=="touch"){fu(e.clientX,e.clientY),E.longPressTimer&&clearTimeout(E.longPressTimer),E.longPressTimer=null;return}try{B.setPointerCapture(e.pointerId)}catch{}fu(e.clientX,e.clientY)}),B.addEventListener("pointermove",e=>Ub(e.clientX,e.clientY)),B.addEventListener("pointerup",e=>hu(e.clientX,e.clientY)),B.addEventListener("pointercancel",e=>hu(e.clientX,e.clientY)),window.__navBar={enabled:qb,pos:Vb,setEnabled:e=>jb(e),setPos:e=>bc(e,{toast:!0})})}const K={currentAnimationTimeMillis(){return performance.now()}},Qb={getScrollFriction(){return .015}},Jb={GRAVITY_EARTH:9.80665};class Zr{constructor(){this.mViscousFluidNormalize=1/Zr.viscousFluid(1)}static viscousFluid(t){if(t*=8,t<1)t-=1-Math.exp(-t);else{const i=.36787944117;t=1-Math.exp(1-t),t=i+t*(1-i)}return t}getInterpolation(t){const i=this.mViscousFluidNormalize*Zr.viscousFluid(t);return i>0?i:0}}const Zb=250,wl=0,xl=1;class eS{constructor(t=1,i=null,n=!0){this.mMode=wl,this.mInterpolator=i||new Zr,this.mFlywheel=n,this.mScrollerX=new se(t),this.mScrollerY=new se(t)}setFriction(t){this.mScrollerX.setFriction(t),this.mScrollerY.setFriction(t)}isFinished(){return this.mScrollerX.mFinished&&this.mScrollerY.mFinished}forceFinished(t){this.mScrollerX.mFinished=this.mScrollerY.mFinished=t}getCurrX(){return this.mScrollerX.mCurrentPosition}getCurrY(){return this.mScrollerY.mCurrentPosition}getCurrVelocity(){return Math.hypot(this.mScrollerX.mCurrVelocity,this.mScrollerY.mCurrVelocity)}getStartX(){return this.mScrollerX.mStart}getStartY(){return this.mScrollerY.mStart}getFinalX(){return this.mScrollerX.mFinal}getFinalY(){return this.mScrollerY.mFinal}getDuration(){return Math.max(this.mScrollerX.mDuration,this.mScrollerY.mDuration)}extendDuration(t){this.mScrollerX.extendDuration(t),this.mScrollerY.extendDuration(t)}setFinalX(t){this.mScrollerX.setFinalPosition(t)}setFinalY(t){this.mScrollerY.setFinalPosition(t)}computeScrollOffset(){if(this.isFinished())return!1;switch(this.mMode){case wl:{const i=K.currentAnimationTimeMillis()-this.mScrollerX.mStartTime,n=this.mScrollerX.mDuration;if(i<n){const s=this.mInterpolator.getInterpolation(i/n),a=this.mInterpolator.getInterpolation((i-1)/n);this.mScrollerX.updateScroll(s,a),this.mScrollerY.updateScroll(s,a)}else this.abortAnimation();break}case xl:this.mScrollerX.mFinished||this.mScrollerX.update()||this.mScrollerX.continueWhenFinished()||this.mScrollerX.finish(),this.mScrollerY.mFinished||this.mScrollerY.update()||this.mScrollerY.continueWhenFinished()||this.mScrollerY.finish();break}return!0}startScroll(t,i,n,s){this.startScroll(t,i,n,s,Zb)}startScroll(t,i,n,s,a){this.mMode=wl,this.mScrollerX.startScroll(t,n,a),this.mScrollerY.startScroll(i,s,a)}springBack(t,i,n,s,a,r){this.mMode=xl;const l=this.mScrollerX.springback(t,n,s),d=this.mScrollerY.springback(i,a,r);return l||d}fling(t,i,n,s,a,r,l,d){this.fling(t,i,n,s,a,r,l,d,0,0)}fling(t,i,n,s,a,r,l,d,c,p){if(this.mFlywheel&&!this.isFinished()){const h=this.mScrollerX.mCurrVelocity,f=this.mScrollerY.mCurrVelocity;Math.sign(n)===Math.sign(h)&&Math.sign(s)===Math.sign(f)&&(n+=h,s+=f)}this.mMode=xl,this.mScrollerX.fling(t,n,a,r,c),this.mScrollerY.fling(i,s,l,d,p)}notifyHorizontalEdgeReached(t,i,n){this.mScrollerX.notifyEdgeReached(t,i,n)}notifyVerticalEdgeReached(t,i,n){this.mScrollerY.notifyEdgeReached(t,i,n)}isOverScrolled(){return!this.mScrollerX.mFinished&&this.mScrollerX.mState!==se.SPLINE||!this.mScrollerY.mFinished&&this.mScrollerY.mState!==se.SPLINE}abortAnimation(){this.mScrollerX.finish(),this.mScrollerY.finish()}timePassed(){const t=K.currentAnimationTimeMillis(),i=Math.min(this.mScrollerX.mStartTime,this.mScrollerY.mStartTime);return t-i}isScrollingInDirection(t,i){const n=this.mScrollerX.mFinal-this.mScrollerX.mStart,s=this.mScrollerY.mFinal-this.mScrollerY.mStart;return!this.isFinished()&&Math.sign(t)===Math.sign(n)&&Math.sign(i)===Math.sign(s)}getSplineFlingDistance(t){return this.mScrollerY.getSplineFlingDistance(t)}}const mu=2e3,bl=Math.log(.78)/Math.log(.9),Hd=.35,Sc=.5,tS=1,gu=Sc*Hd,vu=1-tS*(1-Hd),Oe=100,eo=new Array(Oe+1),to=new Array(Oe+1);{let e=0,t=0;for(let i=0;i<Oe;i++){const n=i/Oe;let s=1,a,r,l;for(;a=e+(s-e)/2,l=3*a*(1-a),r=l*((1-a)*gu+a*vu)+a*a*a,!(Math.abs(r-n)<1e-5);)r>n?s=a:e=a;eo[i]=l*((1-a)*Sc+a)+a*a*a;let d=1,c,p;for(;c=t+(d-t)/2,l=3*c*(1-c),p=l*((1-c)*Sc+c)+c*c*c,!(Math.abs(p-n)<1e-5);)p>n?d=c:t=c;to[i]=l*((1-c)*gu+c*vu)+c*c*c}eo[Oe]=to[Oe]=1}class se{constructor(t){this.mStart=0,this.mCurrentPosition=0,this.mFinal=0,this.mVelocity=0,this.mCurrVelocity=0,this.mDeceleration=0,this.mStartTime=0,this.mDuration=0,this.mSplineDuration=0,this.mSplineDistance=0,this.mFinished=!1,this.mOver=0,this.mFlingFriction=Qb.getScrollFriction(),this.mState=se.SPLINE,this.mFinished=!0;const i=t*160;this.mPhysicalCoeff=Jb.GRAVITY_EARTH*39.37*i*.84}setFriction(t){this.mFlingFriction=t}updateScroll(t,i){const n=this.mFinal-this.mStart;this.mCurrentPosition=this.mStart+Math.round(t*n),this.mCurrVelocity=1e3*(t-i)*n}static getDeceleration(t){return t>0?-mu:mu}adjustDuration(t,i,n){const s=i-t,a=n-t,r=Math.abs(a/s),l=Oe*r|0;if(l<Oe){const d=l/Oe,c=(l+1)/Oe,p=to[l],h=to[l+1],f=p+(r-d)/(c-d)*(h-p);this.mDuration*=f}}startScroll(t,i,n){this.mFinished=!1,this.mCurrentPosition=this.mStart=t,this.mFinal=t+i,this.mStartTime=K.currentAnimationTimeMillis(),this.mDuration=n,this.mDeceleration=0,this.mVelocity=0}finish(){this.mCurrentPosition=this.mFinal,this.mFinished=!0}setFinalPosition(t){this.mFinal=t,this.mSplineDistance=this.mFinal-this.mStart,this.mFinished=!1}extendDuration(t){const n=K.currentAnimationTimeMillis()-this.mStartTime|0;this.mDuration=this.mSplineDuration=n+t,this.mFinished=!1}springback(t,i,n){return this.mFinished=!0,this.mCurrentPosition=this.mStart=this.mFinal=t,this.mVelocity=0,this.mStartTime=K.currentAnimationTimeMillis(),this.mDuration=0,t<i?this.startSpringback(t,i,0):t>n&&this.startSpringback(t,n,0),!this.mFinished}startSpringback(t,i,n){this.mFinished=!1,this.mState=se.CUBIC,this.mCurrentPosition=this.mStart=t,this.mFinal=i;const s=t-i;this.mDeceleration=se.getDeceleration(s),this.mVelocity=-s,this.mOver=Math.abs(s),this.mDuration=1e3*Math.sqrt(-2*s/this.mDeceleration)|0}fling(t,i,n,s,a){if(this.mOver=a,this.mFinished=!1,this.mCurrVelocity=this.mVelocity=i,this.mDuration=this.mSplineDuration=0,this.mStartTime=K.currentAnimationTimeMillis(),this.mCurrentPosition=this.mStart=t,t>s||t<n){this.startAfterEdge(t,n,s,i);return}this.mState=se.SPLINE;let r=0;i!==0&&(this.mDuration=this.mSplineDuration=this.getSplineFlingDuration(i),r=this.getSplineFlingDistance(i)),this.mSplineDistance=r*Math.sign(i)|0,this.mFinal=t+this.mSplineDistance,this.mFinal<n&&(this.adjustDuration(this.mStart,this.mFinal,n),this.mFinal=n),this.mFinal>s&&(this.adjustDuration(this.mStart,this.mFinal,s),this.mFinal=s)}getSplineDeceleration(t){return Math.log(Hd*Math.abs(t)/(this.mFlingFriction*this.mPhysicalCoeff))}getSplineFlingDistance(t){const i=this.getSplineDeceleration(t),n=bl-1;return this.mFlingFriction*this.mPhysicalCoeff*Math.exp(bl/n*i)}getSplineFlingDuration(t){const i=this.getSplineDeceleration(t),n=bl-1;return 1e3*Math.exp(i/n)|0}fitOnBounceCurve(t,i,n){const s=-n/this.mDeceleration,r=n*n/2/Math.abs(this.mDeceleration),l=Math.abs(i-t),d=Math.sqrt(2*(r+l)/Math.abs(this.mDeceleration));this.mStartTime-=1e3*(d-s)|0,this.mCurrentPosition=this.mStart=i,this.mVelocity=-this.mDeceleration*d|0}startBounceAfterEdge(t,i,n){this.mDeceleration=se.getDeceleration(n===0?t-i:n),this.fitOnBounceCurve(t,i,n),this.onEdgeReached()}startAfterEdge(t,i,n,s){if(t>i&&t<n){console.error("OverScroller","startAfterEdge called from a valid position"),this.mFinished=!0;return}const a=t>n,r=a?n:i,l=t-r;l*s>=0?this.startBounceAfterEdge(t,r,s):this.getSplineFlingDistance(s)>Math.abs(l)?this.fling(t,s,a?i:t,a?t:n,this.mOver):this.startSpringback(t,r,s)}notifyEdgeReached(t,i,n){this.mState===se.SPLINE&&(this.mOver=n,this.mStartTime=K.currentAnimationTimeMillis(),this.startAfterEdge(t,i,i,this.mCurrVelocity|0))}onEdgeReached(){const t=this.mVelocity*this.mVelocity;let i=t/(2*Math.abs(this.mDeceleration));const n=Math.sign(this.mVelocity);i>this.mOver&&(this.mDeceleration=-n*t/(2*this.mOver),i=this.mOver),this.mOver=i|0,this.mState=se.BALLISTIC,this.mFinal=this.mStart+(this.mVelocity>0?i:-i)|0,this.mDuration=-(1e3*this.mVelocity/this.mDeceleration)|0}continueWhenFinished(){switch(this.mState){case se.SPLINE:if(this.mDuration<this.mSplineDuration)this.mCurrentPosition=this.mStart=this.mFinal,this.mVelocity=this.mCurrVelocity|0,this.mDeceleration=se.getDeceleration(this.mVelocity),this.mStartTime+=this.mDuration,this.onEdgeReached();else return!1;break;case se.BALLISTIC:this.mStartTime+=this.mDuration,this.startSpringback(this.mFinal,this.mStart,0);break;case se.CUBIC:return!1}return this.update(),!0}update(){const i=K.currentAnimationTimeMillis()-this.mStartTime;if(i===0)return this.mDuration>0;if(i>this.mDuration)return!1;let n=0;switch(this.mState){case se.SPLINE:{const s=i/this.mSplineDuration,a=Oe*s|0;let r=1,l=0;if(a<Oe){const d=a/Oe,c=(a+1)/Oe,p=eo[a];l=(eo[a+1]-p)/(c-d),r=p+(s-d)*l}n=r*this.mSplineDistance,this.mCurrVelocity=l*this.mSplineDistance/this.mSplineDuration*1e3;break}case se.BALLISTIC:{const s=i/1e3;this.mCurrVelocity=this.mVelocity+this.mDeceleration*s,n=this.mVelocity*s+this.mDeceleration*s*s/2;break}case se.CUBIC:{const s=i/this.mDuration,a=s*s,r=Math.sign(this.mVelocity);n=r*this.mOver*(3*a-2*s*a),this.mCurrVelocity=r*this.mOver*6*(-s+a);break}}return this.mCurrentPosition=this.mStart+Math.round(n),!0}}se.SPLINE=0;se.CUBIC=1;se.BALLISTIC=2;const kc=-1,Va=0,Ii=1,ai=0,Mi=1,yu=2,Li=3,xs=4,wu=600,iS=167,nS=2e3,xu=.15,sS=.09,aS=0,rS=100,oS=1e4,lS=.001,kg=Math.PI/6,bu=Math.sin(kg),Su=Math.cos(kg),ku=.6,Eu=.8,cS=6,dS=.01,_u=200,pS=.001,uS=8,bs=24.657,pn=.98,fS=13,hS=.016,mS=.016,gS=.33;class vS{getInterpolation(t){return 1-(1-t)*(1-t)}}class io{constructor(t=Ii){this.mGlowAlpha=0,this.mGlowScaleY=0,this.mDistance=0,this.mVelocity=0,this.mGlowAlphaStart=0,this.mGlowAlphaFinish=0,this.mGlowScaleYStart=0,this.mGlowScaleYFinish=0,this.mStartTime=0,this.mDuration=0,this.mInterpolator=new vS,this.mState=ai,this.mPullDistance=0,this.mBounds={left:0,top:0,right:0,bottom:0},this.mWidth=0,this.mHeight=0,this.mRadius=0,this.mBaseGlowScale=0,this.mDisplacement=.5,this.mTargetDisplacement=.5,this.mEdgeEffectType=t}setSize(t,i){const n=t*ku/bu,s=Su*n,a=n-s,r=i*ku/bu,l=Su*r,d=r-l;this.mRadius=n,this.mBaseGlowScale=a>0?Math.min(d/a,1):1,this.mBounds.right=t,this.mBounds.bottom=Math.min(i,a),this.mWidth=t,this.mHeight=i}isFinished(){return this.mState===ai}finish(){this.mState=ai,this.mDistance=0,this.mVelocity=0}onPull(t){this.onPull2(t,.5)}onPull2(t,i){if(this.mEdgeEffectType===kc){this.finish();return}const n=K.currentAnimationTimeMillis();if(this.mTargetDisplacement=i,!(this.mState===xs&&n-this.mStartTime<this.mDuration&&this.mEdgeEffectType===Va)){if(this.mState!==Mi&&(this.mEdgeEffectType===Ii?this.mPullDistance=this.mDistance:this.mGlowScaleY=Math.max(aS,this.mGlowScaleY)),this.mState=Mi,this.mStartTime=n,this.mDuration=iS,this.mPullDistance+=t,this.mEdgeEffectType===Ii&&(this.mPullDistance=Math.min(1,this.mPullDistance)),this.mDistance=Math.max(0,this.mPullDistance),this.mVelocity=0,this.mPullDistance===0)this.mGlowScaleY=this.mGlowScaleYStart=0,this.mGlowAlpha=this.mGlowAlphaStart=0;else{const s=Math.abs(t);this.mGlowAlpha=this.mGlowAlphaStart=Math.min(xu,this.mGlowAlpha+s*Eu);const a=Math.max(0,1-1/Math.sqrt(Math.abs(this.mPullDistance)*this.mBounds.bottom)-.3)/.7;this.mGlowScaleY=this.mGlowScaleYStart=a}this.mGlowAlphaFinish=this.mGlowAlpha,this.mGlowScaleYFinish=this.mGlowScaleY,this.mEdgeEffectType===Ii&&this.mDistance===0&&(this.mState=ai)}}onPullDistance(t,i){if(this.mEdgeEffectType===kc)return 0;const s=Math.max(0,t+this.mDistance)-this.mDistance;return s===0&&this.mDistance===0?0:(this.mState!==Mi&&this.mState!==xs&&this.mEdgeEffectType===Va&&(this.mPullDistance=this.mDistance,this.mState=Mi),this.onPull2(s,i),s)}getDistance(){return this.mDistance}onRelease(){this.mPullDistance=0,!(this.mState!==Mi&&this.mState!==xs)&&(this.mState=Li,this.mGlowAlphaStart=this.mGlowAlpha,this.mGlowScaleYStart=this.mGlowScaleY,this.mGlowAlphaFinish=0,this.mGlowScaleYFinish=0,this.mVelocity=0,this.mStartTime=K.currentAnimationTimeMillis(),this.mDuration=wu)}onAbsorb(t){this.mEdgeEffectType===Ii?(this.mState=Li,this.mVelocity=t*fS,this.mStartTime=K.currentAnimationTimeMillis()):this.mEdgeEffectType===Va?(this.mState=yu,this.mVelocity=0,t=Math.min(Math.max(rS,Math.abs(t)),oS),this.mStartTime=K.currentAnimationTimeMillis(),this.mDuration=.15+t*.02,this.mGlowAlphaStart=sS,this.mGlowScaleYStart=Math.max(this.mGlowScaleY,0),this.mGlowScaleYFinish=Math.min(.025+t*(t/100)*15e-5/2,1),this.mGlowAlphaFinish=Math.max(this.mGlowAlphaStart,Math.min(t*cS*1e-5,xu)),this.mTargetDisplacement=.5):this.finish()}getMaxHeight(){return this.mHeight}update(){const t=K.currentAnimationTimeMillis(),i=Math.min((t-this.mStartTime)/this.mDuration,1),n=this.mInterpolator.getInterpolation(i);if(this.mGlowAlpha=this.mGlowAlphaStart+(this.mGlowAlphaFinish-this.mGlowAlphaStart)*n,this.mGlowScaleY=this.mGlowScaleYStart+(this.mGlowScaleYFinish-this.mGlowScaleYStart)*n,this.mState!==Mi&&(this.mDistance=this.calculateDistanceFromGlowValues(this.mGlowScaleY,this.mGlowAlpha)),this.mDisplacement=(this.mDisplacement+this.mTargetDisplacement)/2,i>=1-lS)switch(this.mState){case yu:this.mState=Li,this.mStartTime=K.currentAnimationTimeMillis(),this.mDuration=wu,this.mGlowAlphaStart=this.mGlowAlpha,this.mGlowScaleYStart=this.mGlowScaleY,this.mGlowAlphaFinish=0,this.mGlowScaleYFinish=0;break;case Mi:this.mState=xs,this.mStartTime=K.currentAnimationTimeMillis(),this.mDuration=nS,this.mGlowAlphaStart=this.mGlowAlpha,this.mGlowScaleYStart=this.mGlowScaleY,this.mGlowAlphaFinish=0,this.mGlowScaleYFinish=0;break;case xs:this.mState=Li;break;case Li:this.mState=ai;break}}updateSpring(){const t=K.currentAnimationTimeMillis(),i=(t-this.mStartTime)/1e3;if(i<.001)return;if(this.mStartTime=t,Math.abs(this.mVelocity)<=_u&&Math.abs(this.mDistance*this.mHeight)<uS&&Math.sign(this.mVelocity)===-Math.sign(this.mDistance)){this.mVelocity=Math.sign(this.mVelocity)*_u;const d=this.mDistance+this.mVelocity*i/this.mHeight;Math.sign(d)!==Math.sign(this.mDistance)?(this.mDistance=0,this.mVelocity=0):this.mDistance=d;return}const n=bs*Math.sqrt(1-pn*pn),s=this.mDistance*this.mHeight,a=1/n*(pn*bs*this.mDistance*this.mHeight+this.mVelocity),r=Math.exp(-pn*bs*i)*(s*Math.cos(n*i)+a*Math.sin(n*i)),l=r*-bs*pn+Math.exp(-pn*bs*i)*(-n*s*Math.sin(n*i)+n*a*Math.cos(n*i));this.mDistance=r/this.mHeight,this.mVelocity=l,this.mDistance>1&&(this.mDistance=1,this.mVelocity=0),this.isAtEquilibrium()&&(this.mDistance=0,this.mVelocity=0)}calculateDistanceFromGlowValues(t,i){if(t>=1)return 1;if(t>0){const n=1.4285714285714286/(this.mGlowScaleY-1);return n*n/this.mBounds.bottom}return i/Eu}isAtEquilibrium(){const t=this.mDistance*this.mHeight,i=this.mVelocity;return t<0||Math.abs(i)<dS&&t<pS}getStretch(){return io.dampStretchVector(Math.max(-1,Math.min(1,this.mDistance)))}draw(){this.mEdgeEffectType===Va?this.update():this.mEdgeEffectType===Ii?this.mState===Li&&this.updateSpring():(this.mState=ai,this.mDistance=0,this.mVelocity=0);let t=!1;return this.mState===Li&&this.mDistance===0&&this.mVelocity===0&&(this.mState=ai,t=!0),this.mState!==ai||t}static dampStretchVector(t){const i=t>0?1:-1,n=Math.abs(t),s=hS*n,a=Math.E/gS,r=mS*(1-Math.exp(-n*a));return i*(s+r)}}class yS{getInterpolation(t){return 1-(1-t)*(1-t)}}class L{constructor(t=6710886){this.mGlowAlpha=0,this.mGlowScaleY=0,this.mGlowAlphaStart=0,this.mGlowAlphaFinish=0,this.mGlowScaleYStart=0,this.mGlowScaleYFinish=0,this.mStartTime=0,this.mDuration=0,this.mInterpolator=new yS,this.mState=L.STATE_IDLE,this.mPullDistance=0,this.mBounds={left:0,top:0,right:0,bottom:0},this.mRadius=0,this.mBaseGlowScale=0,this.mDisplacement=.5,this.mTargetDisplacement=.5,this.mColor=t&16777215|855638016,this.mBlendMode="source-atop"}setSize(t,i){const n=t*L.RADIUS_FACTOR/L.SIN,s=L.COS*n,a=n-s,r=i*L.RADIUS_FACTOR/L.SIN,l=L.COS*r,d=r-l;this.mRadius=n,this.mBaseGlowScale=a>0?Math.min(d/a,1):1,this.mBounds.right=t,this.mBounds.bottom=Math.min(i,a|0)}isFinished(){return this.mState===L.STATE_IDLE}finish(){this.mState=L.STATE_IDLE}onPull(t){this.onPull2(t,.5)}onPull2(t,i){const n=K.currentAnimationTimeMillis();if(this.mTargetDisplacement=i,this.mState===L.STATE_PULL_DECAY&&n-this.mStartTime<this.mDuration)return;this.mState!==L.STATE_PULL&&(this.mGlowScaleY=Math.max(L.PULL_GLOW_BEGIN,this.mGlowScaleY)),this.mState=L.STATE_PULL,this.mStartTime=n,this.mDuration=L.PULL_TIME,this.mPullDistance+=t;const s=Math.abs(t);if(this.mGlowAlpha=this.mGlowAlphaStart=Math.min(L.MAX_ALPHA,this.mGlowAlpha+s*L.PULL_DISTANCE_ALPHA_GLOW_FACTOR),this.mPullDistance===0)this.mGlowScaleY=this.mGlowScaleYStart=0;else{const a=Math.max(0,1-1/Math.sqrt(Math.abs(this.mPullDistance)*this.mBounds.bottom)-.3)/.7;this.mGlowScaleY=this.mGlowScaleYStart=a}this.mGlowAlphaFinish=this.mGlowAlpha,this.mGlowScaleYFinish=this.mGlowScaleY}onRelease(){this.mPullDistance=0,!(this.mState!==L.STATE_PULL&&this.mState!==L.STATE_PULL_DECAY)&&(this.mState=L.STATE_RECEDE,this.mGlowAlphaStart=this.mGlowAlpha,this.mGlowScaleYStart=this.mGlowScaleY,this.mGlowAlphaFinish=0,this.mGlowScaleYFinish=0,this.mStartTime=K.currentAnimationTimeMillis(),this.mDuration=L.RECEDE_TIME)}onAbsorb(t){this.mState=L.STATE_ABSORB,t=Math.min(Math.max(L.MIN_VELOCITY,Math.abs(t)),L.MAX_VELOCITY),this.mStartTime=K.currentAnimationTimeMillis(),this.mDuration=.15+t*.02,this.mGlowAlphaStart=L.GLOW_ALPHA_START,this.mGlowScaleYStart=Math.max(this.mGlowScaleY,0),this.mGlowScaleYFinish=Math.min(.025+t*(t/100)*15e-5/2,1),this.mGlowAlphaFinish=Math.max(this.mGlowAlphaStart,Math.min(t*L.VELOCITY_GLOW_FACTOR*1e-5,L.MAX_ALPHA)),this.mTargetDisplacement=.5}setColor(t){this.mColor=t}getColor(){return this.mColor}setBlendMode(t){this.mBlendMode=t}getBlendMode(){return this.mBlendMode}getMaxHeight(){return this.mBounds.bottom*L.MAX_GLOW_SCALE+.5}update(){const t=K.currentAnimationTimeMillis(),i=Math.min((t-this.mStartTime)/this.mDuration,1),n=this.mInterpolator.getInterpolation(i);if(this.mGlowAlpha=this.mGlowAlphaStart+(this.mGlowAlphaFinish-this.mGlowAlphaStart)*n,this.mGlowScaleY=this.mGlowScaleYStart+(this.mGlowScaleYFinish-this.mGlowScaleYStart)*n,this.mDisplacement=(this.mDisplacement+this.mTargetDisplacement)/2,i>=1-L.EPSILON)switch(this.mState){case L.STATE_ABSORB:this.mState=L.STATE_RECEDE,this.mStartTime=K.currentAnimationTimeMillis(),this.mDuration=L.RECEDE_TIME,this.mGlowAlphaStart=this.mGlowAlpha,this.mGlowScaleYStart=this.mGlowScaleY,this.mGlowAlphaFinish=0,this.mGlowScaleYFinish=0;break;case L.STATE_PULL:this.mState=L.STATE_PULL_DECAY,this.mStartTime=K.currentAnimationTimeMillis(),this.mDuration=L.PULL_DECAY_TIME,this.mGlowAlphaStart=this.mGlowAlpha,this.mGlowScaleYStart=this.mGlowScaleY,this.mGlowAlphaFinish=0,this.mGlowScaleYFinish=0;break;case L.STATE_PULL_DECAY:this.mState=L.STATE_RECEDE;break;case L.STATE_RECEDE:this.mState=L.STATE_IDLE;break}}draw(t){this.update(),t.save();const i=(this.mBounds.left+this.mBounds.right)/2,n=this.mBounds.bottom-this.mRadius,s=Math.min(this.mGlowScaleY,1)*this.mBaseGlowScale;t.translate(i,0),t.scale(1,s),t.translate(-i,0);const a=Math.max(0,Math.min(this.mDisplacement,1))-.5,r=this.mBounds.right*a/2;t.beginPath(),t.rect(this.mBounds.left,this.mBounds.top,this.mBounds.right-this.mBounds.left,this.mBounds.bottom-this.mBounds.top),t.clip(),t.translate(r,0),t.globalAlpha=this.mGlowAlpha,t.fillStyle=L.cssColor(this.mColor),this.mBlendMode&&(t.globalCompositeOperation=this.mBlendMode),t.beginPath(),t.arc(i,n,this.mRadius,0,Math.PI*2),t.fill(),t.restore();let l=!1;return this.mState===L.STATE_RECEDE&&this.mGlowScaleY===0&&(this.mState=L.STATE_IDLE,l=!0),this.mState!==L.STATE_IDLE||l}static cssColor(t){const i=t>>>24&255,n=t>>>16&255,s=t>>>8&255,a=t&255;return`rgba(${n},${s},${a},${(i/255).toFixed(3)})`}}L.RECEDE_TIME=600;L.PULL_TIME=167;L.PULL_DECAY_TIME=2e3;L.MAX_ALPHA=.15;L.GLOW_ALPHA_START=.09;L.MAX_GLOW_SCALE=2;L.PULL_GLOW_BEGIN=0;L.MIN_VELOCITY=100;L.MAX_VELOCITY=1e4;L.EPSILON=.001;L.ANGLE=Math.PI/6;L.SIN=Math.sin(L.ANGLE);L.COS=Math.cos(L.ANGLE);L.RADIUS_FACTOR=.6;L.PULL_DISTANCE_ALPHA_GLOW_FACTOR=.8;L.VELOCITY_GLOW_FACTOR=6;L.STATE_IDLE=0;L.STATE_PULL=1;L.STATE_ABSORB=2;L.STATE_RECEDE=3;L.STATE_PULL_DECAY=4;const Ss=0,ri=1,Ci=2,Wa=300,ks=150,wS=1500,xS=4,bS=100;class SS{constructor(t,i={}){this.mList=t,this.mState=ri,this.mEnabled=i.enabled!==!1,this.mAlwaysShow=!!i.alwaysShow,this.mLongList=!1,this.mFirstVisibleItem=0,this.mScrollCompleted=!0,this.mPendingDrag=-1,this.mInitialTouchY=0,this.mScaledTouchSlop=i.touchSlop||8,this.mMatchDragPosition=!0,this.mHeaderCount=0,this.mSections=i.sections||null,this.mSectionIndexer=i.sectionIndexer||null,this.mMinimumTouchTarget=48,this.mThumbMinWidth=i.thumbWidth||12,this.mThumbMinHeight=i.thumbHeight||48,this.mTrackWidth=i.trackWidth||4,this.mPreviewPadding=16,this.mPreviewMinWidth=64,this.mPreviewMinHeight=64,this.mContainerRect={left:0,top:0,right:0,bottom:0},this.mThumbOffset=0,this.mThumbRange=0,this.mWidth=Math.max(this.mThumbMinWidth,this.mTrackWidth),this.mLayoutFromRight=!0,this.views={thumb:i.thumbView||null,track:i.trackView||null,preview:i.previewView||null},this._hideTimer=0,this._raf=null,this._thumbPos=0,this._thumbMiddle=0}isEnabled(){return this.mEnabled&&(this.mLongList||this.mAlwaysShow)}updateLongList(t,i){const n=t>0&&Math.floor(i/t)>=xS;this.mLongList!==n&&(this.mLongList=n,this.onStateDependencyChanged(!1))}onStateDependencyChanged(t){this.isEnabled()?this.mAlwaysShow?this.setState(ri):this.mState===ri?this.postAutoHide():t&&(this.setState(ri),this.postAutoHide()):this.stop()}stop(){this.setState(Ss)}setState(t){if(clearTimeout(this._hideTimer),this.mAlwaysShow&&t===Ss&&(t=ri),t!==this.mState){switch(t){case Ss:this.transitionToHidden();break;case ri:this.transitionToVisible();break;case Ci:this.transitionToDragging();break}this.mState=t}}postAutoHide(){clearTimeout(this._hideTimer),this._hideTimer=setTimeout(()=>this.setState(Ss),wS)}_applyTransition(t,i,n){t&&(t.style.transition=`opacity ${n}ms, transform ${n}ms`,Object.assign(t.style,i))}_thumbTransform(t){return`translateX(${t}px) translateY(${(this._thumbMiddle||0)-this.mThumbMinHeight/2}px)`}transitionToHidden(){const{thumb:t,track:i,preview:n}=this.views,s=this.mLayoutFromRight?this.mWidth:-this.mWidth;this._applyTransition(t,{opacity:"0",transform:this._thumbTransform(s)},Wa),this._applyTransition(i,{opacity:"0",transform:`translateX(${s}px)`},Wa),this._applyTransition(n,{opacity:"0"},Wa)}transitionToVisible(){const{thumb:t,track:i,preview:n}=this.views;this._applyTransition(t,{opacity:"1",transform:this._thumbTransform(0)},ks),this._applyTransition(i,{opacity:"1",transform:"translateX(0px)"},ks),this._applyTransition(n,{opacity:"0"},Wa)}transitionToDragging(){const{thumb:t,track:i,preview:n}=this.views;this._applyTransition(t,{opacity:"1",transform:this._thumbTransform(0)},ks),this._applyTransition(i,{opacity:"1",transform:"translateX(0px)"},ks),this._applyTransition(n,{opacity:"1"},ks)}onScroll(t,i,n){if(!this.isEnabled()){this.setState(Ss);return}n-i>0&&this.mState!==Ci&&this.setThumbPos(this.getPosFromItemCount(t,i,n)),this.mScrollCompleted=!0,this.mFirstVisibleItem!==t&&(this.mFirstVisibleItem=t,this.mState!==Ci&&(this.setState(ri),this.postAutoHide()))}onItemCountChanged(t,i){this.updateLongList(t,i),this.mState!==Ci&&this.setThumbPos(this.getPosFromItemCount(this.mList.getFirstVisiblePosition(),t,i))}getPosFromItemCount(t,i,n){if(i===0||n===0)return 0;if(!(this.mSectionIndexer&&this.mSections&&this.mSections.length>0)||!this.mMatchDragPosition)return i===n?0:t/(n-i);if(t-=this.mHeaderCount,t<0)return 0;n-=this.mHeaderCount;const a=this.mList.getChildAt(0),r=a&&a.height>0?(this.mList.getPaddingTop()-a.top)/a.height:0,l=this.mSections.length,d=this.mSectionIndexer.getSectionForPosition(t),c=this.mSectionIndexer.getPositionForSection(d),p=d<l-1?this.mSectionIndexer.getPositionForSection(d+1):n-1,h=Math.max(p-c,1),f=(t+r-c)/h;let m=(d+f)/l;if(t>0&&t+i===n){const y=this.mList.getChildAt(i-1),g=this.mList.getPaddingBottom(),w=y.height+(this.mList.getClipToPadding()?0:g),k=this.mList.getHeight()-y.top-(this.mList.getClipToPadding()?g:0);k>0&&w>0&&(m+=(1-m)*(k/w))}return m}setThumbPos(t){this._thumbPos=t;const i=t*this.mThumbRange+this.mThumbOffset;this._thumbMiddle=i;const n=this.mThumbMinHeight;if(this.views.thumb&&(this.views.thumb.style.transform=`translateY(${i-n/2}px)`),this.views.preview){const s=this.mPreviewMinHeight,a=this.mContainerRect.top+s/2,r=this.mContainerRect.bottom-s/2,l=Math.min(Math.max(i,a),r);this.views.preview.style.transform=`translateY(${l-s/2}px)`}}updateOffsetAndRange(){const t=this.mThumbMinHeight/2;this.mThumbOffset=this.mContainerRect.top+t,this.mThumbRange=this.mContainerRect.bottom-t-this.mThumbOffset}updateContainerRect(){const t=this.mContainerRect;t.left=0,t.top=0,t.right=this.mList.getWidth(),t.bottom=this.mList.getHeight()}layout(){this.updateContainerRect(),this.updateOffsetAndRange()}getPosFromMotionEvent(t){return this.mThumbRange<=0?0:Math.min(Math.max((t-this.mThumbOffset)/this.mThumbRange,0),1)}scrollTo(t){this.mScrollCompleted=!1;const i=this.mList.getCount();let n;if(this.mSectionIndexer&&this.mSections&&this.mSections.length>1){const s=this.mSections.length,a=Math.min(Math.max(t*s|0,0),s-1);n=this.mSectionIndexer.getPositionForSection(a)}else n=Math.min(Math.max(t*i|0,0),i-1);this.mList.scrollToPosition(n),this.mScrollCompleted=!0}isPointInside(t,i){return this.isPointInsideX(t)&&this.isPointInsideY(i)}isPointInsideX(t){const i=this.mList.getWidth();return t>=i-Math.max(this.mWidth,this.mMinimumTouchTarget)}isPointInsideY(t){const i=this.mThumbOffset+this._thumbPos*this.mThumbRange-this.mThumbMinHeight/2,n=Math.max(0,this.mMinimumTouchTarget-this.mThumbMinHeight)/2;return t>=i-n&&t<=i+this.mThumbMinHeight+n}onTouchEvent(t,i,n){if(!this.isEnabled())return!1;switch(t){case"down":return this.isPointInside(i,n)?(this.mInitialTouchY=n,this.startPendingDrag(),!0):!1;case"move":if(this.mPendingDrag>=0&&Math.abs(n-this.mInitialTouchY)>this.mScaledTouchSlop&&this.beginDrag(),this.mState===Ci){const s=this.getPosFromMotionEvent(n);return this._thumbPos=s,this.setThumbPos(s),this.mScrollCompleted&&this.scrollTo(s),!0}return this.mPendingDrag>=0;case"up":if(this.mPendingDrag>=0){this.beginDrag();const s=this.getPosFromMotionEvent(n);this._thumbPos=s,this.setThumbPos(s),this.scrollTo(s)}return this.mState===Ci?(this.setState(ri),this.postAutoHide(),!0):!1;case"cancel":return this.cancelPendingDrag(),!1}return!1}startPendingDrag(){this.mPendingDrag=Date.now()+bS}cancelPendingDrag(){this.mPendingDrag=-1}beginDrag(){this.mPendingDrag=-1,this.setState(Ci),this.mList.requestDisallowInterceptTouchEvent(!0)}}const kS=2,Sl=8,Ge=56,Tu=900,ES=".app-page, .panel-scroll, .theme-body",Eg=new Set;let Mu=!1;function Ya(){return!!(o.isDragging||o.popInProgress||!o.subpageSpring.isSettled()||!o.scaleSpring.isSettled()||!o.posSpring.isSettled())}class _S{constructor(t,i={}){this.el=t,this.edgeMode=i.edgeMode||"stretch",this.useFastScroller=i.fastScroller!==!1,this.scroller=new eS(kS),this._rafPending=!1,this._initEdgeEffects(),this._pointerId=null,this._startY=0,this._lastY=0,this._dragging=!1,this._pullEngaged=!1,this._velTracker={samples:[]},this._touchId=null,this._tAnchorY=null,this._tEngaged=!1,this._tLastY=0,this._lastScrollTop=t.scrollTop,this._lastScrollT=0,this._scrollV=0,this._onScroll=()=>this._handleScroll(),this._onPointerDown=n=>this._handlePointerDown(n),this._onPointerMove=n=>this._handlePointerMove(n),this._onPointerUp=n=>this._handlePointerUp(n,!1),this._onPointerCancel=n=>this._handlePointerUp(n,!0),this._onTouchStart=n=>this._handleTouchStart(n),this._onTouchMove=n=>this._handleTouchMove(n),this._onTouchEnd=n=>this._handleTouchEnd(n),t.addEventListener("scroll",this._onScroll,{passive:!0}),t.addEventListener("pointerdown",this._onPointerDown),t.style.overscrollBehaviorY="contain",t.addEventListener("touchstart",this._onTouchStart,{passive:!0}),t.addEventListener("touchmove",this._onTouchMove,{passive:!0}),t.addEventListener("touchend",this._onTouchEnd,{passive:!0}),t.addEventListener("touchcancel",this._onTouchEnd,{passive:!0}),this.useFastScroller&&this._initFastScroller(),typeof ResizeObserver<"u"&&(this._ro=new ResizeObserver(()=>this.layout()),this._ro.observe(t)),this.layout()}_initEdgeEffects(){const t=typeof matchMedia=="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches,i=t?kc:this.edgeMode==="glow"?0:Ii;this.edgeMode==="glow"&&!t?(this.edgeTop=new L(9090296),this.edgeBottom=new L(9090296),this.edgeTop.mBlendMode="source-over",this.edgeBottom.mBlendMode="source-over",this.edgeTop.mColor=2861217016,this.edgeBottom.mColor=2861217016,this._glowCanvas=document.createElement("canvas"),this._glowCanvas.className="md-fx-glow",Object.assign(this._glowCanvas.style,{position:"sticky",top:"0",display:"block",height:"0",zIndex:"6",pointerEvents:"none"}),this.el.appendChild(this._glowCanvas)):(this.edgeTop=new io(i),this.edgeBottom=new io(i))}_initFastScroller(){const t=this.el,i=document.createElement("div");i.className="md-fastscroller",Object.assign(i.style,{position:"sticky",top:"0",height:"0",zIndex:"6",pointerEvents:"none"});const n=document.createElement("div");n.className="md-fs-track",Object.assign(n.style,{position:"absolute",right:"2px",top:"0",width:"4px",borderRadius:"2px",background:"rgba(154,160,166,0.25)",opacity:"0"});const s=document.createElement("div");s.className="md-fs-thumb",Object.assign(s.style,{position:"absolute",right:"0",top:"0",width:"12px",height:"48px",borderRadius:"6px",background:"rgba(154,160,166,0.7)",opacity:"0"}),i.appendChild(n),i.appendChild(s),t.firstChild?t.insertBefore(i,t.firstChild):t.appendChild(i),this._fsOverlay=i,this._fsTrack=n,this._fsThumb=s,this.fastScroller=new SS({getCount:()=>Math.round(Math.max(t.scrollHeight,0)/Ge),getChildCount:()=>Math.ceil(Math.max(t.clientHeight,1)/Ge),getFirstVisiblePosition:()=>Math.max(0,Math.round(t.scrollTop/Ge)),getChildAt:a=>({top:(Math.round(t.scrollTop/Ge)+a)*Ge-t.scrollTop,height:Ge}),getHeight:()=>t.clientHeight,getWidth:()=>t.clientWidth,getPaddingTop:()=>0,getPaddingBottom:()=>0,getClipToPadding:()=>!0,scrollToPosition:a=>{this.scroller.forceFinished(!0),t.scrollTop=a*Ge},requestDisallowInterceptTouchEvent:()=>{}},{thumbView:s,trackView:n,previewView:null,touchSlop:Sl}),this.fastScroller.layout()}layout(){const t=this.el.clientWidth,i=this.el.clientHeight;if(!(!t||!i)){if(this.edgeTop&&this.edgeTop.setSize&&(this.edgeTop.setSize(t,i),this.edgeBottom.setSize(t,i)),this._fsTrack&&(this._fsTrack.style.height=i+"px"),this._fsOverlay){const n=parseFloat(getComputedStyle(this.el).paddingTop)||0;this._fsOverlay.style.height=i+"px",this._fsOverlay.style.marginTop=-n+"px",this._fsOverlay.style.marginBottom=-(i-n)+"px"}if(this.fastScroller&&this.fastScroller.layout(),this.fastScroller){const n=Math.ceil(i/Ge),s=Math.round(this.el.scrollHeight/Ge);this.fastScroller.updateLongList(n,s),this.fastScroller.onScroll(Math.max(0,Math.round(this.el.scrollTop/Ge)),n,s)}if(this._glowCanvas){const n=window.devicePixelRatio||1;this._glowCanvas.width=t*n,this._glowCanvas.height=i*n,this._glowCanvas.style.height=i+"px",this._glowCanvas.style.marginTop=-i+"px",this._glowCtx=this._glowCanvas.getContext("2d")}}}_handlePointerDown(t){if(this._pointerId!==null||t.pointerType==="mouse"&&t.button!==0)return;const i=this.el.getBoundingClientRect(),n=t.clientX-i.left,s=t.clientY-i.top;if(this._fsDrag=!1,this.fastScroller&&this.fastScroller.onTouchEvent("down",n,s)){this._pointerId=t.pointerId,this._fsDrag=!0;try{this.el.setPointerCapture(t.pointerId)}catch{}window.addEventListener("pointermove",this._onPointerMove,{passive:!0}),window.addEventListener("pointerup",this._onPointerUp,{passive:!0}),window.addEventListener("pointercancel",this._onPointerCancel,{passive:!0});return}if(this._pointerId=t.pointerId,this._startY=this._lastY=t.clientY,this._dragging=!1,this._pullEngaged=!1,this._velTracker.samples=[],this._velTracker.samples.push({y:t.clientY,t:t.timeStamp}),this.edgeMode==="stretch"&&this.edgeTop.onPullDistance){const a=Math.max(1,this.el.clientWidth);this.edgeTop.isFinished()||this.edgeTop.onPullDistance(0,n/a),this.edgeBottom.isFinished()||this.edgeBottom.onPullDistance(0,1-n/a)}window.addEventListener("pointermove",this._onPointerMove,{passive:!0}),window.addEventListener("pointerup",this._onPointerUp,{passive:!0}),window.addEventListener("pointercancel",this._onPointerCancel,{passive:!0})}_handleFastScrollerMove(t){const i=this.el.getBoundingClientRect();return this.fastScroller.onTouchEvent("move",t.clientX-i.left,t.clientY-i.top)}_handlePointerMove(t){if(t.pointerId!==this._pointerId)return;if(this._fsDrag){this._handleFastScrollerMove(t);return}const i=t.clientY,n=this._lastY-i;this._lastY=i,this._velTracker.samples.push({y:i,t:t.timeStamp});const s=t.timeStamp-200,a=this._velTracker.samples;for(;a.length>2&&a[0].t<s;)a.shift();if(!this._dragging){if(Math.abs(i-this._startY)<=Sl)return;this._dragging=!0}const r=this.el,l=Math.max(0,r.scrollHeight-r.clientHeight),d=r.scrollTop<=0,c=r.scrollTop>=l-.5;if(!this._pullEngaged&&(Ya()||((d&&n<0||c&&n>0)&&l>0&&(this._pullEngaged=!0,r.classList.add("md-fx-pulling")),!this._pullEngaged)))return;const p=Math.max(1,r.clientHeight);if(n===0)return;if(this.edgeMode==="stretch"){if(n<0&&this.edgeBottom.getDistance()!==0){this.edgeBottom.onPullDistance(n/p,.5);return}if(n>0&&this.edgeTop.getDistance()!==0){this.edgeTop.onPullDistance(-n/p,.5);return}}const h=r.scrollTop<=0&&n<0,f=r.scrollTop>=l-.5&&n>0;h?(this.edgeMode==="stretch"&&this.edgeTop.onPullDistance?this.edgeTop.onPullDistance(-n/p,this._displacement(t)):this.edgeTop.onPull(n/p,this._displacement(t)),this.edgeBottom.isFinished()||this.edgeBottom.onRelease()):f&&(this.edgeMode==="stretch"&&this.edgeBottom.onPullDistance?this.edgeBottom.onPullDistance(n/p,this._displacement(t)):this.edgeBottom.onPull(-n/p,1-this._displacement(t)),this.edgeTop.isFinished()||this.edgeTop.onRelease()),this._ensureRaf()}_displacement(t){const i=this.el.getBoundingClientRect();return TS((t.clientX-i.left)/Math.max(1,this.el.clientWidth))}_handlePointerUp(t,i){if(t.pointerId===this._pointerId){if(this._pointerId=null,window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),window.removeEventListener("pointercancel",this._onPointerCancel),this.el.classList.remove("md-fx-pulling"),this._fsDrag){this._fsDrag=!1;const n=this.el.getBoundingClientRect();this.fastScroller.onTouchEvent(i?"cancel":"up",t.clientX-n.left,t.clientY-n.top);return}if(this._pullEngaged){this._pullEngaged=!1,this._dragging=!1,this.edgeTop.onRelease(),this.edgeBottom.onRelease(),this._ensureRaf();return}this._dragging=!1}}_handleTouchStart(t){if(this._touchId!==null)return;const i=t.changedTouches&&t.changedTouches[0];i&&(this._touchId=i.identifier,this._tLastY=i.clientY,this._tAnchorY=null,this._tEngaged=!1)}_handleTouchMove(t){if(this._touchId===null)return;let i=null;const n=t.changedTouches||[];for(let p=0;p<n.length;p++)if(n[p].identifier===this._touchId){i=n[p];break}if(!i||this._pointerId!==null)return;const s=this.el,a=i.clientY,r=Math.max(0,s.scrollHeight-s.clientHeight),l=s.scrollTop<=.5,d=r>0&&s.scrollTop>=r-.5;if(this._tEngaged){const p=this._tLastY-a;if(this._tLastY=a,p===0)return;const h=Math.max(1,s.clientHeight);if(p<0&&(l||this.edgeTop.getDistance()>0)){this.edgeMode==="stretch"&&this.edgeTop.onPullDistance?this.edgeTop.onPullDistance(-p/h,.5):this.edgeTop.onPull(p/h,.5),this.edgeBottom.isFinished()||this.edgeBottom.onRelease(),this._ensureRaf();return}if(p>0&&(d||this.edgeBottom.getDistance()>0)){this.edgeMode==="stretch"&&this.edgeBottom.onPullDistance?this.edgeBottom.onPullDistance(p/h,.5):this.edgeBottom.onPull(-p/h,.5),this.edgeTop.isFinished()||this.edgeTop.onRelease(),this._ensureRaf();return}!l&&!d&&(this._tEngaged=!1,this._tAnchorY=null,s.classList.remove("md-fx-pulling"),this.edgeTop.isFinished()||this.edgeTop.onRelease(),this.edgeBottom.isFinished()||this.edgeBottom.onRelease(),this._ensureRaf());return}if(!l&&!d){this._tAnchorY=null,this._tLastY=a;return}this._tAnchorY===null&&(this._tAnchorY=a),this._tAnchorY=l?Math.min(this._tAnchorY,a):Math.max(this._tAnchorY,a),this._tLastY=a,(l?a-this._tAnchorY:this._tAnchorY-a)>Sl&&!Ya()&&(this._tEngaged=!0,this._tLastY=a,s.classList.add("md-fx-pulling"))}_handleTouchEnd(t){if(this._touchId===null)return;const i=t.changedTouches||[];for(let n=0;n<i.length;n++)if(i[n].identifier===this._touchId){this._touchId=null;break}this._touchId===null&&(this._tEngaged?(this._tEngaged=!1,this._tAnchorY=null,this.el.classList.remove("md-fx-pulling"),this.edgeTop.onRelease(),this.edgeBottom.onRelease(),this._ensureRaf()):this._tAnchorY=null)}_handleScroll(){const t=this.el,i=performance.now();if(this._lastScrollT){const a=Math.max(1,i-this._lastScrollT),r=(t.scrollTop-this._lastScrollTop)/a*1e3;this._scrollV=this._scrollV*.7+r*.3}this._lastScrollTop=t.scrollTop,this._lastScrollT=i,clearTimeout(this._scrollIdleTimer),this._scrollIdleTimer=setTimeout(()=>{this._scrollV=0,this._lastScrollT=0},120);const n=Math.max(0,t.scrollHeight-t.clientHeight),s=this._scrollV;if(t.scrollTop<=0&&s<-Tu||t.scrollTop>=n-.5&&s>Tu){const a=t.scrollTop<=0?this.edgeTop:this.edgeBottom;a.isFinished()&&!Ya()&&(a.onAbsorb(Math.min(Math.abs(s),4e3)|0),this._ensureRaf())}if(this.fastScroller){const a=Math.round(t.scrollHeight/Ge),r=Math.ceil(t.clientHeight/Ge),l=Math.max(0,Math.round(t.scrollTop/Ge));this.fastScroller.onScroll(l,r,a)}}_ensureRaf(){this._rafPending||(this._rafPending=!0,requestAnimationFrame(()=>{this._rafPending=!1,this._frame()}))}_frame(){let t=!1;this.edgeTop&&!this.edgeTop.isFinished()&&(this.edgeTop.draw(),t=!0),this.edgeBottom&&!this.edgeBottom.isFinished()&&(this.edgeBottom.draw(),t=!0),this._renderEdge(),t?this._ensureRaf():this._renderEdgeClear()}_renderEdge(){const t=this.el;if(this.edgeMode==="glow"){this._renderGlow();return}if(Ya()){this.edgeTop.isFinished()||this.edgeTop.finish(),this.edgeBottom.isFinished()||this.edgeBottom.finish(),this._renderEdgeClear();return}const i=this.edgeTop.mDistance||0,n=this.edgeBottom.mDistance||0,s=i>0?1+this.edgeTop.getStretch():1,a=n>0?1+this.edgeBottom.getStretch():1;s>1.0005&&s>=a?(t.style.transformOrigin="0 0",t.style.transform=`scale(1, ${s.toFixed(4)})`):a>1.0005&&(t.style.transformOrigin="0 100%",t.style.transform=`scale(1, ${a.toFixed(4)})`)}_renderEdgeClear(){const t=this.el;if(this.edgeMode==="glow"){if(this._glowCtx){const i=window.devicePixelRatio||1;this._glowCtx.setTransform(i,0,0,i,0,0),this._glowCtx.clearRect(0,0,this.el.clientWidth,this.el.clientHeight)}return}t.style.transform&&t.style.transform.startsWith("scale(1,")&&(t.style.transform="",t.style.transformOrigin="")}_renderGlow(){const t=this._glowCtx;if(!t)return;const i=this.el,n=window.devicePixelRatio||1,s=i.clientWidth,a=i.clientHeight;t.setTransform(n,0,0,n,0,0),t.clearRect(0,0,s,a);const r=i.scrollTop,l=Math.max(0,i.scrollHeight-a);this.edgeTop.isFinished()||(t.save(),t.translate(0,Math.min(0,r)),this.edgeTop.draw(t),t.restore()),this.edgeBottom.isFinished()||(t.save(),t.translate(-s,Math.max(l,r)+a-r),t.translate(s,0),t.rotate(Math.PI),t.translate(-s,0),this.edgeBottom.draw(t),t.restore())}destroy(){this.el.removeEventListener("scroll",this._onScroll),this.el.removeEventListener("pointerdown",this._onPointerDown),this.el.removeEventListener("touchstart",this._onTouchStart),this.el.removeEventListener("touchmove",this._onTouchMove),this.el.removeEventListener("touchend",this._onTouchEnd),this.el.removeEventListener("touchcancel",this._onTouchEnd),window.removeEventListener("pointermove",this._onPointerMove),window.removeEventListener("pointerup",this._onPointerUp),window.removeEventListener("pointercancel",this._onPointerCancel),this._ro&&this._ro.disconnect(),clearTimeout(this._scrollIdleTimer),this._fsOverlay&&this._fsOverlay.parentNode&&this._fsOverlay.parentNode.removeChild(this._fsOverlay),this._glowCanvas&&this._glowCanvas.parentNode&&this._glowCanvas.parentNode.removeChild(this._glowCanvas),this.el.style.transform&&this.el.style.transform.startsWith("scale(1,")&&(this.el.style.transform="",this.el.style.transformOrigin=""),this.el.classList.remove("md-fx-pulling"),this.el.__scrollFx=null,Eg.delete(this)}}function TS(e){return e<0?0:e>1?1:e}function MS(e,t={}){if(!e||e.__scrollFx)return null;const i=new _S(e,t);return e.__scrollFx=i,Eg.add(i),i}function Lu(e=document){typeof e.querySelectorAll=="function"&&e.querySelectorAll(ES).forEach(t=>MS(t))}function LS(){if(Mu)return;Mu=!0,Lu();const e=new MutationObserver(()=>Lu());try{e.observe(document.body,{childList:!0,subtree:!0})}catch{}}class CS{constructor(t,i,n,s){this.mX1=t,this.mY1=i,this.mX2=n,this.mY2=s}getInterpolation(t){return t<=0?0:t>=1?1:this.getBezierY(this.solveForX(t))}getBezierY(t){const i=1-t;return 3*i*i*t*this.mY1+3*i*t*t*this.mY2+t*t*t}getBezierX(t){const i=1-t;return 3*i*i*t*this.mX1+3*i*t*t*this.mX2+t*t*t}getSlopeX(t){const i=1-t;return 3*i*i*this.mX1+6*i*t*(this.mX2-this.mX1)+3*t*t*(1-this.mX2)}solveForX(t){let i=t;for(let a=0;a<8;a++){const r=this.getBezierX(i)-t;if(Math.abs(r)<1e-6)return i;const l=this.getSlopeX(i);if(Math.abs(l)<1e-6)break;i-=r/l}let n=0,s=1;i=t;for(let a=0;a<32;a++){const r=this.getBezierX(i);if(Math.abs(r-t)<1e-6)break;r<t?n=i:s=i,i=(n+s)/2}return i}}const Cu=450,Iu=375,_g=7e3,IS=_g/214,AS=new CS(.4,0,.2,1);class Tg{constructor(t,i,n,s,a){this.originX=t,this.originY=i,this.touchX=n,this.touchY=s,this.mStartTime=a,this.progress=0,this.noisePhase=a,this.exiting=!1,this.exitRequestedAt=0,this.finished=!1}requestExit(t){this.exiting||(this.exiting=!0,this.exitRequestedAt=t,this.exitStartValue=this.progress)}update(t){const i=t-this.mStartTime;if(this.noisePhase=this.mStartTime+IS*Math.min(i/_g,1),this.exiting){const n=Math.max(Cu-(this.exitRequestedAt-this.mStartTime),0),s=this.exitRequestedAt+n,a=t-s;if(a>=0){const r=Math.min(a/Iu,1);this.progress=this.exitStartValue+(1-this.exitStartValue)*r,this.finished=a>=Iu}}else{const n=Math.min(i/Cu,1);this.progress=.5*AS.getInterpolation(n)}}}const PS=`
precision highp float;

uniform vec2  uOrigin;            // in_origin（涟漪原点，像素）
uniform vec2  uTouch;             // in_touch
uniform float uProgress;          // in_progress
uniform float uMaxRadius;         // in_maxRadius（setRadius 已乘 2.3）
uniform vec2  uResolutionScale;   // in_resolutionScale = (1/w, 1/h)
uniform vec2  uNoiseScale;        // in_noiseScale = (2.1/w, 2.1/h)
uniform float uNoisePhase;        // in_noisePhase = phase * 0.001
uniform float uTurbulencePhase;   // in_turbulencePhase = phase
uniform vec2  uTCircle1;          // in_tCircle1..3
uniform vec2  uTCircle2;
uniform vec2  uTCircle3;
uniform vec2  uTRotation1;        // in_tRotation1..3（cos/sin 对）
uniform vec2  uTRotation2;
uniform vec2  uTRotation3;
uniform vec4  uColor;             // in_color（波颜色，含 alpha）
uniform vec4  uSparkleColor;      // in_sparkleColor
uniform float uHasMask;           // in_hasMask（0 = 无遮罩，1 = 有遮罩）
uniform float uH;                 // 画布高度（gl_FragCoord y 翻转用）
uniform vec4  uMaskRect;          // 遮罩矩形（设备像素，y 向下；xy=min, zw=max）
uniform float uMaskRadius;        // 遮罩圆角 px

float triangleNoise(vec2 n) {
  n  = fract(n * vec2(5.3987, 5.4421));
  n += dot(n.yx, n.xy + vec2(21.5351, 14.3137));
  float xy = n.x * n.y;
  return fract(xy * 95.4307) + fract(xy * 75.04961) - 1.0;
}
const float PI = 3.1415926535897932384626;

float sat(float v) { return clamp(v, 0.0, 1.0); }

float threshold(float v, float l, float h) {
    return step(l, v) * (1.0 - step(h, v));
}
float sparkles(vec2 uv, float t) {
  float n = triangleNoise(uv);
  float s = 0.0;
  for (float i = 0.0; i < 4.0; i += 1.0) {
    float l = i * 0.1;
    float h = l + 0.05;
    float o = sin(PI * (t + 0.35 * i));
    s += threshold(n + o, l, h);
  }
  return sat(s) * uSparkleColor.a;
}
float softCircle(vec2 uv, vec2 xy, float radius, float blur) {
  float blurHalf = blur * 0.5;
  float d = distance(uv, xy);
  return 1.0 - smoothstep(1.0 - blurHalf, 1.0 + blurHalf, d / radius);
}
float softRing(vec2 uv, vec2 xy, float radius, float progress, float blur) {
  float thickness = 0.05 * radius;
  float currentRadius = radius * progress;
  float circle_outer = softCircle(uv, xy, currentRadius + thickness, blur);
  float circle_inner = softCircle(uv, xy, max(currentRadius - thickness, 0.0), blur);
  return sat(circle_outer - circle_inner);
}
float subProgress(float start, float end, float progress) {
    float sub = clamp(progress, start, end);
    return (sub - start) / (end - start);
}
mat2 rotate2d(vec2 rad){
  return mat2(rad.x, -rad.y, rad.y, rad.x);
}
float circle_grid(vec2 resolution, vec2 coord, float time, vec2 center,
    vec2 rotation, float cell_diameter) {
  coord = rotate2d(rotation) * (center - coord) + center;
  coord = mod(coord, cell_diameter) / resolution;
  float normal_radius = cell_diameter / resolution.y * 0.5;
  float radius = 0.65 * normal_radius;
  return softCircle(coord, vec2(normal_radius), radius, radius * 50.0);
}
float turbulence(vec2 uv, float t) {
  const vec2 scale = vec2(0.8);
  uv = uv * scale;
  float g1 = circle_grid(scale, uv, t, uTCircle1, uTRotation1, 0.17);
  float g2 = circle_grid(scale, uv, t, uTCircle2, uTRotation2, 0.2);
  float g3 = circle_grid(scale, uv, t, uTCircle3, uTRotation3, 0.275);
  float v = (g1 * g1 + g2 - g3) * 0.5;
  return sat(0.45 + 0.8 * v);
}
void main() {
    // gl_FragCoord y 向上，Android 像素 y 向下 → 翻转
    vec2 p = vec2(gl_FragCoord.x, uH - gl_FragCoord.y);

    float fadeIn = subProgress(0.0, 0.13, uProgress);
    float scaleIn = subProgress(0.0, 1.0, uProgress);
    float fadeOutNoise = subProgress(0.4, 0.5, uProgress);
    float fadeOutRipple = subProgress(0.4, 1.0, uProgress);
    vec2 center = mix(uTouch, uOrigin, sat(uProgress * 2.0));
    float ring = softRing(p, center, uMaxRadius, scaleIn, 1.0);
    float alpha = min(fadeIn, 1.0 - fadeOutNoise);
    vec2 uv = p * uResolutionScale;
    vec2 densityUv = uv - mod(uv, uNoiseScale);
    float turb = turbulence(uv, uTurbulencePhase);
    float sparkleAlpha = sparkles(densityUv, uNoisePhase) * ring * alpha * turb;
    float fade = min(fadeIn, 1.0 - fadeOutRipple);
    float waveAlpha = softCircle(p, center, uMaxRadius * scaleIn, 1.0) * fade * uColor.a;
    vec4 waveColor = vec4(uColor.rgb * waveAlpha, waveAlpha);
    vec4 sparkleColor = vec4(uSparkleColor.rgb * uSparkleColor.a, uSparkleColor.a);
    // AOSP: in_hasMask == 1. ? (in_shader.eval(p).a > 0. ? 1. : 0.) : 1.
    // in_hasMask = 0 → mask = 1；= 1 时由宿主提供遮罩。
    // Web 集成：宿主无 in_shader 纹理，遮罩退化为圆角矩形 SDF（元素 bounds + 圆角，
    // 1.5px 软边抗锯齿）—— 对应 RippleDrawable 以 View 边界为涟漪遮罩的行为。
    float mask = 1.0;
    if (uHasMask > 0.5) {
      vec2 halfSz = (uMaskRect.zw - uMaskRect.xy) * 0.5;
      vec2 c2 = (uMaskRect.xy + uMaskRect.zw) * 0.5;
      vec2 q = abs(p - c2) - (halfSz - vec2(uMaskRadius));
      float sdf = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uMaskRadius;
      mask = 1.0 - smoothstep(-1.5, 1.5, sdf);
    }
    gl_FragColor = mix(waveColor, sparkleColor, sparkleAlpha) * mask;
}
`,BS=`
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`,Au=Math.PI*.0078125,FS=Math.PI*-.0078125;function Mg(e){const i=[.75+e*.01*Math.cos(.8250000000000001),.75+e*.01*Math.sin(.8250000000000001)],n=[1.5*.2+e*-.0066*Math.cos(1.5*.45),1.5*.2+e*-.0066*Math.sin(1.5*.45)],s=[1.5+e*-.0066*Math.cos(1.5*.35),1.5+e*-.0066*Math.sin(1.5*.35)],a=e*Au+1.7*Math.PI,r=e*FS+2*Math.PI,l=e*Au+2.75*Math.PI;return{tCircle1:i,tCircle2:n,tCircle3:s,tRotation1:[Math.cos(a),Math.sin(a)],tRotation2:[Math.cos(r),Math.sin(r)],tRotation3:[Math.cos(l),Math.sin(l)]}}function Pu(e){return[(e>>>16&255)/255,(e>>>8&255)/255,(e&255)/255,(e>>>24&255)/255]}class DS{constructor(t,{color:i=1946157055,sparkleColor:n=3875536895}={}){this.mCanvas=t,this.mColor=i,this.mSparkleColor=n,this.mSessions=[],this.mDownPointers=new Map;const s=t.getContext("webgl",{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(this.mGl=s,!s){this.mSupported=!1;return}this.mSupported=!0;const a=(y,g)=>{const w=s.createShader(y);if(s.shaderSource(w,g),s.compileShader(w),!s.getShaderParameter(w,s.COMPILE_STATUS))throw new Error("shader: "+s.getShaderInfoLog(w));return w},r=s.createProgram();if(s.attachShader(r,a(s.VERTEX_SHADER,BS)),s.attachShader(r,a(s.FRAGMENT_SHADER,PS)),s.linkProgram(r),!s.getProgramParameter(r,s.LINK_STATUS))throw new Error("link: "+s.getProgramInfoLog(r));s.useProgram(r),this.mProg=r;const l=s.createBuffer();s.bindBuffer(s.ARRAY_BUFFER,l),s.bufferData(s.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),s.STATIC_DRAW);const d=s.getAttribLocation(r,"aPos");s.enableVertexAttribArray(d),s.vertexAttribPointer(d,2,s.FLOAT,!1,0,0),s.enable(s.BLEND),s.blendFunc(s.ONE,s.ONE_MINUS_SRC_ALPHA),s.clearColor(0,0,0,0),this.mU={};for(const y of["uOrigin","uTouch","uProgress","uMaxRadius","uResolutionScale","uNoiseScale","uNoisePhase","uTurbulencePhase","uTCircle1","uTCircle2","uTCircle3","uTRotation1","uTRotation2","uTRotation3","uColor","uSparkleColor","uHasMask","uH","uMaskRect","uMaskRadius"])this.mU[y]=s.getUniformLocation(r,y);const c=window.devicePixelRatio||1,p=t.getBoundingClientRect(),h=t.width=(p.width||t.clientWidth||1)*c,f=t.height=(p.height||t.clientHeight||1)*c,m=2.1;s.uniform2f(this.mU.uResolutionScale,1/h,1/f),s.uniform2f(this.mU.uNoiseScale,m/h,m/f),s.uniform1f(this.mU.uH,f),s.uniform4fv(this.mU.uColor,Pu(i)),s.uniform4fv(this.mU.uSparkleColor,Pu(n)),s.uniform1f(this.mU.uHasMask,0),this.mOriginX=h/2,this.mOriginY=f/2,this.mMaxRadius=Math.hypot(h/2,f/2)*2.3,s.uniform1f(this.mU.uMaxRadius,this.mMaxRadius),s.uniform2f(this.mU.uOrigin,this.mOriginX,this.mOriginY),s.viewport(0,0,1,1),s.uniform1f(this.mU.uProgress,.5),s.uniform1f(this.mU.uNoisePhase,0),s.uniform1f(this.mU.uTurbulencePhase,0),s.drawArrays(s.TRIANGLE_STRIP,0,4),s.clear(s.COLOR_BUFFER_BIT),this._raf=this._raf.bind(this),this._running=!1}onTouchDown(t,i,n){const s=window.devicePixelRatio||1,a=K.currentAnimationTimeMillis(),r=new Tg(this.mOriginX,this.mOriginY,i*s,n*s,a);this.mSessions.push(r),this.mDownPointers.set(t,r),this._ensureLoop()}onTouchUp(t){const i=this.mDownPointers.get(t);i&&(i.requestExit(K.currentAnimationTimeMillis()),this.mDownPointers.delete(t))}onTouchMove(t,i,n){const s=this.mDownPointers.get(t);if(s){const a=window.devicePixelRatio||1;s.touchX=i*a,s.touchY=n*a}}_ensureLoop(){this._running||(this._running=!0,requestAnimationFrame(this._raf))}_raf(){const t=this.mGl,i=K.currentAnimationTimeMillis();t.viewport(0,0,this.mCanvas.width,this.mCanvas.height),t.clear(t.COLOR_BUFFER_BIT),this.mSessions=this.mSessions.filter(n=>{if(n.update(i),n.finished)return!1;(!n.exiting||n.turbCache===void 0)&&(n.turbCache=Mg(n.noisePhase));const s=n.turbCache;return t.uniform2f(this.mU.uTouch,n.touchX,n.touchY),t.uniform1f(this.mU.uProgress,n.progress),t.uniform1f(this.mU.uNoisePhase,n.noisePhase*.001),t.uniform1f(this.mU.uTurbulencePhase,n.noisePhase),t.uniform2f(this.mU.uTCircle1,s.tCircle1[0],s.tCircle1[1]),t.uniform2f(this.mU.uTCircle2,s.tCircle2[0],s.tCircle2[1]),t.uniform2f(this.mU.uTCircle3,s.tCircle3[0],s.tCircle3[1]),t.uniform2f(this.mU.uTRotation1,s.tRotation1[0],s.tRotation1[1]),t.uniform2f(this.mU.uTRotation2,s.tRotation2[0],s.tRotation2[1]),t.uniform2f(this.mU.uTRotation3,s.tRotation3[0],s.tRotation3[1]),t.drawArrays(t.TRIANGLE_STRIP,0,4),!0}),this.mSessions.length>0||this.mDownPointers.size>0?requestAnimationFrame(this._raf):this._running=!1}}const zS=[".md3-list-item",".md3-btn",".qs-tile-pill","[data-ripple]",".tp-row",".noti-card",".noti-footer-btn",".qs-action-btn",".noti-media-btn",".panel-tab-pill-btn",".tab-btn-noti",".tab-btn-qs",".power-action-tile",".edit-tiles-back",".edit-tiles-undo",".back-btn",".mini-btn",".fj-rpl",".fj-gitem","button"].join(", ");let St=null,Bu=!1;function RS(e){return e<0?0:e>1?1:e}function OS(e){if(!e)return null;const t=e.trim();let i=t.match(/^rgba?\(([^)]+)\)$/i);if(i){const n=i[1].split(/[\s,/]+/).filter(Boolean).map(Number);if(n.length>=3&&n.every(s=>!Number.isNaN(s))){const s=n.length>3?RS(n[3]):1;return[n[0]/255,n[1]/255,n[2]/255,s]}return null}if(i=t.match(/^#([0-9a-f]{3,8})$/i),i){let n=i[1];(n.length===3||n.length===4)&&(n=n.split("").map(d=>d+d).join(""));const s=parseInt(n.slice(0,2),16)/255,a=parseInt(n.slice(2,4),16)/255,r=parseInt(n.slice(4,6),16)/255,l=n.length>=8?parseInt(n.slice(6,8),16)/255:1;return[s,a,r,l]}return null}function $S(){return!!(document.body&&document.body.classList.contains("light-theme"))}class HS{constructor(){this.canvas=document.createElement("canvas"),this.canvas.className="md-ripple-layer",Object.assign(this.canvas.style,{position:"fixed",inset:"0",width:"100vw",height:"100vh",zIndex:"2147483000",pointerEvents:"none"}),document.body.appendChild(this.canvas),this.surface=null,this.surfaceFailed=!1,this.sessions=[],this.pointers=new Map,this._running=!1,this._raf=this._raf.bind(this),this._resize=()=>this._resizeCanvas(),window.addEventListener("resize",this._resize,{passive:!0}),this._resizeCanvas(),this._onDown=t=>this._handleDown(t),this._onMove=t=>this._handleMove(t),this._onUp=t=>this._handleUp(t),document.addEventListener("pointerdown",this._onDown,!0),window.addEventListener("pointermove",this._onMove,{passive:!0}),window.addEventListener("pointerup",this._onUp,{passive:!0}),window.addEventListener("pointercancel",this._onUp,{passive:!0})}_ensureSurface(){if(!(this.surface||this.surfaceFailed))try{const t=new DS(this.canvas,{color:1946157055,sparkleColor:3875536895});if(!t.mSupported){this.surfaceFailed=!0;return}this.surface=t,this._syncSurfaceResolution()}catch{this.surfaceFailed=!0}}_resizeCanvas(){const t=window.devicePixelRatio||1;this.canvas.width=Math.max(1,Math.round(window.innerWidth*t)),this.canvas.height=Math.max(1,Math.round(window.innerHeight*t)),this.surface&&this._syncSurfaceResolution()}_syncSurfaceResolution(){const t=this.surface.mGl;if(!t)return;const i=this.canvas.width,n=this.canvas.height;t.uniform2f(this.surface.mU.uResolutionScale,1/i,1/n),t.uniform2f(this.surface.mU.uNoiseScale,2.1/i,2.1/n),t.uniform1f(this.surface.mU.uH,n)}_handleDown(t){if(t.button!==void 0&&t.button!==0)return;const i=t.target&&t.target.closest?t.target.closest(zS):null;if(!i||i.hasAttribute("disabled")||i.getAttribute("aria-disabled")==="true"||typeof matchMedia=="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches||(this._ensureSurface(),!this.surface))return;const n=window.devicePixelRatio||1,s=i.getBoundingClientRect();if(s.width<=0||s.height<=0)return;const a=window.innerWidth,r=window.innerHeight,l=Math.max(s.left,0),d=Math.max(s.top,0),c=Math.min(s.right,a),p=Math.min(s.bottom,r);if(c<=l||p<=d)return;const h=K.currentAnimationTimeMillis(),f=new Tg((s.left+s.width/2)*n,(s.top+s.height/2)*n,t.clientX*n,t.clientY*n,h);f.maxRadius=Math.hypot(s.width/2,s.height/2)*2.3*n,f.mask={has:1,rect:[l*n,d*n,c*n,p*n],radius:parseFloat(getComputedStyle(i).borderRadius)||0};const m=getComputedStyle(i).getPropertyValue("--ripple-color").trim();f.color=OS(m)||($S()?[0,0,0,.12]:[1,1,1,.2]),f.sparkle=[1,1,1,.9],f.originEl=i,f.cx=s.left+s.width/2,f.cy=s.top+s.height/2,f.sx0=l+2,f.sy0=d+2,f.sx1=c-2,f.sy1=p-2,f.coverFadeStart=-1,this.sessions.push(f),this.pointers.set(t.pointerId,f),this._ensureLoop()}_handleMove(t){const i=this.pointers.get(t.pointerId);if(!i)return;const n=window.devicePixelRatio||1;i.touchX=t.clientX*n,i.touchY=t.clientY*n}_handleUp(t){const i=this.pointers.get(t.pointerId);i&&(i.requestExit(K.currentAnimationTimeMillis()),this.pointers.delete(t.pointerId))}_hostVisible(t){const i=t.originEl;if(!i||!i.isConnected)return!1;if(typeof document.elementFromPoint!="function")return!0;const n=[[t.cx,t.cy],[t.sx0,t.sy0],[t.sx1,t.sy0],[t.sx0,t.sy1],[t.sx1,t.sy1]];for(let s=0;s<n.length;s++){const a=document.elementFromPoint(n[s][0],n[s][1]);if(a&&!(a===i||i.contains(a)||a.contains(i)))return!1}return!0}_ensureLoop(){this._running||(this._running=!0,requestAnimationFrame(this._raf))}_raf(){const t=this.surface;if(!t){this._running=!1;return}const i=t.mGl,n=t.mU,s=K.currentAnimationTimeMillis();i.viewport(0,0,this.canvas.width,this.canvas.height),i.clear(i.COLOR_BUFFER_BIT),this.sessions=this.sessions.filter(a=>{if(a.update(s),a.finished)return!1;a.coverFadeStart===-1&&!this._hostVisible(a)&&(a.coverFadeStart=s);let r=1;if(a.coverFadeStart!==-1){const d=(s-a.coverFadeStart)/90;if(d>=1)return!1;r=1-d}(!a.exiting||a.turbCache===void 0)&&(a.turbCache=Mg(a.noisePhase));const l=a.turbCache;return i.uniform2f(n.uTouch,a.touchX,a.touchY),i.uniform1f(n.uProgress,a.progress),i.uniform1f(n.uNoisePhase,a.noisePhase*.001),i.uniform1f(n.uTurbulencePhase,a.noisePhase),i.uniform2f(n.uTCircle1,l.tCircle1[0],l.tCircle1[1]),i.uniform2f(n.uTCircle2,l.tCircle2[0],l.tCircle2[1]),i.uniform2f(n.uTCircle3,l.tCircle3[0],l.tCircle3[1]),i.uniform2f(n.uTRotation1,l.tRotation1[0],l.tRotation1[1]),i.uniform2f(n.uTRotation2,l.tRotation2[0],l.tRotation2[1]),i.uniform2f(n.uTRotation3,l.tRotation3[0],l.tRotation3[1]),i.uniform1f(n.uMaxRadius,a.maxRadius),a.mask?(i.uniform1f(n.uHasMask,a.mask.has),i.uniform4f(n.uMaskRect,a.mask.rect[0],a.mask.rect[1],a.mask.rect[2],a.mask.rect[3]),i.uniform1f(n.uMaskRadius,a.mask.radius)):i.uniform1f(n.uHasMask,0),i.uniform4f(n.uColor,a.color[0],a.color[1],a.color[2],a.color[3]*r),i.uniform4f(n.uSparkleColor,a.sparkle[0],a.sparkle[1],a.sparkle[2],a.sparkle[3]*r),i.drawArrays(i.TRIANGLE_STRIP,0,4),!0}),this.sessions.length>0||this.pointers.size>0?requestAnimationFrame(this._raf):this._running=!1}destroy(){window.removeEventListener("resize",this._resize),document.removeEventListener("pointerdown",this._onDown,!0),window.removeEventListener("pointermove",this._onMove),window.removeEventListener("pointerup",this._onUp),window.removeEventListener("pointercancel",this._onUp),this.canvas.parentNode&&this.canvas.parentNode.removeChild(this.canvas),St=null}}function NS(){if(!Bu&&(Bu=!0,!(typeof document>"u"||!document.body))){try{St=new HS}catch{St=null}typeof window<"u"&&(window.__rippleDebug=qS)}}function qS(){return{active:!!St,sessions:St?St.sessions.length:0,pointers:St?St.pointers.size:0,webgl:!!(St&&St.surface)}}let dr=0,pr=0;function jS(){document.addEventListener("visibilitychange",()=>{if(document.hidden){dr=window.innerWidth||0,pr=window.innerHeight||0;return}requestAnimationFrame(()=>requestAnimationFrame(VS))})}function VS(){const e=performance.now(),t=o._frameHeartbeat||0,i=!!o.rafId&&t>0&&e-t<600;if((o.isOpen||o.isClosing||o.flightActive)&&!o.isDragging&&!i){if(o.rafId){try{cancelAnimationFrame(o.rafId)}catch{}o.rafId=null}try{et()}catch{}}const s=document.getElementById("recentAppsOverlay"),a=!!(s&&s.classList.contains("active")),r=!!o.isOpen&&!o.isClosing&&u.appWindow&&!u.appWindow.classList.contains("open");if(!o.isClosing&&u.desktop&&!a&&(!o.isOpen||r)&&(u.desktop.style.transform&&u.desktop.style.transform!==""||u.desktop.style.filter&&u.desktop.style.filter!==""||document.querySelector(".launch-hidden")))try{ta()}catch{}if(o.isOpen&&!o.isClosing&&!o.isDragging&&o.scaleSpring.target===1&&typeof o.scaleSpring.isSettled=="function"&&o.scaleSpring.isSettled()&&u.appWindow){const c=u.appWindow;let p=null;try{p=getComputedStyle(c)}catch{}(!c.classList.contains("open")||p&&p.visibility==="hidden"||c.style.opacity==="0")&&(c.classList.contains("open")||c.classList.add("open"),p&&p.visibility==="hidden"&&(c.style.visibility=""),c.style.opacity==="0"&&(c.style.opacity="1"))}const l=window.innerWidth||0,d=window.innerHeight||0;if(dr&&pr&&(l!==dr||d!==pr))try{window.dispatchEvent(new Event("resize"))}catch{}dr=l,pr=d;try{window.dispatchEvent(new CustomEvent("md3-visibility-heal"))}catch{}}Lw("files",{canBack:()=>!!(window.__filesPB&&window.__filesPB.canBack()),triggerBack:()=>{window.__filesPB&&window.__filesPB.triggerBack()},beginGesture:e=>{window.__filesPB&&window.__filesPB.beginGesture(e)},progressGesture:(e,t)=>{window.__filesPB&&window.__filesPB.progressGesture(e,t)},endGesture:(e,t)=>{window.__filesPB&&window.__filesPB.endGesture(e,t)}});window.addEventListener("contextmenu",e=>{e.preventDefault()},{passive:!1});window.addEventListener("dragstart",e=>{e.preventDefault()},{passive:!1});Rg();B2();B0();zv();Fv();Df();Dw();rm();hv();_2();u2();$w();zw();Yw();Pm();V0();gh();Om();Kb();v2();Dh();Nb();jS();Wx();Zx();he(()=>import("./pkg-registry-DmqGdr6y.js"),[],import.meta.url).then(async({initInstaller:e,providePermissionMeta:t})=>{t(window.__permissions?window.__permissions.PERMISSION_META:null);const{added:i}=await e();i>0&&(tt(),oc()),window.dispatchEvent(new Event("pkg-installer-ready"))}).catch(()=>{});hx();wx();Tx(F);Bx();LS();NS();Iy();Mb();window.__onThemeModeChanged=()=>{try{ei()}catch{}try{gt(od(),!1)}catch{}};window.__appIconProbe={ids:Object.keys(De),svg:e=>De[e]||J(e)};nf().then(()=>tn(!0));Av();Ef();ew();window.__getUnlockAnimStyle=tm;window.__setUnlockAnimStyle=Y2;window.__lockNow=Yn;window.__tryUnlockAnim=function(){o.isOpen&&!o.isClosing?(Bt(0,-600,-2),setTimeout(()=>Yn(),500)):Yn()};setTimeout(()=>{if(window.__lockTest&&window.__lockTest.isLocked()){const e=document.getElementById("lockScreen");if(e){const t=da(),i=e.querySelector(".lock-wallpaper");if(i)if(t)i.style.backgroundImage=`url("${t}")`;else{const n=document.getElementById("desktop"),s=n?getComputedStyle(n).backgroundImage:"none";s&&s!=="none"&&(i.style.backgroundImage=s)}}}},1200);$c();tt();window.pushSubPage=vr;window.popSubPage=On;window.triggerWallpaperSelect=Rc;window.triggerFontSelect=Bv;window.showSystemToast=W;window.__demoAction=function(e){try{window.showSystemToast(e?`「${e}」为演示功能，暂未开放`:"演示功能，暂未开放")}catch{}};function Lg(e,t,i,n){e==="down"?Gn(t,i,n||"BOTTOM"):e==="move"?Do(t,i):e==="up"&&is()}window.__handleIframeGesture=function(e,t,i,n){Lg(e,t,i,n)};window.__syncIframeApp=function(e){ih(e);const t=Pv();if(t)try{e.contentWindow.postMessage({type:"set-wallpaper",url:t},"*")}catch{}const i=da();if(i)try{e.contentWindow.postMessage({type:"set-wallpaper",url:i},"*")}catch{}const n=Sv(),s=kv();if(n&&s)try{e.contentWindow.postMessage({type:"set-font",url:n,name:s},"*")}catch{}const a=od();try{e.contentWindow.postMessage({type:"set-theme-hue",hue:a},"*")}catch{}const r=_v();if(r)try{e.contentWindow.postMessage({type:"set-palette",palette:r},"*")}catch{}try{Oh(e)}catch{}const l=e.contentDocument||e.contentWindow&&e.contentWindow.document;if(!(!l||l.__md3SdkInjected)){l.__md3SdkInjected=!0;try{const d=l.createElement("script");d.textContent=`
      (function() {
        // v7.52：安装包应用由 sw.js 头注 pkg-sdk.js（先于包内脚本）—— 检测到即幂等跳过
        // 本次注入，避免 __system 重复定义与手势转发双监听（内置应用无此标记，照常注入）
        if (window.__pkgSdkInstalled) return;
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
    `,l.body?l.body.appendChild(d):(l.head||l.documentElement).appendChild(d)}catch{}}};u.desktop.addEventListener("click",e=>{o.isEditMode&&!e.target.closest(".app-icon")&&!e.target.closest(".app-folder")&&d0()});u.backBtn.addEventListener("click",()=>{o.isDragging||On()});u.miniWindowBtn&&u.miniWindowBtn.addEventListener("click",()=>{o.currentApp&&window.__miniWindowOpen&&window.__miniWindowOpen(o.currentApp.id,null)});window.addEventListener("touchstart",e=>{_e()||Gn(e.touches[0].clientX,e.touches[0].clientY,null,e.target)},{passive:!0});window.addEventListener("touchmove",e=>{_e()||(Do(e.touches[0].clientX,e.touches[0].clientY),o.isDragging&&e.cancelable&&e.preventDefault())},{passive:!1});window.addEventListener("touchend",e=>{_e()||is()},{passive:!0});window.addEventListener("touchcancel",e=>{_e()||is()},{passive:!0});window.addEventListener("mousedown",e=>{_e()||(o.mouseDown=!0,Gn(e.clientX,e.clientY,null,e.target))});window.addEventListener("mousemove",e=>{_e()||(o.mouseDown||o.isDragging)&&Do(e.clientX,e.clientY)});window.addEventListener("mouseup",()=>{(o.mouseDown||o.isDragging)&&(o.mouseDown=!1,is())});window.addEventListener("pointercancel",()=>{(o.mouseDown||o.isDragging)&&(o.mouseDown=!1,is())});function kl(e){if(!e)return!1;if(e===window)return!0;const t=document.querySelectorAll("iframe");for(let i=0;i<t.length;i++)try{if(t[i].contentWindow===e)return!0}catch{}return!1}window.addEventListener("message",e=>{if(e.data)if(e.data.type==="restore-app"&&e.data.appId){if(!kl(e.source))return;w0(e.data.appId),oc()}else if(e.data.type==="uninstall-app"&&e.data.appId){if(!kl(e.source))return;const t=o.pagesApps.findIndex(i=>Array.isArray(i)&&i.some(n=>n&&n.id===e.data.appId));t!==-1&&Lf(t,e.data.appId),oc()}else if(e.data.type==="iframe-gesture"){if(!kl(e.source))return;const{gestureType:t,x:i,y:n,extra:s}=e.data;Lg(t,i,n,s)}else i1(e)});let no=0,so=0,In=!1,Jt=!1,Cg=null,Ig=0;u.desktop.addEventListener("click",e=>{performance.now()<Ig&&(e.stopPropagation(),e.preventDefault())},!0);function ao(){Ig=performance.now()+350}u.desktop.addEventListener("touchstart",e=>{if(_e()||o.isOpen||o.isDragging||o.iconDragState||o.isEditMode)return;const t=e.touches[0];no=t.clientX,so=t.clientY,performance.now(),In=!0,Jt=!1,Cg=t.identifier},{passive:!0});u.desktop.addEventListener("touchmove",e=>{if(!In||_e())return;const t=e.touches.length===1?e.touches[0]:Array.from(e.touches).find(s=>s.identifier===Cg);if(!t)return;const i=t.clientX-no,n=t.clientY-so;Jt?Ji(t.clientX):Math.abs(i)>12&&Math.abs(i)>Math.abs(n)*1.15&&(Jt=!0,Zs(no),Ji(t.clientX)),Jt&&e.cancelable&&e.preventDefault()},{passive:!1});u.desktop.addEventListener("touchend",e=>{if(_e()||!In||o.isOpen||o.isDragging){In=!1,Jt=!1;return}const t=Jt;In=!1,Jt=!1;const i=e.changedTouches[0],n=i.clientX-no,s=i.clientY-so;if(so>window.innerHeight-60&&s<-45){Ft();return}if(t){ao(),Ni();return}Math.abs(n)>50&&Math.abs(n)>Math.abs(s)*1.5&&(ao(),n<0?ct(o.currentPage+1):ct(o.currentPage-1))},{passive:!0});u.desktop.addEventListener("touchcancel",()=>{Jt&&(Jt=!1,Ni()),In=!1},{passive:!0});let ro=0,oo=0,Ks=!1,An=!1;u.desktop.addEventListener("mousedown",e=>{_e()||o.isOpen||o.isDragging||o.iconDragState||o.isEditMode||e.target.closest(".app-icon")||e.target.closest(".app-folder")||(ro=e.clientX,oo=e.clientY,Ks=!0,An=!1)});window.addEventListener("mousemove",e=>{if(!Ks||_e())return;const t=e.clientX-ro,i=e.clientY-oo;An?Ji(e.clientX):Math.abs(t)>12&&Math.abs(t)>Math.abs(i)*1.15&&(An=!0,Zs(ro),Ji(e.clientX))});window.addEventListener("mouseup",e=>{if(!Ks||_e()){Ks=!1,An=!1;return}const t=An;Ks=!1,An=!1;const i=e.clientX-ro,n=e.clientY-oo;if(oo>window.innerHeight-60&&n<-50){Ft();return}if(t){ao(),Ni();return}Math.abs(i)>80&&Math.abs(i)>Math.abs(n)*1.5&&(ao(),i<0?ct(o.currentPage+1):ct(o.currentPage-1))});let El=null;function Ag(){ct(o.currentPage,!1);const e=document.getElementById("recentAppsOverlay");e&&e.classList.contains("active")&&he(()=>Promise.resolve().then(()=>Wl),void 0,import.meta.url).then(t=>t.renderRecentCards())}window.addEventListener("resize",()=>{El&&clearTimeout(El),El=setTimeout(Ag,100)},{passive:!0});window.addEventListener("orientationchange",()=>{setTimeout(Ag,200)},{passive:!0});export{rx as A,Ie as S,he as _,F as a,M as b,Bt as c,Rn as d,Ke as e,lo as f,cf as g,Pt as h,de as i,sx as j,jc as k,Ye as l,ot as m,J as n,xe as o,Wc as p,Vc as q,WS as r,o as s,ix as t,YS as u,Zv as v,GS as w,XS as x,Wl as y,US as z};
