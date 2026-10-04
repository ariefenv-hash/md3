// ==================== music.js — 音乐 (iframe 嵌入 + 本地文件导入) ====================
//
// fix(audit-E): 移除原「本地音乐」子页（pages[1]）—— 该页无任何入口（全工程无
// pushSubPage(1) 调用方）、musicFileInput2 无 onchange 死按钮、localMusicList 无渲染
// 逻辑，属不可达死 UI；本地导入的完整可用入口在内嵌应用自带按钮与拖放区
// （apps/music/index.html），桌面侧保留经定向修正后的导入浮层链路。

import { iframeAppContent } from '../iframe-app.js';
import { ICONS } from '../icons.js';

export default {
  id: 'music',
  name: '音乐',
  pages: [
    {
      title: '音乐',
      content: `
        ${iframeAppContent('apps/music/index.html')}
        <!-- 本地文件导入浮层 -->
        <div id="musicImportOverlay" style="position:absolute;inset:0;z-index:500;background:rgba(0,0,0,0.7);backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;opacity:0;transition:opacity 0.25s;">
          <div style="background:var(--md-surface-container,hsl(var(--md-h,215) 18% 12%));border-radius:24px;padding:24px;width:80%;max-width:340px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">${ICONS.music_note}</div>
            <div style="font-size:18px;font-weight:600;color:var(--md-on-surface,#e2e2e9);margin-bottom:8px;">导入本地音乐</div>
            <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:20px;">支持 MP3 / WAV / FLAC / M4A 等格式</div>
            <div style="background:var(--md-primary,hsl(var(--md-h,215) 80% 25%));color:var(--md-on-primary,#fff);padding:14px;border-radius:9999px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:12px;" onclick="document.getElementById('musicFileInput').click()">选择音乐文件</div>
            <div style="color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;cursor:pointer;padding:8px;" onclick="document.getElementById('musicImportOverlay').style.display='none';document.getElementById('musicImportOverlay').style.opacity='0';">取消</div>
          </div>
        </div>
        <input type="file" id="musicFileInput" accept="audio/*" multiple style="display:none;" onchange="
          // fix(audit-E): 定向当前音乐实例的 iframe —— 此前 document.querySelector('iframe')
          // 错投全文档第一个 iframe（可能是其它常驻实例/多任务预览）。当前实例的 iframe 与
          // 本输入框同属一个 .app-page（page-stack 实例页与分屏窗格页均有该类名），
          // 从 this 向上就近查找，天然避开其它实例。
          var files = this.files;
          if (files.length > 0) {
            var page = this.closest && this.closest('.app-page');
            var iframe = page ? page.querySelector('iframe') : null;
            if (iframe && iframe.contentWindow) {
              for (var i = 0; i < files.length; i++) {
                var url = URL.createObjectURL(files[i]);
                iframe.contentWindow.postMessage({ type: 'import-music', url: url, name: files[i].name }, '*');
              }
            }
            var overlay = document.getElementById('musicImportOverlay');
            if (overlay) {
              overlay.style.opacity = '0';
              setTimeout(function(){ overlay.style.display = 'none'; }, 250);
            }
          }
        ">
      `,
    },
  ],
};
