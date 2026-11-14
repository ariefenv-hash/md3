// ==================== v282-sw-entry-parity.test.js — #282 SW 注册面统一真源对账锚 ====================
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=#282 双入口 SW 注册面统一（根壳 ./sw.js / 本壳 ../sw.js）的逐字镜像锚；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）—— 2026-11-13 补标记批（承 #291 补关评论登记的 10 例新违规，非 R149 原注入批）
//
// 三组锚（R153 窗 · Job 2932311 · 第 1 定时消息系列 · v11.23）：
//   A 组 双入口注册真源对账（根壳 ./sw.js 与本壳 ../sw.js 同解析目标 + 守卫语义逐字镜像）
//   B 组 解析等价可执行证明（posix 路径归一：两形态抵达同一 sw.js）
//   C 组 诚实边界（更新胶囊=根壳专属 UI 面不镜像；注册面在入口不在 main.js）
// 自指防雷：真实文件实读断言（无合成路径落盘）；路径等价证明用 posix 数学非盘面字符串。

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_ENTRY = readFileSync(join(ROOT, 'index.html'), 'utf8');
const SHELL_ENTRY = readFileSync(join(ROOT, 'ios-desktop/index.html'), 'utf8');
const MAIN_JS = readFileSync(join(ROOT, 'ios-desktop/js/main.js'), 'utf8');

describe('A 组 · 双入口注册真源对账（#282 方案 a）', () => {
  it('A1 根壳注册 ./sw.js 在案（既有真源不被动）', () => {
    expect(ROOT_ENTRY).toContain("navigator.serviceWorker.register('./sw.js')");
  });
  it('A2 ios-desktop 壳注册 ../sw.js 在案（#282 注册面统一交付）', () => {
    expect(SHELL_ENTRY).toContain("navigator.serviceWorker.register('../sw.js')");
  });
  it('A3 sw.js 真身在树根（双入口共同解析目标实存）', () => {
    expect(existsSync(join(ROOT, 'sw.js'))).toBe(true);
  });
  it('A4 守卫语义镜像：webdriver 跳过 + ?swtest=1 强制（双入口同律）', () => {
    for (const [name, src] of [['root', ROOT_ENTRY], ['ios-desktop', SHELL_ENTRY]]) {
      expect(src, `${name} 守卫声明`).toContain("'serviceWorker' in navigator");
      expect(src, `${name} webdriver 跳过`).toContain('navigator.webdriver');
      expect(src, `${name} swtest 强制口`).toContain("indexOf('swtest')");
    }
  });
  it('A5 守卫语义镜像：load 事件后注册 + 失败静默 catch（双入口同律）', () => {
    for (const [name, src] of [['root', ROOT_ENTRY], ['ios-desktop', SHELL_ENTRY]]) {
      expect(src, `${name} load 门`).toContain("addEventListener('load'");
      expect(src, `${name} 失败静默`).toMatch(/register\([^)]*\)\s*\.\s*catch\s*\(/);
    }
  });
  it('A6 守卫语义镜像：90s 定期 update() 心跳（v7.58 长驻会话更新链双入口同律）', () => {
    for (const [name, src] of [['root', ROOT_ENTRY], ['ios-desktop', SHELL_ENTRY]]) {
      expect(src, `${name} 90s 心跳`).toContain('90000');
      expect(src, `${name} getRegistration().update`).toContain('getRegistration()');
    }
  });
});

describe('B 组 · 解析等价可执行证明（两形态抵达同一 sw.js）', () => {
  it('B1 posix 归一：/ios-desktop/ + ../sw.js ≡ / + ./sw.js（根 sw.js 同一目标）', () => {
    const resolveFrom = (base, rel) => posix.normalize(posix.join(base, rel));
    const viaShell = resolveFrom('/site/ios-desktop/', '../sw.js');
    const viaRoot = resolveFrom('/site/', './sw.js');
    expect(viaShell).toBe(viaRoot);
    expect(viaShell).toBe('/site/sw.js');
  });
});

describe('C 组 · 诚实边界（根壳专属面不镜像 · 注册面位置契约）', () => {
  it('C1 更新胶囊=根壳跨 iframe 耦合 UI 面，不随注册面镜像（防双胶囊叠加）', () => {
    expect(ROOT_ENTRY).toContain('系统已更新');
    expect(SHELL_ENTRY).not.toContain('系统已更新');
  });
  it('C2 注册面在入口不在 main.js（#282 交付面=入口级统一，运行时零触碰）', () => {
    expect(MAIN_JS).not.toContain('serviceWorker.register');
  });
  it('C3 本壳守卫变量命名独立（allowSW282 防与根壳 allowSW 全局名冲突）', () => {
    expect(SHELL_ENTRY).toContain('allowSW282');
    expect(SHELL_ENTRY).not.toContain('var allowSW ');
  });
});
