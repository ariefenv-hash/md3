// ==================== v269 测试 — #307 [V 清单存量补课·批 3] V3 圆角形状 19 家等值派生（R132 窗 Job 2933040） ====================
//
// 背景：#306 批 2（v10.85=a7e28ad）交付后快照 V3=false 余 20 家；chess 让位 #241
// （job2931605-R123-G 租约 lane=keyboard-a11y+shell-focus+chess-grid，勿撞）→ 本卡 19 家。
//
// 施工形态（#262 批 1 photos 等值派生先例同款，零视觉漂移）：
//   形态 A（14 家）：CSS 区 border-radius 标准档位单值 8/12/16/20/28px → var(--md-r-xs/sm/md/lg/xl, 原值)
//   形态 B（5 家 calculator/calendar/phone/stocks/translate/weather）：:root 本地形状令牌定义行
//   （--radius-*/--shape-*/--md-sys-shape-corner-* 等）重定向 var(--md-r-*, 原值)——消费面全文件吃到，
//   fallback 原值 = 令牌缺位时逐位保原视觉
//   full/pill（999px/9999px/50%）与 4px 以下微值语义不动；多值/calc/既有 var 零触碰
//
// 关联：#307（本卡）/ #306（批 2）/ #262（批 1 先例）/ #243（V 清单基建）/ #241（chess 让位）/
//       #230（九项制零变化）/ #18 §5/§9/§7.5/§7.6/§7.7

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditVisual } from '../scripts/audit-app-quality.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPS = [
  'books', 'calculator', 'calendar', 'camera', 'contacts', 'dice', 'flow11',
  'game2048', 'messages', 'music', 'notes', 'phone', 'reminders', 'safari',
  'shortcuts', 'stocks', 'threes', 'translate', 'weather',
];
const readApp = (id) =>
  readFileSync(join(__dirname, '..', 'ios-desktop', 'apps', id, 'index.html'), 'utf-8');

describe('v269 · #307 V3 圆角形状 19 家（批 3）', () => {
  it('A1 · 端到端：19 家逐家 auditVisual V3 pass（形状令牌 ≥2）', () => {
    for (const id of APPS) {
      const v = auditVisual(id, readApp(id));
      expect(v.items.V3.pass, `${id} V3 应 pass`).toBe(true);
      expect(v.items.V3.detail).toMatch(/形状令牌×(\d{2,}|[2-9])（需 ≥2）/);
    }
  });

  it('A2 · 等值派生形态：--md-r- 全形态引用 ≥2，本卡派生家带 fallback ≥1', () => {
    // music/reminders/shortcuts 三家为树上原有 --md-r- 引用（非本卡派生，full 无 fallback 形态）豁免 fallback 断言
    const PREEXISTING = new Set(['music', 'reminders', 'shortcuts']);
    for (const id of APPS) {
      const text = readApp(id);
      const all = (text.match(/var\(--md-r-/g) || []).length;
      expect(all, `${id} md-r 全形态引用数`).toBeGreaterThanOrEqual(2);
      if (PREEXISTING.has(id)) continue;
      const withFb = (text.match(/var\(--md-r-(xs|sm|md|lg|xl), [^)]+\)/g) || []).length;
      expect(withFb, `${id} 带 fallback 形态引用数`).toBeGreaterThanOrEqual(1);
    }
  });

  it('B1 · 零视觉漂移：fallback 值与派生前原值一致（抽证 8 家代表行原文）', () => {
    const guards = [
      ['calculator', 'border-radius: var(--md-r-md, 14px);'],
      ['calendar', '--radius: var(--md-r-xl, 28px); --radius-sm: var(--md-r-sm, 12px);'],
      ['phone', '--md-sys-shape-corner-extra-large: var(--md-r-xl, 28px);'],
      ['stocks', '--md-shape-corner-medium: var(--md-r-md, 16px);'],
      ['translate', '--shape-md: var(--md-r-sm, 12px);'],
      ['weather', '--md-shape-corner-medium: var(--md-r-lg, 18px);'],
      ['game2048', 'var(--md-r-md, 16px)'],
      ['dice', 'var(--md-r-md, 16px)'],
    ];
    for (const [id, frag] of guards) {
      expect(readApp(id).includes(frag), `${id} 等值派生锚: ${frag}`).toBe(true);
    }
  });

  it('B2 · pill/full 与微值语义不动：50%/9999px/999px/4px 派生面零触碰', () => {
    for (const id of ['phone', 'stocks', 'weather', 'calendar']) {
      const text = readApp(id);
      expect(text.match(/9999?px/g)?.length ?? 0, `${id} pill 值应保留`).toBeGreaterThan(0);
    }
    expect(readApp('translate').includes('--shape-xs: 4px;')).toBe(true);
    expect(readApp('phone').includes('border-radius: 50%')).toBe(true);
  });

  it('C1 · 车道边界：chess 零触碰（#241 租约车道让位）+ 快照 V3 19→0（chess 维持 false）', () => {
    const snap = JSON.parse(
      readFileSync(join(__dirname, '..', 'scripts', 'visual-baseline.json'), 'utf-8')
    );
    for (const id of APPS) {
      expect(snap[id].V3, `${id} 快照 V3 应 true`).toBe(true);
    }
    expect(snap.chess.V3, 'chess 维持 false（#241 车道，不在本卡）').toBe(false);
  });

  it('D1 · 零 JS 改动：19 家 <script> 区不含 --md-r- 引用（纯 CSS 挂载）', () => {
    for (const id of APPS) {
      const text = readApp(id);
      const scripts = [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      for (const s of scripts) {
        expect(s.includes('--md-r-'), `${id} script 区应零 md-r 引用`).toBe(false);
      }
    }
  });
});
