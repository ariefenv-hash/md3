// ==================== clock93-ui-core.test.js — 9.3 Gastown UI 交互核心（从零移植） ====================
// 验收三层：① 纯函数状态机 ② 9.3 规格结构逐字锚 ③ 桌面注册与 AVD 接线。
// 证据源 docs/reference/deskclock/gastown93/README.md（#330 反编译卷）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as C from '../ios-desktop/apps/clock-app/clock93-core.mjs';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const HTML = () => read('ios-desktop/apps/clock-app/index.html');
const APP = () => read('ios-desktop/apps/clock-app/app.mjs');
const CORE = () => read('ios-desktop/apps/clock-app/clock93-core.mjs');
const ASSETS = () => read('ios-desktop/apps/clock-app/avd/gastown93-assets.mjs');

// ================================================================ ① 纯函数状态机
describe('9.3 交互核心 · 纯函数状态机', () => {
  it('五 tab 真机顺序与规格常量', () => {
    expect(C.TAB_ORDER).toEqual(['Alarm', 'World', 'Timer', 'Stopwatch', 'Bedtime']);
    expect(Object.keys(C.TAB_LABELS)).toEqual(C.TAB_ORDER);
    expect(C.TAB_LABELS.Bedtime).toBe('就寝时间'); // 9.3 标签翻面（非「睡眠时间」）
    expect(C.GASTOWN93_SPEC.fabSize).toBe(80);
    expect(C.GASTOWN93_SPEC.fontAxes).toEqual({ wght: 450, ROND: 100, wdth: 80 });
    expect(C.PRESET_MINUTES).toEqual([1, 3, 5, 10, 15]);
    expect(C.fontVariation()).toBe("'wght' 450, 'ROND' 100, 'wdth' 80");
  });

  it('格式化：闹钟 / 秒表 / 倒计时 / 时差', () => {
    expect(C.pad2(7)).toBe('07');
    expect(C.formatAlarmTime(7, 5)).toBe('07:05');
    expect(C.formatStopwatch(0)).toBe('00:00.00');
    expect(C.formatStopwatch(65430)).toBe('01:05.43');
    expect(C.formatCountdown(0)).toBe('00:00');
    expect(C.formatCountdown(3661000)).toBe('1:01:01');
    expect(C.formatCountdown(65000)).toBe('01:05');
    expect(C.clockAt(Date.UTC(2026, 0, 2, 3, 4, 5), 480).text).toBe('11:04');
    expect(C.formatOffset(480, 540)).toContain('快 1 小时');
    expect(C.formatOffset(480, 480)).toBe('与本地时间相同');
  });

  it('闹钟：建/序/重复日/下次响铃', () => {
    const a = C.makeAlarm({ id: 'x', h: 25, m: 70, label: '测试', days: [3, 1, 1] });
    expect(a.h).toBe(1); expect(a.m).toBe(10); expect(a.days).toEqual([1, 3]);
    expect(C.alarmTimeText(a)).toBe('01:10');
    expect(C.describeDays([])).toBe('每天');
    expect(C.describeDays([0, 1, 2, 3, 4, 5, 6])).toBe('每天');
    expect(C.describeDays([1, 3])).toBe('周一 · 周三');
    const list = [C.makeAlarm({ id: 'b', h: 9, m: 0 }), C.makeAlarm({ id: 'a', h: 7, m: 30 })];
    expect(C.sortAlarms(list).map((x) => x.id)).toEqual(['a', 'b']);
    // 2026-01-02 是周五(5)，UTC 03:00 → 本地 UTC+8 11:00，下一「每天 07:30」应为次日
    const now = Date.UTC(2026, 0, 2, 3, 0, 0);
    const ms = C.nextAlarmMs(C.makeAlarm({ id: 'n', h: 7, m: 30 }), now, 480);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(24 * 3600000); // 每天闹钟最近一次 = 次日，不跳整周
    expect(C.nextAlarmMs(C.makeAlarm({ id: 'd', h: 7, m: 30, days: [1, 3] }), now, 480))
      .toBeGreaterThanOrEqual(ms);
    expect(C.upcomingText(C.makeAlarm({ id: 'u', h: 7, m: 30 }), now, 480)).toMatch(/小时后|小时/);
  });

  it('计时器键盘：3×4 左移压入 / 00 / 退格 / 钳制', () => {
    let s = { digits: '000000' };
    for (const k of ['1', '2', '3', '4', '5', '6']) s = C.keypadReducer(s, k);
    expect(s.digits).toBe('123456');
    expect(C.digitsToSeconds(s.digits)).toBe(12 * 3600 + 34 * 60 + 56);
    expect(C.timerColumns('123456')).toEqual([
      { value: '12', unit: '时' }, { value: '34', unit: '分' }, { value: '56', unit: '秒' },
    ]);
    expect(C.keypadReducer(s, 'backspace').digits).toBe('012345');
    expect(C.keypadReducer(s, '00').digits).toBe('345600');
    expect(C.keypadReducer(s, 'x').digits).toBe('123456');
    expect(C.keypadReducer(s, 'clear').digits).toBe('000000');
    expect(C.digitsToSeconds('000000')).toBe(0);
  });

  it('计时器 tick 与环形进度', () => {
    const r = C.timerTick({ remainingMs: 5000, running: true }, 2000);
    expect(r.remainingMs).toBe(3000); expect(r.done).toBe(false);
    const z = C.timerTick({ remainingMs: 1000 }, 5000);
    expect(z.remainingMs).toBe(0); expect(z.done).toBe(true);
    const p = C.ringProgress(500, 1000, 1000);
    expect(p.fraction).toBe(0.5);
    expect(Number(p.dash) + Number(p.gap)).toBeCloseTo(1000, 2);
  });

  it('秒表：记圈 / 分段用时 / 最佳圈', () => {
    expect(C.lapReducer([], 1200)).toEqual([1200]);
    expect(C.lapReducer([1200], 3500)).toEqual([1200, 3500]);
    expect(C.lapDeltas([1200, 3500, 6000])).toEqual([1200, 2300, 2500]);
    expect(C.formatLap(2300)).toBe('00:02.30');
    expect(C.formatLap(C.lapDeltas([1000, 2500])[1])).toBe('00:01.50');
  });

  it('就寝：跨零点时长 / 8 连排活动条 / tab 键盘循环', () => {
    expect(C.bedtimeDurationMinutes(22, 30, 7, 0)).toBe(510);
    expect(C.bedtimeDurationMinutes(7, 0, 7, 0)).toBe(0);
    const b = C.activityBuckets(1);
    expect(b).toHaveLength(8);
    expect(b.every((x) => x >= 18 && x <= 100)).toBe(true);
    expect(C.activityBuckets(1)).toEqual(b); // 零 Math.random，同 seed 确定性
    expect(C.nextTab('Alarm', 1)).toBe('World');
    expect(C.nextTab('Bedtime', 1)).toBe('Alarm');
    expect(C.nextTab('Alarm', -1)).toBe('Bedtime');
  });

  it('纯函数核纪律：零 DOM / 零 Date.now / 零 Math.random', () => {
    const s = CORE();
    expect(s).not.toMatch(/\bdocument\.[a-zA-Z]/);
    expect(s).not.toMatch(/\bDate\.now\s*\(/);
    expect(s).not.toMatch(/\bMath\.random\s*\(/);
    expect(s).not.toMatch(/\blocalStorage\./);
  });
});

// ================================================================ ② 9.3 规格结构锚
describe('9.3 主壳 · 规格逐字锚', () => {
  it('五 tab DOM 顺序 + animated-selector 接线', () => {
    const h = HTML();
    const tabs = [...h.matchAll(/class="nav-item[^"]*"\s+data-tab="(\w+)"/g)].map((m) => m[1]);
    expect(tabs).toEqual(C.TAB_ORDER);
    expect(h).toContain('<nav class="gastown-nav"');
    expect(h).toContain('src="./avd/gastown-nav.mjs"');
    expect(h).toContain('src="./app.mjs"');
    // 静态双态矢量 5×2 逐字来自 9.3 原始资产
    const assets = ASSETS();
    const json = JSON.parse(assets.slice(assets.indexOf('GASTOWN93_TABS = ') + 17, assets.indexOf(';\n', assets.indexOf('GASTOWN93_TABS = '))));
    for (const k of C.TAB_ORDER) {
      expect(h).toContain(json[k].sel);
      expect(h).toContain(json[k].un);
    }
    expect(h.match(/class="p-sel"/g)).toHaveLength(5);
    expect(h.match(/class="p-un"/g)).toHaveLength(5);
  });

  it('AVD 过渡期静态 item 让位，图标动画唯一驱动为 9.3 时间轴', () => {
    const h = HTML();
    expect(h).toContain('.nav-item.avd-playing .nav-icon-wrapper .p-sel');
    expect(h).toContain('.gastown-avd-overlay');
    expect(h).not.toMatch(/@keyframes[^{]*\{[^}]*\.p-sel/); // 无叠播的 CSS 图标 keyframes
    const app = APP();
    expect(app).toContain("it.classList.toggle('active', sel)"); // 只切 class 触发 AVD
    expect(app).not.toContain('animate-click');
  });

  it('FAB / 卡片 / 大时间 / 城市卡 / 计时器 / 秒表实测值', () => {
    const h = HTML();
    for (const s of [
      '--g93-fab: 80px', '--g93-fab-r: 24px', '--g93-fab-icon: 28px',
      '--g93-card-r: 24px', '--g93-alarm-time: 36px',
      '--g93-main-clock: 56px', '--g93-analog: 240px',
      '--g93-city-name: 24px', '--g93-city-offset: 16px', '--g93-city-clock: 57px',
      '--g93-ring-track: 12px', '--g93-ring-r: 6px', '--g93-ring-gap: 12px',
      '--g93-timer-text: 80px', '--g93-btn-r: 512px', '--g93-rail: 80px',
    ]) expect(h, s).toContain(s);
    expect(h).toContain('viewBox="0 0 340 340"'); // 环形进度 indicatorSize 340dp
    expect(h).toContain('width: 48px; height: 48px'); // 秒表前后圈箭头
    expect(h).toContain('box-shadow: none'); // 闹钟卡 elevation 0
    expect(h).toContain('grid-template-columns: repeat(3, 1fr)'); // 键盘 3 列
    expect(h).toContain('data-page="Bedtime"'); // 第五页「就寝时间」
    expect(h).toContain('g93-activity'); // 8 连排活动可视化条
  });

  it('大时间可变字体三档（基线 450 / 城市 500 / 暂停 250）+ tnum', () => {
    const h = HTML();
    expect(h).toContain("'wght' 450, 'ROND' 100, 'wdth' 80");
    expect(h).toContain("'wght' 500, 'ROND' 100, 'wdth' 100");
    expect(h).toContain("'wght' 250, 'ROND' 100, 'wdth' 80");
    expect(h).toContain('font-variant-numeric: tabular-nums');
    expect(h).toContain('letter-spacing: -0.04em');
    expect(h).toContain('roboto-flex.css'); // 本地可变字体，零外链
  });

  it('响应式四档真布局变体（h600 / h800 / w1536 / land 侧轨）', () => {
    const h = HTML();
    expect(h).toContain('@media (min-height: 600px)');
    expect(h).toContain('@media (min-height: 800px)');
    expect(h).toContain('@media (min-width: 1536px)');
    expect(h).toContain('@media (orientation: landscape) and (max-height: 600px)');
    expect(h).toContain('flex-direction: column; width: var(--g93-rail)'); // 横屏 NavigationRail
    expect(h).toContain('max-width: 52%'); // 宽屏世界时钟 52% 分栏
  });

  it('开关小球使用安卓17样式（A17 Expressive Switch 单一真源，非自绘）', () => {
    const h = HTML();
    const app = APP();
    // 共享样式表 + 标准 DOM + 引擎接线（三者缺一即退回自绘近似）
    expect(h).toContain('href="../../css/md3-theme.css"');
    expect(h).toContain('class="md3-switch"');
    expect(h).toContain('class="slider"><span class="thumb"');
    expect(h).not.toContain('.sw-handle');       // 旧自绘小球已退役
    expect(app).toContain("initM3Switch } from '../../js/m3-controls.js'");
    expect(app).toContain("querySelectorAll('.md3-switch').forEach(initM3Switch)");
    expect(app).toContain('data-toggle=');
    // A17 组件本体的逐值锚（✓/✕ thumbContent / 24-28dp / 4-4 端隙）
    const ctrl = read('ios-desktop/js/m3-controls.js');
    const css = read('ios-desktop/css/md3-theme.css');
    expect(ctrl).toContain('const THUMB_REST = 24');
    expect(ctrl).toContain('const THUMB_PRESSED = 28');
    expect(ctrl).toContain('M382,720L154,492L211,435L382,606L749,239L806,296L382,720Z');
    expect(css).toContain('.md3-switch input:checked + .slider .thumb');
    expect(css).toContain('.a17-thumb-icon');
  });
});

// ================================================================ ③ 桌面注册
describe('9.3 时钟 · 桌面注册', () => {
  it('独立应用身份 clock93（不复用已退役的旧实现）', () => {
    const d = read('ios-desktop/js/apps/clock93.js');
    expect(d).toContain("id: 'clock93'");
    expect(d).toContain("iframeAppContent('apps/clock-app/index.html')");
    expect(read('ios-desktop/js/apps-data.js')).toContain("import clock93 from './apps/clock93.js'");
    expect(read('ios-desktop/js/apps-data.js')).toContain('clock93, // v11.52 #330');
    expect(read('ios-desktop/js/app-icons.js')).toContain("APP_ICONS['clock93']");
    expect(d).not.toContain('clock_app');
  });

  it('9.3 原始 AVD 三模块原地保留（旧测试锚零改动）', () => {
    expect(read('ios-desktop/apps/clock-app/avd/avd-runtime.mjs')).toContain('export function playAVD');
    expect(read('ios-desktop/apps/clock-app/avd/gastown-nav.mjs')).toContain('MutationObserver');
    expect(ASSETS()).toContain('"objectAnimators": 53');
  });

  it('AXML→Web SVG 兼容层：孤立无参命令字母运行时剥离，原始资产数值零改写', () => {
    const r = read('ios-desktop/apps/clock-app/avd/avd-runtime.mjs');
    expect(r).toContain('function safePathData(d)');
    expect(r).toContain('.replace(/([a-yA-Y])\\s*(?=[a-zA-Z]|$)/g');
    expect(r.match(/safePathData\(/g).length).toBeGreaterThanOrEqual(4); // 定义 + 3 写入点
    // 资产仍逐字保留原始 pathData（不改数值）
    expect(ASSETS()).toContain('10.65,-5.57c');
  });
});
