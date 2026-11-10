# e2e-specs — playwright 常青 spec 目录（#272 渐进接入落点）

本目录是 `playwright.config.js`（#272 批 1 骨架）的 `testDir` 落点。批 1（v11.06）为空目录
占位；**批 2（v11.07）首批 spec 接入落地**：3 件 spec 在列（下表），npm `e2e:pw`
的 `--pass-with-no-tests` 旗标已**摘除**（批 1 §2 交接锚兑现——`playwright test` 现要求
本目录至少发现并全绿通过首批 spec）。

渐进接入纪律（docs/e2e-playwright-adoption.md §4/§6）：

1. **批 2（渐进批）已交付**：A 档前 10 家逐脚本评审（写面/时延/断言强度三维），
   评审纠偏经生成器 `TIER_OVERRIDES` 表化（8 家 A→B，实读理由随表+评审卷 §6 双登记），
   真常青件以两种形态接入本目录（下表）；旗标摘除同批兑现；
2. spec 命名遵循 #291 常青纪律：`<特性名>-<行为>.spec.js`，版本前缀仅限交付时点快照
   （须带 `@snapshot` 头注记）；
3. 每批接入后 `npm run e2e:pw` 须与对应裸脚本直跑结论一致（等强门禁 G6 同律）；
   批 2 等强对账：`e2e:sweep` 直跑通道与 app-sweep-regression spec 同窗实跑同为 0 fail；
4. 被接入脚本的裸脚本本体在其 spec 门禁等强落地**之前不删除**（三档清单 B 档
   「标记归档可运行保留」同律；批 2 接入形态下本体即断言引擎，永续保留）；
5. **workers=1 顺序纪律**（批 2 config 契约）：app-sweep(8097)/dist-smoke(8088) 两支
   运行器级整合 spec 以固定端口子进程承载断言引擎，并行 worker 必撞端口——顺序执行
   =端口纪律+确定性内存足迹。

## 批 2 首批 spec 清单

| spec | 形态 | 断言真源 | 说明 |
| --- | --- | --- | --- |
| `shell-lifecycle.spec.js` | **native 原生**（fixtures+expect 重表达） | 本 spec 自持 | 源码档 boot 三防线（#260/#299/pageerror）+ 桌面在场 + 注册表首应用「图标点击→开窗→iframe 挂载非空→back-btn 关窗」全链路；断言口径逐字镜像 e2e-app-sweep.mjs |
| `app-sweep-regression.spec.js` | **runner-level**（子进程整合） | scripts/e2e-app-sweep.mjs | 全应用 sweep + #304 基线闸断言引擎退出码+汇总行等强透传（52+ 应用全量面） |
| `dist-smoke-regression.spec.js` | **runner-level**（子进程整合） | scripts/e2e-dist-smoke.mjs | dist 部署档冒烟断言引擎等强透传；dist 缺位显式 skip（构建后闸前置条件，不静默假绿） |

历史批 1 备注（空目录期契约）：`playwright test --pass-with-no-tests` 旗标曾在位
（空 spec 期显式空跑通过）；批 2 摘除，本行留痕为 A7 锚「旗标摘除交接」登记。
