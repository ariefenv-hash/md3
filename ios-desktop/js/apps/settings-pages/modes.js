// ==================== settings-pages/modes.js — 页 27 模式（MODES_PAGE_SCRIPT 单源真身 · #284 批 2） ====================
//
// #284 批 2（R152 窗 · v11.07）：MODES_PAGE_SCRIPT 常量自 settings.js 整体搬迁至此——
// boundary-map §3.1 未来模块 settings-pages/ 命名兑现，G1 一次一簇最小子页试点（页 27
// 模式 v8.30 #22③，14 簇中最小）。G2 单源桥接禁双轨：本文件 = 常量唯一真源（export），
// settings.js 经 import 消费同一份；负向锚守护 = tests/modes-settings.test.js「G2 单源
// 桥接」组（settings.js 本体零 const MODES_PAGE_SCRIPT 残留，clock-core.js/.mjs 头注互指
// 纪律同款）。运行语义零漂移：settingsApp 页注册表 `<script>` + MODES_PAGE_SCRIPT +
// `</script>` 拼接面逐字节不变（消费点 = settings.js 模式页 content 尾段）。
//
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
export const MODES_PAGE_SCRIPT = `
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
