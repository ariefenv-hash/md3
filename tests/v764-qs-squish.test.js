// ==================== v764-qs-squish.test.js — v7.82 演进：两态 spring 体系（AOSP 源码重做版） ====================
//
// 动画体系演进史：
//   v7.64 磁贴本体 squash & stretch → v7.65 移除（溢出截断根因）
//   v7.79 图标底座 morph（blob keyframes 320/260ms）
//   v7.82 AOSP android17-release（94b4c163）源码重做：
//     · Tile.kt tileRadius：50dp（未激活）↔ 24dp（激活），animateDpAsState 默认
//       spring(DampingRatioNoBouncy=1.0, StiffnessMediumLow=400) —— 临界阻尼无过冲，
//       视频 blob 过冲结论废弃；CSS 以 320ms cubic-bezier(0.2,0,0,1)（该弹簧归一化形）表达
//     · 图标底座 CommonTile.kt ToggleTargetSize=56dp，clip 50(圆)↔ActiveIconCornerRadius=16dp
//     · 面板拖拽磁贴高度 squish：verticalSquish 布局缩放，公式 (0.1+expansion×0.9) ∈ [0.1,1]
//     · playTileMorph/QS_MORPH_MS/_morphPending 随 blob keyframes 一并移除 ——
//       状态切换只需 .active 类，动画完全由 CSS transition 承担
//
// 覆盖：
//   A. 源码锚定 —— quick-settings.js 置位链路 + pull-panels.css 两态令牌/滑条几何/squish
//   B. 场景运行时（bootDesktop 真实引导）—— 点击翻转 .active、无 morph 类残留、
//      动作型磁贴（lock_screen/internet/bluetooth）不翻转

import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

// ---------- A. 源码锚定 ----------
describe('v7.82 · 两态 spring 体系源码锚定（quick-settings.js）', () => {
  const js = src('ios-desktop/js/quick-settings.js');

  test('旧 morph 体系全部移除：playTileMorph / QS_MORPH_MS / _morphPending', () => {
    expect(js).not.toContain('playTileMorph');
    expect(js).not.toContain('QS_MORPH_MS');
    expect(js).not.toContain('_morphPending');
    expect(js).not.toContain('morph-on');
    expect(js).not.toContain('morph-off');
  });

  test('状态切换 = .active 类驱动（CSS spring transition 承担，无 JS 侧形变补播）', () => {
    expect(js).toContain("// v7.82：状态切换动画 = CSS spring transition（.active 类驱动），无 JS 侧补播");
    expect(js).toContain('pill.classList.toggle(\'active\', tileActive);');
  });
});

describe('v7.82 · 两态 spring 体系源码锚定（pull-panels.css）', () => {
  const css = src('ios-desktop/css/pull-panels.css');

  test('两态圆角令牌：OFF 32px（50dp 在 64px 高封顶=全胶囊）↔ ON 24px（源码绝对值）', () => {
    expect(css).toContain('--tile-r-off: 50px;');
    expect(css).toContain('--tile-r-on: 24px;');
    expect(css).not.toContain('--tile-r-mid');
    expect(css).toContain('border-radius: var(--tile-r-off);');
    expect(css).toContain('.qs-tile-pill.active {\n  border-radius: var(--tile-r-on);');
  });

  test('blob keyframes 全部移除（源码 spring 单调无过冲）', () => {
    expect(css).not.toContain('@keyframes qs-icon-morph-on');
    expect(css).not.toContain('@keyframes qs-icon-morph-off');
    expect(css).not.toContain('@keyframes qs-body-morph-on');
    expect(css).not.toContain('@keyframes qs-body-morph-off');
    expect(css).not.toContain('cubic-bezier(0.34, 1.32, 0.64, 1)');
  });

  test('状态切换动画 = 320ms cubic-bezier(0.2,0,0,1)（spring(1.0,400) 归一化形，1% 落定≈332ms）', () => {
    expect(css).toMatch(/\.qs-tile-pill \{[^]*?transition:[^]*?background-color 0\.32s cubic-bezier\(0\.2, 0, 0, 1\),[^]*?border-radius 0\.32s cubic-bezier\(0\.2, 0, 0, 1\)[^]*?\}/);
  });

  test('图标底座源码几何：ToggleTargetSize 56dp / glyph 32dp / 激活方圆角 16dp', () => {
    expect(css).toContain('.qs-tile-icon-wrap {\n  width: 56px;\n  height: 56px;\n  border-radius: 50%;');
    expect(css).toContain('.qs-tile-icon-wrap svg {\n  width: 32px;\n  height: 32px;\n}');
    expect(css).toContain('.qs-tile-pill.active[data-tile-id="bluetooth"] > .qs-tile-icon-wrap,\n.qs-tile-pill.active[data-tile-id="modes"] > .qs-tile-icon-wrap {\n  border-radius: 16px;');
  });

  test('面板拖拽磁贴高度 squish：height = calc(64px × var(--qs-squish, 1))，平板 96px 同构', () => {
    expect(css).toContain('height: calc(72px * var(--qs-squish, 1));');
  });

  test('按压反馈保留：磁贴轻收缩 scale(0.985) + 图标底座灰盘（视频实锤项，源码为触感 reveal+震动）', () => {
    expect(css).toContain('.qs-tile-pill:active {\n  transform: scale(0.985);\n}');
    expect(css).toContain('.qs-tile-pill:active .qs-tile-icon-wrap {\n  background: rgba(128, 128, 128, 0.28) !important;\n}');
  });

  test('滑条源码几何（v7.87 AOSP 1:1 重植；v7.88 音量迁入对话框）：PlatformSlider 64dp 胶囊 / 竖置音量 52×254 / 无按压加粗', () => {
    expect(css).toContain('.qs-brightness {\n  position: relative;\n  height: 64px;\n  border-radius: 32px;');
    expect(css).toContain('width: calc(64px + (100% - 64px) * (var(--v, 80) / 100));');
    expect(css).toContain('width: 52px;            /* volume_dialog_slider_width */');
    expect(css).toContain('height: 254px;          /* volume_dialog_slider_height */');
    expect(css).toContain('.vd-icon svg { width: 24px; height: 24px; }');
    expect(css).not.toContain('.qs-slider-bar.is-dragging .qs-slider-handle');
    expect(css).not.toContain('height: 62px');
  });
});

// ---------- B. 场景运行时（真实引导） ----------
// 求值顺序守卫（与 scenario-persistence 同策略）：apps-data ← apps/* → quick-settings 构成
// 依赖环，state.js 必须先完成求值。
import '../ios-desktop/js/state.js';

describe('v7.82 · 两态 spring 场景运行时（bootDesktop + 真实点击）', () => {
  let sleep;
  let qsSquishFromExpansion;

  beforeEach(async () => {
    const helpers = await import('./scenario-helpers.js');
    sleep = helpers.sleep;
    if (!document.body.dataset.__v764Booted) {
      document.body.innerHTML = helpers.buildShellHTML();
      helpers.setScreenSize();
      helpers.installCanvasStub();
      helpers.installFetchStub();
      document.body.dataset.__v764Booted = '1';
      await import('../ios-desktop/js/main.js');
    }
    const pdg = await import('../ios-desktop/js/pull-down-gesture.js');
    qsSquishFromExpansion = pdg.qsSquishFromExpansion;
  });

  test('squish 纯函数（源码 constrainSquishiness 逐字对齐）：0→0.1 / 1→1 / 0.5→0.55 / 过拉钳 1 / NaN→1', () => {
    expect(typeof qsSquishFromExpansion).toBe('function');
    expect(qsSquishFromExpansion(0)).toBeCloseTo(0.1);
    expect(qsSquishFromExpansion(1)).toBeCloseTo(1);
    expect(qsSquishFromExpansion(0.5)).toBeCloseTo(0.55);
    expect(qsSquishFromExpansion(1.4)).toBeCloseTo(1);   // 橡皮筋过拉钳回
    expect(qsSquishFromExpansion(-0.2)).toBeCloseTo(0.1); // 负进度钳下限
    expect(qsSquishFromExpansion(NaN)).toBe(1);
  });

  test('真实点击 Torch（初始关）→ 翻转 .active 开启；再点关闭 —— 全程无 morph 类残留', async () => {
    const container = document.getElementById('qsTilesContainer');
    expect(container).toBeTruthy();
    const pill = container.querySelector('.qs-tile-pill[data-tile-id="torch"]');
    expect(pill).toBeTruthy();
    expect(pill.classList.contains('active')).toBe(false);

    pill.click();
    expect(pill.classList.contains('active')).toBe(true);
    expect(pill.classList.contains('morph-on')).toBe(false);
    expect(pill.classList.contains('morph-off')).toBe(false);

    pill.click(); // 关闭
    expect(pill.classList.contains('active')).toBe(false);
    expect(pill.classList.contains('morph-off')).toBe(false);
  });

  test('动作型/面板型磁贴不翻转：lock_screen / internet / bluetooth 点击前后 .active 保持一致', async () => {
    const container = document.getElementById('qsTilesContainer');
    const lock = container.querySelector('.qs-tile-pill[data-tile-id="lock_screen"]');
    const internet = container.querySelector('.qs-tile-pill[data-tile-id="internet"]');
    const bluetooth = container.querySelector('.qs-tile-pill[data-tile-id="bluetooth"]');
    expect(lock).toBeTruthy();
    expect(internet).toBeTruthy();
    expect(bluetooth).toBeTruthy();

    // 面板型磁贴点击 = 打开面板/详情，非开关翻转 → .active 前后一致
    //（internet 磁贴随 Wi-Fi 连接态默认可为 active，故比对面不判绝对值）
    const lockWas = lock.classList.contains('active');
    lock.click();
    expect(lock.classList.contains('active')).toBe(lockWas);

    const internetWas = internet.classList.contains('active');
    internet.click();
    expect(internet.classList.contains('active')).toBe(internetWas);

    const bluetoothWas = bluetooth.classList.contains('active');
    bluetooth.click();
    expect(bluetooth.classList.contains('active')).toBe(bluetoothWas);
  });
});
