// ==================== notifications.js — Android 16 / Pixel 10 MD3 通知中心与全局流媒体联动 ====================

import { ICONS } from './icons.js';
import { getAppIconSVG, hasAppIcon } from './app-icons.js';
import { mediaService } from './media-service.js';
import { initialApps } from './apps-data.js';
import { openApp } from './app-window.js';
import { closePullPanels } from './pull-down-gesture.js';
import { playSfx } from './sound-haptics.js';
// v7.25 通知中心 ↔ 日历打通：动态日历通知（同源 localStorage 直读）+ 深链路由。
// 注：app-bus 反向依赖本模块（addSystemNotification）—— 双方均仅在函数体内
// 使用对方导出（非模块顶层求值），ESM 循环安全（函数声明提前绑定）。
import { emitToApp } from './app-bus.js';
import {
  CAL_NOTI_ID, CAL_DISMISS_KEY, CAL_DB_KEY, CAL_LEGACY_PREFIX,
  readCalendarNotes, composeCalNotification, formatRelative
} from './cal-sync.js';

// ==================== 通知持久化（批次二：刷新不丢） ====================
// 通知中心原先为纯内存态，刷新即失；现以 localStorage 持久化（上限 30 条）。
// 首次访问（无存储记录）时落一份默认演示通知；此后用户的增删/清空即为真源。
const NOTIS_STORAGE_KEY = 'ios-desktop:notifications';
const MAX_PERSISTED_NOTIFICATIONS = 30;

// fix(audit-B): HTML 转义工具 —— 通知标题/正文/应用名/时间为应用可控文本，
// 插入 innerHTML 前必须转义（与 app-bus.js/permissions.js 同款实现，杜绝注入面）
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// fix(audit-B): 通知图标载荷防御 —— 拒绝携带脚本段/事件处理器属性的 SVG
// （`<svg onload=…>` 同样会在 innerHTML 插入时执行；入口与渲染双保险，
//  覆盖历史已持久化的脏数据）
function isSafeIconSvg(svg) {
  return typeof svg === 'string' && svg.indexOf('<svg') === 0
    && !/<script/i.test(svg) && !/\son[a-z]+\s*=/i.test(svg);
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
    title: 'Android 16 (BP31) 系统体验已更新',
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

/** 供锁屏等外部模块读取当前通知数据（只读副本） */
export function getNotifications() {
  return [...notifications];
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

  if (notifications.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:50px 20px;opacity:0.6;font-size:14px;display:flex;flex-direction:column;align-items:center;gap:10px;">
        <div style="color:var(--md-primary,#a8c7fa);">${ICONS.sound_notifications}</div>
        <span>暂无待处理的新通知</span>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  // 按分类分组
  const categories = {};
  notifications.forEach((item) => {
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
      card.innerHTML = `
        <div class="noti-card-icon ${realIcon ? 'noti-card-icon--app' : ''}">${resolveNotiIcon(item)}</div>
        <div class="noti-card-content">
          <div class="noti-card-top">
            <span class="noti-card-appname">${escapeHtml(item.app)}</span>
            <span class="noti-card-time">${escapeHtml(item.time)}</span>
          </div>
          <div class="noti-card-title">${escapeHtml(item.title)}</div>
          <div class="noti-card-desc">${escapeHtml(item.desc)}</div>
        </div>
      `;

      // 点击通知卡片直达对应应用（以卡片图标位置为动画源，放射动画从点按处起飞）
      card.addEventListener('click', (e) => {
        if (card._isSwiping) return;
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
      card.addEventListener('pointerdown', (e) => {
        // fix(audit-B): 通知卡横滑删除与下拉面板横滑切页手势冲突 ——
        // pull-down-gesture 的豁免列表不含 .noti-card，按下事件在卡片级截停，
        // 面板切页判定（window 级 pointerdown/pointermove）收不到本手势；
        // 滑删除本体改挂卡片 + setPointerCapture，捕获期移动事件同样不外传。
        e.stopPropagation();
        startX = e.clientX;
        card._isSwiping = false;

        let captured = false;
        try { card.setPointerCapture(e.pointerId); captured = true; } catch (err) { /* 环境不支持时降级 window 级监听 */ }

        const onMove = (me) => {
          me.stopPropagation(); // 捕获期移动不冒泡到 window，面板横滑判定彻底失联
          const raw = me.clientX - startX;
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
          if (captured) {
            try { card.releasePointerCapture(ue.pointerId); } catch (err) {}
            card.removeEventListener('pointermove', onMove);
            card.removeEventListener('pointerup', onUp);
            card.removeEventListener('pointercancel', onUp);
          } else {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
          }
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
  if (trackContainer) {
    trackContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = trackContainer.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      mediaService.seek(pct);
    });
  }

  // 订阅真实媒体状态，联动显影过渡与音频状态
  mediaService.subscribe((state) => {
    if (mediaCard) {
      if (state.isPlaying) {
        mediaCard.classList.remove('media-hidden');
        mediaCard.classList.add('media-playing');
      } else {
        mediaCard.classList.remove('media-playing');
      }
      if (state.track && state.track.coverGradient) {
        mediaCard.style.background = state.track.coverGradient;
      }
    }

    if (titleEl) titleEl.textContent = state.track.title;
    if (artistEl) artistEl.textContent = `${state.track.artist} • ${state.track.album || '电台'}`;
    if (barEl) barEl.style.width = `${state.progress.toFixed(1)}%`;
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
        category: 'Conversations / 会话通知'
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
        category: p.category || '应用通知 / App Notifications'
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

/** 动态添加通知并弹出顶部 Pixel 灵动胶囊 Heads-up 弹窗 */
export function addSystemNotification(item) {
  // fix(audit-B): 同 id 通知去重 —— 重发同 id 替换旧条目，不再堆叠重复卡片
  if (item && item.id) {
    const dupIdx = notifications.findIndex(n => n.id === item.id);
    if (dupIdx !== -1) notifications[dupIdx] = item;
    else notifications.unshift(item);
  } else {
    notifications.unshift(item);
  }
  if (notifications.length > MAX_PERSISTED_NOTIFICATIONS) notifications.length = MAX_PERSISTED_NOTIFICATIONS;
  renderNotificationsList();
  persistNotifications();
  scheduleNotificationsChanged(); // fix(audit-B): 新增/替换均广播数据变更

  // 若勿扰模式开启，不弹浮窗
  if (document.body.classList.contains('dnd-mode-active')) return;

  showHeadsUpBanner(item);
}

/** 弹出顶部 Pixel 10 风格 Heads-up 通知横幅 */
function showHeadsUpBanner(item) {
  let banner = document.getElementById('headsUpBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'headsUpBanner';
    banner.style.cssText = `
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%) translateY(-100px);
      width: calc(100% - 32px); max-width: 420px; background: rgba(23, 29, 27, 0.94);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      color: #FFFFFF; border-radius: 28px; padding: 14px 18px; z-index: 10005;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 14px;
      cursor: pointer; transition: all 0.3s cubic-bezier(0.2, 0.95, 0.25, 1);
    `;
    banner.addEventListener('click', () => {
      banner.style.transform = 'translateX(-50%) translateY(-100px)';
      // fix(audit-B): 横幅元素全生命周期复用，点击路由读取 banner._item 最新通知项
      // （旧闭包捕获首次 item，导致第二条横幅点击仍按第一条的 appId 路由）
      const cur = banner._item;
      if (!cur) return;
      const bannerIcon = banner.querySelector('div');
      const bannerIconRect = bannerIcon ? bannerIcon.getBoundingClientRect() : null;
      // v7.25：深链通知横幅同样走总线投递 + 定位打开（与通知卡片同链路）
      if (routeDeepLink(cur.deepLink, bannerIconRect)) return;
      // fix(audit-B): appId 有效时精确路由；仅当无 appId 才回退信息应用，
      // 都找不到不动作（旧 `a.id === item.appId || a.id === 'msg'` 的 || 短路会吞掉有效 appId）
      let appIdx = -1;
      if (cur.appId) {
        appIdx = initialApps.findIndex(a => a.id === cur.appId);
      } else {
        appIdx = initialApps.findIndex(a => a.id === 'msg');
      }
      if (appIdx !== -1) {
        openApp(appIdx, null, bannerIconRect);
      }
    });
    document.body.appendChild(banner);
  }

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
  banner._item = item; // fix(audit-B): 每次弹出前记录当前通知项，供点击路由读取

  banner.style.transform = 'translateX(-50%) translateY(0)';
  playSfx('notify'); // 通知音效（受「全局音效」开关与勿扰链路管辖：DND 时上方已提前 return）
  if (navigator.vibrate) navigator.vibrate([20, 50, 20]);

  clearTimeout(banner._hideTimer);
  banner._hideTimer = setTimeout(() => {
    banner.style.transform = 'translateX(-50%) translateY(-100px)';
  }, 4200);
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
