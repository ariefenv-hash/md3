// ==================== app-window-transitions.js — #284 批23（v11.49）：过渡引擎同步 单源 ====================
// 簇体自 app-window.js 逐字节迁出（boundary-map §3.4 表首行 · #75 §四.3：切换预设 = 切换引擎，
// 调用方无感）。
// 唯一语义差异 = syncMainEngineKind 加 export 前缀（宿主 import 回接）。
// 宿主消费点零改动：startLoop 真实过渡起点双路（wantTimed=true/false）+ __animPresets.apply
// 定时轴热切换路 —— 三调用点文本不变；tests/anim-native.test.js 源码锚断言宿主调用串，
// 调用点留宿主即锚不破。
// 依赖面：state（主窗口弹簧组）/ getTransitionRunner+curOpenParams+Timed2D+TimedValue
// （animation-presets.js）/ Spring+Spring2D（spring.js）—— 纯编排逻辑零 DOM。
import { state } from './state.js';
import { curOpenParams, getTransitionRunner, Timed2D, TimedValue } from './animation-presets.js';
import { Spring, Spring2D } from './spring.js';

// ==================== 过渡引擎同步（#75 §四.3：切换预设 = 切换引擎，调用方无感） ====================
//
// 主窗口 posSpring/scaleSpring 在每次真实过渡起点（startLoop(params) params 非空）按
// 当前预设整体换引擎：bouncy=Spring/Spring2D（弹簧积分）、native=Timed2D/TimedValue
// （时长+插值器，AOSP 打断协议内置）。切换保 x/v/target —— 中途反转/承接从真实在途
// 位姿连续接管，零瞬移。subpageSpring 不参与（子页导航恒弹簧，非本议题范围）。
//
// 判别用 __timedEngine 标记而非 instanceof（跨 Realm/测试环境更稳）。

/** 把主窗口弹簧组切换到指定引擎（保 x/v/target，双向零跳变） */
export function syncMainEngineKind(wantTimed) {
  const isTimed = !!(state.scaleSpring && state.scaleSpring.__timedEngine);
  if (wantTimed === isTimed) return;
  if (wantTimed) {
    // 弹簧 → 定时轴：以当前 x/v/target 为初值接管（AOSP 打断协议在 TimedValue 内生效）
    const runner = getTransitionRunner(state.scaleSpring && state.scaleSpring.target >= 0.5 ? 'open' : 'close');
    state.posSpring = Timed2D.fromLegacy(state.posSpring, runner.posDesc);
    state.scaleSpring = TimedValue.fromLegacy(state.scaleSpring, runner.scaleDesc);
  } else {
    // 定时轴 → 弹簧：以当前 x/v 为初值条件重启解析解（速度连续，切换零跳变）
    const o = curOpenParams();
    const pos = state.posSpring;
    const s2d = new Spring2D(o, pos.px, pos.py, pos.vx, pos.vy);
    s2d.x.target = pos.x.target;
    s2d.y.target = pos.y.target;
    state.posSpring = s2d;
    const sc = state.scaleSpring;
    const sp = new Spring({ ...o, initialValue: sc.x, initialVelocity: sc.v });
    sp.target = sc.target;
    state.scaleSpring = sp;
  }
}
