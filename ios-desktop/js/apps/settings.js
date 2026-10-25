// ==================== settings.js — 设置 (Material Design 3 + Expressive Sliders) ====================
//
// 批次二「真设置」升级：
//   - 声音与震动（页 4）：接入 sound-haptics.js 真实开关（WebAudio 合成音效 /
//     触感全局门控）与音效音量；媒体音量真实联动 media-service；
//   - 应用管理（页 6）：全部应用一览 + 卸载/恢复（复用 removeAppFromDesktop /
//     restoreApp 链路，经 postMessage 桥接桌面）；
//   - 存储空间占用（页 7）：storage-stats.js 逐键统计 + IDB 配额 + 按应用归属聚合；
//   - 开发者选项（页 8）：FPS 悬浮层 / 禁用动画 / 重置桌面布局 / 清空全部数据；
//   - 多模式（页 9）：工作 / 个人模式一键切换（profiles.js 快照 + 连贯动画）。

import { ICONS } from '../icons.js';
import { getAppIconSVG } from '../app-icons.js';
// v7.99 #10 二期：网络和互联网子页（页 17）图标 —— AOSP Settings res/drawable 逐 path 转换
import { AOSP_ICONS } from '../icons-aosp.js';
// 副作用导入：加载即自注册 window.__dataBackup，供下方「备份与恢复」分组调用
import '../data-backup.js';
import { mediaService } from '../media-service.js';
import { getBatteryState, subscribeBattery, estimateDischargeSeconds, estimateChargeSeconds, formatDuration, formatPerPct, isSimEngineActive, getSimCharging, setSimCharging } from '../battery-service.js';
// v7.50 拆分：电池页实时同步副作用 → settings-battery.js（import 即注册，顺序与拆分前一致）
import './settings-battery.js';
// v7.80 充电涟漪卡交互（预览/充电口位置/颜色，localStorage rippleCfg_v1 真源在 charging-ripple.js）
import './settings-ripple.js';
// fix(audit-E): 显示页「暗黑色彩方案」接真值 —— 直接引入 theme-mode 单一真源
import { getResolvedTheme, setThemeMode } from '../theme-mode.js';
// fix(audit-E): 应用管理页卸载文件夹成员需要操作 state.pagesApps 内 folder.apps
// 并重渲染桌面（folder.js 的解散语义 + desktop.js 的重渲染，与拖出文件夹同链路）
import { state as desktopState, savePagesApps } from '../state.js';
import { dissolveFolderIfSingle } from '../folder.js';
import { renderDesktopPages } from '../desktop.js';
// v7.43: 双段轨道几何改 clip-path 裁剪（纯函数模块，tests/slider-geom.test.js 守护）
import { sliderClipPaths } from '../slider-geom.js';
// v7.51 issue#7：Android 16 式双栏分屏（左栏彩色底板列表 + 右栏详情）——
// 清单/行构建器与挂载逻辑在 settings-two-pane.js，本文件只提供页面定义与内联脚本挂接
import { renderSettingsListHTML, setPages } from './settings-two-pane.js';

// 设置页内联 <script> 无法访问模块作用域，经 window 桥接媒体音量与本地图标：
// 卸载/恢复、权限管理等界面的应用图标统一走 app-icons.js 本地 SVG（与桌面同源），
// 不再读取 app.iconUrl 遗留网络图（v7.4 图标本地化）
if (typeof window !== 'undefined') {
  // fix(audit-E): 媒体音量读取桥 —— 声音页滑杆每次激活时回同步当前真值（此前只回同步了系统音效）
  window.__settingsMedia = {
    setVolume: (v) => mediaService.setVolume(v),
    getVolume: () => mediaService.getState().volume,
  };
  window.__getAppIconSVG = getAppIconSVG;
  // fix(audit-E): 显示页暗黑开关 ↔ theme-mode 单一真源（与快捷设置深色磁贴/主题面板同源）
  window.__settingsTheme = {
    resolved: () => getResolvedTheme(),
    set: (m) => setThemeMode(m),
  };
  // v7.39 参考版精细化 —— Android 原生「24px 厚双段轨道 + 6×60 竖柄药丸」几何：
  //   fill  激活段 [0, thumbX-GAP]     全宽基数 + clip-path 裁剪（v7.43，原 scaleX）
  //   line  未激活段 [thumbX+GAP, w]   全宽基数 + clip-path 裁剪（v7.43，原 scaleX）
  //   thumb 竖柄中心 translateX(thumbX)，GAP=10px 手柄两侧物理断开间隙
  //   刻度点：激活段 on-primary / 未激活段主色，|x-thumbX|<=GAP+3 隐没；
  //   末端停止点：手柄逼近右端（进入间隙区前）隐没。
  //   v7.43 修「手柄移动时两端圆角退化直至消失」：scaleX 会把 12px 半圆端帽压成
  //   椭圆（水平半径=12×scaleX），段越短越扁；改 clip-path: inset(round) 裁剪后
  //   圆角写在裁剪形状上与段长无关，任意位置均完美半圆。clip-path 同为零 layout
  //   属性（合成层仅更新裁剪，纹理缓存不重光栅），v7.38 同帧纪律不变。
  //   pressed 参数保留兼容旧调用点，v7.39 移除按压 scaleY（Android 原生竖柄拖拽无形变）。
  if (!window.__md3SliderSet) {
    var MD3_SLIDER_GAP = 10;
    window.__md3SliderSet = function (root, fill, thumb, p, pressed) {
      if (!fill) return;
      var w = (root && root.clientWidth) || 0;
      if (w <= 0) return; // 隐藏/零宽（如子页未激活）时跳过，可见后由 ResizeObserver 重绘
      var x = Math.max(0, Math.min(1, p)) * w;
      var clips = sliderClipPaths(w, x, MD3_SLIDER_GAP);
      fill.style.width = ''; // 类级 width:100% 接管（清掉历史内联 px/calc）
      fill.style.transform = 'translateY(-50%)';
      fill.style.clipPath = clips.fill;
      var line = root._md3Line;
      if (line === undefined) line = root._md3Line = root.querySelector('.md3-slider-line');
      if (line) {
        line.style.transform = 'translateY(-50%)';
        line.style.clipPath = clips.line;
      }
      if (thumb) {
        thumb.style.left = ''; // 类级 left:0 接管（清掉历史内联 %）
        thumb.style.transform = 'translateX(' + x.toFixed(1) + 'px) translate(-50%,-50%)';
      }
      // 刻度点激活/隐没（有级滑杆；ticks 层 left/right 各 2px）
      var dots = root._md3Dots;
      if (dots === undefined) dots = root._md3Dots = Array.prototype.slice.call(root.querySelectorAll('.m3-slider-dot'));
      if (dots.length) {
        var span = w - 4;
        var act = -1;
        for (var i = 0; i < dots.length; i++) {
          var dx = 2 + (dots.length === 1 ? span / 2 : i * span / (dots.length - 1));
          if (Math.abs(dx - x) <= MD3_SLIDER_GAP + 3) {
            dots[i].classList.add('is-hidden');
          } else {
            dots[i].classList.remove('is-hidden');
            if (dx < x) act = i;
          }
        }
        for (var j = 0; j < dots.length; j++) dots[j].classList.toggle('is-active', j <= act);
      }
      // 末端停止点（无级滑杆）：停止点不再完整落在未激活段上（进入右侧间隙区）即隐没
      var stop = root._md3Stop;
      if (stop === undefined) stop = root._md3Stop = root.querySelector('.m3-slider-stop-dot');
      if (stop) stop.classList.toggle('is-hidden', x > w * 0.98 - MD3_SLIDER_GAP - 4);
    };
  }
  // v7.38：滑杆 root 尺寸/可见性变化（子页激活、分屏、窗口缩放）→ 按当前值
  // 重绘（thumb 的 translateX 像素基准需跟新轨道宽）；同一 root 幂等挂载
  if (!window.__md3SliderWatch && window.ResizeObserver) {
    window.__md3SliderWatch = function (root, repaint) {
      if (!root || root._md3SliderWatched) return;
      root._md3SliderWatched = true;
      new ResizeObserver(function () {
        if (root.isConnected && root.clientWidth > 0) repaint();
      }).observe(root);
    };
  }
  // fix(audit-E): 卸载文件夹成员 —— main.js 的 uninstall-app 只扫 pagesApps 顶层，
  // 文件夹内应用永不被命中；此桥直接对 folder.apps 操作（入 removedApps + 单成员/空
  // 文件夹自动解散 + 持久化 + 重渲染桌面），返回是否命中（未命中则回落原 postMessage 链路）
  window.__settingsFolderUninstall = function (appId) {
    try {
      for (const page of desktopState.pagesApps) {
        if (!Array.isArray(page)) continue;
        for (const item of page) {
          if (!item || item.type !== 'folder' || !Array.isArray(item.apps)) continue;
          const mIdx = item.apps.findIndex((m) => m && m.id === appId);
          if (mIdx === -1) continue;
          const member = item.apps.splice(mIdx, 1)[0];
          if (!desktopState.removedApps) desktopState.removedApps = [];
          desktopState.removedApps.push(member);
          try {
            localStorage.setItem('ios-desktop:removed-apps', JSON.stringify(desktopState.removedApps));
          } catch (e) {}
          dissolveFolderIfSingle(item); // 仅剩 1/0 个成员时自动解散（与拖出文件夹同语义）
          savePagesApps();
          renderDesktopPages();
          return true;
        }
      }
    } catch (e) {}
    return false;
  };
}

// v7.53：桌面与 Dock —— 偏好单一真源 + Dock 增删的 window 桥（页面内联脚本无法访问模块作用域）
import { initialApps } from '../apps-data.js';
import { getDesktopPrefs, setDesktopPref, GRID_COL_CHOICES, GRID_ROW_CHOICES, DOCK_MAX, DOCK_RECENTS_MAX, isTabletSize } from '../desktop-prefs.js';
import { getDockItems, addToDock, removeFromDock } from '../dock.js';
if (typeof window !== 'undefined') {
  window.__desktopPrefs = {
    get: getDesktopPrefs,
    set: setDesktopPref,
    cols: GRID_COL_CHOICES,
    rows: GRID_ROW_CHOICES,
    dockMax: DOCK_MAX,
    recentsMax: DOCK_RECENTS_MAX,
    tablet: isTabletSize,
  };
  window.__dockPrefs = {
    items: getDockItems,
    add: addToDock,
    remove: removeFromDock,
    allApps: () => initialApps.map((a) => ({ id: a.id, name: a.name })),
  };
}

// v8.01 #10 四期：通知子页（页 19）内联脚本 —— 提为模块级常量便于单测文本守护。
// 单一真源 window.__settingsNotifsStore（localStorage settings:notifications-v1，
// 默认值 = AOSP Secure 表默认：LOCK_SCREEN_SHOW_NOTIFICATIONS=1、
// ALLOW_PRIVATE_NOTIFICATIONS=1、SHOW_NOTIFICATION_SNOOZE=OFF、badging/NAS 默认开、
// silent_icons 默认关）；真实通知数据 = localStorage ios-desktop:notifications 同源直读
// （notifications.js 持久化真源，cal-sync 同法，避免 import 环）+ notifications-changed
// 事件订阅；渲染经 escapeHtml（audit-B 惯例，应用可控文本零注入面）。
const NOTIF_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var STORE_KEY = 'settings:notifications-v1';
            var DEFAULTS = { lockScreenShow: 1, allowPrivate: true, silentIcons: false, snooze: false, badging: true, assistant: true };
            // audit-B 惯例：通知标题/正文/应用名为应用可控文本，innerHTML 前必须转义
            function escapeHtml(s) {
              return String(s == null ? '' : s)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            }
            function load() {
              var s = {};
              try {
                var v = JSON.parse(localStorage.getItem(STORE_KEY));
                if (v && typeof v === 'object') { for (var k in DEFAULTS) { if (k in v) s[k] = v[k]; } }
              } catch (e) {}
              var out = {};
              for (var k2 in DEFAULTS) out[k2] = (k2 in s) ? s[k2] : DEFAULTS[k2];
              return out;
            }
            function save(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }
            if (typeof window !== 'undefined' && !window.__settingsNotifsStore) {
              window.__settingsNotifsStore = { load: load, save: save, DEFAULTS: DEFAULTS };
            }
            // 真实通知数据（同源直读，notifications.js MAX_PERSISTED 持久化真源）
            function realNotifs() {
              try {
                var a = JSON.parse(localStorage.getItem('ios-desktop:notifications'));
                return Array.isArray(a) ? a.filter(function(n) { return n && typeof n.title === 'string'; }) : [];
              } catch (e) { return []; }
            }
            function isConvo(n) { return !!(n && n.category && /conversation|会话/i.test(n.category)); }
            // getSummaryResource() 三态语义：!show → disable；allowPrivate → show；else hide
            function lockSummary(s) {
              return !s.lockScreenShow ? '完全不显示通知'
                : s.allowPrivate ? '显示所有通知内容' : '仅在解锁状态下显示敏感内容';
            }
            function setSw(id, on) { var sw = document.getElementById(id); if (sw) sw.checked = !!on; }
            function renderHistory() {
              var panel = document.getElementById('notifHistoryPanel');
              var listEl = document.getElementById('notifHistoryList');
              if (!panel || !listEl || panel.style.display === 'none') return;
              var list = realNotifs();
              if (!list.length) {
                listEl.innerHTML = '<div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:10px 12px;">没有近期通知</div>';
                return;
              }
              listEl.innerHTML = list.map(function(n) {
                return '<div class="md3-list-item" style="min-height:60px;display:flex;flex-direction:column;justify-content:center;gap:2px;border-radius:16px;background:var(--md-surface-container,#f3f5f8);margin:4px 4px;">'
                  + '<span style="display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);"><span>' + escapeHtml(n.app || '') + '</span><span>' + escapeHtml(n.time || '') + '</span></span>'
                  + '<span style="font-size:14px;font-weight:500;">' + escapeHtml(n.title || '') + '</span>'
                  + (n.desc ? '<span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">' + escapeHtml(n.desc) + '</span>' : '')
                  + '</div>';
              }).join('');
            }
            function refresh() {
              var s = load();
              var list = realNotifs();
              var h = document.getElementById('notifHistorySub');
              if (h) h.textContent = list.length === 0 ? '没有近期通知' : list.length + ' 条通知';
              var convos = list.filter(isConvo);
              var c = document.getElementById('notifConvoSub');
              if (c) c.textContent = convos.length === 0 ? '没有优先对话' : convos.length + ' 个优先对话';
              var l = document.getElementById('notifLockSub');
              if (l) l.textContent = lockSummary(s);
              setSw('notifRedactToggle', s.allowPrivate);
              setSw('notifSilentToggle', s.silentIcons);
              setSw('notifSnoozeToggle', s.snooze);
              setSw('notifBadgingToggle', s.badging);
              setSw('notifAssistantToggle', s.assistant);
              renderHistory();
            }
            // lock_screen_notifications 三选对话框（entries 动态注入语义）
            function paintDialogDots(s) {
              var current = !s.lockScreenShow ? 'disable' : (s.allowPrivate ? 'show' : 'hide');
              document.querySelectorAll('.notif-lock-opt').forEach(function(opt) {
                var dot = opt.querySelector('.notif-opt-dot');
                var on = opt.getAttribute('data-opt') === current;
                if (dot) dot.innerHTML = on ? '<span style="width:10px;height:10px;border-radius:50%;background:var(--md-primary,#0b57d0);"></span>' : '';
              });
            }
            window.__notifLockChoose = function() {
              var dlg = document.getElementById('notifLockDialog');
              if (!dlg) return;
              paintDialogDots(load());
              dlg.style.display = 'flex';
            };
            window.__notifLockClose = function(ev) {
              if (ev && ev.target && ev.target.closest && ev.target.closest('.notif-lock-opt')) return;
              var dlg = document.getElementById('notifLockDialog');
              if (dlg) dlg.style.display = 'none';
            };
            window.__notifLockPick = function(opt) {
              var s = load();
              if (opt === 'show') { s.lockScreenShow = 1; s.allowPrivate = true; }
              else if (opt === 'hide') { s.lockScreenShow = 1; s.allowPrivate = false; }
              else if (opt === 'disable') { s.lockScreenShow = 0; }
              save(s);
              var dlg = document.getElementById('notifLockDialog');
              if (dlg) dlg.style.display = 'none';
              refresh();
            };
            window.__notifHistoryToggle = function() {
              var panel = document.getElementById('notifHistoryPanel');
              var ch = document.getElementById('notifHistoryChevron');
              if (!panel) return;
              var show = panel.style.display === 'none';
              panel.style.display = show ? '' : 'none';
              if (ch) ch.style.transform = show ? 'rotate(90deg)' : '';
              if (show) renderHistory();
            };
            function bind() {
              var sw = document.getElementById('notifRedactToggle');
              if (sw && !sw.dataset.v801Bound) {
                sw.dataset.v801Bound = '1';
                sw.addEventListener('change', function() {
                  var s = load();
                  s.allowPrivate = !!sw.checked;
                  if (!s.lockScreenShow) s.lockScreenShow = 1; // 完全不显示时选敏感开关 = 回到显示策略（AOSP 联动语义）
                  save(s); refresh();
                });
              }
              [['notifSilentToggle', 'silentIcons'], ['notifSnoozeToggle', 'snooze'],
               ['notifBadgingToggle', 'badging'], ['notifAssistantToggle', 'assistant']].forEach(function(pair) {
                var el = document.getElementById(pair[0]);
                if (el && !el.dataset.v801Bound) {
                  el.dataset.v801Bound = '1';
                  el.addEventListener('change', function() {
                    var s = load();
                    s[pair[1]] = !!el.checked;
                    save(s);
                  });
                }
              });
              var dlg = document.getElementById('notifLockDialog');
              if (dlg && !dlg.dataset.v801Bound) {
                dlg.dataset.v801Bound = '1';
                dlg.addEventListener('click', window.__notifLockClose);
              }
              document.querySelectorAll('.notif-lock-opt').forEach(function(opt) {
                if (opt.dataset.v801Bound) return;
                opt.dataset.v801Bound = '1';
                opt.addEventListener('click', function() { window.__notifLockPick(opt.getAttribute('data-opt')); });
              });
              // 真实数据变更广播（notifications.js scheduleNotificationsChanged 派发）
              if (!window.__notifPageV801DocBound) {
                window.__notifPageV801DocBound = true;
                window.addEventListener('notifications-changed', function() {
                  var panel = document.getElementById('notifHistoryPanel');
                  var inPage = document.getElementById('notifHistorySub');
                  if (inPage || (panel && panel.style.display !== 'none')) refresh();
                });
              }
            }
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 19) { refresh(); bind(); }
            });
          })();
        `;

// v8.02 #10 五期：无障碍子页（页 20）内联脚本 —— 提为模块级常量便于单测文本守护（v8.01 惯例）。
// 单一真源 window.__settingsA11yStore（localStorage settings:accessibility-v1，
// 默认值 = AOSP 默认：REDUCE_BRIGHT_COLORS_ACTIVATED=0（关）、toggle_audio_description
// persistent=false 默认关）。
// 超越点（#22 注记「色彩反转/减少亮色可用 CSS filter 真实现」）：极暗（reduce_bright_colors）
// 开关以 CSS filter 真实现 —— 作用于 documentElement（html 层），与快捷设置亮度滑条
// body.filter（quick-settings.js 全库唯一既有消费链）分层乘法合成：html brightness ×
// body brightness = 在当前亮度之下额外压暗，正是 AOSP「将设备屏幕调得比通常更暗」语义；
// 强度取 RBC 滑条默认 50% → brightness(0.5)。activated 态持久化（Secure 表语义），重载恢复。
// ==================== SOUND_PAGE_SCRIPT — 页 4 提示音和振动（v8.03 sound_settings.xml 1:1） ====================
// 单一真源：window.__settingsSoundStore（localStorage settings:sound-v1）。
// AOSP 语义映射：call=STREAM_VOICE_CALL / ring=STREAM_RING（separate_ring_volume）/
// notification=STREAM_NOTIFICATION / alarm=STREAM_ALARM；AOSP 为 stream 0..maxIndex，
// Web 语义 0-100%。#11 时钟应用前置依赖：闹钟响铃音量消费 store.get('alarm')。
// media_volume 走既有 __settingsMedia（HTML5 Audio 引擎真实音量，v8.03 前已接）。
// touch_sounds 开关 = System.SOUND_EFFECTS_ENABLED 语义 = sound-haptics sfxEnabled 同一真源融合。
const SOUND_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var sfx = window.__sfx;
            var LS_KEY = 'settings:sound-v1';
            // 默认值=AOSP 默认语义（Web 0-100 换算；preventRinging hush 手势默认开）
            var DEFAULTS = { call: 50, ring: 70, notification: 70, alarm: 70, preventRinging: true, vibrateIcon: false, dtmf: true, screenLock: true, charging: true, docking: true };
            var state;
            try { state = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch (e) { state = Object.assign({}, DEFAULTS); }
            var store = {
              get: function(k) { return state[k]; },
              set: function(k, v) {
                state[k] = v;
                try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
                try { document.dispatchEvent(new CustomEvent('settings-sound-changed', { detail: { key: k, value: v } })); } catch (e) {}
              }
            };
            // 单一真源注册（#11 时钟消费点）
            window.__settingsSoundStore = store;
            function showTip(msg) { if (window.showSystemToast) window.showSystemToast(msg); }
            // v7.34 rAF 合帧（末事件原则）+ v7.38 transform 驱动：fill/thumb 同帧写入
            // 走 __md3SliderSet 合成器桥，根治大色块重光栅滞后脱节
            var bindSlider = function(slider, fill, thumb, label, onPct, getP) {
              if (!slider || slider._bound) return;
              slider._bound = true;
              var slRaf = 0, slLastE = null, down = false, lastP = 0;
              var slPaint = function() {
                slRaf = 0;
                var e = slLastE; slLastE = null;
                if (!e) return;
                var r = slider.getBoundingClientRect();
                var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                lastP = p;
                if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, p, down);
                if (label) label.innerText = Math.round(p * 100) + '%';
                onPct(p);
              };
              var update = function(e) {
                slLastE = e;
                if (!slRaf) slRaf = requestAnimationFrame(slPaint);
              };
              slider.onpointerdown = function(e) { down = true; slider.classList.add('is-dragging'); try { slider.setPointerCapture(e.pointerId); } catch (err) {} update(e); };
              slider.onpointermove = function(e) { if (down) update(e); };
              slider.onpointerup = slider.onpointercancel = function(e) {
                if (down) {
                  down = false;
                  slider.classList.remove('is-dragging');
                  if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, lastP, false);
                }
                try { slider.releasePointerCapture(e.pointerId); } catch (err) {}
              };
              if (window.__md3SliderWatch) window.__md3SliderWatch(slider, function() {
                var p = getP ? getP() : lastP;
                lastP = p;
                if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, p, false);
              });
            };
            function bindToggle(id, key, onLabel, offLabel) {
              var el = document.getElementById(id);
              if (!el || el._bound) return;
              el._bound = true;
              el.checked = !!store.get(key);
              el.addEventListener('change', function() {
                store.set(key, el.checked);
                showTip(el.checked ? onLabel : offLabel);
              });
            }
            function initOnce() {
              if (!sfx) sfx = window.__sfx;
              // 五通道音量（media=引擎真值；call/ring/notification/alarm=store 真源）
              bindSlider(
                document.getElementById('sndMediaSlider'),
                document.getElementById('sndMediaFill'),
                document.getElementById('sndMediaThumb'),
                document.getElementById('sndMediaVal'),
                function(p) { if (window.__settingsMedia) window.__settingsMedia.setVolume(p); },
                function() { return window.__settingsMedia ? window.__settingsMedia.getVolume() : 0.6; }
              );
              bindSlider(
                document.getElementById('sndCallSlider'),
                document.getElementById('sndCallFill'),
                document.getElementById('sndCallThumb'),
                document.getElementById('sndCallVal'),
                function(p) { store.set('call', Math.round(p * 100)); },
                function() { return (store.get('call') || 0) / 100; }
              );
              bindSlider(
                document.getElementById('sndRingSlider'),
                document.getElementById('sndRingFill'),
                document.getElementById('sndRingThumb'),
                document.getElementById('sndRingVal'),
                function(p) { store.set('ring', Math.round(p * 100)); },
                function() { return (store.get('ring') || 0) / 100; }
              );
              bindSlider(
                document.getElementById('sndNotifSlider'),
                document.getElementById('sndNotifFill'),
                document.getElementById('sndNotifThumb'),
                document.getElementById('sndNotifVal'),
                function(p) { store.set('notification', Math.round(p * 100)); },
                function() { return (store.get('notification') || 0) / 100; }
              );
              bindSlider(
                document.getElementById('sndAlarmSlider'),
                document.getElementById('sndAlarmFill'),
                document.getElementById('sndAlarmThumb'),
                document.getElementById('sndAlarmVal'),
                function(p) { store.set('alarm', Math.round(p * 100)); },
                function() { return (store.get('alarm') || 0) / 100; }
              );
              // 激活回同步真值（v8.03 fix(audit-E) 惯例：媒体音量被播放器/快捷设置改过后回来仍显示旧值）
              if (window.__settingsMedia && window.__settingsMedia.getVolume) {
                var mv = Math.round(window.__settingsMedia.getVolume() * 100);
                var mvLabel = document.getElementById('sndMediaVal');
                if (mvLabel) mvLabel.innerText = mv + '%';
                if (window.__md3SliderSet) window.__md3SliderSet(document.getElementById('sndMediaSlider'), document.getElementById('sndMediaFill'), document.getElementById('sndMediaThumb'), mv / 100, false);
              }
              ['Call', 'Ring', 'Notif', 'Alarm'].forEach(function(ch) {
                var key = { Call: 'call', Ring: 'ring', Notif: 'notification', Alarm: 'alarm' }[ch];
                var v = Math.round((store.get(key) || 0));
                var label = document.getElementById('snd' + ch + 'Val');
                if (label) label.innerText = v + '%';
                if (window.__md3SliderSet) window.__md3SliderSet(document.getElementById('snd' + ch + 'Slider'), document.getElementById('snd' + ch + 'Fill'), document.getElementById('snd' + ch + 'Thumb'), v / 100, false);
              });
              // 开关六枚（store 真源 + AOSP 默认语义 Toast）
              bindToggle('sndDtmfToggle', 'dtmf', '拨号键盘提示音已开启', '拨号键盘提示音已关闭');
              bindToggle('sndScreenLockToggle', 'screenLock', '屏幕锁定提示音已开启', '屏幕锁定提示音已关闭');
              bindToggle('sndChargingToggle', 'charging', '充电提示音和振动已开启', '充电提示音和振动已关闭');
              bindToggle('sndDockingToggle', 'docking', '基座提示音已开启', '基座提示音已关闭');
              bindToggle('sndVibrateIconToggle', 'vibrateIcon', '振动图标常显已开启', '振动图标常显已关闭');
              bindToggle('sndPreventRingingToggle', 'preventRinging', '阻止响铃的快捷方式已开启', '阻止响铃的快捷方式已关闭');
              // touch_sounds = System.SOUND_EFFECTS_ENABLED 语义融合 sound-haptics 引擎（同一真源）
              var tsToggle = document.getElementById('sndTouchSoundsToggle');
              if (tsToggle && !tsToggle._bound) {
                tsToggle._bound = true;
                tsToggle.checked = sfx ? sfx.sfxEnabled() : true;
                tsToggle.addEventListener('change', function() {
                  if (sfx) { sfx.setSfxEnabled(tsToggle.checked); if (tsToggle.checked) sfx.play('tick'); }
                  showTip(tsToggle.checked ? '点按和点击提示音已开启' : '点按和点击提示音已关闭');
                });
              }
              // Web 扩展卡（v7.34 既有真实功能保留：sfx 音量 + 触感振动总闸）
              var xv = document.getElementById('sfxVolSlider');
              if (xv) bindSlider(
                xv,
                document.getElementById('sfxVolFill'),
                document.getElementById('sfxVolThumb'),
                document.getElementById('sfxVolVal'),
                function(p) { if (sfx) sfx.setVolume(p); },
                function() { return sfx ? sfx.getVolume() : 0.5; }
              );
              if (sfx && xv) {
                var cur = Math.round(sfx.getVolume() * 100);
                var xvLabel = document.getElementById('sfxVolVal');
                if (xvLabel) xvLabel.innerText = cur + '%';
                if (window.__md3SliderSet) window.__md3SliderSet(xv, document.getElementById('sfxVolFill'), document.getElementById('sfxVolThumb'), cur / 100, false);
              }
              var hapToggle = document.getElementById('sndHapticToggle');
              if (sfx && hapToggle && !hapToggle._bound) {
                hapToggle._bound = true;
                hapToggle.checked = sfx.hapticsEnabled();
                hapToggle.addEventListener('change', function() {
                  sfx.setHapticsEnabled(hapToggle.checked);
                  if (window.showSystemToast) window.showSystemToast(hapToggle.checked ? '触感振动反馈已开启' : '触感振动反馈已关闭');
                  if (hapToggle.checked && navigator.vibrate) navigator.vibrate(30);
                });
              }
            }
            initOnce();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 4) initOnce();
            });
          })();
        `;

const A11Y_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var STORE_KEY = 'settings:accessibility-v1';
            var DEFAULTS = { rbc: false, audioDescription: false };
            function load() {
              var s = {};
              try {
                var v = JSON.parse(localStorage.getItem(STORE_KEY));
                if (v && typeof v === 'object') { for (var k in DEFAULTS) { if (k in v) s[k] = v[k]; } }
              } catch (e) {}
              var out = {};
              for (var k2 in DEFAULTS) out[k2] = (k2 in s) ? s[k2] : DEFAULTS[k2];
              return out;
            }
            function save(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }
            if (typeof window !== 'undefined' && !window.__settingsA11yStore) {
              window.__settingsA11yStore = { load: load, save: save, DEFAULTS: DEFAULTS };
            }
            // 超越点：极暗 CSS filter 真实现（html 层独立于 body.filter 亮度链，乘法合成）
            function applyRbc(on) {
              var el = document.documentElement;
              el.style.transition = 'filter .25s ease';
              el.style.filter = on ? 'brightness(0.5)' : '';
            }
            function setSw(id, on) { var sw = document.getElementById(id); if (sw) sw.checked = !!on; }
            function refresh() {
              var s = load();
              setSw('a11yRbcToggle', s.rbc);
              setSw('a11yAudioDescToggle', s.audioDescription);
              applyRbc(s.rbc);
            }
            function bind() {
              var rbc = document.getElementById('a11yRbcToggle');
              if (rbc && !rbc.dataset.v802Bound) {
                rbc.dataset.v802Bound = '1';
                rbc.addEventListener('change', function() {
                  var s = load();
                  s.rbc = !!rbc.checked; // Secure REDUCE_BRIGHT_COLORS_ACTIVATED 1/0
                  save(s);
                  applyRbc(s.rbc);
                });
              }
              var ad = document.getElementById('a11yAudioDescToggle');
              if (ad && !ad.dataset.v802Bound) {
                ad.dataset.v802Bound = '1';
                ad.addEventListener('change', function() {
                  var s = load();
                  s.audioDescription = !!ad.checked; // persistent=false 仅会话内状态
                  save(s);
                });
              }
            }
            window.__a11yRbcChange = function(sw) {
              var s = load();
              s.rbc = !!sw.checked;
              save(s);
              applyRbc(s.rbc);
            };
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 20) { refresh(); bind(); }
            });
          })();
        `;

// v7.51：pages 提为具名常量 —— 供 setPages() 注册给双栏模块（右栏注入回退路径取 content）
const settingsApp = {
  id: 'settings',
  name: '设置',
  pages: [
    {
      title: '设置',
      content: `
        <!-- v7.51 issue#7：Android 16 式双栏根（窄容器=单栏旧布局；宽容器由 JS 加 .tp-wide） -->
        <div class="tp-root">
          <div class="tp-left">
          <!-- 用户个人资料卡片 MD3 Elevated Card -->
          <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;display:flex;align-items:center;gap:16px;">
            <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,hsl(var(--md-h,215) 80% 40%),hsl(var(--md-h,215) 90% 65%));display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:600;box-shadow:var(--md-shadow-2);">
              A
            </div>
            <div style="display:flex;flex-direction:column;flex:1;">
              <span style="font-size:17px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">Android / MD3 用户</span>
              <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">Google 账号 · 同步与个性化</span>
            </div>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
          </div>

          <!-- 搜索胶囊（Android 16 双栏左栏同款；实时过滤下方分组） -->
          <div class="tp-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>
            <input type="text" placeholder="搜索设置" aria-label="搜索设置" />
          </div>

          <!-- 设置清单（由 settings-two-pane.js 统一生成：多彩底板 + 副标题 + 双栏导航桥） -->
          ${renderSettingsListHTML()}
      
          </div><!-- /tp-left -->

          <!-- 右栏详情面板（⑤ 空态引导；宽格局下由双栏模块把栈页移入/注入到此） -->
          <div class="tp-right">
            <div class="tp-empty">
              <div class="tp-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v6.2a2 2 0 0 1-.4 1.2L4.2 16a2.6 2.6 0 0 0 2.1 4.2h11.4a2.6 2.6 0 0 0 2.1-4.2l-4.4-5.6a2 2 0 0 1-.4-1.2V3"/><path d="M7.5 3h9"/></svg>
              </div>
              <div class="tp-empty-t">请打开一个设置项以查看</div>
              <div class="tp-empty-s">从左侧选择一项设置，详情将在这里展示</div>
            </div>
          </div><!-- /tp-right -->
        </div><!-- /tp-root -->

          <script>
            // 主页动态徽标：当前模式名 + 当前动画预设名
            (function() {
              var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
              function refresh() {
                var hint = document.getElementById('profileModeHint');
                if (hint && window.__profiles) hint.innerText = window.__profiles.current() === 'work' ? '工作' : '个人';
                var animHint = document.getElementById('animPresetHint');
                if (animHint && window.__animPresets) animHint.innerText = window.__animPresets.currentName();
                var bgHint = document.getElementById('bgModeHint');
                if (bgHint && window.__bgFreeze) bgHint.innerText = window.__bgFreeze.modeName();
                var navHint = document.getElementById('navModeHint');
                if (navHint && window.__navBar) navHint.innerText = window.__navBar.enabled() ? '三键导航' : '手势导航';
                // v7.99 #10 二期：存储一级摘要 —— TopLevelStoragePreferenceController 语义
                // storage_summary「已使用 X - 还剩 Y」（X=使用率，Y=剩余空间），
                // window.__storageStats 单一真源异步刷新（与存储页 7 同源）
                var storageSub = document.getElementById('settingsStorageSub');
                if (storageSub && window.__storageStats) {
                  window.__storageStats.collect().then(function(s) {
                    if (!storageSub.isConnected) return; // 行随页面离场则丢弃
                    var pct = s.idb && s.idb.quota ? (s.idb.usage / s.idb.quota) * 100 : 0;
                    var free = s.idb && s.idb.quota ? (s.idb.quota - s.idb.usage) : 0;
                    storageSub.textContent = '已使用 ' + Math.round(Math.min(100, pct)) + '% - 还剩 ' + window.__storageStats.formatBytes(free);
                  }).catch(function() {});
                }
              }
              refresh();
              bindDoc('settings', 'app-page-active', function(e) {
                if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 0) refresh();
              });
              // v7.51 issue#7：挂载双栏分屏（幂等）——首次执行 + 每次页面激活/弹回栈根重估
              var tpRoot = document.querySelector('.tp-root');
              function tpBoot() {
                var root = document.querySelector('.tp-root:not([data-tp-mounted="1"])') || tpRoot;
                if (root && window.__settingsTwoPaneMount) window.__settingsTwoPaneMount(root);
                if (window.__settingsTwoPaneReEval) window.__settingsTwoPaneReEval();
              }
              tpBoot();
              bindDoc('settings', 'app-page-active', function(e) {
                if (e.detail && e.detail.appId === 'settings') tpBoot();
              });
            })();
          </script>
      `,
    },
    {
      title: '显示与亮度',
      content: `<div style="padding:16px 0;">
        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:12px;display:flex;justify-content:space-between;">
            <span>屏幕亮度</span>
            <span id="dispBriVal" style="color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">75%</span>
          </div>
          <!-- MD3 Expressive Slider（v7.39 原生厚轨道双段 + 竖柄药丸，高度由类级 64px 接管） -->
          <div class="md3-slider is-continuous" id="dispBriSlider">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="dispBriFill"></div>
            <div class="m3-slider-stop-dot"></div>
            <div class="md3-slider-thumb" id="dispBriThumb"></div>
          </div>
        </div>

        <div class="md3-card" style="padding:4px 0;overflow:hidden;">
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">护眼夜览模式</span>
            <label class="md3-switch"><input type="checkbox" id="dispNightToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">暗黑色彩方案</span>
            <label class="md3-switch"><input type="checkbox" id="dispDarkToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">自适应光感亮度</span>
            <label class="md3-switch"><input type="checkbox" id="dispAutoBrightToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <script>
          (function() {
            var s = document.getElementById('dispBriSlider');
            var f = document.getElementById('dispBriFill');
            var th = document.getElementById('dispBriThumb');
            var v = document.getElementById('dispBriVal');
            if (!s) return;
            // v7.34 rAF 合帧（末事件原则）+ v7.38 transform 驱动：
            // width/left 是 layout+paint 属性，快速拖动时 fill 大色块重光栅
            // 滞后于 thumb 小竖条 → 视觉脱节（GitHub issue 实测最大 52px）；
            // 现两者均走合成器属性，零 layout 零重光栅，天然同帧
            var briRaf = 0, briLastE = null, briDown = false, briP = 0.75;
            var briPaint = function() {
              briRaf = 0;
              var e = briLastE; briLastE = null;
              if (!e) return;
              var r = s.getBoundingClientRect();
              var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
              briP = p;
              if (window.__md3SliderSet) window.__md3SliderSet(s, f, th, p, briDown);
              if (v) v.innerText = Math.round(p * 100) + '%';
            };
            var update = function(e) {
              briLastE = e;
              if (!briRaf) briRaf = requestAnimationFrame(briPaint);
            };
            var down = false;
            s.onpointerdown = function(e) { briDown = true; down = true; s.classList.add('is-dragging'); try { s.setPointerCapture(e.pointerId); } catch (err) {} update(e); };
            s.onpointermove = function(e) { if (down) update(e); };
            s.onpointerup = s.onpointercancel = function(e) {
              down = false; briDown = false;
              s.classList.remove('is-dragging');
              if (window.__md3SliderSet) window.__md3SliderSet(s, f, th, briP, false); // v7.39 桥内已无按压 scaleY，纯重绘落定
              try { s.releasePointerCapture(e.pointerId); } catch(err){} if (navigator.vibrate) navigator.vibrate(8); };
            // 初值即时落位（模板不再带内联几何，避免隐藏期零宽错位）
            if (window.__md3SliderSet) window.__md3SliderSet(s, f, th, briP, false);
            if (v) v.innerText = Math.round(briP * 100) + '%';
            if (window.__md3SliderWatch) window.__md3SliderWatch(s, function() {
              if (window.__md3SliderSet) window.__md3SliderSet(s, f, th, briP, false);
            });

            // fix(audit-E): 三个假开关接真 —— 暗黑方案联动 theme-mode 单一真源；
            // 夜览/自适应光感无真实实现，不再预置假 checked 状态，切换时提示「敬请期待」并回弹。
            var darkToggle = document.getElementById('dispDarkToggle');
            var syncDark = function() {
              if (!darkToggle || !window.__settingsTheme) return;
              darkToggle.checked = window.__settingsTheme.resolved() === 'dark';
            };
            syncDark();
            if (darkToggle) {
              darkToggle.addEventListener('change', function() {
                if (!window.__settingsTheme) { darkToggle.checked = false; return; }
                // 与快捷设置深色磁贴同向：开 → 深色，关 → 浅色（auto 档按当前解析值切换）
                window.__settingsTheme.set(darkToggle.checked ? 'dark' : 'light');
                syncDark();
                if (window.showSystemToast) window.showSystemToast(darkToggle.checked ? '已切换到深色方案' : '已切换到浅色方案');
              });
            }
            ['dispNightToggle', 'dispAutoBrightToggle'].forEach(function(id) {
              var t = document.getElementById(id);
              if (!t) return;
              t.addEventListener('change', function() {
                t.checked = false; // 回弹：无真实实现，不保留假状态
                if (window.showSystemToast) window.showSystemToast('敬请期待');
              });
            });
            // 实例常驻内存：重新激活该页时回同步暗黑开关（快捷设置深色磁贴/主题面板可能已改值）
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 1) syncDark();
            });
          })();
        </script>
      </div>`,
    },
    {
      title: '电池',
      content: `<div style="padding:16px 0;text-align:center;">
        <div style="position:relative;display:inline-block;">
          <div id="settingsBatteryPct" style="font-size:56px;font-weight:200;color:var(--md-success,#a8f5bb);font-family:var(--md-font-num);transition:color .4s;">87%</div>
          <span id="settingsBatteryChargeBadge" style="display:none;position:absolute;top:2px;right:-34px;font-size:22px;color:var(--md-primary,#7df8db);">${ICONS.battery_charging}</span>
        </div>
        <div id="settingsBatteryEstimate" style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;">预计可用 8 小时 45 分钟</div>

        <div style="max-width:260px;margin:14px auto 0;height:8px;border-radius:99px;background:var(--md-surface-container-high,#353639);overflow:hidden;">
          <div id="settingsBatteryBar" style="width:87%;height:100%;border-radius:99px;background:var(--md-success,#a8f5bb);transition:width .6s cubic-bezier(.2,.8,.2,1),background .4s;"></div>
        </div>
        <div id="settingsBatterySource" style="font-size:11px;color:var(--md-outline,#6a6b6e);margin-top:8px;">数据来源：设备电池（实时）</div>

        <div class="md3-card" style="padding:4px 0;margin-top:24px;overflow:hidden;text-align:left;">
          <div class="md3-list-item" style="cursor:default;">
            <div class="md3-list-item-icon">${ICONS.battery_saver}</div>
            <span class="md3-list-item-text">省电模式</span>
            <label class="md3-switch"><input type="checkbox" id="settingsBatterySaverSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <!-- v7.48：移除「电池最大健康容量 98%」行 —— 写死假数据无实际用处（issue 反馈） -->

        <div class="md3-card" style="padding:4px 0;margin-top:12px;overflow:hidden;text-align:left;">
          <div class="md3-list-item" style="cursor:default;align-items:flex-start;">
            <div class="md3-list-item-icon" style="margin-top:10px;">${ICONS.speed}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;">耗电速率</div>
              <div id="settingsBatteryDrainRate" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 10px;">测量中 · 需观察一格电量变化</div>
            </div>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;align-items:flex-start;">
            <div class="md3-list-item-icon" style="margin-top:10px;">${ICONS.battery_charging}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;">充电速率</div>
              <div id="settingsBatteryChargeRate" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 10px;">接入充电器后开始测量</div>
            </div>
          </div>
        </div>

        <div class="md3-card" id="settingsSimChargerCard" style="padding:4px 0;margin-top:12px;overflow:hidden;text-align:left;display:none;">
          <div class="md3-list-item">
            <div class="md3-list-item-icon">${ICONS.bolt}</div>
            <span class="md3-list-item-text">接入充电器（模拟）</span>
            <label class="md3-switch"><input type="checkbox" id="settingsSimChargerSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>

        <!-- v7.80 充电涟漪卡：预览 + 充电口位置（手机/平板随横竖屏自动解析）+ 涟漪颜色 -->
        <div class="md3-card" style="padding:4px 0 14px;margin-top:12px;overflow:hidden;text-align:left;">
          <div class="md3-list-item" style="cursor:default;">
            <div class="md3-list-item-icon">${ICONS.water_drop}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;">充电涟漪</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 8px;">接入充电器时从充电口扩散的 Expressive 涟漪</div>
            </div>
            <button id="ripplePreviewBtn" style="border:0;border-radius:999px;padding:8px 18px;font:inherit;font-size:13px;font-weight:600;background:var(--md-primary-container,var(--md-primary,#a8c7fa));color:var(--md-on-primary-container,var(--md-on-primary,#042e4e));cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;">预览</button>
          </div>
          <div style="padding:2px 16px 0;">
            <div style="font-size:12px;color:var(--md-outline,#6a6b6e);margin:6px 0 8px;">手机充电口位置（竖屏）</div>
            <div id="ripplePortPhoneSeg" style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="ripple-chip" data-port="bc" aria-pressed="true" style="border:1px solid var(--md-outline-variant,#3a3b3e);border-radius:999px;padding:7px 14px;font:inherit;font-size:12.5px;font-weight:500;background:transparent;color:var(--md-on-surface-variant,#c4c7c5);cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;">底部中央</button>
              <button class="ripple-chip" data-port="br" aria-pressed="false" style="border:1px solid var(--md-outline-variant,#3a3b3e);border-radius:999px;padding:7px 14px;font:inherit;font-size:12.5px;font-weight:500;background:transparent;color:var(--md-on-surface-variant,#c4c7c5);cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;">底部偏右</button>
              <button class="ripple-chip" data-port="cc" aria-pressed="false" style="border:1px solid var(--md-outline-variant,#3a3b3e);border-radius:999px;padding:7px 14px;font:inherit;font-size:12.5px;font-weight:500;background:transparent;color:var(--md-on-surface-variant,#c4c7c5);cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;">屏幕中央</button>
            </div>
            <div style="font-size:12px;color:var(--md-outline,#6a6b6e);margin:14px 0 8px;">平板 / 横屏充电口位置</div>
            <div id="ripplePortTabletSeg" style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="ripple-chip" data-port="lc" aria-pressed="true" style="border:1px solid var(--md-outline-variant,#3a3b3e);border-radius:999px;padding:7px 14px;font:inherit;font-size:12.5px;font-weight:500;background:transparent;color:var(--md-on-surface-variant,#c4c7c5);cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;">左侧中央</button>
              <button class="ripple-chip" data-port="rc" aria-pressed="false" style="border:1px solid var(--md-outline-variant,#3a3b3e);border-radius:999px;padding:7px 14px;font:inherit;font-size:12.5px;font-weight:500;background:transparent;color:var(--md-on-surface-variant,#c4c7c5);cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;">右侧中央</button>
            </div>
            <div style="font-size:12px;color:var(--md-outline,#6a6b6e);margin:14px 0 8px;">涟漪颜色</div>
            <div id="rippleColorRow" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding-bottom:4px;">
              <button class="ripple-swatch" data-color="" aria-pressed="true" title="跟随主题" style="width:30px;height:30px;border-radius:50%;border:2px solid var(--md-outline-variant,#3a3b3e);cursor:pointer;padding:0;background:var(--md-primary,#a8c7fa);touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
              <button class="ripple-swatch" data-color="27,114,200" aria-pressed="false" title="经典蓝" style="width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background:#1b72c8;touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
              <button class="ripple-swatch" data-color="103,80,164" aria-pressed="false" title="M3 紫" style="width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background:#6750a4;touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
              <button class="ripple-swatch" data-color="16,108,124" aria-pressed="false" title="青绿" style="width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background:#107c8c;touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
              <button class="ripple-swatch" data-color="255,255,255" aria-pressed="false" title="纯白" style="width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background:#ffffff;touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
              <button class="ripple-swatch" data-color="0,191,165" aria-pressed="false" title="薄荷" style="width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background:#00bfa5;touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
              <button class="ripple-swatch" data-color="255,171,64" aria-pressed="false" title="琥珀" style="width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;background:#ffab40;touch-action:manipulation;-webkit-user-select:none;user-select:none;"></button>
            </div>
          </div>
        </div>
        <p style="color:var(--md-on-surface-variant,#9a9b9e);font-size:12px;margin-top:16px;text-align:center;">上次充电完成：今天 08:15</p>
      </div>`,
    },
    {
      title: '已移除的应用',
      content: `<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;">从桌面移除的应用可以在此恢复</div>
        <div id="removedAppsList"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var list = document.getElementById('removedAppsList');
            if (!list) return;
            // 本应用由桌面文档 DOM 注入渲染：window 即桌面上下文。
            // 恢复消息必须发给桌面自身（旧实现 window.parent 在壳页 iframe 嵌套时
            // 指向壳页，壳页无监听器，导致"点恢复无反应"）；parent 仅作 iframe
            // 承载形态的兜底（此时 parent 才是桌面）。
            function postRestore(appId) {
              try { window.postMessage({ type: 'restore-app', appId: appId }, '*'); } catch (e) {}
              if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: 'restore-app', appId: appId }, '*'); } catch (e) {}
              }
            }
            function renderList() {
              var removed = [];
              try { removed = JSON.parse(localStorage.getItem('ios-desktop:removed-apps') || '[]'); } catch(e) {}
              list.innerHTML = '';
              if (removed.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:48px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;">暂无已移除的应用</div>';
                return;
              }
              removed.forEach(function(app) {
                var item = document.createElement('div');
                item.className = 'md3-card';
                item.style.cssText = 'display:flex;align-items:center;gap:14px;padding:14px 18px;margin-bottom:12px;';
                // 图标与桌面同源：本地 SVG（app-icons.js），不再读遗留网络图 app.iconUrl
                var iconHTML = '<div style="width:42px;height:42px;border-radius:12px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(app.id) + '</div>';
                item.innerHTML = iconHTML + '<span style="flex:1;font-size:15px;font-weight:500;color:var(--md-on-surface,hsl(var(--md-h,215) 10% 90%));">'+app.name+'</span><button class="md3-btn md3-btn-filled" style="padding:6px 18px;font-size:13px;" data-app-id="'+app.id+'" data-act="restore">恢复</button>';
                item.querySelector('[data-act="restore"]').addEventListener('click', function() {
                  var appId = this.getAttribute('data-app-id');
                  postRestore(appId);
                  setTimeout(function() { if (window.popSubPage) window.popSubPage(); }, 300);
                });
                list.appendChild(item);
              });
            }
            renderList();
            // 应用实例常驻内存：每次该子页重新激活时重建列表，避免展示已恢复过的旧条目
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 3) renderList();
            });
          })();
        </script>
      </div>`,
    },
    {
      // ===== 提示音和振动（v8.03：sound_settings.xml 26 keys 1:1 转正，#23 差距矩阵①） =====
      title: '提示音和振动',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">提示音和振动</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">音量、铃声、提示音（AOSP SoundSettings）</div>
          <!-- remote_media_group（order -185）：RemoteVolumeGroupController.getAvailabilityStatus
              mRoutingSessionInfos.isEmpty() → CONDITIONALLY_UNAVAILABLE（isAvailable 白名单外不渲染；
              Web 无远程媒体路由会话）隐藏注记 -->
          <!-- media_volume（order -180）：MediaVolumePreferenceController（config_show_media_volume=true）
              AVAILABLE；真实联动 __settingsMedia（HTML5 Audio 引擎音量） -->
          <div class="md3-list-item" data-test="snd-media" style="min-height:76px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div class="md3-list-item-icon">${AOSP_ICONS.volMedia || ''}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:15px;">媒体音量</span>
                <span id="sndMediaVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">60%</span>
              </div>
              <div class="md3-slider" id="sndMediaSlider" style="margin-top:6px;">
                <div class="md3-slider-line"></div>
                <div class="md3-slider-fill" id="sndMediaFill"></div>
                <div class="md3-slider-thumb" id="sndMediaThumb"></div>
              </div>
            </div>
          </div>
          <!-- media_output（order -175）：AudioSwitchPreferenceController.getAvailabilityStatus
              FeatureFlagUtils DEFAULT_FLAGS.put("settings_audio_switcher","true") + FEATURE_BLUETOOTH
              → AVAILABLE；displayPreference 无媒体会话标题取 media_output_title_without_playing
              「音频播放位置：」，摘要 media_output_default_summary「此设备」 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="snd-media-output" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">音频播放位置：</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">此设备</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- call_volume（order -170）：CallVolumePreferenceController（config_show_call_volume=true
              && !AudioSystem.isSingleVolume(config_single_volume=false)）AVAILABLE -->
          <div class="md3-list-item" data-test="snd-call" style="min-height:76px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div class="md3-list-item-icon">${AOSP_ICONS.volCall || ''}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:15px;">通话音量</span>
                <span id="sndCallVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">50%</span>
              </div>
              <div class="md3-slider" id="sndCallSlider" style="margin-top:6px;">
                <div class="md3-slider-line"></div>
                <div class="md3-slider-fill" id="sndCallFill"></div>
                <div class="md3-slider-thumb" id="sndCallThumb"></div>
              </div>
            </div>
          </div>
          <!-- take_call_on_output（order -165）：HandsFreeProfileOutputPreferenceController 基类
              AVAILABLE，但 updateState 无 HFP/HAP 连接设备 setVisible(false) → 隐藏注记 -->
          <!-- separate_ring_volume（order -155）：SeparateRingVolumePreferenceController
              (!isSingleVolume) AVAILABLE——铃声与通知分轨的铃声音量（STREAM_RING） -->
          <div class="md3-list-item" data-test="snd-ring" style="min-height:76px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div class="md3-list-item-icon">${AOSP_ICONS.volRing || ''}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:15px;">铃声音量</span>
                <span id="sndRingVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">70%</span>
              </div>
              <div class="md3-slider" id="sndRingSlider" style="margin-top:6px;">
                <div class="md3-slider-line"></div>
                <div class="md3-slider-fill" id="sndRingFill"></div>
                <div class="md3-slider-thumb" id="sndRingThumb"></div>
              </div>
            </div>
          </div>
          <!-- notification_volume（order -150）：NotificationVolumePreferenceController
              (config_show_notification_volume=true && !isSingleVolume && RINGER_MODE_NORMAL)
              AVAILABLE -->
          <div class="md3-list-item" data-test="snd-notif" style="min-height:76px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div class="md3-list-item-icon">${AOSP_ICONS.volNotif || ''}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:15px;">通知音量</span>
                <span id="sndNotifVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">70%</span>
              </div>
              <div class="md3-slider" id="sndNotifSlider" style="margin-top:6px;">
                <div class="md3-slider-line"></div>
                <div class="md3-slider-fill" id="sndNotifFill"></div>
                <div class="md3-slider-thumb" id="sndNotifThumb"></div>
              </div>
            </div>
          </div>
          <!-- alarm_volume（order -140）：AlarmVolumePreferenceController
              (config_show_alarm_volume=true && !isSingleVolume) AVAILABLE。
              #11 时钟应用前置依赖：闹钟响铃音量消费 window.__settingsSoundStore.get('alarm') -->
          <div class="md3-list-item" data-test="snd-alarm" style="min-height:76px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div class="md3-list-item-icon">${AOSP_ICONS.volAlarm || ''}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:15px;">闹钟音量</span>
                <span id="sndAlarmVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">70%</span>
              </div>
              <div class="md3-slider" id="sndAlarmSlider" style="margin-top:6px;">
                <div class="md3-slider-line"></div>
                <div class="md3-slider-fill" id="sndAlarmFill"></div>
                <div class="md3-slider-thumb" id="sndAlarmThumb"></div>
              </div>
            </div>
          </div>
          <!-- zen_mode（order -130）：ZenModePreferenceController
              Flags.modesUi() ? UNSUPPORTED_ON_DEVICE : AVAILABLE_UNSEARCHABLE——一级「模式」
              ZenModesLink 同 flag 正向门控（v7.98 已转正）→ 本行反向 UNSUPPORTED 隐藏（v8.01 一致性裁决） -->
          <!-- phone_ringtone（order -120）：DefaultRingtonePreference；PhoneRingtonePreferenceController
              isVoiceCapable（Pixel 手机形态）→ AVAILABLE；summary=summary_placeholder 忠实空呈现 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="snd-phone-ringtone" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">手机铃声</span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- Live Caption（-110）/ Now Playing（-105）：XML 注释声明由代码动态插入，当前
              SoundSettings.buildPreferenceControllers 未注册对应 controller → 不渲染注记 -->
          <!-- spatial_audio_summary（order -107）：SpatialAudioParentPreferenceController
              Spatializer.SPATIALIZER_IMMERSIVE_LEVEL_NONE → UNSUPPORTED_ON_DEVICE（Web 无空间音频硬件）隐藏注记 -->
          <!-- media_controls_summary（order -100）：MediaControlsParentPreferenceController AVAILABLE；
              动态摘要 Secure.MEDIA_CONTROLS_RESUME 默认 1 → media_controls_show_player「显示播放器」 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="snd-media-controls" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">媒体</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">显示播放器</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- vibration_and_haptics（order -90）：VibrationPreferenceController（hasVibrator →
              AVAILABLE），动态摘要 getSummary VIBRATE_ON 默认开 → 「已开启」（v8.02 页 20 同款语义）；
              fragment=VibrationSettings 子页未转正，忠实入口行 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="snd-vibration" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">振动和触感反馈</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">已开启</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- gesture_prevent_ringing_sound（order -80）：PreventRingingParentPreferenceController
              (config_volumeHushGestureEnabled=true && config_longPressOnPowerForAssistantSettingAvailable=true)
              AVAILABLE；PrimarySwitchPreference 开关 + fragment 子页语义 -->
          <div class="md3-list-item" data-test="snd-prevent-ringing" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">阻止响铃的快捷方式</span>
            <label class="md3-switch"><input type="checkbox" id="sndPreventRingingToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- notification_ringtone（order -70）：DefaultRingtonePreference；
              NotificationRingtonePreferenceController config_show_notification_ringtone=true → AVAILABLE -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="snd-notif-ringtone" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">默认通知提示音</span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- alarm_ringtone（order -60）：DefaultRingtonePreference（persistent=false）；
              AlarmRingtonePreferenceController 无门控 → AVAILABLE -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="snd-alarm-ringtone" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">默认闹钟提示音</span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- dtmf_tone（order -50）：DialPadTonePreferenceController isVoiceCapable → AVAILABLE；
              SettingPref TYPE_SYSTEM DTMF_TONE_WHEN_DIALING 默认 DEFAULT_ON(1) -->
          <div class="md3-list-item" data-test="snd-dtmf" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">拨号键盘提示音</span>
            <label class="md3-switch"><input type="checkbox" id="sndDtmfToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- screen_locking_sounds（order -45）：ScreenLockSoundPreferenceController
              config_show_screen_locking_sounds=true → AVAILABLE；System.LOCKSCREEN_SOUNDS_ENABLED 默认开 -->
          <div class="md3-list-item" data-test="snd-screenlock" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">屏幕锁定提示音</span>
            <label class="md3-switch"><input type="checkbox" id="sndScreenLockToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- charging_sounds（order -40）：ChargingSoundPreferenceController
              config_show_charging_sounds=true → AVAILABLE；Secure.CHARGING_SOUNDS_ENABLED 默认开 -->
          <div class="md3-list-item" data-test="snd-charging" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">充电提示音和振动</span>
            <label class="md3-switch"><input type="checkbox" id="sndChargingToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- docking_sounds（order -35）：DockingSoundPreferenceController 无门控 → AVAILABLE；
              Global.DOCK_SOUNDS_ENABLED 默认 DEFAULT_ON(1) -->
          <div class="md3-list-item" data-test="snd-docking" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">基座提示音</span>
            <label class="md3-switch"><input type="checkbox" id="sndDockingToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- touch_sounds（order -30）：TouchSoundPreferenceController config_show_touch_sounds=true
              → AVAILABLE；System.SOUND_EFFECTS_ENABLED 默认开——与 sound-haptics 引擎 sfxEnabled
              同一语义真源融合（开关驱动 WebAudio 合成音效引擎） -->
          <div class="md3-list-item" data-test="snd-touchsounds" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">点按和点击提示音</span>
            <label class="md3-switch"><input type="checkbox" id="sndTouchSoundsToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- vibrate_icon（order -27）：VibrateIconPreferenceController isAvailable=mHasVibrator →
              AVAILABLE；Secure.STATUS_BAR_SHOW_VIBRATE_ICON 默认 0（关） -->
          <div class="md3-list-item" data-test="snd-vibrateicon" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">使用振动模式时一律显示振动图标</span></span>
            <label class="md3-switch"><input type="checkbox" id="sndVibrateIconToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- dock_audio_media（order -20）：DockAudioMediaPreferenceController SettingPref.isApplicable
              =isLeDesk() && R.bool.has_dock_settings(false) → removePreference 隐藏注记 -->
          <!-- boot_sounds（order -15）：BootSoundPreferenceController isAvailable
              =R.bool.has_boot_sounds(false) → UNSUPPORTED 隐藏注记 -->
          <!-- emergency_tone（order -10）：EmergencyTonePreferenceController SettingPref.isApplicable
              =TelephonyManager.getCurrentPhoneType()==PHONE_TYPE_CDMA → GSM/LTE Pixel false
              → removePreference 隐藏注记 -->
          <!-- sound_work_settings（order 100）：WorkSoundsPreferenceController
              SoundWorkSettings.isSupportWorkProfileSound 无工作资料 → DISABLED_FOR_USER
              （isAvailable 白名单外）隐藏注记 -->

          <!-- Web 扩展卡（铁律#2 合法超越：AOSP XML 无对应条目，保留 v7.34 既有真实功能） -->
          <div class="md3-card" style="margin-top:16px;padding:14px 16px;">
            <div style="font-size:13px;font-weight:600;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:10px;">系统音效（Web 扩展 · AOSP 无对应条目）</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:14px;">音效音量</span>
              <span id="sfxVolVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">50%</span>
            </div>
            <div class="md3-slider" id="sfxVolSlider">
              <div class="md3-slider-line"></div>
              <div class="md3-slider-fill" id="sfxVolFill"></div>
              <div class="md3-slider-thumb" id="sfxVolThumb"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
              <span style="font-size:14px;">触感振动反馈</span>
              <label class="md3-switch"><input type="checkbox" id="sndHapticToggle"><span class="slider"><span class="thumb"></span></span></label>
            </div>
            <div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:8px;line-height:1.6;">音效由 WebAudio 实时合成，无外部音频文件；触感振动依赖 navigator.vibrate 能力（部分桌面浏览器调用静默无效）。</div>
          </div>
        </div>
        <script>` + SOUND_PAGE_SCRIPT + `</script>`,
    },
    {
      title: '应用权限',
      content: `<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;line-height:1.6;">应用在首次使用相机、麦克风、位置信息等敏感能力时会向您申请授权，可随时在此查看与改判；关闭后应用调用相关能力时将被拒绝。<br>注意：应用内授权与浏览器层真实权限相互独立——即使此处选择允许，浏览器仍可能弹出自家的原生授权框，需要您在浏览器里再允许一次，属正常行为。</div>
        <div id="permAppsList"></div>
        <div style="text-align:center;margin-top:22px;">
          <button id="permResetBtn" style="background:none;border:1px solid var(--md-outline-variant);color:hsl(var(--md-h,215) 80% 64%);font-size:13.5px;font-weight:600;padding:10px 26px;border-radius:20px;cursor:pointer;">重置全部权限</button>
        </div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var list = document.getElementById('permAppsList');
            if (!list) return;
            // 本应用与桌面同文档运行（原生页面），window.__permissions 由 main.js 初始化 permissions.js 时注册
            function esc(s) {
              return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
            }
            function permLabel(k) {
              var meta = window.__permissions && window.__permissions.PERMISSION_META && window.__permissions.PERMISSION_META[k];
              return meta ? meta.label : k;
            }
            function renderList() {
              var P = window.__permissions;
              list.innerHTML = '';
              if (!P) {
                list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">权限服务尚未就绪</div>';
                return;
              }
              var all = P.getAllPermissions();
              var appIds = Object.keys(all).filter(function(id) {
                var rec = all[id] || {};
                return Object.keys(rec).some(function(k) { return k[0] !== '_'; });
              });
              if (!appIds.length) {
                list.innerHTML = '<div style="text-align:center;padding:48px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;line-height:1.8;">暂无权限申请记录<br><span style="font-size:12px;opacity:0.8;">应用首次使用相机 / 位置等能力时会出现在这里</span></div>';
                return;
              }
              appIds.forEach(function(appId) {
                var rec = all[appId] || {};
                var perms = Object.keys(rec).filter(function(k) { return k[0] !== '_'; });
                if (!perms.length) return;
                var appName = rec.__name || appId;
                // 图标与桌面同源：本地 SVG，不再读 localStorage 遗留网络图 __icon
                var iconHtml = '<div style="width:38px;height:38px;border-radius:11px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(appId) + '</div>';
                var chipRows = perms.map(function(pk) {
                  var checked = rec[pk] ? ' checked' : '';
                  return '<div style="display:flex;align-items:center;gap:8px;width:50%;min-width:150px;padding:5px 0;box-sizing:border-box;">' +
                    '<span style="font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);flex:1;">' + esc(permLabel(pk)) + '</span>' +
                    '<label class="md3-switch" style="transform:scale(0.8);transform-origin:right center;"><input type="checkbox" data-app="' + esc(appId) + '" data-perm="' + esc(pk) + '"' + checked + '><span class="slider"><span class="thumb"></span></span></label>' +
                    '</div>';
                }).join('');
                var card = document.createElement('div');
                card.className = 'md3-card';
                card.style.cssText = 'padding:10px 16px;margin-bottom:12px;';
                card.innerHTML =
                  '<div style="display:flex;align-items:center;gap:12px;padding:4px 0 8px;">' + iconHtml +
                  '<span style="flex:1;font-size:15px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">' + esc(appName) + '</span>' +
                  '<span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">' + perms.length + ' 项权限</span></div>' +
                  '<div style="display:flex;flex-wrap:wrap;gap:0 10px;">' + chipRows + '</div>';
                list.appendChild(card);
              });
              list.querySelectorAll('input[type="checkbox"]').forEach(function(input) {
                input.addEventListener('change', function() {
                  P.setPermission(input.getAttribute('data-app'), input.getAttribute('data-perm'), input.checked);
                  if (window.showSystemToast) window.showSystemToast(input.checked ? '已允许该权限' : '已拒绝该权限，应用下次调用时生效');
                });
              });
            }
            document.getElementById('permResetBtn').addEventListener('click', function() {
              var P = window.__permissions;
              if (!P) return;
              if (confirm('确定重置全部权限记录？\\n所有应用下次使用敏感能力时将重新弹出授权询问。')) {
                P.clearAllPermissions();
                renderList();
                if (window.showSystemToast) window.showSystemToast('已重置全部权限记录');
              }
            });
            renderList();
            // 应用实例常驻内存：每次该子页重新激活时重建列表，反映最新权限状态
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 5) renderList();
            });
          })();
        </script>
      </div>`,
    },
    // ==================== 批次二新增页 ====================
    {
      // 页 6：应用管理（全部应用一览 + 卸载 / 恢复）
      title: '应用管理',
      content: `<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;">卸载将从桌面移除应用（可随时恢复）；系统应用不可卸载</div>
        <div id="installedAppsList"></div>
        <div id="appMgmtRemovedSection"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var installedBox = document.getElementById('installedAppsList');
            var removedBox = document.getElementById('appMgmtRemovedSection');
            if (!installedBox || !removedBox) return;
            function postToDesktop(type, appId) {
              try { window.postMessage({ type: type, appId: appId }, '*'); } catch (e) {}
              if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: type, appId: appId }, '*'); } catch (e) {}
              }
            }
            function esc(s) {
              return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
            }
            function iconHtml(app) {
              // 与桌面同源：本地 SVG（app-icons.js），不再读遗留网络图 app.iconUrl
              return '<div style="width:40px;height:40px;border-radius:11px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(app.id) + '</div>';
            }
            function appCard(app, actionLabel, actionType, danger) {
              var isSystem = app.id === 'settings';
              var btn = isSystem
                ? '<span style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);opacity:.7;">系统应用</span>'
                : '<button class="md3-btn ' + (danger ? 'md3-btn-tonal' : 'md3-btn-filled') + '" style="padding:6px 18px;font-size:13px;' + (danger ? 'color:#ff8a8a;' : '') + '" data-app-id="' + esc(app.id) + '" data-act="' + actionType + '">' + actionLabel + '</button>';
              return '<div class="md3-card" style="display:flex;align-items:center;gap:14px;padding:12px 16px;margin-bottom:10px;">' +
                iconHtml(app) +
                '<div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:500;color:var(--md-on-surface,#e2e2e9);">' + esc(app.name) + '</div>' +
                '<div style="font-size:11.5px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:1px;">' + esc(app.id) + '</div></div>' +
                btn + '</div>';
            }
            function render() {
              var st = window.__state;
              installedBox.innerHTML = '';
              removedBox.innerHTML = '';
              if (!st || !Array.isArray(st.pagesApps)) {
                installedBox.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">桌面状态尚未就绪</div>';
                return;
              }
              // 已安装：拍平 pagesApps，按 id 去重（文件夹内的应用同样纳入）
              // fix(audit-E): 文件夹真实字段为 type:'folder' + apps（app.children 恒
              // undefined）—— 此前文件夹被当普通应用列入可卸载清单（副标题显示内部
              // folder_xxx id），其成员永不出现在清单。改为递归展开：跳过文件夹自身、
              // 其 apps 成员计入清单（嵌套防御：只下钻一层，文件夹不可嵌套放置）。
              var seen = new Set();
              var removedIds = new Set((st.removedApps || []).map(function(a) { return a.id; }));
              var addApp = function(app) {
                if (!app || !app.id || seen.has(app.id) || removedIds.has(app.id)) return;
                seen.add(app.id);
                installedBox.insertAdjacentHTML('beforeend', appCard(app, '卸载', 'uninstall', true));
              };
              st.pagesApps.forEach(function(page) {
                (page || []).forEach(function(app) {
                  if (app && app.type === 'folder') {
                    (app.apps || []).forEach(addApp);
                    return;
                  }
                  addApp(app);
                });
              });
              removedBox.innerHTML = '<div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:18px 4px 10px;">已卸载（点击恢复）</div>';
              if (!(st.removedApps || []).length) {
                removedBox.insertAdjacentHTML('beforeend', '<div style="text-align:center;padding:22px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">没有已卸载的应用</div>');
              } else {
                st.removedApps.forEach(function(app) {
                  removedBox.insertAdjacentHTML('beforeend', appCard(app, '恢复', 'restore', false));
                });
              }
              installedBox.querySelectorAll('[data-act="uninstall"]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  var id = btn.getAttribute('data-app-id');
                  if (confirm('确定卸载该应用？\\n其桌面图标将被移除（应用数据保留），可随时在此恢复。')) {
                    // fix(audit-E): 文件夹成员走文件夹卸载桥（main.js 的 uninstall-app
                    // 只扫 pagesApps 顶层，命中不了 folder.apps 成员）；
                    // 顶层应用维持原有 postMessage 链路不变
                    var viaFolder = window.__settingsFolderUninstall ? window.__settingsFolderUninstall(id) : false;
                    if (!viaFolder) postToDesktop('uninstall-app', id);
                    setTimeout(render, 320);
                  }
                });
              });
              removedBox.querySelectorAll('[data-act="restore"]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  postToDesktop('restore-app', btn.getAttribute('data-app-id'));
                  setTimeout(render, 320);
                });
              });
            }
            render();
            // 实例常驻内存：重新激活子页时重建列表，反映最新安装状态
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 6) render();
            });
          })();
        </script>
      </div>`,
    },
    {
      // 页 7：存储空间占用
      title: '存储空间',
      content: `<div style="padding:16px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);">localStorage 逐键统计 + IndexedDB 实际配额，按应用归属聚合</div>
          <button id="storageRefreshBtn" class="md3-btn md3-btn-tonal" style="padding:6px 16px;font-size:13px;flex-shrink:0;">重新统计</button>
        </div>
        <div id="storageOverview"></div>
        <div id="storageByOwner"></div>
        <div id="storageTopKeys"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var ov = document.getElementById('storageOverview');
            var byOwnerBox = document.getElementById('storageByOwner');
            var topBox = document.getElementById('storageTopKeys');
            if (!ov) return;
            function fmt(b) { return window.__storageStats ? window.__storageStats.formatBytes(b) : (b || 0) + ' B'; }
            function nameOf(owner) { return window.__storageStats ? window.__storageStats.ownerDisplayName(owner) : owner; }
            function bar(pct, hue) {
              var p = Math.max(1.5, Math.min(100, pct || 0));
              return '<div style="height:6px;border-radius:3px;background:var(--md-outline-variant);overflow:hidden;margin-top:8px;"><div style="height:100%;width:' + p + '%;border-radius:3px;background:hsl(' + (hue || 215) + ' 70% 55%);"></div></div>';
            }
            function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
            function render() {
              if (!window.__storageStats) {
                ov.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">统计服务尚未就绪</div>';
                return;
              }
              // [v7.73] 等待态换 M3E LoadingIndicator（七形循环形变）——经 __m3eLoader
              // 沙箱桥挂载；collect() 落地后 innerHTML 整体替换，指示器随节点脱文档自回收
              ov.innerHTML = '<div style="text-align:center;padding:26px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">'
                + '<span id="storageStatLoader" style="display:inline-block;vertical-align:middle;width:26px;height:26px;color:var(--md-primary,hsl(var(--md-h,215) 80% 60%));"></span>'
                + '<span style="vertical-align:middle;margin-left:8px;">正在统计…</span></div>';
              var statLoaderBox = document.getElementById('storageStatLoader');
              if (statLoaderBox && window.__m3eLoader) window.__m3eLoader.mount(statLoaderBox, { size: 26 });
              byOwnerBox.innerHTML = '';
              topBox.innerHTML = '';
              window.__storageStats.collect().then(function(s) {
                var idbPct = s.idb.quota ? Math.min(100, (s.idb.usage / s.idb.quota) * 100) : 0;
                ov.innerHTML =
                  '<div class="md3-card" style="padding:16px 18px;margin-bottom:12px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:var(--md-on-surface,#e2e2e9);"><span>localStorage</span><span>' + fmt(s.ls.total) + ' · ' + s.ls.keys + ' 键</span></div>' +
                    bar(s.ls.total / 5242880 * 100, 215) +
                    '<div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:6px;opacity:.8;">约 5MB 配额</div>' +
                  '</div>' +
                  '<div class="md3-card" style="padding:16px 18px;margin-bottom:14px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:var(--md-on-surface,#e2e2e9);"><span>IndexedDB（含壁纸/字体文件）</span><span>' + (s.idb.available ? fmt(s.idb.usage) + (s.idb.quota ? ' / ' + fmt(s.idb.quota) : '') : '不可用') + '</span></div>' +
                    bar(idbPct, 155) +
                    '<div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:6px;opacity:.8;">配额一般为磁盘可用空间的 60%</div>' +
                  '</div>';
                if (!s.byOwner.length) { byOwnerBox.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">暂无数据</div>'; return; }
                var maxB = s.byOwner[0].bytes || 1;
                var rows = s.byOwner.map(function(o, i) {
                  return '<div style="padding:10px 2px 2px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--md-on-surface,#e2e2e9);"><span>' + esc(nameOf(o.owner)) + '</span><span style="color:var(--md-on-surface-variant,#9a9b9e);">' + fmt(o.bytes) + '</span></div>' +
                    bar(o.bytes / maxB * 100, (o.owner === '__system' ? 215 : (o.owner === '__other' ? 35 : 155 + i * 37) % 360)) +
                    '</div>';
                }).join('');
                byOwnerBox.innerHTML = '<div class="md3-card" style="padding:14px 18px 8px;margin-bottom:12px;"><div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin-bottom:4px;">按应用归属</div>' + rows + '</div>';
                var top = s.ls.items.slice(0, 8).map(function(it) {
                  return '<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 2px;border-bottom:1px solid var(--md-outline-variant);font-size:12.5px;">' +
                    '<span style="color:var(--md-on-surface-variant,#9a9b9e);word-break:break-all;">' + esc(it.key) + '</span>' +
                    '<span style="color:var(--md-on-surface,#e2e2e9);flex-shrink:0;">' + fmt(it.bytes) + '</span></div>';
                }).join('');
                topBox.innerHTML = '<div class="md3-card" style="padding:14px 18px;margin-bottom:12px;"><div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin-bottom:2px;">占用最大的 localStorage 键（前 8）</div>' + (top || '<div style="padding:10px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">空</div>') + '</div>';
              }).catch(function() {
                ov.innerHTML = '<div style="text-align:center;padding:30px 0;color:#ff8a8a;font-size:13px;">统计失败，请重试</div>';
              });
            }
            document.getElementById('storageRefreshBtn').addEventListener('click', render);
            render();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 7) render();
            });
          })();
        </script>
      </div>`,
    },
    {
      // 页 8：开发者选项
      title: '开发者选项',
      content: `<div style="padding:16px 0;">
        <div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:16px;">
          <div class="md3-list-item" style="cursor:default;">
            <div class="md3-list-item-icon">${ICONS.settings}</div>
            <div style="display:flex;flex-direction:column;flex:1;">
              <span class="md3-list-item-text">系统版本</span>
              <span id="sysVerLine" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">读取中…</span>
            </div>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" id="devCheckUpdateBtn">
            <div class="md3-list-item-icon">${ICONS.system_update}</div>
            <span class="md3-list-item-text">检查更新</span>
          </div>
        </div>
        <div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:16px;">
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">性能面板（FPS / 帧耗时 / 内存）</span>
            <label class="md3-switch"><input type="checkbox" id="devFpsToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">禁用 CSS 动画与过渡</span>
            <label class="md3-switch"><input type="checkbox" id="devNoAnimToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <!-- v7.18：动画倍率（开发者）—— 慢放逐帧检视 ↔ 极速验收手感 -->
        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:2px;display:flex;justify-content:space-between;">
            <span>动画倍率</span>
            <span id="devAnimSpeedVal" style="color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">1\u00d7</span>
          </div>
          <div style="font-size:11.5px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.6;margin-bottom:10px;">
            应用开合 / 切换退场 / 子页导航的物理弹簧速度 · 即时生效（运行中的动画热换曲线不跳变）
          </div>
          <div class="md3-slider is-discrete" id="devAnimSpeedSlider">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="devAnimSpeedFill"></div>
            <div class="m3-slider-ticks">
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot"></span>
              <span class="m3-slider-dot"></span>
              <span class="m3-slider-dot"></span>
            </div>
            <div class="md3-slider-thumb" id="devAnimSpeedThumb"></div>
          </div>
          <div id="devAnimSpeedChips" style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
            <span data-speed="0.25" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">0.25\u00d7 慢放检视</span>
            <span data-speed="0.5" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">0.5\u00d7</span>
            <span data-speed="1" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">1\u00d7 默认</span>
            <span data-speed="1.5" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">1.5\u00d7</span>
            <span data-speed="2" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">2\u00d7</span>
            <span data-speed="3" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">3\u00d7 极速</span>
          </div>
        </div>
        <div class="md3-card" style="padding:4px 0;overflow:hidden;">
          <div class="md3-list-item" id="devResetLayoutBtn">
            <div class="md3-list-item-icon">${ICONS.restart_alt}</div>
            <span class="md3-list-item-text">重置桌面布局（图标排列与卸载记录）</span>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" id="devWipeDataBtn" style="color:#ff8a8a;">
            <div class="md3-list-item-icon" style="color:#ff8a8a;">${ICONS.delete_forever}</div>
            <span class="md3-list-item-text">清空全部数据（恢复出厂）</span>
          </div>
        </div>
        <p style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;margin-top:14px;padding:0 4px;">
          「禁用动画」仅关闭 CSS transition/animation；Spring2D 物理弹簧为 JS
          transform 驱动，不受影响。「动画倍率」仅缩放弹簧时间轴（曲线形状不变），
          想彻底关闭动效请配合「禁用 CSS 动画」使用。「清空全部数据」会同时清除
          localStorage、IndexedDB（含壁纸/字体文件）、Cache Storage 并注销
          Service Worker，建议先在「备份与恢复」中导出。开关状态刷新后保持。
        </p>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var dev = window.__devOptions;
            // v7.6：系统版本行（读 ../sw.js 的 geek-vN 与构建 ID，与 SW 天然同源同步）
            function fillSysVer() {
              var line = document.getElementById('sysVerLine');
              if (!line || line._filled) return;
              fetch('../sw.js', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
                if (!line) return;
                // fix(v7.45)：旧正则 /geek-v\d+[-a-zA-Z]*/ 取「全文首个 geek-v 字样」，既会把
                // 策略名一并吞进（'geek-v53-cacheFirst'，issue #5 img3），也会被任何注释里的
                // 同形字符串命中。现锚定 VERSION 常量赋值行提取，天然免疫注释与策略名。
                var v = (t.match(/const VERSION = '([^']+)'/) || [''])[1];
                var b = (t.match(/BUILD_ID = '([a-z0-9]+)'/) || [])[1];
                if (v) { line.textContent = 'Android16 Geek · ' + v + (b ? ' · build ' + b : ''); line._filled = true; }
                else line.textContent = '版本信息不可用';
              }).catch(function () { if (line) line.textContent = '版本信息不可用'; });
            }
            fillSysVer();
            // v7.6：检查更新 —— 触发 SW 字节对比；有新版本时根壳层会自动浮现「轻点重启」胶囊
            function bindCheckUpdate() {
              var btn = document.getElementById('devCheckUpdateBtn');
              if (!btn || btn._bound) return;
              btn._bound = true;
              btn.addEventListener('click', function () {
                if (window.showSystemToast) window.showSystemToast('正在检查更新…');
                if (!('serviceWorker' in navigator)) {
                  if (window.showSystemToast) window.showSystemToast('当前环境不支持 Service Worker');
                  return;
                }
                navigator.serviceWorker.getRegistration().then(function (reg) {
                  if (!reg) {
                    if (window.showSystemToast) window.showSystemToast('Service Worker 未注册（开发环境）');
                    return;
                  }
                  var found = false;
                  reg.addEventListener('updatefound', function () { found = true; }, { once: true });
                  Promise.resolve(reg.update()).catch(function () {}).then(function () {
                    setTimeout(function () {
                      if (!found && window.showSystemToast) window.showSystemToast('已是最新版本');
                    }, 2500);
                  });
                }).catch(function () {
                  if (window.showSystemToast) window.showSystemToast('检查更新失败');
                });
              });
            }
            bindCheckUpdate();
            function initOnce() {
              dev = window.__devOptions;
              if (!dev) return;
              var fps = document.getElementById('devFpsToggle');
              var na = document.getElementById('devNoAnimToggle');
              if (fps && !fps._bound) {
                fps._bound = true;
                fps.checked = dev.isFpsEnabled();
                fps.addEventListener('change', function() {
                  dev.setFpsEnabled(fps.checked);
                  if (window.showSystemToast) window.showSystemToast(fps.checked ? 'FPS 悬浮层已开启' : 'FPS 悬浮层已关闭');
                });
              }
              if (na && !na._bound) {
                na._bound = true;
                na.checked = dev.isNoAnimEnabled();
                na.addEventListener('change', function() {
                  dev.setNoAnimEnabled(na.checked);
                  if (window.showSystemToast) window.showSystemToast(na.checked ? 'CSS 动画已禁用' : 'CSS 动画已恢复');
                });
              }
              // v7.18：动画倍率滑杆 + 快捷档位（实现于 animation-presets.js，经
              // __devOptions 桥接；对数刻度 0.25x~3x，1x 恰落在滑杆中段）
              var spS = document.getElementById('devAnimSpeedSlider');
              var spF = document.getElementById('devAnimSpeedFill');
              var spT = document.getElementById('devAnimSpeedThumb');
              var spV = document.getElementById('devAnimSpeedVal');
              var chipWrap = document.getElementById('devAnimSpeedChips');
              if (spS && !spS._bound && dev.getAnimSpeed) {
                spS._bound = true;
                var SP_MIN = 0.25, SP_MAX = 3, SP_BASE = 12;
                var toT = function(v) { return Math.log(v / SP_MIN) / Math.log(SP_BASE); };
                var toV = function(t) { return SP_MIN * Math.pow(SP_BASE, t); };
                var fmt = function(v) { return (Math.round(v * 100) / 100) + '\\u00d7'; };
                var down = false;
                var curT = 0;
                var paint = function(v) {
                  var t = toT(Math.min(SP_MAX, Math.max(SP_MIN, v)));
                  curT = t;
                  if (window.__md3SliderSet) window.__md3SliderSet(spS, spF, spT, t, down);
                  spV.textContent = fmt(v) + (Math.abs(v - 1) < 0.005 ? ' \\u00b7 默认' : '');
                  if (chipWrap) {
                    var chips = chipWrap.querySelectorAll('[data-speed]');
                    for (var i = 0; i < chips.length; i++) {
                      var on = Math.abs(parseFloat(chips[i].getAttribute('data-speed')) - v) < 0.005;
                      chips[i].style.background = on ? 'var(--md-primary)' : 'transparent';
                      chips[i].style.color = on ? 'var(--md-on-primary, #fff)' : 'var(--md-on-surface)';
                      chips[i].style.borderColor = on ? 'var(--md-primary)' : 'var(--md-outline-variant)';
                    }
                  }
                };
                paint(dev.getAnimSpeed());
                var apply = function(v, quiet) {
                  var nv = dev.setAnimSpeed(v);
                  paint(nv);
                  if (!quiet && window.showSystemToast) window.showSystemToast('动画倍率：' + fmt(nv));
                };
                var paintT = function(t, pressed) {
                  curT = t;
                  if (window.__md3SliderSet) window.__md3SliderSet(spS, spF, spT, t, pressed);
                };
                // v7.34 rAF 合帧：拖拽期 apply（含 localStorage 写 + 弹簧热更新）
                // 随事件率直调 → 每帧至多一次；末事件原则保证落点不丢
                // v7.38：transform 驱动；v7.39 桥内统一双段间隙几何 + 刻度点跟随
                var spRaf = 0, spLastE = null;
                var spPaint = function() {
                  spRaf = 0;
                  var e = spLastE; spLastE = null;
                  if (!e) return;
                  var r = spS.getBoundingClientRect();
                  var t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                  paintT(t, down);
                  apply(toV(t), true);
                };
                var update = function(e) {
                  spLastE = e;
                  if (!spRaf) spRaf = requestAnimationFrame(spPaint);
                };
                spS.onpointerdown = function(e) { down = true; spS.classList.add('is-dragging'); try { spS.setPointerCapture(e.pointerId); } catch (err) {} update(e); };
                spS.onpointermove = function(e) { if (down) update(e); };
                spS.onpointerup = spS.onpointercancel = function(e) {
                  if (down) {
                    down = false;
                    spS.classList.remove('is-dragging');
                    paintT(curT, false); // v7.39 落定重绘 + 恢复 CSS 过渡（终值平滑吸附）
                  }
                  try { spS.releasePointerCapture(e.pointerId); } catch (err) {}
                  if (window.showSystemToast) window.showSystemToast('动画倍率：' + fmt(dev.getAnimSpeed()));
                };
                if (window.__md3SliderWatch) window.__md3SliderWatch(spS, function() { paint(dev.getAnimSpeed()); });
                if (chipWrap) {
                  var chips2 = chipWrap.querySelectorAll('[data-speed]');
                  for (var ci = 0; ci < chips2.length; ci++) {
                    (function (chip) {
                      chip.addEventListener('click', function () {
                        apply(parseFloat(chip.getAttribute('data-speed')), false);
                      });
                    })(chips2[ci]);
                  }
                }
              }
              var reset = document.getElementById('devResetLayoutBtn');
              if (reset && !reset._bound) {
                reset._bound = true;
                reset.addEventListener('click', function() {
                  if (confirm('确定重置桌面布局？\\n图标排列与已卸载记录将恢复默认，应用数据不受影响。')) dev.resetDesktopLayout();
                });
              }
              var wipe = document.getElementById('devWipeDataBtn');
              if (wipe && !wipe._bound) {
                wipe._bound = true;
                wipe.addEventListener('click', function() {
                  if (confirm('确定清空全部数据？\\nlocalStorage、IndexedDB、缓存与 Service Worker 将全部清除。')) {
                    if (confirm('最后确认：此操作不可恢复（等于恢复出厂）！\\n建议先到「备份与恢复」导出数据。')) dev.wipeAllData();
                  }
                });
              }
            }
            initOnce();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 8) initOnce();
            });
          })();
        </script>
      </div>`,
    },
    {
      // 页 9：多模式（工作 / 个人）
      title: '多模式',
      content: `<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;line-height:1.7;">为「个人」与「工作」分别记忆一套完整场景：主题色相、外观模式、壁纸、桌面图标排列与勿扰开关。切换时全程伴随连贯动画——壁纸交叉淡入、主题色渐变、图标逐格弹簧重排；快捷设置中的「Modes」磁贴同样可以一键切换。</div>
        <div id="profileCardsBox"></div>
        <p style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;margin-top:14px;padding:0 4px;">
          离开当前模式时会自动保存最新布局、外观与勿扰状态，下次切回原样恢复；自定义上传的壁纸（文件类）不逐模式复制存储，切换时保持当前壁纸不变。配套的「Focus」番茄钟磁贴可在专注期自动开启勿扰、休息期自动恢复。
        </p>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var box = document.getElementById('profileCardsBox');
            if (!box) return;
            function render() {
              var P = window.__profiles;
              if (!box || !P) return;
              var list = P.list();
              box.innerHTML = '';
              list.forEach(function(p) {
                var card = document.createElement('div');
                card.className = 'md3-card';
                card.style.cssText = 'display:flex;align-items:center;gap:14px;padding:16px 18px;margin-bottom:12px;cursor:pointer;' + (p.active ? 'border:1.5px solid hsl(' + (p.hue || 215) + ' 70% 55%);' : '');
                card.innerHTML =
                  '<div style="width:44px;height:44px;border-radius:14px;flex-shrink:0;background:linear-gradient(135deg,hsl(' + (p.hue || 215) + ' 75% 40%),hsl(' + (p.hue || 215) + ' 85% 62%));display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:600;">' + (p.name || '?').charAt(0) + '</div>' +
                  '<div style="flex:1;"><div style="font-size:15px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">' + p.name + '模式</div>' +
                  '<div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">主题色相 ' + (p.hue || 215) + '°</div></div>' +
                  (p.active
                    ? '<span style="font-size:12px;font-weight:600;color:hsl(' + (p.hue || 215) + ' 80% 65%);">当前使用</span>'
                    : '<span style="font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);">点按切换</span>');
                card.addEventListener('click', function() {
                  if (p.active || P.isSwitching && P.isSwitching()) return;
                  P.switchTo(p.id);
                  setTimeout(render, 700);
                });
                box.appendChild(card);
              });
            }
            render();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 9) render();
            });
          })();
        </script>
      </div>`,
    },
    {
      title: '动画与动效',
      content: `<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">应用开 / 关动画曲线</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            选择应用从图标展开 / 收回时的弹簧手感（iOS 26 液态玻璃 · macOS 吸入融合风格）。
            切换即时生效：正在播放的动画会无缝换曲线，不会跳变；选择会被记住。
          </div>
        </div>

        <div id="animPresetList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <!-- 锁屏解锁入场动效风格（v7.13 高保真复刻双风格 + 卡内微缩预演） -->
        <div class="md3-card md3-card-elevated" style="margin:20px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">锁屏解锁桌面入场动效</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            复刻两大原生解锁动效：iOS 图标自屏幕底缘一整排一整排错峰飞入；
            Android 以屏幕中心为波源的涟漪式向外扩散淡入。切换即时生效并持久保存，
            点按卡片可查看微缩预演，选好后点下方按钮上滑解锁即可看到完整效果。
          </div>
        </div>

        <div id="unlockAnimList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <button id="unlockTryBtn" type="button" style="width:100%;margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 16px;border:none;border-radius:16px;cursor:pointer;font-size:14px;font-weight:600;color:#fff;background:hsl(var(--md-h,215) 72% 45%);box-shadow:0 2px 12px hsl(var(--md-h,215) 72% 40% / .35);">
          <span class="material-symbols-outlined" style="font-size:19px;">lock</span>
          立即锁屏体验当前效果
        </button>

        <div class="md3-card" style="margin-top:16px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
          <span class="material-symbols-outlined" style="font-size:20px;color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">info</span>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
            分屏窗格展开 / 收回同样跟随当前曲线；3D 倾斜与玻璃边缘高光保持系统级统一。
          </div>
        </div>

        <script>
          // 动画与动效页：预设卡片渲染 + 选择热切换（window.__animPresets 由 app-window.js 桥接）
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var listEl = null;
            var unlockListEl = null;

            var UNLOCK_STYLES = [
              {
                id: 'ios',
                name: 'iOS 整排飞入',
                desc: '复刻 SpringBoard IconFlyIn：图标自屏幕底缘起飞，底排先行、逐排向上续接，受控过冲后自然落位'
              },
              {
                id: 'android',
                name: 'Android 涟漪扩散',
                desc: '复刻 Material You 解锁涟漪：以屏幕中心为波源，光环向外扩散，图标随波前由内向外弹性浮现'
              }
            ];

            function render() {
              listEl = document.getElementById('animPresetList');
              if (listEl && window.__animPresets) {
                var cur = window.__animPresets.currentId();
                listEl.innerHTML = window.__animPresets.list.map(function(p) {
                  var active = p.id === cur;
                  return '<div class="anim-preset-card" data-preset-id="' + p.id + '" role="button" tabindex="0" aria-label="动画曲线 ' + p.name + '"' +
                    ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                    'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                    'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                    '<div style="width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;font-size:22px;' +
                    'background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / .22)' : 'var(--md-surface-container-high,#2f3136)') + ';">' + p.emoji + '</div>' +
                    '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;">' + p.name +
                    (active ? '<span style="font-size:11px;font-weight:600;color:hsl(var(--md-h,215) 85% 65%);background:hsl(var(--md-h,215) 80% 55% / .16);padding:2px 8px;border-radius:999px;">当前</span>' : '') +
                    '</div>' +
                    '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + p.desc + '</div>' +
                    '</div>' +
                    (active ? '<span class="material-symbols-outlined" style="font-size:20px;color:hsl(var(--md-h,215) 85% 60%);">check_circle</span>' : '') +
                    '</div>';
                }).join('');
              }

              unlockListEl = document.getElementById('unlockAnimList');
              if (unlockListEl) {
                var curUnlock = (window.__getUnlockAnimStyle ? window.__getUnlockAnimStyle() : localStorage.getItem('ios-desktop:unlock-anim-style')) || 'ios';
                var prevDots = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
                unlockListEl.innerHTML = UNLOCK_STYLES.map(function(s) {
                  var active = s.id === curUnlock;
                  return '<div class="unlock-style-card" data-style-id="' + s.id + '" role="button" tabindex="0" aria-label="解锁动效 ' + s.name + '"' +
                    ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                    'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                    'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                    '<div class="unlock-prev" aria-hidden="true">' + prevDots + '</div>' +
                    '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;">' + s.name +
                    (active ? '<span style="font-size:11px;font-weight:600;color:hsl(var(--md-h,215) 85% 65%);background:hsl(var(--md-h,215) 80% 55% / .16);padding:2px 8px;border-radius:999px;">当前</span>' : '') +
                    '</div>' +
                    '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + s.desc + '</div>' +
                    '</div>' +
                    (active ? '<span class="material-symbols-outlined" style="font-size:20px;color:hsl(var(--md-h,215) 85% 60%);">check_circle</span>' : '') +
                    '</div>';
                }).join('');
                // v7.13：当前选中卡自动播一次微缩预演，直观展示当前动效模式
                replayUnlockPreview(curUnlock);
              }
            }

            /** v7.13：重播指定风格卡片的微缩预演（类名复位 + 强制 reflow + 重新挂类） */
            function replayUnlockPreview(styleId) {
              if (!unlockListEl) return;
              var prev = unlockListEl.querySelector('.unlock-style-card[data-style-id="' + styleId + '"] .unlock-prev');
              if (!prev) return;
              prev.classList.remove('play-ios', 'play-android');
              void prev.offsetWidth;
              prev.classList.add(styleId === 'android' ? 'play-android' : 'play-ios');
            }

            function pick(id) {
              if (window.__animPresets && typeof window.__animPresets.apply === 'function') {
                window.__animPresets.apply(id);
                if (window.showSystemToast) window.showSystemToast('动画曲线已切换：' + window.__animPresets.currentName());
                render();
              }
            }

            function pickUnlock(styleId) {
              if (window.__setUnlockAnimStyle) {
                window.__setUnlockAnimStyle(styleId);
              } else {
                try { localStorage.setItem('ios-desktop:unlock-anim-style', styleId); } catch (e) {}
              }
              var styleName = styleId === 'android' ? 'Android 涟漪扩散' : 'iOS 整排飞入';
              if (window.showSystemToast) window.showSystemToast('解锁动效已切换：' + styleName);
              render(); // render 内会重播新选中卡的微缩预演
            }

            bindDoc('settings', 'click', function(e) {
              var card = e.target && e.target.closest && e.target.closest('.anim-preset-card');
              if (card && card.isConnected) pick(card.dataset.presetId);
              var uCard = e.target && e.target.closest && e.target.closest('.unlock-style-card');
              if (uCard && uCard.isConnected) pickUnlock(uCard.dataset.styleId);
              // v7.13：立即锁屏体验 —— 回桌面（若在前台应用）后自动上锁
              var tryBtn = e.target && e.target.closest ? e.target.closest('#unlockTryBtn') : null;
              if (tryBtn && tryBtn.isConnected && window.__tryUnlockAnim) window.__tryUnlockAnim();
            });

            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && e.target.closest('.anim-preset-card');
              if (card && card.isConnected) { e.preventDefault(); pick(card.dataset.presetId); }
              var uCard = e.target && e.target.closest && e.target.closest('.unlock-style-card');
              if (uCard && uCard.isConnected) { e.preventDefault(); pickUnlock(uCard.dataset.styleId); }
            });

            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 10) render();
            });
            render();
          })();
        </script>
      </div>`,
    },
    {
      title: '后台与多任务',
      content: `<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">后台运行策略</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            决定多任务后台里各应用实例的运行方式。切换即时生效；正在播放媒体（音频 / 视频 / 录音）
            的任务在任何模式下都不会被冻结。
          </div>
        </div>

        <div id="bgModeList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <div class="md3-card" style="margin-top:16px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
          <span class="material-symbols-outlined" style="font-size:20px;color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">info</span>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
            智能冻结模式下，从未打开过的后台卡片将保持休眠占位，不再引导启动；
            左右滑动后台时的重绘量也会显著下降。
          </div>
        </div>

        <script>
          // 后台与多任务页：运行策略卡片渲染 + 热切换（window.__bgFreeze 由 bg-freeze.js 桥接）
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var MODES = [
              { id: 'freeze', name: '智能冻结', emoji: '🧊', badge: '默认 · 推荐',
                desc: '仅前台应用、刚被推到后台的应用与分屏对保持实时运行，其余后台任务整体冻结 —— 心跳定时器、CSS 动画、rAF 全部暂停，直到再次回到前台。' },
              { id: 'live', name: '全部实时', emoji: '🔴', badge: '经典方案',
                desc: '所有后台实例照常运行、预览实时刷新；开销更高，长时间使用建议配合充电使用。' },
            ];
            function render() {
              var listEl = document.getElementById('bgModeList');
              if (!listEl || !window.__bgFreeze) return;
              var cur = window.__bgFreeze.mode();
              listEl.innerHTML = MODES.map(function(m) {
                var active = m.id === cur;
                return '<div class="bg-mode-card" data-mode-id="' + m.id + '" role="button" tabindex="0" aria-label="后台策略 ' + m.name + '"' +
                  ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                  'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                  'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                  '<div style="width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;font-size:22px;' +
                  'background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / .22)' : 'var(--md-surface-container-high,#2f3136)') + ';">' + m.emoji + '</div>' +
                  '<div style="flex:1;min-width:0;">' +
                  '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' + m.name +
                  '<span style="font-size:10px;font-weight:600;color:' + (active ? 'hsl(var(--md-h,215) 85% 65%)' : 'var(--md-on-surface-variant,#9a9b9e)') + ';background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:999px;">' + m.badge + '</span>' +
                  (active ? '<span class="material-symbols-outlined" style="font-size:18px;color:hsl(var(--md-h,215) 85% 60%);">check_circle</span>' : '') +
                  '</div>' +
                  '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + m.desc + '</div>' +
                  '</div>' +
                  '</div>';
              }).join('');
            }
            function pick(id) {
              if (window.__bgFreeze && typeof window.__bgFreeze.setMode === 'function') {
                window.__bgFreeze.setMode(id);
                if (window.showSystemToast) window.showSystemToast('后台策略已切换：' + window.__bgFreeze.modeName());
                render();
              }
            }
            bindDoc('settings', 'click', function(e) {
              var card = e.target && e.target.closest && e.target.closest('.bg-mode-card');
              if (card && card.isConnected) pick(card.dataset.modeId);
            });
            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && e.target.closest('.bg-mode-card');
              if (card && card.isConnected) { e.preventDefault(); pick(card.dataset.modeId); }
            });
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 11) render();
            });
            render();
          })();
        </script>
      </div>`,
    },
    {
      title: '系统导航',
      content: `<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">导航方式</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            手势导航为默认方案；开启三键导航后全新矢量三键（勾角返回 · 悬挑屋顶主屏 · 三横线多任务）悬浮于屏幕底部，
            且手势导航仍然保持运作 —— 两套方案融合共存，互不干扰。
          </div>
        </div>

        <div id="navModeList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <div id="navPosSection" style="display:none;margin-top:16px;">
          <div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 12px 8px;letter-spacing:0.3px;">三键栏位置</div>
          <div id="navPosList" style="display:flex;gap:10px;"></div>
          <div class="md3-card" style="margin-top:12px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
            <span class="material-symbols-outlined" style="font-size:20px;color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">gesture</span>
            <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
              也可以在桌面上直接调整：<b>按住主屏键 1 秒</b>后左右拖动，松手自动吸附到左 / 中 / 右。
              从三键栏上滑仍会直通系统手势引擎（跟手缩小、停顿唤出多任务、快速甩动关闭）。
            </div>
          </div>
        </div>

        <script>
          // 系统导航页：方式开关 + 位置三档（window.__navBar 由 nav-bar.js 桥接）
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            /* 矢量图标（与 nav-bar.js 同源线稿，viewBox 48 网格 · stroke 5.2 · round） */
            function navIcon(key, size) {
              var P = {
                back: '<path d="M14 7.5 7.8 13.5H36v23.5H7.8"/>',
                home: '<polyline points="6,18 24,7.5 42,18"/><path d="M11 23v12.5a4 4 0 0 0 4 4h18a4 4 0 0 0 4-4V23"/>',
                recents: '<path d="M8 12h32M8 24h32M8 36h32"/>'
              };
              return '<svg viewBox="0 0 48 48" width="' + size + '" height="' + size + '" aria-hidden="true" style="display:block">' +
                '<g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round">' + P[key] + '</g></svg>';
            }
            var MODES = [
              { id: 'gesture', name: '手势导航', badge: '默认',
                icon: '<svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true" style="display:block">' +
                  '<path d="M24 41V9M13.5 19.5 24 9l10.5 10.5" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                desc: '底部上滑关闭应用 / 唤出多任务、两侧边缘滑动返回；沉浸全屏无按键。' },
              { id: 'three', name: '三键导航', badge: '融合模式',
                icon: '<span style="display:flex;align-items:center;gap:4px;">' +
                  navIcon('back', 14) + navIcon('home', 14) + navIcon('recents', 14) + '</span>',
                desc: '新矢量三键悬浮底部；手势依旧可用 —— 长按主屏键 1 秒可左右拖动整条导航栏。' },
            ];
            var POS = [
              { id: 'left', name: '居左' },
              { id: 'center', name: '居中' },
              { id: 'right', name: '居右' },
            ];
            function render() {
              var listEl = document.getElementById('navModeList');
              var posSection = document.getElementById('navPosSection');
              var posList = document.getElementById('navPosList');
              if (!listEl || !window.__navBar) return;
              var enabled = window.__navBar.enabled();
              listEl.innerHTML = MODES.map(function(m) {
                var active = (m.id === 'three') === enabled;
                return '<div class="nav-mode-card" data-mode-id="' + m.id + '" role="button" tabindex="0" aria-label="导航方式 ' + m.name + '"' +
                  ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                  'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                  'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                  '<div style="width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;' +
                  'color:' + (active ? 'hsl(var(--md-h,215) 85% 72%)' : 'var(--md-on-surface-variant,#9a9b9e)') + ';' +
                  'background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / .22)' : 'var(--md-surface-container-high,#2f3136)') + ';">' + m.icon + '</div>' +
                  '<div style="flex:1;min-width:0;">' +
                  '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' + m.name +
                  '<span style="font-size:10px;font-weight:600;color:' + (active ? 'hsl(var(--md-h,215) 85% 65%)' : 'var(--md-on-surface-variant,#9a9b9e)') + ';background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:999px;">' + m.badge + '</span>' +
                  (active ? '<span class="material-symbols-outlined" style="font-size:18px;color:hsl(var(--md-h,215) 85% 60%);">check_circle</span>' : '') +
                  '</div>' +
                  '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + m.desc + '</div>' +
                  '</div>' +
                  '</div>';
              }).join('');
              if (posSection) posSection.style.display = enabled ? 'block' : 'none';
              if (enabled && posList) {
                var cur = window.__navBar.pos();
                /* Uiverse 缝合：拟物物理单选组（源：uiverse.io/m1her/splendid-rat-12，MIT）
                   改造：类名 uiv-nav-radio- 前缀；选中态用类驱动（不用 :has，兼容性更稳）；
                   色值接 --md-h 动态令牌，明暗双模式样式见 pixel-features.css 末尾 */
                posList.innerHTML = POS.map(function(p) {
                  var active = p.id === cur;
                  return '<label class="uiv-nav-radio-label' + (active ? ' uiv-nav-radio-on' : '') + '" data-pos-id="' + p.id + '" role="button" tabindex="0" aria-label="三键栏位置 ' + p.name + '">' +
                    '<input class="uiv-nav-radio-input" type="radio" name="uiv-nav-pos" value="' + p.id + '"' + (active ? ' checked' : '') + ' />' +
                    '<span class="uiv-nav-radio-text">' + p.name + '</span>' +
                    '</label>';
                }).join('');
              }
            }
            bindDoc('settings', 'click', function(e) {
              var modeCard = e.target && e.target.closest && e.target.closest('.nav-mode-card');
              if (modeCard && modeCard.isConnected && window.__navBar) {
                window.__navBar.setEnabled(modeCard.dataset.modeId === 'three');
                render();
                return;
              }
              var posChip = e.target && e.target.closest && e.target.closest('.uiv-nav-radio-label');
              if (posChip && posChip.isConnected && window.__navBar) {
                window.__navBar.setPos(posChip.dataset.posId);
                render();
              }
            });
            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && (e.target.closest('.nav-mode-card') || e.target.closest('.uiv-nav-radio-label'));
              if (card && card.isConnected) { e.preventDefault(); card.click(); }
            });
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 12) render();
            });
            render();
          })();
        </script>
      </div>`,
    },
    {
      title: '壁纸与动态壁纸',
      content: `<div id="settingsWallpaperContainer" style="padding:16px 0;"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var inited = false;
            function init() {
              if (inited) return;
              var box = document.getElementById('settingsWallpaperContainer');
              if (box && window.__initWallpaperPage) {
                inited = true;
                window.__initWallpaperPage(box);
              }
            }
            // fix(v7.37 全量审计)：懒激活 —— page-stack 首开会把全部子页 content 与
            // script 一次性注入执行；旧版 init() 立即跑 __initWallpaperPage → 动态
            // 壁纸缩略图同步串行绘制，取证实锤把「打开设置」拖成 4.8 秒长任务。
            // 现在首开零渲染，用户首次真正推入本页（pageIdx===13）时才初始化。
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 13) init();
            });
          })();
        </script>`,
    },

    // ==================== v7.53：桌面与 Dock（网格行列 / Dock 数量与神奇效果） ====================
    {
      title: '桌面与 Dock',
      content: `<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">图标网格</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 14px;">
            调整桌面图标的列数与行数。「自动」跟随设备形态（手机竖屏 4×6，平板/横屏 6×4）。
            缩小网格时超出容量的图标会按顺序顺延到下一页，排列次序保持不变。
          </div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin-bottom:8px;">列数</div>
          <div id="dpColChips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;"></div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin-bottom:8px;">行数</div>
          <div id="dpRowChips" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>

        <div class="md3-card md3-card-elevated" style="margin:0 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">Dock</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 4px;">
            桌面底部的常驻应用栏。数量上限 6 个；平板尺寸下最右侧追加最多 3 个「最近打开应用」位。
            长按 Dock 上的图标可将其移除。
          </div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">启用 Dock</span>
            <label class="md3-switch"><input type="checkbox" id="dpDockEnabled"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">平板显示最近应用（≤3）</span>
            <label class="md3-switch"><input type="checkbox" id="dpDockRecents"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">macOS 神奇效果</span>
            <label class="md3-switch"><input type="checkbox" id="dpMacEffect"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;padding:0 16px 10px;">
            开启后按 Apple 原版曲线 1:1 复刻：悬停图标钉在指针下方放至倍率上限，邻位图标被推开、
            Dock 整体变宽拥抱内容，悬停图标上方浮现应用名气泡；移开后约 1 秒内平滑落定。
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">放大倍率</span>
            <span style="display:flex;align-items:center;gap:10px;">
              <input type="range" id="dpMagnify" min="1.4" max="2.8" step="0.05"
                style="width:130px;accent-color:hsl(var(--md-h,215) 70% 55%);">
              <span id="dpMagnifyVal" style="font-size:13px;font-weight:600;min-width:46px;text-align:right;color:var(--md-on-surface);">2.25×</span>
            </span>
          </div>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;padding:0 16px 10px;">
            与 macOS 系统设置的 Magnification 滑杆同源（默认 2.25×，范围 1.4×–2.8×）。
          </div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin:6px 0 8px;padding:0 16px;">图标数量（1–6）</div>
          <div id="dpCountChips" style="display:flex;gap:8px;flex-wrap:wrap;padding:0 16px;margin-bottom:6px;"></div>
        </div>

        <div class="md3-card md3-card-elevated" style="margin:0 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">后台多任务</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 14px;">
            后台卡片的布局风格。3D 轮播为 Material Expressive 深度堆叠（侧卡后仰、景深错落）；
            经典平铺为传统安卓样式（Android 5–9 同构）：卡片正对镜头平面横向依次排列，全程不做虚化。
          </div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin-bottom:8px;">卡片布局</div>
          <div id="dpRecentsStyleChips" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>

        <div class="md3-card md3-card-elevated" style="margin:0 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">Dock 应用管理</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;margin:6px 0 12px;">
            当前固定在 Dock 上的应用。点「×」移除；下方点应用图标即可添加（上限 <span id="dpDockMaxHint">6</span> 个）。
          </div>
          <div id="dpDockItems" style="display:flex;gap:12px;flex-wrap:wrap;padding:0 2px 12px;"></div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 2px 12px;"></div>
          <div style="font-size:12px;font-weight:600;letter-spacing:0.4px;color:var(--md-on-surface-variant);margin-bottom:10px;">可添加</div>
          <div id="dpDockPool" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:10px;"></div>
        </div>

        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var P = window.__desktopPrefs;
            var D = window.__dockPrefs;

            function chipHTML(group, val, cur, label) {
              var on = String(val) === String(cur);
              return '<button type="button" class="dp-chip" data-group="' + group + '" data-v="' + val + '"' +
                ' style="padding:8px 16px;border-radius:999px;border:1.5px solid ' + (on ? 'hsl(var(--md-h,215) 85% 60%)' : 'var(--md-outline-variant,transparent)') +
                ';background:' + (on ? 'hsl(var(--md-h,215) 80% 55% / .16)' : 'var(--md-surface-container,#232529)') +
                ';color:' + (on ? 'hsl(var(--md-h,215) 85% 70%)' : 'var(--md-on-surface,#e2e2e9)') +
                ';font-size:13px;font-weight:600;cursor:pointer;">' + label + '</button>';
            }

            function appTile(id, name, removable, iconSvg) {
              return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:64px;">' +
                '<div style="position:relative;width:52px;height:52px;">' +
                '<div style="width:52px;height:52px;border-radius:13px;overflow:hidden;">' + iconSvg + '</div>' +
                (removable ? '<button type="button" class="dp-dock-remove" data-id="' + id + '" aria-label="移除 ' + name + '"' +
                  ' style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:none;cursor:pointer;' +
                  'background:hsl(var(--md-h,215) 70% 55%);color:#fff;font-size:13px;line-height:20px;text-align:center;">×</button>' : '') +
                '</div>' +
                '<span style="font-size:11px;color:var(--md-on-surface-variant);max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + name + '</span>' +
                '</div>';
            }

            function render() {
              if (!P || !D) return;
              var p = P.get();
              var colEl = document.getElementById('dpColChips');
              var rowEl = document.getElementById('dpRowChips');
              if (colEl) {
                var html = chipHTML('cols', 'auto', p.cols, '自动');
                for (var i = 0; i < P.cols.length; i++) html += chipHTML('cols', P.cols[i], p.cols, String(P.cols[i]));
                colEl.innerHTML = html;
              }
              if (rowEl) {
                var html2 = chipHTML('rows', 'auto', p.rows, '自动');
                for (var j = 0; j < P.rows.length; j++) html2 += chipHTML('rows', P.rows[j], p.rows, String(P.rows[j]));
                rowEl.innerHTML = html2;
              }
              var swE = document.getElementById('dpDockEnabled');
              var swR = document.getElementById('dpDockRecents');
              var swM = document.getElementById('dpMacEffect');
              if (swE) swE.checked = !!p.dockEnabled;
              if (swR) swR.checked = !!p.dockRecents;
              if (swM) swM.checked = !!p.dockMacEffect;
              var mgEl = document.getElementById('dpMagnify');
              var mgVal = document.getElementById('dpMagnifyVal');
              if (mgEl) mgEl.value = String(p.dockMagnify);
              if (mgVal) mgVal.innerText = Number(p.dockMagnify).toFixed(2) + '×';

              var countEl = document.getElementById('dpCountChips');
              if (countEl) {
                var html3 = '';
                for (var k = 1; k <= P.dockMax; k++) html3 += chipHTML('dockCount', k, p.dockCount, String(k));
                countEl.innerHTML = html3;
              }
              var styleEl = document.getElementById('dpRecentsStyleChips');
              if (styleEl) {
                styleEl.innerHTML =
                  chipHTML('recentsStyle', 'carousel', p.recentsStyle, '3D 轮播（默认）') +
                  chipHTML('recentsStyle', 'classic', p.recentsStyle, '经典平铺') +
                  chipHTML('recentsStyle', 'tablet', p.recentsStyle, '平板网格');
              }
              var maxHint = document.getElementById('dpDockMaxHint');
              if (maxHint) maxHint.innerText = String(P.dockMax);

              var itemsEl = document.getElementById('dpDockItems');
              var poolEl = document.getElementById('dpDockPool');
              if (itemsEl) {
                var items = D.items();
                if (!items.length) {
                  itemsEl.innerHTML = '<span style="font-size:12px;color:var(--md-on-surface-variant);">Dock 为空 —— 从下方添加，或长按桌面应用图标选择「添加到 Dock」</span>';
                } else {
                  var h4 = '';
                  for (var m = 0; m < items.length; m++) {
                    var a = D.allApps().filter(function(x) { return x.id === items[m]; })[0];
                    if (!a) continue;
                    h4 += appTile(a.id, a.name, true, window.__getAppIconSVG(a.id));
                  }
                  itemsEl.innerHTML = h4;
                }
              }
              if (poolEl) {
                var pool = D.allApps().filter(function(x) { return D.items().indexOf(x.id) === -1; });
                var h5 = '';
                for (var n = 0; n < pool.length; n++) {
                  h5 += appTile(pool[n].id, pool[n].name, false, window.__getAppIconSVG(pool[n].id));
                }
                poolEl.innerHTML = h5 || '<span style="font-size:12px;color:var(--md-on-surface-variant);">全部应用都已在 Dock 上</span>';
              }
            }

            bindDoc('settings', 'click', function(e) {
              var chip = e.target && e.target.closest ? e.target.closest('.dp-chip') : null;
              if (chip && chip.isConnected) {
                var g = chip.getAttribute('data-group');
                var v = chip.getAttribute('data-v');
                var val = (v === 'auto') ? 'auto' : parseInt(v, 10);
                if (g === 'dockCount') val = parseInt(v, 10);
                if (g === 'recentsStyle') val = v; // 字符串档位（carousel/classic）不经 parseInt
                P.set(g, val);
                render();
                return;
              }
              var rm = e.target && e.target.closest ? e.target.closest('.dp-dock-remove') : null;
              if (rm && rm.isConnected) {
                D.remove(rm.getAttribute('data-id'));
                render();
                return;
              }
              // 池点按 = 添加（满员由 addToDock 拒绝并吐司提示）
              var poolTile = e.target && e.target.closest ? e.target.closest('#dpDockPool > div') : null;
              if (poolTile && poolTile.isConnected) {
                var btn = poolTile.querySelector ? null : null;
                var id = null;
                var nameEl = poolTile.querySelector('span');
                var added = false;
                var all = D.allApps();
                for (var i = 0; i < all.length; i++) {
                  if (nameEl && all[i].name === nameEl.innerText) { id = all[i].id; break; }
                }
                if (id) added = D.add(id);
                if (added && window.showSystemToast) window.showSystemToast('已添加到 Dock');
                else if (!added && window.showSystemToast) window.showSystemToast('Dock 已满（最多 ' + P.dockMax + ' 个）');
                render();
              }
            });

            bindDoc('settings', 'change', function(e) {
              var t = e.target;
              if (!t || !t.id) return;
              if (t.id === 'dpDockEnabled') P.set('dockEnabled', !!t.checked);
              else if (t.id === 'dpDockRecents') P.set('dockRecents', !!t.checked);
              else if (t.id === 'dpMacEffect') P.set('dockMacEffect', !!t.checked);
              else if (t.id === 'dpMagnify') P.set('dockMagnify', parseFloat(t.value));
              else return;
            });

            // 拖动中实时反馈（input 事件）：label 即时刷新 + 偏好即时生效
            bindDoc('settings', 'input', function(e) {
              var t = e.target;
              if (!t || t.id !== 'dpMagnify') return;
              var v = parseFloat(t.value);
              var lb = document.getElementById('dpMagnifyVal');
              if (lb) lb.innerText = v.toFixed(2) + '×';
              P.set('dockMagnify', v);
            });

            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 14) render();
            });
            render();
          })();
        </script>`,
    },
    // ==================== v7.98 #10：AOSP 系统仪表盘 hub（页 15） ====================
    // top_level_settings.xml 的 top_level_system（系统）在源码指向 SystemDashboardFragment
    // （语言、手势、时间、备份）；本项目既有孤岛页（导航/多模式/动画/后台/桌面 Dock/开发者）
    // 在 AOSP 语义下均属系统仪表盘子项 → 以 hub 页收编，保住全部既有入口可达性
    {
      title: '系统',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">系统</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">语言、手势、时间、备份（AOSP SystemDashboardFragment 语义）</div>
          ${[
            { idx: 12, label: '系统导航方式', sub: '手势 · 三键', icon: 'explore' },
            { idx: 9, label: '多模式（工作 / 个人）', sub: '资料切换', icon: 'person' },
            { idx: 10, label: '动画与动效曲线', sub: '动效速度 · 曲线', icon: 'auto_awesome' },
            { idx: 11, label: '后台与多任务', sub: '冻结策略', icon: 'picture_in_picture' },
            { idx: 14, label: '桌面与 Dock', sub: '图标网格 · Dock 栏', icon: 'home' },
            { idx: 8, label: '开发者选项', sub: '实验特性', icon: 'code' },
          ].map((r) => `
            <div class="md3-list-item" role="button" tabindex="0" onclick="__tpNav(this,${r.idx})" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
              <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${ICONS[r.icon] || ''}</span>
              <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">${r.label}</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">${r.sub}</span></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
            </div>`).join('')}
        </div>`,
    },
    // ==================== v7.98 #10：未对齐子页过渡占位（页 16） ====================
    // AOSP 一级菜单 21 项已按源码齐备；其 fragment 子页（NetworkDashboardFragment 等）
    // 排入 v7.99+ 逐项对齐，先以统一占位承接导航
    {
      title: '子页面对齐中',
      content: `
        <div style="min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;">
          <div style="width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--md-primary-container,#d3e3fd);color:var(--md-on-primary-container,#041e49);">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M19,5H5C3.9,5 3,5.9 3,7v10c0,1.1 0.9,2 2,2h14c1.1,0 2-0.9 2-2V7C21,5.9 20.1,5 19,5z M19,17H5V7h14V17z"/></svg>
          </div>
          <div style="font-size:18px;font-weight:500;">该子页面对齐中</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);max-width:420px;line-height:1.6;">
            一级菜单已按 AOSP android-17 源码 top_level_settings.xml 完整呈现；
            此项对应的源码 fragment（ModesDashboardFragment、SecurityDashboardFragment 等）
            将按 1:1 标准逐页移植（v8.03+，见议题 #10 执行计划与 #22 路线图；
            v8.01 已转正 NotificationSettings → 页 19，v8.02 已转正 AccessibilitySettings → 页 20）。
          </div>
        </div>`,
    },
    // ==================== v7.99 #10 二期：网络和互联网子页（页 17） ====================
    // 源码考证（aosp-mirror main 实源，非记忆）：
    //   清单 = res/xml/network_provider_internet.xml（PreferenceScreen
    //   network_provider_and_internet_screen，标题 network_dashboard_title「网络和互联网」），
    //   10 项按 android:order 权威排序：internet_settings(-30) → calls_and_sms(-20) →
    //   mobile_network_list(-15) → airplane_mode_on(-5) → tether_settings(5) →
    //   restrict_background_parent_entry(10) → vpn_settings(15) → private_dns_settings(20) →
    //   adaptive_connectivity(25) → cellular_security_network_internet(30)
    //   文案 = values-zh-rCN/strings.xml 权威值（provider_internet_settings「互联网」、
    //   provider_network_settings_title「SIM 卡」、data_saver_title「省流模式」、
    //   adaptive_connectivity_summary 全文等；select_private_dns_configuration_title 在
    //   翻译 dump 缺失，取 AOSP 跨版本稳定 zh 名「私人 DNS」并注记）
    //   图标 = res/drawable 逐 path 转 SVG（icons-aosp.js v7.99 增量 6 枚 net* 键）；
    //   XML 无 android:icon 的项（私人 DNS/自适应连接/移动网络安全）按源码不渲染图标
    // 交互语义：
    //   - 互联网行 = RestrictedPreference → NetworkProviderSettings：项目内同语义实现
    //     为 QS openNetworkSheet（Wi-Fi 开关/网络清单/移动数据），摘要 =
    //     InternetPreferenceControllerV2 动态（当前互联网连接，QS internet 磁贴单一真源）
    //   - 飞行模式行 = RestrictedSwitchPreference + AirplaneModePreferenceController：
    //     md3-switch 单一真源接 QS aeroplane 磁贴（syncTileState 同步）
    //   - 其余行 fragment 二级页排 v8.00+（ConnectedDeviceDashboardFragment 同法），静态呈现
    {
      title: '网络和互联网',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">网络和互联网</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">互联网、通话和短信、SIM 卡、VPN、热点（AOSP NetworkDashboardFragment）</div>
          <!-- 1. internet_settings（order -30）：摘要动态（InternetPreferenceControllerV2） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="__qsNetworkSheet(this)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.topWireless || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">互联网</span><span id="netInternetSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- 2. calls_and_sms（order -20）：summary_placeholder（无默认摘要，忠实空呈现） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.netCallsSms || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">通话和短信</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- 3. mobile_network_list（order -15）：MobileNetworkSummaryController 语义
              （订阅显示名；模拟器运营商=中国移动 5G，与 QS 网络面板同源） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.netSim || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">SIM 卡</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">中国移动 5G</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- 4. airplane_mode_on（order -5）：RestrictedSwitchPreference，单源 QS aeroplane 磁贴 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.netAirplane || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">飞行模式</span></span>
            <label class="md3-switch"><input type="checkbox" id="netAirplaneToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- 5. tether_settings（order 5）：TetherPreferenceController 动态摘要排 v8.00+ -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.netTether || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">热点和网络共享</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- 6. restrict_background_parent_entry（order 10）：DataSaverPreference 自管摘要 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.netDataSaver || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">省流模式</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- 7. vpn_settings（order 15）：VpnInfoPreference 动态摘要（当前无活跃 VPN） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.netVpn || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">VPN</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- 8. private_dns_settings（order 20）：源码无 android:icon（对话框偏好） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">私人 DNS</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- 9. adaptive_connectivity（order 25）：源码无 icon；摘要 = 权威 zh 全文 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">自适应连接</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">自动管理您的网络连接，从而延长电池续航时间并提升设备性能</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- 10. cellular_security_network_internet（order 30）：源码无 icon -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">移动网络安全</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">网络类型、加密、通知控件</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
        </div>
        <script>
          // v7.99 #10 二期：互联网摘要（InternetPreferenceControllerV2 语义）+ 飞行模式
          // 开关（AirplaneModePreferenceController 语义）——单一真源 window.__qsTileState
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            function refresh() {
              var sub = document.getElementById('netInternetSub');
              if (sub && window.__qsTileState) {
                var tile = window.__qsTileState.tile('internet');
                sub.textContent = (tile && tile.active) ? (tile.sub || '已连接') : '已关闭';
              }
              var sw = document.getElementById('netAirplaneToggle');
              if (sw && window.__qsTileState) sw.checked = window.__qsTileState.get('aeroplane');
            }
            function bind() {
              var sw = document.getElementById('netAirplaneToggle');
              if (sw && !sw.dataset.v799Bound) {
                sw.dataset.v799Bound = '1';
                sw.addEventListener('change', function() {
                  var on = !!sw.checked;
                  if (window.__qsTileState) window.__qsTileState.sync('aeroplane', { active: on });
                  if (window.__qsToast) window.__qsToast(on ? '飞行模式已开启' : '飞行模式已关闭');
                });
              }
            }
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 17) { refresh(); bind(); }
            });
          })();
        </script>`,
    },
    // ==================== v8.00 #10 三期：已连接的设备子页（页 18） ====================
    // 源码考证（aosp-mirror/platform_packages_apps_settings main 实源，非记忆）：
    //   清单 = res/xml/connected_devices.xml（PreferenceScreen connected_devices_screen，
    //   标题 connected_devices_dashboard_title「已连接的设备」），条目链按 XML 权威序：
    //   bt_nearby_slice → audio_sharing_device_list → available_device_list(媒体设备) →
    //   connected_device_list(其他设备) → add_bt_devices(与新设备配对) →
    //   previously_connected_devices(保存的设备+查看全部) → fast_pair_devices
    //   (曾与账号配对过的设备+查看全部) → connection_preferences(连接偏好设置) →
    //   discoverable_footer(bluetooth_off_footer)
    //   文案 = values-zh-rCN/strings.xml 权威值逐项实取：connected_devices_dashboard_title
    //   「已连接的设备」/ connected_device_media_device_title「媒体设备」/
    //   connected_device_other_device_title「其他设备」/ bluetooth_pairing_pref_title
    //   「与新设备配对」/ connected_device_add_device_summary「系统将开启蓝牙以进行配对」/
    //   connected_device_saved_title「保存的设备」/ previous_connected_see_all「查看全部」/
    //   connected_device_previously_associated_fast_pair_device_title「曾与账号配对过的设备」/
    //   connected_device_fast_pair_device_see_all「查看全部」/ connected_device_connections_title
    //   「连接偏好设置」/ bluetooth_off_footer「开启蓝牙即可连接到其他设备。」
    //   图标 = res/drawable 逐 path 转 SVG（icons-aosp.js v8.00 增量 devAdd=ic_add_24dp、
    //   devBt=ic_settings_bluetooth）；设备行图标在 AOSP 由设备元数据运行时注入（非 XML
    //   drawable），媒体设备行复用项目既有 cast 图标（快捷设置 ICONS.cast 同源资产）
    // controller 门控语义（与 communal 同法 hidden 保留）：
    //   - bt_nearby_slice = SlicePreference（SlicePreferenceController）：切片提供方不可用
    //     → 门控隐藏，不渲染
    //   - audio_sharing_device_list = AudioSharingDevicePreferenceController：仅 LE 音频
    //     分享活跃时可见（audio_sharing_description「允许他人和您一起收听您的媒体内容。
    //     收听者需要自备 LE 音频耳机。」），手机形态默认门控隐藏
    // 交互语义（单一真源 window.__qsTileState，v7.99 桥惯例）：
    //   - add_bt_devices（RestrictedPreference + AddDevicePreferenceController，fragment
    //     BluetoothPairingDetail）：点按 = 摘要「系统将开启蓝牙以进行配对」行为——蓝牙关时
    //     sync bluetooth {active:true} + 系统 Toast；蓝牙已开时按配对详情语义提示搜索中
    //   - discoverable_footer（DiscoverableFooterPreferenceController）：蓝牙关 →
    //     bluetooth_off_footer 可见；蓝牙开 → footer 隐藏
    //   - 蓝牙依赖分组（其他设备/保存的设备/曾与账号配对过的设备 = ConnectedDeviceGroupController
    //     /PreviouslyConnectedDevicePreferenceController/FastPairDevicePreferenceController）：
    //     蓝牙关时随系统行为隐藏；媒体设备组（AvailableMediaDeviceGroupController，媒体路由
    //     cast 语义）不依赖蓝牙态保持可见
    //   - 设备行数据源：手机形态模拟，与既有叙事同源（QS 蓝牙磁贴默认 sub「Pixel Buds Pro」、
    //     SIM 卡页「中国移动 5G」同惯例）；connection_preferences 摘要 = summary_placeholder
    //     （AdvancedConnectedDeviceController 动态注入，无默认摘要忠实空呈现）
    {
      title: '已连接的设备',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">已连接的设备</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">媒体设备、配对、保存的设备（AOSP ConnectedDeviceDashboardFragment）</div>
          <!-- available_device_list（AvailableMediaDeviceGroupController）：媒体路由可用设备，cast 语义 -->
          <div id="connDevCatAvailable">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">媒体设备</div>
            <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
              <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">
                <svg viewBox="0 -960 960 960" width="24" height="24" fill="currentColor"><path d="M881-220q0 24.75-17.62 42.37Q845.75-160 821-160H626q-10.71 0-17.97-8.1-7.27-8.1-8.03-18.9-4-96-41-181t-98.57-151.13q-61.58-66.14-143.5-108.5Q235-670 140-680q-25-3-42-19.9-17-16.89-17-42 0-25.1 17.62-41.6T141-800h680q24.75 0 42.38 17.62Q881-764.75 881-740v520Zm-570.47 60q-11.73 0-20.53-7.33T279-187q-9-69-56.5-117.5T107-362q-11-2-18.5-11.05T81-393.69Q81-406 88.5-415q7.5-9 18.5-8 93 9 158 75.5T340-188q2 11.79-7.5 19.89Q323-160 310.53-160ZM471-160q-12 0-21-8t-10-20q-11-134-103.5-229T111-523q-13-1-21.5-10.05-8.5-9.06-8.5-21.13Q81-567 91.5-575.5T116-583q154.76 12.84 263.38 123.42T500-193q1 14-7.62 23.5-8.63 9.5-21.38 9.5Zm-352.14 0Q102-160 90.5-171.64T79-200.14Q79-217 90.64-228.5t28.5-11.5q16.86 0 28.36 11.64t11.5 28.5q0 16.86-11.64 28.36t-28.5 11.5Z"/></svg>
              </span>
              <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Pixel Tablet</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">可用</span></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
            </div>
          </div>
          <!-- connected_device_list（ConnectedDeviceGroupController）：蓝牙态门控分组 -->
          <div id="connDevCatConnected">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">其他设备</div>
            <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
              <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.devBt || ''}</span>
              <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Pixel Buds Pro</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">已连接</span></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
            </div>
          </div>
          <!-- add_bt_devices（RestrictedPreference + AddDevicePreferenceController） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="__connDevAdd(this)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.devAdd || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">与新设备配对</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">系统将开启蓝牙以进行配对</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- previously_connected_devices（PreviouslyConnectedDevicePreferenceController）：蓝牙态门控 -->
          <div id="connDevCatSaved">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">保存的设备</div>
            <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
              <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.devBt || ''}</span>
              <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Pixel Buds Pro</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">已配对</span></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
            </div>
            <div class="md3-list-item" role="button" tabindex="0" style="min-height:52px;display:flex;align-items:center;justify-content:flex-end;gap:8px;border-radius:16px;padding-right:12px;cursor:pointer;">
              <span style="font-size:14px;font-weight:500;color:var(--md-primary,#0b57d0);">查看全部</span>
              <span style="color:var(--md-primary,#0b57d0);">›</span>
            </div>
          </div>
          <!-- fast_pair_devices（FastPairDevicePreferenceController）：蓝牙态门控 -->
          <div id="connDevCatFastPair">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">曾与账号配对过的设备</div>
            <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
              <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.devBt || ''}</span>
              <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Pixel Buds A-Series</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">已配对</span></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
            </div>
            <div class="md3-list-item" role="button" tabindex="0" style="min-height:52px;display:flex;align-items:center;justify-content:flex-end;gap:8px;border-radius:16px;padding-right:12px;cursor:pointer;">
              <span style="font-size:14px;font-weight:500;color:var(--md-primary,#0b57d0);">查看全部</span>
              <span style="color:var(--md-primary,#0b57d0);">›</span>
            </div>
          </div>
          <!-- connection_preferences（AdvancedConnectedDeviceController）：summary_placeholder 忠实空呈现 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">连接偏好设置</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- discoverable_footer（DiscoverableFooterPreferenceController）：蓝牙关时可见 -->
          <div id="connDevFooter" style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:16px 12px 8px;line-height:1.6;">开启蓝牙即可连接到其他设备。</div>
        </div>
        <script>
          // v8.00 #10 三期：蓝牙单一真源接线（AddDevicePreferenceController /
          // DiscoverableFooterPreferenceController / 蓝牙依赖分组门控的 Web 等价物）
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var BT_GROUPS = ['connDevCatConnected', 'connDevCatSaved', 'connDevCatFastPair'];
            function refresh() {
              if (!window.__qsTileState) return;
              var btOn = !!window.__qsTileState.get('bluetooth');
              BT_GROUPS.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.display = btOn ? '' : 'none';
              });
              var ft = document.getElementById('connDevFooter');
              if (ft) ft.style.display = btOn ? 'none' : '';
            }
            window.__connDevAdd = function() {
              var wasOn = window.__qsTileState && window.__qsTileState.get('bluetooth');
              if (window.__qsTileState && !wasOn) {
                window.__qsTileState.sync('bluetooth', { active: true });
              }
              if (window.__qsToast) window.__qsToast(wasOn ? '正在搜索附近的设备' : '蓝牙已开启');
              refresh();
            };
            refresh();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 18) { refresh(); }
            });
          })();
        </script>`,
    },
    // ==================== v8.01 #10 四期：通知子页（页 19） ====================
    // 源码考证（aosp-mirror/platform_packages_apps_settings main 实源，非记忆）：
    //   清单 = res/xml/configure_notification_settings.xml（PreferenceScreen
    //   configure_notification_settings，标题 configure_notification_settings「通知」），
    //   28 keys / 5 分区按 XML 权威序转正为页 19：
    //   ① general_notifications_category「管理」：all_notifications(10 应用通知/
    //      控制来自各个应用的通知，fragment ManageApplications) → notification_history(11
    //      历史通知/显示近期通知和延后的通知，NotificationHistoryActivity) →
    //      bundle_notifications_preference(12 捆绑式通知)
    //   ② conversation_category「对话」：conversations(1 对话) →
    //      notification_bubbles(2 消息气泡)
    //   ③ configure_notifications_lock「隐私」（lock_screen_notifications_title）：
    //      notification_access(12 读取、回复和控制通知) → lock_screen_notifications(13
    //      RestrictedListPreference) → lock_screen_notifications_page(14) →
    //      lock_screen_redact(15 敏感通知) → lock_screen_work_redact(16) →
    //      notification_lockscreen_bypass(17)
    //   ④ sync_across_devices「在设备之间保持同步」（category 整组）
    //   ⑤ advanced_section_header「常规」：polite_notifications_preference(18) →
    //      zen_mode_notifications(19 勿扰模式) → lock_screen_notif_minimalism(20) →
    //      lock_screen_show_only_unseen_notifs(21) → flash_notifications_preference(22) →
    //      app_and_notif_cell_broadcast_settings(23 无线紧急警报) → silent_icons(24) →
    //      show_snooze_options(25) → notification_badging(26 应用图标上的通知圆点) →
    //      notification_pulse(27 闪烁指示灯) → notification_assistant(28 增强型通知)
    //   文案 = values-zh-rCN/strings.xml 权威值逐项实取（configure_notification_settings
    //   「通知」/ general_notification_header「管理」/ app_notification_field「应用通知」/
    //   notification_history「历史通知」/ conversation_notifs_category「对话」/
    //   notification_bubbles_title「消息气泡」/ notifications_bubble_setting_on_summary
    //   「已开启/对话能以浮动图标形式显示」/ lock_screen_notifications_title「隐私」/
    //   manage_notification_access_title「读取、回复和控制通知」/ lock_screen_notifs_title
    //   「锁屏通知」/ lock_screen_notifs_redact「敏感通知」/ lockscreen_bypass_title
    //   「跳过锁屏画面」/ sync_across_devices_title「在设备之间保持同步」/
    //   advanced_section_header「常规」（注意非「高级」）/ notification_polite_title
    //   「通知音量渐降」/ zen_mode_settings_title「勿扰模式」/ cell_broadcast_settings
    //   「无线紧急警报」/ silent_notifications_status_bar「隐藏状态栏中的静音通知」/
    //   snooze_options_title「允许显示通知延后选项」/ notification_badging_title
    //   「应用图标上的通知圆点」/ notification_pulse_title「闪烁指示灯」/
    //   notification_assistant_title「增强型通知」/ notification_assistant_summary
    //   「接收建议的操作、回复等内容」/ priority_conversation_count(_zero)「# 个优先对话/
    //   没有优先对话」/ notification_history_count「# 条通知」/ lock_screen_notifications_
    //   summary_show|hide|disable「显示所有通知内容/仅在解锁状态下显示敏感内容/
    //   完全不显示通知」）
    //   图标：XML 全文无 android:icon（通知页行均为纯文本行，AOSP 原生形态）→ 全行无图标
    // controller 门控语义（逐个 controller main 实源 + aconfig 声明实证）：
    //   门控裁决权威 = Settings BasePreferenceController.isAvailable() 白名单
    //   {AVAILABLE, AVAILABLE_UNSEARCHABLE, DISABLED_DEPENDENT_SETTING}；
    //   CONDITIONALLY_UNAVAILABLE 与 UNSUPPORTED_ON_DEVICE 均不渲染（isAvailable=false）
    //   渲染 9 行：all_notifications / notification_history / conversations /
    //   notification_bubbles（BubbleHelper.isSupportedByDevice=Pixel 形态 AVAILABLE）/
    //   notification_access（NotificationAccessController=AVAILABLE）/
    //   lock_screen_notifications（LockScreenNotificationPreferenceController：flag
    //   notification_lock_screen_settings=false 时 legacy 列表可用；摘要
    //   getSummaryResource() 三态动态） / lock_screen_redact（RedactNotificationPreference
    //   Controller：flag off+锁屏安全+非 work key → AVAILABLE；默认开=显示敏感内容）/
    //   app_and_notif_cell_broadcast_settings（无 controller）/ silent_icons（非 guest
    //   AVAILABLE）/ show_snooze_options（AVAILABLE，默认关）/ notification_badging
    //   （config_notificationBadging=true）/ notification_assistant（AVAILABLE，默认开）
    //   隐藏 8 行（hidden 注记保留，同 communal/communal 法）：
    //   - bundle_notifications_preference：BundlePreferenceController =
    //     Flags.notificationClassificationUi()(android.app/notification.aconfig 无
    //     default:true → false) && bundlingSupported → CONDITIONALLY_UNAVAILABLE
    //   - lock_screen_notifications_page：LockScreenNotificationsPreferencePageController
    //     = Flags.notificationLockScreenSettings()(server/notification/flags.aconfig 无
    //     default:true → false) → CONDITIONALLY_UNAVAILABLE（新页变体随 flag 关闭）
    //   - lock_screen_work_redact：RedactNotification 无工作资料（mProfileUserId ==
    //     myUserId 分支）→ CONDITIONALLY_UNAVAILABLE
    //   - notification_lockscreen_bypass：FaceSettingsLockscreenBypassPreferenceController
    //     = Utils.isMultipleBiometricsSupported()（Pixel 10 指纹+人脸）→ UNSUPPORTED_ON_DEVICE
    //   - sync_across_devices 整组：SyncAcrossDevicesPreferenceController.displayPreference
    //     先 setVisible(false)，仅 feature provider 动态注入后可见（手机形态无 provider）
    //   - polite_notifications_preference：PoliteNotificationsPreferenceController =
    //     Flags.politeNotifications()(无 default:true → false) → CONDITIONALLY_UNAVAILABLE
    //   - zen_mode_notifications：ZenModePreferenceController = Flags.modesUi() ?
    //     UNSUPPORTED_ON_DEVICE : AVAILABLE_UNSEARCHABLE —— 一级「模式」项
    //     （ZenModesLinkPreferenceController）同 flag 反向门控且 v7.98 已按 modesUi=true
    //     真机形态转正渲染 → 一致性裁决本行 UNSUPPORTED_ON_DEVICE 隐藏（勿扰入口归「模式」页）
    //   - lock_screen_notif_minimalism：MinimalismController = flag
    //     notification_lock_screen_settings=false 后续判断 !Flags.notificationMinimalism()
    //     （aconfig 无 default:true → false）→ CONDITIONALLY_UNAVAILABLE
    //   - lock_screen_show_only_unseen_notifs：ShowOnlyUnseenController 前两 flag 均 false
    //     且 Secure 设置 UNSET → CONDITIONALLY_UNAVAILABLE
    //   - flash_notifications_preference：FlashNotificationsPreferenceController =
    //     FeatureFlagUtils.isEnabled(SETTINGS_FLASH_NOTIFICATIONS) —— DEFAULT_FLAGS 无
    //     该键 → Boolean.parseBoolean(null)=false → CONDITIONALLY_UNAVAILABLE
    //   - notification_pulse：PulseNotificationPreferenceController =
    //     config_intrusiveNotificationLed（Pixel 5 起无 LED）→ UNSUPPORTED_ON_DEVICE
    // 交互语义（单一真源 window.__settingsNotifsStore，localStorage settings:notifications-v1；
    // 默认值 = AOSP Secure 表默认：LOCK_SCREEN_SHOW_NOTIFICATIONS=1+ALLOW_PRIVATE=1、
    // SHOW_NOTIFICATION_SNOOZE=OFF、badging/NAS 默认开、silent_icons 默认关）：
    //   - lock_screen_notifications 点击弹三选对话框（entries 由 controller 代码动态注入：
    //     summary_show/summary_hide/summary_disable，选择写回单源并联动摘要与敏感通知开关）
    //   - lock_screen_redact 开关 = ALLOW_PRIVATE_NOTIFICATIONS（change 联动列表摘要）
    //   - 超越点（#22 注记：唯一有真数据可用的子页）：notification_history 摘要动态
    //     「N 条通知」+ 点击展开真实通知历史面板（localStorage ios-desktop:notifications
    //     同源直读，notifications-changed 事件订阅刷新，cal-sync 同法，渲染经 escapeHtml）；
    //     conversations 摘要动态 = category 含会话的真实条目计数
    //     （ConversationListSummaryPreferenceController priority_conversation_count 语义）
    {
      title: '通知',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">通知</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">历史通知、对话、锁屏通知（AOSP NotificationSettings）</div>
          <!-- ① general_notifications_category「管理」 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">管理</div>
          <!-- all_notifications（order 10）：fragment ManageApplications，静态行 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">应用通知</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">控制来自各个应用的通知</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- notification_history（order 11）：动态摘要 + 真实历史面板（v8.01 超越点） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="__notifHistoryToggle(this)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">历史通知</span><span id="notifHistorySub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
            <span id="notifHistoryChevron" style="color:var(--md-on-surface-variant,#9a9b9e);transition:transform .2s;">›</span>
          </div>
          <div id="notifHistoryPanel" style="display:none;padding:0 8px 4px;">
            <div id="notifHistoryList"></div>
          </div>
          <!-- bundle_notifications_preference（order 12）：BundlePreferenceController 门控隐藏注记（CONDITIONALLY_UNAVAILABLE） -->
          <!-- ② conversation_category「对话」 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">对话</div>
          <!-- conversations（order 1）：ConversationListSummaryPreferenceController 动态摘要（真实数据） -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">对话</span><span id="notifConvoSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- notification_bubbles（order 2）：BubbleSummaryNotificationPreferenceController（Pixel 形态 AVAILABLE），摘要=开启态 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">消息气泡</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">已开启/对话能以浮动图标形式显示</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- ③ configure_notifications_lock「隐私」（lock_screen_notifications_title） -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">隐私</div>
          <!-- notification_access（order 12）：NotificationAccessController=AVAILABLE -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">读取、回复和控制通知</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">控制哪些应用和设备能够读取通知</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- lock_screen_notifications（order 13）：RestrictedListPreference 三态动态摘要，点击选择 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="__notifLockChoose()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">锁屏通知</span><span id="notifLockSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- lock_screen_notifications_page（order 14）：flag 门控隐藏注记（CONDITIONALLY_UNAVAILABLE） -->
          <!-- lock_screen_redact（order 15）：RestrictedSwitchPreference，单源 allowPrivate -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">敏感通知</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">锁屏时显示敏感内容</span></span>
            <label class="md3-switch"><input type="checkbox" id="notifRedactToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- lock_screen_work_redact（order 16）：无工作资料门控隐藏注记（CONDITIONALLY_UNAVAILABLE） -->
          <!-- notification_lockscreen_bypass（order 17）：多生物识别 UNSUPPORTED_ON_DEVICE 隐藏注记 -->
          <!-- ④ sync_across_devices「在设备之间保持同步」：SyncAcrossDevicesPreferenceController
              displayPreference 默认 setVisible(false)、feature provider 动态注入后才可见
              （手机形态无 provider）→ 整组隐藏注记 -->
          <!-- ⑤ advanced_section_header「常规」 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">常规</div>
          <!-- polite_notifications_preference（order 18）/ zen_mode_notifications（order 19）/
              lock_screen_notif_minimalism（order 20）/ lock_screen_show_only_unseen_notifs
              （order 21）/ flash_notifications_preference（order 22）：flag 门控隐藏注记
              （CONDITIONALLY_UNAVAILABLE×4 + modesUi 一致性裁决 UNSUPPORTED_ON_DEVICE） -->
          <!-- app_and_notif_cell_broadcast_settings（order 23）：RestrictedPreference intent cellbroadcastreceiver -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">无线紧急警报</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- silent_icons（order 24）：SilentStatusBarPreferenceController（非 guest AVAILABLE） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">隐藏状态栏中的静音通知</span></span>
            <label class="md3-switch"><input type="checkbox" id="notifSilentToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- show_snooze_options（order 25）：SnoozeNotificationPreferenceController（AVAILABLE，默认关） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">允许显示通知延后选项</span></span>
            <label class="md3-switch"><input type="checkbox" id="notifSnoozeToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- notification_badging（order 26）：BadgingNotificationPreferenceController（config_notificationBadging=true） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">应用图标上的通知圆点</span></span>
            <label class="md3-switch"><input type="checkbox" id="notifBadgingToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- notification_pulse（order 27）：PulseNotificationPreferenceController 门控隐藏注记（UNSUPPORTED_ON_DEVICE，Pixel 5 起无 LED） -->
          <!-- notification_assistant（order 28）：NotificationAssistantPreferenceController（AVAILABLE，默认开） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">增强型通知</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">接收建议的操作、回复等内容</span></span>
            <label class="md3-switch"><input type="checkbox" id="notifAssistantToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <!-- lock_screen_notifications 三选对话框（entries 由 LockScreenNotificationPreferenceController
            代码动态注入的 Web 等价物；页内 overlay，选择写回单源并联动摘要与敏感通知开关） -->
        <div id="notifLockDialog" style="display:none;position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.4);align-items:center;justify-content:center;padding:24px;">
          <div style="background:var(--md-surface-container-high,#eceff4);border-radius:28px;max-width:360px;width:100%;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.25);">
            <div style="font-size:16px;font-weight:500;padding-bottom:12px;">您希望锁定的屏幕显示什么内容？</div>
            <div class="md3-list-item notif-lock-opt" role="button" tabindex="0" data-opt="show" style="min-height:52px;display:flex;align-items:center;gap:12px;border-radius:16px;cursor:pointer;">
              <span class="notif-opt-dot" style="width:20px;height:20px;flex:none;border-radius:50%;border:2px solid var(--md-primary,#0b57d0);display:inline-flex;align-items:center;justify-content:center;"></span>
              <span style="font-size:15px;">显示所有通知内容</span>
            </div>
            <div class="md3-list-item notif-lock-opt" role="button" tabindex="0" data-opt="hide" style="min-height:52px;display:flex;align-items:center;gap:12px;border-radius:16px;cursor:pointer;">
              <span class="notif-opt-dot" style="width:20px;height:20px;flex:none;border-radius:50%;border:2px solid var(--md-primary,#0b57d0);display:inline-flex;align-items:center;justify-content:center;"></span>
              <span style="font-size:15px;">仅在解锁状态下显示敏感内容</span>
            </div>
            <div class="md3-list-item notif-lock-opt" role="button" tabindex="0" data-opt="disable" style="min-height:52px;display:flex;align-items:center;gap:12px;border-radius:16px;cursor:pointer;">
              <span class="notif-opt-dot" style="width:20px;height:20px;flex:none;border-radius:50%;border:2px solid var(--md-primary,#0b57d0);display:inline-flex;align-items:center;justify-content:center;"></span>
              <span style="font-size:15px;">完全不显示通知</span>
            </div>
          </div>
        </div>
        <script>` + NOTIF_PAGE_SCRIPT + `</script>`,
    },
    // ==================== v8.02 #10 五期：无障碍功能子页（页 20） ====================
    // 源码考证（aosp-mirror/platform_packages_apps_settings main 实源，非记忆）：
    //   清单 = res/xml/accessibility_settings.xml（PreferenceScreen accessibility_settings_screen，
    //   标题 accessibility_settings「无障碍功能」，keywords_accessibility），27 keys / 8 分区
    //   按 XML 权威序转正为页 20：
    //   ① user_installed_services_category「已下载的应用」（动态注入区）
    //   ② screen_reader_category「屏幕阅读器」（动态注入区）
    //   ③ display_category「显示」：text_reading_options(1 显示大小和文字) →
    //      accessibility_color_and_motion(2 色彩和动画) → reduce_bright_colors_preference(3 极暗，
    //      PrimarySwitchPreference) → even_dimmer_activated(4 极暗) → magnification_preference_screen(5 放大功能)
    //   ④ interaction_control_category「互动控制」：tap_assistance_preference_screen(6 定时控制) →
    //      system_controls_preference_screen(7 系统控制) → vibration_preference_screen(8 振动和触感反馈) →
    //      pointer_and_touchpad(9 指针和触控板无障碍功能) → physical_keyboard_a11y(10 实体键盘无障碍功能)
    //   ⑤ captions_category「字幕」：live_caption(11 实时字幕) → captioning_preference_screen(12 字幕偏好设置) →
    //      rtt_setting(13)
    //   ⑥ audio_category「音频」：toggle_audio_description(14 语音描述) →
    //      flash_notifications_preference_accessibility(15 闪烁通知) → hearing_aid_preference(16 助听装置) →
    //      audio_adjustment_preference_screen(17 音频调整)
    //   ⑦ speech_category「语音」（动态注入区）
    //   ⑧ general_category「常规」（无 key）：accessibility_shortcuts_preference_screen(18 无障碍快捷方式) →
    //      tts_settings_preference(19 文字转语音输出)
    //   文案 = values-zh-rCN/strings.xml 权威值逐项实取（accessibility_settings_summary
    //   「显示、互动、音频」/ accessibility_text_reading_options_title「显示大小和文字」/
    //   accessibility_color_and_motion_title「色彩和动画」/ reduce_bright_colors_preference_title
    //   「极暗」/ even_dimmer_display_title+summary「极暗/允许将设备屏幕调得比通常更暗」/
    //   accessibility_screen_magnification_title「放大功能」/ accessibility_tap_assistance_title
    //   「定时控制」/ accessibility_system_controls_title「系统控制」/ accessibility_vibration_settings_title
    //   「振动和触感反馈」/ accessibility_pointer_and_touchpad_title+summary「指针和触控板无障碍功能/
    //   指针颜色、指针大小等」/ keyboard_a11y_settings+summary「实体键盘无障碍功能/粘滞键、防抖键、鼠标键」/
    //   live_caption_title+summary「实时字幕/自动生成媒体字幕」/ accessibility_captioning_title
    //   「字幕偏好设置」/ accessibility_toggle_audio_description_preference_title+summary「语音描述/
    //   以语音的形式描述当前画面呈现的内容（仅限支持该设置的电影或电视节目）」/ flash_notifications_title
    //   「闪烁通知」/ accessibility_hearingaid_title+not_connected_summary「助听装置/未连接任何助听装置」/
    //   accessibility_audio_adjustment_title「音频调整」/ general_category_title「常规」/
    //   accessibility_shortcuts_settings_title「无障碍快捷方式」；tts_settings_title 在 Settings
    //   仓库缺失（代码搜索零命中）→ 实证于 frameworks_base SettingsLib res/values-zh-rCN
    //   strings.xml「文字转语音输出」；rtt_settings_title zh-rCN 权威值为空串（动态标题））
    //   图标 = 13 枚 layer-list（AdaptiveIconShapeDrawable 徽章 + 白色前景）逐 path 转 SVG
    //   （icons-aosp.js v8.02 增量 a11y* 13 键，前景 18dp）：徽章底色
    //   accessibility_feature_background=#5F6368（Google grey 700）、magnification 特例
    //   accessibility_magnification_background=#F50D60，尺寸 accessibility_icon_size=32dp，
    //   徽章圆角 27% ≈ 自适应图标形状；shortcuts/tts 两行 XML 无 android:icon 忠实无图标
    // controller 门控语义（逐个 controller main 实源 + aconfig/config 实证，裁决权威 =
    //   BasePreferenceController.isAvailable 白名单 {AVAILABLE, AVAILABLE_UNSEARCHABLE,
    //   DISABLED_DEPENDENT_SETTING}，CONDITIONALLY_UNAVAILABLE/UNSUPPORTED_ON_DEVICE 均不渲染）：
    //   渲染 15 行：text_reading_options（基类 AVAILABLE）/ accessibility_color_and_motion
    //   （无 controller）/ reduce_bright_colors_preference（ReduceBrightColorsPreferenceController：
    //   evenDimmer flag && config_evenDimmerEnabled（core/res config_display.xml 权威值=false）
    //   → 跳过取代判断 → isReduceBrightColorsAvailable → AVAILABLE）/ magnification_preference_screen
    //   （AVAILABLE）/ tap_assistance / system_controls（无 controller）/ vibration_preference_screen
    //   （VibrationPreferenceController：hasVibrator → AVAILABLE）/ pointer_and_touchpad
    //   （PointerTouchpadPreferenceController：touchpad||mouse → 桌面浏览器指针设备恒在 → AVAILABLE）/
    //   live_caption（LIVE_CAPTION intent 可解析，Pixel 形态 AVAILABLE）/ captioning_preference_screen
    //   （AVAILABLE）/ toggle_audio_description（AVAILABLE）/ hearing_aid_preference
    //   （isHearingAidSupported：BT 栈支持 → AVAILABLE）/ audio_adjustment_preference_screen（无
    //   controller）/ accessibility_shortcuts_preference_screen（无 controller）/ tts_settings_preference
    //   （TtsPreferenceController：引擎非空 && config_show_tts_settings_summary=true（Settings
    //   res/values/config.xml:454 权威值）→ AVAILABLE，Web speechSynthesis 语义等价）
    //   隐藏 4 行 3 区（hidden 注记保留，同 v8.00/v8.01 法）：
    //   - user_installed_services_category 整区：updateServicePreferences 中
    //     getPreferenceCount()==0 → removePreference（下载区无服务即整区移除）
    //   - screen_reader_category 整区：config_preinstalled_screen_reader_services 为空数组
    //     （res/values/config.xml 仅注释示例）+ updatePreferenceCategoryVisibility 空区隐藏
    //   - even_dimmer_activated：EvenDimmerPreferenceController = Flags.evenDimmer()
    //     (display_flags.aconfig 无 default → false) && config_evenDimmerEnabled=false
    //     → UNSUPPORTED_ON_DEVICE；注释同时保留 RBC 取代语义（「Successor to this feature
    //     is Even Dimmer」——设备支持 even dimmer 时 RBC 反向隐藏，本形态二者取其一取 RBC）
    //   - physical_keyboard_a11y：PhysicalKeyboardA11yPreferenceController = flag
    //     keyboardAndTouchpadA11yNewPageEnabled && isAnyHardKeyboardsExist（无实体全键盘
    //     → CONDITIONALLY_UNAVAILABLE，手机形态默认无）
    //   - rtt_setting：RTTSettingPreferenceController = queryIntentActivities(RTT) &&
    //     isRttSettingSupported（isDefaultDialerSupportedRTT：默认拨号器需支持 RTT，Web 无
    //     电话栈 → UNSUPPORTED_ON_DEVICE；zh-rCN 标题权威空串注记）
    //   - flash_notifications_preference_accessibility：FlashNotificationsPreferenceController
    //     （同 v8.01 通知页实证：FeatureFlagUtils SETTINGS_FLASH_NOTIFICATIONS 无键 → false
    //     → CONDITIONALLY_UNAVAILABLE）
    //   - speech_category 整区：config_preinstalled_speech_services 空数组 + 空区隐藏
    // 动态摘要（controller getSummary 覆盖 XML 静态摘要的语义）：
    //   - magnification = ToggleScreenMagnificationPreferenceFragment.getServiceSummary()：
    //     userShortcutType 默认 → shortcut_off「已关闭」+ magnification_feature_summary
    //     「放大屏幕上的内容」经 preference_summary_default_combination「%1$s/%2$s」组合
    //     =「已关闭/放大屏幕上的内容」
    //   - vibration = VibrationPreferenceController.getSummary()：VIBRATE_ON 默认开 →
    //     accessibility_vibration_settings_state_on「已开启」（XML 静态 summary 被覆盖）
    // 交互语义（单一真源 window.__settingsA11yStore，localStorage settings:accessibility-v1；
    // 默认值 = AOSP 默认：REDUCE_BRIGHT_COLORS_ACTIVATED=0、audio_description persistent=false
    // 默认关）：
    //   - 超越点（#22 注记）：reduce_bright_colors 开关 = CSS filter 真实现，作用于
    //     documentElement（html 层），与快捷设置亮度滑条 body.filter（全库唯一既有消费链）
    //     分层乘法合成 = 在当前亮度之下额外压暗；强度 = RBC 滑条默认 50% → brightness(0.5)；
    //     activated 态持久化（Secure 表语义）重载恢复
    //   - toggle_audio_description 开关 = persistent=false 的会话态（AOSP 不持久化）
    {
      title: '无障碍功能',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">无障碍功能</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">显示、互动、音频（AOSP AccessibilitySettings）</div>
          <!-- ① user_installed_services_category「已下载的应用」：0 服务整区移除（updateServicePreferences
              getPreferenceCount()==0 → removePreference）→ 整区隐藏注记 -->
          <!-- ② screen_reader_category「屏幕阅读器」：config_preinstalled_screen_reader_services
              空数组（res/values/config.xml 仅注释示例）+ updatePreferenceCategoryVisibility 空区隐藏
              → 整区隐藏注记 -->
          <!-- ③ display_category「显示」 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">显示</div>
          <!-- text_reading_options（order 1）：TextReadingFragmentForA11ySettingsController（基类 AVAILABLE） -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#5F6368;border-radius:27%;">${AOSP_ICONS.a11yTextReading || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">显示大小和文字</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- accessibility_color_and_motion（order 2）：无 controller -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#5F6368;border-radius:27%;">${AOSP_ICONS.a11yColorMotion || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">色彩和动画</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- reduce_bright_colors_preference（order 3）：PrimarySwitchPreference，
              ReduceBrightColorsPreferenceController（evenDimmer&&config=false → 跳过取代判断 →
              isReduceBrightColorsAvailable → AVAILABLE）；超越点 = CSS filter 真实现 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#5F6368;border-radius:27%;">${AOSP_ICONS.a11yDim || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">极暗</span></span>
            <label class="md3-switch"><input type="checkbox" id="a11yRbcToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- even_dimmer_activated（order 4）：EvenDimmerPreferenceController 门控隐藏注记
              （Flags.evenDimmer 无 default=false && config_evenDimmerEnabled=false →
              UNSUPPORTED_ON_DEVICE；「Successor to this feature is Even Dimmer」RBC 取代语义，
              二者取其一本形态取 RBC） -->
          <!-- magnification_preference_screen（order 5）：MagnificationPreferenceController（AVAILABLE），
              动态摘要 getServiceSummary 默认「已关闭/放大屏幕上的内容」；徽章特例色 #F50D60 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#F50D60;border-radius:27%;">${AOSP_ICONS.a11yMagnify || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">放大功能</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">已关闭/放大屏幕上的内容</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- ④ interaction_control_category「互动控制」 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">互动控制</div>
          <!-- tap_assistance_preference_screen（order 6）：无 controller -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#5F6368;border-radius:27%;">${AOSP_ICONS.a11yTap || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">定时控制</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- system_controls_preference_screen（order 7）：无 controller -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#5F6368;border-radius:27%;">${AOSP_ICONS.a11ySysControls || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">系统控制</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- vibration_preference_screen（order 8）：VibrationPreferenceController（hasVibrator →
              AVAILABLE），动态摘要 getSummary VIBRATE_ON 默认开 → state_on「已开启」 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#5F6368;border-radius:27%;">${AOSP_ICONS.a11yVibration || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">振动和触感反馈</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">已开启</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- pointer_and_touchpad（order 9）：PointerTouchpadPreferenceController（touchpad||mouse →
              桌面浏览器指针设备恒在 → AVAILABLE） -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#5F6368;border-radius:27%;">${AOSP_ICONS.a11yPointer || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">指针和触控板无障碍功能</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">指针颜色、指针大小等</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- physical_keyboard_a11y（order 10）：PhysicalKeyboardA11yPreferenceController 门控隐藏注记
              （flag keyboardAndTouchpadA11yNewPageEnabled && isAnyHardKeyboardsExist——无实体全键盘
              → CONDITIONALLY_UNAVAILABLE，手机形态默认无） -->
          <!-- ⑤ captions_category「字幕」 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">字幕</div>
          <!-- live_caption（order 11）：LiveCaptionPreferenceController（LIVE_CAPTION intent 可解析，
              Pixel 形态 AVAILABLE） -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#5F6368;border-radius:27%;">${AOSP_ICONS.a11yLiveCaption || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">实时字幕</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">自动生成媒体字幕</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- captioning_preference_screen（order 12）：CaptioningPreferenceController（AVAILABLE） -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#5F6368;border-radius:27%;">${AOSP_ICONS.a11yCaptioning || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">字幕偏好设置</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- rtt_setting（order 13）：RTTSettingPreferenceController 门控隐藏注记
              （isDefaultDialerSupportedRTT：默认拨号器需支持 RTT，Web 无电话栈 →
              UNSUPPORTED_ON_DEVICE；zh-rCN 标题权威空串+动态标题注记） -->
          <!-- ⑥ audio_category「音频」 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">音频</div>
          <!-- toggle_audio_description（order 14）：AudioDescriptionPreferenceController（AVAILABLE），
              SwitchPreferenceCompat persistent=false 默认关 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#5F6368;border-radius:27%;">${AOSP_ICONS.a11yAudioDesc || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">语音描述</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">以语音的形式描述当前画面呈现的内容（仅限支持该设置的电影或电视节目）</span></span>
            <label class="md3-switch"><input type="checkbox" id="a11yAudioDescToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- flash_notifications_preference_accessibility（order 15）：FlashNotificationsPreferenceController
              门控隐藏注记（同 v8.01 实证：FeatureFlagUtils SETTINGS_FLASH_NOTIFICATIONS 无键 → false
              → CONDITIONALLY_UNAVAILABLE） -->
          <!-- hearing_aid_preference（order 16）：AccessibilityHearingAidPreferenceController
              （isHearingAidSupported：BT 栈支持 → AVAILABLE），摘要 = 未连接态 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#5F6368;border-radius:27%;">${AOSP_ICONS.a11yHearingAid || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">助听装置</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">未连接任何助听装置</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- audio_adjustment_preference_screen（order 17）：无 controller -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#5F6368;border-radius:27%;">${AOSP_ICONS.a11yAudioAdjust || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">音频调整</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- ⑦ speech_category「语音」：config_preinstalled_speech_services 空数组 +
              updatePreferenceCategoryVisibility 空区隐藏 → 整区隐藏注记 -->
          <!-- ⑧ general_category「常规」（XML 无 key） -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">常规</div>
          <!-- accessibility_shortcuts_preference_screen（order 18）：无 controller，
              XML 无 android:icon 忠实无图标 -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">无障碍快捷方式</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- tts_settings_preference（order 19）：TtsPreferenceController（引擎非空 &&
              config_show_tts_settings_summary=true → AVAILABLE，Web speechSynthesis 等价），
              标题 = SettingsLib zh-rCN「文字转语音输出」，XML 无 android:icon -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">文字转语音输出</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
        </div>
        <script>` + A11Y_PAGE_SCRIPT + `</script>`,
    },
  ],
};

// v7.51 issue#7：把页面定义注册给双栏模块（右栏注入回退路径需按索引取 content）
setPages(settingsApp.pages);

export default settingsApp;

