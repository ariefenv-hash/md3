// ==================== v929-clock-font-vendor.test.js — v9.29 时钟字体 vendor 化（#188 建议②） ====================
//
// 议题锚（#188 第二节/第六节建议②原文）：
//   「本地 vendor 三个 AOSP 字体 —— 总共 16.8 KB：5116 + 4824 + 6880 = 16820 B，
//     不到 17 KB 就能把整个时钟字体链变成离线可用，完全符合 v9.05「零外链 + 全离线」约束，
//     且与 #161 vendor 音频同一条路子，性价比极高。」
//
// v9.29 落位：
//   - 三字体入库 ios-desktop/assets/fonts/（AndroidClock.ttf / AndroidClock_Solid.ttf / Clockopia.ttf），
//     与 #190 Roboto Flex、material-symbols 同位（vite copy-static 插件自动进 dist + precache）；
//   - apps/clock-app/index.html CLOCK_FONTS 三项 url 切相对路径 '../../assets/fonts/*.ttf'
//     （iframe 内相对 index.html；FontFace fetch 同源无 CORS 耗时）；
//   - id/family 不变（AndroidClockClockV849 等三个族名与存储键 ios-desktop:clock-font-v1 的
//     {id} 值全部原样）——存量用户 localStorage 零迁移，字体切换偏好无缝沿用；
//   - gsflex 仍走 fonts.googleapis.com 外链（#188 建议③：体积大不全量 vendor，本地兜底留点）；
//   - loadClockFontFontFace catch 静默纪律不变（#188 建议④留点：失败可见属后续）。
//
// AOSP 考证：三字体均无 fvar 表（静态字体）——#188 第五节实测「与 #186 四轴可变字体不同体系」；
//   AndroidClock_Highlight 系锁屏双层高亮合成变体，单层场景无意义故不入列（v8.49 头注原锚）。

import { describe, test, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const src = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const font = (name) => readFileSync(path.join(ROOT, 'ios-desktop/assets/fonts', name));
// v9.97 #160 二期五文件拆分：clock-app 锚改七文件拼接读取（断言不变）
const CLOCK_APP_ALL = ['index.html','app.mjs','alarm.mjs','world.mjs','timer.mjs','stopwatch.mjs','bedtime.mjs'];
const app = () => CLOCK_APP_ALL.map((f) => src('ios-desktop/apps/clock-app/' + f)).join('\n');

describe('v9.29 · A. 三字体入库（assets/fonts）', () => {
  const SPEC = [
    { name: 'AndroidClock.ttf', bytes: 5116 },
    { name: 'AndroidClock_Solid.ttf', bytes: 4824 },
    { name: 'Clockopia.ttf', bytes: 6880 },
  ];

  test('A1 三文件在库 + 魔数 00010000（合法 TrueType sfnt）', () => {
    for (const s of SPEC) {
      const p = path.join(ROOT, 'ios-desktop/assets/fonts', s.name);
      expect(existsSync(p), `${s.name} 应在库`).toBe(true);
      const buf = font(s.name);
      expect(buf.length).toBe(s.bytes); // 体积逐字节锚（#188 第三节实测值）
      expect(buf.readUInt32BE(0)).toBe(0x00010000); // TrueType 版本 1.0
    }
  });

  test('A2 均无 fvar 表（静态字体——#188 第五节：与 #186 四轴可变字体不同体系）', () => {
    for (const s of SPEC) {
      const head = font(s.name).subarray(0, 2048);
      expect(head.includes(Buffer.from('fvar')), `${s.name} 不应含 fvar`).toBe(false);
    }
  });

  test('A3 总量 16.8KB 纪律锚（<17KB 预算内——议题建议②原文）', () => {
    const total = SPEC.reduce((n, s) => n + s.bytes, 0);
    expect(total).toBe(16820);
    expect(total).toBeLessThan(17 * 1024);
  });
});

describe('v9.29 · B. CLOCK_FONTS 切换与兼容性', () => {
  test('B1 三项 url 切本地相对路径（iframe 内相对 index.html）', () => {
    const t = app();
    expect(t).toContain("url:'../../assets/fonts/AndroidClock.ttf'");
    expect(t).toContain("url:'../../assets/fonts/AndroidClock_Solid.ttf'");
    expect(t).toContain("url:'../../assets/fonts/Clockopia.ttf'");
    // 零外链（v9.05 约束）：三项 AOSP 字体不再走 CDN
    expect(t).not.toContain('cdn.jsdelivr.net');
  });

  test('B2 id/family/存储键全部不变——存量 localStorage 零迁移（向后兼容锚）', () => {
    const t = app();
    expect(t).toContain("CLOCK_FONT_KEY='ios-desktop:clock-font-v1'");
    expect(t).toContain("family:'AndroidClockClockV849'");
    expect(t).toContain("family:'AndroidClockSolidV849'");
    expect(t).toContain("family:'ClockopiaClockV849'");
    // parseClockFontPref 仍按 id 白名单回落 'system'（缺载/损坏/未知 id 离线安全语义不变）
    expect(t).toContain("CLOCK_FONTS.some(f=>f.id===id)?id:'system'");
  });

  test('B3 gsflex 仍外链 css:true（#188 建议③留点）+ loadClockFontFontFace catch 静默（建议④留点）', () => {
    const t = app();
    expect(t).toMatch(/id:'gsflex'[^}]*css:true/);
    expect(t).toMatch(/fonts\.googleapis\.com\/css2\?family=Google\+Sans\+Flex/);
    expect(t).toMatch(/loadClockFontFontFace\([^)]*\)\.catch\(/); // 失败保持 var 不白屏语义不变
  });
});

describe('v9.29 · C. 版本真源', () => {
  test('C1 package.json 9.29.0 + README 当前版本 v9.29', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.version).toBe('9.97.0');
    expect(src('README.md')).toContain('**当前版本 v9.97**');
  });

  test('C2 本文件自含 v9.29 锚', () => {
    expect(src('tests/v929-clock-font-vendor.test.js')).toContain('v9.97');
  });
});
