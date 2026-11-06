// ==================== v931-font-fallback-visible.test.js — v9.31 建议③外链失败可见（#188 全议题闭环） ====================
//
// 议题锚（#188 第三节建议③）：gsflex 走 fonts.googleapis.com 外链——离线/网络断时 <link> CSS
// 请求即失败（link.onerror 可捕获），此前静默；建议④只覆盖了 FontFace 分支（loadClockFontFontFace
// 的 catch），css 分支漏网。v9.31 补齐：失败三件套与建议④同构（存储回滚 system + chip 回退 +
// toast），#188 建议①②③④至此全议题闭环。
// 边界诚实标注：CSS 成功但内部字体文件失败不由 onerror 捕获——由 font-display swap 回落链兜底。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const src = (p) => readFileSync(path.join(ROOT, p), 'utf8');
// v10.21 #160 二期五文件拆分：clock-app 锚改七文件拼接读取（断言不变）
const CLOCK_APP_ALL = ['index.html','app.mjs','alarm.mjs','world.mjs','timer.mjs','stopwatch.mjs','bedtime.mjs'];
const app = () => CLOCK_APP_ALL.map((f) => src('ios-desktop/apps/clock-app/' + f)).join('\n');

describe('v9.31 · F. 外链失败可见（#188 建议③）', () => {
  test('F1 link.onerror 三件套在册（存储回滚 system + chip 回退 + toast 文案）', () => {
    const t = app();
    expect(t).toContain('link.onerror=()=>{');
    expect(t).toContain("「Google Sans Flex」外链加载失败，已回落系统默认（点选可重试）");
    expect(t).toContain("已回落系统默认（点选可重试）"); // 与建议④同构语义
  });

  test('F2 时序锚：onerror 先挂后赋 href（防缓存命中瞬间触发漏接）', () => {
    const t = app();
    const iOnError = t.indexOf('link.onerror=()=>{');
    const iHref = t.indexOf('link.href=f.url;', iOnError);
    expect(iOnError).toBeGreaterThan(-1);
    expect(iHref).toBeGreaterThan(iOnError);
  });

  test('F3 边界标注在案（CSS 成功但字体文件失败由 font-display swap 兜底——诚实标注）', () => {
    const t = app();
    expect(t).toContain('font-display swap 回落链兜底');
  });
});

describe('v9.36 · G. 版本真源', () => {
  test('G1 package.json 9.36.0 + README 当前版本 v10.21', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.version).toBe('10.21.0');
    expect(src('README.md')).toContain('**当前版本 v10.21**');
  });

  test('G2 本文件自含 v9.31 锚', () => {
    expect(src('tests/v931-font-fallback-visible.test.js')).toContain('v10.21');
  });
});
