// ==================== v243 视觉基线 V 清单锚（#243 · v10.64） ====================
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=视觉基线 V1–V8 锁内容；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）——R149 改名机械批注入
// 口径真源：docs/visual-baseline.md；引擎：scripts/audit-app-quality.mjs 并行独立段
// （九项制 ITEM_KEYS/阈值/水位一概不动 —— 本文件同时锚定该契约）。
//
//  A. V1–V8 单元锚（正通道/缺口/剥注释/阈值边界，含 --md-font-num 不误匹配）
//  B. 分档边界：8 达标 / 7 达标 / 6·5·4 偏薄 / 3 严重（fixture 链逐项减一）
//  C. 模板「新建即达标」：双模板 auditVisual 8/8（#243 §③验收口径）
//  D. runQualityAudit 集成：visualTally 一致性 + 报告级零 hardFailures + auditApp.visual 挂载
//  E. 水位：visual-baseline.json 开卡快照逐项键完整 + 当前树零回退 + new-app 指引行在位
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const {
  VISUAL_KEYS,
  VISUAL_LABELS,
  ITEM_KEYS,
  checkV1, checkV2, checkV3, checkV4, checkV5, checkV6, checkV7, checkV8,
  auditVisual,
  auditApp,
  runQualityAudit,
  findVisualRegressions,
} = await import('../scripts/audit-app-quality.mjs');

const ROOT = process.cwd(); // vitest root = 仓库根
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

// —— fixture 链（每级恰好少一项；var(--md- 命中 20 处，任何一级都保住 V1 的 ≥15 且 ≥4/100 行）——
const LINES = [
  ':root { --a: 1; }',
  'body { background: var(--md-surface); color: var(--md-on-surface); font-family: var(--md-font, x); }',
  '.c1 { border-radius: var(--md-r-lg); background: var(--md-surface-container); }',
  '.c2 { border-radius: var(--md-r-md); color: var(--md-on-surface-variant); }',
  '.c3 { background: var(--md-state-hover); border-color: var(--md-outline-variant); }',
  '.c4 { color: var(--md-primary); background: var(--md-primary-container); }',
  '.c5 { color: var(--md-on-primary); border: 1px solid var(--md-outline); }',
  '.c6 { background: var(--md-surface-container-high); color: var(--md-on-primary-container); }',
  '.c7 { color: var(--md-inverse-surface); }',
  '.c8 { background: var(--md-surface-dim); }',
  '.c9 { color: var(--md-inverse-on-surface); }',
  '.btn:active { background: var(--md-state-pressed); }',
  '@keyframes k { from { opacity: 0; } }',
  '.app { animation: k 1s; }',
  '.empty { content: "暂无内容"; }',
  '@media (max-width: 600px) { .c1 { display: none; } }',
];
const join = (arr) => arr.join('\n');
const FULL = join(LINES);                                    // 8/8
const S7 = join(LINES.map((l) => l.replace('暂无内容', '内容')));        // −V7
const S6 = join(S7.split('\n').filter((l) => !l.startsWith('@keyframes') && l !== '.app { animation: k 1s; }')); // −V6
const S5 = S6.replace('.btn:active', '.btn-idle');           // −V5（state-pressed 仍在，V4 不掉）
const S4 = S5.replace('@media (max-width: 600px) { .c1 { display: none; } }', ''); // −V8（无 max-width，B 也不过）
const S3 = S4
  .replace('.c3 { background: var(--md-state-hover); border-color: var(--md-outline-variant); }', '')
  .replace('.btn-idle { background: var(--md-state-pressed); }', '.btn-idle { background: var(--md-primary-fixed-dim); }'); // −V4

describe('v243 A · V 清单单元锚（#243 §①口径）', () => {
  it('V1 继承 A 口径：8/8 基准过，token 缺密度不过', () => {
    expect(checkV1(FULL).pass).toBe(true);
    expect(checkV1('.a { color: var(--md-x); }').pass).toBe(false);
  });

  it('V2 字体契约：消费过 / 注释提及不过 / --md-font-num 不误匹配', () => {
    expect(checkV2('body { font-family: var(--md-font, x); }').pass).toBe(true);
    expect(checkV2('body { font-variant-numeric: var(--md-text-font, x); }').pass).toBe(true);
    expect(checkV2('/* font-family: var(--md-font, x) */').pass).toBe(false); // 注释提及不算
    expect(checkV2('x { font: var(--md-font-num, 1); }').pass).toBe(false);    // 前缀不误匹配
  });

  it('V3 形状令牌阈值：≥2 过 / 1 不过 / 注释提及不算', () => {
    expect(checkV3('.a { border-radius: var(--md-r-lg); } .b { border-radius: var(--md-r-md); }').pass).toBe(true);
    expect(checkV3('.a { border-radius: var(--md-r-lg); }').pass).toBe(false);
    expect(checkV3('/* border-radius: var(--md-r-lg) var(--md-r-md) */').pass).toBe(false);
  });

  it('V4 状态层：≥1 过 / 0 不过', () => {
    expect(checkV4('.a:hover { background: var(--md-state-hover); }').pass).toBe(true);
    expect(checkV4('.a { color: red; }').pass).toBe(false);
  });

  it('V5 按压反馈多通道：:active / .pressed / pressRipple / squeeze-row / *-ripple', () => {
    expect(checkV5('.btn:active { transform: scale(.96); }').pass).toBe(true);
    expect(checkV5('.b.pressed { x: 1; }').pass).toBe(true);
    expect(checkV5('pressRipple(el)').pass).toBe(true);
    expect(checkV5('<div class="squeeze-row"></div>').pass).toBe(true);
    expect(checkV5('<span class="md-ripple"></span>').pass).toBe(true);
    expect(checkV5('/* .btn:active */').pass).toBe(false); // 注释不算
    expect(checkV5('.btn { background: red; }').pass).toBe(false);
  });

  it('V6 开屏动效双要件：定义+应用同在才过，注释内不算', () => {
    expect(checkV6('@keyframes k {} .a { animation: k 1s; }').pass).toBe(true);
    expect(checkV6('@keyframes k {}').pass).toBe(false);          // 只定义未应用
    expect(checkV6('.a { animation: k 1s; }').pass).toBe(false);  // 只应用（k 未定义）
    expect(checkV6('/* @keyframes k */ .a { animation: k 1s; }').pass).toBe(false);
  });

  it('V7 空状态：文案/类命中，注释提及不算', () => {
    expect(checkV7('<div class="empty-state">暂无内容</div>').pass).toBe(true);
    expect(checkV7('el.textContent = "数据为空"').pass).toBe(true);
    expect(checkV7('<!-- 空状态示范 -->').pass).toBe(false);
    expect(checkV7('<div>一切正常</div>').pass).toBe(false);
  });

  it('V8 深窄屏：表面令牌 +（max-width 或 B 真分栏）双通道', () => {
    expect(checkV8('body { background: var(--md-surface); } @media (max-width: 500px) { .a { display: none; } }').pass).toBe(true);
    // B 通道：min-width:760 内有实质布局差异（无 max-width 媒体也过）
    const b = 'body { background: var(--md-surface); } @media (min-width: 760px) { main { display: grid; grid-template-columns: 1fr 1fr; } }';
    expect(checkV8(b).pass).toBe(true);
    expect(checkV8('body { background: var(--md-surface); }').pass).toBe(false);           // 无窄屏路径
    expect(checkV8('@media (max-width: 500px) { .a { display: none; } }').pass).toBe(false); // 无表面令牌
  });
});

describe('v243 B · 分档边界（fixture 链逐项减一）', () => {
  it('FULL=8 达标；S7=7 达标；S6=6 / S5=5 / S4=4 偏薄；S3=3 严重', () => {
    expect(auditVisual('f8', FULL).score).toBe(8);
    expect(auditVisual('f8', FULL).tier).toBe('达标');
    expect(auditVisual('f7', S7).score).toBe(7);
    expect(auditVisual('f7', S7).tier).toBe('达标');
    expect(auditVisual('f6', S6).score).toBe(6);
    expect(auditVisual('f6', S6).tier).toBe('偏薄');
    expect(auditVisual('f5', S5).score).toBe(5);
    expect(auditVisual('f5', S5).tier).toBe('偏薄');
    expect(auditVisual('f4', S4).score).toBe(4);
    expect(auditVisual('f4', S4).tier).toBe('偏薄');
    expect(auditVisual('f3', S3).score).toBe(3);
    expect(auditVisual('f3', S3).tier).toBe('严重');
  });
  it('fixture 链每一级 V1 都保持通过（≥15 且 ≥4/100 行）', () => {
    for (const t of [FULL, S7, S6, S5, S4, S3]) expect(checkV1(t).pass).toBe(true);
  });
  it('VISUAL_KEYS=8 且与 VISUAL_LABELS 对齐；九项制 ITEM_KEYS=9 契约不动（#230/#244）', () => {
    expect(VISUAL_KEYS).toEqual(['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8']);
    expect(Object.keys(VISUAL_LABELS)).toEqual(VISUAL_KEYS);
    expect(ITEM_KEYS).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
  });
});

describe('v243 C · 模板「新建即达标」（#243 §③验收口径）', () => {
  it('多文件模板三件套合并 8/8 达标', () => {
    const text = ['index.html', 'style.css', 'app.mjs']
      .map((f) => read(`scripts/app-template-multi/${f}`)).join('\n');
    const r = auditVisual('app-template-multi', text);
    expect(r.score).toBe(8);
    expect(r.tier).toBe('达标');
  });
  it('单文件模板 8/8 达标', () => {
    const r = auditVisual('app-template', read('scripts/app-template.html'));
    expect(r.score).toBe(8);
    expect(r.tier).toBe('达标');
  });
  it('new-app.mjs 生成指引含 V 清单口径入口（docs/visual-baseline.md）', () => {
    expect(read('scripts/new-app.mjs')).toContain('docs/visual-baseline.md');
  });
});

describe('v243 D · runQualityAudit 集成（报告级非硬门禁）', () => {
  it('全量扫描：visualTally 三档合计=应用数；逐应用 visual.items 八键齐；零 hardFailures', async () => {
    const res = await runQualityAudit(ROOT, { log: () => {} });
    const sum = res.visualTally['达标'] + res.visualTally['偏薄'] + res.visualTally['严重'];
    expect(sum).toBe(res.checked);
    for (const r of res.results) {
      expect(Object.keys(r.visual.items)).toEqual(VISUAL_KEYS);
      expect(r.visual.score).toBe(VISUAL_KEYS.length - r.visual.failed.length);
    }
    expect(res.hardFailures).toEqual([]);
  });
  it('auditApp 挂载 visual 并行段且九项制结果不受影响（A 项正/负样本）', () => {
    const ok = auditApp('x', [{ rel: 'a.css', text: FULL }], 'apps/x/ 引用');
    expect(ok.visual.score).toBe(8);
    expect(ok.items.A.pass).toBe(true);
    const bad = auditApp('y', [{ rel: 'a.css', text: 'p { color: red; }' }], '');
    expect(bad.visual.score).toBe(0);
    expect(bad.items.A.pass).toBe(false);
  });
});

describe('v243 E · 水位（开卡快照 + 回退比对 + 指引）', () => {
  it('scripts/visual-baseline.json 开卡快照：逐项 V1–V8 键完整（应用+模板）', async () => {
    const vb = JSON.parse(read('scripts/visual-baseline.json'));
    const keys = Object.keys(vb);
    expect(keys.length).toBeGreaterThanOrEqual(43); // 41 应用 + 2 模板（新应用落盘后 --write-visual-baseline 增量）
    for (const id of ['archive', 'app-template-multi', 'app-template']) {
      expect(Object.keys(vb[id])).toEqual(VISUAL_KEYS);
    }
    // 当前树零回退：快照与实跑一致
    const res = await runQualityAudit(ROOT, { log: () => {} });
    expect(findVisualRegressions([...res.results, ...res.templates], vb)).toEqual([]);
  });
});
