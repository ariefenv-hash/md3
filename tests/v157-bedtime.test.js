// ==================== v157-bedtime.test.js — #157 一期：白噪音 tab 改「睡眠时间」（Bedtime） ====================
// v10.37 R59 窗主作业。范围（#157 一期四项）：①tab 重命名（Noise→Bedtime/白噪音→睡眠时间）
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

describe('v10.37 #157 一期 · A. clock-core Bedtime 纯逻辑真跑', () => {
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

describe('v10.37 #157 一期 · B. bedtime.mjs 域接线静态锚', () => {
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
    // v10.37 #209 重锚：出窗边沿扩 DND 解除（噪声停+桥释放并存），原 else-if 单噪声形态退役
    expect(BT).toContain('else{if(noisePlaying){stopNoise();}dndSet(false);');
    expect(BT).toContain('dndSet(true);'); // 进窗边沿 DND 登记（睡眠模式静音）
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

describe('v10.37 #157 一期 · C. app.mjs 状态与 tick 委派', () => {
  const APP = R('ios-desktop/apps/clock-app/app.mjs');
  it('C1 A.bedtime 保守默认：enabled=false（首启不自动出声）/23:00-07:00/全周/notifyMin:15', () => {
    expect(APP).toContain('bedtime:{enabled:false,bedMin:1380,wakeMin:420,days:[0,1,2,3,4,5,6],notifyMin:15}');
  });
  it('C2 tick 委派 + time input change 分支 + import 扩展', () => {
    expect(APP).toContain('bedtimeTick(n);');
    expect(APP).toContain("else if(t.id==='bedtimeBedInput'||t.id==='bedtimeWakeInput'){onBedtimeTimeChange(t);}");
    expect(APP).toContain('import { bedActions, onFadeChange, initBedtime, bedtimeTick, onBedtimeTimeChange } from \'./bedtime.mjs\';');
  });
});

describe('v10.37 #157 一期 · D. index.html 结构锚', () => {
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
    expect(HTML).toContain('.nav-item[data-tab="Bedtime"].animate-click .nav-msr-icon'); // v751 单次脉冲语义 → v10.37 #159 字形化 data-tab 特化锚
  });
});

describe('v10.37 #157 二期 · F. 就寝提醒（__system.notify 统一通知 SDK）', () => {
  const BT = R('ios-desktop/apps/clock-app/bedtime.mjs');
  const APP = R('ios-desktop/apps/clock-app/app.mjs');
  const HTML = R('ios-desktop/apps/clock-app/index.html');
  it('F1 提醒判定：notifyMin 提前量 + ceil 分钟窗 + lastNotifyKey 分钟级去重 + 错过不补发', () => {
    expect(BT).toContain('const maybeBedtimeNotify=(bt,n)=>{');
    expect(BT).toContain('const diff=Math.ceil((nx.getTime()-n.getTime())/60000);');
    expect(BT).toContain('if(key===lastNotifyKey)return;');
    expect(BT).toContain("if(!bt.enabled||lead<=0)return;");
  });
  it('F2 __system.notify 调用形态（terminal/pdf/threes 同款先例）：appId clock + 就寝提醒标题', () => {
    expect(BT).toContain("window.__system.notify({appId:'clock',appName:'时钟',title:'就寝提醒'");
    expect(BT).toContain('maybeBedtimeNotify(bt,n);');
  });
  it('F3 设置面：bedtimeNotifySelect 三档（0/15/30）+ change 落盘 + 默认 notifyMin:15', () => {
    expect(HTML).toContain('id="bedtimeNotifySelect"');
    expect(HTML).toContain('<option value="15" selected>提前 15 分钟</option>');
    expect(APP).toContain("else if(t.id==='bedtimeNotifySelect'){if(A.bedtime){A.bedtime.notifyMin=Number(t.value)||0;save();}}");
    expect(APP).toContain('notifyMin:15');
  });
  it('F4 回填锚：renderBedtimeCard notifyMin 回填（0=不提醒显式区分）', () => {
    expect(BT).toContain("nsel.value=String(Number(bt.notifyMin)===0?0:(Number(bt.notifyMin)||15))");
  });
});

describe('v10.37 #157 · E. 版本真源', () => {
  it('E1 package.json 10.37.0', () => {
    expect(JSON.parse(R('package.json')).version).toBe('10.37.0');
  });
  it('E2 本文件标题锚 v10.37', () => {
    expect(R('tests/v157-bedtime.test.js')).toContain('v10.37');
  });
});


/* ==================== v10.37 · #157 三期（R60 窗加餐·同域顺延）：⑧日出渐亮 ⑨明日日程预览 ==================== */
describe('v10.37 #157 三期 · F. clock-core sunriseLeadWindow 纯逻辑真跑', () => {
  it('F1 在窗返回 ceil 剩余秒数（与 v9.42 就寝提醒同纪律，round 秒截断不复发）', () => {
    const now = 1_000_000_000_000;
    expect(C.sunriseLeadWindow(now + 90_000, now, 10)).toBe(90);            // 90s → 90
    expect(C.sunriseLeadWindow(now + 90_001, now, 10)).toBe(91);            // ceil 非 round/trunc
    expect(C.sunriseLeadWindow(now + 5 * 60000, now, 5)).toBe(300);         // 窗沿含入
  });
  it('F2 不在窗/过期/无闹钟/lead<=0 → null', () => {
    const now = 1_000_000_000_000;
    expect(C.sunriseLeadWindow(now + 11 * 60000, now, 10)).toBe(null);      // 未进窗
    expect(C.sunriseLeadWindow(now - 1, now, 10)).toBe(null);               // 已响过
    expect(C.sunriseLeadWindow(null, now, 10)).toBe(null);                  // 无闹钟
    expect(C.sunriseLeadWindow(now + 60000, now, 0)).toBe(null);            // 关闭
    expect(C.sunriseLeadWindow(now + 60000, now, -5)).toBe(null);           // 非法
  });
});

describe('v10.37 #157 三期 · G. 日出渐亮接线锚', () => {
  it('G1 alarm.mjs：maybeSunrise 秒级判定 + sunriseKey 会话去重 + 复用屏保 dialog', () => {
    const AL = R('ios-desktop/apps/clock-app/alarm.mjs');
    expect(AL).toContain('const maybeSunrise=(n)=>{');
    expect(AL).toContain('sunriseLeadWindow(nx.getTime(),Date.now(),lead)');
    expect(AL).toContain('sunriseKey=best.key');
    expect(AL).toContain("toggleModal('screensaverModal',1)");
    expect(AL).toMatch(/\.classList\.add\('sunrise-active'\)/);
    expect(AL).toMatch(/maybeSunrise\(n\); \/\* v9\.\d+ #157 三期：日出渐亮秒级判定 \*\//); /* 版本无关正则 */
  });
  it('G2 响铃/teardown 双清理：alarmTick 命中响铃 clearSunrise + APP_CLOSE teardown 接同', () => {
    const AL = R('ios-desktop/apps/clock-app/alarm.mjs');
    expect(AL).toMatch(/lastRungMinuteStr=currentKey;clearSunrise\(\);sR\(/);
    expect(AL).toContain('const teardownAlarm=()=>{try{if(ringInt)clearInterval(ringInt)}catch(_){ }clearSunrise();};');
  });
  it('G3 设置面：sunriseSelect 四档（0/10/20/30）+ change 落盘 + 回填 + A.sunriseMinutes 默认 0', () => {
    const HT = R('ios-desktop/apps/clock-app/index.html');
    const AP = R('ios-desktop/apps/clock-app/app.mjs');
    expect(HT).toContain('id="sunriseSelect"');
    expect(HT).toMatch(/<option value="0">关闭<\/option><option value="10">响铃前 10 分钟<\/option><option value="20">响铃前 20 分钟<\/option><option value="30">响铃前 30 分钟<\/option>/);
    expect(HT).toContain('@keyframes sunriseGlow');
    expect(HT).toContain('.screensaver-dlg.sunrise-active{animation:sunriseGlow');
    expect(HT).toContain('id="sunriseTag"');
    expect(AP).toContain("else if(t.id==='sunriseSelect'){A.sunriseMinutes=Number(t.value)||0;save();}");
    expect(AP).toMatch(/\{ const ss=\$\('sunriseSelect'\); if\(ss\) ss\.value=String\(Number\(A\.sunriseMinutes\)\|\|0\); \}/);
    expect(AP).toContain('sunriseMinutes:0');
  });
});

describe('v10.37 #157 三期 · H. 明日日程预览（复用 calAgenda 卡）', () => {
  it('H1 明日段：dateKey+1 求键 + divider 渲染 + is-tomorrow 弱化 + 今日空明日有仍显示', () => {
    const AP = R('ios-desktop/apps/clock-app/app.mjs');
    expect(AP).toContain('三期：明日日程预览'); /* 版本无关锚 */
    expect(AP).toMatch(/new Date\(now\.getFullYear\(\), now\.getMonth\(\), now\.getDate\(\) \+ 1\)/);
    expect(AP).toMatch(/cal-agenda-divider">明日 · '/);
    expect(AP).toMatch(/cal-agenda-item is-tomorrow/);
    expect(AP).toContain("if (!evs.length && !tevs.length)");
    expect(AP).toContain('今日暂无日程');
    expect(AP).toMatch(/const esc = \(s\) => String\(s\)\.replace/);
  });
  it('H2 CSS：divider + is-tomorrow 样式在册', () => {
    const HT = R('ios-desktop/apps/clock-app/index.html');
    expect(HT).toContain('.cal-agenda-divider{');
    expect(HT).toContain('.cal-agenda-item.is-tomorrow{opacity:.55}');
  });
});

describe('v10.37 #157 留点⑥ · I. 起床闹钟展示联动（闹钟 tab 派生卡）', () => {
  it('I1 派生卡：enabled 时卡首渲染 bedtimeWakeCard（wakeMin 12h 归一 + formatDays + 「起床闹钟 · 睡眠时间」）', () => {
    const AL = R('ios-desktop/apps/clock-app/alarm.mjs');
    expect(AL).toContain('v10.37 #157 留点⑥：起床闹钟展示联动');
    expect(AL).toContain('const btWake=(A.bedtime&&A.bedtime.enabled)?');
    expect(AL).toContain('id="bedtimeWakeCard"');
    expect(AL).toContain('data-act="goto-bedtime"');
    expect(AL).toContain('起床闹钟 · 睡眠时间');
    expect(AL).toContain('A.bedtime.wakeMin>=720?\'下午\':\'上午\'');
    expect(AL).toContain('pad(Math.floor(A.bedtime.wakeMin/60)%12||12)');
    expect(AL).toContain('${formatDays(A.bedtime.days)}');
  });
  it('I2 零注入纪律：A.alarms 不被 mutation（insertAdjacentHTML afterbegin + enabled=false 恒不渲染）', () => {
    const AL = R('ios-desktop/apps/clock-app/alarm.mjs');
    expect(AL).toContain("if(btWake)$('alarmList').insertAdjacentHTML('afterbegin',btWake);");
    expect(AL).toContain('两域生命周期/去重/编辑归属解耦');
    expect(AL).toMatch(/A\.bedtime&&A\.bedtime\.enabled\)\?[\s\S]*?:'';/);
  });
  it('I3 goto-bedtime 动作：nav 同款四步落点真 .nav-item（标题/内容区/导航态/动画）', () => {
    const AL = R('ios-desktop/apps/clock-app/alarm.mjs');
    expect(AL).toContain("const gotoBedtime=()=>{");
    expect(AL).toContain("$('pageTitle').innerText='睡眠时间'");
    expect(AL).toContain('$$(\'.nav-item\').forEach(ni=>ni.classList.remove(\'active\',\'animate-click\'))');
    expect(AL).toContain('const nb=document.querySelector(\'.nav-item[data-tab="Bedtime"]\')');
    expect(AL).toContain("'goto-bedtime': gotoBedtime,");
  });
  it('I4 `$$` 导入扩容（gotoBedtime 依赖）+ import 行为真源锚', () => {
    const AL = R('ios-desktop/apps/clock-app/alarm.mjs');
    expect(AL).toMatch(/import \{ \$, \$\$, pad/);
  });
});
