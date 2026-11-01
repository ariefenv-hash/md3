#!/usr/bin/env python3
# ==================== apply-anchors-v910.py — v9.10 #121 计数/版本锚批量重锚 ====================
# 应用数 48→49 / iframe 37→38 / 图标动态色 263→270 / 版本 9.8.0→9.10.0 / README v9.08→v9.10
# 每处替换断言恰好出现 1 次（防漏防重复），任何失配即 SystemExit 非零。

import os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

# (相对路径, old, new)
EDITS = [
    ('tests/v843-python.test.js',
     'expect(tc.APPS.length).toBe(48); // v9.06 #122',
     'expect(tc.APPS.length).toBe(49); // v9.10 #121 lyricmaker 入列'),
    ('tests/v842-bytebeat.test.js',
     'expect(tc.APPS.length).toBe(48); // v9.06 #122',
     'expect(tc.APPS.length).toBe(49); // v9.10 #121 lyricmaker 入列'),
    ('tests/v851-midi-player.test.js',
     'expect(tc.APPS.length).toBe(48); // v9.06 #122',
     'expect(tc.APPS.length).toBe(49); // v9.10 #121 lyricmaker 入列'),
    ('tests/v844-ping.test.js',
     'expect(tc.APPS.length).toBe(48); // v9.06 #122',
     'expect(tc.APPS.length).toBe(49); // v9.10 #121 lyricmaker 入列'),
    ('tests/v841-piano.test.js',
     'expect(ctx2.window.__terminalCore.APPS.length).toBe(48); // v9.06 #122',
     'expect(ctx2.window.__terminalCore.APPS.length).toBe(49); // v9.10 #121 lyricmaker 入列'),
    ('tests/v840-terminal.test.js',
     "it('APPS 恰 47 项；APP_NAMES id→中文名全覆盖且非空（v9.05 #124 drawcircle 入列）', () => {",
     "it('APPS 恰 49 项；APP_NAMES id→中文名全覆盖且非空（v9.10 #121 lyricmaker 入列）', () => {"),
    ('tests/v840-terminal.test.js',
     'expect(core.APPS.length).toBe(48); // v9.06：47 → 48（#122 typing 入列）',
     'expect(core.APPS.length).toBe(49); // v9.10：48 → 49（#121 lyricmaker 入列）'),
    ('tests/v840-terminal.test.js',
     'expect(ids.length).toBe(48); // v9.06：47 → 48（#122 typing 入列）',
     'expect(ids.length).toBe(49); // v9.10：48 → 49（#121 lyricmaker 入列）'),
    ('tests/v861-allapps-form.test.js',
     "expect(overlay.querySelectorAll('.aa-item').length).toBe(48); // 全注册表（v9.06 #122）",
     "expect(overlay.querySelectorAll('.aa-item').length).toBe(49); // 全注册表（v9.10 #121）"),
    ('tests/scenario-persistence.test.js',
     'expect(flatIds.length).toBe(48); // v9.06：47 → 48（#122 typing 入列）',
     'expect(flatIds.length).toBe(49); // v9.10：48 → 49（#121 lyricmaker 入列）'),
    ('tests/v124-drawcircle.test.js',
     'expect(importCount).toBe(48); // v9.06：47 → 48（#122 typing 入列）',
     'expect(importCount).toBe(49); // v9.10：48 → 49（#121 lyricmaker 入列）'),
    ('tests/v124-drawcircle.test.js',
     "expect(pkg.version).toBe('9.8.0'); // v9.08 #153",
     "expect(pkg.version).toBe('9.10.0'); // v9.10 #121"),
    ('tests/v124-drawcircle.test.js',
     "expect(readme).toContain('48');",
     "expect(readme).toContain('49');"),
    ('tests/v122-typing.test.js',
     'expect(importCount).toBe(48);',
     'expect(importCount).toBe(49); // v9.10：48 → 49（#121 lyricmaker 入列）'),
    ('tests/v122-typing.test.js',
     "expect(pkg.version).toBe('9.8.0'); // v9.08 #153",
     "expect(pkg.version).toBe('9.10.0'); // v9.10 #121"),
    ('tests/v122-typing.test.js',
     "expect(readme).toContain('48');",
     "expect(readme).toContain('49');"),
    ('tests/v122-typing.test.js',
     "expect(readme).toContain('v9.08');",
     "expect(readme).toContain('v9.10');"),
    ('tests/v150-readme-version.test.js',
     'expect(importCount).toBe(48); // 现状锚：#122 打字练习入列恰 48 项（apps/*.js 单一真源）',
     'expect(importCount).toBe(49); // 现状锚：#121 歌词制作入列恰 49 项（apps/*.js 单一真源）'),
    ('tests/md3-tokens.test.js',
     'expect(apps.length).toBe(37); // v9.06：36 → 37（#122 typing 入列）',
     'expect(apps.length).toBe(38); // v9.10：37 → 38（#121 lyricmaker 入列）'),
    ('tests/app-icons.test.js',
     'expect(checked.length).toBe(263); // v9.06：253 → 263（#122 typing 图标 10 处补录）',
     'expect(checked.length).toBe(270); // v9.10：263 → 270（#121 lyricmaker 图标 7 处补录）'),
    ('tests/app-icons.test.js',
     '// v9.06 #122：typing 图标 10 处补录 fixture 后 253 → 263\n    const total',
     '// v9.06 #122：typing 图标 10 处补录 fixture 后 253 → 263\n'
     '    // v9.10 #121：lyricmaker 图标 7 处补录 fixture 后 263 → 270\n    const total'),
    ('tests/app-icons.test.js',
     'expect(total).toBe(263);',
     'expect(total).toBe(270);'),
    ('README.md',
     '48 个内置应用',
     '49 个内置应用'),
    ('README.md',
     '48 个应用定义',
     '49 个应用定义'),  # L96 与 L285 两处 → 计 2 次
    ('README.md',
     '37 个 iframe 子应用',
     '38 个 iframe 子应用'),
    ('package.json',
     '"version": "9.8.0",',
     '"version": "9.10.0",'),
]

fails = 0
for rel, old, new in EDITS:
    p = os.path.join(ROOT, rel)
    with open(p, encoding='utf-8') as f:
        src = f.read()
    n = src.count(old)
    if n == 0:
        print('MISS  %s :: %s' % (rel, old[:60]))
        fails += 1
        continue
    src = src.replace(old, new)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(src)
    print('OK(%d) %s :: %s' % (n, rel, old[:48]))

if fails:
    print('\n%d 处失配，中止' % fails)
    sys.exit(1)
print('\n全部锚点重锚完成')
