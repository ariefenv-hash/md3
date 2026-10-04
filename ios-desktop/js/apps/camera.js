// ==================== camera.js — 相机 (Material Design 3 + 真实 WebRTC) ====================

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'camera',
  name: '相机',
  pages: [
    {
      title: '相机',
      content: iframeAppContent('apps/camera/index.html'),
    },
  ],
};
