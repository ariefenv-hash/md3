import{iframeAppContent as a}from"../iframe-app.js";import{ICONS as o}from"../icons.js";document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;let i=!1;document.querySelectorAll("#musicImportOverlay").forEach(t=>{getComputedStyle(t).display!=="none"&&(t.style.opacity="0",setTimeout(()=>{t.style.display="none"},250),i=!0)}),i&&(e.stopImmediatePropagation(),e.preventDefault())});export default{id:"music",name:"\u97F3\u4E50",pages:[{title:"\u97F3\u4E50",content:`
        ${a("apps/music/index.html")}
        <!-- \u672C\u5730\u6587\u4EF6\u5BFC\u5165\u6D6E\u5C42 -->
        <div id="musicImportOverlay" style="position:absolute;inset:0;z-index:500;background:rgba(0,0,0,0.7);backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;opacity:0;transition:opacity 0.25s;" onclick="if(event.target===this){var s=this; s.style.opacity='0'; setTimeout(function(){s.style.display='none';},250);}">
          <div style="background:var(--md-surface-container,hsl(var(--md-h,215) 18% 12%));border-radius:24px;padding:24px;width:80%;max-width:340px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">${o.music_note}</div>
            <div style="font-size:18px;font-weight:600;color:var(--md-on-surface,#e2e2e9);margin-bottom:8px;">\u5BFC\u5165\u672C\u5730\u97F3\u4E50</div>
            <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:20px;">\u652F\u6301 MP3 / WAV / FLAC / M4A\uFF0C\u4EE5\u53CA ZIP / TAR \u97F3\u4E50\u538B\u7F29\u5305\uFF08\u542B\u5C01\u9762\xB7\u6B4C\u8BCD\uFF09</div>
            <div style="background:var(--md-primary,hsl(var(--md-h,215) 80% 25%));color:var(--md-on-primary,#fff);padding:14px;border-radius:9999px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:12px;" onclick="var p=this.closest('.app-page'); var f=p&&p.querySelector('#musicFileInput'); if(f)f.click();">\u9009\u62E9\u97F3\u4E50\u6587\u4EF6</div>
            <div style="color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;cursor:pointer;padding:8px;" onclick="var o=this.closest('.app-page'); o=o&&o.querySelector('#musicImportOverlay'); if(o){o.style.opacity='0';setTimeout(function(){o.style.display='none';},250);}">\u53D6\u6D88</div>
          </div>
        </div>
        <input type="file" id="musicFileInput" accept="audio/*,.zip,.tar,.tgz,.lrc,.txt,.jpg,.jpeg,.png,.webp" multiple style="display:none;" onchange="
          // fix(audit-E): \u5B9A\u5411\u5F53\u524D\u97F3\u4E50\u5B9E\u4F8B\u7684 iframe \u2014\u2014 \u6B64\u524D document.querySelector('iframe')
          // \u9519\u6295\u5168\u6587\u6863\u7B2C\u4E00\u4E2A iframe\uFF08\u53EF\u80FD\u662F\u5176\u5B83\u5E38\u9A7B\u5B9E\u4F8B/\u591A\u4EFB\u52A1\u9884\u89C8\uFF09\u3002\u5F53\u524D\u5B9E\u4F8B\u7684 iframe \u4E0E
          // \u672C\u8F93\u5165\u6846\u540C\u5C5E\u4E00\u4E2A .app-page\uFF08page-stack \u5B9E\u4F8B\u9875\u4E0E\u5206\u5C4F\u7A97\u683C\u9875\u5747\u6709\u8BE5\u7C7B\u540D\uFF09\uFF0C
          // \u4ECE this \u5411\u4E0A\u5C31\u8FD1\u67E5\u627E\uFF0C\u5929\u7136\u907F\u5F00\u5176\u5B83\u5B9E\u4F8B\u3002
          // v8.22 #55\u2460: \u5173\u95ED\u8DEF\u5F84\u79FB\u51FA files.length \u5206\u652F\u2014\u2014\u9009\u4E2D\u6216\u53D6\u6D88\u90FD\u5FC5\u987B\u6536\u8D77\u6D6E\u5C42\u3002
          var page = this.closest && this.closest('.app-page');
          var overlay = page ? page.querySelector('#musicImportOverlay') : null;
          if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(function(){ overlay.style.display = 'none'; }, 250);
          }
          var files = this.files;
          if (files.length > 0) {
            var iframe = page ? page.querySelector('iframe') : null;
            if (iframe && iframe.contentWindow) {
              for (var i = 0; i < files.length; i++) {
                // v8.22 #55 \u9644\u52A0\u7591\u70B9\u5B9E\u9524\uFF1A\u5185\u8054\u5904\u7406\u5668\u4F5C\u7528\u57DF\u94FE\u542B document\uFF0C\u88F8\u6807\u8BC6\u7B26 URL
                // \u89E3\u6790\u5230 document.URL\uFF08\u5B57\u7B26\u4E32\uFF09\u2192 createObjectURL \u629B TypeError\uFF0C
                // postMessage \u4ECE\u672A\u53D1\u51FA\uFF08QA\u300Conchange \u89E6\u53D1\u4F46\u66F2\u5E93\u4E0D\u5237\u65B0\u300D\u7684\u771F\u6B63\u6839\u56E0\uFF09\u2014\u2014
                // \u5FC5\u987B window.URL \u5168\u9650\u5B9A
                var url = window.URL.createObjectURL(files[i]);
                iframe.contentWindow.postMessage({ type: 'import-music', url: url, name: files[i].name }, '*');
              }
            }
          }
        " oncancel="
          // v8.22 #55\u2460: \u6587\u4EF6\u9009\u62E9\u5668\u300C\u53D6\u6D88\u300D\u8DEF\u5F84 \u2014\u2014 \u6D4F\u89C8\u5668\u6D3E\u53D1 cancel \u4E14\u4E0D\u6D3E\u53D1 change\uFF0C
          // \u5C31\u8FD1\u6536\u8D77\u672C\u5B9E\u4F8B\u6D6E\u5C42\uFF08files.length === 0 \u65F6\u65E7\u5B9E\u73B0\u6C38\u4E45\u6EDE\u7559\u5361\u6B7B\u7684\u6839\u6CBB\u8DEF\u5F84\uFF09\u3002
          var page = this.closest && this.closest('.app-page');
          var overlay = page ? page.querySelector('#musicImportOverlay') : null;
          if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(function(){ overlay.style.display = 'none'; }, 250);
          }
        ">
      `}]};
