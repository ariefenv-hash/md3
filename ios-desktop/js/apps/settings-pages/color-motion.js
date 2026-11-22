export const COLOR_MOTION_PAGE_SCRIPT=`
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, f === 'change' ? o : o); };
            var STORE_KEY = 'settings:accessibility-v1';
            var DEFAULTS = { rbc: false, audioDescription: false, removeAnimations: false, colorInversion: false, daltonizerEnabled: false, daltonizerMode: 12, daltonizerSaturation: 7, fontScale: 100, displayScale: 100, boldText: false, highContrastText: false };
            function load() {
              var s = {};
              try { var v = JSON.parse(localStorage.getItem(STORE_KEY)); if (v && typeof v === 'object') { for (var k in DEFAULTS) { if (k in v) s[k] = v[k]; } } } catch (e) {}
              var out = {};
              for (var k2 in DEFAULTS) out[k2] = (k2 in s) ? s[k2] : DEFAULTS[k2];
              return out;
            }
            function save(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }
            if (typeof window !== 'undefined' && !window.__settingsA11yStore) {
              window.__settingsA11yStore = { load: load, save: save, DEFAULTS: DEFAULTS };
            }
            // \u5E94\u7528\u6536\u53E3\uFF1A\u5168\u91CF\u6001\u8D70 a11y-apply.js applyA11yRuntime\uFF08html \u5C5E\u6027 + filter \u5408\u6210\u5355\u5199\u70B9\uFF09\uFF1B
            // \u6865\u7F3A\u5E2D\u964D\u7EA7 = \u76F4\u5199\u5C5E\u6027\uFF08\u9875\u811A\u672C\u72EC\u7ACB\u53EF\u6D3B\uFF09
            function applyAll(s) {
              if (window.__a11yApplyRuntime) { window.__a11yApplyRuntime(s); return; }
              var el = document.documentElement;
              if (s.removeAnimations) el.setAttribute('data-a11y-reduce-motion', ''); else el.removeAttribute('data-a11y-reduce-motion');
              try { document.dispatchEvent(new CustomEvent('a11y-reduce-motion-changed', { detail: { active: !!s.removeAnimations } })); } catch (e) {}
              el.style.filter = (s.colorInversion ? 'invert(1) hue-rotate(180deg)' : (s.rbc ? 'brightness(0.5)' : ''));
            }
            function setSw(id, on) { var sw = document.getElementById(id); (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, on); }
            var MODE_TITLES = { 12: '\u7EA2\u7EFF\u8272\u76F2\u3001\u7EFF\u8272\u5F31', 11: '\u7EA2\u7EFF\u8272\u76F2\u3001\u7EA2\u8272\u5F31', 13: '\u84DD\u9EC4\u8272\u76F2', 0: '\u7070\u5EA6\u6A21\u5F0F' };
            function refresh() {
              var s = load();
              setSw('a11yColorInvertToggle', s.colorInversion);
              setSw('a11yRemoveAnimToggle', s.removeAnimations);
              var cc = document.getElementById('a11yColorCorrectionSub');
              if (cc) cc.textContent = s.daltonizerEnabled ? (MODE_TITLES[s.daltonizerMode] || '\u5DF2\u5F00\u542F') : '\u5DF2\u5173\u95ED';
            }
            function bind() {
              var inv = document.getElementById('a11yColorInvertToggle');
              if (inv && !inv.dataset.v1011Bound) {
                inv.dataset.v1011Bound = '1';
                inv.addEventListener('change', function() {
                  var s = load(); s.colorInversion = !!inv.checked; save(s); applyAll(s);
                });
              }
              var rm = document.getElementById('a11yRemoveAnimToggle');
              if (rm && !rm.dataset.v1011Bound) {
                rm.dataset.v1011Bound = '1';
                rm.addEventListener('change', function() {
                  var s = load(); s.removeAnimations = !!rm.checked; save(s); applyAll(s);
                });
              }
            }
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 32) { refresh(); bind(); }
            });
          })();
        `;
