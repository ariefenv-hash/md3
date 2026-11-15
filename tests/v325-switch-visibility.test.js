// ==================== v325-switch-visibility.test.js — #325 开关小球可见性（组件级 AOSP 基线） ====================
//
// 卡面：用户「开关小球很难看到，即使很慢滑也一闪而过」（#259-⑧）。
// 取证收窄（2026-11-14 10:32Z 探针）：「一帧回落 / isPressed 过早清除」已证伪（放大态 16/16
// 帧保持 28px），根因收窄为 ① 未选中球与轨面/描边对比度不足 ② 触摸抢占。
//
// 本文件锚定修复后的三件事：
//   A. 组件级令牌 `--md-switch-unselected-handle` 的 AOSP 基线字面值（浅 #74777F / 暗 #938F99，
//      androidx-main compose material3 SwitchTokens.kt UnselectedHandleColor=outline 角色基线），
//      并用 WCAG 公式实算双极性球/轨对比度 ≥ 3:1（修复前 2.44 / 2.28，双输）。
//   B. 四源单令牌：md3-theme.css :root（暗）/ theme-mode.css body.light-theme（浅）/
//      theme-engine.js 双生成集（iframe 注入链）/ m3-controls.js 拖拽预览通道——同一键名，
//      静态 CSS 与 JS 内联预览不再分叉。
//   C. 零回归锚：#79 几何（显式像素 translateY / 24↔28 SnapSpec）、touch-action:none 抢占
//      防线、v7.49 pointercancel 提交语义全部原样。
//
// 诚实边界：Monet 拾色不覆盖组件级键 → 开关球恒为 A17 基线中性灰，与 outline 角色分流
// （可见性优先，#325 交付帖已登记）；真机触控抢占属物理设备面，无头不可测。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

/** 取出某选择器规则块的声明体（首个 `{` 到配对的 `}`）—— v7.91 同款 */
function ruleBody(css, selector) {
  const i = css.indexOf(selector);
  if (i < 0) return null;
  const open = css.indexOf('{', i);
  let depth = 0;
  for (let j = open; j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') {
      depth--;
      if (depth === 0) return css.slice(open + 1, j);
    }
  }
  return null;
}

// ---- WCAG 2.x 相对亮度 / 对比度（纯函数，值源见各锚点注释） ----
function srgbToLin(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function relLumFromRgb(r, g, b) {
  return 0.2126 * srgbToLin(r / 255) + 0.7152 * srgbToLin(g / 255) + 0.0722 * srgbToLin(b / 255);
}
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
/** hsl(h s l) → 相对亮度（CSS 色彩模型，h/s/l 0-360/0-100/0-100） */
function relLumFromHsl(h, s, l) {
  const H = ((h % 360) + 360) % 360 / 360, S = s / 100, L = l / 100;
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
  const p = 2 * L - q;
  const chan = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return relLumFromRgb(chan(H + 1 / 3) * 255, chan(H) * 255, chan(H - 1 / 3) * 255);
}
function contrast(l1, l2) {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// 基线常量（锚点：androidx-main compose material3 SwitchTokens.kt / 本仓 css 生成式）
const HANDLE_LIGHT = '#74777f'; // SwitchTokens.UnselectedHandleColor（浅极性 outline 基线字面）
const HANDLE_DARK = '#938f99';  // SwitchTokens.UnselectedHandleColor（暗极性 outline 基线字面）
// 本仓轨面生成式：md3-theme.css:37 `--md-surface-container-highest: hsl(var(--md-h) 15% 22%)`（暗）
//                 theme-mode.css:26 `hsl(var(--md-h) 28% 87%)`（浅）——明度定值，hue 动态
const TRACK_DARK = { h: 215, s: 15, l: 22 };
const TRACK_LIGHT = { h: 215, s: 28, l: 87 };

describe('v325 · A 组：WCAG 对比度实算（修复后双极性 ≥3:1）', () => {
  test('暗：球 #938F99 vs 轨 hsl(215,15%,22%) ≥ 3:1（修复前 2.44）', () => {
    const r = contrast(relLumFromRgb(...hexToRgb(HANDLE_DARK)),
      relLumFromHsl(TRACK_DARK.h, TRACK_DARK.s, TRACK_DARK.l));
    expect(r).toBeGreaterThanOrEqual(3);
  });

  test('浅：球 #74777F vs 轨 hsl(215,28%,87%) ≥ 3:1（修复前 2.28）', () => {
    const r = contrast(relLumFromRgb(...hexToRgb(HANDLE_LIGHT)),
      relLumFromHsl(TRACK_LIGHT.h, TRACK_LIGHT.s, TRACK_LIGHT.l));
    expect(r).toBeGreaterThanOrEqual(3);
  });

  test('hue 动态化下对比度仍 ≥3:1（明度定值主导，抽 0/120/270 三色相）', () => {
    for (const hue of [0, 120, 270]) {
      expect(contrast(relLumFromRgb(...hexToRgb(HANDLE_DARK)),
        relLumFromHsl(hue, TRACK_DARK.s, TRACK_DARK.l))).toBeGreaterThanOrEqual(3);
      expect(contrast(relLumFromRgb(...hexToRgb(HANDLE_LIGHT)),
        relLumFromHsl(hue, TRACK_LIGHT.s, TRACK_LIGHT.l))).toBeGreaterThanOrEqual(3);
    }
  });

  test('AOSP 基线自对照（方法论健全性：#938F99/#36343B=3.87、#74777F/#E2E2E9=3.47 均 ≥3）', () => {
    expect(contrast(relLumFromRgb(...hexToRgb(HANDLE_DARK)),
      relLumFromRgb(...hexToRgb('#36343b')))).toBeCloseTo(3.87, 1);
    expect(contrast(relLumFromRgb(...hexToRgb(HANDLE_LIGHT)),
      relLumFromRgb(...hexToRgb('#e2e2e9')))).toBeCloseTo(3.47, 1);
  });
});

describe('v325 · B 组：四源单令牌锚', () => {
  const themeCss = src('ios-desktop/css/md3-theme.css');
  const modeCss = src('ios-desktop/css/theme-mode.css');
  const engine = src('ios-desktop/js/theme-engine.js');
  const controls = src('ios-desktop/js/m3-controls.js');

  test('md3-theme.css :root（暗极性）定义 #938f99 + 锚注释', () => {
    expect(themeCss).toContain('--md-switch-unselected-handle: #938f99;');
    expect(themeCss).toContain('#325');
  });

  test('theme-mode.css body.light-theme（浅极性）定义 #74777f', () => {
    const i = modeCss.indexOf('body.light-theme {');
    const blockEnd = modeCss.indexOf('}', i);
    const block = modeCss.slice(i, blockEnd);
    expect(block).toContain('--md-switch-unselected-handle: #74777f;');
  });

  test('theme-engine.js 双生成集各出该键（iframe 注入链同值）', () => {
    expect(engine).toContain('--md-switch-unselected-handle: #74777f;');
    expect(engine).toContain('--md-switch-unselected-handle: #938f99;');
  });

  test('.md3-switch .thumb 静态 CSS 消费组件级令牌（首选），不再裸读全局 outline', () => {
    const body = ruleBody(themeCss, '.md3-switch .thumb {');
    expect(body).toContain('background: var(--md-switch-unselected-handle, var(--md-outline, #74777f));');
    expect(body).not.toMatch(/background:\s*var\(--md-outline/);
  });

  test('m3-controls.js 拖拽预览通道与静态 CSS 同源（跨路径不分叉）', () => {
    expect(controls).toContain(
      "thumb.style.background = 'var(--md-switch-unselected-handle, var(--md-outline, #74777f))'");
    // 未选中预览不再直读全局 outline（修复前 :222 形态）
    expect(controls).not.toContain("thumb.style.background = 'var(--md-outline, #74777f)'");
  });
});

describe('v325 · C 组：零回归锚（#79 几何 / 抢占防线 / pointercancel 语义）', () => {
  const themeCss = src('ios-desktop/css/md3-theme.css');
  const controls = src('ios-desktop/js/m3-controls.js');

  test('#79：thumb 显式像素回退落位 translate(4px,-12px) 原样（禁 translateY 百分比回归）', () => {
    const body = ruleBody(themeCss, '.md3-switch .thumb {');
    expect(body).toContain('transform: translate(4px, -12px);');
    expect(controls).toContain('(-size / 2)'); // render() 显式像素垂直偏移
  });

  test('SnapSpec 几何常量原值（24/28/2..22）原样', () => {
    expect(controls).toContain('const THUMB_REST = 24;');
    expect(controls).toContain('const THUMB_PRESSED = 28;');
    expect(controls).toContain('const PRESS_X_OFF = 2;');
  });

  test('touch-action: none 抢占防线在位（md3-theme.css .md3-switch 规则体）', () => {
    const body = ruleBody(themeCss, '.md3-switch {');
    expect(body).toContain('touch-action: none;');
  });

  test('v7.49 pointercancel 提交语义原样（cancel 仍按最后已知位置完成判定）', () => {
    expect(controls).toContain("labelEl.addEventListener('pointercancel', (e) => onEnd(e, true))");
    expect(controls).toContain('onEnd(e, true)');
  });
});

describe('v325 · D 组：混合极性收口锚（theme-mode.js 写壳层 data-theme-mode）', () => {
  const themeMode = src('ios-desktop/js/theme-mode.js');

  test('apply() 同步写 documentElement.dataset.themeMode（OS=light + 用户选暗时 tokens.css',
    () => {
      expect(themeMode).toContain("document.documentElement.dataset.themeMode = light ? 'light' : 'dark';");
    });

  test('tokens.css :root:not([data-theme-mode]) gate 原样（属性就位后排除系统外观倒灌）', () => {
    const tokens = src('ios-desktop/apps/_shared/md3-tokens.css');
    expect(tokens).toContain(':root:not([data-theme-mode])');
  });

  test('浅色态 body.light-theme 与组件令牌浅值共存（theme-mode.css）', () => {
    const modeCss = src('ios-desktop/css/theme-mode.css');
    expect(modeCss).toMatch(/body\.light-theme \{[\s\S]*?--md-switch-unselected-handle: #74777f;/);
  });
});
