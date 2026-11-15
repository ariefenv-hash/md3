#!/usr/bin/env python3
# surgery-v1146-qs-edit.py — #284 批22：quick-settings.js 磁贴编辑界面簇 → js/qs-edit.js（boundary-map §3.5 表第八行）
#
# 簇（v11.45 现树行号 1-based）：
#   L1235   banner「// ==================== 磁贴编辑界面 ====================」
#   L1237–1525  initEditTilesView / editViewHome / hostEditViewForCurrentMode /
#               openEditTilesView / closeEditTilesView / undoEditTiles / saveEditHistory /
#               renderEditTilesLists / persistTileOrder / bindTileDrag / bindResizeHandle
#               （共 289 行，结束于 bindResizeHandle 闭合，1526 起为电源对话框 banner）
#   L72     let editHistory = [];（簇唯一消费，随簇迁出——批19 qsRestorePage 单源随簇先例同律）
#
# 手术规则：簇体逐字节搬迁；语义差异三类（如实登记）：
#   ① initEditTilesView 加 export 前缀（宿主 init 调用回接）；
#   ② 宿主三态重赋值（activeTiles/availableCategories/tileSizes 的 `=`，撤销/Reset/拖拽落位/手柄共 8 处）
#      改经宿主访问器委托 setQsActiveTiles/setQsAvailableCategories/setQsTileSizes
#      （批19 get/setQsRestorePage 胶水先例同律；读与 splice/push 等原位变异仍走 import 活绑定零改动）；
#   ③ editHistory 模块态随簇迁出（消费面 100% 在簇内：open 清空/saveEditHistory/undo 弹栈）。
# 宿主保留：activeTiles/availableCategories/tileSizes 状态单源（G2 表不复制）+
#           三访问器胶水 + init/open 两调用点 import 回接。
import re
import sys

SRC = 'ios-desktop/js/quick-settings.js'
DST = 'ios-desktop/js/qs-edit.js'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

def at(n0, expect):
    got = lines[n0 - 1]
    if expect not in got:
        print(f'FAIL 边界断言 L{n0}: 期望含 {expect!r}，实得 {got[:90]!r}')
        sys.exit(1)

# —— 边界断言（先于一切切割）——
at(72, 'let editHistory = [];')
at(1234, '')
at(1235, '// ==================== 磁贴编辑界面 ====================')
at(1237, 'function initEditTilesView() {')
at(1254, 'let editViewHome = null;')
at(1255, 'function hostEditViewForCurrentMode() {')
at(1274, 'export function openEditTilesView() {')
at(1283, 'export function closeEditTilesView() {')
at(1290, 'function undoEditTiles() {')
at(1302, 'function saveEditHistory() {')
at(1309, 'function renderEditTilesLists() {')
at(1425, 'function persistTileOrder() {')
at(1435, 'function bindTileDrag(el) {')
at(1488, 'function bindResizeHandle(handle, tileEl, tile) {')
at(1524, '}')
at(1525, '')
at(1526, '// ==================== 电源对话框')

# —— 切片 ——
cluster = lines[1234:1524]  # 0-based [1234, 1524) = L1235..1524
assert cluster[0].startswith('// ==================== 磁贴编辑界面'), cluster[0][:50]
assert cluster[-1] == '}', cluster[-1][:50]

# ① initEditTilesView 加 export
out = list(cluster)
hit = False
for i, ln in enumerate(out):
    if re.match(r'function initEditTilesView\(', ln):
        out[i] = ln.replace('function initEditTilesView', 'export function initEditTilesView', 1)
        hit = True
        break
assert hit, '簇内未找到 initEditTilesView'

# ② 重赋值 → 访问器委托（逐处替换，计数断言）
body = '\n'.join(out)
subs = [
    ('activeTiles = JSON.parse(JSON.stringify(lastState.activeTiles));',
     'setQsActiveTiles(JSON.parse(JSON.stringify(lastState.activeTiles)));'),
    ('availableCategories = JSON.parse(JSON.stringify(lastState.availableCategories));',
     'setQsAvailableCategories(JSON.parse(JSON.stringify(lastState.availableCategories)));'),
    ('activeTiles = JSON.parse(JSON.stringify(DEFAULT_ACTIVE_TILES));',
     'setQsActiveTiles(JSON.parse(JSON.stringify(DEFAULT_ACTIVE_TILES)));'),
    ('availableCategories = JSON.parse(JSON.stringify(DEFAULT_AVAILABLE_CATEGORIES));',
     'setQsAvailableCategories(JSON.parse(JSON.stringify(DEFAULT_AVAILABLE_CATEGORIES)));'),
    ('activeTiles = applyTileOrder(activeTiles, domOrder);',
     'setQsActiveTiles(applyTileOrder(activeTiles, domOrder));'),
    ('tileSizes = applyTileSizes(activeTiles, sizesFromTiles(activeTiles));',
     'setQsTileSizes(applyTileSizes(activeTiles, sizesFromTiles(activeTiles)));'),
    ('tileSizes = applyTileSizes(activeTiles, {}); // 出厂布局：Internet/Bluetooth/Modes 2×1，其余 1×1（FACTORY_TILE_SIZES）',
     'setQsTileSizes(applyTileSizes(activeTiles, {})); // 出厂布局：Internet/Bluetooth/Modes 2×1，其余 1×1（FACTORY_TILE_SIZES）'),
    ('tileSizes = setTileSize(tileSizes, tile.id, r.size);',
     'setQsTileSizes(setTileSize(tileSizes, tile.id, r.size));'),
]
cnt = 0
for old, new in subs:
    n = body.count(old)
    assert n == 1, f'重赋值替换计数异常({n}): {old[:60]}'
    body = body.replace(old, new, 1)
    cnt += n
assert cnt == 8, f'重赋值总数应为 8，实得 {cnt}'

# ③ editHistory 模块态随簇迁入（插在 banner 头注后、第一个函数前）
QSEDIT_HEAD = '''// ==================== qs-edit.js — #284 批22（v11.46）：磁贴编辑界面 单源 ====================
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

'''

# 在迁移体中剥去原 editViewHome 头注前的 editHistory 引用检查：迁移体内 editHistory 引用
# 应全部为 saveEditHistory/undoEditTiles/openEditTilesView 函数体内（调用期）——逐字节保留。
final_body = body
assert final_body.count('editHistory') >= 3, 'editHistory 引用守恒检查失败'

with open(DST, 'w', encoding='utf-8') as f:
    f.write(QSEDIT_HEAD + final_body + '\n')

# —— 宿主侧 ——
# ① 删除簇体 L1235–1524（保留 L1234 空行，L1525 空行 + L1526 电源 banner）
new_lines = lines[:1234] + lines[1524:]
assert new_lines[1234] == '', '切割后首位应为空行'
assert new_lines[1235].startswith('// ==================== 电源对话框'), new_lines[1235][:60]
# ② 删除宿主 editHistory 行（L72），补三访问器胶水（紧随 tileSizes 状态行后）
assert new_lines[71] == 'let editHistory = [];'
glue = [
    '// #284 批22（v11.46）：磁贴编辑界面簇归源 qs-edit.js（表第八行）——宿主三态重赋值经访问器委托',
    '// （批19 get/setQsRestorePage 胶水先例同律）；editHistory 模块态随簇迁出（消费面 100% 在簇内）。',
    'export function setQsActiveTiles(next) { activeTiles = next; } // 批22 桥接面：qs-edit 撤销/Reset/拖拽落位重赋值委托',
    'export function setQsAvailableCategories(next) { availableCategories = next; } // 批22 桥接面：qs-edit 撤销/Reset 重赋值委托',
    'export function setQsTileSizes(next) { tileSizes = next; } // 批22 桥接面：qs-edit 撤销/Reset/手柄重赋值委托（与 qs-tiles.setTileSize 单磁贴写点区分）',
]
new_lines = new_lines[:71] + glue + new_lines[72:]

text = '\n'.join(new_lines)

# ③ import 回接（挂在 qs-zen 转出口块之后）
anchor = "export { setBatterySaverActive, restoreBatterySaverState }; // 批21 转出口公共面零变化（widget-board import / settings-battery 动态 import 同链）"
if anchor not in text:
    print('FAIL: 批21 转出口锚未找到')
    sys.exit(1)
text = text.replace(
    anchor,
    anchor + "\n// #284 批22（v11.46）：磁贴编辑界面簇单源迁 js/qs-edit.js（§3.5 表第八行）——\n"
    "// init（L122 绑定）/open（铅笔按钮）两调用点 import 回接；close 消费面 100% 在簇内（backBtn 绑定随簇）。\n"
    "import { initEditTilesView, openEditTilesView, closeEditTilesView } from './qs-edit.js';",
    1,
)

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(text)

# —— 完整性核对 ——
final = open(SRC, encoding='utf-8').read().split('\n')
moved = open(DST, encoding='utf-8').read()
print('宿主行数:', len(final), '（1749 - 291 - 1 editHistory + 9 胶水 + 4 import/注释）')
print('qs-edit 行数:', len(moved.split('\n')))
for sym in ['initEditTilesView', 'hostEditViewForCurrentMode', 'openEditTilesView', 'closeEditTilesView',
            'undoEditTiles', 'saveEditHistory', 'renderEditTilesLists', 'persistTileOrder',
            'bindTileDrag', 'bindResizeHandle', 'editViewHome', 'editHistory']:
    assert sym in moved, f'qs-edit 缺 {sym}'
host_hits = {s: sum(1 for l in final if s in l) for s in
             ['initEditTilesView', 'openEditTilesView', 'closeEditTilesView', 'editHistory',
              'renderEditTilesLists', 'persistTileOrder']}
print('宿主残留行:', host_hits)
assert host_hits['initEditTilesView'] == 2, '宿主应剩 import+调用 2 行'   # import 行 + init 调用
assert host_hits['openEditTilesView'] == 2, '宿主应剩 import+铅笔调用 2 行'
assert host_hits['closeEditTilesView'] == 1, '宿主应剩 import 1 行'
assert not any('let editHistory' in l for l in final), '宿主 editHistory 状态行应零残留（注释提及豁免）'
assert host_hits['renderEditTilesLists'] == 0, '宿主渲染函数应零残留'
assert host_hits['persistTileOrder'] == 0, '宿主持久化函数应零残留'
assert 'function renderEditTilesLists' not in '\n'.join(final), '宿主残留渲染函数定义'
print('SURGERY OK')
