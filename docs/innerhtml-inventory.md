# innerHTML 数据来源分级清单（#274 一期 · 生成件）

> **生成器**：`scripts/audit-innerhtml.mjs`（默认 check 模式逐字节比对，`--write` 再生——生成件随树再生纪律）。
> **扫描面**：`ios-desktop/js` + `ios-desktop/apps`（除 vendor/）`.innerHTML =` 与 `.innerHTML +=` 赋值语句；语句级提取（括号/字符串/模板串平衡）。
> **三档口径**：A 零插值静态（内部常量）· B 有插值/动态 RHS 且语句内含 escape 助手（`escapeHtml` / `__mdEscape` / `sanitizeHtml`）· C 有插值/动态 RHS 未见 escape（**待人工定性面，非确认漏洞**）。
> **数据来源**：标识符启发词表（用户输入/网络/文件系统/内部），token 精确匹配，仅作二期排查引导；`内部` = 词表零命中。
> **快照**：package.json 11.26.0 · 总数 271 = A 136 + B 11 + C 124（守恒由 tests/innerhtml-inventory.test.js 守护）。
> **escape 上下文**：全扫描面 escape 助手调用共 68 处，多数在 builder 函数内预转义后返回成品片段——B 档只统计 innerHTML 语句内**直接可见**的 escape，故 B 计数 ≠ 「全库仅 B 处已转义」；C 档里的 builder 调用（`xxxHtml(...)` 形态）需进函数体定性，属二期逐条工作。

## 一、三档总览

| 档 | 含义 | 处数 | 占比 |
|---|---|---|---|
| A | 零插值静态 | 136 | 50.2% |
| B | 插值含 escape | 11 | 4.1% |
| C | 插值未见 escape（待人工定性） | 124 | 45.8% |
| 合计 | | 271 | 100% |

## 二、按文件 × 档汇总

| 文件 | A | B | C | 合计 |
|---|---|---|---|---|
| js/a11y-apply.js | 0 | 0 | 1 | 1 |
| js/all-apps.js | 1 | 0 | 1 | 2 |
| js/aod-ui.js | 3 | 0 | 1 | 4 |
| js/app-window.js | 0 | 0 | 3 | 3 |
| js/apps/appstore.js | 7 | 0 | 0 | 7 |
| js/apps/files.js | 11 | 0 | 5 | 16 |
| js/apps/installer.js | 3 | 0 | 6 | 9 |
| js/apps/recorder.js | 9 | 0 | 0 | 9 |
| js/apps/settings-appnotif.js | 2 | 0 | 0 | 2 |
| js/apps/settings-pages/apps.js | 4 | 0 | 0 | 4 |
| js/apps/settings-pages/notif.js | 3 | 0 | 0 | 3 |
| js/apps/settings-pages/statusbar.js | 1 | 0 | 0 | 1 |
| js/apps/settings-two-pane.js | 0 | 0 | 1 | 1 |
| js/apps/settings-wellbeing.js | 3 | 0 | 4 | 7 |
| js/apps/settings.js | 36 | 0 | 5 | 41 |
| js/at-a-glance.js | 1 | 1 | 2 | 4 |
| js/bubbles.js | 0 | 0 | 1 | 1 |
| js/clipboard-overlay-ui.js | 1 | 0 | 0 | 1 |
| js/context-menu.js | 0 | 0 | 2 | 2 |
| js/desktop.js | 2 | 0 | 1 | 3 |
| js/dock.js | 1 | 0 | 1 | 2 |
| js/dual-shade.js | 1 | 0 | 0 | 1 |
| js/folder.js | 3 | 1 | 2 | 6 |
| js/gestures.js | 1 | 0 | 2 | 3 |
| js/lock-quotes.js | 0 | 0 | 1 | 1 |
| js/lock-screen.js | 4 | 0 | 4 | 8 |
| js/m3-controls.js | 0 | 0 | 1 | 1 |
| js/m3e.js | 3 | 0 | 0 | 3 |
| js/mini-window.js | 0 | 0 | 2 | 2 |
| js/nav-bar.js | 1 | 0 | 0 | 1 |
| js/notifications.js | 2 | 5 | 9 | 16 |
| js/page-stack.js | 0 | 0 | 2 | 2 |
| js/permissions.js | 1 | 2 | 0 | 3 |
| js/quick-settings.js | 11 | 0 | 18 | 29 |
| js/recent-apps.js | 2 | 0 | 6 | 8 |
| js/screenshot-markup.js | 0 | 0 | 1 | 1 |
| js/search-service.js | 1 | 1 | 2 | 4 |
| js/share-sheet.js | 1 | 0 | 2 | 3 |
| js/sidebubble.js | 0 | 0 | 1 | 1 |
| js/split-groups.js | 0 | 0 | 1 | 1 |
| js/split-screen.js | 1 | 0 | 5 | 6 |
| js/status-bar.js | 0 | 0 | 6 | 6 |
| js/taskbar-transient.js | 2 | 0 | 0 | 2 |
| js/taskbar.js | 3 | 1 | 0 | 4 |
| js/theme-engine.js | 5 | 0 | 9 | 14 |
| js/volume-dialog.js | 4 | 0 | 4 | 8 |
| js/widget-board.js | 2 | 0 | 12 | 14 |

## 三、档 C 全量明细（124 处 · 二期清退输入：改 textContent / 补 escape / 显式豁免理由）

| 路径:行 | 数据来源 | 命中标识符 | 语句摘要 |
|---|---|---|---|
| js/a11y-apply.js:51 | 内部 | — | .innerHTML = buildDaltonizerDefsSvg(); |
| js/all-apps.js:352 | 用户输入 | content | .innerHTML = content; |
| js/aod-ui.js:73 | 内部 | — | .innerHTML = buildFaceHTML(face, { date: d, size: 'small', aod: true, fontStack: getActiveClockF |
| js/app-window.js:1510 | 内部 | — | .innerHTML = '<div class="launch-icon-container">${iconHTML}</div>'; |
| js/app-window.js:1984 | 内部 | — | .innerHTML = createDynamicIconHTML(state.currentApp.type, true); |
| js/app-window.js:1991 | 内部 | — | .innerHTML = '<div class="launch-icon">${getAppIconSVG(state.currentApp.id)}</div>'; |
| js/apps/files.js:420 | 内部 | — | .innerHTML = '<div class="grab"></div>' + html; |
| js/apps/files.js:644 | 内部 | — | .innerHTML = storageCardHtml() + '<div class="fj-sechead"><span class="h">分类</span></div>' + '<d |
| js/apps/files.js:885 | 内部 | — | .innerHTML = html; |
| js/apps/files.js:936 | 用户输入 | body | .innerHTML = body; |
| js/apps/files.js:1286 | 内部 | — | .innerHTML = html; |
| js/apps/installer.js:232 | 内部 | — | .innerHTML = (window.__appIconProbe && window.__appIconProbe.svg('installer')) \|\| FALLBACK_ICON; |
| js/apps/installer.js:240 | 内部 | — | .innerHTML = EMPTY_NOAPI; |
| js/apps/installer.js:245 | 内部 | — | .innerHTML = EMPTY_PENDING; |
| js/apps/installer.js:262 | 内部 | — | .innerHTML = h; |
| js/apps/installer.js:270 | 内部 | — | .innerHTML = EMPTY_INSTALLED; |
| js/apps/installer.js:290 | 内部 | — | .innerHTML = h; |
| js/apps/settings-two-pane.js:501 | 用户输入 | content | .innerHTML = pages[pageIdx].content; |
| js/apps/settings-wellbeing.js:146 | 用户输入 | name | .innerHTML = apps.map((id) => ' <button type="button" class="wb-focus-chip" data-test="wellbeing |
| js/apps/settings-wellbeing.js:183 | 用户输入 | name | .innerHTML = ids.map((id) => { const used = usedTodayMs(id); const limit = limits[id] \|\| 0; cons |
| js/apps/settings-wellbeing.js:229 | 内部 | — | .innerHTML = buildRingSvg(rows, total); |
| js/apps/settings-wellbeing.js:265 | 内部 | — | .innerHTML = items; |
| js/apps/settings.js:2114 | 内部 | — | .innerHTML = bar(quota ? usage / quota * 100 : 0, 215); |
| js/apps/settings.js:3081 | 内部 | — | .innerHTML = html; |
| js/apps/settings.js:3086 | 内部 | — | .innerHTML = html2; |
| js/apps/settings.js:3105 | 内部 | — | .innerHTML = html3; |
| js/apps/settings.js:3130 | 内部 | — | .innerHTML = h4; |
| js/at-a-glance.js:213 | 内部 | — | .innerHTML = ' <span class="glance-weather-icon">${currentWeather.icon}</span> <span class="glan |
| js/at-a-glance.js:244 | 用户输入 | note text title | .innerHTML = ' <div class="glance-main-row"> <div class="glance-date" id="glanceDateText">${date |
| js/bubbles.js:107 | 内部 | — | .innerHTML = '<span class="bubble-badge__icon">${resolveNotiIcon(item)}</span>'; |
| js/context-menu.js:235 | 用户输入 | name text title | .innerHTML = ' <div class="menu-header"> <div class="menu-header-icon">${getAppIconSVG(app.id)}< |
| js/context-menu.js:292 | 内部 | — | .innerHTML = renderShortcutList(); |
| js/desktop.js:65 | 用户输入 | content name | .innerHTML = ' <div class="icon-box"> ${boxContent} </div> <span>${app.name}</span> <div class=" |
| js/dock.js:216 | 内部 | — | .innerHTML = html; |
| js/folder.js:135 | 用户输入 | content name | .innerHTML = ' <div class="icon-box">${boxContent}</div> <span>${app.name}</span> '; |
| js/folder.js:374 | 用户输入 | name | .innerHTML = '<div class="icon-box">${iconHTML}</div><span>${app.name}</span>'; |
| js/gestures.js:370 | 内部 | — | .innerHTML = app.type ? createDynamicIconHTML(app.type, false) : getAppIconSVG(target.appId); |
| js/gestures.js:377 | 内部 | — | .innerHTML = QS_EDGE_ICON; |
| js/lock-quotes.js:305 | 用户输入 | text | .innerHTML = '<div class="lock-quote-text">${esc(q.t)}</div>' + '<div class="lock-quote-src">——$ |
| js/lock-screen.js:284 | 内部 | — | .innerHTML = buildFaceHTML(face, { date: d, size: 'small', fontStack: stack, animate, customConf |
| js/lock-screen.js:285 | 内部 | — | .innerHTML = buildFaceHTML(face, { date: d, size: 'large', fontStack: stack, animate, customConf |
| js/lock-screen.js:407 | 用户输入 | body desc title | .innerHTML = ' <div class="lock-noti-icon ${isRealAppIcon(item) ? 'lock-noti-icon--app' : ''}">$ |
| js/lock-screen.js:459 | 用户输入 | content label | .innerHTML = ' <div class="lock-wallpaper"></div> <div class="lock-dim"></div> <div class="lock- |
| js/m3-controls.js:455 | 内部 | — | .innerHTML = ' <div class="m3-slider-root" role="slider" aria-valuemin="${min}" aria-valuemax="$ |
| js/mini-window.js:183 | 用户输入 | label name title | .innerHTML = '<div class="mini-header">' // v7.61：子页导航返回键（推入子页后显示；小窗窄格局不走全局页栈） + '<button class= |
| js/mini-window.js:559 | 内部 | — | .innerHTML = getAppIconSVG(appId); |
| js/notifications.js:229 | 内部 | — | .innerHTML = '${ICONS.clear_all}<span>清除全部</span>'; |
| js/notifications.js:242 | 内部 | — | .innerHTML = '${ICONS.history}<span>历史记录</span>'; |
| js/notifications.js:269 | 用户输入 | text | .innerHTML = ' <div style="text-align:center;padding:50px 20px;opacity:0.6;font-size:14px;displa |
| js/notifications.js:516 | 内部 | — | .innerHTML = ' <span>已延后</span> <span style="font-size:11px;opacity:0.7;">${snoozedNotis.length} |
| js/notifications.js:590 | 用户输入 | search | .innerHTML = ICONS.song_search \|\| ICONS.media_play; |
| js/notifications.js:592 | 内部 | — | .innerHTML = ICONS.skip_prev; |
| js/notifications.js:600 | 内部 | — | .innerHTML = ICONS.skip_next; |
| js/notifications.js:664 | 用户输入 | search | .innerHTML = ICONS.song_search \|\| ICONS.media_play; |
| js/notifications.js:676 | 内部 | — | .innerHTML = state.isPlaying ? ICONS.pause : ICONS.play; |
| js/page-stack.js:62 | 用户输入 | content | .innerHTML = page.content; |
| js/page-stack.js:121 | 用户输入 | content | .innerHTML = page.content; |
| js/quick-settings.js:213 | 内部 | — | .innerHTML = ICONS.edit; |
| js/quick-settings.js:223 | 内部 | — | .innerHTML = ICONS.settings; |
| js/quick-settings.js:244 | 内部 | — | .innerHTML = ICONS.power; |
| js/quick-settings.js:298 | 内部 | — | .innerHTML = ICONS.cellular; |
| js/quick-settings.js:458 | 内部 | — | .innerHTML = iconHtml; |
| js/quick-settings.js:460 | 用户输入 | name text title | .innerHTML = ' ${iconHtml} <div class="qs-tile-text"> <span class="qs-tile-title">${tile.name}</ |
| js/quick-settings.js:738 | 内部 | — | .innerHTML = ICONS[iconKey] \|\| wrap.innerHTML; |
| js/quick-settings.js:864 | 内部 | — | .innerHTML = ' <div style="font-size:48px;margin-bottom:12px;">${ICONS.torch}</div> <div style=" |
| js/quick-settings.js:1179 | 内部 | — | .innerHTML = '<span class="toast-icon">${iconSvg}</span>'; |
| js/quick-settings.js:1352 | 内部 | — | .innerHTML = svg; |
| js/quick-settings.js:1353 | 内部 | — | .innerHTML = svg; |
| js/quick-settings.js:1447 | 用户输入 | note | .innerHTML = ICONS.music_note \|\| ICONS.library_music \|\| ICONS.headphones; |
| js/quick-settings.js:1458 | 内部 | — | .innerHTML = state.isPlaying ? ICONS.pause : ICONS.play; |
| js/quick-settings.js:1752 | 内部 | — | .innerHTML = ICONS.back; |
| js/quick-settings.js:1756 | 内部 | — | .innerHTML = '${ICONS.undo} <span>Undo</span>'; |
| js/quick-settings.js:1830 | 用户输入 | name text title | .innerHTML = ' <div class="qs-tile-icon-wrap">${iconSvg}</div> <div class="qs-tile-text"> <span  |
| js/quick-settings.js:1882 | 用户输入 | name text title | .innerHTML = ' <div class="qs-tile-icon-wrap">${iconSvg}</div> <div class="qs-tile-text"> <span  |
| js/quick-settings.js:2109 | 用户输入 | label | .innerHTML = '${ICONS[def.icon]}<span>${def.label}</span>'; |
| js/recent-apps.js:271 | 内部 | — | .innerHTML = ' <div class="recent-apps-container" id="recentAppsContainer"> <div class="recent-c |
| js/recent-apps.js:417 | 用户输入 | desc name prompt title | .innerHTML = ' <div class="sp-prompt"> <div class="sp-prompt-title">${PINNING_STRINGS.screen_pin |
| js/recent-apps.js:507 | 内部 | — | .innerHTML = ' <div class="recent-empty-state"> <div class="recent-empty-illustration">${VECTOR_ |
| js/recent-apps.js:729 | 用户输入 | content name title | .innerHTML = ' <div class="recent-card-header"> <div class="recent-card-icon">${iconHTML}</div>  |
| js/recent-apps.js:793 | 用户输入 | name title | .innerHTML = ' <div class="recent-card-header"> <div class="recent-card-icon" style="display:fle |
| js/recent-apps.js:2001 | 网络 | url | .innerHTML = '<img src="${pendingShot.dataUrl}" alt="截屏缩略图">'; |
| js/screenshot-markup.js:169 | 用户输入 | label | .innerHTML = '<canvas class="mk-canvas" width="${shot.width}" height="${shot.height}" aria-label |
| js/search-service.js:248 | 用户输入 | search title | .innerHTML = ' <div class="search-pill-left"> <span class="search-g-logo">G</span> <span class=" |
| js/search-service.js:310 | 用户输入 | chat input query search text | .innerHTML = ' <div class="search-modal-card"> <div class="search-input-box"> <span class="searc |
| js/share-sheet.js:281 | 内部 | — | .innerHTML = html; |
| js/share-sheet.js:314 | 内部 | — | .innerHTML = directHtml + gridHtml; |
| js/sidebubble.js:331 | 内部 | — | .innerHTML = getAppIconSVG(appId); |
| js/split-groups.js:165 | 内部 | — | .innerHTML = buildPairIconHTML(group.aId, group.bId); |
| js/split-screen.js:187 | 用户输入 | name title | .innerHTML = ' <div class="app-header"><span class="split-pane-title">${app.name}</span></div> < |
| js/split-screen.js:199 | 用户输入 | content | .innerHTML = page.content; |
| js/split-screen.js:203 | 用户输入 | content | .innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;">  |
| js/split-screen.js:327 | 内部 | — | .innerHTML = ' <span class="pane-swap-icon">${getAppIconSVG(pane.app.id)}</span> <span class="pa |
| js/split-screen.js:968 | 内部 | — | .innerHTML = buildPairIconHTML(aId, bId); |
| js/status-bar.js:101 | 内部 | — | .innerHTML = html; |
| js/status-bar.js:120 | 内部 | — | .innerHTML = html; |
| js/status-bar.js:274 | 内部 | — | .innerHTML = html; |
| js/status-bar.js:370 | 内部 | — | .innerHTML = wifiConnected ? ICONS.wifi : ICONS.wifi_off; |
| js/status-bar.js:394 | 内部 | — | .innerHTML = getStatusBarInnerHtml(true); |
| js/status-bar.js:404 | 内部 | — | .innerHTML = getStatusBarInnerHtml(false); |
| js/theme-engine.js:436 | 用户输入 | body label title | .innerHTML = ' <div class="theme-picker-card" id="themePickerCard"> <div class="theme-picker-hea |
| js/theme-engine.js:597 | 用户输入 | name | .innerHTML = PROCEDURAL_PRESETS.map((p, i) => ' <div class="wallpaper-thumb-card proc-card ${i = |
| js/theme-engine.js:630 | 用户输入 | name | .innerHTML = PRESET_WALLPAPERS.map((w, idx) => ' <div class="wallpaper-thumb-card" data-idx="${i |
| js/theme-engine.js:919 | 用户输入 | content label name note text title | .innerHTML = ' <div style="padding:16px 0;"> <!-- v8.08 #23 差距矩阵⑥ AOSP 来源区：wallpaper_settings.xm |
| js/theme-engine.js:1301 | 用户输入 | label name title | .innerHTML = PRESET_COLORS.map((p) => ' <div data-tc-preset="${p.hex}" data-test="tc-preset-${p. |
| js/theme-engine.js:1319 | 用户输入 | desc label name title | .innerHTML = MONET_STYLES.map((s) => ' <button data-tc-style="${s.name}" data-test="tc-style-${s |
| js/theme-engine.js:1338 | 用户输入 | title | .innerHTML = ramp.map((r) => ' <div data-tc-ramp="${r.hex}" title="${r.hex}" style="flex:1;backg |
| js/theme-engine.js:1469 | 用户输入 | content name | .innerHTML = PROCEDURAL_PRESETS.map((p, i) => ' <div class="wallpaper-thumb-card proc-card ${i = |
| js/theme-engine.js:1517 | 用户输入 | name text | .innerHTML = PRESET_WALLPAPERS.map((w, idx) => ' <div class="wallpaper-thumb-card" data-idx="${i |
| js/volume-dialog.js:163 | 内部 | — | .innerHTML = (ICONS[st.icon] \|\| ICONS.volume) \|\| (currentVolume === 0 ? (ICONS.volume_media_mute |
| js/volume-dialog.js:292 | 内部 | — | .innerHTML = ringerIcon(mode); |
| js/volume-dialog.js:552 | 用户输入 | label note text | .innerHTML = ' <div class="mo-scrim"></div> <div class="mo-card"> <header class="mo-header">媒体输出 |
| js/volume-dialog.js:907 | 内部 | — | .innerHTML = ICONS.ellipsis; |
| js/widget-board.js:276 | 内部 | — | .innerHTML = SVG_WIDGETS; |
| js/widget-board.js:307 | 内部 | — | .innerHTML = ' <div class="wb-weather"> <div class="wb-weather-icon">${w.icon \|\| ICONS.weather_s |
| js/widget-board.js:319 | 内部 | — | .innerHTML = ' <div class="wb-schedule"> <div class="wb-schedule-head"><span class="wb-schedule- |
| js/widget-board.js:328 | 用户输入 | label title | .innerHTML = ' <div class="wb-music"> <div class="wb-music-info"> <div class="wb-music-title" da |
| js/widget-board.js:347 | 内部 | — | .innerHTML = ' <div class="wb-battery"> <span class="wb-battery-bolt" data-wb-bolt>${ICONS.bolt} |
| js/widget-board.js:357 | 用户输入 | label | .innerHTML = ' <div class="wb-shortcuts"> <button class="wb-sc" data-wb-sc="torch" aria-label="手 |
| js/widget-board.js:403 | 内部 | — | .innerHTML = ms && ms.isPlaying ? ICONS.pause : SVG_PLAY; |
| js/widget-board.js:466 | 内部 | — | .innerHTML = w.icon; |
| js/widget-board.js:623 | 内部 | — | .innerHTML = ' <div class="wsm-item" data-wsm="widgets"><span class="wsm-icon">${SVG_WIDGETS}</s |
| js/widget-board.js:680 | 用户输入 | label | .innerHTML = ' <div class="wsm-item" data-wcm="hide" role="button" tabindex="0" aria-label="隐藏小工 |
| js/widget-board.js:728 | 用户输入 | label title | .innerHTML = ' <div class="wp-scrim"></div> <div class="wp-sheet"> <header class="wp-header"> <s |
| js/widget-board.js:1088 | 内部 | — | .innerHTML = '<span class="wtz-icon">${SVG_WIDGETS}</span><span>拖到此处移除</span>'; |

## 四、档 B 全量明细（11 处 · 已见 escape，核对 escape 是否覆盖全部插值点）

| 路径:行 | 数据来源 | 语句摘要 |
|---|---|---|
| js/at-a-glance.js:55 | 用户输入 | .innerHTML = pinnedCities.map((c) => ' <div class="glance-chip glance-city-chip" data-city-id="$ |
| js/folder.js:99 | 用户输入 | .innerHTML = ' <div class="folder-icon">${thumbsHTML}</div> <span>${window.__mdEscape(folder.nam |
| js/notifications.js:291 | 内部 | .innerHTML = ' <span>${escapeHtml(cat)}</span> <span style="font-size:11px;opacity:0.7;">${categ |
| js/notifications.js:312 | 用户输入 | .innerHTML = ' <div class="noti-card-icon ${realIcon ? 'noti-card-icon--app' : ''}">${resolveNot |
| js/notifications.js:530 | 用户输入 | .innerHTML = ' <div class="noti-card-icon">${resolveNotiIcon(item)}</div> <div class="noti-card- |
| js/notifications.js:882 | 用户输入 | .innerHTML = ' <div role="dialog" aria-label="通知类别" style="width:min(86vw,360px);max-height:70vh |
| js/notifications.js:1124 | 用户输入 | .innerHTML = ' <div style="${bannerIconStyle}"> ${resolveNotiIcon(item)} </div> <div style="flex |
| js/permissions.js:400 | 用户输入 | .innerHTML = ' <div class="power-dialog-card" role="alertdialog" aria-label="权限请求"> <div data-vi |
| js/permissions.js:467 | 用户输入 | .innerHTML = names.map((n) => ' <label data-picker-item style="display:flex;align-items:center;g |
| js/search-service.js:460 | 用户输入 | .innerHTML = ' <div class="search-section-title">${headerText}</div> <div class="search-items-wr |
| js/taskbar.js:127 | 用户输入 | .innerHTML = overflow.map((id) => { const app = appById(id); const name = app ? app.name : id; c |

## 五、档 A 按文件行号聚合（136 处 · 零插值静态，低风险）

- js/all-apps.js（1）：205
- js/aod-ui.js（3）：39, 59, 60
- js/apps/appstore.js（7）：193, 208, 297, 298, 299, 300, 382
- js/apps/files.js（11）：256, 260, 658, 662, 733, 765, 809, 820, 859, 1246, 1315
- js/apps/installer.js（3）：199, 346, 377
- js/apps/recorder.js（9）：287, 355, 358, 569, 594, 606, 607, 615, 681
- js/apps/settings-appnotif.js（2）：67, 89
- js/apps/settings-pages/apps.js（4）：62, 105, 212, 225
- js/apps/settings-pages/notif.js（3）：58, 61, 92
- js/apps/settings-pages/statusbar.js（1）：43
- js/apps/settings-wellbeing.js（3）：143, 180, 245
- js/apps/settings.js（36）：857, 859, 1385, 1387, 1396, 1662, 1664, 1673, 1693, 1903, 1904, 1906, 1930, 2023, 2096, 2099, 2104, 2105, 2137, 2149, 2157, 2163, 2165, 2451, 2456, 2540, 2563, 2674, 2809, 2819, 2843, 2863, 3109, 3122, 3139, 3753
- js/at-a-glance.js（1）：51
- js/clipboard-overlay-ui.js（1）：42
- js/desktop.js（2）：20, 21
- js/dock.js（1）：473
- js/dual-shade.js（1）：105
- js/folder.js（3）：119, 153, 356
- js/gestures.js（1）：316
- js/lock-screen.js（4）：281, 389, 393, 911
- js/m3e.js（3）：508, 514, 545
- js/nav-bar.js（1）：401
- js/notifications.js（2）：279, 656
- js/permissions.js（1）：465
- js/quick-settings.js（11）：392, 393, 643, 913, 1498, 1521, 1527, 1545, 1822, 1862, 2126
- js/recent-apps.js（2）：1851, 2012
- js/search-service.js（1）：456
- js/share-sheet.js（1）：217
- js/split-screen.js（1）：694
- js/taskbar-transient.js（2）：185, 412
- js/taskbar.js（3）：117, 118, 318
- js/theme-engine.js（5）：1226, 1337, 1606, 1643, 1686
- js/volume-dialog.js（4）：463, 473, 639, 751
- js/widget-board.js（2）：298, 759

## 六、二期口径备忘（#274 处置建议 ②③④ 不在本件）

- **② 清退**：以档 C 明细为输入逐条定性——用户输入可达点改 `textContent` / 补 escape，或写明「内部受控数据」显式豁免理由；
- **③ CSP 试点**：高风险面集中后评估 report-only CSP 范围（配套议题）；
- **④ 契约**：「新增 innerHTML 需注释标注数据来源」纳入 check:comments（配套议题）。
