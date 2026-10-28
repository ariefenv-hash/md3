#!/usr/bin/env python3
# ==================== patch-anchors-v855b.py — v8.55 历史锚批更新（续：v854/md3-tokens/app-icons/persistence） ====================
# 主脚本 patch-anchors-v855.py 在 v854 处中止（锚块含 import 行），本脚本处理剩余 4 文件。
import os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
T = lambda name: os.path.join(ROOT, 'tests', name)

def patch(path, subs):
    with open(path, encoding='utf-8') as f:
        src = f.read()
    for old, new in subs:
        n = src.count(old)
        if n != 1:
            print(f'FAIL {os.path.basename(path)}: 命中 {n} 次（应为 1）: {old[:70]!r}')
            sys.exit(1)
        src = src.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f'OK   {os.path.basename(path)} ({len(subs)} 处)')

patch(T('v854-radio.test.js'), [
    ("expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(8);   // open/apps/print/beat/code/ocr/stt/radio — 应用组 8 条",
     "expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(9);   // open/apps/print/beat/code/ocr/stt/radio/driving — 应用组 9 条"),
    ("describe('v8.54 #61 注册链（第 44 应用）', () => {",
     "describe('v8.54 #61 注册链（radio 系第 44 应用 · driving 后全库 45）', () => {"),
    ("it('apps-data.js 导入 + 第 2 页数组末位（第 44 位）', () => {\n    expect(APPSDATA_SRC.includes(\"import radio from './apps/radio.js'\")).toBe(true);\n    expect(APPSDATA_SRC.includes('midiPlayer, ocr, stt, radio,')).toBe(true);",
     "it('apps-data.js 导入 + 第 2 页数组（radio 系第 44 位 · v8.55 driving 末位）', () => {\n    expect(APPSDATA_SRC.includes(\"import radio from './apps/radio.js'\")).toBe(true);\n    expect(APPSDATA_SRC.includes('midiPlayer, ocr, stt, radio, driving,')).toBe(true);"),
])

patch(T('md3-tokens.test.js'), [
    ("it('全部 iframe 应用挂载 _shared/md3-tokens.css（v8.54 #61 radio 入列）', () => {\n    const apps = iframeApps();\n    expect(apps.length).toBe(33);",
     "it('全部 iframe 应用挂载 _shared/md3-tokens.css（v8.55 #62 driving 入列）', () => {\n    const apps = iframeApps();\n    expect(apps.length).toBe(34);"),
])

patch(T('app-icons.test.js'), [
    ("expect(checked.length).toBe(236);", "expect(checked.length).toBe(241);"),
    ("    // v8.54 #61：radio 图标 5 处补录 fixture 后 231 → 236\n    const total = (iconsSrc.match(/(?:fill|stroke):hsl\\(/g) || []).length;\n    expect(total).toBe(236);",
     "    // v8.54 #61：radio 图标 5 处补录 fixture 后 231 → 236\n    // v8.55 #62：driving 图标 5 处补录 fixture 后 236 → 241\n    const total = (iconsSrc.match(/(?:fill|stroke):hsl\\(/g) || []).length;\n    expect(total).toBe(241);"),
])

patch(T('scenario-persistence.test.js'), [
    ("expect(flatIds.length).toBe(44);\n    expect(flatIds).toContain(ids[30]);",
     "expect(flatIds.length).toBe(45);\n    expect(flatIds).toContain(ids[30]);"),
    ("expect(flatIds).toContain(ids[43]);           // v8.54 #61 radio 同批追加",
     "expect(flatIds).toContain(ids[43]);           // v8.54 #61 radio 同批追加\n    expect(flatIds).toContain(ids[44]);           // v8.55 #62 driving 同批追加"),
    ("const lastPage = state.pagesApps[state.pagesApps.length - 1];\n    expect(lastPage[lastPage.length - 1].id).toBe(ids[43]);",
     "const lastPage = state.pagesApps[state.pagesApps.length - 1];\n    expect(lastPage[lastPage.length - 1].id).toBe(ids[44]);"),
    ("const flatIds = state.pagesApps.flat().map((a) => a.id);\n    expect(flatIds.length).toBe(43);\n    expect(flatIds).not.toContain(ids[30]);",
     "const flatIds = state.pagesApps.flat().map((a) => a.id);\n    expect(flatIds.length).toBe(44);\n    expect(flatIds).not.toContain(ids[30]);"),
    ("// 第 1 页 24 个真实应用 + 第 2 页 24 个未知 id（模拟满页自定义内容）→ 剩余 20 个溢出第 3 页",
     "// 第 1 页 24 个真实应用 + 第 2 页 24 个未知 id（模拟满页自定义内容）→ 剩余 21 个溢出第 3 页"),
    ("expect(state.pagesApps[2].length).toBe(20);", "expect(state.pagesApps[2].length).toBe(21);"),
])

print('\n剩余历史锚更新完成 ✓')
