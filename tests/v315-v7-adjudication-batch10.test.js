// ==================== v315 测试 — #315 [V 清单批 10] V7 登记面勘定卷：八家逐家实读裁决 + 维持登记文面（R141 窗 Job 2933040 · 第 2 定时消息系列） ====================
//
// 背景：R141 续点（HANDOFF 覆写二十三 next_candidates 第 1 项）。#311 批 6 将 9 家判「不适用登记」，
// 本卡逐家实读重评——结论：**施工 0 家、维持登记 9 家（8 家本卡勘定 + terminal #314 D1 在录）**，
// 全部属「空态不可达」或「空态语义已在位（词表外形态）」，真适配不硬造（#309/#313/#314 D1 先例同律）。
// 本卷把逐家实读证据固化为可回归锚（防未来误施工），V7 水位 34/43 定格，
// **V 清单全维度达成「全 pass 或登记文面在录」终态**（V8 43/43 · V3 43/43 · V2 42/43+登记 ·
// V1 42/43+登记 · V7 34/43+登记九家 · V4/V5/V6 批 1-6 已清）。
//
// 逐家裁决 rationale（卡 #315 D 段全文，此处摘要）：
//   flow11   — 三消盘 initBoard 恒满（expansion 再注 2 特殊晶石）；flowHistory 为 VFS 写通道
//              （/documents/flow11-history.json）无应用内渲染面 → 空态不可达；
//   game2048 — 开局恒 ≥2 块（initGame + restart 链路，对局态集合恒非空）→ 空态不可达；
//   phone    — 纯拨号盘本体（keypad-grid + dial-btn + contact-match），零列表集合（实读无「通话记录」面）；
//   piano    — 真钢琴键位 UI 本体（白键+黑键浮层恒显），零可空集合；
//   safari   — tabs 初始恒有签 + 闭末签自动开新签（#311 C1 锚在录）→ 空态不可达；
//   shortcuts— 静态清单本体（收藏 5 + 建议 3 全硬编码卡片），零动态集合；
//   typing   — chipBest「最佳 --」即历史空态语义传达（renderBest 空态渲染在位），词表外形态；
//   word     — 完成态 data-wd-state="done"「今日任务完成」即队列耗尽空态语义本体（词表外形态，
//              强加「暂无更多单词」与完成态重复 = 反 UX）；
//   terminal — boot 横幅输出语义本体（#314 D1 在录）。
//
// 施工形态：**源码零改动纯 tests 卷**（#278 收口锚批 321e42e「v10.87 维持零滚版」先例同律）。
//
// 关联：#315（本卡）/ #311（批 6 NA 登记）/ #314（批 9）/ #313（批 8）/ #309（批 5）/ #243（V 清单基建）/
//       #230（A 口径·§七禁止刷次数）/ #18 §5/§9/§7.5/§7.6/§7.7

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditVisual } from '../scripts/audit-app-quality.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const APPS_DIR = join(ROOT, 'ios-desktop', 'apps');
const readApp = (id) => readFileSync(join(APPS_DIR, id, 'index.html'), 'utf-8');
const BASELINE = JSON.parse(readFileSync(join(ROOT, 'scripts/visual-baseline.json'), 'utf-8'));

/** 本卡勘定名单：V7 false 九家 = #311 NA 8 家 + terminal（#314 D1 在录） */
const REGISTERED_9 = ['flow11', 'game2048', 'phone', 'piano', 'safari', 'shortcuts', 'typing', 'word', 'terminal'];

describe('v315 · #315 V 清单批 10（V7 登记面勘定卷：八家实读裁决 + 维持登记）', () => {
  it('A1 · 快照对账：V7 false 名单九家逐家在册；true=34；43 全量账目闭合（34+9）', () => {
    const fails = Object.entries(BASELINE).filter(([, v]) => !v.V7).map(([k]) => k).sort();
    expect(fails, 'V7 false = 登记九家（8 勘定 + terminal）').toEqual([...REGISTERED_9].sort());
    const trues = Object.entries(BASELINE).filter(([, v]) => v.V7 === true).length;
    expect(trues, 'V7 true=34（34+9=43 全量账目闭合）').toBe(34);
    expect(Object.keys(BASELINE).length, '快照全量 43 项').toBe(43);
  });

  it('A2 · 逐家实读证据锚（九条源码事实，勘定依据可回归防误施工）', () => {
    const fl = readApp('flow11');
    expect(fl.includes('board[r][c] = getRandomGemLevel();'), 'flow11 initBoard 恒满盘').toBe(true);
    expect(fl.includes("/documents/flow11-history.json'"), 'flow11 历史为 VFS 写通道').toBe(true);
    const g = readApp('game2048');
    expect(g.includes('function initGame(resume = false){'), 'game2048 对局态恒非空（initGame 机制）').toBe(true);
    const ph = readApp('phone');
    expect(ph.includes('keypad-grid'), 'phone 纯拨号盘本体').toBe(true);
    expect(ph.includes('通话记录'), 'phone 零列表集合（实读无通话记录面）').toBe(false);
    const pi = readApp('piano');
    expect(pi.includes('真钢琴白键 + 黑键浮层'), 'piano 键位 UI 本体恒显').toBe(true);
    const sf = readApp('safari');
    expect(sf.includes("let tabs = [{ id: 1, title: '新标签页'"), 'safari 初始恒有签').toBe(true);
    const sc = readApp('shortcuts');
    expect(sc.includes('收藏的快捷指令') && sc.includes('建议的快捷指令'), 'shortcuts 静态清单本体').toBe(true);
    const ty = readApp('typing');
    expect(ty.includes('aria-label="历史最佳成绩">最佳 --'), 'typing chipBest 空态语义已在位').toBe(true);
    const wd = readApp('word');
    expect(wd.includes('data-wd-state="done"') && wd.includes('今日任务完成'), 'word 完成态即队列耗尽空态').toBe(true);
    const tm = readApp('terminal');
    expect(tm.includes("addLine('msh 1.0（md3 shell）"), 'terminal boot 横幅（#314 D1 在录）').toBe(true);
  });

  it('B1 · 词表核对：九家源码 V7 词表命中 = 0（登记非词表问题，实读勘定）', () => {
    for (const id of REGISTERED_9) {
      const t = readApp(id);
      const hits = (t.match(/暂无|空状态|empty[-_]?state|空空如也|数据为空|没有内容|无内容/g) || []).length;
      expect(hits, `${id} V7 词表命中 0（维持登记，非缺词表锚）`).toBe(0);
    }
  });

  it('C1 · 零硬造跨批互证：九家 empty-state ASCII 类锚仍为零（#311 C1 判定回归）', () => {
    for (const id of REGISTERED_9) {
      expect(readApp(id).includes('empty-state'), `${id} 无 empty-state 类锚（零硬造）`).toBe(false);
    }
  });

  it('D1 · 登记态一致：九家 auditVisual V7 pass=false 逐家复核（登记非缺口非遗漏）', () => {
    for (const id of REGISTERED_9) {
      const v = auditVisual(id, readApp(id));
      expect(v.items.V7.pass, `${id} V7 维持 false（登记态）`).toBe(false);
      expect(BASELINE[id]?.V7, `${id} 快照 V7=false`).toBe(false);
    }
  });
});
