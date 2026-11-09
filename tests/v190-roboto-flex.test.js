// ==================== v190-roboto-flex.test.js — v9.26 Roboto Flex vendor 落位（#190） ====================
//
// #190 实测结论（议题内全流程在沙箱实跑）：
//   1. Chrome UA 才返回可变字体（fvar 三轴）；静态 UA 拿到无 fvar 的静态实例（88,912B）
//   2. latin 子集 woff2 = 195,288 字节（fontTools fvar 实测：
//      opsz 14 (8~144) / wght 400 (100~1000) / wdth 100 (25~151)）
//   3. ROND 为 Google 专有轴，Roboto Flex 无此轴 → 方案 A 不做近似
//   4. vendor 要求：字体入 assets/fonts/ 本地（零外链 v9.05）、@font-face 用范围
//      声明（font-weight: 100 1000 / font-stretch: 25% 151%）、运行时注入防 Vite
//      双份存储（同 material-symbols v7.7-A 范式）
//
// 覆盖：A vendor 文件 / B css 注册形态 / C 零外链 / D 加载链路（运行时注入+预热）
//       / E vite 拷贝链 / F 版本真源 9.26.0

import { describe, test, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const src = (p) => readFileSync(path.join(ROOT, p), 'utf8');

describe('v9.26 · A. vendor 文件在册（#190 第六节要求）', () => {
  test('A1 woff2 存在 + 195,288 字节（#190 实测值逐字）+ wOF2 魔数', () => {
    const p = path.join(ROOT, 'ios-desktop/assets/fonts/roboto-flex-latin.woff2');
    expect(statSync(p).size).toBe(195288);
    const head = readFileSync(p).subarray(0, 4).toString('latin1');
    expect(head).toBe('wOF2');
  });
});

describe('v9.26 · B. css 注册形态（范围声明 + 子集留痕）', () => {
  const css = () => src('ios-desktop/assets/fonts/roboto-flex.css');
  test('B1 @font-face 家族与可变范围三件套', () => {
    const t = css();
    expect(t).toContain("font-family: 'RobotoFlex'");
    expect(t).toContain('font-weight: 100 1000;');
    expect(t).toContain('font-stretch: 25% 151%;');
    expect(t).toContain('font-display: block;');
    expect(t).toContain('url(roboto-flex-latin.woff2)');
  });
  test('B2 fvar 轴锚与 ROND 方案 A 留痕在册', () => {
    const t = css();
    expect(t).toContain('opsz 14 (8~144)');
    expect(t).toContain('wght 400 (100~1000)');
    expect(t).toContain('wdth 100 (25~151)');
    expect(t).toContain('方案 A');
    expect(t).toContain('195,288');
  });
});

describe('v9.26 · C. 零外链（v9.05 约束）', () => {
  test('C1 css 内零 http(s) 引用（src 相对路径）', () => {
    const t = src('ios-desktop/assets/fonts/roboto-flex.css');
    expect(t).not.toMatch(/https?:\/\//);
  });
});

describe('v9.26 · D. 加载链路（运行时注入 + 预热）', () => {
  test('D1 lock-screen.js 注入与预热在册，index.html 不静态引用（防 Vite 双份）', () => {
    const ls = src('ios-desktop/js/lock-screen.js');
    expect(ls).toContain("'assets/fonts/roboto-flex.css'");
    expect(ls).toContain("document.fonts.load('300 88px \"RobotoFlex\"'");
    expect(ls).toContain('robotoFlexInjected');
    const idx = src('ios-desktop/index.html');
    expect(idx).not.toContain('roboto-flex');
  });
  test('D2 lock-screen.js 字体失败兜底注释（不阻塞锁屏）', () => {
    const ls = src('ios-desktop/js/lock-screen.js');
    expect(ls).toContain('绝不阻塞锁屏');
  });
});

describe('v9.26 · E. vite 拷贝链（assets 目录整复制）', () => {
  test('E1 vite.config.js assets 目录复制在册（ios-desktop/assets → dist）', () => {
    const t = src('vite.config.js');
    expect(t).toContain("path.join(rootDir, 'ios-desktop', 'assets')");
    expect(t).toContain("path.join(distDir, 'ios-desktop', 'assets')");
  });
});

describe('v9.26 · F. 版本真源', () => {
  test('F1 package.json 9.26.0', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.version).toBe('10.96.0');
  });
  test('F2 本文件版本对齐', () => {
    expect(src('tests/v190-roboto-flex.test.js')).toContain('v10.96');
  });
});
