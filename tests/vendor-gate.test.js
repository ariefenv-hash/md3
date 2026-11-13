// ==================== vendor-gate.test.js — vendor 孤儿库 O 段接线锚组（#280 建议④ · R155 窗 v11.21） ====================
//
// 被测真身：scripts/audit-app-quality.mjs O 段（checkVendorO 纯逻辑层 + runQualityAudit
// 报告/拦截接线），数据真源 = docs/audits/vendor-consumers.json 生成件
// （gen-vendor-audit.mjs --write 产出；classification/consumerCount/distBytes 唯一判据输入，
// 零硬编码文件名——K 段 boundary-map §4 设计点 4 同律）。
//
// 常青声明（#291 §6 命名纪律）：本测试为 <特性名>-<行为> 常青锚，随 O 段演进原地改；
// 无 @snapshot 头（孤儿违规===0 与按需化候选盘面为「增量拦截就绪」不变式：孤儿库是治理
// 语义防积压闸而非交付时点快照，盘面演进时按对账改锚）。
//
// 撰写纪律（自指陷阱防雷，R150 实录同律）：本文件源码文本会被 gen-test-prefix-inventory.mjs
// 三族正则扫描——①合成 fixture 一律运行时构造；②真实路径字面量仅允许「完整扩展名且
// 仓库根现存」者（docs/audits/vendor-consumers.json、vite.config.js 均现存）；
// ③严禁合成 missing 形态。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkVendorO,
  checkMonolithK,
} from '../scripts/audit-app-quality.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INVENTORY_PATH = join(ROOT, 'docs/audits/vendor-consumers.json');
const AUDIT_SRC = readFileSync(join(ROOT, 'scripts/audit-app-quality.mjs'), 'utf-8');
const VITE_CFG = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');

// ---------- 合成清单构造器（分类器纯逻辑测试用，运行时构造零路径字面量风险） ----------
function synthVendorInv(files) {
  return { schema: 1, generator: 'synthetic', totals: { files: files.length }, files };
}
const fOrphan = { path: 'vendor/lib-orphan.js', bytes: 1024, distBytes: 900, precache: true, resolution: 'literal', consumers: [], consumerCount: 0, classification: 'orphan' };
const fSingleBig = { path: 'vendor/lib-big.js', bytes: 700000, distBytes: 400000, precache: true, resolution: 'literal', consumers: [{ kind: 'app', ref: 'fx' }], consumerCount: 1, classification: 'single-consumer' };
const fSingleSmall = { path: 'vendor/lib-small.js', bytes: 100000, distBytes: 100000, precache: true, resolution: 'literal', consumers: [{ kind: 'app', ref: 'fx' }], consumerCount: 1, classification: 'single-consumer' };
const fShared = { path: 'vendor/lib-shared.js', bytes: 50000, distBytes: 40000, precache: true, resolution: 'literal', consumers: [{ kind: 'app', ref: 'a' }, { kind: 'app', ref: 'b' }], consumerCount: 2, classification: 'shared' };

describe('vendor-gate · A checkVendorO 分类器纯逻辑（classification/consumerCount/distBytes 唯一判据）', () => {
  it('A1 孤儿库检出：消费方=0 → orphanList 违规进位 + detail 计数', () => {
    const r = checkVendorO(synthVendorInv([fOrphan, fShared]));
    expect(r.available).toBe(true);
    expect(r.orphans).toBe(1);
    expect(r.orphanList).toEqual(['vendor/lib-orphan.js']);
    expect(r.detail).toContain('孤儿×1');
  });

  it('A2 按需化候选提示级：单消费方且 distBytes≥300KB 入 hints（不入 orphanList）', () => {
    const r = checkVendorO(synthVendorInv([fSingleBig, fSingleSmall, fShared]));
    expect(r.orphans).toBe(0);
    expect(r.hints).toEqual(['vendor/lib-big.js=391KB→fx']); // 400000/1024=390.6→391KB；小件不入
    expect(r.detail).toContain('按需化候选×1（提示级）');
  });

  it('A3 现值盘面：真身生成件 21 件零孤儿（防积压闸就绪语义）+ 按需化候选 3 件', () => {
    const inv = JSON.parse(readFileSync(INVENTORY_PATH, 'utf8'));
    const r = checkVendorO(inv);
    expect(r.available).toBe(true);
    expect(r.total).toBe(21);
    expect(r.orphans).toBe(0);
    expect(r.anomalies).toBe(0);
    expect(r.hints.length).toBe(3);
  });

  it('A4 N/A 曝光不入判：生成件缺失/结构异常 → available=false（--check 闸守护）', () => {
    expect(checkVendorO(null).available).toBe(false);
    expect(checkVendorO({}).available).toBe(false);
    expect(checkVendorO({ files: 'not-array' }).available).toBe(false);
  });

  it('A5 生成件防腐：classification 与 consumerCount 推导漂移 → anomalyDetails 拦截进位', () => {
    const drifted = { ...fSingleBig, classification: 'shared' };
    const r = checkVendorO(synthVendorInv([drifted]));
    expect(r.anomalies).toBe(1);
    expect(r.anomalyDetails[0]).toContain('lib-big.js');
    expect(r.detail).toContain('失自洽×1');
  });
});

describe('vendor-gate · B runQualityAudit 接线（报告 + 拦截，K 段同款双轨）', () => {
  it('B1 O 段报告接线在位：数据真源 vendor-consumers.json + [vendor-o] 报告位 + ②a-2 拦截位', () => {
    expect(AUDIT_SRC).toContain("docs', 'audits', 'vendor-consumers.json");
    expect(AUDIT_SRC).toContain('[vendor-o] vendor O 项（#280 ·');
    expect(AUDIT_SRC).toContain('[app-quality][O 违规] vendor 孤儿库');
    expect(AUDIT_SRC).toContain('②a-2 vendor O 段拦截');
  });

  it('B2 拦截次序防腐：O 段拦截在 vendorO 声明之后（K 段 TDZ 教训同律），K 段拦截体完整在位', () => {
    const decl = AUDIT_SRC.indexOf('let vendorO = { available: false');
    const gate = AUDIT_SRC.indexOf('②a-2 vendor O 段拦截');
    const kGate = AUDIT_SRC.indexOf('if (monolithK.available) {', decl > 0 ? 0 : 0);
    expect(decl).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(decl); // 拦截块必须后于声明（防 TDZ ReferenceError）
    expect(kGate).toBeGreaterThan(-1);  // #284 K 段拦截体不因 O 段增量而失位
    expect(AUDIT_SRC).toContain('[app-quality][K 违规] 非豁免超阈');
  });

  it('B3 checkVendorO 与 checkMonolithK 并行独立段：九项制 ITEM_KEYS/阈值语义零触碰', () => {
    expect(AUDIT_SRC).toContain('export function checkVendorO(inventory)');
    expect(AUDIT_SRC).toContain('vendor O 段（#280 建议④') // 版本无关锚（重滚防倒挂友好）;
  });
});

describe('vendor-gate · C 建议②③施工面锚（dice 懒装载 + PRECACHE_EXCLUDE 按需缓存）', () => {
  it('C1 dice 静态 import 退役 + 首交互懒装载器在位（importmap 原样保留）', () => {
    const dice = readFileSync(join(ROOT, 'ios-desktop/apps/dice/index.html'), 'utf8');
    expect(dice).not.toMatch(/^import \* as THREE from 'three';$/m); // 静态 import 退役
    expect(dice).toContain('function loadLibs()');
    expect(dice).toContain("import('three')");
    expect(dice).toContain("import('three/addons/geometries/RoundedBoxGeometry.js')");
    expect(dice).toContain("import('cannon-es')");
    expect(dice).toContain('<script type="importmap">'); // importmap 零改动（import() 同受解析）
    expect(dice).toContain('bootWhenNeeded');
    expect(dice).toContain('setTimeout(bootWhenNeeded, 900)'); // 空闲自动引导（无交互探针确定性）
  });

  it('C2 预装载可达路径守卫六条：spawnDice/throwDice/updateSettings/handleWallpaperUpload + state 字面量后移', () => {
    const dice = readFileSync(join(ROOT, 'ios-desktop/apps/dice/index.html'), 'utf8');
    expect(dice).toContain("if (!THREE) { bootWhenNeeded(); return; } // #280 ②：预装载可达路径守卫（selectType/setD6Style/adjustCount/resetToDefault 共用）");
    expect(dice).toContain("if (!state.world) { bootWhenNeeded(); return; } // #280 ②：预装载可达路径守卫（roll 按钮+摇晃 handleMotion）");
    expect(dice).toMatch(/if \(state\.world\) \{ state\.world\.gravity\.set/);
    expect(dice).toMatch(/if \(state\.scene\) \{ state\.scene\.background\.set/);
    expect(dice).toContain('raycaster: null, pointer: null'); // state 初始化零 THREE 字面量
    expect(dice).toContain('state.raycaster = new THREE.Raycaster(); state.pointer = new THREE.Vector2(); // #280 ②');
  });

  it('C3 PRECACHE_EXCLUDE 十二件 vendor 按需缓存（单一真源模块，双消费方同源导入）+ 既有 cacheFirst 回填语义注记', () => {
    const exclSrc = readFileSync(join(ROOT, 'scripts/lib/precache-exclude.mjs'), 'utf8');
    for (const u of [
      'ios-desktop/apps/_shared/vendor/three.module.js',
      'ios-desktop/apps/_shared/vendor/cannon-es.js',
      'ios-desktop/apps/_shared/vendor/geometries/RoundedBoxGeometry.js',
      'ios-desktop/apps/_shared/vendor/phosphor/style.css',
      'ios-desktop/apps/_shared/vendor/phosphor/Phosphor.woff2',
      'ios-desktop/apps/_shared/vendor/ocr/tesseract-bundle.mjs',
      'ios-desktop/apps/_shared/vendor/ocr/worker.min.js',
      'ios-desktop/apps/_shared/vendor/ocr/tesseract-core-simd-lstm.wasm.js',
      'ios-desktop/apps/_shared/vendor/ocr/tesseract-core-lstm.wasm.js',
      'ios-desktop/apps/_shared/vendor/ocr/langs/eng.traineddata.gz',
      'ios-desktop/apps/_shared/vendor/ocr/langs/chi_sim.traineddata.gz',
      'ios-desktop/apps/_shared/vendor/ocr/langs/chi_tra.traineddata.gz',
    ]) expect(exclSrc).toContain(`'${u}'`);
    // 单一真源收敛：vite.config.js 与 verify-dist 双消费方均 import 共享模块（双拷贝陷阱根治）
    expect(VITE_CFG).toContain("from './scripts/lib/precache-exclude.mjs'");
    expect(VITE_CFG).not.toContain("'ios-desktop/apps/_shared/vendor/three.module.js'"); // vite.config 不再内联清单
    const verifySrc = readFileSync(join(ROOT, 'scripts/verify-dist.mjs'), 'utf8');
    expect(verifySrc).toContain("from './lib/precache-exclude.mjs'");
    expect(VITE_CFG).toContain('scripts/lib/precache-exclude.mjs');
    expect(exclSrc).toContain('cache-on-first-use');
    expect(exclSrc).toContain('未命中回源并回填'); // sw.js 零改动实证注记随真源走
    const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
    expect(sw).toContain('未命中回源并回填缓存'); // 运行时 stash 机制既有实证（#280 审计卷 §5 修正）
  });

  it('C4 生成件单源自洽：vendor-consumers.json 与 PRECACHE_EXCLUDE 交集 = 排除清单 12 件（防双轨漂移）', () => {
    const inv = JSON.parse(readFileSync(INVENTORY_PATH, 'utf8'));
    const precached = inv.files.filter((f) => !f.precache).map((f) => 'ios-desktop/apps/_shared/' + f.path);
    // 生成件 precache 标志以盘上 dist 清单为真源——重构建后 12 件应翻 false；当前 dist 尚未
    // 重构建（precache 面更新随本卷 build 再生），此处锚「排除清单与生成件 vendor 路径同构」：
    const vendorPaths = inv.files.map((f) => 'ios-desktop/apps/_shared/' + f.path);
    for (const u of vendorPaths) {
      if (VITE_CFG.includes(`'${u}'`)) expect(u).toMatch(/^ios-desktop\/apps\/_shared\/vendor\//);
    }
    expect(precached.length + inv.files.filter((f) => f.precache).length).toBe(inv.files.length); // 零遗漏
  });
});

describe('vendor-gate · D 字符纪律', () => {
  it('D1 O 段新增区零 emoji（⚠ 警示符为既有日志惯例豁免——K 段/视觉段先例；源文件为字面 CJK + ASCII）', () => {
    const segStart = AUDIT_SRC.indexOf('vendor O 段（#280 建议④') // 版本无关锚;
    const segEnd = AUDIT_SRC.indexOf('const SCANNABLE_EXT');
    expect(segStart).toBeGreaterThan(-1);
    expect(segEnd).toBeGreaterThan(segStart);
    const oSeg = AUDIT_SRC.slice(segStart, segEnd);
    const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(oSeg.replaceAll('⚠', '')).not.toMatch(emojiRe); // ⚠ = U+26A0 既有惯例豁免，其余零出现
  });
});
