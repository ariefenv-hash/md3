export const MODES_PAGE_SCRIPT=`
(function(){
  if (window.__settingsModesV830) return;
  window.__settingsModesV830 = true;
  function refresh() {
    var el = document.getElementById('modesDndSummary');
    if (!el) return;
    var active = false;
    try { active = !!(window.__qsTileState && window.__qsTileState.get && window.__qsTileState.get('modes')); } catch (e) {}
    el.textContent = active ? '\u5DF2\u542F\u7528' : '\u5DF2\u505C\u7528'; // zen_mode_active_text / zen_mode_disabled_by_user \u6743\u5A01\u503C
  }
  function toastAddMode() {
    if (window.showSystemToast) window.showSystemToast('\u6A21\u5F0F\u6A21\u677F\u9009\u62E9\u5411\u5BFC\u540E\u7EED\u7248\u672C\u8F6C\u6B63');
  }
  window.__settingsModesV830 = { refresh: refresh, toastAddMode: toastAddMode };
  var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
  refresh();
  bindDoc('settings', 'app-page-active', function(e) {
    if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 27) { refresh(); }
  });
})();

`;
