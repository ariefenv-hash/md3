/**
 * v8.21 · #42 预测性返回 pill 重做 —— A17 BackPanel.kt / BackPanelController.kt /
 * EdgePanelParams.kt / res dimen 实值权威锚定（aosp-mirror main gestural/ 实拉取证）
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(repoRoot, p), 'utf8');

describe('v8.21 · #42 A17 pill：六态定量（EdgePanelParams + dimens.xml 权威值；v8.97 重锚对齐 v8.94 #140/#142/#143/#148 源码重写）', () => {
  const js = src('ios-desktop/js/back-pill.js');

  test('① 六态 dims：entry 0×48 ec6 fc6 m4 / pre 51×46 ec16 fc20 / active 48×48 ec24 fc24 m14 / stretch 60×48 m18（v8.97 补 #142 cancelled/committed 两态）', () => {
    expect(js).toContain("entry: { w: 0, h: 48, ec: 6, fc: 6, m: 4, s: 0.98, al: 8.6, ah: 5, aa: 0, ba: 1 }");
    expect(js).toContain("pre: { w: 51, h: 46, ec: 16, fc: 20, m: 4, s: 0.98, al: 8, ah: 5.6, aa: 1, ba: 1 }");
    expect(js).toContain("active: { w: 48, h: 48, ec: 24, fc: 24, m: 14, s: 1, al: 6.4, ah: 7.2, aa: 1, ba: 1 }");
    expect(js).toContain("stretch: { w: 60, h: 48, ec: 24, fc: 24, m: 18, s: 1, al: 5.6, ah: 8, aa: 1, ba: 1 }");
    // v8.94 #142 补齐的两态（v8.97 重锚：cancelled 箭头拉长压扁 12×0 / committed scale .86 α0）
    expect(js).toContain("cancelled: { w: 0, h: 48, ec: 6, fc: 6, m: 4, s: 0.98, al: 12, ah: 0, aa: 0, ba: 0 }");
    expect(js).toContain("committed: { w: 48, h: 48, ec: 24, fc: 24, m: 14, s: 0.86, al: 6.4, ah: 7.2, aa: 0, ba: 0 }");
  });

  test('② 插值器 = PathInterpolator 源码控制点（entryWidth .19,1.27,.71,.86 / activeWidth .7,−.24,.48,1.21 / farCorner .03,.19,.14,1.09 等）', () => {
    expect(js).toContain("entryWidth: [0.19, 1.27, 0.71, 0.86]");
    // v8.94 #148 补齐 + 复用声明（v8.97 重锚）
    expect(js).toContain("entryWidthTowardsEdge: [1.0, -3.0, 1.0, 1.2]");
    expect(js).toContain("arrowAngle: [0.19, 1.27, 0.71, 0.86]");
    expect(js).toContain("activeWidth: [0.7, -0.24, 0.48, 1.21]");
    expect(js).toContain("horizontal: [0.2, 1.0, 1.0, 1.0]");
    expect(js).toContain("farCorner: [0.03, 0.19, 0.14, 1.09]");
    expect(js).toContain("edgeCorner: [0.0, 1.11, 0.85, 0.84]");
    expect(js).toContain("height: [1.0, 0.05, 0.9, -0.29]");
    expect(js).toContain("vertical: [0.5, 1.15, 0.41, 0.94]");
  });

  test('③ 弹簧 = createSpring(stiffness, dampingRatio) 源码值（width 450/.65 / vertical 30000/1 / scaleCommit 5700/1）', () => {
    expect(js).toContain('width: [450, 0.65]');
    expect(js).toContain('height: [1500, 0.45]');
    expect(js).toContain('edgeCorner: [150, 0.5]');
    expect(js).toContain('farCorner: [300, 0.5]');
    expect(js).toContain('margin: [800, 0.76]');
    expect(js).toContain('vertical: [30000, 1]');
    expect(js).toContain('scaleCommit: [5700, 1]');
    expect(js).toContain('bgAlphaCommit: [1400, 1]');
    expect(js).toContain('bgAlphaCancel: [450, 1]');
  });

  test('④ 阈值常量：fingerOffset 64 / staticTrigger 16dp / progressThreshold 412 / rubberband 15 / panelH 268', () => {
    expect(js).toContain('const FINGER_OFFSET = 64');
    expect(js).toContain('const STATIC_THRESHOLD = 16');
    expect(js).toContain('const PROGRESS_THRESHOLD = 412');
    expect(js).toContain('const RUBBERBAND = 15');
    expect(js).toContain('const EDGE_PANEL_H = 268');
  });

  test('⑤ stretchBy 语义 = resting + amount×(final−resting)（BackPanel.kt 同构）+ #148 preThreshold 插值器三分支选取（v8.97 重锚）', () => {
    // v8.94 #148：entry→pre 段宽度走 preThresholdInterp 三分支选择器（wInterp），非固定 E.entryWidth
    expect(js).toMatch(/S\.w\.target = DIMS\.entry\.w \+ wInterp\(p\) \* \(DIMS\.pre\.w - DIMS\.entry\.w\)/);
    expect(js).toMatch(/S\.m\.target = DIMS\.active\.m \+ E\.horizontal\(p\) \* \(DIMS\.stretch\.m - DIMS\.active\.m\)/);
    expect(js).toMatch(/totalDelta > 0 \? 'entryWidth' : 'entryWidthTowardsEdge'/);
    expect(js).toMatch(/: prevPreThresholdInterp;/);
  });

  test('⑥ 进度映射：staticThresholdProgress = xT/16、fullScreenProgress = (xT−16)/(min(vw,412)−16)（handleMoveEvent 同构）', () => {
    expect(js).toMatch(/xT \/ STATIC_THRESHOLD/);
    expect(js).toMatch(/const thr = Math\.min\(window\.innerWidth, PROGRESS_THRESHOLD\);/);
    expect(js).toMatch(/\(xT - STATIC_THRESHOLD\) \/ Math\.max\(thr - STATIC_THRESHOLD, 1\)/);
  });

  test('⑦ ENTRY→ACTIVE 态切换（xT > 16）+ alphaStep threshold .165（commonArrowDimensAlphaThreshold）', () => {
    expect(js).toMatch(/state === 'ENTRY' && xT > STATIC_THRESHOLD/);
    expect(js).toMatch(/p > 0\.165 \? 1 : p \* \(1 \/ 0\.165\)/);
  });

  test('⑧ commit：scale .86 + 背景 α→0；cancel：宽→0 + α→0（v8.97 重锚：dims 改由 DIMS.committed/cancelled 单源消费）', () => {
    expect(js).toMatch(/state = 'COMMITTED';[\s\S]*?S\.s\.target = DIMS\.committed\.s;[\s\S]*?S\.ba\.target = DIMS\.committed\.ba;/);
    expect(js).toMatch(/state = 'CANCELLED';[\s\S]*?S\.w\.target = DIMS\.cancelled\.w;/);
  });

  test('⑨ 垂直橡皮筋：maxOffset=(268−48)/2=110 × 15 饱和 + vertical 插值器（setVerticalTranslation 同构）+ #140 权威钳位 max(touchY−64, 64)（v8.97 重锚退役自创 +24）', () => {
    expect(js).toMatch(/const maxOff = \(EDGE_PANEL_H - 48\) \/ 2;/);
    expect(js).toMatch(/Math\.abs\(dy\) \/ \(maxOff \* RUBBERBAND\)/);
    // v8.94 #140 权威推导：y = max(touchY−fingerOffset, minArrowY)，再 constrain [0, 屏高]
    expect(js).toMatch(/const y = Math\.max\(touchY - FINGER_OFFSET, MIN_ARROW_Y\);/);
    expect(js).toMatch(/Math\.max\(0, Math\.min\(window\.innerHeight, y\)\)/);
  });

  test('⑰ #143 圆角弹簧每态独立（active ec 2600/0.855 fc 1200/0.30）+ stretch null 沿用语义（v8.97 重锚新增）', () => {
    expect(js).toContain('active:   { ec: [2600, 0.855], fc: [1200, 0.30] }');
    expect(js).toContain('committed:{ ec: [10000, 1],  fc: [10000, 1] }');
    expect(js).toMatch(/function applyCornerSpring\(stateName\)/);
    expect(js).toMatch(/if \(!cs\) return; \/\/ null → 沿用上一态/);
    expect(js).toMatch(/applyCornerSpring\('active'\)/);
    expect(js).toMatch(/applyCornerSpring\('committed'\)/);
    expect(js).toMatch(/applyCornerSpring\('cancelled'\)/);
  });

  test('⑩ 解析弹簧积分（k(t−x)−c·v，tile-bounce v7.92 范式）+ commit/cancel 落定回 GONE + edge/far 四角分离绘制', () => {
    expect(js).toMatch(/this\.k \* \(this\.target - this\.pos\) - this\.c \* 2 \* Math\.sqrt\(this\.k\) \* this\.v/);
    expect(js).toMatch(/state === 'COMMITTED' \|\| state === 'CANCELLED'/);
    expect(js).toMatch(/`\$\{ec\}px \$\{fc\}px \$\{fc\}px \$\{ec\}px`/);
    expect(js).toMatch(/`\$\{fc\}px \$\{ec\}px \$\{ec\}px \$\{fc\}px`/);
  });
});

describe('v8.21 · #42 pill：视图/挂钩/压制', () => {
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/base.css');
  const gest = src('ios-desktop/js/gestures.js');
  const main = src('ios-desktop/js/main.js');

  test('⑪ DOM：#backPill + 箭头 svg（viewBox 8×6 preserveAspectRatio none / path M7,1 L1,3 L7,5）', () => {
    expect(html).toContain('<div id="backPill" aria-hidden="true">');
    expect(html).toMatch(/<svg id="backPillArrow" viewBox="0 0 8 6" preserveAspectRatio="none"><path d="M7,1 L1,3 L7,5"\/><\/svg>/);
  });

  test('⑫ 颜色/描边：bg secondaryContainer / 箭头 onSecondaryContainer / stroke 4dp square cap / non-scaling-stroke / z 12001（QS 之上锁屏之下）', () => {
    expect(css).toMatch(/#backPill \{[^]*?background: var\(--md-secondary-container\);/s);
    expect(css).toMatch(/stroke: var\(--md-on-secondary-container\);/);
    expect(css).toMatch(/stroke-width: 4px;\s*\/\* navigation_edge_arrow_thickness 4dp \*\//);
    expect(css).toMatch(/stroke-linecap: square;\s*\/\* BackPanel arrowPaint SQUARE cap \*\//);
    expect(css).toMatch(/vector-effect: non-scaling-stroke;/);
    expect(css).toMatch(/z-index: 12001;/);
  });

  test('⑬ 弃自创样式：pill 激活期（body.back-pill-active）压制 edge-indicator 本体与 ::after 光环', () => {
    expect(css).toMatch(/body\.back-pill-active \.edge-indicator \{\s*\n\s*opacity: 0 !important;\s*\n\s*animation: none;/);
    expect(css).toMatch(/body\.back-pill-active \.edge-indicator::after \{\s*\n\s*opacity: 0;/);
  });

  test('⑭ 手势链挂钩：begin 于方向确认（activateEdgeBackChannel）/ progress 于 EDGE 公共点（四通道前）/ commit·cancel 四通道收口 / 打断即 cancel', () => {
    expect(gest).toContain("import { backPill } from './back-pill.js';");
    expect(gest).toMatch(/activateEdgeBackChannel\(\)[\s\S]*?backPill\.begin\(state\.gestureType, state\.drag\.startY\);/);
    // progress 在 EDGE 分支顶部（ovBack/pbDrag 子分支 return 之前 = 四通道公共点）
    const edgeBlock = gest.slice(gest.indexOf('// ---------- 边缘拖拽 → 返回上级 / 关闭 ----------'), gest.indexOf('if (overlayBackDrag && ovBack) {', gest.indexOf('// ---------- 边缘拖拽')));
    expect(edgeBlock).toContain('backPill.progress(');
    expect(gest).toMatch(/if \(isCommitOv\) \{ ovBack\.commitGesture\(vRel\); backPill\.commit\(\); \}/);
    expect(gest).toMatch(/else \{ ovBack\.cancelGesture\(vRel\); backPill\.cancel\(\); \}/);
    expect(gest).toMatch(/if \(isCommitPb\) backPill\.commit\(\); else backPill\.cancel\(\);/);
    expect(gest).toMatch(/if \(isCommit\) \{\s*\n\s*backPill\.commit\(\);/);
    expect(gest).toMatch(/backPill\.cancel\(\); \/\/ v8\.21 #42：打断即弹回/);
  });

  test('⑮ main 接线：backPill.init() 于 init 序列（initTileBounce 后）', () => {
    expect(main).toContain("import { backPill } from './back-pill.js';");
    expect(main).toMatch(/initTileBounce\(\);[\s\S]*?backPill\.init\(\);/);
  });

  test('⑯ v7.49 自创语言退役防回潮：pill 态机无「边缘条缩放放大」旧式（scale 1.15 仅属旧 CSS）', () => {
    expect(gest).not.toMatch(/backPill[\s\S]{0,40}scale\(1\.15\)/);
    expect(src('ios-desktop/js/back-pill.js')).not.toContain('backdrop-filter');
  });
});
