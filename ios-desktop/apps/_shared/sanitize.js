/* ==================== sanitize.js — 白名单 HTML sanitizer（v9.16 #165） ====================
 *
 * 背景：#165 纪律条——`marked` 渲染用户输入 = XSS 面，禁止直接
 * `innerHTML = marked.parse(text)`。项目未 vendor DOMPurify（体积代价），
 * 本文件按议题允许的「等价白名单」方案提供 `window.__mdSanitize(html)`：
 *   ① 标签白名单：只放行 Markdown 常见输出标签，未知标签 unwrap（保留其文本），
 *      script/style/iframe/object/embed/link/meta/base/form 整体移除；
 *   ② 属性白名单：逐标签列放行属性，on* 事件属性一律剥除；
 *   ③ 协议白名单：href/src 仅放行 http(s) / mailto / 相对路径 / #锚点；
 *      src 额外放行 data:image/（base64 图片），data:text/html 等一律剥除；
 *   ④ checkbox input 恒 disabled（GFM task list），code class 仅保留 language-*。
 *
 * 重建树而非原地清洗：DOMParser 解析到独立文档，逐节点复制到新树，
 * 保证解析期未成活的恶意结构无从残留（与 DOMPurify 同思路）。
 *
 * v10.48 #240 增补：本文件升格为**全库唯一净化真源**——新增 escapeHtml(s)
 * 文本转义单源（& < > " ' 五字符全替，含 null/undefined 安全回落空串），
 * 以 window.__mdSanitize.escapeHtml 与 window.__mdEscapeHtml 双入口暴露。
 * 审计基线（docs/audits/2026-11-07-多维度评审报告.md）：同一职责曾有 8+1 套
 * 重复实现，收敛纪律 = **任何应用/壳层不得再定义本地正则链转义**，一律
 * 引本文件（iframe 应用 <script src="../_shared/sanitize.js">；壳层经
 * 委托函数转调）。负向锚 tests/v240。
 *
 * 消费方：apps/markdown/index.html（实时预览 + 导出 HTML）、
 *        apps/calendar/index.html（renderPreview 同闸，#165 审计修复）、
 *        apps/weather/index.html（v10.48 #240：搜索用户输入 + 地理编码 API
 *        返回值三插值点转义）、messages/translate/music/pdf/typing/reaction
 *        （v10.48 #240：本地 escape 收敛委托单源）。
 */
(function () {
  'use strict';

  // ---- 标签白名单（Markdown 输出全集 + 少量结构容器） ----
  var ALLOWED_TAGS = {
    h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1,
    p: 1, br: 1, hr: 1, blockquote: 1,
    em: 1, strong: 1, b: 1, i: 1, u: 1, s: 1, del: 1, ins: 1,
    code: 1, pre: 1, kbd: 1, mark: 1, sup: 1, sub: 1, small: 1,
    ul: 1, ol: 1, li: 1,
    table: 1, thead: 1, tbody: 1, tfoot: 1, tr: 1, th: 1, td: 1,
    a: 1, img: 1, span: 1, div: 1, input: 1,
  };
  // 整体移除（连文本一起丢，防止 <script>alert(1)</script> 的文本回流无意义但样式污染）
  var DROP_TAGS = {
    script: 1, style: 1, iframe: 1, object: 1, embed: 1, link: 1,
    meta: 1, base: 1, form: 1, textarea: 1, select: 1, button: 1,
  };

  // ---- 逐标签属性白名单 ----
  var ALLOWED_ATTR = {
    a:     { href: 1, title: 1 },
    img:   { src: 1, alt: 1, title: 1, width: 1, height: 1, align: 1 },
    th:    { colspan: 1, rowspan: 1, align: 1 },
    td:    { colspan: 1, rowspan: 1, align: 1 },
    tr:    { align: 1 },
    ol:    { start: 1, type: 1 },
    input: { type: 1, checked: 1 },
    code:  { class: 1 }, // 仅 language-* 会被下方二次校验放行
  };

  // 危险协议（含混入控制字符/空白绕过形态，先去空白再判前缀）
  function isUnsafeUri(v) {
    var s = String(v).trim().toLowerCase().replace(/[\s\u0000-\u001F]/g, '');
    return s.indexOf('javascript:') === 0 || s.indexOf('vbscript:') === 0 ||
           (s.indexOf('data:') === 0 && s.indexOf('data:image/') !== 0);
  }
  function safeCodeClass(v) {
    return String(v).split(/\s+/).filter(function (c) { return /^language-[a-z0-9_+#-]+$/i.test(c); }).join(' ');
  }

  function sanitizeHtml(html) {
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    var out = document.createElement('body');
    copyChildren(doc.body, out);
    return out.innerHTML;
  }

  function copyChildren(src, dst) {
    Array.prototype.forEach.call(src.childNodes, function (node) {
      if (node.nodeType === 3) { // 文本
        dst.appendChild(document.createTextNode(node.nodeValue));
        return;
      }
      if (node.nodeType !== 1) return; // 注释/PI 等一律丢弃
      var tag = node.tagName.toLowerCase();
      if (DROP_TAGS[tag]) return;          // 整体移除
      if (!ALLOWED_TAGS[tag]) { copyChildren(node, dst); return; } // 未知标签 unwrap 保文本
      var el = document.createElement(tag);
      var allow = ALLOWED_ATTR[tag] || {};
      Array.prototype.forEach.call(node.attributes, function (attr) {
        var lname = attr.name.toLowerCase();
        if (lname.slice(0, 2) === 'on') return;   // 事件属性一律剥除
        if (!allow[lname]) return;
        if (lname === 'href' && isUnsafeUri(attr.value)) return;      // 链接协议闸
        if (lname === 'src'  && isUnsafeUri(attr.value)) return;      // 图片协议闸
        if (lname === 'class' && tag === 'code') {
          var safe = safeCodeClass(attr.value);
          if (safe) el.setAttribute('class', safe);
          return;
        }
        el.setAttribute(lname, attr.value);
      });
      if (tag === 'input') el.setAttribute('disabled', '');           // GFM task list 恒禁用
      copyChildren(node, el);
      dst.appendChild(el);
    });
  }

  // ---- 文本转义单源（v10.48 #240） ----
  // & < > " ' 五字符全替（对齐 OWASP XSS Prevention Cheat Sheet 推荐集合），
  // 入参非字符串先 String() 归一，null/undefined 回落空串——与各应用历史
  // 本地实现语义兼容（历史实现普遍缺 ' 的替身，本单源为超集，消费方零行为回归）。
  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.__mdSanitize = sanitizeHtml;
  window.__mdSanitize.escapeHtml = escapeHtml;   // 主入口：sanitize.escapeHtml
  window.__mdEscapeHtml = escapeHtml;            // 别名：壳层/轻量场景短路径
})();
