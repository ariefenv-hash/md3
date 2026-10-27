// ==================== stt.js — 语音转文字 (iframe 嵌入, v8.53 #59) ====================
// #12 P1 第四位：Web Speech API 原生实时听写（零第三方 AI 修正——nightsky
// pollinations 外发反例根除；标点本地停顿规则）。纯函数在 js/stt-core.js
// （vitest 锚），页面侧 apps/stt/ 只做接线。

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'stt',
  name: '语音转文字',
  pages: [
    {
      title: '语音转文字',
      content: iframeAppContent('apps/stt/index.html'),
    },
  ],
};
