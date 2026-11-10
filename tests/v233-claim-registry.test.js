// ==================== v233-claim-registry.test.js — #233 认领租约协议脚本化回归 ====================
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=claim 注册面内容；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）——R149 改名机械批注入
//
// 背景：#233「认领租约（TTL）+ 僵尸认领回收协议」§四落地物 scripts/claim-registry.mjs 首版入库
// （R125 窗加餐二段 · Job 2932311）。#18 §12.3 明录「已裁决未落地：scripts/claim-registry.mjs
// 与 docs/HANDOFF.md 尚未入库」——本批把协议语义固化为纯函数锚，IO（REST）与纯核分离零网络依赖。
//
// 覆盖（#233 §五 验收用例逐条对应 + §七/§九 关闭/判活语义）：
//   A. CLAIM 租约解析（key=value 正规 + 位置形态兼容 + 必填校验/缺 lane 拒绝/ISO/ttl 双单位）
//   B. 租约状态机（验收① 25h→STALE / ⑥ 23h 有预告→ACTIVE / ⑦ 5h 零痕迹→SUSPICIOUS 不 STALE /
//      ⑧ 人工回收 30min→释放不受 TTL / ⑨ 跨槽 +30min 不短杀 / 释放帖 / 判活豁免 / state=closed 结构化释放）
//   C. 议题级提示（交付+open+无标签→NEEDS_REVIEW 提示级不自动补关 / pending-verification 白名单 /
//      判活→alive_confirmed / closed 天然排除）
//   D. 协议负向锚（旧「跨槽 +30min 自动失效」不得复活——35min 无槽位概念仍 ACTIVE；
//      取号预告只算痕迹不续期；后继交付才计数，认领前评论不参与判定）
//
// 关联 #233 #234 #18 §7.6/§7.7/§12.3 §9 步5 认领协议。

import { describe, test, expect } from 'vitest';
import { parseClaimLease, computeLeaseStatus, computeIssueFlag } from '../scripts/claim-registry.mjs';

const NOW = Date.parse('2026-11-08T04:00:00Z');
const c = (id, createdAt, body) => ({ id, createdAt, body });

// ==================== A. CLAIM 租约解析 ====================

describe('A. CLAIM 租约解析（#233 §三① 机器可读字段）', () => {
  test('A1 正规 key=value 七字段全解析（lane 正面声明在案）', () => {
    const p = parseClaimLease('正文说明……\nCLAIM|issue=229|instance=Job-2931605|slot=R125-202611080600|at=2026-11-07T22:23:49Z|ttl=24h|lane=apps/gravity/*,apps/typing/*,tests/|claim_comment=本帖');
    expect(p).toBeTruthy();
    expect(p.invalid).toBe(false);
    expect(p.issue).toBe('229');
    expect(p.instance).toBe('Job-2931605');
    expect(p.slot).toBe('R125-202611080600');
    expect(p.ttlMin).toBe(1440);
    expect(p.lane).toBe('apps/gravity/*,apps/typing/*,tests/');
    expect(p.claimComment).toBe('本帖');
  });

  test('A2 位置形态向后兼容（R125 窗 #232 认领帖实录格式）', () => {
    const p = parseClaimLease('CLAIM|#232|Job2932311|R125-20261108T0600|2026-11-08T06:10+08:00|ttl=24h|lane=ci-teardown-timers|claim_comment=本帖');
    expect(p).toBeTruthy();
    expect(p.invalid).toBe(false);
    expect(p.issue).toBe('232');
    expect(p.instance).toBe('Job2932311');
    expect(p.ttlMin).toBe(1440);
    expect(p.lane).toBe('ci-teardown-timers');
  });

  test('A3 缺 lane → invalid（验收⑤ 解析侧同源判定）', () => {
    const p = parseClaimLease('CLAIM|issue=1|instance=A|slot=R1|at=2026-11-08T00:00:00Z|ttl=24h|claim_comment=本帖');
    expect(p).toBeTruthy();
    expect(p.invalid).toBe(true);
    expect(p.reason).toContain('lane');
  });

  test('A4 ttl 双单位（24h=1440min / 90m=90min）与非法 ttl 拒绝', () => {
    expect(parseClaimLease('CLAIM|issue=1|instance=A|slot=R1|at=2026-11-08T00:00:00Z|ttl=90m|lane=x|claim_comment=c').ttlMin).toBe(90);
    expect(parseClaimLease('CLAIM|issue=1|instance=A|slot=R1|at=2026-11-08T00:00:00Z|ttl=24h|lane=x|claim_comment=c').ttlMin).toBe(1440);
    const bad = parseClaimLease('CLAIM|issue=1|instance=A|slot=R1|at=2026-11-08T00:00:00Z|ttl=abc|lane=x|claim_comment=c');
    expect(bad.invalid).toBe(true);
  });

  test('A5 无 CLAIM 行 → null；at 非 ISO → invalid', () => {
    expect(parseClaimLease('普通评论，无租约')).toBeNull();
    expect(parseClaimLease(null)).toBeNull();
    const p = parseClaimLease('CLAIM|issue=1|instance=A|slot=R1|at=昨天|ttl=24h|lane=x|claim_comment=c');
    expect(p.invalid).toBe(true);
  });
});

// ==================== B. 租约状态机（#233 §五 验收用例） ====================

const LEASE_24H_AT = (iso) => ({ invalid: false, issue: '226', instance: 'A', slot: 'R117', atIso: iso, atMs: Date.parse(iso), ttlMin: 1440, lane: 'clock-core.js', claimComment: '1', raw: '' });

describe('B. 租约状态机（验收①⑤⑥⑦⑧⑨ 逐条）', () => {
  test('B1 验收①：25h 无交付 → STALE（原「100min→STALE」用例在 24h 下作废，100min 判 ACTIVE）', () => {
    const lease = LEASE_24H_AT('2026-11-07T03:00:00Z');
    const r = computeLeaseStatus({ lease, issueState: 'open', issueLabels: [], comments: [c(1, '2026-11-07T03:00:30Z', '【认领】正文')], nowMs: NOW });
    expect(r.status).toBe('stale');
    expect(r.minutes).toBe(1500);
    expect(r.reason).toContain('1440');
  });

  test('B2 验收⑥（不得误杀核心）：23h 有取号预告无交付 → ACTIVE，任何实例不得抢占', () => {
    const lease = LEASE_24H_AT('2026-11-07T05:00:00Z');
    const r = computeLeaseStatus({
      lease, issueState: 'open', issueLabels: [],
      comments: [c(1, '2026-11-07T05:00:10Z', '【认领】'), c(2, '2026-11-07T11:00:00Z', '【取号预告】v10.35 预计数分钟内推送')],
      nowMs: NOW,
    });
    expect(r.status).toBe('active');
    expect(r.minutes).toBe(1380);
  });

  test('B3 验收⑦：5h 零痕迹 → SUSPICIOUS（不解锁不抢占，与 STALE 严格区分）', () => {
    const lease = LEASE_24H_AT('2026-11-07T23:00:00Z');
    const r = computeLeaseStatus({ lease, issueState: 'open', issueLabels: [], comments: [c(1, '2026-11-07T23:00:10Z', '【认领】#226（三查实录）\n\nCLAIM|issue=226|instance=A|slot=R117|at=2026-11-07T23:00:00Z|ttl=24h|lane=clock-core.js|claim_comment=1')], nowMs: NOW });
    expect(r.status).toBe('suspicious');
    expect(r.status).not.toBe('stale');
    expect(r.reason).toContain('SUSPICIOUS');
  });

  test('B4 5h 有痕迹（预告/窗报只算痕迹）→ ACTIVE 不降级 SUSPICIOUS', () => {
    const lease = LEASE_24H_AT('2026-11-07T23:00:00Z');
    const r = computeLeaseStatus({
      lease, issueState: 'open', issueLabels: [],
      comments: [c(1, '2026-11-07T23:00:10Z', '【认领】'), c(2, '2026-11-08T01:00:00Z', '## 【R125 窗报】……')],
      nowMs: NOW,
    });
    expect(r.status).toBe('active');
  });

  test('B5 验收⑧：人工回收 30min 即解锁——不受 TTL 约束优先于自动逾期（§二 c > b）', () => {
    const lease = LEASE_24H_AT('2026-11-08T03:30:00Z');
    const r = computeLeaseStatus({
      lease, issueState: 'open', issueLabels: [],
      comments: [c(1, '2026-11-08T03:30:10Z', '【认领】'), c(2, '2026-11-08T04:00:00Z', '【人工回收】#226 认领失效，重新开放认领（原认领 id 1 / 30min / 无交付帖）')],
      nowMs: NOW,
    });
    expect(r.status).toBe('released');
    expect(r.reason).toContain('人工回收');
  });

  test('B6 验收⑨：跨槽 +30min 不短杀——租约 35min 无任何槽位概念 → ACTIVE（旧隐性阈值已删）', () => {
    const lease = LEASE_24H_AT('2026-11-08T03:25:00Z');
    const r = computeLeaseStatus({ lease, issueState: 'open', issueLabels: [], comments: [c(1, '2026-11-08T03:25:10Z', '【认领】')], nowMs: NOW });
    expect(r.status).toBe('active');
    expect(r.minutes).toBe(35);
  });

  test('B7 交付帖 → released；释放帖 → released（§二 a）', () => {
    const lease = LEASE_24H_AT('2026-11-08T01:00:00Z');
    const d = computeLeaseStatus({ lease, issueState: 'open', issueLabels: [], comments: [c(1, '2026-11-08T01:00:10Z', '【认领】'), c(2, '2026-11-08T02:00:00Z', '## 【交付】v11.10 = 17b6c623 · #232 ✓')], nowMs: NOW });
    expect(d.status).toBe('released');
    const r = computeLeaseStatus({ lease, issueState: 'open', issueLabels: [], comments: [c(1, '2026-11-08T01:00:10Z', '【认领】'), c(2, '2026-11-08T02:00:00Z', '【释放】#226 车道撞车让位')], nowMs: NOW });
    expect(r.status).toBe('released');
  });

  test('B8 state=closed 结构化释放（§七① 优先级最高，无需解析措辞）', () => {
    const lease = LEASE_24H_AT('2026-11-07T03:00:00Z');
    const r = computeLeaseStatus({ lease, issueState: 'closed', issueLabels: [], comments: [], nowMs: NOW });
    expect(r.status).toBe('released');
    expect(r.reason).toContain('closed');
  });

  test('B9 判活 → alive_confirmed 豁免 SUSPICIOUS（§九② 勿回收）', () => {
    const lease = LEASE_24H_AT('2026-11-07T22:00:00Z');
    const r = computeLeaseStatus({
      lease, issueState: 'open', issueLabels: [],
      comments: [c(1, '2026-11-07T22:00:10Z', '【认领】'), c(2, '2026-11-08T03:00:00Z', '【判活】#X 在推进/待核，勿回收')],
      nowMs: NOW,
    });
    expect(r.status).toBe('alive_confirmed');
  });

  test('B10 认领前的评论不参与判定（后继信号才计数）', () => {
    const lease = LEASE_24H_AT('2026-11-08T03:00:00Z');
    const r = computeLeaseStatus({
      lease, issueState: 'open', issueLabels: [],
      comments: [c(9, '2026-11-07T10:00:00Z', '【交付】旧交付帖'), c(1, '2026-11-08T03:00:10Z', '【认领】')],
      nowMs: NOW,
    });
    expect(r.status).toBe('active');
  });

  test('B11 pending-verification 白名单：交付后 state 仍 open → 车道立即释放（§七④）', () => {
    const lease = LEASE_24H_AT('2026-11-08T01:00:00Z');
    const r = computeLeaseStatus({
      lease, issueState: 'open', issueLabels: ['pending-verification'],
      comments: [c(1, '2026-11-08T01:00:10Z', '【认领】'), c(2, '2026-11-08T02:00:00Z', '## 【交付】v11.10 ✓')],
      nowMs: NOW,
    });
    expect(r.status).toBe('released');
    expect(r.pendingVerification).toBe(true);
  });
});

// ==================== C. 议题级提示（#233 §七③ / #234 claims 字段） ====================

describe('C. 议题级提示（NEEDS_REVIEW 提示级，不自动补关）', () => {
  test('C1 交付帖 + open + 无 pending-verification → needs_review（提示级）', () => {
    const f = computeIssueFlag({
      issueState: 'open', issueLabels: [],
      comments: [c(1, '2026-11-07T00:00:00Z', '## 【交付】v10.41 = f51baa45 chess 空行修复 ✓')],
      nowMs: NOW,
    });
    expect(f.flag).toBe('needs_review');
  });

  test('C2 pending-verification 标签 → pending_verification（白名单，非 NEEDS_REVIEW）', () => {
    const f = computeIssueFlag({ issueState: 'open', issueLabels: ['bug', 'pending-verification'], comments: [c(1, '2026-11-07T00:00:00Z', '## 【交付】✓')], nowMs: NOW });
    expect(f.flag).toBe('pending_verification');
  });

  test('C3 判活 + 交付 → alive_confirmed 豁免（§九②）', () => {
    const f = computeIssueFlag({
      issueState: 'open', issueLabels: [],
      comments: [c(1, '2026-11-07T00:00:00Z', '## 【交付】✓'), c(2, '2026-11-07T01:00:00Z', '【判活】在推进，勿回收')],
      nowMs: NOW,
    });
    expect(f.flag).toBe('alive_confirmed');
  });

  test('C4 closed / 无交付 → 天然排除（活跃池零污染 §七②）', () => {
    expect(computeIssueFlag({ issueState: 'closed', issueLabels: [], comments: [c(1, '2026-11-07T00:00:00Z', '## 【交付】✓')], nowMs: NOW }).flag).toBeNull();
    expect(computeIssueFlag({ issueState: 'open', issueLabels: [], comments: [c(1, '2026-11-07T00:00:00Z', '普通讨论')], nowMs: NOW }).flag).toBeNull();
  });
});

// ==================== D. 协议负向锚 ====================

describe('D. 协议负向锚（防回退）', () => {
  test('D1 旧「跨槽 +30min 自动失效」不得复活：恰 31min 无交付仍 ACTIVE', () => {
    const lease = LEASE_24H_AT('2026-11-08T03:29:00Z');
    const r = computeLeaseStatus({ lease, issueState: 'open', issueLabels: [], comments: [c(1, '2026-11-08T03:29:10Z', '【认领】')], nowMs: NOW });
    expect(r.status).toBe('active');
    expect(r.minutes).toBe(31);
  });

  test('D2 TTL 绝对起算：心跳/预告不延长租约——1450min 即 STALE（续期只认交付 §二）', () => {
    const lease = LEASE_24H_AT('2026-11-07T02:30:00Z');
    const r = computeLeaseStatus({
      lease, issueState: 'open', issueLabels: [],
      comments: [c(1, '2026-11-07T03:00:00Z', '【心跳帖】仍在推进'), c(2, '2026-11-07T20:00:00Z', '【取号预告】'), c(3, '2026-11-08T00:00:00Z', '## 【窗报】')],
      nowMs: NOW,
    });
    expect(r.status).toBe('stale');
    expect(r.minutes).toBe(1530);
  });

  test('D3 SUSPICIOUS 阈值精确 4h：240min 整点仍 ACTIVE（严格大于才触发）', () => {
    const lease = LEASE_24H_AT('2026-11-08T00:00:00Z');
    const r = computeLeaseStatus({ lease, issueState: 'open', issueLabels: [], comments: [c(1, '2026-11-08T00:00:10Z', '【认领】')], nowMs: NOW });
    expect(r.status).toBe('active');
    expect(r.minutes).toBe(240);
  });

  test('D4 抢占帖不是释放信号——不改变租约状态（抢占须三查+让位，状态归租约语义 §三③）', () => {
    const lease = LEASE_24H_AT('2026-11-08T00:00:00Z');
    const r = computeLeaseStatus({
      lease, issueState: 'open', issueLabels: [],
      comments: [c(1, '2026-11-08T00:00:10Z', '【认领】'), c(2, '2026-11-08T03:50:00Z', '【抢占·僵尸回收】#X（原认领 1 / now-at=230min>1440min 失效依据待核）')],
      nowMs: NOW,
    });
    expect(r.status).toBe('active');
  });
});
