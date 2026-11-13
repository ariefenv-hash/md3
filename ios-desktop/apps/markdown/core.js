// ==================== markdown/core.js — Markdown 编辑器纯函数核（#286 续 · ref-only 补提取第五批 · v11.19） ====================
//
// 职责：markdown/index.html 内联脚本的纯逻辑真身——中英混排词数统计 /
// 文件名规整防御（#175 同款）/ 工具栏按压联动衰减数学（tile-bounce 同构参数）/
// 分栏拖宽钳制 / 导出独立 HTML 页模板 / VFS .md 文档清单规整与容量标签。
// 内联主脚本（经典 <script>）经 window.__markdownCore 桥消费同一份；
// vitest 侧用 new Function 沙箱提取（notes/camera/phone core.js / fx-core.js 同范式）。
//
// ⚠ 模块形态：经典脚本 IIFE（无 export），由 index.html <script src="./core.js"> 同步加载
// （先于主内联脚本），零依赖，保证测试侧 new Function('window', SRC) 可直接执行提取。
// renderMd（marked + __mdSanitize + preview 宿主）/ fsReadTextSafe·fsWriteText（VFS 桥 IO）/
// insertAtSel（textarea 选区宿主）/ toast·notifyHost（DOM 宿主）不属纯函数核，保留内联
// （notes escape 宿主保留先例同律）。
//
// 车道：#286 ref-only 候补池第五批（markdown 域，idRefs=21 高频优先）。零行为变化——
// 内联原实现整体搬移，调用点等值换算（statUpdate + safeName + pressRipple + 分栏拖宽 +
// 打开抽屉清单段 + 导出页模板段）。
//
// 关联 #286 #229 #243 #18 §5/§9

(function () {
  'use strict';

  // ==================== 中英混排词数统计 ====================
  // 拉丁词元（字母数字下划线撇号连字符连续段）计数 + CJK 单字计数（原 statUpdate 词数
  // 表达式整体搬移，正则逐字符等值）。
  function countWords(t) {
    return (t.match(/[A-Za-z0-9_'\-]+/g) || []).length
      + (t.match(/[\u4e00-\u9fff]/g) || []).length;
  }

  // ==================== 文件名规整防御（#175 同款） ====================
  // .md/.markdown 后缀剥除 → 非法字符替换为下划线 → 空白折叠 → 60 字符截断 →
  // 空值回落「未命名」（原 safeName 内联实现参数化搬移，逐语句等值）。
  function safeNameOf(raw) {
    var n = (raw || '未命名').trim().replace(/\.md(x)?$/i, '');
    n = n.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').slice(0, 60) || '未命名';
    return n;
  }

  // ==================== 工具栏按压联动衰减数学 ====================
  // tile-bounce 数学同构轻量版（ζ=1 临界阻尼观感）：距离 d=|i-origin|，衰减
  // f=d===0?1:max(0,1-d×0.45)（d=1→0.55, d=2→0.10, d≥3→0）；按压者 scaleX 0.88、
  // 邻项 1-0.05f 压缩；邻项朝按压者让位 ±2f；圆角按压者 10+5f、邻项 10+3f。
  // 返回 {shift, sc, radius, z} 原始数值——toFixed 字符串化与 zIndex 字面量由内联消费侧
  // 保持（零行为变化）。
  function pressTransform(index, originIdx) {
    var d = Math.abs(index - originIdx);
    var f = d === 0 ? 1 : Math.max(0, 1 - d * 0.45);
    var sc = d === 0 ? 0.88 : 1 - 0.05 * f;
    var shift = d === 0 ? 0 : (index < originIdx ? 1 : -1) * 2 * f;
    return {
      shift: shift,
      sc: sc,
      radius: 10 + (d === 0 ? 5 : 3) * f,
      z: d === 0 ? '1' : ''
    };
  }

  // ==================== 分栏拖宽钳制（平板） ====================
  // 编辑栏占比钳制 0.22–0.78（原 splitter pointermove clamp 表达式整体搬移）。
  function clampSplit(pct) {
    return Math.min(0.78, Math.max(0.22, pct));
  }

  // ==================== 导出独立 HTML 页模板 ====================
  // 下载 + VFS 双落的独立文档页：不载 md3-tokens.css，var() 全部落 fallback
  // （与原内联模板逐项等值——head 元信息 + 内联样式块 + 正文 mdHtml + idle-slider 尾注；
  // scr+ipt 拆写防外层 script 提前终止的原手法保留在模板字面量内）。
  function buildExportPage(mdHtml, title) {
    return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n'
      + '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
      + '<title>' + title + '</title>\n<style>\n'
      + 'body{font-family:var(--md-font,system-ui,-apple-system,"Noto Sans SC",sans-serif);max-width:760px;margin:0 auto;'
      + 'padding:32px 20px;line-height:1.75;color:var(--md-on-surface,#1c1b1f);background:var(--md-surface,#fefbff);}\n'
      + 'h1,h2{border-bottom:1px solid var(--md-outline-variant,#e2e2e9);padding-bottom:.25em;}\n'
      + 'code{background:var(--md-surface-container,#f2f2f7);border-radius:var(--md-r-sm,6px);padding:.1em .4em;}\n'
      + 'pre{background:var(--md-surface-container,#f2f2f7);border-radius:var(--md-r-lg,12px);padding:12px 14px;overflow-x:auto;}\n'
      + 'pre code{background:transparent;padding:0;}\n'
      + 'blockquote{border-left:3px solid var(--md-primary,#6750a4);background:var(--md-surface-container-low,#f3eefc);margin:.7em 0;padding:.45em .95em;}\n'
      + 'table{border-collapse:collapse;}th,td{border:1px solid var(--md-outline-variant,#ddd);padding:6px 10px;}\n'
      + 'img{max-width:100%;}\n'
      + '</style>\n</head>\n<body>\n' + mdHtml + '\n  <scr' + 'ipt src="../_shared/idle-slider.js"></scr' + 'ipt>\n</body>\n</html>\n';
  }

  // ==================== VFS .md 文档清单规整 ====================
  // /documents/ 列目录结果 → 仅留 .md（name/path 容错判定）→ 规整 {name, size}
  // （name 缺失回落 path 末段；size 原样透传含 undefined——消费侧 != null 判空语义不变）。
  function normalizeMdDocs(entries) {
    return (entries || [])
      .filter(function (en) {
        return /\.md$/i.test(en && en.name || en.path || '');
      })
      .map(function (en) {
        return { name: en.name || (en.path || '').split('/').pop(), size: en.size };
      });
  }

  // ==================== 文档容量标签 ====================
  // <1024 显示字节，否则 KB 一位小数；size 为 null/undefined 显示空串
  // （原 btnOpen 列表 sz 段整体搬移，逐语句等值）。
  function fmtDocSize(size) {
    return size != null ? (size < 1024 ? size + ' B' : (size / 1024).toFixed(1) + ' KB') : '';
  }

  var core = { countWords: countWords, safeNameOf: safeNameOf, pressTransform: pressTransform, clampSplit: clampSplit, buildExportPage: buildExportPage, normalizeMdDocs: normalizeMdDocs, fmtDocSize: fmtDocSize };
  if (typeof window !== 'undefined') window.__markdownCore = core;
})();
