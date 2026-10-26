// ==================== v801-notifications-subpage.test.js — #10 四期回归守护 ====================
// ①通知子页（页 19）configure_notification_settings.xml 权威条目链与分区序（28 keys/5 分区）
// ②values-zh-rCN 权威文案锚定 ③controller 门控裁决（BasePreferenceController.isAvailable
//   白名单：CONDITIONALLY_UNAVAILABLE/UNSUPPORTED_ON_DEVICE 均不渲染）④真实数据接线
//   （notification_history/conversations 动态摘要 + 历史面板同源直读 + escapeHtml）
// ⑤单一真源 __settingsNotifsStore（localStorage settings:notifications-v1）与三选对话框
// ⑥一级菜单 notifications 行直通页 19
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

describe('v8.01 #10 四期 — 一级菜单 notifications 行直通', () => {
  const tp = R('ios-desktop/js/apps/settings-two-pane.js');

  it('notifications 行 idx 直通页 19（脱离 STUB_IDX 占位）', () => {
    expect(tp).toContain("key: 'notifications', icon: 'topNotifications', plate: 'pink', label: '通知', sub: '历史通知、对话', idx: 19");
  });

  it('STUB 注释更新为剩余 7 项（v8.01 重锚：v8.02 无障碍转正页 20 后 modes/safety 等仍占位）', () => {
    // v8.02 重锚：accessibility 行随页 20 转正脱离 STUB（见 v802-accessibility-subpage.test.js）
    expect(tp).toContain('v8.29 位置信息转正页 24、v8.30 模式转正页 27、v8.31 安全和隐私转正页 28、v8.32 安全和紧急情况转正页 29、v8.33 密码通行密钥和账号转正页 30，剩余 1 项仍占位');
  });
});

describe('v8.01 #10 四期 — 通知子页（页 19）权威条目链', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('PreferenceScreen 标题 = configure_notification_settings「通知」', () => {
    expect(s).toContain("title: '通知',");
    expect(s).toContain('AOSP NotificationSettings');
  });

  it('分区 ① general_notifications_category「管理」（general_notification_header 权威值非「一般通知」）', () => {
    expect(s).toContain('>管理</div>');
  });

  it('分区 ② conversation_category「对话」（conversation_notifs_category）', () => {
    expect(s).toContain('>对话</div>');
  });

  it('分区 ③ configure_notifications_lock「隐私」（lock_screen_notifications_title 权威值非「锁定屏幕上的通知」）', () => {
    expect(s).toContain('>隐私</div>');
  });

  it('分区 ⑤ advanced_section_header「常规」（权威值非「高级」）', () => {
    expect(s).toContain('>常规</div>');
  });

  it('all_notifications（order 10）「应用通知」+ 权威摘要「控制来自各个应用的通知」', () => {
    expect(s).toContain('应用通知');
    expect(s).toContain('控制来自各个应用的通知');
  });

  it('notification_history（order 11）「历史通知」+ 动态摘要元素 notifHistorySub', () => {
    expect(s).toContain('历史通知');
    expect(s).toContain('id="notifHistorySub"');
  });

  it('conversations（order 1）「对话」+ 动态摘要元素 notifConvoSub', () => {
    expect(s).toContain('id="notifConvoSub"');
  });

  it('notification_bubbles（order 2）「消息气泡」+ 开启态权威摘要', () => {
    expect(s).toContain('消息气泡');
    expect(s).toContain('已开启/对话能以浮动图标形式显示');
  });

  it('notification_access（order 12）「读取、回复和控制通知」+ 权威摘要', () => {
    expect(s).toContain('读取、回复和控制通知');
    expect(s).toContain('控制哪些应用和设备能够读取通知');
  });

  it('lock_screen_notifications（order 13）「锁屏通知」+ 动态摘要元素 notifLockSub', () => {
    expect(s).toContain('锁屏通知');
    expect(s).toContain('id="notifLockSub"');
  });

  it('lock_screen_redact（order 15）「敏感通知」+ 权威摘要「锁屏时显示敏感内容」+ 开关', () => {
    expect(s).toContain('敏感通知');
    expect(s).toContain('锁屏时显示敏感内容');
    expect(s).toContain('id="notifRedactToggle"');
  });

  it('app_and_notif_cell_broadcast_settings（order 23）「无线紧急警报」', () => {
    expect(s).toContain('无线紧急警报');
  });

  it('silent_icons（order 24）「隐藏状态栏中的静音通知」+ 开关', () => {
    expect(s).toContain('隐藏状态栏中的静音通知');
    expect(s).toContain('id="notifSilentToggle"');
  });

  it('show_snooze_options（order 25）「允许显示通知延后选项」+ 开关', () => {
    expect(s).toContain('允许显示通知延后选项');
    expect(s).toContain('id="notifSnoozeToggle"');
  });

  it('notification_badging（order 26）「应用图标上的通知圆点」+ 开关', () => {
    expect(s).toContain('应用图标上的通知圆点');
    expect(s).toContain('id="notifBadgingToggle"');
  });

  it('notification_assistant（order 28）「增强型通知」+ 权威摘要「接收建议的操作、回复等内容」+ 开关', () => {
    expect(s).toContain('增强型通知');
    expect(s).toContain('接收建议的操作、回复等内容');
    expect(s).toContain('id="notifAssistantToggle"');
  });
});

describe('v8.01 #10 四期 — controller 门控语义注记（实证裁决链）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('门控裁决权威注记：BasePreferenceController.isAvailable 白名单（CONDITIONALLY_UNAVAILABLE/UNSUPPORTED 不渲染）', () => {
    expect(s).toContain('BasePreferenceController.isAvailable');
    expect(s).toContain('CONDITIONALLY_UNAVAILABLE');
    expect(s).toContain('UNSUPPORTED_ON_DEVICE');
  });

  it('bundle_notifications_preference 门控注记（notificationClassificationUi=false → CONDITIONALLY_UNAVAILABLE）', () => {
    expect(s).toContain('bundle_notifications_preference');
    expect(s).toContain('BundlePreferenceController 门控隐藏注记');
  });

  it('lock_screen_notifications_page 门控注记（notificationLockScreenSettings=false）', () => {
    expect(s).toContain('lock_screen_notifications_page（order 14）：flag 门控隐藏注记');
  });

  it('lock_screen_work_redact 门控注记（无工作资料）', () => {
    expect(s).toContain('lock_screen_work_redact（order 16）：无工作资料门控隐藏注记');
  });

  it('notification_lockscreen_bypass 门控注记（多生物识别 UNSUPPORTED_ON_DEVICE）', () => {
    expect(s).toContain('notification_lockscreen_bypass（order 17）：多生物识别 UNSUPPORTED_ON_DEVICE 隐藏注记');
  });

  it('sync_across_devices 整组隐藏注记（feature provider 动态注入语义）', () => {
    expect(s).toContain('sync_across_devices「在设备之间保持同步」');
    expect(s).toContain('displayPreference 默认 setVisible(false)');
  });

  it('polite/zen/minimalism/unseen/flash 五行 flag 门控隐藏注记', () => {
    expect(s).toContain('polite_notifications_preference（order 18）');
    expect(s).toContain('zen_mode_notifications（order 19）');
    expect(s).toContain('lock_screen_notif_minimalism（order 20）');
    expect(s).toContain('lock_screen_show_only_unseen_notifs');
    expect(s).toContain('flash_notifications_preference（order 22）');
  });

  it('zen_mode_notifications 一致性裁决注记（与一级「模式」ZenModesLink 同 flag 反向门控）', () => {
    expect(s).toContain('ZenModePreferenceController = Flags.modesUi() ?');
    expect(s).toContain('ZenModesLinkPreferenceController');
  });

  it('notification_pulse 门控注记（Pixel 5 起无 LED → UNSUPPORTED_ON_DEVICE）', () => {
    expect(s).toContain('notification_pulse（order 27）');
    expect(s).toContain('Pixel 5 起无 LED');
  });

  it('XML 全文无 android:icon 注记 → 页 19 全行无图标', () => {
    expect(s).toContain('XML 全文无 android:icon');
  });
});

describe('v8.01 #10 四期 — 单一真源与交互接线', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('单源 store：window.__settingsNotifsStore + localStorage settings:notifications-v1', () => {
    expect(s).toContain('window.__settingsNotifsStore');
    expect(s).toContain("settings:notifications-v1");
  });

  it('AOSP Secure 表默认值：lockScreenShow=1 / allowPrivate=true / snooze=false / badging=true / assistant=true', () => {
    expect(s).toContain("{ lockScreenShow: 1, allowPrivate: true, silentIcons: false, snooze: false, badging: true, assistant: true }");
  });

  it('getSummaryResource 三态语义：显示所有通知内容 / 仅在解锁状态下显示敏感内容 / 完全不显示通知', () => {
    expect(s).toContain("return !s.lockScreenShow ? '完全不显示通知'");
    expect(s).toContain(": s.allowPrivate ? '显示所有通知内容' : '仅在解锁状态下显示敏感内容'");
  });

  it('三选对话框（entries 动态注入语义）+ interstitial 权威问句', () => {
    expect(s).toContain('id="notifLockDialog"');
    expect(s).toContain('您希望锁定的屏幕显示什么内容？');
    expect(s).toContain('__notifLockChoose');
    expect(s).toContain('__notifLockPick');
  });

  it('真实数据同源直读（ios-desktop:notifications）+ notifications-changed 事件订阅', () => {
    expect(s).toContain("localStorage.getItem('ios-desktop:notifications')");
    expect(s).toContain("addEventListener('notifications-changed'");
  });

  it('历史面板渲染经 escapeHtml（audit-B 惯例，应用可控文本零注入面）', () => {
    const script = s.slice(s.indexOf('const NOTIF_PAGE_SCRIPT'), s.indexOf('</script>', s.indexOf('const NOTIF_PAGE_SCRIPT')));
    expect(script).toContain('function escapeHtml(s)');
    expect(script).toContain("escapeHtml(n.title || '')");
    expect(script).toContain("escapeHtml(n.app || '')");
  });

  it('真实数据动态摘要：历史「N 条通知」+ 对话「N 个优先对话/没有优先对话」', () => {
    expect(s).toContain("list.length + ' 条通知'");
    expect(s).toContain("convos.length + ' 个优先对话'");
    expect(s).toContain("'没有优先对话'");
    expect(s).toContain("'没有近期通知'");
  });

  it('redact 开关联动列表摘要（change → allowPrivate → refresh）', () => {
    expect(s).toContain('s.allowPrivate = !!sw.checked');
  });

  it('app-page-active 页 19 激活刷新（v7.99 桥惯例）', () => {
    expect(s).toContain('e.detail.pageIdx === 19');
  });

  it('页 16 STUB 文案移除 NotificationSettings 引用并指向页 19', () => {
    expect(s).toContain('v8.01 已转正 NotificationSettings → 页 19');
    expect(s).not.toContain('（NotificationSettings、AccessibilitySettings 等）');
  });
});
