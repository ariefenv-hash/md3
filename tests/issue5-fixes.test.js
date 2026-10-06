// ==================== issue5-fixes.test.js — issue #5「一堆小问题」六项修复回归 ====================
// 锚定 https://github.com/ariefenv-hash/md3/issues/5 六张截图对应的修复：
//   1. dice 骰面点数隐形（--die-ink 引用恒白的 on-primary）
//   2. flow11 底部道具栏被宿主导航胶囊截断（布局不适应视口）
//   3. settings 系统版本显示 geek-v53-cacheFirst（策略名混入版本常量）
//   4. quick-settings Internet / Auto-rotate 图标残形（非官方路径）
//   5. translate 备用翻译源无超时（「翻译中...」可能永久悬挂）
//   6. files 目录切换幽灵快照滞留（唯一清理链路脆弱）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf-8');

describe('issue #5 → ① dice 骰面墨色与底部让位', () => {
  const src = read('ios-desktop/apps/dice/index.html');

  it('--die-ink 不再引用恒为 #ffffff 的 --md-on-primary', () => {
    expect(src).toContain('--die-ink: hsl(var(--md-h) 60% 16%)');
    expect(src).not.toContain('--die-ink: var(--md-on-primary)');
  });

  it('骰面点数/数字绘制走 cssVar(--die-ink)（补色后依旧联动主题色相）', () => {
    expect(src).toContain("cssVar('--die-ink', '#0F382F')");
  });

  it('操作台 bottom 72px / 总分徽章 196px，避开宿主导航胶囊（bottom10+高约48）', () => {
    expect(src).toMatch(/\.command-console \{[^}]*bottom: 72px/);
    expect(src).toMatch(/\.total-score-badge \{[^}]*bottom: 196px/);
  });
});

describe('issue #5 → ② flow11 视口自适应（道具栏不再被截断）', () => {
  const src = read('ios-desktop/apps/flow11/index.html');

  it('body 定高 100dvh 且底部预留 66px 导航胶囊让位', () => {
    expect(src).toMatch(/height: 100dvh;/);
    expect(src).toMatch(/padding: 10px 14px 66px;/);
    expect(src).not.toMatch(/min-height: 100vh/);
  });

  it('game-container 限高 100%，棋盘可收缩（min-height:0 + flex-shrink:1）', () => {
    expect(src).toMatch(/max-height: 100%;/);
    const board = src.match(/\.board-wrapper \{[\s\S]*?\}/)[0];
    expect(board).toContain('flex-shrink: 1');
    expect(board).toContain('min-height: 0');
    expect(board).toContain('aspect-ratio: 1 / 1');
  });
});

describe('issue #5 → ③ sw.js 版本常量语义化 + 设置页锚定提取', () => {
  const src = read('sw.js');

  it("VERSION 为纯 geek-v56，不再携带策略名后缀", () => {
    expect(src).toContain("const VERSION = 'geek-v56';");
    // 赋值行不得再有策略名后缀（注释中的历史说明不算）
    expect(src).not.toMatch(/VERSION\s*=\s*'geek-v\d+-[a-zA-Z]/);
  });

  it('设置页版本行锚定 const VERSION 常量提取，不再取全文首个 geek-v 字样', () => {
    const s = read('ios-desktop/js/apps/settings.js');
    expect(s).toContain("t.match(/const VERSION = '([^']+)'/)");
    expect(s).not.toContain("match(/geek-v");
    // 锚定后对注释干扰免疫：模拟 sw.js 首部出现历史字样，提取结果仍为常量值
    const fake = "/* 历史注释 geek-v53-cacheFirst */\nconst VERSION = 'geek-v56';";
    expect(fake.match(/const VERSION = '([^']+)'/)[1]).toBe('geek-v56');
  });
});

describe('issue #5 → ④ quick-settings 图标官方化', () => {
  const src = read('ios-desktop/js/icons.js');
  const wifi = src.match(/wifi: `(.*?)`/)[1];
  const rotate = src.match(/autorotate: `(.*?)`/)[1];

  it('wifi 为 Material Symbols Rounded 官方路径（960 网格、含点+双环+顶楔）', () => {
    expect(wifi).toContain('viewBox="0 -960 960 960"');
    // 官方 wifi = 顶部楔形 + 中环 + 底部圆点（三段子路径），M480-120 开头为官方指纹
    expect(wifi).toContain('M480-120q-42 0-71-29');
    // 旧残形路径彻底移除（两条同向缠绕子路径渲染成「弧+尖角」）
    expect(wifi).not.toContain('L12 21 24 8.98');
  });

  it('autorotate 为官方 screen_rotation（斜置机身 + 环绕箭头），旧粗斜杠路径移除', () => {
    expect(rotate).toContain('viewBox="0 -960 960 960"');
    expect(rotate).toContain('M496-182 182-496');
    expect(rotate).not.toContain('M16.48 2.52');
  });
});

describe('issue #5 → ⑤ translate 备用源超时兜底', () => {
  const src = read('ios-desktop/apps/translate/index.html');

  it('MyMemory 备用 fetch 挂 8s AbortController，超时必进失败分支', () => {
    expect(src).toContain('fallbackController.abort()');
    expect(src).toMatch(/fallbackTimeout = setTimeout\(\(\) => fallbackController\.abort\(\), 8000\)/);
    expect(src).toMatch(/fetch\(fallbackUrl, \{ signal: fallbackController\.signal \}\)/);
  });
});

describe('issue #5 → ⑥ files 幽灵快照自愈', () => {
  const src = read('ios-desktop/js/apps/files.js');

  it('快照带 data-files-ghost 标记，导航前与页面激活时清扫残骸', () => {
    expect(src).toContain("ghost.setAttribute('data-files-ghost', '1')");
    expect(src).toContain('function removeStaleGhosts()');
    // 导航开始 + 降级路径 + 重新激活三处均清扫
    expect(src.match(/removeStaleGhosts\(\)/g).length).toBeGreaterThanOrEqual(4);
  });

  it('cleanup 先于 render 注册（render 抛异常仍被 380ms 兜底回收），且活动层压在快照之上', () => {
    const nav = src.match(/function navigate\(path\) \{[\s\S]*?\n              \}/)[0];
    // 主路径：navCleanup 注册在 try{render()} 之前；降级分支的 render() 不在此约束内
    expect(nav.indexOf('navCleanup = function()')).toBeLessThan(nav.indexOf('try {'));
    expect(nav.indexOf('try {')).toBeLessThan(nav.lastIndexOf('render();'));
    expect(nav).toContain("rootEl.style.zIndex = '2'");
    expect(nav).toContain('catch (err) {');
  });

  it('transitionend 提前回收 + setTimeout 380ms 兜底双保险', () => {
    expect(src).toContain("ghost.addEventListener('transitionend'");
    expect(src).toContain('}, 380);');
  });
});
