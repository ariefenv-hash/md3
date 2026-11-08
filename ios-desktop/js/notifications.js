// ==================== notifications.js — Android 16 / Pixel 10 MD3 通知中心与全局流媒体联动 ====================

import { ICONS } from './icons.js';
import { getAppIconSVG, hasAppIcon } from './app-icons.js';
import { mediaService } from './media-service.js';
import { initialApps } from './apps-data.js';
import { openApp } from './app-window.js';
import { openPullPanel, closePullPanels, isPullPanelsActive } from './pull-down-gesture.js';
import { playSfx } from './sound-haptics.js';
import { applyClickableSemantics, bindKeyboardClick } from './keyboard-activate.js'; // v10.50 #241 键盘可达接线
// #64 heads-up 堆叠横幅：spring.js 解析闭式解 + motion.js tweenValue（拖拽松手速度接力）
import { channelStore, IMPORTANCE, IMPORTANCE_LABELS, deliveryGate } from './aosp/notification-channel.js'; // v10.59 #207 一期渠道语义 + 二期清单标签
import { usageStore } from './aosp/app-usage.js'; // v10.59 #96 二期：通知接收数计账（aosp 纯叶子零环）
import { normalizeRedactionFields, readLockMode, needsRedaction, redactedView } from './aosp/notification-redaction.js'; // v10.59 #206 锁屏脱敏核（投递侧归一 + 观测面；渲染面在 lock-screen.js）
import { makeSpringParams } from './spring.js';
import { tweenValue } from './motion.js';
// v7.89 remedia 波浪进度条（Media.kt SeekBarTrack 移植版，AOSP 同源）
import { createMediaWave } from './aosp/media-wave.js';
// v9.94 #197 heads-up 时序七常量 + snooze 状态机 + Avalanche 排队（HeadsUpManagerImpl 同构）
import {
  HUN_MINIMUM_TIME_MS,
  headsUpHoldMs,
  shouldHeadsUpBecomePinned,
  sameNotificationContent,
  createSnoozeStore,
  createAvalancheQueue,
} from './aosp/heads-up-timing.js';
// v9.94 #198 ZenMode 全规格：九类×三态裁决（ZenModeConfig/ZenPolicy 同构）——
// 进 feed DISALLOW 拦截 + 横幅 ALLOW 穿透；zenStore 单例与 quick-settings/lock-screen 同源
import {
  zenStore, isZenActive, shouldEnqueueNotification, shouldPeekNotification,
} from './aosp/zen-mode.js';
// v7.25 通知中心 ↔ 日历打通：动态日历通知（同源 localStorage 直读）+ 深链路由。
// 注：app-bus 反向依赖本模块（addSystemNotification）—— 双方均仅在函数体内
// 使用对方导出（非模块顶层求值），ESM 循环安全（函数声明提前绑定）。
import { emitToApp } from './app-bus.js';
import {
  CAL_NOTI_ID, CAL_DISMISS_KEY, CAL_DB_KEY, CAL_LEGACY_PREFIX,
  readCalendarNotes, composeCalNotification, formatRelative
} from './cal-sync.js';
// v10.59 #90 通知 Snooze：NotificationSnooze.java guts 状态机同构（档位 [15,30,60,120]/默认 60
// 为 SystemUI config.xml 实源同值；到期复活双通道——setTimeout + 渲染期惰性清扫）
import {
  createSnoozeMachine,
  resolveSnoozeWakeAt,
  resolveDueSnoozes,
  snoozeOptionsSnapshot,
} from './aosp/notification-snooze.js';
// v10.59 #91 Bubble 一期：展开期通知条目抑制（BubbleController
// isBubbleNotificationSuppressedFromShade 同名同义——展开中气泡的条目从 shade 隐藏避免双显）
import { isSuppressedFromShade, expandedIds } from './aosp/bubbles.js';

// ==================== 通知持久化（批次二：刷新不丢） ====================
// 通知中心原先为纯内存态，刷新即失；现以 localStorage 持久化（上限 30 条）。
// 首次访问（无存储记录）时落一份默认演示通知；此后用户的增删/清空即为真源。
const NOTIS_STORAGE_KEY = 'ios-desktop:notifications';
const MAX_PERSISTED_NOTIFICATIONS = 30;

// fix(audit-B): HTML 转义工具 —— 通知标题/正文/应用名/时间为应用可控文本，
// 插入 innerHTML 前必须转义（与 app-bus.js/permissions.js 同款实现，杜绝注入面）
function escapeHtml(s) {
// v10.59 #240：单源委托——转义实现收敛 apps/_shared/sanitize.js escapeHtml（本文件正则链退役，负向锚 tests/v240）
  return window.__mdEscape(s);
}

// fix(audit-B): 通知图标载荷防御 —— 拒绝携带脚本段/事件处理器属性的 SVG
// （`<svg onload=…>` 同样会在 innerHTML 插入时执行；入口与渲染双保险，
//  覆盖历史已持久化的脏数据）
// v7.65：放行安全位图载荷 —— 安装包应用图标为 dataURL <img>（pkg-icon.js 管线
// 产出），旧实现一律拒绝 → 包应用通知永远回退通用图标。现严格校验：
// <img> 开头 + src 必须为 data:image/* + 无 on* 事件属性 + 无 <script 段。
// 导出供单测直接校验（纯函数，无副作用）。
export function isSafeIconSvg(svg) {
  if (typeof svg !== 'string') return false;
  if (svg.indexOf('<svg') === 0) {
    return !/<script/i.test(svg) && !/\son[a-z]+\s*=/i.test(svg);
  }
  if (svg.indexOf('<img') === 0) {
    const m = svg.match(/src\s*=\s*["']data:image\//);
    return !!m && !/<script/i.test(svg) && !/\son[a-z]+\s*=/i.test(svg);
  }
  return false;
}

function loadPersistedNotifications() {
  try {
    const saved = localStorage.getItem(NOTIS_STORAGE_KEY);
    if (saved === null) return null; // 从未持久化过 → 用默认演示数据
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) return parsed.filter((n) => n && typeof n.title === 'string');
  } catch (e) {}
  return null;
}

function persistNotifications() {
  try {
    // iconSvg 为内联 SVG 字符串（约 0.5KB/条），30 条远小于 5MB 配额
    localStorage.setItem(NOTIS_STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_PERSISTED_NOTIFICATIONS)));
  } catch (e) {}
}

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'n1',
    app: '信息 / Messages',
    appId: 'msg',
    iconSvg: ICONS.notification_chat,
    title: 'Google Pixel 团队',
    desc: '全新 Material 3 Expressive 设计规范已全量上线，体验更专业的独立双分栏与矢量动效！',
    time: '2分钟前',
    category: 'Conversations / 会话通知'
  },
  {
    id: 'n2',
    app: 'Google 日历',
    appId: 'cal_app',
    iconSvg: ICONS.notification_calendar,
    title: '下午 3:00 - 项目架构评审与矢量 UI 验收',
    desc: '地点: 线上会议室 A | 参会人员: 核心设计团队与系统架构组',
    time: '25分钟前',
    category: 'Conversations / 会话通知'
  },
  {
    id: 'n3',
    app: '系统更新',
    appId: 'settings',
    iconSvg: ICONS.notification_system,
    title: 'Android 17 系统体验已更新',
    desc: '已优化控制中心音量/亮度独立滑块，升级高保真 Material You 色彩流',
    time: '1小时前',
    category: 'Silent / 静音与系统通知'
  }
];

const _persisted = loadPersistedNotifications();
let notifications = _persisted ?? [...DEFAULT_NOTIFICATIONS];
if (_persisted === null) persistNotifications(); // 首次访问：把默认演示通知落盘，此后增删即为真源

// ==================== fix(audit-B): 通知数据变更广播 ====================
// 锁屏等外部模块订阅 `notifications-changed` 刷新各自的派生渲染（锁屏通知列表）。
// 仅在真实增/删/改后调度派发；setTimeout(0) 合并同一批次内的多次渲染，防事件风暴。
let _notiChangeTimer = null;
function scheduleNotificationsChanged() {
  if (_notiChangeTimer) return;
  _notiChangeTimer = setTimeout(() => {
    _notiChangeTimer = null;
    try { window.dispatchEvent(new CustomEvent('notifications-changed')); } catch (e) {}
  }, 0);
}

/** 供锁屏等外部模块读取当前通知数据（只读副本）
 *  v10.59 #90：延后期通知不外发（AOSP snooze 后通知离开 shade —— 锁屏/状态栏同真源过滤；
 *  到期复活由渲染期清扫 + setTimeout 双通道驱动） */
export function getNotifications() {
  return [...notifications].filter((n) => !(n && n.snoozeUntil));
}

// ==================== v10.59 #90 Snooze 到期复活 ====================
// AOSP 恢复通道为 NotificationManagerService.snoozeNotification（system_server 持久 untilMs）；
// md3 渲染进程无跨重启定时实体 —— setTimeout 主通道 + 渲染期惰性清扫兑底（跨重启持久化
// snoozeUntil 字段，reload 后首帧 renderNotificationsList 清扫复活）。
const _snoozeTimers = new Map();

function wakeSnoozed(id) {
  _snoozeTimers.delete(id);
  const n = notifications.find((x) => x && x.id === id);
  if (n && n.snoozeUntil) {
    delete n.snoozeUntil;
    persistNotifications();
    renderNotificationsList();
    scheduleNotificationsChanged();
  }
}

/** 派发复活定时（setTimeout 上限 2^31-1ms 鉗 120min 档富余；到期前 reload 由清扫兑底） */
function scheduleSnoozeWake(item) {
  const old = _snoozeTimers.get(item.id);
  if (old) clearTimeout(old);
  const delay = Math.min(item.snoozeUntil - Date.now(), 2147483000);
  if (delay <= 0) { wakeSnoozed(item.id); return; }
  _snoozeTimers.set(item.id, setTimeout(() => wakeSnoozed(item.id), delay));
}

/** 提交延后（handleCloseControls 分支②消费面）：落 snoozeUntil + 定时复活 + 持久化 + 双广播 */
function applySnooze(item, option) {
  item.snoozeUntil = resolveSnoozeWakeAt(option.minutes);
  scheduleSnoozeWake(item);
  persistNotifications();
  renderNotificationsList();
  scheduleNotificationsChanged();
  if (navigator.vibrate) navigator.vibrate(20);
}

/**
 * 通知图标解析：与桌面保持一致 —— 有真实应用图标（appId 命中 APP_ICONS）时
 * 优先用桌面本体图标（含历史已持久化的旧通知，展示时动态解析）；否则回退通用 SVG。
 * 导出供锁屏等同一数据源的渲染方复用。
 * fix(audit-B): iconSvg 为应用可控载荷，不安全时回退系统默认图标（防 SVG 事件注入）。
 */
export function resolveNotiIcon(item) {
  if (item && item.appId && hasAppIcon(item.appId)) return getAppIconSVG(item.appId);
  return (item && isSafeIconSvg(item.iconSvg)) ? item.iconSvg : ICONS.notification_system;
}

export function isRealAppIcon(item) {
  return !!(item && item.appId && hasAppIcon(item.appId));
}

/** 初始化通知中心卡片与媒体播放器 */
export function initNotifications() {
  syncCalendarNotification(); // v7.25：启动即把 n2 刷新为真实日历摘要（有数据时）
  renderNotificationsList();
  initMediaPlayer();
  setupMessageListeners();

  // v7.25：日历应用（同源 iframe）写入笔记 → 宿主 storage 事件实时同步通知/锁屏。
  // （storage 事件仅在其它文档写入时触发 —— 宿主自身不写日历数据，恰为所需语义）
  if (!window.__notiCalSyncBound) {
    window.__notiCalSyncBound = true;
    window.addEventListener('storage', (e) => {
      if (e && e.key && (e.key === CAL_DB_KEY || e.key.indexOf(CAL_LEGACY_PREFIX) === 0)) {
        syncCalendarNotification();
      }
    });
  }

  const clearAllBtn = document.getElementById('notiClearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.innerHTML = `${ICONS.clear_all}<span>清除全部</span>`;
    clearAllBtn.addEventListener('click', () => {
      rememberCalDismiss(); // v7.25：清除全部也视为「已知悉」，同指纹不复现
      notifications = [];
      renderNotificationsList();
      persistNotifications();
      scheduleNotificationsChanged(); // fix(audit-B): 清空也广播数据变更
      if (navigator.vibrate) navigator.vibrate(20);
    });
  }

  const historyBtn = document.getElementById('notiHistoryBtn');
  if (historyBtn) {
    historyBtn.innerHTML = `${ICONS.history}<span>历史记录</span>`;
  }
}

/** 渲染通知卡片列表 (纯矢量 MD3 UI) */
export function renderNotificationsList() {
  const container = document.getElementById('notificationsContainer');
  if (!container) return;

  // v10.59 #90 渲染期惰性清扫：到期通知先复活（兑 setTimeout 漏网/跨页驻留；
  // 复活即持久化 + 广播，本帧继续以复活后真值渲染，无递归）
  {
    const sweep = resolveDueSnoozes(notifications);
    if (sweep.due.length) {
      sweep.due.forEach((n) => { delete n.snoozeUntil; }); // 就地复活（引用同源）
      persistNotifications();
      scheduleNotificationsChanged();
    }
  }
  const activeNotis = notifications.filter((n) =>
    !(n && n.snoozeUntil)
    // v10.59 #91：展开中气泡的条目从 shade 抑制（isBubbleNotificationSuppressedFromShade
    // 同名语义，避免双显）；收起/最小化/全屏接管即恢复（气泡板触发重绘）
    && !isSuppressedFromShade(n, expandedIds()));
  const snoozedNotis = notifications.filter((n) => n && n.snoozeUntil);

  if (activeNotis.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:50px 20px;opacity:0.6;font-size:14px;display:flex;flex-direction:column;align-items:center;gap:10px;">
        <div style="color:var(--md-primary,#a8c7fa);">${ICONS.sound_notifications}</div>
        <span>暂无待处理的新通知</span>
      </div>
    `;
    renderSnoozedSection(container, snoozedNotis);
    return;
  }

  container.innerHTML = '';

  // 按分类分组
  const categories = {};
  activeNotis.forEach((item) => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  Object.keys(categories).forEach((cat) => {
    const titleEl = document.createElement('div');
    titleEl.className = 'noti-section-header';
    titleEl.innerHTML = `
      <span>${escapeHtml(cat)}</span>
      <span style="font-size:11px;opacity:0.7;">${categories[cat].length} 条</span>
    `;
    container.appendChild(titleEl);

    const groupEl = document.createElement('div');
    groupEl.className = 'noti-card-group';

    categories[cat].forEach((item) => {
      const card = document.createElement('div');
      card.className = 'noti-card';
      card.dataset.id = item.id;
      card.style.cursor = 'pointer';

      const realIcon = isRealAppIcon(item);
      // fix(audit-B): title/desc/app/time/category 均为应用可控文本，插 innerHTML 前全量转义
      // v10.59 #90：尾部延后钮（AOSP 长按 → guts 展开态同义入口）+ 档位行（默认隐藏）
      const snoozeChips = snoozeOptionsSnapshot().map((o) =>
        `<button type="button" class="noti-snooze-chip" data-minutes="${o.minutes}" style="border:1px solid var(--md-outline-variant,#c4c7c5);background:transparent;color:var(--md-on-surface,#1f1f1f);font-size:12px;padding:5px 12px;border-radius:999px;cursor:pointer;">${o.isDefault ? o.description + ' · 默认' : o.description}</button>`
      ).join('');
      card.innerHTML = `
        <div class="noti-card-icon ${realIcon ? 'noti-card-icon--app' : ''}">${resolveNotiIcon(item)}</div>
        <div class="noti-card-content">
          <div class="noti-card-top">
            <span class="noti-card-appname">${escapeHtml(item.app)}</span>
            <span style="flex:1;"></span>
            <button type="button" class="noti-snooze-btn" data-test="noti-snooze-btn" title="延后" aria-label="延后通知" style="border:none;background:transparent;color:var(--md-on-surface-variant,#9a9b9e);width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;cursor:pointer;padding:0;">${ICONS.ellipsis}</button>
            <span class="noti-card-time">${escapeHtml(item.time)}</span>
          </div>
          <div class="noti-card-title">${escapeHtml(item.title)}</div>
          <div class="noti-card-desc">${escapeHtml(item.desc)}</div>
          <div class="noti-snooze-options" data-test="noti-snooze-options" style="display:none;gap:6px;flex-wrap:wrap;margin-top:8px;">${snoozeChips}</div>
        </div>
      `;

      // v10.59 #90 档位机接线（AOSP guts 实例同型：每卡一机；选定即提交——
      // handleCloseControls 分支②消费面，md3 单面载体下 guts 关闭=提交同步）
      const snoozeMachine = createSnoozeMachine();
      const snoozeBtn = card.querySelector('.noti-snooze-btn');
      const snoozeRow = card.querySelector('.noti-snooze-options');
      if (snoozeBtn && snoozeRow) {
        snoozeBtn.addEventListener('pointerdown', (e) => e.stopPropagation()); // 不入卡滑手势链
        snoozeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          snoozeMachine.toggleOptions(); // showSnoozeOptions(!mExpanded) 同构
          snoozeRow.style.display = snoozeMachine.expanded ? 'flex' : 'none';
        });
        snoozeRow.querySelectorAll('.noti-snooze-chip').forEach((chip) => {
          chip.addEventListener('pointerdown', (e) => e.stopPropagation());
          chip.addEventListener('click', (e) => {
            e.stopPropagation();
            const opt = snoozeMachine.options.find((o) => String(o.minutes) === chip.dataset.minutes);
            if (!opt) return;
            snoozeMachine.select(opt, true); // setSelected(userAction) 同构
            const res = snoozeMachine.handleCloseControls(); // 分支②提交 snooze
            snoozeRow.style.display = 'none';
            if (res.snooze) applySnooze(item, res.snooze);
          });
        });
      }

      // v10.59 #207 二期：通知卡长按 → 「全部类别」渠道清单弹层（AOSP NotificationInfo
      // 长按 → guts「All categories」→ ChannelEditorDialog 同语义）。与滑手势共存：
      // 位移超 10px 取消计时；长按释放后的 click 守卫（见下方 click 处理首行）防误触直达
      let lpTimer = 0, lpFired = false;
      const lpCancel = () => { clearTimeout(lpTimer); lpTimer = 0; };
      card.addEventListener('pointerdown', (e) => {
        if (card._isSwiping) return;
        lpFired = false;
        const sx = e.clientX, sy = e.clientY;
        lpTimer = setTimeout(() => {
          lpFired = true;
          openChannelEditor(item.appId || '', item.app || '');
        }, 500);
        const lpMove = (ev) => {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) lpCancel();
        };
        const lpEnd = () => { lpCancel(); window.removeEventListener('pointermove', lpMove); window.removeEventListener('pointerup', lpEnd); window.removeEventListener('pointercancel', lpEnd); };
        window.addEventListener('pointermove', lpMove, { passive: true });
        window.addEventListener('pointerup', lpEnd, { passive: true });
        window.addEventListener('pointercancel', lpEnd, { passive: true });
      });

      // 点击通知卡片直达对应应用（以卡片图标位置为动画源，放射动画从点按处起飞）
      // v10.50 #241 键盘可达：卡片本体 role=button + Tab 聚焦 + Enter/Space 触发
      //（既有 click 链全保留：滑手势互斥/长按尾随吞 click/深链路由不变）
      applyClickableSemantics(card, { role: 'button', label: `${item.app}：${item.title}` });
      bindKeyboardClick(card);
      card.addEventListener('click', (e) => {
        if (card._isSwiping) return;
        if (lpFired) { lpFired = false; return; } // v10.59 #207 二期：长按释放后尾随 click 防误触
        const cardIconRect = card.querySelector('.noti-card-icon')?.getBoundingClientRect() || null;
        closePullPanels();
        // v7.25：深链通知（如动态日历摘要）→ 总线投递 + 定位打开
        if (routeDeepLink(item.deepLink, cardIconRect)) return;
        const targetAppId = item.appId || (item.app.includes('信息') ? 'msg' : (item.app.includes('日历') ? 'calendar' : 'settings'));
        const appIdx = initialApps.findIndex(a => a.id === targetAppId);
        if (appIdx !== -1) {
          openApp(appIdx, null, cardIconRect);
        }
      });

      // 左右滑动消除通知
      let startX = 0;
      let startY = 0;
      card.addEventListener('pointerdown', (e) => {
        // fix(audit-B): 通知卡横滑删除与下拉面板横滑切页手势冲突 ——
        // pull-down-gesture 的豁免列表不含 .noti-card，按下事件在卡片级截停，
        // 面板切页判定（window 级 pointerdown/pointermove）收不到本手势；
        // 滑删除本体改挂卡片 + setPointerCapture，捕获期移动事件同样不外传。
        e.stopPropagation();
        startX = e.clientX;
        startY = e.clientY;
        card._isSwiping = false;

        let captured = false;
        try { card.setPointerCapture(e.pointerId); captured = true; } catch (err) { /* 环境不支持时降级 window 级监听 */ }

        /** 释放卡片对手势的接管（垂直意图时交还面板用） */
        const releaseCardControl = (pid) => {
          if (captured) {
            try { card.releasePointerCapture(pid); } catch (err) {}
            card.removeEventListener('pointermove', onMove);
            card.removeEventListener('pointerup', onUp);
            card.removeEventListener('pointercancel', onUp);
          } else {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
          }
        };

        const onMove = (me) => {
          const raw = me.clientX - startX;
          const dragDy = me.clientY - startY;
          // v7.86（AOSP NotificationSwipeHelper 同构）：垂直意图优先交还面板 ——
          // 源码 onInterceptTouchEvent 里 |dy| > touchSlop 且 |dy| > |dx| 时 swipe 手势
          // 取消、事件返还父级（面板 expand/dismiss 接管）。此前卡片无条件截停整条
          // 手势链：竖向上滑既不进面板的收起判定，松手后 click 又原样落到卡片 →
          // 「上滑关面板」实为「误开应用」（第三方体检 E2E 实锤）。判定阈值：
          // |dy| > 8px 且 |dy| > 1.2|dx|（对角模糊带偏向面板，与源码斜率判据同义）。
          if (!card._isSwiping && Math.abs(dragDy) > 8 && Math.abs(dragDy) > Math.abs(raw) * 1.2) {
            if (typeof window !== 'undefined') (window.__dbg4 = window.__dbg4 || []).push(['handoff', dragDy.toFixed(0), raw.toFixed(0), 'cap=' + captured]);
            releaseCardControl(me.pointerId);
            card.style.transform = '';
            card.style.opacity = '';
            // 补发虚拟 pointerdown：面板手势状态机（window 级）从当前位置接管，
            // 后续真实 pointermove/pointerup 自然冒泡到 window 驱动跟手与结算；
            // 提交时面板自有的尾随 click 吞噬（v7.86）会拦下浏览器合成的本次 click。
            // 派发目标用 overlay（面板根，必有且无自身 pointerdown 监听）——
            // 派发到 window 会让 e.target 变成 window，面板处理器里 closest() 直接抛错；
            // 派发到卡片自身会再次命中本监听器造成递归截停。
            try {
              const panelRoot = document.getElementById('pullPanelsOverlay') || me.target;
              panelRoot.dispatchEvent(new PointerEvent('pointerdown', {
                bubbles: true, cancelable: true, composed: true,
                clientX: me.clientX, clientY: me.clientY,
                pointerId: me.pointerId, pointerType: me.pointerType, isPrimary: true, button: 0,
              }));
            } catch (err) { /* PointerEvent 构造不可用：维持旧行为（卡片截停） */ }
            return;
          }
          me.stopPropagation(); // 仅横滑期间吞移动事件（垂直意图已交还面板）
          // v7.48：滑移阻尼上限 —— 旧实现 dx 无界，通知卡可被拖到屏幕外任意远
          // （issue 用户实测「消息直接滑出屏幕」）；iOS 同款：越过阻尼带后按
          // 0.35 系数衰减，可视拖距钳在 ±220px 内，松手飞出/回弹判定不变。
          const damp = 160 + (Math.abs(raw) - 160) * 0.35;
          const dx = Math.abs(raw) <= 160 ? raw : Math.sign(raw) * damp;
          if (Math.abs(dx) > 6) card._isSwiping = true;
          card.style.transform = `translate3d(${dx}px, 0, 0)`;
          card.style.opacity = Math.max(0, 1 - Math.abs(dx) / 200).toString();
        };

        const onUp = (ue) => {
          ue.stopPropagation();
          releaseCardControl(ue.pointerId);
          const totalDx = ue.clientX - startX;
          if (Math.abs(totalDx) > 85) {
            card.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
            card.style.transform = `translate3d(${totalDx > 0 ? 320 : -320}px, 0, 0)`;
            card.style.opacity = '0';
            if (item.id === CAL_NOTI_ID) rememberCalDismiss(); // v7.25：滑掉日历通知 = 已知悉
            setTimeout(() => {
              notifications = notifications.filter(n => n.id !== item.id);
              renderNotificationsList();
              persistNotifications();
              scheduleNotificationsChanged(); // fix(audit-B): 删除也广播数据变更
            }, 220);
          } else {
            card.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            card.style.transform = '';
            card.style.opacity = '';
          }
        };

        if (captured) {
          card.addEventListener('pointermove', onMove);
          card.addEventListener('pointerup', onUp);
          card.addEventListener('pointercancel', onUp);
        } else {
          // 降级路径：保持原有 window 级监听（老浏览器/部分测试环境无 pointer capture）
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
          window.addEventListener('pointercancel', onUp); // 系统接管手势时同样清理，防监听泄漏
        }
      });

      groupEl.appendChild(card);
    });

    container.appendChild(groupEl);
  });

  // v10.59 #90 已延后区（snoozed leave-behind：AOSP 延后后通知离开 shade 主列，
  // 恢复前以半透明区承载 + 撤销入口，undoSnooze 同构语义）
  renderSnoozedSection(container, snoozedNotis);
}

/** v10.59 #90 已延后区：确认文案 + 撤销恢复（undoSnooze 同构——撤销后回主列） */
function renderSnoozedSection(container, snoozedNotis) {
  if (!snoozedNotis || snoozedNotis.length === 0) return;
  const header = document.createElement('div');
  header.className = 'noti-section-header';
  header.dataset.test = 'noti-snoozed-header';
  header.innerHTML = `
    <span>已延后</span>
    <span style="font-size:11px;opacity:0.7;">${snoozedNotis.length} 条</span>
  `;
  container.appendChild(header);
  const groupEl = document.createElement('div');
  groupEl.className = 'noti-card-group';
  snoozedNotis.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'noti-card';
    card.dataset.id = item.id;
    card.dataset.test = 'noti-snoozed-card';
    card.style.cursor = 'default';
    card.style.opacity = '0.55';
    card.innerHTML = `
      <div class="noti-card-icon">${resolveNotiIcon(item)}</div>
      <div class="noti-card-content">
        <div class="noti-card-top">
          <span class="noti-card-appname">${escapeHtml(item.app)}</span>
          <span style="flex:1;"></span>
          <span style="font-size:12px;color:var(--md-primary,#a8c7fa);">延后中</span>
        </div>
        <div class="noti-card-title">${escapeHtml(item.title)}</div>
        <div class="noti-card-desc">${escapeHtml(item.desc)} · 到期自动恢复</div>
        <button type="button" class="noti-snooze-undo" data-test="noti-snooze-undo" style="margin-top:8px;border:none;background:transparent;color:var(--md-primary,#a8c7fa);font-size:13px;font-weight:500;padding:4px 0;cursor:pointer;">恢复</button>
      </div>
    `;
    const undoBtn = card.querySelector('.noti-snooze-undo');
    if (undoBtn) {
      undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        delete item.snoozeUntil; // undoSnooze：撤销选定回主列（handleCloseControls 分支②逆操作）
        persistNotifications();
        renderNotificationsList();
        scheduleNotificationsChanged();
      });
    }
    groupEl.appendChild(card);
  });
  container.appendChild(groupEl);
}

/** 初始化流媒体播放器胶囊 (Pixel 10 Media Player 真实联动与显影过渡) */
function initMediaPlayer() {
  const mediaCard = document.getElementById('pixelMediaCard');
  const coverEl = document.getElementById('mediaCoverIcon');
  const prevBtn = document.getElementById('mediaPrevBtn');
  const nextBtn = document.getElementById('mediaNextBtn');
  const playBtn = document.getElementById('mediaPlayPauseBtn');
  const titleEl = document.getElementById('mediaTrackTitle');
  const artistEl = document.getElementById('mediaArtistName');
  const barEl = document.getElementById('mediaProgressBar');
  const trackContainer = document.querySelector('.media-progress-track');

  // v7.89 remedia 波浪进度条接管轨道（Media.kt SeekBarTrack）；旧填充条退役隐藏
  let wave = null;
  const fillEl = barEl;
  if (trackContainer) {
    if (fillEl) fillEl.style.display = 'none';
    trackContainer.style.overflow = 'visible';  // 振幅 ±3px 越出 4px 容器（expressive 有机形态）
    trackContainer.style.background = 'transparent'; // inactive 平线由波浪自绘（White@30%）
    wave = createMediaWave(trackContainer);
    trackContainer.classList.add('has-wave');
  }
  if (trackContainer && wave) {
    // 进度条拖拽/点击跳转（容器矩形 → 百分比 → mediaService.seek；波浪跟随回显）
    trackContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = trackContainer.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      mediaService.seek(pct);
    });
  }

  if (coverEl) coverEl.innerHTML = ICONS.song_search || ICONS.media_play;
  if (prevBtn) {
    prevBtn.innerHTML = ICONS.skip_prev;
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mediaService.prev();
      if (navigator.vibrate) navigator.vibrate(15);
    });
  }
  if (nextBtn) {
    nextBtn.innerHTML = ICONS.skip_next;
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mediaService.next();
      if (navigator.vibrate) navigator.vibrate(15);
    });
  }
  if (playBtn) {
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mediaService.togglePlay();
      if (navigator.vibrate) navigator.vibrate(15);
    });
  }

  // 点击卡片背景可直达音乐应用（以媒体封面位置为动画源）
  if (mediaCard) {
    // v10.50 #241 键盘可达：媒体卡本体 role=button（prev/play/next 为原生 button，
    // 内部按钮 Enter 事件冒泡到卡片的 keydown 桥 —— click 处理首行的 button 归属守卫照常拦截）
    applyClickableSemantics(mediaCard, { role: 'button', label: '打开音乐' });
    bindKeyboardClick(mediaCard);
    mediaCard.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('.media-progress-track')) return;
      const coverRect = document.getElementById('mediaCoverIcon')?.getBoundingClientRect() || null;
      closePullPanels();
      const appIdx = initialApps.findIndex(a => a.id === 'music');
      if (appIdx !== -1) {
        openApp(appIdx, null, coverRect);
      }
    });
  }

  // 进度条拖拽/点击跳转
  // v7.89：跳转监听已上移至波浪接管段（同一容器，一次性绑定）

  // 订阅真实媒体状态，联动显影过渡与音频状态
  // v7.89 非驻留门控（AOSP MediaRepository 语义）：canBeRemoved = !isPlaying && isClearable
  // && !active → 无播放会话的条目不挂载（addCurrentUserMediaEntry 拒绝）；会话存在
  // （播放中或已有进度）才呈现，暂停中会话保留 —— 与 qsMediaCard 同一判定，双卡一致
  mediaService.subscribe((state) => {
    if (mediaCard) {
      const hasSession = state.isPlaying || state.progress > 0;
      mediaCard.classList.toggle('media-hidden', !hasSession);
      mediaCard.classList.toggle('media-playing', !!state.isPlaying);
      // v7.93 卡片底色回归 CSS 纯色（surface-container）—— coverGradient 渐变底退役，
      // 用户裁定渐变底不符扁平视觉标识；AOSP MediaControlPanel 卡底亦为纯 surface 色
    }

    if (titleEl) titleEl.textContent = state.track.title;
    if (artistEl) artistEl.textContent = `${state.track.artist} • ${state.track.album || '电台'}`;
    // v9.94 #118：真封面渲染（track.coverUrl 由本地导入 ID3/FLAC/MP4 解析或外部上报；
    // 无封面回落既有字形图标 —— 双通道零裸色，样式全 --md-* 令牌）
    if (coverEl) {
      const coverUrl = state.track && state.track.coverUrl;
      if (coverUrl) {
        if (!coverEl.querySelector('img') || coverEl.querySelector('img').src !== coverUrl) {
          coverEl.innerHTML = '';
          const img = document.createElement('img');
          img.className = 'noti-media-cover-img';
          img.src = coverUrl;
          img.alt = '';
          coverEl.appendChild(img);
        }
      } else if (coverEl.querySelector('img')) {
        coverEl.innerHTML = ICONS.song_search || ICONS.media_play;
      }
    }
    if (wave) {
      wave.setProgress((state.progress || 0) / 100);
      // v8.16 #40：进度外推速率（播放中 = 1/duration p01/s；暂停/未知 0 不外推）——
      // thumb 在 wave rAF 内随帧连续推进，根治 timeupdate ~4Hz 离散跳变停顿感
      wave.setRate(state.isPlaying && state.duration > 0 ? 1 / state.duration : 0);
      wave.setPlaying(!!state.isPlaying);
    } else if (barEl) {
      barEl.style.width = `${state.progress.toFixed(1)}%`;
    }
    if (playBtn) playBtn.innerHTML = state.isPlaying ? ICONS.pause : ICONS.play;
  });
}

/** 监听来自应用 (如 Messages) 的实时通信与双向删除同步 */

// fix(audit-B): 消息来源校验 —— 仅接受桌面自身（window）或当前文档内已挂载 iframe 的
// contentWindow：覆盖 page-stack 常驻实例（.app-instance-wrapper）、分屏窗格
// （[data-bus-app-id]）与多任务实时预览卡；应用 iframe 内再嵌套的第三方页面、
// 已摘除 iframe、弹窗等来源一律拒绝（防伪造通知/按文本误删通知的注入面）。
function isTrustedMessageSource(source) {
  if (!source) return false;
  if (source === window) return true; // 桌面自身 postMessage（同窗）
  const frames = document.querySelectorAll('iframe');
  for (let i = 0; i < frames.length; i++) {
    try {
      if (frames[i].contentWindow === source) return true;
    } catch (e) { /* 跨域/已销毁上下文时忽略（引用比对本身跨域安全） */ }
  }
  return false;
}

function setupMessageListeners() {
  window.addEventListener('message', (e) => {
    // fix(audit-B): 通知链路无来源校验 —— 非可信来源直接丢弃，后续分支不再触达
    if (!isTrustedMessageSource(e.source)) return;
    if (!e.data || !e.data.type) return;

    if (e.data.type === 'NEW_MESSAGE_NOTIFICATION') {
      const payload = e.data.payload;
      addSystemNotification({
        id: payload.id || ('msg-' + Date.now()),
        app: payload.appName || '信息 / Messages',
        appId: 'msg',
        iconSvg: ICONS.notification_chat,
        title: payload.title,
        desc: payload.desc,
        time: payload.time || '刚刚',
        category: 'Conversations / 会话通知',
        // v10.59 #91：会话通知默认气泡资格（AOSP MessagingStyle 会话 + 允许 bubble 的同构映射）
        canBubble: true,
      });
    }

    // 统一通知 API（建议文档·第二档 #5）：任意子应用可通过注入的
    // window.__system.notify({ appId, appName, title, desc, iconSvg }) 发送系统通知，
    // 桌面统一渲染为 Heads-up 横幅 + 进通知中心 + 锁屏可见（与原生通知同一条链路）
    if (e.data.type === 'NOTIFY' && e.data.payload) {
      const p = e.data.payload;
      // fix(audit-B): 图标载荷走安全校验（拒绝携带脚本/事件处理器的 SVG），不再裸收
      const iconSvg = isSafeIconSvg(p.iconSvg)
        ? p.iconSvg
        : ICONS.notification_system;
      addSystemNotification({
        id: p.id || ('notify-' + Date.now()),
        app: p.appName || '系统服务',
        appId: p.appId || '',
        iconSvg,
        title: String(p.title || '通知'),
        desc: String(p.desc || p.body || ''),
        time: '刚刚',
        category: p.category || '应用通知 / App Notifications',
        // v9.94 #198：ZenPolicy 九类显式通道（zenCategory/zenKind）与横幅语义标记
        // （sticky/pin/auto，#197 投递方通道）透传 —— 通知裁决所需标记不再被白名单丢弃
        zenCategory: p.zenCategory,
        zenKind: p.zenKind,
        sticky: p.sticky,
        pin: p.pin,
        auto: p.auto,
        // v10.59 #91：气泡资格投递方通道（显式 opt-in；会话通知另有 NEW_MESSAGE 自动资格）
        canBubble: p.canBubble,
        // v10.59 #207：渠道声明投递方透传（缺省走隐式 DEFAULT 渠道，旧档零破坏）
        channelId: p.channelId,
        // v10.59 #206：脱敏声明投递方透传（visibility 三常量 + publicVersion 独立 Notification 体；
        // 归一在 addSystemNotification 入口 normalizeRedactionFields——junk 钳制/剔除不透传到存档）
        visibility: p.visibility,
        publicVersion: p.publicVersion,
      });
    }

    if (e.data.type === 'DELETE_MESSAGE_NOTIFICATION') {
      const payload = e.data.payload;
      if (payload) {
        notifications = notifications.filter(n => {
          if (payload.notiId && (n.id === payload.notiId || n.id === ('msg-' + payload.notiId))) return false;
          if (payload.text && n.desc && n.desc.trim() === payload.text.trim()) return false;
          if (payload.chatName && n.title && n.title.includes(payload.chatName)) return false;
          return true;
        });
        renderNotificationsList();
        persistNotifications();
        scheduleNotificationsChanged(); // fix(audit-B): 远端删除也广播数据变更
      }
    }

    if (e.data.type === 'SWITCH_PERSONA_NOTIFICATION') {
      const payload = e.data.payload;
      showHeadsUpPill(`切换身份：${payload.name}`);
    }
  });
}

// ==================== v7.25 通知中心 ↔ 日历应用打通 ====================
// 预设三条演示通知中，日历条目（n2）原先为硬编码假数据 —— 现改为动态同步：
// 日历应用（同源 iframe）写入 localStorage 的笔记数据实时反映到通知中心与锁屏；
// 点击直达日历并深链定位到对应日期。用户滑掉后，数据指纹（日期+数量+更新时间）
// 不变则不再打扰，变化后作为「新通知」重新浮现。

function buildCalNotiItem(info) {
  return {
    id: CAL_NOTI_ID,
    app: '日历',
    appId: 'cal_app',
    iconSvg: ICONS.notification_calendar,
    title: info.title,   // 如「今天 · 3 篇笔记」
    desc: info.desc,     // 如「最新：项目架构评审」
    time: formatRelative(info.latestUpdated),
    category: '应用通知 / App Notifications',
    deepLink: { appId: 'cal_app', event: 'calendar/prefill', payload: { date: info.key, view: 'day' } },
    __digest: info.digest,
  };
}

/** 读日历真实数据 → 刷新 n2 条目（演示态 ↔ 动态实时互换） */
function syncCalendarNotification() {
  let info = null;
  try { info = composeCalNotification(readCalendarNotes(window.localStorage)); } catch (e) { return; }
  const digest = info ? info.digest : 'demo';
  const idx = notifications.findIndex((n) => n.id === CAL_NOTI_ID);
  let changed = false;

  if (info) {
    const item = buildCalNotiItem(info);
    if (idx === -1) {
      // 条目不在场（被用户滑掉/清除）：仅当数据指纹变化时重新浮现
      let dismissed = null;
      try { dismissed = localStorage.getItem(CAL_DISMISS_KEY); } catch (e) {}
      if (dismissed === digest) return;
      notifications.unshift(item);
      changed = true;
    } else if (notifications[idx].title !== item.title || notifications[idx].desc !== item.desc) {
      // 演示态/旧摘要 → 实时刷新为真实数据
      notifications[idx] = item;
      changed = true;
    }
  } else if (idx !== -1 && notifications[idx].deepLink) {
    // 数据被清空：动态态回落为演示文案（首次体验不空窗）
    notifications[idx] = { ...DEFAULT_NOTIFICATIONS[1] };
    changed = true;
  }

  if (changed) {
    renderNotificationsList();
    persistNotifications();
    scheduleNotificationsChanged(); // 锁屏列表同源刷新
  }
}

/** 滑掉/清除日历通知时记录数据指纹（同指纹不复现，数据更新才回来） */
function rememberCalDismiss() {
  const idx = notifications.findIndex((n) => n.id === CAL_NOTI_ID);
  if (idx === -1) return;
  try { localStorage.setItem(CAL_DISMISS_KEY, notifications[idx].__digest || 'demo'); } catch (e) {}
}

/** 通知深链路由：emitToApp（app-bus 补投机制保证目标应用就绪后收到）+ 按图标位姿打开 */
function routeDeepLink(dl, sourceRect) {
  if (!dl || !dl.appId || !dl.event) return false;
  const appIdx = initialApps.findIndex((a) => a.id === dl.appId);
  if (appIdx === -1) return false;
  emitToApp(dl.appId, dl.event, Object.assign({}, dl.payload || {}, { __silent: true }), 'notifications');
  openApp(appIdx, null, sourceRect);
  return true;
}

// ==================== v10.59 #207 二期：长按「全部类别」渠道清单弹层（AOSP NotificationInfo 长按 →
// guts「All categories」→ ChannelEditorDialog 同语义） ====================
//
// 面边界：弹层清单 = 该应用非 tombstone 渠道逐行（名称 + importance 标签 + M3 开关）；
// 开关 = channelStore.toggleChannelEnabled（关=NONE 记忆原值 / 开=恢复原值，一期投递矩阵零新闸）；
// tombstone 渠道不渲染（AOSP 删除后不可见）；底部提示 = AOSP "Deleted channels can't be
// recovered" 同语义。设置→应用→通知页（AppNotificationSettings 对标）为三期留点。
let channelEditorEl = null;

function openChannelEditor(appId, appName) {
  if (!channelEditorEl || !channelEditorEl.isConnected) {
    channelEditorEl = document.createElement('div');
    channelEditorEl.id = 'channelEditorDialog';
    channelEditorEl.style.cssText = `position:fixed;inset:0;z-index:10100;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.4);`;
    channelEditorEl.addEventListener('click', (e) => { if (e.target === channelEditorEl) channelEditorEl.style.display = 'none'; });
    document.body.appendChild(channelEditorEl);
  }
  const render = () => {
    const st = channelStore.getState();
    const rows = Object.values(st.channels).filter((r) => r.appId === appId && !r.deleted);
    const rowHtml = rows.map((r) => {
      const on = r.importance !== IMPORTANCE.NONE;
      const label = IMPORTANCE_LABELS[r.importance] || IMPORTANCE_LABELS[3];
      return `<label style="display:flex;align-items:center;gap:10px;padding:12px 4px;border-bottom:1px solid var(--md-outline-variant,#c4c7c5);cursor:pointer;">
        <span style="flex:1;min-width:0;">
          <span style="display:block;font-size:14px;color:var(--md-on-surface,#1f1f1f);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(r.name)}</span>
          <span style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);">${label}${r.userBlocked ? ' · 已关闭' : ''}</span>
        </span>
        <input type="checkbox" class="ch-editor-sw" data-ch="${escapeHtml(r.channelId)}" ${on ? 'checked' : ''} aria-label="渠道开关">
      </label>`;
    }).join('');
    channelEditorEl.innerHTML = `
      <div role="dialog" aria-label="通知类别" style="width:min(86vw,360px);max-height:70vh;overflow:auto;background:var(--md-surface-container-high,#f0f2f6);border-radius:28px;padding:20px 22px;color:var(--md-on-surface,#1f1f1f);">
        <div style="font-size:16px;font-weight:600;margin-bottom:4px;">全部类别</div>
        <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:10px;">${escapeHtml(appName || appId || '')}</div>
        ${rowHtml || '<div style="padding:18px 0;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">该应用未声明任何通知渠道</div>'}
        <div style="margin-top:12px;font-size:11.5px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.5;">已删除的渠道无法恢复；应用重新创建同名渠道时将恢复原设置</div>
        <div style="display:flex;justify-content:flex-end;margin-top:14px;">
          <button type="button" class="ch-editor-close" style="border:none;background:transparent;color:var(--md-primary,#0b57d0);font-size:14px;font-weight:500;padding:6px 12px;border-radius:999px;cursor:pointer;">完成</button>
        </div>
      </div>`;
    channelEditorEl.querySelectorAll('.ch-editor-sw').forEach((sw) => {
      sw.addEventListener('change', () => {
        channelStore.toggleChannelEnabled(appId, sw.dataset.ch);
        render(); // AOSP ChannelEditorDialog：开关即提交，行内状态与 importance 标签即时刷新
      });
    });
    const close = channelEditorEl.querySelector('.ch-editor-close');
    if (close) close.addEventListener('click', () => { channelEditorEl.style.display = 'none'; });
  };
  channelEditorEl.style.display = 'flex';
  render();
  return channelEditorEl;
}

/** 动态添加通知并弹出顶部 Heads-up 堆叠横幅（#64，数据与通知中心/锁屏同 Feed 单源） */
export function addSystemNotification(item) {
  // v10.59 #206：投递侧 visibility/publicVersion 归一（非法 visibility 钳制 PRIVATE ——
  // Notification.java visibility 字段默认值语义；publicVersion 非独立 Notification 体形态则剔除）。
  // 闸前执行：脱敏是锁屏渲染面语义，不影响投递进 feed 与否（与 #198 zen 闸 / #207 渠道闸零耦合）
  item = normalizeRedactionFields(item);
  // v9.94 #198 ZenMode 进 feed 闸（AOSP：被勿扰拦截的通知不进 shade）——
  // 勿扰开启且该类别 DISALLOW → 整条不进（数据/横幅/锁屏全无）；ALLOW/UNSET 照常进
  const zenOn = isZenActive();
  if (zenOn && !shouldEnqueueNotification(zenStore.getState(), item, zenOn)) return;
  // v10.59 #207 一期：渠道 importance 分流闸（AOSP NotificationManagerService enqueue 同语义，
  // 与 #198 ZenMode 进 feed 闸并列同形）——NONE（含 tombstone 静默）整条不进；无 channelId 声明
  // → 隐式 DEFAULT 渠道（存量旧档零迁移零破坏）
  const channelImp = (item && item.channelId)
    ? channelStore.effectiveImportance(item.appId, item.channelId)
    : IMPORTANCE.DEFAULT;
  if (!deliveryGate(channelImp).enqueue) return;
  // v10.59 #96 二期：通知接收数计账（闸后投递计数——zen/渠道拦截不计，
  // NotificationManagerService enqueue 拦截语义同构；去重替换也计一次接收沿）
  try { usageStore.deviceEvent('notify'); } catch (e) {}
  // fix(audit-B): 同 id 通知去重 —— 重发同 id 替换旧条目，不再堆叠重复卡片
  if (item && item.id) {
    const dupIdx = notifications.findIndex(n => n.id === item.id);
    if (dupIdx !== -1) {
      const prev = notifications[dupIdx];
      notifications[dupIdx] = item;
      // v9.94 #197：内容变 = 真更新 → 解除 snooze 静默（同 id 同内容重复投递才静默）
      if (!sameNotificationContent(prev, item)) hunSnooze.clear(item.id);
    }
    else notifications.unshift(item);
  } else {
    notifications.unshift(item);
  }
  if (notifications.length > MAX_PERSISTED_NOTIFICATIONS) notifications.length = MAX_PERSISTED_NOTIFICATIONS;
  renderNotificationsList();
  persistNotifications();
  scheduleNotificationsChanged(); // fix(audit-B): 新增/替换均广播数据变更

  // 若勿扰模式开启，不弹浮窗 —— v9.94 #198 升级：九类按 STATE 细粒度裁决
  // （ZenPolicy：ALLOW 类横幅穿透放行 / UNSET 维持全局横幅禁 / DISALLOW 已在上闸拦截）
  if (document.body.classList.contains('dnd-mode-active')
    && !shouldPeekNotification(zenStore.getState(), item, true)) return;
  // 通知面板已开 → 不弹横幅（数据照常进面板；AOSP：shade 开则 HUN 不再 peek）
  if (isPullPanelsActive()) return;
  // v9.94 #197 snooze：划掉后 60s 静默期内同 id 重复投递不弹横幅（数据照常进中心面板）
  if (item && item.id && hunSnooze.isSnoozed(item.id)) return;

  // v10.59 #207 一期：importance MIN/LOW 进 Feed 不弹横幅（deliveryGate.peek=false；
  // 数据照常入中心+锁屏——锁屏复用 Feed 单源同语义，无需独立分支）
  if (!deliveryGate(channelImp).peek) return;

  showHeadsUpBanner(item);
}

// v10.59 #207：渠道观测面/直注入口扩容（__zenDebug 同款零行为面风格；e2e 与二期清单页联调）
if (typeof window !== 'undefined') {
  window.__channelDebug = {
    store: () => channelStore.getState(),
    get: (appId, channelId) => channelStore.getNotificationChannel(appId, channelId),
    importance: (appId, channelId) => channelStore.effectiveImportance(appId, channelId),
    set: (appId, channelId, importance, name) => channelStore.createNotificationChannel({ appId, channelId, importance, name }),
    update: (appId, channelId, patch) => channelStore.updateNotificationChannel(appId, channelId, patch),
    remove: (appId, channelId) => channelStore.deleteNotificationChannel(appId, channelId),
    // v10.59 #207 二期：渠道开关直调 + 弹层直调（e2e 与测试钩子）
    toggle: (appId, channelId) => channelStore.toggleChannelEnabled(appId, channelId),
    open: (appId, appName) => openChannelEditor(appId, appName),
  };
}

// v10.59 #206：脱敏观测面/直判入口（__channelDebug 同款零行为面风格；e2e 与锁屏设置联调）
// mode()：设置三态直读；view(item)：3×3 矩阵直判 + 脱敏卡数据形态（渲染面在 lock-screen.js）
if (typeof window !== 'undefined') {
  window.__redactDebug = {
    mode: () => readLockMode(),
    view: (item) => {
      const m = readLockMode();
      const redact = needsRedaction(item && item.visibility, m);
      return { mode: m, redact, view: redact ? redactedView(item) : null };
    },
  };
}

/**
 * v10.59 #91 二期：按 id 移除通知并广播（气泡 dismiss 区路径消费面——
 * AOSP 拖泡入 dismiss target = 移除气泡并取消其通知；与划掉/清除全部同走
 * 渲染+持久化+notifications-changed 广播链，Feed 单源对账语义不变）
 */
export function removeNotificationById(id) {
  if (!id) return false;
  const before = notifications.length;
  notifications = notifications.filter((n) => n.id !== id);
  if (notifications.length === before) return false;
  renderNotificationsList();
  persistNotifications();
  scheduleNotificationsChanged();
  return true;
}

// ==================== #64 Heads-up 堆叠横幅（AOSP HeadsUpManager 对标） ====================
//
// v9.02：单条复用式 Pixel 胶囊（v7.x 雏形）重写为堆叠栈。AOSP anchor 实拉实证
// （aosp-mirror/platform_frameworks_base main，res/values/config.xml）：
//  - heads_up_notification_decay = 5000ms「milliseconds before the heads up
//    notification auto-dismisses」→ 自动收超时（旧 4200ms 工程自定值退役）
//  - touch_acceptance_delay = 700ms「before the heads up notification accepts
//    touches」→ 出现后 700ms 内拒收触摸（防吞掉弹出横幅的那次触摸，同名常量同语义）
//  - heads_up_notification_minimum_time = 2000ms / sticky_heads_up_notification_time =
//    60000ms / auto_heads_up_notification_decay = 3000ms：v9.02 头注留痕未取用（当时
//    md3 通知均为应用主动投递）；v9.94 #197 全部取用——minimum_time 防闪没钳制 /
//    sticky 60s 常驻（投递方 sticky/pin 标记）/ auto_decay 自动档分流（item.auto 标记），
//    常量真源收敛至 aosp/heads-up-timing.js（七常量 + snooze + Avalanche 纯逻辑层）
//  - 堆叠裁决：AOSP 主线 HeadsUpManagerImpl + AvalancheController 为「单条显示 +
//    nextList 排队」语义（AvalancheController.kt headsUpEntryShowing 单槽等待队列）；
//    议题 #64 验收规格指定「同屏最多 3、超出挤掉最旧」→ v9.02 按议题实施（铁律#2 议题规格超越）；
//    v9.94 #197 升级为 Avalanche 排队（槽满入队等待退场放行，不再挤掉最旧）——「同屏最多 3」
//    规格保留（槽宽 3），「挤出最旧」退役（等待而非挤掉，AvalancheController isWaiting 同构）
//  - 弹簧：spring.js 解析闭式解 + motion.js tweenValue（拖拽松手速度接力，back-pill 同款）
//  - 状态机（每条独立）：entering → peek ⇄ drag → exit；中断路径：滑入中触摸路由 /
//    exit 中再来新条（独立元素零干扰）/ peek 中下拉面板（守卫循环清栈）/ pointercancel 回弹
const HUN_MAX_STACK = 3;          // 议题规格：同屏最多 3
const HUN_AUTO_DISMISS_MS = 5000; // AOSP heads_up_notification_decay 实证值
const HUN_TOUCH_ACCEPTANCE_MS = 700; // AOSP touch_acceptance_delay 实证值
const HUN_DISMISS_DIST = 56;      // 上滑收起位移阈值 px（工程调优，非 AOSP 常量）
const HUN_SHADE_DIST = 72;        // 下滑展开通知栏位移阈值 px（工程调优）
const HUN_FLING_VELOCITY = 480;   // 甩出速度阈值 px/s（工程调优）
const HUN_DOCK_OFFSET = 96;       // 屏外停靠位 px（y=0 停靠 → y=96 为 peek 位）
const HUN_SPRING = makeSpringParams(0.34, 0.9, 1); // 进出场/回弹弹簧（response/ζ）

let hunStack = null;
const hunEntries = new Set(); // 存活横幅状态机记录（销毁即移除，无泄漏面）
let hunGuardRaf = 0;          // 面板打开守卫循环（仅存活期运转，自终止）
// v9.94 #197：snooze 静默期账本（划掉 60s 同 id 不再弹）+ Avalanche 等待队列（槽满入队错峰）
const hunSnooze = createSnoozeStore();
const hunQueue = createAvalancheQueue(HUN_MAX_STACK);

// 只读测试/e2e 桥（__lockTest 同款风格：零写入零行为面，仅状态观测）
if (typeof window !== 'undefined') {
  window.__headsUpDebug = {
    get count() { return hunEntries.size; },
    get aliveCount() { return Array.from(hunEntries).filter((e) => e.state !== 'exit').length; },
    states: () => Array.from(hunEntries).map((e) => e.state),
    items: () => Array.from(hunEntries).map((e) => (e.item && e.item.id) || null),
    // v9.94 #197 观测扩容：Avalanche 队列状态 + snooze 静默期查询
    queue: () => ({ showing: hunQueue.showing().map((it) => (it && it.id) || null), waiting: hunQueue.waiting().map((it) => (it && it.id) || null) }),
    snoozed: (id) => hunSnooze.isSnoozed(id),
  };
}

function getHeadsUpStack() {
  if (hunStack && hunStack.isConnected) return hunStack;
  hunStack = document.createElement('div');
  hunStack.id = 'headsUpStack';
  hunStack.style.cssText = `position:fixed;top:12px;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:420px;z-index:10005;display:flex;flex-direction:column;gap:8px;pointer-events:none;`;
  document.body.appendChild(hunStack);
  return hunStack;
}

/** 守卫循环：通知面板打开（任意路径）→ 横幅即时清栈（AOSP：shade 开则 HUN 即收进面板） */
function hunGuardTick() {
  if (hunEntries.size === 0) { hunGuardRaf = 0; return; }
  if (isPullPanelsActive()) {
    for (const e of Array.from(hunEntries)) destroyHeadsUpEntry(e);
    hunGuardRaf = 0;
    return;
  }
  hunGuardRaf = requestAnimationFrame(hunGuardTick);
}

function destroyHeadsUpEntry(entry) {
  if (entry.destroyed) return; // 幂等：exit 动画中守卫先行销毁 + onComplete 回调二至，free 不重复放行
  entry.destroyed = true;
  if (entry.tween) entry.tween.cancel();
  clearTimeout(entry.hideTimer);
  entry.el.remove();
  hunEntries.delete(entry);
  // v9.94 #197 Avalanche：显示槽释放 → FIFO 放行队首（风暴错峰逐条出）；
  // 放行时机受 DND / 通知面板守卫（同 addSystemNotification 入口三闸，数据层照常在面板）；
  // v9.94 #198：守卫同步升级 ZenPolicy 裁决（ALLOW 类横幅穿透，与主入口通道语义一致）
  const next = hunQueue.free(entry.item);
  if (next && !isPullPanelsActive() && !document.body.classList.contains('dnd-mode-active')
    && shouldPeekNotification(zenStore.getState(), next, true)) {
    showHeadsUpBanner(next);
  }
}

/** 点击/键盘激活路由（原单条版逻辑原样迁移：深链优先 → appId 精确 → msg 兜底） */
function routeHeadsUpClick(cur, sourceRect) {
  if (!cur) return;
  // v7.25：深链通知横幅同样走总线投递 + 定位打开（与通知卡片同链路）
  if (routeDeepLink(cur.deepLink, sourceRect)) return;
  // fix(audit-B): appId 有效时精确路由；仅当无 appId 才回退信息应用
  let appIdx = -1;
  if (cur.appId) {
    appIdx = initialApps.findIndex(a => a.id === cur.appId);
  } else {
    appIdx = initialApps.findIndex(a => a.id === 'msg');
  }
  if (appIdx !== -1) {
    openApp(appIdx, null, sourceRect);
  }
}

/** 弹出顶部 Heads-up 通知横幅（v9.94 #197：Avalanche 排队——槽满入队等待退场放行，不再挤掉最旧） */
function showHeadsUpBanner(item) {
  const stack = getHeadsUpStack();
  // Avalanche offer：槽未满入槽显示；槽满入 waiting 返回 false（错峰等待，destroy 时 free 放行）
  if (!hunQueue.offer(item)) return;
  const banner = document.createElement('div');
  banner.className = 'hun-banner';
  banner.style.cssText = `pointer-events:auto;background:rgba(23, 29, 27, 0.94);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);color:#FFFFFF;border-radius:28px;padding:14px 18px;box-shadow:0 10px 30px rgba(0,0,0,0.35);display:flex;align-items:center;gap:14px;cursor:pointer;will-change:transform;`;
  banner.setAttribute('role', 'alert');

  // 横幅图标：真实应用图标直接以应用本体图标呈现（透明底、方圆角）；
  // 通用图标则保留原有的圆形主题色底
  const bannerIconStyle = isRealAppIcon(item)
    ? 'width:38px;height:38px;border-radius:12px;overflow:hidden;flex-shrink:0;'
    : 'width:38px;height:38px;border-radius:50%;background:var(--md-primary,#7df8db);color:#000;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
  // fix(audit-B): app/time/title/desc 为应用可控文本，插 innerHTML 前全量转义
  banner.innerHTML = `
    <div style="${bannerIconStyle}">
      ${resolveNotiIcon(item)}
    </div>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
        <span style="font-size:12px;font-weight:600;color:var(--md-primary,#7df8db);">${escapeHtml(item.app)}</span>
        <span style="font-size:11px;opacity:0.6;">${escapeHtml(item.time)}</span>
      </div>
      <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.title)}</div>
      <div style="font-size:12px;opacity:0.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.desc)}</div>
    </div>
  `;
  stack.prepend(banner); // 新条置顶（AOSP HUN 视觉序：最新在上）

  const entry = {
    el: banner, item,
    state: 'entering', // entering → peek ⇄ drag → exit
    y: 0,              // 弹簧通道值：0 = 屏外停靠，HUN_DOCK_OFFSET = peek 位
    birth: performance.now(),
    // v9.94 #197：驻留档（sticky 60s / auto 分流 3000 / 普通 5000，含 minimum_time 下限）+ pin 裁决
    holdMs: headsUpHoldMs(item, { throttled: hunQueue.isWaiting }),
    pinned: shouldHeadsUpBecomePinned(item),
    hideTimer: 0, tween: null, pointerId: null, startY: 0, dy: 0, moved: false,
    samples: [],       // [t, dy] 速度采样环（甩出判据）
  };
  banner._item = item; // fix(audit-B) 沿袭：路由读取 banner._item 最新通知项（键/指针双通道共用）
  banner._entry = entry;
  hunEntries.add(entry);

  const setY = (val) => {
    entry.y = val;
    banner.style.transform = `translateY(${(val - HUN_DOCK_OFFSET).toFixed(2)}px)`;
  };
  const armAutoDismiss = () => {
    clearTimeout(entry.hideTimer);
    // v9.94 #197：decay 档位化（sticky 60000 / auto 3000 / 普通 5000）取代单一 5000
    entry.hideTimer = setTimeout(() => exitHeadsUp(entry, 0), entry.holdMs);
  };
  const springTo = (to, velocity, onDone) => {
    if (entry.tween) entry.tween.cancel();
    entry.tween = tweenValue({
      from: entry.y, to, velocity: velocity || 0, params: HUN_SPRING,
      onUpdate: setY,
      onComplete: onDone || null,
    });
  };
  const exitHeadsUp = (en, velocity, opts = {}) => {
    if (en.state === 'exit') return;
    // v9.94 #197 minimum_time 防闪没：存活不足 2000ms 的收起一律延迟补足（弹簧回 peek 位
    // 视觉稳定），守卫清栈 force 直通（shade 开则 HUN 即收进面板，钳制无意义）
    const elapsed = performance.now() - en.birth;
    if (!opts.force && elapsed < HUN_MINIMUM_TIME_MS) {
      clearTimeout(en.hideTimer);
      en.state = 'peek';
      springTo(HUN_DOCK_OFFSET, 0);
      en.hideTimer = setTimeout(() => exitHeadsUp(en, velocity), HUN_MINIMUM_TIME_MS - elapsed);
      return;
    }
    en.state = 'exit';
    clearTimeout(en.hideTimer);
    if (en.pointerId !== null && en.el.hasPointerCapture && en.el.hasPointerCapture(en.pointerId)) {
      try { en.el.releasePointerCapture(en.pointerId); } catch (e) {}
    }
    en.pointerId = null;
    if (en.tween) en.tween.cancel();
    en.tween = tweenValue({
      from: en.y, to: 0, velocity: velocity || 0, params: HUN_SPRING,
      onUpdate: (v) => { en.y = v; en.el.style.transform = `translateY(${(v - HUN_DOCK_OFFSET).toFixed(2)}px)`; },
      onComplete: () => destroyHeadsUpEntry(en),
    });
  };

  // 触摸语义（AOSP touch_acceptance_delay：出现 700ms 内拒收，防吞 posting 触摸）
  banner.addEventListener('pointerdown', (e) => {
    if (performance.now() - entry.birth < HUN_TOUCH_ACCEPTANCE_MS) return;
    if (entry.state === 'exit') return;
    entry.pointerId = e.pointerId;
    entry.startY = e.clientY;
    entry.dy = 0;
    entry.moved = false;
    entry.samples = [[performance.now(), 0]];
    entry.state = 'drag';
    clearTimeout(entry.hideTimer); // 拖拽期挂起自动收（松手回 peek 位重排新周期）
    try { banner.setPointerCapture(e.pointerId); } catch (err) {}
  });
  banner.addEventListener('pointermove', (e) => {
    if (entry.state !== 'drag' || e.pointerId !== entry.pointerId) return;
    entry.dy = e.clientY - entry.startY;
    if (Math.abs(entry.dy) > 6) entry.moved = true;
    const clamped = Math.max(-40, Math.min(HUN_DOCK_OFFSET + 120, HUN_DOCK_OFFSET + entry.dy));
    const now = performance.now();
    entry.samples.push([now, entry.dy]);
    while (entry.samples.length > 6) entry.samples.shift();
    setY(clamped);
  });
  const finishDrag = (e) => {
    if (entry.state !== 'drag' || (e && e.pointerId !== entry.pointerId)) return;
    entry.state = 'peek';
    entry.pointerId = null;
    // 甩出速度：最近两采样差分（px/s，向上为负）——拖拽松手速度接力纪律
    let velocity = 0;
    if (entry.samples.length >= 2) {
      const [t0, y0] = entry.samples[0];
      const [t1, y1] = entry.samples[entry.samples.length - 1];
      if (t1 > t0) velocity = ((y1 - y0) / (t1 - t0)) * 1000;
    }
    const dy = entry.dy;
    if (!entry.moved) {
      // 点击路由（位移 <6px）：图标位姿作开场锚（与通知卡片同链路）
      const icon = banner.querySelector('div');
      routeHeadsUpClick(banner._item, icon ? icon.getBoundingClientRect() : null);
      exitHeadsUp(entry, 0);
      return;
    }
    if (dy <= -HUN_DISMISS_DIST || velocity <= -HUN_FLING_VELOCITY) {
      // 上滑收起：位移/甩出速度双通道（速度接力入弹簧）
      // v9.94 #197 snooze 记账：用户划掉后同 id 60s 静默（heads_up_default_snooze_length_ms）
      if (entry.item && entry.item.id !== undefined && entry.item.id !== null) hunSnooze.snooze(entry.item.id);
      exitHeadsUp(entry, Math.min(velocity, 0) - 240);
      return;
    }
    if (dy >= HUN_SHADE_DIST) {
      // 下滑展开通知栏：清栈（本条与余条即时收，数据仍在通知中心单源）
      // v9.94 #197：destroy 直移除不經 exitHeadsUp——清栈不受 minimum_time 钳制（面板内可见）
      destroyHeadsUpEntry(entry);
      for (const other of Array.from(hunEntries)) destroyHeadsUpEntry(other);
      openPullPanel(0);
      return;
    }
    // 未达阈值：弹簧回 peek 位（松手速度接力）+ 重排自动收周期
    springTo(HUN_DOCK_OFFSET, velocity);
    armAutoDismiss();
  };
  banner.addEventListener('pointerup', finishDrag);
  banner.addEventListener('pointercancel', () => {
    if (entry.state !== 'drag') return;
    entry.state = 'peek';
    entry.pointerId = null;
    springTo(HUN_DOCK_OFFSET, 0);
    armAutoDismiss();
  });
  // a11y 基线：键盘激活同点击路由（Enter/Space）
  banner.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const icon = banner.querySelector('div');
    routeHeadsUpClick(banner._item, icon ? icon.getBoundingClientRect() : null);
    exitHeadsUp(entry, 0);
  });

  setY(0); // 屏外停靠位起笔
  // 滑入弹簧（解析闭式解，AOSP peek 语义）
  springTo(HUN_DOCK_OFFSET, 0, () => { if (entry.state === 'entering') entry.state = 'peek'; });
  entry.state = 'entering';
  armAutoDismiss();
  if (hunGuardRaf === 0) hunGuardRaf = requestAnimationFrame(hunGuardTick);

  // v9.94 #197：堆叠挤旧退役——Avalanche offer 已保槽内 ≤3（超出等待而非挤掉），
  // 原超限挤出循环整体删除（用户未看完的横幅不再被新条顶没）。

  playSfx('notify'); // 通知音效（受「全局音效」开关与勿扰链路管辖：DND 时上方已提前 return）
  if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
}

/** 弹出快速状态提示小胶囊 */
function showHeadsUpPill(msg) {
  let pill = document.getElementById('headsUpPill');
  if (!pill) {
    pill = document.createElement('div');
    pill.id = 'headsUpPill';
    pill.style.cssText = `
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%) translateY(-60px);
      background: rgba(0, 107, 90, 0.9); backdrop-filter: blur(16px);
      color: #FFFFFF; border-radius: 20px; padding: 6px 16px; z-index: 10006;
      font-size: 12px; font-weight: 500; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      transition: all 0.25s cubic-bezier(0.2, 0.9, 0.3, 1); pointer-events: none;
    `;
    document.body.appendChild(pill);
  }
  pill.textContent = msg;
  pill.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(pill._timer);
  pill._timer = setTimeout(() => {
    pill.style.transform = 'translateX(-50%) translateY(-60px)';
  }, 2000);
}
