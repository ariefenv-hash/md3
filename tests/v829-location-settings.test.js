// ==================== v8.29 #22⑦：位置信息三页 AOSP 权威转正 ====================
//
// 议题 #22 ⑦ location 转正守护（aosp-mirror main 实源逐 key 取证，考证链见
// settings.js LOCATION_PAGE_SCRIPT 头注）：
//   页 24 = res/xml/location_settings.xml（页顶 SwitchBar + recent 分区 MAX_APPS=3 +
//           advanced 分区 + footer 双形态；managed/private profile 两键隐藏注记）
//   页 25 = RecentLocationAccessSeeAllFragment（「查看全部」全量列表）
//   页 26 = res/xml/location_services.xml（WLAN 扫描 + 蓝牙扫描）
//   ① SettingsMainSwitchBar 形态映射（LocationSettings.java L92-101 实证）
//   ② 相对时间摘要 formatRelativeTime LONG 语义（createAppPreference L194-195）
//   ③ 设置态单一真源（geolocation API 单向，v8.01 SIM 裁决同律）
//   ④ two-pane location idx STUB→24
//
// 测试纪律（worklog 惯例）：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则
// 防注释误报；\u 零出现（源文件为字面 CJK）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.29 #22① LOCATION_PAGE_SCRIPT：真源与确定性数据基建', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('const LOCATION_PAGE_SCRIPT = `');
  expect(i).toBeGreaterThan(-1);
  const seg = s.slice(i, s.indexOf('// ==================== APPS_PAGE_SCRIPT', i));

  it('幂等守卫：window.__settingsLocationV829（v8.26 __aboutV826 同律，三页各内嵌一次不重复绑定）', () => {
    expect(seg).toContain('if (window.__settingsLocationV829) return;');
    expect(seg).toContain('window.__settingsLocationV829 = true;');
  });

  it('设置态单一真源：localStorage settings:location-v1 + 默认全开（AOSP 出厂默认）', () => {
    expect(seg).toContain("var KEY = 'settings:location-v1';");
    expect(seg).toContain('var DEF = { enabled: true, wifiScanning: true, btScanning: true };');
    expect(seg).toContain('JSON.parse(localStorage.getItem(KEY)');
    expect(seg).toContain('Object.assign({}, DEF');
  });

  it('虚构时间线确定性：6 项固定 seed（真机 AppOps 无 Web 对应 API；offset 恒定渲染恒定）', () => {
    expect(seg).toContain("name: '地图', mins: 8,");
    expect(seg).toContain("name: '天气', mins: 32,");
    expect(seg).toContain("name: '相机', mins: 120,");
    expect(seg).toContain("name: '通讯录', mins: 300,");
    expect(seg).toContain("name: '时钟', mins: 1560,");
    expect(seg).toContain("name: '文件', mins: 4320,");
  });

  it('MAX_APPS=3 AOSP 逐字（RecentLocationAccessPreferenceController L51）+ 主列表 slice 截断', () => {
    expect(seg).toContain('var MAX_APPS = 3;');
    expect(seg).toContain('RECENT.slice(0, MAX_APPS).map(recentRow)');
    expect(seg).toContain('RECENT.map(recentRow).join(\'\')');
  });

  it('相对时间 formatRelativeTime LONG zh 语义映射：分钟/小时/天三段', () => {
    expect(seg).toContain("return '刚刚';");
    expect(seg).toContain("return mins + ' 分钟前';");
    expect(seg).toContain("Math.floor(mins / 60) + ' 小时前'");
    expect(seg).toContain("Math.floor(mins / 1440) + ' 天前'");
  });

  it('摘要 plural other 形态插值：N 个应用（共 M 个应用）有权获取位置信息 + 关态「位置信息服务已关闭」', () => {
    expect(seg).toContain("RECENT.length + ' 个应用（共 ' + TOTAL_APPS + ' 个应用）有权获取位置信息'");
    expect(seg).toContain("return '位置信息服务已关闭';");
  });

  it('Recent 行形态同构：icon 圆底 + 应用名 + 相对时间摘要（createAppPreference L194-195）', () => {
    expect(seg).toContain("a.name.charAt(0)");
    expect(seg).toContain("relTime(a.mins)");
  });
});

describe('v8.29 #22② refresh 联动链（总开关联动五要素 + services 双开关）', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('const LOCATION_PAGE_SCRIPT = `');
  const seg = s.slice(i, s.indexOf('// ==================== APPS_PAGE_SCRIPT', i));

  it('总开关联动：locMainSwitch.checked + locAppPermSum 摘要 + locRecentGroup 整组隐藏（setVisible(enabled) 同构）', () => {
    expect(seg).toContain("document.getElementById('locMainSwitch')");
    expect(seg).toContain("sum.textContent = fmtAppPermSummary(s)");
    expect(seg).toContain("grp.style.display = s.enabled ? '' : 'none'");
  });

  it('#70 开关同步纪律：refresh 走 window.__setSwitchChecked 统一入口（防御降级紧凑形态豁免）', () => {
    expect(seg).toContain('var setSw = window.__setSwitchChecked||function(a,b){if(a)a.checked=!b};');
    expect(seg).toContain('setSw(sw, !!s.enabled)');
    expect(seg).toContain('setSw(wf, !!s.wifiScanning)');
    expect(seg).toContain('setSw(bt, !!s.btScanning)');
  });

  it('footer 双形态逐字：location_settings_footer_general / location_settings_footer_location_off', () => {
    expect(seg).toContain('具有附近设备权限的应用可以确定已连接设备的相对位置。');
    expect(seg).toContain('应用和服务的位置信息使用权处于关闭状态。在您拨打紧急电话号码或向该号码发送短信时，系统可能仍会将您的设备位置信息发送给紧急救援人员。');
  });

  it('空态 banner 完整 AOSP 语义保留：location_no_recent_accesses（L157，页 24 content 静态渲染）', () => {
    const j = s.indexOf('v8.29 #22⑦：位置信息三页');
    const content = s.slice(j, s.indexOf('  ],\n};', j));
    expect(content).toContain('最近没有任何应用访问位置信息');
    expect(content).toContain('id="locRecentEmpty"');
  });

  it('services 双开关持久化：locWifiScan/locBtScan onchange → save(store)', () => {
    expect(seg).toContain("document.getElementById('locWifiScan')");
    expect(seg).toContain("document.getElementById('locBtScan')");
    expect(seg).toContain('s.wifiScanning = !!wf.checked');
    expect(seg).toContain('s.btScanning = !!bt.checked');
  });

  it('eventBus 钩子：pageIdx 24/25/26 → refresh+bind（app-page-active）', () => {
    expect(seg).toContain('(e.detail.pageIdx === 24 || e.detail.pageIdx === 25 || e.detail.pageIdx === 26)');
    expect(seg).toContain("'app-page-active'");
  });
});

describe('v8.29 #22③ 页 24 content：location_settings.xml 1:1 形态', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('v8.29 #22⑦：位置信息三页');
  expect(i).toBeGreaterThan(-1);
  const seg = s.slice(i, s.indexOf('  ],\n};', i));

  it('页标题与副标题：位置信息（location_settings_title zh-rCN 权威值）', () => {
    expect(seg).toContain('近期访问、权限与服务（AOSP location_settings，浏览器 API 适配）');
  });

  it('页顶总开关 SettingsMainSwitchBar 映射：「使用位置信息」+ 带底色条形态（L92-101 实证）', () => {
    expect(seg).toContain('使用位置信息');
    expect(seg).toContain('background:var(--md-surface-variant,#eef0f4)');
    expect(seg).toContain('id="locMainSwitch"');
  });

  it('recent 分区权威值 + 查看全部 → 页 25（RecentLocationAccessSeeAllFragment）', () => {
    expect(seg).toContain('近期位置信息访问');
    expect(seg).toContain('查看全部');
    expect(seg).toContain('window.pushSubPage(25)');
  });

  it('advanced 分区：应用位置信息权限 + locAppPermSum 动态摘要', () => {
    expect(seg).toContain('应用位置信息权限');
    expect(seg).toContain('id="locAppPermSum"');
  });

  it('location_services 行 → 页 26（location_services_preference_title 权威值）', () => {
    expect(seg).toContain('位置信息服务');
    expect(seg).toContain('window.pushSubPage(26)');
  });

  it('DOM 契约：locRecentGroup/locRecentMain/locRecentEmpty/locFooter 四容器', () => {
    expect(seg).toContain('id="locRecentGroup"');
    expect(seg).toContain('id="locRecentMain"');
    expect(seg).toContain('id="locRecentEmpty"');
    expect(seg).toContain('id="locFooter"');
  });

  it('隐藏注记：managed_profile（无 managed profile 移除）+ private_profile（A17 新项，XML L42/L52 实证）', () => {
    expect(seg).toContain('managed_profile_location_switch');
    expect(seg).toContain('工作资料位置信息');
    expect(seg).toContain('private_profile_location_switch');
    expect(seg).toContain('私密空间的位置');
  });
});

describe('v8.29 #22④ 页 25/26 content：see_all 全览与 services 1:1', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('v8.29 #22⑦：位置信息三页');
  const seg = s.slice(i, s.indexOf('  ],\n};', i));

  it('页 25：近期位置信息访问全量列表（locRecentAll，无 MAX_APPS 截断）', () => {
    expect(seg).toContain('近期访问过位置信息的应用（AOSP RecentLocationAccessSeeAllFragment，全量列表）');
    expect(seg).toContain('id="locRecentAll"');
  });

  it('页 26：位置信息服务（location_services_screen_title 权威值）+ WLAN/蓝牙扫描双行', () => {
    expect(seg).toContain('扫描服务开关（AOSP location_services，SettingInjectorService 注入）');
    expect(seg).toContain('WLAN 扫描');
    expect(seg).toContain('蓝牙扫描');
    expect(seg).toContain('id="locWifiScan"');
    expect(seg).toContain('id="locBtScan"');
  });
});

describe('v8.29 #22⑤ two-pane 转正与注记', () => {
  const tp = src('ios-desktop/js/apps/settings-two-pane.js');

  it('location 项 idx STUB→24（页 24 转正）', () => {
    expect(tp).toContain("{ key: 'location', icon: 'topLocation', plate: 'cyan', label: '位置信息', sub: '应用位置权限', idx: 24, kw: 'gps 定位 位置权限' }");
  });

  it('STUB 注记更新：v8.29 位置信息转正页 24，剩余 5 项仍占位', () => {
    expect(tp).toContain('v8.29 位置信息转正页 24，剩余 5 项仍占位');
  });

  it('负断言：location 不再指向 STUB 占位（\b 词界防 STUB_IDX 前缀误匹配）', () => {
    const m = tp.match(/key: 'location'[^\n]*idx:\s*STUB_IDX/);
    expect(m).toBeNull();
  });
});

describe('v8.29 #22⑥ 权威文案与字符纪律', () => {
  const s = src('ios-desktop/js/apps/settings.js');

  it('zh-rCN 权威文案逐字：SwitchBar 标题 = location_settings_primary_switch_title「使用位置信息」', () => {
    expect(s).toContain('使用位置信息');
  });

  it('零 \\u 转义：location 段全部字面 CJK（Character Safety 源文件纪律）', () => {
    const i = s.indexOf('const LOCATION_PAGE_SCRIPT = `');
    const seg = s.slice(i, s.indexOf('// ==================== APPS_PAGE_SCRIPT', i));
    expect(seg).not.toMatch(/\\u[0-9a-fA-F]{4}/);
  });
});
