# window.__ 全局命名空间登记表（v10.48 #242）

> **本文档由 `node scripts/scan-globals.mjs` 生成**（单一真源 = `docs/globals-registry.json`，本 md 供人读）
> 手工编辑无效——修改分类请改脚本内 `CURATED_KINDS` 后重新生成；源树出现未登记全局时构建与 CI 双闸 fail（vite.config.js 断言 + tests/v242 一致性锚）。

## 背景（#242）

#226 修复了 stopwatch 顶层直读 `window.__clockCore` 崩溃的单点，但其土壤——无登记的全局命名空间——此前是全库常态。本表把「谁定义、谁消费、属于什么类别」固化为可机检清单：

- **sdk-facade**：刻意契约的 SDK 门面/共享组件挂载点（__system / __m3eMini / __m3ePull / __pkgInstallerAPI / __chatbotCore / __messagesRichCore 等），消费方以守卫式访问（`window.__X &&`）为契约；
- **test-hook**：测试钩子（*Test 命名或人工确认），仅供自动化锚定；
- **implicit-coupling**：模块间隐式耦合——classic script 暴露、他处消费（#226 型加载顺序脆弱点所在），**整改方向 = 惰性访问器**（alarm instCore / v10.36 ensureSw 范式已在库，推广即可不新造轮子）。

## 清单（共 258 个全局）

| 名字 | 类别 | 定义文件（window.__X =） | 消费文件数 | 消费文件 |
|---|---|---|---|---|
| __APP_SHORTCUTS_EXTRA | implicit-coupling | （无赋值形态·仅读取） | 1 | `ios-desktop/js/context-menu.js` |
| __THREE__ | implicit-coupling | `ios-desktop/apps/_shared/vendor/three.module.js` | 1 | `ios-desktop/apps/_shared/vendor/three.module.js` |
| __a11yApplyRuntime | implicit-coupling | `ios-desktop/js/a11y-apply.js` | 2 | `ios-desktop/js/a11y-apply.js`<br>`ios-desktop/js/apps/settings.js` |
| __a11yLoadStore | implicit-coupling | `ios-desktop/js/a11y-apply.js` | 1 | `ios-desktop/js/a11y-apply.js` |
| __a11yRbcChange | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __a17MediaButton | implicit-coupling | `ios-desktop/apps/music/index.html` | 1 | `ios-desktop/apps/music/index.html` |
| __a17MediaWave | implicit-coupling | `ios-desktop/apps/music/index.html` | 1 | `ios-desktop/apps/music/index.html` |
| __aboutV826 | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __addAppCleanup | implicit-coupling | `ios-desktop/js/page-stack.js` | 4 | `ios-desktop/js/apps/files.js` …等 4 处 |
| __alarmRingtoneProbe | implicit-coupling | `ios-desktop/apps/clock-app/alarm.mjs` | 1 | `ios-desktop/apps/clock-app/alarm.mjs` |
| __alarmStateProbe | implicit-coupling | `ios-desktop/apps/clock-app/alarm.mjs` | 1 | `ios-desktop/apps/clock-app/alarm.mjs` |
| __allApps | implicit-coupling | `ios-desktop/js/all-apps.js` | 2 | `ios-desktop/js/all-apps.js`<br>`ios-desktop/js/quick-settings.js` |
| __allAppsActive | implicit-coupling | `ios-desktop/js/all-apps.js` | 1 | `ios-desktop/js/all-apps.js` |
| __allAppsDebug | implicit-coupling | `ios-desktop/js/all-apps.js` | 1 | `ios-desktop/js/all-apps.js` |
| __animPresets | implicit-coupling | `ios-desktop/js/animation-presets.js` | 3 | `ios-desktop/js/animation-presets.js`<br>`ios-desktop/js/app-window.js`<br>`ios-desktop/js/apps/settings.js` |
| __aodTest | test-hook | `ios-desktop/js/aod-ui.js` | 1 | `ios-desktop/js/aod-ui.js` |
| __appBus | implicit-coupling | `ios-desktop/js/app-bus.js` | 1 | `ios-desktop/js/app-bus.js` |
| __appClosed | implicit-coupling | `ios-desktop/apps/clock-app/app.mjs` | 1 | `ios-desktop/apps/clock-app/app.mjs` |
| __appDataRegistry | implicit-coupling | `ios-desktop/js/app-data-registry.js` | 2 | `ios-desktop/js/app-data-registry.js`<br>`ios-desktop/js/apps/settings.js` |
| __appFreeze | implicit-coupling | `ios-desktop/apps/freeze-shim.js` | 1 | `ios-desktop/apps/freeze-shim.js` |
| __appIconProbe | implicit-coupling | `ios-desktop/js/main.js` | 2 | `ios-desktop/js/apps/installer.js`<br>`ios-desktop/js/main.js` |
| __appResume | implicit-coupling | `ios-desktop/apps/freeze-shim.js` | 1 | `ios-desktop/apps/freeze-shim.js` |
| __archiveCore | implicit-coupling | `ios-desktop/apps/archive/core.js` | 2 | `ios-desktop/apps/archive/core.js`<br>`ios-desktop/apps/archive/index.html` |
| __asAcquire | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asAskUninstall | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asBoot | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asCatalogCore | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asConfirmCancel | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asConfirmOk | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asExtAdd | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asExtRemoveAsk | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asExtRemoveCancel | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asExtRemoveOk | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asImport | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asLoadCatalog | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asOpenDetail | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asRefresh | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __asToast | implicit-coupling | `ios-desktop/js/apps/appstore.js` | 1 | `ios-desktop/js/apps/appstore.js` |
| __audioGraphTest | test-hook | `ios-desktop/js/volume-dialog.js` | 1 | `ios-desktop/js/volume-dialog.js` |
| __backPillDebug | implicit-coupling | `ios-desktop/js/back-pill.js` | 1 | `ios-desktop/js/back-pill.js` |
| __batteryGetState | implicit-coupling | `ios-desktop/js/battery-service.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/battery-service.js` |
| __batterySim | implicit-coupling | `ios-desktop/js/battery-service.js` | 1 | `ios-desktop/js/battery-service.js` |
| __bgFreeze | implicit-coupling | `ios-desktop/js/bg-freeze.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/bg-freeze.js` |
| __bindAppDocListener | implicit-coupling | `ios-desktop/js/page-stack.js` | 4 | `ios-desktop/js/apps/files.js` …等 4 处 |
| __blurBakeTest | test-hook | `ios-desktop/js/desktop-blur.js` | 2 | `ios-desktop/js/desktop-blur.js`<br>`ios-desktop/js/video-wallpaper.js` |
| __bubblesDebug | implicit-coupling | `ios-desktop/js/bubbles.js` | 1 | `ios-desktop/js/bubbles.js` |
| __bytebeatCore | implicit-coupling | `ios-desktop/js/bytebeat-core.js` | 2 | `ios-desktop/apps/bytebeat/index.html`<br>`ios-desktop/js/bytebeat-core.js` |
| __cameraCore | implicit-coupling | `ios-desktop/apps/camera/core.js` | 2 | `ios-desktop/apps/camera/core.js`<br>`ios-desktop/apps/camera/index.html` |
| __ceDeepLink | implicit-coupling | `ios-desktop/apps/code-editor/app.mjs`<br>`ios-desktop/apps/code-editor/index.html` | 2 | `ios-desktop/apps/code-editor/app.mjs`<br>`ios-desktop/apps/code-editor/index.html` |
| __channelDebug | implicit-coupling | `ios-desktop/js/notifications.js` | 1 | `ios-desktop/js/notifications.js` |
| __chatbotCore | sdk-facade | `ios-desktop/js/chatbot-core.js` | 2 | `ios-desktop/apps/messages/index.html`<br>`ios-desktop/js/chatbot-core.js` |
| __chessCore | implicit-coupling | `ios-desktop/js/chess-core.js` | 2 | `ios-desktop/apps/chess/index.html`<br>`ios-desktop/js/chess-core.js` |
| __chessTest | test-hook | `ios-desktop/apps/chess/index.html` | 1 | `ios-desktop/apps/chess/index.html` |
| __clipboard | implicit-coupling | `ios-desktop/js/clipboard.js` | 3 | `ios-desktop/js/apps/files.js`<br>`ios-desktop/js/clipboard.js`<br>`ios-desktop/js/share-sheet.js` |
| __clipboardOverlayTest | test-hook | `ios-desktop/js/clipboard-overlay-ui.js` | 1 | `ios-desktop/js/clipboard-overlay-ui.js` |
| __clock | implicit-coupling | （无赋值形态·仅读取） | 1 | `ios-desktop/apps/clock-app/alarm.mjs` |
| __clockAlarmSilenceMin | implicit-coupling | （无赋值形态·仅读取） | 1 | `ios-desktop/apps/clock-app/alarm.mjs` |
| __clockAlarmSnoozeMin | implicit-coupling | （无赋值形态·仅读取） | 1 | `ios-desktop/apps/clock-app/alarm.mjs` |
| __clockAlarmVolumePct | implicit-coupling | `ios-desktop/apps/clock-app/alarm.mjs` | 1 | `ios-desktop/apps/clock-app/alarm.mjs` |
| __clockCore | implicit-coupling | `ios-desktop/js/clock-core.js` | 9 | `ios-desktop/apps/clock-app/alarm.mjs` …等 9 处 |
| __clockCrescendoProbe | implicit-coupling | `ios-desktop/apps/clock-app/alarm.mjs` | 1 | `ios-desktop/apps/clock-app/alarm.mjs` |
| __clockCrescendoProbeCapture | implicit-coupling | `ios-desktop/apps/clock-app/alarm.mjs` | 1 | `ios-desktop/apps/clock-app/alarm.mjs` |
| __clockPhoneMode | implicit-coupling | （无赋值形态·仅读取） | 1 | `ios-desktop/apps/clock-app/alarm.mjs` |
| __clockRingGainFromVolumes | implicit-coupling | `ios-desktop/apps/clock-app/alarm.mjs` | 1 | `ios-desktop/apps/clock-app/alarm.mjs` |
| __clockTestRing | implicit-coupling | `ios-desktop/apps/clock-app/alarm.mjs` | 1 | `ios-desktop/apps/clock-app/alarm.mjs` |
| __clockTimerRingtonePick | implicit-coupling | `ios-desktop/apps/clock-app/alarm.mjs` | 1 | `ios-desktop/apps/clock-app/alarm.mjs` |
| __clockTimerTickProbe | implicit-coupling | `ios-desktop/apps/clock-app/timer.mjs` | 1 | `ios-desktop/apps/clock-app/timer.mjs` |
| __closeRecentApps | implicit-coupling | `ios-desktop/js/recent-apps.js` | 3 | `ios-desktop/js/app-window.js`<br>`ios-desktop/js/performance.js`<br>`ios-desktop/js/recent-apps.js` |
| __closeThemePicker | implicit-coupling | `ios-desktop/js/theme-engine.js` | 2 | `ios-desktop/js/app-window.js`<br>`ios-desktop/js/theme-engine.js` |
| __closeThemePickerAnimated | implicit-coupling | `ios-desktop/js/theme-engine.js` | 2 | `ios-desktop/js/performance.js`<br>`ios-desktop/js/theme-engine.js` |
| __codeEditorCore | implicit-coupling | `ios-desktop/js/code-editor-core.js` | 2 | `ios-desktop/apps/code-editor/app.mjs`<br>`ios-desktop/js/code-editor-core.js` |
| __connDevAdd | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __cwApp | implicit-coupling | `ios-desktop/apps/music/index.html` | 1 | `ios-desktop/apps/music/index.html` |
| __dataBackup | implicit-coupling | `ios-desktop/js/data-backup.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/data-backup.js` |
| __dbg3 | implicit-coupling | `ios-desktop/js/pull-down-gesture.js` | 1 | `ios-desktop/js/pull-down-gesture.js` |
| __dbg4 | implicit-coupling | `ios-desktop/js/notifications.js` | 1 | `ios-desktop/js/notifications.js` |
| __demoAction | implicit-coupling | `ios-desktop/js/main.js` | 2 | `ios-desktop/js/apps/mail.js`<br>`ios-desktop/js/main.js` |
| __desktopPrefs | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __desktopPrefsInternal | implicit-coupling | `ios-desktop/js/desktop-prefs.js` | 1 | `ios-desktop/js/desktop-prefs.js` |
| __devOptions | implicit-coupling | `ios-desktop/js/dev-options.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/dev-options.js` |
| __dialer | implicit-coupling | `ios-desktop/apps/phone/index.html` | 1 | `ios-desktop/apps/phone/index.html` |
| __diceCore | implicit-coupling | （无赋值形态·仅读取） | 2 | `ios-desktop/apps/dice/core.js`<br>`ios-desktop/apps/dice/index.html` |
| __dockPrefs | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __drawCircleCore | implicit-coupling | `ios-desktop/apps/drawcircle/core.js` | 2 | `ios-desktop/apps/drawcircle/core.js`<br>`ios-desktop/apps/drawcircle/index.html` |
| __drawCircleUI | implicit-coupling | `ios-desktop/apps/drawcircle/index.html` | 1 | `ios-desktop/apps/drawcircle/index.html` |
| __drivingCore | implicit-coupling | `ios-desktop/js/driving-core.js` | 2 | `ios-desktop/apps/driving/index.html`<br>`ios-desktop/js/driving-core.js` |
| __drivingDeepLink | implicit-coupling | `ios-desktop/apps/driving/index.html` | 1 | `ios-desktop/apps/driving/index.html` |
| __drivingJump | implicit-coupling | `ios-desktop/apps/driving/index.html` | 1 | `ios-desktop/apps/driving/index.html` |
| __dualShade | implicit-coupling | `ios-desktop/js/dual-shade.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/dual-shade.js` |
| __extShellLoad | implicit-coupling | `ios-desktop/js/external-shell.js` | 2 | `ios-desktop/js/external-shell.js`<br>`ios-desktop/js/iframe-app.js` |
| __filesCore | implicit-coupling | `ios-desktop/js/files-core.js` | 2 | `ios-desktop/js/apps/files.js`<br>`ios-desktop/js/files-core.js` |
| __filesPB | implicit-coupling | `ios-desktop/js/apps/files.js` | 2 | `ios-desktop/js/apps/files.js`<br>`ios-desktop/js/main.js` |
| __findTarget | implicit-coupling | `ios-desktop/js/app-window.js` | 1 | `ios-desktop/js/app-window.js` |
| __fjIc | implicit-coupling | `ios-desktop/js/apps/files.js` | 1 | `ios-desktop/js/apps/files.js` |
| __focus | implicit-coupling | `ios-desktop/js/focus.js` | 2 | `ios-desktop/js/focus.js`<br>`ios-desktop/js/quick-settings.js` |
| __forceLaunchSettle | implicit-coupling | `ios-desktop/js/app-window.js` | 1 | `ios-desktop/js/app-window.js` |
| __freezeShimInstalled | implicit-coupling | `ios-desktop/apps/freeze-shim.js` | 1 | `ios-desktop/apps/freeze-shim.js` |
| __fxCore | implicit-coupling | `ios-desktop/js/fx-core.js` | 2 | `ios-desktop/apps/calculator/index.html`<br>`ios-desktop/js/fx-core.js` |
| __g2048 | implicit-coupling | `ios-desktop/apps/game2048/index.html` | 1 | `ios-desktop/apps/game2048/index.html` |
| __game2048Core | implicit-coupling | `ios-desktop/apps/game2048/core.js` | 2 | `ios-desktop/apps/game2048/core.js`<br>`ios-desktop/apps/game2048/index.html` |
| __getAppIconSVG | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __getUnlockAnimStyle | implicit-coupling | `ios-desktop/js/main.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/main.js` |
| __globalActions | implicit-coupling | `ios-desktop/js/quick-settings.js` | 1 | `ios-desktop/js/quick-settings.js` |
| __gravityCore | implicit-coupling | `ios-desktop/apps/gravity/core.js` | 2 | `ios-desktop/apps/gravity/core.js`<br>`ios-desktop/apps/gravity/index.html` |
| __gravityUI | implicit-coupling | `ios-desktop/apps/gravity/index.html` | 1 | `ios-desktop/apps/gravity/index.html` |
| __handleIframeGesture | implicit-coupling | `ios-desktop/js/main.js` | 1 | `ios-desktop/js/main.js` |
| __headsUpDebug | implicit-coupling | `ios-desktop/js/notifications.js` | 1 | `ios-desktop/js/notifications.js` |
| __idleSlider | implicit-coupling | `ios-desktop/apps/_shared/idle-slider.js` | 4 | `ios-desktop/apps/_shared/idle-slider.js` …等 4 处 |
| __initM3Controls | implicit-coupling | `ios-desktop/js/m3-controls.js` | 1 | `ios-desktop/js/m3-controls.js` |
| __initWallpaperPage | implicit-coupling | `ios-desktop/js/theme-engine.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/theme-engine.js` |
| __initialAppsRef | implicit-coupling | `ios-desktop/js/storage-stats.js` | 1 | `ios-desktop/js/storage-stats.js` |
| __lastOpenSource | implicit-coupling | `ios-desktop/js/app-window.js` | 1 | `ios-desktop/js/app-window.js` |
| __lastOpenStack | implicit-coupling | `ios-desktop/js/app-window.js` | 1 | `ios-desktop/js/app-window.js` |
| __lastRecordedApp | implicit-coupling | `ios-desktop/js/recent-apps.js` | 1 | `ios-desktop/js/recent-apps.js` |
| __launchWatchdog | implicit-coupling | `ios-desktop/js/app-window.js` | 1 | `ios-desktop/js/app-window.js` |
| __lockClockFaces | implicit-coupling | `ios-desktop/js/lock-screen.js` | 2 | `ios-desktop/js/lock-screen.js`<br>`ios-desktop/js/theme-engine.js` |
| __lockNow | implicit-coupling | `ios-desktop/js/main.js` | 1 | `ios-desktop/js/main.js` |
| __lockPin | implicit-coupling | （无赋值形态·仅读取） | 1 | `ios-desktop/js/apps/settings.js` |
| __lockTest | test-hook | `ios-desktop/js/lock-screen.js` | 2 | `ios-desktop/js/lock-screen.js`<br>`ios-desktop/js/main.js` |
| __lyricCore | implicit-coupling | `ios-desktop/apps/music/lyric-core.js` | 2 | `ios-desktop/apps/music/index.html`<br>`ios-desktop/apps/music/lyric-core.js` |
| __lyricMakerUI | implicit-coupling | `ios-desktop/apps/music/index.html` | 1 | `ios-desktop/apps/music/index.html` |
| __m3eLoader | implicit-coupling | `ios-desktop/js/m3e.js` | 5 | `ios-desktop/js/apps/files.js` …等 5 处 |
| __m3eMini | sdk-facade | `ios-desktop/apps/_shared/m3e-mini.js`<br>`ios-desktop/apps/messages/m3e-mini.js`<br>`ios-desktop/apps/translate/m3e-mini.js` | 7 | `ios-desktop/apps/_shared/m3e-mini.js` …等 7 处 |
| __m3ePull | sdk-facade | `ios-desktop/apps/_shared/m3e-pull.js` | 9 | `ios-desktop/apps/_shared/m3e-pull.js` …等 9 处 |
| __m3eStretch | implicit-coupling | `ios-desktop/apps/_shared/stretch.js` | 1 | `ios-desktop/apps/_shared/stretch.js` |
| __mailFabAct | implicit-coupling | `ios-desktop/js/apps/mail.js` | 1 | `ios-desktop/js/apps/mail.js` |
| __mailFabClose | implicit-coupling | `ios-desktop/js/apps/mail.js` | 1 | `ios-desktop/js/apps/mail.js` |
| __mailFabMenu | implicit-coupling | `ios-desktop/js/apps/mail.js` | 1 | `ios-desktop/js/apps/mail.js` |
| __markdownCore | implicit-coupling | `ios-desktop/apps/markdown/core.js` | 2 | `ios-desktop/apps/markdown/core.js`<br>`ios-desktop/apps/markdown/index.html` |
| __markupTest | test-hook | `ios-desktop/js/screenshot-markup.js` | 1 | `ios-desktop/js/screenshot-markup.js` |
| __md3ErrForwardHooked | implicit-coupling | `ios-desktop/js/main.js` | 1 | `ios-desktop/js/main.js` |
| __md3ErrorHub | sdk-facade | `ios-desktop/js/error-hub.js` | 1 | `ios-desktop/js/error-hub.js` |
| __md3SliderSet | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __md3SliderWatch | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __mdA11y | implicit-coupling | `ios-desktop/apps/_shared/a11y.js` | 1 | `ios-desktop/apps/_shared/a11y.js` |
| __mdDialogA11y | implicit-coupling | `ios-desktop/apps/_shared/dialog-a11y.js` | 18 | `ios-desktop/apps/_shared/dialog-a11y.js` …等 18 处 |
| __mdEscape | implicit-coupling | `ios-desktop/apps/_shared/sanitize.js` | 27 | `ios-desktop/apps/_shared/sanitize.js` …等 27 处 |
| __mdSanitize | implicit-coupling | `ios-desktop/apps/_shared/sanitize.js` | 3 | `ios-desktop/apps/_shared/sanitize.js`<br>`ios-desktop/apps/calendar/index.html`<br>`ios-desktop/apps/markdown/index.html` |
| __mediaGain | implicit-coupling | `ios-desktop/js/media-service.js` | 1 | `ios-desktop/js/media-service.js` |
| __mediaKeys | implicit-coupling | `ios-desktop/js/media-service.js` | 1 | `ios-desktop/js/media-service.js` |
| __mediaMeta | implicit-coupling | `ios-desktop/apps/music/index.html` | 1 | `ios-desktop/apps/music/index.html` |
| __messagesRichCore | sdk-facade | `ios-desktop/js/messages-rich-core.js` | 2 | `ios-desktop/apps/messages/index.html`<br>`ios-desktop/js/messages-rich-core.js` |
| __midiPlayerCore | implicit-coupling | `ios-desktop/js/midi-player-core.js` | 2 | `ios-desktop/apps/midi-player/app.mjs`<br>`ios-desktop/js/midi-player-core.js` |
| __miniNav | implicit-coupling | `ios-desktop/js/mini-window.js` | 2 | `ios-desktop/js/apps/settings-two-pane.js`<br>`ios-desktop/js/mini-window.js` |
| __miniWindow | implicit-coupling | `ios-desktop/js/mini-window.js` | 2 | `ios-desktop/js/app-window.js`<br>`ios-desktop/js/mini-window.js` |
| __miniWindowAll | implicit-coupling | `ios-desktop/js/mini-window.js` | 2 | `ios-desktop/js/mini-window.js`<br>`ios-desktop/js/sidebubble.js` |
| __miniWindowOpen | implicit-coupling | `ios-desktop/js/mini-window.js` | 3 | `ios-desktop/js/context-menu.js`<br>`ios-desktop/js/main.js`<br>`ios-desktop/js/mini-window.js` |
| __monetReroll | implicit-coupling | `ios-desktop/js/theme-engine.js` | 2 | `ios-desktop/js/theme-engine.js`<br>`ios-desktop/js/theme-mode.js` |
| __monetTest | test-hook | `ios-desktop/js/theme-engine.js` | 1 | `ios-desktop/js/theme-engine.js` |
| __mpDeepLink | implicit-coupling | `ios-desktop/apps/midi-player/index.html` | 2 | `ios-desktop/apps/midi-player/app.mjs`<br>`ios-desktop/apps/midi-player/index.html` |
| __navBar | implicit-coupling | `ios-desktop/js/nav-bar.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/nav-bar.js` |
| __notesCore | implicit-coupling | `ios-desktop/apps/notes/core.js` | 2 | `ios-desktop/apps/notes/core.js`<br>`ios-desktop/apps/notes/index.html` |
| __notiCalSyncBound | implicit-coupling | `ios-desktop/js/notifications.js` | 1 | `ios-desktop/js/notifications.js` |
| __notifHistoryToggle | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __notifLockChoose | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __notifLockClose | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __notifLockPick | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __notifPageV801DocBound | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __ocrCore | implicit-coupling | `ios-desktop/js/ocr-core.js` | 2 | `ios-desktop/apps/ocr/app.mjs`<br>`ios-desktop/js/ocr-core.js` |
| __ocrDeepLink | implicit-coupling | `ios-desktop/apps/ocr/index.html` | 2 | `ios-desktop/apps/ocr/app.mjs`<br>`ios-desktop/apps/ocr/index.html` |
| __onThemeModeChanged | implicit-coupling | `ios-desktop/js/main.js` | 2 | `ios-desktop/js/main.js`<br>`ios-desktop/js/theme-mode.js` |
| __oneHanded | implicit-coupling | `ios-desktop/js/one-handed.js` | 3 | `ios-desktop/js/nav-bar.js`<br>`ios-desktop/js/one-handed.js`<br>`ios-desktop/js/quick-settings.js` |
| __openRecentApps | implicit-coupling | `ios-desktop/js/recent-apps.js` | 1 | `ios-desktop/js/recent-apps.js` |
| __openWallpaperSubView | implicit-coupling | `ios-desktop/js/theme-engine.js` | 1 | `ios-desktop/js/theme-engine.js` |
| __parallelDebug | implicit-coupling | `ios-desktop/js/app-window.js` | 1 | `ios-desktop/js/app-window.js` |
| __pdfCore | implicit-coupling | `ios-desktop/apps/pdf/core.js` | 2 | `ios-desktop/apps/pdf/core.js`<br>`ios-desktop/apps/pdf/index.html` |
| __permissions | implicit-coupling | `ios-desktop/js/permissions.js` | 4 | `ios-desktop/js/apps/settings.js` …等 4 处 |
| __phoneCore | implicit-coupling | `ios-desktop/apps/phone/core.js` | 2 | `ios-desktop/apps/phone/core.js`<br>`ios-desktop/apps/phone/index.html` |
| __photoCore | implicit-coupling | `ios-desktop/apps/photos/core.js` | 2 | `ios-desktop/apps/photos/core.js`<br>`ios-desktop/apps/photos/index.html` |
| __pianoCore | implicit-coupling | `ios-desktop/js/piano-core.js` | 2 | `ios-desktop/apps/piano/index.html`<br>`ios-desktop/js/piano-core.js` |
| __pingCore | implicit-coupling | `ios-desktop/js/ping-core.js` | 2 | `ios-desktop/apps/ping/index.html`<br>`ios-desktop/js/ping-core.js` |
| __pkgDesktopRoot | implicit-coupling | （无赋值形态·仅读取） | 1 | `ios-desktop/js/apps/installer.js` |
| __pkgIframeSelfHeal | implicit-coupling | `ios-desktop/js/pkg/pkg-registry.js` | 1 | `ios-desktop/js/pkg/pkg-registry.js` |
| __pkgInstallerAPI | sdk-facade | `ios-desktop/js/pkg/pkg-registry.js` | 5 | `ios-desktop/js/apps/appstore.js` …等 5 处 |
| __pkgSdkInstalled | implicit-coupling | `ios-desktop/js/pkg-sdk.js` | 2 | `ios-desktop/js/main.js`<br>`ios-desktop/js/pkg-sdk.js` |
| __profiles | implicit-coupling | `ios-desktop/js/profiles.js` | 3 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/profiles.js`<br>`ios-desktop/js/quick-settings.js` |
| __pythonCore | implicit-coupling | `ios-desktop/js/python-core.js` | 2 | `ios-desktop/apps/python/index.html`<br>`ios-desktop/js/python-core.js` |
| __qsBrightness | implicit-coupling | `ios-desktop/js/quick-settings.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/quick-settings.js` |
| __qsDebug | implicit-coupling | `ios-desktop/js/gestures.js` | 2 | `ios-desktop/js/back-pill.js`<br>`ios-desktop/js/gestures.js` |
| __qsNetworkSheet | implicit-coupling | `ios-desktop/js/quick-settings.js` | 1 | `ios-desktop/js/quick-settings.js` |
| __qsPageState | implicit-coupling | `ios-desktop/js/quick-settings.js` | 1 | `ios-desktop/js/quick-settings.js` |
| __qsTileState | implicit-coupling | `ios-desktop/js/quick-settings.js` | 3 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/quick-settings.js`<br>`ios-desktop/js/widget-board.js` |
| __qsToast | implicit-coupling | `ios-desktop/js/quick-settings.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/quick-settings.js` |
| __radioCore | implicit-coupling | `ios-desktop/js/radio-core.js` | 2 | `ios-desktop/apps/radio/index.html`<br>`ios-desktop/js/radio-core.js` |
| __radioDeepLink | implicit-coupling | `ios-desktop/apps/radio/index.html` | 1 | `ios-desktop/apps/radio/index.html` |
| __recorderMicGate | implicit-coupling | `ios-desktop/js/apps/recorder.js` | 1 | `ios-desktop/js/apps/recorder.js` |
| __recorderPerm | implicit-coupling | `ios-desktop/js/apps/recorder.js` | 1 | `ios-desktop/js/apps/recorder.js` |
| __redactDebug | implicit-coupling | `ios-desktop/js/notifications.js` | 1 | `ios-desktop/js/notifications.js` |
| __rippleDebug | implicit-coupling | `ios-desktop/js/ripple-fx.js` | 1 | `ios-desktop/js/ripple-fx.js` |
| __rx | implicit-coupling | `ios-desktop/apps/reaction/index.html` | 1 | `ios-desktop/apps/reaction/index.html` |
| __rxCore | implicit-coupling | `ios-desktop/apps/reaction/index.html` | 1 | `ios-desktop/apps/reaction/index.html` |
| __safariCore | implicit-coupling | `ios-desktop/apps/safari/core.js` | 2 | `ios-desktop/apps/safari/core.js`<br>`ios-desktop/apps/safari/index.html` |
| __sceneMorphResync | implicit-coupling | `ios-desktop/js/pull-down-gesture.js` | 2 | `ios-desktop/js/pull-down-gesture.js`<br>`ios-desktop/js/quick-settings.js` |
| __screenRecord | implicit-coupling | `ios-desktop/js/recent-apps.js` | 2 | `ios-desktop/js/aosp/screen-record-dialog.js`<br>`ios-desktop/js/recent-apps.js` |
| __screenshot | implicit-coupling | `ios-desktop/js/recent-apps.js` | 3 | `ios-desktop/js/quick-settings.js`<br>`ios-desktop/js/recent-apps.js`<br>`ios-desktop/js/volume-dialog.js` |
| __setSwitchChecked | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __setUnlockAnimStyle | implicit-coupling | `ios-desktop/js/main.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/main.js` |
| __settingsA11yStore | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __settingsAccountsV833 | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __settingsAppsBridge | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __settingsCore | implicit-coupling | `ios-desktop/js/settings-core.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/settings-core.js` |
| __settingsDisplayStore | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __settingsFolderUninstall | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __settingsLocationV829 | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __settingsMedia | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __settingsModesV830 | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __settingsNotifsStore | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __settingsSafetyV831 | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __settingsSoundStore | implicit-coupling | `ios-desktop/js/apps/settings.js` | 2 | `ios-desktop/apps/clock-app/alarm.mjs`<br>`ios-desktop/js/apps/settings.js` |
| __settingsTheme | implicit-coupling | `ios-desktop/js/apps/settings.js` | 1 | `ios-desktop/js/apps/settings.js` |
| __settingsTwoPaneMount | implicit-coupling | `ios-desktop/js/apps/settings-two-pane.js` | 2 | `ios-desktop/js/apps/settings-two-pane.js`<br>`ios-desktop/js/apps/settings.js` |
| __settingsTwoPaneReEval | implicit-coupling | `ios-desktop/js/apps/settings-two-pane.js` | 2 | `ios-desktop/js/apps/settings-two-pane.js`<br>`ios-desktop/js/apps/settings.js` |
| __settingsTwoPaneSync | implicit-coupling | `ios-desktop/js/apps/settings-two-pane.js` | 2 | `ios-desktop/js/apps/settings-two-pane.js`<br>`ios-desktop/js/page-stack.js` |
| __sfx | implicit-coupling | `ios-desktop/js/sound-haptics.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/sound-haptics.js` |
| __shareSheet | implicit-coupling | `ios-desktop/js/share-sheet.js` | 6 | `ios-desktop/js/all-apps.js` …等 6 处 |
| __shortcutsCore | implicit-coupling | （无赋值形态·仅读取） | 2 | `ios-desktop/apps/shortcuts/core.js`<br>`ios-desktop/apps/shortcuts/index.html` |
| __splitDebug | implicit-coupling | `ios-desktop/js/split-screen.js` | 1 | `ios-desktop/js/split-screen.js` |
| __splitDestroyParked | implicit-coupling | `ios-desktop/js/split-screen.js` | 2 | `ios-desktop/js/recent-apps.js`<br>`ios-desktop/js/split-screen.js` |
| __splitE2E | implicit-coupling | `ios-desktop/js/split-screen.js` | 1 | `ios-desktop/js/split-screen.js` |
| __splitGestures | implicit-coupling | `ios-desktop/js/split-screen.js` | 5 | `ios-desktop/js/app-window.js` …等 5 处 |
| __splitGroups | implicit-coupling | `ios-desktop/js/split-groups.js` | 1 | `ios-desktop/js/split-groups.js` |
| __splitHasParked | implicit-coupling | `ios-desktop/js/split-screen.js` | 1 | `ios-desktop/js/split-screen.js` |
| __splitInfo | implicit-coupling | `ios-desktop/js/split-screen.js` | 6 | `ios-desktop/js/app-window.js` …等 6 处 |
| __splitPaneLiveSource | implicit-coupling | `ios-desktop/js/split-screen.js` | 2 | `ios-desktop/js/recent-preview.js`<br>`ios-desktop/js/split-screen.js` |
| __splitRestoreForApp | implicit-coupling | `ios-desktop/js/split-screen.js` | 2 | `ios-desktop/js/app-window.js`<br>`ios-desktop/js/split-screen.js` |
| __splitResume | implicit-coupling | `ios-desktop/js/split-screen.js` | 2 | `ios-desktop/js/recent-apps.js`<br>`ios-desktop/js/split-screen.js` |
| __splitSuspend | implicit-coupling | `ios-desktop/js/split-screen.js` | 2 | `ios-desktop/js/recent-apps.js`<br>`ios-desktop/js/split-screen.js` |
| __state | implicit-coupling | （无赋值形态·仅读取） | 1 | `ios-desktop/js/apps/settings.js` |
| __storageStats | implicit-coupling | `ios-desktop/js/storage-stats.js` | 4 | `ios-desktop/js/apps/settings-two-pane.js` …等 4 处 |
| __sttCore | implicit-coupling | `ios-desktop/js/stt-core.js` | 2 | `ios-desktop/apps/stt/index.html`<br>`ios-desktop/js/stt-core.js` |
| __sttDeepLink | implicit-coupling | `ios-desktop/apps/stt/index.html` | 1 | `ios-desktop/apps/stt/index.html` |
| __sttTest | test-hook | `ios-desktop/apps/stt/index.html` | 1 | `ios-desktop/apps/stt/index.html` |
| __syncIframeApp | implicit-coupling | `ios-desktop/js/iframe-app.js`<br>`ios-desktop/js/main.js` | 4 | `ios-desktop/js/iframe-app.js` …等 4 处 |
| __system | sdk-facade | `ios-desktop/js/main.js`<br>`ios-desktop/js/pkg-sdk.js` | 43 | `ios-desktop/apps/archive/index.html` …等 43 处 |
| __tbTransientClaim | implicit-coupling | `ios-desktop/js/gestures.js`<br>`ios-desktop/js/taskbar-transient.js` | 2 | `ios-desktop/js/gestures.js`<br>`ios-desktop/js/taskbar-transient.js` |
| __tbTransientThresholds | implicit-coupling | `ios-desktop/js/taskbar-transient.js` | 2 | `ios-desktop/js/gestures.js`<br>`ios-desktop/js/taskbar-transient.js` |
| __terminalCore | implicit-coupling | `ios-desktop/js/terminal-core.js` | 2 | `ios-desktop/apps/terminal/index.html`<br>`ios-desktop/js/terminal-core.js` |
| __themeColorTest | test-hook | `ios-desktop/js/theme-engine.js` | 1 | `ios-desktop/js/theme-engine.js` |
| __themeHueTest | test-hook | `ios-desktop/js/theme-engine.js` | 1 | `ios-desktop/js/theme-engine.js` |
| __themeModeTest | test-hook | `ios-desktop/js/theme-mode.js` | 1 | `ios-desktop/js/theme-mode.js` |
| __themePickerGesture | implicit-coupling | `ios-desktop/js/theme-engine.js` | 1 | `ios-desktop/js/theme-engine.js` |
| __threesCore | implicit-coupling | （无赋值形态·仅读取） | 2 | `ios-desktop/apps/threes/core.js`<br>`ios-desktop/apps/threes/index.html` |
| __tpNav | implicit-coupling | `ios-desktop/js/apps/settings-two-pane.js` | 1 | `ios-desktop/js/apps/settings-two-pane.js` |
| __tpSwipeBackActive | implicit-coupling | （无赋值形态·仅读取） | 1 | `ios-desktop/js/apps/settings-two-pane.js` |
| __tpVisualPrevIdx | implicit-coupling | `ios-desktop/js/apps/settings-two-pane.js` | 2 | `ios-desktop/js/app-window.js`<br>`ios-desktop/js/apps/settings-two-pane.js` |
| __translateCore | implicit-coupling | `ios-desktop/apps/translate/core.js` | 2 | `ios-desktop/apps/translate/core.js`<br>`ios-desktop/apps/translate/index.html` |
| __tryUnlockAnim | implicit-coupling | `ios-desktop/js/main.js` | 2 | `ios-desktop/js/apps/settings.js`<br>`ios-desktop/js/main.js` |
| __typingCore | implicit-coupling | `ios-desktop/apps/typing/core.js` | 2 | `ios-desktop/apps/typing/core.js`<br>`ios-desktop/apps/typing/index.html` |
| __typingUI | implicit-coupling | `ios-desktop/apps/typing/index.html` | 1 | `ios-desktop/apps/typing/index.html` |
| __usageStore | implicit-coupling | `ios-desktop/js/app-window.js` | 1 | `ios-desktop/js/app-window.js` |
| __vfs | implicit-coupling | `ios-desktop/js/vfs.js` | 10 | `ios-desktop/apps/music/index.html` …等 10 处 |
| __videoWallpaper | implicit-coupling | `ios-desktop/js/video-wallpaper.js` | 3 | `ios-desktop/js/desktop-blur.js`<br>`ios-desktop/js/theme-engine.js`<br>`ios-desktop/js/video-wallpaper.js` |
| __videoWallpaperApply | implicit-coupling | `ios-desktop/js/video-wallpaper.js` | 1 | `ios-desktop/js/video-wallpaper.js` |
| __weatherCore | implicit-coupling | `ios-desktop/apps/weather/core.js` | 2 | `ios-desktop/apps/weather/core.js`<br>`ios-desktop/apps/weather/index.html` |
| __wellbeingStore | implicit-coupling | `ios-desktop/js/app-window.js` | 1 | `ios-desktop/js/app-window.js` |
| __widgetBoard | implicit-coupling | `ios-desktop/js/widget-board.js` | 1 | `ios-desktop/js/widget-board.js` |
| __wordCore | implicit-coupling | `ios-desktop/js/word-core.js` | 3 | `ios-desktop/apps/typing/index.html`<br>`ios-desktop/apps/word/index.html`<br>`ios-desktop/js/word-core.js` |
| __zenDebug | implicit-coupling | `ios-desktop/js/quick-settings.js` | 1 | `ios-desktop/js/quick-settings.js` |

## 加载序契约与整改路线（建议③·不新造轮子）

- 定义文件与消费文件**跨文件**的名字即潜在加载序脆弱点：classic 脚本按 `<script>` 文档序同步执行，iframe 应用晚于宿主壳层；跨形态（宿主↔iframe）依赖必须走 `window.addEventListener('message')` / `__system` 总线或守卫式惰性访问器，不得顶层直读。
- 消费方整改范式（在库先例）：`alarm.mjs` instCore 注入 / `v10.36 ensureSw` 懒就绪——推广顺序按「implicit-coupling × 跨文件」子集逐名推进，每名一处惰性化即从脆弱点清单除名（届时更新本表备注）。
- 关联 #169（SDK 面）/ #226（单点实锤与修复范式）/ #230（CI 评分卡同机制）/ #156（兄弟引用断言同机制）。

