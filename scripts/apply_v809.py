#!/usr/bin/env python3
# apply_v809.py — v8.09 #23 差距矩阵⑤：存储子页回审计，页 7 块替换
# 锚点：START = "      // 页 7：存储空间占用"（含）→ END = "    {\n      // 页 8：开发者选项"（不含）
# 新块 = AOSP storage_dashboard_fragment.xml 权威结构（17 keys）+ 既有 Web 扩展卡保留
import io, sys

PATH = 'ios-desktop/js/apps/settings.js'
src = io.open(PATH, encoding='utf-8').read()

START = "      // 页 7：存储空间占用"
END_ANCHOR = "      // 页 8：开发者选项"

si = src.find(START)
ei = src.find(END_ANCHOR)
assert si != -1, 'START anchor not found'
assert ei != -1, 'END anchor not found'
assert si < ei, 'anchor order wrong'

NEW = '''      // 页 7：存储空间占用 —— v8.09 #23 差距矩阵⑤回审计 1:1 转正
      // 考证链（aosp-mirror/platform_packages_apps_settings main 实源实拉）：
      //   res/xml/storage_dashboard_fragment.xml 17 keys / order 1→204：
      //     storage_spinner(1)[StorageSelectionPreferenceController AVAILABLE_UNSEARCHABLE，
      //       displayPreference mSpinnerPreference.setVisible(mStorageAdapter.getCount()>1)
      //       →单卷设备隐藏] / storage_summary(2)[UsageProgressBarPreference+
      //       StorageUsageProgressBarPreferenceController] / toggle_asm(3)[PrimarySwitch+
      //       AutomaticStorageManagementSwitchPreferenceController：getAvailabilityStatus=
      //       !config_show_smart_storage_toggle→UNSUPPORTED_ON_DEVICE（config.xml=true 过门控）
      //       +!isLowRamDevice→AVAILABLE；fragment=AutomaticStorageManagerSettings，icon=ic_storage]
      //       / free_up_space(4)[CardPreference+ManageStoragePreferenceController：
      //       mManageStorageDrawable=StorageUtils.getManageStorageIcon 解析失败→
      //       CONDITIONALLY_UNAVAILABLE；zh 摘要「前往谷歌文件极客应用管理和释放空间」]
      //       / pref_public_storage(100)文件+pref_images(101)图片+pref_videos(102)视频+
      //       pref_audio(103)音频+pref_apps(104)应用+pref_games(105)游戏+pref_documents(106)
      //       文档+pref_other(107)其他+pref_trash(108)回收站[StorageItemPreference 由
      //       StorageItemPreferenceController 统一管理，StorageAsyncLoader.handleResult 填大小]
      //       / storage_category_splitter(201)「系统」分类[pref_system(202)「Android %s」+
      //       temporary_files(203)「临时系统文件」] / pref_non_current_users(204)「其他用户」
      //       [NonCurrentUserController.getNonCurrentUserControllers 空列表→分类不渲染]
      //   fragment=StorageDashboardFragment.java（deviceinfo/ 包，getPreferenceScreenResId=
      //   R.xml.storage_dashboard_fragment；onCreate 注册 StorageItemPreferenceController+
      //   NonCurrentUserController；StorageAsyncLoader 按所选卷加载分类大小）
      //   zh-rCN 权威值：存储空间/释放空间/前往谷歌文件极客应用管理和释放空间/文件/图片/视频/
      //   音频/应用/游戏/文档/其他/回收站/系统/Android %s/临时系统文件/其他用户/存储空间管理器/
      //   已使用 %1$s - 还剩 %2$s
      // Web 真实数据单一真源：summary=window.__storageStats.collect()（navigator.storage.estimate
      // 实测 usage/quota）；分类=window.__vfs.usage()/usageByType()（v8.09 新增 mime 前缀聚合）
      // + byOwner 应用归属聚合（VFS 键归 files 不双计）；游戏/回收站=0（无对应数据域，忠实 0 值）。
      // 既有 Web 扩展卡保留（铁律#2）：localStorage/IDB 双卡+按应用归属+TopKeys=真实统计不丢失。
      title: '存储空间',
      content: `<div style="padding:16px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);">AOSP 权威结构 + localStorage/IndexedDB/VFS 真实统计</div>
          <button id="storageRefreshBtn" class="md3-btn md3-btn-tonal" style="padding:6px 16px;font-size:13px;flex-shrink:0;">重新统计</button>
        </div>
        <div id="storageAosp" data-test="storage-aosp"></div>
        <div id="storageOverview"></div>
        <div id="storageByOwner"></div>
        <div id="storageTopKeys"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(t, f, o); };
            var aosp = document.getElementById('storageAosp');
            var ov = document.getElementById('storageOverview');
            var byOwnerBox = document.getElementById('storageByOwner');
            var topBox = document.getElementById('storageTopKeys');
            if (!ov) return;
            function fmt(b) { return window.__storageStats ? window.__storageStats.formatBytes(b) : (b || 0) + ' B'; }
            function nameOf(owner) { return window.__storageStats ? window.__storageStats.ownerDisplayName(owner) : owner; }
            function bar(pct, hue) {
              var p = Math.max(1.5, Math.min(100, pct || 0));
              return '<div style="height:6px;border-radius:3px;background:var(--md-outline-variant);overflow:hidden;margin-top:8px;"><div style="height:100%;width:' + p + '%;border-radius:3px;background:hsl(' + (hue || 215) + ' 70% 55%);"></div></div>';
            }
            function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
            // AOSP 权威骨架（静态一次注入；大小/百分比动态回填）
            aosp.innerHTML =
              /* storage_summary(2)：UsageProgressBarPreference 等价 */
              '<div class="md3-card" data-test="storage-summary" style="padding:18px 18px 14px;margin-bottom:12px;">' +
                '<div style="font-size:34px;font-weight:700;color:var(--md-on-surface,#e2e2e9);line-height:1.1;"><span id="stgSummaryPct">--</span></div>' +
                '<div id="stgSummaryBar" style="margin-top:10px;"></div>' +
                '<div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:8px;" id="stgSummaryLine">正在统计…</div>' +
              '</div>' +
              /* storage_spinner(1)：单卷隐藏注记（setVisible(getCount()>1) 门控实拉） */
              '<div class="theme-section-hint" data-test="storage-spinner-note" style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin:0 4px 10px;opacity:0.8;line-height:1.6;">' +
                '存储选择器（storage_spinner）：本机为单一内置卷，多卷选择不适用——AOSP 单卷设备 setVisible(false) 同构，注记呈现。</div>' +
              /* toggle_asm(3)：存储空间管理器（PrimarySwitch；Web 无 Storage Manager 备份后端→开关禁用注记） */
              '<div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:12px;">' +
                '<div class="md3-list-item" data-test="storage-asm" style="cursor:default;">' +
                  '<div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgStorage || ''}</div>' +
                  '<span class="md3-list-item-text">存储空间管理器' +
                    '<span style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;line-height:1.5;">自动释放空间（Web 形态无备份后端，忠实呈现不可用）</span>' +
                  '</span>' +
                  '<label class="md3-switch"><input type="checkbox" id="stgAsmSwitch" disabled><span class="slider"><span class="thumb"></span></span></label>' +
                '</div>' +
              '</div>' +
              /* free_up_space(4)：CardPreference → Web 真实跳转内建文件应用（AOSP 跳文件极客） */
              '<div class="md3-card md3-card-elevated" data-test="storage-free-up" id="stgFreeUpBtn" role="button" tabindex="0" style="padding:14px 18px;margin-bottom:14px;cursor:pointer;">' +
                '<div style="font-size:14px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">释放空间</div>' +
                '<div style="font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;">前往文件应用管理和释放空间</div>' +
              '</div>' +
              /* 分类 9 行（StorageItemPreference；icon 逐 path 实证 icons-aosp stg* 键） */
              '<div class="md3-card" data-test="storage-categories" style="padding:4px 0;overflow:hidden;margin-bottom:12px;">' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgFolder || ''}</div><span class="md3-list-item-text">文件<span data-test="stg-size-files" id="stgSizeFiles" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgPhoto || ''}</div><span class="md3-list-item-text">图片<span id="stgSizeImages" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgMovies || ''}</div><span class="md3-list-item-text">视频<span id="stgSizeVideos" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgAudio || ''}</div><span class="md3-list-item-text">音频<span id="stgSizeAudio" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgApps || ''}</div><span class="md3-list-item-text">应用<span id="stgSizeApps" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgGames || ''}</div><span class="md3-list-item-text">游戏<span id="stgSizeGames" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgFolder || ''}</div><span class="md3-list-item-text">文档<span id="stgSizeDocuments" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgCategory || ''}</div><span class="md3-list-item-text">其他<span id="stgSizeOther" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgTrash || ''}</div><span class="md3-list-item-text">回收站<span id="stgSizeTrash" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
              '</div>' +
              /* storage_category_splitter(201)「系统」：pref_system + temporary_files */
              '<div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 4px 8px;" data-test="storage-system-label">系统</div>' +
              '<div class="md3-card" data-test="storage-system" style="padding:4px 0;overflow:hidden;margin-bottom:12px;">' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgAndroid || ''}</div><span class="md3-list-item-text">Android 17<span id="stgSizeSystem" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgDatabase || ''}</div><span class="md3-list-item-text">临时系统文件<span id="stgSizeTemp" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
              '</div>' +
              /* pref_non_current_users(204)：单用户空分类注记 */
              '<div class="theme-section-hint" data-test="storage-other-users-note" style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin:0 4px 12px;opacity:0.8;line-height:1.6;">' +
                '其他用户（pref_non_current_users）：本机为单用户形态，NonCurrentUserController 返回空列表分类不渲染（AOSP 多用户设备才显示），注记呈现。</div>';
            // 释放空间卡 → 内建文件应用（AOSP 跳「文件极客」，OPEN_APP 深链语义）
            var freeUp = document.getElementById('stgFreeUpBtn');
            if (freeUp) {
              var openFiles = function() {
                try { window.postMessage({ type: 'OPEN_APP', appId: 'files' }, '*'); } catch (e) {}
                try { window.parent.postMessage({ type: 'OPEN_APP', appId: 'files' }, '*'); } catch (e) {}
              };
              freeUp.addEventListener('click', openFiles);
              freeUp.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFiles(); }
              });
            }
            function fill(id, text) {
              var el = document.getElementById(id);
              if (el && el.isConnected) el.textContent = text;
            }
            function render() {
              if (!window.__storageStats) {
                ov.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">统计服务尚未就绪</div>';
                return;
              }
              ov.innerHTML = '<div style="text-align:center;padding:26px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">'
                + '<span id="storageStatLoader" style="display:inline-block;vertical-align:middle;width:26px;height:26px;color:var(--md-primary,hsl(var(--md-h,215) 80% 60%));"></span>'
                + '<span style="vertical-align:middle;margin-left:8px;">正在统计…</span></div>';
              var statLoaderBox = document.getElementById('storageStatLoader');
              if (statLoaderBox && window.__m3eLoader) window.__m3eLoader.mount(statLoaderBox, { size: 26 });
              byOwnerBox.innerHTML = '';
              topBox.innerHTML = '';
              window.__storageStats.collect().then(function(s) {
                var usage = s.idb.usage || 0, quota = s.idb.quota || 0;
                var remain = Math.max(0, quota - usage);
                var pct = quota ? Math.round(usage / quota * 100) : 0;
                // storage_summary 行：已使用 %1$s - 还剩 %2$s（zh 模板）+ 大百分比 + 进度条
                fill('stgSummaryPct', pct + '%');
                fill('stgSummaryLine', '已使用 ' + fmt(usage) + ' - 还剩 ' + (quota ? fmt(remain) : '未知'));
                var barBox = document.getElementById('stgSummaryBar');
                if (barBox && barBox.isConnected) barBox.innerHTML = bar(quota ? usage / quota * 100 : 0, 215);
                // 分类行（真实数据：VFS mime 聚合 + byOwner 归属；VFS 键归 files 不双计）
                var vfsU = (window.__vfs && window.__vfs.usage) ? window.__vfs.usage() : { bytes: 0 };
                var byT = (window.__vfs && window.__vfs.usageByType) ? window.__vfs.usageByType() : { image: 0, video: 0, audio: 0, document: 0, other: 0 };
                var sysBytes = 0, appBytes = 0;
                (s.byOwner || []).forEach(function(o) {
                  if (o.owner === '__system') sysBytes += o.bytes;
                  else if (o.owner !== '__other' && o.owner !== 'files') appBytes += o.bytes;
                });
                var otherBytes = Math.max(0, usage - (vfsU.bytes || 0) - appBytes - sysBytes);
                fill('stgSizeFiles', fmt(vfsU.bytes || 0) + ' · ' + (vfsU.files || 0) + ' 个文件');
                fill('stgSizeImages', fmt(byT.image));
                fill('stgSizeVideos', fmt(byT.video));
                fill('stgSizeAudio', fmt(byT.audio));
                fill('stgSizeApps', fmt(appBytes));
                fill('stgSizeGames', fmt(0));      // 无游戏媒体数据域 → 忠实 0 值
                fill('stgSizeDocuments', fmt(byT.document));
                fill('stgSizeOther', fmt(otherBytes));   // 配额域剩余（含壁纸/字体以外的未归类）
                fill('stgSizeTrash', fmt(0));      // VFS 无回收站实现 → 忠实 0 值
                fill('stgSizeSystem', fmt(sysBytes));    // __system 归属（壁纸/字体/系统键）
                fill('stgSizeTemp', fmt(byT.other));     // VFS 未分类mime → 临时文件口径注记
                // ---- 以下 Web 扩展卡（铁律#2 保留） ----
                var idbPct = s.idb.quota ? Math.min(100, (s.idb.usage / s.idb.quota) * 100) : 0;
                ov.innerHTML =
                  '<div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:14px 4px 8px;">Web 扩展 · 存储介质明细（合法超越）</div>' +
                  '<div class="md3-card" style="padding:16px 18px;margin-bottom:12px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:var(--md-on-surface,#e2e2e9);"><span>localStorage</span><span>' + fmt(s.ls.total) + ' · ' + s.ls.keys + ' 键</span></div>' +
                    bar(s.ls.total / 5242880 * 100, 215) +
                    '<div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:6px;opacity:.8;">约 5MB 配额</div>' +
                  '</div>' +
                  '<div class="md3-card" style="padding:16px 18px;margin-bottom:14px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:var(--md-on-surface,#e2e2e9);"><span>IndexedDB（含壁纸/字体文件）</span><span>' + (s.idb.available ? fmt(s.idb.usage) + (s.idb.quota ? ' / ' + fmt(s.idb.quota) : '') : '不可用') + '</span></div>' +
                    bar(idbPct, 155) +
                    '<div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:6px;opacity:.8;">配额一般为磁盘可用空间的 60%</div>' +
                  '</div>';
                if (!s.byOwner.length) { byOwnerBox.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">暂无数据</div>'; return; }
                var maxB = s.byOwner[0].bytes || 1;
                var rows = s.byOwner.map(function(o, i) {
                  return '<div style="padding:10px 2px 2px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--md-on-surface,#e2e2e9);"><span>' + esc(nameOf(o.owner)) + '</span><span style="color:var(--md-on-surface-variant,#9a9b9e);">' + fmt(o.bytes) + '</span></div>' +
                    bar(o.bytes / maxB * 100, (o.owner === '__system' ? 215 : (o.owner === '__other' ? 35 : 155 + i * 37) % 360)) +
                    '</div>';
                }).join('');
                byOwnerBox.innerHTML = '<div class="md3-card" style="padding:14px 18px 8px;margin-bottom:12px;"><div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin-bottom:4px;">按应用归属</div>' + rows + '</div>';
                var top = s.ls.items.slice(0, 8).map(function(it) {
                  return '<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 2px;border-bottom:1px solid var(--md-outline-variant);font-size:12.5px;">' +
                    '<span style="color:var(--md-on-surface-variant,#9a9b9e);word-break:break-all;">' + esc(it.key) + '</span>' +
                    '<span style="color:var(--md-on-surface,#e2e2e9);flex-shrink:0;">' + fmt(it.bytes) + '</span></div>';
                }).join('');
                topBox.innerHTML = '<div class="md3-card" style="padding:14px 18px;margin-bottom:12px;"><div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin-bottom:2px;">占用最大的 localStorage 键（前 8）</div>' + (top || '<div style="padding:10px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">空</div>') + '</div>';
              }).catch(function() {
                ov.innerHTML = '<div style="text-align:center;padding:30px 0;color:#ff8a8a;font-size:13px;">统计失败，请重试</div>';
              });
            }
            document.getElementById('storageRefreshBtn').addEventListener('click', render);
            render();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 7) render();
            });
          })();
        </script>
      </div>`,
    },
    {
'''

new_src = src[:si] + NEW + src[ei:]
io.open(PATH, 'w', encoding='utf-8').write(new_src)
print('OK: page 7 replaced, old %d chars -> new %d chars' % (ei - si, len(NEW)))
