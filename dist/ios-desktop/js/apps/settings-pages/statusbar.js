export const STATUSBAR_PAGE_SCRIPT=`
(function () {
  'use strict';
  var SB_BLOCKLIST_KEY = 'ios-desktop:statusbar-icon-blocklist';
  var SB_SLOTS = [
    { id: 'alarm_clock', label: '\u95F9\u949F', desc: '\u8BBE\u7F6E\u4E86\u4E0B\u4E00\u95F9\u949F\u65F6\u663E\u793A' },
    { id: 'zen', label: '\u52FF\u6270', desc: '\u52FF\u6270\u6A21\u5F0F\u5F00\u542F\u65F6\u663E\u793A' },
    { id: 'mute', label: '\u9759\u97F3', desc: '\u54CD\u94C3\u6A21\u5F0F\u4E3A\u9759\u97F3\u65F6\u663E\u793A\uFF08\u52FF\u6270\u5F00\u542F\u65F6\u8BA9\u4F4D\uFF09' },
    { id: 'vibrate', label: '\u632F\u52A8', desc: '\u54CD\u94C3\u6A21\u5F0F\u4E3A\u632F\u52A8\u65F6\u663E\u793A\uFF08\u52FF\u6270\u5F00\u542F\u65F6\u8BA9\u4F4D\uFF09' },
    { id: 'bluetooth', label: '\u84DD\u7259', desc: '\u84DD\u7259\u8BBE\u5907\u5DF2\u8FDE\u63A5\u65F6\u663E\u793A' },
    { id: 'cast', label: '\u6295\u5C4F', desc: '\u6B63\u5728\u6295\u5C4F\u65F6\u663E\u793A\uFF08\u5F55\u5236\u5C4F\u5E55\u65F6\u8BA9\u4F4D\uFF09' },
    { id: 'vpn', label: 'VPN', desc: 'VPN \u6D3B\u52A8\u65F6\u663E\u793A' },
    { id: 'location', label: '\u5B9A\u4F4D', desc: '\u5E94\u7528\u6B63\u5728\u4F7F\u7528\u4F4D\u7F6E\u4FE1\u606F\u65F6\u663E\u793A' },
    { id: 'screen_record', label: '\u5C4F\u5E55\u5F55\u5236', desc: '\u6B63\u5728\u5F55\u5236\u5C4F\u5E55\u65F6\u663E\u793A' }
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
