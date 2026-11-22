import{ICONS as i}from"../icons.js";export default{id:"map",name:"\u5730\u56FE",pages:[{title:"\u5730\u56FE",content:`
        <div style="padding:16px 0;">
          <!-- MD3 \u641C\u7D22\u680F -->
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:14px;border:1px solid var(--md-outline-variant);">
            <span style="font-size:18px;color:var(--md-primary);">${i.location_on}</span>
            <input type="text" placeholder="\u641C\u7D22\u5730\u70B9\u3001\u8DEF\u7EBF\u3001\u5468\u8FB9\u7F8E\u98DF..." style="background:transparent;border:none;outline:none;color:var(--md-on-surface);font-size:14px;width:100%;">
          </div>

          <!-- \u5730\u56FE\u89C6\u7A97 MD3 Elevated Card -->
          <div class="md3-card md3-card-elevated" style="height:220px;padding:0;overflow:hidden;position:relative;margin-bottom:18px;background:linear-gradient(135deg,#1b2838,#16212e);border:1px solid var(--md-outline-variant);display:flex;align-items:center;justify-content:center;">
            <!-- \u5730\u56FE\u7F51\u683C\u7EB9\u7406 -->
            <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);background-size:28px 28px;"></div>
            <!-- \u5B9A\u4F4D\u8109\u51B2\u6807\u8BB0 -->
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              <div style="width:36px;height:36px;border-radius:50%;background:hsla(var(--md-h,215),80%,50%,0.25);animation:pulse 2s infinite;"></div>
              <div style="position:absolute;width:14px;height:14px;border-radius:50%;background:var(--md-primary);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>
            </div>
            <div style="position:absolute;bottom:12px;left:14px;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);padding:4px 10px;border-radius:12px;font-size:11px;color:#fff;">\u4E0A\u6D77\u5E02 \xB7 \u5B9E\u65F6\u8DEF\u51B5\u7545\u901A</div>
            <div style="position:absolute;bottom:12px;right:14px;font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">${i.explore}</div>
          </div>

          <!-- \u6536\u85CF\u5730\u70B9 MD3 Cards -->
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">\u5FEB\u6377\u8DEF\u7EBF\u4E0E\u6536\u85CF</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${i.home}</div>
              <div class="md3-list-item-text">
                <div>\u5BB6</div>
                <div class="md3-list-item-subtext">\u6D66\u4E1C\u65B0\u533A \xB7 12 \u516C\u91CC</div>
              </div>
              <span style="color:var(--md-primary);font-weight:600;font-size:13px;margin-right:4px;">32 \u5206\u949F</span>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">\u203A</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(2)">
              <div class="md3-list-item-icon">${i.work}</div>
              <div class="md3-list-item-text">
                <div>\u516C\u53F8</div>
                <div class="md3-list-item-subtext">\u5F90\u6C47\u533A \xB7 3.2 \u516C\u91CC</div>
              </div>
              <span style="color:var(--md-primary);font-weight:600;font-size:13px;margin-right:4px;">28 \u5206\u949F</span>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">\u203A</span>
            </div>
          </div>
        </div>
      `},{title:"\u56DE\u5BB6\u8DEF\u7EBF",content:`
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="margin-bottom:16px;">
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:6px;">\u6700\u4F73\u63A8\u8350\u5BFC\u822A\u8DEF\u7EBF</div>
            <div style="font-size:16px;font-weight:600;color:var(--md-on-surface);">${i.work} \u516C\u53F8 \u2192 ${i.home} \u5BB6</div>
            <div style="font-size:36px;font-weight:700;color:var(--md-primary);font-family:var(--md-font-num);margin:12px 0 4px;">32 <span style="font-size:18px;font-weight:500;">\u5206\u949F</span></div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);">12 \u516C\u91CC \xB7 \u7545\u901A\u65E0\u62E5\u5835</div>
          </div>

          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${i.directions_car}</div>
              <div class="md3-list-item-text">\u9A7E\u8F66 / \u6253\u8F66</div>
              <span style="color:var(--md-primary);font-weight:600;font-size:14px;">32 \u5206\u949F</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${i.metro}</div>
              <div class="md3-list-item-text">\u516C\u5171\u4EA4\u901A (\u5730\u94C1 2 \u53F7\u7EBF)</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">45 \u5206\u949F</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${i.directions_walk}</div>
              <div class="md3-list-item-text">\u6B65\u884C</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">2 \u5C0F\u65F6 18 \u5206</span>
            </div>
          </div>
          <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;" onclick="__demoAction && __demoAction('\u5F00\u59CB\u5BFC\u822A')">\u5F00\u59CB\u5BFC\u822A</button>
        </div>
      `},{title:"\u5230\u516C\u53F8\u8DEF\u7EBF",content:`
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="margin-bottom:16px;">
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:6px;">\u6668\u95F4\u901A\u52E4\u5EFA\u8BAE</div>
            <div style="font-size:16px;font-weight:600;color:var(--md-on-surface);">${i.home} \u5BB6 \u2192 ${i.work} \u516C\u53F8</div>
            <div style="font-size:36px;font-weight:700;color:var(--md-primary);font-family:var(--md-font-num);margin:12px 0 4px;">28 <span style="font-size:18px;font-weight:500;">\u5206\u949F</span></div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);">3.2 \u516C\u91CC \xB7 \u9014\u7ECF\u5EF6\u5B89\u9AD8\u67B6\u8DEF</div>
          </div>

          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${i.directions_car}</div>
              <div class="md3-list-item-text">\u9A7E\u8F66</div>
              <span style="color:var(--md-primary);font-weight:600;font-size:14px;">28 \u5206\u949F</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${i.metro}</div>
              <div class="md3-list-item-text">\u5730\u94C1 9 \u53F7\u7EBF</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">35 \u5206\u949F</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${i.directions_bike}</div>
              <div class="md3-list-item-text">\u9A91\u884C</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">18 \u5206\u949F</span>
            </div>
          </div>
          <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;" onclick="__demoAction && __demoAction('\u5F00\u59CB\u5BFC\u822A')">\u5F00\u59CB\u5BFC\u822A</button>
        </div>
      `}]};
