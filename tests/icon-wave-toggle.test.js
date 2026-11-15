// #322：图标扩散/收回（radialField 波浪场）设置内开关——回归锚（常青命名，#291 §1）
// 守护：单一关断点在 prepareRadialField 入口（零建场、不 clear、算法零触碰）/
//       dev-options 键常数化（默认开/'0'关，#283 零裸键）/ window.__devOptions 桥 /
//       设置页开关行标注 md3 扩展（#76 保留超越项，不伪装原生）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

describe('#322 图标波浪场设置开关（radialField）', () => {
  it('dev-options.js：键常数化 ios-desktop:icon-wave（默认开语义在注记）+ setter/getter 导出', () => {
    const s = read('ios-desktop/js/dev-options.js');
    expect(s).toContain("const ICON_WAVE_KEY = 'ios-desktop:icon-wave'");
    expect(s).toContain('export function setIconWaveEnabled(on) { setFlag(ICON_WAVE_KEY, on); }');
    expect(s).toContain("try { return localStorage.getItem(ICON_WAVE_KEY) !== '0'; } catch (e) { return true; }");
    expect(s).toContain('setIconWaveEnabled, isIconWaveEnabled,');
    // #283 零裸键：键名带 ios-desktop: 命名空间
    expect(s).toContain('ios-desktop:icon-wave');
  });

  it('app-window-parallel.js：单一关断点在 prepareRadialField 入口（先于 prevS 采样；不 clear 零新增代码路径；算法零触碰）', () => {
    const s = read('ios-desktop/js/app-window-parallel.js');
    expect(s).toContain("import { isIconWaveEnabled } from './dev-options.js';");
    const iFn = s.indexOf('function prepareRadialField');
    const iGate = s.indexOf('if (!isIconWaveEnabled()) return;');
    const iPrevS = s.indexOf('const prevS = new Map();');
    expect(iGate).toBeGreaterThan(iFn);
    expect(iGate).toBeLessThan(iPrevS);
    // 注记口径：关闭态零建场 + 不 clear（在飞场自然收敛）
    expect(s).toContain('#322：单一关断点');
    expect(s).toContain('不 clear（在飞场自然收敛复位）');
    // 算法零触碰：RADIAL_PARAMS / RADIAL_STAGGER_MS 原值在位
    expect(s).toContain('const RADIAL_PARAMS = makeSpringParams(0.34, 0.78, 1);');
    expect(s).toContain('const RADIAL_STAGGER_MS = 130;');
  });

  it('settings.js：开发者选项页开关行在位（md3 扩展标注 + #70 接线范式 + toast）', () => {
    const s = read('ios-desktop/js/apps/settings.js');
    expect(s).toContain('id="devIconWaveToggle"');
    expect(s).toContain('图标扩散/收回波浪场');
    expect(s).toContain('md3 扩展效果（无 AOSP 对应实现）');
    expect(s).toContain('dev.isIconWaveEnabled()');
    expect(s).toContain('dev.setIconWaveEnabled(iw.checked)');
    expect(s).toContain("'图标波浪场已关闭（开窗不再扩散）'");
  });

  it('#76 依据零改动（移植边界文档不在本卡车道）+ dev-options 头注键清单随批', () => {
    const s = read('ios-desktop/js/dev-options.js');
    expect(s).toContain('ios-desktop:anim-speed / ios-desktop:icon-wave（#322）');
  });

  it('开关语义（mock Storage）：默认开 / 0 关 / 1 开 / 异常静默回退开', () => {
    const flagOn = (store) => {
      try { return store.getItem('ios-desktop:icon-wave') !== '0'; } catch (e) { return true; }
    };
    expect(flagOn({ getItem: () => null })).toBe(true);          // 键缺失=默认开
    expect(flagOn({ getItem: () => '1' })).toBe(true);           // 显式开
    expect(flagOn({ getItem: () => '0' })).toBe(false);          // 显式关
    expect(flagOn({ getItem: () => { throw new Error('SecurityError'); } })).toBe(true); // 异常静默回退开
  });
});
