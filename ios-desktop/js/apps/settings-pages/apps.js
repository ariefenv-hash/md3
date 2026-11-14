// ==================== settings-pages/apps.js — 页 6 应用（APPS_PAGE_SCRIPT 单源真身 · #284 批 6） ====================
//
// #284 批 6（R155 窗 · v11.14）：APPS_PAGE_SCRIPT 常量自 settings.js 整体搬迁至此——
// boundary-map §3.1 候选表顺位第一（HANDOFF 覆写六十一 R155 续点在案；页 6 应用 v8.05
// #23 差距矩阵③ apps.xml 1:1，簇块 239 行 = 头注考证链 14 行 + 模板串 225 行）。G2 单源
// 桥接禁双轨：本文件 = 常量唯一真源（export），settings.js 经 import 消费同一份；负向锚
// 守护 = tests/apps-subpage.test.js「G2 单源桥接」组（settings.js 本体零 const
// APPS_PAGE_SCRIPT 残留，批 2/3/4/5 互指纪律同款）。
// 运行语义零漂移：settingsApp 页注册表 `<script>` + APPS_PAGE_SCRIPT + `</script>`
// 拼接面逐字节不变（消费点 = settings.js 页 6 content 尾段）；簇模板串零 `${` 插值
// （boundary-map §3.1 拆分风险注记核查：APPS 簇自包含 IIFE，桥接全走 window.* 宿主面
// —— __bindAppDocListener / __mdEscape（v11.30 #240 单源委托）/ __state /
// __getAppIconSVG / __settingsAppsBridge（桥定义留 settings.js 主体），迁移零委托行）。
export const APPS_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            function esc(s) {
// v11.30 #240：单源委托——转义实现收敛 apps/_shared/sanitize.js escapeHtml（本文件正则链退役，负向锚 tests/v240）
              return window.__mdEscape(s);
            }
            // InstalledAppCounter 同构：pagesApps 拍平（folder.apps 成员计入）+ id 去重
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
            // ListFormatter.getInstance().format(zh) 同构：2 项「A和B」、3+ 项「A、B和C」
            function zhList(arr) {
              if (!arr.length) return '';
              if (arr.length === 1) return arr[0];
              return arr.slice(0, -1).join('、') + '和' + arr[arr.length - 1];
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
                .filter(function(id) { return !!map[id]; }); // appEntry == null → continue 同构
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
                // loadAllAppsCount：see_all_apps_title ICU 复数（zh：=1 无计数，other 带 # ）
                if (seeAll) seeAll.textContent = ids.length === 1 ? '查看所有应用' : '查看所有 ' + ids.length + ' 个应用';
              } else {
                // 空态分支：仅 all_app_infos + apps_summary
                cat.style.display = 'none';
                allRow.style.display = '';
                if (allSub) allSub.textContent = '已安装 ' + ids.length + ' 个应用';
              }
              // DefaultAppsPreferenceController.getSummary：RoleManager 浏览器/拨号器/短信
              // 三角色依序取标签，空标签跳过（TextUtils.isEmpty 判空同构）后 ListFormatter 连接
              if (defSub) {
                var roleIds = ['safari', 'phone', 'msg'];
                var labels = roleIds.map(function(id) { return map[id] && map[id].name; })
                  .filter(function(n) { return !!n; });
                defSub.textContent = labels.length ? zhList(labels) : '';
              }
              // HibernatedAppsPreferenceController：unused_apps_summary「N 个闲置应用」
              // （模拟映射 = 已安装集合 − 最近使用记录全集交集，含未进前 4 的记录）
              if (unusedSub) {
                var recentSet = {};
                recentAll.forEach(function(id) { recentSet[id] = 1; });
                var unused = ids.filter(function(id) { return !recentSet[id]; }).length;
                unusedSub.textContent = unused + ' 个闲置应用';
              }
            }
            // ==================== v11.30 #219：应用信息底部弹层（AppInfo Storage & cache 对标） ====================
            // 数据面真源 = window.__appDataRegistry（app-data-registry.js 登记表）；
            // 清除数据 = 快照 → 逐键清除（保护面永不触碰）→ 5s 撤销窗（快照回滚，#238 同款）；
            // 清除缓存 = 登记表缓存面如实呈现（本版为空 → 「无缓存可清除」，不造数）。
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
                      '<button class="adr-undo-btn" data-test="appinfo-undo-btn" style="padding:6px 14px;border-radius:9999px;border:none;background:transparent;color:var(--md-primary,#a8c8ff);font-size:13px;font-weight:600;cursor:pointer;">撤销</button>' +
                    '</div>' +
                    '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
                      '<button class="adr-clear-data" data-test="appinfo-clear-data" style="padding:9px 20px;border-radius:9999px;border:none;background:var(--md-primary,#a8c8ff);color:var(--md-on-primary,#0a3050);font-size:13px;font-weight:600;cursor:pointer;">清除数据</button>' +
                      '<button class="adr-clear-cache" data-test="appinfo-clear-cache" style="padding:9px 20px;border-radius:9999px;border:none;background:var(--md-secondary-container,#3f4757);color:var(--md-on-secondary-container,#dce3f2);font-size:13px;font-weight:600;cursor:pointer;">清除缓存</button>' +
                      '<button class="adr-close" data-test="appinfo-close" style="padding:9px 20px;border-radius:9999px;border:none;background:transparent;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;font-weight:600;cursor:pointer;">关闭</button>' +
                    '</div>' +
                  '</div>' +
                  '<div class="adr-confirm" data-test="appinfo-confirm" style="display:none;">' +
                    '<div style="font-size:16px;font-weight:600;color:var(--md-on-surface,#e2e2e9);margin:10px 0 6px;">清除数据？</div>' +
                    '<div class="adr-confirm-desc" style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;margin-bottom:16px;"></div>' +
                    '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
                      '<button class="adr-cancel" data-test="appinfo-cancel" style="padding:9px 20px;border-radius:9999px;border:none;background:transparent;color:var(--md-primary,#a8c8ff);font-size:13px;font-weight:600;cursor:pointer;">取消</button>' +
                      '<button class="adr-confirm-btn" data-test="appinfo-confirm-btn" style="padding:9px 20px;border-radius:9999px;border:none;background:var(--md-error,#ffb4ab);color:var(--md-on-error,#601410);font-size:13px;font-weight:600;cursor:pointer;">清除</button>' +
                    '</div>' +
                  '</div>' +
                '</div>';
              document.body.appendChild(adrSheet);
              var panel = adrSheet.querySelector('.adr-panel');
              function open() { adrSheet.style.display = 'block'; requestAnimationFrame(function() { panel.style.transform = 'translateY(0)'; }); if (window.__mdDialogA11y) window.__mdDialogA11y.open(adrSheet, { onClose: close }); } // #241 长尾1：壳层动态 sheet 簿记（Esc 可关+焦点陷阱+焦点恢复，scrim/close 双钮路径经 onClose 幂等出栈）
              function close() {
                if (window.__mdDialogA11y) window.__mdDialogA11y.close(adrSheet); // #241 长尾1：簿记出栈+焦点还原（未簿记幂等零副作用）
                panel.style.transform = 'translateY(100%)';
                if (adrUndoTimer) { clearInterval(adrUndoTimer); adrUndoTimer = null; }
                setTimeout(function() { if (adrSheet && !adrSheet.isConnected) return; adrSheet.style.display = 'none'; }, 300);
              }
              adrSheet.__close = close;
              adrSheet.querySelector('.adr-scrim').addEventListener('click', close);
              adrSheet.querySelector('.adr-close').addEventListener('click', close);
              // 视图切换：主视图 ↔ 确认视图
              function showConfirm(on) {
                adrSheet.querySelector('.adr-body').style.display = on ? 'none' : '';
                adrSheet.querySelector('.adr-confirm').style.display = on ? '' : 'none';
              }
              adrSheet.querySelector('.adr-clear-data').addEventListener('click', function() {
                var t = adrApp ? (adrApp.name || adrApp.id) : '';
                adrSheet.querySelector('.adr-confirm-desc').textContent =
                  '将清除「' + t + '」的全部应用数据（登记表驱动逐键清除；桌面壳/壁纸/字体/共享媒体存储不在清除范围）。清除后 5 秒内可撤销。';
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
                  // 撤销窗（#238 同款 5s）：快照留存，倒计时归零弃快照
                  var bar = adrSheet.querySelector('.adr-undo');
                  bar.style.display = 'flex';
                  adrSheet.querySelector('.adr-undo-msg').textContent =
                    '已清除 ' + res.lsRemoved + ' 项本地数据' + (res.idbRemoved ? '、' + res.idbRemoved + ' 项大文件数据' : '');
                  adrLeft = 5;
                  var btn = adrSheet.querySelector('.adr-undo-btn');
                  btn.textContent = '撤销 (5)';
                  if (adrUndoTimer) clearInterval(adrUndoTimer);
                  adrUndoTimer = setInterval(function() {
                    adrLeft--;
                    if (adrLeft <= 0) { clearInterval(adrUndoTimer); adrUndoTimer = null; adrSnap = null; bar.style.display = 'none'; return; }
                    btn.textContent = '撤销 (' + adrLeft + ')';
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
                  if (window.showSystemToast) window.showSystemToast('已撤销，数据已恢复');
                  adrRefreshSummary();
                }).catch(function() {});
              });
              adrSheet.querySelector('.adr-clear-cache').addEventListener('click', function() {
                var id = adrApp && adrApp.id;
                if (!R || !id) return;
                R.clearAppCache(id).then(function(res) {
                  if (window.showSystemToast) window.showSystemToast(res.cacheRemoved ? '已清除缓存' : '无缓存可清除（登记表缓存面为空）');
                }).catch(function() {});
              });
              // 行点击委托（行随 render 重建 → 文档级委托最稳）
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
                el.innerHTML = '存储占用：登记表在录数据键 <b>' + list.ls.length + '</b> 项（localStorage）'
                  + (list.idb.length ? ' + <b>' + list.idb.length + '</b> 项（大文件库）' : '')
                  + '；VFS 共享媒体存储（照片/音乐/文档等）属共享存储，不在应用数据范围（AOSP 对标）。'
                  + (n === 0 ? '本应用暂无登记数据。' : '');
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
