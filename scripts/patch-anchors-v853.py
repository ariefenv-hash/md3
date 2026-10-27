#!/usr/bin/env python3
# ==================== patch-anchors-v853.py — v8.53 #59 历史套件数字锚批更新 ====================
# 第 43 应用 stt 入列 + 第 34 命令 + 图标 fixture 228→231 + md3-tokens 31→32
# + persistence 42→43 + 7 处末位正则追加 stt + 应用组 6→7。
import re, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
T = lambda name: os.path.join(ROOT, 'tests', name)

def patch(path, pairs):
    with open(path, encoding='utf-8') as f:
        src = f.read()
    orig = src
    for old, new, cnt in pairs:
        n = src.count(old)
        if n != cnt:
            raise SystemExit(f'锚失配 {path}: 期望 {cnt} 处「{old[:60]}…」，实见 {n} 处')
        src = src.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f'OK {os.path.basename(path)} ({len(pairs)} 组)')

# ---------- 7 处末位正则：midiPlayer, ocr,\n] → midiPlayer, ocr, stt,\n] ----------
TAIL_OLD = 'midiPlayer, ocr,\\n\\]'
TAIL_NEW = 'midiPlayer, ocr, stt,\\n\\]'
TAIL_OLD_B = 'midiPlayer, ocr,\\s*\\n\\];'
TAIL_NEW_B = 'midiPlayer, ocr, stt,\\s*\\n\\];'

patch(T('v836-reaction-app.test.js'), [
    ("installer, reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr,\\n\\]",
     "installer, reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt,\\n\\]", 1),
])
patch(T('v841-piano.test.js'), [
    (TAIL_OLD_B, TAIL_NEW_B, 1),
    ('expect(ctx2.window.__terminalCore.APPS.length).toBe(42);',
     'expect(ctx2.window.__terminalCore.APPS.length).toBe(43);', 1),
])
patch(T('v842-bytebeat.test.js'), [
    (TAIL_OLD_B, TAIL_NEW_B, 1),
    ('expect(tc.APPS.length).toBe(42);', 'expect(tc.APPS.length).toBe(43);', 1),
])
patch(T('v843-python.test.js'), [
    (TAIL_OLD_B, TAIL_NEW_B, 1),
    ('expect(tc.APPS.length).toBe(42);', 'expect(tc.APPS.length).toBe(43);', 1),
])
patch(T('v844-ping.test.js'), [
    (TAIL_OLD_B, TAIL_NEW_B, 1),
    ('expect(tc.APPS.length).toBe(42);', 'expect(tc.APPS.length).toBe(43);', 1),
])
patch(T('v850-code-editor.test.js'), [
    (TAIL_OLD, TAIL_NEW, 1),
])
patch(T('v851-midi-player.test.js'), [
    (TAIL_OLD_B, TAIL_NEW_B, 1),
    ('expect(tc.APPS.length).toBe(42);', 'expect(tc.APPS.length).toBe(43);', 1),
])

# ---------- v852：应用组 6→7 ----------
patch(T('v852-ocr.test.js'), [
    ("expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(6);   // open/apps/print/beat/code/ocr — 应用组 6 条",
     "expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(7);   // open/apps/print/beat/code/ocr/stt — 应用组 7 条", 1),
])

# ---------- v840：命令 33→34 + must 32→33 + 应用组 6→7 + APPS/ids/formatApps 42→43 ----------
patch(T('v840-terminal.test.js'), [
    ("expect(names.length).toBe(33);", "expect(names.length).toBe(34);", 1),
    ("'uname', 'notify', 'exit', 'apps', 'beat', 'code'];",
     "'uname', 'notify', 'exit', 'apps', 'beat', 'code', 'ocr', 'stt'];", 1),
    ("expect(must.length).toBe(32);", "expect(must.length).toBe(33);", 1),
    ("expect(byGroup['应用']).toBe(6);", "expect(byGroup['应用']).toBe(7);", 1),
    ("expect(core.APPS.length).toBe(42);", "expect(core.APPS.length).toBe(43);", 1),
    ("expect(ids.length).toBe(42);", "expect(ids.length).toBe(43);", 1),
    ("expect(rows).toHaveLength(42);", "expect(rows).toHaveLength(43);", 1),
])

# ---------- app-icons：fixture 228→231 ----------
patch(T('app-icons.test.js'), [
    ("expect(checked.length).toBe(228);", "expect(checked.length).toBe(231);", 1),
    ("// v8.52 #58：ocr 图标 3 处补录 fixture 后 225 → 228",
     "// v8.52 #58：ocr 图标 3 处补录 fixture 后 225 → 228\n    // v8.53 #59：stt 图标 3 处补录 fixture 后 228 → 231", 1),
    ("const total = (iconsSrc.match(/(?:fill|stroke):hsl\\(/g) || []).length;\n    expect(total).toBe(228);",
     "const total = (iconsSrc.match(/(?:fill|stroke):hsl\\(/g) || []).length;\n    expect(total).toBe(231);", 1),
])

# ---------- md3-tokens：31→32 ----------
patch(T('md3-tokens.test.js'), [
    ("expect(apps.length).toBe(31);", "expect(apps.length).toBe(32);", 1),
])

# ---------- scenario-persistence：42→43 + ids[42] + 末页末位 ----------
patch(T('scenario-persistence.test.js'), [
    ("expect(flatIds.length).toBe(42);", "expect(flatIds.length).toBe(43);", 1),
    ("expect(flatIds).toContain(ids[41]);           // v8.52 #58 ocr 同批追加",
     "expect(flatIds).toContain(ids[41]);           // v8.52 #58 ocr 同批追加\n    expect(flatIds).toContain(ids[42]);           // v8.53 #59 stt 同批追加", 1),
    ("expect(lastPage[lastPage.length - 1].id).toBe(ids[41]);",
     "expect(lastPage[lastPage.length - 1].id).toBe(ids[42]);", 1),
])

print('\n全部锚点更新完成')
