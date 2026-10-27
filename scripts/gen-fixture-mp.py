#!/usr/bin/env python3
# ==================== gen-fixture-mp.py — v8.51 #56 图标动态取色 fixture 重生成 ====================
# 与 tests/app-icons.test.js 的 hslToRgb/rgbToHsl 同一套量化数学（round-half-up 逼近 Chromium）。
# 输入：midi-player 图标的原始 hex 色板 → 输出：hsl(calc(var(--md-h,215) ± D) S% L%) 公式
# + fixture JSON 增补 midi-player 条目（orig ↔ decl 双向锚定）。
# 用法：python3 scripts/gen-fixture-mp.py   （幂等：已存在 midi-player 条目则先删后写）

import json, os, colorsys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FIXTURE = os.path.join(ROOT, 'tests', 'icon-dynamic-colors.generated.json')
ANCHOR = 215.0

# midi-player 图标色板（与 app-icons.js 图形一一对应：bg + 4 音条）
PALETTE = [
    ('bg',   '#312A4E'),   # 深紫罗兰基底
    ('bar1', '#7C5CFF'),   # 卷帘音条 1（紫罗兰）
    ('bar2', '#E36BD1'),   # 卷帘音条 2（品红）
    ('bar3', '#F2A5C9'),   # 卷帘音条 4（浅粉）
    ('bar4', '#4FC3E8'),   # 底部键盘横杠上方的音符圆点（青）
]

def hex_to_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i+2], 16) for i in (0, 2, 4)]

def rgb_to_hsl(r, g, b):
    r_, g_, b_ = r/255, g/255, b/255
    mx, mn = max(r_, g_, b_), min(r_, g_, b_)
    l = (mx + mn) / 2
    if mx == mn:
        return [0.0, 0.0, l * 100]
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r_: h = (g_ - b_) / d + (6 if g_ < b_ else 0)
    elif mx == g_: h = (b_ - r_) / d + 2
    else: h = (r_ - g_) / d + 4
    return [h * 60, s * 100, l * 100]

def hsl_to_rgb(h, s, l):
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    table = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)]
    r, g, b = table[int(h // 60) % 6]
    return [min(255, max(0, int(v * 255 + 0.5))) for v in (r + m, g + m, b + m)]

def make_decl(orig_hex):
    """orig hex → (delta, s, l) 1 位小数；不满足逐字节还原则抛错"""
    r, g, b = hex_to_rgb(orig_hex)
    h, s, l = rgb_to_hsl(r, g, b)
    for tenths in range(-3601, 3601):  # 试探 0.1° 步进 delta
        delta = round(tenths / 10.0, 1)
        s1, l1 = round(s, 1), round(l, 1)
        if hsl_to_rgb(ANCHOR + delta, s1, l1) == [r, g, b]:
            sign = '-' if delta < 0 else '+'
            ad = abs(delta)
            decl = f'fill:hsl(calc(var(--md-h,215) {sign} {ad}) {s1}% {l1}%)' if delta != 0 \
                else f'fill:hsl(var(--md-h,215) {s1}% {l1}%)'
            return delta, decl
    # S/L 两位小数兜底（低饱和色 1 位小数量化易偏 1）
    for tenths in range(-3601, 3601):
        delta = round(tenths / 10.0, 1)
        for s10 in range(0, 1001):
            s1 = round(s10 / 10.0, 1)
            l1 = round(l, 1)
            if hsl_to_rgb(ANCHOR + delta, s1, l1) == [r, g, b]:
                sign = '-' if delta < 0 else '+'
                ad = abs(delta)
                decl = f'fill:hsl(calc(var(--md-h,215) {sign} {ad}) {s1}% {l1}%)' if delta != 0 \
                    else f'fill:hsl(var(--md-h,215) {s1}% {l1}%)'
                return delta, decl
    raise SystemExit(f'无法为 {orig_hex} 找到量化公式')

def main():
    with open(FIXTURE) as f:
        fixture = json.load(f)
    fixture['icons'].pop('midi-player', None)

    colors = []
    for name, hx in PALETTE:
        delta, decl = make_decl(hx)
        colors.append({'orig': hx, 'decl': decl})
        print(f'{name:5s} {hx}  →  {decl}')
    fixture['icons']['midi-player'] = {'dynamic': len(colors), 'colors': colors}

    with open(FIXTURE, 'w') as f:
        json.dump(fixture, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'fixture 更新完成：midi-player dynamic={len(colors)}')

if __name__ == '__main__':
    main()
