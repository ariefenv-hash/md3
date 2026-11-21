export const APPS_PAGE_SCRIPT=`
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            function esc(s) {
// v11.50 #240\uFF1A\u5355\u6E90\u59D4\u6258\u2014\u2014\u8F6C\u4E49\u5B9E\u73B0\u6536\u655B apps/_shared/sanitize.js escapeHtml\uFF08\u672C\u6587\u4EF6\u6B63\u5219\u94FE\u9000\u5F79\uFF0C\u8D1F\u5411\u951A tests/v240\uFF09
              return window.__mdEscape(s);
            }
            // InstalledAppCounter \u540C\u6784\uFF1ApagesApps \u62CD\u5E73\uFF08folder.apps \u6210\u5458\u8BA1\u5165\uFF09+ id \u53BB\u91CD
            function registry() {
              var map = {};
              var st = window.__state;
              if (st && Array.isArray(st.pagesApps)) {
                st.pagesApps.forEach(function(page) {
                  (page || []).forEach(function(a) {
                    if (!a || !a.id || map[a.id]) return;
                    if (a.type === 'folder') {
                      (a.apps || []).forEach(function(x) { if (x && x.id && !map[x.id]) map[x.id] = x; });
                      return;
                    }
                    map[a.id] = a;
                  });
                });
              }
              return map;
            }
            // ListFormatter.getInstance().format(zh) \u540C\u6784\uFF1A2 \u9879\u300CA\u548CB\u300D\u30013+ \u9879\u300CA\u3001B\u548CC\u300D
            function zhList(arr) {
              if (!arr.length) return '';
              if (arr.length === 1) return arr[0];
              return arr.slice(0, -1).join('\u3001') + '\u548C' + arr[arr.length - 1];
            }
            function render() {
              var cat = document.getElementById('appsRecentCategory');
              var box = document.getElementById('appsRecentList');
              var allRow = document.getElementById('appsAllInfoRow');
              var seeAll = document.getElementById('appsSeeAllTitle');
              var allSub = document.getElementById('appsAllInfoSub');
              var defSub = document.getElementById('appsDefaultSub');
              var unusedSub = document.getElementById('appsUnusedSub');
              if (!cat || !box || !allRow) return;
              var map = registry();
              var ids = Object.keys(map);
              var recentAll = (window.__settingsAppsBridge && window.__settingsAppsBridge.recent() || [])
                .filter(function(id) { return !!map[id]; }); // appEntry == null \u2192 continue \u540C\u6784
              var shown = recentAll.slice(0, 4); // SHOW_RECENT_APP_COUNT = 4
              if (shown.length) {
                cat.style.display = '';
                allRow.style.display = 'none';
                box.innerHTML = shown.map(function(id) {
                  var app = map[id];
                  return '<div class="md3-list-item" role="button" tabindex="0" data-test="apps-recent-row" data-app-id="' + esc(id) + '" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">' +
                    '<span style="width:40px;height:40px;border-radius:11px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(id) + '</span>' +
                    '<span style="flex:1;min-width:0;font-size:15px;color:var(--md-on-surface,#e2e2e9);">' + esc(app.name || id) + '</span>' +
                    '</div>';
                }).join('');
                // loadAllAppsCount\uFF1Asee_all_apps_title ICU \u590D\u6570\uFF08zh\uFF1A=1 \u65E0\u8BA1\u6570\uFF0Cother \u5E26 # \uFF09
                if (seeAll) seeAll.textContent = ids.length === 1 ? '\u67E5\u770B\u6240\u6709\u5E94\u7528' : '\u67E5\u770B\u6240\u6709 ' + ids.length + ' \u4E2A\u5E94\u7528';
              } else {
                // \u7A7A\u6001\u5206\u652F\uFF1A\u4EC5 all_app_infos + apps_summary
                cat.style.display = 'none';
                allRow.style.display = '';
                if (allSub) allSub.textContent = '\u5DF2\u5B89\u88C5 ' + ids.length + ' \u4E2A\u5E94\u7528';
              }
              // DefaultAppsPreferenceController.getSummary\uFF1ARoleManager \u6D4F\u89C8\u5668/\u62E8\u53F7\u5668/\u77ED\u4FE1
              // \u4E09\u89D2\u8272\u4F9D\u5E8F\u53D6\u6807\u7B7E\uFF0C\u7A7A\u6807\u7B7E\u8DF3\u8FC7\uFF08TextUtils.isEmpty \u5224\u7A7A\u540C\u6784\uFF09\u540E ListFormatter \u8FDE\u63A5
              if (defSub) {
                var roleIds = ['safari', 'phone', 'msg'];
                var labels = roleIds.map(function(id) { return map[id] && map[id].name; })
                  .filter(function(n) { return !!n; });
                defSub.textContent = labels.length ? zhList(labels) : '';
              }
              // HibernatedAppsPreferenceController\uFF1Aunused_apps_summary\u300CN \u4E2A\u95F2\u7F6E\u5E94\u7528\u300D
              // \uFF08\u6A21\u62DF\u6620\u5C04 = \u5DF2\u5B89\u88C5\u96C6\u5408 \u2212 \u6700\u8FD1\u4F7F\u7528\u8BB0\u5F55\u5168\u96C6\u4EA4\u96C6\uFF0C\u542B\u672A\u8FDB\u524D 4 \u7684\u8BB0\u5F55\uFF09
              if (unusedSub) {
                var recentSet = {};
                recentAll.forEach(function(id) { recentSet[id] = 1; });
                var unused = ids.filter(function(id) { return !recentSet[id]; }).length;
                unusedSub.textContent = unused + ' \u4E2A\u95F2\u7F6E\u5E94\u7528';
              }
            }
            // ==================== v11.50 #219\uFF1A\u5E94\u7528\u4FE1\u606F\u5E95\u90E8\u5F39\u5C42\uFF08AppInfo Storage & cache \u5BF9\u6807\uFF09 ====================
            // \u6570\u636E\u9762\u771F\u6E90 = window.__appDataRegistry\uFF08app-data-registry.js \u767B\u8BB0\u8868\uFF09\uFF1B
            // \u6E05\u9664\u6570\u636E = \u5FEB\u7167 \u2192 \u9010\u952E\u6E05\u9664\uFF08\u4FDD\u62A4\u9762\u6C38\u4E0D\u89E6\u78B0\uFF09\u2192 5s \u64A4\u9500\u7A97\uFF08\u5FEB\u7167\u56DE\u6EDA\uFF0C#238 \u540C\u6B3E\uFF09\uFF1B
            // \u6E05\u9664\u7F13\u5B58 = \u767B\u8BB0\u8868\u7F13\u5B58\u9762\u5982\u5B9E\u5448\u73B0\uFF08\u672C\u7248\u4E3A\u7A7A \u2192 \u300C\u65E0\u7F13\u5B58\u53EF\u6E05\u9664\u300D\uFF0C\u4E0D\u9020\u6570\uFF09\u3002
            var R = window.__appDataRegistry;
            var adrSheet = null, adrApp = null, adrSnap = null, adrUndoTimer = null, adrLeft = 0;
            function adrEnsure() {
              if (adrSheet && adrSheet.isConnected) return adrSheet;
              adrSheet = document.createElement('div');
              adrSheet.setAttribute('data-test', 'apps-appinfo-sheet');
              adrSheet.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;';
              adrSheet.innerHTML =
                '<div class="adr-scrim" data-test="appinfo-scrim" style="position:absolute;inset:0;background:rgba(0,0,0,.5);"></div>' +
                '<div class="adr-panel" role="dialog" aria-modal="true" data-test="appinfo-panel" style="position:absolute;left:0;right:0;bottom:0;background:var(--md-surface-container-low,var(--md-surface,#1b1b1f));border-radius:28px 28px 0 0;padding:16px 20px 24px;max-height:72%;overflow:auto;transform:translateY(100%);transition:transform .28s cubic-bezier(.2,0,0,1);">' +
                  '<div style="width:32px;height:4px;border-radius:2px;background:var(--md-on-surface-variant,#9a9b9e);opacity:.4;margin:0 auto 12px;"></div>' +
                  '<div style="display:flex;align-items:center;gap:14px;">' +
                    '<span class="adr-icon" style="width:44px;height:44px;border-radius:12px;overflow:hidden;flex-shrink:0;"></span>' +
                    '<span class="adr-name" data-test="appinfo-app-name" style="font-size:17px;font-weight:600;color:var(--md-on-surface,#e2e2e9);flex:1;min-width:0;"></span>' +
                  '</div>' +
                  '<div class="adr-body" data-test="appinfo-body">' +
                    '<div class="adr-summary" data-test="appinfo-storage-summary" style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);margin:10px 0 14px;line-height:1.7;"></div>' +
                    '<div class="adr-undo" data-test="appinfo-undo-bar" style="display:none;align-items:center;gap:10px;margin:0 0 14px;padding:10px 14px;border-radius:14px;background:var(--md-surface-container,var(--md-surface,#222226));font-size:13px;color:var(--md-on-surface,#e2e2e9);">' +
                      '<span class="adr-undo-msg" style="flex:1;"></span>' +
                      '<button class="adr-undo-btn" data-test="appinfo-undo-btn" style="padding:6px 14px;border-radius:9999px;border:none;background:transparent;color:var(--md-primary,#a8c8ff);font-size:13px;font-weight:600;cursor:pointer;">\u64A4\u9500</button>' +
                    '</div>' +
                    '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
                      '<button class="adr-clear-data" data-test="appinfo-clear-data" style="padding:9px 20px;border-radius:9999px;border:none;background:var(--md-primary,#a8c8ff);color:var(--md-on-primary,#0a3050);font-size:13px;font-weight:600;cursor:pointer;">\u6E05\u9664\u6570\u636E</button>' +
                      '<button class="adr-clear-cache" data-test="appinfo-clear-cache" style="padding:9px 20px;border-radius:9999px;border:none;background:var(--md-secondary-container,#3f4757);color:var(--md-on-secondary-container,#dce3f2);font-size:13px;font-weight:600;cursor:pointer;">\u6E05\u9664\u7F13\u5B58</button>' +
                      '<button class="adr-close" data-test="appinfo-close" style="padding:9px 20px;border-radius:9999px;border:none;background:transparent;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;font-weight:600;cursor:pointer;">\u5173\u95ED</button>' +
                    '</div>' +
                  '</div>' +
                  '<div class="adr-confirm" data-test="appinfo-confirm" style="display:none;">' +
                    '<div style="font-size:16px;font-weight:600;color:var(--md-on-surface,#e2e2e9);margin:10px 0 6px;">\u6E05\u9664\u6570\u636E\uFF1F</div>' +
                    '<div class="adr-confirm-desc" style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;margin-bottom:16px;"></div>' +
                    '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
                      '<button class="adr-cancel" data-test="appinfo-cancel" style="padding:9px 20px;border-radius:9999px;border:none;background:transparent;color:var(--md-primary,#a8c8ff);font-size:13px;font-weight:600;cursor:pointer;">\u53D6\u6D88</button>' +
                      '<button class="adr-confirm-btn" data-test="appinfo-confirm-btn" style="padding:9px 20px;border-radius:9999px;border:none;background:var(--md-error,#ffb4ab);color:var(--md-on-error,#601410);font-size:13px;font-weight:600;cursor:pointer;">\u6E05\u9664</button>' +
                    '</div>' +
                  '</div>' +
                '</div>';
              document.body.appendChild(adrSheet);
              var panel = adrSheet.querySelector('.adr-panel');
              function open() { adrSheet.style.display = 'block'; requestAnimationFrame(function() { panel.style.transform = 'translateY(0)'; }); if (window.__mdDialogA11y) window.__mdDialogA11y.open(adrSheet, { onClose: close }); } // #241 \u957F\u5C3E1\uFF1A\u58F3\u5C42\u52A8\u6001 sheet \u7C3F\u8BB0\uFF08Esc \u53EF\u5173+\u7126\u70B9\u9677\u9631+\u7126\u70B9\u6062\u590D\uFF0Cscrim/close \u53CC\u94AE\u8DEF\u5F84\u7ECF onClose \u5E42\u7B49\u51FA\u6808\uFF09
              function close() {
                if (window.__mdDialogA11y) window.__mdDialogA11y.close(adrSheet); // #241 \u957F\u5C3E1\uFF1A\u7C3F\u8BB0\u51FA\u6808+\u7126\u70B9\u8FD8\u539F\uFF08\u672A\u7C3F\u8BB0\u5E42\u7B49\u96F6\u526F\u4F5C\u7528\uFF09
                panel.style.transform = 'translateY(100%)';
                if (adrUndoTimer) { clearInterval(adrUndoTimer); adrUndoTimer = null; }
                setTimeout(function() { if (adrSheet && !adrSheet.isConnected) return; adrSheet.style.display = 'none'; }, 300);
              }
              adrSheet.__close = close;
              adrSheet.querySelector('.adr-scrim').addEventListener('click', close);
              adrSheet.querySelector('.adr-close').addEventListener('click', close);
              // \u89C6\u56FE\u5207\u6362\uFF1A\u4E3B\u89C6\u56FE \u2194 \u786E\u8BA4\u89C6\u56FE
              function showConfirm(on) {
                adrSheet.querySelector('.adr-body').style.display = on ? 'none' : '';
                adrSheet.querySelector('.adr-confirm').style.display = on ? '' : 'none';
              }
              adrSheet.querySelector('.adr-clear-data').addEventListener('click', function() {
                var t = adrApp ? (adrApp.name || adrApp.id) : '';
                adrSheet.querySelector('.adr-confirm-desc').textContent =
                  '\u5C06\u6E05\u9664\u300C' + t + '\u300D\u7684\u5168\u90E8\u5E94\u7528\u6570\u636E\uFF08\u767B\u8BB0\u8868\u9A71\u52A8\u9010\u952E\u6E05\u9664\uFF1B\u684C\u9762\u58F3/\u58C1\u7EB8/\u5B57\u4F53/\u5171\u4EAB\u5A92\u4F53\u5B58\u50A8\u4E0D\u5728\u6E05\u9664\u8303\u56F4\uFF09\u3002\u6E05\u9664\u540E 5 \u79D2\u5185\u53EF\u64A4\u9500\u3002';
                showConfirm(true);
              });
              adrSheet.querySelector('.adr-cancel').addEventListener('click', function() { showConfirm(false); });
              adrSheet.querySelector('.adr-confirm-btn').addEventListener('click', function() {
                showConfirm(false);
                var id = adrApp && adrApp.id;
                if (!R || !id) return;
                R.snapshotAppData(id).then(function(snap) {
                  adrSnap = snap;
                  return R.clearAppData(id);
                }).then(function(res) {
                  // \u64A4\u9500\u7A97\uFF08#238 \u540C\u6B3E 5s\uFF09\uFF1A\u5FEB\u7167\u7559\u5B58\uFF0C\u5012\u8BA1\u65F6\u5F52\u96F6\u5F03\u5FEB\u7167
                  var bar = adrSheet.querySelector('.adr-undo');
                  bar.style.display = 'flex';
                  adrSheet.querySelector('.adr-undo-msg').textContent =
                    '\u5DF2\u6E05\u9664 ' + res.lsRemoved + ' \u9879\u672C\u5730\u6570\u636E' + (res.idbRemoved ? '\u3001' + res.idbRemoved + ' \u9879\u5927\u6587\u4EF6\u6570\u636E' : '');
                  adrLeft = 5;
                  var btn = adrSheet.querySelector('.adr-undo-btn');
                  btn.textContent = '\u64A4\u9500 (5)';
                  if (adrUndoTimer) clearInterval(adrUndoTimer);
                  adrUndoTimer = setInterval(function() {
                    adrLeft--;
                    if (adrLeft <= 0) { clearInterval(adrUndoTimer); adrUndoTimer = null; adrSnap = null; bar.style.display = 'none'; return; }
                    btn.textContent = '\u64A4\u9500 (' + adrLeft + ')';
                  }, 1000);
                  adrRefreshSummary();
                }).catch(function() { showConfirm(false); });
              });
              adrSheet.querySelector('.adr-undo-btn').addEventListener('click', function() {
                if (!adrSnap || !R) return;
                if (adrUndoTimer) { clearInterval(adrUndoTimer); adrUndoTimer = null; }
                var snap = adrSnap; adrSnap = null;
                R.restoreAppData(snap).then(function() {
                  adrSheet.querySelector('.adr-undo').style.display = 'none';
                  if (window.showSystemToast) window.showSystemToast('\u5DF2\u64A4\u9500\uFF0C\u6570\u636E\u5DF2\u6062\u590D');
                  adrRefreshSummary();
                }).catch(function() {});
              });
              adrSheet.querySelector('.adr-clear-cache').addEventListener('click', function() {
                var id = adrApp && adrApp.id;
                if (!R || !id) return;
                R.clearAppCache(id).then(function(res) {
                  if (window.showSystemToast) window.showSystemToast(res.cacheRemoved ? '\u5DF2\u6E05\u9664\u7F13\u5B58' : '\u65E0\u7F13\u5B58\u53EF\u6E05\u9664\uFF08\u767B\u8BB0\u8868\u7F13\u5B58\u9762\u4E3A\u7A7A\uFF09');
                }).catch(function() {});
              });
              // \u884C\u70B9\u51FB\u59D4\u6258\uFF08\u884C\u968F render \u91CD\u5EFA \u2192 \u6587\u6863\u7EA7\u59D4\u6258\u6700\u7A33\uFF09
              document.addEventListener('click', function(e) {
                var row = e.target && e.target.closest ? e.target.closest('[data-test="apps-recent-row"]') : null;
                if (!row || !R) return;
                var id = row.getAttribute('data-app-id');
                var st = window.__state;
                var app = null;
                if (st && Array.isArray(st.pagesApps)) {
                  st.pagesApps.forEach(function(page) { (page || []).forEach(function(a) { if (a && a.id === id) app = a; }); });
                }
                if (!app) return;
                adrApp = app;
                adrSheet.querySelector('.adr-icon').innerHTML = window.__getAppIconSVG ? window.__getAppIconSVG(id) : '';
                adrSheet.querySelector('.adr-name').textContent = app.name || id;
                adrSheet.querySelector('.adr-undo').style.display = 'none';
                showConfirm(false);
                adrRefreshSummary();
                adrEnsure(); open();
              });
              function adrRefreshSummary() {
                var id = adrApp && adrApp.id;
                var el = adrSheet.querySelector('.adr-summary');
                if (!el || !R || !id) return;
                var list = R.listAppData(id);
                var n = list.ls.length + list.idb.length;
                el.innerHTML = '\u5B58\u50A8\u5360\u7528\uFF1A\u767B\u8BB0\u8868\u5728\u5F55\u6570\u636E\u952E <b>' + list.ls.length + '</b> \u9879\uFF08localStorage\uFF09'
                  + (list.idb.length ? ' + <b>' + list.idb.length + '</b> \u9879\uFF08\u5927\u6587\u4EF6\u5E93\uFF09' : '')
                  + '\uFF1BVFS \u5171\u4EAB\u5A92\u4F53\u5B58\u50A8\uFF08\u7167\u7247/\u97F3\u4E50/\u6587\u6863\u7B49\uFF09\u5C5E\u5171\u4EAB\u5B58\u50A8\uFF0C\u4E0D\u5728\u5E94\u7528\u6570\u636E\u8303\u56F4\uFF08AOSP \u5BF9\u6807\uFF09\u3002'
                  + (n === 0 ? '\u672C\u5E94\u7528\u6682\u65E0\u767B\u8BB0\u6570\u636E\u3002' : '');
              }
              return adrSheet;
            }
            adrEnsure();
            render();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 6) render();
            });
          })();
        `;
