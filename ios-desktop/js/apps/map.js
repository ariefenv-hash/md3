// ==================== map.js — 地图 (Material Design 3) ====================

import { ICONS } from '../icons.js';

export default {
  id: 'map',
  name: '地图',
  pages: [
    {
      title: '地图',
      content: `
        <div style="padding:16px 0;">
          <!-- MD3 搜索栏 -->
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:14px;border:1px solid var(--md-outline-variant);">
            <span style="font-size:18px;color:var(--md-primary);">${ICONS.location_on}</span>
            <input type="text" placeholder="搜索地点、路线、周边美食..." style="background:transparent;border:none;outline:none;color:var(--md-on-surface);font-size:14px;width:100%;">
          </div>

          <!-- 地图视窗 MD3 Elevated Card -->
          <div class="md3-card md3-card-elevated" style="height:220px;padding:0;overflow:hidden;position:relative;margin-bottom:18px;background:linear-gradient(135deg,#1b2838,#16212e);border:1px solid var(--md-outline-variant);display:flex;align-items:center;justify-content:center;">
            <!-- 地图网格纹理 -->
            <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);background-size:28px 28px;"></div>
            <!-- 定位脉冲标记 -->
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              <div style="width:36px;height:36px;border-radius:50%;background:hsla(var(--md-h,215),80%,50%,0.25);animation:pulse 2s infinite;"></div>
              <div style="position:absolute;width:14px;height:14px;border-radius:50%;background:var(--md-primary);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>
            </div>
            <div style="position:absolute;bottom:12px;left:14px;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);padding:4px 10px;border-radius:12px;font-size:11px;color:#fff;">上海市 · 实时路况畅通</div>
            <div style="position:absolute;bottom:12px;right:14px;font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">${ICONS.explore}</div>
          </div>

          <!-- 收藏地点 MD3 Cards -->
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">快捷路线与收藏</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${ICONS.home}</div>
              <div class="md3-list-item-text">
                <div>家</div>
                <div class="md3-list-item-subtext">浦东新区 · 12 公里</div>
              </div>
              <span style="color:var(--md-primary);font-weight:600;font-size:13px;margin-right:4px;">32 分钟</span>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(2)">
              <div class="md3-list-item-icon">${ICONS.work}</div>
              <div class="md3-list-item-text">
                <div>公司</div>
                <div class="md3-list-item-subtext">徐汇区 · 3.2 公里</div>
              </div>
              <span style="color:var(--md-primary);font-weight:600;font-size:13px;margin-right:4px;">28 分钟</span>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">›</span>
            </div>
          </div>
        </div>
      `,
    },
    {
      title: '回家路线',
      content: `
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="margin-bottom:16px;">
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:6px;">最佳推荐导航路线</div>
            <div style="font-size:16px;font-weight:600;color:var(--md-on-surface);">${ICONS.work} 公司 → ${ICONS.home} 家</div>
            <div style="font-size:36px;font-weight:700;color:var(--md-primary);font-family:var(--md-font-num);margin:12px 0 4px;">32 <span style="font-size:18px;font-weight:500;">分钟</span></div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);">12 公里 · 畅通无拥堵</div>
          </div>

          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.directions_car}</div>
              <div class="md3-list-item-text">驾车 / 打车</div>
              <span style="color:var(--md-primary);font-weight:600;font-size:14px;">32 分钟</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.metro}</div>
              <div class="md3-list-item-text">公共交通 (地铁 2 号线)</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">45 分钟</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.directions_walk}</div>
              <div class="md3-list-item-text">步行</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">2 小时 18 分</span>
            </div>
          </div>
          <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;" onclick="__demoAction && __demoAction('开始导航')">开始导航</button>
        </div>
      `,
    },
    {
      title: '到公司路线',
      content: `
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="margin-bottom:16px;">
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:6px;">晨间通勤建议</div>
            <div style="font-size:16px;font-weight:600;color:var(--md-on-surface);">${ICONS.home} 家 → ${ICONS.work} 公司</div>
            <div style="font-size:36px;font-weight:700;color:var(--md-primary);font-family:var(--md-font-num);margin:12px 0 4px;">28 <span style="font-size:18px;font-weight:500;">分钟</span></div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);">3.2 公里 · 途经延安高架路</div>
          </div>

          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.directions_car}</div>
              <div class="md3-list-item-text">驾车</div>
              <span style="color:var(--md-primary);font-weight:600;font-size:14px;">28 分钟</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.metro}</div>
              <div class="md3-list-item-text">地铁 9 号线</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">35 分钟</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.directions_bike}</div>
              <div class="md3-list-item-text">骑行</div>
              <span style="color:var(--md-on-surface-variant);font-size:14px;">18 分钟</span>
            </div>
          </div>
          <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;" onclick="__demoAction && __demoAction('开始导航')">开始导航</button>
        </div>
      `,
    },
  ],
};
