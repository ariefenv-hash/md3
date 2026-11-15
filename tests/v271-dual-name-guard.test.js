// ==================== v271-dual-name-guard.test.js — js/ × js/aosp/ 跨目录同名守卫（#271） ====================
//
// 卡面：js/ 与 js/aosp/ 同名三对并存且两侧各有引用，「唯一真源未裁决」。
// 裁决（docs/audits/dual-name-adjudication.md）：分层契约范式 —— aosp/ = AOSP 1:1 纯逻辑核，
// js/ = DOM/会话态接线壳；非二选一存量，防分叉靠「登记 + 契约 + 守恒」三闸：
//   A1 登记闸：现值 3 对白名单，出现新跨目录同名对即红（先登记后放行，#269 B1 守恒同律）；
//   A2 契约闸：每对壳层必须 import 核（分层契约的机器化；壳层自造旧版逻辑 = 静默分叉源）；
//   B1 单真源闸：gen-dual-name-audit.mjs --check 对盘上件逐字节比对（生成件随树纪律）；
//   B2 消费方守恒：JSON 逐项复核 —— shellConsumers 文件现存且含 stem 引用、
//      coreConsumers 文件现存且含 aosp/<stem>.js 引用（防 JSON 过期漂移）；
//   C1 运行时裁决锚：两入口 html 零 <script src> 加载两侧（纯 ESM import 图，无加载序竞态）。
//
// 常青声明：v271-<行为> 常青锚；裁决演进（如新增同名对）原地改 KNOWN_PAIRS 并在
// docs/audits/dual-name-adjudication.md 登记理由。

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'ios-desktop', 'js');
const AOSP = join(JS, 'aosp');
const JSON_PATH = join(ROOT, 'docs', 'audits', 'dual-name-adjudication.json');

// #271 裁决登记表（新增跨目录同名对必须在此登记并同步 md 报告 §一）
const KNOWN_PAIRS = ['bubbles', 'screen-pinning', 'one-handed'];

const read = (p) => readFileSync(p, 'utf-8');

describe('v271 · A 组：登记与契约闸', () => {
  const shellStems = readdirSync(JS).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
  const aospStems = readdirSync(AOSP).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
  const dual = shellStems.filter((s) => aospStems.includes(s)).sort();

  it('A1 登记闸：跨目录同名对 = 登记表（新增即红=先登记后放行）', () => {
    expect(dual.sort()).toEqual([...KNOWN_PAIRS].sort());
  });

  it.each(KNOWN_PAIRS)('A2 契约闸：%s 壳层 import 核（分层契约，壳不得自造核语义入口）', (stem) => {
    const shellSrc = read(join(JS, `${stem}.js`));
    expect(shellSrc).toContain(`from './aosp/${stem}.js'`);
  });
});

describe('v271 · B 组：生成件单真源与守恒', () => {
  it('B1 --check 单真源闸（生成件与现树逐字节一致）', () => {
    const out = execFileSync('node', [join(ROOT, 'scripts', 'gen-dual-name-audit.mjs')], {
      cwd: ROOT, encoding: 'utf-8',
    });
    expect(out).toContain('--check OK');
  });

  it('B2 消费方守恒：JSON 逐项复核现存性与引用真实性', () => {
    const doc = JSON.parse(read(JSON_PATH));
    expect(doc.schema).toBe(1);
    const stems = doc.pairs.map((p) => p.stem).sort();
    expect(stems).toEqual([...KNOWN_PAIRS].sort());
    for (const p of doc.pairs) {
      expect(existsSync(join(ROOT, p.shell.path)), `${p.stem} 壳文件在库`).toBe(true);
      expect(existsSync(join(ROOT, p.core.path)), `${p.stem} 核文件在库`).toBe(true);
      expect(p.shellImportsCore, `${p.stem} 壳→核 import 真值`).toBe(true);
      for (const f of p.shellConsumers) {
        const full = join(ROOT, f);
        expect(existsSync(full), `壳侧消费方在库：${f}`).toBe(true);
        expect(read(full)).toMatch(new RegExp(`(?<!aosp/)${p.stem}\\.js`));
      }
      for (const f of p.coreConsumers) {
        const full = join(ROOT, f);
        expect(existsSync(full), `核侧消费方在库：${f}`).toBe(true);
        expect(read(full)).toContain(`aosp/${p.stem}.js`);
      }
    }
  });
});

describe('v271 · C 组：运行时加载裁决锚', () => {
  it('C1 两入口 html 零 <script src> 加载同名对两侧（纯 ESM import 图）', () => {
    for (const html of [join(ROOT, 'index.html'), join(ROOT, 'ios-desktop', 'index.html')]) {
      const txt = read(html);
      for (const stem of KNOWN_PAIRS) {
        expect(txt).not.toMatch(new RegExp(`<script[^>]*src=[^>]*${stem}\\.js`));
      }
    }
  });
});
