// ==================== settings-pages/safety.js — 页 28 安全和隐私（SAFETY_PAGE_SCRIPT 单源真身 · #284 批 5） ====================
//
// #284 批 5（R154 窗 · v11.13）：SAFETY_PAGE_SCRIPT 常量自 settings.js 整体搬迁至此——
// boundary-map §3.1 候选表顺位第一（页 28 安全和隐私 v8.31 #22⑤⑥，簇块 135 行 =
// 头注考证链 30 行 + 模板串 105 行）。G2 单源桥接禁双轨：本文件 = 常量唯一真源（export），
// settings.js 经 import 消费同一份；负向锚守护 = tests/safety-settings.test.js「G2 单源
// 桥接」组（settings.js 本体零 const SAFETY_PAGE_SCRIPT 残留，批 2/3/4 互指纪律同款）。
// 运行语义零漂移：settingsApp 页注册表 `<script>` + SAFETY_PAGE_SCRIPT + `</script>`
// 拼接面逐字节不变（消费点 = settings.js 页 28 content 尾段）；簇模板串零 `${` 插值
// （boundary-map §3.1 拆分风险注记核查：SAFETY 簇自包含 IIFE，桥接全走 window.* 宿主面，
// 幂等守卫 window.__settingsSafetyV831 随簇走，迁移零委托行）。
//
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
//   v11.13 #210 转正：「屏幕锁定」行 toast 占位退役 → PIN 设置卡（ChooseLockGeneric
//   Web 等价：双输 + 弱密码警告不阻断 #185 assessPassword + hashPassword 落库 +
//   清除验证链；行摘要 summary 动态化 无/PIN 同构 Settings 当前锁定方式展示；
//   window.__lockPin 桥消费零 import——lock-screen.js 安装，v11.13 setFace 桥同款）
export const SAFETY_PAGE_SCRIPT = `
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
  function toastAdvanced() {
    toast('更多安全设置页后续版本转正'); // SecurityAdvancedSettings Web 等价提示
  }
  // ===== v11.13 #210：屏幕锁定 PIN 转正（ChooseLockGeneric Web 等价——v8.31 占位 toast 退役） =====
  function lp() { return window.__lockPin || null; }
  function el(id) { return document.getElementById(id); }
  function showWarning(text) {
    var w = el('lockPinWarning');
    if (!w) return;
    if (text) { w.textContent = text; w.style.display = 'block'; }
    else { w.textContent = ''; w.style.display = 'none'; }
  }
  // 行摘要动态化（Settings 屏幕锁定 summary 同构：无 / PIN）
  function refreshPinUi() {
    var api = lp();
    var has = !!(api && api.store && api.store.has && api.store.has());
    var summary = el('lockMethodSummary');
    if (summary) summary.textContent = has ? 'PIN' : '无';
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
    if (!api || !api.store) { toast('PIN 服务未就绪'); return; }
    var i1 = el('lockPinInput'), i2 = el('lockPinConfirm');
    var a = i1 ? i1.value : '';
    var b = i2 ? i2.value : '';
    var v = api.validatePinCandidate(a);
    if (!v.ok) { showWarning(v.reason); return; }
    if (a !== b) { showWarning('两次输入不一致，请重新输入'); return; }
    // 弱密码警告（#185 assessPassword——只警告不阻断，NightSky「不改也行」取向逐字承袭）
    var assess = api.assessPassword(a);
    if (assess.weak) {
      var details = assess.reasons.map(function (r) { return r.detail; }).join('、');
      showWarning('您所设置的密码不安全（' + details + '），他人可能会轻易猜到，建议更改（不改也行）。');
    }
    // 保存链（hashPassword PBKDF2-SHA256 加盐——#185 安全纪律「禁裸 MD5」正面兑现）；
    // 弱密码警告持久可见（保存成功不清除——「只警告不阻断」语义的可见性兑现，下次开卡才清）
    api.hashPassword(a).then(function (r) {
      api.store.setPin(r.hashHex, r.saltHex, r.iterations);
      if (i1) i1.value = '';
      if (i2) i2.value = '';
      toast('屏幕锁定已更新为 PIN');
      refreshPinUi();
      var card = el('lockPinCard');
      if (card) card.hidden = true;
    }).catch(function () { showWarning('PIN 保存失败（加密通道不可用）'); });
  }
  function pinClear() {
    var api = lp();
    if (!api || !api.store) { toast('PIN 服务未就绪'); return; }
    if (!api.store.has()) { toast('尚未设置 PIN'); return; }
    var i1 = el('lockPinInput');
    var a = i1 ? i1.value : '';
    if (!a) { showWarning('请先在上方输入当前 PIN 验证后再清除'); return; }
    var snap = api.store.snapshot();
    api.verifyPassword(a, { hashHex: snap.hashHex, saltHex: snap.saltHex, iterations: snap.iterations }).then(function (ok) {
      if (!ok) { showWarning('当前 PIN 不正确'); return; }
      api.store.clearPin();
      var i2 = el('lockPinConfirm');
      if (i1) i1.value = '';
      if (i2) i2.value = '';
      showWarning('');
      toast('已清除屏幕锁定 PIN');
      refreshPinUi();
    }).catch(function () { showWarning('PIN 校验失败（加密通道不可用）'); });
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
