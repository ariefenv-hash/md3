export const NOTIF_PAGE_SCRIPT=`
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var STORE_KEY = 'settings:notifications-v1';
            // v11.50 #206\uFF1AallowPrivate \u9ED8\u8BA4 true\u2192false\uFF08\u8BAE\u9898\u89C4\u683C\u9ED8\u8BA4\u300C\u9690\u85CF\u654F\u611F\u5185\u5BB9\u300D\uFF1B\u771F\u673A Pixel
            // \u51FA\u5382\u7ECF Setup Wizard \u6539\u5199\u4E3A\u9690\u85CF\u654F\u611F\u5185\u5BB9\u8BED\u4E49\uFF0CSystemUI getInt fallback 1 \u5DEE\u5F02\u5728\u5F55\uFF1B
            // aosp/notification-redaction.js LOCK_MODE_DEFAULTS \u540C\u6E90\u540C\u503C\u4E92\u951A\uFF0Cv801 \u9ED8\u8BA4\u503C\u951A\u540C\u6B65\u91CD\u951A\uFF09
            var DEFAULTS = { lockScreenShow: 1, allowPrivate: false, silentIcons: false, snooze: false, badging: true, assistant: true };
            // audit-B \u60EF\u4F8B\uFF1A\u901A\u77E5\u6807\u9898/\u6B63\u6587/\u5E94\u7528\u540D\u4E3A\u5E94\u7528\u53EF\u63A7\u6587\u672C\uFF0CinnerHTML \u524D\u5FC5\u987B\u8F6C\u4E49
            function escapeHtml(s) {
// v11.50 #240\uFF1A\u5355\u6E90\u59D4\u6258\u2014\u2014\u8F6C\u4E49\u5B9E\u73B0\u6536\u655B apps/_shared/sanitize.js escapeHtml\uFF08\u672C\u6587\u4EF6\u6B63\u5219\u94FE\u9000\u5F79\uFF0C\u8D1F\u5411\u951A tests/v240\uFF09
              return window.__mdEscape(s);
            }
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
            if (typeof window !== 'undefined' && !window.__settingsNotifsStore) {
              window.__settingsNotifsStore = { load: load, save: save, DEFAULTS: DEFAULTS };
            }
            // \u771F\u5B9E\u901A\u77E5\u6570\u636E\uFF08\u540C\u6E90\u76F4\u8BFB\uFF0Cnotifications.js MAX_PERSISTED \u6301\u4E45\u5316\u771F\u6E90\uFF09
            function realNotifs() {
              try {
                var a = JSON.parse(localStorage.getItem('ios-desktop:notifications'));
                return Array.isArray(a) ? a.filter(function(n) { return n && typeof n.title === 'string'; }) : [];
              } catch (e) { return []; }
            }
            function isConvo(n) { return window.__settingsCore.isConvo(n); }
            // getSummaryResource() \u4E09\u6001\u8BED\u4E49\uFF1A!show \u2192 disable\uFF1BallowPrivate \u2192 show\uFF1Belse hide
            function lockSummary(s) { return window.__settingsCore.lockSummary(s); }
            function setSw(id, on) { var sw = document.getElementById(id); (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, on); }
            function renderHistory() {
              var panel = document.getElementById('notifHistoryPanel');
              var listEl = document.getElementById('notifHistoryList');
              if (!panel || !listEl || panel.style.display === 'none') return;
              var list = realNotifs();
              if (!list.length) {
                listEl.innerHTML = '<div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:10px 12px;">\u6CA1\u6709\u8FD1\u671F\u901A\u77E5</div>';
                return;
              }
              listEl.innerHTML = list.map(function(n) {
                return '<div class="md3-list-item" style="min-height:60px;display:flex;flex-direction:column;justify-content:center;gap:2px;border-radius:16px;background:var(--md-surface-container,#f3f5f8);margin:4px 4px;">'
                  + '<span style="display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);"><span>' + escapeHtml(n.app || '') + '</span><span>' + escapeHtml(n.time || '') + '</span></span>'
                  + '<span style="font-size:14px;font-weight:500;">' + escapeHtml(n.title || '') + '</span>'
                  + (n.desc ? '<span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">' + escapeHtml(n.desc) + '</span>' : '')
                  + '</div>';
              }).join('');
            }
            function refresh() {
              var s = load();
              var list = realNotifs();
              var h = document.getElementById('notifHistorySub');
              if (h) h.textContent = list.length === 0 ? '\u6CA1\u6709\u8FD1\u671F\u901A\u77E5' : list.length + ' \u6761\u901A\u77E5';
              var convos = list.filter(isConvo);
              var c = document.getElementById('notifConvoSub');
              if (c) c.textContent = convos.length === 0 ? '\u6CA1\u6709\u4F18\u5148\u5BF9\u8BDD' : convos.length + ' \u4E2A\u4F18\u5148\u5BF9\u8BDD';
              var l = document.getElementById('notifLockSub');
              if (l) l.textContent = lockSummary(s);
              setSw('notifRedactToggle', s.allowPrivate);
              setSw('notifSilentToggle', s.silentIcons);
              setSw('notifSnoozeToggle', s.snooze);
              setSw('notifBadgingToggle', s.badging);
              setSw('notifAssistantToggle', s.assistant);
              renderHistory();
            }
            // lock_screen_notifications \u4E09\u9009\u5BF9\u8BDD\u6846\uFF08entries \u52A8\u6001\u6CE8\u5165\u8BED\u4E49\uFF09
            function paintDialogDots(s) {
              var current = !s.lockScreenShow ? 'disable' : (s.allowPrivate ? 'show' : 'hide');
              document.querySelectorAll('.notif-lock-opt').forEach(function(opt) {
                var dot = opt.querySelector('.notif-opt-dot');
                var on = opt.getAttribute('data-opt') === current;
                if (dot) dot.innerHTML = on ? '<span style="width:10px;height:10px;border-radius:50%;background:var(--md-primary,#0b57d0);"></span>' : '';
              });
            }
            window.__notifLockChoose = function() {
              var dlg = document.getElementById('notifLockDialog');
              if (!dlg) return;
              paintDialogDots(load());
              dlg.style.display = 'flex';
            };
            window.__notifLockClose = function(ev) {
              if (ev && ev.target && ev.target.closest && ev.target.closest('.notif-lock-opt')) return;
              var dlg = document.getElementById('notifLockDialog');
              if (dlg) dlg.style.display = 'none';
            };
            window.__notifLockPick = function(opt) {
              var s = load();
              if (opt === 'show') { s.lockScreenShow = 1; s.allowPrivate = true; }
              else if (opt === 'hide') { s.lockScreenShow = 1; s.allowPrivate = false; }
              else if (opt === 'disable') { s.lockScreenShow = 0; }
              save(s);
              var dlg = document.getElementById('notifLockDialog');
              if (dlg) dlg.style.display = 'none';
              refresh();
            };
            window.__notifHistoryToggle = function() {
              var panel = document.getElementById('notifHistoryPanel');
              var ch = document.getElementById('notifHistoryChevron');
              if (!panel) return;
              var show = panel.style.display === 'none';
              panel.style.display = show ? '' : 'none';
              if (ch) ch.style.transform = show ? 'rotate(90deg)' : '';
              if (show) renderHistory();
            };
            function bind() {
              var sw = document.getElementById('notifRedactToggle');
              if (sw && !sw.dataset.v801Bound) {
                sw.dataset.v801Bound = '1';
                sw.addEventListener('change', function() {
                  var s = load();
                  s.allowPrivate = !!sw.checked;
                  if (!s.lockScreenShow) s.lockScreenShow = 1; // \u5B8C\u5168\u4E0D\u663E\u793A\u65F6\u9009\u654F\u611F\u5F00\u5173 = \u56DE\u5230\u663E\u793A\u7B56\u7565\uFF08AOSP \u8054\u52A8\u8BED\u4E49\uFF09
                  save(s); refresh();
                });
              }
              [['notifSilentToggle', 'silentIcons'], ['notifSnoozeToggle', 'snooze'],
               ['notifBadgingToggle', 'badging'], ['notifAssistantToggle', 'assistant']].forEach(function(pair) {
                var el = document.getElementById(pair[0]);
                if (el && !el.dataset.v801Bound) {
                  el.dataset.v801Bound = '1';
                  el.addEventListener('change', function() {
                    var s = load();
                    s[pair[1]] = !!el.checked;
                    save(s);
                  });
                }
              });
              var dlg = document.getElementById('notifLockDialog');
              if (dlg && !dlg.dataset.v801Bound) {
                dlg.dataset.v801Bound = '1';
                dlg.addEventListener('click', window.__notifLockClose);
              }
              document.querySelectorAll('.notif-lock-opt').forEach(function(opt) {
                if (opt.dataset.v801Bound) return;
                opt.dataset.v801Bound = '1';
                opt.addEventListener('click', function() { window.__notifLockPick(opt.getAttribute('data-opt')); });
              });
              // \u771F\u5B9E\u6570\u636E\u53D8\u66F4\u5E7F\u64AD\uFF08notifications.js scheduleNotificationsChanged \u6D3E\u53D1\uFF09
              if (!window.__notifPageV801DocBound) {
                window.__notifPageV801DocBound = true;
                window.addEventListener('notifications-changed', function() {
                  var panel = document.getElementById('notifHistoryPanel');
                  var inPage = document.getElementById('notifHistorySub');
                  if (inPage || (panel && panel.style.display !== 'none')) refresh();
                });
              }
            }
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 19) { refresh(); bind(); }
            });
          })();
        `;
