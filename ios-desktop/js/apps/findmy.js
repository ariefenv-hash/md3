// ==================== findmy.js — 查找 (Material Design 3) ====================

import { ICONS } from '../icons.js';
import { subscribeBattery } from '../battery-service.js';

export default {
  id: 'findmy',
  name: '查找',
  pages: [
    {
      title: '查找设备',
      content: `
        <div style="padding:16px 0;">
          <!-- 模拟雷达扫描地图卡片 MD3 Card -->
          <div class="md3-card md3-card-elevated" style="height:180px;padding:0;overflow:hidden;position:relative;margin-bottom:16px;background:linear-gradient(135deg,#0a192f,#020c1b);border:1px solid var(--md-outline-variant);display:flex;align-items:center;justify-content:center;">
            <div style="width:120px;height:120px;border-radius:50%;border:1px solid hsla(var(--md-h,215),80%,60%,0.3);display:flex;align-items:center;justify-content:center;">
              <div style="width:60px;height:60px;border-radius:50%;border:1px solid hsla(var(--md-h,215),80%,60%,0.5);display:flex;align-items:center;justify-content:center;">
                <div style="width:10px;height:10px;border-radius:50%;background:var(--md-accent,#80d8ff);box-shadow:0 0 10px #80d8ff;"></div>
              </div>
            </div>
            <div style="position:absolute;bottom:10px;left:14px;font-size:11px;color:var(--md-on-surface-variant);">定位网络已连接 · 2 台在线 · 1 台在附近</div>
          </div>

          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">我的设备</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.smartphone}</div>
              <div class="md3-list-item-text">
                <div>Pixel 9 Pro / 当前设备</div>
                <div class="md3-list-item-subtext" id="findmyThisDeviceBattery">在此设备上 · 电量 87%</div>
              </div>
              <span style="color:var(--md-success);font-size:12px;font-weight:600;">在线</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.laptop}</div>
              <div class="md3-list-item-text">
                <div>MacBook Pro (M3)</div>
                <div class="md3-list-item-subtext">家 · 刚刚活跃</div>
              </div>
              <span style="color:var(--md-success);font-size:12px;font-weight:600;">在线</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.headphones}</div>
              <div class="md3-list-item-text">
                <div>Pixel Buds Pro</div>
                <div class="md3-list-item-subtext">随身背包中 · 充电盒 92%</div>
              </div>
              <span style="color:var(--md-on-surface-variant);font-size:12px;">附近</span>
            </div>
          </div>
        </div>
      `,
    },
  ],
};

// 「当前设备」电量行实时同步（battery-service 单一真源，与状态栏/设置页同源）
subscribeBattery((s) => {
  const el = document.getElementById('findmyThisDeviceBattery');
  if (!el || !el.isConnected) return;
  el.textContent = s.charging
    ? `在此设备上 · 电量 ${s.level}%（充电中）`
    : `在此设备上 · 电量 ${s.level}%`;
});
