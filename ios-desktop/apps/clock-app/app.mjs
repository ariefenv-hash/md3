// ==================== clock-app/app.mjs — ESM 入口与组合根（v9.39 · #160 二期五文件拆分） ====================
// v9.05 #152 多文件形态约定：由 index.html 以 <script type="module" src="./app.mjs"> 引入；
// 五个功能域模块 alarm/world/timer/stopwatch/bedtime.mjs 以相对路径 import（构建期 esbuild
// 原样保留相对路径，dist 结构不变）。纯逻辑在 js/clock-core.js（#138 ../../js 扫描通道，
// v9.38 一期下沉 37 断言锚）；字体域/视图接线/tick 主循环/生命周期留在本模块。
// 循环导入纪律（#194 同源坑规避）：本模块顶层「先 import 后定义」，五域模块顶层零 DOM/共享状态
// 副作用，DOM 初始化统一由底部启动序列调用（initAlarmEditor/initWorld/initBedtime）。
import { alarmActions, rA, alarmTick, initAlarmEditor, teardownAlarm, onCustomRingtone } from './alarm.mjs';
import { worldActions, uWCT, fC, initWorld, handlePins } from './world.mjs';
import { timerActions, timersTick, startFromDeepLink } from './timer.mjs';
import { swActions, stopwatchTick } from './stopwatch.mjs';
import { bedActions, onFadeChange, initBedtime, bedtimeTick, onBedtimeTimeChange } from './bedtime.mjs';

/* ---------------- 共享工具（原 index.html L303-306） ---------------- */
const $=id=>document.getElementById(id),$$=s=>document.querySelectorAll(s),pad=n=>String(n).padStart(2,'0'),W=['日','一','二','三','四','五','六'];
const render=(el,list,fn)=>{el.innerHTML=list.map(fn).join('');};
const toggleModal=(id,show)=>{const el=$(id);if(show)el.showModal?el.showModal():el.setAttribute('open','');else el.close?el.close():el.removeAttribute('open');};
const formatDays=d=>d.length===7?'每天':d.length===5&&![0,6].some(x=>d.includes(x))?'工作日':!d.length?'仅一次':d.map(x=>W[x]).join(' ');
const bindDrag=(el,onMove,onEnd)=>{let a=!1;el.onpointerdown=e=>{a=!0;try{el.setPointerCapture(e.pointerId)}catch(err){}onMove(e);};el.onpointermove=e=>a&&onMove(e);const end=e=>{if(a){a=!1;try{el.releasePointerCapture(e.pointerId)}catch(err){}onEnd&&onEnd(e);}};el.onpointerup=el.onpointercancel=end;};

/* ---------------- 全局状态（原 L308-310；android_clock_state 存储键不变） ---------------- */
export const A={alarms:[{id:1,hour:9,minute:0,isPm:0,active:1,expanded:false,label:'早起闹钟',days:[0,6],vibrate:true},{id:2,hour:7,minute:30,isPm:0,active:0,expanded:false,label:'工作日闹钟',days:[1,2,3,4,5],vibrate:false}],worldCities:[{id:'beijing',name:'北京',country:'中国',offset:8,isLocal:1}],masterVolume:.85,globalRingtone:'platinum',crescendoSeconds:0,sunriseMinutes:0,bedtime:{enabled:false,bedMin:1380,wakeMin:420,days:[0,1,2,3,4,5,6],notifyMin:15}}; /* v9.41 #157 睡眠时间表：enabled=false 保守初值——首启不自动出声，用户开开关才联动；notifyMin=15 就寝提醒提前量（v9.42 二期）；sunriseMinutes=0 日出渐亮默认关闭（v9.44 三期，AOSP 无此原生默认，诚实标注）；在录 */
try{const s=localStorage.getItem('android_clock_state');if(s)Object.assign(A,JSON.parse(s))}catch(e){}
const save=()=>{try{localStorage.setItem('android_clock_state',JSON.stringify(A))}catch(e){}};

/* ---------------- 音频层（原 L362-371；alarm 响铃与 bedtime 白噪音共用 STREAM_ALARM 语义） ---------------- */
let sharedAudioCtx=null,mainGain=null;
const getAudioCtx=()=>{
  if(!sharedAudioCtx){
    sharedAudioCtx=new(window.AudioContext||window.webkitAudioContext)();
    mainGain=sharedAudioCtx.createGain();mainGain.gain.setValueAtTime(A.masterVolume,sharedAudioCtx.currentTime);
    mainGain.connect(sharedAudioCtx.destination);
  }
  if(sharedAudioCtx.state==='suspended')sharedAudioCtx.resume();
  return sharedAudioCtx;
};
const getMainGain=()=>mainGain;
const getSharedAudioCtx=()=>sharedAudioCtx;

/* ---------------- 开关拖拽（原 L314-360，M3 规格 + 双重翻转守卫，行为逐字不变） ----------------
   v7.39 统一 M3 规格：未拖 16px(left 6) / 选中 24px(left 22)；拖拽中膨胀 28px
   （CSS .thumb.dragging + margin-left:-2px 近似居中），行程 16px（translateX 0~16） */
document.addEventListener('pointerdown',e=>{
  const sw=e.target.closest('.m3-switch');
  if(!sw)return;
  e.preventDefault();e.stopPropagation();
  const input=sw.querySelector('input'),thumb=sw.querySelector('.thumb');
  if(!input||!thumb)return;
  const MAX=16,startX=e.clientX,wasChecked=input.checked;
  let startPos=wasChecked?MAX:0,moved=!1;
  thumb.classList.add('dragging');
  try{sw.setPointerCapture(e.pointerId)}catch(err){}
  const onMove=ev=>{
    const dx=ev.clientX-startX;
    if(Math.abs(dx)>3)moved=!0;
    const pos=Math.max(0,Math.min(MAX,startPos+dx));
    thumb.style.transform='translateY(-50%) translateX('+pos+'px)';
    input.checked=pos>MAX/2;
  };
  const onUp=ev=>{
    thumb.classList.remove('dragging');thumb.style.transform='';
    try{sw.releasePointerCapture(e.pointerId)}catch(err){}
    sw.removeEventListener('pointermove',onMove);
    sw.removeEventListener('pointerup',onUp);
    sw.removeEventListener('pointercancel',onUp);
    if(!moved){input.checked=!wasChecked}
    else{const dx=ev.clientX-startX;input.checked=Math.max(0,Math.min(MAX,startPos+dx))>MAX/2}
    const act=input.dataset.act;
    if(act&&ACTIONS[act])ACTIONS[act](input);
  };
  sw.addEventListener('pointermove',onMove);
  sw.addEventListener('pointerup',onUp);
  sw.addEventListener('pointercancel',onUp);
});

/* v8.45（#81）双重翻转守卫：指针委托已在 onUp 显式置态 checked，但 pointerdown 的
   preventDefault 不抑制合成 click 的 label→input 激活翻转（实测 Chromium click 照常派发），
   同一手势两次相反写入相消——toggle-vib（无重渲染）存储=新值而 UI=旧值（状态↔视觉打架，
   #70 同族新机制）、无 data-act 裸开关点击净零反应。本开关家族 checked 只由指针委托管理
   （input opacity:0/width:0/height:0 无键盘可达路径），document 捕获阶段单点取消 click
   激活默认行为（preventDefault 对 click=不翻转 checkbox，不影响程序化读写）；锚 label 级
   而非 input——slider 与 input 是兄弟节点，closest('.m3-switch input') 会漏 slider 落点 */
document.addEventListener('click',e=>{
  const l=e.target&&e.target.closest?e.target.closest('.m3-switch'):null;
  if(l)e.preventDefault();
},true);

/* ==================== v8.49（#11）大时钟字体上屏（Google Clock 8.1 对标；v9.29 · #188 建议② vendor 化） ====================
   Google Sans Flex（Google Fonts 公开可变字体，Google Clock 新版闭源 Google Sans 的公开对应物）
   仍走外链（体积大，本地兜底 + 失败可见属 #188 建议③留点）；
   AndroidClock/AndroidClock_Solid/Clockopia（RPi-Distro/fonts-android，AOSP KeyguardClockSwitch
   锁屏大字同族）已 vendor 入 assets/fonts/（5116+4824+6880=16820 B=16.8KB，魔数 00010000
   合法 TrueType、均无 fvar 静态字体——#188 第五节实证），零外链（v9.05 约束，#161 vendor 音频
   同路子）：离线可用，FontFace fetch 同源无 CORS 耗时；AndroidClock_Highlight 系锁屏双层
   高亮合成变体、单层场景无意义故不入列。
   存储键 ios-desktop:clock-font-v1 定义为 #20 锁屏表盘/设置侧字体菜单的未来共用键（一处实现
   两处引用）；写入 {id}，缺载/损坏 JSON/未知 id 一律回落 'system'（离线安全）。 */
const CLOCK_FONT_KEY='ios-desktop:clock-font-v1';
const CLOCK_FONTS=[
  {id:'system',label:'系统默认',family:null,url:null,note:'Quicksand 数字链'},
  {id:'gsflex',label:'Google Sans Flex',family:'Google Sans Flex',url:'https://fonts.googleapis.com/css2?family=Google+Sans+Flex&display=swap',css:true,note:'Expressive 官方公开对应物'},
  {id:'aclock',label:'AndroidClock 双线',family:'AndroidClockClockV849',url:'../../assets/fonts/AndroidClock.ttf',note:'AOSP 锁屏大字原版（v9.29 vendor）'},
  {id:'acsolid',label:'AndroidClock 实心',family:'AndroidClockSolidV849',url:'../../assets/fonts/AndroidClock_Solid.ttf',note:'实心变体（v9.29 vendor）'},
  {id:'clockopia',label:'Clockopia 经典',family:'ClockopiaClockV849',url:'../../assets/fonts/Clockopia.ttf',note:'经典 Android 风（v9.29 vendor）'}
];
const parseClockFontPref=()=>{
  try{
    const raw=localStorage.getItem(CLOCK_FONT_KEY);
    if(!raw)return 'system';
    const id=JSON.parse(raw).id;
    return CLOCK_FONTS.some(f=>f.id===id)?id:'system';
  }catch(e){return 'system';}
};
const setClockDigitVar=family=>{
  /* 首跑 e2e 实证缺口（探针 30 帧逐帧换箱）：var 值若为裸 family 或以通用 sans-serif 收尾，
     CDN 字体载入失败（离线）时回落到比例数字字体 → 秒表显示逐帧宽度漂移（实测 .41/.44 差 10px）、
     运行中布局永不稳定。时钟数字的回落链必须以等宽收尾（AOSP Chronometer 表盘数字纪律）：
     'X','Quicksand',ui-monospace,'DejaVu Sans Mono',monospace——在线设备仍首选所选字体。 */
  if(family)document.documentElement.style.setProperty('--clock-digit-font',"'"+family+"','Quicksand',ui-monospace,'DejaVu Sans Mono',monospace");
  else document.documentElement.style.removeProperty('--clock-digit-font');
  $('clockFontNameDisplay').innerText=family?('当前：'+CLOCK_FONTS.find(f=>f.family===family).label):('默认：Quicksand 数字链');
};
const loadClockFontFontFace=f=>new Promise((resolve,reject)=>{
  const done=(ok)=>{try{clearTimeout(tmr)}catch(e){}ok?resolve():reject(new Error('fontfail'));};
  const tmr=setTimeout(()=>done(false),6000);
  try{
    fetch(f.url).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer();}).then(buf=>{
      const ff=new FontFace(f.family,buf);ff.load().then(l=>{document.fonts.add(l);done(true);}).catch(()=>done(false));
    }).catch(()=>done(false));
  }catch(e){done(false);}
});
const applyClockFont=(id,persist)=>{
  const f=CLOCK_FONTS.find(x=>x.id===id)||CLOCK_FONTS[0];
  if(persist!==false){try{localStorage.setItem(CLOCK_FONT_KEY,JSON.stringify({id:f.id}))}catch(e){}}
  if(!f.family){setClockDigitVar(null);}
  else if(f.css){
    /* Google Fonts CSS API 走 <link> 注入（跨域样式表免 FontFace CORS）；字体文件缓存命中时
       本地 @font-face 家族声明仍可渲染（icon-standard-style 同款离线纪律）。
       v9.31 #188 建议③：外链失败可见——link.onerror 先挂后赋 href（防缓存命中瞬间触发漏接），
       失败三件套与建议④同构（存储回滚 system + chip 回退实际生效项 + toast）；离线时 CSS 请求
       即失败可捕获；CSS 成功但内部字体文件失败由 font-display swap 回落链兜底（诚实标注边界）。 */
    let link=document.getElementById('clockFontFlexLink');
    if(!link){link=document.createElement('link');link.id='clockFontFlexLink';link.rel='stylesheet';document.head.appendChild(link);}
    link.onerror=()=>{
      try{localStorage.setItem(CLOCK_FONT_KEY,JSON.stringify({id:'system'}))}catch(e){}
      document.querySelectorAll('#clockFontChips .font-chip').forEach(c=>c.classList.toggle('active',c.dataset.id==='system'));
      showFontToast('「Google Sans Flex」外链加载失败，已回落系统默认（点选可重试）');
    };
    link.href=f.url;
    setClockDigitVar(f.family);
  }else{
    setClockDigitVar(f.family);
    loadClockFontFontFace(f).catch(()=>{
      /* 载入失败保持 var——family 未注册自动回落 --fn 数字链，绝不白屏（纪律不变）；
         v9.30 加餐 #188 建议④：不再静默——存储回滚 system + chip 回退实际生效项 + 轻量 toast。
         存储回滚裁决：chip/存储/实际生效三者一致，离线设备不每次启动重复打扰；点选可重试。 */
      try{localStorage.setItem(CLOCK_FONT_KEY,JSON.stringify({id:'system'}))}catch(e){}
      document.querySelectorAll('#clockFontChips .font-chip').forEach(c=>c.classList.toggle('active',c.dataset.id==='system'));
      showFontToast('「'+f.label+'」加载失败，已回落系统默认（点选可重试）');
    });
  }
  document.querySelectorAll('#clockFontChips .font-chip').forEach(c=>c.classList.toggle('active',c.dataset.id===f.id));
};
const showFontToast=msg=>{
  let t=document.getElementById('fontToast');
  if(!t){t=document.createElement('div');t.id='fontToast';document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('show');
  clearTimeout(showFontToast._tmr);showFontToast._tmr=setTimeout(()=>t.classList.remove('show'),2800);
};
const renderClockFontChips=()=>{
  const cur=parseClockFontPref();
  render($('clockFontChips'), CLOCK_FONTS, f=>`<button class="font-chip ${f.id===cur?'active':''}" data-act="set-clock-font" data-id="${f.id}">${f.label}</button>`);
};

/* ---------------- ACTIONS：五域子表合并 + 本模块视图/设置域（原 L667-799 拆分归位） ---------------- */
const ACTIONS = {
  'nav': t => {
    $('pageTitle').innerText=t.dataset.title;$$('.tab-content').forEach(tc=>tc.classList.remove('active'));
    $('tab'+t.dataset.tab).classList.add('active');$$('.nav-item').forEach(ni=>ni.classList.remove('active','animate-click'));
    t.classList.add('active');void t.offsetWidth;t.classList.add('animate-click');
  },
  'open-modal': t => toggleModal(t.dataset.target, 1),
  'close-modal': t => toggleModal(t.dataset.target, 0),
  'open-saver': () => toggleModal('screensaverModal', 1),
  'close-saver': () => toggleModal('screensaverModal', 0),
  ...alarmActions,
  ...timerActions,
  ...swActions,
  ...bedActions,
  ...worldActions,
  'set-clock-font': t => applyClockFont(t.dataset.id),
  'trigger-file': t => $(t.dataset.target).click(),
  'reset-font': () => {
    document.documentElement.style.removeProperty('--custom-user-font');
    if($('dynamicCustomFontStyle'))$('dynamicCustomFontStyle').remove();
    $('activeFontNameDisplay').innerText='默认：思源宋体+Quicksand圆体';
  },
  'reset-theme': () => {
    document.documentElement.style.removeProperty('--h');
    $('P').style.backgroundImage='none';$('P').classList.remove('has-wallpaper');
  }
};

document.addEventListener('click', e => {
  const target = e.target.closest('[data-act]');
  if(target && ACTIONS[target.dataset.act]) ACTIONS[target.dataset.act](target);
});

document.addEventListener('change', e => {
  const t=e.target;
  if(t.id==='globalRingtoneSelect'){A.globalRingtone=t.value;save();}
  else if(t.id==='crescendoSelect'){A.crescendoSeconds=Number(t.value)||0;save();} /* v9.40 #158 KEY_ALARM_CRESCENDO 对应 */
  else if(t.id==='sunriseSelect'){A.sunriseMinutes=Number(t.value)||0;save();} /* v9.44 #157 三期日出渐亮提前量 */
  else if(t.id==='noiseFadeSelect'){onFadeChange();}
  else if(t.id==='bedtimeBedInput'||t.id==='bedtimeWakeInput'){onBedtimeTimeChange(t);} /* v9.41 #157 就寝/起床时刻变更 */
  else if(t.id==='bedtimeNotifySelect'){if(A.bedtime){A.bedtime.notifyMin=Number(t.value)||0;save();}} /* v9.42 #157 二期就寝提醒提前量 */
  else if(t.dataset.file){
    const f=t.files?.[0]; if(!f) return;
    const type=t.dataset.file;
    if(type==='font'){
      const r=new FileReader();
      r.onload=ev=>{
        const fontName='UserFont_'+Date.now(),st=$('dynamicCustomFontStyle')||document.createElement('style');st.id='dynamicCustomFontStyle';
        st.textContent='@font-face{font-family:\''+fontName+'\';src:url(\''+ev.target.result+'\')}';document.head.appendChild(st);
        document.documentElement.style.setProperty('--custom-user-font',"'"+fontName+"'");$('activeFontNameDisplay').innerText='当前使用自定义字体：'+f.name;
      };r.readAsDataURL(f);
    } else if(type==='wallpaper'){
      const r=new FileReader();
      r.onload=ev=>{
        const img=new Image();img.onload=()=>{
          const c=document.createElement('canvas'),cx=c.getContext('2d');c.width=c.height=40;cx.drawImage(img,0,0,40,40);
          const d=cx.getImageData(0,0,40,40).data;let r=0,g=0,b=0,n=0;
          for(let i=0;i<d.length;i+=16){if(d[i+3]>128){r+=d[i];g+=d[i+1];b+=d[i+2];n++;}}
          r=Math.floor(r/n);g=Math.floor(g/n);b=Math.floor(b/n);
          const h=Math.round(Math.atan2(Math.sqrt(3)*(g-b),2*r-g-b)*180/Math.PI);
          document.documentElement.style.setProperty('--h', h<0?h+360:h);
          $('P').style.backgroundImage='url('+ev.target.result+')';$('P').classList.add('has-wallpaper');
        };img.src=ev.target.result;
      };r.readAsDataURL(f);
    } else if(type==='ringtone'){
      onCustomRingtone(f);
    }
  }
});

document.addEventListener('input', e => {
  if(e.target.id==='citySearchInput') fC(e.target.value);
});

/* ---------------- tick 主循环（原 L894-942；三域 tick 委派各域模块） ---------------- */
const timeFmt = new Intl.DateTimeFormat('zh-CN', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
const dateFmt = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' });

let lastSec=0;
const tick=()=>{
  const n=new Date(),h=n.getHours(),m=n.getMinutes(),ap=h>=12?'下午':'上午',h12=h%12||12;
  const timeTxt=timeFmt.format(n), dateTxt=dateFmt.format(n);
  if($('worldClockTime'))$('worldClockTime').innerText=timeTxt;if($('worldClockDate'))$('worldClockDate').innerText=dateTxt;
  if($('saverDate'))$('saverDate').innerText=dateTxt;if($('saverTime'))$('saverTime').innerText=ap+' '+h12+':'+pad(m);
  if($('ringTimeDisplay'))$('ringTimeDisplay').innerText=ap+' '+h12+':'+pad(m);
  uWCT();
  timersTick();      /* v9.38 #160：Timer 倒计时走 clock-core（deadline 绝对时基），域内迁移 timer.mjs */
  alarmTick(n,h,m,ap,h12); /* 响铃分钟判定走 clock-core.alarmRingsThisMinute，域内迁移 alarm.mjs */
  bedtimeTick(n); /* v9.41 #157 睡眠时段边沿检测：进入自动播放助眠音效/离开自动停止，域内 bedtime.mjs */
};

// 单一 RAF (RequestAnimationFrame) 高能主循环
const mainLoop = (now) => {
  stopwatchTick(); /* v9.38 #160 Stopwatch.getTotalTime，域内迁移 stopwatch.mjs */
  if (Math.floor(now / 1000) !== lastSec) {
    lastSec = Math.floor(now / 1000);
    tick();
  }
  if (!window.__appClosed) requestAnimationFrame(mainLoop);
};

/* ==================== v10.37 #226 要求②：加载顺序契约（入口校验 + 动态补载 + 可见错误态） ====================
   clock-core.js 是经典 IIFE（唯一出口 window.__clockCore；本体保持零 export 不改——v160 F5 纪律，
   经典消费面 index.html L15 byte 不变）。五域模块求值期已零 core 触碰（stopwatch.mjs ensureSw
   v10.37 同窗清零），模块图加载不再依赖经典脚本先行；本契约负责运行时兜底：
   ① core 缺失（404/SW 缓存错配/子路径解析失败/冻结延后）→ loadScript 动态补载一次；
   ② 补载仍失败 → 挂可见错误遮罩（图标+原因+重试钮，绝不白屏绝不静默），启动序列挂起待重试；
   ③ 重试成功 → 移除遮罩并继续完整启动序列（clockStarted 单次守卫防重入）。
   自包含实现（不 import js/clock-core.mjs 门面）：ESM 消费面由 clock-core.mjs 双形态出口提供，
   app 路径保持「五域相对 import + ../../js 经典脚本」既有引用图（verify-dist #138 扫描零变化）。 */
const CLOCK_CORE_SRC='../../js/clock-core.js';
const loadClockCoreScript=()=>new Promise((resolve,reject)=>{
  const s=document.createElement('script');
  s.src=CLOCK_CORE_SRC;
  s.onload=()=>resolve(true);
  s.onerror=()=>reject(new Error('clock-core.js 动态补载失败（404/SW 错配/网络）'));
  document.head.appendChild(s);
});
const ensureClockCore=async()=>{
  if(window.__clockCore)return true;
  try{await loadClockCoreScript();}catch(e){/* 显式失败面交遮罩，不静默崩 */}
  return !!window.__clockCore;
};
const showClockCoreError=()=>{
  if($('clockCoreErrorMask'))return;
  const mask=document.createElement('div');
  mask.id='clockCoreErrorMask';
  mask.style.cssText='position:fixed;inset:0;z-index:9999;background:var(--md-surface);color:var(--m);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center';
  mask.innerHTML='<span class="material-symbols-outlined" style="font-size:44px;color:var(--md-error)">wifi_off</span>'
    +'<div style="font-size:16px;font-weight:600">时钟核心未就绪</div>'
    +'<div class="sub-txt" style="max-width:320px">js/clock-core.js 未能加载（404 / SW 缓存错配 / 网络失败）。闹钟提醒、世界时钟、计时器与秒表暂不可用；重试成功后自动恢复，无需重载页面。</div>'
    +'<button id="clockCoreRetryBtn" style="background:var(--pi);color:var(--pit);border-radius:var(--rp);padding:8px 20px;border:none;cursor:pointer">重试加载</button>';
  document.body.appendChild(mask);
};

/* ---------------- 启动序列（原 L944-950；域初始化统一在此调用；v10.37 #226 收拢为单次守卫函数） ---------------- */
let clockStarted=!1;
const startClockApp=()=>{
  if(clockStarted)return;clockStarted=!0;
  const mb=$('menuBtn'),md=$('menuDropdown');
  mb.onclick=e=>{e.stopPropagation();md.classList.toggle('active');};
  document.onclick=()=>md.classList.remove('active');
  rA();
  initWorld();
  renderClockFontChips();applyClockFont(parseClockFontPref(),false); /* v8.49 #11 大时钟字体启动恢复（persist=false 不回写） */
  { const cs=$('crescendoSelect'); if(cs) cs.value=String(Number(A.crescendoSeconds)||0); } /* v9.40 #158 渐强选项回填 */
  { const gr=$('globalRingtoneSelect'); if(gr) gr.value=A.globalRingtone; } /* v9.94 #158 启动回填（历史缺口顺手修：此前 select 首启恒显首项与 A 值脱钩） */
  { const ss=$('sunriseSelect'); if(ss) ss.value=String(Number(A.sunriseMinutes)||0); } /* v9.44 #157 三期日出选项回填 */
  initAlarmEditor();
  initBedtime();
  if (!window.__appClosed) requestAnimationFrame(mainLoop);
};
const bootClock=async()=>{
  if(await ensureClockCore()){startClockApp();return;}
  showClockCoreError();
  const btn=$('clockCoreRetryBtn');
  if(btn)btn.onclick=async()=>{
    if(await ensureClockCore()){const m=$('clockCoreErrorMask');if(m)m.remove();startClockApp();}
  };
};
bootClock();

// APP_CLOSE 生命周期广播：宿主桌面销毁本实例前通知（见 page-stack.js）
// 停止全局 RAF 主循环与响铃定时器，防止后台实例持续空转造成内存泄漏
window.addEventListener('message', (e) => {
  if (e && e.data && e.data.type === 'APP_CLOSE') {
    window.__appClosed = true;
    teardownAlarm();
  }
  // 总线回填：桌面侧钉选城市列表（request-pins 应答 + 桌面增删时的 pins-changed 广播共用）
  if (e && e.data && e.data.type === 'BUS_DELIVER' && e.data.payload && (e.data.event === 'clock/pins' || e.data.event === 'clock/pins-changed')) {
    handlePins(e.data.payload.pins);
  }
  // v7.19 应用互联 · 深链动作：快捷指令等应用「打开时钟并启动计时」
  // （OPEN_APP 先投递后打开：未启动时由桌面 pending 队列在挂载后补投，此处必先于首帧用户操作就绪）
  if (e && e.data && e.data.type === 'BUS_DELIVER' && e.data.event === 'timer/start' && e.data.payload) {
    const sec = Number(e.data.payload.seconds) || 0;
    if (sec > 0) startFromDeepLink(sec);
  }
});

// ==================== v7.76 今日日程卡：与日历应用同源同步 ====================
// 直读 localStorage calevents_v1（宿主与子应用同源共享）：显示今日全部日程，
// 已过时段淡化、下一个日程高亮并给出倒计时提示；30s 轮询 + 可见性/页签切换即刷。
(function initCalAgenda() {
  const card = document.getElementById('calAgendaCard');
  const listEl = document.getElementById('calAgendaList');
  const openBtn = document.getElementById('agendaOpenCalBtn');
  if (!card || !listEl) return;
  const p2 = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());

  function loadAgenda() {
    let db = {};
    try { db = JSON.parse(localStorage.getItem('calevents_v1') || 'null') || {}; } catch (_) {}
    const now = new Date();
    const todayK = dateKey(now);
    const evs = (Array.isArray(db[todayK]) ? db[todayK] : [])
      .filter((ev) => ev && typeof ev.title === 'string' && ev.title.trim())
      .slice()
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    const nowHm = p2(now.getHours()) + ':' + p2(now.getMinutes());
    /* v9.44 #157 三期：明日日程预览（复用同卡，divider 分隔 + is-tomorrow 弱化） */
    const tmr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tmrK = dateKey(tmr);
    const tevs = (Array.isArray(db[tmrK]) ? db[tmrK] : [])
      .filter((ev) => ev && typeof ev.title === 'string' && ev.title.trim())
      .slice()
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    if (!evs.length && !tevs.length) {
      card.style.display = 'none';
      return;
    }
    card.style.display = 'block';
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let nextMarked = false;
    const item = (ev, tomorrow) => {
      const t = String(ev.time || '--:--');
      let rel = '';
      if (!tomorrow) {
        const past = t !== '--:--' && t < nowHm;
        if (t !== '--:--') {
          if (past) rel = '已结束';
          else {
            const mins = (Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))) - (now.getHours() * 60 + now.getMinutes());
            rel = mins <= 0 ? '即将开始' : (mins >= 60 ? Math.floor(mins / 60) + ' 小时 ' + (mins % 60) + ' 分后' : mins + ' 分钟后');
          }
        }
        const isNext = !past && !nextMarked;
        if (isNext) nextMarked = true;
        return '<div class="cal-agenda-item' + (past ? ' is-past' : '') + (isNext ? ' is-next' : '') + '">' +
          '<span class="cal-agenda-time">' + t + '</span>' +
          '<span class="cal-agenda-title">' + esc(ev.title) + '</span>' +
          (rel ? '<span class="cal-agenda-rel">' + rel + '</span>' : '') +
          '</div>';
      }
      return '<div class="cal-agenda-item is-tomorrow">' +
        '<span class="cal-agenda-time">' + t + '</span>' +
        '<span class="cal-agenda-title">' + esc(ev.title) + '</span>' +
        '</div>';
    };
    listEl.innerHTML =
      (evs.length ? evs.map((ev) => item(ev, false)).join('') : '<div class="cal-agenda-item is-past"><span class="cal-agenda-title">今日暂无日程</span></div>') +
      (tevs.length ? '<div class="cal-agenda-divider">明日 · ' + (tmr.getMonth() + 1) + '月' + tmr.getDate() + '日</div>' + tevs.map((ev) => item(ev, true)).join('') : '');
  }

  if (openBtn) openBtn.addEventListener('click', () => {
    try { window.parent.postMessage({ type: 'BUS_EMIT', event: 'calendar/open', payload: {} }, '*'); } catch (_) {}
  });
  loadAgenda();
  setInterval(loadAgenda, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadAgenda(); });
  // 页签切回闹钟页时即刷（对齐桌面上用户回到该页的时机）
  document.querySelectorAll('.nav-item[data-tab="Alarm"]').forEach((n) => {
    n.addEventListener('click', () => setTimeout(loadAgenda, 60));
  });
})();

// ==================== v7.77 M3E 扩场景：下拉刷新（重读 localStorage 闹钟/世界时钟库，多窗口同步入口；
//     日历日程卡由其自身 30s 轮询 + visibilitychange 通道刷新） ====================
(function () {
  if (!window.__m3ePull) return;
  const vp = document.querySelector('.content-area');
  if (!vp) return;
  window.__m3ePull.attach(vp, {
    restingY: 40,
    onRefresh: () => new Promise((resolve) => {
      try {
        const fresh = JSON.parse(localStorage.getItem('android_clock_state'));
        if (fresh) Object.assign(A, fresh);
        rA();
      } catch (e) {}
      setTimeout(resolve, 420);
    }),
  });
})();

/* ---------------- 五域共享工具统一出口（域模块 ./app.mjs 导入面） ---------------- */
export { $, $$, pad, W, render, toggleModal, formatDays, bindDrag, save, getAudioCtx, getMainGain, getSharedAudioCtx };
