#!/usr/bin/env python3
# surgery-v1148-physics.py — #284 批24：app-window 统一多应用物理渲染循环簇迁 js/app-window-physics.py
# （v11.48 滚版卷 · §3.4 表第三行 · 批19-23 范式同款：逐字节保真 + 唯一语义差异 =
#   startLoop 既有 export 前缀随簇走（本簇零改动）+ 宿主 import 回接/转出口 +
#   宿主反向桥接七名补 export（qs-sheets 批20 先例）+ import 面收窄（updateRadialField））
import pathlib, sys, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
AW = ROOT / 'ios-desktop/js/app-window.js'
PH = ROOT / 'ios-desktop/js/app-window-physics.js'

BANNER = '// ==================== 统一多应用物理渲染循环 ===================='
NEXT_BANNER = '// ==================== #225 P0 · 根壳开窗动画看门狗接线（与 rAF 解耦） ===================='

aw_text = AW.read_text(encoding='utf-8')
aw_lines = aw_text.split('\n')

# ---------- PART A1: 簇体抽取（字符串锚，非行号——批22 教训） ----------
starts = [i for i, l in enumerate(aw_lines) if l.strip() == BANNER]
ends = [i for i, l in enumerate(aw_lines) if l.strip() == NEXT_BANNER]
assert len(starts) == 1, f'banner 命中 {len(starts)} 次'
assert len(ends) == 1, f'watchdog banner 命中 {len(ends)} 次'
s_idx, e_idx = starts[0], ends[0]
assert e_idx > s_idx + 100, f'簇体过短: {e_idx - s_idx}'
cluster_lines = aw_lines[s_idx:e_idx]
# 剥尾部空行（宿主保留一个空行分隔）
while cluster_lines and cluster_lines[-1].strip() == '':
    cluster_lines.pop()
cluster = '\n'.join(cluster_lines) + '\n'
assert 'export function startLoop(params) {' in cluster, '簇体缺 startLoop 定义'
assert 'const gapBuf = [];' in cluster and 'const STEP = 1 / 120;' in cluster, '簇体内容异常'

# ---------- PART A2: 宿主删除簇体 ----------
new_aw_lines = aw_lines[:s_idx] + aw_lines[e_idx:]
aw_text = '\n'.join(new_aw_lines)

# ---------- PART A3: 宿主 import 回接 + 转出口（锚：批23 transitions import 行） ----------
ANCHOR = "import { syncMainEngineKind } from './app-window-transitions.js';"
assert aw_text.count(ANCHOR) == 1, 'transitions import 锚异常'
INJECT = (
    ANCHOR + "\n"
    "// #284 批24（v11.48）：统一多应用物理渲染循环簇迁 app-window-physics.js（boundary-map §3.4 表第三行；\n"
    "// 簇体 banner+startLoop 逐字节保真零语义差异——export 前缀原已在位；依赖面直连 state/animation-presets/\n"
    "// window-actor-lease-core/app-window-parallel/page-stack/app-window-transitions 单源，宿主反向桥接七名经\n"
    "// ESM 循环 import 活绑定（qs-sheets 批20 先例：顶层零绑定消费无 TDZ，引用全在 startLoop 调用期）；\n"
    "// updateRadialField 宿主消费面 100% 簇内随簇走，parallel import 面收窄）\n"
    "import { startLoop } from './app-window-physics.js';\n"
    "// 对外 API 保持既有导入路径（gestures/page-stack/visibility-heal/settings-two-pane 零改动——批19 转出口先例）\n"
    "export { startLoop };"
)
aw_text = aw_text.replace(ANCHOR, INJECT)

# ---------- PART A4: 宿主反向桥接五名补 export（render/renderSubPages 原有 export 不动） ----------
BRIDGES = [
    ('function disarmIframeLoadRelease() {', 'export function disarmIframeLoadRelease() {'),
    ('function armIframeLoadRelease() {', 'export function armIframeLoadRelease() {'),
    ('const launchWatchdog = createLaunchWatchdog({', 'export const launchWatchdog = createLaunchWatchdog({'),
    ('function finishAnim() {', 'export function finishAnim() {'),
    ('function disposeActorElements(actor) {', 'export function disposeActorElements(actor) {'),
]
for old, new in BRIDGES:
    assert aw_text.count(old) == 1, f'桥接锚异常: {old} ×{aw_text.count(old)}'
    aw_text = aw_text.replace(old, new)

# ---------- PART A5: parallel import 面收窄（updateRadialField 消费面 100% 簇内实证） ----------
OLD_IMP = '  updateRadialField, syncRadialFieldToProgress, isParallelAnimationActive,'
NEW_IMP = '  syncRadialFieldToProgress, isParallelAnimationActive, // updateRadialField 随批24 physics 簇迁出（宿主消费零残留·app-window-physics.js 直连单源）'
assert aw_text.count(OLD_IMP) == 1, 'parallel import 收窄锚异常'
aw_text = aw_text.replace(OLD_IMP, NEW_IMP)
AW.write_text(aw_text, encoding='utf-8')

# ---------- PART B: 新模块 app-window-physics.js ----------
header = '''// ==================== app-window-physics.js — 统一多应用物理渲染循环（#284 批24 单源搬迁） ====================
//
// 来源：ios-desktop/js/app-window.js（v11.47）「统一多应用物理渲染循环」段——banner + startLoop
// 全函数逐字节保真迁移（v11.48 批24 · boundary-map §3.4 表第三行兑现）。唯一落点真身：本文件。
//
// 依赖面（直连既有单源，零复制）：
//   state / animation-presets(getTransitionRunner) / window-actor-lease-core(leaseExpired)
//   / app-window-parallel(closingActors/radialField/updateRadialField/renderClosingActor/popHomeIcon)
//   / page-stack(renderPageStack) / app-window-transitions(syncMainEngineKind)
// 宿主反向桥接七名经 ESM 循环 import 活绑定（qs-sheets 批20 先例同律）：
//   render / renderSubPages（原有 export）+ finishAnim / disposeActorElements / launchWatchdog /
//   armIframeLoadRelease / disarmIframeLoadRelease（批24 补 export）——
//   顶层零绑定消费无 TDZ，引用全在 startLoop 调用期；宿主经 `export { startLoop }` 转出口，
//   gestures/page-stack/visibility-heal/settings-two-pane 对外导入路径零改动（批19 先例同律）。

import { state } from './state.js';
import { getTransitionRunner } from './animation-presets.js';
import { leaseExpired } from './window-actor-lease-core.js';
import {
  closingActors, radialField, updateRadialField, renderClosingActor, popHomeIcon,
} from './app-window-parallel.js';
import { renderPageStack } from './page-stack.js';
import { syncMainEngineKind } from './app-window-transitions.js';
// 循环 import 活绑定（qs-sheets 批20 先例）：宿主 hoisted function 声明 + const launchWatchdog
// 均在 startLoop 调用期消费，模块初始化期零触碰
import {
  render, renderSubPages, disposeActorElements, finishAnim,
  launchWatchdog, armIframeLoadRelease, disarmIframeLoadRelease,
} from './app-window.js';

'''
PH.write_text(header + cluster, encoding='utf-8')

# ---------- PART C: 测试随迁重锚（G3） ----------
def patch(path, pairs, block_pairs=None):
    p = ROOT / path
    t = p.read_text(encoding='utf-8')
    for old, new in pairs:
        assert t.count(old) == 1, f'{path} 锚异常({t.count(old)}): {old[:70]}'
        t = t.replace(old, new)
    if block_pairs:
        for marker, old, new in block_pairs:
            i = t.index(marker)
            j = t.index(old, i)
            t = t[:j] + new + t[j + len(old):]
    p.write_text(t, encoding='utf-8')

# C1 anim-gap-clamp：awSrc→phSrc 全量，再回改宿主专属断言（D2 观测面 + D3 三跳变源）
patch('tests/anim-gap-clamp.test.js', [
    ("const awSrc = readFileSync(join(root, 'ios-desktop/js/app-window.js'), 'utf8');",
     "const awSrc = readFileSync(join(root, 'ios-desktop/js/app-window.js'), 'utf8');\n"
     "// #284 批24（v11.48）：物理循环簇（dtClamp/gapBuf/STEP/MAX_SUBSTEPS/arm/settle/radialField 口径）单源迁\n"
     "// app-window-physics.js——簇体断言抽取源改读新文件；宿主面（观测桥/三跳变源）留读 app-window.js\n"
     "const phSrc = readFileSync(join(root, 'ios-desktop/js/app-window-physics.js'), 'utf8');"),
    ("describe('v11.47 · A. 双层钳制公式与常数（app-window.js frame()）'",
     "describe('v11.47 · A. 双层钳制公式与常数（app-window-physics.js frame()·批24随簇迁源）'"),
    ("expect(awSrc).toContain(\"window.__launchWatchdog = launchWatchdog;\")",
     "expect(awSrc).toContain(\"window.__launchWatchdog = launchWatchdog;\")KEEP"),
], block_pairs=None)
t = (ROOT / 'tests/anim-gap-clamp.test.js').read_text(encoding='utf-8')
t = t.replace('expect(awSrc)', 'expect(phSrc)')
t = t.replace('expect(phSrc).toContain("window.__launchWatchdog = launchWatchdog;")KEEP',
              'expect(awSrc).toContain("window.__launchWatchdog = launchWatchdog;")')
HOST_ONLY_D3 = [
    "expect(phSrc).toContain('const timedFade = isTimedEngineActive() && !state.isDragging;');",
    "expect(phSrc).toContain('state.contentCurveWarm = state.contentWarm;');",
    "expect(phSrc).toContain(\"'opacity 140ms ease-out'\");",
    "expect(phSrc).toContain('state.openStartT = performance.now()');",
    "expect(phSrc).toContain('state.closeStartT = performance.now()');",
]
for h in HOST_ONLY_D3:
    assert t.count(h) == 1, f'D3 锚异常: {h[:60]} ×{t.count(h)}'
    t = t.replace(h, h.replace('phSrc', 'awSrc'))
(ROOT / 'tests/anim-gap-clamp.test.js').write_text(t, encoding='utf-8')

# C2 anim-continuity：C 组（dtClamp/旧口径退役/radialField 口径）整组切源 physics
patch('tests/anim-continuity.test.js', [
    ("const AW = 'ios-desktop/js/app-window.js';",
     "const AW = 'ios-desktop/js/app-window.js';\n"
     "const PH = 'ios-desktop/js/app-window-physics.js'; // #284 批24（v11.48）：物理循环簇单源迁出，C 组随簇切源"),
])
t = (ROOT / 'tests/anim-continuity.test.js').read_text(encoding='utf-8')
i = t.index("describe('v11.47 · C.")
j = t.index("describe('v11.47 · D.")
seg = t[i:j].replace('const src = read(AW);',
                     'const src = read(PH); // #284 批24：dtClamp/gapBuf 簇体随物理循环迁 app-window-physics.js')
t = t[:i] + seg + t[j:]
(ROOT / 'tests/anim-continuity.test.js').write_text(t, encoding='utf-8')

# C3 issue8：frame() 心跳正则切源 physics
t = (ROOT / 'tests/issue8.test.js').read_text(encoding='utf-8')
i = t.index('it("app-window frame() 每帧刷新心跳"')
j = t.index('const aw = read("ios-desktop/js/app-window.js");', i)
t = t[:j] + 'const aw = read("ios-desktop/js/app-window-physics.js"); // #284 批24：frame() 随物理循环簇迁出' + t[j + len('const aw = read("ios-desktop/js/app-window.js");'):]
(ROOT / 'tests/issue8.test.js').write_text(t, encoding='utf-8')

# C4 fixes-batch-750：拆分契约 it 重锚（主渲染留宿主·循环迁 physics）+ 吸附 it2 切源 + G2 组
patch('tests/fixes-batch-750.test.js', [
    ("""    // 主渲染与循环留在原位
    expect(appWindow).toContain('export function render(progress, cx, cy)');
    expect(appWindow).toContain('export function startLoop(params)');
    expect(appWindow).toContain('export function renderSubPages(force = false)');""",
     """    // 主渲染与二级页渲染留宿主；物理循环 v11.48 批24 迁 app-window-physics.js（转出口路径零改动）
    expect(appWindow).toContain('export function render(progress, cx, cy)');
    expect(appWindow).toContain("import { startLoop } from './app-window-physics.js';");
    expect(appWindow).toContain('export function renderSubPages(force = false)');
    expect(read('ios-desktop/js/app-window-physics.js')).toContain('export function startLoop(params)');"""),
    ("""  it('主循环停机前弹簧终值吸附（Spring2D 双轴分支 + 终帧 renderSubPages）', () => {
    expect(src).toContain('[state.posSpring, state.scaleSpring, state.subpageSpring].forEach((s) => {');
    expect(src).toContain('s.x.x = s.x.target; s.x.v = 0;');
    expect(src).toContain('s.y.x = s.y.target; s.y.v = 0;');
    expect(src).toContain('renderSubPages(true);');
  });""",
     """  it('主循环停机前弹簧终值吸附（Spring2D 双轴分支 + 终帧 renderSubPages·批24随簇迁 physics）', () => {
    const loop = read('ios-desktop/js/app-window-physics.js');
    expect(loop).toContain('[state.posSpring, state.scaleSpring, state.subpageSpring].forEach((s) => {');
    expect(loop).toContain('s.x.x = s.x.target; s.x.v = 0;');
    expect(loop).toContain('s.y.x = s.y.target; s.y.v = 0;');
    expect(loop).toContain('renderSubPages(true);');
  });"""),
])

G2 = '''

describe('v11.48 · #284 批24 physics 簇单源桥接（G2）', () => {
  const appWindow = read('ios-desktop/js/app-window.js');
  const physics = read('ios-desktop/js/app-window-physics.js');

  it('单源真身：startLoop 定义唯一落点在 physics，宿主簇体零残留', () => {
    expect(physics).toContain('export function startLoop(params)');
    expect(physics).toContain('==================== 统一多应用物理渲染循环 ====================');
    expect(physics).toContain('const gapBuf = []; // #310：最近 8 帧帧距滚动缓冲（自适应钳制的节奏基准，随 startLoop 重入重置）');
    expect(appWindow).not.toContain('export function startLoop(params)');
    expect(appWindow).not.toContain('const gapBuf = [];');
    expect(appWindow).not.toContain('==================== 统一多应用物理渲染循环 ====================');
  });

  it('宿主 import 回接 + 转出口（gestures/page-stack/visibility-heal/settings-two-pane 导入路径零改动）', () => {
    expect(appWindow).toContain("import { startLoop } from './app-window-physics.js';");
    expect(appWindow).toContain('export { startLoop };');
  });

  it('宿主反向桥接七名 export 在位（循环 import 活绑定·qs-sheets 批20 先例同律）', () => {
    for (const n of ['export function render(progress, cx, cy)', 'export function renderSubPages(force = false)',
      'export function finishAnim()', 'export function disposeActorElements(actor)',
      'export const launchWatchdog =', 'export function armIframeLoadRelease()',
      'export function disarmIframeLoadRelease()']) {
      expect(appWindow).toContain(n);
    }
  });

  it('physics 直连单源模块 + 循环边界（parallel 不 import app-window 不变量维持）', () => {
    expect(physics).toContain("from './state.js'");
    expect(physics).toContain("} from './app-window-parallel.js';");
    expect(physics).toContain("from './app-window-transitions.js';");
    expect(physics).toContain("from './app-window.js';");
    expect(read('ios-desktop/js/app-window-parallel.js')).not.toContain("from './app-window.js'");
  });
});
'''
t = (ROOT / 'tests/fixes-batch-750.test.js').read_text(encoding='utf-8')
t = t.rstrip('\n') + '\n' + G2
(ROOT / 'tests/fixes-batch-750.test.js').write_text(t, encoding='utf-8')

# C5 launch-watchdog：arm/launchLoopGen/正常收敛 settle 三锚切源 physics（接线面留宿主）
t = (ROOT / 'tests/launch-watchdog.test.js').read_text(encoding='utf-8')
i = t.index("describe('v11.47 · #225 B. 六条要求接线静态锚（app-window.js 逐字核对）'")
j = t.index("const core = read('ios-desktop/js/aosp/launch-watchdog.js');", i)
t = t[:j] + "const core = read('ios-desktop/js/aosp/launch-watchdog.js');\n  const loop = read('ios-desktop/js/app-window-physics.js'); // #284 批24：arm/loopGen/正常收敛锚随物理循环簇迁 physics" + t[j + len("const core = read('ios-desktop/js/aosp/launch-watchdog.js');"):]
for old, new in [
    ("    expect(src).toContain('launchWatchdog.arm()');\n    expect(src).toContain('if (state.launchLoopGen !== loopGen) return;');",
     "    expect(loop).toContain('launchWatchdog.arm()');\n    expect(loop).toContain('if (state.launchLoopGen !== loopGen) return;');"),
    ("    expect(src).toContain('launchWatchdog.settle(); // #225 正常收敛');",
     "    expect(loop).toContain('launchWatchdog.settle(); // #225 正常收敛');"),
]:
    assert t.count(old) == 1, f'launch-watchdog 锚异常: {old[:60]} ×{t.count(old)}'
    t = t.replace(old, new)
(ROOT / 'tests/launch-watchdog.test.js').write_text(t, encoding='utf-8')

# C6 anim-native：⑦ 引擎分派组（六锚）切源 physics
t = (ROOT / 'tests/anim-native.test.js').read_text(encoding='utf-8')
i = t.index("const APP_WINDOW_SRC = readFileSync(join(__dirname, '../ios-desktop/js/app-window.js'), 'utf8');")
t = t[:i] + "const APP_WINDOW_SRC = readFileSync(join(__dirname, '../ios-desktop/js/app-window.js'), 'utf8');\nconst PHYSICS_SRC = readFileSync(join(__dirname, '../ios-desktop/js/app-window-physics.js'), 'utf8'); // #284 批24：startLoop 引擎分派簇迁 physics" + t[i + len("const APP_WINDOW_SRC = readFileSync(join(__dirname, '../ios-desktop/js/app-window.js'), 'utf8');"):]
i = t.index("test('startLoop 经 getTransitionRunner 分派引擎（含定时轴 desc 与弹簧 params 双分支）'")
j = t.index("});", i)
seg = t[i:j].replace('APP_WINDOW_SRC', 'PHYSICS_SRC')
t = t[:i] + seg + t[j:]
(ROOT / 'tests/anim-native.test.js').write_text(t, encoding='utf-8')

# C7 recents-qs-noti：v7.65 接管回落注释锚切源 physics
t = (ROOT / 'tests/recents-qs-noti.test.js').read_text(encoding='utf-8')
old = "    expect(aw).toContain('// v7.65：飞行被渲染循环接管（开窗承接/关闭归巢）→ 同步回落飞行期抬高的舞台 z');"
assert t.count(old) == 1, f'recents 锚异常 ×{t.count(old)}'
t = t.replace(old, "    expect(src('ios-desktop/js/app-window-physics.js')).toContain('// v7.65：飞行被渲染循环接管（开窗承接/关闭归巢）→ 同步回落飞行期抬高的舞台 z'); // #284 批24：接管分支随簇迁 physics")
(ROOT / 'tests/recents-qs-noti.test.js').write_text(t, encoding='utf-8')

# ---------- PART D: 自验 ----------
ph_text = PH.read_text(encoding='utf-8')
aw_text = AW.read_text(encoding='utf-8')
checks = [
    ('physics 含簇体', '统一多应用物理渲染循环' in ph_text and 'export function startLoop(params) {' in ph_text),
    ('physics 七名桥接 import', "render, renderSubPages, disposeActorElements, finishAnim," in ph_text),
    ('宿主零簇残留', '==================== 统一多应用物理渲染循环 ====================' not in aw_text and 'const gapBuf = [];' not in aw_text),
    ('宿主转出口', 'export { startLoop };' in aw_text),
    ('宿主五名补 export', all(n in aw_text for n in ['export function finishAnim()', 'export function disposeActorElements(actor)', 'export const launchWatchdog = createLaunchWatchdog({', 'export function armIframeLoadRelease()', 'export function disarmIframeLoadRelease()'])),
    ('宿主 parallel 收窄', 'updateRadialField, syncRadialFieldToProgress' not in aw_text),
    ('watchdog 段原位', NEXT_BANNER in aw_text and 'function releaseLaunchScreen(reason)' in aw_text),
]
for name, ok in checks:
    print(('PASS' if ok else 'FAIL'), name)
    if not ok:
        sys.exit(1)
print('OK surgery-v1148-physics')
