// ==================== v207-notification-channel.test.js — #207 一期渠道语义纯逻辑核 + 接线锚（v10.19 · R106 加餐） ====================
//
// 覆盖：
//   · aosp/notification-channel.js 纯逻辑真跑：IMPORTANCE 五常量（NotificationManager.java 0-4 实证）/
//     注册·更新·删除 tombstone/删除后同 id 重注册恢复原设置（Android 官方语义）/effectiveImportance
//     （缺省 DEFAULT / tombstone NONE）/deliveryGate 五格投递分流矩阵/normalize 存档兜底/持久化往返
//   · 接线锚：notifications.js 渠道闸两处（enqueue 闸与 #198 ZenMode 闸并列同形 + MIN/LOW 横幅短路）/
//     NOTIFY 白名单 channelId 透传/__channelDebug 观测面
//   · 回归锚：#198 ZenMode 闸零触碰（zenOn shouldEnqueueNotification 前置保持）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IMPORTANCE, IMPORTANCE_LABELS, DEFAULT_CHANNEL_ID, CHANNEL_STORAGE_KEY, CHANNEL_SCHEMA_VERSION,
  deliveryGate, createChannelStore, normalizeChannelState,
} from '../ios-desktop/js/aosp/notification-channel.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NC = readFileSync(join(ROOT, 'ios-desktop/js/aosp/notification-channel.js'), 'utf-8');
const NOTI = readFileSync(join(ROOT, 'ios-desktop/js/notifications.js'), 'utf-8');

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('v10.19 #207 IMPORTANCE 五常量（NotificationManager.java 实证 0-4）', () => {
  it('NONE 0 / MIN 1 / LOW 2 / DEFAULT 3 / HIGH 4 逐项 1:1', () => {
    expect(IMPORTANCE).toEqual({ NONE: 0, MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4 });
  });
  it('用户可见名五级「无/最低/低/默认/高」（二期清单页消费）', () => {
    expect(IMPORTANCE_LABELS).toEqual({ 0: '无', 1: '最低', 2: '低', 3: '默认', 4: '高' });
  });
  it('隐式渠道 id = default（无声明投递走此，存量零破坏）', () => {
    expect(DEFAULT_CHANNEL_ID).toBe('default');
  });
});

describe('v10.19 #207 渠道注册表（工厂隔离）', () => {
  it('注册/查询：字段形态 + 非法 importance 钳制 DEFAULT；appId/channelId 缺失 no-op', () => {
    const s = createChannelStore({ storage: memStorage() });
    s.createNotificationChannel({ appId: 'msg', channelId: 'quiet', name: '静默消息', importance: IMPORTANCE.LOW });
    const rec = s.getNotificationChannel('msg', 'quiet');
    expect(rec).toEqual({ appId: 'msg', channelId: 'quiet', name: '静默消息', description: '', importance: 2, deleted: false });
    s.createNotificationChannel({ appId: 'msg', channelId: 'bad', importance: 99 });
    expect(s.getNotificationChannel('msg', 'bad').importance).toBe(IMPORTANCE.DEFAULT);
    s.createNotificationChannel({ appId: '', channelId: 'x' });
    s.createNotificationChannel({ appId: 'msg', channelId: '' });
    expect(s.getNotificationChannel('', 'x')).toBe(null);
    expect(s.getNotificationChannel('msg', '')).toBe(null);
  });
  it('同 id 重注册 = 更新（AOSP NotificationManagerService 同语义）', () => {
    const s = createChannelStore({ storage: memStorage() });
    s.createNotificationChannel({ appId: 'msg', channelId: 'c1', name: '旧名', importance: IMPORTANCE.DEFAULT });
    s.createNotificationChannel({ appId: 'msg', channelId: 'c1', name: '新名', importance: IMPORTANCE.HIGH });
    const rec = s.getNotificationChannel('msg', 'c1');
    expect(rec.name).toBe('新名');
    expect(rec.importance).toBe(IMPORTANCE.HIGH);
    expect(rec.deleted).toBe(false);
  });
  it('updateNotificationChannel 仅合并提供的字段', () => {
    const s = createChannelStore({ storage: memStorage() });
    s.createNotificationChannel({ appId: 'msg', channelId: 'c1', name: '名一', description: '描一', importance: IMPORTANCE.LOW });
    s.updateNotificationChannel('msg', 'c1', { importance: IMPORTANCE.HIGH });
    const rec = s.getNotificationChannel('msg', 'c1');
    expect(rec.name).toBe('名一');
    expect(rec.description).toBe('描一');
    expect(rec.importance).toBe(IMPORTANCE.HIGH);
  });
  it('删除 = tombstone 保留（deleted:true 非物理删除）；effectiveImportance 落 NONE（静默丢弃）', () => {
    const s = createChannelStore({ storage: memStorage() });
    s.createNotificationChannel({ appId: 'msg', channelId: 'gone', name: '将删', importance: IMPORTANCE.HIGH });
    s.deleteNotificationChannel('msg', 'gone');
    const rec = s.getNotificationChannel('msg', 'gone');
    expect(rec.deleted).toBe(true);
    expect(rec.importance).toBe(IMPORTANCE.HIGH); // tombstone 保留原设置（重注册恢复用）
    expect(s.effectiveImportance('msg', 'gone')).toBe(IMPORTANCE.NONE);
    s.deleteNotificationChannel('msg', 'gone'); // 重复删除幂等
    expect(s.getNotificationChannel('msg', 'gone').deleted).toBe(true);
  });
  it('删除后同 id 重注册 = 恢复原设置（Android 官方语义：用户决策保留非新建）', () => {
    const s = createChannelStore({ storage: memStorage() });
    s.createNotificationChannel({ appId: 'msg', channelId: 'c2', name: '原名', importance: IMPORTANCE.LOW });
    s.deleteNotificationChannel('msg', 'c2');
    s.createNotificationChannel({ appId: 'msg', channelId: 'c2', name: '新申报名', importance: IMPORTANCE.HIGH });
    const rec = s.getNotificationChannel('msg', 'c2');
    expect(rec.deleted).toBe(false);
    expect(rec.name).toBe('原名'); // tombstone 前设置恢复
    expect(rec.importance).toBe(IMPORTANCE.LOW);
    expect(s.effectiveImportance('msg', 'c2')).toBe(IMPORTANCE.LOW);
  });
  it('effectiveImportance：查无渠道 → 隐式 DEFAULT（3）；注册 HIGH → 4', () => {
    const s = createChannelStore({ storage: memStorage() });
    expect(s.effectiveImportance('msg', 'undeclared')).toBe(IMPORTANCE.DEFAULT);
    s.createNotificationChannel({ appId: 'msg', channelId: 'imp', importance: IMPORTANCE.HIGH });
    expect(s.effectiveImportance('msg', 'imp')).toBe(IMPORTANCE.HIGH);
  });
});

describe('v10.19 #207 deliveryGate 五格投递分流矩阵（纯函数真跑）', () => {
  it('NONE → 整条不进（数据/横幅/锁屏全无）；MIN/LOW → 进 Feed 不弹横幅；DEFAULT/HIGH → 现状', () => {
    expect(deliveryGate(IMPORTANCE.NONE)).toEqual({ enqueue: false, peek: false });
    expect(deliveryGate(IMPORTANCE.MIN)).toEqual({ enqueue: true, peek: false });
    expect(deliveryGate(IMPORTANCE.LOW)).toEqual({ enqueue: true, peek: false });
    expect(deliveryGate(IMPORTANCE.DEFAULT)).toEqual({ enqueue: true, peek: true });
    expect(deliveryGate(IMPORTANCE.HIGH)).toEqual({ enqueue: true, peek: true });
  });
  it('非法值钳制 DEFAULT 行（防御投递侧脏数据）', () => {
    expect(deliveryGate(99)).toEqual({ enqueue: true, peek: true });
    expect(deliveryGate(-7)).toEqual({ enqueue: true, peek: true });
  });
});

describe('v10.19 #207 存档归一化与持久化', () => {
  it('normalize：损坏档/缺字段/脏条目逐项兜底；version 高于当前丢弃走默认', () => {
    expect(normalizeChannelState(null).channels).toEqual({});
    expect(normalizeChannelState({ version: 99 }).channels).toEqual({});
    const out = normalizeChannelState({ version: 1, channels: {
      ok: { appId: 'msg', channelId: 'ok', importance: 2, deleted: false },
      bad: { appId: 7, channelId: null },
      junk: 'not-an-object',
    } });
    expect(Object.keys(out.channels)).toEqual(['ok']);
    expect(out.channels.ok.importance).toBe(2);
  });
  it('持久化往返：注册+删除 tombstone → persist → 新工厂 load 语义不丢（AOSP 渠道跨会话保留）', () => {
    const st = memStorage();
    const s = createChannelStore({ storage: st });
    s.createNotificationChannel({ appId: 'msg', channelId: 'quiet', name: '静默消息', importance: IMPORTANCE.LOW });
    s.createNotificationChannel({ appId: 'msg', channelId: 'gone', importance: IMPORTANCE.HIGH });
    s.deleteNotificationChannel('msg', 'gone');
    s.persist();
    const s2 = createChannelStore({ storage: st });
    expect(s2.effectiveImportance('msg', 'quiet')).toBe(IMPORTANCE.LOW);
    expect(s2.effectiveImportance('msg', 'gone')).toBe(IMPORTANCE.NONE); // tombstone 跨会话
    expect(s2.getNotificationChannel('msg', 'gone').importance).toBe(IMPORTANCE.HIGH);
  });
  it('存储键与版本常量（CHANNEL_STORAGE_KEY / SCHEMA_VERSION 1）', () => {
    expect(CHANNEL_STORAGE_KEY).toBe('ios-desktop:notification-channels');
    expect(CHANNEL_SCHEMA_VERSION).toBe(1);
  });
});

describe('v10.19 #207 接线锚（源码锚）', () => {
  it('notifications.js：渠道闸与 #198 ZenMode 闸并列同形 + MIN/LOW 横幅短路 + 白名单透传 + 观测面', () => {
    expect(NOTI).toContain("from './aosp/notification-channel.js'");
    expect(NOTI).toContain('channelStore.effectiveImportance(item.appId, item.channelId)');
    expect(NOTI).toContain(': IMPORTANCE.DEFAULT'); // 无声明 → 隐式 DEFAULT
    expect(NOTI).toMatch(/if \(!deliveryGate\(channelImp\)\.enqueue\) return;/); // 进 feed 闸
    expect(NOTI).toMatch(/if \(!deliveryGate\(channelImp\)\.peek\) return;/); // 横幅短路（MIN/LOW）
    expect(NOTI).toContain('channelId: p.channelId'); // NOTIFY 白名单透传
    expect(NOTI).toContain('window.__channelDebug'); // 观测面（__zenDebug 同款）
  });
  it('回归锚：#198 ZenMode 进 feed 闸前置保持（渠道闸并列不替代）', () => {
    const idxZen = NOTI.indexOf('shouldEnqueueNotification(zenStore.getState()');
    const idxCh = NOTI.indexOf('deliveryGate(channelImp).enqueue');
    expect(idxZen).toBeGreaterThan(-1);
    expect(idxCh).toBeGreaterThan(idxZen); // zen 闸在前、渠道闸在后（并列顺序在录）
    expect(NOTI).toContain('shouldPeekNotification'); // #198 横幅裁决零触碰
  });
  it('纯逻辑核纪律：零 DOM/window 副作用（工厂闭包，#147 判据）', () => {
    expect(NC).toMatch(/export const channelStore = createChannelStore\(\)/);
    expect(NC).not.toMatch(/document\./);
    expect(NC).toMatch(/typeof localStorage !== 'undefined'/); // storage 注入式访问
  });
});
