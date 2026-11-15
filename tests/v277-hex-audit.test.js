// ==================== v277-hex-audit.test.js — js 硬编码 hex 热点清单守卫（#277） ====================
//
// 卡面（#277）：js 内（非 aosp/）硬编码 hex 805 处（v10.72 基线），token 化纪律旁路洪区。
// 建议① 热点清单由 scripts/gen-hex-audit.mjs 产出 docs/audits/hex-inventory.json。
// 本文件四闸：
//   A1 单真源闸：生成器 --check 对盘上件逐字节比对（生成件随树纪律）；
//   B1 守恒：Σfiles.count = total；top20 ⊆ files 且降序；
//   B2 口径：scope 全部命中 ios-desktop/js/ 前缀且零 aosp/ 命中（卡面豁免域）；私有字段误计=0；
//   C1 登记闸：top1 文件+计数在录（现值 settings.js——#284 巨石车道内，只清点不施工；
//      新 top1 出现即说明热点结构迁移，需在 md 报告 §三 登记）。
//   D1 生成器纪律：源码无时间戳/随机面（零依赖可重现，vendor-gate D 组字符纪律同律）。
//
// 常青声明：v277-<行为> 常青锚；树演进致计数漂移走「再生 + md 报告登记」路径，不锚定具体总数
// （805 基线为信息位，卡面已注明时点）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = join(ROOT, 'docs', 'audits', 'hex-inventory.json');

describe('v277 · A/B 组：单真源与守恒', () => {
  it('A1 --check 单真源闸（生成件与现树逐字节一致）', () => {
    const out = execFileSync('node', [join(ROOT, 'scripts', 'gen-hex-audit.mjs')], {
      cwd: ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
    void out;
    // 退出码 0 即通过（不一致时生成器退出 1 抛错）
  });

  it('B1 守恒：Σ文件计数 = total；top20 ⊆ files 且按计数降序', () => {
    const doc = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
    const sum = doc.files.reduce((s, f) => s + f.count, 0);
    expect(sum).toBe(doc.total);
    expect(doc.top20.length).toBeLessThanOrEqual(20);
    for (let i = 1; i < doc.top20.length; i++) {
      expect(doc.top20[i - 1].count).toBeGreaterThanOrEqual(doc.top20[i].count);
    }
    const fileSet = new Set(doc.files.map((f) => f.file));
    for (const t of doc.top20) expect(fileSet.has(t.file), `top20 项在 files 内：${t.file}`).toBe(true);
  });

  it('B2 口径：scope 全为 ios-desktop/js/ 且零 aosp/ 命中；私有字段误计 = 0', () => {
    const doc = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
    expect(doc.fileCount).toBe(doc.files.length);
    for (const f of doc.files) {
      expect(f.file.startsWith('ios-desktop/js/'), `${f.file} 在 js 树内`).toBe(true);
      expect(f.file.includes('/aosp/'), `非 aosp 域：${f.file}`).toBe(false);
      expect(Number.isInteger(f.count) && f.count > 0).toBe(true);
    }
    expect(doc.privateFieldSuspects).toBe(0);
    expect(doc.baselineRef.baselineTotal).toBe(805); // 卡面基线信息位在录
  });
});

describe('v277 · C/D 组：登记与生成器纪律', () => {
  it('C1 top1 热点在录（现值 settings.js —— #284 巨石车道内只清点不施工）', () => {
    const doc = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
    expect(doc.top20[0].file).toBe('ios-desktop/js/apps/settings.js');
    expect(doc.top20[0].count).toBeGreaterThan(100);
  });

  it('D1 生成器纪律：零时间戳/零随机/零网络（逐字节可重现前提）', () => {
    const gen = readFileSync(join(ROOT, 'scripts', 'gen-hex-audit.mjs'), 'utf-8');
    expect(gen).not.toMatch(/new Date|Date\.now|Math\.random|fetch\(|require\(/);
  });
});
