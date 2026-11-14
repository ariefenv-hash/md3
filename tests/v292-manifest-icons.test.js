// ==================== v11.30 #292：PWA 入口完整性对账（manifest ↔ icons 实物 ↔ theme 系统） ====================
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=manifest 图标清单横切；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）——R149 改名机械批注入
//
// #292 交付守护（P3 实测：声明与实物的对账从未做过）：
//   ① manifest.icons 逐项 → 实物在场 + PNG IHDR 实测尺寸 === 声明 sizes（本文件内置
//      零依赖 IHDR 解码做真实对账，非仅字符串锚）
//   ② maskable 形态在册（缺位即部分安卓启动器安装白边/被拒）
//   ③ theme_color 三方对账：manifest === index.html meta === --md-primary 回退值
//      （Monet 动态取色是运行时覆盖，manifest 固化静态默认值——#292 对齐说明）
//   ④ apple-touch-icon 180×180 声明+实物
//   ⑤ 审计脚本 scripts/audit-manifest-icons.mjs 门禁接线（npm run check:manifest）
//
// 像素级安全区为设计时属性（一次性 PIL 实证 2026-11-08：绿底 #00875A 族全出血四角 +
// 白字形最大半径 117.5px ≤ 80% 安全区 204.8px；记录于 worklog R132 加餐段），本文件
// 不重复像素解码；图标实物被替换时须重跑 PIL 探针复验。

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

/** PNG IHDR 实测尺寸（字节 16-24 大端宽高） */
const pngSize = (p) => {
  const d = readFileSync(p);
  expect(d.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { w: d.readUInt32BE(16), h: d.readUInt32BE(20) };
};

const manifest = JSON.parse(src('manifest.webmanifest'));
const indexHtml = src('index.html');

describe('v11.30 #292 manifest.icons 声明 ↔ 实物对账', () => {
  it('manifest 合法 JSON 且 icons 三项声明（192 any / 512 any / 512 maskable）', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBe(3);
    const purposes = manifest.icons.map((i) => i.purpose).sort();
    expect(purposes).toEqual(['any', 'any', 'maskable']);
    const sizes = manifest.icons.map((i) => i.sizes).sort();
    expect(sizes).toEqual(['192x192', '512x512', '512x512']);
  });

  it('逐项实物在场且 PNG IHDR 实测尺寸 === 声明 sizes（真实对账）', () => {
    for (const ic of manifest.icons) {
      const fp = resolve(ROOT, ic.src.replace(/^\.\//, ''));
      expect(existsSync(fp)).toBe(true);
      const [w, h] = String(ic.sizes).split('x').map(Number);
      expect(pngSize(fp)).toEqual({ w, h });
      expect(ic.type).toBe('image/png');
    }
  });

  it('maskable 实物专检：512×512 在场（像素级安全区设计时已证，见文件头注释）', () => {
    const fp = resolve(ROOT, 'icons/icon-maskable-512.png');
    expect(existsSync(fp)).toBe(true);
    expect(pngSize(fp)).toEqual({ w: 512, h: 512 });
  });
});

describe('v11.30 #292 theme_color 三方对账', () => {
  it('manifest ≡ index.html meta ≡ --md-primary 回退值（静态默认同源）', () => {
    const metaM = indexHtml.match(/<meta\s+name="theme-color"\s+content="([^"]+)"/);
    expect(metaM).not.toBeNull();
    const cssM = src('ios-desktop/css/md3-theme.css').match(/--md-primary,\s*(#[0-9a-fA-F]{6})/);
    expect(cssM).not.toBeNull();
    expect(manifest.theme_color.toLowerCase()).toBe(metaM[1].toLowerCase());
    expect(manifest.theme_color.toLowerCase()).toBe(cssM[1].toLowerCase());
    expect(manifest.theme_color.toLowerCase()).toBe('#00875a');
  });

  it('background_color 在册且合法 hex（启动屏底色）', () => {
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('v11.30 #292 apple-touch-icon 与门禁接线', () => {
  it('apple-touch-icon 180×180 声明+实物（iOS 主屏标准）', () => {
    const m = indexHtml.match(/<link\s+rel="apple-touch-icon"\s+href="([^"]+)"/);
    expect(m).not.toBeNull();
    const fp = resolve(ROOT, m[1].replace(/^\.\//, ''));
    expect(existsSync(fp)).toBe(true);
    expect(pngSize(fp)).toEqual({ w: 180, h: 180 });
  });

  it('审计脚本在场且六维对账逻辑齐备 + npm script check:manifest 登记', () => {
    const s = src('scripts/audit-manifest-icons.mjs');
    expect(s).toContain('const pngSize = (p) =>');
    expect(s).toContain("VALID_PURPOSE");
    expect(s).toContain('maskable 形态在册');
    expect(s).toContain('theme_color ≡ index.html meta theme-color');
    expect(s).toContain('theme_color ≡ --md-primary 回退值');
    expect(s).toContain('apple-touch-icon 180×180');
    expect(src('package.json')).toContain('"check:manifest": "node scripts/audit-manifest-icons.mjs"');
  });
});
