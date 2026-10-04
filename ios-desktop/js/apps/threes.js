// ==================== threes.js — 小三传奇 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'threes',
  name: '小三传奇',
  pages: [
    {
      title: '小三传奇 Pro',
      content: iframeAppContent('apps/threes/index.html'),
    },
  ],
};
