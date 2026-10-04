// ==================== photos.js — 相册 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'photo',
  name: '相册',
  pages: [{ title: '相册', content: iframeAppContent('apps/photos/index.html') }],
};
