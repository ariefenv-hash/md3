#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v7.7-A Material Symbols 图标字体子集化 v2
思路:
  1. 源字体 GSUB 连字查找表存在「小写字母组件」与「大写字母组件」两套并行系统，
     浏览器经 cmap 走的是小写系统 → 只保留小写系统中候选图标名的连字规则（其余删除），
     避免子集 closure 把全量图标拉回（4299 规则共享字母首组件）。
  2. pyftsubset 用 --gids（glyph ID）而非名字，规避大小写同名 glyph 的解析歧义。
  3. 正确性由 verify_font_subset.py 以 HarfBuzz 式 cmap+liga 链路模拟 + 浏览器实测裁决。
"""
import os
import re
import subprocess
import sys

REPO = "/home/z/my-project/md3_repo"
SRC = "/home/z/my-project/scripts/fontsrc"
OUT_DIR = os.path.join(REPO, "ios-desktop", "assets", "fonts")
TMP = "/home/z/my-project/scripts/fontsrc"

FONTS = [
    ("Material Symbols Rounded", os.path.join(SRC, "ms-rounded.woff2"), os.path.join(OUT_DIR, "material-symbols-rounded.woff2")),
    ("Material Symbols Outlined", os.path.join(SRC, "ms-outlined.woff2"), os.path.join(OUT_DIR, "material-symbols-outlined.woff2")),
]


def walk(st):
    if hasattr(st, "ExtSubTable"):
        return st.ExtSubTable
    return st


# ---------- 1. 扫描项目文本，收集候选图标名 ----------
scan_files = []
for root_dir in (os.path.join(REPO, "ios-desktop", "apps"), os.path.join(REPO, "ios-desktop", "js")):
    for dp, _, fns in os.walk(root_dir):
        for fn in fns:
            if fn.endswith((".html", ".js", ".css")):
                scan_files.append(os.path.join(dp, fn))
scan_files.append(os.path.join(REPO, "ios-desktop", "index.html"))
corpus = "\n".join(open(fp, encoding="utf-8", errors="ignore").read() for fp in scan_files)

static_names = set(re.findall(r'material-symbols-(?:rounded|outlined)[^>]*>\s*([a-z0-9_]+)\s*<', corpus))
word_tokens = set(re.findall(r'[a-z0-9_]{2,40}', corpus))
print(f"static icon marks: {len(static_names)} | word tokens: {len(word_tokens)}")

os.makedirs(OUT_DIR, exist_ok=True)
report = {}

for fam, src, dst in FONTS:
    from fontTools.ttLib import TTFont
    f = TTFont(src)
    order = f.getGlyphOrder()
    cmap = f.getBestCmap()

    # glyph → 文本字符反查：本字体连字组件的下划线是名为 'underscore' 的 glyph，
    # 且 cmap 对字母做了大小写双映射（'h'/'H' → 同一 glyph）——必须经 cmap 反查
    # 还原每条连字规则的真实文本，才能与项目里的图标名（含 _）正确匹配
    rev = {}
    for code, name in cmap.items():
        ch = chr(code)
        if ("a" <= ch <= "z") or ch == "_" or ("0" <= ch <= "9"):
            rev[name] = ch
    for code, name in cmap.items():
        ch = chr(code)
        if name not in rev and ("A" <= ch <= "Z"):
            rev[name] = ch.lower()

    # 收集全部连字规则并还原文本
    rule_ref = {}   # text -> (li, si, ri)
    for li, lu in enumerate(f["GSUB"].table.LookupList.Lookup):
        for si, st in enumerate(lu.SubTable):
            real = walk(st)
            if not hasattr(real, "ligatures"):
                continue
            for first, ls in real.ligatures.items():
                for ri, L in enumerate(ls):
                    chars = [rev.get(g) for g in ([first] + list(L.Component))]
                    if all(c is not None for c in chars):
                        rule_ref.setdefault("".join(chars), (li, si, ri))

    cand = {n for n in (static_names | word_tokens) if n in rule_ref}
    print(f"[{fam}] candidate icons: {len(cand)} (liga rules with text: {len(rule_ref)})")

    # ---------- 2. 剪枝 GSUB：只保留候选名命中的连字规则 ----------
    keep = {}
    for n in cand:
        li, si, ri = rule_ref[n]
        keep.setdefault(li, {}).setdefault(si, set()).add(ri)
    pruned = 0
    for li, lu in enumerate(f["GSUB"].table.LookupList.Lookup):
        for si, st in enumerate(lu.SubTable):
            real = walk(st)
            if not hasattr(real, "ligatures"):
                continue
            kept_idx = keep.get(li, {}).get(si)
            if kept_idx is None:
                kept_idx = set()
            for first in list(real.ligatures.keys()):
                ls = real.ligatures[first]
                new_ls = [L for ri, L in enumerate(ls) if ri in kept_idx]
                if new_ls:
                    real.ligatures[first] = new_ls
                else:
                    del real.ligatures[first]
                    pruned += 1
    # 空查找表清理：连字规则全空的 subtable/lookup 删除，防 shaping 空跑
    gsub = f["GSUB"].table
    new_lookups = []
    for lu in gsub.LookupList.Lookup:
        lu.SubTable = [st for st in lu.SubTable if bool(getattr(walk(st), "ligatures", None))]
        if lu.SubTable:
            new_lookups.append(lu)
    gsub.LookupList.Lookup = new_lookups
    gsub.FeatureList.FeatureRecord[0].Feature.LookupListIndex = [
        i for i, lu in enumerate(gsub.LookupList.Lookup)
    ] if new_lookups else []
    print(f"[{fam}] pruned rules -> kept candidates {len(cand)}, emptied {pruned} first-keys")

    # ---------- 3. 计算保留 glyph 集（按 glyph ID，规避命名歧义） ----------
    # 浏览器链路起点 = cmap[char]；组件/结果 glyph 从保留规则本身取
    needed_names = {".notdef"}
    for c in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_":
        if ord(c) in cmap:
            needed_names.add(cmap[ord(c)])
    for li, lu in enumerate(f["GSUB"].table.LookupList.Lookup):
        for st in lu.SubTable:
            real = walk(st)
            if not hasattr(real, "ligatures"):
                continue
            for first, ls in real.ligatures.items():
                needed_names.add(first)
                for L in ls:
                    needed_names.update(L.Component)
                    needed_names.add(L.LigGlyph)
    name_to_gid = {name: i for i, name in enumerate(order)}
    gids = sorted(name_to_gid[n] for n in needed_names if n in name_to_gid)

    # 保存剪枝后的中间字体
    mid = os.path.join(TMP, f"mid-{fam.split()[-1].lower()}.woff2")
    f.flavor = "woff2"
    f.save(mid)
    f.flavor = None

    # ---------- 3.5 部分实例化：钉死 opsz/GRAD/wght（全项目固定值），保留 FILL 轴 ----------
    # 子应用 font-variation-settings 仅动 FILL（reminders icon-filled 等），其余恒为默认；
    # gvar 轴增量表是 woff2 体积大头，钉三轴可减掉 ~3/4 的增量数据
    inst = os.path.join(TMP, f"inst-{fam.split()[-1].lower()}.woff2")
    argv_inst = [
        sys.executable, "-m", "fontTools.varLib.instancer", mid,
        "opsz=24", "GRAD=0", "wght=400",
        "--output=" + inst,
    ]
    r = subprocess.run(argv_inst, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout, r.stderr)
        sys.exit(1)

    # ---------- 4. glyph ID 子集化 ----------
    argv = [
        sys.executable, "-m", "fontTools.subset", inst,
        "--gids=" + ",".join(str(g) for g in gids),
        "--layout-features=*",
        "--flavor=woff2",
        "--output-file=" + dst,
        "--notdef-outline",
    ]
    r = subprocess.run(argv, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout, r.stderr)
        sys.exit(1)
    size = os.path.getsize(dst)
    report[fam] = (len(cand), size)
    print(f"[ok] {fam}: {len(cand)} icons, {len(gids)} gids -> {size/1024:.1f} KB")

# ---------- 5. 生成 CSS ----------
total_kb = sum(s for _, s in report.values()) / 1024
n_icons = sum(n for n, _ in report.values())
css = f"""/* ==================== Material Symbols 本地字体（v7.7-A） ====================
 * 源: google/material-design-icons variablefont（FILL/GRAD/opsz/wght 四轴完整保留）
 * 子集化: scripts/build_font_subset.py v2 —— GSUB 连字规则剪枝 + glyph ID 级子集，
 * 仅保留项目实际引用的 {n_icons} 个连字图标；fonts.googleapis.com 网络依赖归零。
 * 正确性: scripts/verify_font_subset.py（cmap+liga 链路模拟）+ 浏览器渲染实测。 */
@font-face {{
  font-family: 'Material Symbols Rounded';
  font-style: normal;
  font-weight: 100 700;
  font-display: block;
  src: url(material-symbols-rounded.woff2) format('woff2');
}}
@font-face {{
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 100 700;
  font-display: block;
  src: url(material-symbols-outlined.woff2) format('woff2');
}}
.material-symbols-rounded, .material-symbols-outlined {{
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}}
.material-symbols-rounded {{ font-family: 'Material Symbols Rounded'; }}
.material-symbols-outlined {{ font-family: 'Material Symbols Outlined'; }}
"""
with open(os.path.join(OUT_DIR, "material-symbols.css"), "w", encoding="utf-8") as fp:
    fp.write(css)
print(f"[done] css written | icons={n_icons} | total {total_kb:.1f} KB")
