// ==================== chooser-rank.js — AOSP Chooser 排序/直享/密度/折叠 纯逻辑层（#200） ====================
//
// 1:1 移植自 AOSP aosp-mirror/platform_frameworks_base main
// core/java/com/android/internal/app/ChooserActivity.java（4217 行实拉）：
//   · 直享目标（Direct Share）：ChooserTarget 进缓存双表 mDirectShareAppTargetCache /
//     mDirectShareShortcutInfoCache（L225-226）——web 落地：注册表 + 分享历史即缓存（单一真源在录）
//   · 评分排序：byScore = (a, b) => -Float.compare(a.getScore(), b.getScore())（L2240-2242）
//   · A-Z 兜底池：AzInfoComparator 两级比较器——Collator.getInstance(locale) 按 displayLabel，
//     再按 userHandle（L2442-2452）；"are from the alphabetical pool" 与评分池分离（L1931）
//   · 每行密度：mMaxTargetsPerRow = getInteger(R.integer.config_chooser_max_targets_per_row)
//     （L700 / L1084 双装配点，AOSP 默认 4）
//   · 折叠/展开：直享区 4→8 动态扩行（L719 "expand/shrink direct share 4 -> 8 viewgroup"）；
//     「最少目标数才扩」护栏（L3636 "Only expand direct share area if there is a minimum
//     number of targets"）；handleScroll 滚动智能扩行——"only expand if we have more than
//   maxTargetsPerRow, and delay that decision"（L3841-3850 延迟决策）
//   · 拷贝路径：onCopyButtonClicked 带 action 白名单校验——ACTION_SEND/SEND_MULTIPLE 之外
//   Log.w("Action (...) not supported for copying to clipboard") 直接 return（L1015-1046）
//
// md3 落地裁决（在录）：
//   · 直享目标真源 = 分享完成历史（ShortcutManager dynamic shortcuts 的 ranking 本质同构：
//     系统维护的使用捷径按最近使用排序）——recordShareCompletion 落档，directHits 按
//     最近使用时间戳降序产出；md3 的「注册表 curated 顺序」等价 AOSP AppTarget ranking
//     的系统预置语义，故 A-Z 兜底池 comparator 在库在测（供未来目标规模超出 curated
//     语义时启用），本版接线消费 history-ranking 而非硬 A-Z 化（避免常用目标降位）
//   · copy action 校验：md3 单载荷语义等价 ACTION_SEND（payload.action 缺省视为
//     ACTION_SEND，白名单拒绝路径为未来多载荷扩展点）
//   · 滚动扩行延迟决策：card 滚动一次后直享区从折叠 4 扩至 8（L3841-3850 同构）
//
// 本模块零 DOM（storage 经参数注入），供 share-registry.js / share-sheet.js 与
// tests/v200-chooser-rank.test.js 直接驱动。

/** 每行密度常量（config_chooser_max_targets_per_row AOSP 默认 4） */
export const CONFIG_CHOOSER_MAX_TARGETS_PER_ROW = 4;

/** 直享区折叠态展示数（L719 折叠 4）/ 展开态上限（L719 4 → 8） */
export const DIRECT_SHARE_COLLAPSED_COUNT = 4;
export const DIRECT_SHARE_EXPANDED_COUNT = 8;

/** 分享历史持久化键（与项目 localStorage 命名风格一致） */
export const DIRECT_SHARE_HISTORY_KEY = 'ios-desktop:chooser-direct-share-history';

/** 历史封顶（防无限增长；AOSP ShortcutManager dynamic shortcuts 上限同量级） */
export const DIRECT_SHARE_HISTORY_MAX = 20;

/** copy 动作白名单（onCopyButtonClicked L1015-1046：白名单之外直接 return） */
export const COPY_ALLOWED_ACTIONS = Object.freeze(['ACTION_SEND', 'ACTION_SEND_MULTIPLE']);

/**
//   评分降序比较器（byScore 同构：-Float.compare(a.score, b.score)）。
//   同分保持输入顺序（Array.prototype.sort 稳定排序语义）。
 */
export function byScore(a, b) {
  const sa = typeof a.score === 'number' ? a.score : 0;
  const sb = typeof b.score === 'number' ? b.score : 0;
  return sb - sa;
}

/**
//   AzInfoComparator 两级比较器同构：Collator 按 displayLabel，再按 userHandle。
//   web 落地：label localeCompare（sensitivity base ≈ Collator 默认强度），
//   第二键以 id 代 userHandle（md3 单用户域，稳定排序用）。
 */
export function azCompare(a, b) {
  const la = String(a.label || '');
  const lb = String(b.label || '');
  const c = la.localeCompare(lb, undefined, { sensitivity: 'base' });
  if (c !== 0) return c;
  return String(a.id || '').localeCompare(String(b.id || ''), undefined, { sensitivity: 'base' });
}

/**
//   直享区展开护栏（L3636 "Only expand direct share area if there is a minimum number
//   of targets" 同构）：直享目标数不超过折叠数时无展开意义。
//   @param {number} directCount 直享目标总数
//   @param {number} [collapsed] 折叠态展示数（缺省 DIRECT_SHARE_COLLAPSED_COUNT）
//   @returns {boolean} 是否允许展开
 */
export function shouldExpandDirectShare(directCount, collapsed) {
  const c = typeof collapsed === 'number' ? collapsed : DIRECT_SHARE_COLLAPSED_COUNT;
  return directCount > c;
}

/**
//   直享区展示数裁决（折叠 4 / 展开 8，L719 同构）。
//   @param {number} directCount 直享目标总数
//   @param {boolean} expanded 当前是否展开态
 */
export function directShareVisibleCount(directCount, expanded) {
  const cap = expanded ? DIRECT_SHARE_EXPANDED_COUNT : DIRECT_SHARE_COLLAPSED_COUNT;
  return Math.max(0, Math.min(directCount, cap));
}

/**
//   copy 动作白名单校验（onCopyButtonClicked L1015-1046 同构）：
//   ACTION_SEND / ACTION_SEND_MULTIPLE 之外拒绝（md3 单载荷缺省视为 ACTION_SEND）。
 */
export function isCopyAllowed(action) {
  const a = action == null || action === '' ? 'ACTION_SEND' : String(action);
  return COPY_ALLOWED_ACTIONS.includes(a);
}

/**
//   双池排序总入口（评分池与 alphabetical pool 分离，L1931 同构）。
//   @param {Array<{id:string,label:string}>} baseTargets 注册表过滤后的全部可用目标
//   （顺序 = 注册表 curated 序，等价 AOSP AppTarget ranking 系统预置）
//   @param {Array<string>} directIds 直享命中目标 id 序列（最近使用降序，历史真源）
//   @returns {{direct: Array, rest: Array}} direct = 直享池（按 directIds 顺序回排 base
//   目标，剔除不在 base 中的失效命中）；rest = 其余目标（保持 curated 序）
 */
export function rankChooserTargets(baseTargets, directIds) {
  const base = Array.isArray(baseTargets) ? baseTargets : [];
  const ids = Array.isArray(directIds) ? directIds : [];
  const byId = new Map(base.map((t) => [t.id, t]));
  const direct = [];
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) continue;
    const t = byId.get(id);
    if (t) { direct.push(t); seen.add(id); }
  }
  const rest = base.filter((t) => !seen.has(t.id));
  return { direct, rest };
}

/**
//   分享完成历史（Direct Share 直享缓存真源：ShortcutManager dynamic shortcuts 同构）。
//   @param {Storage|null} storage localStorage 注入（隐私模式静默降级）
//   @returns {{record: Function, directHits: Function, clear: Function}}
//   record(targetId, now) 记录一次分享完成（去重更新时间戳、封顶 DIRECT_SHARE_HISTORY_MAX）
//   directHits() 直享命中 id 序列（最近使用时间戳降序）
//   clear() 清空历史
 */
export function createShareHistory(storage) {
  const load = () => {
    try {
      const raw = storage && storage.getItem(DIRECT_SHARE_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((e) => e && typeof e.id === 'string' && typeof e.at === 'number');
    } catch (e) { return []; }
  };
  const save = (list) => {
    try { storage && storage.setItem(DIRECT_SHARE_HISTORY_KEY, JSON.stringify(list)); } catch (e) { /* 忽略 */ }
  };
  return {
    /** 记录一次分享完成（同目标去重更新时间戳；封顶裁最旧） */
    record(targetId, now) {
      if (!targetId) return;
      const at = typeof now === 'number' ? now : Date.now();
      const list = load().filter((e) => e.id !== targetId);
      list.push({ id: String(targetId), at });
      list.sort((a, b) => b.at - a.at);
      save(list.slice(0, DIRECT_SHARE_HISTORY_MAX));
    },
    /** 直享命中 id 序列（最近使用时间戳降序——byScore 的 recency 实例化） */
    directHits() {
      return load().sort((a, b) => b.at - a.at).map((e) => e.id);
    },
    clear() { try { storage && storage.removeItem(DIRECT_SHARE_HISTORY_KEY); } catch (e) { /* 忽略 */ } },
  };
}
