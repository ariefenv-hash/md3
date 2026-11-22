import{ICONS as t}from"../icons.js";export default{id:"facetime",name:"Meet",pages:[{title:"Meet",content:`
        <div style="padding:16px 0;">
          <!-- \u5FEB\u6377\u64CD\u4F5C\u6309\u94AE\u7EC4 MD3 Buttons Row -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
            <button class="md3-btn md3-btn-filled" style="padding:14px;border-radius:var(--md-r-lg);" onclick="__demoAction && __demoAction('\u53D1\u8D77\u89C6\u9891')">
              <span style="font-size:18px;">${t.videocam}</span>
              <span>\u53D1\u8D77\u89C6\u9891</span>
            </button>
            <button class="md3-btn md3-btn-tonal" style="padding:14px;border-radius:var(--md-r-lg);" onclick="__demoAction && __demoAction('\u521B\u5EFA\u94FE\u63A5')">
              <span style="font-size:18px;">${t.link}</span>
              <span>\u521B\u5EFA\u94FE\u63A5</span>
            </button>
          </div>

          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">\u6700\u8FD1\u901A\u8BDD\u8BB0\u5F55</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div style="width:40px;height:40px;border-radius:50%;background:hsl(var(--md-h,215) 60% 40%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;">\u5F20</div>
              <div class="md3-list-item-text">
                <div>\u5F20\u660E</div>
                <div class="md3-list-item-subtext">${t.videocam} \u4F20\u5165\u89C6\u9891 \xB7 18 \u5206\u949F\u524D</div>
              </div>
              <button class="icon-btn" style="color:var(--md-primary);" aria-label="\u56DE\u62E8">${t.call}</button>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div style="width:40px;height:40px;border-radius:50%;background:hsl(calc(var(--md-h,215) + 60) 60% 40%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;">\u674E</div>
              <div class="md3-list-item-text">
                <div>\u674E\u534E</div>
                <div class="md3-list-item-subtext">${t.mic} \u8BED\u97F3\u901A\u8BDD \xB7 \u6628\u5929 20:15</div>
              </div>
              <button class="icon-btn" style="color:var(--md-primary);" aria-label="\u56DE\u62E8">${t.call}</button>
            </div>
          </div>
        </div>
      `}]};
