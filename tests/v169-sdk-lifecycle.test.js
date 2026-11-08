// ==================== v169-sdk-lifecycle.test.js — #169 SDK 生命周期事件面 v10.78 ====================
//
// 覆盖：
//   · main.js 注入面锚：__system.on/off 统一订阅 API（BUS_DELIVER 过滤 + 退订函数 +
//     __busHooked 单次挂监听）+ __system-ready 保持 + per-document 注入修复记录
//     （__md3SdkInjected——议题引用的「SDK 永久丢失」注释实为 fix(v7.19) 修复记录的勘误锚）
//   · app-bus.js：broadcastSystem 静默广播原语（零 deliveryNotification 通知横幅）+
//     生命周期 relay 三相（app-resume→resumed / app-freeze→paused / app-closed→closed）
//   · page-stack.js：broadcastAppClose 派发 app-closed CustomEvent（closed 相源事件）
//   · bg-freeze.js：保持零 import 底层模块纪律（事件解耦防环设计锚）+
//     app-freeze/app-resume CustomEvent 保持（paused/resumed 源事件）
//
// 【架构发现（e2e 实证，回帖在录）】切应用时后台 iframe 文档重载是 md3 既有行为
// （节点身份稳定 + contentWindow 状态丢失双实证）——v7.19 per-document 注入保证重载后
// SDK 自动恢复，生命周期三相在单文档生命周期内语义完整。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAIN = readFileSync(join(ROOT, 'ios-desktop/js/main.js'), 'utf-8');
const BUS = readFileSync(join(ROOT, 'ios-desktop/js/app-bus.js'), 'utf-8');
const PSTACK = readFileSync(join(ROOT, 'ios-desktop/js/page-stack.js'), 'utf-8');
const FREEZE = readFileSync(join(ROOT, 'ios-desktop/js/bg-freeze.js'), 'utf-8');

describe('v169 main.js：__system.on/off 统一订阅 API（#169 注入面）', () => {
  it('on：BUS_DELIVER 过滤 + 监听表 + __busHooked 单次挂监听 + 返回退订函数', () => {
    expect(MAIN).toContain('window.__system.on = function(event, handler)');
    expect(MAIN).toContain("d.type !== 'BUS_DELIVER'");
    expect(MAIN).toContain('__busHooked');
    expect(MAIN).toContain('return function() { window.__system.off(event, handler); }');
  });

  it('off：监听表摘除；非法入参静默返回空退订', () => {
    expect(MAIN).toContain('window.__system.off = function(event, handler)');
    expect(MAIN).toContain('list.splice(i, 1)');
    expect(MAIN).toMatch(/typeof handler !== 'function'\) return function\(\) \{\}/);
  });

  it('幂等门：window.__system && !window.__system.on（批次注入模式，同 fs/clipboard 段）', () => {
    expect(MAIN).toContain('if (window.__system && !window.__system.on)');
  });

  it('勘误锚：main.js:309 注释实为 fix(v7.19) 修复记录——per-document 注入标记在库', () => {
    // 议题引用的「__system SDK 永久丢失」是历史坑的修复记录（非现存 bug）：
    // per-document 标记后 about:blank 与真实文档各注入一次，重载后 SDK 自动恢复
    expect(MAIN).toContain('__md3SdkInjected');
    expect(MAIN).toContain('SDK 永久丢失'); // 修复记录注释保持（坑史在录）
    expect(MAIN).toMatch(/改为 per-document 标记后/);
  });

  it('__system-ready 派发保持（fs/clipboard 段尾，向后兼容）', () => {
    expect(MAIN).toContain("window.dispatchEvent(new Event('__system-ready'))");
  });
});

describe('v169 app-bus.js：broadcastSystem + 生命周期 relay 三相', () => {
  it('broadcastSystem 静默原语：BUS_DELIVER + from=system + 零通知横幅', () => {
    expect(BUS).toContain('export function broadcastSystem(event, payload)');
    expect(BUS).toMatch(/broadcastSystem[\s\S]{0,400}postToApp\(appId, \{ type: 'BUS_DELIVER', event, payload, from: 'system' \}\)/);
    // 静默性：broadcastSystem 函数体内不得出现 deliveryNotification（broadcast 才有）
    const seg = BUS.slice(BUS.indexOf('export function broadcastSystem'), BUS.indexOf('export function onBusEvent'));
    expect(seg).not.toContain('deliveryNotification');
    expect(seg).not.toContain('addSystemNotification');
  });

  it('relay 三相：app-resume→resumed / app-freeze→paused / app-closed→closed', () => {
    expect(BUS).toContain("document.addEventListener('app-resume', lifecycleRelay('resumed'))");
    expect(BUS).toContain("document.addEventListener('app-freeze', lifecycleRelay('paused'))");
    expect(BUS).toContain("document.addEventListener('app-closed', lifecycleRelay('closed'))");
    expect(BUS).toContain("broadcastSystem('system/lifecycle', { phase, appId })");
  });

  it('事件解耦设计锚：app-bus 不 import bg-freeze/page-stack（防 notifications→app-window 环）', () => {
    // 只扫 import 语句行（^import 开头），注释提及 bg-freeze/page-stack 不算依赖边
    expect(BUS).not.toMatch(/^import .*bg-freeze/m);
    expect(BUS).not.toMatch(/^import .*page-stack/m);
  });
});

describe('v169 源事件面：page-stack closed + bg-freeze paused/resumed 保持', () => {
  it('page-stack.broadcastAppClose 派发 app-closed CustomEvent（appId 从 wrapper 提取）', () => {
    expect(PSTACK).toMatch(/broadcastAppClose[\s\S]{0,600}new CustomEvent\('app-closed', \{ detail: \{ appId \} \}\)/);
    expect(PSTACK).toContain("replace('app-instance-', '')");
  });

  it('bg-freeze 保持零 import 底层模块（事件解耦）+ app-freeze/app-resume 源事件不动', () => {
    expect(FREEZE).not.toMatch(/^import /m);
    expect(FREEZE).toContain("new CustomEvent('app-freeze', { detail: { appId } })");
    expect(FREEZE).toContain("new CustomEvent('app-resume', { detail: { appId } })");
  });

  it('既有投递语义零触碰：BUS_EMIT 路由 / broadcast 应用间代发横幅 / flushPendingForIframe', () => {
    expect(BUS).toContain("if (!d || d.type !== 'BUS_EMIT' || !d.event) return;");
    expect(BUS).toContain('function deliveryNotification('); // 应用间消息横幅保持
    expect(BUS).toContain('export function flushPendingForIframe');
  });
});
