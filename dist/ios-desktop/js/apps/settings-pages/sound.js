export const SOUND_PAGE_SCRIPT=`
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var sfx = window.__sfx;
            var LS_KEY = 'settings:sound-v1';
            // \u9ED8\u8BA4\u503C=AOSP \u9ED8\u8BA4\u8BED\u4E49\uFF08Web 0-100 \u6362\u7B97\uFF1BpreventRinging hush \u624B\u52BF\u9ED8\u8BA4\u5F00\uFF09
            var DEFAULTS = { call: 50, ring: 70, notification: 70, alarm: 70, preventRinging: true, vibrateIcon: false, dtmf: true, screenLock: true, charging: true, docking: true };
            var state;
            try { state = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch (e) { state = Object.assign({}, DEFAULTS); }
            var store = {
              get: function(k) { return state[k]; },
              set: function(k, v) {
                state[k] = v;
                try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
                try { document.dispatchEvent(new CustomEvent('settings-sound-changed', { detail: { key: k, value: v } })); } catch (e) {}
              }
            };
            // \u5355\u4E00\u771F\u6E90\u6CE8\u518C\uFF08#11 \u65F6\u949F\u6D88\u8D39\u70B9\uFF09
            window.__settingsSoundStore = store;
            function showTip(msg) { if (window.showSystemToast) window.showSystemToast(msg); }
            // v7.34 rAF \u5408\u5E27\uFF08\u672B\u4E8B\u4EF6\u539F\u5219\uFF09+ v7.38 transform \u9A71\u52A8\uFF1Afill/thumb \u540C\u5E27\u5199\u5165
            // \u8D70 __md3SliderSet \u5408\u6210\u5668\u6865\uFF0C\u6839\u6CBB\u5927\u8272\u5757\u91CD\u5149\u6805\u6EDE\u540E\u8131\u8282
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
            function bindToggle(id, key, onLabel, offLabel) {
              var el = document.getElementById(id);
              if (!el || el._bound) return;
              el._bound = true;
              (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(el, !!store.get(key)); // #70
              el.addEventListener('change', function() {
                store.set(key, el.checked);
                showTip(el.checked ? onLabel : offLabel);
              });
            }
            function initOnce() {
              if (!sfx) sfx = window.__sfx;
              // \u4E94\u901A\u9053\u97F3\u91CF\uFF08media=\u5F15\u64CE\u771F\u503C\uFF1Bcall/ring/notification/alarm=store \u771F\u6E90\uFF09
              bindSlider(
                document.getElementById('sndMediaSlider'),
                document.getElementById('sndMediaFill'),
                document.getElementById('sndMediaThumb'),
                document.getElementById('sndMediaVal'),
                function(p) { if (window.__settingsMedia) window.__settingsMedia.setVolume(p); },
                function() { return window.__settingsMedia ? window.__settingsMedia.getVolume() : 0.6; }
              );
              bindSlider(
                document.getElementById('sndCallSlider'),
                document.getElementById('sndCallFill'),
                document.getElementById('sndCallThumb'),
                document.getElementById('sndCallVal'),
                function(p) { store.set('call', Math.round(p * 100)); },
                function() { return (store.get('call') || 0) / 100; }
              );
              bindSlider(
                document.getElementById('sndRingSlider'),
                document.getElementById('sndRingFill'),
                document.getElementById('sndRingThumb'),
                document.getElementById('sndRingVal'),
                function(p) { store.set('ring', Math.round(p * 100)); },
                function() { return (store.get('ring') || 0) / 100; }
              );
              bindSlider(
                document.getElementById('sndNotifSlider'),
                document.getElementById('sndNotifFill'),
                document.getElementById('sndNotifThumb'),
                document.getElementById('sndNotifVal'),
                function(p) { store.set('notification', Math.round(p * 100)); },
                function() { return (store.get('notification') || 0) / 100; }
              );
              bindSlider(
                document.getElementById('sndAlarmSlider'),
                document.getElementById('sndAlarmFill'),
                document.getElementById('sndAlarmThumb'),
                document.getElementById('sndAlarmVal'),
                function(p) { store.set('alarm', Math.round(p * 100)); },
                function() { return (store.get('alarm') || 0) / 100; }
              );
              // \u6FC0\u6D3B\u56DE\u540C\u6B65\u771F\u503C\uFF08v8.03 fix(audit-E) \u60EF\u4F8B\uFF1A\u5A92\u4F53\u97F3\u91CF\u88AB\u64AD\u653E\u5668/\u5FEB\u6377\u8BBE\u7F6E\u6539\u8FC7\u540E\u56DE\u6765\u4ECD\u663E\u793A\u65E7\u503C\uFF09
              if (window.__settingsMedia && window.__settingsMedia.getVolume) {
                var mv = Math.round(window.__settingsMedia.getVolume() * 100);
                var mvLabel = document.getElementById('sndMediaVal');
                if (mvLabel) mvLabel.innerText = mv + '%';
                if (window.__md3SliderSet) window.__md3SliderSet(document.getElementById('sndMediaSlider'), document.getElementById('sndMediaFill'), document.getElementById('sndMediaThumb'), mv / 100, false);
              }
              ['Call', 'Ring', 'Notif', 'Alarm'].forEach(function(ch) {
                var key = { Call: 'call', Ring: 'ring', Notif: 'notification', Alarm: 'alarm' }[ch];
                var v = Math.round((store.get(key) || 0));
                var label = document.getElementById('snd' + ch + 'Val');
                if (label) label.innerText = v + '%';
                if (window.__md3SliderSet) window.__md3SliderSet(document.getElementById('snd' + ch + 'Slider'), document.getElementById('snd' + ch + 'Fill'), document.getElementById('snd' + ch + 'Thumb'), v / 100, false);
              });
              // \u5F00\u5173\u516D\u679A\uFF08store \u771F\u6E90 + AOSP \u9ED8\u8BA4\u8BED\u4E49 Toast\uFF09
              bindToggle('sndDtmfToggle', 'dtmf', '\u62E8\u53F7\u952E\u76D8\u63D0\u793A\u97F3\u5DF2\u5F00\u542F', '\u62E8\u53F7\u952E\u76D8\u63D0\u793A\u97F3\u5DF2\u5173\u95ED');
              bindToggle('sndScreenLockToggle', 'screenLock', '\u5C4F\u5E55\u9501\u5B9A\u63D0\u793A\u97F3\u5DF2\u5F00\u542F', '\u5C4F\u5E55\u9501\u5B9A\u63D0\u793A\u97F3\u5DF2\u5173\u95ED');
              bindToggle('sndChargingToggle', 'charging', '\u5145\u7535\u63D0\u793A\u97F3\u548C\u632F\u52A8\u5DF2\u5F00\u542F', '\u5145\u7535\u63D0\u793A\u97F3\u548C\u632F\u52A8\u5DF2\u5173\u95ED');
              bindToggle('sndDockingToggle', 'docking', '\u57FA\u5EA7\u63D0\u793A\u97F3\u5DF2\u5F00\u542F', '\u57FA\u5EA7\u63D0\u793A\u97F3\u5DF2\u5173\u95ED');
              bindToggle('sndVibrateIconToggle', 'vibrateIcon', '\u632F\u52A8\u56FE\u6807\u5E38\u663E\u5DF2\u5F00\u542F', '\u632F\u52A8\u56FE\u6807\u5E38\u663E\u5DF2\u5173\u95ED');
              bindToggle('sndPreventRingingToggle', 'preventRinging', '\u963B\u6B62\u54CD\u94C3\u7684\u5FEB\u6377\u65B9\u5F0F\u5DF2\u5F00\u542F', '\u963B\u6B62\u54CD\u94C3\u7684\u5FEB\u6377\u65B9\u5F0F\u5DF2\u5173\u95ED');
              // touch_sounds = System.SOUND_EFFECTS_ENABLED \u8BED\u4E49\u878D\u5408 sound-haptics \u5F15\u64CE\uFF08\u540C\u4E00\u771F\u6E90\uFF09
              var tsToggle = document.getElementById('sndTouchSoundsToggle');
              if (tsToggle && !tsToggle._bound) {
                tsToggle._bound = true;
                (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(tsToggle, sfx ? sfx.sfxEnabled() : true); // #70
                tsToggle.addEventListener('change', function() {
                  if (sfx) { sfx.setSfxEnabled(tsToggle.checked); if (tsToggle.checked) sfx.play('tick'); }
                  showTip(tsToggle.checked ? '\u70B9\u6309\u548C\u70B9\u51FB\u63D0\u793A\u97F3\u5DF2\u5F00\u542F' : '\u70B9\u6309\u548C\u70B9\u51FB\u63D0\u793A\u97F3\u5DF2\u5173\u95ED');
                });
              }
              // Web \u6269\u5C55\u5361\uFF08v7.34 \u65E2\u6709\u771F\u5B9E\u529F\u80FD\u4FDD\u7559\uFF1Asfx \u97F3\u91CF + \u89E6\u611F\u632F\u52A8\u603B\u95F8\uFF09
              var xv = document.getElementById('sfxVolSlider');
              if (xv) bindSlider(
                xv,
                document.getElementById('sfxVolFill'),
                document.getElementById('sfxVolThumb'),
                document.getElementById('sfxVolVal'),
                function(p) { if (sfx) sfx.setVolume(p); },
                function() { return sfx ? sfx.getVolume() : 0.5; }
              );
              if (sfx && xv) {
                var cur = Math.round(sfx.getVolume() * 100);
                var xvLabel = document.getElementById('sfxVolVal');
                if (xvLabel) xvLabel.innerText = cur + '%';
                if (window.__md3SliderSet) window.__md3SliderSet(xv, document.getElementById('sfxVolFill'), document.getElementById('sfxVolThumb'), cur / 100, false);
              }
              var hapToggle = document.getElementById('sndHapticToggle');
              if (sfx && hapToggle && !hapToggle._bound) {
                hapToggle._bound = true;
                (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(hapToggle, sfx.hapticsEnabled()); // #70
                hapToggle.addEventListener('change', function() {
                  sfx.setHapticsEnabled(hapToggle.checked);
                  if (window.showSystemToast) window.showSystemToast(hapToggle.checked ? '\u89E6\u611F\u632F\u52A8\u53CD\u9988\u5DF2\u5F00\u542F' : '\u89E6\u611F\u632F\u52A8\u53CD\u9988\u5DF2\u5173\u95ED');
                  if (hapToggle.checked && navigator.vibrate) navigator.vibrate(30);
                });
              }
              // v9.94 #36\uFF1A\u5BBF\u4E3B\u6309\u952E\u97F3\u5F00\u5173\uFF08AOSP Keypress* \u65CF\uFF0C\u72EC\u7ACB\u5F00\u5173\u9ED8\u8BA4\u5173\uFF09
              var kpToggle = document.getElementById('sndKeypressToggle');
              if (sfx && kpToggle && !kpToggle._bound) {
                kpToggle._bound = true;
                (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(kpToggle, sfx.keypressEnabledFlag ? sfx.keypressEnabledFlag() : false);
                kpToggle.addEventListener('change', function() {
                  sfx.setKeypressEnabled(kpToggle.checked);
                  if (kpToggle.checked) sfx.play('keypress_return');
                });
              }
              // v9.94 #158/#161\uFF1A\u7EDF\u4E00\u97F3\u9891\u8D44\u6E90\u56DE\u9000\u5F00\u5173\uFF08\u81EA\u52A8/\u5F3A\u5236\u771F\u5B9E\u8D44\u6E90/\u5F3A\u5236\u5408\u6210\u2014\u2014\u4E00\u4E2A\u5F00\u5173\u7BA1\u5168\u90E8\u97F3\u9891\u8D44\u6E90\uFF09
              var armSel = document.getElementById('audioResourceModeSelect');
              if (armSel && !armSel._bound) {
                armSel._bound = true;
                var armKey = 'ios-desktop:audio-resource-mode';
                var armCur = 'auto';
                try { var armStored = localStorage.getItem(armKey); if (armStored === 'asset' || armStored === 'synth' || armStored === 'auto') armCur = armStored; } catch (e) {}
                armSel.value = armCur;
                armSel.addEventListener('change', function() {
                  try { localStorage.setItem(armKey, armSel.value); } catch (e) {}
                  if (window.showSystemToast) window.showSystemToast(armSel.value === 'auto' ? '\u97F3\u9891\u8D44\u6E90\uFF1A\u81EA\u52A8\uFF08\u91C7\u6837\u4F18\u5148\uFF0C\u5931\u8D25\u56DE\u843D\u5408\u6210\uFF09' : armSel.value === 'asset' ? '\u97F3\u9891\u8D44\u6E90\uFF1A\u5F3A\u5236\u771F\u5B9E\u91C7\u6837\uFF08\u7F3A\u5931\u9759\u9ED8\uFF09' : '\u97F3\u9891\u8D44\u6E90\uFF1A\u5F3A\u5236\u5408\u6210\u97F3');
                });
              }
            }
            initOnce();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 4) initOnce();
            });
          })();
        `;
