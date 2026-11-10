// ==================== notification-channel.test.js — #207 一期渠道语义纯逻辑核 + 接线锚（v11.05 · R106 加餐） ====================
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

describe('v11.05 #207 IMPORTANCE 五常量（NotificationManager.java 实证 0-4）', () => {
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

describe('v11.05 #207 渠道注册表（工厂隔离）', () => {
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

describe('v11.05 #207 deliveryGate 五格投递分流矩阵（纯函数真跑）', () => {
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

describe('v11.05 #207 存档归一化与持久化', () => {
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

describe('v11.05 #207 接线锚（源码锚）', () => {
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

describe('v11.05 #207 二期 toggleChannelEnabled 渠道开关（ChannelEditorDialog checkbox 同语义）', () => {
  it('关：importance 置 NONE + 记忆原值 preBlockImportance + userBlocked 标记', () => {
    const s = createChannelStore({ storage: memStorage() });
    s.createNotificationChannel({ appId: 'msg', channelId: 'c1', name: '渠道一', importance: IMPORTANCE.HIGH });
    s.toggleChannelEnabled('msg', 'c1');
    const rec = s.getNotificationChannel('msg', 'c1');
    expect(rec.importance).toBe(IMPORTANCE.NONE);
    expect(rec.preBlockImportance).toBe(IMPORTANCE.HIGH);
    expect(rec.userBlocked).toBe(true);
    expect(s.effectiveImportance('msg', 'c1')).toBe(IMPORTANCE.NONE); // 投递矩阵整条不进
  });
  it('开：恢复记忆原值（HIGH 往返），preBlockImportance 清除 + userBlocked 复位', () => {
    const s = createChannelStore({ storage: memStorage() });
    s.createNotificationChannel({ appId: 'msg', channelId: 'c1', name: '渠道一', importance: IMPORTANCE.LOW });
    s.toggleChannelEnabled('msg', 'c1'); // 关
    s.toggleChannelEnabled('msg', 'c1'); // 开
    const rec = s.getNotificationChannel('msg', 'c1');
    expect(rec.importance).toBe(IMPORTANCE.LOW);
    expect('preBlockImportance' in rec).toBe(false);
    expect(rec.userBlocked).toBe(false);
    expect(s.effectiveImportance('msg', 'c1')).toBe(IMPORTANCE.LOW);
  });
  it('无记忆值/越界记忆值恢复 → DEFAULT 3 兜底', () => {
    const s = createChannelStore({ storage: memStorage() });
    // 场景 A：关闭态下记忆值被越界脏值污染 → 开 → 越界 → DEFAULT 兜底
    s.createNotificationChannel({ appId: 'msg', channelId: 'c1', importance: IMPORTANCE.MIN });
    s.toggleChannelEnabled('msg', 'c1'); // 关（记忆 MIN）
    s.getNotificationChannel('msg', 'c1').preBlockImportance = 99; // 越界脏值（直改内存态模拟损坏）
    s.toggleChannelEnabled('msg', 'c1'); // 开
    expect(s.getNotificationChannel('msg', 'c1').importance).toBe(IMPORTANCE.DEFAULT);
    // 场景 B：NONE 态注册且无记忆值 → 开 → DEFAULT 兜底
    s.createNotificationChannel({ appId: 'msg', channelId: 'c2', importance: IMPORTANCE.NONE });
    s.toggleChannelEnabled('msg', 'c2');
    expect(s.getNotificationChannel('msg', 'c2').importance).toBe(IMPORTANCE.DEFAULT);
  });
  it('tombstone 渠道 toggle no-op（删除后不可开关——重注册恢复语义归 create 管辖）', () => {
    const s = createChannelStore({ storage: memStorage() });
    s.createNotificationChannel({ appId: 'msg', channelId: 'gone', importance: IMPORTANCE.HIGH });
    s.deleteNotificationChannel('msg', 'gone');
    s.toggleChannelEnabled('msg', 'gone');
    expect(s.getNotificationChannel('msg', 'gone').deleted).toBe(true);
    expect(s.getNotificationChannel('msg', 'gone').importance).toBe(IMPORTANCE.HIGH); // 原值零触碰
  });
  it('normalize 清洗：preBlockImportance 合法值保留 / 越界丢弃 / userBlocked 严格 true', () => {
    const st = memStorage();
    st.setItem(CHANNEL_STORAGE_KEY, JSON.stringify({
      version: 1,
      channels: {
        'msg::c1': { appId: 'msg', channelId: 'c1', name: 'x', importance: IMPORTANCE.NONE, deleted: false, preBlockImportance: 3, userBlocked: true },
        'msg::c2': { appId: 'msg', channelId: 'c2', name: 'y', importance: IMPORTANCE.HIGH, deleted: false, preBlockImportance: 99, userBlocked: 'yes' },
      },
    }));
    const s = createChannelStore({ storage: st }); // 载入即 normalize
    expect(s.getNotificationChannel('msg', 'c1').preBlockImportance).toBe(3); // 合法保留
    expect(s.getNotificationChannel('msg', 'c1').userBlocked).toBe(true);
    expect(s.getNotificationChannel('msg', 'c2').preBlockImportance).toBeUndefined(); // 越界丢弃
    expect(s.getNotificationChannel('msg', 'c2').userBlocked).toBe(false); // 严格 true 判定
  });
  it('持久化往返：userBlocked + preBlockImportance 跨会话保留', () => {
    const st = memStorage();
    const s = createChannelStore({ storage: st });
    s.createNotificationChannel({ appId: 'msg', channelId: 'c1', name: '渠道一', importance: IMPORTANCE.HIGH });
    s.toggleChannelEnabled('msg', 'c1');
    s.persist();
    const s2 = createChannelStore({ storage: st });
    expect(s2.getNotificationChannel('msg', 'c1').userBlocked).toBe(true);
    expect(s2.getNotificationChannel('msg', 'c1').preBlockImportance).toBe(IMPORTANCE.HIGH);
    s2.toggleChannelEnabled('msg', 'c1');
    expect(s2.effectiveImportance('msg', 'c1')).toBe(IMPORTANCE.HIGH); // 跨会话往返恢复
  });
});

describe('v11.05 #207 二期接线锚（弹层 + 长按 + M3 开关形态）', () => {
  it('notifications.js：弹层组件 + 开关接线 + tombstone 不渲染 + 删除不可恢复提示', () => {
    expect(NOTI).toContain("function openChannelEditor(appId, appName)");
    expect(NOTI).toContain('toggleChannelEnabled(appId, sw.dataset.ch)');
    expect(NOTI).toContain("r.appId === appId && !r.deleted"); // tombstone 不渲染
    expect(NOTI).toContain('已删除的渠道无法恢复');
    expect(NOTI).toContain('IMPORTANCE_LABELS[r.importance]'); // importance 标签行
  });
  it('notifications.js：长按入口（500ms 计时 + 位移取消 + click 防误触守卫）+ __channelDebug 扩容', () => {
    expect(NOTI).toContain("openChannelEditor(item.appId || '', item.app || '')");
    expect(NOTI).toMatch(/if \(Math\.hypot\(ev\.clientX - sx, ev\.clientY - sy\) > 10\) lpCancel/);
    expect(NOTI).toContain('长按释放后尾随 click 防误触');
    expect(NOTI).toContain('toggle: (appId, channelId) => channelStore.toggleChannelEnabled(appId, channelId)');
    expect(NOTI).toContain('open: (appId, appName) => openChannelEditor(appId, appName)');
  });
  it('css：.ch-editor-sw M3 开关形态（轨道 + ::before 滑块 + checked 位移，--md-* 令牌）', () => {
    const CSS = readFileSync(join(ROOT, 'ios-desktop/css/pull-panels.css'), 'utf-8');
    expect(CSS).toContain('.ch-editor-sw');
    expect(CSS).toMatch(/\.ch-editor-sw::before/);
    expect(CSS).toMatch(/\.ch-editor-sw:checked::before/);
    expect(CSS).toContain('var(--md-primary');
    expect(CSS).toContain('var(--md-on-primary');
  });
});
