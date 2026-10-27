// ==================== bytebeat.js — ByteBeat 音乐编程 (iframe 嵌入, v8.42 #30) ====================
// 公式即音乐：白名单沙箱编译（仅 t 与 Math）+ 离屏 AudioBuffer + 波形/频谱双可视化，
// 断网全功能（零外部依赖 · #12 P2 首位）。

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'bytebeat',
  name: 'ByteBeat',
  pages: [
    {
      title: 'BYTEBEAT',
      content: iframeAppContent('apps/bytebeat/index.html'),
    },
  ],
};
