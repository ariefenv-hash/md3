#!/usr/bin/env python3
# surgery-v1139-qs-tiles.py — #284 批17：quick-settings.js 磁贴表常量簇 → js/qs-tiles.js（G1 表先行样例）
#
# 簇（boundary-map §3.5 表首行 · v11.38 现树行号 1-based）：
#   L51  注释「// 初始默认已激活磁贴」
#   L52–72   DEFAULT_ACTIVE_TILES（26 贴）
#   L74–99   DEFAULT_AVAILABLE_CATEGORIES（双分类编辑池）
#   L106–108 ENV_DEPENDENT_TILES（#201 环境依赖五贴，含双行头注）
# 宿主保留：activeTiles/availableCategories/editHistory/tileSizes 状态行、
#           TILE_LONG_CLICK_SHEET（宿主函数引用）、mdTilePalette（DOM 耦合，异批）。
#
# 手术规则：簇体逐字节搬迁，唯一语义差异 = `const` → `export const`；
# 宿主 import 扩展三常量 + 簇体删除；消费点（init 浅/深拷贝 · reset · 广播循环）零改动。
import re
import sys

SRC = 'ios-desktop/js/quick-settings.js'
DST = 'ios-desktop/js/qs-tiles.js'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

def at(n0, expect):
    got = lines[n0 - 1]
    if expect not in got:
        print(f'FAIL 边界断言 L{n0}: 期望含 {expect!r}，实得 {got[:80]!r}')
        sys.exit(1)

at(51, '// 初始默认已激活磁贴')
at(52, 'const DEFAULT_ACTIVE_TILES = [')
at(72, '];')
at(74, 'const DEFAULT_AVAILABLE_CATEGORIES = [')
at(99, '];')
at(106, '// v9.94 #201：环境依赖磁贴清单')
at(107, 'torch')
at(108, "const ENV_DEPENDENT_TILES = ['cast', 'quick_share', 'vpn', 'internet', 'torch'];")
at(109, '// v9.94 #201 长按目的地表')
at(110, 'const TILE_LONG_CLICK_SHEET = {')

c_active = lines[50:72]        # L51-72（注释+表）
c_categ  = lines[73:99]        # L74-99
c_env    = lines[105:108]      # L106-108（双行头注+表）

def to_export(body, name):
    out = list(body)
    for i, ln in enumerate(out):
        if re.match(r'\s*const ' + name + r'\b', ln):
            out[i] = ln.replace('const ' + name, 'export const ' + name, 1)
            break
    else:
        print(f'FAIL: 簇内未找到 const {name}')
        sys.exit(1)
    return out

e_active = to_export(c_active, 'DEFAULT_ACTIVE_TILES')
e_categ  = to_export(c_categ, 'DEFAULT_AVAILABLE_CATEGORIES')
e_env    = to_export(c_env, 'ENV_DEPENDENT_TILES')

QSTAIL = '''
// ==================== #284 批17（v11.39）：磁贴注册表常量簇单源（G1 表先行样例 · boundary-map §3.5 表首行） ====================
// 自 quick-settings.js L51-108 逐字节搬迁（唯一语义差异 = const → export const）；
// 本模块章程「只承载模型与判定（无 DOM 依赖）」兼容——三表为纯数据注册表：
//   · DEFAULT_ACTIVE_TILES —— 初始默认已激活磁贴 26 贴（A17 出厂激活族同量级，#321 考证在案）
//   · DEFAULT_AVAILABLE_CATEGORIES —— 编辑器可选池双分类（Accessibility / From system apps）
//   · ENV_DEPENDENT_TILES —— v9.94 #201 环境依赖磁贴清单（refreshState 广播目标——
//     飞行模式→射频链路四贴；省电模式→torch 受管 disabledByPolicy 通道）
// quick-settings.js 消费点（init 浅/深拷贝 L101-102 · 编辑器 reset 深拷贝 · 广播循环）零改动；
// TILE_LONG_CLICK_SHEET（宿主函数引用）与 mdTilePalette（DOM 耦合）留宿主异批。

'''

with open(DST, 'r', encoding='utf-8') as f:
    qsrc = f.read()
new_q = qsrc.rstrip('\n') + '\n' + QSTAIL + '\n'.join(e_active) + '\n\n' + '\n'.join(e_categ) + '\n\n' + '\n'.join(e_env) + '\n'

# 宿主：import 扩展 + 簇体删除
imp_anchor = "import { QS_TILE_SIZES, loadTileSizes, saveTileSizes, applyTileSizes, sizesFromTiles, setTileSize, resizeFromDrag, clampPreviewDx, QS_TILE_ORDER_KEY, loadTileOrder, saveTileOrder, applyTileOrder, reorderTiles } from './qs-tiles.js';"
idx = None
for i, ln in enumerate(lines):
    if ln.rstrip() == imp_anchor:
        idx = i
        break
if idx is None:
    print('FAIL: qs-tiles import 锚行未命中')
    sys.exit(1)
lines[idx] = ("// #284 批17（v11.39）：磁贴注册表常量簇单源入列（G1 表先行样例 · boundary-map §3.5）——\n"
              "// DEFAULT_ACTIVE_TILES/DEFAULT_AVAILABLE_CATEGORIES/ENV_DEPENDENT_TILES 自本文件迁 qs-tiles.js（const→export 唯一差异）\n"
              + imp_anchor.replace("import { QS_TILE_SIZES,", "import {\n  DEFAULT_ACTIVE_TILES, DEFAULT_AVAILABLE_CATEGORIES, ENV_DEPENDENT_TILES,\n  QS_TILE_SIZES,"))

# 删除簇体（L51-108 内的三段，保留 L100-105 状态行与 L109+ 长按表）
keep = lines[:50] + lines[idx + 1:105 - 1 + 1] + []  # 占位：下面按精确区间拼
# 精确重拼：0-based
new_lines = (
    lines[:50]            # 1-50（含 import 区，import 行已替换）
    + lines[99:105]       # L100-105：状态行（activeTiles/availableCategories/editHistory/tileSizes）+ 空行
    + lines[108:]         # L109+：长按表起
)
new_src = '\n'.join(new_lines)

# ---- 回读终验 ----
assert new_src.count('DEFAULT_ACTIVE_TILES') == 4, new_src.count('DEFAULT_ACTIVE_TILES')   # import+注记 + init 浅拷贝 + reset 深拷贝
assert new_src.count('DEFAULT_AVAILABLE_CATEGORIES') == 4
assert new_src.count('ENV_DEPENDENT_TILES') == 3   # import+注记 + 广播循环
assert 'const DEFAULT_ACTIVE_TILES' not in new_src
assert 'const ENV_DEPENDENT_TILES' not in new_src
assert 'const TILE_LONG_CLICK_SHEET' in new_src     # 长按表留宿主
assert 'function mdTilePalette()' in new_src        # 调色板留宿主（异批）
assert new_q.count('export const DEFAULT_ACTIVE_TILES') == 1
assert new_q.count('export const DEFAULT_AVAILABLE_CATEGORIES') == 1
assert new_q.count('export const ENV_DEPENDENT_TILES') == 1

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(new_src)
with open(DST, 'w', encoding='utf-8') as f:
    f.write(new_q)

print('OK 常量簇搬迁完成')
print('  quick-settings.js 行数:', len(lines), '->', len(new_lines))
print('  qs-tiles.js 行数:', len(qsrc.split('\n')), '->', len(new_q.split('\n')))
