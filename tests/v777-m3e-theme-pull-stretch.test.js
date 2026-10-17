// ==================== v7.77 — M3E 主题动态色 + 下拉扩场景 + 拉伸扩场景 锚定测试 ====================
// 覆盖：① m3e-mini / m3e.js 指示器颜色随主题动态重读（参考件 2.html readColors 语义）
//       ② m3e-pull 圆形容器 = primary-container（参考件 ContainedLoadingIndicator 语义，随主题动态）
//       ③ 设置宽栏 .tp-left/.tp-right 纳入 AOSP 拉伸增强（修复设置应用拉伸缺失）
//       ④ iframe 应用共享拉伸引擎 _shared/stretch.js（AOSP EdgeEffect 常数逐字）
//       ⑤ 下拉刷新扩场景：weather / notes / reminders / clock / music / translate
//       ⑥ 拉伸扩场景：reminders / clock / music / contacts
//       ⑦ sw.js 版本推进 geek-v89

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf-8');

describe('v7.77 · A M3E 指示器颜色主题动态（参考件 readColors 语义）', () => {
  const miniJs = read('ios-desktop/apps/_shared/m3e-mini.js');
  const hostM3e = read('ios-desktop/js/m3e.js');

  it('m3e-mini：主题变更观察器（documentElement class/style/data-theme 属性重读）', () => {
    expect(miniJs).toContain('onThemeChange');
    expect(miniJs).toContain("attributeFilter: ['class', 'style', 'data-theme']");
    // 重读后重绘静帧（reduced-motion 分支同步换色）
    expect(miniJs).toContain('paintStaticOnce');
    // stop 时反注册（无泄漏）
    expect(miniJs).toContain('offThemeChange(retheme)');
  });

  it('m3e-mini：fgVar/bgVar 指定 CSS 角色变量（下拉卡片 on-primary-container 前景）', () => {
    expect(miniJs).toContain("opts.fgVar || (contained ? '--md-on-primary-container' : '--md-primary')");
    expect(miniJs).toContain("opts.bgVar || '--md-primary-container'");
  });

  it('js/m3e.js：宿主指示器同款主题动态（观察器 + retheme 重读）', () => {
    expect(hostM3e).toContain('onThemeChange');
    expect(hostM3e).toContain("attributeFilter: ['class', 'style', 'data-theme']");
    expect(hostM3e).toContain('function retheme()');
    expect(hostM3e).toContain('offThemeChange(retheme)');
  });

  it('css/m3e.css：contained 圆形容器 = --md-primary-container 官方角色', () => {
    const css = read('ios-desktop/css/m3e.css');
    expect(css).toContain('background: var(--md-primary-container,');
  });

  it('三份 m3e-mini.js 副本完全一致（_shared / messages / translate）', () => {
    const a = read('ios-desktop/apps/_shared/m3e-mini.js');
    const b = read('ios-desktop/apps/messages/m3e-mini.js');
    const c = read('ios-desktop/apps/translate/m3e-mini.js');
    expect(b).toBe(a);
    expect(c).toBe(a);
  });
});

describe('v7.77 · B m3e-pull 圆形容器主题动态（primary-container）', () => {
  const pullJs = read('ios-desktop/apps/_shared/m3e-pull.js');

  it('圆形容器 = primary-container（不再用 surface/白底盘）', () => {
    expect(pullJs).toContain("cssVar('--md-primary-container', '#EADDFF')");
    expect(pullJs).not.toContain("cssVar('--md-surface', '#ffffff')");
  });

  it('指示器前景 = on-primary-container（contained 语义）', () => {
    expect(pullJs).toContain("fgVar: '--md-on-primary-container'");
  });

  it('卡片颜色随主题实时重读（rethemeCard 观察器），stop 时反注册', () => {
    expect(pullJs).toContain('rethemeCard');
    expect(pullJs).toContain("themeMo.observe(document.documentElement");
    expect(pullJs).toContain('offThemeChange(rethemeCard)');
  });

  it('保留 MD2 下拉样式高程阴影、去除硬边框', () => {
    expect(pullJs).toContain('box-shadow:0 3px 5px -1px');
    const cardSeg = pullJs.slice(pullJs.indexOf('var card = document.createElement'), pullJs.indexOf('var slot'));
    expect(cardSeg).not.toContain('border:');
  });

  it('挂载时设置 overscroll 遏制与 stretch 协调标记，detach 时清理', () => {
    expect(pullJs).toContain("viewport.style.overscrollBehaviorY = 'contain'");
    expect(pullJs).toContain('viewport.__m3ePullActive = true');
    expect(pullJs).toContain('delete viewport.__m3ePullActive');
  });
});

describe('v7.77 · C 设置应用拉伸修复（宽栏左/右栏纳入增强）', () => {
  const scrollFx = read('ios-desktop/js/scroll-fx.js');

  it('ENHANCE_SELECTOR 扩展 .tp-left / .tp-right', () => {
    expect(scrollFx).toContain(
      "const ENHANCE_SELECTOR = '.app-page, .panel-scroll, .theme-body, .tp-left, .tp-right';");
  });

  it('touch 兜底管线 OVER_SCROLL_IF_CONTENT_SCROLLS：顶/底缘均以 range>0 为前提（不可滚包装层不产生幽灵拉伸）', () => {
    expect(scrollFx).toContain('const scrollable = range > 0;');
    expect(scrollFx).toContain('const atTop = scrollable && el.scrollTop <= 0.5;');
    expect(scrollFx).toContain('const atBottom = scrollable && el.scrollTop >= range - 0.5;');
  });
});

describe('v7.77 · D iframe 应用共享拉伸引擎（AOSP EdgeEffect 逐字常数）', () => {
  const stretchPath = 'ios-desktop/apps/_shared/stretch.js';
  const stretchJs = existsSync(path.join(root, stretchPath)) ? read(stretchPath) : '';

  it('文件存在且暴露 __m3eStretch API', () => {
    expect(stretchJs.length).toBeGreaterThan(2000);
    expect(stretchJs).toContain('window.__m3eStretch');
    expect(stretchJs).toContain('function attach(el, opts)');
  });

  it('AOSP 拉伸弹簧/强度常数与 js/aosp/edge-effect.js 逐字一致', () => {
    expect(stretchJs).toContain('var NATURAL_FREQUENCY = 24.657;');
    expect(stretchJs).toContain('var DAMPING_RATIO = 0.98;');
    expect(stretchJs).toContain('var LINEAR_VELOCITY_TAKE_OVER = 200.0;');
    expect(stretchJs).toContain('var LINEAR_DISTANCE_TAKE_OVER = 8.0;');
    expect(stretchJs).toContain('var ON_ABSORB_VELOCITY_ADJUSTMENT = 13.0;');
    expect(stretchJs).toContain('var LINEAR_STRETCH_INTENSITY = 0.016;');
    expect(stretchJs).toContain('var EXP_STRETCH_INTENSITY = 0.016;');
    expect(stretchJs).toContain('var SCROLL_DIST_AFFECTED_BY_EXP_STRETCH = 0.33;');
  });

  it('AOSP 1:1 语义：STATE_PULL 恒保持 + 松手回弹 + 对侧消耗 + 内容不可滚不给边缘', () => {
    expect(stretchJs).toContain('var STATE_IDLE = 0, STATE_PULL = 1, STATE_RECEDE = 3;');
    expect(stretchJs).toContain('edgeBottom.onPullDistance(dy / h, 0.5)');
    expect(stretchJs).toContain('if (range > 0)');
  });

  it('v7.61 touch 兜底管线（触边锚点 + 净外拉 engage）与 scroll 测速吸收', () => {
    expect(stretchJs).toContain('tAnchorY');
    expect(stretchJs).toContain('var SCROLL_V_ABSORB = 900;');
    expect(stretchJs).toContain('onAbsorb');
  });

  it('声明式接线：script[data-stretch] 自动扫描', () => {
    expect(stretchJs).toContain("querySelectorAll('script[data-stretch]')");
    expect(stretchJs).toContain("getAttribute('data-stretch')");
  });

  it('下拉刷新协调：__m3ePullActive 时顶缘让位', () => {
    expect(stretchJs).toContain('el.__m3ePullActive');
  });

  it('prefers-reduced-motion：整引擎禁用', () => {
    expect(stretchJs).toContain('reducedMotion()');
  });
});

describe('v7.77 · E 下拉刷新扩场景（六应用接线）', () => {
  const cases = [
    ['weather', 'apps/weather/index.html', ['_shared/m3e-mini.js', '_shared/m3e-pull.js', 'btnRefresh', 'animate-spin']],
    ['notes', 'apps/notes/index.html', ['_shared/m3e-mini.js', '_shared/m3e-pull.js', "localStorage.getItem('memos')"]],
    ['reminders', 'apps/reminders/index.html', ['_shared/m3e-pull.js', 'md3_groups', 'renderTasks()']],
    ['clock', 'apps/clock-app/index.html', ['_shared/m3e-pull.js', 'android_clock_state', 'rA()']],
    ['music', 'apps/music/index.html', ['_shared/m3e-pull.js', '__cwApp.renderPlaylist', 'trackListContainer']],
    ['translate', 'apps/translate/index.html', ['_shared/m3e-pull.js', 'translationHistory', 'renderHistory()']],
  ];
  for (const [name, file, needles] of cases) {
    it(`${name}：m3e-pull 接线（${needles[0]} + 刷新语义）`, () => {
      const html = read('ios-desktop/' + file);
      for (const n of needles) expect(html).toContain(n);
    });
  }

  it('已接线应用（messages / calendar）不回归', () => {
    expect(read('ios-desktop/apps/messages/index.html')).toContain('_shared/m3e-pull.js');
    expect(read('ios-desktop/apps/calendar/index.html')).toContain('_shared/m3e-pull.js');
  });
});

describe('v7.77 · F 拉伸扩场景（四应用接线）', () => {
  it('reminders：data-stretch=".tasks-scroll-area"', () => {
    expect(read('ios-desktop/apps/reminders/index.html')).toContain('data-stretch=".tasks-scroll-area"');
  });
  it('clock：data-stretch=".content-area"', () => {
    expect(read('ios-desktop/apps/clock-app/index.html')).toContain('data-stretch=".content-area"');
  });
  it('music：data-stretch=".track-list"', () => {
    expect(read('ios-desktop/apps/music/index.html')).toContain('data-stretch=".track-list"');
  });
  it('contacts：data-stretch="main"', () => {
    expect(read('ios-desktop/apps/contacts/index.html')).toContain('data-stretch="main"');
  });
});

describe('v7.77 · G 版本锚点', () => {
  it('sw.js VERSION 推进 → geek-v89', () => {
    expect(read('sw.js')).toContain("const VERSION = 'geek-v89';");
  });
});
