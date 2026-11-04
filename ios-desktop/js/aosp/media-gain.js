// ==================== media-gain.js — 媒体元素 GainNode 音量链（#116 iOS P0 地基） ====================
//
// #115/#116 裁决落地：网页双层级音量的 Layer2（应用内增益）地基。
// HTMLAudioElement.volume 在 iOS Safari 上只读恒 1（Apple 官方文档实证，#116 引言），
// 写入被静默忽略 —— md3 音量唯一实现路径 audio.volume 在 iOS 上等于白写（P0）。
// 合法绕行路径 = Web Audio GainNode（#116 修复方向引文）：
//   createMediaElementSource(el) → createGain() → destination，gain.gain.value 真生效。
//
// 三条铁律（全部防御，缺一即回归/静音事故）：
//   R1 createMediaElementSource(el) 对同一元素只能调用一次（二次调用抛
//      InvalidStateError）→ 元素级一次性门控，调用方幂等；建链失败回落直连。
//   R2 接管后元素输出只走 AudioContext 图，跨域且无 CORS 的媒体经图输出为静音
//      （HTML spec CORS taint）→ 同源门控 isSameOriginMediaSource：仅 blob:/data:/
//      about:/同源 http(s) 允许接管；跨域源保持直连（桌面 audio.volume 路径零回归）。
//   R3 AudioContext 须在用户手势中创建/恢复（自动播放策略）→ 接管时机锚定首次
//      play()（手势衍生链路），复用 sound-haptics 共享单例（#117 全量收编方向第一步，
//      避免 iOS 多 AudioContext 实例的额外开销与限制）。
//
// 与 audio.volume 的关系（防双层衰减）：接管后元素 volume 中性化恒 1，增益值由
// GainNode 独立承载 —— 元素 0.6 × 增益 0.6 = 0.36 的双写衰减是本链路最大回归坑。
// 未接管（跨域会话/无 WebAudio）时 audio.volume 直写路径原样保留，桌面零变化。
//
// 纯逻辑层：零 DOM 零 window 依赖，ctx/el 以参数注入（vitest 与生产同构真跑）。

/**
 * R2 同源媒体源判定（接管门控真源）。
 * - blob:  → true（同源派生，VFS 本地导入主路径）
 * - data:  → true（内联数据，无跨域取回面）
 * - about: → true（空页同源语义）
 * - 绝对/相对 http(s)：能解析且 origin 与参照 origin 一致 → true
 * - 协议相对（//host/...）/ opaque origin / 空值 / 非字符串 / 解析失败 → false
 *   （保守拒绝：宁可直连走 audio.volume，不可让跨域源进图输出静音）
 * @param {string} src 媒体源 URL
 * @param {string} [origin] 参照 origin（location.origin；缺省时仅 blob:/data:/about: 可信）
 * @returns {boolean}
 */
export function isSameOriginMediaSource(src, origin) {
  if (typeof src !== 'string' || !src) return false;
  if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('about:')) return true;
  if (src.startsWith('//')) return false;
  if (typeof origin !== 'string' || !origin) return false;
  try {
    const u = new URL(src, origin);
    if (u.origin === 'null') return false;
    return u.origin === origin;
  } catch (e) { return false; }
}

/**
 * GainNode 音量值解析（gain.gain 线性值域 0~1）。
 * NaN/Infinity → 0（失效即静音，绝不放大）；超界钳位。
 * @param {number} v
 * @returns {number}
 */
export function resolveGainVolume(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * 建链（R1 一次性 + R2 同源由调用方门控）：el → source → gain(初值 1) → destination。
 * 任何异常（二次接管 InvalidStateError / API 缺失）返回 null，调用方回落直连路径。
 * @param {BaseAudioContext} ctx
 * @param {HTMLMediaElement} el
 * @returns {{source: MediaElementAudioSourceNode, gain: GainNode}|null}
 */
export function createGainChain(ctx, el) {
  if (!ctx || !el) return null;
  if (typeof ctx.createMediaElementSource !== 'function' || typeof ctx.createGain !== 'function') return null;
  try {
    const source = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    gain.gain.value = 1;
    source.connect(gain);
    gain.connect(ctx.destination);
    return { source, gain };
  } catch (e) { return null; }
}

/**
 * R3 挂起恢复（自动播放策略；非手势调用点静默失败，不抛错）。
 * @param {AudioContext} ctx
 */
export function resumeIfSuspended(ctx) {
  try {
    if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      const p = ctx.resume();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  } catch (e) { /* 引擎差异忽略 */ }
}

/**
 * 接管态切曲跳过（R2 的运行期配套）：接管后外链曲目（归一化失败的不可达源）不可装载，
 * 切曲从 from 起按 dir 方向找最近合格曲目；整池无合格 → -1（调用方停止语义：暂停归位）。
 * 环绕语义与 md3 既有 next/prev 的模长循环一致（AOSP 播放队列顺序播放同构）。
 * @param {Array<{src:string}>} playlist
 * @param {number} from 起始索引（调用方已知其不合格；本函数只找其它位）
 * @param {number} dir 方向（>=0 顺序 / <0 逆序）
 * @param {(t:{src:string})=>boolean} isEligibleFn
 * @returns {number} 最近合格索引；无 → -1
 */
export function nextPlayableIndex(playlist, from, dir, isEligibleFn) {
  const n = Array.isArray(playlist) ? playlist.length : 0;
  if (!n || typeof isEligibleFn !== 'function') return -1;
  const d = (dir | 0) >= 0 ? 1 : -1;
  for (let step = 1; step <= n; step++) {
    const i = (((from + d * step) % n) + n) % n;
    if (isEligibleFn(playlist[i])) return i;
  }
  return -1;
}
