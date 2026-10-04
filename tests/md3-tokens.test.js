// ==================== md3-tokens.test.js — v7.26 MD3 统一令牌层一致性 ====================
//
// 校验「单一真源」三方一致：
//   1. apps/_shared/md3-tokens.css 暗色基线公式 ≡ theme-engine.generateMD3CssTokens(hue,'dark')
//   2. 共享层 [data-theme-mode="light"] ≡ generateMD3CssTokens(hue,'light')
//      ≡ css/theme-mode.css body.light-theme（宿主浅色公式逐字一致）
//   3. --md-sys-color-* 别名一一对应规范名
//   4. 全部 21 个 iframe 应用挂载共享层，且不再以自建定义遮蔽规范令牌名
//   5. 独立打开跟随系统外观分支存在且被 :not([data-theme-mode]) 防双重生效

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateMD3CssTokens } from '../ios-desktop/js/theme-engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sharedCss = readFileSync(join(root, 'ios-desktop/apps/_shared/md3-tokens.css'), 'utf-8');
const modeCss = readFileSync(join(root, 'ios-desktop/css/theme-mode.css'), 'utf-8');

/** 从 CSS 文本中提取某块内的令牌映射 */
function extractTokens(blockCss) {
  const map = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(blockCss))) map[m[1].trim()] = m[2].trim();
  return map;
}

/**
 * 公式归一化：语法形式不同（引擎=代入色相的逗号旧语法 hsl(215, 82%, 36%)；
 * 共享层=var 引用的空格新语法 hsl(var(--md-h) 82% 36%)），语义一致才算一致。
 * 归一：代入 hue → 求值 calc(N + 60) → 逗号转空格。
 */
function normalize(value, hue) {
  return value
    .replace(/var\(--md-h\)/g, String(hue))
    .replace(/calc\((\d+)\s*\+\s*(\d+)\)/g, (_, a, b) => String((Number(a) + Number(b)) % 360))
    .replace(/hsl\(([^)]*)\)/g, (_, inner) => `hsl(${inner.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()})`)
    .replace(/\s+/g, ' ')
    .trim();
}

/** generateMD3CssTokens 输出 → 令牌映射 */
function engineTokens(hue, mode) {
  return extractTokens(generateMD3CssTokens(hue, mode));
}

const sharedDark = extractTokens(sharedCss.match(/:root\s*\{([\s\S]*?)\}/)[1].replace(/\/\*[\s\S]*?\*\//g, ''));
const sharedLightMatch = sharedCss.match(/:root\[data-theme-mode="light"\]\s*\{([\s\S]*?)\}/);
const sharedLight = extractTokens(sharedLightMatch[1]);
const hostLight = extractTokens(modeCss.match(/body\.light-theme\s*\{([\s\S]*?)\}/)[1]);

describe('v7.26 共享令牌层 ↔ 主题引擎（暗色基线）', () => {
  it('暗色公式与 generateMD3CssTokens(hue, dark) 语义一致（归一化后逐字对照）', () => {
    const HUE = 215;
    const eng = engineTokens(HUE, 'dark');
    for (const [k, v] of Object.entries(eng)) {
      expect(normalize(sharedDark[k], HUE), `令牌 ${k}`).toBe(normalize(v, HUE));
    }
    expect(Object.keys(eng).length).toBeGreaterThan(20);
  });

  it('引擎暗色输出随色相变化（Material You 动态取色）', () => {
    const a = engineTokens(120, 'dark');
    const b = engineTokens(300, 'dark');
    expect(a['--md-primary']).not.toBe(b['--md-primary']);
    expect(a['--md-surface']).not.toBe(b['--md-surface']);
  });
});

describe('v7.26 浅色方案三方一致', () => {
  it('共享层浅色 ≡ generateMD3CssTokens(hue, light)', () => {
    const HUE = 215;
    const eng = engineTokens(HUE, 'light');
    for (const [k, v] of Object.entries(eng)) {
      if (!(k in sharedLight)) continue; // 浅色块合法地不重复定义 --md-h 等继承令牌
      expect(normalize(sharedLight[k], HUE), `令牌 ${k}`).toBe(normalize(v, HUE));
    }
  });

  it('共享层浅色 ≡ 宿主 theme-mode.css body.light-theme（共同维护的公式不漂移）', () => {
    // 宿主侧浅色块未覆盖的令牌（如 --md-tertiary 基色）跳过，只比对两边都定义的
    let compared = 0;
    for (const [k, v] of Object.entries(hostLight)) {
      if (k in sharedLight) {
        expect(normalize(sharedLight[k], 215), `令牌 ${k}`).toBe(normalize(v, 215));
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(10);
  });
});

describe('v7.26 官方全名别名（--md-sys-color-* → 规范名）', () => {
  it('别名一一映射到对应规范角色', () => {
    const aliases = {
      '--md-sys-color-primary': '--md-primary',
      '--md-sys-color-on-primary': '--md-on-primary',
      '--md-sys-color-primary-container': '--md-primary-container',
      '--md-sys-color-on-primary-container': '--md-on-primary-container',
      '--md-sys-color-secondary': '--md-secondary',
      '--md-sys-color-secondary-container': '--md-secondary-container',
      '--md-sys-color-tertiary': '--md-tertiary',
      '--md-sys-color-tertiary-container': '--md-tertiary-container',
      '--md-sys-color-surface': '--md-surface',
      '--md-sys-color-on-surface': '--md-on-surface',
      '--md-sys-color-surface-container': '--md-surface-container',
      '--md-sys-color-surface-container-high': '--md-surface-container-high',
      '--md-sys-color-surface-container-highest': '--md-surface-container-highest',
      '--md-sys-color-on-surface-variant': '--md-on-surface-variant',
      '--md-sys-color-outline': '--md-outline',
      '--md-sys-color-outline-variant': '--md-outline-variant',
      '--md-sys-color-error': '--md-error',
      '--md-sys-color-on-error': '--md-on-error',
      // 规范已弃用角色（Flutter ColorScheme 3.18 起废弃 background → surface）
      '--md-sys-color-background': '--md-surface',
      '--md-sys-color-on-background': '--md-on-surface',
    };
    for (const [alias, canon] of Object.entries(aliases)) {
      expect(sharedDark[alias], `别名 ${alias}`).toBe(`var(${canon})`);
    }
  });
});

describe('v7.26 全部 iframe 应用接入共享令牌层', () => {
  const appsDir = join(root, 'ios-desktop/apps');

  function iframeApps() {
    return readdirSync(appsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== '_shared')
      .map(d => d.name)
      .sort();
  }

  it('21 个应用全部挂载 _shared/md3-tokens.css', () => {
    const apps = iframeApps();
    expect(apps.length).toBe(21);
    for (const app of apps) {
      const html = readFileSync(join(appsDir, app, 'index.html'), 'utf-8');
      expect(html.includes('../_shared/md3-tokens.css'), `${app} 未挂载共享令牌层`).toBe(true);
    }
  });

  it('无应用以自建定义遮蔽规范令牌名（单一真源）', () => {
    const CANON = /^\s*--md-(primary|on-primary|primary-container|on-primary-container|secondary|on-secondary|secondary-container|on-secondary-container|tertiary|on-tertiary|tertiary-container|on-tertiary-container|surface|surface-dim|surface-bright|surface-container-lowest|surface-container-low|surface-container|surface-container-high|surface-container-highest|on-surface|on-surface-variant|outline|outline-variant|scrim|accent|accent-container|error|on-error|error-container|on-error-container|success|on-success|warning)\s*:\s*(?!var\()/;
    for (const app of iframeApps()) {
      const html = readFileSync(join(appsDir, app, 'index.html'), 'utf-8');
      for (const rb of html.matchAll(/:root\s*\{([^}]*)\}/g)) {
        for (const ln of rb[1].split('\n')) {
          if (CANON.test(ln)) {
            throw new Error(`${app} 遮蔽规范令牌: ${ln.trim().slice(0, 60)}`);
          }
        }
      }
    }
  });

  it('浅色跟随分支存在且被 :not([data-theme-mode]) 守卫（宿主接管后不双重生效）', () => {
    expect(sharedCss.includes('@media (prefers-color-scheme: light)')).toBe(true);
    expect(sharedCss.includes(':root:not([data-theme-mode])')).toBe(true);
  });
});
