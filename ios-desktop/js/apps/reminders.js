// ==================== reminders.js — 提醒 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'reminders',
  name: '提醒',
  pages: [{ title: '提醒', content: iframeAppContent('apps/reminders/index.html') }],
};
