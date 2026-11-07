#!/usr/bin/env python3
# patch-211-colormix-fallback.py — #211：color-mix() 14 处前置兜底行插入（R113 窗加餐②）
# 语义：不支持 color-mix 的旧引擎（Chrome<111 / Safari<16.2 / Firefox<113）会把整条
#       声明丢弃，元素回落更早声明或初始值；本补丁在每处 color-mix 声明前插一行静态
#       rgba 兜底（取 var() 内 fallback 字面值 × 混合率；嵌套 rgba 透明度相乘），
#       支持引擎按层叠自然被下行覆盖，零视觉变化、零 JS 检测成本。
# md3-theme.css 5 处不在本补丁范围：已有设计内 @supports not(color-mix) 整体灰化降级。
import io, sys

ROOT = '/home/z/my-project/md3-repo/ios-desktop/css/'
COMMENT = '/* 旧内核兜底（不支持 color-mix 整条声明被丢弃；下行覆盖本行） */'

# (file, unique-anchor-line, fallback-line-content)
PATCHES = [
    ('all-apps.css',
     'color: color-mix(in srgb, var(--md-on-surface, #e8eaf0) 55%, transparent);',
     '  color: rgba(232, 234, 240, 0.55); %s' % COMMENT),
    ('all-apps.css',
     'box-shadow: 0 0 0 2px color-mix(in srgb, var(--md-primary, #7c9cff) 65%, transparent);',
     '  box-shadow: 0 0 0 2px rgba(124, 156, 255, 0.65); %s' % COMMENT),
    ('all-apps.css',
     'background: color-mix(in srgb, var(--md-on-surface, #e8eaf0) 8%, transparent);',
     '  background: rgba(232, 234, 240, 0.08); %s' % COMMENT),
    ('all-apps.css',
     'background: color-mix(in srgb, var(--md-on-surface, #e8eaf0) 14%, transparent);',
     '  background: rgba(232, 234, 240, 0.14); %s' % COMMENT),
    ('all-apps.css',
     "color: color-mix(in srgb, var(--md-on-surface, #e8eaf0) 55%, transparent);\n\n  /* 双列网格模式（2~3 列） */",
     None),  # placeholder guard（第 5 处与第 1 处同文，用位置区分）
    ('aod.css',
     'background: color-mix(in srgb, var(--md-surface-container-high, rgba(255, 255, 255, 0.12)) 40%, transparent);',
     '  background: rgba(255, 255, 255, 0.05); %s' % COMMENT),
    ('lock-screen.css',
     'background: color-mix(in srgb, var(--md-surface-container-high, rgba(255, 255, 255, 0.12)) 72%, transparent);',
     '  background: rgba(255, 255, 255, 0.09); %s' % COMMENT),
    ('lock-screen.css',
     'fill: color-mix(in srgb, var(--md-surface-container-high, rgba(255, 255, 255, 0.1)) 55%, transparent);',
     '  fill: rgba(255, 255, 255, 0.06); %s' % COMMENT),
    ('lock-screen.css',
     'stroke: color-mix(in srgb, var(--md-on-surface, #fff) 55%, transparent);',
     '  stroke: rgba(255, 255, 255, 0.55); %s' % COMMENT),
    ('lock-screen.css',
     'stroke: color-mix(in srgb, var(--md-on-surface, #fff) 62%, transparent);',
     '  stroke: rgba(255, 255, 255, 0.62); %s' % COMMENT),
    ('pixel-features.css',
     'background: color-mix(in srgb, var(--md-primary, #7df8db) 14%, transparent);',
     '  background: rgba(125, 248, 219, 0.14); %s' % COMMENT),
    ('pull-panels.css',
     'background: color-mix(in srgb, var(--md-primary) 12%, transparent);',
     '  background: rgba(124, 156, 255, 0.12); %s（primary 令牌无字面 fallback，取中性主色近似） */' % COMMENT[:-2]),
    ('pull-panels.css',
     'background: color-mix(in srgb, var(--md-on-surface) 12%, transparent);',
     '  background: rgba(232, 234, 240, 0.12); %s（on-surface 令牌无字面 fallback，取中性面色近似） */' % COMMENT[:-2]),
    ('settings-two-pane.css',
     'background: color-mix(in srgb, var(--md-primary, #7df8db) 26%, transparent);',
     '  background: rgba(125, 248, 219, 0.26); %s' % COMMENT),
]

done, skipped = [], []
for fname, anchor, repl in PATCHES:
    if repl is None:
        continue
    path = ROOT + fname
    s = io.open(path, encoding='utf-8').read()
    if s.count(anchor) != 1:
        skipped.append((fname, anchor[:50], 'count=%d' % s.count(anchor)))
        continue
    # 仅补 all-apps.css 第 5 处（:211）——首处已由第一条补丁覆盖
    s = s.replace(anchor, repl + '\n' + anchor, 1)
    io.open(path, 'w', encoding='utf-8').write(s)
    done.append((fname, anchor[:40]))

# all-apps.css 第二处同文 color-mix（:211 二级条目色）单独按行号定位补插
p = ROOT + 'all-apps.css'
s = io.open(p, encoding='utf-8').read().split('\n')
hits = [i for i, l in enumerate(s) if l.strip() == 'color: color-mix(in srgb, var(--md-on-surface, #e8eaf0) 55%, transparent);']
if len(hits) == 1 and 'rgba(232, 234, 240, 0.55)' not in s[hits[0] - 1]:
    s.insert(hits[0], '  color: rgba(232, 234, 240, 0.55); %s' % COMMENT)
    io.open(p, 'w', encoding='utf-8').write('\n'.join(s))
    done.append(('all-apps.css(2nd)', 'color 55%'))
elif len(hits) == 0:
    done.append(('all-apps.css(2nd)', 'already-covered'))

print('DONE:', len(done))
for d in done: print('  +', d[0], '|', d[1])
if skipped:
    print('SKIPPED:', skipped)
    sys.exit(1)
