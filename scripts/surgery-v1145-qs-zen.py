#!/usr/bin/env python3
# surgery-v1145-qs-zen.py — #284 批21：quick-settings.js ZenDeviceEffects+ScheduleCalendar 规则 eval+电池节省簇 → js/qs-zen.js（boundary-map §3.5 表第五行）
#
# 簇（v11.44 现树行号 1-based）：
#   L888   banner「// ==================== v9.94 #198 ZenDeviceEffects overlay + ScheduleCalendar 规则 eval ====================」
#   L890–1008  applyZenDeviceEffects / zenEvalRulesTick / __zenDebug 观测桥 /
#              DND_SET·DND_GET 宿主消息面 / BATTERY_SAVER_KEY /
#              setBatterySaverActive / restoreBatterySaverState（共 121 行）
# 宿主保留：setDndActive / setDndExternalSource / applyDndEffective（DND 状态机段，表第四行 qs-actions 车道）、
#           syncTileState / showSystemToast、initQuickSettings 内三调用点与 60s setInterval 接线。
#
# 手术规则：簇体逐字节搬迁，唯一语义差异 = applyZenDeviceEffects / zenEvalRulesTick
# 加 `export` 前缀（setBatterySaverActive / restoreBatterySaverState 原生已 export）；
# 宿主 import 回接 + setBatterySaverActive/restoreBatterySaverState 转出口 +
# applyDndEffective 补 export 桥接面（qs-zen 活绑定消费，ESM 循环 import 同 qs-sheets 先例）。
import re
import sys

SRC = 'ios-desktop/js/quick-settings.js'
DST = 'ios-desktop/js/qs-zen.js'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

def at(n0, expect):
    got = lines[n0 - 1]
    if expect not in got:
        print(f'FAIL 边界断言 L{n0}: 期望含 {expect!r}，实得 {got[:90]!r}')
        sys.exit(1)

# —— 边界断言（先于一切切割）——
at(886, '}')
at(887, '')
at(888, '// ==================== v9.94 #198 ZenDeviceEffects overlay + ScheduleCalendar 规则 eval ====================')
at(892, 'function applyZenDeviceEffects() {')
at(893, 'zen-device-effects')
at(913, 'function zenEvalRulesTick() {')
at(927, "window.__zenDebug = {")
at(948, "d.type === 'DND_SET'")
at(968, "const BATTERY_SAVER_KEY = 'ios-desktop:battery-saver';")
at(975, 'export function setBatterySaverActive(')
at(1002, 'export function restoreBatterySaverState() {')
at(1008, '}')
at(1009, '')
at(1010, '/** 程序化同步磁贴状态与副标题')

# —— 切片：L888–1008（0-based [887, 1008)）——
cluster = lines[887:1008]
assert cluster[0].startswith('// ==================== v9.94 #198'), cluster[0][:60]
assert cluster[-1] == '}', cluster[-1][:60]

# —— 唯一语义差异：两个函数加 export 前缀 ——
def to_export(body, name):
    out = list(body)
    for i, ln in enumerate(out):
        if re.match(r'function ' + name + r'\(', ln):
            out[i] = ln.replace('function ' + name, 'export function ' + name, 1)
            break
    else:
        print(f'FAIL: 簇内未找到 function {name}')
        sys.exit(1)
    return out

cluster = to_export(cluster, 'applyZenDeviceEffects')
cluster = to_export(cluster, 'zenEvalRulesTick')
assert sum(1 for l in cluster if l.startswith('export ')) == 4, 'export 数应为 4（两新+两原生）'

QSZEN_HEAD = '''// ==================== qs-zen.js — #284 批21（v11.45）：ZenDeviceEffects overlay + ScheduleCalendar 规则 eval + 电池节省 单源 ====================
// 簇体自 quick-settings.js 逐字节迁出（boundary-map §3.5 表第五行 · 121 行），
// 唯一语义差异 = applyZenDeviceEffects / zenEvalRulesTick 加 export 前缀（宿主回接）。
// 宿主共享态/函数桥：ESM 循环 import 活绑定（qs-sheets 批20 同律）——本模块顶层零绑定消费
// 无 TDZ，全部引用发生在调用期（initQuickSettings 调用 / __zenDebug 闭包 / message 回调 /
// 磁贴动作分发）。DND 状态机段（setDndActive/setDndExternalSource/applyDndEffective）留宿主
// （表第四行 qs-actions 车道待单独考证），本模块经宿主桥接面活绑定消费。
// aosp/zen-mode.js 纯逻辑单例（zenStore/isZenActive/deviceEffectsOverlayStyle/ZEN_DEVICE_EFFECT）
// 直接 import（AOSP ScheduleConditionProvider / ZenDeviceEffects 13 位语义锚随簇在录）。
import { zenStore, isZenActive, deviceEffectsOverlayStyle, ZEN_DEVICE_EFFECT } from './aosp/zen-mode.js';
import { ICONS } from './icons.js';
import { activeTiles, renderQuickSettingsGrid, showSystemToast, setDndActive, setDndExternalSource, applyDndEffective } from './quick-settings.js';
'''

with open(DST, 'w', encoding='utf-8') as f:
    f.write(QSZEN_HEAD + '\n'.join(cluster) + '\n')

# —— 宿主侧：删除簇体（含尾随空行 L1009，避免双空行），插入 import 回接 ——
new_lines = lines[:887] + lines[1008:]
# lines[:887] = L1..887（保留 887 空行）；lines[1008:] = L1009 空行起 → 去掉首空行留单空行
assert new_lines[887] == '', '切割后 L888 应为空行'
assert new_lines[888].startswith('/** 程序化同步磁贴状态与副标题'), new_lines[888][:60]

text = '\n'.join(new_lines)

# ① import 回接（挂在 qs-sheets import 块之后；qs-pages import 面收窄注释行后）
anchor = "import { openQsSheet, quantizeCounterScale, closeQsSheet, openNetworkSheet, openBluetoothSheet, openModesSheet } from './qs-sheets.js';"
if anchor not in text:
    print('FAIL: qs-pages import 锚未找到')
    sys.exit(1)
text = text.replace(
    anchor,
    anchor + "\n// #284 批21（v11.45）：ZenDeviceEffects overlay + 规则 eval + 电池节省簇归源 qs-zen.js（表第五行）；"
    "DND 状态机段（setDndActive/setDndExternalSource/applyDndEffective）留宿主待 qs-actions 车道\n"
    "import { applyZenDeviceEffects, zenEvalRulesTick } from './qs-zen.js'; // 簇迁出回接（init 存档恢复/60s tick 接线/applyDndEffective 生效面宿主内消费）",
    1,
)

# ② setBatterySaverActive/restoreBatterySaverState 转出口（widget-board/settings-battery 消费面零变化）
anchor2 = "export { openQsSheet, quantizeCounterScale, closeQsSheet };"
if anchor2 not in text:
    print('FAIL: 转出口锚未找到')
    sys.exit(1)
text = text.replace(
    anchor2,
    anchor2 + "\nimport { setBatterySaverActive, restoreBatterySaverState } from './qs-zen.js'; // 簇迁出回接（磁贴动作 L658 / 启动恢复 L106 宿主内消费）\nexport { setBatterySaverActive, restoreBatterySaverState }; // 批21 转出口公共面零变化（widget-board import / settings-battery 动态 import 同链）",
    1,
)

# ③ applyDndEffective 补 export 桥接面
old_fn = 'function applyDndEffective({ silent = false, toast = false, toastActive = false } = {}) {'
new_fn = 'export function applyDndEffective({ silent = false, toast = false, toastActive = false } = {}) { // 批21 桥接面：qs-zen 规则 tick / 消息面活绑定消费'
if old_fn not in text:
    print('FAIL: applyDndEffective 签名未找到')
    sys.exit(1)
text = text.replace(old_fn, new_fn, 1)

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(text)

# —— 完整性核对 ——
final = open(SRC, encoding='utf-8').read().split('\n')
moved = open(DST, encoding='utf-8').read()
print('宿主行数:', len(final), '（1866 - 121 + 新增桥接行）')
print('qs-zen 行数:', len(moved.split('\n')))
for sym in ['applyZenDeviceEffects', 'zenEvalRulesTick', '__zenDebug', 'DND_SET', 'BATTERY_SAVER_KEY', 'setBatterySaverActive', 'restoreBatterySaverState']:
    assert sym in moved, f'qs-zen 缺 {sym}'
    host_hits = sum(1 for l in final if sym in l)
    print(f'{sym}: qs-zen ✓ / 宿主残留行 {host_hits}')
assert 'function applyZenDeviceEffects' not in '\n'.join(final).replace('export function applyZenDeviceEffects', ''), '宿主残留 applyZenDeviceEffects 定义'
print('SURGERY OK')
