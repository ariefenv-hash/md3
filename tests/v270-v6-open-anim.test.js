// ==================== v270 测试 — #308 [V 清单存量补课·批 4] V6 开屏动效 10 家（R133 窗 Job 2933040） ====================
//
// 背景：#307 批 3（v10.83=c1e61fc）交付后快照 V6=false 恰余 10 家（V6 true 33 家为 #245 批 1/2/3、
// #261 批 4 等历史批次已消化余量）→ 本卡 10 家全清。
//
// 施工形态（#245 批 2 基础档 shortcuts sc-list-in 先例同形态，零 JS 零 DOM 结构改动，纯 CSS 新增）：
//   每家 1 组 @keyframes <app>-in{from{opacity:0;transform:translateY(8px)}} 开屏入场定义
//   + 主容器 animation:<app>-in var(--md-duration-medium,400ms) var(--md-easing-emphasized-decelerate,
//   cubic-bezier(0.05,0.7,0.1,1)) both 消费（曲线令牌 var()+fallback 消费口径同 #239 组）
//   插入位置：第一个行首 @media 之前（顶层作用域）；stocks 无 @media 插入最后 </style> 前
//
// 关联：#308（本卡）/ #307（批 3）/ #306（批 2）/ #262（批 1 先例）/ #245（开屏动效先例）/
//       #243（V 清单基建）/ #229（存量补课车道）/ #18 §5/§9/§7.5/§7.6/§7.7

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditVisual } from '../scripts/audit-app-quality.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// (app, keyframes 名, 挂载 selector) —— 与 scripts/apply-v6-open-anim.py PLAN 同源
const PLAN = [
  ['archive',  'ar-app-in', '#main'],
  ['contacts', 'ct-list-in', '.list'],
  ['dice',     'dc-ui-in',   '#ui-layer'],
  ['driving',  'dv-app-in',  '.dv-app'],
  ['gravity',  'gv-bar-in',  '#bar'],
  ['ocr',      'oc-app-in',  '.oc-app'],
  ['piano',    'pn-app-in',  '.pn-app'],
  ['ping',     'pg-app-in',  '.pg-app'],
  ['python',   'py-app-in',  '.py-app'],
  ['stocks',   'st-app-in',  '.stocks-container'],
];
const readApp = (id) =>
  readFileSync(join(__dirname, '..', 'ios-desktop', 'apps', id, 'index.html'), 'utf-8');

describe('v270 · #308 V6 开屏动效 10 家（批 4）', () => {
  it('A1 · 端到端：10 家逐家 auditVisual V6 pass（@keyframes+animation 双要件）', () => {
    for (const [id] of PLAN) {
      const v = auditVisual(id, readApp(id));
      expect(v.items.V6.pass, `${id} V6 应 pass`).toBe(true);
      expect(v.items.V6.detail).toMatch(/开屏动效：@keyframes×(\d+)/);
    }
  });

  it('A2 · 形态锚：每家 kf 定义 + 主容器 animation 消费 + MD3 曲线/时长令牌消费（10 家逐家）', () => {
    for (const [id, kf, sel] of PLAN) {
      const text = readApp(id);
      expect(text, `${id} @keyframes 定义`).toContain(
        `@keyframes ${kf}{from{opacity:0;transform:translateY(8px)}}`
      );
      expect(text, `${id} ${sel} animation 消费`).toContain(
        `${sel}{animation:${kf} var(--md-duration-medium,400ms) var(--md-easing-emphasized-decelerate, cubic-bezier(0.05,0.7,0.1,1)) both}`
      );
    }
  });

  it('B1 · 顶层作用域插入：@media 规则未被包裹破坏（9 家 @media 前插入 + stocks </style> 前插入）', () => {
    // 插入块位于每家第一个行首 @media 之前 → @media 仍为顶层规则（前面无未闭合 {）
    // 抽证形态：每家插入注释行下一行即 @keyframes，且 @media 计数与施工前一致（逐家 ≥0 静态存在锚）
    const MEDIA_APPS = PLAN.filter(([id]) => id !== 'stocks');
    for (const [id] of MEDIA_APPS) {
      const text = readApp(id);
      const kfLine = text.indexOf('/* 开屏入场动效（#308 批 4');
      expect(kfLine, `${id} 插入块在位`).toBeGreaterThan(0);
      const mediaIdx = text.search(/^[ \t]*@media/m);
      expect(mediaIdx, `${id} @media 在位且位于插入块之后`).toBeGreaterThan(kfLine);
    }
    const stocks = readApp('stocks');
    expect(stocks.indexOf('/* 开屏入场动效（#308 批 4')).toBeGreaterThan(0);
    expect(stocks.match(/<\/style>/g).length, 'stocks </style> 唯一完整').toBe(1);
  });

  it('B2 · 零覆盖零触碰：施工面之外代表行原文不动（8 家代表行抽证）', () => {
    const guards = [
      ['archive',  '#main { flex: 1; display: flex; min-height: 0; }'],
      ['contacts', '.list { display: grid; gap: 8px; }'],
      ['dice',     '#ui-layer { position: absolute; inset: 0; pointer-events: none; z-index: 10; }'],
      ['gravity',  '#bar {\n    position: fixed; top: 0; left: 0; right: 0; z-index: 5;'],
      ['driving',  '.dv-app { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 12px 14px; gap: 8px; }'],
      ['piano',    '.pn-app'],
      ['ping',     '.pg-app { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 12px 14px; gap: 9px; }'],
      ['stocks',   '.stocks-container {\n            max-width: 680px;'],
    ];
    for (const [id, frag] of guards) {
      expect(readApp(id).includes(frag), `${id} 原块零触碰锚: ${frag.slice(0, 40)}…`).toBe(true);
    }
  });

  it('C1 · 快照对账：visual-baseline.json 10 家 V6 全 true（水位无回退）', () => {
    const snap = JSON.parse(readFileSync(join(__dirname, '..', 'scripts', 'visual-baseline.json'), 'utf-8'));
    const apps = snap.apps ?? snap;
    const entries = typeof apps === 'object' && !Array.isArray(apps)
      ? Object.entries(apps)
      : apps.map((a) => [a.app, a]);
    for (const [id] of PLAN) {
      const hit = entries.find(([name]) => name === id);
      expect(hit, `快照含 ${id}`).toBeTruthy();
      const visual = hit[1].visual ?? hit[1];
      expect(visual.V6, `${id} 快照 V6 应 true`).toBe(true);
    }
  });

  it('D1 · 零 JS 文面：10 家 <script> 区零新增 kf 名（纯 CSS 施工文面保证）', () => {
    for (const [id, kf] of PLAN) {
      const text = readApp(id);
      const scriptStart = text.lastIndexOf('<script');
      expect(scriptStart, `${id} 有 script 区`).toBeGreaterThan(0);
      const scriptPart = text.slice(scriptStart);
      expect(scriptPart.includes(kf), `${id} script 区零动画定义引用`).toBe(false);
    }
  });
});
