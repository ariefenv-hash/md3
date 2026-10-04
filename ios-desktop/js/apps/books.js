// ==================== books.js — 图书 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'books',
  name: '图书',
  pages: [{ title: '图书', content: iframeAppContent('apps/books/index.html') }],
};
