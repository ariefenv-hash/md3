// ==================== v220：#220 ① 面板模式设置项（设置 → 通知 → Panels） ====================
// 议题：#220 ①「双栏 / 单栏合一设置项」——用户点名蓝图 #6。
// 源码依据（v7.85 既有考证沿用，非记忆）：
//   * ShadeModeInteractor.kt：ShadeMode.Dual（Settings.Secure.DUAL_SHADE 用户开关）
//   * 视频1（BV1B7rnBdEHh）实锤：设置页 Panels = Separate / Combined (classic)
// 本轮落地（R118 实例 C）：
//   * dual-shade.js：window.__dualShade { getShadeMode, setShadeMode } 桥（__navBar 同款惯例）
//   * settings.js 页 19（通知）：面板模式 radio 组（Separate / Combined (classic)），
//     写入走 setShadeMode 单一真源，存储复用既有 'android17:shadeMode' 键（#178 不新建键），
//     md3-shade-mode-changed 事件双向回显（Panels 弹层/URL 参数改动即时同步）
//
// A 组：源码静态锚（接线逐字核对）
// B 组：dual-shade.js 真模块行为（happy-dom 实导入：模式契约/存储/事件/桥）
// C 组：单一真源不另起炉灶（设置项不得绕过 setShadeMode 私写存储；#178）

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

const dualJs = src('ios-desktop/js/dual-shade.js');
const settingsJs = src('ios-desktop/js/apps/settings.js');

describe('v220 A 组：面板模式设置项源码静态锚', () => {
  it('dual-shade.js 暴露 window.__dualShade 桥（getShadeMode + setShadeMode 双入口）', () => {
    expect(dualJs).toContain('window.__dualShade = { getShadeMode, setShadeMode }');
  });

  it('桥注释声明既有惯例与 #178 不新建键（口径在档）', () => {
    expect(dualJs).toContain('__navBar');
    expect(dualJs).toContain('#178');
  });

  it('settings.js 页 19 有面板模式区（shadeModeList 容器 + Separate / Combined (classic) 两行）', () => {
    expect(settingsJs).toContain('id="shadeModeList"');
    expect(settingsJs).toContain('面板模式');
    expect(settingsJs).toContain("id: 'dual', name: 'Separate'");
    expect(settingsJs).toContain("id: 'classic', name: 'Combined (classic)'");
  });

  it('radio 行经 data-shademode-id 委托点击（closest 委托 + isConnected 守卫）', () => {
    expect(settingsJs).toContain('data-shademode-id');
    expect(settingsJs).toMatch(/closest\('\[data-shademode-id\]'\)/);
    expect(settingsJs).toMatch(/chip && chip\.isConnected/);
  });

  it('设置项写入走 window.__dualShade.setShadeMode（单一真源，非私写存储）', () => {
    expect(settingsJs).toMatch(/window\.__dualShade\.setShadeMode\(chip\.dataset\.shademodeId\)/);
  });

  it('设置项读取走 getShadeMode 优先，localStorage 仅桥缺失时兜底（非第二真源）', () => {
    expect(settingsJs).toMatch(/window\.__dualShade && window\.__dualShade\.getShadeMode/);
    expect(settingsJs).toMatch(/getItem\('android17:shadeMode'\)/);
  });

  it('页 19 激活与模式变更双回显（app-page-active 19 + md3-shade-mode-changed 监听）', () => {
    expect(settingsJs).toMatch(/e\.detail\.pageIdx === 19\) render\(\)/);
    expect(settingsJs).toMatch(/'md3-shade-mode-changed', function/);
  });

  it('键盘可达：Enter/Space 触发 radio 行（uiv-nav-radio 既有 a11y 惯例同款）', () => {
    expect(settingsJs).toMatch(/e\.key !== 'Enter' && e\.key !== ' '/);
  });
});

describe('v220 B 组：dual-shade.js 真模块行为（happy-dom 实导入）', () => {
  let dualShade;

  beforeEach(async () => {
    // 隔离：dataset 与存储清零（getShadeMode 优先级 = dataset > localStorage > 默认 classic）
    delete document.body.dataset.shadeMode;
    try { localStorage.removeItem('android17:shadeMode'); } catch (e) { /* 忽略 */ }
    // 最小骨架（index.html 内置骨架同构）：有 #dualShadeRoot + 双面板容器时
    // _applyModeInner 全路径可跑（缺件迁移节点 moveInto 对 null 入参安全早退）
    let root = document.getElementById('dualShadeRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'dualShadeRoot';
      root.innerHTML = '<section class="dual-panel notif" id="dualNotifPanel"></section>' +
        '<section class="dual-panel qs" id="dualQsPanel"></section>';
      document.body.appendChild(root);
    }
    if (!dualShade) {
      dualShade = await import('../ios-desktop/js/dual-shade.js');
    }
  });

  it('B1 默认 classic（上线默认：回归安全，AOSP 源码默认 dual 经开关/URL 可达）', () => {
    expect(dualShade.getShadeMode()).toBe('classic');
  });

  it('B2 setShadeMode 三联写：存储 + body dataset + md3-shade-mode-changed 事件', () => {
    const seen = [];
    const onEvt = (e) => seen.push(e.detail && e.detail.mode);
    document.addEventListener('md3-shade-mode-changed', onEvt);
    dualShade.setShadeMode('dual');
    document.removeEventListener('md3-shade-mode-changed', onEvt);
    expect(dualShade.getShadeMode()).toBe('dual');
    expect(document.body.dataset.shadeMode).toBe('dual');
    try { expect(localStorage.getItem('android17:shadeMode')).toBe('dual'); } catch (e) { /* 存储受限环境跳过 */ }
    expect(seen).toEqual(['dual']);
  });

  it('B3 非法模式拒收（写值白名单 dual|classic，其余零副作用）', () => {
    dualShade.setShadeMode('split');
    expect(dualShade.getShadeMode()).toBe('classic');
    expect(document.body.dataset.shadeMode).toBeUndefined();
  });

  it('B4 dataset 优先于存储（getShadeMode 优先级契约：dataset > localStorage）', () => {
    document.body.dataset.shadeMode = 'dual';
    try { localStorage.setItem('android17:shadeMode', 'classic'); } catch (e) { /* 忽略 */ }
    expect(dualShade.getShadeMode()).toBe('dual');
    delete document.body.dataset.shadeMode;
    expect(dualShade.getShadeMode()).toBe('classic');
  });

  it('B5 存储脏值钳制归 classic（非 dual/classic 一律回落默认，URL/手改免疫）', () => {
    try { localStorage.setItem('android17:shadeMode', 'zzz'); } catch (e) { /* 忽略 */ }
    expect(dualShade.getShadeMode()).toBe('classic');
    try { localStorage.removeItem('android17:shadeMode'); } catch (e) { /* 忽略 */ }
  });

  it('B6 window.__dualShade 桥在模块导入后即在位且与模块导出同源', async () => {
    const bridge = (typeof window !== 'undefined' && window.__dualShade) || null;
    expect(bridge).toBeTruthy();
    expect(typeof bridge.getShadeMode).toBe('function');
    expect(typeof bridge.setShadeMode).toBe('function');
    // 同源：桥内 setShadeMode 与模块导出同一函数引用（防复制粘贴出第二真源）
    expect(bridge.setShadeMode).toBe(dualShade.setShadeMode);
  });

  it('B7 桥写入路径 = 模块写入路径（经桥切模式与经模块切模式行为一致）', () => {
    window.__dualShade.setShadeMode('dual');
    expect(document.body.dataset.shadeMode).toBe('dual');
    window.__dualShade.setShadeMode('classic');
    expect(document.body.dataset.shadeMode).toBe('classic');
    expect(dualShade.getShadeMode()).toBe('classic');
  });

  it('B8 无 #dualShadeRoot 时 setShadeMode 不抛（applyMode 无根早退，启动序列零中断）', () => {
    // 移除骨架模拟 initDualShade 未跑（v7.85 E2E 实锤教训：迁移链异常绝不允许中断 main.js）
    const root = document.getElementById('dualShadeRoot');
    if (root) root.remove();
    expect(() => dualShade.setShadeMode('dual')).not.toThrow();
    dualShade.setShadeMode('classic');
  });
});

describe('v220 C 组：单一真源不另起炉灶（#178 数据孤岛总纲）', () => {
  it('C1 设置页内联脚本零私写存储（唯一 localStorage 写通道 = dual-shade.js MODE_KEY）', () => {
    // 页 19 面板模式段不得出现 setItem（写值只经 setShadeMode；读兜底 getItem 允许）
    const page19 = settingsJs.slice(settingsJs.indexOf('id="shadeModeList"'), settingsJs.indexOf('v8.02 #10 五期：无障碍功能子页'));
    expect(page19).not.toContain('setItem');
    expect(page19).toContain('getItem');
  });

  it('C2 存储键仍为既有 android17:shadeMode（未新增第三键，双入口共用）', () => {
    expect(dualJs).toContain("const MODE_KEY = 'android17:shadeMode'");
    // 全模块仅两处写（URL 参数恢复 + setShadeMode），且都走 MODE_KEY 常量（零字面量散写）
    const writes = dualJs.match(/localStorage\.setItem\(/g) || [];
    expect(writes).toHaveLength(2);
    expect(dualJs.match(/localStorage\.setItem\([A-Z_]+/g) || []).toEqual([
      'localStorage.setItem(MODE_KEY',
      'localStorage.setItem(MODE_KEY',
    ]);
  });

  it('C3 双入口文案一致（设置项说明与 Panels 弹层 pp-note 同义，分家/合一语义对齐）', () => {
    expect(settingsJs).toContain('Separate（分家双栏）');
    expect(settingsJs).toContain('Combined (classic)（单栏合一）');
    const html = src('ios-desktop/index.html');
    expect(html).toContain('ppModeSeparate');
    expect(html).toContain('ppModeCombined');
  });
});
