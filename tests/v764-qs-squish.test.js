// ==================== v764-qs-squish.test.js — v7.79 演进：图标底座形变（morph） ====================
//
// v7.64 引入的「磁贴本体 squash & stretch」已被 1080P 逐帧实锤推翻（v2@53s / v4@9.4s）：
// 磁贴本体从不变形 —— 用户看到的「挤压」正身是【圆形图标底座 → 方圆角色块】的
// container transform（灰盘按压 → 圆底外扩 blob 过冲 2-3% → 定形 + 颜色过渡 → 回落归位）。
// v7.79 重写为 morph 体系：morph-on 320ms / morph-off 260ms，几何归位（与初始完全一致）。
//
// 覆盖：
//   A. 源码锚定 —— quick-settings.js 置位/消费链路 + pull-panels.css keyframes/类
//   B. 场景运行时（bootDesktop 真实引导）—— 点击翻转挂类、方向正确、定时摘除、
//      幂等重放、动作型磁贴（lock_screen/internet）不触发

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

// ---------- A. 源码锚定 ----------
describe('v7.79 · morph 源码锚定（quick-settings.js）', () => {
  const js = src('ios-desktop/js/quick-settings.js');

  test('时长常量导出：on 320 / off 260（与 CSS 动画时长对齐）', () => {
    expect(js).toContain('export const QS_MORPH_MS = { on: 320, off: 260 };');
    expect(js).not.toContain('QS_SQUISH_MS');
  });

  test('playTileMorph：摘类 → 重排重放 → 挂类 → 定时兜底摘除（happy-dom 无 animationend）', () => {
    expect(js).toContain('export function playTileMorph(pill, turningOn)');
    expect(js).toContain("const cls = turningOn ? 'morph-on' : 'morph-off';");
    expect(js).toContain("const other = turningOn ? 'morph-off' : 'morph-on';");
    expect(js).toContain('void pill.offsetWidth; // 强制重排 → 同帧内二次挂类可从头重放动画');
    expect(js).toContain('pill.classList.remove(cls);\n  }, ms + 60);');
  });

  test('点击路径：真实翻转才置位 _morphPending（防重算同态假动画），方向语义 +1/-1', () => {
    expect(js).toContain('const prevActive = tile.active;');
    expect(js).toContain('tile._morphPending = tile.active === prevActive ? 0 : (tile.active ? 1 : -1);');
    // 置位发生在 refreshTilePill 之前（消费点在其内部）
    expect(js.indexOf('tile._morphPending = tile.active === prevActive')).toBeLessThan(js.indexOf('if (tile._morphPending) {\n    playTileMorph(pill, tile._morphPending > 0);'));
  });

  test('refreshTilePill 消费：重建路径（pill 缺失/尺寸变更）重查 pill 后仍补播（深色磁贴全量重建不丢动画）', () => {
    expect(js).toContain("if (!pill) { tile._morphPending = 0; return; }");
    expect(js).toContain('if (tile._morphPending) {\n    playTileMorph(pill, tile._morphPending > 0);\n    tile._morphPending = 0;\n  } else if (wasActive !== tileActive) {\n    playTileMorph(pill, tileActive);\n  }');
  });
});

describe('v7.79 · morph 源码锚定（pull-panels.css）', () => {
  const css = src('ios-desktop/css/pull-panels.css');

  test('关键帧三段 blob：外扩 → 过冲回落 → 归位（磁贴本体 squish 关键帧删除）', () => {
    expect(css).not.toContain('@keyframes qs-tile-squish-on');
    expect(css).not.toContain('@keyframes qs-tile-squish-off');
    expect(css).toContain('@keyframes qs-icon-morph-on');
    expect(css).toContain('@keyframes qs-icon-morph-off');
    expect(css).toContain('0%   { transform: scale(0.55); opacity: 0.15;');
    expect(css).toContain('45%  { transform: scale(1.09); opacity: 1;');
    expect(css).toContain('72%  { transform: scale(0.985);');
  });

  test('morph-on 320ms / morph-off 260ms（both 填充，挂在图标底座）', () => {
    expect(css).toContain('.qs-tile-pill.morph-on .qs-tile-icon-wrap { animation: qs-icon-morph-on 320ms both; }');
    expect(css).toContain('.qs-tile-pill.morph-off .qs-tile-icon-wrap { animation: qs-icon-morph-off 260ms both; }');
  });

  test('按压反馈：磁贴轻收缩 scale(0.985) + 图标底座灰盘（v4 9.20-9.24s 实锤灰盘先行）', () => {
    expect(css).toContain('.qs-tile-pill:active {\n  transform: scale(0.985);\n}');
    expect(css).toContain('.qs-tile-pill:active .qs-tile-icon-wrap {\n  background: rgba(128, 128, 128, 0.28) !important;\n}');
  });

  test('形状语义：磁贴 = 统一 stadium（激活/未激活形状一致只变色），图标底座圆 ↔ 方圆角', () => {
    expect(css).toContain('.qs-tile-pill {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  height: 64px;\n  padding: 0 10px;\n  border-radius: 9999px;');
    // 底座常态圆，激活方圆角 15px
    expect(css).toContain('.qs-tile-icon-wrap {\n  width: 44px;\n  height: 44px;\n  border-radius: 50%;');
    expect(css).toContain('.qs-tile-pill.active[data-tile-id="bluetooth"] > .qs-tile-icon-wrap,\n.qs-tile-pill.active[data-tile-id="modes"] > .qs-tile-icon-wrap {\n  border-radius: 15px;');
  });

  test('prefers-reduced-motion 下禁播 morph（morph 类专用媒体块）', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^]*?\.qs-tile-pill\.morph-on \.qs-tile-icon-wrap,[^]*?\.qs-tile-pill\.morph-off \.qs-tile-icon-wrap[^]*?animation: none;[^]*?\}/);
  });
});

// ---------- B. 场景运行时（真实引导） ----------
// 求值顺序守卫（与 scenario-persistence 同策略）：apps-data ← apps/* → quick-settings 构成
// 依赖环，state.js 必须先完成求值。
import '../ios-desktop/js/state.js';

describe('v7.79 · morph 场景运行时（bootDesktop + 真实点击）', () => {
  let sleep;
  let playTileMorph, QS_MORPH_MS;

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
    playTileMorph = qs.playTileMorph;
    QS_MORPH_MS = qs.QS_MORPH_MS;
  });

  test('导出面齐备：playTileMorph 函数 + QS_MORPH_MS 常量', () => {
    expect(typeof playTileMorph).toBe('function');
    expect(QS_MORPH_MS).toEqual({ on: 320, off: 260 });
  });

  test('playTileMorph 直调：开启挂 morph-on、关闭挂 morph-off，定时兜底摘除', async () => {
    const pill = document.createElement('div');
    pill.className = 'qs-tile-pill';
    document.body.appendChild(pill);

    playTileMorph(pill, true);
    expect(pill.classList.contains('morph-on')).toBe(true);
    expect(pill.classList.contains('morph-off')).toBe(false);

    // 开启 320ms + 60ms 余量 → 类被摘除（happy-dom 不触发 animationend）
    await sleep(QS_MORPH_MS.on + 200);
    expect(pill.classList.contains('morph-on')).toBe(false);

    playTileMorph(pill, false);
    expect(pill.classList.contains('morph-off')).toBe(true);
    expect(pill.classList.contains('morph-on')).toBe(false);
    await sleep(QS_MORPH_MS.off + 200);
    expect(pill.classList.contains('morph-off')).toBe(false);
    pill.remove();
  });

  test('幂等重放：同向连调先摘旧类再重挂（不双类并存）', () => {
    const pill = document.createElement('div');
    pill.className = 'qs-tile-pill';
    document.body.appendChild(pill);
    playTileMorph(pill, true);
    playTileMorph(pill, true); // 快速二次触发
    const onCount = [...pill.classList].filter((c) => c === 'morph-on').length;
    expect(onCount).toBe(1); // classList 天然去重，且旧定时器摘的也是同一个类名
    expect(pill.classList.contains('morph-off')).toBe(false);
    pill.remove();
  });

  test('真实点击 Torch（初始关）→ 翻转开启 → morph-on 挂上 → 定时后摘除；再点 → morph-off', async () => {
    const container = document.getElementById('qsTilesContainer');
    expect(container).toBeTruthy();
    const pill = container.querySelector('.qs-tile-pill[data-tile-id="torch"]');
    expect(pill).toBeTruthy();
    expect(pill.classList.contains('active')).toBe(false);

    pill.click();
    expect(pill.classList.contains('active')).toBe(true);
    expect(pill.classList.contains('morph-on')).toBe(true);
    await sleep(QS_MORPH_MS.on + 220);
    expect(pill.classList.contains('morph-on')).toBe(false);

    pill.click(); // 关闭
    expect(pill.classList.contains('active')).toBe(false);
    expect(pill.classList.contains('morph-off')).toBe(true);
    await sleep(QS_MORPH_MS.off + 220);
    expect(pill.classList.contains('morph-off')).toBe(false);
  });

  test('动作型/面板型磁贴不触发 morph：lock_screen / internet / bluetooth 点击无 morph 类', async () => {
    const container = document.getElementById('qsTilesContainer');
    const lock = container.querySelector('.qs-tile-pill[data-tile-id="lock_screen"]');
    const internet = container.querySelector('.qs-tile-pill[data-tile-id="internet"]');
    const bluetooth = container.querySelector('.qs-tile-pill[data-tile-id="bluetooth"]');
    expect(lock).toBeTruthy();
    expect(internet).toBeTruthy();
    expect(bluetooth).toBeTruthy();

    lock.click();
    expect(lock.classList.contains('morph-on')).toBe(false);
    expect(lock.classList.contains('morph-off')).toBe(false);

    internet.click(); // 对齐真机语义：弹网络面板，无开关翻转
    expect(internet.classList.contains('morph-on')).toBe(false);
    expect(internet.classList.contains('morph-off')).toBe(false);

    bluetooth.click(); // v7.79：蓝牙点击弹已配对设备面板，无开关翻转
    expect(bluetooth.classList.contains('morph-on')).toBe(false);
    expect(bluetooth.classList.contains('morph-off')).toBe(false);
  });
});
