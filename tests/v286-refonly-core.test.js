// ==================== v286-refonly-core.test.js — #286 续车道：ref-only 候补池补 core 提取（首批 files/settings · 二批 photo · 三批 translate/weather v10.93 · 四批 camera/notes v10.93 合流重放） ====================
//
// 覆盖（#286 处置建议②「零触达应用补 core 提取」三批落地）：
//   · 首批 files/settings：A 组 / B 组 / C 组真身直连 / D 组归属
//   · 二批 photo：E 组
//   · 三批 translate/weather：F 组 / G 组 / H 组（全局水位终态持真）
//   · filesCore：路径工具（parentOf/baseName 根与多级边界）/ validName 安全校验 /
//     extOf+catOf 分类判定（mime 优先序、扩展名兜底、CATS 六类）/ fmtBytes 三档边界 /
//     sortEntries 参数化排序（三键 × 双向 × 非变异）
//   · settingsCore：relTime（formatRelativeTime LONG zh 语义）/ lockSummary 三态 /
//     isConvo 会话判定 / dHash djb2 确定性 / timeoutSummaryFrom 档位与回落 /
//     fmtUptime 参数化 / fmtAppPermSummary 双态
//   · 真身直连证据（阴性锚）：files.js / settings.js 内联侧确有 __filesCore / __settingsCore
//     桥消费行（防孤立副本漂移）；原内联实现已退役（上移核后内联无重复定义）
//   · 归属联动：矩阵再生后 files/settings tier 翻 core-full、cores 增至 25、消费 100% 水位持真
//
// 范式：v124 沙箱提取（new Function('window', SRC)）+ v286 矩阵锚同款。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/files-core.js'), 'utf-8');
const SETTINGS_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/settings-core.js'), 'utf-8');
const FILES_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps/files.js'), 'utf-8');
const SETTINGS_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps/settings.js'), 'utf-8');
const PHOTO_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/photos/core.js'), 'utf-8');
const PHOTO_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/photos/index.html'), 'utf-8');
const TRANSLATE_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/translate/core.js'), 'utf-8');
const TRANSLATE_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/translate/index.html'), 'utf-8');
const WEATHER_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/weather/core.js'), 'utf-8');
const WEATHER_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/weather/index.html'), 'utf-8');
const MATRIX_JSON = JSON.parse(readFileSync(join(ROOT, 'docs/test-coverage-matrix.json'), 'utf-8'));

// ---------- 沙箱提取（经典脚本 IIFE → window.__xxxCore，fx-core/v124 同范式） ----------
const filesCtx = { window: {} };
new Function('window', FILES_CORE_SRC)(filesCtx.window);
const fcore = filesCtx.window.__filesCore;

const setCtx = { window: {} };
new Function('window', SETTINGS_CORE_SRC)(setCtx.window);
const score_ = setCtx.window.__settingsCore;

const photoCtx = { window: {} };
new Function('window', PHOTO_CORE_SRC)(photoCtx.window);
const pcore = photoCtx.window.__photoCore;

const trCtx = { window: {} };
new Function('window', TRANSLATE_CORE_SRC)(trCtx.window);
const tcore = trCtx.window.__translateCore;

const wCtx = { window: {} };
new Function('window', WEATHER_CORE_SRC)(wCtx.window);
const wcore = wCtx.window.__weatherCore;

// ---------- 合成工厂（确定性，零随机） ----------
const entry = (name, size, modified, mime, type) => ({ name, size, modified, mime, type: type || 'file' });

describe('v10.93 #286 续 filesCore：结构立契与路径工具', () => {
  it('A1 出口结构立契（八键全集，fx-core 出口契约同律）', () => {
    expect(Object.keys(fcore).sort()).toEqual(
      ['CATS', 'baseName', 'catOf', 'extOf', 'fmtBytes', 'parentOf', 'sortEntries', 'validName']
    );
    expect(fcore.CATS).toHaveLength(6);
  });

  it('A2 parentOf / baseName 路径边界（根收根、多级、末斜杠不误切）', () => {
    expect(fcore.parentOf('/a/b')).toBe('/a');
    expect(fcore.parentOf('/a')).toBe('/');
    expect(fcore.parentOf('/')).toBe('/');
    expect(fcore.parentOf('/ Documents/报告.pdf')).toBe('/ Documents');
    expect(fcore.baseName('/a/b.txt')).toBe('b.txt');
    expect(fcore.baseName('/')).toBe('');
    expect(fcore.baseName('/内部存储/相册')).toBe('相册');
  });

  it('A3 validName 安全校验（空 / 点目录 / 路径分隔符 → null）', () => {
    expect(fcore.validName('新建文件夹')).toBe('新建文件夹');
    expect(fcore.validName('')).toBeNull();
    expect(fcore.validName(null)).toBeNull();
    expect(fcore.validName('.')).toBeNull();
    expect(fcore.validName('..')).toBeNull();
    expect(fcore.validName('a/b')).toBeNull();
  });

  it('A4 extOf / catOf：mime 前缀优先、扩展名兜底、未命中 null、CATS 六类键序', () => {
    expect(fcore.extOf('IMG_0001.JPG')).toBe('jpg');
    expect(fcore.extOf('noext')).toBe('');
    expect(fcore.catOf(entry('x.bin', 1, 0, 'image/webp')).key).toBe('image');
    expect(fcore.catOf(entry('photo.png', 1, 0)).key).toBe('image');
    expect(fcore.catOf(entry('clip.mkv', 1, 0)).key).toBe('video');
    expect(fcore.catOf(entry('song.flac', 1, 0)).key).toBe('audio');
    expect(fcore.catOf(entry('readme.csv', 1, 0)).key).toBe('doc');
    expect(fcore.catOf(entry('bundle.zip', 1, 0)).key).toBe('zip');
    expect(fcore.catOf(entry('app.apk', 1, 0)).key).toBe('apk');
    expect(fcore.catOf(entry('x.bin', 1, 0))).toBeNull();
    expect(fcore.CATS.map((c) => c.key)).toEqual(['image', 'video', 'audio', 'doc', 'zip', 'apk']);
  });

  it('A5 fmtBytes 三档边界与非法输入（1023/1024/1048575/1048576/GB；负数零值）', () => {
    expect(fcore.fmtBytes(0)).toBe('0 B');
    expect(fcore.fmtBytes(-5)).toBe('0 B');
    expect(fcore.fmtBytes(1023)).toBe('1023 B');
    expect(fcore.fmtBytes(1024)).toBe('1.0 KB');
    expect(fcore.fmtBytes(1048575)).toBe('1024.0 KB');
    expect(fcore.fmtBytes(1048576)).toBe('1.00 MB');
    expect(fcore.fmtBytes(1073741824)).toBe('1.00 GB');
    expect(fcore.fmtBytes(2 * 1073741824 + 5 * 1048576)).toBe('2.00 GB');
  });

  it('A6 sortEntries：三键 × 双向 × 非变异（slice 语义，调用方数组零污染）', () => {
    const src = [entry('乙', 30, 300), entry('甲', 10, 100), entry('丙', 20, 200)];
    const snap = src.map((e) => e.name);
    // zh-CN collation 按拼音：丙(bīng) < 甲(jiā) < 乙(yǐ)
    expect(fcore.sortEntries(src, 'name', 'asc').map((e) => e.name)).toEqual(['丙', '甲', '乙']);
    expect(fcore.sortEntries(src, 'name', 'desc').map((e) => e.name)).toEqual(['乙', '甲', '丙']);
    expect(fcore.sortEntries(src, 'size', 'asc').map((e) => e.name)).toEqual(['甲', '丙', '乙']);
    expect(fcore.sortEntries(src, 'size', 'desc').map((e) => e.name)).toEqual(['乙', '丙', '甲']);
    expect(fcore.sortEntries(src, 'modified', 'asc').map((e) => e.modified)).toEqual([100, 200, 300]);
    expect(fcore.sortEntries(src, 'unknown-key', 'desc').map((e) => e.modified)).toEqual([300, 200, 100]);
    expect(src.map((e) => e.name)).toEqual(snap); // 非变异
    expect(fcore.sortEntries(src, 'name', 'asc')).not.toBe(src);
  });
});

describe('v10.93 #286 续 settingsCore：语义映射与确定性', () => {
  it('B1 出口结构立契（八键全集）', () => {
    expect(Object.keys(score_).sort()).toEqual(
      ['TIMEOUT_LABELS', 'dHash', 'fmtAppPermSummary', 'fmtUptime', 'isConvo', 'lockSummary', 'relTime', 'timeoutSummaryFrom']
    );
  });

  it('B2 relTime：StringUtil.formatRelativeTime LONG zh 四档边界', () => {
    expect(score_.relTime(0)).toBe('刚刚');
    expect(score_.relTime(0.5)).toBe('刚刚');
    expect(score_.relTime(30)).toBe('30 分钟前');
    expect(score_.relTime(59)).toBe('59 分钟前');
    expect(score_.relTime(60)).toBe('1 小时前');
    expect(score_.relTime(1439)).toBe('23 小时前');
    expect(score_.relTime(1440)).toBe('1 天前');
    expect(score_.relTime(4320)).toBe('3 天前');
  });

  it('B3 lockSummary 三态（getSummaryResource 语义：disable / show / hide）', () => {
    expect(score_.lockSummary({ lockScreenShow: false, allowPrivate: false })).toBe('完全不显示通知');
    expect(score_.lockSummary({ lockScreenShow: true, allowPrivate: true })).toBe('显示所有通知内容');
    expect(score_.lockSummary({ lockScreenShow: true, allowPrivate: false })).toBe('仅在解锁状态下显示敏感内容');
  });

  it('B4 isConvo：conversation / 会话 双语命中与空值防御', () => {
    expect(score_.isConvo({ category: 'conversation' })).toBe(true);
    expect(score_.isConvo({ category: '会话' })).toBe(true);
    expect(score_.isConvo({ category: 'CONVERSATION_GROUP' })).toBe(true);
    expect(score_.isConvo({ category: 'alarm' })).toBe(false);
    expect(score_.isConvo({})).toBe(false);
    expect(score_.isConvo(null)).toBe(false);
  });

  it('B5 dHash：djb2 确定性（同输入恒同输出、空串与非字符串强制）', () => {
    expect(score_.dHash('seed')).toBe(score_.dHash('seed'));
    expect(score_.dHash('seed')).not.toBe(score_.dHash('seed#2'));
    expect(score_.dHash('')).toBe(5381); // 空串 = 初值 |0 取绝对值
    expect(score_.dHash(null)).toBe(5381);
    expect(score_.dHash(123)).toBe(score_.dHash('123'));
    expect(Number.isInteger(score_.dHash('任意中文种子'))).toBe(true);
  });

  it('B6 timeoutSummaryFrom：AOSP screen_timeout_entries 七档与未知回落', () => {
    expect(score_.timeoutSummaryFrom(15000)).toBe('闲置 15 秒后');
    expect(score_.timeoutSummaryFrom(60000)).toBe('闲置 1 分钟后');
    expect(score_.timeoutSummaryFrom(1800000)).toBe('闲置 30 分钟后');
    expect(score_.timeoutSummaryFrom(999)).toBe('闲置 1 分钟后');
    expect(score_.timeoutSummaryFrom(undefined)).toBe('闲置 1 分钟后');
    expect(Object.keys(score_.TIMEOUT_LABELS)).toHaveLength(7);
  });

  it('B7 fmtUptime 参数化（秒 / 分钟 / 小时+分钟三档）', () => {
    expect(score_.fmtUptime(59000)).toBe('59 秒');
    expect(score_.fmtUptime(60000)).toBe('1 分钟');
    expect(score_.fmtUptime(3599000)).toBe('59 分钟');
    expect(score_.fmtUptime(3600000)).toBe('1 小时 0 分钟');
    expect(score_.fmtUptime(3900000)).toBe('1 小时 5 分钟');
  });

  it('B8 fmtAppPermSummary 双态（服务关闭文案 / 授权计数文案）', () => {
    expect(score_.fmtAppPermSummary({ enabled: false }, 3, 32)).toBe('位置信息服务已关闭');
    expect(score_.fmtAppPermSummary({ enabled: true }, 3, 32)).toBe('3 个应用（共 32 个应用）有权获取位置信息');
  });
});

describe('v10.93 #286 续 真身直连与矩阵归属联动', () => {
  it('C1 内联侧确有 __filesCore 桥消费（防孤立副本漂移的阴性锚）', () => {
    expect(FILES_APP_SRC).toContain("import '../files-core.js'");
    expect(FILES_APP_SRC).toContain('window.__filesCore');
    expect(FILES_APP_SRC).toContain('__fc.sortEntries');
  });

  it('C2 内联侧确有 __settingsCore 桥消费（六处委托，PAGE_SCRIPT 内真身直连）', () => {
    expect(SETTINGS_APP_SRC).toContain("import '../settings-core.js'");
    const bridges = SETTINGS_APP_SRC.match(/window\.__settingsCore\./g) || [];
    expect(bridges.length).toBeGreaterThanOrEqual(7); // isConvo/lockSummary/timeoutSummary/dHash/fmtUptime/relTime/fmtAppPermSummary
  });

  it('C3 内联原实现已退役（CATS/parentOf/dHash 定义上移后不在内联重复）', () => {
    // files.js 内联不再有 CATS 数组字面量（原 six-cat 定义已上移核）
    expect(FILES_APP_SRC).not.toMatch(/var CATS = \[\s*\{ key: 'image'/);
    // settings.js 内联不再有 TIMEOUT_LABELS 字面量与 relTime 原实现体
    expect(SETTINGS_APP_SRC).not.toContain('var TIMEOUT_LABELS =');
    expect(SETTINGS_APP_SRC).not.toMatch(/mins < 1440/);
  });

  it('D1 矩阵归属联动：files/settings tier 翻 core-full 且 cores 登记（首批；终态水位由 E6 持）', () => {
    const f = MATRIX_JSON.apps.find((a) => a.id === 'files');
    const s = MATRIX_JSON.apps.find((a) => a.id === 'settings');
    expect(f.tier).toBe('core-full');
    expect(s.tier).toBe('core-full');
    expect(f.cores).toContain('filesCore');
    expect(s.cores).toContain('settingsCore');
  });

  it('D2 治理水位持真：25/25 全消费 100%（v286-D 新增 core 必带测试门）', () => {
    expect(MATRIX_JSON.stats.coresConsumed).toBe(MATRIX_JSON.stats.coresTotal);
    expect(MATRIX_JSON.stats.coresCoveragePct).toBe(100);
    expect(MATRIX_JSON.stats.coreGap).toBe(0);
  });

  it('D3 生成件可重现：矩阵 --check 逐字节一致（单真源禁手改）', () => {
    let out = '';
    try {
      out = execFileSync('node', [join(ROOT, 'scripts/test-coverage-matrix.mjs'), '--check'], { encoding: 'utf-8' });
    } catch (e) {
      out = String(e.stdout || '') + String(e.stderr || '');
      expect.fail('矩阵 --check 不一致：' + out.slice(0, 200));
    }
    expect(out).toContain('check PASS');
  });
});

describe('v10.93 #286 续第二批 photoCore：滤镜表与编辑器几何', () => {
  it('E1 出口结构立契（三键全集）与 FILTERS 八档名称', () => {
    expect(Object.keys(pcore).sort()).toEqual(['FILTERS', 'buildFilterStr', 'editorCanvasSize']);
    expect(pcore.FILTERS).toHaveLength(8);
    expect(pcore.FILTERS.map((f) => f.name)).toEqual(['原图', '复古', '黑白', '暖阳', '冷调', '高对比', '柔和', '电影']);
    expect(pcore.FILTERS[0].filter).toBe(''); // 原图档空串（不追加空尾语义锚）
  });

  it('E2 buildFilterStr：三滑条 100 基准偏移 + 预设追加 + 原图档零空尾（与原内联逐字符等值）', () => {
    expect(pcore.buildFilterStr(0, 0, 0, '')).toBe('brightness(100%) contrast(100%) saturate(100%)');
    expect(pcore.buildFilterStr(5, 0, -5, '')).toBe('brightness(105%) contrast(100%) saturate(95%)');
    expect(pcore.buildFilterStr(0, 35, 15, '')).toBe('brightness(100%) contrast(135%) saturate(115%)');
    expect(pcore.buildFilterStr(-8, 15, -10, 'sepia(0.45)')).toBe('brightness(92%) contrast(115%) saturate(90%) sepia(0.45)');
    expect(pcore.buildFilterStr(10, 0, 0, undefined)).not.toContain('undefined'); // 缺省预设不产生字面 undefined
    expect(pcore.buildFilterStr(10, 0, 0, undefined)).toBe('brightness(110%) contrast(100%) saturate(100%)');
  });

  it('E3 editorCanvasSize：正交尺寸缩放上限 1 不放大、下限 1 防 0 尺寸', () => {
    // 1200x800 在 600x400 视口 → scale=0.5 → 600x400
    expect(pcore.editorCanvasSize(1200, 800, 0, 600, 400)).toEqual({ width: 600, height: 400, scale: 0.5 });
    // 400x300 在 1200x900 视口 → scale=1 不放大
    expect(pcore.editorCanvasSize(400, 300, 0, 1200, 900)).toEqual({ width: 400, height: 300, scale: 1 });
    // 极小图 → Math.max(1, floor) 防零
    expect(pcore.editorCanvasSize(1, 1, 0, 600, 400)).toEqual({ width: 1, height: 1, scale: 1 });
  });

  it('E4 editorCanvasSize：90/270 旋转交换宽高、180 不交换；scale 与 drawImage dw/dh 同源', () => {
    const r90 = pcore.editorCanvasSize(1200, 800, 90, 600, 400);
    // 旋转交换后 w=800,h=1200 → scale=min(600/800, 400/1200, 1)=1/3 → 266x400
    expect(r90.width).toBe(266);
    expect(r90.height).toBe(400);
    expect(r90.scale).toBeCloseTo(1 / 3, 6);
    const r180 = pcore.editorCanvasSize(1200, 800, 180, 600, 400);
    expect(r180).toEqual({ width: 600, height: 400, scale: 0.5 }); // 180 不交换
    const r270 = pcore.editorCanvasSize(1200, 800, 270, 600, 400);
    expect(r270.width).toBe(266); // floor(800/3)=266
    expect(r270.height).toBe(400); // floor(1200/3)=400
    // scale 一致性：dw=img.width*scale 与 dh=img.height*scale（内联 drawImage 同源值）
    expect(1200 * r90.scale).toBeCloseTo(400, 6);
    expect(800 * r90.scale).toBeCloseTo(800 / 3, 6);
  });

  it('E5 真身直连阴性锚：index.html 经 script src 消费 __photoCore 且内联八档定义退役', () => {
    expect(PHOTO_APP_SRC).toContain('<script src="./core.js">');
    expect(PHOTO_APP_SRC).toContain('window.__photoCore.FILTERS');
    expect(PHOTO_APP_SRC).toContain('window.__photoCore.buildFilterStr');
    expect(PHOTO_APP_SRC).toContain('window.__photoCore.editorCanvasSize');
    expect(PHOTO_APP_SRC).not.toContain("name: '复古'"); // 内联八档字面量退役
    expect(PHOTO_APP_SRC).not.toMatch(/let filterStr = `brightness/); // 内联 filter 串构造退役
  });

  it('E6 矩阵归属联动（第二批）：photo tier 翻 core-full 且 cores 登记 photoCore（全局水位终态由 H3 持，防跨批漂移）', () => {
    const p = MATRIX_JSON.apps.find((a) => a.id === 'photo');
    expect(p.tier).toBe('core-full');
    expect(p.cores).toContain('photoCore');
  });
});

describe('v10.93 #286 续第三批 translateCore：语言表与时间格式化', () => {
  it('F1 出口结构立契（三键全集）与 LANGUAGES 21 档序', () => {
    expect(Object.keys(tcore).sort()).toEqual(['LANGUAGES', 'formatTime', 'getLangByCode']);
    expect(tcore.LANGUAGES).toHaveLength(21);
    expect(tcore.LANGUAGES[0]).toEqual({ code: 'auto', name: '自动检测', en: 'Auto Detect' });
    expect(tcore.LANGUAGES[20]).toEqual({ code: 'hi', name: '印地语', en: 'Hindi' });
    expect(tcore.LANGUAGES.every((l) => l.code && l.name && l.en)).toBe(true); // 三字段全集零缺列
  });

  it('F2 getLangByCode：命中真身 / 未知与空值回落 auto 档（原 find || LANGUAGES[0] 语义）', () => {
    expect(tcore.getLangByCode('ja')).toEqual({ code: 'ja', name: '日语', en: 'Japanese' });
    expect(tcore.getLangByCode('zh-TW').name).toBe('中文（繁体）');
    expect(tcore.getLangByCode('xx-unknown').code).toBe('auto');
    expect(tcore.getLangByCode(null).code).toBe('auto');
    expect(tcore.getLangByCode(undefined)).toBe(tcore.LANGUAGES[0]); // 回落即首档同一引用
  });

  it('F3 formatTime：四档边界（now 参数化确定性）与缺省 now 等值（Date.now() 语义）', () => {
    const t0 = 1000000000000;
    expect(tcore.formatTime(t0, t0 + 59999)).toBe('刚刚');
    expect(tcore.formatTime(t0, t0 + 60000)).toBe('1 分钟前');
    expect(tcore.formatTime(t0, t0 + 3599999)).toBe('59 分钟前');
    expect(tcore.formatTime(t0, t0 + 3600000)).toBe('1 小时前');
    expect(tcore.formatTime(t0, t0 + 86399999)).toBe('23 小时前');
    expect(tcore.formatTime(0, t0)).toBe('1/1'); // 超过 24h 落日期档（1970-01-01）
    expect(tcore.formatTime(t0)).toBe(tcore.formatTime(t0, Date.now())); // 缺省 now 与显式 Date.now() 同语义
  });

  it('F4 真身直连阴性锚：index.html 经 script src 消费 __translateCore 且内联定义退役', () => {
    expect(TRANSLATE_APP_SRC).toContain('<script src="./core.js">');
    expect(TRANSLATE_APP_SRC).toContain('window.__translateCore.LANGUAGES');
    expect(TRANSLATE_APP_SRC).toContain('window.__translateCore.getLangByCode');
    expect(TRANSLATE_APP_SRC).toContain('window.__translateCore.formatTime');
    expect(TRANSLATE_APP_SRC).not.toContain("{ code: 'auto', name: '自动检测'"); // 内联 21 档字面量退役
    expect(TRANSLATE_APP_SRC).not.toContain('LANGUAGES.find(l => l.code === code)'); // 内联查表原实现体退役
    expect(TRANSLATE_APP_SRC).not.toMatch(/const diff = now - ts;/); // 内联 formatTime 原实现体退役
  });
});

describe('v10.93 #286 续第三批 weatherCore：编码表/城市表/最近城/SVG 引擎', () => {
  it('G1 出口结构立契（四键全集）与 WMO 22 档·城市 18 城水位', () => {
    expect(Object.keys(wcore).sort()).toEqual(['CITY_PRESETS', 'WMO_CODES', 'createWeatherSVG', 'findNearestCity']);
    expect(Object.keys(wcore.WMO_CODES)).toHaveLength(22);
    expect(wcore.CITY_PRESETS).toHaveLength(18);
    expect(wcore.CITY_PRESETS[0].name).toBe('北京');
    expect(wcore.CITY_PRESETS.every((c) => c.name && typeof c.lat === 'number' && typeof c.lon === 'number')).toBe(true);
  });

  it('G2 WMO_CODES 抽证：desc/type/aura 三字段语义与全域 10 型封闭集', () => {
    expect(wcore.WMO_CODES[0]).toMatchObject({ desc: '晴朗', type: 'sunny' });
    expect(wcore.WMO_CODES[45].type).toBe('fog');
    expect(wcore.WMO_CODES[65]).toMatchObject({ desc: '倾盆大雨', type: 'heavy-rain' });
    expect(wcore.WMO_CODES[99]).toMatchObject({ desc: '强雷暴大冰雹', type: 'storm' });
    const types = [...new Set(Object.values(wcore.WMO_CODES).map((w) => w.type))];
    expect(types.sort()).toEqual(['cloudy', 'drizzle', 'fog', 'heavy-rain', 'heavy-snow', 'overcast', 'rain', 'snow', 'storm', 'sunny']);
    expect(Object.values(wcore.WMO_CODES).every((w) => typeof w.aura === 'string' && w.aura.startsWith('radial-gradient('))).toBe(true);
  });

  it('G3 findNearestCity：正负经纬命中真身 / 非法坐标回落首档（与原 forEach+Math.hypot 语义一致）', () => {
    expect(wcore.findNearestCity(39.9042, 116.4074).name).toBe('北京');
    expect(wcore.findNearestCity(51.5074, -0.1278).name).toBe('伦敦'); // 负经度
    expect(wcore.findNearestCity(35.6762, 139.6503).name).toBe('东京');
    expect(wcore.findNearestCity(34.7466, 113.6253).name).toBe('郑州');
    expect(wcore.findNearestCity(NaN, NaN).name).toBe('北京'); // NaN 比较恒 false → 首档兑底
    expect(wcore.findNearestCity(0, 0).name).toBe('伦敦'); // (0,0) 距离最近真身（hypot(51.5,0.13) 优于其余城）
  });

  it('G4 createWeatherSVG：纯字符串构造十型全覆盖 + 未知类型圆点兑底 + size 参数注入', () => {
    for (const t of ['sunny', 'cloudy', 'overcast', 'fog', 'drizzle', 'rain', 'heavy-rain', 'snow', 'heavy-snow', 'storm']) {
      const svg = wcore.createWeatherSVG(t, 64);
      expect(svg.startsWith('<svg ')).toBe(true);
      expect(svg).toContain('viewBox="0 0 100 100"');
      expect(svg).toContain('width="64"');
    }
    expect(wcore.createWeatherSVG('unknown-type')).toContain('<circle cx="50" cy="50" r="20"'); // 兑底分支
    expect(wcore.createWeatherSVG('sunny')).toContain('width="100"'); // 缺省 size=100
    expect(wcore.createWeatherSVG('sunny')).toContain('weather-spin-slow'); // 品牌面逐字保留
  });

  it('G5 真身直连阴性锚：index.html 经 script src 消费 __weatherCore 四处委托且内联定义退役', () => {
    expect(WEATHER_APP_SRC).toContain('<script src="./core.js">');
    expect(WEATHER_APP_SRC).toContain('const CITY_PRESETS = window.__weatherCore.CITY_PRESETS;');
    expect(WEATHER_APP_SRC).toContain('const WMO_CODES = window.__weatherCore.WMO_CODES;');
    expect(WEATHER_APP_SRC).toContain('window.__weatherCore.createWeatherSVG');
    expect(WEATHER_APP_SRC).toContain('window.__weatherCore.findNearestCity');
    expect(WEATHER_APP_SRC).not.toContain("desc: '大雾弥漫'"); // 内联 22 档字面量退役
    expect(WEATHER_APP_SRC).not.toContain("pinyin: 'luoyang'"); // 内联 18 城字面量退役
    expect(WEATHER_APP_SRC).not.toContain('let minD = Infinity'); // 内联最近城原实现体退役
    expect(WEATHER_APP_SRC).not.toContain('M74 72H32a18'); // 内联 SVG 分支原实现体退役
  });
});

describe('v10.93 #286 续第三批矩阵归属联动与全局水位终态', () => {
  it('H1 translate tier 翻 core-full 且 cores 登记 translateCore', () => {
    const t = MATRIX_JSON.apps.find((a) => a.id === 'translate');
    expect(t.tier).toBe('core-full');
    expect(t.cores).toContain('translateCore');
  });

  it('H2 weather tier 翻 core-full 且 cores 登记 weatherCore', () => {
    const w = MATRIX_JSON.apps.find((a) => a.id === 'weather');
    expect(w.tier).toBe('core-full');
    expect(w.cores).toContain('weatherCore');
  });

  it('H3 全局水位终态（第三批+v316 zero-touch 登记卷+第四批 camera/notes 演进重锚）：ref 25→23（camera/notes 补 core 翻转）/ core-full 27→29 / cores 28→30 / zeroTouch 0 维持 / 消费 100% 零 gap', () => {
    expect(MATRIX_JSON.stats.refOnly).toBe(23);
    expect(MATRIX_JSON.stats.zeroTouch).toBe(0);
    expect(MATRIX_JSON.stats.zeroTouchP0).toBe(0);
    // 演进前终态存档：ref 25 / core-full 27 / cores 28（v10.93=9b1135cb 第三批 + 049eb60 zero-touch 卷在案）
    expect(MATRIX_JSON.stats.coreFull).toBe(29);
    expect(MATRIX_JSON.stats.coresTotal).toBe(30);
    expect(MATRIX_JSON.stats.coresConsumed).toBe(MATRIX_JSON.stats.coresTotal);
    expect(MATRIX_JSON.stats.coresCoveragePct).toBe(100);
    expect(MATRIX_JSON.stats.coreGap).toBe(0);
  });
});

// ==================== 第四批（R142 窗撞号合流重放 · v10.93）：cameraCore + notesCore ====================
const CAMERA_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/camera/core.js'), 'utf-8');
const CAMERA_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/camera/index.html'), 'utf-8');
const NOTES_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/notes/core.js'), 'utf-8');
const NOTES_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/notes/index.html'), 'utf-8');

const cameraCtx = { window: {} };
new Function('window', CAMERA_CORE_SRC)(cameraCtx.window);
const ccore = cameraCtx.window.__cameraCore;

const notesCtx = { window: {} };
new Function('window', NOTES_CORE_SRC)(notesCtx.window);
const ncore = notesCtx.window.__notesCore;

// 合成工厂（确定性，零随机）
const cmemo = (id, title, tag, completed, createdAt, content) => ({ id, title, content: content || '', tag, completed, createdAt });

describe('v10.93 #286 续第四批 cameraCore：滤镜表与相机纯函数', () => {
  it('I1 出口结构立契（五键全集）与 FILTER_CSS 六档逐字符（与 .filter-* CSS 类同值）', () => {
    expect(Object.keys(ccore).sort()).toEqual(['FILTER_CSS', 'filterCssFor', 'formatRecDuration', 'photoVfsName', 'pruneGallery']);
    expect(Object.keys(ccore.FILTER_CSS)).toHaveLength(6);
    expect(ccore.FILTER_CSS.monet).toBe('contrast(1.08) saturate(1.25) hue-rotate(10deg) brightness(1.03)');
    expect(ccore.FILTER_CSS.vintage).toBe('sepia(0.35) contrast(1.15) brightness(0.95) saturate(1.1)');
    expect(ccore.FILTER_CSS.vivid).toBe('saturate(1.6) contrast(1.12)');
    expect(ccore.FILTER_CSS.noir).toBe('grayscale(1) contrast(1.3) brightness(0.9)');
    expect(ccore.FILTER_CSS.cool).toBe('contrast(1.05) saturate(1.15) hue-rotate(-20deg) brightness(1.02)');
    expect(ccore.FILTER_CSS.normal).toBe('none');
  });

  it('I2 filterCssFor 查表与未知档回落 none（原 else 分支等值）', () => {
    expect(ccore.filterCssFor('monet')).toBe(ccore.FILTER_CSS.monet);
    expect(ccore.filterCssFor('noir')).toBe(ccore.FILTER_CSS.noir);
    expect(ccore.filterCssFor('normal')).toBe('none');
    expect(ccore.filterCssFor('不存在档')).toBe('none');
    expect(ccore.filterCssFor(undefined)).toBe('none');
  });

  it('I3 photoVfsName：IMG_<id>.jpg 默认命名 + name 优先 + 非法字符七种替换（v9.14 #175 单一真源）', () => {
    expect(ccore.photoVfsName({ id: 'photo_1' })).toBe('IMG_photo_1.jpg');
    expect(ccore.photoVfsName({ id: 'photo_2', name: '自定义.png' })).toBe('自定义.png');
    expect(ccore.photoVfsName({ id: 'x', name: 'a/b:c*d?e"f<g>h|i.jpg' })).toBe('a_b_c_d_e_f_g_h_i.jpg');
    expect(ccore.photoVfsName({ id: 'x', name: 'clean.jpg' })).toBe('clean.jpg');
  });

  it('I4 formatRecDuration：mm:ss 补零分钟位不封顶 + 负数/小数防御', () => {
    expect(ccore.formatRecDuration(0)).toBe('00:00');
    expect(ccore.formatRecDuration(59)).toBe('00:59');
    expect(ccore.formatRecDuration(60)).toBe('01:00');
    expect(ccore.formatRecDuration(600)).toBe('10:00');
    expect(ccore.formatRecDuration(3661)).toBe('61:01'); // 分钟位不封顶（原 ${m}:${s} 语义）
    expect(ccore.formatRecDuration(-5)).toBe('00:00');
    expect(ccore.formatRecDuration(2.9)).toBe('00:02');
  });

  it('I5 pruneGallery：30 上限单次 pop 语义 + 序列化仅 image 前 10（视频 blobUrl 不入库）', () => {
    const items = Array.from({ length: 31 }, (_, i) => ({ id: i, type: i % 2 ? 'image' : 'video' }));
    const out = ccore.pruneGallery(items);
    expect(out.items).toHaveLength(30); // unshift 后至多超一，单次 pop（原 if 语义保真）
    expect(out.items[0].id).toBe(0); // 头部保留（unshift 新项在头）
    expect(out.serializable.every((i) => i.type === 'image')).toBe(true);
    expect(out.serializable).toHaveLength(10);
    const small = [{ id: 1, type: 'image' }, { id: 2, type: 'video' }];
    const out2 = ccore.pruneGallery(small);
    expect(out2.items).toHaveLength(2);
    expect(out2.serializable).toHaveLength(1);
    expect(ccore.pruneGallery(null).items).toEqual([]); // 防御零崩
  });
});

describe('v10.93 #286 续第四批 notesCore：标签表与备忘录纯逻辑', () => {
  it('J1 出口结构立契（六键全集）+ TAG_MAP 四键 + defaultSeed 四条结构', () => {
    expect(Object.keys(ncore).sort()).toEqual(['TAG_MAP', 'computeStats', 'defaultSeed', 'filterMemos', 'formatTime', 'sortMemos']);
    expect(ncore.TAG_MAP).toEqual({ work: '工作', personal: '个人', idea: '想法', urgent: '紧急' });
    const seed = ncore.defaultSeed();
    expect(seed).toHaveLength(4);
    expect(seed.map((m) => m.tag)).toEqual(['work', 'idea', 'personal', 'urgent']);
    expect(seed.map((m) => m.completed)).toEqual([false, false, true, false]);
    expect(seed[0].createdAt).toBeLessThanOrEqual(Date.now() - 86400000);
    expect(seed[3].createdAt).toBeLessThanOrEqual(Date.now() - 3600000);
  });

  it('J2 formatTime 相对时间五段（与原内联逐分支等值）', () => {
    const now = Date.now();
    expect(ncore.formatTime(now - 30e3)).toBe('刚刚');
    expect(ncore.formatTime(now - 120e3)).toBe('2分钟前');
    expect(ncore.formatTime(now - 7.2e6)).toBe('2小时前');
    expect(ncore.formatTime(now - 3 * 864e5)).toBe('3天前');
    const far = ncore.formatTime(now - 30 * 864e5);
    expect(far).toMatch(/月\d{1,2}日?/); // ≥7 天 zh-CN 短月日（具体日期随本地时区）
  });

  it('J3 filterMemos 谓词全集与 sortMemos 原地语义（本体零变异由 filter 新数组链保证）', () => {
    const A = cmemo(1, '项目报告', 'work', false, 5000);
    const B = cmemo(2, '学习笔记', 'idea', false, 6000);
    const C = cmemo(3, '锻炼', 'personal', true, 7000);
    const D = cmemo(4, '紧急修复 Bug', 'urgent', false, 8000, '内存泄漏');
    expect(ncore.filterMemos([A, D], 'all', '项目')).toEqual([A]);
    expect(ncore.filterMemos([A, D], 'all', 'bug')).toEqual([D]); // 内容大小写不敏感
    expect(ncore.filterMemos([A, D], 'all', '不存在词')).toEqual([]);
    expect(ncore.filterMemos([A, B, C], 'active')).toEqual([A, B]);
    expect(ncore.filterMemos([A, B, C], 'completed')).toEqual([C]);
    expect(ncore.filterMemos([A, B, C], 'idea')).toEqual([B]);
    expect(ncore.filterMemos([A, C], '???')).toEqual([A, C]); // 未知档全通过
    const input = [C, A, D, B];
    const sorted = ncore.sortMemos(input);
    expect(sorted).toBe(input); // 原地排序同引用（原 list.sort 语义）
    expect(sorted.map((m) => m.id)).toEqual([4, 2, 1, 3]);
    const memosLike = [C, A, D, B]; // 本体零变异：render 消费 filterMemos 新数组
    const renderList = ncore.sortMemos(ncore.filterMemos(memosLike, 'all', ''));
    expect(memosLike.map((m) => m.id)).toEqual([3, 1, 4, 2]);
    expect(renderList.map((m) => m.id)).toEqual([4, 2, 1, 3]);
  });

  it('J4 computeStats 四统计（urgent 判定 tag=urgent 且未完成）+ 真身直连阴性锚（内联退役/escape 宿主保留）', () => {
    const A = cmemo(1, 'a', 'work', false, 1);
    const B = cmemo(2, 'b', 'urgent', false, 2);
    const C = cmemo(3, 'c', 'urgent', true, 3);
    expect(ncore.computeStats([A, B, C])).toEqual({ total: 3, active: 2, completed: 1, urgent: 1 });
    // camera 真身直连：script 同步加载 + 四出口消费 + 内联退役
    expect(CAMERA_APP_SRC).toContain('<script src="./core.js">');
    expect(CAMERA_APP_SRC).toContain('window.__cameraCore.filterCssFor');
    expect(CAMERA_APP_SRC).toContain('window.__cameraCore.formatRecDuration');
    expect(CAMERA_APP_SRC).toContain('window.__cameraCore.photoVfsName');
    expect(CAMERA_APP_SRC).toContain('window.__cameraCore.pruneGallery');
    expect(CAMERA_APP_SRC).not.toContain("ctx.filter = 'contrast");
    expect(CAMERA_APP_SRC).not.toMatch(/function photoVfsName/);
    // notes 真身直连：script 同步加载 + 出口消费 + 内联退役（escape DOM 宿主保留在录）
    expect(NOTES_APP_SRC).toContain('<script src="./core.js">');
    expect(NOTES_APP_SRC).toContain('window.__notesCore.defaultSeed');
    expect(NOTES_APP_SRC).toContain('window.__notesCore.TAG_MAP');
    expect(NOTES_APP_SRC).toContain('window.__notesCore.formatTime');
    expect(NOTES_APP_SRC).toContain('window.__notesCore.filterMemos');
    expect(NOTES_APP_SRC).toContain('window.__notesCore.sortMemos');
    expect(NOTES_APP_SRC).toContain('window.__notesCore.computeStats');
    expect(NOTES_APP_SRC).not.toMatch(/const formatTime = ts =>/);
    expect(NOTES_APP_SRC).not.toMatch(/const tagMap = \{/);
    expect(NOTES_APP_SRC).not.toContain("title: '完成项目报告'");
    expect(NOTES_APP_SRC).toContain('const escape = t =>');
  });

  it('J5 矩阵归属联动（第四批）：camera/notes tier 翻 core-full 且 cores 登记（全局终态由 H3 持）', () => {
    const cam = MATRIX_JSON.apps.find((a) => a.id === 'camera');
    const not = MATRIX_JSON.apps.find((a) => a.id === 'notes');
    expect(cam.tier).toBe('core-full');
    expect(cam.cores).toContain('cameraCore');
    expect(not.tier).toBe('core-full');
    expect(not.cores).toContain('notesCore');
  });
});
