// ==================== clock-app/bedtime.mjs — 白噪音域（v9.39 · #160 二期五文件拆分） ====================
// 白噪音合成/淡出与音量滑杆。共享工具与音频层从 ./app.mjs 导入（v9.05 #152 多文件范式）。
// 顶层零 DOM 副作用：滑杆初始化与文件输入挂接统一由 initBedtime() 执行（app.mjs 启动序列调用）。
// 注：#157「睡眠时间 Bedtime」功能改造为本模块后续迭代点，本期为行为零变化的域拆分。
import { $, $$, bindDrag, getAudioCtx, getMainGain, getSharedAudioCtx } from './app.mjs';

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

/* ---------------- 本域 ACTIONS 子表（app.mjs 合并分发，v9.39 #160 二期拆分） ---------------- */
export const bedActions={
  'set-noise-type': t => {
    const type=t.dataset.type;noiseType=type;$$('.noise-type-item').forEach(el=>el.classList.toggle('active',el.dataset.type===type));
    if(type==='custom')return $('noiseFileInput').click();
    $('noiseStatusText').innerText={deep:'暖调深噪 · 沉静遮噪',waves:'潮汐律动 · 呼吸放松'}[type]||'';
    if(noisePlaying){stopNoise();setTimeout(playNoise,50);}
  },
  'toggle-noise': () => noisePlaying?stopNoise():playNoise()
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
};

export { playNoise, stopNoise, sNF, onNoiseFile, onFadeChange, initBedtime };
