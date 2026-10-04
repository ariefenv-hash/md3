// ==================== clock.js — 时钟 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'clock_app',
  name: '时钟',
  type: 'clock',
  pages: [{ title: '时钟', content: iframeAppContent('apps/clock-app/index.html') }],
};
