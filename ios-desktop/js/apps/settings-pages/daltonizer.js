export const DALTONIZER_PAGE_SCRIPT=`
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
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
            function applyAll(s) { if (window.__a11yApplyRuntime) { window.__a11yApplyRuntime(s); } }
            function setSw(id, on) { var sw = document.getElementById(id); (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, on); }
            var UNAVAILABLE = '\u5728\u7070\u5EA6\u6A21\u5F0F\u4E0B\u6216\u201C\u8272\u5F69\u6821\u6B63\u201D\u529F\u80FD\u5DF2\u505C\u7528\u65F6\u4E0D\u53EF\u7528';
            function syncSaturation(s) {
              var sat = document.getElementById('a11yDaltonizerSat');
              var satVal = document.getElementById('a11yDaltonizerSatVal');
              var satSub = document.getElementById('a11yDaltonizerSatSub');
              var row = document.getElementById('a11yDaltonizerSatRow');
              if (!sat) return;
              var usable = s.daltonizerEnabled && s.daltonizerMode !== 0;
              sat.disabled = !usable;
              if (row) row.style.opacity = usable ? '1' : '0.45';
              if (satVal) satVal.textContent = usable ? (s.daltonizerSaturation + '/10') : '\u2014';
              if (satSub) satSub.textContent = usable ? '' : UNAVAILABLE;
            }
            function refresh() {
              var s = load();
              setSw('a11yDaltonizerToggle', s.daltonizerEnabled);
              var radios = document.querySelectorAll('input[name=a11yDaltonizerMode]');
              for (var i = 0; i < radios.length; i++) radios[i].checked = (Number(radios[i].value) === Number(s.daltonizerMode));
              var sat = document.getElementById('a11yDaltonizerSat');
              if (sat) sat.value = s.daltonizerSaturation;
              syncSaturation(s);
              var prev = document.getElementById('a11yDaltonizerPalette');
              if (prev) prev.style.filter = window.__a11yApplyRuntime ? (s.daltonizerEnabled ? (s.daltonizerMode === 0 ? 'grayscale(1)' : 'url(#a11y-daltonizer-' + ({12:'deuteranomaly',11:'protanomaly',13:'tritanomaly'})[s.daltonizerMode] + ') saturate(' + (s.daltonizerSaturation / 10) + ')') : 'none') : 'none';
            }
            function bind() {
              var tg = document.getElementById('a11yDaltonizerToggle');
              if (tg && !tg.dataset.v1011Bound) {
                tg.dataset.v1011Bound = '1';
                tg.addEventListener('change', function() {
                  var s = load(); s.daltonizerEnabled = !!tg.checked; save(s); applyAll(s); refresh();
                });
              }
              var radios = document.querySelectorAll('input[name=a11yDaltonizerMode]');
              for (var i = 0; i < radios.length; i++) {
                (function(r) {
                  if (r.dataset.v1011Bound) return;
                  r.dataset.v1011Bound = '1';
                  r.addEventListener('change', function() {
                    var s = load(); s.daltonizerMode = Number(r.value); save(s); applyAll(s); refresh();
                  });
                })(radios[i]);
              }
              var sat = document.getElementById('a11yDaltonizerSat');
              if (sat && !sat.dataset.v1011Bound) {
                sat.dataset.v1011Bound = '1';
                sat.addEventListener('input', function() {
                  var s = load(); s.daltonizerSaturation = Math.round(Number(sat.value)) || 7; save(s); applyAll(s); syncSaturation(s);
                  var prev = document.getElementById('a11yDaltonizerPalette');
                  if (prev && s.daltonizerEnabled && s.daltonizerMode !== 0) prev.style.filter = 'url(#a11y-daltonizer-' + ({12:'deuteranomaly',11:'protanomaly',13:'tritanomaly'})[s.daltonizerMode] + ') saturate(' + (s.daltonizerSaturation / 10) + ')';
                });
              }
            }
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 34) { refresh(); bind(); }
            });
          })();
        `;
