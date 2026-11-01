// ==================== aosp/volume-sliders.js — 浮动滑条多流体系（#193 缺口二期） ====================
//
// 权威源（aosp-mirror/platform_frameworks_base @ main 实拉；快照 docs/reference/frameworks-base/
// systemui/volume-dialog/sliders/ 两件 + 源码行号锚）：
//   - VolumeDialogSlidersInteractor.kt（147 行快照）：
//       L47-53   sliders Flow：streamModels → filter(shouldShowSliders) → sortedWith(StreamsSorter)
//                → map(toType) → LinkedHashSet → runningReduce{ new.apply{ addAll(prev) } } →
//                VolumeDialogSlidersModel(slider = first(), floatingSliders = drop(1))
//                （runningReduce 语义 = 新集合优先、旧集合追加去重——「滑条不消失」：
//                 已显示的滑条在流停止活跃后仍保留，直到流本身从状态中移除）
//       L86-104  shouldShowSliders：isActive 恒显；非 TV 上 STREAM_ACCESSIBILITY 受
//                shouldShowA11ySlider 门控；DYNAMIC_STREAM_BROADCAST（音频共享广播）恒显；
//                否则仅 STREAM_MUSIC 或 isDynamic；TV 恒 false
//       L106-117 toType：DYNAMIC_STREAM_BROADCAST → AudioSharingStream；
//                stream >= DYNAMIC_STREAM_REMOTE_START_INDEX → RemoteMediaStream；else Stream
//       L119-143 StreamsSorter：priorityPredicates 八级
//                isActive > MUSIC > ACCESSIBILITY > RING > NOTIFICATION > VOICE_CALL > SYSTEM
//                > isDynamic；未命中谓词 → stream 数值本身作为优先级
//   - AudioSystem.java L84-109（blob 实拉核验）：STREAM_VOICE_CALL=0 / STREAM_SYSTEM=1 /
//     STREAM_RING=2 / STREAM_MUSIC=3 / STREAM_NOTIFICATION=5 / STREAM_ACCESSIBILITY=10
//   - VolumeDialogControllerImpl.java L114-115（blob 实拉核验）：
//     DYNAMIC_STREAM_BROADCAST=99 / DYNAMIC_STREAM_REMOTE_START_INDEX=100
//
// md3 网页映射（#193 建议口径，诚实标注）：
//   - md3 无 AudioSystem 多流硬件，映射为「发声源注册表」：宿主电台/音乐应用覆盖层/UI 提示音
//     等每个可发声源注册为一条流记录 { streamId, kind, isActive }；isActive 由 media-service
//     近 3s 发声窗口判定（对应 AOSP isActive 流状态位）
//   - packageManager.isTv() 在 md3 桌面语境恒 false（非 TV 设备分支生效，诚实标注语境恒真）
//   - 铃声抽屉（既有 42dp 三钮）保持独立控件位（RING 流对应物），不并入浮动滑条排序
//
// 纯逻辑模块：零 DOM、零 mediaService 依赖。

/** AudioSystem.java L84-109 流常量（blob 实拉核验） */
export const STREAM_VOICE_CALL = 0;
export const STREAM_SYSTEM = 1;
export const STREAM_RING = 2;
export const STREAM_MUSIC = 3;
export const STREAM_NOTIFICATION = 5;
export const STREAM_ACCESSIBILITY = 10;

/** VolumeDialogControllerImpl.java L114-115（blob 实拉核验） */
export const DYNAMIC_STREAM_BROADCAST = 99;
export const DYNAMIC_STREAM_REMOTE_START_INDEX = 100;

/** VolumeDialogSlidersInteractor.kt L119-143 StreamsSorter 逐字同构：
    八级优先谓词，未命中 → stream 数值本身。 */
export class StreamsSorter {
  /** priorityPredicates 顺序表（Interactor L124-133 注释：谓词满足者排前） */
  static priorityPredicates(streamModel) {
    return [
      (m) => m.isActive,
      (m) => m.stream === STREAM_MUSIC,
      (m) => m.stream === STREAM_ACCESSIBILITY,
      (m) => m.stream === STREAM_RING,
      (m) => m.stream === STREAM_NOTIFICATION,
      (m) => m.stream === STREAM_VOICE_CALL,
      (m) => m.stream === STREAM_SYSTEM,
      (m) => m.isDynamic,
    ];
  }

  /** getPriority（Interactor L139-143 同构） */
  static getPriority(streamModel) {
    const index = StreamsSorter.priorityPredicates(streamModel).findIndex((p) => p(streamModel));
    return index >= 0 ? index : streamModel.stream;
  }

  compare(lhs, rhs) {
    return StreamsSorter.getPriority(lhs) - StreamsSorter.getPriority(rhs);
  }

  /** Array.prototype.sort 比较器形态（sortedWith(streamsSorter) 同义） */
  static sort(streamModels) {
    return [...streamModels].sort((a, b) => StreamsSorter.getPriority(a) - StreamsSorter.getPriority(b));
  }
}

/** VolumeDialogSlidersInteractor.kt L106-117 toType 逐字同构：
    广播流 → AudioSharingStream；远程媒体段 → RemoteMediaStream；其余 → Stream。 */
export function toSliderType(streamModel) {
  if (streamModel.stream === DYNAMIC_STREAM_BROADCAST) return 'AudioSharingStream';
  if (streamModel.stream >= DYNAMIC_STREAM_REMOTE_START_INDEX) return 'RemoteMediaStream';
  return 'Stream';
}

/** VolumeDialogSlidersInteractor.kt L86-104 shouldShowSliders 逐字同构
    （isTv() 在 md3 桌面语境恒 false → 非 TV 分支生效，参数保留语境标注）：
    isActive 恒显；ACCESSIBILITY 受 shouldShowA11ySlider 门控；广播流恒显；
    其余仅 MUSIC 或 isDynamic。 */
export function shouldShowSliders(streamModel, shouldShowA11ySlider = false) {
  if (streamModel.isActive) return true;
  if (streamModel.stream === STREAM_ACCESSIBILITY) return shouldShowA11ySlider;
  if (streamModel.stream === DYNAMIC_STREAM_BROADCAST) return true;
  return streamModel.stream === STREAM_MUSIC || !!streamModel.isDynamic;
}

/** VolumeDialogSlidersInteractor.kt L47-53 流水线同构：
    filter → sort → map(toType) → LinkedHashSet（去重保序）→
    runningReduce{ new.apply{ addAll(prev) } } → { slider, floatingSliders }。
    @param prevSliderTypes 上一次渲染的 sliderTypes（runningReduce 累积项；
           已显示滑条在流停止活跃后保留——AOSP「滑条不消失」语义） */
export function buildSlidersModel(streamModels, { shouldShowA11ySlider = false, prevSliderTypes = [] } = {}) {
  const shown = streamModels.filter((m) => shouldShowSliders(m, shouldShowA11ySlider));
  const current = StreamsSorter.sort(shown).map((m) => `${toSliderType(m)}:${m.stream}`);
  // LinkedHashSet 去重保序：新集合在前，旧集合追加（runningReduce L50-52 同构）
  const merged = [...new Set([...current, ...prevSliderTypes])];
  const slider = merged[0] || null;
  const floatingSliders = merged.slice(1);
  return { slider, floatingSliders, sliderTypes: merged };
}

/** md3 侧流记录工厂：{ streamId, kind, stream, isActive, isDynamic } 形态对齐
    VolumeDialogStreamModel 判据所需字段（streamId 为 md3 扩展键，AOSP 以 stream 数值为键）。 */
export const makeStreamModel = ({ streamId, stream, isActive = false, isDynamic = false }) => ({
  streamId,
  stream,
  isActive,
  isDynamic,
});
