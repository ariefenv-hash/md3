// ==================== overscroll-guard.test.js — #218 跨浏览器 overscroll 冲突治理 ====================
//
// 用户指令（#218 蓝图 #30）：iOS rubber-band / Windows 触控板系统手势干扰
// AOSP EdgeEffect 拉伸动画 / 触控板横扫触发前进后退导航。
//
// 现状盘点（R119 窗实证，交付帖附账）：
//   · 滚面级 `overscroll-behavior: contain` 已由 v7.48 盲区清扫覆盖
//     （.app-page/.folder-grid/.panel-scroll/.edit-tiles-view/.search-*/.theme-body
//     + terminal/calendar/files/installer/share-sheet 等应用面）——本批补
//     **文档级**（html,body overscroll-behavior: none，Safari 固定布局残余 rubber-band）
//   · 全库零 popstate/pushState/ location.hash 使用（实测）——**历史导航劫持面
//     完全未设防**（触控板横扫 = 整壳被导航走）→ history-guard-core 哨兵重武装
//
// 覆盖：A 源码锚 / B 哨兵行为（win+hist 双注入极简 fake）/ C 双文档装配与拆除。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { installHistoryGuard } from '../ios-desktop/js/history-guard-core.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

const MARK = '__md3NavGuard'; // 与 core 私有常量同字面（A 组锚验证一致）

const coreJs = src('ios-desktop/js/history-guard-core.js');
const mainJs = src('ios-desktop/js/main.js');
const baseCss = src('ios-desktop/css/base.css');

// ==================== A. 源码锚 ====================
describe('#218 · A 源码锚', () => {
  test('base.css 文档级 overscroll 钳制（html,body）', () => {
    expect(baseCss).toMatch(/html, body \{[^}]*overscroll-behavior: none;/s);
  });

  test('守卫纯核存在且哨兵语义在位', () => {
    expect(coreJs).toContain("MARK = '__md3NavGuard'");
    expect(coreJs).toContain("hist.pushState({ [MARK]: 'sentinel' }");
    expect(coreJs).toContain("[MARK]: 'current'");
  });

  test('main.js 装配：import + 最早安装 + 同源 parent 双装', () => {
    expect(mainJs).toContain("import { installHistoryGuard } from './history-guard-core.js'");
    expect(mainJs).toMatch(/installHistoryGuard\(window, window\.history\);\s*\nif \(window\.self !== window\.top\)/);
    expect(mainJs).toContain('installHistoryGuard(window.parent, window.parent.history)');
    expect(mainJs).toContain('跨域 parent：静默跳过');
  });
});

// ==================== B. 哨兵行为（注入式 fake，零 happy-dom History 依赖） ====================
describe('#218 · B 哨兵行为', () => {
  /** 极简 fake：hist 记录 pushState/replaceState 调用并可手动派发 popstate */
  function makeFake() {
    const win = {
      location: { href: 'http://x/ios-desktop/index.html?nolock=1' },
      listeners: {},
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
      removeEventListener(type, fn) {
        this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn);
      },
      fire(type) { (this.listeners[type] || []).forEach((fn) => fn()); },
    };
    const calls = { push: [], replace: [] };
    const hist = {
      state: null,
      pushState(st, _t, href) { calls.push.push(st); hist.state = st; },
      replaceState(st, _t, href) { calls.replace.push(st); hist.state = st; },
    };
    return { win, hist, calls };
  }

  test('install：replaceState 打标当前条目 + pushState 压入哨兵各一次', () => {
    const { win, hist, calls } = makeFake();
    const td = installHistoryGuard(win, hist);
    expect(typeof td).toBe('function');
    expect(calls.replace).toHaveLength(1);
    expect(calls.replace[0][MARK]).toBe('current');      // null state 合并打标
    expect(calls.push).toHaveLength(1);
    expect(calls.push[0][MARK]).toBe('sentinel');
  });

  test('popstate 吞掉并重武装：每次手势后哨兵重新压入（可无限次）', () => {
    const { win, hist, calls } = makeFake();
    installHistoryGuard(win, hist);
    win.fire('popstate');
    expect(calls.push).toHaveLength(2);                  // 1 哨兵 + 1 重武装
    win.fire('popstate');
    win.fire('popstate');                                // 快速连续横扫
    expect(calls.push).toHaveLength(4);
    expect(hist.state[MARK]).toBe('sentinel');
  });

  test('teardown：移除监听后 popstate 零动作', () => {
    const { win, hist, calls } = makeFake();
    const td = installHistoryGuard(win, hist);
    td();
    win.fire('popstate');
    expect(calls.push).toHaveLength(1);                  // 仅 boot 哨兵，零重武装
  });
});

// ==================== C. 装配面完整性 ====================
describe('#218 · C 装配面', () => {
  test('守卫安装先于 initDOM（启动窗内手势也受保护）', () => {
    const guardIdx = mainJs.indexOf('installHistoryGuard(window, window.history);');
    const bootIdx = mainJs.indexOf('initDOM();');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(bootIdx).toBeGreaterThan(guardIdx);
  });

  test('滚面级 contain 盲区清扫（v7.48 既有防线）未被本批弱化', () => {
    expect(baseCss).toMatch(/\.app-page,[\s\S]*?\.theme-body \{\s*overscroll-behavior: contain;/);
  });
});
