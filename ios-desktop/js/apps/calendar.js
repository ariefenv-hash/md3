// ==================== calendar.js — 日历 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'cal_app',
  name: '日历',
  type: 'calendar',
  pages: [{ title: '日历', content: iframeAppContent('apps/calendar/index.html') }],
};
