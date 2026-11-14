// ==================== v11.30 #296：逐应用「一句话用途」注释契约（check:comments 二期强检） ====================
//
// #296 交付守护（P3 流程：52 个应用定义用途说明参差——部分有条内注释，部分仅名字）：
//   ① 清单级契约：apps-data.js 每个 app import 行尾注必含「用途：」标记——非空非过短、
//      全量两两唯一（非复制粘贴）、定义文件在位（缺注/过短/复制/文件失四类违约即红）；
//   ② 门禁强检：check:comments 二期用途契约并入 gate 退出码（数值失配 #149 与用途违约
//      #296 双通道合一，既有通道互不弱化）；
//   ③ 阴性验证在册：MD3_APPSDATA_PATH 钩子指向临时副本必红（门禁非空洞绿；副本写
//      os.tmpdir 不入仓，check:dist-parity/#295 docs-index 对实树扫描零干扰）；
//   ④ 同源消费接口：「用途：」标记为 APPS.md 生成器（#285 车道）切分点——本卡只立契约
//      不做生成接线（车道边界在案）。
//
// 与既有防线互补：#149（注释=代码数值核对）/ #265（契约注释即锚点）/ #285（APPS.md 真源）。

import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const APPS_DATA = 'ios-desktop/js/apps-data.js';
const MARKER = '用途：';
const IMPORT_RE = /^import\s+(\w+)\s+from\s+'(\.\/apps\/[^']+\.js)';\s*(\/\/.*)?$/;

function parsePurposes(text) {
  const out = [];
  for (const [idx, line] of text.split('\n').entries()) {
    const m = line.match(IMPORT_RE);
    if (!m) continue;
    const tail = m[3] || '';
    const hasMarker = tail.includes(MARKER);
    out.push({
      line: idx + 1,
      varName: m[1],
      relPath: m[2],
      hasMarker,
      purpose: hasMarker ? tail.slice(tail.indexOf(MARKER) + MARKER.length).trim() : null,
    });
  }
  return out;
}

function makeFixture(lines) {
  const dir = mkdtempSync(join(tmpdir(), 'v296-fixture-'));
  const file = join(dir, 'apps-data-fixture.js');
  writeFileSync(file, lines.join('\n') + '\n', 'utf-8');
  return { file, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

function runGate(fixturePath) {
  return spawnSync('node', ['scripts/check-comment-claims.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: fixturePath ? { ...process.env, MD3_APPSDATA_PATH: fixturePath } : process.env,
  });
}

describe('v11.30 #296 门禁脚本二期结构契约', () => {
  const s = () => src('scripts/check-comment-claims.mjs');

  it('① 用途契约四类违约判据在册（缺注/过短/复制/文件失，非空洞绿的结构前提）', () => {
    expect(s()).toContain('collectPurposeViolations');
    expect(s()).toContain("'用途：'");
    expect(s()).toContain("'缺用途尾注'");
    expect(s()).toContain("'用途描述过短'");
    expect(s()).toContain("'用途复制粘贴重复'");
    expect(s()).toContain("'定义文件缺失'");
  });

  it('② 门禁退出码多通道合一：数值失配与用途违约任一非零即红（既有通道不弱化；#279 三期扩 vendor 通道）', () => {
    expect(s()).toContain("(active.length || purposeRun.violations.length || vendorRun.violations.length)");
  });

  it('③ 数值通道单元集原样保留（#149 CLAIM_RE dp/px/ms/组/态/项/维 不被二期扰动）', () => {
    expect(s()).toContain('(dp|px|ms|组|态|项|维)');
  });

  it('④ 确定性前提：用途契约无时间戳（Date.now/new Date 禁入，否则 check 永红）', () => {
    expect(s()).not.toMatch(/Date\.now|new Date\(/);
  });

  it('⑤ 阴性验证钩子 MD3_APPSDATA_PATH 在册（临时副本测试通道，CI 不设）', () => {
    expect(s()).toContain('MD3_APPSDATA_PATH');
  });
});

describe('v11.30 #296 apps-data.js 清单级契约（独立解析 + 功能实跑）', () => {
  const purposes = parsePurposes(src(APPS_DATA));

  it('⑥ 应用 import 全量为 52 条且逐行携带「用途：」标记（清单级契约无遗漏）', () => {
    expect(purposes.length).toBe(52);
    expect(purposes.filter((p) => p.hasMarker).length).toBe(52);
  });

  it('⑦ 用途文本两两唯一（非复制粘贴：Set 去重后仍为 52）', () => {
    const texts = purposes.map((p) => p.purpose);
    expect(new Set(texts).size).toBe(52);
  });

  it('⑧ 用途描述均非过短（去空白后不少于最小可见长度）', () => {
    for (const p of purposes) {
      expect(p.purpose.replace(/\s/g, '').length).toBeGreaterThanOrEqual(4);
    }
  });

  it('⑨ 定义文件逐条在位（import 指向的 js/apps/*.js 真实存在）', () => {
    for (const p of purposes) {
      const defPath = resolve(ROOT, 'ios-desktop/js', p.relPath.replace(/^\.\//, ''));
      expect(existsSync(defPath), `${p.varName} → ${p.relPath}`).toBe(true);
    }
  });

  it('⑩ 功能实跑正路径：check:comments 全绿退出（52 条违约 0 处）', () => {
    const r = runGate();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('#296 用途契约');
    expect(r.stdout).toContain('应用 import 52 条，违约 0 处');
    expect(r.stdout).toContain('门禁通过');
  });
});

describe('v11.30 #296 阴性验证（临时副本必红，os.tmpdir 不入仓）', () => {
  it('⑪ 缺用途尾注必红（无标记尾注 → 缺用途尾注）', () => {
    const f = makeFixture([
      "import aaa from './apps/messages.js'; // 无标记的历史尾注",
      "import bbb from './apps/messages.js'; // 用途：正常用途描述文本",
    ]);
    try {
      const r = runGate(f.file);
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('缺用途尾注');
    } finally {
      f.cleanup();
    }
  });

  it('⑫ 复制粘贴用途必红（同文两条 → 用途复制粘贴重复）', () => {
    const f = makeFixture([
      "import aaa from './apps/messages.js'; // 用途：完全相同的占位用途文本",
      "import bbb from './apps/messages.js'; // 用途：完全相同的占位用途文本",
    ]);
    try {
      const r = runGate(f.file);
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('用途复制粘贴重复');
    } finally {
      f.cleanup();
    }
  });

  it('⑬ 用途描述过短必红（去空白后不足最小长度 → 用途描述过短）', () => {
    const f = makeFixture([
      "import aaa from './apps/messages.js'; // 用途：短",
    ]);
    try {
      const r = runGate(f.file);
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('用途描述过短');
    } finally {
      f.cleanup();
    }
  });

  it('⑭ 定义文件缺失必红（import 指向不存在文件 → 定义文件缺失）', () => {
    const f = makeFixture([
      "import zzz from './apps/definitely-not-exist.js'; // 用途：指向不存在定义文件的用途描述",
    ]);
    try {
      const r = runGate(f.file);
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('定义文件缺失');
    } finally {
      f.cleanup();
    }
  });
});
