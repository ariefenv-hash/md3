// ==================== v10.96 #279：vendored 供应链台账与来源头注释（check:comments 三期强检） ====================
//
// #279 交付守护（P2 供应链：vendor 五库无版本注释——CVE 无法对号/升级无基线/LICENSE 归档不齐）：
//   ① 来源头契约：vendor 顶层文件头部必须含「/* vendor: … */」来源头（version/src/license/ledger 四栏）；
//   ② 台账对账：每个 vendor 顶层文件逐个登记 docs/vendor-ledger.md（缺头/未登记即红）；
//   ③ 零编造纪律：版本/license/src 只认「文件内实证」，不可考处如实登记（#149 注释=代码延伸）；
//   ④ 阴性验证在册：MD3_VENDOR_DIR/MD3_VENDOR_LEDGER 钩子指向临时目录必红（非空洞绿）；
//   ⑤ 升级策略定档一句话在台账（建议③）：安全修复跟、大版本不主动追。
//
// 与既有防线互补：#149（注释=代码数值核对）/ #296（用途注释契约二期）——三期通道互不弱化。

import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const VENDOR_DIR = 'ios-desktop/apps/_shared/vendor';
const LEDGER = 'docs/vendor-ledger.md';

function runGate(envExtra) {
  return spawnSync('node', ['scripts/check-comment-claims.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: envExtra ? { ...process.env, ...envExtra } : process.env,
  });
}

describe('v10.96 #279 门禁脚本三期结构契约', () => {
  const s = () => src('scripts/check-comment-claims.mjs');

  it('① vendor 违约判据在册（缺 vendor 来源头/台账未登记/vendor 目录缺失，非空洞绿结构前提）', () => {
    expect(s()).toContain("'缺 vendor 来源头'");
    expect(s()).toContain("'台账未登记'");
    expect(s()).toContain("'vendor 目录缺失'");
    expect(s()).toContain("'/* vendor:'");
  });

  it('② 台账真源路径在册（docs/vendor-ledger.md 固定真源）', () => {
    expect(s()).toContain("'docs', 'vendor-ledger.md'");
  });

  it('③ 门禁退出码三通道合一（#149 数值+#296 用途+#279 vendor 任一非零即红）', () => {
    expect(s()).toContain("(active.length || purposeRun.violations.length || vendorRun.violations.length)");
  });

  it('④ 阴性验证钩子在册（MD3_VENDOR_DIR / MD3_VENDOR_LEDGER 仅测试用）', () => {
    expect(s()).toContain('MD3_VENDOR_DIR');
    expect(s()).toContain('MD3_VENDOR_LEDGER');
  });

  it('⑤ 确定性前提：vendor 契约无时间戳（Date.now/new Date 禁入）', () => {
    expect(s()).not.toMatch(/Date\.now|new Date\(/);
  });
});

describe('v10.96 #279 台账与来源头事实契约（独立读取）', () => {
  it('⑥ 台账登记 vendor 顶层文件全量（台账行数覆盖实测文件清单）', () => {
    const ledger = src(LEDGER);
    const files = readdirSync(resolve(ROOT, VENDOR_DIR), { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort();
    expect(files.length).toBeGreaterThanOrEqual(11);
    for (const f of files) expect(ledger).toContain(f);
  });

  it('⑦ 零编造纪律：文件内零 semver 串的三库在台账登记「不可考」而非编造版本', () => {
    const ledger = src(LEDGER);
    for (const name of ['cannon-es.js', 'epub.min.js', 'codemirror-bundle.mjs']) {
      expect(ledger, name).toContain('不可考');
    }
  });

  it('⑧ 升级策略定档一句话在台账（建议③：安全修复跟、大版本不主动追）', () => {
    expect(src(LEDGER)).toContain('安全修复跟、大版本不主动追');
  });

  it('⑨ vendor 顶层文件逐个带「/* vendor:」来源头（头部 400 字符内）', () => {
    const files = readdirSync(resolve(ROOT, VENDOR_DIR), { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);
    for (const f of files) {
      const head = readFileSync(resolve(ROOT, VENDOR_DIR, f), 'utf8').slice(0, 400);
      expect(head.includes('/* vendor:'), `${f} 缺来源头`).toBe(true);
    }
  });

  it('⑩ 功能实跑正路径：check:comments 三通道全绿退出（vendor 11/11）', () => {
    const r = runGate();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('#279 vendor 台账');
    expect(r.stdout).toContain('来源头 11/11，违约 0 处');
    expect(r.stdout).toContain('门禁通过');
  });
});

describe('v10.96 #279 阴性验证（临时目录必红，os.tmpdir 不入仓）', () => {
  it('⑪ 缺来源头必红（无「/* vendor:」头的 vendor 文件）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'v279-vendor-'));
    writeFileSync(join(dir, 'fake-lib.min.js'), '!function(){}();\n', 'utf-8');
    try {
      const r = runGate({ MD3_VENDOR_DIR: dir });
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('缺 vendor 来源头');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('⑫ 台账未登记必红（带来源头但台账无此文件行）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'v279-vendor-'));
    writeFileSync(join(dir, 'unregistered-lib.js'), '/* vendor: fake | version: 不可考 | ledger: docs/vendor-ledger.md (#279) */\n!function(){}();\n', 'utf-8');
    try {
      const r = runGate({ MD3_VENDOR_DIR: dir });
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('台账未登记');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('⑬ vendor 目录缺失必红（目录不存在 → vendor 目录缺失）', () => {
    const r = runGate({ MD3_VENDOR_DIR: join(tmpdir(), 'v279-nonexistent-dir') });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('vendor 目录缺失');
  });
});
