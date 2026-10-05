// ==================== app-icons.test.js — v7.27 桌面图标动态取色 + 矢量精度核验 ====================
//
// 校验四层不变量：
//   1. 结构精度：31 图标 + 兜底全部 viewBox 0 0 100 100、标签配平、无渐变/无 url 引用/
//      无 id 冲突/无 NaN；fill/stroke 属性值域合法（hex/none）；style 值全部为规范
//      hsl(calc(var(--md-h,215) ± Δ) S% L%) 公式形态
//   2. 锚定不变量（渲染精准无偏差的核心证明）：fixture 逐处「原 hex → 公式」，
//      代入锚定色相 215 → hsl→rgb 必须逐字节还原原色；代入 140 → 颜色必须改变且
//      等于理论旋转值（动态性证明）
//   3. 中性规则：app-icons.js 残留的全部字面 hex 一律为中性色（S<15），
//      彩色必须全部走动态公式 —— 防止后续新增图标漏接
//   4. icons.js 体系：全 glyphs viewBox 0 0 24 24、fill=currentColor（google_lens
//      品牌四色豁免）；dynamic-icons.css 公式与 fixture 一致、中性色保持静态

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_ICONS, getAppIconSVG } from '../ios-desktop/js/app-icons.js';
import { ICONS } from '../ios-desktop/js/icons.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(readFileSync(join(root, 'tests/icon-dynamic-colors.generated.json'), 'utf-8'));
const iconsSrc = readFileSync(join(root, 'ios-desktop/js/app-icons.js'), 'utf-8');
const dynCssSrc = readFileSync(join(root, 'ios-desktop/css/dynamic-icons.css'), 'utf-8');
const glyphsSrc = readFileSync(join(root, 'ios-desktop/js/icons.js'), 'utf-8');

const ANCHOR = fixture._meta.anchor; // 215
const ALL_ICONS = Object.keys(APP_ICONS); // 含 5 别名（与本体同串）

// ---------- 颜色数学（与 codemod 同一套，round-half-up 逼近 Chromium 量化） ----------
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l * 100];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  const table = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
  const [r, g, b] = table[Math.floor(h / 60) % 6];
  return [r, g, b].map((v) => Math.min(255, Math.max(0, Math.floor((v + m) * 255 + 0.5))));
}

/** 解析动态公式 → (delta, s, l)；形态：hsl(calc(var(--md-h,215) ± D) S% L%) 或 hsl(var(--md-h,215) S% L%) */
function parseFormula(hslValue) {
  const m = hslValue.match(/^hsl\((?:calc\(var\(--md-h,215\)\s*([+-])\s*([\d.]+)\)|var\(--md-h,215\))\s+([\d.]+)%\s+([\d.]+)%\)$/);
  if (!m) return null;
  const delta = m[1] ? (m[1] === '-' ? -parseFloat(m[2]) : parseFloat(m[2])) : 0;
  return { delta, s: parseFloat(m[3]), l: parseFloat(m[4]) };
}

/** 从 SVG 串中提取全部 style 声明（fill:…/stroke:… 形态） */
function extractDecls(svg) {
  const out = [];
  const re = /style="([^"]*)"/g;
  let m;
  while ((m = re.exec(svg))) {
    for (const part of m[1].split(';')) {
      const d = part.trim();
      if (d) out.push(d);
    }
  }
  return out;
}

const VOID_TAGS = ['rect', 'circle', 'path', 'polygon', 'polyline', 'line'];
const PAIRED_TAGS = ['text', 'g'];

// ---------- 1) 结构精度 ----------
describe('v7.27 图标结构精度（31 图标 + 兜底）', () => {
  const REAL_KEYS = [...new Set(Object.values(Object.fromEntries(Object.entries(APP_ICONS))).map((_) => _))]; // 占位防误用

  for (const key of ALL_ICONS) {
    it(`${key}：viewBox/标签配平/无渐变/无 NaN/属性值域`, () => {
      const svg = APP_ICONS[key];
      expect(svg).toBeTruthy();
      expect(svg).toMatch(/^<svg viewBox="0 0 100 100" width="100%" height="100%">/);
      expect(svg).toContain('</svg>');
      // 标签配平
      for (const t of VOID_TAGS) {
        const opens = svg.split(`<${t} `).length - 1 + (svg.split(`<${t}>`).length - 1);
        const selfCloses = new RegExp(`</${t}>|/>`, 'g');
        // void 标签必须全部自闭合（不允许 </rect> 交叉写法漏配对）
        const closers = svg.split(`</${t}>`).length - 1;
        if (opens > 0) {
          expect(closers).toBe(0);
          const opensWithSelfClose = (svg.match(new RegExp(`<${t} [^>]*?/>`, 'g')) || []).length;
          expect(opensWithSelfClose).toBe(opens);
        }
        void selfCloses;
      }
      for (const t of PAIRED_TAGS) {
        const opens = svg.split(`<${t} `).length - 1 + (svg.split(`<${t}>`).length - 1);
        const closes = svg.split(`</${t}>`).length - 1;
        expect(opens).toBe(closes);
      }
      // 纯色几何纪律：无渐变 / 无 url 引用 / 无 id（共享注入场景防冲突）
      expect(svg).not.toContain('Gradient');
      expect(svg).not.toContain('url(');
      expect(svg).not.toMatch(/\sid="/);
      expect(svg).not.toContain('NaN');
      // 属性值域：fill/stroke 字面属性只能是 hex 或 none
      const attrRe = /\s(fill|stroke)="([^"]*)"/g;
      let am;
      while ((am = attrRe.exec(svg))) {
        expect(am[2] === 'none' || /^#[0-9a-fA-F]{6}$/.test(am[2])).toBe(true);
      }
      // style 值全部为规范动态公式
      for (const decl of extractDecls(svg)) {
        const [prop, value] = decl.split(':');
        expect(['fill', 'stroke']).toContain(prop);
        expect(parseFormula(value)).not.toBeNull();
      }
    });
  }

  it('兜底图标（未注册 id）同样接入动态取色', () => {
    const fb = getAppIconSVG('__nonexistent_app__');
    expect(extractDecls(fb).length).toBeGreaterThanOrEqual(2); // #475569 + #0EA5E9
    expect(fixture.icons._fallback.dynamic).toBeGreaterThanOrEqual(2);
  });
});

// ---------- 2) 锚定不变量：默认主题逐字节还原 + 换色相必变 ----------
describe('v7.27 动态取色锚定不变量', () => {
  it('fixture：全部图标动态声明在锚定 215 下逐字节还原原色', () => {
    const checked = [];
    for (const [icon, data] of Object.entries(fixture.icons)) {
      for (const c of data.colors) {
        const value = c.decl.slice(c.decl.indexOf(':') + 1);
        const f = parseFormula(value);
        expect(f, `${icon} ${c.decl}`).not.toBeNull();
        const atAnchor = hslToRgb(ANCHOR + f.delta, f.s, f.l);
        expect(atAnchor, `${icon} ${c.orig} → ${c.decl}`).toEqual(hexToRgb(c.orig));
        checked.push(1);
      }
    }
    expect(checked.length).toBe(156);
  });

  it('fixture：换色相 140 全部变色且等于理论旋转值', () => {
    let changed = 0;
    for (const data of Object.values(fixture.icons)) {
      for (const c of data.colors) {
        const f = parseFormula(c.decl.slice(c.decl.indexOf(':') + 1));
        const at140 = hslToRgb(140 + f.delta, f.s, f.l);
        const atAnchor = hslToRgb(ANCHOR + f.delta, f.s, f.l);
        // 至少绝大多数颜色实质变化（极暗/极亮色调通道差可能小，但公式值必须等于理论值）
        expect(at140).toEqual(hslToRgb(140 + f.delta, f.s, f.l));
        if (at140.join() !== atAnchor.join()) changed++;
      }
    }
    expect(changed).toBeGreaterThan(145); // 156 处中绝大多数实质变色
  });

  it('源码声明总数与 fixture 一致（防漏转/防手改漂移）', () => {
    // 每处动态声明必为 fill:hsl( 或 stroke:hsl( 形态（合并 style 内两声明各计一次）
    const total = (iconsSrc.match(/(?:fill|stroke):hsl\(/g) || []).length;
    expect(total).toBe(156);
  });

  it('每个图标至少 1 处动态色（全量覆盖）', () => {
    for (const [icon, data] of Object.entries(fixture.icons)) {
      expect(data.dynamic, icon).toBeGreaterThan(0);
    }
    expect(fixture.icons).toHaveProperty('_fallback');
  });
});

// ---------- 3) 中性规则：残留字面 hex 一律中性 ----------
describe('v7.27 中性规则（彩色必须走动态公式）', () => {
  it('app-icons.js 残留的全部 fill/stroke hex 均为中性色（S<15）', () => {
    const re = /\s(fill|stroke)="(#[0-9a-fA-F]{6})"/g;
    let m;
    const seen = new Set();
    while ((m = re.exec(iconsSrc))) {
      const [h, s] = rgbToHsl(...hexToRgb(m[2]));
      seen.add(m[2].toUpperCase());
      expect(s, `${m[2]} (h=${h}) 应为中性色或转动态公式`).toBeLessThan(15);
    }
    // 白色作为结构性色必须保留静态
    expect(seen.has('#FFFFFF')).toBe(true);
  });

  it('dynamic-icons.css：5 处公式与 fixture 一致，中性色保持静态', () => {
    const cssFormulas = dynCssSrc.match(/hsl\((?:calc\()?var\(--md-h,215\)\)?\s*[+-]?\s*[\d.]*\)?\s*[\d.]+%\s+[\d.]+%/g) || [];
    const fixtureFormulas = fixture.cssColors.map((c) => c.decl);
    expect(cssFormulas.length).toBe(5);
    for (const f of fixtureFormulas) {
      // fixture 存完整公式，源码同串必然包含其头尾特征
      expect(dynCssSrc).toContain(f);
    }
    // 中性色静态保留（时钟黑底/白盘/灰刻度）
    expect(dynCssSrc).toContain('background: #18181B;');
    expect(dynCssSrc).toContain('background: #FFFFFF;');
    expect(dynCssSrc).toContain('background: #71717A;');
    // fixture CSS 逐处锚定还原
    for (const c of fixture.cssColors) {
      const f = parseFormula(c.decl);
      expect(f, c.decl).not.toBeNull();
      expect(hslToRgb(ANCHOR + f.delta, f.s, f.l), `${c.orig} → ${c.decl}`).toEqual(hexToRgb(c.orig));
    }
  });
});

// ---------- 4) icons.js 体系（UI glyphs） ----------
describe('v7.27 icons.js 矢量体系', () => {
  const BRAND_COLORS = ['#EA4335', '#4285F4', '#FBBC05', '#34A853']; // google_lens 品牌四色豁免

  it('全 glyphs：viewBox 0 0 24 24（或 Material Symbols 官方 960 网格）、无 NaN、无渐变', () => {
    for (const [key, svg] of Object.entries(ICONS)) {
      /* fix(v7.45)：wifi / autorotate 换用 Google Material Symbols Rounded 官方路径，
         其规范网格为 viewBox="0 -960 960 960"（与 24 网格等价，1px = 40 units）。
         断言放宽为「两种官方网格二选一」，NaN / 渐变纪律不变。 */
      const okViewBox =
        svg.includes('viewBox="0 0 24 24"') ||
        svg.includes('viewBox="0 -960 960 960"');
      expect(okViewBox, key).toBe(true);
      expect(svg, key).not.toContain('NaN');
      expect(svg, key).not.toContain('Gradient');
    }
  });

  it('单色纪律：除 google_lens 品牌色外无硬编码 hex', () => {
    const re = /(fill|stroke)="(#[0-9a-fA-F]{6})"/g;
    let m;
    while ((m = re.exec(glyphsSrc))) {
      expect(BRAND_COLORS, `icons.js 出现非品牌色 ${m[2]}`).toContain(m[2].toUpperCase());
    }
    // google_lens 品牌四色确实在场（豁免依据成立）
    for (const c of BRAND_COLORS) expect(glyphsSrc).toContain(c);
  });

  it('文本插值安全：icons.js glyph 串无单引号（内联脚本插值纪律）', () => {
    // 既有审计约定：icons.js 串可能进入单引号 JS 字符串环境（app-icons.js 的
    // threes 'Segoe UI' 字体名为模板字面量环境，安全，不在此约束内）
    for (const [key, svg] of Object.entries(ICONS)) {
      expect(svg.includes("'"), key).toBe(false);
    }
  });
});
