// ==================== v764-qs-squish.test.js — M3E 磁贴开关挤压回弹（squish） ====================
//
// 用户指认的 Android 16 真机细节：状态栏开关（QS 磁贴）不但有圆角变化（v7.63 形状形变已达），
// 开与关之间还有「挤压」效果 —— M3E Expressive 的 squash & stretch：
//   切换瞬间本体被压扁（横向膨胀 + 纵向压缩）→ 弹簧回弹（反向轻微过冲）→ 落回静止；
//   开启（squish-on）380ms 弹性更足，关闭（squish-off）300ms 更利落。
// 检索佐证：Android Police「When you toggle a tile on, its shape changes from an oval to a
//   rounded rectangle」+ M3E 官方 spring physics（spatial spring 轻微过冲）。
//
// 覆盖：
//   A. 源码锚定 —— quick-settings.js 置位/消费链路 + pull-panels.css keyframes/类/曲线
//   B. 场景运行时（bootDesktop 真实引导）—— 点击翻转挂类、方向正确、定时摘除、
//      幂等重放、动作型磁贴（lock_screen/internet）不触发

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

// ---------- A. 源码锚定 ----------
describe('v7.64 · squish 源码锚定（quick-settings.js）', () => {
  const js = src('ios-desktop/js/quick-settings.js');

  test('时长常量导出：on 380 / off 300（与 CSS 动画时长对齐）', () => {
    expect(js).toContain('export const QS_SQUISH_MS = { on: 380, off: 300 };');
  });

  test('playTileSquish：摘类 → 重排重放 → 挂类 → 定时兜底摘除（happy-dom 无 animationend）', () => {
    expect(js).toContain('export function playTileSquish(pill, turningOn)');
    expect(js).toContain("const cls = turningOn ? 'squish-on' : 'squish-off';");
    expect(js).toContain("const other = turningOn ? 'squish-off' : 'squish-on';");
    expect(js).toContain('void pill.offsetWidth; // 强制重排 → 同帧内二次挂类可从头重放动画');
    expect(js).toContain('pill.classList.remove(cls);\n  }, ms + 60);');
  });

  test('点击路径：真实翻转才置位 _squishPending（防重算同态假动画），方向语义 +1/-1', () => {
    expect(js).toContain('const prevActive = tile.active;');
    expect(js).toContain('tile._squishPending = tile.active === prevActive ? 0 : (tile.active ? 1 : -1);');
    // 置位发生在 refreshTilePill 之前（消费点在其内部）
    expect(js.indexOf('tile._squishPending = tile.active === prevActive')).toBeLessThan(js.indexOf('if (tile._squishPending) {\n    playTileSquish(pill, tile._squishPending > 0);'));
  });

  test('refreshTilePill 消费：重建路径（pill 缺失/尺寸变更）重查 pill 后仍补播（深色磁贴全量重建不丢动画）', () => {
    expect(js).toContain("if (!pill) { tile._squishPending = 0; return; }");
    expect(js).toContain('if (tile._squishPending) {\n    playTileSquish(pill, tile._squishPending > 0);\n    tile._squishPending = 0;\n  } else if (wasActive !== tileActive) {\n    playTileSquish(pill, tileActive);\n  }');
  });
});

describe('v7.64 · squish 源码锚定（pull-panels.css）', () => {
  const css = src('ios-desktop/css/pull-panels.css');

  test('keyframes 三段 squash & stretch：压扁 → 反向过冲 → 落回（v7.65 拆 on/off + 有界圆角）', () => {
    expect(css).toContain('@keyframes qs-tile-squish-on');
    expect(css).toContain('@keyframes qs-tile-squish-off');
    expect(css).toContain('38%  { transform: scale(1.07, 0.9);');
    expect(css).toContain('72%  { transform: scale(0.975, 1.02);');
  });

  test('squish-on 380ms / squish-off 300ms（both 填充，独立关键帧）', () => {
    expect(css).toContain('.qs-tile-pill.squish-on {\n  animation: qs-tile-squish-on 380ms both;\n}');
    expect(css).toContain('.qs-tile-pill.squish-off {\n  animation: qs-tile-squish-off 300ms both;\n}');
  });

  test('按压反馈升级为方向性挤压（横向膨胀 + 纵向压扁），替代均匀 scale(0.96)', () => {
    expect(css).toContain('.qs-tile-pill:active {\n  transform: scale(1.045, 0.94);\n}');
    // 磁贴旧按压写法消除（edit-reset-btn 等其他组件的 0.96 按压保留，不在此约束内）
    expect(css).not.toContain('.qs-tile-pill:active {\n  transform: scale(0.96);\n}');
  });

  test('圆角 morph 回归标准曲线：旧过冲贝塞尔对 9999→18px 插值会产出负半径（钳 0 = 直角跳帧），v7.65 移除', () => {
    expect(css).not.toContain('border-radius 0.32s cubic-bezier(0.34, 1.45, 0.64, 1),');
    expect(css).toContain('border-radius 0.3s cubic-bezier(0.2, 0, 0, 1),');
    // 弹性过冲改由关键帧内有界半径关键点承担（全程非负）
    expect(css).toContain('62%  { transform: scale(0.975, 1.02); border-radius: 13px;');
    // 提取 .qs-tile-pill 主规则块，块内 transition 必须是显式属性列表（排除旧 all 写法）
    const block = css.slice(css.indexOf('.qs-tile-pill {'), css.indexOf('.qs-tile-pill:active'));
    expect(block).toContain('transition:');
    expect(block).not.toContain('transition: all');
  });

  test('prefers-reduced-motion 下禁播 squish（squish 类专用媒体块）', () => {
    // 磁贴 squish 的 reduce 块独立于 enter-stagger 的既有块，二者共存
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^]*?\.qs-tile-pill\.squish-on,[^]*?\.qs-tile-pill\.squish-off[^]*?animation: none;[^]*?\}/);
  });
});

// ---------- B. 场景运行时（真实引导） ----------
// 求值顺序守卫（与 scenario-persistence 同策略）：apps-data ← apps/* → quick-settings 构成
// 依赖环，state.js 必须先完成求值。
import '../ios-desktop/js/state.js';

describe('v7.64 · squish 场景运行时（bootDesktop + 真实点击）', () => {
  let sleep;
  let playTileSquish, QS_SQUISH_MS;

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
    const qs = await import('../ios-desktop/js/quick-settings.js');
    playTileSquish = qs.playTileSquish;
    QS_SQUISH_MS = qs.QS_SQUISH_MS;
  });

  test('导出面齐备：playTileSquish 函数 + QS_SQUISH_MS 常量', () => {
    expect(typeof playTileSquish).toBe('function');
    expect(QS_SQUISH_MS).toEqual({ on: 380, off: 300 });
  });

  test('playTileSquish 直调：开启挂 squish-on、关闭挂 squish-off，定时兜底摘除', async () => {
    const pill = document.createElement('div');
    pill.className = 'qs-tile-pill';
    document.body.appendChild(pill);

    playTileSquish(pill, true);
    expect(pill.classList.contains('squish-on')).toBe(true);
    expect(pill.classList.contains('squish-off')).toBe(false);

    // 开启 380ms + 60ms 余量 → 类被摘除（happy-dom 不触发 animationend）
    await sleep(QS_SQUISH_MS.on + 200);
    expect(pill.classList.contains('squish-on')).toBe(false);

    playTileSquish(pill, false);
    expect(pill.classList.contains('squish-off')).toBe(true);
    expect(pill.classList.contains('squish-on')).toBe(false);
    await sleep(QS_SQUISH_MS.off + 200);
    expect(pill.classList.contains('squish-off')).toBe(false);
    pill.remove();
  });

  test('幂等重放：同向连调先摘旧类再重挂（不双类并存）', () => {
    const pill = document.createElement('div');
    pill.className = 'qs-tile-pill';
    document.body.appendChild(pill);
    playTileSquish(pill, true);
    playTileSquish(pill, true); // 快速二次触发
    const onCount = [...pill.classList].filter((c) => c === 'squish-on').length;
    expect(onCount).toBe(1); // classList 天然去重，且旧定时器摘的也是同一个类名
    expect(pill.classList.contains('squish-off')).toBe(false);
    pill.remove();
  });

  test('真实点击 Torch（初始关）→ 翻转开启 → squish-on 挂上 → 定时后摘除；再点 → squish-off', async () => {
    const container = document.getElementById('qsTilesContainer');
    expect(container).toBeTruthy();
    const pill = container.querySelector('.qs-tile-pill[data-tile-id="torch"]');
    expect(pill).toBeTruthy();
    expect(pill.classList.contains('active')).toBe(false);

    pill.click();
    expect(pill.classList.contains('active')).toBe(true);
    expect(pill.classList.contains('squish-on')).toBe(true);
    await sleep(QS_SQUISH_MS.on + 220);
    expect(pill.classList.contains('squish-on')).toBe(false);

    pill.click(); // 关闭
    expect(pill.classList.contains('active')).toBe(false);
    expect(pill.classList.contains('squish-off')).toBe(true);
    await sleep(QS_SQUISH_MS.off + 220);
    expect(pill.classList.contains('squish-off')).toBe(false);
  });

  test('动作型磁贴不触发 squish：lock_screen / internet 点击无 squish 类', async () => {
    const container = document.getElementById('qsTilesContainer');
    const lock = container.querySelector('.qs-tile-pill[data-tile-id="lock_screen"]');
    const internet = container.querySelector('.qs-tile-pill[data-tile-id="internet"]');
    expect(lock).toBeTruthy();
    expect(internet).toBeTruthy();

    lock.click();
    expect(lock.classList.contains('squish-on')).toBe(false);
    expect(lock.classList.contains('squish-off')).toBe(false);

    internet.click(); // 对齐真机语义：弹网络面板，无开关翻转
    expect(internet.classList.contains('squish-on')).toBe(false);
    expect(internet.classList.contains('squish-off')).toBe(false);
  });
});
