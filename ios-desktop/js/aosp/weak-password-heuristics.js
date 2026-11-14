// ==================== weak-password-heuristics.js — 弱密码启发式纯逻辑核（v11.30 #185） ====================
//
// 来源：NightSky PC 版思路提取（nightsky_pc.html:762/805，#185 立题实证锚）：
//   「检测键盘连续顺序（最常用弱密码）：asdfgh、qwert、zxcvb」+「您所设置的密码不安全……
//   （不改也行）」——**警告不阻断**（不牺牲可用性）是 NightSky 的核心取向，本核逐字承袭。
//
// md3 现状核查（R107 窗实拉，立题「先查再动」结论在录）：
//   lock-screen.js 仅滑动解锁（A17 Keyguard 无滑动解锁先例注释 L30-34 在录），零密码/PIN 面；
//   settings.js 仅「屏幕锁定提示音」（声音设置非密码）。**md3 无锁屏密码体系**——
//   立题「建议范围」前提不成立，本窗按 #147 纯逻辑判据落核先位：检测启发式 + 加盐哈希
//   双能力独立交付，未来锁屏 PIN 面 / pkg 安装器密码面 / 任意密码输入面通用消费。
//
// 能力面（双能力）：
//   ① 弱密码启发式检测：键盘物理相邻序列（QWERTY 行内连续，正反双向）/ 重复序列（888888）/
//      常见弱密码集命中 / 纯数字 / 长度不足——assessPassword 返回 reason 列表，**只警告不阻断**
//     （消费方按 UI 提示处理，核内零拦截语义）；
//   ② 加盐哈希：PBKDF2-SHA256（WebCrypto，10 万迭代 + 16B 随机盐）——正面兑现 #185 §安全纪律
//     「不要照抄裸 MD5（无盐）」：本地锁屏语义是「防随手翻看」非真安全边界（网页无 TEE，
//     Gatekeeper 硬件绑定/防暴力擦除语义为超越项放弃，#185 §归属三条在录）。
//
// AOSP 对标（#185 §归属）：真机锁屏密码走 LockPatternUtils + Gatekeeper/TEE（硬件-backed），
//   网页端无硬件密钥库——本核为超越项落地，诚实标注非安全边界。

/** QWERTY 四行（物理相邻定义：同一行内索引 ±1；数字行含手机九宫顶行形态） */
export const KEYBOARD_ROWS = Object.freeze([
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  '1234567890',
]);

/** 行内相邻连续子串最小长度（NightSky :762 实证样本 asdfgh=6/qwert=5/zxcvb=5；
 *  阈值 4：3 键连击如「asd」误报率高——工程调优值，非 AOSP 常量，诚实标注） */
export const ADJACENT_MIN_LEN = 4;

/** 重复序列最小长度（888888 类；NightSky :805 提示「88888」5 连实证，取 4 折中） */
export const REPEAT_MIN_LEN = 4;

/** 常见弱密码集（Top 弱密码小集合内嵌；NightSky :805 abcdefg/123456/88888 样本全收） */
export const COMMON_WEAK_SET = Object.freeze([
  '123456', '1234567', '12345678', '123456789', '1234567890',
  'password', 'password1', 'qwerty', 'qwertyuiop', 'abc123', 'abcdefg',
  '111111', '000000', '888888', '666666', '123123', '654321', '159753',
]);

/** 行内相邻序列检测（纯函数）：返回命中的最长连续子串（正反双向——qwerty 与 ytrewq 同判），
 *  长度 >= ADJACENT_MIN_LEN；大小写归一小写后比对；非键盘字符（空格/符号/中文）逐字符断链 */
export function findAdjacentRun(input, minLen = ADJACENT_MIN_LEN) {
  const s = String(input || '').toLowerCase();
  let best = null;
  for (const row of KEYBOARD_ROWS) {
    const revRow = [...row].reverse().join('');
    for (const dir of [row, revRow]) {
      let run = '';
      for (const ch of s) {
        if (dir.includes(ch)) {
          const prev = run[run.length - 1];
          if (prev === undefined) run = ch;
          else {
            const pi = dir.indexOf(prev), ci = dir.indexOf(ch);
            if (ci === pi + 1) run += ch; // 行内连续相邻
            else run = ch; // 断链重开
          }
          if (run.length >= minLen && (!best || run.length > best.length)) best = run;
        } else run = '';
      }
    }
  }
  return best;
}

/** 重复序列检测（纯函数）：单字符重复（888888）/ 短模式重复（abcabc，周期 1-3）双形态，
 *  返回最长命中（总重复长度 >= minLen；单周期 < minLen 不误报） */
export function findRepeatingRun(input, minLen = REPEAT_MIN_LEN) {
  const s = String(input || '');
  let best = null;
  // 单字符重复
  let run = '';
  let runCh = '';
  for (const ch of s) {
    if (ch === runCh) {
      run += ch;
      if (run.length >= minLen && (!best || run.length > best.length)) best = run;
    } else { runCh = ch; run = ch; }
  }
  // 短模式重复（周期 1-3，总重复长度 >= minLen 防误报单周期）
  for (const period of [1, 2, 3]) {
    for (let i = 0; i + period * 2 <= s.length; i++) {
      const pat = s.slice(i, i + period);
      let j = i + period, reps = 1;
      while (j + period <= s.length && s.slice(j, j + period) === pat) { reps++; j += period; }
      const total = reps * period;
      if (total >= minLen && (!best || total > best.length)) best = pat.repeat(reps);
    }
  }
  return best;
}

/** 字母表/数字顺序序列（NightSky :805「有规律的字母」abcdefg 形态——与键盘相邻（:762 行内
 *  物理相邻）是两类规律；正反双向，字母表 + 数字行双域） */
const SEQUENCE_DOMAINS = Object.freeze(['abcdefghijklmnopqrstuvwxyz', '0123456789']);

/** 顺序序列检测（纯函数）：返回最长连续递增/递减子串（同域内索引 ±1 连续，
 *  长度 >= minLen；abcdefg / gfedcba / 12345 / 8765 全形态） */
export function findSequentialRun(input, minLen = ADJACENT_MIN_LEN) {
  const s = String(input || '').toLowerCase();
  let best = null;
  for (const domain of SEQUENCE_DOMAINS) {
    const rev = [...domain].reverse().join('');
    for (const dir of [domain, rev]) {
      let run = '';
      for (const ch of s) {
        if (dir.includes(ch)) {
          const prev = run[run.length - 1];
          if (prev === undefined) run = ch;
          else {
            const pi = dir.indexOf(prev), ci = dir.indexOf(ch);
            if (ci === pi + 1) run += ch;
            else run = ch;
          }
          if (run.length >= minLen && (!best || run.length > best.length)) best = run;
        } else run = '';
      }
    }
  }
  return best;
}

/** 弱密码综合评估（纯函数，**只警告不阻断**——返回 reasons 供消费方 UI 提示）：
 *  reasons 命中形态：keyboard-adjacent（键盘相邻序列，附命中串）/ sequential（字母表/数字顺序）/
 *  repeating（重复序列）/ common-weak（常见弱密码集命中）/ numeric-only（纯数字）/ too-short（< 6 位） */
export function assessPassword(pw) {
  const s = String(pw == null ? '' : pw);
  const reasons = [];
  if (s.length > 0 && s.length < 6) reasons.push({ kind: 'too-short', detail: '长度不足 6 位' });
  if (s.length > 0 && /^\d+$/.test(s)) reasons.push({ kind: 'numeric-only', detail: '纯数字' });
  const cw = COMMON_WEAK_SET.includes(s.toLowerCase());
  if (cw) reasons.push({ kind: 'common-weak', detail: '常见弱密码' });
  const adj = findAdjacentRun(s);
  if (adj) reasons.push({ kind: 'keyboard-adjacent', detail: `键盘相邻序列「${adj}」` });
  const seq = findSequentialRun(s);
  if (seq) reasons.push({ kind: 'sequential', detail: `顺序序列「${seq}」` });
  const rep = findRepeatingRun(s);
  if (rep) reasons.push({ kind: 'repeating', detail: `重复序列「${rep}」` });
  return { weak: reasons.length > 0, reasons, level: reasons.length > 0 ? 'warn' : 'ok' };
}

/** 随机盐生成（16 字节，crypto.getRandomValues；node 与浏览器通用形态） */
export function generateSalt() {
  const g = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : undefined;
  if (!g) throw new Error('crypto.getRandomValues unavailable');
  const bytes = new Uint8Array(16);
  g.getRandomValues(bytes);
  return bytes;
}

/** PBKDF2-SHA256 加盐哈希（WebCrypto；100k 迭代——OWASP 2023 基线量级，
 *  网页端可承受耗时；正面兑现 #185 §安全纪律「至少加盐」）：
 *  返回 { hashHex, saltHex, iterations } 存档形态（salt 随 hash 同存——校验时重派生比对） */
export const PBKDF2_ITERATIONS = 100000;

export async function hashPassword(pw, { salt, iterations = PBKDF2_ITERATIONS } = {}) {
  const s = String(pw == null ? '' : pw);
  const saltBytes = salt instanceof Uint8Array ? salt : generateSalt();
  const subtle = (typeof crypto !== 'undefined' && crypto.subtle) ? crypto.subtle : undefined;
  if (!subtle) throw new Error('WebCrypto subtle unavailable');
  const key = await subtle.importKey('raw', new TextEncoder().encode(s), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations }, key, 256);
  const toHex = (arr) => [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { hashHex: toHex(new Uint8Array(bits)), saltHex: toHex(saltBytes), iterations };
}

/** 校验（重派生恒时比对语义——逐字节比较，长度恒定 32B hex 64 字符零短路差异面） */
export async function verifyPassword(pw, { hashHex, saltHex, iterations = PBKDF2_ITERATIONS }) {
  const saltBytes = new Uint8Array((saltHex || '').match(/.{2}/g)?.map((h) => parseInt(h, 16)) || []);
  const { hashHex: reHash } = await hashPassword(String(pw == null ? '' : pw), { salt: saltBytes, iterations });
  if (!hashHex || hashHex.length !== reHash.length) return false;
  let diff = 0;
  for (let i = 0; i < reHash.length; i++) diff |= reHash.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}
