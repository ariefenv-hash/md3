// ==================== clock-app/stopwatch.mjs — 秒表域（v9.39 · #160 二期五文件拆分） ====================
// Stopwatch 不可变状态机 + addLap + fastestSlowestLaps 在 js/clock-core.js
// （data/Stopwatch.java + StopwatchModel.addLap L140-160 逐字，v9.38 一期下沉）；
// 本模块只做 DOM 桥接：sw/swLaps 容器、三操作（tSW/rSW/rLap）、RAF 显示刷新（stopwatchTick）。
// 共享工具从 ./app.mjs 导入（v9.05 #152 多文件范式）。
import { $, pad, render } from './app.mjs';

/* v9.38 #160：秒表下沉 clock-core.Stopwatch（data/Stopwatch.java 逐字：三态不可变+accumulated 语义）
   + addLap（StopwatchModel.addLap L140-160：lapTime=total-prevAccum、laps.add(0,·) 保序、<98 圈上限）
   + fastestSlowestLaps（最长/最短圈标记；单圈不标记与旧 isF/isS 条件同构） */
let sw=window.__clockCore.Stopwatch.reset(),swLaps=[];
const fSW=ms=>pad(Math.floor(ms/6e4))+':'+pad(Math.floor((ms%6e4)/1e3))+'.'+pad(Math.floor((ms%1e3)/10));
const tSW=()=>{
  const b=$('swMainBtn');
  if(sw.isRunning()){sw=sw.pause(performance.now());b.innerText='开始';b.style.background='var(--gr)';b.style.color='var(--grt)';$('swLapBtn').style.display='none';}
  else{sw=sw.start(performance.now());b.innerText='停止';b.style.background='var(--st)';b.style.color='var(--stt)';$('swLapBtn').style.display='flex';}
};
const rSW=()=>{sw=sw.reset();swLaps=[];$('swDisplay').innerText='00:00.00';$('swLapsCarousel').innerHTML='';$('swMainBtn').innerText='开始';$('swMainBtn').style.background='var(--gr)';$('swMainBtn').style.color='var(--grt)';$('swLapBtn').style.display='none';};
const rLap=()=>{
  const laps=window.__clockCore.addLap(swLaps,sw,performance.now());if(!laps)return;swLaps=laps;
  const c=$('swLapsCarousel');if(!swLaps.length)return;
  const fs=window.__clockCore.fastestSlowestLaps(swLaps);
  render(c, swLaps, l=>{
    const isF=fs.fastest===l.number,isS=fs.slowest===l.number;
    return `<div class="lap-card-item ${isF?'lap-fastest':isS?'lap-slowest':''}"><div style="font-weight:600">${pad(l.number)}</div><div style="font-size:14px">${fSW(l.lapTime)}</div><div class="sub-txt">${fSW(l.accumulatedTime)}</div></div>`;
  });
};

/* mainLoop 秒表显示段（原 index.html L936 域内迁移；v9.38 #160 Stopwatch.getTotalTime） */
const stopwatchTick=()=>{
  if (sw.isRunning()) { $('swDisplay').innerText = fSW(sw.getTotalTime(performance.now())); }
};

/* ---------------- 本域 ACTIONS 子表（app.mjs 合并分发，v9.39 #160 二期拆分） ---------------- */
export const swActions={
  'sw-toggle': tSW, 'sw-reset': rSW, 'sw-lap': rLap
};

export { fSW, tSW, rSW, rLap, stopwatchTick };
