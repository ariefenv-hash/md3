#!/usr/bin/env python3
# ==================== gen-fixture-lyricmaker.py — v9.10 #121 图标动态取色 fixture 生成 ====================
# 与 tests/app-icons.test.js 的 hslToRgb/rgbToHsl 同一套量化数学（round-half-up 逼近 Chromium）。
# 输入：app-icons.js 中 lyricmaker 块的 style="fill:#HEX"/stroke:#HEX 动态声明（静态 #FFFFFF 豁免）
# 输出：①把上述 hex 原地替换为 hsl(calc(var(--md-h,215) ± D) S% L%) 公式 ②fixture 增补 lyricmaker 条目
# 用法：python3 scripts/gen-fixture-lyricmaker.py   （幂等：已存在 lyricmaker 条目则先删后写）

import json, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FIXTURE = os.path.join(ROOT, 'tests', 'icon-dynamic-colors.generated.json')
ICONS = os.path.join(ROOT, 'ios-desktop', 'js', 'app-icons.js')
ANCHOR = 215.0


def hex_to_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i+2], 16) for i in (0, 2, 4)]


def rgb_to_hsl(r, g, b):
    r_, g_, b_ = r / 255, g / 255, b / 255
    mx, mn = max(r_, g_, b_), min(r_, g_, b_)
    l = (mx + mn) / 2
    if mx == mn:
        return [0.0, 0.0, l * 100]
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r_:
        h = (g_ - b_) / d + (6 if g_ < b_ else 0)
    elif mx == g_:
        h = (b_ - r_) / d + 2
    else:
        h = (r_ - g_) / d + 4
    return [((h * 60) % 360), s * 100, l * 100]


def hsl_to_rgb(h, s, l):
    h = ((h % 360) + 360) % 360
    s /= 100
    l /= 100
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    table = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)]
    r, g, b = table[int(h // 60) % 6]
    return [max(0, min(255, int(v * 255 + 0.5))) for v in (r + m, g + m, b + m)]


def make_decl(orig_hex, prop):
    """orig hex → (delta, decl)；先试 S/L 1 位小数，再试 S 2 位小数兜底"""
    r, g, b = hex_to_rgb(orig_hex)
    h, s, l = rgb_to_hsl(r, g, b)
    for s_digits in (1, 2):
        sstep = 10 ** s_digits
        for tenths in range(-3601, 3601):
            delta = round(tenths / 10.0, 1)
            s1 = round(round(s * sstep) / sstep, s_digits)
            l1 = round(l, 1)
            if hsl_to_rgb(ANCHOR + delta, s1, l1) == [r, g, b]:
                if delta == 0:
                    return delta, '%s:hsl(var(--md-h,215) %s%% %s%%)' % (prop, s1, l1)
                sign = '-' if delta < 0 else '+'
                return delta, '%s:hsl(calc(var(--md-h,215) %s %s) %s%% %s%%)' % (prop, sign, abs(delta), s1, l1)
    raise SystemExit('无法为 %s 找到量化公式' % orig_hex)


def main():
    with open(ICONS, encoding='utf-8') as f:
        src = f.read()
    m = re.search(r'lyricmaker: `(.*?)`', src, re.S)
    if not m:
        raise SystemExit('app-icons.js 中未找到 lyricmaker 块')
    block = m.group(1)
    decls = re.findall(r'style="(fill|stroke):#([0-9A-Fa-f]{6})"', block)
    if not decls:
        raise SystemExit('lyricmaker 块无动态 hex 声明（可能已转换过）')
    print('发现动态声明 %d 处' % len(decls))

    with open(FIXTURE, encoding='utf-8') as f:
        fixture = json.load(f)
    fixture['icons'].pop('lyricmaker', None)

    colors = []
    new_block = block
    for i, (prop, hx) in enumerate(decls):
        orig = '#' + hx.upper()
        delta, decl = make_decl(orig, prop)
        colors.append({'orig': orig, 'decl': decl})
        print('#%d %s %s → %s' % (i + 1, prop, orig, decl))
        # 逐处替换（同色多处按顺序替换：先出现的先换）
        needle = 'style="%s:#%s"' % (prop, hx)
        new_block = new_block.replace(needle, 'style="%s"' % decl, 1)

    fixture['icons']['lyricmaker'] = {'dynamic': len(colors), 'colors': colors}

    src = src.replace(block, new_block, 1)
    with open(ICONS, 'w', encoding='utf-8') as f:
        f.write(src)
    with open(FIXTURE, 'w', encoding='utf-8') as f:
        json.dump(fixture, f, ensure_ascii=False, indent=2)
        f.write('\n')
    total = len(re.findall(r'(?:fill|stroke):hsl\(', src))
    print('fixture 更新完成：lyricmaker dynamic=%d；app-icons.js hsl 声明总数=%d（应 263+%d=270）'
          % (len(colors), total, len(colors)))


if __name__ == '__main__':
    main()
