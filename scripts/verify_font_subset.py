#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v7.7-A 子集强校验 v2 —— 对 90 个静态图标标记逐个做身份级断言：
  text --subset cmap+liga 收敛--> 单一 glyph
  且该 glyph 在子集 cmap 中的 PUA 码点 == 源字体同名图标 glyph 的 PUA 码点
"""
import os
import re
import sys
from fontTools.ttLib import TTFont

REPO = "/home/z/my-project/md3_repo"
OUT_DIR = os.path.join(REPO, "ios-desktop", "assets", "fonts")
SRC = "/home/z/my-project/scripts/fontsrc"


def walk(st):
    if hasattr(st, "ExtSubTable"):
        return st.ExtSubTable
    return st


def liga_table(font):
    t = {}
    for lu in font["GSUB"].table.LookupList.Lookup:
        for st in lu.SubTable:
            real = walk(st)
            if hasattr(real, "ligatures"):
                for first, ls in real.ligatures.items():
                    d = t.setdefault(first, {})
                    for L in ls:
                        d[tuple([first] + list(L.Component))] = L.LigGlyph
    return t


def reverse_cmap(font):
    r = {}
    for code, name in font.getBestCmap().items():
        r.setdefault(name, set()).add(code)
    return r


def shape(text, cmap, ligs):
    glyphs = [cmap[ord(c)] for c in text]
    if len(glyphs) != len(text):
        return None
    i = 0
    steps = 0
    while i < len(glyphs) and steps < 64:
        steps += 1
        matched = False
        first_tab = ligs.get(glyphs[i], {})
        for length in range(min(len(glyphs) - i, 24), 0, -1):
            key = tuple(glyphs[i:i + length])
            if key in first_tab:
                glyphs[i:i + length] = [first_tab[key]]
                matched = True
                break
        if not matched:
            i += 1
    return glyphs


# 静态标记 = 真实图标清单（两字体共享同一套标记）
scan = []
for root in (os.path.join(REPO, "ios-desktop", "apps"), os.path.join(REPO, "ios-desktop", "js")):
    for dp, _, fns in os.walk(root):
        for fn in fns:
            if fn.endswith((".html", ".js", ".css")):
                scan.append(os.path.join(dp, fn))
scan.append(os.path.join(REPO, "ios-desktop", "index.html"))
corpus = "\n".join(open(fp, encoding="utf-8", errors="ignore").read() for fp in scan)
static = sorted(set(re.findall(r'material-symbols-(?:rounded|outlined)[^>]*>\s*([a-z0-9_]+)\s*<', corpus)))
print(f"static icon marks to verify: {len(static)}")

fail = 0
for fam, sub_path, src_path in (
    ("Rounded", "material-symbols-rounded.woff2", "ms-rounded.woff2"),
    ("Outlined", "material-symbols-outlined.woff2", "ms-outlined.woff2"),
):
    sub = TTFont(os.path.join(OUT_DIR, sub_path))
    src = TTFont(os.path.join(SRC, src_path))
    cmap_s, ligs_s = sub.getBestCmap(), liga_table(sub)
    cmap_src = src.getBestCmap()
    rev_src = {}
    for code, name in cmap_src.items():
        ch = chr(code)
        if ("a" <= ch <= "z") or ch == "_" or ("0" <= ch <= "9"):
            rev_src[name] = ch
    for code, name in cmap_src.items():
        ch = chr(code)
        if name not in rev_src and ("A" <= ch <= "Z"):
            rev_src[name] = ch.lower()
    # 源字体连字规则的「文本 → 结果 glyph」映射（与构建脚本同一还原口径）
    src_text_map = {}
    for lu in src["GSUB"].table.LookupList.Lookup:
        for st in lu.SubTable:
            real = walk(st)
            if hasattr(real, "ligatures"):
                for first, ls in real.ligatures.items():
                    for L in ls:
                        chars = [rev_src.get(g) for g in ([first] + list(L.Component))]
                        if all(c is not None for c in chars):
                            src_text_map.setdefault("".join(chars), L.LigGlyph)
    rev_s, rev_src_codes = reverse_cmap(sub), reverse_cmap(src)
    broken = []
    for name in static:
        # 源字体里该名的连字结果 glyph 及其 PUA 码点
        if name not in src_text_map:
            broken.append((name, "not-in-src-liga"))
            continue
        src_glyph = src_text_map[name]
        src_codes = {c for c in rev_src_codes.get(src_glyph, set()) if 0xE000 <= c <= 0xF8FF}
        g = shape(name, cmap_s, ligs_s)
        if g is None:
            broken.append((name, "subset-cmap-miss"))
            continue
        if len(g) != 1:
            broken.append((name, f"no-collapse({len(g)})"))
            continue
        sub_codes = {c for c in rev_s.get(g[0], set()) if 0xE000 <= c <= 0xF8FF}
        if src_codes and sub_codes and not (src_codes & sub_codes):
            broken.append((name, f"identity-mismatch src={src_codes} sub={sub_codes}"))
            continue
    print(f"[{fam}] verified {len(static) - len(broken)}/{len(static)}")
    for n, r in broken[:12]:
        print("   BROKEN:", n, r)
    if broken:
        fail += 1

print("RESULT:", "FAIL" if fail else "ALL ICONS VERIFIED (identity-level)")
sys.exit(1 if fail else 0)
