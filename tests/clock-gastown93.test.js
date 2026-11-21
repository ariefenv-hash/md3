// ==================== clock-gastown93.test.js — v11.50 #330：Google Clock 9.3「Gastown」1:1 重做锚 ====================
//
// 证据：#330 附件 com.google.android.deskclock_9.3_(1003616371)-76133240（APKMirror，
//   用户经代理下载上传），反编译取证卷 docs/reference/deskclock/gastown93/
//   （axml-all93.txt 1,535 文件 / gastown-values.tsv 2,263 行 / layouts-resolved.txt 31 布局 /
//   tab-icons.txt 双态矢量 / README 规格速查）。
// 施工面（对应 README §五语义级差异点）：
//   ① 底部导航栏回归（gastown_nav_bar 实证，翻 v8.49 顶栏胶囊决策）
//   ② FAB 80×80 / r24 / tertiary-container（gastown_fab_* + fab_*_tint 实证）
//   ③ 大时间排版 = RobotoFlex wght450/wdth80 + tnum + letterSpacing -0.04
//     （TextAppearance.Time.DisplayLarge 继承链实解；ROND 专有轴 #190 方案 A 不做近似）
//   ④ 闹钟卡 24dp 圆角 / elevation 0 / 时间 36sp（GastownAlarmMaterialCardViewStyle +
//     gastown_alarm_time_summary 实证）
//   ⑤ 计时器三列显示 + 单位标签 + 预设格 + 透明底大字键盘（gastown_timer_display_view /
//     core_time_preset_view / gastown_timer_keypad_view 实证）
//   ⑥ 计时器运行卡环形进度（track 12 / 圆角 6 / gap 12 / 80sp 级倒计时 tnum /
//     圆钮 512dp→48dp surfaceContainerHighest）（gastown_timer_card 实证）
//   ⑦ 世界时钟城市卡 24sp 城市名 / 时差行 16sp / 右列数字钟 wght500/wdth100（CityDigitalClock-
//     TextStyle 实证）；主时钟帧 56sp 级排版
//   ⑧ 秒表图标钮组（gastown_stopwatch_fragment 顶部时间+中心圈速+底部圆钮实证）
//   ⑨ 就寝时间标签（menu_bedtime zh 实证）
// 测试纪律：源码锚（fs 读七文件拼接，clock-m3e 同款）；负断言防注释误报。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const FILES = ['index.html','app.mjs','alarm.mjs','world.mjs','timer.mjs','stopwatch.mjs','bedtime.mjs'];
const app = () => FILES.map((f) => readFileSync(resolve(ROOT, 'ios-desktop/apps/clock-app/' + f), 'utf8')).join('\n');
const ref = () => readFileSync(resolve(ROOT, 'docs/reference/deskclock/gastown93/README.md'), 'utf8');

describe('v11.50 #330 — ①② 导航底栏回归 + FAB Gastown 形态', () => {
  const s = app();

  it('底部导航栏：.gastown-nav 全宽 + safe-area 兜底（M3 NavigationBar 形态）', () => {
    expect(s).toContain('.gastown-nav{display:flex;padding:8px 8px max(8px,env(safe-area-inset-bottom))');
    expect(s).toMatch(/<div class="gastown-nav">\s*\n\s*<div class="nav-item active" data-act="nav" data-tab="Alarm"/);
  });

  it('tab 标签 9.3 zh 实证：Bedtime=就寝时间（menu_bedtime zh=就寝时间）', () => {
    expect(s).toContain('data-tab="Bedtime" data-title="就寝时间"');
    expect(s).toContain('<div class="nav-text">就寝时间</div>');
    expect(s).not.toContain('data-title="睡眠时间"');
  });

  it('FAB：80×80 / r24 / tertiary-container 色对 / margin 16px / 图标 28dp', () => {
    expect(s).toMatch(/\.fab\{position:absolute;bottom:16px;right:16px;width:80px;height:80px;border-radius:24px;background:var\(--md-tertiary-container/);
    expect(s.match(/font-size:28px">add<\/span>/g)?.length).toBe(3); /* 闹钟/世界/计时器三 FAB */
  });

  it('证据卷在库且关键结论可回读（axml 全文 + 值表 + README 版本行）', () => {
    expect(ref()).toContain('versionCode 76133240');
    expect(ref()).toContain('Updated to Material 3 Expressive design');
    const axml = readFileSync(resolve(ROOT, 'docs/reference/deskclock/gastown93/axml-all93.txt'), 'utf8');
    expect(axml.length).toBeGreaterThan(1000000);
  });
});

describe('v11.50 #330 — ③ 大时间排版（TextAppearance.Time.DisplayLarge 继承链）', () => {
  const s = app();

  it('.gastown-time-var：RobotoFlex 默认 + 用户字体可覆盖 + wght450/wdth80 + tnum + -0.04 字距', () => {
    expect(s).toContain(".gastown-time-var{font-family:var(--clock-digit-font,var(--custom-user-font,'RobotoFlex')),var(--fn);font-variation-settings:'wght' 450,'wdth' 80;font-feature-settings:'tnum' 1;font-optical-sizing:auto;letter-spacing:-.04em}");
  });

  it('暂停态/城市态覆写变体在册（GastownTimerCountdownTextPausedStyle / CityDigitalClockTextStyle）', () => {
    expect(s).toContain(".gastown-time-var.is-paused{font-variation-settings:'wght' 250,'wdth' 80}");
    expect(s).toContain(".gastown-time-var.is-city{font-variation-settings:'wght' 500,'wdth' 100;letter-spacing:0}");
  });

  it('roboto-flex.css 引用在册 + 主时钟/城市钟/秒表/闹钟时间四落点挂 gastown-time-var', () => {
    expect(s).toContain('../../assets/fonts/roboto-flex.css');
    expect(s).toContain('id="worldClockTime" style="font-size:clamp(52px,13vw,76px);font-weight:400"');
    expect(s).toMatch(/class="city-time-num city-time-93 gastown-time-var is-city"/);
    expect(s).toMatch(/class="stopwatch-display gastown-time-var" id="swDisplay"/);
    expect(s.match(/class="alarm-time gastown-time-var"/g)?.length).toBe(2); /* 闹钟卡+起床卡 */
  });
});

describe('v11.50 #330 — ④ 闹钟卡（GastownAlarmMaterialCardViewStyle）', () => {
  const s = app();

  it('卡 24dp 圆角 + 卡头结构注释（cardElevation 0 由无阴影承载）', () => {
    expect(s).toMatch(/\.alarm-card-wrapper\{background:var\(--sf\);border:1px solid var\(--ss\);border-radius:24px/);
    expect(s).toContain('GastownAlarmMaterialCardViewStyle');
  });

  it('时间 36sp（gastown_alarm_time_summary 实证）+ label α0.84（Flexbox label alpha 实证）', () => {
    expect(s.match(/font-size:36px;line-height:1\.1/g)?.length).toBe(2);
    expect(s).toContain('opacity:.84">${a.label');
  });
});

describe('v11.50 #330 — ⑤⑥ 计时器 setup（键盘/显示/预设）+ 运行卡环形进度', () => {
  const s = app();

  it('setup 三列显示：时/分/秒 .timer-setup-num[data-ts] + 单位标签（gastown_timer_display_view）', () => {
    expect(s).toContain('id="timerDigits"><div class="timer-setup-col"><div class="timer-setup-num gastown-time-var" data-ts="h">00</div><div class="timer-setup-unit">时</div>');
    expect(s).toContain('data-ts="m">00</div><div class="timer-setup-unit">分</div>');
    expect(s).toContain('data-ts="s">00</div><div class="timer-setup-unit">秒</div>');
    expect(s).toContain('.timer-setup-unit{font-size:16px;color:var(--sub)');
  });

  it('预设格五枚直建动作在册（core_time_preset_view 结构；取值集 dex 未取证=诚实标注）', () => {
    expect(s.match(/data-act="timer-preset" data-sec="/g)?.length).toBe(5);
    for (const sec of ['60','180','300','600','900']) expect(s).toContain(`data-sec="${sec}"`);
    expect(s).toContain('取值集\n               dex 侧未取证=诚实标注');
    expect(s).toContain("'timer-preset': t => { const sec=parseInt(t.dataset.sec,10)||0; if(sec>0){aTC(sec); hideTK();} }");
  });

  it('键盘透明底大字键（TimerGastownSetupDigitButtonStyle：透明底/无描边/自动 22~32sp）', () => {
    expect(s).toContain('.key-btn{aspect-ratio:1;border-radius:50%;background:transparent;border:none;color:var(--m);font-size:clamp(22px,6vw,32px)');
    expect(s).toContain('data-val="back" aria-label="退格"');
  });

  it('运行卡：环形 12px 轨道 + 80sp 级倒计时 + 48dp 圆钮组 + 56dp 主钮（gastown_timer_card）', () => {
    expect(s).toContain('.timer-ring-box{position:relative;width:min(300px,72vw);height:min(300px,72vw)');
    expect(s).toContain('.timer-ring-num{font-size:clamp(48px,13vw,80px);line-height:1}');
    expect(s).toContain('stroke-width="12"');
    expect(s).toContain('.timer-round-btn{width:48px;height:48px;border-radius:24px;background:var(--md-surface-container-highest,var(--gb))');
    expect(s).toContain('.timer-pp-btn{width:56px;height:56px;border-radius:28px;background:var(--acc)');
    expect(s).toMatch(/r="118" stroke-width="12"/);
  });

  it('运行卡进度几何随环自算（2π×118），tick/到期/重置三路 dashoffset 全走 _circ', () => {
    expect(s).toContain('const CIRC=2*Math.PI*118,DASH=CIRC.toFixed(1);');
    expect(s).toContain('if(pe)pe._circ=CIRC;');
    expect(s).toContain('progEl.style.strokeDashoffset=String(progEl._circ||377)');
    expect(s).toContain('const CIRC2=progEl&&progEl._circ?progEl._circ:377');
    expect(s).toContain("if(pe2)pe2.style.strokeDashoffset='0'");
  });

  it('三列显示写入：pK 走 [data-ts] 三元素（旧 innerHTML 拼串退役）', () => {
    expect(s).toContain("document.querySelector('#timerDigits [data-ts=\"h\"]')");
    expect(s).not.toContain("innerHTML=p.slice(0,2)+'<span");
  });
});

describe('v11.50 #330 — ⑦⑧ 世界时钟城市卡 / 主时钟帧 + 秒表 9.3 结构', () => {
  const s = app();

  it('城市卡：city 24sp + 时差行 16sp + 操作沉底行（gastown_world_clock_item）', () => {
    expect(s).toContain('.city-name-93{font-size:24px;font-weight:400;line-height:1.2}');
    expect(s).toContain('.city-sub-row{display:flex;align-items:center;gap:8px;font-size:16px;color:var(--sub);margin-top:2px}');
    expect(s).toContain('.city-actions{display:flex;gap:12px;align-items:center;justify-content:flex-end;padding:8px 0 6px}');
    expect(s).toMatch(/class="city-card" data-city-id="\$\{c\.id\}"/);
  });

  it('城市数字钟 57sp 级（CityDigitalClockTextStyle 57sp，clamp 收口）+ 卡 padding 16/20/4', () => {
    expect(s).toContain('.city-time-93{font-size:clamp(34px,7.5vw,57px);line-height:1;text-align:right}');
    expect(s).toContain('.city-card{padding:16px 20px 4px}');
  });

  it('秒表：时间顶部 / 圈速中心 / 前后圈导航容器 / 底部圆钮组（gastown_stopwatch_fragment）', () => {
    expect(s).toMatch(/<div class="sw-laps-carousel w-full" id="swLapsCarousel" style="max-width:480px"><\/div><div class="sw-lap-nav w-full" id="swLapNav"/);
    expect(s).toMatch(/<button class="sw-icon-btn ripple-active" id="swResetBtn" data-act="sw-reset" aria-label="重置秒表"><span class="material-symbols-outlined">refresh<\/span><\/button>/);
    expect(s).toMatch(/<button class="sw-icon-btn ripple-active" id="swLapBtn" data-act="sw-lap" aria-label="计圈" style="display:none"><span class="material-symbols-outlined">flag<\/span><\/button>/);
  });
});

describe('v11.50 #330 — 证据纪律', () => {
  it('手术脚本三件入库留痕（CSS/标记/模块）', () => {
    for (const f of ['surgery-v1150-clock-css.py','surgery-v1150-clock-markup.py']) {
      const p = readFileSync(resolve(ROOT, 'scripts/' + f), 'utf8');
      expect(p.length, f).toBeGreaterThan(500);
    }
  });

  it('值表可回读：FAB/圆角/轨道厚等关键实测值在 gastown-values.tsv', () => {
    const tsv = readFileSync(resolve(ROOT, 'docs/reference/deskclock/gastown93/gastown-values.tsv'), 'utf8');
    expect(tsv).toContain('gastown_fab_width\t80dp');
    expect(tsv).toContain('timer_track_thickness\t12dp');
    expect(tsv).toContain('timer_track_corner_radius\t6dp');
    expect(tsv).toContain('timer_track_progress_indicator_size\t340dp');
  });
});
