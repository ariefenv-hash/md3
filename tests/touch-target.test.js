// ==================== touch-target.test.js — #294 触控目标 J 项 ====================
//
// 覆盖（#294 裁决收口锚 · v11.06 · R147 窗 · Job 2933040 第 2 定时消息系列）：
//   · J1 出口契约：TOUCH_MIN_PX=44 / TOUCH_SYSTEM_EVIDENCE 中心证据表（md3-list-item ≥52px、
//     md3-fab 56×56 实测）；负向锚：ITEM_KEYS 保持 A–I 九项制零变化、VISUAL_KEYS 保持 V1–V8
//     （#243 先例同律：J 为报告级并行段，不进 9 项制、不进 hardFailures）
//   · J2 checkJ 判据语义：判据 = 零「声明 <44px」可证违规；系统组件类/内联≥44/CSS≥44 三类
//     可证达标；未声明尺寸 N/A 曝光不入判（真适配不硬造）；零交互锚天然通过（D 门先例同律）
//   · J3 全量实跑：41 应用 + 2 模板全部携带 touch 段；模板双过（生成即达标前提延续）；
//     touchTally pass+gap=43；hardFailures 零触控条目（分档曝光不拦截）
//   · J4 快照对齐：docs/visual-admission-baseline.json 增量段（apps[].touch/touch_summary/
//     admission_bar.touch_target）与 audit 实跑零漂移；不锁死 pass 值演进（对齐而非锁死）
//   · J5 文档口径：visual-admission-baseline.md §五（#294 扩展目标线 10/10 / 判据 / 实测横切）
//   · J6 负向锚：quality-baseline.json 逐应用键集恰为 A–I 九项、visual-baseline.json 恰为
//     V1–V8 —— 两把既有锁零污染

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runQualityAudit,
  checkJ,
  extractTouchAnchors,
  TOUCH_MIN_PX,
  TOUCH_SYSTEM_EVIDENCE,
  ITEM_KEYS,
  VISUAL_KEYS,
} from '../scripts/audit-app-quality.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = () => readFileSync(join(ROOT, 'docs/visual-admission-baseline.md'), 'utf-8');
const SNAP = () => JSON.parse(readFileSync(join(ROOT, 'docs/visual-admission-baseline.json'), 'utf-8'));
const QUAL = () => JSON.parse(readFileSync(join(ROOT, 'scripts/quality-baseline.json'), 'utf-8'));
const VIS = () => JSON.parse(readFileSync(join(ROOT, 'scripts/visual-baseline.json'), 'utf-8'));

describe('#294 J1 出口契约与负向锚（9 项制/V 清单零变化）', () => {
  it('J1a TOUCH_MIN_PX=44 且中心证据表为实测系统组件', () => {
    expect(TOUCH_MIN_PX).toBe(44);
    expect(Object.keys(TOUCH_SYSTEM_EVIDENCE).sort()).toEqual(['md3-fab', 'md3-list-item']);
    expect(TOUCH_SYSTEM_EVIDENCE['md3-list-item']).toContain('≥52px');
    expect(TOUCH_SYSTEM_EVIDENCE['md3-fab']).toContain('56×56px');
  });

  it('J1b 负向锚：ITEM_KEYS 仍为 A–I 九项、VISUAL_KEYS 仍为 V1–V8（J 不进 9 项制）', () => {
    expect(ITEM_KEYS).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
    expect(VISUAL_KEYS).toEqual(['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8']);
  });
});

describe('#294 J2 checkJ 判据语义（静态可证证据面）', () => {
  it('J2a 零交互锚天然通过（D 门先例同律）', () => {
    const r = checkJ('<div class="md3-card"><p>静态模板零交互</p></div>');
    expect(r.pass).toBe(true);
    expect(r.detail).toContain('无交互锚');
  });

  it('J2b 系统组件类证据（md3-list-item/md3-fab）可证达标', () => {
    const r = checkJ('<div class="md3-list-item" onclick="go()">家</div><button class="md3-fab">+</button>');
    expect(r.pass).toBe(true);
    expect(r.detail).toContain('系统×2');
  });

  it('J2c 声明 <44px 为可证违规（fail 并曝光类名与像素）', () => {
    const r = checkJ('<button class="icon-btn" onclick="x()">…</button><style>.icon-btn{width:32px;height:32px;}</style>');
    expect(r.pass).toBe(false);
    expect(r.detail).toContain('违规×1');
    expect(r.detail).toContain('icon-btn=32px');
  });

  it('J2d 内联 ≥44px 与应用 CSS ≥44px 两类可证达标', () => {
    const inline = checkJ('<button style="height:48px" onclick="x()">A</button>');
    expect(inline.pass).toBe(true);
    expect(inline.detail).toContain('内联≥44×1');
    const css = checkJ('<button class="big" onclick="x()">B</button><style>.big{min-height:44px;}</style>');
    expect(css.pass).toBe(true);
    expect(css.detail).toContain('CSS≥44×1');
  });

  it('J2e 未声明尺寸 N/A 曝光不入判（真适配不硬造）', () => {
    const r = checkJ('<input type="text" placeholder="搜索"><button onclick="x()">裸按钮</button>');
    expect(r.pass).toBe(true); // 无声明 → N/A，非违规
    expect(r.detail).toContain('N/A未证×2');
    expect(r.detail).toContain('违规×0');
  });

  it('J2f type=hidden 排除出交互锚集', () => {
    const { anchors } = extractTouchAnchors('<input type="hidden" name="a"><button onclick="x()">B</button>');
    expect(anchors).toHaveLength(1);
  });
});

describe('#294 J3 全量实跑（41 应用 + 2 模板 · 分档曝光不拦截）', () => {
  it('J3a 全量携带 touch 段且模板双过；touchTally 自洽；hardFailures 零触控条目', async () => {
    const res = await runQualityAudit(ROOT, { log: () => {} });
    expect(res.checked).toBe(41);
    for (const r of res.results) {
      expect(r.touch).toBeTruthy();
      expect(typeof r.touch.pass).toBe('boolean');
    }
    for (const t of res.templates) expect(t.touch.pass).toBe(true);
    expect(res.touchTally.pass + res.touchTally.gap).toBe(43);
    expect(res.hardFailures.every((h) => !h.includes('触控') && !h.includes('touch'))).toBe(true);
  });
});

describe('#294 J4 快照增量段与实跑对齐（不锁死演进）', () => {
  it('J4a 快照 J 段结构与实跑零漂移', async () => {
    const snap = SNAP();
    const res = await runQualityAudit(ROOT, { log: () => {} });
    const live = new Map(res.results.map((r) => [r.appId, r.touch]));
    expect(snap.apps).toHaveLength(41);
    for (const a of snap.apps) {
      const l = live.get(a.id);
      expect(a.touch, `${a.id} 缺 touch 段`).toBeTruthy();
      expect(a.touch.pass).toBe(l.pass);
      expect(a.touch.small).toBe(l.small);
    }
    expect(snap.touch_summary.min).toBe(44);
    expect(snap.touch_summary.pass).toBe(res.touchTally.pass);
    expect(snap.touch_summary.gap).toBe(res.touchTally.gap);
    expect(snap.touch_summary.source).toContain('gen-touch-snapshot');
    expect(snap.admission_bar.touch_target).toContain('#294');
    expect(snap.admission_bar.touch_target).toContain('10/10');
  });
});

describe('#294 J5 文档口径（§五 扩展段）', () => {
  it('J5a 准入文档含 #294 扩展目标线、判据与实测横切', () => {
    const doc = DOC();
    expect(doc).toContain('#294 扩展目标线');
    expect(doc).toContain('10/10');
    expect(doc).toContain('报告级并行段分档曝光不拦截');
    expect(doc).toContain('N/A');
    expect(doc).toContain('gen-touch-snapshot');
    expect(doc).toContain('## 五、#294 触控目标 J 项扩展');
    expect(doc).toContain('## 六、边界与关联'); // 原 §五 顺延为 §六（编号连续性）
  });
});

describe('#294 J6 负向锚：两把既有锁零污染', () => {
  it('J6a quality-baseline 逐应用键集恰为 A–I 九项（J 不入基线锁）', () => {
    const q = QUAL();
    const appKeys = Object.keys(q).filter((k) => k !== 'app-template' && k !== 'app-template-multi');
    expect(appKeys.length).toBeGreaterThanOrEqual(41);
    for (const k of appKeys) expect(Object.keys(q[k]).sort()).toEqual(ITEM_KEYS.map((x) => x).sort());
  });

  it('J6b visual-baseline 逐应用键集恰为 V1–V8（J 不入水位锁）', () => {
    const v = VIS();
    const appKeys = Object.keys(v).filter((k) => !k.startsWith('app-template'));
    expect(appKeys.length).toBeGreaterThanOrEqual(41);
    for (const k of appKeys) expect(Object.keys(v[k]).sort()).toEqual(VISUAL_KEYS.map((x) => x).sort());
  });
});
