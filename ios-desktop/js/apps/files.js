var s={home:'<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/>',sparkle:'<path d="M12 4l1.7 4.6L18 10l-4.3 1.4L12 16l-1.7-4.6L6 10l4.3-1.4z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',browse:'<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2.5h6A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17z"/>',folder:'<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2.5h6A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17z"/>',image:'<rect x="4" y="5" width="16" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4.5 17l4.5-4.5 3 3 3.5-3.5 4 4"/>',video:'<rect x="3.5" y="6" width="17" height="12" rx="3"/><path d="M10.5 9.8l4.2 2.2-4.2 2.2z"/>',audio:'<path d="M9 17.5V6.8l9-1.8v10.5"/><circle cx="7" cy="17.5" r="2"/><circle cx="16" cy="15.5" r="2"/>',doc:'<path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5z"/><path d="M14 3.5V8h4"/><path d="M9 12.5h6M9 16h6"/>',zip:'<rect x="5" y="4" width="14" height="16" rx="2.5"/><path d="M12 4v3M12 9v2M12 13v2"/><path d="M10 18.5h4"/>',apk:'<rect x="5" y="6" width="14" height="14" rx="3"/><path d="M12 10v5M9.8 12.2L12 10l2.2 2.2"/><path d="M8.5 6l-1.5-2.5M15.5 6l1.5-2.5"/>',file:'<path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5z"/><path d="M14 3.5V8h4"/>',back:'<path d="M14.5 5.5L8 12l6.5 6.5"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',add:'<path d="M12 5v14M5 12h14"/>',morev:'<circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/>',listv:'<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"/><circle cx="4.5" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="17.5" r="1" fill="currentColor" stroke="none"/>',gridv:'<rect x="4.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="4.5" y="13.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="13.5" width="6" height="6" rx="1.5"/>',sort:'<path d="M7 5v14M7 19l-2.8-2.8M7 19l2.8-2.8"/><path d="M17 19V5M17 5l-2.8 2.8M17 5l2.8 2.8"/>',share:'<circle cx="6.5" cy="12" r="2.2"/><circle cx="17" cy="6" r="2.2"/><circle cx="17" cy="18" r="2.2"/><path d="M8.5 10.9l6.2-3.7M8.5 13.1l6.2 3.7"/>',download:'<path d="M12 4v10M12 14l-3.6-3.6M12 14l3.6-3.6"/><path d="M5 19.5h14"/>',copy:'<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M5.5 14.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/>',move:'<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2.5h6A2.5 2.5 0 0 1 20.5 10v7A2.5 2.5 0 0 1 18 19.5H6A2.5 2.5 0 0 1 3.5 17z"/><path d="M10 14h5M13 11.8l2.2 2.2-2.2 2.2"/>',edit:'<path d="M4 20l4.2-.9L19.4 7.9a1.6 1.6 0 0 0 0-2.3l-1-1a1.6 1.6 0 0 0-2.3 0L4.9 15.8z"/><path d="M14.5 6.5l3 3"/>',trash:'<path d="M5 7h14M10 7V5.2A1.2 1.2 0 0 1 11.2 4h1.6A1.2 1.2 0 0 1 14 5.2V7M6.5 7l.8 11.6A1.7 1.7 0 0 0 9 20.2h6a1.7 1.7 0 0 0 1.7-1.6L17.5 7"/><path d="M10.2 11v5.5M13.8 11v5.5"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',selall:'<rect x="4.5" y="4.5" width="15" height="15" rx="3.5"/><path d="M8.5 12.2l2.6 2.6 4.9-5"/>',info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none"/>',search:'<circle cx="11" cy="11" r="6.5"/><path d="M19.5 19.5L15 15"/>'};function e(a,t){return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'+(t?' style="'+t+'"':"")+">"+(s[a]||"")+"</svg>"}typeof window<"u"&&(window.__fjIc=e);import"../files-core.js";export default{id:"files",name:"\u6587\u4EF6",pages:[{title:"\u6587\u4EF6",content:`
        <div class="fj-app" id="fjApp">
          <!-- \u5E73\u677F\u6A21\u5F0F\u5DE6\u4FA7\u5BFC\u822A\u680F -->
          <aside class="fj-rail">
            <div class="fj-rail-logo"><span class="lg">${e("folder")}</span><span>\u6587\u4EF6</span></div>
            <button class="fj-ritem" data-tab="0">${e("home")}<span>\u9996\u9875</span></button>
            <button class="fj-ritem" data-tab="1">${e("sparkle")}<span>\u6E05\u7406</span></button>
            <button class="fj-ritem" data-tab="2">${e("browse")}<span>\u6D4F\u89C8</span></button>
            <!-- v10.84 #215\uFF1Arail \u5206\u7C7B\u76F4\u8FBE\u533A\uFF08DocumentsUI root drawer \u5206\u7C7B\u8BED\u4E49\uFF0CrenderRailStorage \u6E32\u67D3\uFF09 -->
            <div class="fj-rail-cats" id="fjRailCats"></div>
            <div class="fj-rail-storage" id="fjRailStorage"></div>
          </aside>

          <div class="fj-main">
            <div class="fj-top">
              <div class="fj-title" id="fjTitle">\u6587\u4EF6</div>
              <button class="fj-ibtn" id="fjBtnSort" title="\u6392\u5E8F\u4E0E\u89C6\u56FE">${e("sort")}</button>
            </div>

            <div class="fj-screens">
              <section class="fj-screen on" id="fjHome"></section>
              <section class="fj-screen" id="fjClean"></section>
              <section class="fj-screen" id="fjBrowse"></section>

              <!-- \u76EE\u5F55/\u5206\u7C7B\u4E0B\u94BB\u5B50\u9875 -->
              <div class="fj-sub" id="fjSub">
                <div class="fj-subtop">
                  <button class="fj-ibtn" id="fjSubBack">${e("back")}</button>
                  <div class="fj-subtitle" id="fjSubTitle">\u6587\u4EF6\u5939</div>
                  <!-- v10.84 #215\uFF1A\u5B50\u9875\u9876\u680F\u6392\u5E8F\u4E0E\u89C6\u56FE\u5165\u53E3\uFF08DocumentsUI \u5B50\u9875 \u22EE \u540C\u6784\uFF0C\u80FD\u529B\u4E0D\u518D\u5012\u6302\uFF09 -->
                  <button class="fj-ibtn" id="fjSubTools" title="\u6392\u5E8F\u4E0E\u89C6\u56FE">${e("sort")}</button>
                </div>
                <div class="fj-subbody" id="fjSubBody"></div>
              </div>

              <!-- \u591A\u9009\u64CD\u4F5C\u6761 -->
              <div class="fj-seltop" id="fjSelTop">
                <button class="fj-ibtn" id="fjSelClose" style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:none;">${e("close")}</button>
                <div class="cnt"><div class="a" id="fjSelCount">\u5DF2\u9009\u62E9 0 \u9879</div><div class="b" id="fjSelHint"></div></div>
                <button class="fj-ibtn" id="fjSelAll" style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:none;">${e("selall")}</button>
                <button class="fj-ibtn" id="fjSelMore" style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:none;">${e("morev")}</button>
              </div>
            </div>

            <!-- v7.72 M3E SplitButton\uFF1Alead \u4E3B\u64CD\u4F5C\uFF08\u65B0\u5EFA\u6587\u4EF6\u5939\uFF09+ trail \u83DC\u5355\uFF08\u5176\u4F59\u65B0\u5EFA\u65B9\u5F0F\uFF09 -->
            <div class="fj-fab m3e-splitbtn" id="fjFab" role="group" aria-label="\u65B0\u5EFA">
              <button class="m3e-sb-lead" id="fjFabLead" aria-label="\u65B0\u5EFA\u6587\u4EF6\u5939">${e("add")}<span class="m3e-sb-lbl">\u65B0\u5EFA</span></button>
              <button class="m3e-sb-trail" id="fjFabMenu" aria-label="\u66F4\u591A\u65B0\u5EFA\u65B9\u5F0F">${e("morev")}</button>
            </div>

            <nav class="fj-navbar" id="fjNavbar">
              <div id="fjNavPill"></div>
              <button class="fj-nitem on" data-tab="0"><span class="nico">${e("home")}</span><span class="nl">\u9996\u9875</span></button>
              <button class="fj-nitem" data-tab="1"><span class="nico">${e("sparkle")}</span><span class="nl">\u6E05\u7406</span></button>
              <button class="fj-nitem" data-tab="2"><span class="nico">${e("browse")}</span><span class="nl">\u6D4F\u89C8</span></button>
            </nav>

            <!-- v10.84 #215\uFF1A\u591A\u9009\u64CD\u4F5C\u6761\u5347\u7EA7 DocumentsUI action mode \u56DB\u952E\u540C\u6784\uFF08\u5206\u4EAB/\u590D\u5236\u5230/\u79FB\u52A8\u5230/\u5220\u9664\uFF09 -->
            <div class="fj-selbot" id="fjSelBot">
              <button class="fj-selact" id="fjSelShare">${e("share")}<span>\u5206\u4EAB</span></button>
              <button class="fj-selact" id="fjSelCopy">${e("copy")}<span>\u590D\u5236\u5230</span></button>
              <button class="fj-selact" id="fjSelMove">${e("move")}<span>\u79FB\u52A8\u5230</span></button>
              <button class="fj-selact danger" id="fjSelDel">${e("trash")}<span>\u5220\u9664</span></button>
            </div>
          </div>

          <!-- \u5E95\u90E8\u62BD\u5C49 -->
          <div class="fj-sheetwrap" id="fjSheetWrap">
            <div class="fj-mscrim" data-sheet-close></div>
            <div class="fj-sheet" id="fjSheet"></div>
          </div>

          <!-- \u5BF9\u8BDD\u6846 -->
          <div class="fj-dialog" id="fjDialog">
            <div class="fj-dbk" data-dialog-close></div>
            <div class="fj-dbox">
              <div class="fj-dt" id="fjDlgTitle"></div>
              <div class="fj-db" id="fjDlgMsg" style="display:none;"></div>
              <input class="fj-din" id="fjDlgInput" spellcheck="false" style="display:none;" />
              <div class="fj-dact">
                <button class="fj-btn" id="fjDlgCancel">\u53D6\u6D88</button>
                <button class="fj-btn" id="fjDlgOk">\u786E\u5B9A</button>
              </div>
            </div>
          </div>

          <!-- \u9884\u89C8 -->
          <div class="fj-preview" id="fjPreview">
            <div class="fj-pvtop">
              <button class="fj-ibtn" id="fjPvClose">${e("back")}</button>
              <div class="fj-pvname" id="fjPvName"></div>
              <button class="fj-ibtn" id="fjPvShare" title="\u5206\u4EAB">${e("share")}</button>
              <button class="fj-ibtn" id="fjPvDl" title="\u5BFC\u51FA\u5230\u7535\u8111">${e("download")}</button>
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
            // v7.75\uFF1ApbEase \u51CF\u901F\u6620\u5C04\u968F\u5B98\u65B9\u5C45\u4E2D\u7F29\u653E\u6DE1\u6362\u901A\u9053\u4E00\u5E76\u9000\u5F79\uFF08\u624B\u52BF\u6062\u590D v7.70 \u7EBF\u6027\u8DDF\u624B\uFF09

            var app = $('fjApp'), homeEl = $('fjHome'), cleanEl = $('fjClean'), browseEl = $('fjBrowse');
            var subEl = $('fjSub'), subBody = $('fjSubBody'), subTitle = $('fjSubTitle');
            var sheetWrap = $('fjSheetWrap'), sheetEl = $('fjSheet');
            var dlgEl = $('fjDialog'), dlgTitle = $('fjDlgTitle'), dlgMsg = $('fjDlgMsg'), dlgInput = $('fjDlgInput');
            var snackEl = $('fjSnack');
            var pvEl = $('fjPreview'), pvBody = $('fjPvBody'), pvName = $('fjPvName');
            var selTop = $('fjSelTop'), selBot = $('fjSelBot');
            var fab = $('fjFab'), fabLead = $('fjFabLead'), fabMenu = $('fjFabMenu'), navPill = $('fjNavPill'), navbar = $('fjNavbar');
            var fileInput = $('fjFileInput');
            var mainEl = $('fjApp').querySelector('.fj-main'); // v7.70 \u9884\u89C8\u8FD4\u56DE\u89C6\u5DEE\u7684\u5E95\u5C42\u5BBF\u4E3B

            // ==================== v7.70 \u5C42\u7EA7\u8FD4\u56DE\u89C6\u5DEE\uFF08Android \u5E73\u53F0\u540C\u6784\uFF09 ====================
            // \u524D\u8FDB\uFF1A\u5E95\u5C42\u9875\u5DE6\u79FB\u538B\u6697\uFF080 \u2192 -24%\uFF09\uFF1B\u540E\u9000\uFF1A\u5E95\u5C42\u9875\u4ECE\u5DE6\u4FA7\u89C6\u5DEE\u5F52\u4F4D\uFF08-24% \u2192 0\uFF09\u3002
            // \u5E95\u5C42\u52A8\u6548\u4EC5\u5B58\u5728\u4E8E\u8FC7\u6E21\u671F\uFF0C\u7ED3\u675F\u540E\u88AB\u4E0D\u900F\u660E\u9876\u9875\u5B8C\u5168\u8986\u76D6\uFF0C\u7C7B\u6458\u9664\u540E\u7684\u590D\u4F4D\u4E0D\u53EF\u89C1\u3002
            var underTimers = [];
            function underClearTimers() { while (underTimers.length) { try { clearTimeout(underTimers.pop()); } catch (e) {} } }
            function underAnimate(els, reveal) {
              try {
                underClearTimers();
                els.forEach(function(el) {
                  if (!el) return;
                  el.classList.remove('fj-under-out', 'fj-under-in');
                  void el.offsetWidth; // \u5F3A\u5236\u91CD\u6392\uFF1A\u5FEB\u901F\u8FDE\u5F00\u8FDE\u5173\u65F6\u91CD\u653E\u52A8\u753B
                  el.classList.add(reveal ? 'fj-under-in' : 'fj-under-out');
                });
                underTimers.push(setTimeout(function() {
                  els.forEach(function(el) { if (el) { el.classList.remove('fj-under-out', 'fj-under-in'); el.classList.add('fj-shown'); } }); // v7.71 \u843D\u5B9A\u54E8\u5175\u540C\u6B65\u6302\u8F7D
                }, reveal ? 300 : 360));
              } catch (e) {}
            }
            function activeScreenEl() { try { return app.querySelector('.fj-screen.on'); } catch (e) { return null; } }

            // \u6587\u6863\u76D1\u542C\u767B\u8BB0\uFF08\u5B9E\u4F8B\u9500\u6BC1\u81EA\u52A8\u9000\u8BA2\uFF09/ \u6E05\u7406\u767B\u8BB0 \u2014\u2014 \u5168\u811A\u672C\u591A\u5904\u4F7F\u7528\uFF0C\u524D\u7F6E\u5B9A\u4E49
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var addCleanup = window.__addAppCleanup || function() {};

            // ==================== \u72B6\u6001 ====================
            var S = {
              tab: 0,
              view: 'list',          // list | grid
              sort: 'date',          // date | name | size
              sortDir: 'desc',       // v10.84 #215\uFF1A\u6392\u5E8F\u65B9\u5411\uFF08DocumentsUI \u65B9\u5411\u5207\u6362\u8BED\u4E49\uFF0C\u9ED8\u8BA4 desc \u4FDD\u6301 v7.51 \u6392\u5E8F\u7ED3\u679C\uFF09
              selMode: false,
              sel: new Set(),        // \u9009\u4E2D path \u96C6\u5408
              sub: null,             // { kind:'dir', dir } | { kind:'cat', key }
              visible: false,
              filter: '',            // v7.66 \u6D4F\u89C8\u9875\u5B9E\u65F6\u8FC7\u6EE4\u5173\u952E\u5B57
              cache: { t: 0, files: null },
            };
            var currentPreviewPath = null;
            var lastErrPath = null;

            // ==================== \u57FA\u7840\u5DE5\u5177 ====================
            function esc(s) {
// v11.50 #240\uFF1A\u5355\u6E90\u59D4\u6258\u2014\u2014\u8F6C\u4E49\u5B9E\u73B0\u6536\u655B apps/_shared/sanitize.js escapeHtml\uFF08\u672C\u6587\u4EF6\u6B63\u5219\u94FE\u9000\u5F79\uFF0C\u8D1F\u5411\u951A tests/v240\uFF09
              return window.__mdEscape(s);
            }
            // v11.50 #286 \u7EED\uFF1A\u7EAF\u903B\u8F91\u771F\u8EAB\u5355\u6E90\u4E0A\u79FB js/files-core.js\uFF08window.__filesCore \u6865\uFF0C__fjIc \u540C\u6784\uFF09\u2014\u2014
            // \u5185\u8054\u522B\u540D\u96F6\u884C\u4E3A\u53D8\u5316\uFF1BfmtTime \u4FDD\u7559\u672C\u5730\uFF08\u8FD0\u884C\u65F6 locale \u8BED\u4E49\uFF0C\u975E\u7EAF\u51FD\u6570\u4E0D\u8FDB\u6838\uFF09
            var __fc = window.__filesCore || {};
            var CATS = __fc.CATS || [];
            var fmtBytes = __fc.fmtBytes || function(b) { return (b || 0) + ' B'; };
            var parentOf = __fc.parentOf, baseName = __fc.baseName, validName = __fc.validName;
            var extOf = __fc.extOf, catOf = __fc.catOf;
            function fmtTime(ts) {
              try { return new Date(ts || Date.now()).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
            }
            function snack(msg, icn, sticky) {
              // v7.72 M3E Loading indicator\uFF1Aicon='loader' \u65F6\u6302\u4E03\u5F62\u5FAA\u73AF\u5F62\u53D8\u6307\u793A\u5668
              // \uFF08\u5B98\u65B9\uFF1A<5s \u77ED\u7B49\u5F85\u66FF\u6362\u4E0D\u786E\u5B9A\u5706\u5F62\u8FDB\u5EA6\uFF1B\u5BFC\u5165/\u751F\u6210\u7B49\u77ED\u4EFB\u52A1\u573A\u666F\uFF09
              if (icn === 'loader') {
                snackEl.innerHTML = '<span class="m3e-loader m3e-loader-snack" id="fjSnackLoader"></span><span>' + esc(msg) + '</span>';
                var loaderBox = $('fjSnackLoader');
                if (loaderBox && window.__m3eLoader) window.__m3eLoader.mount(loaderBox, { size: 17 });
              } else {
                snackEl.innerHTML = ic(icn || 'check') + '<span>' + esc(msg) + '</span>';
              }
              snackEl.classList.add('on');
              clearTimeout(snackEl._t);
              // v7.69 sticky\uFF1A\u591A\u6587\u4EF6\u5BFC\u5165\u8FDB\u5EA6\u7B49\u957F\u4EFB\u52A1\u671F\u95F4\u4E0D\u81EA\u52A8\u9690\u85CF\uFF08\u5B8C\u6210\u6001\u7531\u540E\u7EED\u8C03\u7528\u6536\u5C3E\uFF09
              if (!sticky) snackEl._t = setTimeout(function() { snackEl.classList.remove('on'); }, 2600);
            }

            // ==================== VFS \u6570\u636E\u5C42 ====================
            function flatFiles() {
              // \u5168\u5E93\u6241\u5E73\u6587\u4EF6\u6E05\u5355\uFF08\u5E26 300ms \u7F13\u5B58\uFF1BVFS \u8BA2\u9605\u4F1A\u4E3B\u52A8\u5931\u6548\uFF09
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
            // v11.50 #286 \u7EED\uFF1ACATS/extOf/catOf \u5DF2\u4E0A\u79FB\u6838\uFF08\u89C1\u4E0A\u65B9 __fc \u522B\u540D\u884C\uFF09\uFF0C\u5185\u8054\u5B9A\u4E49\u9000\u5F79
            function filesOfCat(key) {
              var cat = null;
              for (var i = 0; i < CATS.length; i++) if (CATS[i].key === key) cat = CATS[i];
              if (!cat) return [];
              return flatFiles().filter(function(e) {
                var m = e.mime || '', ext = extOf(e.name || '');
                return (cat.mime && m.indexOf(cat.mime) === 0) || cat.exts.indexOf(ext) !== -1;
              });
            }
            // v10.84 #215\uFF1A\u6392\u5E8F\u65B9\u5411\u5316\uFF08asc/desc\uFF0CDocumentsUI \u65B9\u5411\u5207\u6362\u540C\u6784\uFF1B\u9ED8\u8BA4 desc \u4FDD\u6301 v7.51 \u6392\u5E8F\u7ED3\u679C\uFF09
            // v11.50 #286 \u7EED\uFF1A\u6392\u5E8F\u6838\u53C2\u6570\u5316\u4E0A\u79FB\uFF08sortEntries(list, key, dir)\uFF09\uFF0C\u5185\u8054 wrapper \u8BFB\u95ED\u5305\u72B6\u6001\u7B49\u503C\u6362\u7B97
            function sorted(list) { return __fc.sortEntries(list, S.sort, S.sortDir); }
            function listDir(dir) {
              var entries;
              try { entries = V().list(dir) || []; } catch (e) { entries = []; }
              var dirs = [], files = [];
              for (var i = 0; i < entries.length; i++) (entries[i].type === 'dir' ? dirs : files).push(entries[i]);
              return { dirs: sorted(dirs), files: sorted(files) };
            }

            // v7.69 \u76EE\u5F55\u884C\u5143\u4FE1\u606F\uFF1A\u76F4\u63A5\u5B50\u9879\u8BA1\u6570 + \u76F4\u63A5\u5B50\u6587\u4EF6\u5B57\u8282\uFF08Files by Google \u540C\u6B3E\u300CN \u9879\u300D\uFF09\u3002
            // V().list \u8D70\u5185\u5B58\u7D22\u5F15\uFF0C\u9010\u76EE\u5F55\u5B9E\u65F6\u8BA1\u7B97\u96F6\u6210\u672C\uFF1B\u76EE\u5F55\u4E0D\u5B58\u5728\u8FD4\u56DE null\uFF08\u884C\u56DE\u843D\u5230 hint\uFF09\u3002
            function dirStatOf(path) {
              var list;
              try { list = V().list(path) || []; } catch (e) { return null; }
              var bytes = 0;
              for (var i = 0; i < list.length; i++) if (list[i].type !== 'dir') bytes += list[i].size || 0;
              return { n: list.length, bytes: bytes };
            }

            // ==================== v7.66 \u6E05\u7406\u6570\u636E\u5C42\uFF08\u771F\u5B9E\u626B\u63CF\uFF0C\u65E0\u6F14\u793A\u6570\u636E\uFF09 ====================
            // \u7D2F\u8BA1\u5DF2\u91CA\u653E\u5B57\u8282\uFF08\u6E05\u7406\u9875\u5220\u9664\u6210\u529F\u540E\u7D2F\u52A0\uFF0C\u8DE8\u4F1A\u8BDD\u6301\u4E45\uFF09
            // v11.17 #283\uFF1A\u88F8\u952E\u6536\u7F16\u8FDB ios-desktop: \u547D\u540D\u7A7A\u95F4\u2014\u2014\u4E3B\u8BFB ios-desktop:files-clean-freed-total\uFF0C
            // \u65B0\u952E\u7F3A\u5931\u65F6\u56DE\u843D\u65E7\u88F8\u952E files_clean_freed_total \u5E76\u4E00\u6B21\u6027\u642C\u79FB\uFF08\u65E7\u952E\u8BFB\u5199\u70B9\u5DF2\u5168\u5E93\u6E05\u96F6\uFF09
            function freedTotal() {
              try {
                var v = localStorage.getItem('ios-desktop:files-clean-freed-total');
                if (v === null) {
                  v = localStorage.getItem('files_clean_freed_total');
                  if (v !== null) { try { localStorage.setItem('ios-desktop:files-clean-freed-total', v); localStorage.removeItem('files_clean_freed_total'); } catch (e2) {} }
                }
                return +v || 0;
              } catch (e) { return 0; }
            }
            function bumpFreed(n) {
              if (!n || n < 0) return;
              try { localStorage.setItem('ios-desktop:files-clean-freed-total', String(freedTotal() + n)); } catch (e) {}
            }
            // \u5783\u573E\u626B\u63CF\uFF1A\u2460 \u91CD\u590D\u6587\u4EF6\uFF08\u540C\u540D\u540C\u4F53\u79EF\u5206\u7EC4\uFF0C\u4FDD\u7559\u6700\u65B0\u4E00\u4EFD\uFF0C\u5176\u4F59\u8BA1\u5197\u4F59\uFF09
            // \u2461 \u7A7A\u6587\u4EF6\u5939\uFF08\u9012\u5F52\u626B\u63CF\u65E0\u5B50\u9879\u76EE\u5F55\uFF0C\u6839\u76EE\u5F55\u4E0D\u8BA1\uFF09 \u2462 30 \u5929\u672A\u52A8\u6587\u4EF6
            function scanJunk() {
              var files = flatFiles().filter(function(e) { return e.type === 'file'; });
              var groups = {};
              files.forEach(function(e) {
                var k = (e.name || '') + '|' + (e.size || 0);
                (groups[k] = groups[k] || []).push(e);
              });
              var dupRedundant = [], dupGroups = 0;
              Object.keys(groups).forEach(function(k) {
                var g = groups[k];
                if (g.length < 2) return;
                g.sort(function(a, b) { return (b.modified || 0) - (a.modified || 0); });
                dupGroups++;
                for (var i = 1; i < g.length; i++) dupRedundant.push(g[i]);
              });
              dupRedundant.sort(function(a, b) { return (b.size || 0) - (a.size || 0); });
              var emptyDirs = [];
              (function recEmpty(dir) {
                var list;
                try { list = V().list(dir) || []; } catch (e) { return; }
                if (!list.length) { if (dir !== '/') emptyDirs.push(dir); return; }
                for (var i = 0; i < list.length; i++) if (list[i].type === 'dir') recEmpty(list[i].path);
              })('/');
              var cutoff = Date.now() - 30 * 86400000;
              var stale = files.filter(function(e) { return (e.modified || 0) > 0 && (e.modified || 0) < cutoff; })
                .sort(function(a, b) { return (a.modified || 0) - (b.modified || 0); });
              var reclaim = 0;
              dupRedundant.forEach(function(e) { reclaim += e.size || 0; });
              return { dupRedundant: dupRedundant, dupGroups: dupGroups, emptyDirs: emptyDirs, stale: stale, reclaim: reclaim };
            }

            // \u56FE\u6807\u96C6\u5DF2\u63D0\u5347\u81F3\u6A21\u5757\u9876\u5C42\uFF08\u6A21\u677F ${e()} \u9700\u5728\u6A21\u5757\u6C42\u503C\u671F\u6E32\u67D3\uFF09\uFF1B\u5185\u8054\u811A\u672C\u7ECF window \u6865\u53D6\u7528
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

            // ==================== \u5BF9\u8BDD\u6846 / \u62BD\u5C49 ====================
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
            function closeSheet() { sheetWrap.classList.remove('on'); fabMenu.classList.remove('spin'); if (fab) fab.classList.remove('m3e-sb-open'); }

            // ==================== Tab \u5207\u6362 ====================
            var SCREEN_IDS = ['fjHome', 'fjClean', 'fjBrowse'];
            var axTimer = null; // v7.70 \u5171\u4EAB\u8F74\u7C7B\u5EF6\u8FDF\u6458\u724C\u53E5\u67C4
            var showTimer = null; // v7.71 \u843D\u5B9A\u54E8\u5175\u53E5\u67C4\uFF08\u5165\u573A\u52A8\u753B\u7ED3\u675F\u540E\u6302 fj-shown\uFF0C\u675C\u7EDD\u540E\u7EED\u7C7B\u6458\u9664\u91CD\u653E fjFade\uFF09
            function syncScreens(direction) {
              // v7.66 \u5B58\u91CF bug \u4FEE\u590D\uFF1Av7.51 \u91CD\u5236\u4EE5\u6765 switchTab \u53EA\u5207\u5BFC\u822A\u9AD8\u4EAE\uFF08pill/\u4FA7\u680F\uFF09\uFF0C
              // \u4ECE\u672A\u5207\u6362 .fj-screen.on \u663E\u9690 \u2014\u2014 \u70B9\u300C\u6E05\u7406/\u6D4F\u89C8\u300D\u89C6\u89C9\u4E0A\u6C38\u8FDC\u505C\u5728\u9996\u9875
              //\uFF08\u7528\u6237\u4E3B\u8BC9\u300C\u53EA\u505A\u4E86\u9996\u9875\u300D\u7684\u771F\u76F8\uFF09\u3002\u6B64\u5904\u6309 S.tab \u540C\u6B65\u4E09\u4E2A screen\u3002
              app.querySelectorAll('.fj-screen').forEach(function(sc) {
                var entering = sc.id === SCREEN_IDS[S.tab];
                // v7.71 \u843D\u5B9A\u54E8\u5175\uFF1A\u91CD\u8FDB\u5C4F\u5148\u6458 fj-shown\uFF08\u91CD\u653E\u5165\u573A\u52A8\u753B\uFF09\uFF0C\u9000\u573A\u5C4F\u4E0D\u52A8
                if (entering && !sc.classList.contains('on')) sc.classList.remove('fj-shown');
                sc.classList.toggle('on', entering);
              });
              // v7.71\uFF1A\u5165\u573A\u52A8\u753B\uFF08fjFade 0.26s / fjAx 0.32s + \u8F74\u7C7B\u6458\u724C 0.38s\uFF09\u5168\u90E8\u7ED3\u675F\u540E\u6302 fj-shown\uFF0C
              // \u57FA\u7840\u52A8\u753B\u5F52 none \u2014\u2014 \u540E\u7EED\u6458\u9664\u4EFB\u4F55\u8FC7\u6E21\u7C7B\u90FD\u4E0D\u518D\u91CD\u653E fjFade\uFF08\u5168\u5C4F\u95EA\u70C1\u6839\u6CBB\uFF09
              var enterSc = document.getElementById(SCREEN_IDS[S.tab]);
              if (enterSc) {
                if (showTimer) try { clearTimeout(showTimer); } catch (e) {}
                showTimer = setTimeout(function() { try { enterSc.classList.add('fj-shown'); } catch (e) {} }, 420);
              }
              // v7.69 \u5171\u4EAB\u8F74\u8FDB\u573A\uFF1A\u5E26\u65B9\u5411\u65F6\u7ED9\u76EE\u6807 screen \u6302 fj-ax-l/fj-ax-r
              //\uFF08\u5F3A\u91CD\u6392\u91CD\u653E\uFF0C\u786E\u4FDD\u540C\u5E27\u91CD\u590D\u5207\u6362\u52A8\u753B\u4ECE\u5934\u91CD\u653E\uFF09\uFF1Bdirection \u7F3A\u7701\u8D70 fjFade\u3002
              // v7.70\uFF1A\u52A8\u753B\u7ED3\u675F\u540E\uFF08380ms\uFF09\u6458\u9664\u8F74\u7C7B \u2014\u2014 \u8F74\u7C7B\u82E5\u6C38\u4E45\u5728\u573A\uFF0C\u5176 (0,3,0) \u7279\u5F02\u6027
              // \u4F1A\u538B\u5236\u540E\u7EED\u4F4E\u7279\u5F02\u6027\u52A8\u753B\uFF08\u5982\u5B50\u9875\u8FD4\u56DE\u89C6\u5DEE fj-under-*\uFF09\uFF0C\u5BFC\u81F4\u6D4F\u89C8/\u6E05\u7406\u9875\u89C6\u5DEE\u5931\u6548\u3002
              if (direction) {
                var sc = document.getElementById(SCREEN_IDS[S.tab]);
                if (sc) {
                  sc.classList.remove('fj-ax-l', 'fj-ax-r');
                  void sc.offsetWidth;
                  sc.classList.add(direction > 0 ? 'fj-ax-l' : 'fj-ax-r');
                  if (axTimer) try { clearTimeout(axTimer); } catch (e) {}
                  axTimer = setTimeout(function() { try { sc.classList.remove('fj-ax-l', 'fj-ax-r'); } catch (e) {} }, 380);
                }
              }
            }
            function switchTab(i) {
              if (S.tab === i) return;
              var dir = i > S.tab ? 1 : -1;
              S.tab = i;
              exitSel();
              syncScreens(dir);
              renderTabs();
              renderAll();
              // v7.69 \u8FDB\u573A stagger\uFF1A\u4EC5 tab \u5207\u6362\u7684\u8FDB\u573A\u6302 .stag\uFF08refresh \u91CD\u6E32\u67D3\u4E0D\u91CD\u64AD\uFF09
              var sc = document.getElementById(SCREEN_IDS[S.tab]);
              if (sc) sc.querySelectorAll('.fj-vlist').forEach(function(v) { v.classList.add('stag'); });
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

            // ==================== \u6E32\u67D3\uFF1A\u884C\u7EC4\u4EF6 ====================
            function selboxHtml(path) {
              var on = S.sel.has(path);
              return '<span class="fj-selbox' + (on ? ' on' : '') + '" data-selbox="' + esc(path) + '">' + ic('check') + '</span>';
            }
            function rowHtml(entry, opts) {
              opts = opts || {};
              // v7.69\uFF1A\u76EE\u5F55\u884C\u5C55\u793A\u300CN \u9879 \xB7 \u4F53\u79EF\u300D\u771F\u5B9E\u5143\u4FE1\u606F\uFF08\u65E7\u7248\u53EA\u6709 hint\uFF0C\u591A\u6570\u4E3A\u7A7A\uFF09
              var meta;
              if (entry.type === 'dir') {
                var st = dirStatOf(entry.path);
                meta = (st && st.n) ? (st.n + ' \u9879 \xB7 ' + fmtBytes(st.bytes)) : ((entry.meta && entry.meta.hint) || '');
              } else {
                meta = fmtBytes(entry.size) + ' \xB7 ' + fmtTime(entry.modified);
              }
              var thumb = '';
              if (entry.type === 'file' && (entry.mime || '').indexOf('image/') === 0) {
                thumb = '<img data-thumb="' + esc(entry.path) + '" alt="" decoding="async" />';
              }
              var selbox = (S.selMode && opts.selectable !== false) ? selboxHtml(entry.path) : '';
              return '<div class="fj-row fj-rpl' + (S.sel.has(entry.path) ? ' seld' : '') + '" data-path="' + esc(entry.path) + '" data-type="' + entry.type + '" role="button" tabindex="0">'
                + selbox
                + '<span class="th" style="color:' + colorForEntry(entry) + ';">' + thumb + ic(iconForEntry(entry)) + '</span>'
                + '<span class="tx"><span class="t">' + esc(entry.name) + '</span><span class="s">' + esc(meta) + '</span></span>'
                + (S.selMode
                  ? '<span class="end"></span>'
                  // v10.84 #215\uFF1A\u76EE\u5F55\u884C\u5C3E \u22EE \u4E0E\u6587\u4EF6\u7EDF\u4E00\uFF08DocumentsUI overflow \u540C\u6784\uFF09\u2014\u2014\u76EE\u5F55\u64CD\u4F5C\u83DC\u5355\u53EF\u8FBE
                  : '<button class="fj-act" data-act="more" data-path="' + esc(entry.path) + '">' + ic('morev') + '</button>')
                + '</div>';
            }
            function gridItemHtml(entry) {
              var thumb = '';
              if ((entry.mime || '').indexOf('image/') === 0) thumb = '<img data-thumb="' + esc(entry.path) + '" alt="" decoding="async" />';
              else thumb = '<span class="gi-ic">' + ic(iconForEntry(entry)) + '</span>';
              var selbox = S.selMode ? selboxHtml(entry.path) : '';
              // v7.69 \u76EE\u5F55\u7F51\u683C\u8BA1\u6570\u5FBD\u6807
              var badge = '';
              if (entry.type === 'dir') {
                var st = dirStatOf(entry.path);
                if (st && st.n) badge = '<span class="gcnt">' + st.n + '</span>';
              }
              return '<div class="fj-gitem' + (S.sel.has(entry.path) ? ' seld' : '') + '" data-path="' + esc(entry.path) + '" data-type="' + entry.type + '" role="button" tabindex="0">'
                + selbox + thumb + badge
                + '<span class="gl">' + esc(entry.name) + '</span>'
                + '</div>';
            }
            function fillThumbs(scope) {
              // \u56FE\u7247\u7F29\u7565\u56FE\u61D2\u586B\u5145\uFF08readURL \u5F02\u6B65\uFF1Bdecoding=async \u9632\u89E3\u7801\u963B\u585E\u6EDA\u52A8\u5E27\uFF09
              scope.querySelectorAll('img[data-thumb]:not([data-loaded])').forEach(function(img) {
                img.dataset.loaded = '1';
                var p = img.getAttribute('data-thumb');
                V() && V().readURL(p).then(function(url) {
                  if (url && img.isConnected) img.src = url;
                  else if (img.isConnected) img.remove(); // \u65E0\u7F29\u7565\u56FE\u56DE\u843D\u5230\u7C7B\u578B\u56FE\u6807
                });
              });
            }
            function emptyHtml(iconName, t, s) {
              return '<div class="fj-empty"><div class="ci">' + ic(iconName) + '</div><div class="t">' + esc(t) + '</div><div class="s">' + esc(s) + '</div></div>';
            }

            // ==================== \u6E32\u67D3\uFF1A\u4E09\u4E2A\u6807\u7B7E ====================
            // v7.69 \u5B58\u50A8\u5361\u5347\u7EA7\uFF1A\u5F15\u64CE\u5FBD\u7AE0\uFF08OPFS/IndexedDB\uFF09+ \u6301\u4E45\u5B58\u50A8\u72B6\u6001/\u7533\u8BF7 + \u672C\u6E90\u771F\u5B9E\u914D\u989D\u6761\u3002
            // \u5F15\u64CE/\u914D\u989D\u4E3A\u5F02\u6B65\u63A2\u6D4B\uFF08estimate/persisted\uFF09\uFF0C\u5361\u7247\u5148\u6E32\u67D3\u9AA8\u67B6\uFF0CfillStorageCardExtras \u586B\u5145\u3002
            function storageCardHtml() {
              var u = usageSafe();
              var used = u ? u.bytes : 0;
              // \u8FDB\u5EA6\u6761\u6309\u771F\u5B9E top-dir \u5360\u6BD4\u5206\u6BB5\uFF08VFS usage \u65E0 quota \u4E0A\u9650\u523B\u5EA6\uFF0C
              // \u4E0D\u4F2A\u9020\u767E\u5206\u6BD4\u523B\u5EA6 \u2014\u2014 \u6BB5\u5BBD = \u8BE5\u76EE\u5F55\u5B57\u8282 / \u5168\u5E93\u5DF2\u7528\uFF09
              var segs = '';
              var topBits = '';
              var hues = ['hsl(var(--md-h,215) 80% 60%)', 'hsl(calc(var(--md-h,215) + 40) 70% 58%)', 'hsl(calc(var(--md-h,215) - 40) 70% 55%)', 'hsl(var(--md-h,215) 30% 55%)'];
              if (u && u.byDir && u.byDir.length && used > 0) {
                for (var i = 0; i < u.byDir.length && i < 4; i++) {
                  var w = Math.round(u.byDir[i].bytes / used * 100);
                  if (w <= 0) continue;
                  segs += '<i style="flex:' + w + ' 1 0;background:' + hues[i % hues.length] + ';"></i>';
                  topBits += '<span><span class="dot" style="background:' + hues[i % hues.length] + ';"></span>' + esc(u.byDir[i].dir === '/' ? '\u6839\u76EE\u5F55' : u.byDir[i].dir.slice(1)) + ' ' + fmtBytes(u.byDir[i].bytes) + '</span>';
                }
              }
              if (!segs) segs = '<i style="flex:1 1 0;opacity:.25;"></i>';
              // \u6CE8\u610F\uFF1A\u4E09\u9875\u5171\u7528\u6B64\u6A21\u677F\uFF08id \u4F1A\u91CD\u590D\uFF09\uFF0C\u4EA4\u4E92\u5B9A\u4F4D\u4E00\u5F8B\u7528 class + \u5BBF\u4E3B\u8303\u56F4\u5185\u67E5\u627E
              return '<div class="fj-storecard">'
                + '<div class="fj-stop">' + ic('browse') + '<span><span class="tt">\u5185\u90E8\u5B58\u50A8</span><br/><span class="ss">' + (u ? u.files + ' \u4E2A\u6587\u4EF6 \xB7 ' + u.dirs + ' \u4E2A\u76EE\u5F55' : '\u7EDF\u8BA1\u4E2D\u2026') + '</span></span></div>'
                + '<div class="pbar">' + segs + '</div>'
                + '<div class="fj-sbot"><span><span class="dot" style="background:hsl(var(--md-h,215) 80% 60%);"></span>\u5DF2\u7528 ' + fmtBytes(used) + '</span>' + topBits + '</div>'
                + '<div class="fj-engrow"><span class="fj-badge fj-engbadge">\u5F15\u64CE\u68C0\u6D4B\u4E2D\u2026</span>'
                + '<span class="fj-badge fj-persistbadge" style="display:none;">\u6301\u4E45\u5B58\u50A8</span>'
                + '<button class="fj-chip fj-persistbtn" style="display:none;">' + ic('check') + '\u7533\u8BF7\u6301\u4E45\u5B58\u50A8</button></div>'
                + '<div class="fj-quotarow"><div class="fj-qbar"><i class="fj-quotafill"></i></div><span class="fj-qtext fj-quotatext">\u6B63\u5728\u8BFB\u53D6\u914D\u989D\u2026</span></div>'
                + '</div>';
            }

            // v7.69 \u5B58\u50A8\u5361\u5F02\u6B65\u586B\u5145\uFF1A\u5F15\u64CE\u5FBD\u7AE0 / \u6301\u4E45\u5B58\u50A8\u5FBD\u7AE0\u6216\u7533\u8BF7\u6309\u94AE / \u672C\u6E90\u914D\u989D\u6761\u3002
            // \u4E09\u9875\u5404\u81EA\u5B9E\u4F8B\u72EC\u7ACB\u586B\u5145\uFF08class \u5B9A\u4F4D + isConnected \u9632\u6E32\u67D3\u7ADE\u6001\uFF09\u3002
            async function fillStorageCardExtras() {
              var v = V();
              if (!v) return;
              var eng = null;
              try { eng = v.engine ? v.engine() : null; } catch (e) {}
              var persisted = null;
              try { persisted = v.persisted ? await v.persisted() : null; } catch (e) {}
              var est = null;
              try { est = v.estimate ? await v.estimate() : null; } catch (e) {}
              [homeEl, cleanEl, browseEl].forEach(function(host) {
                if (!host || !host.isConnected) return;
                var engBadge = host.querySelector('.fj-engbadge');
                if (engBadge && eng) {
                  engBadge.textContent = eng.opfs ? 'OPFS \u5F15\u64CE' : 'IndexedDB';
                  engBadge.classList.toggle('on', !!eng.opfs);
                }
                var pBadge = host.querySelector('.fj-persistbadge');
                var pBtn = host.querySelector('.fj-persistbtn');
                if (pBadge && pBtn) {
                  if (persisted === true) { pBadge.style.display = ''; pBtn.style.display = 'none'; }
                  else if (persisted === false) { pBadge.style.display = 'none'; pBtn.style.display = ''; }
                  else { pBadge.style.display = 'none'; pBtn.style.display = 'none'; }
                }
                var fill = host.querySelector('.fj-quotafill');
                var txt = host.querySelector('.fj-quotatext');
                if (est && est.quota > 0 && fill && txt) {
                  var pct = Math.min(100, Math.max(0.5, (est.usage / est.quota) * 100));
                  fill.style.width = pct.toFixed(2) + '%';
                  // v7.71 \u52A8\u753B\u6D41\u7545\u6027\uFF1A\u586B\u5145\u52A8\u753B\u8D70\u4E00\u6B21\u6027\u5408\u6210\u5668 scaleX\uFF08.go \u91CD\u653E\uFF09\uFF0Cwidth \u5E03\u5C40\u53EA\u6B64\u4E00\u6B21\uFF0C\u52A8\u753B\u671F\u96F6 layout
                  fill.classList.remove('go');
                  void fill.offsetWidth;
                  fill.classList.add('go');
                  txt.textContent = '\u672C\u6E90\u5DF2\u7528 ' + fmtBytes(est.usage) + ' / \u914D\u989D ' + fmtBytes(est.quota) + '\uFF08' + (est.usage / est.quota * 100).toFixed(1) + '%\uFF09';
                } else if (txt) {
                  txt.textContent = '\u914D\u989D\u4FE1\u606F\u4E0D\u53EF\u7528';
                }
                var btn = host.querySelector('.fj-persistbtn');
                if (btn) btn.onclick = async function() {
                  var granted = null, now = null;
                  try { granted = await v.requestPersist(); } catch (e) {}
                  try { now = await v.persisted(); } catch (e) {}
                  if (now === true) snack('\u5DF2\u6388\u4E88\u6301\u4E45\u5B58\u50A8\uFF0C\u7CFB\u7EDF\u4E0D\u4F1A\u518D\u81EA\u52A8\u6E05\u7406\u672C\u5E94\u7528\u6570\u636E', 'check');
                  else if (granted === false || now === false) snack('\u6D4F\u89C8\u5668\u672A\u6388\u4E88\u6301\u4E45\u5B58\u50A8\uFF08\u53EF\u5728\u7AD9\u70B9\u8BBE\u7F6E\u4E2D\u624B\u52A8\u5141\u8BB8\uFF09', 'info');
                  else snack('\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u6301\u4E45\u5B58\u50A8\u7533\u8BF7', 'info');
                  fillStorageCardExtras();
                };
              });
            }

            function renderHome() {
              var cats = CATS.map(function(c) {
                var files = filesOfCat(c.key);
                var bytes = 0;
                for (var i = 0; i < files.length; i++) bytes += files[i].size || 0;
                return '<button class="fj-ccard fj-rpl" data-cat="' + c.key + '">'
                  + '<span class="ci" style="background:' + c.color + '28;color:' + c.color + ';">' + ic(c.icon) + '</span>'
                  + '<span><span class="tt">' + c.label + '</span><br/><span class="ss">' + files.length + ' \u9879 \xB7 ' + fmtBytes(bytes) + '</span></span>'
                  + '</button>';
              }).join('');
              var recent = sorted(flatFiles()).slice(0, 8);
              var recentHtml = recent.length
                ? '<div class="fj-vlist">' + recent.map(function(e) { return rowHtml(e, { selectable: false }); }).join('') + '</div>'
                : emptyHtml('browse', '\u8FD8\u6CA1\u6709\u6587\u4EF6', '\u70B9\u51FB\u53F3\u4E0B\u89D2 + \u65B0\u5EFA\uFF0C\u6216\u628A\u7535\u8111\u91CC\u7684\u6587\u4EF6\u5BFC\u5165\u8FDB\u6765');
              homeEl.innerHTML = storageCardHtml()
                + '<div class="fj-sechead"><span class="h">\u5206\u7C7B</span></div>'
                + '<div class="fj-cgrid">' + cats + '</div>'
                // v10.84 #215\uFF1A\u300C\u67E5\u770B\u5168\u90E8\u300D\u76F4\u8FBE Recents \u5B8C\u6574\u5217\u8868\u5B50\u9875\uFF08\u539F\u4E3A\u5207\u6D4F\u89C8\u9875\uFF0C\u8BED\u4E49\u9519\u4F4D\uFF09
                + '<div class="fj-sechead"><span class="h">\u6700\u8FD1\u6587\u4EF6</span><span class="x" data-open-recent style="cursor:pointer;">\u67E5\u770B\u5168\u90E8 \u203A</span></div>'
                + recentHtml;
              fillThumbs(homeEl);
              renderRailStorage();
            }

            function renderRailStorage() {
              var rail = app.querySelector('.fj-rail-storage');
              if (!rail || !rail.isConnected) return;
              var u = usageSafe();
              rail.innerHTML = '<div>\u5185\u90E8\u5B58\u50A8</div><div class="pbar"><i style="flex:1 1 0;opacity:.35;"></i></div><div>' + (u ? fmtBytes(u.bytes) + ' \xB7 ' + u.files + ' \u4E2A\u6587\u4EF6' : '\u2014') + '</div>';
              // v10.84 #215\uFF1Arail \u5206\u7C7B\u76F4\u8FBE\u533A\uFF08DocumentsUI root drawer \u5206\u7C7B\u8BED\u4E49\u540C\u6784\uFF0C\u5E73\u677F\u6001\u53EF\u89C1\uFF09
              var cats = app.querySelector('.fj-rail-cats');
              if (cats && cats.isConnected) {
                cats.innerHTML = CATS.map(function(c) {
                  return '<button class="fj-rcat fj-rpl" data-rail-cat="' + c.key + '">' + ic(c.icon) + '<span>' + c.label + '</span></button>';
                }).join('')
                  + '<button class="fj-rcat fj-rpl" data-rail-browse="1">' + ic('browse') + '<span>\u5185\u90E8\u5B58\u50A8</span></button>';
              }
            }

            function renderClean() {
              var files = sorted(flatFiles()); // size desc
              var big = files.slice(0, 8);
              var imgs = filesOfCat('image');
              var junk = scanJunk();

              // v7.66 \u6E05\u7406\u9875\u52FE\u9009\u884C\uFF08data-clean \u72EC\u7ACB\u52FE\u9009\u6D41\uFF0C\u540C\u65E7\u5927\u6587\u4EF6\u5361\uFF1Bchecked \u9884\u52FE\u9009\uFF09
              function junkRowHtml(entry, opts) {
                opts = opts || {};
                var sub = opts.sub != null ? opts.sub : (fmtBytes(entry.size) + ' \xB7 ' + fmtTime(entry.modified));
                return '<div class="fj-row fj-rpl" data-path="' + esc(entry.path) + '" data-type="' + esc(entry.type || 'file') + '" data-clean="1" role="button" tabindex="0">'
                  + '<span class="fj-selbox' + (opts.checked ? ' on' : '') + '" data-selbox="' + esc(entry.path) + '">' + ic('check') + '</span>'
                  + '<span class="th" style="color:' + colorForEntry(entry) + ';">' + ic(iconForEntry(entry)) + '</span>'
                  + '<span class="tx"><span class="t">' + esc(entry.name || baseName(entry.path)) + '</span><span class="s">' + esc(sub) + '</span></span>'
                  + '<span class="end">' + (entry.type === 'dir' ? '' : fmtBytes(entry.size)) + '</span>'
                  + '</div>';
              }
              function cleanCard(id, title, desc, rowsHtml, emptyTip) {
                return '<div class="fj-kcard"' + (id ? ' id="' + id + '"' : '') + '>'
                  + '<div class="tt">' + title + '</div>'
                  + '<div class="ss">' + desc + '</div>'
                  + (rowsHtml
                    ? '<div class="fj-vlist" style="padding:8px 0 0;">' + rowsHtml + '</div>'
                      + '<div class="act"><button class="fj-btn danger fj-cleanbtn">' + ic('trash') + '\u5220\u9664\u6240\u9009</button></div>'
                    : '<div class="ss" style="margin-top:10px;">' + emptyTip + '</div>')
                  + '</div>';
              }

              // \u5927\u6587\u4EF6\u5361\uFF08v7.51 \u539F\u6709\uFF09
              var bigRows = big.map(function(e) { return junkRowHtml(e); }).join('');
              // v7.66 \u91CD\u590D\u6587\u4EF6\uFF1A\u540C\u540D\u540C\u4F53\u79EF\u89C6\u4E3A\u540C\u4E00\u4EFD\u5185\u5BB9\u7684\u591A\u4F59\u526F\u672C\uFF08\u4FDD\u7559\u6700\u65B0\uFF0C\u5197\u4F59\u9884\u52FE\u9009\uFF09
              var dupRows = junk.dupRedundant.slice(0, 30).map(function(e) {
                return junkRowHtml(e, {
                  checked: true,
                  sub: '\u5197\u4F59\u526F\u672C \xB7 ' + (parentOf(e.path) === '/' ? '\u5185\u90E8\u5B58\u50A8' : parentOf(e.path)) + ' \xB7 ' + fmtTime(e.modified),
                });
              }).join('');
              // v7.66 \u7A7A\u6587\u4EF6\u5939
              var emptyRows = junk.emptyDirs.slice(0, 30).map(function(d) {
                return junkRowHtml({ path: d, type: 'dir', name: baseName(d), size: 0 }, { sub: '\u7A7A\u76EE\u5F55 \xB7 ' + (parentOf(d) === '/' ? '\u5185\u90E8\u5B58\u50A8' : parentOf(d)) });
              }).join('');
              // v7.66 \u4E45\u672A\u8BBF\u95EE
              var staleRows = junk.stale.slice(0, 30).map(function(e) {
                return junkRowHtml(e, { sub: fmtBytes(e.size) + ' \xB7 ' + fmtTime(e.modified) });
              }).join('');
              var imgThumbs = imgs.slice(0, 12).map(function(e) {
                return '<div class="fj-gitem" data-cat-jump="image">' + '<img data-thumb="' + esc(e.path) + '" alt="" decoding="async" />' + '</div>';
              }).join('');

              // v7.66 \u53EF\u91CA\u653E\u4F30\u7B97\u6C47\u603B\u5361\uFF08chips \u70B9\u51FB\u6EDA\u52A8\u5230\u5BF9\u5E94\u5361\u7247\uFF09
              var junkChips = [
                ['\u91CD\u590D\u6587\u4EF6', junk.dupRedundant.length, 'fjCardDup', 'copy'],
                ['\u7A7A\u6587\u4EF6\u5939', junk.emptyDirs.length, 'fjCardEmpty', 'folder'],
                ['30 \u5929\u672A\u52A8', junk.stale.length, 'fjCardStale', 'info'],
                ['\u5927\u6587\u4EF6', big.length, 'fjCardBig', 'file'],
              ].map(function(c) {
                return '<button class="fj-chip' + (c[1] ? '' : ' dim') + '" data-jump="' + c[2] + '">' + ic(c[3]) + c[0] + ' \xB7 ' + c[1] + '</button>';
              }).join('');
              var sumCard = '<div class="fj-kcard">'
                + '<div class="tt">\u53EF\u91CA\u653E\u7EA6 ' + fmtBytes(junk.reclaim) + '</div>'
                + '<div class="ss">\u6309\u91CD\u590D\u6587\u4EF6\u5197\u4F59\u526F\u672C\u4F30\u7B97\uFF1B\u52FE\u9009\u4E0B\u65B9\u5361\u7247\u4E2D\u7684\u9879\u76EE\u5E76\u5220\u9664\u5373\u53EF\u91CA\u653E\u3002\u7D2F\u8BA1\u5DF2\u91CA\u653E ' + fmtBytes(freedTotal()) + '\u3002</div>'
                + '<div class="fj-junkchips">' + junkChips + '</div>'
                + '</div>';

              cleanEl.innerHTML = storageCardHtml()
                + sumCard
                + cleanCard('fjCardBig', '\u5927\u6587\u4EF6', '\u5168\u5E93\u4E2D\u5360\u7528\u7A7A\u95F4\u6700\u5927\u7684\u6587\u4EF6\uFF0C\u52FE\u9009\u540E\u4E00\u6B21\u6027\u5220\u9664\u5373\u53EF\u91CA\u653E\u7A7A\u95F4',
                  big.length ? bigRows : '', '\u6587\u4EF6\u5F88\u5C11\uFF0C\u6682\u65E0\u53EF\u6E05\u7406\u7684\u5927\u6587\u4EF6')
                + cleanCard('fjCardDup', '\u91CD\u590D\u6587\u4EF6', junk.dupGroups
                  ? junk.dupGroups + ' \u7EC4\u540C\u540D\u540C\u4F53\u79EF\u526F\u672C\uFF0C\u5DF2\u4E3A\u60A8\u9884\u9009\u8F83\u65E7\u7684\u5197\u4F59\u4EFD\uFF08\u4FDD\u7559\u6BCF\u7EC4\u6700\u65B0\u4E00\u4EFD\uFF09'
                  : '\u540C\u540D\u540C\u4F53\u79EF\u7684\u6587\u4EF6\u4F1A\u88AB\u89C6\u4E3A\u91CD\u590D\u526F\u672C',
                  junk.dupRedundant.length ? dupRows : '', '\u672A\u53D1\u73B0\u91CD\u590D\u6587\u4EF6')
                + cleanCard('fjCardEmpty', '\u7A7A\u6587\u4EF6\u5939', '\u4E0D\u542B\u4EFB\u4F55\u6587\u4EF6\u6216\u5B50\u6587\u4EF6\u5939\u7684\u76EE\u5F55\uFF0C\u53EF\u653E\u5FC3\u5220\u9664',
                  junk.emptyDirs.length ? emptyRows : '', '\u672A\u53D1\u73B0\u7A7A\u6587\u4EF6\u5939')
                + cleanCard('fjCardStale', '30 \u5929\u672A\u52A8', '\u8D85\u8FC7 30 \u5929\u6CA1\u6709\u4FEE\u6539\u8FC7\u7684\u6587\u4EF6\uFF0C\u5F52\u6863\u6216\u5220\u9664\u524D\u8BF7\u518D\u6B21\u786E\u8BA4',
                  junk.stale.length ? staleRows : '', '\u8FD1 30 \u5929\u7684\u6587\u4EF6\u90FD\u5F88\u6D3B\u8DC3')
                + '<div class="fj-kcard">'
                + '<div class="tt">\u56FE\u7247</div>'
                + '<div class="ss">\u5171 ' + imgs.length + ' \u5F20 \xB7 ' + fmtBytes(imgs.reduce(function(a, e) { return a + (e.size || 0); }, 0)) + '</div>'
                + (imgThumbs ? '<div class="fj-gwrap" style="padding:12px 0 0;">' + imgThumbs + '</div>'
                  + '<div class="act"><button class="fj-btn" id="fjCleanImgAll">\u6279\u91CF\u7BA1\u7406</button></div>' : '')
                + '</div>';
              fillThumbs(cleanEl);
              // v7.66\uFF1A\u6BCF\u5F20\u6E05\u7406\u5361\u72EC\u7ACB\u300C\u5220\u9664\u6240\u9009\u300D\uFF08\u6309\u5361\u6536\u96C6\u52FE\u9009\u76EE\u6807\uFF0C\u5220\u9664\u6210\u529F\u7D2F\u8BA1\u5DF2\u91CA\u653E\uFF09
              cleanEl.querySelectorAll('.fj-cleanbtn').forEach(function(btn) {
                btn.onclick = function() { deleteCleanSel(btn.closest('.fj-kcard')); };
              });
              var imgAll = $('fjCleanImgAll');
              if (imgAll) imgAll.onclick = function() { openCat('image'); };
            }

            // v7.66 \u6E05\u7406\u5361\u6309\u94AE\u8BA1\u6570\u540C\u6B65\uFF08\u70B9\u51FB/\u957F\u6309\u52FE\u9009\u540E\u5237\u65B0\u6240\u5C5E\u5361\u7684\u6309\u94AE\u6587\u6848\uFF09
            function syncCleanCardBtn(card) {
              if (!card) return;
              var n = card.querySelectorAll('.fj-selbox.on').length;
              var b = card.querySelector('.fj-cleanbtn');
              if (b) b.innerHTML = ic('trash') + '\u5220\u9664\u6240\u9009' + (n ? '\uFF08' + n + '\uFF09' : '');
            }
            // v7.66 \u6E05\u7406\u9875\u5220\u9664\uFF1A\u6309\u5361\u6536\u96C6\u52FE\u9009\u76EE\u6807\uFF08\u539F v7.53 collectCleanSel \u6CDB\u5316\uFF09\uFF0C
            // \u5220\u9664\u6210\u529F\u540E\u6309\u5B9E\u9645\u91CA\u653E\u5B57\u8282\u7D2F\u8BA1 freedTotal \u5E76 snack \u53CD\u9988
            async function deleteCleanSel(cardEl) {
              var targets = [];
              (cardEl || cleanEl).querySelectorAll('.fj-selbox.on').forEach(function(b) {
                var row = b.closest('[data-path]');
                if (row && row.dataset.path) targets.push(row.dataset.path);
              });
              if (!targets.length) { snack('\u5148\u52FE\u9009\u8981\u5220\u9664\u7684\u9879\u76EE', 'info'); return; }
              var sizeMap = {};
              targets.forEach(function(p) { try { var st = V().stat(p); if (st) sizeMap[p] = st.size || 0; } catch (e) {} });
              var ok = await askDialog({ title: '\u5220\u9664', message: '\u786E\u5B9A\u5220\u9664\u6240\u9009 ' + targets.length + ' \u9879\u5417\uFF1F\\n\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002', danger: true });
              if (!ok) return;
              var done = 0, freed = 0, fail = 0;
              for (var p of targets) {
                var r = await V().del(p);
                if (r && r.ok) { done++; freed += sizeMap[p] || 0; } else fail++;
              }
              bumpFreed(freed);
              refresh();
              if (done) snack('\u5DF2\u91CA\u653E ' + fmtBytes(freed) + '\uFF08' + done + ' \u9879' + (fail ? '\uFF0C\u5931\u8D25 ' + fail + ' \u9879' : '') + '\uFF09', 'trash');
              else if (fail) snack('\u5220\u9664\u5931\u8D25\uFF08\u5B58\u50A8\u53EF\u80FD\u4E0D\u53EF\u7528\uFF09', 'trash');
            }

            function chipsRow() {
              var sorts = [['date', '\u6700\u8FD1'], ['name', '\u540D\u79F0'], ['size', '\u5927\u5C0F']];
              var chips = sorts.map(function(p) {
                return '<button class="fj-chip' + (S.sort === p[0] ? ' on' : '') + '" data-sort="' + p[0] + '">' + ic('sort') + p[1] + '</button>';
              }).join('');
              return '<div class="fj-chips">' + chips
                /* v7.72 M3E connected ButtonGroup\uFF1A\u5217\u8868/\u7F51\u683C\u5171\u4EAB\u8FB9\u754C\uFF0C\u6FC0\u6D3B\u6BB5 secondary-container\uFF0C\u6309\u538B\u5185\u89D2\u53D8\u5F62 */
                + '<div class="m3e-btngroup" role="group" aria-label="\u89C6\u56FE\u5207\u6362">'
                + '<button class="m3e-bg-seg' + (S.view === 'list' ? ' on' : '') + '" data-view="list">' + ic('listv') + '\u5217\u8868</button>'
                + '<button class="m3e-bg-seg' + (S.view === 'grid' ? ' on' : '') + '" data-view="grid">' + ic('gridv') + '\u7F51\u683C</button>'
                + '</div>'
                + '</div>';
            }
            function renderBrowse() {
              // v7.66 \u6D4F\u89C8\u9875\u4E30\u5BCC\uFF1A\u5B58\u50A8\u6982\u89C8 + \u5206\u7C7B\u96C6\u5408\u7F51\u683C + \u5B9E\u65F6\u8FC7\u6EE4 + \u76EE\u5F55\u5217\u8868\u3002
              // \u5217\u8868\u533A\u72EC\u7ACB\u5BB9\u5668\uFF08fjBrowseList\uFF09\u2014\u2014\u6392\u5E8F/\u89C6\u56FE\u5207\u6362\u3001\u8FC7\u6EE4\u8F93\u5165\u53EA\u91CD\u5EFA\u5217\u8868\u533A\uFF0C
              // \u4E0D\u518D\u6574\u9875\u91CD\u6E32\u67D3\uFF08\u4FDD\u7559\u8F93\u5165\u7126\u70B9\u4E0E\u6EDA\u52A8\u4F4D\u7F6E\uFF09\u3002
              if (!V()) {
                browseEl.innerHTML = emptyHtml('browse', '\u5B58\u50A8\u672A\u5C31\u7EEA', '\u865A\u62DF\u5B58\u50A8\u521D\u59CB\u5316\u5931\u8D25 \u2014\u2014 \u8BF7\u5237\u65B0\u9875\u9762\u91CD\u8BD5');
                return;
              }
              var collections = CATS.map(function(c) {
                var fs = filesOfCat(c.key), bytes = 0;
                for (var i = 0; i < fs.length; i++) bytes += fs[i].size || 0;
                return '<button class="fj-ccard fj-rpl" data-cat="' + c.key + '">'
                  + '<span class="ci" style="background:' + c.color + '28;color:' + c.color + ';">' + ic(c.icon) + '</span>'
                  + '<span><span class="tt">' + c.label + '</span><br/><span class="ss">' + fs.length + ' \u9879 \xB7 ' + fmtBytes(bytes) + '</span></span>'
                  + '</button>';
              }).join('');
              browseEl.innerHTML = storageCardHtml()
                + '<div class="fj-sechead"><span class="h">\u96C6\u5408</span></div>'
                + '<div class="fj-cgrid">' + collections + '</div>'
                + '<div class="fj-sechead"><span class="h">\u5185\u90E8\u5B58\u50A8</span></div>'
                + '<div class="fj-bsearchbar"><span class="bsi">' + ic('search') + '</span>'
                + '<input id="fjBSearch" type="text" placeholder="\u641C\u7D22\u5F53\u524D\u76EE\u5F55\u6216\u5168\u5E93\u2026" value="' + esc(S.filter) + '" />'
                + '<button class="fj-bclear' + (S.filter ? ' on' : '') + '" id="fjBClear" title="\u6E05\u9664">' + ic('close') + '</button>'
                + '</div>'
                + '<div id="fjBrowseList"></div>';
              var inp = $('fjBSearch');
              if (inp) {
                inp.addEventListener('input', function() {
                  S.filter = inp.value.trim();
                  var clr = $('fjBClear');
                  if (clr) clr.classList.toggle('on', !!S.filter);
                  renderBrowseList();
                });
              }
              var clrBtn = $('fjBClear');
              if (clrBtn) clrBtn.onclick = function() {
                S.filter = '';
                if (inp) inp.value = '';
                clrBtn.classList.remove('on');
                renderBrowseList();
                if (inp) inp.focus();
              };
              renderBrowseList();
              fillThumbs(browseEl);
            }

            // v7.66 \u6D4F\u89C8\u9875\u5217\u8868\u533A\uFF08\u6392\u5E8F/\u89C6\u56FE/\u8FC7\u6EE4\u53D8\u5316\u65F6\u5C40\u90E8\u91CD\u5EFA\uFF09
            function renderBrowseList() {
              var host = $('fjBrowseList');
              if (!host) return; // \u5C1A\u672A\u6E32\u67D3\u6D4F\u89C8\u9875\u9AA8\u67B6
              var q = (S.filter || '').toLowerCase();
              var d = listDir('/');
              var entries = d.dirs.concat(d.files);
              var html = '';
              if (!entries.length && !q) {
                host.innerHTML = emptyHtml('folder', '\u6B64\u76EE\u5F55\u4E3A\u7A7A', '\u70B9\u51FB\u53F3\u4E0B\u89D2 + \u65B0\u5EFA\u6587\u4EF6\u5939\u6216\u6587\u672C\u6587\u6863\uFF0C\u4E5F\u53EF\u5BFC\u5165\u6587\u4EF6');
                return;
              }
              html += chipsRow();
              var matched = q ? entries.filter(function(e) { return (e.name || '').toLowerCase().indexOf(q) !== -1; }) : entries;
              if (q) {
                html += '<div class="fj-sechead" style="padding-top:6px;"><span class="h">\u5F53\u524D\u76EE\u5F55</span><span class="x">' + matched.length + ' \u9879\u5339\u914D</span></div>';
              }
              if (matched.length) {
                html += S.view === 'grid'
                  ? '<div class="fj-gwrap">' + matched.map(gridItemHtml).join('') + '</div>'
                  : '<div class="fj-vlist">' + matched.map(function(e) { return rowHtml(e); }).join('') + '</div>';
              } else {
                html += emptyHtml('search', '\u5F53\u524D\u76EE\u5F55\u65E0\u5339\u914D', '\u8BD5\u8BD5\u5728\u4E0B\u65B9\u5168\u5E93\u7ED3\u679C\u4E2D\u67E5\u627E');
              }
              // \u5168\u5E93\u641C\u7D22\uFF08\u5173\u952E\u5B57 \u22652 \u5B57\u7B26\u65F6\uFF09\uFF1A\u8DE8\u76EE\u5F55\u6587\u4EF6\u540D\u5339\u914D\uFF0C\u70B9\u51FB\u76F4\u8FBE
              if (q && q.length >= 2) {
                var lib = flatFiles().filter(function(e) { return (e.name || '').toLowerCase().indexOf(q) !== -1 && matched.indexOf(e) === -1; })
                  .slice(0, 20);
                html += '<div class="fj-sechead"><span class="h">\u5168\u5E93\u7ED3\u679C</span><span class="x">' + lib.length + ' \u9879</span></div>';
                html += lib.length
                  ? '<div class="fj-vlist">' + lib.map(function(e) {
                      return rowHtml(e, { selectable: false }).replace('<span class="s">', '<span class="s">' + esc(parentOf(e.path) === '/' ? '\u5185\u90E8\u5B58\u50A8' : parentOf(e.path)) + ' \xB7 ');
                    }).join('') + '</div>'
                  : '<div class="ss" style="padding:0 20px;color:var(--md-on-surface-variant);font-size:12.5px;">\u5168\u5E93\u65E0\u66F4\u591A\u5339\u914D</div>';
              }
              host.innerHTML = html;
              fillThumbs(host);
            }

            // v7.69 \u9762\u5305\u5C51\uFF1A\u76EE\u5F55\u4E0B\u94BB\u5B50\u9875\u7684\u8DEF\u5F84\u5BFC\u822A\uFF08Files by Google \u540C\u6B3E\uFF09\uFF0C
            // \u70B9\u51FB\u7956\u5148\u6BB5\u76F4\u63A5\u8DF3\u8F6C\uFF1B\u5F53\u524D\u6BB5\u9AD8\u4EAE\u4E0D\u53EF\u70B9\u3002
            function crumbsHtml(dir) {
              var parts = dir.split('/').filter(Boolean);
              var items = [{ dir: '/', label: '\u5185\u90E8\u5B58\u50A8' }];
              var acc = '';
              for (var i = 0; i < parts.length; i++) { acc += '/' + parts[i]; items.push({ dir: acc, label: parts[i] }); }
              var html = '<div class="fj-crumbs">';
              for (var j = 0; j < items.length; j++) {
                var last = j === items.length - 1;
                html += '<button class="fj-crumb' + (last ? ' cur' : '') + '" data-crumb="' + esc(items[j].dir) + '">' + esc(items[j].label) + '</button>';
                if (!last) html += '<span class="fj-csep">\u203A</span>';
              }
              return html + '</div>';
            }

            // v10.84 #215\uFF1AS.sub \u6269\u5C55 kind:'recent'\uFF08DocumentsUI Recents \u5B8C\u6574\u5217\u8868\u9875\uFF0C
            // \u6392\u5E8F/\u89C6\u56FE/\u591A\u9009/\u64CD\u4F5C\u83DC\u5355\u5168\u91CF\u590D\u7528\u5B50\u9875\u65E2\u6709\u80FD\u529B\uFF09
            function renderSub() {
              if (!S.sub) return;
              var body = '';
              if (S.sub.kind === 'recent') {
                subTitle.textContent = '\u6700\u8FD1';
                fab.classList.add('hide');
                var recents = sorted(flatFiles().filter(function(e) { return e.type === 'file'; }));
                if (!recents.length) body = emptyHtml('browse', '\u6682\u65E0\u6700\u8FD1\u6587\u4EF6', '\u5BFC\u5165\u6216\u521B\u5EFA\u6587\u4EF6\u540E\u81EA\u52A8\u51FA\u73B0\u5728\u8FD9\u91CC');
                else if (S.view === 'grid') body = '<div class="fj-gwrap">' + recents.map(gridItemHtml).join('') + '</div>';
                else body = '<div class="fj-vlist">' + recents.map(function(e) { return rowHtml(e); }).join('') + '</div>';
              } else if (S.sub.kind === 'dir') {
                var d = listDir(S.sub.dir);
                var entries = d.dirs.concat(d.files);
                subTitle.textContent = S.sub.dir === '/' ? '\u5185\u90E8\u5B58\u50A8' : baseName(S.sub.dir);
                body = crumbsHtml(S.sub.dir)
                  + (entries.length
                    ? '<div class="fj-vlist">' + entries.map(function(e) { return rowHtml(e); }).join('') + '</div>'
                    : emptyHtml('folder', '\u6B64\u6587\u4EF6\u5939\u4E3A\u7A7A', '\u70B9\u51FB\u53F3\u4E0B\u89D2 + \u6DFB\u52A0\u5185\u5BB9'));
                fab.classList.remove('hide');
              } else {
                var cat = null;
                for (var i = 0; i < CATS.length; i++) if (CATS[i].key === S.sub.cat) cat = CATS[i];
                var files = sorted(filesOfCat(S.sub.cat));
                subTitle.textContent = cat ? cat.label : '\u5206\u7C7B';
                fab.classList.add('hide');
                if (!files.length) body = emptyHtml(cat ? cat.icon : 'file', '\u6682\u65E0\u6B64\u7C7B\u6587\u4EF6', '\u5BFC\u5165\u6216\u521B\u5EFA\u540E\u81EA\u52A8\u5F52\u7C7B\u5230\u8FD9\u91CC');
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
              fillStorageCardExtras();
            }
            function refresh() {
              S.cache.t = 0;
              renderAll();
              if (S.sub) renderSub();
              syncSelUI();
            }

            // ==================== \u5B50\u9875\uFF08\u76EE\u5F55\u4E0B\u94BB / \u5206\u7C7B\uFF09 ====================
            // v7.70\uFF1AsubSeq \u5E8F\u53F7\u9632\u7ADE\u6001 \u2014\u2014 \u5173\u95ED\u52A8\u753B\u671F\u95F4\u7684\u5EF6\u8FDF\u6458\u724C\u5728\u91CD\u5F00\u540E\u4F5C\u5E9F\uFF08\u4E0E\u9884\u89C8\u540C\u6B3E\uFF09\u3002
            var subSeq = 0;
            function openSub(spec) {
              S.sub = spec;
              subSeq++; // \u4F5C\u5E9F\u5F85\u89E6\u53D1\u7684\u5173\u95ED\u6E05\u7406
              underAnimate([activeScreenEl()], false); // v7.70 \u524D\u8FDB\uFF1A\u5E95\u5C42\u9875\u5DE6\u79FB\u538B\u6697
              subEl.classList.remove('anim-out');
              void subEl.offsetWidth; // \u5173\u95ED\u52A8\u753B\u4E2D\u9014\u91CD\u5F00\uFF1A\u91CD\u653E\u8FDB\u573A
              subEl.classList.add('on', 'anim-in');
              setTimeout(function() { subEl.classList.remove('anim-in'); }, 360);
              renderSub();
            }
            function closeSub() {
              if (!S.sub) return;
              S.sub = null;
              exitSel();
              underAnimate([activeScreenEl()], true); // v7.70 \u540E\u9000\uFF1A\u5E95\u5C42\u9875\u4ECE\u5DE6\u4FA7\u89C6\u5DEE\u5F52\u4F4D
              subEl.classList.add('anim-out');
              var seq = ++subSeq;
              setTimeout(function() {
                if (seq !== subSeq) return; // \u5DF2\u88AB\u91CD\u5F00\u4F5C\u5E9F
                subEl.classList.remove('on', 'anim-out');
              }, 290);
            }
            function openCat(key) { openSub({ kind: 'cat', cat: key }); }

            // ==================== \u591A\u9009 ====================
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
              $('fjSelCount').textContent = '\u5DF2\u9009\u62E9 ' + S.sel.size + ' \u9879';
              var items = selEntries();
              var shown = items.slice(0, 3).map(function(e) { return e.name; }).join('\u3001') + (items.length > 3 ? ' \u7B49' : '');
              $('fjSelHint').textContent = shown;
              var fabHide = S.selMode || !!(S.sub && S.sub.kind === 'cat');
              fab.classList.toggle('hide', fabHide);
              // v10.84 #215\uFF1A\u5206\u4EAB\u952E\u4EC5\u5728\u300C\u6070\u597D\u9009\u4E2D\u4E00\u4E2A\u6587\u4EF6\u300D\u65F6\u53EF\u7528\uFF08\u76EE\u5F55\u65E0\u5206\u4EAB\u8BED\u4E49\uFF0C\u591A\u9879\u5206\u4EAB\u65E0\u76EE\u6807\u8BED\u4E49\uFF09
              var shareOk = false;
              if (S.sel.size === 1) {
                try { var se = V().stat(Array.from(S.sel)[0]); shareOk = !!se && se.type !== 'dir'; } catch (err) {}
              }
              var sBtn = $('fjSelShare');
              if (sBtn) sBtn.classList.toggle('dim', !shareOk);
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

            // ==================== \u6279\u91CF\u64CD\u4F5C ====================
            // v7.53 \u4FEE\u590D\uFF1A\u5355\u9879\u76EE\u5F55\u83DC\u5355\uFF08\u22EE\uFF09\u4E0E\u6E05\u7406\u9875\u8DEF\u5F84\u6B64\u524D\u4E22\u53C2\u6570\u8C03 deleteSelected()\uFF0C
            // \u800C\u672C\u51FD\u6570\u53EA\u8BFB S.sel\uFF08\u6D4F\u89C8\u6001\u6052\u7A7A\uFF09\u2192 \u9996\u884C\u65E9\u9000\u9759\u9ED8 no-op\uFF08\u7528\u6237\u4E3B\u8BC9\u300C\u5220\u9664\u5BFC\u5165\u7684
            // \u6587\u4EF6\u8C8C\u4F3C\u4E0D\u751F\u6548\u300D\uFF09\u3002\u6539\u4E3A\u63A5\u53D7\u663E\u5F0F\u76EE\u6807\u5217\u8868 override\uFF1A\u591A\u9009\u8DEF\u5F84\u4ECD\u4F20 S.sel \u8BED\u4E49\uFF0C
            // \u5355\u9879/\u6E05\u7406\u9875\u8DEF\u5F84\u76F4\u4F20\u76EE\u6807\u8DEF\u5F84\uFF0C\u5168\u94FE\u8DEF\u7EDF\u4E00\u3002
            async function deleteSelected(pathsOverride) {
              var targets = (pathsOverride && pathsOverride.length) ? pathsOverride.slice() : Array.from(S.sel);
              var n = targets.length;
              if (!n) return;
              var ok = await askDialog({ title: '\u5220\u9664', message: '\u786E\u5B9A\u5220\u9664\u6240\u9009 ' + n + ' \u9879\u5417\uFF1F\\n\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002', danger: true });
              if (!ok) return;
              var done = 0, fail = 0;
              for (var p of targets) {
                var r = await V().del(p);
                if (r && r.ok) done++; else fail++;
              }
              exitSel();
              refresh();
              if (done + fail > 0) snack('\u5DF2\u5220\u9664 ' + done + ' \u9879' + (fail ? '\uFF0C\u5931\u8D25 ' + fail + ' \u9879' : '') + (fail && !done ? '\uFF08\u5B58\u50A8\u53EF\u80FD\u4E0D\u53EF\u7528\uFF09' : ''), 'trash');
            }
            // \uFF08v7.53 collectCleanSel \u5DF2\u7531 v7.66 deleteCleanSel \u7684\u6309\u5361\u6536\u96C6\u53D6\u4EE3\uFF09
            function pickDir(title, cb) {
              // \u76EE\u5F55\u9009\u62E9\u5668\uFF08\u590D\u5236\u5230/\u79FB\u52A8\u5230\uFF09\uFF1A\u9012\u5F52\u5217\u51FA\u5168\u90E8\u76EE\u5F55
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
                  + ic('folder') + '<span style="flex:1;">' + esc(d.dir === '/' ? '\u5185\u90E8\u5B58\u50A8' : baseName(d.dir)) + '</span></button>';
              }).join(''));
              sheetEl.querySelectorAll('[data-pickdir]').forEach(function(btn) {
                btn.onclick = function() {
                  var dir = btn.getAttribute('data-pickdir');
                  closeSheet();
                  cb(dir);
                };
              });
            }
            // v7.53\uFF1A\u63A5\u53D7\u663E\u5F0F\u6E90\u5217\u8868 override \u2014\u2014 \u5355\u9879\u76EE\u5F55\u83DC\u5355\u7684\u590D\u5236/\u79FB\u52A8\u4E0E\u5220\u9664\u540C\u6839\u56E0
            // \uFF08\u539F\u5B9E\u73B0\u53EA\u8BFB S.sel\uFF0C\u6D4F\u89C8\u6001\u4E0B\u9759\u9ED8\u590D\u5236 0 \u9879\uFF09
            function pasteInto(dstDir, cut, pathsOverride) {
              var sources = (pathsOverride && pathsOverride.length) ? pathsOverride.slice() : Array.from(S.sel);
              return Promise.all(sources.map(function(p) {
                var target = dstDir === '/' ? '/' + baseName(p) : dstDir + '/' + baseName(p);
                if (target === p || target.indexOf(p + '/') === 0) return Promise.resolve({ ok: false, error: '\u76EE\u6807\u65E0\u6548' });
                var finalTarget = target, n = 1;
                while (V().exists(finalTarget)) {
                  var dot = target.lastIndexOf('.');
                  finalTarget = dot > target.lastIndexOf('/') ? target.slice(0, dot) + ' (' + n + ')' + target.slice(dot) : target + ' (' + n + ')';
                  n++;
                }
                return cut ? V().move(p, finalTarget) : V().copy(p, finalTarget);
              }));
            }

            // ==================== \u66F4\u591A\u64CD\u4F5C\uFF08\u591A\u9009/\u5355\u9879\u5171\u7528\uFF09 ====================
            // v10.84 #215\uFF1A\u76EE\u5F55\u9879\u5B8C\u6574\u8BED\u4E49\u2014\u2014\u5BFC\u51FA/\u5206\u4EAB\u6309 hasDir \u95E8\u63A7\uFF08\u6D4F\u89C8\u5668\u65E0\u6CD5\u6253\u5305\u76EE\u5F55\uFF0C
            // \u5982\u5B9E\u4E0D\u6E32\u67D3\u4E0D\u4F2A\u88C5\uFF09\uFF1B\u76EE\u5F55\u53EF\u91CD\u547D\u540D/\u79FB\u52A8/\u590D\u5236/\u5220\u9664/\u8BE6\u60C5\uFF08\u539F\u7F3A\u53E3\u6839\u6CBB\uFF09
            function moreSheet(paths) {
              var one = paths.length === 1;
              var hasDir = paths.some(function(p) { try { var e = V().stat(p); return e && e.type === 'dir'; } catch (err) { return false; } });
              var head = '<div class="fj-sh-t">' + esc(one ? baseName(paths[0]) : '\u5DF2\u9009\u62E9 ' + paths.length + ' \u9879') + '</div>';
              var html = head
                + '<button class="fj-sh-item" data-m="copy">' + ic('copy') + '\u590D\u5236\u5230\u2026</button>'
                + '<button class="fj-sh-item" data-m="move">' + ic('move') + '\u79FB\u52A8\u5230\u2026</button>'
                + (one ? '<button class="fj-sh-item" data-m="rename">' + ic('edit') + '\u91CD\u547D\u540D</button>' : '')
                + (!hasDir ? '<button class="fj-sh-item" data-m="export">' + ic('download') + '\u5BFC\u51FA\u5230\u7535\u8111</button>' : '')
                + (!hasDir ? '<button class="fj-sh-item" data-m="share">' + ic('share') + '\u5206\u4EAB</button>' : '')
                + (one ? '<button class="fj-sh-item" data-m="details">' + ic('info') + '\u8BE6\u60C5</button>' : '')
                + '<button class="fj-sh-item danger" data-m="del">' + ic('trash') + '\u5220\u9664</button>';
              openSheet(html);
              sheetEl.querySelectorAll('[data-m]').forEach(function(btn) {
                btn.onclick = async function() {
                  var m = btn.getAttribute('data-m');
                  // v7.53\uFF1A\u5355\u9879\u76EE\u5F55\u83DC\u5355\u4E0E\u591A\u9009\u5171\u7528 moreSheet(paths)\uFF0C\u64CD\u4F5C\u4E00\u5F8B\u4EE5\u663E\u5F0F paths
                  // \u4E3A\u51C6\uFF08\u591A\u9009\u8DEF\u5F84 paths \u5373 Array.from(S.sel)\uFF0C\u884C\u4E3A\u4E0D\u53D8\uFF1B\u6D4F\u89C8\u6001\u5355\u9879\u76EE\u6B64\u4FEE\u590D\uFF09
                  if (m === 'del') { closeSheet(); await deleteSelected(paths); return; }
                  if (m === 'copy' || m === 'move') {
                    closeSheet();
                    pickDir(m === 'copy' ? '\u590D\u5236\u5230\u2026' : '\u79FB\u52A8\u5230\u2026', async function(dir) {
                      var rs = await pasteInto(dir, m === 'move', paths);
                      var ok = rs.filter(function(r) { return r && r.ok; }).length;
                      snack((m === 'copy' ? '\u5DF2\u590D\u5236 ' : '\u5DF2\u79FB\u52A8 ') + ok + ' \u9879\u5230\u300C' + (dir === '/' ? '\u5185\u90E8\u5B58\u50A8' : baseName(dir)) + '\u300D');
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
                    var name = await askDialog({ title: '\u91CD\u547D\u540D', input: old });
                    if (name === null) return;
                    name = validName(name);
                    if (!name) { snack('\u540D\u79F0\u4E0D\u5408\u6CD5'); return; }
                    if (name !== old) {
                      var r = await V().move(p, parentOf(p) + '/' + name);
                      snack(r.ok ? '\u5DF2\u91CD\u547D\u540D' : (r.error || '\u91CD\u547D\u540D\u5931\u8D25'));
                    }
                    exitSel();
                    refresh();
                    return;
                  }
                  if (m === 'details') {
                    closeSheet();
                    var e = V().stat(paths[0]) || {};
                    // v10.84 #215\uFF1A\u76EE\u5F55\u8BE6\u60C5\u2014\u2014\u7C7B\u578B/\u5305\u542B\u9879\u6570\xB7\u5B57\u8282\uFF08DocumentsUI \u76EE\u5F55\u8BE6\u60C5\u540C\u6784\uFF09
                    var rows;
                    if (e.type === 'dir') {
                      var dst = dirStatOf(paths[0]) || { n: 0, bytes: 0 };
                      rows = [
                        ['\u540D\u79F0', e.name], ['\u7C7B\u578B', '\u6587\u4EF6\u5939'], ['\u5305\u542B', dst.n + ' \u9879 \xB7 ' + fmtBytes(dst.bytes)],
                        ['\u4F4D\u7F6E', parentOf(paths[0]) === '/' ? '\u5185\u90E8\u5B58\u50A8' : parentOf(paths[0])],
                        ['\u4FEE\u6539\u65F6\u95F4', fmtTime(e.modified)],
                      ];
                    } else {
                      rows = [
                        ['\u540D\u79F0', e.name], ['\u7C7B\u578B', (e.mime || '\u672A\u77E5')], ['\u5927\u5C0F', fmtBytes(e.size)],
                        ['\u4F4D\u7F6E', parentOf(paths[0]) === '/' ? '\u5185\u90E8\u5B58\u50A8' : parentOf(paths[0])],
                        ['\u4FEE\u6539\u65F6\u95F4', fmtTime(e.modified)],
                      ];
                    }
                    openSheet('<div class="fj-sh-t">\u8BE6\u60C5</div>' + rows.map(function(row) {
                      return '<div class="fj-sh-item" style="pointer-events:none;"><span style="color:var(--md-on-surface-variant);width:64px;flex:none;">' + row[0] + '</span><span style="flex:1;text-align:right;overflow:hidden;text-overflow:ellipsis;">' + esc(row[1] == null ? '\u2014' : row[1]) + '</span></div>';
                    }).join(''));
                  }
                };
              });
            }

            // ==================== \u4E0B\u8F7D\u5BFC\u51FA ====================
            function downloadFile(p) {
              V().readBlob(p).then(function(blob) {
                if (!blob) { snack('\u8BFB\u53D6\u5931\u8D25'); return; }
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = baseName(p);
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(function() { try { a.remove(); URL.revokeObjectURL(a.href); } catch (e) {} }, 3000);
                snack('\u5DF2\u5F00\u59CB\u5BFC\u51FA');
              });
            }

            // ==================== \u5206\u4EAB\uFF08\u4FE1\u606F / \u76F8\u518C / \u4FBF\u7B7E\uFF09 ====================
            function openShareSheet(path) {
              var entry = V().stat(path) || {};
              var isImg = (entry.mime || '').indexOf('image/') === 0;
              var isText = (entry.mime || '').indexOf('text/') === 0 || entry.mime === 'application/json';
              openSheet('<div class="fj-sh-t">\u5206\u4EAB\u300C' + esc(baseName(path)) + '\u300D</div>'
                + '<button class="fj-sh-item" data-share="msg">' + ic('doc') + '\u53D1\u9001\u5230 \u4FE1\u606F</button>'
                + (isImg ? '<button class="fj-sh-item" data-share="photo">' + ic('image') + '\u4FDD\u5B58\u5230 \u76F8\u518C</button>' : '')
                + (isText ? '<button class="fj-sh-item" data-share="notes">' + ic('edit') + '\u5B58\u4E3A \u4FBF\u7B7E</button>' : ''));
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
                      if (!blob) { snack('\u8BFB\u53D6\u5931\u8D25'); return; }
                      var fr = new FileReader();
                      fr.onload = function() {
                        emit('photo/captured', { id: 'fs' + Date.now(), type: 'image', src: String(fr.result), name: baseName(path), noti: { title: '\u6587\u4EF6\u5DF2\u4FDD\u5B58\u5230\u76F8\u518C', desc: baseName(path) } });
                        snack('\u5DF2\u53D1\u9001\u5230\u76F8\u518C');
                      };
                      fr.readAsDataURL(blob);
                    });
                  } else if (target === 'notes') {
                    V().readText(path).then(function(text) {
                      emit('files/share', { name: baseName(path), text: text || '', noti: { title: '\u6587\u4EF6\u5206\u4EAB\u5230\u4FBF\u7B7E', desc: baseName(path) } });
                      snack('\u5DF2\u53D1\u9001\u5230\u4FBF\u7B7E');
                    });
                  } else {
                    var isTxt = (entry.mime || '').indexOf('text/') === 0 || entry.mime === 'application/json';
                    var send = function(textPart) {
                      emit('files/share', { name: baseName(path), text: textPart, noti: { title: '\u6587\u4EF6\u5206\u4EAB\u5230\u4FE1\u606F', desc: baseName(path) } });
                      snack('\u5DF2\u53D1\u9001\u5230\u4FE1\u606F');
                    };
                    if (isTxt) V().readText(path).then(send); else send('\uFF08\u6587\u4EF6\uFF09' + baseName(path) + ' \xB7 ' + fmtBytes(entry.size || 0));
                  }
                };
              });
            }

            // ==================== \u9884\u89C8 ====================
            // v7.70\uFF1A\u9884\u89C8\u9875\u6539 Android \u5E73\u53F0\u540C\u6784\u5168\u6ED1\u8F6C\u573A\uFF08100% \u8FDB\u51FA\u573A + \u5E95\u5C42\u89C6\u5DEE\uFF09\uFF0C
            // \u5173\u95ED\u8D70 anim-out \u5EF6\u8FDF\u6458\u724C\uFF1BpvCloseSeq \u9632\u5173\u95ED\u52A8\u753B\u671F\u95F4\u91CD\u5F00\u7684\u5B9A\u65F6\u5668\u7ADE\u6001\u3002
            var pvCloseSeq = 0;
            function closePreview() {
              if (!pvEl.classList.contains('on') || pvEl.classList.contains('anim-out')) return;
              pvEl.classList.remove('media');
              pvEl.classList.add('anim-out');
              underAnimate([mainEl], true); // v7.70 \u540E\u9000\uFF1A\u4E3B\u533A\u4ECE\u5DE6\u4FA7\u89C6\u5DEE\u5F52\u4F4D
              var seq = ++pvCloseSeq;
              setTimeout(function() {
                if (seq !== pvCloseSeq) return; // \u5DF2\u88AB\u65B0\u6253\u5F00\u4F5C\u5E9F
                pvEl.classList.remove('on', 'anim-out');
                pvBody.innerHTML = '';
              }, 270);
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
              var previewText = null; // v7.69 \u6587\u672C\u9884\u89C8\u300C\u590D\u5236\u5168\u6587\u300D\u7528
              if (mime.indexOf('image/') === 0) {
                var url = await V().readURL(path);
                html = url ? '<img src="' + url + '" decoding="async" style="max-width:100%;max-height:100%;border-radius:12px;" alt="" />' : '<div style="color:var(--md-on-surface-variant);">\u56FE\u7247\u52A0\u8F7D\u5931\u8D25</div>';
              } else if (mime.indexOf('audio/') === 0) {
                var aurl = await V().readURL(path);
                html = '<div style="width:100%;text-align:center;">'
                  + '<div style="opacity:.5;margin-bottom:18px;">' + ic('audio', 'width:64px;height:64px;') + '</div>'
                  + (aurl ? '<audio src="' + aurl + '" controls style="width:100%;max-width:420px;"></audio>' : '<div style="color:var(--md-on-surface-variant);">\u97F3\u9891\u52A0\u8F7D\u5931\u8D25</div>')
                  + '</div>';
                if (aurl) attachMusicDeepLink(aurl, path);
              } else if (mime.indexOf('video/') === 0) {
                var vurl = await V().readURL(path);
                html = vurl ? '<video src="' + vurl + '" controls style="max-width:100%;max-height:100%;border-radius:12px;"></video>' : '<div style="color:var(--md-on-surface-variant);">\u89C6\u9891\u52A0\u8F7D\u5931\u8D25</div>';
              } else if (mime.indexOf('text/') === 0 || mime === 'application/json') {
                previewText = await V().readText(path);
                html = '<div style="width:100%;">'
                  + '<pre style="width:100%;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.7;color:var(--md-on-surface);margin:0;font-family:inherit;">' + esc(previewText == null ? '\uFF08\u7A7A\u6587\u4EF6\uFF09' : previewText) + '</pre>'
                  + '<div style="display:flex;justify-content:center;margin-top:14px;"><button class="fj-btn" id="fjCopyText">' + ic('copy') + '\u590D\u5236\u5168\u6587</button></div>'
                  + '</div>';
              } else {
                html = '<div style="text-align:center;color:var(--md-on-surface-variant);">'
                  + '<div style="opacity:.5;margin-bottom:14px;">' + ic('file', 'width:60px;height:60px;') + '</div>'
                  + '<div style="font-size:14px;color:var(--md-on-surface);">' + esc(entry.name) + '</div>'
                  + '<div style="font-size:12px;margin-top:4px;">' + esc(mime || '\u672A\u77E5\u7C7B\u578B') + ' \xB7 ' + fmtBytes(entry.size) + '</div>'
                  + '<div style="font-size:12px;margin-top:10px;opacity:.8;">\u6B64\u7C7B\u6587\u4EF6\u6682\u4E0D\u652F\u6301\u9884\u89C8\uFF0C\u53EF\u5BFC\u51FA\u5230\u7535\u8111\u67E5\u770B</div>'
                  + '</div>';
              }
              pvBody.innerHTML = html;
              pvEl.classList.remove('anim-out');
              pvEl.classList.toggle('media', mime.indexOf('image/') === 0 || mime.indexOf('video/') === 0);
              pvCloseSeq++; // \u4F5C\u5E9F\u5F85\u89E6\u53D1\u7684\u5173\u95ED\u6E05\u7406
              pvEl.classList.add('on');
              underAnimate([mainEl], false); // v7.70 \u524D\u8FDB\uFF1A\u4E3B\u533A\u5DE6\u79FB\u538B\u6697
              // v7.69 \u590D\u5236\u5168\u6587\uFF1A\u4F18\u5148\u7CFB\u7EDF\u526A\u8D34\u677F\uFF0C\u5931\u8D25\u56DE\u843D execCommand\uFF08\u975E\u5B89\u5168\u8BED\u5883\u517C\u5BB9\uFF09
              var cp = $('fjCopyText');
              if (cp) cp.onclick = async function() {
                var ok = false;
                try { await navigator.clipboard.writeText(previewText || ''); ok = true; } catch (e) {}
                if (!ok) {
                  try {
                    var ta = document.createElement('textarea');
                    ta.value = previewText || '';
                    document.body.appendChild(ta);
                    ta.select();
                    ok = document.execCommand('copy');
                    ta.remove();
                  } catch (e) {}
                }
                snack(ok ? '\u5DF2\u590D\u5236\u5168\u6587' : '\u590D\u5236\u5931\u8D25', ok ? 'check' : 'info');
              };
            }
            function attachMusicDeepLink(aurl, path) {
              var btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'fj-btn';
              btn.style.cssText = 'margin:18px auto 4px;display:flex;';
              btn.innerHTML = ic('audio') + '\u7528\u97F3\u4E50\u64AD\u653E';
              btn.onclick = function() {
                var msg = { type: 'BUS_EMIT', event: 'music/import', target: 'music', payload: { url: aurl, name: baseName(path), autoPlay: true, __silent: true } };
                try { window.postMessage(msg, '*'); } catch (err) {}
                try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (err) {}
                if (window.__shareSheet && typeof window.__shareSheet.openAppById === 'function') {
                  window.__shareSheet.openAppById('music');
                } else {
                  snack('\u5DF2\u6295\u9012\u5230\u97F3\u4E50\u5E94\u7528');
                }
                closePreview();
              };
              pvBody.appendChild(btn);
            }
            $('fjPvDl').onclick = function() { if (currentPreviewPath) downloadFile(currentPreviewPath); };
            $('fjPvShare').onclick = function() { if (currentPreviewPath) openShareSheet(currentPreviewPath); };

            // ==================== \u884C\u4EA4\u4E92\uFF08\u4E8B\u4EF6\u59D4\u6258\uFF09 ====================
            function contextEntries() {
              // \u5F53\u524D\u89C6\u56FE\u7684\u201C\u53EF\u89C1\u6761\u76EE\u96C6\u5408\u201D\uFF08\u591A\u9009\u4E0A\u4E0B\u6587\uFF1A\u5168\u9009\u76EE\u6807\uFF09
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
                if (selbox.closest('[data-clean]')) return; // \u6E05\u7406\u9875\u52FE\u9009\u7531\u72EC\u7ACB\u8DEF\u5F84\u5904\u7406
                toggleSel(selbox.getAttribute('data-selbox'));
                return true;
              }
              var chip = target.closest('[data-sort]');
              if (chip) {
                // v10.84 #215\uFF1A\u540C\u540D\u6392\u5E8F\u952E\u518D\u70B9\u7FFB\u8F6C\u65B9\u5411\uFF08DocumentsUI \u65B9\u5411\u5207\u6362\u8BED\u4E49\uFF09
                var sk = chip.getAttribute('data-sort');
                if (S.sort === sk) S.sortDir = S.sortDir === 'asc' ? 'desc' : 'asc';
                else S.sort = sk;
                renderBrowseList(); if (S.sub) renderSub(); return true;
              }
              var viewBtn = target.closest('[data-view]');
              if (viewBtn) { S.view = viewBtn.getAttribute('data-view'); renderBrowseList(); if (S.sub) renderSub(); return true; }
              // v7.66 \u6E05\u7406\u9875\u6C47\u603B chips \u2192 \u6EDA\u52A8\u5230\u5BF9\u5E94\u5361\u7247
              var jump = target.closest('[data-jump]');
              if (jump) {
                var cardEl = document.getElementById(jump.getAttribute('data-jump'));
                if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return true;
              }
              var catCard = target.closest('[data-cat]');
              if (catCard) { openCat(catCard.getAttribute('data-cat')); return true; }
              // v7.69 \u9762\u5305\u5C51\u8DF3\u6BB5\uFF1A\u70B9\u51FB\u7956\u5148\u6BB5\u76F4\u63A5\u6539\u5199\u5F53\u524D\u76EE\u5F55\u5E76\u91CD\u6E32\u67D3\u5B50\u9875
              var crumb = target.closest('[data-crumb]');
              if (crumb) {
                var d = crumb.getAttribute('data-crumb');
                if (d && S.sub && S.sub.kind === 'dir' && d !== S.sub.dir) { S.sub.dir = d; renderSub(); }
                return true;
              }
              var imgJump = target.closest('[data-cat-jump]');
              if (imgJump) { openCat(imgJump.getAttribute('data-cat-jump')); return true; }
              var gotoBrowse = target.closest('[data-goto-browse]');
              if (gotoBrowse) { switchTab(2); return true; }
              // v10.84 #215\uFF1A\u9996\u9875\u6700\u8FD1\u300C\u67E5\u770B\u5168\u90E8\u300D\u2192 Recents \u5B50\u9875\uFF1Brail \u5206\u7C7B/\u5185\u90E8\u5B58\u50A8\u76F4\u8FBE
              var openRecentBtn = target.closest('[data-open-recent]');
              if (openRecentBtn) { openSub({ kind: 'recent' }); return true; }
              var railCat = target.closest('[data-rail-cat]');
              if (railCat) { openCat(railCat.getAttribute('data-rail-cat')); return true; }
              var railBrowse = target.closest('[data-rail-browse]');
              if (railBrowse) { switchTab(2); return true; }
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
                  // v7.52 \u5B89\u88C5\u5305\u4EA4\u63A5\uFF1A\u538B\u7F29\u5305\u4EA4\u7ED9\u5B89\u88C5\u5668\uFF08\u5BFC\u5165 \u2192 \u81EA\u52A8\u8BC6\u522B \u2192 \u6253\u5F00\u5B89\u88C5\u5668\u786E\u8BA4\u5B89\u88C5\uFF09
                  window.__pkgInstallerAPI.openVFSFile(path).then(function (rec) {
                    if (rec && window.showSystemToast) window.showSystemToast('\u5DF2\u5BFC\u5165\u300C' + (rec.name || path) + '\u300D\uFF0C\u5230\u5B89\u88C5\u5305\u91CC\u786E\u8BA4\u5B89\u88C5');
                  }).catch(function (err) {
                    if (window.showSystemToast) window.showSystemToast('\u5B89\u88C5\u5305\u5BFC\u5165\u5931\u8D25\uFF1A' + ((err && (err.pkgErrors && err.pkgErrors[0] || err.message)) || '\u672A\u77E5\u539F\u56E0'));
                  });
                  return;
                }
                openPreview(path);
              }
            }
            function bindContainer(container) {
              if (!container) return;
              // \u70B9\u6309\uFF08\u59D4\u6258\uFF09
              container.addEventListener('click', function(e) {
                if (handleTap(e.target)) return;
                var row = e.target.closest('.fj-row,.fj-gitem');
                if (!row || !row.dataset.path) return;
                if (S.selMode) { toggleSel(row.dataset.path); return; }
                if (row.dataset.clean) {
                  // \u6E05\u7406\u9875\u52FE\u9009
                  var box = row.querySelector('.fj-selbox');
                  if (box) box.classList.toggle('on');
                  syncCleanCardBtn(row.closest('.fj-kcard'));
                  return;
                }
                handleRowOpen(row);
              });
              // \u957F\u6309\u8FDB\u5165\u591A\u9009
              var lpTimer = null, lpFired = false;
              container.addEventListener('pointerdown', function(e) {
                if (S.selMode) return;
                if (e.target.closest('[data-act],.fj-act,[data-selbox]')) return;
                var row = e.target.closest('.fj-row,.fj-gitem');
                if (!row || !row.dataset.path) return; // v10.84 #215\uFF1A\u76EE\u5F55\u957F\u6309\u540C\u6837\u8FDB\u5165\u591A\u9009\uFF08DocumentsUI \u76EE\u5F55\u53EF\u9009\u8BED\u4E49\uFF09
                var path = row.dataset.path;
                var sx = e.clientX, sy = e.clientY;
                lpFired = false;
                lpTimer = setTimeout(function() {
                  lpFired = true;
                  if (row.dataset.clean) {
                    var box = row.querySelector('.fj-selbox');
                    if (box) box.classList.add('on');
                    syncCleanCardBtn(row.closest('.fj-kcard'));
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
                // \u957F\u6309\u540E\u541E\u6389\u968F\u540E\u7684 click
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

            // ==================== \u591A\u9009\u64CD\u4F5C\u6761\u4E8B\u4EF6 ====================
            $('fjSelClose').onclick = exitSel;
            $('fjSelAll').onclick = function() {
              var all = contextEntries();
              all.forEach(function(p) { S.sel.add(p); });
              syncSelUI();
              refresh();
            };
            $('fjSelMore').onclick = function() { moreSheet(Array.from(S.sel)); };
            $('fjSelDel').onclick = function() { deleteSelected(); };
            // v10.84 #215\uFF1Aaction mode \u56DB\u952E\u8865\u5168\u2014\u2014\u5206\u4EAB/\u590D\u5236\u5230/\u79FB\u52A8\u5230\u76F4\u8FBE\uFF08DocumentsUI \u5E95\u90E8\u64CD\u4F5C\u680F\u540C\u6784\uFF09
            $('fjSelShare').onclick = function() {
              var ps = Array.from(S.sel);
              if (ps.length !== 1) return;
              exitSel();
              openShareSheet(ps[0]);
            };
            $('fjSelCopy').onclick = function() {
              var ps = Array.from(S.sel);
              if (!ps.length) return;
              pickDir('\u590D\u5236\u5230\u2026', async function(dir) {
                var rs = await pasteInto(dir, false, ps);
                var ok = rs.filter(function(r) { return r && r.ok; }).length;
                snack('\u5DF2\u590D\u5236 ' + ok + ' \u9879\u5230\u300C' + (dir === '/' ? '\u5185\u90E8\u5B58\u50A8' : baseName(dir)) + '\u300D');
                exitSel();
                refresh();
              });
            };
            $('fjSelMove').onclick = function() {
              var ps = Array.from(S.sel);
              if (!ps.length) return;
              pickDir('\u79FB\u52A8\u5230\u2026', async function(dir) {
                var rs = await pasteInto(dir, true, ps);
                var ok = rs.filter(function(r) { return r && r.ok; }).length;
                snack('\u5DF2\u79FB\u52A8 ' + ok + ' \u9879\u5230\u300C' + (dir === '/' ? '\u5185\u90E8\u5B58\u50A8' : baseName(dir)) + '\u300D');
                exitSel();
                refresh();
              });
            };

            // ==================== \u6392\u5E8F\u6309\u94AE / FAB ====================
            // v10.84 #215\uFF1A\u6392\u5E8F\u4E0E\u89C6\u56FE sheet \u5171\u7528\u5316\uFF08\u6D4F\u89C8\u9875\u6392\u5E8F\u6309\u94AE + \u5B50\u9875 \u22EE \u540C\u4E00\u5165\u53E3\uFF09\uFF0C
            // \u65B9\u5411\u5207\u6362\u8BED\u4E49\u4E0E chips \u4E00\u81F4\uFF08\u540C\u540D\u518D\u70B9\u7FFB\u8F6C\uFF09\uFF0C\u5F53\u524D\u9879\u6807\u6CE8\u65B9\u5411/\u89C6\u56FE\u6001
            function sortViewSheet() {
              var arrow = function(k) {
                if (S.sort !== k) return '';
                return '<span class="tr">' + (S.sortDir === 'asc' ? '\u2191 \u5347\u5E8F' : '\u2193 \u964D\u5E8F') + '</span>';
              };
              openSheet('<div class="fj-sh-t">\u6392\u5E8F\u4E0E\u89C6\u56FE</div>'
                + '<button class="fj-sh-item" data-s="date">' + ic('sort') + '\u6309\u6700\u8FD1\u4FEE\u6539' + arrow('date') + '</button>'
                + '<button class="fj-sh-item" data-s="name">' + ic('sort') + '\u6309\u540D\u79F0' + arrow('name') + '</button>'
                + '<button class="fj-sh-item" data-s="size">' + ic('sort') + '\u6309\u5927\u5C0F' + arrow('size') + '</button>'
                + '<button class="fj-sh-item" data-v="list">' + ic('listv') + '\u5217\u8868\u89C6\u56FE' + (S.view === 'list' ? '<span class="tr">\u5F53\u524D</span>' : '') + '</button>'
                + '<button class="fj-sh-item" data-v="grid">' + ic('gridv') + '\u7F51\u683C\u89C6\u56FE' + (S.view === 'grid' ? '<span class="tr">\u5F53\u524D</span>' : '') + '</button>');
              sheetEl.querySelectorAll('[data-s]').forEach(function(b) {
                b.onclick = function() {
                  var k = b.getAttribute('data-s');
                  if (S.sort === k) S.sortDir = S.sortDir === 'asc' ? 'desc' : 'asc';
                  else S.sort = k;
                  closeSheet(); refresh();
                };
              });
              sheetEl.querySelectorAll('[data-v]').forEach(function(b) {
                b.onclick = function() { S.view = b.getAttribute('data-v'); closeSheet(); refresh(); };
              });
            }
            $('fjBtnSort').onclick = sortViewSheet;
            $('fjSubTools').onclick = sortViewSheet;
            // v7.72 M3E SplitButton\uFF1Alead = \u4E3B\u64CD\u4F5C\uFF08\u65B0\u5EFA\u6587\u4EF6\u5939\uFF0C\u5B98\u65B9 leading button \u8BED\u4E49\uFF09\uFF1B
            // trail = \u83DC\u5355\u56FE\u6807\u6309\u94AE\uFF08\u6FC0\u6D3B spin + \u5185\u89D2\u53D8\u5F62\uFF0C\u5F39\u51FA\u5B8C\u6574\u65B0\u5EFA\u6E05\u5355\uFF09
            fabLead.onclick = function() { createDir(); };
            fabMenu.onclick = function() {
              fabMenu.classList.add('spin');
              if (fab) fab.classList.add('m3e-sb-open');
              openSheet('<div class="fj-sh-t">\u65B0\u5EFA</div>'
                + '<button class="fj-sh-item" data-n="dir"><span class="ci" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--md-outline-variant);display:grid;place-items:center;color:hsl(var(--md-h,215) 85% 70%);flex:none;">' + ic('folder', 'width:18px;height:18px;') + '</span>\u65B0\u5EFA\u6587\u4EF6\u5939</button>'
                + '<button class="fj-sh-item" data-n="txt"><span class="ci" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--md-outline-variant);display:grid;place-items:center;color:hsl(var(--md-h,215) 85% 70%);flex:none;">' + ic('doc', 'width:18px;height:18px;') + '</span>\u65B0\u5EFA\u6587\u672C\u6587\u6863</button>'
                + '<button class="fj-sh-item" data-n="import"><span class="ci" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--md-outline-variant);display:grid;place-items:center;color:hsl(var(--md-h,215) 85% 70%);flex:none;">' + ic('download', 'width:18px;height:18px;transform:rotate(180deg);') + '</span>\u4ECE\u7535\u8111\u5BFC\u5165</button>'
                + '<button class="fj-sh-item" data-n="paste" ' + (CB() && CB().has() ? '' : 'style="opacity:.45;pointer-events:none;"') + '><span class="ci" style="width:38px;height:38px;border-radius:50%;border:1.5px solid var(--md-outline-variant);display:grid;place-items:center;color:hsl(var(--md-h,215) 85% 70%);flex:none;">' + ic('copy', 'width:18px;height:18px;') + '</span>\u7C98\u8D34\u526A\u8D34\u677F\u5185\u5BB9</button>');
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
              var name = await askDialog({ title: '\u65B0\u5EFA\u6587\u4EF6\u5939', input: '\u65B0\u5EFA\u6587\u4EF6\u5939' });
              if (name === null) return;
              name = validName(name);
              if (!name) { snack('\u540D\u79F0\u4E0D\u5408\u6CD5'); return; }
              var r = await V().mkdir(currentDir() === '/' ? '/' + name : currentDir() + '/' + name);
              snack(r.ok ? '\u6587\u4EF6\u5939\u5DF2\u521B\u5EFA' : (r.error || '\u521B\u5EFA\u5931\u8D25'));
              refresh();
            }
            async function createTxt() {
              var name = await askDialog({ title: '\u65B0\u5EFA\u6587\u672C\u6587\u6863', input: '\u65B0\u5EFA\u6587\u672C.txt' });
              if (name === null) return;
              name = validName(name);
              if (!name) { snack('\u540D\u79F0\u4E0D\u5408\u6CD5'); return; }
              var r = await V().write((currentDir() === '/' ? '' : currentDir()) + '/' + name, '', { owner: 'files' });
              snack(r.ok ? '\u6587\u6863\u5DF2\u521B\u5EFA' : (r.error || '\u521B\u5EFA\u5931\u8D25'));
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
                snack((item.cut ? '\u5DF2\u79FB\u52A8 ' : '\u5DF2\u7C98\u8D34 ') + moved + ' \u9879' + (fail ? '\uFF0C\u5931\u8D25 ' + fail + ' \u9879' : ''));
              } else if (item.kind === 'image') {
                var name = item.name || ('clipboard_' + Date.now() + '.png');
                var dot2 = name.lastIndexOf('.');
                var base2 = dot2 > 0 ? name.slice(0, dot2) : name;
                var ext2 = dot2 > 0 ? name.slice(dot2) : '';
                var t2 = (dir === '/' ? '' : dir) + '/' + base2 + ext2, k = 1;
                while (V().exists(t2)) { t2 = (dir === '/' ? '' : dir) + '/' + base2 + ' (' + k + ')' + ext2; k++; }
                var r2 = await V().write(t2, item.dataUrl, { owner: 'files' });
                snack(r2.ok ? '\u56FE\u7247\u5DF2\u7C98\u8D34\u4E3A ' + base2 + ext2 : (r2.error || '\u7C98\u8D34\u5931\u8D25'));
              } else if (item.kind === 'text') {
                var tname = '\u526A\u8D34\u677F_' + new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/[s/:]+/g, '') + '.txt';
                var r3 = await V().write((dir === '/' ? '' : dir) + '/' + tname, item.text, { owner: 'files' });
                snack(r3.ok ? '\u6587\u672C\u5DF2\u7C98\u8D34\u4E3A ' + tname : (r3.error || '\u7C98\u8D34\u5931\u8D25'));
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
                  snack('\u5BFC\u5165\u5B8C\u6210\uFF1A\u6210\u529F ' + done + ' \u4E2A' + (fail ? '\uFF0C\u5931\u8D25 ' + fail + ' \u4E2A' + (lastErr ? '\uFF08' + lastErr + '\uFF09' : '') : ''), done || fail ? 'check' : 'info');
                  refresh();
                  return;
                }
                var f = files[i];
                // v7.69 \u5BFC\u5165\u8FDB\u5EA6\uFF1A\u957F\u4EFB\u52A1\u671F\u95F4 sticky snack \u5B9E\u65F6\u53CD\u9988\uFF08\u5B8C\u6210\u6001\u7531\u6536\u5C3E\u8C03\u7528\u66FF\u6362\uFF09
                // v7.72\uFF1A\u56FE\u6807\u6362 M3E \u4E03\u5F62\u52A0\u8F7D\u6307\u793A\u5668\uFF08\u5B98\u65B9 loading indicator \u77ED\u7B49\u5F85\u8BED\u4E49\uFF09
                snack('\u6B63\u5728\u5BFC\u5165 ' + (i + 1) + '/' + files.length + ' \xB7 ' + f.name, 'loader', true);
                V().write((dir === '/' ? '' : dir) + '/' + f.name, f, { owner: 'files' }).then(function(r) {
                  if (r.ok) done++; else { fail++; lastErr = r.error || ''; }
                  next(i + 1);
                });
              };
              next(0);
            });

            // ==================== Tab/\u8FD4\u56DE\u6309\u94AE/\u906E\u7F69\u4E8B\u4EF6 ====================
            navbar.querySelectorAll('.fj-nitem').forEach(function(b) {
              b.addEventListener('click', function() { switchTab(+b.dataset.tab); });
            });
            app.querySelectorAll('.fj-ritem').forEach(function(b) {
              b.addEventListener('click', function() { switchTab(+b.dataset.tab); });
            });
            $('fjSubBack').onclick = function() { closeSub(); };
            sheetWrap.addEventListener('click', function(e) { if (e.target.closest('[data-sheet-close]') || e.target === sheetWrap) closeSheet(); });

            // \u6D9F\u6F2A\uFF1Av7.66 \u8D77\u7EDF\u4E00\u8D70\u5BBF\u4E3B ripple-fx.js \u7684 M3E Expressive \u7C92\u5B50\u6D9F\u6F2A
            // \uFF08.fj-rpl / .fj-gitem \u5DF2\u5217\u5165 RIPPLE_SELECTOR\uFF1B.fj-btn/.fj-ibtn \u7B49
            // button \u5143\u7D20\u7ECF button \u515C\u5E95\u8986\u76D6\uFF09\u2014\u2014 \u65E7\u624B\u5199 fj-ink span \u6CE2\u7EB9\u9000\u5F79

            // ==================== \u5E73\u677F\u6A21\u5F0F\uFF08\u5BBD\u5BB9\u5668 \u2192 \u4FA7\u680F\uFF09 ====================
            if (window.ResizeObserver) {
              var ro = new ResizeObserver(function() {
                app.classList.toggle('fj-wide', app.clientWidth >= 620);
                renderTabs();
              });
              ro.observe(app);
            }

            // ==================== v7.28 \u9884\u89C8\u5F0F\u8FD4\u56DE\u6865\uFF08\u5BBF\u4E3B main.js \u6CE8\u518C\uFF09 ====================
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
                // v7.72 \u5E95\u5C42\u9875\u8DDF\u624B\uFF08\u5B98\u65B9 Enter \u9884\u89C8\uFF09\uFF1A\u6458\u6B8B\u7559\u8FC7\u6E21\u7C7B\u540E\u7981\u8FC7\u6E21\u9010\u5E27\u9A71\u52A8
                var scr = activeScreenEl();
                if (scr) { scr.classList.remove('fj-under-out', 'fj-under-in'); scr.style.transition = 'none'; }
                pbDrag = { el: subEl, dx: 0, scr: scr };
                subEl.style.transition = 'none';
                subEl.style.borderRadius = '';
              },
              progressGesture: function(dx) {
                if (!pbDrag) return;
                pbDrag.dx = Math.max(0, dx || 0);
                // v7.75 \u6062\u590D v7.70 \u6A2A\u6ED1\u5361\u7247\u8DDF\u624B\uFF08\u7528\u6237\u88C1\u51B3\uFF1A\u9884\u89C8\u5F0F\u8FD4\u56DE\u4FDD\u6301\u300C\u9876\u9875\u6A2A\u79FB\u8DDF\u624B +
                //   \u4E0B\u65B9\u524D\u7EA7\u538B\u6697\u300D\u89C6\u89C9\u8BED\u8A00\uFF0C\u4E0E\u5BBF\u4E3B renderSubPages \u7EDF\u4E00\uFF1Bv7.72 \u5B98\u65B9\u5C45\u4E2D\u7F29\u653E
                //   \u6DE1\u6362\u9000\u5F79\uFF09\u3002\u9876\u9875 1:1 \u6A2A\u79FB\u8DDF\u624B\uFF1B\u5E95\u5C42\u9875 -28% \u6BD4\u4F8B\u8DDF\u624B\u5DE6\u79FB + \u540C\u6B65\u538B\u6697
                //   \uFF08predictive back \u540C\u6784\uFF0C\u4EAE\u5EA6\u94B3 0.62\uFF09\u3002
                var p = Math.min(1, pbDrag.dx / (window.innerWidth * 0.5));
                pbDrag.el.style.transform = 'translateX(' + pbDrag.dx.toFixed(1) + 'px)';
                if (pbDrag.scr) {
                  pbDrag.scr.style.transform = 'translateX(' + (-pbDrag.dx * 0.28) + 'px)';
                  pbDrag.scr.style.filter = 'brightness(' + Math.max(0.62, 1 - p * 0.38).toFixed(3) + ')';
                }
              },
              endGesture: function(commit) {
                if (!pbDrag) return;
                var el = pbDrag.el;
                var scr = pbDrag.scr;
                pbDrag = null;
                var ECB = 'cubic-bezier(0.1, 0.1, 0, 1)'; // \u5B98\u65B9 SystemUI \u540C\u6B3E\u63D2\u503C\u5668
                el.style.transition = 'transform 0.3s ' + ECB + ', border-radius 0.3s ' + ECB;
                if (scr) scr.style.transition = 'transform 0.3s ' + ECB + ', filter 0.3s ' + ECB;
                if (commit && (S.sub != null)) {
                  // v7.75 \u6062\u590D v7.70 \u63D0\u4EA4\u8BED\u4E49\uFF1A\u9876\u9875\u5168\u6ED1\u51FA\u573A\uFF08translateX 100%\uFF09\uFF1B
                  // \u5E95\u5C42\u9875\u7531 fjUnderIn \u89C6\u5DEE\u5F52\u4F4D\u901A\u9053\u63A5\u7BA1\uFF08-24% \u2192 0 \u56DE\u4EAE\uFF09
                  el.style.transform = 'translateX(100%)'; // v7.70 \u5168\u6ED1\u51FA\u573A
                  var keepSub = S.sub;
                  S.sub = null;
                  exitSel();
                  underAnimate([scr], true); // \u5E95\u5C42\u9875\u89C6\u5DEE\u5F52\u4F4D + \u56DE\u4EAE
                  setTimeout(function() {
                    el.classList.remove('on');
                    el.style.transform = '';
                    el.style.transition = '';
                    if (scr) {
                      scr.style.transition = '';
                      scr.style.transform = '';
                      scr.style.filter = '';
                    }
                    void keepSub;
                  }, 310);
                } else {
                  // \u53D6\u6D88\uFF1A\u9876\u9875\u5F39\u56DE\u5168\u5C4F\u5168\u663E\uFF1B\u5E95\u5C42\u9875\u6E05 inline \u6062\u590D\u88AB\u8986\u76D6\u539F\u4F4D\uFF08\u5F39\u56DE\u5F52\u4F4D\uFF09
                  el.style.transform = '';
                  el.style.transition = '';
                  if (scr) {
                    scr.style.transition = '';
                    scr.style.transform = '';
                    scr.style.filter = '';
                  }
                }
              },
            };

            // ==================== VFS / \u526A\u8D34\u677F\u8BA2\u9605 + \u9875\u9762\u6FC0\u6D3B ====================
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
                syncScreens();
                renderTabs();
                renderAll();
                if (S.sub) renderSub();
              }
            });

            // \u9996\u6B21\u8FDB\u5165
            S.visible = true;
            renderTabs();
            renderAll();
          })();
        <\/script>
      `}]};
