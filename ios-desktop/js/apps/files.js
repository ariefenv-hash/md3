// ==================== files.js — 文件管理器（v7.51 · Files by Google 风格整体重制） ====================
//
// issue #7（v7.51）⑨：按用户提供的网页版文件管理器（index1.html）整体替换旧 UI。
//  - 桌面级「模块渲染型」应用不变（pages[].content + 内联 IIFE，直连 VFS/剪贴板桥）
//  - 三标签：首页（存储卡 + 分类 + 最近）/ 清理（真实大文件清理，砍掉全部假数据演示）/
//    浏览（VFS 目录树 + 排序/视图切换 + 多选批量操作）
//  - 平板模式：容器 ≥620px 切左侧导航栏（css/files-app.css .fj-wide）
//  - 图标全部内联 SVG 描边绘制（零字体/零连字依赖，从根上杜绝图标引用失败）
//  - 砍去的演示性功能：演示用清理脚本、演示用应用清单、PIN 门禁演示、扫描文档、
//    抽屉（条款/帮助）、回收站演示、主题种子切换（跟随系统主题）
//  - 保留的既有能力：目录动画下钻、预览（图/音/视/文 + 音乐深链）、重命名/删除、
//    复制/剪切/粘贴（clipboard.js）、导入/导出、分享（信息/相册/便签）、v7.28 预览式返回桥
//
// 生命周期：模块应用页面脚本只执行一次、实例常驻内存（page-stack.js），
// 动态内容靠事件委托 + app-page-active 激活重建；监听统一走 __bindAppDocListener 登记。

// ==================== 内联描边图标集（零字体依赖） ====================
// 模板 ${ic(...)} 在模块求值期渲染 → ic 必须处于模块顶层作用域；
// 页面内联 <script>（实例创建期才执行）经 window.__fjIc 桥取同一份图标，
// 全站图标零字体/零连字依赖 —— 从根上杜绝 Material Symbols 连字缺失型图标引用失败

            var I = {
              home: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/>',
              sparkle: '<path d="M12 4l1.7 4.6L18 10l-4.3 1.4L12 16l-1.7-4.6L6 10l4.3-1.4z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
              browse: '<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2.5h6A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17z"/>',
              folder: '<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2.5h6A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17z"/>',
              image: '<rect x="4" y="5" width="16" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4.5 17l4.5-4.5 3 3 3.5-3.5 4 4"/>',
              video: '<rect x="3.5" y="6" width="17" height="12" rx="3"/><path d="M10.5 9.8l4.2 2.2-4.2 2.2z"/>',
              audio: '<path d="M9 17.5V6.8l9-1.8v10.5"/><circle cx="7" cy="17.5" r="2"/><circle cx="16" cy="15.5" r="2"/>',
              doc: '<path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5z"/><path d="M14 3.5V8h4"/><path d="M9 12.5h6M9 16h6"/>',
              zip: '<rect x="5" y="4" width="14" height="16" rx="2.5"/><path d="M12 4v3M12 9v2M12 13v2"/><path d="M10 18.5h4"/>',
              apk: '<rect x="5" y="6" width="14" height="14" rx="3"/><path d="M12 10v5M9.8 12.2L12 10l2.2 2.2"/><path d="M8.5 6l-1.5-2.5M15.5 6l1.5-2.5"/>',
              file: '<path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5z"/><path d="M14 3.5V8h4"/>',
              back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
              close: '<path d="M6 6l12 12M18 6L6 18"/>',
              add: '<path d="M12 5v14M5 12h14"/>',
              morev: '<circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/>',
              listv: '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"/><circle cx="4.5" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="17.5" r="1" fill="currentColor" stroke="none"/>',
              gridv: '<rect x="4.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="4.5" y="13.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="13.5" width="6" height="6" rx="1.5"/>',
              sort: '<path d="M7 5v14M7 19l-2.8-2.8M7 19l2.8-2.8"/><path d="M17 19V5M17 5l-2.8 2.8M17 5l2.8 2.8"/>',
              share: '<circle cx="6.5" cy="12" r="2.2"/><circle cx="17" cy="6" r="2.2"/><circle cx="17" cy="18" r="2.2"/><path d="M8.5 10.9l6.2-3.7M8.5 13.1l6.2 3.7"/>',
              download: '<path d="M12 4v10M12 14l-3.6-3.6M12 14l3.6-3.6"/><path d="M5 19.5h14"/>',
              copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M5.5 14.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/>',
              move: '<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2.5h6A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17z"/><path d="M10 14h5M13 11.8l2.2 2.2-2.2 2.2"/>',
              edit: '<path d="M4 20l4.2-.9L19.4 7.9a1.6 1.6 0 0 0 0-2.3l-1-1a1.6 1.6 0 0 0-2.3 0L4.9 15.8z"/><path d="M14.5 6.5l3 3"/>',
              trash: '<path d="M5 7h14M10 7V5.2A1.2 1.2 0 0 1 11.2 4h1.6A1.2 1.2 0 0 1 14 5.2V7M6.5 7l.8 11.6A1.7 1.7 0 0 0 9 20.2h6a1.7 1.7 0 0 0 1.7-1.6L17.5 7"/><path d="M10.2 11v5.5M13.8 11v5.5"/>',
              check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
              selall: '<rect x="4.5" y="4.5" width="15" height="15" rx="3.5"/><path d="M8.5 12.2l2.6 2.6 4.9-5"/>',
              info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none"/>',
              search: '<circle cx="11" cy="11" r="6.5"/><path d="M19.5 19.5L15 15"/>',
            };
            function ic(n, st) {
              return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + (st ? ' style="' + st + '"' : '') + '>' + (I[n] || '') + '</svg>';
            }
if (typeof window !== 'undefined') window.__fjIc = ic;

export default {
  id: 'files',
  name: '文件',
  pages: [
    {
      title: '文件',
      content: `
        <div class="fj-app" id="fjApp">
          <!-- 平板模式左侧导航栏 -->
          <aside class="fj-rail">
            <div class="fj-rail-logo"><span class="lg">${ic('folder')}</span><span>文件</span></div>
            <button class="fj-ritem" data-tab="0">${ic('home')}<span>首页</span></button>
            <button class="fj-ritem" data-tab="1">${ic('sparkle')}<span>清理</span></button>
            <button class="fj-ritem" data-tab="2">${ic('browse')}<span>浏览</span></button>
            <div class="fj-rail-storage" id="fjRailStorage"></div>
          </aside>

          <div class="fj-main">
            <div class="fj-top">
              <div class="fj-title" id="fjTitle">文件</div>
              <button class="fj-ibtn" id="fjBtnSort" title="排序与视图">${ic('sort')}</button>
            </div>

            <div class="fj-screens">
              <section class="fj-screen on" id="fjHome"></section>
              <section class="fj-screen" id="fjClean"></section>
              <section class="fj-screen" id="fjBrowse"></section>

              <!-- 目录/分类下钻子页 -->
              <div class="fj-sub" id="fjSub">
                <div class="fj-subtop">
                  <button class="fj-ibtn" id="fjSubBack">${ic('back')}</button>
                  <div class="fj-subtitle" id="fjSubTitle">文件夹</div>
                </div>
                <div class="fj-subbody" id="fjSubBody"></div>
              </div>

              <!-- 多选操作条 -->
              <div class="fj-seltop" id="fjSelTop">
                <button class="fj-ibtn" id="fjSelClose" style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:none;">${ic('close')}</button>
                <div class="cnt"><div class="a" id="fjSelCount">已选择 0 项</div><div class="b" id="fjSelHint"></div></div>
                <button class="fj-ibtn" id="fjSelAll" style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:none;">${ic('selall')}</button>
                <button class="fj-ibtn" id="fjSelMore" style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:none;">${ic('morev')}</button>
              </div>
            </div>

            <button class="fj-fab" id="fjFab" aria-label="新建">${ic('add')}</button>

            <nav class="fj-navbar" id="fjNavbar">
              <div id="fjNavPill"></div>
              <button class="fj-nitem on" data-tab="0"><span class="nico">${ic('home')}</span><span class="nl">首页</span></button>
              <button class="fj-nitem" data-tab="1"><span class="nico">${ic('sparkle')}</span><span class="nl">清理</span></button>
              <button class="fj-nitem" data-tab="2"><span class="nico">${ic('browse')}</span><span class="nl">浏览</span></button>
            </nav>

            <div class="fj-selbot" id="fjSelBot">
              <button class="fj-btn danger" id="fjSelDel" style="width:100%;">${ic('trash')}删除所选</button>
            </div>
          </div>

          <!-- 底部抽屉 -->
          <div class="fj-sheetwrap" id="fjSheetWrap">
            <div class="fj-mscrim" data-sheet-close></div>
            <div class="fj-sheet" id="fjSheet"></div>
          </div>

          <!-- 对话框 -->
          <div class="fj-dialog" id="fjDialog">
            <div class="fj-dbk" data-dialog-close></div>
            <div class="fj-dbox">
              <div class="fj-dt" id="fjDlgTitle"></div>
              <div class="fj-db" id="fjDlgMsg" style="display:none;"></div>
              <input class="fj-din" id="fjDlgInput" spellcheck="false" style="display:none;" />
              <div class="fj-dact">
                <button class="fj-btn" id="fjDlgCancel">取消</button>
                <button class="fj-btn" id="fjDlgOk">确定</button>
              </div>
            </div>
          </div>

          <!-- 预览 -->
          <div class="fj-preview" id="fjPreview">
            <div class="fj-pvtop">
              <button class="fj-ibtn" id="fjPvClose">${ic('back')}</button>
              <div class="fj-pvname" id="fjPvName"></div>
              <button class="fj-ibtn" id="fjPvShare" title="分享">${ic('share')}</button>
              <button class="fj-ibtn" id="fjPvDl" title="导出到电脑">${ic('download')}</button>
            </div>
            <div class="fj-pvbody" id="fjPvBody"></div>
          </div>

          <!-- Snackbar -->
          <div class="fj-snack" id="fjSnack"></div>

          <input type="file" id="fjFileInput" multiple style="display:none;" />
        </div>

        <script>
          (function() {
            'use strict';
            var V = function() { return window.__vfs || null; };
            var CB = function() { return window.__clipboard || null; };
            var $ = function(id) { return document.getElementById(id); };

            var app = $('fjApp'), homeEl = $('fjHome'), cleanEl = $('fjClean'), browseEl = $('fjBrowse');
            var subEl = $('fjSub'), subBody = $('fjSubBody'), subTitle = $('fjSubTitle');
            var sheetWrap = $('fjSheetWrap'), sheetEl = $('fjSheet');
            var dlgEl = $('fjDialog'), dlgTitle = $('fjDlgTitle'), dlgMsg = $('fjDlgMsg'), dlgInput = $('fjDlgInput');
            var snackEl = $('fjSnack');
            var pvEl = $('fjPreview'), pvBody = $('fjPvBody'), pvName = $('fjPvName');
            var selTop = $('fjSelTop'), selBot = $('fjSelBot');
            var fab = $('fjFab'), navPill = $('fjNavPill'), navbar = $('fjNavbar');
            var fileInput = $('fjFileInput');

            // 文档监听登记（实例销毁自动退订）/ 清理登记 —— 全脚本多处使用，前置定义
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var addCleanup = window.__addAppCleanup || function() {};

            // ==================== 状态 ====================
            var S = {
              tab: 0,
              view: 'list',          // list | grid
              sort: 'date',          // date | name | size
              selMode: false,
              sel: new Set(),        // 选中 path 集合
              sub: null,             // { kind:'dir', dir } | { kind:'cat', key }
              visible: false,
              cache: { t: 0, files: null },
            };
            var currentPreviewPath = null;
            var lastErrPath = null;

            // ==================== 基础工具 ====================
            function esc(s) {
              return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
            }
            function fmtBytes(b) {
              try { if (window.__storageStats) return window.__storageStats.formatBytes(b); } catch (e) {}
              if (!b || b < 0) return '0 B';
              if (b < 1024) return b + ' B';
              if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
              if (b < 1073741824) return (b / 1048576).toFixed(2) + ' MB';
              return (b / 1073741824).toFixed(2) + ' GB';
            }
            function fmtTime(ts) {
              try { return new Date(ts || Date.now()).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
            }
            function parentOf(p) { var i = p.lastIndexOf('/'); return i <= 0 ? '/' : p.slice(0, i); }
            function baseName(p) { return p.slice(p.lastIndexOf('/') + 1); }
            function validName(name) {
              if (!name || name === '.' || name === '..' || name.indexOf('/') !== -1) return null;
              return name;
            }
            function snack(msg, icn) {
              snackEl.innerHTML = ic(icn || 'check') + '<span>' + esc(msg) + '</span>';
              snackEl.classList.add('on');
              clearTimeout(snackEl._t);
              snackEl._t = setTimeout(function() { snackEl.classList.remove('on'); }, 2600);
            }

            // ==================== VFS 数据层 ====================
            function flatFiles() {
              // 全库扁平文件清单（带 300ms 缓存；VFS 订阅会主动失效）
              var now = Date.now();
              if (S.cache.files && now - S.cache.t < 300) return S.cache.files;
              var out = [];
              function rec(dir) {
                var list;
                try { list = V().list(dir) || []; } catch (e) { return; }
                for (var i = 0; i < list.length; i++) {
                  var e = list[i];
                  if (e.type === 'dir') rec(e.path);
                  else out.push(e);
                }
              }
              if (V()) { try { rec('/'); } catch (e) {} }
              S.cache.t = now;
              S.cache.files = out;
              return out;
            }
            function usageSafe() {
              try { return V().usage(); } catch (e) { return null; }
            }
            var CATS = [
              { key: 'image', label: '图片', exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic'], mime: 'image/', color: '#8ab4f8', icon: 'image' },
              { key: 'video', label: '视频', exts: ['mp4', 'mov', 'webm', 'avi', 'mkv'], mime: 'video/', color: '#f28b82', icon: 'video' },
              { key: 'audio', label: '音频', exts: ['mp3', 'wav', 'ogg', 'flac', 'm4a'], mime: 'audio/', color: '#81c995', icon: 'audio' },
              { key: 'doc', label: '文档', exts: ['txt', 'md', 'json', 'pdf', 'doc', 'docx', 'html', 'csv'], mime: 'text/', color: '#fdd663', icon: 'doc' },
              { key: 'zip', label: '压缩包', exts: ['zip', 'tar', 'gz', 'rar', '7z'], mime: 'application/zip', color: '#b39ddb', icon: 'zip' },
              { key: 'apk', label: '安装包', exts: ['apk'], mime: 'application/vnd.android.package-archive', color: '#5c6bc0', icon: 'apk' },
            ];
            function extOf(name) {
              var dot = name.lastIndexOf('.');
              return dot > -1 ? name.slice(dot + 1).toLowerCase() : '';
            }
            function catOf(entry) {
              var m = entry.mime || '', ext = extOf(entry.name || '');
              for (var i = 0; i < CATS.length; i++) {
                var c = CATS[i];
                if (c.mime && m.indexOf(c.mime) === 0) return c;
                if (c.exts.indexOf(ext) !== -1) return c;
              }
              return null;
            }
            function filesOfCat(key) {
              var cat = null;
              for (var i = 0; i < CATS.length; i++) if (CATS[i].key === key) cat = CATS[i];
              if (!cat) return [];
              return flatFiles().filter(function(e) {
                var m = e.mime || '', ext = extOf(e.name || '');
                return (cat.mime && m.indexOf(cat.mime) === 0) || cat.exts.indexOf(ext) !== -1;
              });
            }
            function sorted(list) {
              var arr = list.slice();
              if (S.sort === 'name') arr.sort(function(a, b) { return (a.name || '').localeCompare(b.name || '', 'zh-CN'); });
              else if (S.sort === 'size') arr.sort(function(a, b) { return (b.size || 0) - (a.size || 0); });
              else arr.sort(function(a, b) { return (b.modified || 0) - (a.modified || 0); });
              return arr;
            }
            function listDir(dir) {
              var entries;
              try { entries = V().list(dir) || []; } catch (e) { entries = []; }
              var dirs = [], files = [];
              for (var i = 0; i < entries.length; i++) (entries[i].type === 'dir' ? dirs : files).push(entries[i]);
              return { dirs: sorted(dirs), files: sorted(files) };
            }

            // 图标集已提升至模块顶层（模板 ${ic()} 需在模块求值期渲染）；内联脚本经 window 桥取用
            var ic = function(n, st) { return window.__fjIc(n, st); };
            function iconForEntry(entry) {
              if (entry.type === 'dir') return 'folder';
              var cat = catOf(entry);
              if (cat) return cat.icon;
              return 'file';
            }
            function colorForEntry(entry) {
              if (entry.type === 'dir') return 'hsl(45 90% 58%)';
              var cat = catOf(entry);
              return cat ? cat.color : 'var(--md-on-surface-variant)';
            }

            // ==================== 对话框 / 抽屉 ====================
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
              $('fjDlgOk').className = 'fj-btn' + (opts.danger ? ' danger' : '');
              dlgEl.classList.add('on');
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
              dlgEl.classList.remove('on');
              if (dlgResolve) { dlgResolve(val); dlgResolve = null; }
            }
            $('fjDlgOk').onclick = function() { closeDialog(dlgInput.style.display !== 'none' ? dlgInput.value.trim() : true); };
            $('fjDlgCancel').onclick = function() { closeDialog(null); };
            dlgInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') closeDialog(dlgInput.value.trim()); });

            function openSheet(html) {
              sheetEl.innerHTML = '<div class="grab"></div>' + html;
              sheetWrap.classList.add('on');
            }
            function closeSheet() { sheetWrap.classList.remove('on'); }

            // ==================== Tab 切换 ====================
            function switchTab(i) {
              if (S.tab === i) return;
              S.tab = i;
              exitSel();
              renderTabs();
              renderAll();
            }
            function renderTabs() {
              var w = navbar.clientWidth || 1;
              var itemW = w / 3;
              navPill.style.width = (itemW - 24) + 'px';
              navPill.style.transform = 'translateX(' + (S.tab * itemW + 12) + 'px)';
              navbar.querySelectorAll('.fj-nitem').forEach(function(b) {
                b.classList.toggle('on', +b.dataset.tab === S.tab);
              });
              app.querySelectorAll('.fj-ritem').forEach(function(b) {
                b.classList.toggle('on', +b.dataset.tab === S.tab);
              });
            }

            // ==================== 渲染：行组件 ====================
            function selboxHtml(path) {
              var on = S.sel.has(path);
              return '<span class="fj-selbox' + (on ? ' on' : '') + '" data-selbox="' + esc(path) + '">' + ic('check') + '</span>';
            }
            function rowHtml(entry, opts) {
              opts = opts || {};
              var meta = entry.type === 'dir'
                ? ((entry.meta && entry.meta.hint) || '')
                : (fmtBytes(entry.size) + ' · ' + fmtTime(entry.modified));
              var thumb = '';
              if (entry.type === 'file' && (entry.mime || '').indexOf('image/') === 0) {
                thumb = '<img data-thumb="' + esc(entry.path) + '" alt="" />';
              }
              var selbox = (S.selMode && opts.selectable !== false) ? selboxHtml(entry.path) : '';
              return '<div class="fj-row fj-rpl' + (S.sel.has(entry.path) ? ' seld' : '') + '" data-path="' + esc(entry.path) + '" data-type="' + entry.type + '" role="button" tabindex="0">'
                + selbox
                + '<span class="th" style="color:' + colorForEntry(entry) + ';">' + thumb + ic(iconForEntry(entry)) + '</span>'
                + '<span class="tx"><span class="t">' + esc(entry.name) + '</span><span class="s">' + esc(meta) + '</span></span>'
                + (S.selMode
                  ? '<span class="end"></span>'
                  : (entry.type === 'file'
                    ? '<button class="fj-act" data-act="more" data-path="' + esc(entry.path) + '">' + ic('morev') + '</button>'
                    : '<span class="end">' + ic('back', 'transform:rotate(180deg);width:16px;height:16px;') + '</span>'))
                + '</div>';
            }
            function gridItemHtml(entry) {
              var thumb = '';
              if ((entry.mime || '').indexOf('image/') === 0) thumb = '<img data-thumb="' + esc(entry.path) + '" alt="" />';
              else thumb = '<span class="gi-ic">' + ic(iconForEntry(entry)) + '</span>';
              var selbox = S.selMode ? selboxHtml(entry.path) : '';
              return '<div class="fj-gitem' + (S.sel.has(entry.path) ? ' seld' : '') + '" data-path="' + esc(entry.path) + '" data-type="' + entry.type + '" role="button" tabindex="0">'
                + selbox + thumb
                + '<span class="gl">' + esc(entry.name) + '</span>'
                + '</div>';
            }
            function fillThumbs(scope) {
              // 图片缩略图懒填充（readURL 异步）
              scope.querySelectorAll('img[data-thumb]:not([data-loaded])').forEach(function(img) {
                img.dataset.loaded = '1';
                var p = img.getAttribute('data-thumb');
                V() && V().readURL(p).then(function(url) {
                  if (url && img.isConnected) img.src = url;
                  else if (img.isConnected) img.remove(); // 无缩略图回落到类型图标
                });
              });
            }
            function emptyHtml(iconName, t, s) {
              return '<div class="fj-empty"><div class="ci">' + ic(iconName) + '</div><div class="t">' + esc(t) + '</div><div class="s">' + esc(s) + '</div></div>';
            }

            // ==================== 渲染：三个标签 ====================
            function storageCardHtml() {
              var u = usageSafe();
              var used = u ? u.bytes : 0;
              // 进度条按真实 top-dir 占比分段（VFS usage 无 quota 上限刻度，
              // 不伪造百分比刻度 —— 段宽 = 该目录字节 / 全库已用）
              var segs = '';
              var topBits = '';
              var hues = ['hsl(var(--md-h,215) 80% 60%)', 'hsl(calc(var(--md-h,215) + 40) 70% 58%)', 'hsl(calc(var(--md-h,215) - 40) 70% 55%)', 'hsl(var(--md-h,215) 30% 55%)'];
              if (u && u.byDir && u.byDir.length && used > 0) {
                for (var i = 0; i < u.byDir.length && i < 4; i++) {
                  var w = Math.round(u.byDir[i].bytes / used * 100);
                  if (w <= 0) continue;
                  segs += '<i style="flex:' + w + ' 1 0;background:' + hues[i % hues.length] + ';"></i>';
                  topBits += '<span><span class="dot" style="background:' + hues[i % hues.length] + ';"></span>' + esc(u.byDir[i].dir === '/' ? '根目录' : u.byDir[i].dir.slice(1)) + ' ' + fmtBytes(u.byDir[i].bytes) + '</span>';
                }
              }
              if (!segs) segs = '<i style="flex:1 1 0;opacity:.25;"></i>';
              return '<div class="fj-storecard">'
                + '<div class="fj-stop">' + ic('browse') + '<span><span class="tt">内部存储</span><br/><span class="ss">' + (u ? u.files + ' 个文件 · ' + u.dirs + ' 个目录' : '统计中…') + '</span></span></div>'
                + '<div class="pbar">' + segs + '</div>'
                + '<div class="fj-sbot"><span><span class="dot" style="background:hsl(var(--md-h,215) 80% 60%);"></span>已用 ' + fmtBytes(used) + '</span>' + topBits + '</div>'
                + '</div>';
            }

            function renderHome() {
              var cats = CATS.map(function(c) {
                var files = filesOfCat(c.key);
                var bytes = 0;
                for (var i = 0; i < files.length; i++) bytes += files[i].size || 0;
                return '<button class="fj-ccard fj-rpl" data-cat="' + c.key + '">'
                  + '<span class="ci" style="background:' + c.color + '28;color:' + c.color + ';">' + ic(c.icon) + '</span>'
                  + '<span><span class="tt">' + c.label + '</span><br/><span class="ss">' + files.length + ' 项 · ' + fmtBytes(bytes) + '</span></span>'
                  + '</button>';
              }).join('');
              var recent = sorted(flatFiles()).slice(0, 8);
              var recentHtml = recent.length
                ? '<div class="fj-vlist">' + recent.map(function(e) { return rowHtml(e, { selectable: false }); }).join('') + '</div>'
                : emptyHtml('browse', '还没有文件', '点击右下角 + 新建，或把电脑里的文件导入进来');
              homeEl.innerHTML = storageCardHtml()
                + '<div class="fj-sechead"><span class="h">分类</span></div>'
                + '<div class="fj-cgrid">' + cats + '</div>'
                + '<div class="fj-sechead"><span class="h">最近文件</span><span class="x" data-goto-browse style="cursor:pointer;">查看全部 ›</span></div>'
                + recentHtml;
              fillThumbs(homeEl);
              renderRailStorage();
            }

            function renderRailStorage() {
              var rail = app.querySelector('.fj-rail-storage');
              if (!rail || !rail.isConnected) return;
              var u = usageSafe();
              rail.innerHTML = '<div>内部存储</div><div class="pbar"><i style="flex:1 1 0;opacity:.35;"></i></div><div>' + (u ? fmtBytes(u.bytes) + ' · ' + u.files + ' 个文件' : '—') + '</div>';
            }

            function renderClean() {
              var files = sorted(flatFiles()); // size desc
              var big = files.slice(0, 8);
              var imgs = filesOfCat('image');
              var bigRows = big.map(function(e) {
                return '<div class="fj-row fj-rpl' + (S.sel.has(e.path) ? ' seld' : '') + '" data-path="' + esc(e.path) + '" data-type="file" data-clean="1" role="button" tabindex="0">'
                  + selboxHtml(e.path)
                  + '<span class="th" style="color:' + colorForEntry(e) + ';">' + ic(iconForEntry(e)) + '</span>'
                  + '<span class="tx"><span class="t">' + esc(e.name) + '</span><span class="s">' + esc(fmtBytes(e.size) + ' · ' + fmtTime(e.modified)) + '</span></span>'
                  + '<span class="end">' + fmtBytes(e.size) + '</span>'
                  + '</div>';
              }).join('');
              var imgThumbs = imgs.slice(0, 12).map(function(e) {
                return '<div class="fj-gitem" data-cat-jump="image">' + '<img data-thumb="' + esc(e.path) + '" alt="" />' + '</div>';
              }).join('');
              cleanEl.innerHTML = storageCardHtml()
                + '<div class="fj-kcard">'
                + '<div class="tt">大文件</div>'
                + '<div class="ss">全库中占用空间最大的文件，勾选后一次性删除即可释放空间</div>'
                + (big.length ? '<div class="fj-vlist" style="padding:8px 0 0;">' + bigRows + '</div>'
                  + '<div class="act"><button class="fj-btn danger" id="fjCleanDel">' + ic('trash') + '删除所选（' + S.cleanSelSize() + '）</button></div>'
                  : '<div class="ss" style="margin-top:10px;">文件很少，暂无可清理的大文件</div>')
                + '</div>'
                + '<div class="fj-kcard">'
                + '<div class="tt">图片</div>'
                + '<div class="ss">共 ' + imgs.length + ' 张 · ' + fmtBytes(imgs.reduce(function(a, e) { return a + (e.size || 0); }, 0)) + '</div>'
                + (imgThumbs ? '<div class="fj-gwrap" style="padding:12px 0 0;">' + imgThumbs + '</div>'
                  + '<div class="act"><button class="fj-btn" id="fjCleanImgAll">批量管理</button></div>' : '')
                + '</div>';
              fillThumbs(cleanEl);
              var delBtn = $('fjCleanDel');
              if (delBtn) delBtn.onclick = function() { deleteSelected(); };
              var imgAll = $('fjCleanImgAll');
              if (imgAll) imgAll.onclick = function() { openCat('image'); };
            }
            S.cleanSelSize = function() {
              var n = 0;
              cleanEl.querySelectorAll('.fj-selbox.on').forEach(function() { n++; });
              return n;
            };

            function chipsRow() {
              var sorts = [['date', '最近'], ['name', '名称'], ['size', '大小']];
              var chips = sorts.map(function(p) {
                return '<button class="fj-chip' + (S.sort === p[0] ? ' on' : '') + '" data-sort="' + p[0] + '">' + ic('sort') + p[1] + '</button>';
              }).join('');
              return '<div class="fj-chips">' + chips
                + '<button class="fj-chip' + (S.view === 'list' ? ' on' : '') + '" data-view="list">' + ic('listv') + '列表</button>'
                + '<button class="fj-chip' + (S.view === 'grid' ? ' on' : '') + '" data-view="grid">' + ic('gridv') + '网格</button>'
                + '</div>';
            }
            function renderBrowse() {
              var content = '';
              if (!V()) {
                content = emptyHtml('browse', '存储未就绪', '虚拟存储初始化失败 —— 请刷新页面重试');
              } else {
                var d = listDir('/');
                var entries = d.dirs.concat(d.files);
                if (!entries.length) {
                  content = emptyHtml('folder', '此目录为空', '点击右下角 + 新建文件夹或文本文档，也可导入文件');
                } else if (S.view === 'grid') {
                  content = chipsRow() + '<div class="fj-gwrap">' + entries.map(gridItemHtml).join('') + '</div>';
                } else {
                  content = chipsRow() + '<div class="fj-vlist">' + entries.map(function(e) { return rowHtml(e); }).join('') + '</div>';
                }
              }
              browseEl.innerHTML = content;
              fillThumbs(browseEl);
            }

            function renderSub() {
              if (!S.sub) return;
              var body = '';
              if (S.sub.kind === 'dir') {
                var d = listDir(S.sub.dir);
                var entries = d.dirs.concat(d.files);
                subTitle.textContent = S.sub.dir === '/' ? '内部存储' : baseName(S.sub.dir);
                body = entries.length
                  ? '<div class="fj-vlist">' + entries.map(function(e) { return rowHtml(e); }).join('') + '</div>'
                  : emptyHtml('folder', '此文件夹为空', '点击右下角 + 添加内容');
                fab.classList.remove('hide');
              } else {
                var cat = null;
                for (var i = 0; i < CATS.length; i++) if (CATS[i].key === S.sub.cat) cat = CATS[i];
                var files = sorted(filesOfCat(S.sub.cat));
                subTitle.textContent = cat ? cat.label : '分类';
                fab.classList.add('hide');
                if (!files.length) body = emptyHtml(cat ? cat.icon : 'file', '暂无此类文件', '导入或创建后自动归类到这里');
                else if (S.view === 'grid') body = '<div class="fj-gwrap">' + files.map(gridItemHtml).join('') + '</div>';
                else body = '<div class="fj-vlist">' + files.map(function(e) { return rowHtml(e); }).join('') + '</div>';
              }
              subBody.innerHTML = body;
              fillThumbs(subBody);
            }

            function renderAll() {
              if (S.tab === 0) renderHome();
              else if (S.tab === 1) renderClean();
              else renderBrowse();
            }
            function refresh() {
              S.cache.t = 0;
              renderAll();
              if (S.sub) renderSub();
              syncSelUI();
            }

            // ==================== 子页（目录下钻 / 分类） ====================
            function openSub(spec) {
              S.sub = spec;
              subEl.classList.remove('anim-out');
              subEl.classList.add('on', 'anim-in');
              setTimeout(function() { subEl.classList.remove('anim-in'); }, 340);
              renderSub();
            }
            function closeSub() {
              if (!S.sub) return;
              S.sub = null;
              exitSel();
              subEl.classList.add('anim-out');
              setTimeout(function() { subEl.classList.remove('on', 'anim-out'); }, 270);
            }
            function openCat(key) { openSub({ kind: 'cat', cat: key }); }

            // ==================== 多选 ====================
            function enterSel(path) {
              S.selMode = true;
              S.sel = new Set(path ? [path] : []);
              app.classList.add('fj-selmode');
              syncSelUI();
              refresh();
              try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
            }
            function exitSel() {
              S.selMode = false;
              S.sel.clear();
              app.classList.remove('fj-selmode');
              syncSelUI();
            }
            function toggleSel(path) {
              if (!path) return;
              if (S.sel.has(path)) S.sel.delete(path); else S.sel.add(path);
              if (!S.sel.size) { exitSel(); return; }
              syncSelUI();
              refresh();
            }
            function syncSelUI() {
              var on = S.selMode && S.sel.size > 0;
              selTop.classList.toggle('on', !!(S.selMode));
              selBot.classList.toggle('on', !!(S.selMode));
              $('fjSelCount').textContent = '已选择 ' + S.sel.size + ' 项';
              var items = selEntries();
              var shown = items.slice(0, 3).map(function(e) { return e.name; }).join('、') + (items.length > 3 ? ' 等' : '');
              $('fjSelHint').textContent = shown;
              var fabHide = S.selMode || !!(S.sub && S.sub.kind === 'cat');
              fab.classList.toggle('hide', fabHide);
            }
            function selEntries() {
              return Array.from(S.sel).map(function(p) {
                try { return V().stat(p); } catch (e) { return null; }
              }).filter(Boolean);
            }
            function collectVisible() {
              var ids = [];
              app.querySelectorAll('.fj-row[data-path],.fj-gitem[data-path]').forEach(function(el) {
                if (el.dataset.path) ids.push(el.dataset.path);
              });
              return ids;
            }

            // ==================== 批量操作 ====================
            async function deleteSelected() {
              var n = S.sel.size;
              if (!n) return;
              var ok = await askDialog({ title: '删除', message: '确定删除所选 ' + n + ' 项吗？\\n此操作不可撤销。', danger: true });
              if (!ok) return;
              var done = 0, fail = 0;
              for (var p of Array.from(S.sel)) {
                var r = await V().del(p);
                if (r && r.ok) done++; else fail++;
              }
              exitSel();
              refresh();
              snack('已删除 ' + done + ' 项' + (fail ? '，失败 ' + fail + ' 项' : ''), 'trash');
            }
            function pickDir(title, cb) {
              // 目录选择器（复制到/移动到）：递归列出全部目录
              var dirs = [];
              function rec(dir, depth) {
                dirs.push({ dir: dir, depth: depth });
                var list;
                try { list = V().list(dir) || []; } catch (e) { return; }
                for (var i = 0; i < list.length; i++) {
                  if (list[i].type === 'dir') rec(list[i].path, depth + 1);
                }
              }
              rec('/', 0);
              openSheet('<div class="fj-sh-t">' + esc(title) + '</div>' + dirs.map(function(d) {
                return '<button class="fj-sh-item" data-pickdir="' + esc(d.dir) + '">'
                  + '<span style="width:' + (12 + d.depth * 16) + 'px;flex:none;"></span>'
                  + ic('folder') + '<span style="flex:1;">' + esc(d.dir === '/' ? '内部存储' : baseName(d.dir)) + '</span></button>';
              }).join(''));
              sheetEl.querySelectorAll('[data-pickdir]').forEach(function(btn) {
                btn.onclick = function() {
                  var dir = btn.getAttribute('data-pickdir');
                  closeSheet();
                  cb(dir);
                };
              });
            }
            function pasteInto(dstDir, cut) {
              return Promise.all(Array.from(S.sel).map(function(p) {
                var target = dstDir === '/' ? '/' + baseName(p) : dstDir + '/' + baseName(p);
                if (target === p || target.indexOf(p + '/') === 0) return Promise.resolve({ ok: false, error: '目标无效' });
                var finalTarget = target, n = 1;
                while (V().exists(finalTarget)) {
                  var dot = target.lastIndexOf('.');
                  finalTarget = dot > target.lastIndexOf('/') ? target.slice(0, dot) + ' (' + n + ')' + target.slice(dot) : target + ' (' + n + ')';
                  n++;
                }
                return cut ? V().move(p, finalTarget) : V().copy(p, finalTarget);
              }));
            }

            // ==================== 更多操作（多选/单项共用） ====================
            function moreSheet(paths) {
              var one = paths.length === 1;
              var head = '<div class="fj-sh-t">' + esc(one ? baseName(paths[0]) : '已选择 ' + paths.length + ' 项') + '</div>';
              var html = head
                + '<button class="fj-sh-item" data-m="copy">' + ic('copy') + '复制到…</button>'
                + '<button class="fj-sh-item" data-m="move">' + ic('move') + '移动到…</button>'
                + (one ? '<button class="fj-sh-item" data-m="rename">' + ic('edit') + '重命名</button>' : '')
                + '<button class="fj-sh-item" data-m="export">' + ic('download') + '导出到电脑</button>'
                + '<button class="fj-sh-item" data-m="share">' + ic('share') + '分享</button>'
                + (one ? '<button class="fj-sh-item" data-m="details">' + ic('info') + '详情</button>' : '')
                + '<button class="fj-sh-item danger" data-m="del">' + ic('trash') + '删除</button>';
              openSheet(html);
              sheetEl.querySelectorAll('[data-m]').forEach(function(btn) {
                btn.onclick = async function() {
                  var m = btn.getAttribute('data-m');
                  if (m === 'del') { closeSheet(); await deleteSelected(); return; }
                  if (m === 'copy' || m === 'move') {
                    closeSheet();
                    pickDir(m === 'copy' ? '复制到…' : '移动到…', async function(dir) {
                      var rs = await pasteInto(dir, m === 'move');
                      var ok = rs.filter(function(r) { return r && r.ok; }).length;
                      snack((m === 'copy' ? '已复制 ' : '已移动 ') + ok + ' 项到「' + (dir === '/' ? '内部存储' : baseName(dir)) + '」');
                      exitSel();
                      refresh();
                    });
                    return;
                  }
                  if (m === 'export') { closeSheet(); paths.forEach(downloadFile); return; }
                  if (m === 'share') { closeSheet(); openShareSheet(paths[0]); return; }
                  if (m === 'rename') {
                    closeSheet();
                    var p = paths[0], old = baseName(p);
                    var name = await askDialog({ title: '重命名', input: old });
                    if (name === null) return;
                    name = validName(name);
                    if (!name) { snack('名称不合法'); return; }
                    if (name !== old) {
                      var r = await V().move(p, parentOf(p) + '/' + name);
                      snack(r.ok ? '已重命名' : (r.error || '重命名失败'));
                    }
                    exitSel();
                    refresh();
                    return;
                  }
                  if (m === 'details') {
                    closeSheet();
                    var e = V().stat(paths[0]) || {};
                    openSheet('<div class="fj-sh-t">详情</div>' + [
                      ['名称', e.name], ['类型', (e.mime || '未知')], ['大小', fmtBytes(e.size)],
                      ['位置', parentOf(paths[0]) === '/' ? '内部存储' : parentOf(paths[0])],
                      ['修改时间', fmtTime(e.modified)],
                    ].map(function(row) {
                      return '<div class="fj-sh-item" style="pointer-events:none;"><span style="color:var(--md-on-surface-variant);width:64px;flex:none;">' + row[0] + '</span><span style="flex:1;text-align:right;overflow:hidden;text-overflow:ellipsis;">' + esc(row[1] == null ? '—' : row[1]) + '</span></div>';
                    }).join(''));
                  }
                };
              });
            }

            // ==================== 下载导出 ====================
            function downloadFile(p) {
              V().readBlob(p).then(function(blob) {
                if (!blob) { snack('读取失败'); return; }
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = baseName(p);
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(function() { try { a.remove(); URL.revokeObjectURL(a.href); } catch (e) {} }, 3000);
                snack('已开始导出');
              });
            }

            // ==================== 分享（信息 / 相册 / 便签） ====================
            function openShareSheet(path) {
              var entry = V().stat(path) || {};
              var isImg = (entry.mime || '').indexOf('image/') === 0;
              var isText = (entry.mime || '').indexOf('text/') === 0 || entry.mime === 'application/json';
              openSheet('<div class="fj-sh-t">分享「' + esc(baseName(path)) + '」</div>'
                + '<button class="fj-sh-item" data-share="msg">' + ic('doc') + '发送到 信息</button>'
                + (isImg ? '<button class="fj-sh-item" data-share="photo">' + ic('image') + '保存到 相册</button>' : '')
                + (isText ? '<button class="fj-sh-item" data-share="notes">' + ic('edit') + '存为 便签</button>' : ''));
              sheetEl.querySelectorAll('[data-share]').forEach(function(btn) {
                btn.onclick = function() {
                  var target = btn.getAttribute('data-share');
                  closeSheet();
                  var emit = function(event, payload) {
                    var msg = { type: 'BUS_EMIT', event: event, payload: payload, target: target };
                    try { window.postMessage(msg, '*'); } catch (err) {}
                    try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (err) {}
                  };
                  if (target === 'photo') {
                    V().readBlob(path).then(function(blob) {
                      if (!blob) { snack('读取失败'); return; }
                      var fr = new FileReader();
                      fr.onload = function() {
                        emit('photo/captured', { id: 'fs' + Date.now(), type: 'image', src: String(fr.result), name: baseName(path), noti: { title: '文件已保存到相册', desc: baseName(path) } });
                        snack('已发送到相册');
                      };
                      fr.readAsDataURL(blob);
                    });
                  } else if (target === 'notes') {
                    V().readText(path).then(function(text) {
                      emit('files/share', { name: baseName(path), text: text || '', noti: { title: '文件分享到便签', desc: baseName(path) } });
                      snack('已发送到便签');
                    });
                  } else {
                    var isTxt = (entry.mime || '').indexOf('text/') === 0 || entry.mime === 'application/json';
                    var send = function(textPart) {
                      emit('files/share', { name: baseName(path), text: textPart, noti: { title: '文件分享到信息', desc: baseName(path) } });
                      snack('已发送到信息');
                    };
                    if (isTxt) V().readText(path).then(send); else send('（文件）' + baseName(path) + ' · ' + fmtBytes(entry.size || 0));
                  }
                };
              });
            }

            // ==================== 预览 ====================
            function closePreview() {
              pvEl.classList.remove('on');
              pvBody.innerHTML = '';
              currentPreviewPath = null;
            }
            $('fjPvClose').onclick = closePreview;
            async function openPreview(path) {
              var entry = V().stat(path);
              if (!entry) return;
              currentPreviewPath = path;
              pvName.textContent = entry.name;
              var mime = entry.mime || '';
              var html = '';
              if (mime.indexOf('image/') === 0) {
                var url = await V().readURL(path);
                html = url ? '<img src="' + url + '" style="max-width:100%;max-height:100%;border-radius:12px;" alt="" />' : '<div style="color:var(--md-on-surface-variant);">图片加载失败</div>';
              } else if (mime.indexOf('audio/') === 0) {
                var aurl = await V().readURL(path);
                html = '<div style="width:100%;text-align:center;">'
                  + '<div style="opacity:.5;margin-bottom:18px;">' + ic('audio', 'width:64px;height:64px;') + '</div>'
                  + (aurl ? '<audio src="' + aurl + '" controls style="width:100%;max-width:420px;"></audio>' : '<div style="color:var(--md-on-surface-variant);">音频加载失败</div>')
                  + '</div>';
                if (aurl) attachMusicDeepLink(aurl, path);
              } else if (mime.indexOf('video/') === 0) {
                var vurl = await V().readURL(path);
                html = vurl ? '<video src="' + vurl + '" controls style="max-width:100%;max-height:100%;border-radius:12px;"></video>' : '<div style="color:var(--md-on-surface-variant);">视频加载失败</div>';
              } else if (mime.indexOf('text/') === 0 || mime === 'application/json') {
                var text = await V().readText(path);
                html = '<pre style="width:100%;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.7;color:var(--md-on-surface);margin:0;font-family:inherit;">' + esc(text == null ? '（空文件）' : text) + '</pre>';
              } else {
                html = '<div style="text-align:center;color:var(--md-on-surface-variant);">'
                  + '<div style="opacity:.5;margin-bottom:14px;">' + ic('file', 'width:60px;height:60px;') + '</div>'
                  + '<div style="font-size:14px;color:var(--md-on-surface);">' + esc(entry.name) + '</div>'
                  + '<div style="font-size:12px;margin-top:4px;">' + esc(mime || '未知类型') + ' · ' + fmtBytes(entry.size) + '</div>'
                  + '<div style="font-size:12px;margin-top:10px;opacity:.8;">此类文件暂不支持预览，可导出到电脑查看</div>'
                  + '</div>';
              }
              pvBody.innerHTML = html;
              pvEl.classList.add('on');
            }
            function attachMusicDeepLink(aurl, path) {
              var btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'fj-btn';
              btn.style.cssText = 'margin:18px auto 4px;display:flex;';
              btn.innerHTML = ic('audio') + '用音乐播放';
              btn.onclick = function() {
                var msg = { type: 'BUS_EMIT', event: 'music/import', target: 'music', payload: { url: aurl, name: baseName(path), autoPlay: true, __silent: true } };
                try { window.postMessage(msg, '*'); } catch (err) {}
                try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (err) {}
                if (window.__shareSheet && typeof window.__shareSheet.openAppById === 'function') {
                  window.__shareSheet.openAppById('music');
                } else {
                  snack('已投递到音乐应用');
                }
                closePreview();
              };
              pvBody.appendChild(btn);
            }
            $('fjPvDl').onclick = function() { if (currentPreviewPath) downloadFile(currentPreviewPath); };
            $('fjPvShare').onclick = function() { if (currentPreviewPath) openShareSheet(currentPreviewPath); };

            // ==================== 行交互（事件委托） ====================
            function contextEntries() {
              // 当前视图的“可见条目集合”（多选上下文：全选目标）
              if (S.sub) {
                var sel = [];
                subBody.querySelectorAll('[data-path]').forEach(function(el) { sel.push(el.dataset.path); });
                return sel;
              }
              return collectVisible();
            }
            function handleTap(target) {
              var selbox = target.closest('[data-selbox]');
              if (selbox) {
                if (selbox.closest('[data-clean]')) return; // 清理页勾选由独立路径处理
                toggleSel(selbox.getAttribute('data-selbox'));
                return true;
              }
              var chip = target.closest('[data-sort]');
              if (chip) { S.sort = chip.getAttribute('data-sort'); renderBrowse(); if (S.sub) renderSub(); return true; }
              var viewBtn = target.closest('[data-view]');
              if (viewBtn) { S.view = viewBtn.getAttribute('data-view'); renderBrowse(); if (S.sub) renderSub(); return true; }
              var catCard = target.closest('[data-cat]');
              if (catCard) { openCat(catCard.getAttribute('data-cat')); return true; }
              var imgJump = target.closest('[data-cat-jump]');
              if (imgJump) { openCat(imgJump.getAttribute('data-cat-jump')); return true; }
              var gotoBrowse = target.closest('[data-goto-browse]');
              if (gotoBrowse) { switchTab(2); return true; }
              var moreBtn = target.closest('[data-act="more"]');
              if (moreBtn) { moreSheet([moreBtn.getAttribute('data-path')]); return true; }
              return false;
            }
            function handleRowOpen(row) {
              var path = row.getAttribute('data-path');
              var type = row.getAttribute('data-type');
              if (type === 'dir') {
                openSub({ kind: 'dir', dir: path });
              } else {
                var lowerPath = String(path).toLowerCase();
                if ((lowerPath.endsWith('.zip') || lowerPath.endsWith('.mdapp')) && window.__pkgInstallerAPI) {
                  // v7.52 安装包交接：压缩包交给安装器（导入 → 自动识别 → 打开安装器确认安装）
                  window.__pkgInstallerAPI.openVFSFile(path).then(function (rec) {
                    if (rec && window.showSystemToast) window.showSystemToast('已导入「' + (rec.name || path) + '」，到安装包里确认安装');
                  }).catch(function (err) {
                    if (window.showSystemToast) window.showSystemToast('安装包导入失败：' + ((err && (err.pkgErrors && err.pkgErrors[0] || err.message)) || '未知原因'));
                  });
                  return;
                }
                openPreview(path);
              }
            }
            function bindContainer(container) {
              if (!container) return;
              // 点按（委托）
              container.addEventListener('click', function(e) {
                if (handleTap(e.target)) return;
                var row = e.target.closest('.fj-row,.fj-gitem');
                if (!row || !row.dataset.path) return;
                if (S.selMode) { toggleSel(row.dataset.path); return; }
                if (row.dataset.clean) {
                  // 清理页勾选
                  var box = row.querySelector('.fj-selbox');
                  if (box) box.classList.toggle('on');
                  var delBtn2 = $('fjCleanDel');
                  if (delBtn2) delBtn2.innerHTML = ic('trash') + '删除所选（' + S.cleanSelSize() + '）';
                  return;
                }
                handleRowOpen(row);
              });
              // 长按进入多选
              var lpTimer = null, lpFired = false;
              container.addEventListener('pointerdown', function(e) {
                if (S.selMode) return;
                if (e.target.closest('[data-act],.fj-act,[data-selbox]')) return;
                var row = e.target.closest('.fj-row,.fj-gitem');
                if (!row || !row.dataset.path || row.dataset.type !== 'file') return;
                var path = row.dataset.path;
                var sx = e.clientX, sy = e.clientY;
                lpFired = false;
                lpTimer = setTimeout(function() {
                  lpFired = true;
                  if (row.dataset.clean) {
                    var box = row.querySelector('.fj-selbox');
                    if (box) box.classList.add('on');
                    var delBtn3 = $('fjCleanDel');
                    if (delBtn3) delBtn3.innerHTML = ic('trash') + '删除所选（' + S.cleanSelSize() + '）';
                    return;
                  }
                  enterSel(path);
                }, 480);
                var cancel = function(ev) {
                  if (ev && (Math.abs(ev.clientX - sx) > 10 || Math.abs(ev.clientY - sy) > 10)) clearTimeout(lpTimer);
                };
                var up = function() { clearTimeout(lpTimer); };
                container.addEventListener('pointermove', cancel, { once: true });
                container.addEventListener('pointerup', up, { once: true });
                container.addEventListener('pointercancel', up, { once: true });
                // 长按后吞掉随后的 click
                container.addEventListener('click', function swallow(ev) {
                  if (lpFired) { lpFired = false; ev.stopPropagation(); }
                  container.removeEventListener('click', swallow);
                }, true);
              });
            }
            bindContainer(homeEl);
            bindContainer(cleanEl);
            bindContainer(browseEl);
            bindContainer(subBody);

            // ==================== 多选操作条事件 ====================
            $('fjSelClose').onclick = exitSel;
            $('fjSelAll').onclick = function() {
              var all = contextEntries();
              all.forEach(function(p) { S.sel.add(p); });
              syncSelUI();
              refresh();
            };
            $('fjSelMore').onclick = function() { moreSheet(Array.from(S.sel)); };
            $('fjSelDel').onclick = function() { deleteSelected(); };

            // ==================== 排序按钮 / FAB ====================
            $('fjBtnSort').onclick = function() {
              openSheet('<div class="fj-sh-t">排序与视图</div>'
                + '<button class="fj-sh-item" data-s="date">' + ic('sort') + '按最近修改</button>'
                + '<button class="fj-sh-item" data-s="name">' + ic('sort') + '按名称</button>'
                + '<button class="fj-sh-item" data-s="size">' + ic('sort') + '按大小</button>'
                + '<button class="fj-sh-item" data-v="list">' + ic('listv') + '列表视图</button>'
                + '<button class="fj-sh-item" data-v="grid">' + ic('gridv') + '网格视图</button>');
              sheetEl.querySelectorAll('[data-s]').forEach(function(b) {
                b.onclick = function() { S.sort = b.getAttribute('data-s'); closeSheet(); refresh(); };
              });
              sheetEl.querySelectorAll('[data-v]').forEach(function(b) {
                b.onclick = function() { S.view = b.getAttribute('data-v'); closeSheet(); refresh(); };
              });
            };
            fab.onclick = function() {
              openSheet('<div class="fj-sh-t">新建</div>'
                + '<button class="fj-sh-item" data-n="dir"><span class="ci" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--md-outline-variant);display:grid;place-items:center;color:hsl(var(--md-h,215) 85% 70%);flex:none;">' + ic('folder', 'width:18px;height:18px;') + '</span>新建文件夹</button>'
                + '<button class="fj-sh-item" data-n="txt"><span class="ci" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--md-outline-variant);display:grid;place-items:center;color:hsl(var(--md-h,215) 85% 70%);flex:none;">' + ic('doc', 'width:18px;height:18px;') + '</span>新建文本文档</button>'
                + '<button class="fj-sh-item" data-n="import"><span class="ci" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--md-outline-variant);display:grid;place-items:center;color:hsl(var(--md-h,215) 85% 70%);flex:none;">' + ic('download', 'width:18px;height:18px;transform:rotate(180deg);') + '</span>从电脑导入</button>'
                + '<button class="fj-sh-item" data-n="paste" ' + (CB() && CB().has() ? '' : 'style="opacity:.45;pointer-events:none;"') + '><span class="ci" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--md-outline-variant);display:grid;place-items:center;color:hsl(var(--md-h,215) 85% 70%);flex:none;">' + ic('copy', 'width:18px;height:18px;') + '</span>粘贴剪贴板内容</button>');
              sheetEl.querySelectorAll('[data-n]').forEach(function(b) {
                b.onclick = function() {
                  var n = b.getAttribute('data-n');
                  closeSheet();
                  if (n === 'dir') createDir();
                  else if (n === 'txt') createTxt();
                  else if (n === 'import') fileInput.click();
                  else if (n === 'paste') pasteClipboard();
                };
              });
            };
            function currentDir() {
              if (S.sub && S.sub.kind === 'dir') return S.sub.dir;
              return '/';
            }
            async function createDir() {
              var name = await askDialog({ title: '新建文件夹', input: '新建文件夹' });
              if (name === null) return;
              name = validName(name);
              if (!name) { snack('名称不合法'); return; }
              var r = await V().mkdir(currentDir() === '/' ? '/' + name : currentDir() + '/' + name);
              snack(r.ok ? '文件夹已创建' : (r.error || '创建失败'));
              refresh();
            }
            async function createTxt() {
              var name = await askDialog({ title: '新建文本文档', input: '新建文本.txt' });
              if (name === null) return;
              name = validName(name);
              if (!name) { snack('名称不合法'); return; }
              var r = await V().write((currentDir() === '/' ? '' : currentDir()) + '/' + name, '', { owner: 'files' });
              snack(r.ok ? '文档已创建' : (r.error || '创建失败'));
              refresh();
            }
            async function pasteClipboard() {
              var c = CB();
              var item = c && c.get();
              if (!item) return;
              var dir = currentDir();
              if (item.kind === 'files') {
                var moved = 0, fail = 0;
                for (var i = 0; i < item.paths.length; i++) {
                  var p = item.paths[i];
                  var target = (dir === '/' ? '' : dir) + '/' + baseName(p);
                  if (item.cut && (target === p || target.indexOf(p + '/') === 0)) { fail++; continue; }
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
                snack((item.cut ? '已移动 ' : '已粘贴 ') + moved + ' 项' + (fail ? '，失败 ' + fail + ' 项' : ''));
              } else if (item.kind === 'image') {
                var name = item.name || ('clipboard_' + Date.now() + '.png');
                var dot2 = name.lastIndexOf('.');
                var base2 = dot2 > 0 ? name.slice(0, dot2) : name;
                var ext2 = dot2 > 0 ? name.slice(dot2) : '';
                var t2 = (dir === '/' ? '' : dir) + '/' + base2 + ext2, k = 1;
                while (V().exists(t2)) { t2 = (dir === '/' ? '' : dir) + '/' + base2 + ' (' + k + ')' + ext2; k++; }
                var r2 = await V().write(t2, item.dataUrl, { owner: 'files' });
                snack(r2.ok ? '图片已粘贴为 ' + base2 + ext2 : (r2.error || '粘贴失败'));
              } else if (item.kind === 'text') {
                var tname = '剪贴板_' + new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/[\s\/:]+/g, '') + '.txt';
                var r3 = await V().write((dir === '/' ? '' : dir) + '/' + tname, item.text, { owner: 'files' });
                snack(r3.ok ? '文本已粘贴为 ' + tname : (r3.error || '粘贴失败'));
              }
              refresh();
            }
            fileInput.addEventListener('change', function(e) {
              var files = Array.prototype.slice.call(e.target.files || []);
              e.target.value = '';
              if (!files.length) return;
              var dir = currentDir();
              var done = 0, fail = 0, lastErr = '';
              var next = function(i) {
                if (i >= files.length) {
                  snack('导入完成：成功 ' + done + ' 个' + (fail ? '，失败 ' + fail + ' 个' + (lastErr ? '（' + lastErr + '）' : '') : ''));
                  refresh();
                  return;
                }
                var f = files[i];
                V().write((dir === '/' ? '' : dir) + '/' + f.name, f, { owner: 'files' }).then(function(r) {
                  if (r.ok) done++; else { fail++; lastErr = r.error || ''; }
                  next(i + 1);
                });
              };
              next(0);
            });

            // ==================== Tab/返回按钮/遮罩事件 ====================
            navbar.querySelectorAll('.fj-nitem').forEach(function(b) {
              b.addEventListener('click', function() { switchTab(+b.dataset.tab); });
            });
            app.querySelectorAll('.fj-ritem').forEach(function(b) {
              b.addEventListener('click', function() { switchTab(+b.dataset.tab); });
            });
            $('fjSubBack').onclick = function() { closeSub(); };
            sheetWrap.addEventListener('click', function(e) { if (e.target.closest('[data-sheet-close]') || e.target === sheetWrap) closeSheet(); });

            // 涟漪
            bindDoc('files', 'pointerdown', function(e) {
              var t = e.target.closest('.fj-rpl');
              if (!t) return;
              var r = t.getBoundingClientRect();
              var d = Math.max(r.width, r.height) * 2.1;
              var ink = document.createElement('span');
              ink.className = 'fj-ink';
              ink.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px;';
              t.appendChild(ink);
              setTimeout(function() { ink.remove(); }, 520);
            });

            // ==================== 平板模式（宽容器 → 侧栏） ====================
            if (window.ResizeObserver) {
              var ro = new ResizeObserver(function() {
                app.classList.toggle('fj-wide', app.clientWidth >= 620);
                renderTabs();
              });
              ro.observe(app);
            }

            // ==================== v7.28 预览式返回桥（宿主 main.js 注册） ====================
            var pbDrag = null; // { el, startX, dx }
            window.__filesPB = {
              canBack: function() {
                return !!(pvEl.classList.contains('on') || dlgEl.classList.contains('on') || sheetWrap.classList.contains('on') || S.sub);
              },
              triggerBack: function() {
                if (pvEl.classList.contains('on')) { closePreview(); return; }
                if (dlgEl.classList.contains('on')) { closeDialog(null); return; }
                if (sheetWrap.classList.contains('on')) { closeSheet(); return; }
                closeSub();
              },
              beginGesture: function(dir) {
                if (pvEl.classList.contains('on')) { closePreview(); return; }
                if (dlgEl.classList.contains('on')) { closeDialog(null); return; }
                if (sheetWrap.classList.contains('on')) { closeSheet(); return; }
                if (!S.sub) return;
                pbDrag = { el: subEl, dx: 0 };
                subEl.style.transition = 'none';
              },
              progressGesture: function(dx) {
                if (!pbDrag) return;
                pbDrag.dx = Math.max(0, dx || 0);
                pbDrag.el.style.transform = 'translateX(' + pbDrag.dx + 'px)';
                pbDrag.el.style.opacity = String(Math.max(0.4, 1 - pbDrag.dx / 480));
              },
              endGesture: function(commit) {
                if (!pbDrag) return;
                var el = pbDrag.el;
                pbDrag = null;
                el.style.transition = 'transform 0.26s cubic-bezier(0.2, 0, 0.1, 1), opacity 0.24s ease';
                if (commit && (S.sub != null)) {
                  el.style.transform = 'translateX(56%)';
                  el.style.opacity = '0.4';
                  var keepSub = S.sub;
                  S.sub = null;
                  exitSel();
                  setTimeout(function() {
                    el.classList.remove('on');
                    el.style.transform = '';
                    el.style.opacity = '';
                    el.style.transition = '';
                    void keepSub;
                  }, 270);
                } else {
                  el.style.transform = '';
                  el.style.opacity = '';
                  setTimeout(function() { el.style.transition = ''; }, 270);
                }
              },
            };

            // ==================== VFS / 剪贴板订阅 + 页面激活 ====================
            if (V()) {
              var unVfs = V().subscribe('/', function() { S.cache.t = 0; if (S.visible) refresh(); });
              addCleanup('files', function() { try { unVfs(); } catch (err) {} });
            }
            if (CB()) {
              var unClip = CB().subscribe(function() { if (S.visible) refresh(); });
              addCleanup('files', function() { try { unClip(); } catch (err) {} });
            }
            bindDoc('files', 'app-page-active', function(e) {
              if (!e.detail || e.detail.appId !== 'files') return;
              S.visible = e.detail.pageIdx === 0;
              if (S.visible) {
                S.cache.t = 0;
                renderTabs();
                renderAll();
                if (S.sub) renderSub();
              }
            });

            // 首次进入
            S.visible = true;
            renderTabs();
            renderAll();
          })();
        </script>
      `,
    },
  ],
};
