// ==================== claim-registry.mjs — #233 认领租约（TTL）+ 僵尸回收协议脚本化 ====================
//
// #233 §四 落地物：「扫全部 open issue 的 CLAIM| 字段 → 输出活跃/僵尸/已释放清单 + now-at 分钟数」。
// #234 ②：状态从 append-only 评论流搬进 docs/HANDOFF.md 结构化快照（本脚本 --json/--md 供其直读组装）。
//
// 协议要点（实现逐条对应 #233 正文，勿凭记忆）：
//   · CLAIM_TTL = 24h / 1440min，认领时刻起算（§八 用户裁决 2026-11-07；旧 90min 与「跨槽 +30min」已删除）
//   · 硬失效：a) 交付帖/释放帖/state=closed → released；b) now-at > ttl → stale；c) 【人工回收】帖 → 随时解锁不受 TTL 约束
//   · 软预警：>4h 且评论流零痕迹 → SUSPICIOUS（不解锁、不产生抢占资格，与 STALE 严格区分 §二补偿①）
//   · 续期信号只有交付帖/心跳帖；取号预告/窗报/补账只算「痕迹」不续期（§二）
//   · 【判活】帖 → ALIVE_CONFIRMED，豁免 SUSPICIOUS 与 NEEDS_REVIEW，不自动补关（§九②）
//   · 交付帖 + state=open + 无 pending-verification 标签 → NEEDS_REVIEW（提示级，不自动补关 §七③）
//   · pending-verification 白名单：车道立即释放（claims 移除），state 仍 open（§七④）——锁判定用 lane 状态而非单看 state
//   · 失效判定由后来者单方面按公开时间戳算出，绝不依赖原实例（§二设计要点）
//
// 纯核（可测）与 IO（CLI/REST）分离；本脚本零产品代码改动（#233 归属边界）。
// 用法：
//   node scripts/claim-registry.mjs --issues 229,253          # 扫指定议题
//   node scripts/claim-registry.mjs --all-open                # 扫全部 open 议题
//   node scripts/claim-registry.mjs --json|--md               # 输出格式（供 HANDOFF 组装）
//   node scripts/claim-registry.mjs --template --issue 229 --instance X --slot R126 --lane 'a.js,b/*'
//   环境变量 GH_TOKEN / GH_PAT 可选（公开仓库匿名可读，PAT 仅提速率限额）

const TTL_MIN_DEFAULT = 1440;      // §八 24h
const SUSPICIOUS_MIN = 240;        // §二补偿① 4h 软预警
const RELEASE_SIGNALS = { DELIVERY: 'delivery', RELEASE: 'release', MANUAL_RECLAIM: 'manual-reclaim', CLOSED: 'closed' };
const LEASE_STATUS = { ACTIVE: 'active', SUSPICIOUS: 'suspicious', STALE: 'stale', RELEASED: 'released', ALIVE_CONFIRMED: 'alive_confirmed' };

/** 解析一条评论正文中的 CLAIM 租约行（key=value 正规形态，位置形态向后兼容）。
 *  返回 null（无 CLAIM 行）或 {invalid?, reason?, issue, instance, slot, at, ttlMin, lane, claimComment} */
export function parseClaimLease(body) {
  if (!body || typeof body !== 'string') return null;
  const m = body.match(/CLAIM\s*\|([^\n]+)/);
  if (!m) return null;
  const raw = m[1].trim();
  const parts = raw.split('|').map((s) => s.trim());
  const kv = {};
  let positional = [];
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq > 0) kv[p.slice(0, eq).toLowerCase()] = p.slice(eq + 1).trim();
    else if (p) positional.push(p);
  }
  const get = (k, i) => kv[k] || positional[i] || '';
  const issue = get('issue', 0);
  const instance = get('instance', 1);
  const slot = get('slot', 2);
  const at = get('at', 3);
  const ttlRaw = get('ttl', 4);
  const lane = get('lane', 5);
  const claimComment = get('claim_comment', 6) || get('claimcomment', 6);
  // 必填校验（#233 §三①）：issue / instance / slot / at / ttl / lane / claim_comment
  // （lane 缺失 → 拒绝，#233 验收⑤「缺 lane 字段拒绝发送」的解析侧同源判定）
  const missing = [];
  if (!issue) missing.push('issue');
  if (!instance) missing.push('instance');
  if (!slot) missing.push('slot');
  if (!at) missing.push('at');
  if (!ttlRaw) missing.push('ttl');
  if (!lane) missing.push('lane');
  const atMs = Date.parse(at);
  if (!atMs || Number.isNaN(atMs)) missing.push('at(ISO 不可解析)');
  if (missing.length) return { invalid: true, reason: `CLAIM 缺必填字段: ${missing.join('/')}`, issue, instance, raw: raw.slice(0, 80) };
  const ttlMin = /^(\d+)\s*h$/i.test(ttlRaw) ? parseInt(ttlRaw, 10) * 60
    : /^(\d+)\s*m?$/i.test(ttlRaw) ? parseInt(ttlRaw, 10)
    : NaN;
  if (!Number.isFinite(ttlMin) || ttlMin <= 0) return { invalid: true, reason: `ttl 不可解析: ${ttlRaw}`, issue, instance, raw: raw.slice(0, 80) };
  return { invalid: false, issue: String(issue).replace(/^#/, ''), instance, slot, atIso: at, atMs, ttlMin, lane, claimComment, raw };
}

/** 信号帖判定（交付/释放/人工回收/判活/心跳痕迹）——正文前部标记优先，R 系历史帖「## 【交付】…」「## 【交付·实例A·…】」两型在录 */
function classifyPost(body) {
  const b = (body || '').slice(0, 400);
  if (/【人工回收】/.test(b)) return 'manual-reclaim';
  if (/【判活】/.test(b)) return 'alive';
  if (/【释放】/.test(b)) return 'release';
  if (/【交付[·】]/.test(b) || /^##\s*【交付】/.test(b)) return 'delivery';
  if (/【抢占[··]?僵尸回收】/.test(b)) return 'preempt';
  return null;
}

/** 单议题租约状态计算（#233 §二/§七/§九 全语义）。
 *  input: { lease, issueState, issueLabels[], comments[{id,createdAt,body}], nowMs }
 *  output: { status, minutes, reason, pendingVerification }
 *  优先级：closed/人工回收/释放/交付（释放族）> 判活 > stale > suspicious > active —— 人工回收优先于自动逾期（§二） */
export function computeLeaseStatus({ lease, issueState, issueLabels = [], comments = [], nowMs = Date.now() }) {
  const minutes = Math.round((nowMs - lease.atMs) / 60000);
  // 认领帖自身（含任何 CLAIM| 行评论）不算「痕迹」——它是锁本体，不是在途活性信号
  const isClaimPost = (b) => /CLAIM\s*\|/.test((b || '').slice(0, 400));
  const later = (comments || [])
    .filter((c) => Date.parse(c.createdAt) > lease.atMs && !isClaimPost(c.body))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const pendingVerification = issueLabels.includes('pending-verification');
  if (issueState === 'closed') return { status: LEASE_STATUS.RELEASED, minutes, reason: 'state=closed（结构化释放信号，§七①）', pendingVerification };
  // 释放族扫描（时序：取认领之后的最新信号帖）
  let delivered = null;
  for (const c of later) {
    const k = classifyPost(c.body);
    if (k === 'manual-reclaim') return { status: LEASE_STATUS.RELEASED, minutes, reason: `【人工回收】帖 ${c.id}（不受 TTL 约束，随时解锁 §二⑤）`, pendingVerification };
    if (k === 'release') return { status: LEASE_STATUS.RELEASED, minutes, reason: `【释放】帖 ${c.id}（主动放弃立即解锁 §四）`, pendingVerification };
    if (k === 'delivery') delivered = c;
  }
  if (delivered) {
    if (pendingVerification) return { status: LEASE_STATUS.RELEASED, minutes, reason: `交付帖 ${delivered.id} + pending-verification（§七④ 车道立即释放，state 留 open 待核）`, pendingVerification: true };
    return { status: LEASE_STATUS.RELEASED, minutes, reason: `交付帖 ${delivered.id}（§二 a）`, pendingVerification };
  }
  // 判活：豁免 SUSPICIOUS 与 NEEDS_REVIEW，不自动补关（§九②）
  const alive = later.find((c) => classifyPost(c.body) === 'alive');
  if (alive) return { status: LEASE_STATUS.ALIVE_CONFIRMED, minutes, reason: `【判活】帖 ${alive.id}（勿回收，豁免软预警 §九②）`, pendingVerification };
  // 硬逾期（TTL 绝对阈值，续期帖不延长——续期只认交付/心跳，心跳在录亦不改 ttl 值 §二）
  if (minutes > lease.ttlMin) return { status: LEASE_STATUS.STALE, minutes, reason: `now-at=${minutes}min > ttl=${lease.ttlMin}min 且无交付/释放/人工回收（§二 b）`, pendingVerification };
  // 软预警：>4h 且评论流零痕迹（任何后继评论都算痕迹；预告/窗报只算痕迹不续期 §二）
  if (minutes > SUSPICIOUS_MIN && later.length === 0) {
    return { status: LEASE_STATUS.SUSPICIOUS, minutes, reason: `now-at=${minutes}min > 4h 且评论流零痕迹 → SUSPICIOUS（不解锁不抢占，§二补偿①）`, pendingVerification };
  }
  return { status: LEASE_STATUS.ACTIVE, minutes, reason: minutes > SUSPICIOUS_MIN ? `${minutes}min（有痕迹在途）` : `${minutes}min`, pendingVerification };
}

/** 议题级提示：有交付帖 + state=open + 无 pending-verification + 无【判活】 → NEEDS_REVIEW（§七③ 提示级不自动补关） */
export function computeIssueFlag({ issueState, issueLabels = [], comments = [], nowMs = Date.now() }) {
  if (issueState !== 'open') return { flag: null, reason: 'state≠open' };
  const labels = issueLabels || [];
  if (labels.includes('pending-verification')) return { flag: 'pending_verification', reason: '白名单标签在位（§7.7）' };
  const sorted = (comments || []).slice().sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const delivered = sorted.filter((c) => classifyPost(c.body) === 'delivery').pop();
  const alive = sorted.some((c) => classifyPost(c.body) === 'alive');
  if (delivered && alive) return { flag: 'alive_confirmed', reason: `交付帖 ${delivered.id} + 【判活】豁免（§九②）` };
  if (delivered) return { flag: 'needs_review', reason: `交付帖 ${delivered.id} + open + 无 pending-verification（提示级，不自动补关 §七③）` };
  return { flag: null, reason: '无交付帖' };
}

// ---------- REST IO（CLI 侧；纯核之上薄封装） ----------
const REPO = 'ariefenv-hash/md3';
function ghHeaders() {
  const t = process.env.GH_TOKEN || process.env.GH_PAT || '';
  const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'md3-claim-registry' };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}
async function ghGet(url) {
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}
async function listOpenIssues() {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const arr = await ghGet(`https://api.github.com/repos/${REPO}/issues?state=open&per_page=100&page=${page}`);
    out.push(...arr.filter((i) => !i.pull_request));
    if (arr.length < 100) break;
  }
  return out;
}
async function issueComments(number) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const arr = await ghGet(`https://api.github.com/repos/${REPO}/issues/${number}/comments?per_page=100&page=${page}`);
    out.push(...arr.map((c) => ({ id: c.id, createdAt: c.created_at, body: c.body || '' })));
    if (arr.length < 100) break;
  }
  return out;
}

function fmtTable(rows) {
  const lines = [`[claim] TTL=24h | 活跃 ${rows.filter((r) => r.status === 'active').length} | 僵尸 ${rows.filter((r) => r.status === 'stale').length} | 已释放 ${rows.filter((r) => r.status === 'released').length} | SUSPICIOUS ${rows.filter((r) => r.status === 'suspicious').length} | ALIVE_CONFIRMED ${rows.filter((r) => r.status === 'alive_confirmed').length}`];
  for (const r of rows) {
    lines.push(`  ${r.status.toUpperCase().padEnd(16)} #${r.issue} ${r.instance} ${r.slot} ${r.minutes}min lane=${r.lane}`);
    lines.push(`      ${r.reason}`);
  }
  return lines.join('\n');
}

async function main() {
  const argv = process.argv.slice(2);
  const has = (f) => argv.includes(f);
  const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
  if (has('--template')) {
    const issue = val('--issue') || 'N';
    const instance = val('--instance') || 'INSTANCE';
    const slot = val('--slot') || 'SLOT';
    const lane = val('--lane') || '';
    const ttl = val('--ttl') || '24h';
    if (!lane) { console.error('[claim] 拒绝：lane 必填（#233 验收⑤）；lane=正面声明将触碰的文件/目录'); process.exit(2); }
    console.log(`【认领】#${issue}（${instance} · ${slot}）\n\nCLAIM|issue=${issue}|instance=${instance}|slot=${slot}|at=${new Date().toISOString()}|ttl=${ttl}|lane=${lane}|claim_comment=本帖\n\n（三查实录随帖补：目标议题评论区零在先 + worklog 续点候选 + origin/main 对齐）`);
    return;
  }
  const targets = has('--all-open')
    ? (await listOpenIssues()).map((i) => ({ n: i.number, state: i.state, labels: i.labels.map((l) => l.name) }))
    : (val('--issues') || '').split(',').map((s) => parseInt(s, 10)).filter(Boolean)
        .map((n) => ({ n, state: undefined, labels: [] }));
  if (!targets.length) { console.error('用法：--issues 229,253 | --all-open | --template（见文件头注释）'); process.exit(2); }
  const nowMs = Date.now();
  const rows = [];
  const flags = [];
  for (const t of targets) {
    let meta = { state: t.state, labels: t.labels };
    if (meta.state === undefined) {
      const full = await ghGet(`https://api.github.com/repos/${REPO}/issues/${t.n}`);
      meta = { state: full.state, labels: full.labels.map((l) => l.name) };
    }
    const comments = await issueComments(t.n);
    const fl = computeIssueFlag({ issueState: meta.state, issueLabels: meta.labels, comments, nowMs });
    if (fl.flag) flags.push({ issue: t.n, ...fl });
    let claimBody = null;
    for (const c of comments) { const p = parseClaimLease(c.body); if (p && !p.invalid) { claimBody = { ...p, createdAt: c.createdAt, commentId: c.id }; } }
    if (claimBody) {
      const st = computeLeaseStatus({ lease: claimBody, issueState: meta.state, issueLabels: meta.labels, comments, nowMs });
      rows.push({ issue: t.n, instance: claimBody.instance, slot: claimBody.slot, lane: claimBody.lane, minutes: st.minutes, status: st.status, reason: st.reason });
    }
  }
  if (has('--json')) {
    console.log(JSON.stringify({ now: new Date(nowMs).toISOString(), claims: rows, flags }, null, 2));
  } else {
    console.log(fmtTable(rows));
    if (flags.length) console.log(`  ⚠ 议题级提示：${flags.map((f) => `#${f.issue} ${f.flag}`).join(' / ')}（NEEDS_REVIEW 为提示级，不自动补关 §七③）`);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || (process.argv[1] || '').endsWith('claim-registry.mjs')) {
  main().catch((e) => { console.error('[claim] ERROR:', e.message); process.exit(1); });
}
