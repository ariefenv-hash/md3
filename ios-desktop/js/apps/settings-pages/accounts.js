export const ACCOUNTS_PAGE_SCRIPT=`
(function(){
  if (window.__settingsAccountsV833) return;
  window.__settingsAccountsV833 = true;
  var KEY = 'settings:accounts-v1';
  var DEF = { autoSync: true }; // AOSP ContentResolver.getMasterSyncAutomatically \u51FA\u5382\u9ED8\u8BA4\u5F00
  function load() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); return Object.assign({}, DEF, o); }
    catch (e) { return Object.assign({}, DEF); }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function setSw(on) { // #70 \u5F00\u5173\u540C\u6B65\uFF1A__setSwitchChecked \u7EDF\u4E00\u5165\u53E3
    var sw = document.getElementById('acSyncToggle');
    (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, on);
  }
  function openSyncDialog(enabling) { // ConfirmAutoSyncChangeFragment Web \u7B49\u4EF7
    var dlg = document.getElementById('acSyncDialog');
    if (!dlg) return;
    // \u5F00\u5173\u89C6\u89C9\u5148\u7FFB\u8F6C\uFF08AOSP handlePreferenceTreeClick L46\uFF1AsetChecked(!checked) \u5148\u884C\uFF09
    setSw(enabling);
    var t = document.getElementById('acSyncDlgTitle');
    var m = document.getElementById('acSyncDlgMsg');
    if (enabling) { // data_usage_auto_sync_on_dialog_title zh \u6743\u5A01 + message \u82F1\u6587\u6743\u5A01\uFF08res-product\uFF0Czh MISS \u7559\u75D5\uFF09
      if (t) t.textContent = '\u8981\u6253\u5F00\u81EA\u52A8\u540C\u6B65\u6570\u636E\u529F\u80FD\u5417\uFF1F';
      if (m) m.textContent = 'Any changes you make to your accounts on the web will be automatically copied to your tablet.\\n\\nSome accounts may also automatically copy any changes you make on the tablet to the web. A Google Account works this way.';
    } else { // data_usage_auto_sync_off_dialog_title + off_dialog zh \u6743\u5A01\u5168\u503C
      if (t) t.textContent = '\u8981\u5173\u95ED\u81EA\u52A8\u540C\u6B65\u6570\u636E\u529F\u80FD\u5417\uFF1F';
      if (m) m.textContent = '\u5173\u95ED\u540E\u53EF\u4EE5\u8282\u7701\u6570\u636E\u6D41\u91CF\u548C\u7535\u6C60\u7535\u91CF\uFF0C\u4F46\u60A8\u9700\u8981\u624B\u52A8\u540C\u6B65\u6BCF\u4E2A\u8D26\u53F7\u624D\u80FD\u83B7\u5F97\u6700\u65B0\u4FE1\u606F\uFF0C\u5E76\u4E14\u5728\u6709\u66F4\u65B0\u65F6\u4E0D\u4F1A\u6536\u5230\u901A\u77E5\u3002';
    }
    dlg.dataset.pending = enabling ? 'on' : 'off';
    dlg.style.display = 'flex';
  }
  function confirmSync() { // onClick BUTTON_POSITIVE \u2192 setMasterSyncAutomatically \u5199\u771F\u6E90
    var dlg = document.getElementById('acSyncDialog');
    if (!dlg) return;
    var on = dlg.dataset.pending === 'on';
    save({ autoSync: on });
    setSw(on);
    dlg.style.display = 'none';
  }
  function cancelSync() { // \u53D6\u6D88 = \u89C6\u89C9\u56DE\u6EDA\uFF08updateState \u91CD\u8BFB\u771F\u6E90\u8BED\u4E49\uFF09
    setSw(!!load().autoSync);
    var dlg = document.getElementById('acSyncDialog');
    if (dlg) dlg.style.display = 'none';
  }
  function refresh() { // DOM \u590D\u7528\u91CD\u5165\uFF1A\u771F\u6E90\u6062\u590D\uFF08#70\uFF09
    setSw(!!load().autoSync);
  }
  function toastAddAccount() {
    if (window.showSystemToast) window.showSystemToast('\u6DFB\u52A0\u8D26\u53F7\u9700\u8981\u8D26\u53F7\u6846\u67B6\u652F\u6301\uFF0C\u540E\u7EED\u7248\u672C\u8F6C\u6B63'); // AccountManager Web \u7B49\u4EF7
  }
  function toastPickProvider() {
    if (window.showSystemToast) window.showSystemToast('\u9996\u9009\u670D\u52A1\u9009\u62E9\u5668\u540E\u7EED\u7248\u672C\u8F6C\u6B63'); // DefaultAutofillPicker Web \u7B49\u4EF7
  }
  var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
  refresh(); // \u521D\u59CB\u6062\u590D\uFF08localStorage \u7A7A = \u51FA\u5382\u6001 autoSync true\uFF09
  bindDoc('settings', 'app-page-active', function(e) { // DOM \u590D\u7528\u91CD\u540C\u6B65\uFF08v8.29 location \u540C\u6B3E\uFF09
    if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 30) { refresh(); }
  });
  window.__settingsAccountsV833 = { openSyncDialog: openSyncDialog, confirmSync: confirmSync, cancelSync: cancelSync, refresh: refresh, toastAddAccount: toastAddAccount, toastPickProvider: toastPickProvider };
})();
`;
