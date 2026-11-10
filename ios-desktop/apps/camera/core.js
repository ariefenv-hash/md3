// ==================== camera/core.js — 相机纯函数核（#286 续 · ref-only 补提取第四批 · v11.07） ====================
//
// 职责：camera/index.html 内联脚本的纯逻辑真身——六档滤镜 CSS 串查表 /
// 照片 VFS 文件名单一真源命名 / 录制时长 mm:ss 补零格式化 / 相册容量裁剪纯数据段。
// 内联主脚本（经典 <script>）经 window.__cameraCore 桥消费同一份；
// vitest 侧用 new Function 沙箱提取（photo core.js / fx-core.js 同范式）。
//
// ⚠ 模块形态：经典脚本 IIFE（无 export），由 index.html <script src="./core.js"> 同步加载
// （先于主内联脚本），零依赖，保证测试侧 new Function('window', SRC) 可直接执行提取。
//
// 车道：#286 ref-only 候补池第四批（camera 域，idRefs=28 高频优先，撞号合流重放 v11.07）。零行为变化——
// 内联原实现整体搬移，调用点等值换算（takePhoto 滤镜段 + 录制计时段 + 相册落盘段）。
//
// 关联 #286 #229 #243 #18 §5/§9

(function () {
  'use strict';

  // ==================== 六档滤镜 CSS 串查表 ====================
  // 与 index.html .filter-* CSS 类逐字符同值（monet/vintage/vivid/noir/cool 五档
  // + normal 兜底 none）；takePhoto 的 canvas ctx.filter 消费同一份语义。
  // 查表未知档回落 normal（原 else 分支 'none' 等值）。
  var FILTER_CSS = {
    normal: 'none',
    monet: 'contrast(1.08) saturate(1.25) hue-rotate(10deg) brightness(1.03)',
    vintage: 'sepia(0.35) contrast(1.15) brightness(0.95) saturate(1.1)',
    vivid: 'saturate(1.6) contrast(1.12)',
    noir: 'grayscale(1) contrast(1.3) brightness(0.9)',
    cool: 'contrast(1.05) saturate(1.15) hue-rotate(-20deg) brightness(1.02)',
  };

  function filterCssFor(mode) {
    return Object.prototype.hasOwnProperty.call(FILTER_CSS, mode) ? FILTER_CSS[mode] : FILTER_CSS.normal;
  }

  // ==================== 照片 VFS 文件名单一真源 ====================
  // v9.14 #175：IMG_<item.id>.jpg，与 photos 侧历史命名习惯一致；
  // 非法字符防御与 music 歌词存库同款（跨应用路径一致性）。
  function photoVfsName(item) {
    return (item.name || ('IMG_' + item.id + '.jpg')).replace(/[\\/:*?"<>|]/g, '_');
  }

  // ==================== 录制时长 mm:ss 补零 ====================
  // 录制间隔 tick（startRecording）与完成 notify（stopRecording）两处同构逻辑单一真源；
  // 入参由调用点换算秒（Date.now 差 / 1000），此处只做 mm:ss（分钟位不封顶）。
  function formatRecDuration(totalSec) {
    var s = Math.max(0, Math.floor(totalSec));
    var m = String(Math.floor(s / 60)).padStart(2, '0');
    return m + ':' + String(s % 60).padStart(2, '0');
  }

  // ==================== 相册容量裁剪纯数据段 ====================
  // saveToGallery 落盘段：内存态 30 上限（unshift 后至多超一，单次 pop 语义保真）；
  // localStorage 序列化仅 image 类型且前 10（存储非 Blob 大对象，视频 blobUrl 不入库）。
  // 返回裁剪后 items（供调用点回写 state）与可序列化切片（供 localStorage.setItem）。
  function pruneGallery(items) {
    var list = (items || []).slice();
    if (list.length > 30) list.pop();
    var serializable = list.filter(function (i) { return i && i.type === 'image'; }).slice(0, 10);
    return { items: list, serializable: serializable };
  }

  // ==================== 出口（window 桥；Node 沙箱 / 浏览器双域零崩） ====================
  var core = {
    FILTER_CSS: FILTER_CSS,
    filterCssFor: filterCssFor,
    photoVfsName: photoVfsName,
    formatRecDuration: formatRecDuration,
    pruneGallery: pruneGallery,
  };
  if (typeof window !== 'undefined') window.__cameraCore = core;
})();
