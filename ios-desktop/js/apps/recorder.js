import{ICONS as e}from"../icons.js";import"../app-icons.js";import{requestPermission as r}from"../permissions.js";import{getTileActive as a}from"../quick-settings.js";typeof window<"u"&&(window.__recorderPerm=function(){try{return Promise.resolve(r("microphone",{appId:"recorder",appName:"\u5F55\u97F3\u673A"})).then(function(t){return t===!0}).catch(function(){return!1})}catch{return Promise.resolve(!1)}},window.__recorderMicGate=function(){try{return a("mic_access")!==!1}catch{return!0}});import"../recorder-core.js";export default{id:"recorder",name:"\u5F55\u97F3\u673A",pages:[{title:"\u5F55\u97F3\u673A",content:`
        <div style="padding:16px 0 32px;position:relative;">
          <style>
            @keyframes recPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.055); } }
            /* v7.50 \u5F55\u5236\u94AE\u547C\u5438\u6D9F\u6F2A\u73AF\uFF08\u4EC5\u5F55\u97F3\u4E2D\uFF09 */
            .rec-main { position: relative; }
            .rec-main.recording::before,
            .rec-main.recording::after {
              content: ''; position: absolute; inset: -7px; border-radius: 50%;
              border: 2px solid rgba(229,72,77,.5); pointer-events: none;
              animation: recRing 1.7s ease-out infinite;
            }
            .rec-main.recording::after { animation-delay: .85s; }
            @keyframes recRing { 0% { transform: scale(.92); opacity: .75; } 100% { transform: scale(1.45); opacity: 0; } }
            /* v7.50 \u5706 \u2192 \u5706\u89D2\u65B9\u5F62\u5F62\u53D8\uFF08M3 expressive \u5F62\u72B6\u8BED\u8A00\uFF09 */
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
            /* \u72B6\u6001\u82AF\u7247 */
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
            /* \u9EA6\u514B\u98CE\u8BCA\u65AD\u82AF\u7247 */
            .rec-mic {
              display: inline-flex; align-items: center; gap: 5px;
              font-size: 11.5px; color: var(--md-on-surface-variant, #9a9ba3); opacity: .9;
            }
            .rec-mic .rec-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
            .rec-mic.is-denied { color: #E5484D; opacity: 1; }
            .rec-mic.is-ok { color: hsl(var(--md-h,215) 70% 58%); }
            /* \u64AD\u653E\u884C\u8FDB\u5EA6\u6761 */
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

          <!-- \u5F55\u97F3\u4E3B\u5361 -->
          <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:24px 18px 22px;text-align:center;background:linear-gradient(165deg, var(--md-surface-container-lowest, #202126), var(--md-surface-container-low, #26272e) 60%, var(--md-surface-container, #2a2b33));">
            <span id="recStatus" class="rec-chip"><span class="rec-dot"></span><span id="recStatusText">\u5C31\u7EEA</span></span>
            <div id="recTimer" style="font-size:52px;font-weight:700;color:var(--md-on-surface);font-variant-numeric:tabular-nums;letter-spacing:1px;margin:10px 0 6px;line-height:1.05;">00:00<span id="recTenth" style="font-size:24px;font-weight:600;color:var(--md-on-surface-variant);opacity:.8;">.0</span></div>
            <!-- \u7535\u5E73\u6761\uFF08\u5F55\u97F3\u4E2D\u7531 AnalyserNode \u9A71\u52A8\uFF0C\u955C\u50CF\u5C45\u4E2D\u5F0F\uFF09 -->
            <!-- v7.6\uFF1A\u663E\u9690\u6539\u7528 opacity \u800C\u975E visibility \u2014\u2014 visibility:visible \u662F\u552F\u4E00\u80FD\u51FB\u7A7F
                 \u7956\u5148 visibility:hidden \u7684\u5C5E\u6027\uFF0C\u6B64\u524D\u5173\u95ED\u5E94\u7528\u540E\u97F3\u6CE2\u6761\u4F1A\u7A7F\u900F\u9690\u85CF\u7684\u7A97\u53E3\u60AC\u6D6E\u5728\u684C\u9762\u4E0A -->
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
              <button id="recPauseBtn" title="\u6682\u505C" style="display:none;width:46px;height:46px;border-radius:50%;border:none;cursor:pointer;align-items:center;justify-content:center;background:var(--md-surface-container-high,#2a2b32);color:var(--md-on-surface);box-shadow:0 3px 12px rgba(0,0,0,.25);">
                <span id="recPauseIcon" style="display:flex;width:20px;height:20px;font-size:18px;">${e.pause}</span>
              </button>
              <button id="recBtn" class="rec-shape" title="\u5F00\u59CB\u5F55\u97F3">
                <span id="recBtnIcon" style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;font-size:32px;">${e.mic}</span>
              </button>
            </div>
            <div id="recHint" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:14px;opacity:.85;">\u5F55\u97F3\u4F1A\u4FDD\u5B58\u5230\u300C\u6587\u4EF6\u300D\u5E94\u7528\u7684 recordings \u76EE\u5F55</div>
            <div id="recMicState" class="rec-mic" style="margin-top:8px;justify-content:center;">
              <span id="recMicDotWrap" style="display:inline-flex;width:14px;height:14px;align-items:center;justify-content:center;flex:none;"><span class="rec-dot"></span></span><span id="recMicStateText">\u6B63\u5728\u68C0\u67E5\u9EA6\u514B\u98CE\u2026</span>
            </div>
          </div>

          <!-- \u5F55\u97F3\u5217\u8868 -->
          <div class="md3-card" style="padding:0;overflow:hidden;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 16px 9px;">
              <div style="font-size:14px;font-weight:700;color:var(--md-on-surface);">\u6211\u7684\u5F55\u97F3</div>
              <div id="recCount" style="font-size:12px;color:var(--md-on-surface-variant);"></div>
            </div>
            <div id="recList"></div>
            <div id="recEmpty" style="padding:38px 20px;text-align:center;color:var(--md-on-surface-variant);">
              <div style="width:64px;height:64px;margin:0 auto 12px;border-radius:50%;background:hsl(var(--md-h,215) 80% 50% / .12);display:flex;align-items:center;justify-content:center;color:hsl(var(--md-h,215) 80% 62%);"><span style="display:flex;width:30px;height:30px;font-size:28px;">${e.recorder}</span></div>
              <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);">\u8FD8\u6CA1\u6709\u5F55\u97F3</div>
              <div style="font-size:12px;margin-top:5px;opacity:.8;">\u70B9\u4E0A\u65B9\u9EA6\u514B\u98CE\u6309\u94AE\uFF0C\u5F00\u59CB\u7B2C\u4E00\u6BB5\u5F55\u97F3</div>
            </div>
          </div>

          <!-- \u5206\u4EAB\u9762\u677F -->
          <div id="recShareSheet" style="display:none;position:absolute;inset:0;z-index:70;background:rgba(0,0,0,.45);">
            <div style="position:absolute;left:0;right:0;bottom:0;background:var(--md-surface-container,#1e1e24);border-radius:24px 24px 0 0;padding:18px 16px 26px;">
              <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin:0 4px 12px;" id="recShareTitle">\u5206\u4EAB</div>
              <div id="recShareTargets"></div>
              <button class="md3-btn-tonal" id="recShareCancel" style="width:100%;margin-top:6px;">\u53D6\u6D88</button>
            </div>
          </div>

          <!-- \u901A\u7528\u5BF9\u8BDD\u6846\uFF08\u91CD\u547D\u540D / \u5220\u9664\u786E\u8BA4 / \u6743\u9650\u8BCA\u65AD\u5F15\u5BFC\uFF09 -->
          <div id="recDialog" style="display:none;position:absolute;inset:0;z-index:80;background:rgba(0,0,0,.45);align-items:center;justify-content:center;padding:28px;">
            <div class="md3-card md3-card-elevated" style="width:100%;max-width:340px;padding:22px 20px 14px;">
              <div id="recDialogTitle" style="font-size:17px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;"></div>
              <div id="recDialogMsg" style="font-size:13px;color:var(--md-on-surface-variant);margin-bottom:10px;white-space:pre-wrap;display:none;line-height:1.6;"></div>
              <input id="recDialogInput" type="text" style="width:100%;box-sizing:border-box;background:var(--md-surface-container-high,#2a2a32);border:1px solid var(--md-outline-variant);border-radius:12px;color:var(--md-on-surface);font-size:14px;padding:11px 12px;outline:none;display:none;" />
              <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:14px;">
                <button class="md3-btn-tonal" id="recDialogCancel">\u53D6\u6D88</button>
                <button class="md3-btn-filled" id="recDialogOk">\u786E\u5B9A</button>
              </div>
            </div>
          </div>

          <script>
            (function() {
              'use strict';
              var V = function() { return window.__vfs || null; }; // fix(P3): lazy resolution \u2014 module app instance is resident, a one-time capture of null never self-heals
              var DIR = '/recordings';
              var $ = function(id) { return document.getElementById(id); };

              var statusEl = $('recStatus'), statusTextEl = $('recStatusText'), timerEl = $('recTimer'), tenthEl = $('recTenth'),
                  barsEl = $('recBars'), btn = $('recBtn'), btnIcon = $('recBtnIcon'), hintEl = $('recHint'),
                  pauseBtn = $('recPauseBtn'), pauseIcon = $('recPauseIcon'),
                  micStateEl = $('recMicState'), micStateTextEl = $('recMicStateText'),
                  micDotWrapEl = $('recMicDotWrap');
              var listEl = $('recList'), emptyEl = $('recEmpty'), countEl = $('recCount');
              var shareSheet = $('recShareSheet'), shareTitle = $('recShareTitle'), shareTargets = $('recShareTargets');
              var dlgEl = $('recDialog'), dlgTitle = $('recDialogTitle'), dlgMsg = $('recDialogMsg'), dlgInput = $('recDialogInput');

              // ---------- \u72B6\u6001 ----------
              var recording = false;
              var rec = null, recStream = null, recMime = '', recChunks = [], recTimer = null, barsTimer = null, audioCtx = null, analyser = null;
              // v7.50 \u8BA1\u65F6\uFF080.1s \u7CBE\u5EA6\uFF0C\u6682\u505C\u53EF\u7EED\uFF09\uFF1A
              var recElapsedBase = 0;  // \u5DF2\u7D2F\u8BA1\u6BEB\u79D2\uFF08\u6682\u505C\u524D\uFF09
              var recRunStart = 0;     // \u672C\u6B21\u8FDE\u7EED\u8FD0\u884C\u8D77\u70B9\uFF080 = \u6682\u505C/\u672A\u5F00\u59CB\uFF09
              var recPaused = false;
              var audio = null, playPath = null, playingRow = null;
              var visible = true;
              var dlgResolve = null;

              // ---------- \u5C0F\u5DE5\u5177 ----------
              function esc(s) {
// v11.50 #240\uFF1A\u5355\u6E90\u59D4\u6258\u2014\u2014\u8F6C\u4E49\u5B9E\u73B0\u6536\u655B apps/_shared/sanitize.js escapeHtml\uFF08\u672C\u6587\u4EF6\u6B63\u5219\u94FE\u9000\u5F79\uFF0C\u8D1F\u5411\u951A tests/v240\uFF09
                return window.__mdEscape(s);
              }
              function toast(msg) {
                try { if (window.showSystemToast) window.showSystemToast(msg); } catch (e) {}
              }
              // v11.50 #286 \u7EED\uFF1ArecorderCore \u7EAF\u51FD\u6570\u6838\u6865\u6D88\u8D39\uFF08window.__recorderCore\uFF0Cfiles-core.js __fc \u5148\u4F8B\u540C\u5F8B\uFF09\u2014\u2014
              // fmtBytes/fmtSec/fmtDate/baseName/extOf \u4E94\u51FD\u6570\u771F\u8EAB\u5355\u6E90\u4E0A\u79FB js/recorder-core.js\uFF0C\u5185\u8054\u5B9A\u4E49\u9000\u5F79\uFF1B
              // esc \u7559 host\uFF08#240 __mdEscape \u5355\u6E90\u59D4\u6258\u5728\u6848\uFF0C\u8D1F\u5411\u951A tests/v240\uFF09\uFF1BelapsedMs \u5403\u8FD0\u884C\u6001\u7559 host\u3002
              var __rc = window.__recorderCore || {};
              var fmtBytes = __rc.fmtBytes, fmtSec = __rc.fmtSec, fmtDate = __rc.fmtDate;
              var baseName = __rc.baseName, extOf = __rc.extOf;
              function elapsedMs() { return recElapsedBase + (recRunStart ? (Date.now() - recRunStart) : 0); }
              function emit(event, payload) {
                // \u6A21\u5757\u5E94\u7528\u8FD0\u884C\u5728\u684C\u9762\u6587\u6863\u5185\uFF1A\u4E8B\u4EF6\u5FC5\u987B\u53D1\u7ED9\u684C\u9762\u603B\u7EBF\u6240\u5728\u7A97\u53E3\uFF08window \u81EA\u8EAB\uFF09\u3002
                // parent \u4EC5\u5728\u684C\u9762\u88AB\u6839\u58F3 iframe \u5305\u88F9\u65F6\u624D\u5B58\u5728\uFF0C\u58F3\u4E0D\u5904\u7406 BUS_EMIT\uFF0C\u53EA\u4F5C\u5197\u4F59\u515C\u5E95\u3002
                var msg = { type: 'BUS_EMIT', event: event, payload: payload, target: 'msg' };
                try { window.postMessage(msg, '*'); } catch (e) {}
                try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (e) {}
              }

              // ---------- \u901A\u7528\u5BF9\u8BDD\u6846\uFF08Promise \u98CE\u683C\uFF09 ----------
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

              // ---------- v7.50 \u9EA6\u514B\u98CE\u5206\u5C42\u8BCA\u65AD ----------
              // \u5E94\u7528\u5185\u6743\u9650\uFF08permissions.js\uFF09\u53EA\u662F\u7B2C\u4E00\u5C42\uFF1B\u6D4F\u89C8\u5668\u7AD9\u70B9\u6743\u9650\uFF08Permissions API\uFF09
              // \u662F\u7B2C\u4E8C\u5C42\u3002\u4E24\u5C42\u90FD\u901A\u624D\u53EF\u80FD\u5F55\u4E0A\u97F3 \u2014\u2014 \u6B64\u524D\u7528\u6237\u5728\u5E94\u7528\u5185\u70B9\u4E86\u300C\u5141\u8BB8\u300D\uFF0C\u4F46\u6D4F\u89C8\u5668
              // \u5C42\u65E9\u5728\u5386\u53F2\u4F1A\u8BDD\u4E2D\u62D2\u7EDD\u8FC7\u7AD9\u70B9\uFF0CgetUserMedia \u76F4\u63A5 NotAllowedError \u4E14\u4E0D\u518D\u5F39\u7A97\uFF0C
              // \u8868\u73B0\u5373\u300C\u6743\u9650\u90FD\u7ED9\u4E86\u5374\u5F55\u4E0D\u4E86\u300D\u3002\u6B64\u5904\u628A\u7B2C\u4E8C\u5C42\u72B6\u6001\u663E\u5F0F\u5448\u73B0 + \u5931\u8D25\u65F6\u7ED9\u51FA
              // \u53EF\u64CD\u4F5C\u6307\u5F15\uFF08\u70B9\u5730\u5740\u680F\u9501\u5F62\u56FE\u6807 \u2192 \u9EA6\u514B\u98CE \u2192 \u5141\u8BB8\uFF09\u3002
              function queryBrowserMic() {
                try {
                  if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve('unsupported');
                  return navigator.permissions.query({ name: 'microphone' })
                    .then(function (st) { return st && st.state ? st.state : 'unsupported'; })
                    .catch(function () { return 'unsupported'; });
                } catch (e) { return Promise.resolve('unsupported'); }
              }
              function setMicState(state) {
                // [v7.73] \u7ED3\u679C\u843D\u5730\uFF1A\u5378\u8F7D\u68C0\u67E5\u671F M3E loader\uFF0C\u6062\u590D\u539F\u8109\u51B2\u5706\u70B9
                if (micDotWrapEl) {
                  if (micDotWrapEl.__m3eInst && micDotWrapEl.__m3eInst.stop) micDotWrapEl.__m3eInst.stop();
                  micDotWrapEl.__m3eInst = null;
                  if (!micDotWrapEl.querySelector('.rec-dot')) {
                    micDotWrapEl.innerHTML = '<span class="rec-dot"></span>';
                  }
                }
                // state: 'granted' | 'prompt' | 'denied' | 'unsupported' | 'insecure'
                micStateEl.classList.remove('is-ok', 'is-denied');
                if (state === 'granted') {
                  micStateEl.classList.add('is-ok');
                  micStateTextEl.textContent = '\u9EA6\u514B\u98CE\u5DF2\u5C31\u7EEA';
                } else if (state === 'denied') {
                  micStateEl.classList.add('is-denied');
                  micStateTextEl.textContent = '\u6D4F\u89C8\u5668\u5DF2\u62D2\u7EDD\u9EA6\u514B\u98CE \u2014 \u70B9\u5730\u5740\u680F\u9501\u5F62\u56FE\u6807\u53EF\u6062\u590D';
                } else if (state === 'insecure') {
                  micStateEl.classList.add('is-denied');
                  micStateTextEl.textContent = '\u5F53\u524D\u9875\u9762\u975E HTTPS\uFF0C\u6D4F\u89C8\u5668\u7981\u6B62\u4F7F\u7528\u9EA6\u514B\u98CE';
                } else if (state === 'prompt') {
                  micStateTextEl.textContent = '\u9996\u6B21\u5F55\u97F3\u65F6\u6D4F\u89C8\u5668\u4F1A\u8BF7\u6C42\u9EA6\u514B\u98CE\u6743\u9650';
                } else {
                  micStateTextEl.textContent = '\u6B64\u73AF\u5883\u4E0D\u652F\u6301\u9EA6\u514B\u98CE\u68C0\u6D4B';
                }
              }
              function refreshMicState() {
                // [v7.73] \u68C0\u67E5\u671F\uFF08\u5F02\u6B65 permissions.query \u5F80\u8FD4\uFF09\u6302 M3E LoadingIndicator \u5C0F\u5F84
                if (micDotWrapEl && window.__m3eLoader && !micDotWrapEl.__m3eInst) {
                  micDotWrapEl.__m3eInst = window.__m3eLoader.mount(micDotWrapEl, { size: 12 });
                  var dot = micDotWrapEl.querySelector('.rec-dot');
                  if (dot) dot.style.display = 'none';
                }
                if (!window.isSecureContext) { setMicState('insecure'); return; }
                queryBrowserMic().then(setMicState);
              }
              var MIC_GUIDE = '\u6062\u590D\u65B9\u6CD5\uFF1A\\n1. \u70B9\u6D4F\u89C8\u5668\u5730\u5740\u680F\u5DE6\u4FA7\u7684\u9501\u5F62/\u8C03\u97F3\u56FE\u6807\\n2. \u628A\u300C\u9EA6\u514B\u98CE\u300D\u6743\u9650\u6539\u4E3A\u300C\u5141\u8BB8\u300D\\n3. \u56DE\u5230\u8FD9\u91CC\u518D\u70B9\u4E00\u6B21\u5F55\u97F3\u6309\u94AE';
              function explainMicError(err) {
                var name = (err && err.name) || '';
                if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
                  setMicState('denied');
                  dlg({ title: '\u6D4F\u89C8\u5668\u62E6\u622A\u4E86\u9EA6\u514B\u98CE', msg: MIC_GUIDE });
                } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                  dlg({ title: '\u6CA1\u6709\u627E\u5230\u9EA6\u514B\u98CE', msg: '\u8FD9\u53F0\u8BBE\u5907\u4F3C\u4E4E\u6CA1\u6709\u53EF\u7528\u7684\u9EA6\u514B\u98CE\u8BBE\u5907\uFF08\u6216\u5DF2\u88AB\u7CFB\u7EDF\u7981\u7528\uFF09\u3002\\n\u63A5\u4E0A\u9EA6\u514B\u98CE\u540E\u91CD\u8BD5\u3002' });
                } else if (name === 'NotReadableError' || name === 'TrackStartError') {
                  dlg({ title: '\u9EA6\u514B\u98CE\u88AB\u5360\u7528', msg: '\u9EA6\u514B\u98CE\u6B63\u88AB\u5176\u4ED6\u5E94\u7528\u4F7F\u7528\uFF0C\u8BF7\u5173\u95ED\u5360\u7528\u9EA6\u514B\u98CE\u7684\u7A0B\u5E8F\u540E\u91CD\u8BD5\u3002' });
                } else if (name === 'OverconstrainedError') {
                  toast('\u9EA6\u514B\u98CE\u53C2\u6570\u4E0D\u53D7\u652F\u6301\uFF0C\u8BF7\u91CD\u8BD5');
                } else if (name === 'AbortError') {
                  toast('\u9EA6\u514B\u98CE\u542F\u52A8\u88AB\u4E2D\u65AD\uFF0C\u8BF7\u91CD\u8BD5');
                } else {
                  toast('\u65E0\u6CD5\u8BBF\u95EE\u9EA6\u514B\u98CE\uFF1A' + (name || '\u672A\u77E5\u9519\u8BEF'));
                }
              }

              // ---------- \u5F55\u97F3\u4E3B\u6D41\u7A0B ----------
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
                btnIcon.innerHTML = mode === 'idle' ? '${e.mic}' : '${e.stop_record}';
                btn.title = mode === 'idle' ? '\u5F00\u59CB\u5F55\u97F3' : '\u505C\u6B62\u5E76\u4FDD\u5B58';
                pauseBtn.style.display = mode === 'idle' ? 'none' : 'inline-flex';
                pauseIcon.innerHTML = mode === 'paused' ? '${e.play}' : '${e.pause}';
                pauseBtn.title = mode === 'paused' ? '\u7EE7\u7EED' : '\u6682\u505C';
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
                // V().exists \u4E3A\u540C\u6B65\u5185\u5B58\u7D22\u5F15\u67E5\u8BE2\uFF08vfs.js\uFF09\uFF0C\u4E0D\u53EF\u7528\u65F6\u76F4\u63A5\u7528\u9996\u540D
                var Vv = V();
                while (Vv && Vv.exists && Vv.exists(dir + '/' + name)) {
                  name = base + ' (' + n + ')' + ext; n++;
                  if (n > 99) break;
                }
                return name;
              }

              function startRecording() {
                if (!V()) { toast('\u6587\u4EF6\u7CFB\u7EDF\u672A\u5C31\u7EEA\uFF0C\u65E0\u6CD5\u4FDD\u5B58\u5F55\u97F3'); return; }
                if (!window.isSecureContext || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || typeof MediaRecorder === 'undefined') {
                  dlg({ title: '\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u5F55\u97F3', msg: '\u5F55\u97F3\u9700\u8981 HTTPS \u5B89\u5168\u9875\u9762\u4E0E\u6D4F\u89C8\u5668 MediaRecorder \u652F\u6301\u3002\\n\u8BF7\u901A\u8FC7 https:// \u8BBF\u95EE\u672C\u7AD9\u540E\u91CD\u8BD5\u3002' });
                  return;
                }
                if (!window.__recorderMicGate || !window.__recorderMicGate()) {
                  toast('\u5FEB\u901F\u8BBE\u7F6E\u4E2D\u300CMic access\u300D\u5DF2\u5173\u95ED\uFF0C\u8BF7\u5148\u5F00\u542F');
                  return;
                }
                Promise.resolve(window.__recorderPerm ? window.__recorderPerm() : false).then(function (ok) {
                  if (!ok) { toast('\u9700\u8981\u9EA6\u514B\u98CE\u6743\u9650\u624D\u80FD\u5F55\u97F3\uFF08\u8BBE\u7F6E \u203A \u5E94\u7528\u6743\u9650\u53EF\u6539\u5224\uFF09'); return; }
                  // v7.50 \u7B2C\u4E8C\u5C42\u9884\u68C0\uFF1A\u6D4F\u89C8\u5668\u7AD9\u70B9\u6743\u9650\u5DF2\u660E\u786E\u62D2\u7EDD \u2192 \u76F4\u63A5\u7ED9\u6307\u5F15\uFF0C\u4E0D\u518D
                  // \u8BA9 getUserMedia \u9759\u9ED8\u5931\u8D25\uFF08\u7528\u6237\u300C\u6743\u9650\u7ED9\u4E86\u5374\u5F55\u4E0D\u4E86\u300D\u7684\u4E3B\u573A\u666F\uFF09
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
                      // fix(P3)\uFF1A\u5F55\u5236\u9519\u8BEF\u5904\u7406 \u2014\u2014 \u8BBE\u5907\u62D4\u51FA/\u6D41\u4E2D\u65AD\u65F6\u590D\u4F4D\u5047\u6B7B\u7684\u5F55\u97F3\u4F1A\u8BDD
                      rec.onerror = function (ev) {
                        try { console.warn('MediaRecorder error:', ev && ev.error); } catch (_) {}
                        try { if (recStream) { recStream.getTracks().forEach(function (t) { t.stop(); }); } } catch (_) {}
                        recStream = null;
                        stopTimerLoop();
                        recording = false; recPaused = false;
                        recChunks = [];
                        setBtnState('idle');
                        setStatus('\u5F55\u97F3\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5', '');
                        refreshMicState();
                      };
                      try { rec.start(250); } catch (e) { rec.start(); }
                      recording = true;
                      setBtnState('rec');
                      setStatus('\u5F55\u97F3\u4E2D\u2026', 'rec');
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
                  setStatus('\u5DF2\u6682\u505C', 'paused');
                  setBtnState('paused');
                  barsEl.style.opacity = '0';
                } else {
                  try { rec.resume(); } catch (e) { return; }
                  recPaused = false;
                  recRunStart = Date.now();
                  startTimerLoop();
                  setStatus('\u5F55\u97F3\u4E2D\u2026', 'rec');
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
                setStatus('\u4FDD\u5B58\u4E2D\u2026', '');
                try { rec.stop(); } catch (e) { saveRecording(); }
              }

              function saveRecording() {
                var chunks = recChunks; recChunks = [];
                var sec = Math.max(1, Math.round(elapsedMs() / 1000));
                recElapsedBase = 0; recRunStart = 0; recPaused = false;
                if (recStream) { try { recStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} recStream = null; }
                if (!chunks.length) {
                  setStatus('\u5C31\u7EEA', '');
                  tenthEl.textContent = '.0';
                  toast('\u6CA1\u6709\u5F55\u5230\u5185\u5BB9');
                  return;
                }
                var blob = new Blob(chunks, { type: recMime || 'audio/webm' });
                var ts = new Date();
                var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
                var base = '\u5F55\u97F3 ' + pad(ts.getMonth() + 1) + pad(ts.getDate()) + '-' + pad(ts.getHours()) + pad(ts.getMinutes()) + pad(ts.getSeconds());
                var ext = mimeExt(recMime || blob.type || '');
                var name = uniqueName(DIR, base, ext);
                var path = DIR + '/' + name;
                V().write(path, blob, { mime: (blob.type || 'audio/webm').split(';')[0], owner: 'recorder', meta: { duration: sec } })
                  .then(function (res) {
                    if (res && res.ok) { toast('\u5DF2\u4FDD\u5B58\uFF1A' + name); setStatus('\u5C31\u7EEA', 'ok'); timerEl.firstChild.nodeValue = '00:00'; tenthEl.textContent = '.0'; }
                    else { setStatus('\u4FDD\u5B58\u5931\u8D25', ''); toast('\u4FDD\u5B58\u5931\u8D25\uFF1A' + ((res && res.error) || '\u672A\u77E5\u9519\u8BEF')); }
                  })
                  .catch(function () { setStatus('\u4FDD\u5B58\u5931\u8D25', ''); toast('\u4FDD\u5B58\u5931\u8D25'); });
              }

              btn.addEventListener('click', function () { recording && !recPaused ? stopRecording() : (recording && recPaused ? stopRecording() : startRecording()); });
              pauseBtn.addEventListener('click', togglePause);

              // ---------- \u5217\u8868 ----------
              function rowHTML(e) {
                var meta = e.meta || {};
                var dur = meta.duration ? fmtSec(meta.duration) : '';
                var size = fmtBytes(e.size || 0);
                var isActive = playPath === e.path;
                return '<div class="md3-list-item" data-path="' + esc(e.path) + '" style="display:flex;align-items:center;gap:12px;padding:11px 14px;position:relative;' + (isActive ? 'background:hsl(var(--md-h,215) 80% 50% / .1);' : '') + '">'
                  + '<button class="md3-btn-tonal" data-act="play" title="\u64AD\u653E" style="min-width:0;width:44px;height:44px;padding:0;border-radius:50%;flex:none;">' + (isActive && audio && !audio.paused ? '${e.pause}' : '${e.play}') + '</button>'
                  + '<div style="flex:1;min-width:0;">'
                  +   '<div style="font-size:14px;font-weight:600;color:var(--md-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(e.name) + '</div>'
                  +   '<div data-role="meta" style="font-size:11.5px;color:var(--md-on-surface-variant);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (dur ? '<span style="font-weight:600;">' + dur + '</span> \xB7 ' : '') + size + ' \xB7 ' + fmtDate(e.modified) + '</div>'
                  +   '<div class="rec-prog" data-role="prog" style="' + (isActive && audio ? '' : 'visibility:hidden;') + '"><span class="rec-prog-fill" data-role="progfill" style="width:' + (isActive && audio && audio.duration > 0 ? Math.min(100, (audio.currentTime / audio.duration) * 100).toFixed(1) : '0') + '%"></span></div>'
                  + '</div>'
                  + '<button class="md3-btn-tonal" data-act="share" title="\u5206\u4EAB" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${e.quick_share}</button>'
                  + '<button class="md3-btn-tonal" data-act="rename" title="\u91CD\u547D\u540D" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${e.edit}</button>'
                  + '<button class="md3-btn-tonal" data-act="del" title="\u5220\u9664" style="min-width:0;width:36px;height:36px;padding:0;border-radius:50%;flex:none;">${e.delete_forever}</button>'
                  + '</div>';
              }

              function render() {
                if (!V() || !visible) return;
                Promise.resolve(V().list(DIR)).then(function (entries) {
                  var files = (entries || []).filter(function (e) { return e.type !== 'dir'; });
                  var total = 0;
                  for (var i = 0; i < files.length; i++) total += files[i].size || 0;
                  countEl.textContent = files.length ? (files.length + ' \u6BB5 \xB7 ' + fmtBytes(total)) : '';
                  emptyEl.style.display = files.length ? 'none' : 'block';
                  listEl.innerHTML = files.map(rowHTML).join('');
                }).catch(function () {});
              }

              // \u4E8B\u4EF6\u59D4\u6258\uFF1A\u5217\u8868\u5185\u6240\u6709\u70B9\u51FB\uFF08\u64AD\u653E/\u5206\u4EAB/\u91CD\u547D\u540D/\u5220\u9664\uFF09
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

              // ---------- \u64AD\u653E ----------
              function stopPlayback() {
                if (audio) { try { audio.pause(); } catch (e) {} }
                if (playingRow) {
                  var m = playingRow.querySelector('[data-role="meta"]');
                  if (m && m.getAttribute('data-plain')) m.textContent = m.getAttribute('data-plain');
                  var pb = playingRow.querySelector('[data-act="play"]');
                  if (pb) pb.innerHTML = '${e.play}';
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
                  if (audio.paused) { try { audio.play(); } catch (e) {} row.querySelector('[data-act="play"]').innerHTML = '${e.pause}'; }
                  else { audio.pause(); row.querySelector('[data-act="play"]').innerHTML = '${e.play}'; }
                  return;
                }
                stopPlayback();
                Promise.resolve(V().readURL(path)).then(function (url) {
                  if (!url) { toast('\u8BFB\u53D6\u5931\u8D25'); return; }
                  playPath = path; playingRow = row;
                  row.style.background = 'hsl(var(--md-h,215) 80% 50% / .1)';
                  row.querySelector('[data-act="play"]').innerHTML = '${e.pause}';
                  var metaEl = row.querySelector('[data-role="meta"]');
                  var progEl = row.querySelector('[data-role="prog"]');
                  var fillEl = row.querySelector('[data-role="progfill"]');
                  if (progEl) progEl.style.visibility = 'visible';
                  if (metaEl) {
                    metaEl.setAttribute('data-plain', metaEl.textContent);
                    metaEl.textContent = '00:00 \u64AD\u653E\u4E2D\u2026';
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
                    if (metaEl) metaEl.textContent = fmtSec(cur) + (total != null ? ' / ' + fmtSec(total) : '') + ' \u64AD\u653E\u4E2D\u2026';
                    if (fillEl && total) fillEl.style.width = Math.min(100, (cur / total) * 100).toFixed(1) + '%';
                  };
                  audio.play().catch(function () { toast('\u64AD\u653E\u5931\u8D25'); });
                }).catch(function () { toast('\u8BFB\u53D6\u5931\u8D25'); });
              }

              // ---------- \u91CD\u547D\u540D / \u5220\u9664 ----------
              function doRename(path) {
                var name = baseName(path);
                var ext = extOf(name);
                dlg({ title: '\u91CD\u547D\u540D\u5F55\u97F3', input: true, value: name.slice(0, name.length - ext.length) })
                  .then(function (val) {
                    if (val == null) return;
                    var nn = String(val).trim();
                    if (!nn) { toast('\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A'); return; }
                    // fix(P3)\uFF1A\u6587\u4EF6\u540D\u5408\u6CD5\u6027\u6821\u9A8C \u2014\u2014 \u8DEF\u5F84\u5206\u9694\u7B26/\u4E0A\u8DF3\u76EE\u5F55\u4F1A\u628A move \u76EE\u6807
                    // \u9003\u51FA /recordings\uFF1B\u63A7\u5236\u5B57\u7B26\u4E00\u5E76\u62D2\u7EDD
                    if (/[\\\\/]/.test(nn) || nn === '..' || nn === '.' || /[\\u0000-\\u001f]/.test(nn)) {
                      toast('\u540D\u79F0\u4E0D\u80FD\u5305\u542B / \u3001.. \u6216\u63A7\u5236\u5B57\u7B26');
                      return;
                    }
                    var newPath = DIR + '/' + nn + ext;
                    if (newPath === path) return;
                    Promise.resolve(V().move(path, newPath)).then(function (res) {
                      if (res && res.ok) toast('\u5DF2\u91CD\u547D\u540D');
                      else toast('\u91CD\u547D\u540D\u5931\u8D25\uFF1A' + ((res && res.error) || '\u76EE\u6807\u53EF\u80FD\u5DF2\u5B58\u5728'));
                    }).catch(function () { toast('\u91CD\u547D\u540D\u5931\u8D25'); });
                  });
              }
              function doDelete(path) {
                dlg({ title: '\u5220\u9664\u5F55\u97F3', msg: '\u300C' + baseName(path) + '\u300D\u5C06\u88AB\u5220\u9664\uFF0C\u4E14\u65E0\u6CD5\u6062\u590D\u3002' })
                  .then(function (ok) {
                    if (!ok) return;
                    if (playPath === path) stopPlayback();
                    Promise.resolve(V().del(path)).then(function (res) {
                      if (res && res.ok) toast('\u5DF2\u5220\u9664');
                      else toast('\u5220\u9664\u5931\u8D25');
                    }).catch(function () { toast('\u5220\u9664\u5931\u8D25'); });
                  });
              }

              // ---------- \u5206\u4EAB ----------
              function openShare(path) {
                shareTitle.textContent = '\u5206\u4EAB\u300C' + baseName(path) + '\u300D';
                shareTargets.innerHTML = '<button class="md3-list-item" data-share="msg" style="width:100%;"><div class="md3-list-item-icon">${e.chat}</div><div class="md3-list-item-text">\u53D1\u9001\u5230 \u4FE1\u606F</div></button>';
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
                var dur = entry && entry.meta && entry.meta.duration ? ' \xB7 ' + fmtSec(entry.meta.duration) : '';
                emit('files/share', {
                  name: baseName(path),
                  text: '\uFF08\u8BED\u97F3\u5F55\u97F3\uFF09' + baseName(path) + dur,
                  noti: { title: '\u5F55\u97F3\u5206\u4EAB\u5230\u4FE1\u606F', desc: baseName(path) },
                });
                toast('\u5DF2\u53D1\u9001\u5230\u4FE1\u606F');
              });

              // ---------- \u5F55\u97F3\u4F1A\u8BDD\u5F3A\u5236\u91CA\u653E\uFF08\u5B9E\u4F8B\u9500\u6BC1\u515C\u5E95\uFF09 ----------
              // fix(audit-E): \u5F55\u97F3\u4E2D\u5B9E\u4F8B\u88AB\u9500\u6BC1\uFF08\u591A\u4EFB\u52A1\u4E0A\u6ED1\u6ED1\u8D70 / \u9000\u51FA\u5206\u5C4F / \u6E05\u7A7A\u540E\u53F0\uFF09\u65F6
              // \u6B64\u524D\u96F6\u6E05\u7406 \u2014\u2014 MediaRecorder/MediaStream/recTimer/barsTimer/AudioContext/recChunks
              // \u95ED\u5305\u5168\u90E8\u5B58\u6D3B\uFF1A\u9EA6\u514B\u98CE\u88AB\u6301\u7EED\u5360\u7528\u3001recChunks \u65E0\u9650\u589E\u957F\u3001\u91CD\u5F00\u5E94\u7528\u505C\u4E0D\u6389\u65E7\u4F1A\u8BDD\u3002
              // \u767B\u8BB0\u8FDB __addAppCleanup\uFF08page-stack \u7684 releaseAppListeners \u96C6\u4E2D\u6267\u884C\uFF09\uFF1A
              // \u4E0A\u6ED1\u9500\u6BC1\uFF08destroyAppInstance \u2192 releaseAppListeners\uFF09\u4E0E\u5206\u5C4F\u9000\u51FA
              // \uFF08split-screen finishClose \u2192 releaseAppListeners\uFF09\u4E24\u6761\u8DEF\u5F84\u90FD\u88AB\u8986\u76D6\uFF0C\u65E0\u9700
              // \u518D\u76D1\u542C app-instance-destroyed\uFF08\u8BE5\u4E8B\u4EF6\u540C\u6837\u6D3E\u53D1\u81EA releaseAppListeners \u4E4B\u540E\uFF09\u3002
              // \u5E42\u7B49\u8BBE\u8BA1\uFF1A\u91CD\u590D\u6E05\u7406\u65E0\u5BB3\uFF08rec/recStream/timers \u7F6E\u7A7A\u540E\u518D\u5165\u76F4\u63A5\u77ED\u8DEF\uFF09\u3002
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
                  // \u5B9E\u4F8B\u5DF2\u9500\u6BC1\uFF1A\u4FDD\u5B58 UI \u4E0D\u5728\u573A\uFF0Constop \u5185\u53EA\u91CA\u653E stream \u8F68\u9053\uFF08\u4E22\u5F03\u672A\u4FDD\u5B58\u5206\u7247\uFF09
                  try {
                    r.onstop = function () {
                      if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (err) {} }
                    };
                    r.stop();
                    return;
                  } catch (err) { /* stop \u5931\u8D25 \u2192 \u515C\u5E95\u76F4\u63A5\u505C\u8F68\u9053 */ }
                }
                if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (err) {} }
              }

              // ---------- VFS \u8BA2\u9605 + \u9875\u9762\u6FC0\u6D3B ----------
              // \u76D1\u542C/\u8BA2\u9605\u7EDF\u4E00\u767B\u8BB0\uFF1A\u5B9E\u4F8B\u9500\u6BC1\u65F6\u7531 page-stack \u96C6\u4E2D\u9000\u8BA2\uFF08\u9632\u91CD\u5EFA\u7D2F\u79EF\u6CC4\u6F0F\uFF09
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
          <\/script>
        </div>
      `}]};
