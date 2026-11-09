// ==================== v286-refonly-core.test.js — #286 续车道：ref-only 候补池补 core 提取（首批 files/settings · 二批 photo · 三批 translate/weather · v316 zero-touch 登记卷 · 四批 camera/notes+safari v10.97 撞号合流重放） · 六批 archive/pdf v10.97 对侧合流重放 ====================
//
// 覆盖（#286 处置建议②「零触达应用补 core 提取」四批落地）：
//   · 首批 files/settings：A 组 / B 组 / C 组真身直连 / D 组归属
//   · 二批 photo：E 组
//   · 三批 translate/weather：F 组 / G 组 / H 组
//   · 四批 camera/notes+safari（撞号合流重放）：camera I 组 / notes J 组 / safari K 组（全局水位终态由 H3 持真）
//   · 五批 phone/markdown（R143 窗本侧合流重放）：phone M 组（原 K 组改号避让对侧 safari K）/ markdown L 组
//   · 六批 archive/pdf（R143 窗对侧合流重放）：archive N 组（原 L 组改号避让对侧 markdown L）/ pdf O 组（原 M 组改号避让对侧 phone M）（全局水位终态由 H3 持真）
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
const SAFARI_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/safari/core.js'), 'utf-8');
const SAFARI_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/safari/index.html'), 'utf-8');
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

const sfCtx = { window: {} };
new Function('window', SAFARI_CORE_SRC)(sfCtx.window);
const score2 = sfCtx.window.__safariCore;

const ARCHIVE_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/archive/core.js'), 'utf-8');
const ARCHIVE_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/archive/index.html'), 'utf-8');
const arCtx = { window: {} };
new Function('window', ARCHIVE_CORE_SRC)(arCtx.window);
const arc3 = arCtx.window.__archiveCore;
const PDF_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/pdf/core.js'), 'utf-8');
const PDF_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/pdf/index.html'), 'utf-8');
const pdCtx = { window: {} };
new Function('window', PDF_CORE_SRC)(pdCtx.window);
const pdf3 = pdCtx.window.__pdfCore;

// ---------- 合成工厂（确定性，零随机） ----------
const entry = (name, size, modified, mime, type) => ({ name, size, modified, mime, type: type || 'file' });

describe('v10.97 #286 续 filesCore：结构立契与路径工具', () => {
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

describe('v10.97 #286 续 settingsCore：语义映射与确定性', () => {
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

describe('v10.97 #286 续 真身直连与矩阵归属联动', () => {
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

describe('v10.97 #286 续第二批 photoCore：滤镜表与编辑器几何', () => {
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

describe('v10.97 #286 续第三批 translateCore：语言表与时间格式化', () => {
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

describe('v10.97 #286 续第三批 weatherCore：编码表/城市表/最近城/SVG 引擎', () => {
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

describe('v10.97 #286 续第三批矩阵归属联动与全局水位终态', () => {
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

  it('H3 全局水位终态（第三批+v316 zero-touch 登记卷+第四批 camera/notes+safari 对侧合流+第五批 phone/markdown 本侧合流+第六批 archive/pdf 对侧合流+第七批 game2048 对侧+第八批 threes/dice 对侧+第九批 shortcuts 对侧+stocks 本侧合流演进重锚）：ref 25→13（十二家补 core 翻转）/ core-full 27→39 / cores 28→40 / zeroTouch 0 维持 / 消费 100% 零 gap', () => {
    expect(MATRIX_JSON.stats.refOnly).toBe(13);
    expect(MATRIX_JSON.stats.zeroTouch).toBe(0);
    expect(MATRIX_JSON.stats.zeroTouchP0).toBe(0);
    // 演进前终态存档：ref 25 / core-full 27 / cores 28（9b1135cb 第三批 + 049eb60 zero-touch 卷在案）→ 23/29/30（39be8fb7 camera/notes 重放）→ 22/30/31（safari 对侧合流 6875a6a）→ 20/32/33（phone/markdown 本侧合流 df6e01f）→ 18/34/35（archive/pdf 对侧合流终态）→ 17/35/36（game2048 对侧第七批 035bf11）→ 15/37/38（threes/dice 本侧第八批）→ 14/38/39（shortcuts 本侧第九批，本卷持真）
    expect(MATRIX_JSON.stats.coreFull).toBe(39);
    expect(MATRIX_JSON.stats.coresTotal).toBe(40);
    expect(MATRIX_JSON.stats.coresConsumed).toBe(MATRIX_JSON.stats.coresTotal);
    expect(MATRIX_JSON.stats.coresCoveragePct).toBe(100);
    expect(MATRIX_JSON.stats.coreGap).toBe(0);
  });
});

// ==================== 第四批（R142 窗撞号合流重放 · v10.97）：cameraCore + notesCore ====================
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

describe('v10.97 #286 续第四批 cameraCore：滤镜表与相机纯函数', () => {
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

describe('v10.97 #286 续第四批 notesCore：标签表与备忘录纯逻辑', () => {
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
describe('v10.97 #286 续第四批 safariCore：PBK 常量组与返回手势四公式', () => {
  it('K1 出口结构立契（四键全集）与 PBK 五键值序', () => {
    expect(Object.keys(score2).sort()).toEqual(['PBK', 'pbFrameStyles', 'pbQ', 'pbStep']);
    expect(score2.PBK).toEqual({ MIN_SCALE: 0.90, SPAN: 0.10, RADIUS: 28, SHADOW: 0.45, TRACK: 0.85 });
  });

  it('K2 pbQ 钳制与 pbStep 步进归一（原内联逐位等值：闭区间/负位移钳 0/超程钳 1）', () => {
    expect(score2.pbQ(-0.3)).toBe(1);
    expect(score2.pbQ(0)).toBe(1);
    expect(score2.pbQ(0.3)).toBeCloseTo(0.7, 10);
    expect(score2.pbQ(1)).toBe(0);
    expect(score2.pbQ(1.4)).toBe(0);
    expect(score2.pbStep(-50, 400)).toBe(0);
    expect(score2.pbStep(170, 400)).toBeCloseTo(0.5, 10); // 170/(400*0.85)=0.5
    expect(score2.pbStep(9999, 400)).toBe(1);
  });

  it('K3 pbFrameStyles：三样式串逐字符等值（q=0.5/q=1 双点实测）', () => {
    expect(score2.pbFrameStyles(0.5)).toEqual({
      transform: 'translate3d(50.00%,0,0) scale(0.9500)',
      borderRadius: '14.0px',
      boxShadow: '0 16px 44px rgba(0,0,0,0.225), 0 2px 10px rgba(0,0,0,0.2)',
    });
    expect(score2.pbFrameStyles(1).transform).toBe('translate3d(100.00%,0,0) scale(0.9000)'); // MIN_SCALE 下限命中
    expect(score2.pbFrameStyles(1).borderRadius).toBe('28.0px');
    expect(score2.pbFrameStyles(1).boxShadow).toContain('0.450');
    expect(score2.pbFrameStyles(0.999).transform).toContain('scale(0.9001)'); // SPAN 行程末端
  });

  it('K4 真身直连阴性锚：index.html 经 script src 消费 __safariCore 三处委托且内联定义退役', () => {
    expect(SAFARI_APP_SRC).toContain('<script src="./core.js">');
    expect(SAFARI_APP_SRC).toContain('const PBK = window.__safariCore.PBK;');
    expect(SAFARI_APP_SRC).toContain('window.__safariCore.pbQ');
    expect(SAFARI_APP_SRC).toContain('window.__safariCore.pbFrameStyles');
    expect(SAFARI_APP_SRC).toContain('window.__safariCore.pbStep');
    expect(SAFARI_APP_SRC).not.toContain('{ MIN_SCALE: 0.90, SPAN: 0.10, RADIUS: 28'); // 内联 PBK 字面量退役
    expect(SAFARI_APP_SRC).not.toMatch(/1 - PBK\.SPAN \* q/); // 内联 scale 原实现体退役
    expect(SAFARI_APP_SRC).not.toContain('0 16px 44px rgba(0,0,0,'); // 内联 shadow 串构造退役
  });

  it('K5 矩阵归属联动（第四批合流）：safari tier 翻 core-full 且 cores 登记（全局终态由 H3 持）', () => {
    const s = MATRIX_JSON.apps.find((a) => a.id === 'safari');
    expect(s.tier).toBe('core-full');
    expect(s.cores).toContain('safariCore');
  });
});

// ==================== 第五批（R143 窗 · v10.97）：phoneCore + markdownCore ====================
const PHONE_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/phone/core.js'), 'utf-8');
const PHONE_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/phone/index.html'), 'utf-8');
const MARKDOWN_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/markdown/core.js'), 'utf-8');
const MARKDOWN_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/markdown/index.html'), 'utf-8');

const phoneCtx = { window: {} };
new Function('window', PHONE_CORE_SRC)(phoneCtx.window);
const dialCore = phoneCtx.window.__phoneCore;

const mdCtx = { window: {} };
new Function('window', MARKDOWN_CORE_SRC)(mdCtx.window);
const mdcore = mdCtx.window.__markdownCore;

// 合成工厂（确定性，零随机）
const contact = (name, phone) => ({ name, phone });

describe('v10.97 #286 续第五批 phoneCore：拨号正规化与通讯录两段匹配', () => {
  it('M1 出口结构立契（五键全集）', () => {
    expect(Object.keys(dialCore).sort()).toEqual(['dialAppend', 'dialBackspace', 'formatNumberDisplay', 'lookupName', 'normalizeDial']);
  });

  it('M2 normalizeDial：数字与 + 保留、其余剥除、空值回落空串（原 lookupContact 两处内联字面量等值上移）', () => {
    expect(dialCore.normalizeDial('138-1234-5678')).toBe('13812345678');
    expect(dialCore.normalizeDial('+86 138 1234 5678')).toBe('+8613812345678');
    expect(dialCore.normalizeDial('138*#')).toBe('138');
    expect(dialCore.normalizeDial('')).toBe('');
    expect(dialCore.normalizeDial(null)).toBe('');
    expect(dialCore.normalizeDial(undefined)).toBe('');
  });

  it('M3 lookupName 两段匹配：位数闸 / 全号精确优先 / 尾号回落 / 未命中 null（v7.19 应用互联真身，list 参数化零 IO）', () => {
    const list = [contact('张三', '13812345678'), contact('李四', '+8613987654321')];
    expect(dialCore.lookupName(list, '13')).toBe(null); // <3 位闸
    expect(dialCore.lookupName(list, '138')).toBe(null); // 恰 3 位进入匹配但无命中
    expect(dialCore.lookupName(list, '13812345678')).toBe('张三'); // 全号精确
    expect(dialCore.lookupName(list, '138-1234-5678')).toBe('张三'); // 输入侧正规化（原字面量同源）
    expect(dialCore.lookupName(list, '5678')).toBe('张三'); // 尾号 endsWith 回落
    expect(dialCore.lookupName(list, '13987654321')).toBe('李四'); // 通讯录侧 + 剥除后精确
    expect(dialCore.lookupName(list, '9999')).toBe(null); // 未命中
    expect(dialCore.lookupName([], '13812345678')).toBe(null); // 空通讯录
  });

  it('M4 formatNumberDisplay：3-4-4…分组 + 含非数字原样返回 + 空值空串（原内联逐语句等值）', () => {
    expect(dialCore.formatNumberDisplay('')).toBe('');
    expect(dialCore.formatNumberDisplay(null)).toBe('');
    expect(dialCore.formatNumberDisplay('1')).toBe('1');
    expect(dialCore.formatNumberDisplay('138')).toBe('138');
    expect(dialCore.formatNumberDisplay('1381')).toBe('138 1');
    expect(dialCore.formatNumberDisplay('1381234')).toBe('138 1234');
    expect(dialCore.formatNumberDisplay('13812345')).toBe('138 1234 5');
    expect(dialCore.formatNumberDisplay('13812345678')).toBe('138 1234 5678');
    expect(dialCore.formatNumberDisplay('138123456789012345')).toBe('138 1234 5678 9012 345'); // i>7 后每 4 位
    expect(dialCore.formatNumberDisplay('138*#')).toBe('138*#'); // 非数字原样返回
  });

  it('M5 dialAppend/dialBackspace：15 位上限闸与退格纯数据段（updateDisplay 触发时机由内联保持零行为变化）', () => {
    expect(dialCore.dialAppend('', '1')).toBe('1');
    expect(dialCore.dialAppend('12345678901234', '5')).toBe('123456789012345'); // 14+1=15 仍收
    expect(dialCore.dialAppend('123456789012345', '6')).toBe('123456789012345'); // 满位原样返回
    expect(dialCore.dialBackspace('')).toBe('');
    expect(dialCore.dialBackspace('12')).toBe('1');
    expect(dialCore.dialBackspace('1')).toBe('');
  });

  it('M6 真身直连阴性锚：index.html 经 script src 消费 __phoneCore 且内联实现退役（readContacts IO 与 tel: 宿主保留在录）', () => {
    expect(PHONE_APP_SRC).toContain('<script src="./core.js">');
    expect(PHONE_APP_SRC).toContain('window.__phoneCore.lookupName');
    expect(PHONE_APP_SRC).toContain('window.__phoneCore.formatNumberDisplay');
    expect(PHONE_APP_SRC).toContain('window.__phoneCore.dialAppend');
    expect(PHONE_APP_SRC).toContain('window.__phoneCore.dialBackspace');
    // 内联退役（真身上移后不再重复定义）
    expect(PHONE_APP_SRC).not.toMatch(/const lookupContact = \(numStr\) => \{\s*const digits/);
    expect(PHONE_APP_SRC).not.toContain('currentNumber += num');
    expect(PHONE_APP_SRC).not.toContain('currentNumber.slice(0, -1)');
    expect(PHONE_APP_SRC).not.toMatch(/i === 3 \|\| i === 7/);
    // 宿主依赖保留内联（notes escape 同律在录）：localStorage IO + tel: 触发
    expect(PHONE_APP_SRC).toContain("localStorage.getItem('md3_contacts')");
    expect(PHONE_APP_SRC).toContain('tel:');
  });

  it('M7 矩阵归属联动（第五批）：phone tier 翻 core-full 且 cores 登记 phoneCore（全局终态由 H3 持）', () => {
    const p = MATRIX_JSON.apps.find((a) => a.id === 'phone');
    expect(p.tier).toBe('core-full');
    expect(p.cores).toContain('phoneCore');
  });
});

describe('v10.97 #286 续第五批 markdownCore：词数统计与导出模板纯函数', () => {
  it('L1 出口结构立契（七键全集）', () => {
    expect(Object.keys(mdcore).sort()).toEqual(['buildExportPage', 'clampSplit', 'countWords', 'fmtDocSize', 'normalizeMdDocs', 'pressTransform', 'safeNameOf']);
  });

  it('L2 countWords：拉丁词元 + CJK 单字混排计数（原 statUpdate 词数正则逐字符等值上移）', () => {
    expect(mdcore.countWords('')).toBe(0);
    expect(mdcore.countWords('hello')).toBe(1);
    expect(mdcore.countWords('hello world')).toBe(2);
    expect(mdcore.countWords('世界')).toBe(2);
    expect(mdcore.countWords('hello 世界')).toBe(3);
    expect(mdcore.countWords("it's fine")).toBe(2); // 撇号连字词元
    expect(mdcore.countWords('well-known')).toBe(1); // 连字符连字词元
    expect(mdcore.countWords('a_1 42')).toBe(2); // 下划线数字词元
    expect(mdcore.countWords('   ')).toBe(0);
  });

  it('L3 safeNameOf：后缀剥除（.md/.mdx 大小写不敏感；.markdown 忠实原正则不剥）+ 非法字符替换 + 空白折叠 + 60 截断 + 空值回落（#175 同款）', () => {
    expect(mdcore.safeNameOf('')).toBe('未命名');
    expect(mdcore.safeNameOf(null)).toBe('未命名');
    expect(mdcore.safeNameOf('  笔记  ')).toBe('笔记');
    expect(mdcore.safeNameOf('a.md')).toBe('a');
    expect(mdcore.safeNameOf('B.MD')).toBe('B'); // 大小写不敏感
    expect(mdcore.safeNameOf('doc.mdx')).toBe('doc');
    expect(mdcore.safeNameOf('keep.markdown')).toBe('keep.markdown'); // 原正则语义：.markdown 非剥除目标
    expect(mdcore.safeNameOf('a/b:c*d?e"f<g>h|i')).toBe('a_b_c_d_e_f_g_h_i'); // 八种非法字符
    expect(mdcore.safeNameOf('多  空格   折叠')).toBe('多 空格 折叠');
    expect(mdcore.safeNameOf('x'.repeat(80)).length).toBe(60); // 截断
  });

  it('L4 pressTransform：距离衰减数学（d=1→0.55/d=2→0.10/d≥3→0）与按压者本位（tile-bounce 同构参数逐值等值）', () => {
    expect(mdcore.pressTransform(2, 2)).toEqual({ shift: 0, sc: 0.88, radius: 15, z: '1' }); // 按压者本位
    const d1 = mdcore.pressTransform(1, 2);
    expect(d1.sc).toBeCloseTo(0.9725, 10); // 1 - 0.05×0.55
    expect(d1.shift).toBeCloseTo(1.1, 10); // 左邻朝按压者让位 +2×0.55
    expect(d1.radius).toBeCloseTo(11.65, 10); // 10 + 3×0.55
    expect(d1.z).toBe('');
    const d2 = mdcore.pressTransform(4, 2);
    expect(d2.sc).toBeCloseTo(0.995, 10); // 1 - 0.05×0.1
    expect(d2.shift).toBeCloseTo(-0.2, 10); // 右邻让位 -2×0.1
    expect(d2.radius).toBeCloseTo(10.3, 10);
    const d3 = mdcore.pressTransform(5, 2);
    expect(Object.is(d3.shift, -0)).toBe(true); // d=3 → f=0 → 原表达式符号位随让位方向（-1×0=-0），消费侧 toFixed(1) 输出 "0.0" 与原内联逐字符等值
    expect(d3.sc).toBe(1);
  });

  it('L5 clampSplit：编辑栏占比钳制 0.22–0.78（原内联 clamp 表达式等值上移）', () => {
    expect(mdcore.clampSplit(0.5)).toBe(0.5);
    expect(mdcore.clampSplit(0.1)).toBe(0.22);
    expect(mdcore.clampSplit(0.9)).toBe(0.78);
    expect(mdcore.clampSplit(-1)).toBe(0.22);
    expect(mdcore.clampSplit(2)).toBe(0.78);
  });

  it('L6 buildExportPage：独立页模板结构（head 元信息 + fallback 样式 + 正文 + idle-slider 尾注 + 拆写原手法保留）', () => {
    const page = mdcore.buildExportPage('<p>正文</p>', '我的文档');
    expect(page.startsWith('<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n')).toBe(true);
    expect(page).toContain('<title>我的文档</title>');
    expect(page).toContain('max-width:760px');
    expect(page).toContain('var(--md-font,system-ui');
    expect(page).toContain('</style>\n</head>\n<body>\n<p>正文</p>\n');
    expect(page).toContain('<scr' + 'ipt src="../_shared/idle-slider.js"></scr' + 'ipt>');
    expect(page.endsWith('</body>\n</html>\n')).toBe(true);
  });

  it('L7 normalizeMdDocs/fmtDocSize：.md 过滤 + path 末段回落 + size 透传 + B/KB 分档 + 空值空串 + null 容错', () => {
    const docs = mdcore.normalizeMdDocs([
      { name: 'a.md', size: 10 },
      { name: 'b.txt', size: 5 }, // 非 .md 剔除
      { path: '/documents/c.md', size: 2048 }, // name 缺失回落 path 末段
      { name: 'd.MD', size: null }, // 大小写不敏感后缀；size 原样透传
    ]);
    expect(docs.map((d) => d.name)).toEqual(['a.md', 'c.md', 'd.MD']);
    expect(docs[0].size).toBe(10);
    expect(docs[1].size).toBe(2048);
    expect(docs[2].size).toBe(null);
    expect(mdcore.normalizeMdDocs(undefined)).toEqual([]); // null/undefined 容错
    expect(mdcore.fmtDocSize(999)).toBe('999 B');
    expect(mdcore.fmtDocSize(1024)).toBe('1.0 KB');
    expect(mdcore.fmtDocSize(2048)).toBe('2.0 KB');
    expect(mdcore.fmtDocSize(null)).toBe('');
    expect(mdcore.fmtDocSize(undefined)).toBe('');
  });

  it('L8 真身直连阴性锚：index.html 经 script src 消费 __markdownCore 且内联实现退役（renderMd 过闸/fs 桥/选区宿主保留在录）', () => {
    expect(MARKDOWN_APP_SRC).toContain('<script src="./core.js">');
    expect(MARKDOWN_APP_SRC).toContain('window.__markdownCore.countWords');
    expect(MARKDOWN_APP_SRC).toContain('window.__markdownCore.safeNameOf');
    expect(MARKDOWN_APP_SRC).toContain('window.__markdownCore.pressTransform');
    expect(MARKDOWN_APP_SRC).toContain('window.__markdownCore.clampSplit');
    expect(MARKDOWN_APP_SRC).toContain('window.__markdownCore.buildExportPage');
    expect(MARKDOWN_APP_SRC).toContain('window.__markdownCore.normalizeMdDocs');
    expect(MARKDOWN_APP_SRC).toContain('window.__markdownCore.fmtDocSize');
    // 内联退役（真身上移后不再重复定义）
    expect(MARKDOWN_APP_SRC).not.toContain('A-Za-z0-9_'); // 词数正则上移
    expect(MARKDOWN_APP_SRC).not.toContain('1 - d * 0.45'); // 衰减数学上移
    expect(MARKDOWN_APP_SRC).not.toContain('Math.min(0.78'); // 分栏钳制上移
    expect(MARKDOWN_APP_SRC).not.toContain('max-width:760px;margin:0 auto;'); // 导出页模板上移
    // 宿主依赖保留内联（escape 同律在录）：sanitize 过闸渲染 + VFS 桥 + textarea 选区
    expect(MARKDOWN_APP_SRC).toContain('window.__mdSanitize(marked.parse(');
    expect(MARKDOWN_APP_SRC).toContain('selectionStart');
    expect(MARKDOWN_APP_SRC).toContain('__system.fs.list');
  });

  it('L9 矩阵归属联动（第五批）：markdown tier 翻 core-full 且 cores 登记 markdownCore（全局终态由 H3 持）', () => {
    const m = MATRIX_JSON.apps.find((a) => a.id === 'markdown');
    expect(m.tier).toBe('core-full');
    expect(m.cores).toContain('markdownCore');
  });
});
describe('v10.97 #286 续第六批 archiveCore：防御常量与压缩域纯函数', () => {
  it('N1 出口结构立契（八键全集）与常量值序（VFS 四目录/zip 炸弹防御 500·200MB）', () => {
    expect(Object.keys(arc3).sort()).toEqual([
      'VFS_DIRS', 'ZIP_MAX_ENTRIES', 'ZIP_MAX_TOTAL', 'baseOf', 'clampSplitPct', 'fmtSize', 'rippleStyles', 'safeName',
    ]);
    expect(arc3.VFS_DIRS).toEqual(['/documents', '/photos', '/music', '/archives']);
    expect(arc3.ZIP_MAX_ENTRIES).toBe(500);
    expect(arc3.ZIP_MAX_TOTAL).toBe(200 * 1048576);
  });

  it('N2 fmtSize 三档边界 + safeName 净化全链（.zip 剥离/非法字符/截 60/回落/ext 追加）', () => {
    expect(arc3.fmtSize(null)).toBe('');
    expect(arc3.fmtSize(0)).toBe('0 B');
    expect(arc3.fmtSize(1023)).toBe('1023 B');
    expect(arc3.fmtSize(1024)).toBe('1.0 KB');
    expect(arc3.fmtSize(1048575)).toBe('1024.0 KB');
    expect(arc3.fmtSize(1048576)).toBe('1.0 MB');
    expect(arc3.safeName('report.zip', '.zip')).toBe('report.zip'); // 剥后追回，语义恒等
    expect(arc3.safeName('a<b>c:d', '')).toBe('a_b_c_d'); // [\/:*?"<>|] 全集替换
    expect(arc3.safeName('x'.repeat(70), '')).toBe('x'.repeat(60)); // 截 60
    expect(arc3.safeName('', '')).toBe('新压缩包'); // 空回落
    expect(arc3.safeName('   ', '')).toBe('新压缩包'); // 纯空白回落
    expect(arc3.safeName('pkg', '.zip')).toBe('pkg.zip'); // ext 追加
  });

  it('N3 baseOf 空值防御 + clampSplitPct 钳制 [0.22,0.78]（域内恒等）', () => {
    expect(arc3.baseOf('/archives/x/y.zip')).toBe('y.zip');
    expect(arc3.baseOf('')).toBe('');
    expect(arc3.baseOf(null)).toBe('');
    expect(arc3.baseOf('a')).toBe('a');
    expect(arc3.clampSplitPct(0.9)).toBe(0.78);
    expect(arc3.clampSplitPct(0.1)).toBe(0.22);
    expect(arc3.clampSplitPct(0.5)).toBe(0.5);
    expect(arc3.clampSplitPct(0.22)).toBe(0.22);
    expect(arc3.clampSplitPct(0.78)).toBe(0.78);
  });

  it('N4 rippleStyles 三点逐字符等值（主位满档/d=2 衰减 0.1/远位 zIndex 空）+ DOM 写回留内联', () => {
    expect(arc3.rippleStyles(0, 0)).toEqual({
      transform: 'translateX(0.0px) scale(0.880)',
      borderRadius: '17px', // 12 + 5*1
      zIndex: '1',
    });
    expect(arc3.rippleStyles(2, 0)).toEqual({
      transform: 'translateX(-0.2px) scale(0.995)', // f=1-2*0.45=0.1 → sc=1-0.05*0.1, shift=-2*0.1
      borderRadius: '12.3px', // 12 + 3*0.1
      zIndex: '',
    });
    expect(arc3.rippleStyles(1, 1).transform).toBe('translateX(0.0px) scale(0.880)'); // 自身为主位
  });

  it('N5 真身直连阴性锚（八处桥消费+script src）与矩阵归属联动（第六批）：archive tier 翻 core-full 且 cores 登记（全局终态由 H3 持）', () => {
    expect(ARCHIVE_APP_SRC).toContain('<script src="./core.js">');
    expect(ARCHIVE_APP_SRC).toContain('window.__archiveCore.VFS_DIRS');
    expect(ARCHIVE_APP_SRC).toContain('window.__archiveCore.fmtSize');
    expect(ARCHIVE_APP_SRC).toContain('window.__archiveCore.safeName');
    expect(ARCHIVE_APP_SRC).toContain('window.__archiveCore.baseOf');
    expect(ARCHIVE_APP_SRC).toContain('window.__archiveCore.ZIP_MAX_ENTRIES');
    expect(ARCHIVE_APP_SRC).toContain('window.__archiveCore.rippleStyles(i, originIdx)');
    expect(ARCHIVE_APP_SRC).toContain('window.__archiveCore.clampSplitPct(pct)');
    // 内联真身退役
    expect(ARCHIVE_APP_SRC).not.toContain('var d = Math.abs(i - originIdx)'); // 按压数学退役
    expect(ARCHIVE_APP_SRC).not.toContain('1 - d * 0.45');
    expect(ARCHIVE_APP_SRC).not.toContain("'新压缩包'"); // 回落字面量退役
    expect(ARCHIVE_APP_SRC).not.toContain('200 * 1048576'); // 防御常量字面量退役
    // escape 宿主保留（#240 单一转义真源在 sanitize.js，不入 core）
    expect(ARCHIVE_APP_SRC).toContain("function esc(s) { return window.__mdEscape(s); }");
    const a = MATRIX_JSON.apps.find((x) => x.id === 'archive');
    expect(a.tier).toBe('core-full');
    expect(a.cores).toContain('archiveCore');
  });
});

describe('v10.97 #286 续第六批 pdfCore：钳制/扁平化/命中收集纯函数', () => {
  it('O1 出口结构立契（十一键全集）与防御常量值序（500 页/0.5–3.0/步进 0.1）', () => {
    expect(Object.keys(pdf3).sort()).toEqual([
      'PDF_MAX_PAGES', 'SCALE_MAX', 'SCALE_MIN', 'SCALE_STEP', 'baseOf', 'clampPage', 'clampScale',
      'collectHits', 'flattenOutline', 'fmtSize', 'rippleStyles',
    ]);
    expect(pdf3.PDF_MAX_PAGES).toBe(500);
    expect(pdf3.SCALE_MIN).toBe(0.5);
    expect(pdf3.SCALE_MAX).toBe(3.0);
    expect(pdf3.SCALE_STEP).toBe(0.1);
  });

  it('O2 clampScale 三态 + clampPage 边界（parseInt 非数值回落 1/负数/超界/域内）', () => {
    expect(pdf3.clampScale(0.2)).toBe(0.5);
    expect(pdf3.clampScale(9)).toBe(3.0);
    expect(pdf3.clampScale(1.4)).toBe(1.4);
    expect(pdf3.clampPage('x', 99)).toBe(1);
    expect(pdf3.clampPage(-5, 99)).toBe(1);
    expect(pdf3.clampPage(0, 99)).toBe(1);
    expect(pdf3.clampPage(999, 99)).toBe(99);
    expect(pdf3.clampPage('7', 99)).toBe(7);
    expect(pdf3.clampPage(1, 1)).toBe(1);
  });

  it('O3 flattenOutline 递归扁平化（depth 钳 3/(未命名) 兜底/每层 200 截断/无子级不递归）', () => {
    const flat = pdf3.flattenOutline([
      { title: 'a', items: [{ title: '', items: [{ title: 'c', items: [{ title: 'd', items: [{ title: 'e' }] }] }] }] },
    ]);
    expect(flat).toEqual([
      { title: 'a', dest: undefined, depth: 0 },
      { title: '(未命名)', dest: undefined, depth: 1 },
      { title: 'c', dest: undefined, depth: 2 },
      { title: 'd', dest: undefined, depth: 3 }, // depth 4 层 'e' 丢弃（depth<3 才递归）
    ]);
    const many = pdf3.flattenOutline(Array.from({ length: 250 }, (_, i) => ({ title: 't' + i })));
    expect(many.length).toBe(200); // 每层 slice(0,200) 截断
    expect(pdf3.flattenOutline([])).toEqual([]);
    expect(pdf3.flattenOutline([{ title: 'solo' }]).length).toBe(1); // 无子级单条
  });

  it('O4 collectHits 上下文窗逐字符/guard 20 封顶/跨命中不重叠/空白归一', () => {
    const hits = pdf3.collectHits('abc abc', 'abc', 3);
    expect(hits).toEqual([
      { page: 3, at: 0, raw: 'abc abc' },
      { page: 3, at: 4, raw: 'abc abc' },
    ]);
    expect(pdf3.collectHits('foo\nbar kw baz', 'kw', 1)).toEqual([
      { page: 1, at: 8, raw: 'foo bar kw baz' }, // \s+ → ' ' 空白归一
    ]);
    const many = pdf3.collectHits(Array.from({ length: 25 }, () => 'x').join(' '), 'x', 2);
    expect(many.length).toBe(20); // guard 20 封顶
    expect(many[19].at).toBe(38); // 第 20 个 'x' 位于 2*19
    expect(pdf3.collectHits('nothing here', 'zzz', 1)).toEqual([]);
    expect(pdf3.collectHits('', 'a', 1)).toEqual([]);
  });

  it('O5 真身直连阴性锚（十处桥消费+script src）与矩阵归属联动（第六批）：pdf tier 翻 core-full 且 cores 登记（全局终态由 H3 持）', () => {
    expect(PDF_APP_SRC).toContain('<script src="./core.js">');
    expect(PDF_APP_SRC).toContain('window.__pdfCore.PDF_MAX_PAGES');
    expect(PDF_APP_SRC).toContain('window.__pdfCore.SCALE_MIN');
    expect(PDF_APP_SRC).toContain('window.__pdfCore.SCALE_MAX');
    expect(PDF_APP_SRC).toContain('window.__pdfCore.SCALE_STEP');
    expect(PDF_APP_SRC).toContain('window.__pdfCore.fmtSize');
    expect(PDF_APP_SRC).toContain('window.__pdfCore.baseOf');
    expect(PDF_APP_SRC).toContain('window.__pdfCore.clampScale');
    expect(PDF_APP_SRC).toContain('window.__pdfCore.clampPage(n, S.doc.numPages)');
    expect(PDF_APP_SRC).toContain('window.__pdfCore.flattenOutline(outline)');
    expect(PDF_APP_SRC).toContain('window.__pdfCore.collectHits(text, kwL, p)');
    expect(PDF_APP_SRC).toContain('window.__pdfCore.rippleStyles(i, originIdx)');
    // 内联真身退役
    expect(PDF_APP_SRC).not.toMatch(/items\.slice\(0, 200\)/); // walk 闭包逐层截断退役
    expect(PDF_APP_SRC).not.toContain('depth: Math.min(depth, 3)');
    expect(PDF_APP_SRC).not.toContain('var at = tl.indexOf'); // 命中收集循环退役
    expect(PDF_APP_SRC).not.toContain('Math.max(0, at - 16)'); // 上下文窗构造退役
    expect(PDF_APP_SRC).not.toContain("title: it.title || '(未命名)'"); // 兜底字面量退役
    // escape 宿主保留（#240 单一转义真源在 sanitize.js，不入 core）
    expect(PDF_APP_SRC).toContain("function esc(s) { return window.__mdEscape(s); }");
    const p = MATRIX_JSON.apps.find((x) => x.id === 'pdf');
    expect(p.tier).toBe('core-full');
    expect(p.cores).toContain('pdfCore');
  });
});

describe('v10.97 #286 续第七批 game2048Core：概率核/AI 2-Ply 模拟器/估值纯函数', () => {
  const G2048_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/game2048/core.js'), 'utf-8');
  const G2048_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/game2048/index.html'), 'utf-8');
  const g48Ctx = { window: {} };
  new Function('window', G2048_CORE_SRC)(g48Ctx.window);
  const g48 = g48Ctx.window.__game2048Core;

  it('P1 出口结构立契（十键全集）与常量值序（卡值分布表/概率阈值 0.04/0.08）', () => {
    expect(Object.keys(g48).sort()).toEqual([
      'ROLL_BOMB', 'ROLL_DOUBLE', 'VALS', 'buildHistoryRecord', 'capHistory',
      'evaluateBoard', 'fastSimulate', 'mergePoints', 'rollCardKind', 'worstBlockedCol',
    ]);
    expect(g48.VALS).toEqual([2, 2, 2, 4, 4, 4, 8, 8, 16, 32, 64]);
    expect(g48.ROLL_BOMB).toBe(0.04);
    expect(g48.ROLL_DOUBLE).toBe(0.08);
  });

  it('P2 rollCardKind 三态分布（炸弹/翻倍/普通 VALS 域）+ mergePoints 连击分公式', () => {
    // rKind < 0.04 → 炸弹；0.04 ≤ rKind < 0.08 → 翻倍；其余按 rVal 抽 VALS
    expect(g48.rollCardKind(0.01, 0.9)).toEqual({ val: '💣', isBomb: true });
    expect(g48.rollCardKind(0.05, 0.9)).toEqual({ val: '⚡', isDouble: true });
    const normal = g48.rollCardKind(0.5, 0);
    expect(normal).toEqual({ val: 2 }); // rVal=0 → VALS[0]
    expect(g48.rollCardKind(0.5, 0.999).val).toBe(64); // rVal→1 上沿 → VALS[10]=64
    for (const r of [0.1, 0.3, 0.5, 0.7, 0.95]) {
      expect(g48.VALS).toContain(g48.rollCardKind(r, 0.3).val); // 普通域恒在 VALS 表内
    }
    expect(g48.mergePoints(128, 3)).toBe(384); // pts = val × comboCount
    expect(g48.mergePoints(64, 1)).toBe(64);
  });

  it('P3 fastSimulate 四态（同值级联合并/炸弹双弹/翻倍计分/不可合并停止）与零改原盘', () => {
    // 同值合并：[2,2] → 合并为 4，gain=4×1；再无同值对停止
    const s1 = g48.fastSimulate([[], [], [], [], []], { val: 2 }, 2);
    expect(s1.cols[2]).toEqual([{ val: 2 }]); // 不可合并：card 原样入列（无 isWildcard 字段）
    // 级联双 combo：列 [16,8] 推入 8 → (8,8)→16 gain 16×1 → 列 [16,16] → (16,16)→32 gain 32×2，总 80
    const board = [[], [], [], [{ val: 16 }, { val: 8 }], []];
    const s2 = g48.fastSimulate(board, { val: 8 }, 3);
    expect(s2.gain).toBe(16 * 1 + 32 * 2); // = 80 级联双 combo（合并结果与下邻同值才续）
    expect(s2.combos).toBe(2);
    expect(s2.cols[3]).toEqual([{ val: 32, isWildcard: false }]);
    expect(board[3].length).toBe(2); // 原盘零改动（slice 隔离）
    // 顶对不匹配即停止：列 [2,2,4,4] 推入 8 → 顶对 (4,8) 不同值 break，下方对不检
    const s2b = g48.fastSimulate([[], [], [], [{ val: 2 }, { val: 2 }, { val: 4 }, { val: 4 }], []], { val: 8 }, 3);
    expect(s2b.gain).toBe(0);
    expect(s2b.combos).toBe(0);
    expect(s2b.cols[3].length).toBe(5);
    // 炸弹：双弹固定 300 分单 combo（board[3]=[16,8] 双弹清空）
    const s3 = g48.fastSimulate(board, { isBomb: true }, 3);
    expect(s3).toEqual({ gain: 300, combos: 1, cols: [[], [], [], [], []] });
    // 翻倍：顶牌 8→16（gain 16）与其下 16 成同值对 → 级联合并 32（gain += 32×1）总 48
    const s4 = g48.fastSimulate(board, { isDouble: true }, 3);
    expect(s4.gain).toBe(48);
    expect(s4.cols[3]).toEqual([{ val: 32, isWildcard: false }]);
    // 万能牌：与非数值顶牌合并 → tv 回落 64 → v=128
    const s5 = g48.fastSimulate([[{ val: '★', isWildcard: true }], [], [], [], []], { val: '★', isWildcard: true }, 0);
    expect(s5.gain).toBe(128);
    expect(s5.cols[0]).toEqual([{ val: 128, isWildcard: false }]);
  });

  it('P4 evaluateBoard 数学（收益 2.8×+连击 950/空列 380/列高惩罚梯度/单调序/倍距/逆序钳 6）', () => {
    expect(g48.evaluateBoard([[], [], [], [], []], 0, 0)).toBe(380 * 5); // 全空五列
    expect(g48.evaluateBoard([[], [], [], [], []], 100, 2)).toBe(100 * 2.8 + 2 * 950 + 380 * 5);
    // 8 满列 [2,4,8..256]（严格倍距递增：up<down 走逆序罚分分支 r=2 钳 6 → -800×7，
    // down≥64 三对追罚 -1400×3）+ 空列四列 380×4
    const full = Array.from({ length: 8 }, (_, i) => ({ val: 2 ** (i + 1) }));
    const evFull = g48.evaluateBoard([full, [], [], [], []], 0, 0);
    expect(evFull).toBe(-90000 - 800 * 7 - 1400 * 3 + 380 * 4); // = -98280
    // 逆序 [2,64]：len≤4 +120 / down-up=32 钳 6 → -2400 / down≥64 追罚 -1400 / 空列 380×4
    const evInv = g48.evaluateBoard([[{ val: 2 }, { val: 64 }], [], [], [], []], 0, 0);
    expect(evInv).toBe(120 - 2400 - 1400 + 380 * 4); // = -2160
  });

  it('P5 真身直连阴性锚（script src+七消费点）与内联退役四重+矩阵归属联动（第七批）：game2048 tier 翻 core-full 且 cores 登记（全局终态由 H3 持）', () => {
    expect(G2048_APP_SRC).toContain('<script src="./core.js">');
    expect(G2048_APP_SRC).toContain('window.__game2048Core.VALS');
    expect(G2048_APP_SRC).toContain('window.__game2048Core.rollCardKind(Math.random(), Math.random())');
    expect(G2048_APP_SRC).toContain('window.__game2048Core.mergePoints(val, comboCount)');
    expect(G2048_APP_SRC).toContain('window.__game2048Core.fastSimulate(columns, card1, c1)');
    expect(G2048_APP_SRC).toContain('window.__game2048Core.fastSimulate(sim1.cols, remHand[h2], c2)');
    expect(G2048_APP_SRC).toContain('window.__game2048Core.evaluateBoard(sim2.cols');
    expect(G2048_APP_SRC).toContain('window.__game2048Core.worstBlockedCol(columns, 5)');
    expect(G2048_APP_SRC).toContain('window.__game2048Core.buildHistoryRecord(kind, gameMode, score, highScore');
    expect(G2048_APP_SRC).toContain('window.__game2048Core.capHistory(g2048History, G2048_HISTORY_CAP)');
    // 内联真身退役
    expect(G2048_APP_SRC).not.toContain('function fastSimulate('); // AI 模拟器本体退役
    expect(G2048_APP_SRC).not.toContain('function evaluateBoard('); // 估值函数本体退役
    expect(G2048_APP_SRC).not.toContain('ev -= 90000'); // 列高惩罚梯度字面退役
    expect(G2048_APP_SRC).not.toContain("if(r < 0.04)"); // genCard 概率分布内联退役
    // 弹层 a11y 宿主保留（#241 三件套在位，host 侧职责不入 core）
    expect(G2048_APP_SRC).toContain('window.__mdDialogA11y');
    const g = MATRIX_JSON.apps.find((x) => x.id === 'game2048');
    expect(g.tier).toBe('core-full');
    expect(g.cores).toContain('game2048Core');
  });
});

// ==================== 第八批（R145 窗本侧 · v10.97 同槽共号合流重放）：threesCore + diceCore ====================
const THREES_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/threes/core.js'), 'utf-8');
const THREES_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/threes/index.html'), 'utf-8');
const DICE_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/dice/core.js'), 'utf-8');
const DICE_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/dice/index.html'), 'utf-8');

const thCtx = { window: {} };
new Function('window', THREES_CORE_SRC)(thCtx.window);
const thcore = thCtx.window.__threesCore;

const diCtx = { window: {} };
new Function('window', DICE_CORE_SRC)(diCtx.window);
const dicore = diCtx.window.__diceCore;

describe('v10.97 #286 续第八批 threesCore：调色板三表与计分/合并契约', () => {
  it('Q1 出口立契：__threesCore 九出口全量在位（六表 FACES/PALETTE/TEXT_COLS/DIRS/AI_LINES/SNAKE_MATS + 三函数 getScore/canCombine/getMergedVal）', () => {
    for (const k of ['FACES', 'PALETTE', 'TEXT_COLS', 'DIRS', 'AI_LINES', 'SNAKE_MATS', 'getScore', 'canCombine', 'getMergedVal']) {
      expect(thcore[k], `__threesCore.${k}`).toBeTruthy();
    }
    expect(typeof thcore.getScore).toBe('function');
    expect(typeof thcore.canCombine).toBe('function');
    expect(typeof thcore.getMergedVal).toBe('function');
  });

  it('Q2 三表 14 档同键完整性：FACES/PALETTE/TEXT_COLS 键集一致（1..6144）且 DIRS/AI_LINES 四向形态', () => {
    const keys = Object.keys(thcore.FACES).sort((a, b) => +a - +b).join(',');
    expect(keys).toBe('1,2,3,6,12,24,48,96,192,384,768,1536,3072,6144');
    expect(Object.keys(thcore.PALETTE).sort((a, b) => +a - +b).join(',')).toBe(keys);
    expect(Object.keys(thcore.TEXT_COLS).sort((a, b) => +a - +b).join(',')).toBe(keys);
    expect(Object.keys(thcore.DIRS).sort().join(',')).toBe('down,left,right,up');
    expect(Object.keys(thcore.AI_LINES).sort().join(',')).toBe('down,left,right,up');
    for (const d of ['left', 'right', 'up', 'down']) {
      expect(thcore.AI_LINES[d].length).toBe(4);
      thcore.AI_LINES[d].forEach((line) => expect(line.length).toBe(4));
    }
  });

  it('Q3 getScore 计分契约：1/2 计零 + 3^(log2(v/3)+1) 幂律档位', () => {
    expect(thcore.getScore(1)).toBe(0);
    expect(thcore.getScore(2)).toBe(0);
    expect(thcore.getScore(3)).toBe(3);
    expect(thcore.getScore(6)).toBe(9);
    expect(thcore.getScore(12)).toBe(27);
    expect(thcore.getScore(48)).toBe(243);
    expect(thcore.getScore(6144)).toBe(3 ** (Math.log2(6144 / 3) + 1));
  });

  it('Q4 合并契约：1+2/2+1 互合 → 3；v>=3 同值合 → 2v；异值非对合阴性', () => {
    expect(thcore.canCombine(1, 2)).toBe(true);
    expect(thcore.canCombine(2, 1)).toBe(true);
    expect(thcore.canCombine(3, 3)).toBe(true);
    expect(thcore.canCombine(6, 6)).toBe(true);
    expect(thcore.canCombine(6144, 6144)).toBe(true);
    expect(thcore.canCombine(1, 1)).toBe(false);
    expect(thcore.canCombine(2, 2)).toBe(false);
    expect(thcore.canCombine(3, 6)).toBe(false);
    expect(thcore.getMergedVal(1, 2)).toBe(3);
    expect(thcore.getMergedVal(2, 1)).toBe(3);
    expect(thcore.getMergedVal(3, 3)).toBe(6);
    expect(thcore.getMergedVal(768, 768)).toBe(1536);
    expect(thcore.getMergedVal(3, 6)).toBe(9); // 不可合时回退加法（move 循环前置 canCombine 不触发）
  });

  it('Q5 SNAKE_MATS 六席 16 值 + 真身直连阴性锚（桥消费行齐备+内联表退役）与矩阵归属联动（第八批）：threes tier 翻 core-full 且 cores 登记', () => {
    expect(thcore.SNAKE_MATS.length).toBe(6);
    thcore.SNAKE_MATS.forEach((m) => expect(m.length).toBe(16));
    expect(thcore.SNAKE_MATS[0][0]).toBe(24); // 蛇头 24 起手
    expect(thcore.SNAKE_MATS[4][12]).toBe(24); // 逆序席蛇头对角
    // 桥消费行齐备（六表 + 三契约）
    expect(THREES_APP_SRC).toContain('<script src="./core.js">');
    expect(THREES_APP_SRC).toContain('window.__threesCore.FACES');
    expect(THREES_APP_SRC).toContain('window.__threesCore.PALETTE');
    expect(THREES_APP_SRC).toContain('window.__threesCore.TEXT_COLS');
    expect(THREES_APP_SRC).toContain('window.__threesCore.getScore(v)');
    expect(THREES_APP_SRC).toContain('window.__threesCore.DIRS');
    expect(THREES_APP_SRC).toContain('window.__threesCore.AI_LINES');
    expect(THREES_APP_SRC).toContain('window.__threesCore.SNAKE_MATS');
    expect(THREES_APP_SRC).toContain('window.__threesCore.canCombine(a, b)');
    expect(THREES_APP_SRC).toContain('window.__threesCore.getMergedVal(a, b)');
    // 内联真身退役
    expect(THREES_APP_SRC).not.toContain("const FACES = { 1:'");
    expect(THREES_APP_SRC).not.toContain('const SNAKE_MATS = [');
    expect(THREES_APP_SRC).not.toContain('v < 3 ? 0 : 3 ** (Math.log2(v / 3) + 1)');
    expect(THREES_APP_SRC).not.toContain('(a >= 3 && a === b)');
    const t = MATRIX_JSON.apps.find((x) => x.id === 'threes');
    expect(t.tier).toBe('core-full');
    expect(t.cores).toContain('threesCore');
  });
});

describe('v10.97 #286 续第八批 diceCore：骰面数据契约与顶面判定纯数学', () => {
  it('R1 出口立契：__diceCore 六出口全量在位（三表 D6_DOTS/D6_FACE_ORDER/D6_FACE_VECS + 三函数 rotateVecByQuat/pickTopFaceD6/pickTopFacePoly）', () => {
    for (const k of ['D6_DOTS', 'D6_FACE_ORDER', 'D6_FACE_VECS', 'rotateVecByQuat', 'pickTopFaceD6', 'pickTopFacePoly']) {
      expect(dicore[k], `__diceCore.${k}`).toBeTruthy();
    }
    expect(typeof dicore.rotateVecByQuat).toBe('function');
    expect(typeof dicore.pickTopFaceD6).toBe('function');
    expect(typeof dicore.pickTopFacePoly).toBe('function');
  });

  it('R2 D6_DOTS 六档点位数契约（1→1 … 6→6）+ 非法 v 兜底空数组（内联侧 || [] 同款）', () => {
    expect(dicore.D6_DOTS[1].length).toBe(1);
    expect(dicore.D6_DOTS[2].length).toBe(2);
    expect(dicore.D6_DOTS[3].length).toBe(3);
    expect(dicore.D6_DOTS[4].length).toBe(4);
    expect(dicore.D6_DOTS[5].length).toBe(5);
    expect(dicore.D6_DOTS[6].length).toBe(6);
    expect(dicore.D6_DOTS[6][0]).toEqual([76, 68]); // 6 档顶行 y=68 特调
    expect(dicore.D6_DOTS[9] || []).toEqual([]); // 非法档兜底（内联 || [] 消费形）
  });

  it('R3 材质序契约：D6_FACE_ORDER = [1,6,2,5,3,4] 与 D6_FACE_VECS 六向同序且皆单位向量', () => {
    expect(dicore.D6_FACE_ORDER).toEqual([1, 6, 2, 5, 3, 4]);
    expect(dicore.D6_FACE_VECS.length).toBe(6);
    dicore.D6_FACE_VECS.forEach((v) => {
      expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 10);
    });
    expect(dicore.D6_FACE_VECS[2]).toEqual({ x: 0, y: 1, z: 0 }); // +y 面序 idx2 → 面值 2
  });

  it('R4 rotateVecByQuat 纯数学：恒等四元数不动点 + 90° 绕 z 轴旋转向量 (1,0,0)→(0,1,0)（零渲染/物理库依赖阴性）', () => {
    const id = { x: 0, y: 0, z: 0, w: 1 };
    expect(dicore.rotateVecByQuat(1, 0, 0, id)).toEqual({ x: 1, y: 0, z: 0 });
    const s2 = Math.SQRT1_2;
    const qz90 = { x: 0, y: 0, z: s2, w: s2 }; // 绕 z 轴 90°
    const r = dicore.rotateVecByQuat(1, 0, 0, qz90);
    expect(r.x).toBeCloseTo(0, 10);
    expect(r.y).toBeCloseTo(1, 10);
    expect(r.z).toBeCloseTo(0, 10);
    expect(DICE_CORE_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')).not.toMatch(/THREE|CANNON/); // 代码区零渲染/物理库依赖（注释提及库名不算，语义=import/调用面为零）
  });

  it('R5 顶面判定契约 + 真身直连阴性锚（四处桥消费行+内联表退役）与矩阵归属联动（第八批）：dice tier 翻 core-full 且 cores 登记', () => {
    const id = { x: 0, y: 0, z: 0, w: 1 };
    expect(dicore.pickTopFaceD6(id)).toBe(2); // 恒等 → +y 面 = D6_FACE_ORDER[2] = 2
    const qz90 = { x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 };
    expect(dicore.pickTopFaceD6(qz90)).toBe(1); // 绕 z 90°（右手系）：(1,0,0)→(0,1,0) → +x 面朝上 → 顶面 = D6_FACE_ORDER[0] = 1（四元数纯数学旋转闭环演算）
    const poly = [
      { val: 3, normal: { x: 0, y: 1, z: 0 } },
      { val: 5, normal: { x: 0, y: -0.9, z: 0.1 } },
    ];
    expect(dicore.pickTopFacePoly(id, poly)).toBe(3);
    expect(dicore.pickTopFacePoly(id, [{ val: 7, normal: { x: 0, y: 0.2, z: 0 } }])).toBe(7);
    // 桥消费行齐备
    expect(DICE_APP_SRC).toContain('<script src="./core.js">');
    expect(DICE_APP_SRC).toContain('window.__diceCore.D6_DOTS[v] || []');
    expect(DICE_APP_SRC).toContain('window.__diceCore.D6_FACE_ORDER.map');
    expect(DICE_APP_SRC).toContain('window.__diceCore.pickTopFaceD6(d.body.quaternion)');
    expect(DICE_APP_SRC).toContain('window.__diceCore.pickTopFacePoly(d.body.quaternion, d.faceNormals)');
    // 内联真身退役
    expect(DICE_APP_SRC).not.toContain('[[128,128]],2:[[76,76]'); // 点位表内联退役
    expect(DICE_APP_SRC).not.toContain('const vals = [1, 6, 2, 5, 3, 4]'); // 面值表内联退役
    expect(DICE_APP_SRC).not.toContain('new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0)'); // 六向表内联退役
    // cssVar 墨色读取留内联（DOM 侧宿主保留，issue#5 锚同域）
    expect(DICE_APP_SRC).toContain("cssVar('--die-ink', '#0F382F')");
    const d = MATRIX_JSON.apps.find((x) => x.id === 'dice');
    expect(d.tier).toBe('core-full');
    expect(d.cores).toContain('diceCore');
  });
});

// ==================== 第九批（R145 窗加餐本侧 · v10.97）：shortcutsCore（reminders 结构性暂缓登记在案） ====================
const SHORTCUTS_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/shortcuts/core.js'), 'utf-8');
const SHORTCUTS_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/shortcuts/index.html'), 'utf-8');

const scCtx = { window: {} };
new Function('window', SHORTCUTS_CORE_SRC)(scCtx.window);
const sccore = scCtx.window.__shortcutsCore;

describe('v10.97 #286 续第九批 shortcutsCore：深链契约真源表与用量工具', () => {
  it('S1 出口立契：__shortcutsCore 三出口全量在位（SHORTCUT_LINKS/USAGE_KEY/fmtLastRun）', () => {
    expect(sccore.SHORTCUT_LINKS).toBeTruthy();
    expect(typeof sccore.SHORTCUT_LINKS).toBe('object');
    expect(sccore.USAGE_KEY).toBe('md3_shortcuts_usage_v1');
    expect(typeof sccore.fmtLastRun).toBe('function');
  });

  it('S2 深链契约表十 runner 全量：五字段齐备且与 data-run 键集一致', () => {
    const keys = Object.keys(sccore.SHORTCUT_LINKS).sort().join(',');
    expect(keys).toBe('cal-note,home,msg,music,note,reminder,scan,timer,translate-clipboard,weather');
    for (const k of Object.keys(sccore.SHORTCUT_LINKS)) {
      const l = sccore.SHORTCUT_LINKS[k];
      expect(typeof l.appId, `${k}.appId`).toBe('string');
      expect(l.appId.length, `${k}.appId 非空`).toBeGreaterThan(0);
      expect(typeof l.okMsg, `${k}.okMsg`).toBe('string');
      expect(typeof l.label, `${k}.label`).toBe('string');
      // event 为 null（纯打开）或非空字符串（动作深链）
      if (l.event !== null) expect(l.event.length, `${k}.event`).toBeGreaterThan(0);
    }
  });

  it('S3 深链契约逐点抽验：timer 秒数载荷 / translate-clipboard 特例 appId / music 续播事件', () => {
    expect(sccore.SHORTCUT_LINKS['timer'].appId).toBe('clock_app');
    expect(sccore.SHORTCUT_LINKS['timer'].event).toBe('timer/start');
    expect(sccore.SHORTCUT_LINKS['timer'].payload).toEqual({ seconds: 300 });
    expect(sccore.SHORTCUT_LINKS['translate-clipboard'].appId).toBe('translate');
    expect(sccore.SHORTCUT_LINKS['translate-clipboard'].event).toBe('translate/prefill');
    expect(sccore.SHORTCUT_LINKS['music'].event).toBe('music/play'); // v7.24 真续播
    expect(sccore.SHORTCUT_LINKS['weather'].event).toBeNull(); // 纯打开无事件
    expect(sccore.SHORTCUT_LINKS['home'].appId).toBe('map');
  });

  it('S4 fmtLastRun 四档边界 + 真身直连阴性锚（桥消费行齐备+内联退役）与矩阵归属联动（第九批）：shortcuts tier 翻 core-full 且 cores 登记', () => {
    const now = Date.now();
    expect(sccore.fmtLastRun(now - 30000)).toBe('刚刚');
    expect(sccore.fmtLastRun(now - 120000)).toBe('2 分钟前');
    expect(sccore.fmtLastRun(now - 7200000)).toBe('2 小时前');
    expect(sccore.fmtLastRun(now - 172800000)).toBe('2 天前');
    // 桥消费行齐备
    expect(SHORTCUTS_APP_SRC).toContain('<script src="./core.js">');
    expect(SHORTCUTS_APP_SRC).toContain('window.__shortcutsCore.SHORTCUT_LINKS');
    expect(SHORTCUTS_APP_SRC).toContain('window.__shortcutsCore.USAGE_KEY');
    expect(SHORTCUTS_APP_SRC).toContain('window.__shortcutsCore.fmtLastRun(ts)');
    expect(SHORTCUTS_APP_SRC).toContain('var l=L.timer; sysOpen(el.dataset.name||l.label, l.appId, l.event, l.payload, l.okMsg)');
    // 内联真身退役
    expect(SHORTCUTS_APP_SRC).not.toContain("sysOpen(el.dataset.name||'打开天气','weather'");
    expect(SHORTCUTS_APP_SRC).not.toContain("'clock_app','timer/start'");
    expect(SHORTCUTS_APP_SRC).not.toContain('var d = Date.now() - ts;');
    expect(SHORTCUTS_APP_SRC).not.toContain("return Math.floor(d / 86400000) + ' 天前'");
    // sysOpen 工厂与 clipboard 特例宿主保留
    expect(SHORTCUTS_APP_SRC).toContain('function sysOpen(name, appId, event, payload, okMsg)');
    expect(SHORTCUTS_APP_SRC).toContain('S.clipboard.read()');
    const sc = MATRIX_JSON.apps.find((x) => x.id === 'shortcuts');
    expect(sc.tier).toBe('core-full');
    expect(sc.cores).toContain('shortcutsCore');
  });
});

describe('v10.97 #286 续第八批 stocksCore（合流改号 T，避让对侧 threes Q/dice R/shortcuts S 组）：符号映射/模拟行情/双态色值纯函数', () => {
  const STOCKS_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/stocks/core.js'), 'utf-8');
  const STOCKS_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/stocks/index.html'), 'utf-8');
  const stCtx = { window: {} };
  new Function('window', STOCKS_CORE_SRC)(stCtx.window);
  const stc = stCtx.window.__stocksCore;

  it('T1 出口结构立契（六键全集）与双态色值组逐值', () => {
    expect(Object.keys(stc).sort()).toEqual([
      'COLOR_GREEN_UP', 'COLOR_RED_UP', 'getTencentSymbol', 'signPrefix', 'simQuote', 'upBadgeClass',
    ]);
    expect(stc.COLOR_RED_UP).toEqual({ up: '#ef4444', down: '#10b981', upBg: 'rgba(239, 68, 68, 0.15)', downBg: 'rgba(16, 185, 129, 0.15)' });
    expect(stc.COLOR_GREEN_UP).toEqual({ up: '#10b981', down: '#ef4444', upBg: 'rgba(16, 185, 129, 0.15)', downBg: 'rgba(239, 68, 68, 0.15)' });
  });

  it('T2 getTencentSymbol 三段映射（sh/sz 整 id/hk·us 前缀+code/其余 null）', () => {
    expect(stc.getTencentSymbol({ id: 'sh000001', code: '000001' })).toBe('s_sh000001');
    expect(stc.getTencentSymbol({ id: 'sz399001', code: '399001' })).toBe('s_sz399001');
    expect(stc.getTencentSymbol({ id: 'hk00700', code: '00700' })).toBe('s_hk00700');
    expect(stc.getTencentSymbol({ id: 'usAAPL', code: 'AAPL' })).toBe('s_usAAPL');
    expect(stc.getTencentSymbol({ id: 'jp7203', code: '7203' })).toBe(null);
  });

  it('T3 simQuote 五字段数学核（seed=0 零变动/isUp 零算涨/上浮下浮/亿单位折算）', () => {
    const s = { basePrice: 100 };
    expect(stc.simQuote(s, 0)).toEqual({ price: 100, change: 0, pct: 0, amount: '85.0亿', isUp: true });
    const up = stc.simQuote(s, 0.02);
    expect(up.price).toBe(102);
    expect(up.change).toBe(2);
    expect(up.pct).toBe(2);
    expect(up.isUp).toBe(true);
    const down = stc.simQuote(s, -0.01);
    expect(down.price).toBe(99);
    expect(down.change).toBe(-1);
    expect(down.pct).toBe(-1);
    expect(down.isUp).toBe(false);
    // 精度：toFixed(2) 三级逐段 Number 化（seed 0.005 → 100.5 → change 0.5 → pct 0.5）
    expect(stc.simQuote(s, 0.005)).toEqual({ price: 100.5, change: 0.5, pct: 0.5, amount: '85.0亿', isUp: true });
  });

  it('T4 upBadgeClass/signPrefix 双态（正涨负跌/零算涨 +）', () => {
    expect(stc.upBadgeClass(true)).toBe('price-badge-up');
    expect(stc.upBadgeClass(false)).toBe('price-badge-down');
    expect(stc.signPrefix(true)).toBe('+');
    expect(stc.signPrefix(false)).toBe('');
  });

  it('T5 真身直连阴性锚（script src+六消费点）与内联退役三重+矩阵归属联动（第八批）：stocks tier 翻 core-full 且 cores 登记（全局终态由 H3 持）', () => {
    expect(STOCKS_APP_SRC).toContain('<script src="./core.js">');
    expect(STOCKS_APP_SRC).toContain('const getTencentSymbol = window.__stocksCore.getTencentSymbol;');
    expect(STOCKS_APP_SRC).toContain('window.__stocksCore.simQuote(s, seed)');
    expect(STOCKS_APP_SRC).toContain('window.__stocksCore.COLOR_RED_UP');
    expect(STOCKS_APP_SRC).toContain('window.__stocksCore.COLOR_GREEN_UP');
    expect(STOCKS_APP_SRC).toContain('window.__stocksCore.upBadgeClass(q.isUp)');
    expect(STOCKS_APP_SRC).toContain('window.__stocksCore.signPrefix(q.isUp)');
    // 内联真身退役
    expect(STOCKS_APP_SRC).not.toContain("return 's_' + s.id;"); // 符号映射本体退役
    expect(STOCKS_APP_SRC).not.toContain("(s.basePrice * (1 + seed)).toFixed(2)"); // 行情数学核退役
    expect(STOCKS_APP_SRC).not.toContain("style.setProperty('--stock-up', '#ef4444')"); // 色值字面退役
    // 弹层 a11y 宿主保留（#241 三件套在位，host 侧职责不入 core）
    expect(STOCKS_APP_SRC).toContain('window.__mdDialogA11y');
    const st = MATRIX_JSON.apps.find((x) => x.id === 'stocks');
    expect(st.tier).toBe('core-full');
    expect(st.cores).toContain('stocksCore');
  });
});
