// ==================== v8.30 #22③：模式页 AOSP 极简壳 1:1 转正 ====================
//
// 议题 #22 ③ modes 转正守护（aosp-mirror main 实源逐 key 取证，考证链见
// settings.js MODES_PAGE_SCRIPT 头注）：
//   页 27 = res/xml/modes_list_settings.xml（3 keys：TopIntro + zen_modes_list 动态分区 +
//           add_mode）——A17 Modes 极简壳，#22 注记「先考证再动」核验结论 = 壳 1:1 对齐 +
//           动态列表按纯净出厂态（仅勿扰）
//   ① ZenModesBackend.getModes()（SettingsLib 实拉）：首项恒为 Manual DND + 自动规则出厂空
//   ② ZenModesListItemPreference.setZenMode 行形态：title + getStatusText 四态摘要
//   ③ 勿扰摘要真源 = __qsTileState.get('modes')（QS modes 磁贴单一真源桥）
//   ④ add_mode 点击 toast（ZenModeNewCustomFragment 向导 Web 等价，v8.26 showLegal 同律）
//
// 测试纪律（worklog 惯例）：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则
// 防注释误报；\u 零出现（源文件为字面 CJK）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.30 #22① MODES_PAGE_SCRIPT：真源桥与状态语义', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('const MODES_PAGE_SCRIPT = `');
  expect(i).toBeGreaterThan(-1);
  const seg = s.slice(i, s.indexOf('// ==================== APPS_PAGE_SCRIPT', i));

  it('幂等守卫：window.__settingsModesV830（v8.26 同律）+ 导出面挂载', () => {
    expect(seg).toContain('if (window.__settingsModesV830) return;');
    expect(seg).toContain('window.__settingsModesV830 = true;');
    expect(seg).toContain("window.__settingsModesV830 = { refresh: refresh, toastAddMode: toastAddMode };");
  });

  it('勿扰摘要真源桥：window.__qsTileState.get(\'modes\')（QS modes 磁贴单一真源）', () => {
    expect(seg).toContain("window.__qsTileState.get('modes')");
  });

  it('状态摘要权威值：zen_mode_active_text「已启用」/ zen_mode_disabled_by_user「已停用」', () => {
    expect(seg).toContain("active ? '已启用' : '已停用'");
  });

  it('add_mode toast：模板选择向导 Web 等价提示（v8.26 showLegal 同律）', () => {
    expect(seg).toContain('模式模板选择向导后续版本转正');
    expect(seg).toContain('window.showSystemToast');
  });

  it('eventBus 钩子：pageIdx 27 → refresh（app-page-active）', () => {
    expect(seg).toContain('e.detail.pageIdx === 27');
    expect(seg).toContain("'app-page-active'");
  });
});

describe('v8.30 #22② 页 27 content：modes_list_settings.xml 3 keys 1:1', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('v8.30 #22③：模式页');
  expect(i).toBeGreaterThan(-1);
  const seg = s.slice(i, s.indexOf('  ],\n};', i));

  it('页标题「模式」（zen_modes_list_title zh-rCN 权威值）', () => {
    expect(seg).toContain('勿扰与专注模式（AOSP modes_list_settings，极简壳 1:1）');
  });

  it('TopIntroPreference：zen_modes_list_intro 权威值逐字', () => {
    expect(seg).toContain('利用适合睡眠、工作、驾车等场景的各种模式，减少干扰、保持专注。');
  });

  it('勿扰行（Manual DND 恒在首位）：topModes 图标 + modesDndSummary 摘要容器', () => {
    expect(seg).toContain('勿扰');
    expect(seg).toContain('id="modesDndSummary"');
    expect(seg).toContain("${AOSP_ICONS.topModes || ''}");
  });

  it('勿扰行跳转 → 页 9「多模式」（项目场景系统真管理入口映射注记）', () => {
    expect(seg).toContain('window.pushSubPage(9)');
    expect(seg).toContain('ZenModeFragment');
  });

  it('add_mode 行：「创建您的专属模式」权威值 + devAdd 图标 + toast 接线', () => {
    expect(seg).toContain('创建您的专属模式');
    expect(seg).toContain("${AOSP_ICONS.devAdd || ''}");
    expect(seg).toContain('window.__settingsModesV830.toastAddMode()');
  });
});

describe('v8.30 #22③ two-pane 转正与注记', () => {
  const tp = src('ios-desktop/js/apps/settings-two-pane.js');

  it('modes 项 idx STUB→27（页 27 转正）', () => {
    expect(tp).toContain("{ key: 'modes', icon: 'topModes', plate: 'pink', label: '模式', sub: '', idx: 27, kw: '场景 模式切换' }");
  });

  it('STUB 注记更新：v8.30 模式转正页 27、v8.31 安全和隐私转正页 28、v8.32 安全和紧急情况转正页 29、v8.33 密码通行密钥和账号转正页 30，剩余 0 项——v8.34 #22⑪ support 实证 UNSUPPORTED_ON_DEVICE 门控隐藏，#22 十一项全处置完毕', () => {
    expect(tp).toContain('v8.30 模式转正页 27、v8.31 安全和隐私转正页 28、v8.32 安全和紧急情况转正页 29、v8.33 密码通行密钥和账号转正页 30，剩余 0 项——v8.34 #22⑪ support 实证 UNSUPPORTED_ON_DEVICE 门控隐藏，#22 十一项全处置完毕');
  });

  it('负断言：modes 不再指向 STUB 占位', () => {
    const m = tp.match(/key: 'modes'[^\n]*idx:\s*STUB_IDX/);
    expect(m).toBeNull();
  });
});

describe('v8.30 #22④ 字符纪律', () => {
  const s = src('ios-desktop/js/apps/settings.js');

  it('零 \\u 转义：modes 段全部字面 CJK（Character Safety 源文件纪律）', () => {
    const i = s.indexOf('const MODES_PAGE_SCRIPT = `');
    const seg = s.slice(i, s.indexOf('// ==================== APPS_PAGE_SCRIPT', i));
    expect(seg).not.toMatch(/\\u[0-9a-fA-F]{4}/);
  });
});
