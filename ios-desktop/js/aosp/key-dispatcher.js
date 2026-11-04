// ==================== key-dispatcher.js — 系统组合键路由（#111） ====================
//
// AOSP 同构（frameworks/base/services/core/java/com/android/server/policy/PhoneWindowManager.java
// 组合键拦截语义 + AccessibilityShortcutController）：
//   · 组合键（chord）= 键集合精确匹配 + 最短保持时长；首键 down 启动、余键 down 凑齐；
//     保持满 holdMs 触发；任一键提前释放 → 取消；凑齐前混入集合外键 → 破坏取消
//   · KEYCODE_SYSRQ（电源+音量下截图）网页等价：Ctrl+Shift+S 齐按（铁律#2 超越边界标注）；
//   · 无障碍快捷键 = 音量上+下同时长按 3s（AccessibilityShortcutController.triggerAccessibilityShortcut）
//   · 长按电源 = GlobalActionsDialog 电源菜单（>0.5s），短按电源 = sleep/lock
//
// 纯逻辑纪律：零 DOM、零 window、零 setTimeout（时序注入 now；接线层负责 poll 定时），
// 键名为抽象字符串（keyboard 'volume-up' / 指针 'power' 等任意源统一路由）。

/** AOSP PhoneWindowManager 长按电源进入 GlobalActionsDialog 的窗（0.5s） */
export const POWER_LONG_PRESS_MS = 500;
/** AccessibilityShortcutController 音量双键长按窗（3s） */
export const ACCESSIBILITY_CHORD_HOLD_MS = 3000;

/**
 * 组合键路由器。
 * @param {object} opts
 * @param {Array<{id:string, keys:string[], holdMs:number}>} opts.chords 键集精确匹配的 chord 表
 * @param {()=>number} [opts.now] 时钟注入（测试确定性；默认 Date.now）
 * @param {(chord: {id:string}) => void} [opts.onTrigger] 触发回调（先于 feed 返回值消费）
 */
export function createKeyDispatcher({ chords, now, onTrigger } = {}) {
  if (!Array.isArray(chords) || chords.length === 0) {
    throw new RangeError('chords required');
  }
  for (const c of chords) {
    if (!c || typeof c.id !== 'string' || !Array.isArray(c.keys) || c.keys.length === 0) {
      throw new RangeError(`bad chord: ${JSON.stringify(c)}`);
    }
    if (!Number.isFinite(c.holdMs) || c.holdMs < 0) {
      throw new RangeError(`bad holdMs on chord ${c.id}`);
    }
  }
  const clock = typeof now === 'function' ? now : Date.now;
  // 键集归一（排序串行化，匹配顺序无关）
  const norm = (keys) => [...keys].sort().join('\u0000');
  const chordBySig = new Map(chords.map((c) => [norm(c.keys), c]));

  /** 当前按住键集（字符串 → true） */
  const pressed = new Map();
  /** 已凑齐的 chord（签名 → armedAt） */
  const armed = new Map();

  const reset = () => {
    pressed.clear();
    armed.clear();
  };

  /**
   * 惰性超时判定：armed 满 holdMs → 触发（onTrigger + 返回结果）。
   * 接线层在 feed 之外可用 setTimeout(checkDue, holdMs) 精确 poll。
   */
  function checkDue() {
    const t = clock();
    for (const [sig, armedAt] of armed) {
      const chord = chordBySig.get(sig);
      if (t - armedAt >= chord.holdMs) {
        armed.delete(sig);
        if (typeof onTrigger === 'function') onTrigger(chord);
        return { action: 'trigger', chordId: chord.id };
      }
    }
    return { action: 'none' };
  }

  /**
   * 事件流入口。
   * @param {'down'|'up'|'repeat'} type
   * @param {string} key
   * @returns {{action:'none'|'trigger'|'cancel', chordId?:string}}
   */
  function feed(type, key) {
    if (typeof key !== 'string' || key.length === 0) return { action: 'none' };
    const t = clock();

    if (type === 'repeat') {
      // AOSP：repeat 事件不重置组合键计时（首 down 已定窗），仅保持
      return { action: 'none' };
    }

    if (type === 'up') {
      if (!pressed.has(key)) return { action: 'none' };
      pressed.delete(key);
      // armed 状态下任一成员释放 → 取消（AOSP：chord 进行中释放即弃）
      let cancelled = null;
      for (const sig of armed.keys()) {
        const chord = chordBySig.get(sig);
        if (chord.keys.includes(key)) {
          armed.delete(sig);
          cancelled = chord.id;
        }
      }
      if (cancelled) return { action: 'cancel', chordId: cancelled };
      return { action: 'none' };
    }

    // type === 'down'
    pressed.set(key, t);
    // 混入任何 chord 集合外键 → 破坏所有进行中的 chord（严格精确匹配语义）
    for (const [sig] of armed) {
      const chord = chordBySig.get(sig);
      if (!chord.keys.includes(key)) {
        armed.delete(sig);
        // 新键不属于该 chord → chord 破坏
      }
    }
    // 重新评估：当前 pressed 是否恰好凑齐某 chord（集合相等）
    const curSig = norm(pressed.keys());
    const chord = chordBySig.get(curSig);
    if (chord && !armed.has(curSig)) {
      armed.set(curSig, t);
    }
    // holdMs=0（齐按即触发，如 KEYCODE_SYSRQ 等价）→ 立即判定
    const due = checkDue();
    if (due.action === 'trigger') return due;
    return { action: 'none' };
  }

  return {
    feed,
    checkDue,
    reset,
    /** 测试/调试探针 */
    __state: () => ({
      pressed: [...pressed.keys()],
      armed: [...armed.keys()],
    }),
  };
}

/**
 * 键名归一（接线层用）：KeyboardEvent.key → dispatcher 抽象键名。
 *   音量键 Chrome='AudioVolumeUp' / Windows 旧='VolumeUp' → 'volume-up'；
 *   修饰键 'Ctrl'→'control'（KeyboardEvent.key 为 'Control'）
 * @param {string} key
 * @returns {string}
 */
export function normalizeKeyName(key) {
  switch (key) {
    case 'AudioVolumeUp':
    case 'VolumeUp':
      return 'volume-up';
    case 'AudioVolumeDown':
    case 'VolumeDown':
      return 'volume-down';
    case 'Control':
      return 'control';
    case 'Shift':
      return 'shift';
    case 'Alt':
      return 'alt';
    default:
      return key.toLowerCase();
  }
}
