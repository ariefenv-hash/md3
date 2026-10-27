// ==================== code-editor.js — 代码编辑器 (iframe 嵌入, v8.50 #32) ====================
// #12 P1 首位：CodeMirror 6 多语言高亮（js/html/css/python）+ VFS 文件树，
// 与终端（`code <file>` 深链）/ Python REPL（语言共用底座）联动。
// 纯函数在 js/code-editor-core.js（vitest 锚），页面侧 apps/code-editor/ 只做接线。

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'code-editor',
  name: '代码编辑器',
  pages: [
    {
      title: '代码编辑器',
      content: iframeAppContent('apps/code-editor/index.html'),
    },
  ],
};
