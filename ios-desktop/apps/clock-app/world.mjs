// ==================== clock-app/world.mjs — 世界时钟域（v9.39 · #160 二期五文件拆分） ====================
// 时区换算纯逻辑在 js/clock-core.js worldClockInfo（v9.38 一期下沉，City.getTimeZone() 语义）；
// 本模块只做 DOM/总线桥接：城市列表渲染（iWC/uWCT）、城市搜索（fC）、桌面钉选总线（pinnedSet/busSend）。
// 共享工具从 ./app.mjs 导入（v9.05 #152 多文件范式）；顶层零 DOM 副作用，initWorld() 由 app.mjs 调用。
import { $, render, pad, toggleModal, A, save } from './app.mjs';

/* v9.38 #160：CD 表补 tz（IANA 时区名）——City.getTimeZone() L71 语义：世界时钟=DNS 时区库承载 DST。
   预置城市带 tz 走 Intl.DateTimeFormat（DST 正确）；存量 localStorage 城市无 tz 由 clock-core 固定偏移公式回落。 */
export const CD=[{name:'北京',country:'中国',offset:8,tz:'Asia/Shanghai'},{name:'东京',country:'日本',offset:9,tz:'Asia/Tokyo'},{name:'悉尼',country:'澳大利亚',offset:10,tz:'Australia/Sydney'},{name:'伦敦',country:'英国',offset:0,tz:'Europe/London'},{name:'纽约',country:'美国',offset:-5,tz:'America/New_York'}];

const iWC=()=>{
  const l=$('worldCityList');
  if(!A.worldCities.length){l.innerHTML='<div class="sub-txt" style="text-align:center;padding:80px 20px;font-size:18px">无地点</div>';return;}
  render(l, A.worldCities, c=>`
    <div class="city-card fb" data-city-id="${c.id}">
      <div>
        <div class="fc g-6" style="font-size:17px;font-weight:500"><span>${c.name}</span><span class="city-sun-icon"><span class="material-symbols-outlined" style="font-size:18px">light_mode</span></span></div>
        <div class="sub-txt" style="margin-top:2px">${c.isLocal?'本地时间':c.country+' · 时差 '+(c.offset>=0?'+':'')+c.offset+'h'}</div>
      </div>
      <div class="fc g-12">
        <div class="city-time-num" style="font-size:22px">--:--</div>
        ${c.isLocal?'':'<span class="material-symbols-outlined" data-act="toggle-pin" data-id="'+c.id+'" title="钉到桌面 At a Glance" style="cursor:pointer;font-size:20px;'+(pinnedSet.has(c.id)?'color:var(--acc);':'color:inherit;opacity:.5')+'">push_pin</span>'}
        ${c.isLocal?'':'<span class="material-symbols-outlined sub-txt" style="cursor:pointer;font-size:20px" data-act="remove-city" data-id="'+c.id+'">close</span>'}
      </div>
    </div>
  `);
};

const uWCT=()=>{
  A.worldCities.forEach(c=>{
    const el=document.querySelector('[data-city-id="'+c.id+'"]');if(!el)return;
    /* v9.38 #160：世界时钟下沉 clock-core.worldClockInfo——City.getTimeZone() 语义：
       有 tz（IANA）走 Intl.DateTimeFormat（DST 正确，修 :484 固定偏移真实 bug：伦敦 7 月错 1 小时）；
       存量无 tz 城市回落旧固定偏移公式（clock-core 内逐字保留） */
    const info=window.__clockCore.worldClockInfo(new Date(),c);if(!info)return;
    el.querySelector('.city-sun-icon').innerHTML='<span class="material-symbols-outlined" style="font-size:18px">'+(info.isDay?'light_mode':'dark_mode')+'</span>';
    el.querySelector('.city-time-num').innerText=info.dayPeriod+' '+info.hour12+':'+pad(info.minute);
  });
};

// ---- 世界时钟城市钉选（走桌面应用总线，桌面侧收货方见 js/at-a-glance.js）----
// 点击城市卡片图钉 → BUS_EMIT clock/pin-city / clock/unpin-city；
// 时钟加载时发 clock/request-pins，桌面回发 clock/pins（BUS_DELIVER）回填勾亮态；
// 桌面侧取消钉选也会以 clock/pins 广播同步过来。
let pinnedSet = new Set();
const busSend=(event, payload)=>{
  try { if (window.__system) { window.__system.emit(event, payload); return; } } catch (e) {}
  try { window.parent.postMessage({ type: 'BUS_EMIT', event: event, payload: payload }, '*'); } catch (e) {}
};
const requestPins=()=>{ busSend('clock/request-pins', null); };

const fC=v=>{
  const matches=CD.filter(c=>c.name.includes(v)||c.country.includes(v));
  render($('citySearchResults'), matches, c=>`
    <div style="padding:16px 24px;border-bottom:1px solid var(--ss);cursor:pointer" data-act="select-city" data-name="${c.name}">
      <div style="font-size:16px;font-weight:500">${c.name}</div>
      <div class="sub-txt">${c.country}</div>
    </div>
  `);
};

/* 总线回填（原 message 监听 clock/pins 分支 L960-963 域内迁移） */
const handlePins=pins=>{
  pinnedSet = new Set((pins || []).map(p => p.id));
  iWC();
};

/* ---------------- 本域 ACTIONS 子表（app.mjs 合并分发，v9.39 #160 二期拆分） ---------------- */
export const worldActions={
  'remove-city': t => { A.worldCities=A.worldCities.filter(x=>x.id!==t.dataset.id);save();iWC(); },
  'toggle-pin': t => {
    const c = A.worldCities.find(x => x.id === t.dataset.id);
    if (!c) return;
    if (pinnedSet.has(c.id)) { pinnedSet.delete(c.id); busSend('clock/unpin-city', { id: c.id }); }
    else { pinnedSet.add(c.id); busSend('clock/pin-city', { id: c.id, name: c.name, country: c.country, offset: c.offset, tz: c.tz }); }
    iWC();
  },
  'select-city': t => {
    const name=t.dataset.name,c=CD.find(x=>x.name===name);
    if(c&&!A.worldCities.some(x=>x.name===c.name)){A.worldCities.push({id:'c_'+Date.now(),name:c.name,country:c.country,offset:c.offset,tz:c.tz});save();iWC();}
    toggleModal('searchCityModal',0);
  }
};

export const initWorld=()=>{ iWC(); fC(''); requestPins(); };
export { iWC, uWCT, fC, busSend, requestPins, handlePins };
