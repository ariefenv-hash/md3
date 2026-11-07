// ==================== v241-keyboard-a11y.test.js — #241 键盘可达一批（v10.50） ====================
// 覆盖面（#241 销号路径 1/3 本窗批次）：
//   A. keyboard-activate 接线层纯 DOM 行为（happy-dom 真跑）
//   B. qsTileA11ySpec 磁贴读屏语义判定 + 动作磁贴登记表双向锚（登记 ↔ 点击分支同源）
//   C. chess-core 无障碍纯函数（格子标签/焦点步进）+ 棋盘页面接线静态锚
//   D. 壳层四处消费面接线静态锚（QS 磁贴/通知卡/锁屏卡/媒体卡）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyClickableSemantics, bindKeyboardClick } from '../ios-desktop/js/keyboard-activate.js';
import { QS_ACTION_TILE_IDS, qsTileA11ySpec } from '../ios-desktop/js/aosp/qs-tile-state.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const QS_SRC = read('ios-desktop/js/quick-settings.js');
const NOTI_SRC = read('ios-desktop/js/notifications.js');
const LOCK_SRC = read('ios-desktop/js/lock-screen.js');
const CHESS_HTML = read('ios-desktop/apps/chess/index.html');

// ---------- 沙箱提取（IIFE → window.__chessCore，与 v132/v237 同款） ----------
const CORE_SRC = read('ios-desktop/js/chess-core.js');
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const C = ctx.window.__chessCore;

// ---------- A. keyboard-activate 接线层 ----------
// 键事件派发在焦点元素上（bubbles 冒泡至卡片监听，e.target 为原生只读真实值）
function keyOn(el, key) {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(e);
  return e;
}

describe('A1 applyClickableSemantics 语义属性', () => {
  it('正常路径：role/aria-label/tabindex=0/checked 布尔', () => {
    const el = document.createElement('div');
    applyClickableSemantics(el, { role: 'switch', label: 'Wi-Fi，已开启', checked: true });
    expect(el.getAttribute('role')).toBe('switch');
    expect(el.getAttribute('aria-label')).toBe('Wi-Fi，已开启');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.getAttribute('aria-checked')).toBe('true');
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });
  it('checked=false 落 false；checked=null 不写 aria-checked', () => {
    const a = document.createElement('div');
    applyClickableSemantics(a, { role: 'switch', label: 'x', checked: false });
    expect(a.getAttribute('aria-checked')).toBe('false');
    const b = document.createElement('div');
    applyClickableSemantics(b, { role: 'button', label: 'y', checked: null });
    expect(b.hasAttribute('aria-checked')).toBe(false);
  });
  it('disabled：tabindex 移出 Tab 序 + aria-disabled', () => {
    const el = document.createElement('div');
    applyClickableSemantics(el, { role: 'button', label: 'z', disabled: true });
    expect(el.getAttribute('tabindex')).toBe('-1');
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('A2 bindKeyboardClick 键盘触发桥', () => {
  it('Enter 与 Space 各触发一次 click；其他键不触发', () => {
    const el = document.createElement('div');
    let clicks = 0;
    el.addEventListener('click', () => { clicks += 1; });
    const unbind = bindKeyboardClick(el);
    keyOn(el, 'Enter');
    keyOn(el, ' ');
    keyOn(el, 'a');
    keyOn(el, 'Escape');
    expect(clicks).toBe(2);
    unbind();
    keyOn(el, 'Enter');
    expect(clicks).toBe(2); // 解绑后不再触发
  });
  it('交互后代（button）持有原生激活：桥不代触发防双路径', () => {
    const card = document.createElement('div');
    const btn = document.createElement('button');
    card.appendChild(btn);
    let cardClicks = 0, btnClicks = 0;
    card.addEventListener('click', () => { cardClicks += 1; });
    btn.addEventListener('click', () => { btnClicks += 1; });
    bindKeyboardClick(card);
    keyOn(btn, 'Enter'); // 焦点在卡内按钮上：事件自按钮冒泡至卡片 → 桥跳过（不代触发）
    expect(btnClicks).toBe(0); // happy-dom 不做原生 Enter→click 翻译，真实浏览器由引擎层负责
    expect(cardClicks).toBe(0); // 卡片不被双触发
    keyOn(card, 'Enter'); // 焦点在卡片本体 → 卡片激活
    expect(cardClicks).toBe(1);
  });
  it('非交互后代（span）落在卡内 → 冒泡至卡片照常激活', () => {
    const card = document.createElement('div');
    const span = document.createElement('span');
    card.appendChild(span);
    let clicks = 0;
    card.addEventListener('click', () => { clicks += 1; });
    bindKeyboardClick(card);
    keyOn(span, 'Enter');
    expect(clicks).toBe(1);
  });
});

// ---------- B. 磁贴读屏语义 ----------
describe('B1 qsTileA11ySpec 语义判定', () => {
  it('开关磁贴：switch + checked 镜像 active + 状态后缀标签', () => {
    const off = qsTileA11ySpec('wifi', { name: 'Wi-Fi', active: false });
    expect(off.role).toBe('switch');
    expect(off.checked).toBe(false);
    expect(off.label).toBe('Wi-Fi，已关闭');
    const on = qsTileA11ySpec('wifi', { name: 'Wi-Fi', active: true });
    expect(on.checked).toBe(true);
    expect(on.label).toBe('Wi-Fi，已开启');
    expect(on.disabled).toBe(false);
  });
  it('动作磁贴全登记：button 语义 + 无 checked', () => {
    for (const id of QS_ACTION_TILE_IDS) {
      const s = qsTileA11ySpec(id, { name: id, active: true });
      expect(s.role).toBe('button');
      expect(s.checked).toBe(null);
      expect(s.disabled).toBe(false);
    }
  });
  it('不可用：disabled + 标签后缀「不可用」；受管理：保持可聚焦 + 「受管理」', () => {
    const un = qsTileA11ySpec('wifi', { name: 'Wi-Fi', active: false, unavailable: true });
    expect(un.disabled).toBe(true);
    expect(un.label).toBe('Wi-Fi，不可用');
    const rs = qsTileA11ySpec('wifi', { name: 'Wi-Fi', active: true, restricted: true });
    expect(rs.disabled).toBe(false);
    expect(rs.label).toBe('Wi-Fi，受管理');
    expect(rs.checked).toBe(true);
  });
  it('双向锚：登记表与 quick-settings 点击分支同源（正向含分支 / 负向不含开关磁贴）', () => {
    for (const id of QS_ACTION_TILE_IDS) {
      expect(QS_SRC).toContain(`tile.id === '${id}'`);
    }
    // 开关磁贴不得混入动作登记表（darktheme 跟随主题翻转 / torch 开关 + 全屏层）
    expect(QS_ACTION_TILE_IDS).not.toContain('darktheme');
    expect(QS_ACTION_TILE_IDS).not.toContain('torch');
  });
});

// ---------- C. 棋盘无障碍纯函数 ----------
describe('C1 cellA11yLabel 格子标签', () => {
  it('空格如实「空」，坐标角标正确（idx 0 = a8 / idx 63 = h1）', () => {
    expect(C.cellA11yLabel(0, null)).toBe('a8 空');
    expect(C.cellA11yLabel(63, null)).toBe('h1 空');
  });
  it('初始局面棋子命名（e2 白兵 / e7 黑兵）', () => {
    const b = C.initialBoard();
    expect(C.cellA11yLabel(C.parseSquare('e2'), b[C.parseSquare('e2')])).toBe('e2 白兵');
    expect(C.cellA11yLabel(C.parseSquare('e7'), b[C.parseSquare('e7')])).toBe('e7 黑兵');
    expect(C.cellA11yLabel(C.parseSquare('e1'), b[C.parseSquare('e1')])).toBe('e1 白王');
  });
});

describe('C2 focusStep 方向键步进', () => {
  it('四向步进（idx 27 = d4）', () => {
    expect(C.focusStep(27, 'ArrowRight')).toBe(28);
    expect(C.focusStep(27, 'ArrowLeft')).toBe(26);
    expect(C.focusStep(27, 'ArrowUp')).toBe(19);
    expect(C.focusStep(27, 'ArrowDown')).toBe(35);
  });
  it('边界钳制不回绕（0 左进 / 63 下进 / 行尾右进不跨行）', () => {
    expect(C.focusStep(0, 'ArrowLeft')).toBe(0);
    expect(C.focusStep(0, 'ArrowUp')).toBe(0);
    expect(C.focusStep(63, 'ArrowDown')).toBe(63);
    expect(C.focusStep(63, 'ArrowRight')).toBe(63);
    expect(C.focusStep(7, 'ArrowRight')).toBe(7);  // h8 右出界钳制
    expect(C.focusStep(8, 'ArrowUp')).toBe(0);
  });
  it('非方向键原位返回（不吞其他按键）', () => {
    expect(C.focusStep(27, 'x')).toBe(27);
    expect(C.focusStep(27, 'Enter')).toBe(27);
    expect(C.focusStep(27, 'Escape')).toBe(27);
  });
});

describe('C3 棋盘页面接线静态锚', () => {
  it('grid 语义链：role=grid 容器 + row 行容器 + gridcell 格子', () => {
    expect(CHESS_HTML).toContain('id="chBoard" role="grid"');
    expect(CHESS_HTML).toMatch(/\.ch-row\s*\{\s*display:\s*contents;/);
    expect(CHESS_HTML).toContain("row.setAttribute('role', 'row')");
    expect(CHESS_HTML).toContain("d.setAttribute('role', 'gridcell')");
  });
  it('游走 tabindex + 方向键桥 + 选中态 aria-selected + 焦点回归', () => {
    expect(CHESS_HTML).toContain('var kbdIdx = 0');
    expect(CHESS_HTML).toContain('C.focusStep(kbdIdx, e.key)');
    expect(CHESS_HTML).toContain("d.setAttribute('aria-selected', 'true')");
    expect(CHESS_HTML).toContain('d.tabIndex = (i === kbdIdx) ? 0 : -1');
    expect(CHESS_HTML).toContain('cells[kbdIdx].focus()');
    expect(CHESS_HTML).toContain('.ch-cell:focus-visible');
  });
  it('e2e 兼容锚：行外层/列内层构建序 = 文档序（e2e-v237 按序索引依赖）', () => {
    // buildBoard 以 r 外层 / f 内层循环 push，cells 与 document.querySelectorAll('.ch-cell') 同序
    const rowLoop = CHESS_HTML.indexOf('for (var r = 0; r < 8; r++)');
    const fileLoop = CHESS_HTML.indexOf('for (var f = 0; f < 8; f++)');
    expect(rowLoop).toBeGreaterThan(-1);
    expect(fileLoop).toBeGreaterThan(rowLoop);
    expect(CHESS_HTML).toContain('cells.push(d)');
  });
});

// ---------- D. 壳层消费面接线静态锚 ----------
describe('D1 壳层四处消费面', () => {
  it('QS 磁贴：语义判定 + 键盘桥 + 克隆体补挂 + 增量 aria 同步', () => {
    expect(QS_SRC).toContain('applyClickableSemantics(pill, qsTileA11ySpec(tile.id, {');
    expect(QS_SRC).toContain('bindKeyboardClick(pill)');
    expect(QS_SRC).toContain('bindKeyboardClick(clone)');
    expect(QS_SRC).toContain("pill.setAttribute('aria-checked'");
    expect(QS_SRC).toContain("pill.setAttribute('aria-label'");
  });
  it('QS 全屏手电层键盘退出沿（仅可见时消费）', () => {
    expect(QS_SRC).toContain('__torchKeyExit');
    expect(QS_SRC).toContain("torchLayer.style.pointerEvents !== 'auto'");
  });
  it('QS 媒体卡 + 通知卡 + 通知媒体卡接线', () => {
    expect(QS_SRC).toContain("applyClickableSemantics(card, { role: 'button', label: '打开音乐' })");
    expect(NOTI_SRC).toContain('applyClickableSemantics(card, { role: \'button\', label: `${item.app}：${item.title}` })');
    expect(NOTI_SRC).toContain("applyClickableSemantics(mediaCard, { role: 'button', label: '打开音乐' })");
  });
  it('锁屏通知卡：脱敏卡既有 aria-label 优先保留', () => {
    expect(LOCK_SRC).toContain("card.getAttribute('aria-label') || `${view.app}：${view.title}`");
    expect(LOCK_SRC).toContain('bindKeyboardClick(card)');
  });
});
