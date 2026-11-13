// ==================== v311 测试 — #311 [V 清单存量补课·批 6] V7 空状态 10 家（R135 窗 主任务 Job 2933040 第 2 定时消息系列） ====================
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=V7 空状态 10 家（#311 批 6）的整改时点；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）—— 2026-11-13 补标记批（承 #291 补关评论登记的 10 例新违规，非 R149 原注入批）
//
// 背景：R134 续点候选首位（docs/worklog.md 末行 + docs/HANDOFF.md next_candidates）：
// 「V7 空态批 4（2933040 车道同域顺延——stt『尚未识别到内容』词表勘定在案；camera empty-icon 雏形同类」。
// 开窗快照 V7=false 共 20 家，逐家源码实证后分档：Tier A 类锚 8 家 + Tier B 真实空态 2 家
// + 不适用如实登记 9 家（#309 terminal 先例同律，非缺口登记留 #229 裁决）+ chess 让位 #241 租约。
//
// 施工形态（books 先例「既有体系零动效改动仅类锚统一」+ #307 批 3 等值派生先例同款）：
//   Tier A（既有空态 UI 仅缺 empty-state 类锚，零 CSS 零 JS 语义改动零视觉漂移）：
//     stt（静态+动态×2）/ camera（galleryEmptyIcon）/ ping / driving / midi-player
//     / radio（静态+动态×2）/ stocks（搜索无匹配分支）/ weather（renderSearchResults 无结果分支）
//   Tier B（模板 .empty-state 同构 role="status"+es-icon+es-main+es-sub，--md 令牌面零新色）：
//     dice（#history-list-container 空容器缺口）/ calculator（renderHistory 空列表缺口）
//
// 关联：#311（本卡）/ #309（批 5）/ #308（批 4）/ #307（批 3 先例）/ #306（批 2）/ #262（批 1 先例）/
//       #243（V 清单基建）/ #229（存量补课车道）/ #241（chess 让位）/ #18 §5/§9/§7.5/§7.6/§7.7

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditVisual } from '../scripts/audit-app-quality.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readApp = (id) =>
  readFileSync(join(__dirname, '..', 'ios-desktop', 'apps', id, 'index.html'), 'utf-8');

const TIER_A = ['stt', 'camera', 'ping', 'driving', 'midi-player', 'radio', 'stocks', 'weather'];
const TIER_B = ['dice', 'calculator'];
const NA = ['flow11', 'game2048', 'phone', 'piano', 'safari', 'shortcuts', 'terminal', 'typing', 'word'];

describe('v311 · #311 V7 空状态 批 6（Tier A 类锚 8 + Tier B 真实空态 2 + 登记 9）', () => {
  it('A1 · 端到端：Tier A 8 家逐家 auditVisual V7 pass（类锚补齐后命中词表）', () => {
    for (const id of TIER_A) {
      const v = auditVisual(id, readApp(id));
      expect(v.items.V7.pass, `${id} V7 应 pass（既有空态 UI + empty-state 类锚）`).toBe(true);
    }
  });

  it('A2 · 端到端：Tier B 2 家逐家 auditVisual V7 pass（真实空态块）', () => {
    for (const id of TIER_B) {
      const v = auditVisual(id, readApp(id));
      expect(v.items.V7.pass, `${id} V7 应 pass（.empty-state 空态块）`).toBe(true);
    }
  });

  it('B1 · Tier A 类锚原文抽证（10 处锚点逐位在位，零 CSS/JS 语义改动）', () => {
    const guards = [
      ['stt', 'class="st-empty empty-state" id="stEmpty"'],
      ['stt', "empty.className = 'st-empty empty-state';"],
      ['camera', 'class="material-symbols-rounded empty-icon empty-state" id="galleryEmptyIcon"'],
      ['ping', 'class="pg-empty empty-state"'],
      ['driving', 'class="dv-empty empty-state" id="dvEmpty"'],
      ['midi-player', 'class="mp-empty empty-state" id="mpEmpty"'],
      ['radio', 'class="rd-empty empty-state" id="rdEmpty"'],
      ['radio', "empty.className = 'rd-empty empty-state';"],
      ['stocks', 'class="p-8 text-center text-sm empty-state"'],
      ['weather', 'class="p-4 text-center text-xs text-gray-400 empty-state"'],
    ];
    for (const [id, frag] of guards) {
      expect(readApp(id).includes(frag), `${id} 类锚: ${frag.slice(0, 44)}…`).toBe(true);
    }
  });

  it('B2 · Tier B 空态块原文抽证：模板同构（role=status + es-icon + es-main + es-sub）', () => {
    const dice = readApp('dice');
    expect(dice.includes('class="empty-state" role="status"'), 'dice role=status 在位').toBe(true);
    expect(dice.includes('暂无投掷记录'), 'dice es-main 文案在位').toBe(true);
    expect(dice.includes('掷出第一把骰子，历史将在这里留存'), 'dice es-sub 引导文案在位').toBe(true);
    expect(dice.includes('s.history.length'), 'dice 空态分支条件在位（原 map 渲染保留）').toBe(true);
    expect(dice.includes('.empty-state .es-main'), 'dice 空态样式在位').toBe(true);
    expect(dice.includes('color: var(--text-dim)'), 'dice 空态色走既有别名（=--md-on-surface-variant）').toBe(true);

    const calc = readApp('calculator');
    expect(calc.includes('class="es-icon material-symbols-outlined" aria-hidden="true">history</span>'), 'calc es-icon 在位').toBe(true);
    expect(calc.includes('暂无计算记录'), 'calc es-main 文案在位').toBe(true);
    expect(calc.includes('算式与结果会出现在这里'), 'calc es-sub 引导文案在位').toBe(true);
    expect(calc.includes('state.history.length ? state.history.map'), 'calc 空态分支条件在位').toBe(true);
    expect(calc.includes('.empty-state .es-main { font-size: 0.9rem; font-weight: 600; color: var(--md-secondary); }'), 'calc 空态色走 --md-secondary 令牌面').toBe(true);
  });

  it('C1 · 不适用登记 9 家：源码零硬造（无 empty-state 痕迹）+ 既有空态面原样在位', () => {
    for (const id of NA) {
      const t = readApp(id);
      expect(t.includes('empty-state'), `${id} 不硬造类锚（非缺口登记）`).toBe(false);
    }
    // 抽证两家：空语义传达面原样在位
    expect(readApp('typing').includes('aria-label="历史最佳成绩">最佳 --'), 'typing chipBest 空语义传达原样在位').toBe(true);
    expect(readApp('safari').includes("tabs.push({ id: nextTabId++, title: '新标签页'"), 'safari 闭末签自动开新签原样在位').toBe(true);
  });

  it('C2 · chess 演进重锚（#314 批 9）：让位记录闭环，空态以「暂无着法」文案锚形态落地（非 empty-state 类锚）', () => {
    const t = readApp('chess');
    expect(t.includes('empty-state'), 'chess 仍无 empty-state ASCII 类锚（#314 空态走中文文案锚形态）').toBe(false);
    expect(t.includes('暂无着法，走子后自动记录'), 'chess 空态文案（#314 批 9）在录').toBe(true);
    expect(t.includes('.ch-moves-empty'), 'chess 空态样式类（#314 批 9）在录').toBe(true);
  });

  it('E1 · 快照对账：修复 10 家 V7=true；登记 9 家 V7=false 维持；chess #314 批 9 消项 true；V7 全量 true=34', () => {
    const snap = JSON.parse(readFileSync(join(__dirname, '..', 'scripts', 'visual-baseline.json'), 'utf-8'));
    const apps = snap.apps ?? snap;
    const entries = typeof apps === 'object' && !Array.isArray(apps)
      ? Object.entries(apps)
      : apps.map((a) => [a.app, a]);
    const getV7 = (id) => {
      const hit = entries.find(([name]) => name === id);
      expect(hit, `快照含 ${id}`).toBeTruthy();
      return (hit[1].visual ?? hit[1]).V7;
    };
    for (const id of [...TIER_A, ...TIER_B]) {
      expect(getV7(id), `${id} 快照 V7 true`).toBe(true);
    }
    for (const id of NA) {
      expect(getV7(id), `${id} 快照 V7 false 维持`).toBe(false);
    }
    // #314 批 9 演进重锚：chess 空态已落地（暂无着法形态）→ true；V7 全量 true 33→34
    expect(getV7('chess'), 'chess 快照 V7=true（#314 批 9 消项）').toBe(true);
    const v7True = entries.filter(([, v]) => (v.visual ?? v).V7 === true).length;
    expect(v7True, 'V7 全量 true=34（23+10+#314 chess，账目闭合）').toBe(34);
  });
});
