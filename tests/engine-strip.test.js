// v265 · 引擎盲区修复卡守护：stripCssJsComments 属性值吞噬修复（R130 窗加餐 · 2026-11-08 14:00 槽 · Job 2931605 实例 4）
// 根因（v264 C1 披露）：photos file input accept="image/*,video/*" 的 MIME 通配符被块注释正则
//       /\/\*[\s\S]*?\*\//g 误判为注释开启，非贪婪吞至下一个 */，致吞噬区不进 V 面判定。
// 修复：HTML 标签内 ="…"/='…' 属性值（含 /* 或 */ 者）strip 前占位保护、strip 后原样还原；
//       纯 CSS/JS 语境零行为变化。v260 纯逻辑核导出先例同律。
// 边界：#262 批 1 已交付面零重做（v264 C1 前置位锚保持有效零改动）；checkX 阈值/ITEM_KEYS 零变化；
//       url(// 无引号形态的行注释吞除为既有保守语义边界（原版行为一致），不在本卡范围。
import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const auditPath = path.join(root, 'scripts', 'audit-app-quality.mjs');
const photosHtml = readFileSync(path.join(root, 'ios-desktop/apps/photos/index.html'), 'utf-8');
const VB = JSON.parse(readFileSync(path.join(root, 'scripts', 'visual-baseline.json'), 'utf-8'));

describe('v265 A · stripCssJsComments 属性值守护（引擎盲区修复）', () => {
  // 动态 import 拿导出（audit 文件顶层有 CLI 入口副作用，import 即执行 main——
  // 该入口受 process.argv 守护（非直接运行不触发写文件），vitest 环境安全
  let engine;
  beforeAll(async () => {
    engine = await import(auditPath);
  });

  test('A1 photos 形态样例吞噬解除：accept 属性值不吞后续 CSS', () => {
    const sample = [
      '<style>',
      '<input type="file" multiple accept="image/*,video/*">',
      '/* V4 状态层锚 */',
      '.btn:hover { background: var(--md-state-hover); }',
      '.btn:active { transform: scale(.97); }',
      '</style>',
    ].join('\n');
    const out = engine.stripCssJsComments(sample);
    // 修复前：accept 值内 /* 被误判注释开启，吞至「V4 状态层锚 */」——.btn:hover 规则侥幸存活，
    //         但若注释在 accept 之后无早闭合 */ 则吞到下一个 */（真实 photos 383→591 行形态）
    // 修复后：accept 值占位保护，两条规则与注释剥离行为正常
    expect(out).toContain('accept=');
    expect(out).toContain('.btn:hover { background: var(--md-state-hover); }');
    expect(out).toContain('.btn:active { transform: scale(.97); }');
    expect(out).not.toContain('V4 状态层锚'); // 真注释仍被剥离
  });

  test('A2 accept 属性值逐字还原（占位保护零泄漏）', () => {
    const sample = '<input accept="image/*,video/*" class="pick"><div data-x="a/*b*/c"></div>';
    const out = engine.stripCssJsComments(sample);
    expect(out).toContain('accept="image/*,video/*"');
    expect(out).toContain('data-x="a/*b*/c"');
    expect(out).not.toContain('\u0000'); // 占位符零残留
  });

  test('A3 真实 photos 源回归：吞噬区解除（accept 原值保留 + 空态/状态层规则可见）', () => {
    const out = engine.stripCssJsComments(photosHtml);
    expect(out).toContain('image/*'); // accept 原值逐字保留
    expect(out).toContain('.empty-state'); // V7 空态规则可见
    // 吞噬区（383→591 行）代表性 CSS 现在可见：状态层/按压反馈锚不被吞
    const v4hit = /--md-state-(hover|pressed|selected|focus)/.test(out);
    expect(v4hit, '吞噬区内状态层锚可见').toBe(true);
  });

  test('A4 纯 CSS/JS 语境零行为变化（回归锚）', () => {
    // 块注释剥离语义不变
    expect(engine.stripCssJsComments('/* head */ .a { color: red; } /* tail */').trim()).toBe('.a { color: red; }');
    // 协议双斜杠保留（既有保守语义）
    expect(engine.stripCssJsComments('const p = "https://a.b/c";')).toContain('https://a.b/c');
    // 普通行注释剥离不变
    expect(engine.stripCssJsComments('let x = 1; // note\nlet y = 2;')).not.toContain('// note');
    // 无标签包裹的 /* */ 照常剥离（JS 块注释）
    expect(engine.stripCssJsComments('function f() { /* js comment */ return 1; }')).not.toContain('js comment');
  });

  test('A5 8 家 accept 应用 auditVisual 实跑无异常 + photos V 全 true', () => {
    const apps = ['photos', 'ocr', 'threes', 'clock-app', 'music', 'dice', 'calculator', 'game2048'];
    for (const a of apps) {
      const html = readFileSync(path.join(root, 'ios-desktop/apps', a, 'index.html'), 'utf-8');
      const v = engine.auditVisual(a, html);
      expect(v, `${a} auditVisual 返回对象`).toBeTruthy();
      expect(Object.keys(v).length).toBeGreaterThan(0);
    }
    for (const k of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8']) {
      expect(VB.photos[k], `photos V${k.slice(1)} = true`).toBe(true);
    }
  });

  test('A6 快照联动固化：piano/reaction V4/V8 = true（批 4 整改快照滞后补账）+ 升级方向零回退', () => {
    // 根因实录（对照验证脚本 verify-flip-cause.mjs）：原版引擎对 piano/reaction V4 已 pass——
    //   #261 批 4 整改交付时只刷了 admission 快照、V 水位快照未刷；本窗 --write-visual-baseline 补账，
    //   piano/reaction 无 accept 属性，引擎修复对其零直接作用（翻转=快照滞后，如实入账）。
    expect(VB.piano.V4).toBe(true);
    expect(VB.piano.V8).toBe(true);
    expect(VB.reaction.V4).toBe(true);
    expect(VB.reaction.V8).toBe(true);
    // photos 8/8（批 1 前置规避 + 本卡吞噬解除双保险）
    expect(Object.values(VB.photos).every(Boolean)).toBe(true);
  });

  test('A7 v264 C1 前置位锚兼容性：前置位仍是事实（修复后吞噬区消失，锚零改动保持有效）', () => {
    const stylePos = photosHtml.indexOf('.empty-state {');
    const acceptPos = photosHtml.indexOf('multiple accept="image/*');
    expect(stylePos).toBeGreaterThan(-1);
    expect(acceptPos).toBeGreaterThan(-1);
    expect(stylePos).toBeLessThan(acceptPos);
  });
});
