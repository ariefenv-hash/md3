// ==================== same-name-facade.test.js — 同名 js/mjs 并存「门面契约」守卫（#270 施工批 · 裁决卷 §5 兑现） ====================
//
// 被测真身：ios-desktop/** 同 stem 同目录 js+mjs 并存对（实态唯一：clock-core 一对，
// 预扫 node 实证）+ 两件本体头注互指闭环。
//
// 守卫语义（#270 裁决卷 2d77a739 §3/§5 的机器化执行面）：
//   「并存即须门面契约」双闸 = ①登记闸（每对必须落入 FACADE_PAIRS 裁决登记表，
//     未登记即红——新并存对强制先走裁决流程）+ ②契约闸（每对必须满足 §3 门面纪律
//     四判据，白名单登记不豁免契约——裁决卷「或」读法收紧为「登记∧契约」，clock-core
//     现状态天然双满足，收紧只强化未来增量防线，现网判定不变）。
//   四判据机器口径（§3「零逻辑复制」的具体化，B 组逐条锚钉扎）：
//     R1 行数悬殊：mjs 行数 ×2 < js 行数（「≪」的确定性读法）
//     R2 头注声明：mjs 头部 8 行明文含 门面|单源|零逻辑复制 任一
//     R3 业务逻辑指纹：剥注后 mjs 零 state/IO/域逻辑指纹（setTimeout/setInterval/
//        localStorage/Math.random/new Date/addEventListener/DOM 查询/class 声明/
//        JSON.parse/fetch——loadClassicCore 的 document.createElement 属形态门面
//        职责，不在指纹清单）
//     R4 顶层直读：剥注后含 window.__ 的行必须是「export const 访问器形」
//        （含 export const 或 =>；#226/F6 惰性访问同律），裸语句直读即红
//   #271 边界（裁决卷 §5.3）：跨目录同名（js/ vs js/aosp/）不在本守卫扫描语义内，
//     A2 锚钉扎同目录配对语义。
//
// 常青声明（#291 §6 命名纪律）：<特性名>-<行为> 常青锚，随门面纪律演进原地改；
// 无 @snapshot 头（非交付时点快照）。
//
// 撰写纪律（自指陷阱防雷，R150 实录）：本文件源码文本会被 gen-test-prefix-inventory
// 三族正则扫描——合成路径一律运行时 mk() 拆串；真实路径字面量仅允许根相对且现存者
// （ios-desktop/js/clock-core 两件以根相对全路径书写）；ios-desktop 相对短键一律
// mk() 构造；注释内不写带扩展名的存在性路径。

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IOS = join(ROOT, 'ios-desktop');

// —— 运行时拆串构造器（自指陷阱防雷） ——
const mk = (...parts) => parts.join('');
const CC_KEY = mk('js/', 'clock-core');           // ios-desktop 相对登记键
const CC_JS = mk('clock-core', '.js');
const CC_MJS = mk('clock-core', '.mjs');
const SYNTH_DIR = mk('zz', '-synth');

// —— 裁决登记表（并存合法性唯一来源；键 = ios-desktop 相对 dir/stem） ——
const FACADE_PAIRS = {
  [CC_KEY]: {
    adjudication: '#270 裁决卷 2d77a739（R150 窗 · 第 1 定时消息系列）',
    form: '逻辑单源 js + 形态门面 mjs 双件共存（零迁移零删除）',
  },
};

// ==================== 纯逻辑层 ====================

const SKIP_DIRS = new Set(['node_modules', '_shared', 'vendor']);

function listFiles(root) {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(join(d, e.name));
      } else {
        out.push(join(d, e.name));
      }
    }
  })(root);
  return out;
}

/** 同目录同 stem js+mjs 对扫描（跨目录不同对——#271 边界语义） */
function findSameStemPairs(files) {
  const byStem = new Map();
  for (const f of files) {
    const m = f.match(/\.mjs$/) || f.match(/(?<=\.)(?:js)$/);
    if (!m) continue;
    const isM = f.endsWith('.mjs');
    const stem = isM ? f.slice(0, -4) : f.slice(0, -3);
    const rec = byStem.get(stem) || {};
    if (isM) rec.mjs = f; else rec.js = f;
    byStem.set(stem, rec);
  }
  const pairs = [];
  for (const [stem, rec] of byStem) {
    if (rec.js && rec.mjs) {
      pairs.push({
        key: stem.slice(IOS.length + sep.length).split(sep).join('/'),
        jsPath: rec.js,
        mjsPath: rec.mjs,
      });
    }
  }
  return pairs.sort((a, b) => a.key.localeCompare(b.key));
}

/** 引号感知剥注释（行注释 + 块注释；'…'/"…"/`…` 字面量内不动——R92 字符串感知扫描同律） */
function stripComments(src) {
  let out = '', i = 0, q = null;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (q) {
      out += c;
      if (c === '\\') { out += d ?? ''; i += 2; continue; }
      if (c === q) q = null;
      i += 1; continue;
    }
    if (c === '\'' || c === '"' || c === '`') { q = c; out += c; i += 1; continue; }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i += 1; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i += 1; i += 2; continue; }
    out += c; i += 1;
  }
  return out;
}

const HEADER_TOKENS = ['门面', '单源', '零逻辑复制'];
const LOGIC_FPS = [
  [/setTimeout\s*\(/, 'setTimeout'],
  [/setInterval\s*\(/, 'setInterval'],
  [/localStorage\./, 'localStorage'],
  [/Math\.random\s*\(/, 'Math.random'],
  [/new Date\s*\(/, 'new Date'],
  [/addEventListener\s*\(/, 'addEventListener'],
  [/document\.(querySelector|getElementById|querySelectorAll)/, 'DOM 查询'],
  [/\bclass\s+[A-Za-z_$]/, 'class 声明'],
  [/JSON\.parse\s*\(/, 'JSON.parse'],
  [/\bfetch\s*\(/, 'fetch'],
];

/** 门面契约四判据分类（R1–R4，全过 → violations 空） */
function classifyFacadePair(jsSrc, mjsSrc) {
  const violations = [];
  const jsLines = jsSrc.split('\n').length;
  const mjsLines = mjsSrc.split('\n').length;
  // R1 行数悬殊（「≪」机器口径：mjs ×2 < js）
  if (!(mjsLines * 2 < jsLines)) {
    violations.push({ rule: 'R1-行数悬殊', detail: mk('mjs=', String(mjsLines), ' js=', String(jsLines), ' 未达 1:2') });
  }
  // R2 头注门面声明（头部 8 行任一 token）
  const header = mjsSrc.split('\n').slice(0, 8).join('\n');
  if (!HEADER_TOKENS.some((t) => header.includes(t))) {
    violations.push({ rule: 'R2-头注声明', detail: mk('头部 8 行缺 ', HEADER_TOKENS.join('/')) });
  }
  // R3 业务逻辑指纹（剥注后）
  const stripped = stripComments(mjsSrc);
  for (const [re, name] of LOGIC_FPS) {
    if (re.test(stripped)) violations.push({ rule: 'R3-业务逻辑指纹', detail: mk('命中 ', name) });
  }
  // R4 顶层 window.__ 直读（剥注后：含 window.__ 的行须为 export const/=> 访问器形）
  for (const line of stripped.split('\n')) {
    if (!line.includes('window.__')) continue;
    if (!/export const/.test(line) && !/=>/.test(line)) {
      violations.push({ rule: 'R4-顶层直读', detail: mk('裸语句直读: ', line.trim().slice(0, 60)) });
    }
  }
  return { violations, jsLines, mjsLines };
}

/** 登记闸：每对已登记（未登记红）+ 每条登记有实对（陈旧红） */
function checkRegistry(pairs, registry) {
  const violations = [];
  const keys = new Set(pairs.map((p) => p.key));
  for (const p of pairs) {
    if (!registry[p.key]) violations.push({ rule: '登记闸-未登记', detail: mk('并存对未裁决登记: ', p.key) });
  }
  for (const key of Object.keys(registry)) {
    if (!keys.has(key)) violations.push({ rule: '登记闸-陈旧', detail: mk('登记无实对（已退役？）: ', key) });
  }
  return violations;
}

// ==================== A 组：纯逻辑单测（合成注入） ====================

describe('same-name-facade 纯逻辑层（扫描/剥注/四判据/登记闸）', () => {
  it('A1 同目录同 stem 配对：js+mjs 成对，无 mjs 独立 stem 不成对', () => {
    const files = [`${IOS}/a/${SYNTH_DIR}.js`, `${IOS}/a/${SYNTH_DIR}.mjs`, `${IOS}/a/${SYNTH_DIR}-solo.js`];
    const pairs = findSameStemPairs(files);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].key).toBe(mk('a/', SYNTH_DIR));
  });

  it('A2 跨目录同名不成对（#271 边界语义钉扎）', () => {
    const files = [`${IOS}/x/${SYNTH_DIR}.js`, `${IOS}/x/sub/${SYNTH_DIR}.mjs`];
    expect(findSameStemPairs(files)).toHaveLength(0);
  });

  it('A3 第三方域排除：walk 跳过 _shared/vendor 与 node_modules 段', () => {
    expect(SKIP_DIRS.has('_shared')).toBe(true);
    expect(SKIP_DIRS.has('vendor')).toBe(true);
    expect(SKIP_DIRS.has('node_modules')).toBe(true);
  });

  it('A4 剥注释引号感知：字符串内 // 与 /* 不被误剥，真注释剥净', () => {
    const src = mk("const u = 'a//b/*c';", '\n', '// tail comment\n', 'const v = 1; /* mid */ const w = 2;');
    const stripped = stripComments(src);
    expect(stripped).toContain("'a//b/*c'");
    expect(stripped).not.toContain('tail comment');
    expect(stripped).not.toContain('mid');
    expect(stripped).toContain('const w = 2;');
  });

  it('A5 R1 行数悬殊：mjs 过半即红，达标即过', () => {
    const jsSrc = Array.from({ length: 20 }, (_, i) => mk('// l', String(i))).join('\n');
    const okMjs = mk('// 门面 单源\n', 'export const get = () => 1;');
    expect(classifyFacadePair(jsSrc, okMjs).violations.filter((v) => v.rule.startsWith('R1'))).toHaveLength(0);
    const longMjs = Array.from({ length: 12 }, (_, i) => mk('// l', String(i))).join('\n');
    expect(classifyFacadePair(jsSrc, longMjs).violations.some((v) => v.rule === 'R1-行数悬殊')).toBe(true);
  });

  it('A6 R2 头注声明：缺 门面/单源/零逻辑复制 即红', () => {
    const jsSrc = mk('// a\n// b\n// c\n// d\n// e\n// f\n// g\n// h\n// i\n// j\n');
    const bare = mk('// 普通工具\n', 'export const get = () => 1;');
    expect(classifyFacadePair(jsSrc, bare).violations.some((v) => v.rule === 'R2-头注声明')).toBe(true);
    const declared = mk('// 门面声明在此\n', 'export const get = () => 1;');
    expect(classifyFacadePair(jsSrc, declared).violations.filter((v) => v.rule === 'R2-头注声明')).toHaveLength(0);
  });

  it('A7 R3 业务逻辑指纹：setTimeout/类声明/DOM 查询即红（运行时拆串）', () => {
    const jsSrc = Array.from({ length: 20 }, (_, i) => mk('// l', String(i))).join('\n');
    const header = mk('// 门面 单源 零逻辑复制\n');
    const bad = mk(header, 'function tick(){', 'setTimeout(fn, 0);', '}\n');
    const got = classifyFacadePair(jsSrc, bad).violations.filter((v) => v.rule === 'R3-业务逻辑指纹');
    expect(got.length).toBeGreaterThanOrEqual(1);
    const clean = mk(header, 'export const get = () => 1;\n');
    expect(classifyFacadePair(jsSrc, clean).violations.filter((v) => v.rule.startsWith('R3'))).toHaveLength(0);
  });

  it('A8 R4 顶层直读：裸语句直读 window.__ 即红，export const 访问器形放行', () => {
    const jsSrc = Array.from({ length: 20 }, (_, i) => mk('// l', String(i))).join('\n');
    const header = mk('// 门面 单源 零逻辑复制\n');
    const bad = mk(header, 'const st = window', '.__cc.State;\n');
    expect(classifyFacadePair(jsSrc, bad).violations.some((v) => v.rule === 'R4-顶层直读')).toBe(true);
    const ok = mk(header, 'export const getCc = () => window', '.__cc || null;\n');
    expect(classifyFacadePair(jsSrc, ok).violations.filter((v) => v.rule === 'R4-顶层直读')).toHaveLength(0);
  });

  it('A9 登记闸双红：未登记并存对红 + 陈旧登记键红；齐全即绿', () => {
    const pair = { key: mk('a/', SYNTH_DIR), jsPath: 'x', mjsPath: 'y' };
    expect(checkRegistry([pair], {})).toEqual([expect.objectContaining({ rule: '登记闸-未登记' })]);
    expect(checkRegistry([], { [mk('a/', SYNTH_DIR)]: {} })).toEqual([expect.objectContaining({ rule: '登记闸-陈旧' })]);
    expect(checkRegistry([pair], { [mk('a/', SYNTH_DIR)]: {} })).toHaveLength(0);
  });
});

// ==================== B 组：真身实树守卫（测的即运行真身） ====================

describe('same-name-facade 真实树守卫（ios-desktop/** 扫描 + clock-core 互指闭环）', () => {
  const files = listFiles(IOS);
  const pairs = findSameStemPairs(files);

  it('B1 全树同名 js/mjs 并存对实态 = 唯一 clock-core 一对（新增并存对未登记必红）', () => {
    expect(pairs.map((p) => p.key)).toEqual([CC_KEY]);
  });

  it('B2 真身契约闸：clock-core 对四判据全过（R1–R4 零违规）', () => {
    const pair = pairs[0];
    const jsSrc = readFileSync(pair.jsPath, 'utf8');
    const mjsSrc = readFileSync(pair.mjsPath, 'utf8');
    const { violations } = classifyFacadePair(jsSrc, mjsSrc);
    expect(violations).toEqual([]);
  });

  it('B3 真身四判据逐条正锚（行数比/头注 token/指纹零命中/访问器形直读）', () => {
    const jsSrc = readFileSync(join(IOS, 'js', CC_JS), 'utf8');
    const mjsSrc = readFileSync(join(IOS, 'js', CC_MJS), 'utf8');
    const { jsLines, mjsLines } = classifyFacadePair(jsSrc, mjsSrc);
    expect(mjsLines * 2).toBeLessThan(jsLines);
    const header = mjsSrc.split('\n').slice(0, 8).join('\n');
    expect(HEADER_TOKENS.some((t) => header.includes(t))).toBe(true);
    const stripped = stripComments(mjsSrc);
    for (const [re] of LOGIC_FPS) expect(re.test(stripped)).toBe(false);
    const accessorLines = stripped.split('\n').filter((l) => l.includes('window.__') && /export const/.test(l));
    expect(accessorLines.length).toBeGreaterThanOrEqual(1);
  });

  it('B4 真身登记闸：扫描对键集与裁决登记表键集全等（双向零漂移）', () => {
    expect(checkRegistry(pairs, FACADE_PAIRS)).toEqual([]);
    expect(new Set(pairs.map((p) => p.key))).toEqual(new Set(Object.keys(FACADE_PAIRS)));
  });

  it('B5 头注互指闭环：.js 侧补齐指向门面件（.mjs→.js 既有，.js→.mjs 本批补）', () => {
    const jsSrc = readFileSync(join(IOS, 'js', CC_JS), 'utf8');
    expect(jsSrc).toContain(CC_MJS);
    expect(jsSrc).toContain('#270');
    const mjsSrc = readFileSync(join(IOS, 'js', CC_MJS), 'utf8');
    expect(mjsSrc).toContain(CC_JS);
  });

  it('B6 守卫自防：真身 mjs 混入业务指纹/裸直读后必红（洗账不可达）', () => {
    const real = readFileSync(join(IOS, 'js', CC_MJS), 'utf8');
    const jsSrc = readFileSync(join(IOS, 'js', CC_JS), 'utf8');
    const poisoned = mk(real, '\nfunction evil(){', 'setTimeout(f, 0);', '}\n');
    expect(classifyFacadePair(jsSrc, poisoned).violations.some((v) => v.rule === 'R3-业务逻辑指纹')).toBe(true);
    const stolen = mk(real, '\nconst st = window', '.__clockCore.State;\n');
    expect(classifyFacadePair(jsSrc, stolen).violations.some((v) => v.rule === 'R4-顶层直读')).toBe(true);
  });
});
