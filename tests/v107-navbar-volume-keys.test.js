// ==================== v107-navbar-volume-keys.test.js — #107 导航栏附加音量键 v10.41 ====================
//
// 覆盖（R86 窗加餐，超越项 · §7.2b 裁决「默认关闭 / 移动端默认可见」）：
//   · aosp/navbar-volume-keys.js 纯逻辑：normalize 三态归一（非法值→default 防脏卡死）、
//     resolveVolumeKeysVisible 判定表（on 恒显 / off 恒隐 / default 触摸可见桌面隐藏）
//   · volume-dialog 出口：stepVolumeBySteps 步数语义（±1×KEY_STEP 单点换算，
//     15 级 STREAM_MUSIC 步进真值）
//   · nav-bar 接线锚：栏尾成组双键（不扩三键）、data-nvb 分发 ±1、融合手势排除
//     （按住不误入拖移模式）、三态持久化 VOLUME_KEYS_STORE_KEY、__navBar 桥四出口
//   · settings 接线锚：导航栏附加键三态单选组（uiv 范式复用零新样式）、
//     posId/vkeyId 双 dataset 区分、随三键开关显隐
//   · CSS 锚：.nvb-vol 降级次级视觉（34px/17px/on-surface-variant 零裸色）+ 弹入错峰
//   · AOSP 锚：三键无音量键考证 + AccessibilityButtonController 附加键先例（议题原文）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VOLUME_KEYS_STORE_KEY,
  VOLUME_KEYS_MODES,
  normalizeVolumeKeysMode,
  resolveVolumeKeysVisible,
} from '../ios-desktop/js/aosp/navbar-volume-keys.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const NV = readFileSync(R('js/aosp/navbar-volume-keys.js'), 'utf8');
const NB = readFileSync(R('js/nav-bar.js'), 'utf8');
const VD = readFileSync(R('js/volume-dialog.js'), 'utf8');
const ST = readFileSync(R('js/apps/settings.js'), 'utf8');
const CSS = readFileSync(R('css/nav-bar.css'), 'utf8');
/** 剥注释扫描（R77 同款：防注释字面误伤） */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('v107-A · normalizeVolumeKeysMode 三态归一', () => {
  it('A1 合法值直通；非法/缺省归 default（脏 localStorage 防卡死）', () => {
    expect(normalizeVolumeKeysMode('default')).toBe('default');
    expect(normalizeKeysModeSafe('on')).toBe('on');
    function normalizeKeysModeSafe(v) { return normalizeVolumeKeysMode(v); }
    expect(normalizeVolumeKeysMode('off')).toBe('off');
    expect(normalizeVolumeKeysMode('bogus')).toBe('default');
    expect(normalizeVolumeKeysMode('')).toBe('default');
    expect(normalizeVolumeKeysMode(null)).toBe('default');
    expect(normalizeVolumeKeysMode(undefined)).toBe('default');
    expect(normalizeVolumeKeysMode('1')).toBe('default');
  });

  it('A2 三态合法值集合稳定 + 持久化键命名（nav-bar ENABLE/POS 同族）', () => {
    expect(VOLUME_KEYS_MODES).toEqual(['default', 'on', 'off']);
    expect(VOLUME_KEYS_STORE_KEY).toBe('ios-desktop:navbar-volume-keys');
  });
});

describe('v107-B · resolveVolumeKeysVisible 判定表（§7.2b 裁决）', () => {
  it('B1 on 恒显（覆盖 isTouch）', () => {
    expect(resolveVolumeKeysVisible({ mode: 'on', isTouch: false })).toBe(true);
    expect(resolveVolumeKeysVisible({ mode: 'on', isTouch: true })).toBe(true);
  });

  it('B2 off 恒隐（覆盖 isTouch）', () => {
    expect(resolveVolumeKeysVisible({ mode: 'off', isTouch: false })).toBe(false);
    expect(resolveVolumeKeysVisible({ mode: 'off', isTouch: true })).toBe(false);
  });

  it('B3 default：移动端（触摸指针）可见 / 桌面隐藏——「默认关闭 + 移动端默认可见」双裁决合并', () => {
    expect(resolveVolumeKeysVisible({ mode: 'default', isTouch: true })).toBe(true);
    expect(resolveVolumeKeysVisible({ mode: 'default', isTouch: false })).toBe(false);
    expect(resolveVolumeKeysVisible({})).toBe(false);       // 缺参 = 桌面缺省隐藏
    expect(resolveVolumeKeysVisible({ mode: 'bogus', isTouch: true })).toBe(true); // 非法归 default
  });
});

describe('v107-C · volume-dialog stepVolumeBySteps 出口', () => {
  it('C1 步数语义单点换算（n×KEY_STEP；KEY_STEP=100/15 15 级真值）', () => {
    const s = stripComments(VD);
    expect(s).toContain('export const stepVolumeBySteps = (n) => stepVolume(n * KEY_STEP);');
    expect(s).toContain('const KEY_STEP = 100 / 15;');
  });
});

describe('v107-D · nav-bar 接线锚（防回退）', () => {
  it('D1 栏尾成组双键（volume-down/volume-up 后置于 recents；不扩三键几何）', () => {
    const s = stripComments(NB);
    const iRecents = s.indexOf('data-nvb="recents"');
    const iDown = s.indexOf('data-nvb="volume-down"');
    const iUp = s.indexOf('data-nvb="volume-up"');
    expect(iRecents).toBeGreaterThan(-1);
    expect(iDown).toBeGreaterThan(iRecents);   // 栏尾：recents 之后
    expect(iUp).toBeGreaterThan(iDown);
    expect(s).toContain('class="nvb-btn nvb-vol"');
  });

  it('D2 点击委托分发 ±1 步（stepVolumeBySteps 全量复用 #109/#108 链）', () => {
    const s = stripComments(NB);
    expect(s).toContain("btn.dataset.nvb === 'volume-down') stepVolumeBySteps(-1)");
    expect(s).toContain("btn.dataset.nvb === 'volume-up') stepVolumeBySteps(1)");
    expect(s).toContain("import { stepVolumeBySteps } from './volume-dialog.js'");
  });

  it('D3 融合手势排除：附加键 pointerdown 早退（按住不误入 1s 拖移模式）', () => {
    const s = stripComments(NB);
    const pd = s.indexOf("barEl.addEventListener('pointerdown'");
    const guard = s.indexOf("if (e.target.closest('.nvb-vol')) return;");
    expect(pd).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(pd);
    // 早退须在 setPointerCapture 之前（不抢 pointer 捕获；自 guard 位向后搜，
    // 避开 fusion 块行尾注释里的字样——剥注释正则不剥行尾注释）
    const guard2 = s.indexOf("if (e.target.closest('.nvb-vol')) return;");
    const capture = s.indexOf('setPointerCapture', guard2);
    expect(capture).toBeGreaterThan(guard2);
  });

  it('D4 三态持久化 + 显隐驱动 + 桥出口四件套', () => {
    const s = stripComments(NB);
    expect(s).toContain('normalizeVolumeKeysMode(localStorage.getItem(VOLUME_KEYS_STORE_KEY)');
    expect(s).toContain('b.hidden = !visible');
    expect(s).toContain('resolveVolumeKeysVisible({ mode: vkeysMode, isTouch: isTouchPointer() })');
    expect(s).toContain('volumeKeys: getNavBarVolumeKeys');
    expect(s).toContain('setVolumeKeys: (m) => setNavBarVolumeKeys(m, { toast: true })');
  });
});

describe('v107-E · settings 接线锚（防回退）', () => {
  it('E1 三态单选组（uiv 范式复用）+ 双 dataset 区分 + 桥消费', () => {
    const s = stripComments(ST);
    expect(s).toContain('id="navVkeysSection"');
    expect(s).toContain('id="navVkeysList"');
    expect(s).toContain("name=\"uiv-nav-vkeys\"");
    expect(s).toContain('window.__navBar.setVolumeKeys(vkeyChip.dataset.vkeyId)');
    expect(s).toContain("window.__navBar.volumeKeys()");
    // pos/vkey 两组单选互不串扰（posId 守卫 + vkeyId 分支）
    expect(s).toContain('posChip.dataset.posId && window.__navBar');
    expect(s).toContain("e.target.closest('[data-vkey-id]')");
  });

  it('E2 三态文案与裁决一致（默认（移动端显示）/开启/关闭）', () => {
    expect(ST).toContain("name: '默认（移动端显示）'");
    expect(ST).toContain("name: '开启'");
    expect(ST).toContain("name: '关闭'");
  });
});

describe('v107-F · CSS 锚（防回退）', () => {
  it('F1 次级降级视觉（34px 键体 / 17px 图标 / on-surface-variant 前景——零裸色）', () => {
    const s = stripComments(CSS);
    expect(s).toMatch(/\.nvb-vol \{[^}]*width: 34px[^}]*\}/);
    expect(s).toMatch(/\.nvb-vol \{[^}]*var\(--md-on-surface-variant[^}]*\}/);
    expect(s).toMatch(/\.nvb-vol \.nvb-icon \{ width: 17px; height: 17px; \}/);
  });

  it('F2 弹入错峰延续（child 4/5 附加键位）', () => {
    const s = stripComments(CSS);
    expect(s).toContain('.sys-nav-bar.nvb-pop .nvb-btn:nth-child(4) { animation-delay: 165ms; }');
    expect(s).toContain('.sys-nav-bar.nvb-pop .nvb-btn:nth-child(5) { animation-delay: 220ms; }');
  });
});

describe('v107-G · 纯逻辑层源码锚（AOSP/议题考证在录）', () => {
  it('G1 超越项锚：三键无音量键考证 + a11y 附加键先例 + §7.2b 裁决引用', () => {
    expect(NV).toContain('AccessibilityButtonController');
    expect(NV).toContain('ic_sysbar_back');
    expect(NV).toContain('7.2b');
  });
});
