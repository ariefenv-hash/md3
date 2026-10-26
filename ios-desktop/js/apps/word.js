// ==================== word.js — 每日单词 (iframe 嵌入, v8.39 #28) ====================
// CET-4 词库 555 词内置 + 艾宾浩斯复习队列 + Web Speech 双声发音（断网全功能）

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'word',
  name: '每日单词',
  pages: [
    {
      title: 'WORD CARD',
      content: iframeAppContent('apps/word/index.html'),
    },
  ],
};
