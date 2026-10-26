// ==================== piano.js — 电子琴 (iframe 嵌入, v8.41 #57) ====================
// 真钢琴键盘 UI + Web Audio 自研合成（oscillator 4 波形 + ADSR + 复音上限），
// 断网全功能（零外部依赖 · P1 批次唯一纯自研件）。

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'piano',
  name: '电子琴',
  pages: [
    {
      title: 'PIANO',
      content: iframeAppContent('apps/piano/index.html'),
    },
  ],
};
