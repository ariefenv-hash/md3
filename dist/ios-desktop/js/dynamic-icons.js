import{dom as w}from"./dom.js";export function createDynamicIconHTML(e,t=!1){const c=t?"launch_":"grid_";if(e==="clock"){const n=new Date,d=n.getHours()%12,r=n.getMinutes(),s=n.getSeconds(),l=n.getMilliseconds(),f=`rotate(${((d+r/60)*30).toFixed(2)}deg)`,m=`rotate(${((r+s/60)*6).toFixed(2)}deg)`,g=`rotate(${Math.floor((s+l/1e3)*6)}deg)`;return`
      <div class="dynamic-clock-icon">
        <div class="clock-face">
          <div class="clock-tick tick-12"></div>
          <div class="clock-tick tick-3"></div>
          <div class="clock-tick tick-6"></div>
          <div class="clock-tick tick-9"></div>
          <div class="clock-hand hour-hand" id="${c}hourHand" style="transform:${f}"></div>
          <div class="clock-hand minute-hand" id="${c}minuteHand" style="transform:${m}"></div>
          <div class="clock-hand second-hand" id="${c}secondHand" style="transform:${g}"></div>
          <div class="clock-center-dot"></div>
        </div>
      </div>`}if(e==="calendar"){const n=new Date;return`
      <div class="dynamic-calendar-icon">
        <div class="cal-header" id="${c}calHeader">${["\u5468\u65E5","\u5468\u4E00","\u5468\u4E8C","\u5468\u4E09","\u5468\u56DB","\u5468\u4E94","\u5468\u516D"][n.getDay()]}</div>
        <div class="cal-body" id="${c}calBody">${n.getDate()}</div>
      </div>`}return""}const h=new Map,v=new Map,x=1e3;function k(e){let t=h.get(e);if(t&&t.isConnected)return t;const c=v.get(e),n=performance.now();return c!=null&&n-c<x?null:(t=document.getElementById(e),t?(h.set(e,t),v.delete(e)):v.set(e,n),t)}let a=null;function D(){return(!a||!a.isConnected)&&(a=document.getElementById("recentAppsOverlay")),!!(a&&a.classList.contains("active"))}const u=new Map;function y(e,t){const c=k(e);if(!c)return;const n=u.get(e);n&&n.el===c&&n.value===t||(u.set(e,{el:c,value:t}),c.style.transform=t)}function $(e,t){const c=k(e);if(!c)return;const n=u.get(e);n&&n.el===c&&n.value===t||(u.set(e,{el:c,value:t}),c.textContent=t)}let o=0;export function cancelDynamicIconTicker(){o&&(clearTimeout(o),o=0)}function H(){if(o)return;const e=1e3-Date.now()%1e3+30;o=setTimeout(()=>{o=0,updateDynamicIcons()},Math.max(250,e))}typeof document<"u"&&document.addEventListener("visibilitychange",()=>{!document.hidden&&!o&&updateDynamicIcons()});export function updateDynamicIcons(){if(typeof document>"u")return;if(!(document.hidden||document.body.classList.contains("is-locked")||D())){const t=new Date,n=["\u5468\u65E5","\u5468\u4E00","\u5468\u4E8C","\u5468\u4E09","\u5468\u56DB","\u5468\u4E94","\u5468\u516D"][t.getDay()],d=String(t.getDate()),r=t.getHours()%12,s=t.getMinutes(),l=t.getSeconds(),f=t.getMilliseconds(),m=`rotate(${Math.floor((l+f/1e3)*6)}deg)`,g=`rotate(${((s+l/60)*6).toFixed(2)}deg)`,p=`rotate(${((r+s/60)*30).toFixed(2)}deg)`;["grid_","launch_"].forEach(i=>{y(i+"hourHand",p),y(i+"minuteHand",g),y(i+"secondHand",m),$(i+"calHeader",n),$(i+"calBody",d)})}H()}export function updateClock(){const e=new Date;w.clock.textContent=e.getHours().toString().padStart(2,"0")+":"+e.getMinutes().toString().padStart(2,"0")}
