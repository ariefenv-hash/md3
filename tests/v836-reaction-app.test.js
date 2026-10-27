// ==================== v836-reaction-app.test.js — #29 反应力测试应用守护 ====================
//
// #29 执行要点逐条落锚：
//   状态机：等待（随机 1~7s）→ 变色提示 → 点击计时 → 结果分级
//   分级 = Human Benchmark 口径（<200 极快 / 200~300 快 / 300~400 平均 / >400 偏慢），
//          nightsky ≤100「神仙分级」弃用
//   防作弊：等待期误触判负并提示；快速重入清 timer（v7.11 教训）
//   5 轮统计（min/avg/max）+ localStorage 历史最佳 + 近 20 次记录
//   变色瞬间 scale 脉冲动效（tile-bounce 手感先例）
//   验收：150ms 级快速连点 / 中途关窗无状态残留；统计与历史持久化带锚
//
// 测试口径：
//   ① 行为级——页面内联脚本在受控沙箱求值（stub document/window/location/performance/
//      setTimeout/localStorage），取 window.__rxCore 导出的纯函数与 DI 状态机
//      （now/rand/schedule 全注入）确定性驱动全流程；
//   ② 源码锚定——注册链（apps-data/wrapper/双图标/storage-stats）+ 字符纪律。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'ios-desktop/apps/reaction/index.html'), 'utf8');
const wrapper = readFileSync(join(root, 'ios-desktop/js/apps/reaction.js'), 'utf8');
const appsData = readFileSync(join(root, 'ios-desktop/js/apps-data.js'), 'utf8');
const appIcons = readFileSync(join(root, 'ios-desktop/js/app-icons.js'), 'utf8');
const icons = readFileSync(join(root, 'ios-desktop/js/icons.js'), 'utf8');
const storageStats = readFileSync(join(root, 'ios-desktop/js/storage-stats.js'), 'utf8');

// ---------- 沙箱：求值页面内联脚本，取 __rxCore ----------
function makeSandbox({ search = '', store } = {}) {
  const listeners = { window: {}, document: {} };
  const stage = {
    innerHTML: '',
    attrs: {},
    classes: new Set(),
    offsetWidth: 100,
    listeners: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k] ?? null; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    classList: {
      add(c) { stage.classes.add(c); },
      remove(c) { stage.classes.delete(c); },
    },
  };
  const timers = [];
  let tid = 0;
  let clock = 0; // 可推进时钟（performance.now 桩；推进后再点击才有非零 dt）
  const document = {
    getElementById: () => stage,
    addEventListener(type, fn) { listeners.document[type] = fn; },
  };
  const windowObj = {
    localStorage: store ?? null,
    addEventListener(type, fn) { listeners.window[type] = fn; },
  };
  const fakeWin = new Function(
    'document', 'window', 'location', 'performance', 'setTimeout', 'clearTimeout', 'localStorage', 'URLSearchParams',
    code + '\nreturn { core: window.__rxCore, machine: window.__rx, stage: document.getElementById("stage") };'
  )(
    document, windowObj, { search }, { now: () => clock },
    (fn, ms) => { const id = ++tid; timers.push({ id, fn, ms, canceled: false }); return id; },
    (id) => { const t = timers.find((x) => x.id === id); if (t) t.canceled = true; },
    store ?? null, URLSearchParams,
  );
  return { ...fakeWin, stage, timers, listeners, windowObj, advance: (ms) => { clock += ms; } };
}

const scriptMatch = page.match(/<script>\n([\s\S]*?)<\/script>/);
const code = scriptMatch ? scriptMatch[1] : '';

// ---------- DI 状态机夹具：全注入时钟/随机/调度 ----------
function makeEnvMachine(core, { ls = null, now0 = 1000, delayOverride = 0 } = {}) {
  let t = now0;
  let pending = null; // { fn, ms, canceled }
  const machine = core.createMachine({
    ls,
    rand: () => 0.42,
    now: () => t,
    delayOverride,
    schedule: (fn, ms) => {
      pending = { fn, ms, canceled: false };
      return () => { pending.canceled = true; };
    },
    onState: () => {},
  });
  return {
    machine,
    tick(ms) { t += ms; },
    fire() { // 触发当前等待计时器（仅未被取消时生效——v7.11 教训的断言面）
      if (!pending) throw new Error('no pending timer');
      if (pending.canceled) throw new Error('pending timer was canceled (cleared correctly)');
      pending.fn();
    },
    pendingCanceled: () => !pending || pending.canceled,
  };
}

describe('v8.36 #29 纯函数：Human Benchmark 分级口径', () => {
  const { core } = makeSandbox();
  const { gradeOf, GRADE_THRESHOLDS } = core;

  it('阈值表 [200,300,400]（#29 原文口径，nightsky ≤100 弃用）', () => {
    expect(GRADE_THRESHOLDS).toEqual([200, 300, 400]);
    expect(page).toContain('Human Benchmark');
    expect(page).not.toMatch(/max:\s*100/);
    expect(page).toMatch(/nightsky 的 ≤100「神仙分级」弃用/);
  });

  it('四档边界逐点断言：199/200/299/300/399/400/401', () => {
    expect(gradeOf(199).tier).toBe(0);
    expect(gradeOf(199).label).toBe('极快');
    expect(gradeOf(200).tier).toBe(1);
    expect(gradeOf(200).label).toBe('快于多数人');
    expect(gradeOf(299).tier).toBe(1);
    expect(gradeOf(300).tier).toBe(2);
    expect(gradeOf(300).label).toBe('平均水准');
    expect(gradeOf(399).tier).toBe(2);
    expect(gradeOf(400).tier).toBe(3);
    expect(gradeOf(400).label).toBe('偏慢');
    expect(gradeOf(401).tier).toBe(3);
  });

  it('异常输入防御：0/负数/NaN/Infinity 不抛不越档', () => {
    expect(gradeOf(0).tier).toBe(0);
    expect(gradeOf(-5).tier).toBe(0);
    expect(gradeOf(NaN).tier).toBe(0);
    expect(gradeOf(Infinity).tier).toBe(3);
  });
});

describe('v8.36 #29 纯函数：5 轮统计与随机窗', () => {
  const { core } = makeSandbox();

  it('summarize：min/avg/max/grade 全对（230..270 → avg 250 快于多数人）', () => {
    const s = core.summarize([230, 240, 250, 260, 270]);
    expect(s.min).toBe(230);
    expect(s.max).toBe(270);
    expect(s.avg).toBe(250);
    expect(s.count).toBe(5);
    expect(s.grade.tier).toBe(1);
  });

  it('summarize 防御：空/脏数据过滤后为 null', () => {
    expect(core.summarize([])).toBe(null);
    expect(core.summarize([NaN, 0, -1, undefined])).toBe(null);
    expect(core.summarize([210, 'x', null, 250]).count).toBe(2);
  });

  it('随机等待窗 1~7s：rand=0 → 1000ms，rand→1⁻ → ≤7000ms', () => {
    expect(core.pickDelay(() => 0, 0)).toBe(1000);
    expect(core.pickDelay(() => 0.9999999, 0)).toBeLessThanOrEqual(7000);
    expect(core.pickDelay(() => 0.5, 0)).toBeGreaterThan(1000);
    // 测试缝：rxdelay 覆盖随机（e2e 确定性）
    expect(core.pickDelay(() => 0, 250)).toBe(250);
    expect(page).toContain('rxdelay');
  });
});

describe('v8.36 #29 状态机（DI 行为级）：防作弊 / 清 timer / 5 轮闭环', () => {
  function coreWithStore() {
    const mem = new Map();
    const store = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
    };
    return { core: makeSandbox({ store }).core, store, mem };
  }

  it('等待期误触判负：轮次作废不进统计、待触发 timer 已清（防「迟到变色」幽灵态）', () => {
    const { core, store, mem } = coreWithStore();
    const env = makeEnvMachine(core, { ls: store });
    env.machine.startRound();
    expect(env.machine.state()).toBe('waiting');
    env.machine.pointer(); // 等待期点击 = 犯规
    expect(env.machine.state()).toBe('foul');
    const snap = env.machine.snapshot();
    expect(snap.fouls).toBe(1);
    expect(snap.rounds).toEqual([]);
    expect(env.pendingCanceled()).toBe(true); // v7.11 教训：判负必须同时清掉随机等待 timer
    expect(() => env.fire()).toThrow(/canceled/); // 幽灵变色被彻底阻断
    // 犯规不进统计
    expect(mem.size).toBe(0);
    // 犯规后点击回 idle 可重新开始
    env.machine.pointer();
    expect(env.machine.state()).toBe('idle');
    env.machine.startRound();
    expect(env.machine.state()).toBe('waiting');
  });

  it('就绪期点击计时：ms 落统计、bestSingle 更新、结果态带分级', () => {
    const { core, store, mem } = coreWithStore();
    const env = makeEnvMachine(core, { ls: store });
    env.machine.startRound();
    env.tick(1200);
    env.fire(); // → ready（t0 = now）
    expect(env.machine.state()).toBe('ready');
    env.tick(233);
    env.machine.pointer(); // → result，dt = 233
    expect(env.machine.state()).toBe('result');
    const snap = env.machine.snapshot();
    expect(snap.rounds).toEqual([233]);
    expect(snap.lastResult.grade.label).toBe('快于多数人');
    const saved = JSON.parse(mem.get('reaction_stats_v1'));
    expect(saved.attempts.length).toBe(1);
    expect(saved.attempts[0].ms).toBe(233);
    expect(saved.bestSingle).toBe(233);
  });

  it('5 轮闭环 → summary（min/avg/max）→ bestAvg 持久化 → 回 idle', () => {
    const { core, store, mem } = coreWithStore();
    const env = makeEnvMachine(core, { ls: store });
    const times = [210, 220, 250, 190, 310];
    for (let i = 0; i < 5; i++) {
      env.machine.startRound();
      expect(env.machine.state()).toBe('waiting');
      env.fire();
      env.tick(times[i]);
      env.machine.pointer();
      expect(env.machine.state()).toBe('result');
      env.machine.pointer(); // result → （未满 5 轮）下一轮 waiting /（满 5 轮）summary
      expect(env.machine.state()).toBe(i < 4 ? 'waiting' : 'summary');
    }
    const sm = env.machine.snapshot().lastSummary;
    expect(sm.min).toBe(190);
    expect(sm.max).toBe(310);
    expect(sm.avg).toBe(236);
    expect(sm.grade.tier).toBe(1);
    const saved = JSON.parse(mem.get('reaction_stats_v1'));
    expect(saved.attempts.length).toBe(5);
    expect(saved.bestAvg).toBe(236);
    expect(saved.bestSingle).toBe(190);
    // summary 点击 → idle（新一轮）
    env.machine.pointer();
    expect(env.machine.state()).toBe('idle');
    env.machine.startRound();
    expect(env.machine.snapshot().rounds).toEqual([]); // 轮次已清零
  });

  it('中途关窗/切后台：destroy 清 timer 回 idle，无状态残留（验收项）', () => {
    const { core, store } = coreWithStore();
    const env = makeEnvMachine(core, { ls: store });
    env.machine.startRound();
    expect(env.machine.state()).toBe('waiting');
    env.machine.destroy();
    expect(env.pendingCanceled()).toBe(true);
    expect(() => env.fire()).toThrow(/canceled/);
    // destroy 内部直接复位（不再经 onState 渲染）——状态机层无残留
    env.machine.startRound();
    expect(env.machine.state()).toBe('waiting');
  });

  it('150ms 级快速连点：状态守卫天然串行化——waiting 犯规 / foul 回 idle / idle 再开，零崩溃', () => {
    const { core, store } = coreWithStore();
    const env = makeEnvMachine(core, { ls: store });
    env.machine.startRound();
    env.machine.pointer(); // waiting → foul
    env.machine.pointer(); // foul → idle
    env.machine.pointer(); // idle → startRound → waiting
    expect(env.machine.state()).toBe('waiting');
    env.machine.pointer(); // 又犯规（连点第二次判负）
    expect(env.machine.snapshot().fouls).toBe(2);
    expect(env.machine.state()).toBe('foul');
  });

  it('历史留存：近 20 条封顶 + 损坏 JSON 静默降级', () => {
    const { core, store, mem } = coreWithStore();
    const stats = core.emptyStats();
    for (let i = 0; i < 25; i++) stats.attempts.push({ t: '2026-10-26T00:00:00Z', ms: 200 + i });
    core.saveStats(store, stats);
    const raw = JSON.parse(mem.get('reaction_stats_v1'));
    expect(raw.attempts.length).toBe(20);
    expect(raw.attempts[0].ms).toBe(205); // 旧的被裁掉
    expect(raw.attempts[19].ms).toBe(224);
    // 损坏 JSON → 空统计不抛
    mem.set('reaction_stats_v1', '{oops');
    expect(core.loadStats(store)).toEqual(core.emptyStats());
  });

  it('DOM 渲染层：关键状态 innerHTML 形态（沙箱求值真实渲染路径）', () => {
    const mem = new Map();
    const store = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
    const sb = makeSandbox({ store });
    expect(sb.stage.attrs['data-state']).toBe('idle');
    expect(sb.stage.innerHTML).toContain('开始测试');
    expect(sb.stage.innerHTML).toContain('历史最佳单次');
    // 全流程到 summary 的渲染形态（沙箱 timers 桩：触发最新注入的等待计时器；时钟推进 300ms）
    const m = sb.machine;
    for (let i = 0; i < 5; i++) {
      m.startRound();
      sb.timers[sb.timers.length - 1].fn();
      sb.advance(300);
      m.pointer(); // ready → result
      m.pointer(); // result →（未满）waiting /（满 5 轮）summary
    }
    expect(sb.stage.attrs['data-state']).toBe('summary');
    expect(sb.stage.innerHTML).toContain('五轮完成');
    expect(sb.stage.innerHTML).toContain('均值');
    expect(sb.stage.innerHTML).toContain('近 5 次记录');
    // 犯规渲染
    m.pointer(); // summary → idle
    m.startRound();
    m.pointer(); // waiting → foul
    expect(sb.stage.attrs['data-state']).toBe('foul');
    expect(sb.stage.innerHTML).toContain('犯规');
  });
});

describe('v8.36 #29 源码锚定：注册链与工程纪律', () => {
  it('注册链四件套：wrapper / apps-data 末位 / 双图标 / storage-stats 归属', () => {
    expect(wrapper).toContain("id: 'reaction'");
    expect(wrapper).toContain("name: '反应力测试'");
    expect(wrapper).toContain("iframeAppContent('apps/reaction/index.html')");
    expect(appsData).toContain("import reaction   from './apps/reaction.js'; // v8.36 #29");
    expect(appsData).toMatch(/installer, reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr,\n\]/); // v8.52 #58 ocr 入列末位
    expect(appIcons).toMatch(/reaction: `<svg viewBox="0 0 100 100"/);
    expect(appIcons).toContain('v8.36 #29');
    expect(icons).toMatch(/reaction: `<svg viewBox="0 0 24 24"/);
    expect(storageStats).toContain("['reaction_stats_v1', 'reaction']");
  });

  it('页面工程纪律：freeze-shim + md3-tokens + 单 localStorage 键 + 无 eval/无第三方 fetch', () => {
    expect(page).toContain('freeze-shim.js');
    expect(page).toContain('../_shared/md3-tokens.css');
    expect(page).toContain("var LS_KEY = 'reaction_stats_v1'");
    expect(page).not.toMatch(/eval\(/);
    expect(page).not.toMatch(/fetch\(/); // 纯离线自研（#29 无网络依赖）
    expect(page).toMatch(/pointerdown/);
    expect(page).toMatch(/pagehide/);
    expect(page).toMatch(/visibilitychange/);
  });

  it('动效锚点：变色 scale 脉冲 rx-pulse + 结果 rx-pop（tile-bounce 手感先例）', () => {
    expect(page).toMatch(/@keyframes rx-pulse \{ 0% \{ transform: scale\(1\); \} 42% \{ transform: scale\(1\.045\); \} 100% \{ transform: scale\(1\); \} \}/);
    expect(page).toMatch(/@keyframes rx-pop/);
    expect(page).toContain("classList.add('rx-pulse')");
  });

  it('信号色语义注记在位：交通灯功能位硬编码理由（防后续误改令牌化）', () => {
    expect(page).toContain('交通灯功能语义色');
    expect(page).toContain('g2048 赌场金身份色同例先例');
  });
});
