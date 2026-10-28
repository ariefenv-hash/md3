// ==================== v858-all-apps.test.js — #66 应用抽屉 allapps（Launcher3 对标） ====================
//
// 覆盖（#66 验收原文逐条）：
//   · 纯函数核：AOSP 原值常量（600ms/200ms/4 列）/ 拼音锚点桶（ASCII 直归 + CJK 锚点 +
//     '#' 兜底）/ A-Z 分节排序（'#' 恒最后 + 节内 pinyin collation）/ 搜索过滤 / 网格列数断点
//   · 场景 DOM：boot 后 __allApps 钩子 / 开合状态机 / 分节+条目渲染（45 应用）/ 搜索态
//     拍平与空态 / FastScroller 结构在册
//   · 接线：main.js 引入+初始化+纵向意图手势分支+classicCloser / QS 磁贴 all_apps /
//     icons.js apps_grid / index.html 样式链接 / FastScroller 复用（零新滚轮）

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bootDesktop } from './scenario-helpers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

let aa;
let initialApps;

beforeAll(async () => {
  // boot 先于模块 import（state.js←procedural-wallpaper 初始化链依赖完整引导序，
  // scenario-recents 同款纪律）
  const W = await bootDesktop();
  W.__lockTest.instantUnlock();
  aa = await import('../ios-desktop/js/all-apps.js');
  ({ initialApps } = await import('../ios-desktop/js/apps-data.js'));
});

// ==================== A. 纯函数核 ====================

describe('A. AOSP 原值常量（#54 取值纪律）', () => {
  test('config_allAppsOpenDuration = 600ms 原值（不压缩）', () => {
    expect(aa.ALL_APPS_OPEN_DURATION_MS).toBe(600);
  });
  test('REVERT_SWIPE_ALL_APPS_TO_HOME = 200ms 原值（AllAppsTransitionController:84）', () => {
    expect(aa.REVERT_SWIPE_MS).toBe(200);
  });
  test('手机网格 4 列（AOSP allapps）', () => {
    expect(aa.GRID_COLUMNS).toBe(4);
  });
  test('拼音锚点表覆盖 A-Z 去 I/U/V（拼音无此三字母音节）', () => {
    const letters = aa.PINYIN_ANCHORS.map(([L]) => L);
    expect(letters.length).toBe(23);
    for (const skip of ['I', 'U', 'V']) expect(letters.includes(skip)).toBe(false);
    expect(letters[0]).toBe('A');
    expect(letters[letters.length - 1]).toBe('Z');
  });
});

describe('B. bucketOf 混合脚本分桶（AlphabeticIndex 语义）', () => {
  test('ASCII 字母开头直接归该字母（与同字母汉字同节）', () => {
    expect(aa.bucketOf('ByteBeat')).toBe('B');
    expect(aa.bucketOf('FaceTime')).toBe('F');
    expect(aa.bucketOf('Flow 11')).toBe('F');
    expect(aa.bucketOf('PING')).toBe('P');
    expect(aa.bucketOf('Python')).toBe('P');
    expect(aa.bucketOf('MIDI 播放器')).toBe('M');
    expect(aa.bucketOf('OCR 文字识别')).toBe('O');
  });
  test('汉字按拼音锚点桶（45 应用实测矩阵抽样）', () => {
    expect(aa.bucketOf('安装包')).toBe('A');
    expect(aa.bucketOf('备忘录')).toBe('B');
    expect(aa.bucketOf('查找')).toBe('C');
    expect(aa.bucketOf('代码编辑器')).toBe('D');
    expect(aa.bucketOf('翻译')).toBe('F');
    expect(aa.bucketOf('股票')).toBe('G');
    expect(aa.bucketOf('健康')).toBe('J');
    expect(aa.bucketOf('快捷指令')).toBe('K');
    expect(aa.bucketOf('浏览器')).toBe('L');
    expect(aa.bucketOf('每日单词')).toBe('M');
    expect(aa.bucketOf('钱包')).toBe('Q');
    expect(aa.bucketOf('日历')).toBe('R');
    expect(aa.bucketOf('时钟')).toBe('S');
    expect(aa.bucketOf('天气')).toBe('T');
    expect(aa.bucketOf('相机')).toBe('X');
    expect(aa.bucketOf('邮件')).toBe('Y');
    expect(aa.bucketOf('终端')).toBe('Z');
  });
  test('数字/符号/空名 → #（恒排最后）', () => {
    expect(aa.bucketOf('2048 接龙')).toBe('#');
    expect(aa.bucketOf('')).toBe('#');
    expect(aa.bucketOf(null)).toBe('#');
  });
});

describe('C. sectionizeApps 分节与节内排序', () => {
  test('注册表全量 45 应用恰好分完（无丢失无重复）', () => {
    const secs = aa.sectionizeApps(initialApps);
    const total = secs.reduce((n, s) => n + s.apps.length, 0);
    expect(total).toBe(initialApps.length);
    const ids = secs.flatMap((s) => s.apps.map((a) => a.id));
    expect(new Set(ids).size).toBe(initialApps.length);
  });
  test('节字母 A→Z 升序，# 恒最后', () => {
    const letters = aa.sectionizeApps(initialApps).map((s) => s.letter);
    const hash = letters.filter((L) => L === '#');
    const alpha = letters.filter((L) => L !== '#');
    expect(hash.length).toBeLessThanOrEqual(1);
    expect(letters[letters.length - 1]).toBe('#');
    const sorted = [...alpha].sort();
    expect(alpha).toEqual(sorted);
  });
  test('节内按 zh pinyin collation 排序（T 节：通讯录 tōng < 图书 tú < 天气 tiān？——逐字节校验）', () => {
    const secs = aa.sectionizeApps(initialApps);
    const t = secs.find((s) => s.letter === 'T');
    expect(t).toBeTruthy();
    const names = t.apps.map((a) => a.name);
    const sorted = [...names].sort((a, b) => new Intl.Collator('zh-Hans-CN-u-co-pinyin').compare(a, b));
    expect(names).toEqual(sorted);
  });
  test('B 节合并 ASCII 与汉字（ByteBeat + 备忘录 同节）', () => {
    const b = aa.sectionizeApps(initialApps).find((s) => s.letter === 'B');
    const ids = b.apps.map((a) => a.id);
    expect(ids).toContain('bytebeat');
    expect(ids).toContain('notes');
  });
});

describe('D. filterApps 搜索过滤', () => {
  test('名称子串命中（大小写不敏感）', () => {
    const r = aa.filterApps(initialApps, '音乐');
    expect(r.map((a) => a.id)).toContain('music');
  });
  test('英文 query 命中名称与 id 双通道', () => {
    expect(aa.filterApps(initialApps, 'byte').map((a) => a.id)).toContain('bytebeat');
    expect(aa.filterApps(initialApps, 'msg').map((a) => a.id)).toContain('msg');
  });
  test('空串/null → null（不过滤语义）', () => {
    expect(aa.filterApps(initialApps, '')).toBeNull();
    expect(aa.filterApps(initialApps, '  ')).toBeNull();
    expect(aa.filterApps(initialApps, null)).toBeNull();
  });
  test('无命中 → 空数组（驱动空态）', () => {
    expect(aa.filterApps(initialApps, '不存在的应用xyz')).toEqual([]);
  });
});

describe('E. 网格列数断点（#73 平板分化数据层预留）', () => {
  test('手机 412 → 4 列；≥768 → 6 列', () => {
    expect(aa.gridColumnsFor(412)).toBe(4);
    expect(aa.gridColumnsFor(767)).toBe(4);
    expect(aa.gridColumnsFor(768)).toBe(6);
    expect(aa.gridColumnsFor(1280)).toBe(6);
  });
});

// ==================== F. 场景 DOM ====================

describe('F. 场景：应用抽屉开合与渲染', () => {
  test('F1. __allApps 钩子在册（open/close/isActive）', () => {
    expect(typeof window.__allApps.open).toBe('function');
    expect(typeof window.__allApps.close).toBe('function');
    expect(typeof window.__allApps.isActive).toBe('function');
  });

  test('F2. open() → overlay 激活 + a11y 语义', () => {
    expect(aa.isAllAppsActive()).toBe(false);
    expect(window.__allApps.open('test')).toBe(true);
    const overlay = document.getElementById('allAppsOverlay');
    expect(overlay).toBeTruthy();
    expect(overlay.classList.contains('active')).toBe(true);
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-label')).toBe('所有应用');
    expect(aa.isAllAppsActive()).toBe(true);
  });

  test('F3. 全量渲染：45 条目 + 分节数与纯函数一致 + FastScroller 结构在册', async () => {
    const items = document.querySelectorAll('.aa-item');
    expect(items.length).toBe(initialApps.length);
    const expectedSecs = aa.sectionizeApps(initialApps).length;
    expect(document.querySelectorAll('.aa-section').length).toBe(expectedSecs);
    expect(document.querySelector('#allAppsOverlay .md-fastscroller')).toBeTruthy();
    expect(document.querySelector('#allAppsOverlay .md-fs-thumb')).toBeTruthy();
    // 分节字母头 sticky 语义
    const head = document.querySelector('.aa-section');
    expect(head).toBeTruthy();
    expect(head.textContent.length).toBe(1);
  });

  test('F4. 重复 open() 幂等（返回 false 不重置状态）', () => {
    expect(window.__allApps.open('again')).toBe(false);
    expect(aa.isAllAppsActive()).toBe(true);
  });

  test('F5. 搜索过滤：拍平分节 + 即时生效 + 空态', () => {
    const input = document.getElementById('aaSearch');
    input.value = '音乐';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const items = document.querySelectorAll('.aa-item');
    expect(items.length).toBe(aa.filterApps(initialApps, '音乐').length);
    expect(document.querySelectorAll('.aa-section').length).toBe(0); // 搜索态无分节头

    input.value = '不存在的应用xyz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('.aa-empty')).toBeTruthy();
    expect(document.querySelectorAll('.aa-item').length).toBe(0);

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelectorAll('.aa-item').length).toBe(initialApps.length);
    expect(document.querySelectorAll('.aa-section').length).toBe(aa.sectionizeApps(initialApps).length);
  });

  test('F6. close() → 复位；再开可用（隐藏/显示循环）', () => {
    expect(window.__allApps.close()).toBe(true);
    expect(aa.isAllAppsActive()).toBe(false);
    const overlay = document.getElementById('allAppsOverlay');
    expect(overlay.classList.contains('active')).toBe(false);
    // 再开
    expect(window.__allApps.open('reopen')).toBe(true);
    expect(overlay.classList.contains('active')).toBe(true);
    window.__allApps.close();
    expect(aa.isAllAppsActive()).toBe(false);
  });

  test('F7. 守卫：应用窗口开时 open() 拒绝', async () => {
    const { state } = await import('../ios-desktop/js/state.js');
    const prev = state.isOpen;
    state.isOpen = true;
    expect(window.__allApps.open('guarded')).toBe(false);
    state.isOpen = prev;
    expect(window.__allApps.open('after-guard')).toBe(true);
    window.__allApps.close();
  });

  test('F8. 条目可启动（点按 → 应用窗口开 + 抽屉收）', async () => {
    window.__allApps.open('launch-test');
    const target = document.querySelector('.aa-item[data-app-id="calculator"]');
    expect(target).toBeTruthy();
    target.click();
    await new Promise((r) => setTimeout(r, 120));
    expect(aa.isAllAppsActive()).toBe(false);
    const { state } = await import('../ios-desktop/js/state.js');
    expect(state.isOpen).toBe(true);
    // 收尾：关闭应用窗口还原现场
    const { closeApp } = await import('../ios-desktop/js/app-window.js');
    closeApp();
    await new Promise((r) => setTimeout(r, 50));
  });
});

// ==================== G. 接线锚点 ====================

describe('G. 接线锚点（main.js / quick-settings.js / icons.js / index.html）', () => {
  test('G1. main.js：引入 + initAllApps + classicCloser 同步收抽屉', () => {
    const m = src('ios-desktop/js/main.js');
    expect(m).toContain("import { initAllApps, openAllApps, closeAllApps } from './all-apps.js';");
    expect(m).toContain('initAllApps();');
    expect(m).toContain('closeAllApps(); });');
  });

  test('G2. main.js：纵向意图手势分支（touch + mouse 双通道，与水平跟手互斥）', () => {
    const m = src('ios-desktop/js/main.js');
    expect(m).toContain('desktopDrawerIntent = true;');
    expect(m).toContain("openAllApps('gesture');");
    expect(m).toContain('mouseDrawerIntent = true;');
    expect(m).toContain("openAllApps('gesture-mouse');");
    // 底部 60px 让位多任务语义（起点上界判断在抽屉意图分支内）
    expect(m).toContain('desktopSwipeStartY <= window.innerHeight - 60');
  });

  test('G3. QS 磁贴：all_apps 在可用类目 + case 分发 + apps_grid 图标', () => {
    const qs = src('ios-desktop/js/quick-settings.js');
    expect(qs).toContain("{ id: 'all_apps', name: 'All apps', sub: '应用抽屉', iconKey: 'apps_grid' }");
    expect(qs).toContain("case 'all_apps':");
    expect(qs).toContain("window.__allApps.open('qs-tile')");
    expect(src('ios-desktop/js/icons.js')).toContain('apps_grid:');
  });

  test('G4. index.html：all-apps.css 已链接', () => {
    expect(src('ios-desktop/index.html')).toContain('css/all-apps.css');
  });

  test('G5. FastScroller 复用零新滚轮（aosp/fast-scroller.js 引入 + previewView 接气泡）', () => {
    const s = src('ios-desktop/js/all-apps.js');
    expect(s).toContain("import { FastScroller } from './aosp/fast-scroller.js';");
    expect(s).toContain('previewView: previewEl');
    expect(s).toContain('sections: sectionLetters');
  });

  test('G6. AOSP 原值注释纪律（600ms/200ms 溯源在册）', () => {
    const s = src('ios-desktop/js/all-apps.js');
    expect(s).toContain('config_allAppsOpenDuration = 600ms');
    expect(s).toContain('REVERT_SWIPE_ALL_APPS_TO_HOME_ANIMATION_DURATION_MS = 200ms');
  });
});
