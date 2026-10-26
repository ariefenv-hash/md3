// ==================== v8.35 #80：定时任务产出瘦身（驾驶舱原地更新）====================
//
// #80 双增殖点改造：
//   ① daily-issue-brief 每日「追加」新评论（gh issue comment）→ 改为唯一
//      <!-- cockpit --> 驾驶舱评论原地 PATCH；
//   ② issue-patrol 已原地更新但内容仍是全量盘点 → 改为与简报共用同一条
//      驾驶舱评论，内容 diff 化（一行摘要 + 变更区，不再贴 50 条列表）。
// 核心机制（.github/cockpit.sh）：
//   指纹 = md5(开放议题号集合（排除跟踪议题自身）+ 门禁态) 存隐藏块；
//   指纹不变 → 静默轮（仅刷新时间戳，「本轮无变化」，日志逐字保留）；
//   指纹变 → 开/关/门禁翻转事件进 24h 滚动日志（≤20 条 + 24h 过滤）；
//   首启收编最旧机器评论（patrol-snapshot/旧简报）+ 清扫其余机器评论
//   （作者=github-actions[bot] 且带机器标记双守卫，人工评论绝不触碰）。
//
// 测试方法：有状态 fake-gh shim（PATH 注入）——PATCH/DELETE/CREATE 全记录，
// 评论 JSON 按状态叠加（overlay/extra/deleted），完整行为级验证 #80 DoD。
// 测试纪律（worklog 惯例）：负断言用 not.toMatch 正则防注释误报。

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const SH = join(ROOT, '.github', 'cockpit.sh');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

// ---------- 有状态 fake-gh shim（无 ${...} 括号形式，便于 JS 模板串承载）----------
const SHIM = [
  '#!/usr/bin/env bash',
  'set -u',
  'STATE="${GH_STATE_DIR:?}"; F="${GH_FIXTURE_DIR:?}"',
  'mkdir -p "$STATE"',
  'LOG="$STATE/actions.log"',
  'note(){ echo "$*" >> "$LOG"; }',
  'cmd="$1"; shift',
  'case "$cmd" in',
  '  issue)',
  '    sub="$1"; shift',
  '    if [ "$sub" = "list" ]; then',
  '      if printf "%s\\n" "$@" | grep -q -- "--search"; then',
  '        cat "$F/tracking.json"',
  '      else',
  '        cat "$F/issues.json"',
  '      fi',
  '    elif [ "$sub" = "comment" ]; then',
  '      num=""; bf=""',
  '      while [ $# -gt 0 ]; do',
  '        case "$1" in',
  '          --body-file) bf="$2"; shift 2;;',
  '          *) num="$1"; shift;;',
  '        esac',
  '      done',
  '      nid=$(cat "$STATE/next_id" 2>/dev/null || echo 9100)',
  '      nid=$((nid+1)); echo "$nid" > "$STATE/next_id"',
  '      jq -n --argjson id "$nid" --arg b "$(cat "$bf")" --argjson extra "$(cat "$STATE/extra.json" 2>/dev/null || echo \'[]\')" \'. + [{id: $id, user: {login: "github-actions[bot]"}, created_at: "2027-01-01T00:00:00Z", body: $b}]\' > "$STATE/extra.json.tmp" && mv "$STATE/extra.json.tmp" "$STATE/extra.json"',
  '      note "CREATE_COMMENT num=$num id=$nid"',
  '      echo "https://fake/comment/$nid"',
  '    elif [ "$sub" = "create" ]; then',
  '      t=""; bf=""',
  '      while [ $# -gt 0 ]; do',
  '        case "$1" in',
  '          --title) t="$2"; shift 2;;',
  '          --body-file) bf="$2"; shift 2;;',
  '          *) shift;;',
  '        esac',
  '      done',
  '      note "CREATE_ISSUE title=$t"',
  '      cp "$bf" "$STATE/created-issue-body.md"',
  '      echo "https://fake/issue/new"',
  '    fi ;;',
  '  api)',
  '    method="GET"; url=""; bval=""',
  '    while [ $# -gt 0 ]; do',
  '      case "$1" in',
  '        -X) method="$2"; shift 2;;',
  '        -f) shift; bval="$1"; shift;;',
  '        *) url="$1"; shift;;',
  '      esac',
  '    done',
  '    case "$method" in',
  '      GET)',
  '        case "$url" in',
  '          */comments*)',
  '            DELS=$(cat "$STATE/deleted" 2>/dev/null || echo "")',
  '            jq -n --argjson base "$(cat "$F/comments.json" 2>/dev/null || echo \'[]\')" --argjson ov "$(cat "$STATE/overlay.json" 2>/dev/null || echo \'{}\')" --argjson extra "$(cat "$STATE/extra.json" 2>/dev/null || echo \'[]\')" --arg d "$DELS" \'($d | split("\\n") | map(select(length > 0) | tonumber)) as $del | ($base + $extra | map(. as $c | if ($ov | has(($c.id | tostring))) then ($c + {body: $ov[($c.id | tostring)]}) else $c end) | map(select([.id] | inside($del) | not)))\'',
  '            ;;',
  '          *) echo "{}" ;;',
  '        esac ;;',
  '      PATCH)',
  '        cid=$(basename "$url")',
  '        b="${bval#body=}"',
  '        jq -n --argjson ov "$(cat "$STATE/overlay.json" 2>/dev/null || echo \'{}\')" --arg id "$cid" --arg b "$b" \'($ov + {($id): $b})\' > "$STATE/overlay.json.tmp" && mv "$STATE/overlay.json.tmp" "$STATE/overlay.json"',
  '        note "PATCH_COMMENT id=$cid"',
  '        ;;',
  '      DELETE)',
  '        cid=$(basename "$url")',
  '        echo "$cid" >> "$STATE/deleted"',
  '        note "DELETE_COMMENT id=$cid"',
  '        ;;',
  '    esac ;;',
  'esac',
  'exit 0',
].join('\n');

// ---------- 工具 ----------
function makeEnv() {
  const dir = mkdtempSync(join(tmpdir(), 'cockpit-'));
  const bin = join(dir, 'bin');
  const state = join(dir, 'state');
  const fix = join(dir, 'fix');
  mkdirSync(bin, { recursive: true });
  mkdirSync(state);
  mkdirSync(fix);
  writeFileSync(join(bin, 'gh'), SHIM, { mode: 0o755 });
  return { dir, bin, state, fix };
}

function writeFixtures(env, { comments = [], issues = [], tracking = '17' }) {
  writeFileSync(join(env.fix, 'comments.json'), JSON.stringify(comments));
  writeFileSync(join(env.fix, 'issues.json'), JSON.stringify(issues));
  writeFileSync(join(env.fix, 'tracking.json'), tracking);
}

function runCockpit(env, gate, extraArgs = []) {
  // gate 语义：1=通过 → 写 vitest 退出码文件 "0"（脚本按退出码判门禁）
  const gateF = join(env.dir, 'gate.exit');
  const tailF = join(env.dir, 'gate.tail');
  writeFileSync(gateF, gate === 1 ? '0' : '1');
  writeFileSync(tailF, 'mock vitest tail lines');
  return execFileSync('bash', [SH, gateF, tailF, ...extraArgs], {
    env: {
      ...process.env,
      PATH: env.bin + ':' + process.env.PATH,
      GH_STATE_DIR: env.state,
      GH_FIXTURE_DIR: env.fix,
      GITHUB_REPOSITORY: 'ariefenv-hash/md3',
    },
    encoding: 'utf8',
  });
}

const actions = (env) =>
  existsSync(join(env.state, 'actions.log'))
    ? readFileSync(join(env.state, 'actions.log'), 'utf8').trim().split('\n')
    : [];
const overlayOf = (env, id) =>
  JSON.parse(readFileSync(join(env.state, 'overlay.json'), 'utf8'))[String(id)] || '';
const logSection = (body) => {
  const i = body.indexOf('### 近 24h 变更日志');
  return i < 0 ? '' : body.slice(i);
};

// 现状镜像：#17 现存 5 评论（3 机器 + 2 人工），跟踪议题号 17
const HUMAN1 = { id: 3, user: { login: 'ariefenv-hash' }, created_at: '2026-10-25T04:53:03Z', body: '## 议题池整理完成（2026-10-25）' };
const HUMAN2 = { id: 4, user: { login: 'ariefenv-hash' }, created_at: '2026-10-25T07:20:28Z', body: '## 本跟踪议题将被改造为「驾驶舱」单条评论（见 #80）' };
const BRIEF_OLD = { id: 1, user: { login: 'github-actions[bot]' }, created_at: '2026-10-24T19:11:56Z', body: '## 每日简报 2026-10-25 03:11\n\n### 开放议题盘点（按提出顺序，即建议执行顺序）\n- #17 每日简报' };
const SNAPSHOT = { id: 2, user: { login: 'github-actions[bot]' }, created_at: '2026-10-24T22:59:57Z', body: '<!-- patrol-snapshot -->\n## 巡逻快照 2026-10-26 13:11\n\n### 开放议题\n- #80 【系统·流程】定时任务产出瘦身' };
const BRIEF_NEW = { id: 5, user: { login: 'github-actions[bot]' }, created_at: '2026-10-25T19:25:45Z', body: '## 每日简报 2026-10-26 03:25\n\n### 开放议题盘点' };
// 人工评论即使带「## 每日简报」开头也绝不触碰（作者守卫）
const HUMAN_MISLEAD = { id: 6, user: { login: 'ariefenv-hash' }, created_at: '2026-10-26T10:00:00Z', body: '## 每日简报 人工补充说明' };

function defaultIssues(n = 66) {
  const arr = Array.from({ length: n }, (_, i) => ({ number: 100 + i, title: '开放议题' + i }));
  arr.push({ number: 17, title: '每日简报（定时任务落地跟踪）' }); // 跟踪议题自身混入开放列表
  return arr;
}
const BASE_COMMENTS = [BRIEF_OLD, SNAPSHOT, HUMAN1, HUMAN2, BRIEF_NEW, HUMAN_MISLEAD];

describe('v8.35 #80 首启收编 + 清扫（DoD：#17 机器评论收敛为 1 条）', () => {
  it('收编最旧机器评论为驾驶舱、清扫其余机器评论、人工评论（含误导标记者）绝不触碰', () => {
    const env = makeEnv();
    writeFixtures(env, { comments: BASE_COMMENTS, issues: defaultIssues() });
    runCockpit(env, 1);

    const acts = actions(env);
    expect(acts.filter((a) => a.startsWith('PATCH_COMMENT'))).toEqual(['PATCH_COMMENT id=1']); // 最旧机器评论 id=1
    expect(acts.filter((a) => a.startsWith('CREATE_COMMENT'))).toEqual([]); // 绝不追加新评论
    expect(acts.filter((a) => a.startsWith('DELETE_COMMENT')).sort()).toEqual(['DELETE_COMMENT id=2', 'DELETE_COMMENT id=5']); // 其余机器评论被清扫
    // 人工评论 3/4/6 一个都不删
    const body = overlayOf(env, 1);
    expect(body.startsWith('<!-- cockpit -->')).toBe(true);
    expect(body).toMatch(/<!-- fp:[0-9a-f]{12} -->/);
    expect(body).toMatch(/<!-- state:[^>]* -->/);
    expect(body).toContain('## 驾驶舱 · ');
    expect(body).toContain('**摘要**：开放 66 · 24h 关闭 0 · 门禁 ✅');
    expect(body).toContain('🛫 驾驶舱启用');
    expect(body).not.toMatch(/开放议题盘点/); // 全量盘点不进评论
    expect(body).not.toMatch(/巡逻快照/);
    expect(body).toContain('docs/ops-discipline.md');
    expect(body).toContain('#77');
  });

  it('指纹排除跟踪议题自身（否则每次 PATCH bump updatedAt 自指永无静默轮）', () => {
    const env = makeEnv();
    writeFixtures(env, { comments: BASE_COMMENTS, issues: defaultIssues() });
    runCockpit(env, 1);
    const m = overlayOf(env, 1).match(/<!-- state:([^>]*) -->/);
    expect(m).toBeTruthy();
    const nums = m[1].split('|')[0].split(',').filter(Boolean).map(Number);
    expect(nums).not.toContain(17);
    expect(nums.length).toBe(66);
  });
});

describe('v8.35 #80 静默轮与事件轮（DoD：无变化只刷时间戳 / 变更区 diff 化）', () => {
  it('连续两轮无变化：第二轮「本轮无变化」，24h 日志逐字保留，仍只 1 条机器评论', () => {
    const env = makeEnv();
    writeFixtures(env, { comments: BASE_COMMENTS, issues: defaultIssues() });
    runCockpit(env, 1);
    const b1 = overlayOf(env, 1);
    runCockpit(env, 1);
    const b2 = overlayOf(env, 1);

    expect(b2).toContain('本轮无变化（指纹一致');
    expect(logSection(b2)).toBe(logSection(b1)); // 日志逐字保留（含首启启用条目）
    expect(actions(env).filter((a) => a.startsWith('CREATE_COMMENT'))).toEqual([]);
    expect(actions(env).filter((a) => a.startsWith('PATCH_COMMENT')).length).toBe(2);
    expect(b2).not.toBe(b1); // 时间戳/静默注记刷新了
  });

  it('事件轮：议题关闭 + 门禁翻转进变更区，fp 更新，日志新条目前置', () => {
    const env = makeEnv();
    writeFixtures(env, { comments: BASE_COMMENTS, issues: defaultIssues() });
    runCockpit(env, 1); // 首启
    runCockpit(env, 1); // 静默
    const b2 = overlayOf(env, 1);
    const fp2 = b2.match(/<!-- fp:([0-9a-f]{12}) -->/)[1];

    const issues = defaultIssues().filter((i) => i.number !== 165); // 关闭 #165
    writeFixtures(env, { comments: BASE_COMMENTS, issues });
    runCockpit(env, 0); // 门禁同时翻红
    const b3 = overlayOf(env, 1);
    const fp3 = b3.match(/<!-- fp:([0-9a-f]{12}) -->/)[1];

    expect(fp3).not.toBe(fp2);
    expect(b3).toContain('✅ #165 已关闭');
    expect(b3).toContain('⚠️ vitest 门禁翻转 ✅→❌');
    expect(b3).toContain('<details><summary>vitest 失败尾部');
    expect(b3).toContain('**摘要**：开放 65 · 24h 关闭 1 · 门禁 ❌（上轮 ✅）');
    expect(b3).not.toContain('本轮无变化'); // 非静默轮
    // 新条目前置：日志第一条是本轮时间戳事件
    const firstLog = logSection(b3).split('\n').filter((l) => l.startsWith('- '))[0];
    expect(firstLog).toMatch(/· ✅ #165 已关闭$/);
    // 机器评论恒 1 条
    expect(actions(env).filter((a) => a.startsWith('CREATE_COMMENT'))).toEqual([]);
  });

  it('新开议题事件带标题（40 字截断）', () => {
    const env = makeEnv();
    writeFixtures(env, { comments: BASE_COMMENTS, issues: defaultIssues() });
    runCockpit(env, 1);
    const long = '【应用】这是一个特别特别长的标题用来验证四十个字符截断逻辑是否生效无误加分隔测试需要超过四十字符才行';
    const issues = defaultIssues();
    issues.push({ number: 999, title: long });
    writeFixtures(env, { comments: BASE_COMMENTS, issues });
    runCockpit(env, 1);
    const b = overlayOf(env, 1);
    expect(b).toContain('🆕 #999 新开（' + long.slice(0, 40) + '）');
    expect(b).not.toContain(long.slice(0, 41));
  });
});

describe('v8.35 #80 24h 滚动日志（DoD：≤20 条 + 仅留 24h 内条目）', () => {
  it('指纹刷新但零事件：旧日志过 24h 过滤 + 20 条上限，无开/关事件不误报', () => {
    const env = makeEnv();
    // 既有驾驶舱评论（state=100,101|gate=1，fp 为任意旧值），日志混新旧 25 条
    // 时间戳必须相对真实时钟动态生成：cockpit.sh 内部 export TZ=Asia/Shanghai，
    // date -d 按上海时区解析行内日期与 CUTOFF 比较——写死日历日会随时钟推进翻红
    // （2026-10-27 上海 04:06 起 `2026-10-26 04:00` 越过 CUTOFF 被误滤，见本轮修复）
    const shStamp = (hoursAgo) => {
      const u = new Date(Date.now() - hoursAgo * 3600e3 + 8 * 3600e3); // UTC+8 无夏令时
      const p = (n) => String(n).padStart(2, '0');
      return `${u.getUTCFullYear()}-${p(u.getUTCMonth() + 1)}-${p(u.getUTCDate())} ${p(u.getUTCHours())}:${p(u.getUTCMinutes())}`;
    };
    const oldLog = [];
    for (let i = 0; i < 25; i++) {
      // 前 5 条 25~29h 前（>24h 必滤），其余 1~19h 前（<24h 必留，含 i=24）
      const day = i < 5 ? shStamp(25 + i) : shStamp(((i % 20) + 1));
      oldLog.push(`- ${day} · 旧事件${i}`);
    }
    const cockpitComment = {
      id: 7,
      user: { login: 'github-actions[bot]' },
      created_at: '2026-10-26T12:00:00Z',
      body: [
        '<!-- cockpit -->',
        '<!-- fp:deadbeefcafe -->',
        '<!-- state:100,101|gate=1 -->',
        '',
        '## 驾驶舱 · 2026-10-26 12:00',
        '',
        '**摘要**：开放 2 · 24h 关闭 0 · 门禁 ✅（上轮 ✅）',
        '',
        '### 本轮变更',
        '- 本轮无变化（指纹一致：deadbeefcafe）',
        '',
        '### 近 24h 变更日志（滚动 ≤20 条 · 盘点明细按需 gh issue list 现查）',
        ...oldLog,
        '',
        '> 瘦身纪律：docs/ops-discipline.md · 池空后巡查总纲：#77',
      ].join('\n'),
    };
    writeFixtures(env, { comments: [cockpitComment, HUMAN1], issues: [{ number: 100, title: 'a' }, { number: 101, title: 'b' }, { number: 17, title: 't' }] });
    runCockpit(env, 1); // 门禁不变 → 零事件但 fp 刷新（deadbeefcafe ≠ 真实指纹）

    const b = overlayOf(env, 7);
    expect(b).toContain('本轮无变化（无开/关事件，指纹刷新');
    const logLines = logSection(b).split('\n').filter((l) => l.startsWith('- '));
    expect(logLines.length).toBeLessThanOrEqual(20);
    expect(logLines.every((l) => !l.includes('旧事件0') && !l.includes('旧事件4'))).toBe(true); // >24h 的 5 条被滤掉
    expect(logLines.some((l) => l.includes('旧事件24'))).toBe(true); // 24h 内保留
  });
});

describe('v8.35 #80 两个工作流角色边界', () => {
  it('patrol 语义：跟踪议题缺失 → 静默退出零动作（不建议题不写评论）', () => {
    const env = makeEnv();
    writeFixtures(env, { comments: [], issues: [], tracking: '' });
    const out = runCockpit(env, 1);
    expect(out).toContain('跟踪议题不存在');
    expect(actions(env)).toEqual([]);
  });

  it('brief 语义：跟踪议题缺失 + --create-issue → 带驾驶舱首启形态创建', () => {
    const env = makeEnv();
    writeFixtures(env, { comments: [], issues: [{ number: 17, title: '每日简报（定时任务落地跟踪）' }], tracking: '' });
    runCockpit(env, 1, ['--create-issue']);
    const acts = actions(env);
    expect(acts.filter((a) => a.startsWith('CREATE_ISSUE')).length).toBe(1);
    const body = readFileSync(join(env.state, 'created-issue-body.md'), 'utf8');
    expect(body.startsWith('<!-- cockpit -->')).toBe(true);
    expect(body).toContain('🛫 驾驶舱启用');
    expect(body).toContain('门禁 ✅');
  });

  it('workflow YAML：两工作流统一调 cockpit.sh；brief 带 --create-issue；旧追加/快照写入路径退役', () => {
    const brief = src('.github/workflows/daily-issue-brief.yml');
    const patrol = src('.github/workflows/issue-patrol.yml');
    expect(brief).toContain('bash .github/cockpit.sh /tmp/vitest.exit /tmp/vitest.tail --create-issue');
    expect(patrol).toContain('bash .github/cockpit.sh /tmp/vitest.exit /tmp/vitest.tail\n');
    expect(patrol).not.toContain('--create-issue');
    // 追加式写入退役（#80 增殖点①）
    expect(brief).not.toMatch(/gh issue comment "\$NUM" --body-file brief\.md/);
    expect(brief).not.toMatch(/gh issue create --title/);
    // 独立快照评论退役（#80 增殖点②内容侧）
    expect(patrol).not.toMatch(/<!-- patrol-snapshot -->/);
    expect(patrol).not.toMatch(/巡逻快照/);
    // 门禁保留
    expect(brief).toMatch(/npx vitest run/);
    expect(patrol).toMatch(/npx vitest run/);
  });

  it('纪律文档落位 docs/ops-discipline.md（DoD：§二纪律执行侧可见）+ 关键条目齐备', () => {
    const doc = src('docs/ops-discipline.md');
    expect(doc).toContain('已完成 · v8.xx · <commit sha 前 7 位>');
    expect(doc).toContain('<!-- wip -->');
    expect(doc).toContain('squash');
    expect(doc).toContain('vX.XX: #NN');
    expect(doc).toContain('gh issue list');
    expect(doc).toContain('#77');
    expect(doc).toContain('唯一允许长篇');
    expect(doc).toContain('原地 PATCH');
  });

  it('cockpit.sh 实现锚点：指纹隐藏块 + 原地 PATCH + 收编与清扫守卫 + 静默轮', () => {
    const sh = src('.github/cockpit.sh');
    expect(sh).toContain('<!-- cockpit -->');
    expect(sh).toContain('<!-- fp:');
    expect(sh).toContain('<!-- state:');
    expect(sh).toContain('-X PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${COCKPIT_ID}"');
    expect(sh).toContain('github-actions[bot]'); // 作者守卫
    expect(sh).toContain('<!-- patrol-snapshot -->'); // 收编/清扫标记
    expect(sh).toContain('本轮无变化（指纹一致');
    expect(sh).toContain('head -n 20'); // 日志上限
    expect(sh).toContain("date -d '24 hours ago'"); // 24h 过滤
    expect(sh).toContain('#80'); // 议题溯源
  });
});
