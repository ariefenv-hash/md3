import"../installer-core.js";const e=`
<div class="pkg-app" id="pkgApp">
  <div class="pkg-topbar">
    <div class="pkg-title-row">
      <span class="pkg-title-icon" id="pkgTitleIcon"></span>
      <div class="pkg-title-wrap">
        <h2 class="pkg-title">\u5B89\u88C5\u5305</h2>
        <div class="pkg-sub" id="pkgSubLine">\u5BFC\u5165\u538B\u7F29\u5305 \xB7 \u81EA\u52A8\u8BC6\u522B\u56FE\u6807\u4E0E\u540D\u79F0 \xB7 \u6743\u9650\u900F\u660E\u5B89\u88C5</div>
      </div>
      <button class="pkg-help-btn" id="pkgHelpBtn" aria-label="\u914D\u7F6E\u8BB2\u89E3\u4E0E AI \u63D0\u793A\u8BCD" title="\u914D\u7F6E\u8BB2\u89E3\u4E0E AI \u63D0\u793A\u8BCD">?</button>
      <button class="pkg-import-pill" id="pkgImportTop">\u5BFC\u5165</button>
    </div>
    <div class="m3e-btngroup pkg-tabs" role="tablist" aria-label="\u5B89\u88C5\u5305\u5206\u7C7B">
      <button class="m3e-bg-seg pkg-tab on" data-t="pending" role="tab">\u5F85\u5B89\u88C5<span class="pkg-tab-n" id="pkgNPending"></span></button>
      <button class="m3e-bg-seg pkg-tab" data-t="installed" role="tab">\u5DF2\u5B89\u88C5<span class="pkg-tab-n" id="pkgNInstalled"></span></button>
    </div>
  </div>

  <div class="pkg-body" id="pkgList"></div>

  <button class="pkg-fab" id="pkgImportFab" aria-label="\u5BFC\u5165\u538B\u7F29\u5305">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/></svg>
    <span>\u5BFC\u5165\u538B\u7F29\u5305</span>
  </button>

  <input type="file" id="pkgFileInput" multiple accept=".zip,.mdapp,application/zip,application/x-zip-compressed" style="display:none" />

  <div class="pkg-snack" id="pkgSnack" role="status"></div>

  <div class="pkg-sheet-overlay" id="pkgSheetOverlay">
    <div class="pkg-sheet" role="dialog" aria-modal="true" aria-label="\u5B89\u88C5\u786E\u8BA4" id="pkgSheet"></div>
  </div>

  <div class="pkg-sheet-overlay" id="pkgConfirmOverlay">
    <div class="pkg-confirm-card" role="alertdialog" aria-modal="true" id="pkgConfirm"></div>
  </div>

  <div class="pkg-sheet-overlay pkg-help-overlay" id="pkgHelpOverlay">
    <div class="pkg-help-card" role="dialog" aria-modal="true" aria-label="\u5B89\u88C5\u5305\u914D\u7F6E\u8BB2\u89E3" id="pkgHelpCard">
      <div class="pkg-help-head">
        <div>
          <div class="pkg-help-title">\u914D\u7F6E\u8BB2\u89E3</div>
          <div class="pkg-help-sub">\u5305\u89C4\u8303 \xB7 \u7CFB\u7EDF\u80FD\u529B \xB7 \u4E00\u952E\u4EA4\u7ED9 AI</div>
        </div>
        <button class="pkg-btn ghost" data-help-close>\u5173\u95ED</button>
      </div>
      <div class="pkg-help-body">
        <div class="pkg-help-sec">\u2460 \u8FD9\u662F\u4EC0\u4E48</div>
        <p class="pkg-help-p">\u672C\u9875\u628A\u7F51\u9875\u5E94\u7528\u6253\u5305\u6210\u538B\u7F29\u5305\uFF08.zip / .mdapp\uFF09\u5B89\u88C5\u8FDB\u7CFB\u7EDF\uFF1A\u5BFC\u5165\u540E\u81EA\u52A8\u8BC6\u522B\u540D\u79F0\u4E0E\u56FE\u6807\uFF0C\u6743\u9650\u900F\u660E\u53EF\u67E5\uFF0C\u5B89\u88C5\u540E\u56FE\u6807\u51FA\u73B0\u5728\u684C\u9762\uFF0C\u6C99\u7BB1\u9694\u79BB\u8FD0\u884C\uFF0C\u79BB\u7EBF\u53EF\u7528\u3002</p>

        <div class="pkg-help-sec">\u2461 \u5305\u7ED3\u6784</div>
        <pre class="pkg-help-pre">myapp.mdapp (zip)
\u251C\u2500 manifest.json   \u6E05\u5355\uFF08\u5FC5\u987B\uFF0Czip \u6839\u76EE\u5F55\uFF09
\u251C\u2500 index.html      \u5165\u53E3\uFF08\u7F3A\u7701\u5165\u53E3\u540D\uFF09
\u251C\u2500 icon.svg        \u56FE\u6807\uFF08manifest.icon \u6307\u5411\uFF09
\u2514\u2500 ...\u5176\u4F59\u8D44\u6E90\u6309\u76F8\u5BF9\u8DEF\u5F84\u5F15\u7528</pre>

        <div class="pkg-help-sec">\u2462 manifest.json \u5B57\u6BB5</div>
        <div class="pkg-help-row"><b>id</b><span>\u5FC5\u586B \xB7 \u5C0F\u5199\u5B57\u6BCD\u5F00\u5934\uFF0C\u4EC5 a-z 0-9 . _ -\uFF0C2\uFF5E40 \u4F4D\uFF0C\u7981\u8FDE\u7EED\u70B9\uFF08..\uFF09\u3002\u5B89\u88C5\u540E\u7CFB\u7EDF id \u4E3A pkg-&lt;id&gt;</span></div>
        <div class="pkg-help-row"><b>name</b><span>\u53EF\u9009 \xB7 \u226424 \u5B57\u7B26\u3002\u7F3A\u7701\u81EA\u52A8\u8BC6\u522B\uFF1A\u5165\u53E3\u9875 &lt;title&gt; \u2192 \u538B\u7F29\u5305\u6587\u4EF6\u540D</span></div>
        <div class="pkg-help-row"><b>version</b><span>\u53EF\u9009 \xB7 \u4EC5 0-9 A-Z a-z . -\uFF0C\u226420 \u4F4D\u3002\u7F3A\u7701 1.0.0</span></div>
        <div class="pkg-help-row"><b>entry</b><span>\u53EF\u9009 \xB7 \u5305\u5185\u771F\u5B9E\u5B58\u5728\u7684\u76F8\u5BF9\u8DEF\u5F84\uFF0C\u7F3A\u7701 index.html\u3002\u7981\u7EDD\u5BF9\u8DEF\u5F84\u4E0E .. \u7A7F\u8D8A</span></div>
        <div class="pkg-help-row"><b>icon</b><span>\u53EF\u9009 \xB7 png/jpg/jpeg/gif/webp/avif/ico/bmp/svg\uFF0C\u2264512KB\u3002\u7F3A\u7701\u56DE\u9000 favicon \u2192 \u7CFB\u7EDF\u9ED8\u8BA4\u56FE\u6807</span></div>
        <div class="pkg-help-row"><b>author</b><span>\u53EF\u9009 \xB7 \u226440 \u5B57\u7B26</span></div>
        <div class="pkg-help-row"><b>description</b><span>\u53EF\u9009 \xB7 \u2264120 \u5B57\u7B26</span></div>
        <div class="pkg-help-row"><b>permissions</b><span>\u53EF\u9009 \xB7 \u5B57\u7B26\u4E32\u6570\u7EC4\uFF0C\u767D\u540D\u5355\u4EC5\uFF1Acamera / microphone / location / notifications / clipboard\u3002\u672A\u77E5\u9879\u81EA\u52A8\u5FFD\u7565</span></div>

        <div class="pkg-help-sec">\u2463 \u4F53\u91CF\u4E0E\u6587\u4EF6\u767D\u540D\u5355</div>
        <div class="pkg-help-row"><b>\u4F53\u91CF</b><span>\u538B\u7F29\u5305 \u226430MB \xB7 \u89E3\u538B\u603B\u91CF \u226440MB \xB7 \u5355\u6587\u4EF6 \u226425MB \xB7 \u6761\u76EE \u2264800</span></div>
        <div class="pkg-help-row"><b>\u6269\u5C55\u540D</b><span>html htm css js mjs json txt md xml csv map svg png jpg jpeg gif webp avif ico bmp woff woff2 ttf otf wav mp3 ogg m4a flac mp4 webm mov wasm\uFF08\u767D\u540D\u5355\u4E4B\u5916\u62D2\u7EDD\u5B89\u88C5\uFF09</span></div>
        <div class="pkg-help-row"><b>\u8DEF\u5F84\u5B89\u5168</b><span>\u7981\u7EDD\u5BF9\u8DEF\u5F84 / .. \u7A7F\u8D8A / NUL / Windows \u76D8\u7B26\uFF1B\u53CD\u659C\u6760\u81EA\u52A8\u5F52\u4E00</span></div>

        <div class="pkg-help-sec">\u2464 \u8FD0\u884C\u73AF\u5883\u4E0E\u7CFB\u7EDF\u80FD\u529B\uFF08SDK\uFF09</div>
        <p class="pkg-help-p">\u5E94\u7528\u8FD0\u884C\u5728\u6C99\u7BB1 iframe\uFF08opaque origin\uFF09\uFF1AlocalStorage \u4E0D\u53EF\u7528\uFF0C\u6301\u4E45\u5316\u7EDF\u4E00\u8D70 <code>window.__system.fs</code>\u3002\u7CFB\u7EDF\u81EA\u52A8\u6CE8\u5165 SDK\uFF0C\u65E0\u9700\u81EA\u884C\u5F15\u5165\u3002\u53EF\u7528\u80FD\u529B\uFF1A</p>
        <div class="pkg-help-row"><b>\u4E8B\u4EF6</b><span>__system.emit(event, payload, target?) / broadcast(event, payload)</span></div>
        <div class="pkg-help-row"><b>\u8DF3\u8F6C</b><span>__system.openApp(appId, { event, payload })</span></div>
        <div class="pkg-help-row"><b>\u5206\u4EAB</b><span>__system.share({ title, text, url })</span></div>
        <div class="pkg-help-row"><b>\u901A\u77E5</b><span>__system.notify({ title, body })</span></div>
        <div class="pkg-help-row"><b>\u6743\u9650</b><span>__system.requestPermission(name) \u2192 Promise&lt;boolean&gt;</span></div>
        <div class="pkg-help-row"><b>\u6587\u4EF6</b><span>__system.fs.write / read / list / del / mkdir / exists / url\uFF08\u5168\u90E8\u8FD4\u56DE Promise\uFF09</span></div>
        <div class="pkg-help-row"><b>\u526A\u8D34\u677F</b><span>__system.clipboard.write(payload) / read()</span></div>
        <div class="pkg-help-row"><b>\u4E3B\u9898</b><span>CSS \u53D8\u91CF --md-h \u81EA\u52A8\u540C\u6B65\u4E3B\u9898\u8272\uFF0C\u76F4\u63A5\u5199 hsl(var(--md-h, 215) ...) \u5373\u53EF\u8DDF\u968F\u7CFB\u7EDF</span></div>
        <div class="pkg-help-row"><b>\u624B\u52BF</b><span>\u5E95\u90E8 68px \u4E0E\u5DE6\u53F3\u8FB9\u7F18 36px \u5F52\u7CFB\u7EDF\u624B\u52BF\uFF0C\u52FF\u653E\u5173\u952E\u4EA4\u4E92</span></div>

        <div class="pkg-help-sec">\u2465 \u4E00\u952E\u4EA4\u7ED9 AI \u7684\u63D0\u793A\u8BCD</div>
        <p class="pkg-help-p">\u590D\u5236\u4E0B\u65B9\u5168\u90E8\u5185\u5BB9\u53D1\u7ED9\u4EFB\u610F AI \u52A9\u624B\uFF08\u4EC5\u8BFB\u8FD9\u4E00\u6BB5\u5373\u53EF\uFF09\uFF0C\u5B83\u5C31\u80FD\u4E00\u6B21\u6027\u4EA7\u51FA\u53EF\u76F4\u63A5\u5B89\u88C5\u7684\u5408\u89C4\u5B89\u88C5\u5305\uFF1A</p>
        <button class="pkg-btn primary pkg-help-copy" id="pkgHelpCopy">\u590D\u5236\u63D0\u793A\u8BCD\u5168\u6587</button>
        <pre class="pkg-help-pre pkg-help-prompt" id="pkgAIPrompt">\u4F60\u662F\u300Cmd3 \u5B89\u88C5\u5305\u300D\u6784\u5EFA\u5668\u3002\u8BF7\u4E3A Material Design 3 \u98CE\u683C\u79FB\u52A8\u7AEF Web \u684C\u9762\uFF08md3\uFF09\u751F\u6210\u4E00\u4E2A\u53EF\u76F4\u63A5\u5B89\u88C5\u7684 .zip \u5B89\u88C5\u5305\uFF08\u6269\u5C55\u540D .mdapp \u4EA6\u53EF\uFF09\u3002\u53EA\u8F93\u51FA\u5236\u4F5C\u7ED3\u679C\uFF0C\u4E0D\u8F93\u51FA\u591A\u4F59\u89E3\u91CA\u3002

\u3010\u5305\u7ED3\u6784\u3011
- manifest.json\uFF08\u5FC5\u987B\uFF0Czip \u6839\u76EE\u5F55\uFF09
- index.html\uFF08\u5165\u53E3\uFF0Czip \u6839\u76EE\u5F55\uFF1B\u9664\u975E manifest.entry \u53E6\u6307\u5B9A\uFF09
- \u5176\u4F59\u8D44\u6E90\u6309\u76F8\u5BF9\u8DEF\u5F84\u5F15\u7528\uFF0C\u5168\u90E8\u6253\u8FDB zip

\u3010manifest.json \u89C4\u8303\u3011
{ "id": "com.example.myapp", "name": "\u6211\u7684\u5E94\u7528", "version": "1.0.0", "entry": "index.html", "icon": "icon.svg", "author": "\u4F5C\u8005\u540D", "description": "\u4E00\u53E5\u8BDD\u7B80\u4ECB\uFF08\u2264120\u5B57\uFF09", "permissions": ["notifications"] }
\u5B57\u6BB5\u7EA6\u675F\uFF1A
- id \u5FC5\u586B\uFF1A\u5C0F\u5199\u5B57\u6BCD\u5F00\u5934\uFF0C\u4EC5 a-z 0-9 . _ -\uFF0C2\uFF5E40 \u4F4D\uFF0C\u7981\u6B62\u8FDE\u7EED\u70B9\uFF08..\uFF09\uFF1B\u5B89\u88C5\u540E\u7CFB\u7EDF id \u4E3A pkg-&lt;id&gt;
- name \u53EF\u9009 \u226424 \u5B57\u7B26\uFF1B\u7F3A\u7701\u65F6\u4F9D\u6B21\u56DE\u9000\uFF1A\u5165\u53E3\u9875 &lt;title&gt; \u2192 zip \u6587\u4EF6\u540D
- version \u53EF\u9009\uFF0C\u4EC5 0-9 A-Z a-z . -\uFF0C\u226420 \u4F4D\uFF0C\u7F3A\u7701 1.0.0
- entry \u53EF\u9009\uFF0C\u5305\u5185\u771F\u5B9E\u5B58\u5728\u7684\u76F8\u5BF9\u8DEF\u5F84\uFF1B\u7F3A\u7701 index.html\uFF1B\u7981\u6B62\u7EDD\u5BF9\u8DEF\u5F84\u4E0E .. \u7A7F\u8D8A
- icon \u53EF\u9009\uFF1Apng/jpg/jpeg/gif/webp/avif/ico/bmp/svg\uFF0C\u2264512KB\uFF1B\u7F3A\u7701\u56DE\u9000 favicon \u2192 \u7CFB\u7EDF\u9ED8\u8BA4\u56FE\u6807\uFF1Bsvg \u4F1A\u88AB\u51C0\u5316\uFF08\u5265 script / on* / \u5916\u94FE\uFF09
- permissions \u53EF\u9009\u6570\u7EC4\uFF0C\u767D\u540D\u5355\u4EC5\uFF1Acamera, microphone, location, notifications, clipboard\uFF1B\u672A\u77E5\u6743\u9650\u81EA\u52A8\u5FFD\u7565

\u3010\u786C\u9650\u5236\u3011
zip \u226430MB\uFF1B\u89E3\u538B\u603B\u91CF \u226440MB\uFF1B\u5355\u6587\u4EF6 \u226425MB\uFF1B\u6761\u76EE \u2264800\uFF1B\u6587\u4EF6\u6269\u5C55\u540D\u5FC5\u987B\u5728\u767D\u540D\u5355\u5185\uFF1Ahtml htm css js mjs json txt md xml csv map svg png jpg jpeg gif webp avif ico bmp woff woff2 ttf otf wav mp3 ogg m4a flac mp4 webm mov wasm

\u3010\u8FD0\u884C\u73AF\u5883\uFF08\u5199\u4EE3\u7801\u65F6\u5FC5\u987B\u9075\u5B88\uFF09\u3011
- \u9875\u9762\u8FD0\u884C\u5728\u6C99\u7BB1 iframe\uFF08opaque origin\uFF09\uFF1A\u7981\u6B62\u4F9D\u8D56 localStorage / sessionStorage\uFF08\u4F1A\u629B SecurityError\uFF09\uFF1B\u6301\u4E45\u5316\u7EDF\u4E00\u7528 window.__system.fs
- \u7CFB\u7EDF\u5DF2\u5728\u9875\u9762\u6CE8\u5165 SDK\uFF08pkg-sdk.js\uFF09\uFF0C\u76F4\u63A5\u4F7F\u7528 window.__system\uFF0C\u65E0\u9700\u81EA\u884C\u5F15\u5165
- __system \u53EF\u7528 API\uFF1A
  \xB7 emit(event, payload, target?) / broadcast(event, payload)\uFF1A\u8DE8\u5E94\u7528\u4E8B\u4EF6
  \xB7 share({...})\uFF1A\u8C03\u8D77\u7CFB\u7EDF\u5206\u4EAB\u9762\u677F
  \xB7 openApp(appId, { event, payload })\uFF1A\u8DF3\u8F6C\u5176\u4ED6\u5E94\u7528
  \xB7 notify({ title, body })\uFF1A\u7CFB\u7EDF\u901A\u77E5
  \xB7 requestPermission(name)\uFF1A\u7533\u8BF7 manifest \u58F0\u660E\u8FC7\u7684\u6743\u9650\uFF0C\u8FD4\u56DE Promise&lt;boolean&gt;
  \xB7 fs.write(path, data, { mime? }) / fs.read(path) / fs.list(path) / fs.del(path) / fs.mkdir(path) / fs.exists(path) / fs.url(path)\uFF1A\u865A\u62DF\u6587\u4EF6\u7CFB\u7EDF\uFF0C\u5168\u90E8\u8FD4\u56DE Promise
  \xB7 clipboard.write(payload) / clipboard.read()\uFF1A\u5168\u5C40\u526A\u8D34\u677F
- \u4E3B\u9898\u81EA\u52A8\u540C\u6B65\uFF1ACSS \u53D8\u91CF --md-h\uFF08\u4E3B\u9898\u8272 hue\uFF09\u5DF2\u6CE8\u5165\uFF0C\u7528 hsl(var(--md-h, 215) ...) \u8BA9\u5E94\u7528\u8DDF\u968F\u7CFB\u7EDF\u4E3B\u9898\u8272
- \u5E95\u90E8 68px \u4E0E\u5DE6\u53F3 36px \u8FB9\u7F18\u662F\u7CFB\u7EDF\u624B\u52BF\u533A\uFF0C\u4E0D\u8981\u5728\u8FD9\u4E9B\u533A\u57DF\u653E\u5173\u952E\u4EA4\u4E92
- \u79FB\u52A8\u7AEF\u7AD6\u5C4F\u4F18\u5148\uFF0CMaterial Design 3 \u89C6\u89C9\u8BED\u8A00\uFF08\u5927\u5706\u89D2\u3001tonal \u8272\u3001\u52A8\u6001\u8272\uFF09

\u3010\u8D28\u91CF\u8981\u6C42\u3011
- \u5355\u9875\u81EA\u5305\u542B\u4F18\u5148\uFF1ACSS/JS \u5185\u8054\u6216\u76F8\u5BF9\u8DEF\u5F84\u5F15\u7528\u5305\u5185\u6587\u4EF6\uFF1B\u4E0D\u5F15\u7528\u4EFB\u4F55\u5916\u7F51\u8D44\u6E90\uFF08\u5FC5\u987B\u79BB\u7EBF\u53EF\u7528\uFF09
- \u6240\u6709\u4EA4\u4E92\u771F\u5B9E\u53EF\u7528\uFF0C\u4E0D\u505A\u5047\u6309\u94AE\uFF1B\u5B57\u4F53 \u226514px\uFF0C\u70B9\u51FB\u76EE\u6807 \u226544px

\u3010\u8F93\u51FA\u8981\u6C42\u3011
1. \u5B8C\u6574\u5217\u51FA zip \u5185\u6BCF\u4E2A\u6587\u4EF6\u7684\u6700\u7EC8\u5185\u5BB9\uFF08\u6587\u4EF6\u540D + \u5168\u6587\uFF09
2. manifest.json \u5FC5\u987B\u4E25\u683C\u7B26\u5408\u4E0A\u8FF0\u89C4\u8303
3. \u6700\u540E\u7ED9\u51FA\u6253\u5305\u547D\u4EE4\uFF08zip -r myapp.mdapp .\uFF09\u4E0E\u5BFC\u5165\u5B89\u88C5\u6B65\u9AA4</pre>
      </div>
    </div>
  </div>
</div>

<script>
(function(){
  'use strict';
  var root = document.getElementById('pkgApp');
  if (!root) return;
  // fix(v7.60)\uFF1A\u5B9E\u4F8B\u7EA7 boot \u5B88\u536B \u2014\u2014 \u65E7\u5B9E\u73B0\u7528 window \u7EA7\u5168\u5C40 boot \u6807\u5FD7\uFF1A
  // \u5B9E\u4F8B\u9500\u6BC1\uFF08\u591A\u4EFB\u52A1\u5212\u6389 / \u5C0F\u7A97\u5173\u95ED / \u5206\u5C4F / \u4E00\u952E\u6E05\u7406\uFF09\u540E\u91CD\u5F00\u65F6 DOM \u91CD\u5EFA\u3001\u5185\u8054\u811A\u672C
  // \u91CD\u8DD1\uFF0C\u5374\u88AB\u5168\u5C40\u6807\u5FD7\u62E6\u4F4F \u2192 \u65B0 DOM \u96F6\u76D1\u542C\u96F6\u6E32\u67D3\uFF0C\u8868\u73B0\u4E3A\u300C\u5B89\u88C5\u5305\u6B7B\u6389\u6CA1\u53CD\u5E94\u300D\uFF0C
  // \u53EA\u6709\u6574\u9875\u5237\u65B0\u624D\u80FD\u6551\u56DE\u3002\u6539\u4E3A\u6302\u5728 root \u5143\u7D20\u4E0A\u7684\u5B9E\u4F8B\u7EA7\u5B88\u536B\uFF1A\u6BCF\u4E2A\u65B0 DOM \u53EA\u5F15\u5BFC\u4E00\u6B21\uFF0C
  // \u91CD\u5EFA\u540E\u6B63\u5E38\u91CD\u8DD1\u3002
  if (root.__pkgBooted) return;
  root.__pkgBooted = true;

  var api = window.__pkgInstallerAPI || null;
  // v11.50 #286 \u7EED\uFF1A\u7EAF\u51FD\u6570\u6838\u6865\uFF08installer-core.js \u526F\u4F5C\u7528\u5BFC\u5165\u6CE8\u518C\uFF0Crecorder __rc \u4E94\u59D4\u6258\u884C\u540C\u5F8B\uFF09
  var __ic = window.__installerCore || {};

  var S = { tab: 'pending', pending: [], installed: [], busy: false, sheetKey: null };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;');
  }

  // v11.50 #286 \u7EED\uFF1AfmtSize \u4E09\u6863\u5B57\u8282\u683C\u5F0F\u5316\u672C\u4F53\u9000\u5F79\u4E0A\u79FB installer-core.js\uFF08\u771F\u8EAB\u5355\u6E90\uFF09\uFF0C\u59D4\u6258\u884C\u7B49\u503C
  //   \u6362\u7B97\uFF08recorder __rc \u4E94\u59D4\u6258\u884C\u540C\u5F8B\uFF1Bnull/undefined \u2192 '' \u7A7A\u4E32\u5360\u4F4D\u8BED\u4E49\u9010\u5B57\u4FDD\u7559\uFF09\u3002
  var fmtSize = __ic.fmtSize;

  // [v7.73] snack \u652F\u6301 loader \u53D8\u4F53\uFF1Aopts.loader \u65F6\u6302 M3E LoadingIndicator\uFF08\u4E03\u5F62\u5F62\u53D8\uFF09\uFF0C
  // \u7ECF window.__m3eLoader \u6865\uFF08files \u5BFC\u5165 snack \u540C\u6B3E\uFF09\uFF1B\u540E\u7EED\u7EAF\u6587\u672C snack \u8986\u76D6 innerHTML
  // \u65F6\u6307\u793A\u5668\u968F\u8282\u70B9\u8131\u6587\u6863\u81EA\u56DE\u6536\uFF08m3e.js frame \u7684 isConnected \u5B88\u536B\uFF09
  function snack(msg, opts) {
    var el = $('pkgSnack');
    if (!el) return;
    if (opts && opts.loader && window.__m3eLoader) {
      el.innerHTML = '<span class="pkg-snack-loader"><span class="pkg-snack-loader-ic"></span><span class="pkg-snack-loader-tx"></span></span>';
      var box = el.querySelector('.pkg-snack-loader-ic');
      var tx = el.querySelector('.pkg-snack-loader-tx');
      if (tx) tx.textContent = msg;
      if (box) window.__m3eLoader.mount(box, { size: 15 });
    } else {
      el.textContent = msg;
    }
    el.classList.toggle('pkg-snack-load', !!(opts && opts.loader));
    el.classList.add('on');
    clearTimeout(el.__t);
    el.__t = setTimeout(function() { el.classList.remove('on'); }, 2800);
  }

  // v11.50 #286 \u7EED\uFF1AFALLBACK_ICON \u56DE\u9000\u56FE\u6807\u5E38\u91CF\u4E0A\u79FB installer-core.js\uFF08\u771F\u8EAB\u5355\u6E90\uFF09\uFF0C\u59D4\u6258\u884C\u7B49\u503C\u6362\u7B97\u3002
  var FALLBACK_ICON = __ic.FALLBACK_ICON;

  // v11.50 #286 \u7EED\uFF1AiconBox \u56FE\u6807\u76D2\u56DE\u9000\u9009\u62E9\u672C\u4F53\u9000\u5F79\u4E0A\u79FB installer-core.js\uFF08\u771F\u8EAB\u5355\u6E90\uFF09\uFF0C\u59D4\u6258\u884C\u7B49\u503C\u6362\u7B97\u3002
  var iconBox = __ic.iconBox;

  // v11.50 #286 \u7EED\uFF1ApermIconSVG \u6743\u9650\u76FE\u5F62\u5E38\u91CF\u5951\u7EA6\u672C\u4F53\u9000\u5F79\u4E0A\u79FB installer-core.js\uFF08\u771F\u8EAB\u5355\u6E90\uFF09\uFF0C\u59D4\u6258\u884C\u7B49\u503C\u6362\u7B97\u3002
  var permIconSVG = __ic.permIconSVG;

  // v11.50 #286 \u7EED\uFF1AemptyBlock \u7A7A\u6001\u5757\u7EC4\u88C5\u672C\u4F53\u9000\u5F79\u4E0A\u79FB installer-core.js\uFF08esc \u6CE8\u5165\u53C2\u6570\u5316\uFF0C
  //   calendar \u57DF isToday now \u6CE8\u5165\u53C2\u6570\u5316\u5148\u4F8B\u540C\u5F8B\uFF09\uFF0C\u4E09\u7A7A\u6001\u5E38\u91CF\u8C03\u7528\u70B9\u7B49\u503C\u6362\u7B97\u4F20\u672C\u57DF esc\u3002

  var EMPTY_PENDING = __ic.emptyBlock(esc, '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>', '\u8FD8\u6CA1\u6709\u5F85\u5B89\u88C5\u7684\u538B\u7F29\u5305', '\u70B9\u51FB\u4E0B\u65B9\u300C\u5BFC\u5165\u538B\u7F29\u5305\u300D\uFF0C\u6216\u5728\u6587\u4EF6\u7BA1\u7406\u5668\u91CC\u70B9\u5F00 zip \u5B89\u88C5\u5305');
  var EMPTY_INSTALLED = __ic.emptyBlock(esc, '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 12l2 2 4-5"/>', '\u8FD8\u6CA1\u6709\u5B89\u88C5\u4EFB\u4F55\u5E94\u7528', '\u5728\u300C\u5F85\u5B89\u88C5\u300D\u91CC\u70B9\u51FB\u538B\u7F29\u5305\u5373\u53EF\u5B89\u88C5\uFF1B\u5B89\u88C5\u540E\u56FE\u6807\u51FA\u73B0\u5728\u684C\u9762');
  var EMPTY_NOAPI = __ic.emptyBlock(esc, '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>', '\u7CFB\u7EDF\u670D\u52A1\u672A\u5C31\u7EEA', '\u5B89\u88C5\u670D\u52A1\u5C1A\u672A\u5B8C\u6210\u521D\u59CB\u5316\uFF0C\u7A0D\u540E\u91CD\u5F00\u672C\u9875\u518D\u8BD5');

  function render() {
    var ti = $('pkgTitleIcon');
    if (ti && !ti.__done) {
      ti.innerHTML = (window.__appIconProbe && window.__appIconProbe.svg('installer')) || FALLBACK_ICON;
      ti.__done = true;
    }
    var nP = $('pkgNPending'), nI = $('pkgNInstalled');
    if (nP) nP.textContent = S.pending.length ? String(S.pending.length) : '';
    if (nI) nI.textContent = S.installed.length ? String(S.installed.length) : '';
    var list = $('pkgList');
    if (!list) return;
    if (!api) { list.innerHTML = EMPTY_NOAPI; return; }
    if (S.tab === 'pending') renderPending(list); else renderInstalled(list);
  }

  function renderPending(list) {
    if (!S.pending.length) { list.innerHTML = EMPTY_PENDING; return; }
    var h = '';
    for (var i = 0; i < S.pending.length; i++) {
      var p = S.pending[i];
      var pv = p.preview || {};
      var warn = (pv.warnings && pv.warnings.length) ? '<div class="pkg-warn">\u5DF2\u81EA\u52A8\u8BC6\u522B \xB7 ' + esc(pv.warnings[0]) + '</div>' : '';
      h += '<div class="pkg-card" data-key="' + esc(p.key) + '" role="button" tabindex="0" aria-label="\u5B89\u88C5 ' + esc(pv.name || p.zipName) + '">'
        + iconBox(pv.iconHTML)
        + '<div class="pkg-card-main">'
        + '<div class="pkg-card-name">' + esc(pv.name || p.zipName) + '</div>'
        + '<div class="pkg-card-meta">' + esc(pv.version || '1.0.0') + ' \xB7 ' + fmtSize(p.size) + '</div>'
        + '<div class="pkg-card-sub">' + esc(p.zipName) + '</div>'
        + warn
        + '</div>'
        + '<div class="pkg-card-go">\u5B89\u88C5</div>'
        + '</div>';
    }
    list.innerHTML = h;
  }

  function onDesktop(appId) {
    return !!(window.__pkgDesktopRoot || document).querySelector('.app-icon[data-id="' + appId + '"]');
  }

  function renderInstalled(list) {
    if (!S.installed.length) { list.innerHTML = EMPTY_INSTALLED; return; }
    var h = '';
    for (var i = 0; i < S.installed.length; i++) {
      var r = S.installed[i];
      var desktop = onDesktop(r.appId);
      var permN = (r.permissions && r.permissions.length) ? (r.permissions.length + ' \u9879\u6743\u9650') : '\u65E0\u654F\u611F\u6743\u9650';
      h += '<div class="pkg-card static" data-appid="' + esc(r.appId) + '">'
        + iconBox(r.iconHTML)
        + '<div class="pkg-card-main">'
        + '<div class="pkg-card-name">' + esc(r.name) + '</div>'
        + '<div class="pkg-card-meta">v' + esc(r.version || '1.0.0') + ' \xB7 ' + fmtSize(r.size) + ' \xB7 ' + esc(permN) + '</div>'
        + '<div class="pkg-card-sub">' + (desktop ? '\u5DF2\u5728\u684C\u9762' : '\u5DF2\u4ECE\u684C\u9762\u79FB\u9664') + ' \xB7 \u5B89\u88C5\u4E8E ' + esc(new Date(r.installedAt || Date.now()).toLocaleDateString()) + '</div>'
        + '</div>'
        + '<div class="pkg-card-btns">'
        + (desktop ? '' : '<button class="pkg-btn ghost" data-reattach="' + esc(r.appId) + '">\u653E\u56DE\u684C\u9762</button>')
        + '<button class="pkg-btn ghost" data-open="' + esc(r.appId) + '">\u6253\u5F00</button>'
        + '<button class="pkg-btn danger" data-uninstall="' + esc(r.appId) + '">\u5378\u8F7D</button>'
        + '</div>'
        + '</div>';
    }
    list.innerHTML = h;
  }

  function refresh() {
    if (!api) { render(); return; }
    Promise.all([api.listPending(), api.listInstalled()]).then(function(rs) {
      S.pending = Array.isArray(rs[0]) ? rs[0] : [];
      S.installed = Array.isArray(rs[1]) ? rs[1] : [];
      render();
    }).catch(function() { render(); });
  }

  function closeSheet() {
    S.sheetKey = null;
    var ov = $('pkgSheetOverlay');
    if (ov) ov.classList.remove('on');
  }

  function openSheet(key) {
    var rec = null;
    for (var i = 0; i < S.pending.length; i++) if (S.pending[i].key === key) rec = S.pending[i];
    if (!rec) return;
    S.sheetKey = key;
    var pv = rec.preview || {};
    var mf = pv.manifest || {};
    var appId = mf.id ? ('pkg-' + mf.id) : '';
    var existing = null;
    for (var j = 0; j < S.installed.length; j++) if (S.installed[j].appId === appId) existing = S.installed[j];

    var meta = (api && api.permissionMeta) || {};
    var perms = pv.permissions || [];
    var permRows = '';
    if (!perms.length) {
      permRows = '<div class="pkg-perm-none">\u6B64\u5E94\u7528\u672A\u58F0\u660E\u4EFB\u4F55\u654F\u611F\u6743\u9650</div>';
    } else {
      for (var k = 0; k < perms.length; k++) {
        var m = meta[perms[k]];
        permRows += '<div class="pkg-perm-row">' + permIconSVG()
          + '<div class="pkg-perm-txt"><div class="pkg-perm-name">' + esc(m ? m.label : perms[k]) + '</div>'
          + '<div class="pkg-perm-desc">' + esc(m ? m.desc : '\u81EA\u5B9A\u4E49\u6743\u9650') + '</div></div></div>';
      }
    }

    var warns = '';
    if (pv.warnings && pv.warnings.length) {
      warns += '<div class="pkg-sheet-warns">';
      for (var w = 0; w < pv.warnings.length; w++) warns += '<div class="pkg-sheet-warn">' + esc(pv.warnings[w]) + '</div>';
      warns += '</div>';
    }

    var infoBits = '';
    if (pv.author) infoBits += '<div class="pkg-info-row"><span>\u4F5C\u8005</span><b>' + esc(pv.author) + '</b></div>';
    if (pv.description) infoBits += '<div class="pkg-info-row"><span>\u7B80\u4ECB</span><b>' + esc(pv.description) + '</b></div>';
    infoBits += '<div class="pkg-info-row"><span>\u5305\u4F53</span><b>' + esc(rec.zipName) + ' \xB7 ' + fmtSize(rec.size) + '</b></div>';

    var sheet = $('pkgSheet');
    sheet.innerHTML = '<div class="pkg-sheet-head">' + iconBox(pv.iconHTML)
      + '<div class="pkg-sheet-title"><div class="pkg-sheet-name">' + esc(pv.name || rec.zipName) + '</div>'
      + '<div class="pkg-sheet-ver">v' + esc(pv.version || '1.0.0') + (existing ? ' \xB7 \u5C06\u8986\u76D6\u5DF2\u88C5\u7684 v' + esc(existing.version || '1.0.0') : '') + '</div></div></div>'
      + '<div class="pkg-sheet-body">' + infoBits + warns
      + '<div class="pkg-perm-title">\u6743\u9650\u58F0\u660E<span>\u5B89\u88C5\u540E\u8FD0\u884C\u65F6\u4ECD\u4F1A\u9010\u9879\u8BE2\u95EE</span></div>'
      + '<div class="pkg-perm-list">' + permRows + '</div></div>'
      + '<div class="pkg-sheet-foot">'
      + '<button class="pkg-btn ghost" data-sheet-cancel>\u53D6\u6D88</button>'
      + '<button class="pkg-btn primary" data-sheet-install="' + esc(key) + '">' + (existing ? '\u8986\u76D6\u5B89\u88C5' : '\u5B89\u88C5') + '</button>'
      + '</div>';
    $('pkgSheetOverlay').classList.add('on');
  }

  function doInstall(key) {
    if (S.busy || !api) return;
    S.busy = true;
    var btn = document.querySelector('[data-sheet-install]');
    if (btn) { btn.textContent = '\u5B89\u88C5\u4E2D\u2026'; btn.setAttribute('disabled', 'true'); }
    api.installPending(key).then(function(r) {
      closeSheet();
      snack('\u5DF2\u5B89\u88C5\u300C' + r.name + '\u300D' + (r.upgraded ? '\uFF08\u8986\u76D6\u5347\u7EA7\uFF09' : '') + '\uFF0C\u56FE\u6807\u5DF2\u653E\u5230\u684C\u9762');
    }).catch(function(e) {
      snack('\u5B89\u88C5\u5931\u8D25\uFF1A' + ((e && e.message) || '\u672A\u77E5\u9519\u8BEF'));
    }).then(function() { S.busy = false; refresh(); });
  }

  function askUninstall(appId) {
    var rec = null;
    for (var i = 0; i < S.installed.length; i++) if (S.installed[i].appId === appId) rec = S.installed[i];
    if (!rec) return;
    var box = $('pkgConfirm');
    box.innerHTML = '<div class="pkg-confirm-t">\u5378\u8F7D\u300C' + esc(rec.name) + '\u300D\uFF1F</div>'
      + '<div class="pkg-confirm-s">\u5C06\u540C\u65F6\u6E05\u9664\u5B83\u7684\u6743\u9650\u8BB0\u5F55\u4E0E\u5168\u90E8\u5305\u6570\u636E\uFF0C\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002</div>'
      + '<div class="pkg-confirm-btns"><button class="pkg-btn ghost" data-confirm-cancel>\u53D6\u6D88</button>'
      + '<button class="pkg-btn danger solid" data-confirm-uninstall="' + esc(appId) + '">\u5378\u8F7D</button></div>';
    $('pkgConfirmOverlay').classList.add('on');
  }

  function closeConfirm() { var ov = $('pkgConfirmOverlay'); if (ov) ov.classList.remove('on'); }

  function doUninstall(appId) {
    if (S.busy || !api) return;
    S.busy = true;
    api.uninstallPackage(appId).then(function() {
      closeConfirm();
      snack('\u5DF2\u5378\u8F7D');
    }).catch(function(e) {
      snack('\u5378\u8F7D\u5931\u8D25\uFF1A' + ((e && e.message) || '\u672A\u77E5\u9519\u8BEF'));
    }).then(function() { S.busy = false; refresh(); });
  }

  function importFiles(files) {
    if (!api || !files || !files.length) return;
    if (S.busy) return;
    S.busy = true;
    snack('\u6B63\u5728\u89E3\u6790\u538B\u7F29\u5305\u2026', { loader: true });
    api.importFiles(files).then(function(results) {
      var ok = 0, fail = 0, firstErr = '';
      for (var i = 0; i < results.length; i++) {
        if (results[i].ok) ok++;
        else { fail++; if (!firstErr) firstErr = results[i].name + '\uFF1A' + results[i].error; }
      }
      if (ok && fail) snack('\u5BFC\u5165\u5B8C\u6210\uFF1A\u6210\u529F ' + ok + ' \u4E2A\uFF0C\u5931\u8D25 ' + fail + ' \u4E2A');
      else if (ok) snack('\u5BFC\u5165\u5B8C\u6210\uFF1A' + ok + ' \u4E2A\u538B\u7F29\u5305\u5F85\u5B89\u88C5');
      else snack('\u5BFC\u5165\u5931\u8D25\uFF1A' + firstErr);
      S.tab = 'pending';
      syncTabs();
    }).catch(function(e) {
      snack('\u5BFC\u5165\u5931\u8D25\uFF1A' + ((e && e.message) || '\u672A\u77E5\u9519\u8BEF'));
    }).then(function() { S.busy = false; refresh(); });
  }

  function syncTabs() {
    var tabs = root.querySelectorAll('.pkg-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].getAttribute('data-t') === S.tab);
  }

  // ---------- v7.57\uFF1A\u914D\u7F6E\u8BB2\u89E3 + AI \u63D0\u793A\u8BCD\uFF08\u5E2E\u52A9\u9762\u677F\uFF09 ----------
  function openHelp() {
    var ov = $('pkgHelpOverlay');
    if (ov) ov.classList.add('on');
  }

  function closeHelp() {
    var ov = $('pkgHelpOverlay');
    if (ov) ov.classList.remove('on');
  }

  function copyPrompt(btn) {
    var pre = $('pkgAIPrompt');
    if (!pre) return;
    var text = pre.textContent || '';
    var done = function() {
      if (!btn) return;
      var old = btn.getAttribute('data-old') || btn.textContent;
      btn.setAttribute('data-old', old);
      btn.textContent = '\u5DF2\u590D\u5236';
      clearTimeout(btn.__t);
      btn.__t = setTimeout(function() { btn.textContent = old; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function() { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text); done();
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (err) {}
    try { document.body.removeChild(ta); } catch (err) {}
  }

  // ---------- \u4E8B\u4EF6\uFF08\u6839\u8282\u70B9\u59D4\u6258\uFF0C\u5185\u8054\u811A\u672C\u53EA\u6267\u884C\u4E00\u6B21\uFF09 ----------
  root.addEventListener('click', function(e) {
    var t = e.target;
    if (t.closest('#pkgImportTop') || t.closest('#pkgImportFab')) { var fi = $('pkgFileInput'); if (fi) fi.click(); return; }
    var tab = t.closest('.pkg-tab');
    if (tab) { S.tab = tab.getAttribute('data-t'); syncTabs(); render(); return; }

    // v7.57\uFF1A\u5E2E\u52A9\u9762\u677F\uFF08\u914D\u7F6E\u8BB2\u89E3 + AI \u63D0\u793A\u8BCD\uFF09
    if (t.closest('#pkgHelpBtn')) { openHelp(); return; }
    if (t.closest('[data-help-close]')) { closeHelp(); return; }
    if (t.closest('#pkgHelpCopy')) { copyPrompt(t.closest('#pkgHelpCopy')); return; }
    if (t.id === 'pkgHelpOverlay') { closeHelp(); return; }

    if (t.closest('[data-sheet-cancel]')) { closeSheet(); return; }
    var inst = t.closest('[data-sheet-install]');
    if (inst) { doInstall(inst.getAttribute('data-sheet-install')); return; }
    if (t.closest('[data-confirm-cancel]')) { closeConfirm(); return; }
    var un2 = t.closest('[data-confirm-uninstall]');
    if (un2) { doUninstall(un2.getAttribute('data-confirm-uninstall')); return; }

    if (t.id === 'pkgSheetOverlay') { closeSheet(); return; }
    if (t.id === 'pkgConfirmOverlay') { closeConfirm(); return; }

    var openBtn = t.closest('[data-open]');
    if (openBtn) { api.openPkgApp(openBtn.getAttribute('data-open')).catch(function(err) { snack((err && err.message) || '\u6253\u5F00\u5931\u8D25'); }); return; }
    var reBtn = t.closest('[data-reattach]');
    if (reBtn) { api.reattachToDesktop(reBtn.getAttribute('data-reattach')).then(function() { snack('\u5DF2\u653E\u56DE\u684C\u9762'); refresh(); }).catch(function(err) { snack((err && err.message) || '\u64CD\u4F5C\u5931\u8D25'); }); return; }
    var unBtn = t.closest('[data-uninstall]');
    if (unBtn) { askUninstall(unBtn.getAttribute('data-uninstall')); return; }

    var card = t.closest('.pkg-card[data-key]');
    if (card && !t.closest('button')) { openSheet(card.getAttribute('data-key')); return; }
  });

  root.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest ? e.target.closest('.pkg-card[data-key]') : null;
    if (card) { e.preventDefault(); openSheet(card.getAttribute('data-key')); }
  });

  var fileInput = $('pkgFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      var fs = fileInput.files;
      if (fs && fs.length) importFiles(fs);
      fileInput.value = '';
    });
  }

  window.addEventListener('pkg-installer-refresh', refresh);
  // fix(v7.60)\uFF1A\u5B9E\u4F8B\u9500\u6BC1\u65F6\u9000\u8BA2 window \u7EA7 refresh \u76D1\u542C\uFF08page-stack \u6E05\u7406\u767B\u8BB0\u53E3\uFF09\uFF0C
  // \u9632\u91CD\u5EFA\u5B9E\u4F8B\u540E\u65E7\u76D1\u542C\u7D2F\u79EF\uFF08\u65E7\u76D1\u542C\u867D\u6307\u5411 document \u7EA7\u67E5\u627E\u4ECD\u53EF\u7528\uFF0C\u4F46\u6BCF\u6B21\u91CD\u5EFA\u51C0\u589E\uFF09
  if (window.__addAppCleanup) {
    window.__addAppCleanup('installer', function() {
      window.removeEventListener('pkg-installer-refresh', refresh);
    });
  }

  refresh();
})();
<\/script>
`;export default{id:"installer",name:"\u5B89\u88C5\u5305",isPkgHost:!0,pages:[{title:"\u5B89\u88C5\u5305",content:e}]};
