// ==================== v286-refonly-core.test.js — #286 续车道：ref-only 候补池补 core 提取（首批 files/settings · 二批 photo · 三批 translate/weather · v316 zero-touch 登记卷 · 四批 camera/notes+safari v11.19 撞号合流重放） · 六批 archive/pdf v11.19 对侧合流重放 ====================
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=ref-only 注册面内容（兼核契约面：退役前须拆分——#291 §3 复核注记）；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）——R149 改名机械批注入
//
// 覆盖（#286 处置建议②「零触达应用补 core 提取」四批落地）：
//   · 首批 files/settings：A 组 / B 组 / C 组真身直连 / D 组归属
//   · 二批 photo：E 组
//   · 三批 translate/weather：F 组 / G 组 / H 组
//   · 四批 camera/notes+safari（撞号合流重放）：camera I 组 / notes J 组 / safari K 组（全局水位终态由 H3 持真）
//   · 五批 phone/markdown（R143 窗本侧合流重放）：phone M 组（原 K 组改号避让对侧 safari K）/ markdown L 组
//   · 六批 archive/pdf（R143 窗对侧合流重放）：archive N 组（原 L 组改号避让对侧 markdown L）/ pdf O 组（原 M 组改号避让对侧 phone M）（全局水位终态由 H3 持真）
//   · 七~九批+深提增值+第十批（R145/R146 窗对侧+本侧多轮合流）：game2048 P/V 组 / threes Q/U 组 / dice R 组 / shortcuts S 组 / stocks T 组 / cal_app W 组 / contacts X 组（本侧改号避让对侧增值 U/V 与对侧第十批 calendar W）
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
const NOTIF_PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps/settings-pages/notif.js'), 'utf-8'); // v11.19 #284 批 7：NOTIF 簇单源真身（__settingsCore.lockSummary 委托点随簇）
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

describe('v11.19 #286 续 filesCore：结构立契与路径工具', () => {
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

describe('v11.19 #286 续 settingsCore：语义映射与确定性', () => {
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

describe('v11.19 #286 续 真身直连与矩阵归属联动', () => {
  it('C1 内联侧确有 __filesCore 桥消费（防孤立副本漂移的阴性锚）', () => {
    expect(FILES_APP_SRC).toContain("import '../files-core.js'");
    expect(FILES_APP_SRC).toContain('window.__filesCore');
    expect(FILES_APP_SRC).toContain('__fc.sortEntries');
  });

  it('C2 内联侧确有 __settingsCore 桥消费（六处委托，PAGE_SCRIPT 内真身直连；v11.19 #284 批 7 NOTIF 簇迁出后读取面=宿主 settings.js+notif.js 真身合计守恒）', () => {
    expect(SETTINGS_APP_SRC).toContain("import '../settings-core.js'");
    const bridges = (SETTINGS_APP_SRC + NOTIF_PAGE_SRC).match(/window\.__settingsCore\./g) || [];
    expect(bridges.length).toBeGreaterThanOrEqual(7); // isConvo/lockSummary/timeoutSummary/dHash/fmtUptime/relTime/fmtAppPermSummary（批 7 后 lockSummary 委托在 notif.js 簇体，读取面合计守恒）
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

describe('v11.19 #286 续第二批 photoCore：滤镜表与编辑器几何', () => {
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

describe('v11.19 #286 续第三批 translateCore：语言表与时间格式化', () => {
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

describe('v11.19 #286 续第三批 weatherCore：编码表/城市表/最近城/SVG 引擎', () => {
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

describe('v11.19 #286 续第三批矩阵归属联动与全局水位终态', () => {
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

  it('H3 全局水位终态（第三批+v316 zero-touch 登记卷+第四批 camera/notes+safari 对侧合流+第五批 phone/markdown 本侧合流+第六批 archive/pdf 对侧合流+第七批 game2048 对侧+第八批 threes/dice 对侧+第九批 shortcuts 对侧+stocks 本侧合流+对侧深提增值+第十批 cal_app 对侧+contacts 本侧双站合流+第十一批 flow11 对侧+第十二批 recorder 本侧双站合流+第十三批 installer 本侧池收口）：ref 25→8（十七家补 core 翻转或暂缓收口）/ core-full 27→44 / cores 28→45 / zeroTouch 0 维持 / 消费 100% 零 gap', () => {
    expect(MATRIX_JSON.stats.refOnly).toBe(8);
    expect(MATRIX_JSON.stats.zeroTouch).toBe(0);
    expect(MATRIX_JSON.stats.zeroTouchP0).toBe(0);
    // 演进前终态存档：ref 25 / core-full 27 / cores 28（9b1135cb 第三批 + 049eb60 zero-touch 卷在案）→ 23/29/30（39be8fb7 camera/notes 重放）→ 22/30/31（safari 对侧合流 6875a6a）→ 20/32/33（phone/markdown 本侧合流 df6e01f）→ 18/34/35（archive/pdf 对侧合流终态）→ 17/35/36（game2048 对侧第七批 035bf11）→ 15/37/38（threes/dice 对侧第八批）→ 14/38/39（shortcuts 对侧第九批）→ 13/39/40（stocks 本侧合流 680e2bf）→ 12/40/41（cal_app 对侧第十批 65ce27bf，其卷持真）→ 11/41/42（contacts 本侧第十批合流重放 f1b861a2，双站合流终态）→ 10/42/43（flow11 对侧第十一批 20366fbb，其卷持真，D 族几何留 host）→ 9/43/44（recorder 本侧第十二批薄面自有轻量核 8af56515 重放，双站合流终态）→ 8/44/45（installer 本侧第十三批薄面自有轻量核 6747754568 认领，native 池收口卷，本卷持真）
    expect(MATRIX_JSON.stats.coreFull).toBe(44);
    expect(MATRIX_JSON.stats.coresTotal).toBe(45);
    expect(MATRIX_JSON.stats.coresConsumed).toBe(MATRIX_JSON.stats.coresTotal);
    expect(MATRIX_JSON.stats.coresCoveragePct).toBe(100);
    expect(MATRIX_JSON.stats.coreGap).toBe(0);
  });
});

// ==================== 第四批（R142 窗撞号合流重放 · v11.19）：cameraCore + notesCore ====================
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

describe('v11.19 #286 续第四批 cameraCore：滤镜表与相机纯函数', () => {
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

describe('v11.19 #286 续第四批 notesCore：标签表与备忘录纯逻辑', () => {
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
describe('v11.19 #286 续第四批 safariCore：PBK 常量组与返回手势四公式', () => {
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

// ==================== 第五批（R143 窗 · v11.19）：phoneCore + markdownCore ====================
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

describe('v11.19 #286 续第五批 phoneCore：拨号正规化与通讯录两段匹配', () => {
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

describe('v11.19 #286 续第五批 markdownCore：词数统计与导出模板纯函数', () => {
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
describe('v11.19 #286 续第六批 archiveCore：防御常量与压缩域纯函数', () => {
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

describe('v11.19 #286 续第六批 pdfCore：钳制/扁平化/命中收集纯函数', () => {
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

describe('v11.19 #286 续第七批 game2048Core：概率核/AI 2-Ply 模拟器/估值纯函数', () => {
  const G2048_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/game2048/core.js'), 'utf-8');
  const G2048_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/game2048/index.html'), 'utf-8');
  const g48Ctx = { window: {} };
  new Function('window', G2048_CORE_SRC)(g48Ctx.window);
  const g48 = g48Ctx.window.__game2048Core;

  it('P1 出口结构立契（十键全集 → 增值合流 21 键：第七批十出口在先契约 + 深提增值 11 出口 R145 合流）与常量值序（卡值分布表/概率阈值 0.04/0.08）', () => {
    expect(Object.keys(g48).sort()).toEqual([
      'ROLL_BOMB', 'ROLL_DOUBLE', 'TIP_HIGHLIGHT_RE', 'VALS', 'aiPlayable', 'bombPopCount',
      'buildHistoryRecord', 'canPlay', 'capHistory', 'cardId', 'dragTilt', 'evaluateBoard',
      'fastSimulate', 'isTipHighlight', 'layoutMetrics', 'mergePoints', 'mergeVal',
      'rollCardKind', 'toolDisabled', 'wildcardCard', 'worstBlockedCol',
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

// ==================== 第八批（R145 窗本侧 · v11.19 同槽共号合流重放）：threesCore + diceCore ====================
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

describe('v11.19 #286 续第八批 threesCore：调色板三表与计分/合并契约', () => {
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

describe('v11.19 #286 续第八批 diceCore：骰面数据契约与顶面判定纯数学', () => {
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

// ==================== 第九批（R145 窗加餐本侧 · v11.19）：shortcutsCore（reminders 结构性暂缓登记在案） ====================
const SHORTCUTS_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/shortcuts/core.js'), 'utf-8');
const SHORTCUTS_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/shortcuts/index.html'), 'utf-8');

const scCtx = { window: {} };
new Function('window', SHORTCUTS_CORE_SRC)(scCtx.window);
const sccore = scCtx.window.__shortcutsCore;

describe('v11.19 #286 续第九批 shortcutsCore：深链契约真源表与用量工具', () => {
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

// ==================== 对侧第八批续卡 T 组 stocksCore（680e2bf2 原文回插 · rebase --theirs 方向反转教训：rebase 中 theirs=我方，其 T 组曾被误覆盖，本段原样恢复） ====================

describe('v11.19 #286 续第八批 stocksCore（合流改号 T，避让对侧 threes Q/dice R/shortcuts S 组）：符号映射/模拟行情/双态色值纯函数', () => {
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

// ==================== 深提增值合流段（R145 窗 · v11.19 · Job 2933040 第 2 系列）：U 组 threes + V 组 game2048 ====================
// 合流口径：第七批 P 组（035bf11f）/第八批 Q·R 组（423e539f）/第九批 S 组（fcd3f1e4 shortcuts）/第八批续卡 T 组（680e2bf2 stocks）
// 在先契约原样保留；本段为对侧未触及面的净增深提（game2048 11 出口 / threes 9 出口 GM AI 期望树全链）。
// 新旧实现等值由 equiv-check 脚本 ALL-EQUIV-OK 实证（与第七/八批内联原文逐点比对）后落锚。
const G2048_ADD_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/game2048/index.html'), 'utf-8');
const g8xCtx = { window: {} };
new Function('window', readFileSync(join(ROOT, 'ios-desktop/apps/game2048/core.js'), 'utf-8'))(g8xCtx.window);
const g8x = g8xCtx.window.__game2048Core; // 增值出口与第七批十出口同一桥对象

describe('v11.19 #286 续深提增值 U 组：threesCore GM AI 期望树全链（deckProbs/池/频率/sim/eval/期望树/决策）', () => {
  it('U1 增值键集在位（9 键补齐第八批九出口）+ deckProbs 空堆均分/计数分布', () => {
    for (const k of ['deckProbs', 'bonusPool', 'mergeFreq', 'chimeFreq', 'simFlat', 'evalFlat', 'expectimaxFlat', 'chanceFlat', 'bestDirFlat']) {
      expect(thcore[k], `__threesCore.${k} 增值出口在位`).toBeTruthy();
    }
    const p0 = thcore.deckProbs(null);
    expect(p0[1]).toBeCloseTo(1 / 3, 12);
    expect(p0[2]).toBeCloseTo(1 / 3, 12);
    expect(p0[3]).toBeCloseTo(1 / 3, 12);
    expect(thcore.deckProbs([1, 1, 2])).toEqual({ 1: 2 / 3, 2: 1 / 3, 3: 0 });
    expect(thcore.deckProbs([3, 3, 3])).toEqual({ 1: 0, 2: 0, 3: 1 });
  });

  it('U2 bonusPool 奖励池 + mergeFreq/chimeFreq 音频频率数学', () => {
    expect(thcore.bonusPool(24)).toEqual([]);
    expect(thcore.bonusPool(48)).toEqual([6]);
    expect(thcore.bonusPool(96)).toEqual([6, 12]);
    expect(thcore.bonusPool(192)).toEqual([6, 12, 24]);
    expect(thcore.mergeFreq(3)).toBe(422);
    expect(thcore.mergeFreq(6144)).toBe(1180); // min(v×14,800) 封顶
    expect(thcore.chimeFreq(1)).toBe(320 * Math.pow(1.12, 1));
  });

  it('U3 simFlat 四向扫描（右移落位+spawn 线尾/1+1 非合并对亦不位移/3+3 合并得 6+spawn 3）', () => {
    const rR = thcore.simFlat(Int32Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 'right');
    expect(rR.moved).toBe(true);
    expect(Array.from(rR.b)).toEqual([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(rR.spawns).toEqual([0]);
    const rL = thcore.simFlat(Int32Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 'left');
    expect(rL.moved).toBe(false);
    const r11 = thcore.simFlat(Int32Array.from([1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 'left');
    expect(r11.moved).toBe(false); // threes 规则：1+1 非合并对
    const r33 = thcore.simFlat(Int32Array.from([3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 'left');
    expect(r33.moved).toBe(true);
    expect(Array.from(r33.b)[0]).toBe(6);
    expect(r33.spawns).toEqual([3]);
  });

  it('U4 evalFlat 估值（全零盘 26000=空格 22400+大据角 3600/蛇形首段 28770）+ 期望树决策（d0 即估值/死局 -999999/bestDir 确定性）', () => {
    expect(thcore.evalFlat(new Int32Array(16))).toBe(26000);
    expect(thcore.evalFlat(Int32Array.from([3, 6, 12, 24, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(28770);
    const dead = Int32Array.from([3, 6, 3, 6, 6, 3, 6, 3, 3, 6, 3, 6, 6, 3, 6, 3]);
    const probs = thcore.deckProbs([1, 2, 3]);
    expect(thcore.evalFlat(dead)).toBe(19565);
    expect(thcore.expectimaxFlat(dead, 0, true, 6, probs)).toBe(19565); // d0 直落估值
    expect(thcore.expectimaxFlat(dead, 2, true, 6, probs)).toBe(-999999); // 四向全堵
    expect(thcore.chanceFlat(new Int32Array(16), [], 2, 6, probs)).toBe(26000); // 空 spawns 即估值
    expect(thcore.bestDirFlat(Int32Array.from([1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 3, 3, probs)).toBe('left');
  });

  it('U5 真身直连阴性锚（AI 四方法委托+音频/概率/池三处）与内联退役与矩阵归属联动（全局终态由 H3 持）', () => {
    expect(THREES_APP_SRC).toContain('window.__threesCore.deckProbs(this.deck)');
    expect(THREES_APP_SRC).toContain('window.__threesCore.bonusPool(max)');
    expect(THREES_APP_SRC).toContain('window.__threesCore.mergeFreq(v)');
    expect(THREES_APP_SRC).toContain('window.__threesCore.chimeFreq(r)');
    expect(THREES_APP_SRC).toContain('window.__threesCore.simFlat(flat, dir)');
    expect(THREES_APP_SRC).toContain('window.__threesCore.evalFlat(b)');
    expect(THREES_APP_SRC).toContain('window.__threesCore.expectimaxFlat(flat, depth, isPlayer, next,');
    expect(THREES_APP_SRC).toContain('window.__threesCore.chanceFlat(flat, spawns, depth, next,');
    expect(THREES_APP_SRC).toContain('window.__threesCore.bestDirFlat(this.g.getFlat()');
    // 内联真身退役（AI 体/频率公式/概率体/池字面；draw() 同形语句为合法保留取概率体独有片段）
    expect(THREES_APP_SRC).not.toContain('380 + Math.min(v * 14, 800)');
    expect(THREES_APP_SRC).not.toContain('320 * (1.12 ** r)');
    expect(THREES_APP_SRC).not.toContain('950 + Math.log2(Math.max(v, 3)) * 140');
    expect(THREES_APP_SRC).not.toContain('spawns.reduce');
    expect(THREES_APP_SRC).not.toContain('if (!this.deck?.length) return { 1: 1/3');
    expect(THREES_APP_SRC).not.toContain('[6, 12, 24].filter');
    // 宿主保留（弹层簿记/SDK 通道）
    expect(THREES_APP_SRC).toContain('const toggleModal = (sel, show)');
    expect(THREES_APP_SRC).toContain('window.__system.fs.write(TH_HISTORY_PATH');
    const t = MATRIX_JSON.apps.find((x) => x.id === 'threes');
    expect(t.tier).toBe('core-full');
    expect(t.cores).toContain('threesCore');
  });
});

describe('v11.19 #286 续深提增值 V 组：game2048Core 增值 11 出口（卡 id/万能牌/合并数值/炸弹清除/布局/AI 手牌域/工具/高亮）', () => {
  it('V1 增值键集在位（11 键补齐第七批十出口）+ cardId/wildcardCard 构造契约 + 高亮正则真源', () => {
    for (const k of ['cardId', 'wildcardCard', 'mergeVal', 'bombPopCount', 'layoutMetrics', 'canPlay', 'aiPlayable', 'dragTilt', 'toolDisabled', 'TIP_HIGHLIGHT_RE', 'isTipHighlight']) {
      expect(g8x[k], `__game2048Core.${k} 增值出口在位`).toBeTruthy();
    }
    expect(g8x.cardId(0.123456789)).toBe('c-4fzzzxj');
    expect(g8x.wildcardCard('c-x')).toEqual({ id: 'c-x', val: '★', isWildcard: true });
    expect(g8x.TIP_HIGHLIGHT_RE.test('炸弹清除第 1 列末张牌')).toBe(true);
    expect(g8x.isTipHighlight('连击 ×2 +8')).toBe(true);
    expect(g8x.isTipHighlight('已撤销上一步')).toBe(false);
  });

  it('V2 mergeVal 合并数值（双万能 64/单万能对侧翻倍/同值翻倍）+ bombPopCount 弹 2 不足按现存', () => {
    expect(g8x.mergeVal({ isWildcard: true, val: 0 }, { isWildcard: true, val: 0 })).toBe(64);
    expect(g8x.mergeVal({ isWildcard: true, val: 4 }, { val: 8 })).toBe(16);
    expect(g8x.mergeVal({ val: 8 }, { isWildcard: true, val: 4 })).toBe(16);
    expect(g8x.mergeVal({ val: 16 }, { val: 16 })).toBe(32);
    expect(g8x.bombPopCount(0)).toBe(0);
    expect(g8x.bombPopCount(1)).toBe(1);
    expect(g8x.bombPopCount(2)).toBe(2);
    expect(g8x.bombPopCount(8)).toBe(2);
  });

  it('V3 layoutMetrics 布局数学三档（钳宽 32-60/卡高 1.32/叠距 min(0.46h, max(12, 均分)) n≤1 归零）+ dragTilt ±12°', () => {
    expect(g8x.layoutMetrics(56, 360, 1)).toEqual({ cardW: 48, cardH: 63, step: 0 });
    expect(g8x.layoutMetrics(56, 360, 3)).toEqual({ cardW: 48, cardH: 63, step: 28.98 });
    expect(g8x.layoutMetrics(100, 500, 5)).toEqual({ cardW: 60, cardH: 79, step: 36.34 });
    expect(g8x.dragTilt(30)).toBe(3);
    expect(g8x.dragTilt(200)).toBe(12);
    expect(g8x.dragTilt(-200)).toBe(-12);
  });

  it('V4 canPlay/aiPlayable 模式判定 + toolDisabled undo 双条件', () => {
    expect(g8x.canPlay('normal', 2)).toBe(true);
    expect(g8x.canPlay('hard', 0)).toBe(true);
    expect(g8x.canPlay('hard', 1)).toBe(false);
    expect(g8x.aiPlayable('normal')).toEqual([0, 1, 2]);
    expect(g8x.aiPlayable('hard')).toEqual([0]);
    expect(g8x.toolDisabled('undo', { undo: 2 }, 0)).toBe(true);
    expect(g8x.toolDisabled('undo', { undo: 2 }, 5)).toBe(false);
    expect(g8x.toolDisabled('wildcard', { wildcard: 0 }, 5)).toBe(true);
  });

  it('V5 真身直连阴性锚（增值委托十三处桥消费）与内联退役七重', () => {
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.cardId(Math.random())');
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.canPlay(gameMode, hIdx)');
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.bombPopCount(col.length)');
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.mergeVal(t, n)');
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.capHistory(historyStack, 10)');
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.layoutMetrics(colW, colH, 1)');
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.layoutMetrics(colW, colH, n).step');
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.canPlay(gameMode, i)');
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.toolDisabled(t, tools, historyStack.length)');
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.isTipHighlight(msg)');
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.dragTilt(dx)');
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.wildcardCard(window.__game2048Core.cardId(Math.random()))');
    expect(G2048_ADD_APP_SRC).toContain('window.__game2048Core.aiPlayable(gameMode)');
    // 内联真身退役（增值段对应面）
    expect(G2048_ADD_APP_SRC).not.toContain("const VALS = [2,2,2,4,4,4,8,8,16,32,64]");
    expect(G2048_ADD_APP_SRC).not.toContain("Math.random().toString(36)");
    expect(G2048_ADD_APP_SRC).not.toContain('let val = (t.isWildcard && n.isWildcard)');
    expect(G2048_ADD_APP_SRC).not.toContain('const cardW = Math.max(32, Math.min(colW - 8, 60))');
    expect(G2048_ADD_APP_SRC).not.toContain('Math.min(cardH * 0.46');
    expect(G2048_ADD_APP_SRC).not.toContain('/AI|翻倍|连击|炸弹|万能|救场|消除/');
    expect(G2048_ADD_APP_SRC).not.toContain('historyStack.length > 10');
  });
});

// ==================== 第十批（R146 窗 · v11.19）：calendarCore ====================
const CAL_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/calendar/core.js'), 'utf-8');
const CAL_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/calendar/index.html'), 'utf-8');

const calCtx = { window: {} };
new Function('window', CAL_CORE_SRC)(calCtx.window);
const calc = calCtx.window.__calendarCore;

describe('v11.19 #286 续第十批 calendarCore：日期键/42 格月网格/裁剪/双库清洗/迁移纯函数', () => {
  it('W1 出口结构立契（十二键全集）+ dateKey/parseKey 往返与非法回落', () => {
    expect(Object.keys(calc).sort()).toEqual([
      'cleanEventsDB', 'cleanNotesDB', 'dateKey', 'isToday', 'migrateLegacyNotes', 'monthGrid',
      'notePreview', 'noteTitle', 'pad2', 'parseKey', 'sameDay', 'sortEvents',
    ]);
    expect(calc.dateKey(new Date(2026, 10, 9))).toBe('2026-11-09');
    const d = calc.parseKey('2026-11-09');
    expect(d.getFullYear()).toBe(2026); expect(d.getMonth()).toBe(10); expect(d.getDate()).toBe(9);
    expect(calc.parseKey('2026-11-9')).toBe(null); // 段宽不符（非两位）
    expect(calc.parseKey('junk')).toBe(null);
    expect(calc.pad2(3)).toBe('03'); expect(calc.pad2(11)).toBe('11');
  });

  it('W2 sameDay/isToday（now 注入参数化，月日年三维）', () => {
    const a = new Date(2026, 10, 9);
    expect(calc.sameDay(a, new Date(2026, 10, 9, 23, 59))).toBe(true);
    expect(calc.sameDay(a, new Date(2026, 10, 10))).toBe(false);
    expect(calc.sameDay(a, new Date(2027, 10, 9))).toBe(false); // 跨年
    expect(calc.isToday(a, a)).toBe(true);
    expect(calc.isToday(a, new Date(2026, 10, 10))).toBe(false);
  });

  it('W3 monthGrid 42 格恒定（周一起始偏移/跨月补位逐格）——Nov 2026 首日周日补 6 格 + Feb 2024 闰月', () => {
    const g = calc.monthGrid(2026, 10); // 2026-11（vm 为 0 基）
    expect(g.dim).toBe(30); expect(g.first).toBe(6); expect(g.pDim).toBe(31);
    expect(g.cells.length).toBe(42);
    expect(g.cells[0]).toMatchObject({ d: 26, other: true });
    expect(g.cells[0].date.toISOString().slice(0, 10)).toBe('2026-10-26');
    expect(g.cells[6]).toMatchObject({ d: 1, other: false });
    expect(g.cells[35]).toMatchObject({ d: 30, other: false });
    expect(g.cells[36]).toMatchObject({ d: 1, other: true });
    expect(g.cells[41]).toMatchObject({ d: 6, other: true });
    expect(g.cells[41].date.toISOString().slice(0, 10)).toBe('2026-12-06');
    const f = calc.monthGrid(2024, 1); // 2024-02 闰月
    expect(f.dim).toBe(29); expect(f.first).toBe(3); expect(f.pDim).toBe(31);
    expect(f.cells[3]).toMatchObject({ d: 1, other: false });
    expect(f.cells[41]).toMatchObject({ d: 10, other: true });
    expect(f.cells[41].date.toISOString().slice(0, 10)).toBe('2024-03-10');
  });

  it('W4 sortEvents 时序核（time 字符串序/空值参与排序/非变异）', () => {
    const src = [{ time: '10:00' }, { time: '09:00' }, { time: '' }, { time: '09:30' }];
    const out = calc.sortEvents(src);
    expect(out.map(e => e.time)).toEqual(['', '09:00', '09:30', '10:00']);
    expect(src.map(e => e.time)).toEqual(['10:00', '09:00', '', '09:30']); // 原数组不动
  });

  it('W5 noteTitle/notePreview 裁剪核（标题行优先/40·80 封顶/空回落无标题）', () => {
    expect(calc.noteTitle({ content: '# 标题甲\n\n正文' })).toBe('标题甲');
    expect(calc.noteTitle({ content: '首行\n第二行' })).toBe('首行');
    expect(calc.noteTitle({ content: 'x'.repeat(50) })).toHaveLength(40);
    expect(calc.noteTitle(null)).toBe('无标题');
    expect(calc.noteTitle({ content: '' })).toBe('无标题');
    expect(calc.noteTitle({ content: '   \n  \n' })).toBe('无标题');
    expect(calc.notePreview({ content: '# 标\n\n多  空白   文本' })).toBe('标 多 空白 文本');
    expect(calc.notePreview({ content: 'y'.repeat(100) })).toHaveLength(80);
  });

  it('W6 cleanNotesDB/cleanEventsDB/migrateLegacyNotes 双库清洗与迁移核（语义逐字保真）', () => {
    const db = { '2026-11-09': [{ content: 'a' }, {}, { content: 1 }], bad: [1], ok2: 'x' };
    expect(calc.cleanNotesDB(db)).toEqual({ '2026-11-09': [{ content: 'a' }] });
    expect(calc.cleanNotesDB(null)).toBe(null);
    expect(calc.cleanNotesDB('x')).toBe(null);
    const ev = { '2026-11-09': [{ title: 't', time: '9:00' }, { title: '  ' }, {}, { title: 'u' }], bad: 1, empty: [] };
    expect(calc.cleanEventsDB(ev)).toEqual({ '2026-11-09': [{ title: 't', time: '9:00' }, { title: 'u' }] });
    expect(calc.cleanEventsDB(null)).toEqual({});
    const mig = calc.migrateLegacyNotes([{ key: '2026-11-09', content: '  hello ' }, { key: '2026-12-31', content: 'world' }], 1700000000000);
    expect(mig.count).toBe(2);
    expect(mig.db['2026-11-09']).toEqual([{ id: 'm20261109', content: '  hello ', created: 1700000000000, updated: 1700000000000 }]);
    expect(calc.migrateLegacyNotes([], 5)).toEqual({ db: {}, count: 0 });
  });

  it('W7 真身直连阴性锚（script src+委托十二行）与内联退役五重+a11y 宿主保留', () => {
    expect(CAL_APP_SRC).toContain('<script src="./core.js"></script>');
    expect(CAL_APP_SRC).toContain('const p2 = window.__calendarCore.pad2;');
    expect(CAL_APP_SRC).toContain('const dateKey = window.__calendarCore.dateKey;');
    expect(CAL_APP_SRC).toContain('const parseKey = window.__calendarCore.parseKey;');
    expect(CAL_APP_SRC).toContain('const same = window.__calendarCore.sameDay;');
    expect(CAL_APP_SRC).toContain('window.__calendarCore.isToday(d, new Date())');
    expect(CAL_APP_SRC).toContain('window.__calendarCore.cleanNotesDB(db)');
    expect(CAL_APP_SRC).toContain('window.__calendarCore.migrateLegacyNotes(entries, Date.now())');
    expect(CAL_APP_SRC).toContain('window.__calendarCore.cleanEventsDB(db)');
    expect(CAL_APP_SRC).toContain('window.__calendarCore.sortEvents(arr)');
    expect(CAL_APP_SRC).toContain('window.__calendarCore.noteTitle(n)');
    expect(CAL_APP_SRC).toContain('window.__calendarCore.notePreview(n)');
    expect(CAL_APP_SRC).toContain('window.__calendarCore.monthGrid(vy, vm)');
    // 内联真身退役（本体已上移核）
    expect(CAL_APP_SRC).not.toContain("const p2 = n => String(n).padStart(2, '0')");
    expect(CAL_APP_SRC).not.toContain('const parseKey = k => {');
    expect(CAL_APP_SRC).not.toContain('function noteTitle(n)');
    expect(CAL_APP_SRC).not.toContain('function notePreview(n)');
    expect(CAL_APP_SRC).not.toContain('function sortEvents(arr)');
    // a11y 宿主保留（#241 弹层簿记与 __mdEscape 转义真源零触碰）
    expect(CAL_APP_SRC).toContain('__mdDialogA11y.open');
    expect(CAL_APP_SRC).toContain('window.__mdEscape(s)');
  });

  it('W8 矩阵归属联动：cal_app tier 翻 core-full 且 cores 登记 calendarCore', () => {
    const app = MATRIX_JSON.apps.find((a) => a.id === 'cal_app');
    expect(app.tier).toBe('core-full');
    expect(app.cores).toContain('calendarCore');
  });
});
// ==================== 第十批（R146 窗 · v11.19 本侧新提）：contactsCore ====================
const CONTACTS_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/contacts/core.js'), 'utf-8');
const CONTACTS_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/contacts/index.html'), 'utf-8');

const contactsCtx = { window: {} };
new Function('window', CONTACTS_CORE_SRC)(contactsCtx.window);
const ctc = contactsCtx.window.__contactsCore;

describe('v11.19 #286 续第十批 contactsCore（合流改号 X，避让对侧增值 threes U/game2048 V 组与对侧第十批 calendar W 组）：头像码点单源/按压衰减数学核/过滤与密度纯函数', () => {
  it('X1 出口结构立契（八键全集）与常量值序', () => {
    expect(Object.keys(ctc).sort()).toEqual([
      'AVATAR_FG', 'DENSITY_RANGE', 'RIPPLE_CARD_R', 'SEED_CONTACT', 'cardRipple', 'densitySliderPct', 'filterContacts', 'hueOf',
    ]);
    expect(ctc.DENSITY_RANGE).toEqual({ min: 0.85, max: 1.3 });
    expect(ctc.AVATAR_FG).toBe('#21005D');
    expect(ctc.RIPPLE_CARD_R).toBe(16);
    expect(ctc.SEED_CONTACT).toEqual({ name: '设计指南', phone: '10086', email: 'md3@google.com', note: 'Material Design 3' });
  });

  it('X2 hueOf 码点和单源（Array.from 码点感知 + % 360）：种子名/双字 CJK/拉丁混排三点演算', () => {
    expect(ctc.hueOf('设计指南')).toBe(125);
    expect(ctc.hueOf('张三')).toBe(49);
    expect(ctc.hueOf('Ab')).toBe(163);
    // 单字符：码点即色相（<360 不取模），空串回落 0
    expect(ctc.hueOf('A')).toBe(65);
    expect(ctc.hueOf('')).toBe(0);
  });

  it('X3 filterContacts 双通道过滤（trim+小写归一/姓名与电话 includes/空串全量/null 防御）', () => {
    const list = [
      { name: '张三', phone: '13800138000' },
      { name: 'Ab', phone: '10086' },
    ];
    expect(ctc.filterContacts(list, '张')).toEqual([list[0]]);
    expect(ctc.filterContacts(list, '138')).toEqual([list[0]]);
    expect(ctc.filterContacts(list, '086')).toEqual([list[1]]);
    // 大小写与空白归一：' AB ' 命中 'Ab'
    expect(ctc.filterContacts(list, ' AB ')).toEqual([list[1]]);
    expect(ctc.filterContacts(list, '')).toEqual(list);
    expect(ctc.filterContacts(list, null)).toEqual(list);
    expect(ctc.filterContacts(list, '无')).toEqual([]);
    // 零变异：返回新数组，原表不受扰动
    expect(list).toHaveLength(2);
  });

  it('X4 cardRipple 衰减数学核（tile-bounce 同构轻量版）：自身压缩置顶/邻项 0.45 步进让位/d≥3 封底复位/dir 方向位', () => {
    // 自身 d=0：压缩 0.97 / 圆角 +8=24 / 置顶 z='1' / 位移 0
    expect(ctc.cardRipple(0, 1)).toEqual({ shift: 0, sc: 0.97, radius: 24, z: '1' });
    expect(ctc.cardRipple(0, -1)).toEqual({ shift: 0, sc: 0.97, radius: 24, z: '1' }); // dir 对自身无效
    // 邻项 d=1：f=0.55 → sc=0.989 / |shift|=1.1 / 圆角 16-4*0.55=13.8
    expect(ctc.cardRipple(1, 1)).toEqual({ shift: 1.1, sc: 0.989, radius: 13.8, z: '' });
    expect(ctc.cardRipple(1, -1).shift).toBe(-1.1);
    // d=2：f=1-0.9=0.0999…（浮点忠实）→ sc=0.998 / |shift|≈0.2 / 圆角≈15.6
    const d2 = ctc.cardRipple(2, 1);
    expect(d2.sc.toFixed(3)).toBe('0.998');
    expect(d2.shift.toFixed(1)).toBe('0.2');
    expect(d2.radius.toFixed(1)).toBe('15.6');
    // 封底：d≥3 时 f=max(0,1-d*0.45)=0 → 完全复位（sc=1/shift=0/圆角=基准 16）
    expect(ctc.cardRipple(3, 1)).toEqual({ shift: 0, sc: 1, radius: 16, z: '' });
    const d5 = ctc.cardRipple(5, -1);
    expect(d5.sc).toBe(1);
    expect(d5.radius).toBe(16);
    expect(d5.z).toBe('');
    expect(d5.shift).toBe(-0); // -0 符号位忠实（dir=-1 × f=0；markdownCore pressTransform 先例同律）
  });

  it('X5 真身直连阴性锚（script src+八消费点）与内联退役（剥离注释）+矩阵归属联动（第十批）：contacts tier 翻 core-full 且 cores 登记（全局终态由 H3 持）', () => {
    expect(CONTACTS_APP_SRC).toContain('<script src="./core.js">');
    expect(CONTACTS_APP_SRC).toContain('window.__contactsCore.hueOf(c.name)');
    expect(CONTACTS_APP_SRC).toContain('window.__contactsCore.filterContacts(contacts, filter)');
    expect(CONTACTS_APP_SRC).toContain('window.__contactsCore.cardRipple(Math.abs(i - oi), i < oi ? 1 : -1)');
    expect(CONTACTS_APP_SRC).toContain('window.__contactsCore.densitySliderPct(parseFloat(el.value))');
    expect(CONTACTS_APP_SRC).toContain('window.__contactsCore.DENSITY_RANGE.min');
    expect(CONTACTS_APP_SRC).toContain('window.__contactsCore.AVATAR_FG');
    expect(CONTACTS_APP_SRC).toContain('window.__contactsCore.SEED_CONTACT');
    // 内联真身退役（剥离注释后匹配——代码区零残留，语义=实现体上移非字面清场）
    const stripped = CONTACTS_APP_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(stripped).not.toContain('charCodeAt(0), 0) % 360'); // 码点和双实现退役
    expect(stripped).not.toContain('1 - d * 0.45'); // 衰减步进本体退役
    expect(stripped).not.toContain('const RIPPLE_CARD_R = 16'); // 内联常量声明退役
    expect(stripped).not.toContain('#21005D'); // 头像前景色字面退役（单源 AVATAR_FG）
    expect(stripped).not.toContain('1.3 - 0.85'); // 密度量程字面退役
    expect(stripped).not.toContain("name: '设计指南'"); // 种子模板本体退役
    // 弹层 a11y 宿主保留（#241 三件套在位，host 侧职责不入 core）
    expect(CONTACTS_APP_SRC).toContain('window.__mdDialogA11y');
    // 域外桥零误伤：core.js 零 THREE/CANNON/THREE 依赖（纯数学核）
    const coreStripped = CONTACTS_CORE_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(coreStripped).not.toMatch(/THREE|CANNON/);
    const ct = MATRIX_JSON.apps.find((x) => x.id === 'contacts');
    expect(ct.tier).toBe('core-full');
    expect(ct.cores).toContain('contactsCore');
  });
});

// ==================== 第十一批（R147 窗 · v11.19 · Job 2932311 第 1 定时消息系列）：flow11Core ====================
// 备料车道：R146 窗加餐备料帖 6743260765 函数族盘点（A 连线/B 计分/C 生成权重三族整提 11 出口；D 几何 DOM 桥接留 host 硬提即硬造）
const FLOW11_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/flow11/core.js'), 'utf-8');
const FLOW11_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/flow11/index.html'), 'utf-8');

const flow11Ctx = { window: {} };
new Function('window', FLOW11_CORE_SRC)(flow11Ctx.window);
const f11 = flow11Ctx.window.__flow11Core;

// rng 序列注入器（确定性演算用）
const seqRng = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

// ==================== 第十二批（R147 窗 · v11.19 · Job 2931605 第 3 定时消息系列）：recorderCore（native 薄面自有轻量核） ====================
const RECORDER_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/recorder-core.js'), 'utf-8');
const RECORDER_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps/recorder.js'), 'utf-8');
const rCtx = { window: {} };
new Function('window', RECORDER_CORE_SRC)(rCtx.window);
const rcore = rCtx.window.__recorderCore;

describe('v11.19 #286 续第十一批 flow11Core：连线判定/计分数学/生成权重三族纯函数（D 族几何 DOM 桥接留 host）', () => {
  it('Y1 出口结构立契（11 键全集）与常量值序', () => {
    expect(Object.keys(f11).sort()).toEqual([
      'EXPANSION_DROP_P', 'GEM_WEIGHTS', 'SPECIAL_GEMS', 'bombCells', 'canConnectGems',
      'isAdjacent', 'laserCells', 'mergeGain', 'mergeTargetLevel', 'pathBaseLevel', 'rollGemLevel',
    ]);
    expect(f11.GEM_WEIGHTS).toEqual([
      { lvl: 1, w: 45 }, { lvl: 2, w: 30 }, { lvl: 3, w: 18 }, { lvl: 4, w: 7 },
    ]);
    expect(f11.SPECIAL_GEMS).toEqual(['W', 'B', 'L', '2X']);
    expect(f11.EXPANSION_DROP_P).toBe(0.06);
  });

  it('Y2 rollGemLevel 生成权重核（rng 注入参数化）：expansion 特殊下落/经典累积切分四点/越界回落', () => {
    // expansion：r<0.06 走特殊，种类由第二次掷选（0.9*4=3.6→idx 3='2X'；0.0→idx 0='W'）
    expect(f11.rollGemLevel(seqRng([0.05, 0.9]), 'expansion')).toBe('2X');
    expect(f11.rollGemLevel(seqRng([0.05, 0.0]), 'expansion')).toBe('W');
    // expansion：r=0.07 ≥0.06 不走特殊 → 权重切分（0.07*100=7 <45 → 1）
    expect(f11.rollGemLevel(seqRng([0.07]), 'expansion')).toBe(1);
    // 经典模式四点：rand<45→1 / [45,75)→2 / [75,93)→3 / [93,100)→4
    expect(f11.rollGemLevel(seqRng([0.05]), 'classic')).toBe(1);
    expect(f11.rollGemLevel(seqRng([0.5]), 'classic')).toBe(2);
    expect(f11.rollGemLevel(seqRng([0.8]), 'classic')).toBe(3);
    expect(f11.rollGemLevel(seqRng([0.95]), 'classic')).toBe(4);
  });

  it('Y3 A 族连线判定：isAdjacent 9 邻域含斜向自身排除 / pathBaseLevel 首数值锚 / canConnectGems 特殊通配三态', () => {
    expect(f11.isAdjacent(0, 0, 0, 1)).toBe(true);
    expect(f11.isAdjacent(0, 0, 1, 1)).toBe(true);  // 斜向
    expect(f11.isAdjacent(0, 0, 0, 2)).toBe(false); // 距离 2
    expect(f11.isAdjacent(0, 0, 0, 0)).toBe(false); // 自身排除
    expect(f11.isAdjacent(0, 0, 2, 0)).toBe(false);
    // pathBaseLevel：首个数值节点锚；全特殊回落 null；空路径 null
    expect(f11.pathBaseLevel([{ val: 'W' }, { val: 3 }, { val: 5 }])).toBe(3);
    expect(f11.pathBaseLevel([{ val: 'W' }, { val: 'B' }])).toBe(null);
    expect(f11.pathBaseLevel([])).toBe(null);
    // canConnectGems：B 侧特殊恒通 / 数值同值 / 数值异值拒绝
    expect(f11.canConnectGems(2, 2, [{ val: 2 }, { val: 2 }])).toBe(true);
    expect(f11.canConnectGems(2, 3, [{ val: 2 }, { val: 3 }])).toBe(false);
    expect(f11.canConnectGems(2, 'W', [{ val: 2 }])).toBe(true);
    expect(f11.canConnectGems(2, 'B', [{ val: 2 }])).toBe(true);
    // A 侧特殊：路径有数值锚时同值可连异值拒绝；锚 null（全特殊路径）恒可连
    expect(f11.canConnectGems('W', 3, [{ val: 'W' }, { val: 3 }])).toBe(true);
    expect(f11.canConnectGems('W', 4, [{ val: 'W' }, { val: 3 }])).toBe(false);
    expect(f11.canConnectGems('W', 3, [{ val: 'W' }, { val: 'B' }])).toBe(true);
    expect(f11.canConnectGems('2X', 3, [{ val: '2X' }, { val: 3 }])).toBe(true);
  });

  it('Y4 B 族计分数学：mergeGain 幂表×10×链长因子/mergeTargetLevel 11 封顶/bombCells 边界裁剪/laserCells 行列清单', () => {
    // mergeGain：2^baseLvl × count × 10 × multFactor（multFactor = 2X 翻倍 × 链长因子 count-1，短链回落 1）
    expect(f11.mergeGain(2, 1, false)).toBe(40);
    expect(f11.mergeGain(3, 2, false)).toBe(240);
    expect(f11.mergeGain(3, 2, true)).toBe(480);
    expect(f11.mergeGain(2, 1, true)).toBe(80);   // count≤2 链长因子回落 1，仅 2X 翻倍
    expect(f11.mergeGain(5, 3, true)).toBe(3200); // 8×5×10×(2×4)
    // mergeTargetLevel：+1/+2，11 封顶（board 写入/奇点判定/显示共用语义）
    expect(f11.mergeTargetLevel(1, false)).toBe(2);
    expect(f11.mergeTargetLevel(2, true)).toBe(4);
    expect(f11.mergeTargetLevel(10, false)).toBe(11);
    expect(f11.mergeTargetLevel(10, true)).toBe(11);
    expect(f11.mergeTargetLevel(9, true)).toBe(11);
    // bombCells：角落 4 格（边界裁剪）/中心 9 格/角序自上而下
    expect(f11.bombCells(0, 0, 11)).toEqual([{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }]);
    expect(f11.bombCells(5, 5, 11)).toHaveLength(9);
    expect(f11.bombCells(10, 10, 11)).toHaveLength(4);
    // laserCells：整行整列 11+11-1 重复中心 = 21 格；行格序在前、中心在列
    const l = f11.laserCells(3, 5, 11);
    expect(l).toHaveLength(21);
    expect(l[0]).toEqual({ r: 3, c: 0 });
    expect(l.some((p) => p.r === 3 && p.c === 5)).toBe(true);
    expect(l.filter((p) => p.r === 3)).toHaveLength(11);
    expect(l.filter((p) => p.c === 5)).toHaveLength(11);
  });

  it('Y5 真身直连阴性锚（script src+13 消费点）与内联退役（剥离注释）+矩阵归属联动（第十一批）：flow11 tier 翻 core-full 且 cores 登记（全局终态由 H3 持）', () => {
    expect(FLOW11_APP_SRC).toContain('<script src="./core.js">');
    expect(FLOW11_APP_SRC).toContain('window.__flow11Core.SPECIAL_GEMS');
    expect(FLOW11_APP_SRC).toContain('window.__flow11Core.rollGemLevel(Math.random, currentMode)');
    expect(FLOW11_APP_SRC).toContain('window.__flow11Core.pathBaseLevel(currentPath)');
    expect(FLOW11_APP_SRC).toContain('window.__flow11Core.isAdjacent(lastNode.r, lastNode.c, r, c)');
    expect(FLOW11_APP_SRC).toContain('window.__flow11Core.canConnectGems(lastNode.val, val, currentPath)');
    expect(FLOW11_APP_SRC).toContain('window.__flow11Core.mergeTargetLevel(baseLvl, hasMult)');
    expect(FLOW11_APP_SRC).toContain('window.__flow11Core.mergeGain(currentPath.length, baseLvl, hasMult)');
    expect(FLOW11_APP_SRC).toContain('window.__flow11Core.mergeGain(count, baseLvl, hasMult)');
    expect(FLOW11_APP_SRC).toContain('window.__flow11Core.bombCells(mergeTarget.r, mergeTarget.c, GRID_SIZE)');
    expect(FLOW11_APP_SRC).toContain('window.__flow11Core.laserCells(mergeTarget.r, mergeTarget.c, GRID_SIZE)');
    // 内联真身退役（剥离注释后匹配——代码区零残留，语义=实现体上移非字面清场）
    const stripped = FLOW11_APP_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(stripped).not.toContain('function isAdjacent');
    expect(stripped).not.toContain('function canConnectGems');
    expect(stripped).not.toContain('function getPathBaseLevel');
    expect(stripped).not.toContain('w: 45'); // 权重表本体退役
    expect(stripped).not.toContain('Math.pow(2, baseLvl)'); // 计分公式本体退役
    expect(stripped).not.toContain('multFactor'); // 倍率因子本体退役
    expect(stripped).not.toContain('for (let dr = -1'); // 炸弹 3×3 循环本体退役
    expect(stripped).not.toContain('board[mergeTarget.r][i] = 0'); // 激光双写循环本体退役
    // D 族 DOM 桥接留 host（getCellCenter/getCellFromPoint 实质 querySelector/elementFromPoint，硬提即硬造）
    expect(stripped).toContain('function getCellCenter');
    expect(stripped).toContain('function getCellFromPoint');
    expect(stripped).toContain('document.elementFromPoint');
    // 域外桥零误伤：core.js 零 DOM/THREE 依赖（纯数学核）
    const coreStripped = FLOW11_CORE_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(coreStripped).not.toMatch(/document\.|querySelector|THREE|CANNON/);
    const ct = MATRIX_JSON.apps.find((x) => x.id === 'flow11');
    expect(ct.tier).toBe('core-full');
    expect(ct.cores).toContain('flow11Core');
  });
});

// ==================== 第十二批（R147 窗 · v11.19 · Job 2931605 第 3 定时消息系列）：recorderCore（native 薄面自有轻量核·双站合流终态重放） ====================
describe('v11.19 #286 续第十二批 recorderCore：薄面五出口与契约对照（跨域委托否决·自有轻量核裁决）', () => {
  it('Z1 出口结构立契（五键全集）+ filesCore 契约对照（fmtBytes 三档封顶 MB vs filesCore 四档含 GB）', () => {
    expect(Object.keys(rcore).sort()).toEqual(['baseName', 'extOf', 'fmtBytes', 'fmtDate', 'fmtSec']);
    // 契约对照（跨域委托否决依据）：同输入不同输出——recorder 三档量级语义，filesCore 四档含 GB
    expect(rcore.fmtBytes(1073741824)).toBe('1024.00 MB');
    expect(fcore.fmtBytes(1073741824)).toBe('1.00 GB');
  });

  it('Z2 fmtBytes 三档边界与非法输入（1023/1024/1048575/1048576；0/负/null/undefined 归 0 B）', () => {
    expect(rcore.fmtBytes(0)).toBe('0 B');
    expect(rcore.fmtBytes(-5)).toBe('0 B');
    expect(rcore.fmtBytes(null)).toBe('0 B');
    expect(rcore.fmtBytes(undefined)).toBe('0 B');
    expect(rcore.fmtBytes(1023)).toBe('1023 B');
    expect(rcore.fmtBytes(1024)).toBe('1.0 KB');
    expect(rcore.fmtBytes(1048575)).toBe('1024.0 KB');
    expect(rcore.fmtBytes(1048576)).toBe('1.00 MB');
  });

  it('Z3 fmtSec 秒表核（补零/进位/小数截断/负值归零/缺省归零）：0/59/60/3599/3600/5.9/-5/undefined/null', () => {
    expect(rcore.fmtSec(0)).toBe('00:00');
    expect(rcore.fmtSec(59)).toBe('00:59');
    expect(rcore.fmtSec(60)).toBe('01:00');
    expect(rcore.fmtSec(3599)).toBe('59:59');
    expect(rcore.fmtSec(3600)).toBe('60:00');
    expect(rcore.fmtSec(5.9)).toBe('00:05');
    expect(rcore.fmtSec(-5)).toBe('00:00');
    expect(rcore.fmtSec(undefined)).toBe('00:00');
    expect(rcore.fmtSec(null)).toBe('00:00');
  });

  it('Z4 fmtDate now 注入参数化（本地构造+本地格式化确定性往返）+ baseName/extOf 路径核与 filesCore extOf 契约对照（带点保大小写 vs 无点小写）', () => {
    const t = new Date(2024, 0, 15, 9, 5).getTime();
    expect(rcore.fmtDate(t)).toBe('1/15 09:05');
    expect(rcore.fmtDate(undefined, t)).toBe('1/15 09:05'); // now 注入通道与 ts 主通道等值（host 调用点 fmtDate(ts) 不变）
    expect(rcore.fmtDate(new Date(2024, 11, 31, 23, 59).getTime())).toBe('12/31 23:59');
    expect(/^\d{1,2}\/\d{1,2} \d{2}:\d{2}$/.test(rcore.fmtDate(t))).toBe(true);
    // baseName 路径核（根收空/无斜杠原样/CJK 原样）
    expect(rcore.baseName('/a/b.txt')).toBe('b.txt');
    expect(rcore.baseName('/')).toBe('');
    expect(rcore.baseName('a')).toBe('a');
    expect(rcore.baseName('/recordings/录音 一.m4a')).toBe('录音 一.m4a');
    // extOf 带点保大小写契约 + 对照 filesCore 无点小写（两域消费面语义不同，跨域委托否决实证）
    expect(rcore.extOf('song.mp3')).toBe('.mp3');
    expect(rcore.extOf('IMG_0001.JPG')).toBe('.JPG');
    expect(rcore.extOf('.bashrc')).toBe('');
    expect(rcore.extOf('noext')).toBe('');
    expect(rcore.extOf('a.tar.gz')).toBe('.gz');
    expect(fcore.extOf('IMG_0001.JPG')).toBe('jpg');
  });

  it('Z5 真身直连阴性锚（副作用导入+桥消费五委托行）与内联退役（剥离注释）+esc/elapsedMs 宿主保留+矩阵归属联动（全局终态由 H3 持）', () => {
    expect(RECORDER_APP_SRC).toContain("import '../recorder-core.js'");
    expect(RECORDER_APP_SRC).toContain('window.__recorderCore || {}');
    expect(RECORDER_APP_SRC).toContain('var fmtBytes = __rc.fmtBytes');
    expect(RECORDER_APP_SRC).toContain('__rc.fmtSec');
    expect(RECORDER_APP_SRC).toContain('__rc.fmtDate');
    expect(RECORDER_APP_SRC).toContain('__rc.baseName');
    expect(RECORDER_APP_SRC).toContain('__rc.extOf');
    // 内联真身退役（剥离注释后匹配——代码区零残留，语义=实现体上移非字面清场）
    const stripped = RECORDER_APP_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(stripped).not.toContain('function fmtBytes');
    expect(stripped).not.toContain('function fmtSec');
    expect(stripped).not.toContain('function fmtDate');
    expect(stripped).not.toContain('function baseName');
    expect(stripped).not.toContain('function extOf');
    expect(stripped).not.toContain('b < 1048576'); // 三档判界本体退役
    // 宿主保留面：esc 委托（#240 单源）与运行态 elapsedMs 不入核（吃 recElapsedBase/recRunStart）
    expect(RECORDER_APP_SRC).toContain('window.__mdEscape');
    expect(RECORDER_APP_SRC).toContain('function elapsedMs()');
    // 域外桥零误伤：recorder-core.js 零 DOM/IO 依赖（纯函数核；window 仅出口判型）
    const coreStripped = RECORDER_CORE_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(coreStripped).not.toMatch(/document|querySelector|AudioContext|MediaRecorder/);
    // 矩阵归属联动：recorder tier 翻 core-full 且 cores 登记 recorderCore
    const rt = MATRIX_JSON.apps.find((x) => x.id === 'recorder');
    expect(rt.tier).toBe('core-full');
    expect(rt.cores).toContain('recorderCore');
  });
});

// ==================== 第十三批（R148 窗 · v11.19 · Job 2933040 第 2 定时消息系列）：installerCore（native 薄面自有轻量核·ref-only 池收口卷） ====================
const INSTALLER_CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/installer-core.js'), 'utf-8');
const INSTALLER_APP_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps/installer.js'), 'utf-8');
const iCtx = { window: {} };
new Function('window', INSTALLER_CORE_SRC)(iCtx.window);
const icore = iCtx.window.__installerCore;

describe('v11.19 #286 续第十三批 installerCore：薄面五出口与契约对照（recorder 第十二批先例第 2 例·native 池收口）', () => {
  it('AA1 出口结构立契（五键全集）+ fmtSize 与 recorderCore fmtBytes 契约对照（null→空串 vs null→0 B 跨域委托否决依据）', () => {
    expect(Object.keys(icore).sort()).toEqual(['FALLBACK_ICON', 'emptyBlock', 'fmtSize', 'iconBox', 'permIconSVG']);
    // 契约对照（跨域委托否决依据）：同输入不同输出——installer 空串占位 vs recorder 归零占位
    expect(icore.fmtSize(null)).toBe('');
    expect(rcore.fmtBytes(null)).toBe('0 B');
    expect(icore.fmtSize(undefined)).toBe('');
    expect(rcore.fmtBytes(undefined)).toBe('0 B');
    // 负值钳制语义差异：fmtSize 原值直拼 vs fmtBytes 归零
    expect(icore.fmtSize(-5)).toBe('-5 B');
    expect(rcore.fmtBytes(-5)).toBe('0 B');
    // MB 档小数位差异：fmtSize toFixed(1) vs fmtBytes toFixed(2)
    expect(icore.fmtSize(1048576)).toBe('1.0 MB');
    expect(rcore.fmtBytes(1048576)).toBe('1.00 MB');
  });

  it('AA2 fmtSize 三档边界与占位（1023/1024/1048575/1048576 档界；0/小数；null/undefined 空串占位逐字保留）', () => {
    expect(icore.fmtSize(0)).toBe('0 B');
    expect(icore.fmtSize(1023)).toBe('1023 B');
    expect(icore.fmtSize(1024)).toBe('1.0 KB');
    expect(icore.fmtSize(1536)).toBe('1.5 KB');
    expect(icore.fmtSize(1048575)).toBe('1024.0 KB');
    expect(icore.fmtSize(1048576)).toBe('1.0 MB');
    expect(icore.fmtSize(2621440)).toBe('2.5 MB');
    expect(icore.fmtSize(3145728)).toBe('3.0 MB');
    expect(icore.fmtSize(null)).toBe('');
    expect(icore.fmtSize(undefined)).toBe('');
  });

  it('AA3 FALLBACK_ICON 常量契约 + iconBox 回退选择（空值三态回退/真 HTML 直通/结构逐段断言）', () => {
    const fb = icore.FALLBACK_ICON;
    expect(fb).toContain('<svg viewBox="0 0 100 100"');
    expect(fb).toContain('rx="24"');
    expect(fb).toContain('M30 40 L50 28 L70 40 L70 62 L50 74 L30 62 Z');
    expect(fb).toContain('opacity="0.92"');
    expect(fb.endsWith('</svg>')).toBe(true);
    // 回退选择：null/undefined/'' 三态均回退 FALLBACK_ICON（|| 短路语义逐字保留）
    expect(icore.iconBox(null)).toBe('<div class="pkg-ic">' + fb + '</div>');
    expect(icore.iconBox(undefined)).toBe('<div class="pkg-ic">' + fb + '</div>');
    expect(icore.iconBox('')).toBe('<div class="pkg-ic">' + fb + '</div>');
    // 真 HTML 直通
    expect(icore.iconBox('<svg id="x"/>')).toBe('<div class="pkg-ic"><svg id="x"/></div>');
  });

  it('AA4 permIconSVG 常量契约 + emptyBlock esc 注入参数化（sentinel 结构断言+真实转义等值+三段组装序）', () => {
    const shield = icore.permIconSVG();
    expect(shield).toContain('<svg viewBox="0 0 24 24" width="18" height="18"');
    expect(shield).toContain('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z');
    expect(shield.endsWith('</svg>')).toBe(true);
    // esc 注入参数化（calendarCore isToday now 注入同律）：sentinel escFn 标记注入位
    const mark = (s) => '«' + s + '»';
    const blk = icore.emptyBlock(mark, '<path d="M1 3h22v5H1z"/>', '标题甲', '副文乙');
    expect(blk).toContain('<div class="pkg-empty">');
    expect(blk).toContain('<svg viewBox="0 0 24 24" width="44" height="44"');
    expect(blk).toContain('<path d="M1 3h22v5H1z"/>');
    expect(blk).toContain('<div class="pkg-empty-t">«标题甲»</div>');
    expect(blk).toContain('<div class="pkg-empty-s">«副文乙»</div>');
    // 真实转义等值（宿主 esc 同款实现注入）：HTML 危险字符实体化
    const escLike = (s) => String(s == null ? '' : s)
      .split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');
    const escd = icore.emptyBlock(escLike, '', '<b>粗</b>', 'a&"z');
    expect(escd).toContain('<div class="pkg-empty-t">&lt;b&gt;粗&lt;/b&gt;</div>');
    expect(escd).toContain('<div class="pkg-empty-s">a&amp;&quot;z</div>');
    // null 输入走空串分支（esc 同款 null 归一）
    const escNull = icore.emptyBlock(escLike, '', null, undefined);
    expect(escNull).toContain('<div class="pkg-empty-t"></div>');
    expect(escNull).toContain('<div class="pkg-empty-s"></div>');
  });

  it('AA5 真身直连阴性锚（副作用导入+桥消费五委托+三空态调用点换算）与内联退役（剥离注释）+esc/snack 宿主保留+域外零 DOM/IO+矩阵归属联动（全局终态由 H3 持）', () => {
    expect(INSTALLER_APP_SRC).toContain("import '../installer-core.js'");
    expect(INSTALLER_APP_SRC).toContain('window.__installerCore || {}');
    expect(INSTALLER_APP_SRC).toContain('var fmtSize = __ic.fmtSize');
    expect(INSTALLER_APP_SRC).toContain('var FALLBACK_ICON = __ic.FALLBACK_ICON');
    expect(INSTALLER_APP_SRC).toContain('var iconBox = __ic.iconBox');
    expect(INSTALLER_APP_SRC).toContain('var permIconSVG = __ic.permIconSVG');
    // 三空态常量调用点等值换算（esc 注入参数化唯一签名变化）
    expect((INSTALLER_APP_SRC.match(/__ic\.emptyBlock\(esc,/g) || []).length).toBe(3);
    // 内联真身退役（剥离注释后匹配——代码区零残留，语义=实现体上移非字面清场）
    const stripped = INSTALLER_APP_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(stripped).not.toContain('function fmtSize');
    expect(stripped).not.toContain('function iconBox');
    expect(stripped).not.toContain('function permIconSVG');
    expect(stripped).not.toContain('function emptyBlock');
    expect(stripped).not.toContain('b < 1024'); // 三档判界本体退役
    expect(stripped).not.toContain('1048576'); // KB/MB 档界常量本体退役
    expect(stripped).not.toContain('M30 40 L50 28'); // FALLBACK_ICON svg 本体退役
    expect(stripped).not.toContain('M12 22s8-4'); // 权限盾形 svg 本体退役
    expect(stripped).not.toContain('pkg-empty-t'); // 空态块组装本体退役
    // 宿主保留面：esc（#240 __mdEscape 单源同款）/snack（DOM+定时器）/render（S 运行态）/IO 桥
    expect(INSTALLER_APP_SRC).toContain('function esc(s)');
    expect(INSTALLER_APP_SRC).toContain('function snack(msg, opts)');
    expect(INSTALLER_APP_SRC).toContain('function render()');
    expect(INSTALLER_APP_SRC).toContain('window.__pkgInstallerAPI');
    expect(INSTALLER_APP_SRC).toContain('function openSheet(key)');
    // 域外桥零误伤：installer-core.js 零 DOM/IO 依赖（纯函数核；window 仅出口判型）
    const coreStripped = INSTALLER_CORE_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(coreStripped).not.toMatch(/document|querySelector|AudioContext|localStorage|__pkgInstallerAPI/);
    // 矩阵归属联动：installer tier 翻 core-full 且 cores 登记 installerCore（native 池收口后 refOnly 8 由 H3 持）
    const it2 = MATRIX_JSON.apps.find((x) => x.id === 'installer');
    expect(it2.tier).toBe('core-full');
    expect(it2.cores).toContain('installerCore');
    // native 五家结构性暂缓维持 ref-only（零纯函数面如实账，不硬造核）
    for (const id of ['health', 'map', 'wallet', 'facetime', 'findmy']) {
      const app = MATRIX_JSON.apps.find((x) => x.id === id);
      expect(app.tier, id).toBe('ref-only');
      expect(app.cores.length, id).toBe(0);
    }
  });
});
