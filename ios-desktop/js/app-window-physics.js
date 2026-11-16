// ==================== app-window-physics.js — 统一多应用物理渲染循环（#284 批24 单源搬迁） ====================
//
// 来源：ios-desktop/js/app-window.js（v11.48）「统一多应用物理渲染循环」段——banner + startLoop
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

// ==================== 统一多应用物理渲染循环 ====================

/** 启动统一 RK4 物理积分循环（时间累积器：掉帧不慢放；主窗口 / Actor / 放射场同循环驱动）
 *  #75：params 非空（真实过渡起点）时经 getTransitionRunner 分派引擎 ——
 *  bouncy=弹簧（现有语义），native=定时轴（emphasized/app_open_x + AOSP 打断协议）。
 *  相位推断：全部调用路径先写 scaleSpring.target 再 startLoop，target ≥ 0.5 即 open。
 *  gestures.js 传入的 OPEN_PARAMS 常量参数由预设参数取代（预设一致性修复：旧路径
 *  恒用 spring.js 兑底常量、无视当前预设）。 */
export function startLoop(params) {
  if (params) {
    const phase = (state.scaleSpring && state.scaleSpring.target >= 0.5) ? 'open' : 'close';
    const runner = getTransitionRunner(phase);
    if (runner.kind === 'timed') {
      syncMainEngineKind(true);
      state.posSpring.reconfigure(runner.posDesc);
      state.scaleSpring.reconfigure(runner.scaleDesc);
    } else {
      syncMainEngineKind(false);
      state.posSpring.reconfigure(runner.params);
      state.scaleSpring.reconfigure(runner.params);
    }
  }
  // v7.42：在途卡片飞行（flyAppToCard）被渲染循环接管（开窗承接/关闭归巢）——
  // 旧实现飞行循环持有 state.rafId 且不被任何路径取消，承接路径 startLoop
  // 早退后飞行继续把窗口缩进卡片，应用「打不开」。这里显式中止飞行：
  // 飞行帧检测 flightActive=false 后静默退场（不碰 rafId），本循环接管动画。
  if (state.flightActive) {
    state.flightActive = false;
    // v7.65：飞行被渲染循环接管（开窗承接/关闭归巢）→ 同步回落飞行期抬高的舞台 z
    if (state.stageRaisedForFlight) {
      state.stageRaisedForFlight = false;
      const stageEl = document.getElementById('stage');
      if (stageEl) stageEl.style.zIndex = '';
    }
    if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
  }
  if (state.rafId) return;

  // #225：本轮循环唯一代次 + 挂看门狗（setTimeout 独立于 rAF，节流时仍生效）
  const loopGen = (state.launchLoopGen = (state.launchLoopGen || 0) + 1);
  launchWatchdog.arm();
  armIframeLoadRelease();

  const STEP = 1 / 120;
  const MAX_SUBSTEPS = 30; // 单帧最多补偿 250ms，超出部分丢弃（防死亡螺旋，杜绝慢放）
  let accumulator = 0;
  let lastTime = performance.now();
  const gapBuf = []; // #310：最近 8 帧帧距滚动缓冲（自适应钳制的节奏基准，随 startLoop 重入重置）

  function frame(now) {
    // #225：看门狗或新循环已接管 → 旧排队帧静默早退（防 rAF 恢复后把窗口缩回 44×44）
    if (state.launchLoopGen !== loopGen) return;
    // v7.57（issue #8）：渲染循环心跳 —— visibility-heal 回前台自愈据此判断
    // rAF 链是否被切后台冻结丢弃（心跳超时 → 重启循环，弹簧自会收敛或走完复位）
    state._frameHeartbeat = now;
    let rawDt = (now - lastTime) / 1000;
    lastTime = now;
    // v11.48 帧间隙钳制 0.25→0.05 → v11.48 双层自适应钳制（#310 残留跳变修复）：
    // 固定 0.05 钳制的问题：单渲染帧的物理推进量直接决定该帧视觉增量 —— 主窗口
    // 动画引擎实测为 TimedValue/Timed2D（native 预设，EMPHASIZED 插值），陡段斜率
    // 峰值 ~18.4/s（插桩实测 0.807→0.200@33ms 推进，v=-11.94；spring 解析闭式解
    // 引擎同段仅 ~7.5/s）—— 0.05s 推进 × 18.4/s ≈ 0.9 单帧 scale 跳变（MO 相位流
    // 实测 0.375~0.515，见 #310 一表），是正常帧增量（16.7ms × 18.4 ≈ 0.31）的
    // 3~4 倍 —— 即「动画中间卡一下/跳一下」的残留观感。
    // 双层钳制（缺一不可，首版 0.033 封顶被 18.4/s 陡段击穿至 0.6）：
    // ① 陡段封顶 0.017s（1/60s）：17ms × 18.4/s ≈ 0.31 = 60fps 正常帧单帧增量等量
    //   —— 任何帧距下单帧视觉增量 ≤ 正常帧，「肉眼连贯」的绝对保底（headless
    //   40~180ms 帧距同样受益：动画时间流速低于墙钟，陡段逐帧匀速走过而非 2~3 帧
    //   跳完）；
    // ② 环境自适应：滚动最近 8 帧帧距取中位，上限 = 中位×1.5 再与 ① 取小
    //   —— 120Hz 环境停顿帧钳 12.5ms（增量 = 1.5×正常帧，感知阈值内）；
    //   60fps 环境取 17ms 封顶值；30fps 低端机正常帧 33ms → 钳 17ms（陡段匀速
    //   慢放零跳变，动画总时长墙钟延长 ~2 倍为慢渲染环境的固有代价）。
    // - 被丢弃的间隙仍由墙钟自然延长总时长（v11.48 语义保留）；病理性 rAF 停摆
    //   仍由 #225 launchWatchdog（强制收敛常数见 launch-watchdog.js）兑底。
    // 放射场既有 min(rawDt, 0.05) 口径不动：装饰层非相位关键。
    if (rawDt > 0) {
      gapBuf.push(rawDt);
      if (gapBuf.length > 8) gapBuf.shift();
    }
    const gapSorted = (gapBuf.length ? gapBuf.slice() : [0.017]).sort((a, b) => a - b);
    const gapMed = gapSorted[Math.floor(gapSorted.length / 2)] || 0.017;
    // 首帧（gapBuf 空）以 0.017 兜底：med 无样本时取最保守封顶值
    const dtClamp = Math.min(gapMed * 1.5, 0.017);
    if (rawDt > dtClamp) rawDt = dtClamp;
    accumulator += rawDt;

    let steps = 0;
    while (accumulator >= STEP && steps < MAX_SUBSTEPS) {
      // 1. 主活动窗口弹簧（拖拽期间由手势手动跟踪，循环跳过避免相互对抗）
      if ((state.isOpen || state.isClosing) && !state.isDragging) {
        state.posSpring.update(STEP);
        state.scaleSpring.update(STEP);
        // 返回关闭时彻底切断下穿反弹：一旦到达或越过 0，立即锁定归零，绝无二次弹跳
        if ((state.isClosing || state.scaleSpring.target === 0) && state.scaleSpring.x <= 0) {
          state.scaleSpring.x = 0;
          state.scaleSpring.v = 0;
        }
        state.subpageSpring.update(STEP);
      }
      // 2. 并行 Closing Actors — 各自独立积分，绝不互相阻塞
      for (let idx = 0; idx < closingActors.length; idx++) {
        const actor = closingActors[idx];
        actor.posSpring.update(STEP);
        actor.scaleSpring.update(STEP);
        if (actor.scaleSpring.target === 0 && actor.scaleSpring.x <= 0) {
          actor.scaleSpring.x = 0;
          actor.scaleSpring.v = 0;
        }
      }
      accumulator -= STEP;
      steps++;
    }
    if (accumulator >= STEP) accumulator = 0;


    // 3. 放射状多图标并行物理场（装饰层，整帧推进，dt 夹紧保证 RK4 稳定）
    updateRadialField(Math.min(rawDt, 0.05), now);

    // 4. 渲染主活动窗口
    if (state.isOpen || state.isClosing) {
      const curCX = state.iconCX + state.posSpring.px;
      const curCY = state.iconCY + state.posSpring.py;
      render(state.scaleSpring.x, curCX, curCY);
    }

    // 5. 渲染并回收 Closing Actors
    for (let idx = closingActors.length - 1; idx >= 0; idx--) {
      const actor = closingActors[idx];
      const actorCX = actor.iconCX + actor.posSpring.px;
      const actorCY = actor.iconCY + actor.posSpring.py;
      renderClosingActor(actor, actor.scaleSpring.x, actorCX, actorCY);

      // 如果该关闭 Actor 已稳定到达目标（图标位置，scale <= 0）
      // v7.19：scale 锁零 = 内容已缩放到 0 且渐隐包络到头（renderClosingActor 的
      // p≤0.002 早退分支保证 opacity 恒 '0'），Actor 在视觉上已完全消失 ——
      // 位置弹簧残存的亚像素收敛（posEps=0.005px）不再有任何可见意义。
      // 慢光栅环境（headless 软渲染/录屏，rAF 可低至 ~7fps，物理时间每帧仅
      // 钳制推进 0.25s）下该收敛尾部可拖长数秒，造成「不可见 Actor 常驻 DOM +
      // 渲染循环空转」。故 scale 锁零即视觉终态，直接回收（E2E C 场景实证）。
      const actorVisuallyGone = actor.scaleSpring.x <= 0.0001;
      // v11.48 #247：租约期满兜底 —— 弹簧永不收敛（rAF 异常单帧抛出后本帧仍活着、
      // 引擎被外部改参、iframe 回调把时间戳拉飞等）的 Actor 到期强制回收，
      // 判定与看门狗共用同一阈值（window-actor-lease-core.js），双通道恒一致
      const leaseGone = leaseExpired(actor.bornAt, now);
      if ((actor.scaleSpring.isSettled() && (actor.posSpring.isSettled() || actorVisuallyGone)) || leaseGone) {
        // v7.17：统一经 disposeActorElements 回收（先营救活实例回 page-stack 续命，
        // 再移除内容/阴影/高光三层 DOM）
        disposeActorElements(actor);
        if (actor.iconEl) {
          // v7.11.1：静默恢复（非旧版 pop 弹跳）—— 此刻图标可能仍被新窗口/其他
          // 在途 Actor 遮挡，零动画恢复无任何可见变化；即便完全裸露（直视关闭），
          // 图标也只是"直接就位"，与 iOS 真实行为一致，无弹跳闪现
          popHomeIcon(actor.iconEl, { silent: true });
        }
        closingActors.splice(idx, 1);
      }
    }

    // 5.5 子页面返回弹簧收敛 → 真正弹出导航栈
    // （物理到位后才交接，取代 setTimeout 硬切，返回动画与推入完全对称、零跳变）
    if (state.popInProgress && !state.isDragging && state.subpageSpring.isSettled()) {
      state.popInProgress = false;
      if (state.navHistory.length > 1) {
        state.navHistory.pop();
        renderPageStack();
      }
    }

    // 6. 稳定判定：主窗口 + 全部 Actor + 放射场全部归位才停循环
    const mainIdle = !state.isOpen && !state.isClosing;
    const mainSettled = mainIdle || (
      state.scaleSpring.isSettled() &&
      state.posSpring.isSettled() &&
      state.subpageSpring.isSettled()
    );
    const radialIdle = radialField.items.length === 0 || radialField.isIdle;

    if (mainSettled && closingActors.length === 0 && radialIdle) {
      // v7.50 落定终值吸附：主循环 settle 后直接停机，三根弹簧的收敛阈值内残差
      // （subpage ~0.5% → 二级页边缘 2px 露底缝）不写终值就永久留在表面。
      // 停机前精确吸附到目标 + 补一次终帧渲染，rest 态严格归位。
      // 拖拽期不吸附不补帧（弹簧由手势手动跟踪，渲染走手势自己的通道）。
      if (!state.isDragging) {
        [state.posSpring, state.scaleSpring, state.subpageSpring].forEach((s) => {
          if (typeof s.isSettled !== 'function' || !s.isSettled()) return;
          if (s.x && typeof s.x === 'object') {
            // Spring2D（posSpring）：双轴分别吸附（.x/.y 为内部一维弹簧）
            s.x.x = s.x.target; s.x.v = 0;
            s.y.x = s.y.target; s.y.v = 0;
          } else {
            s.x = s.target;
            s.v = 0;
          }
        });
        renderSubPages(true);
      }
      launchWatchdog.settle(); // #225 正常收敛：取消兜底，兜底只兜异常路径
      disarmIframeLoadRelease();
      finishAnim();
      return;
    }

    state.rafId = requestAnimationFrame(frame);
  }

  state.rafId = requestAnimationFrame(frame);
}
