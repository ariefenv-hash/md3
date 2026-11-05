#!/usr/bin/env python3
# roll-version.py — 版本锚全量滚动固化脚本（R56 建议③落地，v9.39 #160 二期窗口建成）
# 坑史（R51/R53/R55/R56 同源四度）：正则字面量 /v9\.XX/ 带 \. 转义、toBe('9.XX.0')、
# README 加粗块 **当前版本 vX.XX**、grant-permissions.js 头部锚——四种形态漏一即红。
# 用法：python3 scripts/roll-version.py 9.38 9.39
# 扫描范围：tests/*.js + ios-desktop/js/**/*.js + ios-desktop/apps/**（v9.69 盲区治理：应用
# index.html/.mjs 注释内版本锚同被测试断言引用，v177 首度发现——apps/*.html 漏滚致锚失配）
# + README.md（package.json 由调用方或本脚本单独改 version 字段）。
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
# v9.69 盲区治理：应用层文件（iframe 子应用 index.html / app.mjs）内注释版本锚同被测试引用
targets += [p for p in (root / 'ios-desktop' / 'apps').rglob('*') if p.suffix in ('.html', '.js', '.mjs')]
targets.append(root / 'README.md')
pkg = root / 'package.json'

# v10.00 #19 历史注记豁免（R91 窗披露的技术债）：js/mjs 文件内**整注释行不滚**——
# 注释里的 v9.XX #N 是该功能落地窗的史实注记（如「// v9.99 #90：延后期通知…」），
# 二段滚动会误滚历史版本链（R91 实锤：9.99→9.100→10.00 二段滚动误滚全库注释注记）。
# 安全性依据：vitest 主流锚模式是 stripComments 剥注释扫描（v108/v114/v19 同款）——
# 注释内容从不参与断言；但两例外必须保留：
# ① **行尾注释随代码一起滚**（F 组接线锚锚「code; // vXX #N」整串，剥尾注会失配）；
# ② .html/.css/README 不豁免全滚（v9.69 盲区治理：apps html 注释内锚同被测试引用，
#    md 无注释语义——README 历史到达注记误滚问题仍开放，下窗立题）。
# 已知边界（R91 实战验证）：pkg version 正则按 "<old>.0" 匹配，v10.1.0 形态不命中——
# pkg 跨十位版本时需调用方手动核对（已在本窗踩实）。
def roll_code_lines(text, pairs):
    out_lines = []
    in_block = False  # /* */ 跨行块跟踪
    for line in text.split('\n'):
        if in_block:
            out_lines.append(line)
            if '*/' in line:
                in_block = False
            continue
        stripped = line.lstrip()
        if stripped.startswith('//') or stripped.startswith('*'):
            out_lines.append(line)  # 整注释行豁免（含 JSDoc 续行）
            continue
        if '/*' in line and '*/' not in line:
            in_block = True
            out_lines.append(line)
            continue
        code_part, sep, tail = line.partition('//')  # 行尾注释随滚（F 组接线锚「code; // vXX #N」整串同步）
        for a, b in pairs:
            code_part = code_part.replace(a, b)
            tail = tail.replace(a, b)
        out_lines.append(code_part + sep + tail)
    return '\n'.join(out_lines)

changed_files = 0
for p in targets:
    if not p.is_file():
        continue
    txt = p.read_text(encoding='utf-8')
    orig = txt
    if p.suffix in ('.js', '.mjs'):
        txt = roll_code_lines(txt, PAIRS)  # v10.00：js 代码行才滚（整注释行豁免）
    else:
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
