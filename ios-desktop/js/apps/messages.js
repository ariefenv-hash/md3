// ==================== messages.js — 信息 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'msg',
  name: '信息',
  pages: [{ title: '信息', content: iframeAppContent('apps/messages/index.html') }],
};
