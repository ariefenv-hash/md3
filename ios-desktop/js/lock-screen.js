// ==================== lock-screen.js — iOS 风格完整锁屏界面 ====================
// 大时钟 + 日期 + 锁屏通知（复用通知中心数据）+ 手电筒/相机快捷入口
// 上滑解锁：拖拽跟手 + RK4 弹簧物理（提交/回弹共用同一弹簧，中途反转无缝）
// 壁纸层复用当前桌面壁纸（静态/自定义/程序化动态均自动适配）

import { ICONS } from './icons.js';
import { isReduceMotionActive } from './aosp/a11y-settings.js';
// v10.94 #96 二期：解锁次数埋点（aosp 纯叶子模块零依赖，静态导入零环）——喂入点
// completeUnlock/unlockAndOpen 两条真实解锁沿；instantUnlock 测试钩子零计账（注记在钩内）
import { usageStore } from './aosp/app-usage.js';
import { Spring, makeSpringParams } from './spring.js';
import { openApp } from './app-window.js';
import { getNotifications, resolveNotiIcon, isRealAppIcon } from './notifications.js';
// v9.94 #198 ZenMode：锁屏列视觉抑制（ZenPolicy.NOTIFICATION_LIST 位，勿扰详情面板可独立开关）
import { SUPPRESSED_EFFECT, isVisualSuppressed, currentSuppressedVisuals } from './aosp/zen-mode.js';
import { initialApps } from './apps-data.js';
import { emitToApp } from './app-bus.js'; // v7.25：锁屏通知深链（如动态日历摘要定位日期）
import { getProceduralSnapshotURL } from './procedural-wallpaper.js';
import { isVideoActive, getVideoFrameDataURL } from './video-wallpaper.js';
import { clamp } from './utils.js';
import { mountLockQuote, refreshLockQuoteDay } from './lock-quotes.js'; // v8.37 #26：锁屏一言
import { FontVariationUtils } from './aosp/font-variation-utils.js'; // v9.26 #186：可变字体四轴管线（FontVariationUtils.kt 逐字移植）
import { ClockSize, ClockSizeSetting, resolveDisplayedClockSize, applyDoubleLineGate, switchToClock } from './aosp/clock-size.js'; // v9.27 #186 二期：ClockSize 双档 + DYNAMIC 策略（ClockSize.kt/KeyguardClockSwitch.java 逐字同构）
import { FontInterpolator, makeFontRecord, axesToCssString } from './aosp/font-interpolator.js'; // v9.36 #145：可变字体轴插值引擎（FontInterpolator.kt 230 行逐字移植）
import { MAX_NOTIF_ICONS_ON_LOCKSCREEN } from './aosp/heads-up-timing.js'; // v9.94 #197：max_notif_icons_on_lockscreen=3
import { lockscreenGate, needsRedaction, redactedView, readLockMode, REDACTED_CARD_CLASS } from './aosp/notification-redaction.js'; // v10.94 #206：锁屏脱敏判定链（3×3 矩阵 + publicVersion 回退 + 设置三态同源直读）
import { playSfx } from './sound-haptics.js'; // v9.94 #36：解锁/上锁音（AOSP Unlock/Lock.ogg 原厂采样）
import { createUnlockRippleMachine, resolveRippleOrigin, contentRetireProgress, contentRetireTransform, A17_UNLOCK, WAVE } from './aosp/unlock-ripple.js'; // v10.94 #19：解锁波纹涟漪过渡（A17 surface-behind 编排 + A12 涟漪行为）
// v9.94 #20：锁屏表盘系统（KeyguardClockSwitch.setClock L246-261 双帧注入视图同构）+
// 时钟字体共用键（#188 app.mjs L96 预留声明启用；ClockController.kt small/largeClock 双视图）
import { LOCK_CLOCK_FACE_KEY, CLOCK_FONT_KEY, FACE_CHANGED_EVENT, CLOCK_FONT_CHANGED_EVENT, CLOCK_FACES, CLOCK_FONT_IDS, parseFacePref, resolveFace, buildFaceHTML } from './aosp/clock-faces.js';
// v10.94 #101：生成脸参数喂入（opts.customConfig——watchface-generator 纯叶子零环）
import { watchfaceGenStore } from './aosp/watchface-generator.js';
// v10.94 #210：PIN bouncer（#185 消费面——aosp 纯叶子零环静态导入，app-usage 同款）；
// verifyPassword 复用 #185 核加盐哈希校验（PBKDF2-SHA256，禁裸 MD5 纪律承袭）
import { lockPinStore, installLockPinBridge, PIN_MIN_LENGTH, FAILED_ATTEMPTS_BEFORE_TIMEOUT } from './aosp/lock-pin.js';
import { applyClickableSemantics, bindKeyboardClick } from './keyboard-activate.js'; // v10.50 #241 键盘可达接线
import { verifyPassword } from './aosp/weak-password-heuristics.js';
import { ensureClockFontLoaded, getActiveClockFontStack } from './clock-font-loader.js';

// v8.96（#85-F3）：阈值来源标注 —— COMMIT_DIST_RATIO/COMMIT_VELOCITY/FLING_MIN_DIST_RATIO
// 三者为工程调优自定值，非 AOSP 直搬常量：A17 Keyguard 原生无「滑动解锁」手势
//（解锁由密码/生物识别阶段接管，滑动仅用于 bouncer 唤出与相机快捷启动，见
// KeyguardBottomAreaView/BouncerPanel 常量族，语义不同构）。勿在保真审计中按
// 「源码常量」口径核对；若后续对齐真机手感，以真机实测调档而非虚构源值。
const COMMIT_DIST_RATIO = 0.25;   // 上滑距离超过屏高 25% 提交解锁
const COMMIT_VELOCITY = 0.55;     // 或释放速度 > 0.55 px/ms 提交解锁
const FLING_MIN_DIST_RATIO = 0.10; // 快速轻扫的最小位移门槛

// 解锁飞出弹簧（平滑无回弹）；回弹弹簧（轻微过冲）
const UNLOCK_PARAMS = makeSpringParams(0.52, 0.94, 1);
const RETURN_PARAMS = makeSpringParams(0.42, 0.72, 1);

let lockEl = null;
let isLocked = false;
let rafId = null;
let unlockSpring = null;
let animMode = 'idle'; // 'idle' | 'drag' | 'spring'
let pendingCommit = false; // 本次拖拽已提交解锁（抑制拖拽尾随的误触 click）

// v10.94 #210：PIN bouncer 状态（已设 PIN 时上滑提交不再直接解锁——KeyguardSecurityContainer
// bouncer 阶段 Web 同构：面板升起 + 数字键盘校验；未设 PIN 零变化承诺）
let bouncerOpen = false;
let bouncerEntry = '';
let bouncerMsgTimer = 0;
let bouncerCooldownTimer = 0;

// v10.94 #19：解锁波纹涟漪状态（纯逻辑库 unlock-ripple.js 单一真源，接线零算法）
const rippleMachine = createUnlockRippleMachine();
let gestureDownPt = { x: null, y: null }; // pointerdown 触点（commit 帧作波源候选，A12 触点涟漪行为）
let retireMeta = []; // [{el, dist}] 波前退场块与静态距离（提交帧量测一次，零逐帧 rect）
let rippleLayers = null; // {fill, ring, maxR} 波纹层引用（teardown 统一回收）
let rippleBeginTs = 0; // 起波时刻（自然播完回收的剩余时长计算）
let rippleRafId = 0; // 波纹独立推进循环（不随弹簧 rAF 停而冻结——弹簧完成仅停止上飞）

/**
 * fix(audit-A): 锁屏通知文本转义 —— 通知 title/desc/app/time 为应用可控文本
 * （任意子应用可经 __system.notify 注入），与通知中心/横幅同源插入 innerHTML 前必须转义。
 */
function esc(s) {
// v10.94 #240：单源委托——转义实现收敛 apps/_shared/sanitize.js escapeHtml（本文件正则链退役，负向锚 tests/v240）
  return window.__mdEscape(s);
}

/** 生成锁屏内部使用的内联 SVG（1em 随宿主缩放） */
const LOCK_CHEVRON = `<svg viewBox="0 0 24 24" style="width:1.35em;height:1.35em;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round"><path d="M5 14.5 L12 8 L19 14.5"/></svg>`;
const LOCK_FLASHLIGHT = `<svg viewBox="0 0 24 24" style="width:1.3em;height:1.3em;fill:currentColor"><path d="M6 2h12v3l-3 4v11c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2V9L6 5V2zm2 2v.6l3 4V20h2V8.6l3-4V4H8zm3 6h2v3h-2v-3z"/></svg>`;
const LOCK_CAMERA = `<svg viewBox="0 0 24 24" style="width:1.3em;height:1.3em;fill:currentColor"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M9 3 7.2 5H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.2L15 3H9zm3 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>`;

// v9.26 #190：Roboto Flex 可变字体运行时注入（锁屏时钟唯一消费者，latin 子集
// 195KB vendor 零外链）。运行时注入而非静态 <link>：静态链接会被 Vite 吞进 bundle
// 导致字体双份存储（同 material-symbols v7.7-A 范式）；FontFaceSet 空闲预热对齐
// index.html 图标字体懒预热范式——首帧零字节竞争，字体未就绪前 fallback 衬线垫底。
let robotoFlexInjected = false;
function ensureRobotoFlexFont() {
  if (robotoFlexInjected) return;
  robotoFlexInjected = true;
  try {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'assets/fonts/roboto-flex.css';
    document.head.appendChild(l);
    if (document.fonts && document.fonts.load) {
      document.fonts.load('300 88px "RobotoFlex"', '0123456789:').catch(function () {});
    }
  } catch (e) { /* 字体注入失败绝不阻塞锁屏：fallback Noto Serif SC 照常渲染 */ }
}

// v9.26 #186 一期：锁屏时钟四轴管线消费 —— AOSP TextAnimator 同款
// 「fontVariationSettings 字符串 → 渲染层」链路（FontVariationUtils.kt L22-52 逐字
// 移植见 js/aosp/font-variation-utils.js）。轴值：wght 300 对齐 .lock-clock 原
// font-weight:300 细体（可变轴接管后 font-weight 仅对 fallback 生效）；wdth 100 默认；
// opsz 96 大字号光学尺寸（轴域 8~144，时钟 clamp 上限 88px，高值=大字锐利形态）；
// ROND 无开源字体（#190 第五节方案 A）不传。isUpdated 零变化返回空串→不重写 style。
// 动态轴动画与 ClockSize 双档 DYNAMIC 属 #186 二期。
// v9.27 #186 二期：每视图独立实例（WeakMap 按 DOM 元素缓存）—— AOSP TextAnimator
// 同构正解：isUpdated 状态属视图，单实例消费双容器会因「同值重入零变化」令第二容器
// 永远拿不到注入（R50 实测复现：小钟拿到 wght 300，大钟空串跳过）。实例级行为不变：
// 首调注入、重入零变化返回空串不重写 style（防抖语义保留）。
const clockVariationInstances = new WeakMap();
const LOCK_CLOCK_VARIATION = { weight: 300, width: 100, opticalSize: 96 };
function applyClockVariation() {
  if (!lockEl) return;
  // v9.27 #186 二期：四轴管线同值双容器消费（小/大钟同链路；AOSP 按钟面配置各带
  // variation，md3 单管线同值映射，逐钟面差异化轴值属 ClockController 配置域）
  const timeEls = lockEl.querySelectorAll('.lock-clock, .lock-clock-large');
  timeEls.forEach((timeEl) => {
    let inst = clockVariationInstances.get(timeEl);
    if (!inst) {
      inst = new FontVariationUtils();
      clockVariationInstances.set(timeEl, inst);
    }
    const s = inst.updateFontVariation(LOCK_CLOCK_VARIATION);
    if (s) timeEl.style.fontVariationSettings = s;
  });
}

// ==================== v9.36 #145：解锁拖拽 fold 字重插值 ====================
// AOSP 权威路径：KeyguardClockSwitchController.animateFoldToAod(foldFraction)
// （L474-478）→ clock.getSmallClock()/getLargeClock().getAnimations().fold(fold)
// ——两钟都 fold。md3 同构物：上滑解锁拖拽进度（foldP = 拖拽位移 / (屏高×0.9)，
// 与 content 透明度 op 同源同域——#145 正文「锁屏大时钟随下拉字重连续变细/变粗」
// 可见效果原文；拖拽 rAF 热路径每帧 lerp，FontInterpolator 两级缓存帧量化语义
// 正为此场景设计——kt L83-84 Perfetto 基准注释）。
// 轴值裁决（诚实标注，勿按「源码常量」口径审计）：
//   - 起点 wght 300 = v9.26 锚值（LOCK_CLOCK_VARIATION.weight，.lock-clock 原
//     font-weight:300），非发明
//   - 终点 wght 100 = Roboto Flex wght 轴域下界（#190 轴清单在案：wght 100~1000），
//     AOD 低功耗细体形态同向映射；foldFraction→1 即飞出/接近 AOD。AOSP fold 字重
//     端值在表盘配置域（DefaultClockController 未 vendor 快照），终点值为 md3 映射
//     裁决——同 v8.96 三阈值「工程调优自定值」口径
//   - wdth/opsz 两轴全程恒定（100/96）：fold 语义只动 wght（#145 正文可见效果
//     「字重连续变细/变粗」），且两轴基线值有 v9.26 锚（LOCK_CLOCK_VARIATION）
const FOLD_START_AXES = makeFontRecord([
  { tag: 'wght', styleValue: 300 },
  { tag: 'wdth', styleValue: 100 },
  { tag: 'opsz', styleValue: 96 },
]); // v9.26 LOCK_CLOCK_VARIATION 同值基线（wght/wdth/opsz 三轴，ROND 不做——#145 裁决 issuecomment-6554563607）
const FOLD_END_AXES = makeFontRecord([
  { tag: 'wght', styleValue: 100 },
  { tag: 'wdth', styleValue: 100 },
  { tag: 'opsz', styleValue: 96 },
]);
const clockFontInterpolator = new FontInterpolator(); // FontInterpolator.kt L90（默认 FontCacheImpl 两级 LRU：interp 10 条 + varFont 10 条）
let foldApplied = false; // fold 运行时覆盖态标志：p→0 时恢复注入基线（显式写回非清空——大钟 CSS 无静态 font-variation-settings，清空会回落 Roboto Flex 默认 wght 400 变粗 bug）

/** fold 字重跟手插值：foldP ∈ [0,1] → FontInterpolator.lerp 连续插值 → 两钟
 *  font-variation-settings。p<=0 且无覆盖态时零开销短路（空闲拖拽不写样式） */
function applyClockFold(foldFraction) {
  if (!lockEl) return;
  const p = Math.min(1, Math.max(0, foldFraction));
  if (p <= 0) {
    if (foldApplied) {
      foldApplied = false;
      const base = axesToCssString(FOLD_START_AXES.axes); // 恢复注入基线（'wght' 300, 'wdth' 100, 'opsz' 96）
      lockEl.querySelectorAll('.lock-clock, .lock-clock-large').forEach((el) => {
        el.style.fontVariationSettings = base;
      });
    }
    return;
  }
  foldApplied = true;
  const rec = clockFontInterpolator.lerp(FOLD_START_AXES, FOLD_END_AXES, p); // FontInterpolator.kt L92 逐字：帧量化缓存 + wght 连续插值
  const css = axesToCssString(rec.axes);
  // 两钟都 fold（animateFoldToAod L477-478 两钟都调；隐藏容器写入无害）
  lockEl.querySelectorAll('.lock-clock, .lock-clock-large').forEach((el) => {
    el.style.fontVariationSettings = css;
  });
}

// ==================== v9.27 #186 二期：ClockSize 双档显隐切换 ====================
// KeyguardClockSwitch.java 双框语义映射：mSmallClockFrame/mLargeClockFrame 两容器
// 常驻 DOM（显隐切换非重建，L242-264 setClock removeAllViews≠本处不涉及）；
// small 隐藏用 visibility:hidden（INVISIBLE，保布局锚点 —— updateClockViews L380
// mSmallClockFrame.setTranslationY(statusAreaYTranslation) 的布局锚语义）；
// large 隐藏用 display:none（GONE，removeView(out) L365 同位）。默认 SMALL 对齐
// KeyguardClockSwitchController.java L93 mCurrentClockSize = SMALL 初值。
let displayedClockSize = null; // mDisplayedClockSize（L128，null=未初始化）
const CAN_SHOW_DOUBLE_LINE_CLOCK = true; // md3 语境映射标注：无 LOCKSCREEN_USE_DOUBLE_LINE_CLOCK 设置面（AOSP config_doublelineClockDefault 默认 1 同初值），门控消费位保留（clock-size.js applyDoubleLineGate），设置面落地后改读设置
let clockSizeSetting = ClockSizeSetting.DYNAMIC; // md3 语境映射：未暴露 LOCKSCREEN_CLOCK_SIZE 设置面，默认 DYNAMIC（fromSettingValue 兑底同向）

/**
 * DYNAMIC 通知判定接线：renderLockNotifications 现成数据源 → 重判档位。
 * displayClock（Controller L455-461）+ switchToClock（L448-461）+
 * updateClockViews 非动画路径（L368-381）三链合一：
 * 兑底 DYNAMIC 门控 → 同值短路 → 双容器 visibility 切换（非重建）。
 */
function updateLockClockSize() {
  if (!lockEl) return;
  const small = lockEl.querySelector('.lock-clock');
  const large = lockEl.querySelector('.lock-clock-large');
  if (!small || !large) return; // mChildrenAreLaidOut 门（L455）的 DOM 在场同构
  const hasNotifications = getNotifications().length > 0;
  const resolved = resolveDisplayedClockSize(clockSizeSetting, hasNotifications);
  const desired = applyDoubleLineGate(resolved, CAN_SHOW_DOUBLE_LINE_CLOCK);
  const sw = switchToClock(displayedClockSize, desired); // L449-451 同值短路 + 记忆
  if (!sw.changed) return;
  if (sw.displayed === ClockSize.LARGE) {
    // updateClockViews(useLargeClock=true) 非动画路径：out(small) INVISIBLE + in(large) VISIBLE
    small.style.visibility = 'hidden';
    large.style.display = 'block';
  } else {
    // useLargeClock=false 路径：out(large) 移除（GONE）+ in(small) VISIBLE
    small.style.visibility = '';
    large.style.display = 'none';
  }
  displayedClockSize = sw.displayed;
}

/** 格式化中文长日期 */
function formatDate(d) {
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${week[d.getDay()]}`;
}

/** 刷新锁屏时钟（10s tick 兼任一言跨午夜切换驱动，#26）；v9.27 二期：双容器同源同步 */
function refreshClock() {
  if (!lockEl) return;
  const now = new Date();
  renderLockFaces(now);
  const dateEl = lockEl.querySelector('.lock-date');
  if (dateEl) dateEl.textContent = formatDate(now);
  try { refreshLockQuoteDay(); } catch (e) { /* 一言异常绝不影响时钟 */ }
}

// ==================== v9.94 #20：表盘系统（ClockController small/largeClock 双视图同构） ====================
// KeyguardClockSwitch.setClock（L246-261）权威：表盘切换 = 双帧（.lock-clock /
// .lock-clock-large，ClockSize 门控域零触碰）帧内内容重建；帧外日期/一言/通知不动。
// double-small 走 textContent 旧路径（v9.26/v9.27 锚零漂移），其余脸 innerHTML 重建。
let currentFaceId = parseFacePref((typeof localStorage !== 'undefined') ? localStorage.getItem(LOCK_CLOCK_FACE_KEY) : null);
let lastMinuteKey = ''; // expressive 弹簧触发判据（同分钟重渲不重播——纯渲染幂等）

/** 表盘帧字体应用（加载器族链写帧 inline；system → 清 inline 保留 CSS 既有栈） */
function applyLockClockFont() {
  if (!lockEl) return;
  const stack = getActiveClockFontStack();
  lockEl.querySelectorAll('.lock-clock, .lock-clock-large').forEach((el) => {
    if (stack) el.style.fontFamily = stack;
    else el.style.removeProperty('font-family');
  });
}

/** 表盘渲染入口：双帧内容重建（KeyguardClockSwitch.setClock removeAllViews+addView 映射） */
function renderLockFaces(d) {
  if (!lockEl) return;
  const face = resolveFace(currentFaceId);
  const stack = getActiveClockFontStack();
  // expresssive 分钟跳变弹簧：仅分钟变化的首渲带 pop（10s tick 内同分钟幂等）
  const minuteKey = `${face.id}:${d.getHours()}:${d.getMinutes()}`;
  const animate = face.id === 'expressive' && minuteKey !== lastMinuteKey;
  lastMinuteKey = minuteKey;
  const small = lockEl.querySelector('.lock-clock');
  const large = lockEl.querySelector('.lock-clock-large');
  if (!small || !large) return; // mChildrenAreLaidOut 门（L455）的 DOM 在场同构
  if (face.id === 'double' && !stack) {
    // double 无自定义字体：小帧走 v9.26 既有 textContent 路径（锚零漂移），
    // 大帧 = AOSP 双行堆叠（Pixel 大钟形态，textContent 连接为 HHMM）
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    small.textContent = `${hh}:${mm}`;
    large.innerHTML = buildFaceHTML(face, { date: d, size: 'large' });
  } else {
    // v10.94 #101：custom 脸喂入生成参数（其余脸零消费零开销）
    small.innerHTML = buildFaceHTML(face, { date: d, size: 'small', fontStack: stack, animate, customConfig: watchfaceGenStore.getConfig() });
    large.innerHTML = buildFaceHTML(face, { date: d, size: 'large', fontStack: stack, animate, customConfig: watchfaceGenStore.getConfig() });
  }
}

/** 表盘切换（AOSP setClock 语义：持久化 + 事件广播 + 双帧重建；供设置侧/测试钩子调用） */
export function setLockClockFace(id, persist = true) {
  const face = resolveFace(id);
  currentFaceId = face.id;
  if (persist) {
    try { localStorage.setItem(LOCK_CLOCK_FACE_KEY, JSON.stringify({ id: face.id })); } catch (e) {}
  }
  if (lockEl) {
    renderLockFaces(new Date());
    applyLockClockFont();
  }
  try { document.dispatchEvent(new CustomEvent(FACE_CHANGED_EVENT, { detail: { id: face.id } })); } catch (e) {}
  return face.id;
}

/** 时钟字体切换（clock-font-v1 共用键写入 + 加载 + 双帧重渲刷新脸节点族链 + 广播；AOD 同事件跟随） */
export function setLockClockFont(id, persist = true) {
  const valid = CLOCK_FONT_IDS.includes(id) ? id : 'system';
  if (persist) {
    try { localStorage.setItem(CLOCK_FONT_KEY, JSON.stringify({ id: valid })); } catch (e) {}
  }
  // 双帧重渲（脸节点 inline font-family 随 buildFaceHTML fontStack 刷新——v9.94 e2e P8c
  // 实证：只刷帧级 family 会被已渲节点的 inline 值压过，视觉滞留旧字体）+ 帧级兜底
  //（double-small textContent 路径无脸节点，帧级 family 即生效面）
  if (lockEl && isLocked) {
    renderLockFaces(new Date());
    applyLockClockFont();
  }
  ensureClockFontLoaded(valid).then(() => {
    if (lockEl && isLocked) applyLockClockFont();
  });
  try { document.dispatchEvent(new CustomEvent(CLOCK_FONT_CHANGED_EVENT, { detail: { id: valid } })); } catch (e) {}
  return valid;
}

/** 表盘/字体设置事件跟随（设置侧 UI 零 import 解耦——window 钩子惯例同 v9.77） */
document.addEventListener(FACE_CHANGED_EVENT, (e) => {
  const id = e && e.detail && e.detail.id;
  if (id && id !== currentFaceId) { currentFaceId = id; lastMinuteKey = ''; renderLockFaces(new Date()); applyLockClockFont(); }
});
document.addEventListener(CLOCK_FONT_CHANGED_EVENT, () => {
  if (lockEl && isLocked) applyLockClockFont();
});
// #187 全局字体变更（font-changed 由 wallpaper.js 广播）→ 'user' 时钟字体跟随
window.addEventListener('font-changed', () => {
  if (lockEl && isLocked) {
    try { const cur = JSON.parse(localStorage.getItem(CLOCK_FONT_KEY) || '{}').id; if (cur === 'user') applyLockClockFont(); } catch (e) {}
  }
});

/** 同步锁屏壁纸层：视频壁纸当前帧 > 程序化快照 > 桌面当前背景（含自定义上传） */
function refreshWallpaperLayer() {
  if (!lockEl) return;
  const layer = lockEl.querySelector('.lock-wallpaper');
  if (!layer) return;
  try {
    if (isVideoActive()) {
      const frame = getVideoFrameDataURL();
      if (frame) {
        layer.style.backgroundImage = `url("${frame}")`;
        return;
      }
    }
    const proc = getProceduralSnapshotURL();
    if (proc) {
      layer.style.backgroundImage = `url("${proc}")`;
      return;
    }
    const desktop = document.getElementById('desktop');
    if (desktop) {
      const bg = getComputedStyle(desktop).backgroundImage;
      if (bg && bg !== 'none') {
        layer.style.backgroundImage = bg;
        return;
      }
    }
    layer.style.backgroundImage = '';
  } catch (e) {
    layer.style.backgroundImage = '';
  }
}

/** 渲染锁屏通知列表（复用通知中心数据源，最多展示 4 条）；v9.27 二期：尾部接线 DYNAMIC 档位重判（通知增删即重判，clock-size.js 决策表） */
function renderLockNotifications() {
  if (!lockEl) return;
  const box = lockEl.querySelector('.lock-notifications');
  if (!box) return;
  // v9.94 #197：锁屏图标上限对齐 AOSP max_notif_icons_on_lockscreen=3（原工程自定 4 退役）
  // v9.94 #198：视觉抑制 NOTIFICATION_LIST 位在位时锁屏列整体隐藏（勿扰详情可独立开关，
  // updateLockClockSize 随空列自然回 LARGE 表盘，与「无通知」态同链路）
  // v10.94 #206：锁屏脱敏判定链接线 —— 设置三态 readLockMode（同源直读 settings:notifications-v1，
  // apps/settings.js NOTIF_PAGE_SCRIPT 单一真源零 import 环）：disable → 整列不渲染（优先于
  // 逐条判定全部；复用 zen NOTIFICATION_LIST 空列链路零新分支）；show/hide → 逐条
  // needsRedaction 3×3 矩阵裁决。面边界（#206 §5）：脱敏只作用锁屏面——Feed/横幅数据层
  // 零脱敏分支（notifications.js 单入口照常，getNotifications 恒明文全量真源）
  const lockMode = readLockMode();
  const gate = lockscreenGate(lockMode);
  const feed = (gate.renderList && !isVisualSuppressed(currentSuppressedVisuals(), SUPPRESSED_EFFECT.NOTIFICATION_LIST))
    ? getNotifications() : [];
  const items = feed.slice(0, MAX_NOTIF_ICONS_ON_LOCKSCREEN);
  box.innerHTML = '';
  updateLockClockSize(); // #186 二期：DYNAMIC 通知判定接线（有通知→SMALL/无通知→LARGE，同值短路防抖）

  if (items.length === 0) {
    box.innerHTML = `<div class="lock-noti-empty">暂无新通知</div>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('div');
    // v10.94 #206：needsRedaction（3 visibility × 3 设置态矩阵）→ 脱敏卡渲染 ——
    // 有 publicVersion 用其概要（AOSP PublicInflationCallback：独立 Notification 体）；
    // 无则应用名 + 图标 +「内容已隐藏」AOSP fallback 形态（redactedView 零携带原 title/desc）。
    // 图标不走脱敏核（应用图标可见 = AOSP fallback 形态语义，resolveNotiIcon(item) 原样消费）
    const redact = needsRedaction(item.visibility, lockMode);
    const view = redact ? redactedView(item) : item;
    card.className = redact ? `lock-noti-card ${REDACTED_CARD_CLASS}` : 'lock-noti-card';
    if (redact) card.setAttribute('aria-label', view.fromPublicVersion ? view.title : '内容已隐藏');
    card.innerHTML = `
      <div class="lock-noti-icon ${isRealAppIcon(item) ? 'lock-noti-icon--app' : ''}">${resolveNotiIcon(item)}</div>
      <div class="lock-noti-body">
        <div class="lock-noti-top">
          <span class="lock-noti-app">${esc(view.app)}</span>
          <span class="lock-noti-time">${esc(view.time)}</span>
        </div>
        <div class="lock-noti-title">${esc(view.title)}</div>
        <div class="lock-noti-desc">${esc(view.desc)}</div>
      </div>
    `;
    // v10.50 #241 键盘可达：卡片本体 role=button + Tab 聚焦 + Enter/Space 触发；
    // 脱敏卡既有 aria-label（publicVersion 概要/「内容已隐藏」）优先保留不覆盖
    applyClickableSemantics(card, {
      role: 'button',
      label: card.getAttribute('aria-label') || `${view.app}：${view.title}`,
    });
    bindKeyboardClick(card);
    // 点击通知：解锁并以该卡片图标位置为动画源打开对应应用（放射动画从点按处起飞）。
    // v10.94 #206：fallback 脱敏卡（无 publicVersion）零目标内容语义 → 点击零操作
    //（AOSP 脱敏卡点击=唤出 bouncer，本工程锁屏无 bouncer 阶段，取最小面；publicVersion
    // 卡有真实概要内容语义 → 照常直达）
    card.addEventListener('click', () => {
      if (pendingCommit) return; // 本次手势已提交解锁，忽略拖拽尾随的 click
      if (redact && !view.fromPublicVersion) return; // #206 fallback 卡零操作
      const targetAppId = item.appId || 'msg';
      const appIdx = initialApps.findIndex(a => a.id === targetAppId);
      if (appIdx === -1) return;
      const iconBox = card.querySelector('.lock-noti-icon');
      const rect = iconBox ? iconBox.getBoundingClientRect() : null;
      // v7.25：深链通知（日历摘要等）→ 解锁前先总线投递（app-bus 补投保证
      // 目标应用就绪后收到），再走原解锁打开链路
      const dl = item.deepLink;
      if (dl && dl.appId && dl.event) {
        try { emitToApp(dl.appId, dl.event, Object.assign({}, dl.payload || {}, { __silent: true }), 'lockscreen'); } catch (e) {}
      }
      unlockAndOpen(appIdx, rect);
    });
    box.appendChild(card);
  });
}

/**
 * 创建锁屏 DOM（一次性注入 body 顶层）
 * z-index 98000：低于手电筒遮罩(99999)、高于通知横幅(10005)与其余全部界面
 */
function ensureLockDOM() {
  if (lockEl) return;

  lockEl = document.createElement('div');
  lockEl.id = 'lockScreen';
  lockEl.className = 'lock-screen';
  lockEl.innerHTML = `
    <div class="lock-wallpaper"></div>
    <div class="lock-dim"></div>
    <div class="lock-content">
      <div class="lock-top-area">
        <div class="lock-badge">${ICONS.lock}</div>
        <div class="lock-date">1月1日 星期四</div>
        <div class="lock-clock">00:00</div>
        <!-- #26 锁屏一言：诗词正文+作者出处（离线库按日轮换，在线增强可选） -->
        <div class="lock-quote" aria-hidden="true"></div>
        <!-- v9.27 #186 二期：大钟容器（mLargeClockFrame 同位常驻 DOM，默认 GONE；
             档位由 updateLockClockSize 显隐切换非重建。置于一言之后：absolute
             定位与 DOM 序无关，且保住 #26 一言 .lock-clock 紧邻锚不动 -->
        <div class="lock-clock-large" aria-hidden="true">00:00</div>
      </div>
      <div class="lock-notifications"></div>
      <div class="lock-bottom-area">
        <button class="lock-quick-btn" id="lockTorchBtn" aria-label="手电筒">${LOCK_FLASHLIGHT}</button>
        <div class="lock-unlock-hint">
          <span class="lock-hint-chevron">${LOCK_CHEVRON}</span>
          <span>向上轻扫以解锁</span>
        </div>
        <button class="lock-quick-btn" id="lockCameraBtn" aria-label="相机">${LOCK_CAMERA}</button>
      </div>
    </div>
    <!-- v10.94 #210：PIN bouncer（KeyguardPINView Web 等价——3×4 数字键盘：1-9 / ⓫ 0 / 确认；
         emergency 键留点（md3 无拨号器语义）；dots 行 AOSP PasswordTextView 圆点形态） -->
    <div class="lock-bouncer" hidden>
      <div class="lock-bouncer-hint">输入 PIN 解锁</div>
      <div class="lock-bouncer-dots" aria-hidden="true"></div>
      <div class="lock-bouncer-msg" role="alert"></div>
      <div class="lock-bouncer-pad">
        <button class="lock-bouncer-key" data-digit="1" aria-label="1">1</button>
        <button class="lock-bouncer-key" data-digit="2" aria-label="2">2</button>
        <button class="lock-bouncer-key" data-digit="3" aria-label="3">3</button>
        <button class="lock-bouncer-key" data-digit="4" aria-label="4">4</button>
        <button class="lock-bouncer-key" data-digit="5" aria-label="5">5</button>
        <button class="lock-bouncer-key" data-digit="6" aria-label="6">6</button>
        <button class="lock-bouncer-key" data-digit="7" aria-label="7">7</button>
        <button class="lock-bouncer-key" data-digit="8" aria-label="8">8</button>
        <button class="lock-bouncer-key" data-digit="9" aria-label="9">9</button>
        <button class="lock-bouncer-key lock-bouncer-del" data-action="del" aria-label="删除">⌫</button>
        <button class="lock-bouncer-key" data-digit="0" aria-label="0">0</button>
        <button class="lock-bouncer-key lock-bouncer-ok" data-action="ok" aria-label="确认">✓</button>
      </div>
    </div>
  `;

  document.body.appendChild(lockEl);

  ensureRobotoFlexFont(); // v9.26 #190：Roboto Flex 注入+预热（锁屏唯一消费者）
  applyClockVariation(); // v9.26 #186：四轴管线消费（wght/wdth/opsz → font-variation-settings）
  refreshClock();
  refreshWallpaperLayer();
  renderLockNotifications();
  // v10.94 #235：teardown 后 10s 锁屏时钟 tick 零触碰（v232 同族纪律，CI run#447 族）
  setInterval(() => {
    if (typeof document === 'undefined') return;
    refreshClock();
  }, 10000);
  // v8.37 #26：锁屏一言（离线库当日条立即显示；缓存当日复用；在线增强默认关）
  try { mountLockQuote(lockEl); } catch (e) { /* 一言异常绝不阻塞锁屏初始化 */ }

  // 手电筒：联动快捷设置磁贴（解耦调用，不导入 quick-settings 模块）
  const torchBtn = lockEl.querySelector('#lockTorchBtn');
  if (torchBtn) {
    torchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tile = document.querySelector('[data-tile-id="torch"]');
      if (tile) tile.click();
      // fix(audit-A): 镜像反转 —— tile.click() 同步应用新状态后读取磁贴当前 active 类
      // （旧实现 !contains('active') 把「点击后已开启」映成了「按钮不点亮」）。
      // 磁贴不可达时（面板未渲染过）回退：按钮态维持原值翻转。
      if (tile) torchBtn.classList.toggle('active', tile.classList.contains('active'));
      else torchBtn.classList.toggle('active');
    });
  }

  // 相机：解锁后直达相机应用
  const cameraBtn = lockEl.querySelector('#lockCameraBtn');
  if (cameraBtn) {
    cameraBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const appIdx = initialApps.findIndex(a => a.id === 'camera');
      if (appIdx === -1) return;
      const btnRect = cameraBtn.getBoundingClientRect();
      unlockAndOpen(appIdx, btnRect);
    });
  }

  initUnlockGesture();

  // v10.94 #210：PIN bouncer 接线（事件委托单监听——keypad 按键 click 冒泡统一分发；
  // stopPropagation 防止触达锁屏拖拽层误启手势） + window 桥安装（设置页零 import 消费）
  const bouncerPanel = lockEl.querySelector('.lock-bouncer');
  if (bouncerPanel) {
    bouncerPanel.addEventListener('click', (e) => {
      const key = e.target.closest('.lock-bouncer-key');
      if (!key) return;
      e.stopPropagation();
      if (key.dataset.digit !== undefined) onBouncerDigit(key.dataset.digit);
      else if (key.dataset.action === 'del') onBouncerDelete();
      else if (key.dataset.action === 'ok') onBouncerSubmit();
    });
  }
  try { installLockPinBridge(); } catch (e) { /* 无 localStorage 环境零阻塞 */ }

  // fix(audit-B): 锁屏期间通知增删实时刷新 —— 通知中心数据变更时（notifications.js
  // 在增/删/清空/远端删除后派发 notifications-changed），锁屏在场则重渲染锁屏列表
  // （旧实现仅 lockNow 时渲染一次，锁屏期间新增/清除通知不更新）。
  window.addEventListener('notifications-changed', () => {
    if (isLocked) renderLockNotifications();
  });
}

/**
 * 上滑解锁手势（Pointer Events 统一鼠标/触摸）
 * 不使用 setPointerCapture：capture 会把后续 click 重定向到锁屏层自身，
 * 导致锁屏通知卡片与快捷按钮的原生点击失效；改用 window 级 move/up 监听。
 * 拖拽期 1:1 跟手 + 轻微阻尼；释放期同一枚弹簧无缝接管（提交或回弹，反转不瞬移）
 */
function initUnlockGesture() {
  let tracking = false;
  let startY = 0;
  let startT = 0;
  let lastDy = 0;
  let lastT = 0;
  let lastV = 0; // px/ms（向上为正）
  let dragDy = 0;

  // 内容层引用缓存（结构性元素；断链时重查）：拖拽热路径不再逐事件 querySelector
  let contentCache = null;
  const getContent = () => {
    if (!contentCache || !contentCache.isConnected) contentCache = lockEl.querySelector('.lock-content');
    return contentCache;
  };

  // v7.32：拖拽热路径 rAF 帧合并 —— pointermove 事件率（可达 120Hz+）只更新
  // pending 状态，transform/opacity 每帧至多落一次（永远取最新值）；finish 先 flush，
  // 防止弹簧接管后残留帧回写旧位移
  let applyRafId = 0;
  let pendingDy = 0, pendingOp = 0;
  const writeOffset = (dy, opacityProgress) => {
    lockEl.style.transform = `translate3d(0, ${(-dy).toFixed(1)}px, 0)`;
    const content = getContent();
    if (content) {
      const p = Math.max(0, Math.min(1, opacityProgress));
      content.style.opacity = (1 - p).toFixed(3);
      content.style.transform = `translate3d(0, ${(dy * -0.16).toFixed(1)}px, 0)`;
    }
  };
  const applyOffset = (dy, opacityProgress) => {
    pendingDy = dy;
    pendingOp = opacityProgress;
    if (applyRafId) return;
    applyRafId = requestAnimationFrame(() => {
      applyRafId = 0;
      writeOffset(pendingDy, pendingOp);
    });
  };
  const flushOffset = () => {
    if (applyRafId) { cancelAnimationFrame(applyRafId); applyRafId = 0; }
  };

  const screenH = () => window.innerHeight || 820;

  const onMove = (e) => {
    if (!tracking || animMode !== 'drag') return;
    const dy = startY - e.clientY; // 向上为正
    const nowT = performance.now();
    const dt = Math.max(1, nowT - lastT);
    lastV = (dy - lastDy) / dt;
    lastDy = dy;
    lastT = nowT;

    // 向上跟手；向下拖拽施加阻尼（橡皮筋 dy*0.15）；位移无上限钳制（历史钳制值已不存在，勿按旧注释理解）
    dragDy = dy > 0 ? dy : dy * 0.15;
    const op = Math.max(0, dragDy) / (screenH() * 0.9);
    applyOffset(dragDy, op);
    applyClockFold(op); // v9.36 #145：fold 字重跟手插值（foldP 与 content 透明度同源同域）
  };

  const finish = (e) => {
    if (!tracking || animMode !== 'drag') return;
    tracking = false;
    flushOffset(); // v7.32：丢弃未落帧，位移真值由 dragDy 交弹簧接力
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', finish);
    window.removeEventListener('pointercancel', finish);

    const dy = dragDy;
    const elapsed = performance.now() - startT;
    const velocity = elapsed < 260 ? lastV : 0; // 只有快速滑动才采信速度
    const h = screenH();

    // 原地轻点（位移/速度均可忽略）：不启动弹簧，让 click 事件直达通知卡片/按钮
    if (Math.abs(dy) < 6 && Math.abs(velocity) < 0.2) {
      animMode = 'idle';
      lockEl.style.transform = 'translate3d(0, 0, 0)';
      return;
    }

    const shouldCommit = dy > h * COMMIT_DIST_RATIO ||
      (velocity > COMMIT_VELOCITY && dy > h * FLING_MIN_DIST_RATIO);
    // v10.94 #210：已设 PIN → 上滑提交改为唤出 bouncer（AOSP「上滑→bouncer」同构：
    // 锁屏回弹落位 + bouncer 面板升起；未设 PIN 原路提交零变化）
    if (shouldCommit && lockPinStore().has()) {
      pendingCommit = false;
      startUnlockSpring(false, dy, Math.max(velocity, 0.6));
      openBouncer();
      return;
    }
    pendingCommit = shouldCommit;
    startUnlockSpring(shouldCommit, dy, shouldCommit ? Math.max(velocity, 0.6) : velocity);
  };

  lockEl.addEventListener('pointerdown', (e) => {
    if (animMode === 'spring') return; // 弹簧动画期间忽略新按点（与 iOS 一致）
    if (bouncerOpen) return; // v10.94 #210：bouncer 在场吞手势（keypad 点击直达，不启拖拽）
    tracking = true;
    animMode = 'drag';
    gestureDownPt = { x: e.clientX, y: e.clientY }; // v10.94 #19：波源候选（A12 触点涟漪行为）
    startY = e.clientY;
    startT = performance.now();
    lastDy = 0;
    lastT = startT;
    lastV = 0;
    dragDy = 0;
    lockEl.style.transition = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  });
}

// ==================== 解锁波纹涟漪过渡（v10.94 #19） ====================
// A17 canned unlock 编排叠加层（KeyguardUnlockAnimationController.kt main 实拉）：
// 提交帧从波源（触点 / A17 轴点 (w/2, h*0.66)）起波，锁屏三大内容块
//（top-area/notifications/bottom-area）随波前退场（scale/blur/opacity 三联动），
// 桌面 #desktop 以 surface-behind 形态弹回浮现（scale .95→1 / ty 5%→0 / 轴点 66%，
// WAAPI fill:'backwards' 延迟 = A17_UNLOCK.UNLOCK_ANIMATION_SURFACE_BEHIND_START_DELAY_MS（67ms，真源 aosp/unlock-ripple.js）。reduced-motion 全跳过（用户偏好优先）。

/** 建波纹层（fill 填充盘 + ring 光环两道错峰）；旧层 DOM 先行移除（机器/退场态由调用方管理）。 */
function spawnUnlockRipple(origin, maxR) {
  document.querySelectorAll('.unlock-wave').forEach((el) => el.remove());
  if (!lockEl) return null;
  const dia = Math.ceil(maxR * 2 + WAVE.FEATHER_PX * 2);
  const host = document.createElement('div');
  host.className = 'unlock-wave';
  host.style.width = `${dia}px`;
  host.style.height = `${dia}px`;
  host.style.left = `${origin.x}px`;
  host.style.top = `${origin.y}px`;
  host.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('div');
  fill.className = 'unlock-wave-fill';
  const ring = document.createElement('div');
  ring.className = 'unlock-wave-ring';
  host.appendChild(fill);
  host.appendChild(ring);
  // v10.94 #19：挂 body 层（非 lockEl 子元素）——锁屏 display:none 后波纹继续在
  // 桌面上方播完（A17 canned unlock 编排语义：波纹推开锁屏露出桌面，随父隐藏则被截断）
  document.body.appendChild(host);
  rippleLayers = { fill, ring, maxR };
  return rippleLayers;
}

/** 逐帧应用波纹：半径/透明度 + 内容退场三联动（machine.sample 单源时间基）。 */
function applyUnlockRippleFrame(sample) {
  if (!rippleLayers || !sample || sample.state !== 'expanding') return;
  const { fill, ring, maxR } = rippleLayers;
  const rRatio = sample.maxRadius > 0 ? sample.radius / maxR : 0;
  const ringP = Math.min(1, Math.max(0, (sample.p - WAVE.RING_LAG) / (1 - WAVE.RING_LAG)));
  fill.style.transform = `translate(-50%, -50%) scale(${rRatio.toFixed(4)})`;
  fill.style.opacity = (1 - sample.p).toFixed(3);
  ring.style.transform = `translate(-50%, -50%) scale(${(rRatio * 1.06).toFixed(4)})`;
  ring.style.opacity = (WAVE.RING_ALPHA_START * (1 - ringP)).toFixed(3);
  for (const m of retireMeta) {
    if (!m.el.isConnected) continue;
    const tp = contentRetireProgress(m.dist, sample.radius, WAVE.FEATHER_PX);
    const t = contentRetireTransform(tp);
    m.el.style.opacity = t.opacity.toFixed(3);
    m.el.style.transform = `scale(${t.scale.toFixed(4)})`;
    m.el.style.filter = t.blurPx > 0.3 ? `blur(${t.blurPx.toFixed(1)}px)` : '';
  }
}

/** 波纹独立推进循环：sample→落帧，done/idle 自停；teardown 取消。 */
function rippleFrameLoop(now) {
  if (rippleMachine.state !== 'expanding') { rippleRafId = 0; return; }
  applyUnlockRippleFrame(rippleMachine.sample(now));
  if (rippleMachine.state === 'expanding') rippleRafId = requestAnimationFrame(rippleFrameLoop);
  else rippleRafId = 0;
}

/** 全量回收：波纹层移除 + 退场块样式复位 + 机器归位（completeUnlock/回锁/快捷路径共用）。 */
function teardownUnlockRipple() {
  rippleMachine.cancel();
  if (rippleRafId) { cancelAnimationFrame(rippleRafId); rippleRafId = 0; }
  document.querySelectorAll('.unlock-wave').forEach((el) => el.remove());
  for (const m of retireMeta) {
    if (m.el.isConnected) { m.el.style.opacity = ''; m.el.style.transform = ''; m.el.style.filter = ''; }
  }
  retireMeta = [];
  rippleLayers = null;
}

/** 波纹自然播完回收（A17 编排语义：手势快慢只决定触发时刻，波纹 300ms 完整播放；
 *  锁屏已隐藏、层挂 body 继续可见，播完后自回收；回锁等硬中断仍走 teardown 即清）。 */
function finishUnlockRippleNaturally() {
  if (rippleMachine.state !== 'expanding') { teardownUnlockRipple(); return; }
  const remain = Math.max(0, WAVE.DURATION_MS - (performance.now() - rippleBeginTs));
  setTimeout(() => teardownUnlockRipple(), remain + 40);
}

/** 提交帧起波 + surface-behind 弹回（A17 canned unlock 编排；reduced-motion 全跳过）。 */
function beginUnlockRippleSequence(fromDy) {
  const w = window.innerWidth || 820;
  const h = window.innerHeight || 820;
  teardownUnlockRipple(); // v10.94 #19：先清旧场再起波（防前次残留层/退场态混入本次时序）
  const origin = resolveRippleOrigin(gestureDownPt.x != null ? gestureDownPt : null, w, h);
  const blocks = [
    lockEl && lockEl.querySelector('.lock-top-area'),
    lockEl && lockEl.querySelector('.lock-notifications'),
    lockEl && lockEl.querySelector('.lock-bottom-area'),
  ].filter(Boolean);
  if (blocks.length && !prefersReducedMotion()) {
    retireMeta = blocks.map((el) => {
      const r = el.getBoundingClientRect();
      // v10.94 #19：距离计算补偿锁屏当前上移（getBoundingClientRect 含 transform，
      // 提交帀锁屏已被拖上移 fromDy —— 不补则 top 块 dist 超出 maxR，波前永远追不上）
      const cy = r.top + fromDy + r.height / 2;
      return { el, dist: Math.hypot(r.left + r.width / 2 - origin.x, cy - origin.y) };
    });
    const started = rippleMachine.begin(origin, { w, h }, performance.now());
    if (started) {
      rippleBeginTs = performance.now();
      spawnUnlockRipple(origin, rippleMachine.maxRadius);
      rippleRafId = requestAnimationFrame(rippleFrameLoop); // v10.94 #19：独立推进（弹簧完成后波纹继续播满 300ms）
    }
  }
  // surface-behind 弹回：WAAPI fill:'backwards' —— 延迟 = UNLOCK_ANIMATION_SURFACE_BEHIND_START_DELAY_MS（67ms，:805 消费）期间即呈现起始压缩态
  //（A17 语义：桌面在锁屏下方以 scale .95 / ty 5% 待命，解锁后弹回全幅，轴点 66%）
  const desktop = document.getElementById('desktop');
  if (desktop && !prefersReducedMotion()) {
    try {
      desktop.animate([
        {
          transform: `scale(${A17_UNLOCK.SURFACE_BEHIND_START_SCALE_FACTOR}) translateY(${(A17_UNLOCK.SURFACE_BEHIND_START_TRANSLATION_Y * h).toFixed(1)}px)`,
          transformOrigin: `50% ${Math.round(A17_UNLOCK.SURFACE_BEHIND_SCALE_PIVOT_Y * 100)}%`,
        },
        { transform: 'none' },
      ], {
        duration: A17_UNLOCK.UNLOCK_ANIMATION_DURATION_MS,
        delay: A17_UNLOCK.UNLOCK_ANIMATION_SURFACE_BEHIND_START_DELAY_MS,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
        fill: 'backwards',
      });
    } catch (e) { /* WAAPI 不可用环境静默降级：桌面保持全幅 */ }
  }
}

/**
 * 释放后由弹簧接管：commit=true 飞出解锁，false 回弹归位
 * 初值 = 当前拖拽位移，初速 = 真实释放速度 → 无缝接力不瞬移
 */
function startUnlockSpring(commit, fromDy, velocity) {
  animMode = 'spring';
  const h = window.innerHeight || 820;
  unlockSpring = new Spring({
    ...UNLOCK_PARAMS,
    initialValue: fromDy,
    initialVelocity: velocity * 1000, // Spring 速度单位为 px/s，手势为 px/ms
  });
  unlockSpring.target = commit ? h * 1.15 : 0;

  // v7.13：提交解锁的瞬间即预启桌面入场动效 —— 布局测量/样式写入/层准备的全部
  // 开销都落在锁屏遮盖之下（用户不可见）；锁屏飞离时图标已在入场途中，与解锁
  // 飞行形成连续一体的运动叙事（iOS 同款衔接感），同时消除入场首帧卡顿。
  if (commit) {
    playSfx('unlock'); // v9.94 #36：解锁音随波纹起点 commit 帧同步（#36 验收：触发点与动画帧同步）
    playUnlockEntrance();
    beginUnlockRippleSequence(fromDy); // v10.94 #19：波纹起波 + surface-behind 弹回（A17 canned unlock 编排）
  }

  let lastNow = performance.now();
  const getContent = () => {
    // 弹簧循环逐帧调用：缓存内容层引用，断链时重查
    if (!springContentCache || !springContentCache.isConnected) springContentCache = lockEl.querySelector('.lock-content');
    return springContentCache;
  };
  let springContentCache = null;
  const step = (now) => {
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    unlockSpring.update(dt);

    const x = unlockSpring.x;
    const content = getContent();
    if (commit) {
      const op = Math.max(0, 1 - Math.max(0, x) / (h * 0.9));
      lockEl.style.transform = `translate3d(0, ${(-x).toFixed(1)}px, 0)`;
      lockEl.style.opacity = op.toFixed(3);
      applyClockFold(Math.max(0, x) / (h * 0.9)); // v9.36 #145：弹簧接力 fold 连续插值（drag→spring 无缝：位移真值同域）
      if (content) content.style.opacity = '1';
      if (unlockSpring.isSettled(0.5, 30) || op <= 0.01) {
        completeUnlock();
        return;
      }
    } else {
      lockEl.style.transform = `translate3d(0, ${(-x).toFixed(1)}px, 0)`;
      applyClockFold(Math.max(0, x) / (h * 0.9)); // v9.36 #145：回弹路径 fold 回落（x→0 时恢复注入基线，中途反转不瞬移）
      if (content) {
        const op = Math.max(0, 1 - Math.max(0, x) / (h * 0.9));
        content.style.opacity = op.toFixed(3);
        content.style.transform = `translate3d(0, ${(x * -0.16).toFixed(1)}px, 0)`;
      }
      if (unlockSpring.isSettled(0.5, 30)) {
        lockEl.style.transform = 'translate3d(0, 0, 0)';
        applyClockFold(0); // v9.36 #145：回弹归位显式复位（弹簧末帧 x≠0 → p>0 不触发 p<=0 恢复分支，不显式复位则 fold 残留——R52 e2e F9 实测在录）
        if (content) { content.style.opacity = ''; content.style.transform = ''; }
        animMode = 'idle';
        pendingCommit = false;
        return;
      }
    }
    rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
}

// ==================== PIN bouncer（v10.94 #210） ====================
// KeyguardSecurityContainer bouncer 阶段 Web 同构：已设 PIN 时上滑提交唤出 3×4 数字键盘；
// 正确 → completeUnlock / 错误 → shake + 失败计数；5 连败 → 30s 冷却（Gatekeeper Web 近似）。
// 快捷沿（相机/通知深链 unlockAndOpen）与测试钩子 instantUnlock 零 PIN 拦截——AOSP keyguard
// 相机直通同语义 + 回归脚本确定性纪律（诚实标注在 #210 交付报告：PIN 门仅管上滑主解锁沿，
// 快捷沿直通为存续行为，后续如需收紧另开议题）。

function bouncerEls() {
  if (!lockEl) return {};
  return {
    panel: lockEl.querySelector('.lock-bouncer'),
    hint: lockEl.querySelector('.lock-bouncer-hint'),
    dots: lockEl.querySelector('.lock-bouncer-dots'),
    msg: lockEl.querySelector('.lock-bouncer-msg'),
    pad: lockEl.querySelector('.lock-bouncer-pad'),
  };
}

function renderBouncerDots() {
  const { dots } = bouncerEls();
  if (!dots) return;
  dots.innerHTML = '';
  for (let i = 0; i < bouncerEntry.length; i++) {
    const d = document.createElement('span');
    d.className = 'lock-bouncer-dot';
    dots.appendChild(d);
  }
}

function setBouncerMsg(text, stickyMs) {
  const { msg } = bouncerEls();
  if (!msg) return;
  msg.textContent = text || '';
  if (bouncerMsgTimer) { clearTimeout(bouncerMsgTimer); bouncerMsgTimer = 0; }
  if (stickyMs) bouncerMsgTimer = setTimeout(() => { msg.textContent = ''; bouncerMsgTimer = 0; }, stickyMs);
}

function setBouncerPadDisabled(disabled) {
  const { pad } = bouncerEls();
  if (pad) pad.classList.toggle('lock-bouncer-pad-disabled', disabled);
}

function shakeBouncer() {
  const { pad } = bouncerEls();
  if (!pad) return;
  pad.classList.remove('lock-bouncer-shake');
  void pad.offsetWidth; // 强制重排重启动画（同类重触发惯例）
  pad.classList.add('lock-bouncer-shake');
}

/** 冷却倒计时：30s 窗内每 250ms 刷新剩余提示，到期自恢复键盘；幂等防双跑。
 *  诚实标注：真等 30s 不可在 e2e 等待内完成，冷却内键盘禁用态由直调面 + 真实 5 连败验证 */
function startBouncerCooldownCountdown() {
  if (bouncerCooldownTimer) return;
  const tick = () => {
    if (!bouncerOpen) { bouncerCooldownTimer = 0; return; }
    const info = lockPinStore().throttleInfo(Date.now());
    if (!info.throttled) {
      setBouncerPadDisabled(false);
      setBouncerMsg('');
      bouncerCooldownTimer = 0;
      return;
    }
    setBouncerPadDisabled(true);
    setBouncerMsg(`错误次数过多，请 ${Math.ceil(info.remainingMs / 1000)} 秒后重试`);
    bouncerCooldownTimer = setTimeout(tick, 250);
  };
  tick();
}

function openBouncer() {
  if (!lockEl || bouncerOpen) return;
  bouncerOpen = true;
  bouncerEntry = '';
  const { panel, hint, msg } = bouncerEls();
  if (!panel) return;
  panel.hidden = false;
  if (hint) hint.textContent = '输入 PIN 解锁';
  if (msg) msg.textContent = '';
  renderBouncerDots();
  setBouncerPadDisabled(false);
  // 已在冷却中（回锁复入）→ 直接进入倒计时态
  if (lockPinStore().throttleInfo(Date.now()).throttled) startBouncerCooldownCountdown();
  // 升起动画：hidden 移除后双 rAF 加 open 类（transition 生效惯例同 playEngageAnimation）
  if (isReduceMotionActive()) { panel.classList.add('lock-bouncer-open'); return; } // 降档零动画
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('lock-bouncer-open')));
}

/** bouncer 复位（解锁成功/回锁/快捷沿共用——冷却计时器同步回收防跨会话残留） */
function closeBouncer() {
  bouncerOpen = false;
  bouncerEntry = '';
  if (bouncerMsgTimer) { clearTimeout(bouncerMsgTimer); bouncerMsgTimer = 0; }
  if (bouncerCooldownTimer) { clearTimeout(bouncerCooldownTimer); bouncerCooldownTimer = 0; }
  if (!lockEl) return;
  const { panel, pad } = bouncerEls();
  if (panel) { panel.classList.remove('lock-bouncer-open'); panel.hidden = true; }
  if (pad) pad.classList.remove('lock-bouncer-shake');
}

function onBouncerDigit(d) {
  if (!bouncerOpen) return;
  if (lockPinStore().throttleInfo(Date.now()).throttled) { startBouncerCooldownCountdown(); return; }
  if (bouncerEntry.length >= 16) return; // PIN_MAX_LENGTH 输入面工程锥制
  bouncerEntry += String(d);
  renderBouncerDots();
  setBouncerMsg('');
}

function onBouncerDelete() {
  if (!bouncerOpen) return;
  bouncerEntry = bouncerEntry.slice(0, -1);
  renderBouncerDots();
}

function onBouncerSubmit() {
  if (!bouncerOpen) return;
  const store = lockPinStore();
  if (store.throttleInfo(Date.now()).throttled) { startBouncerCooldownCountdown(); return; }
  if (bouncerEntry.length < PIN_MIN_LENGTH) {
    setBouncerMsg(`PIN 至少 ${PIN_MIN_LENGTH} 位`, 2200);
    shakeBouncer();
    return;
  }
  const entry = bouncerEntry;
  const snap = store.snapshot();
  verifyPassword(entry, { hashHex: snap.hashHex, saltHex: snap.saltHex, iterations: snap.iterations })
    .then((ok) => {
      if (!bouncerOpen) return; // 校验期间回锁/解锁竞态零落账（then 内重验 bouncerOpen）
      if (ok) {
        store.recordSuccess();
        playSfx('unlock'); // v9.94 #36：解锁音（上滑沿 commit 帧同款，bouncer 沿同步）
        closeBouncer();
        completeUnlock();
      } else {
        const res = store.recordFail(Date.now());
        bouncerEntry = '';
        renderBouncerDots();
        shakeBouncer();
        if (res.throttled) {
          startBouncerCooldownCountdown();
        } else {
          setBouncerMsg(`PIN 不正确（已失败 ${res.failedAttempts} 次，${FAILED_ATTEMPTS_BEFORE_TIMEOUT} 次后暂停 30 秒）`, 2600);
        }
      }
    })
    .catch(() => { setBouncerMsg('PIN 校验不可用', 2200); });
}

/** 解锁完成：隐藏锁屏、解除全局锁定状态 */
function completeUnlock() {
  // v10.94 #96 二期：解锁沿计账（真实上滑解锁——AOSP Keyguard dismiss 解锁沿 Web 近似；
  // 测试钩子 instantUnlock 不在此列零计账）
  try { usageStore.deviceEvent('unlock'); } catch (e) {}
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  animMode = 'idle';
  pendingCommit = false;
  isLocked = false;
  lockEl.style.display = 'none';
  lockEl.style.transform = '';
  lockEl.style.opacity = '';
  lockEl.style.transition = '';
  const content = lockEl.querySelector('.lock-content');
  if (content) { content.style.opacity = ''; content.style.transform = ''; }
  finishUnlockRippleNaturally(); // v10.94 #19：波纹独立于弹簧自然播完（层挂 body 锁屏隐藏后继续可见）
  document.body.classList.remove('is-locked');
  // v7.13：入场动效已在 startUnlockSpring 提交分支预先启动（锁屏遮盖下完成全部
  // 预备开销，飞离时图标已在入场途中），此处不再补播
}

// ==================== 解锁桌面图标入场动效（v7.13 高保真复刻双风格） ====================
// iOS「整排飞入」：复刻 SpringBoard IconFlyInAnimator —— 图标自屏幕底缘起飞，
//   真实行分组后一整排一整排错峰飞入（底排先行、自下而上），受控过冲后自然落位；
// Android「涟漪扩散」：复刻 Material You 解锁涟漪 —— 以屏幕中心为波源，图标随扩散
//   波前由内向外浮现（缩放 + 内聚位移释放 + 淡入），并伴随可见的涟漪光环扩散。
// 性能：全部动画仅驱动合成器属性（transform/opacity）；预备段（测量/回流/层准备）
//   在锁屏遮盖下执行 —— 起飞开销对用户完全不可见，锁屏飞离时图标已在入场途中。
const UNLOCK_STYLE_KEY = 'ios-desktop:unlock-anim-style';

/** 获取当前解锁入场动效风格：'ios'（整排飞入）或 'android'（中心涟漪辐射） */
export function getUnlockAnimStyle() {
  try {
    const v = localStorage.getItem(UNLOCK_STYLE_KEY);
    return v === 'android' ? 'android' : 'ios';
  } catch (e) {
    return 'ios';
  }
}

/** 设置解锁入场动效风格并广播通知 */
export function setUnlockAnimStyle(style) {
  if (style !== 'ios' && style !== 'android') return;
  try { localStorage.setItem(UNLOCK_STYLE_KEY, style); } catch (e) {}
  document.dispatchEvent(new CustomEvent('unlock-style-changed', { detail: { style } }));
}

// —— 手感参数（集中调校区）——
const IOS_ROW_DELAY = 54;          // iOS：相邻两排的起飞间隔（ms）
const IOS_COL_DELAY = 9;           // iOS：同排内列微错峰（ms）
const IOS_DURATION = 620;          // iOS：单图标飞行总时长（含过冲落位）
const ANDROID_WAVE_SPREAD = 360;   // Android：涟漪波前扫满全屏用时（ms）
const ANDROID_DURATION = 520;      // Android：单图标涟漪出场时长（ms）
const AND_RADIAL_OFFSET = 20;      // Android：初始内聚位移（px，指向波源）
const ENTRANCE_CLEAN_MARGIN = 140; // 清场裕量（等最慢动画结束后回收类名）

let unlockEnterTimer = 0;
let unlockRippleTimer = 0;

/** prefers-reduced-motion 安全读取（异常环境降级为 false） */
function prefersReducedMotion() {
  // v10.94 #105：双通道判定（系统 @media + html[data-a11y-reduce-motion] 用户开关）
  return isReduceMotionActive();
}

/**
 * 真实行分组：按视觉 top 坐标聚簇（容差 12px），行内按 left 升序。
 * 相比旧版 index/4 假设，正确覆盖 4/6 列响应式网格与文件夹混排场景。
 * @param {HTMLElement[]} icons
 */
function groupIconsByRow(icons) {
  const ROW_EPS = 12;
  const measured = icons.map((el) => {
    const r = el.getBoundingClientRect();
    return { el, top: r.top, left: r.left };
  });
  measured.sort((a, b) => a.top - b.top || a.left - b.left);
  const rows = [];
  for (const m of measured) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(m.top - last.top) <= ROW_EPS) last.items.push(m);
    else rows.push({ top: m.top, items: [m] });
  }
  return rows;
}

/** 入场动效全量清场（图标 + 小部件 + 页点），连续锁/解锁可重触发 */
function clearUnlockEntrance() {
  document.querySelectorAll('.unlock-icon-in, .unlock-icon-in-ios, .unlock-icon-in-android, .unlock-icon-fade').forEach((el) => {
    el.classList.remove('unlock-icon-in', 'unlock-icon-in-ios', 'unlock-icon-in-android', 'unlock-icon-fade');
    el.style.animationDelay = '';
    el.style.removeProperty('--radial-dx');
    el.style.removeProperty('--radial-dy');
  });
  const glance = document.getElementById('pixelAtAGlance');
  if (glance) { glance.classList.remove('unlock-glance-in'); glance.style.animationDelay = ''; }
  const dots = document.getElementById('pageDots');
  if (dots) { dots.classList.remove('unlock-dots-in'); dots.style.animationDelay = ''; }
}

/** Android 涟漪光环：两道错峰扩散环（纯 transform/opacity 合成器动画，播完即移除） */
function spawnUnlockRippleRing(maxDist) {
  const host = document.getElementById('desktop');
  if (!host) return;
  host.querySelectorAll('.unlock-ripple-ring').forEach((el) => el.remove());
  const dia = Math.max(240, Math.ceil(maxDist * 2 + 140));
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 2; i++) {
    const ring = document.createElement('div');
    ring.className = 'unlock-ripple-ring' + (i === 1 ? ' unlock-ripple-ring--second' : '');
    ring.style.width = `${dia}px`;
    ring.style.height = `${dia}px`;
    ring.setAttribute('aria-hidden', 'true');
    frag.appendChild(ring);
  }
  host.appendChild(frag);
  clearTimeout(unlockRippleTimer);
  unlockRippleTimer = setTimeout(() => {
    host.querySelectorAll('.unlock-ripple-ring').forEach((el) => el.remove());
  }, 1000);
}

/**
 * 播放解锁入场动效。由解锁提交弹簧起点调用：全部预备开销
 * （rect 测量 / 单次回流 / 样式写入 / 合成层准备）都在锁屏遮盖下完成。
 * @returns {number} 动效总时长（ms）
 */
function playUnlockEntrance() {
  clearTimeout(unlockEnterTimer);
  const slider = document.getElementById('desktopSlider');
  if (!slider) return 0;
  // 仅当前视口内的桌面页参与（其他页不可见；避免无谓动画与滑页手势打架）
  const page = Array.from(slider.children).find((p) => {
    const r = p.getBoundingClientRect();
    return r.width > 0 && r.right > 0 && r.left < window.innerWidth;
  });
  if (!page) return 0;
  const icons = Array.from(page.querySelectorAll('.app-icon, .app-folder'));
  if (icons.length === 0) return 0;

  const animStyle = getUnlockAnimStyle();
  clearUnlockEntrance();

  // 无动效偏好（prefers-reduced-motion）：一次性温和淡入，不位移不缩放
  if (prefersReducedMotion()) {
    icons.forEach((el) => el.classList.add('unlock-icon-fade'));
    unlockEnterTimer = setTimeout(clearUnlockEntrance, 460);
    return 400;
  }

  void page.offsetWidth; // 单次 reflow：确保连续锁/解锁时动画可重新触发

  const glance = document.getElementById('pixelAtAGlance');
  const dots = document.getElementById('pageDots');
  let totalMs = 0;

  if (animStyle === 'android') {
    // —— Android 涟漪扩散：中心波源 + 距离波前延迟 + 涟漪光环 ——
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const maxDist = Math.hypot(cx, cy) || 1;
    let maxDelay = 0;
    icons.forEach((el) => {
      const r = el.getBoundingClientRect();
      const ix = r.left + r.width / 2;
      const iy = r.top + r.height / 2;
      const dist = Math.hypot(ix - cx, iy - cy);
      const norm = clamp(dist / maxDist, 0, 1);
      const dirX = dist > 0 ? (ix - cx) / dist : 0;
      const dirY = dist > 0 ? (iy - cy) / dist : 0;
      el.style.setProperty('--radial-dx', `${(-dirX * AND_RADIAL_OFFSET).toFixed(1)}px`);
      el.style.setProperty('--radial-dy', `${(-dirY * AND_RADIAL_OFFSET).toFixed(1)}px`);
      const delay = Math.round(Math.pow(norm, 0.9) * ANDROID_WAVE_SPREAD);
      if (delay > maxDelay) maxDelay = delay;
      el.style.animationDelay = `${delay}ms`;
      el.classList.add('unlock-icon-in-android');
    });
    spawnUnlockRippleRing(maxDist);
    if (glance) {
      glance.style.animationDelay = `${Math.round(ANDROID_WAVE_SPREAD * 0.3)}ms`;
      glance.classList.add('unlock-glance-in');
    }
    if (dots) {
      dots.style.animationDelay = `${Math.round(ANDROID_WAVE_SPREAD * 0.75)}ms`;
      dots.classList.add('unlock-dots-in');
    }
    totalMs = maxDelay + ANDROID_DURATION;
  } else {
    // —— iOS 整排飞入：真实行分组，底排先行、自下而上逐排续接 ——
    const rows = groupIconsByRow(icons);
    rows.forEach((row, rowIdx) => {
      const rowDelay = (rows.length - 1 - rowIdx) * IOS_ROW_DELAY; // 底排（视觉最靠下）先行
      row.items.forEach((m, colIdx) => {
        m.el.style.animationDelay = `${rowDelay + colIdx * IOS_COL_DELAY}ms`;
        m.el.classList.add('unlock-icon-in-ios');
      });
    });
    // 小部件随首波后柔和浮现；页点位于屏底，随首排同步淡入
    if (glance) {
      glance.style.animationDelay = `${Math.round(IOS_ROW_DELAY * 1.2)}ms`;
      glance.classList.add('unlock-glance-in');
    }
    if (dots) {
      dots.style.animationDelay = `${Math.round(IOS_ROW_DELAY * 0.6)}ms`;
      dots.classList.add('unlock-dots-in');
    }
    totalMs = Math.max(0, rows.length - 1) * IOS_ROW_DELAY + 2 * IOS_COL_DELAY + IOS_DURATION;
  }

  unlockEnterTimer = setTimeout(clearUnlockEntrance, totalMs + ENTRANCE_CLEAN_MARGIN);
  return totalMs + ENTRANCE_CLEAN_MARGIN;
}

/** 锁屏出现动画：自顶部滑落（CSS transition 驱动，一次性） */
let engageTimer = null;
function playEngageAnimation() {
  lockEl.style.transition = 'none';
  lockEl.style.transform = 'translate3d(0, -100%, 0)';
  lockEl.style.opacity = '0';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      lockEl.style.transition = 'transform 0.55s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease';
      lockEl.style.transform = 'translate3d(0, 0, 0)';
      lockEl.style.opacity = '1';
      // 收尾复位带守卫：解锁/重建后不再对脱链元素写样式（测试 teardown 报错源）
      if (engageTimer) clearTimeout(engageTimer);
      engageTimer = setTimeout(() => {
        engageTimer = null;
        if (!lockEl.isConnected) return;
        lockEl.style.transition = '';
        lockEl.style.opacity = '';
      }, 600);
    });
  });
}

/** 立即锁屏（供快捷设置磁贴 / 测试钩子调用） */
export function lockNow() {
  ensureLockDOM();
  if (isLocked) return;
  isLocked = true;
  // v10.94 #19 顺手修一：弹簧飞行中回锁的状态机复位（unlockAndOpen 同款清理）——
  // 旧路径 lockNow 仅 display:flex，旧 rAF 仍持锁屏引用继续飞 → completeUnlock
  // 二次落库 display:none 覆盖回锁态（S5 连续链实测在录）
  if (animMode === 'spring') {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    animMode = 'idle';
    pendingCommit = false;
  }
  teardownUnlockRipple(); // v10.94 #19：回锁兜底清波（弹簧中途被打断等极端时序零残留）
  closeBouncer(); // v10.94 #210：回锁 bouncer 复位（计时器/输入/面板全链回收）
  playSfx('lock'); // v9.94 #36：上锁音（AOSP Lock.ogg，AudioService 锁屏 sound effect 语义）
  document.body.classList.add('is-locked');
  refreshClock();
  refreshWallpaperLayer();
  renderLockNotifications();
  applyClockFold(0); // v9.36 #145：fold 残留复位（commit 飞出后两钟 wght 100 残留 → 重入锁屏恢复注入基线）
  lockEl.style.display = 'flex';
  playEngageAnimation();
}

/** 当前锁定态只读查询（v9.94 #35：aod-ui 进 AOD 前锁屏兜底判定用；零行为变更） */
export function isLockedNow() { return isLocked; }

/** 解锁并打开指定应用（锁屏通知 / 相机快捷键路径） */
function unlockAndOpen(appIdx, sourceRect) {
  ensureLockDOM();
  if (isLocked) {
    // v10.94 #96 二期：快捷解锁沿计账（相机/通知深链解锁——真实解锁第二路径；
    // instantUnlock 测试钩子零计账注记在 __lockTest）
    try { usageStore.deviceEvent('unlock'); } catch (e) {}
    closeBouncer(); // v10.94 #210：快捷沿 bouncer 复位（通知深链直达时不留面板）
    // 快速解锁：直接完成（不做完整上滑动画，让位给应用打开动画）
    if (animMode === 'spring' && rafId) cancelAnimationFrame(rafId);
    isLocked = false;
    animMode = 'idle';
    lockEl.style.display = 'none';
    lockEl.style.transform = '';
    lockEl.style.opacity = '';
    lockEl.style.transition = '';
    const content = lockEl.querySelector('.lock-content');
    if (content) { content.style.opacity = ''; content.style.transform = ''; }
    teardownUnlockRipple(); // v10.94 #19：快捷路径同清理（相机/通知深链解锁零残留）
    document.body.classList.remove('is-locked');
  }
  const rect = (sourceRect && sourceRect.width > 0 && Number.isFinite(sourceRect.left)) ? sourceRect : null;
  openApp(appIdx, null, rect);
}

// ==================== 测试钩子（无头回归使用） ====================

if (typeof window !== 'undefined') {
  // v9.94 #20：设置侧唯一持久化写路径（theme-engine 壁纸页零 import 调用——
  // theme-engine↔lock-screen 已有 video-wallpaper 运行时环，window 钩子解耦同 v9.77 惯例）
  window.__lockClockFaces = {
    setFace: (id) => setLockClockFace(id),
    setFont: (id) => setLockClockFont(id),
  };
  window.__lockTest = {
    isLocked: () => isLocked,
    lock: () => lockNow(),
    /** 无动画瞬间解锁（回归脚本用） */
    instantUnlock: () => {
      if (!lockEl) { isLocked = false; document.body.classList.remove('is-locked'); return; }
      closeBouncer(); // v10.94 #210：测试钩子 bouncer 复位（确定性纪律）
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      animMode = 'idle';
      isLocked = false;
      lockEl.style.display = 'none';
      lockEl.style.transform = '';
      lockEl.style.opacity = '';
      lockEl.style.transition = '';
      teardownUnlockRipple(); // v10.94 #19：测试钩子同清理
      document.body.classList.remove('is-locked');
    },
    /** v10.94 #19 波纹观测（无头回归用）：机器态 + 波纹层在场 + 退场块计数 */
    ripple: () => {
      const wave = document.querySelector('.unlock-wave');
      return {
        state: rippleMachine.state,
        wavePresent: !!wave,
        fillScale: wave ? wave.querySelector('.unlock-wave-fill')?.style.transform || '' : '',
        retireCount: retireMeta.length,
        origin: rippleMachine.origin,
      };
    },
    /** #186 二期档位观测（无头回归用）：当前档位名 + 双容器可见性 */
    clockSize: () => {
      if (!lockEl) return null;
      const small = lockEl.querySelector('.lock-clock');
      const large = lockEl.querySelector('.lock-clock-large');
      return {
        displayed: displayedClockSize ? displayedClockSize.name : null,
        smallVisibility: small ? getComputedStyle(small).visibility : '',
        largeDisplay: large ? getComputedStyle(large).display : '',
        largeText: large ? large.textContent : '',
      };
    },
    /** v9.94 #20 表盘观测/写路径（无头回归 + 设置侧 window 钩子零 import 解耦） */
    face: () => {
      if (!lockEl) return { id: currentFaceId };
      const small = lockEl.querySelector('.lock-clock');
      const large = lockEl.querySelector('.lock-clock-large');
      const inner = (el) => (el && el.firstElementChild && el.firstElementChild.dataset) ? el.firstElementChild.dataset.face || '' : (el ? 'text' : '');
      return {
        id: currentFaceId,
        smallFace: inner(small),
        largeFace: inner(large),
        largeStacked: !!(large && large.querySelector('.lock-face-hh')),
        smallText: small ? small.textContent : '',
        largeText: large ? large.textContent : '',
        fontStack: small ? small.style.fontFamily || '(css-default)' : '',
        smallNodeFont: (small && small.firstElementChild) ? small.firstElementChild.style.fontFamily || '(inherit)' : '',
      };
    },
    setFace: (id, persist) => setLockClockFace(id, persist),
    setFont: (id, persist) => setLockClockFont(id, persist),
    openBouncer: () => openBouncer(),
    closeBouncer: () => closeBouncer(),
    bouncerKey: (d) => onBouncerDigit(String(d)),
    bouncerDel: () => onBouncerDelete(),
    bouncerSubmit: () => onBouncerSubmit(),
    /** v10.94 #210 PIN bouncer 观测（无头回归用）：开合/输入长/面板在场/存档态/节流判定 */
    pin: () => {
      const store = (() => { try { return lockPinStore(); } catch (e) { return null; } })();
      const { panel, msg, pad } = bouncerEls();
      return {
        open: bouncerOpen,
        entryLen: bouncerEntry.length,
        panelPresent: !!panel,
        panelHidden: panel ? panel.hidden : null,
        panelOpenClass: panel ? panel.classList.contains('lock-bouncer-open') : null,
        msg: msg ? msg.textContent : '',
        padDisabled: pad ? pad.classList.contains('lock-bouncer-pad-disabled') : null,
        hasPin: store ? store.has() : false,
        failedAttempts: store ? store.snapshot().failedAttempts : 0,
        throttle: store ? store.throttleInfo(Date.now()) : { throttled: false, remainingMs: 0 },
      };
    },
    /** #145 fold 字重插值观测（无头回归用）：覆盖态 + 两钟内联轴串 + 插值引擎 missCount */
    fold: () => {
      if (!lockEl) return null;
      const small = lockEl.querySelector('.lock-clock');
      const large = lockEl.querySelector('.lock-clock-large');
      return {
        applied: foldApplied,
        smallFvs: small ? small.style.fontVariationSettings : '',
        largeFvs: large ? large.style.fontVariationSettings : '',
        missCount: clockFontInterpolator.missCount,
      };
    },
    foldApply: (p) => applyClockFold(p),
    /** 无动画瞬间上锁（回归脚本用） */
    instantLock: () => {
      ensureLockDOM();
      closeBouncer(); // v10.94 #210：测试钩子 bouncer 复位（重入锁屏确定性）
      isLocked = true;
      document.body.classList.add('is-locked');
      refreshClock();
      refreshWallpaperLayer();
      renderLockNotifications();
      lockEl.style.transition = 'none';
      lockEl.style.display = 'flex';
      lockEl.style.transform = 'translate3d(0, 0, 0)';
      lockEl.style.opacity = '1';
    },
  };
}

/** 初始化：默认展示锁屏（?nolock=1 时跳过，供调试与部分回归场景） */
export function initLockScreen() {
  const params = new URLSearchParams(window.location.search || '');
  if (params.has('nolock')) {
    document.body.classList.remove('is-locked');
    return;
  }
  lockNow();
}
