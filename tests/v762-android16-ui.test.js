// ==================== v762-android16-ui.test.js — Android 16 QPR1/QPR2/Beta3 UI 1:1 复刻 ====================
//
// 覆盖本轮四条复刻线（素材源：Android Authority / 9to5Google / Android Police / HowToGeek 实测报道）：
//   A. Quick Settings 可调磁贴（QPR1 旗舰特性）
//      - 2×1 宽药丸 ↔ 1×1 横卧药丸模型 + 拖拽手柄阈值判定 + localStorage 持久化
//      - 出厂混排（Internet/Bluetooth/Modes 2×1，其余 1×1）+ 新增磁贴默认 1×1（v7.63 参考图校准）
//      - 双分区磁贴（蓝牙/Modes 右子仓）、Internet 点击弹内联面板、1×1 蓝牙长按
//   B. 分屏 90:10（QPR1）：把手长按进入、轻点小窗互换（镜像比例弹簧）、越区提示层
//   C. 小窗最小化（desktop windowing 三件套补全）：minimize 按钮 / 恢复芯片 / 摘除路径
//   D. 禁用开关 X 标记（Beta 3 二级状态确认）：CSS 兑现 + 拖拽引擎禁用守卫 + 网络面板飞行模式联动

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

// ---------- A. 纯函数内核（qs-tiles.js）运行时 ----------
import {
  TILE_SIZE_KEY, QS_TILE_SIZES, normalizeSize, loadTileSizes, saveTileSizes,
  applyTileSizes, sizesFromTiles, setTileSize, resizeFromDrag, clampPreviewDx, FACTORY_TILE_SIZES,
} from '../ios-desktop/js/qs-tiles.js';

describe('v7.62 · qs-tiles 纯函数内核（Android 16 QPR1 可调磁贴）', () => {
  beforeEach(() => { localStorage.clear(); });

  test('normalizeSize：非法值回退 wide，small 保留', () => {
    expect(normalizeSize('small')).toBe('small');
    expect(normalizeSize('wide')).toBe('wide');
    expect(normalizeSize('huge')).toBe('wide');
    expect(normalizeSize(undefined)).toBe('wide');
    expect(QS_TILE_SIZES.WIDE).toBe('wide');
    expect(QS_TILE_SIZES.SMALL).toBe('small');
  });

  test('resizeFromDrag：宽药丸左拖超阈缩为 1×1，药丸右拖超阈还原 2×1，阈值内不动', () => {
    expect(resizeFromDrag('wide', -28)).toEqual({ size: 'small', changed: true });
    expect(resizeFromDrag('wide', -500)).toEqual({ size: 'small', changed: true });
    expect(resizeFromDrag('wide', -27)).toEqual({ size: 'wide', changed: false });
    expect(resizeFromDrag('wide', 40)).toEqual({ size: 'wide', changed: false });
    expect(resizeFromDrag('small', 28)).toEqual({ size: 'wide', changed: true });
    expect(resizeFromDrag('small', 27)).toEqual({ size: 'small', changed: false });
    expect(resizeFromDrag('small', -99)).toEqual({ size: 'small', changed: false });
  });

  test('持久化往返：save → load 恢复同表；损坏 JSON / 非对象 / 数组回退空表', () => {
    const map = setTileSize({ bluetooth: 'wide' }, 'torch', 'small');
    expect(map).toEqual({ bluetooth: 'wide', torch: 'small' });
    saveTileSizes(map, localStorage);
    expect(localStorage.getItem(TILE_SIZE_KEY)).toContain('torch');
    expect(loadTileSizes(localStorage)).toEqual(map);
    localStorage.setItem(TILE_SIZE_KEY, '{broken!');
    expect(loadTileSizes(localStorage)).toEqual({});
    localStorage.setItem(TILE_SIZE_KEY, '[1,2]');
    expect(loadTileSizes(localStorage)).toEqual({});
    localStorage.setItem(TILE_SIZE_KEY, '{"x":"bogus"}');
    expect(loadTileSizes(localStorage)).toEqual({ x: 'wide' });
  });

  test('applyTileSizes 就地写 tile.size 且返回【独立纯映射】（防数组别名化脏写盘）；sizesFromTiles 反推；缺省走出厂表（v7.63）', () => {
    const tiles = [{ id: 'a' }, { id: 'b' }];
    const map = applyTileSizes(tiles, { a: 'small' });
    expect(tiles[0].size).toBe('small');
    // v7.63：表中缺失的磁贴按出厂默认（'b' 不在 FACTORY_TILE_SIZES → 1×1）
    expect(tiles[1].size).toBe('small');
    // v7.62 E2E 修复锚：返回值必须是纯映射（旧实现返回数组引用导致 tileSizes 与 activeTiles 别名化）
    expect(map).toEqual({ a: 'small', b: 'small' });
    expect(Array.isArray(map)).toBe(false);
    expect(sizesFromTiles(tiles)).toEqual({ a: 'small', b: 'small' });
  });

  test('出厂默认尺寸表（v7.63 参考图校准）：Internet/Bluetooth/Modes 2×1，其余与新磁贴 1×1', () => {
    expect(FACTORY_TILE_SIZES).toEqual({ internet: 'wide', bluetooth: 'wide', modes: 'wide' });
    const tiles = [{ id: 'internet' }, { id: 'modes' }, { id: 'torch' }, { id: 'brand_new' }];
    const map = applyTileSizes(tiles, {});
    expect(tiles[0].size).toBe('wide');
    expect(tiles[1].size).toBe('wide');
    expect(tiles[2].size).toBe('small');
    expect(tiles[3].size).toBe('small');
    expect(map).toEqual({ internet: 'wide', modes: 'wide', torch: 'small', brand_new: 'small' });
  });

  test('clampPreviewDx：±44 视觉钳制', () => {
    expect(clampPreviewDx(-120)).toBe(-44);
    expect(clampPreviewDx(120)).toBe(44);
    expect(clampPreviewDx(-10)).toBe(-10);
  });
});

// ---------- A2. quick-settings.js 渲染层接线 ----------
describe('v7.62 · 快速设置渲染层接线（源码锚定）', () => {
  const js = src('ios-desktop/js/quick-settings.js');

  test('磁贴渲染携带尺寸类：size-small / size-wide', () => {
    expect(js).toContain("isSmall ? 'size-small' : 'size-wide'");
    expect(js).toContain('1×1 横卧药丸：文字标签移除');
  });

  test('双分区磁贴：bluetooth/modes 右子仓 + 长按蓝牙设备清单（480ms）', () => {
    expect(js).toContain('qs-tile-zone2');
    expect(js).toContain("tile.id === 'bluetooth' ? '已配对设备' : '模式清单'");
    expect(js).toContain('openBluetoothSheet()');
    expect(js).toContain('openModesSheet()');
    expect(js).toContain('480');
  });

  test('Internet 磁贴点击弹内联网络面板（无直接开关，对齐真机语义）', () => {
    expect(js).toContain("if (tile.id === 'internet')");
    expect(js).toContain('openNetworkSheet()');
    expect(js).toContain('网络与互联网');
  });

  test('编辑视图：尺寸拖拽手柄 + Reset 末端行 + 新增磁贴默认 1×1（v7.63）+ Undo 尺寸同步', () => {
    expect(js).toContain('edit-resize-handle');
    expect(js).toContain('bindResizeHandle');
    expect(js).toContain('editTilesResetBtn');
    expect(js).toContain('出厂布局：Internet/Bluetooth/Modes 2×1，其余 1×1');
    expect(js).toContain('added.size = QS_TILE_SIZES.SMALL');
    expect(js).toContain('sizesFromTiles(activeTiles)');
  });

  test('网络面板飞行模式联动：移动数据禁用（disabled 开关 → X 标记）', () => {
    expect(js).toContain("aeroplaneTile.active) ? '飞行模式已开启，不可用'");
    expect(js).toContain('disabled: !!(aeroplaneTile && aeroplaneTile.active)');
  });

  test('CSS 兑现：4 列基准（手机，v7.63） / 6 列平板 / span 2 / 横卧药丸 / 形状形变', () => {
    const css = src('ios-desktop/css/pull-panels.css');
    expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(css).toContain('repeat(6, minmax(0, 1fr))');
    expect(css).toContain('.qs-tile-pill.size-wide {\n  grid-column: span 2;\n}');
    // v7.63 形状随状态形变：激活圆角矩形 18px（0.28×h 实测），非激活全圆角药丸
    expect(css).toContain('border-radius: 18px;');
    expect(css).toContain('.qs-tile-pill.size-small {\n  padding: 0;\n  justify-content: center;\n  gap: 0;\n}');
    // 双分区宽磁贴可见左仓（主开关区）
    expect(css).toContain('.qs-tile-pill.size-wide[data-tile-id="bluetooth"] > .qs-tile-icon-wrap');
    expect(css).toContain('.qs-tile-zone2');
    expect(css).toContain('.edit-resize-handle');
    expect(css).toContain('.edit-reset-row');
    expect(css).toContain('.qs-sheet-overlay');
  });
});

// ---------- B. 分屏 90:10 ----------
describe('v7.62 · 分屏 90:10 点击互换（QPR1）', () => {
  const js = src('ios-desktop/js/split-screen.js');
  const css = src('ios-desktop/css/split-screen.css');

  test('常量与语义：RATIO_9010=0.90、互换区间 0.72/0.28、长按 480ms', () => {
    expect(js).toContain('const RATIO_9010 = 0.90;');
    expect(js).toContain('const SWAP_ZONE_HI = 0.72;');
    expect(js).toContain('const SWAP_ZONE_LO = 0.28;');
    expect(js).toContain('const DIVIDER_LONG_PRESS_MS = 480;');
  });

  test('互换公式：目标比例 = 1 - 当前比例（镜像），由比例弹簧完成动画', () => {
    expect(js).toContain('const target = clamp(1 - session.ratio, MIN_RATIO + 0.02, MAX_RATIO - 0.02);');
    expect(js).toContain('function swap9010()');
  });

  test('把手长按进入 / 再长按退出；长按成立时退出拖拽态并解冻 iframe', () => {
    expect(js).toContain('toggle9010()');
    expect(js).toContain('session.drag.active = false;\n      unfreezePanesContent();');
    expect(js).toContain('已进入 90:10 分屏 · 轻点小窗可互换');
    expect(js).toContain('已恢复对半分屏');
  });

  test('互换提示层随 relayout 越区同步挂载/卸载（幂等）', () => {
    expect(js).toContain('syncSwapOverlays(); // v7.62');
    expect(js).toContain('function attachSwapHint(pane)');
    expect(js).toContain('pane-swap-hint');
    expect(js).toContain('轻点互换');
  });

  test('轻点把手回中同时退出 90:10 语义（不残留 in9010）', () => {
    expect(js).toContain('session.in9010 = false;');
  });

  test('调试探针升级：in9010 + swapHint 在场性', () => {
    expect(js).toContain('in9010: !!session.in9010');
    expect(js).toContain('swapHint: !!(p.swapHint && p.swapHint.isConnected)');
  });

  test('CSS：小窗格提示层（scrim + 毛玻璃 + 图标/名称/角标）', () => {
    expect(css).toContain('.pane-swap-hint');
    expect(css).toContain('.pane-swap-tip');
    expect(css).toContain('backdrop-filter: blur(6px)');
  });
});

// ---------- C. 小窗最小化 ----------
describe('v7.62 · 小窗最小化（desktop windowing 三件套补全）', () => {
  const js = src('ios-desktop/js/mini-window.js');
  const css = src('ios-desktop/css/mini-window.css');

  test('标题栏三键齐备：minimize / expand / close', () => {
    expect(js).toContain('data-act="minimize"');
    expect(js).toContain('MIN_ICON');
    expect(js).toContain('aria-label="最小化"');
  });

  test('最小化 → 左下恢复芯片；实例现场保留；恢复复用入场材质化语言', () => {
    expect(js).toContain('export function minimizeMiniWindow(appId)');
    expect(js).toContain('export function restoreMiniWindow(appId)');
    expect(js).toContain('miniRestoreDock');
    expect(js).toContain('mini-restore-chip');
    expect(js).toContain("el.classList.add('mini-enter')");
    expect(js).toContain('minimized: false');
  });

  test('teardown 全路径摘芯片：closeOne / takeoverToFullscreen', () => {
    expect(js).toContain('removeMiniChip(m.appId); // v7.62：最小化中关闭 → 同步摘除恢复芯片');
    expect(js).toContain('removeMiniChip(appId); // v7.62：从最小化态接管全屏 → 同步摘除恢复芯片');
  });

  test('CSS：退场缩放下沉 + 芯片毛玻璃胶囊', () => {
    expect(css).toContain('.mini-window.mini-minimizing');
    expect(css).toContain('#miniRestoreDock');
    expect(css).toContain('.mini-restore-chip');
  });
});

// ---------- D. 禁用开关 X 标记（Beta 3） ----------
describe('v7.62 · 禁用开关 X 标记（Android 16 Beta 3 二级状态确认）', () => {
  test('CSS：disabled 灰化 + 关闭态手柄 X（双 45° 渐变细线）+ 开态灰轨道', () => {
    const css = src('ios-desktop/css/md3-theme.css');
    expect(css).toContain('.md3-switch input:disabled + .slider');
    expect(css).toContain('.md3-switch input:disabled:not(:checked) + .slider .thumb::after');
    expect(css).toContain('linear-gradient(45deg');
    expect(css).toContain('.md3-switch input:disabled:checked + .slider');
  });

  test('拖拽引擎禁用守卫：disabled 开关不可拖拽（m3-controls）', () => {
    const js = src('ios-desktop/js/m3-controls.js');
    expect(js).toContain('if (input.disabled) return; // v7.62：禁用开关不可拖拽');
  });

  test('真实依赖启用点：QS 网络面板「移动数据 × 飞行模式」', () => {
    const js = src('ios-desktop/js/quick-settings.js');
    expect(js).toContain('input.disabled = !!row.disabled; // 禁用态 → CSS 灰化 + 手柄 X 标记（Android 16 Beta 3）');
  });
});

// ---------- 版本锚点 ----------
describe('v7.62 · 版本与 SW 预缓存', () => {
  test('sw.js VERSION = geek-v72', () => {
    expect(src('sw.js')).toContain("const VERSION = 'geek-v72';");
  });
});
