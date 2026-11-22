export const A11Y_PAGE_SCRIPT=`
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var STORE_KEY = 'settings:accessibility-v1';
            // v11.50 #105\uFF1ADEFAULTS \u6269\u5C55\uFF08\u952E\u5E8F\u4E0E ios-desktop/js/aosp/a11y-settings.js
            // A11Y_STORE_DEFAULTS \u5355\u4E00\u771F\u6E90\u5BF9\u9F50\u2014\u2014\u6587\u672C\u5B88\u62A4\u6D4B\u8BD5\u5BF9\u8D26\u6F02\u79FB\u5373\u7EA2\uFF09
            var DEFAULTS = { rbc: false, audioDescription: false, removeAnimations: false, colorInversion: false, daltonizerEnabled: false, daltonizerMode: 12, daltonizerSaturation: 7, fontScale: 100, displayScale: 100, boldText: false, highContrastText: false };
            function load() {
              var s = {};
              try {
                var v = JSON.parse(localStorage.getItem(STORE_KEY));
                if (v && typeof v === 'object') { for (var k in DEFAULTS) { if (k in v) s[k] = v[k]; } }
              } catch (e) {}
              var out = {};
              for (var k2 in DEFAULTS) out[k2] = (k2 in s) ? s[k2] : DEFAULTS[k2];
              return out;
            }
            function save(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }
            if (typeof window !== 'undefined' && !window.__settingsA11yStore) {
              window.__settingsA11yStore = { load: load, save: save, DEFAULTS: DEFAULTS };
            }
            // \u8D85\u8D8A\u70B9\uFF1A\u6781\u6697 CSS filter \u771F\u5B9E\u73B0\uFF08html \u5C42\u72EC\u7ACB\u4E8E body.filter \u4EAE\u5EA6\u94FE\uFF0C\u4E58\u6CD5\u5408\u6210\uFF09\u3002
            // v11.50 #105\uFF1Ahtml.style.filter \u6536\u53E3\u5355\u5199\u70B9\u2014\u2014RBC/\u8272\u5F69\u6821\u6B63/\u989C\u8272\u53CD\u8F6C\u7ECF
            // a11y-apply.js applyA11yRuntime \u5408\u6210\u94FE\u7EDF\u4E00\u5199\uFF08\u6563\u5199\u70B9\u4E92\u8E29\u9000\u5F79\uFF09\uFF1B
            // a11y-apply \u7F3A\u5E2D\u65F6\u4FDD\u7559 v8.02 \u76F4\u5199\u964D\u7EA7\u8DEF\u5F84\uFF08\u9875\u811A\u672C\u72EC\u7ACB\u53EF\u6D3B\uFF09\u3002
            function applyRbc(on) {
              var el = document.documentElement;
              if (window.__a11yApplyRuntime) { window.__a11yApplyRuntime(window.__settingsA11yStore ? window.__settingsA11yStore.load() : { rbc: !!on }); return; }
              el.style.transition = 'filter .25s ease';
              el.style.filter = on ? 'brightness(0.5)' : '';
            }
            function setSw(id, on) { var sw = document.getElementById(id); (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, on); }
            function refresh() {
              var s = load();
              setSw('a11yRbcToggle', s.rbc);
              setSw('a11yAudioDescToggle', s.audioDescription);
              applyRbc(s.rbc);
            }
            function bind() {
              var rbc = document.getElementById('a11yRbcToggle');
              if (rbc && !rbc.dataset.v802Bound) {
                rbc.dataset.v802Bound = '1';
                rbc.addEventListener('change', function() {
                  var s = load();
                  s.rbc = !!rbc.checked; // Secure REDUCE_BRIGHT_COLORS_ACTIVATED 1/0
                  save(s);
                  applyRbc(s.rbc);
                });
              }
              var ad = document.getElementById('a11yAudioDescToggle');
              if (ad && !ad.dataset.v802Bound) {
                ad.dataset.v802Bound = '1';
                ad.addEventListener('change', function() {
                  var s = load();
                  s.audioDescription = !!ad.checked; // persistent=false \u4EC5\u4F1A\u8BDD\u5185\u72B6\u6001
                  save(s);
                });
              }
            }
            window.__a11yRbcChange = function(sw) {
              var s = load();
              s.rbc = !!sw.checked;
              save(s);
              applyRbc(s.rbc);
            };
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 20) { refresh(); bind(); }
            });
          })();
        `;
