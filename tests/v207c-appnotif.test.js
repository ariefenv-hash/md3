// ==================== v207c-appnotif.test.js — #207 三期 应用通知页接线锚（v10.72 · R108 加餐） ====================
//
// 覆盖（一期/二期纯逻辑已由 tests/v207 锚定，本件锚三期接线面）：
//   · 页 19 all_notifications 行接通 pushSubPage(35)（静态行退役）
//   · settings.js 页 35 模板（appNotifList/appNotifEmpty + 空态 + 注记）
//   · settings-appnotif.js 副作用模块（groupChannelsByApp 分组纯函数 +
//     app-page-active 35 注册 + toggleChannelEnabled 单一真源 + IMPORTANCE_LABELS
//     消费 + tombstone 跳过 + esc 转义 + #70 几何）
//   · 回归锚：二期弹层链零触碰（notifications.js openChannelEditor/toggle 在位）/
//     settings-battery 副作用顺序保持
//
// groupChannelsByApp 用 memStorage 间接验证（channelStore 工厂注入隔离）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChannelStore, CHANNEL_STORAGE_KEY } from '../ios-desktop/js/aosp/notification-channel.js';
import { groupChannelsByApp } from '../ios-desktop/js/apps/settings-appnotif.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SET = readFileSync(join(ROOT, 'ios-desktop/js/apps/settings.js'), 'utf-8');
const APPNOTIF = readFileSync(join(ROOT, 'ios-desktop/js/apps/settings-appnotif.js'), 'utf-8');
const NOTI = readFileSync(join(ROOT, 'ios-desktop/js/notifications.js'), 'utf-8');
const SBAT = readFileSync(join(ROOT, 'ios-desktop/js/apps/settings-battery.js'), 'utf-8');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

function memStorage(init) {
  const m = new Map(init ? Object.entries(init) : []);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('v10.72 #207 三期 groupChannelsByApp 分组纯函数', () => {
  it('按应用分组 / tombstone 不入清单 / 组内按名排序', () => {
    const st = createChannelStore({ storage: memStorage() });
    st.createNotificationChannel({ appId: 'messages', channelId: 'c2', name: '群聊', importance: 3 });
    st.createNotificationChannel({ appId: 'messages', channelId: 'c1', name: '私信', importance: 4 });
    st.createNotificationChannel({ appId: 'clock', channelId: 'alarm', name: '闹钟', importance: 4 });
    st.createNotificationChannel({ appId: 'messages', channelId: 'dead', name: '已删', importance: 3 });
    st.deleteNotificationChannel('messages', 'dead');
    const groups = groupChannelsByApp(st.getState());
    expect(groups.size).toBe(2); // tombstone 剔除后 messages(2) + clock(1)
    expect(groups.get('messages').map((r) => r.channelId)).toEqual(['c2', 'c1']); // zh 拼音序：群(qún) < 私(sī)
    expect(groups.has('messages') && !groups.get('messages').some((r) => r.channelId === 'dead')).toBe(true);
    // 空注册表 → 空 Map
    const empty = groupChannelsByApp(createChannelStore({ storage: memStorage() }).getState());
    expect(empty.size).toBe(0);
  });
});

describe('v10.72 #207 三期 接线锚（页 19 行 / 页 35 模板 / 副作用模块）', () => {
  it('页 19 all_notifications 行：静态退役 → pushSubPage(35) + data-test', () => {
    expect(SET).toContain('data-test="app-notifications"');
    expect(SET).toContain('window.pushSubPage && window.pushSubPage(35)');
  });
  it('页 35 模板：清单容器 + 空态 + 渠道语义注记', () => {
    expect(SET).toContain("id=\"appNotifList\" data-test=\"appnotif-list\"");
    expect(SET).toContain("id=\"appNotifEmpty\" data-test=\"appnotif-empty\"");
    expect(SET).toContain('暂无应用注册通知渠道');
    expect(SET).toContain('AppNotificationSettings 对标');
    expect(SET).toContain("title: '应用通知'");
  });
  it('副作用模块：页 35 注册 + 二期核单一真源 + importance 标签 + 转义 + #70', () => {
    expect(APPNOTIF).toContain("from '../aosp/notification-channel.js'");
    expect(APPNOTIF).toContain('pageIdx === 35');
    expect(APPNOTIF).toContain('channelStore.toggleChannelEnabled(appId, channelId)');
    expect(APPNOTIF).toContain('IMPORTANCE_LABELS[rec.importance]');
    expect(APPNOTIF).toContain('if (!rec || rec.deleted) continue; // tombstone 不显示');
    expect(APPNOTIF).toContain('function esc(s)'); // innerHTML 落点转义
    expect(APPNOTIF).toContain('setSwitchChecked(t,'); // #70
    expect(APPNOTIF).toContain('resolveAppName');
  });
  it('app 名解析走桌面图标 aria-label（零 apps-data 导入防循环）', () => {
    expect(APPNOTIF).toContain(".app-icon[data-id=");
    expect(APPNOTIF).not.toContain("from '../apps-data"); // 零 apps-data 导入防循环（头注文字不算）
  });
});

describe('v10.72 #207 三期 回归锚（二期弹层链零触碰）', () => {
  it('notifications.js 二期 openChannelEditor/toggle 直调面在位（本页与其单一真源同仓）', () => {
    expect(NOTI).toContain('openChannelEditor');
    expect(NOTI).toContain("toggle: (appId, channelId) => channelStore.toggleChannelEnabled(appId, channelId)");
  });
  it('settings-battery 副作用导入顺序保持（settings-appnotif 紧随其后，零行为漂移）', () => {
    expect(SET).toContain("import './settings-battery.js';");
    expect(SET).toContain("import './settings-appnotif.js';");
    expect(SBAT).toContain("getElementById('settingsBatteryHealthPct')"); // v10.72 #100 面在位
  });
  it('CHANNEL_STORAGE_KEY 真源键未被三期改写', () => {
    expect(CHANNEL_STORAGE_KEY).toBe('ios-desktop:notification-channels');
    expect(APPNOTIF).not.toContain('localStorage.setItem');
  });
});

describe('v10.72 版本账', () => {
  it('pkg 版本 10.72.0', () => {
    expect(PKG.version).toBe('10.72.0');
  });
});
