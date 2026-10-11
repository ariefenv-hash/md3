// ==================== v768-tablet-overview-aosp.test.js — v7.68 平板 Overview AOSP 同构精修 ====================
//
// 用户实测：平板多任务样式「首张卡片偏右上角」。
// AOSP Launcher3 源码求证（RecentsView.updateGridProperties / BaseContainerInterface.
// calculateGridTaskSize，android.googlesource.com main 分支逐行核读）：
//   ① 焦点卡与两排网格共带（同顶同底），整带由顶部/底部 margin 内缩 = 视觉垂直居中
//      —— v7.67 前台卡 ty:0 沿用 CSS top:10px 顶锚，deck 拉高到 86% 视口后顶到上部 ✗
//   ② 恒两排：rowHeight = (gridH - rowSpacing) / 2 —— 网格卡 = 整屏等比微缩，
//      两排 + 行距恰 = 焦点卡高（v7.67 是 ceil(n/2) 行数自适应，5 卡即 3 排 ✗）
//   ③ 行分配贪心短排优先（等宽卡即上下交替 1→上 2→下 3→上…，最新网格卡紧邻焦点卡）
//      —— v7.67 列主序（最新卡在左上角、离焦点卡最远）✗
//   ④ 行右端贴焦点卡向左生长（move horizontally into empty space）
//      —— v7.67 从左 margin 排开 ✗
//   ⑤ 动作行贴焦点卡正下方（AOSP OverviewActionsView 大屏随焦点任务矩形定位）
//      —— v7.67 横贯容器底部居中 ✗
// 收缩精度：gap 不随 scale 缩放 → 解方程 perRow×s×focusW + (perRow-1)×gap = gridW。

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { bootDesktop, sleep } from './scenario-helpers.js';

const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TESTS_DIR, '..');
const src = (p) => readFileSync(path.join(ROOT, p), 'utf8');

let W;
let recent;
let prefs;
let deck;
let actionsRow;

beforeAll(async () => {
  W = await bootDesktop();
  recent = await import('../ios-desktop/js/recent-apps.js');
  prefs = await import('../ios-desktop/js/desktop-prefs.js');
  deck = document.getElementById('recentCardsDeck');
  actionsRow = document.getElementById('recentActionsRow');
  W.__lockTest.instantUnlock();
});

const parseTx = (transform) => {
  const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(transform || '');
  return m ? { tx: parseFloat(m[1]), ty: parseFloat(m[2]) } : null;
};
const parseScale = (transform) => {
  const m = /scale\(([\d.]+)\)/.exec(transform || '');
  return m ? parseFloat(m[1]) : null;
};

describe('v7.68 · 源码锚定（AOSP 同构五件套）', () => {
  const js = src('ios-desktop/js/recent-apps.js');

  test('① 带垂直居中：焦点卡 ty = bandCenter - (10 + focusH/2)', () => {
    expect(js).toContain('const bandCenter = deckH / 2;');
    expect(js).toContain('const ty = bandCenter - (10 + focusH / 2);');
    // 旧顶锚必须已退役
    expect(js).not.toContain('tx: focusCX - winW / 2, ty: 0, tz: 0, scale: 1');
  });

  test('② 恒两排：cellScale = (focusH - gap) / (2 × focusH)（AOSP rowHeight 同构）', () => {
    expect(js).toContain('let cellScale = (focusH - gap) / (2 * focusH);');
    // v7.67 列数×行数自适应网格退役
    expect(js).not.toContain('const rows = Math.max(1, Math.ceil(nGrid / cols));');
    expect(js).not.toContain('const cols = 2;');
  });

  test('③④ 贪心上下交替 + 右端贴焦点卡向左生长', () => {
    expect(js).toContain('const row = gi % 2 === 0 ? 0 : 1; // AOSP 贪心：上排先收');
    expect(js).toContain('const p = Math.floor(gi / 2);');
    expect(js).toContain('const cx = gridRight - p * (cellW + gap) - cellW / 2;');
    expect(js).toContain('const cy = row === 0');
  });

  test('⑤ 动作行贴焦点卡下方：syncTabletActionRow 定义 + 三路接线', () => {
    expect(js).toContain('function syncTabletActionRow(M) {');
    // 渲染路径（deck 高度设置后）
    expect(js).toContain('syncTabletActionRow(M); // v7.68：平板形态动作行贴焦点卡下方（AOSP 大屏同构）');
    // 偏好热切换路径
    expect(js).toContain('syncTabletActionRow(getCardMetrics()); // v7.68：动作行随形态热切换重定位');
    expect(js).toContain('syncTabletActionRow(null); // 关闭态切换：复位常规流式布局');
    // 空态复位
    expect(js).toContain('syncTabletActionRow(null); // v7.68：空态复位动作行定位');
    // 复位全量（非平板/空列表安全幂等）
    expect(js).toContain("actionsRow.style.position = '';");
  });

  test('收缩解方程：gap 不随 scale 缩放（v7.68 精度修正）', () => {
    expect(js).toContain('const widthFitScale = (gridW - (perRow - 1) * gap) / (perRow * focusW);');
    expect(js).toContain('if (widthFitScale < cellScale) {');
    expect(js).toContain('cellScale = Math.max(0.2, widthFitScale);');
    // 等比乘 k 的旧收缩（gap 溢出 bug）退役
    expect(js).not.toContain('cellScale * (gridW / widestRow)');
  });
});

describe('v7.68 · 运行时（真实视口 412×915，默认 7 卡 = 收缩路径）', () => {
  test('平板：带居中 + 两排对称 + 右端贴焦点卡 + 上下交替 + 动作行重定位', async () => {
    prefs.setDesktopPref('recentsStyle', 'tablet', { silent: true });
    recent.openRecentApps();
    await sleep(60);

    expect(deck.classList.contains('deck-tablet')).toBe(true);
    const cards = Array.from(deck.querySelectorAll('.recent-app-card'));
    expect(cards.length).toBe(recent.getRecentAppsList().length);
    expect(cards.length).toBe(7); // 收缩路径：nGrid=6 → perRow=3 > 2 满排

    const pos = cards.map((c) => ({ tx: parseTx(c.style.transform), s: parseScale(c.style.transform) }));
    const deckHpx = parseFloat(deck.style.height);
    const focusHpx = parseFloat(cards[0].style.height);
    const focusWpx = parseFloat(cards[0].style.width);
    const winW = window.innerWidth;

    // ① 焦点卡：scale 1、右缘收 margin、垂直居中于 deck
    expect(pos[0].s).toBe(1);
    const margin = Math.max(20, Math.round(winW * 0.025));
    const focusCX = winW - margin - focusWpx / 2;
    expect(pos[0].tx.tx).toBeCloseTo(focusCX - winW / 2, 0);
    expect(pos[0].tx.ty).toBeCloseTo(deckHpx / 2 - 10 - focusHpx / 2, 0);

    // 收缩解方程：perRow×s×focusW + (perRow-1)×gap = gridW
    const gridRight = focusCX - focusWpx / 2 - Math.max(16, Math.round(margin * 0.6));
    const gridW = Math.max(120, gridRight - margin);
    const perRow = 3;
    const sUnshrunk = (focusHpx - 14) / (2 * focusHpx);
    const sFit = Math.max(0.2, (gridW - (perRow - 1) * 14) / (perRow * focusWpx));
    expect(pos[1].s).toBeCloseTo(Math.min(sUnshrunk, sFit), 3);

    // ② 恒两排对称：上下排中心以 bandCenter 对称 → (ty1+ty2)/2 = ty0（收缩与否均成立）
    expect((pos[1].tx.ty + pos[2].tx.ty) / 2).toBeCloseTo(pos[0].tx.ty, 0);

    // ③ 上下交替：idx1/idx2 同列（tx 相等），idx3 回上排第二位（ty1 相等、tx 更左）
    expect(pos[2].tx.tx).toBeCloseTo(pos[1].tx.tx, 0);
    expect(pos[2].tx.ty).toBeGreaterThan(pos[1].tx.ty);
    expect(pos[3].tx.ty).toBeCloseTo(pos[1].tx.ty, 0);
    expect(pos[3].tx.tx).toBeLessThan(pos[1].tx.tx);

    // ④ 右端贴焦点卡：idx1 右缘 = gridRight（解方程收缩后精确成立）
    const cellW = focusWpx * pos[1].s;
    const cx1 = pos[1].tx.tx + winW / 2;
    expect(cx1 + cellW / 2).toBeCloseTo(gridRight, 0);

    // ⑤ 动作行：absolute 贴焦点卡下方（top = 带底 + 14，容器相对坐标）
    expect(actionsRow.style.position).toBe('absolute');
    // happy-dom 无布局：getBoundingClientRect 全零 → top = deckH/2 + focusH/2 + 14
    const topPx = parseFloat(actionsRow.style.top);
    expect(topPx).toBeCloseTo(deckHpx / 2 + focusHpx / 2 + 14, 0);
    // right = cRect.right - (winW - margin)：容器 < 视口时为负 = 逃逸 max-width 容器贴齐焦点卡
    expect(actionsRow.style.right.endsWith('px')).toBe(true);
    expect(parseFloat(actionsRow.style.right)).toBeLessThan(0);

    // 零滚动纪律：全部卡可见（左缘不出视口左界 - 1px 容差）
    const cellH = focusHpx * pos[1].s;
    cards.forEach((c, i) => {
      const t = parseTx(c.style.transform);
      const s = pos[i].s;
      const left = t.tx + winW / 2 - (focusWpx * s) / 2;
      expect(left).toBeGreaterThanOrEqual(margin - 1);
    });

    recent.closeRecentApps({ resumeSuspended: false });
    await sleep(30);
    prefs.setDesktopPref('recentsStyle', 'carousel', { silent: true });
  });

  test('形态热切换：tablet→carousel 动作行复位常规流式布局（真实 UI 路径 = 非 silent 广播）', async () => {
    prefs.setDesktopPref('recentsStyle', 'tablet', { silent: true });
    recent.openRecentApps();
    await sleep(60);
    expect(actionsRow.style.position).toBe('absolute');

    // 设置页真实切换不带 silent → desktop-prefs-changed 广播 → 监听器热切换重定位
    prefs.setDesktopPref('recentsStyle', 'carousel');
    await sleep(60);
    expect(actionsRow.style.position).toBe('');
    expect(actionsRow.style.top).toBe('');
    expect(actionsRow.style.right).toBe('');
    expect(deck.classList.contains('deck-tablet')).toBe(false);

    recent.closeRecentApps({ resumeSuspended: false });
  });
});
