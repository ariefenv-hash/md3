// ==================== settings-appnotif.js — 应用通知页（AppNotificationSettings 对标 · #207 三期 · v10.86） ====================
//
// 职责（独立副作用模块，import 即生效；settings-battery.js 同款拆分纪律）：
//   1. 页 35「应用通知」（页 19 all_notifications 行进入）：渠道注册表 → 按应用分组
//      清单（每应用行展开渠道行：名称 + importance 用户可见名 + M3 开关）；
//   2. 渠道开关：channelStore.toggleChannelEnabled（v10.86 #207 二期核，AOSP
//      ChannelEditorDialog checkbox 同语义：关=NONE 记忆原值 / 开=恢复）——
//      页内即提交行内刷新，与通知长按弹层单一真源同仓；
//   3. 空态与 tombstone：无注册渠道 → 空态文案；已删除渠道（tombstone）不在
//      清单显示（AOSP 渠道清单同语义）。
//
// 诚实标注（超越边界在录）：
//   - 应用级完全封锁（AOSP AppNotificationSettings 顶部 blocked switch）md3 未建
//     应用级封锁语义 → 留点零假装（本页仅渠道级开关）；
//   - importance 五级选择器（AOSP ChannelRow importance dialog）留点——本页展示
//     importance 用户可见名 + 开关，修改入口为通知长按弹层同款渠道语义；
//   - app 名解析走桌面 .app-icon[data-id] aria-label（去尾「应用」），零 apps-data
//     导入防循环（settings.js 侧模块依赖纪律），查无图标回退 appId 原样展示。
//
// 拆分纪律：仅依赖 aosp/notification-channel.js 叶子模块与全局 document；
// 元素由 settings.js 页面模板产出（晚于本模块执行），getElementById 定位。

import { channelStore, IMPORTANCE_LABELS } from '../aosp/notification-channel.js';
import { setSwitchChecked } from '../m3-controls.js'; // #70：程序化开关真值统一入口

/** innerHTML 落点转义（渠道名/应用名来自 iframe 应用声明面，防 HTML 注入——sanitize 同纪律） */
function esc(s) {
// v10.86 #240：单源委托——转义实现收敛 apps/_shared/sanitize.js escapeHtml（本文件正则链退役，负向锚 tests/v240）
  return window.__mdEscape(s);
}

/** 桌面图标 aria-label → 应用名（去尾「应用」；查无 → appId 原样） */
function resolveAppName(appId) {
  try {
    const el = document.querySelector(`.app-icon[data-id="${CSS.escape(appId)}"]`);
    const label = el && el.getAttribute('aria-label');
    if (label && label.endsWith('应用')) return label.slice(0, -2);
  } catch (e) { /* 查无走回退 */ }
  return appId;
}

/** 渠道注册表 → 按应用分组（tombstone 不入清单；组内按渠道名排序） */
export function groupChannelsByApp(state) {
  const groups = new Map();
  const channels = (state && state.channels) || {};
  for (const k of Object.keys(channels)) {
    const rec = channels[k];
    if (!rec || rec.deleted) continue; // tombstone 不显示（AOSP 渠道清单同语义）
    if (!groups.has(rec.appId)) groups.set(rec.appId, []);
    groups.get(rec.appId).push(rec);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-Hans-CN'));
  }
  return groups;
}

/** 渲染页 35（元素不存在/已离场时静默跳过） */
export function renderAppNotifPage() {
  const listEl = document.getElementById('appNotifList');
  if (!listEl || !listEl.isConnected) return;
  const emptyEl = document.getElementById('appNotifEmpty');
  const groups = groupChannelsByApp(channelStore.getState());

  if (emptyEl) emptyEl.style.display = groups.size === 0 ? '' : 'none';
  if (!groups.size) {
    listEl.innerHTML = '';
    return;
  }

  const cards = [];
  for (const [appId, recs] of groups) {
    const appName = resolveAppName(appId);
    const on = recs.filter((r) => r.importance !== 0).length;
    const rows = recs.map((r) => `
      <div class="md3-list-item" data-test="appnotif-channel-row" data-app="${esc(r.appId)}" data-ch="${esc(r.channelId)}" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
        <span style="flex:1;min-width:0;"><span style="display:block;font-size:14px;">${esc(r.name)}</span><span style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);" data-role="imp">${IMPORTANCE_LABELS[r.importance] || '默认'}</span></span>
        <label class="md3-switch"><input type="checkbox" class="appnotif-ch-switch" data-app="${esc(r.appId)}" data-ch="${esc(r.channelId)}" ${r.importance !== 0 ? 'checked' : ''}><span class="slider"><span class="thumb"></span></span></label>
      </div>`).join('');
    cards.push(`
      <div class="md3-card" data-test="appnotif-app-card" data-app="${esc(appId)}" style="padding:4px 0;margin-top:12px;overflow:hidden;text-align:left;">
        <div class="md3-list-item" style="cursor:default;min-height:56px;">
          <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;font-weight:500;">${esc(appName)}</span><span style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);">${recs.length} 个渠道 · ${on} 个已开启</span></span>
        </div>
        <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
        ${rows}
      </div>`);
  }
  listEl.innerHTML = cards.join('');
}

document.addEventListener('app-page-active', (e) => {
  if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 35) {
    renderAppNotifPage();
  }
});

// 渠道开关：页内即提交（toggleChannelEnabled 二期核单一真源——与长按弹层同仓同语义）
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t || !t.classList || !t.classList.contains('appnotif-ch-switch')) return;
  const appId = t.getAttribute('data-app');
  const channelId = t.getAttribute('data-ch');
  if (!appId || !channelId) return;
  channelStore.toggleChannelEnabled(appId, channelId);
  // 行内即时刷新（importance 用户可见名 + 开关几何 #70）
  const row = t.closest('[data-test="appnotif-channel-row"]');
  if (row) {
    const impEl = row.querySelector('[data-role="imp"]');
    const rec = channelStore.getNotificationChannel(appId, channelId);
    if (impEl && rec) impEl.textContent = IMPORTANCE_LABELS[rec.importance] || '默认';
  }
  setSwitchChecked(t, channelStore.effectiveImportance(appId, channelId) !== 0); // #70
  // 应用行摘要同步（N 个渠道 · M 个已开启）
  renderAppNotifPage();
});
