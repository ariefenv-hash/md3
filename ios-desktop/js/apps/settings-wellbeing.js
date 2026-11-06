// ==================== settings-wellbeing.js — 数字健康页（Digital Wellbeing 对标 · #96 一期 · v10.25） ====================
//
// 职责（独立副作用模块，import 即生效；settings-appnotif.js / settings-battery.js 同款拆分纪律）：
//   1. 页 36「数字健康」（一级入口行 wellbeing 进入，AOSP top_level_settings.xml
//      digital_wellbeing 位次同构）：当日使用时长环形图（SVG 分色弧段，Monet
//      `--md-h` 令牌派生 hue 偏移——准入①零裸色）+ 应用排行清单（时长条形 +
//      打开次数）+ 零数据空态；
//   2. usageStore 单一真源（aosp/app-usage.js，app-window 开/闭链路喂入），
//      app-page-active 页面进入时重渲染（settings-battery refresh 同纪律）。
//
// 诚实标注（超越边界在录）：
//   - Web 域无系统级 UsageStats 埋点（UsageStatsService 真源在 system_server）——
//     统计基于本机应用开/闭记录（前台时长口径），页面注记卡明示；
//   - 分屏/小窗期记为最后打开的应用（单前台模型近似，核内注记同源）；
//   - 二期（解锁次数/通知接收数统计卡）与三期（应用计时器 + 专注模式合并裁决）
//     留点——#96 议题分期规格。
//
// 拆分纪律：仅依赖 aosp/app-usage.js 叶子模块与全局 document；
// 元素由 settings.js 页面模板产出（晚于本模块执行），getElementById 定位。

import { usageStore, usageTotalMs } from '../aosp/app-usage.js';

/** innerHTML 落点转义（appId 来自应用声明面，防 HTML 注入——appnotif esc 同纪律） */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 桌面图标 aria-label → 应用名（去尾「应用」；查无 → appId 原样——appnotif 同款） */
function resolveAppName(appId) {
  try {
    const el = document.querySelector(`.app-icon[data-id="${CSS.escape(appId)}"]`);
    const label = el && el.getAttribute('aria-label');
    if (label && label.endsWith('应用')) return label.slice(0, -2);
  } catch (e) { /* 查无走回退 */ }
  return appId;
}

/** 时长格式化（Wellbeing 话语域：X 小时 Y 分钟 / Y 分钟 / 不足 1 分钟） */
export function formatUsageMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '不足 1 分钟';
  const totalMin = Math.floor(n / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h} 小时 ${m} 分钟`;
  if (h > 0) return `${h} 小时`;
  if (m > 0) return `${m} 分钟`;
  return '不足 1 分钟';
}

/**
 * Monet 分色（准入①零裸色）：hue 偏移锚 var(--md-h,215)（设置主题色单一真源，
 * 随主题切换联动）；偏移表 = 8 档等距轮转（60° 主步 + 收尾 30°/90° 细分——
 * 少于 8 应用时前段主步轮转，超出 RANKING_LIMIT 上限的弧段不渲染）。
 * 返回可直接内联的 color 字符串（calc 在 hsl() hue 位合法 CSS）。
 */
const RING_HUE_STEPS = [0, 60, 120, 180, 240, 300, 30, 90];
export function ringColor(i) {
  const off = RING_HUE_STEPS[i % RING_HUE_STEPS.length];
  return `hsl(calc(var(--md-h,215) + ${off}) 62% 52%)`;
}

/**
 * 环形图 SVG（分色弧段）：frac 累计 share → stroke-dasharray/dashoffset 环段；
 * 起点正上（rotate -90），环段间留 2% 视觉缝（arcGap，纯视觉非语义）。
 * 零数据返回空串（调用方落空态）。
 */
export function buildRingSvg(rows, totalMs) {
  if (!Array.isArray(rows) || !rows.length || !(totalMs > 0)) return '';
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  const segs = [];
  for (let i = 0; i < rows.length && i < RING_HUE_STEPS.length; i++) {
    const ms = Number(rows[i] && rows[i].ms);
    if (!Number.isFinite(ms) || ms <= 0) continue;
    const frac = ms / totalMs;
    const len = Math.max(frac * C - (rows.length > 1 ? C * 0.02 : 0), 0.8);
    const dash = `${len.toFixed(2)} ${(C - len).toFixed(2)}`;
    const offset = (-acc * C).toFixed(2);
    segs.push(`<circle cx="70" cy="70" r="${R}" fill="none" stroke="${ringColor(i)}" stroke-width="16" stroke-linecap="butt" stroke-dasharray="${dash}" stroke-dashoffset="${offset}" transform="rotate(-90 70 70)"></circle>`);
    acc += frac;
  }
  return `<svg viewBox="0 0 140 140" width="148" height="148" role="img" aria-label="今日应用使用时长环形图" data-test="wellbeing-ring-svg">${segs.join('')}
    <text x="70" y="66" text-anchor="middle" font-size="17" font-weight="600" fill="var(--md-on-surface,#e2e2e9)" data-test="wellbeing-ring-total">${esc(formatUsageMs(totalMs))}</text>
    <text x="70" y="86" text-anchor="middle" font-size="11" fill="var(--md-on-surface-variant,#9a9b9e)">今日合计</text>
  </svg>`;
}

/** 渲染页 36（元素不存在/已离场时静默跳过——appnotif renderAppNotifPage 同纪律） */
export function renderWellbeingPage() {
  const ringEl = document.getElementById('wellbeingRing');
  const rankEl = document.getElementById('wellbeingRanking');
  if (!rankEl || !rankEl.isConnected) return;
  const emptyEl = document.getElementById('wellbeingEmpty');
  const dayKey = usageStore.todayKey();
  const rows = usageStore.dayTotals(dayKey);
  const total = usageTotalMs(rows);

  // 环形图卡
  if (ringEl) ringEl.innerHTML = buildRingSvg(rows, total);
  const totalEl = document.getElementById('wellbeingTotal');
  if (totalEl) totalEl.textContent = formatUsageMs(total);
  const countEl = document.getElementById('wellbeingCount');
  if (countEl) countEl.textContent = `${rows.length} 个应用 · ${dayKey}`;

  // 空态与排行（双锚互斥显示——appnotif 空态同款）
  if (emptyEl) emptyEl.style.display = rows.length === 0 ? '' : 'none';
  if (!rows.length) {
    rankEl.innerHTML = '';
    return;
  }
  const maxMs = rows[0].ms || 1;
  const items = rows.map((r, i) => {
    const pct = Math.max(2, Math.round((r.ms / maxMs) * 100));
    return `
      <div class="md3-list-item" data-test="wellbeing-app-row" data-app="${esc(r.appId)}" style="min-height:64px;display:flex;flex-direction:column;justify-content:center;align-items:stretch;gap:6px;border-radius:16px;padding:10px 12px;">
        <span style="display:flex;align-items:center;gap:12px;">
          <span aria-hidden="true" style="width:12px;height:12px;border-radius:50%;flex:none;background:${ringColor(i)};"></span>
          <span style="flex:1;min-width:0;font-size:14px;">${esc(resolveAppName(r.appId))}</span>
          <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">${esc(formatUsageMs(r.ms))} · 打开 ${r.opens} 次</span>
        </span>
        <span aria-hidden="true" style="display:block;height:6px;border-radius:3px;background:var(--md-outline-variant,#3a3b3e);overflow:hidden;">
          <span style="display:block;height:100%;width:${pct}%;border-radius:3px;background:${ringColor(i)};"></span>
        </span>
      </div>`;
  }).join('');
  rankEl.innerHTML = items;
}

document.addEventListener('app-page-active', (e) => {
  if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 36) {
    renderWellbeingPage();
  }
});
