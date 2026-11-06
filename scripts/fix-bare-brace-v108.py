#!/usr/bin/env python3
"""v10.08 #105 修复①：解包 17 个 CSS 文件中 migrate-reduce-motion-v1011.py 残留的裸 `{` 包裹块。

背景：迁移脚本在每个 @media (prefers-reduced-motion) 块后追加属性通道副本时，
把副本外层误留了无选择器的 `{ ... }` 包裹（CSS 语法非法，浏览器整块丢弃 →
属性通道在 17 文件全部失效）。本脚本把裸包裹解除：删除裸 `{` 行与其配对 `}` 行，
保留块内合法的 html[data-a11y-reduce-motion] 规则。

安全边界：只处理「裸 { 且块内含 data-a11y-reduce-motion」的块；解包前后
大括号总数必须恰好 -2；块必须 brace 平衡才动手。
"""
import re, sys

FILES = [
    'ios-desktop/css/all-apps.css', 'ios-desktop/css/aod.css', 'ios-desktop/css/base.css',
    'ios-desktop/css/desktop.css', 'ios-desktop/css/dock.css', 'ios-desktop/css/files-app.css',
    'ios-desktop/css/lock-screen.css', 'ios-desktop/css/m3e.css', 'ios-desktop/css/mini-window.css',
    'ios-desktop/css/nav-bar.css', 'ios-desktop/css/pixel-features.css', 'ios-desktop/css/pull-panels.css',
    'ios-desktop/css/split-screen.css', 'ios-desktop/css/taskbar-transient.css', 'ios-desktop/css/taskbar.css',
    'ios-desktop/css/theme-mode.css', 'ios-desktop/css/widget-board.css',
]

total_unwrapped = 0
for path in FILES:
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    out = []
    i = 0
    n = len(lines)
    unwrapped = 0
    while i < n:
        stripped = lines[i].strip()
        if stripped == '{':
            # 向前找配对 `}`（计数），并确认块内含 data-a11y-reduce-motion
            depth = 0
            j = i
            balanced = False
            while j < n:
                depth += lines[j].count('{') - lines[j].count('}')
                if depth == 0 and j > i:
                    balanced = True
                    break
                if depth < 0:
                    break
                j += 1
            block = ''.join(lines[i+1:j]) if balanced else ''
            if balanced and 'data-a11y-reduce-motion' in block:
                # 解包：跳过裸 { 行与配对 } 行，保留中间内容
                out.extend(lines[i+1:j])
                i = j + 1
                unwrapped += 1
                continue
        out.append(lines[i])
        i += 1
    if unwrapped:
        before = sum(l.count('{') for l in lines) - sum(l.count('}') for l in lines)
        after = sum(l.count('{') for l in out) - sum(l.count('}') for l in out)
        assert before == after, f'{path}: brace balance drift {before}->{after}'
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(out)
        print(f'{path}: unwrapped {unwrapped}')
        total_unwrapped += unwrapped
print(f'TOTAL unwrapped: {total_unwrapped}')
