// ==================== v122-typing.test.js — #122 打字练习一期（v9.06） ====================
//
// 覆盖（#122 一期验收原文逐条）：
//   · 逐字比对（t_eftt 指示器对标）：四态 pending/ok/bad/extra + 错字定位
//   · 统计：净 WPM（5 字符=1 词）/ 准确率 / 进度 / 完成态
//   · 分级五→四档边界（工程自定值留痕）
//   · 词采样确定性（零随机 stride）+ 英文句子题源 + 兜底词库
//   · 注册链：apps-data 聚合 48 项 / 包装器 / 终端映射 / 图标在册 / 版本真源

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/typing/core.js'), 'utf-8');
const UI_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/typing/index.html'), 'utf-8');

// ---------- 沙箱提取（经典脚本 IIFE → window.__typingCore，v840/v123/v124 同范式） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__typingCore;

describe('v9.06 #122 core：逐字比对（t_eftt 指示器语义）', () => {
  it('完美输入：全部 ok', () => {
    const r = core.compareChars('abc', 'abc');
    expect(r.map((c) => c.status)).toEqual(['ok', 'ok', 'ok']);
  });
  it('错字定位：位置对位标 bad，后续未打保持 pending', () => {
    const r = core.compareChars('abcd', 'axc');
    expect(r.map((c) => c.status)).toEqual(['ok', 'bad', 'ok', 'pending']);
  });
  it('多打字符：extra 追加在尾部（一律记错）', () => {
    const r = core.compareChars('ab', 'abXYZ');
    expect(r.slice(0, 2).map((c) => c.status)).toEqual(['ok', 'ok']);
    expect(r.slice(2).map((c) => c.status)).toEqual(['extra', 'extra', 'extra']);
    expect(r[2].ch).toBe('X');
  });
  it('空输入：全 pending；null 防御', () => {
    expect(core.compareChars('ab', '').every((c) => c.status === 'pending')).toBe(true);
    expect(core.compareChars(null, null)).toEqual([]);
  });
  it('大小写严格：A ≠ a 记 bad', () => {
    expect(core.compareChars('Aa', 'aA').map((c) => c.status)).toEqual(['bad', 'bad']);
  });
});

describe('v9.06 #122 core：统计与分级', () => {
  it('净 WPM 数学：50 正确字符 60s → 10 wpm（5 字符=1 词）', () => {
    const target = 'a'.repeat(50);
    const st = core.stats(target, target, 60000);
    expect(st.wpm).toBe(10);
    expect(st.acc).toBe(100);
    expect(st.done).toBe(true);
    expect(st.progress).toBe(1);
  });
  it('准确率：错字 + extra 均计入分母（打满即完成，错字由准确率呈现）', () => {
    const st = core.stats('abcdef', 'abcdeX', 0); // 5 对 1 错，长度打满 → done
    expect(st.acc).toBeCloseTo(5 / 6 * 100, 1);
    expect(st.correct).toBe(5);
    expect(st.wrong).toBe(1);
    expect(st.done).toBe(true);
  });
  it('extra 段计入 wrong；未打键不计', () => {
    const st = core.stats('ab', 'abccc', 0);
    expect(st.extra).toBe(3);
    expect(st.wrong).toBe(3);
    expect(st.correct).toBe(2);
  });
  it('空会话：acc=100、wpm=0、done=false', () => {
    const st = core.stats('abc', '', 0);
    expect(st.acc).toBe(100);
    expect(st.wpm).toBe(0);
    expect(st.done).toBe(false);
  });
  it('分级边界（工程自定值：键指如飞 ≥60 且 acc≥97）', () => {
    expect(core.grade(60, 97)).toBe('键指如飞');
    expect(core.grade(80, 90)).toBe('熟练'); // acc 门槛拦截
    expect(core.grade(59.9, 100)).toBe('熟练');
    expect(core.grade(40, 100)).toBe('熟练');
    expect(core.grade(25, 100)).toBe('入门');
    expect(core.grade(10, 50)).toBe('新手');
  });
});

describe('v9.06 #122 core：题源与采样', () => {
  it('pickWords 确定性：同 seed 同组、零重复、支持对象/字符串条目', () => {
    const bank = [{ word: 'w' + 0 }, { word: 'w' + 1 }, { word: 'w' + 2 }, { word: 'w' + 3 }, { word: 'w' + 4 }];
    const a = core.pickWords(bank, 3, 7);
    const b = core.pickWords(bank, 3, 7);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
    expect(a.length).toBe(3);
    expect(core.pickWords(['x', 'y'], 5, 1).length).toBe(2); // 超额钳到词库大小
  });
  it('英文句库：非空、全 ASCII 可打印、无重复', () => {
    expect(core.SENTENCES.length).toBeGreaterThanOrEqual(12);
    const ascii = /^[\x20-\x7E]+$/;
    for (const s of core.SENTENCES) expect(ascii.test(s), s).toBe(true);
    expect(new Set(core.SENTENCES).size).toBe(core.SENTENCES.length);
  });
  it('兜底词库 50 词在册（word-core 缺载防御）', () => {
    expect(core.FALLBACK_WORDS.length).toBe(50);
  });
});

describe('v9.06 #122 UI 与注册链', () => {
  it('UI 面：模式 chips/统计条/题面/输入/成绩面板/最佳 chip/只读桥在册', () => {
    for (const id of ['id="mWord"', 'id="mSent"', 'id="mFree"', 'id="drill"', 'id="inp"',
      'id="panel"', 'id="chipBest"', 'id="chipReset"', '__typingUI', 'typing.best.v1', 'id="freeText"']) {
      expect(UI_SRC).toContain(id);
    }
    expect(UI_SRC).toContain('__typingCore');
    expect(UI_SRC).toContain('md3-tokens.css');
    expect(UI_SRC).toContain('freeze-shim.js');
  });
  it('英文单词模式复用 #28 word-core 555 词库（script 直载 + 兜底在册）', () => {
    expect(UI_SRC).toContain('../../js/word-core.js');
    expect(UI_SRC).toContain('__wordCore');
    expect(UI_SRC).toContain('FALLBACK_WORDS');
  });
  it('注册链：apps-data 聚合 48 项 + 包装器 + 终端映射 + 图标在册', () => {
    // v123 同范式：apps-data 聚合断言走源码读取（裸动态 import 会踩
    // state.js↔apps-data.js 初始化环，见 v861「boot 先于模块 import」教训）
    const appsDataSrc = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf-8');
    const importCount = (appsDataSrc.match(/from '\.\/apps\/[\w-]+\.js'/g) || []).length;
    expect(importCount).toBe(48);
    expect(appsDataSrc).toContain("import typing from './apps/typing.js'");
    expect(appsDataSrc).toContain('gravity, drawcircle, typing,');

    expect(existsSync(join(ROOT, 'ios-desktop/apps/typing/index.html'))).toBe(true);
    expect(existsSync(join(ROOT, 'ios-desktop/apps/typing/core.js'))).toBe(true);
    expect(existsSync(join(ROOT, 'ios-desktop/js/apps/typing.js'))).toBe(true);

    const wrapper = readFileSync(join(ROOT, 'ios-desktop/js/apps/typing.js'), 'utf-8');
    expect(wrapper).toContain("id: 'typing'");
    expect(wrapper).toContain('iframeAppContent');

    const terminal = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf-8');
    expect(terminal).toContain('打字');
    expect(terminal).toContain("['typing', '打字练习', 'typing', '打字', '键入', 'wpm']");

    const icons = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf-8');
    expect(icons).toContain('typing: `<svg');
  });
  it('版本真源与 README 同步（v150 同口径）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('9.6.0');
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf-8');
    expect(readme).toContain('48');
    expect(readme).toContain('v9.06');
  });
});
