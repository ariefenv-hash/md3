// ==================== weak-password.test.js — #185 弱密码启发式纯逻辑核（v11.07 · R107 二次加餐） ====================
//
// 覆盖：
//   · 键盘相邻序列检测：NightSky 实证样本 asdfgh/qwert/zxcvb/123456 全命中 + 反向 ytrewq +
//     断链重开 + 大小写归一 + 非键盘字符跳过 + minLen 阈值边界（3 键不误报）
//   · 重复序列检测：888888 单字符重复 / abcabcabc 短模式重复 / 单周期不误报（abc）
//   · assessPassword：五类 reason 全形态 + 警告不阻断语义（level warn/ok）+ 强密码零 reason +
//     空串防御
//   · PBKDF2 加盐哈希：hash/verify 往返 + 同密码不同盐异哈希（盐有效性）+ 错误密码 false +
//     异步真跑（node:crypto WebCrypto 形态）+ 迭代数可传
//   · 纪律锚：零 DOM/window 副作用（#147 判据）+ PBKDF2_ITERATIONS 10 万常量

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KEYBOARD_ROWS, ADJACENT_MIN_LEN, REPEAT_MIN_LEN, COMMON_WEAK_SET, PBKDF2_ITERATIONS,
  findAdjacentRun, findRepeatingRun, findSequentialRun, assessPassword,
  generateSalt, hashPassword, verifyPassword,
} from '../ios-desktop/js/aosp/weak-password-heuristics.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'ios-desktop/js/aosp/weak-password-heuristics.js'), 'utf-8');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

describe('v11.07 #185 常量面', () => {
  it('KEYBOARD_ROWS 四行 + 阈值常量（NightSky 实证样本量级）', () => {
    expect(KEYBOARD_ROWS).toEqual(['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890']);
    expect(ADJACENT_MIN_LEN).toBe(4);
    expect(REPEAT_MIN_LEN).toBe(4);
    expect(COMMON_WEAK_SET).toContain('123456');
    expect(COMMON_WEAK_SET).toContain('qwerty');
    expect(COMMON_WEAK_SET).toContain('888888');
    expect(COMMON_WEAK_SET).toContain('abcdefg');
  });
  it('PBKDF2_ITERATIONS = 100000（OWASP 基线量级）', () => {
    expect(PBKDF2_ITERATIONS).toBe(100000);
  });
});

describe('v11.07 #185 findAdjacentRun 键盘相邻序列', () => {
  it('NightSky 实证样本：asdfgh / qwert / zxcvb / 123456 全命中（附命中串）', () => {
    expect(findAdjacentRun('asdfgh')).toBe('asdfgh');
    expect(findAdjacentRun('xqwertz')).toBe('qwert');
    expect(findAdjacentRun('zzxcvbn')).toBe('zxcvbn');
    expect(findAdjacentRun('pass123456word')).toBe('123456');
  });
  it('反向序列同判（ytrewq）', () => {
    expect(findAdjacentRun('ytrewq')).toBe('ytrewq');
    expect(findAdjacentRun('098765')).toBe('098765');
  });
  it('大小写归一 + 非键盘字符断链重开', () => {
    expect(findAdjacentRun('ASDFGH')).toBe('asdfgh');
    expect(findAdjacentRun('qwe-rty')).toBe(null); // '-' 断链：qwe|rty 两段各 3 < 4
    expect(findAdjacentRun('qwe9rty')).toBe(null); // 数字断链（字母行内 9 不连续）
  });
  it('顺序序列（NightSky :805「有规律的字母」两类规律之二）：abcdefg/8765/反向 gfedcba', () => {
    expect(findSequentialRun('abcdefg')).toBe('abcdefg');
    expect(findSequentialRun('98765x')).toBe('98765');
    expect(findSequentialRun('gfedcba')).toBe('gfedcba');
    expect(findSequentialRun('abc')).toBe(null); // 单周期 < 4 不误报
    expect(findAdjacentRun('abcdefg')).toBe(null); // abcdefg 跨行非键盘相邻（两域互不覆盖）
  });
  it('阈值边界：3 键不误报（minLen=4），恰 4 键命中', () => {
    expect(findAdjacentRun('asd')).toBe(null);
    expect(findAdjacentRun('asdf')).toBe('asdf');
    expect(findAdjacentRun('sdfg')).toBe('sdfg');
  });
  it('强密码零命中 + 空串防御', () => {
    expect(findAdjacentRun('xK9#mQ2!')).toBe(null);
    expect(findAdjacentRun('')).toBe(null);
    expect(findAdjacentRun(null)).toBe(null);
  });
});

describe('v11.07 #185 findRepeatingRun 重复序列', () => {
  it('单字符重复：888888 / 1111 命中，333 不误报', () => {
    expect(findRepeatingRun('888888')).toBe('888888');
    expect(findRepeatingRun('x1111y')).toBe('1111');
    expect(findRepeatingRun('333')).toBe(null);
  });
  it('短模式重复：abcabcabc 命中（周期 3），单周期 abc 不误报', () => {
    expect(findRepeatingRun('abcabcabc')).toBe('abcabcabc');
    expect(findRepeatingRun('abc')).toBe(null);
    expect(findRepeatingRun('abab')).toBe('abab');
  });
  it('强密码零命中', () => {
    expect(findRepeatingRun('xK9#mQ2!')).toBe(null);
  });
});

describe('v11.07 #185 assessPassword 五类 reason（警告不阻断）', () => {
  it('NightSky :805 样本组：123456 三类 reason / abcdefg 相邻 / 888888 重复', () => {
    const a = assessPassword('123456');
    expect(a.weak).toBe(true);
    expect(a.level).toBe('warn');
    const kinds = a.reasons.map((r) => r.kind).sort();
    expect(kinds).toEqual(['common-weak', 'keyboard-adjacent', 'numeric-only', 'sequential']); // 123456：顺序+相邻+纯数字+弱集（无重复形态）
    const b = assessPassword('abcdefg');
    expect(b.reasons.some((r) => r.kind === 'sequential')).toBe(true); // 顺序序列（跨行字母表）
    expect(b.reasons.some((r) => r.kind === 'common-weak')).toBe(true);
    const c = assessPassword('888888');
    expect(c.reasons.some((r) => r.kind === 'repeating')).toBe(true);
    const d = assessPassword('abcabcxyz');
    expect(d.reasons.some((r) => r.kind === 'repeating')).toBe(true); // abc 短模式重复（连续相连，总长 6）
  });
  it('强密码零 reason + level ok（警告不阻断语义：核内零拦截，消费方 UI 提示）', () => {
    const a = assessPassword('xK9#mQ2!vL');
    expect(a.weak).toBe(false);
    expect(a.level).toBe('ok');
    expect(a.reasons).toEqual([]);
  });
  it('too-short / numeric-only 独立形态 + 空串防御', () => {
    expect(assessPassword('abc1').reasons.some((r) => r.kind === 'too-short')).toBe(true);
    expect(assessPassword('987654').reasons.some((r) => r.kind === 'numeric-only')).toBe(true);
    expect(assessPassword('')).toEqual({ weak: false, reasons: [], level: 'ok' });
    expect(assessPassword(null).weak).toBe(false);
  });
});

describe('v11.07 #185 PBKDF2 加盐哈希（WebCrypto 真跑）', () => {
  it('generateSalt 16 字节随机 + 双调不同', () => {
    const s1 = generateSalt();
    const s2 = generateSalt();
    expect(s1).toBeInstanceOf(Uint8Array);
    expect(s1.length).toBe(16);
    expect([...s1].join()).not.toBe([...s2].join());
  });
  it('hash/verify 往返真跑 + hashHex 64 字符 + iterations 在录', async () => {
    const { hashHex, saltHex, iterations } = await hashPassword('correct horse');
    expect(hashHex).toHaveLength(64);
    expect(saltHex).toHaveLength(32);
    expect(iterations).toBe(100000);
    expect(await verifyPassword('correct horse', { hashHex, saltHex, iterations })).toBe(true);
    expect(await verifyPassword('wrong pass', { hashHex, saltHex, iterations })).toBe(false);
  });
  it('同密码不同盐 → 异哈希（盐有效性）+ 固定盐确定性', async () => {
    const a = await hashPassword('same pw');
    const b = await hashPassword('same pw');
    expect(a.hashHex).not.toBe(b.hashHex);
    expect(a.saltHex).not.toBe(b.saltHex);
    const c = await hashPassword('same pw', { salt: generateSalt() });
    const d = await hashPassword('same pw', { salt: new Uint8Array(16).fill(7) });
    expect(typeof d.hashHex).toBe('string');
    const d2 = await hashPassword('same pw', { salt: new Uint8Array(16).fill(7) });
    expect(d.hashHex).toBe(d2.hashHex); // 固定盐确定性（重派生可比对）
    void c;
  });
  it('降迭代传参生效（测试提速形态）+ verify 降迭代往返', async () => {
    const { hashHex, saltHex } = await hashPassword('quick', { iterations: 1000 });
    expect(await verifyPassword('quick', { hashHex, saltHex, iterations: 1000 })).toBe(true);
    expect(await verifyPassword('quick', { hashHex, saltHex, iterations: 100000 })).toBe(false); // 迭代数不一致 → 派生异值
  });
});

describe('v11.07 #185 纪律锚 + 版本锚', () => {
  it('纯逻辑核纪律：零 DOM 副作用（#147 判据；crypto 注入式访问）', () => {
    expect(SRC).not.toMatch(/document\./);
    expect(SRC).toMatch(/typeof crypto !== 'undefined'/);
    expect(SRC).toMatch(/export async function hashPassword/);
    expect(SRC).toMatch(/export async function verifyPassword/);
  });
  it('警告不阻断语义注记在录（NightSky「不改也行」承袭）', () => {
    expect(SRC).toContain('只警告不阻断');
  });
  it('pkg 11.7.0', () => {
    expect(PKG.version).toBe('11.7.0');
  });
});
