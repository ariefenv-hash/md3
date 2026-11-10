// ==================== settings-pages/accounts.js — 页 30 密码、通行密钥和账号（ACCOUNTS_PAGE_SCRIPT 单源真身 · #284 批 4） ====================
//
// #284 批 4（R153 窗 · v11.14）：ACCOUNTS_PAGE_SCRIPT 常量自 settings.js 整体搬迁至此——
// boundary-map §3.1 候选表顺位第一（页 30 密码、通行密钥和账号 v8.33 #22⑨，簇块 125 行 =
// 头注考证链 63 行 + 模板串 62 行）。G2 单源桥接禁双轨：本文件 = 常量唯一真源（export），
// settings.js 经 import 消费同一份；负向锚守护 = tests/accounts-settings.test.js「G2 单源
// 桥接」组（settings.js 本体零 const ACCOUNTS_PAGE_SCRIPT 残留，批 2/3 互指纪律同款）。
// 运行语义零漂移：settingsApp 页注册表 `<script>` + ACCOUNTS_PAGE_SCRIPT + `</script>`
// 拼接面逐字节不变（消费点 = settings.js 页 30 content 尾段）；簇模板串 __settingsCore
// 零引用（boundary-map §3.1 拆分风险注记核查：ACCOUNTS 簇委托面为零，迁移零委托行）。
//
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
export const ACCOUNTS_PAGE_SCRIPT = `
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
