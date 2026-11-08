// ==================== v246 测试 — 脚手架视觉基线 + #244 建议② P0 三应用补令牌（v10.59 R124 窗） ====================
//
// #246（脚手架「只给骨架不给皮」）+ #244 建议②（未接入清单逐应用补令牌，P0 三家先行）：
//   · 两脚手架模板内建状态层/字体契约/形状令牌示范（D 面 0/41 全库破零示范，生成即合规）
//   · terminal（md=0 全零应用）→ --t-* 八变量全量从 --md-* 派生 + 快捷命令平板分栏
//   · driving → scrim color-mix 派生加深面 + grid-template-areas 真分栏（零 HTML 改动）
//   · code-editor → 面板/弹层令牌收口 + 平板侧栏加宽增强
//
// 边界（#244 原文遵守）：不新建令牌体系、不改三应用既有视觉风格（原值全部降为
// fallback / color-mix 保层级）、不引入硬门禁。CM6 语法高亮语义色与 AOSP 交通
// 标志白底属功能性语义豁免口径（docs/visual-token-adoption.md 第六节同律）。
//
// 断言面：
//  A. 两模板基线锚（状态层/字体契约/形状示范在位，只增不减）
//  B. 三应用 A 色彩门槛复算锚（var(--md- ≥15 且密度 ≥4/100 行）
//  C. 三应用状态层破零锚（var(--md-state- ≥1）
//  D. 三应用 760 真分栏锚（min-width:760px 块内含实质布局差异，audit LAYOUT_DIFF 同口径）
//  E. terminal 语义派生 + 快捷命令面板锚
//  F. driving/code-editor scrim 派生锚（color-mix 保层级，裸 rgba 加深面清零）
//  G. adoption 文档一致性锚（数字与扫描器实测同步，防回退）
//  H. 回归保护锚（模板 mdslider 组件接入不退化 + 三应用零自定义滑块伪元素）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const TPL = read('scripts/app-template.html');
const TPL_MULTI_CSS = read('scripts/app-template-multi/style.css');
const TERMINAL = read('ios-desktop/apps/terminal/index.html');
const DRIVING = read('ios-desktop/apps/driving/index.html');
const CODEEDITOR = read('ios-desktop/apps/code-editor/index.html');
const CODEEDITOR_MJS = read('ios-desktop/apps/code-editor/app.mjs');
const ADOPTION = read('docs/visual-token-adoption.md');

const count = (text, re) => (text.match(re) || []).length;
const mdCount = (text) => count(text, /var\(--md-/g);
const stateCount = (text) => count(text, /var\(--md-state-/g);

// ---------- A. 两模板基线锚 ----------
describe('v246 A · 脚手架模板视觉基线（#246 建议①②：状态层破零示范 + 字体契约 + 形状）', () => {
  it('单文件模板内建状态层/字体契约/形状三面示范', () => {
    expect(stateCount(TPL)).toBeGreaterThanOrEqual(1); // .card:hover --md-state-hover
    expect(TPL).toMatch(/var\(--md-font,/);            // body 字体契约
    expect(TPL).toMatch(/var\(--md-r-lg,/);            // .card 圆角令牌（fallback 保视觉）
    expect(TPL).toMatch(/v10\.\d+ #246/);               // 升格记录防误删（版本无关锚：roll 只滚字面量，\d 形态不被重写）
  });
  it('多文件模板 style.css 内建状态层/字体契约/形状示范（index.html 骨架态常态）', () => {
    expect(stateCount(TPL_MULTI_CSS)).toBeGreaterThanOrEqual(3); // tb/card/sq hover + btn pressed
    expect(TPL_MULTI_CSS).toMatch(/var\(--md-font,/);
    expect(TPL_MULTI_CSS).toMatch(/var\(--md-r-lg,/);
    expect(TPL_MULTI_CSS).toMatch(/var\(--md-state-pressed/);    // pressed 12% 示范
  });
  it('模板滑块组件接入不退化（audit D 门禁同口径）', () => {
    expect(TPL).toMatch(/class="mdslider"/);
    expect(TPL).not.toMatch(/::-webkit-slider-thumb|::-moz-range-thumb/);
    expect(TPL_MULTI_CSS).not.toMatch(/::-webkit-slider-thumb|::-moz-range-thumb/);
  });
});

// ---------- B. 三应用 A 色彩门槛复算锚 ----------
describe('v246 B · P0 三应用 A 门槛（#229 口径：md ≥15 且密度 ≥4/100 行）', () => {
  const cases = [
    ['terminal', TERMINAL, 15],
    ['driving', DRIVING, 36],
    ['code-editor', CODEEDITOR + CODEEDITOR_MJS, 27],
  ];
  for (const [name, text, minMd] of cases) {
    it(`${name}: md≥15 且 密度≥4.0（当前 md=${mdCount(text)}）`, () => {
      const n = mdCount(text);
      const lines = text.split('\n').length;
      expect(n).toBeGreaterThanOrEqual(15);
      expect(n).toBeGreaterThanOrEqual(minMd - 3); // 防回落（留 ±3 重构余量）
      expect((n * 100) / lines).toBeGreaterThanOrEqual(4.0);
    });
  }
});

// ---------- C. 三应用状态层破零锚 ----------
describe('v246 C · 状态层令牌破零（全库 0/41 → 三应用首批）', () => {
  it('terminal 含 --md-state-hover/pressed 消费', () => {
    expect(stateCount(TERMINAL)).toBeGreaterThanOrEqual(3);
  });
  it('driving 含 --md-state-hover/pressed 消费（chips/opts/nav 三组件面）', () => {
    expect(stateCount(DRIVING)).toBeGreaterThanOrEqual(6);
    expect(DRIVING).toMatch(/\.dv-chip:hover \{ background: var\(--md-state-hover\)/);
    expect(DRIVING).toMatch(/\.dv-nav button:active \{ background: var\(--md-state-pressed\)/);
  });
  it('code-editor 含 --md-state-hover 消费', () => {
    expect(stateCount(CODEEDITOR)).toBeGreaterThanOrEqual(2);
  });
});

// ---------- D. 三应用 760 真分栏锚（audit LAYOUT_DIFF_RE 同口径） ----------
const LAYOUT_DIFF_RE =
  /(grid-template-columns|grid-template-rows|grid-auto-flow|flex-direction|flex-basis|column-count|display\s*:\s*(none|flex|grid)|order\s*:)/;
function extract760Blocks(text) {
  const blocks = [];
  const re = /@media\s*\([^)]*min-width\s*:\s*760px[^)]*\)\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    let depth = 1, i = re.lastIndex;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    blocks.push(text.slice(re.lastIndex, i - 1));
  }
  return blocks;
}
describe('v246 D · 平板 760 真分栏（#229 B 门槛 + #230 实质布局差异）', () => {
  for (const [name, text] of [['terminal', TERMINAL], ['driving', DRIVING], ['code-editor', CODEEDITOR]]) {
    it(`${name} 含 min-width:760px 且块内有实质布局差异`, () => {
      const blocks = extract760Blocks(text);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(blocks.some((b) => LAYOUT_DIFF_RE.test(b))).toBe(true);
    });
  }
  it('driving 分栏为 grid-template-areas 双栏（零 HTML 改动范式）', () => {
    expect(DRIVING).toMatch(/grid-template-areas:\s*\n?\s*"head\s+head"/);
    expect(DRIVING).toMatch(/\.dv-segrow \{ grid-area: chips/);
  });
  it('terminal 分栏为快捷命令侧栏（aside + renderSidePanel 单源）', () => {
    expect(TERMINAL).toMatch(/<aside class="tm-side" id="tmSide" aria-label="快捷命令面板">/);
    expect(TERMINAL).toMatch(/function renderSidePanel/);
    expect(TERMINAL).toMatch(/flex-direction: row/);
  });
});

// ---------- E. terminal 语义派生锚 ----------
describe('v246 E · terminal 令牌派生（全零应用 → 规范令牌单源）', () => {
  it('--t-* 语义色全部从 --md-* 派生（原值降 fallback）', () => {
    expect(TERMINAL).toMatch(/--t-bg: var\(--md-surface, #0d1112\)/);
    expect(TERMINAL).toMatch(/--t-fg: var\(--md-on-surface, #cfd8dc\)/);
    expect(TERMINAL).toMatch(/--t-dim: var\(--md-on-surface-variant, #78909c\)/);
    expect(TERMINAL).toMatch(/--t-user: var\(--md-success, #4ade80\)/);
    expect(TERMINAL).toMatch(/--t-err: var\(--md-error, #f87171\)/);
  });
  it('输入行/选区/滚动条令牌化（含运动令牌）', () => {
    expect(TERMINAL).toMatch(/border-top: 1px solid var\(--md-outline-variant\); background: var\(--md-state-hover\)/);
    expect(TERMINAL).toMatch(/::selection \{ background: color-mix\(in srgb, var\(--md-success\)/);
    expect(TERMINAL).toMatch(/scrollbar-thumb \{ background: var\(--md-outline\)/);
    expect(count(TERMINAL, /var\(--md-(easing|duration)-/g)).toBeGreaterThanOrEqual(6);
  });
  it('快捷命令面板从 terminal-core COMMANDS 单源取集（零硬编码命令实现）', () => {
    expect(TERMINAL).toMatch(/core\.COMMANDS\[name\]/);
    expect(TERMINAL).toMatch(/input\.focus\(\)/); // 点击即填入不自动回车
  });
});

// ---------- F. driving/code-editor scrim 派生锚 ----------
describe('v246 F · 加深面 scrim color-mix 派生（原 rgba 黑层清零 + 层级保真）', () => {
  it('driving 四层级加深面全部 scrim 派生（0.18/0.2/0.14/0.24 → 30%/33%/23%/40%）', () => {
    expect(DRIVING).toMatch(/--dv-card: color-mix\(in srgb, var\(--md-scrim\) 30%/);
    expect(DRIVING).toMatch(/var\(--md-scrim\) 33%/);
    expect(DRIVING).toMatch(/var\(--md-scrim\) 23%/);
    expect(DRIVING).toMatch(/var\(--md-scrim\) 40%/);
    expect(count(DRIVING, /rgba\(0,\s*0,\s*0/g)).toBe(0); // 黑层裸值清零
    expect(count(DRIVING, /var\(--md-r-full/g)).toBeGreaterThanOrEqual(7);
  });
  it('driving 交通标志白底保留（AOSP 功能语义豁免，注释在位）', () => {
    expect(DRIVING).toMatch(/rgba\(255,\s*255,\s*255,\s*\.92\)/);
    expect(DRIVING).toMatch(/功能性语义色/);
  });
  it('code-editor 面板/弹层 scrim 派生 + 圆角五档收口', () => {
    expect(CODEEDITOR).toMatch(/--ce-panel: color-mix\(in srgb, var\(--md-scrim\) 37%/);
    expect(CODEEDITOR).toMatch(/var\(--md-scrim\) 83%/);
    expect(CODEEDITOR).toMatch(/var\(--md-r-lg\)/);
    expect(CODEEDITOR).toMatch(/flex-basis: 264px/); // 平板侧栏加宽
    expect(count(CODEEDITOR, /rgba\(0,\s*0,\s*0/g)).toBe(0);
  });
  it('CM6 语法高亮语义色自留（编辑器域豁免口径）', () => {
    expect(CODEEDITOR_MJS).toMatch(/#c8b1ff|#bac8ff/); // 高亮色仍在
  });
});

// ---------- G. adoption 文档一致性锚 ----------
describe('v246 G · adoption.md 与实测同步（防文档回退）', () => {
  it('总览数字为 R124 落地后实测（A 18/41 · D 3/41 · F 3/41）', () => {
    expect(ADOPTION).toMatch(/\| A · 动态取色（#229 A 门槛：var\(--md- ≥15 且 ≥4 处\/100 行） \| \*\*11\/21（52%）\*\* \| \*\*7\/20（35%）\*\* \| \*\*18\/41（44%）\*\* \|/);
    expect(ADOPTION).toMatch(/\*\*3\/41（7%）\*\*/); // D 与 F 面
    expect(ADOPTION).toMatch(/#244 建议②落地/);
    expect(ADOPTION).toMatch(/\| terminal \| 685 \| 33 \| 4\.8 \| 12 \| ✓ \| ✗ \| 0 \| 1 \| 3 \| 1 \| 1 \| 10 \|/);
    expect(ADOPTION).toMatch(/\| driving \| 918 \| 45 \| 4\.9 \| 8 \| ✓ \| ✓ \| 7 \| 7 \| 8 \| 1 \| 1 \| 9 \|/);
    expect(ADOPTION).toMatch(/\| code-editor \| 685 \| 36 \| 5\.3 \| 37 \| ✓ \| ✓ \| 8 \| 4 \| 2 \| 1 \| 7 \| 7 \|/);
  });
  it('P0 清单标记三应用已落地', () => {
    expect(ADOPTION).toMatch(/R124 已全部落地/);
    expect(ADOPTION).toMatch(/33引\/密4\.8（✓）/);
  });
});

// ---------- H. 回归保护锚 ----------
describe('v246 H · 回归保护', () => {
  it('三应用零自定义滑块伪元素（audit D 门禁硬 fail 面）', () => {
    for (const [name, text] of [['terminal', TERMINAL], ['driving', DRIVING], ['code-editor', CODEEDITOR]]) {
      expect(text, name).not.toMatch(/::-webkit-slider-thumb|::-moz-range-thumb/);
    }
  });
  it('terminal 全量 textContent 渲染纪律不退化（零 innerHTML 输出面）', () => {
    expect(TERMINAL).not.toMatch(/innerHTML\s*=/);
    expect(TERMINAL).toMatch(/textContent = text == null \? '' : String\(text\)/);
  });
  it('driving createElementNS 零 innerHTML 纪律不退化', () => {
    expect(DRIVING).not.toMatch(/innerHTML\s*=/);
  });
});
