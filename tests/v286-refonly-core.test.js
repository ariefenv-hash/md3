// ==================== v286-refonly-core.test.js — #286 续车道：ref-only 候补池首批补 core 提取（v10.90） ====================
//
// 覆盖（#286 处置建议②「零触达应用补 core 提取」的 files/settings 首批落地）：
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

// ---------- 合成工厂（确定性，零随机） ----------
const entry = (name, size, modified, mime, type) => ({ name, size, modified, mime, type: type || 'file' });

describe('v10.90 #286 续 filesCore：结构立契与路径工具', () => {
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

describe('v10.90 #286 续 settingsCore：语义映射与确定性', () => {
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

describe('v10.90 #286 续 真身直连与矩阵归属联动', () => {
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

describe('v10.90 #286 续第二批 photoCore：滤镜表与编辑器几何', () => {
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

  it('E6 矩阵归属联动（第二批）：photo tier 翻 core-full 且 cores 登记 photoCore（ref 25→24）', () => {
    const p = MATRIX_JSON.apps.find((a) => a.id === 'photo');
    expect(p.tier).toBe('core-full');
    expect(p.cores).toContain('photoCore');
    expect(MATRIX_JSON.stats.refOnly).toBe(24);
    expect(MATRIX_JSON.stats.coreFull).toBe(25);
    expect(MATRIX_JSON.stats.coresTotal).toBe(26);
    expect(MATRIX_JSON.stats.coresConsumed).toBe(MATRIX_JSON.stats.coresTotal);
    expect(MATRIX_JSON.stats.coreGap).toBe(0);
  });
});
