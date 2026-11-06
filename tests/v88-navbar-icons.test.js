// ==================== v88-navbar-icons.test.js — #88 三键导航图标 AOSP 权威对齐（v10.27 · R96 窗） ====================
//
// 路线 A 裁决（铁律 #1 源码考证优先）：AOSP ic_sysbar_back/home/recent.xml 权威 pathData
// 逐字替换用户线稿（勾角返回/悬挑屋顶/三横线，viewBox 48 · stroke 5.2 退役）——
// 20dp / viewport 20 / fill ?attr/singleToneColor → currentColor 主题令牌映射；
// pos 三档 = 合法超越标注固化（#88 建议动作 3 · 铁律 #2：AOSP 由 config_navBarInteractionMode /
// overlay 决定，无用户可调三档）；back autoMirrored RTL 锚在录（md3 无 RTL 面不激活，诚实标注）；
// 音量键 #107 线稿维持（AOSP navbar 无音量键可对齐，#88 范围外）。
//
// 手法：AOSP 权威值以 docs/reference/frameworks-base/systemui/navbar-icons/ 入库源文件
// 逐字提取为真源（非手抄），与 nav-bar.js / settings.js 双文件比对（防漂移双锚）。
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => readFileSync(join(ROOT, p), 'utf-8');

const NB = R('ios-desktop/js/nav-bar.js');
const CSS = R('ios-desktop/css/nav-bar.css');
const ST = R('ios-desktop/js/apps/settings.js');

// ---------- AOSP 权威真源：从入库 XML 逐字提取（非手抄） ----------
const REF = 'docs/reference/frameworks-base/systemui/navbar-icons';
const xmlPathData = (file) => {
  const xml = R(`${REF}/${file}`);
  const m = xml.match(/android:pathData="([^"]+)"/);
  if (!m) throw new Error(`pathData not found in ${file}`);
  return m[1];
};

/** 从 nav-bar.js 三键段按 data-nvb 分组提取 path d 值 */
const navPath = (key) => {
  const seg = NB.split(`data-nvb="${key}"`)[1] || '';
  const m = seg.match(/ d="([^"]+)"/);
  if (!m) throw new Error(`nav path not found for ${key}`);
  return m[1];
};

/** 从 settings.js navIcon() 提取 path d 值 */
const settingsPath = (key) => {
  const m = ST.match(new RegExp(`${key}:\\s*'<path d="([^"]+)"/>'`));
  if (!m) throw new Error(`settings path not found for ${key}`);
  return m[1];
};

describe('v10.27 #88 — A. AOSP 权威 pathData 冻结（docs 真源 × 双文件零漂移）', () => {
  it('A1 back：nav-bar.js path 逐字 = ic_sysbar_back.xml pathData', () => {
    expect(navPath('back')).toBe(xmlPathData('ic_sysbar_back.xml'));
  });
  it('A2 home：nav-bar.js path 逐字 = ic_sysbar_home.xml pathData', () => {
    expect(navPath('home')).toBe(xmlPathData('ic_sysbar_home.xml'));
  });
  it('A3 recents：nav-bar.js path 逐字 = ic_sysbar_recent.xml pathData', () => {
    expect(navPath('recents')).toBe(xmlPathData('ic_sysbar_recent.xml'));
  });
  it('A4 settings.js navIcon 预览三键与 nav-bar.js 同源零漂移', () => {
    expect(settingsPath('back')).toBe(navPath('back'));
    expect(settingsPath('home')).toBe(navPath('home'));
    expect(settingsPath('recents')).toBe(navPath('recents'));
  });
});

describe('v10.27 #88 — B. 三键形态锚（viewport 20 · fill 语义 · 旧线稿退役）', () => {
  it('B1 三键 svg viewBox="0 0 20 20"（音量键保持 48 网格不在此锚域）', () => {
    expect((NB.match(/viewBox="0 0 20 20"/g) || []).length).toBe(3);
  });
  it('B2 CSS 三键 fill 语义：.nvb-icon path { fill: currentColor; stroke: none }', () => {
    expect(CSS).toMatch(/\.nvb-icon path\s*\{[^}]*fill:\s*currentColor[^}]*stroke:\s*none/s);
  });
  it('B3 原用户线稿三形态全库绝迹（nav-bar.js / settings.js / nav-bar.css）', () => {
    const retired = [
      'M14 7.5 7.8 13.5H36v23.5H7.8',            // 勾角返回线稿
      'points="6,18 24,7.5 42,18"',               // 悬挑屋顶 polyline
      'M8 12h32M8 24h32M8 36h32',                 // 三横线多任务
    ];
    for (const src of [NB, ST, CSS]) for (const token of retired) {
      expect(src.includes(token), token).toBe(false);
    }
  });
  it('B4 CSS polyline 选择器随屋顶退役（音量键仅 path，无 polyline 消费方）', () => {
    expect(CSS).not.toMatch(/\.nvb-icon[^{]*polyline/);
  });
  it('B5 三键 aria-label 保留（返回 / 主屏 / 多任务）', () => {
    expect(NB).toContain('data-nvb="back" aria-label="返回"');
    expect(NB).toContain('data-nvb="home" aria-label="主屏（长按可左右移动导航栏）"');
    expect(NB).toContain('data-nvb="recents" aria-label="多任务"');
  });
});

describe('v10.27 #88 — C. 音量键 #107 线稿维持（范围外诚实裁决）', () => {
  it('C1 .nvb-vol 音量键 stroke 语义在 CSS（fill: none + stroke currentColor + 5.2 round）', () => {
    const m = CSS.match(/\.nvb-vol \.nvb-icon path\s*\{([^}]*)\}/);
    expect(m, '.nvb-vol .nvb-icon path 规则在库').toBeTruthy();
    expect(m[1]).toMatch(/fill:\s*none/);
    expect(m[1]).toMatch(/stroke:\s*currentColor/);
    expect(m[1]).toMatch(/stroke-width:\s*5\.2/);
    expect(m[1]).toMatch(/stroke-linecap:\s*round/);
  });
  it('C2 音量键 SVG 维持 viewBox 48 网格（两处）', () => {
    const seg = NB.split('data-nvb="volume-down"')[1] || '';
    expect(seg.includes('viewBox="0 0 48 48"')).toBe(true);
  });
  it('C3 扬声器械形 path 维持（#107 原形不动）', () => {
    expect(NB).toContain('M8 19v10h7l9 7V12l-9 7H8z');
  });
});

describe('v10.27 #88 — D. 裁决与标注固化（注释即锚）', () => {
  it('D1 pos 三档合法超越标注：config_navBarInteractionMode + 无用户可调三档 + 合法超越', () => {
    expect(NB).toContain('config_navBarInteractionMode');
    expect(NB).toContain('无用户可调三档');
    expect(NB).toContain('合法超越标注');
  });
  it('D2 back autoMirrored RTL 镜像锚在录（md3 无 RTL 面不激活的诚实标注）', () => {
    expect(NB).toContain('autoMirrored');
    expect(NB).toMatch(/RTL 镜像锚/);
  });
  it('D3 路线 A 源锚：ic_sysbar 权威文件名 + docs 入库路径在录', () => {
    expect(NB).toContain('ic_sysbar_back/home/recent.xml');
    expect(NB).toContain('docs/reference/frameworks-base/systemui/navbar-icons/');
  });
  it('D4 音量键范围外标注（无权威可对齐）', () => {
    expect(NB).toMatch(/无权威可对齐/);
    expect(CSS).toMatch(/无权威可对齐/);
  });
});

describe('v10.27 #88 — E. AOSP 源文件入库体检（真源完整性）', () => {
  const FILES = ['ic_sysbar_back.xml', 'ic_sysbar_home.xml', 'ic_sysbar_recent.xml', 'ic_sysbar_home_quick_step.xml'];
  it('E1 四源文件在库且非空 + AOSP License 头', () => {
    for (const f of FILES) {
      const p = join(ROOT, REF, f);
      expect(existsSync(p), f).toBe(true);
      expect(statSync(p).size, `${f} 非空`).toBeGreaterThan(500);
      expect(R(`${REF}/${f}`), f).toContain('The Android Open Source Project');
    }
  });
  it('E2 三键 XML（back/home/recent）均 20dp / viewport 20；quick_step 为 28dp 胶囊（AOSP 手势条形态，非三键家族——差异实证在录）', () => {
    for (const f of ['ic_sysbar_back.xml', 'ic_sysbar_home.xml', 'ic_sysbar_recent.xml']) {
      const xml = R(`${REF}/${f}`);
      expect(xml, f).toContain('android:width="20dp"');
      expect(xml, f).toMatch(/android:viewportWidth="20"/);
      expect(xml, f).toMatch(/android:viewportHeight="20"/);
    }
    const qs = R(`${REF}/ic_sysbar_home_quick_step.xml`);
    expect(qs).toContain('android:width="28dp"');
  });
  it('E3 autoMirrored 仅 back 键持有（home/recent 无此属性）', () => {
    expect(R(`${REF}/ic_sysbar_back.xml`)).toContain('android:autoMirrored="true"');
    expect(R(`${REF}/ic_sysbar_home.xml`)).not.toContain('autoMirrored');
    expect(R(`${REF}/ic_sysbar_recent.xml`)).not.toContain('autoMirrored');
  });
  it('E4 三键 fillColor 同源 ?attr/singleToneColor（currentColor 映射的权威依据）', () => {
    for (const f of ['ic_sysbar_back.xml', 'ic_sysbar_home.xml', 'ic_sysbar_recent.xml']) {
      expect(R(`${REF}/${f}`), f).toContain('android:fillColor="?attr/singleToneColor"');
    }
  });
});

describe('v10.27 #88 — F. settings.js 预览面对齐', () => {
  it('F1 navIcon 预览 SVG 改 fill currentColor 且退役 stroke 线稿参数', () => {
    expect(ST).toMatch(/fill="currentColor"\>' \+ P\[key\]/);
    expect(ST).toContain("viewBox=\"0 0 20 20\" width=\"' + size");
    // 旧 stroke 包装（48 网格 5.2 round）在 navIcon 内绝迹
    const seg = ST.split('function navIcon')[1]?.split('var MODES')[0] || '';
    expect(seg).not.toContain('stroke-width');
    expect(seg).not.toContain('0 0 48 48');
  });
});
