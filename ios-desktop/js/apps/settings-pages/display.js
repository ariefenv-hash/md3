// ==================== settings-pages/display.js — 页 1 显示与亮度（DISPLAY_PAGE_SCRIPT 单源真身 · #284 批 9） ====================
//
// #284 批 9（v11.22 · §7.5 加餐卷）：DISPLAY_PAGE_SCRIPT 常量自 settings.js 整体搬迁至此——
// boundary-map §3.1 候选表顺位（R159 续点候选首位；页 1 显示与亮度 v8.04 #23 差距矩阵②
// display_settings.xml 1:1，簇块 189 行 = 模板串 188+const/闭合，批 8 SOUND 簇后余七簇
// 现存块首位）。G2 单源桥接禁双轨：本文件 = 常量唯一真源（export），settings.js 经 import
// 消费同一份；负向锚守护 = tests/display-subpage.test.js「G2 单源桥接」组（settings.js
// 本体零 const DISPLAY_PAGE_SCRIPT 残留，批 2-8 互指纪律同款）。
// 运行语义零漂移：settingsApp 页注册表 `<script>` + DISPLAY_PAGE_SCRIPT + `</script>`
// 拼接面逐字节不变（消费点 = settings.js 页 1 content 尾段原位）；簇模板串零 `${` 插值
// （boundary-map §3.1 拆分风险注记核查：DISPLAY 簇自包含 IIFE，桥接全走 window.* 宿主面
// —— __bindAppDocListener / __settingsDisplayStore（单一真源，定义于簇内）/ __md3SliderSet /
// __md3SliderWatch / __settingsTheme / __setSwitchChecked / __qsBrightness / __qsTileState /
// showSystemToast，迁移零委托行）；**簇体含 1 处 window.__settingsCore.timeoutSummaryFrom
// 委托（v11.22 重锚 getTimeoutSummary 上移 settings-core.js）——v286 C2 读取面合计守恒
// 已补 DISPLAY_PAGE_SRC（批 7 NOTIF_PAGE_SRC 同款三源合计），A2/A3 壳层基线零触碰
// （簇体零 __mdEscape( 引用预检实证）。
export const DISPLAY_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var LS_KEY = 'settings:display-v1';
            // 默认值=AOSP 默认语义：def_screen_off_timeout=60000（frameworks_base SettingsProvider
            // packages/SettingsProvider/res/values/defaults.xml 实源）
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
            // 单一真源注册（锁屏自动休眠消费点排期 v8.05+）
            window.__settingsDisplayStore = store;
            function showTip(msg) { if (window.showSystemToast) window.showSystemToast(msg); }
            // AOSP values-zh-rCN arrays.xml screen_timeout_entries 权威值映射（ms → 权威 zh）
            // v11.22 #286 续：TIMEOUT_LABELS 档位表上移核（settings-core TIMEOUT_LABELS），内联定义退役；
            // getTimeoutSummary 语义：screen_timeout_summary「闲置 %1$s后」
            function timeoutSummary() {
              return window.__settingsCore.timeoutSummaryFrom(state.timeout);
            }
            // v7.34 rAF 合帧 + v7.38 transform 驱动（v8.03 同款 bindSlider）
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
              // 激活回同步：亮度真值在 QS 桥上（QS 滑条可能已改值）
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
              // ① 亮度级别（preference_key_brightness_level）：BrightnessLevelPreferenceController
              //    AVAILABLE；单一真源 = window.__qsBrightness 桥（QS 亮度滑条 body.filter 消费链）
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
              // ② 深色主题（dark_ui_mode）：DarkModePreference extends PrimarySwitchPreference；
              //    单一真源 = __settingsTheme（与快捷设置深色磁贴同向，v7.4x 既有链）；
              //    摘要 AutoDarkTheme.getStatus 默认 MODE_NIGHT_NO →
              //    dark_ui_summary_on/off_auto_mode_never「一律不自动关闭」/「永不自动开启」
              var dk = document.getElementById('dspDarkToggle');
              var dkSub = document.getElementById('dspDarkSub');
              if (dk && !dk._bound) {
                dk._bound = true;
                var syncDark = function() {
                  if (!window.__settingsTheme) return;
                  var dark = window.__settingsTheme.resolved() === 'dark';
                  (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(dk, dark); // #70（app-page-active 重同步路径，DOM 复用后几何对齐）
                  if (dkSub) dkSub.innerText = dark ? '一律不自动关闭' : '永不自动开启';
                };
                syncDark();
                dk.addEventListener('change', function() {
                  if (!window.__settingsTheme) { (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(dk, false); return; } // #70
                  window.__settingsTheme.set(dk.checked ? 'dark' : 'light');
                  syncDark();
                  showTip(dk.checked ? '已切换到深色方案' : '已切换到浅色方案');
                });
                if (!dk._themeWatch) {
                  dk._themeWatch = true;
                  bindDoc('settings', 'settings-theme-changed', syncDark);
                }
                // v8.11 #70 回归修复：v8.06 重构丢失的激活回同步（兄弟页 L538/683/2083/
                // 2767/3002 模式齐全，唯 display 缺）—— DOM 复用重进设置时 PAGE_SCRIPT
                // 不重跑，关闭期间被 QS 磁贴/控制中心改掉的主题真值无处刷新，
                // 即议题「不去动它，视觉就一直错着」的第二层缺口
                bindDoc('settings', 'app-page-active', function(e) {
                  if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 1) syncDark();
                });
              } else if (dk) {
                if (window.__settingsTheme) {
                  var darkNow = window.__settingsTheme.resolved() === 'dark';
                  (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(dk, darkNow); // #70
                  if (dkSub) dkSub.innerText = darkNow ? '一律不自动关闭' : '永不自动开启';
                }
              }
              // ③ 自动旋转屏幕（auto_rotate）：AutoRotatePreferenceController AVAILABLE
              //    （RotationPolicy.isRotationLockToggleVisible && !deviceState 折叠形态）；
              //    单一真源 = QS autorotate 磁贴（__qsTileState，v7.99 飞行模式同款接线）
              var rt = document.getElementById('dspRotateToggle');
              if (rt && !rt._bound) {
                rt._bound = true;
                if (window.__qsTileState) (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(rt, !!window.__qsTileState.get('autorotate')); // #70
                rt.addEventListener('change', function() {
                  var on = !!rt.checked;
                  if (window.__qsTileState) window.__qsTileState.sync('autorotate', { active: on });
                  showTip(on ? '自动旋转已开启' : '方向已锁定');
                });
              }
              // ④ 自动锁屏（screen_timeout）：ScreenTimeoutPreferenceController AVAILABLE；
              //    动态摘要 getTimeoutSummary = screen_timeout_summary「闲置 %1$s后」（store 真源，
              //    默认 def_screen_off_timeout=60000 →「闲置 1 分钟后」）
              var toSub = document.getElementById('dspTimeoutSub');
              if (toSub) toSub.innerText = timeoutSummary();
              // ⑤ 锁屏一言在线增强（#26 超越原生）：store 真源 ios-desktop:lock-quote-online
              //    （默认 '0' 关；断网可用为第一验收）→ 广播 lock-quote-online-changed，
              //    消费点 lock-quotes.js 即时切换在线/离线渲染；app-page-active 重同步走
              //    syncQuote（#70 纪律：DOM 复用重进设置页时 PAGE_SCRIPT 不重跑）
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
                    if (window.showSystemToast) window.showSystemToast(on ? '锁屏一言：在线增强已开启' : '锁屏一言：已使用离线诗词库');
                  });
                }
              }
              // v9.94 #35：息屏显示 AOD 开关（store.aod 单源；闲置时长复用 screen_timeout）
              // v9.94 修复：本块 v9.76 引入时误插在 initOnce 闭合括号之后且多补一括号，
              // 令 initOnce(); 调用反被吞进函数体 → 设置应用挂载即抛 SyntaxError
              //（Unexpected identifier 'initOnce'，潜伏 v9.76-v9.78 两窗；v33 e2e 走
              // 惰性 DOM 查未挂设置应用故漏检）——归位 initOnce 体内，闭合括号归一
              var at = document.getElementById('dspAodToggle');
              if (at && !at._bound) {
                at._bound = true;
                var syncAod = function() { var on = !!state.aod; (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b;})(at, on); };
                syncAod();
                at.addEventListener('change', function() {
                  store.set('aod', at.checked);
                  if (window.showSystemToast) window.showSystemToast(at.checked ? '息屏显示已开启：闲置或熄屏后常显时钟' : '息屏显示已关闭');
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