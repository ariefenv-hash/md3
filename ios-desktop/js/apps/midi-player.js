// ==================== midi-player.js — MIDI 播放器 (iframe 嵌入, v8.51 #56) ====================
// #12 P1 第二位：html-midi-player Web Component（钢琴卷帘可视化），
// 默认音色 = 库内置 Tone 合成器（离线可发声），sound-font 音源为显式开启的懒加载增强。
// 纯函数在 js/midi-player-core.js（vitest 锚），页面侧 apps/midi-player/ 只做接线。

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'midi-player',
  name: 'MIDI 播放器',
  pages: [
    {
      title: 'MIDI 播放器',
      content: iframeAppContent('apps/midi-player/index.html'),
    },
  ],
};
