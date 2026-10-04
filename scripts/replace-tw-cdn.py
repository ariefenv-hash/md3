#!/usr/bin/env python3
"""批量替换 7 个 app 的 Tailwind Play CDN 引用为本地预编译 CSS"""
import pathlib, re, sys

APPS = ['notes', 'safari', 'photos', 'books', 'stocks', 'messages', 'weather']
ROOT = pathlib.Path('/home/z/my-project/md3-project/ios-desktop/apps')

total = 0
for app in APPS:
    p = ROOT / app / 'index.html'
    s = p.read_text(encoding='utf-8')
    pattern = re.compile(r'[ \t]*<script\s+src="https://cdn\.tailwindcss\.com"></script>\s*\n?')
    m = pattern.search(s)
    if not m:
        print(f'✗ {app}: 未找到 CDN 引用（格式变化？）')
        sys.exit(1)
    indent = re.match(r'([ \t]*)', m.group(0)).group(1)
    replacement = f'{indent}<link rel="stylesheet" href="../_shared/tw-utilities.css">\n'
    s2 = pattern.sub(replacement, s, count=1)
    p.write_text(s2, encoding='utf-8')
    total += 1
    print(f'✓ {app}: CDN script → 本地 link')

# 残留检查（全仓不许再出现 Play CDN）
residual = []
for app in APPS:
    s = (ROOT / app / 'index.html').read_text(encoding='utf-8')
    if 'cdn.tailwindcss.com' in s:
        residual.append(app)
print(f'\n替换 {total}/7，残留: {residual or "无"}')
