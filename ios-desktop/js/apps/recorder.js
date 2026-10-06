// ==================== recorder.js — 录音机（批次四 · 大功能 / v7.50 全面重制） ====================
//
// 桌面级「模块渲染型」应用（与 files/settings 同范式：pages[].content + 内联 IIFE 脚本，
// 直接运行在桌面文档，无 iframe 边界）。职责：
//   1. MediaRecorder 采集麦克风 → Blob 经 vfs.js 落盘 /recordings（owner:'recorder'）
//   2. 权限：批次一统一权限系统（microphone 类），拒绝则给出降级引导
//      另尊重快速设置的全局「Mic access」磁贴（关闭时提示后拒绝）
//      v7.50 权限诊断链路：应用内权限 ≠ 浏览器站点权限 —— 两者分层预检与引导，
//      getUserMedia 失败按 err.name 映射为可操作的中文指引（「权限给了却录不了」根治）
//   3. 列表：播放/暂停（单实例 Audio + 播放进度条）、重命名（VFS move）、删除、分享
//   4. 录音落盘即出现在「文件」应用 /recordings 目录 —— 与音乐/信息的互通经由
//      文件管理器与分享总线完成（VFS 单一真源，零额外同步代码）
//   5. v7.50 UI 重制：状态芯片 / 大计时器（0.1s 精度）/ 镜像电平条 / 圆→方录制钮形变
//      + 呼吸涟漪环 / 录音中暂停-继续 / 行内播放进度条 / 空态与列表头重设计
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
            @keyframes recPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.055); } }
            /* v7.50 录制钮呼吸涟漪环（仅录音中） */
            .rec-main { position: relative; }
            .rec-main.recording::before,
            .rec-main.recording::after {
              content: ''; position: absolute; inset: -7px; border-radius: 50%;
              border: 2px solid rgba(229,72,77,.5); pointer-events: none;
              animation: recRing 1.7s ease-out infinite;
            }
            .rec-main.recording::after { animation-delay: .85s; }
            @keyframes recRing { 0% { transform: scale(.92); opacity: .75; } 100% { transform: scale(1.45); opacity: 0; } }
            /* v7.50 圆 → 圆角方形形变（M3 expressive 形状语言） */
            .rec-shape {
              width: 84px; height: 84px; border-radius: 50%; border: none; cursor: pointer;
              display: flex; align-items: center; justify-content: center;
              background: hsl(var(--md-h,215) 85% 55%); color: #fff;
              box-shadow: 0 10px 30px hsl(var(--md-h,215) 85% 55% / .45);
              transition: border-radius .3s cubic-bezier(.2,0,0,1), background .22s ease,
                          box-shadow .3s ease, transform .18s cubic-bezier(.2,0,0,1);
            }
            .rec-shape:active { transform: scale(.94); }
            .rec-shape.recording {
              border-radius: 28px; background: #E5484D;
              box-shadow: 0 10px 30px rgba(229,72,77,.45);
              animation: recPulse 1.7s ease-in-out infinite;
            }
            .rec-shape.paused { animation: none; }
            /* 状态芯片 */
            .rec-chip {
              display: inline-flex; align-items: center; gap: 6px;
              padding: 5px 13px; border-radius: 999px;
              background: var(--md-surface-container-high, #2a2b32);
              font-size: 12.5px; font-weight: 600; color: var(--md-on-surface-variant, #9a9ba3);
            }
            .rec-chip .rec-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex: none; }
            .rec-chip.is-rec { color: #E5484D; background: rgba(229,72,77,.12); }
            .rec-chip.is-rec .rec-dot { animation: recBlink 1.1s ease-in-out infinite; }
            .rec-chip.is-paused { color: #E5A54B; background: rgba(229,165,75,.12); }
            .rec-chip.is-ok { color: hsl(var(--md-h,215) 70% 60%); }
            @keyframes recBlink { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
            /* 麦克风诊断芯片 */
            .rec-mic {
              display: inline-flex; align-items: center; gap: 5px;
              font-size: 11.5px; color: var(--md-on-surface-variant, #9a9ba3); opacity: .9;
            }
            .rec-mic .rec-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
            .rec-mic.is-denied { color: #E5484D; opacity: 1; }
            .rec-mic.is-ok { color: hsl(var(--md-h,215) 70% 58%); }
            /* 播放行进度条 */
            .rec-prog {
              position: relative; height: 3px; border-radius: 2px; margin-top: 7px;
              background: var(--md-surface-container-highest, #34353d); overflow: hidden;
            }
            .rec-prog .rec-prog-fill {
              position: absolute; left: 0; top: 0; bottom: 0; width: 0%;
              border-radius: 2px; background: hsl(var(--md-h,215) 80% 60%);
              transition: width .18s linear;
            }
            @media (prefers-reduced-motion: reduce) {
              .rec-main.recording::before, .rec-main.recording::after,
              .rec-shape.recording { animation: none; }
              .rec-chip.is-rec .rec-dot { animation: none; }
            }
          </style>

          <!-- 录音主卡 -->
          <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:24px 18px 22px;text-align:center;background:linear-gradient(165deg, var(--md-surface-container-lowest, #202126), var(--md-surface-container-low, #26272e) 60%, var(--md-surface-container, #2a2b33));">
            <span id="recStatus" class="rec-chip"><span class="rec-dot"></span><span id="recStatusText">就绪</span></span>
            <div id="recTimer" style="font-size:52px;font-weight:700;color:var(--md-on-surface);font-variant-numeric:tabular-nums;letter-spacing:1px;margin:10px 0 6px;line-height:1.05;">00:00<span id="recTenth" style="font-size:24px;font-weight:600;color:var(--md-on-surface-variant);opacity:.8;">.0</span></div>
            <!-- 电平条（录音中由 AnalyserNode 驱动，镜像居中式） -->
            <!-- v7.6：显隐改用 opacity 而非 visibility —— visibility:visible 是唯一能击穿
                 祖先 visibility:hidden 的属性，此前关闭应用后音波条会穿透隐藏的窗口悬浮在桌面上 -->
            <div id="recBars" style="display:flex;align-items:center;justify-content:center;gap:5px;height:52px;margin:2px auto 18px;opacity:0;transition:opacity .18s ease;">
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
              <span class="rec-bar" style="width:5px;height:6px;border-radius:3px;background:hsl(var(--md-h,215) 80% 58%);transition:height .12s ease;"></span>
            </div>
            <div style="display:flex;align-items:center;justify-content:center;gap:14px;">
              <button id="recPauseBtn" title="暂停" style="display:none;width:46px;height:46px;border-radius:50%;border:none;cursor:pointer;align-items:center;justify-content:center;background:var(--md-surface-container-high,#2a2b32);color:var(--md-on-surface);box-shadow:0 3px 12px rgba(0,0,0,.25);">
                <span id="recPauseIcon" style="display:flex;width:20px;height:20px;font-size:18px;">${ICONS.pause}</span>
              </button>
              <button id="recBtn" class="rec-shape" title="开始录音">
                <span id="recBtnIcon" style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;font-size:32px;">${ICONS.mic}</span>
              </button>
            </div>
            <div id="recHint" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:14px;opacity:.85;">录音会保存到「文件」应用的 recordings 目录</div>
            <div id="recMicState" class="rec-mic" style="margin-top:8px;justify-content:center;">
              <span class="rec-dot"></span><span id="recMicStateText">正在检查麦克风…</span>
            </div>
          </div>

          <!-- 录音列表 -->
          <div class="md3-card" style="padding:0;overflow:hidden;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 16px 9px;">
              <div style="font-size:14px;font-weight:700;color:var(--md-on-surface);">我的录音</div>
              <div id="recCount" style="font-size:12px;color:var(--md-on-surface-variant);"></div>
            </div>
            <div id="recList"></div>
            <div id="recEmpty" style="padding:38px 20px;text-align:center;color:var(--md-on-surface-variant);">
              <div style="width:64px;height:64px;margin:0 auto 12px;border-radius:50%;background:hsl(var(--md-h,215) 80% 50% / .12);display:flex;align-items:center;justify-content:center;color:hsl(var(--md-h,215) 80% 62%);"><span style="display:flex;width:30px;height:30px;font-size:28px;">${ICONS.recorder}</span></div>
              <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);">还没有录音</div>
              <div style="font-size:12px;margin-top:5px;opacity:.8;">点上方麦克风按钮，开始第一段录音</div>
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

          <!-- 通用对话框（重命名 / 删除确认 / 权限诊断引导） -->
          <div id="recDialog" style="display:none;position:absolute;inset:0;z-index:80;background:rgba(0,0,0,.45);align-items:center;justify-content:center;padding:28px;">
            <div class="md3-card md3-card-elevated" style="width:100%;max-width:340px;padding:22px 20px 14px;">
              <div id="recDialogTitle" style="font-size:17px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;"></div>
              <div id="recDialogMsg" style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:10px;white-space:pre-wrap;display:none;line-height:1.6;"></div>
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
              var V = function() { return window.__vfs || null; }; // fix(P3): lazy resolution — module app instance is resident, a one-time capture of null never self-heals
              var DIR = '/recordings';
              var $ = function(id) { return document.getElementById(id); };

              var statusEl = $('recStatus'), statusTextEl = $('recStatusText'), timerEl = $('recTimer'), tenthEl = $('recTenth'),
                  barsEl = $('recBars'), btn = $('recBtn'), btnIcon = $('recBtnIcon'), hintEl = $('recHint'),
                  pauseBtn = $('recPauseBtn'), pauseIcon = $('recPauseIcon'),
                  micStateEl = $('recMicState'), micStateTextEl = $('recMicStateText');
              var listEl = $('recList'), emptyEl = $('recEmpty'), countEl = $('recCount');
              var shareSheet = $('recShareSheet'), shareTitle = $('recShareTitle'), shareTargets = $('recShareTargets');
              var dlgEl = $('recDialog'), dlgTitle = $('recDialogTitle'), dlgMsg = $('recDialogMsg'), dlgInput = $('recDialogInput');

              // ---------- 状态 ----------
              var recording = false;
              var rec = null, recStream = null, recMime = '', recChunks = [], recTimer = null, barsTimer = null, audioCtx = null, analyser = null;
              // v7.50 计时（0.1s 精度，暂停可续）：
              var recElapsedBase = 0;  // 已累计毫秒（暂停前）
              var recRunStart = 0;     // 本次连续运行起点（0 = 暂停/未开始）
              var recPaused = false;
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
              function elapsedMs() { return recElapsedBase + (recRunStart ? (Date.now() - recRunStart) : 0); }
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

              // ---------- v7.50 麦克风分层诊断 ----------
              // 应用内权限（permissions.js）只是第一层；浏览器站点权限（Permissions API）
              // 是第二层。两层都通才可能录上音 —— 此前用户在应用内点了「允许」，但浏览器
              // 层早在历史会话中拒绝过站点，getUserMedia 直接 NotAllowedError 且不再弹窗，
              // 表现即「权限都给了却录不了」。此处把第二层状态显式呈现 + 失败时给出
              // 可操作指引（点地址栏锁形图标 → 麦克风 → 允许）。
              function queryBrowserMic() {
                try {
                  if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve('unsupported');
                  return navigator.permissions.query({ name: 'microphone' })
                    .then(function (st) { return st && st.state ? st.state : 'unsupported'; })
                    .catch(function () { return 'unsupported'; });
                } catch (e) { return Promise.resolve('unsupported'); }
              }
              function setMicState(state) {
                // state: 'granted' | 'prompt' | 'denied' | 'unsupported' | 'insecure'
                micStateEl.classList.remove('is-ok', 'is-denied');
                if (state === 'granted') {
                  micStateEl.classList.add('is-ok');
                  micStateTextEl.textContent = '麦克风已就绪';
                } else if (state === 'denied') {
                  micStateEl.classList.add('is-denied');
                  micStateTextEl.textContent = '浏览器已拒绝麦克风 — 点地址栏锁形图标可恢复';
                } else if (state === 'insecure') {
                  micStateEl.classList.add('is-denied');
                  micStateTextEl.textContent = '当前页面非 HTTPS，浏览器禁止使用麦克风';
                } else if (state === 'prompt') {
                  micStateTextEl.textContent = '首次录音时浏览器会请求麦克风权限';
                } else {
                  micStateTextEl.textContent = '此环境不支持麦克风检测';
                }
              }
              function refreshMicState() {
                if (!window.isSecureContext) { setMicState('insecure'); return; }
                queryBrowserMic().then(setMicState);
              }
              var MIC_GUIDE = '恢复方法：\\n1. 点浏览器地址栏左侧的锁形/调音图标\\n2. 把「麦克风」权限改为「允许」\\n3. 回到这里再点一次录音按钮';
              function explainMicError(err) {
                var name = (err && err.name) || '';
                if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
                  setMicState('denied');
                  dlg({ title: '浏览器拦截了麦克风', msg: MIC_GUIDE });
                } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                  dlg({ title: '没有找到麦克风', msg: '这台设备似乎没有可用的麦克风设备（或已被系统禁用）。\\n接上麦克风后重试。' });
                } else if (name === 'NotReadableError' || name === 'TrackStartError') {
                  dlg({ title: '麦克风被占用', msg: '麦克风正被其他应用使用，请关闭占用麦克风的程序后重试。' });
                } else if (name === 'OverconstrainedError') {
                  toast('麦克风参数不受支持，请重试');
                } else if (name === 'AbortError') {
                  toast('麦克风启动被中断，请重试');
                } else {
                  toast('无法访问麦克风：' + (name || '未知错误'));
                }
              }

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
              function setBtnState(mode) {
                // mode: 'idle' | 'rec' | 'paused'
                btn.classList.toggle('recording', mode === 'rec');
                btn.classList.toggle('paused', mode === 'paused');
                btn.style.background = mode === 'idle' ? '' : '';
                btnIcon.innerHTML = mode === 'idle' ? '${ICONS.mic}' : '${ICONS.stop_record}';
                btn.title = mode === 'idle' ? '开始录音' : '停止并保存';
                pauseBtn.style.display = mode === 'idle' ? 'none' : 'inline-flex';
                pauseIcon.innerHTML = mode === 'paused' ? '${ICONS.play}' : '${ICONS.pause}';
                pauseBtn.title = mode === 'paused' ? '继续' : '暂停';
              }
              function setStatus(text, tone) {
                // tone: '' | 'rec' | 'paused' | 'ok'
                statusEl.classList.remove('is-rec', 'is-paused', 'is-ok');
                if (tone) statusEl.classList.add(tone === 'rec' ? 'is-rec' : (tone === 'paused' ? 'is-paused' : 'is-ok'));
                statusTextEl.textContent = text;
              }
              function renderTimer() {
                var ms = elapsedMs();
                var s = Math.floor(ms / 1000);
                timerEl.firstChild.nodeValue = fmtSec(s);
                tenthEl.textContent = '.' + Math.floor((ms % 1000) / 100);
              }
              function startTimerLoop() {
                if (recTimer) clearInterval(recTimer);
                recTimer = setInterval(renderTimer, 100);
                renderTimer();
              }
              function stopTimerLoop() {
                if (recTimer) { clearInterval(recTimer); recTimer = null; }
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
                        var h = 6 + Math.min(46, (avg / 255) * 52);
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
                // V().exists 为同步内存索引查询（vfs.js），不可用时直接用首名
                var Vv = V();
                while (Vv && Vv.exists && Vv.exists(dir + '/' + name)) {
                  name = base + ' (' + n + ')' + ext; n++;
                  if (n > 99) break;
                }
                return name;
              }

              function startRecording() {
                if (!V()) { toast('文件系统未就绪，无法保存录音'); return; }
                if (!window.isSecureContext || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || typeof MediaRecorder === 'undefined') {
                  dlg({ title: '当前环境不支持录音', msg: '录音需要 HTTPS 安全页面与浏览器 MediaRecorder 支持。\\n请通过 https:// 访问本站后重试。' });
                  return;
                }
                if (!window.__recorderMicGate || !window.__recorderMicGate()) {
                  toast('快速设置中「Mic access」已关闭，请先开启');
                  return;
                }
                Promise.resolve(window.__recorderPerm ? window.__recorderPerm() : false).then(function (ok) {
                  if (!ok) { toast('需要麦克风权限才能录音（设置 › 应用权限可改判）'); return; }
                  // v7.50 第二层预检：浏览器站点权限已明确拒绝 → 直接给指引，不再
                  // 让 getUserMedia 静默失败（用户「权限给了却录不了」的主场景）
                  queryBrowserMic().then(function (state) {
                    if (state === 'denied') { explainMicError({ name: 'NotAllowedError' }); return; }
                    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
                      recMime = pickMime();
                      try { rec = recMime ? new MediaRecorder(stream, { mimeType: recMime }) : new MediaRecorder(stream); }
                      catch (e) { rec = new MediaRecorder(stream); recMime = ''; }
                      if (!recMime) recMime = rec.mimeType || 'audio/webm';
                      recStream = stream;
                      recChunks = [];
                      recElapsedBase = 0; recRunStart = Date.now(); recPaused = false;
                      rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) recChunks.push(ev.data); };
                      rec.onstop = function () { saveRecording(); };
                      // fix(P3)：录制错误处理 —— 设备拔出/流中断时复位假死的录音会话
                      rec.onerror = function (ev) {
                        try { console.warn('MediaRecorder error:', ev && ev.error); } catch (_) {}
                        try { if (recStream) { recStream.getTracks().forEach(function (t) { t.stop(); }); } } catch (_) {}
                        recStream = null;
                        stopTimerLoop();
                        recording = false; recPaused = false;
                        recChunks = [];
                        setBtnState('idle');
                        setStatus('录音失败，请重试', '');
                        refreshMicState();
                      };
                      try { rec.start(250); } catch (e) { rec.start(); }
                      recording = true;
                      setBtnState('rec');
                      setStatus('录音中…', 'rec');
                      timerEl.firstChild.nodeValue = '00:00';
                      tenthEl.textContent = '.0';
                      startTimerLoop();
                      startBars(stream);
                      setMicState('granted');
                    }).catch(function (err) {
                      explainMicError(err);
                    });
                  });
                });
              }

              function togglePause() {
                if (!recording || !rec || recPaused === undefined) return;
                if (!recPaused) {
                  try { rec.pause(); } catch (e) { return; }
                  recPaused = true;
                  recElapsedBase += recRunStart ? (Date.now() - recRunStart) : 0;
                  recRunStart = 0;
                  stopTimerLoop();
                  btn.classList.add('paused');
                  setStatus('已暂停', 'paused');
                  setBtnState('paused');
                  barsEl.style.opacity = '0';
                } else {
                  try { rec.resume(); } catch (e) { return; }
                  recPaused = false;
                  recRunStart = Date.now();
                  startTimerLoop();
                  setStatus('录音中…', 'rec');
                  setBtnState('rec');
                  barsEl.style.opacity = '1';
                }
              }

              function stopRecording() {
                if (!recording || !rec) return;
                recording = false;
                stopTimerLoop();
                stopBars();
                setBtnState('idle');
                setStatus('保存中…', '');
                try { rec.stop(); } catch (e) { saveRecording(); }
              }

              function saveRecording() {
                var chunks = recChunks; recChunks = [];
                var sec = Math.max(1, Math.round(elapsedMs() / 1000));
                recElapsedBase = 0; recRunStart = 0; recPaused = false;
                if (recStream) { try { recStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} recStream = null; }
                if (!chunks.length) {
                  setStatus('就绪', '');
                  tenthEl.textContent = '.0';
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
                V().write(path, blob, { mime: (blob.type || 'audio/webm').split(';')[0], owner: 'recorder', meta: { duration: sec } })
                  .then(function (res) {
                    if (res && res.ok) { toast('已保存：' + name); setStatus('就绪', 'ok'); timerEl.firstChild.nodeValue = '00:00'; tenthEl.textContent = '.0'; }
                    else { setStatus('保存失败', ''); toast('保存失败：' + ((res && res.error) || '未知错误')); }
                  })
                  .catch(function () { setStatus('保存失败', ''); toast('保存失败'); });
              }

              btn.addEventListener('click', function () { recording && !recPaused ? stopRecording() : (recording && recPaused ? stopRecording() : startRecording()); });
              pauseBtn.addEventListener('click', togglePause);

              // ---------- 列表 ----------
              function rowHTML(e) {
                var meta = e.meta || {};
                var dur = meta.duration ? fmtSec(meta.duration) : '';
                var size = fmtBytes(e.size || 0);
                var isActive = playPath === e.path;
                return '<div class="md3-list-item" data-path="' + esc(e.path) + '" style="display:flex;align-items:center;gap:12px;padding:11px 14px;position:relative;' + (isActive ? 'background:hsl(var(--md-h,215) 80% 50% / .1);' : '') + '">'
                  + '<button class="md3-btn-tonal" data-act="play" title="播放" style="min-width:0;width:44px;height:44px;padding:0;border-radius:50%;flex:none;">' + (isActive && audio && !audio.paused ? '${ICONS.pause}' : '${ICONS.play}') + '</button>'
                  + '<div style="flex:1;min-width:0;">'
                  +   '<div style="font-size:14px;font-weight:600;color:var(--md-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(e.name) + '</div>'
                  +   '<div data-role="meta" style="font-size:11.5px;color:var(--md-on-surface-variant);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (dur ? '<span style="font-weight:600;">' + dur + '</span> · ' : '') + size + ' · ' + fmtDate(e.modified) + '</div>'
                  +   '<div class="rec-prog" data-role="prog" style="' + (isActive && audio ? '' : 'visibility:hidden;') + '"><span class="rec-prog-fill" data-role="progfill" style="width:' + (isActive && audio && audio.duration > 0 ? Math.min(100, (audio.currentTime / audio.duration) * 100).toFixed(1) : '0') + '%"></span></div>'
                  + '</div>'
                  + '<button class="md3-btn-tonal" data-act="share" title="分享" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${ICONS.quick_share}</button>'
                  + '<button class="md3-btn-tonal" data-act="rename" title="重命名" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${ICONS.edit}</button>'
                  + '<button class="md3-btn-tonal" data-act="del" title="删除" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${ICONS.delete_forever}</button>'
                  + '</div>';
              }

              function render() {
                if (!V() || !visible) return;
                Promise.resolve(V().list(DIR)).then(function (entries) {
                  var files = (entries || []).filter(function (e) { return e.type !== 'dir'; });
                  var total = 0;
                  for (var i = 0; i < files.length; i++) total += files[i].size || 0;
                  countEl.textContent = files.length ? (files.length + ' 段 · ' + fmtBytes(total)) : '';
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
                  var pr = playingRow.querySelector('[data-role="prog"]');
                  if (pr) pr.style.visibility = 'hidden';
                  var pf = playingRow.querySelector('[data-role="progfill"]');
                  if (pf) pf.style.width = '0%';
                  playingRow.style.background = '';
                }
                playingRow = null; playPath = null;
              }
              function togglePlay(path, row) {
                if (!V()) return;
                if (playPath === path && audio) {
                  if (audio.paused) { try { audio.play(); } catch (e) {} row.querySelector('[data-act="play"]').innerHTML = '${ICONS.pause}'; }
                  else { audio.pause(); row.querySelector('[data-act="play"]').innerHTML = '${ICONS.play}'; }
                  return;
                }
                stopPlayback();
                Promise.resolve(V().readURL(path)).then(function (url) {
                  if (!url) { toast('读取失败'); return; }
                  playPath = path; playingRow = row;
                  row.style.background = 'hsl(var(--md-h,215) 80% 50% / .1)';
                  row.querySelector('[data-act="play"]').innerHTML = '${ICONS.pause}';
                  var metaEl = row.querySelector('[data-role="meta"]');
                  var progEl = row.querySelector('[data-role="prog"]');
                  var fillEl = row.querySelector('[data-role="progfill"]');
                  if (progEl) progEl.style.visibility = 'visible';
                  if (metaEl) {
                    metaEl.setAttribute('data-plain', metaEl.textContent);
                    metaEl.textContent = '00:00 播放中…';
                  }
                  audio = audio || new Audio();
                  audio.src = url;
                  audio.onended = function () { stopPlayback(); };
                  audio.ontimeupdate = function () {
                    if (playPath !== path) return;
                    var total = null;
                    try {
                      var e = V().stat && V().stat(path);
                      if (e && e.meta && e.meta.duration) total = e.meta.duration;
                    } catch (err) {}
                    if (total == null && isFinite(audio.duration) && audio.duration > 0) total = audio.duration;
                    var cur = audio.currentTime || 0;
                    if (metaEl) metaEl.textContent = fmtSec(cur) + (total != null ? ' / ' + fmtSec(total) : '') + ' 播放中…';
                    if (fillEl && total) fillEl.style.width = Math.min(100, (cur / total) * 100).toFixed(1) + '%';
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
                    // fix(P3)：文件名合法性校验 —— 路径分隔符/上跳目录会把 move 目标
                    // 逃出 /recordings；控制字符一并拒绝
                    if (/[\\\\/]/.test(nn) || nn === '..' || nn === '.' || /[\\u0000-\\u001f]/.test(nn)) {
                      toast('名称不能包含 / 、.. 或控制字符');
                      return;
                    }
                    var newPath = DIR + '/' + nn + ext;
                    if (newPath === path) return;
                    Promise.resolve(V().move(path, newPath)).then(function (res) {
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
                    Promise.resolve(V().del(path)).then(function (res) {
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
                try { entry = V().stat && V().stat(path); } catch (err) {}
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
                recording = false; recPaused = false;
                recElapsedBase = 0; recRunStart = 0;
                stopTimerLoop();
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
              if (V() && V().subscribe) {
                var unVfs = V().subscribe(DIR, render);
                addCleanup('recorder', function() { try { unVfs(); } catch (err) {} });
              }
              bindDoc('recorder', 'app-page-active', function (e) {
                if (!e.detail || e.detail.appId !== 'recorder') return;
                visible = e.detail.pageIdx === 0;
                if (visible) { render(); refreshMicState(); }
              });
              visible = true;
              render();
              refreshMicState();
            })();
          </script>
        </div>
      `,
    },
  ],
};
