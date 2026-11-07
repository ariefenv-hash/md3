#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""visual-token-audit.py — #244 静态视觉令牌采用率全量核（纯文档零代码交付的扫描器）

口径对齐 #229 摸底（跳过 vendor/ 与 *.min.*）+ #240 N/43 采用率分母。
五令牌面：A 动态取色 / B 字体契约 / C 形状 / D 状态层 / E 深色与窄屏（F 运动令牌仅上下文列）。
输出 markdown 行到 stdout，由调用方组装 docs/visual-token-adoption.md。
"""
import os, re, json, subprocess, sys

REPO = '/home/z/my-project/md3-repo'
APPS = os.path.join(REPO, 'ios-desktop', 'apps')

SKIP_DIRS = {'vendor'}
SKIP_FILE = re.compile(r'\.min\.')

# #229 批次分组（41 应用矩阵）
STOCK = {  # 存量（10-04 bulk 导入 21 个）
    'translate','calendar','safari','shortcuts','music','messages','books','phone',
    'stocks','notes','reminders','clock-app','flow11','photos','camera','weather',
    'threes','game2048','dice','contacts','calculator',
}
NEW229 = {  # 新增批次（10-26 起逐个创建 20 个）
    'driving','code-editor','terminal','reaction','word','piano','chess','stt','radio',
    'archive','ocr','gravity','typing','bytebeat','midi-player','python','ping',
    'drawcircle','pdf','markdown',
}

def app_files(appdir):
    out = []
    for root, dirs, files in os.walk(appdir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            if SKIP_FILE.search(f):
                continue
            if f.endswith(('.html', '.css', '.js', '.mjs')):
                out.append(os.path.join(root, f))
    return out

COLOR_RE = re.compile(r'var\(--md-')
RAW_COLOR_RE = re.compile(r'#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(')
# 字体契约：消费 --md-text-font / --md-font（含 --md-font-num 别名族）
FONT_TOKEN_RE = re.compile(r'var\(--md-text-font\)|var\(--md-font[),\s]')
# 硬编码字体栈：font-family: 后非 var(--md-*，豁免图标字体/等宽场景（#7.58 契约口径）
FF_RE = re.compile(r'font-family\s*:\s*([^;}]+)', re.I)
FONT_EXEMPT = re.compile(r"Material Symbols|Material Icons|Roboto Mono|'Roboto Slab'|monospace|ui-monospace|Consolas|Menlo|Courier|var\(--md-", re.I)
SHAPE_RE = re.compile(r'var\(--md-r-')
STATE_RE = re.compile(r'var\(--md-state-')
MEDIA_RE = re.compile(r'@media')
W760_RE = re.compile(r'min-width\s*:\s*760px')
DARK_RE = re.compile(r'prefers-color-scheme\s*:\s*dark')
MOTION_RE = re.compile(r'var\(--md-easing-|var\(--md-duration-')
# 形态语言锚（#229 D 门槛，上下文列）
FORM_RE = re.compile(r'mdslider|pressRipple|squeeze-row|idle-slider|wave', re.I)

def first_commit_date(app):
    try:
        r = subprocess.run(
            ['git', 'log', '--reverse', '--format=%as', '-1', '--', f'ios-desktop/apps/{app}'],
            cwd=REPO, capture_output=True, text=True, timeout=20)
        return r.stdout.strip().split('\n')[0] if r.stdout.strip() else '?'
    except Exception:
        return '?'

def scan(app):
    n_lines = 0; n_md = 0; n_raw = 0; n_font = 0; n_ffhard = 0
    n_shape = 0; n_state = 0; n_media = 0; n_760 = 0; n_dark = 0
    n_motion = 0; n_form = 0
    for p in app_files(os.path.join(APPS, app)):
        try:
            src = open(p, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        n_lines += src.count('\n') + 1
        n_md += len(COLOR_RE.findall(src))
        n_raw += len(RAW_COLOR_RE.findall(src))
        if FONT_TOKEN_RE.search(src):
            n_font += 1
        for m in FF_RE.finditer(src):
            if not FONT_EXEMPT.search(m.group(1)):
                n_ffhard += 1
        n_shape += len(SHAPE_RE.findall(src))
        n_state += len(STATE_RE.findall(src))
        n_media += len(MEDIA_RE.findall(src))
        n_760 += len(W760_RE.findall(src))
        if DARK_RE.search(src):
            n_dark += 1
        n_motion += len(MOTION_RE.findall(src))
        if FORM_RE.search(src):
            n_form += 1
    density = round(n_md * 100 / n_lines, 1) if n_lines else 0.0
    gate_a = n_md >= 15 and density >= 4.0
    return dict(lines=n_lines, md=n_md, dens=density, raw=n_raw,
                font=n_font, ffhard=n_ffhard, shape=n_shape, state=n_state,
                media=n_media, w760=n_760, dark=n_dark, motion=n_motion,
                form=n_form, gateA='✓' if gate_a else '✗')

def batch_of(app, date):
    if app in STOCK: return '存量'
    if app in NEW229: return '新增'
    # 矩阵后新应用：按首提日期（10-04 bulk = 存量基线；其后 = 新增）
    if date.startswith('2025-10-04') or date.startswith('2026-10-04'):
        return '存量'
    return '新增(矩阵后)'

def main():
    apps = sorted(d for d in os.listdir(APPS)
                  if os.path.isdir(os.path.join(APPS, d)) and not d.startswith('_'))
    rows = []
    for a in apps:
        d = scan(a)
        dt = first_commit_date(a)
        d.update(app=a, date=dt, batch=batch_of(a, dt))
        rows.append(d)
    json.dump(rows, open('/tmp/vta_rows.json', 'w'), ensure_ascii=False, indent=1)
    # 汇总
    for grp in ('存量', '新增', '新增(矩阵后)'):
        g = [r for r in rows if r['batch'] == grp]
        if not g: continue
        n = len(g)
        a = sum(1 for r in g if r['gateA'] == '✓')
        f = sum(1 for r in g if r['font'] > 0)
        c = sum(1 for r in g if r['shape'] > 0)
        s = sum(1 for r in g if r['state'] > 0)
        b = sum(1 for r in g if r['media'] > 0 and r['w760'] > 0)
        print(f"[SUMMARY] {grp}: n={n} A色彩={a}/{n} B字体={f}/{n} C形状={c}/{n} D状态层={s}/{n} E响应={b}/{n}")
    print(f"[TOTAL] apps={len(rows)}")
    for r in rows:
        print(f"[ROW] {r['app']}|{r['batch']}|{r['date']}|{r['lines']}|{r['md']}|{r['dens']}|{r['raw']}|{r['gateA']}|{r['font']}|{r['ffhard']}|{r['shape']}|{r['state']}|{r['media']}|{r['w760']}|{r['motion']}|{r['form']}")

if __name__ == '__main__':
    main()
