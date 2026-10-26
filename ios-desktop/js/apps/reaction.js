// ==================== reaction.js — 反应力测试 (iframe 嵌入, v8.36 #29) ====================
// Human Benchmark 口径分级 + 5 轮统计 + 防作弊判负 + localStorage 历史留存

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'reaction',
  name: '反应力测试',
  pages: [
    {
      title: 'REACTION LAB',
      content: iframeAppContent('apps/reaction/index.html'),
    },
  ],
};
