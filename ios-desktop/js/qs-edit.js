// ==================== qs-edit.js — #284 批22（v11.46）：磁贴编辑界面 单源 ====================
// 簇体自 quick-settings.js 逐字节迁出（boundary-map §3.5 表第八行 · 289 行），
// 语义差异三类（如实登记）：① initEditTilesView 加 export（宿主 init 回接）；
// ② 宿主三态重赋值改经宿主访问器委托（setQsActiveTiles/setQsAvailableCategories/
//    setQsTileSizes，批19 get/setQsRestorePage 胶水先例同律——ESM import 绑定不可跨模块
//    重赋值，读与 splice/push 原位变异仍走 import 活绑定零改动）；
// ③ editHistory 模块态随簇迁出（消费面 100% 在簇内：open 清空/save/undo 弹栈——批19
//    qsRestorePage 单源随簇先例同律）。
// 宿主共享态/函数桥：ESM 循环 import 活绑定（qs-sheets/qs-zen 先例同律）——本模块顶层零
// 绑定消费无 TDZ，全部引用发生在调用期（initQuickSettings 绑定 / 铅笔按钮 / back/undo）。
// 磁贴模型纯逻辑单源仍在 qs-tiles.js（QS_TILE_SIZES/applyTileSizes/sizesFromTiles/
// saveTileSizes/setTileSize/resizeFromDrag/clampPreviewDx/applyTileOrder/saveTileOrder/
// DEFAULT_ACTIVE_TILES/DEFAULT_AVAILABLE_CATEGORIES，G2 表不复制）。
import { ICONS } from './icons.js';
import {
  QS_TILE_SIZES, applyTileSizes, sizesFromTiles, saveTileSizes, setTileSize,
  resizeFromDrag, clampPreviewDx, applyTileOrder, saveTileOrder,
  DEFAULT_ACTIVE_TILES, DEFAULT_AVAILABLE_CATEGORIES,
} from './qs-tiles.js';
import { activeTiles, availableCategories, tileSizes, renderQuickSettingsGrid,
  setQsActiveTiles, setQsAvailableCategories, setQsTileSizes } from './quick-settings.js';

// v8.27 #43：EditMode 容器双轨跟随状态（原位还原记录）——随簇迁出
let editHistory = [];

// ==================== 磁贴编辑界面 ====================

export function initEditTilesView() {
  const backBtn = document.getElementById('editTilesBackBtn');
  const undoBtn = document.getElementById('editTilesUndoBtn');

  if (backBtn) {
    backBtn.innerHTML = ICONS.back;
    backBtn.addEventListener('click', closeEditTilesView);
  }
  if (undoBtn) {
    undoBtn.innerHTML = `${ICONS.undo} <span>Undo</span>`;
    undoBtn.addEventListener('click', undoEditTiles);
  }
}

// v8.27 #43：EditMode 容器双轨跟随 —— 经典模式锚在 #qsColumn（Scene 淡切容器），
// dual 模式迁至 #dualQsPanel（v7.85 dual 迁移链同律：活节点 moveInto + 还原记录）；
// close 时归还原位，保证两种 shade 模式下编辑场景都覆盖在激活的 QS 面板内。
let editViewHome = null; // { parent, next } 经典模式原位还原记录
function hostEditViewForCurrentMode() {
  const view = document.getElementById('editTilesView');
  if (!view) return;
  const dual = typeof document !== 'undefined' && document.body.dataset.shadeMode === 'dual';
  const dualPanel = document.getElementById('dualQsPanel');
  const qsColumn = document.getElementById('qsColumn');
  if (dual) {
    if (dualPanel && view.parentElement !== dualPanel) {
      if (!editViewHome) editViewHome = { parent: view.parentNode, next: view.nextSibling };
      dualPanel.appendChild(view);
    }
  } else if (editViewHome && view.parentElement !== editViewHome.parent) {
    editViewHome.parent.insertBefore(view, editViewHome.next);
    editViewHome = null;
  } else if (qsColumn && view.parentElement !== qsColumn) {
    qsColumn.appendChild(view); // 兼容性兑底：非 dual 且无还原记录时锚回 qsColumn
  }
}

export function openEditTilesView() {
  const view = document.getElementById('editTilesView');
  if (!view) return;
  hostEditViewForCurrentMode(); // v8.27 #43：先锚定激活面板容器再淡入（Scene 迁移先于过渡）
  editHistory = [];
  renderEditTilesLists();
  view.classList.add('open');
}

export function closeEditTilesView() {
  const view = document.getElementById('editTilesView');
  if (!view) return;
  view.classList.remove('open');
  renderQuickSettingsGrid();
}

function undoEditTiles() {
  if (editHistory.length === 0) return;
  const lastState = editHistory.pop();
  setQsActiveTiles(JSON.parse(JSON.stringify(lastState.activeTiles)));
  setQsAvailableCategories(JSON.parse(JSON.stringify(lastState.availableCategories)));
  // v7.62：尺寸属于磁贴模型的一部分，撤销后同步尺寸表与持久层
  setQsTileSizes(applyTileSizes(activeTiles, sizesFromTiles(activeTiles)));
  saveTileSizes(tileSizes, typeof localStorage !== 'undefined' ? localStorage : null);
  renderEditTilesLists();
  if (navigator.vibrate) navigator.vibrate(25);
}

function saveEditHistory() {
  editHistory.push({
    activeTiles: JSON.parse(JSON.stringify(activeTiles)),
    availableCategories: JSON.parse(JSON.stringify(availableCategories)),
  });
}

function renderEditTilesLists() {
  const activeBox = document.getElementById('editActiveTilesGrid');
  if (activeBox) {
    activeBox.innerHTML = '';
    activeTiles.forEach((tile, index) => {
      // v7.79：编辑器磁贴统一宽磁贴结构（图标+文字，v2/v3 1080P 实锤编辑器为双列清单）
      const isSmall = tile.size === QS_TILE_SIZES.SMALL;
      const el = document.createElement('div');
      el.className = `qs-tile-pill active size-wide ${isSmall ? 'is-small-in-editor' : ''}`;
      el.style.position = 'relative';
      const iconSvg = ICONS[tile.iconKey] || ICONS.settings;
      el.innerHTML = `
        <div class="qs-tile-icon-wrap">${iconSvg}</div>
        <div class="qs-tile-text">
          <span class="qs-tile-title">${tile.name}</span>
          <span class="qs-tile-sub">${isSmall ? '1×1 · 点击拖拽手柄还原' : (tile.sub || '')}</span>
        </div>
        <div class="edit-resize-handle" data-handle-index="${index}" title="拖拽调整尺寸">
          <span class="edit-resize-grip"></span>
        </div>
        <div class="edit-badge-remove" data-index="${index}">−</div>
      `;
      el.querySelector('.edit-badge-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        saveEditHistory();
        const removed = activeTiles.splice(index, 1)[0];
        const fallbackCat = availableCategories[1] || availableCategories[0];
        if (fallbackCat) fallbackCat.tiles.push(removed);
        persistTileOrder(); // v9.94 #34：增删后顺序持久化
        renderEditTilesLists();
      });
      // v7.62：尺寸拖拽手柄 —— 向左拖过阈值缩为 1×1，向右拖还原 2×1（阈值判定在 qs-tiles.js 纯函数）
      const handle = el.querySelector('.edit-resize-handle');
      if (handle) bindResizeHandle(handle, el, tile);
      // v9.94 #34：拖拽重排（A17 QPR2 QS customizer）—— 主体长拖换位，落位持久化
      el.dataset.tileId = tile.id;
      bindTileDrag(el);
      activeBox.appendChild(el);
    });
  }

  const availableContainer = document.getElementById('editAvailableCategories');
  if (availableContainer) {
    availableContainer.innerHTML = '';
    availableCategories.forEach((cat) => {
      const catTitle = document.createElement('div');
      catTitle.className = 'edit-category-title';
      catTitle.textContent = cat.category;
      availableContainer.appendChild(catTitle);

      const grid = document.createElement('div');
      grid.className = 'qs-tiles-grid';

      cat.tiles.forEach((tile, tIdx) => {
        // v9.94 #204：大屏禁用（AOSP sw600dp 平板不出单手功能——磁贴从编辑器目录隐藏，
        // #204 验收 3；matchMedia 600px 与 pull-down-gesture.js L562 同款先例）
        if (tile.id === 'one_handed'
          && typeof window !== 'undefined'
          && window.matchMedia('(min-width: 600px)').matches) return;
        const el = document.createElement('div');
        el.className = 'qs-tile-pill';
        el.style.position = 'relative';
        const iconSvg = ICONS[tile.iconKey] || ICONS.settings;
        el.innerHTML = `
          <div class="qs-tile-icon-wrap">${iconSvg}</div>
          <div class="qs-tile-text">
            <span class="qs-tile-title">${tile.name}</span>
            <span class="qs-tile-sub">${tile.sub || ''}</span>
          </div>
          <div class="edit-badge-add" data-cat="${cat.category}" data-index="${tIdx}">+</div>
        `;
        el.querySelector('.edit-badge-add').addEventListener('click', (e) => {
          e.stopPropagation();
          saveEditHistory();
          const added = cat.tiles.splice(tIdx, 1)[0];
          added.active = true;
          added.size = QS_TILE_SIZES.SMALL; // Android 16 QPR1：新加入磁贴默认 1×1（9to5Google 实测）
          activeTiles.push(added);
          persistTileOrder(); // v9.94 #34：新增磁贴垫尾并持久化
          renderEditTilesLists();
        });
        grid.appendChild(el);
      });

      availableContainer.appendChild(grid);
    });
  }

  // v7.62：Reset（Android 16：重置按钮位于编辑界面最末端）—— 恢复出厂磁贴布局与尺寸
  const oldReset = document.getElementById('editTilesResetRow');
  if (oldReset) oldReset.remove();
  if (availableContainer) {
    const resetRow = document.createElement('div');
    resetRow.className = 'edit-reset-row';
    resetRow.id = 'editTilesResetRow';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'edit-reset-btn';
    resetBtn.id = 'editTilesResetBtn';
    resetBtn.type = 'button';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => {
      saveEditHistory();
      setQsActiveTiles(JSON.parse(JSON.stringify(DEFAULT_ACTIVE_TILES)));
      setQsAvailableCategories(JSON.parse(JSON.stringify(DEFAULT_AVAILABLE_CATEGORIES)));
      setQsTileSizes(applyTileSizes(activeTiles, {})); // 出厂布局：Internet/Bluetooth/Modes 2×1，其余 1×1（FACTORY_TILE_SIZES）
      saveTileSizes(tileSizes, typeof localStorage !== 'undefined' ? localStorage : null);
      persistTileOrder(); // v9.94 #34：出厂序同步持久化（防旧 order 残留覆盖出厂布局）
      renderEditTilesLists();
      if (navigator.vibrate) navigator.vibrate(25);
    });
    resetRow.appendChild(resetBtn);
    availableContainer.appendChild(resetRow);
  }
}

/** v9.94 #34：当前激活序持久化（增删/重排/Reset 三处统一落盘） */
function persistTileOrder() {
  saveTileOrder(activeTiles.map((t) => t.id), typeof localStorage !== 'undefined' ? localStorage : null);
}

/** v9.94 #34：编辑器激活磁贴拖拽重排绑定（Pointer Events 自研，v7.11 状态机纪律）
 *  生命周期：down 记起点 → move 超 7px 阈值进拖拽态（抓起样式+振动）→ 指针下兄弟
 *  hitTest 真换位（appendChild + 基准重置防跳变）→ up 按 DOM 序写回 activeTiles +
 *  saveTileOrder + 重渲染。中断安全：pointercancel 同 up 走同一条落位链（松手在
 *  边界/快速连拖都收敛到 DOM 实序，无幻影位）。子动作优先：resize 手柄/remove
 *  角标 pointerdown 直通，不进拖拽态。 */
function bindTileDrag(el) {
  el.addEventListener('pointerdown', (e) => {
    // v9.94 #34：target 可能无 closest（document 级合成事件/极端代理场景）——安全门
    if (!(e.target && typeof e.target.closest === 'function')) return;
    if (e.target.closest('.edit-resize-handle, .edit-badge-remove')) return; // 子动作优先
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    const grid = document.getElementById('editActiveTilesGrid');
    if (!grid) return;
    let startX = e.clientX, startY = e.clientY, dragging = false;
    const move = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < 7) return;
        dragging = true;
        el.classList.add('qs-tile-dragging');
        if (navigator.vibrate) navigator.vibrate(12);
      }
      // 指针下兄弟磁贴 hitTest → 真换位（DOM 序即视觉序）；换位后重置基准防跳变
      const hit = [...grid.children].find((c) => {
        if (c === el) return false;
        const r = c.getBoundingClientRect();
        return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      });
      if (hit) {
        const hr = hit.getBoundingClientRect();
        const after = (ev.clientX > hr.left + hr.width / 2) || (ev.clientY > hr.top + hr.height / 2);
        grid.insertBefore(el, after ? hit.nextSibling : hit);
        startX = ev.clientX; startY = ev.clientY;
        el.style.transform = '';
      } else {
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    };
    const finish = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      if (!dragging) return; // 未过阈值 = 误触，零副作用
      el.classList.remove('qs-tile-dragging');
      el.style.transform = '';
      // DOM 实序写回（dataset.tileId 为准，与 tile.id 弱同步：缺名跳过）
      const domOrder = [...grid.children].map((c) => c.dataset.tileId).filter(Boolean);
      setQsActiveTiles(applyTileOrder(activeTiles, domOrder));
      persistTileOrder();
      renderEditTilesLists();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
  });
}

/** v7.62：尺寸手柄拖拽绑定（pointer 捕获 + 位移钳制预览 + 松手阈值判定） */
function bindResizeHandle(handle, tileEl, tile) {
  let startX = 0, dragging = false, dx = 0;
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    startX = e.clientX;
    dx = 0;
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    tileEl.classList.add('resize-preview');
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = clampPreviewDx(e.clientX - startX);
    tileEl.style.transform = dx ? `translateX(${dx}px)` : '';
    // 越阈预告：将缩小时轻透 + 将放大时微亮，与真实系统反馈一致
    const r = resizeFromDrag(tile.size, dx);
    tileEl.classList.toggle('would-change', r.changed);
  });
  const finish = () => {
    if (!dragging) return;
    dragging = false;
    tileEl.classList.remove('resize-preview', 'would-change');
    tileEl.style.transform = '';
    const r = resizeFromDrag(tile.size, dx);
    if (r.changed) {
      saveEditHistory();
      tile.size = r.size;
      setQsTileSizes(setTileSize(tileSizes, tile.id, r.size));
      saveTileSizes(tileSizes, typeof localStorage !== 'undefined' ? localStorage : null);
      if (navigator.vibrate) navigator.vibrate(18);
    }
    renderEditTilesLists(); // 重建以切换 1×1/2×1 结构
  };
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', finish);
}
