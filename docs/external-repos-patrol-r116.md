# 外部项目巡查与升级账 · R116 前置槽（实例 C · 2026-11-07 15:40 +08:00）

> 用户指派「做好对其他项目的巡查与升级」。本档为**巡查结论 + 可执行升级清单**，
> 纯文档零代码零配置改动，不与 #172 / #183 / catalog.json 的并行车道冲突。
> 数据源：GitHub REST `GET /users/ariefenv-hash/repos?per_page=100&sort=updated`
> + 各仓 `GET /issues?state=open`（本窗实测，PAT 只读）；Pages 在线结论沿用
> R115 实例 B 在 #172 交付帖（6703644435）的全量 HTTP 实测 **12/13 在线**。

## 一、13 仓库全景（pushed_at 为本窗读取值）

| 仓库 | 最近推送 (UTC) | 开放议题 | Pages 在线 |
|---|---|---|---|
| md3 | 2026-11-07 07:17 | 47 | ✅（本项目页） |
| moyugang | 2026-11-06 02:19 | 1 | ✅ |
| 3d-tower-defense | 2026-11-04 04:17 | 1 | ✅ |
| retro-music-player | 2026-10-25 03:25 | 0 | ✅ |
| Enjoy-music | 2026-10-25 03:05 | **4** | ✅ |
| stickman-ink-roguelike | 2026-10-24 10:49 | 0 | ✅ |
| zhishangshenghua | 2026-10-18 01:32 | 0 | ✅ |
| Aetheria-Terraforge---3D-Roguelike-TD-on-Next.js-16 | 2026-10-07 03:07 | 0 | ❌（静态导出资产 404，R115 实证排除不入账） |
| 3d | 2026-10-06 14:56 | 0 | ✅ |
| geometric-traverse | 2026-10-06 07:07 | 0 | ✅ |
| caogaolunhui | 2026-10-06 06:55 | 0 | ✅ |
| clock-app | 2026-10-03 02:56 | 0 | ✅ |
| kimi-mobile | 2026-10-02 09:01 | 0 | ✅ |

**在线率 12/13**；唯一坏链 Aetheria 已在 v10.32 按诚实边界排除，不重试伪装成功。
md3 `catalog.json` 的 `externals` 11 站点账与本表一一对应（v10.32 已由 #172 落库）。

## 二、开放议题盘点（6 条，全部为各仓自有上下文，非 md3 议题）

| 仓库·议题 | 主题 | 与 md3 的关系 | 建议 |
|---|---|---|---|
| moyugang #1 | 【置顶·上下文交接】主线十章完结 + 下一轮待办池 | #189 轻量壳接入规格的宿主侧 | 保持 open 作锚点；md3 侧无需动作 |
| 3d-tower-defense #4 | 【存档】对局续卷系统 + 塔升级链 Lv3 bug 修复 | 已入 catalog externals | 存档型，保持 open |
| Enjoy-music #1 | 按钮整排挤压 + 圆角变换（m-switch / m-seg / m-icon-btn / m-fab） | **与 #18 §2.1⑤ 全局形态语言同一范式** | 可直接复用 md3 `pressRipple` 距离衰减范式（240px 步进 0.08 + 圆角/尺寸形变），见下节 |
| Enjoy-music #2 | 恢复多曲导入 + 实时持久化（音频 Blob 走 IndexedDB） | 与 md3 VFS / pkg-store 同域但不同仓 | 需模型侧决策，不在本窗范围 |
| Enjoy-music #3 | 歌词分析结果缓存（二次点击复现不重跑 Whisper） | 与 md3 #173 逐字歌词缓存不同层 | 需模型侧决策，不在本窗范围 |
| Enjoy-music #4 | 权重文件托管方案（100MB 单文件上限 / LFS 坑） | 与 md3 #183 在线目录 CDN 通道同类 | 待用户给直链，阻塞中 |

其余 9 仓 **0 开放议题**，无需动作。

## 三、升级清单（可执行，均不越权跨仓改代码）

1. **形态语言范式下沉（Enjoy-music #1）**：md3 的 `pressRipple` 已在 13 个应用落地
   （`ios-desktop/js/apps/_shared/` 与 v181 六批准入实证）——建议该仓作者按同一
   事件委托 + 欧氏距离衰减 + pointerup/cancel/leave 三释放 + 圆角变换实现；
   md3 侧不代写、不复制 vendor，避免 #178 数据孤岛判据。
2. **坏链治理**：Aetheria 资产 404 已由 v10.32 `external-shell.js` 双通道探活 +
   M3 占位面覆盖（判定依据文案 + 诚实边界注记 + 重试钮），无需额外改动。
3. **健康状态自动化**：#172 的三期判定表（githubPagesRepoFromUrl /
   externalHealthEndpoint / classifyExternalHealth 七规则）已可把本档的静态巡查
   升级为运行时探活；后续若新增外部站点，按 v10.32 归一化纯核入账即可。
4. **无需立项**：其余 9 仓零开放议题、Pages 全在线，重复巡查属浪费，转按需。

## 四、纪律

- 本档为**巡查产物**，未修改任何其他仓库文件 / 议题 / 评论（避免与并行实例抢车道）。
- 严格遵守 #18 §10：PAT 未写入任何仓库文件、议题、评论或提交信息。
- 关联：#172（外部项目接入总账）/ #183（在线目录）/ #189（moyugang 轻量壳）/
  #18 §5（R 窗续点）/ 并行协调协议 v1（认领帖先行）。
