// ==================== markdown.js — Markdown 编辑器 (iframe 嵌入, v9.16 #165) ====================
// marked.min.js 已 vendor（#165「已付费未使用」系列：零新增体积）+ _shared/sanitize.js XSS 白名单闸
// 编辑/预览平板双栏（准入③）+ VFS /documents/ 读写与文件管理器互通（准入④）+ 带手柄字号滑条 +
// 工具栏整排按压联动（准入⑤）。与 #180 教训划界：Markdown 是独立生产力工具（#164/#165/#166 系列），
// 非 music/notes 附属能力，新建户口不属「另起炉灶」；数据单一真源 VFS，无 localStorage 文档孤岛。

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'markdown',
  name: 'Markdown',
  pages: [
    {
      title: 'MARKDOWN',
      content: iframeAppContent('apps/markdown/index.html'),
    },
  ],
};
