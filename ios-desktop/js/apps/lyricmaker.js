// ==================== lyricmaker.js — 歌词制作器 (iframe 嵌入, v9.10 #121) ====================
// 一期：LRC 打轴（播放/模拟打点，快打防乱序）+ 逐字对齐（码点均分）+ 卡拉OK预览
// + 导出 LRC / md3-lyric JSON（#52 逐字歌词引擎消费契约 v1）

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'lyricmaker',
  name: '歌词制作',
  pages: [
    {
      title: 'LYRICS',
      content: iframeAppContent('apps/lyricmaker/index.html'),
    },
  ],
};
