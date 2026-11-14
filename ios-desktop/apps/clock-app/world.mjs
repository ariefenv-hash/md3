import{$ as r,render as c,pad as u,toggleModal as m,A as s,save as l}from"./app.mjs";const y=[{name:"\u5317\u4EAC",country:"\u4E2D\u56FD",offset:8,tz:"Asia/Shanghai"},{name:"\u4E1C\u4EAC",country:"\u65E5\u672C",offset:9,tz:"Asia/Tokyo"},{name:"\u6089\u5C3C",country:"\u6FB3\u5927\u5229\u4E9A",offset:10,tz:"Australia/Sydney"},{name:"\u4F26\u6566",country:"\u82F1\u56FD",offset:0,tz:"Europe/London"},{name:"\u7EBD\u7EA6",country:"\u7F8E\u56FD",offset:-5,tz:"America/New_York"}],n=()=>{const i=r("worldCityList");if(!s.worldCities.length){i.innerHTML='<div class="sub-txt" style="text-align:center;padding:80px 20px;font-size:18px">\u65E0\u5730\u70B9</div>';return}c(i,s.worldCities,t=>`
    <div class="city-card fb" data-city-id="${t.id}">
      <div>
        <div class="fc g-6" style="font-size:17px;font-weight:500"><span>${t.name}</span><span class="city-sun-icon"><span class="material-symbols-outlined" style="font-size:18px">light_mode</span></span></div>
        <div class="sub-txt" style="margin-top:2px">${t.isLocal?"\u672C\u5730\u65F6\u95F4":t.country+" \xB7 \u65F6\u5DEE "+(t.offset>=0?"+":"")+t.offset+"h"}</div>
      </div>
      <div class="fc g-12">
        <div class="city-time-num" style="font-size:22px">--:--</div>
        ${t.isLocal?"":'<span class="material-symbols-outlined" data-act="toggle-pin" data-id="'+t.id+'" title="\u9489\u5230\u684C\u9762 At a Glance" style="cursor:pointer;font-size:20px;'+(o.has(t.id)?"color:var(--acc);":"color:inherit;opacity:.5")+'">push_pin</span>'}
        ${t.isLocal?"":'<span class="material-symbols-outlined sub-txt" style="cursor:pointer;font-size:20px" data-act="remove-city" data-id="'+t.id+'">close</span>'}
      </div>
    </div>
  `)},w=()=>{s.worldCities.forEach(i=>{const t=document.querySelector('[data-city-id="'+i.id+'"]');if(!t)return;const e=window.__clockCore.worldClockInfo(new Date,i);e&&(t.querySelector(".city-sun-icon").innerHTML='<span class="material-symbols-outlined" style="font-size:18px">'+(e.isDay?"light_mode":"dark_mode")+"</span>",t.querySelector(".city-time-num").innerText=e.dayPeriod+" "+e.hour12+":"+u(e.minute))})};let o=new Set;const a=(i,t)=>{try{if(window.__system){window.__system.emit(i,t);return}}catch{}try{window.parent.postMessage({type:"BUS_EMIT",event:i,payload:t},"*")}catch{}},p=()=>{a("clock/request-pins",null)},f=i=>{const t=y.filter(e=>e.name.includes(i)||e.country.includes(i));c(r("citySearchResults"),t,e=>`
    <div style="padding:16px 24px;border-bottom:1px solid var(--ss);cursor:pointer" data-act="select-city" data-name="${e.name}">
      <div style="font-size:16px;font-weight:500">${e.name}</div>
      <div class="sub-txt">${e.country}</div>
    </div>
  `)},v=i=>{o=new Set((i||[]).map(t=>t.id)),n()},h={"remove-city":i=>{s.worldCities=s.worldCities.filter(t=>t.id!==i.dataset.id),l(),n()},"toggle-pin":i=>{const t=s.worldCities.find(e=>e.id===i.dataset.id);t&&(o.has(t.id)?(o.delete(t.id),a("clock/unpin-city",{id:t.id})):(o.add(t.id),a("clock/pin-city",{id:t.id,name:t.name,country:t.country,offset:t.offset,tz:t.tz})),n())},"select-city":i=>{const t=i.dataset.name,e=y.find(d=>d.name===t);e&&!s.worldCities.some(d=>d.name===e.name)&&(s.worldCities.push({id:"c_"+Date.now(),name:e.name,country:e.country,offset:e.offset,tz:e.tz}),l(),n()),m("searchCityModal",0)}},g=()=>{n(),f(""),p()};export{y as CD,a as busSend,f as fC,v as handlePins,n as iWC,g as initWorld,p as requestPins,w as uWCT,h as worldActions};
