// ==================== v805-apps-subpage.test.js — #23 差距矩阵③回审计守护 ====================
// ①应用子页（页 6）apps.xml 权威条目链（11 keys/3 分区，运行时互斥区 + 渲染 3 行 + 隐藏注记）
// ②values-zh-rCN 权威文案锚定（应用/最近打开的应用/查看所有 N 个应用/已安装 N 个应用/
//   默认应用/闲置应用/N 个闲置应用/特殊应用权限/宽高比（实验性功能）等非直译值）
// ③controller 门控裁决实证（config_cloned_apps_page_enabled=false :785；
//   config_app_battery_usage_list_enabled=false :737；
//   config_appCompatUserAppAspectRatioSettingsIsEnabled=false frameworks:6268；
//   enable_contacts_default_account_in_settings 无 default + 账户栈缺失双证）
// ④单一真源：window.__settingsAppsBridge.recent() ← recent-apps.js getRecentAppsList
//   （recordAppOpened 全库唯一最近记录链）；AppsPreferenceController SHOW_RECENT_APP_COUNT=4
// ⑤图标忠实性：XML 唯一静态图标 ic_chevron_right_24dp（appsChevron 键）+ 最近行应用图标；
//   其余行零图标（v8.04 先例）
// ⑥Web 扩展卡保留（铁律#2 合法超越：卸载/恢复 postMessage 链 + 文件夹桥）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

describe('v8.05 #23③ — 一级菜单 apps 行', () => {
  const tp = R('ios-desktop/js/apps/settings-two-pane.js');

  it('apps 行 idx 6 + 权威 label「应用」+ 副题对齐渲染内容', () => {
    expect(tp).toContain("key: 'apps', icon: 'topApps', plate: 'blue', label: '应用', sub: '最近使用的应用、默认应用', idx: 6");
  });
});

describe('v8.05 #23③ — 页 6 标题与 XML 权威条目链（11 keys/3 分区）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('PreferenceScreen 标题 = apps_dashboard_title「应用」（脱离旧「应用管理」历史实现）', () => {
    expect(s).toContain("// 页 6：应用（AppDashboardFragment 1:1 + Web 扩展卡）");
    expect(s).toContain("title: '应用',");
    expect(s).toContain('最近打开的应用、默认应用、闲置应用（AOSP AppDashboardFragment）');
  });

  it('order 权威序全链锚定（-999→22）', () => {
    expect(s).toContain('all_app_infos(-999) → recent_apps_category(-998)');
    expect(s).toContain('[see_all_apps(5)] → general_category(-997) → default_apps(-996) → cloned_apps(-995)');
    expect(s).toContain('dashboard_tile_placeholder(10) → contacts_storage(13) → hibernated_apps(15)');
    expect(s).toContain('app_battery_usage(17) → special_access(20) → advanced_category(21)[aspect_ratio_apps(22)]');
  });

  it('fragment = AppDashboardFragment（R.xml.apps + onAttach use() 双注册）', () => {
    expect(s).toContain('fragment = AppDashboardFragment');
    expect(s).toContain('getPreferenceScreenResId=R.xml.apps');
    expect(s).toContain('AppsPreferenceController + HibernatedAppsPreferenceController');
  });
});

describe('v8.05 #23③ — 运行时互斥区（AppsPreferenceController 语义）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('recent_apps_category「最近打开的应用」分区头渲染（唯一可见分区头）', () => {
    expect(s).toContain('data-test="apps-recent-category"');
    expect(s).toContain('>最近打开的应用</div>');
    expect(s).toContain('SHOW_RECENT_APP_COUNT=4');
  });

  it('all_app_infos XOR recent 运行时互斥（refreshUi 同构：互斥分支 + hidden 初始）', () => {
    expect(s).toContain("allRow.style.display = 'none';");
    expect(s).toContain("cat.style.display = 'none';");
    expect(s).toContain('display:none;align-items:center');
    expect(s).toContain('data-test="apps-all-info"');
  });

  it('appEntry == null → continue 同构（已卸载 id 从最近列表剔除）', () => {
    expect(s).toContain(".filter(function(id) { return !!map[id]; }); // appEntry == null → continue 同构");
  });

  it('see_all_apps 标题动态替换 = see_all_apps_title ICU 复数（=1 无计数/other 带 N）', () => {
    expect(s).toContain("ids.length === 1 ? '查看所有应用' : '查看所有 ' + ids.length + ' 个应用'");
  });

  it('all_app_infos 摘要动态覆盖 = apps_summary「已安装 N 个应用」（summary_placeholder 忠实空起步）', () => {
    expect(s).toContain("'已安装 ' + ids.length + ' 个应用'");
  });

  it('最近行 ≤4 + AppPreference 图标+名（__getAppIconSVG 与桌面同源）', () => {
    expect(s).toContain('recentAll.slice(0, 4)');
    expect(s).toContain('data-test="apps-recent-row"');
    expect(s).toContain("window.__getAppIconSVG(id)");
  });
});

describe('v8.05 #23③ — 渲染 3 行（AVAILABLE 实证）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('default_apps：DefaultAppsPreferenceController AVAILABLE 恒真 + RoleManager 三角色 ListFormatter', () => {
    expect(s).toContain('DefaultAppsPreferenceController AVAILABLE 恒真');
    expect(s).toContain('ROLE_BROWSER/ROLE_DIALER/ROLE_SMS');
    expect(s).toContain("var roleIds = ['safari', 'phone', 'msg'];");
    expect(s).toContain("arr.slice(0, -1).join('、') + '和' + arr[arr.length - 1]");
    expect(s).toContain('data-test="apps-default-apps"');
    expect(s).toContain('id="appsDefaultSub"');
  });

  it('hibernated_apps：isHibernationEnabled=DeviceConfig 默认 true → AVAILABLE + unused_apps_summary', () => {
    expect(s).toContain('PROPERTY_APP_HIBERNATION_ENABLED 默认 true) →');
    expect(s).toContain("unused + ' 个闲置应用'");
    expect(s).toContain('PermissionControllerManager.getUnusedAppCount');
    expect(s).toContain('data-test="apps-hibernated"');
    expect(s).toContain('id="appsUnusedSub"');
  });

  it('special_access：XML 无 settings:controller → 恒渲染（fragment=SpecialAccessSettings 未转正忠实入口行）', () => {
    expect(s).toContain('XML 无 settings:controller →');
    expect(s).toContain('fragment=SpecialAccessSettings');
    expect(s).toContain('data-test="apps-special-access"');
    expect(s).toContain('>特殊应用权限</span>');
  });
});

describe('v8.05 #23③ — 隐藏注记（controller 实证逐条）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('cloned_apps：config_cloned_apps_page_enabled=false（Settings config.xml:785）双证隐藏', () => {
    expect(s).toContain('cloned_apps（order -995）「克隆应用」：ClonedAppsPreferenceController');
    expect(s).toContain('PROPERTY_CLONED_APPS_ENABLED 默认 true');
    expect(s).toContain('config_cloned_apps_page_enabled=false');
    expect(s).toContain('res/values/config.xml:785');
    expect(s).not.toContain('data-test="apps-cloned"');
  });

  it('contacts_storage：enable_contacts_default_account_in_settings 无 default + 账户栈缺失双证', () => {
    expect(s).toContain('contacts_storage（order 13）「联系人存储」：ContactsStoragePreferenceController');
    expect(s).toContain('enable_contacts_default_account_in_settings');
    expect(s).toContain('mCurrentDefaultAccountAndState != null');
    expect(s).not.toContain('data-test="apps-contacts"');
  });

  it('app_battery_usage：config_app_battery_usage_list_enabled=false（Settings config.xml:737）', () => {
    expect(s).toContain('app_battery_usage（order 17）「应用的电池使用情况」');
    expect(s).toContain('config_app_battery_usage_list_enabled=false');
    expect(s).toContain('res/values/config.xml:737');
    expect(s).not.toContain('data-test="apps-battery-usage"');
  });

  it('advanced_category/aspect_ratio_apps：config_appCompatUserAppAspectRatioSettingsIsEnabled=false（frameworks:6268）', () => {
    expect(s).toContain('advanced_category（order 21）「高级」：AdvancedAppsPreferenceCategoryController');
    expect(s).toContain('aspect_ratio_apps（order 22）「宽高比（实验性功能）」');
    expect(s).toContain('KEY_ENABLE_USER_ASPECT_RATIO_SETTINGS 默认 true');
    expect(s).toContain('config_appCompatUserAppAspectRatioSettingsIsEnabled=false');
    expect(s).toContain('res/values/config.xml:6268');
    expect(s).not.toContain('data-test="apps-aspect-ratio"');
  });

  it('general_category XML gone + dashboard_tile_placeholder 空占位 → 隐藏注记', () => {
    expect(s).toContain('general_category（order -997）「常规」：XML android:visibility="gone" 空分类');
    expect(s).toContain('dashboard_tile_placeholder（order 10）：无标题空占位分类');
  });
});

describe('v8.05 #23③ — 单一真源与接线', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('APPS_PAGE_SCRIPT 模块级常量 + <script> 挂接', () => {
    expect(s).toContain('const APPS_PAGE_SCRIPT = `');
    expect(s).toContain('<script>` + APPS_PAGE_SCRIPT + `</script>');
  });

  it('recent-apps.js getRecentAppsList 单一真源 import + __settingsAppsBridge 桥', () => {
    expect(s).toContain("import { getRecentAppsList } from '../recent-apps.js';");
    expect(s).toContain('window.__settingsAppsBridge = {');
    expect(s).toContain('recent: () => getRecentAppsList().slice(),');
  });

  it('页 6 挂载接线 pageIdx === 6（app-page-active 回同步，两脚本各自监听）', () => {
    expect(s).toContain("if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 6) render();");
  });
});

describe('v8.05 #23③ — 图标忠实性（XML 唯一静态图标）', () => {
  const s = R('ios-desktop/js/apps/settings.js');
  const ic = R('ios-desktop/js/icons-aosp.js');

  it('icons-aosp +appsChevron（ic_chevron_right_24dp 逐 path 实证：autoMirrored + tint currentColor）', () => {
    expect(ic).toContain('appsChevron');
    expect(ic).toContain('M9.71,18.71l-1.42,-1.42l5.3,-5.29l-5.3,-5.29l1.42,-1.42l6.7,6.71z');
  });

  it('页 6 AOSP 区仅 see_all 行引用 appsChevron（其余行零 AOSP_ICONS，v8.04 先例）', () => {
    const start = s.indexOf("// 页 6：应用（AppDashboardFragment 1:1 + Web 扩展卡）");
    const end = s.indexOf("// 页 7：存储空间占用");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = s.slice(start, end);
    expect(block).toContain('AOSP_ICONS.appsChevron');
    expect(block.match(/AOSP_ICONS\./g)?.length).toBe(1); // 唯一静态图标
    expect(block.match(/(?<![A-Z_])ICONS\./g)).toBeNull(); // 无 ICONS 裸引用（AOSP_ 前缀除外）
  });
});

describe('v8.05 #23③ — Web 扩展卡保留（铁律#2 合法超越）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('卸载/恢复真实功能完整保留（postMessage 链 + 文件夹桥 + 恢复区）', () => {
    expect(s).toContain('data-test="apps-mgmt"');
    expect(s).toContain('id="installedAppsList"');
    expect(s).toContain('id="appMgmtRemovedSection"');
    expect(s).toContain("postToDesktop('uninstall-app', id)");
    expect(s).toContain("postToDesktop('restore-app', btn.getAttribute('data-app-id'))");
    expect(s).toContain('window.__settingsFolderUninstall');
  });

  it('扩展卡带合法超越标注（AOSP XML 无对应条目）', () => {
    expect(s).toContain('Web 扩展 · 合法超越');
    expect(s).toContain('AOSP apps.xml 无「卸载/恢复」对应条目');
  });

  it('audit-E 文件夹递归展开修复不回退', () => {
    expect(s).toContain("app.type === 'folder'");
    expect(s).toContain('fix(audit-E)');
  });
});
