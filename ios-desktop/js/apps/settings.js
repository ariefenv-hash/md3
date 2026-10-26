// ==================== settings.js — 设置 (Material Design 3 + Expressive Sliders) ====================
//
// 批次二「真设置」升级：
//   - 声音与震动（页 4）：接入 sound-haptics.js 真实开关（WebAudio 合成音效 /
//     触感全局门控）与音效音量；媒体音量真实联动 media-service；
//   - 应用（页 6）：v8.05 #23 差距矩阵③回审计 —— AppDashboardFragment apps.xml 1:1
//     （all_app_infos XOR recent_apps_category 运行时互斥 / default_apps / hibernated_apps /
//     special_access 忠实入口行 + 4 项 controller 双证隐藏注记）；卸载/恢复历史真实功能
//     保留为 Web 扩展卡（铁律#2 合法超越，AOSP XML 无对应条目）；
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
import { setSwitchChecked } from '../m3-controls.js'; // #70：程序化开关真值统一入口（裸赋值不驱动 JS 几何）
// #70 桥暴露：各子页 content 模板的内联 <script>（reactivateScripts 主文档全局作用域执行，
// 非 ESM）无法访问本模块作用域 —— 与 __bindAppDocListener/__md3SliderSet 同款 window 桥惯例
window.__setSwitchChecked = setSwitchChecked;
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
// v8.05 #23 差距矩阵③：应用页最近使用区单一真源 —— recent-apps.js 的
// recordAppOpened 全库唯一最近记录链（app-window 开窗 650ms defer + 分屏配对 +
// 多任务卡片置顶），与桌面最近任务/Dock 最近槽同源
import { getRecentAppsList } from '../recent-apps.js';

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
  // v8.05 #23 差距矩阵③：应用页内联脚本桥 —— AppsPreferenceController 语义
  // （recent_apps_category ≤4 最近应用）单一真源 = getRecentAppsList 快照；
  // 已安装集合/闲置计数由内联脚本走 window.__state 自算（pagesApps 拍平去重）
  window.__settingsAppsBridge = {
    recent: () => getRecentAppsList().slice(),
  };
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
            function setSw(id, on) { var sw = document.getElementById(id); (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, on); }
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
              (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(el, !!store.get(key)); // #70
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
                (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(tsToggle, sfx ? sfx.sfxEnabled() : true); // #70
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
                (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(hapToggle, sfx.hapticsEnabled()); // #70
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

const DISPLAY_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var LS_KEY = 'settings:display-v1';
            // 默认值=AOSP 默认语义：def_screen_off_timeout=60000（frameworks_base SettingsProvider
            // packages/SettingsProvider/res/values/defaults.xml 实源）
            var DEFAULTS = { timeout: 60000 };
            var state;
            try { state = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch (e) { state = Object.assign({}, DEFAULTS); }
            var store = {
              get: function(k) { return state[k]; },
              set: function(k, v) {
                state[k] = v;
                try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
                try { document.dispatchEvent(new CustomEvent('settings-display-changed', { detail: { key: k, value: v } })); } catch (e) {}
              }
            };
            // 单一真源注册（锁屏自动休眠消费点排期 v8.05+）
            window.__settingsDisplayStore = store;
            function showTip(msg) { if (window.showSystemToast) window.showSystemToast(msg); }
            // AOSP values-zh-rCN arrays.xml screen_timeout_entries 权威值映射（ms → 权威 zh）
            var TIMEOUT_LABELS = { 15000: '15 秒', 30000: '30 秒', 60000: '1 分钟', 120000: '2 分钟', 300000: '5 分钟', 600000: '10 分钟', 1800000: '30 分钟' };
            // getTimeoutSummary 语义：screen_timeout_summary「闲置 %1$s后」
            function timeoutSummary() {
              return '闲置 ' + (TIMEOUT_LABELS[state.timeout] || '1 分钟') + '后';
            }
            // v7.34 rAF 合帧 + v7.38 transform 驱动（v8.03 同款 bindSlider）
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
            function syncBrightnessUi() {
              // 激活回同步：亮度真值在 QS 桥上（QS 滑条可能已改值）
              var qs = window.__qsBrightness;
              var v = qs ? Math.max(15, Math.min(100, qs.get() || 80)) : 80;
              var label = document.getElementById('dspBriVal');
              if (label) label.innerText = v + '%';
              if (window.__md3SliderSet) window.__md3SliderSet(
                document.getElementById('dspBriSlider'),
                document.getElementById('dspBriFill'),
                document.getElementById('dspBriThumb'), v / 100, false);
            }
            function initOnce() {
              // ① 亮度级别（preference_key_brightness_level）：BrightnessLevelPreferenceController
              //    AVAILABLE；单一真源 = window.__qsBrightness 桥（QS 亮度滑条 body.filter 消费链）
              var s = document.getElementById('dspBriSlider');
              if (s && !s._bound) {
                bindSlider(s,
                  document.getElementById('dspBriFill'),
                  document.getElementById('dspBriThumb'),
                  document.getElementById('dspBriVal'),
                  function(p) { if (window.__qsBrightness) window.__qsBrightness.set(Math.round(p * 100)); },
                  function() { var qs = window.__qsBrightness; return qs ? Math.max(15, Math.min(100, qs.get() || 80)) / 100 : 0.8; }
                );
              }
              syncBrightnessUi();
              // ② 深色主题（dark_ui_mode）：DarkModePreference extends PrimarySwitchPreference；
              //    单一真源 = __settingsTheme（与快捷设置深色磁贴同向，v7.4x 既有链）；
              //    摘要 AutoDarkTheme.getStatus 默认 MODE_NIGHT_NO →
              //    dark_ui_summary_on/off_auto_mode_never「一律不自动关闭」/「永不自动开启」
              var dk = document.getElementById('dspDarkToggle');
              var dkSub = document.getElementById('dspDarkSub');
              if (dk && !dk._bound) {
                dk._bound = true;
                var syncDark = function() {
                  if (!window.__settingsTheme) return;
                  var dark = window.__settingsTheme.resolved() === 'dark';
                  (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(dk, dark); // #70（app-page-active 重同步路径，DOM 复用后几何对齐）
                  if (dkSub) dkSub.innerText = dark ? '一律不自动关闭' : '永不自动开启';
                };
                syncDark();
                dk.addEventListener('change', function() {
                  if (!window.__settingsTheme) { (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(dk, false); return; } // #70
                  window.__settingsTheme.set(dk.checked ? 'dark' : 'light');
                  syncDark();
                  showTip(dk.checked ? '已切换到深色方案' : '已切换到浅色方案');
                });
                if (!dk._themeWatch) {
                  dk._themeWatch = true;
                  bindDoc('settings', 'settings-theme-changed', syncDark);
                }
                // v8.11 #70 回归修复：v8.06 重构丢失的激活回同步（兄弟页 L538/683/2083/
                // 2767/3002 模式齐全，唯 display 缺）—— DOM 复用重进设置时 PAGE_SCRIPT
                // 不重跑，关闭期间被 QS 磁贴/控制中心改掉的主题真值无处刷新，
                // 即议题「不去动它，视觉就一直错着」的第二层缺口
                bindDoc('settings', 'app-page-active', function(e) {
                  if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 1) syncDark();
                });
              } else if (dk) {
                if (window.__settingsTheme) {
                  var darkNow = window.__settingsTheme.resolved() === 'dark';
                  (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(dk, darkNow); // #70
                  if (dkSub) dkSub.innerText = darkNow ? '一律不自动关闭' : '永不自动开启';
                }
              }
              // ③ 自动旋转屏幕（auto_rotate）：AutoRotatePreferenceController AVAILABLE
              //    （RotationPolicy.isRotationLockToggleVisible && !deviceState 折叠形态）；
              //    单一真源 = QS autorotate 磁贴（__qsTileState，v7.99 飞行模式同款接线）
              var rt = document.getElementById('dspRotateToggle');
              if (rt && !rt._bound) {
                rt._bound = true;
                if (window.__qsTileState) (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(rt, !!window.__qsTileState.get('autorotate')); // #70
                rt.addEventListener('change', function() {
                  var on = !!rt.checked;
                  if (window.__qsTileState) window.__qsTileState.sync('autorotate', { active: on });
                  showTip(on ? '自动旋转已开启' : '方向已锁定');
                });
              }
              // ④ 自动锁屏（screen_timeout）：ScreenTimeoutPreferenceController AVAILABLE；
              //    动态摘要 getTimeoutSummary = screen_timeout_summary「闲置 %1$s后」（store 真源，
              //    默认 def_screen_off_timeout=60000 →「闲置 1 分钟后」）
              var toSub = document.getElementById('dspTimeoutSub');
              if (toSub) toSub.innerText = timeoutSummary();
            }
            initOnce();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 1) initOnce();
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
            function setSw(id, on) { var sw = document.getElementById(id); (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, on); }
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

// ==================== ABOUT_PAGE_SCRIPT — 页 21 关于手机 / 页 22 型号 / 页 23 Android 版本（v8.26 #48） ====================
// issue #48 浏览器 API 设备信息填充：全部采集仅在本机进行、不外传（议题隐私要求）；
//   WebRTC 探测不带 STUN/TURN（iceServers 空数组 → 无外部候选收集器）。
// AOSP 权威清单（aosp-mirror/platform_packages_apps_settings main 实源，非记忆）：
//   页 21 = res/xml/my_device_info.xml（my_device_info_pref_screen，四分区 20 键，行均无
//     android:icon → 忠实纯文本行）：
//     ① basic_info_category「基本信息」：device_name(1, ValidatedEditTextPreference +
//       DeviceNamePreferenceController → prompt 编辑等价，localStorage 持久化)/
//       branded_account(2, BrandedAccountPreferenceController：非 branded device → 隐藏)/
//       phone_number(3, config_show_sim_info=false → 隐藏，Web 无 SIM 栈)
//     ② legal_category「法律法规」：legal_container(15, LegalSettings fragment → Web 等价
//       toast「本地未存储法律文档」)/ regulatory_info(16, intent SHOW_REGULATORY_INFO 无解析
//       → 隐藏)/ safety_info(17, 无内容源 → 隐藏)
//     ③ device_detail_category「设备详细信息」：sim_status(18)/eid(31)/imei(32) 全 SIM 门控隐藏；
//       device_model(30, model_info「型号」，fragment=HardwareInfoFragment → 页 22)/
//       firmware_version(42, FirmwareVersionSettings → 页 23)/
//       battery_info(43, BatteryInfoFragment → Web 等价=电池子页页 2)
//     ④ device_identifiers_category「设备标识符」：wifi_ip_address(44, WebRTC host candidate
//       + mDNS/.local 降级 + device_info_default「未知」)/ saved_accesspoints_wifi_mac_address(45)/
//       wifi_mac_address(46)/bt_address(47)（Web 无 MAC 栈 → 隐藏）/ up_time(48, formatElapsed
//       zh 语义「X 小时 Y 分钟」，Web 映射=页面会话时长 performance.now，开机时长不可得注记)/
//       manual(50, intent SHOW_MANUAL 无解析 → 隐藏)/ device_feedback(51, 无反馈通道 → 隐藏)/
//       fcc_equipment_id(52, 无 FCC 标识 → 隐藏)/ build_number(53, BuildNumberPreferenceController
//       连点链 TAPS_TO_BECOME_DEVELOPER=7 → 开发者模式，show_dev_countdown/show_dev_on/
//       show_dev_already zh-rCN 权威文案同构)
//   页 22 = res/xml/hardware_info.xml（标题 model_info「型号」，4 行）：
//     hardware_info_device_model（DeviceModelPreferenceController.getSummary=getDeviceModel →
//       Web=UA-CH model → platform 降级）/ hardware_info_device_serial（config_show_device_model
//       门控 + Build.getSerial 无 Web API → 隐藏）/ hardware_info_device_revision
//       （ro.boot.hardware.revision 空 → UNSUPPORTED_ON_DEVICE 同构 → 隐藏）/
//       hardware_info_manufactured_year（→ 隐藏）
//     +「浏览器设备信息」扩展分区（#48 议题明示超越点，AOSP 无此分区注记保留）：
//       屏幕(screen×dpr×colorDepth)/处理器核心(hardwareConcurrency)/内存(deviceMemory 近似档位)/
//       浏览器与渲染引擎(UA-CH brands)/语言与时区(navigator.language + Intl timeZone)/
//       存储(storage.estimate usage/quota)
//   页 23 = res/xml/firmware_version.xml（1:1 六键）：
//     os_firmware_version「Android 版本」/ security_key「Android 安全更新」/
//     module_version「Google Play 系统更新」（Web=fullVersionList Chrome 完整版真实值）/
//     base_band「基带版本」（Web 无调制解调器 → 隐藏）/ kernel_version「内核版本」/
//     os_build_number「Build 号」
// 伪装链（#48 议题明示许可「可用 platformVersion 伪装内核/构建号行」）：确定性派生
//   （dHash djb2 变体；同一设备数据恒生成同一伪装值，E2E 双次刷新一致性断言锚定）：
//   fakeBuildId 'XXXX.YYMMDD.NNN'（AOSP BuildID 格式）/ fakePatch 'YYYY-MM-DD'（补丁级别格式）/
//   fakeKernel '5.15.NN-androidMAJ-N-gHEX12'（AOSP 内核版本格式）
// 优雅降级（议题验收）：userAgentData 缺失 → UA 解析；getHighEntropyValues 缺失 → 浅层字段；
//   各 API 不可用 → device_info_default「未知」（zh-rCN 权威回退值）
// 幂等：window.__aboutV826 守卫 —— 三个页面 content 各内嵌一次本 script，仅首次安装
//   定时器/监听（renderPageStack 重复 innerHTML 不重复 setInterval）
const ABOUT_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var DEVICE_NAME_KEY = 'ios-desktop:device-name';
            var DEV_MODE_KEY = 'ios-desktop:development-settings-enabled';
            var TAPS_TO_BECOME_DEVELOPER = 7; // BuildNumberPreferenceController 同构
            var tapCount = 0;
            var ipToken = 0;
            var lastU = null;
            function byId(id) { return document.getElementById(id); }
            function dHash(s) {
              var h = 5381; s = String(s == null ? '' : s);
              for (var i = 0; i < s.length; i++) { h = (((h << 5) + h) + s.charCodeAt(i)) | 0; }
              return Math.abs(h);
            }
            // UA-CH（Chrome 90+ 含 127）→ platformVersion/model/fullVersionList；缺失 → UA 解析降级
            function uaInfo(cb) {
              var u = { platform: '', platformVersion: '', model: '', mobile: false, brands: [], fullChrome: '' };
              var uad = navigator.userAgentData;
              if (uad && uad.getHighEntropyValues) {
                u.platform = uad.platform || '';
                u.mobile = !!uad.mobile;
                u.brands = (uad.brands || []).slice();
                uad.getHighEntropyValues(['platformVersion', 'model', 'fullVersionList']).then(function(hv) {
                  u.platformVersion = hv.platformVersion || '';
                  u.model = hv.model || '';
                  var fl = hv.fullVersionList || [];
                  for (var i = 0; i < fl.length; i++) { if (/Google Chrome/i.test(fl[i].brand)) u.fullChrome = fl[i].version; }
                  cb(u);
                }).catch(function() { cb(u); });
                return;
              }
              var ua = navigator.userAgent || '';
              var ma = /Android ([0-9.]+)/.exec(ua);
              var mc = /Chrome.([0-9.]+)/.exec(ua);
              u.platform = /Android/.test(ua) ? 'Android' : (navigator.platform || '');
              u.platformVersion = ma ? ma[1] : '';
              if (mc) { u.brands = [{ brand: 'Google Chrome', version: mc[1].split('.')[0] }]; u.fullChrome = mc[1]; }
              cb(u);
            }
            // platformVersion → Android 版本表述（'15.0.0' → '15'）；非 Android → 平台名真实回显
            function osLabel(u) {
              var pv = (u.platformVersion || '').trim();
              if (/^[0-9]/.test(pv)) return pv.split('.')[0];
              if (u.platform) return u.platform;
              return '未知';
            }
            // 型号：UA-CH model（Android 真机真实型号）→ platform 降级 →「未知」
            function modelLabel(u) {
              if (u.model) return u.model;
              if (u.platform) return u.platform;
              return '未知';
            }
            function engineLabel(u) {
              if (u.fullChrome) return 'Google Chrome ' + u.fullChrome;
              for (var i = 0; i < u.brands.length; i++) { if (/Google Chrome/i.test(u.brands[i].brand)) return 'Google Chrome ' + u.brands[i].version; }
              var m = /Chrome.([0-9.]+)/.exec(navigator.userAgent || '');
              return m ? 'Chromium ' + m[1] : '未知';
            }
            function seedOf(u) {
              return u.platform + ':' + u.platformVersion + ':' + (u.model || '') + ':' + engineLabel(u);
            }
            // 伪装 Build 号：AOSP 'XXXX.YYMMDD.NNN' 格式（前缀档 + hash 派生日 + 序号）
            function fakeBuildId(seed) {
              var h = dHash(seed);
              var p2 = function(n) { return (n < 10 ? '0' : '') + n; };
              var pre = ['AP3A', 'AP4A', 'BP3A', 'BP4A'][h % 4];
              var yy = 25 + (h % 2);
              var mm = 1 + Math.floor(h / 2) % 12;
              var dd = 1 + Math.floor(h / 24) % 28;
              var num = 10 + Math.floor(h / 672) % 990;
              return pre + '.' + yy + p2(mm) + p2(dd) + '.' + num;
            }
            // 伪装安全补丁级别：'YYYY-MM-DD'（SecurityPatchLevelPreferenceController 值格式）
            function fakePatch(seed) {
              var h = dHash('patch:' + seed);
              var p2 = function(n) { return (n < 10 ? '0' : '') + n; };
              var y = 2025 + (h % 2);
              var m = 1 + Math.floor(h / 2) % 12;
              var d = 1 + Math.floor(h / 24) % 28;
              return y + '-' + p2(m) + '-' + p2(d);
            }
            // 伪装内核版本：AOSP '5.15.NN-androidMAJ-N-gHEX12' 格式
            function fakeKernel(u) {
              var maj = ((u.platformVersion || '').split('.')[0]) || '0';
              var seed = 'kernel:' + u.platform + ':' + u.platformVersion;
              var h = dHash(seed), h2 = dHash(seed + '#2');
              var hex = '0123456789abcdef', g = '';
              for (var i = 0; i < 12; i++) { g += hex[Math.abs((h2 >> (i % 28)) % 16)]; }
              return '5.15.' + (10 + h % 90) + '-android' + maj + '-' + (h2 % 9) + '-g' + g;
            }
            // 本机 IP：WebRTC host candidate（无 STUN → 不外传）；现代浏览器 mDNS 混淆
            // → .local 主机名即浏览器真实输出；超时/不可用 →「未知」
            function probeIp() {
              var el = byId('aboutIpSub');
              if (!el || !el.isConnected) return;
              if (typeof RTCPeerConnection === 'undefined') { el.textContent = '未知'; return; }
              var tok = ++ipToken;
              var pc = null, done = false;
              var finish = function(v) {
                if (done || tok !== ipToken) return;
                done = true;
                try { if (pc) pc.close(); } catch (e) {}
                if (el.isConnected) el.textContent = v;
              };
              try {
                pc = new RTCPeerConnection({ iceServers: [] });
                pc.createDataChannel('about-probe');
                pc.onicecandidate = function(e) {
                  if (done) return;
                  var c = (e.candidate && e.candidate.candidate) || '';
                  if (c.indexOf(' typ host') === -1 && c.indexOf('typ host') === -1) return;
                  var parts = c.split(' ');
                  if (parts.length > 4 && parts[4]) finish(parts[4]);
                };
                pc.createOffer().then(function(o) { return pc.setLocalDescription(o); }).catch(function() {});
              } catch (e) { finish('未知'); return; }
              setTimeout(function() { finish('未知'); }, 3000);
            }
            // 电池行：battery-service 单一真源（window 桥）优先，navigator.getBattery 兜底；
            // 摘要 = v8.06 TopLevelBatteryPreferenceController.getDashboardLabel 同构
            function refreshBatteryRow() {
              var el = byId('aboutBatterySub');
              if (!el || !el.isConnected) return;
              var st = window.__batteryGetState && window.__batteryGetState();
              if (st && typeof st.level === 'number') {
                el.textContent = st.charging ? st.level + '% - 正在充电' : st.level + '%';
                return;
              }
              if (navigator.getBattery) {
                navigator.getBattery().then(function(b) {
                  if (el.isConnected) el.textContent = b.charging ? Math.round(b.level * 100) + '% - 正在充电' : Math.round(b.level * 100) + '%';
                }).catch(function() { el.textContent = '未知'; });
              } else { el.textContent = '未知'; }
            }
            // 正常运行时间：formatElapsed zh 语义；Web 域映射 = 页面会话时长（开机时长不可得）
            function fmtUptime() {
              var ms = performance.now();
              var min = Math.floor(ms / 60000);
              var h = Math.floor(min / 60);
              if (h >= 1) return h + ' 小时 ' + (min % 60) + ' 分钟';
              if (min >= 1) return min + ' 分钟';
              return Math.floor((ms % 60000) / 1000) + ' 秒';
            }
            function deviceNameDefault(u) {
              return u.model || u.platform || 'Web 设备';
            }
            // device_name 编辑：DeviceNamePreferenceController dialog 语义 → prompt 等价；
            // 空名不保存（ValidatedEditTextPreference 非空校验同构）
            function renameDevice() {
              var el = byId('aboutDeviceName');
              var cur = '';
              try { cur = localStorage.getItem(DEVICE_NAME_KEY) || ''; } catch (e) {}
              if (!cur && lastU) cur = deviceNameDefault(lastU);
              var next = window.prompt('重命名此设备', cur);
              if (next == null) return;
              next = String(next).replace(/^\\s+|\\s+$/g, '');
              if (!next) return;
              try { localStorage.setItem(DEVICE_NAME_KEY, next); } catch (e) {}
              if (el && el.isConnected) el.textContent = next;
            }
            // build_number 连点链（BuildNumberPreferenceController 同构）：
            // 每点 remaining 递减 toast show_dev_countdown；归零 toast show_dev_on 并持久化
            // development_settings_enabled；已解锁态点击 toast show_dev_already
            function onBuildTap() {
              var enabled = false;
              try { enabled = localStorage.getItem(DEV_MODE_KEY) === '1'; } catch (e) {}
              if (enabled) { if (window.showSystemToast) window.showSystemToast('您已处于开发者模式，无需进行此操作。'); return; }
              tapCount = (tapCount + 1) % TAPS_TO_BECOME_DEVELOPER;
              if (tapCount === 0) {
                try { localStorage.setItem(DEV_MODE_KEY, '1'); } catch (e) {}
                if (window.showSystemToast) window.showSystemToast('您现在处于开发者模式！');
              } else {
                var remaining = TAPS_TO_BECOME_DEVELOPER - tapCount;
                if (window.showSystemToast) window.showSystemToast('现在只需再执行 ' + remaining + ' 步操作，即可进入开发者模式。');
              }
            }
            function showLegal() {
              // legal_container（LegalSettings fragment）Web 等价：本地无文档提示
              if (window.showSystemToast) window.showSystemToast('本地未存储法律文档');
            }
            function fillPage21(u) {
              var el;
              var name = '';
              try { name = localStorage.getItem(DEVICE_NAME_KEY) || ''; } catch (e) {}
              el = byId('aboutDeviceName');
              if (el) el.textContent = name || deviceNameDefault(u);
              el = byId('aboutModelSub');
              if (el) el.textContent = modelLabel(u);
              el = byId('aboutOsSub');
              if (el) el.textContent = osLabel(u);
              el = byId('aboutBuildSub');
              if (el) el.textContent = fakeBuildId(seedOf(u));
              el = byId('aboutUptimeSub');
              if (el) el.textContent = fmtUptime();
              probeIp();
              refreshBatteryRow();
            }
            function fillPage22(u) {
              var el;
              el = byId('aboutHwModel');
              if (el) el.textContent = modelLabel(u);
              el = byId('aboutHwScreen');
              if (el) el.textContent = screen.width + ' × ' + screen.height + ' · dpr ' + (window.devicePixelRatio || 1) + ' · 色深 ' + (screen.colorDepth || 0) + ' 位';
              el = byId('aboutHwCores');
              if (el) el.textContent = navigator.hardwareConcurrency ? navigator.hardwareConcurrency + ' 核' : '未知';
              el = byId('aboutHwMemory');
              if (el) el.textContent = navigator.deviceMemory ? '≥ ' + navigator.deviceMemory + ' GB（近似档位）' : '未知';
              el = byId('aboutHwEngine');
              if (el) el.textContent = engineLabel(u);
              el = byId('aboutHwLocale');
              if (el) {
                var tz = '';
                try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
                el.textContent = (navigator.language || '未知') + (tz ? ' · ' + tz : '');
              }
              el = byId('aboutHwStorage');
              if (el) {
                if (navigator.storage && navigator.storage.estimate) {
                  navigator.storage.estimate().then(function(est) {
                    if (!el.isConnected) return;
                    var usage = (est.usage || 0) / 1073741824;
                    var quota = (est.quota || 0) / 1073741824;
                    el.textContent = '已用 ' + usage.toFixed(2) + ' GB · 配额 ' + quota.toFixed(1) + ' GB';
                  }).catch(function() { el.textContent = '未知'; });
                } else { el.textContent = '未知'; }
              }
            }
            function fillPage23(u) {
              var el;
              el = byId('aboutOsVer');
              if (el) el.textContent = osLabel(u);
              el = byId('aboutPatch');
              if (el) el.textContent = fakePatch(seedOf(u));
              el = byId('aboutModule');
              if (el) el.textContent = engineLabel(u);
              el = byId('aboutKernel');
              if (el) el.textContent = fakeKernel(u);
              el = byId('aboutBuild2');
              if (el) el.textContent = fakeBuildId(seedOf(u));
            }
            function refresh() {
              uaInfo(function(u) {
                lastU = u;
                fillPage21(u);
                fillPage22(u);
                fillPage23(u);
              });
            }
            // 幂等守卫：本 script 在页 21/22/23 各内嵌一次，重复执行仅补刷新
            if (typeof window !== 'undefined' && window.__aboutV826) {
              window.__aboutV826.refresh();
              return;
            }
            window.__aboutV826 = { refresh: refresh, renameDevice: renameDevice, onBuildTap: onBuildTap, showLegal: showLegal, probeIp: probeIp };
            refresh();
            setInterval(function() {
              var el = byId('aboutUptimeSub');
              if (el && el.isConnected && lastU) el.textContent = fmtUptime();
              probeIp();
              refreshBatteryRow();
            }, 30000);
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && (e.detail.pageIdx === 21 || e.detail.pageIdx === 22 || e.detail.pageIdx === 23)) { refresh(); }
            });
          })();
        `;

// ==================== LOCATION_PAGE_SCRIPT — 页 24 位置信息 / 页 25 近期访问全览 / 页 26 位置信息服务（v8.29 #22⑦） ====================
// 考证链（aosp-mirror main 实源逐 key 取证，2026-10-26）：
//   页 24 = res/xml/location_settings.xml（screen key=location_settings，title=location_settings_title
//   「位置信息」zh-rCN 权威值）：
//     ①页顶总开关 = SettingsMainSwitchBar（LocationSettings.onActivityCreated L92-101 实证——
//       switchBar.setTitle(location_settings_primary_switch_title「使用位置信息」)+
//       LocationSwitchBarController；不在 XML 内，Web 以带底色条形态映射）；
//       Web 真源说明：navigator.geolocation 权限 API 单向（仅请求不可程序化读写全局开关）→
//       设置态=唯一真源（localStorage settings:location-v1，v8.01 SIM 裁决同律：无真源时
//       以持久化设置为准），默认 true=AOSP 出厂默认开
//     ②recent_location_access 分区「近期位置信息访问」（location_category_recent_location_access）：
//       RecentLocationAccessPreferenceController 动态行 = icon+应用名+相对时间摘要
//       （createAppPreference L194-195：setTitle(access.label)+setSummary(formatRelativeTime(
//       now-accessFinishTime, LONG))，MAX_APPS=3 L51 实证）；空态 banner=
//       location_no_recent_accesses「最近没有任何应用访问位置信息」L157；位置关闭时整组隐藏
//       （onLocationModeChanged → setVisible(enabled) L201-204）；Web 虚构时间线 = 固定 seed
//       确定性 6 项（真机数据来自 AppOps 实时统计，Web 无对应 API；offset 恒定渲染恒定，
//       v8.26 伪装链「同设备恒同值」同律）
//     ③recent_location_access_see_all_button「查看全部」→ RecentLocationAccessSeeAllFragment
//       → 页 25（同数据源全量列表）
//     ④location_advanced_settings 分区（no_label）：
//       managed_profile_location_switch「工作资料位置信息」——无 managed profile 移除
//       （XML 注释 L42「gets removed if there is no managed profile」+ enabled=false 默认）→ 隐藏注记；
//       private_profile_location_switch「私密空间的位置」——A17 Private Profile 新项，无
//       private profile 移除（XML 注释 L52）→ 隐藏注记；
//       app_level_permissions「应用位置信息权限」（AppLocationPermissionPreferenceController.getSummary
//       实拉：开=location_app_permission_summary_location_on ICU plural other 形态「N 个应用（共 M 个
//       应用）有权获取位置信息」/关=location_app_permission_summary_location_off「位置信息服务已关闭」；
//       Web has 权限数=时间线长度自洽、total=虚构 32 恒定）
//     ⑤location_services「位置信息服务」（location_services_preference_title）→ 页 26
//     ⑥location_footer（FooterPreference）：开=location_settings_footer_general「具有附近设备权限的
//       应用可以确定已连接设备的相对位置。」/关=location_settings_footer_location_off（紧急呼叫
//       例外语义逐字）
//   页 26 = res/xml/location_services.xml（title=location_services_screen_title「位置信息服务」）：
//     location_services_wifi_scanning「WLAN 扫描」+ location_services_bluetooth_scanning
//     「蓝牙扫描」（SettingInjectorService 注入形态，framework 侧独立于页面总开关常显）；
//     scan always 真源 = Settings.Secure Wi-Fi/Bluetooth scan always available（Web 无
//     对应 API → 设置态真源同总开关律）
//   幂等守卫 window.__settingsLocationV829（v8.26 __aboutV826 同律，三页各内嵌一次不重复绑定）。
const LOCATION_PAGE_SCRIPT = `
(function(){
  if (window.__settingsLocationV829) return;
  window.__settingsLocationV829 = true;
  var KEY = 'settings:location-v1';
  var DEF = { enabled: true, wifiScanning: true, btScanning: true };
  function load() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); return Object.assign({}, DEF, o); }
    catch (e) { return Object.assign({}, DEF); }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  // 虚构近期位置访问时间线：固定 seed 确定性（真机 = AppOps 实时数据，Web 无对应 API；
  // offset 恒定 → 渲染恒定，v8.26 伪装链同律）。mins = 距加载时刻的分钟数。
  var RECENT = [
    { name: '地图', mins: 8,    color: '#1a73e8' },
    { name: '天气', mins: 32,   color: '#4285f4' },
    { name: '相机', mins: 120,  color: '#5f6368' },
    { name: '通讯录', mins: 300,  color: '#0b8043' },
    { name: '时钟', mins: 1560, color: '#e37400' },
    { name: '文件', mins: 4320, color: '#607d8b' }
  ];
  var TOTAL_APPS = 32; // 虚构装机总数（确定性；Web 无包管理器真源，伪装链同律）
  var MAX_APPS = 3;    // AOSP RecentLocationAccessPreferenceController.MAX_APPS L51 逐字
  function relTime(mins) { // StringUtil.formatRelativeTime LONG zh 语义映射
    if (mins < 1) return '刚刚';
    if (mins < 60) return mins + ' 分钟前';
    if (mins < 1440) return Math.floor(mins / 60) + ' 小时前';
    return Math.floor(mins / 1440) + ' 天前';
  }
  function fmtAppPermSummary(s) {
    if (!s.enabled) return '位置信息服务已关闭';
    return RECENT.length + ' 个应用（共 ' + TOTAL_APPS + ' 个应用）有权获取位置信息';
  }
  function recentRow(a) {
    return '<div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">' +
      '<span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:' + a.color + ';border-radius:50%;color:#fff;font-size:13px;">' + a.name.charAt(0) + '</span>' +
      '<span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">' + a.name + '</span></span>' +
      '<span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">' + relTime(a.mins) + '</span></div>';
  }
  function refresh() {
    var s = load();
    var setSw = window.__setSwitchChecked||function(a,b){if(a)a.checked=!b}; // #70 统一入口（桥未就绪防御降级，既有豁免形态）
    var sw = document.getElementById('locMainSwitch');
    if (sw) setSw(sw, !!s.enabled);
    var sum = document.getElementById('locAppPermSum');
    if (sum) sum.textContent = fmtAppPermSummary(s);
    // 位置关闭 → recent 整组隐藏（onLocationModeChanged → setVisible(enabled) 同构；
    // 虚构数据恒非空，空态 banner 为完整 AOSP 语义保留：RECENT 空时显示）
    var grp = document.getElementById('locRecentGroup');
    if (grp) grp.style.display = s.enabled ? '' : 'none';
    var main = document.getElementById('locRecentMain');
    if (main) main.innerHTML = RECENT.slice(0, MAX_APPS).map(recentRow).join('');
    var all = document.getElementById('locRecentAll');
    if (all) all.innerHTML = RECENT.map(recentRow).join('');
    var foot = document.getElementById('locFooter');
    if (foot) foot.textContent = s.enabled
      ? '具有附近设备权限的应用可以确定已连接设备的相对位置。'
      : '应用和服务的位置信息使用权处于关闭状态。在您拨打紧急电话号码或向该号码发送短信时，系统可能仍会将您的设备位置信息发送给紧急救援人员。';
    var wf = document.getElementById('locWifiScan'); if (wf) setSw(wf, !!s.wifiScanning);
    var bt = document.getElementById('locBtScan'); if (bt) setSw(bt, !!s.btScanning);
  }
  function bind() {
    var sw = document.getElementById('locMainSwitch');
    if (sw) sw.onchange = function() { var s = load(); s.enabled = !!sw.checked; save(s); refresh(); };
    var wf = document.getElementById('locWifiScan');
    if (wf) wf.onchange = function() { var s = load(); s.wifiScanning = !!wf.checked; save(s); };
    var bt = document.getElementById('locBtScan');
    if (bt) bt.onchange = function() { var s = load(); s.btScanning = !!bt.checked; save(s); };
  }
  var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
  refresh(); bind();
  bindDoc('settings', 'app-page-active', function(e) {
    if (e.detail && e.detail.appId === 'settings' && (e.detail.pageIdx === 24 || e.detail.pageIdx === 25 || e.detail.pageIdx === 26)) { refresh(); bind(); }
  });
})();
`;

// ==================== MODES_PAGE_SCRIPT — 页 27 模式（v8.30 #22③） ====================
// 考证链（aosp-mirror main 实源逐 key 取证，2026-10-26）：
//   页 27 = res/xml/modes_list_settings.xml（3 keys，A17 Modes 极简壳——#22 注记「先考证再动，
//   网页版能力已超 AOSP 入口」核验结论：壳形态 1:1 对齐 + 动态列表按 AOSP 纯净出厂态）：
//     ①TopIntroPreference zen_modes_list_intro「利用适合睡眠、工作、驾车等场景的各种模式，
//       减少干扰、保持专注。」
//     ②zen_modes_list 分区 = ZenModesListPreferenceController 动态生成（SettingsLib
//       ZenModesBackend.getModes() 实拉：首项恒为 Manual DND 模式 getManualDndMode，其后 =
//       NotificationManager.getAutomaticZenRules() 自动规则，PRIORITIZING_COMPARATOR 排序；
//       **AOSP 纯净出厂自动规则为空 → 列表仅「勿扰」一行**——自动规则是用户态数据，
//       不虚构存在性存疑项（v8.01 SIM 门控同律）；行形态 = ZenModesListItemPreference
//       setZenMode 实拉：title=mode.getName() + summary=getStatusText 四态（
//       zen_mode_active_text「已启用」/ zen_mode_disabled_by_user「已停用」/
//       zen_mode_disabled_needs_setup「未设置」）+ icon 随激活态 accent tint）；
//       勿扰行摘要真源 = window.__qsTileState.get('modes')（quick-settings.js QS 磁贴单一真源，
//       modes 磁贴 sub「勿扰模式」v7.90 语义）；行点击 → 页 9「多模式」（项目双模式场景系统
//       真管理入口——v7.98 主题/壁纸/勿扰 per-mode + Focus 番茄钟自动勿扰；AOSP ZenModeFragment
//       详情页排后续转正，#22 注记「网页版能力已超 AOSP 入口」的映射注记）
//     ③add_mode「创建您的专属模式」（zen_modes_add_mode 权威值 + ic_add_24dp）→ 点击 toast
//       （ZenModeNewCustomFragment/ZenModesListAddModeTypeChooserDialog 模板选择向导 Web 等价
//       提示，v8.26 showLegal toast 同律）
//   幂等守卫 window.__settingsModesV830（v8.26 同律）。
const MODES_PAGE_SCRIPT = `
(function(){
  if (window.__settingsModesV830) return;
  window.__settingsModesV830 = true;
  function refresh() {
    var el = document.getElementById('modesDndSummary');
    if (!el) return;
    var active = false;
    try { active = !!(window.__qsTileState && window.__qsTileState.get && window.__qsTileState.get('modes')); } catch (e) {}
    el.textContent = active ? '已启用' : '已停用'; // zen_mode_active_text / zen_mode_disabled_by_user 权威值
  }
  function toastAddMode() {
    if (window.showSystemToast) window.showSystemToast('模式模板选择向导后续版本转正');
  }
  window.__settingsModesV830 = { refresh: refresh, toastAddMode: toastAddMode };
  var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
  refresh();
  bindDoc('settings', 'app-page-active', function(e) {
    if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 27) { refresh(); }
  });
})();

`;

// ==================== ACCOUNTS_PAGE_SCRIPT — 页 30 密码、通行密钥和账号（v8.33 #22⑨） ====================
// 考证链（aosp-mirror main 实拉，2026-10-26）：
//   一级页面二选一裁决（#22⑨ 注记「存在 accounts_dashboard_settings_credman.xml 形态分支
//   （二选一，先考证）」落地）：
//     AccountDashboardFragment.getPreferenceLayoutResId()（accounts 包实拉）：
//       (context != null && CredentialManager.isServiceEnabled(context))
//         ? R.xml.accounts_dashboard_settings_credman : R.xml.accounts_dashboard_settings
//     判定链下钻（frameworks/base core/java/android/credentials/CredentialManager.java 实拉
//     L544 + services/credentials CredentialManagerService.java 实拉 L953）：
//       isServiceEnabled → mService.isServiceEnabled → DeviceConfig.getBoolean(
//       NAMESPACE_CREDENTIAL, "enable_credential_manager", /*defaultValue=*/ true)
//     出厂默认 true → A17 纯净态走 credman 形态（v8.31 SafetyCenter 形态门控二取一同律）；
//     传统形态 passwords_category（PasswordsPreferenceController）落选留注记
//   页面骨架 = res/xml/accounts_dashboard_settings_credman.xml（2985B 全文实拉，screen
//   key=user_and_account_settings_screen，title=account_dashboard_title_with_passkeys）：
//     TopIntroPreference（无 order，排最顶）→ default_service_category(order 10) →
//     credman_category(order 20) → dashboard_tile_placeholder(order 130) →
//     auto_sync_account_data(order 202) → auto_sync_work_account_data(order 203，forWork)
//     → auto_sync_personal_account_data(order 204)
//   文案 = values-zh-rCN/strings.xml 实拉权威值：account_dashboard_title_with_passkeys
//   「密码、通行密钥和账号」/ credman_main_settings_intro_text（TopIntro 全文）/
//   credman_chosen_app_title「首选服务」/ credman_credentials「其他服务」/
//   credman_app_list_preference_none「未选择任何内容」（DefaultCombinedPreferenceController
//   updatePreferenceForProvider：topProvider=null → title=none/icon=null/summary=null L109-121
//   实拉——纯净 aosp-mirror 无 GMS → 无凭据服务商 →「未选择任何内容」呈现）/ auto_sync_account_title
//   「自动同步应用数据」/ auto_sync_account_summary「让应用自动刷新数据」/
//   account_settings「账号」（AccountPreferenceController preferenceGroup 默认 title L373）/
//   add_account_label「添加账号」（newAddAccountPreference L458-459 + ic_add_24dp）
//   结构性配置零虚构（v8.30 modes 自动规则出厂空同律）：
//     ①credman_category「其他服务」= CredentialManagerPreferenceController
//       maybeUpdatePreferenceVisibility L475-487：isHiddenDueToNoProviderSet(providerPair)
//       → 无服务商整组隐藏（纯净出厂无 provider）→ 隐藏注记
//     ②dashboard_tile_placeholder(order 130) = AccountPreferenceController 动态注入账号
//       列表（AccountTypePreference：title=account.name/summary=authenticator label L79-90
//       实拉；行=每账号实体一行「Add a preference row for each individual account」L614
//       注释逐字；尾部恒 add_account 行 L557-559）——纯净出厂（aosp-mirror 无 GMS）无账号
//       → category 仅「添加账号」行；#22⑨ 注记「网页可接 mail/contacts 既有账号数据」
//       核验结论 = mail.js 仅邮件文本内容/contacts.js 无账号概念（零结构化账号真源）
//       → 不虚构列表
//     ③auto_sync_work_account_data(forWork=true)/auto_sync_personal_account_data：
//       AutoSyncWorkDataPreferenceController/AutoSyncPrivateDataPreferenceController
//       profile 门控 → 纯净出厂无 work profile/private space → 隐藏注记（v8.01 SIM 门控 +
//       v8.29 位置 profile 两键同律）
//   auto_sync_account_data 开关语义（AutoSyncDataPreferenceController 全文实拉）：
//     真源 = ContentResolver.getMasterSyncAutomaticallyAsUser（L35-40 updateState）；
//     isAvailable = !isManagedProfile && (isRestrictedProfile || profiles.size()==1)（L61-63）
//     → 纯净出厂单 profile 可见；点击 → switchPreference.setChecked(!checked) 视觉先翻转 +
//     ConfirmAutoSyncChangeFragment.newInstance(...).show(mParentFragment)（L46-52）确认弹窗；
//     取消 = 视觉回滚（updateState 重读真源语义）；确认 = setMasterSyncAutomatically 写真源
//     （onClick BUTTON_POSITIVE L149-150）→ Web 等价 = localStorage 单一真源
//     （ContentResolver master sync 无 Web 对应 API，v8.29 location 总开关裁决同律，
//     默认 true = AOSP 出厂默认开）+ #70 __setSwitchChecked 统一入口
//   ConfirmAutoSyncChangeFragment.onCreateDialog L125-140 实拉四文案：
//     关闭分支 = data_usage_auto_sync_off_dialog_title「要关闭自动同步数据功能吗？」+
//     data_usage_auto_sync_off_dialog（zh 全值）；开启分支 =
//     data_usage_auto_sync_on_dialog_title「要打开自动同步数据功能吗？」+
//     data_usage_auto_sync_on_dialog——zh 翻译集（values-zh-rCN/strings.xml 710KB 全文检索）
//     与 en res/values/strings.xml（1.1MB blobs API 全文检索）均 MISS → key 实际定义于
//     res-product/values/strings.xml（Android.bp resource_dirs 三目录之一，平板口径英文原文
//     「Any changes you make to your accounts on the web will be automatically copied to
//     your tablet. ...」；资源合并语义 = 同 key 全局唯一 → 手机形态同显此值，zh 无翻译回退
//     默认英文——AOSP 出厂行为本身 1:1 呈现 + 注记留痕，v8.32 open_app_button zh MISS 注记同律）
//   幂等守卫 window.__settingsAccountsV833（v8.26/v8.30/v8.31 同律）。
const ACCOUNTS_PAGE_SCRIPT = `
(function(){
  if (window.__settingsAccountsV833) return;
  window.__settingsAccountsV833 = true;
  var KEY = 'settings:accounts-v1';
  var DEF = { autoSync: true }; // AOSP ContentResolver.getMasterSyncAutomatically 出厂默认开
  function load() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); return Object.assign({}, DEF, o); }
    catch (e) { return Object.assign({}, DEF); }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function setSw(on) { // #70 开关同步：__setSwitchChecked 统一入口
    var sw = document.getElementById('acSyncToggle');
    (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, on);
  }
  function openSyncDialog(enabling) { // ConfirmAutoSyncChangeFragment Web 等价
    var dlg = document.getElementById('acSyncDialog');
    if (!dlg) return;
    // 开关视觉先翻转（AOSP handlePreferenceTreeClick L46：setChecked(!checked) 先行）
    setSw(enabling);
    var t = document.getElementById('acSyncDlgTitle');
    var m = document.getElementById('acSyncDlgMsg');
    if (enabling) { // data_usage_auto_sync_on_dialog_title zh 权威 + message 英文权威（res-product，zh MISS 留痕）
      if (t) t.textContent = '要打开自动同步数据功能吗？';
      if (m) m.textContent = 'Any changes you make to your accounts on the web will be automatically copied to your tablet.\\n\\nSome accounts may also automatically copy any changes you make on the tablet to the web. A Google Account works this way.';
    } else { // data_usage_auto_sync_off_dialog_title + off_dialog zh 权威全值
      if (t) t.textContent = '要关闭自动同步数据功能吗？';
      if (m) m.textContent = '关闭后可以节省数据流量和电池电量，但您需要手动同步每个账号才能获得最新信息，并且在有更新时不会收到通知。';
    }
    dlg.dataset.pending = enabling ? 'on' : 'off';
    dlg.style.display = 'flex';
  }
  function confirmSync() { // onClick BUTTON_POSITIVE → setMasterSyncAutomatically 写真源
    var dlg = document.getElementById('acSyncDialog');
    if (!dlg) return;
    var on = dlg.dataset.pending === 'on';
    save({ autoSync: on });
    setSw(on);
    dlg.style.display = 'none';
  }
  function cancelSync() { // 取消 = 视觉回滚（updateState 重读真源语义）
    setSw(!!load().autoSync);
    var dlg = document.getElementById('acSyncDialog');
    if (dlg) dlg.style.display = 'none';
  }
  function refresh() { // DOM 复用重入：真源恢复（#70）
    setSw(!!load().autoSync);
  }
  function toastAddAccount() {
    if (window.showSystemToast) window.showSystemToast('添加账号需要账号框架支持，后续版本转正'); // AccountManager Web 等价
  }
  function toastPickProvider() {
    if (window.showSystemToast) window.showSystemToast('首选服务选择器后续版本转正'); // DefaultAutofillPicker Web 等价
  }
  var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
  refresh(); // 初始恢复（localStorage 空 = 出厂态 autoSync true）
  bindDoc('settings', 'app-page-active', function(e) { // DOM 复用重同步（v8.29 location 同款）
    if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 30) { refresh(); }
  });
  window.__settingsAccountsV833 = { openSyncDialog: openSyncDialog, confirmSync: confirmSync, cancelSync: cancelSync, refresh: refresh, toastAddAccount: toastAddAccount, toastPickProvider: toastPickProvider };
})();
`;

// ==================== SAFETY_PAGE_SCRIPT — 页 28 安全和隐私（v8.31 #22⑤⑥） ====================
// 考证链（aosp-mirror main 实拉，2026-10-26）：
//   一级菜单形态门控（二者取其一，A17 手机默认 SafetyCenter 启用）：
//     ①TopLevelSafetyCenterEntryPreferenceController（safetycenter 包实拉）——
//       SafetyCenter.isEnabled → AVAILABLE；点击 = Intent.ACTION_SAFETY_CENTER →
//       PermissionController 包 SafetyCenterActivity（Settings 仓库外）
//     ②TopLevelSecurityEntryPreferenceController（security 包实拉）——
//       SafetyCenter.isEnabled → CONDITIONALLY_UNAVAILABLE（传统「安全」页隐藏）
//   页面骨架 = res/xml/security_dashboard_settings.xml（3074B 全文实拉，SafetyCenter
//   关闭时 SecuritySettings.getPreferenceScreenResId 权威；PermissionController 镜像
//   404×3 不可达，合流页按 Settings 侧 XML 呈现 + #22⑤「卡片可虚构」许可留痕）：
//     security_status(order -10) → dashboard_tile_placeholder(order 1) →
//     security_category(order 10) → security_advanced_settings(order 100)
//   文案 = values-zh-rCN/strings.xml 实拉权威值：safety_center_title「安全和隐私」/
//   safety_center_summary「应用安全性、设备锁定、权限」/ security_status_title「安全状态」/
//   lock_settings_title「设备安全性」/ unlock_set_unlock_launch_picker_title「屏幕锁定」/
//   security_advanced_settings「更多安全设置」/ security_dashboard_summary
//   「屏幕锁定、查找我的设备、应用安全性」（security 一级项 sub 权威值）
//   硬件门控零虚构：指纹/人脸解锁/人脸解锁和指纹解锁三行 =
//   FingerprintStatusPreferenceController/FaceStatusPreferenceController/
//   CombinedBiometricStatusPreferenceController → isFingerprintHardwareDetected /
//   isFaceHardwareDetected 硬件检测 → Web 无生物识别硬件 → 隐藏注记
//   （v8.01 SIM 门控 + v8.30 结构性配置零虚构同律）
//   交互：重新扫描 = 确定性扫描 toast（#22⑤「可虚构安全状态+权限扫描结果」许可）；
//   权限使用行 → 页 5 隐私（权限管理真数据源——v8.30 勿扰→页 9 映射同律）
//   幂等守卫 window.__settingsSafetyV831（v8.26/v8.30 同律）。
const SAFETY_PAGE_SCRIPT = `
(function(){
  if (window.__settingsSafetyV831) return;
  window.__settingsSafetyV831 = true;
  function toast(msg) {
    if (window.showSystemToast) window.showSystemToast(msg);
  }
  function rescan() {
    var btn = document.getElementById('safetyRescanBtn');
    if (btn) { btn.style.pointerEvents = 'none'; btn.style.opacity = '0.5'; }
    setTimeout(function() {
      if (btn) { btn.style.pointerEvents = ''; btn.style.opacity = ''; }
      toast('扫描完成，未发现安全问题'); // #22⑤ 许可：虚构安全扫描结果（确定性）
    }, 800);
  }
  function toastLock() {
    toast('屏幕锁定方式选择后续版本转正'); // ChooseLockGeneric Web 等价提示（v8.30 toastAddMode 同律）
  }
  function toastAdvanced() {
    toast('更多安全设置页后续版本转正'); // SecurityAdvancedSettings Web 等价提示
  }
  window.__settingsSafetyV831 = { rescan: rescan, toastLock: toastLock, toastAdvanced: toastAdvanced };
})();
`;

// ==================== APPS_PAGE_SCRIPT — 页 6 应用（v8.05 #23 差距矩阵③ apps.xml 1:1） ====================
// AppsPreferenceController 语义内联脚本：
//   ① all_app_infos XOR recent_apps_category 运行时互斥（loadRecentApps 非空 →
//      渲染最近区 + 隐藏 all_app_infos；空 → 仅 all_app_infos）——refreshUi() 同构
//   ② 最近区 ≤4 行（SHOW_RECENT_APP_COUNT=4；loadRecentApps 的 appEntry==null continue
//      语义 = 桌面已卸载的 id 从最近列表剔除），行=AppPreference 图标+应用名
//   ③ see_all_apps 标题动态替换（loadAllAppsCount → see_all_apps_title ICU 复数
//      「查看所有 N 个应用」/单数「查看所有应用」）
//   ④ all_app_infos 摘要 apps_summary「已安装 N 个应用」（InstalledAppCounter 拍平计数）
//   ⑤ default_apps 动态摘要 getSummary=RoleManager 三角色标签 ListFormatter 连接
//      （浏览器(Safari)/电话/信息 在模拟环境均可解析；zh CLDR 标准表 = 「A、B和C」）
//   ⑥ hibernated_apps 动态摘要 unused_apps_summary「N 个闲置应用」（zh 复数两分支同值；
//      PermissionControllerManager.getUnusedAppCount 模拟映射 = 已安装去重集合 −
//      getRecentAppsList 交集）
const APPS_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            function esc(s) {
              return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
            }
            // InstalledAppCounter 同构：pagesApps 拍平（folder.apps 成员计入）+ id 去重
            function registry() {
              var map = {};
              var st = window.__state;
              if (st && Array.isArray(st.pagesApps)) {
                st.pagesApps.forEach(function(page) {
                  (page || []).forEach(function(a) {
                    if (!a || !a.id || map[a.id]) return;
                    if (a.type === 'folder') {
                      (a.apps || []).forEach(function(x) { if (x && x.id && !map[x.id]) map[x.id] = x; });
                      return;
                    }
                    map[a.id] = a;
                  });
                });
              }
              return map;
            }
            // ListFormatter.getInstance().format(zh) 同构：2 项「A和B」、3+ 项「A、B和C」
            function zhList(arr) {
              if (!arr.length) return '';
              if (arr.length === 1) return arr[0];
              return arr.slice(0, -1).join('、') + '和' + arr[arr.length - 1];
            }
            function render() {
              var cat = document.getElementById('appsRecentCategory');
              var box = document.getElementById('appsRecentList');
              var allRow = document.getElementById('appsAllInfoRow');
              var seeAll = document.getElementById('appsSeeAllTitle');
              var allSub = document.getElementById('appsAllInfoSub');
              var defSub = document.getElementById('appsDefaultSub');
              var unusedSub = document.getElementById('appsUnusedSub');
              if (!cat || !box || !allRow) return;
              var map = registry();
              var ids = Object.keys(map);
              var recentAll = (window.__settingsAppsBridge && window.__settingsAppsBridge.recent() || [])
                .filter(function(id) { return !!map[id]; }); // appEntry == null → continue 同构
              var shown = recentAll.slice(0, 4); // SHOW_RECENT_APP_COUNT = 4
              if (shown.length) {
                cat.style.display = '';
                allRow.style.display = 'none';
                box.innerHTML = shown.map(function(id) {
                  var app = map[id];
                  return '<div class="md3-list-item" role="button" tabindex="0" data-test="apps-recent-row" data-app-id="' + esc(id) + '" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">' +
                    '<span style="width:40px;height:40px;border-radius:11px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(id) + '</span>' +
                    '<span style="flex:1;min-width:0;font-size:15px;color:var(--md-on-surface,#e2e2e9);">' + esc(app.name || id) + '</span>' +
                    '</div>';
                }).join('');
                // loadAllAppsCount：see_all_apps_title ICU 复数（zh：=1 无计数，other 带 # ）
                if (seeAll) seeAll.textContent = ids.length === 1 ? '查看所有应用' : '查看所有 ' + ids.length + ' 个应用';
              } else {
                // 空态分支：仅 all_app_infos + apps_summary
                cat.style.display = 'none';
                allRow.style.display = '';
                if (allSub) allSub.textContent = '已安装 ' + ids.length + ' 个应用';
              }
              // DefaultAppsPreferenceController.getSummary：RoleManager 浏览器/拨号器/短信
              // 三角色依序取标签，空标签跳过（TextUtils.isEmpty 判空同构）后 ListFormatter 连接
              if (defSub) {
                var roleIds = ['safari', 'phone', 'msg'];
                var labels = roleIds.map(function(id) { return map[id] && map[id].name; })
                  .filter(function(n) { return !!n; });
                defSub.textContent = labels.length ? zhList(labels) : '';
              }
              // HibernatedAppsPreferenceController：unused_apps_summary「N 个闲置应用」
              // （模拟映射 = 已安装集合 − 最近使用记录全集交集，含未进前 4 的记录）
              if (unusedSub) {
                var recentSet = {};
                recentAll.forEach(function(id) { recentSet[id] = 1; });
                var unused = ids.filter(function(id) { return !recentSet[id]; }).length;
                unusedSub.textContent = unused + ' 个闲置应用';
              }
            }
            render();
            // 实例常驻内存：重新激活子页时重估（updateState → refreshUi 同构；
            // 开窗 650ms defer 记录后回设置页可见最新最近序）
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 6) render();
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
      title: '显示',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">显示</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">亮度、深色主题、自动锁屏（AOSP DisplaySettings）</div>
          <!-- ① category_name_brightness「亮度」（order -200） -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">亮度</div>
          <!-- preference_key_brightness_level：RestrictedPreference（userRestriction
              no_config_brightness）+ BrightnessLevelPreferenceController getAvailabilityStatus
              AVAILABLE；内嵌 SeekBar 滑条 widget 语义；单一真源 = window.__qsBrightness 桥
              （QS 亮度滑条 body.filter 全库唯一消费链，v8.04 quick-settings.js 挂桥） -->
          <div class="md3-list-item" data-test="dsp-brightness" style="min-height:76px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:15px;">亮度</span>
                <span id="dspBriVal" style="font-size:13px;color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">80%</span>
              </div>
              <div class="md3-slider" id="dspBriSlider" style="margin-top:6px;">
                <div class="md3-slider-line"></div>
                <div class="md3-slider-fill" id="dspBriFill"></div>
                <div class="md3-slider-thumb" id="dspBriThumb"></div>
              </div>
            </div>
          </div>
          <!-- screen_brightness_mode：PrimarySwitchPreference +
              AutoBrightnessPreferenceController config_automatic_brightness_available=false
              （frameworks core/res res/values/config.xml:500）→ UNSUPPORTED_ON_DEVICE 隐藏注记
              （注记：Pixel 真机 overlay 置 true 属设备差异；项目证据链以 core/res 权威默认为准） -->
          <!-- even_dimmer_activated：EvenDimmerPreferenceController Flags.evenDimmer 无 default
              （aconfig 判活规则=默认 false）&& config_evenDimmerEnabled=false 双证
              （v8.02 同链）→ UNSUPPORTED_ON_DEVICE 隐藏注记；RBC 极暗为取代语义（页 20） -->
          <!-- ② category_name_lock_display「锁定显示屏」（order -190） -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">锁定显示屏</div>
          <!-- lockscreen_from_display_settings：Preference + LockScreenPreferenceController
              （security.screenlock 包）getAvailabilityStatus AVAILABLE；动态摘要 =
              LockScreenNotificationPreferenceController.getSummaryResource 默认链
              （LOCK_SCREEN_SHOW_NOTIFICATIONS 默认开 + allowPrivate 默认真）→
              lock_screen_notifications_summary_show「显示所有通知内容」（v8.01 页 19 同链同值）；
              fragment=LockscreenDashboardFragment 子页未转正，忠实入口行 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="dsp-lockscreen" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">锁定的屏幕</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">显示所有通知内容</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- fold_lock_behavior：FoldLockBehaviorPreferenceController
              isFoldLockBehaviorAvailable 折叠形态专用（FOLD_LOCK_BEHAVIOR 设置仅可折叠设备）
              → UNSUPPORTED_ON_DEVICE 隐藏注记（手机形态） -->
          <!-- screen_timeout：RestrictedPreference + ScreenTimeoutPreferenceController
              getAvailabilityStatus AVAILABLE；XML summary=summary_placeholder 但 updateState
              setSummary(getTimeoutSummary) 动态覆盖：screen_timeout_summary「闲置 %1$s后」；
              默认 def_screen_off_timeout=60000（SettingsProvider defaults.xml）→「闲置 1 分钟后」；
              store 真源 settings:display-v1（锁屏自动休眠消费点排期 v8.05+）；
              fragment=ScreenTimeoutSettings 子页未转正，忠实入口行 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="dsp-timeout" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">自动锁屏</span><span id="dspTimeoutSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">闲置 1 分钟后</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- ③ category_name_appearance「外观」（order -180） -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">外观</div>
          <!-- dark_ui_mode：DarkModePreference extends PrimarySwitchPreference（主开关行，
              android:widgetLayout=@null 为 widget 清空非开关移除）+ DarkUIPreferenceController
              getAvailabilityStatus AVAILABLE；动态摘要 AutoDarkTheme.getStatus 默认
              MODE_NIGHT_NO → dark_ui_summary_on/off_auto_mode_never
              「一律不自动关闭」/「永不自动开启」；单一真源 = __settingsTheme（QS 深色磁贴同向） -->
          <div class="md3-list-item" data-test="dsp-dark" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">深色主题</span><span id="dspDarkSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">永不自动开启</span></span>
            <label class="md3-switch"><input type="checkbox" id="dspDarkToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- text_reading_options：Preference + TextReadingFragmentForDisplaySettingsController
              （基类 TextReadingFragmentBaseController AVAILABLE）；fragment=
              TextReadingPreferenceFragment —— 项目内合法映射 = 页 20（无障碍功能，v8.02 已转正
              同款行），__tpNav 跳转 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="dsp-text-reading" onclick="__tpNav(this,20)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;cursor:pointer;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">显示大小和文字</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- ④ category_name_color「颜色」（order -170）：三项全门控隐藏 → 整区隐藏注记 -->
          <!-- night_display：PrimarySwitchPreference + NightDisplayPreferenceController
              isNightDisplayAvailable=config_nightDisplayAvailable=@bool/
              config_setColorTransformAccelerated=false（core/res:913/922 同链双证）
              → UNSUPPORTED_ON_DEVICE 隐藏注记（注记：Pixel 真机 overlay 置 true 护眼模式
              属设备差异；项目证据链以 core/res 权威默认为准） -->
          <!-- color_mode：ColorModePreferenceController isDeviceColorManaged
              （ro.display.color.managed 运行时设备属性，项目模拟设备未声明）→
              DISABLED_FOR_USER（isAvailable 白名单外）隐藏注记 -->
          <!-- color_contrast：ContrastPreferenceController
              Flags.enableColorContrastControl（aconfig accessibility_flags 无 default 行
              =默认 false）→ UNSUPPORTED_ON_DEVICE 隐藏注记 -->
          <!-- ⑤ category_name_display_controls「显示控制」（order -150） -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">显示控制</div>
          <!-- auto_rotate：SwitchPreferenceCompat + AutoRotatePreferenceController
              getAvailabilityStatus = RotationPolicy.isRotationLockToggleVisible &&
              !DeviceStateAutoRotationHelper.isDeviceStateRotationEnabled → AVAILABLE
              （手机形态旋转锁可见、非折叠设备态自动旋转）；单一真源 = QS autorotate 磁贴
              （__qsTileState.get/sync，v7.99 飞行模式同款接线） -->
          <div class="md3-list-item" data-test="dsp-rotate" style="min-height:56px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;font-size:15px;">自动旋转屏幕</span>
            <label class="md3-switch"><input type="checkbox" id="dspRotateToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- device_state_auto_rotate：DeviceStateAutoRotateOverviewController
              isDeviceStateRotationEnabled 折叠形态专用 → UNSUPPORTED_ON_DEVICE 隐藏注记
              （与 auto_rotate 二者取其一，手机形态取标准旋转开关） -->
          <!-- screen_resolution：ScreenResolutionController checkSupportedResolutions
              运行时多分辨率显示模式（项目模拟设备单一分辨率形态）→ UNSUPPORTED_ON_DEVICE
              隐藏注记（注记：Pixel 9 Pro 多分辨率形态属设备差异） -->
          <!-- display_white_balance：DisplayWhiteBalancePreferenceController
              isDisplayWhiteBalanceAvailable=config_displayWhiteBalanceAvailable=false
              （core/res:1004）→ DISABLED_FOR_USER（isAvailable 白名单外）隐藏注记 -->
          <!-- peak_refresh_rate：PeakRefreshRatePreferenceController
              config_show_smooth_display=false（Settings 仓库 res/values/config.xml:571）
              → UNSUPPORTED_ON_DEVICE 隐藏注记（「流畅画面」行未过第一道门控） -->
          <!-- show_operator_name：ShowOperatorNamePreferenceController CarrierConfig
              KEY_SHOW_OPERATOR_NAME_IN_STATUSBAR_BOOL 默认 false（controller 默认参数）→
              不可用隐藏注记 -->
          <!-- screensaver：Preference + ScreenSaverPreferenceController
              Utils.areDreamsAvailableToCurrentUser（config_dreamsEnabledByDefault=true 默认可用）；
              动态摘要 DreamSettings.getSummaryTextFromBackend = screensaver_settings_summary_on
              「已开启 / %1$s」+ config_dreamsDefaultComponent=
              com.android.deskclock/com.android.deskclock.Screensaver →「已开启 / 时钟」；
              fragment=DreamSettings 子页未转正，忠实入口行 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="dsp-screensaver" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">屏保</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">已开启 / 时钟</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- camera_gesture：CameraGesturePreferenceController isAvailable
              =config_cameraLaunchGestureSensorType != -1，core/res:4253 = -1 →
              不可用隐藏注记（「扭转两次即可打开相机」） -->
          <!-- lift_to_wake：LiftToWakePreferenceController isAvailable
              =SensorManager.getDefaultSensor(TYPE_WAKE_GESTURE) != null；TYPE_WAKE_GESTURE
              为 legacy 传感器（Pixel 2+ 设备形态未声明 wake_gesture 特性）→ 不可用隐藏注记
              （「拿起设备时唤醒」，类比 v8.02 实体键盘形态裁决） -->
          <!-- tap_to_wake：TapToWakePreferenceController isAvailable
              =config_supportDoubleTapWake=false（core/res:4103）→ 不可用隐藏注记（「点按唤醒」） -->
          <!-- theme：ListPreference(device_theme) + ThemePreferenceController isAvailable
              =OverlayManager 可用主题数 > 1（AOSP 通用形态仅内置单主题）→ 不可用隐藏注记 -->
          <!-- vr_display_pref：VrDisplayPreferenceController isAvailable
              =pm.hasSystemFeature(FEATURE_VR_MODE_HIGH_PERFORMANCE)（A17 已移除 VR 高性能
              模式特性）→ 不可用隐藏注记（「当设备处于 VR 模式时」） -->
        </div>
        <script>` + DISPLAY_PAGE_SCRIPT + `</script>`,
    },
    {
      title: '电池',
      // ==================== v8.06 #23 差距矩阵④回审计（power_usage_summary.xml 1:1） ====================
      // AOSP aosp-mirror/platform_packages_apps_settings main 实源实拉：
      //   fragment = fuelgauge/batteryusage/PowerUsageSummary.java
      //     getPreferenceScreenResId = R.xml.power_usage_summary
      //     onAttach use(BatteryHeaderTextPreferenceController + BatteryTipPreferenceController)
      // XML 9 keys 按 PowerUsageSummary.java 声明序（#23 议题口径 10 keys 系含 battery_help_message
      // 布局注释行，XML 全文核对实为 9 keys）：
      //   battery_header → battery_header_text → battery_help_message(隐藏) → battery_tip →
      //   battery_usage_summary → battery_saver_summary → smart_battery_manager →
      //   status_bar_show_battery_percent → power_usage_footer
      // controller 门控（6 controller 实拉 + 4 项决定性 config/feature 实证）：
      //   - battery_header：BatteryHeaderPreferenceController AVAILABLE_UNSEARCHABLE；
      //     displayPreference setBottomSummary("")（进度条底部摘要置空）；
      //     !Utils.isBatteryPresent() 才 setVisible(false)（Web 虚拟电池恒存在，v7.99 口径）
      //   - battery_header_text：BatteryHeaderTextPreferenceController
      //     AVAILABLE_UNSEARCHABLE；generateLabel 十分支链 → settings-battery.js
      //     generateHeaderLabel() 同构（充电态 battery_state_and_duration「正在充电 • 充电剩余
      //     时间：X」/充满「已充满电」/省电「省电模式已开启 • 还可用：X」/低电量「电池电量低 •
      //     还可用：X」/放电「还可用：X」/remainingLabel 缺失→statusLabel「未在充电」）
      //   - battery_help_message：PowerUsageSummary.initPreference mHelpPreference
      //     setVisible(false) 默认隐藏，仅 !Utils.isBatteryPresent() 分支显示 →
      //     Web 虚拟电池恒存在 → 恒隐藏注记（preference_battery_error 布局不渲染）
      //   - battery_tip：BatteryTipPreferenceController displayPreference 注释实证
      //     「Set preference as invisible since there is no default tips」默认隐藏；
      //     LowBatteryDetector.detect：dischargingLowBatteryState = discharging &&
      //     batteryLevel <= mWarningLevel（config_low_battery_warning_level=15），
      //     lowBatteryEnabled = policy.lowBatteryEnabled(DeviceConfig 默认 true) &&
      //     !isPowerSaveMode；LowBatteryTip title/summary = battery_tip_low_battery_title
      //     「电池电量低」/battery_tip_low_battery_summary「开启省电模式可延长电池续航时间」；
      //     点击 → BatterySaverAction（开启省电模式，Web 真实联动 quick-settings 单一真源）
      //   - battery_usage_summary：PowerUsageSummary.initPreference 摘要 =
      //     advanced_battery_preference_summary；可见性 = isBatteryUsageEnabled()
      //     → PowerUsageFeatureProviderImpl 默认实现 return true → 恒渲染；
      //     fragment=PowerUsageAdvanced 子页未转正，忠实入口行
      //   - battery_saver_summary：BatterySaverController AVAILABLE；getSummary 四分支：
      //     isPowerSaveMode→battery_saver_on_summary「已开启」；
      //     AUTOMATIC_POWER_SAVE_MODE=TRIGGER_PERCENTAGE && percent!=0→
      //     battery_saver_off_scheduled_summary「将在电量剩余 %s 时开启」（Web 无排程
      //     percent=0 不触发）；percent=0→battery_saver_off_summary「已关闭」；
      //     else→battery_saver_pref_auto_routine_summary「将会按照您的日常安排启用」
      //     （Web 无 routine 不触发）。AOSP 为 Preference 行跳转 BatterySaverSettings
      //     子页（含排程），Web 行内 md-switch 合法超越（省电 toggle 与 QS 磁贴双向同步
      //     既有单一真源链，铁律#2 真实功能零丢失）
      //   - smart_battery_manager：BatteryManagerPreferenceController 门控链 =
      //     !isBatteryManagerSupported()（Impl 默认 return true，不触发 UNSUPPORTED）→
      //     !config_battery_manager_consider_ac（Settings res/values/config.xml:782=false）
      //     → AVAILABLE_UNSEARCHABLE 短路（adaptive 分支不达）；摘要 updateSummary
      //     （!mEnableAppBatteryUsagePage=config_app_battery_usage_list_enabled=false
      //     Settings:737 分支）restrictedNum=0 → isAdaptiveChargingSupported()（Impl
      //     默认 false）→ battery_manager_summary_unsupported「检测应用大量消耗电池
      //     电量的情况」；fragment=SmartBatterySettings 子页未转正，忠实入口行
      //   - status_bar_show_battery_percent：BatteryPercentagePreferenceController 门控 =
      //     isBatteryPresent && config_battery_percentage_setting_available
      //     （frameworks core/res res/values/config.xml:5222=true）→ AVAILABLE；
      //     默认值 config_defaultBatteryPercentageSetting（frameworks:5225=false）——
      //     iOS 状态栏 pill 百分比为视觉核心（Web 现状常显）→ 默认取 Web 现状=显示，
      //     config 差异注记（合法超越）；消费点 status-bar.js .battery-pct 显隐
      //     （System.SHOW_BATTERY_PERCENT 语义映射，store ios-desktop:statusbar-battery-percent）
      //   - power_usage_footer：FooterPreference battery_footer_summary 静态渲染
      // 文案 = values-zh-rCN 权威值逐项实取：电池使用情况/查看自上次充满电后的电池使用情况/
      //   省电模式/已开启/已关闭/电池管理器/检测应用大量消耗电池电量的情况/电池电量百分比/
      //   在状态栏中显示电池电量百分比/剩余电量为大致数据，且可能会因使用情形而变化/
      //   电池电量低/开启省电模式可延长电池续航时间/已充满电（battery_info_status_full）/
      //   充电剩余时间：%1$s（power_charge_remaining）/还可用：%1$s（power_discharge_remaining）；
      //   battery_state_and_duration zh 未翻译回退英文格式「%1$s • %2$s」
      // 图标：XML 全文无 android:icon → AOSP 条目行零图标（v8.04 先例）；
      //   Web 扩展卡图标（speed/battery_charging/water_drop/bolt）为既有 Web 功能保留
      // 「上次充电完成：今天 08:15」写死假数据行移除（v7.48 电池健康假数据同理由）
      content: `<div style="padding:16px 0;text-align:center;">
        <!-- ① battery_header：UsageProgressBarPreference（AVAILABLE_UNSEARCHABLE；
            setBottomSummary("") 底部摘要置空——进度条下不放摘要行，battery_header_text 独立成行）；
            实时单一真源 battery-service（v7.50 拆分管线保留） -->
        <div data-test="battery-header" style="position:relative;display:inline-block;">
          <div id="settingsBatteryPct" style="font-size:56px;font-weight:200;color:var(--md-success,#a8f5bb);font-family:var(--md-font-num);transition:color .4s;">87%</div>
          <span id="settingsBatteryChargeBadge" style="display:none;position:absolute;top:2px;right:-34px;font-size:22px;color:var(--md-primary,#7df8db);">${ICONS.battery_charging}</span>
        </div>
        <div style="max-width:260px;margin:14px auto 0;height:8px;border-radius:99px;background:var(--md-surface-container-high,#353639);overflow:hidden;">
          <div id="settingsBatteryBar" style="width:87%;height:100%;border-radius:99px;background:var(--md-success,#a8f5bb);transition:width .6s cubic-bezier(.2,.8,.2,1),background .4s;"></div>
        </div>
        <!-- ② battery_header_text：BatteryHeaderTextPreference（AVAILABLE_UNSEARCHABLE）；
            generateLabel 链渲染（settings-battery.js generateHeaderLabel 同构） -->
        <div id="settingsBatteryEstimate" data-test="battery-header-text" style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;">还可用：8 小时 45 分钟</div>
        <!-- ③ battery_tip：TipCardPreference 默认隐藏（无默认 tips）；
            LowBatteryDetector 条件渲染：discharging && level<=15 && !isPowerSaveMode；
            点击 → BatterySaverAction 开启省电模式 -->
        <div id="settingsBatteryTipCard" data-test="battery-tip" style="display:none;margin:18px 0 0;padding:14px 18px;border-radius:16px;background:var(--md-error-container,#5c1a1b);cursor:pointer;text-align:left;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-error-container,#f9dedc);">电池电量低</div>
          <div style="font-size:13px;color:var(--md-on-error-container,#f9dedc);opacity:.85;margin-top:2px;">开启省电模式可延长电池续航时间</div>
        </div>
        <div id="settingsBatterySource" style="font-size:11px;color:var(--md-outline,#6a6b6e);margin-top:8px;">数据来源：设备电池（实时）</div>

        <!-- ④⑤⑥⑦ AOSP 条目卡（XML 权威序）：battery_usage_summary → battery_saver_summary →
            smart_battery_manager → status_bar_show_battery_percent -->
        <div class="md3-card" style="padding:4px 0;margin-top:20px;overflow:hidden;text-align:left;">
          <!-- ④ battery_usage_summary：isBatteryUsageEnabled()=true 恒渲染；
              摘要 advanced_battery_preference_summary；
              fragment=PowerUsageAdvanced 子页未转正，忠实入口行 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="battery-usage-summary" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">电池使用情况</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">查看自上次充满电后的电池使用情况</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <!-- ⑤ battery_saver_summary：BatterySaverController AVAILABLE，动态摘要
              getSummary 四分支（settings-battery.js 渲染「已开启/已关闭」）；
              行内 md-switch = Web 合法超越（AOSP 点击跳 BatterySaverSettings 子页，
              Web 直接 toggle 与 QS 磁贴单一真源双向同步） -->
          <div class="md3-list-item" data-test="battery-saver-summary" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">省电模式</span><span id="settingsBatterySaverSummary" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">已关闭</span></span>
            <label class="md3-switch"><input type="checkbox" id="settingsBatterySaverSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <!-- ⑥ smart_battery_manager「电池管理器」：AVAILABLE（isBatteryManagerSupported=true
              + consider_ac=false 短路）；摘要 battery_manager_summary_unsupported；
              fragment=SmartBatterySettings 子页未转正，忠实入口行 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="smart-battery-manager" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">电池管理器</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">检测应用大量消耗电池电量的情况</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <!-- ⑦ status_bar_show_battery_percent「电池电量百分比」：AVAILABLE
              （config_battery_percentage_setting_available=true frameworks:5222）；
              summary=battery_percentage_description；默认显示（config_defaultBatteryPercentageSetting
              =false 的平台差异注记：iOS pill 百分比视觉核心，合法超越）；
              消费点 status-bar.js .battery-pct 显隐 -->
          <div class="md3-list-item" data-test="status-bar-battery-percent" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">电池电量百分比</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">在状态栏中显示电池电量百分比</span></span>
            <label class="md3-switch"><input type="checkbox" id="settingsStatusBarBatteryPercentSwitch" checked><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <!-- ⑧ battery_help_message：PowerUsageSummary.initPreference setVisible(false) 默认隐藏，
            仅 !Utils.isBatteryPresent() 显示 → Web 虚拟电池恒存在 → 恒隐藏注记 -->
        <!-- ⑨ power_usage_footer：FooterPreference battery_footer_summary -->
        <p data-test="power-usage-footer" style="color:var(--md-on-surface-variant,#9a9b9e);font-size:12px;margin-top:16px;text-align:center;">剩余电量为大致数据，且可能会因使用情形而变化</p>

        <!-- ============ Web 扩展区（铁律#2 合法超越：AOSP XML 无对应条目的真实功能保留） ============ -->
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
    // ==================== v8.05 #23 差距矩阵③：应用子页（页 6）回审计转正 ====================
    // 源码考证（aosp-mirror main 实源实拉）：
    //   清单 = res/xml/apps.xml（PreferenceScreen apps_screen，标题 apps_dashboard_title「应用」），
    //   fragment = AppDashboardFragment（getPreferenceScreenResId=R.xml.apps；onAttach use()
    //   注册 AppsPreferenceController + HibernatedAppsPreferenceController），
    //   11 keys/3 分区 按 android:order 权威序：all_app_infos(-999) → recent_apps_category(-998)
    //   [see_all_apps(5)] → general_category(-997) → default_apps(-996) → cloned_apps(-995) →
    //   dashboard_tile_placeholder(10) → contacts_storage(13) → hibernated_apps(15) →
    //   app_battery_usage(17) → special_access(20) → advanced_category(21)[aspect_ratio_apps(22)]
    //   文案 = values-zh-rCN/strings.xml 权威值（应用/所有应用/最近打开的应用/查看所有 # 个应用/
    //   已安装 N 个应用/默认应用/克隆应用/联系人存储/闲置应用/N 个闲置应用/应用的电池使用情况/
    //   特殊应用权限/高级/宽高比（实验性功能））
    //   门控（6 controller 实拉 + 3 项决定性 config 实证）：
    //   - all_app_infos XOR recent_apps_category（AppsPreferenceController SHOW_RECENT_APP_COUNT=4
    //     运行时互斥，见 APPS_PAGE_SCRIPT 注释①-④）
    //   - default_apps：DefaultAppsPreferenceController AVAILABLE 恒真（动态摘要见
    //     APPS_PAGE_SCRIPT 注释⑤）；intent=ACTION_MANAGE_DEFAULT_APPS_SETTINGS
    //     子页未转正忠实入口行
    //   - cloned_apps：DeviceConfig PROPERTY_CLONED_APPS_ENABLED 默认 true &&
    //     config_cloned_apps_page_enabled=false（Settings 仓库 res/values/config.xml:785）
    //     → UNSUPPORTED_ON_DEVICE 隐藏注记
    //   - contacts_storage：Flags.newDefaultAccountApiEnabled=
    //     enable_contacts_default_account_in_settings 无 default 行
    //     （aconfig/settings_contacts_default_account_flag_declarations.aconfig 判活规则=
    //     默认 false）+ 运行时默认账户栈缺失（mCurrentDefaultAccountAndState=null）
    //     双证 → CONDITIONALLY_UNAVAILABLE 隐藏注记
    //   - hibernated_apps：isHibernationEnabled=DeviceConfig NAMESPACE_APP_HIBERNATION
    //     PROPERTY_APP_HIBERNATION_ENABLED 默认 true → AVAILABLE（动态摘要见
    //     APPS_PAGE_SCRIPT 注释⑥）
    //   - app_battery_usage：config_app_battery_usage_list_enabled=false（Settings 仓库
    //     res/values/config.xml:737）→ CONDITIONALLY_UNAVAILABLE 隐藏注记
    //   - special_access：XML 无 settings:controller → 恒渲染；fragment=SpecialAccessSettings
    //     （special_access.xml）子页未转正，忠实入口行
    //   - advanced_category/aspect_ratio_apps：UserAspectRatioManager.isFeatureEnabled=
    //     DeviceConfig KEY_ENABLE_USER_ASPECT_RATIO_SETTINGS 默认 true &&
    //     config_appCompatUserAppAspectRatioSettingsIsEnabled=false（frameworks core/res
    //     res/values/config.xml:6268）→ CONDITIONALLY_UNAVAILABLE；advanced_category 唯一
    //     子项隐藏 → 分类整区隐藏注记
    //   图标：XML 全文仅 see_all_apps 一枚 android:icon=@drawable/ic_chevron_right_24dp
    //   （tint colorControlNormal → currentColor，icons-aosp.js v8.05 增量 appsChevron 键）；
    //   其余行零图标忠实呈现（v8.04 先例）；最近使用行=AppPreference 应用图标（与桌面同源
    //   __getAppIconSVG）；general_category/dashboard_tile_placeholder/advanced_category
    //   三个分区头随门控/空分类隐藏 → 仅「最近打开的应用」分区头渲染
    //   单一真源：window.__settingsAppsBridge.recent() ← recent-apps.js getRecentAppsList
    //   （recordAppOpened 全库唯一最近记录链）；Web 扩展卡保留（铁律#2）：应用管理
    //   （卸载/恢复）——AOSP XML 无对应条目的合法超越，v7.x 真实功能不丢
    {
      // 页 6：应用（AppDashboardFragment 1:1 + Web 扩展卡）
      title: '应用',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">应用</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">最近打开的应用、默认应用、闲置应用（AOSP AppDashboardFragment）</div>
          <!-- ① recent_apps_category（order -998）「最近打开的应用」：AppsPreferenceController
              AVAILABLE_UNSEARCHABLE；与 ② all_app_infos 运行时互斥（refreshUi：最近区非空 →
              渲染本区 + see_all_apps，隐藏 all_app_infos；空 → 反之）；≤4 行
              （SHOW_RECENT_APP_COUNT=4），行=AppPreference 应用图标+名（开窗 650ms defer
              记录链，与桌面最近任务/Dock 同源 __settingsAppsBridge.recent()） -->
          <div id="appsRecentCategory" data-test="apps-recent-category">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">最近打开的应用</div>
            <div id="appsRecentList"></div>
            <!-- see_all_apps（order 5）：标题被 loadAllAppsCount 动态替换为 see_all_apps_title
                ICU 复数「查看所有 N 个应用」（zh =1 分支无计数「查看所有应用」）；
                android:icon=@drawable/ic_chevron_right_24dp（tint colorControlNormal →
                currentColor，icons-aosp.js appsChevron 键）——XML 唯一静态图标行 -->
            <div class="md3-list-item" role="button" tabindex="0" data-test="apps-see-all" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
              <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.appsChevron || ''}</span>
              <span style="flex:1;min-width:0;font-size:15px;" id="appsSeeAllTitle">查看所有应用</span>
            </div>
          </div>
          <!-- ② all_app_infos（order -999）「所有应用」：与最近区运行时互斥的空态分支；
              XML summary=summary_placeholder 忠实空，但 loadAllAppsCount 动态覆盖为
              apps_summary「已安装 N 个应用」（InstalledAppCounter 拍平计数） -->
          <div class="md3-list-item" id="appsAllInfoRow" data-test="apps-all-info" style="min-height:64px;display:none;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">所有应用</span><span id="appsAllInfoSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
          </div>
          <!-- general_category（order -997）「常规」：XML android:visibility="gone" 空分类
              → 隐藏注记（refreshUi 仅在最近区非空时 setVisible(true)，但 XML 无子项渲染为空） -->
          <!-- default_apps（order -996）：DefaultAppsPreferenceController AVAILABLE 恒真；
              动态摘要 getSummary=RoleManager ROLE_BROWSER/ROLE_DIALER/ROLE_SMS 三角色标签
              ListFormatter 连接（zh CLDR「A、B和C」；模拟环境可解析：浏览器/电话/信息）；
              intent=ACTION_MANAGE_DEFAULT_APPS_SETTINGS 子页未转正，忠实入口行 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="apps-default-apps" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">默认应用</span><span id="appsDefaultSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- cloned_apps（order -995）「克隆应用」：ClonedAppsPreferenceController
              getAvailabilityStatus=DeviceConfig(NAMESPACE_APP_CLONING,
              PROPERTY_CLONED_APPS_ENABLED 默认 true) && config_cloned_apps_page_enabled
              → Settings 仓库 res/values/config.xml:785=false → UNSUPPORTED_ON_DEVICE
              隐藏注记（动态摘要 cloned_apps_summary「N 个已克隆，M 个可以克隆」随之隐藏） -->
          <!-- dashboard_tile_placeholder（order 10）：无标题空占位分类 → 隐藏注记 -->
          <!-- contacts_storage（order 13）「联系人存储」：ContactsStoragePreferenceController
              getAvailabilityStatus=Flags.newDefaultAccountApiEnabled() &&
              mCurrentDefaultAccountAndState != null → enable_contacts_default_account_in_settings
              无 default 行（aconfig contacts 声明文件，判活规则=默认 false）+ 模拟环境
              无账户栈双证 → CONDITIONALLY_UNAVAILABLE 隐藏注记 -->
          <!-- hibernated_apps（order 15）「闲置应用」：HibernatedAppsPreferenceController
              getAvailabilityStatus=isHibernationEnabled()=DeviceConfig
              (NAMESPACE_APP_HIBERNATION, PROPERTY_APP_HIBERNATION_ENABLED 默认 true) →
              AVAILABLE；动态摘要 unused_apps_summary ICU 复数「N 个闲置应用」
              （mUnusedCount=PermissionControllerManager.getUnusedAppCount；模拟映射=
              已安装去重集合 − 最近使用记录交集，见 APPS_PAGE_SCRIPT 注释⑥）；
              fragment=ManageApplications(UNUSED_APPS 分支) 子页未转正，忠实入口行 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="apps-hibernated" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">闲置应用</span><span id="appsUnusedSub" style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- app_battery_usage（order 17）「应用的电池使用情况」：
              AppBatteryUsagePreferenceController getAvailabilityStatus=
              mEnableAppBatteryUsagePage=config_app_battery_usage_list_enabled
              → Settings 仓库 res/values/config.xml:737=false →
              CONDITIONALLY_UNAVAILABLE 隐藏注记（摘要 app_battery_usage_summary
              「设置应用如何使用电池」随之隐藏） -->
          <!-- special_access（order 20）「特殊应用权限」：XML 无 settings:controller →
              恒渲染（BasePreferenceController 未注册行不受门控体系管辖）；
              fragment=SpecialAccessSettings（special_access.xml）子页未转正，忠实入口行 -->
          <div class="md3-list-item" role="button" tabindex="0" data-test="apps-special-access" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">特殊应用权限</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- advanced_category（order 21）「高级」：AdvancedAppsPreferenceCategoryController
              children=[aspect_ratio_apps] 唯一子项门控隐藏 → 分类整区隐藏注记；
              aspect_ratio_apps（order 22）「宽高比（实验性功能）」：
              UserAspectRatioAppsPreferenceController getAvailabilityStatus=
              UserAspectRatioManager.isFeatureEnabled=DeviceConfig
              (KEY_ENABLE_USER_ASPECT_RATIO_SETTINGS 默认 true) &&
              config_appCompatUserAppAspectRatioSettingsIsEnabled → frameworks core/res
              res/values/config.xml:6268=false → CONDITIONALLY_UNAVAILABLE 隐藏注记
              （动态摘要 aspect_ratio_summary_text 带 Build.MODEL 随之隐藏） -->
          <!-- ==================== Web 扩展卡（铁律#2 合法超越） ====================
              AOSP apps.xml 无「卸载/恢复」对应条目 —— 本卡为 v7.x 既有真实功能的保留区
              （postMessage uninstall/restore 链 + 文件夹成员 __settingsFolderUninstall 桥，
              fix(audit-E) 递归展开），非 AOSP 1:1 范畴，特此标注 -->
          <div data-test="apps-mgmt" style="margin-top:18px;">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 6px;">应用管理<span style="margin-left:8px;font-size:11px;padding:2px 8px;border-radius:999px;background:var(--md-secondary-container,#e8def8);color:var(--md-on-secondary-container,#1d192b);vertical-align:middle;">Web 扩展 · 合法超越</span></div>
            <div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);margin:0 12px 12px;">卸载将从桌面移除应用（可随时恢复）；系统应用不可卸载</div>
            <div id="installedAppsList" style="padding:0 4px;"></div>
            <div id="appMgmtRemovedSection" style="padding:0 4px;"></div>
          </div>
        </div>
        <script>` + APPS_PAGE_SCRIPT + `</script>
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
        </script>`,
    },
    {
      // 页 7：存储空间占用 —— v8.09 #23 差距矩阵⑤回审计 1:1 转正
      // 考证链（aosp-mirror/platform_packages_apps_settings main 实源实拉）：
      //   res/xml/storage_dashboard_fragment.xml 17 keys / order 1→204：
      //     storage_spinner(1)[StorageSelectionPreferenceController AVAILABLE_UNSEARCHABLE，
      //       displayPreference mSpinnerPreference.setVisible(mStorageAdapter.getCount()>1)
      //       →单卷设备隐藏] / storage_summary(2)[UsageProgressBarPreference+
      //       StorageUsageProgressBarPreferenceController] / toggle_asm(3)[PrimarySwitch+
      //       AutomaticStorageManagementSwitchPreferenceController：getAvailabilityStatus=
      //       !config_show_smart_storage_toggle→UNSUPPORTED_ON_DEVICE（config.xml=true 过门控）
      //       +!isLowRamDevice→AVAILABLE；fragment=AutomaticStorageManagerSettings，icon=ic_storage]
      //       / free_up_space(4)[CardPreference+ManageStoragePreferenceController：
      //       mManageStorageDrawable=StorageUtils.getManageStorageIcon 解析失败→
      //       CONDITIONALLY_UNAVAILABLE；zh 摘要「前往谷歌文件极客应用管理和释放空间」]
      //       / pref_public_storage(100)文件+pref_images(101)图片+pref_videos(102)视频+
      //       pref_audio(103)音频+pref_apps(104)应用+pref_games(105)游戏+pref_documents(106)
      //       文档+pref_other(107)其他+pref_trash(108)回收站[StorageItemPreference 由
      //       StorageItemPreferenceController 统一管理，StorageAsyncLoader.handleResult 填大小]
      //       / storage_category_splitter(201)「系统」分类[pref_system(202)「Android %s」+
      //       temporary_files(203)「临时系统文件」] / pref_non_current_users(204)「其他用户」
      //       [NonCurrentUserController.getNonCurrentUserControllers 空列表→分类不渲染]
      //   fragment=StorageDashboardFragment.java（deviceinfo/ 包，getPreferenceScreenResId=
      //   R.xml.storage_dashboard_fragment；onCreate 注册 StorageItemPreferenceController+
      //   NonCurrentUserController；StorageAsyncLoader 按所选卷加载分类大小）
      //   zh-rCN 权威值：存储空间/释放空间/前往谷歌文件极客应用管理和释放空间/文件/图片/视频/
      //   音频/应用/游戏/文档/其他/回收站/系统/Android %s/临时系统文件/其他用户/存储空间管理器/
      //   已使用 %1$s - 还剩 %2$s
      // Web 真实数据单一真源：summary=window.__storageStats.collect()（navigator.storage.estimate
      // 实测 usage/quota）；分类=window.__vfs.usage()/usageByType()（v8.09 新增 mime 前缀聚合）
      // + byOwner 应用归属聚合（VFS 键归 files 不双计）；游戏/回收站=0（无对应数据域，忠实 0 值）。
      // 既有 Web 扩展卡保留（铁律#2）：localStorage/IDB 双卡+按应用归属+TopKeys=真实统计不丢失。
      title: '存储空间',
      content: `<div style="padding:16px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);">AOSP 权威结构 + localStorage/IndexedDB/VFS 真实统计</div>
          <button id="storageRefreshBtn" class="md3-btn md3-btn-tonal" style="padding:6px 16px;font-size:13px;flex-shrink:0;">重新统计</button>
        </div>
        <div id="storageAosp" data-test="storage-aosp"></div>
        <div id="storageOverview"></div>
        <div id="storageByOwner"></div>
        <div id="storageTopKeys"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(t, f, o); };
            var aosp = document.getElementById('storageAosp');
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
            // AOSP 权威骨架（静态一次注入；大小/百分比动态回填）
            aosp.innerHTML =
              /* storage_summary(2)：UsageProgressBarPreference 等价 */
              '<div class="md3-card" data-test="storage-summary" style="padding:18px 18px 14px;margin-bottom:12px;">' +
                '<div style="font-size:34px;font-weight:700;color:var(--md-on-surface,#e2e2e9);line-height:1.1;"><span id="stgSummaryPct">--</span></div>' +
                '<div id="stgSummaryBar" style="margin-top:10px;"></div>' +
                '<div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:8px;" id="stgSummaryLine">正在统计…</div>' +
              '</div>' +
              /* storage_spinner(1)：单卷隐藏注记（setVisible(getCount()>1) 门控实拉） */
              '<div class="theme-section-hint" data-test="storage-spinner-note" style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin:0 4px 10px;opacity:0.8;line-height:1.6;">' +
                '存储选择器（storage_spinner）：本机为单一内置卷，多卷选择不适用——AOSP 单卷设备 setVisible(false) 同构，注记呈现。</div>' +
              /* toggle_asm(3)：存储空间管理器（PrimarySwitch；Web 无 Storage Manager 备份后端→开关禁用注记） */
              '<div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:12px;">' +
                '<div class="md3-list-item" data-test="storage-asm" style="cursor:default;">' +
                  '<div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgStorage || ''}</div>' +
                  '<span class="md3-list-item-text">存储空间管理器' +
                    '<span style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;line-height:1.5;">自动释放空间（Web 形态无备份后端，忠实呈现不可用）</span>' +
                  '</span>' +
                  '<label class="md3-switch"><input type="checkbox" id="stgAsmSwitch" disabled><span class="slider"><span class="thumb"></span></span></label>' +
                '</div>' +
              '</div>' +
              /* free_up_space(4)：CardPreference → Web 真实跳转内建文件应用（AOSP 跳文件极客） */
              '<div class="md3-card md3-card-elevated" data-test="storage-free-up" id="stgFreeUpBtn" role="button" tabindex="0" style="padding:14px 18px;margin-bottom:14px;cursor:pointer;">' +
                '<div style="font-size:14px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">释放空间</div>' +
                '<div style="font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;">前往文件应用管理和释放空间</div>' +
              '</div>' +
              /* 分类 9 行（StorageItemPreference；icon 逐 path 实证 icons-aosp stg* 键） */
              '<div class="md3-card" data-test="storage-categories" style="padding:4px 0;overflow:hidden;margin-bottom:12px;">' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgFolder || ''}</div><span class="md3-list-item-text">文件<span data-test="stg-size-files" id="stgSizeFiles" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgPhoto || ''}</div><span class="md3-list-item-text">图片<span id="stgSizeImages" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgMovies || ''}</div><span class="md3-list-item-text">视频<span id="stgSizeVideos" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgAudio || ''}</div><span class="md3-list-item-text">音频<span id="stgSizeAudio" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgApps || ''}</div><span class="md3-list-item-text">应用<span id="stgSizeApps" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgGames || ''}</div><span class="md3-list-item-text">游戏<span id="stgSizeGames" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgFolder || ''}</div><span class="md3-list-item-text">文档<span id="stgSizeDocuments" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgCategory || ''}</div><span class="md3-list-item-text">其他<span id="stgSizeOther" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgTrash || ''}</div><span class="md3-list-item-text">回收站<span id="stgSizeTrash" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
              '</div>' +
              /* storage_category_splitter(201)「系统」：pref_system + temporary_files */
              '<div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 4px 8px;" data-test="storage-system-label">系统</div>' +
              '<div class="md3-card" data-test="storage-system" style="padding:4px 0;overflow:hidden;margin-bottom:12px;">' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgAndroid || ''}</div><span class="md3-list-item-text">Android 17<span id="stgSizeSystem" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
                '<div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>' +
                '<div class="md3-list-item" style="cursor:default;"><div class="md3-list-item-icon" style="color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">${AOSP_ICONS.stgDatabase || ''}</div><span class="md3-list-item-text">临时系统文件<span id="stgSizeTemp" style="display:block;font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:3px;">…</span></span></div>' +
              '</div>' +
              /* pref_non_current_users(204)：单用户空分类注记 */
              '<div class="theme-section-hint" data-test="storage-other-users-note" style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin:0 4px 12px;opacity:0.8;line-height:1.6;">' +
                '其他用户（pref_non_current_users）：本机为单用户形态，NonCurrentUserController 返回空列表分类不渲染（AOSP 多用户设备才显示），注记呈现。</div>';
            // 释放空间卡 → 内建文件应用（AOSP 跳「文件极客」，OPEN_APP 深链语义）
            var freeUp = document.getElementById('stgFreeUpBtn');
            if (freeUp) {
              var openFiles = function() {
                try { window.postMessage({ type: 'OPEN_APP', appId: 'files' }, '*'); } catch (e) {}
                try { window.parent.postMessage({ type: 'OPEN_APP', appId: 'files' }, '*'); } catch (e) {}
              };
              freeUp.addEventListener('click', openFiles);
              freeUp.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFiles(); }
              });
            }
            function fill(id, text) {
              var el = document.getElementById(id);
              if (el && el.isConnected) el.textContent = text;
            }
            function render() {
              if (!window.__storageStats) {
                ov.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">统计服务尚未就绪</div>';
                return;
              }
              ov.innerHTML = '<div style="text-align:center;padding:26px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">'
                + '<span id="storageStatLoader" style="display:inline-block;vertical-align:middle;width:26px;height:26px;color:var(--md-primary,hsl(var(--md-h,215) 80% 60%));"></span>'
                + '<span style="vertical-align:middle;margin-left:8px;">正在统计…</span></div>';
              var statLoaderBox = document.getElementById('storageStatLoader');
              if (statLoaderBox && window.__m3eLoader) window.__m3eLoader.mount(statLoaderBox, { size: 26 });
              byOwnerBox.innerHTML = '';
              topBox.innerHTML = '';
              window.__storageStats.collect().then(function(s) {
                var usage = s.idb.usage || 0, quota = s.idb.quota || 0;
                var remain = Math.max(0, quota - usage);
                var pct = quota ? Math.round(usage / quota * 100) : 0;
                // storage_summary 行：已使用 %1$s - 还剩 %2$s（zh 模板）+ 大百分比 + 进度条
                fill('stgSummaryPct', pct + '%');
                fill('stgSummaryLine', '已使用 ' + fmt(usage) + ' - 还剩 ' + (quota ? fmt(remain) : '未知'));
                var barBox = document.getElementById('stgSummaryBar');
                if (barBox && barBox.isConnected) barBox.innerHTML = bar(quota ? usage / quota * 100 : 0, 215);
                // 分类行（真实数据：VFS mime 聚合 + byOwner 归属；VFS 键归 files 不双计）
                var vfsU = (window.__vfs && window.__vfs.usage) ? window.__vfs.usage() : { bytes: 0 };
                var byT = (window.__vfs && window.__vfs.usageByType) ? window.__vfs.usageByType() : { image: 0, video: 0, audio: 0, document: 0, other: 0 };
                var sysBytes = 0, appBytes = 0;
                (s.byOwner || []).forEach(function(o) {
                  if (o.owner === '__system') sysBytes += o.bytes;
                  else if (o.owner !== '__other' && o.owner !== 'files') appBytes += o.bytes;
                });
                var otherBytes = Math.max(0, usage - (vfsU.bytes || 0) - appBytes - sysBytes);
                fill('stgSizeFiles', fmt(vfsU.bytes || 0) + ' · ' + (vfsU.files || 0) + ' 个文件');
                fill('stgSizeImages', fmt(byT.image));
                fill('stgSizeVideos', fmt(byT.video));
                fill('stgSizeAudio', fmt(byT.audio));
                fill('stgSizeApps', fmt(appBytes));
                fill('stgSizeGames', fmt(0));      // 无游戏媒体数据域 → 忠实 0 值
                fill('stgSizeDocuments', fmt(byT.document));
                fill('stgSizeOther', fmt(otherBytes));   // 配额域剩余（含壁纸/字体以外的未归类）
                fill('stgSizeTrash', fmt(0));      // VFS 无回收站实现 → 忠实 0 值
                fill('stgSizeSystem', fmt(sysBytes));    // __system 归属（壁纸/字体/系统键）
                fill('stgSizeTemp', fmt(byT.other));     // VFS 未分类mime → 临时文件口径注记
                // ---- 以下 Web 扩展卡（铁律#2 保留） ----
                var idbPct = s.idb.quota ? Math.min(100, (s.idb.usage / s.idb.quota) * 100) : 0;
                ov.innerHTML =
                  '<div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:14px 4px 8px;">Web 扩展 · 存储介质明细（合法超越）</div>' +
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
                (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(fps, dev.isFpsEnabled()); // #70
                fps.addEventListener('change', function() {
                  dev.setFpsEnabled(fps.checked);
                  if (window.showSystemToast) window.showSystemToast(fps.checked ? 'FPS 悬浮层已开启' : 'FPS 悬浮层已关闭');
                });
              }
              if (na && !na._bound) {
                na._bound = true;
                (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(na, dev.isNoAnimEnabled()); // #70
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
      // v8.08 #23 差距矩阵⑥ 权威标题：WallpaperTypeSettings (DashboardFragment)
      // getPreferenceScreenResId=R.xml.wallpaper_settings，title=@string/
      // wallpaper_settings_fragment_title（values-zh-rCN 权威值「选择壁纸来源」）
      title: '选择壁纸来源',
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
              if (swE) (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(swE, !!p.dockEnabled); // #70（Dock 设置重渲染路径）
              if (swR) (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(swR, !!p.dockRecents);
              if (swM) (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(swM, !!p.dockMacEffect);
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
            v8.01 已转正 NotificationSettings → 页 19，v8.02 已转正 AccessibilitySettings → 页 20，
            v8.04 已转正 DisplaySettings → 页 1）。
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
              if (sw && window.__qsTileState) (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, window.__qsTileState.get('aeroplane')); // #70
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
    // ==================== v8.26 #48：关于手机三页（页 21 my_device_info / 页 22 hardware_info / 页 23 firmware_version） ====================
    // 考证链见 ABOUT_PAGE_SCRIPT 头注（aosp-mirror main 实源逐 key 取证；zh-rCN 权威文案）。
    // 行均无 android:icon → 忠实纯文本行；SIM/无源行门控隐藏注记；浏览器 API 填充 + 伪装链
    // 确定性派生 + 优雅降级「未知」；页 21→22/23/2 跳转走 pushSubPage——v8.28 #53 起
    // 宽栏保持双栏（A17 ActivityEmbedding 嵌入语义）：右栏托管切换三级页 + 返回键弹出，
    // 由 evalWide/syncWithStack 通道承接（行为自洽注记见 two-pane evalWide 头注）。
    {
      title: '关于手机',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">关于手机</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">设备信息（AOSP my_device_info，浏览器 API 填充）</div>
          <!-- my_device_info_header（LayoutPreference settings_entity_header）：isPreferenceVisible=false 默认隐藏注记 -->
          <!-- ① basic_info_category「基本信息」（my_device_info_basic_info_category_title 权威值） -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">基本信息</div>
          <!-- device_name（order 1）：ValidatedEditTextPreference + DeviceNamePreferenceController；
              编辑 = prompt 等价（dialog 语义映射）；localStorage ios-desktop:device-name 持久化；
              默认 = 型号派生（AOSP 默认 device_name=model 同构） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__aboutV826 && window.__aboutV826.renameDevice()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">设备名称</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutDeviceName"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- branded_account（order 2）：BrandedAccountPreferenceController —— 非 branded device
              （Google 标识设备）→ 隐藏注记 -->
          <!-- phone_number（order 3）：config_show_sim_info=false（Web 无 SIM 栈）→ 隐藏注记 -->
          <!-- ② legal_category「法律法规」（my_device_info_legal_category_title 权威值） -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">法律法规</div>
          <!-- legal_container（order 15）：LegalSettings fragment → Web 等价 toast（本地无文档） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__aboutV826 && window.__aboutV826.showLegal()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">法律信息</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- regulatory_info（order 16）：intent SHOW_REGULATORY_INFO 无解析（无监管图资源）→ 隐藏注记 -->
          <!-- safety_info（order 17）：无内容源 → 隐藏注记 -->
          <!-- ③ device_detail_category「设备详细信息」（权威值） -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">设备详细信息</div>
          <!-- sim_status（order 18）/ eid_info（31）/ imei_info（32）：config_show_sim_info=false
              （Web 无电话栈，v8.01 SIM 门控裁决同律）→ 隐藏注记 -->
          <!-- device_model（order 30）：model_info「型号」zh-rCN 权威值；fragment=HardwareInfoFragment
              → 页 22；摘要 = UA-CH model → platform 降级 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(22)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">型号</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutModelSub"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- firmware_version（order 42）：fragment=FirmwareVersionSettings → 页 23；
              摘要 = Android 版本表述（platformVersion 映射） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(23)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Android 版本</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutOsSub"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- battery_info（order 43）：BatteryInfoFragment → Web 等价=电池子页（页 2）；
              摘要 = battery-service 单一真源仪表盘标签（v8.06 getDashboardLabel 同构） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(2)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">电池信息</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutBatterySub"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- ④ device_identifiers_category「设备标识符」（权威值） -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">设备标识符</div>
          <!-- wifi_ip_address（order 44）：WebRTC host candidate（iceServers 空 → 不外传）；
              mDNS/.local = 浏览器真实输出；超时降级 device_info_default「未知」 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">IP 地址</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutIpSub"></span></span>
          </div>
          <!-- saved_accesspoints_wifi_mac_address（45）/ wifi_mac_address（46）/ bt_address（47）：
              Web 无 MAC 栈 → 隐藏注记（AOSP select 该行时若值为空同样显示不可用语义） -->
          <!-- up_time（order 48）：formatElapsed zh 语义；Web 映射 = 页面会话时长
              （performance.now；开机时长 Web 域不可得，注记保留 AOSP 语义差异） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">正常运行时间</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutUptimeSub"></span></span>
          </div>
          <!-- manual（50）：intent SHOW_MANUAL 无解析 → 隐藏注记；device_feedback（51）：
              无反馈通道 → 隐藏注记；fcc_equipment_id（52）：无 FCC 标识 → 隐藏注记 -->
          <!-- build_number（order 53）：BuildNumberPreferenceController 连点链
              TAPS_TO_BECOME_DEVELOPER=7 → 开发者模式（show_dev_countdown/on/already 权威文案） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__aboutV826 && window.__aboutV826.onBuildTap()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Build 号</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutBuildSub"></span></span>
          </div>
        </div>
        <script>` + ABOUT_PAGE_SCRIPT + `</script>`,
    },
    // ==================== v8.26 #48：页 22 型号（hardware_info.xml 1:1 + 浏览器扩展分区） ====================
    {
      title: '型号',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">型号</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">型号与硬件信息（AOSP hardware_info，浏览器 API 填充）</div>
          <!-- hardware_info_device_model：DeviceModelPreferenceController.getSummary =
              getDeviceModel() → Web = UA-CH model（Android 真机真实型号）→ platform 降级 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">型号</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwModel"></span></span>
          </div>
          <!-- hardware_info_device_serial：config_show_device_model 门控 + Build.getSerial
              无 Web API → 隐藏注记；hardware_info_device_revision：
              ro.boot.hardware.revision 空 → UNSUPPORTED_ON_DEVICE 同构 → 隐藏注记；
              hardware_info_manufactured_year：无制造信息源 → 隐藏注记 -->
          <!-- 「浏览器设备信息」扩展分区（#48 议题明示超越点：AOSP hardware_info.xml 无此分区，
              浏览器 API 硬件探测集中呈现；同 v8.02 RBC 超越点注记纪律） -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">浏览器设备信息</div>
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">屏幕</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwScreen"></span></span>
          </div>
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">处理器核心</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwCores"></span></span>
          </div>
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">内存</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwMemory"></span></span>
          </div>
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">浏览器与渲染引擎</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwEngine"></span></span>
          </div>
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">语言与时区</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwLocale"></span></span>
          </div>
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">存储</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutHwStorage"></span></span>
          </div>
        </div>
        <script>` + ABOUT_PAGE_SCRIPT + `</script>`,
    },
    // ==================== v8.26 #48：页 23 Android 版本（firmware_version.xml 1:1 六键） ====================
    {
      title: 'Android 版本',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">Android 版本</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">软件版本信息（AOSP firmware_version，浏览器 API 填充）</div>
          <!-- os_firmware_version：FirmwareVersionDetailPreferenceController（summary =
              Build.VERSION.RELEASE）→ Web = platformVersion 主版本号 / 平台名 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Android 版本</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutOsVer"></span></span>
          </div>
          <!-- security_key：SecurityPatchLevelPreferenceController → 伪装确定性日期
              （#48 议题明示伪装许可；同一设备数据恒生成同一值） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Android 安全更新</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutPatch"></span></span>
          </div>
          <!-- module_version：MainlineModuleVersionPreferenceController → Web =
              fullVersionList Chrome 完整版（真实值） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Google Play 系统更新</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutModule"></span></span>
          </div>
          <!-- base_band：BasebandVersionPreferenceController —— Web 无调制解调器 → 隐藏注记 -->
          <!-- kernel_version：KernelVersionPreferenceController → 伪装确定性
              '5.15.NN-androidMAJ-N-gHEX12'（#48 议题明示伪装许可） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">内核版本</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutKernel"></span></span>
          </div>
          <!-- os_build_number：SimpleBuildNumberPreferenceController → 同页 21 build 号伪装值
              （确定性：seedOf 一致 → 两页数值必然一致，E2E 断言锚定） -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">Build 号</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="aboutBuild2"></span></span>
          </div>
        </div>
        <script>` + ABOUT_PAGE_SCRIPT + `</script>`,
    },
    // ==================== v8.29 #22⑦：位置信息三页（页 24 location_settings / 页 25 see_all / 页 26 location_services） ====================
    // 考证链见 LOCATION_PAGE_SCRIPT 头注（aosp-mirror main 实源逐 key 取证；zh-rCN 权威文案）。
    // 页顶总开关=SettingsMainSwitchBar 映射（LocationSettings.java L92-101 实证）；recent 动态行
    // MAX_APPS=3（L51）+相对时间摘要（createAppPreference L194-195）；managed/private profile 两键
    // 无 profile 移除→隐藏注记；footer 双形态随开关联动；页 24→25/26 跳转走 pushSubPage
    // （窄栏栈语义；宽容器 = #53 v8.28 三级保宽+右栏托管 syncWithStack 新语义——栈顶页由
    // 右栏托管渲染，evalWide isStackCtx 退窄通道已退役）。
    {
      title: '位置信息',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">位置信息</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">近期访问、权限与服务（AOSP location_settings，浏览器 API 适配）</div>
          <!-- 页顶总开关：SettingsMainSwitchBar（LocationSettings.onActivityCreated 实证——不在
              location_settings.xml 内；location_settings_primary_switch_title「使用位置信息」权威值）。
              Web 真源 = 设置态（localStorage settings:location-v1；geolocation API 单向不可程序化
              读写全局开关，v8.01 SIM 裁决同律），默认 true=AOSP 出厂默认开 -->
          <div style="display:flex;align-items:center;gap:16px;min-height:56px;padding:8px 16px;margin:0 4px;border-radius:20px;background:var(--md-surface-variant,#eef0f4);">
            <span style="flex:1;font-size:15px;font-weight:500;">使用位置信息</span>
            <label class="md3-switch"><input type="checkbox" id="locMainSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- ① recent_location_access 分区「近期位置信息访问」（location_category_recent_location_access
              权威值）；RecentLocationAccessPreferenceController 动态行（icon+应用名+相对时间摘要
              LONG，MAX_APPS=3 实证逐字）；位置关闭时整组隐藏（onLocationModeChanged →
              setVisible(enabled) 同构）；Web 虚构时间线固定 seed 确定性 6 项（AppOps 无 Web 对应 API） -->
          <div id="locRecentGroup">
            <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">近期位置信息访问</div>
            <div id="locRecentMain"></div>
            <!-- 空态 banner：location_no_recent_accesses「最近没有任何应用访问位置信息」（AOSP
                RecentLocationAccessPreferenceController L157 完整语义保留；虚构数据恒非空 →
                运行时不显示，静态 HTML 恒空渲染） -->
            <div id="locRecentEmpty" style="min-height:64px;display:none;align-items:center;padding:0 12px;font-size:15px;color:var(--md-on-surface-variant,#9a9b9e);">最近没有任何应用访问位置信息</div>
            <!-- recent_location_access_see_all_button「查看全部」：fragment=
                RecentLocationAccessSeeAllFragment → 页 25；searchable=false 同构 -->
            <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(25)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
              <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">查看全部</span></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
            </div>
          </div>
          <!-- ② location_advanced_settings 分区（no_label） -->
          <!-- managed_profile_location_switch「工作资料位置信息」：RestrictedSwitchPreference
              enabled=false + 无 managed profile 移除（XML L42 注释）→ 隐藏注记 -->
          <!-- private_profile_location_switch「私密空间的位置」：A17 Private Profile 新项，
              无 private profile 移除（XML L52 注释）→ 隐藏注记 -->
          <!-- app_level_permissions「应用位置信息权限」（AppLocationPermissionPreferenceController）：
              摘要动态 = 开「N 个应用（共 M 个应用）有权获取位置信息」（plural other 形态插值，
              has=时间线长度自洽/total=虚构 32 恒定）/关「位置信息服务已关闭」 -->
          <div style="font-size:14px;font-weight:500;color:var(--md-on-surface-variant,#9a9b9e);padding:14px 12px 6px;">权限</div>
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">应用位置信息权限</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="locAppPermSum"></span></span>
          </div>
          <!-- location_services（order）：fragment=LocationServices → 页 26；
              title=location_services_preference_title「位置信息服务」权威值 -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(26)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">位置信息服务</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
        </div>
        <!-- location_footer（FooterPreference）：LocationSettingsFooterPreferenceController 双形态
            动态——开=location_settings_footer_general/关=location_settings_footer_location_off
            （紧急呼叫例外语义逐字） -->
        <div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:16px 16px 24px;line-height:1.5;" id="locFooter"></div>
        <script>` + LOCATION_PAGE_SCRIPT + `</script>`,
    },
    {
      title: '近期位置信息访问',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">近期位置信息访问</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">近期访问过位置信息的应用（AOSP RecentLocationAccessSeeAllFragment，全量列表）</div>
          <!-- 页 25 =「查看全部」目标（RecentLocationAccessSeeAllFragment 同构）：同数据源
              全量渲染（无 MAX_APPS 截断），行形态与页 24 动态行同构（icon+应用名+相对时间） -->
          <div id="locRecentAll"></div>
        </div>
        <script>` + LOCATION_PAGE_SCRIPT + `</script>`,
    },
    {
      title: '位置信息服务',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">位置信息服务</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">扫描服务开关（AOSP location_services，SettingInjectorService 注入）</div>
          <!-- 页 26 = res/xml/location_services.xml 1:1：title=location_services_screen_title
              权威值；两行 SettingInjectorService 注入形态（framework 侧独立于页面总开关常显）；
              scan always 真源 = Settings.Secure（Web 无对应 API → 设置态真源同总开关律） -->
          <!-- location_services_wifi_scanning「WLAN 扫描」：
              location_scanning_wifi_always_scanning_title 权威值 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">WLAN 扫描</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">允许应用扫描 WLAN 网络以提高位置信息准确度</span></span>
            <label class="md3-switch"><input type="checkbox" id="locWifiScan"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- location_services_bluetooth_scanning「蓝牙扫描」：
              location_scanning_bluetooth_always_scanning_title 权威值 -->
          <div class="md3-list-item" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">蓝牙扫描</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">允许应用扫描蓝牙设备以提高位置信息准确度</span></span>
            <label class="md3-switch"><input type="checkbox" id="locBtScan"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <script>` + LOCATION_PAGE_SCRIPT + `</script>`,
    },
    // ==================== v8.30 #22③：模式页（页 27 modes_list_settings 极简壳 1:1） ====================
    // 考证链见 MODES_PAGE_SCRIPT 头注（ZenModesListFragment/ZenModesListPreferenceController/
    // SettingsLib ZenModesBackend.getModes/ZenModesListItemPreference.setZenMode 四件实源）。
    // AOSP 纯净出厂 = 仅「勿扰」一行（Manual DND 恒在首位，自动规则空）；勿扰摘要真源 =
    // __qsTileState.get('modes')（QS modes 磁贴单一真源桥）；壳 3 keys 全对齐。
    {
      title: '模式',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">模式</div>
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">勿扰与专注模式（AOSP modes_list_settings，极简壳 1:1）</div>
          <!-- TopIntroPreference：zen_modes_list_intro 权威值 -->
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:4px 12px 12px;line-height:1.6;">利用适合睡眠、工作、驾车等场景的各种模式，减少干扰、保持专注。</div>
          <!-- zen_modes_list 分区（ZenModesListPreferenceController 动态生成；AOSP 纯净出厂 =
              仅 Manual DND「勿扰」一行——ZenModesBackend.getModes() 首项恒在 + 自动规则出厂为空）：
              行形态 = ZenModesListItemPreference.setZenMode（title=模式名 + summary=getStatusText
              四态；icon 随激活态 accent tint——勿扰激活时图标 accent 色语义） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(9)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.topModes || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">勿扰</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);" id="modesDndSummary"></span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- 勿扰行跳转注记：AOSP ZenModeFragment 详情页排后续转正；Web 等价 = 页 9「多模式」
              （v7.98 双模式场景系统真管理入口：主题/壁纸/勿扰 per-mode + Focus 自动勿扰——
              #22 注记「网页版 modes 能力已超 AOSP 设置入口」的项目侧映射） -->
          <!-- add_mode：zen_modes_add_mode「创建您的专属模式」权威值 + ic_add_24dp；
              点击 = ZenModeNewCustomFragment/ZenModesListAddModeTypeChooserDialog 模板选择
              向导 Web 等价 toast（v8.26 showLegal 同律） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__settingsModesV830 && window.__settingsModesV830.toastAddMode()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.devAdd || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">创建您的专属模式</span></span>
          </div>
        </div>
        <script>` + MODES_PAGE_SCRIPT + `</script>`,
    },
    // ==================== v8.31 #22⑤⑥：安全和隐私页（页 28 SafetyCenter 合流 1:1） ====================
    // 页面骨架 = security_dashboard_settings.xml 权威四分区（order -10/1/10/100）；
    // 一级菜单形态门控实证：SafetyCenter 启用（A17 手机默认）→ top_level_safety_center
    // AVAILABLE / top_level_security CONDITIONALLY_UNAVAILABLE（二者取其一）——
    // security 行 two-pane hidden:true 注记（communal 同律），页面由本页合流承接。
    // 安全状态卡/权限扫描摘要 = #22⑤「卡片可虚构安全状态+权限扫描结果」许可（确定性呈现）。
    {
      title: '安全和隐私',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">安全和隐私</div>
          <!-- safety_center_summary 权威值（一级菜单 sub 同源） -->
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">应用安全性、设备锁定、权限</div>
          <!-- security_status 分区（order -10）：分区标题 security_status_title「安全状态」权威值。
              状态卡 = SafetyCenter Protection status 合流语义（PermissionController
              SafetyCenterActivity——镜像 404×3 不可达，#22⑤「卡片可虚构安全状态」许可
              确定性虚构：盾牌 topSafety + 「已受到保护」+「重新扫描」确定性 toast） -->
          <div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:4px 12px 8px;">安全状态</div>
          <div style="margin:0 8px 12px;padding:16px;border-radius:16px;background:var(--md-primary-container,#d3e3fd);color:var(--md-on-primary-container,#041e49);display:flex;align-items:center;gap:14px;">
            <span style="width:40px;height:40px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.topSafety || ''}</span>
            <span style="flex:1;min-width:0;">
              <span style="display:block;font-size:16px;font-weight:500;">已受到保护</span>
              <span style="display:block;font-size:13px;opacity:0.8;margin-top:2px;">您的设备已通过安全检查</span>
            </span>
            <button id="safetyRescanBtn" role="button" tabindex="0" onclick="window.__settingsSafetyV831 && window.__settingsSafetyV831.rescan()" style="flex:none;border:none;background:transparent;color:var(--md-primary,#0b57d0);font-size:14px;font-weight:500;padding:8px 10px;border-radius:20px;cursor:pointer;">重新扫描</button>
          </div>
          <!-- dashboard_tile_placeholder 分区（order 1）：SecurityEntryPreferenceController
              动态注入卡片——SafetyCenter 合流页托管；Web 等价 = 权限使用行（虚构权限扫描
              摘要固定值，#22⑤ 许可）→ 页 5 隐私（权限管理真数据源，v8.30 勿扰→页 9 映射同律） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.pushSubPage && window.pushSubPage(5)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.topPrivacy || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">权限使用</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">已扫描 32 个应用</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- security_category 分区（order 10）：分区标题 lock_settings_title「设备安全性」权威值。
              unlock_set_or_change（GearPreference）：title=unlock_set_unlock_launch_picker_title
              「屏幕锁定」+ summary=summary_placeholder 忠实空；点击 = ChooseLockGeneric
              屏幕锁定方式选择 Web 等价 toast（v8.30 toastAddMode 同律）。
              指纹/人脸解锁/人脸解锁和指纹解锁三行 = FingerprintStatusPreferenceController /
              FaceStatusPreferenceController / CombinedBiometricStatusPreferenceController →
              isFingerprintHardwareDetected / isFaceHardwareDetected 硬件检测门控——
              Web 无生物识别硬件 → 隐藏注记（v8.01 SIM 门控 + v8.30 结构性配置零虚构同律；
              key：fingerprint_settings「指纹」/ face_settings「人脸解锁」/
              biometric_settings「人脸解锁和指纹解锁」zh 权威值实拉留痕） -->
          <div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:8px 12px 8px;">设备安全性</div>
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__settingsSafetyV831 && window.__settingsSafetyV831.toastLock()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.topSecurity || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">屏幕锁定</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- security_advanced_settings（order 100）：title=「更多安全设置」权威值 +
              summary=summary_placeholder 忠实空；fragment=SecurityAdvancedSettings →
              Web 等价 toast（页后续转正注记） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__settingsSafetyV831 && window.__settingsSafetyV831.toastAdvanced()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">更多安全设置</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
        </div>
        <script>` + SAFETY_PAGE_SCRIPT + `</script>`,
    },
    // ==================== v8.32 #22⑧：安全和紧急情况页（页 29 emergency_settings 1:1） ====================
    // 考证链见 icons-aosp.js emgGesture 注记与 aosp-v828/emergency_settings.xml 实拉
    // （2331B 全文，screen safety_and_emergency_screen + 3 keys + no_label 分区）：
    //   more_emergency_settings(order 0，LayoutPreference more_settings_button =
    //   ActionPrimaryButton 主按钮——MoreSettingsPreferenceController.getButtonText =
    //   open_app_button「打开%s」动态应用名；AOSP 纯净出厂 = EmergencyInfo 应用「紧急信息」；
    //   open_app_button zh 权威值跨仓库缺失（Settings zh strings 710KB MISS），语义值注记留痕）
    //   gesture_emergency_summary(order 100)：EmergencyGestureEntrypointPreferenceController
    //   实拉——title=emergency_gesture_screen_title「紧急求救」+ 摘要 = getSummary
    //   gesture_setting_on「已开启」/gesture_setting_off「已关闭」动态开关态；
    //   config_show_emergency_gesture_settings 出厂默认 true → 摘要「已开启」出厂态；
    //   fragment=EmergencyGestureSettings 详情页排后续转正；#22⑧ 注记「紧急 SOS 可对接
    //   项目侧键语义（电源键 5 连按）」排后续对接注记
    //   app_and_notif_cell_broadcast_settings(order 200)：cell_broadcast_settings
    //   「无线紧急警报」RestrictedPreference intent CellBroadcastSettings——静态行
    //   （页 19 通知页同名 key 行形态一致，v8.01 先例：intent 无 Web 等价不渲染点击）
    {
      title: '安全和紧急情况',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">安全和紧急情况</div>
          <!-- emergency_dashboard_summary 权威值（一级菜单 sub 同源） -->
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;">紧急求救、医疗信息、警报</div>
          <!-- more_emergency_settings（order 0）：LayoutPreference more_settings_button =
              ActionPrimaryButton 主按钮形态（RoundedCornerThemeOverlay 圆角实按钮非行）；
              文案 = open_app_button「打开%s」+ EmergencyInfo 应用名——AOSP 纯净出厂
              「紧急信息」；open_app_button zh 权威值跨仓库缺失（注记留痕）；
              点击 = EmergencyInfo 应用 Web 等价 toast（v8.26 showLegal 同律） -->
          <div style="margin:0 8px 12px;display:flex;justify-content:center;">
            <button role="button" tabindex="0" onclick="window.showSystemToast && window.showSystemToast('紧急信息应用后续版本转正')" style="border:none;background:var(--md-primary,#0b57d0);color:var(--md-on-primary,#fff);font-size:14px;font-weight:500;padding:10px 24px;border-radius:24px;cursor:pointer;min-height:40px;">打开紧急信息</button>
          </div>
          <!-- gesture_emergency_summary（order 100）：title=emergency_gesture_screen_title
              「紧急求救」权威值 + icon=ic_emergency_gesture_24dp（emgGesture 3 path 移植）+
              摘要 = EmergencyGestureEntrypointPreferenceController.getSummary
              gesture_setting_on「已开启」（config_show_emergency_gesture_settings 出厂默认
              true → 出厂态；项目侧键 SOS 对接（#22⑧ 注记电源键 5 连按）排后续——届时
              摘要随开关联动）；点击 = EmergencyGestureSettings Web 等价 toast -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.showSystemToast && window.showSystemToast('紧急求救设置页后续版本转正')" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.emgGesture || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">紧急求救</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">已开启</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- 无 key PreferenceCategory（order 170，preference_category_no_label 布局）：
              纯分隔线语义 → 分区间距承接 -->
          <!-- app_and_notif_cell_broadcast_settings（order 200）：title=cell_broadcast_settings
              「无线紧急警报」权威值——RestrictedPreference intent CellBroadcastSettings
              （targetPackage=config_cell_broadcast_receiver_package）→ 静态行不渲染点击
              （intent 无 Web 等价；页 19 通知页同名 key 行形态一致 v8.01 先例） -->
          <div class="md3-list-item" role="button" tabindex="0" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">无线紧急警报</span></span>
          </div>
        </div>`,
    },
    // ==================== v8.33 #22⑨：密码、通行密钥和账号页（页 30 accounts credman 形态 1:1） ====================
    // 考证链见 ACCOUNTS_PAGE_SCRIPT 注记（AccountDashboardFragment.getPreferenceLayoutResId
    // 二选一裁决——DeviceConfig "enable_credential_manager" 出厂默认 true → credman 形态）
    //   accounts_dashboard_settings_credman.xml（2985B）8 keys 全对齐：
    //     TopIntroPreference（credman_main_settings_intro_text）/ default_service_category(10)
    //     + default_credman_autofill_main / credman_category(20) /
    //     dashboard_tile_placeholder(130) / auto_sync_account_data(202) /
    //     auto_sync_work_account_data(203) / auto_sync_personal_account_data(204)
    {
      title: '密码、通行密钥和账号',
      content: `
        <div style="padding:8px 4px;">
          <div style="font-size:24px;font-weight:500;padding:8px 12px 4px;">密码、通行密钥和账号</div>
          <!-- TopIntroPreference：credman_main_settings_intro_text 权威全值（zh 实拉） -->
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding:0 12px 12px;line-height:1.5;">选择您希望哪项服务来存储用于登录和自动填充建议的数据。如果您希望其他服务也提供建议，请开启相应服务。</div>
          <!-- default_service_category（order 10）：分区 title=credman_chosen_app_title
              「首选服务」权威值。default_credman_autofill_main（PrimaryProviderPreference）：
              DefaultCombinedPreferenceController.updatePreferenceForProvider——topProvider=null
              （纯净 aosp-mirror 无 GMS 凭据服务商）→ title=credman_app_list_preference_none
              「未选择任何内容」/icon=null/summary=null（L109-121 实拉）；点击 =
              DefaultAutofillPicker 挑选器 Web 等价 toast -->
          <div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:8px 12px 8px;">首选服务</div>
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__settingsAccountsV833 && window.__settingsAccountsV833.toastPickProvider()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">未选择任何内容</span></span>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);">›</span>
          </div>
          <!-- credman_category（order 20）：分区 title=credman_credentials「其他服务」权威值；
              CredentialManagerPreferenceController.maybeUpdatePreferenceVisibility L475-487
              isHiddenDueToNoProviderSet(providerPair) → 无服务商整组隐藏（纯净出厂无 provider，
              结构性配置零虚构 v8.30 modes 同律）→ 隐藏注记 -->
          <!-- dashboard_tile_placeholder（order 130）：AccountPreferenceController 动态注入
              账号列表（AccountTypePreference title=account.name/summary=authenticator label；
              纯净出厂 aosp-mirror 无 GMS 无账号）→ category title=account_settings「账号」
              仅 add_account 行（newAddAccountPreference L458-459：add_account_label
              「添加账号」+ ic_add_24dp=devAdd 逐字移植复用）；#22⑨ 注记「可接 mail/contacts
              既有账号数据」核验结论 = 两应用零结构化账号真源 → 不虚构列表 -->
          <div style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);padding:8px 12px 8px;">账号</div>
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__settingsAccountsV833 && window.__settingsAccountsV833.toastAddAccount()" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-primary,#0b57d0);">${AOSP_ICONS.devAdd || ''}</span>
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">添加账号</span></span>
          </div>
          <!-- auto_sync_account_data（order 202）：SwitchPreferenceCompat——
              auto_sync_account_title「自动同步应用数据」/ auto_sync_account_summary
              「让应用自动刷新数据」权威值；allowDividerAbove=true；真源 =
              ContentResolver.getMasterSyncAutomatically（Web 无对应 API → localStorage
              settings:accounts-v1 单一真源，默认 true=AOSP 出厂默认开，v8.29 location 同律）；
              点击 = ConfirmAutoSyncChangeFragment 确认弹窗（关闭 zh 全值/开启 zh title +
              英文 message res-product zh MISS 留痕）→ 确认后写真源（#70 __setSwitchChecked） -->
          <div class="md3-list-item" role="button" tabindex="0" onclick="window.__settingsAccountsV833 && window.__settingsAccountsV833.openSyncDialog(!document.getElementById('acSyncToggle').checked)" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">
            <span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">自动同步应用数据</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">让应用自动刷新数据</span></span>
            <label class="md3-switch"><input type="checkbox" id="acSyncToggle" onclick="event.stopPropagation();window.__settingsAccountsV833 && window.__settingsAccountsV833.openSyncDialog(!event.target.checked)"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <!-- auto_sync_work_account_data（order 203，forWork=true）/
              auto_sync_personal_account_data（order 204）：AutoSyncWorkData/
              AutoSyncPrivateDataPreferenceController profile 门控 → 纯净出厂无 work
              profile/private space → 隐藏注记（v8.01 SIM 门控 + v8.29 位置 profile 同律） -->
        </div>
        <!-- ConfirmAutoSyncChangeFragment Web 等价确认弹窗（页内 overlay，notifLockDialog 同构；
            title/message 由 ACCOUNTS_PAGE_SCRIPT.openSyncDialog 按 enabling 分支注入） -->
        <div id="acSyncDialog" style="display:none;position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.4);align-items:center;justify-content:center;padding:24px;">
          <div style="background:var(--md-surface-container-high,#eceff4);border-radius:28px;max-width:360px;width:100%;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.25);">
            <div id="acSyncDlgTitle" style="font-size:16px;font-weight:500;padding-bottom:12px;"></div>
            <div id="acSyncDlgMsg" style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);padding-bottom:20px;white-space:pre-line;line-height:1.5;"></div>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
              <button role="button" tabindex="0" onclick="window.__settingsAccountsV833 && window.__settingsAccountsV833.cancelSync()" style="border:none;background:transparent;color:var(--md-primary,#0b57d0);font-size:14px;font-weight:500;padding:10px 12px;border-radius:20px;cursor:pointer;">取消</button>
              <button role="button" tabindex="0" onclick="window.__settingsAccountsV833 && window.__settingsAccountsV833.confirmSync()" style="border:none;background:transparent;color:var(--md-primary,#0b57d0);font-size:14px;font-weight:500;padding:10px 12px;border-radius:20px;cursor:pointer;">确定</button>
            </div>
          </div>
        </div>
        <script>` + ACCOUNTS_PAGE_SCRIPT + `</script>`,
    },
  ],
};

// v7.51 issue#7：把页面定义注册给双栏模块（右栏注入回退路径需按索引取 content）
setPages(settingsApp.pages);

export default settingsApp;

