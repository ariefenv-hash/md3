#!/usr/bin/env python3
# ==================== apply-anchors-v910-round2.py — v9.10 第二批锚修正 ====================
# A 类：apps-data 聚合正则补 lyricmaker（8 文件）
# B 类：icon fixture 总数 263→270（5 文件）
# C/D 类：scenario-persistence 无痕升级/removed/溢出 + v859 取末三位
# E 类：v840 formatApps 行数；v123 iframe 目录数 37→38

import os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

EDITS = [
    # A 类：聚合数组正则（typing, → typing, lyricmaker,）
    ('tests/v851-midi-player.test.js',
     'drawcircle, typing,\\s*\\n\\];',
     'drawcircle, typing, lyricmaker,\\s*\\n\\];'),
    ('tests/v844-ping.test.js',
     'drawcircle, typing,\\s*\\n\\];',
     'drawcircle, typing, lyricmaker,\\s*\\n\\];'),
    ('tests/v842-bytebeat.test.js',
     'drawcircle, typing,\\s*\\n\\];',
     'drawcircle, typing, lyricmaker,\\s*\\n\\];'),
    ('tests/v840-terminal.test.js',
     'drawcircle, typing,\\s*\\n\\];',
     'drawcircle, typing, lyricmaker,\\s*\\n\\];'),
    ('tests/v843-python.test.js',
     'drawcircle, typing,\\s*\\n\\];',
     'drawcircle, typing, lyricmaker,\\s*\\n\\];'),
    ('tests/v841-piano.test.js',
     'drawcircle, typing,\\s*\\n\\];',
     'drawcircle, typing, lyricmaker,\\s*\\n\\];'),
    ('tests/v836-reaction-app.test.js',
     'drawcircle, typing,\\n\\]',
     'drawcircle, typing, lyricmaker,\\n\\]'),
    ('tests/v850-code-editor.test.js',
     'drawcircle, typing,\\n\\];',
     'drawcircle, typing, lyricmaker,\\n\\];'),
    # B 类：icon fixture 总数
    ('tests/v851-midi-player.test.js',
     'expect(total).toBe(263); // v9.06：+10（#122 typing 图标）',
     'expect(total).toBe(270); // v9.10：+7（#121 lyricmaker 图标）'),
    ('tests/v844-ping.test.js',
     'expect(total).toBe(263); // v9.06：+10（#122 typing 图标）',
     'expect(total).toBe(270); // v9.10：+7（#121 lyricmaker 图标）'),
    ('tests/v842-bytebeat.test.js',
     'expect(total).toBe(263); // v9.06：+10（#122 typing 图标）',
     'expect(total).toBe(270); // v9.10：+7（#121 lyricmaker 图标）'),
    ('tests/v843-python.test.js',
     'expect(total).toBe(263); // v9.06：+10（#122 typing 图标）',
     'expect(total).toBe(270); // v9.10：+7（#121 lyricmaker 图标）'),
    ('tests/v841-piano.test.js',
     'expect(total).toBe(263); // v9.06：+10（#122 typing 图标）',
     'expect(total).toBe(270); // v9.10：+7（#121 lyricmaker 图标）'),
    # E 类：v840 formatApps 行数
    ('tests/v840-terminal.test.js',
     'expect(rows).toHaveLength(48); // v9.06：47 → 48（#122 typing 入列）',
     'expect(rows).toHaveLength(49); // v9.10：48 → 49（#121 lyricmaker 入列）'),
    # v123：iframe 应用目录数
    ('tests/v123-gravity.test.js',
     'expect(appDirs).toBe(37); // v9.06：36 → 37（#122 typing 入列，README 同口径）',
     'expect(appDirs).toBe(38); // v9.10：37 → 38（#121 lyricmaker 入列，README 同口径）'),
    # C 类：scenario 无痕升级追加末位 ids[47]→ids[48] + 补 toContain
    ('tests/scenario-persistence.test.js',
     'expect(flatIds).toContain(ids[47]);           // v9.06 #122 typing 同批追加\n'
     '    expect(state.pagesApps[0][0].id).toBe(ids[0]); // 原排列未被重置',
     'expect(flatIds).toContain(ids[47]);           // v9.06 #122 typing 同批追加\n'
     '    expect(flatIds).toContain(ids[48]);           // v9.10 #121 lyricmaker 同批追加\n'
     '    expect(state.pagesApps[0][0].id).toBe(ids[0]); // 原排列未被重置'),
    ('tests/scenario-persistence.test.js',
     'expect(lastPage[lastPage.length - 1].id).toBe(ids[47]);',
     'expect(lastPage[lastPage.length - 1].id).toBe(ids[48]); // v9.10 #121'),
    ('tests/scenario-persistence.test.js',
     'expect(flatIds.length).toBe(47); // v9.06：48-1（removed 一个）',
     'expect(flatIds.length).toBe(48); // v9.10：49-1（removed 一个）'),
    # C 类：末页已满溢出断言（49-24-24=25 → 第 4 页 1 个）
    ('tests/scenario-persistence.test.js',
     'expect(state.pagesApps.length).toBe(3);\n'
     '    expect(state.pagesApps[2].length).toBe(24); // v9.06：48-24-24 溢出\n'
     '    expect(state.pagesApps[2].map((a) => a.id)).toEqual(ids.slice(24));',
     'expect(state.pagesApps.length).toBe(4);      // v9.10：49-24-24=25 溢出 → 第 4 页\n'
     '    expect(state.pagesApps[2].length).toBe(24);\n'
     '    expect(state.pagesApps[3].length).toBe(1);   // v9.10：lyricmaker 溢出单落第 4 页\n'
     '    expect(state.pagesApps[2].map((a) => a.id)).toEqual(ids.slice(24, 48));\n'
     '    expect(state.pagesApps[3][0].id).toBe(ids[48]);'),
    # D 类：v859 取末三位（第 2 页 25 项 slot 24 越界无效，需腾出 22..24 有效空隙）
    ('tests/v859-widget-board.test.js',
     "    // 默认布局第 1 页 24 格全满，第 2 页 48-24=24 图标（满页）→ 无空隙；\n"
     "    // 48 纪元适配：取走末两位图标（typing/drawcircle）还原 22 图标双空隙局面，2×1 首个可放 slot 22\n"
     "    W.__state.pagesApps[1].pop();\n"
     "    W.__state.pagesApps[1].pop();",
     "    // 默认布局第 1 页 24 格全满，第 2 页 49-24=25 图标（v9.10 起末位越界无效格）→ 无有效空隙；\n"
     "    // 49 纪元适配：取走末三位图标（lyricmaker/typing/drawcircle）还原 22 图标空隙局面（slot 22..24 空），2×1 首个可放 slot 22\n"
     "    W.__state.pagesApps[1].pop();\n"
     "    W.__state.pagesApps[1].pop();\n"
     "    W.__state.pagesApps[1].pop();"),
]

fails = 0
for rel, old, new in EDITS:
    p = os.path.join(ROOT, rel)
    with open(p, encoding='utf-8') as f:
        src = f.read()
    n = src.count(old)
    if n == 0:
        print('MISS  %s :: %s' % (rel, old[:64].replace('\n', '\\n')))
        fails += 1
        continue
    src = src.replace(old, new)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(src)
    print('OK(%d) %s :: %s' % (n, rel, old[:52].replace('\n', '\\n')))

if fails:
    print('\n%d 处失配，中止' % fails)
    sys.exit(1)
print('\n第二批锚修正完成')
