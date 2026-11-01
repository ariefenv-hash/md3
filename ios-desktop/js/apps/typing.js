// ==================== typing.js — 打字练习 (iframe 嵌入, v9.06 #122) ====================
// 一期：英文单词（复用 #28 word 555 词库）/ 英文句子 / 自由练习 三模式
// 逐字比对错字高亮 + WPM/准确率实时统计（nightsky nstypepractise t_eftt 对标超越）

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'typing',
  name: '打字练习',
  pages: [
    {
      title: 'TYPING',
      content: iframeAppContent('apps/typing/index.html'),
    },
  ],
};
