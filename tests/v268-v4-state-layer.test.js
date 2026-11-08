// ==================== v268 测试 — #306 [V 清单存量补课·批 2] V4 状态层全清 21 家（R132 窗 Job 2933040） ====================
//
// 背景：#262 批 1 photos（v10.68=7c21c59）交付后快照 V4=false 余 21 家（开卡口径 24 家，
// 批 1 photos + #261 批 4 piano/reaction 消化后余量）。本卡按 R132 续点候选 1（2933040 车道）
// 「立卡即实施」先例（#256/#262 同律）一次全清 21 家。
//
// 施工形态（批 1 photos 先例同款，零覆盖纯新增）：
//   每家 1~3 个主要交互面 :active 态挂 var(--md-state-pressed, rgba(255,255,255,0.12))
//   （宿主未定义该令牌靠 fallback 渲染 = 0.12 白叠层；悬停/静态视觉零变化）
//   只挂「原 :active 块无 background 或无 :active 块」的面 → 不覆盖任何既有按压视觉
//   规则块插最后 </style> 前（源顺序最后 = 同特异性胜出，级联合并共存）
//
// 关联：#306（本卡）/ #262（批 1 先例）/ #243（V 清单基建）/ #256（立卡即实施先例）/
//       #230（九项制零变化，V 段并行独立）/ #18 §5/§9/§7.5/§7.6/§7.7

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditVisual } from '../scripts/audit-app-quality.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPS = [
  'books', 'calculator', 'calendar', 'camera', 'clock-app', 'contacts', 'dice',
  'flow11', 'game2048', 'messages', 'music', 'notes', 'phone', 'reminders',
  'safari', 'shortcuts', 'stocks', 'threes', 'translate', 'weather', 'word',
];
const readApp = (id) =>
  readFileSync(join(__dirname, '..', 'ios-desktop', 'apps', id, 'index.html'), 'utf-8');

describe('v268 · #306 V4 状态层全清 21 家（批 2）', () => {
  it('A1 · 端到端：21 家逐家 auditVisual V4 pass（批 2 前 21 家全缺）', () => {
    for (const id of APPS) {
      const v = auditVisual(id, readApp(id));
      expect(v.items.V4.pass, `${id} V4 应 pass`).toBe(true);
      expect(v.items.V4.detail).toMatch(/状态层令牌×[1-9]/);
    }
  });

  it('A2 · 挂载形态：每家 ≥1 处 :active 块内 var(--md-state-pressed 引用（带 fallback）', () => {
    for (const id of APPS) {
      const text = readApp(id);
      const refs = (text.match(/var\(--md-state-pressed, rgba\(255,255,255,0\.12\)\)/g) || []).length;
      expect(refs, `${id} state-pressed 引用数`).toBeGreaterThanOrEqual(1);
      const activeLines = text.split('\n').filter((l) => l.includes('--md-state-pressed'));
      for (const l of activeLines) {
        expect(l, `${id} 状态层行应在 :active 规则内`).toMatch(/:active/);
      }
    }
  });

  it('B1 · 零覆盖：21 家既有按压视觉不被改写（原 :active 背景规则保留原文）', () => {
    // 车道纪律：只挂「原 :active 无 background」的面——本锚验证 7 家已知有按压背景的
    // 既有规则原文未动（防覆盖回归）
    const guards = [
      ['camera', 'background: rgba(255, 255, 255, 0.2)'],
      ['phone', 'background: rgba(0,0,0,0.04)'],
      ['safari', 'background: var(--surface-container-highest)'],
      ['translate', 'color-mix(in srgb, var(--md-primary) 12%, transparent)'],
      ['shortcuts', 'background:var(--sv)'],
      ['stocks', 'background: var(--md-sys-color-primary-container)'],
      ['weather', 'background: var(--md-sys-color-surface-container-highest)'],
    ];
    for (const [id, frag] of guards) {
      expect(readApp(id).includes(frag), `${id} 既有按压背景应保留原文: ${frag}`).toBe(true);
    }
  });

  it('B2 · 零 JS 改动：21 家 <script> 区不含 state-pressed 引用（纯 CSS 挂载）', () => {
    for (const id of APPS) {
      const text = readApp(id);
      const scripts = [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      for (const s of scripts) {
        expect(s.includes('--md-state-pressed'), `${id} script 区应零 state 引用`).toBe(false);
      }
    }
  });

  it('C1 · 快照水位：43 家 V4 全 true（21 false → 0）', () => {
    const snap = JSON.parse(
      readFileSync(join(__dirname, '..', 'scripts', 'visual-baseline.json'), 'utf-8')
    );
    expect(Object.keys(snap).length).toBe(43);
    const missing = Object.entries(snap).filter(([, v]) => !v.V4).map(([k]) => k);
    expect(missing, `V4 仍缺: ${missing.join(',')}`).toEqual([]);
  });

  it('C2 · 快照水位：批 2 后严重档 0 家（达标+偏薄 = 43）', () => {
    const snap = JSON.parse(
      readFileSync(join(__dirname, '..', 'scripts', 'visual-baseline.json'), 'utf-8')
    );
    let standard = 0, thin = 0, severe = 0;
    for (const v of Object.values(snap)) {
      const score = Object.values(v).filter(Boolean).length;
      if (score >= 7) standard++; else if (score >= 4) thin++; else severe++;
    }
    expect(severe, '严重档应清零').toBe(0);
    expect(standard + thin).toBe(43);
  });

  it('D1 · 纪律负向锚：挂载注释锚不带版本号（roll-version 不滚 / check:comments 不涉）', () => {
    const mark = '/* V4 状态层（#306 批 2）：按压态令牌（#262 批 1 photos 先例同款），悬停/静态零变化 */';
    for (const id of APPS) {
      expect(readApp(id).includes(mark), `${id} 应含挂载注释锚`).toBe(true);
    }
    expect(mark).not.toMatch(/v10\.\d+/);
  });
});
