// ==================== settings-pages/location.js — 页 24 位置信息 / 页 25 近期访问全览 / 页 26 位置信息服务（LOCATION_PAGE_SCRIPT 单源真身 · #284 批 15） ====================
//
// #284 批 15（v11.31 · settings.js 末簇收官卷）：LOCATION_PAGE_SCRIPT 常量自 settings.js 整体搬迁至此
// ——boundary-map §3.1 候选表末位（v8.29 #22⑦ 位置信息三页 location_settings.xml/页 25 see_all/
// location_services.xml 1:1，簇块 110 行 = banner 1 + 考证链 38 + const 1 + 模板串 69 + 闭合 1，
// 批 14 ABOUT 簇后唯一现存簇）。G2 单源桥接禁双轨：本文件 = 常量唯一真源
// （export），settings.js 经 import 消费同一份；负向锚守护 = tests/location-settings.test.js
// 「G2 单源桥接」组（settings.js 本体零 const LOCATION_PAGE_SCRIPT 残留，批 2-14 互指纪律同款）。
// 运行语义零漂移：settingsApp 页注册表 `<script>` + LOCATION_PAGE_SCRIPT + `</script>`
// 拼接面逐字节不变（消费点 = settings.js 页 24/25/26 content 尾段原位）；簇模板串零 `${`
// 插值（boundary-map §3.1 拆分风险注记核查：LOCATION 簇自包含 IIFE，桥接全走 window.* 宿主
// 面；**簇体含 2 处 window.__settingsCore. 委托（relTime/fmtAppPermSummary，批 9 DISPLAY/
// 批 14 ABOUT 同款）——v286 C2 读取面 +LOCATION_PAGE_SRC 五源合计守恒（settings.js+notif.js
// +display.js+about.js+location.js）**；零 __mdEscape( 委托）。测试面实证：location-settings.test.js
// describe①② seg 切源改读本文件全文件 + describe⑥ 零 \u 段切源同款（宿主面 describe③④⑤
// 切片锚 v8.29 #22⑦ 位置信息三页 pages 注册表面零触碰）；随迁面 = describe①②⑥ 切源 +
// C2 五源守恒 + G2 四锚尾挂（批 6/14 范式）。
// AOSP 权威清单（aosp-mirror/platform_packages_apps_settings main 实源，非记忆；zh-rCN 权威文案）：
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
export const LOCATION_PAGE_SCRIPT = `
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
  function relTime(mins) { return window.__settingsCore.relTime(mins); } // StringUtil.formatRelativeTime LONG zh 语义映射（v11.31 #286 续核上移）
  // v11.31 #286 续：参数化核（s, recentCount, totalApps），内联 wrapper 传 RECENT.length / TOTAL_APPS
  function fmtAppPermSummary(s) {
    return window.__settingsCore.fmtAppPermSummary(s, RECENT.length, TOTAL_APPS);
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
