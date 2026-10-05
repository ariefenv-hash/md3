// ==================== settings.js — 设置 (Material Design 3 + Expressive Sliders) ====================
//
// 批次二「真设置」升级：
//   - 声音与震动（页 4）：接入 sound-haptics.js 真实开关（WebAudio 合成音效 /
//     触感全局门控）与音效音量；媒体音量真实联动 media-service；
//   - 应用管理（页 6）：全部应用一览 + 卸载/恢复（复用 removeAppFromDesktop /
//     restoreApp 链路，经 postMessage 桥接桌面）；
//   - 存储空间占用（页 7）：storage-stats.js 逐键统计 + IDB 配额 + 按应用归属聚合；
//   - 开发者选项（页 8）：FPS 悬浮层 / 禁用动画 / 重置桌面布局 / 清空全部数据；
//   - 多模式（页 9）：工作 / 个人模式一键切换（profiles.js 快照 + 连贯动画）。

import { ICONS } from '../icons.js';
import { getAppIconSVG } from '../app-icons.js';
// 副作用导入：加载即自注册 window.__dataBackup，供下方「备份与恢复」分组调用
import '../data-backup.js';
import { mediaService } from '../media-service.js';
import { getBatteryState, subscribeBattery, estimateDischargeSeconds, estimateChargeSeconds, formatDuration, formatPerPct, isSimEngineActive, getSimCharging, setSimCharging } from '../battery-service.js';
// fix(audit-E): 显示页「暗黑色彩方案」接真值 —— 直接引入 theme-mode 单一真源
import { getResolvedTheme, setThemeMode } from '../theme-mode.js';
// fix(audit-E): 应用管理页卸载文件夹成员需要操作 state.pagesApps 内 folder.apps
// 并重渲染桌面（folder.js 的解散语义 + desktop.js 的重渲染，与拖出文件夹同链路）
import { state as desktopState, savePagesApps } from '../state.js';
import { dissolveFolderIfSingle } from '../folder.js';
import { renderDesktopPages } from '../desktop.js';
// v7.43: 双段轨道几何改 clip-path 裁剪（纯函数模块，tests/slider-geom.test.js 守护）
import { sliderClipPaths } from '../slider-geom.js';

// 设置页内联 <script> 无法访问模块作用域，经 window 桥接媒体音量与本地图标：
// 卸载/恢复、权限管理等界面的应用图标统一走 app-icons.js 本地 SVG（与桌面同源），
// 不再读取 app.iconUrl 遗留网络图（v7.4 图标本地化）
if (typeof window !== 'undefined') {
  // fix(audit-E): 媒体音量读取桥 —— 声音页滑杆每次激活时回同步当前真值（此前只回同步了系统音效）
  window.__settingsMedia = {
    setVolume: (v) => mediaService.setVolume(v),
    getVolume: () => mediaService.getState().volume,
  };
  window.__getAppIconSVG = getAppIconSVG;
  // fix(audit-E): 显示页暗黑开关 ↔ theme-mode 单一真源（与快捷设置深色磁贴/主题面板同源）
  window.__settingsTheme = {
    resolved: () => getResolvedTheme(),
    set: (m) => setThemeMode(m),
  };
  // v7.39 参考版精细化 —— Android 原生「24px 厚双段轨道 + 6×60 竖柄药丸」几何：
  //   fill  激活段 [0, thumbX-GAP]     全宽基数 + clip-path 裁剪（v7.43，原 scaleX）
  //   line  未激活段 [thumbX+GAP, w]   全宽基数 + clip-path 裁剪（v7.43，原 scaleX）
  //   thumb 竖柄中心 translateX(thumbX)，GAP=10px 手柄两侧物理断开间隙
  //   刻度点：激活段 on-primary / 未激活段主色，|x-thumbX|<=GAP+3 隐没；
  //   末端停止点：手柄逼近右端（进入间隙区前）隐没。
  //   v7.43 修「手柄移动时两端圆角退化直至消失」：scaleX 会把 12px 半圆端帽压成
  //   椭圆（水平半径=12×scaleX），段越短越扁；改 clip-path: inset(round) 裁剪后
  //   圆角写在裁剪形状上与段长无关，任意位置均完美半圆。clip-path 同为零 layout
  //   属性（合成层仅更新裁剪，纹理缓存不重光栅），v7.38 同帧纪律不变。
  //   pressed 参数保留兼容旧调用点，v7.39 移除按压 scaleY（Android 原生竖柄拖拽无形变）。
  if (!window.__md3SliderSet) {
    var MD3_SLIDER_GAP = 10;
    window.__md3SliderSet = function (root, fill, thumb, p, pressed) {
      if (!fill) return;
      var w = (root && root.clientWidth) || 0;
      if (w <= 0) return; // 隐藏/零宽（如子页未激活）时跳过，可见后由 ResizeObserver 重绘
      var x = Math.max(0, Math.min(1, p)) * w;
      var clips = sliderClipPaths(w, x, MD3_SLIDER_GAP);
      fill.style.width = ''; // 类级 width:100% 接管（清掉历史内联 px/calc）
      fill.style.transform = 'translateY(-50%)';
      fill.style.clipPath = clips.fill;
      var line = root._md3Line;
      if (line === undefined) line = root._md3Line = root.querySelector('.md3-slider-line');
      if (line) {
        line.style.transform = 'translateY(-50%)';
        line.style.clipPath = clips.line;
      }
      if (thumb) {
        thumb.style.left = ''; // 类级 left:0 接管（清掉历史内联 %）
        thumb.style.transform = 'translateX(' + x.toFixed(1) + 'px) translate(-50%,-50%)';
      }
      // 刻度点激活/隐没（有级滑杆；ticks 层 left/right 各 2px）
      var dots = root._md3Dots;
      if (dots === undefined) dots = root._md3Dots = Array.prototype.slice.call(root.querySelectorAll('.m3-slider-dot'));
      if (dots.length) {
        var span = w - 4;
        var act = -1;
        for (var i = 0; i < dots.length; i++) {
          var dx = 2 + (dots.length === 1 ? span / 2 : i * span / (dots.length - 1));
          if (Math.abs(dx - x) <= MD3_SLIDER_GAP + 3) {
            dots[i].classList.add('is-hidden');
          } else {
            dots[i].classList.remove('is-hidden');
            if (dx < x) act = i;
          }
        }
        for (var j = 0; j < dots.length; j++) dots[j].classList.toggle('is-active', j <= act);
      }
      // 末端停止点（无级滑杆）：停止点不再完整落在未激活段上（进入右侧间隙区）即隐没
      var stop = root._md3Stop;
      if (stop === undefined) stop = root._md3Stop = root.querySelector('.m3-slider-stop-dot');
      if (stop) stop.classList.toggle('is-hidden', x > w * 0.98 - MD3_SLIDER_GAP - 4);
    };
  }
  // v7.38：滑杆 root 尺寸/可见性变化（子页激活、分屏、窗口缩放）→ 按当前值
  // 重绘（thumb 的 translateX 像素基准需跟新轨道宽）；同一 root 幂等挂载
  if (!window.__md3SliderWatch && window.ResizeObserver) {
    window.__md3SliderWatch = function (root, repaint) {
      if (!root || root._md3SliderWatched) return;
      root._md3SliderWatched = true;
      new ResizeObserver(function () {
        if (root.isConnected && root.clientWidth > 0) repaint();
      }).observe(root);
    };
  }
  // fix(audit-E): 卸载文件夹成员 —— main.js 的 uninstall-app 只扫 pagesApps 顶层，
  // 文件夹内应用永不被命中；此桥直接对 folder.apps 操作（入 removedApps + 单成员/空
  // 文件夹自动解散 + 持久化 + 重渲染桌面），返回是否命中（未命中则回落原 postMessage 链路）
  window.__settingsFolderUninstall = function (appId) {
    try {
      for (const page of desktopState.pagesApps) {
        if (!Array.isArray(page)) continue;
        for (const item of page) {
          if (!item || item.type !== 'folder' || !Array.isArray(item.apps)) continue;
          const mIdx = item.apps.findIndex((m) => m && m.id === appId);
          if (mIdx === -1) continue;
          const member = item.apps.splice(mIdx, 1)[0];
          if (!desktopState.removedApps) desktopState.removedApps = [];
          desktopState.removedApps.push(member);
          try {
            localStorage.setItem('ios-desktop:removed-apps', JSON.stringify(desktopState.removedApps));
          } catch (e) {}
          dissolveFolderIfSingle(item); // 仅剩 1/0 个成员时自动解散（与拖出文件夹同语义）
          savePagesApps();
          renderDesktopPages();
          return true;
        }
      }
    } catch (e) {}
    return false;
  };
}

export default {
  id: 'settings',
  name: '设置',
  pages: [
    {
      title: '设置',
      content: `
        <div style="padding:16px 0;">
          <!-- 用户个人资料卡片 MD3 Elevated Card -->
          <div class="md3-card md3-card-elevated" style="margin:4px 0 20px;display:flex;align-items:center;gap:16px;">
            <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,hsl(var(--md-h,215) 80% 40%),hsl(var(--md-h,215) 90% 65%));display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:600;box-shadow:var(--md-shadow-2);">
              A
            </div>
            <div style="display:flex;flex-direction:column;flex:1;">
              <span style="font-size:17px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">Android / MD3 用户</span>
              <span style="font-size:13px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">Google 账号 · 同步与个性化</span>
            </div>
            <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
          </div>

          <!-- 个性化分组 -->
          <div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 12px 8px;letter-spacing:0.3px;">个性化与主题</div>
          <div class="md3-card" style="padding:4px 0;margin-bottom:20px;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(13)">
              <div class="md3-list-item-icon">${ICONS.image}</div>
              <div class="md3-list-item-text">壁纸与动态壁纸</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(9)">
              <div class="md3-list-item-icon">${ICONS.person}</div>
              <div class="md3-list-item-text">多模式（工作 / 个人）</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;margin-right:4px;" id="profileModeHint"></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="triggerFontSelect()">
              <div class="md3-list-item-icon">${ICONS.language}</div>
              <div class="md3-list-item-text">界面排版字体</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(6)">
              <div class="md3-list-item-icon">${ICONS.storage}</div>
              <div class="md3-list-item-text">应用管理</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;margin-right:4px;">卸载 / 恢复</span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${ICONS.bedtime}</div>
              <div class="md3-list-item-text">显示与亮度调节</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(10)">
              <div class="md3-list-item-icon">${ICONS.auto_awesome}</div>
              <div class="md3-list-item-text">动画与动效曲线</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;margin-right:4px;" id="animPresetHint"></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
          </div>

          <!-- 通用分组 -->
          <div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 12px 8px;letter-spacing:0.3px;">系统与设备</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(4)">
              <div class="md3-list-item-icon">${ICONS.volume}</div>
              <div class="md3-list-item-text">声音与震动反馈</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(5)">
              <div class="md3-list-item-icon">${ICONS.lock}</div>
              <div class="md3-list-item-text">应用权限管理</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(7)">
              <div class="md3-list-item-icon">${ICONS.memory}</div>
              <div class="md3-list-item-text">存储空间占用</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(2)">
              <div class="md3-list-item-icon">${ICONS.battery_saver}</div>
              <div class="md3-list-item-text">电池与电源优化</div>
              <span id="settingsMainBatteryPct" style="color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;margin-right:4px;">87%</span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(11)">
              <div class="md3-list-item-icon">${ICONS.picture_in_picture}</div>
              <div class="md3-list-item-text">后台与多任务</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;margin-right:4px;" id="bgModeHint"></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(12)">
              <div class="md3-list-item-icon">${ICONS.explore}</div>
              <div class="md3-list-item-text">系统导航方式</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;margin-right:4px;" id="navModeHint"></span>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="pushSubPage(8)">
              <div class="md3-list-item-icon">${ICONS.code}</div>
              <div class="md3-list-item-text">开发者选项</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
          </div>

          <!-- 备份与恢复分组：localStorage + IndexedDB 全量导出/导入 -->
          <div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:20px 12px 8px;letter-spacing:0.3px;">备份与恢复</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item" onclick="window.__dataBackup&&window.__dataBackup.exportBackup()">
              <div class="md3-list-item-icon">${ICONS.download}</div>
              <div class="md3-list-item-text">导出数据到文件</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item" onclick="window.__dataBackup&&window.__dataBackup.pickImportFile()">
              <div class="md3-list-item-icon">${ICONS.upload_file}</div>
              <div class="md3-list-item-text">从文件导入数据</div>
              <span style="color:var(--md-on-surface-variant,#9a9b9e);font-size:18px;">›</span>
            </div>
          </div>
          <script>
            // 主页动态徽标：当前模式名 + 当前动画预设名
            (function() {
              var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
              function refresh() {
                var hint = document.getElementById('profileModeHint');
                if (hint && window.__profiles) hint.innerText = window.__profiles.current() === 'work' ? '工作' : '个人';
                var animHint = document.getElementById('animPresetHint');
                if (animHint && window.__animPresets) animHint.innerText = window.__animPresets.currentName();
                var bgHint = document.getElementById('bgModeHint');
                if (bgHint && window.__bgFreeze) bgHint.innerText = window.__bgFreeze.modeName();
                var navHint = document.getElementById('navModeHint');
                if (navHint && window.__navBar) navHint.innerText = window.__navBar.enabled() ? '三键导航' : '手势导航';
              }
              refresh();
              bindDoc('settings', 'app-page-active', function(e) {
                if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 0) refresh();
              });
            })();
          </script>
        </div>
      `,
    },
    {
      title: '显示与亮度',
      content: `<div style="padding:16px 0;">
        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:12px;display:flex;justify-content:space-between;">
            <span>屏幕亮度</span>
            <span id="dispBriVal" style="color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">75%</span>
          </div>
          <!-- MD3 Expressive Slider（v7.39 原生厚轨道双段 + 竖柄药丸，高度由类级 64px 接管） -->
          <div class="md3-slider is-continuous" id="dispBriSlider">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="dispBriFill"></div>
            <div class="m3-slider-stop-dot"></div>
            <div class="md3-slider-thumb" id="dispBriThumb"></div>
          </div>
        </div>

        <div class="md3-card" style="padding:4px 0;overflow:hidden;">
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">护眼夜览模式</span>
            <label class="md3-switch"><input type="checkbox" id="dispNightToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">暗黑色彩方案</span>
            <label class="md3-switch"><input type="checkbox" id="dispDarkToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">自适应光感亮度</span>
            <label class="md3-switch"><input type="checkbox" id="dispAutoBrightToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <script>
          (function() {
            var s = document.getElementById('dispBriSlider');
            var f = document.getElementById('dispBriFill');
            var th = document.getElementById('dispBriThumb');
            var v = document.getElementById('dispBriVal');
            if (!s) return;
            // v7.34 rAF 合帧（末事件原则）+ v7.38 transform 驱动：
            // width/left 是 layout+paint 属性，快速拖动时 fill 大色块重光栅
            // 滞后于 thumb 小竖条 → 视觉脱节（GitHub issue 实测最大 52px）；
            // 现两者均走合成器属性，零 layout 零重光栅，天然同帧
            var briRaf = 0, briLastE = null, briDown = false, briP = 0.75;
            var briPaint = function() {
              briRaf = 0;
              var e = briLastE; briLastE = null;
              if (!e) return;
              var r = s.getBoundingClientRect();
              var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
              briP = p;
              if (window.__md3SliderSet) window.__md3SliderSet(s, f, th, p, briDown);
              if (v) v.innerText = Math.round(p * 100) + '%';
            };
            var update = function(e) {
              briLastE = e;
              if (!briRaf) briRaf = requestAnimationFrame(briPaint);
            };
            var down = false;
            s.onpointerdown = function(e) { briDown = true; down = true; s.classList.add('is-dragging'); try { s.setPointerCapture(e.pointerId); } catch (err) {} update(e); };
            s.onpointermove = function(e) { if (down) update(e); };
            s.onpointerup = s.onpointercancel = function(e) {
              down = false; briDown = false;
              s.classList.remove('is-dragging');
              if (window.__md3SliderSet) window.__md3SliderSet(s, f, th, briP, false); // v7.39 桥内已无按压 scaleY，纯重绘落定
              try { s.releasePointerCapture(e.pointerId); } catch(err){} if (navigator.vibrate) navigator.vibrate(8); };
            // 初值即时落位（模板不再带内联几何，避免隐藏期零宽错位）
            if (window.__md3SliderSet) window.__md3SliderSet(s, f, th, briP, false);
            if (v) v.innerText = Math.round(briP * 100) + '%';
            if (window.__md3SliderWatch) window.__md3SliderWatch(s, function() {
              if (window.__md3SliderSet) window.__md3SliderSet(s, f, th, briP, false);
            });

            // fix(audit-E): 三个假开关接真 —— 暗黑方案联动 theme-mode 单一真源；
            // 夜览/自适应光感无真实实现，不再预置假 checked 状态，切换时提示「敬请期待」并回弹。
            var darkToggle = document.getElementById('dispDarkToggle');
            var syncDark = function() {
              if (!darkToggle || !window.__settingsTheme) return;
              darkToggle.checked = window.__settingsTheme.resolved() === 'dark';
            };
            syncDark();
            if (darkToggle) {
              darkToggle.addEventListener('change', function() {
                if (!window.__settingsTheme) { darkToggle.checked = false; return; }
                // 与快捷设置深色磁贴同向：开 → 深色，关 → 浅色（auto 档按当前解析值切换）
                window.__settingsTheme.set(darkToggle.checked ? 'dark' : 'light');
                syncDark();
                if (window.showSystemToast) window.showSystemToast(darkToggle.checked ? '已切换到深色方案' : '已切换到浅色方案');
              });
            }
            ['dispNightToggle', 'dispAutoBrightToggle'].forEach(function(id) {
              var t = document.getElementById(id);
              if (!t) return;
              t.addEventListener('change', function() {
                t.checked = false; // 回弹：无真实实现，不保留假状态
                if (window.showSystemToast) window.showSystemToast('敬请期待');
              });
            });
            // 实例常驻内存：重新激活该页时回同步暗黑开关（快捷设置深色磁贴/主题面板可能已改值）
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 1) syncDark();
            });
          })();
        </script>
      </div>`,
    },
    {
      title: '电池',
      content: `<div style="padding:16px 0;text-align:center;">
        <div style="position:relative;display:inline-block;">
          <div id="settingsBatteryPct" style="font-size:56px;font-weight:200;color:var(--md-success,#a8f5bb);font-family:var(--md-font-num);transition:color .4s;">87%</div>
          <span id="settingsBatteryChargeBadge" style="display:none;position:absolute;top:2px;right:-34px;font-size:22px;color:var(--md-primary,#7df8db);">${ICONS.battery_charging}</span>
        </div>
        <div id="settingsBatteryEstimate" style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:4px;">预计可用 8 小时 45 分钟</div>

        <div style="max-width:260px;margin:14px auto 0;height:8px;border-radius:99px;background:var(--md-surface-container-high,#353639);overflow:hidden;">
          <div id="settingsBatteryBar" style="width:87%;height:100%;border-radius:99px;background:var(--md-success,#a8f5bb);transition:width .6s cubic-bezier(.2,.8,.2,1),background .4s;"></div>
        </div>
        <div id="settingsBatterySource" style="font-size:11px;color:var(--md-outline,#6a6b6e);margin-top:8px;">数据来源：设备电池（实时）</div>

        <div class="md3-card" style="padding:4px 0;margin-top:24px;overflow:hidden;text-align:left;">
          <div class="md3-list-item" style="cursor:default;">
            <div class="md3-list-item-icon">${ICONS.battery_saver}</div>
            <span class="md3-list-item-text">省电模式</span>
            <label class="md3-switch"><input type="checkbox" id="settingsBatterySaverSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item">
            <div class="md3-list-item-icon">${ICONS.bar_chart}</div>
            <span class="md3-list-item-text">电池最大健康容量</span>
            <span style="color:var(--md-success,#a8f5bb);font-weight:600;font-size:14px;">98%</span>
          </div>
        </div>

        <div class="md3-card" style="padding:4px 0;margin-top:12px;overflow:hidden;text-align:left;">
          <div class="md3-list-item" style="cursor:default;align-items:flex-start;">
            <div class="md3-list-item-icon" style="margin-top:10px;">${ICONS.speed}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;">耗电速率</div>
              <div id="settingsBatteryDrainRate" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 10px;">测量中 · 需观察一格电量变化</div>
            </div>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;align-items:flex-start;">
            <div class="md3-list-item-icon" style="margin-top:10px;">${ICONS.battery_charging}</div>
            <div style="flex:1;min-width:0;">
              <div class="md3-list-item-text" style="padding-top:8px;">充电速率</div>
              <div id="settingsBatteryChargeRate" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin:2px 0 10px;">接入充电器后开始测量</div>
            </div>
          </div>
        </div>

        <div class="md3-card" id="settingsSimChargerCard" style="padding:4px 0;margin-top:12px;overflow:hidden;text-align:left;display:none;">
          <div class="md3-list-item">
            <div class="md3-list-item-icon">${ICONS.bolt}</div>
            <span class="md3-list-item-text">接入充电器（模拟）</span>
            <label class="md3-switch"><input type="checkbox" id="settingsSimChargerSwitch"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <p style="color:var(--md-on-surface-variant,#9a9b9e);font-size:12px;margin-top:16px;text-align:center;">上次充电完成：今天 08:15</p>
      </div>`,
    },
    {
      title: '已移除的应用',
      content: `<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;">从桌面移除的应用可以在此恢复</div>
        <div id="removedAppsList"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var list = document.getElementById('removedAppsList');
            if (!list) return;
            // 本应用由桌面文档 DOM 注入渲染：window 即桌面上下文。
            // 恢复消息必须发给桌面自身（旧实现 window.parent 在壳页 iframe 嵌套时
            // 指向壳页，壳页无监听器，导致"点恢复无反应"）；parent 仅作 iframe
            // 承载形态的兜底（此时 parent 才是桌面）。
            function postRestore(appId) {
              try { window.postMessage({ type: 'restore-app', appId: appId }, '*'); } catch (e) {}
              if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: 'restore-app', appId: appId }, '*'); } catch (e) {}
              }
            }
            function renderList() {
              var removed = [];
              try { removed = JSON.parse(localStorage.getItem('ios-desktop:removed-apps') || '[]'); } catch(e) {}
              list.innerHTML = '';
              if (removed.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:48px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;">暂无已移除的应用</div>';
                return;
              }
              removed.forEach(function(app) {
                var item = document.createElement('div');
                item.className = 'md3-card';
                item.style.cssText = 'display:flex;align-items:center;gap:14px;padding:14px 18px;margin-bottom:12px;';
                // 图标与桌面同源：本地 SVG（app-icons.js），不再读遗留网络图 app.iconUrl
                var iconHTML = '<div style="width:42px;height:42px;border-radius:12px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(app.id) + '</div>';
                item.innerHTML = iconHTML + '<span style="flex:1;font-size:15px;font-weight:500;color:var(--md-on-surface,hsl(var(--md-h,215) 10% 90%));">'+app.name+'</span><button class="md3-btn md3-btn-filled" style="padding:6px 18px;font-size:13px;" data-app-id="'+app.id+'" data-act="restore">恢复</button>';
                item.querySelector('[data-act="restore"]').addEventListener('click', function() {
                  var appId = this.getAttribute('data-app-id');
                  postRestore(appId);
                  setTimeout(function() { if (window.popSubPage) window.popSubPage(); }, 300);
                });
                list.appendChild(item);
              });
            }
            renderList();
            // 应用实例常驻内存：每次该子页重新激活时重建列表，避免展示已恢复过的旧条目
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 3) renderList();
            });
          })();
        </script>
      </div>`,
    },
    {
      // ===== 声音与震动（批次二实装：真实开关 + 音效音量 + 媒体音量） =====
      title: '声音与震动',
      content: `<div style="padding:16px 0;">
        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:12px;display:flex;justify-content:space-between;">
            <span>媒体音量</span>
            <span id="sndVolVal" style="color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">60%</span>
          </div>
          <div class="md3-slider" id="sndVolSlider">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="sndVolFill"></div>
            <div class="md3-slider-thumb" id="sndVolThumb"></div>
          </div>
        </div>

        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:12px;display:flex;justify-content:space-between;">
            <span>系统音效音量</span>
            <span id="sfxVolVal" style="color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">50%</span>
          </div>
          <div class="md3-slider" id="sfxVolSlider">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="sfxVolFill"></div>
            <div class="md3-slider-thumb" id="sfxVolThumb"></div>
          </div>
        </div>

        <div class="md3-card" style="padding:4px 0;overflow:hidden;">
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">全局音效（点按 / 开合应用 / 通知）</span>
            <label class="md3-switch"><input type="checkbox" id="sndSfxToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">触感振动反馈</span>
            <label class="md3-switch"><input type="checkbox" id="sndHapticToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <p style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;margin-top:14px;padding:0 4px;">
          音效由 WebAudio 实时合成，无任何外部音频文件；触感振动依赖设备的
          navigator.vibrate 能力（部分桌面浏览器无振动马达，调用静默无效）。
          关闭「触感振动反馈」后，系统内所有振动调用点将统一静音。
        </p>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var sfx = window.__sfx;
            function initOnce() {
              if (!sfx) sfx = window.__sfx;
              var sv = document.getElementById('sndVolSlider');
              var svf = document.getElementById('sndVolFill');
              var svt = document.getElementById('sndVolThumb');
              var svv = document.getElementById('sndVolVal');
              var xv = document.getElementById('sfxVolSlider');
              var xvf = document.getElementById('sfxVolFill');
              var xvt = document.getElementById('sfxVolThumb');
              var xvv = document.getElementById('sfxVolVal');
              var bindSlider = function(slider, fill, thumb, label, onPct, getP) {
                if (!slider || slider._bound) return;
                slider._bound = true;
                // v7.34 rAF 合帧（末事件原则）+ v7.38 transform 驱动：
                // fill/thumb 同帧写入却因大色块重光栅滞后视觉脱节（GitHub issue
                // 截图实测最大 52px）；合成器属性零 layout 零重光栅，根治脱节
                var slRaf = 0, slLastE = null, down = false, lastP = 0;
                var slPaint = function() {
                  slRaf = 0;
                  var e = slLastE; slLastE = null;
                  if (!e) return;
                  var r = slider.getBoundingClientRect();
                  var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                  lastP = p;
                  if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, p, down);
                  if (label) label.innerText = Math.round(p * 100) + '%';
                  onPct(p);
                };
                var update = function(e) {
                  slLastE = e;
                  if (!slRaf) slRaf = requestAnimationFrame(slPaint);
                };
                slider.onpointerdown = function(e) { down = true; slider.classList.add('is-dragging'); try { slider.setPointerCapture(e.pointerId); } catch (err) {} update(e); };
                slider.onpointermove = function(e) { if (down) update(e); };
                slider.onpointerup = slider.onpointercancel = function(e) {
                  if (down) {
                    down = false;
                    slider.classList.remove('is-dragging');
                    // v7.39 桥内已无按压 scaleY，落定重绘 + 恢复 CSS 过渡（终值平滑吸附）
                    if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, lastP, false);
                  }
                  try { slider.releasePointerCapture(e.pointerId); } catch (err) {}
                };
                // 尺寸/可见性变化 → 重读权威真值重绘（RO 在 observe 时会立即回调
                // 一次，不能用未初始化的 lastP —— 否则会把正确初值覆盖回 0）
                if (window.__md3SliderWatch) window.__md3SliderWatch(slider, function() {
                  var p = getP ? getP() : lastP;
                  lastP = p;
                  if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, p, false);
                });
              };
              // 媒体音量：真实联动 media-service 的 HTML5 Audio 引擎（watch 重读引擎真值）
              bindSlider(sv, svf, svt, svv, function(p) { if (window.__settingsMedia) window.__settingsMedia.setVolume(p); }, function() { return window.__settingsMedia ? window.__settingsMedia.getVolume() : 0.6; });
              // 系统音效音量：联动 sound-haptics 引擎
              bindSlider(xv, xvf, xvt, xvv, function(p) { if (sfx) sfx.setVolume(p); }, function() { return sfx ? sfx.getVolume() : 0.5; });
              // fix(audit-E): 媒体音量滑杆每次激活回同步当前真值（initOnce 在
              // app-page-active(4) 时重跑，此前只回同步了系统音效，媒体音量被
              // 播放器/快捷设置改过后回来仍显示旧值）
              if (window.__settingsMedia && window.__settingsMedia.getVolume) {
                var mv = Math.round(window.__settingsMedia.getVolume() * 100);
                if (svv) svv.innerText = mv + '%';
                if (window.__md3SliderSet) window.__md3SliderSet(sv, svf, svt, mv / 100, false);
              }
              if (sfx && xvv) {
                var cur = Math.round(sfx.getVolume() * 100);
                xvv.innerText = cur + '%';
                if (window.__md3SliderSet) window.__md3SliderSet(xv, xvf, xvt, cur / 100, false);
              }
              var sfxToggle = document.getElementById('sndSfxToggle');
              var hapToggle = document.getElementById('sndHapticToggle');
              if (sfx && sfxToggle && !sfxToggle._bound) {
                sfxToggle._bound = true;
                sfxToggle.checked = sfx.sfxEnabled();
                sfxToggle.addEventListener('change', function() {
                  sfx.setSfxEnabled(sfxToggle.checked);
                  if (sfxToggle.checked) sfx.play('tick');
                  if (window.showSystemToast) window.showSystemToast(sfxToggle.checked ? '全局音效已开启' : '全局音效已关闭');
                });
              }
              if (sfx && hapToggle && !hapToggle._bound) {
                hapToggle._bound = true;
                hapToggle.checked = sfx.hapticsEnabled();
                hapToggle.addEventListener('change', function() {
                  sfx.setHapticsEnabled(hapToggle.checked);
                  if (window.showSystemToast) window.showSystemToast(hapToggle.checked ? '触感振动反馈已开启' : '触感振动反馈已关闭');
                  if (hapToggle.checked && navigator.vibrate) navigator.vibrate(30);
                });
              }
            }
            initOnce();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 4) initOnce();
            });
          })();
        </script>
      </div>`,
    },
    {
      title: '应用权限',
      content: `<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;line-height:1.6;">应用在首次使用相机、麦克风、位置信息等敏感能力时会向您申请授权，可随时在此查看与改判；关闭后应用调用相关能力时将被拒绝。<br>注意：应用内授权与浏览器层真实权限相互独立——即使此处选择允许，浏览器仍可能弹出自家的原生授权框，需要您在浏览器里再允许一次，属正常行为。</div>
        <div id="permAppsList"></div>
        <div style="text-align:center;margin-top:22px;">
          <button id="permResetBtn" style="background:none;border:1px solid var(--md-outline-variant);color:hsl(var(--md-h,215) 80% 64%);font-size:13.5px;font-weight:600;padding:10px 26px;border-radius:20px;cursor:pointer;">重置全部权限</button>
        </div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var list = document.getElementById('permAppsList');
            if (!list) return;
            // 本应用与桌面同文档运行（原生页面），window.__permissions 由 main.js 初始化 permissions.js 时注册
            function esc(s) {
              return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
            }
            function permLabel(k) {
              var meta = window.__permissions && window.__permissions.PERMISSION_META && window.__permissions.PERMISSION_META[k];
              return meta ? meta.label : k;
            }
            function renderList() {
              var P = window.__permissions;
              list.innerHTML = '';
              if (!P) {
                list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">权限服务尚未就绪</div>';
                return;
              }
              var all = P.getAllPermissions();
              var appIds = Object.keys(all).filter(function(id) {
                var rec = all[id] || {};
                return Object.keys(rec).some(function(k) { return k[0] !== '_'; });
              });
              if (!appIds.length) {
                list.innerHTML = '<div style="text-align:center;padding:48px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;line-height:1.8;">暂无权限申请记录<br><span style="font-size:12px;opacity:0.8;">应用首次使用相机 / 位置等能力时会出现在这里</span></div>';
                return;
              }
              appIds.forEach(function(appId) {
                var rec = all[appId] || {};
                var perms = Object.keys(rec).filter(function(k) { return k[0] !== '_'; });
                if (!perms.length) return;
                var appName = rec.__name || appId;
                // 图标与桌面同源：本地 SVG，不再读 localStorage 遗留网络图 __icon
                var iconHtml = '<div style="width:38px;height:38px;border-radius:11px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(appId) + '</div>';
                var chipRows = perms.map(function(pk) {
                  var checked = rec[pk] ? ' checked' : '';
                  return '<div style="display:flex;align-items:center;gap:8px;width:50%;min-width:150px;padding:5px 0;box-sizing:border-box;">' +
                    '<span style="font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);flex:1;">' + esc(permLabel(pk)) + '</span>' +
                    '<label class="md3-switch" style="transform:scale(0.8);transform-origin:right center;"><input type="checkbox" data-app="' + esc(appId) + '" data-perm="' + esc(pk) + '"' + checked + '><span class="slider"><span class="thumb"></span></span></label>' +
                    '</div>';
                }).join('');
                var card = document.createElement('div');
                card.className = 'md3-card';
                card.style.cssText = 'padding:10px 16px;margin-bottom:12px;';
                card.innerHTML =
                  '<div style="display:flex;align-items:center;gap:12px;padding:4px 0 8px;">' + iconHtml +
                  '<span style="flex:1;font-size:15px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">' + esc(appName) + '</span>' +
                  '<span style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);">' + perms.length + ' 项权限</span></div>' +
                  '<div style="display:flex;flex-wrap:wrap;gap:0 10px;">' + chipRows + '</div>';
                list.appendChild(card);
              });
              list.querySelectorAll('input[type="checkbox"]').forEach(function(input) {
                input.addEventListener('change', function() {
                  P.setPermission(input.getAttribute('data-app'), input.getAttribute('data-perm'), input.checked);
                  if (window.showSystemToast) window.showSystemToast(input.checked ? '已允许该权限' : '已拒绝该权限，应用下次调用时生效');
                });
              });
            }
            document.getElementById('permResetBtn').addEventListener('click', function() {
              var P = window.__permissions;
              if (!P) return;
              if (confirm('确定重置全部权限记录？\\n所有应用下次使用敏感能力时将重新弹出授权询问。')) {
                P.clearAllPermissions();
                renderList();
                if (window.showSystemToast) window.showSystemToast('已重置全部权限记录');
              }
            });
            renderList();
            // 应用实例常驻内存：每次该子页重新激活时重建列表，反映最新权限状态
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 5) renderList();
            });
          })();
        </script>
      </div>`,
    },
    // ==================== 批次二新增页 ====================
    {
      // 页 6：应用管理（全部应用一览 + 卸载 / 恢复）
      title: '应用管理',
      content: `<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;">卸载将从桌面移除应用（可随时恢复）；系统应用不可卸载</div>
        <div id="installedAppsList"></div>
        <div id="appMgmtRemovedSection"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var installedBox = document.getElementById('installedAppsList');
            var removedBox = document.getElementById('appMgmtRemovedSection');
            if (!installedBox || !removedBox) return;
            function postToDesktop(type, appId) {
              try { window.postMessage({ type: type, appId: appId }, '*'); } catch (e) {}
              if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: type, appId: appId }, '*'); } catch (e) {}
              }
            }
            function esc(s) {
              return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
            }
            function iconHtml(app) {
              // 与桌面同源：本地 SVG（app-icons.js），不再读遗留网络图 app.iconUrl
              return '<div style="width:40px;height:40px;border-radius:11px;overflow:hidden;flex-shrink:0;">' + window.__getAppIconSVG(app.id) + '</div>';
            }
            function appCard(app, actionLabel, actionType, danger) {
              var isSystem = app.id === 'settings';
              var btn = isSystem
                ? '<span style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);opacity:.7;">系统应用</span>'
                : '<button class="md3-btn ' + (danger ? 'md3-btn-tonal' : 'md3-btn-filled') + '" style="padding:6px 18px;font-size:13px;' + (danger ? 'color:#ff8a8a;' : '') + '" data-app-id="' + esc(app.id) + '" data-act="' + actionType + '">' + actionLabel + '</button>';
              return '<div class="md3-card" style="display:flex;align-items:center;gap:14px;padding:12px 16px;margin-bottom:10px;">' +
                iconHtml(app) +
                '<div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:500;color:var(--md-on-surface,#e2e2e9);">' + esc(app.name) + '</div>' +
                '<div style="font-size:11.5px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:1px;">' + esc(app.id) + '</div></div>' +
                btn + '</div>';
            }
            function render() {
              var st = window.__state;
              installedBox.innerHTML = '';
              removedBox.innerHTML = '';
              if (!st || !Array.isArray(st.pagesApps)) {
                installedBox.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">桌面状态尚未就绪</div>';
                return;
              }
              // 已安装：拍平 pagesApps，按 id 去重（文件夹内的应用同样纳入）
              // fix(audit-E): 文件夹真实字段为 type:'folder' + apps（app.children 恒
              // undefined）—— 此前文件夹被当普通应用列入可卸载清单（副标题显示内部
              // folder_xxx id），其成员永不出现在清单。改为递归展开：跳过文件夹自身、
              // 其 apps 成员计入清单（嵌套防御：只下钻一层，文件夹不可嵌套放置）。
              var seen = new Set();
              var removedIds = new Set((st.removedApps || []).map(function(a) { return a.id; }));
              var addApp = function(app) {
                if (!app || !app.id || seen.has(app.id) || removedIds.has(app.id)) return;
                seen.add(app.id);
                installedBox.insertAdjacentHTML('beforeend', appCard(app, '卸载', 'uninstall', true));
              };
              st.pagesApps.forEach(function(page) {
                (page || []).forEach(function(app) {
                  if (app && app.type === 'folder') {
                    (app.apps || []).forEach(addApp);
                    return;
                  }
                  addApp(app);
                });
              });
              removedBox.innerHTML = '<div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:18px 4px 10px;">已卸载（点击恢复）</div>';
              if (!(st.removedApps || []).length) {
                removedBox.insertAdjacentHTML('beforeend', '<div style="text-align:center;padding:22px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">没有已卸载的应用</div>');
              } else {
                st.removedApps.forEach(function(app) {
                  removedBox.insertAdjacentHTML('beforeend', appCard(app, '恢复', 'restore', false));
                });
              }
              installedBox.querySelectorAll('[data-act="uninstall"]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  var id = btn.getAttribute('data-app-id');
                  if (confirm('确定卸载该应用？\\n其桌面图标将被移除（应用数据保留），可随时在此恢复。')) {
                    // fix(audit-E): 文件夹成员走文件夹卸载桥（main.js 的 uninstall-app
                    // 只扫 pagesApps 顶层，命中不了 folder.apps 成员）；
                    // 顶层应用维持原有 postMessage 链路不变
                    var viaFolder = window.__settingsFolderUninstall ? window.__settingsFolderUninstall(id) : false;
                    if (!viaFolder) postToDesktop('uninstall-app', id);
                    setTimeout(render, 320);
                  }
                });
              });
              removedBox.querySelectorAll('[data-act="restore"]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  postToDesktop('restore-app', btn.getAttribute('data-app-id'));
                  setTimeout(render, 320);
                });
              });
            }
            render();
            // 实例常驻内存：重新激活子页时重建列表，反映最新安装状态
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 6) render();
            });
          })();
        </script>
      </div>`,
    },
    {
      // 页 7：存储空间占用
      title: '存储空间',
      content: `<div style="padding:16px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);">localStorage 逐键统计 + IndexedDB 实际配额，按应用归属聚合</div>
          <button id="storageRefreshBtn" class="md3-btn md3-btn-tonal" style="padding:6px 16px;font-size:13px;flex-shrink:0;">重新统计</button>
        </div>
        <div id="storageOverview"></div>
        <div id="storageByOwner"></div>
        <div id="storageTopKeys"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var ov = document.getElementById('storageOverview');
            var byOwnerBox = document.getElementById('storageByOwner');
            var topBox = document.getElementById('storageTopKeys');
            if (!ov) return;
            function fmt(b) { return window.__storageStats ? window.__storageStats.formatBytes(b) : (b || 0) + ' B'; }
            function nameOf(owner) { return window.__storageStats ? window.__storageStats.ownerDisplayName(owner) : owner; }
            function bar(pct, hue) {
              var p = Math.max(1.5, Math.min(100, pct || 0));
              return '<div style="height:6px;border-radius:3px;background:var(--md-outline-variant);overflow:hidden;margin-top:8px;"><div style="height:100%;width:' + p + '%;border-radius:3px;background:hsl(' + (hue || 215) + ' 70% 55%);"></div></div>';
            }
            function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
            function render() {
              if (!window.__storageStats) {
                ov.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">统计服务尚未就绪</div>';
                return;
              }
              ov.innerHTML = '<div style="text-align:center;padding:30px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">正在统计…</div>';
              byOwnerBox.innerHTML = '';
              topBox.innerHTML = '';
              window.__storageStats.collect().then(function(s) {
                var idbPct = s.idb.quota ? Math.min(100, (s.idb.usage / s.idb.quota) * 100) : 0;
                ov.innerHTML =
                  '<div class="md3-card" style="padding:16px 18px;margin-bottom:12px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:var(--md-on-surface,#e2e2e9);"><span>localStorage</span><span>' + fmt(s.ls.total) + ' · ' + s.ls.keys + ' 键</span></div>' +
                    bar(s.ls.total / 5242880 * 100, 215) +
                    '<div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:6px;opacity:.8;">约 5MB 配额</div>' +
                  '</div>' +
                  '<div class="md3-card" style="padding:16px 18px;margin-bottom:14px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:var(--md-on-surface,#e2e2e9);"><span>IndexedDB（含壁纸/字体文件）</span><span>' + (s.idb.available ? fmt(s.idb.usage) + (s.idb.quota ? ' / ' + fmt(s.idb.quota) : '') : '不可用') + '</span></div>' +
                    bar(idbPct, 155) +
                    '<div style="font-size:11px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:6px;opacity:.8;">配额一般为磁盘可用空间的 60%</div>' +
                  '</div>';
                if (!s.byOwner.length) { byOwnerBox.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">暂无数据</div>'; return; }
                var maxB = s.byOwner[0].bytes || 1;
                var rows = s.byOwner.map(function(o, i) {
                  return '<div style="padding:10px 2px 2px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--md-on-surface,#e2e2e9);"><span>' + esc(nameOf(o.owner)) + '</span><span style="color:var(--md-on-surface-variant,#9a9b9e);">' + fmt(o.bytes) + '</span></div>' +
                    bar(o.bytes / maxB * 100, (o.owner === '__system' ? 215 : (o.owner === '__other' ? 35 : 155 + i * 37) % 360)) +
                    '</div>';
                }).join('');
                byOwnerBox.innerHTML = '<div class="md3-card" style="padding:14px 18px 8px;margin-bottom:12px;"><div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin-bottom:4px;">按应用归属</div>' + rows + '</div>';
                var top = s.ls.items.slice(0, 8).map(function(it) {
                  return '<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 2px;border-bottom:1px solid var(--md-outline-variant);font-size:12.5px;">' +
                    '<span style="color:var(--md-on-surface-variant,#9a9b9e);word-break:break-all;">' + esc(it.key) + '</span>' +
                    '<span style="color:var(--md-on-surface,#e2e2e9);flex-shrink:0;">' + fmt(it.bytes) + '</span></div>';
                }).join('');
                topBox.innerHTML = '<div class="md3-card" style="padding:14px 18px;margin-bottom:12px;"><div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin-bottom:2px;">占用最大的 localStorage 键（前 8）</div>' + (top || '<div style="padding:10px 0;color:var(--md-on-surface-variant,#9a9b9e);font-size:13px;">空</div>') + '</div>';
              }).catch(function() {
                ov.innerHTML = '<div style="text-align:center;padding:30px 0;color:#ff8a8a;font-size:13px;">统计失败，请重试</div>';
              });
            }
            document.getElementById('storageRefreshBtn').addEventListener('click', render);
            render();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 7) render();
            });
          })();
        </script>
      </div>`,
    },
    {
      // 页 8：开发者选项
      title: '开发者选项',
      content: `<div style="padding:16px 0;">
        <div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:16px;">
          <div class="md3-list-item" style="cursor:default;">
            <div class="md3-list-item-icon">${ICONS.settings}</div>
            <div style="display:flex;flex-direction:column;flex:1;">
              <span class="md3-list-item-text">系统版本</span>
              <span id="sysVerLine" style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">读取中…</span>
            </div>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" id="devCheckUpdateBtn">
            <div class="md3-list-item-icon">${ICONS.sync}</div>
            <span class="md3-list-item-text">检查更新</span>
          </div>
        </div>
        <div class="md3-card" style="padding:4px 0;overflow:hidden;margin-bottom:16px;">
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">性能面板（FPS / 帧耗时 / 内存）</span>
            <label class="md3-switch"><input type="checkbox" id="devFpsToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">禁用 CSS 动画与过渡</span>
            <label class="md3-switch"><input type="checkbox" id="devNoAnimToggle"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <!-- v7.18：动画倍率（开发者）—— 慢放逐帧检视 ↔ 极速验收手感 -->
        <div class="md3-card" style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:2px;display:flex;justify-content:space-between;">
            <span>动画倍率</span>
            <span id="devAnimSpeedVal" style="color:var(--md-primary);font-weight:700;font-variant-numeric:tabular-nums;">1\u00d7</span>
          </div>
          <div style="font-size:11.5px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.6;margin-bottom:10px;">
            应用开合 / 切换退场 / 子页导航的物理弹簧速度 · 即时生效（运行中的动画热换曲线不跳变）
          </div>
          <div class="md3-slider is-discrete" id="devAnimSpeedSlider">
            <div class="md3-slider-line"></div>
            <div class="md3-slider-fill" id="devAnimSpeedFill"></div>
            <div class="m3-slider-ticks">
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot is-active"></span>
              <span class="m3-slider-dot"></span>
              <span class="m3-slider-dot"></span>
              <span class="m3-slider-dot"></span>
            </div>
            <div class="md3-slider-thumb" id="devAnimSpeedThumb"></div>
          </div>
          <div id="devAnimSpeedChips" style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
            <span data-speed="0.25" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">0.25\u00d7 慢放检视</span>
            <span data-speed="0.5" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">0.5\u00d7</span>
            <span data-speed="1" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">1\u00d7 默认</span>
            <span data-speed="1.5" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">1.5\u00d7</span>
            <span data-speed="2" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">2\u00d7</span>
            <span data-speed="3" style="padding:5px 12px;border-radius:999px;border:1px solid var(--md-outline-variant);font-size:12px;cursor:pointer;user-select:none;">3\u00d7 极速</span>
          </div>
        </div>
        <div class="md3-card" style="padding:4px 0;overflow:hidden;">
          <div class="md3-list-item" id="devResetLayoutBtn">
            <div class="md3-list-item-icon">${ICONS.restart_alt}</div>
            <span class="md3-list-item-text">重置桌面布局（图标排列与卸载记录）</span>
          </div>
          <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
          <div class="md3-list-item" id="devWipeDataBtn" style="color:#ff8a8a;">
            <div class="md3-list-item-icon" style="color:#ff8a8a;">${ICONS.delete_forever}</div>
            <span class="md3-list-item-text">清空全部数据（恢复出厂）</span>
          </div>
        </div>
        <p style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;margin-top:14px;padding:0 4px;">
          「禁用动画」仅关闭 CSS transition/animation；Spring2D 物理弹簧为 JS
          transform 驱动，不受影响。「动画倍率」仅缩放弹簧时间轴（曲线形状不变），
          想彻底关闭动效请配合「禁用 CSS 动画」使用。「清空全部数据」会同时清除
          localStorage、IndexedDB（含壁纸/字体文件）、Cache Storage 并注销
          Service Worker，建议先在「备份与恢复」中导出。开关状态刷新后保持。
        </p>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var dev = window.__devOptions;
            // v7.6：系统版本行（读 ../sw.js 的 geek-vN 与构建 ID，与 SW 天然同源同步）
            function fillSysVer() {
              var line = document.getElementById('sysVerLine');
              if (!line || line._filled) return;
              fetch('../sw.js', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
                if (!line) return;
                // fix(v7.45)：旧正则 /geek-v\d+[-a-zA-Z]*/ 取「全文首个 geek-v 字样」，既会把
                // 策略名一并吞进（'geek-v53-cacheFirst'，issue #5 img3），也会被任何注释里的
                // 同形字符串命中。现锚定 VERSION 常量赋值行提取，天然免疫注释与策略名。
                var v = (t.match(/const VERSION = '([^']+)'/) || [''])[1];
                var b = (t.match(/BUILD_ID = '([a-z0-9]+)'/) || [])[1];
                if (v) { line.textContent = 'Android16 Geek · ' + v + (b ? ' · build ' + b : ''); line._filled = true; }
                else line.textContent = '版本信息不可用';
              }).catch(function () { if (line) line.textContent = '版本信息不可用'; });
            }
            fillSysVer();
            // v7.6：检查更新 —— 触发 SW 字节对比；有新版本时根壳层会自动浮现「轻点重启」胶囊
            function bindCheckUpdate() {
              var btn = document.getElementById('devCheckUpdateBtn');
              if (!btn || btn._bound) return;
              btn._bound = true;
              btn.addEventListener('click', function () {
                if (window.showSystemToast) window.showSystemToast('正在检查更新…');
                if (!('serviceWorker' in navigator)) {
                  if (window.showSystemToast) window.showSystemToast('当前环境不支持 Service Worker');
                  return;
                }
                navigator.serviceWorker.getRegistration().then(function (reg) {
                  if (!reg) {
                    if (window.showSystemToast) window.showSystemToast('Service Worker 未注册（开发环境）');
                    return;
                  }
                  var found = false;
                  reg.addEventListener('updatefound', function () { found = true; }, { once: true });
                  Promise.resolve(reg.update()).catch(function () {}).then(function () {
                    setTimeout(function () {
                      if (!found && window.showSystemToast) window.showSystemToast('已是最新版本');
                    }, 2500);
                  });
                }).catch(function () {
                  if (window.showSystemToast) window.showSystemToast('检查更新失败');
                });
              });
            }
            bindCheckUpdate();
            function initOnce() {
              dev = window.__devOptions;
              if (!dev) return;
              var fps = document.getElementById('devFpsToggle');
              var na = document.getElementById('devNoAnimToggle');
              if (fps && !fps._bound) {
                fps._bound = true;
                fps.checked = dev.isFpsEnabled();
                fps.addEventListener('change', function() {
                  dev.setFpsEnabled(fps.checked);
                  if (window.showSystemToast) window.showSystemToast(fps.checked ? 'FPS 悬浮层已开启' : 'FPS 悬浮层已关闭');
                });
              }
              if (na && !na._bound) {
                na._bound = true;
                na.checked = dev.isNoAnimEnabled();
                na.addEventListener('change', function() {
                  dev.setNoAnimEnabled(na.checked);
                  if (window.showSystemToast) window.showSystemToast(na.checked ? 'CSS 动画已禁用' : 'CSS 动画已恢复');
                });
              }
              // v7.18：动画倍率滑杆 + 快捷档位（实现于 animation-presets.js，经
              // __devOptions 桥接；对数刻度 0.25x~3x，1x 恰落在滑杆中段）
              var spS = document.getElementById('devAnimSpeedSlider');
              var spF = document.getElementById('devAnimSpeedFill');
              var spT = document.getElementById('devAnimSpeedThumb');
              var spV = document.getElementById('devAnimSpeedVal');
              var chipWrap = document.getElementById('devAnimSpeedChips');
              if (spS && !spS._bound && dev.getAnimSpeed) {
                spS._bound = true;
                var SP_MIN = 0.25, SP_MAX = 3, SP_BASE = 12;
                var toT = function(v) { return Math.log(v / SP_MIN) / Math.log(SP_BASE); };
                var toV = function(t) { return SP_MIN * Math.pow(SP_BASE, t); };
                var fmt = function(v) { return (Math.round(v * 100) / 100) + '\\u00d7'; };
                var down = false;
                var curT = 0;
                var paint = function(v) {
                  var t = toT(Math.min(SP_MAX, Math.max(SP_MIN, v)));
                  curT = t;
                  if (window.__md3SliderSet) window.__md3SliderSet(spS, spF, spT, t, down);
                  spV.textContent = fmt(v) + (Math.abs(v - 1) < 0.005 ? ' \\u00b7 默认' : '');
                  if (chipWrap) {
                    var chips = chipWrap.querySelectorAll('[data-speed]');
                    for (var i = 0; i < chips.length; i++) {
                      var on = Math.abs(parseFloat(chips[i].getAttribute('data-speed')) - v) < 0.005;
                      chips[i].style.background = on ? 'var(--md-primary)' : 'transparent';
                      chips[i].style.color = on ? 'var(--md-on-primary, #fff)' : 'var(--md-on-surface)';
                      chips[i].style.borderColor = on ? 'var(--md-primary)' : 'var(--md-outline-variant)';
                    }
                  }
                };
                paint(dev.getAnimSpeed());
                var apply = function(v, quiet) {
                  var nv = dev.setAnimSpeed(v);
                  paint(nv);
                  if (!quiet && window.showSystemToast) window.showSystemToast('动画倍率：' + fmt(nv));
                };
                var paintT = function(t, pressed) {
                  curT = t;
                  if (window.__md3SliderSet) window.__md3SliderSet(spS, spF, spT, t, pressed);
                };
                // v7.34 rAF 合帧：拖拽期 apply（含 localStorage 写 + 弹簧热更新）
                // 随事件率直调 → 每帧至多一次；末事件原则保证落点不丢
                // v7.38：transform 驱动；v7.39 桥内统一双段间隙几何 + 刻度点跟随
                var spRaf = 0, spLastE = null;
                var spPaint = function() {
                  spRaf = 0;
                  var e = spLastE; spLastE = null;
                  if (!e) return;
                  var r = spS.getBoundingClientRect();
                  var t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                  paintT(t, down);
                  apply(toV(t), true);
                };
                var update = function(e) {
                  spLastE = e;
                  if (!spRaf) spRaf = requestAnimationFrame(spPaint);
                };
                spS.onpointerdown = function(e) { down = true; spS.classList.add('is-dragging'); try { spS.setPointerCapture(e.pointerId); } catch (err) {} update(e); };
                spS.onpointermove = function(e) { if (down) update(e); };
                spS.onpointerup = spS.onpointercancel = function(e) {
                  if (down) {
                    down = false;
                    spS.classList.remove('is-dragging');
                    paintT(curT, false); // v7.39 落定重绘 + 恢复 CSS 过渡（终值平滑吸附）
                  }
                  try { spS.releasePointerCapture(e.pointerId); } catch (err) {}
                  if (window.showSystemToast) window.showSystemToast('动画倍率：' + fmt(dev.getAnimSpeed()));
                };
                if (window.__md3SliderWatch) window.__md3SliderWatch(spS, function() { paint(dev.getAnimSpeed()); });
                if (chipWrap) {
                  var chips2 = chipWrap.querySelectorAll('[data-speed]');
                  for (var ci = 0; ci < chips2.length; ci++) {
                    (function (chip) {
                      chip.addEventListener('click', function () {
                        apply(parseFloat(chip.getAttribute('data-speed')), false);
                      });
                    })(chips2[ci]);
                  }
                }
              }
              var reset = document.getElementById('devResetLayoutBtn');
              if (reset && !reset._bound) {
                reset._bound = true;
                reset.addEventListener('click', function() {
                  if (confirm('确定重置桌面布局？\\n图标排列与已卸载记录将恢复默认，应用数据不受影响。')) dev.resetDesktopLayout();
                });
              }
              var wipe = document.getElementById('devWipeDataBtn');
              if (wipe && !wipe._bound) {
                wipe._bound = true;
                wipe.addEventListener('click', function() {
                  if (confirm('确定清空全部数据？\\nlocalStorage、IndexedDB、缓存与 Service Worker 将全部清除。')) {
                    if (confirm('最后确认：此操作不可恢复（等于恢复出厂）！\\n建议先到「备份与恢复」导出数据。')) dev.wipeAllData();
                  }
                });
              }
            }
            initOnce();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 8) initOnce();
            });
          })();
        </script>
      </div>`,
    },
    {
      // 页 9：多模式（工作 / 个人）
      title: '多模式',
      content: `<div style="padding:16px 0;">
        <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:16px;line-height:1.7;">为「个人」与「工作」分别记忆一套完整场景：主题色相、外观模式、壁纸、桌面图标排列与勿扰开关。切换时全程伴随连贯动画——壁纸交叉淡入、主题色渐变、图标逐格弹簧重排；快捷设置中的「Modes」磁贴同样可以一键切换。</div>
        <div id="profileCardsBox"></div>
        <p style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);line-height:1.7;margin-top:14px;padding:0 4px;">
          离开当前模式时会自动保存最新布局、外观与勿扰状态，下次切回原样恢复；自定义上传的壁纸（文件类）不逐模式复制存储，切换时保持当前壁纸不变。配套的「Focus」番茄钟磁贴可在专注期自动开启勿扰、休息期自动恢复。
        </p>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var box = document.getElementById('profileCardsBox');
            if (!box) return;
            function render() {
              var P = window.__profiles;
              if (!box || !P) return;
              var list = P.list();
              box.innerHTML = '';
              list.forEach(function(p) {
                var card = document.createElement('div');
                card.className = 'md3-card';
                card.style.cssText = 'display:flex;align-items:center;gap:14px;padding:16px 18px;margin-bottom:12px;cursor:pointer;' + (p.active ? 'border:1.5px solid hsl(' + (p.hue || 215) + ' 70% 55%);' : '');
                card.innerHTML =
                  '<div style="width:44px;height:44px;border-radius:14px;flex-shrink:0;background:linear-gradient(135deg,hsl(' + (p.hue || 215) + ' 75% 40%),hsl(' + (p.hue || 215) + ' 85% 62%));display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:600;">' + (p.name || '?').charAt(0) + '</div>' +
                  '<div style="flex:1;"><div style="font-size:15px;font-weight:600;color:var(--md-on-surface,#e2e2e9);">' + p.name + '模式</div>' +
                  '<div style="font-size:12px;color:var(--md-on-surface-variant,#9a9b9e);margin-top:2px;">主题色相 ' + (p.hue || 215) + '°</div></div>' +
                  (p.active
                    ? '<span style="font-size:12px;font-weight:600;color:hsl(' + (p.hue || 215) + ' 80% 65%);">当前使用</span>'
                    : '<span style="font-size:12.5px;color:var(--md-on-surface-variant,#9a9b9e);">点按切换</span>');
                card.addEventListener('click', function() {
                  if (p.active || P.isSwitching && P.isSwitching()) return;
                  P.switchTo(p.id);
                  setTimeout(render, 700);
                });
                box.appendChild(card);
              });
            }
            render();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 9) render();
            });
          })();
        </script>
      </div>`,
    },
    {
      title: '动画与动效',
      content: `<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">应用开 / 关动画曲线</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            选择应用从图标展开 / 收回时的弹簧手感（iOS 26 液态玻璃 · macOS 吸入融合风格）。
            切换即时生效：正在播放的动画会无缝换曲线，不会跳变；选择会被记住。
          </div>
        </div>

        <div id="animPresetList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <!-- 锁屏解锁入场动效风格（v7.13 高保真复刻双风格 + 卡内微缩预演） -->
        <div class="md3-card md3-card-elevated" style="margin:20px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">锁屏解锁桌面入场动效</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            复刻两大原生解锁动效：iOS 图标自屏幕底缘一整排一整排错峰飞入；
            Android 以屏幕中心为波源的涟漪式向外扩散淡入。切换即时生效并持久保存，
            点按卡片可查看微缩预演，选好后点下方按钮上滑解锁即可看到完整效果。
          </div>
        </div>

        <div id="unlockAnimList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <button id="unlockTryBtn" type="button" style="width:100%;margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 16px;border:none;border-radius:16px;cursor:pointer;font-size:14px;font-weight:600;color:#fff;background:hsl(var(--md-h,215) 72% 45%);box-shadow:0 2px 12px hsl(var(--md-h,215) 72% 40% / .35);">
          <span class="material-symbols-outlined" style="font-size:19px;">lock</span>
          立即锁屏体验当前效果
        </button>

        <div class="md3-card" style="margin-top:16px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
          <span class="material-symbols-outlined" style="font-size:20px;color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">info</span>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
            分屏窗格展开 / 收回同样跟随当前曲线；3D 倾斜与玻璃边缘高光保持系统级统一。
          </div>
        </div>

        <script>
          // 动画与动效页：预设卡片渲染 + 选择热切换（window.__animPresets 由 app-window.js 桥接）
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var listEl = null;
            var unlockListEl = null;

            var UNLOCK_STYLES = [
              {
                id: 'ios',
                name: 'iOS 整排飞入',
                desc: '复刻 SpringBoard IconFlyIn：图标自屏幕底缘起飞，底排先行、逐排向上续接，受控过冲后自然落位'
              },
              {
                id: 'android',
                name: 'Android 涟漪扩散',
                desc: '复刻 Material You 解锁涟漪：以屏幕中心为波源，光环向外扩散，图标随波前由内向外弹性浮现'
              }
            ];

            function render() {
              listEl = document.getElementById('animPresetList');
              if (listEl && window.__animPresets) {
                var cur = window.__animPresets.currentId();
                listEl.innerHTML = window.__animPresets.list.map(function(p) {
                  var active = p.id === cur;
                  return '<div class="anim-preset-card" data-preset-id="' + p.id + '" role="button" tabindex="0" aria-label="动画曲线 ' + p.name + '"' +
                    ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                    'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                    'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                    '<div style="width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;font-size:22px;' +
                    'background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / .22)' : 'var(--md-surface-container-high,#2f3136)') + ';">' + p.emoji + '</div>' +
                    '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;">' + p.name +
                    (active ? '<span style="font-size:11px;font-weight:600;color:hsl(var(--md-h,215) 85% 65%);background:hsl(var(--md-h,215) 80% 55% / .16);padding:2px 8px;border-radius:999px;">当前</span>' : '') +
                    '</div>' +
                    '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + p.desc + '</div>' +
                    '</div>' +
                    (active ? '<span class="material-symbols-outlined" style="font-size:20px;color:hsl(var(--md-h,215) 85% 60%);">check_circle</span>' : '') +
                    '</div>';
                }).join('');
              }

              unlockListEl = document.getElementById('unlockAnimList');
              if (unlockListEl) {
                var curUnlock = (window.__getUnlockAnimStyle ? window.__getUnlockAnimStyle() : localStorage.getItem('ios-desktop:unlock-anim-style')) || 'ios';
                var prevDots = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
                unlockListEl.innerHTML = UNLOCK_STYLES.map(function(s) {
                  var active = s.id === curUnlock;
                  return '<div class="unlock-style-card" data-style-id="' + s.id + '" role="button" tabindex="0" aria-label="解锁动效 ' + s.name + '"' +
                    ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                    'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                    'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                    '<div class="unlock-prev" aria-hidden="true">' + prevDots + '</div>' +
                    '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;">' + s.name +
                    (active ? '<span style="font-size:11px;font-weight:600;color:hsl(var(--md-h,215) 85% 65%);background:hsl(var(--md-h,215) 80% 55% / .16);padding:2px 8px;border-radius:999px;">当前</span>' : '') +
                    '</div>' +
                    '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + s.desc + '</div>' +
                    '</div>' +
                    (active ? '<span class="material-symbols-outlined" style="font-size:20px;color:hsl(var(--md-h,215) 85% 60%);">check_circle</span>' : '') +
                    '</div>';
                }).join('');
                // v7.13：当前选中卡自动播一次微缩预演，直观展示当前动效模式
                replayUnlockPreview(curUnlock);
              }
            }

            /** v7.13：重播指定风格卡片的微缩预演（类名复位 + 强制 reflow + 重新挂类） */
            function replayUnlockPreview(styleId) {
              if (!unlockListEl) return;
              var prev = unlockListEl.querySelector('.unlock-style-card[data-style-id="' + styleId + '"] .unlock-prev');
              if (!prev) return;
              prev.classList.remove('play-ios', 'play-android');
              void prev.offsetWidth;
              prev.classList.add(styleId === 'android' ? 'play-android' : 'play-ios');
            }

            function pick(id) {
              if (window.__animPresets && typeof window.__animPresets.apply === 'function') {
                window.__animPresets.apply(id);
                if (window.showSystemToast) window.showSystemToast('动画曲线已切换：' + window.__animPresets.currentName());
                render();
              }
            }

            function pickUnlock(styleId) {
              if (window.__setUnlockAnimStyle) {
                window.__setUnlockAnimStyle(styleId);
              } else {
                try { localStorage.setItem('ios-desktop:unlock-anim-style', styleId); } catch (e) {}
              }
              var styleName = styleId === 'android' ? 'Android 涟漪扩散' : 'iOS 整排飞入';
              if (window.showSystemToast) window.showSystemToast('解锁动效已切换：' + styleName);
              render(); // render 内会重播新选中卡的微缩预演
            }

            bindDoc('settings', 'click', function(e) {
              var card = e.target && e.target.closest && e.target.closest('.anim-preset-card');
              if (card && card.isConnected) pick(card.dataset.presetId);
              var uCard = e.target && e.target.closest && e.target.closest('.unlock-style-card');
              if (uCard && uCard.isConnected) pickUnlock(uCard.dataset.styleId);
              // v7.13：立即锁屏体验 —— 回桌面（若在前台应用）后自动上锁
              var tryBtn = e.target && e.target.closest ? e.target.closest('#unlockTryBtn') : null;
              if (tryBtn && tryBtn.isConnected && window.__tryUnlockAnim) window.__tryUnlockAnim();
            });

            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && e.target.closest('.anim-preset-card');
              if (card && card.isConnected) { e.preventDefault(); pick(card.dataset.presetId); }
              var uCard = e.target && e.target.closest && e.target.closest('.unlock-style-card');
              if (uCard && uCard.isConnected) { e.preventDefault(); pickUnlock(uCard.dataset.styleId); }
            });

            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 10) render();
            });
            render();
          })();
        </script>
      </div>`,
    },
    {
      title: '后台与多任务',
      content: `<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">后台运行策略</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            决定多任务后台里各应用实例的运行方式。切换即时生效；正在播放媒体（音频 / 视频 / 录音）
            的任务在任何模式下都不会被冻结。
          </div>
        </div>

        <div id="bgModeList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <div class="md3-card" style="margin-top:16px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
          <span class="material-symbols-outlined" style="font-size:20px;color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">info</span>
          <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
            智能冻结模式下，从未打开过的后台卡片将保持休眠占位，不再引导启动；
            左右滑动后台时的重绘量也会显著下降。
          </div>
        </div>

        <script>
          // 后台与多任务页：运行策略卡片渲染 + 热切换（window.__bgFreeze 由 bg-freeze.js 桥接）
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var MODES = [
              { id: 'freeze', name: '智能冻结', emoji: '🧊', badge: '默认 · 推荐',
                desc: '仅前台应用、刚被推到后台的应用与分屏对保持实时运行，其余后台任务整体冻结 —— 心跳定时器、CSS 动画、rAF 全部暂停，直到再次回到前台。' },
              { id: 'live', name: '全部实时', emoji: '🔴', badge: '经典方案',
                desc: '所有后台实例照常运行、预览实时刷新；开销更高，长时间使用建议配合充电使用。' },
            ];
            function render() {
              var listEl = document.getElementById('bgModeList');
              if (!listEl || !window.__bgFreeze) return;
              var cur = window.__bgFreeze.mode();
              listEl.innerHTML = MODES.map(function(m) {
                var active = m.id === cur;
                return '<div class="bg-mode-card" data-mode-id="' + m.id + '" role="button" tabindex="0" aria-label="后台策略 ' + m.name + '"' +
                  ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                  'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                  'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                  '<div style="width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;font-size:22px;' +
                  'background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / .22)' : 'var(--md-surface-container-high,#2f3136)') + ';">' + m.emoji + '</div>' +
                  '<div style="flex:1;min-width:0;">' +
                  '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' + m.name +
                  '<span style="font-size:10px;font-weight:600;color:' + (active ? 'hsl(var(--md-h,215) 85% 65%)' : 'var(--md-on-surface-variant,#9a9b9e)') + ';background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:999px;">' + m.badge + '</span>' +
                  (active ? '<span class="material-symbols-outlined" style="font-size:18px;color:hsl(var(--md-h,215) 85% 60%);">check_circle</span>' : '') +
                  '</div>' +
                  '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + m.desc + '</div>' +
                  '</div>' +
                  '</div>';
              }).join('');
            }
            function pick(id) {
              if (window.__bgFreeze && typeof window.__bgFreeze.setMode === 'function') {
                window.__bgFreeze.setMode(id);
                if (window.showSystemToast) window.showSystemToast('后台策略已切换：' + window.__bgFreeze.modeName());
                render();
              }
            }
            bindDoc('settings', 'click', function(e) {
              var card = e.target && e.target.closest && e.target.closest('.bg-mode-card');
              if (card && card.isConnected) pick(card.dataset.modeId);
            });
            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && e.target.closest('.bg-mode-card');
              if (card && card.isConnected) { e.preventDefault(); pick(card.dataset.modeId); }
            });
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 11) render();
            });
            render();
          })();
        </script>
      </div>`,
    },
    {
      title: '系统导航',
      content: `<div style="padding:16px 0;">
        <div class="md3-card md3-card-elevated" style="margin:4px 0 16px;padding:16px;">
          <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px;">导航方式</div>
          <div style="font-size:13px;color:var(--md-on-surface-variant);line-height:1.6;">
            手势导航为默认方案；开启三键导航后全新矢量三键（勾角返回 · 悬挑屋顶主屏 · 三横线多任务）悬浮于屏幕底部，
            且手势导航仍然保持运作 —— 两套方案融合共存，互不干扰。
          </div>
        </div>

        <div id="navModeList" style="display:flex;flex-direction:column;gap:10px;"></div>

        <div id="navPosSection" style="display:none;margin-top:16px;">
          <div style="font-size:13px;font-weight:600;color:var(--md-primary,hsl(var(--md-h,215) 80% 32%));margin:0 12px 8px;letter-spacing:0.3px;">三键栏位置</div>
          <div id="navPosList" style="display:flex;gap:10px;"></div>
          <div class="md3-card" style="margin-top:12px;padding:13px 16px;display:flex;align-items:center;gap:10px;">
            <span class="material-symbols-outlined" style="font-size:20px;color:var(--md-primary,hsl(var(--md-h,215) 80% 55%));">gesture</span>
            <div style="font-size:12px;color:var(--md-on-surface-variant);line-height:1.5;">
              也可以在桌面上直接调整：<b>按住主屏键 1 秒</b>后左右拖动，松手自动吸附到左 / 中 / 右。
              从三键栏上滑仍会直通系统手势引擎（跟手缩小、停顿唤出多任务、快速甩动关闭）。
            </div>
          </div>
        </div>

        <script>
          // 系统导航页：方式开关 + 位置三档（window.__navBar 由 nav-bar.js 桥接）
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            /* 矢量图标（与 nav-bar.js 同源线稿，viewBox 48 网格 · stroke 5.2 · round） */
            function navIcon(key, size) {
              var P = {
                back: '<path d="M14 7.5 7.8 13.5H36v23.5H7.8"/>',
                home: '<polyline points="6,18 24,7.5 42,18"/><path d="M11 23v12.5a4 4 0 0 0 4 4h18a4 4 0 0 0 4-4V23"/>',
                recents: '<path d="M8 12h32M8 24h32M8 36h32"/>'
              };
              return '<svg viewBox="0 0 48 48" width="' + size + '" height="' + size + '" aria-hidden="true" style="display:block">' +
                '<g fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round">' + P[key] + '</g></svg>';
            }
            var MODES = [
              { id: 'gesture', name: '手势导航', badge: '默认',
                icon: '<svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true" style="display:block">' +
                  '<path d="M24 41V9M13.5 19.5 24 9l10.5 10.5" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                desc: '底部上滑关闭应用 / 唤出多任务、两侧边缘滑动返回；沉浸全屏无按键。' },
              { id: 'three', name: '三键导航', badge: '融合模式',
                icon: '<span style="display:flex;align-items:center;gap:4px;">' +
                  navIcon('back', 14) + navIcon('home', 14) + navIcon('recents', 14) + '</span>',
                desc: '新矢量三键悬浮底部；手势依旧可用 —— 长按主屏键 1 秒可左右拖动整条导航栏。' },
            ];
            var POS = [
              { id: 'left', name: '居左' },
              { id: 'center', name: '居中' },
              { id: 'right', name: '居右' },
            ];
            function render() {
              var listEl = document.getElementById('navModeList');
              var posSection = document.getElementById('navPosSection');
              var posList = document.getElementById('navPosList');
              if (!listEl || !window.__navBar) return;
              var enabled = window.__navBar.enabled();
              listEl.innerHTML = MODES.map(function(m) {
                var active = (m.id === 'three') === enabled;
                return '<div class="nav-mode-card" data-mode-id="' + m.id + '" role="button" tabindex="0" aria-label="导航方式 ' + m.name + '"' +
                  ' style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;cursor:pointer;' +
                  'background:var(--md-surface-container,#232529);border:1.5px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';' +
                  'box-shadow:' + (active ? '0 0 0 1px hsl(var(--md-h,215) 85% 60% / .35), 0 4px 14px hsl(var(--md-h,215) 85% 45% / .18)' : 'none') + ';">' +
                  '<div style="width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;' +
                  'color:' + (active ? 'hsl(var(--md-h,215) 85% 72%)' : 'var(--md-on-surface-variant,#9a9b9e)') + ';' +
                  'background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / .22)' : 'var(--md-surface-container-high,#2f3136)') + ';">' + m.icon + '</div>' +
                  '<div style="flex:1;min-width:0;">' +
                  '<div style="font-size:15px;font-weight:600;color:var(--md-on-surface);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' + m.name +
                  '<span style="font-size:10px;font-weight:600;color:' + (active ? 'hsl(var(--md-h,215) 85% 65%)' : 'var(--md-on-surface-variant,#9a9b9e)') + ';background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:999px;">' + m.badge + '</span>' +
                  (active ? '<span class="material-symbols-outlined" style="font-size:18px;color:hsl(var(--md-h,215) 85% 60%);">check_circle</span>' : '') +
                  '</div>' +
                  '<div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">' + m.desc + '</div>' +
                  '</div>' +
                  '</div>';
              }).join('');
              if (posSection) posSection.style.display = enabled ? 'block' : 'none';
              if (enabled && posList) {
                var cur = window.__navBar.pos();
                /* Uiverse 缝合：拟物物理单选组（源：uiverse.io/m1her/splendid-rat-12，MIT）
                   改造：类名 uiv-nav-radio- 前缀；选中态用类驱动（不用 :has，兼容性更稳）；
                   色值接 --md-h 动态令牌，明暗双模式样式见 pixel-features.css 末尾 */
                posList.innerHTML = POS.map(function(p) {
                  var active = p.id === cur;
                  return '<label class="uiv-nav-radio-label' + (active ? ' uiv-nav-radio-on' : '') + '" data-pos-id="' + p.id + '" role="button" tabindex="0" aria-label="三键栏位置 ' + p.name + '">' +
                    '<input class="uiv-nav-radio-input" type="radio" name="uiv-nav-pos" value="' + p.id + '"' + (active ? ' checked' : '') + ' />' +
                    '<span class="uiv-nav-radio-text">' + p.name + '</span>' +
                    '</label>';
                }).join('');
              }
            }
            bindDoc('settings', 'click', function(e) {
              var modeCard = e.target && e.target.closest && e.target.closest('.nav-mode-card');
              if (modeCard && modeCard.isConnected && window.__navBar) {
                window.__navBar.setEnabled(modeCard.dataset.modeId === 'three');
                render();
                return;
              }
              var posChip = e.target && e.target.closest && e.target.closest('.uiv-nav-radio-label');
              if (posChip && posChip.isConnected && window.__navBar) {
                window.__navBar.setPos(posChip.dataset.posId);
                render();
              }
            });
            bindDoc('settings', 'keydown', function(e) {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              var card = e.target && e.target.closest && (e.target.closest('.nav-mode-card') || e.target.closest('.uiv-nav-radio-label'));
              if (card && card.isConnected) { e.preventDefault(); card.click(); }
            });
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 12) render();
            });
            render();
          })();
        </script>
      </div>`,
    },
    {
      title: '壁纸与动态壁纸',
      content: `<div id="settingsWallpaperContainer" style="padding:16px 0;"></div>
        <script>
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var inited = false;
            function init() {
              if (inited) return;
              var box = document.getElementById('settingsWallpaperContainer');
              if (box && window.__initWallpaperPage) {
                inited = true;
                window.__initWallpaperPage(box);
              }
            }
            // fix(v7.37 全量审计)：懒激活 —— page-stack 首开会把全部子页 content 与
            // script 一次性注入执行；旧版 init() 立即跑 __initWallpaperPage → 动态
            // 壁纸缩略图同步串行绘制，取证实锤把「打开设置」拖成 4.8 秒长任务。
            // 现在首开零渲染，用户首次真正推入本页（pageIdx===13）时才初始化。
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 13) init();
            });
          })();
        </script>`,
    },
  ],
};

// ==================== 电池页实时同步（battery-service 单一真源） ====================
// 状态栏 / 设置电池页 / 查找设备 三处共享同一 Battery Status API 快照，
// 电量、充电状态、预计可用时间全部实时联动，不再使用任何硬编码数值。

const BATTERY_SAVER_KEY = 'ios-desktop:battery-saver';

/** 电量档位对应主题色（低电量红 / 中电量黄 / 良好绿） */
function batteryLevelColor(level) {
  if (level <= 20) return 'var(--md-error, #f2b8b5)';
  if (level <= 45) return 'var(--md-tertiary, #efc76b)';
  return 'var(--md-success, #a8f5bb)';
}

/** 把电池快照渲染进设置电池页（元素不存在/已离场时静默跳过） */
function renderSettingsBatteryPage(s) {
  // 设置主页「电池与电源优化」行右侧的实时电量摘要
  const mainPctEl = document.getElementById('settingsMainBatteryPct');
  if (mainPctEl && mainPctEl.isConnected) {
    mainPctEl.textContent = `${s.level}%`;
  }

  const pctEl = document.getElementById('settingsBatteryPct');
  if (!pctEl || !pctEl.isConnected) return;

  pctEl.textContent = `${s.level}%`;
  pctEl.style.color = batteryLevelColor(s.level);

  const barEl = document.getElementById('settingsBatteryBar');
  if (barEl) {
    barEl.style.width = `${s.level}%`;
    barEl.style.background = batteryLevelColor(s.level);
  }

  const badgeEl = document.getElementById('settingsBatteryChargeBadge');
  if (badgeEl) badgeEl.style.display = s.charging ? 'inline-flex' : 'none';

  // v7.23 估时文案：实测速率（耗/充 1 格用时反推）优先，系统值兜底，
  // 两者皆无时明确告知"测量中"而非展示拍脑袋的线性值
  const r = s.rates || {};
  const estEl = document.getElementById('settingsBatteryEstimate');
  if (estEl) {
    if (s.charging) {
      if (s.level >= 100) {
        estEl.textContent = '已充满';
      } else {
        const chargeSecs = estimateChargeSeconds(s);
        estEl.textContent = (chargeSecs !== null && Number.isFinite(chargeSecs) && chargeSecs > 0)
          ? `正在充电 · 预计 ${formatDuration(chargeSecs)}充满`
          : '正在充电 · 正在测量充电速度…';
      }
    } else {
      const hasRate = Number.isFinite(r.dischargeMsPerPct);
      const hasSystem = Number.isFinite(s.dischargingTime) && s.dischargingTime > 0;
      estEl.textContent = (hasRate || hasSystem)
        ? `预计可用 ${formatDuration(estimateDischargeSeconds(s))}`
        : '正在测量耗电速度 · 需观察一格电量变化';
    }
  }

  // v7.23 速率卡：每格耗时 + 实测次数（滚动窗口）
  const drainEl = document.getElementById('settingsBatteryDrainRate');
  if (drainEl) {
    drainEl.textContent = Number.isFinite(r.dischargeMsPerPct)
      ? `每格耗电 ${formatPerPct(r.dischargeMsPerPct)} · 已实测 ${r.dischargeSamples} 次`
      : '测量中 · 需观察一格电量变化';
  }
  const chargeRateEl = document.getElementById('settingsBatteryChargeRate');
  if (chargeRateEl) {
    chargeRateEl.textContent = Number.isFinite(r.chargeMsPerPct)
      ? `每格充电 ${formatPerPct(r.chargeMsPerPct)} · 已实测 ${r.chargeSamples} 次`
      : (s.charging ? '测量中 · 充满前将持续校准' : '接入充电器后开始测量');
  }

  // v7.23 模拟充电器：仅浏览器无 Battery API（模拟电池）时显示
  const simCard = document.getElementById('settingsSimChargerCard');
  if (simCard) simCard.style.display = isSimEngineActive() ? '' : 'none';
  const simSwitch = document.getElementById('settingsSimChargerSwitch');
  if (simSwitch) simSwitch.checked = getSimCharging();

  const srcEl = document.getElementById('settingsBatterySource');
  if (srcEl) {
    srcEl.textContent = s.supported
      ? '数据来源：设备电池（耗/充电速率实测）'
      : '数据来源：模拟电池（含耗/充电速率测量）';
  }
}

subscribeBattery(renderSettingsBatteryPage);
document.addEventListener('app-page-active', (e) => {
  // pageIdx 0 = 设置主页（「电池与电源优化」行的实时摘要）
  // pageIdx 2 = 电池子页（大号百分比 / 电量条 / 预计时间 / 省电开关）
  if (e.detail && e.detail.appId === 'settings' && (e.detail.pageIdx === 0 || e.detail.pageIdx === 2)) {
    renderSettingsBatteryPage(getBatteryState());
    const switchEl = document.getElementById('settingsBatterySaverSwitch');
    if (switchEl) {
      switchEl.checked = (typeof localStorage !== 'undefined' && localStorage.getItem(BATTERY_SAVER_KEY) === '1');
    }
  }
});

// 省电模式开关：设置页 ↔ 快速设置磁贴 双向同步（经 quick-settings.setBatterySaverActive 单一真源）
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t || t.id !== 'settingsBatterySaverSwitch') return;
  const active = !!t.checked;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(BATTERY_SAVER_KEY, active ? '1' : '0');
  }
  document.body.classList.toggle('battery-saver-mode', active);
  // 动态 import 规避模块循环求值顺序问题（quick-settings 依赖链路含本文件）
  import('../quick-settings.js').then((m) => {
    if (m && typeof m.setBatterySaverActive === 'function') {
      m.setBatterySaverActive(active, { silent: true });
    }
  }).catch(() => {});
});
document.addEventListener('battery-saver-changed', (e) => {
  const switchEl = document.getElementById('settingsBatterySaverSwitch');
  if (switchEl && e.detail && typeof e.detail.active === 'boolean') {
    switchEl.checked = e.detail.active;
  }
});

// v7.23 模拟充电器开关：模拟电池模式下接入/拔出充电器（真实设备上回弹并提示）
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t || t.id !== 'settingsSimChargerSwitch') return;
  const ok = setSimCharging(!!t.checked);
  if (!ok) {
    t.checked = false;
    if (window.showSystemToast) window.showSystemToast('真实设备上充电状态跟随电源连接');
    return;
  }
  if (window.showSystemToast) {
    window.showSystemToast(t.checked ? '充电器已接入 · 正在测量充电速度' : '充电器已拔出');
  }
});
