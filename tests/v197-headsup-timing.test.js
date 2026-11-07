// ==================== v197-headsup-timing.test.js — #197 heads-up 全规格：七常量 / snooze / Avalanche / 锁屏上限 v10.55 ====================
//
// 覆盖（R66 窗主作业）：
//   · aosp/heads-up-timing.js 纯逻辑真跑：config.xml 时序七常量实证值 / decay 档分流 /
//     pin 裁决 / 有效驻留（含 minimum_time 下限与 throttling 档）/ 内容同判 /
//     snooze 状态机（TTL 惰性过期 + 注入 now）/ Avalanche 单槽等待队列（offer/free FIFO）
//   · notifications.js 接线锚：snooze 三闸第四闸 / offer 排队 / minimum_time 防闪没钳制 /
//     上滑 snooze 记账 / destroy 幂等（free 不重复放行）/ 挤旧循环退役 / 观测桥扩容
//   · lock-screen.js 接线锚：max_notif_icons_on_lockscreen=3（原工程自定 4 退役）
//   · 回归锚：#64 既有触摸语义（touch_acceptance 700）与弹簧链路零变化
//   · pkg-sdk notify API 固证：__system.notify 桥（main.js）v7.19 在库（议题建议 4 已闭环）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HUN_DECAY_MS, HUN_AUTO_DECAY_MS, HUN_MINIMUM_TIME_MS, HUN_MINIMUM_TIME_THROTTLING_MS,
  HUN_STICKY_MS, HUN_DEFAULT_SNOOZE_MS, HUN_TOUCH_ACCEPTANCE_MS, MAX_NOTIF_ICONS_ON_LOCKSCREEN,
  headsUpDecayMs, shouldHeadsUpBecomePinned, headsUpHoldMs, sameNotificationContent,
  createSnoozeStore, createAvalancheQueue,
} from '../ios-desktop/js/aosp/heads-up-timing.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TIMING = readFileSync(join(ROOT, 'ios-desktop/js/aosp/heads-up-timing.js'), 'utf-8');
const NOTI = readFileSync(join(ROOT, 'ios-desktop/js/notifications.js'), 'utf-8');
const LOCK = readFileSync(join(ROOT, 'ios-desktop/js/lock-screen.js'), 'utf-8');
const MAIN = readFileSync(join(ROOT, 'ios-desktop/js/main.js'), 'utf-8');

describe('v10.55 #197 config.xml 时序七常量 + 锁屏上限（实证值）', () => {
  it('七常量逐项 1:1（decay 5000 / auto 3000 / minimum 2000 / throttling 500 / sticky 60000 / snooze 60000 / touch 700）', () => {
    expect(HUN_DECAY_MS).toBe(5000);
    expect(HUN_AUTO_DECAY_MS).toBe(3000);
    expect(HUN_MINIMUM_TIME_MS).toBe(2000);
    expect(HUN_MINIMUM_TIME_THROTTLING_MS).toBe(500);
    expect(HUN_STICKY_MS).toBe(60000);
    expect(HUN_DEFAULT_SNOOZE_MS).toBe(60000);
    expect(HUN_TOUCH_ACCEPTANCE_MS).toBe(700);
  });
  it('锁屏图标上限 max_notif_icons_on_lockscreen = 3', () => {
    expect(MAX_NOTIF_ICONS_ON_LOCKSCREEN).toBe(3);
  });
});

describe('v10.55 #197 decay 档分流 + pin 裁决 + 有效驻留（HeadsUpManagerImpl 同构）', () => {
  it('headsUpDecayMs：auto 档 3000 vs 缺省 5000', () => {
    expect(headsUpDecayMs(undefined)).toBe(5000);
    expect(headsUpDecayMs({})).toBe(5000);
    expect(headsUpDecayMs({ auto: true })).toBe(3000);
    expect(headsUpDecayMs({ auto: false })).toBe(5000);
  });
  it('shouldHeadsUpBecomePinned：sticky / pin 双标记通道，缺省 false', () => {
    expect(shouldHeadsUpBecomePinned(undefined)).toBe(false);
    expect(shouldHeadsUpBecomePinned({})).toBe(false);
    expect(shouldHeadsUpBecomePinned({ sticky: true })).toBe(true);
    expect(shouldHeadsUpBecomePinned({ pin: true })).toBe(true);
    expect(shouldHeadsUpBecomePinned({ sticky: false, pin: false })).toBe(false);
  });
  it('headsUpHoldMs：sticky 60000 常驻 / 普通 max(decay, minimum) / throttled 下限 500', () => {
    expect(headsUpHoldMs({ sticky: true })).toBe(60000);
    expect(headsUpHoldMs({})).toBe(5000);
    expect(headsUpHoldMs({ auto: true })).toBe(3000);
    // 防御性下限：现行常量下 decay ≥ minimum 恒成立，语义在库（常量调小仍保真）
    expect(headsUpHoldMs({}, { throttled: true })).toBe(5000);
    expect(headsUpHoldMs({ auto: true }, { throttled: true })).toBe(3000);
  });
});

describe('v10.55 #197 sameNotificationContent 内容同判（snooze 静默判据）', () => {
  it('title/desc/app 全同 true；任一变化 false；空值 false', () => {
    const base = { title: 'T', desc: 'D', app: '日历' };
    expect(sameNotificationContent(base, { title: 'T', desc: 'D', app: '日历' })).toBe(true);
    expect(sameNotificationContent(base, { title: 'T2', desc: 'D', app: '日历' })).toBe(false);
    expect(sameNotificationContent(base, { title: 'T', desc: 'D2', app: '日历' })).toBe(false);
    expect(sameNotificationContent(base, { title: 'T', desc: 'D', app: '时钟' })).toBe(false);
    expect(sameNotificationContent(null, base)).toBe(false);
    expect(sameNotificationContent(base, undefined)).toBe(false);
  });
});

describe('v10.55 #197 snooze 状态机（default_snooze 60s，now 可注入）', () => {
  it('snooze → isSnoozed true → TTL 过期自动失忆 → clear 立即解除', () => {
    let t = 1_000_000;
    const store = createSnoozeStore({ now: () => t });
    store.snooze('n1');
    expect(store.isSnoozed('n1')).toBe(true);
    t += 59_999;
    expect(store.isSnoozed('n1')).toBe(true);  // 60s 内静默
    t += 1;
    expect(store.isSnoozed('n1')).toBe(false); // 60s 到期失忆
    expect(store.size()).toBe(0);              // 惰性删除无残留
    store.snooze('n2');
    expect(store.isSnoozed('n2')).toBe(true);
    store.clear('n2');
    expect(store.isSnoozed('n2')).toBe(false);
  });
  it('无 id / null id 安全 noop；自定义 ttl 生效', () => {
    let t = 0;
    const store = createSnoozeStore({ now: () => t, ttl: 5_000 });
    expect(() => store.snooze(undefined)).not.toThrow();
    expect(() => store.snooze(null)).not.toThrow();
    expect(store.isSnoozed(undefined)).toBe(false);
    store.snooze('x');
    t += 4_999;
    expect(store.isSnoozed('x')).toBe(true);
    t += 1;
    expect(store.isSnoozed('x')).toBe(false);
  });
});

describe('v10.55 #197 Avalanche 排队（AvalancheController 单槽等待队列同构）', () => {
  it('offer 槽内 true / 槽满 false 入 waiting；free FIFO 放行队首', () => {
    const q = createAvalancheQueue(3);
    expect(q.offer({ id: 'a' })).toBe(true);
    expect(q.offer({ id: 'b' })).toBe(true);
    expect(q.offer({ id: 'c' })).toBe(true);
    expect(q.isWaiting).toBe(false);
    expect(q.offer({ id: 'd' })).toBe(false); // 第 4 条等待而非挤掉
    expect(q.offer({ id: 'e' })).toBe(false);
    expect(q.showing().map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(q.waiting().map((x) => x.id)).toEqual(['d', 'e']);
    const next = q.free({ id: 'a' });
    expect(next && next.id).toBe('d');        // FIFO
    expect(q.isWaiting).toBe(true);
    const next2 = q.free({ id: 'b' });
    expect(next2 && next2.id).toBe('e');
    const next3 = q.free({ id: 'c' });
    expect(next3).toBe(null);                  // 队列排空
    expect(q.isWaiting).toBe(false);
  });
  it('free 未知元素安全；同 id 判定（引用不同 id 同）也可释放', () => {
    const q = createAvalancheQueue(2);
    q.offer({ id: 'a' });
    q.offer({ id: 'b' });
    expect(q.free({ id: 'ghost' })).toBe(null); // 未在槽内：不误放行
    const next = q.free({ id: 'a' });
    expect(next && next.id).toBe(null);
    expect(q.showing().length).toBe(1);
  });
});

describe('v10.55 #197 notifications.js 接线锚（Avalanche 排队 + snooze + minimum_time）', () => {
  it('import 接线 + offer 槽满入队 + 挤旧循环退役', () => {
    expect(NOTI).toContain("from './aosp/heads-up-timing.js'");
    expect(NOTI).toContain('createSnoozeStore');
    expect(NOTI).toContain('createAvalancheQueue(HUN_MAX_STACK)');
    expect(NOTI).toContain('if (!hunQueue.offer(item)) return;');
    // 挤掉最旧退役（Avalanche 语义：等待而非挤掉）
    expect(NOTI).not.toContain('自栈底（最旧）起逐条挤出');
    expect(NOTI).toContain('Avalanche offer 已保槽内 ≤3');
  });
  it('snooze 第四闸 + 上滑记账 + 真更新解除（sameNotificationContent）', () => {
    expect(NOTI).toContain('hunSnooze.isSnoozed(item.id)');
    expect(NOTI).toContain('hunSnooze.snooze(entry.item.id)');
    expect(NOTI).toContain('sameNotificationContent(prev, item)');
    expect(NOTI).toContain('hunSnooze.clear(item.id)');
  });
  it('minimum_time 防闪没：存活不足 2000ms 的收起延迟补足（force 直通守卫清栈）', () => {
    expect(NOTI).toContain('if (!opts.force && elapsed < HUN_MINIMUM_TIME_MS)');
    expect(NOTI).toContain('HUN_MINIMUM_TIME_MS - elapsed');
    // destroy 直移除路径（下滑清栈/守卫）不经钳制：面板内可见，无需防闪没
    expect(NOTI).toContain('destroyHeadsUpEntry(entry);\n      for (const other of Array.from(hunEntries)) destroyHeadsUpEntry(other);');
  });
  it('destroy 幂等 + Avalanche 放行受 DND/面板守卫（风暴错峰逐条出）', () => {
    expect(NOTI).toContain('if (entry.destroyed) return;');
    expect(NOTI).toContain('const next = hunQueue.free(entry.item);');
    // v10.55 #198：守卫升级 ZenPolicy 裁决（ALLOW 类横幅穿透），面板/DND 双闸保持
    expect(NOTI).toMatch(/if \(next && !isPullPanelsActive\(\) && !document\.body\.classList\.contains\('dnd-mode-active'\)\s*&&\s*shouldPeekNotification\(zenStore\.getState\(\), next, true\)\)/);
  });
  it('观测桥扩容（queue/snoozed）+ #64 touch_acceptance 700 既有语义零变化', () => {
    expect(NOTI).toContain('snoozed: (id) => hunSnooze.isSnoozed(id)');
    expect(NOTI).toContain('queue: () => ({ showing: hunQueue.showing()');
    expect(NOTI).toContain('HUN_TOUCH_ACCEPTANCE_MS = 700');
    expect(NOTI).toContain("performance.now() - entry.birth < HUN_TOUCH_ACCEPTANCE_MS");
  });
  it('decay 档位化接线：armAutoDismiss 走 entry.holdMs（sticky/auto/普通三档）', () => {
    expect(NOTI).toContain('holdMs: headsUpHoldMs(item, { throttled: hunQueue.isWaiting })');
    expect(NOTI).toContain('pinned: shouldHeadsUpBecomePinned(item)');
    expect(NOTI).toContain('entry.hideTimer = setTimeout(() => exitHeadsUp(entry, 0), entry.holdMs);');
  });
});

describe('v10.55 #197 lock-screen.js 接线锚（max_notif_icons_on_lockscreen=3）', () => {
  it('上限常量接线（原工程自定 slice(0,4) 退役）', () => {
    expect(LOCK).toContain("import { MAX_NOTIF_ICONS_ON_LOCKSCREEN } from './aosp/heads-up-timing.js'");
    // v10.55 #198：feed 变量中转（NOTIFICATION_LIST 视觉抑制在位时清空锁屏列），上限 3 不变
    expect(LOCK).toContain('feed.slice(0, MAX_NOTIF_ICONS_ON_LOCKSCREEN)');
    expect(LOCK).toMatch(/isVisualSuppressed\(currentSuppressedVisuals\(\), SUPPRESSED_EFFECT\.NOTIFICATION_LIST\)/);
    expect(LOCK).not.toContain('getNotifications().slice(0, 4)');
  });
});

describe('v10.55 #197 pkg-sdk notify API 固证（议题建议 4 已闭环于 v7.19）', () => {
  it('__system.notify 桥在库（main.js）+ 桌面 NOTIFY 消费链在库（notifications.js）', () => {
    expect(MAIN).toContain("notify: function(p)");
    expect(MAIN).toContain("{ type: 'NOTIFY', payload: p }");
    // 桌面侧消费：notifications.js 收 NOTIFY 消息 → addSystemNotification（议题正文旧实测已过期，锚固证）
    expect(NOTI).toContain("e.data.type === 'NOTIFY'");
  });
});
