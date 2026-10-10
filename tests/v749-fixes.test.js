// ==================== v7.49 修复锚定测试 ====================
// 用户回访五项：
//   ① 列表一甩到底全空白（FastScroller overlay 撑出隐形滚动区）
//   ② 二级菜单返回预览闪现/横跳（stretch 回弹 RAF 与 renderSubPages 同帧互写 +
//      EDGE 手势按下即激活）
//   ③ 带加号矢量图向左偏（battery_saver 十字中心 (10,13) vs 电池中心 (12,13)）
//   ④ 旋转图标上下弧段画得细（wght400 弧带 22px 亚像素化）
//   ⑤ 开关小球拖到返回区滑不到最左（pointercancel 丢弃拖拽 + 边缘手势抢事件）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf-8');

describe('v7.49 → ① FastScroller 轨道层不再撑出隐形滚动区', () => {
  const src = read('ios-desktop/js/scroll-fx.js');

  it('overlay 插入为首个子元素（sticky top:0 才能从首帧钉住视口顶）', () => {
    expect(src).toContain('el.insertBefore(overlay, el.firstChild)');
    // 旧「末尾放置」方案退场
    expect(src).not.toContain('置于末尾防干扰 :first-child');
  });

  it('layout() 以负 margin 抵消 overlay 流内占位（scrollHeight 零虚高）', () => {
    expect(src).toContain("this._fsOverlay.style.height = h + 'px'");
    expect(src).toContain('this._fsOverlay.style.marginTop = -pt');
    expect(src).toContain("this._fsOverlay.style.marginBottom = -(h - pt) + 'px'");
  });

  it('在途 stretch 回弹在宿主占用时 finish 让位（横跳根治）', () => {
    expect(src).toContain('if (hostGestureBusy()) {');
    expect(src).toContain('this.edgeTop.finish()');
    expect(src).toContain('this.edgeBottom.finish()');
  });

  it('hostGestureBusy 覆盖全部拖拽与开/关窗弹簧（EDGE 不再被排除）', () => {
    expect(src).toContain('if (state.isDragging) return true;');
    expect(src).toContain("state.scaleSpring.isSettled() || !state.posSpring.isSettled()");
    // 旧排除条款不再出现
    expect(src).not.toContain("state.gestureType !== 'EDGE_LEFT'");
  });

  it('惯性撞边 absorb 注入前检查宿主占用', () => {
    expect(src).toContain('edge.isFinished() && !hostGestureBusy()');
  });
});

describe('v7.49 → ② 边缘手势方向确认门控（预览闪现根治）', () => {
  const src = read('ios-desktop/js/gestures.js');
  const cfg = read('ios-desktop/js/config.js');
  const main = read('ios-desktop/js/main.js');

  it('EDGE_CONFIRM_SLOP 常量存在并接入', () => {
    expect(cfg).toContain('export const EDGE_CONFIRM_SLOP   = 10;');
    expect(src).toContain('EDGE_CONFIRM_SLOP,');
  });

  it('onDown 仅登记 pending，beginGesture/指示条延迟到方向确认', () => {
    expect(src).toContain('let edgeConfirmed = false;');
    expect(src).toContain('edgeConfirmed = false;\n  }');
    // 副作用抽出为确认后调用
    expect(src).toContain('function activateEdgeBackChannel()');
    expect(src).toMatch(/hDist >= EDGE_CONFIRM_SLOP && hDist > vDist \* 1\.1/);
  });

  it('垂直主导时放弃手势让位滚动', () => {
    expect(src).toMatch(/vDist >= EDGE_CONFIRM_SLOP && vDist >= hDist/);
    expect(src).toContain('整个手势作废，触摸流交还原生滚动');
  });

  it('onUp 对未确认的 pending 手势直接作废', () => {
    expect(src).toMatch(/if \(!edgeConfirmed\) \{\s*\n\s*edgeConfirmed = false;\s*\n\s*state\.gestureType = 'NONE';/);
  });

  it('可拖拽交互控件上的按下不进入手势系统（target 豁免）', () => {
    expect(src).toContain("const INTERACTIVE_DRAG_SELECTOR = '.md3-switch, .m3-slider-root, .md-fs-thumb, input[type=\"range\"]';");
    expect(src).toContain('targetEl.closest(INTERACTIVE_DRAG_SELECTOR)');
    expect(src).toContain('export function onDown(x, y, forcedType = null, targetEl = null)');
    // main.js touch/mouse 两路均透传 target
    expect(main).toContain('onDown(e.touches[0].clientX, e.touches[0].clientY, null, e.target)');
    expect(main).toContain('onDown(e.clientX, e.clientY, null, e.target)');
  });
});

describe('v7.49 → ⑤ 开关 pointercancel 按最后位置提交', () => {
  const src = read('ios-desktop/js/m3-controls.js');

  it('cancel 走与 up 同源的完成判定（不再丢弃拖拽）', () => {
    expect(src).toContain("labelEl.addEventListener('pointercancel', (e) => onEnd(e, true))");
    expect(src).toContain("labelEl.addEventListener('pointerup', (e) => onEnd(e, false))");
  });

  it('cancel 坐标无效时以最后一次 move 位置兜底', () => {
    expect(src).toContain('const endX = cancelled && !(e.clientX > 0) ? lastX : e.clientX;');
  });

  it('无位移的取消不切换状态（点击语义保持）', () => {
    expect(src).toContain('if (cancelled) return;');
  });

  it('cancel 完成判定不触发振动（与真实松手区分）', () => {
    expect(src).toContain('if (navigator.vibrate && !cancelled) navigator.vibrate(12)');
  });
});

describe('v7.49 → ③ battery_saver 加号与电池本体同轴', () => {
  const icons = read('ios-desktop/js/icons.js');

  it('加号子路径已重写为双臂中心 (12,13)', () => {
    expect(icons).toContain('M13 9v3h4v2h-4v3h-2v-3H7v-2h4V9h2z');
    // 旧偏移十字（中心 x=10）移除
    expect(icons).not.toContain('M13 14h-2v3H9v-3H7v-2h2v-3h2v3h2v2z');
  });

  it('电池本体路径保持官方原样', () => {
    expect(icons).toContain('M15.67 4H14V2h-4v2H8.33');
  });
});

describe('v7.49 → sw 版本与产物一致性', () => {
  it('sw.js VERSION = geek-v67', () => {
    expect(read('sw.js')).toContain("const VERSION = 'geek-v67';");
  });
});
