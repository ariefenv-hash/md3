// ==================== v751-fixes.test.js — issue #7「大工程」回归守护 ====================
// ①设置双栏分屏 ②多彩图标底板 ③主题跟随系统 ④默认动画设置首屏 ⑤右栏空态提示
// ⑥白噪音图标动画单次化 ⑦备忘录间距 ⑧iOS26 图标微动 ⑨文件管理器重制 ⑩拖拽让位合成
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

describe('v7.51 issue#7 — 备忘录间距（⑦）', () => {
  it('notes 容器为弹性纵列 + 12px 间隙', () => {
    const src = R('ios-desktop/apps/notes/index.html');
    expect(src).toContain('#memoList { display:flex; flex-direction:column; gap:12px; }');
  });
});

describe('v7.51 issue#7 — 白噪音图标动画单次化（⑥）', () => {
  it('wavePulse 不再 infinite，改为单次错峰脉冲', () => {
    const src = R('ios-desktop/apps/clock-app/index.html');
    // 锚定 animation 属性（避开注释文本干扰）
    expect(src).not.toMatch(/animation:\s*wavePulse[^}]*infinite/);
    expect(src).toMatch(/\.nav-item\.animate-click \.noise-wave-bar\{[^}]*animation:wavePulse \.5s ease-in-out 1 both\}/);
    expect(src).toContain('.nav-item.animate-click .noise-wave-bar:nth-of-type(2){animation-delay:.06s}');
  });
});

describe('v7.51 issue#7 — 拖拽让位合成（⑩）', () => {
  it('drag-reorder 让位位移写独立 translate 属性（与 jiggle 动画 transform 合成）', () => {
    const src = R('ios-desktop/js/drag-reorder.js');
    expect(src).toContain("child.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`");
    expect(src).toContain("child.style.translate = ''");
    // 清理路径必须同时清 translate
    expect(src).toMatch(/clearDynamicIconShifts[\s\S]{0,400}style\.translate = ''/);
  });
  it('app-icon/app-folder 挂 translate 过渡（2.html 同款减速曲线）', () => {
    const css = R('ios-desktop/css/desktop.css');
    const m = css.match(/\.app-icon \{[^}]+\}/);
    expect(m[0]).toContain('translate 0.32s cubic-bezier(0.32, 0.72, 0.35, 1)');
  });
});

describe('v7.51 issue#7 — iOS 26 图标微动（⑧）', () => {
  it('jiggle 关键帧升级为闭环线性微动（0%=100% 位姿全等）', () => {
    const css = R('ios-desktop/css/desktop.css');
    const kf = css.match(/@keyframes jiggle-1 \{[\s\S]*?\n\}/)[0];
    expect(kf).toContain('translate(1.4px, 0.9px) rotate(1.2deg)');
    expect(kf).toContain('translate(0, 0) rotate(0deg)');
    expect(css).toMatch(/animation: jiggle-1 0\.42s infinite linear/);
    expect(css).toMatch(/animation: jiggle-2 0\.44s infinite linear/);
  });
  it('保留 reduced-motion 降级', () => {
    const css = R('ios-desktop/css/desktop.css');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^@]*\.app-icon\.jiggling[\s\S]*?animation: none/);
  });
});

describe('v7.51 issue#7 — 设置双栏分屏（①②③④⑤）', () => {
  const tp = R('ios-desktop/js/apps/settings-two-pane.js');
  const settings = R('ios-desktop/js/apps/settings.js');
  const css = R('ios-desktop/css/settings-two-pane.css');

  it('① 双栏模块存在并挂载到 settings 页面模板', () => {
    expect(settings).toContain("from './settings-two-pane.js'");
    expect(settings).toContain('<div class="tp-root">');
    expect(settings).toContain('__settingsTwoPaneMount');
  });
  it('② 清单行为多彩固定底板（--plate 内联变量，不用 --md-h）', () => {
    expect(tp).toMatch(/style="--plate:\$\{item\.accent\}"/);
    expect(css).toMatch(/\.tp-plate \{[^}]*background: var\(--plate/);
    // 底板色刻意避开主题 hue 令牌
    expect(tp).not.toMatch(/--plate:\s*hsl\(var\(--md-h/);
  });
  it('② 清单覆盖既有全部 13 个导航目标（页栈索引齐全）', () => {
    for (const idx of [13, 9, 6, 1, 10, 4, 5, 7, 2, 11, 12, 8]) {
      expect(tp).toContain(`idx: ${idx},`);
    }
  });
  it('② 实时提示 span（电量/动画/后台/导航/模式）契约保留', () => {
    for (const id of ['profileModeHint', 'animPresetHint', 'settingsMainBatteryPct', 'bgModeHint', 'navModeHint']) {
      expect(tp).toContain(`hintId: '${id}'`);
    }
  });
  it('③ 主题仍走 --md-h 全局令牌（模块不覆盖 surface 色板）', () => {
    expect(css).toContain('var(--md-surface,');
    expect(css).toContain('hsl(var(--md-h, 215)');
    // 行组件色板走 md 令牌而非硬编码暗色
    expect(css).toContain('var(--md-on-surface,');
  });
  it('④ 默认首屏为「动画与动效」（页栈索引 10）', () => {
    expect(tp).toContain('const DEFAULT_PAGE = 10;');
    expect(tp).toContain('动画与动效');
  });
  it('⑤ 右栏空态引导文案', () => {
    expect(settings).toContain('请打开一个设置项以查看');
    expect(css).toContain('.tp-right.tp-has-page .tp-empty');
  });
  it('① 宽判定阈值 620px + 页栈根守卫（避免与推入动画互踩）', () => {
    expect(tp).toContain('const WIDE_THRESHOLD = 620;');
    expect(tp).toContain('state.navHistory.length <= 1');
  });
  it('① 页面「移动而非复制」：openPane 优先移动栈页，注入仅作回退', () => {
    expect(tp).toMatch(/getElementById\(`app-page-settings-\$\{pageIdx\}`\)/);
    expect(tp).toMatch(/tp-host-copy/);
  });
  it('CSS 已注册到桌面文档', () => {
    expect(R('ios-desktop/index.html')).toContain('css/settings-two-pane.css');
  });
});

describe('v7.51 issue#7 — 文件管理器重制（⑨）', () => {
  const files = R('ios-desktop/js/apps/files.js');
  const css = R('ios-desktop/css/files-app.css');

  it('① 三标签结构 + 平板侧栏', () => {
    expect(files).toContain('id="fjHome"');
    expect(files).toContain('id="fjClean"');
    expect(files).toContain('id="fjBrowse"');
    expect(files).toContain('class="fj-rail"');
    expect(css).toContain('.fj-app.fj-wide .fj-rail { display: flex; }');
  });
  it('⑨ 图标零字体依赖：内联描边 SVG + window.__fjIc 桥', () => {
    expect(files).toContain('window.__fjIc = ic');
    expect(files).toMatch(/var ic = function\(n, st\) \{ return window\.__fjIc\(n, st\); \}/);
    expect(files).not.toMatch(/ICONS\./); // 不再依赖 Material Symbols 连字
  });
  it('⑨ 砍掉全部演示性假数据与无用功能', () => {
    expect(files).not.toContain('安全文件夹');
    expect(files).not.toContain('垃圾');
    expect(files).not.toContain('重复文件');
    expect(files).not.toContain('隐私政策');
    expect(files).not.toContain('data-seed');
  });
  it('⑨ 保留真实能力：VFS/剪贴板/分享/PB 返回桥/音乐深链', () => {
    expect(files).toContain('window.__vfs');
    expect(files).toContain('window.__clipboard');
    expect(files).toContain("emit('files/share'");
    expect(files).toContain("emit('photo/captured'");
    expect(files).toContain('window.__filesPB');
    expect(files).toContain("event: 'music/import'");
  });
  it('⑨ 存储卡使用真实 usage 数据（无伪造总容量）', () => {
    expect(files).toMatch(/usageSafe\(\)/);
    expect(files).toContain('flex:\' + w + \' 1 0');
    expect(files).not.toContain('totalGB');
    expect(files).not.toContain('111 GB');
  });
  it('⑨ 清理页只含真实数据功能（大文件/图片统计）', () => {
    expect(files).toContain('大文件');
    expect(files).toContain('此操作不可撤销');
  });
  it('CSS 已注册到桌面文档', () => {
    expect(R('ios-desktop/index.html')).toContain('css/files-app.css');
  });
});

describe('v7.51 — 版本锚点', () => {
  it('sw.js 升级 geek-v70', () => {
    expect(R('sw.js')).toContain("const VERSION = 'geek-v70';");
  });
});
