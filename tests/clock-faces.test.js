// ==================== clock-faces.test.js — v11.29 #20 锁屏表盘系统 ====================
//
// AOSP 对标（aosp-mirror/platform_frameworks_base @ main，api.github.com contents 实拉
// 快照 2026-11-04）：
//   KeyguardClockSwitch.java（502 行）
//     L97-98/246-261  mSmallClockFrame/mLargeClockFrame 双帧 + setClock = removeAllViews
//                     + addView(clock.getSmallClock().getView()) —— 表盘切换权威 = 帧
//                     常驻、帧内内容重建（md3 双帧 = .lock-clock/.lock-clock-large）
//     L114/211-212    mDrawAlpha（onSetAlpha）—— doze 变暗权威（md3 .lock-face--aod）
//   plugin/src/com/android/systemui/plugins/clocks/ClockController.kt（45 行）
//     L29-34  smallClock/largeClock 双视图（smaller viewports / bigger viewport）
//     L38     config: ClockConfig —— 表盘身份
//     L44     initialize(isDarkTheme, dozeFraction, foldFraction)
//
// 覆盖：A 表盘注册表 / B 解析与兜底真跑 / C 双视图构建真跑（含模拟针角硬锚）/
//       D 字体栈合成 / E 存储键共用契约（clock-app 同键）/ F 接线锚（锁屏/AOD/设置）
//       / G CSS 锚（脸样式 + doze 低亮度 + reduced-motion）

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const src = (p) => readFileSync(path.join(ROOT, p), 'utf8');

import {
  CLOCK_FACES, CLOCK_FONT_SOURCES, CLOCK_FONT_IDS, DEFAULT_FACE_ID,
  LOCK_CLOCK_FACE_KEY, CLOCK_FONT_KEY, FACE_CHANGED_EVENT, CLOCK_FONT_CHANGED_EVENT,
  resolveFace, parseFacePref, parseClockFontId, clockFontStack, analogAngles, buildFaceHTML,
} from '../ios-desktop/js/aosp/clock-faces.js';

// ==================== A. 表盘注册表（ClockConfig 语义） ====================
describe('v20 · A. 表盘注册表', () => {
  test('A1 五表盘在册（#20 初版清单 + v11.29 #101 第 5 脸 custom——注册表重锚惯例同 v799 图标 60→61）', () => {
    expect(CLOCK_FACES.map((f) => f.id)).toEqual(['double', 'expressive', 'analog', 'minimal', 'custom']);
  });
  test('A2 默认脸 = double（config_doubleLineClockDefault=1 AOSP 默认同向）', () => {
    expect(DEFAULT_FACE_ID).toBe('double');
    expect(resolveFace('nope').id).toBe('double');
    expect(resolveFace(undefined).id).toBe('double');
  });
  test('A3 每表盘带展示元数据（label + note）', () => {
    for (const f of CLOCK_FACES) {
      expect(f.label.length).toBeGreaterThan(2);
      expect(f.note.length).toBeGreaterThan(4);
    }
  });
  test('A4 AOSP 对标头注在位（KeyguardClockSwitch L246-261 + ClockController.kt）', () => {
    const head = src('ios-desktop/js/aosp/clock-faces.js');
    expect(head).toContain('KeyguardClockSwitch.java');
    expect(head).toContain('L246-261');
    expect(head).toContain('ClockController.kt');
    expect(head).toContain('dozeFraction');
  });
});

// ==================== B. 解析与兜底真跑（clock-app parseClockFontPref 同构） ====================
describe('v20 · B. 解析与兜底', () => {
  test('B1 parseFacePref：合法/损坏/未知/裸值四路真跑', () => {
    expect(parseFacePref('{"id":"analog"}')).toBe('analog');
    expect(parseFacePref('{oops')).toBe('double');           // 损坏 JSON
    expect(parseFacePref('{"id":"ghost"}')).toBe('double');   // 未知 id
    expect(parseFacePref(null)).toBe('double');               // 缺载
    expect(parseFacePref('42')).toBe('double');               // 裸值
  });
  test('B2 parseClockFontId：合法/损坏/未知三路真跑', () => {
    expect(parseClockFontId('{"id":"aclock"}', CLOCK_FONT_IDS)).toBe('aclock');
    expect(parseClockFontId('{{{', CLOCK_FONT_IDS)).toBe('system');
    expect(parseClockFontId('{"id":"ghost"}', CLOCK_FONT_IDS)).toBe('system');
  });
  test('B3 字体源六项在册（#188 五项 + #20 新增 user）', () => {
    expect(CLOCK_FONT_IDS).toEqual(['system', 'gsflex', 'aclock', 'acsolid', 'clockopia', 'user']);
  });
});

// ==================== C. 双视图构建真跑（small/large + 模拟针角硬锚） ====================
describe('v20 · C. buildFaceHTML 双视图', () => {
  const d = new Date(2026, 10, 4, 10, 8, 30); // 10:08:30 固定时基（零 Date.now 注入纪律）

  test('C1 double 大视图 = 双行堆叠（HH|MM 两段，Pixel 大钟形态）', () => {
    const html = buildFaceHTML(resolveFace('double'), { date: d, size: 'large' });
    expect(html).toContain('lock-face--large');
    expect(html).toContain('lock-face-hh">10</div>');
    expect(html).toContain('lock-face-mm">08</div>');
  });
  test('C2 double 小视图 = 单行 HH:MM', () => {
    const html = buildFaceHTML(resolveFace('double'), { date: d, size: 'small' });
    expect(html).toContain('>10:08</div>');
    expect(html).not.toContain('lock-face-hh');
  });
  test('C3 expressive 胶囊结构 + animate 弹簧类外置（AOD 零 rAF 纪律）', () => {
    const html = buildFaceHTML(resolveFace('expressive'), { date: d, size: 'small' });
    expect(html).toContain('lock-face-pill');
    expect(html).not.toContain('lock-face-pop');
    const pop = buildFaceHTML(resolveFace('expressive'), { date: d, size: 'small', animate: true });
    expect(pop).toContain('lock-face-pop');
  });
  test('C4 analog SVG 双针 + 刻度 12 根', () => {
    const html = buildFaceHTML(resolveFace('analog'), { date: d, size: 'small' });
    expect(html).toContain('lock-face-analog');
    expect((html.match(/an-tick/g) || []).length).toBe(12);
    expect(html).toContain('an-hand-h');
    expect(html).toContain('an-hand-m');
  });
  test('C5 模拟针角硬锚 10:08:30 → 时针 304° / 分针 51°（连续偏移语义）', () => {
    const a = analogAngles(d);
    expect(a.hour).toBeCloseTo(304, 5);   // (10 + 8/60) × 30
    expect(a.minute).toBeCloseTo(51, 5);  // (8 + 30/60) × 6
  });
  test('C6 针角边界：00:00:00 全零 / 23:59:59 时针 359.5°（(11+59/60)×30）', () => {
    expect(analogAngles(new Date(2026, 10, 4, 0, 0, 0))).toEqual({ hour: 0, minute: 0 });
    const a = analogAngles(new Date(2026, 10, 4, 23, 59, 59));
    expect(a.hour).toBeCloseTo(359.5, 4);
    expect(a.minute).toBeCloseTo(359.9, 4);
  });
  test('C7 aod 旗标 → lock-face--aod 低亮度档（dozeFraction 映射）', () => {
    const html = buildFaceHTML(resolveFace('minimal'), { date: d, size: 'small', aod: true });
    expect(html).toContain('lock-face--aod');
  });
  test('C8 确定性：同参同串（零随机零时基依赖）', () => {
    const args = [resolveFace('analog'), { date: d, size: 'large' }];
    expect(buildFaceHTML(...args)).toBe(buildFaceHTML(...args));
  });
});

// ==================== D. 字体栈合成 ====================
describe('v20 · D. clockFontStack', () => {
  test('D1 vendor 族链收尾等宽（v9.28 秒表宽度漂移坑纪律）', () => {
    const s = clockFontStack('aclock');
    expect(s).toContain("'AndroidClockClockV849'");
    expect(s).toContain("'RobotoFlex'");
    expect(s.trim().endsWith('monospace')).toBe(true);
  });
  test('D2 user → var(--custom-user-font) 整段（#187 联动）', () => {
    expect(clockFontStack('user')).toContain('var(--custom-user-font');
  });
  test('D3 system → null（调用方保留脸默认栈）', () => {
    expect(clockFontStack('system')).toBeNull();
    expect(clockFontStack('ghost')).toBeNull();
  });
});

// ==================== E. 存储键共用契约（clock-app 同键两处消费） ====================
describe('v20 · E. 存储键契约', () => {
  test('E1 clock-font-v1 与 clock-app CLOCK_FONT_KEY 同值（app.mjs L96 预留声明启用）', () => {
    const app = src('ios-desktop/apps/clock-app/app.mjs');
    expect(app).toContain("CLOCK_FONT_KEY='ios-desktop:clock-font-v1'");
    expect(CLOCK_FONT_KEY).toBe('ios-desktop:clock-font-v1');
  });
  test('E2 表盘键独立新键（表盘与字体两个 AOSP 设置域）', () => {
    expect(LOCK_CLOCK_FACE_KEY).toBe('ios-desktop:lock-clock-face-v1');
  });
  test('E3 事件名双域独立', () => {
    expect(FACE_CHANGED_EVENT).toBe('lock-clock-face-changed');
    expect(CLOCK_FONT_CHANGED_EVENT).toBe('clock-font-changed');
  });
});

// ==================== F. 接线锚（锁屏 / AOD / 设置三方） ====================
describe('v20 · F. 接线锚', () => {
  const lock = src('ios-desktop/js/lock-screen.js');
  const aod = src('ios-desktop/js/aod-ui.js');
  const theme = src('ios-desktop/js/theme-engine.js');
  const loader = src('ios-desktop/js/clock-font-loader.js');

  test('F1 锁屏：表盘导入 + 双帧重建 + double-small textContent 旧路径', () => {
    expect(lock).toContain("from './aosp/clock-faces.js'");
    expect(lock).toContain('renderLockFaces(now)');
    expect(lock).toContain("small.textContent = `${hh}:${mm}`");  // v9.26 锚零漂移路径
    expect(lock).toContain("buildFaceHTML(face, { date: d, size: 'large' })");
  });
  test('F2 锁屏：setLockClockFace 持久化 + 事件广播 + setLockClockFont 加载', () => {
    expect(lock).toContain('export function setLockClockFace');
    expect(lock).toContain('export function setLockClockFont');
    expect(lock).toContain("localStorage.setItem(LOCK_CLOCK_FACE_KEY");
    expect(lock).toContain('ensureClockFontLoaded(valid)');
  });
  test('F3 锁屏：__lockTest 表盘观测面（无头回归）', () => {
    expect(lock).toContain('largeStacked');
    expect(lock).toContain('setFace: (id, persist) => setLockClockFace(id, persist)');
    expect(lock).toContain('setFont: (id, persist) => setLockClockFont(id, persist)');
  });
  test('F4 AOD：表盘感知渲染 + doze 低亮度 + 变更即时跟随', () => {
    expect(aod).toContain('buildFaceHTML(face, { date: d, size: \'small\', aod: true');
    expect(aod).toContain('FACE_CHANGED_EVENT');
    expect(aod).toContain("if (overlay && overlay.style.display === 'flex') renderClock()");
  });
  test('F5 设置：双节 data-test + 迷你预览 + window.__lockClockFaces 写路径（零 import 解耦）', () => {
    expect(theme).toContain('data-test="lockclock-section"');
    expect(theme).toContain('data-test="lockface-grid"');
    expect(theme).toContain('data-test="clockfont-grid"');
    expect(theme).toContain('window.__lockClockFaces.setFace');
    expect(theme).toContain('window.__lockClockFaces.setFont');
    expect(theme).toContain('ensureClockFontLoaded(id)');
  });
  test('F6 加载器：幂等 Set + 6s 超时 + css/vendor 双通道', () => {
    expect(loader).toContain('loadedOk');
    expect(loader).toContain('failed');
    expect(loader).toContain('6000');
    expect(loader).toContain('fonts.googleapis.com');
  });
});

// ==================== G. CSS 锚 ====================
describe('v20 · G. CSS 锚', () => {
  test('G1 lock-screen.css：脸节点 + text-shadow 补齐（非继承属性显式域）', () => {
    const css = src('ios-desktop/css/lock-screen.css');
    expect(css).toMatch(/\.lock-face\s*\{[\s\S]*?text-shadow/);
    expect(css).toMatch(/\.lock-face-pop/);
    expect(css).toContain('.lock-face--aod');
    expect(css).toContain('.lock-face-analog .an-hand-h');
  });
  test('G2 aod.css：模拟表盘缩档 + expressive 胶囊弱化', () => {
    const css = src('ios-desktop/css/aod.css');
    expect(css).toContain('.aod-clock .lock-face-analog');
    expect(css).toContain('.aod-clock .lock-face-pill');
  });
  test('G3 reduced-motion：弹簧停用（#77-A 全局纪律）', () => {
    const css = src('ios-desktop/css/lock-screen.css');
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*?\.lock-face-pop\s*\{\s*animation:\s*none/);
  });
});
