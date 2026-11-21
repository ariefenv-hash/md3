export const TEXT_READING_PAGE_SCRIPT=`
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
            function refresh() {
              var s = load();
              var fs = document.getElementById('a11yFontScale');
              var fsv = document.getElementById('a11yFontScaleVal');
              if (fs) fs.value = s.fontScale;
              if (fsv) fsv.textContent = s.fontScale + '%';
              var ds = document.getElementById('a11yDisplayScale');
              var dsv = document.getElementById('a11yDisplayScaleVal');
              if (ds) ds.value = s.displayScale;
              if (dsv) dsv.textContent = s.displayScale + '%';
              setSw('a11yBoldTextToggle', s.boldText);
              setSw('a11yHighContrastToggle', s.highContrastText);
              var pv = document.getElementById('a11yTextPreviewInner');
              if (pv) {
                pv.style.fontSize = (15 * s.fontScale / 100) + 'px';
                pv.style.zoom = String(s.displayScale / 100);
                pv.style.fontWeight = s.boldText ? '700' : '';
              }
            }
            function bind() {
              var fs = document.getElementById('a11yFontScale');
              if (fs && !fs.dataset.v1011Bound) {
                fs.dataset.v1011Bound = '1';
                fs.addEventListener('input', function() {
                  var s = load(); s.fontScale = Math.round(Number(fs.value)) || 100; save(s); applyAll(s); refresh();
                });
              }
              var ds = document.getElementById('a11yDisplayScale');
              if (ds && !ds.dataset.v1011Bound) {
                ds.dataset.v1011Bound = '1';
                ds.addEventListener('input', function() {
                  var s = load(); s.displayScale = Math.round(Number(ds.value)) || 100; save(s); applyAll(s); refresh();
                });
              }
              var bt = document.getElementById('a11yBoldTextToggle');
              if (bt && !bt.dataset.v1011Bound) {
                bt.dataset.v1011Bound = '1';
                bt.addEventListener('change', function() {
                  var s = load(); s.boldText = !!bt.checked; save(s); applyAll(s); refresh();
                });
              }
              var hc = document.getElementById('a11yHighContrastToggle');
              if (hc && !hc.dataset.v1011Bound) {
                hc.dataset.v1011Bound = '1';
                hc.addEventListener('change', function() {
                  var s = load(); s.highContrastText = !!hc.checked; save(s); applyAll(s); refresh();
                });
              }
              var rs = document.getElementById('a11yTextReadingReset');
              if (rs && !rs.dataset.v1011Bound) {
                rs.dataset.v1011Bound = '1';
                rs.addEventListener('click', function() {
                  var s = load();
                  s.fontScale = 100; s.displayScale = 100; s.boldText = false; s.highContrastText = false;
                  save(s); applyAll(s); refresh();
                });
              }
            }
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 33) { refresh(); bind(); }
            });
          })();
        `;
