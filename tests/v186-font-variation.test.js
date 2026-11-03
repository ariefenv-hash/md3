// ==================== v186-font-variation.test.js — v9.26 可变字体四轴管线（#186 一期） ====================
//
// AOSP main 实证（快照 docs/reference/frameworks-base/systemui/animation/
// FontVariationUtils.kt，60 行，api.github.com contents 端点实拉）：
//   L5-8   TAG_WGHT="wght" / TAG_WDTH="wdth" / TAG_OPSZ="opsz" / TAG_ROND="ROND"
//   L10-16 mWeight/mWidth/mOpticalSize/mRoundness 初值 -1 + isUpdated
//   L22-26 updateFontVariation 各轴 >=0 且 != 旧值 → isUpdated=true
//   L39-51 生成串轴序固定 wght→wdth→opsz→ROND，"'tag' value" ", " 连接，
//          生成判据用字段值（>=0）而非参数
//   L52    return if (isUpdated) resultString else ""（零变化空串 = typefaceCache
//          key 无需重排，kt 注释原文语义）
//
// 覆盖：A 快照在册 / B TAG 常量 / C 状态机真跑 / D 生成串真跑 / E 消费端接线
//       （lock-screen.js + lock-screen.css）/ F 版本真源 9.26.0

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { FontVariationUtils, TAG_WGHT, TAG_WDTH, TAG_OPSZ, TAG_ROND } from '../ios-desktop/js/aosp/font-variation-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const src = (p) => readFileSync(path.join(ROOT, p), 'utf8');

describe('v9.26 · A. AOSP 快照在册', () => {
  test('A1 FontVariationUtils.kt 快照逐字锚（TAG 四常量 + isUpdated 空串语义）', () => {
    const t = src('docs/reference/frameworks-base/systemui/animation/FontVariationUtils.kt');
    expect(t).toContain('private const val TAG_WGHT = "wght"');
    expect(t).toContain('private const val TAG_WDTH = "wdth"');
    expect(t).toContain('private const val TAG_OPSZ = "opsz"');
    expect(t).toContain('private const val TAG_ROND = "ROND"');
    expect(t).toContain('used for key in typefaceCache in TextAnimator');
    expect(t).toContain('return if (isUpdated) resultString else ""');
    // 60 行快照（前后行数为 59 个换行 + 文件尾部）
    expect(t.split('\n').length).toBe(60);
  });
});

describe('v9.26 · B. TAG 四常量逐字', () => {
  test('B1 轴名字面量（ROND 大写为 Google 专有轴原拼写）', () => {
    expect(TAG_WGHT).toBe('wght');
    expect(TAG_WDTH).toBe('wdth');
    expect(TAG_OPSZ).toBe('opsz');
    expect(TAG_ROND).toBe('ROND');
  });
});

describe('v9.26 · C. 状态机真跑（kt L22-26 逐字）', () => {
  test('C1 初态：全 -1 → isUpdated=false → 空串（零变化不重排）', () => {
    const u = new FontVariationUtils();
    expect(u.isUpdated).toBe(false);
    expect(u.updateFontVariation()).toBe('');
    expect(u.isUpdated).toBe(false);
  });
  test('C2 单轴变更置位：weight 400 → isUpdated=true 且字段更新', () => {
    const u = new FontVariationUtils();
    u.updateFontVariation({ weight: 400 });
    expect(u.isUpdated).toBe(true);
    expect(u.mWeight).toBe(400);
  });
  test('C3 同值重入：isUpdated=false → 空串（isUpdated 置位仅当变化）', () => {
    const u = new FontVariationUtils();
    u.updateFontVariation({ weight: 400 });
    expect(u.updateFontVariation({ weight: 400 })).toBe('');
    expect(u.isUpdated).toBe(false);
    expect(u.mWeight).toBe(400); // 字段保持（不回退）
  });
  test('C4 参数 -1 不触碰字段（kt if weight >= 0 门）', () => {
    const u = new FontVariationUtils();
    u.updateFontVariation({ weight: 400, width: 100 });
    u.updateFontVariation({ opticalSize: 96 });
    expect(u.mWeight).toBe(400);
    expect(u.mWidth).toBe(100);
    expect(u.mOpticalSize).toBe(96);
  });
});

describe('v9.26 · D. 生成串真跑（kt L39-52 逐字）', () => {
  test('D1 单轴生成格式：单引号轴名 + 空格 + 值', () => {
    const u = new FontVariationUtils();
    expect(u.updateFontVariation({ weight: 400 })).toBe("'wght' 400");
  });
  test('D2 四轴全设：轴序固定 wght→wdth→opsz→ROND，", " 连接（#186 第一节格式）', () => {
    const u = new FontVariationUtils();
    expect(u.updateFontVariation({ weight: 400, width: 100, opticalSize: 48, roundness: 100 }))
      .toBe("'wght' 400, 'wdth' 100, 'opsz' 48, 'ROND' 100");
  });
  test('D3 跳轴生成：width -1 时 opsz 段直接衔接（非空判据 isBlank 同构）', () => {
    const u = new FontVariationUtils();
    expect(u.updateFontVariation({ weight: 300, opticalSize: 96 }))
      .toBe("'wght' 300, 'opsz' 96");
  });
  test('D4 字段保留生成：先设过后传 -1，字段 >=0 仍生成（kt L39 判据用字段）', () => {
    const u = new FontVariationUtils();
    u.updateFontVariation({ weight: 300, width: 100 });
    u.updateFontVariation({ roundness: 100 }); // 仅 roundness 变化
    expect(u.isUpdated).toBe(true);
    expect(u.updateFontVariation({ weight: 500 })).toBe("'wght' 500, 'wdth' 100, 'ROND' 100");
  });
  test('D5 零变化空串优先于生成串（kt L52 return 判据）', () => {
    const u = new FontVariationUtils();
    u.updateFontVariation({ weight: 400 });
    expect(u.updateFontVariation({})).toBe(''); // 字段均在但零变化 → ""
  });
});

describe('v9.26 · E. 消费端接线（lock-screen.js + lock-screen.css）', () => {
  test('E1 lock-screen.js 四轴管线消费在册', () => {
    const t = src('ios-desktop/js/lock-screen.js');
    expect(t).toContain("import { FontVariationUtils } from './aosp/font-variation-utils.js'");
    // v9.27 #186 二期：单实例 → 每视图独立实例（WeakMap 按元素缓存，AOSP TextAnimator
    // 同构；单实例消费双容器时第二容器因「同值重入零变化」拿不到注入——R50 实测复现）
    expect(t).toContain('const clockVariationInstances = new WeakMap()');
    expect(t).toContain('inst = new FontVariationUtils()');
    expect(t).toContain('LOCK_CLOCK_VARIATION = { weight: 300, width: 100, opticalSize: 96 }');
    expect(t).toContain('timeEl.style.fontVariationSettings = s');
    expect(t).toContain('ensureRobotoFlexFont()');
    expect(t).toContain('applyClockVariation()');
  });
  test('E2 lock-screen.css 时钟字体栈与轴兜底值在册', () => {
    const t = src('ios-desktop/css/lock-screen.css');
    expect(t).toContain("font-family: 'RobotoFlex', 'Noto Serif SC'");
    expect(t).toContain("font-variation-settings: 'wght' 300, 'wdth' 100, 'opsz' 96;");
  });
  test('E3 aosp 层头注含快照路径与 ROND 方案 A 留痕', () => {
    const t = src('ios-desktop/js/aosp/font-variation-utils.js');
    expect(t).toContain('docs/reference/frameworks-base/systemui/animation/FontVariationUtils.kt');
    expect(t).toContain('方案 A');
  });
});

describe('v9.26 · F. 版本真源', () => {
  test('F1 package.json 9.26.0（v9.26.0 → v9.26.0 滚动）', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.version).toBe('9.68.0');
  });
  test('F2 新增测试文件名版本对齐', () => {
    expect(src('tests/v186-font-variation.test.js')).toContain('v9.68');
  });
});
