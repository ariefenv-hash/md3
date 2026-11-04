// ==================== v187-font-zip.test.js — #187 zip 多字重字体包 v9.75 ====================
//
// 覆盖（R65 窗主作业）：
//   · 字重推断器表驱动（长词优先防误命中：semibold≠bold / extralight≠light；数字档；italic 标记）
//   · zip 主路径：manifest.json 显式声明 > 文件名推断；__MACOSX/隐藏文件/非字体扩展名剔除；
//     族名 = manifest.family > zip 文件名去扩展名；空包报错文案
//   · 多 @font-face 注册：同族逐档 font-weight/font-style 描述符；单文件无提示声明 100–900 全距
//   · 存储纪律：IndexedDB 既有字体域升级结构化记录 {__multi,files}（不新建域），恢复路径双形态兼容
//   · 协议扩展：set-font payload 携带 weights（宿主推送/主机 handler/SDK injectFont 三处）+ clear-font
//   · UI 入口：设置壁纸子页「字体」区（状态行/导入按钮/恢复默认/概念厘清文案）
//   · JSZip 懒加载路径（apps/_shared/vendor 既有 vendor，零新增常载体积）
//
// 锚纪律：一律裸语义锚（R64 坑5：apps 文件不在版本滚动扫描范围，硬版本锚必失配）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WP = readFileSync(join(ROOT, 'ios-desktop/js/wallpaper.js'), 'utf-8');
const MAIN = readFileSync(join(ROOT, 'ios-desktop/js/main.js'), 'utf-8');
const SDK = readFileSync(join(ROOT, 'ios-desktop/js/pkg-sdk.js'), 'utf-8');
const TE = readFileSync(join(ROOT, 'ios-desktop/js/theme-engine.js'), 'utf-8');
const INDEX = readFileSync(join(ROOT, 'ios-desktop/index.html'), 'utf-8');

describe('v9.75 #187 字重推断器（表驱动，长词优先）', () => {
  it('九档词缀全覆盖 + italic 标记 + 长词防误命中', () => {
    expect(WP).toMatch(/export function inferFontWeight\(filename\)/);
    // 长词必须先于短词（semibold 含 bold / extralight 含 light / extrabold 含 bold）——
    // 用括号前缀唯一字面量定位（防 bold) 在 extrabold|ultrabold 内误命中）
    const literals = [
      '(extralight|ultralight)', '(extrabold|ultrabold)', '(semibold|demibold)',
      '(thin)', '(light)', '(black|heavy)', '(bold)', '(medium)', '(regular|normal|book)',
    ];
    let prev = -1;
    for (const lit of literals) {
      const idx = WP.indexOf(lit);
      expect(idx).toBeGreaterThan(prev); // 词表顺序：长词在前
      expect(idx).toBeGreaterThan(-1);
      prev = idx;
    }
    // italic / oblique 样式标记
    expect(WP).toMatch(/\/italic\|oblique\/i/);
  });
  it('数字档位匹配 100–900 且带边界防误截（1000/9000 不命中）', () => {
    expect(WP).toContain('(?:^|[^0-9])(100|200|300|400|500|600|700|800|900)(?:[^0-9]|$)');
  });
});

describe('v9.75 #187 zip 主路径：解包与字重分类', () => {
  it('JSZip 懒加载复用既有 vendor 路径（零新增常载体积）', () => {
    expect(WP).toMatch(/function ensureJSZip\(\)/);
    expect(WP).toMatch(/\.\/apps\/_shared\/vendor\/jszip\.min\.js/);
    expect(WP).toMatch(/if \(window\.JSZip\) return Promise\.resolve\(window\.JSZip\)/);
  });
  it('manifest.json 显式声明优先于文件名推断（path 三形态匹配 + weight>0 守卫 + italic）', () => {
    expect(WP).toMatch(/manifest\.json/);
    expect(WP).toMatch(/manifest\.files\.find\(\(f\)/);
    expect(WP).toMatch(/f\.path === relPath \|\| f\.path === fileName \|\| f\.path\.split\('\/'\)\.pop\(\) === fileName/);
    expect(WP).toMatch(/Number\(hit\.weight\) > 0/);
    expect(WP).toMatch(/hit\.style === 'italic' \? 'italic' : 'normal'/);
    // 损坏 manifest 静默降级
    expect(WP).toMatch(/catch \(e\) \{ manifest = null; \}/);
  });
  it('zip 条目过滤：目录 / __MACOSX / 隐藏文件 / 非字体扩展名；空包报错文案', () => {
    expect(WP).toMatch(/entry\.dir\) return/);
    expect(WP).toMatch(/\/\(\^\|\\\/\)\(__MACOSX\|\\\.\)\//);
    expect(WP).toContain('FONT_FILE_EXT_RE = /\\.(ttf|otf|ttc|woff2?)$/i');
    expect(WP).toMatch(/zip 内未找到字体文件/);
  });
  it('族名：manifest.family > zip 文件名去扩展名 > CustomFont 兑底', () => {
    expect(WP).toMatch(/manifest\.family === 'string' && manifest\.family\.trim\(\)/);
    expect(WP).toContain("replace(/\\.zip$/i, '')");
    expect(WP).toMatch(/\|\| 'CustomFont'/);
  });
});

describe('v9.75 #187 多 @font-face 注册与协议扩展', () => {
  it('applyMultiFont：字重归一（0→400）+ 升序排序 + 逐档 objectURL + 同步 iframe', () => {
    expect(WP).toMatch(/export async function applyMultiFont\(files, name, persist\)/);
    expect(WP).toMatch(/Number\(f\.weight\) > 0 \? Number\(f\.weight\) : 400/);
    expect(WP).toMatch(/\.sort\(\(a, b\) => a\.weight - b\.weight\)/);
    expect(WP).toMatch(/syncToIframes\('set-font', weights\[0\]\.url, \{ name, weights \}\)/);
  });
  it('applyFontToDocument：多档逐 @font-face（font-weight/font-style 描述符）+ 单文件 100–900 全距', () => {
    expect(WP).toMatch(/font-weight: \$\{w\.weight\};/);
    expect(WP).toMatch(/font-style: \$\{w\.style \|\| 'normal'\};/);
    expect(WP).toMatch(/font-weight: 100 900;/);
  });
  it('单文件路径字重推断接线（MyFont-Bold.ttf → 700 声明）+ payload weights 条件携带', () => {
    expect(WP).toMatch(/const hint = inferFontWeight\(name\);\n  const url = nextFontObjectURL\(blob\);/);
    expect(WP).toMatch(/weights: currentFontWeights\.length \? currentFontWeights : undefined/);
  });
  it('宿主推送：iframe 创建时 getFontWeights 携带 weights（main.js）', () => {
    expect(MAIN).toMatch(/import \{[\s\S]*?getFontWeights[\s\S]*?\} from '\.\/wallpaper\.js';/);
    expect(MAIN).toMatch(/postMessage\(\{ type: 'set-font', url: fontURL, name: fontName, weights: fw && fw\.length \? fw : undefined \}, '\*'\)/);
  });
  it('主机侧 handler：weights 数组逐档 face + clear-font 摘样式（main.js）', () => {
    expect(MAIN).toMatch(/if \(Array\.isArray\(d\.weights\) && d\.weights\.length\) \{/);
    expect(MAIN).toContain('font-weight:" + w.weight + ";font-style:"');
    expect(MAIN).toMatch(/if \(d\.type === 'clear-font'\) \{/);
  });
  it('SDK 侧 injectFont：weights 分支 + clear-font（pkg-sdk.js，旧协议兼容）', () => {
    expect(SDK).toMatch(/if \(d\.weights && d\.weights\.length\) \{/);
    expect(SDK).toContain('font-weight:" + w.weight + ";font-style:"');
    expect(SDK).toMatch(/if \(d\.type === 'clear-font'\) \{/);
  });
});

describe('v9.75 #187 存储纪律：既有字体域升级，不新建域', () => {
  it('IndexedDB 既有域结构化记录 {__multi,files}；fontName 沿用；localStorage 仅名', () => {
    expect(WP).toMatch(/idbSet\(IDB_KEYS\.font, \{ __multi: true, files: normalized\.map\(\(f\) => \(\{ weight: f\.weight, style: f\.style, blob: f\.blob \}\)\) \}\)/);
    expect(WP).toMatch(/localStorage\.setItem\(SK\.fontName, name\)/);
    // 不新增 localStorage 数据域：仅 fontName 既有键
    expect(WP).not.toMatch(/localStorage\.setItem\('ios-desktop:font-multi/);
  });
  it('restoreFont 双形态兼容：Blob（旧）→ 单文件推断；__multi → 逐档重建 + iframe 同步', () => {
    expect(WP).toMatch(/stored instanceof Blob\)/);
    expect(WP).toMatch(/stored && stored\.__multi && Array\.isArray\(stored\.files\) && stored\.files\.length && currentFontName/);
    expect(WP).toMatch(/v9\.75 多字重包恢复：逐档重建 objectURL/);
  });
  it('clearCustomFont：既有域全清 + 摘样式 + clear-font 广播 + font-changed 事件', () => {
    expect(WP).toMatch(/export async function clearCustomFont\(\)/);
    expect(WP).toMatch(/idbDel\(IDB_KEYS\.font\);/);
    expect(WP).toMatch(/idbDel\(IDB_KEYS\.fontName\);/);
    expect(WP).toMatch(/syncToIframes\('clear-font', '', \{\}\)/);
    expect(WP).toMatch(/CustomEvent\('font-changed'/);
  });
});

describe('v9.75 #187 UI 入口：设置壁纸子页「字体」区（theme-engine.js）', () => {
  it('字体区三件套：状态行 + 导入按钮 + 恢复默认按钮（data-test 齐全）', () => {
    expect(TE).toMatch(/data-test="font-section"/);
    expect(TE).toMatch(/id="setFontSub" data-test="font-status"/);
    expect(TE).toMatch(/id="setFontUploadBtn" data-test="font-upload"/);
    expect(TE).toMatch(/id="setFontClearBtn" data-test="font-clear"/);
  });
  it('按钮接线：triggerFontSelect / clearCustomFont / font-changed 页外同步', () => {
    expect(TE).toMatch(/import \{ triggerWallpaperSelect, triggerFontSelect, clearCustomWallpaper, clearSavedPalette, clearCustomFont, getFontName, getFontWeights \} from '\.\/wallpaper\.js';/);
    expect(TE).toMatch(/fontUpBtn\.addEventListener\('click', \(\) => \{\n      triggerFontSelect\(\);/);
    expect(TE).toMatch(/await clearCustomFont\(\);/);
    expect(TE).toMatch(/window\.addEventListener\('font-changed', onFontChanged\)/);
    expect(TE).toMatch(/if \(!container\.isConnected\) \{\n      window\.removeEventListener\('font-changed', onFontChanged\);/);
  });
  it('状态行文案：族名 + 字重档数；清除按钮随自定义态显隐', () => {
    expect(TE).toMatch(/档字重/);
    expect(TE).toMatch(/fontClear\.style\.display = getFontName\(\) \? '' : 'none';/);
  });
  it('概念厘清文案落地（多字重 ≠ 可变字体，#186 归属标注）', () => {
    expect(TE).toMatch(/manifest\.json 显式声明或文件名/);
    expect(TE).toMatch(/font-weight 离散选档/);
    expect(TE).toMatch(/非可变字体连续轴插值/);
    expect(TE).toMatch(/可变字体路线/);
  });
});

describe('v9.75 #187 入口与回归锚', () => {
  it('fontInput accept 扩展 .zip（宿主 index.html）', () => {
    expect(INDEX).toMatch(/<input type="file" id="fontInput" accept="\.ttf,\.woff,\.woff2,\.otf,\.zip" style="display:none;">/);
  });
  it('zip 分流接线：fontInput change → applyCustomFontZip（persist=true）+ toast 双路', () => {
    expect(WP).toContain('/\\.zip$/i.test(file.name)');
    expect(WP).toMatch(/await applyCustomFontZip\(file, true\);/);
    expect(WP).toMatch(/已应用字体包: \$\{r\.family\} · \$\{r\.count\} 档字重/);
    expect(WP).toMatch(/字体包导入失败: \$\{err && err\.message \? err\.message : '未知错误'\}/);
  });
  it('objectURL 全量追踪（多字重逐档建链，切换延迟 30s 释放）', () => {
    expect(WP).toMatch(/function nextFontObjectURL\(blob\)/);
    expect(WP).toMatch(/let fontObjectURLs = \[\]/);
    expect(WP).toMatch(/prev\.forEach\(\(u\) => \{ try \{ URL\.revokeObjectURL\(u\); \} catch \(e\) \{\} \}\);/);
  });
  it('getFontWeights getter 导出（main.js iframe 推送消费）', () => {
    expect(WP).toMatch(/export function getFontWeights\(\)  \{ return currentFontWeights; \}/);
  });
});
