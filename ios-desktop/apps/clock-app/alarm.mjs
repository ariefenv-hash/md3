// ==================== clock-app/alarm.mjs — 闹钟/响铃域（v9.39 · #160 二期五文件拆分） ====================
// 纯逻辑在 js/clock-core.js（nextAlarmDate/alarmRingsThisMinute vitest 锚，v9.38 一期下沉）；
// 本模块只做 DOM/音频桥接：响铃引擎（playRing/sR/dR）、闹钟列表渲染（rA/uNH）、
// 表盘编辑器（rCD/uDH + dial 拖拽）。共享工具与音频层从 ./app.mjs 导入（v9.05 #152 多文件范式）。
// 循环导入纪律：本模块顶层零 DOM/共享状态副作用（window.__clock* 挂载除外，仅依赖本模块闭包），
// DOM 初始化统一由 app.mjs 启动序列调用 initAlarmEditor()（规避 ESM 循环求值 TDZ）。
import { $, pad, W, render, toggleModal, formatDays, bindDrag, A, save, getAudioCtx, getMainGain } from './app.mjs';

let customAudio=null,ringLoop=0,ringInt=null;
/* v9.40 #158 加分项：渐强会话状态（RingtonePlaybackDelegate.mCrescendoDuration/mCrescendoStopTime 同名语义）——
   sR 读 A.crescendoSeconds（SettingsDAO.getAlarmCrescendoDuration 默认 "0"=关闭逐字）>0 时落 stopTime；
   dR 双清零（stop() L363-364 语义）；playRing 每振荡器以 computeVolume 标量乘算（离散音序在触发时取标量
   为等价语义，AOSP 连续 adjustVolume 调度面向 MediaPlayer 连续音频——差异诚实标注）。 */
let ringCrescendoStopTime=0,ringCrescendoDuration=0;
const getAlarmVolumePct=()=>{
  try{
    const v=window.__settingsSoundStore&&typeof window.__settingsSoundStore.get==='function'?window.__settingsSoundStore.get('alarm'):null;
    return (typeof v==='number'&&isFinite(v)&&v>=0&&v<=100)?v:70;
  }catch(e){return 70;}
};
const ringGainFromVolumes=(master,pct)=>Math.max(0,Math.min(1,(typeof master==='number'&&isFinite(master)?master:0.85)*(pct/100)));
window.__clockAlarmVolumePct=getAlarmVolumePct;
window.__clockRingGainFromVolumes=ringGainFromVolumes;

const playRing=(t=A.globalRingtone)=>{
  /* v9.40 #158：响铃标量链 = ringGainFromVolumes(master,alarm) × （in-call ? IN_CALL_VOLUME : crescendo 标量）——
     AsyncRingtonePlayer.startPlayback L332-338 分支逐字：inTelephoneCall→setRingtoneVolume(IN_CALL_VOLUME)；
     else if crescendoDuration>0→setRingtoneVolume(0) 起按 computeVolume（-40dB→0dB 对数）推进。
     md3 无 AudioManager 实时信号源：phoneMode 由调试面 window.__clockPhoneMode 注入（缺省 '' 恒 false）。 */
  const k=ringGainFromVolumes(A.masterVolume,getAlarmVolumePct());
  const inCall=window.__clockCore.isInTelephoneCall(window.__clockPhoneMode||'');
  let vol=k;
  if(inCall){vol=k*window.__clockCore.IN_CALL_VOLUME;}
  else if(ringCrescendoStopTime>0){vol=k*window.__clockCore.computeVolume(Date.now(),ringCrescendoStopTime,ringCrescendoDuration);}
  if(window.__clockCrescendoProbeCapture)window.__clockCrescendoProbeCapture(vol);
  if(t==='custom'&&customAudio){customAudio.currentTime=0;customAudio.volume=vol;customAudio.play();return;}
  const c=getAudioCtx(),freqs=t==='urgent'?[880,1174.66,880,1174.66]:[261.63,329.63,392.00,523.25];
  freqs.forEach((f,i)=>{
    const o=c.createOscillator(),g=c.createGain(),n=c.currentTime+i*(t==='urgent'?.12:.15),dur=t==='urgent'?.08:.75;
    o.type=t==='urgent'?'square':'sine';o.frequency.setValueAtTime(f,n);g.gain.setValueAtTime((t==='urgent'?.25:.01)*vol,n);
    if(t!=='urgent')g.gain.linearRampToValueAtTime(.28*vol,n+.1);
    g.gain.exponentialRampToValueAtTime(.0001,n+dur);
    o.connect(g);g.connect(getMainGain());o.start(n);o.stop(n+dur);
  });
};
const sR=(t,s)=>{
  /* v9.40 #158：响铃会话渐强启动（AlarmKlaxon.start L56-57 传入链 + startPlayback L338-342：
     crescendoDuration>0 → setRingtoneVolume(0) 起 + stopTime=now+duration；默认 "0"=关闭逐字） */
  const cs=Number(A.crescendoSeconds)||0;
  if(cs>0){ringCrescendoDuration=cs*1000;ringCrescendoStopTime=Date.now()+ringCrescendoDuration;}
  else{ringCrescendoStopTime=0;ringCrescendoDuration=0;}
  $('ringTitle').innerText=t;$('ringSubtitle').innerText=s;toggleModal('ringingModal',1);ringLoop=1;playRing();ringInt=setInterval(()=>{if(ringLoop)playRing()},2200);
};
const dR=()=>{ringLoop=0;ringCrescendoStopTime=0;ringCrescendoDuration=0;if(ringInt)clearInterval(ringInt);if(customAudio)customAudio.pause();toggleModal('ringingModal',0);};
const teardownAlarm=()=>{try{if(ringInt)clearInterval(ringInt)}catch(_){ }};

const uNH=()=>{
  const act=A.alarms.filter(a=>a.active);
  if(!act.length){$('nextAlarmDisplay').innerText='未开启闹钟';$('nextAlarmDetail').innerText='—';$('worldNextAlarm').innerText='无响铃';return;}
  /* v9.38 #160：下次响铃计算下沉 clock-core.nextAlarmDate（provider/Alarm.java getNextAlarmTime L375-400
     四步逐字：今日同时刻→过期+1天→distanceToNextDay 0-6天→DST 重设时分）；旧实现为 for i<8 天扫描 */
  const now=new Date();let minDiff=Infinity,nextA=null,nextD=null;
  act.forEach(a=>{
    const c=window.__clockCore.nextAlarmDate(a,now);
    if(c>now){const diff=c-now;if(diff<minDiff){minDiff=diff;nextA=a;nextD=c;}}
  });
  if(nextA&&nextD){
    const dStr=formatDays(nextA.days),tTxt=(nextA.isPm?'下午 ':'上午 ')+pad(nextA.hour)+':'+pad(nextA.minute);
    $('nextAlarmDisplay').innerText=tTxt;
    const dH=Math.floor(minDiff/36e5),dM=Math.floor((minDiff%36e5)/6e4);
    $('nextAlarmDetail').innerText=(nextA.label||'闹钟')+' · '+dStr+' ('+(dH>0?`${dH}小时${dM}分钟后响铃`:`${dM}分钟后响铃`)+')';
    $('worldNextAlarm').innerText='周'+W[nextD.getDay()]+' '+tTxt;
  }else{$('nextAlarmDisplay').innerText='未开启闹钟';$('nextAlarmDetail').innerText='—';$('worldNextAlarm').innerText='无响铃';}
};

const rA=()=>{
  /* v8.49（#11）Google Clock 8.1 M3E：激活闹钟=整卡背景高亮（.active-style，替代开关+加粗方案）；
     卡上开关/内联展开面板退役——点卡片上滑 sheet 编辑（#alarmSheet）。 */
  render($('alarmList'), A.alarms, a=>`
    <div class="alarm-card-wrapper ${a.active?'active-style':''}" data-alarm-id="${a.id}" data-act="open-alarm-sheet">
      <div class="alarm-card-header fb">
        <div>
          <div class="alarm-repeat-label sub-txt" style="margin-bottom:6px;opacity:.85">${formatDays(a.days)}</div>
          <div class="alarm-time"><span style="font-size:18px;margin-right:4px">${a.isPm?'下午':'上午'}</span>${pad(a.hour)}:${pad(a.minute)}</div>
          <div class="sub-txt" style="margin-top:4px">${a.label||'闹钟'}</div>
        </div>
        <span class="material-symbols-outlined sub-txt" style="font-size:24px">edit</span>
      </div>
    </div>
  `);
  uNH();
};

/* ---------------- 表盘编辑器（原 index.html L439-462 域内迁移，行为逐字不变） ---------------- */
let editingAlarmId=null,pm='hours',sH=8,sM=0,isPm=0;
const sPM=m=>{pm=m;$('boxHour').classList.toggle('active',m==='hours');$('boxMinute').classList.toggle('active',m==='minutes');rCD();};
const sAP=p=>{isPm=p;$('btnAm').classList.toggle('active',!p);$('btnPm').classList.toggle('active',!!p);};
const rCD=()=>{
  const d=$('clockDial');d.querySelectorAll('.dial-number-item').forEach(n=>n.remove());const isH=pm==='hours';
  for(let i=1;i<=12;i++){
    const v=isH?i:(i===12?0:i*5),n=document.createElement('div');
    n.className='dial-number-item'+((isH?sH===i:(i===12?0:i*5)===sM)?' active':'');n.innerText=isH?i:pad(v);
    const a=(i*30-90)*Math.PI/180;n.style.left=(110+78*Math.cos(a))+'px';n.style.top=(110+78*Math.sin(a))+'px';d.appendChild(n);
  }
  uDH();
};
const uDH=()=>{
  const isH=pm==='hours';$('dialHandLine').style.transform='rotate('+((isH?sH:sM/5)*30)+'deg)';
  $('clockDial').querySelectorAll('.dial-number-item').forEach((item,idx)=>{const i=idx+1;item.classList.toggle('active',isH?i===sH:(Math.abs(((i===12)?0:i*5)-sM)<2.5||(i===12&&sM>=58)));});
};
const initAlarmEditor=()=>{
  const d=$('clockDial');if(!d)return;
  const mv=(x,y)=>{
    const r=d.getBoundingClientRect();let deg=Math.atan2(y-(r.top+110),x-(r.left+110))*180/Math.PI+90;if(deg<0)deg+=360;
    if(pm==='hours'){sH=Math.round(deg/30)||12;$('boxHour').innerText=pad(sH);}else{let m=Math.round(deg/6);if(m===60)m=0;sM=m;$('boxMinute').innerText=pad(sM);}uDH();
  };
  bindDrag(d,e=>mv(e.clientX,e.clientY),()=>{if(pm==='hours')setTimeout(()=>sPM('minutes'),150);});
};

/* ---------------- 响铃分钟判定（原 tick 闹钟段 L923-931 域内迁移） ---------------- */
let lastRungMinuteStr="";
const alarmTick=(n,h,m,ap,h12)=>{
  const currentKey=`${n.getDate()}_${h}_${m}`;
  if(currentKey!==lastRungMinuteStr){
    /* v9.38 #160：响铃分钟判定下沉 clock-core.alarmRingsThisMinute（hour24+minute+days 域判定） */
    A.alarms.forEach(a=>{
      if(window.__clockCore.alarmRingsThisMinute(a,n)){
        lastRungMinuteStr=currentKey;sR(a.label||'闹钟响铃',ap+' '+h12+':'+pad(m));if(!a.days.length){a.active=0;save();rA();}
      }
    });
  }
};

/* 自定义铃声文件装载（原 change 事件 ringtone 分支 L833-835 域内迁移；customAudio 为本域状态） */
const onCustomRingtone=f=>{
  customAudio=new Audio(URL.createObjectURL(f));$('customRingtoneOption').disabled=0;$('globalRingtoneSelect').value='custom';A.globalRingtone='custom';save();
};

/* ---------------- 本域 ACTIONS 子表（app.mjs 合并分发，v9.39 #160 二期拆分） ---------------- */
export const alarmActions={
  'snooze': () => { dR(); setTimeout(()=>sR('稍后提醒','10分钟Snooze时间到'),6e5); },
  'dismiss-ring': dR,
  'open-alarm-picker': () => {
    editingAlarmId=null;sH=8;sM=0;isPm=0;$('pickerTitle').innerText='新建闹钟';
    $('boxHour').innerText=pad(sH);$('boxMinute').innerText=pad(sM);sAP(isPm);$('alarmLabelInput').value='';sPM('hours');
    toggleModal('pickerModal', 1);
  },
  'save-alarm': () => {
    const lbl=$('alarmLabelInput').value.trim()||'闹钟';
    if(editingAlarmId){const a=A.alarms.find(x=>x.id===editingAlarmId);if(a)Object.assign(a,{hour:sH,minute:sM,isPm,label:lbl});}
    else{A.alarms.push({id:Date.now(),hour:sH,minute:sM,isPm,active:1,expanded:false,label:lbl,days:[1,2,3,4,5],vibrate:true});}
    save();rA();toggleModal('pickerModal', 0);$('alarmLabelInput').value='';
  },
  /* v8.49（#11）sheet 编辑器语义（Google Clock 8.1：点卡片上滑 sheet；卡上开关与内联展开退役）。
     sheet 家族 alarm 查找统一锚 #sheetBody[data-alarm-id]；天数/振动改动即存即刷卡片层（rA）。 */
  'open-alarm-sheet': t => {
    const a=A.alarms.find(x=>x.id==t.dataset.alarmId);
    if(!a)return;
    $('sheetBody').dataset.alarmId=a.id;
    $('sheetTime').innerText=(a.isPm?'下午 ':'上午 ')+pad(a.hour)+':'+pad(a.minute);
    $('sheetLabel').innerText=a.label||'闹钟';
    render($('sheetDays'), W, (d,i)=>`<div class="day-pill ${a.days.includes(i)?'active':''}" data-act="toggle-day" data-day="${i}">${d}</div>`);
    $('sheetBody').querySelector('input[data-act="toggle-vib"]').checked=a.vibrate!==false;
    toggleModal('alarmSheet', 1);
  },
  'close-sheet': () => toggleModal('alarmSheet', 0),
  'toggle-day': t => {
    const a=A.alarms.find(x=>x.id==$('sheetBody').dataset.alarmId);
    if(a){
      const day=Number(t.dataset.day),p=a.days.indexOf(day);p>-1?a.days.splice(p,1):a.days.push(day);save();
      $('sheetDays').querySelectorAll('.day-pill').forEach((pEl,i)=>pEl.classList.toggle('active',a.days.includes(i)));
      rA();
    }
  },
  'toggle-vib': t => {
    const a=A.alarms.find(x=>x.id==$('sheetBody').dataset.alarmId);
    if(a){a.vibrate=t.checked;save();}
  },
  'edit-alarm': () => {
    const id=Number($('sheetBody').dataset.alarmId),a=A.alarms.find(x=>x.id===id);
    if(a){
      toggleModal('alarmSheet', 0);
      editingAlarmId=id;sH=a.hour;sM=a.minute;isPm=a.isPm;$('pickerTitle').innerText='编辑闹钟';
      $('boxHour').innerText=pad(sH);$('boxMinute').innerText=pad(sM);sAP(isPm);$('alarmLabelInput').value=a.label||'';sPM('hours');
      toggleModal('pickerModal', 1);
    }
  },
  'del-alarm': () => {
    const id=Number($('sheetBody').dataset.alarmId);
    A.alarms=A.alarms.filter(x=>x.id!==id);save();rA();
    toggleModal('alarmSheet', 0);
  },
  'set-picker-mode': t => sPM(t.dataset.mode),
  'set-ampm': t => sAP(Number(t.dataset.val)),
  'test-ringtone': () => {
    playRing(A.globalRingtone);const ic=$('testRingtoneIcon');ic.innerText='volume_up';setTimeout(()=>ic.innerText='play_arrow',1200);
  }
};

export { playRing, sR, dR, rA, uNH, alarmTick, initAlarmEditor, teardownAlarm, onCustomRingtone, getAlarmVolumePct, ringGainFromVolumes };

/* v9.40 #158 调试面（无头观测钩子）：渐强会话状态 + 标量捕获器 + 响铃会话直通触发（e2e 直测） */
window.__clockCrescendoProbe = () => ({ stopTime: ringCrescendoStopTime, duration: ringCrescendoDuration });
window.__clockCrescendoProbeCapture = null;
window.__clockTestRing = (t, s) => sR(t, s);
