import{ICONS as i}from"../icons.js";import{getAppIconSVG as k}from"../app-icons.js";import{AOSP_ICONS as e}from"../icons-aosp.js";import"../data-backup.js";import"../settings-core.js";import"../app-data-registry.js";import{mediaService as w}from"../media-service.js";import"../battery-service.js";import{setSwitchChecked as A}from"../m3-controls.js";window.__setSwitchChecked=A;import"./settings-battery.js";import"./settings-appnotif.js";import{MODES_PAGE_SCRIPT as P}from"./settings-pages/modes.js";import{STATUSBAR_PAGE_SCRIPT as z}from"./settings-pages/statusbar.js";import{ACCOUNTS_PAGE_SCRIPT as E}from"./settings-pages/accounts.js";import{SAFETY_PAGE_SCRIPT as C}from"./settings-pages/safety.js";import{APPS_PAGE_SCRIPT as L}from"./settings-pages/apps.js";import{NOTIF_PAGE_SCRIPT as T}from"./settings-pages/notif.js";import{SOUND_PAGE_SCRIPT as I}from"./settings-pages/sound.js";import{DISPLAY_PAGE_SCRIPT as D}from"./settings-pages/display.js";import{A11Y_PAGE_SCRIPT as B}from"./settings-pages/a11y.js";import{COLOR_MOTION_PAGE_SCRIPT as M}from"./settings-pages/color-motion.js";import{TEXT_READING_PAGE_SCRIPT as O}from"./settings-pages/text-reading.js";import{DALTONIZER_PAGE_SCRIPT as N}from"./settings-pages/daltonizer.js";import{ABOUT_PAGE_SCRIPT as f}from"./settings-pages/about.js";import{LOCATION_PAGE_SCRIPT as x}from"./settings-pages/location.js";import"./settings-wellbeing.js";import"./settings-ripple.js";import{getResolvedTheme as V,setThemeMode as R}from"../theme-mode.js";import{state as p,savePagesApps as F}from"../state.js";import{dissolveFolderIfSingle as U}from"../folder.js";import{renderDesktopPages as H}from"../desktop.js";import{sliderClipPaths as j}from"../slider-geom.js";import{renderSettingsListHTML as W,setPages as $}from"./settings-two-pane.js";import{getRecentAppsList as q}from"../recent-apps.js";if(typeof window<"u"){if(window.__settingsMedia={setVolume:t=>w.setVolume(t),getVolume:()=>w.getState().volume},window.__getAppIconSVG=k,window.__settingsAppsBridge={recent:()=>q().slice()},window.__settingsTheme={resolved:()=>V(),set:t=>R(t)},!window.__md3SliderSet){var g=10;window.__md3SliderSet=function(t,a,n,c,y){if(a){var r=t&&t.clientWidth||0;if(!(r<=0)){var d=Math.max(0,Math.min(1,c))*r,u=j(r,d,g);a.style.width="",a.style.transform="translateY(-50%)",a.style.clipPath=u.fill;var l=t._md3Line;l===void 0&&(l=t._md3Line=t.querySelector(".md3-slider-line")),l&&(l.style.transform="translateY(-50%)",l.style.clipPath=u.line),n&&(n.style.left="",n.style.transform="translateX("+d.toFixed(1)+"px) translate(-50%,-50%)");var s=t._md3Dots;if(s===void 0&&(s=t._md3Dots=Array.prototype.slice.call(t.querySelectorAll(".m3-slider-dot"))),s.length){for(var b=r-4,h=-1,o=0;o<s.length;o++){var _=2+(s.length===1?b/2:o*b/(s.length-1));Math.abs(_-d)<=g+3?s[o].classList.add("is-hidden"):(s[o].classList.remove("is-hidden"),_<d&&(h=o))}for(var v=0;v<s.length;v++)s[v].classList.toggle("is-active",v<=h)}var m=t._md3Stop;m===void 0&&(m=t._md3Stop=t.querySelector(".m3-slider-stop-dot")),m&&m.classList.toggle("is-hidden",d>r*.98-g-4)}}}}!window.__md3SliderWatch&&window.ResizeObserver&&(window.__md3SliderWatch=function(t,a){!t||t._md3SliderWatched||(t._md3SliderWatched=!0,new ResizeObserver(function(){t.isConnected&&t.clientWidth>0&&a()}).observe(t))}),window.__settingsFolderUninstall=function(t){try{for(const a of p.pagesApps)if(Array.isArray(a))for(const n of a){if(!n||n.type!=="folder"||!Array.isArray(n.apps))continue;const c=n.apps.findIndex(r=>r&&r.id===t);if(c===-1)continue;const y=n.apps.splice(c,1)[0];p.removedApps||(p.removedApps=[]),p.removedApps.push(y);try{localStorage.setItem("ios-desktop:removed-apps",JSON.stringify(p.removedApps))}catch{}return U(n),F(),H(),!0}}catch{}return!1}}import{initialApps as G}from"../apps-data.js";import{getDesktopPrefs as Y,setDesktopPref as X,GRID_COL_CHOICES as K,GRID_ROW_CHOICES as Z,DOCK_MAX as Q,DOCK_RECENTS_MAX as J,isTabletSize as ee}from"../desktop-prefs.js";import{getDockItems as te,addToDock as ie,removeFromDock as ae}from"../dock.js";typeof window<"u"&&(window.__desktopPrefs={get:Y,set:X,cols:K,rows:Z,dockMax:Q,recentsMax:J,tablet:ee},window.__dockPrefs={items:te,add:ie,remove:ae,allApps:()=>G.map(t=>({id:t.id,name:t.name}))});const S={id:"settings",name:"\u8BBE\u7F6E",pages:[{title:"\u8BBE\u7F6E",content:`
        <!-- v7.51 issue#7\uFF1AAndroid 16 \u5F0F\u53CC\u680F\u6839\uFF08\u7A84\u5BB9\u5668=\u5355\u680F\u65E7\u5E03\u5C40\uFF1B\u5BBD\u5BB9\u5668\u7531 JS \u52A0 .tp-wide\uFF09 -->
        <div class="tp-root">
          <div class="tp-left">
          <!-- \u7528\u6237\u4E2A\u4EBA\u8D44\u6599\u5361\u7247 MD3 Elevated Card -->
          <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;display:flex;align-items:center;gap:16px;">
            <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,hsl(var(--md-h,215) 80% 40%),hsl(var(--md-h,215) 90% 65%));display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:600;box-shadow:var(--md-shadow-2);">
              A
            </div>
            <div style="display:flex;flex-direction:column;flex:1;">
              <span style="font-size:17px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">Android / MD3 \u7528\u6237</span>
              <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">Google \u8D26\u53F7 \xB7 \u540C\u6B65\u4E0E\u4E2A\u6027\u5316</span>
            </div>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">\u203A</span>
          </div>

          <!-- \u641C\u7D22\u80F6\u56CA\uFF08Android 16 \u53CC\u680F\u5DE6\u680F\u540C\u6B3E\uFF1B\u5B9E\u65F6\u8FC7\u6EE4\u4E0B\u65B9\u5206\u7EC4\uFF09 -->
          <div class="tp-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>
            <input type="text" placeholder="\u641C\u7D22\u8BBE\u7F6E" aria-label="\u641C\u7D22\u8BBE\u7F6E" />
          </div>

          <!-- \u8BBE\u7F6E\u6E05\u5355\uFF08\u7531 settings-two-pane.js \u7EDF\u4E00\u751F\u6210\uFF1A\u591A\u5F69\u5E95\u677F + \u526F\u6807\u9898 + \u53CC\u680F\u5BFC\u822A\u6865\uFF09 -->
          ${W()}
      
          </div><!-- /tp-left -->

          <!-- \u53F3\u680F\u8BE6\u60C5\u9762\u677F\uFF08\u2464 \u7A7A\u6001\u5F15\u5BFC\uFF1B\u5BBD\u683C\u5C40\u4E0B\u7531\u53CC\u680F\u6A21\u5757\u628A\u6808\u9875\u79FB\u5165/\u6CE8\u5165\u5230\u6B64\uFF09 -->
          <div class="tp-right">
            <div class="tp-empty">
              <div class="tp-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v6.2a2 2 0 0 1-.4 1.2L4.2 16a2.6 2.6 0 0 0 2.1 4.2h11.4a2.6 2.6 0 0 0 2.1-4.2l-4.4-5.6a2 2 0 0 1-.4-1.2V3"/><path d="M7.5 3h9"/></svg>
              </div>
              <div class="tp-empty-t">\u8BF7\u6253\u5F00\u4E00\u4E2A\u8BBE\u7F6E\u9879\u4EE5\u67E5\u770B</div>
              <div class="tp-empty-s">\u4ECE\u5DE6\u4FA7\u9009\u62E9\u4E00\u9879\u8BBE\u7F6E\uFF0C\u8BE6\u60C5\u5C06\u5728\u8FD9\u91CC\u5C55\u793A</div>
            </div>
          </div><!-- /tp-right -->
        </div><!-- /tp-root -->

          <script>
            // \u4E3B\u9875\u52A8\u6001\u5FBD\u6807\uFF1A\u5F53\u524D\u6A21\u5F0F\u540D + \u5F53\u524D\u52A8\u753B\u9884\u8BBE\u540D
            (function() {
              var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
              function refresh() {
                var hint = document.getElementById('profileModeHint');
                if (hint && window.__profiles) hint.innerText = window.__profiles.current() === 'work' ? '\u5DE5\u4F5C' : '\u4E2A\u4EBA';
                var animHint = document.getElementById('animPresetHint');
                if (animHint && window.__animPresets) animHint.innerText = window.__animPresets.currentName();
                var bgHint = document.getElementById('bgModeHint');
                if (bgHint && window.__bgFreeze) bgHint.innerText = window.__bgFreeze.modeName();
                var navHint = document.getElementById('navModeHint');
                if (navHint && window.__navBar) navHint.innerText = window.__navBar.enabled() ? '\u4E09\u952E\u5BFC\u822A' : '\u624B\u52BF\u5BFC\u822A';
                // v7.99 #10 \u4E8C\u671F\uFF1A\u5B58\u50A8\u4E00\u7EA7\u6458\u8981 \u2014\u2014 TopLevelStoragePreferenceController \u8BED\u4E49
                // storage_summary\u300C\u5DF2\u4F7F\u7528 X - \u8FD8\u5269 Y\u300D\uFF08X=\u4F7F\u7528\u7387\uFF0CY=\u5269\u4F59\u7A7A\u95F4\uFF09\uFF0C
                // window.__storageStats \u5355\u4E00\u771F\u6E90\u5F02\u6B65\u5237\u65B0\uFF08\u4E0E\u5B58\u50A8\u9875 7 \u540C\u6E90\uFF09
                var storageSub = document.getElementById('settingsStorageSub');
                if (storageSub && window.__storageStats) {
                  window.__storageStats.collect().then(function(s) {
                    if (!storageSub.isConnected) return; // \u884C\u968F\u9875\u9762\u79BB\u573A\u5219\u4E22\u5F03
                    var pct = s.idb && s.idb.quota ? (s.idb.usage / s.idb.quota) * 100 : 0;
                    var free = s.idb && s.idb.quota ? (s.idb.quota - s.idb.usage) : 0;
                    storageSub.textContent = '\u5DF2\u4F7F\u7528 ' + Math.round(Math.min(100, pct)) + '% - \u8FD8\u5269 ' + window.__storageStats.formatBytes(free);
                  }).catch(function() {});
                }
              }
              refresh();
              bindDoc('settings', 'app-page-active', function(e) {
                if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 0) refresh();
              });
              // v7.51 issue#7\uFF1A\u6302\u8F7D\u53CC\u680F\u5206\u5C4F\uFF08\u5E42\u7B49\uFF09\u2014\u2014\u9996\u6B21\u6267\u884C + \u6BCF\u6B21\u9875\u9762\u6FC0\u6D3B/\u5F39\u56DE\u6808\u6839\u91CD\u4F30
              var tpRoot = document.querySelector('.tp-root');
              function tpBoot() {
                var root = document.querySelector('.tp-root:not([data-tp-mounted="1"])') || tpRoot;
                if (root && window.__settingsTwoPaneMount) window.__settingsTwoPaneMount(root);
                if (window.__settingsTwoPaneReEval) window.__settingsTwoPaneReEval();
              }
              tpBoot();
              bindDoc('settings', 'app-page-active', function(e) {
                if (e.detail && e.detail.appId === 'settings') tpBoot();
              });
            })();
          <\/script>
      `},{title:"\u663E\u793A",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u663E\u793A</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u4EAE\u5EA6\u3001\u6DF1\u8272\u4E3B\u9898\u3001\u81EA\u52A8\u9501\u5C4F\uFF08AOSP DisplaySettings\uFF09</div>
          <!-- \u2460 category_name_brightness\u300C\u4EAE\u5EA6\u300D\uFF08order -200\uFF09 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u4EAE\u5EA6</div>
          <!-- preference_key_brightness_level\uFF1ARestrictedPreference\uFF08userRestriction
              no_config_brightness\uFF09+ BrightnessLevelPreferenceController getAvailabilityStatus
              AVAILABLE\uFF1B\u5185\u5D4C SeekBar \u6ED1\u6761 widget \u8BED\u4E49\uFF1B\u5355\u4E00\u771F\u6E90 = window.__qsBrightness \u6865
              \uFF08QS \u4EAE\u5EA6\u6ED1\u6761 body.filter \u5168\u5E93\u552F\u4E00\u6D88\u8D39\u94FE\uFF0Cv8.04 quick-settings.js \u6302\u6865\uFF09 -->
          <div class="md3-list-item" data-test="dsp-brightness" style="min-height:76px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:15px;">\u4EAE\u5EA6</span>
                <span id="dspBriVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">80%</span>
              </div>
              <div class="md3-slider" id="dspBriSlider" style="margin-top:6px;">
                <div class="md3-slider-line"></div>
                <div class="md3-slider-fill" id="dspBriFill"></div>
                <div class="md3-slider-thumb" id="dspBriThumb"></div>
              </div>
            </div>
          </div>
          <!-- screen_brightness_mode\uFF1APrimarySwitchPreference +
              AutoBrightnessPreferenceController config_automatic_brightness_available=false
              \uFF08frameworks core/res res/values/config.xml:500\uFF09\u2192 UNSUPPORTED_ON_DEVICE \u9690\u85CF\u6CE8\u8BB0
              \uFF08\u6CE8\u8BB0\uFF1APixel \u771F\u673A overlay \u7F6E true \u5C5E\u8BBE\u5907\u5DEE\u5F02\uFF1B\u9879\u76EE\u8BC1\u636E\u94FE\u4EE5 core/res \u6743\u5A01\u9ED8\u8BA4\u4E3A\u51C6\uFF09 -->
          <!-- even_dimmer_activated\uFF1AEvenDimmerPreferenceController Flags.evenDimmer \u65E0 default
              \uFF08aconfig \u5224\u6D3B\u89C4\u5219=\u9ED8\u8BA4 false\uFF09&& config_evenDimmerEnabled=false \u53CC\u8BC1
              \uFF08v8.02 \u540C\u94FE\uFF09\u2192 UNSUPPORTED_ON_DEVICE \u9690\u85CF\u6CE8\u8BB0\uFF1BRBC \u6781\u6697\u4E3A\u53D6\u4EE3\u8BED\u4E49\uFF08\u9875 20\uFF09 -->
          <!-- \u2461 category_name_lock_display\u300C\u9501\u5B9A\u663E\u793A\u5C4F\u300D\uFF08order -190\uFF09 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u9501\u5B9A\u663E\u793A\u5C4F</div>
          <!-- lockscreen_from_display_settings\uFF1APreference + LockScreenPreferenceController
              \uFF08security.screenlock \u5305\uFF09getAvailabilityStatus AVAILABLE\uFF1B\u52A8\u6001\u6458\u8981 =
              LockScreenNotificationPreferenceController.getSummaryResource \u9ED8\u8BA4\u94FE
              \uFF08LOCK_SCREEN_SHOW_NOTIFICATIONS \u9ED8\u8BA4\u5F00 + allowPrivate \u9ED8\u8BA4\u771F\uFF09\u2192
              lock_screen_notifications_summary_show\u300C\u663E\u793A\u6240\u6709\u901A\u77E5\u5185\u5BB9\u300D\uFF08v8.01 \u9875 19 \u540C\u94FE\u540C\u503C\uFF09\uFF1B
              fragment=LockscreenDashboardFragment \u5B50\u9875\u672A\u8F6C\u6B63\uFF0C\u5FE0\u5B9E\u5165\u53E3\u884C -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="dsp-lockscreen" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u9501\u5B9A\u7684\u5C4F\u5E55</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u663E\u793A\u6240\u6709\u901A\u77E5\u5185\u5BB9</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- #26 \u9501\u5C4F\u4E00\u8A00\u5728\u7EBF\u589E\u5F3A\uFF08\u8D85\u8D8A\u539F\u751F\xB7hitokoto\uFF09\uFF1APrimarySwitchPreference \u8BED\u4E49\uFF1B
              \u5355\u4E00\u771F\u6E90 ios-desktop:lock-quote-online\uFF08\u9ED8\u8BA4 '0' \u5173\uFF0C\u65AD\u7F51\u53EF\u7528\u4E3A\u7B2C\u4E00\u9A8C\u6536\uFF09\uFF0C
              \u5E7F\u64AD lock-quote-online-changed\uFF0C\u6D88\u8D39\u70B9 lock-quotes.js \u5373\u65F6\u5207\u6362\u5728\u7EBF/\u79BB\u7EBF\u6E32\u67D3 -->
          <div class="md3-list-item" data-test="dsp-quote-online" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u9501\u5C4F\u4E00\u8A00</span><span id="dspQuoteOnlineSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u6BCF\u65E5\u8BD7\u8BCD \xB7 \u5728\u7EBF\u589E\u5F3A\u9ED8\u8BA4\u5173\uFF08\u65AD\u7F51\u53EF\u7528\uFF09</span></span>
            <label class="md3-switch"><input type="checkbox" id="dspQuoteOnlineToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- fold_lock_behavior\uFF1AFoldLockBehaviorPreferenceController
              isFoldLockBehaviorAvailable \u6298\u53E0\u5F62\u6001\u4E13\u7528\uFF08FOLD_LOCK_BEHAVIOR \u8BBE\u7F6E\u4EC5\u53EF\u6298\u53E0\u8BBE\u5907\uFF09
              \u2192 UNSUPPORTED_ON_DEVICE \u9690\u85CF\u6CE8\u8BB0\uFF08\u624B\u673A\u5F62\u6001\uFF09 -->
          <!-- screen_timeout\uFF1ARestrictedPreference + ScreenTimeoutPreferenceController
              getAvailabilityStatus AVAILABLE\uFF1BXML summary=summary_placeholder \u4F46 updateState
              setSummary(getTimeoutSummary) \u52A8\u6001\u8986\u76D6\uFF1Ascreen_timeout_summary\u300C\u95F2\u7F6E %1$s\u540E\u300D\uFF1B
              \u9ED8\u8BA4 def_screen_off_timeout=60000\uFF08SettingsProvider defaults.xml\uFF09\u2192\u300C\u95F2\u7F6E 1 \u5206\u949F\u540E\u300D\uFF1B
              store \u771F\u6E90 settings:display-v1\uFF08\u9501\u5C4F\u81EA\u52A8\u4F11\u7720\u6D88\u8D39\u70B9\u6392\u671F v8.05+\uFF09\uFF1B
              fragment=ScreenTimeoutSettings \u5B50\u9875\u672A\u8F6C\u6B63\uFF0C\u5FE0\u5B9E\u5165\u53E3\u884C -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="dsp-timeout" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u81EA\u52A8\u9501\u5C4F</span><span id="dspTimeoutSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u95F2\u7F6E 1 \u5206\u949F\u540E</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- doze_always_on_display\uFF08AOSP\u300C\u606F\u5C4F\u663E\u793A\u300DWeb \u6620\u5C04 \xB7 #35\uFF09\uFF1Astore \u771F\u6E90
              settings:display-v1.aod\uFF08\u9ED8\u8BA4\u5173\u2014\u2014\u9996\u542F\u4E0D\u81EA\u52A8\u5E38\u663E\uFF0C#157 bedtime \u4FDD\u5B88\u521D\u503C\u540C\u7EAA\u5F8B\uFF09\uFF1B
              \u95F2\u7F6E\u65F6\u957F\u590D\u7528 screen_timeout\uFF08AOSP doze \u5165\u5C4F=\u5C4F\u8D85\u65F6\u4E4B\u540E\uFF0C\u5355\u6E90\u4E0D\u53E6\u8BBE\uFF09\uFF1B
              \u6D88\u8D39\u70B9 aod-ui.js\uFF08initAod \u8DDF\u968F settings-display-changed\uFF09 -->
          <div class="md3-list-item" data-test="dsp-aod" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u606F\u5C4F\u663E\u793A\uFF08AOD\uFF09</span><span id="dspAodSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u95F2\u7F6E\u6216\u7184\u5C4F\u540E\u5E38\u663E\u65F6\u949F\u4E0E\u901A\u77E5\u56FE\u6807</span></span>
            <label class="md3-switch"><input type="checkbox" id="dspAodToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- \u2462 category_name_appearance\u300C\u5916\u89C2\u300D\uFF08order -180\uFF09 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u5916\u89C2</div>
          <!-- dark_ui_mode\uFF1ADarkModePreference extends PrimarySwitchPreference\uFF08\u4E3B\u5F00\u5173\u884C\uFF0C
              android:widgetLayout=@null \u4E3A widget \u6E05\u7A7A\u975E\u5F00\u5173\u79FB\u9664\uFF09+ DarkUIPreferenceController
              getAvailabilityStatus AVAILABLE\uFF1B\u52A8\u6001\u6458\u8981 AutoDarkTheme.getStatus \u9ED8\u8BA4
              MODE_NIGHT_NO \u2192 dark_ui_summary_on/off_auto_mode_never
              \u300C\u4E00\u5F8B\u4E0D\u81EA\u52A8\u5173\u95ED\u300D/\u300C\u6C38\u4E0D\u81EA\u52A8\u5F00\u542F\u300D\uFF1B\u5355\u4E00\u771F\u6E90 = __settingsTheme\uFF08QS \u6DF1\u8272\u78C1\u8D34\u540C\u5411\uFF09 -->
          <div class="md3-list-item" data-test="dsp-dark" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u6DF1\u8272\u4E3B\u9898</span><span id="dspDarkSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u6C38\u4E0D\u81EA\u52A8\u5F00\u542F</span></span>
            <label class="md3-switch"><input type="checkbox" id="dspDarkToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- text_reading_options\uFF1APreference + TextReadingFragmentForDisplaySettingsController
              \uFF08\u57FA\u7C7B TextReadingFragmentBaseController AVAILABLE\uFF09\uFF1Bfragment=
              TextReadingPreferenceFragment \u2014\u2014 \u9879\u76EE\u5185\u5408\u6CD5\u6620\u5C04 = \u9875 20\uFF08\u65E0\u969C\u788D\u529F\u80FD\uFF0Cv8.02 \u5DF2\u8F6C\u6B63
              \u540C\u6B3E\u884C\uFF09\uFF0C__tpNav \u8DF3\u8F6C -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="dsp-text-reading" onclick="__tpNav(this,20)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u663E\u793A\u5927\u5C0F\u548C\u6587\u5B57</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- \u2463 category_name_color\u300C\u989C\u8272\u300D\uFF08order -170\uFF09\uFF1A\u4E09\u9879\u5168\u95E8\u63A7\u9690\u85CF \u2192 \u6574\u533A\u9690\u85CF\u6CE8\u8BB0 -->
          <!-- night_display\uFF1APrimarySwitchPreference + NightDisplayPreferenceController
              isNightDisplayAvailable=config_nightDisplayAvailable=@bool/
              config_setColorTransformAccelerated=false\uFF08core/res:913/922 \u540C\u94FE\u53CC\u8BC1\uFF09
              \u2192 UNSUPPORTED_ON_DEVICE \u9690\u85CF\u6CE8\u8BB0\uFF08\u6CE8\u8BB0\uFF1APixel \u771F\u673A overlay \u7F6E true \u62A4\u773C\u6A21\u5F0F
              \u5C5E\u8BBE\u5907\u5DEE\u5F02\uFF1B\u9879\u76EE\u8BC1\u636E\u94FE\u4EE5 core/res \u6743\u5A01\u9ED8\u8BA4\u4E3A\u51C6\uFF09 -->
          <!-- color_mode\uFF1AColorModePreferenceController isDeviceColorManaged
              \uFF08ro.display.color.managed \u8FD0\u884C\u65F6\u8BBE\u5907\u5C5E\u6027\uFF0C\u9879\u76EE\u6A21\u62DF\u8BBE\u5907\u672A\u58F0\u660E\uFF09\u2192
              DISABLED_FOR_USER\uFF08isAvailable \u767D\u540D\u5355\u5916\uFF09\u9690\u85CF\u6CE8\u8BB0 -->
          <!-- color_contrast\uFF1AContrastPreferenceController
              Flags.enableColorContrastControl\uFF08aconfig accessibility_flags \u65E0 default \u884C
              =\u9ED8\u8BA4 false\uFF09\u2192 UNSUPPORTED_ON_DEVICE \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- \u2464 category_name_display_controls\u300C\u663E\u793A\u63A7\u5236\u300D\uFF08order -150\uFF09 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u663E\u793A\u63A7\u5236</div>
          <!-- auto_rotate\uFF1ASwitchPreferenceCompat + AutoRotatePreferenceController
              getAvailabilityStatus = RotationPolicy.isRotationLockToggleVisible &&
              !DeviceStateAutoRotationHelper.isDeviceStateRotationEnabled \u2192 AVAILABLE
              \uFF08\u624B\u673A\u5F62\u6001\u65CB\u8F6C\u9501\u53EF\u89C1\u3001\u975E\u6298\u53E0\u8BBE\u5907\u6001\u81EA\u52A8\u65CB\u8F6C\uFF09\uFF1B\u5355\u4E00\u771F\u6E90 = QS autorotate \u78C1\u8D34
              \uFF08__qsTileState.get/sync\uFF0Cv7.99 \u98DE\u884C\u6A21\u5F0F\u540C\u6B3E\u63A5\u7EBF\uFF09 -->
          <div class="md3-list-item" data-test="dsp-rotate" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">\u81EA\u52A8\u65CB\u8F6C\u5C4F\u5E55</span>
            <label class="md3-switch"><input type="checkbox" id="dspRotateToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- device_state_auto_rotate\uFF1ADeviceStateAutoRotateOverviewController
              isDeviceStateRotationEnabled \u6298\u53E0\u5F62\u6001\u4E13\u7528 \u2192 UNSUPPORTED_ON_DEVICE \u9690\u85CF\u6CE8\u8BB0
              \uFF08\u4E0E auto_rotate \u4E8C\u8005\u53D6\u5176\u4E00\uFF0C\u624B\u673A\u5F62\u6001\u53D6\u6807\u51C6\u65CB\u8F6C\u5F00\u5173\uFF09 -->
          <!-- screen_resolution\uFF1AScreenResolutionController checkSupportedResolutions
              \u8FD0\u884C\u65F6\u591A\u5206\u8FA8\u7387\u663E\u793A\u6A21\u5F0F\uFF08\u9879\u76EE\u6A21\u62DF\u8BBE\u5907\u5355\u4E00\u5206\u8FA8\u7387\u5F62\u6001\uFF09\u2192 UNSUPPORTED_ON_DEVICE
              \u9690\u85CF\u6CE8\u8BB0\uFF08\u6CE8\u8BB0\uFF1APixel 9 Pro \u591A\u5206\u8FA8\u7387\u5F62\u6001\u5C5E\u8BBE\u5907\u5DEE\u5F02\uFF09 -->
          <!-- display_white_balance\uFF1ADisplayWhiteBalancePreferenceController
              isDisplayWhiteBalanceAvailable=config_displayWhiteBalanceAvailable=false
              \uFF08core/res:1004\uFF09\u2192 DISABLED_FOR_USER\uFF08isAvailable \u767D\u540D\u5355\u5916\uFF09\u9690\u85CF\u6CE8\u8BB0 -->
          <!-- peak_refresh_rate\uFF1APeakRefreshRatePreferenceController
              config_show_smooth_display=false\uFF08Settings \u4ED3\u5E93 res/values/config.xml:571\uFF09
              \u2192 UNSUPPORTED_ON_DEVICE \u9690\u85CF\u6CE8\u8BB0\uFF08\u300C\u6D41\u7545\u753B\u9762\u300D\u884C\u672A\u8FC7\u7B2C\u4E00\u9053\u95E8\u63A7\uFF09 -->
          <!-- show_operator_name\uFF1AShowOperatorNamePreferenceController CarrierConfig
              KEY_SHOW_OPERATOR_NAME_IN_STATUSBAR_BOOL \u9ED8\u8BA4 false\uFF08controller \u9ED8\u8BA4\u53C2\u6570\uFF09\u2192
              \u4E0D\u53EF\u7528\u9690\u85CF\u6CE8\u8BB0 -->
          <!-- screensaver\uFF1APreference + ScreenSaverPreferenceController
              Utils.areDreamsAvailableToCurrentUser\uFF08config_dreamsEnabledByDefault=true \u9ED8\u8BA4\u53EF\u7528\uFF09\uFF1B
              \u52A8\u6001\u6458\u8981 DreamSettings.getSummaryTextFromBackend = screensaver_settings_summary_on
              \u300C\u5DF2\u5F00\u542F / %1$s\u300D+ config_dreamsDefaultComponent=
              com.android.deskclock/com.android.deskclock.Screensaver \u2192\u300C\u5DF2\u5F00\u542F / \u65F6\u949F\u300D\uFF1B
              fragment=DreamSettings \u5B50\u9875\u672A\u8F6C\u6B63\uFF0C\u5FE0\u5B9E\u5165\u53E3\u884C -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="dsp-screensaver" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5C4F\u4FDD</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5DF2\u5F00\u542F / \u65F6\u949F</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- camera_gesture\uFF1ACameraGesturePreferenceController isAvailable
              =config_cameraLaunchGestureSensorType != -1\uFF0Ccore/res:4253 = -1 \u2192
              \u4E0D\u53EF\u7528\u9690\u85CF\u6CE8\u8BB0\uFF08\u300C\u626D\u8F6C\u4E24\u6B21\u5373\u53EF\u6253\u5F00\u76F8\u673A\u300D\uFF09 -->
          <!-- lift_to_wake\uFF1ALiftToWakePreferenceController isAvailable
              =SensorManager.getDefaultSensor(TYPE_WAKE_GESTURE) != null\uFF1BTYPE_WAKE_GESTURE
              \u4E3A legacy \u4F20\u611F\u5668\uFF08Pixel 2+ \u8BBE\u5907\u5F62\u6001\u672A\u58F0\u660E wake_gesture \u7279\u6027\uFF09\u2192 \u4E0D\u53EF\u7528\u9690\u85CF\u6CE8\u8BB0
              \uFF08\u300C\u62FF\u8D77\u8BBE\u5907\u65F6\u5524\u9192\u300D\uFF0C\u7C7B\u6BD4 v8.02 \u5B9E\u4F53\u952E\u76D8\u5F62\u6001\u88C1\u51B3\uFF09 -->
          <!-- tap_to_wake\uFF1ATapToWakePreferenceController isAvailable
              =config_supportDoubleTapWake=false\uFF08core/res:4103\uFF09\u2192 \u4E0D\u53EF\u7528\u9690\u85CF\u6CE8\u8BB0\uFF08\u300C\u70B9\u6309\u5524\u9192\u300D\uFF09 -->
          <!-- theme\uFF1AListPreference(device_theme) + ThemePreferenceController isAvailable
              =OverlayManager \u53EF\u7528\u4E3B\u9898\u6570 > 1\uFF08AOSP \u901A\u7528\u5F62\u6001\u4EC5\u5185\u7F6E\u5355\u4E3B\u9898\uFF09\u2192 \u4E0D\u53EF\u7528\u9690\u85CF\u6CE8\u8BB0 -->
          <!-- vr_display_pref\uFF1AVrDisplayPreferenceController isAvailable
              =pm.hasSystemFeature(FEATURE_VR_MODE_HIGH_PERFORMANCE)\uFF08A17 \u5DF2\u79FB\u9664 VR \u9AD8\u6027\u80FD
              \u6A21\u5F0F\u7279\u6027\uFF09\u2192 \u4E0D\u53EF\u7528\u9690\u85CF\u6CE8\u8BB0\uFF08\u300C\u5F53\u8BBE\u5907\u5904\u4E8E VR \u6A21\u5F0F\u65F6\u300D\uFF09 -->
        </div>
        <script>`+D+"<\/script>"},{title:"\u7535\u6C60",content:`<div style="padding:16px 0;text-align:center;">
        <!-- \u2460 battery_header\uFF1AUsageProgressBarPreference\uFF08AVAILABLE_UNSEARCHABLE\uFF1B
            setBottomSummary("") \u5E95\u90E8\u6458\u8981\u7F6E\u7A7A\u2014\u2014\u8FDB\u5EA6\u6761\u4E0B\u4E0D\u653E\u6458\u8981\u884C\uFF0Cbattery_header_text \u72EC\u7ACB\u6210\u884C\uFF09\uFF1B
            \u5B9E\u65F6\u5355\u4E00\u771F\u6E90 battery-service\uFF08v7.50 \u62C6\u5206\u7BA1\u7EBF\u4FDD\u7559\uFF09 -->
        <div data-test="battery-header" style="position:relative;display:inline-block;">
          <div id="settingsBatteryPct" style="font-size:56px;font-weight:200;color:var(--md-success,#a8f5bb);font-family:var(--md-font-num);transition:color .4s;">87%</div>
          <span id="settingsBatteryChargeBadge" style="display:none;position:absolute;top:2px;right:-34px;font-size:22px;color:var(--md-primary,#7df8db);">${i.battery_charging}</span>
        </div>
        <div style="max-width:260px;margin:14px auto 0;height:8px;border-radius:99px;background:var(--md-surface-container-high,#353639);overflow:hidden;">
          <div id="settingsBatteryBar" style="width:87%;height:100%;border-radius:99px;background:var(--md-success,#a8f5bb);transition:width .6s cubic-bezier(.2,.8,.2,1),background .4s;"></div>
        </div>
        <!-- \u2461 battery_header_text\uFF1ABatteryHeaderTextPreference\uFF08AVAILABLE_UNSEARCHABLE\uFF09\uFF1B
            generateLabel \u94FE\u6E32\u67D3\uFF08settings-battery.js generateHeaderLabel \u540C\u6784\uFF09 -->
        <div id="settingsBatteryEstimate" data-test="battery-header-text" style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;">\u8FD8\u53EF\u7528\uFF1A8 \u5C0F\u65F6 45 \u5206\u949F</div>
        <!-- \u2462 battery_tip\uFF1ATipCardPreference \u9ED8\u8BA4\u9690\u85CF\uFF08\u65E0\u9ED8\u8BA4 tips\uFF09\uFF1B
            LowBatteryDetector \u6761\u4EF6\u6E32\u67D3\uFF1Adischarging && level<=15 && !isPowerSaveMode\uFF1B
            \u70B9\u51FB \u2192 BatterySaverAction \u5F00\u542F\u7701\u7535\u6A21\u5F0F -->
        <div id="settingsBatteryTipCard" data-test="battery-tip" style="display:none;margin:18px 0 0;padding:14px 18px;border-radius:16px;background:var(--md-error-container,#5c1a1b);cursor:pointer;text-align:left;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-error-container,#f9dedc);">\u7535\u6C60\u7535\u91CF\u4F4E</div>
          <div style="font-size:13px;color:var(--md-on-error-container,#f9dedc);opacity:.85;margin-top:2px;">\u5F00\u542F\u7701\u7535\u6A21\u5F0F\u53EF\u5EF6\u957F\u7535\u6C60\u7EED\u822A\u65F6\u95F4</div>
        </div>
        <div id="settingsBatterySource" style="font-size:11px;color:var(--md-outline,#6a6b6e);margin-top:8px;">\u6570\u636E\u6765\u6E90\uFF1A\u8BBE\u5907\u7535\u6C60\uFF08\u5B9E\u65F6\uFF09</div>

        <!-- \u2463\u2464\u2465\u2466 AOSP \u6761\u76EE\u5361\uFF08XML \u6743\u5A01\u5E8F\uFF09\uFF1Abattery_usage_summary \u2192 battery_saver_summary \u2192
            smart_battery_manager \u2192 status_bar_show_battery_percent -->
        <div class="md3-card" style="padding:4px 0;margin-top:20px;overflow:hidden;text-align:left;">
          <!-- \u2463 battery_usage_summary\uFF1AisBatteryUsageEnabled()=true \u6052\u6E32\u67D3\uFF1B
              \u6458\u8981 advanced_battery_preference_summary\uFF1B
              fragment=PowerUsageAdvanced \u5B50\u9875\u672A\u8F6C\u6B63\uFF0C\u5FE0\u5B9E\u5165\u53E3\u884C -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="battery-usage-summary" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u7535\u6C60\u4F7F\u7528\u60C5\u51B5</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u67E5\u770B\u81EA\u4E0A\u6B21\u5145\u6EE1\u7535\u540E\u7684\u7535\u6C60\u4F7F\u7528\u60C5\u51B5</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <!-- \u2464 battery_saver_summary\uFF1ABatterySaverController AVAILABLE\uFF0C\u52A8\u6001\u6458\u8981
              getSummary \u56DB\u5206\u652F\uFF08settings-battery.js \u6E32\u67D3\u300C\u5DF2\u5F00\u542F/\u5DF2\u5173\u95ED\u300D\uFF09\uFF1B
              \u884C\u5185 md-switch = Web \u5408\u6CD5\u8D85\u8D8A\uFF08AOSP \u70B9\u51FB\u8DF3 BatterySaverSettings \u5B50\u9875\uFF0C
              Web \u76F4\u63A5 toggle \u4E0E QS \u78C1\u8D34\u5355\u4E00\u771F\u6E90\u53CC\u5411\u540C\u6B65\uFF09 -->
          <div class="md3-list-item" data-test="battery-saver-summary" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u7701\u7535\u6A21\u5F0F</span><span id="settingsBatterySaverSummary" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5DF2\u5173\u95ED</span></span>
            <label class="md3-switch"><input type="checkbox" id="settingsBatterySaverSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <!-- \u2465 smart_battery_manager\u300C\u7535\u6C60\u7BA1\u7406\u5668\u300D\uFF1AAVAILABLE\uFF08isBatteryManagerSupported=true
              + consider_ac=false \u77ED\u8DEF\uFF09\uFF1B\u6458\u8981 battery_manager_summary_unsupported\uFF1B
              fragment=SmartBatterySettings \u5B50\u9875\u672A\u8F6C\u6B63\uFF0C\u5FE0\u5B9E\u5165\u53E3\u884C -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="smart-battery-manager" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u7535\u6C60\u7BA1\u7406\u5668</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u68C0\u6D4B\u5E94\u7528\u5927\u91CF\u6D88\u8017\u7535\u6C60\u7535\u91CF\u7684\u60C5\u51B5</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <!-- \u2466 status_bar_show_battery_percent\u300C\u7535\u6C60\u7535\u91CF\u767E\u5206\u6BD4\u300D\uFF1AAVAILABLE
              \uFF08config_battery_percentage_setting_available=true frameworks:5222\uFF09\uFF1B
              summary=battery_percentage_description\uFF1B\u9ED8\u8BA4\u663E\u793A\uFF08config_defaultBatteryPercentageSetting
              =false \u7684\u5E73\u53F0\u5DEE\u5F02\u6CE8\u8BB0\uFF1AiOS pill \u767E\u5206\u6BD4\u89C6\u89C9\u6838\u5FC3\uFF0C\u5408\u6CD5\u8D85\u8D8A\uFF09\uFF1B
              \u6D88\u8D39\u70B9 status-bar.js .battery-pct \u663E\u9690 -->
          <div class="md3-list-item" data-test="status-bar-battery-percent" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u7535\u6C60\u7535\u91CF\u767E\u5206\u6BD4</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5728\u72B6\u6001\u680F\u4E2D\u663E\u793A\u7535\u6C60\u7535\u91CF\u767E\u5206\u6BD4</span></span>
            <label class="md3-switch"><input type="checkbox" id="settingsStatusBarBatteryPercentSwitch" checked><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <!-- \u2467 battery_help_message\uFF1APowerUsageSummary.initPreference setVisible(false) \u9ED8\u8BA4\u9690\u85CF\uFF0C
            \u4EC5 !Utils.isBatteryPresent() \u663E\u793A \u2192 Web \u865A\u62DF\u7535\u6C60\u6052\u5B58\u5728 \u2192 \u6052\u9690\u85CF\u6CE8\u8BB0 -->
        <!-- \u2468 power_usage_footer\uFF1AFooterPreference battery_footer_summary -->
        <p data-test="power-usage-footer" style="color:var(--md-on-surface-variant,#9a9b9e);font-size:12px;margin-top:16px;text-align:center;">\u5269\u4F59\u7535\u91CF\u4E3A\u5927\u81F4\u6570\u636E\uFF0C\u4E14\u53EF\u80FD\u4F1A\u56E0\u4F7F\u7528\u60C5\u5F62\u800C\u53D8\u5316</p>

        <!-- ============ Web \u6269\u5C55\u533A\uFF08\u94C1\u5F8B#2 \u5408\u6CD5\u8D85\u8D8A\uFF1AAOSP XML \u65E0\u5BF9\u5E94\u6761\u76EE\u7684\u771F\u5B9E\u529F\u80FD\u4FDD\u7559\uFF09 ============ -->
        <div class="md3-card" style="padding:4px 0;margin-top:12px;overflow:hidden;text-align:left;">
          <div class="md3-list-item" style="cursor:default;align-items:flex-start;">
            <div class="md3-list-item-icon" style="margin-top:10px;">${i.speed}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;">\u8017\u7535\u901F\u7387</div>
              <div id="settingsBatteryDrainRate" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 10px;">\u6D4B\u91CF\u4E2D \xB7 \u9700\u89C2\u5BDF\u4E00\u683C\u7535\u91CF\u53D8\u5316</div>
            </div>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;align-items:flex-start;">
            <div class="md3-list-item-icon" style="margin-top:10px;">${i.battery_charging}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;">\u5145\u7535\u901F\u7387</div>
              <div id="settingsBatteryChargeRate" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 10px;">\u63A5\u5165\u5145\u7535\u5668\u540E\u5F00\u59CB\u6D4B\u91CF</div>
            </div>
          </div>
        </div>

        <!-- v11.50 #100 \u7535\u6C60\u5065\u5EB7\u5361\uFF08Web \u6269\u5C55\u533A\xB7\u94C1\u5F8B#2\uFF09\uFF1AA14+ Pixel\u300C\u7535\u6C60\u5065\u5EB7\u300D\u4FE1\u606F\u9762\u5BF9\u6807\u3002
            Web \u57DF\u65E0 fuel gauge BMS\uFF08Battery Status API \u65E0 health/cycle\uFF09\u2192 \u6A21\u62DF\u6A21\u578B\uFF0C
            \u5361\u5185\u660E\u793A\u6807\u6CE8\uFF08\u8BAE\u9898\u89C4\u683C\u300C\u5728 UI \u660E\u786E\u6807\u6CE8\u4E3A\u6A21\u62DF\u300D\u9010\u5B57\u627F\u63A5\uFF09\uFF1B\u5BB9\u91CF = 0.025%/\u5FAA\u73AF
            \u7EBF\u6027\u7F13\u964D\uFF08800 \u5FAA\u73AF\u219280%\uFF0C\u4E0B\u9650\u94B3\u5236\uFF09\uFF0C\u5FAA\u73AF = \u5145\u7535\u541E\u5410\u7B49\u6548\u6EE1\u5145\uFF08\u6BCF\u5145\u5165 100%
            \u2248 1 \u5FAA\u73AF\uFF0C\u653E\u7535\u4E0D\u7D2F\u8BA1\uFF09\uFF1B\u771F\u6E90 battery-service.getBatteryHealth\uFF08\u7EAF\u6A21\u578B
            aosp/battery-health.js\uFF09 -->
        <div class="md3-card" data-test="battery-health" style="padding:4px 0 14px;margin-top:12px;overflow:hidden;text-align:left;">
          <div class="md3-list-item" style="cursor:default;align-items:flex-start;">
            <div class="md3-list-item-icon" style="margin-top:10px;">${i.battery_full}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;display:flex;align-items:center;gap:8px;">\u7535\u6C60\u5065\u5EB7<span id="settingsBatteryHealthStatus" style="font-size:12px;font-weight:600;">\u826F\u597D</span></div>
              <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 8px;">\u76F8\u5BF9\u8BBE\u8BA1\u5BB9\u91CF\uFF08\u6A21\u62DF\u6570\u636E\uFF1A\u6D4F\u89C8\u5668 Battery API \u4E0D\u63D0\u4F9B\u5065\u5EB7\u5EA6\uFF0C\u6309\u5145\u7535\u541E\u5410\u6A21\u578B\u4F30\u7B97\uFF09</div>
              <div style="max-width:220px;height:6px;border-radius:99px;background:var(--md-surface-container-high,#353639);overflow:hidden;">
                <div id="settingsBatteryHealthBar" style="width:100%;height:100%;border-radius:99px;background:var(--md-success,#a8f5bb);transition:width .6s cubic-bezier(.2,.8,.2,1);"></div>
              </div>
              <div id="settingsBatteryHealthPct" style="font-size:22px;font-weight:500;margin-top:6px;">100%</div>
              <div id="settingsBatteryHealthCycles" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 4px;">\u7D2F\u8BA1\u5145\u7535 0% \xB7 \u5FAA\u73AF 0 \u6B21</div>
            </div>
          </div>
          <div id="settingsBatteryHealthSuggest" style="display:none;margin:0 16px 12px;padding:10px 14px;border-radius:12px;background:var(--md-tertiary-container,#4a3f2b);">
            <div id="settingsBatteryHealthSuggestText" style="font-size:12.5px;color:var(--md-on-tertiary-container,#ffdf9e);">\u5F00\u542F\u5145\u7535\u4E0A\u9650\uFF0880%\uFF09\u6709\u52A9\u4E8E\u5EF6\u7F13\u7535\u6C60\u8001\u5316</div>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" data-test="battery-health-limit" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;">\u5145\u7535\u4E0A\u9650</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">\u5145\u81F3 80% \u540E\u6682\u505C\u5145\u7535\u4EE5\u5EF6\u7F13\u7535\u6C60\u8001\u5316\uFF08A14+ BatteryChargeLimit \u8BED\u4E49 \xB7 \u6A21\u62DF\u7535\u6C60\u751F\u6548\uFF09</div>
            </div>
            <label class="md3-switch"><input type="checkbox" id="settingsBatteryHealthLimitSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>

        <div class="md3-card" id="settingsSimChargerCard" style="padding:4px 0;margin-top:12px;overflow:hidden;text-align:left;display:none;">
          <div class="md3-list-item">
            <div class="md3-list-item-icon">${i.bolt}</div>
            <span class="md3-list-item-text">\u63A5\u5165\u5145\u7535\u5668\uFF08\u6A21\u62DF\uFF09</span>
            <label class="md3-switch"><input type="checkbox" id="settingsSimChargerSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>

        <!-- v7.80 \u5145\u7535\u6D9F\u6F2A\u5361\uFF1A\u9884\u89C8 + \u5145\u7535\u53E3\u4F4D\u7F6E\uFF08\u624B\u673A/\u5E73\u677F\u968F\u6A2A\u7AD6\u5C4F\u81EA\u52A8\u89E3\u6790\uFF09+ \u6D9F\u6F2A\u989C\u8272 -->
        <div class="md3-card" style="padding:4px 0 14px;margin-top:12px;overflow:hidden;text-align:left;">
          <div class="md3-list-item" style="cursor:default;">
            <div class="md3-list-item-icon">${i.water_drop}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;">\u5145\u7535\u6D9F\u6F2A</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 8px;">\u63A5\u5165\u5145\u7535\u5668\u65F6\u4ECE\u5145\u7535\u53E3\u6269\u6563\u7684 Expressive \u6D9F\u6F2A</div>
            </div>
            <button id="ripplePreviewBtn" style="border:0;border-radius:999px;padding:8px 18px;font:inherit;font-size:13px;font-weight:600;background:var(--md-primary-container,var(--md-primary,#a8c7fa));color:var(--md-on-primary-container,var(--md-on-primary,#042e4e));cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;">\u9884\u89C8</button>
          </div>
          <div style="padding:2px 16px 0;">
            <div style="font-size:12px;color:var(--md-outline,#6a6b6e);margin:6px 0 8px;">\u624B\u673A\u5145\u7535\u53E3\u4F4D\u7F6E\uFF08\u7AD6\u5C4F\uFF09</div>
            <div id="ripplePortPhoneSeg" style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="ripple-chip" data-port="bc" aria-pressed="true" style="border:1px solid var(--md-outline-variant,#3a3b3e);border-radius:999px;padding:7px 14px;font:inherit;font-size:12.5px;font-weight:500;background:transparent;color:var(--md-on-surface-variant,#c4c7c5);cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;">\u5E95\u90E8\u4E2D\u592E</button>
              <button class="ripple-chip" data-port="br" aria-pressed="false" style="border:1px solid var(--md-outline-variant,#3a3b3e);border-radius:999px;padding:7px 14px;font:inherit;font-size:12.5px;font-weight:500;background:transparent;color:var(--md-on-surface-variant,#c4c7c5);cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;">\u5E95\u90E8\u504F\u53F3</button>
              <button class="ripple-chip" data-port="cc" aria-pressed="false" style="border:1px solid var(--md-outline-variant,#3a3b3e);border-radius:999px;padding:7px 14px;font:inherit;font-size:12.5px;font-weight:500;background:transparent;color:var(--md-on-surface-variant,#c4c7c5);cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;">\u5C4F\u5E55\u4E2D\u592E</button>
            </div>
            <div style="font-size:12px;color:var(--md-outline,#6a6b6e);margin:14px 0 8px;">\u5E73\u677F / \u6A2A\u5C4F\u5145\u7535\u53E3\u4F4D\u7F6E</div>
            <div id="ripplePortTabletSeg" style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="ripple-chip" data-port="lc" aria-pressed="true" style="border:1px solid var(--md-outline-variant,#3a3b3e);border-radius:999px;padding:7px 14px;font:inherit;font-size:12.5px;font-weight:500;background:transparent;color:var(--md-on-surface-variant,#c4c7c5);cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;">\u5DE6\u4FA7\u4E2D\u592E</button>
              <button class="ripple-chip" data-port="rc" aria-pressed="false" style="border:1px solid var(--md-outline-variant,#3a3b3e);border-radius:999px;padding:7px 14px;font:inherit;font-size:12.5px;font-weight:500;background:transparent;color:var(--md-on-surface-variant,#c4c7c5);cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;">\u53F3\u4FA7\u4E2D\u592E</button>
            </div>
            <div style="font-size:12px;color:var(--md-outline,#6a6b6e);margin:14px 0 8px;">\u6D9F\u6F2A\u989C\u8272</div>
            <div id="rippleColorRow" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding-bottom:4px;">
              <button class="ripple-swatch" data-color="" aria-pressed="true" title="\u8DDF\u968F\u4E3B\u9898" style="width:30px;height:30px;border-radius:50%;border:2px solid var(--md-outline-variant,#3a3b3e);cursor:pointer;padding:0;background:var(--md-primary,#a8c7fa);touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
              <button class="ripple-swatch" data-color="27,114,200" aria-pressed="false" title="\u7ECF\u5178\u84DD" style="width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background:#1b72c8;touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
              <button class="ripple-swatch" data-color="103,80,164" aria-pressed="false" title="M3 \u7D2B" style="width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background:#6750a4;touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
              <button class="ripple-swatch" data-color="16,108,124" aria-pressed="false" title="\u9752\u7EFF" style="width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background:#107c8c;touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
              <button class="ripple-swatch" data-color="255,255,255" aria-pressed="false" title="\u7EAF\u767D" style="width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background:#ffffff;touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
              <button class="ripple-swatch" data-color="0,191,165" aria-pressed="false" title="\u8584\u8377" style="width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background:#00bfa5;touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
              <button class="ripple-swatch" data-color="255,171,64" aria-pressed="false" title="\u7425\u73C0" style="width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background:#ffab40;touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
            </div>
          </div>
        </div>
      </div>`},{title:"\u5DF2\u79FB\u9664\u7684\u5E94\u7528",content:`<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;">\u4ECE\u684C\u9762\u79FB\u9664\u7684\u5E94\u7528\u53EF\u4EE5\u5728\u6B64\u6062\u590D</div>
        <div id="removedAppsList"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var list = document.getElementById('removedAppsList');
            if (!list) return;
            // \u672C\u5E94\u7528\u7531\u684C\u9762\u6587\u6863 DOM \u6CE8\u5165\u6E32\u67D3\uFF1Awindow \u5373\u684C\u9762\u4E0A\u4E0B\u6587\u3002
            // \u6062\u590D\u6D88\u606F\u5FC5\u987B\u53D1\u7ED9\u684C\u9762\u81EA\u8EAB\uFF08\u65E7\u5B9E\u73B0 window.parent \u5728\u58F3\u9875 iframe \u5D4C\u5957\u65F6
            // \u6307\u5411\u58F3\u9875\uFF0C\u58F3\u9875\u65E0\u76D1\u542C\u5668\uFF0C\u5BFC\u81F4"\u70B9\u6062\u590D\u65E0\u53CD\u5E94"\uFF09\uFF1Bparent \u4EC5\u4F5C iframe
            // \u627F\u8F7D\u5F62\u6001\u7684\u515C\u5E95\uFF08\u6B64\u65F6 parent \u624D\u662F\u684C\u9762\uFF09\u3002
            function postRestore(appId) {
              try { window.postMessage({ type: 'restore-app', appId: appId }, '*'); } catch (e) {}
              if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: 'restore-app', appId: appId }, '*'); } catch (e) {}
              }
            }
            function renderList() {
              var removed = [];
              try { removed = JSON.parse(localStorage.getItem('ios-desktop:removed-apps') || '[]'); } catch(e) {}
              list.innerHTML = '';
              if (removed.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:48px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;">\u6682\u65E0\u5DF2\u79FB\u9664\u7684\u5E94\u7528</div>';
                return;
              }
              removed.forEach(function(app) {
                var item = document.createElement('div');
                item.className = 'md3-card';
                item.style.cssText = 'display:flex;align-items:center;gap:14px;padding:14px 18px;margin-bottom:12px;';
                // \u56FE\u6807\u4E0E\u684C\u9762\u540C\u6E90\uFF1A\u672C\u5730 SVG\uFF08app-icons.js\uFF09\uFF0C\u4E0D\u518D\u8BFB\u9057\u7559\u7F51\u7EDC\u56FE app.iconUrl
                var iconHTML = '<div style="width:42px;height:42px;border-radius:12px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(app.id) + '</div>';
                item.innerHTML = iconHTML + '<span style="flex:1;font-size:15px;font-weight:500;color:var(--md-on-surface,hsl(var(--md-h,215) 10% 90%));">'+app.name+'</span><button class="md3-btn md3-btn-filled" style="padding:6px 18px;font-size:13px;" data-app-id="'+app.id+'" data-act="restore">\u6062\u590D</button>';
                item.querySelector('[data-act="restore"]').addEventListener('click', function() {
                  var appId = this.getAttribute('data-app-id');
                  postRestore(appId);
                  setTimeout(function() { if (window.popSubPage) window.popSubPage(); }, 300);
                });
                list.appendChild(item);
              });
            }
            renderList();
            // \u5E94\u7528\u5B9E\u4F8B\u5E38\u9A7B\u5185\u5B58\uFF1A\u6BCF\u6B21\u8BE5\u5B50\u9875\u91CD\u65B0\u6FC0\u6D3B\u65F6\u91CD\u5EFA\u5217\u8868\uFF0C\u907F\u514D\u5C55\u793A\u5DF2\u6062\u590D\u8FC7\u7684\u65E7\u6761\u76EE
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 3) renderList();
            });
          })();
        <\/script>
      </div>`},{title:"\u63D0\u793A\u97F3\u548C\u632F\u52A8",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u63D0\u793A\u97F3\u548C\u632F\u52A8</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u97F3\u91CF\u3001\u94C3\u58F0\u3001\u63D0\u793A\u97F3\uFF08AOSP SoundSettings\uFF09</div>
          <!-- remote_media_group\uFF08order -185\uFF09\uFF1ARemoteVolumeGroupController.getAvailabilityStatus
              mRoutingSessionInfos.isEmpty() \u2192 CONDITIONALLY_UNAVAILABLE\uFF08isAvailable \u767D\u540D\u5355\u5916\u4E0D\u6E32\u67D3\uFF1B
              Web \u65E0\u8FDC\u7A0B\u5A92\u4F53\u8DEF\u7531\u4F1A\u8BDD\uFF09\u9690\u85CF\u6CE8\u8BB0 -->
          <!-- media_volume\uFF08order -180\uFF09\uFF1AMediaVolumePreferenceController\uFF08config_show_media_volume=true\uFF09
              AVAILABLE\uFF1B\u771F\u5B9E\u8054\u52A8 __settingsMedia\uFF08HTML5 Audio \u5F15\u64CE\u97F3\u91CF\uFF09 -->
          <div class="md3-list-item" data-test="snd-media" style="min-height:76px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div class="md3-list-item-icon">${e.volMedia||""}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:15px;">\u5A92\u4F53\u97F3\u91CF</span>
                <span id="sndMediaVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">60%</span>
              </div>
              <div class="md3-slider" id="sndMediaSlider" style="margin-top:6px;">
                <div class="md3-slider-line"></div>
                <div class="md3-slider-fill" id="sndMediaFill"></div>
                <div class="md3-slider-thumb" id="sndMediaThumb"></div>
              </div>
            </div>
          </div>
          <!-- media_output\uFF08order -175\uFF09\uFF1AAudioSwitchPreferenceController.getAvailabilityStatus
              FeatureFlagUtils DEFAULT_FLAGS.put("settings_audio_switcher","true") + FEATURE_BLUETOOTH
              \u2192 AVAILABLE\uFF1BdisplayPreference \u65E0\u5A92\u4F53\u4F1A\u8BDD\u6807\u9898\u53D6 media_output_title_without_playing
              \u300C\u97F3\u9891\u64AD\u653E\u4F4D\u7F6E\uFF1A\u300D\uFF0C\u6458\u8981 media_output_default_summary\u300C\u6B64\u8BBE\u5907\u300D -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="snd-media-output" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u97F3\u9891\u64AD\u653E\u4F4D\u7F6E\uFF1A</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u6B64\u8BBE\u5907</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- call_volume\uFF08order -170\uFF09\uFF1ACallVolumePreferenceController\uFF08config_show_call_volume=true
              && !AudioSystem.isSingleVolume(config_single_volume=false)\uFF09AVAILABLE -->
          <div class="md3-list-item" data-test="snd-call" style="min-height:76px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div class="md3-list-item-icon">${e.volCall||""}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:15px;">\u901A\u8BDD\u97F3\u91CF</span>
                <span id="sndCallVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">50%</span>
              </div>
              <div class="md3-slider" id="sndCallSlider" style="margin-top:6px;">
                <div class="md3-slider-line"></div>
                <div class="md3-slider-fill" id="sndCallFill"></div>
                <div class="md3-slider-thumb" id="sndCallThumb"></div>
              </div>
            </div>
          </div>
          <!-- take_call_on_output\uFF08order -165\uFF09\uFF1AHandsFreeProfileOutputPreferenceController \u57FA\u7C7B
              AVAILABLE\uFF0C\u4F46 updateState \u65E0 HFP/HAP \u8FDE\u63A5\u8BBE\u5907 setVisible(false) \u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- separate_ring_volume\uFF08order -155\uFF09\uFF1ASeparateRingVolumePreferenceController
              (!isSingleVolume) AVAILABLE\u2014\u2014\u94C3\u58F0\u4E0E\u901A\u77E5\u5206\u8F68\u7684\u94C3\u58F0\u97F3\u91CF\uFF08STREAM_RING\uFF09 -->
          <div class="md3-list-item" data-test="snd-ring" style="min-height:76px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div class="md3-list-item-icon">${e.volRing||""}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:15px;">\u94C3\u58F0\u97F3\u91CF</span>
                <span id="sndRingVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">70%</span>
              </div>
              <div class="md3-slider" id="sndRingSlider" style="margin-top:6px;">
                <div class="md3-slider-line"></div>
                <div class="md3-slider-fill" id="sndRingFill"></div>
                <div class="md3-slider-thumb" id="sndRingThumb"></div>
              </div>
            </div>
          </div>
          <!-- notification_volume\uFF08order -150\uFF09\uFF1ANotificationVolumePreferenceController
              (config_show_notification_volume=true && !isSingleVolume && RINGER_MODE_NORMAL)
              AVAILABLE -->
          <div class="md3-list-item" data-test="snd-notif" style="min-height:76px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div class="md3-list-item-icon">${e.volNotif||""}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:15px;">\u901A\u77E5\u97F3\u91CF</span>
                <span id="sndNotifVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">70%</span>
              </div>
              <div class="md3-slider" id="sndNotifSlider" style="margin-top:6px;">
                <div class="md3-slider-line"></div>
                <div class="md3-slider-fill" id="sndNotifFill"></div>
                <div class="md3-slider-thumb" id="sndNotifThumb"></div>
              </div>
            </div>
          </div>
          <!-- alarm_volume\uFF08order -140\uFF09\uFF1AAlarmVolumePreferenceController
              (config_show_alarm_volume=true && !isSingleVolume) AVAILABLE\u3002
              #11 \u65F6\u949F\u5E94\u7528\u524D\u7F6E\u4F9D\u8D56\uFF1A\u95F9\u949F\u54CD\u94C3\u97F3\u91CF\u6D88\u8D39 window.__settingsSoundStore.get('alarm') -->
          <div class="md3-list-item" data-test="snd-alarm" style="min-height:76px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div class="md3-list-item-icon">${e.volAlarm||""}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:15px;">\u95F9\u949F\u97F3\u91CF</span>
                <span id="sndAlarmVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">70%</span>
              </div>
              <div class="md3-slider" id="sndAlarmSlider" style="margin-top:6px;">
                <div class="md3-slider-line"></div>
                <div class="md3-slider-fill" id="sndAlarmFill"></div>
                <div class="md3-slider-thumb" id="sndAlarmThumb"></div>
              </div>
            </div>
          </div>
          <!-- zen_mode\uFF08order -130\uFF09\uFF1AZenModePreferenceController
              Flags.modesUi() ? UNSUPPORTED_ON_DEVICE : AVAILABLE_UNSEARCHABLE\u2014\u2014\u4E00\u7EA7\u300C\u6A21\u5F0F\u300D
              ZenModesLink \u540C flag \u6B63\u5411\u95E8\u63A7\uFF08v7.98 \u5DF2\u8F6C\u6B63\uFF09\u2192 \u672C\u884C\u53CD\u5411 UNSUPPORTED \u9690\u85CF\uFF08v8.01 \u4E00\u81F4\u6027\u88C1\u51B3\uFF09 -->
          <!-- phone_ringtone\uFF08order -120\uFF09\uFF1ADefaultRingtonePreference\uFF1BPhoneRingtonePreferenceController
              isVoiceCapable\uFF08Pixel \u624B\u673A\u5F62\u6001\uFF09\u2192 AVAILABLE\uFF1Bsummary=summary_placeholder \u5FE0\u5B9E\u7A7A\u5448\u73B0 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="snd-phone-ringtone" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">\u624B\u673A\u94C3\u58F0</span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- Live Caption\uFF08-110\uFF09/ Now Playing\uFF08-105\uFF09\uFF1AXML \u6CE8\u91CA\u58F0\u660E\u7531\u4EE3\u7801\u52A8\u6001\u63D2\u5165\uFF0C\u5F53\u524D
              SoundSettings.buildPreferenceControllers \u672A\u6CE8\u518C\u5BF9\u5E94 controller \u2192 \u4E0D\u6E32\u67D3\u6CE8\u8BB0 -->
          <!-- spatial_audio_summary\uFF08order -107\uFF09\uFF1ASpatialAudioParentPreferenceController
              Spatializer.SPATIALIZER_IMMERSIVE_LEVEL_NONE \u2192 UNSUPPORTED_ON_DEVICE\uFF08Web \u65E0\u7A7A\u95F4\u97F3\u9891\u786C\u4EF6\uFF09\u9690\u85CF\u6CE8\u8BB0 -->
          <!-- media_controls_summary\uFF08order -100\uFF09\uFF1AMediaControlsParentPreferenceController AVAILABLE\uFF1B
              \u52A8\u6001\u6458\u8981 Secure.MEDIA_CONTROLS_RESUME \u9ED8\u8BA4 1 \u2192 media_controls_show_player\u300C\u663E\u793A\u64AD\u653E\u5668\u300D -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="snd-media-controls" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5A92\u4F53</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u663E\u793A\u64AD\u653E\u5668</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- vibration_and_haptics\uFF08order -90\uFF09\uFF1AVibrationPreferenceController\uFF08hasVibrator \u2192
              AVAILABLE\uFF09\uFF0C\u52A8\u6001\u6458\u8981 getSummary VIBRATE_ON \u9ED8\u8BA4\u5F00 \u2192 \u300C\u5DF2\u5F00\u542F\u300D\uFF08v8.02 \u9875 20 \u540C\u6B3E\u8BED\u4E49\uFF09\uFF1B
              fragment=VibrationSettings \u5B50\u9875\u672A\u8F6C\u6B63\uFF0C\u5FE0\u5B9E\u5165\u53E3\u884C -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="snd-vibration" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u632F\u52A8\u548C\u89E6\u611F\u53CD\u9988</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5DF2\u5F00\u542F</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- gesture_prevent_ringing_sound\uFF08order -80\uFF09\uFF1APreventRingingParentPreferenceController
              (config_volumeHushGestureEnabled=true && config_longPressOnPowerForAssistantSettingAvailable=true)
              AVAILABLE\uFF1BPrimarySwitchPreference \u5F00\u5173 + fragment \u5B50\u9875\u8BED\u4E49 -->
          <div class="md3-list-item" data-test="snd-prevent-ringing" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">\u963B\u6B62\u54CD\u94C3\u7684\u5FEB\u6377\u65B9\u5F0F</span>
            <label class="md3-switch"><input type="checkbox" id="sndPreventRingingToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- notification_ringtone\uFF08order -70\uFF09\uFF1ADefaultRingtonePreference\uFF1B
              NotificationRingtonePreferenceController config_show_notification_ringtone=true \u2192 AVAILABLE -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="snd-notif-ringtone" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">\u9ED8\u8BA4\u901A\u77E5\u63D0\u793A\u97F3</span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- alarm_ringtone\uFF08order -60\uFF09\uFF1ADefaultRingtonePreference\uFF08persistent=false\uFF09\uFF1B
              AlarmRingtonePreferenceController \u65E0\u95E8\u63A7 \u2192 AVAILABLE -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="snd-alarm-ringtone" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">\u9ED8\u8BA4\u95F9\u949F\u63D0\u793A\u97F3</span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- dtmf_tone\uFF08order -50\uFF09\uFF1ADialPadTonePreferenceController isVoiceCapable \u2192 AVAILABLE\uFF1B
              SettingPref TYPE_SYSTEM DTMF_TONE_WHEN_DIALING \u9ED8\u8BA4 DEFAULT_ON(1) -->
          <div class="md3-list-item" data-test="snd-dtmf" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">\u62E8\u53F7\u952E\u76D8\u63D0\u793A\u97F3</span>
            <label class="md3-switch"><input type="checkbox" id="sndDtmfToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- screen_locking_sounds\uFF08order -45\uFF09\uFF1AScreenLockSoundPreferenceController
              config_show_screen_locking_sounds=true \u2192 AVAILABLE\uFF1BSystem.LOCKSCREEN_SOUNDS_ENABLED \u9ED8\u8BA4\u5F00 -->
          <div class="md3-list-item" data-test="snd-screenlock" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">\u5C4F\u5E55\u9501\u5B9A\u63D0\u793A\u97F3</span>
            <label class="md3-switch"><input type="checkbox" id="sndScreenLockToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- charging_sounds\uFF08order -40\uFF09\uFF1AChargingSoundPreferenceController
              config_show_charging_sounds=true \u2192 AVAILABLE\uFF1BSecure.CHARGING_SOUNDS_ENABLED \u9ED8\u8BA4\u5F00 -->
          <div class="md3-list-item" data-test="snd-charging" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">\u5145\u7535\u63D0\u793A\u97F3\u548C\u632F\u52A8</span>
            <label class="md3-switch"><input type="checkbox" id="sndChargingToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- docking_sounds\uFF08order -35\uFF09\uFF1ADockingSoundPreferenceController \u65E0\u95E8\u63A7 \u2192 AVAILABLE\uFF1B
              Global.DOCK_SOUNDS_ENABLED \u9ED8\u8BA4 DEFAULT_ON(1) -->
          <div class="md3-list-item" data-test="snd-docking" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">\u57FA\u5EA7\u63D0\u793A\u97F3</span>
            <label class="md3-switch"><input type="checkbox" id="sndDockingToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- touch_sounds\uFF08order -30\uFF09\uFF1ATouchSoundPreferenceController config_show_touch_sounds=true
              \u2192 AVAILABLE\uFF1BSystem.SOUND_EFFECTS_ENABLED \u9ED8\u8BA4\u5F00\u2014\u2014\u4E0E sound-haptics \u5F15\u64CE sfxEnabled
              \u540C\u4E00\u8BED\u4E49\u771F\u6E90\u878D\u5408\uFF08\u5F00\u5173\u9A71\u52A8 WebAudio \u5408\u6210\u97F3\u6548\u5F15\u64CE\uFF09 -->
          <div class="md3-list-item" data-test="snd-touchsounds" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">\u70B9\u6309\u548C\u70B9\u51FB\u63D0\u793A\u97F3</span>
            <label class="md3-switch"><input type="checkbox" id="sndTouchSoundsToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- vibrate_icon\uFF08order -27\uFF09\uFF1AVibrateIconPreferenceController isAvailable=mHasVibrator \u2192
              AVAILABLE\uFF1BSecure.STATUS_BAR_SHOW_VIBRATE_ICON \u9ED8\u8BA4 0\uFF08\u5173\uFF09 -->
          <div class="md3-list-item" data-test="snd-vibrateicon" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u4F7F\u7528\u632F\u52A8\u6A21\u5F0F\u65F6\u4E00\u5F8B\u663E\u793A\u632F\u52A8\u56FE\u6807</span></span>
            <label class="md3-switch"><input type="checkbox" id="sndVibrateIconToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- dock_audio_media\uFF08order -20\uFF09\uFF1ADockAudioMediaPreferenceController SettingPref.isApplicable
              =isLeDesk() && R.bool.has_dock_settings(false) \u2192 removePreference \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- boot_sounds\uFF08order -15\uFF09\uFF1ABootSoundPreferenceController isAvailable
              =R.bool.has_boot_sounds(false) \u2192 UNSUPPORTED \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- emergency_tone\uFF08order -10\uFF09\uFF1AEmergencyTonePreferenceController SettingPref.isApplicable
              =TelephonyManager.getCurrentPhoneType()==PHONE_TYPE_CDMA \u2192 GSM/LTE Pixel false
              \u2192 removePreference \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- sound_work_settings\uFF08order 100\uFF09\uFF1AWorkSoundsPreferenceController
              SoundWorkSettings.isSupportWorkProfileSound \u65E0\u5DE5\u4F5C\u8D44\u6599 \u2192 DISABLED_FOR_USER
              \uFF08isAvailable \u767D\u540D\u5355\u5916\uFF09\u9690\u85CF\u6CE8\u8BB0 -->

          <!-- Web \u6269\u5C55\u5361\uFF08\u94C1\u5F8B#2 \u5408\u6CD5\u8D85\u8D8A\uFF1AAOSP XML \u65E0\u5BF9\u5E94\u6761\u76EE\uFF0C\u4FDD\u7559 v7.34 \u65E2\u6709\u771F\u5B9E\u529F\u80FD\uFF09 -->
          <div class="md3-card" style="margin-top:16px;padding:14px 16px;">
            <div style="font-size:13px;font-weight:600;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:10px;">\u7CFB\u7EDF\u97F3\u6548\uFF08Web \u6269\u5C55 \xB7 AOSP \u65E0\u5BF9\u5E94\u6761\u76EE\uFF09</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:14px;">\u97F3\u6548\u97F3\u91CF</span>
              <span id="sfxVolVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">50%</span>
            </div>
            <div class="md3-slider" id="sfxVolSlider">
              <div class="md3-slider-line"></div>
              <div class="md3-slider-fill" id="sfxVolFill"></div>
              <div class="md3-slider-thumb" id="sfxVolThumb"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
              <span style="font-size:14px;">\u89E6\u611F\u632F\u52A8\u53CD\u9988</span>
              <label class="md3-switch"><input type="checkbox" id="sndHapticToggle"><span class="slider"><span class="thumb"></span></span></label>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
              <span style="font-size:14px;">\u6309\u952E\u97F3</span>
              <label class="md3-switch"><input type="checkbox" id="sndKeypressToggle"><span class="slider"><span class="thumb"></span></span></label>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
              <span style="font-size:14px;">\u97F3\u9891\u8D44\u6E90\u6A21\u5F0F\uFF08\u7CFB\u7EDF\u97F3\u6548+\u95F9\u949F/\u8BA1\u65F6\u5668\u94C3\u58F0\u7EDF\u4E00\u56DE\u9000 \xB7 #158/#161\uFF09</span>
              <select id="audioResourceModeSelect" style="padding:6px 10px;border-radius:8px;border:1px solid var(--md-outline-variant,#c4c7c5);background:var(--md-surface-container,#fff);color:var(--md-on-surface,#1c1b1f);font-size:13px;max-width:180px;"><option value="auto">\u81EA\u52A8\uFF08\u91C7\u6837\u4F18\u5148\uFF09</option><option value="asset">\u5F3A\u5236\u771F\u5B9E\u91C7\u6837</option><option value="synth">\u5F3A\u5236\u5408\u6210\u97F3</option></select>
            </div>
            <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:8px;line-height:1.6;">\u7CFB\u7EDF\u97F3\u6548\u91C7\u7528 AOSP \u539F\u5382\u91C7\u6837\uFF08\u79BB\u7EBF\u5185\u7F6E\uFF0C\u65E0\u7F51\u7EDC\u8BF7\u6C42\uFF09\uFF0C\u8D44\u6E90\u4E0D\u53EF\u7528\u65F6\u81EA\u52A8\u56DE\u843D\u4E3A WebAudio \u5B9E\u65F6\u5408\u6210\u97F3\uFF1B\u89E6\u611F\u632F\u52A8\u4F9D\u8D56 navigator.vibrate \u80FD\u529B\uFF08\u90E8\u5206\u684C\u9762\u6D4F\u89C8\u5668\u8C03\u7528\u9759\u9ED8\u65E0\u6548\uFF09\u3002</div>
          </div>
        </div>
        <script>`+I+"<\/script>"},{title:"\u5E94\u7528\u6743\u9650",content:`<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;line-height:1.6;">\u5E94\u7528\u5728\u9996\u6B21\u4F7F\u7528\u76F8\u673A\u3001\u9EA6\u514B\u98CE\u3001\u4F4D\u7F6E\u4FE1\u606F\u7B49\u654F\u611F\u80FD\u529B\u65F6\u4F1A\u5411\u60A8\u7533\u8BF7\u6388\u6743\uFF0C\u53EF\u968F\u65F6\u5728\u6B64\u67E5\u770B\u4E0E\u6539\u5224\uFF1B\u5173\u95ED\u540E\u5E94\u7528\u8C03\u7528\u76F8\u5173\u80FD\u529B\u65F6\u5C06\u88AB\u62D2\u7EDD\u3002<br>\u6CE8\u610F\uFF1A\u5E94\u7528\u5185\u6388\u6743\u4E0E\u6D4F\u89C8\u5668\u5C42\u771F\u5B9E\u6743\u9650\u76F8\u4E92\u72EC\u7ACB\u2014\u2014\u5373\u4F7F\u6B64\u5904\u9009\u62E9\u5141\u8BB8\uFF0C\u6D4F\u89C8\u5668\u4ECD\u53EF\u80FD\u5F39\u51FA\u81EA\u5BB6\u7684\u539F\u751F\u6388\u6743\u6846\uFF0C\u9700\u8981\u60A8\u5728\u6D4F\u89C8\u5668\u91CC\u518D\u5141\u8BB8\u4E00\u6B21\uFF0C\u5C5E\u6B63\u5E38\u884C\u4E3A\u3002</div>
        <div id="permAppsList"></div>
        <div style="text-align:center;margin-top:22px;">
          <button id="permResetBtn" style="background:none;border:1px solid var(--md-outline-variant);color:hsl(var(--md-h,215) 80% 64%);font-size:13.5px;font-weight:600;padding:10px 26px;border-radius:20px;cursor:pointer;">\u91CD\u7F6E\u5168\u90E8\u6743\u9650</button>
        </div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var list = document.getElementById('permAppsList');
            if (!list) return;
            // \u672C\u5E94\u7528\u4E0E\u684C\u9762\u540C\u6587\u6863\u8FD0\u884C\uFF08\u539F\u751F\u9875\u9762\uFF09\uFF0Cwindow.__permissions \u7531 main.js \u521D\u59CB\u5316 permissions.js \u65F6\u6CE8\u518C
            function esc(s) {
// v11.50 #240\uFF1A\u5355\u6E90\u59D4\u6258\u2014\u2014\u8F6C\u4E49\u5B9E\u73B0\u6536\u655B apps/_shared/sanitize.js escapeHtml\uFF08\u672C\u6587\u4EF6\u6B63\u5219\u94FE\u9000\u5F79\uFF0C\u8D1F\u5411\u951A tests/v240\uFF09
              return window.__mdEscape(s);
            }
            function permLabel(k) {
              var meta = window.__permissions && window.__permissions.PERMISSION_META && window.__permissions.PERMISSION_META[k];
              return meta ? meta.label : k;
            }
            function renderList() {
              var P = window.__permissions;
              list.innerHTML = '';
              if (!P) {
                list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">\u6743\u9650\u670D\u52A1\u5C1A\u672A\u5C31\u7EEA</div>';
                return;
              }
              var all = P.getAllPermissions();
              var appIds = Object.keys(all).filter(function(id) {
                var rec = all[id] || {};
                return Object.keys(rec).some(function(k) { return k[0] !== '_'; });
              });
              if (!appIds.length) {
                list.innerHTML = '<div style="text-align:center;padding:48px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;line-height:1.8;">\u6682\u65E0\u6743\u9650\u7533\u8BF7\u8BB0\u5F55<br><span style="font-size:12px;opacity:0.8;">\u5E94\u7528\u9996\u6B21\u4F7F\u7528\u76F8\u673A / \u4F4D\u7F6E\u7B49\u80FD\u529B\u65F6\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC</span></div>';
                return;
              }
              appIds.forEach(function(appId) {
                var rec = all[appId] || {};
                var perms = Object.keys(rec).filter(function(k) { return k[0] !== '_'; });
                if (!perms.length) return;
                var appName = rec.__name || appId;
                // \u56FE\u6807\u4E0E\u684C\u9762\u540C\u6E90\uFF1A\u672C\u5730 SVG\uFF0C\u4E0D\u518D\u8BFB localStorage \u9057\u7559\u7F51\u7EDC\u56FE __icon
                var iconHtml = '<div style="width:38px;height:38px;border-radius:11px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(appId) + '</div>';
                var chipRows = perms.map(function(pk) {
                  var checked = rec[pk] ? ' checked' : '';
                  return '<div style="display:flex;align-items:center;gap:8px;width:50%;min-width:150px;padding:5px 0;box-sizing:border-box;">' +
                    '<span style="font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);flex:1;">' + esc(permLabel(pk)) + '</span>' +
                    '<label class="md3-switch" style="transform:scale(0.8);transform-origin:right center;"><input type="checkbox" data-app="' + esc(appId) + '" data-perm="' + esc(pk) + '"' + checked + '><span class="slider"><span class="thumb"></span></span></label>' +
                    '</div>';
                }).join('');
                var card = document.createElement('div');
                card.className = 'md3-card';
                card.style.cssText = 'padding:10px 16px;margin-bottom:12px;';
                card.innerHTML =
                  '<div style="display:flex;align-items:center;gap:12px;padding:4px 0 8px;">' + iconHtml +
                  '<span style="flex:1;font-size:15px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">' + esc(appName) + '</span>' +
                  '<span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">' + perms.length + ' \u9879\u6743\u9650</span></div>' +
                  '<div style="display:flex;flex-wrap:wrap;gap:0 10px;">' + chipRows + '</div>';
                list.appendChild(card);
              });
              list.querySelectorAll('input[type="checkbox"]').forEach(function(input) {
                input.addEventListener('change', function() {
                  P.setPermission(input.getAttribute('data-app'), input.getAttribute('data-perm'), input.checked);
                  if (window.showSystemToast) window.showSystemToast(input.checked ? '\u5DF2\u5141\u8BB8\u8BE5\u6743\u9650' : '\u5DF2\u62D2\u7EDD\u8BE5\u6743\u9650\uFF0C\u5E94\u7528\u4E0B\u6B21\u8C03\u7528\u65F6\u751F\u6548');
                });
              });
            }
            document.getElementById('permResetBtn').addEventListener('click', function() {
              var P = window.__permissions;
              if (!P) return;
              if (confirm('\u786E\u5B9A\u91CD\u7F6E\u5168\u90E8\u6743\u9650\u8BB0\u5F55\uFF1F\\n\u6240\u6709\u5E94\u7528\u4E0B\u6B21\u4F7F\u7528\u654F\u611F\u80FD\u529B\u65F6\u5C06\u91CD\u65B0\u5F39\u51FA\u6388\u6743\u8BE2\u95EE\u3002')) {
                P.clearAllPermissions();
                renderList();
                if (window.showSystemToast) window.showSystemToast('\u5DF2\u91CD\u7F6E\u5168\u90E8\u6743\u9650\u8BB0\u5F55');
              }
            });
            renderList();
            // \u5E94\u7528\u5B9E\u4F8B\u5E38\u9A7B\u5185\u5B58\uFF1A\u6BCF\u6B21\u8BE5\u5B50\u9875\u91CD\u65B0\u6FC0\u6D3B\u65F6\u91CD\u5EFA\u5217\u8868\uFF0C\u53CD\u6620\u6700\u65B0\u6743\u9650\u72B6\u6001
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 5) renderList();
            });
          })();
        <\/script>
      </div>`},{title:"\u5E94\u7528",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u5E94\u7528</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u6700\u8FD1\u6253\u5F00\u7684\u5E94\u7528\u3001\u9ED8\u8BA4\u5E94\u7528\u3001\u95F2\u7F6E\u5E94\u7528\uFF08AOSP AppDashboardFragment\uFF09</div>
          <!-- \u2460 recent_apps_category\uFF08order -998\uFF09\u300C\u6700\u8FD1\u6253\u5F00\u7684\u5E94\u7528\u300D\uFF1AAppsPreferenceController
              AVAILABLE_UNSEARCHABLE\uFF1B\u4E0E \u2461 all_app_infos \u8FD0\u884C\u65F6\u4E92\u65A5\uFF08refreshUi\uFF1A\u6700\u8FD1\u533A\u975E\u7A7A \u2192
              \u6E32\u67D3\u672C\u533A + see_all_apps\uFF0C\u9690\u85CF all_app_infos\uFF1B\u7A7A \u2192 \u53CD\u4E4B\uFF09\uFF1B\u22644 \u884C
              \uFF08SHOW_RECENT_APP_COUNT=4\uFF09\uFF0C\u884C=AppPreference \u5E94\u7528\u56FE\u6807+\u540D\uFF08\u5F00\u7A97 650ms defer
              \u8BB0\u5F55\u94FE\uFF0C\u4E0E\u684C\u9762\u6700\u8FD1\u4EFB\u52A1/Dock \u540C\u6E90 __settingsAppsBridge.recent()\uFF09 -->
          <div id="appsRecentCategory" data-test="apps-recent-category">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u6700\u8FD1\u6253\u5F00\u7684\u5E94\u7528</div>
            <div id="appsRecentList"></div>
            <!-- see_all_apps\uFF08order 5\uFF09\uFF1A\u6807\u9898\u88AB loadAllAppsCount \u52A8\u6001\u66FF\u6362\u4E3A see_all_apps_title
                ICU \u590D\u6570\u300C\u67E5\u770B\u6240\u6709 N \u4E2A\u5E94\u7528\u300D\uFF08zh =1 \u5206\u652F\u65E0\u8BA1\u6570\u300C\u67E5\u770B\u6240\u6709\u5E94\u7528\u300D\uFF09\uFF1B
                android:icon=@drawable/ic_chevron_right_24dp\uFF08tint colorControlNormal \u2192
                currentColor\uFF0Cicons-aosp.js appsChevron \u952E\uFF09\u2014\u2014XML \u552F\u4E00\u9759\u6001\u56FE\u6807\u884C -->
            <div class="md3-list-item" role="button" tabindex="0" data-test="apps-see-all" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
              <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.appsChevron||""}</span>
              <span style="flex:1;min-width:0;font-size:15px;" id="appsSeeAllTitle">\u67E5\u770B\u6240\u6709\u5E94\u7528</span>
            </div>
          </div>
          <!-- \u2461 all_app_infos\uFF08order -999\uFF09\u300C\u6240\u6709\u5E94\u7528\u300D\uFF1A\u4E0E\u6700\u8FD1\u533A\u8FD0\u884C\u65F6\u4E92\u65A5\u7684\u7A7A\u6001\u5206\u652F\uFF1B
              XML summary=summary_placeholder \u5FE0\u5B9E\u7A7A\uFF0C\u4F46 loadAllAppsCount \u52A8\u6001\u8986\u76D6\u4E3A
              apps_summary\u300C\u5DF2\u5B89\u88C5 N \u4E2A\u5E94\u7528\u300D\uFF08InstalledAppCounter \u62CD\u5E73\u8BA1\u6570\uFF09 -->
          <div class="md3-list-item" id="appsAllInfoRow" data-test="apps-all-info" style="min-height:64px;display:none;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u6240\u6709\u5E94\u7528</span><span id="appsAllInfoSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
          </div>
          <!-- general_category\uFF08order -997\uFF09\u300C\u5E38\u89C4\u300D\uFF1AXML android:visibility="gone" \u7A7A\u5206\u7C7B
              \u2192 \u9690\u85CF\u6CE8\u8BB0\uFF08refreshUi \u4EC5\u5728\u6700\u8FD1\u533A\u975E\u7A7A\u65F6 setVisible(true)\uFF0C\u4F46 XML \u65E0\u5B50\u9879\u6E32\u67D3\u4E3A\u7A7A\uFF09 -->
          <!-- default_apps\uFF08order -996\uFF09\uFF1ADefaultAppsPreferenceController AVAILABLE \u6052\u771F\uFF1B
              \u52A8\u6001\u6458\u8981 getSummary=RoleManager ROLE_BROWSER/ROLE_DIALER/ROLE_SMS \u4E09\u89D2\u8272\u6807\u7B7E
              ListFormatter \u8FDE\u63A5\uFF08zh CLDR\u300CA\u3001B\u548CC\u300D\uFF1B\u6A21\u62DF\u73AF\u5883\u53EF\u89E3\u6790\uFF1A\u6D4F\u89C8\u5668/\u7535\u8BDD/\u4FE1\u606F\uFF09\uFF1B
              intent=ACTION_MANAGE_DEFAULT_APPS_SETTINGS \u5B50\u9875\u672A\u8F6C\u6B63\uFF0C\u5FE0\u5B9E\u5165\u53E3\u884C -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="apps-default-apps" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u9ED8\u8BA4\u5E94\u7528</span><span id="appsDefaultSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- cloned_apps\uFF08order -995\uFF09\u300C\u514B\u9686\u5E94\u7528\u300D\uFF1AClonedAppsPreferenceController
              getAvailabilityStatus=DeviceConfig(NAMESPACE_APP_CLONING,
              PROPERTY_CLONED_APPS_ENABLED \u9ED8\u8BA4 true) && config_cloned_apps_page_enabled
              \u2192 Settings \u4ED3\u5E93 res/values/config.xml:785=false \u2192 UNSUPPORTED_ON_DEVICE
              \u9690\u85CF\u6CE8\u8BB0\uFF08\u52A8\u6001\u6458\u8981 cloned_apps_summary\u300CN \u4E2A\u5DF2\u514B\u9686\uFF0CM \u4E2A\u53EF\u4EE5\u514B\u9686\u300D\u968F\u4E4B\u9690\u85CF\uFF09 -->
          <!-- dashboard_tile_placeholder\uFF08order 10\uFF09\uFF1A\u65E0\u6807\u9898\u7A7A\u5360\u4F4D\u5206\u7C7B \u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- contacts_storage\uFF08order 13\uFF09\u300C\u8054\u7CFB\u4EBA\u5B58\u50A8\u300D\uFF1AContactsStoragePreferenceController
              getAvailabilityStatus=Flags.newDefaultAccountApiEnabled() &&
              mCurrentDefaultAccountAndState != null \u2192 enable_contacts_default_account_in_settings
              \u65E0 default \u884C\uFF08aconfig contacts \u58F0\u660E\u6587\u4EF6\uFF0C\u5224\u6D3B\u89C4\u5219=\u9ED8\u8BA4 false\uFF09+ \u6A21\u62DF\u73AF\u5883
              \u65E0\u8D26\u6237\u6808\u53CC\u8BC1 \u2192 CONDITIONALLY_UNAVAILABLE \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- hibernated_apps\uFF08order 15\uFF09\u300C\u95F2\u7F6E\u5E94\u7528\u300D\uFF1AHibernatedAppsPreferenceController
              getAvailabilityStatus=isHibernationEnabled()=DeviceConfig
              (NAMESPACE_APP_HIBERNATION, PROPERTY_APP_HIBERNATION_ENABLED \u9ED8\u8BA4 true) \u2192
              AVAILABLE\uFF1B\u52A8\u6001\u6458\u8981 unused_apps_summary ICU \u590D\u6570\u300CN \u4E2A\u95F2\u7F6E\u5E94\u7528\u300D
              \uFF08mUnusedCount=PermissionControllerManager.getUnusedAppCount\uFF1B\u6A21\u62DF\u6620\u5C04=
              \u5DF2\u5B89\u88C5\u53BB\u91CD\u96C6\u5408 \u2212 \u6700\u8FD1\u4F7F\u7528\u8BB0\u5F55\u4EA4\u96C6\uFF0C\u89C1 APPS_PAGE_SCRIPT \u6CE8\u91CA\u2465\uFF09\uFF1B
              fragment=ManageApplications(UNUSED_APPS \u5206\u652F) \u5B50\u9875\u672A\u8F6C\u6B63\uFF0C\u5FE0\u5B9E\u5165\u53E3\u884C -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="apps-hibernated" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u95F2\u7F6E\u5E94\u7528</span><span id="appsUnusedSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- app_battery_usage\uFF08order 17\uFF09\u300C\u5E94\u7528\u7684\u7535\u6C60\u4F7F\u7528\u60C5\u51B5\u300D\uFF1A
              AppBatteryUsagePreferenceController getAvailabilityStatus=
              mEnableAppBatteryUsagePage=config_app_battery_usage_list_enabled
              \u2192 Settings \u4ED3\u5E93 res/values/config.xml:737=false \u2192
              CONDITIONALLY_UNAVAILABLE \u9690\u85CF\u6CE8\u8BB0\uFF08\u6458\u8981 app_battery_usage_summary
              \u300C\u8BBE\u7F6E\u5E94\u7528\u5982\u4F55\u4F7F\u7528\u7535\u6C60\u300D\u968F\u4E4B\u9690\u85CF\uFF09 -->
          <!-- special_access\uFF08order 20\uFF09\u300C\u7279\u6B8A\u5E94\u7528\u6743\u9650\u300D\uFF1AXML \u65E0 settings:controller \u2192
              \u6052\u6E32\u67D3\uFF08BasePreferenceController \u672A\u6CE8\u518C\u884C\u4E0D\u53D7\u95E8\u63A7\u4F53\u7CFB\u7BA1\u8F96\uFF09\uFF1B
              fragment=SpecialAccessSettings\uFF08special_access.xml\uFF09\u5B50\u9875\u672A\u8F6C\u6B63\uFF0C\u5FE0\u5B9E\u5165\u53E3\u884C -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="apps-special-access" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u7279\u6B8A\u5E94\u7528\u6743\u9650</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- advanced_category\uFF08order 21\uFF09\u300C\u9AD8\u7EA7\u300D\uFF1AAdvancedAppsPreferenceCategoryController
              children=[aspect_ratio_apps] \u552F\u4E00\u5B50\u9879\u95E8\u63A7\u9690\u85CF \u2192 \u5206\u7C7B\u6574\u533A\u9690\u85CF\u6CE8\u8BB0\uFF1B
              aspect_ratio_apps\uFF08order 22\uFF09\u300C\u5BBD\u9AD8\u6BD4\uFF08\u5B9E\u9A8C\u6027\u529F\u80FD\uFF09\u300D\uFF1A
              UserAspectRatioAppsPreferenceController getAvailabilityStatus=
              UserAspectRatioManager.isFeatureEnabled=DeviceConfig
              (KEY_ENABLE_USER_ASPECT_RATIO_SETTINGS \u9ED8\u8BA4 true) &&
              config_appCompatUserAppAspectRatioSettingsIsEnabled \u2192 frameworks core/res
              res/values/config.xml:6268=false \u2192 CONDITIONALLY_UNAVAILABLE \u9690\u85CF\u6CE8\u8BB0
              \uFF08\u52A8\u6001\u6458\u8981 aspect_ratio_summary_text \u5E26 Build.MODEL \u968F\u4E4B\u9690\u85CF\uFF09 -->
          <!-- ==================== Web \u6269\u5C55\u5361\uFF08\u94C1\u5F8B#2 \u5408\u6CD5\u8D85\u8D8A\uFF09 ====================
              AOSP apps.xml \u65E0\u300C\u5378\u8F7D/\u6062\u590D\u300D\u5BF9\u5E94\u6761\u76EE \u2014\u2014 \u672C\u5361\u4E3A v7.x \u65E2\u6709\u771F\u5B9E\u529F\u80FD\u7684\u4FDD\u7559\u533A
              \uFF08postMessage uninstall/restore \u94FE + \u6587\u4EF6\u5939\u6210\u5458 __settingsFolderUninstall \u6865\uFF0C
              fix(audit-E) \u9012\u5F52\u5C55\u5F00\uFF09\uFF0C\u975E AOSP 1:1 \u8303\u7574\uFF0C\u7279\u6B64\u6807\u6CE8 -->
          <div data-test="apps-mgmt" style="margin-top:18px;">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 6px;">\u5E94\u7528\u7BA1\u7406<span style="margin-left:8px;font-size:11px;padding:2px 8px;border-radius:999px;background:var(--md-secondary-container,#e8def8);color:var(--md-on-secondary-container,#1d192b);vertical-align:middle;">Web \u6269\u5C55 \xB7 \u5408\u6CD5\u8D85\u8D8A</span></div>
            <div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);margin:0 12px 12px;">\u5378\u8F7D\u5C06\u4ECE\u684C\u9762\u79FB\u9664\u5E94\u7528\uFF08\u53EF\u968F\u65F6\u6062\u590D\uFF09\uFF1B\u7CFB\u7EDF\u5E94\u7528\u4E0D\u53EF\u5378\u8F7D</div>
            <div id="installedAppsList" style="padding:0 4px;"></div>
            <div id="appMgmtRemovedSection" style="padding:0 4px;"></div>
          </div>
        </div>
        <script>`+L+`<\/script>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var installedBox = document.getElementById('installedAppsList');
            var removedBox = document.getElementById('appMgmtRemovedSection');
            if (!installedBox || !removedBox) return;
            function postToDesktop(type, appId) {
              try { window.postMessage({ type: type, appId: appId }, '*'); } catch (e) {}
              if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: type, appId: appId }, '*'); } catch (e) {}
              }
            }
            function esc(s) {
// v11.50 #240\uFF1A\u5355\u6E90\u59D4\u6258\u2014\u2014\u8F6C\u4E49\u5B9E\u73B0\u6536\u655B apps/_shared/sanitize.js escapeHtml\uFF08\u672C\u6587\u4EF6\u6B63\u5219\u94FE\u9000\u5F79\uFF0C\u8D1F\u5411\u951A tests/v240\uFF09
              return window.__mdEscape(s);
            }
            function iconHtml(app) {
              // \u4E0E\u684C\u9762\u540C\u6E90\uFF1A\u672C\u5730 SVG\uFF08app-icons.js\uFF09\uFF0C\u4E0D\u518D\u8BFB\u9057\u7559\u7F51\u7EDC\u56FE app.iconUrl
              return '<div style="width:40px;height:40px;border-radius:11px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(app.id) + '</div>';
            }
            function appCard(app, actionLabel, actionType, danger) {
              var isSystem = app.id === 'settings';
              var btn = isSystem
                ? '<span style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);opacity:.7;">\u7CFB\u7EDF\u5E94\u7528</span>'
                : '<button class="md3-btn ' + (danger ? 'md3-btn-tonal' : 'md3-btn-filled') + '" style="padding:6px 18px;font-size:13px;' + (danger ? 'color:#ff8a8a;' : '') + '" data-app-id="' + esc(app.id) + '" data-act="' + actionType + '">' + actionLabel + '</button>';
              return '<div class="md3-card" style="display:flex;align-items:center;gap:14px;padding:12px 16px;margin-bottom:10px;">' +
                iconHtml(app) +
                '<div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:500;color:var(--md-on-surface,#e2e2e9);">' + esc(app.name) + '</div>' +
                '<div style="font-size:11.5px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:1px;">' + esc(app.id) + '</div></div>' +
                btn + '</div>';
            }
            function render() {
              var st = window.__state;
              installedBox.innerHTML = '';
              removedBox.innerHTML = '';
              if (!st || !Array.isArray(st.pagesApps)) {
                installedBox.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">\u684C\u9762\u72B6\u6001\u5C1A\u672A\u5C31\u7EEA</div>';
                return;
              }
              // \u5DF2\u5B89\u88C5\uFF1A\u62CD\u5E73 pagesApps\uFF0C\u6309 id \u53BB\u91CD\uFF08\u6587\u4EF6\u5939\u5185\u7684\u5E94\u7528\u540C\u6837\u7EB3\u5165\uFF09
              // fix(audit-E): \u6587\u4EF6\u5939\u771F\u5B9E\u5B57\u6BB5\u4E3A type:'folder' + apps\uFF08app.children \u6052
              // undefined\uFF09\u2014\u2014 \u6B64\u524D\u6587\u4EF6\u5939\u88AB\u5F53\u666E\u901A\u5E94\u7528\u5217\u5165\u53EF\u5378\u8F7D\u6E05\u5355\uFF08\u526F\u6807\u9898\u663E\u793A\u5185\u90E8
              // folder_xxx id\uFF09\uFF0C\u5176\u6210\u5458\u6C38\u4E0D\u51FA\u73B0\u5728\u6E05\u5355\u3002\u6539\u4E3A\u9012\u5F52\u5C55\u5F00\uFF1A\u8DF3\u8FC7\u6587\u4EF6\u5939\u81EA\u8EAB\u3001
              // \u5176 apps \u6210\u5458\u8BA1\u5165\u6E05\u5355\uFF08\u5D4C\u5957\u9632\u5FA1\uFF1A\u53EA\u4E0B\u94BB\u4E00\u5C42\uFF0C\u6587\u4EF6\u5939\u4E0D\u53EF\u5D4C\u5957\u653E\u7F6E\uFF09\u3002
              var seen = new Set();
              var removedIds = new Set((st.removedApps || []).map(function(a) { return a.id; }));
              var addApp = function(app) {
                if (!app || !app.id || seen.has(app.id) || removedIds.has(app.id)) return;
                seen.add(app.id);
                installedBox.insertAdjacentHTML('beforeend', appCard(app, '\u5378\u8F7D', 'uninstall', true));
              };
              st.pagesApps.forEach(function(page) {
                (page || []).forEach(function(app) {
                  if (app && app.type === 'folder') {
                    (app.apps || []).forEach(addApp);
                    return;
                  }
                  addApp(app);
                });
              });
              removedBox.innerHTML = '<div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:18px 4px 10px;">\u5DF2\u5378\u8F7D\uFF08\u70B9\u51FB\u6062\u590D\uFF09</div>';
              if (!(st.removedApps || []).length) {
                removedBox.insertAdjacentHTML('beforeend', '<div style="text-align:center;padding:22px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">\u6CA1\u6709\u5DF2\u5378\u8F7D\u7684\u5E94\u7528</div>');
              } else {
                st.removedApps.forEach(function(app) {
                  removedBox.insertAdjacentHTML('beforeend', appCard(app, '\u6062\u590D', 'restore', false));
                });
              }
              installedBox.querySelectorAll('[data-act="uninstall"]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  var id = btn.getAttribute('data-app-id');
                  if (confirm('\u786E\u5B9A\u5378\u8F7D\u8BE5\u5E94\u7528\uFF1F\\n\u5176\u684C\u9762\u56FE\u6807\u5C06\u88AB\u79FB\u9664\uFF08\u5E94\u7528\u6570\u636E\u4FDD\u7559\uFF09\uFF0C\u53EF\u968F\u65F6\u5728\u6B64\u6062\u590D\u3002')) {
                    // fix(audit-E): \u6587\u4EF6\u5939\u6210\u5458\u8D70\u6587\u4EF6\u5939\u5378\u8F7D\u6865\uFF08main.js \u7684 uninstall-app
                    // \u53EA\u626B pagesApps \u9876\u5C42\uFF0C\u547D\u4E2D\u4E0D\u4E86 folder.apps \u6210\u5458\uFF09\uFF1B
                    // \u9876\u5C42\u5E94\u7528\u7EF4\u6301\u539F\u6709 postMessage \u94FE\u8DEF\u4E0D\u53D8
                    var viaFolder = window.__settingsFolderUninstall ? window.__settingsFolderUninstall(id) : false;
                    if (!viaFolder) postToDesktop('uninstall-app', id);
                    setTimeout(render, 320);
                  }
                });
              });
              removedBox.querySelectorAll('[data-act="restore"]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  postToDesktop('restore-app', btn.getAttribute('data-app-id'));
                  setTimeout(render, 320);
                });
              });
            }
            render();
            // \u5B9E\u4F8B\u5E38\u9A7B\u5185\u5B58\uFF1A\u91CD\u65B0\u6FC0\u6D3B\u5B50\u9875\u65F6\u91CD\u5EFA\u5217\u8868\uFF0C\u53CD\u6620\u6700\u65B0\u5B89\u88C5\u72B6\u6001
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 6) render();
            });
          })();
        <\/script>`},{title:"\u5B58\u50A8\u7A7A\u95F4",content:`<div style="padding:16px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);">AOSP \u6743\u5A01\u7ED3\u6784 + localStorage/IndexedDB/VFS \u771F\u5B9E\u7EDF\u8BA1</div>
          <button id="storageRefreshBtn" class="md3-btn md3-btn-tonal" style="padding:6px 16px;font-size:13px;flex-shrink:0;">\u91CD\u65B0\u7EDF\u8BA1</button>
        </div>
        <div id="storageAosp" data-test="storage-aosp"></div>
        <div id="storageOverview"></div>
        <div id="storageByOwner"></div>
        <div id="storageTopKeys"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(t, f, o); };
            var aosp = document.getElementById('storageAosp');
            var ov = document.getElementById('storageOverview');
            var byOwnerBox = document.getElementById('storageByOwner');
            var topBox = document.getElementById('storageTopKeys');
            if (!ov) return;
            function fmt(b) { return window.__storageStats ? window.__storageStats.formatBytes(b) : (b || 0) + ' B'; }
            function nameOf(owner) { return window.__storageStats ? window.__storageStats.ownerDisplayName(owner) : owner; }
            function bar(pct, hue) {
              var p = Math.max(1.5, Math.min(100, pct || 0));
              return '<div style="height:6px;border-radius:3px;background:var(--md-outline-variant);overflow:hidden;margin-top:8px;"><div style="height:100%;width:' + p + '%;border-radius:3px;background:hsl(' + (hue || 215) + ' 70% 55%);"></div></div>';
            }
            function esc(s) { return window.__mdEscape(s); } // v11.50 #240 \u5355\u6E90\u59D4\u6258
            // AOSP \u6743\u5A01\u9AA8\u67B6\uFF08\u9759\u6001\u4E00\u6B21\u6CE8\u5165\uFF1B\u5927\u5C0F/\u767E\u5206\u6BD4\u52A8\u6001\u56DE\u586B\uFF09
            aosp.innerHTML =
              /* storage_summary(2)\uFF1AUsageProgressBarPreference \u7B49\u4EF7 */
              '<div class="md3-card" data-test="storage-summary" style="padding:18px 18px 14px;margin-bottom:12px;">' +
                '<div style="font-size:34px;font-weight:700;color:var(--md-on-surface,#e2e2e9);line-height:1.1;"><span id="stgSummaryPct">--</span></div>' +
                '<div id="stgSummaryBar" style="margin-top:10px;"></div>' +
                '<div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:8px;" id="stgSummaryLine">\u6B63\u5728\u7EDF\u8BA1\u2026</div>' +
              '</div>' +
              /* storage_spinner(1)\uFF1A\u5355\u5377\u9690\u85CF\u6CE8\u8BB0\uFF08setVisible(getCount()>1) \u95E8\u63A7\u5B9E\u62C9\uFF09 */
              '<div class="theme-section-hint" data-test="storage-spinner-note" style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin:0 4px 10px;opacity:0.8;line-height:1.6;">' +
                '\u5B58\u50A8\u9009\u62E9\u5668\uFF08storage_spinner\uFF09\uFF1A\u672C\u673A\u4E3A\u5355\u4E00\u5185\u7F6E\u5377\uFF0C\u591A\u5377\u9009\u62E9\u4E0D\u9002\u7528\u2014\u2014AOSP \u5355\u5377\u8BBE\u5907 setVisible(false) \u540C\u6784\uFF0C\u6CE8\u8BB0\u5448\u73B0\u3002</div>' +
              /* toggle_asm(3)\uFF1A\u5B58\u50A8\u7A7A\u95F4\u7BA1\u7406\u5668\uFF08PrimarySwitch\uFF1BWeb \u65E0 Storage Manager \u5907\u4EFD\u540E\u7AEF\u2192\u5F00\u5173\u7981\u7528\u6CE8\u8BB0\uFF09 */
              '<div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:12px;">' +
                '<div class="md3-list-item" data-test="storage-asm" style="cursor:default;">' +
                  '<div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${e.stgStorage||""}</div>' +
                  '<span class="md3-list-item-text">\u5B58\u50A8\u7A7A\u95F4\u7BA1\u7406\u5668' +
                    '<span style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;line-height:1.5;">\u81EA\u52A8\u91CA\u653E\u7A7A\u95F4\uFF08Web \u5F62\u6001\u65E0\u5907\u4EFD\u540E\u7AEF\uFF0C\u5FE0\u5B9E\u5448\u73B0\u4E0D\u53EF\u7528\uFF09</span>' +
                  '</span>' +
                  '<label class="md3-switch"><input type="checkbox" id="stgAsmSwitch" disabled><span class="slider"><span class="thumb"></span></span></label>' +
                '</div>' +
              '</div>' +
              /* free_up_space(4)\uFF1ACardPreference \u2192 Web \u771F\u5B9E\u8DF3\u8F6C\u5185\u5EFA\u6587\u4EF6\u5E94\u7528\uFF08AOSP \u8DF3\u6587\u4EF6\u6781\u5BA2\uFF09 */
              '<div class="md3-card md3-card-elevated" data-test="storage-free-up" id="stgFreeUpBtn" role="button" tabindex="0" style="padding:14px 18px;margin-bottom:14px;cursor:pointer;">' +
                '<div style="font-size:14px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">\u91CA\u653E\u7A7A\u95F4</div>' +
                '<div style="font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;">\u524D\u5F80\u6587\u4EF6\u5E94\u7528\u7BA1\u7406\u548C\u91CA\u653E\u7A7A\u95F4</div>' +
              '</div>' +
              /* \u5206\u7C7B 9 \u884C\uFF08StorageItemPreference\uFF1Bicon \u9010 path \u5B9E\u8BC1 icons-aosp stg* \u952E\uFF09 */
              '<div class="md3-card" data-test="storage-categories" style="padding:4px 0;overflow:hidden;margin-bottom:12px;">' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${e.stgFolder||""}</div><span class="md3-list-item-text">\u6587\u4EF6<span data-test="stg-size-files" id="stgSizeFiles" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">\u2026</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${e.stgPhoto||""}</div><span class="md3-list-item-text">\u56FE\u7247<span id="stgSizeImages" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">\u2026</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${e.stgMovies||""}</div><span class="md3-list-item-text">\u89C6\u9891<span id="stgSizeVideos" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">\u2026</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${e.stgAudio||""}</div><span class="md3-list-item-text">\u97F3\u9891<span id="stgSizeAudio" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">\u2026</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${e.stgApps||""}</div><span class="md3-list-item-text">\u5E94\u7528<span id="stgSizeApps" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">\u2026</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${e.stgGames||""}</div><span class="md3-list-item-text">\u6E38\u620F<span id="stgSizeGames" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">\u2026</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${e.stgFolder||""}</div><span class="md3-list-item-text">\u6587\u6863<span id="stgSizeDocuments" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">\u2026</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${e.stgCategory||""}</div><span class="md3-list-item-text">\u5176\u4ED6<span id="stgSizeOther" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">\u2026</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${e.stgTrash||""}</div><span class="md3-list-item-text">\u56DE\u6536\u7AD9<span id="stgSizeTrash" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">\u2026</span></span></div>' +
              '</div>' +
              /* storage_category_splitter(201)\u300C\u7CFB\u7EDF\u300D\uFF1Apref_system + temporary_files */
              '<div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 4px 8px;" data-test="storage-system-label">\u7CFB\u7EDF</div>' +
              '<div class="md3-card" data-test="storage-system" style="padding:4px 0;overflow:hidden;margin-bottom:12px;">' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${e.stgAndroid||""}</div><span class="md3-list-item-text">Android 17<span id="stgSizeSystem" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">\u2026</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${e.stgDatabase||""}</div><span class="md3-list-item-text">\u4E34\u65F6\u7CFB\u7EDF\u6587\u4EF6<span id="stgSizeTemp" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">\u2026</span></span></div>' +
              '</div>' +
              /* pref_non_current_users(204)\uFF1A\u5355\u7528\u6237\u7A7A\u5206\u7C7B\u6CE8\u8BB0 */
              '<div class="theme-section-hint" data-test="storage-other-users-note" style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin:0 4px 12px;opacity:0.8;line-height:1.6;">' +
                '\u5176\u4ED6\u7528\u6237\uFF08pref_non_current_users\uFF09\uFF1A\u672C\u673A\u4E3A\u5355\u7528\u6237\u5F62\u6001\uFF0CNonCurrentUserController \u8FD4\u56DE\u7A7A\u5217\u8868\u5206\u7C7B\u4E0D\u6E32\u67D3\uFF08AOSP \u591A\u7528\u6237\u8BBE\u5907\u624D\u663E\u793A\uFF09\uFF0C\u6CE8\u8BB0\u5448\u73B0\u3002</div>';
            // \u91CA\u653E\u7A7A\u95F4\u5361 \u2192 \u5185\u5EFA\u6587\u4EF6\u5E94\u7528\uFF08AOSP \u8DF3\u300C\u6587\u4EF6\u6781\u5BA2\u300D\uFF0COPEN_APP \u6DF1\u94FE\u8BED\u4E49\uFF09
            var freeUp = document.getElementById('stgFreeUpBtn');
            if (freeUp) {
              var openFiles = function() {
                try { window.postMessage({ type: 'OPEN_APP', appId: 'files' }, '*'); } catch (e) {}
                try { window.parent.postMessage({ type: 'OPEN_APP', appId: 'files' }, '*'); } catch (e) {}
              };
              freeUp.addEventListener('click', openFiles);
              freeUp.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFiles(); }
              });
            }
            function fill(id, text) {
              var el = document.getElementById(id);
              if (el && el.isConnected) el.textContent = text;
            }
            function render() {
              if (!window.__storageStats) {
                ov.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">\u7EDF\u8BA1\u670D\u52A1\u5C1A\u672A\u5C31\u7EEA</div>';
                return;
              }
              ov.innerHTML = '<div style="text-align:center;padding:26px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">'
                + '<span id="storageStatLoader" style="display:inline-block;vertical-align:middle;width:26px;height:26px;color:var(--md-primary,hsl(var(--md-h,215) 80% 60%));"></span>'
                + '<span style="vertical-align:middle;margin-left:8px;">\u6B63\u5728\u7EDF\u8BA1\u2026</span></div>';
              var statLoaderBox = document.getElementById('storageStatLoader');
              if (statLoaderBox && window.__m3eLoader) window.__m3eLoader.mount(statLoaderBox, { size: 26 });
              byOwnerBox.innerHTML = '';
              topBox.innerHTML = '';
              window.__storageStats.collect().then(function(s) {
                var usage = s.idb.usage || 0, quota = s.idb.quota || 0;
                var remain = Math.max(0, quota - usage);
                var pct = quota ? Math.round(usage / quota * 100) : 0;
                // storage_summary \u884C\uFF1A\u5DF2\u4F7F\u7528 %1$s - \u8FD8\u5269 %2$s\uFF08zh \u6A21\u677F\uFF09+ \u5927\u767E\u5206\u6BD4 + \u8FDB\u5EA6\u6761
                fill('stgSummaryPct', pct + '%');
                fill('stgSummaryLine', '\u5DF2\u4F7F\u7528 ' + fmt(usage) + ' - \u8FD8\u5269 ' + (quota ? fmt(remain) : '\u672A\u77E5'));
                var barBox = document.getElementById('stgSummaryBar');
                if (barBox && barBox.isConnected) barBox.innerHTML = bar(quota ? usage / quota * 100 : 0, 215);
                // \u5206\u7C7B\u884C\uFF08\u771F\u5B9E\u6570\u636E\uFF1AVFS mime \u805A\u5408 + byOwner \u5F52\u5C5E\uFF1BVFS \u952E\u5F52 files \u4E0D\u53CC\u8BA1\uFF09
                var vfsU = (window.__vfs && window.__vfs.usage) ? window.__vfs.usage() : { bytes: 0 };
                var byT = (window.__vfs && window.__vfs.usageByType) ? window.__vfs.usageByType() : { image: 0, video: 0, audio: 0, document: 0, other: 0 };
                var sysBytes = 0, appBytes = 0;
                (s.byOwner || []).forEach(function(o) {
                  if (o.owner === '__system') sysBytes += o.bytes;
                  else if (o.owner !== '__other' && o.owner !== 'files') appBytes += o.bytes;
                });
                var otherBytes = Math.max(0, usage - (vfsU.bytes || 0) - appBytes - sysBytes);
                fill('stgSizeFiles', fmt(vfsU.bytes || 0) + ' \xB7 ' + (vfsU.files || 0) + ' \u4E2A\u6587\u4EF6');
                fill('stgSizeImages', fmt(byT.image));
                fill('stgSizeVideos', fmt(byT.video));
                fill('stgSizeAudio', fmt(byT.audio));
                fill('stgSizeApps', fmt(appBytes));
                fill('stgSizeGames', fmt(0));      // \u65E0\u6E38\u620F\u5A92\u4F53\u6570\u636E\u57DF \u2192 \u5FE0\u5B9E 0 \u503C
                fill('stgSizeDocuments', fmt(byT.document));
                fill('stgSizeOther', fmt(otherBytes));   // \u914D\u989D\u57DF\u5269\u4F59\uFF08\u542B\u58C1\u7EB8/\u5B57\u4F53\u4EE5\u5916\u7684\u672A\u5F52\u7C7B\uFF09
                fill('stgSizeTrash', fmt(0));      // VFS \u65E0\u56DE\u6536\u7AD9\u5B9E\u73B0 \u2192 \u5FE0\u5B9E 0 \u503C
                fill('stgSizeSystem', fmt(sysBytes));    // __system \u5F52\u5C5E\uFF08\u58C1\u7EB8/\u5B57\u4F53/\u7CFB\u7EDF\u952E\uFF09
                fill('stgSizeTemp', fmt(byT.other));     // VFS \u672A\u5206\u7C7Bmime \u2192 \u4E34\u65F6\u6587\u4EF6\u53E3\u5F84\u6CE8\u8BB0
                // ---- \u4EE5\u4E0B Web \u6269\u5C55\u5361\uFF08\u94C1\u5F8B#2 \u4FDD\u7559\uFF09 ----
                var idbPct = s.idb.quota ? Math.min(100, (s.idb.usage / s.idb.quota) * 100) : 0;
                ov.innerHTML =
                  '<div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:14px 4px 8px;">Web \u6269\u5C55 \xB7 \u5B58\u50A8\u4ECB\u8D28\u660E\u7EC6\uFF08\u5408\u6CD5\u8D85\u8D8A\uFF09</div>' +
                  '<div class="md3-card" style="padding:16px 18px;margin-bottom:12px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:var(--md-on-surface,#e2e2e9);"><span>localStorage</span><span>' + fmt(s.ls.total) + ' \xB7 ' + s.ls.keys + ' \u952E</span></div>' +
                    bar(s.ls.total / 5242880 * 100, 215) +
                    '<div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:6px;opacity:.8;">\u7EA6 5MB \u914D\u989D</div>' +
                  '</div>' +
                  '<div class="md3-card" style="padding:16px 18px;margin-bottom:14px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:var(--md-on-surface,#e2e2e9);"><span>IndexedDB\uFF08\u542B\u58C1\u7EB8/\u5B57\u4F53\u6587\u4EF6\uFF09</span><span>' + (s.idb.available ? fmt(s.idb.usage) + (s.idb.quota ? ' / ' + fmt(s.idb.quota) : '') : '\u4E0D\u53EF\u7528') + '</span></div>' +
                    bar(idbPct, 155) +
                    '<div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:6px;opacity:.8;">\u914D\u989D\u4E00\u822C\u4E3A\u78C1\u76D8\u53EF\u7528\u7A7A\u95F4\u7684 60%</div>' +
                  '</div>';
                if (!s.byOwner.length) { byOwnerBox.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">\u6682\u65E0\u6570\u636E</div>'; return; }
                var maxB = s.byOwner[0].bytes || 1;
                var rows = s.byOwner.map(function(o, i) {
                  return '<div style="padding:10px 2px 2px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--md-on-surface,#e2e2e9);"><span>' + esc(nameOf(o.owner)) + '</span><span style="color:var(--md-on-surface-variant,#9a9b9e);">' + fmt(o.bytes) + '</span></div>' +
                    bar(o.bytes / maxB * 100, (o.owner === '__system' ? 215 : (o.owner === '__other' ? 35 : 155 + i * 37) % 360)) +
                    '</div>';
                }).join('');
                byOwnerBox.innerHTML = '<div class="md3-card" style="padding:14px 18px 8px;margin-bottom:12px;"><div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin-bottom:4px;">\u6309\u5E94\u7528\u5F52\u5C5E</div>' + rows + '</div>';
                var top = s.ls.items.slice(0, 8).map(function(it) {
                  return '<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 2px;border-bottom:1px solid var(--md-outline-variant);font-size:12.5px;">' +
                    '<span style="color:var(--md-on-surface-variant,#9a9b9e);word-break:break-all;">' + esc(it.key) + '</span>' +
                    '<span style="color:var(--md-on-surface,#e2e2e9);flex-shrink:0;">' + fmt(it.bytes) + '</span></div>';
                }).join('');
                topBox.innerHTML = '<div class="md3-card" style="padding:14px 18px;margin-bottom:12px;"><div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin-bottom:2px;">\u5360\u7528\u6700\u5927\u7684 localStorage \u952E\uFF08\u524D 8\uFF09</div>' + (top || '<div style="padding:10px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">\u7A7A</div>') + '</div>';
              }).catch(function() {
                ov.innerHTML = '<div style="text-align:center;padding:30px 0;color:#ff8a8a;font-size:13px;">\u7EDF\u8BA1\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5</div>';
              });
            }
            document.getElementById('storageRefreshBtn').addEventListener('click', render);
            render();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 7) render();
            });
          })();
        <\/script>
      </div>`},{title:"\u5F00\u53D1\u8005\u9009\u9879",content:`<div style="padding:16px 0;">
        <div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:16px;">
          <div class="md3-list-item" style="cursor:default;">
            <div class="md3-list-item-icon">${i.settings}</div>
            <div style="display:flex;flex-direction:column;flex:1;">
              <span class="md3-list-item-text">\u7CFB\u7EDF\u7248\u672C</span>
              <span id="sysVerLine" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">\u8BFB\u53D6\u4E2D\u2026</span>
            </div>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" id="devCheckUpdateBtn">
            <div class="md3-list-item-icon">${i.system_update}</div>
            <span class="md3-list-item-text">\u68C0\u67E5\u66F4\u65B0</span>
          </div>
        </div>
        <div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:16px;">
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">\u6027\u80FD\u9762\u677F\uFF08FPS / \u5E27\u8017\u65F6 / \u5185\u5B58\uFF09</span>
            <label class="md3-switch"><input type="checkbox" id="devFpsToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">\u7981\u7528 CSS \u52A8\u753B\u4E0E\u8FC7\u6E21</span>
            <label class="md3-switch"><input type="checkbox" id="devNoAnimToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <!-- #322\uFF1A\u56FE\u6807\u6269\u6563/\u6536\u56DE\u6CE2\u6D6A\u573A\u5F00\u5173\uFF08md3 \u6269\u5C55\u2014\u2014#76 \u4FDD\u7559\u8D85\u8D8A\u9879\uFF0C\u65E0 AOSP \u5BF9\u5E94\uFF0C\u4E0D\u4F2A\u88C5\u539F\u751F\uFF09 -->
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">\u56FE\u6807\u6269\u6563/\u6536\u56DE\u6CE2\u6D6A\u573A<span style="display:block;font-size:11.5px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.6;">\u5F00\u7A97\u65F6\u5468\u56F4\u56FE\u6807\u9519\u5CF0\u6269\u6563\u3001\u5173\u7A97\u6536\u56DE \xB7 md3 \u6269\u5C55\u6548\u679C\uFF08\u65E0 AOSP \u5BF9\u5E94\u5B9E\u73B0\uFF09</span></span>
            <label class="md3-switch"><input type="checkbox" id="devIconWaveToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <!-- v7.18\uFF1A\u52A8\u753B\u500D\u7387\uFF08\u5F00\u53D1\u8005\uFF09\u2014\u2014 \u6162\u653E\u9010\u5E27\u68C0\u89C6 \u2194 \u6781\u901F\u9A8C\u6536\u624B\u611F -->
        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:2px;display:flex;justify-content:space-between;">
            <span>\u52A8\u753B\u500D\u7387</span>
            <span id="devAnimSpeedVal" style="color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">1\xD7</span>
          </div>
          <div style="font-size:11.5px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.6;margin-bottom:10px;">
            \u5E94\u7528\u5F00\u5408 / \u5207\u6362\u9000\u573A / \u5B50\u9875\u5BFC\u822A\u7684\u7269\u7406\u5F39\u7C27\u901F\u5EA6 \xB7 \u5373\u65F6\u751F\u6548\uFF08\u8FD0\u884C\u4E2D\u7684\u52A8\u753B\u70ED\u6362\u66F2\u7EBF\u4E0D\u8DF3\u53D8\uFF09
          </div>
          <div class="md3-slider is-discrete" id="devAnimSpeedSlider">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="devAnimSpeedFill"></div>
            <div class="m3-slider-ticks">
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot"></span>
              <span class="m3-slider-dot"></span>
              <span class="m3-slider-dot"></span>
            </div>
            <div class="md3-slider-thumb" id="devAnimSpeedThumb"></div>
          </div>
          <div id="devAnimSpeedChips" style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
            <span data-speed="0.25" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">0.25\xD7 \u6162\u653E\u68C0\u89C6</span>
            <span data-speed="0.5" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">0.5\xD7</span>
            <span data-speed="1" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">1\xD7 \u9ED8\u8BA4</span>
            <span data-speed="1.5" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">1.5\xD7</span>
            <span data-speed="2" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">2\xD7</span>
            <span data-speed="3" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">3\xD7 \u6781\u901F</span>
          </div>
        </div>
        <div class="md3-card" style="padding:4px 0;overflow:hidden;">
          <div class="md3-list-item" id="devResetLayoutBtn">
            <div class="md3-list-item-icon">${i.restart_alt}</div>
            <span class="md3-list-item-text">\u91CD\u7F6E\u684C\u9762\u5E03\u5C40\uFF08\u56FE\u6807\u6392\u5217\u4E0E\u5378\u8F7D\u8BB0\u5F55\uFF09</span>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" id="devWipeDataBtn" style="color:#ff8a8a;">
            <div class="md3-list-item-icon" style="color:#ff8a8a;">${i.delete_forever}</div>
            <span class="md3-list-item-text">\u6E05\u7A7A\u5168\u90E8\u6570\u636E\uFF08\u6062\u590D\u51FA\u5382\uFF09</span>
          </div>
        </div>
        <p style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;margin-top:14px;padding:0 4px;">
          \u300C\u7981\u7528\u52A8\u753B\u300D\u4EC5\u5173\u95ED CSS transition/animation\uFF1BSpring2D \u7269\u7406\u5F39\u7C27\u4E3A JS
          transform \u9A71\u52A8\uFF0C\u4E0D\u53D7\u5F71\u54CD\u3002\u300C\u52A8\u753B\u500D\u7387\u300D\u4EC5\u7F29\u653E\u5F39\u7C27\u65F6\u95F4\u8F74\uFF08\u66F2\u7EBF\u5F62\u72B6\u4E0D\u53D8\uFF09\uFF0C
          \u60F3\u5F7B\u5E95\u5173\u95ED\u52A8\u6548\u8BF7\u914D\u5408\u300C\u7981\u7528 CSS \u52A8\u753B\u300D\u4F7F\u7528\u3002\u300C\u6E05\u7A7A\u5168\u90E8\u6570\u636E\u300D\u4F1A\u540C\u65F6\u6E05\u9664
          localStorage\u3001IndexedDB\uFF08\u542B\u58C1\u7EB8/\u5B57\u4F53\u6587\u4EF6\uFF09\u3001Cache Storage \u5E76\u6CE8\u9500
          Service Worker\uFF0C\u5EFA\u8BAE\u5148\u5728\u300C\u5907\u4EFD\u4E0E\u6062\u590D\u300D\u4E2D\u5BFC\u51FA\u3002\u5F00\u5173\u72B6\u6001\u5237\u65B0\u540E\u4FDD\u6301\u3002
        </p>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var dev = window.__devOptions;
            // v7.6\uFF1A\u7CFB\u7EDF\u7248\u672C\u884C\uFF08\u8BFB ../sw.js \u7684 geek-vN \u4E0E\u6784\u5EFA ID\uFF0C\u4E0E SW \u5929\u7136\u540C\u6E90\u540C\u6B65\uFF09
            function fillSysVer() {
              var line = document.getElementById('sysVerLine');
              if (!line || line._filled) return;
              fetch('../sw.js', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
                if (!line) return;
                // fix(v7.45)\uFF1A\u65E7\u6B63\u5219 /geek-vd+[-a-zA-Z]*/ \u53D6\u300C\u5168\u6587\u9996\u4E2A geek-v \u5B57\u6837\u300D\uFF0C\u65E2\u4F1A\u628A
                // \u7B56\u7565\u540D\u4E00\u5E76\u541E\u8FDB\uFF08'geek-v53-cacheFirst'\uFF0Cissue #5 img3\uFF09\uFF0C\u4E5F\u4F1A\u88AB\u4EFB\u4F55\u6CE8\u91CA\u91CC\u7684
                // \u540C\u5F62\u5B57\u7B26\u4E32\u547D\u4E2D\u3002\u73B0\u951A\u5B9A VERSION \u5E38\u91CF\u8D4B\u503C\u884C\u63D0\u53D6\uFF0C\u5929\u7136\u514D\u75AB\u6CE8\u91CA\u4E0E\u7B56\u7565\u540D\u3002
                var v = (t.match(/const VERSION = '([^']+)'/) || [''])[1];
                var b = (t.match(/BUILD_ID = '([a-z0-9]+)'/) || [])[1];
                // #223\uFF1A\u6784\u5EFA\u6CE8\u5165\u540E VERSION \u4E3A\u771F\u6E90\u7248\u672C\uFF1B\u6E90\u6811\u672A\u6784\u5EFA\u6001\u63D0\u53D6\u5230\u7684\u662F
                // __SW_VERSION__ \u5360\u4F4D\u7B26\uFF0C\u6620\u5C04\u4E3A dev \u5C55\u793A\uFF0C\u4E0D\u900F\u4F20\u53CC\u4E0B\u5212\u7EBF\u5316\u77F3\u3002
                if (v && v.indexOf('__') === 0) v = 'dev';
                if (v) { line.textContent = 'Android16 Geek \xB7 ' + v + (b ? ' \xB7 build ' + b : ''); line._filled = true; }
                else line.textContent = '\u7248\u672C\u4FE1\u606F\u4E0D\u53EF\u7528';
              }).catch(function () { if (line) line.textContent = '\u7248\u672C\u4FE1\u606F\u4E0D\u53EF\u7528'; });
            }
            fillSysVer();
            // v7.6\uFF1A\u68C0\u67E5\u66F4\u65B0 \u2014\u2014 \u89E6\u53D1 SW \u5B57\u8282\u5BF9\u6BD4\uFF1B\u6709\u65B0\u7248\u672C\u65F6\u6839\u58F3\u5C42\u4F1A\u81EA\u52A8\u6D6E\u73B0\u300C\u8F7B\u70B9\u91CD\u542F\u300D\u80F6\u56CA
            function bindCheckUpdate() {
              var btn = document.getElementById('devCheckUpdateBtn');
              if (!btn || btn._bound) return;
              btn._bound = true;
              btn.addEventListener('click', function () {
                if (window.showSystemToast) window.showSystemToast('\u6B63\u5728\u68C0\u67E5\u66F4\u65B0\u2026');
                if (!('serviceWorker' in navigator)) {
                  if (window.showSystemToast) window.showSystemToast('\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301 Service Worker');
                  return;
                }
                navigator.serviceWorker.getRegistration().then(function (reg) {
                  if (!reg) {
                    if (window.showSystemToast) window.showSystemToast('Service Worker \u672A\u6CE8\u518C\uFF08\u5F00\u53D1\u73AF\u5883\uFF09');
                    return;
                  }
                  var found = false;
                  reg.addEventListener('updatefound', function () { found = true; }, { once: true });
                  Promise.resolve(reg.update()).catch(function () {}).then(function () {
                    setTimeout(function () {
                      if (!found && window.showSystemToast) window.showSystemToast('\u5DF2\u662F\u6700\u65B0\u7248\u672C');
                    }, 2500);
                  });
                }).catch(function () {
                  if (window.showSystemToast) window.showSystemToast('\u68C0\u67E5\u66F4\u65B0\u5931\u8D25');
                });
              });
            }
            bindCheckUpdate();
            function initOnce() {
              dev = window.__devOptions;
              if (!dev) return;
              var fps = document.getElementById('devFpsToggle');
              var na = document.getElementById('devNoAnimToggle');
              if (fps && !fps._bound) {
                fps._bound = true;
                (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(fps, dev.isFpsEnabled()); // #70
                fps.addEventListener('change', function() {
                  dev.setFpsEnabled(fps.checked);
                  if (window.showSystemToast) window.showSystemToast(fps.checked ? 'FPS \u60AC\u6D6E\u5C42\u5DF2\u5F00\u542F' : 'FPS \u60AC\u6D6E\u5C42\u5DF2\u5173\u95ED');
                });
              }
              if (na && !na._bound) {
                na._bound = true;
                (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(na, dev.isNoAnimEnabled()); // #70
                na.addEventListener('change', function() {
                  dev.setNoAnimEnabled(na.checked);
                  if (window.showSystemToast) window.showSystemToast(na.checked ? 'CSS \u52A8\u753B\u5DF2\u7981\u7528' : 'CSS \u52A8\u753B\u5DF2\u6062\u590D');
                });
              }
              // #322\uFF1A\u56FE\u6807\u6269\u6563/\u6536\u56DE\u6CE2\u6D6A\u573A\u5F00\u5173\uFF08\u9ED8\u8BA4\u5F00\uFF1B\u5173\u95ED\u6001\u5F00\u7A97\u96F6\u6CE2\u6D6A\u573A\uFF0C\u5176\u4F59\u52A8\u753B\u96F6\u53D8\u5316\uFF09
              var iw = document.getElementById('devIconWaveToggle');
              if (iw && !iw._bound && dev.setIconWaveEnabled) {
                iw._bound = true;
                (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(iw, dev.isIconWaveEnabled()); // #70
                iw.addEventListener('change', function() {
                  dev.setIconWaveEnabled(iw.checked);
                  if (window.showSystemToast) window.showSystemToast(iw.checked ? '\u56FE\u6807\u6CE2\u6D6A\u573A\u5DF2\u5F00\u542F' : '\u56FE\u6807\u6CE2\u6D6A\u573A\u5DF2\u5173\u95ED\uFF08\u5F00\u7A97\u4E0D\u518D\u6269\u6563\uFF09');
                });
              }
              // v7.18\uFF1A\u52A8\u753B\u500D\u7387\u6ED1\u6746 + \u5FEB\u6377\u6863\u4F4D\uFF08\u5B9E\u73B0\u4E8E animation-presets.js\uFF0C\u7ECF
              // __devOptions \u6865\u63A5\uFF1B\u5BF9\u6570\u523B\u5EA6 0.25x~3x\uFF0C1x \u6070\u843D\u5728\u6ED1\u6746\u4E2D\u6BB5\uFF09
              var spS = document.getElementById('devAnimSpeedSlider');
              var spF = document.getElementById('devAnimSpeedFill');
              var spT = document.getElementById('devAnimSpeedThumb');
              var spV = document.getElementById('devAnimSpeedVal');
              var chipWrap = document.getElementById('devAnimSpeedChips');
              if (spS && !spS._bound && dev.getAnimSpeed) {
                spS._bound = true;
                var SP_MIN = 0.25, SP_MAX = 3, SP_BASE = 12;
                var toT = function(v) { return Math.log(v / SP_MIN) / Math.log(SP_BASE); };
                var toV = function(t) { return SP_MIN * Math.pow(SP_BASE, t); };
                var fmt = function(v) { return (Math.round(v * 100) / 100) + '\\u00d7'; };
                var down = false;
                var curT = 0;
                var paint = function(v) {
                  var t = toT(Math.min(SP_MAX, Math.max(SP_MIN, v)));
                  curT = t;
                  if (window.__md3SliderSet) window.__md3SliderSet(spS, spF, spT, t, down);
                  spV.textContent = fmt(v) + (Math.abs(v - 1) < 0.005 ? ' \\u00b7 \u9ED8\u8BA4' : '');
                  if (chipWrap) {
                    var chips = chipWrap.querySelectorAll('[data-speed]');
                    for (var i = 0; i < chips.length; i++) {
                      var on = Math.abs(parseFloat(chips[i].getAttribute('data-speed')) - v) < 0.005;
                      chips[i].style.background = on ? 'var(--md-primary)' : 'transparent';
                      chips[i].style.color = on ? 'var(--md-on-primary, #fff)' : 'var(--md-on-surface)';
                      chips[i].style.borderColor = on ? 'var(--md-primary)' : 'var(--md-outline-variant)';
                    }
                  }
                };
                paint(dev.getAnimSpeed());
                var apply = function(v, quiet) {
                  var nv = dev.setAnimSpeed(v);
                  paint(nv);
                  if (!quiet && window.showSystemToast) window.showSystemToast('\u52A8\u753B\u500D\u7387\uFF1A' + fmt(nv));
                };
                var paintT = function(t, pressed) {
                  curT = t;
                  if (window.__md3SliderSet) window.__md3SliderSet(spS, spF, spT, t, pressed);
                };
                // v7.34 rAF \u5408\u5E27\uFF1A\u62D6\u62FD\u671F apply\uFF08\u542B localStorage \u5199 + \u5F39\u7C27\u70ED\u66F4\u65B0\uFF09
                // \u968F\u4E8B\u4EF6\u7387\u76F4\u8C03 \u2192 \u6BCF\u5E27\u81F3\u591A\u4E00\u6B21\uFF1B\u672B\u4E8B\u4EF6\u539F\u5219\u4FDD\u8BC1\u843D\u70B9\u4E0D\u4E22
                // v7.38\uFF1Atransform \u9A71\u52A8\uFF1Bv7.39 \u6865\u5185\u7EDF\u4E00\u53CC\u6BB5\u95F4\u9699\u51E0\u4F55 + \u523B\u5EA6\u70B9\u8DDF\u968F
                var spRaf = 0, spLastE = null;
                var spPaint = function() {
                  spRaf = 0;
                  var e = spLastE; spLastE = null;
                  if (!e) return;
                  var r = spS.getBoundingClientRect();
                  var t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                  paintT(t, down);
                  apply(toV(t), true);
                };
                var update = function(e) {
                  spLastE = e;
                  if (!spRaf) spRaf = requestAnimationFrame(spPaint);
                };
                spS.onpointerdown = function(e) { down = true; spS.classList.add('is-dragging'); try { spS.setPointerCapture(e.pointerId); } catch (err) {} update(e); };
                spS.onpointermove = function(e) { if (down) update(e); };
                spS.onpointerup = spS.onpointercancel = function(e) {
                  if (down) {
                    down = false;
                    spS.classList.remove('is-dragging');
                    paintT(curT, false); // v7.39 \u843D\u5B9A\u91CD\u7ED8 + \u6062\u590D CSS \u8FC7\u6E21\uFF08\u7EC8\u503C\u5E73\u6ED1\u5438\u9644\uFF09
                  }
                  try { spS.releasePointerCapture(e.pointerId); } catch (err) {}
                  if (window.showSystemToast) window.showSystemToast('\u52A8\u753B\u500D\u7387\uFF1A' + fmt(dev.getAnimSpeed()));
                };
                if (window.__md3SliderWatch) window.__md3SliderWatch(spS, function() { paint(dev.getAnimSpeed()); });
                if (chipWrap) {
                  var chips2 = chipWrap.querySelectorAll('[data-speed]');
                  for (var ci = 0; ci < chips2.length; ci++) {
                    (function (chip) {
                      chip.addEventListener('click', function () {
                        apply(parseFloat(chip.getAttribute('data-speed')), false);
                      });
                    })(chips2[ci]);
                  }
                }
              }
              var reset = document.getElementById('devResetLayoutBtn');
              if (reset && !reset._bound) {
                reset._bound = true;
                reset.addEventListener('click', function() {
                  if (confirm('\u786E\u5B9A\u91CD\u7F6E\u684C\u9762\u5E03\u5C40\uFF1F\\n\u56FE\u6807\u6392\u5217\u4E0E\u5DF2\u5378\u8F7D\u8BB0\u5F55\u5C06\u6062\u590D\u9ED8\u8BA4\uFF0C\u5E94\u7528\u6570\u636E\u4E0D\u53D7\u5F71\u54CD\u3002')) dev.resetDesktopLayout();
                });
              }
              var wipe = document.getElementById('devWipeDataBtn');
              if (wipe && !wipe._bound) {
                wipe._bound = true;
                wipe.addEventListener('click', function() {
                  if (confirm('\u786E\u5B9A\u6E05\u7A7A\u5168\u90E8\u6570\u636E\uFF1F\\nlocalStorage\u3001IndexedDB\u3001\u7F13\u5B58\u4E0E Service Worker \u5C06\u5168\u90E8\u6E05\u9664\u3002')) {
                    if (confirm('\u6700\u540E\u786E\u8BA4\uFF1A\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\uFF08\u7B49\u4E8E\u6062\u590D\u51FA\u5382\uFF09\uFF01\\n\u5EFA\u8BAE\u5148\u5230\u300C\u5907\u4EFD\u4E0E\u6062\u590D\u300D\u5BFC\u51FA\u6570\u636E\u3002')) dev.wipeAllData();
                  }
                });
              }
            }
            initOnce();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 8) initOnce();
            });
          })();
        <\/script>
      </div>`},{title:"\u591A\u6A21\u5F0F",content:`<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;line-height:1.7;">\u4E3A\u300C\u4E2A\u4EBA\u300D\u4E0E\u300C\u5DE5\u4F5C\u300D\u5206\u522B\u8BB0\u5FC6\u4E00\u5957\u5B8C\u6574\u573A\u666F\uFF1A\u4E3B\u9898\u8272\u76F8\u3001\u5916\u89C2\u6A21\u5F0F\u3001\u58C1\u7EB8\u3001\u684C\u9762\u56FE\u6807\u6392\u5217\u4E0E\u52FF\u6270\u5F00\u5173\u3002\u5207\u6362\u65F6\u5168\u7A0B\u4F34\u968F\u8FDE\u8D2F\u52A8\u753B\u2014\u2014\u58C1\u7EB8\u4EA4\u53C9\u6DE1\u5165\u3001\u4E3B\u9898\u8272\u6E10\u53D8\u3001\u56FE\u6807\u9010\u683C\u5F39\u7C27\u91CD\u6392\uFF1B\u5FEB\u6377\u8BBE\u7F6E\u4E2D\u7684\u300CModes\u300D\u78C1\u8D34\u540C\u6837\u53EF\u4EE5\u4E00\u952E\u5207\u6362\u3002</div>
        <div id="profileCardsBox"></div>
        <p style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;margin-top:14px;padding:0 4px;">
          \u79BB\u5F00\u5F53\u524D\u6A21\u5F0F\u65F6\u4F1A\u81EA\u52A8\u4FDD\u5B58\u6700\u65B0\u5E03\u5C40\u3001\u5916\u89C2\u4E0E\u52FF\u6270\u72B6\u6001\uFF0C\u4E0B\u6B21\u5207\u56DE\u539F\u6837\u6062\u590D\uFF1B\u81EA\u5B9A\u4E49\u4E0A\u4F20\u7684\u58C1\u7EB8\uFF08\u6587\u4EF6\u7C7B\uFF09\u4E0D\u9010\u6A21\u5F0F\u590D\u5236\u5B58\u50A8\uFF0C\u5207\u6362\u65F6\u4FDD\u6301\u5F53\u524D\u58C1\u7EB8\u4E0D\u53D8\u3002\u914D\u5957\u7684\u300CFocus\u300D\u756A\u8304\u949F\u78C1\u8D34\u53EF\u5728\u4E13\u6CE8\u671F\u81EA\u52A8\u5F00\u542F\u52FF\u6270\u3001\u4F11\u606F\u671F\u81EA\u52A8\u6062\u590D\u3002
        </p>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var box = document.getElementById('profileCardsBox');
            if (!box) return;
            function render() {
              var P = window.__profiles;
              if (!box || !P) return;
              var list = P.list();
              box.innerHTML = '';
              list.forEach(function(p) {
                var card = document.createElement('div');
                card.className = 'md3-card';
                card.style.cssText = 'display:flex;align-items:center;gap:14px;padding:16px 18px;margin-bottom:12px;cursor:pointer;' + (p.active ? 'border:1.5px solid hsl(' + (p.hue || 215) + ' 70% 55%);' : '');
                card.innerHTML =
                  '<div style="width:44px;height:44px;border-radius:14px;flex-shrink:0;background:linear-gradient(135deg,hsl(' + (p.hue || 215) + ' 75% 40%),hsl(' + (p.hue || 215) + ' 85% 62%));display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:600;">' + (p.name || '?').charAt(0) + '</div>' +
                  '<div style="flex:1;"><div style="font-size:15px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">' + p.name + '\u6A21\u5F0F</div>' +
                  '<div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">\u4E3B\u9898\u8272\u76F8 ' + (p.hue || 215) + '\xB0</div></div>' +
                  (p.active
                    ? '<span style="font-size:12px;font-weight:600;color:hsl(' + (p.hue || 215) + ' 80% 65%);">\u5F53\u524D\u4F7F\u7528</span>'
                    : '<span style="font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);">\u70B9\u6309\u5207\u6362</span>');
                card.addEventListener('click', function() {
                  if (p.active || P.isSwitching && P.isSwitching()) return;
                  P.switchTo(p.id);
                  setTimeout(render, 700);
                });
                box.appendChild(card);
              });
            }
            render();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 9) render();
            });
          })();
        <\/script>
      </div>`},{title:"\u52A8\u753B\u4E0E\u52A8\u6548",content:`<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">\u5E94\u7528\u5F00 / \u5173\u52A8\u753B\u66F2\u7EBF</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            \u9009\u62E9\u5E94\u7528\u4ECE\u56FE\u6807\u5C55\u5F00 / \u6536\u56DE\u65F6\u7684\u5F39\u7C27\u624B\u611F\uFF08iOS 26 \u6DB2\u6001\u73BB\u7483 \xB7 macOS \u5438\u5165\u878D\u5408\u98CE\u683C\uFF09\u3002
            \u5207\u6362\u5373\u65F6\u751F\u6548\uFF1A\u6B63\u5728\u64AD\u653E\u7684\u52A8\u753B\u4F1A\u65E0\u7F1D\u6362\u66F2\u7EBF\uFF0C\u4E0D\u4F1A\u8DF3\u53D8\uFF1B\u9009\u62E9\u4F1A\u88AB\u8BB0\u4F4F\u3002
          </div>
        </div>

        <div id="animPresetList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <!-- \u9501\u5C4F\u89E3\u9501\u5165\u573A\u52A8\u6548\u98CE\u683C\uFF08v7.13 \u9AD8\u4FDD\u771F\u590D\u523B\u53CC\u98CE\u683C + \u5361\u5185\u5FAE\u7F29\u9884\u6F14\uFF09 -->
        <div class="md3-card md3-card-elevated" style="margin:20px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">\u9501\u5C4F\u89E3\u9501\u684C\u9762\u5165\u573A\u52A8\u6548</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            \u590D\u523B\u4E24\u5927\u539F\u751F\u89E3\u9501\u52A8\u6548\uFF1AiOS \u56FE\u6807\u81EA\u5C4F\u5E55\u5E95\u7F18\u4E00\u6574\u6392\u4E00\u6574\u6392\u9519\u5CF0\u98DE\u5165\uFF1B
            Android \u4EE5\u5C4F\u5E55\u4E2D\u5FC3\u4E3A\u6CE2\u6E90\u7684\u6D9F\u6F2A\u5F0F\u5411\u5916\u6269\u6563\u6DE1\u5165\u3002\u5207\u6362\u5373\u65F6\u751F\u6548\u5E76\u6301\u4E45\u4FDD\u5B58\uFF0C
            \u70B9\u6309\u5361\u7247\u53EF\u67E5\u770B\u5FAE\u7F29\u9884\u6F14\uFF0C\u9009\u597D\u540E\u70B9\u4E0B\u65B9\u6309\u94AE\u4E0A\u6ED1\u89E3\u9501\u5373\u53EF\u770B\u5230\u5B8C\u6574\u6548\u679C\u3002
          </div>
        </div>

        <div id="unlockAnimList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <button id="unlockTryBtn" type="button" style="width:100%;margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 16px;border:none;border-radius:16px;cursor:pointer;font-size:14px;font-weight:600;color:#fff;background:hsl(var(--md-h,215) 72% 45%);box-shadow:0 2px 12px hsl(var(--md-h,215) 72% 40% / .35);">
          <svg viewBox="0 0 24 24" style="width:19px;height:19px;fill:currentColor;flex:none;" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
          \u7ACB\u5373\u9501\u5C4F\u4F53\u9A8C\u5F53\u524D\u6548\u679C
        </button>

        <div class="md3-card" style="margin-top:16px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--md-primary,hsl(var(--md-h,215) 80% 55%));flex:none;" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
            \u5206\u5C4F\u7A97\u683C\u5C55\u5F00 / \u6536\u56DE\u540C\u6837\u8DDF\u968F\u5F53\u524D\u66F2\u7EBF\uFF1B3D \u503E\u659C\u4E0E\u73BB\u7483\u8FB9\u7F18\u9AD8\u5149\u4FDD\u6301\u7CFB\u7EDF\u7EA7\u7EDF\u4E00\u3002
          </div>
        </div>

        <script>
          // \u52A8\u753B\u4E0E\u52A8\u6548\u9875\uFF1A\u9884\u8BBE\u5361\u7247\u6E32\u67D3 + \u9009\u62E9\u70ED\u5207\u6362\uFF08window.__animPresets \u7531 app-window.js \u6865\u63A5\uFF09
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var listEl = null;
            var unlockListEl = null;

            var UNLOCK_STYLES = [
              {
                id: 'ios',
                name: 'iOS \u6574\u6392\u98DE\u5165',
                desc: '\u590D\u523B SpringBoard IconFlyIn\uFF1A\u56FE\u6807\u81EA\u5C4F\u5E55\u5E95\u7F18\u8D77\u98DE\uFF0C\u5E95\u6392\u5148\u884C\u3001\u9010\u6392\u5411\u4E0A\u7EED\u63A5\uFF0C\u53D7\u63A7\u8FC7\u51B2\u540E\u81EA\u7136\u843D\u4F4D'
              },
              {
                id: 'android',
                name: 'Android \u6D9F\u6F2A\u6269\u6563',
                desc: '\u590D\u523B Material You \u89E3\u9501\u6D9F\u6F2A\uFF1A\u4EE5\u5C4F\u5E55\u4E2D\u5FC3\u4E3A\u6CE2\u6E90\uFF0C\u5149\u73AF\u5411\u5916\u6269\u6563\uFF0C\u56FE\u6807\u968F\u6CE2\u524D\u7531\u5185\u5411\u5916\u5F39\u6027\u6D6E\u73B0'
              }
            ];

            function render() {
              listEl = document.getElementById('animPresetList');
              if (listEl && window.__animPresets) {
                var cur = window.__animPresets.currentId();
                listEl.innerHTML = window.__animPresets.list.map(function(p) {
                  var active = p.id === cur;
                  return '<div class="anim-preset-card" data-preset-id="' + p.id + '" role="button" tabindex="0" aria-label="\u52A8\u753B\u66F2\u7EBF ' + p.name + '"' +
                    ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                    'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                    'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                    '<div style="width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;font-size:22px;' +
                    'background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / .22)' : 'var(--md-surface-container-high,#2f3136)') + ';">' + p.emoji + '</div>' +
                    '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;">' + p.name +
                    (active ? '<span style="font-size:11px;font-weight:600;color:hsl(var(--md-h,215) 85% 65%);background:hsl(var(--md-h,215) 80% 55% / .16);padding:2px 8px;border-radius:999px;">\u5F53\u524D</span>' : '') +
                    '</div>' +
                    '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + p.desc + '</div>' +
                    '</div>' +
                    (active ? '<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:hsl(var(--md-h,215) 85% 60%);flex:none;" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' : '') +
                    '</div>';
                }).join('');
              }

              unlockListEl = document.getElementById('unlockAnimList');
              if (unlockListEl) {
                var curUnlock = (window.__getUnlockAnimStyle ? window.__getUnlockAnimStyle() : localStorage.getItem('ios-desktop:unlock-anim-style')) || 'ios';
                var prevDots = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
                unlockListEl.innerHTML = UNLOCK_STYLES.map(function(s) {
                  var active = s.id === curUnlock;
                  return '<div class="unlock-style-card" data-style-id="' + s.id + '" role="button" tabindex="0" aria-label="\u89E3\u9501\u52A8\u6548 ' + s.name + '"' +
                    ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                    'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                    'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                    '<div class="unlock-prev" aria-hidden="true">' + prevDots + '</div>' +
                    '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;">' + s.name +
                    (active ? '<span style="font-size:11px;font-weight:600;color:hsl(var(--md-h,215) 85% 65%);background:hsl(var(--md-h,215) 80% 55% / .16);padding:2px 8px;border-radius:999px;">\u5F53\u524D</span>' : '') +
                    '</div>' +
                    '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + s.desc + '</div>' +
                    '</div>' +
                    (active ? '<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:hsl(var(--md-h,215) 85% 60%);flex:none;" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' : '') +
                    '</div>';
                }).join('');
                // v7.13\uFF1A\u5F53\u524D\u9009\u4E2D\u5361\u81EA\u52A8\u64AD\u4E00\u6B21\u5FAE\u7F29\u9884\u6F14\uFF0C\u76F4\u89C2\u5C55\u793A\u5F53\u524D\u52A8\u6548\u6A21\u5F0F
                replayUnlockPreview(curUnlock);
              }
            }

            /** v7.13\uFF1A\u91CD\u64AD\u6307\u5B9A\u98CE\u683C\u5361\u7247\u7684\u5FAE\u7F29\u9884\u6F14\uFF08\u7C7B\u540D\u590D\u4F4D + \u5F3A\u5236 reflow + \u91CD\u65B0\u6302\u7C7B\uFF09 */
            function replayUnlockPreview(styleId) {
              if (!unlockListEl) return;
              var prev = unlockListEl.querySelector('.unlock-style-card[data-style-id="' + styleId + '"] .unlock-prev');
              if (!prev) return;
              prev.classList.remove('play-ios', 'play-android');
              void prev.offsetWidth;
              prev.classList.add(styleId === 'android' ? 'play-android' : 'play-ios');
            }

            function pick(id) {
              if (window.__animPresets && typeof window.__animPresets.apply === 'function') {
                window.__animPresets.apply(id);
                if (window.showSystemToast) window.showSystemToast('\u52A8\u753B\u66F2\u7EBF\u5DF2\u5207\u6362\uFF1A' + window.__animPresets.currentName());
                render();
              }
            }

            function pickUnlock(styleId) {
              if (window.__setUnlockAnimStyle) {
                window.__setUnlockAnimStyle(styleId);
              } else {
                try { localStorage.setItem('ios-desktop:unlock-anim-style', styleId); } catch (e) {}
              }
              var styleName = styleId === 'android' ? 'Android \u6D9F\u6F2A\u6269\u6563' : 'iOS \u6574\u6392\u98DE\u5165';
              if (window.showSystemToast) window.showSystemToast('\u89E3\u9501\u52A8\u6548\u5DF2\u5207\u6362\uFF1A' + styleName);
              render(); // render \u5185\u4F1A\u91CD\u64AD\u65B0\u9009\u4E2D\u5361\u7684\u5FAE\u7F29\u9884\u6F14
            }

            bindDoc('settings', 'click', function(e) {
              var card = e.target && e.target.closest && e.target.closest('.anim-preset-card');
              if (card && card.isConnected) pick(card.dataset.presetId);
              var uCard = e.target && e.target.closest && e.target.closest('.unlock-style-card');
              if (uCard && uCard.isConnected) pickUnlock(uCard.dataset.styleId);
              // v7.13\uFF1A\u7ACB\u5373\u9501\u5C4F\u4F53\u9A8C \u2014\u2014 \u56DE\u684C\u9762\uFF08\u82E5\u5728\u524D\u53F0\u5E94\u7528\uFF09\u540E\u81EA\u52A8\u4E0A\u9501
              var tryBtn = e.target && e.target.closest ? e.target.closest('#unlockTryBtn') : null;
              if (tryBtn && tryBtn.isConnected && window.__tryUnlockAnim) window.__tryUnlockAnim();
            });

            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && e.target.closest('.anim-preset-card');
              if (card && card.isConnected) { e.preventDefault(); pick(card.dataset.presetId); }
              var uCard = e.target && e.target.closest && e.target.closest('.unlock-style-card');
              if (uCard && uCard.isConnected) { e.preventDefault(); pickUnlock(uCard.dataset.styleId); }
            });

            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 10) render();
            });
            render();
          })();
        <\/script>
      </div>`},{title:"\u540E\u53F0\u4E0E\u591A\u4EFB\u52A1",content:`<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">\u540E\u53F0\u8FD0\u884C\u7B56\u7565</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            \u51B3\u5B9A\u591A\u4EFB\u52A1\u540E\u53F0\u91CC\u5404\u5E94\u7528\u5B9E\u4F8B\u7684\u8FD0\u884C\u65B9\u5F0F\u3002\u5207\u6362\u5373\u65F6\u751F\u6548\uFF1B\u6B63\u5728\u64AD\u653E\u5A92\u4F53\uFF08\u97F3\u9891 / \u89C6\u9891 / \u5F55\u97F3\uFF09
            \u7684\u4EFB\u52A1\u5728\u4EFB\u4F55\u6A21\u5F0F\u4E0B\u90FD\u4E0D\u4F1A\u88AB\u51BB\u7ED3\u3002
          </div>
        </div>

        <div id="bgModeList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <div class="md3-card" style="margin-top:16px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--md-primary,hsl(var(--md-h,215) 80% 55%));flex:none;" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
            \u667A\u80FD\u51BB\u7ED3\u6A21\u5F0F\u4E0B\uFF0C\u4ECE\u672A\u6253\u5F00\u8FC7\u7684\u540E\u53F0\u5361\u7247\u5C06\u4FDD\u6301\u4F11\u7720\u5360\u4F4D\uFF0C\u4E0D\u518D\u5F15\u5BFC\u542F\u52A8\uFF1B
            \u5DE6\u53F3\u6ED1\u52A8\u540E\u53F0\u65F6\u7684\u91CD\u7ED8\u91CF\u4E5F\u4F1A\u663E\u8457\u4E0B\u964D\u3002
          </div>
        </div>

        <script>
          // \u540E\u53F0\u4E0E\u591A\u4EFB\u52A1\u9875\uFF1A\u8FD0\u884C\u7B56\u7565\u5361\u7247\u6E32\u67D3 + \u70ED\u5207\u6362\uFF08window.__bgFreeze \u7531 bg-freeze.js \u6865\u63A5\uFF09
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var MODES = [
              { id: 'freeze', name: '\u667A\u80FD\u51BB\u7ED3', emoji: '\u{1F9CA}', badge: '\u9ED8\u8BA4 \xB7 \u63A8\u8350',
                desc: '\u4EC5\u524D\u53F0\u5E94\u7528\u3001\u521A\u88AB\u63A8\u5230\u540E\u53F0\u7684\u5E94\u7528\u4E0E\u5206\u5C4F\u5BF9\u4FDD\u6301\u5B9E\u65F6\u8FD0\u884C\uFF0C\u5176\u4F59\u540E\u53F0\u4EFB\u52A1\u6574\u4F53\u51BB\u7ED3 \u2014\u2014 \u5FC3\u8DF3\u5B9A\u65F6\u5668\u3001CSS \u52A8\u753B\u3001rAF \u5168\u90E8\u6682\u505C\uFF0C\u76F4\u5230\u518D\u6B21\u56DE\u5230\u524D\u53F0\u3002' },
              { id: 'live', name: '\u5168\u90E8\u5B9E\u65F6', emoji: '\u{1F534}', badge: '\u7ECF\u5178\u65B9\u6848',
                desc: '\u6240\u6709\u540E\u53F0\u5B9E\u4F8B\u7167\u5E38\u8FD0\u884C\u3001\u9884\u89C8\u5B9E\u65F6\u5237\u65B0\uFF1B\u5F00\u9500\u66F4\u9AD8\uFF0C\u957F\u65F6\u95F4\u4F7F\u7528\u5EFA\u8BAE\u914D\u5408\u5145\u7535\u4F7F\u7528\u3002' },
            ];
            function render() {
              var listEl = document.getElementById('bgModeList');
              if (!listEl || !window.__bgFreeze) return;
              var cur = window.__bgFreeze.mode();
              listEl.innerHTML = MODES.map(function(m) {
                var active = m.id === cur;
                return '<div class="bg-mode-card" data-mode-id="' + m.id + '" role="button" tabindex="0" aria-label="\u540E\u53F0\u7B56\u7565 ' + m.name + '"' +
                  ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                  'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                  'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                  '<div style="width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;font-size:22px;' +
                  'background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / .22)' : 'var(--md-surface-container-high,#2f3136)') + ';">' + m.emoji + '</div>' +
                  '<div style="flex:1;min-width:0;">' +
                  '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' + m.name +
                  '<span style="font-size:10px;font-weight:600;color:' + (active ? 'hsl(var(--md-h,215) 85% 65%)' : 'var(--md-on-surface-variant,#9a9b9e)') + ';background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:999px;">' + m.badge + '</span>' +
                  (active ? '<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:hsl(var(--md-h,215) 85% 60%);flex:none;" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' : '') +
                  '</div>' +
                  '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + m.desc + '</div>' +
                  '</div>' +
                  '</div>';
              }).join('');
            }
            function pick(id) {
              if (window.__bgFreeze && typeof window.__bgFreeze.setMode === 'function') {
                window.__bgFreeze.setMode(id);
                if (window.showSystemToast) window.showSystemToast('\u540E\u53F0\u7B56\u7565\u5DF2\u5207\u6362\uFF1A' + window.__bgFreeze.modeName());
                render();
              }
            }
            bindDoc('settings', 'click', function(e) {
              var card = e.target && e.target.closest && e.target.closest('.bg-mode-card');
              if (card && card.isConnected) pick(card.dataset.modeId);
            });
            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && e.target.closest('.bg-mode-card');
              if (card && card.isConnected) { e.preventDefault(); pick(card.dataset.modeId); }
            });
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 11) render();
            });
            render();
          })();
        <\/script>
      </div>`},{title:"\u7CFB\u7EDF\u5BFC\u822A",content:`<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">\u5BFC\u822A\u65B9\u5F0F</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            \u624B\u52BF\u5BFC\u822A\u4E3A\u9ED8\u8BA4\u65B9\u6848\uFF1B\u5F00\u542F\u4E09\u952E\u5BFC\u822A\u540E\u5168\u65B0\u77E2\u91CF\u4E09\u952E\uFF08\u52FE\u89D2\u8FD4\u56DE \xB7 \u60AC\u6311\u5C4B\u9876\u4E3B\u5C4F \xB7 \u4E09\u6A2A\u7EBF\u591A\u4EFB\u52A1\uFF09\u60AC\u6D6E\u4E8E\u5C4F\u5E55\u5E95\u90E8\uFF0C
            \u4E14\u624B\u52BF\u5BFC\u822A\u4ECD\u7136\u4FDD\u6301\u8FD0\u4F5C \u2014\u2014 \u4E24\u5957\u65B9\u6848\u878D\u5408\u5171\u5B58\uFF0C\u4E92\u4E0D\u5E72\u6270\u3002
          </div>
        </div>

        <div id="navModeList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <div id="navPosSection" style="display:none;margin-top:16px;">
          <div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 12px 8px;letter-spacing:0.3px;">\u4E09\u952E\u680F\u4F4D\u7F6E</div>
          <div id="navPosList" style="display:flex;gap:10px;"></div>
          <div id="navVkeysSection" style="display:none;margin-top:16px;">
            <div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 12px 8px;letter-spacing:0.3px;">\u5BFC\u822A\u680F\u9644\u52A0\u952E</div>
            <div id="navVkeysList" style="display:flex;gap:10px;flex-wrap:wrap;"></div>
            <div class="md3-card" style="margin-top:12px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
              <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--md-primary,hsl(var(--md-h,215) 80% 55%));flex:none;" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
                \u97F3\u91CF\u52A0 / \u51CF\u952E\u6210\u7EC4\u7F6E\u4E8E\u4E09\u952E\u680F\u5C3E\u90E8\uFF08\u8D85\u8D8A\u9879\uFF1A\u771F\u673A\u97F3\u91CF\u6765\u81EA\u7269\u7406\u952E\uFF0C\u89E6\u5C4F\u8BBE\u5907\u4EE5\u6B64\u8865\u9F50\u901A\u9053\uFF1B#107\uFF09\u3002
                \u9ED8\u8BA4\u4EC5\u79FB\u52A8\u7AEF\u663E\u793A\uFF1B\u5173\u95ED\u4E09\u952E\u5BFC\u822A\u65F6\u968F\u680F\u9690\u85CF\u3002
              </div>
            </div>
          </div>
          <div class="md3-card" style="margin-top:12px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
            <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--md-primary,hsl(var(--md-h,215) 80% 55%));flex:none;" aria-hidden="true"><path d="M4.59 6.89c.7-.71 1.4-1.35 1.71-1.22.5.2 0 1.03-.3 1.52-.25.42-2.86 3.89-2.86 6.31 0 2.22 1.65 2.94 2.99 2.94 1.35 0 2.36-.72 3.69-2.09 0 0 1.94-2.07 2.33-2.51.41.34 1.11.89 1.11.89 1.14.99 2.02 1.51 3.01 1.51 2.17 0 3.72-1.89 3.72-3.99 0-2.1-1.24-3.25-3.35-3.25-1.04 0-2.06.42-2.85.98l.51-3.9c.16-1.28-.45-2.32-1.6-2.32-.86 0-1.51.61-1.95 1.63L9.67 6.2c0-.01.55-1.24.55-1.24-.14-.53-.5-1.05-1.14-1.05-.52 0-.98.35-1.35.79-.36.44-1.42 1.7-2.14 2.19z"/></svg>
            <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
              \u4E5F\u53EF\u4EE5\u5728\u684C\u9762\u4E0A\u76F4\u63A5\u8C03\u6574\uFF1A<b>\u6309\u4F4F\u4E3B\u5C4F\u952E 1 \u79D2</b>\u540E\u5DE6\u53F3\u62D6\u52A8\uFF0C\u677E\u624B\u81EA\u52A8\u5438\u9644\u5230\u5DE6 / \u4E2D / \u53F3\u3002
              \u4ECE\u4E09\u952E\u680F\u4E0A\u6ED1\u4ECD\u4F1A\u76F4\u901A\u7CFB\u7EDF\u624B\u52BF\u5F15\u64CE\uFF08\u8DDF\u624B\u7F29\u5C0F\u3001\u505C\u987F\u5524\u51FA\u591A\u4EFB\u52A1\u3001\u5FEB\u901F\u7529\u52A8\u5173\u95ED\uFF09\u3002
            </div>
          </div>
        </div>

        <div id="navVolSideSection" style="margin-top:16px;">
          <div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 12px 8px;letter-spacing:0.3px;">\u97F3\u91CF\u9762\u677F\u4FA7</div>
          <div id="navVolSideList" style="display:flex;gap:10px;"></div>
          <div class="md3-card" style="margin-top:12px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
            <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--md-primary,hsl(var(--md-h,215) 80% 55%));flex:none;" aria-hidden="true"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
            <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
              \u97F3\u91CF\u9762\u677F\u8DDF\u968F\u97F3\u91CF\u952E\u6240\u5728\u4FA7\u5F39\u51FA\uFF08AOSP R.integer.volume_dialog_gravity \u9ED8\u8BA4 21 = \u53F3|\u5782\u76F4\u5C45\u4E2D\uFF0C
              \u771F\u673A\u7531\u5382\u5546 overlay \u51B3\u5B9A\uFF1B\u7F51\u9875\u65E0 overlay \u901A\u9053\uFF0C\u4EE5\u7528\u6237\u504F\u597D\u627F\u63A5\uFF09\u3002\u6298\u53E0\u534A\u5F00\u8BBE\u5907\u7AD6\u5C4F\u65F6\u81EA\u52A8\u9760\u4E0A\u907F\u5F00\u94F0\u94FE
              \uFF08VolumeDialogImpl.adjustPositionOnScreen\uFF0CDevice Posture API \u7279\u6027\u68C0\u6D4B\uFF0C\u4E0D\u652F\u6301\u7684\u73AF\u5883\u4FDD\u6301\u9ED8\u8BA4\u5C45\u4E2D\uFF09\u3002
            </div>
          </div>
        </div>

        <script>
          // \u7CFB\u7EDF\u5BFC\u822A\u9875\uFF1A\u65B9\u5F0F\u5F00\u5173 + \u4F4D\u7F6E\u4E09\u6863\uFF08window.__navBar \u7531 nav-bar.js \u6865\u63A5\uFF09
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            /* \u77E2\u91CF\u56FE\u6807\uFF08v11.50 #88 \u8DEF\u7EBF A\uFF1A\u4E0E nav-bar.js \u540C\u6E90\u2014\u2014AOSP ic_sysbar_*.xml
               \u6743\u5A01 pathData \u9010\u5B57\uFF0CviewBox 20 \xB7 fill currentColor \u5B9E\u5FC3\uFF0Cstroke \u7EBF\u7A3F\u9000\u5F79\uFF09 */
            function navIcon(key, size) {
              var P = {
                back: '<path d="M15.5417 1.66669C15.1833 1.66669 14.8417 1.76669 14.5333 1.94169L3.21667 8.74169C2.775 9.00002 2.5 9.48335 2.5 10C2.5 10.5167 2.775 11 3.21667 11.2584L14.5333 18.05C14.8417 18.2334 15.1833 18.325 15.5417 18.325C16.625 18.325 17.5 17.45 17.5 16.3667V3.62502C17.5 2.54169 16.625 1.66669 15.5417 1.66669Z"/>',
                home: '<path d="M10.0001 18.3334C5.40008 18.3334 1.66675 14.6 1.66675 10C1.66675 5.40002 5.40008 1.66669 10.0001 1.66669C14.6001 1.66669 18.3334 5.40002 18.3334 10C18.3334 14.6 14.6001 18.3334 10.0001 18.3334Z"/>',
                recents: '<path d="M4.47634 2.5H15.5241C16.6164 2.5 17.5002 3.38382 17.5002 4.4761V15.5239C17.5002 16.6162 16.6164 17.5 15.5241 17.5H4.47634C3.38407 17.5 2.50024 16.6162 2.50024 15.5239V4.4761C2.50024 3.38382 3.38407 2.5 4.47634 2.5Z"/>'
              };
              return '<svg viewBox="0 0 20 20" width="' + size + '" height="' + size + '" aria-hidden="true" style="display:block">' +
                '<g fill="currentColor">' + P[key] + '</g></svg>';
            }
            var MODES = [
              { id: 'gesture', name: '\u624B\u52BF\u5BFC\u822A', badge: '\u9ED8\u8BA4',
                icon: '<svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true" style="display:block">' +
                  '<path d="M24 41V9M13.5 19.5 24 9l10.5 10.5" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                desc: '\u5E95\u90E8\u4E0A\u6ED1\u5173\u95ED\u5E94\u7528 / \u5524\u51FA\u591A\u4EFB\u52A1\u3001\u4E24\u4FA7\u8FB9\u7F18\u6ED1\u52A8\u8FD4\u56DE\uFF1B\u6C89\u6D78\u5168\u5C4F\u65E0\u6309\u952E\u3002' },
              { id: 'three', name: '\u4E09\u952E\u5BFC\u822A', badge: '\u878D\u5408\u6A21\u5F0F',
                icon: '<span style="display:flex;align-items:center;gap:4px;">' +
                  navIcon('back', 14) + navIcon('home', 14) + navIcon('recents', 14) + '</span>',
                desc: '\u65B0\u77E2\u91CF\u4E09\u952E\u60AC\u6D6E\u5E95\u90E8\uFF1B\u624B\u52BF\u4F9D\u65E7\u53EF\u7528 \u2014\u2014 \u957F\u6309\u4E3B\u5C4F\u952E 1 \u79D2\u53EF\u5DE6\u53F3\u62D6\u52A8\u6574\u6761\u5BFC\u822A\u680F\u3002' },
            ];
            var POS = [
              { id: 'left', name: '\u5C45\u5DE6' },
              { id: 'center', name: '\u5C45\u4E2D' },
              { id: 'right', name: '\u5C45\u53F3' },
            ];
            function render() {
              var listEl = document.getElementById('navModeList');
              var posSection = document.getElementById('navPosSection');
              var posList = document.getElementById('navPosList');
              /* v11.50 #112\uFF1A\u97F3\u91CF\u9762\u677F\u4FA7\u504F\u597D\u6E32\u67D3\uFF08\u72EC\u7ACB\u4E8E\u4E09\u952E\u5BFC\u822A\u5F00\u5173\u2014\u2014\u9762\u677F\u4E0D\u4F9D\u8D56\u5BFC\u822A\u680F\u5F62\u6001\uFF1B
                 uiv radio \u540C\u6784\uFF1B\u6301\u4E45\u5316\u952E = aosp/volume-position.js VOLUME_SIDE_STORE_KEY\uFF09 */
              var vsideList = document.getElementById('navVolSideList');
              if (vsideList) {
                var vscur = 'right';
                try { vscur = localStorage.getItem('ios-desktop:volume-side') || 'right'; } catch (e2) {}
                var VSIDES = [
                  { id: 'right', name: '\u53F3\u4FA7\uFF08\u9ED8\u8BA4\uFF09' },
                  { id: 'left', name: '\u5DE6\u4FA7' }
                ];
                vsideList.innerHTML = VSIDES.map(function(s) {
                  var active = s.id === vscur;
                  return '<label class="uiv-nav-radio-label' + (active ? ' uiv-nav-radio-on' : '') + '" data-vside-id="' + s.id + '" role="button" tabindex="0" aria-label="\u97F3\u91CF\u9762\u677F\u4FA7 ' + s.name + '">' +
                    '<input class="uiv-nav-radio-input" type="radio" name="uiv-nav-vside" value="' + s.id + '"' + (active ? ' checked' : '') + ' />' +
                    '<span class="uiv-nav-radio-text">' + s.name + '</span>' +
                    '</label>';
                }).join('');
              }
              if (!listEl || !window.__navBar) return;
              var enabled = window.__navBar.enabled();
              listEl.innerHTML = MODES.map(function(m) {
                var active = (m.id === 'three') === enabled;
                return '<div class="nav-mode-card" data-mode-id="' + m.id + '" role="button" tabindex="0" aria-label="\u5BFC\u822A\u65B9\u5F0F ' + m.name + '"' +
                  ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                  'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                  'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                  '<div style="width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;' +
                  'color:' + (active ? 'hsl(var(--md-h,215) 85% 72%)' : 'var(--md-on-surface-variant,#9a9b9e)') + ';' +
                  'background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / .22)' : 'var(--md-surface-container-high,#2f3136)') + ';">' + m.icon + '</div>' +
                  '<div style="flex:1;min-width:0;">' +
                  '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' + m.name +
                  '<span style="font-size:10px;font-weight:600;color:' + (active ? 'hsl(var(--md-h,215) 85% 65%)' : 'var(--md-on-surface-variant,#9a9b9e)') + ';background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:999px;">' + m.badge + '</span>' +
                  (active ? '<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:hsl(var(--md-h,215) 85% 60%);flex:none;" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' : '') +
                  '</div>' +
                  '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + m.desc + '</div>' +
                  '</div>' +
                  '</div>';
              }).join('');
              if (posSection) posSection.style.display = enabled ? 'block' : 'none';
              if (enabled && posList) {
                var cur = window.__navBar.pos();
                /* Uiverse \u7F1D\u5408\uFF1A\u62DF\u7269\u7269\u7406\u5355\u9009\u7EC4\uFF08\u6E90\uFF1Auiverse.io/m1her/splendid-rat-12\uFF0CMIT\uFF09
                   \u6539\u9020\uFF1A\u7C7B\u540D uiv-nav-radio- \u524D\u7F00\uFF1B\u9009\u4E2D\u6001\u7528\u7C7B\u9A71\u52A8\uFF08\u4E0D\u7528 :has\uFF0C\u517C\u5BB9\u6027\u66F4\u7A33\uFF09\uFF1B
                   \u8272\u503C\u63A5 --md-h \u52A8\u6001\u4EE4\u724C\uFF0C\u660E\u6697\u53CC\u6A21\u5F0F\u6837\u5F0F\u89C1 pixel-features.css \u672B\u5C3E */
                posList.innerHTML = POS.map(function(p) {
                  var active = p.id === cur;
                  return '<label class="uiv-nav-radio-label' + (active ? ' uiv-nav-radio-on' : '') + '" data-pos-id="' + p.id + '" role="button" tabindex="0" aria-label="\u4E09\u952E\u680F\u4F4D\u7F6E ' + p.name + '">' +
                    '<input class="uiv-nav-radio-input" type="radio" name="uiv-nav-pos" value="' + p.id + '"' + (active ? ' checked' : '') + ' />' +
                    '<span class="uiv-nav-radio-text">' + p.name + '</span>' +
                    '</label>';
                }).join('');
              }
              /* v9.94 #107\uFF1A\u5BFC\u822A\u680F\u9644\u52A0\u97F3\u91CF\u952E\u4E09\u6001\uFF08aosp/navbar-volume-keys.js \u5224\u5B9A\u8868\uFF1B
                 \u5355\u9009\u7EC4\u540C\u6B3E uiv \u8303\u5F0F\u96F6\u65B0\u6837\u5F0F\u5757\uFF09 */
              var vkeysSection = document.getElementById('navVkeysSection');
              var vkeysList = document.getElementById('navVkeysList');
              if (vkeysSection) vkeysSection.style.display = enabled ? 'block' : 'none';
              if (enabled && vkeysList && window.__navBar.volumeKeys) {
                var vcur = window.__navBar.volumeKeys();
                var VMODES = [
                  { id: 'default', name: '\u9ED8\u8BA4\uFF08\u79FB\u52A8\u7AEF\u663E\u793A\uFF09' },
                  { id: 'on', name: '\u5F00\u542F' },
                  { id: 'off', name: '\u5173\u95ED' }
                ];
                vkeysList.innerHTML = VMODES.map(function(m) {
                  var active = m.id === vcur;
                  return '<label class="uiv-nav-radio-label' + (active ? ' uiv-nav-radio-on' : '') + '" data-vkey-id="' + m.id + '" role="button" tabindex="0" aria-label="\u5BFC\u822A\u680F\u9644\u52A0\u97F3\u91CF\u952E ' + m.name + '">' +
                    '<input class="uiv-nav-radio-input" type="radio" name="uiv-nav-vkeys" value="' + m.id + '"' + (active ? ' checked' : '') + ' />' +
                    '<span class="uiv-nav-radio-text">' + m.name + '</span>' +
                    '</label>';
                }).join('');
              }
            }
            bindDoc('settings', 'click', function(e) {
              var modeCard = e.target && e.target.closest && e.target.closest('.nav-mode-card');
              if (modeCard && modeCard.isConnected && window.__navBar) {
                window.__navBar.setEnabled(modeCard.dataset.modeId === 'three');
                render();
                return;
              }
              var posChip = e.target && e.target.closest && e.target.closest('.uiv-nav-radio-label');
              if (posChip && posChip.isConnected && posChip.dataset.posId && window.__navBar) {
                window.__navBar.setPos(posChip.dataset.posId);
                render();
                return;
              }
              /* v9.94 #107\uFF1A\u9644\u52A0\u97F3\u91CF\u952E\u4E09\u6001\u5207\u6362\uFF08posId/vkeyId \u53CC dataset \u533A\u5206\u4E24\u7EC4\u5355\u9009\uFF09 */
              var vkeyChip = e.target && e.target.closest && e.target.closest('[data-vkey-id]');
              if (vkeyChip && vkeyChip.isConnected && window.__navBar.setVolumeKeys) {
                window.__navBar.setVolumeKeys(vkeyChip.dataset.vkeyId);
                render();
                return;
              }
              /* v11.50 #112\uFF1A\u97F3\u91CF\u9762\u677F\u4FA7\u5207\u6362\u2014\u2014\u5199\u771F\u6E90 + volume-side-changed \u4E8B\u4EF6
                 \uFF08volume-dialog \u53EF\u89C1\u671F\u5373\u65F6\u91CD\u5224\u843D\u4F4D\uFF1Bnavbar-changed \u540C\u6784\u60EF\u4F8B\uFF09 */
              var vsideChip = e.target && e.target.closest && e.target.closest('[data-vside-id]');
              if (vsideChip && vsideChip.isConnected) {
                try { localStorage.setItem('ios-desktop:volume-side', vsideChip.dataset.vsideId); } catch (e3) {}
                window.dispatchEvent(new CustomEvent('volume-side-changed', { detail: { side: vsideChip.dataset.vsideId } }));
                render();
              }
            });
            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && (e.target.closest('.nav-mode-card') || e.target.closest('.uiv-nav-radio-label'));
              if (card && card.isConnected) { e.preventDefault(); card.click(); }
            });
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 12) render();
            });
            render();
          })();
        <\/script>
      </div>`},{title:"\u9009\u62E9\u58C1\u7EB8\u6765\u6E90",content:`<div id="settingsWallpaperStyleBlock" style="padding:16px 0 0;">
          <!-- v8.96\uFF08#85-F1\uFF09\u590D\u5408\u5165\u53E3\uFF1AAOSP WallpaperAndStyleActivity \u590D\u5408\u9875 =
              \u58C1\u7EB8 + \u989C\u8272\uFF08Monet \u53D6\u8272\uFF09\u5408\u4E00\uFF1Bmd3 \u53D6\u8272\u5355\u6E90 = \u663E\u793A\u9875 --md-h\uFF0C
              \u672C\u590D\u5408\u5757\u4EE5 __tpNav \u8DF3\u8F6C\u627F\u63A5\u590D\u5408\u8BED\u4E49\uFF08A17 \u6743\u5A01\u5165\u53E3\u5BF9\u9F50\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="wp-style-color-entry" onclick="__tpNav(this,1)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="width:36px;height:36px;border-radius:50%;flex:none;background:linear-gradient(135deg,hsl(var(--md-h,215) 80% 40%),hsl(var(--md-h,215) 90% 65%));box-shadow:var(--md-shadow-1);"></span>
            <span style="flex:1;min-width:0;">
              <span style="display:block;font-size:15px;color:var(--md-on-surface);">\u4E3B\u9898\u8272</span>
              <span style="display:block;font-size:12px;color:var(--md-on-surface-variant);margin-top:2px;">\u53D6\u8272\u3001\u6DF1\u8272\u4E3B\u9898</span>
            </span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
        </div>
        <div id="settingsWallpaperContainer" style="padding:16px 0;"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var inited = false;
            function init() {
              if (inited) return;
              var box = document.getElementById('settingsWallpaperContainer');
              if (box && window.__initWallpaperPage) {
                inited = true;
                window.__initWallpaperPage(box);
              }
            }
            // fix(v7.37 \u5168\u91CF\u5BA1\u8BA1)\uFF1A\u61D2\u6FC0\u6D3B \u2014\u2014 page-stack \u9996\u5F00\u4F1A\u628A\u5168\u90E8\u5B50\u9875 content \u4E0E
            // script \u4E00\u6B21\u6027\u6CE8\u5165\u6267\u884C\uFF1B\u65E7\u7248 init() \u7ACB\u5373\u8DD1 __initWallpaperPage \u2192 \u52A8\u6001
            // \u58C1\u7EB8\u7F29\u7565\u56FE\u540C\u6B65\u4E32\u884C\u7ED8\u5236\uFF0C\u53D6\u8BC1\u5B9E\u9524\u628A\u300C\u6253\u5F00\u8BBE\u7F6E\u300D\u62D6\u6210 4.8 \u79D2\u957F\u4EFB\u52A1\u3002
            // \u73B0\u5728\u9996\u5F00\u96F6\u6E32\u67D3\uFF0C\u7528\u6237\u9996\u6B21\u771F\u6B63\u63A8\u5165\u672C\u9875\uFF08pageIdx===13\uFF09\u65F6\u624D\u521D\u59CB\u5316\u3002
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 13) init();
            });
          })();
        <\/script>`},{title:"\u684C\u9762\u4E0E Dock",content:`<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">\u56FE\u6807\u7F51\u683C</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 14px;">
            \u8C03\u6574\u684C\u9762\u56FE\u6807\u7684\u5217\u6570\u4E0E\u884C\u6570\u3002\u300C\u81EA\u52A8\u300D\u8DDF\u968F\u8BBE\u5907\u5F62\u6001\uFF08\u624B\u673A\u7AD6\u5C4F 4\xD76\uFF0C\u5E73\u677F/\u6A2A\u5C4F 6\xD74\uFF09\u3002
            \u7F29\u5C0F\u7F51\u683C\u65F6\u8D85\u51FA\u5BB9\u91CF\u7684\u56FE\u6807\u4F1A\u6309\u987A\u5E8F\u987A\u5EF6\u5230\u4E0B\u4E00\u9875\uFF0C\u6392\u5217\u6B21\u5E8F\u4FDD\u6301\u4E0D\u53D8\u3002
          </div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin-bottom:8px;">\u5217\u6570</div>
          <div id="dpColChips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;"></div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin-bottom:8px;">\u884C\u6570</div>
          <div id="dpRowChips" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>

        <div class="md3-card md3-card-elevated" style="margin:0 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">Dock</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 4px;">
            \u684C\u9762\u5E95\u90E8\u7684\u5E38\u9A7B\u5E94\u7528\u680F\u3002\u6570\u91CF\u4E0A\u9650 6 \u4E2A\uFF1B\u5E73\u677F\u5C3A\u5BF8\u4E0B\u6700\u53F3\u4FA7\u8FFD\u52A0\u6700\u591A 3 \u4E2A\u300C\u6700\u8FD1\u6253\u5F00\u5E94\u7528\u300D\u4F4D\u3002
            \u957F\u6309 Dock \u4E0A\u7684\u56FE\u6807\u53EF\u5C06\u5176\u79FB\u9664\u3002
          </div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">\u542F\u7528 Dock</span>
            <label class="md3-switch"><input type="checkbox" id="dpDockEnabled"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">\u5E73\u677F\u663E\u793A\u6700\u8FD1\u5E94\u7528\uFF08\u22643\uFF09</span>
            <label class="md3-switch"><input type="checkbox" id="dpDockRecents"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">macOS \u795E\u5947\u6548\u679C</span>
            <label class="md3-switch"><input type="checkbox" id="dpMacEffect"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;padding:0 16px 10px;">
            \u5F00\u542F\u540E\u6309 Apple \u539F\u7248\u66F2\u7EBF 1:1 \u590D\u523B\uFF1A\u60AC\u505C\u56FE\u6807\u9489\u5728\u6307\u9488\u4E0B\u65B9\u653E\u81F3\u500D\u7387\u4E0A\u9650\uFF0C\u90BB\u4F4D\u56FE\u6807\u88AB\u63A8\u5F00\u3001
            Dock \u6574\u4F53\u53D8\u5BBD\u62E5\u62B1\u5185\u5BB9\uFF0C\u60AC\u505C\u56FE\u6807\u4E0A\u65B9\u6D6E\u73B0\u5E94\u7528\u540D\u6C14\u6CE1\uFF1B\u79FB\u5F00\u540E\u7EA6 1 \u79D2\u5185\u5E73\u6ED1\u843D\u5B9A\u3002
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">\u653E\u5927\u500D\u7387</span>
            <span style="display:flex;align-items:center;gap:10px;">
              <input type="range" id="dpMagnify" min="1.4" max="2.8" step="0.05"
                style="width:130px;accent-color:hsl(var(--md-h,215) 70% 55%);">
              <span id="dpMagnifyVal" style="font-size:13px;font-weight:600;min-width:46px;text-align:right;color:var(--md-on-surface);">2.25\xD7</span>
            </span>
          </div>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;padding:0 16px 10px;">
            \u4E0E macOS \u7CFB\u7EDF\u8BBE\u7F6E\u7684 Magnification \u6ED1\u6746\u540C\u6E90\uFF08\u9ED8\u8BA4 2.25\xD7\uFF0C\u8303\u56F4 1.4\xD7\u20132.8\xD7\uFF09\u3002
          </div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin:6px 0 8px;padding:0 16px;">\u56FE\u6807\u6570\u91CF\uFF081\u20136\uFF09</div>
          <div id="dpCountChips" style="display:flex;gap:8px;flex-wrap:wrap;padding:0 16px;margin-bottom:6px;"></div>
        </div>

        <div class="md3-card md3-card-elevated" style="margin:0 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">\u5E73\u677F\u4EFB\u52A1\u680F\uFF08Taskbar\uFF09</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 4px;">
            \u5E73\u677F\u5C3A\u5BF8\uFF08\u5BBD\u5EA6 \u2265768px\uFF09\u4E0B\u542F\u7528 Android \u5F0F\u5E95\u90E8\u4EFB\u52A1\u680F\uFF1A\u56FA\u5B9A\u5E94\u7528 + \u8FD0\u884C\u4E2D\u5E94\u7528\uFF08\u5E26\u6307\u793A\u6761\uFF09
            + All Apps \u5165\u53E3 + \u8FD4\u56DE/Home/\u6982\u89C8\u5BFC\u822A\u4E09\u952E\u3002\u5E94\u7528\u5185\u65E0\u89E6\u6478 5 \u79D2\u81EA\u52A8\u6536\u7EB3\u4E3A\u5E95\u90E8\u624B\u67C4\uFF0C
            \u60AC\u6D6E/\u70B9\u51FB/\u4E0A\u6ED1\u624B\u67C4\u5524\u51FA\u3002\u5F00\u542F\u65F6\u5E73\u677F\u65AD\u70B9\u4E0E Dock \u4E92\u65A5\uFF08\u624B\u673A\u65AD\u70B9\u4ECD\u8D70 Dock\uFF09\u3002
          </div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">\u542F\u7528\u5E73\u677F\u4EFB\u52A1\u680F</span>
            <label class="md3-switch"><input type="checkbox" id="dpTaskbarEnabled"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>

        <div class="md3-card md3-card-elevated" style="margin:0 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">\u540E\u53F0\u591A\u4EFB\u52A1</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 14px;">
            \u540E\u53F0\u5361\u7247\u7684\u5E03\u5C40\u98CE\u683C\u30023D \u8F6E\u64AD\u4E3A Material Expressive \u6DF1\u5EA6\u5806\u53E0\uFF08\u4FA7\u5361\u540E\u4EF0\u3001\u666F\u6DF1\u9519\u843D\uFF09\uFF1B
            \u7ECF\u5178\u5E73\u94FA\u4E3A\u4F20\u7EDF\u5B89\u5353\u6837\u5F0F\uFF08Android 5\u20139 \u540C\u6784\uFF09\uFF1A\u5361\u7247\u6B63\u5BF9\u955C\u5934\u5E73\u9762\u6A2A\u5411\u4F9D\u6B21\u6392\u5217\uFF0C\u5168\u7A0B\u4E0D\u505A\u865A\u5316\u3002
          </div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin-bottom:8px;">\u5361\u7247\u5E03\u5C40</div>
          <div id="dpRecentsStyleChips" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>

        <div class="md3-card md3-card-elevated" style="margin:0 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">Dock \u5E94\u7528\u7BA1\u7406</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 12px;">
            \u5F53\u524D\u56FA\u5B9A\u5728 Dock \u4E0A\u7684\u5E94\u7528\u3002\u70B9\u300C\xD7\u300D\u79FB\u9664\uFF1B\u4E0B\u65B9\u70B9\u5E94\u7528\u56FE\u6807\u5373\u53EF\u6DFB\u52A0\uFF08\u4E0A\u9650 <span id="dpDockMaxHint">6</span> \u4E2A\uFF09\u3002
          </div>
          <div id="dpDockItems" style="display:flex;gap:12px;flex-wrap:wrap;padding:0 2px 12px;"></div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 2px 12px;"></div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin-bottom:10px;">\u53EF\u6DFB\u52A0</div>
          <div id="dpDockPool" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:10px;"></div>
        </div>

        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var P = window.__desktopPrefs;
            var D = window.__dockPrefs;

            function chipHTML(group, val, cur, label) {
              var on = String(val) === String(cur);
              return '<button type="button" class="dp-chip" data-group="' + group + '" data-v="' + val + '"' +
                ' style="padding:8px 16px;border-radius:999px;border:1.5px solid ' + (on ? 'hsl(var(--md-h,215) 85% 60%)' : 'var(--md-outline-variant,transparent)') +
                ';background:' + (on ? 'hsl(var(--md-h,215) 80% 55% / .16)' : 'var(--md-surface-container,#232529)') +
                ';color:' + (on ? 'hsl(var(--md-h,215) 85% 70%)' : 'var(--md-on-surface,#e2e2e9)') +
                ';font-size:13px;font-weight:600;cursor:pointer;">' + label + '</button>';
            }

            function appTile(id, name, removable, iconSvg) {
              return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:64px;">' +
                '<div style="position:relative;width:52px;height:52px;">' +
                '<div style="width:52px;height:52px;border-radius:13px;overflow:hidden;">' + iconSvg + '</div>' +
                (removable ? '<button type="button" class="dp-dock-remove" data-id="' + id + '" aria-label="\u79FB\u9664 ' + name + '"' +
                  ' style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:none;cursor:pointer;' +
                  'background:hsl(var(--md-h,215) 70% 55%);color:#fff;font-size:13px;line-height:20px;text-align:center;">\xD7</button>' : '') +
                '</div>' +
                '<span style="font-size:11px;color:var(--md-on-surface-variant);max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + name + '</span>' +
                '</div>';
            }

            function render() {
              if (!P || !D) return;
              var p = P.get();
              var colEl = document.getElementById('dpColChips');
              var rowEl = document.getElementById('dpRowChips');
              if (colEl) {
                var html = chipHTML('cols', 'auto', p.cols, '\u81EA\u52A8');
                for (var i = 0; i < P.cols.length; i++) html += chipHTML('cols', P.cols[i], p.cols, String(P.cols[i]));
                colEl.innerHTML = html;
              }
              if (rowEl) {
                var html2 = chipHTML('rows', 'auto', p.rows, '\u81EA\u52A8');
                for (var j = 0; j < P.rows.length; j++) html2 += chipHTML('rows', P.rows[j], p.rows, String(P.rows[j]));
                rowEl.innerHTML = html2;
              }
              var swE = document.getElementById('dpDockEnabled');
              var swR = document.getElementById('dpDockRecents');
              var swM = document.getElementById('dpMacEffect');
              if (swE) (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(swE, !!p.dockEnabled); // #70\uFF08Dock \u8BBE\u7F6E\u91CD\u6E32\u67D3\u8DEF\u5F84\uFF09
              if (swR) (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(swR, !!p.dockRecents);
              if (swM) (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(swM, !!p.dockMacEffect);
              var swT = document.getElementById('dpTaskbarEnabled');
              if (swT) (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(swT, !!p.taskbarEnabled); // #72\uFF08\u5E73\u677F\u4EFB\u52A1\u680F\uFF09
              var mgEl = document.getElementById('dpMagnify');
              var mgVal = document.getElementById('dpMagnifyVal');
              if (mgEl) mgEl.value = String(p.dockMagnify);
              if (mgVal) mgVal.innerText = Number(p.dockMagnify).toFixed(2) + '\xD7';

              var countEl = document.getElementById('dpCountChips');
              if (countEl) {
                var html3 = '';
                for (var k = 1; k <= P.dockMax; k++) html3 += chipHTML('dockCount', k, p.dockCount, String(k));
                countEl.innerHTML = html3;
              }
              var styleEl = document.getElementById('dpRecentsStyleChips');
              if (styleEl) {
                styleEl.innerHTML =
                  chipHTML('recentsStyle', 'carousel', p.recentsStyle, '3D \u8F6E\u64AD\uFF08\u9ED8\u8BA4\uFF09') +
                  chipHTML('recentsStyle', 'classic', p.recentsStyle, '\u7ECF\u5178\u5E73\u94FA') +
                  chipHTML('recentsStyle', 'tablet', p.recentsStyle, '\u5E73\u677F\u7F51\u683C');
              }
              var maxHint = document.getElementById('dpDockMaxHint');
              if (maxHint) maxHint.innerText = String(P.dockMax);

              var itemsEl = document.getElementById('dpDockItems');
              var poolEl = document.getElementById('dpDockPool');
              if (itemsEl) {
                var items = D.items();
                if (!items.length) {
                  itemsEl.innerHTML = '<span style="font-size:12px;color:var(--md-on-surface-variant);">Dock \u4E3A\u7A7A \u2014\u2014 \u4ECE\u4E0B\u65B9\u6DFB\u52A0\uFF0C\u6216\u957F\u6309\u684C\u9762\u5E94\u7528\u56FE\u6807\u9009\u62E9\u300C\u6DFB\u52A0\u5230 Dock\u300D</span>';
                } else {
                  var h4 = '';
                  for (var m = 0; m < items.length; m++) {
                    var a = D.allApps().filter(function(x) { return x.id === items[m]; })[0];
                    if (!a) continue;
                    h4 += appTile(a.id, a.name, true, window.__getAppIconSVG(a.id));
                  }
                  itemsEl.innerHTML = h4;
                }
              }
              if (poolEl) {
                var pool = D.allApps().filter(function(x) { return D.items().indexOf(x.id) === -1; });
                var h5 = '';
                for (var n = 0; n < pool.length; n++) {
                  h5 += appTile(pool[n].id, pool[n].name, false, window.__getAppIconSVG(pool[n].id));
                }
                poolEl.innerHTML = h5 || '<span style="font-size:12px;color:var(--md-on-surface-variant);">\u5168\u90E8\u5E94\u7528\u90FD\u5DF2\u5728 Dock \u4E0A</span>';
              }
            }

            bindDoc('settings', 'click', function(e) {
              var chip = e.target && e.target.closest ? e.target.closest('.dp-chip') : null;
              if (chip && chip.isConnected) {
                var g = chip.getAttribute('data-group');
                var v = chip.getAttribute('data-v');
                var val = (v === 'auto') ? 'auto' : parseInt(v, 10);
                if (g === 'dockCount') val = parseInt(v, 10);
                if (g === 'recentsStyle') val = v; // \u5B57\u7B26\u4E32\u6863\u4F4D\uFF08carousel/classic\uFF09\u4E0D\u7ECF parseInt
                P.set(g, val);
                render();
                return;
              }
              var rm = e.target && e.target.closest ? e.target.closest('.dp-dock-remove') : null;
              if (rm && rm.isConnected) {
                D.remove(rm.getAttribute('data-id'));
                render();
                return;
              }
              // \u6C60\u70B9\u6309 = \u6DFB\u52A0\uFF08\u6EE1\u5458\u7531 addToDock \u62D2\u7EDD\u5E76\u5410\u53F8\u63D0\u793A\uFF09
              var poolTile = e.target && e.target.closest ? e.target.closest('#dpDockPool > div') : null;
              if (poolTile && poolTile.isConnected) {
                var btn = poolTile.querySelector ? null : null;
                var id = null;
                var nameEl = poolTile.querySelector('span');
                var added = false;
                var all = D.allApps();
                for (var i = 0; i < all.length; i++) {
                  if (nameEl && all[i].name === nameEl.innerText) { id = all[i].id; break; }
                }
                if (id) added = D.add(id);
                if (added && window.showSystemToast) window.showSystemToast('\u5DF2\u6DFB\u52A0\u5230 Dock');
                else if (!added && window.showSystemToast) window.showSystemToast('Dock \u5DF2\u6EE1\uFF08\u6700\u591A ' + P.dockMax + ' \u4E2A\uFF09');
                render();
              }
            });

            bindDoc('settings', 'change', function(e) {
              var t = e.target;
              if (!t || !t.id) return;
              if (t.id === 'dpDockEnabled') P.set('dockEnabled', !!t.checked);
              else if (t.id === 'dpDockRecents') P.set('dockRecents', !!t.checked);
              else if (t.id === 'dpMacEffect') P.set('dockMacEffect', !!t.checked);
              else if (t.id === 'dpTaskbarEnabled') P.set('taskbarEnabled', !!t.checked); // #72
              else if (t.id === 'dpMagnify') P.set('dockMagnify', parseFloat(t.value));
              else return;
            });

            // \u62D6\u52A8\u4E2D\u5B9E\u65F6\u53CD\u9988\uFF08input \u4E8B\u4EF6\uFF09\uFF1Alabel \u5373\u65F6\u5237\u65B0 + \u504F\u597D\u5373\u65F6\u751F\u6548
            bindDoc('settings', 'input', function(e) {
              var t = e.target;
              if (!t || t.id !== 'dpMagnify') return;
              var v = parseFloat(t.value);
              var lb = document.getElementById('dpMagnifyVal');
              if (lb) lb.innerText = v.toFixed(2) + '\xD7';
              P.set('dockMagnify', v);
            });

            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 14) render();
            });
            render();
          })();
        <\/script>`},{title:"\u7CFB\u7EDF",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u7CFB\u7EDF</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u8BED\u8A00\u3001\u624B\u52BF\u3001\u65F6\u95F4\u3001\u5907\u4EFD\uFF08AOSP SystemDashboardFragment \u8BED\u4E49\uFF09</div>
          ${[{idx:12,label:"\u7CFB\u7EDF\u5BFC\u822A\u65B9\u5F0F",sub:"\u624B\u52BF \xB7 \u4E09\u952E",icon:"explore"},{idx:31,label:"\u72B6\u6001\u680F",sub:"\u56FE\u6807\u663E\u9690",icon:"visibility"},{idx:9,label:"\u591A\u6A21\u5F0F\uFF08\u5DE5\u4F5C / \u4E2A\u4EBA\uFF09",sub:"\u8D44\u6599\u5207\u6362",icon:"person"},{idx:10,label:"\u52A8\u753B\u4E0E\u52A8\u6548\u66F2\u7EBF",sub:"\u52A8\u6548\u901F\u5EA6 \xB7 \u66F2\u7EBF",icon:"auto_awesome"},{idx:11,label:"\u540E\u53F0\u4E0E\u591A\u4EFB\u52A1",sub:"\u51BB\u7ED3\u7B56\u7565",icon:"picture_in_picture"},{idx:14,label:"\u684C\u9762\u4E0E Dock",sub:"\u56FE\u6807\u7F51\u683C \xB7 Dock \u680F",icon:"home"},{idx:8,label:"\u5F00\u53D1\u8005\u9009\u9879",sub:"\u5B9E\u9A8C\u7279\u6027",icon:"code"}].map(t=>`
            <div class="md3-list-item" role="button" tabindex="0" onclick="__tpNav(this,${t.idx})" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
              <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${i[t.icon]||""}</span>
              <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">${t.label}</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">${t.sub}</span></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
            </div>`).join("")}
        </div>`},{title:"\u5B50\u9875\u9762\u5BF9\u9F50\u4E2D",content:`
        <div style="min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;">
          <div style="width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--md-primary-container,#d3e3fd);color:var(--md-on-primary-container,#041e49);">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M19,5H5C3.9,5 3,5.9 3,7v10c0,1.1 0.9,2 2,2h14c1.1,0 2-0.9 2-2V7C21,5.9 20.1,5 19,5z M19,17H5V7h14V17z"/></svg>
          </div>
          <div style="font-size:18px;font-weight:500;">\u8BE5\u5B50\u9875\u9762\u5BF9\u9F50\u4E2D</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);max-width:420px;line-height:1.6;">
            \u4E00\u7EA7\u83DC\u5355\u5DF2\u6309 AOSP android-17 \u6E90\u7801 top_level_settings.xml \u5B8C\u6574\u5448\u73B0\uFF1B
            \u6B64\u9879\u5BF9\u5E94\u7684\u6E90\u7801 fragment\uFF08ModesDashboardFragment\u3001SecurityDashboardFragment \u7B49\uFF09
            \u5C06\u6309 1:1 \u6807\u51C6\u9010\u9875\u79FB\u690D\uFF08v8.03+\uFF0C\u89C1\u8BAE\u9898 #10 \u6267\u884C\u8BA1\u5212\u4E0E #22 \u8DEF\u7EBF\u56FE\uFF1B
            v8.01 \u5DF2\u8F6C\u6B63 NotificationSettings \u2192 \u9875 19\uFF0Cv8.02 \u5DF2\u8F6C\u6B63 AccessibilitySettings \u2192 \u9875 20\uFF0C
            v8.04 \u5DF2\u8F6C\u6B63 DisplaySettings \u2192 \u9875 1\uFF09\u3002
          </div>
        </div>`},{title:"\u7F51\u7EDC\u548C\u4E92\u8054\u7F51",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u7F51\u7EDC\u548C\u4E92\u8054\u7F51</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u4E92\u8054\u7F51\u3001\u901A\u8BDD\u548C\u77ED\u4FE1\u3001SIM \u5361\u3001VPN\u3001\u70ED\u70B9\uFF08AOSP NetworkDashboardFragment\uFF09</div>
          <!-- 1. internet_settings\uFF08order -30\uFF09\uFF1A\u6458\u8981\u52A8\u6001\uFF08InternetPreferenceControllerV2\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="__qsNetworkSheet(this)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.topWireless||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u4E92\u8054\u7F51</span><span id="netInternetSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- 2. calls_and_sms\uFF08order -20\uFF09\uFF1Asummary_placeholder\uFF08\u65E0\u9ED8\u8BA4\u6458\u8981\uFF0C\u5FE0\u5B9E\u7A7A\u5448\u73B0\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.netCallsSms||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u901A\u8BDD\u548C\u77ED\u4FE1</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- 3. mobile_network_list\uFF08order -15\uFF09\uFF1AMobileNetworkSummaryController \u8BED\u4E49
              \uFF08\u8BA2\u9605\u663E\u793A\u540D\uFF1B\u6A21\u62DF\u5668\u8FD0\u8425\u5546=\u4E2D\u56FD\u79FB\u52A8 5G\uFF0C\u4E0E QS \u7F51\u7EDC\u9762\u677F\u540C\u6E90\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.netSim||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">SIM \u5361</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u4E2D\u56FD\u79FB\u52A8 5G</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- 4. airplane_mode_on\uFF08order -5\uFF09\uFF1ARestrictedSwitchPreference\uFF0C\u5355\u6E90 QS aeroplane \u78C1\u8D34 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.netAirplane||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u98DE\u884C\u6A21\u5F0F</span></span>
            <label class="md3-switch"><input type="checkbox" id="netAirplaneToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- 5. tether_settings\uFF08order 5\uFF09\uFF1ATetherPreferenceController \u52A8\u6001\u6458\u8981\u6392 v8.00+ -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.netTether||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u70ED\u70B9\u548C\u7F51\u7EDC\u5171\u4EAB</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- 6. restrict_background_parent_entry\uFF08order 10\uFF09\uFF1ADataSaverPreference \u81EA\u7BA1\u6458\u8981 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.netDataSaver||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u7701\u6D41\u6A21\u5F0F</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- 7. vpn_settings\uFF08order 15\uFF09\uFF1AVpnInfoPreference \u52A8\u6001\u6458\u8981\uFF08\u5F53\u524D\u65E0\u6D3B\u8DC3 VPN\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.netVpn||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">VPN</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- 8. private_dns_settings\uFF08order 20\uFF09\uFF1A\u6E90\u7801\u65E0 android:icon\uFF08\u5BF9\u8BDD\u6846\u504F\u597D\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u79C1\u4EBA DNS</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- 9. adaptive_connectivity\uFF08order 25\uFF09\uFF1A\u6E90\u7801\u65E0 icon\uFF1B\u6458\u8981 = \u6743\u5A01 zh \u5168\u6587 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u81EA\u9002\u5E94\u8FDE\u63A5</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u81EA\u52A8\u7BA1\u7406\u60A8\u7684\u7F51\u7EDC\u8FDE\u63A5\uFF0C\u4ECE\u800C\u5EF6\u957F\u7535\u6C60\u7EED\u822A\u65F6\u95F4\u5E76\u63D0\u5347\u8BBE\u5907\u6027\u80FD</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- 10. cellular_security_network_internet\uFF08order 30\uFF09\uFF1A\u6E90\u7801\u65E0 icon -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u79FB\u52A8\u7F51\u7EDC\u5B89\u5168</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u7F51\u7EDC\u7C7B\u578B\u3001\u52A0\u5BC6\u3001\u901A\u77E5\u63A7\u4EF6</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
        </div>
        <script>
          // v7.99 #10 \u4E8C\u671F\uFF1A\u4E92\u8054\u7F51\u6458\u8981\uFF08InternetPreferenceControllerV2 \u8BED\u4E49\uFF09+ \u98DE\u884C\u6A21\u5F0F
          // \u5F00\u5173\uFF08AirplaneModePreferenceController \u8BED\u4E49\uFF09\u2014\u2014\u5355\u4E00\u771F\u6E90 window.__qsTileState
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            function refresh() {
              var sub = document.getElementById('netInternetSub');
              if (sub && window.__qsTileState) {
                var tile = window.__qsTileState.tile('internet');
                sub.textContent = (tile && tile.active) ? (tile.sub || '\u5DF2\u8FDE\u63A5') : '\u5DF2\u5173\u95ED';
              }
              var sw = document.getElementById('netAirplaneToggle');
              if (sw && window.__qsTileState) (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, window.__qsTileState.get('aeroplane')); // #70
            }
            function bind() {
              var sw = document.getElementById('netAirplaneToggle');
              if (sw && !sw.dataset.v799Bound) {
                sw.dataset.v799Bound = '1';
                sw.addEventListener('change', function() {
                  var on = !!sw.checked;
                  if (window.__qsTileState) window.__qsTileState.sync('aeroplane', { active: on });
                  if (window.__qsToast) window.__qsToast(on ? '\u98DE\u884C\u6A21\u5F0F\u5DF2\u5F00\u542F' : '\u98DE\u884C\u6A21\u5F0F\u5DF2\u5173\u95ED');
                });
              }
            }
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 17) { refresh(); bind(); }
            });
          })();
        <\/script>`},{title:"\u5DF2\u8FDE\u63A5\u7684\u8BBE\u5907",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u5DF2\u8FDE\u63A5\u7684\u8BBE\u5907</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u5A92\u4F53\u8BBE\u5907\u3001\u914D\u5BF9\u3001\u4FDD\u5B58\u7684\u8BBE\u5907\uFF08AOSP ConnectedDeviceDashboardFragment\uFF09</div>
          <!-- available_device_list\uFF08AvailableMediaDeviceGroupController\uFF09\uFF1A\u5A92\u4F53\u8DEF\u7531\u53EF\u7528\u8BBE\u5907\uFF0Ccast \u8BED\u4E49 -->
          <div id="connDevCatAvailable">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u5A92\u4F53\u8BBE\u5907</div>
            <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
              <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">
                <svg viewBox="0 -960 960 960" width="24" height="24" fill="currentColor"><path d="M881-220q0 24.75-17.62 42.37Q845.75-160 821-160H626q-10.71 0-17.97-8.1-7.27-8.1-8.03-18.9-4-96-41-181t-98.57-151.13q-61.58-66.14-143.5-108.5Q235-670 140-680q-25-3-42-19.9-17-16.89-17-42 0-25.1 17.62-41.6T141-800h680q24.75 0 42.38 17.62Q881-764.75 881-740v520Zm-570.47 60q-11.73 0-20.53-7.33T279-187q-9-69-56.5-117.5T107-362q-11-2-18.5-11.05T81-393.69Q81-406 88.5-415q7.5-9 18.5-8 93 9 158 75.5T340-188q2 11.79-7.5 19.89Q323-160 310.53-160ZM471-160q-12 0-21-8t-10-20q-11-134-103.5-229T111-523q-13-1-21.5-10.05-8.5-9.06-8.5-21.13Q81-567 91.5-575.5T116-583q154.76 12.84 263.38 123.42T500-193q1 14-7.62 23.5-8.63 9.5-21.38 9.5Zm-352.14 0Q102-160 90.5-171.64T79-200.14Q79-217 90.64-228.5t28.5-11.5q16.86 0 28.36 11.64t11.5 28.5q0 16.86-11.64 28.36t-28.5 11.5Z"/></svg>
              </span>
              <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Pixel Tablet</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u53EF\u7528</span></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
            </div>
          </div>
          <!-- connected_device_list\uFF08ConnectedDeviceGroupController\uFF09\uFF1A\u84DD\u7259\u6001\u95E8\u63A7\u5206\u7EC4 -->
          <div id="connDevCatConnected">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u5176\u4ED6\u8BBE\u5907</div>
            <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
              <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.devBt||""}</span>
              <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Pixel Buds Pro</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5DF2\u8FDE\u63A5</span></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
            </div>
          </div>
          <!-- add_bt_devices\uFF08RestrictedPreference + AddDevicePreferenceController\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="__connDevAdd(this)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.devAdd||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u4E0E\u65B0\u8BBE\u5907\u914D\u5BF9</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u7CFB\u7EDF\u5C06\u5F00\u542F\u84DD\u7259\u4EE5\u8FDB\u884C\u914D\u5BF9</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- previously_connected_devices\uFF08PreviouslyConnectedDevicePreferenceController\uFF09\uFF1A\u84DD\u7259\u6001\u95E8\u63A7 -->
          <div id="connDevCatSaved">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u4FDD\u5B58\u7684\u8BBE\u5907</div>
            <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
              <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.devBt||""}</span>
              <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Pixel Buds Pro</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5DF2\u914D\u5BF9</span></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
            </div>
            <div class="md3-list-item" role="button" tabindex="0" style="min-height:52px;display:flex;align-items:center;justify-content:flex-end;gap:8px;border-radius:16px;padding-right:12px;cursor:pointer;">
              <span style="font-size:14px;font-weight:500;color:var(--md-primary,#0b57d0);">\u67E5\u770B\u5168\u90E8</span>
              <span style="color:var(--md-primary,#0b57d0);">\u203A</span>
            </div>
          </div>
          <!-- fast_pair_devices\uFF08FastPairDevicePreferenceController\uFF09\uFF1A\u84DD\u7259\u6001\u95E8\u63A7 -->
          <div id="connDevCatFastPair">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u66FE\u4E0E\u8D26\u53F7\u914D\u5BF9\u8FC7\u7684\u8BBE\u5907</div>
            <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
              <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.devBt||""}</span>
              <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Pixel Buds A-Series</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5DF2\u914D\u5BF9</span></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
            </div>
            <div class="md3-list-item" role="button" tabindex="0" style="min-height:52px;display:flex;align-items:center;justify-content:flex-end;gap:8px;border-radius:16px;padding-right:12px;cursor:pointer;">
              <span style="font-size:14px;font-weight:500;color:var(--md-primary,#0b57d0);">\u67E5\u770B\u5168\u90E8</span>
              <span style="color:var(--md-primary,#0b57d0);">\u203A</span>
            </div>
          </div>
          <!-- connection_preferences\uFF08AdvancedConnectedDeviceController\uFF09\uFF1Asummary_placeholder \u5FE0\u5B9E\u7A7A\u5448\u73B0 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u8FDE\u63A5\u504F\u597D\u8BBE\u7F6E</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- discoverable_footer\uFF08DiscoverableFooterPreferenceController\uFF09\uFF1A\u84DD\u7259\u5173\u65F6\u53EF\u89C1 -->
          <div id="connDevFooter" style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:16px 12px 8px;line-height:1.6;">\u5F00\u542F\u84DD\u7259\u5373\u53EF\u8FDE\u63A5\u5230\u5176\u4ED6\u8BBE\u5907\u3002</div>
        </div>
        <script>
          // v8.00 #10 \u4E09\u671F\uFF1A\u84DD\u7259\u5355\u4E00\u771F\u6E90\u63A5\u7EBF\uFF08AddDevicePreferenceController /
          // DiscoverableFooterPreferenceController / \u84DD\u7259\u4F9D\u8D56\u5206\u7EC4\u95E8\u63A7\u7684 Web \u7B49\u4EF7\u7269\uFF09
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var BT_GROUPS = ['connDevCatConnected', 'connDevCatSaved', 'connDevCatFastPair'];
            function refresh() {
              if (!window.__qsTileState) return;
              var btOn = !!window.__qsTileState.get('bluetooth');
              BT_GROUPS.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.display = btOn ? '' : 'none';
              });
              var ft = document.getElementById('connDevFooter');
              if (ft) ft.style.display = btOn ? 'none' : '';
            }
            window.__connDevAdd = function() {
              var wasOn = window.__qsTileState && window.__qsTileState.get('bluetooth');
              if (window.__qsTileState && !wasOn) {
                window.__qsTileState.sync('bluetooth', { active: true });
              }
              if (window.__qsToast) window.__qsToast(wasOn ? '\u6B63\u5728\u641C\u7D22\u9644\u8FD1\u7684\u8BBE\u5907' : '\u84DD\u7259\u5DF2\u5F00\u542F');
              refresh();
            };
            refresh();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 18) { refresh(); }
            });
          })();
        <\/script>`},{title:"\u901A\u77E5",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u901A\u77E5</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u5386\u53F2\u901A\u77E5\u3001\u5BF9\u8BDD\u3001\u9501\u5C4F\u901A\u77E5\uFF08AOSP NotificationSettings\uFF09</div>
          <!-- v10.37 #220 \u2460\uFF1A\u9762\u677F\u6A21\u5F0F\uFF08Panels\uFF09\u8BBE\u7F6E\u9879 \u2014\u2014 Android 17 Dual Shade \u7528\u6237\u5F00\u5173\u540C\u6784
              \uFF08ShadeModeInteractor.kt\uFF1AShadeMode.Dual\uFF0CSettings.Secure.DUAL_SHADE \u7528\u6237\u5F00\u5173\uFF1B
              \u89C6\u9891\u5B9E\u9524 \u8BBE\u7F6E\u9875 Panels = Separate / Combined (classic)\uFF0C\u4E0E\u672C\u9875\u540C\u57DF\u3002
              \u6CE8\uFF1Aconfigure_notification_settings.xml 28 key \u6743\u5A01\u6E05\u5355\u4E0D\u542B\u6B64\u9879\uFF0C\u672C\u5757\u5C5E
              AOSP 17 \u5DF2\u6709\u7528\u6237\u5F00\u5173\u7684 Web \u8F6C\u6B63\u975E\u51ED\u7A7A\u8D85\u8D8A\u9879\uFF0C\u843D\u4F4D\u672C\u9875\u5C3E\u968F #220 \u8BAE\u9898\u2460\u53E3\u5F84\uFF09\u3002
              \u5B58\u50A8\u5355\u4E00\u771F\u6E90 = dual-shade.js setShadeMode\uFF08\u65E2\u6709 localStorage 'android17:shadeMode'
              \u952E\u590D\u7528\uFF0C\u4E0D\u65B0\u5EFA\u952E #178\uFF09\uFF1B\u4E0E index.html Panels \u5F39\u5C42\uFF08\u957F\u6309 QS \u9F7F\u8F6E\uFF09\u53CC\u5165\u53E3
              \u540C\u4E00\u5199\u5165\u901A\u9053\uFF0Cmd3-shade-mode-changed \u4E8B\u4EF6\u53CC\u5411\u56DE\u663E -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u9762\u677F\u6A21\u5F0F</div>
          <div id="shadeModeList" style="display:flex;gap:10px;padding:0 12px;flex-wrap:wrap;"></div>
          <div class="md3-card" style="margin:12px 12px 0;padding:13px 16px;display:flex;align-items:center;gap:10px;">
            <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:var(--md-primary,hsl(var(--md-h,215) 80% 55%));flex:none;" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.5;">
              Separate\uFF08\u5206\u5BB6\u53CC\u680F\uFF09\uFF1A\u4ECE\u5C4F\u5E55\u9876\u90E8\u5DE6\u4FA7\u4E0B\u62C9\u5F00\u901A\u77E5\u3001\u53F3\u4FA7\u4E0B\u62C9\u5F00\u5FEB\u6377\u8BBE\u7F6E\uFF0C\u4E24\u9762\u677F\u72EC\u7ACB\u6EDA\u52A8\uFF1B
              Combined (classic)\uFF08\u5355\u680F\u5408\u4E00\uFF09\uFF1A\u4E0B\u62C9\u4E00\u9875\u5185\u65E2\u6709\u901A\u77E5\u4E5F\u6709\u5FEB\u6377\u8BBE\u7F6E\uFF08\u7ECF\u5178\u5355\u9762\u677F\uFF09\u3002
              \u5207\u6362\u5373\u65F6\u751F\u6548\uFF1B\u957F\u6309\u5FEB\u6377\u8BBE\u7F6E\u9762\u677F\u9F7F\u8F6E\u53EF\u968F\u65F6\u5207\u6362\uFF0C\u4E0E\u6B64\u5904\u540C\u4E00\u5199\u5165\u901A\u9053\u3002
            </div>
          </div>
          <!-- \u2460 general_notifications_category\u300C\u7BA1\u7406\u300D -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u7BA1\u7406</div>
          <!-- all_notifications\uFF08order 10\uFF09\uFF1Afragment ManageApplications\uFF0C
              v11.50 #207 \u4E09\u671F\uFF1AWeb \u7B49\u4EF7 = \u9875 35 \u5E94\u7528\u901A\u77E5\uFF08AppNotificationSettings \u5BF9\u6807\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="app-notifications" onclick="window.pushSubPage && window.pushSubPage(35)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5E94\u7528\u901A\u77E5</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u63A7\u5236\u6765\u81EA\u5404\u4E2A\u5E94\u7528\u7684\u901A\u77E5</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- notification_history\uFF08order 11\uFF09\uFF1A\u52A8\u6001\u6458\u8981 + \u771F\u5B9E\u5386\u53F2\u9762\u677F\uFF08v8.01 \u8D85\u8D8A\u70B9\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="__notifHistoryToggle(this)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5386\u53F2\u901A\u77E5</span><span id="notifHistorySub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
            <span id="notifHistoryChevron" style="color:var(--md-on-surface-variant,#9a9b9e);transition:transform .2s;">\u203A</span>
          </div>
          <div id="notifHistoryPanel" style="display:none;padding:0 8px 4px;">
            <div id="notifHistoryList"></div>
          </div>
          <!-- bundle_notifications_preference\uFF08order 12\uFF09\uFF1ABundlePreferenceController \u95E8\u63A7\u9690\u85CF\u6CE8\u8BB0\uFF08CONDITIONALLY_UNAVAILABLE\uFF09 -->
          <!-- \u2461 conversation_category\u300C\u5BF9\u8BDD\u300D -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u5BF9\u8BDD</div>
          <!-- conversations\uFF08order 1\uFF09\uFF1AConversationListSummaryPreferenceController \u52A8\u6001\u6458\u8981\uFF08\u771F\u5B9E\u6570\u636E\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5BF9\u8BDD</span><span id="notifConvoSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- notification_bubbles\uFF08order 2\uFF09\uFF1ABubbleSummaryNotificationPreferenceController\uFF08Pixel \u5F62\u6001 AVAILABLE\uFF09\uFF0C\u6458\u8981=\u5F00\u542F\u6001 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u6D88\u606F\u6C14\u6CE1</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5DF2\u5F00\u542F/\u5BF9\u8BDD\u80FD\u4EE5\u6D6E\u52A8\u56FE\u6807\u5F62\u5F0F\u663E\u793A</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- \u2462 configure_notifications_lock\u300C\u9690\u79C1\u300D\uFF08lock_screen_notifications_title\uFF09 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u9690\u79C1</div>
          <!-- notification_access\uFF08order 12\uFF09\uFF1ANotificationAccessController=AVAILABLE -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u8BFB\u53D6\u3001\u56DE\u590D\u548C\u63A7\u5236\u901A\u77E5</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u63A7\u5236\u54EA\u4E9B\u5E94\u7528\u548C\u8BBE\u5907\u80FD\u591F\u8BFB\u53D6\u901A\u77E5</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- lock_screen_notifications\uFF08order 13\uFF09\uFF1ARestrictedListPreference \u4E09\u6001\u52A8\u6001\u6458\u8981\uFF0C\u70B9\u51FB\u9009\u62E9 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="__notifLockChoose()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u9501\u5C4F\u901A\u77E5</span><span id="notifLockSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- lock_screen_notifications_page\uFF08order 14\uFF09\uFF1Aflag \u95E8\u63A7\u9690\u85CF\u6CE8\u8BB0\uFF08CONDITIONALLY_UNAVAILABLE\uFF09 -->
          <!-- lock_screen_redact\uFF08order 15\uFF09\uFF1ARestrictedSwitchPreference\uFF0C\u5355\u6E90 allowPrivate -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u654F\u611F\u901A\u77E5</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u9501\u5C4F\u65F6\u663E\u793A\u654F\u611F\u5185\u5BB9</span></span>
            <label class="md3-switch"><input type="checkbox" id="notifRedactToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- lock_screen_work_redact\uFF08order 16\uFF09\uFF1A\u65E0\u5DE5\u4F5C\u8D44\u6599\u95E8\u63A7\u9690\u85CF\u6CE8\u8BB0\uFF08CONDITIONALLY_UNAVAILABLE\uFF09 -->
          <!-- notification_lockscreen_bypass\uFF08order 17\uFF09\uFF1A\u591A\u751F\u7269\u8BC6\u522B UNSUPPORTED_ON_DEVICE \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- \u2463 sync_across_devices\u300C\u5728\u8BBE\u5907\u4E4B\u95F4\u4FDD\u6301\u540C\u6B65\u300D\uFF1ASyncAcrossDevicesPreferenceController
              displayPreference \u9ED8\u8BA4 setVisible(false)\u3001feature provider \u52A8\u6001\u6CE8\u5165\u540E\u624D\u53EF\u89C1
              \uFF08\u624B\u673A\u5F62\u6001\u65E0 provider\uFF09\u2192 \u6574\u7EC4\u9690\u85CF\u6CE8\u8BB0 -->
          <!-- \u2464 advanced_section_header\u300C\u5E38\u89C4\u300D -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u5E38\u89C4</div>
          <!-- polite_notifications_preference\uFF08order 18\uFF09/ zen_mode_notifications\uFF08order 19\uFF09/
              lock_screen_notif_minimalism\uFF08order 20\uFF09/ lock_screen_show_only_unseen_notifs
              \uFF08order 21\uFF09/ flash_notifications_preference\uFF08order 22\uFF09\uFF1Aflag \u95E8\u63A7\u9690\u85CF\u6CE8\u8BB0
              \uFF08CONDITIONALLY_UNAVAILABLE\xD74 + modesUi \u4E00\u81F4\u6027\u88C1\u51B3 UNSUPPORTED_ON_DEVICE\uFF09 -->
          <!-- app_and_notif_cell_broadcast_settings\uFF08order 23\uFF09\uFF1ARestrictedPreference intent cellbroadcastreceiver -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u65E0\u7EBF\u7D27\u6025\u8B66\u62A5</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- silent_icons\uFF08order 24\uFF09\uFF1ASilentStatusBarPreferenceController\uFF08\u975E guest AVAILABLE\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u9690\u85CF\u72B6\u6001\u680F\u4E2D\u7684\u9759\u97F3\u901A\u77E5</span></span>
            <label class="md3-switch"><input type="checkbox" id="notifSilentToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- show_snooze_options\uFF08order 25\uFF09\uFF1ASnoozeNotificationPreferenceController\uFF08AVAILABLE\uFF0C\u9ED8\u8BA4\u5173\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5141\u8BB8\u663E\u793A\u901A\u77E5\u5EF6\u540E\u9009\u9879</span></span>
            <label class="md3-switch"><input type="checkbox" id="notifSnoozeToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- notification_badging\uFF08order 26\uFF09\uFF1ABadgingNotificationPreferenceController\uFF08config_notificationBadging=true\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5E94\u7528\u56FE\u6807\u4E0A\u7684\u901A\u77E5\u5706\u70B9</span></span>
            <label class="md3-switch"><input type="checkbox" id="notifBadgingToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- notification_pulse\uFF08order 27\uFF09\uFF1APulseNotificationPreferenceController \u95E8\u63A7\u9690\u85CF\u6CE8\u8BB0\uFF08UNSUPPORTED_ON_DEVICE\uFF0CPixel 5 \u8D77\u65E0 LED\uFF09 -->
          <!-- notification_assistant\uFF08order 28\uFF09\uFF1ANotificationAssistantPreferenceController\uFF08AVAILABLE\uFF0C\u9ED8\u8BA4\u5F00\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u589E\u5F3A\u578B\u901A\u77E5</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u63A5\u6536\u5EFA\u8BAE\u7684\u64CD\u4F5C\u3001\u56DE\u590D\u7B49\u5185\u5BB9</span></span>
            <label class="md3-switch"><input type="checkbox" id="notifAssistantToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <!-- lock_screen_notifications \u4E09\u9009\u5BF9\u8BDD\u6846\uFF08entries \u7531 LockScreenNotificationPreferenceController
            \u4EE3\u7801\u52A8\u6001\u6CE8\u5165\u7684 Web \u7B49\u4EF7\u7269\uFF1B\u9875\u5185 overlay\uFF0C\u9009\u62E9\u5199\u56DE\u5355\u6E90\u5E76\u8054\u52A8\u6458\u8981\u4E0E\u654F\u611F\u901A\u77E5\u5F00\u5173\uFF09 -->
        <div id="notifLockDialog" style="display:none;position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.4);align-items:center;justify-content:center;padding:24px;">
          <div style="background:var(--md-surface-container-high,#eceff4);border-radius:28px;max-width:360px;width:100%;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.25);">
            <div style="font-size:16px;font-weight:500;padding-bottom:12px;">\u60A8\u5E0C\u671B\u9501\u5B9A\u7684\u5C4F\u5E55\u663E\u793A\u4EC0\u4E48\u5185\u5BB9\uFF1F</div>
            <div class="md3-list-item notif-lock-opt" role="button" tabindex="0" data-opt="show" style="min-height:52px;display:flex;align-items:center;gap:12px;border-radius:16px;cursor:pointer;">
              <span class="notif-opt-dot" style="width:20px;height:20px;flex:none;border-radius:50%;border:2px solid var(--md-primary,#0b57d0);display:inline-flex;align-items:center;justify-content:center;"></span>
              <span style="font-size:15px;">\u663E\u793A\u6240\u6709\u901A\u77E5\u5185\u5BB9</span>
            </div>
            <div class="md3-list-item notif-lock-opt" role="button" tabindex="0" data-opt="hide" style="min-height:52px;display:flex;align-items:center;gap:12px;border-radius:16px;cursor:pointer;">
              <span class="notif-opt-dot" style="width:20px;height:20px;flex:none;border-radius:50%;border:2px solid var(--md-primary,#0b57d0);display:inline-flex;align-items:center;justify-content:center;"></span>
              <span style="font-size:15px;">\u4EC5\u5728\u89E3\u9501\u72B6\u6001\u4E0B\u663E\u793A\u654F\u611F\u5185\u5BB9</span>
            </div>
            <div class="md3-list-item notif-lock-opt" role="button" tabindex="0" data-opt="disable" style="min-height:52px;display:flex;align-items:center;gap:12px;border-radius:16px;cursor:pointer;">
              <span class="notif-opt-dot" style="width:20px;height:20px;flex:none;border-radius:50%;border:2px solid var(--md-primary,#0b57d0);display:inline-flex;align-items:center;justify-content:center;"></span>
              <span style="font-size:15px;">\u5B8C\u5168\u4E0D\u663E\u793A\u901A\u77E5</span>
            </div>
          </div>
        </div>
        <script>`+T+`<\/script>
        <script>
          // v10.37 #220 \u2460\uFF1A\u9762\u677F\u6A21\u5F0F\u8BBE\u7F6E\u9879\uFF08R118 \u5B9E\u4F8B C\uFF09\u3002\u771F\u6E90 = dual-shade.js
          // setShadeMode/getShadeMode\uFF08window.__dualShade \u6865\uFF0C__navBar \u540C\u6B3E\u60EF\u4F8B\uFF09\uFF1B
          // \u5B58\u50A8\u590D\u7528\u65E2\u6709 'android17:shadeMode' \u952E\uFF08#178 \u4E0D\u65B0\u5EFA\u952E\uFF09\uFF1B
          // md3-shade-mode-changed \u4E8B\u4EF6\u53CC\u5411\u540C\u6B65\uFF08Panels \u5F39\u5C42/URL \u53C2\u6570\u6539\u52A8\u5373\u65F6\u56DE\u663E\uFF09\uFF1B
          // radio \u884C\u590D\u7528\u9875 12 uiv-nav-radio \u65E2\u6709\u7EC4\u4EF6\uFF08#227 \u843D\u5730\u540E\u540C\u6E90\u514D\u518D\u6539\uFF09\u3002
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var MODES = [
              { id: 'dual', name: 'Separate', desc: '\u5206\u5BB6\u53CC\u680F' },
              { id: 'classic', name: 'Combined (classic)', desc: '\u5355\u680F\u5408\u4E00' }
            ];
            function curMode() {
              if (window.__dualShade && window.__dualShade.getShadeMode) return window.__dualShade.getShadeMode();
              try { var m = localStorage.getItem('android17:shadeMode'); if (m === 'dual' || m === 'classic') return m; } catch (e) {}
              return 'classic';
            }
            function render() {
              var listEl = document.getElementById('shadeModeList');
              if (!listEl) return;
              var cur = curMode();
              listEl.innerHTML = MODES.map(function(s) {
                var active = s.id === cur;
                return '<label class="uiv-nav-radio-label' + (active ? ' uiv-nav-radio-on' : '') + '" data-shademode-id="' + s.id + '" role="button" tabindex="0" aria-label="\u9762\u677F\u6A21\u5F0F ' + s.name + '">' +
                  '<input class="uiv-nav-radio-input" type="radio" name="shade-mode-panel" value="' + s.id + '"' + (active ? ' checked' : '') + ' />' +
                  '<span class="uiv-nav-radio-text">' + s.name + '</span>' +
                  '</label>';
              }).join('');
            }
            bindDoc('settings', 'click', function(e) {
              var chip = e.target && e.target.closest && e.target.closest('[data-shademode-id]');
              if (chip && chip.isConnected && window.__dualShade && window.__dualShade.setShadeMode) {
                window.__dualShade.setShadeMode(chip.dataset.shademodeId);
                render();
              }
            });
            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && e.target.closest('[data-shademode-id]');
              if (card && card.isConnected) { e.preventDefault(); card.click(); }
            });
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 19) render();
            });
            bindDoc('settings', 'md3-shade-mode-changed', function(e) {
              if (e.detail && e.detail.mode) render();
            });
            render();
          })();
        <\/script>`},{title:"\u65E0\u969C\u788D\u529F\u80FD",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u65E0\u969C\u788D\u529F\u80FD</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u663E\u793A\u3001\u4E92\u52A8\u3001\u97F3\u9891\uFF08AOSP AccessibilitySettings\uFF09</div>
          <!-- \u2460 user_installed_services_category\u300C\u5DF2\u4E0B\u8F7D\u7684\u5E94\u7528\u300D\uFF1A0 \u670D\u52A1\u6574\u533A\u79FB\u9664\uFF08updateServicePreferences
              getPreferenceCount()==0 \u2192 removePreference\uFF09\u2192 \u6574\u533A\u9690\u85CF\u6CE8\u8BB0 -->
          <!-- \u2461 screen_reader_category\u300C\u5C4F\u5E55\u9605\u8BFB\u5668\u300D\uFF1Aconfig_preinstalled_screen_reader_services
              \u7A7A\u6570\u7EC4\uFF08res/values/config.xml \u4EC5\u6CE8\u91CA\u793A\u4F8B\uFF09+ updatePreferenceCategoryVisibility \u7A7A\u533A\u9690\u85CF
              \u2192 \u6574\u533A\u9690\u85CF\u6CE8\u8BB0 -->
          <!-- \u2462 display_category\u300C\u663E\u793A\u300D -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u663E\u793A</div>
          <!-- text_reading_options\uFF08order 1\uFF09\uFF1ATextReadingFragmentForA11ySettingsController\uFF08\u57FA\u7C7B AVAILABLE\uFF09
              v11.50 #105 \u4E00\u671F\u8F6C\u771F\u5B50\u9875\uFF08\u9875 33\uFF09\uFF1A\u5B57\u4F53\u5927\u5C0F/\u663E\u793A\u5927\u5C0F/\u7C97\u4F53/\u9AD8\u5BF9\u6BD4\u5EA6 \u56DB\u771F\u5B9E\u80FD\u529B -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="__tpNav(this,33)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yTextReading||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u663E\u793A\u5927\u5C0F\u548C\u6587\u5B57</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- accessibility_color_and_motion\uFF08order 2\uFF09\uFF1A\u65E0 controller
              v11.50 #105 \u4E00\u671F\u8F6C\u771F\u5B50\u9875\uFF08\u9875 32\uFF09\uFF1A\u989C\u8272\u53CD\u8F6C/\u79FB\u9664\u52A8\u753B \u771F\u5B9E\u73B0 + \u8272\u5F69\u6821\u6B63\u5B50\u9875\u5165\u53E3 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="__tpNav(this,32)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yColorMotion||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u8272\u5F69\u548C\u52A8\u753B</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- reduce_bright_colors_preference\uFF08order 3\uFF09\uFF1APrimarySwitchPreference\uFF0C
              ReduceBrightColorsPreferenceController\uFF08evenDimmer&&config=false \u2192 \u8DF3\u8FC7\u53D6\u4EE3\u5224\u65AD \u2192
              isReduceBrightColorsAvailable \u2192 AVAILABLE\uFF09\uFF1B\u8D85\u8D8A\u70B9 = CSS filter \u771F\u5B9E\u73B0 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yDim||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u6781\u6697</span></span>
            <label class="md3-switch"><input type="checkbox" id="a11yRbcToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- even_dimmer_activated\uFF08order 4\uFF09\uFF1AEvenDimmerPreferenceController \u95E8\u63A7\u9690\u85CF\u6CE8\u8BB0
              \uFF08Flags.evenDimmer \u65E0 default=false && config_evenDimmerEnabled=false \u2192
              UNSUPPORTED_ON_DEVICE\uFF1B\u300CSuccessor to this feature is Even Dimmer\u300DRBC \u53D6\u4EE3\u8BED\u4E49\uFF0C
              \u4E8C\u8005\u53D6\u5176\u4E00\u672C\u5F62\u6001\u53D6 RBC\uFF09 -->
          <!-- magnification_preference_screen\uFF08order 5\uFF09\uFF1AMagnificationPreferenceController\uFF08AVAILABLE\uFF09\uFF0C
              \u52A8\u6001\u6458\u8981 getServiceSummary \u9ED8\u8BA4\u300C\u5DF2\u5173\u95ED/\u653E\u5927\u5C4F\u5E55\u4E0A\u7684\u5185\u5BB9\u300D\uFF1B\u5FBD\u7AE0\u7279\u4F8B\u8272 #F50D60 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#F50D60;color:#FFFFFF;border-radius:27%;">${e.a11yMagnify||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u653E\u5927\u529F\u80FD</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5DF2\u5173\u95ED/\u653E\u5927\u5C4F\u5E55\u4E0A\u7684\u5185\u5BB9</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- \u2463 interaction_control_category\u300C\u4E92\u52A8\u63A7\u5236\u300D -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u4E92\u52A8\u63A7\u5236</div>
          <!-- tap_assistance_preference_screen\uFF08order 6\uFF09\uFF1A\u65E0 controller -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yTap||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5B9A\u65F6\u63A7\u5236</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- system_controls_preference_screen\uFF08order 7\uFF09\uFF1A\u65E0 controller -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11ySysControls||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u7CFB\u7EDF\u63A7\u5236</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- vibration_preference_screen\uFF08order 8\uFF09\uFF1AVibrationPreferenceController\uFF08hasVibrator \u2192
              AVAILABLE\uFF09\uFF0C\u52A8\u6001\u6458\u8981 getSummary VIBRATE_ON \u9ED8\u8BA4\u5F00 \u2192 state_on\u300C\u5DF2\u5F00\u542F\u300D -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yVibration||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u632F\u52A8\u548C\u89E6\u611F\u53CD\u9988</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5DF2\u5F00\u542F</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- pointer_and_touchpad\uFF08order 9\uFF09\uFF1APointerTouchpadPreferenceController\uFF08touchpad||mouse \u2192
              \u684C\u9762\u6D4F\u89C8\u5668\u6307\u9488\u8BBE\u5907\u6052\u5728 \u2192 AVAILABLE\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yPointer||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u6307\u9488\u548C\u89E6\u63A7\u677F\u65E0\u969C\u788D\u529F\u80FD</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u6307\u9488\u989C\u8272\u3001\u6307\u9488\u5927\u5C0F\u7B49</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- physical_keyboard_a11y\uFF08order 10\uFF09\uFF1APhysicalKeyboardA11yPreferenceController \u95E8\u63A7\u9690\u85CF\u6CE8\u8BB0
              \uFF08flag keyboardAndTouchpadA11yNewPageEnabled && isAnyHardKeyboardsExist\u2014\u2014\u65E0\u5B9E\u4F53\u5168\u952E\u76D8
              \u2192 CONDITIONALLY_UNAVAILABLE\uFF0C\u624B\u673A\u5F62\u6001\u9ED8\u8BA4\u65E0\uFF09 -->
          <!-- \u2464 captions_category\u300C\u5B57\u5E55\u300D -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u5B57\u5E55</div>
          <!-- live_caption\uFF08order 11\uFF09\uFF1ALiveCaptionPreferenceController\uFF08LIVE_CAPTION intent \u53EF\u89E3\u6790\uFF0C
              Pixel \u5F62\u6001 AVAILABLE\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yLiveCaption||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5B9E\u65F6\u5B57\u5E55</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u81EA\u52A8\u751F\u6210\u5A92\u4F53\u5B57\u5E55</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- captioning_preference_screen\uFF08order 12\uFF09\uFF1ACaptioningPreferenceController\uFF08AVAILABLE\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yCaptioning||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5B57\u5E55\u504F\u597D\u8BBE\u7F6E</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- rtt_setting\uFF08order 13\uFF09\uFF1ARTTSettingPreferenceController \u95E8\u63A7\u9690\u85CF\u6CE8\u8BB0
              \uFF08isDefaultDialerSupportedRTT\uFF1A\u9ED8\u8BA4\u62E8\u53F7\u5668\u9700\u652F\u6301 RTT\uFF0CWeb \u65E0\u7535\u8BDD\u6808 \u2192
              UNSUPPORTED_ON_DEVICE\uFF1Bzh-rCN \u6807\u9898\u6743\u5A01\u7A7A\u4E32+\u52A8\u6001\u6807\u9898\u6CE8\u8BB0\uFF09 -->
          <!-- \u2465 audio_category\u300C\u97F3\u9891\u300D -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u97F3\u9891</div>
          <!-- toggle_audio_description\uFF08order 14\uFF09\uFF1AAudioDescriptionPreferenceController\uFF08AVAILABLE\uFF09\uFF0C
              SwitchPreferenceCompat persistent=false \u9ED8\u8BA4\u5173 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yAudioDesc||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u8BED\u97F3\u63CF\u8FF0</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u4EE5\u8BED\u97F3\u7684\u5F62\u5F0F\u63CF\u8FF0\u5F53\u524D\u753B\u9762\u5448\u73B0\u7684\u5185\u5BB9\uFF08\u4EC5\u9650\u652F\u6301\u8BE5\u8BBE\u7F6E\u7684\u7535\u5F71\u6216\u7535\u89C6\u8282\u76EE\uFF09</span></span>
            <label class="md3-switch"><input type="checkbox" id="a11yAudioDescToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- flash_notifications_preference_accessibility\uFF08order 15\uFF09\uFF1AFlashNotificationsPreferenceController
              \u95E8\u63A7\u9690\u85CF\u6CE8\u8BB0\uFF08\u540C v8.01 \u5B9E\u8BC1\uFF1AFeatureFlagUtils SETTINGS_FLASH_NOTIFICATIONS \u65E0\u952E \u2192 false
              \u2192 CONDITIONALLY_UNAVAILABLE\uFF09 -->
          <!-- hearing_aid_preference\uFF08order 16\uFF09\uFF1AAccessibilityHearingAidPreferenceController
              \uFF08isHearingAidSupported\uFF1ABT \u6808\u652F\u6301 \u2192 AVAILABLE\uFF09\uFF0C\u6458\u8981 = \u672A\u8FDE\u63A5\u6001 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yHearingAid||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u52A9\u542C\u88C5\u7F6E</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u672A\u8FDE\u63A5\u4EFB\u4F55\u52A9\u542C\u88C5\u7F6E</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- audio_adjustment_preference_screen\uFF08order 17\uFF09\uFF1A\u65E0 controller -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yAudioAdjust||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u97F3\u9891\u8C03\u6574</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- \u2466 speech_category\u300C\u8BED\u97F3\u300D\uFF1Aconfig_preinstalled_speech_services \u7A7A\u6570\u7EC4 +
              updatePreferenceCategoryVisibility \u7A7A\u533A\u9690\u85CF \u2192 \u6574\u533A\u9690\u85CF\u6CE8\u8BB0 -->
          <!-- \u2467 general_category\u300C\u5E38\u89C4\u300D\uFF08XML \u65E0 key\uFF09 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u5E38\u89C4</div>
          <!-- accessibility_shortcuts_preference_screen\uFF08order 18\uFF09\uFF1A\u65E0 controller\uFF0C
              XML \u65E0 android:icon \u5FE0\u5B9E\u65E0\u56FE\u6807 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u65E0\u969C\u788D\u5FEB\u6377\u65B9\u5F0F</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- tts_settings_preference\uFF08order 19\uFF09\uFF1ATtsPreferenceController\uFF08\u5F15\u64CE\u975E\u7A7A &&
              config_show_tts_settings_summary=true \u2192 AVAILABLE\uFF0CWeb speechSynthesis \u7B49\u4EF7\uFF09\uFF0C
              \u6807\u9898 = SettingsLib zh-rCN\u300C\u6587\u5B57\u8F6C\u8BED\u97F3\u8F93\u51FA\u300D\uFF0CXML \u65E0 android:icon -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u6587\u5B57\u8F6C\u8BED\u97F3\u8F93\u51FA</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
        </div>
        <script>`+B+"<\/script>"},{title:"\u5173\u4E8E\u624B\u673A",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u5173\u4E8E\u624B\u673A</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u8BBE\u5907\u4FE1\u606F\uFF08AOSP my_device_info\uFF0C\u6D4F\u89C8\u5668 API \u586B\u5145\uFF09</div>
          <!-- my_device_info_header\uFF08LayoutPreference settings_entity_header\uFF09\uFF1AisPreferenceVisible=false \u9ED8\u8BA4\u9690\u85CF\u6CE8\u8BB0 -->
          <!-- \u2460 basic_info_category\u300C\u57FA\u672C\u4FE1\u606F\u300D\uFF08my_device_info_basic_info_category_title \u6743\u5A01\u503C\uFF09 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u57FA\u672C\u4FE1\u606F</div>
          <!-- device_name\uFF08order 1\uFF09\uFF1AValidatedEditTextPreference + DeviceNamePreferenceController\uFF1B
              \u7F16\u8F91 = prompt \u7B49\u4EF7\uFF08dialog \u8BED\u4E49\u6620\u5C04\uFF09\uFF1BlocalStorage ios-desktop:device-name \u6301\u4E45\u5316\uFF1B
              \u9ED8\u8BA4 = \u578B\u53F7\u6D3E\u751F\uFF08AOSP \u9ED8\u8BA4 device_name=model \u540C\u6784\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__aboutV826 && window.__aboutV826.renameDevice()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u8BBE\u5907\u540D\u79F0</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutDeviceName"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- branded_account\uFF08order 2\uFF09\uFF1ABrandedAccountPreferenceController \u2014\u2014 \u975E branded device
              \uFF08Google \u6807\u8BC6\u8BBE\u5907\uFF09\u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- phone_number\uFF08order 3\uFF09\uFF1Aconfig_show_sim_info=false\uFF08Web \u65E0 SIM \u6808\uFF09\u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- \u2461 legal_category\u300C\u6CD5\u5F8B\u6CD5\u89C4\u300D\uFF08my_device_info_legal_category_title \u6743\u5A01\u503C\uFF09 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u6CD5\u5F8B\u6CD5\u89C4</div>
          <!-- legal_container\uFF08order 15\uFF09\uFF1ALegalSettings fragment \u2192 Web \u7B49\u4EF7 toast\uFF08\u672C\u5730\u65E0\u6587\u6863\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__aboutV826 && window.__aboutV826.showLegal()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u6CD5\u5F8B\u4FE1\u606F</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- regulatory_info\uFF08order 16\uFF09\uFF1Aintent SHOW_REGULATORY_INFO \u65E0\u89E3\u6790\uFF08\u65E0\u76D1\u7BA1\u56FE\u8D44\u6E90\uFF09\u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- safety_info\uFF08order 17\uFF09\uFF1A\u65E0\u5185\u5BB9\u6E90 \u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- \u2462 device_detail_category\u300C\u8BBE\u5907\u8BE6\u7EC6\u4FE1\u606F\u300D\uFF08\u6743\u5A01\u503C\uFF09 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u8BBE\u5907\u8BE6\u7EC6\u4FE1\u606F</div>
          <!-- sim_status\uFF08order 18\uFF09/ eid_info\uFF0831\uFF09/ imei_info\uFF0832\uFF09\uFF1Aconfig_show_sim_info=false
              \uFF08Web \u65E0\u7535\u8BDD\u6808\uFF0Cv8.01 SIM \u95E8\u63A7\u88C1\u51B3\u540C\u5F8B\uFF09\u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- device_model\uFF08order 30\uFF09\uFF1Amodel_info\u300C\u578B\u53F7\u300Dzh-rCN \u6743\u5A01\u503C\uFF1Bfragment=HardwareInfoFragment
              \u2192 \u9875 22\uFF1B\u6458\u8981 = UA-CH model \u2192 platform \u964D\u7EA7 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(22)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u578B\u53F7</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutModelSub"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- firmware_version\uFF08order 42\uFF09\uFF1Afragment=FirmwareVersionSettings \u2192 \u9875 23\uFF1B
              \u6458\u8981 = Android \u7248\u672C\u8868\u8FF0\uFF08platformVersion \u6620\u5C04\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(23)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Android \u7248\u672C</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutOsSub"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- battery_info\uFF08order 43\uFF09\uFF1ABatteryInfoFragment \u2192 Web \u7B49\u4EF7=\u7535\u6C60\u5B50\u9875\uFF08\u9875 2\uFF09\uFF1B
              \u6458\u8981 = battery-service \u5355\u4E00\u771F\u6E90\u4EEA\u8868\u76D8\u6807\u7B7E\uFF08v8.06 getDashboardLabel \u540C\u6784\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(2)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u7535\u6C60\u4FE1\u606F</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutBatterySub"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- \u2463 device_identifiers_category\u300C\u8BBE\u5907\u6807\u8BC6\u7B26\u300D\uFF08\u6743\u5A01\u503C\uFF09 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u8BBE\u5907\u6807\u8BC6\u7B26</div>
          <!-- wifi_ip_address\uFF08order 44\uFF09\uFF1AWebRTC host candidate\uFF08iceServers \u7A7A \u2192 \u4E0D\u5916\u4F20\uFF09\uFF1B
              mDNS/.local = \u6D4F\u89C8\u5668\u771F\u5B9E\u8F93\u51FA\uFF1B\u8D85\u65F6\u964D\u7EA7 device_info_default\u300C\u672A\u77E5\u300D -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">IP \u5730\u5740</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutIpSub"></span></span>
          </div>
          <!-- saved_accesspoints_wifi_mac_address\uFF0845\uFF09/ wifi_mac_address\uFF0846\uFF09/ bt_address\uFF0847\uFF09\uFF1A
              Web \u65E0 MAC \u6808 \u2192 \u9690\u85CF\u6CE8\u8BB0\uFF08AOSP select \u8BE5\u884C\u65F6\u82E5\u503C\u4E3A\u7A7A\u540C\u6837\u663E\u793A\u4E0D\u53EF\u7528\u8BED\u4E49\uFF09 -->
          <!-- up_time\uFF08order 48\uFF09\uFF1AformatElapsed zh \u8BED\u4E49\uFF1BWeb \u6620\u5C04 = \u9875\u9762\u4F1A\u8BDD\u65F6\u957F
              \uFF08performance.now\uFF1B\u5F00\u673A\u65F6\u957F Web \u57DF\u4E0D\u53EF\u5F97\uFF0C\u6CE8\u8BB0\u4FDD\u7559 AOSP \u8BED\u4E49\u5DEE\u5F02\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u6B63\u5E38\u8FD0\u884C\u65F6\u95F4</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutUptimeSub"></span></span>
          </div>
          <!-- manual\uFF0850\uFF09\uFF1Aintent SHOW_MANUAL \u65E0\u89E3\u6790 \u2192 \u9690\u85CF\u6CE8\u8BB0\uFF1Bdevice_feedback\uFF0851\uFF09\uFF1A
              \u65E0\u53CD\u9988\u901A\u9053 \u2192 \u9690\u85CF\u6CE8\u8BB0\uFF1Bfcc_equipment_id\uFF0852\uFF09\uFF1A\u65E0 FCC \u6807\u8BC6 \u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- build_number\uFF08order 53\uFF09\uFF1ABuildNumberPreferenceController \u8FDE\u70B9\u94FE
              TAPS_TO_BECOME_DEVELOPER=7 \u2192 \u5F00\u53D1\u8005\u6A21\u5F0F\uFF08show_dev_countdown/on/already \u6743\u5A01\u6587\u6848\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__aboutV826 && window.__aboutV826.onBuildTap()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Build \u53F7</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutBuildSub"></span></span>
          </div>
        </div>
        <script>`+f+"<\/script>"},{title:"\u578B\u53F7",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u578B\u53F7</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u578B\u53F7\u4E0E\u786C\u4EF6\u4FE1\u606F\uFF08AOSP hardware_info\uFF0C\u6D4F\u89C8\u5668 API \u586B\u5145\uFF09</div>
          <!-- hardware_info_device_model\uFF1ADeviceModelPreferenceController.getSummary =
              getDeviceModel() \u2192 Web = UA-CH model\uFF08Android \u771F\u673A\u771F\u5B9E\u578B\u53F7\uFF09\u2192 platform \u964D\u7EA7 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u578B\u53F7</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwModel"></span></span>
          </div>
          <!-- hardware_info_device_serial\uFF1Aconfig_show_device_model \u95E8\u63A7 + Build.getSerial
              \u65E0 Web API \u2192 \u9690\u85CF\u6CE8\u8BB0\uFF1Bhardware_info_device_revision\uFF1A
              ro.boot.hardware.revision \u7A7A \u2192 UNSUPPORTED_ON_DEVICE \u540C\u6784 \u2192 \u9690\u85CF\u6CE8\u8BB0\uFF1B
              hardware_info_manufactured_year\uFF1A\u65E0\u5236\u9020\u4FE1\u606F\u6E90 \u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- \u300C\u6D4F\u89C8\u5668\u8BBE\u5907\u4FE1\u606F\u300D\u6269\u5C55\u5206\u533A\uFF08#48 \u8BAE\u9898\u660E\u793A\u8D85\u8D8A\u70B9\uFF1AAOSP hardware_info.xml \u65E0\u6B64\u5206\u533A\uFF0C
              \u6D4F\u89C8\u5668 API \u786C\u4EF6\u63A2\u6D4B\u96C6\u4E2D\u5448\u73B0\uFF1B\u540C v8.02 RBC \u8D85\u8D8A\u70B9\u6CE8\u8BB0\u7EAA\u5F8B\uFF09 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u6D4F\u89C8\u5668\u8BBE\u5907\u4FE1\u606F</div>
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5C4F\u5E55</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwScreen"></span></span>
          </div>
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5904\u7406\u5668\u6838\u5FC3</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwCores"></span></span>
          </div>
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5185\u5B58</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwMemory"></span></span>
          </div>
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u6D4F\u89C8\u5668\u4E0E\u6E32\u67D3\u5F15\u64CE</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwEngine"></span></span>
          </div>
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u8BED\u8A00\u4E0E\u65F6\u533A</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwLocale"></span></span>
          </div>
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5B58\u50A8</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwStorage"></span></span>
          </div>
        </div>
        <script>`+f+"<\/script>"},{title:"Android \u7248\u672C",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">Android \u7248\u672C</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u8F6F\u4EF6\u7248\u672C\u4FE1\u606F\uFF08AOSP firmware_version\uFF0C\u6D4F\u89C8\u5668 API \u586B\u5145\uFF09</div>
          <!-- os_firmware_version\uFF1AFirmwareVersionDetailPreferenceController\uFF08summary =
              Build.VERSION.RELEASE\uFF09\u2192 Web = platformVersion \u4E3B\u7248\u672C\u53F7 / \u5E73\u53F0\u540D -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Android \u7248\u672C</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutOsVer"></span></span>
          </div>
          <!-- security_key\uFF1ASecurityPatchLevelPreferenceController \u2192 \u4F2A\u88C5\u786E\u5B9A\u6027\u65E5\u671F
              \uFF08#48 \u8BAE\u9898\u660E\u793A\u4F2A\u88C5\u8BB8\u53EF\uFF1B\u540C\u4E00\u8BBE\u5907\u6570\u636E\u6052\u751F\u6210\u540C\u4E00\u503C\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Android \u5B89\u5168\u66F4\u65B0</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutPatch"></span></span>
          </div>
          <!-- module_version\uFF1AMainlineModuleVersionPreferenceController \u2192 Web =
              fullVersionList Chrome \u5B8C\u6574\u7248\uFF08\u771F\u5B9E\u503C\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Google Play \u7CFB\u7EDF\u66F4\u65B0</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutModule"></span></span>
          </div>
          <!-- base_band\uFF1ABasebandVersionPreferenceController \u2014\u2014 Web \u65E0\u8C03\u5236\u89E3\u8C03\u5668 \u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- kernel_version\uFF1AKernelVersionPreferenceController \u2192 \u4F2A\u88C5\u786E\u5B9A\u6027
              '5.15.NN-androidMAJ-N-gHEX12'\uFF08#48 \u8BAE\u9898\u660E\u793A\u4F2A\u88C5\u8BB8\u53EF\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5185\u6838\u7248\u672C</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutKernel"></span></span>
          </div>
          <!-- os_build_number\uFF1ASimpleBuildNumberPreferenceController \u2192 \u540C\u9875 21 build \u53F7\u4F2A\u88C5\u503C
              \uFF08\u786E\u5B9A\u6027\uFF1AseedOf \u4E00\u81F4 \u2192 \u4E24\u9875\u6570\u503C\u5FC5\u7136\u4E00\u81F4\uFF0CE2E \u65AD\u8A00\u951A\u5B9A\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Build \u53F7</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutBuild2"></span></span>
          </div>
        </div>
        <script>`+f+"<\/script>"},{title:"\u4F4D\u7F6E\u4FE1\u606F",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u4F4D\u7F6E\u4FE1\u606F</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u8FD1\u671F\u8BBF\u95EE\u3001\u6743\u9650\u4E0E\u670D\u52A1\uFF08AOSP location_settings\uFF0C\u6D4F\u89C8\u5668 API \u9002\u914D\uFF09</div>
          <!-- \u9875\u9876\u603B\u5F00\u5173\uFF1ASettingsMainSwitchBar\uFF08LocationSettings.onActivityCreated \u5B9E\u8BC1\u2014\u2014\u4E0D\u5728
              location_settings.xml \u5185\uFF1Blocation_settings_primary_switch_title\u300C\u4F7F\u7528\u4F4D\u7F6E\u4FE1\u606F\u300D\u6743\u5A01\u503C\uFF09\u3002
              Web \u771F\u6E90 = \u8BBE\u7F6E\u6001\uFF08localStorage settings:location-v1\uFF1Bgeolocation API \u5355\u5411\u4E0D\u53EF\u7A0B\u5E8F\u5316
              \u8BFB\u5199\u5168\u5C40\u5F00\u5173\uFF0Cv8.01 SIM \u88C1\u51B3\u540C\u5F8B\uFF09\uFF0C\u9ED8\u8BA4 true=AOSP \u51FA\u5382\u9ED8\u8BA4\u5F00 -->
          <div style="display:flex;align-items:center;gap:16px;min-height:56px;padding:8px 16px;margin:0 4px;border-radius:20px;background:var(--md-surface-variant,#eef0f4);">
            <span style="flex:1;font-size:15px;font-weight:500;">\u4F7F\u7528\u4F4D\u7F6E\u4FE1\u606F</span>
            <label class="md3-switch"><input type="checkbox" id="locMainSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- \u2460 recent_location_access \u5206\u533A\u300C\u8FD1\u671F\u4F4D\u7F6E\u4FE1\u606F\u8BBF\u95EE\u300D\uFF08location_category_recent_location_access
              \u6743\u5A01\u503C\uFF09\uFF1BRecentLocationAccessPreferenceController \u52A8\u6001\u884C\uFF08icon+\u5E94\u7528\u540D+\u76F8\u5BF9\u65F6\u95F4\u6458\u8981
              LONG\uFF0CMAX_APPS=3 \u5B9E\u8BC1\u9010\u5B57\uFF09\uFF1B\u4F4D\u7F6E\u5173\u95ED\u65F6\u6574\u7EC4\u9690\u85CF\uFF08onLocationModeChanged \u2192
              setVisible(enabled) \u540C\u6784\uFF09\uFF1BWeb \u865A\u6784\u65F6\u95F4\u7EBF\u56FA\u5B9A seed \u786E\u5B9A\u6027 6 \u9879\uFF08AppOps \u65E0 Web \u5BF9\u5E94 API\uFF09 -->
          <div id="locRecentGroup">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u8FD1\u671F\u4F4D\u7F6E\u4FE1\u606F\u8BBF\u95EE</div>
            <div id="locRecentMain"></div>
            <!-- \u7A7A\u6001 banner\uFF1Alocation_no_recent_accesses\u300C\u6700\u8FD1\u6CA1\u6709\u4EFB\u4F55\u5E94\u7528\u8BBF\u95EE\u4F4D\u7F6E\u4FE1\u606F\u300D\uFF08AOSP
                RecentLocationAccessPreferenceController L157 \u5B8C\u6574\u8BED\u4E49\u4FDD\u7559\uFF1B\u865A\u6784\u6570\u636E\u6052\u975E\u7A7A \u2192
                \u8FD0\u884C\u65F6\u4E0D\u663E\u793A\uFF0C\u9759\u6001 HTML \u6052\u7A7A\u6E32\u67D3\uFF09 -->
            <div id="locRecentEmpty" style="min-height:64px;display:none;align-items:center;padding:0 12px;font-size:15px;color:var(--md-on-surface-variant,#9a9b9e);">\u6700\u8FD1\u6CA1\u6709\u4EFB\u4F55\u5E94\u7528\u8BBF\u95EE\u4F4D\u7F6E\u4FE1\u606F</div>
            <!-- recent_location_access_see_all_button\u300C\u67E5\u770B\u5168\u90E8\u300D\uFF1Afragment=
                RecentLocationAccessSeeAllFragment \u2192 \u9875 25\uFF1Bsearchable=false \u540C\u6784 -->
            <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(25)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
              <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u67E5\u770B\u5168\u90E8</span></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
            </div>
          </div>
          <!-- \u2461 location_advanced_settings \u5206\u533A\uFF08no_label\uFF09 -->
          <!-- managed_profile_location_switch\u300C\u5DE5\u4F5C\u8D44\u6599\u4F4D\u7F6E\u4FE1\u606F\u300D\uFF1ARestrictedSwitchPreference
              enabled=false + \u65E0 managed profile \u79FB\u9664\uFF08XML L42 \u6CE8\u91CA\uFF09\u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- private_profile_location_switch\u300C\u79C1\u5BC6\u7A7A\u95F4\u7684\u4F4D\u7F6E\u300D\uFF1AA17 Private Profile \u65B0\u9879\uFF0C
              \u65E0 private profile \u79FB\u9664\uFF08XML L52 \u6CE8\u91CA\uFF09\u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- app_level_permissions\u300C\u5E94\u7528\u4F4D\u7F6E\u4FE1\u606F\u6743\u9650\u300D\uFF08AppLocationPermissionPreferenceController\uFF09\uFF1A
              \u6458\u8981\u52A8\u6001 = \u5F00\u300CN \u4E2A\u5E94\u7528\uFF08\u5171 M \u4E2A\u5E94\u7528\uFF09\u6709\u6743\u83B7\u53D6\u4F4D\u7F6E\u4FE1\u606F\u300D\uFF08plural other \u5F62\u6001\u63D2\u503C\uFF0C
              has=\u65F6\u95F4\u7EBF\u957F\u5EA6\u81EA\u6D3D/total=\u865A\u6784 32 \u6052\u5B9A\uFF09/\u5173\u300C\u4F4D\u7F6E\u4FE1\u606F\u670D\u52A1\u5DF2\u5173\u95ED\u300D -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">\u6743\u9650</div>
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5E94\u7528\u4F4D\u7F6E\u4FE1\u606F\u6743\u9650</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="locAppPermSum"></span></span>
          </div>
          <!-- location_services\uFF08order\uFF09\uFF1Afragment=LocationServices \u2192 \u9875 26\uFF1B
              title=location_services_preference_title\u300C\u4F4D\u7F6E\u4FE1\u606F\u670D\u52A1\u300D\u6743\u5A01\u503C -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(26)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u4F4D\u7F6E\u4FE1\u606F\u670D\u52A1</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
        </div>
        <!-- location_footer\uFF08FooterPreference\uFF09\uFF1ALocationSettingsFooterPreferenceController \u53CC\u5F62\u6001
            \u52A8\u6001\u2014\u2014\u5F00=location_settings_footer_general/\u5173=location_settings_footer_location_off
            \uFF08\u7D27\u6025\u547C\u53EB\u4F8B\u5916\u8BED\u4E49\u9010\u5B57\uFF09 -->
        <div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:16px 16px 24px;line-height:1.5;" id="locFooter"></div>
        <script>`+x+"<\/script>"},{title:"\u8FD1\u671F\u4F4D\u7F6E\u4FE1\u606F\u8BBF\u95EE",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u8FD1\u671F\u4F4D\u7F6E\u4FE1\u606F\u8BBF\u95EE</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u8FD1\u671F\u8BBF\u95EE\u8FC7\u4F4D\u7F6E\u4FE1\u606F\u7684\u5E94\u7528\uFF08AOSP RecentLocationAccessSeeAllFragment\uFF0C\u5168\u91CF\u5217\u8868\uFF09</div>
          <!-- \u9875 25 =\u300C\u67E5\u770B\u5168\u90E8\u300D\u76EE\u6807\uFF08RecentLocationAccessSeeAllFragment \u540C\u6784\uFF09\uFF1A\u540C\u6570\u636E\u6E90
              \u5168\u91CF\u6E32\u67D3\uFF08\u65E0 MAX_APPS \u622A\u65AD\uFF09\uFF0C\u884C\u5F62\u6001\u4E0E\u9875 24 \u52A8\u6001\u884C\u540C\u6784\uFF08icon+\u5E94\u7528\u540D+\u76F8\u5BF9\u65F6\u95F4\uFF09 -->
          <div id="locRecentAll"></div>
        </div>
        <script>`+x+"<\/script>"},{title:"\u4F4D\u7F6E\u4FE1\u606F\u670D\u52A1",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u4F4D\u7F6E\u4FE1\u606F\u670D\u52A1</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u626B\u63CF\u670D\u52A1\u5F00\u5173\uFF08AOSP location_services\uFF0CSettingInjectorService \u6CE8\u5165\uFF09</div>
          <!-- \u9875 26 = res/xml/location_services.xml 1:1\uFF1Atitle=location_services_screen_title
              \u6743\u5A01\u503C\uFF1B\u4E24\u884C SettingInjectorService \u6CE8\u5165\u5F62\u6001\uFF08framework \u4FA7\u72EC\u7ACB\u4E8E\u9875\u9762\u603B\u5F00\u5173\u5E38\u663E\uFF09\uFF1B
              scan always \u771F\u6E90 = Settings.Secure\uFF08Web \u65E0\u5BF9\u5E94 API \u2192 \u8BBE\u7F6E\u6001\u771F\u6E90\u540C\u603B\u5F00\u5173\u5F8B\uFF09 -->
          <!-- location_services_wifi_scanning\u300CWLAN \u626B\u63CF\u300D\uFF1A
              location_scanning_wifi_always_scanning_title \u6743\u5A01\u503C -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">WLAN \u626B\u63CF</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5141\u8BB8\u5E94\u7528\u626B\u63CF WLAN \u7F51\u7EDC\u4EE5\u63D0\u9AD8\u4F4D\u7F6E\u4FE1\u606F\u51C6\u786E\u5EA6</span></span>
            <label class="md3-switch"><input type="checkbox" id="locWifiScan"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- location_services_bluetooth_scanning\u300C\u84DD\u7259\u626B\u63CF\u300D\uFF1A
              location_scanning_bluetooth_always_scanning_title \u6743\u5A01\u503C -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u84DD\u7259\u626B\u63CF</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5141\u8BB8\u5E94\u7528\u626B\u63CF\u84DD\u7259\u8BBE\u5907\u4EE5\u63D0\u9AD8\u4F4D\u7F6E\u4FE1\u606F\u51C6\u786E\u5EA6</span></span>
            <label class="md3-switch"><input type="checkbox" id="locBtScan"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <script>`+x+"<\/script>"},{title:"\u6A21\u5F0F",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u6A21\u5F0F</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u52FF\u6270\u4E0E\u4E13\u6CE8\u6A21\u5F0F\uFF08AOSP modes_list_settings\uFF0C\u6781\u7B80\u58F3 1:1\uFF09</div>
          <!-- TopIntroPreference\uFF1Azen_modes_list_intro \u6743\u5A01\u503C -->
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:4px 12px 12px;line-height:1.6;">\u5229\u7528\u9002\u5408\u7761\u7720\u3001\u5DE5\u4F5C\u3001\u9A7E\u8F66\u7B49\u573A\u666F\u7684\u5404\u79CD\u6A21\u5F0F\uFF0C\u51CF\u5C11\u5E72\u6270\u3001\u4FDD\u6301\u4E13\u6CE8\u3002</div>
          <!-- zen_modes_list \u5206\u533A\uFF08ZenModesListPreferenceController \u52A8\u6001\u751F\u6210\uFF1BAOSP \u7EAF\u51C0\u51FA\u5382 =
              \u4EC5 Manual DND\u300C\u52FF\u6270\u300D\u4E00\u884C\u2014\u2014ZenModesBackend.getModes() \u9996\u9879\u6052\u5728 + \u81EA\u52A8\u89C4\u5219\u51FA\u5382\u4E3A\u7A7A\uFF09\uFF1A
              \u884C\u5F62\u6001 = ZenModesListItemPreference.setZenMode\uFF08title=\u6A21\u5F0F\u540D + summary=getStatusText
              \u56DB\u6001\uFF1Bicon \u968F\u6FC0\u6D3B\u6001 accent tint\u2014\u2014\u52FF\u6270\u6FC0\u6D3B\u65F6\u56FE\u6807 accent \u8272\u8BED\u4E49\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(9)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:var(--md-primary,#0b57d0);">${e.topModes||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u52FF\u6270</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="modesDndSummary"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- \u52FF\u6270\u884C\u8DF3\u8F6C\u6CE8\u8BB0\uFF1AAOSP ZenModeFragment \u8BE6\u60C5\u9875\u6392\u540E\u7EED\u8F6C\u6B63\uFF1BWeb \u7B49\u4EF7 = \u9875 9\u300C\u591A\u6A21\u5F0F\u300D
              \uFF08v7.98 \u53CC\u6A21\u5F0F\u573A\u666F\u7CFB\u7EDF\u771F\u7BA1\u7406\u5165\u53E3\uFF1A\u4E3B\u9898/\u58C1\u7EB8/\u52FF\u6270 per-mode + Focus \u81EA\u52A8\u52FF\u6270\u2014\u2014
              #22 \u6CE8\u8BB0\u300C\u7F51\u9875\u7248 modes \u80FD\u529B\u5DF2\u8D85 AOSP \u8BBE\u7F6E\u5165\u53E3\u300D\u7684\u9879\u76EE\u4FA7\u6620\u5C04\uFF09 -->
          <!-- add_mode\uFF1Azen_modes_add_mode\u300C\u521B\u5EFA\u60A8\u7684\u4E13\u5C5E\u6A21\u5F0F\u300D\u6743\u5A01\u503C + ic_add_24dp\uFF1B
              \u70B9\u51FB = ZenModeNewCustomFragment/ZenModesListAddModeTypeChooserDialog \u6A21\u677F\u9009\u62E9
              \u5411\u5BFC Web \u7B49\u4EF7 toast\uFF08v8.26 showLegal \u540C\u5F8B\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__settingsModesV830 && window.__settingsModesV830.toastAddMode()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.devAdd||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u521B\u5EFA\u60A8\u7684\u4E13\u5C5E\u6A21\u5F0F</span></span>
          </div>
        </div>
        <script>`+P+"<\/script>"},{title:"\u5B89\u5168\u548C\u9690\u79C1",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u5B89\u5168\u548C\u9690\u79C1</div>
          <!-- safety_center_summary \u6743\u5A01\u503C\uFF08\u4E00\u7EA7\u83DC\u5355 sub \u540C\u6E90\uFF09 -->
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u5E94\u7528\u5B89\u5168\u6027\u3001\u8BBE\u5907\u9501\u5B9A\u3001\u6743\u9650</div>
          <!-- security_status \u5206\u533A\uFF08order -10\uFF09\uFF1A\u5206\u533A\u6807\u9898 security_status_title\u300C\u5B89\u5168\u72B6\u6001\u300D\u6743\u5A01\u503C\u3002
              \u72B6\u6001\u5361 = SafetyCenter Protection status \u5408\u6D41\u8BED\u4E49\uFF08PermissionController
              SafetyCenterActivity\u2014\u2014\u955C\u50CF 404\xD73 \u4E0D\u53EF\u8FBE\uFF0C#22\u2464\u300C\u5361\u7247\u53EF\u865A\u6784\u5B89\u5168\u72B6\u6001\u300D\u8BB8\u53EF
              \u786E\u5B9A\u6027\u865A\u6784\uFF1A\u76FE\u724C topSafety + \u300C\u5DF2\u53D7\u5230\u4FDD\u62A4\u300D+\u300C\u91CD\u65B0\u626B\u63CF\u300D\u786E\u5B9A\u6027 toast\uFF09 -->
          <div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:4px 12px 8px;">\u5B89\u5168\u72B6\u6001</div>
          <div style="margin:0 8px 12px;padding:16px;border-radius:16px;background:var(--md-primary-container,#d3e3fd);color:var(--md-on-primary-container,#041e49);display:flex;align-items:center;gap:14px;">
            <span style="width:40px;height:40px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.topSafety||""}</span>
            <span style="flex:1;min-width:0;">
              <span style="display:block;font-size:16px;font-weight:500;">\u5DF2\u53D7\u5230\u4FDD\u62A4</span>
              <span style="display:block;font-size:13px;opacity:0.8;margin-top:2px;">\u60A8\u7684\u8BBE\u5907\u5DF2\u901A\u8FC7\u5B89\u5168\u68C0\u67E5</span>
            </span>
            <button id="safetyRescanBtn" role="button" tabindex="0" onclick="window.__settingsSafetyV831 && window.__settingsSafetyV831.rescan()" style="flex:none;border:none;background:transparent;color:var(--md-primary,#0b57d0);font-size:14px;font-weight:500;padding:8px 10px;border-radius:20px;cursor:pointer;">\u91CD\u65B0\u626B\u63CF</button>
          </div>
          <!-- dashboard_tile_placeholder \u5206\u533A\uFF08order 1\uFF09\uFF1ASecurityEntryPreferenceController
              \u52A8\u6001\u6CE8\u5165\u5361\u7247\u2014\u2014SafetyCenter \u5408\u6D41\u9875\u6258\u7BA1\uFF1BWeb \u7B49\u4EF7 = \u6743\u9650\u4F7F\u7528\u884C\uFF08\u865A\u6784\u6743\u9650\u626B\u63CF
              \u6458\u8981\u56FA\u5B9A\u503C\uFF0C#22\u2464 \u8BB8\u53EF\uFF09\u2192 \u9875 5 \u9690\u79C1\uFF08\u6743\u9650\u7BA1\u7406\u771F\u6570\u636E\u6E90\uFF0Cv8.30 \u52FF\u6270\u2192\u9875 9 \u6620\u5C04\u540C\u5F8B\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(5)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.topPrivacy||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u6743\u9650\u4F7F\u7528</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5DF2\u626B\u63CF 32 \u4E2A\u5E94\u7528</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- security_category \u5206\u533A\uFF08order 10\uFF09\uFF1A\u5206\u533A\u6807\u9898 lock_settings_title\u300C\u8BBE\u5907\u5B89\u5168\u6027\u300D\u6743\u5A01\u503C\u3002
              unlock_set_or_change\uFF08GearPreference\uFF09\uFF1Atitle=unlock_set_unlock_launch_picker_title
              \u300C\u5C4F\u5E55\u9501\u5B9A\u300D+ summary \u52A8\u6001\u5316\uFF08\u65E0/PIN\u2014\u2014Settings \u5F53\u524D\u9501\u5B9A\u65B9\u5F0F\u5C55\u793A\u540C\u6784\uFF0Cv11.50 #210\uFF09\uFF1B
              \u70B9\u51FB = PIN \u8BBE\u7F6E\u5361\u5F00\u5408\uFF08ChooseLockGeneric Web \u7B49\u4EF7\u8F6C\u6B63\u2014\u2014v8.31 \u5360\u4F4D toast \u9000\u5F79\uFF09\u3002
              \u6307\u7EB9/\u4EBA\u8138\u89E3\u9501/\u4EBA\u8138\u89E3\u9501\u548C\u6307\u7EB9\u89E3\u9501\u4E09\u884C = FingerprintStatusPreferenceController /
              FaceStatusPreferenceController / CombinedBiometricStatusPreferenceController \u2192
              isFingerprintHardwareDetected / isFaceHardwareDetected \u786C\u4EF6\u68C0\u6D4B\u95E8\u63A7\u2014\u2014
              Web \u65E0\u751F\u7269\u8BC6\u522B\u786C\u4EF6 \u2192 \u9690\u85CF\u6CE8\u8BB0\uFF08v8.01 SIM \u95E8\u63A7 + v8.30 \u7ED3\u6784\u6027\u914D\u7F6E\u96F6\u865A\u6784\u540C\u5F8B\uFF1B
              key\uFF1Afingerprint_settings\u300C\u6307\u7EB9\u300D/ face_settings\u300C\u4EBA\u8138\u89E3\u9501\u300D/
              biometric_settings\u300C\u4EBA\u8138\u89E3\u9501\u548C\u6307\u7EB9\u89E3\u9501\u300Dzh \u6743\u5A01\u503C\u5B9E\u62C9\u7559\u75D5\uFF09 -->
          <div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:8px 12px 8px;">\u8BBE\u5907\u5B89\u5168\u6027</div>
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__settingsSafetyV831 && window.__settingsSafetyV831.openPinSetup()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.topSecurity||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5C4F\u5E55\u9501\u5B9A</span><span id="lockMethodSummary" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u65E0</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- v11.50 #210\uFF1APIN \u8BBE\u7F6E\u5361\uFF08ChooseLockGeneric Web \u7B49\u4EF7\uFF09\u2014\u2014\u53CC\u8F93 + \u5F31\u5BC6\u7801\u8B66\u544A
              \u4E0D\u963B\u65AD\uFF08#185 assessPassword\uFF09+ \u6E05\u9664\u9A8C\u8BC1\u94FE\uFF1B\u503C\u4EC5\u7ECF .value \u8BFB\u5199\u96F6 innerHTML
              \u6CE8\u5165\u9762\uFF08esc \u7EAA\u5F8B\u540C\u6E90\uFF09\uFF1BM3 \u4EE4\u724C\u96F6\u88F8\u8272\uFF08\u51C6\u5165\u2460\uFF09 -->
          <div id="lockPinCard" hidden style="margin:0 12px 12px;padding:16px;border-radius:16px;background:var(--md-surface-container,#f3edf7);">
            <div style="font-size:14px;font-weight:500;margin-bottom:8px;color:var(--md-on-surface,#1d1b20);">\u8BBE\u7F6E\u5C4F\u5E55\u9501\u5B9A PIN</div>
            <div id="lockPinWarning" role="alert" style="display:none;font-size:13px;color:var(--md-tertiary,#7d5260);margin-bottom:8px;"></div>
            <input id="lockPinInput" type="password" inputmode="numeric" maxlength="16" placeholder="\u8F93\u5165 PIN\uFF08\u81F3\u5C11 4 \u4F4D\u6570\u5B57\uFF09" autocomplete="off" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;border:1px solid var(--md-outline-variant,#cac4d0);background:var(--md-surface,#ffffff);color:var(--md-on-surface,#1d1b20);font-size:15px;margin-bottom:8px;">
            <input id="lockPinConfirm" type="password" inputmode="numeric" maxlength="16" placeholder="\u786E\u8BA4 PIN" autocomplete="off" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;border:1px solid var(--md-outline-variant,#cac4d0);background:var(--md-surface,#ffffff);color:var(--md-on-surface,#1d1b20);font-size:15px;margin-bottom:12px;">
            <div style="display:flex;gap:8px;">
              <button id="lockPinSaveBtn" onclick="window.__settingsSafetyV831 && window.__settingsSafetyV831.pinSave()" style="border:none;border-radius:20px;padding:8px 18px;font-size:14px;font-weight:500;background:var(--md-primary,#0b57d0);color:var(--md-on-primary,#ffffff);cursor:pointer;">\u4FDD\u5B58</button>
              <button id="lockPinClearBtn" onclick="window.__settingsSafetyV831 && window.__settingsSafetyV831.pinClear()" style="border:none;border-radius:20px;padding:8px 18px;font-size:14px;font-weight:500;background:var(--md-surface-container-high,#e6e0e9);color:var(--md-on-surface,#1d1b20);cursor:pointer;">\u6E05\u9664 PIN</button>
            </div>
            <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:10px;">\u8BBE\u7F6E\u540E\u9501\u5C4F\u4E0A\u6ED1\u5C06\u8981\u6C42\u8F93\u5165 PIN\uFF08\u4EC5\u8B66\u544A\u5F31\u5BC6\u7801\uFF0C\u4E0D\u963B\u6B62\u8BBE\u7F6E\uFF1B\u5B58\u50A8\u4E3A\u52A0\u76D0\u54C8\u5E0C\uFF0C\u975E\u771F\u5B89\u5168\u8FB9\u754C\uFF09</div>
          </div>
          <!-- security_advanced_settings\uFF08order 100\uFF09\uFF1Atitle=\u300C\u66F4\u591A\u5B89\u5168\u8BBE\u7F6E\u300D\u6743\u5A01\u503C +
              summary=summary_placeholder \u5FE0\u5B9E\u7A7A\uFF1Bfragment=SecurityAdvancedSettings \u2192
              Web \u7B49\u4EF7 toast\uFF08\u9875\u540E\u7EED\u8F6C\u6B63\u6CE8\u8BB0\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__settingsSafetyV831 && window.__settingsSafetyV831.toastAdvanced()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u66F4\u591A\u5B89\u5168\u8BBE\u7F6E</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
        </div>
        <script>`+C+"<\/script>"},{title:"\u5B89\u5168\u548C\u7D27\u6025\u60C5\u51B5",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u5B89\u5168\u548C\u7D27\u6025\u60C5\u51B5</div>
          <!-- emergency_dashboard_summary \u6743\u5A01\u503C\uFF08\u4E00\u7EA7\u83DC\u5355 sub \u540C\u6E90\uFF09 -->
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u7D27\u6025\u6C42\u6551\u3001\u533B\u7597\u4FE1\u606F\u3001\u8B66\u62A5</div>
          <!-- more_emergency_settings\uFF08order 0\uFF09\uFF1ALayoutPreference more_settings_button =
              ActionPrimaryButton \u4E3B\u6309\u94AE\u5F62\u6001\uFF08RoundedCornerThemeOverlay \u5706\u89D2\u5B9E\u6309\u94AE\u975E\u884C\uFF09\uFF1B
              \u6587\u6848 = open_app_button\u300C\u6253\u5F00%s\u300D+ EmergencyInfo \u5E94\u7528\u540D\u2014\u2014AOSP \u7EAF\u51C0\u51FA\u5382
              \u300C\u7D27\u6025\u4FE1\u606F\u300D\uFF1Bopen_app_button zh \u6743\u5A01\u503C\u8DE8\u4ED3\u5E93\u7F3A\u5931\uFF08\u6CE8\u8BB0\u7559\u75D5\uFF09\uFF1B
              \u70B9\u51FB = EmergencyInfo \u5E94\u7528 Web \u7B49\u4EF7 toast\uFF08v8.26 showLegal \u540C\u5F8B\uFF09 -->
          <div style="margin:0 8px 12px;display:flex;justify-content:center;">
            <button role="button" tabindex="0" onclick="window.showSystemToast && window.showSystemToast('\u7D27\u6025\u4FE1\u606F\u5E94\u7528\u540E\u7EED\u7248\u672C\u8F6C\u6B63')" style="border:none;background:var(--md-primary,#0b57d0);color:var(--md-on-primary,#fff);font-size:14px;font-weight:500;padding:10px 24px;border-radius:24px;cursor:pointer;min-height:40px;">\u6253\u5F00\u7D27\u6025\u4FE1\u606F</button>
          </div>
          <!-- gesture_emergency_summary\uFF08order 100\uFF09\uFF1Atitle=emergency_gesture_screen_title
              \u300C\u7D27\u6025\u6C42\u6551\u300D\u6743\u5A01\u503C + icon=ic_emergency_gesture_24dp\uFF08emgGesture 3 path \u79FB\u690D\uFF09+
              \u6458\u8981 = EmergencyGestureEntrypointPreferenceController.getSummary
              gesture_setting_on\u300C\u5DF2\u5F00\u542F\u300D\uFF08config_show_emergency_gesture_settings \u51FA\u5382\u9ED8\u8BA4
              true \u2192 \u51FA\u5382\u6001\uFF1B\u9879\u76EE\u4FA7\u952E SOS \u5BF9\u63A5\uFF08#22\u2467 \u6CE8\u8BB0\u7535\u6E90\u952E 5 \u8FDE\u6309\uFF09\u6392\u540E\u7EED\u2014\u2014\u5C4A\u65F6
              \u6458\u8981\u968F\u5F00\u5173\u8054\u52A8\uFF09\uFF1B\u70B9\u51FB = EmergencyGestureSettings Web \u7B49\u4EF7 toast -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.showSystemToast && window.showSystemToast('\u7D27\u6025\u6C42\u6551\u8BBE\u7F6E\u9875\u540E\u7EED\u7248\u672C\u8F6C\u6B63')" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.emgGesture||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u7D27\u6025\u6C42\u6551</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5DF2\u5F00\u542F</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- \u65E0 key PreferenceCategory\uFF08order 170\uFF0Cpreference_category_no_label \u5E03\u5C40\uFF09\uFF1A
              \u7EAF\u5206\u9694\u7EBF\u8BED\u4E49 \u2192 \u5206\u533A\u95F4\u8DDD\u627F\u63A5 -->
          <!-- app_and_notif_cell_broadcast_settings\uFF08order 200\uFF09\uFF1Atitle=cell_broadcast_settings
              \u300C\u65E0\u7EBF\u7D27\u6025\u8B66\u62A5\u300D\u6743\u5A01\u503C\u2014\u2014RestrictedPreference intent CellBroadcastSettings
              \uFF08targetPackage=config_cell_broadcast_receiver_package\uFF09\u2192 \u9759\u6001\u884C\u4E0D\u6E32\u67D3\u70B9\u51FB
              \uFF08intent \u65E0 Web \u7B49\u4EF7\uFF1B\u9875 19 \u901A\u77E5\u9875\u540C\u540D key \u884C\u5F62\u6001\u4E00\u81F4 v8.01 \u5148\u4F8B\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u65E0\u7EBF\u7D27\u6025\u8B66\u62A5</span></span>
          </div>
        </div>`},{title:"\u5BC6\u7801\u3001\u901A\u884C\u5BC6\u94A5\u548C\u8D26\u53F7",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u5BC6\u7801\u3001\u901A\u884C\u5BC6\u94A5\u548C\u8D26\u53F7</div>
          <!-- TopIntroPreference\uFF1Acredman_main_settings_intro_text \u6743\u5A01\u5168\u503C\uFF08zh \u5B9E\u62C9\uFF09 -->
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;line-height:1.5;">\u9009\u62E9\u60A8\u5E0C\u671B\u54EA\u9879\u670D\u52A1\u6765\u5B58\u50A8\u7528\u4E8E\u767B\u5F55\u548C\u81EA\u52A8\u586B\u5145\u5EFA\u8BAE\u7684\u6570\u636E\u3002\u5982\u679C\u60A8\u5E0C\u671B\u5176\u4ED6\u670D\u52A1\u4E5F\u63D0\u4F9B\u5EFA\u8BAE\uFF0C\u8BF7\u5F00\u542F\u76F8\u5E94\u670D\u52A1\u3002</div>
          <!-- default_service_category\uFF08order 10\uFF09\uFF1A\u5206\u533A title=credman_chosen_app_title
              \u300C\u9996\u9009\u670D\u52A1\u300D\u6743\u5A01\u503C\u3002default_credman_autofill_main\uFF08PrimaryProviderPreference\uFF09\uFF1A
              DefaultCombinedPreferenceController.updatePreferenceForProvider\u2014\u2014topProvider=null
              \uFF08\u7EAF\u51C0 aosp-mirror \u65E0 GMS \u51ED\u636E\u670D\u52A1\u5546\uFF09\u2192 title=credman_app_list_preference_none
              \u300C\u672A\u9009\u62E9\u4EFB\u4F55\u5185\u5BB9\u300D/icon=null/summary=null\uFF08L109-121 \u5B9E\u62C9\uFF09\uFF1B\u70B9\u51FB =
              DefaultAutofillPicker \u6311\u9009\u5668 Web \u7B49\u4EF7 toast -->
          <div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:8px 12px 8px;">\u9996\u9009\u670D\u52A1</div>
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__settingsAccountsV833 && window.__settingsAccountsV833.toastPickProvider()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u672A\u9009\u62E9\u4EFB\u4F55\u5185\u5BB9</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- credman_category\uFF08order 20\uFF09\uFF1A\u5206\u533A title=credman_credentials\u300C\u5176\u4ED6\u670D\u52A1\u300D\u6743\u5A01\u503C\uFF1B
              CredentialManagerPreferenceController.maybeUpdatePreferenceVisibility L475-487
              isHiddenDueToNoProviderSet(providerPair) \u2192 \u65E0\u670D\u52A1\u5546\u6574\u7EC4\u9690\u85CF\uFF08\u7EAF\u51C0\u51FA\u5382\u65E0 provider\uFF0C
              \u7ED3\u6784\u6027\u914D\u7F6E\u96F6\u865A\u6784 v8.30 modes \u540C\u5F8B\uFF09\u2192 \u9690\u85CF\u6CE8\u8BB0 -->
          <!-- dashboard_tile_placeholder\uFF08order 130\uFF09\uFF1AAccountPreferenceController \u52A8\u6001\u6CE8\u5165
              \u8D26\u53F7\u5217\u8868\uFF08AccountTypePreference title=account.name/summary=authenticator label\uFF1B
              \u7EAF\u51C0\u51FA\u5382 aosp-mirror \u65E0 GMS \u65E0\u8D26\u53F7\uFF09\u2192 category title=account_settings\u300C\u8D26\u53F7\u300D
              \u4EC5 add_account \u884C\uFF08newAddAccountPreference L458-459\uFF1Aadd_account_label
              \u300C\u6DFB\u52A0\u8D26\u53F7\u300D+ ic_add_24dp=devAdd \u9010\u5B57\u79FB\u690D\u590D\u7528\uFF09\uFF1B#22\u2468 \u6CE8\u8BB0\u300C\u53EF\u63A5 mail/contacts
              \u65E2\u6709\u8D26\u53F7\u6570\u636E\u300D\u6838\u9A8C\u7ED3\u8BBA = \u4E24\u5E94\u7528\u96F6\u7ED3\u6784\u5316\u8D26\u53F7\u771F\u6E90 \u2192 \u4E0D\u865A\u6784\u5217\u8868 -->
          <div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:8px 12px 8px;">\u8D26\u53F7</div>
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__settingsAccountsV833 && window.__settingsAccountsV833.toastAddAccount()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${e.devAdd||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u6DFB\u52A0\u8D26\u53F7</span></span>
          </div>
          <!-- auto_sync_account_data\uFF08order 202\uFF09\uFF1ASwitchPreferenceCompat\u2014\u2014
              auto_sync_account_title\u300C\u81EA\u52A8\u540C\u6B65\u5E94\u7528\u6570\u636E\u300D/ auto_sync_account_summary
              \u300C\u8BA9\u5E94\u7528\u81EA\u52A8\u5237\u65B0\u6570\u636E\u300D\u6743\u5A01\u503C\uFF1BallowDividerAbove=true\uFF1B\u771F\u6E90 =
              ContentResolver.getMasterSyncAutomatically\uFF08Web \u65E0\u5BF9\u5E94 API \u2192 localStorage
              settings:accounts-v1 \u5355\u4E00\u771F\u6E90\uFF0C\u9ED8\u8BA4 true=AOSP \u51FA\u5382\u9ED8\u8BA4\u5F00\uFF0Cv8.29 location \u540C\u5F8B\uFF09\uFF1B
              \u70B9\u51FB = ConfirmAutoSyncChangeFragment \u786E\u8BA4\u5F39\u7A97\uFF08\u5173\u95ED zh \u5168\u503C/\u5F00\u542F zh title +
              \u82F1\u6587 message res-product zh MISS \u7559\u75D5\uFF09\u2192 \u786E\u8BA4\u540E\u5199\u771F\u6E90\uFF08#70 __setSwitchChecked\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__settingsAccountsV833 && window.__settingsAccountsV833.openSyncDialog(!document.getElementById('acSyncToggle').checked)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u81EA\u52A8\u540C\u6B65\u5E94\u7528\u6570\u636E</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u8BA9\u5E94\u7528\u81EA\u52A8\u5237\u65B0\u6570\u636E</span></span>
            <label class="md3-switch"><input type="checkbox" id="acSyncToggle" onclick="event.stopPropagation();window.__settingsAccountsV833 && window.__settingsAccountsV833.openSyncDialog(!event.target.checked)"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- auto_sync_work_account_data\uFF08order 203\uFF0CforWork=true\uFF09/
              auto_sync_personal_account_data\uFF08order 204\uFF09\uFF1AAutoSyncWorkData/
              AutoSyncPrivateDataPreferenceController profile \u95E8\u63A7 \u2192 \u7EAF\u51C0\u51FA\u5382\u65E0 work
              profile/private space \u2192 \u9690\u85CF\u6CE8\u8BB0\uFF08v8.01 SIM \u95E8\u63A7 + v8.29 \u4F4D\u7F6E profile \u540C\u5F8B\uFF09 -->
        </div>
        <!-- ConfirmAutoSyncChangeFragment Web \u7B49\u4EF7\u786E\u8BA4\u5F39\u7A97\uFF08\u9875\u5185 overlay\uFF0CnotifLockDialog \u540C\u6784\uFF1B
            title/message \u7531 ACCOUNTS_PAGE_SCRIPT.openSyncDialog \u6309 enabling \u5206\u652F\u6CE8\u5165\uFF09 -->
        <div id="acSyncDialog" style="display:none;position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.4);align-items:center;justify-content:center;padding:24px;">
          <div style="background:var(--md-surface-container-high,#eceff4);border-radius:28px;max-width:360px;width:100%;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.25);">
            <div id="acSyncDlgTitle" style="font-size:16px;font-weight:500;padding-bottom:12px;"></div>
            <div id="acSyncDlgMsg" style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding-bottom:20px;white-space:pre-line;line-height:1.5;"></div>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
              <button role="button" tabindex="0" onclick="window.__settingsAccountsV833 && window.__settingsAccountsV833.cancelSync()" style="border:none;background:transparent;color:var(--md-primary,#0b57d0);font-size:14px;font-weight:500;padding:10px 12px;border-radius:20px;cursor:pointer;">\u53D6\u6D88</button>
              <button role="button" tabindex="0" onclick="window.__settingsAccountsV833 && window.__settingsAccountsV833.confirmSync()" style="border:none;background:transparent;color:var(--md-primary,#0b57d0);font-size:14px;font-weight:500;padding:10px 12px;border-radius:20px;cursor:pointer;">\u786E\u5B9A</button>
            </div>
          </div>
        </div>
        <script>`+E+"<\/script>"},{title:"\u72B6\u6001\u680F",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u72B6\u6001\u680F</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;line-height:1.5;">\u63A7\u5236\u72B6\u6001\u680F\u53F3\u4FA7\u5404\u56FE\u6807\u4F4D\u7684\u663E\u793A\u3002\u5173\u95ED\u540E\uFF0C\u5BF9\u5E94\u4E8B\u4EF6\u518D\u53D1\u751F\u4E5F\u4E0D\u4F1A\u5728\u72B6\u6001\u680F\u70B9\u4EAE\u8BE5\u56FE\u6807\uFF08\u7535\u6C60\u7535\u91CF\u767E\u5206\u6BD4\u5F00\u5173\u5728\u300C\u7535\u6C60\u300D\u9875\uFF09\u3002</div>
          <div id="sbIconSlotList"></div>
          <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);padding:12px;line-height:1.6;">\u70ED\u70B9 / \u6D41\u91CF\u8282\u7701 / \u8033\u673A\u7B49\u5360\u4F4D\u56FE\u6807\u4F4D\u6682\u65E0\u4FE1\u53F7\u6E90\uFF0C\u4E8B\u4EF6\u53D1\u751F\u524D\u4E0D\u4F1A\u51FA\u73B0\uFF08AOSP PhoneStatusBarPolicy \u540C\u6784\u5224\u5B9A\uFF0C\u5360\u4F4D\u7B56\u7565\u8BDA\u5B9E\u6807\u6CE8\uFF09\u3002</div>
        </div>
        <script>`+z+"<\/script>"},{title:"\u8272\u5F69\u548C\u52A8\u753B",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u8272\u5F69\u548C\u52A8\u753B</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u8272\u5F69\u6821\u6B63 \xB7 \u989C\u8272\u53CD\u8F6C \xB7 \u79FB\u9664\u52A8\u753B\uFF08AOSP accessibility_color_and_motion\uFF09</div>
          <!-- daltonizer_preference\uFF08order 1\uFF09\uFF1AToggleDaltonizerPreferenceFragment \u5165\u53E3 \u2192 \u9875 34 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="__tpNav(this,34)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yColorMotion||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u8272\u5F69\u6821\u6B63</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="a11yColorCorrectionSub">\u5DF2\u5173\u95ED</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- toggle_inversion_preference\uFF08order 2\uFF09\uFF1AToggleColorInversionPreferenceFragment\u2014\u2014
              AOSP \u4E3A fragment \u4E8C\u7EA7\u5927\u5F00\u5173\uFF0Cmd3 \u884C\u5185 switch \u76F4\u8F6C\uFF08RBC \u884C\u540C\u8303\u5F0F\uFF09\uFF1B
              \u771F\u5B9E\u73B0 = html filter invert(1) hue-rotate(180deg) -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yColorMotion||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u989C\u8272\u53CD\u8F6C</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5C06\u4EAE\u5C4F\u5E55\u8C03\u6697\uFF0C\u5C06\u6697\u5C4F\u5E55\u8C03\u4EAE</span></span>
            <label class="md3-switch"><input type="checkbox" id="a11yColorInvertToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- dark_ui_mode\uFF08order 3\uFF09\uFF1ADarkModeSettingsFragment \u5165\u53E3\u2014\u2014md3 \u6DF1\u8272\u4E3B\u9898
              \u771F\u5F00\u5173\u4F4D\u4E8E\u663E\u793A\u9875\uFF08theme-mode.js\uFF09\uFF0C\u8BED\u4E49\u627F\u63A5\u8DF3\u8F6C\uFF08\u5165\u53E3\u53EF\u8FBE\u6027\u4FDD\u6301\uFF09 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="__tpNav(this,1)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yColorMotion||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u6DF1\u8272\u4E3B\u9898</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5728\u663E\u793A\u8BBE\u7F6E\u4E2D\u7BA1\u7406</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">\u203A</span>
          </div>
          <!-- toggle_force_invert\uFF08order 4\uFF09\uFF1AToggleForceInvertPreferenceController\u2014\u2014
              Web \u65E0\u5E94\u7528\u6DF1\u8272\u5F3A\u5236\u901A\u9053\uFF08iframe \u5E94\u7528\u81EA\u51B3\u4E3B\u9898\uFF09\u2192 hidden \u6CE8\u8BB0\uFF08\u8BDA\u5B9E\u964D\u7EA7\uFF09 -->
          <!-- animator_duration_scale\uFF08order 5\uFF09\uFF1ADisableAnimationsPreferenceController\u2014\u2014
              AOSP \u5199 Secure ANIMATOR_DURATION_SCALE=0\uFF1Bmd3 = html[data-a11y-reduce-motion]
              \u5C5E\u6027\u901A\u9053 + @media \u7CFB\u7EDF\u901A\u9053\u53CC\u901A\u9053\u5224\u5B9A\uFF0832 \u5757 CSS \u526F\u672C + JS \u8BFB\u53D6\u9762\u6536\u53E3\u5728\u5F55\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:var(--md-surface-container-high, #5F6368);color:var(--md-on-surface-variant, #E3E7EB);border-radius:27%;">${e.a11yColorMotion||""}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u79FB\u9664\u52A8\u753B</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u51CF\u5C11\u5C4F\u5E55\u52A8\u753B</span></span>
            <label class="md3-switch"><input type="checkbox" id="a11yRemoveAnimToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- toggle_large_pointer_icon\uFF08order 6\uFF09\uFF1AWeb \u65E0\u81EA\u7ED8\u6307\u9488\u9762\uFF08OS \u6E32\u67D3\u5149\u6807\uFF09\u2192 hidden \u6CE8\u8BB0 -->
          <!-- experimental_category\uFF08order 7\uFF09\uFF1A\u7A7A\u533A\u9690\u85CF\uFF08updatePreferenceCategoryVisibility \u7A7A\u533A\u8BED\u4E49\uFF09 -->
        </div>
        <script>`+M+"<\/script>"},{title:"\u663E\u793A\u5927\u5C0F\u548C\u6587\u5B57",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u663E\u793A\u5927\u5C0F\u548C\u6587\u5B57</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u5B57\u4F53 \xB7 \u663E\u793A \xB7 \u7C97\u4F53 \xB7 \u9AD8\u5BF9\u6BD4\u5EA6\uFF08AOSP accessibility_text_reading_options\uFF09</div>
          <!-- preview\uFF08TextReadingPreviewPreference \u7B49\u4EF7\uFF09\uFF1A\u53CC\u901A\u9053\u5168\u771F\u5B9E\u6F14\u793A -->
          <div id="a11yTextPreview" style="margin:4px 12px 8px;padding:16px;border-radius:16px;background:var(--md-surface-container,#1c1c1e);overflow:hidden;">
            <div id="a11yTextPreviewInner" style="line-height:1.6;color:var(--md-on-surface,#fff);">
              <span style="display:block;font-weight:600;padding-bottom:4px;">\u5B57\u4F53\u5927\u5C0F\u9884\u89C8</span>
              \u8FD9\u6BB5\u6587\u5B57\u4F1A\u968F\u4E0B\u65B9\u4E24\u4E2A\u6ED1\u6746\u5B9E\u65F6\u53D8\u5316\u3002\u653E\u5927\u6216\u7F29\u5C0F\u6587\u5B57\u4E0E\u6240\u6709\u5185\u5BB9\uFF0C\u627E\u5230\u6700\u9002\u5408\u4F60\u7684\u663E\u793A\u6548\u679C\u3002
            </div>
          </div>
          <!-- font_size\uFF08order 2\uFF09\uFF1ALabeledSeekBar\u2014\u2014md3 = html \u6839\u5B57\u53F7\u901A\u9053\uFF08rem \u65CF\u751F\u6548\uFF1B
              \u5168\u5E93 px \u5316\u6587\u672C\u4E0D\u968F\u52A8\uFF0Cpx\u2192rem \u8FC1\u79FB\u5217\u540E\u7EED\u9636\u6BB5\u2014\u2014\u8BDA\u5B9E\u6807\u6CE8\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">\u2212</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5B57\u4F53\u5927\u5C0F</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u653E\u5927\u6216\u7F29\u5C0F\u6587\u5B57</span></span>
            <input type="range" id="a11yFontScale" min="85" max="150" step="5" style="width:130px;accent-color:hsl(var(--md-h,215) 70% 55%);">
            <span id="a11yFontScaleVal" style="font-size:13px;font-weight:600;min-width:44px;text-align:right;color:var(--md-on-surface);">100%</span>
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">\uFF0B</span>
          </div>
          <!-- display_size\uFF08order 3\uFF09\uFF1ALabeledSeekBar\u2014\u2014md3 = .app-body zoom \u901A\u9053
              \uFF08\u58F3\u5C42\u624B\u52BF\u9608\u503C px \u8BED\u4E49\u4E0D\u7F29\u653E\u2014\u2014\u8F93\u5165\u5B89\u5168\u8FB9\u754C\u8BDA\u5B9E\u6807\u6CE8\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">\u2212</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u663E\u793A\u5927\u5C0F</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u653E\u5927\u6216\u7F29\u5C0F\u6240\u6709\u5185\u5BB9</span></span>
            <input type="range" id="a11yDisplayScale" min="85" max="130" step="5" style="width:130px;accent-color:hsl(var(--md-h,215) 70% 55%);">
            <span id="a11yDisplayScaleVal" style="font-size:13px;font-weight:600;min-width:44px;text-align:right;color:var(--md-on-surface);">100%</span>
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">\uFF0B</span>
          </div>
          <!-- toggle_force_bold_text\uFF08order 4\uFF09\uFF1AFontWeightAdjustmentPreferenceController\u2014\u2014
              AOSP FONT_WEIGHT_ADJUSTMENT=1000 \u5168\u5C40\u63D0\u6743\uFF1Bmd3 = \u5C5E\u6027\u901A\u9053 body * 700 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u7C97\u4F53\u6587\u5B57</span></span>
            <label class="md3-switch"><input type="checkbox" id="a11yBoldTextToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- toggle_high_text_contrast_preference\uFF08order 5\uFF09\uFF1A--md-on-*/outline \u4EE4\u724C
              \u6781\u503C\u8986\u76D6\u901A\u9053\uFF08var() \u6D88\u8D39\u94FE\u5168\u8986\u76D6\uFF1B\u88F8\u5199\u989C\u8272\u4E0D\u5728\u8986\u76D6\u57DF\u2014\u2014\u8BDA\u5B9E\u6807\u6CE8\uFF09 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u9AD8\u5BF9\u6BD4\u5EA6\u6587\u5B57</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">\u5C06\u6587\u5B57\u989C\u8272\u66F4\u6539\u4E3A\u9ED1\u8272\u6216\u767D\u8272\uFF0C\u4F7F\u5176\u4E0E\u80CC\u666F\u5F62\u6210\u5C3D\u53EF\u80FD\u9C9C\u660E\u7684\u5BF9\u6BD4\u3002</span></span>
            <label class="md3-switch"><input type="checkbox" id="a11yHighContrastToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- reset\uFF08order 6\uFF09\uFF1ATextReadingResetPreference \u7B49\u4EF7 -->
          <div class="md3-list-item" role="button" tabindex="0" id="a11yTextReadingReset" style="min-height:64px;display:flex;align-items:center;justify-content:center;border-radius:16px;cursor:pointer;">
            <span style="font-size:15px;color:var(--md-primary,#0b57d0);font-weight:500;">\u91CD\u7F6E\u4E3A\u9ED8\u8BA4</span>
          </div>
          <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);padding:12px 16px;line-height:1.6;">
            \u8303\u56F4\u6CE8\u8BB0\uFF1A\u5B57\u4F53\u5927\u5C0F 85%\u2013150% / \u663E\u793A\u5927\u5C0F 85%\u2013130% \u4E3A md3 \u6863\u4F4D\uFF08AOSP \u8FDE\u7EED\u6D6E\u70B9\uFF0C\u672A\u9010\u503C\u5B9E\u62C9\u2014\u2014\u8BDA\u5B9E\u6807\u6CE8\uFF09\uFF1B\u663E\u793A\u5927\u5C0F\u4F5C\u7528\u4E8E\u5E94\u7528\u5185\u5BB9\u5C42\uFF0C\u72B6\u6001\u680F\u4E0E\u624B\u52BF\u533A\u4FDD\u6301\u539F\u59CB\u5C3A\u5BF8\u3002
          </div>
        </div>
        <script>`+O+"<\/script>"},{title:"\u8272\u5F69\u6821\u6B63",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u8272\u5F69\u6821\u6B63</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u4F7F\u7528\u8272\u5F69\u6821\u6B63\uFF08AOSP ToggleDaltonizerPreferenceFragment\uFF09</div>
          <!-- primary switch\uFF1Aaccessibility_daltonizer_primary_switch_title \u6743\u5A01\u6587\u6848 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u4F7F\u7528\u8272\u5F69\u6821\u6B63</span></span>
            <label class="md3-switch"><input type="checkbox" id="a11yDaltonizerToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- daltonizer_preview\uFF08PaletteListPreference \u7B49\u4EF7\uFF09\uFF1A\u6EE4\u955C\u5B9E\u65F6\u9884\u89C8\u8272\u5E26 -->
          <div id="a11yDaltonizerPalette" style="display:flex;gap:6px;margin:4px 12px 12px;border-radius:16px;overflow:hidden;">
            ${["#e57373","#f06292","#ba68c8","#7986cb","#64b5f6","#4db6ac","#aed581","#ffd54f"].map(t=>'<span style="flex:1;height:36px;background:'+t+';display:block;"></span>').join("")}
          </div>
          <!-- \u56DB\u6A21\u5F0F radio\uFF1Aarrays.xml daltonizer_mode_keys\xD7daltonizer_type_values \u6743\u5A01\u6620\u5C04
              \uFF08deuteranomaly=12 / protanomaly=11 / tritanomaly=13 / grayscale=0\uFF09+ zh-rCN \u6587\u6848 -->
          ${[{v:12,t:"\u7EA2\u7EFF\u8272\u76F2\u3001\u7EFF\u8272\u5F31",s:"\u7EFF\u8272\u5F31\u89C6"},{v:11,t:"\u7EA2\u7EFF\u8272\u76F2\u3001\u7EA2\u8272\u5F31",s:"\u7EA2\u8272\u5F31\u89C6"},{v:13,t:"\u84DD\u9EC4\u8272\u76F2",s:"\u84DD\u8272\u5F31\u89C6"},{v:0,t:"\u7070\u5EA6\u6A21\u5F0F",s:""}].map(t=>`
          <label class="md3-list-item" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <input type="radio" name="a11yDaltonizerMode" value="${t.v}" style="accent-color:hsl(var(--md-h,215) 70% 55%);width:18px;height:18px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">${t.t}</span>${t.s?'<span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">'+t.s+"</span>":""}</span>
          </label>`).join("")}
          <!-- daltonizer_saturation\uFF1ASATURATION_MIN=1/MAX=10/DEFAULT=7\uFF08controller \u5B9E\u6E90\uFF09\uFF1B
              daltonizer_saturation_unavailable_summary \u6743\u5A01\u8BED\u4E49 = \u7070\u5EA6\u6216\u505C\u7528\u65F6\u4E0D\u53EF\u7528 -->
          <div class="md3-list-item" id="a11yDaltonizerSatRow" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">\u5F3A\u5EA6</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="a11yDaltonizerSatSub"></span></span>
            <input type="range" id="a11yDaltonizerSat" min="1" max="10" step="1" style="width:130px;accent-color:hsl(var(--md-h,215) 70% 55%);">
            <span id="a11yDaltonizerSatVal" style="font-size:13px;font-weight:600;min-width:44px;text-align:right;color:var(--md-on-surface);">7/10</span>
          </div>
          <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);padding:12px 16px;line-height:1.6;">
            \u7BA1\u7EBF\u6CE8\u8BB0\uFF1AAOSP \u8272\u5F69\u6821\u6B63\u7531 SurfaceFlinger \u9010\u5E27\u8272\u5F69\u53D8\u6362\uFF1Bmd3 \u4EE5 SVG feColorMatrix\uFF08Machado \u540C\u6E90\u77E9\u9635\uFF09\u8FD1\u4F3C\u5B9E\u73B0\uFF0C\u8BED\u4E49\u7B49\u4EF7\u3001\u7BA1\u7EBF\u5DEE\u5F02\u5728\u5F55\u3002
          </div>
        </div>
        <script>`+N+"<\/script>"},{title:"\u5E94\u7528\u901A\u77E5",content:`
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u5E94\u7528\u901A\u77E5</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u63A7\u5236\u6765\u81EA\u5404\u4E2A\u5E94\u7528\u7684\u901A\u77E5\uFF08AOSP AppNotificationSettings\uFF0C\u6E20\u9053\u6CE8\u518C\u8868\u6309\u5E94\u7528\u5206\u7EC4\uFF09</div>
          <div id="appNotifList" data-test="appnotif-list"></div>
          <div id="appNotifEmpty" data-test="appnotif-empty" style="display:none;min-height:120px;align-items:center;justify-content:center;text-align:center;color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;flex-direction:column;gap:6px;">
            <span>\u6682\u65E0\u5E94\u7528\u6CE8\u518C\u901A\u77E5\u6E20\u9053</span>
            <span style="font-size:12px;">\u5E94\u7528\u901A\u8FC7 __system.notify \u58F0\u660E\u6E20\u9053\u540E\u5728\u6B64\u663E\u793A</span>
          </div>
          <div style="font-size:12px;color:var(--md-outline,#6a6b6e);padding:16px 12px;line-height:1.6;">
            \u6CE8\u8BB0\uFF1A\u6E20\u9053\u5F00\u5173\u5173 = importance \u7F6E\u300C\u65E0\u300D\uFF08\u6574\u6761\u4E0D\u8FDB\uFF09\u5E76\u8BB0\u5FC6\u539F\u503C\uFF0C\u5F00 = \u6062\u590D\uFF1B
            importance \u4FEE\u6539\u5165\u53E3\u5728\u901A\u77E5\u957F\u6309\u300C\u5168\u90E8\u7C7B\u522B\u300D\u5F39\u5C42\uFF08ChannelEditorDialog \u540C\u8BED\u4E49\uFF09\u3002
          </div>
        </div>`},{title:"\u6570\u5B57\u5065\u5EB7",content:`
        <style>
          /* #96 \u51C6\u5165\u2461\uFF1A\u7A84\u5C4F\u6392\u884C\u884C\u65F6\u957F\u6458\u8981\u6362\u884C\uFF08@media \u65AD\u70B9\u2014\u2014\u624B\u673A/\u5E73\u677F\u4E24\u6001\uFF09 */
          @media (max-width: 480px) {
            #wellbeingRanking .md3-list-item span[style*="flex:1"] { font-size: 13px; }
          }
        </style>
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">\u6570\u5B57\u5065\u5EB7</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">\u5C4F\u5E55\u4F7F\u7528\u65F6\u95F4\u4E0E\u5E94\u7528\u6392\u884C\uFF08AOSP Digital Wellbeing \u5BF9\u6807\uFF0C\u672C\u673A\u4F7F\u7528\u8BB0\u5F55\u53E3\u5F84\uFF09</div>
          <div class="md3-card" data-test="wellbeing-ring-card" style="margin:8px 0;padding:20px 16px;text-align:center;">
            <div id="wellbeingRing" data-test="wellbeing-ring" style="display:flex;align-items:center;justify-content:center;min-height:148px;"></div>
            <div data-test="wellbeing-total" id="wellbeingTotal" style="font-size:22px;font-weight:600;color:var(--md-on-surface,#e2e2e9);padding-top:8px;">\u4E0D\u8DB3 1 \u5206\u949F</div>
            <div data-test="wellbeing-count" id="wellbeingCount" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);padding-top:2px;">0 \u4E2A\u5E94\u7528</div>
          </div>
          <div id="wellbeingRanking" data-test="wellbeing-ranking"></div>
          <!-- v11.50 #96 \u4E8C\u671F\uFF1A\u8BBE\u5907\u7EA7\u7EDF\u8BA1\u5361\uFF08AOSP Wellbeing \u89E3\u9501\u6B21\u6570/\u901A\u77E5\u63A5\u6536\u6570\u53CC\u5361\u540C\u6784\uFF09 -->
          <div style="display:flex;gap:12px;margin-top:12px;">
            <div class="md3-card" data-test="wellbeing-stat-unlocks" style="flex:1;padding:16px;text-align:center;">
              <div id="wellbeingUnlocks" style="font-size:24px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">0</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);padding-top:4px;">\u4ECA\u65E5\u89E3\u9501</div>
            </div>
            <div class="md3-card" data-test="wellbeing-stat-notifs" style="flex:1;padding:16px;text-align:center;">
              <div id="wellbeingNotifs" style="font-size:24px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">0</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);padding-top:4px;">\u4ECA\u65E5\u901A\u77E5</div>
            </div>
          </div>
          <div id="wellbeingEmpty" data-test="wellbeing-empty" style="display:none;min-height:120px;align-items:center;justify-content:center;text-align:center;color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;flex-direction:column;gap:6px;">
            <span>\u6682\u65E0\u4F7F\u7528\u8BB0\u5F55</span>
            <span style="font-size:12px;">\u6253\u5F00\u4EFB\u610F\u5E94\u7528\u540E\u6B64\u5904\u5C06\u6309\u524D\u53F0\u65F6\u957F\u9010\u65E5\u7D2F\u8BA1</span>
          </div>
          <!-- v11.50 #96 \u4E09\u671F\uFF1A\u4E13\u6CE8\u6A21\u5F0F\u5361\uFF08AOSP Focus mode \u5BF9\u6807\u2014\u2014\u9009\u5B9A\u5E94\u7528\u6682\u505C/\u6062\u590D\uFF0C\u6301\u4E45\u5316\uFF1B
               \u4E0E\u756A\u8304\u949F focus.js\uFF08\u4F1A\u8BDD DND \u5FAA\u73AF\uFF09/ profiles.js\uFF08\u5916\u89C2\u5FEB\u7167\uFF09\u4E09\u6A21\u5F0F\u5206\u5C42\u88C1\u51B3\uFF0C\u6CE8\u8BB0\u5728\u5F55\uFF09 -->
          <div class="md3-card" data-test="wellbeing-focus-card" style="margin:12px 0;padding:16px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:15px;font-weight:500;">\u4E13\u6CE8\u6A21\u5F0F</div>
                <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);padding-top:2px;">\u5F00\u542F\u540E\u6240\u9009\u5E94\u7528\u5C06\u88AB\u6682\u505C\uFF08\u6253\u5F00\u65F6\u62E6\u622A\u63D0\u793A\uFF0C\u4E0D\u8054\u52A8\u52FF\u6270\uFF09</div>
              </div>
              <label class="md3-switch"><input type="checkbox" id="wellbeingFocusSwitch" data-test="wellbeing-focus-switch" aria-label="\u4E13\u6CE8\u6A21\u5F0F\u5F00\u5173"><span class="slider"><span class="thumb"></span></span></label>
            </div>
            <div id="wellbeingFocusApps" data-test="wellbeing-focus-apps" style="display:flex;flex-wrap:wrap;gap:8px;padding-top:12px;"></div>
          </div>
          <!-- v11.50 #96 \u4E09\u671F\uFF1A\u5E94\u7528\u8BA1\u65F6\u5668\u5361\uFF08AOSP App timers \u5BF9\u6807\u2014\u2014per-app \u6BCF\u65E5\u9650\u65F6\uFF0C\u5230\u9650\u6682\u505C\u81F3\u6B21\u65E5\uFF09 -->
          <div class="md3-card" data-test="wellbeing-timers-card" style="margin:8px 0;padding:16px;">
            <div style="font-size:15px;font-weight:500;">\u5E94\u7528\u8BA1\u65F6\u5668</div>
            <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);padding-top:2px;">\u6BCF\u65E5\u9650\u65F6\uFF08\u672C\u673A\u524D\u53F0\u8BB0\u5F55\u53E3\u5F84\uFF09\uFF0C\u5230\u9650\u540E\u5E94\u7528\u6682\u505C\u81F3\u6B21\u65E5</div>
            <div id="wellbeingTimers" data-test="wellbeing-timers" style="padding-top:8px;"></div>
          </div>
          <div data-test="wellbeing-note" style="font-size:12px;color:var(--md-outline,#6a6b6e);padding:16px 12px;line-height:1.6;">
            \u6CE8\u8BB0\uFF1AWeb \u57DF\u65E0\u7CFB\u7EDF\u7EA7 UsageStats \u57CB\u70B9\uFF0C\u7EDF\u8BA1\u57FA\u4E8E\u672C\u673A\u5E94\u7528\u5F00/\u95ED\u8BB0\u5F55\uFF08\u524D\u53F0\u65F6\u957F\u53E3\u5F84\uFF0C
            \u5355\u4F1A\u8BDD\u6700\u957F\u8BA1 4 \u5C0F\u65F6\uFF0C\u8DE8\u5348\u591C\u4F1A\u8BDD\u6574\u6BB5\u5F52\u5C5E\u95ED\u5408\u65F6\u523B\u65E5\u6876\uFF09\uFF1B\u5206\u5C4F/\u5C0F\u7A97\u671F\u8BB0\u4E3A\u6700\u540E\u6253\u5F00\u7684\u5E94\u7528\u3002
            \u9650\u65F6/\u6682\u505C\u53E3\u5F84\u540C\u6E90\uFF08\u672C\u673A\u524D\u53F0\u8BB0\u5F55\uFF09\uFF1A\u5DF2\u5F00\u7A97\u53E3\u4E0D\u5373\u65F6\u5173\u95ED\u3001\u56FE\u6807\u7F6E\u7070\u4E0E\u5230\u671F\u5373\u65F6\u5F39\u7A97\u7559\u70B9\u3002
            \u4E09\u6A21\u5F0F\u5206\u5C42\u88C1\u51B3\uFF1A\u756A\u8304\u949F\uFF08\u5FEB\u6377\u8BBE\u7F6E\u78C1\u8D34\uFF09= \u4F1A\u8BDD\u7EA7\u4E13\u6CE8\u5FAA\u73AF\uFF1B\u672C\u9875\u4E13\u6CE8\u6A21\u5F0F = \u9009\u5B9A\u5E94\u7528\u6682\u505C\uFF1B
            \u4E24\u8005\u5747\u4E0D\u8054\u52A8\u52FF\u6270\uFF08\u52FF\u6270\u662F\u72EC\u7ACB\u78C1\u8D34\uFF0CAOSP Focus mode \u540C\u8BED\u4E49\uFF09\u3002
          </div>
        </div>`}]};$(S.pages);export default S;
