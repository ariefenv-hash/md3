import{ICONS as d}from"../icons.js";import{subscribeBattery as e}from"../battery-service.js";export default{id:"findmy",name:"\u67E5\u627E\u6211\u7684\u8BBE\u5907",pages:[{title:"\u67E5\u627E\u6211\u7684\u8BBE\u5907",content:`
        <div style="padding:16px 0;">
          <!-- \u6A21\u62DF\u96F7\u8FBE\u626B\u63CF\u5730\u56FE\u5361\u7247 MD3 Card -->
          <div class="md3-card md3-card-elevated" style="height:180px;padding:0;overflow:hidden;position:relative;margin-bottom:16px;background:linear-gradient(135deg,#0a192f,#020c1b);border:1px solid var(--md-outline-variant);display:flex;align-items:center;justify-content:center;">
            <div style="width:120px;height:120px;border-radius:50%;border:1px solid hsla(var(--md-h,215),80%,60%,0.3);display:flex;align-items:center;justify-content:center;">
              <div style="width:60px;height:60px;border-radius:50%;border:1px solid hsla(var(--md-h,215),80%,60%,0.5);display:flex;align-items:center;justify-content:center;">
                <div style="width:10px;height:10px;border-radius:50%;background:var(--md-accent,#80d8ff);box-shadow:0 0 10px #80d8ff;"></div>
              </div>
            </div>
            <div style="position:absolute;bottom:10px;left:14px;font-size:11px;color:var(--md-on-surface-variant);">\u5B9A\u4F4D\u7F51\u7EDC\u5DF2\u8FDE\u63A5 \xB7 2 \u53F0\u5728\u7EBF \xB7 1 \u53F0\u5728\u9644\u8FD1</div>
          </div>

          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">\u6211\u7684\u8BBE\u5907</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${d.smartphone}</div>
              <div class="md3-list-item-text">
                <div>Pixel 9 Pro / \u5F53\u524D\u8BBE\u5907</div>
                <div class="md3-list-item-subtext" id="findmyThisDeviceBattery">\u5728\u6B64\u8BBE\u5907\u4E0A \xB7 \u7535\u91CF 87%</div>
              </div>
              <span style="color:var(--md-success);font-size:12px;font-weight:600;">\u5728\u7EBF</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${d.laptop}</div>
              <div class="md3-list-item-text">
                <div>Chromebook Plus</div>
                <div class="md3-list-item-subtext">\u5BB6 \xB7 \u521A\u521A\u6D3B\u8DC3</div>
              </div>
              <span style="color:var(--md-success);font-size:12px;font-weight:600;">\u5728\u7EBF</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${d.headphones}</div>
              <div class="md3-list-item-text">
                <div>Pixel Buds Pro</div>
                <div class="md3-list-item-subtext">\u968F\u8EAB\u80CC\u5305\u4E2D \xB7 \u5145\u7535\u76D2 92%</div>
              </div>
              <span style="color:var(--md-on-surface-variant);font-size:12px;">\u9644\u8FD1</span>
            </div>
          </div>
        </div>
      `}]};e(i=>{const t=document.getElementById("findmyThisDeviceBattery");!t||!t.isConnected||(t.textContent=i.charging?`\u5728\u6B64\u8BBE\u5907\u4E0A \xB7 \u7535\u91CF ${i.level}%\uFF08\u5145\u7535\u4E2D\uFF09`:`\u5728\u6B64\u8BBE\u5907\u4E0A \xB7 \u7535\u91CF ${i.level}%`)});
