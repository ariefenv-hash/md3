export const SAFETY_PAGE_SCRIPT=`
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
      toast('\u626B\u63CF\u5B8C\u6210\uFF0C\u672A\u53D1\u73B0\u5B89\u5168\u95EE\u9898'); // #22\u2464 \u8BB8\u53EF\uFF1A\u865A\u6784\u5B89\u5168\u626B\u63CF\u7ED3\u679C\uFF08\u786E\u5B9A\u6027\uFF09
    }, 800);
  }
  function toastAdvanced() {
    toast('\u66F4\u591A\u5B89\u5168\u8BBE\u7F6E\u9875\u540E\u7EED\u7248\u672C\u8F6C\u6B63'); // SecurityAdvancedSettings Web \u7B49\u4EF7\u63D0\u793A
  }
  // ===== v11.50 #210\uFF1A\u5C4F\u5E55\u9501\u5B9A PIN \u8F6C\u6B63\uFF08ChooseLockGeneric Web \u7B49\u4EF7\u2014\u2014v8.31 \u5360\u4F4D toast \u9000\u5F79\uFF09 =====
  function lp() { return window.__lockPin || null; }
  function el(id) { return document.getElementById(id); }
  function showWarning(text) {
    var w = el('lockPinWarning');
    if (!w) return;
    if (text) { w.textContent = text; w.style.display = 'block'; }
    else { w.textContent = ''; w.style.display = 'none'; }
  }
  // \u884C\u6458\u8981\u52A8\u6001\u5316\uFF08Settings \u5C4F\u5E55\u9501\u5B9A summary \u540C\u6784\uFF1A\u65E0 / PIN\uFF09
  function refreshPinUi() {
    var api = lp();
    var has = !!(api && api.store && api.store.has && api.store.has());
    var summary = el('lockMethodSummary');
    if (summary) summary.textContent = has ? 'PIN' : '\u65E0';
    var clearBtn = el('lockPinClearBtn');
    if (clearBtn) clearBtn.style.display = has ? '' : 'none';
  }
  function openPinSetup() {
    var card = el('lockPinCard');
    if (!card) return;
    card.hidden = !card.hidden;
    if (!card.hidden) {
      showWarning('');
      var i1 = el('lockPinInput'), i2 = el('lockPinConfirm');
      if (i1) i1.value = '';
      if (i2) i2.value = '';
      refreshPinUi();
    }
  }
  function pinSave() {
    var api = lp();
    if (!api || !api.store) { toast('PIN \u670D\u52A1\u672A\u5C31\u7EEA'); return; }
    var i1 = el('lockPinInput'), i2 = el('lockPinConfirm');
    var a = i1 ? i1.value : '';
    var b = i2 ? i2.value : '';
    var v = api.validatePinCandidate(a);
    if (!v.ok) { showWarning(v.reason); return; }
    if (a !== b) { showWarning('\u4E24\u6B21\u8F93\u5165\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u91CD\u65B0\u8F93\u5165'); return; }
    // \u5F31\u5BC6\u7801\u8B66\u544A\uFF08#185 assessPassword\u2014\u2014\u53EA\u8B66\u544A\u4E0D\u963B\u65AD\uFF0CNightSky\u300C\u4E0D\u6539\u4E5F\u884C\u300D\u53D6\u5411\u9010\u5B57\u627F\u88AD\uFF09
    var assess = api.assessPassword(a);
    if (assess.weak) {
      var details = assess.reasons.map(function (r) { return r.detail; }).join('\u3001');
      showWarning('\u60A8\u6240\u8BBE\u7F6E\u7684\u5BC6\u7801\u4E0D\u5B89\u5168\uFF08' + details + '\uFF09\uFF0C\u4ED6\u4EBA\u53EF\u80FD\u4F1A\u8F7B\u6613\u731C\u5230\uFF0C\u5EFA\u8BAE\u66F4\u6539\uFF08\u4E0D\u6539\u4E5F\u884C\uFF09\u3002');
    }
    // \u4FDD\u5B58\u94FE\uFF08hashPassword PBKDF2-SHA256 \u52A0\u76D0\u2014\u2014#185 \u5B89\u5168\u7EAA\u5F8B\u300C\u7981\u88F8 MD5\u300D\u6B63\u9762\u5151\u73B0\uFF09\uFF1B
    // \u5F31\u5BC6\u7801\u8B66\u544A\u6301\u4E45\u53EF\u89C1\uFF08\u4FDD\u5B58\u6210\u529F\u4E0D\u6E05\u9664\u2014\u2014\u300C\u53EA\u8B66\u544A\u4E0D\u963B\u65AD\u300D\u8BED\u4E49\u7684\u53EF\u89C1\u6027\u5151\u73B0\uFF0C\u4E0B\u6B21\u5F00\u5361\u624D\u6E05\uFF09
    api.hashPassword(a).then(function (r) {
      api.store.setPin(r.hashHex, r.saltHex, r.iterations);
      if (i1) i1.value = '';
      if (i2) i2.value = '';
      toast('\u5C4F\u5E55\u9501\u5B9A\u5DF2\u66F4\u65B0\u4E3A PIN');
      refreshPinUi();
      var card = el('lockPinCard');
      if (card) card.hidden = true;
    }).catch(function () { showWarning('PIN \u4FDD\u5B58\u5931\u8D25\uFF08\u52A0\u5BC6\u901A\u9053\u4E0D\u53EF\u7528\uFF09'); });
  }
  function pinClear() {
    var api = lp();
    if (!api || !api.store) { toast('PIN \u670D\u52A1\u672A\u5C31\u7EEA'); return; }
    if (!api.store.has()) { toast('\u5C1A\u672A\u8BBE\u7F6E PIN'); return; }
    var i1 = el('lockPinInput');
    var a = i1 ? i1.value : '';
    if (!a) { showWarning('\u8BF7\u5148\u5728\u4E0A\u65B9\u8F93\u5165\u5F53\u524D PIN \u9A8C\u8BC1\u540E\u518D\u6E05\u9664'); return; }
    var snap = api.store.snapshot();
    api.verifyPassword(a, { hashHex: snap.hashHex, saltHex: snap.saltHex, iterations: snap.iterations }).then(function (ok) {
      if (!ok) { showWarning('\u5F53\u524D PIN \u4E0D\u6B63\u786E'); return; }
      api.store.clearPin();
      var i2 = el('lockPinConfirm');
      if (i1) i1.value = '';
      if (i2) i2.value = '';
      showWarning('');
      toast('\u5DF2\u6E05\u9664\u5C4F\u5E55\u9501\u5B9A PIN');
      refreshPinUi();
    }).catch(function () { showWarning('PIN \u6821\u9A8C\u5931\u8D25\uFF08\u52A0\u5BC6\u901A\u9053\u4E0D\u53EF\u7528\uFF09'); });
  }
  function bindPinUi() {
    var save = el('lockPinSaveBtn'), clear = el('lockPinClearBtn'), i2 = el('lockPinConfirm');
    if (save && !save.dataset.bound) { save.dataset.bound = '1'; save.addEventListener('click', pinSave); }
    if (clear && !clear.dataset.bound) { clear.dataset.bound = '1'; clear.addEventListener('click', pinClear); }
    if (i2 && !i2.dataset.bound) { i2.dataset.bound = '1'; i2.addEventListener('keydown', function (e) { if (e.key === 'Enter') pinSave(); }); }
    refreshPinUi();
  }
  window.__settingsSafetyV831 = { rescan: rescan, toastAdvanced: toastAdvanced, openPinSetup: openPinSetup, pinSave: pinSave, pinClear: pinClear, pinRefresh: refreshPinUi, pinBind: bindPinUi };
  bindPinUi();
})();
`;
