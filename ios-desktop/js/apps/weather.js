// ==================== weather.js — 天气 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'weather',
  name: '天气',
  bgColor: '#0284C7',
  pages: [{ title: '天气', content: iframeAppContent('apps/weather/index.html') }],
};

