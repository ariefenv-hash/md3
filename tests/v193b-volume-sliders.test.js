// ==================== v193b-volume-sliders.test.js — v9.26 浮动滑条多流体系（#193 缺口二期） ====================
//
// AOSP main 实证（快照 docs/reference/frameworks-base/systemui/volume-dialog/sliders/ 两件）：
//   1. VolumeDialogSlidersInteractor.kt L47-53：filter(shouldShowSliders) → sortedWith(StreamsSorter)
//      → LinkedHashSet → runningReduce{ new.apply{ addAll(prev) } }（新集合优先旧集合追加去重
//      =「滑条不消失」）→ VolumeDialogSlidersModel(slider=first(), floatingSliders=drop(1))
//   2. L86-104 shouldShowSliders：isActive 恒显 / ACCESSIBILITY 受 shouldShowA11ySlider 门控 /
//      DYNAMIC_STREAM_BROADCAST 恒显 / 其余仅 MUSIC 或 isDynamic / TV 恒 false
//   3. L106-117 toType：==99 AudioSharingStream / >=100 RemoteMediaStream / else Stream
//   4. L119-143 StreamsSorter 八级谓词：isActive > MUSIC > ACCESSIBILITY > RING > NOTIFICATION
//      > VOICE_CALL > SYSTEM > isDynamic；未命中 → stream 数值
//   5. AudioSystem.java L84-109：VOICE_CALL=0/SYSTEM=1/RING=2/MUSIC=3/NOTIFICATION=5/ACCESSIBILITY=10
//   6. VolumeDialogControllerImpl.java L114-115：DYNAMIC_STREAM_BROADCAST=99/REMOTE_START_INDEX=100
//
// 覆盖：A 快照在册 / B StreamsSorter 真跑 / C shouldShowSliders 真跑 / D buildSlidersModel 真跑 /
//       E media-service 注册表真跑 / F volume-dialog 接线 / G 版本真源 9.26.0

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

import {
  STREAM_MUSIC, STREAM_SYSTEM, STREAM_RING, STREAM_NOTIFICATION, STREAM_VOICE_CALL, STREAM_ACCESSIBILITY,
  DYNAMIC_STREAM_BROADCAST, DYNAMIC_STREAM_REMOTE_START_INDEX,
  StreamsSorter, toSliderType, shouldShowSliders, buildSlidersModel, makeStreamModel,
} from '../ios-desktop/js/aosp/volume-sliders.js';
import { mediaService } from '../ios-desktop/js/media-service.js';

describe('v9.26 · A. AOSP 快照在册（sliders 两件 + 常量真值）', () => {
  test('SlidersInteractor 快照关键锚（八级谓词/判据/模型拆分）', () => {
    const t = src('docs/reference/frameworks-base/systemui/volume-dialog/sliders/domain/interactor/VolumeDialogSlidersInteractor.kt');
    expect(t).toContain('floatingSliders = sliderTypes.drop(1),');
    expect(t).toContain('return streamModel.stream == DEFAULT_STREAM || streamModel.isDynamic');
    expect(t).toContain('{ it.isActive },');
    expect(t).toContain('private fun VolumeDialogStreamModel.getPriority(): Int');
  });

  test('流常量真值（AudioSystem L84-109 + VolumeDialogControllerImpl L114-115 blob 核验）', () => {
    expect(STREAM_VOICE_CALL).toBe(0);
    expect(STREAM_SYSTEM).toBe(1);
    expect(STREAM_RING).toBe(2);
    expect(STREAM_MUSIC).toBe(3);
    expect(STREAM_NOTIFICATION).toBe(5);
    expect(STREAM_ACCESSIBILITY).toBe(10);
    expect(DYNAMIC_STREAM_BROADCAST).toBe(99);
    expect(DYNAMIC_STREAM_REMOTE_START_INDEX).toBe(100);
  });
});

describe('v9.26 · B. StreamsSorter 八级谓词真跑（Interactor L119-143 同构）', () => {
  const m = (stream, o = {}) => makeStreamModel({ streamId: 'x', stream, ...o });

  test('isActive 最高优先（谓词 0）', () => {
    expect(StreamsSorter.getPriority(m(STREAM_MUSIC, { isActive: true }))).toBe(0);
  });

  test('非活跃流按 MUSIC(1) > ACCESSIBILITY(2) > RING(3) > NOTIFICATION(4) > VOICE_CALL(5) > SYSTEM(6) 排序', () => {
    expect(StreamsSorter.getPriority(m(STREAM_MUSIC))).toBe(1);
    expect(StreamsSorter.getPriority(m(STREAM_ACCESSIBILITY))).toBe(2);
    expect(StreamsSorter.getPriority(m(STREAM_RING))).toBe(3);
    expect(StreamsSorter.getPriority(m(STREAM_NOTIFICATION))).toBe(4);
    expect(StreamsSorter.getPriority(m(STREAM_VOICE_CALL))).toBe(5);
    expect(StreamsSorter.getPriority(m(STREAM_SYSTEM))).toBe(6);
  });

  test('isDynamic 谓词 7；双谓词命中取先（VOICE_CALL=5）；未命中 → stream 数值本身（Interactor L139-143）', () => {
    expect(StreamsSorter.getPriority(m(77, { isDynamic: true }))).toBe(7);      // 不命中前七谓词 → isDynamic=7
    expect(StreamsSorter.getPriority(m(STREAM_VOICE_CALL, { isDynamic: true }))).toBe(5);  // VOICE_CALL 谓词(5)先于 isDynamic(7)
    expect(StreamsSorter.getPriority(m(77))).toBe(77);        // 77 未命中任何谓词
  });

  test('sort 全序：活跃 SYSTEM 优先于非活跃 MUSIC；MUSIC 优先于 RING', () => {
    const sorted = StreamsSorter.sort([
      m(STREAM_RING), m(STREAM_MUSIC), m(STREAM_SYSTEM, { isActive: true }), m(100, { isDynamic: true }),
    ]);
    expect(sorted.map((x) => x.stream)).toEqual([STREAM_SYSTEM, STREAM_MUSIC, STREAM_RING, 100]);
  });
});

describe('v9.26 · C. shouldShowSliders 判据真跑（Interactor L86-104 同构）', () => {
  const m = (stream, o = {}) => makeStreamModel({ streamId: 'x', stream, ...o });

  test('isActive 恒显（含 TV 不可达分支前的第一判据）', () => {
    expect(shouldShowSliders(m(STREAM_SYSTEM, { isActive: true }))).toBe(true);
  });

  test('ACCESSIBILITY 受 shouldShowA11ySlider 门控', () => {
    expect(shouldShowSliders(m(STREAM_ACCESSIBILITY))).toBe(false);
    expect(shouldShowSliders(m(STREAM_ACCESSIBILITY), true)).toBe(true);
  });

  test('广播流恒显；MUSIC 恒显；isDynamic 恒显；其余（RING 等）不显', () => {
    expect(shouldShowSliders(m(DYNAMIC_STREAM_BROADCAST))).toBe(true);
    expect(shouldShowSliders(m(STREAM_MUSIC))).toBe(true);
    expect(shouldShowSliders(m(77, { isDynamic: true }))).toBe(true);
    expect(shouldShowSliders(m(STREAM_RING))).toBe(false);
    expect(shouldShowSliders(m(77))).toBe(false);
  });
});

describe('v9.26 · D. buildSlidersModel 真跑（Interactor L47-53 流水线同构）', () => {
  const m = (streamId, stream, o = {}) => makeStreamModel({ streamId, stream, ...o });

  test('slider = first()，floatingSliders = drop(1)（非 MUSIC 流经 isDynamic 满足显示判据）', () => {
    const { slider, floatingSliders } = buildSlidersModel([
      m('ring', STREAM_RING, { isDynamic: true }), m('music', STREAM_MUSIC), m('sys', STREAM_SYSTEM, { isDynamic: true }),
    ]);
    expect(slider).toBe('Stream:3');           // MUSIC 排第一
    expect(floatingSliders).toEqual(['Stream:2', 'Stream:1']);
  });

  test('toType 分段：广播 → AudioSharingStream:99；>=100 → RemoteMediaStream；else Stream', () => {
    expect(toSliderType(makeStreamModel({ streamId: 'a', stream: DYNAMIC_STREAM_BROADCAST }))).toBe('AudioSharingStream');
    expect(toSliderType(makeStreamModel({ streamId: 'b', stream: 100 }))).toBe('RemoteMediaStream');
    expect(toSliderType(makeStreamModel({ streamId: 'c', stream: STREAM_MUSIC }))).toBe('Stream');
  });

  test('runningReduce 保留语义：流停止活跃后已显示滑条保留（prevSliderTypes 追加去重）', () => {
    const active1 = m('music', STREAM_MUSIC, { isActive: true });
    const r1 = buildSlidersModel([active1]);
    expect(r1.sliderTypes).toEqual(['Stream:3']);
    // 第二次渲染：MUSIC 停止活跃 + 动态 RING 出现 → 旧 Stream:3 追加在后（不消失）
    const r2 = buildSlidersModel([m('ring', STREAM_RING, { isDynamic: true })], { prevSliderTypes: r1.sliderTypes });
    expect(r2.sliderTypes).toEqual(['Stream:2', 'Stream:3']);
  });

  test('LinkedHashSet 去重保序：重复类型不重复出现', () => {
    const r = buildSlidersModel(
      [m('music', STREAM_MUSIC)],
      { prevSliderTypes: ['Stream:3', 'Stream:2'] },
    );
    expect(r.sliderTypes).toEqual(['Stream:3', 'Stream:2']);
  });

  test('空集 → slider null', () => {
    const { slider, floatingSliders } = buildSlidersModel([]);
    expect(slider).toBeNull();
    expect(floatingSliders).toEqual([]);
  });
});

describe('v9.26 · E. media-service 流注册表真跑（happy-dom）', () => {
  test('E1 内置两流：host-radio(3, 非动态) + external-music(100, 动态)', () => {
    const models = mediaService.streamModels();
    const host = models.find((x) => x.streamId === 'host-radio');
    const ext = models.find((x) => x.streamId === 'external-music');
    expect(host.stream).toBe(STREAM_MUSIC);
    expect(host.isDynamic).toBe(false);
    expect(ext.stream).toBe(DYNAMIC_STREAM_REMOTE_START_INDEX);
    expect(ext.isDynamic).toBe(true);
    expect(host.isActive).toBe(false);          // 未发声 → 非活跃
  });

  test('E2 心跳 → isActive 3s 窗口内为真（markStreamActive）', () => {
    mediaService.markStreamActive('host-radio');
    expect(mediaService.streamModels().find((x) => x.streamId === 'host-radio').isActive).toBe(true);
  });

  test('E3 注册/注销幂等 + 未注册心跳无副作用', () => {
    const before = mediaService.streams.size;
    mediaService.registerAudioStream({ streamId: 'host-radio', stream: STREAM_MUSIC });   // 重复注册幂等
    expect(mediaService.streams.size).toBe(before);
    mediaService.markStreamActive('no-such-stream');            // 未注册 → 无副作用
    mediaService.unregisterAudioStream('no-such-stream');       // 未注册注销幂等
    expect(mediaService.streams.size).toBe(before);
  });

  test('E4 注册 → 注销闭环（临时流进出注册表）', () => {
    mediaService.registerAudioStream({ streamId: 'tmp-ui', stream: STREAM_SYSTEM, isDynamic: false });
    expect(mediaService.streams.has('tmp-ui')).toBe(true);
    mediaService.unregisterAudioStream('tmp-ui');
    expect(mediaService.streams.has('tmp-ui')).toBe(false);
  });
});

describe('v9.26 · F. volume-dialog.js 浮动滑条接线（静态断言）', () => {
  const vd = src('ios-desktop/js/volume-dialog.js');
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/pull-panels.css');

  test('buildSlidersModel 消费 + 主滑条 Stream:3 排除 + runningReduce 累积项', () => {
    expect(vd).toContain("from './aosp/volume-sliders.js'");
    expect(vd).toContain("buildSlidersModel(mediaService.streamModels(), { prevSliderTypes })");
    expect(vd).toContain("sliderTypes.filter((t) => t !== 'Stream:3')");
    expect(vd).toContain('prevSliderTypes = sliderTypes;');
  });

  test('远程段拖拽 → MEDIA_COMMAND 广播（iframe 音源宿主不可直接落值）', () => {
    expect(vd).toContain("mediaService.dispatchMediaCommand('volume', v)");
    expect(vd).toContain('el.setAttribute(\'aria-label\', FLOAT_LABELS[t] || \'音量\')');
  });

  test('DOM：vdFloatSliders 容器在对话框内', () => {
    expect(html).toContain('class="vd-float-col" id="vdFloatSliders"');
    expect(html).toContain('aria-label="其他音量流"');
  });

  test('CSS：左侧窄滑条列（top 错位避让警告层）+ 令牌系', () => {
    expect(css).toMatch(/\.vd-float-col \{[^]*?position: absolute;[^]*?right: calc\(100% \+ 8px\);[^]*?top: 8px;/s);
    expect(css).toMatch(/\.vdf-slider \{[^]*?width: 20px;[^]*?height: 140px;/s);
    expect(css).toMatch(/\.vdf-fill \{[^]*?background: var\(--md-primary\);/s);
  });
});

describe('v9.26 · G. 版本真源', () => {
  test('G1 package.json 9.26.0（v150 同口径）', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.version).toBe('10.87.0');
  });

  test('G2 README 当前版本 v9.28（version:sync 写入）', () => {
    expect(src('README.md')).toMatch(/v10\.87/);
  });
});
