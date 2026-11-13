// ==================== globals.d.ts — window.__* 运行时出口 ambient 类型声明（v11.17 #273） ====================
//
// 单真源对齐 docs/globals-registry.md（#242/#278 双闸：源树字面扫描 + 登记表一致性）——
// 本文件只声明类型、不改运行时；源树必须保留 window.__xxx 字面（tests/v242 扫描闸依赖），
// 因此出口类型一律经由本文件 ambient 合并进 Window interface，而非调用点 cast 包装。
// 新增出口的流程：源码挂载 → globals-registry 登记 → 本文件补声明（三处同步）。

interface Window {
  /** all-apps.js：抽屉开合 API（磁贴/终端深链入口） */
  __allApps?: any;
  /** all-apps.js：抽屉激活态观测面（e2e/测试断言） */
  __allAppsActive?: boolean;
  /** all-apps.js：调试探针容器（__qsDebug 同款惯例，fs = FastScroller 实例） */
  __allAppsDebug?: { fs?: unknown };
  /** share-sheet.js：系统分享面板门面（点按启动应用共用链路） */
  __shareSheet?: any;
}
