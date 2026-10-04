// ==================== focus.js — 番茄钟专注模式（批次四 · 大功能） ====================
//
// 设计（与 profiles 场景快照、notifications 通知链、quick-settings 磁贴体系打通）：
//   - 快速设置新增「Focus」磁贴：点击开启 25 分钟专注 → 5 分钟休息的循环；再次点击随时退出。
//   - 专注期自动开启勿扰（DND），休息期自动恢复 —— 经 setDndActive 单一真源，
//     与 profiles 场景快照 / 手动勿扰磁贴互不打架（后写者生效，快照恢复时同样走这里）。
//   - 阶段切换经 addSystemNotification 走系统通知链（进通知中心 + Heads-up 横幅；
//     专注期 DND 会抑制横幅但保留通知中心记录，休息期 DND 已自动关闭、横幅可见）。
//   - 磁贴副标题实时倒计时（syncTileState 轻量 DOM patch，每秒一次）。
//   - 会话态仅存内存：页面刷新即停止（专注是会话级体验，不做跨会话持久化，
//     避免刷新后残留一个「看不见的勿扰」——退出路径永远可见可控）。

import { setDndActive, syncTileState, showSystemToast } from './quick-settings.js';
import { addSystemNotification } from './notifications.js';
import { ICONS } from './icons.js';
import { playSfx } from './sound-haptics.js';

/** 专注 / 休息时长（分钟） */
const FOCUS_MIN = 25;
const BREAK_MIN = 5;

/** 当前阶段：'focus' | 'break' | null（null = 未开启） */
let phase = null;
/** 当前阶段剩余秒数 */
let remain = 0;
/** 当前阶段截止墙钟时间戳（fix(audit-B)：后台节流补偿的基准，见 tick） */
let deadline = 0;
/** 秒级计时器句柄 */
let timer = null;
/** 已完成的完整专注轮数 */
let cycles = 0;
/** 进入专注前的勿扰状态快照（fix(audit-B)：stop 只恢复不覆写用户手动开启的勿扰） */
let dndBeforeFocus = false;

function fmt(s) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return (m < 10 ? '0' + m : m) + ':' + (r < 10 ? '0' + r : r);
}

function tileSub() {
  if (phase === 'focus') return '专注 ' + fmt(remain);
  if (phase === 'break') return '休息 ' + fmt(remain);
  return '番茄钟 · 专注';
}

/** 系统通知（进通知中心；DND 时横幅被抑制但记录保留） */
function notify(title, desc) {
  try {
    addSystemNotification({
      id: 'focus-' + Date.now(),
      app: '番茄钟',
      appId: 'focus',
      iconSvg: ICONS.focus_mode,
      title: String(title || ''),
      desc: String(desc || ''),
      time: '刚刚', // fix(audit-B): 补 time 字段，通知中心/横幅不再渲染出 "undefined"
    });
  } catch (e) {}
}

function setPhase(next) {
  phase = next;
  remain = (next === 'focus' ? FOCUS_MIN : BREAK_MIN) * 60;
  deadline = Date.now() + remain * 1000; // fix(audit-B): 记录墙钟截止，tick 按差值计算剩余
  syncTileState('focus', { active: true, sub: tileSub() });
}

function advance() {
  if (phase === 'focus') {
    cycles++;
    // 休息期自动解除勿扰：横幅可见、消息可达
    setDndActive(false, { silent: true });
    setPhase('break');
    playSfx('notify');
    notify('专注完成，休息一下', '已完成 ' + cycles + ' 轮专注 · 休息 ' + BREAK_MIN + ' 分钟');
  } else {
    // 下一轮专注开始：自动进入勿扰
    setDndActive(true, { silent: true });
    setPhase('focus');
    playSfx('notify');
    notify('休息结束，继续专注', '第 ' + (cycles + 1) + ' 轮 · ' + FOCUS_MIN + ' 分钟');
  }
}

function tick() {
  // fix(audit-B): 墙钟补偿 —— 后台标签页 setInterval 被节流至 ≥1 次/分钟，
  // 裸计数会让 25 分钟专注被拉长数十倍；改为按 deadline 与 Date.now() 的
  // 差值计算剩余，节流/恢复后每次 tick 都与真实时间对齐。
  remain = Math.max(0, Math.round((deadline - Date.now()) / 1000));
  if (remain <= 0) { advance(); return; }
  syncTileState('focus', { sub: tileSub() });
}

function start() {
  if (phase) stop(false);
  cycles = 0;
  // fix(audit-B): 快照进入专注前的勿扰状态（重入 start 时 stop(false) 已恢复前值，快照链闭合）
  dndBeforeFocus = document.body.classList.contains('dnd-mode-active');
  setDndActive(true, { silent: true }); // 专注开始 = 自动勿扰
  setPhase('focus');
  if (timer) clearInterval(timer);
  timer = setInterval(tick, 1000);
  showSystemToast('专注开始：' + FOCUS_MIN + ' 分钟（已自动开启勿扰）', ICONS.focus_mode);
  notify('专注模式已开启', FOCUS_MIN + ' 分钟专注 · ' + BREAK_MIN + ' 分钟休息');
}

function stop(byUser) {
  if (timer) { clearInterval(timer); timer = null; }
  const done = cycles;
  phase = null; remain = 0; deadline = 0;
  // fix(audit-B): 只恢复到专注前的勿扰状态 —— 用户专注前手动开启的勿扰
  // 不再被退出专注强制关闭（与文件头“后写者生效”约定一致）
  setDndActive(dndBeforeFocus, { silent: true });
  dndBeforeFocus = false;
  syncTileState('focus', { active: false, sub: '番茄钟 · 专注' });
  if (byUser) showSystemToast(done ? ('专注已结束，本轮共完成 ' + done + ' 轮') : '专注已结束', ICONS.focus_mode);
}

/** 初始化：注册 window.__focus 供 quick-settings 磁贴与其它系统模块调用 */
export function initFocus() {
  window.__focus = {
    /** 磁贴点击回调（tile.active 已由磁贴流程翻转） */
    onTileToggle: (active) => { if (active) start(); else stop(true); },
    isActive: () => !!phase,
    phase: () => phase,
    remaining: () => remain,
    cycles: () => cycles,
    /** 系统级主动停止（如恢复出厂、场景切换等） */
    stop: () => stop(false),
  };
}
