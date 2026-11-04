/**
 * global-actions.js — 电源菜单 GlobalActionsDialog A17 形态对齐·纯逻辑层（零 DOM）。
 *
 * AOSP 锚点（android-17，packages/SystemUI/src/com/android/systemui/globalactions/）：
 * - GlobalActionsDialog.java：动作集注册（mItems = power / restart / emergency / lockdown /
 *   screenshot…按 config_globalActionsList 装配）；mKeyguardShowing 分支（EmergencyAction 常显）。
 * - GlobalActionsColumnLayout.java（A12+）：侧边竖向卡片列形态（非居中大菜单）。
 * - 议题 #113 三项要求：①动作集补「锁定 Lockdown」；②点击动作 → 二次确认卡（ShutDownConfirm
 *   语义）而非立即执行；③关机/重启区分——旧实现（quick-settings.js shutdown 分支）直接替换
 *   document.body.innerHTML 且无重启自恢复路径，属结构性背离。
 *
 * 裁剪与超越项标注：
 * - 截图（screenshot）：AOSP 默认 config_globalActionsList 不含，md3 #94 Markup 未落地，
 *   判定表支持但输入占位 false（诚实标注，#94 出口落地后接线）。
 * - 多用户切换：md3 无多用户体系（#97 未做），不入表。
 * - Lockdown 语义：AOSP Lockdown 是「立即锁定并要求凭据解锁」；md3 锁屏无凭据体系
 *   （#185 查证裁决在录），执行等价 = lockNow() 立即锁屏，判定表仍按 AOSP keyguard
 *   showing 语义处理（已锁屏态 lockdown 隐藏——语义冗余）。
 */

/** A17 GlobalActionsDialog 动作 id 字面量（同源命名）。 */
export const GA_ACTION_IDS = Object.freeze({
  POWER_OFF: 'power',
  RESTART: 'restart',
  LOCKDOWN: 'lockdown',
  EMERGENCY: 'emergency',
  SCREENSHOT: 'screenshot',
});

/**
 * 动作注册表（AOSP config_globalActionsList 语义：每项 {id, confirm}）。
 * confirm = 该动作触发前是否进入二次确认卡（议题 #113 要求关机/重启过确认卡；
 * emergency/lockdown 单击即执行与 AOSP 一致——紧急场景零摩擦、lockdown 本身即安全动作）。
 */
export const GA_ACTIONS = Object.freeze([
  { id: GA_ACTION_IDS.POWER_OFF, label: '关机', danger: true, confirm: true },
  { id: GA_ACTION_IDS.RESTART, label: '重启', danger: false, confirm: true },
  { id: GA_ACTION_IDS.LOCKDOWN, label: '锁定', danger: false, confirm: false },
  { id: GA_ACTION_IDS.EMERGENCY, label: '紧急求救', danger: false, confirm: false },
  { id: GA_ACTION_IDS.SCREENSHOT, label: '截图', danger: false, confirm: false },
]);

/** 关机/重启二次确认卡文案（ShutDownConfirm 语义）。 */
export const GA_CONFIRM_TEXT = Object.freeze({
  [GA_ACTION_IDS.POWER_OFF]: {
    title: '关机确认',
    body: '手机将关机。重新开机需点击屏幕唤醒。',
    confirmLabel: '关机',
  },
  [GA_ACTION_IDS.RESTART]: {
    title: '重启确认',
    body: '手机将自动重启。',
    confirmLabel: '重启',
  },
});

/**
 * 动作可见性判定（GlobalActionsDialog.mKeyguardShowing 分支同构）。
 * @param {object} input
 * @param {boolean} input.locked  当前是否锁屏态（md3：lock-screen active）
 * @param {boolean} [input.screenshotAvailable=false]  截图动作是否已接线（#94 未落地=false 占位）
 * @returns {Array<{id,label,danger,confirm}>} 过滤后的动作表（保持注册表顺序）
 *
 * 规则（逐项锚定）：
 * - emergency：keyguard showing 时仍显示（EmergencyAction 常显——紧急求救不受锁定限制）。
 * - lockdown：locked=true 时隐藏（已在锁屏态，lockdown 语义冗余——AOSP 锁屏态下
 *   LockdownController 不重复入列）。
 * - screenshot：仅 screenshotAvailable=true 时入列（部分配置语义，AOSP 默认不含）。
 * - power/restart：恒显（AOSP keyguard showing 时依旧可关机——PowerManagerService
 *   shutdownOrReboot 不要求解锁）。
 */
export function resolveVisibleActions(input) {
  const { locked = false, screenshotAvailable = false } = input || {};
  return GA_ACTIONS.filter((a) => {
    if (a.id === GA_ACTION_IDS.LOCKDOWN && locked) return false;
    if (a.id === GA_ACTION_IDS.SCREENSHOT && !screenshotAvailable) return false;
    return true;
  });
}

/**
 * 二次确认状态机（ShutDownConfirm 语义，纯逻辑可注入测试）。
 * 状态：idle → pending(actionId) → confirmed(actionId)（终态，消费方执行）
 *                              └→ cancelled（回 idle）。
 * @param {object} [opts] { now } 可注入时钟（预留）。
 */
export function createConfirmMachine(opts = {}) {
  let state = { phase: 'idle', actionId: null };
  return {
    /** 发起确认请求；重复请求覆盖前一个 pending。 */
    request(actionId) {
      if (!GA_CONFIRM_TEXT[actionId]) {
        return { ok: false, reason: 'no_confirm_text', actionId };
      }
      state = { phase: 'pending', actionId };
      return { ok: true, text: GA_CONFIRM_TEXT[actionId] };
    },
    /** 确认当前 pending。 */
    confirm() {
      if (state.phase !== 'pending') return { ok: false, reason: 'not_pending' };
      const actionId = state.actionId;
      state = { phase: 'idle', actionId: null };
      return { ok: true, actionId };
    },
    /** 取消当前 pending。 */
    cancel() {
      if (state.phase !== 'pending') return { ok: false, reason: 'not_pending' };
      state = { phase: 'idle', actionId: null };
      return { ok: true };
    },
    /** 当前 pending 的确认卡文案（UI 渲染直读）。 */
    pendingText() {
      return state.phase === 'pending' ? GA_CONFIRM_TEXT[state.actionId] : null;
    },
    /** 快照（测试/调试）。 */
    __state() {
      return { ...state };
    },
  };
}

/**
 * 关机/重启阶段机（对应 AOSP ShutdownThread 起始阶段 + md3 关机态页语义）。
 * - shutdown：fading（渐黑动画窗）→ off（关机态黑屏页，停留等待用户点击=开机）
 * - restart：fading → rebooting（黑屏短暂停留后由消费方 location.reload() 自恢复）
 * @param {object} opts
 * @param {number} [opts.fadeMs=600]  渐黑时长（旧实现 0.6s 保留）
 * @param {number} [opts.rebootHoldMs=800]  重启黑屏停留（给视觉一个「已断电再启」节拍）
 * @param {(ms:number)=>Promise} [opts.setTimeoutFn]  可注入定时（默认 window.setTimeout 包装）
 */
export function createShutdownStage(opts = {}) {
  const fadeMs = opts.fadeMs ?? 600;
  const rebootHoldMs = opts.rebootHoldMs ?? 800;
  const delay = (ms) =>
    new Promise((res) => {
      if (typeof opts.setTimeoutFn === 'function') opts.setTimeoutFn(res, ms);
      else setTimeout(res, ms);
    });
  let phase = 'idle';
  return {
    /** 当前阶段（idle/fading/off/rebooting）。 */
    get phase() {
      return phase;
    },
    /**
     * 推进到目标终态。
     * @param {'shutdown'|'restart'} kind
     * @returns {Promise<{phase:'off'|'rebooting', fadeMs:number, rebootHoldMs:number}>}
     */
    async advance(kind) {
      if (phase !== 'idle') return { phase, fadeMs, rebootHoldMs };
      phase = 'fading';
      await delay(fadeMs);
      phase = kind === 'restart' ? 'rebooting' : 'off';
      if (phase === 'rebooting') await delay(rebootHoldMs);
      return { phase, fadeMs, rebootHoldMs };
    },
    /** 重置（重启后页面 unload 前无需；测试用）。 */
    __reset() {
      phase = 'idle';
    },
  };
}

/** haptic 时长常量（唤出/确认两档；#36 触感基建 navigator.vibrate 直调惯例）。 */
export const GA_HAPTIC_MS = Object.freeze({ open: 10, confirm: 20 });
