// ==================== v193-volume-safety.test.js — v9.26 安全音量警告（#193 缺口一） ====================
//
// AOSP main 实证链（快照 docs/reference/frameworks-base/systemui/volume-dialog/ 五件）：
//   1. SoundDoseHelper.java L113-114：SAFE_MEDIA_VOLUME_INACTIVE=2(confirmed)/ACTIVE=3(unconfirmed)
//   2. SoundDoseHelper L666-671 checkSafeMediaVolume_l + L672-686 willDisplayWarningAfterCheckVolume：
//      越线 → postDisplaySafeVolumeWarning(flags) + mPendingVolumeCommand 暂存（L168-172 注释实锤）
//   3. AudioService L3985-4003：ADJUST_RAISE 越线时 else-if 短路，adjustIndex 不执行 →
//      音量保持 oldIndex（不预落值、不 clamp 到安全线——修正 #193「停在 60%」建议口径）
//   4. AudioService L5145-5152：set 路径同判，onSetStreamVolume 不执行
//   5. SoundDoseHelper L682-705 disableSafeMediaVolume：确认 → 状态转 INACTIVE + 放行 pending
//   6. SoundDoseHelper L796-801 invalidatePendingVolumeCommand：取消 → 仅清 pending
//   7. VolumeDialogSafetyWarningInteractor.kt L30-45：VISIBLE_FLAGS 判定 + 对话框可见降级 +
//      onSafetyWarningDismissed；L32 VISIBLE_FLAGS = FLAG_SHOW_UI or FLAG_SHOW_UI_WARNINGS
//   8. AudioManager.java L535/L614：FLAG_SHOW_UI = 1<<0；FLAG_SHOW_UI_WARNINGS = 1<<10
//
// 覆盖：A 快照在册 / B 常量真值 / C 显示判定真跑 / D 状态机真跑 / E volume-dialog.js 接线 /
//       F happy-dom 行为真跑 / G DOM+CSS / H docs README / I 版本真源 9.26.0

import { describe, test, expect, beforeEach, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

import {
  FLAG_SHOW_UI,
  FLAG_SHOW_UI_WARNINGS,
  VISIBLE_FLAGS,
  SAFE_MEDIA_VOLUME_INACTIVE,
  SAFE_MEDIA_VOLUME_ACTIVE,
  SAFE_VOLUME_INDEX,
  safetyWarningInvisible,
  safetyWarningVisible,
  isShowingSafetyWarning,
  SafeVolumeState,
} from '../ios-desktop/js/aosp/volume-safety-warning.js';

describe('v9.26 · A. AOSP 快照在册（volume-dialog 五件）', () => {
  test('SoundDoseHelper.java 1378 行全量快照 + 状态机关键行在文', () => {
    const t = src('docs/reference/frameworks-base/systemui/volume-dialog/SoundDoseHelper.java');
    expect(t).toContain('SAFE_MEDIA_VOLUME_INACTIVE = 2;  // confirmed');
    expect(t).toContain('SAFE_MEDIA_VOLUME_ACTIVE = 3;  // unconfirmed');
    expect(t).toContain('mPendingVolumeCommand = new StreamVolumeCommand(');
    expect(t).toContain('used later when/if disableSafeMediaVolume() is called');
    expect(t).toContain('invalidatePendingVolumeCommand');
  });

  test('Interactor + Model 快照逐字锚（VISIBLE_FLAGS / Visible(flags) / Invisible）', () => {
    const inter = src('docs/reference/frameworks-base/systemui/volume-dialog/domain/interactor/VolumeDialogSafetyWarningInteractor.kt');
    expect(inter).toContain('private const val VISIBLE_FLAGS = AudioManager.FLAG_SHOW_UI or AudioManager.FLAG_SHOW_UI_WARNINGS');
    expect(inter).toContain('is VolumeDialogSafetyWarningModel.Invisible -> false');
    expect(inter).toContain('fun onSafetyWarningDismissed()');
    const model = src('docs/reference/frameworks-base/systemui/volume-dialog/shared/model/VolumeDialogSafetyWarningModel.kt');
    expect(model).toContain('data class Visible(val flags: Int)');
    expect(model).toContain('data object Invisible');
  });

  test('二期供料两件在册（SlidersInteractor priorityPredicates / ViewModel floatingSlider）', () => {
    const sl = src('docs/reference/frameworks-base/systemui/volume-dialog/sliders/domain/interactor/VolumeDialogSlidersInteractor.kt');
    expect(sl).toContain('{ it.isActive },');
    expect(sl).toContain('{ it.stream == AudioManager.STREAM_MUSIC },');
    expect(sl).toContain('floatingSliders = sliderTypes.drop(1),');
    const vm = src('docs/reference/frameworks-base/systemui/volume-dialog/sliders/ui/viewmodel/VolumeDialogSlidersViewModel.kt');
    expect(vm).toContain('floatingSliderComponent');
  });
});

describe('v9.26 · B. 常量真值（AudioManager L535/L614 blob 实拉核验）', () => {
  test('FLAG_SHOW_UI = 1<<0 / FLAG_SHOW_UI_WARNINGS = 1<<10 / VISIBLE_FLAGS 并集', () => {
    expect(FLAG_SHOW_UI).toBe(1);
    expect(FLAG_SHOW_UI_WARNINGS).toBe(1024);
    expect(VISIBLE_FLAGS).toBe(1025);
  });

  test('SafeVolume 状态常量（SoundDoseHelper L113-114）+ 安全线 60（#193 口径）', () => {
    expect(SAFE_MEDIA_VOLUME_INACTIVE).toBe(2);
    expect(SAFE_MEDIA_VOLUME_ACTIVE).toBe(3);
    expect(SAFE_VOLUME_INDEX).toBe(60);
  });
});

describe('v9.26 · C. isShowingSafetyWarning 真跑（Interactor L30-45 逐字同构）', () => {
  test('Invisible → false', () => {
    expect(isShowingSafetyWarning(safetyWarningInvisible(), true)).toBe(false);
    expect(isShowingSafetyWarning(safetyWarningInvisible(), false)).toBe(false);
  });

  test('Visible 含 SHOW_UI flags → 恒显（独立于对话框可见性）', () => {
    expect(isShowingSafetyWarning(safetyWarningVisible(VISIBLE_FLAGS), false)).toBe(true);
    expect(isShowingSafetyWarning(safetyWarningVisible(VISIBLE_FLAGS), true)).toBe(true);
  });

  test('Visible 不含 VISIBLE_FLAGS → 降级为「对话框可见才显示」（Interactor L33-36：flags and VISIBLE_FLAGS == 0）', () => {
    expect(isShowingSafetyWarning(safetyWarningVisible(0), false)).toBe(false);
    expect(isShowingSafetyWarning(safetyWarningVisible(0), true)).toBe(true);
    // FLAG_SHOW_UI_WARNINGS 单独传入时含于 VISIBLE_FLAGS（1024 & 1025 ≠ 0）→ 恒显不降级
    expect(isShowingSafetyWarning(safetyWarningVisible(FLAG_SHOW_UI_WARNINGS), false)).toBe(true);
  });
});

describe('v9.26 · D. SafeVolumeState 状态机真跑（SoundDoseHelper 同构）', () => {
  let sm;
  beforeEach(() => { sm = new SafeVolumeState(60); });

  test('初态 ACTIVE + safeIndex 暂存（L116/L174 同构）', () => {
    expect(sm.safeMediaVolumeState).toBe(SAFE_MEDIA_VOLUME_ACTIVE);
    expect(sm.safeMediaVolumeIndex).toBe(60);
    expect(sm.pendingVolumeCommand).toBeNull();
  });

  test('低于/等于安全线 → checkSafeMediaVolume false → 正常落值', () => {
    expect(sm.checkSafeMediaVolume(60)).toBe(false);
    expect(sm.willDisplayWarningAfterCheckVolume(60, 1025)).toBe(false);
    expect(sm.pendingVolumeCommand).toBeNull();
  });

  test('越线 → willDisplay true + pending 暂存（不落值由调用方短路）', () => {
    expect(sm.willDisplayWarningAfterCheckVolume(65, 1025)).toBe(true);
    expect(sm.pendingVolumeCommand).toEqual({ index: 65, flags: 1025 });
  });

  test('取消 → invalidatePendingVolumeCommand 仅清 pending（L796-801）', () => {
    sm.willDisplayWarningAfterCheckVolume(65, 1025);
    sm.invalidatePendingVolumeCommand();
    expect(sm.pendingVolumeCommand).toBeNull();
    expect(sm.safeMediaVolumeState).toBe(SAFE_MEDIA_VOLUME_ACTIVE);   // 状态不动
  });

  test('确认 → disableSafeMediaVolume 返回 pending 并清空 + 状态转 INACTIVE（L682-705）', () => {
    sm.willDisplayWarningAfterCheckVolume(72, 1025);
    const cmd = sm.disableSafeMediaVolume();
    expect(cmd).toEqual({ index: 72, flags: 1025 });
    expect(sm.pendingVolumeCommand).toBeNull();
    expect(sm.safeMediaVolumeState).toBe(SAFE_MEDIA_VOLUME_INACTIVE);
  });

  test('INACTIVE（confirmed）后越线判据不再成立 → 直通', () => {
    sm.disableSafeMediaVolume();
    expect(sm.checkSafeMediaVolume(90)).toBe(false);
    expect(sm.willDisplayWarningAfterCheckVolume(90, 1025)).toBe(false);
  });

  test('新请求覆盖旧暂存（AudioService L3916 adjust 入口 invalidate 同构）', () => {
    sm.willDisplayWarningAfterCheckVolume(65, 1025);
    sm.willDisplayWarningAfterCheckVolume(80, 1025);
    expect(sm.pendingVolumeCommand).toEqual({ index: 80, flags: 1025 });
  });
});

describe('v9.26 · E. volume-dialog.js 接线（静态断言）', () => {
  const vd = src('ios-desktop/js/volume-dialog.js');
  const asm = src('ios-desktop/js/aosp/volume-safety-warning.js');

  test('三落值入口全部经 requestVolume 守门（音量键/拖拽/静音直通标注）', () => {
    expect(vd).toContain('const stepVolume = (delta) => {\n  requestVolume(currentVolume + delta);');
    expect(vd).toContain('requestVolume(value);');
    expect(vd).toMatch(/静音目标 0 恒不越线[\s\S]*?applyVolume\(currentVolume === 0 \? volumeBeforeMute : 0\)/);
    expect(vd.match(/requestVolume\(/g).length).toBe(2);   // stepVolume + applyValue 两入口
  });

  test('越线不预落值（保持原值）+ Visible(flags) + 取消/确认接线', () => {
    expect(vd).toContain('if (safeVolume.willDisplayWarningAfterCheckVolume(target, flags)) {');
    expect(vd).toContain('safetyModel = safetyWarningVisible(flags);');
    expect(vd).toContain('return;                                   // 越线不预落值，保持原值');
    expect(vd).toContain('const cmd = safeVolume.disableSafeMediaVolume();');
    expect(vd).toContain('if (cmd) applyVolume(cmd.index);');
    expect(vd).toContain('safeVolume.invalidatePendingVolumeCommand();');
  });

  test('sessionStorage 会话记忆（#193 口径：重载重置，比 AOSP 持久化保守）', () => {
    expect(vd).toContain("const SAFETY_CONFIRMED_KEY = 'vd.safety.confirmed';");
    expect(vd).toContain("sessionStorage.setItem(SAFETY_CONFIRMED_KEY, '1')");
    expect(vd).toContain("sessionStorage.getItem(SAFETY_CONFIRMED_KEY) === '1'");
  });

  test('警告可见期间 3s 收起冻结（scheduleHide 守卫）+ aria 同步', () => {
    expect(vd).toMatch(/const scheduleHide = \(\) => \{\s*\n\s*if \(safetyEl && isShowingSafetyWarning\(safetyModel, isVisible\(\)\)\) return;/);
    expect(vd).toContain("safetyEl.setAttribute('aria-hidden', String(!showWarning))");
    expect(vd).toContain('safetyEl.hidden = !showWarning;');
  });

  test('纯逻辑下沉 aosp 模块（零 DOM；volume-dialog 消费 imports）', () => {
    expect(asm).not.toMatch(/document\.|window\./);
    expect(asm).toContain('export function isShowingSafetyWarning');
    expect(asm).toContain('export class SafeVolumeState');
    expect(vd).toContain("from './aosp/volume-safety-warning.js'");
  });

  test('__testHooks 测试导出（生产路径零消费）', () => {
    expect(vd).toContain('export const __testHooks = () => ({');
    expect(vd.match(/__testHooks/g).length).toBe(1);
  });
});

describe('v9.26 · F. happy-dom 行为真跑（守门→拦截→确认/取消全链）', () => {
  let hooks;
  beforeAll(async () => {
    const m = await import('../ios-desktop/js/volume-dialog.js');
    hooks = m.__testHooks();
  });
  beforeEach(() => {
    try { sessionStorage.removeItem('vd.safety.confirmed'); } catch { /* noop */ }
    hooks.safeVolume.safeMediaVolumeState = 3;      // ACTIVE（unconfirmed 复位）
    hooks.safeVolume.invalidatePendingVolumeCommand();
  });

  test('F1 低于安全线直通落值（55 → applyVolume）', () => {
    hooks.requestVolume(55);
    expect(hooks.currentVolume).toBe(55);
    expect(hooks.getSafetyModel().kind).toBe('Invisible');
  });

  test('F2 越线拦截：不预落值（保持原值）+ Visible 模型 + pending 暂存', () => {
    hooks.requestVolume(55);
    hooks.requestVolume(80);
    expect(hooks.currentVolume).toBe(55);                            // 保持原值（源码实证）
    expect(hooks.getSafetyModel()).toEqual({ kind: 'Visible', flags: 1025 });
    expect(hooks.safeVolume.pendingVolumeCommand).toEqual({ index: 80, flags: 1025 });
  });

  test('F3 取消：丢弃 pending + 回 Invisible + 音量保持原值', () => {
    hooks.requestVolume(55);
    hooks.requestVolume(80);
    hooks.dismissSafety();
    expect(hooks.getSafetyModel().kind).toBe('Invisible');
    expect(hooks.safeVolume.pendingVolumeCommand).toBeNull();
    expect(hooks.currentVolume).toBe(55);
  });

  test('F4 确认：放行 pending 到目标值 + 状态 INACTIVE + sessionStorage 记忆', () => {
    hooks.requestVolume(55);
    hooks.requestVolume(80);
    hooks.confirmSafety();
    expect(hooks.currentVolume).toBe(80);
    expect(hooks.getSafetyModel().kind).toBe('Invisible');
    expect(hooks.safeVolume.safeMediaVolumeState).toBe(2);
    expect(sessionStorage.getItem('vd.safety.confirmed')).toBe('1');
  });

  test('F5 确认后同会话再越线直通（sessionStorage 记忆生效）', () => {
    hooks.requestVolume(55);
    hooks.requestVolume(80);
    hooks.confirmSafety();
    hooks.requestVolume(95);
    expect(hooks.currentVolume).toBe(95);
    expect(hooks.getSafetyModel().kind).toBe('Invisible');
  });

  test('F6 新请求覆盖旧暂存（adjust 入口 invalidate 同构）', () => {
    hooks.requestVolume(55);
    hooks.requestVolume(70);
    hooks.requestVolume(90);
    expect(hooks.safeVolume.pendingVolumeCommand).toEqual({ index: 90, flags: 1025 });
  });
});

describe('v9.26 · G. DOM + CSS（警告层映射）', () => {
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/pull-panels.css');

  test('index.html：vdSafety alertdialog（标题/文案/取消/确认 data-safety 双钮）', () => {
    expect(html).toContain('class="vd-safety" id="vdSafety" role="alertdialog"');
    expect(html).toContain('aria-label="安全音量警告"');
    expect(html).toContain('调高至安全水平以上？');
    expect(html).toContain('长时间大音量可能损伤听力。');
    expect(html).toContain('data-safety="dismiss"');
    expect(html).toContain('data-safety="confirm"');
    expect(html).toMatch(/id="vdSafety"[^]*?hidden/);
  });

  test('CSS：对话框左侧 8dp 间距绝对定位（不挤占 flex 纵列）+ M3 28dp 圆角 + 令牌系', () => {
    expect(css).toMatch(/\.vd-safety \{[^]*?position: absolute;[^]*?right: calc\(100% \+ 8px\);[^]*?border-radius: 28px;/s);
    expect(css).toMatch(/\.vd-safety \{[^]*?background: var\(--md-surface-container-high\);/s);
    expect(css).toContain('.vd-safety[hidden] { display: none; }');
    expect(css).toMatch(/\.vd-safety-icon \{[^]*?background: var\(--md-primary-container\);/s);
    expect(css).toMatch(/\.vd-safety-btn\.fill \{ background: var\(--md-primary\); color: var\(--md-on-primary\); \}/);
  });
});

describe('v9.26 · H. docs README 权威链锚', () => {
  test('触发→放行→丢弃 七点链 + md3 映射决策表在册', () => {
    const t = src('docs/reference/frameworks-base/systemui/volume-dialog/README.md');
    expect(t).toContain('checkSafeMediaVolume_l`（SoundDoseHelper L666-671）');
    expect(t).toContain('willDisplayWarningAfterCheckVolume`（L672-686）');
    expect(t).toContain('disableSafeMediaVolume`（L682-705）');
    expect(t).toContain('invalidatePendingVolumeCommand`（L796-801）');
    expect(t).toContain('FLAG_SHOW_UI = 1 << 0`（L535）');
    expect(t).toContain('FLAG_SHOW_UI_WARNINGS = 1 << 10`（L614');
    expect(t).toContain('修正 #193 建议口径');
  });
});

describe('v9.26 · I. 版本真源', () => {
  test('I1 package.json 9.26.0（v150 同口径）', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.version).toBe('9.30.0');
  });

  test('I2 README 当前版本 v9.28（version:sync 写入）', () => {
    expect(src('README.md')).toMatch(/v9\.30/);
  });
});
