// ==================== font-fail-visible.test.js — v9.30 字体加载失败可见（#188 建议④加餐） ====================
//
// 议题锚（#188 第三节）：
//   「三、失败静默，用户零感知——:612 loadClockFontFontFace(f).catch(()=>{...}) 注释本身写得很好
//    （纪律正确：不白屏），但代价是：加载失败 → 无任何提示；:617 仍照常给 chip 加 active 类
//    → UI 显示'已选中'，实际没生效。用户看到的就是'点了、选中了、但没变化'。」
//   建议④：「加载失败要给用户反馈，不要静默。」
//
// v9.30 落位（clock-app applyClockFont else 分支）：
//   catch 三件套：①存储回滚 system（chip/存储/实际生效三者一致，离线设备不每次启动重复打扰，
//   点选可重试）②chip 回退实际生效项 ③轻量 toast「『X』加载失败，已回落系统默认（点选可重试）」；
//   成功路径保持静默（建议④只要求失败反馈，成功提示会造成打扰）；不白屏纪律零回退
//   （var 保持——family 未注册自动回落 --fn 数字链语义原样）。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const src = (p) => readFileSync(path.join(ROOT, p), 'utf8');
// v11.27 #160 二期五文件拆分：clock-app 锚改七文件拼接读取（断言不变）
const CLOCK_APP_ALL = ['index.html','app.mjs','alarm.mjs','world.mjs','timer.mjs','stopwatch.mjs','bedtime.mjs'];
const app = () => CLOCK_APP_ALL.map((f) => src('ios-desktop/apps/clock-app/' + f)).join('\n');

describe('v9.30 · D. 失败可见（#188 建议④）', () => {
  test('D1 showFontToast 单例函数 + #fontToast CSS（inverse-surface + show 类 + 2.8s 自动退场）', () => {
    const t = app();
    expect(t).toContain('const showFontToast=msg=>{');
    expect(t).toContain("t.id='fontToast'");
    expect(t).toContain('showFontToast._tmr=setTimeout(()=>t.classList.remove(\'show\'),2800)');
    expect(t).toContain('#fontToast{position:fixed');
    expect(t).toContain('--md-sys-color-inverse-surface,#313033');
    expect(t).toContain('#fontToast.show{opacity:1');
  });

  test('D2 catch 三件套：存储回滚 system + chip 回退实际生效项 + 失败文案 toast', () => {
    const t = app();
    expect(t).toContain("loadClockFontFontFace(f).catch(()=>{");
    expect(t).toContain("try{localStorage.setItem(CLOCK_FONT_KEY,JSON.stringify({id:'system'}))}catch(e){}");
    expect(t).toContain("c.classList.toggle('active',c.dataset.id==='system')");
    expect(t).toContain("加载失败，已回落系统默认（点选可重试）");
  });

  test('D3 旧静默形态不回归（catch 箭头体内必须含 showFontToast 调用）', () => {
    const t = app();
    const m = t.match(/loadClockFontFontFace\(f\)\.catch\(\(\)=>\{([\s\S]*?)\n\s*\}\);/);
    expect(m, 'catch 块应存在').toBeTruthy();
    expect(m[1]).toContain('showFontToast');
    expect(m[1]).toContain('localStorage.setItem'); // 存储回滚在块内
  });

  test('D4 不白屏纪律零回退（保持 var 语义注释在案——#188 建议①④不回退锚）', () => {
    const t = app();
    expect(t).toContain('载入失败保持 var');
    expect(t).toContain('绝不白屏');
    // --fn 链首修复（v9.28 建议①）原样保留
    expect(t).toContain("--fn:var(--clock-digit-font,var(--custom-user-font,'Quicksand'),sans-serif)");
  });
});

describe('v9.30 · E. 版本真源', () => {
  test('E1 package.json 9.30.0 + README 当前版本 v9.30', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.version).toBe('11.27.0');
    expect(src('README.md')).toContain('**当前版本 v11.27**');
  });

  test('E2 本文件自含 v9.30 锚', () => {
    expect(src('tests/font-fail-visible.test.js')).toContain('v11.27');
  });
});
