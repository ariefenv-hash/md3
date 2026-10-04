// ==================== recorder.js — 录音机（批次四 · 大功能） ====================
//
// 桌面级「模块渲染型」应用（与 files/settings 同范式：pages[].content + 内联 IIFE 脚本，
// 直接运行在桌面文档，无 iframe 边界）。职责：
//   1. MediaRecorder 采集麦克风 → Blob 经 vfs.js 落盘 /recordings（owner:'recorder'）
//   2. 权限：批次一统一权限系统（microphone 类），拒绝则给出降级引导
//      另尊重快速设置的全局「Mic access」磁贴（关闭时提示后拒绝）
//   3. 列表：播放/暂停（单实例 Audio）、重命名（VFS move）、删除、分享到信息（files/share）
//   4. 录音落盘即出现在「文件」应用 /recordings 目录 —— 与音乐/信息的互通经由
//      文件管理器与分享总线完成（VFS 单一真源，零额外同步代码）
//
// 生命周期说明：模块应用页面脚本只执行一次、实例常驻内存（page-stack.js）；
// 离开页面录音继续、回到页面由 app-page-active 触发列表刷新。电平条用 AnalyserNode 驱动。

import { ICONS } from '../icons.js';
import { getAppIconSVG } from '../app-icons.js';
import { requestPermission } from '../permissions.js';
import { getTileActive } from '../quick-settings.js';

// 桌面级模块应用的页内脚本无法 import —— 模块作用域预置两座桥：
//   __recorderPerm  统一权限系统申请麦克风（resolve 布尔）
//   __recorderMicGate 快速设置「Mic access」全局磁贴状态查询
if (typeof window !== 'undefined') {
  window.__recorderPerm = function () {
    try {
      return Promise.resolve(requestPermission('microphone', { appId: 'recorder', appName: '录音机' }))
        .then(function (res) { return res === true; })
        .catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  };
  window.__recorderMicGate = function () {
    try { return getTileActive('mic_access') !== false; } catch (e) { return true; }
  };
}

export default {
  id: 'recorder',
  name: '录音机',
  pages: [
    {
      title: '录音机',
      content: `
        <div style="padding:16px 0 32px;position:relative;">
          <style>
            @keyframes recPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
          </style>
          <!-- 录音主卡 -->
          <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:22px 18px 20px;text-align:center;">
            <div id="recStatus" style="font-size:14px;font-weight:600;color:var(--md-on-surface-variant);">就绪</div>
            <div id="recTimer" style="font-size:44px;font-weight:700;color:var(--md-on-surface);font-variant-numeric:tabular-nums;margin:6px 0 10px;">00:00</div>
            <!-- 电平条（录音中由 AnalyserNode 驱动） -->
            <!-- v7.6：显隐改用 opacity 而非 visibility —— visibility:visible 是唯一能击穿
                 祖先 visibility:hidden 的属性，此前关闭应用后音波条会穿透隐藏的窗口悬浮在桌面上 -->
            <div id="recBars" style="display:flex;align-items:flex-end;justify-content:center;gap:5px;height:34px;margin:0 auto 16px;opacity:0;transition:opacity .15s ease;">
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:6px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 55%);transition:height .12s ease;"></span>
            </div>
            <button id="recBtn" title="开始录音" style="width:76px;height:76px;border-radius:50%;border:none;cursor:pointer;margin:0 auto;display:flex;align-items:center;justify-content:center;background:hsl(var(--md-h,215) 85% 55%);color:#fff;box-shadow:0 8px 26px hsl(var(--md-h,215) 85% 55% / .45);transition:transform .18s cubic-bezier(.2,0,0,1),background .2s;">
              <span id="recBtnIcon" style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;font-size:30px;">${ICONS.mic}</span>
            </button>
            <div id="recHint" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:12px;opacity:.85;">录音会保存到「文件」应用的 recordings 目录</div>
          </div>

          <!-- 录音列表 -->
          <div class="md3-card" style="padding:0;overflow:hidden;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 16px 9px;">
              <div style="font-size:14px;font-weight:700;color:var(--md-on-surface);">我的录音</div>
              <div id="recCount" style="font-size:12px;color:var(--md-on-surface-variant);"></div>
            </div>
            <div id="recList"></div>
            <div id="recEmpty" style="padding:34px 20px;text-align:center;color:var(--md-on-surface-variant);">
              <div style="opacity:.45;margin-bottom:10px;"><span style="display:inline-block;transform:scale(2);">${ICONS.recorder}</span></div>
              <div style="font-size:14px;">还没有录音</div>
              <div style="font-size:12px;margin-top:4px;opacity:.8;">点上方麦克风按钮开始第一段录音</div>
            </div>
          </div>

          <!-- 分享面板 -->
          <div id="recShareSheet" style="display:none;position:absolute;inset:0;z-index:70;background:rgba(0,0,0,.45);">
            <div style="position:absolute;left:0;right:0;bottom:0;background:var(--md-surface-container,#1e1e24);border-radius:24px 24px 0 0;padding:18px 16px 26px;">
              <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin:0 4px 12px;" id="recShareTitle">分享</div>
              <div id="recShareTargets"></div>
              <button class="md3-btn-tonal" id="recShareCancel" style="width:100%;margin-top:6px;">取消</button>
            </div>
          </div>

          <!-- 通用对话框（重命名 / 删除确认） -->
          <div id="recDialog" style="display:none;position:absolute;inset:0;z-index:80;background:rgba(0,0,0,.45);align-items:center;justify-content:center;padding:28px;">
            <div class="md3-card md3-card-elevated" style="width:100%;max-width:340px;padding:22px 20px 14px;">
              <div id="recDialogTitle" style="font-size:17px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;"></div>
              <div id="recDialogMsg" style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:10px;white-space:pre-wrap;display:none;"></div>
              <input id="recDialogInput" type="text" style="width:100%;box-sizing:border-box;background:var(--md-surface-container-high,#2a2a32);border:1px solid var(--md-outline-variant);border-radius:12px;color:var(--md-on-surface);font-size:14px;padding:11px 12px;outline:none;display:none;" />
              <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:14px;">
                <button class="md3-btn-tonal" id="recDialogCancel">取消</button>
                <button class="md3-btn-filled" id="recDialogOk">确定</button>
              </div>
            </div>
          </div>

          <script>
            (function() {
              'use strict';
              var V = window.__vfs || null;
              var DIR = '/recordings';
              var $ = function(id) { return document.getElementById(id); };

              var statusEl = $('recStatus'), timerEl = $('recTimer'), barsEl = $('recBars'), btn = $('recBtn'), btnIcon = $('recBtnIcon'), hintEl = $('recHint');
              var listEl = $('recList'), emptyEl = $('recEmpty'), countEl = $('recCount');
              var shareSheet = $('recShareSheet'), shareTitle = $('recShareTitle'), shareTargets = $('recShareTargets');
              var dlgEl = $('recDialog'), dlgTitle = $('recDialogTitle'), dlgMsg = $('recDialogMsg'), dlgInput = $('recDialogInput');

              // ---------- 状态 ----------
              var recording = false;
              var rec = null, recStream = null, recMime = '', recChunks = [], recSec = 0, recTimer = null, barsTimer = null, audioCtx = null, analyser = null;
              var audio = null, playPath = null, playingRow = null;
              var visible = true;
              var dlgResolve = null;

              // ---------- 小工具 ----------
              function esc(s) {
                return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\"/g, '&quot;').replace(/'/g, '&#39;');
              }
              function toast(msg) {
                try { if (window.showSystemToast) window.showSystemToast(msg); } catch (e) {}
              }
              function fmtBytes(b) {
                if (!b || b < 0) return '0 B';
                if (b < 1024) return b + ' B';
                if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
                return (b / 1048576).toFixed(2) + ' MB';
              }
              function fmtSec(s) {
                s = Math.max(0, Math.floor(s || 0));
                var m = Math.floor(s / 60), r = s % 60;
                return (m < 10 ? '0' + m : m) + ':' + (r < 10 ? '0' + r : r);
              }
              function fmtDate(ts) {
                try { return new Date(ts || Date.now()).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
              }
              function baseName(p) { return p.slice(p.lastIndexOf('/') + 1); }
              function extOf(name) {
                var i = name.lastIndexOf('.');
                return i > 0 ? name.slice(i) : '';
              }
              function emit(event, payload) {
                // 模块应用运行在桌面文档内：事件必须发给桌面总线所在窗口（window 自身）。
                // parent 仅在桌面被根壳 iframe 包裹时才存在，壳不处理 BUS_EMIT，只作冗余兜底。
                var msg = { type: 'BUS_EMIT', event: event, payload: payload, target: 'msg' };
                try { window.postMessage(msg, '*'); } catch (e) {}
                try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (e) {}
              }

              // ---------- 通用对话框（Promise 风格） ----------
              function dlg(opts) {
                return new Promise(function (resolve) {
                  dlgResolve = resolve;
                  dlgTitle.textContent = opts.title || '';
                  dlgMsg.style.display = opts.msg ? 'block' : 'none';
                  dlgMsg.textContent = opts.msg || '';
                  dlgInput.style.display = opts.input ? 'block' : 'none';
                  dlgInput.value = opts.value || '';
                  dlgEl.style.display = 'flex';
                  if (opts.input) { try { dlgInput.focus(); dlgInput.select(); } catch (e) {} }
                });
              }
              function closeDlg(val) {
                dlgEl.style.display = 'none';
                if (dlgResolve) { var r = dlgResolve; dlgResolve = null; r(val); }
              }
              $('recDialogOk').addEventListener('click', function () {
                closeDlg(dlgInput.style.display !== 'none' ? dlgInput.value : true);
              });
              $('recDialogCancel').addEventListener('click', function () { closeDlg(null); });
              dlgInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); $('recDialogOk').click(); }
              });

              // ---------- 录音主流程 ----------
              function pickMime() {
                var candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
                if (typeof MediaRecorder === 'undefined') return '';
                for (var i = 0; i < candidates.length; i++) {
                  try { if (MediaRecorder.isTypeSupported(candidates[i])) return candidates[i]; } catch (e) {}
                }
                return '';
              }
              function mimeExt(m) {
                if (m.indexOf('mp4') >= 0) return '.m4a';
                if (m.indexOf('ogg') >= 0) return '.ogg';
                return '.webm';
              }
              function setBtnState(isRec) {
                btn.style.background = isRec ? '#E5484D' : 'hsl(var(--md-h,215) 85% 55%)';
                btn.style.boxShadow = isRec ? '0 8px 26px rgba(229,72,77,.45)' : '0 8px 26px hsl(var(--md-h,215) 85% 55% / .45)';
                btn.style.animation = isRec ? 'recPulse 1.4s ease-in-out infinite' : '';
                btnIcon.innerHTML = isRec ? '${ICONS.stop_record}' : '${ICONS.mic}';
                btn.title = isRec ? '停止并保存' : '开始录音';
              }
              function startBars(stream) {
                try {
                  var Ctx = window.AudioContext || window.webkitAudioContext;
                  if (!Ctx) return;
                  audioCtx = new Ctx();
                  var src = audioCtx.createMediaStreamSource(stream);
                  analyser = audioCtx.createAnalyser();
                  analyser.fftSize = 256;
                  src.connect(analyser);
                  var data = new Uint8Array(analyser.frequencyBinCount);
                  barsEl.style.opacity = '1';
                  barsTimer = setInterval(function () {
                    try {
                      analyser.getByteFrequencyData(data);
                      var bars = barsEl.querySelectorAll('.rec-bar');
                      var step = Math.floor(data.length / bars.length) || 1;
                      for (var i = 0; i < bars.length; i++) {
                        var sum = 0;
                        for (var j = 0; j < step; j++) sum += data[i * step + j] || 0;
                        var avg = sum / step;
                        var h = 6 + Math.min(28, (avg / 255) * 34);
                        bars[i].style.height = h.toFixed(0) + 'px';
                      }
                    } catch (e) {}
                  }, 120);
                } catch (e) {}
              }
              function stopBars() {
                if (barsTimer) { clearInterval(barsTimer); barsTimer = null; }
                if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; analyser = null; }
                barsEl.style.opacity = '0';
                var bars = barsEl.querySelectorAll('.rec-bar');
                for (var i = 0; i < bars.length; i++) bars[i].style.height = '6px';
              }
              function uniqueName(dir, base, ext) {
                var name = base + ext, n = 2;
                // V.exists 为同步内存索引查询（vfs.js），不可用时直接用首名
                while (V && V.exists && V.exists(dir + '/' + name)) {
                  name = base + ' (' + n + ')' + ext; n++;
                  if (n > 99) break;
                }
                return name;
              }

              function startRecording() {
                if (!V) { toast('文件系统未就绪，无法保存录音'); return; }
                if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || typeof MediaRecorder === 'undefined') {
                  toast('当前环境不支持录音（缺少 MediaRecorder）');
                  return;
                }
                if (!window.__recorderMicGate || !window.__recorderMicGate()) {
                  toast('快速设置中「Mic access」已关闭，请先开启');
                  return;
                }
                Promise.resolve(window.__recorderPerm ? window.__recorderPerm() : false).then(function (ok) {
                  if (!ok) { toast('需要麦克风权限才能录音（设置 › 应用权限可改判）'); return; }
                  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
                    recMime = pickMime();
                    try { rec = recMime ? new MediaRecorder(stream, { mimeType: recMime }) : new MediaRecorder(stream); }
                    catch (e) { rec = new MediaRecorder(stream); recMime = ''; }
                    if (!recMime) recMime = rec.mimeType || 'audio/webm';
                    recStream = stream;
                    recChunks = []; recSec = 0;
                    rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) recChunks.push(ev.data); };
                    rec.onstop = function () { saveRecording(); };
                    try { rec.start(250); } catch (e) { rec.start(); }
                    recording = true;
                    setBtnState(true);
                    statusEl.textContent = '录音中…';
                    statusEl.style.color = '#E5484D';
                    timerEl.textContent = '00:00';
                    recTimer = setInterval(function () {
                      recSec++;
                      timerEl.textContent = fmtSec(recSec);
                    }, 1000);
                    startBars(stream);
                  }).catch(function (err) {
                    toast('无法访问麦克风：' + (err && err.name ? err.name : '未知错误'));
                  });
                });
              }

              function stopRecording() {
                if (!recording || !rec) return;
                recording = false;
                if (recTimer) { clearInterval(recTimer); recTimer = null; }
                stopBars();
                setBtnState(false);
                statusEl.textContent = '保存中…';
                statusEl.style.color = '';
                try { rec.stop(); } catch (e) { saveRecording(); }
              }

              function saveRecording() {
                var chunks = recChunks; recChunks = [];
                var sec = recSec;
                if (recStream) { try { recStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} recStream = null; }
                if (!chunks.length) {
                  statusEl.textContent = '就绪';
                  toast('没有录到内容');
                  return;
                }
                var blob = new Blob(chunks, { type: recMime || 'audio/webm' });
                var ts = new Date();
                var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
                var base = '录音 ' + pad(ts.getMonth() + 1) + pad(ts.getDate()) + '-' + pad(ts.getHours()) + pad(ts.getMinutes()) + pad(ts.getSeconds());
                var ext = mimeExt(recMime || blob.type || '');
                var name = uniqueName(DIR, base, ext);
                var path = DIR + '/' + name;
                V.write(path, blob, { mime: (blob.type || 'audio/webm').split(';')[0], owner: 'recorder', meta: { duration: sec } })
                  .then(function (res) {
                    if (res && res.ok) { toast('已保存：' + name); statusEl.textContent = '就绪'; timerEl.textContent = '00:00'; }
                    else { statusEl.textContent = '保存失败'; toast('保存失败：' + ((res && res.error) || '未知错误')); }
                  })
                  .catch(function () { statusEl.textContent = '保存失败'; toast('保存失败'); });
              }

              btn.addEventListener('click', function () { recording ? stopRecording() : startRecording(); });

              // ---------- 列表 ----------
              function rowHTML(e) {
                var meta = e.meta || {};
                var dur = meta.duration ? fmtSec(meta.duration) : '';
                var size = fmtBytes(e.size || 0);
                var isActive = playPath === e.path;
                return '<div class="md3-list-item" data-path="' + esc(e.path) + '" style="display:flex;align-items:center;gap:12px;padding:10px 14px;' + (isActive ? 'background:hsl(var(--md-h,215) 80% 50% / .1);' : '') + '">'
                  + '<button class="md3-btn-tonal" data-act="play" title="播放" style="min-width:0;width:40px;height:40px;padding:0;border-radius:50%;flex:none;">' + (isActive && audio && !audio.paused ? '${ICONS.pause}' : '${ICONS.play}') + '</button>'
                  + '<div style="flex:1;min-width:0;">'
                  +   '<div style="font-size:14px;font-weight:600;color:var(--md-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(e.name) + '</div>'
                  +   '<div data-role="meta" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:2px;">' + (dur ? dur + ' · ' : '') + size + ' · ' + fmtDate(e.modified) + '</div>'
                  + '</div>'
                  + '<button class="md3-btn-tonal" data-act="share" title="分享" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${ICONS.quick_share}</button>'
                  + '<button class="md3-btn-tonal" data-act="rename" title="重命名" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${ICONS.edit}</button>'
                  + '<button class="md3-btn-tonal" data-act="del" title="删除" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${ICONS.delete_forever}</button>'
                  + '</div>';
              }

              function render() {
                if (!V || !visible) return;
                Promise.resolve(V.list(DIR)).then(function (entries) {
                  var files = (entries || []).filter(function (e) { return e.type !== 'dir'; });
                  countEl.textContent = files.length ? files.length + ' 段' : '';
                  emptyEl.style.display = files.length ? 'none' : 'block';
                  listEl.innerHTML = files.map(rowHTML).join('');
                }).catch(function () {});
              }

              // 事件委托：列表内所有点击（播放/分享/重命名/删除）
              listEl.addEventListener('click', function (ev) {
                var actBtn = ev.target.closest('[data-act]');
                if (!actBtn) return;
                var row = actBtn.closest('[data-path]');
                if (!row) return;
                var path = row.getAttribute('data-path');
                var act = actBtn.getAttribute('data-act');
                if (act === 'play') togglePlay(path, row);
                else if (act === 'share') openShare(path);
                else if (act === 'rename') doRename(path);
                else if (act === 'del') doDelete(path);
              });

              // ---------- 播放 ----------
              function stopPlayback() {
                if (audio) { try { audio.pause(); } catch (e) {} }
                if (playingRow) {
                  var m = playingRow.querySelector('[data-role="meta"]');
                  if (m && m.getAttribute('data-plain')) m.textContent = m.getAttribute('data-plain');
                  var pb = playingRow.querySelector('[data-act="play"]');
                  if (pb) pb.innerHTML = '${ICONS.play}';
                  playingRow.style.background = '';
                }
                playingRow = null; playPath = null;
              }
              function togglePlay(path, row) {
                if (!V) return;
                if (playPath === path && audio) {
                  if (audio.paused) { try { audio.play(); } catch (e) {} row.querySelector('[data-act="play"]').innerHTML = '${ICONS.pause}'; }
                  else { audio.pause(); row.querySelector('[data-act="play"]').innerHTML = '${ICONS.play}'; }
                  return;
                }
                stopPlayback();
                Promise.resolve(V.readURL(path)).then(function (url) {
                  if (!url) { toast('读取失败'); return; }
                  playPath = path; playingRow = row;
                  row.style.background = 'hsl(var(--md-h,215) 80% 50% / .1)';
                  row.querySelector('[data-act="play"]').innerHTML = '${ICONS.pause}';
                  var metaEl = row.querySelector('[data-role="meta"]');
                  if (metaEl) {
                    metaEl.setAttribute('data-plain', metaEl.textContent);
                    metaEl.textContent = '00:00 播放中…';
                  }
                  audio = audio || new Audio();
                  audio.src = url;
                  audio.onended = function () { stopPlayback(); };
                  audio.ontimeupdate = function () {
                    if (playPath !== path || !metaEl) return;
                    var total = null;
                    try {
                      var e = V.stat && V.stat(path);
                      if (e && e.meta && e.meta.duration) total = e.meta.duration;
                    } catch (err) {}
                    if (total == null && isFinite(audio.duration)) total = audio.duration;
                    metaEl.textContent = fmtSec(audio.currentTime) + (total != null ? ' / ' + fmtSec(total) : '') + ' 播放中…';
                  };
                  audio.play().catch(function () { toast('播放失败'); });
                }).catch(function () { toast('读取失败'); });
              }

              // ---------- 重命名 / 删除 ----------
              function doRename(path) {
                var name = baseName(path);
                var ext = extOf(name);
                dlg({ title: '重命名录音', input: true, value: name.slice(0, name.length - ext.length) })
                  .then(function (val) {
                    if (val == null) return;
                    var nn = String(val).trim();
                    if (!nn) { toast('名称不能为空'); return; }
                    var newPath = DIR + '/' + nn + ext;
                    if (newPath === path) return;
                    Promise.resolve(V.move(path, newPath)).then(function (res) {
                      if (res && res.ok) toast('已重命名');
                      else toast('重命名失败：' + ((res && res.error) || '目标可能已存在'));
                    }).catch(function () { toast('重命名失败'); });
                  });
              }
              function doDelete(path) {
                dlg({ title: '删除录音', msg: '「' + baseName(path) + '」将被删除，且无法恢复。' })
                  .then(function (ok) {
                    if (!ok) return;
                    if (playPath === path) stopPlayback();
                    Promise.resolve(V.del(path)).then(function (res) {
                      if (res && res.ok) toast('已删除');
                      else toast('删除失败');
                    }).catch(function () { toast('删除失败'); });
                  });
              }

              // ---------- 分享 ----------
              function openShare(path) {
                shareTitle.textContent = '分享「' + baseName(path) + '」';
                shareTargets.innerHTML = '<button class="md3-list-item" data-share="msg" style="width:100%;"><div class="md3-list-item-icon">${ICONS.chat}</div><div class="md3-list-item-text">发送到 信息</div></button>';
                shareTargets.setAttribute('data-sharing-path', path);
                shareSheet.style.display = 'block';
              }
              $('recShareCancel').addEventListener('click', function () { shareSheet.style.display = 'none'; });
              shareSheet.addEventListener('click', function (e) { if (e.target === shareSheet) shareSheet.style.display = 'none'; });
              shareTargets.addEventListener('click', function (e) {
                var b = e.target.closest('[data-share]');
                if (!b) return;
                var path = shareTargets.getAttribute('data-sharing-path') || '';
                shareSheet.style.display = 'none';
                if (!path) return;
                var entry = null;
                try { entry = V.stat && V.stat(path); } catch (err) {}
                var dur = entry && entry.meta && entry.meta.duration ? ' · ' + fmtSec(entry.meta.duration) : '';
                emit('files/share', {
                  name: baseName(path),
                  text: '（语音录音）' + baseName(path) + dur,
                  noti: { title: '录音分享到信息', desc: baseName(path) },
                });
                toast('已发送到信息');
              });

              // ---------- 录音会话强制释放（实例销毁兜底） ----------
              // fix(audit-E): 录音中实例被销毁（多任务上滑滑走 / 退出分屏 / 清空后台）时
              // 此前零清理 —— MediaRecorder/MediaStream/recTimer/barsTimer/AudioContext/recChunks
              // 闭包全部存活：麦克风被持续占用、recChunks 无限增长、重开应用停不掉旧会话。
              // 登记进 __addAppCleanup（page-stack 的 releaseAppListeners 集中执行）：
              // 上滑销毁（destroyAppInstance → releaseAppListeners）与分屏退出
              // （split-screen finishClose → releaseAppListeners）两条路径都被覆盖，无需
              // 再监听 app-instance-destroyed（该事件同样派发自 releaseAppListeners 之后）。
              // 幂等设计：重复清理无害（rec/recStream/timers 置空后再入直接短路）。
              function releaseRecSession() {
                recording = false;
                if (recTimer) { try { clearInterval(recTimer); } catch (err) {} recTimer = null; }
                if (barsTimer) { try { clearInterval(barsTimer); } catch (err) {} barsTimer = null; }
                if (audioCtx) { try { audioCtx.close(); } catch (err) {} audioCtx = null; analyser = null; }
                recChunks = [];
                var stream = recStream; recStream = null;
                var r = rec; rec = null;
                if (r && (r.state === 'recording' || r.state === 'paused')) {
                  // 实例已销毁：保存 UI 不在场，onstop 内只释放 stream 轨道（丢弃未保存分片）
                  try {
                    r.onstop = function () {
                      if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (err) {} }
                    };
                    r.stop();
                    return;
                  } catch (err) { /* stop 失败 → 兜底直接停轨道 */ }
                }
                if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (err) {} }
              }

              // ---------- VFS 订阅 + 页面激活 ----------
              // 监听/订阅统一登记：实例销毁时由 page-stack 集中退订（防重建累积泄漏）
              var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
              var addCleanup = window.__addAppCleanup || function() {};
              addCleanup('recorder', releaseRecSession);
              if (V && V.subscribe) {
                var unVfs = V.subscribe(DIR, render);
                addCleanup('recorder', function() { try { unVfs(); } catch (err) {} });
              }
              bindDoc('recorder', 'app-page-active', function (e) {
                if (!e.detail || e.detail.appId !== 'recorder') return;
                visible = e.detail.pageIdx === 0;
                if (visible) render();
              });
              visible = true;
              render();
            })();
          </script>
        </div>
      `,
    },
  ],
};
