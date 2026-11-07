// v239 · #239 运动语言令牌——_shared/md3-tokens.css motion 组 + 共享层消费（R120 窗 · 实例E）
// 根因：色彩有 --md-* 令牌所以主题统一；运动无令牌 → 全库各应用自写曲线，
// cubic-bezier 参数漂移多种并存（0.2,0,0,1 与 .34,1.56,.64,1 自创弹簧近似等），
// MD3E emphasized 族与 spring 回退档无单一真源，任何作者（含 AI 会话）都无法
// 「引用」正确曲线只能凭记忆手写——设计语言「未贯彻」的结构性根源。
// 修法（#239 建议① verbatim）：md3-tokens.css 增补 motion 组——经典 emphasized
// 族 + spring 六档（m3.material.io 权威值表逐字）+ 时长与曲线逐对配对；
// 消费实证：idle-slider.css（#227 单源组件）内联曲线改令牌引用 + 回退缺省值。
import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sharedDir = path.join(root, 'ios-desktop', 'apps', '_shared');
const tokens = readFileSync(path.join(sharedDir, 'md3-tokens.css'), 'utf-8');
const slider = readFileSync(path.join(sharedDir, 'idle-slider.css'), 'utf-8');

describe('v239 · #239 运动语言令牌组（md3-tokens.css motion 组）', () => {
  test('A1 经典 emphasized 族曲线逐字锚（全库主流曲线用法的单一真源）', () => {
    expect(tokens).toContain('--md-easing-standard: cubic-bezier(0.2, 0, 0, 1)');
    expect(tokens).toContain('--md-easing-standard-accelerate: cubic-bezier(0.3, 0, 1, 1)');
    expect(tokens).toContain('--md-easing-standard-decelerate: cubic-bezier(0, 0, 0, 1)');
    expect(tokens).toContain('--md-easing-emphasized: cubic-bezier(0.2, 0, 0, 1)');
    expect(tokens).toContain('--md-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1)');
    expect(tokens).toContain('--md-easing-emphasized-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15)');
  });

  test('A2 spring 六档权威值逐字锚（#239 外部跟踪补录 m3.material.io 值表）', () => {
    expect(tokens).toContain('--md-easing-spring-fast-spatial: cubic-bezier(0.42, 1.67, 0.21, 0.9)');
    expect(tokens).toContain('--md-easing-spring-default-spatial: cubic-bezier(0.38, 1.21, 0.22, 1)');
    expect(tokens).toContain('--md-easing-spring-slow-spatial: cubic-bezier(0.27, 1.06, 0.18, 1)');
    expect(tokens).toContain('--md-easing-spring-fast-effects: cubic-bezier(0.31, 0.94, 0.34, 1)');
    expect(tokens).toContain('--md-easing-spring-default-effects: cubic-bezier(0.34, 0.8, 0.34, 1)');
    expect(tokens).toContain('--md-easing-spring-slow-effects: cubic-bezier(0.34, 0.88, 0.34, 1)');
  });

  test('A3 时长档与 spring 曲线逐对配对 + 经典四档（M3 时长带第 4 档）', () => {
    expect(tokens).toContain('--md-duration-fast-effects: 150ms');
    expect(tokens).toContain('--md-duration-default-effects: 200ms');
    expect(tokens).toContain('--md-duration-slow-effects: 300ms');
    expect(tokens).toContain('--md-duration-fast-spatial: 350ms');
    expect(tokens).toContain('--md-duration-default-spatial: 500ms');
    expect(tokens).toContain('--md-duration-slow-spatial: 750ms');
    expect(tokens).toContain('--md-duration-short: 200ms');
    expect(tokens).toContain('--md-duration-medium: 400ms');
    expect(tokens).toContain('--md-duration-long: 600ms');
    expect(tokens).toContain('--md-duration-extra-long: 1000ms');
  });

  test('B1 语义分区锚（#239 落地约束①）：过冲（末控制点 y>1）仅限 spring spatial 三档；effects 与 classic 族不得过冲', () => {
    const grab = (name) => {
      const m = tokens.match(new RegExp('--md-easing-' + name + ': cubic-bezier\\(([^)]*)\\)'));
      return m ? m[1].split(',').map(Number) : null;
    };
    for (const n of ['spring-fast-spatial', 'spring-default-spatial', 'spring-slow-spatial']) {
      const v = grab(n);
      expect(v).toBeTruthy();
      // 过冲由控制点 y>1 产生（贝塞尔为控制点凸组合）；如 fast-spatial P1y=1.67
      expect(Math.max(v[1], v[3])).toBeGreaterThan(1); // spatial 允许过冲回弹
    }
    for (const n of [
      'spring-fast-effects', 'spring-default-effects', 'spring-slow-effects',
      'standard', 'standard-accelerate', 'standard-decelerate',
      'emphasized', 'emphasized-decelerate', 'emphasized-accelerate',
    ]) {
      const v = grab(n);
      expect(v).toBeTruthy();
      expect(Math.max(v[1], v[3])).toBeLessThanOrEqual(1); // effects（颜色/透明度）不得过冲
    }
  });

  test('B2 共享层消费锚：idle-slider.css（#227 单源组件）曲线引用令牌且保留独立打开回退', () => {
    expect(slider).toContain('var(--md-easing-standard, cubic-bezier(0.2, 0, 0, 1))');
    // 两处过渡（WebKit / Firefox thumb）全部走令牌引用
    const lines = slider.split('\n').filter((l) => l.includes('transition:') && l.includes('width'));
    expect(lines.length).toBe(2);
    for (const l of lines) expect(l).toContain('var(--md-easing-standard');
  });

  test('B3 负向锚：_shared/*.css 零新增裸曲线——令牌真源行之外不得再手写 cubic-bezier', () => {
    // 白名单（各有理由，删条目即漂移）：
    //   md3-tokens.css —— 令牌唯一真源，每个 cubic-bezier 必须挂在 --md-easing- 行上；
    //   idle-slider.css —— var() 第二参回退缺省值（独立打开可用性）；
    //   tw-utilities.css —— Tailwind v3.4.17 构建生成物（gen-tw-local.sh 产物，框架默认曲线），
    //     属上游出厂值，手改会被再生成覆盖——收敛归 #245 车道处理生成器侧。
    const exempt = new Set(['md3-tokens.css', 'idle-slider.css', 'tw-utilities.css']);
    const stray = [];
    for (const f of readdirSync(sharedDir)) {
      if (!f.endsWith('.css')) continue;
      const src = readFileSync(path.join(sharedDir, f), 'utf-8');
      const lines = src.split('\n').filter((l) => l.includes('cubic-bezier('));
      if (!lines.length) continue;
      if (f === 'md3-tokens.css') {
        for (const l of lines) if (!l.trim().startsWith('--md-easing-')) stray.push(f + ' 真源外裸曲线');
      } else if (f === 'idle-slider.css') {
        for (const l of lines) if (!l.includes('var(--md-easing-standard,')) stray.push(f + ' 非令牌引用行');
      } else if (!exempt.has(f)) {
        stray.push(f + ' 裸曲线 x' + lines.length);
      }
    }
    expect(stray).toEqual([]);
  });
});
