// ==================== facetime.js — 通话 / 畅连 (Material Design 3) ====================

import { ICONS } from '../icons.js';

export default {
  id: 'facetime',
  name: 'FaceTime',
  pages: [
    {
      title: 'FaceTime 通话',
      content: `
        <div style="padding:16px 0;">
          <!-- 快捷操作按钮组 MD3 Buttons Row -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
            <button class="md3-btn md3-btn-filled" style="padding:14px;border-radius:var(--md-r-lg);" onclick="__demoAction && __demoAction('发起视频')">
              <span style="font-size:18px;">${ICONS.videocam}</span>
              <span>发起视频</span>
            </button>
            <button class="md3-btn md3-btn-tonal" style="padding:14px;border-radius:var(--md-r-lg);" onclick="__demoAction && __demoAction('创建链接')">
              <span style="font-size:18px;">${ICONS.link}</span>
              <span>创建链接</span>
            </button>
          </div>

          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">最近通话记录</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div style="width:40px;height:40px;border-radius:50%;background:hsl(var(--md-h,215) 60% 40%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;">张</div>
              <div class="md3-list-item-text">
                <div>张明</div>
                <div class="md3-list-item-subtext">${ICONS.videocam} 传入视频 · 18 分钟前</div>
              </div>
              <button class="icon-btn" style="color:var(--md-primary);" aria-label="回拨">${ICONS.call}</button>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div style="width:40px;height:40px;border-radius:50%;background:hsl(calc(var(--md-h,215) + 60) 60% 40%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;">李</div>
              <div class="md3-list-item-text">
                <div>李华</div>
                <div class="md3-list-item-subtext">${ICONS.mic} 语音通话 · 昨天 20:15</div>
              </div>
              <button class="icon-btn" style="color:var(--md-primary);" aria-label="回拨">${ICONS.call}</button>
            </div>
          </div>
        </div>
      `,
    },
  ],
};
