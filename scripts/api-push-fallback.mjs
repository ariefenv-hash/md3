// ==================== api-push-fallback.mjs — git push TLS 故障 API 直推兜底（R60 起三次生效模式固化） ====================
// 用法：node scripts/api-push-fallback.mjs <localCommitSha> <tokenEnvName>
// 流程：git diff-tree 列出提交全部文件 → 逐个 blob（base64）→ base_tree=远端 HEAD tree →
//       新 tree → 新 commit（parent=远端 HEAD）→ PATCH /git/refs/heads/main → REST 复核
import { execSync } from 'node:child_process';

const sha = process.argv[2];
const TOKEN = process.argv[3];
if (!sha || !TOKEN) { console.error('usage: node api-push-fallback.mjs <sha> <token>'); process.exit(1); }
const REPO = 'ariefenv-hash/md3';
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' };
const api = async (path, method = 'GET', body) => {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method, headers: H, body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j;
};

const remoteHead = (await api('/git/ref/heads/main')).object.sha;
console.log('remote HEAD:', remoteHead);
const remoteCommit = await api(`/git/commits/${remoteHead}`);
const baseTree = remoteCommit.tree.sha;

// 本地提交的元数据 + 文件清单（diff-tree 全量，含 rename 两侧）
const msg = execSync(`git log -1 --format=%B ${sha}`).toString();
const files = execSync(`git diff-tree -r --no-renames --no-commit-id --name-status ${sha} -z`)
  .toString().split('\0').filter(Boolean);
const entries = [];
for (let i = 0; i < files.length; i += 2) {
  const [st, p] = [files[i], files[i + 1]];
  if (st === 'D') { entries.push({ path: p, sha: null, mode: '100644', type: 'blob' }); continue; }
  const content = execSync(`git show ${sha}:${p}`, { maxBuffer: 64 * 1024 * 1024 });
  const blob = await api('/git/blobs', 'POST', { content: content.toString('base64'), encoding: 'base64' });
  entries.push({ path: p.replace(/^\//, ''), sha: blob.sha, mode: '100644', type: 'blob' });
  console.log('blob ok:', p, `(${content.length}B)`);
}

const tree = await api('/git/trees', 'POST', { base_tree: baseTree, tree: entries });
console.log('tree:', tree.sha);
const commit = await api('/git/commits', 'POST', {
  message: msg, tree: tree.sha, parents: [remoteHead],
  author: { name: 'md3-bot', email: 'bot@md3.local', date: new Date().toISOString() },
  committer: { name: 'md3-bot', email: 'bot@md3.local', date: new Date().toISOString() },
});
console.log('commit:', commit.sha);
await api('/git/refs/heads/main', 'PATCH', { sha: commit.sha, force: false });
console.log('ref updated ✓');

const verify = await api('/branches/main');
console.log('VERIFY remote HEAD:', verify.commit.sha, '== pushed:', verify.commit.sha === commit.sha);
