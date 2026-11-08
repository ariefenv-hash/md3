// #266 workflow YAML 结构 lint（零依赖纯逻辑核 + CLI）
// 背景：deploy.yml 触发分支过滤器曾以裸标量损坏态 `branches: ain]` 在树上存活
// （GitHub 对无效过滤器回退触发，配置漂移被掩盖）——本 lint 让损坏在 CI 必然变红。
// 形态规则：
//   ① on: 段必须存在；② jobs: 段必须存在；
//   ③ on.push.branches 若存在，必须是列表形态（同行为 `[...]` 或次行为 `- item` 连续项），
//      裸标量（如 `branches: ain]`）= 错误；
//   ④ 列表形态必须括号配对（`[` 先于 `]`，不得只有 `]`）；
//   ⑤ branches 列表必须含 `main`（本仓唯一部署分支）。
// 设计约束：纯字符串解析零 YAML 依赖；导出 lintWorkflow / parseBranchList 供 vitest 穷举；
// CLI 遍历 .github/workflows/*.yml 任一失败 exit 1。

const TOP_ON = /^on:\s*$/;
const TOP_JOBS = /^jobs:\s*$/;
const PUSH_KEY = /^(\s{2})push:\s*$/;
const BRANCHES_KEY = /^(\s+)branches:(.*)$/;
const LIST_ITEM = /^(\s+)-\s*(.+)$/;

/** 解析 branches 值 → { list: string[] | null, error: string | null } */
export function parseBranchList(raw) {
  const t = (raw || '').trim();
  if (!t) return { list: null, error: null }; // 无同行值 → 次行列表由 lintWorkflow 处理
  if (t.startsWith('[')) {
    if (!t.endsWith(']')) {
      return { list: null, error: `branches 列表括号不配对（缺 ']'）: ${t}` };
    }
    const inner = t.slice(1, -1);
    const items = inner.split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    if (items.length === 0) return { list: null, error: `branches 列表为空: ${t}` };
    if (items.some((x) => !x)) return { list: null, error: `branches 列表含空项: ${t}` };
    return { list: items, error: null };
  }
  // 裸标量（含历史损坏态 `ain]`）：GitHub 会回退触发，配置漂移被掩盖 —— 一律拒绝
  return { list: null, error: `branches 必须为列表形态（[name] 或次行 - item），得裸标量: ${t}` };
}

/** 对单个 workflow 文本做结构 lint → { ok, errors: string[] } */
export function lintWorkflow(text) {
  const errors = [];
  const lines = text.split('\n');

  const hasOn = lines.some((l) => TOP_ON.test(l));
  if (!hasOn) errors.push('缺少顶层 `on:` 触发段');
  const hasJobs = lines.some((l) => TOP_JOBS.test(l));
  if (!hasJobs) errors.push('缺少顶层 `jobs:` 段');
  if (errors.length) return { ok: false, errors };

  // 定位 on: 段范围（到下一个顶层键或文件尾）
  const onIdx = lines.findIndex((l) => TOP_ON.test(l));
  let onEnd = lines.length;
  for (let i = onIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^[A-Za-z_][A-Za-z0-9_-]*:\s*$/.test(l) || /^('|").*\1:\s*$/.test(l)) { onEnd = i; break; }
  }
  const onBlock = lines.slice(onIdx, onEnd);

  // push 子段（若存在）
  const pushIdx = onBlock.findIndex((l) => PUSH_KEY.test(l));
  let branchesList = null;
  if (pushIdx >= 0) {
    let pushEnd = onBlock.length;
    for (let i = pushIdx + 1; i < onBlock.length; i++) {
      const l = onBlock[i];
      if (/^\s{2}[A-Za-z_][A-Za-z0-9_-]*:\s*$/.test(l)) { pushEnd = i; break; }
    }
    const pushBlock = onBlock.slice(pushIdx, pushEnd);
    const brIdx = pushBlock.findIndex((l) => BRANCHES_KEY.test(l));
    if (brIdx >= 0) {
      const m = pushBlock[brIdx].match(BRANCHES_KEY);
      const brIndent = m[1].length;
      const parsed = parseBranchList(m[2]);
      if (parsed.error) {
        errors.push(`on.push.branches: ${parsed.error}`);
      } else if (parsed.list) {
        branchesList = parsed.list;
      } else {
        // 次行 `- item` 连续列表
        const items = [];
        for (let i = brIdx + 1; i < pushBlock.length; i++) {
          const im = pushBlock[i].match(LIST_ITEM);
          if (!im || im[1].length <= brIndent) break;
          items.push(im[2].trim().replace(/^['"]|['"]$/g, ''));
        }
        if (items.length === 0) {
          errors.push('on.push.branches: 次行列表为空或缩进不匹配');
        } else {
          branchesList = items;
        }
      }
    }
  }

  if (branchesList) {
    if (!branchesList.includes('main')) {
      errors.push(`on.push.branches 必须含 main（本仓唯一部署分支），实际: [${branchesList.join(', ')}]`);
    }
    if (branchesList.some((x) => /\]\[|\s{2,}/.test(x))) {
      errors.push(`on.push.branches 列表项形态异常: [${branchesList.join(', ')}]`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export default { lintWorkflow, parseBranchList };
