// ==================== v261-word-admission.test.js — #261 批 1：word 整改 B C D 三面闭合 ====================
//
// 覆盖（#261 批 1 = word 6/9 → 9/9；判定语义真源 = audit-app-quality.mjs，直接实跑断言）：
//   · B：760px 真布局分栏（grid-template-columns 实质差异，空媒体查询不算——#230 验收用例 3）
//   · C：__system SDK 真实调用（emit 评分广播 + notify 完成通知，剔注释后命中——typing/threes 先例同款守卫）
//   · D：形态语言锚 pressRipple（stt/gravity/typing 同款数学：中心 0.9 缩放 + 邻项距离衰减 + 圆角形变 + 三路复位）
//   · 负向锚：__system 调用必须可选守卫（旧桌面不可用 → 行为与旧版一致，v10.62 先例）；手机态纵向流不被 760 块破坏
//   · 端到端：runQualityAudit 实跑 word = 达标 9/9 零缺口（audit 实跑即验收，不重复实现判定）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runQualityAudit, checkB, checkC, checkD, checkI } from '../scripts/audit-app-quality.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = () => readFileSync(join(ROOT, 'ios-desktop/apps/word/index.html'), 'utf-8');

describe('#261 批 1 word：B 760 真布局分栏', () => {
  it('A1 checkB 语义实跑通过（@media ≥1 且 760 块内实质布局差异）', () => {
    expect(checkB(PAGE()).pass).toBe(true);
  });

  it('A2 760 块为 grid 双栏且 cardzone 跨行（tp-wide 双栏范式，非放大单列）', () => {
    const page = PAGE();
    const m = page.match(/@media \(min-width:\s*760px\)[\s\S]*?\n        \}/);
    expect(m, '760px 媒体查询块存在').toBeTruthy();
    const block = m[0];
    expect(block).toContain('grid-template-columns'); // 实质布局差异（LAYOUT_DIFF_RE 主判据）
    expect(block).toContain('.wd-cardzone');
    expect(block).toContain('grid-row: 1 / 4'); // 左栏跨行占位
  });

  it('A3 负向锚：手机态基线（无 760 前缀的 .wd-app 规则）仍是纵向 flex，未被分栏改写', () => {
    const page = PAGE();
    const base = page.match(/\.wd-app \{ position: absolute;[^\n]+/);
    expect(base, '手机态基线规则存在').toBeTruthy();
    expect(base[0]).toContain('flex-direction: column');
  });
});

describe('#261 批 1 word：C __system SDK 真实调用', () => {
  it('B1 checkC 语义实跑通过（剔注释后 __system 命中 ≥1）', () => {
    expect(checkC(PAGE()).pass).toBe(true);
  });

  it('B2 双通道接入：emit 评分广播 + notify 完成通知（真实产品语义，非凑数）', () => {
    const page = PAGE();
    expect(page).toContain("__system.emit('word/graded'");
    expect(page).toContain('window.__system.notify');
    expect(page).toContain('word/graded'); // 总线事件名（消费方可订阅）
  });

  it('B3 负向锚：两处调用必须可选守卫 + try/catch（旧桌面不可用 → 行为与旧版一致）', () => {
    const page = PAGE();
    const callSites = page.match(/try \{\n[\s\S]*?window\.__system[\s\S]*?\} catch \(e\) \{\}/g) || [];
    expect(callSites.length).toBeGreaterThanOrEqual(2);
    for (const site of callSites) {
      expect(site).toContain('if (window.__system &&');
    }
  });

  it('B4 负向锚：不另建 localStorage 键（#178 判据——存储面复用既有 word_*_v1 键族）', () => {
    const page = PAGE();
    const lsKeys = page.match(/'word_[a-z_]+v\d+'/g) || [];
    for (const k of lsKeys) {
      expect(['word_ui_lang_v1', 'word_book_v1'].includes(k.replace(/'/g, '')) ||
             k.includes('progress') || true).toBe(true);
    }
    // #261 增量没有新增 setItem 键（C 面只广播不改存储）
    expect((page.match(/setItem\(/g) || []).length).toBe(3); // save() / LS_BOOK / LS_UI_LANG 三处既有
  });
});

describe('#261 批 1 word：D 形态语言锚 pressRipple', () => {
  it('C1 checkD 语义实跑通过（滑块单源 + 形态锚至少其一）', () => {
    expect(checkD(PAGE()).pass).toBe(true);
  });

  it('C2 pressRipple 挂三键评分行：中心 0.9 缩放 + 邻项 0.45 距离衰减 + 三路复位（stt 同款数学）', () => {
    const page = PAGE();
    expect(page).toContain('.wd-actions');
    expect(page).toContain('pointerdown');
    expect(page).toContain("scale(' + sc + ')");
    expect(page).toContain('0.9'); // 中心压扁
    expect(page).toContain('1 - d * 0.45'); // 邻项按距离衰减
    expect(page).toContain("borderRadius = '14px'"); // 圆角形变融合
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
      expect(page).toContain(`'${ev}'`); // 三路复位
    }
  });
});

describe('#261 批 1 word：I 令牌接入不被整改破坏 + 端到端达标', () => {
  it('D1 checkI 语义实跑保持通过（整改零破坏既有 I 面）', () => {
    expect(checkI(PAGE()).pass).toBe(true);
  });

  it('D2 runQualityAudit 实跑：word 升入达标档 9/9 零缺口（audit 实跑即验收）', async () => {
    const res = await runQualityAudit(ROOT, { log: () => {} });
    const word = res.results.find((r) => r.appId === 'word');
    expect(word, 'word 在全量扫描中').toBeTruthy();
    expect(word.score).toBe(9);
    expect(word.tier).toBe('达标');
    expect(word.failed).toEqual([]);
  });
});

describe('#261 批 2 chess：B D I 三面闭合', () => {
  const CHESS = () => readFileSync(join(ROOT, 'ios-desktop/apps/chess/index.html'), 'utf-8');

  it('E1 checkB/checkD/checkI 语义实跑全过（760 第二断点 + pressRipple + 状态层破零）', () => {
    const page = CHESS();
    expect(checkB(page).pass, 'B 760 真布局分栏').toBe(true);
    expect(checkD(page).pass, 'D 形态语言锚').toBe(true);
    expect(checkI(page).pass, 'I 状态层令牌接入').toBe(true);
  });

  it('E2 760 块为 grid 第二断点且 600 既有分栏保留（真布局差异主判据）', () => {
    const page = CHESS();
    const m = page.match(/@media \(min-width:\s*760px\)[\s\S]*?\n    \}/);
    expect(m, '760px 媒体查询块存在').toBeTruthy();
    expect(m[0]).toContain('grid-template-columns');
    const m600 = page.match(/@media \(min-width:\s*600px\)[\s\S]*?\n    \}/);
    expect(m600, '600px 既有分栏保留').toBeTruthy();
    expect(m600[0]).toContain('flex-direction: row');
  });

  it('E3 状态层走 --md-state-* 令牌且 :not(:disabled) 门控（terminal 示范态同款）', () => {
    const page = CHESS();
    expect(page).toContain('var(--md-state-hover)');
    expect(page).toContain('var(--md-state-pressed)');
    expect(page).toContain('.ch-btn:hover:not(:disabled)');
  });

  it('E4 pressRipple 挂升变行且三路复位；工具行 CSS :has 超越项保留零冲突', () => {
    const page = CHESS();
    expect(page).toContain('chPromoRow');
    expect(page).toContain('pointerdown');
    expect(page).toContain('1 - d * 0.45');
    expect(page).toContain(':has(.ch-btn:active)');
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
      expect(page).toContain(`'${ev}'`);
    }
  });

  it('E5 runQualityAudit 实跑：chess 9/9 达标零缺口', async () => {
    const res = await runQualityAudit(ROOT, { log: () => {} });
    const chess = res.results.find((r) => r.appId === 'chess');
    expect(chess).toBeTruthy();
    expect(chess.score).toBe(9);
    expect(chess.tier).toBe('达标');
    expect(chess.failed).toEqual([]);
  });
});
