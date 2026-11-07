// ==================== aosp/watchface-generator.js — AI 生成锁屏表盘参数化生成核（#101 · v10.38） ====================
//
// 权威源与边界（诚实标注）：
//   - 对标面：#21 素材③（9to5Google 2026-08-06）Google AI 生成锁屏时钟——参数空间
//     正交维度 + 生成按钮 + 逐维度锁定/重掷（用户对生成结果的控制感）。Google 侧
//     生成模型为服务端 AI（无公开权威源码）——本模块为 **Web 域参数化生成器**：
//     带种子伪随机（可复现）+ 可用性护栏约束（#101 §网页实现路径 2 逐条落地），
//     非真 AI 模型（诚实标注，页面注记同源）；
//   - 与 #20 关系（议题规格）：生成结果落到 #20 表盘注册表第 5 脸 'custom'（单一
//     状态源，LOCK_CLOCK_FACE_KEY 体系零新增状态源）；配置本体落本模块
//     ios-desktop:watchface-gen-v1（生成参数域与表盘选择域分离——两键各管各域）；
//   - Monet 协同（#33）：色相维度 = var(--md-h) hue 偏移派生（wellbeing ringColor
//     #96 同款零裸色纪律，随主题切换联动）。
//
// 纯逻辑纪律：核函数零 DOM / 零 window / 零 Date.now / 零 Math.random（时基与随机
// 全注入——seed 显式传参可复现，store 层 reroll 才消费 Math.random）；持久化落点
// createWatchfaceGenStore 工厂（storage 注入隔离单测，createUsageStore #96 同款范式）。

/** 生成配置存储键（生成参数域真源；表盘选择域 = clock-faces LOCK_CLOCK_FACE_KEY 分离） */
export const WATCHFACE_GEN_KEY = 'ios-desktop:watchface-gen-v1';
/** schema 版本 */
export const WATCHFACE_GEN_SCHEMA_VERSION = 1;

/**
 * 正交维度注册表（#101 §1 参数空间；顺序 = 面板 chip 顺序）。
 * 每维度：key / label（用户可见名）/ options（取值域，首项 = 缺省）。
 */
export const GEN_DIMENSIONS = Object.freeze([
  Object.freeze({ key: 'layout', label: '布局', options: Object.freeze(['stacked', 'inline', 'offset']) }),
  Object.freeze({ key: 'weight', label: '字重', options: Object.freeze([300, 500, 700, 900]) }),
  Object.freeze({ key: 'tracking', label: '字距', options: Object.freeze(['tight', 'normal', 'wide']) }),
  Object.freeze({ key: 'hueShift', label: '色相', options: Object.freeze([0, 30, 180, 210, 300]) }),
  Object.freeze({ key: 'decor', label: '装饰', options: Object.freeze(['none', 'outline', 'glow', 'gradient']) }),
]);

/** 生成配置缺省形态（seed 0 = 确定性缺省脸；opts.customConfig 缺席时的兜底真源） */
export const GEN_DEFAULT_CONFIG = Object.freeze({
  seed: 0,
  layout: 'stacked',
  weight: 700,
  tracking: 'normal',
  hueShift: 0,
  decor: 'none',
});

/** mulberry32 带种子伪随机（32 位 PRNG，可复现——同 seed 同序列，确定性测试基座） */
export function mulberry32(seed) {
  let a = Number(seed) >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 可用性护栏（#101 §2「约束即护栏」——固定顺序确定性修正，修正项在录）：
 *   C1 outline（描边）+ weight < 500 → weight 提至 500（细字描边不可读，对比度下限）；
 *   C2 glow（光晕）+ tracking 'tight' → tracking 放宽 'normal'（字形重叠不可读）；
 *   C3 gradient + layout 'offset' → layout 回 'stacked'（渐变裁切在偏移布局下破碎）。
 * 修正只放宽生成值不触碰锁定值语义（锁定值由 generateFaceConfig 保留后再过护栏——
 * 用户显式锁定组合时护栏仍生效：可读性下限优先于锁定意图，注记在录）。
 */
export const GEN_CONSTRAINTS = Object.freeze(['outline-needs-weight-500', 'glow-needs-not-tight', 'gradient-needs-not-offset']);

/** 配置护栏清洗（纯函数，固定顺序 C1→C2→C3，返回 { config, fixes } 修正账供 UI/测试断言） */
export function sanitizeConfig(cfg) {
  const c = { ...cfg };
  const fixes = [];
  if (c.decor === 'outline' && Number(c.weight) < 500) { c.weight = 500; fixes.push(GEN_CONSTRAINTS[0]); }
  if (c.decor === 'glow' && c.tracking === 'tight') { c.tracking = 'normal'; fixes.push(GEN_CONSTRAINTS[1]); }
  if (c.decor === 'gradient' && c.layout === 'offset') { c.layout = 'stacked'; fixes.push(GEN_CONSTRAINTS[2]); }
  return { config: c, fixes };
}

/**
 * 生成（纯函数，确定性）：seed + locked（{dim: value} 部分锁定）→ 新配置。
 * 未锁定维度按维度注册表顺序消费 PRNG（取值均匀离散）；锁定维度保留用户值。
 * 同 seed 同 locked 同输出（可复现——分享/回归基座）。
 * @param {number} seed 任意非负整数（store 层 reroll 注入新种子）
 * @param {object} locked 维度 → 值（部分锁定；垃圾键/越界值忽略）
 */
export function generateFaceConfig(seed, locked) {
  const s = Number(seed);
  const baseSeed = Number.isFinite(s) && s >= 0 ? Math.floor(s) : 0;
  const rnd = mulberry32(baseSeed);
  const lock = locked && typeof locked === 'object' && !Array.isArray(locked) ? locked : {};
  const cfg = { seed: baseSeed };
  for (const dim of GEN_DIMENSIONS) {
    const lv = lock[dim.key];
    const valid = dim.options.indexOf(lv) !== -1 ? lv : null;
    if (valid !== null) {
      cfg[dim.key] = valid;
    } else {
      const idx = Math.floor(rnd() * dim.options.length) % dim.options.length;
      cfg[dim.key] = dim.options[idx];
    }
  }
  const { config } = sanitizeConfig(cfg);
  return config;
}

/**
 * 生成脸样式片段（纯字符串构建——buildFaceHTML custom 分支消费面）：
 * 字重/字距/色相（hsl(calc(var(--md-h,215) + shift)) Monet 派生零裸色）/装饰三层。
 */
export function buildCustomFaceStyle(cfg) {
  const c = cfg && typeof cfg === 'object' ? cfg : GEN_DEFAULT_CONFIG;
  const weight = [300, 500, 700, 900].indexOf(Number(c.weight)) !== -1 ? Number(c.weight) : 700;
  const tracking = c.tracking === 'tight' ? '-0.02em' : c.tracking === 'wide' ? '0.08em' : 'normal';
  const hue = [0, 30, 180, 210, 300].indexOf(Number(c.hueShift)) !== -1 ? Number(c.hueShift) : 0;
  let style = `font-weight:${weight};letter-spacing:${tracking};`;
  if (c.decor === 'outline') {
    style += `color:transparent;-webkit-text-stroke:1.5px hsl(calc(var(--md-h,215) + ${hue}) 70% 65%);`;
  } else if (c.decor === 'glow') {
    style += `color:hsl(calc(var(--md-h,215) + ${hue}) 70% 70%);text-shadow:0 0 12px hsl(calc(var(--md-h,215) + ${hue}) 85% 60% / 0.55);`;
  } else if (c.decor === 'gradient') {
    style += `background:linear-gradient(180deg,hsl(calc(var(--md-h,215) + ${hue}) 70% 72%),hsl(calc(var(--md-h,215) + ${hue}) 70% 45%));-webkit-background-clip:text;background-clip:text;color:transparent;`;
  } else {
    style += `color:hsl(calc(var(--md-h,215) + ${hue}) 70% 70%);`;
  }
  return style;
}

/**
 * 生成脸 HTML（clock-faces.buildFaceHTML custom 分支委托面——face 消费协议与
 * 既有四脸同构：small 单行 / large 按 layout 三态；时间文本 = 数字 HH:MM 域）。
 */
export function buildCustomFaceHTML(cfg, opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  const d = o.date instanceof Date ? o.date : new Date(0, 0, 0, 10, 8);
  const c = cfg && typeof cfg === 'object' ? cfg : GEN_DEFAULT_CONFIG;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const style = buildCustomFaceStyle(c);
  const fs = o.fontStack ? `font-family:${o.fontStack};` : '';
  if (o.size === 'large') {
    if (c.layout === 'stacked') {
      return `<span data-test="watchface-custom" style="display:flex;flex-direction:column;align-items:center;line-height:1.02;${fs}"><span style="${style}font-size:64px;font-variant-numeric:tabular-nums;">${hh}</span><span style="${style}font-size:64px;font-variant-numeric:tabular-nums;">${mm}</span></span>`;
    }
    if (c.layout === 'offset') {
      return `<span data-test="watchface-custom" style="display:block;transform:translateX(18px);${fs}"><span style="${style}font-size:64px;font-variant-numeric:tabular-nums;">${hh}:${mm}</span></span>`;
    }
    return `<span data-test="watchface-custom" style="display:block;${fs}"><span style="${style}font-size:64px;font-variant-numeric:tabular-nums;">${hh}:${mm}</span></span>`;
  }
  return `<span data-test="watchface-custom" style="display:inline-block;${fs}"><span style="${style}font-size:34px;font-variant-numeric:tabular-nums;">${hh}:${mm}</span></span>`;
}

/** 维度标签反查（面板 chip 渲染消费：值 → 用户可见名） */
export function dimensionValueLabel(key, value) {
  const dim = GEN_DIMENSIONS.find((d) => d.key === key);
  if (!dim) return String(value);
  if (key === 'weight') return `字重 ${value}`;
  if (key === 'hueShift') return `色相 +${value}°`;
  if (key === 'layout') return { stacked: '双行堆叠', inline: '单行', offset: '居中偏移' }[value] || String(value);
  if (key === 'tracking') return { tight: '紧凑', normal: '常规', wide: '宽松' }[value] || String(value);
  if (key === 'decor') return { none: '无装饰', outline: '描边', glow: '光晕', gradient: '渐变' }[value] || String(value);
  return String(value);
}

/** 状态归一（parse/内部双用）：config 逐维钳制（越界回落缺省）+ locks 仅保留合法键值对 */
export function normalizeGenState(raw) {
  let o = raw;
  if (typeof o === 'string') {
    try { o = JSON.parse(o); } catch (e) { return { version: WATCHFACE_GEN_SCHEMA_VERSION, config: { ...GEN_DEFAULT_CONFIG }, locks: {} }; }
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) {
    return { version: WATCHFACE_GEN_SCHEMA_VERSION, config: { ...GEN_DEFAULT_CONFIG }, locks: {} };
  }
  const def = { ...GEN_DEFAULT_CONFIG };
  const srcCfg = o.config && typeof o.config === 'object' && !Array.isArray(o.config) ? o.config : {};
  const cfg = { ...def, seed: Number.isFinite(Number(srcCfg.seed)) && Number(srcCfg.seed) >= 0 ? Math.floor(Number(srcCfg.seed)) : 0 };
  for (const dim of GEN_DIMENSIONS) {
    if (dim.options.indexOf(srcCfg[dim.key]) !== -1) cfg[dim.key] = srcCfg[dim.key];
  }
  const { config } = sanitizeConfig(cfg);
  const locks = {};
  const srcLocks = o.locks && typeof o.locks === 'object' && !Array.isArray(o.locks) ? o.locks : {};
  for (const dim of GEN_DIMENSIONS) {
    if (dim.options.indexOf(srcLocks[dim.key]) !== -1) locks[dim.key] = srcLocks[dim.key];
  }
  return { version: WATCHFACE_GEN_SCHEMA_VERSION, config, locks };
}

/** 持久化 codec —— 序列化（先归一再落盘） */
export function serializeGenState(state) {
  return JSON.stringify(normalizeGenState(state));
}

/**
 * 生成器 store 工厂（storage 注入隔离单测）：
 * config/locks 单一真源 + reroll（未锁定维度重掷——Math.random 仅在 store 层消费）。
 */
export function createWatchfaceGenStore({ storage } = {}) {
  const st = storage || (typeof localStorage !== 'undefined' ? localStorage : undefined);
  let state = { version: WATCHFACE_GEN_SCHEMA_VERSION, config: { ...GEN_DEFAULT_CONFIG }, locks: {} };
  try {
    const raw = st && st.getItem(WATCHFACE_GEN_KEY);
    if (raw) state = normalizeGenState(JSON.parse(raw));
  } catch (e) { /* 损坏存档走默认 */ }
  function persist() {
    try { st && st.setItem(WATCHFACE_GEN_KEY, serializeGenState(state)); } catch (e) { /* 忽略 */ }
  }
  function commit(next) {
    state = normalizeGenState(next);
    persist();
    return state;
  }
  return {
    getState() { return state; },
    persist,
    /** 当前生成配置（快照副本） */
    getConfig() { return { ...state.config }; },
    /** 当前锁定表（快照副本） */
    getLocks() { return { ...state.locks }; },
    /** 切换维度锁定：on=true 锁定为当前值 / false 解锁 */
    toggleLock(dimKey, on) {
      const dim = GEN_DIMENSIONS.find((d) => d.key === dimKey);
      if (!dim) return state;
      const locks = { ...state.locks };
      if (on) locks[dimKey] = state.config[dimKey];
      else delete locks[dimKey];
      return commit({ ...state, locks });
    },
    /** 重掷（新 seed 随机注入；锁定维度保留，未锁定维度重掷；护栏照常生效） */
    reroll() {
      const seed = Math.floor(Math.random() * 0x7fffffff);
      return commit({ ...state, config: generateFaceConfig(seed, state.locks) });
    },
    /** 直调面（e2e/测试确定性注入——seed 显式，零随机） */
    generateWithSeed(seed) {
      return commit({ ...state, config: generateFaceConfig(seed, state.locks) });
    },
  };
}

/** 单例（theme-engine 生成面板 / clock-faces custom 脸消费同一持久化真源） */
export const watchfaceGenStore = createWatchfaceGenStore();
