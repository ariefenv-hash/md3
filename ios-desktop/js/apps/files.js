// ==================== files.js — 文件管理器（批次三 · 数据层） ====================
//
// 桌面级「模块渲染型」应用（与 settings 同范式：pages[].content + 内联 IIFE 脚本，
// 直接 import 桌面模块，无 iframe 边界）。职责：
//   1. 浏览 VFS 目录树（vfs.js）：面包屑导航、目录在前排序、空态引导；
//      v7.27 目录切换带二级菜单推入/推出互动动画（与桌面 folder.js 同曲线语言）
//   2. 预览：图片 / 音频 / 视频 / 文本直接内嵌预览，其余给信息卡 + 导出
//   3. 管理：新建文件夹 / 新建文本文档 / 重命名 / 删除 / 从电脑导入 / 导出下载
//   4. 全局剪贴板（clipboard.js）：复制 / 剪切 → 跨目录粘贴；文本/图片载荷也能粘贴成文件
//   5. 分享：文本 → 信息（share/file 事件）；图片 → 相册（photo/captured 事件）
//   6. 轻量拖拽：长按文件拖到文件夹行上即移动（借鉴 drag-reorder 的 ghost + 全局接管思路，
//      但文件行语义与桌面网格完全不同，故在应用内自实现，不耦合 pagesApps/slot）
//
// 生命周期说明：模块应用页面脚本只执行一次、实例常驻内存（page-stack.js），
// 动态内容一律靠事件委托 + app-page-active 激活重建，离开页面只挂起不销毁。

import { ICONS } from '../icons.js';
import { getAppIconSVG } from '../app-icons.js';
// v7.28 预览式返回：模块应用页内返回注册在宿主侧 main.js 完成（应用定义文件不
// import 依赖 state 的宿主模块 —— 避免 state→apps-data→files→module-back 循环求值）；
// 实例桥 window.__filesPB 由本文件内联 IIFE 暴露，main.js 侧注册项代理之。

export default {
  id: 'files',
  name: '文件',
  pages: [
    {
      title: '文件',
      content: `
        <!-- v7.27 filesStage：二级目录推入/推出动画舞台（新层 filesRoot 位移、旧层 ghost 快照覆盖） -->
        <div id="filesStage" style="position:relative;">
        <div id="filesRoot" style="padding:16px 0 32px;position:relative;">
          <style>
            /* 文件应用触控与视觉细节：行内操作钮热区 ≥40px、列表行按压反馈 */
            .files-act { min-width: 40px; min-height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; transition: background .15s; }
            .files-act:active { background: hsl(var(--md-h, 215) 40% 60% / .18); }
            .files-row { min-height: 56px; }
          </style>
          <!-- 存储概览卡（仅根目录显示） -->
          <div class="md3-card md3-card-elevated" id="filesSummary" style="margin:4px 0 16px;padding:16px;display:flex;align-items:center;gap:14px;">
            <div style="width:44px;height:44px;border-radius:14px;background:hsl(var(--md-h,215) 80% 40% / 0.15);display:flex;align-items:center;justify-content:center;color:var(--md-primary,hsl(var(--md-h,215) 80% 45%));">${ICONS.storage}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">内部存储</div>
              <div id="filesSummaryText" style="font-size:13px;color:var(--md-on-surface-variant);margin-top:2px;">统计中…</div>
            </div>
          </div>

          <!-- 操作工具行 -->
          <div style="display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap;">
            <button class="md3-btn md3-btn-tonal" id="filesBtnMkdir" style="flex:1;min-width:110px;min-height:44px;">${ICONS.create_new_folder}<span style="margin-left:6px;">新建文件夹</span></button>
            <button class="md3-btn md3-btn-tonal" id="filesBtnNewTxt" style="flex:1;min-width:110px;min-height:44px;">${ICONS.description}<span style="margin-left:6px;">新建文本</span></button>
            <button class="md3-btn md3-btn-tonal" id="filesBtnImport" style="flex:1;min-width:110px;min-height:44px;">${ICONS.upload_file}<span style="margin-left:6px;">导入</span></button>
            <button class="md3-btn md3-btn-filled" id="filesBtnPaste" style="flex:1;min-width:110px;min-height:44px;display:none;">${ICONS.content_paste}<span style="margin-left:6px;">粘贴</span></button>
          </div>

          <!-- 面包屑 -->
          <div id="filesCrumbs" style="display:flex;align-items:center;gap:2px;flex-wrap:wrap;font-size:13px;color:var(--md-on-surface-variant);margin:0 4px 10px;min-height:24px;"></div>

          <!-- 文件列表 -->
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div id="filesList"></div>
            <div id="filesEmpty" style="display:none;padding:36px 20px;text-align:center;color:var(--md-on-surface-variant);">
              <div style="opacity:.45;margin-bottom:10px;"><span style="display:inline-block;transform:scale(2);">${ICONS.folder}</span></div>
              <div style="font-size:14px;">此目录为空</div>
              <div style="font-size:12px;margin-top:4px;opacity:.8;">用上方按钮新建，或把电脑里的文件「导入」进来</div>
            </div>
          </div>

          <input type="file" id="filesFileInput" multiple style="display:none;" />

          <!-- 预览浮层（覆盖整个应用页面） -->
          <div id="filesPreview" style="display:none;position:absolute;inset:0;z-index:60;background:var(--md-surface,#141418);flex-direction:column;">
            <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--md-outline-variant);">
              <button class="md3-btn md3-btn-tonal" id="filesPreviewClose" style="min-width:0;padding:8px 12px;min-height:40px;">${ICONS.back}<span style="margin-left:4px;">返回</span></button>
              <div id="filesPreviewName" style="flex:1;font-size:14px;font-weight:600;color:var(--md-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div>
              <button class="md3-btn md3-btn-tonal" id="filesPreviewDownload" style="min-width:40px;min-height:40px;padding:8px 10px;" title="导出到电脑">${ICONS.download}</button>
              <button class="md3-btn md3-btn-tonal" id="filesPreviewShare" style="min-width:40px;min-height:40px;padding:8px 10px;" title="分享">${ICONS.quick_share}</button>
            </div>
            <div id="filesPreviewBody" style="flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:16px;"></div>
          </div>

          <!-- 分享目标面板 -->
          <div id="filesShareSheet" style="display:none;position:absolute;inset:0;z-index:70;background:rgba(0,0,0,.45);" >
            <div style="position:absolute;left:0;right:0;bottom:0;background:var(--md-surface-container,#1e1e24);border-radius:24px 24px 0 0;padding:18px 16px 26px;">
              <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin:0 4px 12px;" id="filesShareTitle">分享</div>
              <div id="filesShareTargets"></div>
              <button class="md3-btn md3-btn-tonal" id="filesShareCancel" style="width:100%;min-height:44px;margin-top:6px;">取消</button>
            </div>
          </div>

          <!-- 通用 MD3 对话框（新建 / 重命名 / 删除确认） -->
          <div id="filesDialog" style="display:none;position:absolute;inset:0;z-index:80;background:rgba(0,0,0,.45);align-items:center;justify-content:center;padding:28px;">
            <div class="md3-card md3-card-elevated" style="width:100%;max-width:340px;padding:22px 20px 14px;">
              <div id="filesDialogTitle" style="font-size:17px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;"></div>
              <div id="filesDialogMsg" style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:10px;white-space:pre-wrap;display:none;"></div>
              <input id="filesDialogInput" type="text" style="width:100%;box-sizing:border-box;background:var(--md-surface-container-high,#2a2a32);border:1px solid var(--md-outline-variant);border-radius:12px;color:var(--md-on-surface);font-size:14px;padding:11px 12px;outline:none;display:none;" />
              <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:14px;">
                <button class="md3-btn md3-btn-tonal" id="filesDialogCancel" style="min-height:44px;">取消</button>
                <button class="md3-btn md3-btn-filled" id="filesDialogOk" style="min-height:44px;">确定</button>
              </div>
            </div>
          </div>
        </div>

          <script>
            (function() {
              'use strict';
              var V = function() { return window.__vfs || null; }; // fix(P3): lazy resolution — old implementation captured once, if the bridge wasn't ready it stayed null forever, "close and reopen" never self-heals
              var CB = function() { return window.__clipboard || null; };
              var $ = function(id) { return document.getElementById(id); };

              var listEl = $('filesList'), emptyEl = $('filesEmpty'), crumbsEl = $('filesCrumbs');
              var summaryEl = $('filesSummary'), summaryTextEl = $('filesSummaryText');
              var pasteBtn = $('filesBtnPaste');
              var previewEl = $('filesPreview'), previewBody = $('filesPreviewBody'), previewName = $('filesPreviewName');
              var shareSheet = $('filesShareSheet'), shareTargets = $('filesShareTargets'), shareTitle = $('filesShareTitle');
              var dlgEl = $('filesDialog'), dlgTitle = $('filesDialogTitle'), dlgMsg = $('filesDialogMsg'), dlgInput = $('filesDialogInput');

              var cwd = '/';
              var visible = false;
              var renderTimer = null;
              var lastDragMoved = false; // 拖拽结束抑制随后的一次 click
              var currentPreviewPath = null;

              // ---------- v7.27 二级目录互动动画（与桌面 folder.js 同曲线语言的推入/推出） ----------
              // 前进（点文件夹行）：新目录层自右侧 44px 弹入（cubic-bezier(0.2,0.95,0.25,1.05)），
              // 旧目录层快照向左视差淡出；返回（点面包屑上级）：镜像反向。
              // 纪律：仅驱动 transform/opacity；ghost 剥离全部 id 防重复；动中再导航即完成旧场。
              var stageEl = $('filesStage'), rootEl = $('filesRoot');
              var navAnimating = false;
              var navCleanup = null;

              // fix(v7.45)：幽灵快照滞留自愈（issue #5 img6 —— 双层面板重叠）。
              // 旧实现唯一清理路径是「navigate 尾部的 setTimeout(380ms)」，且该回调注册于
              // render() 之后：若 render() 抛异常 / iframe 在 380ms 窗口内被冻结回收，
              // 快照永远留在舞台上（不透明、pointer-events:none 但纯视觉地盖住/混在活动层下）。
              // 现在：①快照带 data-files-ghost 标记；②每次导航前与页面重新激活时先清扫残骸；
              // ③cleanup 先注册后 render（异常也必被 380ms 兜底回收）；④transitionend 提前回收。
              function removeStaleGhosts() {
                if (!stageEl) return;
                var stale = stageEl.querySelectorAll('[data-files-ghost]');
                for (var i = 0; i < stale.length; i++) {
                  try { stale[i].parentNode.removeChild(stale[i]); } catch (e) {}
                }
              }

              function prefersNoMotion() {
                try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
              }
              function depthOf(p) {
                return p === '/' ? 0 : p.split('/').filter(Boolean).length;
              }
              function scrollPageTop() {
                try {
                  var el = stageEl;
                  while (el && el !== document.body) {
                    var st = getComputedStyle(el);
                    if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) { el.scrollTop = 0; return; }
                    el = el.parentElement;
                  }
                } catch (e) {}
              }
              function completeNavAnim() {
                if (navCleanup) { try { navCleanup(); } catch (e) {} navCleanup = null; }
                navAnimating = false;
              }
              function navigate(path) {
                if (path === cwd) return;
                var fwd = depthOf(path) > depthOf(cwd); // 方向基准：导航前的 cwd（面包屑必为回退，行点击必为前进）
                if (navAnimating || prefersNoMotion() || document.hidden || !stageEl || !rootEl) {
                  completeNavAnim();
                  removeStaleGhosts();
                  cwd = path;
                  render();
                  scrollPageTop();
                  return;
                }
                navAnimating = true;
                removeStaleGhosts(); // fix(v7.45)：开场先清扫上次可能滞留的快照

                // 旧层快照（克隆全内容，绝对覆盖，剥 id 纯视觉）
                var ghost = rootEl.cloneNode(true);
                ghost.removeAttribute('id');
                var ids = ghost.querySelectorAll('[id]');
                for (var gi = 0; gi < ids.length; gi++) ids[gi].removeAttribute('id');
                ghost.setAttribute('aria-hidden', 'true');
                ghost.setAttribute('data-files-ghost', '1');
                ghost.style.position = 'absolute';
                ghost.style.inset = '0';
                ghost.style.zIndex = '1';
                ghost.style.pointerEvents = 'none';
                ghost.style.background = 'var(--md-surface,#1a1b1e)';
                ghost.style.margin = '0';
                ghost.style.willChange = 'transform, opacity';
                stageEl.appendChild(ghost);

                // fix(v7.45)：cleanup 先于 render 注册 —— render 抛异常时 380ms 兜底仍能移除快照；
                // 活动层置 z:2 压在快照之上（推入语义：新层在旧层上方；即使快照滞留也不遮挡活动层）
                navCleanup = function() {
                  if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
                  rootEl.style.willChange = '';
                  rootEl.style.transition = '';
                  rootEl.style.transform = '';
                  rootEl.style.opacity = '';
                  rootEl.style.zIndex = '';
                };
                ghost.addEventListener('transitionend', function() { if (navCleanup) completeNavAnim(); }, { once: true });

                try {
                  // 新层渲染 + 回到顶部
                  cwd = path;
                  render();
                  scrollPageTop();

                  var inX = fwd ? '44px' : '-44px';
                  var outX = fwd ? '-30px' : '30px';

                  rootEl.style.zIndex = '2';
                  rootEl.style.willChange = 'transform';
                  rootEl.style.transition = 'none';
                  rootEl.style.transform = 'translateX(' + inX + ') scale(0.985)';
                  rootEl.style.opacity = '0';
                  void rootEl.offsetWidth; // 锁定入场初态

                  rootEl.style.transition = 'transform 0.34s cubic-bezier(0.2, 0.95, 0.25, 1.05), opacity 0.22s ease';
                  rootEl.style.transform = '';
                  rootEl.style.opacity = '';

                  ghost.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.26s ease';
                  ghost.style.transform = 'translateX(' + outX + ') scale(0.99)';
                  ghost.style.opacity = '0';
                } catch (err) {
                  completeNavAnim(); // fix(v7.45)：渲染异常立即回收快照并复位动画状态
                  throw err;
                }
                setTimeout(function() { if (navCleanup) completeNavAnim(); }, 380);
              }

              function esc(s) {
                return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
              }
              function toast(msg) {
                try { if (window.showSystemToast) window.showSystemToast(msg); } catch (e) {}
              }
              function fmtBytes(b) {
                try { if (window.__storageStats) return window.__storageStats.formatBytes(b); } catch (e) {}
                if (!b || b < 0) return '0 B';
                if (b < 1024) return b + ' B';
                if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
                return (b / 1048576).toFixed(2) + ' MB';
              }
              function fmtTime(ts) {
                try { return new Date(ts || Date.now()).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
              }
              function parentOf(p) { var i = p.lastIndexOf('/'); return i <= 0 ? '/' : p.slice(0, i); }
              function baseName(p) { return p.slice(p.lastIndexOf('/') + 1); }

              function iconFor(entry) {
                if (entry.type === 'dir') return '${ICONS.folder}';
                var m = entry.mime || '';
                if (m.indexOf('image/') === 0) return '${ICONS.image}';
                if (m.indexOf('audio/') === 0) return '${ICONS.music_note}';
                if (m.indexOf('video/') === 0) return '${ICONS.videocam}';
                if (m.indexOf('text/') === 0 || m === 'application/json') return '${ICONS.description}';
                return '${ICONS.insert_drive_file}';
              }
              function iconColor(entry) {
                if (entry.type === 'dir') return 'hsl(45 90% 58%)';
                var m = entry.mime || '';
                if (m.indexOf('image/') === 0) return 'hsl(150 60% 52%)';
                if (m.indexOf('audio/') === 0) return 'hsl(280 60% 66%)';
                if (m.indexOf('video/') === 0) return 'hsl(10 70% 58%)';
                if (m.indexOf('text/') === 0 || m === 'application/json') return 'hsl(210 70% 60%)';
                return 'var(--md-on-surface-variant)';
              }

              // ---------- 渲染 ----------
              function scheduleRender() {
                if (renderTimer) return;
                renderTimer = setTimeout(function() { renderTimer = null; render(); }, 120);
              }

              function renderCrumbs() {
                var html = '<span data-crumb=\"/\" style=\"cursor:pointer;\" >内部存储</span>';
                if (cwd !== '/') {
                  var parts = cwd.split('/').filter(Boolean);
                  var acc = '';
                  for (var i = 0; i < parts.length; i++) {
                    acc += '/' + parts[i];
                    html += ' <span style=\"opacity:.55;\">›</span> <span data-crumb=\"' + esc(acc) + '\" style=\"cursor:pointer;' + (i === parts.length - 1 ? 'color:var(--md-on-surface);font-weight:600;' : '') + '\">' + esc(parts[i]) + '</span>';
                  }
                }
                crumbsEl.innerHTML = html;
              }

              function renderSummary() {
                if (cwd !== '/') { summaryEl.style.display = 'none'; return; }
                summaryEl.style.display = 'flex';
                if (!V()) { summaryTextEl.textContent = '虚拟存储未就绪 —— 请刷新页面重试'; return; }
                try {
                  var u = V().usage();
                  var bits = [];
                  for (var i = 0; i < u.byDir.length && i < 3; i++) {
                    bits.push(u.byDir[i].dir.slice(1) + ' ' + fmtBytes(u.byDir[i].bytes));
                  }
                  summaryTextEl.textContent = u.files + ' 个文件 · ' + u.dirs + ' 个目录 · 共 ' + fmtBytes(u.bytes) + (bits.length ? '（' + bits.join('，') + '）' : '');
                } catch (e) {
                  summaryTextEl.textContent = '统计暂不可用（读取异常）';
                }
              }

              function renderPasteBtn() {
                var c = CB();
                var show = !!(c && c.has());
                pasteBtn.style.display = show ? 'inline-flex' : 'none';
                if (show) {
                  var item = c.get();
                  pasteBtn.querySelector('span').textContent = item && item.cut ? '粘贴（移动）' : '粘贴';
                }
              }

              function rowHtml(entry) {
                var meta = entry.type === 'dir' ? (entry.meta && entry.meta.hint) || '' : (fmtBytes(entry.size) + ' · ' + fmtTime(entry.modified));
                return '<div class=\"files-row md3-list-item\" data-path=\"' + esc(entry.path) + '\" data-type=\"' + entry.type + '\" style=\"cursor:pointer;\">'
                  + '<div class=\"md3-list-item-icon\" style=\"color:' + iconColor(entry) + ';\">' + iconFor(entry) + '</div>'
                  + '<div class=\"md3-list-item-text\" style=\"min-width:0;\"><span style=\"display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\">' + esc(entry.name) + '</span><span style=\"font-size:12px;opacity:.6;\">' + esc(meta) + '</span></div>'
                  + (entry.type === 'file'
                    ? '<button class=\"files-act md3-list-item-icon\" data-act=\"copy\" data-path=\"' + esc(entry.path) + '\" title=\"复制\" style=\"color:var(--md-on-surface-variant);\">${ICONS.content_copy}</button>'
                      + '<button class=\"files-act md3-list-item-icon\" data-act=\"more\" data-path=\"' + esc(entry.path) + '\" title=\"更多\" style=\"color:var(--md-on-surface-variant);\">${ICONS.menu}</button>'
                    : '<span style=\"color:var(--md-on-surface-variant);font-size:18px;\">›</span>')
                  + '</div>';
              }

              function render() {
                if (!visible) return;
                if (!V()) {
                  // 存储桥未就绪：给出明确兜底，而不是永远停留在「统计中…」
                  renderCrumbs();
                  summaryEl.style.display = 'flex';
                  summaryTextEl.textContent = '虚拟存储未就绪 —— 请刷新页面重试';
                  emptyEl.style.display = 'block';
                  listEl.innerHTML = '';
                  return;
                }
                renderCrumbs();
                renderSummary();
                renderPasteBtn();
                var entries = V().list(cwd);
                emptyEl.style.display = entries.length ? 'none' : 'block';
                listEl.innerHTML = entries.map(rowHtml).join('');
              }

              // ---------- 通用对话框 ----------
              var dlgResolve = null;
              function askDialog(opts) {
                dlgTitle.textContent = opts.title || '';
                if (opts.message) { dlgMsg.style.display = 'block'; dlgMsg.textContent = opts.message; }
                else { dlgMsg.style.display = 'none'; dlgMsg.textContent = ''; }
                if (opts.input !== undefined) {
                  dlgInput.style.display = 'block';
                  dlgInput.value = opts.input || '';
                } else {
                  dlgInput.style.display = 'none';
                  dlgInput.value = '';
                }
                $('filesDialogOk').style.background = opts.danger ? 'var(--md-error,#b3261e)' : '';
                dlgEl.style.display = 'flex';
                setTimeout(function() {
                  if (dlgInput.style.display !== 'none') {
                    dlgInput.focus();
                    var dot = dlgInput.value.lastIndexOf('.');
                    try { dlgInput.setSelectionRange(0, dot > 0 ? dot : dlgInput.value.length); } catch (e) {}
                  }
                }, 30);
                return new Promise(function(resolve) { dlgResolve = resolve; });
              }
              function closeDialog(val) {
                dlgEl.style.display = 'none';
                if (dlgResolve) { dlgResolve(val); dlgResolve = null; }
              }
              $('filesDialogOk').onclick = function() {
                closeDialog(dlgInput.style.display !== 'none' ? dlgInput.value.trim() : true);
              };
              $('filesDialogCancel').onclick = function() { closeDialog(null); };
              dlgEl.addEventListener('click', function(e) { if (e.target === dlgEl) closeDialog(null); });
              dlgInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') closeDialog(dlgInput.value.trim());
              });
              function validName(name) {
                if (!name || name === '.' || name === '..' || name.indexOf('/') !== -1) return null;
                return name;
              }

              // ---------- 列表交互（事件委托；列表与面包屑共用同一处理器） ----------
              function entryOf(path) {
                return V().stat(path);
              }

              function onListClick(e) {
                if (lastDragMoved) { lastDragMoved = false; return; }
                var actBtn = e.target.closest('.files-act');
                if (actBtn) {
                  e.stopPropagation();
                  var p = actBtn.getAttribute('data-path');
                  if (actBtn.getAttribute('data-act') === 'copy') copyToClipboard(p);
                  else openMoreSheet(p);
                  return;
                }
                var crumb = e.target.closest('[data-crumb]');
                if (crumb) { navigate(crumb.getAttribute('data-crumb') || '/'); return; }
                var row = e.target.closest('.files-row');
                if (!row) return;
                var path = row.getAttribute('data-path');
                var type = row.getAttribute('data-type');
                if (type === 'dir') { navigate(path); }
                else openPreview(path);
              }
              listEl.addEventListener('click', onListClick);
              crumbsEl.addEventListener('click', onListClick); // 面包屑在列表容器外，需单独绑定

              function copyToClipboard(path) {
                var c = CB();
                if (!c) { toast('剪贴板不可用'); return; }
                var r = c.set({ kind: 'files', paths: [path], cut: false }, 'files');
                toast(r.ok ? '已复制 1 项' : (r.error || '复制失败'));
              }

              // ---------- 更多操作面板（复用分享面板容器） ----------
              var morePath = null;
              function openMoreSheet(path) {
                morePath = path;
                shareTitle.textContent = baseName(path);
                var isText = (entryOf(path) || {}).mime || '';
                var isImg = isText.indexOf('image/') === 0;
                shareTargets.innerHTML =
                  '<button class=\"md3-list-item\" data-more=\"cut\" style=\"width:100%;\"><div class=\"md3-list-item-icon\">${ICONS.content_copy}</div><div class=\"md3-list-item-text\">剪切</div></button>'
                  + '<button class=\"md3-list-item\" data-more=\"rename\" style=\"width:100%;\"><div class=\"md3-list-item-icon\">${ICONS.edit}</div><div class=\"md3-list-item-text\">重命名</div></button>'
                  + '<button class=\"md3-list-item\" data-more=\"share\" style=\"width:100%;\"><div class=\"md3-list-item-icon\">${ICONS.quick_share}</div><div class=\"md3-list-item-text\">分享</div></button>'
                  + '<button class=\"md3-list-item\" data-more=\"download\" style=\"width:100%;\"><div class=\"md3-list-item-icon\">${ICONS.download}</div><div class=\"md3-list-item-text\">导出到电脑</div></button>'
                  + '<button class=\"md3-list-item\" data-more=\"del\" style=\"width:100%;\"><div class=\"md3-list-item-icon\" style=\"color:var(--md-error,#f2b8b5);\">${ICONS.delete_forever}</div><div class=\"md3-list-item-text\" style=\"color:var(--md-error,#f2b8b5);\">删除</div></button>';
                shareSheet.style.display = 'block';
              }

              shareTargets.addEventListener('click', function(e) {
                var btn = e.target.closest('[data-more]');
                if (!btn) return;
                var act = btn.getAttribute('data-more');
                shareSheet.style.display = 'none';
                var p = morePath; morePath = null;
                if (!p) return;
                if (act === 'cut') {
                  var c = CB();
                  var r = c && c.set({ kind: 'files', paths: [p], cut: true }, 'files');
                  toast(r && r.ok ? '已剪切 1 项' : '剪切失败');
                } else if (act === 'rename') {
                  doRename(p);
                } else if (act === 'share') {
                  openShareSheet(p);
                } else if (act === 'download') {
                  downloadFile(p);
                } else if (act === 'del') {
                  doDelete(p);
                }
              });
              $('filesShareCancel').onclick = function() { shareSheet.style.display = 'none'; morePath = null; };
              shareSheet.addEventListener('click', function(e) { if (e.target === shareSheet) { shareSheet.style.display = 'none'; morePath = null; } });

              async function doRename(p) {
                var old = baseName(p);
                var name = await askDialog({ title: '重命名', input: old });
                if (name === null) return;
                name = validName(name);
                if (!name) { toast('名称不合法'); return; }
                if (name === old) return;
                var r = await V().move(p, parentOf(p) + '/' + name);
                toast(r.ok ? '已重命名' : (r.error || '重命名失败'));
              }

              async function doDelete(p) {
                var ok = await askDialog({ title: '删除', message: '确定删除「' + baseName(p) + '」吗？' + (entryOf(p) && entryOf(p).type === 'dir' ? '\\n目录内的全部内容都会被删除。' : ''), danger: true });
                if (!ok) return;
                var r = await V().del(p);
                toast(r.ok ? '已删除' : (r.error || '删除失败'));
              }

              function downloadFile(p) {
                V().readBlob(p).then(function(blob) {
                  if (!blob) { toast('读取失败'); return; }
                  var a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = baseName(p);
                  a.style.display = 'none';
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(function() { try { a.remove(); URL.revokeObjectURL(a.href); } catch (e) {} }, 3000);
                  toast('已开始导出');
                });
              }

              // ---------- 分享（files/share → 信息；photo/captured → 相册） ----------
              function openShareSheet(path) {
                var entry = entryOf(path) || {};
                var isImg = (entry.mime || '').indexOf('image/') === 0;
                var isText = (entry.mime || '').indexOf('text/') === 0 || entry.mime === 'application/json';
                shareTitle.textContent = '分享「' + baseName(path) + '」';
                var html = '<button class=\"md3-list-item\" data-share=\"msg\" style=\"width:100%;\"><div class=\"md3-list-item-icon\">${ICONS.chat}</div><div class=\"md3-list-item-text\">发送到 信息</div></button>';
                if (isImg) html += '<button class=\"md3-list-item\" data-share=\"photo\" style=\"width:100%;\"><div class=\"md3-list-item-icon\">${ICONS.image}</div><div class=\"md3-list-item-text\">保存到 相册</div></button>';
                if (isText) html += '<button class=\"md3-list-item\" data-share=\"notes\" style=\"width:100%;\"><div class=\"md3-list-item-icon\">${ICONS.assignment}</div><div class=\"md3-list-item-text\">存为 便签</div></button>';
                shareTargets.innerHTML = html;
                shareTargets.setAttribute('data-sharing-path', path);
                shareSheet.style.display = 'block';
              }

              shareTargets.addEventListener('click', function(e) {
                var btn = e.target.closest('[data-share]');
                if (!btn) return;
                var target = btn.getAttribute('data-share');
                var path = shareTargets.getAttribute('data-sharing-path') || '';
                shareSheet.style.display = 'none';
                shareTargets.removeAttribute('data-sharing-path');
                if (!path) return;
                var emit = function(event, payload) {
                  // 模块应用运行在桌面文档内：BUS_EMIT 必须发到总线所在窗口（window 自身）。
                  // 旧实现只发 window.parent —— 桌面被根壳 iframe 包裹时 parent 是外壳，
                  // 总线收不到，分享会静默丢失（直连桌面测试时恰为顶层故未暴露）。
                  var msg = { type: 'BUS_EMIT', event: event, payload: payload, target: target === 'msg' ? 'msg' : (target === 'photo' ? 'photo' : 'notes') };
                  try { window.postMessage(msg, '*'); } catch (err) {}
                  try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (err) {}
                };
                if (target === 'photo') {
                  V().readBlob(path).then(function(blob) {
                    if (!blob) { toast('读取失败'); return; }
                    var fr = new FileReader();
                    fr.onload = function() {
                      emit('photo/captured', { id: 'fs' + Date.now(), type: 'image', src: String(fr.result), name: baseName(path), noti: { title: '文件已保存到相册', desc: baseName(path) } });
                      toast('已发送到相册');
                    };
                    fr.readAsDataURL(blob);
                  });
                } else if (target === 'notes') {
                  V().readText(path).then(function(text) {
                    emit('files/share', { name: baseName(path), text: text || '', noti: { title: '文件分享到便签', desc: baseName(path) } });
                    toast('已发送到便签');
                  });
                } else {
                  var entry = entryOf(path) || {};
                  var isText = (entry.mime || '').indexOf('text/') === 0 || entry.mime === 'application/json';
                  var send = function(textPart) {
                    emit('files/share', { name: baseName(path), text: textPart, noti: { title: '文件分享到信息', desc: baseName(path) } });
                    toast('已发送到信息');
                  };
                  if (isText) V().readText(path).then(send); else send('（文件）' + baseName(path) + ' · ' + fmtBytes(entry.size || 0));
                }
              });

              // ---------- 预览 ----------
              function closePreview() {
                previewEl.style.display = 'none';
                previewBody.innerHTML = '';
                currentPreviewPath = null;
              }
              $('filesPreviewClose').onclick = closePreview;

              async function openPreview(path) {
                var entry = entryOf(path);
                if (!entry) return;
                currentPreviewPath = path;
                previewName.textContent = entry.name;
                var mime = entry.mime || '';
                var html = '';
                if (mime.indexOf('image/') === 0) {
                  var url = await V().readURL(path);
                  html = url ? '<img src=\"' + url + '\" style=\"max-width:100%;max-height:100%;border-radius:12px;\" alt=\"\" />' : '<div style=\"color:var(--md-on-surface-variant);\">图片加载失败</div>';
                } else if (mime.indexOf('audio/') === 0) {
                  var aurl = await V().readURL(path);
                  html = '<div style=\"width:100%;text-align:center;\">'
                    + '<div style=\"opacity:.5;margin-bottom:18px;\"><span style=\"display:inline-block;transform:scale(2.6);\">${ICONS.music_note}</span></div>'
                    + (aurl ? '<audio src=\"' + aurl + '\" controls style=\"width:100%;max-width:420px;\"></audio>' : '<div style=\"color:var(--md-on-surface-variant);\">音频加载失败</div>')
                    + '</div>';
                } else if (mime.indexOf('video/') === 0) {
                  var vurl = await V().readURL(path);
                  html = vurl ? '<video src=\"' + vurl + '\" controls style=\"max-width:100%;max-height:100%;border-radius:12px;\"></video>' : '<div style=\"color:var(--md-on-surface-variant);\">视频加载失败</div>';
                } else if (mime.indexOf('text/') === 0 || mime === 'application/json') {
                  var text = await V().readText(path);
                  html = '<pre style=\"width:100%;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.7;color:var(--md-on-surface);margin:0;font-family:inherit;\">' + esc(text == null ? '（空文件）' : text) + '</pre>';
                } else {
                  html = '<div style=\"text-align:center;color:var(--md-on-surface-variant);\">'
                    + '<div style=\"opacity:.5;margin-bottom:14px;\"><span style=\"display:inline-block;transform:scale(2.4);\">${ICONS.insert_drive_file}</span></div>'
                    + '<div style=\"font-size:14px;color:var(--md-on-surface);\">' + esc(entry.name) + '</div>'
                    + '<div style=\"font-size:12px;margin-top:4px;\">' + esc(mime || '未知类型') + ' · ' + fmtBytes(entry.size) + '</div>'
                    + '<div style=\"font-size:12px;margin-top:10px;opacity:.8;\">此类文件暂不支持预览，可导出到电脑查看</div>'
                    + '</div>';
                }
                previewBody.innerHTML = html;
                previewEl.style.display = 'flex';

                // ---------- v7.24 应用互联：音频「用音乐播放」深链按钮 ----------
                // 装入 CyanWave 音乐应用：BUS_EMIT(music/import) 先入总线（目标未启动自动
                // 排队、挂载补投），再经桌面图标位姿动画打开音乐 —— 打开即选中新曲并尝试播放。
                // objectURL 由 VFS urlCache 持有（删文件才回收），音乐应用跨界面使用安全。
                if (mime.indexOf('audio/') === 0 && aurl) {
                  var playInMusicBtn = document.createElement('button');
                  playInMusicBtn.type = 'button';
                  playInMusicBtn.textContent = '用音乐播放';
                  playInMusicBtn.style.cssText = 'margin:18px auto 4px;display:block;padding:11px 28px;border:none;'
                    + 'border-radius:9999px;cursor:pointer;font:600 13px/1 var(--md-font,sans-serif);'
                    + 'color:#fff;background:var(--md-primary,#4f9cf9)';
                  playInMusicBtn.onclick = function() {
                    var msg = { type: 'BUS_EMIT', event: 'music/import', target: 'music',
                      payload: { url: aurl, name: baseName(path), autoPlay: true, __silent: true } };
                    // srcdoc 与桌面同文档：发自身窗口即入总线；包根壳时再补发 parent 双保险
                    try { window.postMessage(msg, '*'); } catch (err) {}
                    try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (err) {}
                    if (window.__shareSheet && typeof window.__shareSheet.openAppById === 'function') {
                      window.__shareSheet.openAppById('music');
                    } else {
                      toast('已投递到音乐应用（独立打开模式无桌面动画）');
                    }
                    closePreview();
                  };
                  previewBody.appendChild(playInMusicBtn);
                }
              }

              $('filesPreviewDownload').onclick = function() { if (currentPreviewPath) downloadFile(currentPreviewPath); };
              $('filesPreviewShare').onclick = function() {
                if (!currentPreviewPath) return;
                openShareSheet(currentPreviewPath);
              };

              // ---------- 工具行按钮 ----------
              $('filesBtnMkdir').onclick = async function() {
                var name = await askDialog({ title: '新建文件夹', input: '新建文件夹' });
                if (name === null) return;
                name = validName(name);
                if (!name) { toast('名称不合法'); return; }
                var r = await V().mkdir(cwd === '/' ? '/' + name : cwd + '/' + name);
                toast(r.ok ? '文件夹已创建' : (r.error || '创建失败'));
              };

              $('filesBtnNewTxt').onclick = async function() {
                var name = await askDialog({ title: '新建文本文档', input: '新建文本.txt' });
                if (name === null) return;
                name = validName(name);
                if (!name) { toast('名称不合法'); return; }
                var r = await V().write((cwd === '/' ? '' : cwd) + '/' + name, '', { owner: 'files' });
                toast(r.ok ? '文档已创建' : (r.error || '创建失败'));
              };

              $('filesBtnImport').onclick = function() { $('filesFileInput').click(); };
              $('filesFileInput').addEventListener('change', function(e) {
                var files = Array.prototype.slice.call(e.target.files || []);
                e.target.value = '';
                if (!files.length) return;
                var done = 0, fail = 0;
                // fix(audit-E): 导入失败时把 vfs 返回的 r.error（如「目标已存在同名文件」）
                // 如实透出 —— 此前只统计失败个数，用户看不到失败原因
                var lastErr = '';
                var next = function(i) {
                  if (i >= files.length) {
                    toast('导入完成：成功 ' + done + ' 个' + (fail ? '，失败 ' + fail + ' 个' + (lastErr ? '（' + lastErr + '）' : '') : ''));
                    return;
                  }
                  var f = files[i];
                  V().write((cwd === '/' ? '' : cwd) + '/' + f.name, f, { owner: 'files' }).then(function(r) {
                    if (r.ok) done++; else { fail++; lastErr = r.error || ''; }
                    next(i + 1);
                  });
                };
                next(0);
              });

              pasteBtn.onclick = async function() {
                var c = CB();
                var item = c && c.get();
                if (!item) return;
                if (item.kind === 'files') {
                  var moved = 0, fail = 0;
                  for (var i = 0; i < item.paths.length; i++) {
                    var p = item.paths[i];
                    var target = (cwd === '/' ? '' : cwd) + '/' + baseName(p);
                    if (item.cut && (target === p || target.indexOf(p + '/') === 0)) { fail++; continue; }
                    // 同名自动加序号
                    var finalTarget = target, n = 1;
                    while (V().exists(finalTarget)) {
                      var dot = target.lastIndexOf('.');
                      finalTarget = dot > target.lastIndexOf('/') ? target.slice(0, dot) + ' (' + n + ')' + target.slice(dot) : target + ' (' + n + ')';
                      n++;
                    }
                    var r = item.cut ? await V().move(p, finalTarget) : await V().copy(p, finalTarget);
                    if (r.ok) moved++; else fail++;
                  }
                  if (item.cut && c.clear && !fail) c.clear();
                  toast((item.cut ? '已移动 ' : '已粘贴 ') + moved + ' 项' + (fail ? '，失败 ' + fail + ' 项' : ''));
                } else if (item.kind === 'image') {
                  var name = item.name || ('clipboard_' + Date.now() + '.png');
                  var dot2 = name.lastIndexOf('.');
                  var base2 = dot2 > 0 ? name.slice(0, dot2) : name;
                  var ext2 = dot2 > 0 ? name.slice(dot2) : '';
                  var t2 = (cwd === '/' ? '' : cwd) + '/' + base2 + ext2, k = 1;
                  while (V().exists(t2)) { t2 = (cwd === '/' ? '' : cwd) + '/' + base2 + ' (' + k + ')' + ext2; k++; }
                  var r2 = await V().write(t2, item.dataUrl, { owner: 'files' });
                  toast(r2.ok ? '图片已粘贴为 ' + base2 + ext2 : (r2.error || '粘贴失败'));
                } else if (item.kind === 'text') {
                  var tname = '剪贴板_' + new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/[\s\/:]+/g, '') + '.txt';
                  var r3 = await V().write((cwd === '/' ? '' : cwd) + '/' + tname, item.text, { owner: 'files' });
                  toast(r3.ok ? '文本已粘贴为 ' + tname : (r3.error || '粘贴失败'));
                }
              };

              // ---------- 轻量拖拽：长按文件拖到文件夹行即移动 ----------
              var drag = null; // { path, ghost, started }
              function pageEl() { return listEl.closest('.app-page') || document.body; }
              function dragGhost(entry, x, y) {
                var g = document.createElement('div');
                g.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:14px;background:var(--md-surface-container-high,#2a2a32);box-shadow:0 8px 24px rgba(0,0,0,.4);font-size:13px;color:var(--md-on-surface);max-width:200px;';
                g.innerHTML = '<span style=\"width:18px;height:18px;display:inline-flex;color:' + iconColor(entry) + ';\">' + iconFor(entry) + '</span><span style=\"overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\">' + esc(entry.name) + '</span>';
                g.style.left = (x + 12) + 'px';
                g.style.top = (y - 10) + 'px';
                return g;
              }
              function clearDragHighlight() {
                listEl.querySelectorAll('.files-row.drag-over').forEach(function(el) { el.style.background = ''; el.classList.remove('drag-over'); });
              }
              listEl.addEventListener('pointerdown', function(e) {
                if (e.button !== undefined && e.button !== 0) return;
                if (e.target.closest('.files-act')) return;
                var row = e.target.closest('.files-row');
                if (!row || row.getAttribute('data-type') !== 'file') return;
                var path = row.getAttribute('data-path');
                var entry = entryOf(path);
                if (!entry) return;
                var startX = e.clientX, startY = e.clientY;
                // fix(audit-E): 起拖只允许长按定时器触发（360ms 内不动）—— 此前「8px
                // 任意方向位移即起拖」与触摸滚动列表手势冲突，手指一滑就误开拖拽。
                // 指针移动超过 10px（容抖动）即取消长按，滚动/滑动不再误起拖。
                var timer = setTimeout(function() { startDrag(entry, e.clientX, e.clientY); }, 360);
                var onMove = function(ev) {
                  if (!drag && (Math.abs(ev.clientX - startX) > 10 || Math.abs(ev.clientY - startY) > 10)) {
                    clearTimeout(timer); // 移动即放弃长按起拖（滚动/惯性路径）
                  }
                  if (drag && drag.started) {
                    drag.ghost.style.left = (ev.clientX + 12) + 'px';
                    drag.ghost.style.top = (ev.clientY - 10) + 'px';
                    clearDragHighlight();
                    var el = document.elementFromPoint(ev.clientX, ev.clientY);
                    var over = el && el.closest ? el.closest('.files-row[data-type=\"dir\"]') : null;
                    if (over && over.getAttribute('data-path') !== drag.path) {
                      over.classList.add('drag-over');
                      over.style.background = 'hsl(var(--md-h,215) 80% 60% / 0.14)';
                    }
                  }
                };
                // fix(audit-E): 补 pointercancel —— 浏览器接管手势（触摸滚动/系统弹窗等）
                // 时 pointerup 永不到来，旧实现的 ghost 与 window 监听全部滞留。
                // cancel 复用 onUp 的清理路径但不执行落点移动（手势被系统取消，无有效落点）。
                var dragFinish = function(ev, performDrop) {
                  clearTimeout(timer);
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                  window.removeEventListener('pointercancel', onCancel);
                  if (drag && drag.started) {
                    if (performDrop) {
                      var el = document.elementFromPoint(ev.clientX, ev.clientY);
                      var over = el && el.closest ? el.closest('.files-row[data-type=\"dir\"]') : null;
                      if (over) {
                        var dstDir = over.getAttribute('data-path');
                        var target = dstDir === '/' ? '/' + baseName(drag.path) : dstDir + '/' + baseName(drag.path);
                        if (target !== drag.path) {
                          V().move(drag.path, target).then(function(r) { toast(r.ok ? '已移动到 ' + baseName(dstDir) : (r.error || '移动失败')); });
                        }
                        lastDragMoved = true;
                        setTimeout(function() { lastDragMoved = false; }, 250);
                      }
                    }
                    try { drag.ghost.remove(); } catch (err) {}
                    clearDragHighlight();
                    drag = null;
                  }
                };
                var onUp = function(ev) { dragFinish(ev, true); };
                var onCancel = function(ev) { dragFinish(ev, false); };
                function startDrag(entry2, x, y) {
                  if (drag && drag.started) return;
                  drag = { path: entry2.path, ghost: dragGhost(entry2, x, y), started: true };
                  pageEl().appendChild(drag.ghost);
                  try { if (navigator.vibrate) navigator.vibrate(8); } catch (err) {}
                }
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
              });

              // ---------- VFS / 剪贴板订阅 + 页面激活 ----------
              // 监听/订阅统一登记：实例销毁时由 page-stack 集中退订（防重建累积泄漏）
              var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
              var addCleanup = window.__addAppCleanup || function() {};
              if (V()) {
                var unVfs = V().subscribe('/', scheduleRender);
                addCleanup('files', function() { try { unVfs(); } catch (err) {} });
              }
              if (CB()) {
                var unClip = CB().subscribe(renderPasteBtn);
                addCleanup('files', function() { try { unClip(); } catch (err) {} });
              }

              bindDoc('files', 'app-page-active', function(e) {
                if (!e.detail || e.detail.appId !== 'files') return;
                visible = e.detail.pageIdx === 0;
                if (visible) {
                  removeStaleGhosts(); // fix(v7.45)：重新激活时清扫可能滞留的动画快照（issue #5 img6）
                  if (previewEl.style.display === 'flex' && currentPreviewPath) {
                    // 从分享面板返回预览：恢复预览浮层
                    previewEl.style.display = 'flex';
                  }
                  render();
                }
              });

              // ---------- v7.28 预览式返回：目录上行（导航栏返回键 + 边缘手势卡式跟手） ----------
              // 卡片数学与 PBNav / 宿主 renderSubPages 同源：scale 0.90 / 圆角 28px / 深投影；
              // 手势期当前目录页化为卡片右移，上层目录就位于卡下（预测性揭示）。
              var PB_MIN_SCALE = 0.90, PB_SPAN = 0.10, PB_RADIUS = 28, PB_SHADOW = 0.45, PB_TRACK = 0.85;
              // v7.41 方向/垂直跟随：pbDir=+1 页面右移（左缘右滑）/ -1 左移（右缘左滑）；
              // pbTy 手势期纵向位移（渲染 × q）。按钮触发（triggerBack）走规范右滑
              var pbDir = 1, pbTy = 0;
              var PB_TY_GAIN = 0.18, PB_TY_MAX = 72;
              var pbCard = null; // { el, fromPath }

              function pbApplyCard(el, p) {
                var q = 1 - Math.max(0, Math.min(1, p));
                if (q <= 0.001) { el.style.transform = ''; el.style.borderRadius = ''; el.style.boxShadow = ''; el.style.overflow = ''; return; }
                var scale = Math.max(PB_MIN_SCALE, 1 - PB_SPAN * q);
                var dirSign = (pbDir === -1) ? -1 : 1;
                var tyPx = pbTy * q;
                el.style.transform = 'translate3d(' + (dirSign * q * 100).toFixed(2) + '%,' + tyPx.toFixed(1) + 'px,0) scale(' + scale.toFixed(4) + ')';
                el.style.borderRadius = (q * PB_RADIUS).toFixed(1) + 'px';
                el.style.boxShadow = '0 16px 44px rgba(0,0,0,' + (PB_SHADOW * q).toFixed(3) + '), 0 2px 10px rgba(0,0,0,0.2)';
                el.style.overflow = 'hidden';
              }

              function pbMakeCard() {
                completeNavAnim(); // 动中再导航即完成旧场（v7.27 纪律）
                var card = rootEl.cloneNode(true);
                card.removeAttribute('id');
                var ids = card.querySelectorAll('[id]');
                for (var ci = 0; ci < ids.length; ci++) ids[ci].removeAttribute('id');
                card.setAttribute('aria-hidden', 'true');
                card.style.position = 'absolute';
                card.style.inset = '0';
                card.style.zIndex = '3';
                card.style.pointerEvents = 'none';
                card.style.background = 'var(--md-surface,#1a1b1e)';
                card.style.margin = '0';
                card.style.willChange = 'transform, border-radius, box-shadow, opacity';
                stageEl.style.overflow = 'hidden'; // 卡片横移出舞台期间禁止横向溢出滚动
                stageEl.appendChild(card);
                return card;
              }

              function pbRemoveCard(card) {
                if (card && card.parentNode) card.parentNode.removeChild(card);
                if (stageEl) stageEl.style.overflow = '';
              }

              function pbCanBack() {
                return !!(previewEl.style.display === 'flex' || cwd !== '/');
              }

              function pbTriggerBack() {
                if (pbCard) return; // 手势进行中：交给手势收尾
                if (previewEl.style.display === 'flex') { closePreview(); return; }
                if (cwd === '/') return;
                pbDir = 1; pbTy = 0; // v7.41：按钮返回走规范右滑通道
                if (prefersNoMotion() || document.hidden || !stageEl || !rootEl) {
                  completeNavAnim(); cwd = parentOf(cwd); render(); scrollPageTop(); return;
                }
                var from = cwd;
                var card = pbMakeCard();
                cwd = parentOf(from); render(); scrollPageTop();
                pbCard = { el: card, fromPath: from };
                pbApplyCard(card, 1);
                void card.offsetWidth;
                card.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.95, 0.25, 1.05), opacity 0.26s ease, border-radius 0.3s ease, box-shadow 0.3s ease';
                pbApplyCard(card, 0);
                card.style.opacity = '0';
                setTimeout(function() { pbRemoveCard(card); if (pbCard && pbCard.el === card) pbCard = null; }, 320);
              }

              /** @param {number} [dir] +1 左缘右滑（页面右移）/ -1 右缘左滑（页面左移） */
              function pbBeginGesture(dir) {
                if (pbCard) return;
                if (previewEl.style.display === 'flex') { closePreview(); return; } // 预览浮层：手势起点即收起
                if (cwd === '/') return;
                pbDir = (dir === -1) ? -1 : 1; // v7.41：记录手势方向
                pbTy = 0;
                var card = pbMakeCard();
                var from = cwd;
                cwd = parentOf(from); render(); scrollPageTop(); // 上层目录就位于卡下
                pbCard = { el: card, fromPath: from };
              }

              function pbProgressGesture(dx, dy) {
                if (!pbCard) return;
                var w = Math.max(1, (stageEl && stageEl.clientWidth) || (rootEl && rootEl.clientWidth) || 1);
                var step = Math.max(0, Math.min(1, dx / (w * PB_TRACK)));
                // v7.41：纵向跟随手指（渲染时 × q，随返回进度出现）
                pbTy = Math.max(-PB_TY_MAX, Math.min(PB_TY_MAX, (typeof dy === 'number' ? dy : 0) * PB_TY_GAIN));
                pbApplyCard(pbCard.el, 1 - step);
              }

              function pbEndGesture(commit, vx) {
                if (!pbCard) return;
                var card = pbCard.el, from = pbCard.fromPath;
                pbCard = null;
                card.style.transition = 'transform 0.26s cubic-bezier(0.2, 0.95, 0.25, 1.05), opacity 0.24s ease, border-radius 0.26s ease, box-shadow 0.26s ease';
                if (commit) {
                  card.style.opacity = '0';
                  pbApplyCard(card, 0);
                  setTimeout(function() { pbRemoveCard(card); }, 280);
                } else {
                  pbApplyCard(card, 1); // 回满屏
                  setTimeout(function() {
                    cwd = from; render(); // 卡下换回原目录后再撤卡（零闪烁）
                    pbRemoveCard(card);
                  }, 270);
                }
              }

              window.__filesPB = {
                canBack: pbCanBack,
                triggerBack: pbTriggerBack,
                beginGesture: pbBeginGesture,
                progressGesture: pbProgressGesture,
                endGesture: pbEndGesture,
                __dir: function () { return pbDir; }, // v7.41 测试透视
              };

              // 首次进入（实例创建即激活第 0 页）
              visible = true;
              render();
            })();
          </script>
        </div>
      `,
    },
  ],
};
