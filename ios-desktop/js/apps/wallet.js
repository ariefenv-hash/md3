import{ICONS as i}from"../icons.js";export default{id:"wallet",name:"Google \u94B1\u5305",pages:[{title:"Google \u94B1\u5305",content:`
        <div style="padding:16px 0;">
          <!-- MD3 \u5361\u7247\u5C55\u793A (Google Wallet / MD3 Expressive Card) -->
          <div class="md3-card md3-card-elevated" style="aspect-ratio:1.6;max-width:320px;margin:10px auto 16px;border-radius:24px;background:linear-gradient(135deg,#1f2937,#111827);padding:22px;display:flex;flex-direction:column;justify-content:space-between;border:1px solid rgba(255,255,255,0.12);box-shadow:var(--md-shadow-3);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div style="color:#fff;font-size:16px;font-weight:600;letter-spacing:0.5px;">\u62DB\u5546\u94F6\u884C\u50A8\u84C4\u5361</div>
                <div style="color:var(--md-on-surface-variant);font-size:11px;margin-top:2px;">Google Pay \u9ED8\u8BA4\u5361\u7247</div>
              </div>
              <span style="font-size:24px;">${i.credit_card}</span>
            </div>
            <div style="color:#fff;font-size:19px;letter-spacing:3px;font-family:monospace;font-weight:600;">\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 8842</div>
            <div style="display:flex;justify-content:space-between;color:var(--md-on-surface-variant);font-size:12px;">
              <span>ZHANG SAN</span>
              <span>12/28</span>
            </div>
          </div>

          <div style="text-align:center;margin:12px 0 20px;color:var(--md-on-surface-variant);font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="color:var(--md-primary);">${i.auto_awesome}</span>
            <span>\u9760\u8FD1\u611F\u5E94\u533A\u5373\u53EF\u5B8C\u6210\u652F\u4ED8</span>
          </div>

          <!-- \u64CD\u4F5C\u4E0E\u8BB0\u5F55 MD3 List -->
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${i.assignment}</div>
              <div class="md3-list-item-text">\u8FD1\u671F\u4EA4\u6613\u8BB0\u5F55\u660E\u7EC6</div>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">\u203A</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${i.add_circle}</div>
              <div class="md3-list-item-text">\u6DFB\u52A0\u94F6\u884C\u5361\u6216\u4EA4\u901A\u5361</div>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">\u203A</span>
            </div>
          </div>
        </div>
      `},{title:"\u4EA4\u6613\u8BB0\u5F55",content:`
        <div style="padding:16px 0;">
          <div style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 8px 10px;">\u4ECA\u5929</div>
          <div class="md3-card" style="padding:4px 0;margin-bottom:18px;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${i.coffee}</div>
              <div class="md3-list-item-text">
                <div>\u661F\u5DF4\u514B\u81FB\u9009</div>
                <div class="md3-list-item-subtext">09:12 \xB7 \u9759\u5B89\u533A\u95E8\u5E97</div>
              </div>
              <span style="font-size:15px;font-weight:600;color:var(--md-error,#f2b8b5);">-\xA538.00</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${i.metro}</div>
              <div class="md3-list-item-text">
                <div>\u4E0A\u6D77\u4EA4\u901A\u5361\u81EA\u52A8\u5145\u503C</div>
                <div class="md3-list-item-subtext">08:30 \xB7 \u4E58\u8F66\u7801</div>
              </div>
              <span style="font-size:15px;font-weight:600;color:var(--md-error,#f2b8b5);">-\xA550.00</span>
            </div>
          </div>

          <div style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 8px 10px;">\u6628\u5929</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${i.paid}</div>
              <div class="md3-list-item-text">
                <div>\u5DE5\u8D44\u85AA\u916C\u53D1\u653E</div>
                <div class="md3-list-item-subtext">18:00 \xB7 \u62DB\u5546\u94F6\u884C\u6C47\u5165</div>
              </div>
              <span style="font-size:15px;font-weight:600;color:var(--md-success,#a8f5bb);">+\xA515,800.00</span>
            </div>
          </div>
        </div>
      `}]};
