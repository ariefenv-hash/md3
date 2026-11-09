// ==================== volume-panel-position.test.js — #112 音量面板定位与形态 v11.03 ====================
//
// 覆盖（VolumeDialogImpl.java 2858 行全文实拉入库 + SystemUI integers.xml 权威注）：
//   · aosp/volume-position.js 纯逻辑：sideToGravity（19/21 资源锚）/ isTabletopPosture
//     （竖屏 × 折叠半开双条件）/ resolveVolumeGravity（TOP 叠加 85/83）/ 
//     resolveVolumePanelPlacement（决策表全分支 + 非法归默认）
//   · volume-dialog 接线：show() 落位重判（onStart 同构）+ posture change 可见期收起
//     （onPostureChanged dismiss 同构）+ volume-side-changed 运行时切换
//   · pull-panels.css 变体：.vd-side-left 镜像 / .vd-tabletop-top 贴顶 / --vd-enter-tx
//   · settings 系统导航页：音量面板侧双态 radio + 事件派发
//   · AOSP 源码锚（防回退）：adjustPositionOnScreen / isTabletop / HALF_OPENED /
//     isWindowGravityLeft / integers.xml gravity=21 权威注释
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GRAVITY_LEFT,
  GRAVITY_RIGHT,
  GRAVITY_CENTER_VERTICAL,
  GRAVITY_TOP,
  VOLUME_DIALOG_GRAVITY_DEFAULT,
  VOLUME_SIDES,
  VOLUME_SIDE_STORE_KEY,
  normalizeVolumeSide,
  sideToGravity,
  isTabletopPosture,
  resolveVolumeGravity,
  resolveVolumePanelPlacement,
} from '../ios-desktop/js/aosp/volume-position.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const REF = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'reference', p);
const VD = readFileSync(R('js/volume-dialog.js'), 'utf8');
const CSS = readFileSync(R('css/pull-panels.css'), 'utf8');
const ST = readFileSync(R('js/apps/settings.js'), 'utf8');
/** 剥注释扫描（R77 同款：防注释字面误伤） */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('v112-A · aosp/volume-position.js 纯逻辑判定表', () => {
  it('A1 Gravity 常量与资源默认锚（integers.xml 权威注 Value 21 = RIGHT|CENTER_VERTICAL）', () => {
    expect(GRAVITY_LEFT).toBe(3);
    expect(GRAVITY_RIGHT).toBe(5);
    expect(GRAVITY_CENTER_VERTICAL).toBe(16);
    expect(GRAVITY_TOP).toBe(64);
    expect(VOLUME_DIALOG_GRAVITY_DEFAULT).toBe(21);
    expect(GRAVITY_RIGHT + GRAVITY_CENTER_VERTICAL).toBe(VOLUME_DIALOG_GRAVITY_DEFAULT);
    expect(GRAVITY_LEFT + GRAVITY_CENTER_VERTICAL).toBe(19);
  });

  it('A2 normalizeVolumeSide：合法直通 / 非法与脏值归 right（资源默认同律）', () => {
    expect(normalizeVolumeSide('right')).toBe('right');
    expect(normalizeVolumeSide('left')).toBe('left');
    expect(normalizeVolumeSide('')).toBe('right');
    expect(normalizeVolumeSide('bogus')).toBe('right');
    expect(normalizeVolumeSide('LEFT')).toBe('right');   // 大小写敏感，不宽容
    expect(VOLUME_SIDES).toEqual(['right', 'left']);
    expect(VOLUME_SIDE_STORE_KEY).toBe('ios-desktop:volume-side');
  });

  it('A3 sideToGravity：left=19 / right=21 / 非法归 21（mOriginalGravity 等价）', () => {
    expect(sideToGravity('right')).toBe(21);
    expect(sideToGravity('left')).toBe(19);
    expect(sideToGravity('bogus')).toBe(21);
    expect(sideToGravity(undefined)).toBe(21);
  });

  it('A4 isTabletopPosture：竖屏 × folded 双条件（L421-423 同构）', () => {
    expect(isTabletopPosture({ isPortrait: true, posture: 'folded' })).toBe(true);
    expect(isTabletopPosture({ isPortrait: true, posture: 'continuous' })).toBe(false);
    expect(isTabletopPosture({ isPortrait: true, posture: '' })).toBe(false);      // API 缺席
    expect(isTabletopPosture({ isPortrait: false, posture: 'folded' })).toBe(false); // 横屏不叠
    expect(isTabletopPosture({})).toBe(false);
    expect(isTabletopPosture({ isPortrait: true })).toBe(false);
  });

  it('A5 resolveVolumeGravity：tabletop → |TOP 靠上（85/83）；否则原值（21/19）', () => {
    expect(resolveVolumeGravity({ side: 'right', isPortrait: false, posture: '' })).toBe(21);
    expect(resolveVolumeGravity({ side: 'left', isPortrait: false, posture: '' })).toBe(19);
    expect(resolveVolumeGravity({ side: 'right', isPortrait: true, posture: 'folded' })).toBe(85);
    expect(resolveVolumeGravity({ side: 'left', isPortrait: true, posture: 'folded' })).toBe(83);
    expect(resolveVolumeGravity({ side: 'right', isPortrait: true, posture: 'continuous' })).toBe(21);
    // 平板横屏（1280×800 类）不叠 TOP —— #112 议题原表述勘误（源码实证）
    expect(resolveVolumeGravity({ side: 'right', isPortrait: false, posture: 'folded' })).toBe(21);
  });

  it('A6 resolveVolumePanelPlacement：默认落位（右居中，无类，滑入 +1）', () => {
    const p = resolveVolumePanelPlacement({});
    expect(p.gravity).toBe(21);
    expect(p.isTabletop).toBe(false);
    expect(p.sideClass).toBe('');
    expect(p.topClass).toBe('');
    expect(p.isWindowGravityLeft).toBe(false);
    expect(p.enterTranslateX).toBe(1);
  });

  it('A7 resolveVolumePanelPlacement：左侧变体（19 / side-left / isWindowGravityLeft / −1）', () => {
    const p = resolveVolumePanelPlacement({ side: 'left' });
    expect(p.gravity).toBe(19);
    expect(p.sideClass).toBe('vd-side-left');
    expect(p.isWindowGravityLeft).toBe(true);
    expect(p.enterTranslateX).toBe(-1);
    expect(p.topClass).toBe('');
  });

  it('A8 resolveVolumePanelPlacement：tabletop 竖屏折叠（top 类 + gravity 85）', () => {
    const p = resolveVolumePanelPlacement({ isPortrait: true, posture: 'folded' });
    expect(p.isTabletop).toBe(true);
    expect(p.topClass).toBe('vd-tabletop-top');
    expect(p.gravity).toBe(85);
    expect(p.sideClass).toBe('');          // 右侧默认无类
    expect(p.enterTranslateX).toBe(1);
  });

  it('A9 resolveVolumePanelPlacement：左侧 × tabletop 组合（83 + 双类 + −1）', () => {
    const p = resolveVolumePanelPlacement({ side: 'left', isPortrait: true, posture: 'folded' });
    expect(p.gravity).toBe(83);
    expect(p.sideClass).toBe('vd-side-left');
    expect(p.topClass).toBe('vd-tabletop-top');
    expect(p.enterTranslateX).toBe(-1);
  });
});

describe('v112-B · volume-dialog 接线（源文本断言，stripComments 防注释误伤）', () => {
  const VDC = stripComments(VD);

  it('B1 show() 内落位重判先于 visible（onStart → adjustPositionOnScreen L2569-2574 同构）', () => {
    const showIdx = VDC.indexOf('const show = () => {');
    const syncIdx = VDC.indexOf('const syncPlacement = () => {');
    expect(syncIdx).toBeGreaterThan(-1);
    expect(showIdx).toBeGreaterThan(syncIdx);              // 定义在前
    const showBody = VDC.slice(showIdx, VDC.indexOf('const dismiss ='));
    expect(showBody.indexOf('syncPlacement();')).toBeGreaterThan(-1);
    expect(showBody.indexOf('syncPlacement();')).toBeLessThan(showBody.indexOf("classList.add('visible')"));
  });

  it('B2 syncPlacement 决策表消费面：双类 toggle + --vd-enter-tx 方向注入 + gravity 记账', () => {
    const body = VDC.slice(VDC.indexOf('const syncPlacement'), VDC.indexOf('/** 显示对话框'));
    expect(body).toContain("resolveVolumePanelPlacement({");
    expect(body).toContain("window.innerHeight > window.innerWidth");
    expect(body).toContain("classList.toggle('vd-side-left'");
    expect(body).toContain("classList.toggle('vd-tabletop-top'");
    expect(body).toContain("setProperty('--vd-enter-tx'");
    expect(body).toContain("dataset.gravity");
  });

  it('B3 posture 监听：可见期收起（onPostureChanged → dismiss L2509-2512 同构）+ API 缺席静默', () => {
    expect(VDC).toContain("navigator.devicePosture.addEventListener('change'");
    const seg = VDC.slice(VDC.indexOf("navigator.devicePosture.addEventListener('change'"));
    expect(seg.indexOf('isVisible()')).toBeGreaterThan(-1);
    expect(seg.indexOf('dismiss()')).toBeGreaterThan(-1);
    expect(VD).toContain('API 缺席环境静默（诚实降级，非故障）');   // 注释本体查原文（VDC 已剥）
  });

  it('B4 volume-side-changed 运行时切换监听（可见期即时重判）', () => {
    expect(VDC).toContain("window.addEventListener('volume-side-changed'");
    const seg = VDC.slice(VDC.indexOf("window.addEventListener('volume-side-changed'"));
    expect(seg.indexOf('syncPlacement()')).toBeGreaterThan(-1);
  });

  it('B5 侧偏好真源：VOLUME_SIDE_STORE_KEY 读取 + 非法归 right', () => {
    expect(VDC).toContain('localStorage.getItem(VOLUME_SIDE_STORE_KEY)');
    expect(VDC).toContain('normalizeVolumeSide');
  });
});

describe('v112-C · pull-panels.css 落位变体', () => {
  it('C1 .vd-side-left：left 8px 镜像 + --vd-enter-tx −16px（gravity 19 落位）', () => {
    expect(CSS).toContain('.volume-dialog.vd-side-left {');
    const seg = CSS.slice(CSS.indexOf('.volume-dialog.vd-side-left {'));
    expect(seg).toContain('right: auto;');
    expect(seg).toContain('left: 8px;');
    expect(seg).toContain('--vd-enter-tx: -16px;');
  });

  it('C2 .vd-tabletop-top：贴顶 8dp + translateX 变量（TOP 靠上避铰链）', () => {
    expect(CSS).toContain('.volume-dialog.vd-tabletop-top {');
    const seg = CSS.slice(CSS.indexOf('.volume-dialog.vd-tabletop-top {'));
    expect(seg).toContain('top: 8px;');
    expect(seg).toContain('transform: translateX(var(--vd-enter-tx, 16px));');
    expect(seg).toContain('.volume-dialog.vd-tabletop-top.visible {');
    expect(seg).toContain('transform: translateX(0);');
  });

  it('C3 基础规则入场偏移变量化（默认 16px 右侧方向保持）', () => {
    expect(CSS).toContain('translateY(-50%) translateX(var(--vd-enter-tx, 16px))');
  });
});

describe('v112-D · settings 系统导航页音量面板侧 UI', () => {
  it('D1 section + 双态 radio（uiv 范式同构）+ 持久化 + 事件派发', () => {
    expect(ST).toContain('id="navVolSideSection"');
    expect(ST).toContain('id="navVolSideList"');
    expect(ST).toContain('data-vside-id');
    expect(ST).toContain("name=\"uiv-nav-vside\"");
    expect(ST).toContain("localStorage.setItem('ios-desktop:volume-side'");
    expect(ST).toContain("dispatchEvent(new CustomEvent('volume-side-changed'");
    expect(ST).toContain('右侧（默认）');
    expect(ST).toContain('左侧');
  });
});

describe('v112-E · AOSP 源码锚（防回退 + 入库体检）', () => {
  const JAVA = 'frameworks-base/systemui/volume-dialog/VolumeDialogImpl.java';
  const XML = 'frameworks-base/systemui/volume-dialog/integers.xml';

  it('E1 VolumeDialogImpl.java 全文入库且关键段在录', () => {
    expect(existsSync(REF(JAVA))).toBe(true);
    const src = readFileSync(REF(JAVA), 'utf8');
    expect(src).toContain('private void adjustPositionOnScreen()');
    expect(src).toContain('final boolean isTabletop = isPortrait && isHalfOpen;');
    expect(src).toContain('DevicePostureController.DEVICE_POSTURE_HALF_OPENED');
    expect(src).toContain('avoid drawing on the hinge');
    expect(src).toContain('private boolean isWindowGravityLeft()');
    expect(src).toContain('dismiss(DISMISS_REASON_POSTURE_CHANGED)');
    expect(src).toContain('R.integer.volume_dialog_gravity');
  });

  it('E2 integers.xml 入库：gravity 默认 21 = RIGHT|CENTER_VERTICAL 权威注释', () => {
    expect(existsSync(REF(XML))).toBe(true);
    const src = readFileSync(REF(XML), 'utf8');
    expect(src).toContain('<integer name="volume_dialog_gravity">21</integer>');
    expect(src).toContain('RIGHT|CENTER_VERTICAL');
  });
});
