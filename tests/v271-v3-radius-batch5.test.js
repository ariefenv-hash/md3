// ==================== v271 测试 — #309 [V 清单存量补课·批 5] V3 圆角 piano/reaction 2 家等值派生（R133 窗 §7.5 填槽 Job 2933040） ====================
//
// 背景：#308 批 4（v10.85=58c6651）交付后快照 V3=false 余 4 家；chess 让位 #241 租约
// （lane=keyboard-a11y+shell-focus+chess-grid 勿撞）→ 本卡 piano/reaction 2 家全清
// + terminal 如实登记（全文件仅 2 处 border-radius：3px 微值语义不动 + var(--md-r-sm) 单引用
// 无 fallback——无第二等值派生面，补 fallback 后引用数仍 1<2，等值派生修法不适用；
// 不硬造圆角零视觉漂移纪律，留 #229 车道未来视觉改版时机裁决，V3 维持 false 属非缺口登记）。
//
// 施工形态（#307 批 3 等值派生先例同款，fallback 逐位保原视觉零漂移）：
//   piano：8px→var(--md-r-xs, 8px)、12px→var(--md-r-sm, 12px)
//   reaction：14px×2→var(--md-r-md, 14px)（calculator 14px 派生先例同款）、18px→var(--md-r-lg, 18px)
//   多值（0 0 7px 7px / 0 0 5px 5px / 3px 3px 0 0）与 full（999px/50%）语义不动
//
// 关联：#309（本卡）/ #308（批 4）/ #307（批 3 先例）/ #306（批 2）/ #262（批 1 photos 先例）/
//       #243（V 清单基建）/ #229（存量补课车道）/ #241（chess 让位）/ #18 §5/§9/§7.5/§7.6/§7.7

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditVisual } from '../scripts/audit-app-quality.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readApp = (id) =>
  readFileSync(join(__dirname, '..', 'ios-desktop', 'apps', id, 'index.html'), 'utf-8');

describe('v271 · #309 V3 圆角 piano/reaction（批 5）+ terminal 登记', () => {
  it('A1 · 端到端：piano/reaction 逐家 auditVisual V3 pass（md-r 引用 ≥2）', () => {
    for (const id of ['piano', 'reaction']) {
      const v = auditVisual(id, readApp(id));
      expect(v.items.V3.pass, `${id} V3 应 pass`).toBe(true);
      expect(v.items.V3.detail).toMatch(/形状令牌×([2-9]|1[0-9])（需 ≥2）/);
    }
  });

  it('B1 · 等值派生面原文抽证（5 处 fallback 逐位保原值）', () => {
    const guards = [
      ['piano', 'border-radius: var(--md-r-xs, 8px);'],
      ['piano', 'border-radius: var(--md-r-sm, 12px);'],
      ['reaction', 'border-radius: var(--md-r-md, 14px);'],
      ['reaction', 'border-radius: var(--md-r-lg, 18px);'],
      ['piano', 'border-radius: var(--md-r-xs, 8px); border: 1px solid var(--md-outline-variant, transparent);'],
    ];
    for (const [id, frag] of guards) {
      expect(readApp(id).includes(frag), `${id} 等值派生锚: ${frag.slice(0, 44)}…`).toBe(true);
    }
  });

  it('B2 · 语义不动面：多值/full 原文在位零触碰', () => {
    const piano = readApp('piano');
    expect(piano.includes('border-radius: 0 0 7px 7px;'), 'piano 多值 7px 在位').toBe(true);
    expect(piano.includes('border-radius: 0 0 5px 5px;'), 'piano 多值 5px 在位').toBe(true);
    expect((piano.match(/border-radius: 999px/g) || []).length, 'piano full 999px ×2 在位').toBe(2);
    const rx = readApp('reaction');
    expect(rx.includes('border-radius: 3px 3px 0 0;'), 'reaction 多值 3px 在位').toBe(true);
    expect(rx.includes('border-radius: 50%;'), 'reaction full 50% 在位').toBe(true);
    expect((rx.match(/border-radius: 999px/g) || []).length, 'reaction full 999px 在位').toBe(2);
  });

  it('C1 · terminal 不适用登记文面：微值 3px + 单引用形态原样在位（不硬造）', () => {
    const t = readApp('terminal');
    expect(t.includes('border-radius: 3px;'), 'terminal 微值 3px 原样在位').toBe(true);
    expect(t.includes('border-radius: var(--md-r-sm);'), 'terminal 既有单引用原样在位').toBe(true);
    const bare = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
    expect((bare.match(/var\(--md-r-/g) || []).length, 'terminal 引用数仍 1（未硬造第二处）').toBe(1);
  });

  it('C2 · 快照对账：piano/reaction V3=true；terminal/chess V3=false 维持（登记+租约车道）', () => {
    const snap = JSON.parse(readFileSync(join(__dirname, '..', 'scripts', 'visual-baseline.json'), 'utf-8'));
    const apps = snap.apps ?? snap;
    const entries = typeof apps === 'object' && !Array.isArray(apps)
      ? Object.entries(apps)
      : apps.map((a) => [a.app, a]);
    const getV3 = (id) => {
      const hit = entries.find(([name]) => name === id);
      expect(hit, `快照含 ${id}`).toBeTruthy();
      return (hit[1].visual ?? hit[1]).V3;
    };
    expect(getV3('piano'), 'piano 快照 V3 true').toBe(true);
    expect(getV3('reaction'), 'reaction 快照 V3 true').toBe(true);
    expect(getV3('terminal'), 'terminal 快照 V3 false（不适用登记）').toBe(false);
    expect(getV3('chess'), 'chess 快照 V3 false（#241 车道）').toBe(false);
  });
});
