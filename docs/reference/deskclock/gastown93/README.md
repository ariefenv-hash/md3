# Google DeskClock 9.3「Gastown」反编译考证 · 时钟应用 1:1 重做供料（#330）

> 来源：#330 附件 `com.google.android.deskclock_9.3_(1003616371)-76133240`（APKMirror，App Bundle：
> base.apk 19,022,584B + split_config.hdpi/xxhdpi/xxxhdpi；用户经代理下载上传）。
> versionCode 76133240 / versionName "9.3 (1003616371)" / minSdk 29 / targetSdk **37（Android 17）**。
> 官方更新说明（APKMirror What's new）：**「Updated to Material 3 Expressive design」**。
> 解析工具：仓库自研 `docs/reference/deskclock/vector-and-responsive/{axml-dump,arsc-dump}.py`
> + 本轮新增 `scripts/arsc-strresolve.py`（@str#N → 字符串池）/
> `scripts/arsc-values.py`（TypedValue 全规则值解码）/ `scripts/resolve93.py`（布局内联值解析）/
> `scripts/style-bag.py`（style bag 属性表）。旧版（9.0，#224）卷在 `../vector-and-responsive/`。

## 一、版本位差（9.0 → 9.3）

| 维度 | 9.0（#224 卷） | 9.3（本卷） |
|---|---|---|
| resources.arsc 条目 | 66,303 | **109,910** |
| style 资源 | 12（sparse 未解） | **1,713（gm3/M3E 全量 token 层在库）** |
| color 资源 | 55 | **1,161** |
| font 资源 | 9 | **54（gm3_variable_* 可变字体 ramp）** |
| layout | 313 | 309（主体重构，见下） |

9.3 移除 `alarm_activity`/`fragment_alarm`/`fragment_stopwatch`/`lap_view`/`stopwatch_time`/
`timer_circle_guidelines` 等旧布局，新增 **gastown_* 全家**（Gastown = 9.3 重设计内部代号）。
dex 侧无 Compose（classes2.dex 实证 0 命中）——仍是 View 体系 + Material 组件。

## 二、主壳 gastown_desk_clock（TM/AE 双 config + 导航轨）

- CoordinatorLayout > AppBar(Toolbar, title marginStart 24dp) > 内容（ViewPager）> **include gastown_nav_bar**
- 内容区样式 GastownDeskClockContentStyle：底部导航条约束（竖屏）/ NavigationRailView（横屏
  `gastown_nav_bar_vertical`，headerLayout= gastown_navigation_bar_fab）
- **FAB**（GastownFabStyle）：`gastown_fab_width/height = 80dp`、`corner 24dp`、margin 16dp；
  色对 `fab_background_tint → colorTertiaryContainer` / `fab_icon_tint → colorOnTertiaryContainer`，
  图标 28dp（gs_add_vd_theme_24）。横屏轨头为 **ExtendedFAB**（icon+文本）。
- **导航 5 tab（gastown_tab_menu，顺序即真机顺序）**：
  1. 闹钟（gastown_menu_alarms=闹钟）
  2. 世界时钟（gastown_menu_world_clock=世界时钟）
  3. 计时器（gastown_menu_timers=计时器）
  4. 秒表（menu_stopwatch=秒表）
  5. 就寝时间（menu_bedtime=**就寝时间**）
  图标为 animated-selector（选中/未选中双矢量 + AVD 过渡），pathData 全文见 `tab-icons.txt`
  （viewport 960×960）。

## 三、大时间排版体系（TextAppearance.Time.DisplayLarge 继承链实解）

```
CityDigitalClockTextStyle(57sp)
 └ TextAppearance.Time.DisplayLarge: fontVariationSettings 'wght' 450, 'ROND' 100, 'wdth' 80
    └ TextAppearance.TimeBaseLarge: letterSpacing -0.04
       └ GoogleMaterial3.DisplayLarge.Emphasized.Variable
          = font @gm3_variable_display_large_emphasized（Google Sans Flex 动态下发）
          = 全轴 'CRSV' 0,'FILL' 0,'GRAD' 0,'HEXP' 0,'ROND' 100,'opsz' 57,'slnt' 0,'wdth' 100,'wght' 500
          = 57sp / lineHeight 64sp
```

- 主时钟 TextAppearance.TextClock：**56sp + tnum**（DisplayLarge 系）
- 城市数字钟 CityDigitalClockTextStyle 覆写：**`'wght' 500, 'ROND' 100, 'wdth' 100`**、letterSpacing 0
- 计时器倒计时 GastownTimerCountdownTextPausedStyle（暂停态）：**`'wght' 250, 'ROND' 100, 'wdth' 80`**
- 闹钟卡 TextTime：**36sp**（gastown_alarm_time_summary）
- 与 9.0 卷 §六「wght 300/wdth 70」对照：**9.3 已换轴**——wght 450 / wdth 80 为新基线
- Web 落点：仓库 `assets/fonts/roboto-flex-latin.woff2`（#190，opsz 8~144/wght 100~1000/
  wdth 25~151）；ROND 为 Google 专有轴（#190 方案 A：传入不近似，浏览器忽略）

## 四、关键组件实测值（全值见 gastown-values.tsv 2263 行 / 布局全文 layouts-resolved.txt）

| 组件 | 9.3 实测 |
|---|---|
| 闹钟卡 GastownAlarmMaterialCardViewStyle | cardCornerRadius **24dp**、cardElevation **0** |
| 闹钟卡结构 | 头行 Flexbox（pause_resume/workflow/•/days/upcoming/label α0.84）+ 表/watch 图标；次行 Flow=digital_clock(36sp)+MaterialSwitch；底行 silent/vibrate 图标+文 |
| 主时钟帧 gastown_main_clock_frame | AnalogClock **240dp 1:1**（w600dp 变体 300dp，marginTop 0/8dp，marginBottom 40dp/0）+ AutoSizingTextClock（56sp）+ 日期/天气/下次闹钟 Flow 行 + weather attribution 行 |
| 世界时钟列表 fragment_world_clock | 竖屏=城市 RecyclerView（paddingH 16dp / paddingB 112dp 给 FAB）；横屏 52% 分栏=左主时钟帧+右城市列表（DropShadowRecyclerView） |
| 世界时钟城市卡 gastown_world_clock_item | MaterialCardView（CityCardViewStyle）；paddingTop 16dp / paddingBottom 4dp / paddingH 20dp；city_name **24sp**；hours_ahead 16sp+weather（icon 20dp+temp 16sp）Flow 行 gap 8dp；digital_clock **57sp** 右列自 60% 竖 guideline；AnalogClock 76dp 可选 |
| 计时器键盘 gastown_timer_keypad_view | 3×4 MotionLayout：1-9/00/0/退格（gs_backspace_rond100 12dp）；TimerGastownSetupDigitButtonStyle=textAppearanceHeadlineLargeEmphasized(自动 6~32sp)/透明底/无 inset/constraintTag timer_digit |
| 计时器 setup gastown_timer_setup_fragment | 显示区 4%~96% guideline、display bottom 25%、action bottom 55%、actionView max 380dp；display 顶 16dp；一行式 AutoSizing 备胎 |
| 计时器显示 gastown_timer_display_view | 时/分/秒三列等宽 weight1 + 各自单位标签（16sp，TimerSetupDurationUnitStyle=BodyLarge/colorOnSurfaceVariant）占高 20%；TimerSetupDurationTextStyle=Time.DisplayLarge 系+tnum |
| 计时器预设 core_time_preset_view | 60~76dp 方格：period **25sp**（上，weight1.6）+ unit（下，weight1，colorOnSurfaceVariant 系 0x7f040158=colorOutline） |
| 计时器运行卡 gastown_timer_card | CircularProgressIndicator：indicatorSize **340dp** / trackThickness **12dp** / trackCornerRadius **6dp** / gap **12dp**（trackColor=colorOutlineVariant、indicatorColor=colorPrimary）；timer_text **80sp** tnum includeFontPadding=false；label 16sp；按钮 cornerRadius **512dp** + GastownTimerButtonStyleBase（bg=**colorSurfaceContainerHighest**、text=HeadlineSmall）；play_pause 48dp iconSize；delete 48dp（margin -12dp 外扩）；spacer 尺寸 6%/7.5% |
| 秒表 gastown_stopwatch_fragment | 时间文字顶部（GastownStopwatchTimeTextStyle，marginTop 16dp/minHeight 144dp@某 config）+ 中心圈速容器（minHeight 106dp）+ 底部按钮容器（margin 16dp）；横屏 guideline 16%/84% 等 4 config |
| 秒表圈速导航 gastown_stopwatch_center_fragment | 前后圈箭头按钮 **48dp**（padding 12dp，bg=gastown_stopwatch_nav_button_bg，tint=colorTertiary/gastown_nav_bg_selector=colorSurfaceContainerHighest 系） |
| 就寝 fragment_bedtime | 结构与 9.0 世代一致（RecyclerView 卡 + onboarding 引导），标签=就寝时间 |

## 五、9.0→9.3 语义级差异点（Web 重做依据）

1. **底栏回归**：9.3 主壳重新挂 gastown_nav_bar（8.x 曾移除）——md3 侧 v8.49「顶栏胶囊」决策按
   新证据翻面（铁律 1：新源码覆盖旧结论）。
2. **FAB 形态翻面**：v8.49「56×56/r16 方形 primary-container」→ 9.3 **80×80/r24 tertiary-container**。
3. **tab 图标全换**：animated-selector 双态矢量（960 viewport Google Symbols），非 Material
   Symbols ligature——Web 以内联 SVG 双 path（选中/未选）承载。
4. **标签**：睡眠时间 → **就寝时间**。
5. **计时器交互范式**：键盘直输（时/分/秒三列 + 单位标签 + 预设格）→ 运行卡环形进度（340dp/12dp）
   80sp 倒计时内嵌。
6. **可变字体轴值换代**：见 §三。
7. 预设值（core_time_preset_view 的取值集）在 dex 侧未取证（array 资源零命中）——Web 按常用预设
   1/3/5/10/15 分钟实现，诚实标注。

## 六、文件清单（本目录）

| 文件 | 说明 |
|---|---|
| `README.md` | 本卷结论（规格速查） |
| `axml-all93.txt` | 1,535 个 AXML 全文（1.2MB，同 9.0 卷口径） |
| `gastown-values.tsv` | 裁剪值表：31 布局引用面 + 命名资源 2,263 行（hexid/type/config/name/解码值） |
| `layouts-resolved.txt` | 31 个 Gastown/对照布局的 ID→名→值全解析文本（95KB） |
| `tab-icons.txt` | 5×2 tab 图标 + FAB 加号 + 表盘 drawable 原文 |

工具新增（`scripts/`）：`arsc-strresolve.py` / `arsc-values.py` / `resolve93.py` / `style-bag.py`
（均纯标准库，可复跑全链）。

## 交付纪律
- reference: 前缀提交（证据卷），代码施工走主会话 vX.YZ 版本号
- APK 原件不入库（19MB；#330 附件可复取）
