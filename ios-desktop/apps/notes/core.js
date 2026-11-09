// ==================== notes/core.js — 备忘录纯函数核（#286 续 · ref-only 补提取第四批 · v10.93） ====================
//
// 职责：notes/index.html 内联脚本的纯逻辑真身——标签映射表 / 相对时间五段格式化 /
// 默认种子数据工厂 / 列表过滤·排序·四统计纯逻辑。
// 内联主脚本（经典 <script>）经 window.__notesCore 桥消费同一份；
// vitest 侧用 new Function 沙箱提取（photo/camera core.js / fx-core.js 同范式）。
//
// ⚠ 模块形态：经典脚本 IIFE（无 export），由 index.html <script src="./core.js"> 同步加载
// （先于主内联脚本），零依赖，保证测试侧 new Function('window', SRC) 可直接执行提取。
// escape（DOM textContent 原生转义）依赖 document 宿主，不属纯函数核，保留内联。
//
// 车道：#286 ref-only 候补池第四批（notes 域，idRefs=27 高频优先，撞号合流重放 v10.93）。零行为变化——
// 内联原实现整体搬移，调用点等值换算（种子初始化 + render 过滤排序统计段）。
//
// 关联 #286 #229 #243 #18 §5/§9

(function () {
  'use strict';

  // ==================== 标签映射（渲染侧 tag-dot 类名与中文名单一真源） ====================
  var TAG_MAP = { work: '工作', personal: '个人', idea: '想法', urgent: '紧急' };

  // ==================== 默认种子（localStorage 空时的四条引导数据） ====================
  // 原内联字面量整体搬移：每条各自独立调 Date.now()（与原实现逐语句等值，
  // 偏移量 86400000=1天 / 172800000=2天 / 259200000=3天 / 3600000=1小时）。
  function defaultSeed() {
    return [
      { id: 1, title: '完成项目报告', content: 'Q4季度总结，包含数据与绩效', tag: 'work', completed: false, createdAt: Date.now() - 86400000 },
      { id: 2, title: '学习新框架', content: 'Vue 3 组合式 API 笔记', tag: 'idea', completed: false, createdAt: Date.now() - 172800000 },
      { id: 3, title: '健身房锻炼', content: '每周三次力量训练', tag: 'personal', completed: true, createdAt: Date.now() - 259200000 },
      { id: 4, title: '紧急修复 Bug', content: '生产环境内存泄漏', tag: 'urgent', completed: false, createdAt: Date.now() - 3600000 }
    ];
  }

  // ==================== 相对时间五段格式化 ====================
  // <1分钟 刚刚 / <1小时 N分钟前 / <1天 N小时前 / <7天 N天前 / 其余 zh-CN 短月日。
  function formatTime(ts) {
    var d = new Date(ts), now = Date.now(), diff = now - ts;
    if (diff < 6e4) return '刚刚';
    if (diff < 36e5) return Math.floor(diff / 6e4) + '分钟前';
    if (diff < 864e5) return Math.floor(diff / 36e5) + '小时前';
    if (diff < 6048e5) return Math.floor(diff / 864e5) + '天前';
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }

  // ==================== 列表过滤（搜索词 + 状态/标签筛选，原 render 谓词整体搬移） ====================
  // searchQuery 命中 title 或 content（大小写不敏感）；active/completed 状态档；
  // 四标签档精确匹配；未知 filter 全通过（原 else return true 等值）。
  function filterMemos(list, currentFilter, searchQuery) {
    return list.filter(function (m) {
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        if (!m.title.toLowerCase().includes(q) && !m.content.toLowerCase().includes(q)) return false;
      }
      if (currentFilter === 'active') return !m.completed;
      if (currentFilter === 'completed') return m.completed;
      if (['work', 'personal', 'idea', 'urgent'].includes(currentFilter)) return m.tag === currentFilter;
      return true;
    });
  }

  // ==================== 列表排序（未完成优先，组内 createdAt 降序） ====================
  // filter 产物上原地排序（不触碰 memos 本体，与原 render 局部 list.sort 等值）。
  function sortMemos(list) {
    return list.sort(function (a, b) {
      return a.completed === b.completed ? b.createdAt - a.createdAt : a.completed ? 1 : -1;
    });
  }

  // ==================== 四统计（total/active/completed/urgent） ====================
  // urgent 判定：tag==='urgent' 且未完成（原统计行三元段等值）。
  function computeStats(list) {
    return {
      total: list.length,
      active: list.filter(function (m) { return !m.completed; }).length,
      completed: list.filter(function (m) { return m.completed; }).length,
      urgent: list.filter(function (m) { return m.tag === 'urgent' && !m.completed; }).length
    };
  }

  // ==================== 出口（window 桥；Node 沙箱 / 浏览器双域零崩） ====================
  var core = {
    TAG_MAP: TAG_MAP,
    defaultSeed: defaultSeed,
    formatTime: formatTime,
    filterMemos: filterMemos,
    sortMemos: sortMemos,
    computeStats: computeStats
  };
  if (typeof window !== 'undefined') window.__notesCore = core;
})();
