#!/usr/bin/env python3
"""v11.50 #330 Gastown 9.3 手术脚本②：clock-app 标记层（index.html 静态标记）
计时器 setup（三列显示+单位标签+预设格）/ 秒表 9.3 结构 / 世界时钟主时钟帧排版类。
"""
import json, sys

ROOT = '/home/z/my-project/md3-repo/ios-desktop/apps/clock-app'
PATH = ROOT + '/index.html'
src = open(PATH, encoding='utf-8').read()
edits = []

def rep(old, new, tag):
    global src
    if old not in src or src.count(old) != 1:
        print(f'!! 失配/非唯一: {tag} (x{src.count(old) if old in src else 0})')
        sys.exit(1)
    src = src.replace(old, new, 1)
    edits.append(tag)

# ---------- 1. 计时器 setup：三列显示 + 单位标签 + 预设格（gastown_timer_display_view +
#              core_time_preset_view）+ 退格图标（gs_backspace_rond100 12dp 语义→24dp web 基线） ----------
rep(
'''      <div id="timerKeypadOverlay" class="timer-keypad-wrapper">
        <div style="font-size:28px;color:var(--sub);margin-bottom:20px" id="timerDigits">00<span style="font-size:15px">时</span> 00<span style="font-size:15px">分</span> 00<span style="font-size:15px">秒</span></div>''',
'''      <div id="timerKeypadOverlay" class="timer-keypad-wrapper">
        <!-- v11.50 #330 Gastown 9.3 setup：时/分/秒三列（weight1）+ 各自单位标签（16sp 占高 20%），
             TimerSetupDurationTextStyle=Time.DisplayLarge 系 + tnum；gastown_timer_display_view 结构 -->
        <div class="timer-setup-digits" id="timerDigits"><div class="timer-setup-col"><div class="timer-setup-num gastown-time-var" data-ts="h">00</div><div class="timer-setup-unit">时</div></div><div class="timer-setup-col"><div class="timer-setup-num gastown-time-var" data-ts="m">00</div><div class="timer-setup-unit">分</div></div><div class="timer-setup-col"><div class="timer-setup-num gastown-time-var" data-ts="s">00</div><div class="timer-setup-unit">秒</div></div></div>
        <div class="timer-presets">
          <!-- v11.50 #330 计时器预设（core_time_preset_view：period 25sp + unit 下行；预设取值集
               dex 侧未取证=诚实标注，按常用预设实现） -->
          <button class="timer-preset-chip ripple-active" data-act="timer-preset" data-sec="60"><span class="tp-num">1</span><span class="tp-unit">分</span></button>
          <button class="timer-preset-chip ripple-active" data-act="timer-preset" data-sec="180"><span class="tp-num">3</span><span class="tp-unit">分</span></button>
          <button class="timer-preset-chip ripple-active" data-act="timer-preset" data-sec="300"><span class="tp-num">5</span><span class="tp-unit">分</span></button>
          <button class="timer-preset-chip ripple-active" data-act="timer-preset" data-sec="600"><span class="tp-num">10</span><span class="tp-unit">分</span></button>
          <button class="timer-preset-chip ripple-active" data-act="timer-preset" data-sec="900"><span class="tp-num">15</span><span class="tp-unit">分</span></button>
        </div>''',
'M1 timer setup markup')

rep(
'<button class="key-btn ripple-active" data-act="key" data-val="back"><span class="material-symbols-outlined">backspace</span></button></div>',
'<button class="key-btn ripple-active" data-act="key" data-val="back" aria-label="退格"><span class="material-symbols-outlined">backspace</span></button></div>',
'M2 backspace aria')

# ---------- 2. 秒表 tab：时间顶部 + 圈速中心 + 圆形图标按钮组（gastown_stopwatch_fragment） ----------
rep(
'''    <div class="tab-content" id="tabStopwatch"><div class="fc w-full" style="flex-direction:column;height:100%"><div class="stopwatch-display" id="swDisplay">00:00.00</div><div class="sw-laps-carousel w-full" id="swLapsCarousel" style="max-width:480px"></div><div class="w-full fc" style="max-width:340px;flex-direction:column;gap:12px;margin-top:auto;margin-bottom:20px"><button class="sw-pill-btn sw-btn-main ripple-active" id="swMainBtn" data-act="sw-toggle" style="background:var(--gr);color:var(--grt)">开始</button><div class="fb w-full g-12"><button class="sw-pill-btn ripple-active flex-1" id="swResetBtn" data-act="sw-reset" style="background:var(--gb);color:var(--md-on-surface)">重置</button><button class="sw-pill-btn ripple-active flex-1" id="swLapBtn" data-act="sw-lap" style="background:var(--gb);color:var(--md-on-surface);display:none">计圈</button></div></div></div></div>''',
'''    <div class="tab-content" id="tabStopwatch"><div class="fc w-full" style="flex-direction:column;height:100%"><div class="stopwatch-display gastown-time-var" id="swDisplay">00:00.00</div><div class="sw-laps-carousel w-full" id="swLapsCarousel" style="max-width:480px"></div><div class="sw-lap-nav w-full" id="swLapNav" style="display:none"></div><div class="fb w-full" style="max-width:340px;gap:24px;justify-content:center;align-items:center;margin-top:auto;margin-bottom:20px"><button class="sw-icon-btn ripple-active" id="swResetBtn" data-act="sw-reset" aria-label="重置秒表"><span class="material-symbols-outlined">refresh</span></button><button class="sw-main-fab ripple-active" id="swMainBtn" data-act="sw-toggle" aria-label="开始或暂停秒表"><span class="material-symbols-outlined" id="swMainIcon">play_arrow</span></button><button class="sw-icon-btn ripple-active" id="swLapBtn" data-act="sw-lap" aria-label="计圈" style="display:none"><span class="material-symbols-outlined">flag</span></button></div></div></div>''',
'M3 stopwatch markup')

# ---------- 3. 世界时钟 hero：主时钟帧排版类（gastown_main_clock_frame） ----------
rep(
'''      <div class="world-hero-pane w-full" style="margin-bottom:20px"><div style="font-size:clamp(40px,8vw,64px);font-weight:300" id="worldClockTime">--:--:--</div><div class="world-meta-col w-full" style="max-width:320px"><span class="world-date-row sub-txt" id="worldClockDate">--月--日周--</span><span class="world-alarm-row sub-txt"><span class="material-symbols-outlined" style="font-size:16px">alarm</span><span id="worldNextAlarm">无响铃</span></span></div></div>''',
'''      <div class="world-hero-pane w-full" style="margin-bottom:20px"><div class="gastown-time-var" id="worldClockTime" style="font-size:clamp(52px,13vw,76px);font-weight:400">--:--:--</div><div class="world-meta-col w-full" style="max-width:320px"><span class="world-date-row sub-txt" id="worldClockDate">--月--日周--</span><span class="world-alarm-row sub-txt"><span class="material-symbols-outlined" style="font-size:16px">alarm</span><span id="worldNextAlarm">无响铃</span></span></div></div>''',
'M4 world hero')

open(PATH,'w',encoding='utf-8').write(src)
print(f'OK {len(edits)} edits:')
for e in edits: print(' -', e)
