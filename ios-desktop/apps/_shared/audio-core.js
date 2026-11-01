/* ==================== md3 audio-core v1 —— #176 二期共享音频基建 ====================
 * 议题：#176 [数据孤岛][音频] 二期「抽取共享音频模块」（归属：重构·工程内聚，非超越；
 *       须保留各应用形态——统一的是基建，不是 UI）。
 *
 * 能力面（三件套）：
 *   ① AudioContext 惰性创建（懒单例）——首次 get()/unlock() 才实例化，键盘/播放手势链路内调用；
 *   ② 用户手势解锁——state==='suspended' 时 resume()，try/catch 兜底自动播放策略拒绝；
 *   ③ 主音量路由（可选 masterGain）——createGain 挂 destination，setVolume 统一入口，
 *      应用侧渲染节点一律 connect(core.master)（master 默认 1.0，听感与直连 destination 等价）。
 *
 * 接入（v9.19）：music（initAudioContext，频谱链路 source→analyser→master）
 *             / piano（ensureAC，别名 ac 透传） / bytebeat（ensureCtx，gain=master 承接）。
 * 不适用留痕（v9.19 范式同「波浪不适用」）：radio（<audio> 元素直驱，无自管 AudioContext，
 *             音量走 audio.volume）；midi-player（magenta bundle 内部自管上下文）。
 * ============================================================================== */
(function (global) {
  'use strict';

  function createAudioCore(opts) {
    opts = opts || {};
    var ctx = null;
    var master = null;

    function get() {
      if (!ctx) {
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        if (opts.masterGain) {
          master = ctx.createGain();
          master.gain.value = typeof opts.initialVolume === 'number' ? opts.initialVolume : 1;
          master.connect(ctx.destination);
        }
      }
      return ctx;
    }

    function unlock() {
      var c = get();
      if (c && c.state === 'suspended' && c.resume) {
        try { c.resume(); } catch (err) { /* 自动播放策略兜底：下次手势重试 */ }
      }
      return c;
    }

    function setVolume(v) {
      if (!master) return false;
      master.gain.value = v;
      return true;
    }

    return {
      get: get,
      unlock: unlock,
      setVolume: setVolume,
      isCreated: function () { return !!ctx; },
      get master() { return master; }
    };
  }

  global.Md3Audio = {
    create: createAudioCore,
    version: '1.0.0'
  };
})(typeof window !== 'undefined' ? window : globalThis);
