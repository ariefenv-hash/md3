// ==================== v814-qs-sheet-interruptible.test.js — #39 磁贴长按菜单两缺陷守护 ====================
//
// 议题 #39：①快速连点丢「打开动画」②菜单文字进出场呈现怪异。
// 根因（v8.14 诊断实证）：
//   ①openQsSheet 测量终态矩形时 --qs-tf-src 残留上次源变换（closeQsSheet 刻意保留供
//     收缩复用）→ dst ≈ 旧磁贴矩形 → sx≈1 → 容器变换退化纯淡入（首次开正常二次开必坏）
//   ②sheet/body 双 WAAPI 各自插值乘积不恒 1（sx=0.14、e=0.5 时中间帧文字爆大 2.31 倍）
// 修复：测量前 transition:none + --qs-tf-src 中和 + 强制 reflow；body 对冲改预采样
//   关键帧（quantizeCounterScale，13 点 bezier(0.2,0,0,1) 逐点精确倒数，乘积恒 1）；
//   时序对齐 #39 补充评论 U+ 权威表（open 200 / fade 83 / close 233）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

import { quantizeCounterScale } from '../ios-desktop/js/quick-settings.js';
import { PathInterpolatorCubic } from '../ios-desktop/js/aosp/expressive-ripple.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const QS_SRC = readFileSync(join(root, 'ios-desktop/js/quick-settings.js'), 'utf-8');
const CSS_SRC = readFileSync(join(root, 'ios-desktop/css/pull-panels.css'), 'utf-8');

describe('v8.14 #39 quantizeCounterScale（body 对冲预采样关键帧）', () => {
  it('结构：13 点关键帧，offset 均匀 0→1，transform 为 scale() 形态', () => {
    const frames = quantizeCounterScale(0.14, 0.2);
    expect(frames).toHaveLength(13);
    frames.forEach((f, i) => expect(f.offset).toBeCloseTo(i / 12, 10));
    frames.forEach((f) => expect(f.transform).toMatch(/^scale\([\d.]+, [\d.]+\)$/));
  });

  it('端点精确：第 0 点 = scale(1/sx, 1/sy)，末点 = scale(1, 1)', () => {
    const frames = quantizeCounterScale(0.14, 0.2);
    expect(frames[0].transform).toBe(`scale(${(1 / 0.14).toFixed(4)}, ${(1 / 0.2).toFixed(4)})`);
    expect(frames[12].transform).toBe('scale(1.0000, 1.0000)');
  });

  it('乘积恒 1：任一采样点 sheet 当帧 scale × body 关键帧 scale = 1', () => {
    const sx = 0.14, sy = 0.2;
    const bezier = new PathInterpolatorCubic(0.2, 0, 0, 1);
    quantizeCounterScale(sx, sy).forEach((f, i) => {
      const e = bezier.getInterpolation(i / 12);
      const kx = sx + (1 - sx) * e;
      const ky = sy + (1 - sy) * e;
      const m = f.transform.match(/scale\(([\d.]+), ([\d.]+)\)/);
      expect(parseFloat(m[1]) * kx).toBeCloseTo(1, 3);
      expect(parseFloat(m[2]) * ky).toBeCloseTo(1, 3);
    });
  });

  it('与旧实现对比：双轨各自插值的乘积中间帧确达 2.31 倍（根因数学锚定）', () => {
    const sx = 0.14;
    const e = 0.5;
    const sheetAt = sx + (1 - sx) * e;             // 旧 body：lerp(1/sx, 1, e)
    const bodyAtOld = (1 / sx) + (1 - 1 / sx) * e;
    expect(sheetAt * bodyAtOld).toBeCloseTo(2.31, 1);   // 文字爆大 2.31 倍 = 怪异根因
    const bodyAtNew = 1 / sheetAt;                 // 新关键帧：精确倒数
    expect(sheetAt * bodyAtNew).toBeCloseTo(1, 10);
  });
});

describe('v8.14 #39 U+ 时序 bezier（cubic-bezier(0.2,0,0,1)）', () => {
  it('端点与单调性；同 progress 下快于 fast_out_slow_in（0.2 起步陡）', () => {
    const b = new PathInterpolatorCubic(0.2, 0, 0, 1);
    expect(b.getInterpolation(0)).toBe(0);
    expect(b.getInterpolation(1)).toBe(1);
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const v = b.getInterpolation(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeLessThanOrEqual(1);
      prev = v;
    }
    const fos = new PathInterpolatorCubic(0.4, 0, 0.2, 1);
    expect(b.getInterpolation(0.3)).toBeGreaterThan(fos.getInterpolation(0.3));
  });
});

describe('v8.14 #39 源码锚定（防回退）', () => {
  it('openQsSheet 测量前中和残留变换：transition:none + 变量 none + 强制 reflow 三锚先于测量', () => {
    const neutralizeIdx = QS_SRC.indexOf("sheet.style.setProperty('--qs-tf-src', 'none')");
    const reflowIdx = QS_SRC.indexOf('void sheet.offsetWidth');
    const measureIdx = QS_SRC.indexOf('const dst = sheet.getBoundingClientRect()');
    expect(neutralizeIdx).toBeGreaterThan(-1);
    expect(reflowIdx).toBeGreaterThan(neutralizeIdx);
    expect(measureIdx).toBeGreaterThan(reflowIdx);
    expect(QS_SRC).toMatch(/sheet\.style\.transition = 'none'/);
    expect(QS_SRC).toMatch(/body\.style\.setProperty\('--qs-tf-body-src', 'none'\)/);
    // 测量后恢复过渡
    expect(QS_SRC).toMatch(/sheet\.style\.removeProperty\('transition'\)/);
  });

  it('U+ 权威时长：open 200ms / close 233ms；旧 360/280 数值退役', () => {
    expect(QS_SRC).toMatch(/duration: 200, easing: EASE/);
    expect(QS_SRC).toMatch(/duration: 233, easing: EASE/);
    expect(QS_SRC).not.toMatch(/duration: 360/);
    expect(QS_SRC).not.toMatch(/duration: 280/);
  });

  it('body 预采样接线：open/close 双侧 body.animate(quantizeCounterScale(...))', () => {
    expect(QS_SRC.match(/body\.animate\(quantizeCounterScale\(/g)).toHaveLength(2);
    expect(QS_SRC).toMatch(/easing: 'linear'/);   // easing 已烘进 offsets
  });

  it('overlay fade 交还 CSS 分向：JS overlay.animate 退役（原 260ms）', () => {
    expect(QS_SRC).not.toMatch(/overlay\.animate\(/);
  });

  it('CSS 分向 transition：open 0.083s / 关闭态 0.15s；fallback 0.2s 同步 U+', () => {
    expect(CSS_SRC).toMatch(/\.qs-sheet-overlay\.open \{[\s\S]*?transition: opacity 0\.083s/);
    expect(CSS_SRC).toMatch(/transition: opacity 0\.15s cubic-bezier\(0\.2, 0, 0, 1\)/);
    // qs-sheet 区段旧 0.36s fallback 退役（他处面板 0.36s 动画不涉本议题，不误伤）
    const sheetBlock = CSS_SRC.slice(CSS_SRC.indexOf('.qs-sheet-overlay {'), CSS_SRC.indexOf('.qs-sheet-title'));
    expect(sheetBlock).not.toMatch(/0\.36s/);
    expect(CSS_SRC).not.toMatch(/transition: opacity 0\.26s/);
  });

  it('closeQsSheet 保留 --qs-tf-src 收缩目标复用语义（测量侧中和而非清除侧）', () => {
    const closeIdx = QS_SRC.indexOf('export function closeQsSheet');
    const closeBody = QS_SRC.slice(closeIdx);
    expect(closeBody).toMatch(/getPropertyValue\('--qs-tf-src'\)/);
    expect(closeBody).not.toMatch(/removeProperty\('--qs-tf-src'\)/);
  });

  it('bezier 解析接线：PathInterpolatorCubic 从 aosp/expressive-ripple 导入', () => {
    expect(QS_SRC).toMatch(/import \{ PathInterpolatorCubic \} from '\.\/aosp\/expressive-ripple\.js'/);
    expect(QS_SRC).toMatch(/new PathInterpolatorCubic\(0\.2, 0, 0, 1\)/);
  });
});
