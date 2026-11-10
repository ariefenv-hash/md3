// ==================== cdn-health.js — CDN 源健康检查纯逻辑核（v11.06 #302） ====================
//
// #302（[P2][兼容][实测] jsDelivr gh 代理对本仓全局 403——所有 jsDelivr@main 回退通道需
// 体检与降级策略）落地：fetch 链逐源失败记忆（拉黑）与会话级跳过。
//
// 通道波动实证（本卡决定性实验，2026-11-09 00:15Z 复测）：
//   - cdn.jsdelivr.net/gh/ariefenv-hash/md3@main/... catalog.json → 2026-11-08 实测 403
//     （#298/#302 在案）→ 2026-11-09 连续 3 次 200、载荷有效（version/apps/externals）。
//     「通道可用性会变」(#18 §7.1②) 成立 —— 403 ≠ 资源不存在，波动本身就是健康检查必要性的
//     最强论据：拉黑必须会话级（sessionStorage），不得永久化。
//   - cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js → 200（python-core #31 通道健康，不动）
//   - cdn.jsdelivr.net/npm/tesseract.js@* → 200（OCR vendor 兜底通道健康，v852「恰两处兜底」
//     锚面不动）
//   - raw.githubusercontent.com/ariefenv-hash/md3/main/... → 本沙箱实测 000 不可达，
//     不作为修复方向（不得以更差通道替换）。
//
// 设计（#302 处置建议 2 的等价更优实现，理由在册）：
//   议题原文「CDN 源 HEAD 探测失败即拉黑本次会话」——落地为「实际 fetch 的失败结果即拉黑」：
//   ① 零额外请求（不做 HEAD 预探测的 HEAD+GET 双发；首跳即真请求，失败信息同等可信）；
//   ② 同源首选命中时 CDN 位零接触（#298 链序翻转已保证），拉黑只影响后续
//     loadCatalog/「重试」按钮的链过滤 —— 消除重复撞墙的超时延迟与控制台噪音（#302 痛点原话）；
//   ③ 复活通道：成功即清黑名单；链全被拉黑时 filterChainByHealth 破黑返回原链（保「重试」
//     永不失效的逃生门语义 —— 用户显式重试 = 表达「环境可能变了」，不得静默吞掉）。
//
// 边界裁决：
//   - **只拉黑跨域 CDN 源（绝对 http(s) 地址）**；同源相对地址（catalog.json）永不拉黑/过滤
//     —— 同源文件受 SW cacheFirst 管辖（pkg-catalog ②口径在册），SW 缓存命中不产生网络
//     失败；真失败属环境级（离线/未部署），跳过它反而弱化本地真源语义。
//   - 纯逻辑核纪律（pkg-catalog 同款）：零依赖零 DOM 零 import；存储经注入
//     （默认惰性取 sessionStorage，隐私模式/SW 环境 try/catch 降级为内存 Map，数据不跨页续命
//     但「本会话拉黑」主语义在内存兜底下退化为「本页拉黑」，诚实取舍）。
//
// 消费面：js/apps/appstore.js fetchChainJson（v11.06 接线）——链经 filterChainByHealth 过滤，
//   失败源 blockSource(HTTP 状态/网络错误)、成功源 reviveSource；黑名单判据与 #298 命中位
//   判据同款（与 CDN_CATALOG_URL 同串比对，不猜域名）。

/** sessionStorage 键前缀（ios-desktop: 命名空间与 #283 键名族同域） */
export const CDN_HEALTH_KEY_PREFIX = 'ios-desktop:cdn-health:';
/** 拉黑条目 TTL 上限：24h。sessionStorage 本身随会话关闭清空，此上限仅防「常驻标签页跨日悬挂」；
 *  通道波动实证（403↔200 交替）决定拉黑不得长于一个工作日，重探成本远低于误杀可用通道。 */
export const CDN_HEALTH_TTL_MS = 24 * 60 * 60 * 1000;
/** 拉黑理由长度上限（防异常长错误串进存储） */
export const CDN_HEALTH_REASON_MAX = 120;

// ---------- 存储层（注入式；默认惰性 sessionStorage + 内存兜底） ----------

const memStore = new Map();

/** 取默认存储：sessionStorage 可用则用之（会话级语义满血），否则内存 Map 兜底 */
function defaultStore() {
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage && typeof sessionStorage.getItem === 'function') {
      return sessionStorage;
    }
  } catch (e) { /* 隐私模式 / SW 环境：访问即抛 → 内存兜底 */ }
  return memStore;
}

/** 规约源串：非串 / 空串 → null（防 undefined 进键名） */
function normSource(source) {
  return (typeof source === 'string' && source.length > 0 && source.length <= 1024) ? source : null;
}

/** 判定源是否「跨域 CDN 源」（绝对 http(s) 地址）——拉黑/过滤只作用于这一类 */
export function isRemoteSource(source) {
  if (typeof source !== 'string') return false;
  return /^https?:\/\//i.test(source);
}

/** 黑名单键（与源一一映射；键内嵌源，读侧无需反查表） */
export function blacklistKey(source) {
  return CDN_HEALTH_KEY_PREFIX + source;
}

/**
 * 源是否在黑名单内（TTL 未过期）。过期条目惰性清除（顺手，不单独 GC 轮）。
 * @param {string} source 源 URL
 * @param {number} [now] 当前时间戳（默认 Date.now()；测试注入）
 * @param {Storage|Map} [store] 存储注入（默认 sessionStorage/内存兜底）
 */
export function isSourceBlocked(source, now, store) {
  const s = normSource(source);
  if (!s) return false;
  const st = store || defaultStore();
  const t = (typeof now === 'number' && isFinite(now)) ? now : Date.now();
  let raw = null;
  try { raw = st.getItem(blacklistKey(s)); } catch (e) { return false; }
  if (!raw) return false;
  let entry = null;
  try { entry = JSON.parse(raw); } catch (e) {
    try { st.removeItem(blacklistKey(s)); } catch (e2) { /* 坏条目顺手清 */ }
    return false;
  }
  if (!entry || typeof entry !== 'object' || typeof entry.at !== 'number') {
    try { st.removeItem(blacklistKey(s)); } catch (e2) { /* 坏条目顺手清 */ }
    return false;
  }
  if (t - entry.at >= CDN_HEALTH_TTL_MS) {
    try { st.removeItem(blacklistKey(s)); } catch (e2) { /* 过期顺手清 */ }
    return false;
  }
  return true;
}

/**
 * 拉黑源（写条目 {reason, at}）。重复拉黑覆盖旧条目（刷新 at 延长 TTL —— 连续失败
 * 证明通道仍死，累计会话内压制合理）。
 * @param {string} source 源 URL（仅跨域源生效；同源相对地址拒绝 —— 边界裁决在册）
 * @param {string} [reason] 失败理由（'HTTP 403' / 网络错误串，超限截断）
 * @param {number} [now] 时间戳注入
 * @param {Storage|Map} [store] 存储注入
 * @returns {boolean} 是否实际写入（同源源 / 非法源返回 false）
 */
export function blockSource(source, reason, now, store) {
  const s = normSource(source);
  if (!s || !isRemoteSource(s)) return false;
  const st = store || defaultStore();
  const t = (typeof now === 'number' && isFinite(now)) ? now : Date.now();
  const r = (typeof reason === 'string' && reason) ? reason.slice(0, CDN_HEALTH_REASON_MAX) : 'unspecified';
  const entry = JSON.stringify({ reason: r, at: t });
  try { st.setItem(blacklistKey(s), entry); } catch (e) { return false; }
  return true;
}

/** 复活源（清黑名单条目）。成功命中即调 —— 通道波动实证下，恢复优先于记忆。 */
export function reviveSource(source, store) {
  const s = normSource(source);
  if (!s) return false;
  const st = store || defaultStore();
  try { st.removeItem(blacklistKey(s)); } catch (e) { return false; }
  return true;
}

/**
 * 按健康黑名单过滤 fetch 链（纯过滤，无网络）。
 * - 同源相对地址（isRemoteSource=false）永保留（边界裁决：SW cacheFirst 管辖）；
 * - 跨域源黑名单内 → 过滤；
 * - **全滤空 → 破黑返回原链**（逃生门：全拉黑说明环境曾整体不可达，用户重试 =
 *   显式复活信号，静默吞掉会让「重试」按钮永远离线）。破黑同时清全部 CDN 黑名单条目
 *   （reviveAll 语义：重试即全量重探，与逃生门配套）。
 * @param {string[]} chain 有序候选链（catalogFetchChain() 输出）
 * @param {object} [opts] { now, store }
 * @returns {{chain: string[], skipped: string[]}} 过滤后链 + 本轮跳过清单（消费侧可记 console）
 */
export function filterChainByHealth(chain, opts) {
  const list = Array.isArray(chain) ? chain : [];
  const o = opts || {};
  const t = (typeof o.now === 'number' && isFinite(o.now)) ? o.now : Date.now();
  const st = o.store || defaultStore();
  const kept = [];
  const skipped = [];
  for (let i = 0; i < list.length; i++) {
    const url = list[i];
    if (!isRemoteSource(url) || !isSourceBlocked(url, t, st)) kept.push(url);
    else skipped.push(url);
  }
  if (kept.length === 0 && list.length > 0) {
    // 破黑：清全部跨域黑名单条目后返回原链
    for (let i = 0; i < list.length; i++) {
      if (isRemoteSource(list[i])) reviveSource(list[i], st);
    }
    return { chain: list.slice(), skipped: skipped.slice() };
  }
  return { chain: kept, skipped };
}
