// ==================== v791-switch-thumb-centering.test.js — v7.91 开关小球「按下偏下」根治 ====================
//
// 用户诉求：「开关小球按下的时候，它仍然是比较偏下的。有种逼死强迫症的感觉，老修修不好」。
//
// 定位过程（几何实测，非目测）：
//   1. 无头浏览器量四态几何：静息关/开 上下端隙 4.00 / 4.00，按压关/开 2.00 / 2.00，
//      球心相对轨道中心偏移 **0.000** —— 布局数学完全对称，与 AOSP 一致，不是布局 bug。
//   2. 转测视觉：球下方轨道亮度比上方低 **4.3（关）/ 5.9（开）** /255 —— 存在一条
//      方向朝下的不对称暗边。来源 = `.md3-switch .thumb` 上自加的
//      `box-shadow: 0 1px 3px rgba(0,0,0,.2)`（y 偏移 +1px）。
//   3. 源码核对（androidx-main compose/material3/Switch.kt）：thumb 只有
//      `.background(thumbColor, thumbShape)` —— **无阴影、无 elevation**。该投影是
//      非 AOSP 的自定义装饰，即「偏下」真因。
//   4. 按压态球 28dp 顶满轨道内沿（上下各余 2dp），阴影无处可去只能往下溢出，
//      故「按下时偏下」观感最强（与用户描述完全吻合）。
//
// 根治：删除该 box-shadow → 实测上下亮度差归零（+0.0），几何端隙不变。
// 本文件即防回归锚：任何把向下阴影加回来的改动都会在此失败。
//
// 同批并入 v7.91 的三项 AOSP 令牌回抄（禁用态 / 48dp 触控目标 / 焦点环）一并锚定。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

/** 取出某选择器规则块的声明体（首个 `{` 到配对的 `}`） */
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

describe('v7.91 · 开关小球：无向下投影（AOSP thumb 无阴影）', () => {
  const css = src('ios-desktop/css/md3-theme.css');

  test('.md3-switch .thumb 规则体内不含 box-shadow 声明', () => {
    const body = ruleBody(css, '.md3-switch .thumb {');
    expect(body).not.toBeNull();
    // 允许注释里以文字形式提及历史值，但不允许存在真实声明
    const decl = body.split('\n').filter((l) => /^\s*box-shadow\s*:/.test(l));
    expect(decl).toEqual([]);
  });

  test('开关全部规则块内无任何 box-shadow 声明（AOSP 开关无 elevation）', () => {
    // 只扫 .md3-switch 规则块，且先剥离注释（注释里会引用历史值做说明）
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const offenders = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(stripped)) !== null) {
      const selector = m[1].trim();
      if (!selector.includes('.md3-switch')) continue;
      if (/box-shadow\s*:/.test(m[2])) offenders.push(selector.slice(-60));
    }
    expect(offenders).toEqual([]);
  });
});

describe('v7.91 · 几何锚定（ThumbNode 逐值，禁止回退到 16dp 旧几何）', () => {
  const js = src('ios-desktop/js/m3-controls.js');

  test('尺寸令牌：两态恒 24 / 按压 28', () => {
    expect(js).toContain('const THUMB_REST = 24;');
    expect(js).toContain('const THUMB_PRESSED = 28;');
    expect(js).toContain('const SWITCH_TRACK_W = 52;');
    expect(js).toContain('const SWITCH_TRACK_H = 32;');
  });

  test('端隙对称：静息关 4 / 静息开 24（4px·4px 对称）', () => {
    expect(js).toContain('const REST_X_OFF = (SWITCH_TRACK_H - THUMB_REST) / 2;');
    expect(js).toContain('const REST_X_ON = (SWITCH_TRACK_W - THUMB_REST) - REST_X_OFF;');
    expect(js).toContain('const PRESS_X_OFF = 2;');
    expect(js).toContain('const PRESS_X_ON = REST_X_ON - 2;');
  });

  test('动效：FastSpatial spring ζ0.6 / k800，位移与尺寸同参', () => {
    expect(js).toContain('const SPRING_STIFFNESS = 800;');
    expect(js).toContain('const SPRING_DAMPING = 2 * 0.6 * Math.sqrt(SPRING_STIFFNESS);');
    // 两条弹簧（位移 xSpring / 尺寸 sizeSpring）必须共用同一组参数
    const uses = js.match(/stiffness: SPRING_STIFFNESS, damping: SPRING_DAMPING/g) || [];
    expect(uses.length).toBe(2);
  });
});

describe('v7.91 · AOSP 令牌回抄（禁用态 / 48dp 触控目标 / 焦点环）', () => {
  const css = src('ios-desktop/css/md3-theme.css');

  test('禁用态按 SwitchTokens 三档令牌（12% / 38% / surface），不再是整块 opacity', () => {
    expect(css).toContain('.md3-switch input:disabled:not(:checked) + .slider');
    expect(css).toContain('.md3-switch input:disabled:checked + .slider .thumb');
    expect(css).toMatch(/disabled:not\(:checked\) \+ \.slider \{[^}]*color-mix\(in srgb, var\(--md-surface-container-highest[^)]*\) 12%/s);
    expect(css).toMatch(/disabled:checked \+ \.slider \.thumb \{[^}]*var\(--md-surface/s);
    // 旧近似值已退役
    expect(ruleBody(css, '.md3-switch input:disabled + .slider {')).not.toMatch(/opacity:\s*0\.42/);
  });

  test('触控目标 ≥48dp：.md3-switch::after 上下各外扩 8px', () => {
    const body = ruleBody(css, '.md3-switch::after {');
    expect(body).not.toBeNull();
    expect(body).toContain('top: -8px');
    expect(body).toContain('bottom: -8px');
  });

  test('焦点环 = Secondary（SwitchTokens.FocusIndicatorColor）', () => {
    const body = ruleBody(css, '.md3-switch input:focus-visible + .slider {');
    expect(body).not.toBeNull();
    expect(body).toMatch(/outline:\s*2px solid var\(--md-secondary/);
  });

  test('开启态描边 = transparent（SwitchColors.checkedBorderColor）', () => {
    const body = ruleBody(css, '.md3-switch input:checked + .slider {');
    expect(body).toContain('border-color: transparent;');
  });
});

describe('v7.91 · 版本锚点', () => {
  test('sw.js 保持 geek-v100', () => {
    expect(src('sw.js')).toContain("const VERSION = 'geek-v100';");
  });
});
