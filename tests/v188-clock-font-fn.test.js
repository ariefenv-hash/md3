// ==================== v188-clock-font-fn.test.js — v9.28 --fn 不读 --clock-digit-font 修复（#188 建议①） ====================
//
// 议题实锤链（#188 第二节）：
//   :root  --fn:var(--custom-user-font,'Quicksand',sans-serif)  ← 不含 --clock-digit-font
//   :19    .alarm-time,.stopwatch-display,.timer-big-num,#worldClockTime,#saverTime,
//          #timerDigits,.key-btn,.time-box-card,.city-time-num,.day-pill{font-family:var(--fn)}
//   :68/:71/:72  后置规则 .sheet-time/.alarm-time/#worldClockTime/#saverTime/#ringTimeDisplay/
//          .stopwatch-display{font-family:var(--cd)}  ← 同特异性后者覆盖
//   →  --cd 消费者响应字体切换；纯 --fn 消费者（.timer-big-num/#timerDigits/.city-time-num/
//      .key-btn/.time-box-card/.day-pill 六选择器）完全不响应 = 「内置字体点了没反应」根因。
//
// 修复（#188 建议①，一行改动）：--fn 链首纳入 --clock-digit-font——本组消费者全部是
// 时钟数字域元素，语义一致；--cd 后置覆盖组链首相同，已响应元素行为零变化。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const src = (p) => readFileSync(path.join(ROOT, p), 'utf8');
// v9.66 #160 二期五文件拆分：clock-app 锚改七文件拼接读取（断言不变）
const CLOCK_APP_ALL = ['index.html','app.mjs','alarm.mjs','world.mjs','timer.mjs','stopwatch.mjs','bedtime.mjs'];
const app = () => CLOCK_APP_ALL.map((f) => src('ios-desktop/apps/clock-app/' + f)).join('\n');

describe('v9.28 · A. --fn 链首修复（#188 建议①）', () => {
  test('A1 --fn 链首纳入 --clock-digit-font（与 --cd 同链首）', () => {
    const t = app();
    expect(t).toContain("--fn:var(--clock-digit-font,var(--custom-user-font,'Quicksand'),sans-serif)");
    expect(t).toContain("--cd:var(--clock-digit-font,var(--custom-user-font,'Quicksand'),ui-monospace,'DejaVu Sans Mono',monospace)");
    // 旧缺陷形态不得回归
    expect(t).not.toContain("--fn:var(--custom-user-font,'Quicksand',sans-serif)");
  });

  test('A2 :19 十选择器组在册（修复的消费面锚）', () => {
    const t = app();
    expect(t).toContain('.alarm-time,.stopwatch-display,.timer-big-num,#worldClockTime,#saverTime,#timerDigits,.key-btn,.time-box-card,.city-time-num,.day-pill{font-family:var(--fn)');
  });

  test('A3 --cd 后置覆盖组在册（已响应元素行为零变化的回归锚）', () => {
    const t = app();
    expect(t).toContain('.sheet-time{font-family:var(--cd)');
    expect(t).toContain('.alarm-time{font-family:var(--cd)');
    expect(t).toContain('#worldClockTime,#saverTime,#ringTimeDisplay,.stopwatch-display{font-family:var(--cd)}');
  });
});

describe('v9.28 · B. 议题其他判据现状锚（本期不动，防漂移留点）', () => {
  test('B1 CLOCK_FONTS 四项结构锚（v9.29 滚动：三项 AOSP 字体已 vendor 本地——#188 建议②落地；gsflex 仍外链属建议③留点）', () => {
    const t = app();
    expect(t).toContain("id:'gsflex'");
    expect(t).toContain("id:'aclock'");
    expect(t).toContain("id:'acsolid'");
    expect(t).toContain("id:'clockopia'");
    expect(t).toContain('fonts.googleapis.com'); // gsflex 仍外链（#188 建议③留点）
    expect(t).toContain("../../assets/fonts/AndroidClock.ttf"); // v9.29 vendor（#188 建议②）
    expect(t).not.toContain('cdn.jsdelivr.net'); // 三项 AOSP 字体零外链（v9.05 约束）
  });

  test('B2 失败静默纪律锚（建议④未做留点——catch 保持 var 不白屏语义在案）', () => {
    const t = app();
    expect(t).toContain('loadClockFontFontFace');
    expect(t).toMatch(/loadClockFontFontFace\([^)]*\)\.catch\(/);
  });
});

describe('v9.28 · C. 版本真源', () => {
  test('C1 package.json 9.28.0 + README 当前版本 v9.28', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.version).toBe('9.66.0');
    expect(src('README.md')).toContain('**当前版本 v9.66**');
  });

  test('C2 本文件自含 v9.29 锚', () => {
    expect(src('tests/v188-clock-font-fn.test.js')).toContain('v9.66');
  });
});
