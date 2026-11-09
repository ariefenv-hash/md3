// ==================== v8.27 #43：控制中心「修改」编辑模式形态考证重做 ====================
//
// 议题 #43 预判「底部上升 sheet」被源码推翻（勘误裁决链，全部 LineageOS lineage-24.0 实拉）：
//   ① QSFragmentCompose.kt：SceneTransitionLayout scene(SceneKeys.EditMode) = Box(fillMaxSize)
//      —— 编辑模式是 QS 面板内的全屏 Scene 替换，非独立 Activity/Dialog（SystemUI manifest
//      全文无 QS 编辑 Activity 注册，仅 clipboard/controls/communal widgets 三处 Edit）
//   ② toEditMode()（composefragment/ui/ToEditMode.kt）：tween(EDIT_MODE_TIME_MILLIS=500) 交叉
//      淡切 —— EditMode 内容 fractionRange(start=0.5) 淡入、QuickQuickSettings/QuickSettings
//      场景 fractionRange(end=0.5) 淡出
//   ③ EditMode.kt（panels/ui/compose）：Column { gridLayout.EditTileGrid(...) } —— 磁贴网格
//      原地进入可拖拽编辑态；BackHandler 返回退出；onDispose → stopEditing
//   ④ EditModeTopBar.kt（infinitegrid）：返回箭头（AutoMirrored ArrowBack +
//      action_bar_up_description）+ R.string.qs_edit_tiles 标题 + 溢出菜单
//      （qs_edit_menu_content_description「选项」）；无副标题元素
//   ⑤ zh-rCN SystemUI strings：qs_edit_tiles =「编辑功能块」（zh 权威值）
//   ⑥ shade 收起 → stopEditing（QSFragmentCompose LaunchedEffect isQsVisibleAndAnyShadeExpanded）
//
// Web 落地：编辑视图容器从 body 顶层（全屏 z1000 底部上升）退役，内嵌 #qsColumn
// （QS 场景列 = Scene 容器同构），500ms opacity 淡切；dual 模式 open 时迁移至 #dualQsPanel。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.27 #43① 容器几何：编辑视图内嵌 qsColumn（Scene 容器同构）', () => {
  const html = src('ios-desktop/index.html');

  it('editTilesView 位于 qsColumn section 内（顶层 body 直属形态退役）', () => {
    const i = html.indexOf('<section class="qs-column" id="qsColumn">');
    const j = html.indexOf('</section>', i);
    const seg = html.slice(i, j);
    expect(seg).toContain('id="editTilesView"');
    // 全文仅出现一次（原顶层独立块已迁走，非复制）
    expect(html.split('id="editTilesView"').length - 1).toBe(1);
  });

  it('标题 = qs_edit_tiles zh-rCN 权威值「编辑功能块」', () => {
    expect(html).toContain('<div class="edit-tiles-title">编辑功能块</div>');
  });

  it('副标题退役（EditModeTopBar 无此元素）：旧「Select tiles to rearrange」删除', () => {
    expect(html).not.toContain('Select tiles to rearrange');
  });
});

describe('v8.27 #43② 淡切形态：tween 500ms 交叉淡切（translate3d 底部上升退役）', () => {
  const css = src('ios-desktop/css/pull-panels.css');
  const i = css.indexOf('.edit-tiles-view {');
  expect(i).toBeGreaterThan(-1);
  const seg = css.slice(i, css.indexOf('.edit-tiles-appbar', i));

  it('opacity/visibility 门控 + 0.5s 过渡（EDIT_MODE_TIME_MILLIS=500 同构）', () => {
    expect(seg).toContain('opacity: 0;');
    expect(seg).toContain('visibility: hidden;');
    expect(seg).toMatch(/transition: opacity 0\.5s /);
  });

  it('.open 态：opacity 1 + visibility visible + pointer-events 恢复', () => {
    const k = css.indexOf('.edit-tiles-view.open {');
    const openSeg = css.slice(k, css.indexOf('}', k));
    expect(openSeg).toContain('opacity: 1;');
    expect(openSeg).toContain('visibility: visible;');
    expect(openSeg).toContain('pointer-events: auto;');
  });

  it('旧底部上升退役：z-index 1000 → 面板内 40；transform 位移声明零残留（注记字面不计）', () => {
    expect(seg).toContain('z-index: 40;');
    expect(seg).not.toMatch(/transform:\s*translate3d/);
    expect(seg).not.toMatch(/transition: transform/);
  });

  it('qs-column 定位锚：position:relative（editTilesView absolute inset:0）', () => {
    const q = css.indexOf('.qs-column {');
    const qSeg = css.slice(css.indexOf('.shade-column,\n.qs-column {') > -1 ? css.indexOf('.shade-column,\n.qs-column {') : q);
    expect(qSeg.slice(0, 500)).toMatch(/position: relative;/);
  });
});

describe('v8.27 #43③ 宿主双轨跟随：经典 qsColumn ↔ dual dualQsPanel（迁移链同律）', () => {
  const js = src('ios-desktop/js/quick-settings.js');
  const i = js.indexOf('hostEditViewForCurrentMode');
  expect(i).toBeGreaterThan(-1);
  const seg = js.slice(i, js.indexOf('export function openEditTilesView', i));

  it('shadeMode=dual → 迁移至 dualQsPanel（活节点 appendChild + editViewHome 还原记录）', () => {
    expect(seg).toContain("document.body.dataset.shadeMode === 'dual'");
    expect(seg).toContain("document.getElementById('dualQsPanel')");
    expect(seg).toContain('dualPanel.appendChild(view)');
  });

  it('close 还原：editViewHome 原位 insertBefore（与 dual-shade moveInto/restoreAll 同律）', () => {
    expect(seg).toContain('editViewHome.parent.insertBefore(view, editViewHome.next)');
  });

  it('open 先锚定容器再淡入（Scene 迁移先于过渡）', () => {
    const k = js.indexOf('export function openEditTilesView');
    const openSeg = js.slice(k, js.indexOf('export function closeEditTilesView', k));
    expect(openSeg).toContain('hostEditViewForCurrentMode();');
    expect(openSeg.indexOf('hostEditViewForCurrentMode();')).toBeLessThan(openSeg.indexOf("view.classList.add('open');"));
  });
});

describe('v8.27 #43④ 源码考证注记（勘误留痕）+ 既有编辑能力零回归', () => {
  it('HTML 注记：SceneKeys.EditMode fillMaxSize / tween 500 / 非底部 sheet 勘误', () => {
    const html = src('ios-desktop/index.html');
    const i = html.indexOf('v8.27 #43：A17 Expressive EditMode');
    expect(i).toBeGreaterThan(-1);
    const seg = html.slice(i, i + 700);
    expect(seg).toContain('SceneKeys.EditMode');
    expect(seg).toContain('fillMaxSize');
    expect(seg).toContain('非底部 sheet');
  });

  it('CSS 注记：tween(EDIT_MODE_TIME_MILLIS=500) / fractionRange 交叉淡切', () => {
    const css = src('ios-desktop/css/pull-panels.css');
    expect(css).toContain('EDIT_MODE_TIME_MILLIS=500');
    expect(css).toContain('fractionRange');
  });

  it('既有编辑能力零回归：增删/尺寸手柄/Undo/Reset/手势拦截全部在位', () => {
    const js = src('ios-desktop/js/quick-settings.js');
    expect(js).toContain('function renderEditTilesLists() {');
    expect(js).toContain('edit-resize-handle');
    expect(js).toContain('editTilesResetBtn');
    expect(js).toContain('function undoEditTiles() {');
    const gesture = src('ios-desktop/js/pull-down-gesture.js');
    // 编辑态打开时阻塞下拉手势（返回手势语义，源码 BackHandler 同向）
    expect(gesture).toContain("editView.classList.contains('open')");
  });

  it('编辑视图 DOM 契约不变：back/undo 按钮 + active grid + available categories', () => {
    const html = src('ios-desktop/index.html');
    const i = html.indexOf('id="editTilesView"');
    const seg = html.slice(i, html.indexOf('</section>', i));
    expect(seg).toContain('id="editTilesBackBtn"');
    expect(seg).toContain('id="editTilesUndoBtn"');
    expect(seg).toContain('id="editActiveTilesGrid"');
    expect(seg).toContain('id="editAvailableCategories"');
  });
});
