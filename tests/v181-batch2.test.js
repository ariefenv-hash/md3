// ==================== v181-batch2.test.js — #181 第二批整改（#179 六条准入 · 历史遗留渐进） v10.44 ====================
//
// 覆盖（#179 六条 × calculator / weather 两应用 + 构建期 lint 清单扩容）：
//   · calculator：六条静态锚（令牌 color-mix 派生 / @media / 760px grid 分栏 + 平板历史面板 /
//     VFS 历史+clipboard+notify / 按键字号怠速柄滑条 / tab+cat-chip 整排联动）+ 既有逻辑零破坏
//   · weather：六条静态锚（sys-color 令牌既有达标 / @media / 760px grid 分栏 /
//     VFS 最近城市+notify+requestPermission / 静默重定位间隔怠速柄滑条 / 城市胶囊整排联动）
//   · vite.config.js：ADMITTED_APPS 扩至 6 应用（+calculator +weather）
//   · 回归：计算核心（eval/addHistoryLog/renderHistory）、天气数据层（Open-Meteo URL/scheduleSilentRelocate）
//     形态零变化；手机态平板面板 display:none 零变化

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const CALC = read('ios-desktop/apps/calculator/index.html');
const WEATHER = read('ios-desktop/apps/weather/index.html');
const VITE_CFG = read('vite.config.js');

const count = (src, re) => (src.match(re) || []).length;

describe('v10.44 #181 第二批 calculator：#179 六条准入整改', () => {
  it('准入①：令牌化 —— 玻璃/按键/输入面自 --md-surface 派生 + error/scrim 语义层级', () => {
    expect(count(CALC, /var\(--md-/g)).toBeGreaterThanOrEqual(10);
    expect(CALC).toMatch(/--calc-key:\s*color-mix\(in srgb,\s*var\(--md-surface\)/);
    expect(CALC).toMatch(/--calc-key-soft:\s*color-mix\(in srgb,\s*var\(--md-surface\)/);
    expect(CALC).toMatch(/--calc-glass-solid:\s*color-mix\(in srgb,\s*var\(--md-surface\)/);
    expect(CALC).toMatch(/var\(--md-error-container\)/);
    expect(CALC).toMatch(/var\(--md-scrim/);
  });
  it('准入②：@media 两断点（min-width:760px + max-width:400px）', () => {
    expect(count(CALC, /@media/g)).toBeGreaterThanOrEqual(2);
    expect(count(CALC, /min-width:\s*760px/g)).toBeGreaterThanOrEqual(1);
    expect(count(CALC, /max-width:\s*400px/g)).toBeGreaterThanOrEqual(1);
  });
  it('准入③：平板真分栏 —— grid 两列 + #tablet-history 常驻历史面板（手机态 display:none 零变化）', () => {
    expect(CALC).toMatch(/grid-template-columns:\s*1fr\s+320px/);
    expect(CALC).toMatch(/#tablet-history\s*{\s*display:\s*none/);
    expect(CALC).toMatch(/id="tablet-history"/);
    expect(CALC).toMatch(/id="tablet-history-list"/);
    expect(CALC).toMatch(/grid-row:\s*1\s*\/\s*-1/); // aside 跨全部行
    expect(CALC).toMatch(/renderHistory/);
  });
  it('准入④：SDK —— VFS 历史镜像 + __system.clipboard 复制 + __system.notify + 降级守卫', () => {
    expect(CALC).toMatch(/calculator-history\.json/);
    expect(CALC).toMatch(/__system\.fs\.write/);
    expect(CALC).toMatch(/__system\.clipboard\.write/);
    expect(CALC).toMatch(/__system\.notify/);
    expect(CALC).toMatch(/function fsAvailable/);
    expect(CALC).toMatch(/fsSyncHistory/);
    expect(CALC).toMatch(/fsMergeHistory/);
  });
  it('准入⑤：按键字号怠速柄滑条（mdslider 细竖条/hover 胶囊）+ --p 同步 + localStorage 持久化', () => {
    expect(count(CALC, /mdslider/g)).toBeGreaterThanOrEqual(2);
    expect(CALC).toMatch(/id="btnfont-slider"/);
    expect(CALC).toMatch(/setProperty\('--p'/);
    expect(CALC).toMatch(/calc-btn-font-v1/);
    expect(CALC).toMatch(/--btn-font-scale/);
  });
  it('准入⑤：tab/cat-chip 整排按压联动（pressRipple 事件委托 + 圆角按基准形状形变）', () => {
    expect(CALC).toMatch(/function pressRippleOn\(/);
    expect(CALC).toMatch(/function releaseRippleAll\(/);
    expect(CALC).toMatch(/closest\('\.tab-btn, \.cat-chip'\)/);
    expect(CALC).toMatch(/pointerdown/);
    expect(CALC).toMatch(/RIPPLE_BASE_R/);
  });
  it('回归：计算核心与历史链零变化（eval 计算/addHistoryLog 落盘/键盘派发保留）', () => {
    expect(CALC).toMatch(/function handleMathAction\(/);
    expect(CALC).toMatch(/function addHistoryLog\(/);
    expect(CALC).toMatch(/saveCalcState\(\); \/\/ v7\.44：历史入档即落盘/);
    expect(CALC).toMatch(/window\.onkeydown/);
    expect(CALC).toMatch(/M3ERipple\.init\(\)/);
    expect(CALC).toMatch(/ios-desktop:calc-state-v1/);
  });
});

describe('v10.44 #181 第二批 weather：#179 六条准入整改', () => {
  it('准入①②：sys-color 令牌既有达标 + @media 两断点', () => {
    expect(count(WEATHER, /var\(--md-/g)).toBeGreaterThanOrEqual(10);
    expect(count(WEATHER, /@media/g)).toBeGreaterThanOrEqual(2);
    expect(count(WEATHER, /min-width:\s*760px/g)).toBeGreaterThanOrEqual(1);
    expect(count(WEATHER, /max-width:\s*400px/g)).toBeGreaterThanOrEqual(1);
  });
  it('准入③：平板分栏 —— main grid 两列（hero/AQI 横跨、逐小时|每日分列）', () => {
    expect(WEATHER).toMatch(/\.weather-app-container > main\s*{\s*display:\s*grid;\s*grid-template-columns:\s*1fr 1fr/);
    expect(WEATHER).toMatch(/main > section:nth-child\(3\)\s*{\s*grid-column:\s*1;\s*}/);
    expect(WEATHER).toMatch(/main > section:nth-child\(4\)\s*{\s*grid-column:\s*2;\s*}/);
  });
  it('准入④：SDK —— VFS 最近城市 + __system.notify 手动选城 + requestPermission 保留', () => {
    expect(WEATHER).toMatch(/weather-recent-cities\.json/);
    expect(WEATHER).toMatch(/__system\.fs\.write/);
    expect(WEATHER).toMatch(/__system\.notify/);
    expect(WEATHER).toMatch(/__system\.requestPermission/);
    expect(WEATHER).toMatch(/function fsAvailable/);
    expect(WEATHER).toMatch(/fsSyncRecentCities/);
  });
  it('准入⑤：静默重定位间隔怠速柄滑条（mdslider 5–60 分钟）+ --p 同步 + localStorage 持久化', () => {
    expect(count(WEATHER, /mdslider/g)).toBeGreaterThanOrEqual(2);
    expect(WEATHER).toMatch(/id="refreshSlider"/);
    expect(WEATHER).toMatch(/md3_weather_relocate_min_v1/);
    expect(WEATHER).toMatch(/getRelocateMin/);
    expect(WEATHER).toMatch(/setProperty\('--p'/);
  });
  it('准入⑤：城市胶囊整排按压联动（pressRipple 事件委托覆盖动态胶囊）', () => {
    expect(WEATHER).toMatch(/function pressRippleChips\(/);
    expect(WEATHER).toMatch(/function releaseRippleChips\(/);
    expect(WEATHER).toMatch(/closest\('\.city-chip'\)/);
    expect(WEATHER).toMatch(/pointerdown/);
  });
  it('回归：天气数据层零变化（Open-Meteo 高精度 URL/定位持久化/调度器守卫）', () => {
    expect(WEATHER).toMatch(/api\.open-meteo\.com\/v1\/forecast/);
    expect(WEATHER).toMatch(/md3_weather_loc_v1/);
    expect(WEATHER).toMatch(/function scheduleSilentRelocate\(/);
    expect(WEATHER).toMatch(/if \(__relocTimeout \|\| __relocPeriodic\) return;/);
    expect(WEATHER).toMatch(/getRelocateMin\(\) \* 60 \* 1000\)/);
  });
});

describe('v10.44 #181 准入 lint 清单扩容（vite.config.js）', () => {
    it('calculator / weather 已由全量扫描自动覆盖（白名单制度在 v10.44 退役）', () => {
    // v10.44 #228 制度性根因修正：ADMITTED_APPS 硬编码白名单已删除（24 应用绕过检查的根因），
    // 改 audit-app-quality.mjs 全量扫描 —— apps/ 落盘即受检，应用 id 不得再硬编码进 vite.config.js
    expect(VITE_CFG).not.toContain('ADMITTED_APPS');
    expect(VITE_CFG).toContain('audit-app-quality.mjs');
    expect(VITE_CFG).toContain('runQualityAudit');
    expect((VITE_CFG.match(/'calculator'|'weather'/g) || []).length).toBe(0); // 全量扫描下零硬编码（旧「清单含 X」断言的语义反转）
    expect(VITE_CFG).toMatch(/应用质量门禁不通过/);
  });
  it('八项评分卡接线（v10.44 #230：A–H 全量扫描 + 分期 + 硬门禁双轨）', () => {
    expect(VITE_CFG).toMatch(/runQualityAudit/);
    expect(VITE_CFG).toMatch(/phase: 1/);
    expect(VITE_CFG).toMatch(/audit\.hardFailures\.length/);
    expect(VITE_CFG).toMatch(/评分卡扫描到 0 个应用/);
  });
});
