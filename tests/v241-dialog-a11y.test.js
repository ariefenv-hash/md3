// ==================== v241 测试 — 弹层三件套 dialog-a11y（#241 建议2 · R124 窗 v10.97） ====================
//
// #241 建议2：弹层统一「Esc 可关 + 焦点陷阱 + 焦点恢复」三件套（抽 _shared/dialog-a11y.js）。
// R124 窗交付：IIFE 单源（window.__mdDialogA11y 唯一登记面）+ 七应用显式接线
//（game2048/dice/threes/stocks/camera/reminders/safari——弹层 DOM 在库但零 Escape 处理
// 八家核查后七家实施，phone 复核无弹层 DOM 不适用，交付帖披露）。
// 与 _shared/a11y.js（v10.51 键盘自动增强）分层零双写：本模块只管弹层生命周期。
//
// 断言面：
//  A. 核心三件套（happy-dom 真跑：Esc 关/幂等/焦点恢复/自动聚焦/栈式 topmost/Tab 陷阱）
//  B. 接线锚（七应用引入行 + open/close 双端簿记静态断言，只增不减）
//  C. 端到端链路（game2048 / reminders 真实 DOM 片段 Escape 闭环）
//  D. #242 登记一致性锚（__mdDialogA11y 在册）+ 引入行注释防误删
//  E. 边界（栈空零干扰 / 与 a11y.js 共存 / opener 失联不抛错）

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const DLG_SRC = read('ios-desktop/apps/_shared/dialog-a11y.js');
const A11Y_SRC = read('ios-desktop/apps/_shared/a11y.js');

// #241 建议2 接线面（首批七应用 + 加餐一段 code-editor/clock-app + 加餐三段 books/calculator/contacts/notes + 加餐四段 translate，采用率只增不减）
const DLG_APPS = ['game2048', 'dice', 'threes', 'stocks', 'camera', 'reminders', 'safari', 'code-editor', 'clock-app', 'books', 'calculator', 'contacts', 'notes', 'translate', 'calendar', 'messages'];
const INCLUDE_SNIPPET = '<script src="../_shared/dialog-a11y.js"></script>';

// ---------- 模块级：happy-dom 真跑 dialog-a11y.js（幂等装载一次） ----------
new Function('window', DLG_SRC)(window);
const dlg = window.__mdDialogA11y;
const resetStack = () => { dlg._stack.length = 0; };
const pressKey = (key) => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  document.dispatchEvent(e);
  return e;
};

afterEach(resetStack);

function layerFixture(n = 2) {
  const layer = document.createElement('div');
  layer.innerHTML = Array.from({ length: n }, (_, i) => `<button id="b${i}">按钮${i}</button>`).join('');
  document.body.appendChild(layer);
  return layer;
}
function openerFixture() {
  const op = document.createElement('button');
  op.textContent = '打开者';
  document.body.appendChild(op);
  op.focus();
  return op;
}

// ---------- A. 核心三件套 ----------
describe('v241-dialog A：核心三件套（happy-dom 真跑）', () => {
  it('A1 open 后 Escape → onClose 回调 + 出栈', () => {
    const layer = layerFixture();
    let closed = 0;
    dlg.open(layer, { onClose: () => closed++ });
    expect(dlg.size()).toBe(1);
    expect(pressKey('Escape').defaultPrevented).toBe(true);
    expect(closed).toBe(1);
    expect(dlg.size()).toBe(0);
  });

  it('A2 close 幂等：未簿记层返回 false；Esc 已弹后应用内 close 零副作用', () => {
    const layer = layerFixture();
    expect(dlg.close(layer)).toBe(false); // 未簿记
    let closed = 0;
    dlg.open(layer, { onClose: () => closed++ });
    expect(pressKey('Escape')).toBeTruthy();
    expect(dlg.close(layer)).toBe(false); // Esc 已弹出，应用内 close 再调安全
    expect(closed).toBe(1); // onClose 不二次执行
  });

  it('A3 open 幂等：同层重复 open 不重复压栈不覆盖 opener', () => {
    const op = openerFixture();
    const layer = layerFixture();
    dlg.open(layer, { onClose: () => {} });
    const another = document.createElement('button');
    another.textContent = 'x';
    document.body.appendChild(another);
    another.focus();
    dlg.open(layer, { onClose: () => {} }); // 二次 open
    expect(dlg.size()).toBe(1);
    pressKey('Escape');
    expect(document.activeElement).toBe(op); // 焦点还原到首个 opener
  });

  it('A4 焦点恢复：Escape 后焦点还原 opener', () => {
    const op = openerFixture();
    const layer = layerFixture();
    dlg.open(layer, { onClose: () => {} });
    expect(document.activeElement).not.toBe(op); // 已入层
    pressKey('Escape');
    expect(document.activeElement).toBe(op);
  });

  it('A5 自动聚焦：open 后层内首个可聚焦元素获得焦点', () => {
    const layer = layerFixture(3);
    dlg.open(layer, { onClose: () => {} });
    expect(layer.contains(document.activeElement)).toBe(true);
    expect(document.activeElement.id).toBe('b0');
  });

  it('A6 栈式 topmost：两层叠加 Escape 只关最上层', () => {
    const l1 = layerFixture();
    const l2 = layerFixture();
    let c1 = 0, c2 = 0;
    dlg.open(l1, { onClose: () => c1++ });
    dlg.open(l2, { onClose: () => c2++ });
    pressKey('Escape');
    expect(c2).toBe(1); expect(c1).toBe(0);
    expect(dlg.size()).toBe(1);
    expect(dlg.topmost().layer).toBe(l1);
    pressKey('Escape');
    expect(c1).toBe(1);
    expect(dlg.size()).toBe(0);
  });

  it('A7 Tab 陷阱：末元素 Tab 回首；首元素 Shift+Tab 到末', () => {
    const layer = layerFixture(2);
    dlg.open(layer, { onClose: () => {} });
    const b0 = layer.querySelector('#b0');
    const b1 = layer.querySelector('#b1');
    b1.focus();
    pressKey('Tab');
    expect(document.activeElement).toBe(b0); // 末 → 首（环循环）
    b0.focus();
    const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(e);
    expect(document.activeElement).toBe(b1); // 首 → 末
    expect(e.defaultPrevented).toBe(true);
  });

  it('A8 aria-hidden / disabled / hidden 不入焦点环', () => {
    const layer = document.createElement('div');
    layer.innerHTML =
      '<button id="ok">可用</button><button id="dis" disabled>禁用</button>' +
      '<button id="ah" aria-hidden="true">读屏隐</button><button id="hd" hidden>隐</button>';
    document.body.appendChild(layer);
    dlg.open(layer, { onClose: () => {} });
    expect(document.activeElement.id).toBe('ok');
  });

  it('A9 Escape preventDefault + stopPropagation（防双路径同帧）', () => {
    const layer = layerFixture();
    let bubbled = 0;
    const spy = (e) => { if (e.key === 'Escape') bubbled++; };
    document.addEventListener('keydown', spy);
    dlg.open(layer, { onClose: () => {} });
    pressKey('Escape');
    document.removeEventListener('keydown', spy);
    expect(bubbled).toBe(0); // 捕获阶段消费，冒泡层零到达
  });

  it('A10 栈空时 Escape 零消费（未接线应用自带 Esc 链路零干扰）', () => {
    expect(dlg.size()).toBe(0);
    expect(pressKey('Escape').defaultPrevented).toBe(false);
    expect(pressKey('Tab').defaultPrevented).toBe(false);
  });
});

// ---------- B. 接线锚（七应用静态断言） ----------
describe('v241-dialog B：接线锚（七应用只增不减）', () => {
  it('B1 七应用引入行全量在位（含 #241 标记注释防误删）', () => {
    for (const app of DLG_APPS) {
      const html = read(`ios-desktop/apps/${app}/index.html`);
      expect(html.includes(INCLUDE_SNIPPET), `${app} 缺 dialog-a11y.js 引入行`).toBe(true);
      expect(/dialog-a11y\.js"><\/script>\s*<!--\s*#241/.test(html), `${app} 引入行缺 #241 注释`).toBe(true);
    }
  });

  it('B2 game2048：showModal/closeModal 双端簿记', () => {
    const s = read('ios-desktop/apps/game2048/index.html');
    expect(s).toContain("window.__mdDialogA11y.open($('#modal'), { onClose: closeModal })");
    expect(s).toContain("function closeModal(){ $('#modal').classList.remove('active'); if (window.__mdDialogA11y) window.__mdDialogA11y.close($('#modal')); }");
  });

  it('B3 dice：toggleModal opening 判定双端簿记', () => {
    const s = read('ios-desktop/apps/dice/index.html');
    expect(s).toContain("const opening = !el.classList.contains('active');");
    expect(s).toContain("if (opening) window.__mdDialogA11y.open(el, { onClose: () => window.toggleModal(id) });");
    expect(s).toContain('else window.__mdDialogA11y.close(el);');
  });

  it('B4 threes：toggleModal(sel, show) 双端簿记', () => {
    const s = read('ios-desktop/apps/threes/index.html');
    expect(s).toContain("if (show) window.__mdDialogA11y.open(el, { onClose: () => toggleModal(sel, 0) });");
    expect(s).toContain('else window.__mdDialogA11y.close(el);');
  });

  it('B5 stocks：openStockDetail/closeStockDetail 双端簿记', () => {
    const s = read('ios-desktop/apps/stocks/index.html');
    expect(s).toContain('window.__mdDialogA11y.open(overlay, { onClose: closeStockDetail })');
    expect(s).toContain('if (window.__mdDialogA11y) window.__mdDialogA11y.close(overlay);');
  });

  it('B6 camera：openMediaModal + 两关闭点三处簿记', () => {
    const s = read('ios-desktop/apps/camera/index.html');
    expect(s).toContain('window.__mdDialogA11y.open(mediaModal, { onClose:');
    expect(s.match(/window\.__mdDialogA11y\.close\(mediaModal\)/g)?.length).toBe(2);
  });

  it('B7 reminders：八处簿记（task/group 两弹层全开合路径）', () => {
    const s = read('ios-desktop/apps/reminders/index.html');
    expect(s.match(/window\.__mdDialogA11y\.open\(/g)?.length).toBe(3); // task-modal + group-modal(两路)
    expect(s.match(/window\.__mdDialogA11y\.close\(/g)?.length).toBe(7); // cancel-task/341/343/cancel-group/submit/两 backdrop
  });

  it('B8 safari：toggleMenu/menuAction/click-away 三处簿记', () => {
    const s = read('ios-desktop/apps/safari/index.html');
    expect(s).toContain("const opening = !m.classList.contains('open');");
    expect(s.match(/window\.__mdDialogA11y\.close\(document\.getElementById\('menu'\)\)/g)?.length).toBe(2);
  });

  it('B9 code-editor：openModal/closeModal 双端簿记（app.mjs）', () => {
    const s = read('ios-desktop/apps/code-editor/app.mjs');
    expect(s).toContain('window.__mdDialogA11y.open(modal, { onClose: closeModal })');
    expect(s).toContain("function closeModal() { modal.classList.remove('show'); if (window.__mdDialogA11y) window.__mdDialogA11y.close(modal); }");
  });

  it('B10 clock-app：menu 菜单 opening 判定 + click-away 双端簿记（app.mjs；native dialog 面自带 Esc 不在本模块管辖）', () => {
    const s = read('ios-desktop/apps/clock-app/app.mjs');
    expect(s).toContain("const opening=!md.classList.contains('active')");
    expect(s).toContain('if(opening)window.__mdDialogA11y.open(md,{onClose:()=>md.classList.remove(\'active\')})');
    expect(s).toContain("document.onclick=()=>{md.classList.remove('active');if (window.__mdDialogA11y) window.__mdDialogA11y.close(md);};");
  });

  it('B11 books：readerModal 双端簿记（openReader/closeReader）', () => {
    const s = read('ios-desktop/apps/books/index.html');
    expect(s).toContain('window.__mdDialogA11y.open(elements.readerModal, { onClose: closeReader })');
    expect(s).toContain("elements.readerModal.classList.remove('active');\n      if (window.__mdDialogA11y) window.__mdDialogA11y.close(elements.readerModal);");
  });

  it('B12 calculator：right-drawer + settings-modal + level-modal 三面七点簿记', () => {
    const s = read('ios-desktop/apps/calculator/index.html');
    expect(s.match(/window\.__mdDialogA11y\.open\(/g)?.length).toBe(3);
    expect(s.match(/window\.__mdDialogA11y\.close\(/g)?.length).toBe(4); // drawer/settings/level-cancel/level-confirm
  });

  it('B13 contacts：openModal/closeModal 双端簿记', () => {
    const s = read('ios-desktop/apps/contacts/index.html');
    expect(s).toContain('window.__mdDialogA11y.open($modal, { onClose: closeModal })');
    expect(s).toContain("const closeModal = () => { $modal.classList.remove('open'); if (window.__mdDialogA11y) window.__mdDialogA11y.close($modal); };");
  });

  it('B14 notes：两开点同型 + closeModalFn 单收口（自带 Escape 链路保留，簿记幂等共存）', () => {
    const s = read('ios-desktop/apps/notes/index.html');
    expect(s.match(/window\.__mdDialogA11y\.open\(modal, \{ onClose: closeModalFn \}\)/g)?.length).toBe(2);
    expect(s).toContain("function closeModalFn() { modal.classList.remove('open'); if (window.__mdDialogA11y) window.__mdDialogA11y.close(modal); }");
  });

  it('B15 translate：openMenu/closeMenu 双端簿记（menuScrim+bottomSheet 双 active，overflow 侧效保留；自有 Escape 1437 幂等共存）', () => {
    const s = read('ios-desktop/apps/translate/index.html');
    expect(s).toContain('window.__mdDialogA11y.open(bottomSheet, { onClose: closeMenu })');
    expect(s).toContain("bottomSheet.classList.remove('active');\n  if (window.__mdDialogA11y) window.__mdDialogA11y.close(bottomSheet);");
  });

  it('B16 死弹层清账锚：ocr ocMask / midi mp-mask 零 JS 引用（无开合路径无可增强行为，接线面不含）', () => {
    expect(read('ios-desktop/apps/ocr/index.html').match(/ocMask/g)?.length).toBe(1); // 仅 HTML 定义
    expect(read('ios-desktop/apps/midi-player/index.html').match(/mpMask/g)?.length).toBe(1); // 仅 HTML 定义
  });

  it('B17 calendar：eventDialog + dialog 两弹层四点簿记（长尾余量1批；自有 1071 Esc 链路幂等共存）', () => {
    const s = read('ios-desktop/apps/calendar/index.html');
    expect(s).toContain("window.__mdDialogA11y.open($('eventDialog'), { onClose: hideEventDialog })");
    expect(s).toContain("function hideEventDialog() { $('eventDialog').classList.remove('active'); if (window.__mdDialogA11y) window.__mdDialogA11y.close($('eventDialog')); }");
    expect(s).toContain('window.__mdDialogA11y.open(dom.dialog, { onClose: hideDialog })');
    expect(s).toContain("function hideDialog() { dom.dialog.classList.remove('active'); S.dialogCtx = null; if (window.__mdDialogA11y) window.__mdDialogA11y.close(dom.dialog); }");
  });

  it('B18 messages：roomModal 双端簿记（长尾余量1批；自有 763 Esc 全关链路幂等共存）', () => {
    const s = read('ios-desktop/apps/messages/index.html');
    expect(s).toContain("window.__mdDialogA11y.open(document.getElementById('roomModal'), { onClose: closeRoomModal })");
    expect(s).toContain("window.__mdDialogA11y.close(document.getElementById('roomModal'))");
  });

  it('B19 壳层：dialog-a11y 引入行 + settings.js adrSheet 双端簿记（长尾余量1批，壳层动态 sheet 语义）', () => {
    const shell = read('ios-desktop/index.html');
    expect(shell).toContain('<script src="apps/_shared/dialog-a11y.js"></script>');
    expect(shell).toContain('settings.js adrSheet 等壳层动态弹层消费');
    const st = read('ios-desktop/js/apps/settings.js');
    expect(st).toContain('window.__mdDialogA11y.open(adrSheet, { onClose: close })');
    expect(st).toContain('window.__mdDialogA11y.close(adrSheet)');
  });
});

// ---------- C. 端到端链路（真实 DOM 片段 Escape 闭环） ----------
describe('v241-dialog C：端到端链路', () => {
  it('C1 game2048 链路：active 加/去 + Escape 闭环 + 焦点还原', () => {
    const op = openerFixture();
    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal-overlay" id="modal"><div class="modal-content"><button id="m-confirm">确认</button><button id="m-cancel">取消</button></div></div>');
    const modal = document.getElementById('modal');
    const closeModal = () => { modal.classList.remove('active'); dlg.close(modal); };
    modal.classList.add('active');
    dlg.open(modal, { onClose: closeModal });
    expect(modal.classList.contains('active')).toBe(true);
    pressKey('Escape');
    expect(modal.classList.contains('active')).toBe(false); // onClose 已执行
    expect(document.activeElement).toBe(op);
    document.getElementById('modal').remove();
  });

  it('C2 reminders 链路：open 类 + Escape 闭环 + 焦点落输入框', () => {
    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal-overlay" id="task-modal"><div class="modal-card"><form><input id="task-title-input" aria-label="任务名称"><button type="button" id="btn-cancel-task">取消</button></form></div></div>');
    const taskModal = document.getElementById('task-modal');
    taskModal.classList.add('open');
    dlg.open(taskModal, { onClose: () => taskModal.classList.remove('open') });
    expect(document.activeElement.id).toBe('task-title-input'); // 首个可聚焦元素
    pressKey('Escape');
    expect(taskModal.classList.contains('open')).toBe(false);
    document.getElementById('task-modal').remove();
  });
});

// ---------- D. #242 登记一致性锚 ----------
describe('v241-dialog D：#242 登记一致性与注释防误删', () => {
  it('D1 __mdDialogA11y 已在 docs/globals-registry.json 在册（sdk-facade/登记面）', () => {
    const reg = read('docs/globals-registry.json');
    expect(reg).toContain('__mdDialogA11y');
  });

  it('D2 引入行注释含「#241」+「弹层三件套」防误删', () => {
    for (const app of DLG_APPS) {
      const html = read(`ios-desktop/apps/${app}/index.html`);
      expect(html, app).toContain('#241 建议2：弹层三件套');
    }
  });
});

// ---------- E. 边界 ----------
describe('v241-dialog E：边界', () => {
  it('E1 与 _shared/a11y.js 共存互不干扰（双装载语义层不冲突）', () => {
    new Function('window', A11Y_SRC)(window); // v10.51 语义增强层
    expect(typeof window.__mdA11y.enhance).toBe('function');
    expect(typeof dlg.open).toBe('function'); // 本模块不受影响
    const layer = layerFixture();
    dlg.open(layer, { onClose: () => {} });
    expect(dlg.size()).toBe(1);
    pressKey('Escape');
    expect(dlg.size()).toBe(0);
  });

  it('E2 层内 input[type=hidden] 不入焦点环', () => {
    const layer = document.createElement('div');
    layer.innerHTML = '<input type="hidden" id="h"><button id="real">真</button>';
    document.body.appendChild(layer);
    dlg.open(layer, { onClose: () => {} });
    expect(document.activeElement.id).toBe('real');
  });

  it('E3 opener 失联（isConnected=false）后 Escape 不抛错不还原', () => {
    const op = openerFixture();
    const layer = layerFixture();
    dlg.open(layer, { onClose: () => {} });
    op.remove(); // opener 已被移除
    expect(() => pressKey('Escape')).not.toThrow();
    expect(dlg.size()).toBe(0);
  });

  it('E4 幂等装载：重复执行模块源码不双簿记', () => {
    new Function('window', DLG_SRC)(window);
    const layer = layerFixture();
    dlg.open(layer, { onClose: () => {} });
    expect(dlg.size()).toBe(1);
    pressKey('Escape');
    expect(dlg.size()).toBe(0);
  });
});
