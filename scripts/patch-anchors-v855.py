#!/usr/bin/env python3
# ==================== patch-anchors-v855.py — v8.55 #62 驾考题库历史锚批更新 ====================
# 45 应用 / 36 命令 / 图标动态色 236→241 / iframe 应用 33→34 / 持久化 ids[44]
# 每处替换断言恰一次命中（防错杀/防漏补），任一失败即整体退出非零。
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

# ---------- v836 reaction：apps-data 末位正则 ----------
patch(T('v836-reaction-app.test.js'), [
    ("expect(appsData).toMatch(/installer, reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio,\\n\\]/); // v8.54 #61 radio 入列末位",
     "expect(appsData).toMatch(/installer, reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio, driving,\\n\\]/); // v8.55 #62 driving 入列末位"),
])

# ---------- v840 terminal：命令 36 / 应用组 9 / APPS 45 / neofetch 37 / 末位正则 ----------
patch(T('v840-terminal.test.js'), [
    ("//     （议题验收：30+ 命令带单测锚；open 可启动全部 36 内置应用；无状态残留）",
     "//     （议题验收：30+ 命令带单测锚；open 可启动全部 37 内置应用；无状态残留）"),
    ("expect(names.length).toBe(35);", "expect(names.length).toBe(36);"),
    ("'uname', 'notify', 'exit', 'apps', 'beat', 'code', 'ocr', 'stt', 'radio'];",
     "'uname', 'notify', 'exit', 'apps', 'beat', 'code', 'ocr', 'stt', 'radio', 'driving'];"),
    ("expect(must.length).toBe(35);", "expect(must.length).toBe(36);"),
    ("it('分组：文件系统 11 + 文本 4 + 系统 12 + 应用 8（v8.54 #61 radio 入列）', () => {",
     "it('分组：文件系统 11 + 文本 4 + 系统 12 + 应用 9（v8.55 #62 driving 入列）', () => {"),
    ("expect(byGroup['应用']).toBe(8);", "expect(byGroup['应用']).toBe(9);"),
    ("describe('v8.40 #25 core：open 深链映射（36 应用全覆盖验收锚）', () => {",
     "describe('v8.40 #25 core：open 深链映射（37 应用全覆盖验收锚）', () => {"),
    ("it('APPS 恰 44 项；APP_NAMES id→中文名全覆盖且非空（v8.54 #61 radio 入列）', () => {\n    expect(core.APPS.length).toBe(44);",
     "it('APPS 恰 45 项；APP_NAMES id→中文名全覆盖且非空（v8.55 #62 driving 入列）', () => {\n    expect(core.APPS.length).toBe(45);"),
    ("it('映射对拍：apps/*.js 全部 44 个 id 都可被 open 启动（v8.54 #61 radio 入列）', () => {",
     "it('映射对拍：apps/*.js 全部 45 个 id 都可被 open 启动（v8.55 #62 driving 入列）', () => {"),
    ("expect(ids.length).toBe(44);", "expect(ids.length).toBe(45);"),
    ("const rows = core.renderNeofetch({ apps: 36,", "const rows = core.renderNeofetch({ apps: 37,"),
    ("expect(joined).toContain('36 installed');", "expect(joined).toContain('37 installed');"),
    ("expect(rows).toHaveLength(44);", "expect(rows).toHaveLength(45);"),
    (r"expect(src).toMatch(/reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio,\s*\n\];/);",
     r"expect(src).toMatch(/reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio, driving,\s*\n\];/);"),
])

# ---------- v841-v844 / v851：APPS 45 + 图标总数 241 + 末位正则 ----------
for name, apps_line_old, apps_line_new in [
    ('v841-piano.test.js',
     "expect(ctx2.window.__terminalCore.APPS.length).toBe(44);",
     "expect(ctx2.window.__terminalCore.APPS.length).toBe(45);"),
    ('v842-bytebeat.test.js',
     "expect(tc.APPS.length).toBe(44);",
     "expect(tc.APPS.length).toBe(45);"),
    ('v843-python.test.js',
     "expect(tc.APPS.length).toBe(44);",
     "expect(tc.APPS.length).toBe(45);"),
    ('v844-ping.test.js',
     "expect(tc.APPS.length).toBe(44);",
     "expect(tc.APPS.length).toBe(45);"),
    ('v851-midi-player.test.js',
     "expect(tc.APPS.length).toBe(44);",
     "expect(tc.APPS.length).toBe(45);"),
]:
    patch(T(name), [
        (r"reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio,\s*\n\];",
         r"reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio, driving,\s*\n\];"),
        (apps_line_old, apps_line_new),
    ])

# 图标全库总数 236→241（title + 断言，五套件内嵌）
icon_total_subs = [
    ("it('app-icons fixture：piano 条目 6 处动态色（总数 236 · v8.54 radio +5）', () => {",
     "it('app-icons fixture：piano 条目 6 处动态色（总数 241 · v8.55 driving +5）', () => {"),
    ("it('icon fixture：bytebeat 10 处动态色 · 全库总数 236（v8.54 radio +5）', () => {",
     "it('icon fixture：bytebeat 10 处动态色 · 全库总数 241（v8.55 driving +5）', () => {"),
    ("it('icon fixture：python 7 处动态色 · 全库总数 236（v8.54 radio +5）', () => {",
     "it('icon fixture：python 7 处动态色 · 全库总数 241（v8.55 driving +5）', () => {"),
    ("it('icon fixture：ping 7 处动态色 · 全库总数 236（v8.54 radio +5）', () => {",
     "it('icon fixture：ping 7 处动态色 · 全库总数 241（v8.55 driving +5）', () => {"),
    ("it('icon fixture：midi-player 条目 5 处动态色（全库 236 · v8.54 radio +5）', () => {",
     "it('icon fixture：midi-player 条目 5 处动态色（全库 241 · v8.55 driving +5）', () => {"),
]
patch(T('v841-piano.test.js'), icon_total_subs[0:1] + [("expect(total).toBe(236);", "expect(total).toBe(241);")])
patch(T('v842-bytebeat.test.js'), icon_total_subs[1:2] + [("expect(total).toBe(236);", "expect(total).toBe(241);")])
patch(T('v843-python.test.js'), icon_total_subs[2:3] + [("expect(total).toBe(236);", "expect(total).toBe(241);")])
patch(T('v844-ping.test.js'), icon_total_subs[3:4] + [("expect(total).toBe(236);", "expect(total).toBe(241);")])
patch(T('v851-midi-player.test.js'), icon_total_subs[4:5] + [("expect(total).toBe(236);", "expect(total).toBe(241);")])

# ---------- v850 / v852 / v853 / v854 ----------
patch(T('v850-code-editor.test.js'), [
    (r"expect(APPSDATA_SRC).toMatch(/ping, codeEditor, midiPlayer, ocr, stt, radio,\n\];/);",
     r"expect(APPSDATA_SRC).toMatch(/ping, codeEditor, midiPlayer, ocr, stt, radio, driving,\n\];/);"),
])
patch(T('v852-ocr.test.js'), [
    ("expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(8);   // open/apps/print/beat/code/ocr/stt/radio — 应用组 8 条",
     "expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(9);   // open/apps/print/beat/code/ocr/stt/radio/driving — 应用组 9 条"),
])
patch(T('v853-stt.test.js'), [
    ("expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(8);   // open/apps/print/beat/code/ocr/stt/radio — 应用组 8 条",
     "expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(9);   // open/apps/print/beat/code/ocr/stt/radio/driving — 应用组 9 条"),
    ("describe('v8.53 #59 注册链（stt 系第 43 应用 · radio 后全库 44）', () => {",
     "describe('v8.53 #59 注册链（stt 系第 43 应用 · driving 后全库 45）', () => {"),
])
patch(T('v854-radio.test.js'), [
    ("expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(8);   // open/apps/print/beat/code/ocr/stt/radio — 应用组 8 条",
     "expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(9);   // open/apps/print/beat/code/ocr/stt/radio/driving — 应用组 9 条"),
    ("describe('v8.54 #61 注册链（第 44 应用）', () => {",
     "describe('v8.54 #61 注册链（radio 系第 44 应用 · driving 后全库 45）', () => {"),
    ("it('apps-data.js 导入 + 第 2 页数组末位（第 44 位）', () => {\n    expect(APPSDATA_SRC.includes('midiPlayer, ocr, stt, radio,')).toBe(true);",
     "it('apps-data.js 导入 + 第 2 页数组（radio 系第 44 位 · v8.55 driving 末位）', () => {\n    expect(APPSDATA_SRC.includes('midiPlayer, ocr, stt, radio, driving,')).toBe(true);"),
])

# ---------- md3-tokens：iframe 应用 33→34 ----------
patch(T('md3-tokens.test.js'), [
    ("it('全部 iframe 应用挂载 _shared/md3-tokens.css（v8.54 #61 radio 入列）', () => {\n    const apps = iframeApps();\n    expect(apps.length).toBe(33);",
     "it('全部 iframe 应用挂载 _shared/md3-tokens.css（v8.55 #62 driving 入列）', () => {\n    const apps = iframeApps();\n    expect(apps.length).toBe(34);"),
])

# ---------- app-icons：动态声明总数 236→241 ----------
patch(T('app-icons.test.js'), [
    ("expect(checked.length).toBe(236);", "expect(checked.length).toBe(241);"),
    ("    // v8.54 #61：radio 图标 5 处补录 fixture 后 231 → 236\n    const total = (iconsSrc.match(/(?:fill|stroke):hsl\\(/g) || []).length;\n    expect(total).toBe(236);",
     "    // v8.54 #61：radio 图标 5 处补录 fixture 后 231 → 236\n    // v8.55 #62：driving 图标 5 处补录 fixture 后 236 → 241\n    const total = (iconsSrc.match(/(?:fill|stroke):hsl\\(/g) || []).length;\n    expect(total).toBe(241);"),
])

# ---------- scenario-persistence：ids[44] + 45 应用 + 溢出 21 ----------
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

print('\n全部历史锚更新完成 ✓')
