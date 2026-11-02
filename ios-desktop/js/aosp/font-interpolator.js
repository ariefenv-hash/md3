// ==================== aosp/font-interpolator.js — 可变字体轴插值引擎（#145） ====================
//
// 权威源（aosp-mirror/platform_frameworks_base @ main 实拉；快照
// docs/reference/frameworks-base/SystemUI/animation/FontInterpolator.kt，230 行）：
//   packages/SystemUI/animation/src/com/android/systemui/animation/FontInterpolator.kt
//   - L28-35   TAG_WGHT="wght" / TAG_ITAL="ital" / FONT_WEIGHT_DEFAULT_VALUE=400f /
//              FONT_ITALIC_MAX=1f / FONT_ITALIC_MIN=0f / FONT_ITALIC_ANIMATION_STEP=0.1f /
//              FONT_ITALIC_DEFAULT_VALUE=0f
//   - L61-87   FontCacheImpl 两级 LRU：interpCache（InterpKey=start+end+frame）+
//              varFontCache（VarFontKey=sourceId+ttcIndex+sortedAxes）；cacheMaxEntries =
//              animationFrameCount * 2；DEFAULT_FONT_CACHE_MAX_ENTRIES=10（Perfetto 基准：
//              Pixel 6 上 10→50 条帧耗时差约 0.3ms，L83-84）；animationFrameCount = 10/2 = 5
//   - L92-167  lerp(start,end,progress)：progress 0/1 快路径 → 双空轴快路径 →
//              InterpKey 缓存查（帧量化 (progress*animationFrameCount).toInt()）→
//              轴双指针按 tag 归并（wght 缺省 400 连续插值 / ital 步进量化 / 其他轴
//              require 两端有值否则 IllegalArgumentException）→ VarFontKey 缓存查 →
//              Font.Builder(start).setFontVariationSettings(newAxes).build() 建新字 →
//              双缓存写入 + cache MISS 记账（L165 Log.e）
//   - L169-211 私有 lerp：start/end 轴按 tag 排序后双指针归并（comp==0 两端有值 /
//              comp<0 仅 start（end 传 null）/ comp>0 仅 end（start 传 null））
//   - L215-219 adjustItalic = coerceInWithStep(value, MIN, MAX, STEP)；
//              coerceInWithStep(v,min,max,step) = (v.coerceIn(min,max)/step).toInt()*step
//   - L227-228 canInterpolate(start,end) = ttcIndex 相同 && sourceIdentifier 相同
//
// md3 网页映射（诚实标注）：
//   - Android Font 实例（不可变 + axes 元数据）→ FontRecord { axes:[{tag,styleValue}],
//     ttcIndex, sourceId }。Font.Builder(start).setFontVariationSettings(newAxes).build()
//     → 生成新 FontRecord（同 meta、新 axes）；无真实字体二进制重建——渲染层由 CSS
//     引擎消费 font-variation-settings（#145 网页可行性节：CSS 原生支持 wght/ital 轴）
//   - 消费端见 lock-screen.js applyClockFold（v9.33 #145：解锁拖拽 foldP → 大钟/小钟
//     字重跟手插值，animateFoldToAod(foldFraction) Controller L474-478 权威路径同构）
//   - Log.e cache MISS（L165）→ missCount 计数器（网页侧逐帧 error 刷屏不可取，计数
//     语义同构，debug=true 时 console.warn）
//   - MathUtils.lerp(a,b,t) = a + (b - a) * t（android.util.MathUtils 标准线性插值）
//   - 轴定义按 #145 裁决（issuecomment-6554563607）：四轴为准、ROND 不做，落地
//     wght/wdth/opsz 三轴；ital 保留全链语义（常量与步进照抄源码，kt 注释 L213-214：
//     步进量化帮助 Skia glyph cache 命中——CSS 侧同类收益为 font-variation-settings
//     字符串稳定 → 浏览器字形缓存命中），锁屏时钟场景未见使用
//   - 无依赖纯逻辑层（零 DOM 零网络），IIFE 不适用——与 aosp/ 既有模块一致走 ESM export
//     （消费者 lock-screen.js 为 ESM；vitest 直测）

export const TAG_WGHT = 'wght';
export const TAG_ITAL = 'ital';

export const FONT_WEIGHT_DEFAULT_VALUE = 400;
export const FONT_ITALIC_MAX = 1;
export const FONT_ITALIC_MIN = 0;
export const FONT_ITALIC_ANIMATION_STEP = 0.1;
export const FONT_ITALIC_DEFAULT_VALUE = 0;

/** android.util.MathUtils.lerp 同构 */
export function mathLerp(a, b, t) {
  return a + (b - a) * t;
}

/** FontVariationAxis 对应物：{tag, styleValue}。fromFontVariationSettings 同名构造
 *  （"'wght' 300, 'wdth' 100" 解析）——AOSP FontVariationAxis.fromFontVariationSettings
 *  同语义，供消费端从 CSS 串建 FontRecord（TextAnimator fvar 增量路径） */
export function parseFontVariationSettings(str) {
  const axes = [];
  if (!str) return axes;
  const re = /'([^']+)'\s+(-?[\d.]+)/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    axes.push({ tag: m[1], styleValue: parseFloat(m[2]) });
  }
  return axes;
}

/** FontVariationAxis.toString 同构："'tag' value"（单引号轴名 + 空格 + 值）；
 *  多轴 ", " 连接——AOSP 生成格式与 CSS font-variation-settings 规范同构（#186 第一节） */
export function axesToCssString(axes) {
  return axes.map((a) => `'${a.tag}' ${a.styleValue}`).join(', ');
}

/** FontRecord 构造（Font 实例对应物）。fontMeta 缺省：md3 单字体 RobotoFlex 语境
 *  （sourceId 常量、ttcIndex 0——woff2 单字面无 ttc 集合）。
 *  _id 实例标识：kt InterpKey(start, end, frame) data class 相等性中 start/end 为
 *  Font.equals（android.graphics.fonts.Font 未重写 equals → 引用相等）——同轴值
 *  异实例不得命中（缓存正确性）。JS 无引用串化手段，自增序列号同构（同实例同 id） */
let fontRecordSeq = 0;
export function makeFontRecord(axes, { sourceId = 0, ttcIndex = 0 } = {}) {
  return {
    _id: ++fontRecordSeq,
    axes: axes.map((a) => ({ tag: a.tag, styleValue: a.styleValue })),
    ttcIndex,
    sourceId,
  };
}

/** LruCache（android.util.LruCache 语义）：Map 插入序 + get 重插实现最近使用上浮，
 *  超限淘汰最旧（LRU 淘汰首项） */
class LruCache {
  constructor(maxEntries) {
    this.maxEntries = maxEntries;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const v = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, v); // 最近使用上浮（LruCache get 语义）
    return v;
  }

  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.maxEntries) {
      // 淘汰最旧（Map 迭代序首项 = 最久未使用）
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }

  get size() {
    return this.map.size;
  }
}

/** FontCacheImpl.kt L61-87 逐字移植：两级缓存 + animationFrameCount = 10/2 = 5 */
export class FontCacheImpl {
  constructor(animationFrameCount = FontCacheImpl.DEFAULT_FONT_CACHE_MAX_ENTRIES / 2) {
    this.animationFrameCount = animationFrameCount;
    // FontInterpolator.kt L63-64 注释原文：两级缓存——一级给输入、一级给不同 variation
    // settings 的字体。无需同步：FontInterpolator 非线程安全设计，只能用于 UI 线程
    // （网页侧单线程 rAF 同构，无锁）
    const cacheMaxEntries = animationFrameCount * 2;
    this.interpCache = new LruCache(cacheMaxEntries);
    this.varFontCache = new LruCache(cacheMaxEntries);
  }

  getInterp(key) {
    return this.interpCache.get(key);
  }

  getVarFont(key) {
    return this.varFontCache.get(key);
  }

  putInterp(key, font) {
    this.interpCache.put(key, font);
  }

  putVarFont(key, font) {
    this.varFontCache.put(key, font);
  }
}

FontCacheImpl.DEFAULT_FONT_CACHE_MAX_ENTRIES = 10; // kt L85 @VisibleForTesting 常量

/** InterpKey / VarFontKey 串化（data class 相等语义 → 模板串键）。
 *  InterpKey = start + end + frame（kt L51）：start/end 为 Font.equals（Font 未重写
 *  equals → 引用相等）→ 用 _id 实例序列号同构——同轴值异实例不得误命中。
 *  VarFontKey = sourceId + ttcIndex + sortedAxes（kt L54-59：axes.sortedBy { it.tag }）。
 *  kt 陷阱在录：VarFontKey 是 data class，sortedAxes: List<FontVariationAxis>
 *  的相等性为逐元素 equals（FontVariationAxis equals 语义 = tag + styleValue，
 *  非 Kotlin 默认引用相等——若按引用则二次命中恒 false 缓存失效）。故键必须含
 *  值：同 tag 异值不得误命中（缓存正确性），同帧量化同值位模式一致 → 串一致
 *  → 命中（反向回放同值序列命中，kt L146 注释「typically happens if the
 *  animation happens backward」语义） */
function interpKeyOf(start, end, frame) {
  return `i|${start._id}|${end._id}|${frame}`;
}

function varFontKeyOf(sourceId, ttcIndex, sortedAxes) {
  return `v|${sourceId}:${ttcIndex}|${sortedAxes.map((a) => `${a.tag}:${a.styleValue}`).join(',')}`;
}

/** FontInterpolator.kt L90-230 逐字移植 */
export class FontInterpolator {
  constructor(fontCache = new FontCacheImpl()) {
    this.fontCache = fontCache;
    // md3 映射：kt L165 Log.e cache MISS → 计数器（debug=true 时 console.warn）
    this.missCount = 0;
    this.debug = false;
  }

  /** kt L92-167 lerp：start/end 为 FontRecord，progress ∈ [0,1]，返回插值后 FontRecord */
  lerp(start, end, progress) {
    if (progress === 0) {
      return start; // kt L93-94
    } else if (progress === 1) {
      return end; // kt L95-96
    }

    const startAxes = start.axes || []; // kt L99 EMPTY_AXES 同义（JS 空数组）
    const endAxes = end.axes || [];

    if (startAxes.length === 0 && endAxes.length === 0) {
      return start; // kt L102-104
    }

    // kt L106-114：先查已知结果（同字体不同文本块重复绘制是常态）。
    // 帧量化 (progress * animationFrameCount).toInt()——同帧内重复调用命中缓存，
    // 这正是拖拽跟手热路径（rAF 每帧一次 lerp）的缓存价值所在
    const iKey = interpKeyOf(start, end, Math.trunc(progress * this.fontCache.animationFrameCount));
    const cached = this.fontCache.getInterp(iKey);
    if (cached) {
      if (this.debug) {
        console.warn(`[${progress}] Interp. cache hit for ${iKey}`); // kt L110-112 Log.d
      }
      return cached;
    }

    // kt L116-119 注释：通用轴插值 O(N log N)（来自轴排序）。轴数通常 ≤5，代价可忽略；
    // 若需支持更多轴，可预处理字体存排序轴并以 fvar 表默认值补缺——本层轴数恒 3~4，
    // 不做预处理
    const newAxes = lerpAxes(startAxes, endAxes, (tag, startValue, endValue) => {
      switch (tag) {
        case TAG_WGHT:
          return mathLerp(
            startValue !== null && startValue !== undefined ? startValue : FONT_WEIGHT_DEFAULT_VALUE,
            endValue !== null && endValue !== undefined ? endValue : FONT_WEIGHT_DEFAULT_VALUE,
            progress,
          );
        case TAG_ITAL:
          return adjustItalic(
            mathLerp(
              startValue !== null && startValue !== undefined ? startValue : FONT_ITALIC_DEFAULT_VALUE,
              endValue !== null && endValue !== undefined ? endValue : FONT_ITALIC_DEFAULT_VALUE,
              progress,
            ),
          );
        default: {
          // kt L137-143：require(startValue != null && endValue != null)——未知轴缺
          // 默认值不可插值，IllegalArgumentException 同语义 throw
          if (startValue === null || startValue === undefined ||
              endValue === null || endValue === undefined) {
            throw new Error(`Unable to interpolate due to unknown default axes value : ${tag}`);
          }
          return mathLerp(startValue, endValue, progress);
        }
      }
    });

    // kt L146-155：VarFontKey 缓存查（反向动画回放命中）
    const vKey = varFontKeyOf(start.sourceId, start.ttcIndex, newAxes);
    const vCached = this.fontCache.getVarFont(vKey);
    if (vCached) {
      this.fontCache.putInterp(iKey, vCached); // kt L150：回填一级缓存
      if (this.debug) {
        console.warn(`[${progress}] Axis cache hit for ${vKey}`);
      }
      return vCached;
    }

    // kt L157-166：首次构建（Font.Builder(start).setFontVariationSettings(newAxes)
    // .build()——基于 start 元数据 + 新轴值；无 IO 抛异常路径）→ 双缓存写入 + MISS 记账
    const newFont = makeFontRecord(newAxes, { sourceId: start.sourceId, ttcIndex: start.ttcIndex });
    this.fontCache.putInterp(iKey, newFont);
    this.fontCache.putVarFont(vKey, newFont);
    this.missCount += 1; // kt L165 Log.e 同语义（计数非刷屏，见头注映射）
    if (this.debug) {
      console.warn(`[${progress}] Cache MISS for ${iKey} / ${vKey}`);
    }
    return newFont;
  }

  /** kt L227-228 companion canInterpolate：ttcIndex 相同 && sourceIdentifier 相同 */
  static canInterpolate(start, end) {
    return start.ttcIndex === end.ttcIndex && start.sourceId === end.sourceId;
  }
}

/** kt L213-216 adjustItalic：ital 按 FONT_ITALIC_ANIMATION_STEP 步进量化——性能取舍：
 *  离散化帮助 Skia glyph cache 命中（逐帧重排字体不可取）。网页侧同构收益：
 *  font-variation-settings 串稳定 → 浏览器字形缓存命中 */
function adjustItalic(value) {
  return coerceInWithStep(value, FONT_ITALIC_MIN, FONT_ITALIC_MAX, FONT_ITALIC_ANIMATION_STEP);
}

/** kt L218-219 coerceInWithStep：(v.coerceIn(min,max)/step).toInt() * step */
function coerceInWithStep(v, min, max, step) {
  const clamped = Math.min(max, Math.max(min, v));
  return Math.trunc(clamped / step) * step;
}

/** kt L169-211 私有 lerp：双指针按 tag 归并。start/end 先按 tag 排序（kt L175-176
 *  sortBy——kotlin sortBy 原地稳定排序；JS toSorted 稳定拷贝排序，不改动入参——
 *  kt 注释 L174「Safe to modify result of Font#getAxes since it returns cloned
 *  object」的等价安全化：入参可能是消费端持有数组，本实现零副作用） */
function lerpAxes(start, end, filter) {
  const a = start.slice().sort((x, y) => (x.tag < y.tag ? -1 : x.tag > y.tag ? 1 : 0));
  const b = end.slice().sort((x, y) => (x.tag < y.tag ? -1 : x.tag > y.tag ? 1 : 0));

  const result = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    const tagA = i < a.length ? a[i].tag : null;
    const tagB = j < b.length ? b[j].tag : null;

    // kt L185-190 comp：tagA==null → 1（只剩 end）；tagB==null → -1（只剩 start）；
    // 否则 tagA.compareTo(tagB)
    const comp = tagA === null ? 1 : tagB === null ? -1 : tagA < tagB ? -1 : tagA > tagB ? 1 : 0;

    let axis;
    if (comp === 0) {
      // 两端同轴：filter(tag, startValue, endValue)（kt L194-197）
      const v = filter(tagA, a[i++].styleValue, b[j++].styleValue);
      axis = { tag: tagA, styleValue: v };
    } else if (comp < 0) {
      // 仅 start 有：end 传 null（kt L198-201）
      const v = filter(tagA, a[i++].styleValue, null);
      axis = { tag: tagA, styleValue: v };
    } else {
      // 仅 end 有：start 传 null（kt L202-205）
      const v = filter(tagB, null, b[j++].styleValue);
      axis = { tag: tagB, styleValue: v };
    }

    result.push(axis);
  }
  return result;
}
