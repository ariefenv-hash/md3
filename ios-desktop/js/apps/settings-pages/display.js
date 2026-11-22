export const DISPLAY_PAGE_SCRIPT=`
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var LS_KEY = 'settings:display-v1';
            // \u9ED8\u8BA4\u503C=AOSP \u9ED8\u8BA4\u8BED\u4E49\uFF1Adef_screen_off_timeout=60000\uFF08frameworks_base SettingsProvider
            // packages/SettingsProvider/res/values/defaults.xml \u5B9E\u6E90\uFF09
            var DEFAULTS = { timeout: 60000 };
            var state;
            try { state = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch (e) { state = Object.assign({}, DEFAULTS); }
            var store = {
              get: function(k) { return state[k]; },
              set: function(k, v) {
                state[k] = v;
                try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
                try { document.dispatchEvent(new CustomEvent('settings-display-changed', { detail: { key: k, value: v } })); } catch (e) {}
              }
            };
            // \u5355\u4E00\u771F\u6E90\u6CE8\u518C\uFF08\u9501\u5C4F\u81EA\u52A8\u4F11\u7720\u6D88\u8D39\u70B9\u6392\u671F v8.05+\uFF09
            window.__settingsDisplayStore = store;
            function showTip(msg) { if (window.showSystemToast) window.showSystemToast(msg); }
            // AOSP values-zh-rCN arrays.xml screen_timeout_entries \u6743\u5A01\u503C\u6620\u5C04\uFF08ms \u2192 \u6743\u5A01 zh\uFF09
            // v11.50 #286 \u7EED\uFF1ATIMEOUT_LABELS \u6863\u4F4D\u8868\u4E0A\u79FB\u6838\uFF08settings-core TIMEOUT_LABELS\uFF09\uFF0C\u5185\u8054\u5B9A\u4E49\u9000\u5F79\uFF1B
            // getTimeoutSummary \u8BED\u4E49\uFF1Ascreen_timeout_summary\u300C\u95F2\u7F6E %1$s\u540E\u300D
            function timeoutSummary() {
              return window.__settingsCore.timeoutSummaryFrom(state.timeout);
            }
            // v7.34 rAF \u5408\u5E27 + v7.38 transform \u9A71\u52A8\uFF08v8.03 \u540C\u6B3E bindSlider\uFF09
            var bindSlider = function(slider, fill, thumb, label, onPct, getP) {
              if (!slider || slider._bound) return;
              slider._bound = true;
              var slRaf = 0, slLastE = null, down = false, lastP = 0;
              var slPaint = function() {
                slRaf = 0;
                var e = slLastE; slLastE = null;
                if (!e) return;
                var r = slider.getBoundingClientRect();
                var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                lastP = p;
                if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, p, down);
                if (label) label.innerText = Math.round(p * 100) + '%';
                onPct(p);
              };
              var update = function(e) {
                slLastE = e;
                if (!slRaf) slRaf = requestAnimationFrame(slPaint);
              };
              slider.onpointerdown = function(e) { down = true; slider.classList.add('is-dragging'); try { slider.setPointerCapture(e.pointerId); } catch (err) {} update(e); };
              slider.onpointermove = function(e) { if (down) update(e); };
              slider.onpointerup = slider.onpointercancel = function(e) {
                if (down) {
                  down = false;
                  slider.classList.remove('is-dragging');
                  if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, lastP, false);
                }
                try { slider.releasePointerCapture(e.pointerId); } catch (err) {}
              };
              if (window.__md3SliderWatch) window.__md3SliderWatch(slider, function() {
                var p = getP ? getP() : lastP;
                lastP = p;
                if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, p, false);
              });
            };
            function syncBrightnessUi() {
              // \u6FC0\u6D3B\u56DE\u540C\u6B65\uFF1A\u4EAE\u5EA6\u771F\u503C\u5728 QS \u6865\u4E0A\uFF08QS \u6ED1\u6761\u53EF\u80FD\u5DF2\u6539\u503C\uFF09
              var qs = window.__qsBrightness;
              var v = qs ? Math.max(15, Math.min(100, qs.get() || 80)) : 80;
              var label = document.getElementById('dspBriVal');
              if (label) label.innerText = v + '%';
              if (window.__md3SliderSet) window.__md3SliderSet(
                document.getElementById('dspBriSlider'),
                document.getElementById('dspBriFill'),
                document.getElementById('dspBriThumb'), v / 100, false);
            }
            function initOnce() {
              // \u2460 \u4EAE\u5EA6\u7EA7\u522B\uFF08preference_key_brightness_level\uFF09\uFF1ABrightnessLevelPreferenceController
              //    AVAILABLE\uFF1B\u5355\u4E00\u771F\u6E90 = window.__qsBrightness \u6865\uFF08QS \u4EAE\u5EA6\u6ED1\u6761 body.filter \u6D88\u8D39\u94FE\uFF09
              var s = document.getElementById('dspBriSlider');
              if (s && !s._bound) {
                bindSlider(s,
                  document.getElementById('dspBriFill'),
                  document.getElementById('dspBriThumb'),
                  document.getElementById('dspBriVal'),
                  function(p) { if (window.__qsBrightness) window.__qsBrightness.set(Math.round(p * 100)); },
                  function() { var qs = window.__qsBrightness; return qs ? Math.max(15, Math.min(100, qs.get() || 80)) / 100 : 0.8; }
                );
              }
              syncBrightnessUi();
              // \u2461 \u6DF1\u8272\u4E3B\u9898\uFF08dark_ui_mode\uFF09\uFF1ADarkModePreference extends PrimarySwitchPreference\uFF1B
              //    \u5355\u4E00\u771F\u6E90 = __settingsTheme\uFF08\u4E0E\u5FEB\u6377\u8BBE\u7F6E\u6DF1\u8272\u78C1\u8D34\u540C\u5411\uFF0Cv7.4x \u65E2\u6709\u94FE\uFF09\uFF1B
              //    \u6458\u8981 AutoDarkTheme.getStatus \u9ED8\u8BA4 MODE_NIGHT_NO \u2192
              //    dark_ui_summary_on/off_auto_mode_never\u300C\u4E00\u5F8B\u4E0D\u81EA\u52A8\u5173\u95ED\u300D/\u300C\u6C38\u4E0D\u81EA\u52A8\u5F00\u542F\u300D
              var dk = document.getElementById('dspDarkToggle');
              var dkSub = document.getElementById('dspDarkSub');
              if (dk && !dk._bound) {
                dk._bound = true;
                var syncDark = function() {
                  if (!window.__settingsTheme) return;
                  var dark = window.__settingsTheme.resolved() === 'dark';
                  (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(dk, dark); // #70\uFF08app-page-active \u91CD\u540C\u6B65\u8DEF\u5F84\uFF0CDOM \u590D\u7528\u540E\u51E0\u4F55\u5BF9\u9F50\uFF09
                  if (dkSub) dkSub.innerText = dark ? '\u4E00\u5F8B\u4E0D\u81EA\u52A8\u5173\u95ED' : '\u6C38\u4E0D\u81EA\u52A8\u5F00\u542F';
                };
                syncDark();
                dk.addEventListener('change', function() {
                  if (!window.__settingsTheme) { (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(dk, false); return; } // #70
                  window.__settingsTheme.set(dk.checked ? 'dark' : 'light');
                  syncDark();
                  showTip(dk.checked ? '\u5DF2\u5207\u6362\u5230\u6DF1\u8272\u65B9\u6848' : '\u5DF2\u5207\u6362\u5230\u6D45\u8272\u65B9\u6848');
                });
                if (!dk._themeWatch) {
                  dk._themeWatch = true;
                  bindDoc('settings', 'settings-theme-changed', syncDark);
                }
                // v8.11 #70 \u56DE\u5F52\u4FEE\u590D\uFF1Av8.06 \u91CD\u6784\u4E22\u5931\u7684\u6FC0\u6D3B\u56DE\u540C\u6B65\uFF08\u5144\u5F1F\u9875 L538/683/2083/
                // 2767/3002 \u6A21\u5F0F\u9F50\u5168\uFF0C\u552F display \u7F3A\uFF09\u2014\u2014 DOM \u590D\u7528\u91CD\u8FDB\u8BBE\u7F6E\u65F6 PAGE_SCRIPT
                // \u4E0D\u91CD\u8DD1\uFF0C\u5173\u95ED\u671F\u95F4\u88AB QS \u78C1\u8D34/\u63A7\u5236\u4E2D\u5FC3\u6539\u6389\u7684\u4E3B\u9898\u771F\u503C\u65E0\u5904\u5237\u65B0\uFF0C
                // \u5373\u8BAE\u9898\u300C\u4E0D\u53BB\u52A8\u5B83\uFF0C\u89C6\u89C9\u5C31\u4E00\u76F4\u9519\u7740\u300D\u7684\u7B2C\u4E8C\u5C42\u7F3A\u53E3
                bindDoc('settings', 'app-page-active', function(e) {
                  if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 1) syncDark();
                });
              } else if (dk) {
                if (window.__settingsTheme) {
                  var darkNow = window.__settingsTheme.resolved() === 'dark';
                  (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(dk, darkNow); // #70
                  if (dkSub) dkSub.innerText = darkNow ? '\u4E00\u5F8B\u4E0D\u81EA\u52A8\u5173\u95ED' : '\u6C38\u4E0D\u81EA\u52A8\u5F00\u542F';
                }
              }
              // \u2462 \u81EA\u52A8\u65CB\u8F6C\u5C4F\u5E55\uFF08auto_rotate\uFF09\uFF1AAutoRotatePreferenceController AVAILABLE
              //    \uFF08RotationPolicy.isRotationLockToggleVisible && !deviceState \u6298\u53E0\u5F62\u6001\uFF09\uFF1B
              //    \u5355\u4E00\u771F\u6E90 = QS autorotate \u78C1\u8D34\uFF08__qsTileState\uFF0Cv7.99 \u98DE\u884C\u6A21\u5F0F\u540C\u6B3E\u63A5\u7EBF\uFF09
              var rt = document.getElementById('dspRotateToggle');
              if (rt && !rt._bound) {
                rt._bound = true;
                if (window.__qsTileState) (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(rt, !!window.__qsTileState.get('autorotate')); // #70
                rt.addEventListener('change', function() {
                  var on = !!rt.checked;
                  if (window.__qsTileState) window.__qsTileState.sync('autorotate', { active: on });
                  showTip(on ? '\u81EA\u52A8\u65CB\u8F6C\u5DF2\u5F00\u542F' : '\u65B9\u5411\u5DF2\u9501\u5B9A');
                });
              }
              // \u2463 \u81EA\u52A8\u9501\u5C4F\uFF08screen_timeout\uFF09\uFF1AScreenTimeoutPreferenceController AVAILABLE\uFF1B
              //    \u52A8\u6001\u6458\u8981 getTimeoutSummary = screen_timeout_summary\u300C\u95F2\u7F6E %1$s\u540E\u300D\uFF08store \u771F\u6E90\uFF0C
              //    \u9ED8\u8BA4 def_screen_off_timeout=60000 \u2192\u300C\u95F2\u7F6E 1 \u5206\u949F\u540E\u300D\uFF09
              var toSub = document.getElementById('dspTimeoutSub');
              if (toSub) toSub.innerText = timeoutSummary();
              // \u2464 \u9501\u5C4F\u4E00\u8A00\u5728\u7EBF\u589E\u5F3A\uFF08#26 \u8D85\u8D8A\u539F\u751F\uFF09\uFF1Astore \u771F\u6E90 ios-desktop:lock-quote-online
              //    \uFF08\u9ED8\u8BA4 '0' \u5173\uFF1B\u65AD\u7F51\u53EF\u7528\u4E3A\u7B2C\u4E00\u9A8C\u6536\uFF09\u2192 \u5E7F\u64AD lock-quote-online-changed\uFF0C
              //    \u6D88\u8D39\u70B9 lock-quotes.js \u5373\u65F6\u5207\u6362\u5728\u7EBF/\u79BB\u7EBF\u6E32\u67D3\uFF1Bapp-page-active \u91CD\u540C\u6B65\u8D70
              //    syncQuote\uFF08#70 \u7EAA\u5F8B\uFF1ADOM \u590D\u7528\u91CD\u8FDB\u8BBE\u7F6E\u9875\u65F6 PAGE_SCRIPT \u4E0D\u91CD\u8DD1\uFF09
              var qt = document.getElementById('dspQuoteOnlineToggle');
              if (qt) {
                var syncQuote = function() {
                  var on = '0';
                  try { on = localStorage.getItem('ios-desktop:lock-quote-online') || '0'; } catch (e) {}
                  (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(qt, on === '1'); // #70
                };
                syncQuote();
                if (!qt._bound) {
                  qt._bound = true;
                  qt.addEventListener('change', function() {
                    var on = !!qt.checked;
                    try { localStorage.setItem('ios-desktop:lock-quote-online', on ? '1' : '0'); } catch (e) {}
                    document.dispatchEvent(new CustomEvent('lock-quote-online-changed', { detail: { on: on } }));
                    if (window.showSystemToast) window.showSystemToast(on ? '\u9501\u5C4F\u4E00\u8A00\uFF1A\u5728\u7EBF\u589E\u5F3A\u5DF2\u5F00\u542F' : '\u9501\u5C4F\u4E00\u8A00\uFF1A\u5DF2\u4F7F\u7528\u79BB\u7EBF\u8BD7\u8BCD\u5E93');
                  });
                }
              }
              // v9.94 #35\uFF1A\u606F\u5C4F\u663E\u793A AOD \u5F00\u5173\uFF08store.aod \u5355\u6E90\uFF1B\u95F2\u7F6E\u65F6\u957F\u590D\u7528 screen_timeout\uFF09
              // v9.94 \u4FEE\u590D\uFF1A\u672C\u5757 v9.76 \u5F15\u5165\u65F6\u8BEF\u63D2\u5728 initOnce \u95ED\u5408\u62EC\u53F7\u4E4B\u540E\u4E14\u591A\u8865\u4E00\u62EC\u53F7\uFF0C
              // \u4EE4 initOnce(); \u8C03\u7528\u53CD\u88AB\u541E\u8FDB\u51FD\u6570\u4F53 \u2192 \u8BBE\u7F6E\u5E94\u7528\u6302\u8F7D\u5373\u629B SyntaxError
              //\uFF08Unexpected identifier 'initOnce'\uFF0C\u6F5C\u4F0F v9.76-v9.78 \u4E24\u7A97\uFF1Bv33 e2e \u8D70
              // \u60F0\u6027 DOM \u67E5\u672A\u6302\u8BBE\u7F6E\u5E94\u7528\u6545\u6F0F\u68C0\uFF09\u2014\u2014\u5F52\u4F4D initOnce \u4F53\u5185\uFF0C\u95ED\u5408\u62EC\u53F7\u5F52\u4E00
              var at = document.getElementById('dspAodToggle');
              if (at && !at._bound) {
                at._bound = true;
                var syncAod = function() { var on = !!state.aod; (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b;})(at, on); };
                syncAod();
                at.addEventListener('change', function() {
                  store.set('aod', at.checked);
                  if (window.showSystemToast) window.showSystemToast(at.checked ? '\u606F\u5C4F\u663E\u793A\u5DF2\u5F00\u542F\uFF1A\u95F2\u7F6E\u6216\u7184\u5C4F\u540E\u5E38\u663E\u65F6\u949F' : '\u606F\u5C4F\u663E\u793A\u5DF2\u5173\u95ED');
                });
                bindDoc('settings', 'settings-display-changed', syncAod);
              }
            }
            initOnce();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 1) initOnce();
            });
          })();
        `;
