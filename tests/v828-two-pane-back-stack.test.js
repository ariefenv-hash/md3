// ==================== v8.28 #53：two-pane 返回层级规则 + 左右滑动切换（源码实证落地） ====================
//
// 议题 #53 三项验收的考证链（全部 main/lineage-24.0 实拉，非记忆）：
//
// ① A17 大屏 two-pane = ActivityEmbedding 双 Activity 嵌入（非旧 TwoPaneSettingsFragment，
//    aosp-mirror main 两仓库树均无该类——A17 重构实证）：
//    SettingsHomepageActivity.mIsTwoPane = ActivityEmbeddingUtils.isAlreadyEmbedded(this)，
//    ActivityEmbeddingRulesController.registerTwoPanePairRule → androidx SplitPairRule
//    （setMinWidthDp / setMinSmallestWidthDp / setFinishPrimaryWithSecondary）。
//
// ② 返回按钮层级规则（用户引导「二级无返回、三级+保留」源码闭环）：
//    SettingsActivity.setActionBarStatus → isActionBarButtonEnabled(intent) →
//    SettingsLib com.android.settingslib.activityembedding.ActivityEmbeddingUtils
//    .shouldHideNavigateUpButton(activity, isSecondLayerPage)：
//      - SDK < TIRAMISU → false（显示）
//      - !isSecondLayerPage（三级+）→ false（显示）
//      - 二层页 && isActivityEmbedded → true（隐藏）
//    SubSettings.onNavigateUp() = finish() —— up 点击 = 右窗格弹出一级。
//
// ③ two-pane 触发阈值（res/values/integers.xml 权威值）：
//    config_activity_embed_split_min_sw_dp = 600 / config_activity_embed_split_min_cur_dp = 720
//    （SplitPairRule minWidthDp OR minSmallestWidthDp 满足其一即嵌入）。
//    旧值 620 单阈值与两权威值均不符 → v8.28 修正为 w>=720 || min(w,h)>=600。
//
// ④ 左右滑动切换手势基准（LineageOS lineage-24.0 Launcher3 PagedView.java 实拉）：
//    - mPageSlop = ViewConfiguration.getScaledPagingTouchSlop()
//      （frameworks/base ViewConfiguration.java：PAGING_TOUCH_SLOP = TOUCH_SLOP * 2 = 16dp）
//    - shouldFlingForVelocity：mFlingThresholdVelocity = R.dimen.fling_threshold_velocity
//      = 500dp/s（easy_fling 400dp/s 为 quickswitch 专用，不引入）
//    - isSignificantMove：|Δ| > 页宽 × SIGNIFICANT_MOVE_THRESHOLD = 0.4f
//    - RETURN_TO_ORIGINAL_PAGE_THRESHOLD = 0.33f（朝返回方向拖拽中反向 fling → 回原页）
//    - min_page_snap_velocity = 1500dp/s、sin 调制 snap 时长 = Scroller 域参数；
//      md3 收敛统一走既有 popSubPage 弹簧通道（v7.41 手势物理），判定参数用 PagedView 实证值。
//
// Web 落地：evalWide 栈语义重做（三级保宽托管）、syncWithStack 页栈⇆托管同步桥、
// 右栏全域横滑返回手势（借入 prev 页补齐下层视觉）、AOSP 权威阈值。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.28 #53① 阈值权威化：AOSP 600/720 OR 规则', () => {
  const tp = src('ios-desktop/js/apps/settings-two-pane.js');

  it('双常量权威值落源（min_cur 720 / min_sw 600）', () => {
    expect(tp).toContain('const TP_MIN_CUR_DP = 720;');
    expect(tp).toContain('const TP_MIN_SW_DP = 600;');
    expect(tp).toContain('config_activity_embed_split_min_sw_dp  = 600');
    expect(tp).toContain('config_activity_embed_split_min_cur_dp = 720');
  });

  it('OR 判定式：w≥720 或 min(w,h)≥600（androidx SplitPairRule minWidthDp OR minSmallestWidthDp）', () => {
    expect(tp).toMatch(/function isWideEnough\(w, h\) \{\s*\n\s*return w >= TP_MIN_CUR_DP \|\| Math\.min\(w, h\) >= TP_MIN_SW_DP;\s*\n\}/);
  });

  it('evalWide 全域改用 isWideEnough（620 单阈值 clientWidth 比对退役）', () => {
    expect(tp).toMatch(/const wide = isWideEnough\(box\.clientWidth, box\.clientHeight\);/);
    expect(tp).not.toMatch(/clientWidth >= WIDE_THRESHOLD/);
    // 旧 620 字面值不再作为阈值出现（注记/字面免疫：精确赋值形态）
    expect(tp).not.toMatch(/const WIDE_THRESHOLD = 620;/);
  });

  it('兼容锚点名 WIDE_THRESHOLD 语义升级为 cur_dp 权威值', () => {
    expect(tp).toContain('const WIDE_THRESHOLD = TP_MIN_CUR_DP;');
  });
});

describe('v8.28 #53② 三级保宽托管：evalWide 栈语义重做（A17 嵌入对齐）', () => {
  const tp = src('ios-desktop/js/apps/settings-two-pane.js');

  it('栈深>1 且宽容器 → 保持双栏 + syncWithStack 托管栈顶（推栈即退窄退役）', () => {
    expect(tp).toMatch(/inSettings && depth > 1 && wide/);
    expect(tp).toMatch(/depth > 1 && wide[\s\S]{0,400}?syncWithStack\(st\);/);
    // A17 嵌入语义注记（考证链留痕）
    expect(tp).toContain('三级+ 保持双栏');
    expect(tp).toContain('ActivityEmbedding');
  });

  it('物理窄容器 + 栈深>1 → 退窄路径保留（页栈渲染既有通道）', () => {
    expect(tp).toMatch(/depth > 1 && !wide/);
    expect(tp).toMatch(/depth > 1 && !wide[\s\S]{0,400}?returnHosted\(st\);/);
  });

  it('syncWithStack 双分支：栈深>1 托管栈顶 / 栈根重托管左栏高亮页（均走 sync 标记路径）', () => {
    const i = tp.indexOf('function syncWithStack(st) {');
    const j = tp.indexOf('function syncAllSessions()');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    const seg = tp.slice(i, j);
    expect(seg).toContain('state.navHistory.length');
    expect(seg).toMatch(/const topIdx = state\.navHistory\[depth - 1\];/);
    expect(seg).toMatch(/open\(st, topIdx, \{ sync: true \}\)/);
    // 栈根目标 = 左栏高亮行真源（sync 路径不写 selected 防污染）
    expect(seg).toMatch(/\.tp-row\.tp-sel\[data-tp\]/);
    expect(seg).toMatch(/open\(st, wantIdx, \{ sync: true \}\)/);
  });

  it('同步桥注册：window.__settingsTwoPaneSync = syncAllSessions', () => {
    expect(tp).toContain('window.__settingsTwoPaneSync = syncAllSessions;');
  });

  it('page-stack renderPageStack 末尾挂 sync 桥（push/pop 收敛/激活统一入口）', () => {
    const ps = src('ios-desktop/js/page-stack.js');
    const anchor = ps.indexOf("document.dispatchEvent(new CustomEvent('app-page-active'");
    expect(anchor).toBeGreaterThan(0);
    const tail = ps.slice(anchor, anchor + 1400);
    expect(tail).toContain('__settingsTwoPaneSync');
    // sync 挂点在 setLiveApps（函数收尾）之前 = renderPageStack 同步段内
    expect(tail.indexOf('__settingsTwoPaneSync')).toBeLessThan(tail.indexOf('setLiveApps'));
  });

  it('open 幂等早退 + opts.sync 不写 selected + borrowed 晋升/归还双路径', () => {
    const i = tp.indexOf('function open(st, pageIdx, opts) {');
    expect(i).toBeGreaterThan(0);
    const seg = tp.slice(i, i + 1600);
    expect(seg).toMatch(/if \(st\.hosted && st\.hosted\.idx === pageIdx\) return;/);
    expect(seg).toMatch(/if \(!fromSync\) st\.selected = pageIdx;/);
    expect(seg).toMatch(/st\.borrowed\.idx === pageIdx/);
    expect(seg).toMatch(/returnBorrowed\(st\);/);
    // moved 主路径锚 .page-stack 容器（v8.28 勘正：单例主窗口无 wrapper 层）
    expect(seg).toMatch(/pageEl\.closest\('\.page-stack'\)/);
  });

  it('returnHosted 归还时顺带清借入页（防下层驻留泄漏）', () => {
    const i = tp.indexOf('function returnHosted(st) {');
    const seg = tp.slice(i, i + 900);
    expect(seg).toMatch(/st\.hosted = null;\s*\n\s*returnBorrowed\(st\);/);
  });
});

describe('v8.28 #53③ 返回按钮层级规则（AOSP shouldHideNavigateUpButton 映射自洽）', () => {
  it('backBtn 显隐判定保留栈深>1 形态（三级+显示 / 根隐藏 = 嵌入模式二层隐藏映射）', () => {
    const ps = src('ios-desktop/js/page-stack.js');
    expect(ps).toMatch(/if \(state\.navHistory\.length > 1 && state\.currentApp\.pages\[activeNavIdx\]\) \{\s*\n\s*dom\.backBtn\.style\.display = 'flex';/);
    expect(ps).toMatch(/const depth = state\.navHistory\.length - popOffset;\s*\n\s*if \(depth > 1 && state\.currentApp\) \{/);
  });

  it('考证注记：shouldHideNavigateUpButton 三分支规则落 two-pane 头注', () => {
    const tp = src('ios-desktop/js/apps/settings-two-pane.js');
    expect(tp).toContain('shouldHideNavigateUpButton(activity, isSecondLayerPage)');
    expect(tp).toContain('SubSettings.onNavigateUp() = finish()');
  });
});

describe('v8.28 #53④ 右栏横滑返回手势（Launcher3 PagedView 判定基准）', () => {
  const tp = src('ios-desktop/js/apps/settings-two-pane.js');

  it('判定参数全部源码实证值（16dp slop / 500 fling / 0.4 significant / 0.33 return-orig）', () => {
    expect(tp).toContain('const TP_PAGED_SLOP = 16;');
    expect(tp).toContain('const TP_FLING_THRESHOLD = 500;');
    expect(tp).toContain('const TP_SIGNIFICANT_RATIO = 0.4;');
    expect(tp).toContain('const TP_RETURN_ORIG_RATIO = 0.33;');
    expect(tp).toContain('PAGING_TOUCH_SLOP = 16dp');
    expect(tp).toContain('TOUCH_SLOP 8dp×2');
    expect(tp).toContain('fling_threshold_velocity');
    expect(tp).toContain('SIGNIFICANT_MOVE_THRESHOLD = 0.4f');
    expect(tp).toContain('RETURN_TO_ORIGINAL_PAGE_THRESHOLD = 0.33f');
  });

  it('作用域守卫：仅宽栏托管 + 栈深>1 + 非弹栈/全局手势期接管', () => {
    const i = tp.indexOf("rootEl.addEventListener('pointerdown'");
    const seg = tp.slice(i, i + 1200);
    expect(seg).toMatch(/if \(!st\.wide \|\| !st\.hosted\) return;/);
    expect(seg).toMatch(/if \(state\.navHistory\.length <= 1\) return;/);
    expect(seg).toMatch(/if \(state\.popInProgress \|\| state\.isDragging\) return;/);
  });

  it('交互元素与横滑组件排除（slider/搜索框/canvas/iframe 让位）', () => {
    const i = tp.indexOf("rootEl.addEventListener('pointerdown'");
    const seg = tp.slice(i, i + 1400);
    expect(seg).toContain("t.closest('input,textarea,select,button,a,[role=\"slider\"],.md3-slider,.slider-seek,.tp-search,canvas,iframe')");
  });

  it('横向主导确认（slop 16 + |dx|>|dy|）后才接管渲染', () => {
    const i = tp.indexOf("rootEl.addEventListener('pointermove'");
    const seg = tp.slice(i, i + 1100);
    expect(seg).toMatch(/Math\.abs\(dx\) < TP_PAGED_SLOP \|\| Math\.abs\(dx\) <= Math\.abs\(dy\)/);
    expect(seg).toContain('g.confirmed = true;');
  });

  it('1:1 跟手：spring.x = clamp(1 - dx/右栏宽)，复用 renderSubPages 弹簧渲染通道', () => {
    const i = tp.indexOf("rootEl.addEventListener('pointermove'");
    const seg = tp.slice(i, i + 1400);
    expect(seg).toMatch(/1 - dx \/ w/);
    expect(seg).toMatch(/state\.subpageSpring\.x = Math\.max\(0, Math\.min\(1,/);
    expect(seg).toContain('startLoop();');
  });

  it('释放判定：fling 优先 / 显著位移提交 / 反向 fling 强制回弹（RETURN_TO_ORIGINAL 语义）', () => {
    const i = tp.indexOf('const finish = (e, cancelled) => {');
    const seg = tp.slice(i, i + 1800);
    expect(seg).toMatch(/const flingBack = vx >= TP_FLING_THRESHOLD;/);
    expect(seg).toMatch(/const flingForward = vx <= -TP_FLING_THRESHOLD;/);
    expect(seg).toMatch(/const significant = dx > w \* TP_SIGNIFICANT_RATIO;/);
    expect(seg).toMatch(/const commit = !cancelled && !flingForward && \(flingBack \|\| significant\);/);
  });

  it('提交收敛走既有 popSubPage 弹簧通道（速度换算 springV = -vx/W 钳 ±4，与窄栏边缘手势同式）', () => {
    const i = tp.indexOf('const finish = (e, cancelled) => {');
    const seg = tp.slice(i, i + 2000);
    expect(seg).toMatch(/popSubPage\(springV, \{ fromGesture: true \}\);/);
    expect(seg).toMatch(/Math\.max\(-4, Math\.min\(4, -vx \/ w\)\)/);
    expect(seg).toMatch(/state\.subpageSpring\.setTarget\(1, springV\);/);
  });

  it('borrowPrevPage 借入视觉下层页（栈语义双分支 + 容器页自包含守卫 + tpHosted 豁免标记）', () => {
    const i = tp.indexOf('function borrowPrevPage(st) {');
    const seg = tp.slice(i, i + 1400);
    // 栈语义：二级页不压栈——depth>2 取栈前页；depth==2 取左栏高亮行对应页
    expect(seg).toMatch(/if \(depth > 2\)[\s\S]{0,80}?state\.navHistory\[depth - 2\]/);
    expect(seg).toMatch(/\.tp-row\.tp-sel\[data-tp\]/);
    // 容器页守卫（页 0 包含右栏，借入即自包含 DOM 异常）
    expect(seg).toMatch(/prevEl\.contains\(right\)/);
    // tpHosted 豁免标记防 renderPageStack 写 park 位姿
    expect(seg).toMatch(/prevEl\.dataset\.tpHosted = '1';/);
    expect(seg).toMatch(/right\.insertBefore\(prevEl, st\.hosted\.el\);/);
  });

  it('pointercancel 立即回弹 + 接管后吞合成 click（防误触发行导航）', () => {
    expect(tp).toMatch(/rootEl\.addEventListener\('pointercancel', \(e\) => finish\(e, true\), \{ passive: true \}\);/);
    const i = tp.indexOf('function swallowClickOnce(rootEl) {');
    const seg = tp.slice(i, i + 700);
    expect(seg).toContain('e.stopPropagation();');
    expect(seg).toContain("rootEl.addEventListener('click', h, true);");
  });

  it('手势挂载接线：mount 内 installSwipeBack(st) + st.borrowed 初始化', () => {
    expect(tp).toMatch(/sessions\.set\(sid, st\);\s*\n\s*installSwipeBack\(st\);/);
    expect(tp).toMatch(/borrowed: null, \/\/ v8\.28 #53：横滑手势借入的 prev 页/);
  });

  it('模块依赖接线：popSubPage/startLoop 导入', () => {
    expect(tp).toContain("import { reactivateScripts, popSubPage } from '../page-stack.js';");
    expect(tp).toContain("import { startLoop } from '../app-window.js';");
  });
});

describe('v8.28 #53⑥ 双栏容器页豁免（真实指针 hit-testing 修复）', () => {
  const tp = src('ios-desktop/js/apps/settings-two-pane.js');

  it('markContainerExempt：wide 态页 0 打 tpHosted 豁免 + 清 park 残留位姿（pe:none 点击吞没修复）', () => {
    const i = tp.indexOf('function markContainerExempt(st) {');
    const seg = tp.slice(i, i + 900);
    expect(seg).toMatch(/st\.pageEl\.dataset\.tpHosted = '1';/);
    expect(seg).toMatch(/resetStackInlineStyles\(st\.pageEl\);/);
    expect(tp).toContain('pointer-events:none');
  });

  it('unmarkContainerExempt：退窄解除豁免并交还栈渲染 park 位姿', () => {
    const i = tp.indexOf('function unmarkContainerExempt(st) {');
    const seg = tp.slice(i, i + 500);
    expect(seg).toMatch(/delete st\.pageEl\.dataset\.tpHosted;/);
    expect(seg).toMatch(/parkStackPage\(st\.pageEl\);/);
  });

  it('evalWide 三处接线（三级保宽 / 宽态早退 / 宽窄切换与退窄）', () => {
    const i = tp.indexOf('function evalWide(st) {');
    const j = tp.indexOf('// ---------- v8.28 #53：页栈 ⇆ 宽栏托管 同步');
    const seg = tp.slice(i, j);
    expect(seg.match(/markContainerExempt\(st\)/g).length).toBeGreaterThanOrEqual(3);
    expect(seg).toContain('unmarkContainerExempt(st)');
  });

  it('renderSubPages 视觉前页钩子（app-window 侧消费 __tpVisualPrevIdx）', () => {
    const aw = src('ios-desktop/js/app-window.js');
    expect(aw).toMatch(/let prevIdx = state\.navHistory\[state\.navHistory\.length - 2\];/);
    expect(aw).toContain('__tpVisualPrevIdx');
  });
});

describe('v8.28 #53⑤ 议题注记同步（settings.js 关于手机跳转注记重写）', () => {
  it('旧「宽栏由 evalWide isStackCtx 分支退窄-弹回恢复」注记退役', () => {
    const s = src('ios-desktop/js/apps/settings.js');
    expect(s).not.toContain('宽栏由\n    // evalWide isStackCtx 分支退窄-弹回恢复');
    expect(s).toContain('v8.28 #53 起\n    // 宽栏保持双栏（A17 ActivityEmbedding 嵌入语义）');
  });
});
