// ==================== settings-wellbeing.js — 数字健康页（Digital Wellbeing 对标 · #96 一期 · v10.48） ====================
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
// v10.48 #96 三期：应用计时器/专注模式判定面（aosp/wellbeing-focus.js 纯叶子零环——usageStore 同款拆分纪律）
import { wellbeingStore } from '../aosp/wellbeing-focus.js';
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

/** 限时档位轮转（AOSP 计时器预设档近似：未限时 → 15 → 30 分钟 → 1 → 2 小时） */
const TIMER_PRESETS = [0, 15, 30, 60, 120];

/** 限时分钟格式化（0 = 未限时；60/120 小时话语域） */
export function formatLimitMin(min) {
  const n = Number(min);
  if (!Number.isFinite(n) || n <= 0) return '未限时';
  if (n === 60) return '1 小时';
  if (n === 120) return '2 小时';
  return `${n} 分钟`;
}

/**
 * 桌面可见应用清单（专注模式 chips 真源——.app-icon[data-id] 去重保序；
 * 与 resolveAppName 同一 DOM 源，零 apps-data 导入防循环；removedApps 不在列——留点在录）。
 */
function desktopAppIds() {
  const out = [];
  const seen = {};
  try {
    document.querySelectorAll('.app-icon[data-id]').forEach((el) => {
      const id = el.getAttribute('data-id');
      if (!id || seen[id]) return;
      seen[id] = true;
      out.push(id);
    });
  } catch (e) { /* 桌面未渲染时空清单走空态 */ }
  return out;
}

/** 指定应用当日已用 ms（计时器行/暂停标签口径真源——app-window usedTodayMs 同源） */
function usedTodayMs(appId) {
  try {
    const st = usageStore.getState();
    const bucket = st.days && st.days[usageStore.todayKey()];
    const rec = bucket && bucket[appId];
    return rec ? rec.ms : 0;
  } catch (e) { return 0; }
}

/**
 * v10.48 #96 三期：专注模式区块（开关态回填 + 应用 chips 多选清单——
 * AOSP Focus mode 应用勾选同语义；点击 chip 切换清单成员，开关即提交持久化）。
 */
function renderFocusBlock() {
  const switchEl = document.getElementById('wellbeingFocusSwitch');
  const listEl = document.getElementById('wellbeingFocusApps');
  if (!listEl || !listEl.isConnected) return;
  if (switchEl) switchEl.checked = wellbeingStore.focusActive();
  const inList = new Set(wellbeingStore.focusApps());
  const apps = desktopAppIds();
  if (!apps.length) {
    listEl.innerHTML = '<span style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);">桌面暂无应用图标</span>';
    return;
  }
  listEl.innerHTML = apps.map((id) => `
    <button type="button" class="wb-focus-chip" data-test="wellbeing-focus-chip" data-app="${esc(id)}"
      aria-pressed="${inList.has(id) ? 'true' : 'false'}" style="display:inline-flex;align-items:center;gap:6px;
      padding:6px 14px;border-radius:999px;border:1px solid ${inList.has(id) ? 'var(--md-primary,#a8c7fa)' : 'var(--md-outline-variant,#3a3b3e)'};
      background:${inList.has(id) ? 'var(--md-primary-container,#26418f)' : 'transparent'};
      color:${inList.has(id) ? 'var(--md-on-primary-container,#d3e3fd)' : 'var(--md-on-surface,#e2e2e9)'};
      font-size:13px;cursor:pointer;">${esc(resolveAppName(id))}</button>`).join('');
  listEl.querySelectorAll('[data-test="wellbeing-focus-chip"]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const id = chip.getAttribute('data-app');
      const cur = wellbeingStore.focusApps();
      const next = cur.indexOf(id) !== -1 ? cur.filter((x) => x !== id) : cur.concat([id]);
      wellbeingStore.setFocusApps(next);
      renderFocusBlock();
    });
  });
}

/**
 * v10.48 #96 三期：应用计时器区块（行清单 = 当日排行 ∪ 已设限时应用——
 * 每行今日已用 + 状态（已暂停/剩余）+ 限时档位轮转钮，点击即提交持久化）。
 */
function renderTimersBlock() {
  const boxEl = document.getElementById('wellbeingTimers');
  if (!boxEl || !boxEl.isConnected) return;
  const dayKey = usageStore.todayKey();
  const rows = usageStore.dayTotals(dayKey);
  const limits = wellbeingStore.limits();
  const ids = [];
  const seen = {};
  const push = (id) => { if (id && !seen[id]) { seen[id] = true; ids.push(id); } };
  rows.forEach((r) => push(r.appId));
  Object.keys(limits).forEach(push);
  if (!ids.length) {
    boxEl.innerHTML = '<span style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);">暂有使用记录或限时配置后，此处将列出可限时的应用</span>';
    return;
  }
  boxEl.innerHTML = ids.map((id) => {
    const used = usedTodayMs(id);
    const limit = limits[id] || 0;
    const reason = wellbeingStore.pausedReason(id, used);
    const remain = wellbeingStore.remainingMs(id, used);
    const statusHtml = reason === 'focus'
      ? '<span data-test="wellbeing-paused-tag" style="font-size:12px;color:var(--md-tertiary,#efb8c8);">已暂停（专注）</span>'
      : reason === 'timer'
        ? '<span data-test="wellbeing-paused-tag" style="font-size:12px;color:var(--md-error,#f2b8b5);">已暂停（到限）</span>'
        : limit > 0
          ? `<span style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);">剩余 ${esc(formatUsageMs(remain))}</span>`
          : '';
    return `
      <div class="md3-list-item" data-test="wellbeing-timer-row" data-app="${esc(id)}" style="display:flex;align-items:center;gap:12px;min-height:52px;border-radius:14px;padding:8px 10px;">
        <span style="flex:1;min-width:0;font-size:14px;">${esc(resolveAppName(id))}
          <span style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);padding-top:2px;">今日已用 ${esc(formatUsageMs(used))}</span>
        </span>
        ${statusHtml}
        <button type="button" data-test="wellbeing-timer-btn" data-app="${esc(id)}"
          style="flex:none;padding:6px 12px;border-radius:999px;border:1px solid var(--md-outline-variant,#3a3b3e);
          background:transparent;color:var(--md-primary,#a8c7fa);font-size:13px;cursor:pointer;">${esc(formatLimitMin(limit))}</button>
      </div>`;
  }).join('');
  boxEl.querySelectorAll('[data-test="wellbeing-timer-btn"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-app');
      const cur = wellbeingStore.limitOf(id);
      const idx = TIMER_PRESETS.indexOf(cur);
      const next = TIMER_PRESETS[(idx === -1 ? 0 : idx + 1) % TIMER_PRESETS.length];
      wellbeingStore.setLimit(id, next);
      renderTimersBlock();
    });
  });
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

  // v10.48 #96 二期：设备级统计卡（解锁次数/通知接收数——dayCounters 单一真源）
  const counters = usageStore.dayCounters(dayKey);
  const unlockEl = document.getElementById('wellbeingUnlocks');
  if (unlockEl) unlockEl.textContent = String(counters.unlock);
  const notifEl = document.getElementById('wellbeingNotifs');
  if (notifEl) notifEl.textContent = String(counters.notify);

  // 空态与排行（双锚互斥显示——appnotif 空态同款）
  if (emptyEl) emptyEl.style.display = rows.length === 0 ? '' : 'none';
  if (!rows.length) {
    rankEl.innerHTML = '';
    renderFocusBlock(); // v10.48 #96 三期：空数据态三期区块照常渲染（计时器/专注不依赖使用记录）
    renderTimersBlock();
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
  renderFocusBlock(); // v10.48 #96 三期：专注模式卡
  renderTimersBlock(); // v10.48 #96 三期：应用计时器卡
}

// v10.48 #96 三期：专注开关 change 链（模板静态元素持久存在——document 级委托挂一次）
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'wellbeingFocusSwitch') {
    wellbeingStore.setFocusActive(e.target.checked === true);
    renderFocusBlock();
  }
});

document.addEventListener('app-page-active', (e) => {
  if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 36) {
    renderWellbeingPage();
  }
});
