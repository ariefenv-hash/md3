// ==================== v313 测试 — #313 [V 清单批 8] V8 深窄屏 4 家 + V2 字体阶梯 4 家直连 + terminal 非缺口登记（R139 窗 Job 2933040 · 第 2 定时消息系列） ====================
//
// 背景：R139 续点候选（docs/worklog.md 末行 + HANDOFF 覆写十九 next_candidates 双真源一致；
// 第 3 系列 2931605 已声明 V8/V2 让位本车道 2933040 不抢）。
// 快照实树口径：V8 39/43 → 43/43（clock-app/shortcuts/stocks/weather 4 家清零）；
// V2 38/43 → 42/43（chess/clock-app/game2048/threes 4 家直连清零 + terminal 非缺口登记维持 false）。
//
// 施工形态（R136 #312 V1 批 7 先例同律）：
//   · V8 surface：stocks/weather body 别名间接消费（--md-sys-color-background 定义体即
//     var(--md-surface)，md3-tokens.css 规范已弃用角色映射行）→ 规则体直连规范令牌，
//     逐位等值零漂移；
//   · V8 窄屏路径：clock-app（≤400px 双面板 padding 收窄+计时卡字号降档+秒表键盘全宽+
//     噪声网格 3→2 列）/ shortcuts（≤360px 卡片内距收窄+图标降档+头部字号降档）/
//     stocks（≤400px 主容器内距收窄，Tailwind sm: 断点反向补齐）——布局实质差异，非空查询；
//   · V2 字体契约（v7.58 全局字体契约区块：body/root 级 font-family 一律引用
//     var(--md-text-font)/var(--md-font)）：chess body 硬编码栈 'Roboto','Noto Sans SC' 契约修复
//     （视觉变化 sans→衬线如实披露）+ .ch-piece 棋子 unicode 字形显式锚定（threes 30 行
//     'Noto Sans Symbols 2' 豁免面同款）保跨平台一致；
//     clock-app --f fallback（--custom-user-font 优先级机制保留）/ game2048 --font fallback
//     （Playfair Display 品牌面保留）/ threes --font（--custom-font 优先保留）→ fallback
//     首项 'Noto Serif SC' 与 --md-text-font 首项逐位等值直连零漂移。
//
// terminal 裁决（非缺口登记）：终端模拟器等宽栅格是功能本体（tm-out 输出区/tm-inrow 输入行/
// tm-side 快捷面板全等宽），V2 契约注记「场景化等宽/品牌展示字体不在此约束内」的极致形态
// → R133 #309 terminal V3 微值面先例同律，V2 维持 false 属非缺口登记，留 #229 车道裁决。
//
// 关联：#313（本卡）/ #312（批 7）/ #311（批 6）/ #309（批 5）/ #308（批 4）/ #243（V 清单基建）/
//       #230（A 口径·§七禁止刷次数）/ #229（矩阵）/ #18 §5/§9/§7.5/§7.6/§7.7

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditVisual, checkV8, checkV2 } from '../scripts/audit-app-quality.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const APPS_DIR = join(ROOT, 'ios-desktop', 'apps');
const readApp = (id) => readFileSync(join(APPS_DIR, id, 'index.html'), 'utf-8');
/** 审计同口径：应用目录 .html/.css/.js/.mjs 合并文本（跳过 vendor/ 与 *.min.*） */
const readAppDir = (id) => {
  const dir = join(APPS_DIR, id);
  const files = readdirSync(dir).filter((f) => /\.(html|css|js|mjs)$/.test(f) && !/\.min\./.test(f) && f !== 'index.html');
  return readApp(id) + '\n' + files.map((f) => readFileSync(join(dir, f), 'utf-8')).join('\n');
};
const BASELINE = JSON.parse(readFileSync(join(ROOT, 'scripts/visual-baseline.json'), 'utf-8'));
const TOKENS = readFileSync(join(APPS_DIR, '_shared', 'md3-tokens.css'), 'utf-8');

const V8_CLEARED = ['clock-app', 'shortcuts', 'stocks', 'weather'];
const V2_CLEARED = ['chess', 'clock-app', 'game2048', 'threes'];
const REGISTERED = ['terminal'];

describe('v313 · #313 V 清单批 8（V8 深窄屏 4 家 + V2 字体阶梯 4 家直连）', () => {
  it('A1 · 端到端：V8 批 4 家逐家 auditVisual V8 pass（表面令牌消费 + 窄屏路径，审计目录合并口径）', () => {
    for (const id of V8_CLEARED) {
      const v = auditVisual(id, readAppDir(id));
      expect(v.items.V8.pass, `${id} V8 应 pass：${v.items.V8.detail}`).toBe(true);
    }
  });

  it('A2 · 端到端：V2 批 4 家逐家 auditVisual V2 pass（--md-text-font/--md-font 消费非提及）', () => {
    for (const id of V2_CLEARED) {
      const v = auditVisual(id, readAppDir(id));
      expect(v.items.V2.pass, `${id} V2 应 pass：${v.items.V2.detail}`).toBe(true);
    }
  });

  it('B1 · V8 形态锚：三家 max-width 真适配块在位（布局实质差异，非空查询）', () => {
    const clock = readApp('clock-app');
    expect(clock.match(/@media\s*\(max-width:400px\)/g)?.length, 'clock-app max-width:400 断点').toBe(1);
    expect(clock.includes('.noise-type-grid{grid-template-columns:repeat(2,1fr)}'), 'clock-app 噪声网格 3→2 列布局实质差异').toBe(true);
    expect(clock.includes('.time-box-card{font-size:36px;padding:6px 14px}'), 'clock-app 计时卡字号降档').toBe(true);
    const sc = readApp('shortcuts');
    expect(sc.match(/@media\(max-width:360px\)/g)?.length, 'shortcuts max-width:360 断点').toBe(1);
    expect(sc.includes('.shortcut-card{padding:12px;margin-bottom:10px;gap:10px}'), 'shortcuts 卡片内距收窄').toBe(true);
    const st = readApp('stocks');
    expect(st.match(/@media\s*\(max-width:400px\)/g)?.length, 'stocks max-width:400 断点').toBe(1);
    expect(st.includes('.stocks-container { padding-left: 12px; padding-right: 12px; }'), 'stocks 主容器内距收窄').toBe(true);
    // weather 窄屏路径原已具备（max-width:400px + min-width:760px 既有块），本卡仅补 surface 直连
    const wt = readApp('weather');
    expect(wt.match(/@media\s*\(max-width:\s*400px\)/g)?.length, 'weather 既有 max-width:400 块保留').toBe(1);
  });

  it('B2 · V8 形态锚：stocks/weather body 规则体直连规范令牌（别名间接消费→直连，R136 #312 先例同律）', () => {
    const st = readApp('stocks');
    expect(st.includes('background: var(--md-surface);'), 'stocks body 直连 var(--md-surface)').toBe(true);
    expect(st.includes('color: var(--md-on-surface);'), 'stocks body 直连 var(--md-on-surface)').toBe(true);
    const wt = readApp('weather');
    expect(wt.includes('background: var(--md-surface);'), 'weather body 直连 var(--md-surface)').toBe(true);
    expect(wt.includes('color: var(--md-on-surface);'), 'weather body 直连 var(--md-on-surface)').toBe(true);
  });

  it('B3 · V2 形态锚：chess 契约修复 + 棋子字形锚定豁免面', () => {
    const ch = readApp('chess');
    expect(ch.includes("font-family: var(--md-text-font);"), 'chess body 直连 var(--md-text-font)（硬编码栈契约修复）').toBe(true);
    expect(ch.includes("'Roboto', 'Noto Sans SC', sans-serif"), 'chess body 旧硬编码栈已移除').toBe(false);
    expect(ch.includes(".ch-piece { font-size: clamp(20px, 7.6vw, 34px); line-height: 1; pointer-events: none; font-family: 'Noto Sans Symbols 2', 'Segoe UI Symbol', 'Roboto', sans-serif; }"), '棋子 unicode 字形显式锚定（不随 body 衬线契约漂移）').toBe(true);
  });

  it('B4 · V2 形态锚：clock-app/game2048/threes fallback 等值直连（自定义字体优先机制逐字保留）', () => {
    const clock = readApp('clock-app');
    expect(clock.includes('--f:var(--custom-user-font,var(--md-text-font));'), 'clock-app --f fallback 直连（--custom-user-font 优先机制保留）').toBe(true);
    const g = readApp('game2048');
    expect(g.includes("--font:'Playfair Display',var(--md-text-font);"), 'game2048 --font fallback 直连（Playfair Display 品牌面保留）').toBe(true);
    const t = readApp('threes');
    expect(t.includes("--font: var(--custom-font, 'Nunito', system-ui), var(--md-text-font), 'Noto Sans Symbols 2', sans-serif;"), 'threes --font 等值直连（--custom-font 优先保留）').toBe(true);
  });

  it('C1 · 快照对账：V8 4 家 true 且全库 V8 缺口清零；V2 4 家 true + terminal false 非缺口登记', () => {
    for (const id of V8_CLEARED) expect(BASELINE[id]?.V8, `${id} 快照 V8=true`).toBe(true);
    for (const id of V2_CLEARED) expect(BASELINE[id]?.V2, `${id} 快照 V2=true`).toBe(true);
    expect(BASELINE['terminal']?.V2, 'terminal 快照 V2=false（非缺口登记，R133 #309 先例同律）').toBe(false);
    const v8Fails = Object.entries(BASELINE).filter(([, v]) => !v.V8).map(([k]) => k);
    expect(v8Fails, '全库 V8 缺口清零（43/43）').toEqual([]);
    const v2Fails = Object.entries(BASELINE).filter(([, v]) => !v.V2).map(([k]) => k);
    expect(v2Fails, 'V2 余量仅 terminal（非缺口登记）').toEqual(['terminal']);
  });

  it('D1 · terminal 非缺口登记文面：等宽功能本体 + 契约豁免语义（#309 先例同律，留 #229 裁决）', () => {
    const tm = readApp('terminal');
    // body 级等宽栈原样在位 —— 终端栅格对齐是功能本体（tm-out/tm-inrow/tm-side 全等宽），非场景化点缀
    expect(tm.includes("font-family: 'Roboto Mono', ui-monospace, Menlo, Consolas, monospace;"), 'terminal body 等宽栈原样保留（功能本体）').toBe(true);
    // V2 契约注记豁免语义：md3-tokens.css「场景化等宽/品牌展示字体（类内作用域）不在此约束内」
    expect(TOKENS.includes('场景化等宽/品牌展示字体'), '契约注记豁免语义在位（tokens v7.58 区块）').toBe(true);
    expect(BASELINE['terminal']?.V2).toBe(false);
  });

  it('E1 · 零漂移抽证：直连等值依据链（映射体逐字 + fallback 首项逐位等值）', () => {
    // stocks/weather 直连的等值依据：--md-sys-color-background/on-background 映射定义体逐字断言
    expect(TOKENS.includes('--md-sys-color-background: var(--md-surface);'), 'tokens 映射体：background→surface 逐字等值').toBe(true);
    expect(TOKENS.includes('--md-sys-color-on-background: var(--md-on-surface);'), 'tokens 映射体：on-background→on-surface 逐字等值').toBe(true);
    // V2 直连的等值依据：--md-text-font 首项 'Noto Serif SC' 与各 fallback 原首项逐位一致
    expect(TOKENS.includes("--md-text-font: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;"), '令牌首项 Noto Serif SC（fallback 等值锚）').toBe(true);
    // --custom-user-font/--custom-font 注入机制引用面在位（wallpaper.js set-font 链路依赖）
    expect(readApp('clock-app').includes('var(--custom-user-font,'), 'clock-app 自定义字体注入优先机制保留').toBe(true);
    expect(readApp('threes').includes('var(--custom-font,'), 'threes 自定义字体注入优先机制保留').toBe(true);
  });
});
