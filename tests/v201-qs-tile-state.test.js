// ==================== v201-qs-tile-state.test.js — #201+#202 QS 磁贴状态机与五通道视觉派生 v10.27 ====================
//
// 覆盖（R72 窗主作业，#201 逻辑层 + #202 视图层姊妹篇合并交付）：
//   · aosp/qs-tile-state.js 纯逻辑真跑：Tile 三态常量（UNAVAILABLE/INACTIVE/ACTIVE=0/1/2）
//     / deriveTileState 全量重算（BooleanState.value 双字段解耦 / UNAVAILABLE 优先级 /
//     restricted 不改三态值）/ 环境约束（飞行模式→cast/quick_share/vpn/internet UNAVAILABLE；
//     省电模式→torch policy: 受管通道）/ refreshState 同帧去重（只保留最后一份）/
//     陈旧自愈 isStale（10 分钟 DEFAULT_STALE_TIMEOUT）/ 误触守卫 isFalseTap/isFalseLongTap
//   · aosp/qs-tile-view.js 纯逻辑真跑：ArgbEvaluator 真身（sRGB→linear 2.2 幂→插值→回 sRGB，
//     端点恒等/中点偏移单侧）/ applyAlpha（a 通道替换）/ 五通道 getTileViewColors
//   （BACKGROUND/LABEL/SECONDARY_LABEL/CHEVRON/OVERLAY + UNAVAILABLE||restricted 合流
//   colorUnavailable + overlay 0.11/0.08 + disabled 遮罩不参与）/ 交互派生
//   getTileViewInteractivity（isClickable=isAvailable / isLongClickable 逐贴位 /
//   labelEnabled=!disabledByPolicy）/ UNAVAILABLE_ALPHA=0.3 / QS_ANIM_LENGTH_MS=350
//   · 接线锚：quick-settings.js 渲染三态类（unavailable/restricted 压制 active）+
//     副标签派生（不可用/受管理）+ 点击三重处置（禁点击/受管提示/误触守卫）+
//     aeroplane case refreshState 广播（cast/quick_share/vpn/internet/torch 五贴）+
//     长按泛化（TILE_LONG_CLICK_SHEET 三贴目的地 + FALSE_LONG_TAP_MIN_MS 单源）+
//     五通道消费内联（--tile-bg/--tile-fg/--tile-sub + null 通道跳过）+ CSS 合流兜底
//   · 回归锚：v7.82 CSS spring 过渡单源 320ms 不变 / v7.84 双容器刷新 / darktheme 特例保持

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TILE_STATE, DEFAULT_STALE_TIMEOUT_MS, FALSE_TAP_MAX_DX, FALSE_TAP_MAX_MS, FALSE_LONG_TAP_MIN_MS,
  TILE_LONG_CLICK_INTENTS, deriveTileState, tileConstraintReason,
  refreshStateCoalesce, refreshStateBatch, isStale, isFalseTap, isFalseLongTap,
} from '../ios-desktop/js/aosp/qs-tile-state.js';
import {
  QS_ANIM_LENGTH_MS, UNAVAILABLE_ALPHA, OVERLAY_ALPHA_ACTIVE, OVERLAY_ALPHA_INACTIVE,
  argb, applyAlpha, argbEvaluate, colorIntToCss, getTileViewColors, getTileViewInteractivity,
} from '../ios-desktop/js/aosp/qs-tile-view.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATE_JS = readFileSync(join(ROOT, 'ios-desktop/js/aosp/qs-tile-state.js'), 'utf-8');
const VIEW_JS = readFileSync(join(ROOT, 'ios-desktop/js/aosp/qs-tile-view.js'), 'utf-8');
const QS = readFileSync(join(ROOT, 'ios-desktop/js/quick-settings.js'), 'utf-8');
const CSS = readFileSync(join(ROOT, 'ios-desktop/css/pull-panels.css'), 'utf-8');

// 测试色板（ARGB int；与 md token 解耦的固定输入，断言混算/合流正确性）
const PALETTE = {
  shadeActive: argb(255, 168, 199, 250),      // --md-primary #a8c7fa
  shadeInactive: argb(255, 42, 45, 52),       // surface-container-high
  shadeDisabled: argb(255, 15, 16, 20),       // surface-container-lowest
  onShadeActive: argb(255, 4, 46, 78),        // on-primary #042e4e
  onShadeInactive: argb(255, 232, 234, 237),  // on-surface
  onShadeActiveVariant: argb(255, 4, 46, 78),
  onShadeInactiveVariant: argb(255, 200, 202, 208),
  outline: argb(255, 147, 144, 148),          // #939094
};

describe('v10.27 #201 Tile 三态常量与 QSTileImpl 时序常量', () => {
  it('三态常量 1:1（Tile.STATE_UNAVAILABLE/INACTIVE/ACTIVE = 0/1/2）', () => {
    expect(TILE_STATE.UNAVAILABLE).toBe(0);
    expect(TILE_STATE.INACTIVE).toBe(1);
    expect(TILE_STATE.ACTIVE).toBe(2);
    expect(Object.isFrozen(TILE_STATE)).toBe(true);
  });

  it('DEFAULT_STALE_TIMEOUT = 10 * DateUtils.MINUTE_IN_MILLIS（QSTileImpl L92 同值）', () => {
    expect(DEFAULT_STALE_TIMEOUT_MS).toBe(10 * 60 * 1000);
  });

  it('误触守卫阈值在录（LOW_PENALTY web 标定 + 长按 480ms 单源）', () => {
    expect(FALSE_TAP_MAX_DX).toBe(24);
    expect(FALSE_TAP_MAX_MS).toBe(700);
    expect(FALSE_LONG_TAP_MIN_MS).toBe(480);
  });

  it('长按目的地逐贴声明：有内联面板实体的三贴（internet/bluetooth/modes），其余如实缺省', () => {
    expect(TILE_LONG_CLICK_INTENTS.internet).toBe('network-sheet');
    expect(TILE_LONG_CLICK_INTENTS.bluetooth).toBe('bluetooth-sheet');
    expect(TILE_LONG_CLICK_INTENTS.modes).toBe('modes-sheet');
    expect(TILE_LONG_CLICK_INTENTS.torch).toBeUndefined();
    expect(TILE_LONG_CLICK_INTENTS.cast).toBeUndefined();
  });
});

describe('v10.27 #201 deriveTileState 全量重算（handleUpdateState 同构）', () => {
  it('active 布尔 → 三态映射（BooleanState.value 双字段解耦）', () => {
    const on = deriveTileState({ id: 'torch', active: true }, {});
    expect(on.state).toBe(TILE_STATE.ACTIVE);
    expect(on.value).toBe(true);
    const off = deriveTileState({ id: 'torch', active: false }, {});
    expect(off.state).toBe(TILE_STATE.INACTIVE);
    expect(off.value).toBe(false);
  });

  it('UNAVAILABLE 优先级最高：环境约束下 state=0，value 语义失活保留原布尔', () => {
    const vs = deriveTileState({ id: 'cast', active: true }, { aeroplane: true });
    expect(vs.state).toBe(TILE_STATE.UNAVAILABLE);
    expect(vs.unavailableReason).toBe('aeroplane');
    expect(vs.value).toBe(true); // value 保留原值，state 失活（AOSP BooleanState 同构）
  });

  it('受管（disabledByPolicy）不改三态值——仅 restricted 位与色彩合流（L592-595/L644 同构）', () => {
    const vs = deriveTileState({ id: 'torch', active: true }, { batterySaver: true });
    expect(vs.state).toBe(TILE_STATE.ACTIVE); // 三态保持
    expect(vs.restricted).toBe(true);
    expect(vs.restrictedReason).toBe('battery_saver');
    expect(vs.unavailableReason).toBeNull();
  });

  it('环境约束映射：飞行模式命中射频链路四贴；省电仅 torch 受管；其他贴零影响', () => {
    for (const id of ['cast', 'quick_share', 'vpn', 'internet']) {
      expect(tileConstraintReason(id, { aeroplane: true })).toBe('aeroplane');
    }
    expect(tileConstraintReason('torch', { aeroplane: true })).toBeNull();
    expect(tileConstraintReason('torch', { batterySaver: true })).toBe('policy:battery_saver');
    expect(tileConstraintReason('cast', { batterySaver: true })).toBeNull();
    expect(tileConstraintReason('darktheme', { aeroplane: true, batterySaver: true })).toBeNull();
  });

  it('handlesLongClick 消费逐贴声明表（非特例 if）', () => {
    expect(deriveTileState({ id: 'internet', active: false }, {}).handlesLongClick).toBe(true);
    expect(deriveTileState({ id: 'torch', active: false }, {}).handlesLongClick).toBe(false);
  });
});

describe('v10.27 #201 refreshState 同帧去重与陈旧自愈', () => {
  it('refreshStateCoalesce：同帧多次只保留最后一份（L436-446 注释原文同构）', () => {
    let q = [];
    q = refreshStateCoalesce(q, 'cast', { a: 1 });
    q = refreshStateCoalesce(q, 'torch', { b: 2 });
    q = refreshStateCoalesce(q, 'cast', { a: 3 }); // 同 tileId 旧条目移除
    expect(q).toHaveLength(2);
    expect(q[0]).toEqual({ tileId: 'torch', arg: { b: 2 } });
    expect(q[1]).toEqual({ tileId: 'cast', arg: { a: 3 } });
  });

  it('refreshStateBatch：多贴广播按首现位置保持 + 重复贴去重', () => {
    const q = refreshStateBatch([], ['cast', 'torch', 'cast'], (id) => ({ id }));
    expect(q.map((x) => x.tileId)).toEqual(['torch', 'cast']);
    expect(q[1].arg).toEqual({ id: 'cast' });
  });

  it('isStale：10 分钟阈值越界判定 + 自定义 timeout + 非法输入不误报', () => {
    expect(isStale(0, 10 * 60 * 1000 + 1)).toBe(true);
    expect(isStale(0, 10 * 60 * 1000)).toBe(false); // 等于阈值不算陈旧（> 严格）
    expect(isStale(1000, 2000, 500)).toBe(true);
    expect(isStale(undefined, Date.now())).toBe(false);
    expect(isStale(0, 'now')).toBe(false);
  });
});

describe('v10.27 #201 误触守卫（FalsingManager 同构）', () => {
  it('isFalseTap：位移 > 24px 或按压 > 700ms 任一越界即误触', () => {
    expect(isFalseTap({ dx: 2, ms: 120 })).toBe(false);
    expect(isFalseTap({ dx: 25, ms: 120 })).toBe(true);  // 滑动误触
    expect(isFalseTap({ dx: -25, ms: 120 })).toBe(true); // 方向无关
    expect(isFalseTap({ dx: 2, ms: 701 })).toBe(true);   // 长按误判点击
    expect(isFalseTap(null)).toBe(false);
  });

  it('isFalseLongTap：时长 < 480ms 即非有效长按（与 lpTimer 单源）', () => {
    expect(isFalseLongTap(479)).toBe(true);
    expect(isFalseLongTap(480)).toBe(false);
    expect(isFalseLongTap(undefined)).toBe(true);
  });
});

describe('v10.27 #202 ArgbEvaluator 真身与 applyAlpha', () => {
  it('端点恒等：fraction=0/1 返回起止色（伽马往返闭合）', () => {
    const a = argb(255, 168, 199, 250);
    const b = argb(255, 4, 46, 78);
    expect(argbEvaluate(a, b, 0)).toBe(a);
    expect(argbEvaluate(a, b, 1)).toBe(b);
    expect(argbEvaluate(a, b, 2)).toBe(b); // 越界钳位
    expect(argbEvaluate(a, b, -1)).toBe(a);
  });

  it('线性域插值≠sRGB 域插值：2.2 幂伽马在中间段偏向暗端（API 21+ 真身指纹）', () => {
    const dark = argb(255, 0, 0, 0);
    const white = argb(255, 255, 255, 255);
    const mid = argbEvaluate(dark, white, 0.5);
    const r = (mid >>> 16) & 0xff;
    // sRGB 直接线性中点应为 128；linear 域插值回 sRGB 后 ≈ 188（2.2 幂指纹，显著偏亮端为伪）
    expect(r).toBeGreaterThan(128);
    expect(r).toBeLessThan(255);
    // 反向中点对称一致
    const midR = argbEvaluate(white, dark, 0.5);
    expect(((midR >>> 16) & 0xff)).toBe(r);
  });

  it('applyAlpha：a 通道直接替换（ColorUtils.setAlphaComponent 同构），RGB 位保持', () => {
    const c = argb(255, 4, 46, 78);
    expect(applyAlpha(0.11, c)).toBe(argb(28, 4, 46, 78));   // round(0.11*255)=28
    expect(applyAlpha(0.08, c)).toBe(argb(20, 4, 46, 78));   // round(0.08*255)=20
    expect(applyAlpha(1, c)).toBe(c);
    expect(applyAlpha(0.3, c)).toBe(argb(77, 4, 46, 78));
  });

  it('colorIntToCss：不透明走 rgb()，带 alpha 走 rgba() 三位小数', () => {
    expect(colorIntToCss(argb(255, 4, 46, 78))).toBe('rgb(4,46,78)');
    expect(colorIntToCss(argb(128, 4, 46, 78))).toBe('rgba(4,46,78,0.502)');
    expect(colorIntToCss(null)).toBe('');
  });
});

describe('v10.27 #202 getTileViewColors 五通道派生与合流', () => {
  it('ACTIVE：五通道全走 shade/onShadeActive 族 + overlay 0.11', () => {
    const c = getTileViewColors({ state: TILE_STATE.ACTIVE }, PALETTE);
    expect(c.background).toBe(PALETTE.shadeActive);
    expect(c.label).toBe(PALETTE.onShadeActive);
    expect(c.secondaryLabel).toBe(PALETTE.onShadeActiveVariant);
    expect(c.chevron).toBe(PALETTE.onShadeActive); // 雪佛龙与主标签同族
    expect(c.overlay).toBe(applyAlpha(OVERLAY_ALPHA_ACTIVE, PALETTE.onShadeActive));
    expect(OVERLAY_ALPHA_ACTIVE).toBe(0.11);
  });

  it('INACTIVE：inactive 族 + overlay 0.08', () => {
    const c = getTileViewColors({ state: TILE_STATE.INACTIVE }, PALETTE);
    expect(c.background).toBe(PALETTE.shadeInactive);
    expect(c.label).toBe(PALETTE.onShadeInactive);
    expect(c.secondaryLabel).toBe(PALETTE.onShadeInactiveVariant);
    expect(c.overlay).toBe(applyAlpha(OVERLAY_ALPHA_INACTIVE, PALETTE.onShadeInactive));
    expect(OVERLAY_ALPHA_INACTIVE).toBe(0.08);
  });

  it('合流规则：UNAVAILABLE 与 restricted 均走 colorUnavailable 三通道 + 遮罩不参与', () => {
    for (const vs of [
      { state: TILE_STATE.UNAVAILABLE, restricted: false },
      { state: TILE_STATE.ACTIVE, restricted: true },
      { state: TILE_STATE.INACTIVE, restricted: true },
    ]) {
      const c = getTileViewColors(vs, PALETTE);
      expect(c.background).toBe(PALETTE.shadeDisabled);
      expect(c.label).toBe(PALETTE.outline);
      expect(c.secondaryLabel).toBe(PALETTE.outline);
      expect(c.overlay).toBeNull(); // 禁用态无高光遮罩
    }
  });

  it('UNAVAILABLE_ALPHA = 0.3f（QSTileViewImpl L88 契约常量）与 QS_ANIM_LENGTH = 350ms', () => {
    expect(UNAVAILABLE_ALPHA).toBe(0.3);
    expect(QS_ANIM_LENGTH_MS).toBe(350);
  });

  it('getTileViewInteractivity：UNAVAILABLE 禁点击收长按；restricted 可点击但标签失能（L580/L684）', () => {
    expect(getTileViewInteractivity({ state: TILE_STATE.ACTIVE })).toEqual({
      isClickable: true, isLongClickable: false, labelEnabled: true,
    });
    expect(getTileViewInteractivity({ state: TILE_STATE.UNAVAILABLE, handlesLongClick: true }).isClickable).toBe(false);
    expect(getTileViewInteractivity({ state: TILE_STATE.UNAVAILABLE, handlesLongClick: true }).isLongClickable).toBe(false);
    // restricted 不夺 isClickable（点击保留用于受管提示），但 label.isEnabled = false
    const r = getTileViewInteractivity({ state: TILE_STATE.ACTIVE, restricted: true, handlesLongClick: true });
    expect(r.isClickable).toBe(true);
    expect(r.labelEnabled).toBe(false);
    expect(getTileViewInteractivity({ state: TILE_STATE.ACTIVE, handlesLongClick: true }).isLongClickable).toBe(true);
  });
});

describe('v10.27 #201/#202 quick-settings.js 接线锚', () => {
  it('双模块 import 在录 + qsEnvSnapshot 环境快照单源', () => {
    expect(QS).toContain("from './aosp/qs-tile-state.js'");
    expect(QS).toContain("from './aosp/qs-tile-view.js'");
    expect(QS).toMatch(/function qsEnvSnapshot\(\) \{[^}]*aeroplane[^}]*batterySaver/);
  });

  it('渲染三态类派生：合流压制 active（showActive 排除 unavailable/restricted）', () => {
    expect(QS).toContain("${showActive ? 'active' : ''} ${isUnavailable ? 'unavailable' : ''} ${vs.restricted && !isUnavailable ? 'restricted' : ''}");
    expect(QS).toMatch(/const showActive = tileActive && !isUnavailable && !vs\.restricted;/);
    // 全量与增量双路径同口径
    expect(QS.match(/deriveTileState\(tile, qsEnvSnapshot\(\)\)/g).length).toBeGreaterThanOrEqual(4);
  });

  it('副标签派生：不可用 / 受管理（getUnavailableText 同位）', () => {
    expect(QS.match(/isUnavailable \? '不可用'/g).length).toBe(2); // 全量 + 增量
    expect(QS.match(/vs\.restricted \? '受管理'/g).length).toBe(2);
  });

  it('点击三重处置：误触守卫 + UNAVAILABLE 禁点击 toast + restricted 受管提示', () => {
    expect(QS).toContain('isFalseTap({ dx: e.clientX - pill.__pt.x, ms: Date.now() - pill.__pt.t })');
    expect(QS).toMatch(/vsClick\.state === TILE_STATE\.UNAVAILABLE[\s\S]{0,200}不可用（\$\{vsClick\.unavailableReason === 'aeroplane' \? '飞行模式开启中'/);
    expect(QS).toMatch(/vsClick\.restricted[\s\S]{0,120}受管理（\$\{vsClick\.restrictedReason === 'battery_saver' \? '省电模式限制' : '管理员控制'\}）/);
  });

  it('aeroplane case：refreshState 广播 ENV_DEPENDENT_TILES 五贴（含 torch 受管恢复路径）', () => {
    expect(QS).toMatch(/case 'aeroplane':[\s\S]{0,400}refreshEnvDependentTiles\(\);/);
    expect(QS).toMatch(/const ENV_DEPENDENT_TILES = \['cast', 'quick_share', 'vpn', 'internet', 'torch'\];/);
  });

  it('长按泛化：TILE_LONG_CLICK_SHEET 三贴 + FALSE_LONG_TAP_MIN_MS 单源 + UNAVAILABLE 收长按', () => {
    expect(QS).toMatch(/const TILE_LONG_CLICK_SHEET = \{[^}]*internet: \(el\) => openNetworkSheet\(el\),[^}]*bluetooth: \(el\) => openBluetoothSheet\(el\),[^}]*modes: \(el\) => openModesSheet\(el\),[^}]*\};/s);
    expect(QS).toContain('longClickSheet(pill); }, FALSE_LONG_TAP_MIN_MS);');
    expect(QS).toMatch(/longClickSheet && deriveTileState\(tile, qsEnvSnapshot\(\)\)\.state !== TILE_STATE\.UNAVAILABLE/);
    expect(QS).toContain('FALSE_LONG_TAP_MIN_MS');
  });

  it('五通道消费内联：--tile-bg/--tile-fg/--tile-sub 双路径 + null 通道跳过', () => {
    expect(QS.match(/if \(colors\.background != null\) pill\.style\.setProperty\('--tile-bg'/g).length).toBe(2);
    expect(QS.match(/const palette = mdTilePalette\(\);/g).length).toBe(2); // 消费点双路径（定义另计）
    expect(QS).toMatch(/function mdTilePalette\(\)[\s\S]*--md-surface-container-lowest[\s\S]*--md-outline/);
  });

  it('CSS 合流兜底：unavailable/restricted 双类 + 变量消费 + 退涟漪灰盘', () => {
    expect(CSS).toContain('.qs-tile-pill.unavailable,\n.qs-tile-pill.restricted {');
    expect(CSS).toContain('var(--tile-bg, var(--md-surface-container-lowest');
    expect(CSS).toContain('var(--tile-fg, var(--md-outline');
    expect(CSS).toContain('.qs-tile-pill.unavailable:active .qs-tile-icon-wrap');
  });

  it('v7.82 回归锚：CSS spring 过渡单源 320ms 不变（不双轨）', () => {
    expect(CSS).toContain('background-color 0.32s cubic-bezier(0.2, 0, 0, 1)');
  });

  it('darktheme 特例保持：开关状态跟随解析外观（自动档）', () => {
    expect(QS).toContain("tile.id === 'darktheme' ? getResolvedTheme() === 'dark' : tile.active");
  });
});
