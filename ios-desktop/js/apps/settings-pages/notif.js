// ==================== settings-pages/notif.js — 页 19 通知（NOTIF_PAGE_SCRIPT 单源真身 · #284 批 7） ====================
//
// #284 批 7（v11.27）：NOTIF_PAGE_SCRIPT 常量自 settings.js 整体搬迁至此——
// boundary-map §3.1 候选表顺位（用户 2026-11-13 裁决「本侧接手重做」实施卷；页 19 通知
// v8.01 #10 四期 configure_notification_settings.xml 1:1，簇块 167 行 = 头注考证链 7 行 +
// 模板串 160 行，余九簇现存块首位）。G2 单源桥接禁双轨：本文件 = 常量唯一真源（export），
// settings.js 经 import 消费同一份；负向锚守护 = tests/notifications-subpage.test.js
// 「G2 单源桥接」组（settings.js 本体零 const NOTIF_PAGE_SCRIPT 残留，批 2-6 互指纪律同款）。
// 运行语义零漂移：settingsApp 页注册表 `<script>` + NOTIF_PAGE_SCRIPT + `</script>`
// 拼接面逐字节不变（消费点 = settings.js 页 19 content 尾段原位）；簇模板串零 `${` 插值
// （boundary-map §3.1 拆分风险注记核查：NOTIF 簇自包含 IIFE，桥接全走 window.* 宿主面
// —— __bindAppDocListener / __mdEscape（v11.27 #240 单源委托）/ __settingsCore.lockSummary
// （v11.27 #206 委托）/ __settingsNotifsStore（单一真源，定义于簇内），迁移零委托行）。
export const NOTIF_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var STORE_KEY = 'settings:notifications-v1';
            // v11.27 #206：allowPrivate 默认 true→false（议题规格默认「隐藏敏感内容」；真机 Pixel
            // 出厂经 Setup Wizard 改写为隐藏敏感内容语义，SystemUI getInt fallback 1 差异在录；
            // aosp/notification-redaction.js LOCK_MODE_DEFAULTS 同源同值互锚，v801 默认值锚同步重锚）
            var DEFAULTS = { lockScreenShow: 1, allowPrivate: false, silentIcons: false, snooze: false, badging: true, assistant: true };
            // audit-B 惯例：通知标题/正文/应用名为应用可控文本，innerHTML 前必须转义
            function escapeHtml(s) {
// v11.27 #240：单源委托——转义实现收敛 apps/_shared/sanitize.js escapeHtml（本文件正则链退役，负向锚 tests/v240）
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
            // 真实通知数据（同源直读，notifications.js MAX_PERSISTED 持久化真源）
            function realNotifs() {
              try {
                var a = JSON.parse(localStorage.getItem('ios-desktop:notifications'));
                return Array.isArray(a) ? a.filter(function(n) { return n && typeof n.title === 'string'; }) : [];
              } catch (e) { return []; }
            }
            function isConvo(n) { return window.__settingsCore.isConvo(n); }
            // getSummaryResource() 三态语义：!show → disable；allowPrivate → show；else hide
            function lockSummary(s) { return window.__settingsCore.lockSummary(s); }
            function setSw(id, on) { var sw = document.getElementById(id); (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, on); }
            function renderHistory() {
              var panel = document.getElementById('notifHistoryPanel');
              var listEl = document.getElementById('notifHistoryList');
              if (!panel || !listEl || panel.style.display === 'none') return;
              var list = realNotifs();
              if (!list.length) {
                listEl.innerHTML = '<div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:10px 12px;">没有近期通知</div>';
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
              if (h) h.textContent = list.length === 0 ? '没有近期通知' : list.length + ' 条通知';
              var convos = list.filter(isConvo);
              var c = document.getElementById('notifConvoSub');
              if (c) c.textContent = convos.length === 0 ? '没有优先对话' : convos.length + ' 个优先对话';
              var l = document.getElementById('notifLockSub');
              if (l) l.textContent = lockSummary(s);
              setSw('notifRedactToggle', s.allowPrivate);
              setSw('notifSilentToggle', s.silentIcons);
              setSw('notifSnoozeToggle', s.snooze);
              setSw('notifBadgingToggle', s.badging);
              setSw('notifAssistantToggle', s.assistant);
              renderHistory();
            }
            // lock_screen_notifications 三选对话框（entries 动态注入语义）
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
                  if (!s.lockScreenShow) s.lockScreenShow = 1; // 完全不显示时选敏感开关 = 回到显示策略（AOSP 联动语义）
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
              // 真实数据变更广播（notifications.js scheduleNotificationsChanged 派发）
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

