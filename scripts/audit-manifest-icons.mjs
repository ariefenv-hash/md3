#!/usr/bin/env node
// ==================== audit-manifest-icons.mjs — PWA 入口完整性对账（#292） ====================
//
// 背景（#292）：manifest.webmanifest 由 index.html 引用，icons/ 实物与 manifest.icons
// 声明的对账此前从未做过——声明缺实物/尺寸不符/maskable 缺位/theme_color 漂移任何
// 一项都会让 PWA 安装体验在部分安卓启动器上静默降级（缺 maskable 出白边、缺尺寸被
// 拒、theme_color 与状态栏不一致安装后视觉跳变）。
//
// 对账六维：
//   ① manifest.icons 逐项 → 实物存在性 + PNG IHDR 实测尺寸 === 声明 sizes + type 与扩展名一致
//   ② purpose 合法性（any/maskable/monochrome）+ maskable 形态在册（缺位即安装器白边/被拒）
//   ③ theme_color 三方对账：manifest === index.html <meta name="theme-color"> ===
//      --md-primary 回退值（md3-theme.css）——Monet 动态取色是运行时覆盖，manifest 固化
//      静态默认值，两域语义对齐（#292 对齐说明）
//   ④ background_color 在册且合法 hex（启动屏底色）
//   ⑤ apple-touch-icon：index.html link 声明 + 实物在场 + 180×180（iOS 添加到主屏标准）
//   ⑥ maskable 像素级安全区（一次性设计时属性，PIL 实证 2026-11-08 记录于 worklog R132
//      加餐段：绿底 #00875A 族全出血四角 + 白字形最大半径 117.5px ≤ 安全区 204.8px；
//      本脚本不重复像素解码，仅锚定实物在场与尺寸——全出血/字形 containment 变更需重跑
//      PIL 探针，见 tests/v292 注释）
//
// 用法：npm run check:manifest（或 node scripts/audit-manifest-icons.mjs）
// 退出码：0 = 全绿；1 = 任何对账失败
// 门禁位：本脚本为 PWA 入口对账门禁，与 verify-dist（#139）互补——一个管 dist 部署面，
// 一个管 PWA 安装面。

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

/** PNG IHDR 实测尺寸（零依赖：字节 16-24 大端宽高） */
const pngSize = (p) => {
  try {
    const d = readFileSync(p);
    if (d.length < 24 || d.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
    return { w: d.readUInt32BE(16), h: d.readUInt32BE(20) };
  } catch { return null; }
};
const VALID_PURPOSE = new Set(['any', 'maskable', 'monochrome']);

// ---------- ①② icons 声明 ↔ 实物对账 ----------
let manifest = null;
try {
  manifest = JSON.parse(readFileSync(path.join(root, 'manifest.webmanifest'), 'utf-8'));
  A('manifest.webmanifest 合法 JSON', true);
} catch (e) {
  A('manifest.webmanifest 合法 JSON', false, String(e).slice(0, 100));
  process.exit(1);
}
const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
A('manifest.icons 非空数组', icons.length > 0, `${icons.length} 项声明`);
for (const ic of icons) {
  const src = ic.src || '(缺 src)';
  const fp = path.join(root, src.replace(/^\.\//, ''));
  const exists = existsSync(fp);
  A(`实物在场 ${src}`, exists);
  if (!exists) continue;
  const sz = pngSize(fp);
  const declared = String(ic.sizes || '').split('x').map(Number);
  const okSize = sz && sz.w === declared[0] && sz.h === declared[1];
  A(`尺寸对账 ${src}`, okSize, okSize ? `IHDR ${sz.w}x${sz.h} = 声明 ${ic.sizes}` : `IHDR ${sz ? sz.w + 'x' + sz.h : '非PNG'} vs 声明 ${ic.sizes}`);
  const ext = path.extname(fp).toLowerCase();
  const okType = (ic.type === 'image/png' && ext === '.png');
  A(`type 对账 ${src}`, okType, ic.type);
  A(`purpose 合法 ${src}`, VALID_PURPOSE.has(ic.purpose), ic.purpose);
}
const hasMaskable = icons.some((ic) => ic.purpose === 'maskable');
A('maskable 形态在册（缺位即启动器白边/被拒）', hasMaskable);

// ---------- ③ theme_color 三方对账 ----------
const tc = manifest.theme_color;
const indexHtml = readFileSync(path.join(root, 'index.html'), 'utf-8');
const metaM = indexHtml.match(/<meta\s+name="theme-color"\s+content="([^"]+)"/);
const meta = metaM ? metaM[1] : null;
const themeCss = readFileSync(path.join(root, 'ios-desktop/css/md3-theme.css'), 'utf-8');
const primaryFallbackM = themeCss.match(/--md-primary,\s*(#[0-9a-fA-F]{6})/);
const primaryFallback = primaryFallbackM ? primaryFallbackM[1] : null;
A('theme_color 在册且合法 hex', /^#[0-9a-fA-F]{6}$/.test(tc || ''), tc);
A('theme_color ≡ index.html meta theme-color', tc && tc.toLowerCase() === (meta || '').toLowerCase(), `manifest=${tc} meta=${meta}`);
A('theme_color ≡ --md-primary 回退值（Monet 运行时覆盖前静态默认同源）', tc && tc.toLowerCase() === (primaryFallback || '').toLowerCase(), `css=${primaryFallback}`);

// ---------- ④ background_color ----------
A('background_color 在册且合法 hex', /^#[0-9a-fA-F]{6}$/.test(manifest.background_color || ''), manifest.background_color);

// ---------- ⑤ apple-touch-icon ----------
const atiM = indexHtml.match(/<link\s+rel="apple-touch-icon"\s+href="([^"]+)"/);
const atiPath = atiM ? path.join(root, atiM[1].replace(/^\.\//, '')) : null;
A('apple-touch-icon link 声明在场', !!atiM, atiM ? atiM[1] : '缺失');
if (atiM) {
  const atiExists = atiPath && existsSync(atiPath);
  A(`apple-touch-icon 实物在场 ${atiM[1]}`, atiExists);
  const atiSz = atiExists ? pngSize(atiPath) : null;
  A('apple-touch-icon 180×180（iOS 主屏标准）', !!atiSz && atiSz.w === 180 && atiSz.h === 180, atiSz ? `${atiSz.w}x${atiSz.h}` : '不可读');
}

console.log('');
console.log(`[check:manifest] 结果：PASS ${pass} / FAIL ${fail}（#292 PWA 入口完整性对账：icons 声明↔实物 / maskable / theme_color 三方 / background / apple-touch-icon）`);
process.exit(fail === 0 ? 0 : 1);
