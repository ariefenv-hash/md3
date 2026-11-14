// ==================== mqtt-lazy.test.js — #184 MQTT 库懒加载（v11.29） ====================
// 裁决在录（#184 权威评论）：保留 MQTT 不换 itty-sockets（跨设备同步 CRDT 需 QoS/投递顺序），
// 体积问题以懒加载解决 —— 库本体 329KB 只在首个联机操作时注入 + 移出 SW 预缓存清单。
// 本文件断言四面：
//   A. lazy-script-gate.js 纯逻辑状态机（IIFE 沙箱提取，loader/isReady 全注入零 DOM）
//   B. messages/index.html 懒加载接线锚（同步标签移除 / gate 接线 / ensureMqtt 拆分 / 失败提示保留）
//   C. vite.config.js 预缓存排除锚（PRECACHE_EXCLUDE 含 mqtt.min.js + 清单生成过滤消费）
//   D. v774 回归锚演进（vendor 文件仍在 + 房间语义零触碰）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// ---------- 沙箱提取（经典脚本 IIFE → window.LazyScriptGate） ----------
const GATE_SRC = read('ios-desktop/js/lazy-script-gate.js');
const ctx = { window: {} };
new Function('window', GATE_SRC)(ctx.window);
const { createLazyScriptGate } = ctx.window.LazyScriptGate;

// ---------- 假加载器工厂（记录调用次数，可编程兑现/拒绝） ----------
function fakeLoader() {
  const calls = [];
  let program = null; // () => Promise
  const loader = () => {
    calls.push(1);
    return program ? program() : Promise.resolve();
  };
  return {
    calls,
    loader,
    setProgram: (fn) => { program = fn; },
    count: () => calls.length,
  };
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
/** flush 微任务：gate 内 Promise.resolve().then(load) 属微任务链，同步断言前需排空 */
const tick = () => new Promise((r) => setTimeout(r, 0));

// ==================== A. 纯逻辑状态机 ====================
describe('v11.29 #184 · A lazy-script-gate 纯逻辑状态机', () => {
  it('构造校验：isReady/load 非函数 TypeError（双点）', () => {
    expect(() => createLazyScriptGate({ load: () => {} })).toThrow(TypeError);
    expect(() => createLazyScriptGate({ isReady: () => true })).toThrow(TypeError);
    expect(() => createLazyScriptGate({ isReady: () => true, load: () => {} })).not.toThrow();
  });

  it('就绪短路：isReady 同步为真 → acquire 立即兑现，load 零调用，state=ready', async () => {
    const L = fakeLoader();
    let ready = true;
    const gate = createLazyScriptGate({ isReady: () => ready, load: L.loader });
    await expect(gate.acquire()).resolves.toBe(true);
    expect(L.count()).toBe(0);
    expect(gate.state()).toBe('ready');
    // ready 回访：仍短路
    await expect(gate.acquire()).resolves.toBe(true);
    expect(L.count()).toBe(0);
  });

  it('idle→loading→ready：load 兑现且就绪判定转真 → resolve true；load 兑现但 isReady 仍假 → 拒绝（防假就绪）', async () => {
    const L = fakeLoader();
    let ready = false;
    const gate = createLazyScriptGate({ isReady: () => ready, load: L.loader });
    // load 兑现但全局仍未定义 → GATE_NOT_READY
    await expect(gate.acquire()).rejects.toMatchObject({ code: 'GATE_NOT_READY' });
    expect(gate.state()).toBe('failed');
    expect(L.count()).toBe(1);
    // 重试：loader 副作用置就绪（生产对应脚本 onload 后全局可用）→ 本次 load 兑现后 ready
    L.setProgram(() => { ready = true; return Promise.resolve(); });
    await expect(gate.acquire()).resolves.toBe(true);
    expect(gate.state()).toBe('ready');
    expect(L.count()).toBe(2);
  });

  it('并发收敛：loading 中多次 acquire 只触发一次 load，全部等待同一结果', async () => {
    const L = fakeLoader();
    const d = deferred();
    L.setProgram(() => d.promise);
    let ready = false;
    const gate = createLazyScriptGate({ isReady: () => ready, load: L.loader });
    const p1 = gate.acquire();
    await tick(); // load 属微任务链，排空后进入 loading（in-flight 挂起）
    const p2 = gate.acquire();
    const p3 = gate.acquire();
    expect(L.count()).toBe(1); // 单次注入
    expect(gate.state()).toBe('loading');
    ready = true;
    d.resolve();
    await expect(p1).resolves.toBe(true);
    await expect(p2).resolves.toBe(true);
    await expect(p3).resolves.toBe(true);
    expect(L.count()).toBe(1);
  });

  it('失败传播 + 重试语义：排队者全部收到同一 rejection；failed 后下次 acquire 重新触发', async () => {
    const L = fakeLoader();
    const d = deferred();
    L.setProgram(() => d.promise);
    const gate = createLazyScriptGate({ isReady: () => false, load: L.loader });
    const p1 = gate.acquire();
    await tick();
    const p2 = gate.acquire(); // loading 中排队：与 p1 同一 in-flight
    d.reject(new Error('offline'));
    await expect(p1).rejects.toThrow('offline');
    await expect(p2).rejects.toThrow('offline');
    expect(gate.state()).toBe('failed');
    expect(L.count()).toBe(1);
    // 重试：failed 态 acquire 重新触发 load（第二次成功路径由 isReady 控制仍为假 → GATE_NOT_READY）
    const d2 = deferred();
    L.setProgram(() => d2.promise);
    const p3 = gate.acquire();
    await tick();
    expect(L.count()).toBe(2);
    expect(gate.state()).toBe('loading');
    d2.resolve();
    await expect(p3).rejects.toMatchObject({ code: 'GATE_NOT_READY' });
  });
});

// ==================== B. messages/index.html 懒加载接线锚 ====================
describe('v11.29 #184 · B index.html 懒加载接线', () => {
  const appHtml = read('ios-desktop/apps/messages/index.html');

  it('同步 <script src="mqtt.min.js"> 标签已移除；gate 脚本就位', () => {
    expect(appHtml).not.toContain('<script src="mqtt.min.js"></script>');
    expect(appHtml).toContain('<script src="../../js/lazy-script-gate.js"></script>');
    expect(appHtml).toContain('v11.29（issue #184）：mqtt.min.js（329KB）改懒加载');
  });

  it('gate 接线：isReady=typeof mqtt 判定 + 动态注入 mqtt.min.js + onerror 拒绝', () => {
    expect(appHtml).toContain('LazyScriptGate.createLazyScriptGate({');
    expect(appHtml).toContain("isReady: () => typeof mqtt !== 'undefined'");
    expect(appHtml).toContain("s.src = 'mqtt.min.js';");
    expect(appHtml).toContain("s.onerror = () => reject(new Error('mqtt lib load failed'));");
    expect(appHtml).toContain('document.head.appendChild(s);');
  });

  it('ensureMqtt 拆分：先懒加载后连接（connectMqtt 原函数体零语义变更）', () => {
    expect(appHtml).toContain('function ensureMqtt(onReady) {\n      ensureMqttLib(() => connectMqtt(onReady));\n    }');
    expect(appHtml).toContain('function connectMqtt(onReady) {');
    // 原连接语义保留：公共代理 + clean session + 自动重连 3s + 连接超时 6s
    expect(appHtml).toContain('mqtt.connect(MQTT_BROKER, {');
    expect(appHtml).toContain('reconnectPeriod: 3000');
    expect(appHtml).toContain('connectTimeout: 6000');
  });

  it('失败提示语义保留（原 typeof mqtt 未定义分支迁入 gate catch，可重试）', () => {
    expect(appHtml).toContain("roomModalStatus('MQTT 库加载失败（离线？）');");
    // 该提示现在只存在于 ensureMqttLib 的 catch（不再有同步加载时代的 typeof 短路 return）
    expect(appHtml).not.toContain("if (typeof mqtt === 'undefined') { roomModalStatus");
  });

  it('三个联机入口调用点不变（connectAndJoin / 离线补发 / 下拉刷新重连）', () => {
    expect(appHtml.match(/ensureMqtt\(/g).length).toBeGreaterThanOrEqual(4); // 3 调用点 + 1 函数定义
    expect(appHtml).toContain('function connectAndJoin(hash, okText) {');
    expect(appHtml).toContain('pendingRoomJoin = hash;');
    expect(appHtml).toContain('onRefresh: () => new Promise((resolve) => {');
  });
});

// ==================== C. 预缓存排除锚（#280 v11.29 收敛为单一真源 scripts/lib/precache-exclude.mjs） ====================
describe('v11.29 #184 · C SW 预缓存排除', () => {
  const viteCfg = read('vite.config.js');
  const exclSrc = read('scripts/lib/precache-exclude.mjs'); // #280 ③：清单单一真源（双拷贝陷阱根治）

  it('单一真源模块含 mqtt.min.js（相对 dist 根的站点 URL 形态）+ vite.config 同源导入', () => {
    expect(exclSrc).toContain("'ios-desktop/apps/messages/mqtt.min.js',");
    expect(viteCfg).toContain("from './scripts/lib/precache-exclude.mjs'");
  });

  it('清单生成管线消费排除集（walkFiles → toSiteUrl → filter PRECACHE_EXCLUDE）', () => {
    expect(viteCfg).toContain('.filter((u) => !PRECACHE_EXCLUDE.has(u))');
  });

  it('vendor 文件实体仍在（运行时缓存可达：cacheFirst 未命中回源回填，二次命中）', () => {
    const mqtt = read('ios-desktop/apps/messages/mqtt.min.js');
    expect(mqtt.length).toBeGreaterThan(200000); // mqtt 5.x 完整浏览器包（懒加载不等于删除）
  });
});

// ==================== D. v774 回归锚演进 ====================
describe('v11.29 #184 · D 回归锚（v7.74 #9 房间语义零触碰）', () => {
  const appHtml = read('ios-desktop/apps/messages/index.html');

  it('房间码 SHA-256 派生 12 位十六进制（口令不落盘）不变', () => {
    expect(appHtml).toContain("crypto.subtle.digest('SHA-256'");
    expect(appHtml).toContain('slice(0, 12)');
  });

  it('房间弹窗/创建/加入入口语义不变', () => {
    expect(appHtml).toContain('onclick="openRoomModal()"');
    expect(appHtml).toContain('onclick="createRoom()"');
    expect(appHtml).toContain('onclick="joinRoomByCode()"');
  });

  it('m3e-mini 与 chatbot-core 引入不受本次改造影响', () => {
    expect(appHtml).toContain('<script src="m3e-mini.js"></script>');
    expect(appHtml).toContain('<script src="../../js/chatbot-core.js"></script>');
  });
});
