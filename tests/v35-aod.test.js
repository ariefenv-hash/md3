// ==================== v35-aod.test.js — #35 AOD 息屏常显（v10.45 doze 语义） ====================
//  A. 纯逻辑核 aosp/aod-core.js：normalizeIdleMs 规整 / 两态状态机（expire/arm/activity 幂等）
//  B. 零 rAF 纪律：aod-core/aod-ui 全文无 requestAnimationFrame（issue 验收「rAF 停用」）
//  C. 接线锚：aod-ui（单源 settings:display-v1 / 锁屏兜底 / 分钟链 / 上滑唤醒）+ lock-screen
//     isLockedNow + quick-settings（熄屏钮 + 锁定磁贴单源升级）+ main initAod + settings
//     （dspAodToggle + store.set('aod')）+ index.html（css 链 + powerAodBtn）+ css z=99000
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const R = (p) => readFileSync(resolve(ROOT, p), 'utf-8');

import { AOD_DEFAULT_IDLE_MS, AOD_MIN_IDLE_MS, normalizeIdleMs, createAodController } from '../ios-desktop/js/aosp/aod-core.js';

/** 假时钟调度器：捕获 (fn,ms)，手动驱动（fired 标记 + cancel 拦截，模拟真实 setTimeout 语义） */
const fakeScheduler = () => {
  const jobs = [];
  let seq = 0;
  return {
    jobs,
    schedule: (fn, ms) => { const id = ++seq; jobs.push({ id, fn, ms, cancelled: false, fired: false }); return id; },
    cancel: (id) => { const j = jobs.find((x) => x.id === id); if (j) j.cancelled = true; },
    /** 触发最新一个未取消且未发过的 job（模拟到期）；已取消 job 直调为 no-op（真实 cancel 语义） */
    fireLatest: () => { const j = [...jobs].reverse().find((x) => !x.cancelled && !x.fired); if (j) { j.fired = true; j.fn(); } return !!j; },
    fire: (j) => { if (j && !j.cancelled && !j.fired) { j.fired = true; j.fn(); } },
    armedCount: () => jobs.filter((x) => !x.cancelled && !x.fired).length,
  };
};

describe('A. aod-core 纯逻辑', () => {
  it('A1 normalizeIdleMs：非法/低于下限→默认；边界值保留', () => {
    expect(AOD_DEFAULT_IDLE_MS).toBe(60000);
    expect(AOD_MIN_IDLE_MS).toBe(5000);
    expect(normalizeIdleMs(NaN)).toBe(60000);
    expect(normalizeIdleMs(0)).toBe(60000);
    expect(normalizeIdleMs(-1)).toBe(60000);
    expect(normalizeIdleMs(4999)).toBe(60000);
    expect(normalizeIdleMs(5000)).toBe(5000);
    expect(normalizeIdleMs(15000)).toBe(15000);
    expect(normalizeIdleMs('30000')).toBe(30000);
  });
  it('A2 闲置到期恰好一次 emit expire；disabled 不排程', () => {
    const s = fakeScheduler();
    const events = [];
    const c = createAodController({ schedule: s.schedule, cancel: s.cancel });
    c.onEvent((e) => events.push(e));
    c.configure({ enabled: false, idleMs: 15000 });
    expect(s.armedCount()).toBe(0);
    c.configure({ enabled: true });
    expect(s.armedCount()).toBe(1);
    s.fireLatest();
    expect(events).toEqual(['expire']);
    expect(s.armedCount()).toBe(0); // 到期后不重排（进 AOD 由调用方驱动）
  });
  it('A3 activity 重排：旧计时取消不误发', () => {
    const s = fakeScheduler();
    const events = [];
    const c = createAodController({ schedule: s.schedule, cancel: s.cancel });
    c.onEvent((e) => events.push(e));
    c.configure({ enabled: true, idleMs: 15000 });
    const first = s.jobs[0];
    c.activity();
    expect(first.cancelled).toBe(true);
    expect(s.armedCount()).toBe(1);
    s.fire(first); // 旧计时到期（已取消——真实 setTimeout 不会回调，假件拦截）
    expect(events).toEqual([]);
  });
  it('A4 进入/唤醒幂等 + 事件对：already-aod / not-aod', () => {
    const s = fakeScheduler();
    const events = [];
    const c = createAodController({ schedule: s.schedule, cancel: s.cancel });
    c.onEvent((e) => events.push(e));
    c.configure({ enabled: true });
    expect(c.requestEnter()).toBe('entered');
    expect(c.getState()).toBe('aod');
    expect(c.requestEnter()).toBe('already-aod');
    expect(events.filter((e) => e === 'enter').length).toBe(1);
    expect(c.wake()).toBe('woke');
    expect(c.getState()).toBe('active');
    expect(c.wake()).toBe('not-aod');
    expect(s.armedCount()).toBe(1); // 唤醒后重新武装
  });
  it('A5 快速反复熄/亮 ×5 无死锁（验收①）：状态机每轮干净复位', () => {
    const s = fakeScheduler();
    const c = createAodController({ schedule: s.schedule, cancel: s.cancel });
    c.configure({ enabled: true, idleMs: 15000 });
    for (let i = 0; i < 5; i++) {
      expect(c.requestEnter()).toBe('entered');
      expect(c.requestEnter()).toBe('already-aod'); // 同态重复进入幂等
      expect(c.getState()).toBe('aod');
      expect(c.wake()).toBe('woke');
      expect(c.wake()).toBe('not-aod'); // 非 AOD 唤醒 no-op
      expect(c.getState()).toBe('active');
      expect(c.notifyUnlock()).toBe('rearmed');
    }
    expect(s.armedCount()).toBeLessThanOrEqual(1); // 恰一计时器在挂，无泄漏
  });
  it('A6 schedule/cancel 缺失 RangeError + 订阅退订', () => {
    expect(() => createAodController({ schedule: null })).toThrow(RangeError);
    const s = fakeScheduler();
    const c = createAodController({ schedule: s.schedule, cancel: s.cancel });
    const events = [];
    const off = c.onEvent((e) => events.push(e));
    off();
    c.configure({ enabled: true });
    s.fireLatest();
    expect(events).toEqual([]);
  });
});

describe('B. 零 rAF 纪律（issue 验收「rAF 停用」）', () => {
  it('B1 aod-core.js / aod-ui.js / aod.css 全文无 requestAnimationFrame', () => {
    for (const f of ['ios-desktop/js/aosp/aod-core.js', 'ios-desktop/js/aod-ui.js', 'ios-desktop/css/aod.css']) {
      expect(R(f).includes('requestAnimationFrame')).toBe(false);
    }
  });
  it('B2 分钟跳变走 setTimeout 链（对齐下一分钟边界）', () => {
    const ui = R('ios-desktop/js/aod-ui.js');
    expect(ui).toMatch(/minuteTimer = setTimeout\(tickMinute,/);
    expect(ui).toMatch(/getMinutes\(\) \+ 1, 0, 0\)/);
  });
});

describe('C. 接线源码锚', () => {
  it('C1 aod-ui：单源 settings:display-v1 + 锁屏兜底 + 上滑唤醒 + 设置变更跟随', () => {
    const ui = R('ios-desktop/js/aod-ui.js');
    expect(ui).toContain("localStorage.getItem('settings:display-v1')");
    expect(ui).toMatch(/import \{ lockNow, isLockedNow \} from '\.\/lock-screen\.js'/);
    expect(ui).toMatch(/if \(!isLockedNow\(\)\) lockNow\(\);/);
    expect(ui).toContain('y0 - e.clientY > 24');
    expect(ui).toMatch(/addEventListener\('settings-display-changed'/);
    expect(ui).toContain('window.__aodTest');
  });
  it('C2 lock-screen：isLockedNow 只读导出（零行为变更）', () => {
    const ls = R('ios-desktop/js/lock-screen.js');
    expect(ls).toMatch(/export function isLockedNow\(\) \{ return isLocked; \}/);
  });
  it('C3 quick-settings：熄屏按钮绑定 + 锁定磁贴单源升级 aodPowerOff', () => {
    const qs = R('ios-desktop/js/quick-settings.js');
    expect(qs).toContain("import { aodPowerOff } from './aod-ui.js'");
    // v10.45 #113 重锚：aodBtn 经 GA_ITEM_DEFS 循环装配（data-ga="aod"），不再独立 const
    expect(qs).toContain("{ id: 'aod', icon: 'bedtime', label: '熄屏', danger: false }");
    expect(qs).toContain("btn.innerHTML = `${ICONS[def.icon]}<span>${def.label}</span>`");
    expect(qs).toContain("actionId === 'aod'");
    expect(qs).toContain('aodPowerOff();');
    expect(qs).toMatch(/setTimeout\(\(\) => \{ aodPowerOff\(\); \}, 120\)/);
  });
  it('C4 main.js：initAod 接入初始化序列（通知之后）', () => {
    const m = R('ios-desktop/js/main.js');
    expect(m).toContain("import { initAod } from './aod-ui.js'");
    expect(m.indexOf('initAod()')).toBeGreaterThan(m.indexOf('initNotifications()'));
  });
  it('C5 settings：dspAodToggle + store.set aod 单源 + 默认关摘要', () => {
    const st = R('ios-desktop/js/apps/settings.js');
    expect(st).toContain('id="dspAodToggle"');
    expect(st).toContain("store.set('aod', at.checked)");
    expect(st).toMatch(/息屏显示（AOD）/);
  });
  it('C6 index.html + css：aod.css 链接 / powerAodBtn / z=99000 层级窗', () => {
    const html = R('ios-desktop/index.html');
    expect(html).toContain('css/aod.css');
    expect(html).toContain('id="powerAodBtn"');
    const css = R('ios-desktop/css/aod.css');
    expect(css).toMatch(/z-index: 99000/);
    expect(css).toMatch(/aod-breathe/);
  });
});
