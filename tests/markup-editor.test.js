// ==================== markup-editor.test.js — #94 一期 Markup 编辑会话纯逻辑 v11.04 ====================
//
// 覆盖（R94 窗加餐，issue 工具集对齐：pen/highlighter/eraser/crop + 撤销重做）：
//   · 常量与校验：MARKUP_TOOLS 四工具 / PEN_COLORS 五色 / isValidStroke 全门 / validPoint
//   · 几何：pointToSegmentDistance（线段/退化点/端点钳位）/ hitTestStroke（多段命中/
//     单点笔迹/半径门）
//   · 会话状态机：addStroke（id 单调/非法拒绝/redo 栈清空）/ eraseAt（多笔迹整组删除/
//     未命中空数组/非法坐标拒绝）/ undo·redo（add/erase/crop 三 op 全回放；add 被物理
//     移除后 redo 诚实拒绝）/ setCrop（钳位/最小边门/清除/非法保持原值）
//   · 序列化严格 codec：serialize 往返 / deserialize 非法输入全拒（损坏 JSON/版本错/
//     笔迹非法/crop 越界/载荷超限）→ null 永不半成品（parseCommunityTheme 同律）
//   · 纯逻辑纪律：零 window/document/localStorage（字面仅注内提及——剥注释扫描）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MARKUP_TOOLS,
  PEN_COLORS,
  HIGHLIGHTER_ALPHA,
  ERASER_HIT_RADIUS,
  PEN_WIDTHS,
  MIN_CROP_EDGE,
  MARKUP_PAYLOAD_LIMIT,
  nextStrokeId,
  resetStrokeIdCounter,
  isValidStroke,
  pointToSegmentDistance,
  hitTestStroke,
  createMarkupSession,
  deserializeMarkup,
} from '../ios-desktop/js/aosp/markup-editor.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const ME = readFileSync(R('js/aosp/markup-editor.js'), 'utf8');

const stroke = (over = {}) => ({ tool: 'pen', color: PEN_COLORS[0], width: 5, points: [[0, 0], [100, 0]], ...over });

describe('v94-A · 常量与笔迹校验', () => {
  it('A1 工具集/色板/档位（#94 issue 工具条描述对齐；text/emoji 二期另案）', () => {
    expect(MARKUP_TOOLS).toEqual(['pen', 'highlighter', 'eraser', 'crop']);
    expect(PEN_COLORS).toHaveLength(5);
    expect(PEN_WIDTHS).toEqual([2, 5, 10]);
    expect(HIGHLIGHTER_ALPHA).toBeGreaterThan(0);
    expect(HIGHLIGHTER_ALPHA).toBeLessThan(1);
    expect(ERASER_HIT_RADIUS).toBeGreaterThan(0);
    expect(MIN_CROP_EDGE).toBeGreaterThanOrEqual(32);
    expect(MARKUP_PAYLOAD_LIMIT).toBe(1024 * 1024);
  });

  it('A2 isValidStroke 全门（tool 白名单/宽度/点合法性）', () => {
    expect(isValidStroke(stroke())).toBe(true);
    expect(isValidStroke(stroke({ tool: 'crop' }))).toBe(false);          // crop 非笔迹工具
    expect(isValidStroke(stroke({ tool: 'text' }))).toBe(false);          // 二期工具未入
    expect(isValidStroke(stroke({ width: 0 }))).toBe(false);
    expect(isValidStroke(stroke({ width: NaN }))).toBe(false);
    expect(isValidStroke(stroke({ color: '' }))).toBe(false);
    expect(isValidStroke(stroke({ points: [] }))).toBe(false);
    expect(isValidStroke(stroke({ points: [[0, NaN], [1, 2]] }))).toBe(false);
    expect(isValidStroke(stroke({ points: [[0]] }))).toBe(false);         // 点必须 [x,y]
    expect(isValidStroke(null)).toBe(false);
    expect(isValidStroke('pen')).toBe(false);
  });

  it('A3 笔迹 id 单调（会话内唯一）', () => {
    resetStrokeIdCounter();
    const a = nextStrokeId();
    const b = nextStrokeId();
    expect(b === a).toBe(false);
  });
});

describe('v94-B · 几何（橡皮命中真源）', () => {
  it('B1 pointToSegmentDistance：线段投影/端点钳位/退化点距', () => {
    expect(pointToSegmentDistance(50, 10, 0, 0, 100, 0)).toBe(10);        // 垂足在段内
    expect(pointToSegmentDistance(-5, 0, 0, 0, 100, 0)).toBe(5);          // 垂足钳到起点
    expect(pointToSegmentDistance(120, 0, 0, 0, 100, 0)).toBe(20);        // 钳到终点
    expect(pointToSegmentDistance(3, 4, 0, 0, 0, 0)).toBe(5);             // 零长段 → 点距
    expect(Math.round(pointToSegmentDistance(0, 0, 30, 40, 60, 80) * 1000) / 1000).toBe(50); // 3-4-5
  });

  it('B2 hitTestStroke：多段命中/单点笔迹/半径门/非法笔迹拒', () => {
    const s = stroke({ points: [[0, 0], [100, 0], [100, 100]] });
    expect(hitTestStroke(s, 50, 5, 12)).toBe(true);
    expect(hitTestStroke(s, 50, 20, 12)).toBe(false);
    expect(hitTestStroke(s, 105, 50, 12)).toBe(true);                     // 第二段
    expect(hitTestStroke(s, 50, 5, 2)).toBe(false);                       // 半径门
    const dot = stroke({ points: [[10, 10]] });
    expect(hitTestStroke(dot, 14, 14, 12)).toBe(true);                    // 单点退化
    expect(hitTestStroke(dot, 40, 40, 12)).toBe(false);
    expect(hitTestStroke(null, 0, 0, 12)).toBe(false);
  });
});

describe('v94-C · 会话状态机', () => {
  it('C1 addStroke：id 单调提交 + 非法拒绝返回 null + 新写清空 redo 栈', () => {
    resetStrokeIdCounter();
    const s = createMarkupSession({ width: 500, height: 400 });
    const a = s.addStroke(stroke());
    expect(a).not.toBeNull();
    expect(a.id).toBe('s1');
    const b = s.addStroke(stroke());
    expect(b.id).toBe('s2');
    expect(s.strokes()).toHaveLength(2);
    expect(s.addStroke(stroke({ tool: 'crop' }))).toBeNull();             // 非法笔迹拒
    expect(s.addStroke(stroke({ points: [[NaN, 0]] }))).toBeNull();
    expect(s.strokes()).toHaveLength(2);
    expect(s.canUndo()).toBe(true);
  });

  it('C2 eraseAt：命中整组删除（含被删 id 回执）/未命中空数组/非法坐标拒', () => {
    resetStrokeIdCounter();
    const s = createMarkupSession({ width: 500, height: 400 });
    const a = s.addStroke(stroke({ points: [[0, 0], [100, 0]] }));
    const b = s.addStroke(stroke({ points: [[200, 200], [300, 200]] }));
    const removed = s.eraseAt(50, 3, 12);
    expect(removed).toEqual([a.id]);
    expect(s.strokes()).toHaveLength(1);
    expect(s.strokes()[0].id).toBe(b.id);
    expect(s.eraseAt(400, 400, 12)).toEqual([]);                          // 未命中
    expect(s.eraseAt(NaN, 0, 12)).toEqual([]);                            // 非法坐标
  });

  it('C3 undo/redo：add 与 erase 双 op 全回放（erase 组回灌保序）', () => {
    resetStrokeIdCounter();
    const s = createMarkupSession({ width: 500, height: 400 });
    s.addStroke(stroke({ points: [[0, 0], [100, 0]] }));
    const b = s.addStroke(stroke({ points: [[200, 200], [300, 200]] }));
    s.eraseAt(250, 200, 12);
    expect(s.strokes()).toHaveLength(1);
    expect(s.undo()).toBe(true);                                          // 撤销 erase → 回灌
    expect(s.strokes()).toHaveLength(2);
    expect(s.canUndo()).toBe(true);
    expect(s.undo()).toBe(true);                                          // 撤销 add b
    expect(s.strokes().map((x) => x.id)).not.toContain(b.id);
    expect(s.undo()).toBe(true);                                          // 撤销 add a
    expect(s.strokes()).toHaveLength(0);
    expect(s.undo()).toBe(false);                                         // 空栈
    expect(s.redo()).toBe(true);                                          // 回放 add a
    expect(s.strokes()).toHaveLength(1);
    expect(s.redo()).toBe(true);                                          // 回放 add b
    expect(s.redo()).toBe(true);                                          // 回放 erase
    expect(s.strokes()).toHaveLength(1);
    expect(s.redo()).toBe(false);
  });

  it('C4 addStroke 后新写清空 redo 栈（分叉时序纪律）', () => {
    resetStrokeIdCounter();
    const s = createMarkupSession({ width: 500, height: 400 });
    s.addStroke(stroke());
    s.undo();
    expect(s.canRedo()).toBe(true);
    s.addStroke(stroke({ points: [[50, 50], [60, 60]] }));
    expect(s.canRedo()).toBe(false);
  });

  it('C5 setCrop：钳位归一 + 最小边门 + 清除 + 非法保持原值 + undo 回灌 prev', () => {
    const s = createMarkupSession({ width: 500, height: 400 });
    expect(s.setCrop({ x: -10, y: -10, w: 300, h: 400 })).toBe(true);     // 钳到 (0,0,300,400)
    expect(s.cropRect()).toEqual({ x: 0, y: 0, w: 300, h: 400 });
    expect(s.setCrop({ x: 400, y: 350, w: 300, h: 300 })).toBe(true);     // 钳后 100×50 两边 ≥ MIN
    expect(s.cropRect()).toEqual({ x: 400, y: 350, w: 100, h: 50 });
    expect(s.setCrop({ x: 480, y: 390, w: 300, h: 300 })).toBe(false);    // 钳后 20×10 宽 < MIN 边
    expect(s.cropRect()).toEqual({ x: 400, y: 350, w: 100, h: 50 });      // 保持原值
    expect(s.setCrop({ x: 'abc', y: 0, w: 100, h: 100 })).toBe(false);
    expect(s.undo()).toBe(true);                                          // 撤销末次裁切 → prev
    expect(s.cropRect()).toEqual({ x: 0, y: 0, w: 300, h: 400 });
    expect(s.redo()).toBe(true);                                          // 重做裁切
    expect(s.cropRect()).toEqual({ x: 400, y: 350, w: 100, h: 50 });
    expect(s.setCrop(null)).toBe(true);                                   // 显式清除
    expect(s.cropRect()).toBeNull();
  });

  it('C6 exportGeometry：渲染层消费契约（笔迹深拷贝 + crop 快照）', () => {
    resetStrokeIdCounter();
    const s = createMarkupSession({ width: 500, height: 400 });
    s.addStroke(stroke());
    s.setCrop({ x: 0, y: 0, w: 200, h: 200 });
    const g = s.exportGeometry();
    expect(g).toEqual({
      width: 500, height: 400, crop: { x: 0, y: 0, w: 200, h: 200 },
      strokes: [expect.objectContaining({ id: 's1', tool: 'pen' })],
    });
    g.strokes[0].points[0][0] = 999;                                      // 深拷贝隔离
    expect(s.strokes()[0].points[0][0]).toBe(0);
  });
});

describe('v94-D · 序列化严格 codec（非法输入 → null 永不半成品）', () => {
  it('D1 serialize 往返（strokes + crop 全量保真）', () => {
    resetStrokeIdCounter();
    const s = createMarkupSession({ width: 500, height: 400 });
    s.addStroke(stroke());
    s.addStroke(stroke({ tool: 'highlighter', width: 10, points: [[1, 1], [2, 2], [3, 3]] }));
    s.setCrop({ x: 10, y: 10, w: 200, h: 100 });
    const raw = s.serialize();
    expect(typeof raw).toBe('string');
    const back = deserializeMarkup(raw);
    expect(back).not.toBeNull();
    expect(back.session.width).toBe(500);
    expect(back.session.height).toBe(400);
    expect(back.session.strokes()).toHaveLength(2);
    expect(back.session.strokes()[1].tool).toBe('highlighter');
    expect(back.session.cropRect()).toEqual({ x: 10, y: 10, w: 200, h: 100 });
    expect(back.session.canUndo()).toBe(false);                           // 回灌会话栈清空
  });

  it('D2 deserialize 全拒面：损坏 JSON/版本错/尺寸非法/笔迹非法/crop 越界/超限/类型', () => {
    expect(deserializeMarkup('{broken')).toBeNull();
    expect(deserializeMarkup('null')).toBeNull();
    expect(deserializeMarkup(JSON.stringify({ v: 2, width: 10, height: 10, strokes: [] }))).toBeNull();
    expect(deserializeMarkup(JSON.stringify({ v: 1, width: -5, height: 10, strokes: [] }))).toBeNull();
    expect(deserializeMarkup(JSON.stringify({ v: 1, width: 100, height: 100, strokes: [{ tool: 'crop', color: '#fff', width: 1, points: [[0, 0]] }] }))).toBeNull();
    expect(deserializeMarkup(JSON.stringify({ v: 1, width: 100, height: 100, crop: { x: 0, y: 0, w: 200, h: 50 }, strokes: [] }))).toBeNull();  // crop 越画布
    expect(deserializeMarkup(JSON.stringify({ v: 1, width: 100, height: 100, crop: { x: 0, y: 0, w: 10, h: 10 }, strokes: [] }))).toBeNull();   // crop < MIN
    expect(deserializeMarkup('x'.repeat(MARKUP_PAYLOAD_LIMIT + 1))).toBeNull();
    expect(deserializeMarkup(123)).toBeNull();
    expect(deserializeMarkup('')).toBeNull();
  });

  it('D3 crop 回灌不自洽 → 整体拒绝（永不半成品）', () => {
    // 构造：合法 JSON 但 crop 与尺寸门冲突（直接拼 payload 绕 serialize 内部门）
    const payload = JSON.stringify({ v: 1, width: 100, height: 100, crop: { x: 0, y: 0, w: 50, h: 31 }, strokes: [] });
    expect(deserializeMarkup(payload)).toBeNull();
  });
});

describe('v94-E · 纯逻辑纪律与接线预备（F 组源码锚）', () => {
  it('E1 纯逻辑纪律：零 window/document/localStorage/随机源（剥注释扫描）', () => {
    const code = ME.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain('window.');
    expect(code).not.toContain('document.');
    expect(code).not.toContain('localStorage');
    expect(code).not.toContain('Math.random');
  });

  it('E2 #94 一期范围锚：text/emoji 二期另案 + 光栅源另案（#196 裁决承接）', () => {
    expect(ME).toContain('text/emoji 二期另案');
    expect(ME).toContain('渲染层（canvas');
    // shelf 缩略图点按 = 编辑入口（ScreenshotController EDIT intent 语义位）在注
    expect(ME).toContain('EDIT intent');
  });
});
