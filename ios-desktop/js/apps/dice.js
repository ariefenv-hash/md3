// ==================== dice.js — 智能骰子 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'dice',
  name: '掷骰子',
  pages: [
    {
      title: 'DICE LAB',
      content: iframeAppContent('apps/dice/index.html'),
    },
  ],
};
