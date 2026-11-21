import{ICONS as o}from"../icons.js";window.__mailFabMenu=function(t){var i=t.closest(".app-page")||document,e=t.closest(".m3e-splitbtn"),a=i.querySelector(".mail-fab-menu");if(!(!a||!e)){var n=a.style.display!=="none";a.style.display=n?"none":"block",e.classList.toggle("m3e-sb-open",!n)}},window.__mailFabClose=function(t){var i=(t||document).querySelector(".mail-fab-menu"),e=(t||document).querySelector(".m3e-splitbtn");i&&(i.style.display="none"),e&&e.classList.remove("m3e-sb-open")},window.__mailFabAct=function(t,i){var e=t.closest(".app-page")||document;if(window.__mailFabClose(e),i==="search"){var a=e.querySelector('input[placeholder="\u641C\u7D22\u90AE\u4EF6..."]');a&&a.focus(),window.__demoAction&&window.__demoAction("\u641C\u7D22\u90AE\u4EF6")}else if(i==="readall"){for(var n=e.querySelectorAll(".md3-card .mail-unread"),r=0;r<n.length;r++)n[r].style.setProperty("background-color","transparent");window.__demoAction&&window.__demoAction("\u5DF2\u5168\u90E8\u6807\u4E3A\u5DF2\u8BFB")}else i==="compose"&&window.pushSubPage&&window.pushSubPage(4)};export default{id:"mail",name:"\u90AE\u4EF6",pages:[{title:"\u6536\u4EF6\u7BB1",content:`
        <div style="padding:16px 0;position:relative;min-height:100%;">
          <!-- \u641C\u7D22\u680F MD3 Search Bar -->
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:16px;border:1px solid var(--md-outline-variant);">
            <span style="font-size:18px;color:var(--md-on-surface-variant);">${o.search}</span>
            <input type="text" placeholder="\u641C\u7D22\u90AE\u4EF6..." style="background:transparent;border:none;outline:none;color:var(--md-on-surface);font-size:14px;width:100%;">
          </div>

          <!-- \u90AE\u4EF6\u5217\u8868 MD3 Cards -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div class="md3-card" style="cursor:pointer;padding:14px 16px;" onclick="pushSubPage(1)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="mail-unread" style="width:8px;height:8px;border-radius:50%;background:var(--md-primary);"></div>
                  <span style="font-size:15px;font-weight:600;color:var(--md-on-surface);">GitHub</span>
                </div>
                <span style="font-size:12px;color:var(--md-on-surface-variant);">09:24</span>
              </div>
              <div style="font-size:13px;font-weight:500;color:var(--md-primary);margin-bottom:2px;">[PR] Fix spring animation overflow bug \u2014 \u5DF2\u5408\u5E76</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\u4F60\u7684 Pull Request #142 \u5DF2\u88AB\u6279\u51C6\u5E76\u5408\u5E76\u5230 main \u5206\u652F...</div>
            </div>

            <div class="md3-card" style="cursor:pointer;padding:14px 16px;" onclick="pushSubPage(2)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="mail-unread" style="width:8px;height:8px;border-radius:50%;background:transparent;"></div>
                  <span style="font-size:15px;font-weight:600;color:var(--md-on-surface);">Apple / Google Security</span>
                </div>
                <span style="font-size:12px;color:var(--md-on-surface-variant);">\u6628\u5929</span>
              </div>
              <div style="font-size:13px;font-weight:500;color:var(--md-on-surface);margin-bottom:2px;">\u60A8\u7684\u8D26\u53F7\u5728\u65B0\u8BBE\u5907\u4E0A\u767B\u5F55</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\u60A8\u7684\u8D26\u53F7\u4E8E 2026-08-12 14:20 \u5728 MacBook Pro (M3) \u4E0A\u6210\u529F\u767B\u5F55...</div>
            </div>

            <div class="md3-card" style="cursor:pointer;padding:14px 16px;" onclick="pushSubPage(3)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="mail-unread" style="width:8px;height:8px;border-radius:50%;background:transparent;"></div>
                  <span style="font-size:15px;font-weight:600;color:var(--md-on-surface);">\u56E2\u961F\u5468\u62A5</span>
                </div>
                <span style="font-size:12px;color:var(--md-on-surface-variant);">\u5468\u4E00</span>
              </div>
              <div style="font-size:13px;font-weight:500;color:var(--md-on-surface);margin-bottom:2px;">\u7B2C 32 \u5468\u5DE5\u4F5C\u603B\u7ED3\u4E0E\u4E0B\u5468\u8BA1\u5212</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">1. \u684C\u9762\u6A21\u62DF\u5668\u52A8\u753B\u5F15\u64CE\u91CD\u6784\u5B8C\u6210\uFF1B2. MD3 \u8868\u8FBE\u6027\u6ED1\u5757\u4E0A\u7EBF...</div>
            </div>
          </div>

          <!-- [v7.73] M3E SplitButton\uFF1Alead \u5199\u90AE\u4EF6\uFF08\u76F4\u8FDB\uFF09+ trail \u83DC\u5355\uFF08spin 180\xB0 + \u5185\u89D2\u53D8\u5F62\uFF09 -->
          <div style="position:fixed;bottom:24px;right:24px;z-index:10;display:flex;flex-direction:column;align-items:flex-end;gap:10px;">
            <div class="mail-fab-menu" style="display:none;background:var(--md-surface-container-high,hsl(var(--md-h,215) 18% 17%));border:1px solid var(--md-outline-variant);border-radius:18px;overflow:hidden;box-shadow:0 14px 36px rgba(0,0,0,.5);min-width:168px;">
              <button style="display:flex;align-items:center;gap:10px;width:100%;padding:12px 16px;border:0;background:transparent;color:var(--md-on-surface,#e2e2e9);font:inherit;font-size:13.5px;cursor:pointer;text-align:left;" onclick="__mailFabAct(this,'search')">
                <span style="display:flex;width:18px;height:18px;color:var(--md-on-surface-variant);">${o.search}</span>\u641C\u7D22\u90AE\u4EF6
              </button>
              <button style="display:flex;align-items:center;gap:10px;width:100%;padding:12px 16px;border:0;border-top:1px solid var(--md-outline-variant);background:transparent;color:var(--md-on-surface,#e2e2e9);font:inherit;font-size:13.5px;cursor:pointer;text-align:left;" onclick="__mailFabAct(this,'readall')">
                <span style="display:flex;width:18px;height:18px;color:var(--md-on-surface-variant);">${o.done_all||o.check}</span>\u5168\u90E8\u6807\u4E3A\u5DF2\u8BFB
              </button>
            </div>
            <div class="m3e-splitbtn" style="background:hsl(var(--md-h,215) 70% 46%);color:hsl(var(--md-h,215) 95% 96%);">
              <button class="m3e-sb-lead" aria-label="\u5199\u90AE\u4EF6" onclick="__mailFabClose(this.closest('.app-page'));pushSubPage(4)">
                ${o.edit}<span class="m3e-sb-lbl">\u5199\u90AE\u4EF6</span>
              </button>
              <button class="m3e-sb-trail" aria-label="\u66F4\u591A\u90AE\u4EF6\u64CD\u4F5C" onclick="__mailFabMenu(this)">
                <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5.5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="18.5" r="1.6"/></svg>
              </button>
            </div>
          </div>
        </div>
      `},{title:"\u90AE\u4EF6\u8BE6\u60C5",content:`
        <div style="padding:16px 0;">
          <div class="md3-card" style="margin-bottom:16px;">
            <h2 style="font-size:18px;font-weight:600;line-height:1.4;color:var(--md-on-surface);margin-bottom:10px;">[PR] Fix spring animation overflow bug \u2014 approved</h2>
            <div style="display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid var(--md-outline-variant);">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--md-secondary-container);display:flex;align-items:center;justify-content:center;font-size:18px;">${o.code}</div>
              <div style="flex:1;">
                <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);">GitHub</div>
                <div style="font-size:12px;color:var(--md-on-surface-variant);">noreply@github.com \xB7 09:24</div>
              </div>
            </div>
            <div style="padding-top:16px;font-size:14px;line-height:1.6;color:var(--md-on-surface);">
              <p>Hi,</p>
              <p style="margin:10px 0;">\u4F60\u7684 Pull Request <strong>#142</strong> \u5DF2\u88AB\u6279\u51C6\u5E76\u5408\u5E76\u5230 <code style="background:var(--md-surface-container-highest);padding:2px 8px;border-radius:6px;font-size:13px;color:var(--md-primary);">main</code> \u5206\u652F\u3002</p>
              <p style="margin:10px 0;">\u4FEE\u6539\u5185\u5BB9\uFF1A\u91CD\u6784\u7269\u7406\u5F39\u7C27\u5F15\u64CE\uFF0C\u4F18\u5316\u6587\u4EF6\u5939\u6253\u5F00/\u8FD4\u56DE\u52A8\u753B\u8FDE\u7EED\u6027\uFF0C\u5168\u9762\u9002\u914D Material Design 3 \u8868\u8FBE\u6027\u8BBE\u8BA1\u7CFB\u7EDF\u4E0E\u5B9A\u5236\u5706\u89D2\u95F4\u9699\u6ED1\u5757\u3002</p>
              <p style="margin-top:16px;">\u611F\u8C22\u4F60\u7684\u5353\u8D8A\u8D21\u732E\uFF01${o.auto_awesome}</p>
              <p style="color:var(--md-on-surface-variant);font-size:12px;margin-top:20px;">\u2014 GitHub Notifications</p>
            </div>
          </div>
        </div>
      `},{title:"Apple ID \u901A\u77E5",content:`
        <div style="padding:16px 0;">
          <div class="md3-card">
            <h2 style="font-size:18px;font-weight:600;line-height:1.4;color:var(--md-on-surface);margin-bottom:12px;">\u60A8\u7684\u8D26\u53F7\u5728\u65B0\u8BBE\u5907\u4E0A\u767B\u5F55</h2>
            <div style="font-size:12px;color:var(--md-on-surface-variant);margin-bottom:16px;">Apple &lt;no_reply@email.apple.com&gt; \xB7 \u6628\u5929 14:30</div>
            <p style="font-size:14px;line-height:1.6;color:var(--md-on-surface);">\u5C0A\u656C\u7684\u7528\u6237\uFF0C\u60A8\u7684\u8D26\u53F7\u5DF2\u4E8E\u4EE5\u4E0B\u65F6\u95F4\u5728\u4E00\u53F0\u65B0\u8BBE\u5907\u4E0A\u767B\u5F55\uFF1A</p>
            <div style="background:var(--md-surface-container-high);border-radius:var(--md-r-md);padding:14px;margin:14px 0;font-size:13px;line-height:1.8;">
              <div><strong>\u65E5\u671F\uFF1A</strong>2026 \u5E74 8 \u6708 12 \u65E5 14:20</div>
              <div><strong>\u8BBE\u5907\uFF1A</strong>MacBook Pro (M3 Max)</div>
              <div><strong>\u4F4D\u7F6E\uFF1A</strong>\u4E2D\u56FD\u4E0A\u6D77 (IP: 218.80.xxx.xxx)</div>
            </div>
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:12px;" onclick="__demoAction && __demoAction('\u7BA1\u7406\u53D7\u4FE1\u4EFB\u8BBE\u5907')">\u7BA1\u7406\u53D7\u4FE1\u4EFB\u8BBE\u5907</button>
          </div>
        </div>
      `},{title:"\u56E2\u961F\u5468\u62A5",content:`
        <div style="padding:16px 0;">
          <div class="md3-card">
            <h2 style="font-size:18px;font-weight:600;color:var(--md-on-surface);margin-bottom:8px;">\u7B2C 32 \u5468\u5DE5\u4F5C\u603B\u7ED3\u4E0E\u4E0B\u5468\u8BA1\u5212</h2>
            <div style="font-size:12px;color:var(--md-on-surface-variant);margin-bottom:16px;">\u56E2\u961F\u5468\u62A5 &lt;team@company.com&gt; \xB7 \u5468\u4E00 10:00</div>
            <div style="font-size:14px;line-height:1.6;color:var(--md-on-surface);">
              <div style="font-weight:600;color:var(--md-primary);margin-bottom:6px;">\u672C\u5468\u6838\u5FC3\u6210\u679C\uFF1A</div>
              <p>1. \u684C\u9762\u6A21\u62DF\u5668\u52A8\u753B\u5F15\u64CE\u91CD\u6784\uFF0C\u5B9E\u73B0\u51E0\u4F55\u65E0\u7578\u53D8\u5F39\u7C27\u56DE\u5F52<br>2. \u56FE\u6807\u957F\u6309\u62D6\u62FD\u91CD\u6784\uFF0C\u63D0\u5347 120fps \u6E32\u67D3\u6D41\u7545\u5EA6<br>3. \u6587\u4EF6\u5939\u5185\u6253\u5F00\u5E94\u7528\u4FDD\u7559\u5C55\u5F00\u72B6\u6001\u5E76\u5728\u5173\u95ED\u65F6\u51C6\u786E\u5F52\u4F4D<br>4. Material Design 3 \u8868\u8FBE\u6027\u6ED1\u5757\u6DF1\u5EA6\u9002\u914D</p>
            </div>
          </div>
        </div>
      `},{title:"\u5199\u65B0\u90AE\u4EF6",content:`
        <div style="padding:16px 0;">
          <div class="md3-card" style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <span style="font-size:12px;color:var(--md-on-surface-variant);">\u6536\u4EF6\u4EBA</span>
              <input type="text" placeholder="example@domain.com" style="width:100%;background:transparent;border:none;border-bottom:1px solid var(--md-outline-variant);padding:6px 0;color:var(--md-on-surface);outline:none;font-size:14px;">
            </div>
            <div>
              <span style="font-size:12px;color:var(--md-on-surface-variant);">\u4E3B\u9898</span>
              <input type="text" placeholder="\u90AE\u4EF6\u4E3B\u9898" style="width:100%;background:transparent;border:none;border-bottom:1px solid var(--md-outline-variant);padding:6px 0;color:var(--md-on-surface);outline:none;font-size:14px;">
            </div>
            <div>
              <span style="font-size:12px;color:var(--md-on-surface-variant);">\u6B63\u6587</span>
              <textarea placeholder="\u5728\u8FD9\u91CC\u64B0\u5199\u90AE\u4EF6\u5185\u5BB9..." style="width:100%;min-height:160px;background:transparent;border:none;padding:8px 0;color:var(--md-on-surface);outline:none;font-size:14px;resize:none;line-height:1.6;"></textarea>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:16px;">
            <button class="md3-btn md3-btn-filled" style="flex:1;" onclick="alert('\u90AE\u4EF6\u5DF2\u53D1\u9001\uFF01');if (window.popSubPage) window.popSubPage();">\u53D1\u9001\u90AE\u4EF6</button>
            <button class="md3-btn md3-btn-tonal" style="flex:1;" onclick="__demoAction && __demoAction('\u5B58\u4E3A\u8349\u7A3F')">\u5B58\u4E3A\u8349\u7A3F</button>
          </div>
        </div>
      `}]};
