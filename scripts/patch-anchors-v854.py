#!/usr/bin/env python3
# ==================== patch-anchors-v854.py — v8.54 #61 收音机历史锚批更新 ====================
# 44 应用 / 35 命令 / 图标动态色 231→234 / 令牌挂载 32→33 / 持久化 ids[43]
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

# ---------- v836 reaction：apps-data 末位正则 + radio ----------
patch(T('v836-reaction-app.test.js'), [
    (r"expect(appsData).toMatch(/installer, reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt,\n\]/); // v8.52 #58 ocr 入列末位",
     r"expect(appsData).toMatch(/installer, reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio,\n\]/); // v8.54 #61 radio 入列末位"),
])

# ---------- v840 terminal：命令 35 / 应用组 8 / APPS 44 / neofetch 36 / 末位正则 ----------
patch(T('v840-terminal.test.js'), [
    ("//     （议题验收：30+ 命令带单测锚；open 可启动全部 35 内置应用；无状态残留）",
     "//     （议题验收：30+ 命令带单测锚；open 可启动全部 36 内置应用；无状态残留）"),
    ("expect(names.length).toBe(34);", "expect(names.length).toBe(35);"),
    ("'uname', 'notify', 'exit', 'apps', 'beat', 'code', 'ocr', 'stt'];",
     "'uname', 'notify', 'exit', 'apps', 'beat', 'code', 'ocr', 'stt', 'radio'];"),
    ("expect(must.length).toBe(34);", "expect(must.length).toBe(35);"),
    ("it('分组：文件系统 11 + 文本 4 + 系统 12 + 应用 5（v8.50 #32 code 入列）', () => {",
     "it('分组：文件系统 11 + 文本 4 + 系统 12 + 应用 8（v8.54 #61 radio 入列）', () => {"),
    ("expect(byGroup['应用']).toBe(7);", "expect(byGroup['应用']).toBe(8);"),
    ("describe('v8.40 #25 core：open 深链映射（35 应用全覆盖验收锚）', () => {",
     "describe('v8.40 #25 core：open 深链映射（36 应用全覆盖验收锚）', () => {"),
    ("it('APPS 恰 42 项；APP_NAMES id→中文名全覆盖且非空（v8.52 #58 ocr 入列）', () => {\n    expect(core.APPS.length).toBe(43);",
     "it('APPS 恰 44 项；APP_NAMES id→中文名全覆盖且非空（v8.54 #61 radio 入列）', () => {\n    expect(core.APPS.length).toBe(44);"),
    ("it('映射对拍：apps/*.js 全部 42 个 id 都可被 open 启动（v8.52 #58 ocr 入列）', () => {",
     "it('映射对拍：apps/*.js 全部 44 个 id 都可被 open 启动（v8.54 #61 radio 入列）', () => {"),
    ("expect(ids.length).toBe(43);", "expect(ids.length).toBe(44);"),
    ("const rows = core.renderNeofetch({ apps: 35,", "const rows = core.renderNeofetch({ apps: 36,"),
    ("expect(joined).toContain('35 installed');", "expect(joined).toContain('36 installed');"),
    ("expect(rows).toHaveLength(43);", "expect(rows).toHaveLength(44);"),
    (r"expect(src).toMatch(/reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt,\s*\n\];/);",
     r"expect(src).toMatch(/reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio,\s*\n\];/);"),
])

# ---------- v841-v844 / v851：APPS 44 + 图标总数 234 + 末位正则 ----------
for name, apps_line_old, apps_line_new in [
    ('v841-piano.test.js',
     "expect(ctx2.window.__terminalCore.APPS.length).toBe(43);",
     "expect(ctx2.window.__terminalCore.APPS.length).toBe(44);"),
    ('v842-bytebeat.test.js',
     "expect(tc.APPS.length).toBe(43);",
     "expect(tc.APPS.length).toBe(44);"),
    ('v843-python.test.js',
     "expect(tc.APPS.length).toBe(43);",
     "expect(tc.APPS.length).toBe(44);"),
    ('v844-ping.test.js',
     "expect(tc.APPS.length).toBe(43);",
     "expect(tc.APPS.length).toBe(44);"),
    ('v851-midi-player.test.js',
     "expect(tc.APPS.length).toBe(43);",
     "expect(tc.APPS.length).toBe(44);"),
]:
    patch(T(name), [
        (r"reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt,\s*\n\];",
         r"reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio,\s*\n\];"),
        (apps_line_old, apps_line_new),
    ])

# 图标全库总数 231→234（title + 断言，五套件内嵌）
icon_total_subs = [
    ("it('app-icons fixture：piano 条目 6 处动态色（总数 231 · v8.53 stt +3）', () => {",
     "it('app-icons fixture：piano 条目 6 处动态色（总数 234 · v8.54 radio +5）', () => {"),
    ("it('icon fixture：bytebeat 10 处动态色 · 全库总数 231（v8.53 stt +3）', () => {",
     "it('icon fixture：bytebeat 10 处动态色 · 全库总数 234（v8.54 radio +5）', () => {"),
    ("it('icon fixture：python 7 处动态色 · 全库总数 231（v8.53 stt +3）', () => {",
     "it('icon fixture：python 7 处动态色 · 全库总数 234（v8.54 radio +5）', () => {"),
    ("it('icon fixture：ping 7 处动态色 · 全库总数 231（v8.53 stt +3）', () => {",
     "it('icon fixture：ping 7 处动态色 · 全库总数 234（v8.54 radio +5）', () => {"),
    ("it('icon fixture：midi-player 条目 5 处动态色（全库 231）', () => {",
     "it('icon fixture：midi-player 条目 5 处动态色（全库 234 · v8.54 radio +5）', () => {"),
]
patch(T('v841-piano.test.js'), icon_total_subs[0:1] + [("expect(total).toBe(231);", "expect(total).toBe(234);")])
patch(T('v842-bytebeat.test.js'), icon_total_subs[1:2] + [("expect(total).toBe(231);", "expect(total).toBe(234);")])
patch(T('v843-python.test.js'), icon_total_subs[2:3] + [("expect(total).toBe(231);", "expect(total).toBe(234);")])
patch(T('v844-ping.test.js'), icon_total_subs[3:4] + [("expect(total).toBe(231);", "expect(total).toBe(234);")])
patch(T('v851-midi-player.test.js'), icon_total_subs[4:5] + [("expect(total).toBe(231);", "expect(total).toBe(234);")])

# ---------- v850 / v852 / v853 ----------
patch(T('v850-code-editor.test.js'), [
    (r"expect(APPSDATA_SRC).toMatch(/ping, codeEditor, midiPlayer, ocr, stt,\n\];/);",
     r"expect(APPSDATA_SRC).toMatch(/ping, codeEditor, midiPlayer, ocr, stt, radio,\n\];/);"),
])
patch(T('v852-ocr.test.js'), [
    ("expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(7);   // open/apps/print/beat/code/ocr/stt — 应用组 7 条",
     "expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(8);   // open/apps/print/beat/code/ocr/stt/radio — 应用组 8 条"),
])
patch(T('v853-stt.test.js'), [
    ("expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(7);   // open/apps/print/beat/code/ocr/stt — 应用组 7 条",
     "expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(8);   // open/apps/print/beat/code/ocr/stt/radio — 应用组 8 条"),
    ("describe('v8.53 #59 注册链（第 43 应用）', () => {", "describe('v8.53 #59 注册链（stt 系第 43 应用 · radio 后全库 44）', () => {"),
])

# ---------- md3-tokens：iframe 应用 32→33 ----------
patch(T('md3-tokens.test.js'), [
    ("it('30 个应用全部挂载 _shared/md3-tokens.css（v8.51 #56 midi-player 入列）', () => {\n    const apps = iframeApps();\n    expect(apps.length).toBe(32);",
     "it('全部 iframe 应用挂载 _shared/md3-tokens.css（v8.54 #61 radio 入列）', () => {\n    const apps = iframeApps();\n    expect(apps.length).toBe(33);"),
])

# ---------- app-icons：动态声明总数 231→234 ----------
patch(T('app-icons.test.js'), [
    ("expect(checked.length).toBe(231);", "expect(checked.length).toBe(234);"),
    ("    // v8.53 #59：stt 图标 3 处补录 fixture 后 228 → 231\n    const total = (iconsSrc.match(/(?:fill|stroke):hsl\\(/g) || []).length;\n    expect(total).toBe(231);",
     "    // v8.53 #59：stt 图标 3 处补录 fixture 后 228 → 231\n    // v8.54 #61：radio 图标 5 处补录 fixture 后 231 → 234\n    const total = (iconsSrc.match(/(?:fill|stroke):hsl\\(/g) || []).length;\n    expect(total).toBe(234);"),
])

# ---------- scenario-persistence：ids[43] + 44 应用 + 溢出 20 ----------
patch(T('scenario-persistence.test.js'), [
    ("expect(flatIds.length).toBe(43);\n    expect(flatIds).toContain(ids[30]);",
     "expect(flatIds.length).toBe(44);\n    expect(flatIds).toContain(ids[30]);"),
    ("expect(flatIds).toContain(ids[42]);           // v8.53 #59 stt 同批追加",
     "expect(flatIds).toContain(ids[42]);           // v8.53 #59 stt 同批追加\n    expect(flatIds).toContain(ids[43]);           // v8.54 #61 radio 同批追加"),
    ("const lastPage = state.pagesApps[state.pagesApps.length - 1];\n    expect(lastPage[lastPage.length - 1].id).toBe(ids[42]);",
     "const lastPage = state.pagesApps[state.pagesApps.length - 1];\n    expect(lastPage[lastPage.length - 1].id).toBe(ids[43]);"),
    ("const flatIds = state.pagesApps.flat().map((a) => a.id);\n    expect(flatIds.length).toBe(42);\n    expect(flatIds).not.toContain(ids[30]);",
     "const flatIds = state.pagesApps.flat().map((a) => a.id);\n    expect(flatIds.length).toBe(43);\n    expect(flatIds).not.toContain(ids[30]);"),
    ("// 第 1 页 24 个真实应用 + 第 2 页 24 个未知 id（模拟满页自定义内容）→ 剩余 19 个溢出第 3 页",
     "// 第 1 页 24 个真实应用 + 第 2 页 24 个未知 id（模拟满页自定义内容）→ 剩余 20 个溢出第 3 页"),
    ("expect(state.pagesApps[2].length).toBe(19);", "expect(state.pagesApps[2].length).toBe(20);"),
])

print('\n全部历史锚更新完成 ✓')
