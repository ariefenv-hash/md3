// ==================== translate/core.js — 翻译器纯函数核（#286 续 · ref-only 补提取第三批 · v11.30） ====================
//
// 职责：translate/index.html 内联脚本的纯逻辑真身——语言表（21 档）/
// code 查表回落 / 历史时间相对化格式化。
// 内联主脚本（经典 <script>）经 window.__translateCore 桥消费同一份；
// vitest 侧用 new Function 沙箱提取（photos/core.js / drawcircle core.js 同范式）。
//
// ⚠ 模块形态：经典脚本 IIFE（无 export），由 index.html <script src="./core.js"> 同步加载
// （先于主内联脚本），零依赖，保证测试侧 new Function('window', SRC) 可直接执行提取。
//
// 车道：#286 ref-only 候补池第三批（translate 域，高频优先顺延——contacts 评估暂缓后
// 池内首位实际可提取者；R141 窗首建版沙箱回收丢失后本窗按认领帖 6732066592 原车道重建，
// 滚版按合流树顺延 v11.30）。零行为变化——内联原实现整体搬移，调用点等值换算三处委托。

(function () {
  'use strict';

  // ==================== 语言表（原内联 LANGUAGES 常量原样上移，21 档序不变） ====================
  var LANGUAGES = [
    { code: 'auto', name: '自动检测', en: 'Auto Detect' },
    { code: 'zh-CN', name: '中文（简体）', en: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: '中文（繁体）', en: 'Chinese (Traditional)' },
    { code: 'en', name: '英语', en: 'English' },
    { code: 'ja', name: '日语', en: 'Japanese' },
    { code: 'ko', name: '韩语', en: 'Korean' },
    { code: 'fr', name: '法语', en: 'French' },
    { code: 'de', name: '德语', en: 'German' },
    { code: 'es', name: '西班牙语', en: 'Spanish' },
    { code: 'ru', name: '俄语', en: 'Russian' },
    { code: 'ar', name: '阿拉伯语', en: 'Arabic' },
    { code: 'pt', name: '葡萄牙语', en: 'Portuguese' },
    { code: 'it', name: '意大利语', en: 'Italian' },
    { code: 'th', name: '泰语', en: 'Thai' },
    { code: 'vi', name: '越南语', en: 'Vietnamese' },
    { code: 'id', name: '印尼语', en: 'Indonesian' },
    { code: 'ms', name: '马来语', en: 'Malay' },
    { code: 'tr', name: '土耳其语', en: 'Turkish' },
    { code: 'nl', name: '荷兰语', en: 'Dutch' },
    { code: 'pl', name: '波兰语', en: 'Polish' },
    { code: 'hi', name: '印地语', en: 'Hindi' }
  ];

  // ==================== code 查表（原 getLangByCode 整体搬移，逐位等值） ====================
  /** 未命中回落首档（auto 自动检测）——与原 find || LANGUAGES[0] 语义一致。 */
  function getLangByCode(code) {
    return LANGUAGES.find(function (l) { return l.code === code; }) || LANGUAGES[0];
  }

  // ==================== 历史时间格式化（原 formatTime 整体搬移，四档边界等值） ====================
  /**
   * <60s 刚刚 / <60min N 分钟前 / <24h N 小时前 / 其余 M/D。
   * now 参数化（默认 Date.now()）——与原内联单参形态等值，测试侧可确定性注入。
   */
  function formatTime(ts, now) {
    if (typeof now !== 'number') now = Date.now();
    var diff = now - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    var d = new Date(ts);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  // ==================== 出口（window 桥；Node 沙箱 / 浏览器双域零崩） ====================
  var core = {
    LANGUAGES: LANGUAGES,
    getLangByCode: getLangByCode,
    formatTime: formatTime,
  };
  if (typeof window !== 'undefined') window.__translateCore = core;
})();
