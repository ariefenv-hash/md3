// ==================== clock-app/bedtime.mjs — 睡眠时间域（v9.39 #160 二期五文件拆分 → v9.41 #157 一期改造） ====================
// 助眠音效合成/淡出与音量滑杆（原「白噪音」tab，#157 降为「睡眠时间」卡内助眠音效分区，行为零变化）。
// v9.41 #157 一期新增：睡眠时间表卡片（就寝/起床/重复日/时长）+ 到点自动播放联动（进入睡眠区间
// 自动 playNoise/离开自动 stopNoise，边沿检测每秒 tick 判定；纯逻辑 isBedtimeWindow/
// bedtimeDuration/nextBedtimeDate 在 js/clock-core.js 可单测——Google Clock Bedtime 结构对标，
// AOSP DeskClock 无 Bedtime 标签无权威快照，工程语义以 #157 正文权威结构+用户裁定为准，标注在录）。
// 共享工具与音频层从 ./app.mjs 导入（v9.05 #152 多文件范式）；顶层零 DOM 副作用：
// 滑杆/文件输入/时间表卡片初始化统一由 initBedtime() 执行（app.mjs 启动序列调用）。
import { $, $$, pad, W, render, bindDrag, getAudioCtx, getMainGain, getSharedAudioCtx, A, save } from './app.mjs';

let noiseGain=null,noiseSource=null,noiseLFO=null,noisePlaying=false,noiseType='deep',noiseVol=0.6,noiseCustomAudio=null,noiseFadeTimer=null;
const playNoise=()=>{
  if(noiseType==='custom'&&noiseCustomAudio){noiseCustomAudio.volume=noiseVol;noiseCustomAudio.play();noisePlaying=true;$('noisePlayIcon').innerText='pause';$('noiseStateIcon').innerText='play_circle';$('noiseStateIcon').style.color='var(--md-success)';return;}
  stopNoise();const c=getAudioCtx();
  if(!noiseGain){noiseGain=c.createGain();noiseGain.connect(getMainGain());}
  noiseGain.gain.setValueAtTime(0,c.currentTime);noiseGain.gain.linearRampToValueAtTime(noiseVol,c.currentTime+0.5);
  const buf=c.createBuffer(2,c.sampleRate*(noiseType==='waves'?4:2),c.sampleRate);
  [0, 1].forEach(ch=>buf.getChannelData(ch).set(Float32Array.from({length:buf.length},()=>Math.random()*2-1)));
  noiseSource=c.createBufferSource();noiseSource.buffer=buf;noiseSource.loop=true;
  const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=noiseType==='waves'?800:550;
  if(noiseType==='waves'){
    const wGain=c.createGain();wGain.gain.value=0.5;noiseLFO=c.createOscillator();noiseLFO.frequency.value=0.13;
    const lfoG=c.createGain();lfoG.gain.value=0.4;noiseLFO.connect(lfoG);lfoG.connect(wGain.gain);
    noiseSource.connect(lp);lp.connect(wGain);wGain.connect(noiseGain);noiseLFO.start();
  }else{noiseSource.connect(lp);lp.connect(noiseGain);}
  noiseSource.start();noisePlaying=true;$('noisePlayIcon').innerText='pause';$('noiseStateIcon').innerText='play_circle';$('noiseStateIcon').style.color='var(--md-success)';sNF();
};
const stopNoise=()=>{if(noiseSource){try{noiseSource.stop()}catch(e){}noiseSource=null;}if(noiseLFO){try{noiseLFO.stop()}catch(e){}noiseLFO=null;}if(noiseCustomAudio)noiseCustomAudio.pause();noisePlaying=false;$('noisePlayIcon').innerText='play_arrow';$('noiseStateIcon').innerText='pause_circle';$('noiseStateIcon').style.color='var(--md-tertiary)';};
const sNF=()=>{
  if(noiseFadeTimer){clearTimeout(noiseFadeTimer);noiseFadeTimer=null;}const mins=parseInt($('noiseFadeSelect').value);
  if(mins===0||!noisePlaying)return;
  noiseFadeTimer=setTimeout(()=>{if(noiseGain){const sctx=getSharedAudioCtx();if(sctx)noiseGain.gain.linearRampToValueAtTime(0,sctx.currentTime+5);}setTimeout(stopNoise,5000);},mins*60*1000);
};

/* 自定义噪音文件装载（原 noiseFileInput.onchange L843-849 域内迁移） */
const onNoiseFile=e=>{
  const f=e.target.files[0];if(!f)return;
  if(noiseCustomAudio)noiseCustomAudio.pause();
  noiseCustomAudio=new Audio(URL.createObjectURL(f));noiseCustomAudio.loop=true;noiseCustomAudio.volume=noiseVol;
  noiseType='custom';$$('.noise-type-item').forEach(el=>el.classList.toggle('active',el.dataset.type==='custom'));
  $('customNoiseLabel').innerText=f.name.slice(0,8)+'...';$('noiseStatusText').innerText='本地音频 · '+f.name.slice(0,12);
};

/* noiseFadeSelect change 分支（原 change 事件 L809 域内迁移） */
const onFadeChange=()=>sNF();

/* ---------------- v9.41 #157 一期：睡眠时间表（Google Clock Bedtime 结构对标） ---------------- */
const btCore=()=>window.__clockCore;
let btInWindow=false; /* 睡眠区间边沿状态（进入播/退出停，每秒 tick 判定零重复触发） */
/* 时间表卡片渲染：开关态/时刻回填/重复日 chips（day-pill 同款闹钟样式）/时长/下次就寝 */
const renderBedtimeCard=()=>{
  const bt=A.bedtime;if(!bt)return;
  const inp=$('bedtimeModeInput');if(inp)inp.checked=!!bt.enabled;
  const body=$('bedtimeScheduleBody');if(body)body.style.display=bt.enabled?'':'none';
  const nsel=$('bedtimeNotifySelect');if(nsel)nsel.value=String(Number(bt.notifyMin)===0?0:(Number(bt.notifyMin)||15)); /* v9.42 #157 二期就寝提醒回填 */
  const bi=$('bedtimeBedInput'),wi=$('bedtimeWakeInput');
  if(bi)bi.value=pad(Math.floor(bt.bedMin/60))+':'+pad(bt.bedMin%60);
  if(wi)wi.value=pad(Math.floor(bt.wakeMin/60))+':'+pad(bt.wakeMin%60);
  const chips=$('bedtimeDayChips');
  if(chips)render(chips,W,(d,i)=>`<div class="day-pill${bt.days.indexOf(i)!==-1?' active':''}" data-act="toggle-bedtime-day" data-day="${i}">${d}</div>`);
  const core=btCore();
  if(core){
    const dur=core.bedtimeDuration(bt.bedMin,bt.wakeMin);
    const dt=$('bedtimeDurationText');if(dt)dt.innerText=dur<=0?'--（起卧同刻）':Math.floor(dur/60)+' 小时 '+(dur%60)+' 分';
    const nt=$('bedtimeNextText');
    if(nt){
      if(!bt.enabled)nt.innerText='未启用';
      else{
        const nx=core.nextBedtimeDate(bt.bedMin,bt.days,new Date());
        nt.innerText=nx?'周'+W[nx.getDay()]+' '+pad(nx.getHours())+':'+pad(nx.getMinutes()):'未选择重复日';
      }
    }
  }
};
/* 就寝/起床时刻变更（time input change → 分钟数落盘 + 卡片重渲染） */
const onBedtimeTimeChange=t=>{
  const bt=A.bedtime;if(!bt)return;
  const v=/^(\d{1,2}):(\d{2})$/.exec(t.value||'');if(!v)return;
  const mins=parseInt(v[1],10)*60+parseInt(v[2],10);
  if(t.id==='bedtimeBedInput')bt.bedMin=mins;else bt.wakeMin=mins;
  save();renderBedtimeCard();
};
/* 睡眠时段边沿检测（app.mjs tick 每秒委派）：进入窗口→未播则自动播放助眠音效（状态文案
   「睡眠时段 · 自动播放」）；离开窗口→播中则停止。autoplay 政策防御在录：iframe 宿主内
   用户点开时钟应用本身即一次手势，AudioContext 通常已解锁；零手势历史时首播可能被浏览器拦截（静音失败不抛错） */
/* v9.42 #157 二期：就寝提醒——距下次就寝 notifyMin 分钟时经 __system.notify 走宿主
   Heads-up + 通知中心（v7.19 统一通知 SDK，terminal/pdf/markdown/archive/threes 同款先例）；
   分钟级去重（同分钟只发一次）；错过窗口不发（页面打开时 diff 已小于提前量则不再补发，Google 同行为，在录） */
let lastNotifyKey='';
const maybeBedtimeNotify=(bt,n)=>{
  const core=btCore();if(!core)return;
  const lead=Number(bt.notifyMin)||0;
  if(!bt.enabled||lead<=0)return;
  const nx=core.nextBedtimeDate(bt.bedMin,bt.days,n);if(!nx)return;
  const diff=Math.ceil((nx.getTime()-n.getTime())/60000); /* ceil 保分钟窗稳定：该分钟内 ceil 恒等于提前量（round 会在 xx:59.8 秒截断漏发——坑在录） */
  if(diff!==lead)return;
  const key=n.getFullYear()+'-'+n.getMonth()+'-'+n.getDate()+'-'+bt.bedMin+'-'+lead;
  if(key===lastNotifyKey)return;
  lastNotifyKey=key;
  try{
    const hm=pad(nx.getHours())+':'+pad(nx.getMinutes());
    window.__system.notify({appId:'clock',appName:'时钟',title:'就寝提醒',desc:'距就寝时间 '+hm+' 还有 '+lead+' 分钟，助眠音效将准时自动播放'});
  }catch(e){}
};
/* v10.68 #209：睡眠模式静音+灰度——进/出窗边沿经宿主 DND 桥（__system.dnd.set →
   quick-settings setDndExternalSource 单一真源，source='bedtime'；grayscale 位复用
   #198 ZenDeviceEffects overlay）。Google Clock 睡眠模式语义：系统级静音 + 去色灰度；
   灰度通道可行（#198 overlay backdrop-filter 合成）无需诚实降级。tick 驱动失忆语义
   与 #208 调度器同源在录：应用关闭即无出窗边沿——手动 QS 关闭 = manual override
   清登记（逃生通道），下个进窗边沿重新登记（宿主侧语义，见 quick-settings 注） */
const dndSet=(on)=>{try{const s=window.__system;if(s&&s.dnd)s.dnd.set(on,'bedtime',{grayscale:true})}catch(e){}};
const bedtimeTick=n=>{
  const bt=A.bedtime;
  if(!bt||!bt.enabled){if(btInWindow){btInWindow=false;dndSet(false);}return;} /* v10.68 #209：禁用路径兜底释放（窗内被关不悬挂勿扰） */
  const core=btCore();if(!core)return;
  maybeBedtimeNotify(bt,n);
  const inW=!!core.isBedtimeWindow(bt.bedMin,bt.wakeMin,bt.days,n);
  if(inW===btInWindow)return;
  btInWindow=inW;
  if(inW){
    const c=getAudioCtx();if(c&&c.state==='suspended'){try{c.resume()}catch(e){}}
    if(!noisePlaying){playNoise();if($('noiseStatusText'))$('noiseStatusText').innerText='睡眠时段 · 自动播放';}
    dndSet(true);
  }else{if(noisePlaying){stopNoise();}dndSet(false);
  }
};

/* ---------------- 本域 ACTIONS 子表（app.mjs 合并分发，v9.39 #160 二期拆分） ---------------- */
export const bedActions={
  'set-noise-type': t => {
    const type=t.dataset.type;noiseType=type;$$('.noise-type-item').forEach(el=>el.classList.toggle('active',el.dataset.type===type));
    if(type==='custom')return $('noiseFileInput').click();
    $('noiseStatusText').innerText={deep:'暖调深噪 · 沉静遮噪',waves:'潮汐律动 · 呼吸放松'}[type]||'';
    if(noisePlaying){stopNoise();setTimeout(playNoise,50);}
  },
  'toggle-noise': () => noisePlaying?stopNoise():playNoise(),
  /* v9.41 #157：开关切换（m3-switch input click 委派，checked 已被浏览器翻转）+ 重复日 chip */
  'toggle-bedtime-mode': t => {
    const bt=A.bedtime;if(!bt)return;
    bt.enabled=!!t.checked;save();renderBedtimeCard();
  },
  'toggle-bedtime-day': t => {
    const bt=A.bedtime;if(!bt)return;
    const d=Number(t.dataset.day),ix=bt.days.indexOf(d);
    if(ix===-1)bt.days.push(d);else bt.days.splice(ix,1);
    bt.days.sort((a,b)=>a-b);save();renderBedtimeCard();
  }
};

/* ---------------- 音量滑杆（原 IIFE L851-892 域内迁移，行为逐字不变） ----------------
   v7.38 修 GitHub issue「滑杆填充块滞后」：fill/thumb 原以 width/left（layout+paint
   属性）驱动，快速拖动时大色块 fill 的重光栅落后于小竖条 thumb 的异步光栅化，
   视觉脱节（截图实测最大 52px）；改合成器属性后零 layout 零重光栅，
   两者天然同帧。另修：隐藏 tab 初始化时 offsetWidth=0 走 200px 兜底 → 静息态
   fill 错位 40%；现零宽时跳过视觉写入，由 ResizeObserver 在可见时重绘。
   v7.39 对齐参考版：24px 厚双段轨道 + 6×60 竖柄药丸；竖柄两侧各 10px 物理断开间隙
   v7.43 修「手柄移动时两端圆角退化直至消失」：fill/line 改 clip-path: inset(round)
   裁剪表达 —— scaleX 会把 12px 半圆端帽压成椭圆，段越短越扁；裁剪圆角与段长
   无关。公式与 ios-desktop/js/slider-geom.js 同源（经典脚本无法 import，两处同步） */
const initBedtime=()=>{
  const vt=$('noiseVolTrack'),vf=$('noiseVolFill'),vth=$('noiseVolThumb'),vnl=$('noiseVolLine'),vp=$('noiseVolPercent');
  if(!vt)return;
  const NV_GAP=10;
  const updateNoiseSlider = (p) => {
    p = Math.max(0, Math.min(1, p));
    noiseVol = p;
    if(vp) vp.innerText = Math.round(p * 100) + '%';
    if(noiseGain){const sctx=getSharedAudioCtx();if(sctx)noiseGain.gain.setValueAtTime(p, sctx.currentTime);}
    if(noiseCustomAudio) noiseCustomAudio.volume = p;
    const w = vt.clientWidth;
    if (w > 0) {
      const x = p * w;
      const fillR = Math.min(w, Math.max(0, w - (x - NV_GAP)));
      const lineL = Math.min(w, Math.max(0, x + NV_GAP));
      vf.style.clipPath = 'inset(0 ' + fillR.toFixed(1) + 'px 0 0 round 12px 6px 6px 12px)';
      if(vnl) vnl.style.clipPath = 'inset(0 0 0 ' + lineL.toFixed(1) + 'px round 6px 12px 12px 6px)';
      vth.style.transform = 'translateX(' + x.toFixed(1) + 'px) translate(-50%,-50%)';
    }
  };
  // rAF 合帧（末事件原则）：pointermove 事件率可超帧率，每帧至多一次落盘
  let nRaf=0, nLastE=null;
  const nPaint=()=>{ nRaf=0; const e=nLastE; nLastE=null; if(!e)return;
    const r=vt.getBoundingClientRect();
    updateNoiseSlider((e.clientX - r.left) / r.width);
  };
  bindDrag(vt, e => { nLastE=e; if(!nRaf) nRaf=requestAnimationFrame(nPaint); });
  // 尺寸/可见性变化（tab 切入、分屏、窗口缩放）→ 按当前值重定位 thumb 像素基准
  if (window.ResizeObserver) {
    new ResizeObserver(() => { if (vt.clientWidth > 0) updateNoiseSlider(noiseVol); }).observe(vt);
  }
  updateNoiseSlider(0.6);
  // 自定义噪音文件输入挂接（原顶层 L843，随域迁移）
  const nfi=$('noiseFileInput');if(nfi)nfi.onchange=onNoiseFile;
  // v9.41 #157：睡眠时间表卡片启动回填（旧存档无 bedtime 键时 A 已带保守默认，渲染不抛错）
  renderBedtimeCard();
};

export { playNoise, stopNoise, sNF, onNoiseFile, onFadeChange, initBedtime, renderBedtimeCard, onBedtimeTimeChange, bedtimeTick };
