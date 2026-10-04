// ==================== notes.js — 备忘录 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'notes',
  name: '备忘录',
  pages: [{ title: '备忘录', content: iframeAppContent('apps/notes/index.html') }],
};
