// ==================== python.js — Python REPL (iframe 嵌入, v8.43 #31) ====================
// 网页里的真 Python：Pyodide (WASM CPython) 懒加载 REPL + micropip 第三方库。
// 运行时不进主 bundle：首次「运行」才从 CDN 拉取（#31 验收锚）。

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'python',
  name: 'Python',
  pages: [
    {
      title: 'PYTHON',
      content: iframeAppContent('apps/python/index.html'),
    },
  ],
};
