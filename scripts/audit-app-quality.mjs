// ==================== audit-app-quality.mjs — 应用质量评分卡（#229 摸底 → #230 制度化） ====================
// 三议题合并改造的引擎件（#228 删白名单全量扫描 / #227 滑块语义门禁 / #230 8 项评分卡）。
// v10.55 #244 建议③：增补第 I 项「视觉令牌接入」—— 令牌面从「色彩密度」单项扩展到
//   状态层/形状/字体契约三面（docs/visual-token-adoption.md 五面口径同源），9 项评分制。
//
// 9 项门槛（#230 §二 + #244 建议③增补，判定口径与 #229 摸底矩阵逐字对齐）：
//   A · MD3 色彩密度    var(--md- ≥ 15 且 ≥ 4 处/100 行
//   B · 响应式+平板分栏  @media ≥ 1 且 min-width:760px ≥ 1 且该块内有实质布局差异
//                        （grid-template-columns / flex-direction / display:none 等，
//                        空媒体查询不算 —— #230 验收用例 3）
//   C · __system SDK    真实调用 ≥ 1（剔除注释后匹配 —— #230 验收用例：注释命中不算）
//   D · 形态语言单源    每个 type="range" 的 class 命中 .mdslider 组件，
//                        且应用内零自定义 ::-webkit-slider-thumb / ::-moz-range-thumb /
//                        ::-webkit-slider-runnable-track / ::-moz-range-track
//                        （#227 要求④「不达标直接 fail」，本批完成全库单源化后立即受门禁保护）
//   E · 无障碍          aria- / role= / alt= / tabindex= / label ≥ 3
//   F · 视觉动效        transition / animation / @keyframes ≥ 3
//   G · 数据持久化      localStorage / indexedDB / __system.fs ≥ 1
//   H · 测试覆盖        tests/*.test.js 正文引用 apps/<id>/ ≥ 1
//   I · 视觉令牌接入    状态层 var(--md-state- ≥ 1，或（形状 var(--md-r- ≥ 2 且字体契约
//                        var(--md-font/--md-text-font ≥ 1）—— #244 建议③：D 状态层面
//                        v10.54 全库破零（3/41）为最快通道；分档非硬阻断（#244 边界）
// 评分 = 通过数；≥7 达标 / 4–6 偏薄 / ≤3 严重（#229 §二，9 项制阈值不变）。
//
// 分期策略（#230 §四，防一刀切全红）：
//   阶段 1（本批）  接入构建只 warn 打印分档与缺口，不阻断
//   阶段 2（下批起）严重档（≤3）fail，偏薄档继续 warn
//   阶段 3          全部 8 项 fail
//   两类失败不受分期豁免、任何阶段都硬 fail：
//     ① D 滑块门禁（本批单源化成果的回归防线 —— #227 要求④强制口径）
//     ② 基线回退（scripts/quality-baseline.json 记录开卡时刻各应用通过项，
//        「曾经达标」的项掉线即 fail —— 保护既有 17 应用准入 lint 的门禁强度不因本次
//        全量化而变弱；新应用不在基线内，由分期管）
//
// 全量扫描（#228 要求①）：fs.readdir 遍历 ios-desktop/apps/ 全部目录（排除 _shared 与
// 文件项如 freeze-shim.js），零硬编码清单 —— 新应用落盘自动纳入，「已检查 N」的 N 恒等于
// 实际目录数（#228 要求⑤、#230 验收用例 2）。
//
// 多文件合并（#156 范式）：.html/.css/.js/.mjs 全计入（跳过 vendor/ 与 *.min.*）。
// 模板同审：scripts/app-template-multi 三件套与 scripts/app-template.html 单文件模板
// 走同一 8 项（模板不达标 = 生成的应用天然不达标，#181 准入⑥语义），不占 N 计数。
//
// 视觉基线 V 清单（#243 · v10.63，与 9 项制并行独立段，不改 9 项制阈值与 ITEM_KEYS）：
//   #243 §① 要求「新增应用视觉基线」清单 8~10 项可机器核对，挂进本评分卡不另起基建。
//   V1 动态取色接入  同 A 口径（var(--md- ≥15 且 ≥4处/100 行，继承 #230 对齐 #229 矩阵）
//   V2 字体阶梯契约  var(--md-font[,)]|var(--md-text-font ≥1（剥注释后，消费非提及）
//   V3 圆角/形状令牌  var(--md-r- ≥2
//   V4 状态层令牌    var(--md-state- ≥1
//   V5 按压反馈      :active / .pressed / pressRipple / squeeze-row / *-ripple ≥1
//   V6 开屏动效      @keyframes 定义 ≥1 且 animation: 应用 ≥1（剥注释后）
//   V7 空状态        暂无/空状态/empty-state/数据为空等文案或类 ≥1（剥注释后）
//   V8 深色与窄屏    var(--md-surface|--md-on-surface ≥1 且（@media max-width ≥1 或 B 通过）
//   分档：8 项中 ≥7 达标 / 4–6 偏薄 / ≤3 严重；报告级非硬门禁（#243 §②「分档而非硬阻断」，
//   防 #235 门禁连红→部署全跳过复发）；水位回退仅 warn 不 fail（scripts/visual-baseline.json）。
//   新应用自动纳入（复用 #228 全量扫描）；模板同审（生成即达标是 #243 §③验收口径）。
//
// 触控目标 J 段（#294 · v10.99，与 9 项制/V 清单并行独立段，不改 ITEM_KEYS/阈值/分数语义）：
//   J 交互命中区  交互锚（button/a/input/select/textarea/onclick/role=button，排除 type=hidden）
//                 的静态命中区证据面：系统组件类（md3-list-item ≥52px / md3-fab 56×56 实证）
//                 或内联 style / 应用 CSS 声明 height|min-height ≥44px（AOSP/Material 48dp
//                 与 44px CSS 口径换算见 docs/visual-admission-baseline.md J 行）；
//                 零交互锚天然通过（D 门「无 range 天然通过」先例同律）；
//                 分档曝光不拦截（#243 先例）——不进 ITEM_KEYS、不进 hardFailures；
//                 判据 = 零「声明 <44px」可证违规；无法静态证得者 N/A 曝光不入判（真适配不硬造，
//                 na 计数随 --json 曝光供渐进闭合路线图）；
//                 新增组目标线 9/9 → 10/10（J 随存量渐进 + 伪元素扩命中区后续卷闭合，裁决 3 候补）。
//
// 巨石文件 K 段（#284 批 1 · v11.05，与 9 项制/V/J 段并行独立段，不改 ITEM_KEYS/阈值/分数语义）：
//   K 巨石分档曝光  数据真源 = docs/audits/monolith-inventory.json 生成件——exceeds3000/exempt/
//                   status 三字段唯一判据输入，零硬编码文件名（boundary-map §4 设计点 4）；
//                   K-存量曝光（豁免名单内超阈；名单只出不进防乒乓，缩行不退出）= 报告级不入判；
//                   K-违规（非豁免超阈）= hardFailures 进位（增量拦截）——不入 ITEM_KEYS、不动
//                   quality-baseline A–I 锚与 v294 J6 负向锚（J 段报告级先例同律）；
//                   生成件缺失/解析失败 = N/A 曝光不入判（--check 独立闸守护，真适配不硬造）；
//                   三字段失自洽（status 与两布尔判定漂移）= 数据真源防腐，一并拦截。
// vendor O 段（#280 建议④ · R155 窗 v11.14，与 K 段同款独立段，不改 ITEM_KEYS/阈值/分数语义）：
//   O vendor 孤儿库检测  数据真源 = docs/audits/vendor-consumers.json 生成件——
//                   孤儿库（消费方=0）= O-违规 hardFailures 进位（防将来再积压）；
//                   单消费方 ≥300KB = 按需化候选（提示级不入判）；classification 失自洽拦截；
//                   生成件缺失 = N/A 曝光不入判（gen-vendor-audit --check 闸守护）。
//
// CLI：
//   node scripts/audit-app-quality.mjs                 # 阶段 1 warn 输出
//   APP_QUALITY_PHASE=2 node scripts/audit-app-quality.mjs
//   node scripts/audit-app-quality.mjs --write-baseline # 开卡/更新基线（整改批次用）
//   node scripts/audit-app-quality.mjs --write-visual-baseline # 开卡/更新视觉基线水位（#243）
//   node scripts/audit-app-quality.mjs --json          # 机器可读（测试消费）

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const TIER = { STANDARD: '达标', THIN: '偏薄', SEVERE: '严重' };
export const ITEM_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

// ==================== 视觉基线 V 清单（#243） ====================
export const VISUAL_KEYS = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8'];
export const VISUAL_LABELS = {
  V1: '动态取色', V2: '字体阶梯', V3: '圆角形状', V4: '状态层',
  V5: '按压反馈', V6: '开屏动效', V7: '空状态', V8: '深窄屏',
};

/** V1 · 动态取色接入：继承 A 口径（#230 对齐 #229 矩阵，不另立阈值） */
export function checkV1(text) {
  const a = checkA(text);
  return { pass: a.pass, detail: `动态取色（同 A 口径）：${a.detail}` };
}

/** V2 · 字体阶梯契约（消费非提及，剥注释） */
export function checkV2(text) {
  const bare = stripHtmlComments(stripCssJsComments(text));
  const hits = (bare.match(/var\(--md-font[,)]|var\(--md-text-font/g) || []).length;
  return { pass: hits >= 1, detail: hits >= 1 ? `字体契约消费×${hits}` : '零 --md-font/--md-text-font 消费' };
}

/** V3 · 圆角/形状令牌 ≥2 */
export function checkV3(text) {
  const bare = stripHtmlComments(stripCssJsComments(text));
  const hits = (bare.match(/var\(--md-r-/g) || []).length;
  return { pass: hits >= 2, detail: `形状令牌×${hits}（需 ≥2）` };
}

/** V4 · 状态层令牌 ≥1 */
export function checkV4(text) {
  const bare = stripHtmlComments(stripCssJsComments(text));
  const hits = (bare.match(/var\(--md-state-/g) || []).length;
  return { pass: hits >= 1, detail: `状态层令牌×${hits}（需 ≥1）` };
}

/** V5 · 按压反馈（:active / pressed / 果冻联动 / ripple，剥注释防文档误伤） */
export function checkV5(text) {
  const bare = stripHtmlComments(stripCssJsComments(text));
  const hits = (bare.match(/:active\b|\.pressed\b|pressRipple|squeeze-row|[\w-]*-ripple\b/g) || []).length;
  return { pass: hits >= 1, detail: hits >= 1 ? `按压反馈锚×${hits}` : '零按压反馈（:active/pressed/果冻/ripple）' };
}

/** V6 · 开屏动效：@keyframes 定义与 animation 应用双要件（剥注释）。
 *  边界：只做「存在性检测」，不碰 #245 批 2 的曲线收口/密度补齐施工车道。 */
export function checkV6(text) {
  const bare = stripHtmlComments(stripCssJsComments(text));
  const kf = (bare.match(/@keyframes/g) || []).length;
  const an = (bare.match(/animation\s*:/g) || []).length;
  const pass = kf >= 1 && an >= 1;
  return {
    pass,
    detail: pass ? `开屏动效：@keyframes×${kf} + animation×${an}` : `开屏动效缺口：@keyframes×${kf} / animation×${an}（双要件）`,
  };
}

/** V7 · 空状态（文案或 empty-state 类，剥注释） */
export function checkV7(text) {
  const bare = stripHtmlComments(stripCssJsComments(text));
  const hits = (bare.match(/暂无|空状态|empty[-_]?state|空空如也|数据为空|没有内容|无内容/g) || []).length;
  return { pass: hits >= 1, detail: hits >= 1 ? `空状态锚×${hits}` : '零空状态（无文案也无 empty-state 类）' };
}

/** V8 · 深色与窄屏适配：表面令牌消费（深色随宿主令牌联动）+ 窄屏/media 或 B 真分栏 */
export function checkV8(text) {
  const bare = stripHtmlComments(stripCssJsComments(text));
  const surface = (bare.match(/var\(--md-surface|var\(--md-on-surface/g) || []).length;
  const maxW = (bare.match(/@media[^{]*max-width/) || []).length;
  const b = checkB(text);
  const pass = surface >= 1 && (maxW >= 1 || b.pass);
  const why = surface < 1 ? '零表面令牌消费（深色不随宿主）' : '无 max-width 媒体查询且 B 未过（窄屏无路径）';
  return { pass, detail: pass ? `表面令牌×${surface} + ${maxW >= 1 ? 'max-width 媒体' : 'B 真分栏'}` : why };
}

/** 单应用视觉基线 8 项（与 9 项制并行独立段） */
export function auditVisual(appId, text) {
  const items = {
    V1: checkV1(text),
    V2: checkV2(text),
    V3: checkV3(text),
    V4: checkV4(text),
    V5: checkV5(text),
    V6: checkV6(text),
    V7: checkV7(text),
    V8: checkV8(text),
  };
  const failed = VISUAL_KEYS.filter((k) => !items[k].pass);
  const score = VISUAL_KEYS.length - failed.length;
  const tier = score >= 7 ? TIER.STANDARD : score >= 4 ? TIER.THIN : TIER.SEVERE;
  return { appId, items, score, failed, tier };
}

// ==================== 触控目标 J 段（#294） ====================
export const TOUCH_MIN_PX = 44;

/** 系统组件命中区证据表（中心样式实证，真源 ios-desktop/css/md3-theme.css）。
 *  .md3-btn 计算高 ≈40px（视觉 M3 40dp 达标、命中区 <44）→ 不入证据表，随处置 3 后续卷收口。
 *  判据（#294 裁决）：pass = 零「声明 <44px」可证违规；无法静态证得者（未声明尺寸）为 N/A 曝光
 *  不入判（真适配不硬造）——N/A 计数随 detail/na 字段曝光供渐进闭合路线图消费。 */
export const TOUCH_SYSTEM_EVIDENCE = {
  'md3-list-item': 'padding 14px×2 + 内容 ≥24px → 命中区 ≥52px（md3-theme.css .md3-list-item 实测）',
  'md3-fab': '56×56px（md3-theme.css .md3-fab 实测）',
};

/** 从应用样式块建 类名→height|min-height 最大值 映射（报告级近似：多选择器取尾类，px 直读） */
export function touchCssSizeMap(text) {
  const map = new Map();
  const re = /\.([A-Za-z][\w-]*)[^{}]*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    for (const d of m[2].matchAll(/(?:^|[;\s])(?:min-height|height)\s*:\s*(\d+(?:\.\d+)?)px/g)) {
      const v = parseFloat(d[1]);
      if (v > (map.get(m[1]) || 0)) map.set(m[1], v);
    }
  }
  return map;
}

const TOUCH_ANCHOR_RE =
  /<(button|a)\b[^>]*>|<(?:input|select|textarea)\b[^>]*>|<[a-zA-Z][\w-]*\b[^>]*(?:\sonclick=|\srole=["']button["'])[^>]*>/g;

function declaredHeights(decl) {
  return [...decl.matchAll(/(?:^|[;\s])(?:min-height|height)\s*:\s*(\d+(?:\.\d+)?)px/g)].map((x) => parseFloat(x[1]));
}

/** 提取交互锚并逐锚定级：system / inline / css（≥44 证据）| small（声明 <44）| unevidenced */
export function extractTouchAnchors(text) {
  const bare = stripHtmlComments(stripCssJsComments(text));
  const cssMap = touchCssSizeMap(bare);
  const anchors = [];
  let m;
  TOUCH_ANCHOR_RE.lastIndex = 0;
  while ((m = TOUCH_ANCHOR_RE.exec(bare)) !== null) {
    const tag = m[0];
    if (/type=["']hidden["']/.test(tag)) continue;
    const classes = ((/\bclass\s*=\s*["']([^"']*)["']/.exec(tag) || [])[1] || '').split(/\s+/).filter(Boolean);
    const style = (/\bstyle\s*=\s*["']([^"']*)["']/.exec(tag) || [])[1] || '';
    const inline = Math.max(0, ...declaredHeights(style));
    const cssMax = Math.max(0, ...classes.map((c) => cssMap.get(c) || 0));
    let kind = 'unevidenced';
    if (classes.some((c) => TOUCH_SYSTEM_EVIDENCE[c])) kind = 'system';
    else if (inline >= TOUCH_MIN_PX) kind = 'inline';
    else if (cssMax >= TOUCH_MIN_PX) kind = 'css';
    else if (inline > 0 || cssMax > 0) kind = 'small';
    anchors.push({ classes, kind, size: kind === 'inline' ? inline : kind === 'css' ? cssMax : kind === 'small' ? Math.max(inline, cssMax) : null });
  }
  return { anchors, cssMap };
}

/** J · 触控命中区证据（#294 · 报告级并行段）：判据 = 零「声明 <44px」可证违规；
 *  未声明尺寸者 N/A 曝光不入判；零交互锚天然通过（D 门先例同律）。
 *  返回 { pass, detail, total, small, na, system } 供快照/文档消费。 */
export function checkJ(text) {
  const { anchors } = extractTouchAnchors(text);
  const n = anchors.length;
  if (n === 0) return { pass: true, detail: '无交互锚（无触控面，D 门先例同律）', total: 0, small: 0, na: 0, system: 0 };
  const by = { system: 0, inline: 0, css: 0, small: 0, unevidenced: 0 };
  const misses = [];
  for (const a of anchors) {
    by[a.kind]++;
    if (a.kind === 'small' && misses.length < 3) misses.push(`${a.classes[0] || 'inline-tag'}=${a.size}px`);
  }
  const missPart = by.small
    ? `违规×${by.small}${misses.length ? ` [${misses.join(',')}]` : ''}`
    : '违规×0';
  return {
    pass: by.small === 0,
    detail: `触控锚×${n}（系统×${by.system} / 内联≥44×${by.inline} / CSS≥44×${by.css} / N/A未证×${by.unevidenced} / ${missPart}）`,
    total: n,
    small: by.small,
    na: by.unevidenced,
    system: by.system,
  };
}

// ==================== 巨石文件 K 段（#284 批 1 · v11.05） ====================

/** K · 巨石文件分档曝光（#284 · 报告级 + 违规拦截双轨）：数据真源 = docs/audits/
 *  monolith-inventory.json 生成件，exceeds3000/exempt/status 三字段唯一判据输入，
 *  零硬编码文件名（boundary-map §4 设计点 4）。判定语义镜像 gen-monolith-inventory.mjs
 *  build() 分档（超阈+豁免=K-存量曝光 / 超阈+非豁免=K-违规 / 其余=ok），并对 status
 *  标签做自洽校验（漂移 = 生成件防腐异常）。生成件缺失/解析失败 → available=false
 *  N/A 曝光不入判（--check 独立闸守护）。返回 { available, threshold, over, exemptHits,
 *  violations, exposure, offending, anomalies, detail }。 */
export function checkMonolithK(inventory) {
  if (!inventory || !Array.isArray(inventory.files)) {
    return { available: false, detail: '生成件缺失或结构异常（N/A 曝光不入判，gen-monolith-inventory.mjs 再生）' };
  }
  const exposure = [];
  const offending = [];
  const anomalyDetails = [];
  for (const f of inventory.files) {
    const expect = f.exceeds3000 && f.exempt ? 'K-存量曝光'
      : f.exceeds3000 && !f.exempt ? 'K-违规' : 'ok';
    if (f.status !== expect) {
      anomalyDetails.push(`${f.path} status=${f.status} 期望=${expect}`);
      continue;
    }
    if (expect === 'K-存量曝光') exposure.push(`${f.path}=${f.lines}行`);
    else if (expect === 'K-违规') offending.push(`${f.path}=${f.lines}行`);
  }
  const threshold = inventory.threshold;
  const parts = [`阈值>${threshold}`, `超阈×${exposure.length + offending.length}`,
    `存量曝光×${exposure.length}（豁免只出不进）`, `违规×${offending.length}`];
  if (anomalyDetails.length) parts.push(`三字段失自洽×${anomalyDetails.length}`);
  return {
    available: true,
    threshold,
    over: exposure.length + offending.length,
    exemptHits: exposure.length,
    violations: offending.length,
    exposure,
    offending,
    anomalies: anomalyDetails.length,
    anomalyDetails,
    detail: parts.join(' · '),
  };
}

// ==================== vendor O 段（#280 建议④ · R155 窗 v11.14） ====================

/** O · vendor 孤儿库检测（#280 · 报告级 + 违规拦截双轨，K 段同款）：数据真源 =
 *  docs/audits/vendor-consumers.json 生成件（gen-vendor-audit.mjs --write，--check 单真源闸），
 *  classification/consumerCount/distBytes 唯一判据输入，零硬编码文件名。判定语义：
 *  孤儿库（消费方=0）= O-违规（拦截，防将来再积压——#280 建议④原话）；
 *  单消费方且 distBytes ≥ 300KB = 按需化候选（提示级不入判，#280 §5 接线设计）；
 *  classification 字段与 consumerCount 推导值失自洽 = 生成件防腐异常拦截。
 *  生成件缺失/解析失败 → available=false N/A 曝光不入判（--check 独立闸守护）。
 *  返回 { available, orphans, hints, hintList, anomalies, anomalyDetails, detail }。 */
export function checkVendorO(inventory) {
  if (!inventory || !Array.isArray(inventory.files)) {
    return { available: false, detail: '生成件缺失或结构异常（N/A 曝光不入判，gen-vendor-audit.mjs --write 再生）' };
  }
  const orphanList = [];
  const hints = [];
  const anomalyDetails = [];
  for (const f of inventory.files) {
    const expect = f.consumerCount === 0 ? 'orphan' : f.consumerCount === 1 ? 'single-consumer' : 'shared';
    if (f.classification !== expect) {
      anomalyDetails.push(`${f.path} classification=${f.classification} 期望=${expect}`);
      continue;
    }
    if (expect === 'orphan') orphanList.push(f.path);
    else if (expect === 'single-consumer' && typeof f.distBytes === 'number' && f.distBytes >= 300 * 1024) {
      hints.push(`${f.path}=${Math.round(f.distBytes / 1024)}KB→${(f.consumers[0] || {}).ref || '?'}`);
    }
  }
  const parts = [`vendor×${inventory.files.length}`, `孤儿×${orphanList.length}`,
    `按需化候选×${hints.length}（提示级）`];
  if (anomalyDetails.length) parts.push(`classification 失自洽×${anomalyDetails.length}`);
  return {
    available: true,
    total: inventory.files.length,
    orphans: orphanList.length,
    orphanList,
    hints,
    anomalies: anomalyDetails.length,
    anomalyDetails,
    detail: parts.join(' · '),
  };
}

const SCANNABLE_EXT = ['.html', '.css', '.js', '.mjs'];

// B 门槛「实质布局差异」判定属性（#230 §三：grid-template-columns / flex-direction 等）
const LAYOUT_DIFF_RE =
  /(grid-template-columns|grid-template-rows|grid-auto-flow|flex-direction|flex-basis|column-count|display\s*:\s*(none|flex|grid)|order\s*:)/;

// R130 窗引擎盲区修复卡（v264 C1 披露 · Job 2931605 实例 4）：HTML 属性值内的 /* 不构成 CSS 注释开启。
// 根因：photos file input accept="image/*,video/*" 的 MIME 通配符被块注释正则 /\/\*[\s\S]*?\*\//g
// 误判为注释开启，非贪婪吞至下一个 */，致吞噬区（photos 383→591 行区间）不进 V 面判定。
// 做法：strip 前对 HTML 标签内 ="…"/='…' 属性值（含 /* 或 */ 者）做占位保护，strip 完成后原样还原；
// 纯 CSS/JS 语境（无 HTML 标签包裹的注释符）零行为变化。v260 纯逻辑核导出先例同律 export 供测试。
const ATTR_STASH = [];
function guardAttrValues(text) {
  ATTR_STASH.length = 0;
  return text.replace(/<[a-zA-Z!][^>]*>/g, (tag) =>
    tag.replace(/([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*(["'])([\s\S]*?)\2/g, (m, attr, q, val) => {
      if (!val.includes('/*') && !val.includes('*/')) return m;
      ATTR_STASH.push(val);
      return `${attr}=${q}\u0000${ATTR_STASH.length - 1}\u0000${q}`;
    })
  );
}

export function stripCssJsComments(text) {
  const guarded = guardAttrValues(text);
  const stripped = guarded
    .replace(/\/\*[\s\S]*?\*\//g, ' ')      /* 块注释 */
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 '); // 行注释（保守：不吞 url("//"）与协议双斜杠
  return stripped.replace(/\u0000(\d+)\u0000/g, (m, i) => ATTR_STASH[Number(i)]);
}

function stripHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, ' ');
}

function countLines(text) {
  return text.split('\n').length;
}

/** A · MD3 色彩密度 */
export function checkA(text) {
  const hits = (text.match(/var\(--md-/g) || []).length;
  const density = countLines(text) > 0 ? (hits / countLines(text)) * 100 : 0;
  return { pass: hits >= 15 && density >= 4, detail: `var(--md-)×${hits}，密度 ${density.toFixed(1)}/100 行（需 ≥15 且 ≥4）` };
}

/** 提取所有 min-width:760px 媒体查询块正文（括号配平） */
export function extract760Blocks(text) {
  const blocks = [];
  const re = /@media[^{]*min-width\s*:\s*760px[^{]*\{/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    blocks.push(text.slice(m.index + m[0].length, i - 1));
  }
  return blocks;
}

/** B · 响应式 + 平板分栏（语义化：760 块内必须有实质布局差异） */
export function checkB(text) {
  const mediaQ = (text.match(/@media/g) || []).length;
  const blocks = extract760Blocks(text);
  const realLayout = blocks.some((b) => LAYOUT_DIFF_RE.test(b));
  const ok = mediaQ >= 1 && blocks.length >= 1 && realLayout;
  const why = mediaQ < 1 ? '无 @media' : blocks.length < 1 ? '无 min-width:760px' : '760px 块内无实质布局差异（空媒体查询不通过）';
  return { pass: ok, detail: ok ? `@media×${mediaQ} + 760px 真分栏` : why };
}

/** C · __system SDK 真实调用（剔除注释后判定；window.__system 取别名形态一并计入） */
export function checkC(text) {
  const bare = stripHtmlComments(stripCssJsComments(text));
  const hits = (bare.match(/__system\s*\.|window\.__system\b|sdk\s*\.\s*(notify|emit|fs|clipboard|requestPermission)/g) || []).length;
  return { pass: hits >= 1, detail: hits >= 1 ? `__system SDK 真实调用×${hits}` : '无 __system SDK 真实调用（注释命中不算）' };
}

/** 提取 <input type="range"> 标签的 class 列表 */
export function extractRangeClasses(text) {
  const out = [];
  const re = /<input\b[^>]*type=["']range["'][^>]*>/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const cls = /\bclass\s*=\s*["']([^"']*)["']/.exec(m[0]);
    out.push(cls ? cls[1].split(/\s+/).filter(Boolean) : []);
  }
  return out;
}

const CUSTOM_THUMB_RE =
  /::-webkit-slider-thumb|::-moz-range-thumb|::-webkit-slider-runnable-track|::-moz-range-track/;

/**
 * D 硬门禁（#227 要求④强制口径，任何阶段都 fail）：
 * 只管滑块单源本身 —— 每个 range 命中 .mdslider 且零自定义滑块伪元素。
 * 无 range 输入的应用天然通过（无需强行加锚，形态锚属于评分卡层）。
 */
export function checkDGate(text) {
  const classes = extractRangeClasses(text);
  const misses = classes.filter((cls) => !cls.includes('mdslider')).length;
  // 伪元素计数在剥离注释后进行 —— 文档注释里「禁止 ::-webkit-slider-thumb」这类
  // 提示字样不是定义（v10.38 实测模板头注误伤在录）
  const customs = (stripHtmlComments(stripCssJsComments(text)).match(CUSTOM_THUMB_RE) || []).length;
  const pass = misses === 0 && customs === 0;
  const parts = [];
  if (misses > 0) parts.push(`${misses} 个 range 未挂 .mdslider`);
  if (customs > 0) parts.push(`${customs} 处自定义滑块伪元素`);
  return {
    pass,
    detail: pass ? (classes.length ? `range×${classes.length} 全部命中组件` : '无 range 输入') : parts.join(' + '),
  };
}

/**
 * D 评分卡（#230 门槛 D 全文）：滑块单源 + 形态语言锚至少其一
 * （mdslider / pressRipple / squeeze-row；有 range 且已单源化则前者自动满足）。
 */
export function checkD(text) {
  const gate = checkDGate(text);
  const anchor = (text.match(/mdslider|pressRipple|squeeze-row/) || []).length;
  if (!gate.pass) return gate;
  if (anchor < 1) return { pass: false, detail: '滑块已单源但无形态语言锚（mdslider/pressRipple/squeeze-row）' };
  return { pass: true, detail: gate.detail };
}

/** I · 视觉令牌接入（#244 建议③ · v10.55）：状态层单面即可，或形状+字体双面组合。
 *  口径与 docs/visual-token-adoption.md 五面（D 状态层 / C 形状 / B 字体契约）同源；
 *  #244 边界：分档非硬阻断 —— 本项随评分卡 warn 曝光缺口，不设独立硬门禁。 */
export function checkI(text) {
  const state = (text.match(/var\(--md-state-/g) || []).length;
  const shape = (text.match(/var\(--md-r-/g) || []).length;
  const font = (text.match(/var\(--md-font[,)]|var\(--md-text-font/g) || []).length;
  const pass = state >= 1 || (shape >= 2 && font >= 1);
  return {
    pass,
    detail: pass
      ? `state×${state} / r×${shape} / font×${font}（状态层单面或形状+字体双面）`
      : `令牌面缺口：零状态层且形状/字体不同时达标（state×${state} / r×${shape} / font×${font}）`,
  };
}

/** E · 无障碍 */
export function checkE(text) {
  const hits =
    (text.match(/aria-[a-z]+|role\s*=|\balt\s*=|tabindex\s*=|<label[\s>]|for\s*=\s*["'][^"']+["']/g) || []).length;
  return { pass: hits >= 3, detail: `无障碍锚×${hits}（需 ≥3）` };
}

/** F · 视觉动效 */
export function checkF(text) {
  const hits = (text.match(/transition\s*:|animation\s*:|@keyframes/g) || []).length;
  // #245 批 1（R127 窗）：曲线令牌化率信息输出。口径：var(--md-easing-*（含
  // fallback 裸值）计为已令牌化；非 fallback 内裸 cubic-bezier 计为未收口。
  // pass 条件批 1 不收紧（#246 建议三「先告警分档不硬阻断」同律，防 43 项
  // baseline 水位误伤）；全库收口（批 2）完成后再评估收紧。
  const consumed = text.match(/var\(--md-easing-[a-z-]+,\s*cubic-bezier\([^)]*\)/g) || [];
  const rest = text.replace(/var\(--md-easing-[a-z-]+,\s*cubic-bezier\([^)]*\)/g, '');
  const bare = (rest.match(/cubic-bezier\(/g) || []).length;
  const total = consumed.length + bare;
  const pct = total ? Math.round((consumed.length / total) * 100) : 100;
  return {
    pass: hits >= 3,
    detail: `动效锚×${hits}（需 ≥3）· 曲线令牌化 ${consumed.length}/${total}（${pct}%）`,
  };
}

/** G · 数据持久化 */
export function checkG(text) {
  const hits = (text.match(/localStorage|indexedDB|__system\s*\.\s*fs/g) || []).length;
  return { pass: hits >= 1, detail: `持久化锚×${hits}` };
}

/**
 * #286 core 出口统计：应用域文本中 window.__xxxCore 范式出口数与被 tests 提及数。
 * 仅供 H 项量化 detail 展示（覆盖率可展示），不改 pass 判据；无 core 出口返回 null（调用方退化为旧格式）。
 * 全量 window.__ 出口注册表属 #278 车道，此处只取 *Core 范式（与 scripts/test-coverage-matrix.mjs 同口径）。
 */
export function coreStatsOf(text, testsText) {
  const cores = [...new Set((text.match(/window\.__[A-Za-z0-9_]+Core\b/g) || []).map((s) => s.slice(9)))];
  if (cores.length === 0) return null;
  return { coreTotal: cores.length, coreConsumed: cores.filter((c) => testsText.includes(c)).length };
}

/**
 * H · 测试覆盖：tests 正文引用 apps/<id>/。
 * #286 量化增强：传入 coreInfo（coreStatsOf 产物）时 detail 追加 core 消费比——pass 判据零变化
 * （两参调用与旧版逐字节一致，阴性回归锚 tests/v286 保护）。
 */
export function checkH(testsText, appId, coreInfo = null) {
  const hits = (testsText.match(new RegExp(`apps/${appId}[/'".\\-]`, 'g')) || []).length;
  const base = { pass: hits >= 1, detail: `tests 引用×${hits}` };
  if (!coreInfo) return base;
  return { ...base, detail: `${base.detail} · core ${coreInfo.coreConsumed}/${coreInfo.coreTotal} 被测试消费` };
}

/** 单应用 8 项审计。files: [{rel, text}]；testsText: 全库测试聚合文本 */
export function auditApp(appId, files, testsText, opts = {}) {
  const text = files.map((f) => f.text).join('\n');
  const items = {
    A: checkA(text),
    B: checkB(text),
    C: checkC(text),
    D: checkD(text),
    E: checkE(text),
    F: checkF(text),
    G: checkG(text),
    H: opts.exemptH
      ? { pass: true, detail: '模板无应用 id，H 豁免（不占评分）' }
      : checkH(testsText, appId, coreStatsOf(text, testsText)),
    I: checkI(text),
  };
  const failed = ITEM_KEYS.filter((k) => !items[k].pass);
  const score = ITEM_KEYS.length - failed.length;
  const tier = score >= 7 ? TIER.STANDARD : score >= 4 ? TIER.THIN : TIER.SEVERE;
  const visual = auditVisual(appId, text); // #243 视觉基线并行段（9 项制逻辑零变化）
  const touch = checkJ(text); // #294 触控目标并行段（报告级，9 项制逻辑零变化）
  return { appId, items, score, failed, tier, visual, touch, _text: text };
}

/** 收集一个应用目录的可扫描文件（跳过 vendor/ 与 *.min.*） */
export async function collectFiles(appDir) {
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === 'vendor') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { await walk(full); continue; }
      if (!SCANNABLE_EXT.includes(path.extname(e.name))) continue;
      if (/\.min\./.test(e.name)) continue;
      out.push({ rel: path.relative(appDir, full), text: await readFile(full, 'utf-8') });
    }
  }
  await walk(appDir);
  return out;
}

/** 全量扫描入口（#228 要求①：零硬编码清单） */
export async function scanApps(rootDir) {
  const appsRoot = path.join(rootDir, 'ios-desktop', 'apps');
  const testsRoot = path.join(rootDir, 'tests');
  const testFiles = existsSync(testsRoot)
    ? (await readdir(testsRoot)).filter((f) => f.endsWith('.test.js'))
    : [];
  let testsText = '';
  for (const f of testFiles) testsText += (await readFile(path.join(testsRoot, f), 'utf-8')) + '\n';

  const entries = await readdir(appsRoot, { withFileTypes: true });
  const appIds = entries.filter((e) => e.isDirectory() && e.name !== '_shared').map((e) => e.name).sort();
  const results = [];
  for (const id of appIds) {
    const files = await collectFiles(path.join(appsRoot, id));
    results.push(auditApp(id, files, testsText));
  }
  return { results, appIds, testsText };
}

/** 模板审计（#181 准入⑥语义：模板不达标 = 生成物天然不达标；不占应用计数 N） */
export async function auditTemplates(rootDir, testsText) {
  const out = [];
  const multiDir = path.join(rootDir, 'scripts', 'app-template-multi');
  if (existsSync(multiDir)) {
    const files = [];
    for (const f of ['index.html', 'style.css', 'app.mjs']) {
      const full = path.join(multiDir, f);
      if (existsSync(full)) files.push({ rel: f, text: await readFile(full, 'utf-8') });
    }
    out.push(auditApp('app-template-multi', files, testsText, { exemptH: true }));
  }
  const single = path.join(rootDir, 'scripts', 'app-template.html');
  if (existsSync(single)) {
    out.push(auditApp('app-template', [{ rel: 'app-template.html', text: await readFile(single, 'utf-8') }], testsText, { exemptH: true }));
  }
  return out;
}

/** 分档统计 */
export function tally(results) {
  const t = { [TIER.STANDARD]: 0, [TIER.THIN]: 0, [TIER.SEVERE]: 0 };
  for (const r of results) t[r.tier]++;
  return t;
}

/** 视觉基线水位回退比对（#243 · 报告级：只在 runQualityAudit 里 warn，不进 hardFailures） */
export function findVisualRegressions(results, baseline) {
  const regressions = [];
  for (const r of results) {
    const base = baseline[r.appId];
    if (!base) continue;
    const dropped = VISUAL_KEYS.filter((k) => base[k] === true && r.visual.items[k].pass === false);
    if (dropped.length) regressions.push({ appId: r.appId, dropped });
  }
  return regressions;
}

function visualBaselineFrom(results) {
  const base = {};
  for (const r of results) {
    base[r.appId] = {};
    for (const k of VISUAL_KEYS) base[r.appId][k] = r.visual.items[k].pass;
  }
  return base;
}

/** 基线回退比对：基线为 true 的项现在 false → 回退 */
export function findRegressions(results, baseline) {
  const regressions = [];
  for (const r of results) {
    const base = baseline[r.appId];
    if (!base) continue;
    const dropped = ITEM_KEYS.filter((k) => base[k] === true && r.items[k].pass === false);
    if (dropped.length) regressions.push({ appId: r.appId, dropped });
  }
  return regressions;
}

function baselineFrom(results) {
  const base = {};
  for (const r of results) {
    base[r.appId] = {};
    for (const k of ITEM_KEYS) base[r.appId][k] = r.items[k].pass;
  }
  return base;
}

/**
 * 构建期入口：全量扫描 + 打印 + 分期判定。
 * 返回 { checked, tally, results, templates, hardFailures, phase }；
 * hardFailures 非空 = 构建应 fail（vite.config.js 据此 throw）。
 */
export async function runQualityAudit(rootDir, opts = {}) {
  const phase = Number(opts.phase ?? process.env.APP_QUALITY_PHASE ?? 1);
  const log = opts.log || ((s) => console.log(s));

  const { results, appIds, testsText } = await scanApps(rootDir);
  const templates = await auditTemplates(rootDir, testsText);
  const t = tally(results);
  const checked = appIds.length;

  log(`[app-quality] 已检查 ${checked} 个应用 | 达标 ${t[TIER.STANDARD]} / 偏薄 ${t[TIER.THIN]} / 严重 ${t[TIER.SEVERE]}`);
  const severe = results.filter((r) => r.tier === TIER.SEVERE);
  if (severe.length) log(`[app-quality] 严重: ${severe.map((r) => r.appId).join(', ')}`);
  for (const r of results) {
    if (r.tier !== TIER.STANDARD) log(`[app-quality] ${r.tier} ${r.appId}(${r.score}/9) 缺 ${r.failed.join(',')}`);
  }
  for (const r of templates) {
    if (r.tier !== TIER.STANDARD) log(`[app-quality] 模板${r.tier} ${r.appId}(${r.score}/9) 缺 ${r.failed.join(',')}`);
  }

  // —— 视觉基线 V 清单报告段（#243 · 报告级非硬门禁：#243 §②「分档而非硬阻断」）——
  const vt = { [TIER.STANDARD]: 0, [TIER.THIN]: 0, [TIER.SEVERE]: 0 };
  for (const r of results) vt[r.visual.tier]++;
  log(`[visual-baseline] 视觉基线 V 清单 8 项（#243）| 达标 ${vt[TIER.STANDARD]} / 偏薄 ${vt[TIER.THIN]} / 严重 ${vt[TIER.SEVERE]}（报告级，非硬门禁）`);
  const allAudits = [...results, ...templates];
  const missingByItem = {};
  for (const r of allAudits) for (const k of r.visual.failed) (missingByItem[k] ||= []).push(r.appId);
  for (const k of VISUAL_KEYS) {
    if (missingByItem[k]?.length) log(`[visual-baseline] 缺 ${k}·${VISUAL_LABELS[k]}: ${missingByItem[k].join(' ')}`);
  }

  // —— 触控目标 J 段报告（#294 · 报告级非硬门禁：分档曝光不拦截，#243 先例同律）——
  const jt = { pass: 0, gap: 0 };
  for (const r of allAudits) r.touch.pass ? jt.pass++ : jt.gap++;
  log(`[touch-target] 触控命中区证据 J 项（#294 · ≥44px 静态可证）| 证据齐 ${jt.pass} / 缺口 ${jt.gap}（报告级，非硬门禁）`);
  const jMissing = allAudits.filter((r) => !r.touch.pass);
  if (jMissing.length) log(`[touch-target] 缺口: ${jMissing.map((r) => r.appId).join(' ')}`);

  // —— 巨石文件 K 段报告（#284 批 1 · 数据真源 monolith-inventory.json 三字段，零硬编码文件名）——
  const inventoryPath = path.join(rootDir, 'docs', 'audits', 'monolith-inventory.json');
  let monolithK = { available: false, detail: '生成件缺失（N/A 曝光不入判，gen-monolith-inventory.mjs 再生）' };
  if (existsSync(inventoryPath)) {
    try {
      monolithK = checkMonolithK(JSON.parse(await readFile(inventoryPath, 'utf-8')));
    } catch (e) {
      monolithK = { available: false, detail: `生成件解析失败：${e.message}（N/A 曝光不入判）` };
    }
  }
  if (monolithK.available) {
    log(`[monolith] 巨石 K 项（#284 · ${monolithK.detail}）（存量曝光报告级，违规拦截）`);
    if (monolithK.exposure.length) log(`[monolith] K-存量曝光（豁免只出不进，缩行不退出防乒乓）: ${monolithK.exposure.join(' ')}`);
  } else {
    log(`[monolith] ⚠ ${monolithK.detail}`);
  }

  const hardFailures = [];

  // ① D 滑块单源硬门禁（#227 要求④：任何阶段都硬 fail；只管滑块单源本身，
  //    不含形态锚条款 —— 后者属评分卡层，走分期，避免把 20 个无 range 应用一刀切红）
  for (const r of [...results, ...templates]) {
    const gate = checkDGate(r._text || '');
    if (!gate.pass) hardFailures.push(`[app-quality][D 门禁] ${r.appId}: ${gate.detail}`);
  }

  // ② 基线回退门禁（既有门禁强度不因全量化而变弱）
  const baselinePath = path.join(rootDir, 'scripts', 'quality-baseline.json');
  if (opts.writeBaseline) {
    const all = [...results, ...templates];
    await writeFile(baselinePath, JSON.stringify(baselineFrom(all), null, 2) + '\n');
    log(`[app-quality] 基线已写入 ${path.relative(rootDir, baselinePath)}（${all.length} 项）`);
  } else if (existsSync(baselinePath)) {
    const baseline = JSON.parse(await readFile(baselinePath, 'utf-8'));
    for (const reg of findRegressions([...results, ...templates], baseline)) {
      hardFailures.push(`[app-quality][基线回退] ${reg.appId} 曾达标项掉线: ${reg.dropped.join(',')}`);
    }
  }

  // ②a 巨石 K 段拦截（#284 批 1 · 增量拦截：K-违规（非豁免超阈）hardFailures 进位——
  //     K-存量曝光报告级不入判；不入 ITEM_KEYS 九项制、不动 A–I 锚与 v294 J6 负向锚；
  //     三字段失自洽一并拦截（数据真源防腐）；生成件缺失 N/A 不拦截（--check 闸守护））
  if (monolithK.available) {
    for (const o of monolithK.offending) {
      hardFailures.push(`[app-quality][K 违规] 非豁免超阈 ${o}（#284 · 拆分前须议题卷对账，boundary-map G8）`);
    }
    if (monolithK.anomalies) {
      hardFailures.push(`[app-quality][K 结构] 生成件三字段失自洽 ×${monolithK.anomalies}: ${monolithK.anomalyDetails.join(' ; ')}（gen-monolith-inventory.mjs 再生）`);
    }
  }

  // —— vendor O 段报告（#280 建议④ · 数据真源 vendor-consumers.json，K 段同款双轨）——
  const vendorInventoryPath = path.join(rootDir, 'docs', 'audits', 'vendor-consumers.json');
  let vendorO = { available: false, detail: '生成件缺失（N/A 曝光不入判，gen-vendor-audit.mjs --write 再生）' };
  if (existsSync(vendorInventoryPath)) {
    try {
      vendorO = checkVendorO(JSON.parse(await readFile(vendorInventoryPath, 'utf-8')));
    } catch (e) {
      vendorO = { available: false, detail: `生成件解析失败：${e.message}（N/A 曝光不入判）` };
    }
  }
  if (vendorO.available) {
    log(`[vendor-o] vendor O 项（#280 · ${vendorO.detail}）（孤儿拦截，候选提示级）`);
    if (vendorO.hints.length) log(`[vendor-o] 按需化候选（单消费方 ≥300KB，#280 §5）: ${vendorO.hints.join(' ')}`);
  } else {
    log(`[vendor-o] ⚠ ${vendorO.detail}`);
  }

  // ②a-2 vendor O 段拦截（#280 建议④ · 孤儿库 hardFailures 进位 + classification 失自洽拦截；
  //     按需化候选提示级不入判；生成件缺失 N/A 不拦截（gen-vendor-audit --check 闸守护））
  if (vendorO.available) {
    for (const p of vendorO.orphanList) {
      hardFailures.push(`[app-quality][O 违规] vendor 孤儿库 ${p}（#280 建议④ · 零消费方防积压，接入前先立卡）`);
    }
    if (vendorO.anomalies) {
      hardFailures.push(`[app-quality][O 结构] 生成件 classification 失自洽 ×${vendorO.anomalies}: ${vendorO.anomalyDetails.join(' ; ')}（gen-vendor-audit.mjs --write 再生）`);
    }
  }

  // ②b 视觉基线水位（#243 · 开卡快照 + 回退 warn-only，报告级非硬门禁）
  const visualBaselinePath = path.join(rootDir, 'scripts', 'visual-baseline.json');
  if (opts.writeVisualBaseline) {
    await writeFile(visualBaselinePath, JSON.stringify(visualBaselineFrom(allAudits), null, 2) + '\n');
    log(`[visual-baseline] 视觉基线水位已写入 ${path.relative(rootDir, visualBaselinePath)}（${allAudits.length} 项）`);
  } else if (existsSync(visualBaselinePath)) {
    const vb = JSON.parse(await readFile(visualBaselinePath, 'utf-8'));
    for (const reg of findVisualRegressions(allAudits, vb)) {
      log(`[visual-baseline] ⚠ 水位回退（报告级） ${reg.appId} 掉线: ${reg.dropped.join(',')}`);
    }
  }

  // ③ 分期（#230 §四）
  if (phase >= 3) {
    for (const r of [...results, ...templates]) {
      if (r.tier !== TIER.STANDARD) hardFailures.push(`[app-quality][阶段3] ${r.appId}(${r.score}/9) 缺 ${r.failed.join(',')}`);
    }
  } else if (phase === 2) {
    for (const r of [...results, ...templates]) {
      if (r.tier === TIER.SEVERE) hardFailures.push(`[app-quality][阶段2] 严重档 ${r.appId}(${r.score}/9) 缺 ${r.failed.join(',')}`);
    }
  }

  const visualTally = { [TIER.STANDARD]: 0, [TIER.THIN]: 0, [TIER.SEVERE]: 0 };
  for (const r of results) visualTally[r.visual.tier]++;

  return { checked, tally: t, results, templates, hardFailures, phase, visualTally, touchTally: jt, monolithK };
}

/** CLI 直跑 */
export async function main(argv = process.argv.slice(2)) {
  const rootDir = path.resolve(argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : '.');
  const writeBaseline = argv.includes('--write-baseline');
  const writeVisualBaseline = argv.includes('--write-visual-baseline');
  const asJson = argv.includes('--json');
  const res = await runQualityAudit(rootDir, { writeBaseline, writeVisualBaseline, log: asJson ? () => {} : undefined });
  if (asJson) {
    console.log(JSON.stringify({
      checked: res.checked,
      tally: res.tally,
      apps: res.results.map((r) => ({ id: r.appId, score: r.score, tier: r.tier, failed: r.failed })),
      templates: res.templates.map((r) => ({ id: r.appId, score: r.score, tier: r.tier, failed: r.failed })),
      visual: {
        tally: res.visualTally,
        apps: res.results.map((r) => ({ id: r.appId, score: r.visual.score, tier: r.visual.tier, failed: r.visual.failed })),
        templates: res.templates.map((r) => ({ id: r.appId, score: r.visual.score, tier: r.visual.tier, failed: r.visual.failed })),
      },
      touch: {
        min: TOUCH_MIN_PX,
        pass: res.touchTally.pass,
        gap: res.touchTally.gap,
        apps: res.results.map((r) => ({ id: r.appId, touch: r.touch.pass, detail: r.touch.detail })),
        templates: res.templates.map((r) => ({ id: r.appId, touch: r.touch.pass, detail: r.touch.detail })),
      },
      monolith: res.monolithK.available ? {
        threshold: res.monolithK.threshold,
        over: res.monolithK.over,
        exemptHits: res.monolithK.exemptHits,
        violations: res.monolithK.violations,
        exposure: res.monolithK.exposure,
        offending: res.monolithK.offending,
        anomalies: res.monolithK.anomalies,
      } : { available: false, detail: res.monolithK.detail },
      hardFailures: res.hardFailures,
    }, null, 2));
  }
  if (res.hardFailures.length) {
    console.error(`[app-quality] 门禁不通过（${res.hardFailures.length} 项）：\n` + res.hardFailures.map((s) => `  - ${s}`).join('\n'));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  await main();
}
