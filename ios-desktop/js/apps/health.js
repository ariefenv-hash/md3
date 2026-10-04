// ==================== health.js — 健康 (Material Design 3) ====================

import { ICONS } from '../icons.js';

export default {
  id: 'health',
  name: '健康',
  pages: [
    {
      title: '健康',
      content: `
        <div style="padding:16px 0;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <h2 style="font-size:20px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">今日摘要</h2>
            <span style="font-size:12px;font-weight:500;padding:4px 10px;border-radius:12px;background:var(--md-secondary-container);color:var(--md-on-secondary-container);">实时同步</span>
          </div>

          <!-- 2x2 MD3 表达性卡片网格 -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="md3-card" style="padding:16px;text-align:left;position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);font-weight:500;">步数</span>
                <span style="font-size:16px;">${ICONS.directions_walk}</span>
              </div>
              <div style="font-size:28px;font-weight:700;color:var(--md-accent,#ff7597);font-family:var(--md-font-num);margin:8px 0 2px;">8,427</div>
              <div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">目标 10,000 · 84%</div>
              <div style="width:100%;height:4px;background:var(--md-surface-container-highest);border-radius:2px;margin-top:8px;overflow:hidden;">
                <div style="width:84%;height:100%;background:var(--md-accent,#ff7597);border-radius:2px;"></div>
              </div>
            </div>

            <div class="md3-card" style="padding:16px;text-align:left;position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);font-weight:500;">运动距离</span>
                <span style="font-size:16px;">${ICONS.location_on}</span>
              </div>
              <div style="font-size:28px;font-weight:700;color:var(--md-primary,hsl(var(--md-h,215) 85% 70%));font-family:var(--md-font-num);margin:8px 0 2px;">5.6 <span style="font-size:14px;font-weight:500;">km</span></div>
              <div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">较昨日 +1.2 km</div>
              <div style="width:100%;height:4px;background:var(--md-surface-container-highest);border-radius:2px;margin-top:8px;overflow:hidden;">
                <div style="width:70%;height:100%;background:var(--md-primary);border-radius:2px;"></div>
              </div>
            </div>

            <div class="md3-card" style="padding:16px;text-align:left;position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);font-weight:500;">活动千卡</span>
                <span style="font-size:16px;">${ICONS.local_fire_department}</span>
              </div>
              <div style="font-size:28px;font-weight:700;color:#ffb74d;font-family:var(--md-font-num);margin:8px 0 2px;">372 <span style="font-size:14px;font-weight:500;">kcal</span></div>
              <div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">目标 500 kcal</div>
              <div style="width:100%;height:4px;background:var(--md-surface-container-highest);border-radius:2px;margin-top:8px;overflow:hidden;">
                <div style="width:74%;height:100%;background:#ffb74d;border-radius:2px;"></div>
              </div>
            </div>

            <div class="md3-card" style="padding:16px;text-align:left;position:relative;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);font-weight:500;">睡眠分析</span>
                <span style="font-size:16px;">${ICONS.bedtime}</span>
              </div>
              <div style="font-size:28px;font-weight:700;color:var(--md-success,#a8f5bb);font-family:var(--md-font-num);margin:8px 0 2px;">7h 22m</div>
              <div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">深睡 2h 10m · 良好</div>
              <div style="width:100%;height:4px;background:var(--md-surface-container-highest);border-radius:2px;margin-top:8px;overflow:hidden;">
                <div style="width:92%;height:100%;background:var(--md-success,#a8f5bb);border-radius:2px;"></div>
              </div>
            </div>
          </div>

          <!-- 生理健康指标列表 MD3 List -->
          <div class="md3-card" style="padding:4px 0;margin-top:20px;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${ICONS.bar_chart}</div>
              <div class="md3-list-item-text">本周步数与运动趋势</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.favorite}</div>
              <div class="md3-list-item-text">静息心率</div>
              <span style="color:var(--md-primary,hsl(var(--md-h,215) 85% 70%));font-weight:600;font-size:14px;margin-right:6px;">72 bpm</span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.water_drop}</div>
              <div class="md3-list-item-text">血液氧气饱和度</div>
              <span style="color:var(--md-success,#a8f5bb);font-weight:600;font-size:14px;margin-right:6px;">98%</span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
          </div>
        </div>
      `,
    },
    {
      title: '本周趋势',
      content: `
        <div style="padding:16px 0;">
          <div class="md3-card">
            <h2 style="font-size:16px;font-weight:600;color:var(--md-on-surface,#e2e2e9);margin-bottom:16px;">本周步数统计</h2>
            <div style="display:flex;align-items:flex-end;justify-content:space-between;height:160px;padding:12px 0;gap:8px;">
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:55%;background:var(--md-primary);border-radius:6px;opacity:0.6;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">周一</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:75%;background:var(--md-primary);border-radius:6px;opacity:0.7;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">周二</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:90%;background:var(--md-accent,#80d8ff);border-radius:6px;box-shadow:0 0 10px rgba(128,216,255,0.4);"></div>
                <span style="font-size:11px;color:var(--md-accent,#80d8ff);font-weight:700;">今日</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:40%;background:var(--md-surface-container-highest);border-radius:6px;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">周四</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:60%;background:var(--md-surface-container-highest);border-radius:6px;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">周五</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:70%;background:var(--md-surface-container-highest);border-radius:6px;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">周六</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:100%;height:65%;background:var(--md-surface-container-highest);border-radius:6px;"></div>
                <span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">周日</span>
              </div>
            </div>
            <div style="text-align:center;margin-top:16px;padding-top:12px;border-top:1px solid var(--md-outline-variant);">
              <div style="font-size:32px;font-weight:700;color:var(--md-on-surface,#e2e2e9);font-family:var(--md-font-num);">8,427</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">今日步数 · 目标 10,000</div>
            </div>
          </div>
        </div>
      `,
    },
  ],
};
