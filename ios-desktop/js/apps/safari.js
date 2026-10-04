// ==================== safari.js — 浏览器 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'safari',
  name: '浏览器',
  pages: [{ title: '浏览器', content: iframeAppContent('apps/safari/index.html') }],
};
