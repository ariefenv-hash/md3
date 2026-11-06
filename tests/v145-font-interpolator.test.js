// ==================== v145-font-interpolator.test.js — v9.36 可变字体轴插值引擎（#145） ====================
//
// AOSP main 实证（快照 docs/reference/frameworks-base/SystemUI/animation/
// FontInterpolator.kt，230 行）：
//   L28-35   TAG_WGHT="wght"/TAG_ITAL="ital"/FONT_WEIGHT_DEFAULT_VALUE=400f/
//            FONT_ITALIC_MAX=1f/FONT_ITALIC_MIN=0f/FONT_ITALIC_ANIMATION_STEP=0.1f/
//            FONT_ITALIC_DEFAULT_VALUE=0f
//   L61-87   FontCacheImpl 两级 LRU：interpCache(InterpKey=start+end+frame)+
//            varFontCache(VarFontKey=sourceId+ttcIndex+sortedAxes)；
//            cacheMaxEntries = animationFrameCount*2；DEFAULT_FONT_CACHE_MAX_ENTRIES=10
//            （Perfetto 基准：Pixel 6 上 10→50 条帧耗时差约 0.3ms）
//   L92-167  lerp：progress 0/1 快路径 → 双空轴快路径 → InterpKey 帧量化
//            ((progress*animationFrameCount).toInt()) 缓存 → 轴双指针按 tag 归并
//            （wght 缺省 400 连续插值 / ital 0.1 步进量化 / 未知轴 require 两端有值
//            否则 IllegalArgumentException）→ VarFontKey 缓存 → Font.Builder 新建
//            + 双缓存写入 + MISS 记账（L165 Log.e）
//   L215-219 adjustItalic = coerceInWithStep(value, MIN, MAX, STEP)；
//            coerceInWithStep = (v.coerceIn(min,max)/step).toInt()*step
//   L227-228 canInterpolate = ttcIndex 相同 && sourceIdentifier 相同
//
// kt 陷阱在录：VarFontKey data class 的 sortedAxes: List<FontVariationAxis> 相等性
// 为逐元素 equals（tag+styleValue）——JS 键必须含值，同 tag 异值不得误命中（C4）。
//
// 轴定义按 #145 裁决（issuecomment-6554563607）：四轴为准、ROND 不做，落地
// wght/wdth/opsz 三轴；ital 保留全链语义（常量与步进照抄源码），锁屏时钟场景未见
// 使用（裁决原文）。
//
// 覆盖：A 快照在册 / B 常量+纯函数真跑 / C 两级缓存真跑 / D 消费端接线
//       （lock-screen.js fold 跟手插值）/ E 版本真源 9.36.0

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  FontInterpolator, FontCacheImpl, makeFontRecord, axesToCssString, parseFontVariationSettings,
  mathLerp, TAG_WGHT, TAG_ITAL, FONT_WEIGHT_DEFAULT_VALUE,
  FONT_ITALIC_ANIMATION_STEP, FONT_ITALIC_MAX, FONT_ITALIC_MIN, FONT_ITALIC_DEFAULT_VALUE,
} from '../ios-desktop/js/aosp/font-interpolator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const src = (p) => readFileSync(path.join(ROOT, p), 'utf8');

describe('v9.36 · A. AOSP 快照在册（FontInterpolator.kt 230 行）', () => {
  test('A1 常量组逐字锚（TAG 两轴 + 五数值常量）', () => {
    const t = src('docs/reference/frameworks-base/SystemUI/animation/FontInterpolator.kt');
    expect(t).toContain('private const val TAG_WGHT = "wght"');
    expect(t).toContain('private const val TAG_ITAL = "ital"');
    expect(t).toContain('private const val FONT_WEIGHT_DEFAULT_VALUE = 400f');
    expect(t).toContain('private const val FONT_ITALIC_MAX = 1f');
    expect(t).toContain('private const val FONT_ITALIC_MIN = 0f');
    expect(t).toContain('private const val FONT_ITALIC_ANIMATION_STEP = 0.1f');
    expect(t).toContain('private const val FONT_ITALIC_DEFAULT_VALUE = 0f');
  });

  test('A2 两级缓存常量逐字锚（DEFAULT=10 / animationFrameCount=10/2 / LruCache 双键）', () => {
    const t = src('docs/reference/frameworks-base/SystemUI/animation/FontInterpolator.kt');
    expect(t).toContain('@VisibleForTesting const val DEFAULT_FONT_CACHE_MAX_ENTRIES = 10');
    expect(t).toContain('val cacheMaxEntries = animationFrameCount * 2');
    expect(t).toContain('private val interpCache = LruCache<InterpKey, Font>(cacheMaxEntries)');
    expect(t).toContain('private val verFontCache = LruCache<VarFontKey, Font>(cacheMaxEntries)');
  });

  test('A3 lerp 快路径 + 帧量化缓存查逐字锚', () => {
    const t = src('docs/reference/frameworks-base/SystemUI/animation/FontInterpolator.kt');
    expect(t).toContain('if (progress == 0f) {');
    expect(t).toContain('} else if (progress == 1f) {');
    expect(t).toContain('val iKey = InterpKey(start, end, (progress * fontCache.animationFrameCount).toInt())');
  });

  test('A4 ital 步进量化 + canInterpolate 源行逐字锚', () => {
    const t = src('docs/reference/frameworks-base/SystemUI/animation/FontInterpolator.kt');
    expect(t).toContain('(v.coerceIn(min, max) / step).toInt() * step');
    expect(t).toContain('fun canInterpolate(start: Font, end: Font) =');
    expect(t).toContain('start.ttcIndex == end.ttcIndex && start.sourceIdentifier == end.sourceIdentifier');
  });
});

describe('v9.36 · B. 常量与纯函数真跑', () => {
  test('B1 常量 export 值真跑（TAG/400/0.1/1/0/0）', () => {
    expect(TAG_WGHT).toBe('wght');
    expect(TAG_ITAL).toBe('ital');
    expect(FONT_WEIGHT_DEFAULT_VALUE).toBe(400);
    expect(FONT_ITALIC_ANIMATION_STEP).toBe(0.1);
    expect(FONT_ITALIC_MAX).toBe(1);
    expect(FONT_ITALIC_MIN).toBe(0);
    expect(FONT_ITALIC_DEFAULT_VALUE).toBe(0);
  });

  test('B2 lerp 快路径：progress 0 → start 引用，1 → end 引用（kt L93-96 同一性语义）', () => {
    const itp = new FontInterpolator();
    const a = makeFontRecord([{ tag: 'wght', styleValue: 300 }]);
    const b = makeFontRecord([{ tag: 'wght', styleValue: 100 }]);
    expect(itp.lerp(a, b, 0)).toBe(a);
    expect(itp.lerp(a, b, 1)).toBe(b);
  });

  test('B3 wght 连续插值真跑：p=0.5 → 200、p=0.25 → 250（300→100）', () => {
    const itp = new FontInterpolator();
    const a = makeFontRecord([{ tag: 'wght', styleValue: 300 }]);
    const b = makeFontRecord([{ tag: 'wght', styleValue: 100 }]);
    expect(itp.lerp(a, b, 0.5).axes[0].styleValue).toBeCloseTo(200, 6);
    expect(itp.lerp(a, b, 0.25).axes[0].styleValue).toBeCloseTo(250, 6);
  });

  test('B4 wght 缺省补齐 400（kt L123-128：startValue ?: FONT_WEIGHT_DEFAULT_VALUE）', () => {
    const itp = new FontInterpolator();
    const a = makeFontRecord([{ tag: 'wght', styleValue: 300 }]);
    const b = makeFontRecord([]); // end 无轴：wght 归并出 end 缺值 → 缺省 400 补齐
    expect(itp.lerp(a, b, 0.5).axes[0].styleValue).toBeCloseTo(350, 6); // lerp(300,400,0.5)
  });

  test('B5 ital 0.1 步进量化真跑：0→1 p=0.25 → 0.2、p=0.55 → 0.5、p≈1 恒 <1', () => {
    const itp = new FontInterpolator();
    const a = makeFontRecord([{ tag: 'ital', styleValue: 0 }]);
    const b = makeFontRecord([{ tag: 'ital', styleValue: 1 }]);
    expect(itp.lerp(a, b, 0.25).axes[0].styleValue).toBeCloseTo(0.2, 6); // trunc(0.25/0.1)*0.1
    expect(itp.lerp(a, b, 0.55).axes[0].styleValue).toBeCloseTo(0.5, 6); // trunc(5.5)=5
    expect(itp.lerp(a, b, 0.999).axes[0].styleValue).toBeCloseTo(0.9, 6); // 恒不达 MAX（量化语义）
  });

  test('B6 未知轴缺值 throw（kt L137-143 require IllegalArgumentException 同语义）', () => {
    const itp = new FontInterpolator();
    const a = makeFontRecord([{ tag: 'wdth', styleValue: 100 }]);
    const b = makeFontRecord([{ tag: 'wdth', styleValue: 100 }, { tag: 'opsz', styleValue: 96 }]);
    expect(() => itp.lerp(a, b, 0.5)).toThrow(
      'Unable to interpolate due to unknown default axes value : opsz',
    );
  });

  test('B7 双空轴快路径 → start（kt L102-104）', () => {
    const itp = new FontInterpolator();
    const a = makeFontRecord([]);
    const b = makeFontRecord([]);
    expect(itp.lerp(a, b, 0.5)).toBe(a);
  });

  test('B8 轴串生成/解析往返（FontVariationAxis.toString 同构格式）', () => {
    const s = axesToCssString([
      { tag: 'wght', styleValue: 250 },
      { tag: 'wdth', styleValue: 100 },
      { tag: 'opsz', styleValue: 96 },
    ]);
    expect(s).toBe("'wght' 250, 'wdth' 100, 'opsz' 96");
    const back = parseFontVariationSettings(s);
    expect(back.map((a) => a.tag)).toEqual(['wght', 'wdth', 'opsz']);
    expect(back.map((a) => a.styleValue)).toEqual([250, 100, 96]);
  });

  test('B9 双指针按 tag 归并 + 输出排序（kt L175-176 sortBy 字典序：wd<wg → wdth 在前；两端都有不 throw）', () => {
    const itp = new FontInterpolator();
    const a = makeFontRecord([{ tag: 'wdth', styleValue: 100 }, { tag: 'wght', styleValue: 300 }]); // 乱序入参
    const b = makeFontRecord([{ tag: 'wght', styleValue: 500 }, { tag: 'wdth', styleValue: 80 }]);
    const out = itp.lerp(a, b, 0.5);
    expect(out.axes.map((x) => x.tag)).toEqual(['wdth', 'wght']); // tag 字典序归并（wdth<wght），非入参序
    expect(out.axes[0].styleValue).toBeCloseTo(90, 6); // lerp(100,80,0.5)
    expect(out.axes[1].styleValue).toBeCloseTo(400, 6); // lerp(300,500,0.5)
  });

  test('B10 canInterpolate 真跑（kt L227-228：ttcIndex 同 && sourceId 同）', () => {
    const same = makeFontRecord([{ tag: 'wght', styleValue: 300 }], { sourceId: 7, ttcIndex: 0 });
    const same2 = makeFontRecord([{ tag: 'wght', styleValue: 500 }], { sourceId: 7, ttcIndex: 0 });
    const diffSrc = makeFontRecord([{ tag: 'wght', styleValue: 300 }], { sourceId: 8, ttcIndex: 0 });
    const diffTtc = makeFontRecord([{ tag: 'wght', styleValue: 300 }], { sourceId: 7, ttcIndex: 1 });
    expect(FontInterpolator.canInterpolate(same, same2)).toBe(true);
    expect(FontInterpolator.canInterpolate(same, diffSrc)).toBe(false);
    expect(FontInterpolator.canInterpolate(same, diffTtc)).toBe(false);
  });

  test('B11 mathLerp（android.util.MathUtils 同构）+ FontCacheImpl 常量', () => {
    expect(mathLerp(300, 100, 0.5)).toBe(200);
    expect(FontCacheImpl.DEFAULT_FONT_CACHE_MAX_ENTRIES).toBe(10);
    const c = new FontCacheImpl();
    expect(c.animationFrameCount).toBe(5); // 10/2
  });
});

describe('v9.36 · C. 两级缓存真跑（帧量化 / LRU 淘汰 / VarFontKey 值入键）', () => {
  test('C1 同帧量化区间重复调用命中一级缓存（missCount 不增）', () => {
    const itp = new FontInterpolator();
    const a = makeFontRecord([{ tag: 'wght', styleValue: 300 }]);
    const b = makeFontRecord([{ tag: 'wght', styleValue: 100 }]);
    itp.lerp(a, b, 0.50); // frame = trunc(0.50*5) = 2（MISS）
    expect(itp.missCount).toBe(1);
    itp.lerp(a, b, 0.52); // frame = trunc(0.52*5) = 2（同帧命中）
    expect(itp.missCount).toBe(1);
    itp.lerp(a, b, 0.58); // frame = trunc(2.9) = 2（仍同帧）
    expect(itp.missCount).toBe(1);
  });

  test('C2 跨帧 MISS（p=0.50→0.70：frame 2→3）', () => {
    const itp = new FontInterpolator();
    const a = makeFontRecord([{ tag: 'wght', styleValue: 300 }]);
    const b = makeFontRecord([{ tag: 'wght', styleValue: 100 }]);
    itp.lerp(a, b, 0.50);
    expect(itp.missCount).toBe(1);
    const out = itp.lerp(a, b, 0.70); // trunc(3.5)=3 ≠ 2
    expect(itp.missCount).toBe(2);
    expect(out.axes[0].styleValue).toBeCloseTo(160, 6); // lerp(300,100,0.7)=300-140=160
  });

  test('C3 LRU 淘汰：11 个不同 end 组合挤出首条目，重查再 MISS（cacheMaxEntries=10）', () => {
    const itp = new FontInterpolator();
    const a = makeFontRecord([{ tag: 'wght', styleValue: 300 }]);
    const ends = [];
    for (let w = 100; w <= 1100; w += 100) ends.push(makeFontRecord([{ tag: 'wght', styleValue: w }]));
    for (const e of ends) itp.lerp(a, e, 0.5); // 11 组全异 iKey/vKey
    expect(itp.missCount).toBe(11);
    itp.lerp(a, ends[0], 0.5); // ends[0] 已被 LRU 淘汰（第 12 次插入挤掉最早的）
    expect(itp.missCount).toBe(12);
  });

  test('C4 VarFontKey 值入键（kt data class 逐元素 equals）：同 tag 异值不得误命中', () => {
    const itp = new FontInterpolator();
    const a = makeFontRecord([{ tag: 'wght', styleValue: 300 }]);
    const bLow = makeFontRecord([{ tag: 'wght', styleValue: 100 }]);
    const bHigh = makeFontRecord([{ tag: 'wght', styleValue: 200 }]);
    const r1 = itp.lerp(a, bLow, 0.5); // wght 200（MISS ×2：iKey+vKey 首建）
    expect(r1.axes[0].styleValue).toBeCloseTo(200, 6);
    expect(itp.missCount).toBe(1);
    const r2 = itp.lerp(a, bHigh, 0.5); // 同 tag 集异值：tag-only 键会误命中返回 200——值入键后正确 MISS
    expect(r2.axes[0].styleValue).toBeCloseTo(250, 6); // lerp(300,200,0.5)
    expect(itp.missCount).toBe(2);
    const r3 = itp.lerp(a, bLow, 0.5); // 与 r1 同帧同值：iKey 命中（反向回放语义）
    expect(r3.axes[0].styleValue).toBeCloseTo(200, 6);
    expect(itp.missCount).toBe(2);
  });
});

describe('v9.36 · D. 消费端接线锚（lock-screen.js fold 跟手插值）', () => {
  const lock = () => src('ios-desktop/js/lock-screen.js');

  test('D1 import 行 + fold 轴值逐字锚（起点 300=v9.26 锚 / 终点 100=Roboto Flex 轴域下界裁决）', () => {
    const t = lock();
    expect(t).toContain("import { FontInterpolator, makeFontRecord, axesToCssString } from './aosp/font-interpolator.js'");
    expect(t).toContain("const FOLD_START_AXES = makeFontRecord([");
    expect(t).toContain("{ tag: 'wght', styleValue: 300 },");
    expect(t).toContain("{ tag: 'wdth', styleValue: 100 },");
    expect(t).toContain("{ tag: 'opsz', styleValue: 96 },");
    expect(t).toContain('const FOLD_END_AXES = makeFontRecord([');
    expect(t).toContain("{ tag: 'wght', styleValue: 100 },"); // 终点（Roboto Flex wght 轴域 100~1000 下界，#190 在案）
  });

  test('D2 applyClockFold 在场 + 恢复语义显式写回非清空（大钟 CSS 无静态轴串，清空回落默认 400 bug）', () => {
    const t = lock();
    expect(t).toContain('function applyClockFold(foldFraction) {');
    expect(t).toContain('显式写回非清空');
    expect(t).toContain('const rec = clockFontInterpolator.lerp(FOLD_START_AXES, FOLD_END_AXES, p)');
    expect(t).toContain('el.style.fontVariationSettings = css');
  });

  test('D3 五调用点逐字锚：drag 跟手 / spring commit 接力 / spring 回弹回落 / isSettled 归位显式复位 / lockNow 复位', () => {
    const t = lock();
    expect(t).toContain('applyClockFold(op); // v9.36 #145：fold 字重跟手插值（foldP 与 content 透明度同源同域）');
    expect(t).toContain('applyClockFold(Math.max(0, x) / (h * 0.9)); // v9.36 #145：弹簧接力 fold 连续插值（drag→spring 无缝：位移真值同域）');
    expect(t).toContain('applyClockFold(Math.max(0, x) / (h * 0.9)); // v9.36 #145：回弹路径 fold 回落（x→0 时恢复注入基线，中途反转不瞬移）');
    expect(t).toContain('applyClockFold(0); // v9.36 #145：回弹归位显式复位（弹簧末帧 x≠0 → p>0 不触发 p<=0 恢复分支，不显式复位则 fold 残留——R52 e2e F9 实测在录）');
    expect(t).toContain('applyClockFold(0); // v9.36 #145：fold 残留复位（commit 飞出后两钟 wght 100 残留 → 重入锁屏恢复注入基线）');
  });

  test('D4 无头观测钩子（__lockTest.fold / foldApply）', () => {
    const t = lock();
    expect(t).toContain('applied: foldApplied,');
    expect(t).toContain('smallFvs: small ? small.style.fontVariationSettings : \'\',');
    expect(t).toContain('foldApply: (p) => applyClockFold(p),');
  });

  test('D5 animateFoldToAod 权威快照锚（Controller L474-478 两钟都 fold）', () => {
    const t = src('docs/reference/frameworks-base/systemui/keyguard/KeyguardClockSwitchController.java');
    expect(t).toContain('public void animateFoldToAod(float foldFraction) {');
    expect(t).toContain('clock.getSmallClock().getAnimations().fold(foldFraction);');
    expect(t).toContain('clock.getLargeClock().getAnimations().fold(foldFraction);');
  });

  test('D6 轴值裁决注释在录（非源码常量口径标注——同 v8.96 三阈值范式）', () => {
    const t = lock();
    expect(t).toContain('终点值为 md3 映射');
    expect(t).toContain('裁决——同 v8.96 三阈值「工程调优自定值」口径');
  });
});

describe('v9.36 · E. 版本真源', () => {
  test('E1 package.json 9.36.0', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.version).toBe('10.26.0');
  });

  test('E2 README 当前版本块 v9.36（sync-readme-version.mjs 单一真源）', () => {
    const t = src('README.md');
    expect(t).toContain('**当前版本 v10.26**');
  });
});
