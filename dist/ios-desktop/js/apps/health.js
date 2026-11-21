import{ICONS as i}from"../icons.js";export default{id:"health",name:"Fit",pages:[{title:"Fit",content:`
        <div style="padding:16px 0;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <h2 style="font-size:20px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">\u4ECA\u65E5\u6458\u8981</h2>
            <span style="font-size:12px;font-weight:500;padding:4px 10px;border-radius:12px;background:var(--md-secondary-container);color:var(--md-on-secondary-container);">\u5B9E\u65F6\u540C\u6B65</span>
          </div>

          <!-- 2x2 MD3 \u8868\u8FBE\u6027\u5361\u7247\u7F51\u683C -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="md3-card" style="padding:16px;text-align:left;position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);font-weight:500;">\u6B65\u6570</span>
                <span style="font-size:16px;">${i.directions_walk}</span>
              </div>
              <div style="font-size:28px;font-weight:700;color:var(--md-accent,#ff7597);font-family:var(--md-font-num);margin:8px 0 2px;">8,427</div>
              <div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">\u76EE\u6807 10,000 \xB7 84%</div>
              <div style="width:100%;height:4px;background:var(--md-surface-container-highest);border-radius:2px;margin-top:8px;overflow:hidden;">
                <div style="width:84%;height:100%;background:var(--md-accent,#ff7597);border-radius:2px;"></div>
              </div>
            </div>

            <div class="md3-card" style="padding:16px;text-align:left;position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);font-weight:500;">\u8FD0\u52A8\u8DDD\u79BB</span>
                <span style="font-size:16px;">${i.location_on}</span>
              </div>
              <div style="font-size:28px;font-weight:700;color:var(--md-primary,hsl(var(--md-h,215) 85% 70%));font-family:var(--md-font-num);margin:8px 0 2px;">5.6 <span style="font-size:14px;font-weight:500;">km</span></div>
              <div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">\u8F83\u6628\u65E5 +1.2 km</div>
              <div style="width:100%;height:4px;background:var(--md-surface-container-highest);border-radius:2px;margin-top:8px;overflow:hidden;">
                <div style="width:70%;height:100%;background:var(--md-primary);border-radius:2px;"></div>
              </div>
            </div>

            <div class="md3-card" style="padding:16px;text-align:left;position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);font-weight:500;">\u6D3B\u52A8\u5343\u5361</span>
                <span style="font-size:16px;">${i.local_fire_department}</span>
              </div>
              <div style="font-size:28px;font-weight:700;color:#ffb74d;font-family:var(--md-font-num);margin:8px 0 2px;">372 <span style="font-size:14px;font-weight:500;">kcal</span></div>
              <div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">\u76EE\u6807 500 kcal</div>
              <div style="width:100%;height:4px;background:var(--md-surface-container-highest);border-radius:2px;margin-top:8px;overflow:hidden;">
                <div style="width:74%;height:100%;background:#ffb74d;border-radius:2px;"></div>
              </div>
            </div>

            <div class="md3-card" style="padding:16px;text-align:left;position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);font-weight:500;">\u7761\u7720\u5206\u6790</span>
                <span style="font-size:16px;">${i.bedtime}</span>
              </div>
              <div style="font-size:28px;font-weight:700;color:var(--md-success,#a8f5bb);font-family:var(--md-font-num);margin:8px 0 2px;">7h 22m</div>
              <div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">\u6DF1\u7761 2h 10m \xB7 \u826F\u597D</div>
              <div style="width:100%;height:4px;background:var(--md-surface-container-highest);border-radius:2px;margin-top:8px;overflow:hidden;">
                <div style="width:92%;height:100%;background:var(--md-success,#a8f5bb);border-radius:2px;"></div>
              </div>
            </div>
          </div>

          <!-- \u751F\u7406\u5065\u5EB7\u6307\u6807\u5217\u8868 MD3 List -->
          <div class="md3-card" style="padding:4px 0;margin-top:20px;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${i.bar_chart}</div>
              <div class="md3-list-item-text">\u672C\u5468\u6B65\u6570\u4E0E\u8FD0\u52A8\u8D8B\u52BF</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">\u203A</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${i.favorite}</div>
              <div class="md3-list-item-text">\u9759\u606F\u5FC3\u7387</div>
              <span style="color:var(--md-primary,hsl(var(--md-h,215) 85% 70%));font-weight:600;font-size:14px;margin-right:6px;">72 bpm</span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">\u203A</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${i.water_drop}</div>
              <div class="md3-list-item-text">\u8840\u6DB2\u6C27\u6C14\u9971\u548C\u5EA6</div>
              <span style="color:var(--md-success,#a8f5bb);font-weight:600;font-size:14px;margin-right:6px;">98%</span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">\u203A</span>
            </div>
          </div>
        </div>
      `},{title:"\u672C\u5468\u8D8B\u52BF",content:`
        <div style="padding:16px 0;">
          <div class="md3-card">
            <h2 style="font-size:16px;font-weight:600;color:var(--md-on-surface,#e2e2e9);margin-bottom:16px;">\u672C\u5468\u6B65\u6570\u7EDF\u8BA1</h2>
            <div style="display:flex;align-items:flex-end;justify-content:space-between;height:160px;padding:12px 0;gap:8px;">
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:55%;background:var(--md-primary);border-radius:6px;opacity:0.6;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">\u5468\u4E00</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:75%;background:var(--md-primary);border-radius:6px;opacity:0.7;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">\u5468\u4E8C</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:90%;background:var(--md-accent,#80d8ff);border-radius:6px;box-shadow:0 0 10px rgba(128,216,255,0.4);"></div>
                <span style="font-size:11px;color:var(--md-accent,#80d8ff);font-weight:700;">\u4ECA\u65E5</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:40%;background:var(--md-surface-container-highest);border-radius:6px;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">\u5468\u56DB</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:60%;background:var(--md-surface-container-highest);border-radius:6px;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">\u5468\u4E94</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:70%;background:var(--md-surface-container-highest);border-radius:6px;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">\u5468\u516D</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:65%;background:var(--md-surface-container-highest);border-radius:6px;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">\u5468\u65E5</span>
              </div>
            </div>
            <div style="text-align:center;margin-top:16px;padding-top:12px;border-top:1px solid var(--md-outline-variant);">
              <div style="font-size:32px;font-weight:700;color:var(--md-on-surface,#e2e2e9);font-family:var(--md-font-num);">8,427</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">\u4ECA\u65E5\u6B65\u6570 \xB7 \u76EE\u6807 10,000</div>
            </div>
          </div>
        </div>
      `}]};
