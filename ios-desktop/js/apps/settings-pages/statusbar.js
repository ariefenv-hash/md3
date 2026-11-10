// ==================== settings-pages/statusbar.js — 页 31 状态栏（STATUSBAR_PAGE_SCRIPT 单源真身 · #284 批 3） ====================
//
// #284 批 3（R152 窗加餐 · v11.09）：STATUSBAR_PAGE_SCRIPT 常量自 settings.js 整体搬迁至此——
// boundary-map §5.3 批 3+ 首簇（13 簇中次小），批 2 MODES 簇单源搬迁同款范式（G1 一次一簇）。
// G2 单源桥接禁双轨：本文件 = 常量唯一真源（export），settings.js 经 import 消费同一份；
// 负向锚守护 = tests/status-bar-policy.test.js v89-H4（settings.js 本体零 const
// STATUSBAR_PAGE_SCRIPT 残留，clock-core.js/.mjs 头注互指纪律同款）。运行语义零漂移：
// settingsApp 页注册表 `<script>` + STATUSBAR_PAGE_SCRIPT + `</script>` 拼接面逐字节
// 不变（消费点 = settings.js 状态栏页 content 尾段）；SB_SLOTS 插槽表与
// aosp/status-bar-policy.js SB_SLOT_ORDER 消费面同源语义随簇保持。
//
// ==================== STATUSBAR_PAGE_SCRIPT — 页 31 状态栏（v9.95 #89） ====================
// AOSP 考证：A17 Settings 树无「状态栏」子页（状态栏显隐在 SystemUI tuner / demo mode 开发者面）；
// md3 本页为 config_statusBarIconsToExclude 语义的系统级治理出口（icon blocklist），
// 插槽表与 aosp/status-bar-policy.js SB_SLOT_ORDER 消费面同源（渲染可见插槽九项；
// hotspot/data_saver/headset 占位槽无信号源不入表——开关常隐无意义）。
export const STATUSBAR_PAGE_SCRIPT = `
(function () {
  'use strict';
  var SB_BLOCKLIST_KEY = 'ios-desktop:statusbar-icon-blocklist';
  var SB_SLOTS = [
    { id: 'alarm_clock', label: '闹钟', desc: '设置了下一闹钟时显示' },
    { id: 'zen', label: '勿扰', desc: '勿扰模式开启时显示' },
    { id: 'mute', label: '静音', desc: '响铃模式为静音时显示（勿扰开启时让位）' },
    { id: 'vibrate', label: '振动', desc: '响铃模式为振动时显示（勿扰开启时让位）' },
    { id: 'bluetooth', label: '蓝牙', desc: '蓝牙设备已连接时显示' },
    { id: 'cast', label: '投屏', desc: '正在投屏时显示（录制屏幕时让位）' },
    { id: 'vpn', label: 'VPN', desc: 'VPN 活动时显示' },
    { id: 'location', label: '定位', desc: '应用正在使用位置信息时显示' },
    { id: 'screen_record', label: '屏幕录制', desc: '正在录制屏幕时显示' }
  ];
  function readBlocklist() {
    try { var a = JSON.parse(localStorage.getItem(SB_BLOCKLIST_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function writeBlocklist(list) {
    try { localStorage.setItem(SB_BLOCKLIST_KEY, JSON.stringify(list)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('statusbar-icon-blocklist-changed'));
  }
  function refresh() {
    var host = document.getElementById('sbIconSlotList');
    if (!host) return;
    var blocked = readBlocklist();
    host.innerHTML = SB_SLOTS.map(function (s) {
      var on = blocked.indexOf(s.id) < 0;
      return '<div class="md3-list-item" data-test="sb-slot-' + s.id + '" style="min-height:64px;display:flex;align-items:center;gap:16px;border-radius:16px;">'
        + '<span style="flex:1;min-width:0;"><span style="display:block;font-size:15px;">' + s.label + '</span><span style="display:block;font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);">' + s.desc + '</span></span>'
        + '<label class="md3-switch"><input type="checkbox" data-sb-slot="' + s.id + '"' + (on ? ' checked' : '') + '><span class="slider"><span class="thumb"></span></span></label>'
        + '</div>';
    }).join('');
  }
  var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
  bindDoc('settings', 'change', function (e) {
    var t = e.target;
    if (!t || !t.dataset || !t.dataset.sbSlot) return;
    var id = t.dataset.sbSlot;
    var blocked = readBlocklist();
    var idx = blocked.indexOf(id);
    if (!t.checked && idx < 0) { blocked.push(id); writeBlocklist(blocked); }
    if (t.checked && idx >= 0) { blocked.splice(idx, 1); writeBlocklist(blocked); }
  });
  bindDoc('settings', 'app-page-active', function (e) {
    if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 31) { refresh(); }
  });
  refresh();
})();
`;
