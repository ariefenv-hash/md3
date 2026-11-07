// ==================== v64-heads-up.test.js — #64 heads-up 堆叠横幅（AOSP HeadsUpManager 对标） ====================
//
// 覆盖（#64 验收原文逐条）：
//   · AOSP 常量锚（实拉 aosp-mirror main res/values/config.xml）：heads_up_notification_decay
//     = 5000ms / touch_acceptance_delay = 700ms（源码断言 + 头注留痕行在册）
//   · 堆叠规则：同屏最多 3（HUN_MAX_STACK）、超出挤掉最旧（150ms×5 连发压测不超限不残留）
//   · 数据单源：addSystemNotification 与通知中心/锁屏同 Feed（getNotifications 全量在册）
//   · 状态机与中断路径源码锚：entering→peek⇄drag→exit / 滑入中触摸路由（exit 中断）/
//     exit 中再来新条（独立元素）/ 面板打开守卫清栈 / pointercancel 回弹 / touch acceptance
//   · 手势三通道：上滑收起（位移+甩出速度双通道）/ 下滑展开通知栏（openPullPanel(0)）/
//     点击路由（deepLink → appId 精确 → msg 兜底）
//   · 弹簧纪律：spring.js 闭式解 + motion.js tweenValue 速度接力（源码断言）
//   · DND 门控零回归 + 音效/振动链路保持

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bootDesktop } from './scenario-helpers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const notisSrc = () => src('ios-desktop/js/notifications.js');

let noti;

beforeAll(async () => {
  const W = await bootDesktop();
  W.__lockTest.instantUnlock();
  noti = await import('../ios-desktop/js/notifications.js');
});

// ==================== A. AOSP 常量锚（实拉源码实证） ====================

describe('A. AOSP 常量锚（config.xml 实证值，铁律#1 非记忆）', () => {
  test('HUN_AUTO_DISMISS_MS = 5000（heads_up_notification_decay 实证值）', () => {
    expect(notisSrc()).toMatch(/const HUN_AUTO_DISMISS_MS = 5000/);
    expect(notisSrc()).toContain('heads_up_notification_decay');
  });
  test('HUN_TOUCH_ACCEPTANCE_MS = 700（touch_acceptance_delay 实证值）', () => {
    expect(notisSrc()).toMatch(/const HUN_TOUCH_ACCEPTANCE_MS = 700/);
    expect(notisSrc()).toContain('touch_acceptance_delay');
  });
  test('头注留痕：未取用常量在册（minimum_time/sticky/auto_decay）', () => {
    const s = notisSrc();
    expect(s).toContain('heads_up_notification_minimum_time');
    expect(s).toContain('sticky_heads_up_notification_time');
    expect(s).toContain('auto_heads_up_notification_decay');
  });
  test('堆叠裁决留痕：AvalancheController 单条排队语义 + 议题规格超越注记', () => {
    const s = notisSrc();
    expect(s).toContain('AvalancheController');
    expect(s).toContain('铁律#2 议题规格超越');
  });
});

// ==================== B. 堆叠规则（≤3 挤旧）与数据单源 ====================

describe('B. 堆叠规则与数据单源', () => {
  test('B1. 150ms×5 连发：存活横幅恒 ≤3、栈容器单实例、逐条独立元素', async () => {
    const stack0 = document.getElementById('headsUpStack');
    if (stack0) stack0.remove();
    for (let i = 0; i < 5; i++) {
      noti.addSystemNotification({ id: `v64-burst-${i}`, app: '压测', appId: '', title: `连发 ${i}`, desc: 'd', time: '刚刚' });
      await sleep(150);
    }
    const dbg = window.__headsUpDebug;
    expect(dbg).toBeTruthy();
    expect(dbg.aliveCount).toBeLessThanOrEqual(3); // 堆叠上限（exit 中元素不计）
    expect(dbg.count).toBeLessThanOrEqual(5);      // exit 动画中的元素仍在册
    const stacks = document.querySelectorAll('#headsUpStack');
    expect(stacks.length).toBe(1);                 // 栈容器单实例（复用不重建）
    expect(document.querySelectorAll('.hun-banner').length).toBeGreaterThan(0);
  });

  test('B2. 新条置顶（prepend 视觉序：最新在上，AOSP HUN 同构）；v10.33 #197 Avalanche 语义：槽满入队不再齐射', () => {
    const stack = document.getElementById('headsUpStack');
    expect(stack).toBeTruthy();
    expect(stack.firstElementChild).toBeTruthy();
    // v10.33 #197：旧齐射语义（5 条全渲染，burst-4 在顶）退役——Avalanche 排队后槽内
    // 仅前 3 条（burst-2 最新在顶），burst-3/4 入队等待退场放行（等待而非挤掉）
    expect(stack.firstElementChild._entry.item.id).toBe('v64-burst-2'); // 槽内最新在最上
    const q = window.__headsUpDebug.queue();
    expect(q.showing).toEqual(['v64-burst-0', 'v64-burst-1', 'v64-burst-2']);
    expect(q.waiting).toEqual(['v64-burst-3', 'v64-burst-4']);
  });

  test('B3. 数据单源：5 条连发全部进通知中心 Feed（与锁屏/面板同源）', () => {
    const feed = noti.getNotifications();
    for (let i = 0; i < 5; i++) {
      expect(feed.some((n) => n.id === `v64-burst-${i}`)).toBe(true);
    }
  });

  test('B4. 状态机四态在册（entering/peek/drag/exit 枚举于源码）', () => {
    const s = notisSrc();
    expect(s).toMatch(/state: 'entering'/);
    expect(s).toContain("entry.state = 'peek'");
    expect(s).toContain("entry.state !== 'drag'");
    expect(s).toContain("en.state === 'exit'");
    const dbg = window.__headsUpDebug;
    expect(Array.isArray(dbg.states())).toBe(true);
    expect(dbg.states().length).toBe(dbg.count);
  });
});

// ==================== C. 手势三通道与中断路径（源码锚 + v785 范式） ====================

describe('C. 手势三通道与中断路径', () => {
  test('C1. 上滑收起：位移阈值 56px 与甩出速度 480px/s 双通道，速度接力入弹簧', () => {
    const s = notisSrc();
    expect(s).toMatch(/const HUN_DISMISS_DIST = 56/);
    expect(s).toMatch(/const HUN_FLING_VELOCITY = 480/);
    expect(s).toContain('dy <= -HUN_DISMISS_DIST || velocity <= -HUN_FLING_VELOCITY');
    expect(s).toContain('exitHeadsUp(entry, Math.min(velocity, 0) - 240)'); // 松手速度接力
  });
  test('C2. 下滑展开通知栏：openPullPanel(0) + 清栈即时收', () => {
    const s = notisSrc();
    expect(s).toMatch(/const HUN_SHADE_DIST = 72/);
    expect(s).toContain('openPullPanel(0)');
    expect(s).toContain('for (const other of Array.from(hunEntries)) destroyHeadsUpEntry(other)');
  });
  test('C3. touch acceptance：出现 700ms 内拒收 pointerdown（AOSP 同名常量同语义）', () => {
    const s = notisSrc();
    expect(s).toContain('performance.now() - entry.birth < HUN_TOUCH_ACCEPTANCE_MS');
  });
  test('C4. 中断路径：滑入中触摸路由 / exit 中新条独立 / 面板守卫清栈 / pointercancel 回弹', () => {
    const s = notisSrc();
    expect(s).toContain("if (entry.state === 'exit') return;");        // exit 幂等（滑入中路由不重入）
    expect(s).toContain('if (en.state === \'exit\') return;');          // exit 二次触发幂等
    expect(s).toContain('hunGuardTick');                                // 面板打开守卫循环
    expect(s).toContain("isPullPanelsActive()");                        // 守卫判据
    expect(s).toContain("addEventListener('pointercancel'");            // cancel 回弹路径
    expect(s).toContain('armAutoDismiss()');                            // 回弹后重排自动收
  });
  test('C5. 点击路由三段：深链优先 → appId 精确 → msg 兜底（audit-B 语义原样迁移）', () => {
    const s = notisSrc();
    expect(s).toContain('function routeHeadsUpClick(cur, sourceRect)');
    expect(s).toContain('if (routeDeepLink(cur.deepLink, sourceRect)) return;');
    expect(s).toContain("initialApps.findIndex(a => a.id === 'msg')");
  });
});

// ==================== D. 弹簧纪律与工程面 ====================

describe('D. 弹簧纪律与工程面', () => {
  test('D1. spring.js 闭式解 + motion.js tweenValue（速度接力，back-pill 同款纪律）', () => {
    const s = notisSrc();
    expect(s).toContain("import { makeSpringParams } from './spring.js'");
    expect(s).toContain("import { tweenValue } from './motion.js'");
    expect(s).toMatch(/makeSpringParams\(0\.34, 0\.9, 1\)/);
    expect(s).toMatch(/tweenValue\(\{[^}]*velocity: velocity \|\| 0/s);
  });
  test('D2. DND 门控零回归：勿扰开启不弹横幅（数据照常入 Feed）', async () => {
    document.body.classList.add('dnd-mode-active');
    const before = (window.__headsUpDebug || { count: 0 }).count;
    noti.addSystemNotification({ id: 'v64-dnd', app: '勿扰', appId: '', title: 't', desc: 'd', time: 'x' });
    expect((window.__headsUpDebug || { count: 0 }).count).toBe(before); // 不新增横幅
    expect(noti.getNotifications().some((n) => n.id === 'v64-dnd')).toBe(true); // 数据照常
    document.body.classList.remove('dnd-mode-active');
  });
  test('D3. 音效/振动链路保持（playSfx + navigator.vibrate）', () => {
    const s = notisSrc();
    expect(s).toContain("playSfx('notify')");
    expect(s).toContain('navigator.vibrate');
  });
  test('D4. 面板已开不弹横幅（AOSP：shade 开则 HUN 不再 peek）', () => {
    const s = notisSrc();
    expect(s).toContain('if (isPullPanelsActive()) return;');
  });
  test('D5. 只读测试桥在册（__headsUpDebug 零写入面；v10.33 #197 扩容 queue/snoozed 观测）', () => {
    const dbg = window.__headsUpDebug;
    expect(Object.keys(dbg).sort()).toEqual(['count', 'items', 'states', 'aliveCount', 'queue', 'snoozed'].sort());
  });
});
