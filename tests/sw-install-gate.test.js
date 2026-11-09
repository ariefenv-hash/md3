// ==================== sw-install-gate.test.js — SW 全有或全无激活门（#151） ====================
//
// 背景（#151 诊断）：sw.js install 段 Promise.allSettled 吞掉单条预缓存失败后无条件
// skipWaiting → activate 整桶删除旧缓存 → 弱网下「缺 N 条的新缓存」顶掉「完整的旧
// 缓存」，cacheFirst 未命中回源再遇网络抖动 = 对应表面崩死（用户实证「老是有崩溃」，
// 部署越勤越频繁）。本组断言锁定修复后的门控结构：
//
//   ① install：skipWaiting 受 installVerified 门控（零失败才接管）
//   ② 部分失败路径：广播 SW_PRECACHE_PARTIAL，且 else 分支不得出现 skipWaiting
//   ③ manifest 读取失败降级：更新场景（旧 SW 在位）不再无条件接管
//   ④ message：SKIP_WAITING 过完整性闸（防胶囊路径激活半成品）
//   ⑤ activate 旧缓存整桶清理逻辑原样保留（仅完整激活后可达）
//   ⑥⑦ 启动器：胶囊受 partialBuild 抑制 + 消息置位链路在册

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const swSrc = readFileSync(path.join(here, '../sw.js'), 'utf8');
const launcherSrc = readFileSync(path.join(here, '../index.html'), 'utf8');

describe('v151 SW 全有或全无激活门 (#151)', () => {
  it('① install：skipWaiting 受预缓存完整性门控（零失败才接管）', () => {
    // 完整性判定：失败计数归零才置位
    expect(swSrc).toMatch(/installVerified\s*=\s*failed\s*===\s*0/);
    // 门控放行条件：完整 或 无旧版在位（首次安装保住运行期按需缓存降级语义）
    expect(swSrc).toMatch(/if\s*\(\s*installVerified\s*\|\|\s*!prevActive\s*\)\s*\{[\s\S]{0,60}?await\s+self\.skipWaiting\(\)/);
  });

  it('② 部分失败路径：广播 SW_PRECACHE_PARTIAL 且不 skipWaiting', () => {
    const gateIdx = swSrc.indexOf('if (installVerified || !prevActive)');
    const partialIdx = swSrc.indexOf("type: 'SW_PRECACHE_PARTIAL'");
    expect(gateIdx).toBeGreaterThan(-1);
    expect(partialIdx).toBeGreaterThan(gateIdx);
    // else 分支（gate 的 else 起点到广播）不得出现 skipWaiting —— 半成品不得接管
    const elseStart = swSrc.indexOf('} else {', gateIdx);
    expect(elseStart).toBeGreaterThan(gateIdx);
    const elseBlock = swSrc.slice(elseStart, partialIdx);
    expect(elseBlock).not.toContain('skipWaiting');
    // 广播载荷携带 failed/total（页面侧可感知缺口规模）
    expect(swSrc).toMatch(/SW_PRECACHE_PARTIAL['"],\s*failed,\s*total/);
  });

  it('③ manifest 读取失败降级：更新场景不再无条件接管', () => {
    // 完整性未知时：仅首次安装（无旧 SW）放行，更新场景保持旧完整版本服务
    expect(swSrc).toMatch(/installVerified\s*=\s*!self\.registration\.active/);
  });

  it('④ message：SKIP_WAITING 过完整性闸', () => {
    const msgIdx = swSrc.indexOf("event.data.type === 'SKIP_WAITING'");
    expect(msgIdx).toBeGreaterThan(-1);
    const block = swSrc.slice(msgIdx, msgIdx + 320);
    expect(block).toMatch(/installVerified/);
    // 闸拒绝路径在册（可观测，非静默吞）
    expect(block).toContain('SKIP_WAITING 被拒');
  });

  it('⑤ activate 旧缓存整桶清理逻辑原样保留（仅完整激活后可达）', () => {
    expect(swSrc).toMatch(/keys\.filter\(\(k\) => \(k\.startsWith\('geek-cache-'\)/);
    expect(swSrc).toMatch(/await self\.clients\.claim\(\)/);
  });

  it('⑥ 启动器：showUpdatePill 受 partialBuild 前置抑制', () => {
    expect(launcherSrc).toContain('SW_PRECACHE_PARTIAL');
    expect(launcherSrc).toMatch(/if\s*\(\s*updatePill\s*\|\|\s*partialBuild\s*\)\s*return/);
  });

  it('⑦ 启动器：消息监听将 SW_PRECACHE_PARTIAL 置位 partialBuild', () => {
    expect(launcherSrc).toMatch(/partialBuild\s*=\s*e\.data/);
    // 竞态兜底：广播与 installed 状态事件到达顺序无保证，胶囊若已弹出必须回收
    expect(launcherSrc).toMatch(/updatePill\.remove\(\);\s*updatePill\s*=\s*null/);
  });
});
