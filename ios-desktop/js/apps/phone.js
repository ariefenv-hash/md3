// ==================== phone.js — 电话 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'phone',
  name: '电话',
  pages: [{ title: '电话', content: iframeAppContent('apps/phone/index.html') }],
};
