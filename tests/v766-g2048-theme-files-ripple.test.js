// ==================== v7.66 测试 — 2048纸牌接龙主题自动穿透 + 文件应用 M3E 表达性涟漪 + 清理/浏览页丰富 ====================
// 用户三连反馈：
//   ① 2048纸牌接龙没有主题色的自动穿透 → --sol-* 从规范令牌派生（默认「跟随系统」
//      双轨制，4 预设调色盘保留为可选覆盖）+ 明暗模式穿透（data-theme-mode 暗调适配）
//   ② 文件应用仍是旧版波纹动画（手写 fj-ink span）而非 md3 表达性涟漪 →
//      .fj-rpl/.fj-gitem 接入 ripple-fx.js RIPPLE_SELECTOR，旧涟漪退役
//   ③ 文件应用只做了首页 → 清理页（重复文件/空文件夹/30天未动/可释放估算/累计释放）
//      与浏览页（集合网格/实时过滤/全库搜索）真实数据丰富

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const g2048 = readFileSync(join(root, 'ios-desktop/apps/game2048/index.html'), 'utf8');
const rippleFx = readFileSync(join(root, 'ios-desktop/js/ripple-fx.js'), 'utf8');
const filesJs = readFileSync(join(root, 'ios-desktop/js/apps/files.js'), 'utf8');
const filesCss = readFileSync(join(root, 'ios-desktop/css/files-app.css'), 'utf8');
const swJs = readFileSync(join(root, 'sw.js'), 'utf8');

describe('v7.66 ① game2048 主题色自动穿透', () => {
  it('强调三色组从规范令牌派生（--sol-* → var(--md-*)）', () => {
    expect(g2048).toMatch(/--sol-primary:\s*var\(--md-primary/);
    expect(g2048).toMatch(/--sol-secondary:\s*var\(--md-accent/);
    expect(g2048).toMatch(/--sol-tertiary:\s*var\(--md-tertiary/);
    // 色相通道与玻璃面/文本全部令牌驱动（无硬编码十六进制残留在 :root 强调位）
    expect(g2048).toMatch(/--sol-h:\s*var\(--md-h/);
    expect(g2048).toMatch(/--glass-bg:\s*color-mix\(in srgb,\s*hsl\(var\(--sol-h\)/);
    expect(g2048).toMatch(/--text-primary:\s*hsl\(var\(--sol-h\)/);
  });

  it('明暗模式穿透：data-theme-mode 暗调适配块覆盖玻璃面/文本/底色', () => {
    expect(g2048).toMatch(/\[data-theme-mode="dark"\]\{/);
    expect(g2048).toMatch(/\[data-theme-mode="dark"\] body\{background-color:hsl\(var\(--sol-h\)/);
    // 深色下主要白色表面均有覆盖（棋盘/列/手牌区/横幅/模态描述）
    expect(g2048).toMatch(/\[data-theme-mode="dark"\] \.board/);
    expect(g2048).toMatch(/\[data-theme-mode="dark"\] \.column\{background/);
    expect(g2048).toMatch(/\[data-theme-mode="dark"\] \.banner-tip/);
    expect(g2048).toMatch(/\[data-theme-mode="dark"\] \.modal-desc/);
  });

  it('AI 模式光晕/选中描边改为令牌驱动（去 #00e5ff 硬编码 UI 位）', () => {
    expect(g2048).toMatch(/\.game-wrapper\.ai-running\{border-color:var\(--sol-tertiary\)/);
    expect(g2048).toMatch(/\.hand-card-wrapper\.ai-selected \.card\{border-color:var\(--sol-tertiary\)/);
    expect(g2048).toMatch(/@keyframes pulse\{to\{box-shadow:0 0 18px color-mix\(in srgb,var\(--sol-tertiary\)/);
  });

  it('双轨制：applyFollowTheme 移除内联覆盖恢复穿透；预设覆盖保留', () => {
    expect(g2048).toMatch(/window\.applyFollowTheme = \(\) => \{/);
    expect(g2048).toMatch(/'--sol-primary','--sol-secondary','--sol-tertiary'\]\.forEach\(p => document\.documentElement\.style\.removeProperty\(p\)\)/);
    // 预设仍写内联接管
    expect(g2048).toMatch(/document\.documentElement\.style\.setProperty\('--sol-primary', t\.p\)/);
    // 初始化：预设覆盖或跟随系统（缺省 = 跟随）
    expect(g2048).toMatch(/if\(th && th\.type === 'preset'\) applyTheme\(th\.idx\); else applyFollowTheme\(\);/);
  });

  it('宿主广播应答：set-theme-hue 消息镜像明暗模式', () => {
    expect(g2048).toMatch(/d\.type !== 'set-theme-hue'/);
    expect(g2048).toMatch(/d\.mode === 'light' \|\| d\.mode === 'dark'\) document\.documentElement\.dataset\.themeMode = d\.mode/);
  });

  it('主题弹窗含「跟随系统主题」选项（默认高亮）+ 调试桥暴露 themeType', () => {
    expect(g2048).toMatch(/跟随系统主题/);
    expect(g2048).toMatch(/onclick="applyFollowTheme\(\)"/);
    expect(g2048).toMatch(/themeType: currentSolThemeType/);
  });

  it('命名空间纪律：不以自建定义遮蔽规范令牌名 --md-*（md3-tokens 锁定纪律）', () => {
    // game2048 只消费 --md-*，不得在 <style> 中定义（遮蔽）规范令牌。
    // 先剥离 /* */ 注释（注释里的「--md-h:215 缺省派生」等说明文字不是定义）
    const styleBlock = (g2048.split('<style>')[1] || '').split('</style>')[0].replace(/\/\*[\s\S]*?\*\//g, '');
    expect(styleBlock).not.toMatch(/--md-[a-z-]+\s*:\s*[^;]*;/);
  });
});

describe('v7.66 ② 文件应用 M3E 表达性涟漪', () => {
  it('ripple-fx RIPPLE_SELECTOR 纳入 .fj-rpl 与 .fj-gitem', () => {
    expect(rippleFx).toMatch(/'\.fj-rpl', '\.fj-gitem'/);
  });

  it('旧手写 fj-ink 涟漪处理器与样式退役', () => {
    expect(filesJs).not.toMatch(/className = 'fj-ink'/);
    expect(filesJs).not.toMatch(/ink\.style\.cssText/);
    expect(filesCss).not.toMatch(/\.fj-ink\s*\{/);
    expect(filesCss).not.toMatch(/@keyframes fjInk/);
    // .fj-rpl 保留 relative/overflow 语义（涟漪遮罩圆角读取 + 缩略图裁切）
    expect(filesCss).toMatch(/\.fj-rpl \{ position: relative; overflow: hidden; \}/);
  });
});

describe('v7.66 ③ 清理页丰富（真实扫描，无演示数据）', () => {
  it('垃圾扫描数据层：重复文件（同名同体积保最新）/空文件夹/30天未动', () => {
    expect(filesJs).toMatch(/function scanJunk\(\) \{/);
    expect(filesJs).toMatch(/dupRedundant/);
    expect(filesJs).toMatch(/function recEmpty\(dir\)/);
    expect(filesJs).toMatch(/Date\.now\(\) - 30 \* 86400000/);
  });

  it('累计释放统计持久化 + 清理删除按实际字节累计', () => {
    expect(filesJs).toMatch(/files_clean_freed_total/);
    expect(filesJs).toMatch(/function freedTotal\(\)/);
    expect(filesJs).toMatch(/function bumpFreed\(n\)/);
    expect(filesJs).toMatch(/freed \+= sizeMap\[p\] \|\| 0/);
  });

  it('每张清理卡独立「删除所选」+ 勾选计数同步', () => {
    expect(filesJs).toMatch(/function deleteCleanSel\(cardEl\)/);
    expect(filesJs).toMatch(/function syncCleanCardBtn\(card\)/);
    expect(filesJs).toMatch(/btn\.onclick = function\(\) \{ deleteCleanSel\(btn\.closest\('\.fj-kcard'\)\); \}/);
    // v7.53 双状态源错位修复以按卡收集形式延续（不再有全局收集旧函数）
    expect(filesJs).not.toMatch(/function collectCleanSel\(\)/);
    expect(filesJs).not.toMatch(/S\.cleanSelSize/);
  });

  it('清理页渲染：可释放估算汇总卡 + 四类卡片 + chips 跳转', () => {
    expect(filesJs).toMatch(/可释放约 '/);
    expect(filesJs).toMatch(/'fjCardDup'/);
    expect(filesJs).toMatch(/'fjCardEmpty'/);
    expect(filesJs).toMatch(/'fjCardStale'/);
    expect(filesJs).toMatch(/'fjCardBig'/);
    expect(filesJs).toMatch(/data-jump/);
    // 冗余副本预勾选（保留每组最新一份）
    expect(filesJs).toMatch(/checked: true/);
  });
});

describe('v7.66 ④ 浏览页丰富', () => {
  it('存量 bug 修复：switchTab 同步 .fj-screen.on 显隐（v7.51 起点击清理/浏览视觉停首页）', () => {
    expect(filesJs).toMatch(/function syncScreens\(\) \{/);
    expect(filesJs).toMatch(/sc\.id === SCREEN_IDS\[S\.tab\]/);
    expect(filesJs).toMatch(/syncScreens\(\);\n              renderTabs\(\);/);
    // 页面激活路径同样同步（离开时 tab≠0 恢复）
    expect(filesJs).toMatch(/S\.cache\.t = 0;\n                syncScreens\(\);/);
  });

  it('存储概览 + 分类集合网格（计数与字节）', () => {
    expect(filesJs).toMatch(/function renderBrowse\(\) \{/);
    expect(filesJs).toMatch(/fj-cgrid/);
    expect(filesJs).toMatch(/'<span><span class="tt">' \+ c\.label \+ '<\/span><br\/><span class="ss">' \+ fs\.length \+ ' 项 · ' \+ fmtBytes\(bytes\)/);
  });

  it('实时过滤：独立列表容器 + 输入不丢焦点 + 清除按钮', () => {
    expect(filesJs).toMatch(/function renderBrowseList\(\) \{/);
    expect(filesJs).toMatch(/id="fjBrowseList"/);
    expect(filesJs).toMatch(/id="fjBSearch"/);
    expect(filesJs).toMatch(/id="fjBClear"/);
    expect(filesJs).toMatch(/S\.filter = inp\.value\.trim\(\)/);
    // 排序/视图 chips 只重建列表区（不再整页重渲染丢焦点）
    expect(filesJs).toMatch(/S\.sort = chip\.getAttribute\('data-sort'\); renderBrowseList\(\)/);
    expect(filesJs).toMatch(/S\.view = viewBtn\.getAttribute\('data-view'\); renderBrowseList\(\)/);
  });

  it('全库搜索（关键字 ≥2 字符跨目录匹配，上限 20 条带路径前缀）', () => {
    expect(filesJs).toMatch(/q\.length >= 2/);
    expect(filesJs).toMatch(/全库结果/);
    expect(filesJs).toMatch(/\.slice\(0, 20\)/);
  });
});

describe('v7.66 ⑤ 版本演进', () => {
  it('sw.js VERSION → geek-v76', () => {
    expect(swJs).toMatch(/const VERSION = 'geek-v76';/);
    expect(swJs).not.toMatch(/geek-v74/);
  });
});
