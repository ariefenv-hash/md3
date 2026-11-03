#!/usr/bin/env python3
# ==================== gen-fixture-chess.py — v9.69 #132 图标动态取色 fixture 补录 ====================
# chess 图标 3 处动态声明（沿用 markdown 家族色板：石墨蓝底 + 中性格线 + 马首主色）
# 用法：python3 scripts/gen-fixture-chess.py（幂等：已存在 chess 条目则先删后写）
import json, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FIXTURE = os.path.join(ROOT, 'tests', 'icon-dynamic-colors.generated.json')

ENTRY = {
    "dynamic": 3,
    "colors": [
        {"orig": "#14142e", "decl": "fill:hsl(calc(var(--md-h,215) + 25) 40% 13%)"},
        {"orig": "#7a94b8", "decl": "stroke:hsl(var(--md-h,215) 30% 60%)"},
        {"orig": "#70ebc2", "decl": "stroke:hsl(calc(var(--md-h,215) - 55) 75% 68%)"},
    ],
}

with open(FIXTURE, 'r', encoding='utf-8') as f:
    data = json.load(f)
data['icons']['chess'] = ENTRY
with open(FIXTURE, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
    f.write('\n')
print('fixture chess 条目写入完成（3 处动态声明）')
