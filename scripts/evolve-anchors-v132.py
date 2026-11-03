#!/usr/bin/env python3
# ==================== evolve-anchors-v132.py — #132 chess 入列后的注册链锚族批量演进（v9.69） ====================
# 演进清单（每项先例 = markdown/archive/pdf 入列时的同族演进）：
#   1. 聚合数锚 51→52（v122/v124/v840）
#   2. iframe 目录数 40→41（v123）
#   3. initialApps 逗号列表正则锚：pdf, → pdf, chess,（v836/v840/v841/v842/v843/v844）
#   4. 图标声明总数 278→281（app-icons/v841/v842/v843/v844）
#   5. md3-tokens iframe 挂载数 40→41
#   6. scenario-persistence 总数与页数演进
import re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
T = root / 'tests'

def patch(fname, pairs, regex_pairs=()):
    p = T / fname
    txt = p.read_text(encoding='utf-8')
    orig = txt
    for a, b in pairs:
        txt = txt.replace(a, b)
    for pat, rep in regex_pairs:
        txt = re.sub(pat, rep, txt)
    if txt != orig:
        p.write_text(txt, encoding='utf-8')
        print(f'  evolved: {fname}')
    else:
        print(f'  NO-OP:   {fname}')

# 1) 聚合数与目录数
patch('v122-typing.test.js', [], [(r'expect\(total\)\.toBe\(51\);', 'expect(total).toBe(52);')])
patch('v124-drawcircle.test.js', [], [(r'expect\(total\)\.toBe\(51\);', 'expect(total).toBe(52);')])
patch('v840-terminal.test.js', [], [
    (r'expect\(total\)\.toBe\(51\);', 'expect(total).toBe(52);'),
    (r'pdf, \\\/\\\\ v9\\\\\.13', 'pdf, chess, \\/\\\\ v9\\\\.13'),
])
patch('v123-gravity.test.js', [], [(r'expect\(total\)\.toBe\(40\);', 'expect(total).toBe(41);')])

# 2) initialApps 正则锚（pdf, 后插 chess,）—— v836/v840/v841/v842/v843/v844
LIST_ANCHOR = (r'(reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer, ocr, stt, radio, driving, gravity, drawcircle, typing, markdown, archive, pdf), ', r'\1, chess, ')
for f in ['v836-reaction-app.test.js', 'v840-terminal.test.js', 'v841-piano.test.js',
          'v842-bytebeat.test.js', 'v843-python.test.js', 'v844-ping.test.js']:
    patch(f, [], [LIST_ANCHOR])

# 3) 图标声明总数 278→281
ICON_TOTAL = (r'expect\(total\)\.toBe\(278\);', 'expect(total).toBe(281);')
for f in ['v841-piano.test.js', 'v842-bytebeat.test.js', 'v843-python.test.js', 'v844-ping.test.js']:
    patch(f, [], [ICON_TOTAL])

# 4) app-icons.test.js 总数 + 注释行
patch('app-icons.test.js', [
    ('// v9.18 #164：pdf 图标 6 处补录 fixture 后 272 → 278\n    const total',
     '// v9.18 #164：pdf 图标 6 处补录 fixture 后 272 → 278\n    // v9.69 #132：chess 图标 3 处补录 fixture 后 278 → 281\n    const total'),
], [(r'expect\(total\)\.toBe\(278\);', 'expect(total).toBe(281);')])

# 5) md3-tokens iframe 挂载数 40→41
patch('md3-tokens.test.js', [], [(r'expect\(total\)\.toBe\(40\);', 'expect(total).toBe(41);')])

print('锚族演进完成')
