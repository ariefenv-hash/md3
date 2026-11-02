// ==================== v157-bedtime.test.js — #157 一期：白噪音 tab 改「睡眠时间」（Bedtime） ====================
// v9.41 R59 窗主作业。范围（#157 一期四项）：①tab 重命名（Noise→Bedtime/白噪音→睡眠时间）
// ②时间表卡片（就寝/起床/重复日/睡眠时长自动计算）③到点自动播放助眠音效（核心联动）
// ④原白噪音区降为卡内「助眠音效」分区（三音效+音量+渐弱定时全保留，行为零变化）。
// 权威注记：Google Clock Bedtime 非 AOSP DeskClock 组成部分（无权威快照可拉）——纯逻辑三函数
// （bedtimeDuration/nextBedtimeDate/isBedtimeWindow）以议题正文权威结构+用户裁定为判据，
// 工程自定语义在录；nextAlarmDate 四步法同构复用 distanceToNextDay（v9.38 已下沉）。
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const R = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const CORE = R('ios-desktop/js/clock-core.js');

// 经典 IIFE 沙箱提取（word-core/lyric-core 同款范式）
const core = new Function('window', CORE + '; return window.__clockCore;')({});
const C = core || {};
const bedMins = (h, m) => h * 60 + m;
const dateAt = (h, m, extraDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + extraDays);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
};

describe('v9.41 #157 一期 · A. clock-core Bedtime 纯逻辑真跑', () => {
  it('A1 bedtimeDuration 跨午夜归一：23:00→07:00 = 480 分钟', () => {
    expect(C.bedtimeDuration(bedMins(23, 0), bedMins(7, 0))).toBe(480);
  });
  it('A2 同日不跨午夜：06:00→14:00 = 480；非整点 23:15→06:45 = 450', () => {
    expect(C.bedtimeDuration(bedMins(6, 0), bedMins(14, 0))).toBe(480);
    expect(C.bedtimeDuration(bedMins(23, 15), bedMins(6, 45))).toBe(450);
  });
  it('A3 边界：起卧同刻 = 0（无窗口不自动播）；乱序入参仍归一', () => {
    expect(C.bedtimeDuration(bedMins(7, 0), bedMins(23, 0))).toBe(960);
    expect(C.bedtimeDuration(480, 480)).toBe(0);
  });
  it('A4 isBedtimeWindow 跨午夜：23:30 在窗（今日启用）/02:00 在窗（就寝日=昨日，昨日启用→true 今日启用→false）', () => {
    // 基准=本周一（周序稳定，不依赖运行日）：monEarly=周一 02:00 → 就寝日=周日
    const now = new Date();
    const mon = (now.getDay() + 6) % 7; // 今天距周一过了几天：周一=0
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mon); // 本周一
    const monNight = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 30);
    const monEarly = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 2, 0);
    expect(C.isBedtimeWindow(1380, 420, [1], monNight)).toBe(true);
    expect(C.isBedtimeWindow(1380, 420, [0], monEarly)).toBe(true); // 周日就寝、周一凌晨未起床
    expect(C.isBedtimeWindow(1380, 420, [1], monEarly)).toBe(false); // 周一启用≠周一凌晨在窗（就寝日=周日）
  });
  it('A5 isBedtimeWindow 出窗/入窗边界：12:00 出窗；就寝整点 23:00 即入窗；起卧同刻恒 false', () => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const noon = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0);
    const bed = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 0);
    const all = [0, 1, 2, 3, 4, 5, 6];
    expect(C.isBedtimeWindow(1380, 420, all, noon)).toBe(false);
    expect(C.isBedtimeWindow(1380, 420, all, bed)).toBe(true);
    expect(C.isBedtimeWindow(480, 480, all, noon)).toBe(false);
    expect(C.isBedtimeWindow(1380, 420, [], noon)).toBe(false);
  });
  it('A6 nextBedtimeDate 四步法同构：今日未过→今日；已过→下个启用日；空 days→null', () => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const early = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 1, 0); // 凌晨 1 点
    const nx = C.nextBedtimeDate(1380, [0, 1, 2, 3, 4, 5, 6], early);
    expect(nx.getHours()).toBe(23);
    expect(nx.getDay()).toBe(early.getDay()); // 当日 23:00 未过 → 今天
    const later = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 30); // 已过就寝
    const nx2 = C.nextBedtimeDate(1380, [0, 1, 2, 3, 4, 5, 6], later);
    expect(nx2.getDate()).toBe(later.getDate() + 1); // 明天
    expect(C.nextBedtimeDate(1380, [], early)).toBe(null);
  });
});

describe('v9.41 #157 一期 · B. bedtime.mjs 域接线静态锚', () => {
  const BT = R('ios-desktop/apps/clock-app/bedtime.mjs');
  it('B1 睡眠时间表渲染：开关/时刻回填/day-pill chips/时长/下次就寝五件在册', () => {
    expect(BT).toContain("render(chips,W,(d,i)=>`<div class=\"day-pill${bt.days.indexOf(i)!==-1?' active':''}\" data-act=\"toggle-bedtime-day\" data-day=\"${i}\">${d}</div>`)");
    expect(BT).toContain("bi.value=pad(Math.floor(bt.bedMin/60))+':'+pad(bt.bedMin%60)");
    expect(BT).toContain("core.bedtimeDuration(bt.bedMin,bt.wakeMin)");
    expect(BT).toContain("core.nextBedtimeDate(bt.bedMin,bt.days,new Date())");
    expect(BT).toContain("inp.checked=!!bt.enabled");
  });
  it('B2 核心联动：bedtimeTick 边沿检测——进入自动 playNoise（状态文案「睡眠时段 · 自动播放」）/离开 stopNoise', () => {
    expect(BT).toContain('const bedtimeTick=n=>{');
    expect(BT).toContain('core.isBedtimeWindow(bt.bedMin,bt.wakeMin,bt.days,n)');
    expect(BT).toContain('if(inW===btInWindow)return;');
    expect(BT).toContain("if(!noisePlaying){playNoise();if($('noiseStatusText'))$('noiseStatusText').innerText='睡眠时段 · 自动播放';}");
    expect(BT).toContain('else if(noisePlaying){stopNoise();}');
  });
  it('B3 ACTIONS 扩两项：toggle-bedtime-mode（enabled 落盘）/toggle-bedtime-day（chip 增删保序）', () => {
    expect(BT).toContain("'toggle-bedtime-mode': t => {");
    expect(BT).toContain('bt.enabled=!!t.checked;save();renderBedtimeCard();');
    expect(BT).toContain("'toggle-bedtime-day': t => {");
    expect(BT).toContain('bt.days.sort((a,b)=>a-b);save();renderBedtimeCard();');
  });
  it('B4 启动回填：initBedtime 尾部 renderBedtimeCard()（app.mjs 启动序列既有 initBedtime 调用）', () => {
    expect(BT).toContain('renderBedtimeCard();');
    expect(R('ios-desktop/apps/clock-app/app.mjs')).toContain('initBedtime();');
  });
});

describe('v9.41 #157 一期 · C. app.mjs 状态与 tick 委派', () => {
  const APP = R('ios-desktop/apps/clock-app/app.mjs');
  it('C1 A.bedtime 保守默认：enabled=false（首启不自动出声）/23:00-07:00/全周', () => {
    expect(APP).toContain('bedtime:{enabled:false,bedMin:1380,wakeMin:420,days:[0,1,2,3,4,5,6]}');
  });
  it('C2 tick 委派 + time input change 分支 + import 扩展', () => {
    expect(APP).toContain('bedtimeTick(n);');
    expect(APP).toContain("else if(t.id==='bedtimeBedInput'||t.id==='bedtimeWakeInput'){onBedtimeTimeChange(t);}");
    expect(APP).toContain('import { bedActions, onFadeChange, initBedtime, bedtimeTick, onBedtimeTimeChange } from \'./bedtime.mjs\';');
  });
});

describe('v9.41 #157 一期 · D. index.html 结构锚', () => {
  const HTML = R('ios-desktop/apps/clock-app/index.html');
  it('D1 tab 重命名三件：data-tab="Bedtime" + data-title="睡眠时间" + tabBedtime 内容区', () => {
    expect(HTML).toContain('data-tab="Bedtime" data-title="睡眠时间"');
    expect(HTML).toContain('id="tabBedtime"');
    expect(HTML).toContain('<div class="nav-text">睡眠时间</div>');
    expect(HTML).not.toContain('data-tab="Noise"');
    expect(HTML).not.toContain('data-title="白噪音"');
  });
  it('D2 时间表卡片五件在册 + 「助眠音效」分区标题 + 原音效区保留', () => {
    expect(HTML).toContain('id="bedtimeScheduleCard"');
    expect(HTML).toContain('id="bedtimeBedInput"');
    expect(HTML).toContain('id="bedtimeWakeInput"');
    expect(HTML).toContain('id="bedtimeDayChips"');
    expect(HTML).toContain('id="bedtimeDurationText"');
    expect(HTML).toContain('id="bedtimeNextText"');
    expect(HTML).toContain('助眠音效');
    expect(HTML).toContain('id="noiseFadeSelect"');
    expect(HTML).toContain('data-act="set-noise-type"');
    expect(HTML).toContain('.nav-item.animate-click .noise-wave-bar'); // v751 图标动画类原样
  });
});

describe('v9.41 #157 一期 · E. 版本真源', () => {
  it('E1 package.json 9.41.0', () => {
    expect(JSON.parse(R('package.json')).version).toBe('9.41.0');
  });
  it('E2 本文件标题锚 v9.41', () => {
    expect(R('tests/v157-bedtime.test.js')).toContain('v9.41');
  });
});
