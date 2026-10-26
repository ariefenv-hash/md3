// ==================== v8.33 #22⑨：密码、通行密钥和账号页 accounts credman 形态 1:1 转正 ====================
//
// 议题 #22 ⑨ accounts 转正守护（aosp-mirror main 实源逐 key 取证，考证链见
// settings.js ACCOUNTS_PAGE_SCRIPT 头注）：
//   二选一裁决 = AccountDashboardFragment.getPreferenceLayoutResId()：
//     CredentialManager.isServiceEnabled → CredmanService.isServiceEnabled →
//     DeviceConfig.getBoolean(NAMESPACE_CREDENTIAL, "enable_credential_manager", true)
//     出厂默认 true → A17 纯净态走 accounts_dashboard_settings_credman.xml（2985B）
//   页 30 = credman 形态 8 keys 全对齐：
//     TopIntroPreference / default_service_category(10)+default_credman_autofill_main /
//     credman_category(20) / dashboard_tile_placeholder(130) /
//     auto_sync_account_data(202) / auto_sync_work_account_data(203，forWork 隐藏注记) /
//     auto_sync_personal_account_data(204，隐藏注记)
//   结构性零虚构：①credman_category 无 provider 整组隐藏（isHiddenDueToNoProviderSet）
//     ②账号 category 仅 add_account 行（纯净出厂无账号；#22⑨「接 mail/contacts」注记
//     核验 = 两应用零结构化账号真源）③work/personal profile 门控隐藏
//   auto_sync 语义 = AutoSyncDataPreferenceController：真源 getMasterSyncAutomatically、
//     ConfirmAutoSyncChangeFragment 确认弹窗四文案（on_dialog message = res-product
//     英文权威值 zh MISS 留痕）
//
// 测试纪律（worklog 惯例）：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则
// 防注释误报；\u 零出现（源文件为字面 CJK）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.33 #22⑨ 页 30 content：accounts_dashboard_settings_credman.xml 1:1', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('v8.33 #22⑨：密码、通行密钥和账号页');
  expect(i).toBeGreaterThan(-1);
  const seg = s.slice(i, s.indexOf('  ],\n};', i));

  it('页标题「密码、通行密钥和账号」（account_dashboard_title_with_passkeys zh-rCN 权威值）', () => {
    expect(seg).toContain("title: '密码、通行密钥和账号'");
    expect(s).toContain('account_dashboard_title_with_passkeys');
  });

  it('TopIntroPreference：credman_main_settings_intro_text 权威全文逐字', () => {
    expect(seg).toContain('选择您希望哪项服务来存储用于登录和自动填充建议的数据。如果您希望其他服务也提供建议，请开启相应服务。');
    expect(seg).toContain('credman_main_settings_intro_text');
  });

  it('default_service_category（order 10）：「首选服务」+ topProvider=null → 「未选择任何内容」（credman_app_list_preference_none）+ toastPickProvider 接线', () => {
    expect(seg).toContain('首选服务');
    expect(seg).toContain('未选择任何内容');
    expect(seg).toContain('credman_app_list_preference_none');
    expect(seg).toContain('toastPickProvider');
  });

  it('credman_category（order 20）「其他服务」：isHiddenDueToNoProviderSet 无服务商整组隐藏注记（结构性配置零虚构）', () => {
    expect(seg).toContain('credman_credentials');
    expect(seg).toContain('isHiddenDueToNoProviderSet');
    expect(seg).toContain('无服务商整组隐藏');
  });

  it('dashboard_tile_placeholder（order 130）→ 账号 category「账号」（account_settings）+ add_account 行「添加账号」+ devAdd 图标接线', () => {
    expect(seg).toContain('dashboard_tile_placeholder');
    expect(seg).toContain('account_settings');
    expect(seg).toContain('添加账号');
    expect(seg).toContain('add_account_label');
    expect(seg).toContain("${AOSP_ICONS.devAdd || ''}");
    expect(seg).toContain('toastAddAccount');
  });

  it('#22⑨「接 mail/contacts 既有账号数据」核验注记：零结构化账号真源不虚构', () => {
    expect(s).toContain('mail.js 仅邮件文本内容');
    expect(seg).toContain('不虚构列表');
  });

  it('auto_sync_account_data（order 202）：title/summary 权威值 + acSyncToggle 接线 + ConfirmAutoSyncChangeFragment 弹窗语义', () => {
    expect(seg).toContain('自动同步应用数据');
    expect(seg).toContain('让应用自动刷新数据');
    expect(seg).toContain('auto_sync_account_title');
    expect(seg).toContain('auto_sync_account_summary');
    expect(seg).toContain('id="acSyncToggle"');
    expect(seg).toContain('ConfirmAutoSyncChangeFragment');
  });

  it('work/personal 变体（order 203/204）：profile 门控隐藏注记（纯净出厂无 work profile/private space）', () => {
    expect(seg).toContain('auto_sync_work_account_data');
    expect(seg).toContain('auto_sync_personal_account_data');
    expect(seg).toContain('profile 门控');
  });

  it('确认弹窗 DOM：acSyncDialog 页内 overlay + cancelSync/confirmSync 接线', () => {
    expect(seg).toContain('id="acSyncDialog"');
    expect(seg).toContain('cancelSync');
    expect(seg).toContain('confirmSync');
  });
});

describe('v8.33 #22⑨ ACCOUNTS_PAGE_SCRIPT：开关真源 + 确认弹窗语义', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('const ACCOUNTS_PAGE_SCRIPT = `');
  expect(i).toBeGreaterThan(-1);
  const end = s.indexOf('`;', i);
  const seg = s.slice(i, end);

  it('幂等守卫 __settingsAccountsV833 + localStorage 单一真源 settings:accounts-v1（v8.29 location 同律）', () => {
    expect(seg).toContain('if (window.__settingsAccountsV833) return;');
    expect(seg).toContain("KEY = 'settings:accounts-v1'");
    expect(seg).toContain('autoSync: true');
  });

  it('#70 开关同步：setSw 走 __setSwitchChecked 统一入口（模板内防御降级形态 a.checked=!!b 豁免式）', () => {
    expect(seg).toContain('window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b}');
    expect(seg).toContain('#70');
  });

  it('关闭分支四文案：data_usage_auto_sync_off_dialog_title + off_dialog zh 权威全值逐字', () => {
    expect(seg).toContain('要关闭自动同步数据功能吗？');
    expect(seg).toContain('关闭后可以节省数据流量和电池电量，但您需要手动同步每个账号才能获得最新信息，并且在有更新时不会收到通知。');
    expect(seg).toContain('data_usage_auto_sync_off_dialog');
  });

  it('开启分支：data_usage_auto_sync_on_dialog_title zh 权威 + message 英文权威值（res-product 平板口径，zh MISS 留痕 1:1 呈现）', () => {
    expect(seg).toContain('要打开自动同步数据功能吗？');
    expect(seg).toContain('Any changes you make to your accounts on the web will be automatically copied to your tablet.');
    expect(seg).toContain('A Google Account works this way.');
    expect(seg).toContain('data_usage_auto_sync_on_dialog');
  });

  it('确认写真源（dataset.pending → save）+ 取消视觉回滚（updateState 重读真源语义）+ refresh DOM 复用恢复', () => {
    expect(seg).toContain('dataset.pending');
    expect(seg).toContain("save({ autoSync: on })");
    expect(seg).toContain('setSw(!!load().autoSync)');
    expect(seg).toContain('function refresh()');
  });

  it('AOSP 视觉先翻转语义注记（handlePreferenceTreeClick L46 setChecked(!checked) 先行）', () => {
    expect(seg).toContain('视觉先翻转');
  });

  it('初始 refresh + app-page-active 重同步链（pageIdx 30，v8.29 location 同款 bindDoc 惯例）', () => {
    expect(seg).toContain('refresh(); // 初始恢复（localStorage 空 = 出厂态 autoSync true）');
    expect(seg).toContain("e.detail.pageIdx === 30");
    expect(seg).toContain('__bindAppDocListener');
  });
});

describe('v8.33 #22⑨ 二选一裁决取证链：credman 形态门控注记', () => {
  const s = src('ios-desktop/js/apps/settings.js');

  it('getPreferenceLayoutResId 判定链注记在位（AccountDashboardFragment → CredentialManager.isServiceEnabled → DeviceConfig）', () => {
    expect(s).toContain('getPreferenceLayoutResId');
    expect(s).toContain('CredentialManager.isServiceEnabled');
    expect(s).toContain('enable_credential_manager');
    expect(s).toContain('NAMESPACE_CREDENTIAL');
  });

  it('出厂默认 true → credman 形态裁决 + 传统形态 passwords_category 落选注记', () => {
    expect(s).toContain('出厂默认 true → A17 纯净态走 credman 形态');
    expect(s).toContain('passwords_category');
    expect(s).toContain('落选留注记');
  });
});

describe('v8.33 #22⑨ two-pane 转正与注记', () => {
  const tp = src('ios-desktop/js/apps/settings-two-pane.js');

  it('accounts 行 idx: 30 转正（credman 形态注记）', () => {
    expect(tp).toContain("key: 'accounts', icon: 'topAccounts', plate: 'cyan', label: '密码、通行密钥和账号', sub: '', idx: 30");
    expect(tp).toContain('v8.33 #22⑨ 转正：AccountDashboardFragment.getPreferenceLayoutResId 实拉');
  });

  it('STUB 注记更新：v8.33 密码通行密钥和账号转正页 30，剩余 0 项——v8.34 #22⑪ support 实证 UNSUPPORTED_ON_DEVICE 门控隐藏，#22 十一项全处置完毕', () => {
    expect(tp).toContain('v8.33 密码通行密钥和账号转正页 30，剩余 0 项——v8.34 #22⑪ support 实证 UNSUPPORTED_ON_DEVICE 门控隐藏，#22 十一项全处置完毕');
    expect(tp).not.toMatch(/剩余 2 项仍占位/);
  });
});

describe('v8.33 #22⑨ 字符纪律', () => {
  it('新增段零 emoji（源文件为字面 CJK + ASCII）', () => {
    const s = src('ios-desktop/js/apps/settings.js');
    const i = s.indexOf('v8.33 #22⑨：密码、通行密钥和账号页');
    const seg = s.slice(i, s.indexOf('  ],\n};', i));
    const scriptI = s.indexOf('const ACCOUNTS_PAGE_SCRIPT = `');
    const scriptSeg = s.slice(scriptI, s.indexOf('`;', scriptI));
    const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(seg).not.toMatch(emojiRe);
    expect(scriptSeg).not.toMatch(emojiRe);
  });

  it('v811 裸赋值纪律：ACCOUNTS_PAGE_SCRIPT 无带空格裸赋值（豁免形态 a.checked=!!b 唯一）', () => {
    const s = src('ios-desktop/js/apps/settings.js');
    const i = s.indexOf('const ACCOUNTS_PAGE_SCRIPT = `');
    const seg = s.slice(i, s.indexOf('`;', i));
    const bare = (seg.match(/[^.\w]([\w$]+)\.checked\s*=[^=]/g) || [])
      .filter((m) => !m.includes('a.checked=!'));   // v811 同款豁免形态（无空格降级函数）
    expect(bare).toEqual([]);
  });
});
