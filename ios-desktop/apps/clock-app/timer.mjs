// ==================== clock-app/timer.mjs — 计时器域（v9.39 · #160 二期五文件拆分） ====================
// Timer 不可变状态机在 js/clock-core.js（data/Timer.java 逐字，v9.38 一期下沉）；
// 本模块只做 DOM 桥接：timers[] 容器、键盘（pK/ki）、卡片创建（aTC）、tick 到期推进（timersTick）。
// 共享工具从 ./app.mjs 导入；响铃浮层 sR 从 ./alarm.mjs 横向导入（无环：alarm 不依赖 timer）。
// 顶层零 DOM 副作用，深链入口 startFromDeepLink(sec) 由 app.mjs message 监听分发。
import { $, pad } from './app.mjs';
import { sR } from './alarm.mjs';
import { pickTimerRingtone, readAudioResourceMode } from '../../js/aosp/alarm-ringtone.js'; /* v9.94 #158：计时器到期音源单源（AOSP DeskClock timer_expire.ogg；synth 模式沿旧轨） */
const armStore={ getItem:(k)=>{ try{return window.localStorage.getItem(k);}catch(_){return null;} } }; /* 统一回退开关 store（#158/#161 共用键） */

/* v9.38 #160：timers[] 升格为 clock-core.Timer 不可变状态机容器 {id,totalSeconds,t}
   （data/Timer.java 逐字：五态 RUNNING/PAUSED/EXPIRED/RESET/MISSED——MISSED Web 无通知语义不触发；
   剩余时间=deadline 绝对时基语义，修旧 remaining-- 每秒递减的后台节流漂移） */
let timers=[],ki="";
const showTK=()=>{$('timerKeypadOverlay').style.display='flex';$('timersListContainer').style.display='none';$('timerAddFab').style.display='none';};
const hideTK=()=>{$('timerKeypadOverlay').style.display='none';$('timersListContainer').style.display='';const has=timers.length>0;$('timersListContainer').classList.toggle('has-timers',has);$('timerAddFab').style.display=has?'flex':'none';};
const pK=k=>{
  if(k==='back')ki=ki.slice(0,-1);else if(!(ki===""&&(k==="0"||k==="00"))&&ki.length+k.length<=6)ki+=k;
  const p=ki.padStart(6,'0');
  /* v11.50 #330：三列显示写入（#timerDigits 三列 .timer-setup-num[data-ts] 结构，gastown_timer_display_view） */
  const dh=document.querySelector('#timerDigits [data-ts="h"]'),dm=document.querySelector('#timerDigits [data-ts="m"]'),ds=document.querySelector('#timerDigits [data-ts="s"]');
  if(dh)dh.innerText=p.slice(0,2);if(dm)dm.innerText=p.slice(2,4);if(ds)ds.innerText=p.slice(4,6);
  const act=parseInt(p,10)>0;$('timerStartBtn').style.background=act?'var(--acc)':'var(--gb)';$('timerStartBtn').style.color=act?'var(--md-on-primary)':'var(--md-on-surface-variant)';
};
const fTD=s=>{const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return h>0?pad(h)+':'+pad(m)+':'+pad(sec):m>0?m+':'+pad(sec):String(sec);};
const aTC=ts=>{
  const o={id:Date.now()+'_'+Math.random().toString(36).substr(2,4),totalSeconds:ts,t:window.__clockCore.Timer.create('',ts*1000).start(Date.now())};
  const c=document.createElement('div');c.className='timer-card';c.id='timer-card-'+o.id;
  /* v11.50 #330 Gastown 9.3 运行卡（gastown_timer_card）：label 16sp 左上 / delete 右上 48dp 圆钮 /
     环形进度居中（track 12px 圆角端点，trackColor=colorOutlineVariant、indicatorColor=colorPrimary）/
     倒计时内嵌环心（GastownTimerCountdownTextStyle 系 tnum）/ 底部圆钮组：reset 与 +1分
     （cornerRadius 512dp→48dp 圆、bg colorSurfaceContainerHighest）+ play/pause 56dp 主钮 */
  const CIRC=2*Math.PI*118,DASH=CIRC.toFixed(1);
  c.innerHTML='<div class="fb" style="align-items:flex-start"><span class="timer-card-label" style="flex:1">'+fTD(ts)+'的定时器</span><button class="timer-round-btn" data-act="del-timer" data-id="'+o.id+'" aria-label="删除该定时器"><span class="material-symbols-outlined">close</span></button></div><div class="timer-ring-box fc" style="margin-top:12px"><svg class="timer-circle-svg" viewBox="0 0 260 260"><circle class="timer-circle-bg" cx="130" cy="130" r="118" stroke-width="12"></circle><circle class="timer-circle-prog" id="prog-'+o.id+'" cx="130" cy="130" r="118" stroke-width="12" stroke-dasharray="'+DASH+'" stroke-dashoffset="0"></circle></svg><div class="fc" style="position:absolute;inset:0;flex-direction:column"><div class="timer-ring-num gastown-time-var" id="num-'+o.id+'">'+fTD(ts)+'</div></div></div><div class="fb" style="margin-top:16px;gap:24px;justify-content:center;align-items:center"><button class="timer-round-btn ripple-active" data-act="reset-timer" data-id="'+o.id+'" aria-label="重置该定时器"><span class="material-symbols-outlined">refresh</span></button><button class="timer-pp-btn ripple-active" id="btn-pp-'+o.id+'" data-act="toggle-timer" data-id="'+o.id+'" aria-label="暂停或继续该定时器"><span class="material-symbols-outlined">pause</span></button><button class="timer-round-btn ripple-active" data-act="add-minute" data-id="'+o.id+'" aria-label="增加一分钟" style="font-size:15px">+1分</button></div>';
  $('timersListContainer').appendChild(c);timers.push(o);
  const pe=document.getElementById('prog-'+o.id);if(pe)pe._circ=CIRC;
};

/* tick 计时器推进段（原 index.html tick L906-921 域内迁移；deadline 绝对时基语义不变） */
const timersTick=()=>{
  timers.forEach(t=>{
    const rem=t.t.getRemainingTime(Date.now());
    const numEl=$('num-'+t.id), progEl=$('prog-'+t.id);
    if(t.t.isRunning() && rem <= 0){
      t.t=t.t.expire(Date.now());
      if(numEl) numEl.innerText='0';
      if(progEl) progEl.style.strokeDashoffset=String(progEl._circ||377);
      $('btn-pp-'+t.id).innerHTML='<span class="material-symbols-outlined" style="font-size:30px">play_arrow</span>';
      sR('计时器到期', fTD(t.totalSeconds)+' 定时完成', { ringtone: pickTimerRingtone(readAudioResourceMode(armStore)) }); /* v9.94 #158：AOSP 双播放器语义（TimerStream 独立 timer_expire.ogg；synth 强制时沿旧轨；失败回落/静默由资产轨分叉统一处置） */
    } else if(t.t.isRunning()){
      const sec=Math.ceil(rem/1000);
      if(numEl) numEl.innerText=fTD(sec);
      const CIRC2=progEl&&progEl._circ?progEl._circ:377;
      if(progEl) progEl.style.strokeDashoffset=String(CIRC2-(Math.max(0,rem)/t.t.totalLength)*CIRC2);
    }
  });
};

/* v7.19 深链动作（原 message 监听 timer/start 分支 L966-972 域内迁移） */
const startFromDeepLink=sec=>{
  try { const navBtn = document.querySelector('.nav-item[data-tab="Timer"]'); if (navBtn) navBtn.click(); } catch (_) {}
  aTC(sec); ki = ''; pK(''); hideTK();
};

/* ---------------- 本域 ACTIONS 子表（app.mjs 合并分发，v9.39 #160 二期拆分） ---------------- */
export const timerActions={
  'key': t => pK(t.dataset.val),
  /* v11.50 #330：预设格直建计时器（core_time_preset_view 点击语义；取值集 dex 未取证=诚实标注） */
  'timer-preset': t => { const sec=parseInt(t.dataset.sec,10)||0; if(sec>0){aTC(sec); hideTK();} },
  'open-keypad': showTK,
  'close-keypad': () => { if(timers.length)hideTK(); else{ki="";pK('');} },
  'create-timer': () => {
    const p=ki.padStart(6,'0'),ts=parseInt(p.slice(0,2),10)*3600+parseInt(p.slice(2,4),10)*60+parseInt(p.slice(4,6),10);
    if(ts>0){aTC(ts);ki="";pK('');hideTK();}
  },
  /* v9.38 #160：计时器三操作走 clock-core.Timer 逐字转换（pause/start/reset/addMinute）；
     EXPIRED 态 toggle = reset().start()（Timer.pause L185-186 EXPIRED→reset 语义的 UI 等价重开） */
  'toggle-timer': t => {
    const tm=timers.find(x=>x.id===t.dataset.id);
    if(tm){
      tm.t=tm.t.isExpired()?tm.t.reset().start(Date.now()):(tm.t.isRunning()?tm.t.pause(Date.now()):tm.t.start(Date.now()));
      $('btn-pp-'+tm.id).innerHTML='<span class="material-symbols-outlined" style="font-size:30px">'+(tm.t.isRunning()?'pause':'play_arrow')+'</span>';
    }
  },
  'reset-timer': t => {
    const tm=timers.find(x=>x.id===t.dataset.id);
    if(tm){
      tm.t=tm.t.reset().start(Date.now());$('num-'+tm.id).innerText=fTD(tm.t.length/1000);
      const pe2=document.getElementById('prog-'+tm.id);if(pe2)pe2.style.strokeDashoffset='0';$('btn-pp-'+tm.id).innerHTML='<span class="material-symbols-outlined" style="font-size:30px">pause</span>';
    }
  },
  'add-minute': t => {
    const tm=timers.find(x=>x.id===t.dataset.id);
    if(tm){tm.t=tm.t.addMinute(Date.now());tm.totalSeconds=tm.t.totalLength/1000;$('num-'+tm.id).innerText=fTD(Math.max(0,Math.ceil(tm.t.getRemainingTime(Date.now())/1000)));}
  },
  'del-timer': t => {
    const idx=timers.findIndex(x=>x.id===t.dataset.id);
    if(idx!==-1){timers.splice(idx,1);}
    const card=$('timer-card-'+t.dataset.id);if(card)card.remove();
    if(!timers.length)showTK();
  }
};

export { showTK, hideTK, pK, fTD, aTC, timersTick, startFromDeepLink };

/* v9.94 #158 调试面：tick 直通钩子（无头 rAF 节流坑规避——e2e 同步驱动到期推进，v158-crescendo 同款纪律） */
window.__clockTimerTickProbe = timersTick;
