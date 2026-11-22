export const LOCATION_PAGE_SCRIPT=`
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
  // \u865A\u6784\u8FD1\u671F\u4F4D\u7F6E\u8BBF\u95EE\u65F6\u95F4\u7EBF\uFF1A\u56FA\u5B9A seed \u786E\u5B9A\u6027\uFF08\u771F\u673A = AppOps \u5B9E\u65F6\u6570\u636E\uFF0CWeb \u65E0\u5BF9\u5E94 API\uFF1B
  // offset \u6052\u5B9A \u2192 \u6E32\u67D3\u6052\u5B9A\uFF0Cv8.26 \u4F2A\u88C5\u94FE\u540C\u5F8B\uFF09\u3002mins = \u8DDD\u52A0\u8F7D\u65F6\u523B\u7684\u5206\u949F\u6570\u3002
  var RECENT = [
    { name: '\u5730\u56FE', mins: 8,    color: '#1a73e8' },
    { name: '\u5929\u6C14', mins: 32,   color: '#4285f4' },
    { name: '\u76F8\u673A', mins: 120,  color: '#5f6368' },
    { name: '\u901A\u8BAF\u5F55', mins: 300,  color: '#0b8043' },
    { name: '\u65F6\u949F', mins: 1560, color: '#e37400' },
    { name: '\u6587\u4EF6', mins: 4320, color: '#607d8b' }
  ];
  var TOTAL_APPS = 32; // \u865A\u6784\u88C5\u673A\u603B\u6570\uFF08\u786E\u5B9A\u6027\uFF1BWeb \u65E0\u5305\u7BA1\u7406\u5668\u771F\u6E90\uFF0C\u4F2A\u88C5\u94FE\u540C\u5F8B\uFF09
  var MAX_APPS = 3;    // AOSP RecentLocationAccessPreferenceController.MAX_APPS L51 \u9010\u5B57
  function relTime(mins) { return window.__settingsCore.relTime(mins); } // StringUtil.formatRelativeTime LONG zh \u8BED\u4E49\u6620\u5C04\uFF08v11.50 #286 \u7EED\u6838\u4E0A\u79FB\uFF09
  // v11.50 #286 \u7EED\uFF1A\u53C2\u6570\u5316\u6838\uFF08s, recentCount, totalApps\uFF09\uFF0C\u5185\u8054 wrapper \u4F20 RECENT.length / TOTAL_APPS
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
    var setSw = window.__setSwitchChecked||function(a,b){if(a)a.checked=!b}; // #70 \u7EDF\u4E00\u5165\u53E3\uFF08\u6865\u672A\u5C31\u7EEA\u9632\u5FA1\u964D\u7EA7\uFF0C\u65E2\u6709\u8C41\u514D\u5F62\u6001\uFF09
    var sw = document.getElementById('locMainSwitch');
    if (sw) setSw(sw, !!s.enabled);
    var sum = document.getElementById('locAppPermSum');
    if (sum) sum.textContent = fmtAppPermSummary(s);
    // \u4F4D\u7F6E\u5173\u95ED \u2192 recent \u6574\u7EC4\u9690\u85CF\uFF08onLocationModeChanged \u2192 setVisible(enabled) \u540C\u6784\uFF1B
    // \u865A\u6784\u6570\u636E\u6052\u975E\u7A7A\uFF0C\u7A7A\u6001 banner \u4E3A\u5B8C\u6574 AOSP \u8BED\u4E49\u4FDD\u7559\uFF1ARECENT \u7A7A\u65F6\u663E\u793A\uFF09
    var grp = document.getElementById('locRecentGroup');
    if (grp) grp.style.display = s.enabled ? '' : 'none';
    var main = document.getElementById('locRecentMain');
    if (main) main.innerHTML = RECENT.slice(0, MAX_APPS).map(recentRow).join('');
    var all = document.getElementById('locRecentAll');
    if (all) all.innerHTML = RECENT.map(recentRow).join('');
    var foot = document.getElementById('locFooter');
    if (foot) foot.textContent = s.enabled
      ? '\u5177\u6709\u9644\u8FD1\u8BBE\u5907\u6743\u9650\u7684\u5E94\u7528\u53EF\u4EE5\u786E\u5B9A\u5DF2\u8FDE\u63A5\u8BBE\u5907\u7684\u76F8\u5BF9\u4F4D\u7F6E\u3002'
      : '\u5E94\u7528\u548C\u670D\u52A1\u7684\u4F4D\u7F6E\u4FE1\u606F\u4F7F\u7528\u6743\u5904\u4E8E\u5173\u95ED\u72B6\u6001\u3002\u5728\u60A8\u62E8\u6253\u7D27\u6025\u7535\u8BDD\u53F7\u7801\u6216\u5411\u8BE5\u53F7\u7801\u53D1\u9001\u77ED\u4FE1\u65F6\uFF0C\u7CFB\u7EDF\u53EF\u80FD\u4ECD\u4F1A\u5C06\u60A8\u7684\u8BBE\u5907\u4F4D\u7F6E\u4FE1\u606F\u53D1\u9001\u7ED9\u7D27\u6025\u6551\u63F4\u4EBA\u5458\u3002';
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
