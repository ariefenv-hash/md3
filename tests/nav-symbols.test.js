// ==================== nav-symbols.test.js — 时钟导航图标权威化（#159 v11.50 → #330 v11.50 演进） ====================
// v11.50 #159：五个自创内联 SVG → Material Symbols 权威字形（alarm/public/timer/av_timer/bedtime）。
// v11.50 #330：Google Clock 9.3（Gastown，versionCode 76133240，证据卷
//   docs/reference/deskclock/gastown93/）主壳重新挂 gastown_nav_bar——底栏回归；导航图标按
//   gastown_tab_menu animated-selector 实证翻面为「选中/未选中双矢量 pathData 内联」
//   （tab-icons.txt，viewport 960×960），p-sel/p-un 随 .active 翻面；#159 的 data-tab 特化动画
//   钩子（.nav-msr-icon 挂到 svg）全量保留，动画语义逐项不变：摇铃/自转/翻转/按压/脉冲。
//   v8.49「顶栏胶囊」决策按新证据退役（铁律 1：新源码覆盖旧结论）。
// 仍生效：RETIRED_CLASSES 自创 SVG 部件类绝迹；退役 keyframes 绝迹；字体资产在库。
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');
const src = R('ios-desktop/apps/clock-app/index.html');

// nav 区五 tab 与中文标签映射（gastown_tab_menu 顺序即真机序；Bedtime 标签=就寝时间，9.3 zh 实证）
const TABS = [
  ['Alarm', '闹钟'],
  ['World', '世界时钟'],
  ['Timer', '计时器'],
  ['Stopwatch', '秒表'],
  ['Bedtime', '就寝时间'],
];

// 已退役的自创 SVG 部件类（HTML class 属性形态绝迹；退役说明注释中的裸词不算）
const RETIRED_CLASSES = [
  'alarm-bell-group', 'alarm-wave-left', 'alarm-wave-right',
  'globe-svg-group', 'hourglass-anim-group',
  'sand-top-chamber', 'sand-bottom-chamber',
  'sw-plunger', 'noise-svg-group', 'noise-wave-bar',
  'nav-act-only', 'nav-inact-only', 'nav-fill', 'nav-stroke',
];

describe('v11.50 #330 — A. Gastown 9.3 双态矢量图标落地（5 nav-item）', () => {
  it('每个 data-tab 的 nav-item 内是 nav-svg 双 path（p-sel 选中/p-un 未选）+ 中文标签', () => {
    for (const [tab, title] of TABS) {
      const re = new RegExp(
        `data-tab="${tab}" data-title="${title}"><div class="nav-ind"><div class="nav-icon-wrapper fc"><svg class="nav-svg nav-msr-icon" viewBox="0 0 960 960"[^>]*><path class="p-un" d="M[0-9][^"]{40,}"/><path class="p-sel" d="M[0-9][^"]{20,}"/></svg>`
      );
      expect(src, tab).toMatch(re);
    }
  });

  it('nav 双态 svg 共恰 5 处（不多不少，非 nav 区 <svg> 消费不受影响）', () => {
    expect(src.match(/class="nav-svg nav-msr-icon"/g)?.length).toBe(5);
  });

  it('选中态 path（p-sel）逐字对齐 9.3 APK 证据（五 pathData 前缀锚，防手滑改 path）', () => {
    /* 证据卷 tab-icons.txt：alarm_sel/wc_sel/timer_sel/sw_sel/bed_sel 五矢量原文 */
    expect(src).toContain('d="M339.5,851.5q-65.5-28.5-114-77t-77-114T120,520t28.5-140.5t77-114t114-77T480,160t140.5,28.5t114,77t77,114T840,520T811.5,660.5t-77,114t-114,77T480,880T339.5,851.5ZM592,688l56-56L520,504V320H440V536L592,688ZM224,94l56,56L110,320L54,264L224,94Zm512,0L906,264l-56,56L680,150l56-56Z"'); /* alarm_sel */
    expect(src).toContain('d="M40,760V160h80V560H440V240H760q66,0 113,47t47,113V760H840V640H120V760H40ZM195,485q-35-35-35-85t35-85t85-35t85,35t35,85t-35,85t-85,35t-85-35Z"'); /* bed_sel */
  });

  it('gastown-nav 底部导航栏在册 + active-indicator 药丸（M3 NavigationBar 形态）', () => {
    expect(src).toContain('class="gastown-nav"');
    expect(src).toContain('.nav-ind{width:56px;height:32px;border-radius:16px');
    expect(src).toContain('.nav-item.active .nav-ind{background:var(--md-secondary-container,var(--pi))');
    expect(src).toContain('.nav-svg .p-sel{display:none}');
    expect(src).toContain('.nav-item.active .nav-svg .p-sel{display:block}');
  });

  it('顶部 material-symbols.css 本地 vendor 引用仍在（非 nav 区字形消费不受影响）', () => {
    expect(src).toContain('../../assets/fonts/material-symbols.css');
  });

  it('RobotoFlex 本地可变字体注册引用在册（#330 大时间排版基线）', () => {
    expect(src).toContain('../../assets/fonts/roboto-flex.css');
  });

  it('两族子集 woff2 文件在库且非空（woff2 魔数）', () => {
    for (const f of ['material-symbols-outlined.woff2', 'material-symbols-rounded.woff2']) {
      const p = resolve(__dirname, '..', 'ios-desktop/assets/fonts', f);
      expect(existsSync(p), f).toBe(true);
      const buf = readFileSync(p);
      expect(buf.length, f).toBeGreaterThan(100000);
      expect(buf.subarray(0, 4).toString('latin1'), f).toBe('wOF2');
    }
  });

  it('roboto-flex woff2 在库且非空（fvar 轴口径 #190）', () => {
    const p = resolve(__dirname, '..', 'ios-desktop/assets/fonts/roboto-flex-latin.woff2');
    expect(existsSync(p)).toBe(true);
    const buf = readFileSync(p);
    expect(buf.length).toBeGreaterThan(100000);
    expect(buf.subarray(0, 4).toString('latin1')).toBe('wOF2');
  });
});

describe('v11.50 #330 — B. 自创 path 绝迹（#159 语义延续）', () => {
  it('14 个旧 SVG 部件类以 class=" 形态全文绝迹', () => {
    for (const cls of RETIRED_CLASSES) {
      expect(src, cls).not.toContain(`class="${cls}`);
      expect(src, cls).not.toContain(` ${cls}"`);
    }
  });
});

describe('v11.50 #330 — C. 动画接线（M3E 语义逐项保留，目标改挂 svg）', () => {
  it('5 条 data-tab 特化动画规则在册（bellRing/globeSpin/hgRot/swPlunge/wavePulse）', () => {
    expect(src).toContain('.nav-item.animate-click .nav-msr-icon{display:inline-block}');
    expect(src).toContain('.nav-item[data-tab="Alarm"].animate-click .nav-msr-icon{transform-origin:center;animation:bellRing .6s cubic-bezier(.36,.07,.19,.97)}');
    expect(src).toContain('.nav-item[data-tab="World"].animate-click .nav-msr-icon{transform-origin:center;animation:globeSpin .7s cubic-bezier(.4,0,.2,1)}');
    expect(src).toContain('.nav-item[data-tab="Timer"].animate-click .nav-msr-icon{transform-origin:center;animation:hgRot .85s cubic-bezier(.4,0,.2,1) forwards}');
    expect(src).toContain('.nav-item[data-tab="Stopwatch"].animate-click .nav-msr-icon{transform-origin:center;animation:swPlunge .35s var(--md-easing-spring-legacy, cubic-bezier(.34,1.56,.64,1))}');
    expect(src).toContain('.nav-item[data-tab="Bedtime"].animate-click .nav-msr-icon{transform-origin:center;animation:wavePulse .5s ease-in-out 1 both}');
  });

  it('5 个保留 keyframes 在册；3 个退役 keyframes 以 @keyframes 形态绝迹', () => {
    for (const kf of ['hgRot', 'bellRing', 'globeSpin', 'swPlunge', 'wavePulse']) {
      expect(src).toMatch(new RegExp(`@keyframes ${kf}\\{`));
    }
    for (const kf of ['hgDrain', 'hgFill', 'soundWave']) {
      expect(src, kf).not.toMatch(new RegExp(`@keyframes ${kf}\\{`));
    }
  });

  it('animate-click 生命周期不变（app.mjs：reflow 后加类触发单次动画）', () => {
    const app = R('ios-desktop/apps/clock-app/app.mjs');
    expect(app).toContain("ni.classList.remove('active','animate-click')");
    expect(app).toContain("void t.offsetWidth;t.classList.add('animate-click')");
  });
});

describe('v11.50 #330 — D. 版本锚', () => {
  it('index.html Gastown 9.3 翻面标注在册', () => {
    expect(src).toContain('v11.50 #330 Gastown 9.3：底栏回归');
    expect(src).toContain('docs/reference/deskclock/gastown93/');
  });
});
