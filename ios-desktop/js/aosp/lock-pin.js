// ==================== lock-pin.js — 锁屏 PIN 纯逻辑核 + 存储单例（v10.63 #210） ====================
//
// 桥聚合：#185 核为纯叶子零依赖（零 import），此处静态 import 三能力聚合 window 桥——
// 设置页内联脚本零 import 消费（v10.63 __lockClockFaces.setFace 桥同款）。
import { hashPassword, verifyPassword, assessPassword } from './weak-password-heuristics.js';
//
// #185 消费面第一站（#210 立题规格 §3）：weak-password-heuristics.js 双能力
//（assessPassword 只警告不阻断 / hashPassword·verifyPassword PBKDF2-SHA256 加盐哈希）
// 的锁屏 PIN 消费核。#185 核内自述消费方向「未来锁屏 PIN 面」逐字兑现。
//
// AOSP 对标（#210 §3.3）：
//   - 真机 PIN 走 LockPatternUtils + Gatekeeper/TEE（硬件-backed）——网页无 TEE，
//     硬件绑定/防暴力擦除为超越项放弃（#185 §归属三条承袭，诚实标注「防随手翻看」非真安全边界）；
//   - 防暴力节流 Gatekeeper Web 近似：连续失败 5 次 → 30 秒冷却。
//     FAILED_ATTEMPTS_BEFORE_TIMEOUT=5 / FAILED_ATTEMPT_TIMEOUT_MS=30000 为 AOSP
//     LockPatternUtils 经验常量——本轮 keyguard 源拉取 404 不可达（v8.31 PermissionController
//     镜像 404 先例同律），标注经验值非本轮实拉（#170 查不到标注纪律）；
//   - PIN 最小长度 4：AOSP LockPatternUtils.MIN_LOCK_PASSWORD_SIZE 经验常量，同上标注。
//   - 冷却到期后计数保留、下次失败即刻再触发（每次失败均刷新冷却窗）；成功解锁清零。
//     AOSP 真机为 Gatekeeper 硬件递增超时（5→30s→5min→15min→…），Web 近似取常量档首档
//     30s——递增档留点（非本轮范围，标注于 #210 交付报告）。

/** PIN 最小长度（AOSP LockPatternUtils.MIN_LOCK_PASSWORD_SIZE 经验常量，见头注） */
export const PIN_MIN_LENGTH = 4;
/** PIN 最大输入长度（输入框 maxlength 工程值，防超长串拖慢派生；经验值标注） */
export const PIN_MAX_LENGTH = 16;
/** 连续失败阈值（AOSP FAILED_ATTEMPTS_BEFORE_TIMEOUT 经验常量，见头注） */
export const FAILED_ATTEMPTS_BEFORE_TIMEOUT = 5;
/** 冷却时长 ms（AOSP FAILED_ATTEMPT_TIMEOUT_MS 经验常量，见头注） */
export const FAILED_ATTEMPT_TIMEOUT_MS = 30000;

/** PIN 存档状态键集（冻结：normalize/codec/测试三方共用） */
export const PIN_STATE_FIELDS = Object.freeze(['hashHex', 'saltHex', 'iterations', 'failedAttempts', 'lastFailAt']);

/** PIN 候选校验（纯函数）：4–16 位纯数字（AOSP PIN 类型仅数字域——字母数字属 password 类型，
 *  md3 键盘为数字键盘 3×4，不对齐 password 形态，诚实标注）。返回 {ok, reason}，只校验不哈希 */
export function validatePinCandidate(pw) {
  const s = String(pw == null ? '' : pw);
  if (s.length === 0) return { ok: false, reason: 'PIN 不能为空' };
  if (!/^\d+$/.test(s)) return { ok: false, reason: 'PIN 仅支持数字' };
  if (s.length < PIN_MIN_LENGTH) return { ok: false, reason: `PIN 至少 ${PIN_MIN_LENGTH} 位` };
  if (s.length > PIN_MAX_LENGTH) return { ok: false, reason: `PIN 至多 ${PIN_MAX_LENGTH} 位` };
  return { ok: true, reason: '' };
}

/** 节流判定（纯函数）：failedAttempts >= 5 且 now - lastFailAt < 30000 → 冷却中。
 *  垃圾输入兜底：非有限数按 0 处理（normalize 全量兜底纪律同款） */
export function shouldThrottle(failedAttempts, lastFailAt, now) {
  const fa = Number.isFinite(failedAttempts) ? failedAttempts : 0;
  const lf = Number.isFinite(lastFailAt) ? lastFailAt : 0;
  const nw = Number.isFinite(now) ? now : 0;
  const elapsed = nw - lf;
  if (fa < FAILED_ATTEMPTS_BEFORE_TIMEOUT || elapsed < 0) return { throttled: false, remainingMs: 0 };
  const remaining = FAILED_ATTEMPT_TIMEOUT_MS - elapsed;
  if (remaining <= 0) return { throttled: false, remainingMs: 0 };
  return { throttled: true, remainingMs: remaining };
}

/** hex 串校验（分域：hashHex = SHA-256 256bit = 64 hex；saltHex = #185 核 16B 盐 = 32 hex。
 *  存档形态防御——垃圾不入库；v10.63 R111 实录坑：首版误用 64 位域校验盐 → saltHex
 *  全被判垃圾丢弃 → verify 恒 false，e2e Q5/Q7 两红定位） */
function isHex64(s) {
  return typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);
}
function isHex32(s) {
  return typeof s === 'string' && /^[0-9a-f]{32}$/.test(s);
}

/** 状态 normalize（全量兜底：垃圾/缺字段/越界逐项回落——app-usage normalize 同律）：
 *  - hashHex：非 64 位 hex → ''；saltHex：非 32 位 hex（16B 盐域，#185 generateSalt 形态）→ ''
 *    （空 = 未设 PIN）
 *  - iterations：非有限正数 → PBKDF2_ITERATIONS（#185 核 100000）
 *  - failedAttempts：0–9999 钳制；lastFailAt：非有限 → 0 */
export function normalizePinState(raw) {
  const r = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  let iterations = Number(r.iterations);
  if (!Number.isFinite(iterations) || iterations <= 0) iterations = 100000;
  iterations = Math.min(Math.max(Math.round(iterations), 1000), 10000000);
  let failed = Number(r.failedAttempts);
  if (!Number.isFinite(failed) || failed < 0) failed = 0;
  failed = Math.min(Math.round(failed), 9999);
  let lastFailAt = Number(r.lastFailAt);
  if (!Number.isFinite(lastFailAt) || lastFailAt < 0) lastFailAt = 0;
  return {
    hashHex: isHex64(r.hashHex) ? r.hashHex : '',
    saltHex: isHex32(r.saltHex) ? r.saltHex : '',
    iterations,
    failedAttempts: failed,
    lastFailAt,
  };
}

/** 存档解析（storage 读出 → normalize；垃圾档回落默认——损坏存档不崩） */
export function parsePinState(text) {
  if (!text) return normalizePinState(null);
  try { return normalizePinState(JSON.parse(text)); } catch (e) { return normalizePinState(null); }
}

/** 存档序列化（字段序稳定 = PIN_STATE_FIELDS，快照可比对） */
export function serializePinState(st) {
  const n = normalizePinState(st);
  return JSON.stringify({
    hashHex: n.hashHex, saltHex: n.saltHex, iterations: n.iterations,
    failedAttempts: n.failedAttempts, lastFailAt: n.lastFailAt,
  });
}

/** 注入工厂（storage 可注入——createWellbeingStore/createUsageStore #96 同款范式）：
 *  setPin/clearPin/recordFail/recordSuccess 写后即持久化；snapshot 返回深拷贝防外部 mutation */
export function createLockPinStore(storage) {
  const KEY = 'ios-desktop:lock-pin-v1';
  const read = () => parsePinState((() => { try { return storage.getItem(KEY); } catch (e) { return null; } })());
  const write = (st) => { try { storage.setItem(KEY, serializePinState(st)); } catch (e) { /* 配额/隐私模式写失败静默——内存态仍有效 */ } };

  let state = read();

  const snap = () => ({ ...state });
  const has = () => !!state.hashHex;

  /** 设 PIN（哈希产物入库——hashPassword 在消费方 await 后传入；失败计数不清零：
   *  改 PIN 不应顺便洗掉防暴力计数，成功解锁才清零） */
  function setPin(hashHex, saltHex, iterations) {
    state = normalizePinState({
      hashHex, saltHex,
      iterations: iterations ?? state.iterations,
      failedAttempts: state.failedAttempts, lastFailAt: state.lastFailAt,
    });
    write(state);
    return snap();
  }

  /** 清除 PIN（全字段复位——未设态） */
  function clearPin() {
    state = normalizePinState(null);
    write(state);
    return snap();
  }

  /** 失败沿：failedAttempts+1 + lastFailAt=now → 落库；返回判定链结果（throttle 用同一 now） */
  function recordFail(now) {
    const ts = Number.isFinite(now) ? now : Date.now();
    state = normalizePinState({ ...state, failedAttempts: state.failedAttempts + 1, lastFailAt: ts });
    write(state);
    const th = shouldThrottle(state.failedAttempts, state.lastFailAt, ts);
    return { failedAttempts: state.failedAttempts, throttled: th.throttled, remainingMs: th.remainingMs };
  }

  /** 成功沿：计数清零（AOSP LockSettingsService 成功验证重置 failed attempt 同语义） */
  function recordSuccess() {
    state = normalizePinState({ ...state, failedAttempts: 0, lastFailAt: 0 });
    write(state);
    return snap();
  }

  /** 节流观测（零副作用）：给定 now（默认 Date.now）判定当前是否冷却中 */
  function throttleInfo(now) {
    return shouldThrottle(state.failedAttempts, state.lastFailAt, Number.isFinite(now) ? now : Date.now());
  }

  return { snapshot: snap, has, setPin, clearPin, recordFail, recordSuccess, throttleInfo };
}

/** 单例真源（localStorage 键 ios-desktop:lock-pin-v1；SSR/node 无 window 时懒回落——
 *  vitest node 环境走 storage 注入测试，不触碰单例导入面） */
let lockPinStoreSingleton = null;
export function lockPinStore() {
  if (lockPinStoreSingleton) return lockPinStoreSingleton;
  const g = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : undefined;
  if (!g) throw new Error('lockPinStore singleton requires window.localStorage');
  lockPinStoreSingleton = createLockPinStore(g);
  return lockPinStoreSingleton;
}

/** window 桥安装（设置页内联脚本零 import 消费面——v10.63 __lockClockFaces.setFace 桥同款）：
 *  暴露 store + 哈希/校验/评估三能力；幂等守卫（重复调用零覆盖）。
 *  注意：store 单例要求 window.localStorage——无 window 环境（node 测试）传 target={} 或不调 */
export function installLockPinBridge(target) {
  const w = target || (typeof window !== 'undefined' ? window : undefined);
  if (!w || w.__lockPin) return w && w.__lockPin;
  w.__lockPin = {
    store: lockPinStore(),
    hashPassword, verifyPassword, assessPassword, validatePinCandidate,
  };
  return w.__lockPin;
}
