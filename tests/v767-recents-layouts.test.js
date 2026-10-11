// ==================== v767-recents-layouts.test.js — v7.67 后台三形态布局引擎 ====================
//
// 用户实测反馈修复与增强：
//   ① classic 平铺只显示一张卡 → 根因三连：
//      · 步长 0.86×卡宽（轮播堆叠节奏）被平铺沿用 → 邻卡互相压边；
//      · CSS margin-left:-130px 硬编码（260px 旧卡宽时代）→ 焦点卡偏左 45px，
//        右侧邻卡可见余量被挤没；
//      · 修复：平铺步长 = 卡宽+16px + 内联动态 marginLeft（-previewW/2）真居中。
//   ② 平板网格新形态（Android 12L+ 大屏 Overview 同构）：
//      前台大卡居右（等比缩放 = 之前的比例），历史卡片两列网格排其左侧、
//      行数自适应全部可见；点击历史卡直接启动（无需先聚焦）；无横向翻页。
//   ③ 统一布局引擎 layoutCardTransform：渲染 / 上滑恢复位姿 / 拖拽换算 / 弹簧初速
//      四处 magic number（stepPx/210/215）收口为单一真源，1:1 跟手。

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { bootDesktop, sleep, SCREEN_W, SCREEN_H } from './scenario-helpers.js';

const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TESTS_DIR, '..');
const src = (p) => readFileSync(path.join(ROOT, p), 'utf8');

let W;
let recent;
let prefs;
let deck;

beforeAll(async () => {
  W = await bootDesktop();
  recent = await import('../ios-desktop/js/recent-apps.js');
  prefs = await import('../ios-desktop/js/desktop-prefs.js');
  deck = document.getElementById('recentCardsDeck');
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

describe('v7.67 · 源码锚定', () => {
  const js = src('ios-desktop/js/recent-apps.js');

  test('统一布局引擎 layoutCardTransform：三分支单一真源', () => {
    expect(js).toContain('function layoutCardTransform(idx, offset, totalCount, M)');
    expect(js).toContain('if (isTabletRecents()) {');
    expect(js).toContain('if (isClassicRecents()) {');
    // updateCardsTransform 全量走布局引擎
    expect(js).toContain('const L = layoutCardTransform(idx, offset, total, M);');
  });

  test('classic 平铺修复：步长 = 卡宽+16、动态 marginLeft 真居中', () => {
    // 步长分化：classic/tablet 用卡宽+16，carousel 保持 0.86 堆叠节奏
    expect(js).toContain('stepPx: classic ? previewW + 16 : Math.round(previewW * 0.86),');
    // 两处卡片构建均内联动态居中锚点（CSS 硬编码 -130px 退役）
    expect(js).toContain('div.style.marginLeft = `${-M.previewW / 2}px`;');
    expect(js).toMatch(/marginLeft[\s\S]{0,80}动态居中锚点/);
  });

  test('拖拽/惯性/弹簧全链统一真实步长（CARD_STEP_PX 与 delta*215 退役）', () => {
    expect(js).not.toContain('dx / CARD_STEP_PX');
    expect(js).not.toContain('delta * 215');
    expect(js).toContain('const stepNow = Math.max(getCardMetrics().stepPx, 1);');
    expect(js).toContain('const stepUp = Math.max(getCardMetrics().stepPx, 1);');
    expect(js).toContain('const vCards = clamp(flingVelocityPx / Math.max(getCardMetrics().stepPx, 1), -8, 8);');
  });

  test('平板网格：前台大卡居右 + 两列网格 + 行数自适应 + 点击直启', () => {
    // 前台卡 idx0 判定 + 等比（scale 1）居右
    expect(js).toContain('const focusCX = winW - margin - focusW / 2;');
    // 两列行优先网格 + 行数自适应格缩放（0.2..0.55 钳制）
    expect(js).toContain('const cols = 2;');
    expect(js).toContain('const rows = Math.max(1, Math.ceil(nGrid / cols));');
    expect(js).toContain('), 0.2, 0.55);');
    // 点击历史卡直接启动（无需先聚焦）
    expect(js).toContain('if (clickedIdx === curFocusedIdx || isTabletRecents()) {');
    // 平板无横向翻页：maxOffset 收口为 0
    expect(js).toContain('const maxOffset = isTabletRecents() ? 0 : Math.max(0, recentAppsList.length - 1);');
    // settle 归位对平板恒 0
    expect(js).toContain('scrollOffset = isTabletRecents() ? 0 : clamp(scrollOffset, 0, Math.max(0, recentAppsList.length - 1));');
  });

  test('偏好白名单三档 + 设置页三 chips + deck-tablet 类', () => {
    const prefsSrc = src('ios-desktop/js/desktop-prefs.js');
    expect(prefsSrc).toContain("export const RECENTS_STYLE_CHOICES = ['carousel', 'classic', 'tablet'];");
    const settings = src('ios-desktop/js/apps/settings.js');
    expect(settings).toContain("chipHTML('recentsStyle', 'tablet', p.recentsStyle, '平板网格');");
    expect(js).toContain("deck.classList.toggle('deck-tablet', isTabletRecents());");
  });
});

describe('v7.67 · 运行时（真实视口 412×915）', () => {
  test('度量分化：carousel 步长 156 vs classic 平铺步长 197（卡宽181+16）', () => {
    prefs.setDesktopPref('recentsStyle', 'carousel', { silent: true });
    const Mc = recent.__getCardMetricsForTest
      ? recent.__getCardMetricsForTest()
      : null;
    // 步长经布局引擎间接验证：classic 卡间距 = previewW+16 = 181+16 = 197
    // previewW = clamp(round(915*0.44=403)→470 钳制? 不 —— 竖屏 previewH=402(915*0.44=402.6→403)
    // 实际 previewW = clamp(round(403*412/915)=181, 150, 340) = 181
    void Mc;
    prefs.setDesktopPref('recentsStyle', 'classic', { silent: true });
    recent.openRecentApps();
    return sleep(60).then(() => {
      const cards = Array.from(deck.querySelectorAll('.recent-app-card'));
      expect(cards.length).toBeGreaterThan(2);
      const t0 = parseTx(cards[0].style.transform);
      const t1 = parseTx(cards[1].style.transform);
      const t2 = parseTx(cards[2].style.transform);
      // 相邻卡 x 差 = stepPx = 197（> 卡宽 181 → 零重叠完整平铺）
      expect(Math.round(t1.tx - t0.tx)).toBe(197);
      expect(Math.round(t2.tx - t1.tx)).toBe(197);
      // 焦点卡动态居中：tx = 0（left:50% + marginLeft:-90.5px → 卡片中心恰在视口中线）
      expect(t0.tx).toBe(0);
      // 内联 marginLeft 覆写 CSS 硬编码
      expect(cards[0].style.marginLeft).toBe('-90.5px');
      // 零重叠：步长 197 > 卡宽 181
      recent.closeRecentApps({ resumeSuspended: false });
    });
  });

  test('平板网格运行时：前台大卡居右（scale 1），历史卡两列网格行自适应', async () => {
    prefs.setDesktopPref('recentsStyle', 'tablet', { silent: true });
    recent.openRecentApps();
    await sleep(60);

    expect(deck.classList.contains('deck-tablet')).toBe(true);
    const cards = Array.from(deck.querySelectorAll('.recent-app-card'));
    const list = recent.getRecentAppsList();
    expect(cards.length).toBe(list.length);

    const pos = cards.map((c) => ({ tx: parseTx(c.style.transform), s: parseScale(c.style.transform) }));
    // 前台卡（idx0）：scale 1 且 tx > 0（居右）；412 宽视口 → tx = 412-20-90.5-206 = 95.5
    expect(pos[0].s).toBe(1);
    expect(pos[0].tx.tx).toBeGreaterThan(0);
    // 历史卡：scale < 1（网格小卡），tx < 0（居左）
    expect(pos[1].s).toBeLessThan(1);
    expect(pos[1].s).toBeGreaterThan(0);
    expect(pos[1].tx.tx).toBeLessThan(0);
    // 两列网格：idx1/idx2 同一排（ty 相同）、不同列（tx 不同）；idx3 换行（ty 更大）
    expect(pos[1].tx.ty).toBe(pos[2].tx.ty);
    expect(pos[1].tx.tx).not.toBe(pos[2].tx.tx);
    if (pos[3]) expect(pos[3].tx.ty).toBeGreaterThan(pos[1].tx.ty);
    // 格缩放 ≤ 0.55（上限钳制）
    expect(pos[1].s).toBeLessThanOrEqual(0.55);
    // 全卡可点（网格无远端命中衰减）
    cards.forEach((c) => expect(c.style.pointerEvents).toBe('auto'));
    // 全卡不透明
    cards.forEach((c) => expect(c.style.opacity).toBe('1'));

    recent.closeRecentApps({ resumeSuspended: false });
    prefs.setDesktopPref('recentsStyle', 'carousel', { silent: true });
  });

  test('平板网格持久化：tablet 档位写入/读回/非法值拒绝', () => {
    expect(prefs.setDesktopPref('recentsStyle', 'tablet')).toBe(true);
    expect(prefs.getDesktopPrefs().recentsStyle).toBe('tablet');
    expect(JSON.parse(localStorage.getItem('ios-desktop:desktop-prefs')).recentsStyle).toBe('tablet');
    expect(prefs.setDesktopPref('recentsStyle', 'bogus')).toBe(false);
    expect(prefs.getDesktopPrefs().recentsStyle).toBe('tablet');
    prefs.setDesktopPref('recentsStyle', 'carousel', { silent: true });
  });

  test('carousel 基线回归：堆叠步长 156（0.86×181）与 rotateY 侧转保持', async () => {
    prefs.setDesktopPref('recentsStyle', 'carousel', { silent: true });
    recent.openRecentApps();
    await sleep(60);
    const cards = Array.from(deck.querySelectorAll('.recent-app-card'));
    const t0 = parseTx(cards[0].style.transform);
    const t1 = parseTx(cards[1].style.transform);
    expect(Math.round(t1.tx - t0.tx)).toBe(156); // round(181*0.86)
    expect(cards[1].style.transform).toContain('rotateY(-12.0deg)'); // -1*12
    expect(cards[0].style.transform).toContain('rotateY(0.0deg)');
    recent.closeRecentApps({ resumeSuspended: false });
  });
});
