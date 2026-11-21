// ==================== clock-gastown93-avd.test.js — #330 返工：9.3 AVD 三层架构 ====================
// 用户裁决：不要「换两张图 + CSS keyframes」的改良方案，必须按 9.3 APK 原始
// <vector>/<animated-vector>/<objectAnimator>/<pathInterpolator> 三层重构。
// 证据：docs/reference/deskclock/gastown93/（#330 附件 base.apk 原始 AXML）
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLOCK = ROOT + '/ios-desktop/apps/clock-app';
const html = () => readFileSync(CLOCK + '/index.html', 'utf8');
const assets = () => readFileSync(CLOCK + '/avd/gastown93-assets.mjs', 'utf8');
const runtime = () => readFileSync(CLOCK + '/avd/avd-runtime.mjs', 'utf8');
const wiring = () => readFileSync(CLOCK + '/avd/gastown-nav.mjs', 'utf8');

const TABS = ['Alarm', 'World', 'Timer', 'Stopwatch', 'Bedtime'];
const AVD_NAMES = [
  'avd_tab_alarms_transition', 'avd_tab_world_clock_transition',
  'avd_tab_timers_transition', 'avd_tab_stopwatch_transition',
  'avd_tab_bedtime_transition',
];

describe('#330 返工 — 9.3 原始资源逐字入库（非近似、非改良）', () => {
  it('五个 tab 的 AVD 资产名与 960 viewport 静态双态 pathData 全在', () => {
    const a = assets();
    for (const k of TABS) expect(a).toContain('"' + k + '":');
    for (const n of AVD_NAMES) expect(a).toContain(n);
    expect(a).toContain('"viewport":24');
  });

  it('objectAnimator 总数 53 / pathData 形变 12 / 贝塞尔曲线 46 全部来自 APK', () => {
    const a = assets();
    // 解析导出的常量做结构断言（不依赖注释里的数字）
    const json = a.split('export const GASTOWN93_TABS = ', 2)[1].split(';\n', 1)[0];
    const d = JSON.parse(json);
    expect(Object.keys(d)).toEqual(TABS);
    let oa = 0, morph = 0, curve = 0;
    for (const v of Object.values(d)) {
      for (const t of v.targets) for (const an of t.animators) {
        oa++;
        if (an.property === 'pathData') morph++;
        if (an.easing) curve++;
      }
    }
    expect(oa).toBe(53);
    expect(morph).toBe(12);
    expect(curve).toBe(46);
  });

  it('运行时实现 AOSP 三层：vector 构建 / animated-vector target 绑定 / objectAnimator + 插值', () => {
    const r = runtime();
    for (const s of ['buildVector', 'playAVD', 'morphPath', 'makeEasing', 'data-avd-name', 'startOffset', 'valueFrom', 'pathInterpolator']) {
      expect(r).toContain(s);
    }
    expect(r).toContain("from './gastown93-assets.mjs'");
  });

  it('animated-selector 接线：静态 item 隐藏 -> AVD overlay 播放 -> 播完交还静态态', () => {
    const w = wiring();
    expect(w).toContain('MutationObserver');
    expect(w).toContain('avd-playing');
    expect(w).toContain('gastown-avd-overlay');
    expect(w).toContain('reverse: !toSelected');
    // 旧 CSS keyframes 钩子运行时摘除（史实锚保留在 CSS 文本中，但不再激活）
    expect(w).toContain("classList.remove('animate-click')");
  });

  it('index.html 引入模块 + overlay 样式 + 响应式四档真布局变体', () => {
    const h = html();
    expect(h).toContain('<script type="module" src="./avd/gastown-nav.mjs"></script>');
    expect(h).toContain('.gastown-avd-overlay{position:absolute');
    expect(h).toContain('.nav-item.avd-playing .nav-svg{visibility:hidden}');
    expect(h).toContain('@media (min-height:600px)');
    expect(h).toContain('@media (min-height:800px)');
    expect(h).toContain('@media (min-width:1536px)');
    expect(h).toContain('@media (orientation:landscape) and (max-height:600px)');
    // 横屏 NavigationRail + 世界时钟 52% 分栏（9.3 §二/§四 实证）
    expect(h).toContain('width:52%;max-width:52%');
    expect(h).toContain('flex-direction:column;justify-content:flex-start');
  });

  it('旧 v11.50 静态双态 SVG 与 CSS 锚未被破坏（史实保留，运行时由 AVD 接管）', () => {
    const h = html();
    expect(h.match(/class="nav-svg nav-msr-icon"/g)?.length).toBe(5);
    expect(h).toContain('.nav-svg .p-sel{display:none}');
    expect(h).toContain('.nav-item.active .nav-svg .p-sel{display:block}');
  });
});
