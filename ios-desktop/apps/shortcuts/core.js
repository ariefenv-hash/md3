/* shortcuts/core.js — 快捷指令深链契约表与用量工具纯函数（#286 续 ref-only 第九批补 core 提取）
 * 范式：photos/core.js 同款经典 IIFE（零依赖、零 export），经 window.__shortcutsCore 桥自注册；
 * index.html 以 <script src="./core.js"> 同步先于主内联脚本加载。
 * 仅承载无 DOM 副作用的数据契约与纯函数：SHORTCUT_LINKS 深链真源表（appId/event/payload/
 * okMsg/label 五字段，跨应用 openApp 契约单源）+ USAGE_KEY 用量存储键 + fmtLastRun 四档
 * 相对时间格式化。sysOpen/RUNNERS 工厂与 clipboard 特例 runner 留 index.html 内联（宿主侧）。 */
(function () {
  'use strict';

  // 深链契约真源表：键 = data-run 名；label 为卡片缺省名兜底（el.dataset.name 在先）
  var SHORTCUT_LINKS = {
    'weather':              { appId: 'weather',   event: null,               payload: null,           okMsg: '正在获取天气',           label: '打开天气' },
    'timer':                { appId: 'clock_app', event: 'timer/start',      payload: { seconds: 300 }, okMsg: '计时器已启动',          label: '5分钟计时器' },
    'translate-clipboard':  { appId: 'translate', event: 'translate/prefill', payload: null,           okMsg: '正在翻译剪贴板内容',     label: '翻译剪贴板' },
    'msg':                  { appId: 'msg',       event: 'msg/new-draft',    payload: {},             okMsg: '已新建对话，直接输入即可', label: '发送消息' },
    'note':                 { appId: 'notes',     event: 'notes/new',        payload: {},             okMsg: '已打开新建便签',         label: '新建备忘' },
    'home':                 { appId: 'map',       event: null,               payload: null,           okMsg: '正在规划回家路线',       label: '回家路线' },
    'music':                { appId: 'music',     event: 'music/play',       payload: {},             okMsg: '正在继续播放',           label: '播放音乐' },
    'reminder':             { appId: 'reminders', event: 'reminders/create', payload: {},             okMsg: '已打开新建任务',         label: '添加提醒' },
    'cal-note':             { appId: 'cal_app',   event: 'calendar/prefill', payload: {},             okMsg: '已定位到今日笔记',       label: '记今日笔记' },
    'scan':                 { appId: 'camera',    event: null,               payload: null,           okMsg: '正在启动相机',           label: '扫描文档' }
  };

  // 用量持久化键（v7.44：运行次数与上次运行时间，localStorage 单源）
  var USAGE_KEY = 'md3_shortcuts_usage_v1';

  // 四档相对时间格式化（与 translate formatTime 语义同族，多「天前」一档）
  function fmtLastRun(ts) {
    var d = Date.now() - ts;
    if (d < 60000) return '刚刚';
    if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前';
    if (d < 86400000) return Math.floor(d / 3600000) + ' 小时前';
    return Math.floor(d / 86400000) + ' 天前';
  }

  var root = typeof window !== 'undefined' ? window : globalThis;
  root.__shortcutsCore = { SHORTCUT_LINKS: SHORTCUT_LINKS, USAGE_KEY: USAGE_KEY, fmtLastRun: fmtLastRun };
})();
