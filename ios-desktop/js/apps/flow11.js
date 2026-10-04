// ==================== flow11.js — Flow 11 莫奈莫兰迪 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'flow11',
  name: 'Flow 11',
  bgColor: '#2E383F',
  pages: [
    {
      title: 'Flow 11',
      content: iframeAppContent('apps/flow11/index.html'),
    },
  ],
};
