#!/usr/bin/env python3
"""v11.50 #330 Gastown 9.3 手术脚本：clock-app/index.html 结构与样式 1:1 重做。

证据卷：docs/reference/deskclock/gastown93/（9.3 APK 反编译，versionCode 76133240）。
逐段锚定替换；任何 old 块失配即整体中止（防半套状态落盘）。
"""
import json, sys, re

ROOT = '/home/z/my-project/md3-repo/ios-desktop/apps/clock-app'
PATH = ROOT + '/index.html'
ICONS = json.load(open('/tmp/dc93/icon-paths.json'))

src = open(PATH, encoding='utf-8').read()
orig = src
edits = []

def rep(old, new, tag):
    global src
    if old not in src:
        print(f'!! 失配: {tag}')
        sys.exit(1)
    if src.count(old) != 1:
        print(f'!! 非唯一: {tag} (x{src.count(old)})')
        sys.exit(1)
    src = src.replace(old, new, 1)
    edits.append(tag)

# ---------- A. 字体：Roboto Flex 本地可变字体链（9.3 大时间排版基线） ----------
rep(
 '<link rel="stylesheet" href="../_shared/md3-tokens.css">',
 '<link rel="stylesheet" href="../_shared/md3-tokens.css">\n'
 '<!-- v11.50 #330 Gastown 9.3：大时间排版 TextAppearance.Time.DisplayLarge 基线 = 可变字体\n'
 '     wght 450 / wdth 80（ROND 100 为 Google 专有轴，#190 方案 A 不做近似）；本地 RobotoFlex\n'
 '     注册（#190 woff2 latin 子集，数字与冒号全覆盖），同 material-symbols.css 既有 <link> 范式 -->\n'
 '<link rel="stylesheet" href="../../assets/fonts/roboto-flex.css">',
 'A1 roboto-flex link')

# ---------- B. 顶栏胶囊 → 9.3 Gastown 底部导航栏 ----------
# B1 CSS
rep(
""".top-tabs{display:flex;gap:6px;padding:2px 20px 10px;flex-shrink:0;width:100%;z-index:30;overflow-x:auto}
.top-tabs::-webkit-scrollbar{display:none}
.nav-item{display:flex;flex-direction:row;align-items:center;gap:7px;cursor:pointer;color:var(--sub);flex:none;padding:8px 14px;border-radius:var(--rp);transition:color .2s,background .25s}
.nav-item:hover{background:var(--sv)}
.nav-icon-wrapper{width:22px;height:22px;border-radius:0;transition:all .28s;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}.nav-icon-wrapper .nav-msr-icon{font-size:22px;line-height:1}
.nav-item.active{background:var(--pi);color:var(--pit)}
.nav-item.active .nav-icon-wrapper{background:transparent;color:var(--pit);transform:none}
.nav-item .nav-text{font-size:13px;transition:all .25s;white-space:nowrap}.nav-item.active .nav-text{color:var(--pit);font-weight:600}""",
""".gastown-nav{display:flex;padding:8px 8px max(8px,env(safe-area-inset-bottom));flex-shrink:0;width:100%;z-index:30;background:var(--md-surface-container,var(--sf))}
.gastown-nav::-webkit-scrollbar{display:none}
/* v11.50 #330 Gastown 9.3 底部导航栏：M3 NavigationBar 形态（active-indicator 32dp 高药丸 +
   24dp 图标 + 12sp 标签纵排），色对 secondary-container/on-secondary-container；tab 顺序即
   gastown_tab_menu 实证序（闹钟/世界时钟/计时器/秒表/就寝时间） */
.nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:var(--sub);flex:1;min-width:0;padding:2px 0;transition:color .2s}
.nav-ind{width:56px;height:32px;border-radius:16px;display:flex;align-items:center;justify-content:center;transition:background .25s var(--md-easing-standard, cubic-bezier(.2,0,0,1))}
.nav-item:hover .nav-ind{background:var(--md-state-hover,rgba(255,255,255,.08))}
.nav-item.active .nav-ind{background:var(--md-secondary-container,var(--pi))}
.nav-item.active{color:var(--md-on-secondary-container,var(--pit))}
.nav-icon-wrapper{width:24px;height:24px;transition:transform .28s;position:relative;display:flex;align-items:center;justify-content:center}.nav-icon-wrapper .nav-msr-icon{width:24px;height:24px;line-height:1}
.nav-svg{width:24px;height:24px;display:block;fill:currentColor}
.nav-svg .p-sel{display:none}
.nav-item.active .nav-svg .p-sel{display:block}
.nav-item.active .nav-svg .p-un{display:none}
.nav-item .nav-text{font-size:12px;line-height:16px;transition:all .25s;white-space:nowrap;font-weight:500}.nav-item.active .nav-text{color:var(--md-on-secondary-container,var(--pit));font-weight:600}""",
'B1 nav css')

# B2 注释
rep(
"""/* v8.49（#11）Google Clock 8.1：移除高底栏（bottom bar 退役）——导航迁顶栏 M3 胶囊 tabs
   （图标+文字横排、active 药丸 primary-container 高亮）
   v9.43（#159）：5 个自创内联 SVG → Material Symbols 权威字形（alarm/public/timer/av_timer/bedtime，
   本地子集字体连字链路已验证，零体积代价）；动画改 data-tab 特化锚定 .nav-msr-icon 容器叠加，
   原 SVG 分部件动画（soundWave/hgDrain/hgFill 错峰沙粒/波形）随自创 path 退役 */""",
"""/* v11.50 #330 Gastown 9.3：底栏回归——9.3 主壳重新挂 gastown_nav_bar（M3 NavigationBar 底部
   导航），v8.49「顶栏胶囊」决策按新证据翻面（铁律 1：新源码覆盖旧结论；证据卷
   docs/reference/deskclock/gastown93/ §二）。
   图标：gastown_tab_menu animated-selector 的选中/未选中双矢量 pathData 逐字内联（960 viewport，
   tab-icons.txt），p-sel/p-un 随 .active 翻面；v9.43 的 data-tab 特化动画钩子（.nav-msr-icon）
   全量保留（动画目标改为 svg 元素，动画语义逐项不变：摇铃/自转/翻转/按压/脉冲） */""",
'B2 nav comment')

# B3 markup
def svg(pair, tab):
    sel, un = pair
    return (f'<svg class="nav-svg nav-msr-icon" viewBox="0 0 960 960" aria-hidden="true">'
            f'<path class="p-un" d="{un}"/><path class="p-sel" d="{sel}"/></svg>')

pairs = {
 'Alarm': ('alarm_sel','alarm_un'),
 'World': ('wc_sel','wc_un'),
 'Timer': ('timer_sel','timer_un'),
 'Stopwatch': ('sw_sel','sw_un'),
 'Bedtime': ('bed_sel','bed_un'),
}
old_nav = '''  <div class="top-tabs">
  <div class="nav-item active" data-act="nav" data-tab="Alarm" data-title="闹钟"><div class="nav-icon-wrapper fc"><span class="material-symbols-outlined nav-msr-icon">alarm</span></div><div class="nav-text">闹钟</div></div>
  <div class="nav-item" data-act="nav" data-tab="World" data-title="世界时钟"><div class="nav-icon-wrapper fc"><span class="material-symbols-outlined nav-msr-icon">public</span></div><div class="nav-text">世界时钟</div></div>
  <div class="nav-item" data-act="nav" data-tab="Timer" data-title="计时器"><div class="nav-icon-wrapper fc"><span class="material-symbols-outlined nav-msr-icon">timer</span></div><div class="nav-text">计时器</div></div>
  <div class="nav-item" data-act="nav" data-tab="Stopwatch" data-title="秒表"><div class="nav-icon-wrapper fc"><span class="material-symbols-outlined nav-msr-icon">av_timer</span></div><div class="nav-text">秒表</div></div>
  <div class="nav-item" data-act="nav" data-tab="Bedtime" data-title="睡眠时间"><div class="nav-icon-wrapper fc"><span class="material-symbols-outlined nav-msr-icon">bedtime</span></div><div class="nav-text">睡眠时间</div></div>
</div>'''
labels = {'Alarm':'闹钟','World':'世界时钟','Timer':'计时器','Stopwatch':'秒表','Bedtime':'就寝时间'}
new_nav = '  <div class="gastown-nav">\n'
for tab,(sel,un) in pairs.items():
    new_nav += (f'  <div class="nav-item{" active" if tab=="Alarm" else ""}" data-act="nav" data-tab="{tab}" data-title="{labels[tab]}">'
                f'<div class="nav-ind"><div class="nav-icon-wrapper fc">{svg((ICONS[sel],ICONS[un]),tab)}</div></div>'
                f'<div class="nav-text">{labels[tab]}</div></div>\n')
new_nav += '</div>'
rep(old_nav, new_nav, 'B3 nav markup')

# ---------- C. FAB：80×80 r24 tertiary-container（GastownFabStyle + fab_*_tint） ----------
rep(
""".fab{position:absolute;bottom:20px;right:20px;width:56px;height:56px;border-radius:16px;background:var(--gr);color:var(--grt);cursor:pointer;border:none;box-shadow:0 8px 24px rgba(0,0,0,.45);z-index:20;transition:transform .22s var(--md-easing-spring-legacy, cubic-bezier(.34,1.56,.64,1))}""",
""".fab{position:absolute;bottom:16px;right:16px;width:80px;height:80px;border-radius:24px;background:var(--md-tertiary-container,var(--gr));color:var(--md-on-tertiary-container,var(--grt));cursor:pointer;border:none;box-shadow:0 8px 24px rgba(0,0,0,.45);z-index:20;transition:transform .22s var(--md-easing-spring-legacy, cubic-bezier(.34,1.56,.64,1))}
/* v11.50 #330 Gastown 9.3 FAB：80×80dp / corner 24dp / tertiary-container 色对
   （gastown_fab_width/height=80dp、GastownFabStyle.shapeAppearance=GastownFabShapeAppearance 24dp、
   fab_background_tint→colorTertiaryContainer、fab_icon_tint→colorOnTertiaryContainer、icon 28dp）*/""",
'C1 fab css')
rep('data-act="open-alarm-picker" aria-label="新建闹钟"><span class="material-symbols-outlined" style="font-size:32px">add</span></button>',
    'data-act="open-alarm-picker" aria-label="新建闹钟"><span class="material-symbols-outlined" style="font-size:28px">add</span></button>',
    'C2 fab alarm icon 28')
rep('data-act="open-modal" data-target="searchCityModal" aria-label="添加城市"><span class="material-symbols-outlined" style="font-size:32px">add</span></button>',
    'data-act="open-modal" data-target="searchCityModal" aria-label="添加城市"><span class="material-symbols-outlined" style="font-size:28px">add</span></button>',
    'C3 fab world icon 28')
rep('id="timerAddFab" data-act="open-keypad" aria-label="新建计时器" style="display:none"><span class="material-symbols-outlined" style="font-size:32px">add</span></button>',
    'id="timerAddFab" data-act="open-keypad" aria-label="新建计时器" style="display:none"><span class="material-symbols-outlined" style="font-size:28px">add</span></button>',
    'C4 fab timer icon 28')

# ---------- D. 大时间可变排版 utility ----------
rep(
""".alarm-time,.stopwatch-display,.timer-big-num,#worldClockTime,#saverTime,#timerDigits,.key-btn,.time-box-card,.city-time-num,.day-pill{font-family:var(--fn);font-variant-numeric:tabular-nums}""",
""".alarm-time,.stopwatch-display,.timer-big-num,#worldClockTime,#timerDigits,.key-btn,.time-box-card,.city-time-num,.day-pill{font-family:var(--fn);font-variant-numeric:tabular-nums}
/* v11.50 #330 Gastown 9.3 大时间排版（TextAppearance.Time.DisplayLarge 继承链实解）：
   RobotoFlex 默认 + 用户字体(--clock-digit-font/--custom-user-font)可覆盖；font-variation-settings
   wght 450 / wdth 80（ROND 100 专有轴忽略，#190 方案 A）；tnum + letterSpacing -0.04（TimeBaseLarge）。
   静态字体（如 Quicksand）对未知轴优雅忽略=零回退风险。
   暂停态计时器（GastownTimerCountdownTextPausedStyle）覆写 wght 250；城市数字钟
   （CityDigitalClockTextStyle）覆写 wght 500 / wdth 100 / letterSpacing 0 */
.gastown-time-var{font-family:var(--clock-digit-font,var(--custom-user-font,'RobotoFlex')),var(--fn);font-variation-settings:'wght' 450,'wdth' 80;font-feature-settings:'tnum' 1;font-optical-sizing:auto;letter-spacing:-.04em}
.gastown-time-var.is-paused{font-variation-settings:'wght' 250,'wdth' 80}
.gastown-time-var.is-city{font-variation-settings:'wght' 500,'wdth' 100;letter-spacing:0}""",
'D1 time-var css')

# ---------- E. 世界时钟：主时钟帧排版 + 城市卡 9.3 结构 ----------
rep(
"""/* v8.49（#11）世界时钟 8.1 排版：时间行与「日期/活动闹钟」行分离（各占一行），移除每城高低温 */
.world-meta-col{display:flex;flex-direction:column;gap:6px;align-items:center;margin-top:10px}
.world-date-row{font-size:14px}
.world-alarm-row{font-size:13px;display:flex;align-items:center;gap:6px}""",
"""/* v11.50 #330 Gastown 9.3 主时钟帧（gastown_main_clock_frame）：AutoSizingTextClock 56sp +
   日期/天气/下次闹钟 Flow 行（gap 8dp，LocalInfoTextStyle 14sp 系）+ weather attribution 行；
   时间行与信息行分离延续（world-meta-col 语义保留） */
#worldClockTime{font-size:clamp(52px,13vw,76px);font-weight:400;line-height:1.04}
.world-meta-col{display:flex;flex-direction:column;gap:6px;align-items:center;margin-top:10px}
.world-date-row{font-size:14px}
.world-alarm-row{font-size:13px;display:flex;align-items:center;gap:6px}
/* 城市卡 9.3（gastown_world_clock_item）：左列 city 24sp + 时差/天气行（16sp，gap 8dp），
   右列 digital 57sp 自 60% guideline（CityDigitalClockTextStyle wght500/wdth100）；padding 16/20/4 */
.city-name-93{font-size:24px;font-weight:400;line-height:1.2}
.city-sub-row{display:flex;align-items:center;gap:8px;font-size:16px;color:var(--sub);margin-top:2px}
.city-time-93{font-size:clamp(34px,7.5vw,57px);line-height:1;text-align:right}
.city-card{padding:16px 20px 4px}
.city-card .city-actions{display:flex;gap:12px;align-items:center;justify-content:flex-end;padding:8px 0 6px}""",
'E1 world css')

# ---------- F. 闹钟卡 24dp 圆角 elevation 0 ----------
rep(
""".alarm-card-wrapper{background:var(--sf);border:1px solid var(--ss);border-radius:var(--rl);overflow:hidden;transition:all .35s ease;margin-bottom:12px;cursor:pointer}""",
""".alarm-card-wrapper{background:var(--sf);border:1px solid var(--ss);border-radius:24px;overflow:hidden;transition:all .35s ease;margin-bottom:12px;cursor:pointer}
/* v11.50 #330 GastownAlarmMaterialCardViewStyle：cardCornerRadius 24dp / cardElevation 0 */""",
'F1 alarm card css')
rep(
""".alarm-card-header{padding:20px 24px}""",
""".alarm-card-header{padding:20px 24px}
/* v11.50 #330 闹钟卡时间 36sp（gastown_alarm_time_summary TextTime textSize=36sp）+ 头行
   （label α0.84 / days / upcoming，textAppearanceBodyLarge=14sp 系）按 9.3 Gastown 结构 */""",
'F2 alarm header css')

# ---------- G. 计时器：键盘/setup/运行卡 9.3 ----------
rep(
""".timer-big-num{font-size:26px;font-weight:300}""",
""".timer-big-num{font-size:26px;font-weight:300}
/* v11.50 #330 Gastown 计时器：显示区=时/分/秒三列（TimerSetupDurationTextStyle=Time.DisplayLarge
   系+tnum）+ 各自单位标签（TimerSetupDurationUnitStyle 16sp colorOnSurfaceVariant，占高 20%）；
   键盘=TimerGastownSetupDigitButtonStyle（headlineLargeEmphasized 自动 6~32sp、透明底、无描边）；
   运行卡=CircularProgressIndicator 340dp/track 12dp/圆角 6dp/gap 12dp（trackColor=
   colorOutlineVariant、indicatorColor=colorPrimary）+ 80sp tnum 倒计时 + 圆形按钮组
   （cornerRadius 512dp、bg colorSurfaceContainerHighest）+ label 16sp 左上/delete 右上 */
.timer-setup-display{display:flex;width:100%;max-width:420px;margin:16px auto 0}
.timer-setup-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:0}
.timer-setup-num{font-size:clamp(44px,12vw,72px);line-height:1}
.timer-setup-unit{font-size:16px;color:var(--sub);height:20%;min-height:20px;display:flex;align-items:flex-start}
.timer-presets{display:flex;gap:10px;justify-content:center;width:100%;max-width:420px;margin:18px auto 6px;flex-wrap:wrap}
.timer-preset-chip{min-width:60px;height:60px;max-width:76px;border-radius:20px;background:var(--md-surface-container-high,var(--sv));color:var(--m);border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px 10px;transition:transform .15s}
.timer-preset-chip:active{transform:scale(.92)}
.timer-preset-chip .tp-num{font-size:25px;line-height:1.1}
.timer-preset-chip .tp-unit{font-size:12px;color:var(--sub);margin-bottom:4px}
.key-btn{aspect-ratio:1;border-radius:50%;background:transparent;border:none;color:var(--m);font-size:clamp(22px,6vw,32px);cursor:pointer;transition:all .15s;font-weight:400}
.key-btn:active{transform:scale(.88);background:var(--md-state-pressed,rgba(255,255,255,.12))}
.key-btn .material-symbols-outlined{font-size:24px}
.timer-setup-digits{display:flex;width:100%;max-width:420px;justify-content:center;gap:8px;margin-bottom:14px}
.timer-card{padding:16px 20px}
.timer-ring-box{position:relative;width:min(300px,72vw);height:min(300px,72vw);margin:0 auto;flex-shrink:0}
.timer-ring-box .timer-circle-svg{width:100%;height:100%;transform:rotate(-90deg)}
.timer-ring-num{font-size:clamp(48px,13vw,80px);line-height:1}
.timer-card-label{font-size:16px;color:var(--m);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.timer-round-btn{width:48px;height:48px;border-radius:24px;background:var(--md-surface-container-highest,var(--gb));color:var(--md-on-surface,var(--m));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:transform .15s}
.timer-round-btn:active{transform:scale(.92)}
.timer-round-btn .material-symbols-outlined{font-size:24px}
.timer-pp-btn{width:56px;height:56px;border-radius:28px;background:var(--acc);color:var(--accb);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s}
.timer-pp-btn:active{transform:scale(.92)}
.timer-pp-btn .material-symbols-outlined{font-size:30px}""",
'G1 timer css')
rep(
""".keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:100%;max-width:280px;margin-bottom:16px}""",
""".keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;width:100%;max-width:340px;margin-bottom:16px}""",
'G2 keypad width')

# ---------- H. 秒表 9.3：时间顶部 + 圈速中心 + 圆形图标按钮组 ----------
rep(
""".sw-pill-btn.sw-btn-main{height:88px;border-radius:28px;font-size:28px;font-weight:600}""",
""".sw-pill-btn.sw-btn-main{height:88px;border-radius:28px;font-size:28px;font-weight:600}
/* v11.50 #330 Gastown 秒表（gastown_stopwatch_fragment）：时间文字顶部（GastownStopwatchTime-
   TextStyle=DisplayLarge Emphasized Variable 系）+ 圈速中心容器（minHeight 106dp）+ 底部按钮容器
   （margin 16dp）；按钮=圆形图标钮（surfaceContainerHighest 副钮 / tertiaryContainer 主钮，M3E
   IconButton 形态），圈速前后导航箭头钮 48dp（gastown_stopwatch_nav_button_size） */
.sw-icon-btn{width:48px;height:48px;border-radius:24px;background:var(--md-surface-container-highest,var(--gb));color:var(--md-on-surface,var(--m));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s}
.sw-icon-btn:active{transform:scale(.9)}
.sw-icon-btn .material-symbols-outlined{font-size:24px}
.sw-main-fab{width:80px;height:80px;border-radius:28px;background:var(--md-tertiary-container,var(--gr));color:var(--md-on-tertiary-container,var(--grt));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s var(--md-easing-spring-legacy, cubic-bezier(.34,1.56,.64,1));box-shadow:0 8px 24px rgba(0,0,0,.45)}
.sw-main-fab:active{transform:scale(.9)}
.sw-main-fab .material-symbols-outlined{font-size:34px}
.sw-lap-nav{display:flex;gap:16px;align-items:center;justify-content:center;min-height:48px}""",
'H1 stopwatch css')

open(PATH,'w',encoding='utf-8').write(src)
print(f'OK {len(edits)} edits applied:')
for e in edits: print(' -', e)
