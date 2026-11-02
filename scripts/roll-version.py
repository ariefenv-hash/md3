#!/usr/bin/env python3
# roll-version.py — 版本锚全量滚动固化脚本（R56 建议③落地，v9.39 #160 二期窗口建成）
# 坑史（R51/R53/R55/R56 同源四度）：正则字面量 /v9\.XX/ 带 \. 转义、toBe('9.XX.0')、
# README 加粗块 **当前版本 vX.XX**、grant-permissions.js 头部锚——四种形态漏一即红。
# 用法：python3 scripts/roll-version.py 9.38 9.39
# 扫描范围：tests/*.js + ios-desktop/js/**/*.js + README.md（package.json 由调用方或本脚本单独改 version 字段）。
import sys, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
if len(sys.argv) < 3:
    print('用法: roll-version.py <旧版本如 9.38> <新版本如 9.39>'); sys.exit(1)
old, new = sys.argv[1], sys.argv[2]
old_esc = old.replace('.', r'\.')   # v9\.38 形态（源码文本含反斜杠）
new_esc = new.replace('.', r'\.')

# 四形态替换对（顺序无关，均为纯文本替换，非正则求值）
PAIRS = [
    (f'{old}.0',  f'{new}.0'),    # toBe('9.38.0') / "version": "9.38.0"
    (f'v{old}',   f'v{new}'),     # v9.38（describe/注释/toContain）
    (f'v{old_esc}', f'v{new_esc}'),  # /v9\.38/ 正则字面量源文本
    (f'{old_esc}',  f'{new_esc}'),   # 兜底：其余 9\.38 转义形态
]

targets = list((root / 'tests').glob('*.js'))
targets += list((root / 'ios-desktop' / 'js').rglob('*.js'))
targets.append(root / 'README.md')
pkg = root / 'package.json'

changed_files = 0
for p in targets:
    if not p.is_file():
        continue
    txt = p.read_text(encoding='utf-8')
    orig = txt
    for a, b in PAIRS:
        txt = txt.replace(a, b)
    if txt != orig:
        p.write_text(txt, encoding='utf-8')
        changed_files += 1
        print(f'  rolled: {p.relative_to(root)}')

# package.json version 字段
ptxt = pkg.read_text(encoding='utf-8')
ptxt2 = re.sub(r'"version":\s*"' + re.escape(old) + r'\.0"', f'"version": "{new}.0"', ptxt)
if ptxt2 != ptxt:
    pkg.write_text(ptxt2, encoding='utf-8')
    print(f'  rolled: package.json (version → {new}.0)')

print(f'完成：{changed_files} 个文件滚动 {old} → {new}')
