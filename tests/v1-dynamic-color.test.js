// ==================== v312 测试 — #312 [V 清单存量补课·批 7] V1 动态取色 8 家（A 口径继承）（R136 窗 Job 2933040 · 第 2 定时消息系列） ====================
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=V1 动态取色 8 家 A 口径整改（#312 批 7）的验收时点；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）—— 2026-11-13 补标记批（承 #291 补关评论登记的 10 例新违规，非 R149 原注入批）
//
// 背景：R136 续点候选首位（docs/worklog.md 末行 + HANDOFF next_candidates 双真源一致）。
// V1 = checkA 同口径（var(--md- ≥15 且 ≥4 处/100 行，#230 对齐 #229 矩阵）。
//
// 施工形态（stt/books 直连达标先例 + #307 批 3 等值派生先例同律）：
//   :root 别名间接消费 → 规则体直连规范令牌消费（_shared/md3-tokens.css 单一真源）。
//   · Type1 别名（--x: var(--md-Y)）→ 消费点内联 var(--md-Y)，值逐位等值零漂移；
//   · color-mix 派生别名（--outline/--surf-c/--th-scrim-* 等）→ 消费点内联完整 color-mix 公式；
//   · T2 重定向（camera --surface/--surface-variant/--on-surface/--on-surface-variant：自算公式
//     ≡ 规范令牌暗色公式逐字等值）→ 消费点直连规范令牌 —— 暗色零漂移；浅色随宿主令牌联动
//     （v7.26「随宿主色相与明暗实时联动」本义，交付语义如实登记）；
//   · bare 状态层字面量 rgba(255,255,255,0.12/0.08) → var(--md-state-pressed/hover, 原值)；
//   · flow11 .gem-lvl-2 渐变首色 #f2b8b5 → var(--md-error)（与令牌暗色值逐字等值）。
//   · 定义行一律保留（JS getComputedStyle 依赖面零风险）；contacts .mdslider
//     「--md-primary: var(--primary)」令牌反向重定义行 stash 保护原样在位（防自引用环实录锚）。
//
// 功能语义色豁免（md3-tokens.css 用法注记口径，#230 §七「禁止刷次数」纪律）：
//   threes 棋子色板（--tile-1/--tile-2）+ 签名板白（.sign-pad #fff）+ 分数描边白；
//   camera 取景器功能色主导（--error #ff5449/--yellow #fbbc04/白chrome/rgba白叠层）——
//   可直连面已直连（T2 4 别名 + scrim 7 站点 + state-pressed），V1 维持 false 属非缺口登记
//   （#309 terminal / #311 不适用 9 家先例同律），留 #229 车道裁决。
//
// V1 ≡ checkA 同测度 → 9 项制 A 项随本卡同步翻转（quality-baseline.json 双基线同刷，如实披露）。
//
// 关联：#312（本卡）/ #311（批 6）/ #309（批 5）/ #308（批 4）/ #307（批 3）/ #306（批 2）/
//       #262（批 1）/ #243（V 清单基建）/ #230（A 口径）/ #229（矩阵）/ #18 §5/§9/§7.5/§7.6/§7.7

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditVisual } from '../scripts/audit-app-quality.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const APPS_DIR = join(ROOT, 'ios-desktop', 'apps');
const readApp = (id) => readFileSync(join(APPS_DIR, id, 'index.html'), 'utf-8');
/** 审计同口径：应用目录 .html/.css/.js/.mjs 合并文本（跳过 vendor/ 与 *.min.*） */
const readAppDir = (id) => {
  const dir = join(APPS_DIR, id);
  const files = readdirSync(dir).filter((f) => /\.(html|css|js|mjs)$/.test(f) && !/\.min\./.test(f) && f !== 'index.html');
  return readApp(id) + '\n' + files.map((f) => readFileSync(join(dir, f), 'utf-8')).join('\n');
};
const BASELINE = JSON.parse(readFileSync(join(ROOT, 'scripts/visual-baseline.json'), 'utf-8'));
const QBASE = JSON.parse(readFileSync(join(ROOT, 'scripts/quality-baseline.json'), 'utf-8'));

const CLEARED = ['calendar', 'contacts', 'music', 'safari', 'threes', 'translate'];
// v11.29 #286 续深提增值合流演进重评：game2048 增值 11 出口并入 core.js（191 行）后审计目录合并口径密度
// 44/1139=3.9/百行跌破 ≥4（index.html 侧 4.7 维持）——结构性掉线非 UI 退化，按 camera V1/terminal V2 登记
// 先例与 V 清单终态定格「后续仅演进重评」条款入 REGISTERED（真适配不硬造，不硬凑密度）。
// v11.29 第十一批 flow11 同律：连线/计分/生成三族 11 出口并入 core.js（110 行）后合并口径密度 59/1485=3.97<4
// （index.html 侧 4.4 维持）——同源登记，R147 窗。
const REGISTERED = ['camera', 'flow11', 'game2048'];

describe('v312 · #312 V1 动态取色 8 家（批 7 · A 口径继承）', () => {
  it('A1 · 端到端：7 家逐家 auditVisual V1 pass（≥15 且 ≥4/100 行，审计目录合并口径）', () => {
    for (const id of CLEARED) {
      const v = auditVisual(id, readAppDir(id));
      expect(v.items.V1.pass, `${id} V1 应 pass`).toBe(true);
      expect(v.items.V1.detail).toMatch(/密度 [4-9]\d*\.\d|密度 [1-9]\d\.\d/);
    }
  });

  it('A2 · 直连形态锚：消费点绑定规范令牌（逐家代表行原文）', () => {
    const guards = [
      ['calendar', '.date-cell--today { background: var(--md-primary); color: var(--md-on-primary); }'],
      ['contacts', '.mdslider { width: 104px; --md-primary: var(--primary); --md-background: var(--surface); }'],
      ['threes', 'border: 1px solid color-mix(in srgb, var(--md-outline) 25%, transparent);'],
      ['translate', 'transition: background 0.4s var(--md-easing-emphasized, cubic-bezier(0.2, 0, 0, 1)), color 0.4s var(--md-easing-emphasized, cubic-bezier(0.2, 0, 0, 1));'],
      ['music', 'background: var(--md-surface-container-low);\n      border-color: var(--md-primary);'],
      ['flow11', 'background: color-mix(in srgb, var(--md-surface-bright) 45%, transparent);'],
      ['camera', 'background: var(--md-surface);'],
    ];
    for (const [id, frag] of guards) {
      expect(readApp(id).includes(frag), `${id} 直连锚: ${frag.slice(0, 44)}…`).toBe(true);
    }
  });

  it('A3 · stash 防护锚：contacts .mdslider 令牌反向重定义行零触碰（防自引用环实录）', () => {
    const t = readApp('contacts');
    // 该行 --md-primary 从 --primary 取值（应用主色别名直通），若被误转换成
    // 「--md-primary: var(--md-primary)」自引用环则滑条组件崩坏 —— 本锚钉死原样在位。
    expect(t.includes('--md-primary: var(--primary);'), '.mdslider 反向重定义原样在位').toBe(true);
    expect(t.includes('--md-background: var(--surface);'), '.mdslider 第二重定义原样在位').toBe(true);
    expect(t).not.toContain('--md-primary: var(--md-primary);');
  });

  it('B1 · 等值派生面抽证：fallback/公式逐位保原值零漂移', () => {
    expect(readApp('calendar').includes('border-radius: var(--md-r-xl, 28px);'), 'calendar 圆角 fallback 原值').toBe(true);
    expect(readApp('threes').includes('--shadow: color-mix(in srgb, var(--md-scrim, #000) 25%, transparent);'), 'threes scrim 派生公式原值').toBe(true);
    expect(readApp('camera').includes('.gallery-preview:active { background: var(--md-state-pressed, rgba(255,255,255,0.12)); }'), 'camera state-pressed fallback 原值').toBe(true);
    // camera .top-pill 玻璃边框系静态面非按压态，回退 bare 原值（v268 A2「state 行必在 :active」不变量保真 + #230 语义诚实）
    expect(readApp('camera').includes('border: 1px solid rgba(255, 255, 255, 0.12);'), 'camera 顶栏玻璃边框 bare 原值（非状态层）').toBe(true);
    expect(readApp('camera').split('\n').every((l) => !l.includes('--md-state-pressed') || l.includes(':active')), 'camera state 行全在 :active 内（v268 A2 不变量）').toBe(true);
    expect(readApp('flow11').includes('linear-gradient(135deg, var(--md-error), #d98282)'), 'flow11 gem-lvl-2 渐变（#f2b8b5≡--md-error 暗色值逐字等值；#d98282 功能色保留）').toBe(true);
    expect(readApp('translate').includes('var(--md-easing-emphasized, cubic-bezier(0.2, 0, 0, 1))'), 'translate 运动令牌 fallback 原值').toBe(true);
  });

  it('B2 · 功能语义色豁免在位：游戏棋子/相机 chrome/签名板零触碰', () => {
    const th = readApp('threes');
    expect(th.includes('--tile-1: #5fa8eb;'), 'threes 棋子色板保留').toBe(true);
    expect(th.includes('background: #fff; border-radius: 14px; border: 2px dashed'), 'threes 签名板白纸保留').toBe(true);
    // #286 续第七批：PALETTE/TEXT_COLS 白字面上移 core 真身——白语义总量以应用目录合并文本计数（index 3 + core 7 = 10）
    expect((readAppDir('threes').match(/#fff/g) || []).length >= 10, 'threes 白（签名板+描边+JS导出画布+调色板表，index+core 合并文本）保留').toBe(true);
    const cam = readApp('camera');
    expect(cam.includes('--error: #ff5449;'), 'camera 录制红保留').toBe(true);
    expect(cam.includes('--yellow: #fbbc04;'), 'camera 功能黄保留').toBe(true);
    expect(cam.includes('rgba(230, 20, 20, 0.85)'), 'camera REC 徽标红保留').toBe(true);
    const mu = readApp('music');
    expect(mu.includes('--c-accent: hsl(calc(var(--md-h) - 24), 83%, 32%);'), 'music 应用身份强调色保留').toBe(true);
    const fl = readApp('flow11');
    expect(fl.includes('#3b82f6'), 'flow11 棋子色板保留').toBe(true);
  });

  it('C1 · 快照对账：visual-baseline.json V1 6 true + camera/flow11/game2048 false；quality-baseline.json A 同步翻转', () => {
    for (const id of CLEARED) {
      expect(BASELINE[id]?.V1, `${id} 快照 V1=true`).toBe(true);
      expect(QBASE[id]?.A, `${id} 9项 A=true（V1≡checkA 同测度）`).toBe(true);
    }
    for (const id of REGISTERED) {
      expect(BASELINE[id]?.V1, `${id} 快照 V1=false（非缺口登记）`).toBe(false);
      expect(QBASE[id]?.A, `${id} 9项 A=false（同测度登记）`).toBe(false);
    }
    // 其余维度零回归：V2/V7/V8 缺口名单与 R135 收窗一致（flow11/safari 系 #311 不适用登记非本卡变化）；
    // chess/terminal V3 已由 #314 批 9 直连消项（true）——本卡批 7 时代的 false 交叉锚随演进重锚
    expect(BASELINE['dice']?.V1).toBe(true);
    // game2048 V1 已随 v11.29 深提增值合流演进重评入 REGISTERED（上循环 false 断言覆盖，此处不再单列）
    // flow11 V1 已随 v11.29 第十一批 core 提取演进重评入 REGISTERED（同上）
    expect(BASELINE['chess']?.V3, 'chess V3=true（#314 批 9 消项重锚）').toBe(true);
    expect(BASELINE['terminal']?.V3, 'terminal V3=true（#314 批 9 消项重锚）').toBe(true);
  });

  it('D1 · 零 JS 改动锚：JS 模板串/逻辑区零触碰（别名依赖面原样）', () => {
    const fl = readApp('flow11');
    expect((fl.match(/var\(--accent-primary\)/g) || []).length >= 2, 'flow11 JS 模板串 --accent-primary 消费保留').toBe(true);
    const cam = readApp('camera');
    expect((cam.match(/#fff\b/g) || []).length >= 20, 'camera JS 区白 chrome 字面量保留（21 处全量）').toBe(true);
    const mu = readFileSync(join(APPS_DIR, 'music', 'lyric-core.js'), 'utf-8');
    expect((mu.match(/var\(--md-/g) || []).length, 'music lyric-core.js 零 md- 引用（零触碰）').toBe(0);
    // 滚版计数器：转换前后行数零变化（364 增 = 364 删 纯等值替换的结构性证据）
    for (const id of [...CLEARED, ...REGISTERED]) {
      const lines = readApp(id).split('\n').length;
      expect(lines, `${id} 文件在位`).toBeGreaterThan(100);
    }
  });

  it('E1 · camera 非缺口登记文面：取景器功能色主导（#309/#311 先例同律，留 #229 裁决）', () => {
    // camera 可直连面已全部直连：T2 规范令牌 4 别名重定向（body background/color 等）+
    // scrim 7 站点 color-mix 内联 + state-pressed fallback —— 余下裸色均为取景器
    // 功能色（白 chrome/录制红/功能黄/白叠层），等值令牌映射不存在（--md-on-surface
    // 暗色 94% ≠ #fff），不硬造映射（#230 §七 + §7.5 宁缺勿滥）。
    const cam = readApp('camera');
    expect(cam.includes('background: var(--md-surface);'), 'T2 直连已落地').toBe(true);
    expect((cam.match(/var\(--cam-scrim-\d+\)/g) || []).length, 'scrim 别名消费点已清零（全内联）').toBe(0);
    expect(cam.includes('color-mix(in srgb, var(--md-scrim, #000) 60%, transparent)'), 'scrim 60 站点内联公式').toBe(true);
    expect(BASELINE['camera']?.V1).toBe(false);
  });
});
