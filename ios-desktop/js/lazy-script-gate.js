// ==================== lazy-script-gate.js — 懒加载闸门状态机（v9.82 #184） ====================
// #184 裁决（议题评论权威在录）：保留 MQTT（跨设备同步 CRDT 需 QoS/投递顺序，itty-sockets 不换），
// 体积问题以「懒加载」解决 —— 库本体（apps/messages/mqtt.min.js，329KB）只在首个联机操作时注入，
// 不进联机功能的用户永不下载；且移出 SW 预缓存清单（vite.config.js PRECACHE_EXCLUDE），
// Service Worker 安装阶段不再全量预下载（运行时由 fetch handler cacheFirst 未命中回源回填，二次进入命中缓存）。
//
// 本文件 = 纯逻辑状态机核（radio/stt/driving-core 十二代同款 IIFE，顶层零 DOM/网络副作用）：
//   · 加载器（<script> 注入）由调用方注入（load 回调返回 Promise），核心零 DOM 依赖；
//   · 状态机：idle → loading → ready / failed；failed 后下次 acquire 重试（回到 loading）；
//   · 并发语义：loading 中后续 acquire 排队等待同一 Promise，load 不重复触发（防重复注入）；
//   · 就绪短路：isReady() 同步为真（如 typeof mqtt !== 'undefined'，重复注入防御）时 acquire 立即兑现；
//   · 载入校验：load 兑现后 isReady() 仍为假（脚本加载成功但全局未定义，如 CDN 残页/404 HTML）
//     视为失败 —— 防止「加载成功但库缺失」的假就绪进入连接流程。
// 页面侧 apps/messages/index.html 只做接线（ensureMqttLib → ensureMqtt 拆分）。
// 归属：超越项（AOSP 无对应物 —— Web 前端资源加载工程优化；语义参照 SystemUI 首用时初始化惯例）。
(function () {
  'use strict';

  /**
   * 创建懒加载闸门。
   * @param {Object} opts
   * @param {() => boolean} opts.isReady 资源就绪判定（同步纯函数）
   * @param {() => Promise<void>} opts.load 单次加载器（注入 <script> 等；核心不关心实现）
   * @returns {{acquire(): Promise<boolean>, state: () => string}}
   *   acquire —— 需要资源时调用；resolve(true)=就绪可用；reject=本次加载失败（可再次 acquire 重试）
   *   state() —— 'idle' | 'loading' | 'ready' | 'failed'（观测用，无头 e2e/单测断言）
   */
  function createLazyScriptGate(opts) {
    var isReady = opts && opts.isReady;
    var load = opts && opts.load;
    if (typeof isReady !== 'function') throw new TypeError('createLazyScriptGate: isReady must be a function');
    if (typeof load !== 'function') throw new TypeError('createLazyScriptGate: load must be a function');

    var state = 'idle';
    var inflight = null;

    function acquire() {
      // 就绪短路：判定为真直接兑现（ready 态回访 / 防重复注入的双保险）
      if (isReady()) {
        state = 'ready';
        return Promise.resolve(true);
      }
      // loading 中：排队等待同一 in-flight Promise（load 绝不重入）
      if (state === 'loading' && inflight) return inflight;
      // idle / failed /（ready 但判定翻假，防御性重新加载）→ （重）触发加载
      state = 'loading';
      inflight = Promise.resolve()
        .then(load)
        .then(function () {
          if (!isReady()) {
            var err = new Error('lazy-script-gate: load resolved but isReady() is still false');
            err.code = 'GATE_NOT_READY';
            throw err;
          }
          state = 'ready';
          inflight = null;
          return true;
        })
        .catch(function (e) {
          state = 'failed';
          inflight = null; // 失败后允许下次 acquire 重新触发（重试语义）
          throw e;
        });
      return inflight;
    }

    return {
      acquire: acquire,
      state: function () { return state; },
    };
  }

  window.LazyScriptGate = { createLazyScriptGate: createLazyScriptGate };
})();
