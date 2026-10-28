// ==================== radio.js — 收音机 (iframe 嵌入, v8.54 #61) ====================
// #12 P1 第五位：在线电台流播放（radio-browser.info 台库 + https 直流）。
// nightsky 双坑根除（http mixed content / m3u8 不入 audio，双闸门在 js/radio-core.js）。
// 纯函数在 js/radio-core.js（vitest 锚），页面侧 apps/radio/ 只做接线。

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'radio',
  name: '收音机',
  pages: [
    {
      title: '收音机',
      content: iframeAppContent('apps/radio/index.html'),
    },
  ],
};
