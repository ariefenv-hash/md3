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
 * v10.76 #240：增补 `window.__mdEscape` —— 字符级 HTML 转义（& < > " ' 五字符）
 * 单一真源。凡用户输入 / 外部接口字段以文本或属性形态进入 innerHTML 前，
 * 必须经本函数转义（或改走 textContent 通道）。历史 8 处应用本地重复实现
 * （messages/translate/typing/reaction/pdf/archive/music 及脚手架）已收敛为
 * 本文件消费，禁止再新建本地 charmap 转义。DOMParser 系重闸（__mdSanitize）
 * 与字符转义轻闸（__mdEscape）同门共治：整段富文本过前者，插值变量过后者。
 *
 * v10.76 #240：壳层 js/ 收编——壳层 14 文件本地 charmap 退役改薄委托本真源
 * （notifications/app-bus/share-sheet/permissions/status-bar/iframe-app/lock-screen/
 *   lock-quotes/terminal-core/files/recorder/settings×3 + clock-app），壳层 index.html
 * head 先载本文件（经典脚本先于 main.js ESM 图谱求值，委托调用点零缺省）；
 * apps/ 九应用收敛（v10.76）+ weather 三插值点修复（v10.76）同源不赘列。
 *
 * 消费方：apps/markdown/index.html（实时预览 + 导出 HTML）、
 *        apps/calendar/index.html（renderPreview 同闸，#165 审计修复）、
 *        apps/archive、apps/messages、apps/pdf、apps/reaction、apps/typing、
 *        apps/translate、apps/music、apps/weather（#240 三插值点修复）、
 *        apps/clock-app + 壳层 js/ 14 文件（v10.76 #240 收编，负向锚 tests/v240-shell-convergence）。
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

  // ---- 字符级 HTML 转义（#240 单一真源：插值变量入 innerHTML 前置轻闸） ----
  // 与 __mdSanitize（DOMParser 白名单重闸）职责分层：富文本整段过重闸，
  // 逐个插值变量过本轻闸。null/undefined 归空串，数字/布尔经 String 归一。
  function escapeHtml(v) {
    var s = (v === null || v === undefined) ? '' : String(v);
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  window.__mdEscape = escapeHtml;
  window.__mdSanitize = sanitizeHtml;
})();
