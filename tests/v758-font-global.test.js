// ==================== v758-font-global.test.js — v7.58 字体全局化回归守护 ====================
// 议题反馈「字体应用不是全局的」：宿主桌面 = 'Noto Serif SC'（base.css），而 21 个
// iframe 子应用是独立文档 —— 各自硬编码 'Noto Sans SC'/'Outfit'/system-ui 等栈，
// 与宿主割裂；md3-tokens.css 作为全部子应用的规范令牌单一真源，现承担全局字体契约。
//
// 锚定层：
//   ① md3-tokens.css 全局字体契约（@import 位置合法性 + 变量 + 基线规则）
//   ② 与宿主 base.css / ios-desktop/index.html 的字体栈逐字一致（两端同源锁定）
//   ③ 15 处子应用 body/root 级硬编码栈归一（旧串清零 + 新串落位）
//   ④ 图标/等宽/品牌展示字体保护位原样（Material Icons/Symbols、--mono、
//     Playfair/Cinzel/Nunito/Google Sans 展示作用域、clock-app --f 契约）
//   ⑤ 根壳 index.html 长驻会话 SW 定期 update 检查（v7.57 已上站但用户端
//     仍见 140ms 旧回弹的根因 —— 常驻内存不导航 → 永不重新拉取 sw.js）
//   ⑥ 版本锚点：sw.js geek-v76
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');
const APP = (id) => `ios-desktop/apps/${id}/index.html`;

// ==================== ① md3-tokens.css 全局字体契约 ====================

describe('v7.58 — md3-tokens.css 全局字体契约', () => {
  const css = R('ios-desktop/apps/_shared/md3-tokens.css');

  it('@import Noto Serif SC 存在且位于全部规则之前（CSS 规范：先于任何规则）', () => {
    expect(css).toContain(
      "@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600;700&display=swap');"
    );
    // 去掉注释后，@import 必须是第一条语句
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    expect(stripped.startsWith('@import')).toBe(true);
  });

  it('--md-text-font 全局正文唯一真源：与宿主 base.css html,body 栈逐字一致', () => {
    const m = /--md-text-font:\s*([^;]+);/.exec(css);
    expect(m).toBeTruthy();
    const base = R('ios-desktop/css/base.css');
    const bm = /html,\s*body\s*\{[^}]*font-family:\s*([^;]+);/.exec(base);
    expect(bm).toBeTruthy();
    // 语义一致：压平空白 + 统一引号（base.css 双引号 / tokens 单引号，CSS 等价）
    const norm = (s) => s.replace(/\s+/g, ' ').replace(/["']/g, '').trim();
    expect(norm(m[1])).toBe(norm(bm[1]));
    expect(m[1]).toContain("'Noto Serif SC'");
    expect(m[1]).toContain("serif");
  });

  it('--md-font 兼容别名指向 --md-text-font（收编 camera/notes/shortcuts 既有消费方）', () => {
    expect(css).toMatch(/--md-font:\s*var\(--md-text-font\)/);
  });

  it('基线规则：html,body { font-family: var(--md-text-font) }（应用样式随后可覆盖、默认态全局生效）', () => {
    expect(css).toMatch(
      /html,\s*\nbody\s*\{\s*font-family:\s*var\(--md-text-font\);?\s*\}/
    );
  });
});

// ==================== ② 字体加载两端同源 ====================

describe('v7.58 — 字体加载与宿主同 URL 同权重', () => {
  it('tokens @import 与 ios-desktop/index.html 的 Noto Serif SC 链接同参数', () => {
    const css = R('ios-desktop/apps/_shared/md3-tokens.css');
    const shell = R('ios-desktop/index.html');
    const family = 'Noto+Serif+SC:wght@300;400;600;700';
    expect(css).toContain(family);
    expect(shell).toContain(family);
  });
});

// ==================== ③ 子应用硬编码栈归一（15 处） ====================

const NORMALIZED = [
  ['books', "font-family: var(--md-text-font);"],
  ['calculator', "--app-font: var(--md-text-font);"],
  ['contacts', "--font: var(--md-text-font);"],
  ['dice', "font-family: var(--md-text-font);"],
  ['flow11', 'font-family: var(--md-text-font), "Segoe UI Emoji", sans-serif;'],
  ['messages', "font-family: var(--md-text-font);"],
  ['music', 'font-family: var(--md-text-font), "PingFang SC", "Microsoft YaHei", sans-serif;'],
  ['phone', 'font-family: var(--md-text-font), -apple-system, BlinkMacSystemFont, sans-serif;'],
  ['photos', "font-family: var(--md-text-font);"],
  ['reminders', "font-family: var(--md-text-font);"],
  ['safari', "font-family: var(--md-text-font);"],
  ['stocks', "font-family: var(--md-text-font);"],
  ['translate', "font-family: var(--md-text-font);"],
  ['weather', 'font-family: var(--md-text-font), "Segoe UI Emoji", sans-serif;'],
];

describe('v7.58 — 子应用 body/root 级字体栈归一', () => {
  it.each(NORMALIZED)('%s 已引用 var(--md-text-font)', (id, needle) => {
    expect(R(APP(id))).toContain(needle);
  });

  it('旧硬编码栈全部清零（body/root 级不再出现）', () => {
    const gone = [
      [APP('books'), "font-family: 'Noto Sans SC', sans-serif;"],
      [APP('calculator'), "--app-font: 'Quicksand', system-ui, sans-serif;"],
      [APP('contacts'), "--font: 'Roboto','Noto Sans SC',system-ui,sans-serif;"],
      [APP('dice'), "font-family: 'Plus Jakarta Sans', sans-serif;"],
      [APP('messages'), "font-family: 'Noto Sans SC', sans-serif;"],
      [APP('messages'), "font-family: 'Outfit', sans-serif;"],
      [APP('music'), 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;'],
      [APP('phone'), "font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;"],
      [APP('photos'), "font-family: 'Outfit', 'Noto Sans SC', sans-serif;"],
      [APP('reminders'), "font-family: 'Roboto', sans-serif;"],
      [APP('safari'), "font-family: 'Roboto Flex', sans-serif;"],
      [APP('stocks'), "font-family: 'Outfit', 'Noto Sans SC', sans-serif;"],
      [APP('translate'), "font-family: 'Plus Jakarta Sans', 'Noto Sans SC', sans-serif;"],
      [APP('weather'), "font-family: 'Outfit', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, \"Segoe UI Emoji\", sans-serif;"],
    ];
    for (const [file, needle] of gone) {
      expect(R(file)).not.toContain(needle);
    }
  });

  it('全部 21 个子应用都链接共享令牌层（字体契约的送达前提）', () => {
    const IDS = ['books','calculator','calendar','camera','clock-app','contacts','dice','flow11',
      'game2048','messages','music','notes','phone','photos','reminders','safari','shortcuts',
      'stocks','threes','translate','weather'];
    for (const id of IDS) {
      expect(R(APP(id))).toContain('../_shared/md3-tokens.css');
    }
  });
});

// ==================== ④ 图标 / 等宽 / 品牌展示字体保护位 ====================

describe('v7.58 — 图标/等宽/品牌展示字体不受归一化影响', () => {
  it('图标字体家族声明仍在（Material Symbols/Icons 多应用）', () => {
    expect(R(APP('calculator'))).toContain("'Material Icons'");
    expect(R(APP('clock-app'))).toContain('.material-symbols-outlined');
    expect(R(APP('translate'))).toContain("'Material Symbols Rounded'");
  });

  it('等宽展示保留：music --mono / calendar JetBrains Mono / dice 状态胶囊', () => {
    expect(R(APP('music'))).toMatch(/--mono:\s*ui-monospace/);
    expect(R(APP('calendar'))).toContain("font-family: 'JetBrains Mono', monospace;");
    expect(R(APP('dice'))).toContain("font-family: 'JetBrains Mono', monospace;");
  });

  it('品牌/展示作用域保留：books Playfair、safari Google Sans、threes/game2048 游戏字体契约', () => {
    expect(R(APP('books'))).toContain("font-family: 'Playfair Display', serif;");
    expect(R(APP('safari'))).toContain("font-family: 'Google Sans';");
    expect(R(APP('threes'))).toMatch(/--font:\s*var\(--custom-font/);
    expect(R(APP('game2048'))).toMatch(/--font:\s*'Playfair Display','Noto Serif SC',serif/);
  });

  it('clock-app 用户字体契约原样（--custom-user-font 优先，默认 Noto Serif SC）', () => {
    expect(R(APP('clock-app'))).toMatch(
      /--f:\s*var\(--custom-user-font,\s*'Noto Serif SC',\s*serif\)/
    );
  });
});

// ==================== ⑤ 根壳 SW 定期 update 检查 ====================

describe('v7.58 — 长驻会话 SW 定期检查更新（根壳 index.html）', () => {
  const shell = R('index.html');

  it('注册后启动 90s 周期 reg.update()（v7.57 拉伸修复已上站但常驻用户端取不到的根因）', () => {
    expect(shell).toContain('reg.update()');
    expect(shell).toContain('90000');
  });

  it('update() 放在 try + .catch 内（离线/非法环境静默，不产生未处理拒绝）', () => {
    const block = /window\.setInterval\(function \(\) \{[\s\S]*?reg\.update\(\)[\s\S]*?\}, 90000\);/.exec(shell);
    expect(block).toBeTruthy();
    expect(block[0]).toContain('try {');
    expect(block[0]).toContain('.catch(function () {})');
  });

  it('既有更新链路保持：skipWaiting 提示胶囊 + controllerchange 刷新未被破坏', () => {
    expect(shell).toContain("reg.waiting.postMessage('SKIP_WAITING')");
    expect(shell).toContain("addEventListener('controllerchange'");
  });
});

// ==================== ⑥ 版本锚点 ====================

describe('v7.58 — 版本锚点', () => {
  it("sw.js VERSION = 'geek-v76'", () => {
    expect(R('sw.js')).toContain("const VERSION = 'geek-v76';");
  });
});
