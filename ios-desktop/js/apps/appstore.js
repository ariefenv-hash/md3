// ==================== appstore.js — 应用商店 (Material Design 3) ====================

import { ICONS } from '../icons.js';

export default {
  id: 'appstore',
  name: '应用商店',
  pages: [
    {
      title: '应用商店',
      content: `
        <div style="padding:16px 0;">
          <!-- MD3 搜索栏 -->
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:18px;border:1px solid var(--md-outline-variant);" onclick="pushSubPage(4)">
            <span style="font-size:18px;color:var(--md-on-surface-variant);">${ICONS.search}</span>
            <span style="font-size:14px;color:var(--md-on-surface-variant);">搜索应用、游戏、专题...</span>
          </div>

          <!-- 精选大卡片 MD3 Elevated Hero Card -->
          <div class="md3-card md3-card-elevated" style="padding:0;overflow:hidden;margin-bottom:20px;cursor:pointer;" onclick="pushSubPage(1)">
            <div style="width:100%;height:160px;background:linear-gradient(135deg,hsl(var(--md-h,215) 75% 35%),hsl(var(--md-h,215) 85% 55%));display:flex;align-items:center;justify-content:center;font-size:52px;">
              ${ICONS.launch}
            </div>
            <div style="padding:18px 20px;">
              <div style="font-size:12px;color:var(--md-primary);font-weight:600;letter-spacing:0.4px;">今日精选专题</div>
              <div style="font-size:19px;font-weight:600;color:var(--md-on-surface);margin-top:4px;">探索 MD3 新生代高效工具</div>
              <div style="font-size:13px;color:var(--md-on-surface-variant);margin-top:4px;">流畅交互，极简美学</div>
            </div>
          </div>

          <!-- 推荐应用 MD3 Card List -->
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:12px;">热门必备应用</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:16px;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;">${ICONS.check}</div>
              <div class="md3-list-item-text">
                <div>Things 3</div>
                <div class="md3-list-item-subtext">效率任务管理 · ¥68.00</div>
              </div>
              <button class="md3-btn md3-btn-filled" style="padding:6px 16px;font-size:12px;" onclick="__demoAction && __demoAction('获取')">获取</button>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(2)">
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#f093fb,#f5576c);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;">${ICONS.photo_camera}</div>
              <div class="md3-list-item-text">
                <div>Darkroom</div>
                <div class="md3-list-item-subtext">专业图像后期 · 免费</div>
              </div>
              <button class="md3-btn md3-btn-filled" style="padding:6px 16px;font-size:12px;" onclick="__demoAction && __demoAction('获取')">获取</button>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(3)">
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#43e97b,#38f9d7);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;">${ICONS.forest}</div>
              <div class="md3-list-item-text">
                <div>Forest</div>
                <div class="md3-list-item-subtext">专注森林番茄钟 · ¥12.00</div>
              </div>
              <button class="md3-btn md3-btn-filled" style="padding:6px 16px;font-size:12px;" onclick="__demoAction && __demoAction('获取')">获取</button>
            </div>
          </div>
        </div>
      `,
    },
    {
      title: 'Things 3',
      content: `
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="text-align:center;padding:24px 20px;">
            <div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#667eea,#764ba2);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#fff;box-shadow:var(--md-shadow-2);">${ICONS.check}</div>
            <div style="font-size:20px;font-weight:600;color:var(--md-on-surface);">Things 3</div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-top:2px;">Cultured Code · 效率必备</div>
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;" onclick="__demoAction && __demoAction('购买安装')">¥68.00 购买安装</button>
          </div>
          <div class="md3-card" style="margin-top:16px;">
            <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:8px;">应用简介</div>
            <p style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">Things 是屡获殊荣的任务管理器。以优美直观的 Material 表达性语言呈现，让你轻松规划每一天、管理大型项目并专注达成目标。</p>
          </div>
        </div>
      `,
    },
    {
      title: 'Darkroom',
      content: `
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="text-align:center;padding:24px 20px;">
            <div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#f093fb,#f5576c);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#fff;box-shadow:var(--md-shadow-2);">${ICONS.photo_camera}</div>
            <div style="font-size:20px;font-weight:600;color:var(--md-on-surface);">Darkroom</div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-top:2px;">Bergen · 摄影与色彩</div>
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;" onclick="__demoAction && __demoAction('免费下载')">免费下载</button>
          </div>
        </div>
      `,
    },
    {
      title: 'Forest',
      content: `
        <div style="padding:16px 0;">
          <div class="md3-card md3-card-elevated" style="text-align:center;padding:24px 20px;">
            <div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#43e97b,#38f9d7);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#fff;box-shadow:var(--md-shadow-2);">${ICONS.forest}</div>
            <div style="font-size:20px;font-weight:600;color:var(--md-on-surface);">Forest</div>
            <div style="font-size:13px;color:var(--md-on-surface-variant);margin-top:2px;">Seekrtech · 专注森林</div>
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;" onclick="__demoAction && __demoAction('购买')">¥12.00 购买</button>
          </div>
        </div>
      `,
    },
    {
      title: '搜索',
      content: `
        <div style="padding:16px 0;">
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:18px;border:1px solid var(--md-outline-variant);">
            <span style="font-size:18px;color:var(--md-primary);">${ICONS.search}</span>
            <input type="text" placeholder="搜索应用、游戏..." style="background:transparent;border:none;outline:none;color:var(--md-on-surface);font-size:14px;width:100%;">
          </div>
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">大家都在搜</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <span class="md3-chip">AI 助手</span>
            <span class="md3-chip">Material You 壁纸</span>
            <span class="md3-chip">待办任务</span>
            <span class="md3-chip">白噪音冥想</span>
          </div>
        </div>
      `,
    },
  ],
};
