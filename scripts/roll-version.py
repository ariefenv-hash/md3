#!/usr/bin/env python3
# roll-version.py — 版本锚全量滚动固化脚本（R56 建议③落地，v9.39 #160 二期窗口建成）
#
# 坑史：
#   R51/R53/R55/R56 同源四度——正则字面量 /v9\.XX/ 带 \. 转义、toBe('9.XX.0')、
#   README 加粗块 **当前版本 vX.XX**、grant-permissions.js 头部锚——四种形态漏一即红。
#   R90 坑②——版本子串碰撞（759.98px 含 9.98 被误滚），调用方须在 diff 抽查非版本数值。
#   R91 坑④——pkg 跨十位（9.99.0→10.0.0）：旧正则只认 "<old>.0" 形态不命中 semver
#   合法化的 "10.0.0" → 漏滚 37 红。
#   R91 披露——二段滚动（9.99→9.100→10.00）误滚注释内历史注记与 README 到达注记。
#   R92 实锤两条——①R91 的「整注释行豁免」默认化破坏四条**注释即锚**测试契约
#   （v155/v195b/v195c/v788 断言源码注释内当前版本字样）；②行级 /* 块探测被字符串
#   字面量内的 "/*"（data:image/*、'; /* homepage...'）毒化——块永不闭合，其后整文件
#   静默免滚（v165/v174 版本断言漏滚 7 红实录）。
#
# v10.01 定案（R92 窗）：
#   ① **默认 = 全量滚（blanket）**——v9.39 以来百余轮实战验证的原始行为；历史注记
#      保护回归为**显式 opt-in**（--keep-history-comments）。理由：单步正常滚动
#      （old→new=old±1）从不触碰版本号 ≠ old 的历史注记，R91 误滚根因是**二段进位**
#      特例（9.99 同时是旧版与史实注记）——正常滚动下注释内当前版本锚（四条测试契约）
#      必须随滚，豁免默认化是本末倒置。
#   ② --keep-history-comments：整注释行豁免（R91 机制保留），块探测改为**字符串感知
#      扫描**（先剥 '…'/"…"/`…` 字面量再判 /* //，根除 data:image/* 毒化）。
#   ③ pkg 多形态：旧形态候选 = {pkg_semver(old), "<old>.0"} 全命中 → 统一换
#      pkg_semver(new)（与 sync-readme-version.mjs normalize() 同律：minor=int(YZ)、
#      patch=0——v9.99→9.99.0 / v10.00→10.0.0 / v10.01→10.1.0 / v10.10→10.10.0）。
#      旧 PAIRS[0] 产 "10.01.0" 违 semver 前导零（R91 37 红根因）——根治。
#   ④ README 块内限定滚：仅滚 <!-- md3:version:start/end --> 标记块（sync 脚本写入区），
#      块外正文（v7.52 到达注记等史实）一概不动——两模式同律。块标记缺失不滚并告警。
#   ⑤ pkg 防呆：package.json version 不在旧形态候选集 → 拒绝退出 2（--force 可跳）。
#   ⑥ --selftest：双模式 fixture 验证（默认七形态 + opt-in 豁免与毒化回归），退出码即门禁。
#   ⑦ --dry-run：只打印将改动文件，不落盘。
#
# 用法：
#   python3 scripts/roll-version.py 10.00 10.01            # 实滚（默认全量）
#   python3 scripts/roll-version.py 10.00 10.01 --dry-run  # 预览
#   python3 scripts/roll-version.py 10.00 10.01 --keep-history-comments  # 整注释行豁免（R91 机制）
#   python3 scripts/roll-version.py --selftest
#
# 扫描范围：tests/*.js + ios-desktop/js/**/*.js + ios-desktop/apps/**（.html/.js/.mjs）
# + README.md（块内）+ package.json（version 字段）。
import sys, pathlib, re, tempfile, shutil

VERSION_START = '<!-- md3:version:start -->'
VERSION_END = '<!-- md3:version:end -->'


def pkg_semver(v):
    """vX.YZ 展示形 → semver（与 sync-readme-version.mjs normalize() 同律）。"""
    m = re.fullmatch(r'(\d+)\.(\d{2})', v)
    if not m:
        return None
    return f'{int(m.group(1))}.{int(m.group(2))}.0'


def build_pairs(old, new):
    """五形态替换对。新形态一律 pkg_semver(new)（semver 合法，无前导零）。"""
    new_sev = pkg_semver(new) or f'{new}.0'
    old_cands, seen = [], set()
    for cand in (pkg_semver(old), f'{old}.0'):   # 10.0.0 + 10.00.0（R91 遗留形态兜底）
        if cand and cand not in seen:
            seen.add(cand)
            old_cands.append(cand)
    old_esc = old.replace('.', r'\.')
    new_esc = new.replace('.', r'\.')
    pairs = [(cand, new_sev) for cand in old_cands]       # ① semver/legacy pkg 形态
    pairs.append((f'v{old}', f'v{new}'))                  # ② v10.00
    pairs.append((f'v{old_esc}', f'v{new_esc}'))          # ③ /v10\.00/ 正则字面量
    pairs.append((f'{old_esc}', f'{new_esc}'))            # ④ 兜底其余 10\.00 转义形态
    return pairs


def skeleton(line, in_block, state):
    """字符串感知骨架：返回 (skeleton, in_block, string_state)。
    字符串内容（'…' "…" `…`，含转义）与块注释体替换为空格；// 后清空。
    in_block/跨行模板态由调用方携带。"""
    out = []
    i, n = 0, len(line)
    q = state
    while i < n:
        c = line[i]
        if in_block:
            j = line.find('*/', i)
            if j == -1:
                out.append(' ' * (n - i))
                return ''.join(out), True, q
            out.append('  ' + ' ' * (j - i))
            i = j + 2
            in_block = False
            continue
        if q == '`':
            if c == '\\':
                out.append('  ')
                i += 2
                continue
            out.append(' ')
            if c == '`':
                q = None
            i += 1
            continue
        if q in ("'", '"'):
            if c == '\\':
                out.append('  ')
                i += 2
                continue
            out.append(' ')
            if c == q:
                q = None
            i += 1
            continue
        if c in ("'", '"', '`'):
            q = c
            out.append(' ')
            i += 1
            continue
        if c == '/' and i + 1 < n and line[i + 1] == '/':
            out.append(' ' * (n - i))
            return ''.join(out), False, q
        if c == '/' and i + 1 < n and line[i + 1] == '*':
            in_block = True
            out.append('/*')
            i += 2
            continue
        out.append(c)
        i += 1
    return ''.join(out), in_block, q


def roll_code_lines(text, pairs):
    """--keep-history-comments 模式：整注释行豁免；行尾注释随代码滚。
    块/行注释判定基于字符串感知骨架（根除 data:image/* 类字符串毒化）。"""
    out_lines = []
    in_block = False
    tpl_state = None
    for line in text.split('\n'):
        sk, in_block, tpl_state = skeleton(line, in_block, tpl_state)
        stripped = sk.lstrip()
        # 空骨架 = 整行皆注释/块体/字符串体（骨架已剥空）——豁免模式下不滚
        if (not stripped or stripped.startswith('//')
                or stripped.startswith('*') or stripped.startswith('/*')):
            out_lines.append(line)  # 整注释行豁免（含 JSDoc 续行与块体）
            continue
        code_part, sep, tail = line.partition('//')  # 行尾注释随滚（F 组接线锚整串同步）
        for a, b in pairs:
            code_part = code_part.replace(a, b)
            tail = tail.replace(a, b)
        out_lines.append(code_part + sep + tail)
    return '\n'.join(out_lines)


def roll_readme_block(text, pairs):
    """README：仅滚版本标记块；块缺失返回 (原文, False) 由调用方告警。"""
    i0 = text.find(VERSION_START)
    i1 = text.find(VERSION_END)
    if i0 == -1 or i1 == -1 or i1 < i0:
        return text, False
    head = i0 + len(VERSION_START)
    seg = text[head:i1]
    for a, b in pairs:
        seg = seg.replace(a, b)
    return text[:head] + seg + text[i1:], True


def collect_targets(root):
    targets = list((root / 'tests').glob('*.js'))
    targets += list((root / 'ios-desktop' / 'js').rglob('*.js'))
    targets += [p for p in (root / 'ios-desktop' / 'apps').rglob('*')
                if p.suffix in ('.html', '.js', '.mjs')]
    targets.append(root / 'README.md')
    return targets


def run(root, old, new, dry_run=False, force=False, keep_history=False):
    pairs = build_pairs(old, new)
    new_sev = pkg_semver(new) or f'{new}.0'
    old_cands = [a for a, _ in pairs[:2]]
    changed, skipped_block = [], []

    pkg = root / 'package.json'
    ptxt = pkg.read_text(encoding='utf-8')
    m = re.search(r'"version":\s*"([^"]+)"', ptxt)
    cur = m.group(1) if m else '(unreadable)'
    if cur not in old_cands and not force:
        raise SystemExit(
            f'✋ package.json version="{cur}" 不在旧形态候选集 {old_cands} —— '
            f'跨十位/异常形态需人工核对（R91 坑④防复发门）。确认无误可用 --force。')

    for p in collect_targets(root):
        if not p.is_file():
            continue
        txt = p.read_text(encoding='utf-8')
        rel = p.relative_to(root)
        if p.name == 'README.md':
            txt2, ok = roll_readme_block(txt, pairs)
            if not ok:
                skipped_block.append(str(rel))
                continue
        elif p.suffix in ('.js', '.mjs') and keep_history:
            txt2 = roll_code_lines(txt, pairs)
        else:
            txt2 = txt
            for a, b in pairs:
                txt2 = txt2.replace(a, b)
        if txt2 != txt:
            changed.append(rel)
            if not dry_run:
                p.write_text(txt2, encoding='utf-8')
            print(f'  rolled: {rel}')

    ptxt2 = re.sub(r'"version":\s*"(?:%s)"' % '|'.join(re.escape(c) for c in old_cands),
                   f'"version": "{new_sev}"', ptxt)
    if ptxt2 != ptxt:
        if not dry_run:
            pkg.write_text(ptxt2, encoding='utf-8')
        print(f'  rolled: package.json (version → {new_sev})')
        changed.append(pkg.relative_to(root))
    elif not dry_run:
        print(f'  ⚠️ package.json 未变化（当前 "{cur}"）——请核对')

    for rel in skipped_block:
        print(f'  ⚠️ README 版本块标记缺失，未滚：{rel}（防全滚误伤史实注记）')
    mode = []
    if dry_run:
        mode.append('dry-run 预览')
    if keep_history:
        mode.append('整注释行豁免')
    suffix = f"（{' / '.join(mode)}）" if mode else ''
    print(f'完成：{len(changed)} 个文件滚动 {old} → {new} {suffix}')
    return changed


def selftest():
    """双模式 fixture：默认全量（注释即锚随滚）/ opt-in 豁免（史实保留 + 毒化回归）。"""
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='roll-selftest-'))
    try:
        (tmp / 'tests').mkdir()
        (tmp / 'ios-desktop' / 'js').mkdir(parents=True)
        (tmp / 'ios-desktop' / 'apps' / 'a').mkdir(parents=True)
        poison = ("it('img src 放行 data:image/*（base64 图），拒绝其他 data:', () => {});\n"
                  "expect(PKG.version).toBe('10.0.0');\n")
        (tmp / 'tests' / 'a.test.js').write_text(
            "describe('v10.00 #19', () => {\n"
            "  it('semver', () => { const v = '10.0.0'; expect(v).toBe('10.0.0'); });\n"
            "  it('regex', () => { const re = /v10\\.00/; expect(re).toBeTruthy(); });\n"
            "});\n"
            "// v10.00 #19 裁决在录（整注释行，断言即锚——默认模式必须随滚）\n"
            "const anchor = 'x'; // v10.00 #19 接线锚（行尾注随滚）\n"
            + poison, encoding='utf-8')
        (tmp / 'ios-desktop' / 'js' / 'x.js').write_text(
            "const V = 'v10.00';\n"
            "// v9.99 #90：延后期史实注记\n", encoding='utf-8')
        (tmp / 'ios-desktop' / 'apps' / 'a' / 'index.html').write_text(
            "<!-- v10.00 应用注释锚（html 全滚） -->\n", encoding='utf-8')
        (tmp / 'README.md').write_text(
            f'{VERSION_START}\n> **当前版本 v10.00** · 真源\n{VERSION_END}\n\n'
            "v7.52 新增。安装包系统（v7.52）史实注记（块外豁免，不得滚）。\n", encoding='utf-8')
        (tmp / 'package.json').write_text('{"name":"t","version":"10.0.0"}\n', encoding='utf-8')

        import io, contextlib

        def run_in(t, flag):
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                run(t, '10.00', '10.01', keep_history=flag)
            return buf.getvalue()

        # ── 默认模式（blanket，R92 定案）──
        run_in(tmp, False)
        t = (tmp / 'tests' / 'a.test.js').read_text(encoding='utf-8')
        r = (tmp / 'README.md').read_text(encoding='utf-8')
        x = (tmp / 'ios-desktop' / 'js' / 'x.js').read_text(encoding='utf-8')
        pkgv = (tmp / 'package.json').read_text(encoding='utf-8')
        checks_default = [
            ('describe 展示形滚',            "describe('v10.01 #19'" in t),
            ('semver 断言滚 10.1.0',         "toBe('10.1.0')" in t),
            ('正则字面量滚',                  '/v10\\.01/' in t),
            ('整注释行随滚（注释即锚契约）',  '// v10.01 #19 裁决在录' in t),
            ('行尾注随滚',                    '// v10.01 #19 接线锚' in t),
            ('毒化行后照常滚（R92 回归）',   "expect(PKG.version).toBe('10.1.0');" in t),
            ('js 代码行滚',                  "const V = 'v10.01';" in x),
            ('js 注释史实（旧版号≠old 不触碰）', '// v9.99 #90' in x),
            ('html 全滚',                    'v10.01 应用注释锚' in (tmp / 'ios-desktop' / 'apps' / 'a' / 'index.html').read_text(encoding='utf-8')),
            ('README 块内滚',                '> **当前版本 v10.01**' in r),
            ('README 块外史实豁免',          'v7.52 新增。安装包系统（v7.52）' in r and 'v10.01 新增' not in r),
            ('pkg → 10.1.0',                 '"version": "10.1.0"' in pkgv),
        ]
        ok_default = all(ok for _, ok in checks_default)
        for name, ok in checks_default:
            print(f'  {"✓" if ok else "✗"} [default] {name}')

        # ── opt-in 豁免模式（R91 机制 + 字符串感知）──
        for p in (tmp / 'tests').glob('*.js'):
            p.unlink()
        (tmp / 'package.json').write_text('{"name":"t","version":"10.0.0"}\n', encoding='utf-8')
        (tmp / 'tests' / 'b.test.js').write_text(
            "const anchor = 'y'; // v10.00 #N 行尾随滚\n"
            "// v10.00 整注释行（豁免模式保留）\n"
            "/* v10.00 块注释\n"
            "   v10.00 块续行 */\n"
            + poison, encoding='utf-8')
        run_in(tmp, True)
        b = (tmp / 'tests' / 'b.test.js').read_text(encoding='utf-8')
        checks_flag = [
            ('行尾注随滚',                 '// v10.01 #N 行尾随滚' in b),
            ('整注释行豁免',               '// v10.00 整注释行' in b and '// v10.01 整注释行' not in b),
            ('块注释豁免（含续行）',       '/* v10.00 块注释' in b and 'v10.00 块续行 */' in b),
            ('毒化行后照常滚（字符串感知）', "expect(PKG.version).toBe('10.1.0');" in b),
            ('data:image/* 不再开块',      "data:image/*（base64" in b),
        ]
        ok_flag = all(ok for _, ok in checks_flag)
        for name, ok in checks_flag:
            print(f'  {"✓" if ok else "✗"} [keep-history] {name}')

        failed = [n for n, ok in checks_default + checks_flag if not ok]
        if failed:
            print(f'selftest FAIL：{failed}')
            return 1
        print('selftest PASS：17/17 双模式全覆盖')
        return 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = {a for a in sys.argv[1:] if a.startswith('--')}
    if '--selftest' in flags:
        sys.exit(selftest())
    if len(args) < 2:
        print('用法: roll-version.py <旧版本如 10.00> <新版本如 10.01> '
              '[--dry-run] [--force] [--keep-history-comments] | --selftest')
        sys.exit(1)
    root = pathlib.Path(__file__).resolve().parent.parent
    run(root, args[0], args[1], dry_run='--dry-run' in flags,
        force='--force' in flags, keep_history='--keep-history-comments' in flags)
