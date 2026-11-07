// ==================== pkg-catalog.js — 应用目录纯逻辑核（v10.30 #183 一期） ====================
//
// #183 一期（用户裁决 2026-11-01：开工在线目录，静态 JSON + CDN，零自建服务）：
// 市场目录的归一 / 校验 / 降级判定纯逻辑层 —— 零依赖零 DOM 零 import（#147 判据同款零环）。
// 消费面：js/apps/appstore.js 市场外壳（页面脚本 fetch 后喂入本核归一，失败降级只显已装）。
//
// 裁决字段 verbatim（#183 裁决帖 2026-11-01）：
//   id / name / version / packageId / icon / downloadUrl / size / permissions / description
//
// 降级纪律（裁决硬要求）：目录任何异常（网络失败 / 载荷损坏 / 归一后零可用条目）
//   → 市场只显示「已装」列表 + 「目录暂不可达」文案，零白屏零报错。
//   本核只做纯判定（degraded/issues），fetch 与 UI 兜底在 appstore 页面脚本层。
//
// 诚实标注（一期范围）：
//   ① catalog.json 一期 = 仓库内同源文件（demo/hello-world.mdapp 真实可装全链），
//     jsdelivr CDN 拉取与外部项目条目属 #172 二期（评估帖既定分期）。
//   ② 目录不做本地持久化缓存（裁决降级语义 = 回退已装列表，非回退陈旧目录）；
//     SW cacheFirst 对 catalog.json 的缓存即一期口径的「最近目录」，更新随构建版本走。
//   ③ 校验是展示层防错（污染输入不崩 UI），不是安全边界 —— 真实信任边界在
//     安装链 analyzeZipBlob（pkg-manifest safePkgPath / isValidManifestId），
//     目录 downloadUrl 的 scheme 白名单只是第一道浅筛。

// ---------- 常量（全部冻结；字段上限为展示层防错经验值，非 AOSP 对标项 —— #183 属超越项无权威源） ----------

/** 单目录最大条目数：防异常超大载荷拖死渲染（超出截断并记 issue） */
export const CATALOG_MAX_ENTRIES = 200;
/** 应用 id 上限（与 pkg-manifest.isValidManifestId 同域量级） */
export const ENTRY_ID_MAX = 64;
/** 展示名上限 */
export const ENTRY_NAME_MAX = 64;
/** 版本串上限 */
export const ENTRY_VERSION_MAX = 32;
/** 包名（反向域）上限 */
export const ENTRY_PKGID_MAX = 96;
/** 简介上限 */
export const ENTRY_DESC_MAX = 500;
/** 下载地址上限 */
export const ENTRY_URL_MAX = 512;
/** 权限声明条数上限（与 permissions.js 五类白名单量级对齐，宽容未来扩展） */
export const PERMS_MAX = 32;
/** 单权限键上限 */
export const PERM_KEY_MAX = 32;
/** 一期目录同源地址（appstore 页面脚本 fetch 入参；二期切 CDN 常量只改此处） */
export const CATALOG_URL = 'catalog.json';

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/i;
const ABS_URL_RE = /^https?:\/\//i;
const BLOCKED_URL_RE = /^(javascript|data|vbscript|blob|file):/i;
const DATA_ICON_RE = /^data:image\//i;

/** 规约字符串：非串 → null；超限截断（截断记 issue 由调用侧拼接） */
function str(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length > max ? s.slice(0, max) : s;
}

// ---------- 条目归一 ----------

/**
 * 归一单条目录条目。id / name 任一缺失或非法 → 整条拒绝（无身份无法展示与安装）。
 * 其余字段缺省走默认值 + issue（宽容解析：坏字段不拖垮整条）。
 * @param {any} raw
 * @returns {{ok: boolean, entry: object|null, issues: string[]}}
 */
export function normalizeCatalogEntry(raw) {
  const issues = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, entry: null, issues: ['条目非对象'] };
  }

  const id = str(raw.id, ENTRY_ID_MAX);
  if (!id || !ID_RE.test(id)) {
    issues.push('id 缺失或非法（字母数字开头，限 . _ -）');
    return { ok: false, entry: null, issues };
  }

  const name = str(raw.name, ENTRY_NAME_MAX);
  if (!name) {
    issues.push('name 缺失');
    return { ok: false, entry: null, issues };
  }

  // version：缺省空串展示为「—」；非串记 issue
  let version = str(raw.version, ENTRY_VERSION_MAX);
  if (version === null) { version = ''; if (raw.version != null) issues.push('version 非串已弃'); }

  // packageId：缺省回落 id（目录展示一致性；真实安装身份以包内 manifest.id 为准）
  let packageId = str(raw.packageId, ENTRY_PKGID_MAX);
  if (!packageId) packageId = id;

  // icon：仅接受空 / http(s) / data:image —— 其余弃用（防奇异 scheme 进 DOM）
  let icon = str(raw.icon, ENTRY_URL_MAX);
  if (icon === null) {
    icon = '';
    if (raw.icon != null) issues.push('icon 非串已弃');
  }
  if (icon) {
    if (ABS_URL_RE.test(icon) || DATA_ICON_RE.test(icon)) { /* 放行 */ }
    else { icon = ''; issues.push('icon 非 http(s)/data:image 已弃'); }
  }

  // downloadUrl：空 = 无直链（展示「经安装器导入」引导）；非空拒绝危险 scheme 与协议相对地址
  let downloadUrl = str(raw.downloadUrl, ENTRY_URL_MAX);
  if (downloadUrl === null) {
    downloadUrl = '';
    if (raw.downloadUrl != null) issues.push('downloadUrl 非串已弃');
  }
  if (downloadUrl) {
    if (BLOCKED_URL_RE.test(downloadUrl)) { downloadUrl = ''; issues.push('downloadUrl 危险 scheme 已弃'); }
    else if (ABS_URL_RE.test(downloadUrl)) { /* http(s) 直链放行 */ }
    else if (downloadUrl.startsWith('//') || downloadUrl.includes(':')) { downloadUrl = ''; issues.push('downloadUrl 仅支持同源相对路径或 http(s)'); }
  }

  // size：字节整数 ≥0；字符串数字宽容收敛；垃圾回落 0（展示为「—」）
  let size = 0;
  const rawSize = typeof raw.size === 'string' && raw.size.trim() !== '' ? Number(raw.size) : raw.size;
  if (typeof rawSize === 'number' && isFinite(rawSize) && rawSize >= 0) {
    size = Math.floor(rawSize);
  } else if (raw.size != null) {
    issues.push('size 非法已按 0 计');
  }

  // permissions：数组收敛（去空去重保序截断）；非数组回落空 + issue
  let permissions = [];
  if (Array.isArray(raw.permissions)) {
    const seen = new Set();
    for (const p of raw.permissions) {
      if (typeof p !== 'string') continue;
      const key = p.trim().slice(0, PERM_KEY_MAX);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      permissions.push(key);
      if (permissions.length >= PERMS_MAX) { issues.push('permissions 超上限已截断'); break; }
    }
  } else if (raw.permissions != null) {
    issues.push('permissions 非数组已弃');
  }

  let description = str(raw.description, ENTRY_DESC_MAX);
  if (description === null) { description = ''; if (raw.description != null) issues.push('description 非串已弃'); }

  return {
    ok: true,
    entry: { id, name, version, packageId, icon, downloadUrl, size, permissions, description },
    issues,
  };
}

// ---------- 目录归一 ----------

/**
 * 归一整份目录载荷。宽容解析：坏条目/坏字段逐条记 issue，好条目照收；
 * 载荷整体不可用（非对象 / 无 apps 数组）→ ok:false + degraded:true（UI 层走降级）。
 * @param {any} raw
 * @returns {{ok: boolean, apps: object[], issues: string[], degraded: boolean}}
 */
export function normalizeCatalog(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, apps: [], issues: ['目录载荷非对象'], degraded: true };
  }
  let list = raw;
  if (!Array.isArray(raw)) {
    if (!Array.isArray(raw.apps)) {
      return { ok: false, apps: [], issues: ['apps 缺失或非数组'], degraded: true };
    }
    list = raw.apps;
  }

  const apps = [];
  const issues = [];
  const seenIds = new Set();
  for (let i = 0; i < list.length; i++) {
    const r = normalizeCatalogEntry(list[i]);
    if (!r.ok) { issues.push(`[${i}] ` + r.issues.join('；')); continue; }
    if (seenIds.has(r.entry.id)) { issues.push(`[${i}] id 重复已弃（${r.entry.id}）`); continue; }
    seenIds.add(r.entry.id);
    if (r.issues.length) issues.push(`[${i}] ` + r.issues.join('；'));
    apps.push(r.entry);
    if (apps.length >= CATALOG_MAX_ENTRIES) { issues.push(`条目超上限已截断（>${CATALOG_MAX_ENTRIES}）`); break; }
  }
  return { ok: true, apps, issues, degraded: false };
}

/**
 * 可用判定：市场「可获取」区块的唯一开关 —— 不可用即走降级（只显已装）。
 * 归一成功但零条目同样视为不可用（空目录对用户即「暂不可达」语义）。
 * @param {{ok: boolean, apps: object[]}|null} res
 */
export function isUsableCatalog(res) {
  return !!(res && res.ok === true && Array.isArray(res.apps) && res.apps.length > 0);
}
