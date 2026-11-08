// ==================== v230 测试 — 评分卡第 I 项「视觉令牌接入」断言（v10.84 #244 建议③ R124 窗） ====================
//
// #244 建议③（「把令牌接入做成 #230 评分卡的一项断言，分档非硬阻断」）随 #230 车道落地：
//   audit-app-quality.mjs 8 项 → 9 项评分制，增 checkI：
//     I = 状态层 var(--md-state- ≥ 1，或（形状 var(--md-r- ≥ 2 且 字体契约 var(--md-font/--md-text-font ≥ 1）
//   与 docs/visual-token-adoption.md 五面口径同源（D 状态层 / C 形状 / B 字体契约）。
//
// 断言面：
//  A. checkI 单元锚（正通道/替代通道/缺口三态 + --md-font-num 不误匹配）
//  B. 9 项制锚（ITEM_KEYS 含 I + score = 9 - failed + v10.84 三 P0 应用过 I）
//  C. 分档输出锚（缺 I 行含「令牌面缺口」detail，构建期持续曝光 #230 §一）
//  D. baseline 固化锚（I 键在册，回退门禁以固化水位为准，防「曾达标→掉线」）
//  E. 阶段语义锚（I 不设独立硬门禁 —— phase 1 下 I 缺口不产生 hardFailures，#244 边界）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const AUDIT = read('scripts/audit-app-quality.mjs');
const BASELINE = JSON.parse(read('scripts/quality-baseline.json'));
const { checkI, ITEM_KEYS, auditApp } = await import('../scripts/audit-app-quality.mjs');

// ---------- A. checkI 单元锚 ----------
describe('v230 A · checkI 单元（#244 建议③口径）', () => {
  it('正通道：状态层单面即过', () => {
    expect(checkI('.a:hover { background: var(--md-state-hover); }').pass).toBe(true);
  });
  it('替代通道：形状×2 + 字体双面过', () => {
    const t = '.c { border-radius: var(--md-r-md); } .d { border-radius: var(--md-r-sm); font-family: var(--md-font, x); }';
    expect(checkI(t).pass).toBe(true);
  });
  it('缺口态：零状态层且形状/字体不同时达标不过（detail 曝光缺口）', () => {
    const r = checkI('.c { border-radius: var(--md-r-md); }');
    expect(r.pass).toBe(false);
    expect(r.detail).toContain('令牌面缺口');
  });
  it('负向：--md-font-num 不误判为字体契约（[,)] 精确边界）', () => {
    const t = '.n { font-variant-numeric: tabular-nums; font-family: var(--md-font-num, x); }';
    expect(checkI(t).pass).toBe(false);
  });
});

// ---------- B. 9 项制锚 ----------
describe('v230 B · 9 项评分制（A~I）', () => {
  it('ITEM_KEYS 含 I 且恰 9 项', () => {
    expect(ITEM_KEYS).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
  });
  it('auditApp score = 9 - failed', () => {
    const r = auditApp('x', [{ rel: 't', text: 'div {}' }], '', { exemptH: true });
    expect(r.items.I.pass).toBe(false);
    expect(r.score).toBe(9 - r.failed.length);
    expect(r.failed).toContain('I');
  });
  it('v10.84 三 P0 应用过 I（状态层破零红利）+ music 形状+字体通道过 I', () => {
    for (const id of ['terminal', 'driving', 'code-editor', 'music']) {
      const dir = join(ROOT, 'ios-desktop/apps', id);
      const text = readFileSync(dir + '/index.html', 'utf-8');
      expect(checkI(text).pass, id).toBe(true);
      expect(BASELINE[id]?.I, id + ' baseline I').toBe(true);
    }
  });
  it('两脚手架模板过 I（生成应用天然达标，#246 联动）', () => {
    expect(BASELINE['app-template']?.I).toBe(true);
    expect(BASELINE['app-template-multi']?.I).toBe(true);
  });
});

// ---------- C. 分档输出锚 ----------
describe('v230 C · 构建期输出（#230 §一防摸底过期）', () => {
  it('输出行含 /9 计分与缺口曝光', () => {
    expect(AUDIT).toMatch(/\$\{r\.score\}\/9\).*缺 \$\{r\.failed\.join/);
    expect(AUDIT).toMatch(/9 项评分制/);
    expect(AUDIT).toMatch(/#244 建议③/);
  });
});

// ---------- D. baseline 固化锚 ----------
describe('v230 D · 基线固化（回退门禁水位）', () => {
  it('baseline 全部 41 应用 + 2 模板均含 I 键', () => {
    const keys = Object.keys(BASELINE);
    expect(keys.length).toBe(43);
    for (const k of keys) expect(BASELINE[k]).toHaveProperty('I');
  });
});

// ---------- E. 阶段语义锚（#244 边界：非硬阻断） ----------
describe('v230 E · I 不设独立硬门禁', () => {
  it('hardFailures 仅 D 门禁与基线回退与分期三源，无 I 独立源', () => {
    expect(AUDIT).toMatch(/hardFailures\.push\(`\[app-quality\]\[D 门禁\]/);
    expect(AUDIT).toMatch(/hardFailures\.push\(`\[app-quality\]\[基线回退\]/);
    expect(AUDIT).not.toMatch(/hardFailures\.push\(`\[app-quality\]\[I/); // I 无独立硬 fail 源
  });
});
