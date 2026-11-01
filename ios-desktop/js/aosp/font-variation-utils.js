// ==================== aosp/font-variation-utils.js — 可变字体四轴管线（#186） ====================
//
// 权威源（aosp-mirror/platform_frameworks_base @ main 实拉，走 api.github.com contents
// 端点；快照 docs/reference/frameworks-base/systemui/animation/FontVariationUtils.kt，
// 60 行）：
//   packages/SystemUI/animation/src/com/android/systemui/animation/FontVariationUtils.kt
//   - L5-8    TAG_WGHT="wght" / TAG_WDTH="wdth" / TAG_OPSZ="opsz" / TAG_ROND="ROND"
//   - L10-16  字段 mWeight/mWidth/mOpticalSize/mRoundness 初值 -1 + isUpdated 标志
//   - L22-26  updateFontVariation(weight, width, opticalSize, roundness 各默认 -1)：
//             各轴 >=0 且 != 旧值 → isUpdated=true 并更新字段
//   - L39-51  生成串：轴序固定 wght→wdth→opsz→ROND；"'tag' value"（单引号轴名 +
//             空格 + 值）；已非空时 ", " 连接。生成判据用字段值（>=0）而非参数——
//             先设过的轴在后续调用（参数回 -1）仍保留生成
//   - L52     return if (isUpdated) resultString else ""：零变化返回空串
//             （kt 注释原文：used for key in typefaceCache in TextAnimator——
//             空串 = 字形无变化，调用方无需重排/换 cache key）
//
// md3 网页映射（诚实标注）：
//   - 生成串直接消费为 CSS font-variation-settings：AOSP FontVariationAxis
//     .fromFontVariationSettings 的 "'wght' 400, 'wdth' 100" 格式与 CSS 规范同构
//     （#186 第一节），无须转换
//   - ROND 轴：Google 专有轴，Roboto Flex 无（#190 第五节 STAT 表实证），按方案 A
//     不做近似；管线逐字保留 roundness 参数（生成串照写），浏览器对字体未注册轴
//     忽略（CSS Fonts 规范行为），视觉零副作用
//   - 消费端：lock-screen.js 锁屏时钟（applyClockVariation，wght/wdth/opsz 三轴）；
//     ClockSize 双档 DYNAMIC 语义属 #186 二期，不在本层
//   - #188 关联：--clock-digit-font 用户自定义字体与可变轴的关系在消费端裁决，
//     本文件只做纯函数层

export const TAG_WGHT = 'wght';
export const TAG_WDTH = 'wdth';
export const TAG_OPSZ = 'opsz';
export const TAG_ROND = 'ROND';

/** FontVariationUtils.kt L10-52 逐字移植：字段 -1=未设 + isUpdated 零变化空串语义 */
export class FontVariationUtils {
  constructor() {
    this.mWeight = -1;
    this.mWidth = -1;
    this.mOpticalSize = -1;
    this.mRoundness = -1;
    this.isUpdated = false;
  }

  /** kt L22-52 同构（kt 具名参数默认值 → JS 解构对象默认值，同为 -1）。
      注意生成判据读字段（>=0）而非参数，与 kt L39/L42/L45/L48 逐字一致 */
  updateFontVariation({ weight = -1, width = -1, opticalSize = -1, roundness = -1 } = {}) {
    this.isUpdated = false;
    if (weight >= 0 && this.mWeight !== weight) {
      this.isUpdated = true;
      this.mWeight = weight;
    }
    if (width >= 0 && this.mWidth !== width) {
      this.isUpdated = true;
      this.mWidth = width;
    }
    if (opticalSize >= 0 && this.mOpticalSize !== opticalSize) {
      this.isUpdated = true;
      this.mOpticalSize = opticalSize;
    }
    if (roundness >= 0 && this.mRoundness !== roundness) {
      this.isUpdated = true;
      this.mRoundness = roundness;
    }
    let resultString = '';
    if (this.mWeight >= 0) {
      resultString += `'${TAG_WGHT}' ${this.mWeight}`;
    }
    if (this.mWidth >= 0) {
      resultString += (resultString === '' ? '' : ', ') + `'${TAG_WDTH}' ${this.mWidth}`;
    }
    if (this.mOpticalSize >= 0) {
      resultString += (resultString === '' ? '' : ', ') + `'${TAG_OPSZ}' ${this.mOpticalSize}`;
    }
    if (this.mRoundness >= 0) {
      resultString += (resultString === '' ? '' : ', ') + `'${TAG_ROND}' ${this.mRoundness}`;
    }
    return this.isUpdated ? resultString : '';
  }
}
