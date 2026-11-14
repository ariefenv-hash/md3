// ==================== settings-pages/sound.js — 页 4 提示音和振动（SOUND_PAGE_SCRIPT 单源真身 · #284 批 8） ====================
//
// #284 批 8（v11.30）：SOUND_PAGE_SCRIPT 常量自 settings.js 整体搬迁至此——
// boundary-map §3.1 候选表顺位（R158 续点候选首位；页 4 提示音和振动 v8.03
// sound_settings.xml 1:1，簇块 204 行 = 头注考证链 7 行 + 模板串 197 行，批 7 NOTIF
// 簇后余八簇现存块首位）。G2 单源桥接禁双轨：本文件 = 常量唯一真源（export），
// settings.js 经 import 消费同一份；负向锚守护 = tests/sound-subpage.test.js
// 「G2 单源桥接」组（settings.js 本体零 const SOUND_PAGE_SCRIPT 残留，批 2-7 互指纪律同款）。
// 运行语义零漂移：settingsApp 页注册表 `<script>` + SOUND_PAGE_SCRIPT + `</script>`
// 拼接面逐字节不变（消费点 = settings.js 页 4 content 尾段原位）；簇模板串零 `${` 插值
// （boundary-map §3.1 拆分风险注记核查：SOUND 簇自包含 IIFE，桥接全走 window.* 宿主面
// —— __bindAppDocListener / __sfx / __settingsMedia / __md3SliderSet / __setSwitchChecked /
// __settingsSoundStore（单一真源，定义于簇内）+ showSystemToast / navigator.vibrate，
// 迁移零委托行；簇体零 window.__settingsCore. / window.__mdEscape( 委托，A2/A3 壳层基线
// 与 v286 C2 读取面计数零触碰——比批 7 NOTIF 簇更干净）。原簇头注考证链（v11.30
// settings.js L221–226）逐字随簇走如次：
// 单一真源：window.__settingsSoundStore（localStorage settings:sound-v1）。
// AOSP 语义映射：call=STREAM_VOICE_CALL / ring=STREAM_RING（separate_ring_volume）/
// notification=STREAM_NOTIFICATION / alarm=STREAM_ALARM；AOSP 为 stream 0..maxIndex，
// Web 语义 0-100%。#11 时钟应用前置依赖：闹钟响铃音量消费 store.get('alarm')。
// media_volume 走既有 __settingsMedia（HTML5 Audio 引擎真实音量，v8.03 前已接）。
// touch_sounds 开关 = System.SOUND_EFFECTS_ENABLED 语义 = sound-haptics sfxEnabled 同一真源融合。
export const SOUND_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var sfx = window.__sfx;
            var LS_KEY = 'settings:sound-v1';
            // 默认值=AOSP 默认语义（Web 0-100 换算；preventRinging hush 手势默认开）
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
            // 单一真源注册（#11 时钟消费点）
            window.__settingsSoundStore = store;
            function showTip(msg) { if (window.showSystemToast) window.showSystemToast(msg); }
            // v7.34 rAF 合帧（末事件原则）+ v7.38 transform 驱动：fill/thumb 同帧写入
            // 走 __md3SliderSet 合成器桥，根治大色块重光栅滞后脱节
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
              // 五通道音量（media=引擎真值；call/ring/notification/alarm=store 真源）
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
              // 激活回同步真值（v8.03 fix(audit-E) 惯例：媒体音量被播放器/快捷设置改过后回来仍显示旧值）
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
              // 开关六枚（store 真源 + AOSP 默认语义 Toast）
              bindToggle('sndDtmfToggle', 'dtmf', '拨号键盘提示音已开启', '拨号键盘提示音已关闭');
              bindToggle('sndScreenLockToggle', 'screenLock', '屏幕锁定提示音已开启', '屏幕锁定提示音已关闭');
              bindToggle('sndChargingToggle', 'charging', '充电提示音和振动已开启', '充电提示音和振动已关闭');
              bindToggle('sndDockingToggle', 'docking', '基座提示音已开启', '基座提示音已关闭');
              bindToggle('sndVibrateIconToggle', 'vibrateIcon', '振动图标常显已开启', '振动图标常显已关闭');
              bindToggle('sndPreventRingingToggle', 'preventRinging', '阻止响铃的快捷方式已开启', '阻止响铃的快捷方式已关闭');
              // touch_sounds = System.SOUND_EFFECTS_ENABLED 语义融合 sound-haptics 引擎（同一真源）
              var tsToggle = document.getElementById('sndTouchSoundsToggle');
              if (tsToggle && !tsToggle._bound) {
                tsToggle._bound = true;
                (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(tsToggle, sfx ? sfx.sfxEnabled() : true); // #70
                tsToggle.addEventListener('change', function() {
                  if (sfx) { sfx.setSfxEnabled(tsToggle.checked); if (tsToggle.checked) sfx.play('tick'); }
                  showTip(tsToggle.checked ? '点按和点击提示音已开启' : '点按和点击提示音已关闭');
                });
              }
              // Web 扩展卡（v7.34 既有真实功能保留：sfx 音量 + 触感振动总闸）
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
                  if (window.showSystemToast) window.showSystemToast(hapToggle.checked ? '触感振动反馈已开启' : '触感振动反馈已关闭');
                  if (hapToggle.checked && navigator.vibrate) navigator.vibrate(30);
                });
              }
              // v9.94 #36：宿主按键音开关（AOSP Keypress* 族，独立开关默认关）
              var kpToggle = document.getElementById('sndKeypressToggle');
              if (sfx && kpToggle && !kpToggle._bound) {
                kpToggle._bound = true;
                (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(kpToggle, sfx.keypressEnabledFlag ? sfx.keypressEnabledFlag() : false);
                kpToggle.addEventListener('change', function() {
                  sfx.setKeypressEnabled(kpToggle.checked);
                  if (kpToggle.checked) sfx.play('keypress_return');
                });
              }
              // v9.94 #158/#161：统一音频资源回退开关（自动/强制真实资源/强制合成——一个开关管全部音频资源）
              var armSel = document.getElementById('audioResourceModeSelect');
              if (armSel && !armSel._bound) {
                armSel._bound = true;
                var armKey = 'ios-desktop:audio-resource-mode';
                var armCur = 'auto';
                try { var armStored = localStorage.getItem(armKey); if (armStored === 'asset' || armStored === 'synth' || armStored === 'auto') armCur = armStored; } catch (e) {}
                armSel.value = armCur;
                armSel.addEventListener('change', function() {
                  try { localStorage.setItem(armKey, armSel.value); } catch (e) {}
                  if (window.showSystemToast) window.showSystemToast(armSel.value === 'auto' ? '音频资源：自动（采样优先，失败回落合成）' : armSel.value === 'asset' ? '音频资源：强制真实采样（缺失静默）' : '音频资源：强制合成音');
                });
              }
            }
            initOnce();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 4) initOnce();
            });
          })();
        `;