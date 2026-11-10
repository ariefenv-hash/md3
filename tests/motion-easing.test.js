// v245 · #245 批 1「统一档」曲线令牌收口守护（R127 窗 · 2026-11-08 08:00 槽 · Job 2931605）
// 范围：#239 令牌组 + spring-legacy 自创档的精确等值收口（192 处）+ 主壳 tokens 引入链
//       + audit checkF 令牌化率 detail + check-motion-tokens.mjs 水位防回退。
// 边界：JS 语境（WAAPI easing 不支持 var()）与映射表外曲线批 2 处理（水位固化不拦截）。
import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tokens = readFileSync(path.join(root, 'ios-desktop/apps/_shared/md3-tokens.css'), 'utf-8');
const shellIndex = readFileSync(path.join(root, 'ios-desktop/index.html'), 'utf-8');
const AUDIT = path.join(root, 'scripts', 'audit-app-quality.mjs');
const CHECK = path.join(root, 'scripts', 'check-motion-tokens.mjs');
const BASELINE = path.join(root, 'scripts', 'motion-token-baseline.json');

// 批 1 精确等值映射表（值归一键 → 令牌；与收口脚本/check 脚本三方一致）
const MAP = new Map([
  ['0.2,0,0,1', '--md-easing-emphasized'],
  ['0,0,0,1', '--md-easing-standard-decelerate'],
  ['0.3,0,1,1', '--md-easing-standard-accelerate'],
  ['0.05,0.7,0.1,1', '--md-easing-emphasized-decelerate'],
  ['0.3,0,0.8,0.15', '--md-easing-emphasized-accelerate'],
  ['0.42,1.67,0.21,0.9', '--md-easing-spring-fast-spatial'],
  ['0.38,1.21,0.22,1', '--md-easing-spring-default-spatial'],
  ['0.27,1.06,0.18,1', '--md-easing-spring-slow-spatial'],
  ['0.31,0.94,0.34,1', '--md-easing-spring-fast-effects'],
  ['0.34,0.8,0.34,1', '--md-easing-spring-default-effects'],
  ['0.34,0.88,0.34,1', '--md-easing-spring-slow-effects'],
  ['0.34,1.56,0.64,1', '--md-easing-spring-legacy'],
]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'vendor' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(css|html)$/.test(e.name) && !/\.min\./.test(e.name)) out.push(full);
  }
  return out;
}

describe('v245 A · 令牌组 legacy 档与过冲语义', () => {
  test('A1 spring-legacy 档逐字锚 + 【自创】标注在位（#170 自创纪律）', () => {
    expect(tokens).toContain('--md-easing-spring-legacy: cubic-bezier(0.34, 1.56, 0.64, 1);');
    const m = tokens.match(/\/\* 【自创】spring legacy 档[\s\S]*?\*\/\s*--md-easing-spring-legacy:/);
    expect(m, 'legacy 档头部【自创】注释块在位').toBeTruthy();
    expect(m[0]).toContain('批 2');
  });

  test('A2 过冲语义：legacy 与 spring-spatial 三档末控制点 y>1；classic 族与 effects 档全部 y≤1', () => {
    const grab = (name) => {
      const m = tokens.match(new RegExp(`--md-easing-${name}: cubic-bezier\\(([^)]*)\\)`));
      return m ? m[1].split(',').map(Number) : null;
    };
    for (const n of ['spring-fast-spatial', 'spring-default-spatial', 'spring-slow-spatial', 'spring-legacy']) {
      const v = grab(n);
      expect(v, n).toBeTruthy();
      expect(Math.max(v[1], v[3]), `${n} 允许过冲（y>1）`).toBeGreaterThan(1);
    }
    for (const n of ['standard', 'standard-accelerate', 'standard-decelerate', 'emphasized', 'emphasized-decelerate', 'emphasized-accelerate', 'spring-fast-effects', 'spring-default-effects', 'spring-slow-effects']) {
      const v = grab(n);
      expect(v, n).toBeTruthy();
      expect(Math.max(v[1], v[3]), `${n} 不得过冲（y≤1）`).toBeLessThanOrEqual(1);
    }
  });
});

describe('v245 B · 收口完整性与引入链', () => {
  const files = walk(path.join(root, 'ios-desktop')).filter((f) => !f.endsWith(path.join('_shared', 'md3-tokens.css')));

  test('B1 收口完整性：全库非注释非 script 裸曲线中映射表内值 = 0（批 1 精确等值全收）', () => {
    const NUM = /^-?\d*\.?\d+$/;
    let offenders = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      const spans = [];
      for (const m of src.matchAll(/\/\*[\s\S]*?\*\//g)) spans.push([m.index, m.index + m[0].length]);
      for (const m of src.matchAll(/<!--[\s\S]*?-->/g)) spans.push([m.index, m.index + m[0].length]);
      for (const m of src.matchAll(/<script\b[\s\S]*?<\/script>/gi)) spans.push([m.index, m.index + m[0].length]);
      const mask = src.replace(/var\(--md-easing-[a-z-]+,\s*cubic-bezier\([^)]*\)/g, (x) => '\u0000'.repeat(x.length));
      for (const m of mask.matchAll(/cubic-bezier\(\s*([^)]*?)\s*\)/g)) {
        if (spans.some(([a, b]) => a <= m.index && m.index < b)) continue;
        const parts = m[1].split(',').map((s) => s.trim());
        if (parts.length !== 4 || !parts.every((p) => NUM.test(p))) continue;
        const key = parts.map(Number).join(',');
        if (MAP.has(key)) offenders.push(`${path.relative(root, f)}: cubic-bezier(${parts.join(', ')}) → 应为 ${MAP.get(key)}`);
      }
    }
    expect(offenders, offenders.slice(0, 6).join('\n')).toEqual([]);
  });

  test('B2 主壳引入链：index.html 在 md3-theme.css 之前 link 共享令牌层（主壳 var() 真源）', () => {
    const i = shellIndex.indexOf('apps/_shared/md3-tokens.css');
    const j = shellIndex.indexOf('css/md3-theme.css');
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(-1);
    expect(i, 'tokens link 先于主题 link（主题同名令牌后置覆盖，色彩零漂移）').toBeLessThan(j);
  });

  test('B3 零 var 嵌套：不存在 var(--md-easing-x, var(--md-easing-… 双层包裹（收口脚本盲区回归锚）', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      expect(src.match(/var\(--md-easing-[a-z-]+,\s*var\(--md-easing/g), path.relative(root, f)).toBeNull();
    }
  });
});

describe('v245 C · audit checkF 令牌化率 detail 契约', () => {
  test('C1 pass 语义不变（动效锚 ≥3）+ detail 含曲线令牌化计数', async () => {
    const { checkF } = await import('file://' + AUDIT);
    const bareOnly = 'transition: opacity .2s cubic-bezier(0.2, 0, 0, 1); animation: f .2s cubic-bezier(0.2, 0, 0, 1); @keyframes f {}';
    const tokenized = 'transition: opacity .2s var(--md-easing-emphasized, cubic-bezier(0.2, 0, 0, 1)); animation: f .2s var(--md-easing-emphasized, cubic-bezier(0.2, 0, 0, 1)); @keyframes f {}';
    const r1 = checkF(bareOnly);
    expect(r1.pass).toBe(true);
    expect(r1.detail).toContain('曲线令牌化 0/2（0%）');
    const r2 = checkF(tokenized);
    expect(r2.pass).toBe(true);
    expect(r2.detail).toContain('曲线令牌化 2/2（100%）');
    // pass 条件批 1 不收紧：令牌化率 0% 也不因曲线失分（#246 建议三「先告警分档」同律）
    expect(checkF('transition: opacity .2s;').pass).toBe(false);
  });
});

describe('v245 D · check-motion-tokens 水位防回退契约', () => {
  test('D1 水位文件字段完整（tokenConsumed/bareTotal/bareDist）且与实跑一致', () => {
    const base = JSON.parse(readFileSync(BASELINE, 'utf-8'));
    expect(base.tokenConsumed).toBeGreaterThan(0);
    expect(base.bareTotal).toBeGreaterThan(0);
    expect(Object.keys(base.bareDist).length).toBeGreaterThan(0);
    // v11.09 批 3 合流重锚：对侧实例 4（markdown/pdf/code-editor+双共享轴）+8 与本侧 Job 2932311（空态 7 家×2+calendar 双共享轴）+14 零文件交集合流，213→235（bare 122 不变，共 357）
    expect(base.tokenConsumed + base.bareTotal).toBe(357);
  });

  test('D2 --check 实跑 exit 0（水位不降不增）+ 报告模式输出令牌化率', () => {
    const out = execFileSync('node', [CHECK, '--check'], { encoding: 'utf-8', cwd: root });
    expect(out).toContain('PASS');
    const rep = execFileSync('node', [CHECK], { encoding: 'utf-8', cwd: root });
    expect(rep).toContain('令牌化率');
  });
});


describe('v245 E · 批 2「基础/进阶档」动效补齐守护（R128 窗 · 2026-11-08 10:00 槽 · Job 2931605 实例 3）', () => {
  const app = (name) => readFileSync(path.join(root, 'ios-desktop/apps', name, 'index.html'), 'utf-8');

  test('E1 水位文件含 legacyValues（36 值）+ legacyVerdict 评估结论固化', () => {
    const base = JSON.parse(readFileSync(BASELINE, 'utf-8'));
    expect(Array.isArray(base.legacyValues)).toBe(true);
    expect(base.legacyValues.length).toBe(36);
    expect(Object.keys(base.bareDist).length).toBe(36);
    // 遗留清单与 bareDist 分布逐值一致（评估「保持原值」结论的数据面）
    for (const v of base.legacyValues) expect(base.bareDist[v]).toBeGreaterThan(0);
    expect(base.legacyVerdict).toContain('批 2 逐档评估');
    expect(base.legacyVerdict).toContain('保持原值');
  });

  test('E2 九家新增应用批 2 语义动效存在（列表进入/开窗/按压）且曲线取自令牌', () => {
    // shortcuts：列表入场 + 卡片按压形变 + toast 曲线
    const sc = app('shortcuts');
    expect(sc).toContain('@keyframes sc-list-in');
    expect(sc).toContain('animation:sc-list-in var(--md-duration-medium,400ms)');
    expect(sc).toContain('var(--md-easing-spring-fast-effects, cubic-bezier(0.31,0.94,0.34,1))');
    expect(sc).toContain('.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}');
    // code-editor：sheet 模态 + 侧栏面板入场 + toast 曲线
    const ce = app('code-editor');
    expect(ce).toContain('@keyframes ce-sheet-in');
    expect(ce).toContain('@keyframes ce-side-in');
    expect(ce).toContain('animation: ce-sheet-in var(--md-duration-fast-spatial,350ms)');
    expect(ce).toContain('transition: opacity var(--md-duration-short) var(--md-easing-emphasized-accelerate');
    // markdown：doc 列表 stagger 入场 + 弹层曲线
    const md = app('markdown');
    expect(md).toContain('@keyframes md-doc-in');
    expect(md).toContain('#docList .doc:nth-child(8) { animation-delay: 252ms; }');
    // midi-player：主体入场 + VFS 列表 stagger + toast 曲线
    const mp = app('midi-player');
    expect(mp).toContain('animation: mp-app-in');
    expect(mp).toContain('@keyframes mp-row-in');
    expect(mp).toContain('.mp-vfs-list .mp-vfs-row:nth-child(8) { animation-delay: 252ms; }');
    // pdf：按压 scale + 工具栏入场 + toast 曲线
    const pd = app('pdf');
    expect(pd).toContain('.tbtn:active { background: var(--md-state-pressed, var(--panel-highest)); transform: scale(.94); }');
    expect(pd).toContain('@keyframes pdf-tb-in');
    // terminal：输出行入场（新行自动生效）
    const tm = app('terminal');
    expect(tm).toContain('animation: tm-line-in var(--md-duration-fast-effects,150ms)');
    // typing：工具条入场 + 裸 ease 收口
    const tp = app('typing');
    expect(tp).toContain('animation: tp-chip-in');
    expect(tp).not.toMatch(/transition: transform var\(--md-duration-short, 0\.15s\) ease/);
    // bytebeat：双 panel 错峰入场 + toast opacity 曲线
    const bb = app('bytebeat');
    expect(bb).toContain('@keyframes bb-panel-in');
    expect(bb).toContain('.bb-panel + .bb-panel { animation-delay: 60ms; }');
    // drawcircle：记录列表 stagger + 裸 ease 收口 + flash 曲线
    const dc = app('drawcircle');
    expect(dc).toContain('@keyframes dc-rec-in');
    expect(dc).toContain('#recList .rec:nth-child(6) { animation-delay: 180ms; }');
    expect(dc).not.toMatch(/transition: transform var\(--md-duration-short, 150ms\) ease/);
    expect(dc).toContain('transition: opacity var(--md-duration-slow-effects, 300ms)');
  });

  test('E3 批 2 新增消费全部为「令牌+fallback」形式（裸曲线零新增）', () => {
    // 九家应用 source 内非 var 包装的裸 cubic-bezier 保持为 0（水位 bare 122 不变的文面保证）
    const nine = ['shortcuts', 'code-editor', 'markdown', 'midi-player', 'pdf', 'terminal', 'typing', 'bytebeat', 'drawcircle'];
    for (const n of nine) {
      const src = app(n).replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[\s\S]*?<\/script>/gi, '');
      const bare = [...src.matchAll(/cubic-bezier\(/g)].filter(m => {
        const before = src.slice(Math.max(0, m.index - 40), m.index);
        return !/var\(--md-easing-[^)]*$/.test(before);
      });
      expect(bare.length, `${n} 出现非令牌包装裸曲线`).toBe(0);
    }
  });
});

describe('v245 F · 批 3「进阶档」共享轴转场 + 空状态入场守护（R130 窗 · 2026-11-08 14:00 槽 · Job 2931605 实例 4）', () => {
  const app = (n) => readFileSync(path.join(root, 'ios-desktop/apps', n, 'index.html'), 'utf-8');

  test('F1 空状态入场：三家空态类 animation 声明 + emphasized-decelerate 令牌消费', () => {
    // markdown / pdf：innerHTML 动态插入 CSS animation 自动生效（批 2 同口径零 JS）
    const md = app('markdown');
    expect(md).toContain('@keyframes md-empty-in');
    expect(md).toContain('animation: md-empty-in var(--md-duration-slow-effects, 300ms) var(--md-easing-emphasized-decelerate');
    const pd = app('pdf');
    expect(pd).toContain('@keyframes pdf-empty-in');
    expect(pd).toContain('.empty { color: var(--text-sub); font-size: 12px; text-align: center; padding: 18px 12px; animation: pdf-empty-in');
    // code-editor：.ce-empty 走 .hide 的 display:none↔flex 切换重播（每次空态显示即入场）+ .ce-tree-empty 动态插入
    const ce = app('code-editor');
    expect(ce).toContain('@keyframes ce-empty-in');
    expect(ce.match(/animation: ce-empty-in var\(--md-duration-slow-effects, 300ms\) var\(--md-easing-emphasized-decelerate/g).length).toBe(2);
  });

  test('F2 共享轴转场方向对：forward(+X)/back(-X) 反向位移 + AOSP SharedAxis X 30dp 权威滑距', () => {
    const md = app('markdown');
    expect(md).toContain('@keyframes md-pane-fwd-in { from { opacity: 0; transform: translateX(30px); } }');
    expect(md).toContain('@keyframes md-pane-back-in { from { opacity: 0; transform: translateX(-30px); } }');
    expect(md).toContain('animation: md-pane-fwd-in var(--md-duration-slow-effects, 300ms)');
    expect(md).toContain('animation: md-pane-back-in var(--md-duration-slow-effects, 300ms)');
    const pd = app('pdf');
    expect(pd).toContain('@keyframes pdf-pane-fwd-in { from { opacity: 0; transform: translateX(30px); } }');
    expect(pd).toContain('@keyframes pdf-pane-back-in { from { opacity: 0; transform: translateX(-30px); } }');
    expect(pd).toContain('animation: pdf-pane-fwd-in var(--md-duration-slow-effects, 300ms)');
    expect(pd).toContain('animation: pdf-pane-back-in var(--md-duration-slow-effects, 300ms)');
  });

  test('F3 断点隔离负向锚：pane 转场仅存在于手机断点（≤759.98px），平板断点（≥760px）零动画防切 tab 闪动', () => {
    for (const n of ['markdown', 'pdf']) {
      const src = app(n);
      const tablet = src.match(/@media \(min-width: 760px\)\s*\{[\s\S]*?\n  \}/);
      expect(tablet, `${n} 平板断点段可提取`).toBeTruthy();
      expect(tablet[0], `${n} 平板断点不得含 pane 转场`).not.toContain('pane-fwd-in');
      expect(tablet[0], `${n} 平板断点不得含 pane 转场`).not.toContain('pane-back-in');
      const mobile = src.match(/@media \(max-width: 759\.98px\)\s*\{[\s\S]*?\n  \}/);
      expect(mobile, `${n} 手机断点段可提取`).toBeTruthy();
      expect(mobile[0], `${n} 手机断点含 forward 入场`).toContain('pane-fwd-in');
    }
    const pdMobile = app('pdf').match(/@media \(max-width: 759\.98px\)\s*\{[\s\S]*?\n  \}/)[0];
    expect(pdMobile).toContain('body[data-tab="view"] #viewPane { display: flex; padding: 0 10px 4px; animation: pdf-pane-fwd-in');
    expect(pdMobile).toContain('#sidePane { padding: 0 10px 4px; animation: pdf-pane-back-in');
    const mdMobile = app('markdown').match(/@media \(max-width: 759\.98px\)\s*\{[\s\S]*?\n  \}/)[0];
    expect(mdMobile).toContain('body[data-tab="preview"] #previewPane { display: flex; padding: 0 10px 4px; animation: md-pane-fwd-in');
    expect(mdMobile).toContain('#editorPane { padding: 0 10px 4px; animation: md-pane-back-in');
  });

  test('F4 零 JS 改动负向锚：三家 script 块内不含批 3 新增动画类名（纯 CSS 面文面保证，批 2 E3 同口径）', () => {
    for (const n of ['markdown', 'pdf', 'code-editor']) {
      const src = app(n);
      // 提取 script 块【内容】断言不含新增类名（pane 动画本在 style 块内，只验 JS 面）
      const scriptBodies = [...src.matchAll(/<script\b[\s\S]*?<\/script>/gi)].map((m) => m[0]).join('\n');
      expect(scriptBodies, `${n} script 块不含 pane-fwd-in`).not.toContain('pane-fwd-in');
      expect(scriptBodies, `${n} script 块不含 pane-back-in`).not.toContain('pane-back-in');
      expect(scriptBodies, `${n} script 块不含 empty-in`).not.toContain('empty-in');
    }
  });

  test('F5 check:motion 水位实跑 exit 0 + 批 3 合流固化（tokens=235 bare=122 令牌化率 65.8%）+ legacy 评估字段透传保留', () => {
    const out = execFileSync('node', [CHECK, '--check'], { encoding: 'utf-8' });
    expect(out).toContain('PASS');
    const base = JSON.parse(readFileSync(BASELINE, 'utf-8'));
    expect(base.tokenConsumed).toBe(235);
    expect(base.bareTotal).toBe(122);
    expect(base.generated).toContain('批 3');
    expect(base.legacyValues).toBeTruthy();
    expect(base.legacyVerdict).toContain('36 值');
  });
});

describe('v245 H · 批 3「进阶档」空态入场 7 家 + calendar 双态共享轴（R130 窗 · Job 2932311 本实例 · 与 F 组三家零文件交集合流）', () => {
  const app = (name) => readFileSync(path.join(root, 'ios-desktop/apps', name, 'index.html'), 'utf-8');

  test('H1 空态入场签名七家逐家断言（容器 empty-fade + 子项 empty-rise + 令牌 + keyframes）', () => {
    // photos：V7 布局规则（#262 批 1 先例）+ 批 3 动效规则块并存
    const ph = app('photos');
    expect(ph).toContain('.empty-state {\n            display: flex;');
    expect(ph).toContain('animation: empty-fade .4s var(--md-easing-emphasized-decelerate, cubic-bezier(.05,.7,.1,1)) both');
    expect(ph).toContain('animation: empty-rise .48s var(--md-easing-emphasized-decelerate, cubic-bezier(.05,.7,.1,1)) both');
    expect(ph).toContain('@keyframes empty-fade');
    expect(ph).toContain('@keyframes empty-rise');
    // reminders：布局规则 + 动效规则同块域并存
    const rm = app('reminders');
    expect(rm).toContain('.empty-state { display: flex; flex-direction: column;');
    expect(rm).toContain('animation: empty-fade .4s var(--md-easing-emphasized-decelerate');
    expect(rm).toContain('@keyframes empty-rise');
    // calendar：动效规则块「仅挂动画不定义布局」（布局留原类零漂移）
    const cal = app('calendar');
    expect(cal).toContain('.empty-state {\n      animation: empty-fade');
    expect(cal).toContain('@keyframes empty-fade');
    // messages / notes / translate：动效规则块 + 令牌消费
    for (const n of ['messages', 'notes', 'translate']) {
      const s = app(n);
      expect(s, `${n} 缺 empty-fade 动画`).toContain('animation: empty-fade .4s var(--md-easing-emphasized-decelerate');
      expect(s, `${n} 缺 empty-rise 动画`).toContain('animation: empty-rise .48s var(--md-easing-emphasized-decelerate');
      expect(s, `${n} 缺 keyframes`).toContain('@keyframes empty-fade');
      expect(s, `${n} 缺 stagger`).toContain('.empty-state > *:nth-child(2) { animation-delay: 60ms; }');
    }
  });

  test('H2 HTML 挂类断言（七家 .empty-state 类锚在位；books 类统一零动效改动）', () => {
    // books：类统一（既有 animate-fade-in-up stagger-3 体系承担动效，负向锚断言 books 不引入 empty-fade 动画）
    const bk = app('books');
    expect(bk).toContain('class="text-center py-16 animate-fade-in-up stagger-3 empty-state"');
    expect(bk).not.toContain('animation: empty-fade');
    // calendar：JS 模板两处空态挂类
    const cal = app('calendar');
    expect(cal).toContain('class="recent__empty empty-state"');
    expect(cal).toContain('class="day-empty empty-state"');
    // messages：系统通知空态块挂类
    expect(app('messages')).toContain('text-center py-14 text-sm empty-state');
    // notes：emptyState 静态块挂类（checkV7 关键词盲区修复：empty[-_]?state 命中）
    expect(app('notes')).toContain('text-center py-16 hidden empty-state');
    // translate：历史记录空态挂类
    expect(app('translate')).toContain('class="history-empty empty-state"');
    // photos：静态空态块已有类（#262 先例）——负向锚确认未丢
    expect(app('photos')).toContain('id="emptyState" class="text-center py-16 empty-state"');
  });

  test('H3 calendar 双态共享轴转场（窄屏媒体查询内，宽屏双栏不受影响）', () => {
    const cal = app('calendar');
    expect(cal).toContain('@keyframes shared-axis-fwd');
    expect(cal).toContain('@keyframes shared-axis-bwd');
    expect(cal).toContain('.editor-wrap.active { animation: shared-axis-fwd .48s var(--md-easing-emphasized-decelerate');
    expect(cal).toContain('.preview-wrap.active { animation: shared-axis-bwd .48s var(--md-easing-emphasized-decelerate');
    // 方向性：forward +24px / backward -24px（shared axis X 语义）
    expect(cal).toContain('from { opacity: 0; transform: translateX(24px); }');
    expect(cal).toContain('from { opacity: 0; transform: translateX(-24px); }');
    // 边界：规则必须位于 max-width:1023px 媒体查询内（宽屏双栏常显零影响）
    const mq = cal.slice(cal.indexOf('@media (max-width:1023px)'));
    const mqEnd = mq.indexOf('@media (max-width:599px)');
    const seg = mq.slice(0, mqEnd);
    expect(seg).toContain('.editor-wrap.active { animation: shared-axis-fwd');
    expect(seg).toContain('.preview-wrap.active { animation: shared-axis-bwd');
  });

  test('H4 合流水位断言（tokens=235 / bare=122 / generated 合流口径）', () => {
    const base = JSON.parse(readFileSync(BASELINE, 'utf-8'));
    expect(base.tokenConsumed).toBe(235);
    expect(base.bareTotal).toBe(122);
    expect(base.generated).toContain('合流');
    expect(base.generated).toContain('7 家');
  });
});
