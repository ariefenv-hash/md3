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
  it('② v7.98 重锚：清单重建为 AOSP homepageRevamp 权威形态（扁平裸列表 + 40dp colorPrimary 图标，无底板无 chevron）', () => {
    expect(tp).toContain("from '../icons-aosp.js'");
    expect(tp).toMatch(/tp-home-icon[^`]*color:var\(--md-primary/);
    // 源码考证：TopLevelSettings.onCreatePreferences homepageRevamp 分支跳过统一 tint，
    // vector 内建 fillColor=?android:attr/colorPrimary 生效 → 彩虹底板不被支持，v7.51 多彩底板移除；
    // homepage_preference_v2.xml 无 chevron 元素
    expect(tp).not.toMatch(/--plate/);
    expect(tp).not.toMatch(/tp-chev/);
  });
  it('② v7.98 重锚：AOSP 21 项一级清单（top_level_settings.xml 权威顺序）+ 既有页目标齐全', () => {
    for (const key of ['network', 'communal', 'connected', 'apps', 'notifications', 'modes', 'battery', 'storage', 'sound', 'display', 'wallpaper', 'accessibility', 'safety', 'security', 'privacy', 'location', 'emergency', 'accounts', 'system', 'about', 'support']) {
      expect(tp).toContain(`key: '${key}',`);
    }
    for (const idx of [1, 2, 4, 5, 6, 7, 13, 15]) {
      expect(tp).toContain(`idx: ${idx},`); // v8.12 重锚（#71）：行尾补 kw 搜索别名表，`idx: N ` 空格形态 → `idx: N,`
    }
    expect(tp).toContain('const STUB_IDX = 16'); // 未对齐子页统一过渡占位
  });
  it('② v7.98 重锚：一级行实时提示契约 —— 电池行保留 settingsMainBatteryPct；动画/后台/导航/模式随 AOSP 系统仪表盘 hub（页 15）收编', () => {
    expect(tp).toContain("hintId: 'settingsMainBatteryPct'");
    expect(tp).not.toMatch(/hintId: '(profileModeHint|animPresetHint|bgModeHint|navModeHint)'/);
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
  it('⑨ 砍掉全部演示性假数据与无用功能（v7.66 演进：重复文件/垃圾扫描为真实数据功能）', () => {
    expect(files).not.toContain('安全文件夹');
    // v7.51 时「垃圾清理/重复文件」仅存在于演示假数据中故整词禁入；v7.66 起
    // scanJunk 以真实 VFS 扫描实现同名同体积重复文件/空文件夹/久未访问检测，
    // 假数据标识（伪造种子/演示脚本/隐私政策占位）维持禁入
    expect(files).not.toContain('一键加速');
    expect(files).not.toContain('data-seed');
    expect(files).not.toContain('隐私政策');
    expect(files).not.toMatch(/demoSeed|fakeData|__demo/);
    // 真实性锚定：重复文件来自真实扫描（同名同体积分组），非伪造清单
    expect(files).toMatch(/function scanJunk\(\) \{/);
    expect(files).toMatch(/flatFiles\(\)\.filter\(function\(e\) \{ return e\.type === 'file'; \}\)/);
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
  it('sw.js 升级 geek-v100', () => {
    expect(R('sw.js')).toContain("const VERSION = 'geek-v100';");
  });
});
