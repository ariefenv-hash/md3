// ==================== calendar core — #286 续车道 ref-only 第十批补 core 提取（v11.24 · Job 2932311 · 第 1 定时消息系列） ====================
// 范式：photos/core.js · stocks/core.js 同款经典 IIFE（零依赖零 export，经典脚本先于主内联同步加载）。
// 真源边界：仅收纳纯函数（日期键往返 / 星期一起始 42 格月网格 / 日程时序排序 / 笔记标题与预览
// 裁剪 / 双库清洗 / 旧版 note_* 迁移核）；localStorage 读写、DOM 渲染、PBNav 视图栈、marked
// 预览与深链消息留 index.html 内联（host 侧职责）。
// 消费契约：index.html 经 window.__calendarCore.* 委托调用；tests/v286 W 组沙箱提取真身直连
// （测的即运行真身非孤立副本）。
(function () {
  'use strict';

  // 两位补零（日期键月/日段）
  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  // Date → 'YYYY-MM-DD' 数据键（笔记/日程分库统一键形）
  function dateKey(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  // 'YYYY-MM-DD' → Date（本地时区零点）；非法键形回落 null（深链日期定位同款防御）
  function parseKey(k) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  // 同一自然日判定（月/日/年三维；忽略时时分秒）
  function sameDay(a, b) {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  }

  // 今天判定（now 由调用方注入，保持纯函数可测——host 侧传 new Date() 维持逐次新鲜语义）
  function isToday(d, now) {
    return sameDay(d, now);
  }

  // 星期一起始 42 格月网格（renderCalendar 主循环的纯日期数学核）：
  // dim = 当月天数（next month day-0 惯用法）；first = 1 日星期偏移（getDay()+6)%7 周一归零）；
  // pDim = 上月天数。前 first 格补上月尾（other=true，date 取 vm-1 月），后段补下月头
  // （date 取 vm+1 月），恒返回 42 格。dateObj 语义与原内联逐格等价。
  function monthGrid(vy, vm) {
    const dim = new Date(vy, vm + 1, 0).getDate();
    const first = (new Date(vy, vm, 1).getDay() + 6) % 7;
    const pDim = new Date(vy, vm, 0).getDate();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      let d, other, date;
      if (i < first) { d = pDim - first + i + 1; other = true; date = new Date(vy, vm - 1, d); }
      else if (i >= first + dim) { d = i - first - dim + 1; other = true; date = new Date(vy, vm + 1, d); }
      else { d = i - first + 1; other = false; date = new Date(vy, vm, d); }
      cells.push({ d: d, other: other, date: date });
    }
    return { dim: dim, first: first, pDim: pDim, cells: cells };
  }

  // 日程按 time 字符串升序（'--:--' 空值稳定排序原样保真；非变异 slice 副本）
  function sortEvents(arr) {
    return arr.slice().sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  }

  // 笔记标题裁剪：首个 markdown 标题行优先，回落首个非空行，40 字符封顶，空回落「无标题」
  function noteTitle(n) {
    if (!n || !n.content) return '无标题';
    const m = n.content.match(/^#+\s*(.+)/m);
    const line = (m ? m[1] : n.content.split('\n').find(l => l.trim()) || '').trim();
    return line.slice(0, 40) || '无标题';
  }

  // 笔记预览裁剪：剥标题井号 → 压缩全部空白 → 80 字符封顶
  function notePreview(n) {
    return String(n && n.content || '').replace(/^#+\s*/mg, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  // 笔记库清洗核（loadDB 纯段）：键形四段日期 + 值为数组 + 条目 content 为字符串；
  // raw 非法（null/非对象）回落 null，由 host 侧走迁移分支
  function cleanNotesDB(db) {
    if (!db || typeof db !== 'object') return null;
    const clean = {};
    Object.keys(db).forEach(k => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(db[k])) return;
      clean[k] = db[k].filter(n => n && typeof n.content === 'string');
    });
    return clean;
  }

  // 日程库清洗核（loadEventsDB 纯段）：键形四段日期 + 条目 title 为非空字符串；
  // 清洗后空日键剔除（与原内联一致），raw 非法恒回落空对象
  function cleanEventsDB(db) {
    const clean = {};
    if (db && typeof db === 'object') {
      Object.keys(db).forEach(k => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(db[k])) return;
        const arr = db[k].filter(ev => ev && typeof ev.title === 'string' && ev.title.trim());
        if (arr.length) clean[k] = arr;
      });
    }
    return clean;
  }

  // 旧版 v7.24 单文本 note_* 迁移核（pairs 参数化，localStorage 迭代与写回留 host）：
  // entries = [{ key: 'YYYY-MM-DD', content: 原始未裁剪文本 }]（空文本由 host 预过滤）；
  // 逐条覆盖式赋值（同键不合并，与原内联一致），id = 'm' + 紧凑日期数字。
  function migrateLegacyNotes(entries, now) {
    const db = {};
    entries.forEach(e => {
      db[e.key] = [{
        id: 'm' + e.key.replace(/-/g, ''),
        content: e.content,
        created: now, updated: now
      }];
    });
    return { db: db, count: entries.length };
  }

  window.__calendarCore = {
    pad2: pad2,
    dateKey: dateKey,
    parseKey: parseKey,
    sameDay: sameDay,
    isToday: isToday,
    monthGrid: monthGrid,
    sortEvents: sortEvents,
    noteTitle: noteTitle,
    notePreview: notePreview,
    cleanNotesDB: cleanNotesDB,
    cleanEventsDB: cleanEventsDB,
    migrateLegacyNotes: migrateLegacyNotes
  };
})();
