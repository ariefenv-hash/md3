// ==================== v8.49 #11：时钟应用 Google Clock 8.1 M3E 对标升级 ====================
//
// 认领范围（#11 回帖 2026-10-27 续认领，#24 考证清单执行）：升级面 1/3/5 项 + 大时钟字体上屏
//   ① M3E 视觉对齐：激活闹钟整卡背景高亮 / 点卡片上滑 sheet 编辑（内联展开面板退役）/
//      右下方形 FAB / 移除高底栏（top-tabs 顶栏胶囊） / 秒表超大文字按钮+方形卡片圈速 /
//      世界时钟时间与日期行分离+移除每城高低温 / 溢出菜单项带图标
//   ③ 闹钟语义考证（铁律#1 实证，Deskclock lineage-24.0 实拉存档 scripts/deskclock-v849/）：
//      - 稍后提醒默认 10 分钟：SettingsDAO.java:353 `prefs.getString(KEY_ALARM_SNOOZE, "10")`
//        （注释原文 "Default value must match the one in res/xml/settings.xml"）；
//        调度链 AlarmStateManager.setSnoozeState → DataModel.getSnoozeLength → add(Calendar.MINUTE)
//      - 新闹钟 vibrate 默认 true：Alarm.java:296 `this.vibrate = true`
//   ⑤ 闹钟音量真通道：AOSP STREAM_ALARM 语义——防御式读 v8.03 声音页单一真源
//      window.__settingsSoundStore('alarm' 0-100，settings.js DEFAULTS.alarm=70)，
//      缺载/越界/异常回落 70；ringGainFromVolumes 纯函数 master×pct/100 钳 [0,1]
//   字体：#20 已验证四件套直链复用（Google Sans Flex CSS API + AndroidClock/_Solid/Clockopia
//      jsdelivr；Highlight 系锁屏双层变体不入列），存储键 ios-desktop:clock-font-v1
//      （#20 锁屏表盘/设置侧字体菜单未来共用键），损坏 JSON/未知 id 回落 system
//
// 测试纪律：源码锚点（iframe 应用内联脚本，无独立 core 可 import——v8.31 同款 fs 锚定）；
// 负断言用 not.toMatch 防注释误报。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const app = () => readFileSync(resolve(ROOT, 'ios-desktop/apps/clock-app/index.html'), 'utf8');
const js = readFileSync(resolve(ROOT, 'ios-desktop/js/apps/settings.js'), 'utf8');

describe('v8.49 #11 ① M3E 视觉对齐：底栏退役 + 顶栏胶囊 tabs + 方形 FAB', () => {
  const s = app();

  it('高底栏退役：bottom-nav 全库零残留（CSS/DOM 双面）', () => {
    expect(s).not.toMatch(/bottom-nav/);
    expect(s).toContain('class="top-tabs"');
  });

  it('顶栏 tabs：5 导航项 data-tab 全保留（SVG 动画类 nav-item 原样迁移）', () => {
    expect(s.match(/data-act="nav" data-tab="/g)?.length).toBe(5);
    expect(s).toContain('data-tab="Alarm"');
    expect(s).toContain('data-tab="Noise"');
    expect(s).toContain('.nav-item.animate-click .alarm-bell-group');
    expect(s).toContain('.top-tabs{display:flex');
  });

  it('FAB 方形 M3E 规格：56×56 / 16px 圆角 / 右下定位', () => {
    expect(s).toMatch(/\.fab\{position:absolute;bottom:20px;right:20px;width:56px;height:56px;border-radius:16px/);
  });

  it('溢出菜单项带图标（8.1 全局项——既有合规逐条核对留档）', () => {
    expect(s).toMatch(/menu-item[^>]*data-act="open-saver"><span class="material-symbols-outlined">schedule<\/span>屏保/);
    expect(s).toMatch(/menu-item[^>]*data-act="open-modal" data-target="settingsModal"><span class="material-symbols-outlined">settings<\/span>设置/);
  });
});

describe('v8.49 #11 ① 闹钟整卡高亮 + sheet 编辑迁移', () => {
  const s = app();

  it('激活=整卡高亮（.active-style primary-container 既有语义保留）', () => {
    expect(s).toContain('.alarm-card-wrapper.active-style{background:var(--ac)');
    expect(s).toMatch(/class="alarm-card-wrapper \$\{a\.active\?'active-style':''\}"/);
  });

  it('卡上开关+内联展开面板全量退役（迁移非共存）', () => {
    expect(s).not.toMatch(/alarm-expand-panel|alarm-expand-inner|expand-arrow/);
    expect(s).not.toMatch(/toggle-expand|toggle-alarm-sw/);
  });

  it('点卡片上滑 sheet：卡片 data-act=open-alarm-sheet + #alarmSheet 底部 sheet 在场', () => {
    expect(s).toMatch(/data-alarm-id="\$\{a\.id\}" data-act="open-alarm-sheet"/);
    expect(s).toContain('<dialog id="alarmSheet">');
    expect(s).toContain('class="sheet-body" id="sheetBody" data-alarm-id=""');
    expect(s).toContain('sheet-handle');
  });

  it('sheet 家族语义：alarm 查找统一锚 #sheetBody[data-alarm-id]（天数/振动/编辑/删除四动作）', () => {
    expect(s).toMatch(/'open-alarm-sheet': t => \{/);
    expect(s).toMatch(/'close-sheet': \(\) => toggleModal\('alarmSheet', 0\)/);
    expect(s).toMatch(/'toggle-day': t => \{\s*\n\s*const a=A\.alarms\.find\(x=>x\.id==\$\('sheetBody'\)\.dataset\.alarmId\)/);
    expect(s).toMatch(/'toggle-vib': t => \{\s*\n\s*const a=A\.alarms\.find\(x=>x\.id==\$\('sheetBody'\)\.dataset\.alarmId\)/);
    expect(s).toMatch(/'edit-alarm': \(\) => \{\s*\n\s*const id=Number\(\$\('sheetBody'\)\.dataset\.alarmId\)/);
    expect(s).toMatch(/'del-alarm': \(\) => \{\s*\n\s*const id=Number\(\$\('sheetBody'\)\.dataset\.alarmId\)/);
  });

  it('振动开关随迁 sheet（.m3-switch 家族——v8.45 #81 捕获守卫继续有效）', () => {
    expect(s).toContain("e.target.closest('.m3-switch'):null");
    expect(s).toMatch(/<dialog id="alarmSheet">[\s\S]*?data-act="toggle-vib"/);
  });
});

describe('v8.49 #11 ③ DeskClock 语义考证落地（lineage-24.0 实拉）', () => {
  const s = app();

  it('稍后提醒 10 分钟（SettingsDAO.java:353 默认 "10"）——文案+延时 6e5ms 双锚', () => {
    expect(s).toContain('稍后提醒(10分)');
    expect(s).toMatch(/setTimeout\(\(\)=>sR\('稍后提醒','10分钟Snooze时间到'\),6e5\)/);
    expect(s).not.toMatch(/稍后提醒\(5分\)|3e5/);
  });

  it('新闹钟 vibrate 默认 true（Alarm.java:296）+ 取证留痕注释在场', () => {
    expect(s).toMatch(/A\.alarms\.push\(\{id:Date\.now\(\),hour:sH,minute:sM,isPm,active:1,expanded:false,label:lbl,days:\[1,2,3,4,5\],vibrate:true\}\)/);
    expect(js).toContain('#11 时钟应用前置依赖：闹钟响铃音量消费 store.get(\'alarm\')');
  });
});

describe('v8.49 #11 ⑤ 闹钟音量真通道（AOSP STREAM_ALARM 语义）', () => {
  const s = app();

  it('防御式读取 __settingsSoundStore：0-100 越界拒收+异常回落 70（与 settings.js DEFAULTS.alarm 同源）', () => {
    expect(s).toMatch(/window\.__settingsSoundStore&&typeof window\.__settingsSoundStore\.get==='function'\?window\.__settingsSoundStore\.get\('alarm'\):null/);
    expect(s).toMatch(/return \(typeof v==='number'&&isFinite\(v\)&&v>=0&&v<=100\)\?v:70;/);
    expect(js).toMatch(/DEFAULTS = \{ call: 50, ring: 70, notification: 70, alarm: 70,/);
  });

  it('ringGainFromVolumes 纯函数（master×pct/100 钳 [0,1]）+ window 导出面供 e2e 直测', () => {
    expect(s).toMatch(/const ringGainFromVolumes=\(master,pct\)=>Math\.max\(0,Math\.min\(1,\(typeof master==='number'&&isFinite\(master\)\?master:0\.85\)\*\(pct\/100\)\)\)/);
    expect(s).toContain('window.__clockAlarmVolumePct=getAlarmVolumePct;');
    expect(s).toContain('window.__clockRingGainFromVolumes=ringGainFromVolumes;');
  });

  it('接线落点：playRing 每振荡器增益×k + customAudio.volume=k（响铃与预览同一通道）', () => {
    expect(s).toMatch(/const playRing=\(t=A\.globalRingtone\)=>\{\s*\n\s*const k=ringGainFromVolumes\(A\.masterVolume,getAlarmVolumePct\(\)\);/);
    expect(s).toContain('customAudio.volume=k;');
    expect(s).toMatch(/\(t==='urgent'\?\.25:\.01\)\*k/);
    expect(s).toMatch(/linearRampToValueAtTime\(\.28\*k,n\+\.1\)/);
  });
});

describe('v8.49 #11 大时钟字体上屏（#20 资产复用 + 共用存储键）', () => {
  const s = app();

  it('存储键 ios-desktop:clock-font-v1（#20 未来共用键）+ 损坏 JSON/未知 id 回落 system', () => {
    expect(s).toContain("const CLOCK_FONT_KEY='ios-desktop:clock-font-v1'");
    expect(s).toMatch(/const id=JSON\.parse\(raw\)\.id;\s*\n\s*return CLOCK_FONTS\.some\(f=>f\.id===id\)\?id:'system';/);
    expect(s).toMatch(/\}catch\(e\)\{return 'system';\}/);
  });

  it('#20 已验证四件套直链逐字在场（Highlight 双层变体不入列）', () => {
    expect(s).toContain("'https://fonts.googleapis.com/css2?family=Google+Sans+Flex&display=swap'");
    expect(s).toContain("'https://cdn.jsdelivr.net/gh/RPi-Distro/fonts-android@master/AndroidClock.ttf'");
    expect(s).toContain("'https://cdn.jsdelivr.net/gh/RPi-Distro/fonts-android@master/AndroidClock_Solid.ttf'");
    expect(s).toContain("'https://cdn.jsdelivr.net/gh/RPi-Distro/fonts-android@master/Clockopia.ttf'");
    expect(s).not.toContain('AndroidClock_Highlight.ttf');
  });

  it('选择语义：chips data-act=set-clock-font + active 态 + 启动恢复 persist=false', () => {
    expect(s).toMatch(/'set-clock-font': t => applyClockFont\(t\.dataset\.id\)/);
    expect(s).toMatch(/renderClockFontChips\(\);applyClockFont\(parseClockFontPref\(\),false\)/);
    expect(s).toContain('id="clockFontChips"');
    expect(s).toContain('id="clockFontNameDisplay"');
  });

  it('上屏链路：--clock-digit-font → --cd 令牌 → 五处大钟数字（卡面/世界/屏保/响铃/秒表）', () => {
    /* --cd 默认回落链以等宽收尾（首跑 e2e 探针实证：通用 sans-serif 收尾离线落比例数字，
       秒表运行中文本逐帧漂移 .41/.44 实测差 10px——AOSP Chronometer 数字纪律） */
    expect(s).toContain("--cd:var(--clock-digit-font,var(--custom-user-font,'Quicksand'),ui-monospace,'DejaVu Sans Mono',monospace)");
    expect(s).toMatch(/\.alarm-time\{font-family:var\(--cd\)/);
    expect(s).toContain('#worldClockTime,#saverTime,#ringTimeDisplay,.stopwatch-display{font-family:var(--cd)}');
    expect(s).toMatch(/\.sheet-time\{font-family:var\(--cd\)/);
    expect(s).toContain("ui-monospace,'DejaVu Sans Mono',monospace");
  });

  it('离线纪律：FontFace 6s 超时 + 失败保持 var（未注册家族沿回落链续接等宽数字，绝不白屏/漂移）', () => {
    expect(s).toMatch(/setTimeout\(\(\)=>done\(false\),6000\)/);
    expect(s).toMatch(/loadClockFontFontFace\(f\)\.catch\(\(\)=>\{/);
    expect(s).toMatch(/document\.fonts\.add\(l\)/);
  });
});

describe('v8.49 #11 ① 秒表超大文字按钮 + 方形卡片圈速 + 世界时钟分离排版', () => {
  const s = app();

  it('秒表主按钮 88px 高 / 28px 字号（超大文字，双类 specificity 压过 .sw-pill-btn 基准）+ 重置/计圈并排副行', () => {
    expect(s).toContain('.sw-pill-btn.sw-btn-main{height:88px;border-radius:28px;font-size:28px;font-weight:600}');
    expect(s).toMatch(/id="swMainBtn" data-act="sw-toggle"[^>]*>开始<\/button><div class="fb w-full g-12">/);
    expect(s).toMatch(/id="swResetBtn" data-act="sw-reset"([^>]*)>/);
    expect(s).toMatch(/id="swLapBtn" data-act="sw-lap"/);
  });

  it('圈速方形卡片：96px + aspect-ratio 1 + 12px 圆角（旧 120px 圆角卡退役）', () => {
    expect(s).toMatch(/\.lap-card-item\{flex:0 0 96px;aspect-ratio:1;border-radius:12px/);
    expect(s).not.toMatch(/flex:0 0 120px/);
  });

  it('世界时钟：时间行与日期行/活动闹钟行分离（world-meta-col 双行纵排）', () => {
    expect(s).toMatch(/<span class="world-date-row sub-txt" id="worldClockDate">/);
    expect(s).toMatch(/<span class="world-alarm-row sub-txt"><span class="material-symbols-outlined" style="font-size:16px">alarm<\/span><span id="worldNextAlarm">/);
    expect(s).not.toMatch(/worldClockDate"[^>]*>.*<\/span><span class="fc g-6">/);
  });
});

describe('v8.49 #11 既有机制零回退（迁移不破坏）', () => {
  const s = app();

  it('v7.77 M3E 下拉刷新接线在册（onRefresh 重读 android_clock_state）', () => {
    expect(s).toContain('window.__m3ePull.attach(');
    expect(s).toContain("JSON.parse(localStorage.getItem('android_clock_state'))");
  });

  it('v7.19 计时器深链 timer/start + v7.76 日程卡 calevents_v1 双通道保留', () => {
    expect(s).toContain("e.data.event === 'timer/start'");
    expect(s).toContain("localStorage.getItem('calevents_v1')");
  });

  it('世界城市钉选桌面总线链保留（clock/request-pins + clock/pin-city）', () => {
    expect(s).toContain("busSend('clock/request-pins', null)");
    expect(s).toContain("busSend('clock/pin-city'");
  });

  it('dialog 配对完整（6 dialogs）+ v8.45 拖拽委托 pointerdown 语义原样', () => {
    expect((s.match(/<dialog/g) || []).length).toBe(6);
    expect((s.match(/<\/dialog>/g) || []).length).toBe(6);
    expect(s).toMatch(/const MAX=16,startX=e\.clientX,wasChecked=input\.checked;/);
  });
});
