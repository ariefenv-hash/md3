// ==================== pkg-catalog.js — 应用目录纯逻辑核（v11.01 #183 一期） ====================
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
// 诚实标注（二期更新 2026-11-07 R114；三期链序翻转 2026-11-08 #298）：
//   ① fetch 链二期化 + 三期翻转：同源 catalog.json 优先 → CDN（jsdelivr gh 通道）兜底
//     → 全失才降级离线模式（裁决降级语义不变）。翻转依据：jsdelivr 对本仓 gh 代理
//     全局 403（仓库体积超限，#298/#302 实测复现 2026-11-08），CDN 首选位恒死只会
//     拖慢失败路径；同源文件随构建拷贝入 dist（#298 治本），零网络依赖。
//     catalogFetchChain() 纯函数给出有序候选清单，fetch 与逐级回退在 appstore
//     页面脚本层（本核不碰网络）。
//   ② 目录不做本地持久化缓存（裁决降级语义 = 回退已装列表，非回退陈旧目录）；
//     CDN 响应带自身缓存头（jsdelivr 侧），同源路径仍受 SW cacheFirst 管辖（回退位口径）。
//   ③ 校验是展示层防错（污染输入不崩 UI），不是安全边界 —— 真实信任边界在
//     安装链 analyzeZipBlob（pkg-manifest safePkgPath / isValidManifestId），
//     目录 downloadUrl 的 scheme 白名单只是第一道浅筛；外部条目 url 仅 http(s)
//     白名单且 iframe 承载（opaque 站点不可注入 SDK，#172 硬约束 —— 轻量壳边界）。
//   ④ 外部条目（externals）为 #172 套娃接入：url 直载 iframe 轻量壳，非 .mdapp
//     安装包 —— 归一/安装/卸载三链独立（normalizeExternal* / extApp* 在 registry 层），
//     与 apps 账互不混装（字段语义不同：url ≠ downloadUrl、无 permissions 无 size）。
//   ⑤ CDN 通道波动实录（#302 复测 2026-11-09 00:15Z）：gh 通道 catalog.json 由
//     #298 实测 403（11-08）转为连续 3 次 200 且载荷有效 —— 「通道可用性会变」
//     (#18 §7.1②) 成立，403 ≠ 资源不存在；CDN 兜底位保留不删，改由
//     pkg/cdn-health.js 源健康检查兜底（失败源拉黑本会话 + 链过滤 + 破黑逃生门，
//     v11.01 接线 appstore.fetchChainJson）。PYODIDE_URL/pyodide 与 tesseract npm
//     通道复测 200 健康（python-core/ocr 零触碰）；raw.githubusercontent 本沙箱
//     实测 000 不可达，不作为修复方向。

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
/** 同源目录地址（fetch 链回退位） */
export const CATALOG_URL = 'catalog.json';
/** CDN 目录地址（fetch 链首选；jsdelivr gh 通道 = #161/#31 同通道先例；@main 随仓库更新走） */
export const CDN_CATALOG_URL = 'https://cdn.jsdelivr.net/gh/ariefenv-hash/md3@main/ios-desktop/catalog.json';
/** 外部条目单目录最大数：外部站点账号与 apps 分账独立上限 */
export const EXTERNALS_MAX = 50;
/** 外部条目存储 appId 前缀（与 pkg- 安装前缀同律：隔离 initialApps 命名空间） */
export const EXTERNAL_APP_PREFIX = 'ext-';
/** 外部条目 url 上限（同 ENTRY_URL_MAX 量级，独立常量便于单独调参） */
export const EXTERNAL_URL_MAX = 512;

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
    return { ok: false, apps: [], externals: [], issues: ['目录载荷非对象'], degraded: true };
  }
  let list = raw;
  let rawExternals = null;
  if (!Array.isArray(raw)) {
    if (!Array.isArray(raw.apps)) {
      return { ok: false, apps: [], externals: [], issues: ['apps 缺失或非数组'], degraded: true };
    }
    list = raw.apps;
    // 二期 #172：externals 分账归一（apps 数组缺失仍整体拒绝；externals 坏账不拖垮 apps）
    const ext = normalizeExternals(raw.externals);
    rawExternals = ext.externals;
    var extIssues = ext.issues;
  }

  const apps = [];
  const issues = Array.isArray(extIssues) ? extIssues.slice() : [];
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
  return { ok: true, apps, externals: rawExternals || [], issues, degraded: false };
}

/**
 * 可用判定：市场「可获取」区块的唯一开关 —— 不可用即走降级（只显已装）。
 * 归一成功但零条目同样视为不可用（空目录对用户即「暂不可达」语义）。
 * 二期：externals 非空同样算可用（外部条目独立可展示可添加，apps 空不否定整册）。
 * @param {{ok: boolean, apps: object[], externals?: object[]}|null} res
 */
export function isUsableCatalog(res) {
  if (!res || res.ok !== true) return false;
  const hasApps = Array.isArray(res.apps) && res.apps.length > 0;
  const hasExt = Array.isArray(res.externals) && res.externals.length > 0;
  return hasApps || hasExt;
}

// ---------- 二期：fetch 链 / 外部条目归一 / 版本比较 ----------

/**
 * 目录 fetch 候选链（纯函数，无网络）：同源首选 → CDN 兜底（#298 三期翻转）。
 * appstore 页面脚本按序尝试，首个可用响应即用；全失才走离线降级。
 * 链序（#298 三期翻转）：同源相对地址首选（dist 治本拷贝在案）→ CDN 兜底。
 * 环境无 location（单测）时仅返回相对地址 + CDN 原样。
 * @returns {string[]} 有序候选 URL（≥1 条）
 */
export function catalogFetchChain() {
  const chain = [CATALOG_URL];
  if (CDN_CATALOG_URL && chain.indexOf(CDN_CATALOG_URL) === -1) chain.push(CDN_CATALOG_URL);
  return chain;
}

/**
 * 归一单条外部条目（#172 套娃轻量壳账）。id / name / url 三缺一即整条拒绝
 * （url 是外部条目的存在意义；与 appstore apps 账的宽容度差异诚实标注在册）。
 * url 仅 http(s)（ABS_URL_RE），危险 scheme / 协议相对 / 同源相对一律拒绝
 * ——外部条目必须显式完整地址，iframe 直载无同源解析基准混淆空间。
 * @param {any} raw
 * @returns {{ok: boolean, entry: object|null, issues: string[]}}
 */
export function normalizeExternalEntry(raw) {
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

  let url = str(raw.url, EXTERNAL_URL_MAX);
  if (!url) {
    issues.push('url 缺失');
    return { ok: false, entry: null, issues };
  }
  if (BLOCKED_URL_RE.test(url)) {
    issues.push('url 危险 scheme 已拒');
    return { ok: false, entry: null, issues };
  }
  if (!ABS_URL_RE.test(url)) {
    issues.push('url 仅支持 http(s) 完整地址');
    return { ok: false, entry: null, issues };
  }

  let icon = str(raw.icon, ENTRY_URL_MAX);
  if (icon === null) { icon = ''; if (raw.icon != null) issues.push('icon 非串已弃'); }
  if (icon && !(ABS_URL_RE.test(icon) || DATA_ICON_RE.test(icon))) {
    icon = ''; issues.push('icon 非 http(s)/data:image 已弃');
  }

  let version = str(raw.version, ENTRY_VERSION_MAX);
  if (version === null) { version = ''; if (raw.version != null) issues.push('version 非串已弃'); }

  let description = str(raw.description, ENTRY_DESC_MAX);
  if (description === null) { description = ''; if (raw.description != null) issues.push('description 非串已弃'); }

  return {
    ok: true,
    entry: { id, name, url, icon, version, description, kind: 'external' },
    issues,
  };
}

/**
 * 归一外部条目数组（宽容解析同 normalizeCatalog：坏条目跳过记序号，id 重复首见保留）。
 * @param {any} list
 * @returns {{externals: object[], issues: string[]}}
 */
export function normalizeExternals(list) {
  const externals = [];
  const issues = [];
  if (list == null) return { externals, issues };
  if (!Array.isArray(list)) { issues.push('externals 非数组已弃'); return { externals, issues }; }
  const seenIds = new Set();
  for (let i = 0; i < list.length; i++) {
    const r = normalizeExternalEntry(list[i]);
    if (!r.ok) { issues.push(`ext[${i}] ` + r.issues.join('；')); continue; }
    if (seenIds.has(r.entry.id)) { issues.push(`ext[${i}] id 重复已弃（${r.entry.id}）`); continue; }
    seenIds.add(r.entry.id);
    if (r.issues.length) issues.push(`ext[${i}] ` + r.issues.join('；'));
    externals.push(r.entry);
    if (externals.length >= EXTERNALS_MAX) { issues.push(`外部条目超上限已截断（>${EXTERNALS_MAX}）`); break; }
  }
  return { externals, issues };
}

/**
 * 语义化版本比较（纯函数）：按 '.' 分段数字比较，缺失段补 0；
 * 非数字段（如 beta 后缀）取前导数字，无前导数字则整段按 0。
 * 返回 -1 / 0 / 1（a<b / 相等 / a>b）；任一非串或为空 → null（调用侧按「未知」态展示）。
 * @param {string} a
 * @param {string} b
 */
export function compareVersions(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a.trim() || !b.trim()) return null;
  const pa = a.trim().split('.');
  const pb = b.trim().split('.');
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = parseInt(pa[i] || '0', 10) || 0;
    const nb = parseInt(pb[i] || '0', 10) || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

// ---------- 三期（v11.01 #172 余项）：外部失联探活纯逻辑核 ----------
//
// #172 建议形态④「加载失败占位」+ 外部依赖风险段「健康检查与降级标记」落地：
// 外部站点不受 md3 管辖（仓库删除 / 改路径 / Pages 关闭 → 图标哑），轻量壳需要
// 一层失联判定 + 占位 UI。本节只做纯判定（与 fetch/iframe/DOM 的分工同二期 fetch 链同律）：
//   - 探活执行（fetch GitHub API / no-cors 直连）在 external-shell.js 接线层；
//   - 本核只给：github.io 仓库解析 / 探活端点推导 / 重试参数拼接 / 判定表。
//
// 诚实边界（同源策略）：跨域 iframe 的 contentDocument 不可读（#172 opaque 约束），
// 「页面内容是否可用」深度不可探测 —— 判定表只消费网络级信号：
//   ① GitHub API 404 = 仓库或 Pages 已删除（权威信号，github.io 条目独享）；
//   ② no-cors 直连被拒 = 网络级失联（DNS / 离线 / 连接被拒）；
//   ③ 看门狗超时且 iframe load 从未发生 = 加载面失联；
//   ④ GitHub API 200 / 直连可达 / load 已发生 = 网络级可达（不承诺内容可用）。
// 歧义态（如 api.github.com 整域被墙）一律回 'unknown' 不降级 —— 宁可白屏等待
// 也不误伤慢网真站点；占位 UI 带「重试」，误判可恢复（#172 降级语义）。

/** 外部 iframe 加载看门狗默认时限（ms）：超时未 load 且无 ok 信号 → 失联占位。e2e 可经 data-ext-timeout 覆写 */
export const EXTERNAL_PROBE_TIMEOUT_MS = 12000;
/** 重试 cache-bust 参数名（外部站点不认识的查询参数会被忽略，安全） */
export const EXTERNAL_RETRY_PARAM = 'md3_retry';

const GITHUB_PAGES_HOST_RE = /\.github\.io$/i;

/**
 * 解析 github.io 站点 URL → { owner, repo }（纯函数）。
 * 形态：https://<owner>.github.io/<repo>/…（项目页）；<owner>.github.io 根（用户主页，无 repo）→ null。
 * 非串 / 非 URL / 非 github.io host / repo 段缺失 → null。
 * @param {string} url
 * @returns {{owner: string, repo: string}|null}
 */
export function githubPagesRepoFromUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  let u;
  try { u = new URL(url); } catch (e) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase();
  if (!GITHUB_PAGES_HOST_RE.test(host)) return null;
  const owner = host.slice(0, -'.github.io'.length);
  if (!owner) return null;
  const seg = u.pathname.replace(/^\/+/, '').split('/')[0] || '';
  if (!seg) return null;
  return { owner, repo: seg };
}

/**
 * 外部 url → 探活端点推导（纯函数）：github.io 条目走 GitHub REST 仓库端点
 * （免认证、CORS 开放、404=仓库/Pages 已删除的权威信号）；其余站点无免认证
 * 健康端点可推导 → null（接线层回退 no-cors 直连探活）。
 * @param {string} url
 * @returns {string|null}
 */
export function externalHealthEndpoint(url) {
  const r = githubPagesRepoFromUrl(url);
  if (!r) return null;
  return `https://api.github.com/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}`;
}

/**
 * 重试 cache-bust 参数拼接（纯函数）：追加/覆盖 md3_retry=<n> 查询参数。
 * URL 解析失败（极端桩环境）→ 原样返回（retry 退化为 src 重赋值的普通 reload）。
 * @param {string} url
 * @param {number} n 重试序号（≥1 整数；非法按 1）
 */
export function appendRetryParam(url, n) {
  if (typeof url !== 'string' || !url.trim()) return url;
  const k = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  try {
    const u = new URL(url);
    u.searchParams.set(EXTERNAL_RETRY_PARAM, String(k));
    return u.toString();
  } catch (e) {
    return url;
  }
}

/**
 * 外部失联判定表（纯函数，v11.01 #172 余项判定单源）。
 * 输入信号全部可选/可注入；输出 'ok' | 'unreachable' | 'unknown'。
 * 优先序（先到先判，权威信号压制弱信号）：
 *   1. probeStatus === 404                    → unreachable（GitHub API 权威：仓库/Pages 已删除；即使 load 了 404 页同判）
 *   2. reachable === false                    → unreachable（no-cors 直连网络级被拒）
 *   3. probeStatus === 200                    → ok（仓库在册；页面慢载不占位）
 *   4. reachable === true                     → ok（直连可达）
 *   5. loadTimedOut && !loadFired             → unreachable（看门狗超时且零 load 信号）
 *   6. loadFired                              → ok（网络级到达；深度可用性同源策略不可测，诚实边界）
 *   7. 其余（探活进行中 / API 整域歧义失败）   → unknown（不降级，等 load 或下轮信号）
 * @param {{probeStatus?: number|null, reachable?: boolean|null, loadFired?: boolean, loadTimedOut?: boolean}} sig
 * @returns {'ok'|'unreachable'|'unknown'}
 */
export function classifyExternalHealth(sig) {
  const s = sig && typeof sig === 'object' ? sig : {};
  if (s.probeStatus === 404) return 'unreachable';
  if (s.reachable === false) return 'unreachable';
  if (s.probeStatus === 200) return 'ok';
  if (s.reachable === true) return 'ok';
  if (s.loadTimedOut === true && s.loadFired !== true) return 'unreachable';
  if (s.loadFired === true) return 'ok';
  return 'unknown';
}
