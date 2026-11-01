#!/usr/bin/env python3
# ==================== apply-anchors-v910-round3.py — v9.10 第三批：产品分页修复 + 场景断言 ====================
# state.js：①默认布局 slice(24)→slice(24,48)+slice(48) 三页（修第 25 图标 slot 越界渲染 bug）
#           ②无痕追加溢出递归分页（此前仅开单溢出页，missing>24 仍单页超载）
# scenario-persistence：默认布局两页→三页断言；v859：恢复取末两位（第 2 页回归 24 满页）

import os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

EDITS = [
    # state.js ①默认分页定义
    ('ios-desktop/js/state.js',
     "// 初始化分页：第 1 页 24 个应用，第 2 页放新增应用\n"
     "const _initialPage1 = _initialApps.slice(0, 24).map((app, i) => ({ ...app, slot: i }));\n"
     "const _initialPage2 = _initialApps.slice(24).map((app, i) => ({ ...app, slot: i }));",
     "// 初始化分页：第 1 页 24 个应用，第 2 页续放，第 3 页兜底（v9.10 #121：49 应用起按页容 24 严格分页，\n"
     "// 此前 slice(24) 末页超载会使第 25 个图标 slot=24 越出 6×4 网格渲染出格）\n"
     "const _initialPage1 = _initialApps.slice(0, 24).map((app, i) => ({ ...app, slot: i }));\n"
     "const _initialPage2 = _initialApps.slice(24, 48).map((app, i) => ({ ...app, slot: i }));\n"
     "const _initialPage3 = _initialApps.slice(48).map((app, i) => ({ ...app, slot: i }));"),
    # state.js ②两处 return 改三页
    ('ios-desktop/js/state.js',
     "      return [_initialPage1, _initialPage2];",
     "      return [_initialPage1, _initialPage2, _initialPage3];"),
    ('ios-desktop/js/state.js',
     "  return [_initialPage1, _initialPage2];\n"
     "}\n"
     "\n"
     "// 保存图标排列到 localStorage",
     "  return [_initialPage1, _initialPage2, _initialPage3];\n"
     "}\n"
     "\n"
     "// 保存图标排列到 localStorage"),
    # state.js ③溢出递归分页
    ('ios-desktop/js/state.js',
     "        if (missing.length) {\n"
     "          const lastPage = parsed[parsed.length - 1];\n"
     "          const overflow = missing.filter((a) => {\n"
     "            if (lastPage.length < 24) {\n"
     "              lastPage.push({ ...a, slot: lastPage.length });\n"
     "              return false;\n"
     "            }\n"
     "            return true; // 末页已满 → 落到新页\n"
     "          });\n"
     "          if (overflow.length) {\n"
     "            parsed.push(overflow.map((a, i) => ({ ...a, slot: i })));\n"
     "          }\n"
     "        }",
     "        if (missing.length) {\n"
     "          // v9.10 #121：追加溢出递归分页——此前仅开一个新页整页塞入，missing 超 24 仍单页超载；\n"
     "          // 现逐个填末页空位，满 24 即开新页续放，直至放尽（页容 24 恒成立）\n"
     "          const queue = missing.slice();\n"
     "          while (queue.length) {\n"
     "            const target = parsed[parsed.length - 1];\n"
     "            if (target.length < 24) {\n"
     "              target.push({ ...queue.shift(), slot: target.length });\n"
     "              continue;\n"
     "            }\n"
     "            parsed.push(queue.splice(0, 24).map((a, i) => ({ ...a, slot: i })));\n"
     "          }\n"
     "        }"),
    # scenario：默认两页→三页（首次启动）
    ('tests/scenario-persistence.test.js',
     "  test('首次启动（空存储）→ 默认两页布局，版本号落盘', async () => {\n"
     "    const state = await freshState();\n"
     "    expect(state.pagesApps.length).toBe(2);\n"
     "    expect(state.pagesApps[0].length).toBe(24);\n"
     "    expect(state.pagesApps[1].length).toBe(initialApps.length - 24);",
     "  test('首次启动（空存储）→ 默认三页布局，版本号落盘', async () => {\n"
     "    const state = await freshState();\n"
     "    expect(state.pagesApps.length).toBe(3); // v9.10：49 应用 → 24+24+1 三页（页容 24 严格分页）\n"
     "    expect(state.pagesApps[0].length).toBe(24);\n"
     "    expect(state.pagesApps[1].length).toBe(24);\n"
     "    expect(state.pagesApps[2].length).toBe(initialApps.length - 48);"),
    # scenario：存档损坏降级三页
    ('tests/scenario-persistence.test.js',
     "    localStorage.setItem(K_PAGES, '{oops-not-json');\n"
     "    const state = await freshState();\n"
     "    expect(state.pagesApps.length).toBe(2);",
     "    localStorage.setItem(K_PAGES, '{oops-not-json');\n"
     "    const state = await freshState();\n"
     "    expect(state.pagesApps.length).toBe(3); // v9.10：默认布局三页"),
    # v859：恢复取末两位（默认第 2 页回归 24 满页，lyricmaker 独立第 3 页）
    ('tests/v859-widget-board.test.js',
     "    // 默认布局第 1 页 24 格全满，第 2 页 49-24=25 图标（v9.10 起末位越界无效格）→ 无有效空隙；\n"
     "    // 49 纪元适配：取走末三位图标（lyricmaker/typing/drawcircle）还原 22 图标空隙局面（slot 22..24 空），2×1 首个可放 slot 22\n"
     "    W.__state.pagesApps[1].pop();\n"
     "    W.__state.pagesApps[1].pop();\n"
     "    W.__state.pagesApps[1].pop();",
     "    // 默认布局第 1 页 24 格全满，第 2 页 24 图标（满页）→ 无空隙；第 3 页 1 图标（v9.10 #121 lyricmaker）\n"
     "    // 49 纪元适配：取走末两位图标（typing/drawcircle）还原 22 图标双空隙局面，2×1 首个可放 slot 22\n"
     "    W.__state.pagesApps[1].pop();\n"
     "    W.__state.pagesApps[1].pop();"),
]

fails = 0
for rel, old, new in EDITS:
    p = os.path.join(ROOT, rel)
    with open(p, encoding='utf-8') as f:
        src = f.read()
    n = src.count(old)
    if n == 0:
        print('MISS  %s :: %s' % (rel, old[:64].replace('\n', '\\n')))
        fails += 1
        continue
    src = src.replace(old, new)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(src)
    print('OK(%d) %s :: %s' % (n, rel, old[:52].replace('\n', '\\n')))

if fails:
    print('\n%d 处失配，中止' % fails)
    sys.exit(1)
print('\n第三批修复完成')
