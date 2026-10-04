// ==================== translate.js — 翻译 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'translate',
  name: '翻译',
  pages: [{ title: '翻译', content: iframeAppContent('apps/translate/index.html') }],
};
