// ==================== v785：Dual Shade 分家模式 + AOSP 官方三图标重绘 ====================
// 源码依据（android17-release @94b4c163，全部 git show 懒拉实锤）：
//   * ShadeModeInteractor.kt / shade_config.xml：Dual/Single/Split 三态；
//     Settings.Secure.DUAL_SHADE 用户开关；config_dualShadeEnabledByDefault=true；
//     config_invocationGestureSplitRatio=0.75
//   * OverlayShade.kt：浮动面板宽 min(shade_panel_width=600dp, 半屏)、圆角 46dp/sw600dp 36dp、
//     QS=TopEnd / 通知=TopStart、VerticalExpandContainerSpec 垂直展开
//   * BrightnessSliderViewModel.getIconForPercentage：≤20% low / ≥80% full / else mid
//   * res/drawable/ic_brightness_full.xml / ic_qs_footer_power.xml / vd_battery_saver.xml
//     + res/values/paths.xml path_battery_saver_on（横置电池+居中加号，加号两侧各留 8.2/64 间隙）
//   * 视频1（BV1B7rnBdEHh）抽帧：Settings Panels=Separate/Combined (classic)；
//     QS 浮动面板顶行 pencil+gear|电源符号；亮度图标右端
// 用户指令实锤：亮度图标白底去除（描边环）、电池加号留隙、电源符号替插头、
// 电源菜单从按钮位置放大到屏幕中央、亮度竖柄截断修复、磁贴点按圆角/挤压动画

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

const iconsJs = src('ios-desktop/js/icons.js');
const qsJs = src('ios-desktop/js/quick-settings.js');
const html = src('ios-desktop/index.html');
const css = src('ios-desktop/css/pull-panels.css');
const dualJs = src('ios-desktop/js/dual-shade.js');
const mainJs = src('ios-desktop/js/main.js');
const swJs = src('sw.js');

describe('v7.85 sw.js 版本推进', () => {
  it('sw.js 升 geek-v97', () => {
    expect(swJs).toContain("const VERSION = 'geek-v97';");
  });
});

describe('v7.85 AOSP 官方图标重绘（icons.js）', () => {
  it('亮度 = ic_brightness_full 原始 pathData（960 网格四瓣凸描边环，无白底）', () => {
    expect(iconsJs).toContain('M346,800L240,800Q207,800 183.5,776.5');
    expect(iconsJs).toContain('fill-rule="evenodd"');
    // 内部圆环（full 档内圈镂空）
    expect(iconsJs).toContain('M480,600Q430,600 395,565');
  });

  it('亮度静态图标（v7.87：VM.icon = ic_brightness_full，等级切换退役）', () => {
    expect(iconsJs).toContain('brightness_medium');
    expect(iconsJs).toContain('brightness_low');
    expect(qsJs).toContain('icon.innerHTML = ICONS.brightness');
    expect(qsJs).not.toContain('brightnessIconFor');
  });

  it('电池省电 = vd_battery_saver 横置电池 + 居中加号（evenOdd 镂空，两侧留隙）', () => {
    expect(iconsJs).toContain('M44 28.25');
    expect(iconsJs).toContain('M31.94 33.5');
    expect(iconsJs).toContain('translate(-13.28 -13.28) scale(0.79)');
  });

  it('电源 = ic_qs_footer_power 标准电源符号（缺口圆环+竖杆），插头退役', () => {
    expect(iconsJs).toContain('M480,914Q389,914 310,880');
    expect(iconsJs).not.toContain('M382-150v-88');
  });
});

describe('v7.85→v7.87 亮度滑条：图标左置（PlatformSlider）+ halo 顶隔', () => {
  it('亮度图标 = 左端 64dp 图标盒（PlatformSlider icon 在 start，CircleShape 裁剪）', () => {
    expect(html).toContain('class="qs-brightness-icon" id="qsBrightnessIcon"');
    expect(css).toMatch(/\.qs-brightness-icon \{[^]*?border-radius: 50%;/s);
  });

  it('滑条行 8dp 顶隔（8dp 外扩 halo 不被滚动容器顶缘裁切）', () => {
    expect(css).toMatch(/\.qs-sliders-row \{[^}]*padding-top: 8px;/s);
  });

  it('JS 不再使用 settings_brightness 图标入口', () => {
    expect(qsJs).not.toContain('ICONS.settings_brightness || ICONS.brightness');
  });
});

describe('v7.85 电源菜单容器变换（按钮位置 → 屏幕中央）', () => {
  it('openPowerDialog 接收按钮并注入 --pw-ox/--pw-oy 原点偏移', () => {
    expect(qsJs).toContain('export function openPowerDialog(sourceBtn)');
    expect(qsJs).toContain("--pw-ox");
    expect(qsJs).toContain("--pw-oy");
    expect(qsJs).toContain('openPowerDialog(powerBtn)');
  });

  it('CSS 卡片初始 = translate(原点) scale(0.35)，激活 = 回中央 scale(1)', () => {
    expect(css).toMatch(/\.power-dialog-card \{[^}]*translate\(var\(--pw-ox, 0px\), var\(--pw-oy, 0px\)\) scale\(0\.35\)/s);
    expect(css).toMatch(/\.power-dialog-overlay\.active \.power-dialog-card \{[^}]*translate\(0px, 0px\) scale\(1\)/s);
  });
});

describe('v7.85 Dual Shade 分家模式（dual-shade.js）', () => {
  it('模式开关：上线默认 classic（回归安全），AOSP 源码默认 dual 经开关/URL 可达', () => {
    expect(dualJs).toContain("const MODE_KEY = 'android17:shadeMode'");
    expect(dualJs).toMatch(/let m = 'classic';/);
  });

  it('手势分区 = config_invocationGestureSplitRatio 0.75', () => {
    expect(dualJs).toContain('GESTURE_SPLIT_RATIO = 0.75');
    expect(css).toMatch(/\.dual-invocation-zone \.diz-hit\.notif \{ width: 75%; \}/);
    expect(css).toMatch(/\.dual-invocation-zone \.diz-hit\.qs \{ width: 25%; \}/);
  });

  it('applyMode 迁移活节点：通知面板=头部+滚动区；QS 面板=顶行三钮+滚动内容', () => {
    expect(dualJs).toContain("moveInto(document.getElementById('collapsedShadeHeader'), np)");
    expect(dualJs).toContain("moveInto(document.getElementById('notiPanelScroll'), np)");
    expect(dualJs).toContain("moveInto(document.getElementById('qsPanelScroll'), qp)");
    expect(dualJs).toContain("moveInto(document.getElementById('qsPowerBtn'), top.querySelector('.dqt-right'))");
  });

  it('面板开合 API + 拖拽跟手 + scrim 关闭', () => {
    expect(dualJs).toContain('export function openDualPanel');
    expect(dualJs).toContain('export function toggleDualPanel');
    expect(dualJs).toMatch(/dy > h \* 0\.25 \|\| vy > 0\.6/);
    expect(dualJs).toMatch(/closePanel\(e\.currentTarget\.dataset\.target\)/);
  });

  it('main.js 接线：initDualShade + registerClassicCloser', () => {
    expect(mainJs).toContain('initDualShade()');
    expect(mainJs).toContain('registerClassicCloser(');
  });
});

describe('v7.85 Dual Shade 面板几何（OverlayShade.kt 同构）', () => {
  it('浮动面板：宽 min(600px,50vw)，圆角 46px，平板 600px+ 断点 36px', () => {
    expect(css).toMatch(/\.dual-panel \{[^}]*width: min\(600px, 50vw\);/s);
    expect(css).toMatch(/\.dual-panel \{[^}]*border-radius: 46px;/s);
    expect(css).toMatch(/@media \(min-width: 600px\) \{\s*\.dual-panel \{ border-radius: 36px; \}/s);
  });

  it('QS 右浮 / 通知左浮，外缝 16px（视频实锤）', () => {
    expect(css).toMatch(/\.dual-panel\.notif \{ left: 16px; \}/);
    expect(css).toMatch(/\.dual-panel\.qs \{ right: 16px; \}/);
  });

  it('关闭态 translateY(-105%) + 展开内容纵向 squish 0.92→1', () => {
    expect(css).toMatch(/\.dual-panel \{[^}]*transform: translateY\(-105%\);/s);
    expect(css).toMatch(/@keyframes dual-content-squish \{\s*0% \{ transform: scaleY\(0\.92\); \}/);
  });

  it('dual 下隐藏经典轨道与 QS 大钟头部/footer', () => {
    expect(css).toMatch(/body\[data-shade-mode="dual"\] \.pull-panels-track \{\s*display: none !important;/);
    expect(css).toMatch(/\.dual-panel\.qs \.panel-header \{ display: none; \}/);
  });

  it('index.html 骨架：dualShadeRoot + 双 scrim + 双命中区', () => {
    expect(html).toContain('id="dualShadeRoot"');
    expect(html).toContain('id="dualScrimNotif"');
    expect(html).toContain('id="dualScrimQs"');
    expect(html).toContain('id="dualHitNotif"');
    expect(html).toContain('id="dualHitQs"');
  });
});

describe('v7.85 Panels 面板模式弹层（AOSP Settings 原文同构）', () => {
  it('Separate / Combined (classic) 两选项 + 原文文案', () => {
    expect(html).toContain('data-mode="dual"');
    expect(html).toContain('data-mode="classic"');
    expect(html).toContain('Swipe down from the top right to open Quick Settings');
    expect(html).toContain('Combined (classic)');
  });

  it('长按 QS 齿轮 ≥450ms 呼出，短按进设置应用不受影响', () => {
    expect(dualJs).toMatch(/setTimeout\([\s\S]*?, 450\)/);
    expect(dualJs).toMatch(/suppressNextSettingsClick/);
    expect(qsJs).toMatch(/settingsBtn\.addEventListener\('click'/);
  });
});

describe('v7.85 电池加号脉冲（qs_battery_saver pathData morph 折中）', () => {
  it('切换时挂 bs-pop 动画类，CSS 200ms ease-out pop', () => {
    expect(qsJs).toMatch(/pill\.classList\.add\('bs-pop'\)/);
    expect(css).toMatch(/@keyframes bs-plus-pop \{[\s\S]*?scale\(1\.14\)/);
  });
});
